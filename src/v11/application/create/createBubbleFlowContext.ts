import { resolve } from "node:path";

import { loadPairflowRepoConfig } from "../../../config/repoConfig.js";
import { getBubblePaths, type BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";
import { createInitialBubbleState } from "../../domain/state/initialState.js";
import {
  assertValidBubbleStateSnapshot
} from "../../shared/state/stateSchema.js";
import type {
  BubbleConfig,
  BubbleRemotePointerCreated,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  ResolvedTaskInput
} from "./createCommandContract.js";
import {
  buildBubbleConfig,
  ensureBubbleDoesNotExist,
  ensureRepoPathIsGitRepo,
  resolveCreateReviewArtifactType,
  resolveCreateBubbleRemoteExecution,
  resolveReviewerBriefInput,
  resolveTaskInput,
  toBubbleCreateError,
  validateBubbleId
} from "./createCommandRuntime.js";
import { buildIdeationPlaceholderTaskContent } from "./createTaskArtifacts.js";
import {
  prepareCreateBubbleInput,
  type PreparedCreateBubbleInput
} from "./createBubblePreparation.js";
import { extractReviewerFocus } from "./createReviewerFocus.js";
import { resolveRepoValidationProfileCommands } from "./repoValidationProfileResolver.js";

export interface CreateBubbleFlowContext {
  repoPath: string;
  paths: BubblePaths;
  task: ResolvedTaskInput;
  reviewerFocus: ReviewerFocusExtractionResult;
  reviewerBrief?: ResolvedTaskInput | undefined;
  remotePointer?: BubbleRemotePointerCreated | undefined;
  prepared: PreparedCreateBubbleInput;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
}

async function resolveTaskForCreateCommand(
  command: BubbleCreateInput
): Promise<ResolvedTaskInput> {
  if (command.ideation === true) {
    return {
      content: buildIdeationPlaceholderTaskContent(command.id),
      source: "ideation_placeholder"
    };
  }
  return resolveTaskInput({
    cwd: command.cwd ?? process.cwd(),
    ...(command.task !== undefined ? { task: command.task } : {}),
    ...(command.taskFile !== undefined ? { taskFile: command.taskFile } : {})
  });
}

async function resolveRemoteExecutionForCreateCommand(input: {
  command: BubbleCreateInput;
  dependencies: BubbleCreateDependencies;
}): Promise<Awaited<ReturnType<typeof resolveCreateBubbleRemoteExecution>> | undefined> {
  if (input.command.remote === undefined) {
    return undefined;
  }
  if (input.dependencies.loadPairflowGlobalConfig === undefined) {
    throw toBubbleCreateError({
      message: "Missing required create bubble dependency: loadPairflowGlobalConfig.",
      context: {
        dependency: "loadPairflowGlobalConfig",
        command_name: "create",
        bubble_id: input.command.id,
        remote: input.command.remote
      }
    });
  }
  return resolveCreateBubbleRemoteExecution({
    remote: input.command.remote,
    loadPairflowGlobalConfig: input.dependencies.loadPairflowGlobalConfig
  });
}

async function applyValidationProfileCommands(input: {
  command: BubbleCreateInput;
  prepared: PreparedCreateBubbleInput;
  repoPath: string;
  worktreePath: string;
}): Promise<void> {
  const repoConfig = await loadPairflowRepoConfig(input.repoPath);
  input.prepared.bubbleConfigInput.resolvedValidationCommands =
    resolveRepoValidationProfileCommands({
      explicitCommands: {
        ...(input.command.testCommand !== undefined
          ? { test: input.command.testCommand }
          : {}),
        ...(input.command.typecheckCommand !== undefined
          ? { typecheck: input.command.typecheckCommand }
          : {}),
        ...(input.command.bootstrapCommand !== undefined
          ? { bootstrap: input.command.bootstrapCommand }
          : {})
      },
      ...(input.command.validationTarget !== undefined
        ? { validationTarget: input.command.validationTarget }
        : {}),
      worktreePath: input.worktreePath,
      allowMissingWorktreePath: true,
      ...(repoConfig.validation !== undefined
        ? { repoValidation: repoConfig.validation }
        : {}),
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });
}

export async function prepareCreateBubbleFlowContext(input: {
  command: BubbleCreateInput;
  createdAt: Date;
  dependencies: BubbleCreateDependencies;
}): Promise<CreateBubbleFlowContext> {
  validateBubbleId(input.command.id);
  const reviewArtifactType = resolveCreateReviewArtifactType(
    input.command.reviewArtifactType
  );

  const repoPath = resolve(input.command.repoPath);
  if (input.dependencies.assertGitRepository === undefined) {
    throw toBubbleCreateError({
      message: "Missing required create bubble dependency: assertGitRepository.",
      context: {
        dependency: "assertGitRepository",
        command_name: "create",
        bubble_id: input.command.id
      }
    });
  }
  await ensureRepoPathIsGitRepo(
    repoPath,
    input.dependencies.assertGitRepository
  );

  const baseBranch = input.command.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw toBubbleCreateError({
      message: "Base branch cannot be empty.",
      context: {
        command_name: "create",
        bubble_id: input.command.id,
        base_branch: input.command.baseBranch
      }
    });
  }

  const paths = getBubblePaths(repoPath, input.command.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);

  const task = await resolveTaskForCreateCommand(input.command);
  const reviewerFocus = extractReviewerFocus(task.content);
  const reviewerBrief = await resolveReviewerBriefInput({
    ...(input.command.reviewerBrief !== undefined
      ? { reviewerBrief: input.command.reviewerBrief }
      : {}),
    ...(input.command.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: input.command.reviewerBriefFile }
      : {}),
    accuracyCritical: input.command.accuracyCritical === true,
    cwd: input.command.cwd ?? process.cwd()
      });
  const remoteExecution = await resolveRemoteExecutionForCreateCommand(input);

  const prepared = prepareCreateBubbleInput({
    command: input.command,
    createdAt: input.createdAt,
    repoPath,
    baseBranch,
    reviewArtifactType,
    task,
    ...(remoteExecution !== undefined
      ? { executorRemote: remoteExecution.remoteAlias }
      : {})
  });
  await applyValidationProfileCommands({
    command: input.command,
    prepared,
    repoPath,
    worktreePath: paths.worktreePath
  });

  return {
    repoPath,
    paths,
    task,
    reviewerFocus,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {}),
    ...(remoteExecution !== undefined
      ? { remotePointer: remoteExecution.remotePointer }
      : {}),
    prepared,
    config: buildBubbleConfig(prepared.bubbleConfigInput),
    state: assertValidBubbleStateSnapshot(
      createInitialBubbleState(input.command.id)
    )
  };
}
