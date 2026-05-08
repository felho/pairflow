import { resolve } from "node:path";

import {
  loadPairflowRepoConfig,
  type PairflowRepoConfig
} from "../../../../../config/repoConfig.js";
import { getBubblePaths, type BubblePaths } from "../../../../shared/bubble/bubblePaths.js";
import type { ReviewerFocusExtractionResult } from "../../../../shared/reviewer/reviewerBrief.js";
import { createInitialBubbleState } from "../../../../domain/state/initialState.js";
import {
  assertValidBubbleStateSnapshot
} from "../../../../shared/state/stateSchema.js";
import type {
  BubbleRemotePointerCreated
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  ResolvedTaskInput
} from "../runtime/createCommandContract.js";
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
} from "../runtime/createCommandRuntime.js";
import { buildIdeationPlaceholderTaskContent } from "./createTaskArtifacts.js";
import {
  prepareCreateBubbleInput,
  type PreparedCreateBubbleInput
} from "./createBubblePreparation.js";
import { extractReviewerFocus } from "./createReviewerFocus.js";
import { resolveRepoValidationProfileCommands } from "./repoValidationProfileResolver.js";
import {
  resolveBaseBranch,
  resolveRepoDefaultedCreateInput
} from "../runtime/createRepoDefaultsResolver.js";

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

function applyValidationProfileCommands(input: {
  command: BubbleCreateInput;
  prepared: PreparedCreateBubbleInput;
  repoConfig: PairflowRepoConfig;
  worktreePath: string;
}): void {
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
      ...(input.repoConfig.validation !== undefined
        ? { repoValidation: input.repoConfig.validation }
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

  const repoConfig = await loadPairflowRepoConfig(repoPath);
  const baseBranch = resolveBaseBranch({
    command: input.command,
    ...(repoConfig.defaults !== undefined
      ? { repoDefaults: repoConfig.defaults }
      : {})
  });
  const resolvedCommand = resolveRepoDefaultedCreateInput({
    command: input.command,
    ...(repoConfig.defaults !== undefined
      ? { repoDefaults: repoConfig.defaults }
      : {}),
    baseBranch
  });

  const paths = getBubblePaths(repoPath, resolvedCommand.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);

  const task = await resolveTaskForCreateCommand(resolvedCommand);
  const reviewerFocus = extractReviewerFocus(task.content);
  const reviewerBrief = await resolveReviewerBriefInput({
    ...(resolvedCommand.reviewerBrief !== undefined
      ? { reviewerBrief: resolvedCommand.reviewerBrief }
      : {}),
    ...(resolvedCommand.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: resolvedCommand.reviewerBriefFile }
      : {}),
    accuracyCritical: resolvedCommand.accuracyCritical === true,
    cwd: resolvedCommand.cwd ?? process.cwd()
      });
  const remoteExecution = await resolveRemoteExecutionForCreateCommand({
    command: resolvedCommand,
    dependencies: input.dependencies
  });

  const prepared = prepareCreateBubbleInput({
    command: resolvedCommand,
    createdAt: input.createdAt,
    repoPath,
    baseBranch,
    reviewArtifactType,
    task,
    ...(remoteExecution !== undefined
      ? { executorRemote: remoteExecution.remoteAlias }
      : {})
  });
  applyValidationProfileCommands({
    command: resolvedCommand,
    prepared,
    repoConfig,
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
      createInitialBubbleState(resolvedCommand.id)
    )
  };
}
