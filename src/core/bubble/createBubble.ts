import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  renderBubbleConfigToml
} from "../../config/bubbleConfig.js";
import { getBubblePaths, type BubblePaths } from "./paths.js";
import { createInitialBubbleState } from "../state/initialState.js";
import { assertValidBubbleStateSnapshot } from "../state/stateSchema.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { generateBubbleInstanceId } from "./bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  createDocContractGateArtifact,
  isDocContractGateScopeActive,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../gates/docContractGates.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult,
  ResolvedTaskInput
} from "../../v11/application/create/createCommandContract.js";
import {
  BubbleCreateError,
  buildBubbleConfig,
  buildIdeationPlaceholderTaskContent,
  ensureBubbleDoesNotExist,
  ensureRepoPathIsGitRepo,
  ensureRuntimeSessionFile,
  renderTaskArtifact,
  resolveCreateReviewArtifactType,
  resolveReviewerBriefInput,
  resolveTaskInput,
  type CreateBubbleConfigInput,
  validateBubbleId
} from "../../v11/application/create/createCommandRuntime.js";
import { extractReviewerFocus } from "../../v11/application/create/createReviewerFocus.js";
export type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult,
  ResolvedTaskInput
} from "../../v11/application/create/createCommandContract.js";
export { BubbleCreateError } from "../../v11/application/create/createCommandRuntime.js";
export { extractReviewerFocus } from "../../v11/application/create/createReviewerFocus.js";

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  validateBubbleId(input.id);
  const createdAt = input.now ?? new Date();
  const reviewArtifactType = resolveCreateReviewArtifactType(input.reviewArtifactType);

  const repoPath = resolve(input.repoPath);
  await ensureRepoPathIsGitRepo(repoPath);

  const baseBranch = input.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw new BubbleCreateError("Base branch cannot be empty.");
  }

  const paths = getBubblePaths(repoPath, input.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);

  const bubbleBranch = `bubble/${input.id}`;
  const ideationMode = input.ideation === true;
  const task = ideationMode
    ? {
        content: buildIdeationPlaceholderTaskContent(input.id),
        source: "ideation_placeholder" as const
      }
    : await resolveTaskInput({
        cwd: input.cwd ?? process.cwd(),
        ...(input.task !== undefined ? { task: input.task } : {}),
        ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {})
      });
  const reviewerFocus = extractReviewerFocus(task.content);
  const accuracyCritical = input.accuracyCritical === true;
  const reviewerBrief = await resolveReviewerBriefInput({
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: input.reviewerBriefFile }
      : {}),
    accuracyCritical,
    cwd: input.cwd ?? process.cwd()
  });

  const bubbleConfigInput: CreateBubbleConfigInput = {
    id: input.id,
    bubbleInstanceId: generateBubbleInstanceId(createdAt),
    repoPath,
    baseBranch,
    bubbleBranch,
    accuracyCritical,
    reviewArtifactType,
    ...(ideationMode
      ? {
          ideationMode: true,
          ideationStartedAt: createdAt.toISOString()
        }
      : {})
  };
  if (input.implementer !== undefined) {
    bubbleConfigInput.implementer = input.implementer;
  }
  if (input.reviewer !== undefined) {
    bubbleConfigInput.reviewer = input.reviewer;
  }
  if (input.testCommand !== undefined) {
    bubbleConfigInput.testCommand = input.testCommand;
  }
  if (input.typecheckCommand !== undefined) {
    bubbleConfigInput.typecheckCommand = input.typecheckCommand;
  }
  if (input.bootstrapCommand !== undefined) {
    bubbleConfigInput.bootstrapCommand = input.bootstrapCommand;
  }
  if (input.openCommand !== undefined) {
    bubbleConfigInput.openCommand = input.openCommand;
  }
  if (input.pairflowCommandProfile !== undefined) {
    bubbleConfigInput.pairflowCommandProfile = input.pairflowCommandProfile;
  }

  const config = buildBubbleConfig(bubbleConfigInput);

  const state = assertValidBubbleStateSnapshot(createInitialBubbleState(input.id));

  await mkdir(paths.messageArtifactsDir, { recursive: true });
  await mkdir(paths.locksDir, { recursive: true });
  await mkdir(paths.runtimeDir, { recursive: true });

  await writeFile(paths.bubbleTomlPath, renderBubbleConfigToml(config), {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.statePath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.transcriptPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.inboxPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.taskArtifactPath, renderTaskArtifact(task), {
    encoding: "utf8",
    flag: "wx"
  });
  let reviewerFocusArtifactWriteStatus: "written" | "write_failed" = "written";
  let reviewerFocusArtifactWriteErrorCode: string | undefined;
  const writeReviewerFocusArtifact =
    dependencies.writeReviewerFocusArtifact ?? writeFile;
  await writeReviewerFocusArtifact(
    paths.reviewerFocusArtifactPath,
    `${JSON.stringify(reviewerFocus, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx"
    }
  ).catch((error: NodeJS.ErrnoException) => {
    reviewerFocusArtifactWriteStatus = "write_failed";
    reviewerFocusArtifactWriteErrorCode =
      error.code ?? error.name ?? "unknown_write_failure";
  });
  if (
    isDocContractGateScopeActive({
      reviewArtifactType: config.review_artifact_type
    })
  ) {
    await writeDocContractGateArtifact(
      resolveDocContractGateArtifactPath(paths.artifactsDir),
      createDocContractGateArtifact({
        now: createdAt,
        bubbleConfig: config,
        taskContent: task.content
      })
    ).catch(() => undefined);
  }
  if (reviewerBrief !== undefined) {
    await writeFile(paths.reviewerBriefArtifactPath, `${reviewerBrief.content}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
  }
  await ensureRuntimeSessionFile(paths.sessionsPath);

  if (!ideationMode) {
    try {
      await appendProtocolEnvelope({
        transcriptPath: paths.transcriptPath,
        lockPath: join(paths.locksDir, `${input.id}.lock`),
        now: createdAt,
        envelope: {
          bubble_id: input.id,
          sender: "orchestrator",
          recipient: config.agents.implementer,
          type: "TASK",
          round: state.round,
          payload: {
            summary: task.content,
            metadata: {
              source: task.source,
              ...(task.sourcePath !== undefined
                ? { source_path: task.sourcePath }
                : {})
            }
          },
          refs: [paths.taskArtifactPath]
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new BubbleCreateError(
        `Failed to append initial TASK envelope for bubble ${input.id}. Root error: ${reason}`
      );
    }
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath,
    bubbleId: input.id,
    bubbleInstanceId: bubbleConfigInput.bubbleInstanceId,
    eventType: "bubble_created",
    round: null,
    actorRole: "orchestrator",
    metadata: {
      base_branch: config.base_branch,
      bubble_branch: config.bubble_branch,
      review_artifact_type: config.review_artifact_type,
      task_source: task.source,
      ideation_mode: ideationMode,
      ideation_task_pending: ideationMode,
      reviewer_focus_status: reviewerFocus.status,
      reviewer_focus_artifact_write: reviewerFocusArtifactWriteStatus,
      ...(reviewerFocusArtifactWriteErrorCode !== undefined
        ? { reviewer_focus_artifact_write_error_code: reviewerFocusArtifactWriteErrorCode }
        : {})
    },
    now: createdAt
  });

  return {
    bubbleId: input.id,
    paths,
    config,
    state,
    task,
    reviewerFocus,
    reviewerFocusArtifactPersist: {
      status: reviewerFocusArtifactWriteStatus,
      artifactPath: paths.reviewerFocusArtifactPath,
      ...(reviewerFocusArtifactWriteErrorCode !== undefined
        ? { errorCode: reviewerFocusArtifactWriteErrorCode }
        : {})
    },
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {})
  };
}
