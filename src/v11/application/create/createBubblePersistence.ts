import { mkdir, writeFile } from "node:fs/promises";

import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
import {
  createDocContractGateArtifact,
  isDocContractGateScopeActive
} from "../../../v11/shared/gates/docContractGates.js";
import {
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../gates/docContractGateArtifactDependencyDefaults.js";
import { appendInitialTaskEnvelope } from "./createInitialTaskEnvelopeAppend.js";
import { renderBubbleConfigToml } from "../../../config/bubbleConfig.js";
import type {
  BubbleConfig,
  BubbleRemotePointerCreated,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  BubbleCreateDependencies,
  ResolvedTaskInput
} from "./createCommandContract.js";
import {
  ensureRuntimeSessionFile,
  toBubbleCreateError
} from "./createCommandRuntime.js";
import { renderTaskArtifact } from "./createTaskArtifacts.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";

export interface CreateBubblePersistenceInput {
  bubbleId: string;
  createdAt: Date;
  paths: BubblePaths;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
  task: ResolvedTaskInput;
  reviewerFocus: ReviewerFocusExtractionResult;
  reviewerBrief?: ResolvedTaskInput | undefined;
  remotePointer?: BubbleRemotePointerCreated | undefined;
  ideationMode: boolean;
  dependencies: BubbleCreateDependencies;
}

export interface ReviewerFocusArtifactPersistResult {
  status: "written" | "write_failed";
  artifactPath: string;
  errorCode?: string;
}

async function persistRemotePointerArtifact(input: {
  bubbleId: string;
  remotePointer?: BubbleRemotePointerCreated | undefined;
  paths: BubblePaths;
  dependencies: BubbleCreateDependencies;
}): Promise<void> {
  if (input.remotePointer === undefined) {
    return;
  }

  const { writeRemotePointer } = input.dependencies;
  if (writeRemotePointer === undefined) {
    throw toBubbleCreateError({
      message: "Missing required create bubble dependency: writeRemotePointer.",
      context: {
        dependency: "writeRemotePointer",
        command_name: "create",
        bubble_id: input.bubbleId
      }
    });
  }

  await writeRemotePointer(input.paths.remotePointerPath, input.remotePointer);
}

async function appendInitialTaskEnvelopeIfNeeded(input: {
  bubbleId: string;
  createdAt: Date;
  paths: BubblePaths;
  config: BubbleConfig;
  round: number;
  task: ResolvedTaskInput;
  ideationMode: boolean;
  dependencies: BubbleCreateDependencies;
}): Promise<void> {
  if (input.ideationMode) {
    return;
  }

  if (input.dependencies.appendProtocolEnvelope === undefined) {
    throw toBubbleCreateError({
      message: "Missing required create bubble dependency: appendProtocolEnvelope.",
      context: {
        dependency: "appendProtocolEnvelope",
        command_name: "create",
        bubble_id: input.bubbleId
      }
    });
  }

  await appendInitialTaskEnvelope({
    bubbleId: input.bubbleId,
    createdAt: input.createdAt,
    paths: input.paths,
    config: input.config,
    round: input.round,
    task: input.task,
    appendEnvelope: input.dependencies.appendProtocolEnvelope,
    createError: (message) =>
      toBubbleCreateError({
        message,
        context: {
          command_name: "create",
          bubble_id: input.bubbleId,
          operation: "append_initial_task_envelope"
        }
      })
  });
}

export async function persistCreatedBubbleArtifacts(
  input: CreateBubblePersistenceInput
): Promise<ReviewerFocusArtifactPersistResult> {
  await mkdir(input.paths.messageArtifactsDir, { recursive: true });
  await mkdir(input.paths.locksDir, { recursive: true });
  await mkdir(input.paths.runtimeDir, { recursive: true });

  await writeFile(input.paths.bubbleTomlPath, renderBubbleConfigToml(input.config), {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(
    input.paths.statePath,
    `${JSON.stringify(input.state, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx"
    }
  );
  await writeFile(input.paths.transcriptPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(input.paths.inboxPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(input.paths.taskArtifactPath, renderTaskArtifact(input.task), {
    encoding: "utf8",
    flag: "wx"
  });

  let reviewerFocusArtifactWriteStatus: "written" | "write_failed" = "written";
  let reviewerFocusArtifactWriteErrorCode: string | undefined;
  const writeReviewerFocusArtifact =
    input.dependencies.writeReviewerFocusArtifact ?? writeFile;
  await writeReviewerFocusArtifact(
    input.paths.reviewerFocusArtifactPath,
    `${JSON.stringify(input.reviewerFocus, null, 2)}\n`,
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
      reviewArtifactType: input.config.review_artifact_type
    })
  ) {
    await writeDocContractGateArtifact(
      resolveDocContractGateArtifactPath(input.paths.artifactsDir),
      createDocContractGateArtifact({
        now: input.createdAt,
        bubbleConfig: input.config,
        taskContent: input.task.content
      })
    ).catch(() => undefined);
  }

  if (input.reviewerBrief !== undefined) {
    await writeFile(
      input.paths.reviewerBriefArtifactPath,
      `${input.reviewerBrief.content}\n`,
      {
        encoding: "utf8",
        flag: "wx"
      }
    );
  }
  await persistRemotePointerArtifact(input);
  await ensureRuntimeSessionFile(input.paths.sessionsPath);
  await appendInitialTaskEnvelopeIfNeeded({
    bubbleId: input.bubbleId,
    createdAt: input.createdAt,
    paths: input.paths,
    config: input.config,
    round: input.state.round,
    task: input.task,
    ideationMode: input.ideationMode,
    dependencies: input.dependencies
  });

  return {
    status: reviewerFocusArtifactWriteStatus,
    artifactPath: input.paths.reviewerFocusArtifactPath,
    ...(reviewerFocusArtifactWriteErrorCode !== undefined
      ? { errorCode: reviewerFocusArtifactWriteErrorCode }
      : {})
  };
}
