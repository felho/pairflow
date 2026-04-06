import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { BubblePaths } from "../../infrastructure/artifact/bubble/paths.js";
import {
  createDocContractGateArtifact,
  isDocContractGateScopeActive,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../../../v11/shared/gates/docContractGates.js";
import { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { renderBubbleConfigToml } from "../../../config/bubbleConfig.js";
import type {
  BubbleConfig,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  BubbleCreateDependencies,
  ResolvedTaskInput
} from "./createCommandContract.js";
import { BubbleCreateError, ensureRuntimeSessionFile, renderTaskArtifact } from "./createCommandRuntime.js";
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
  ideationMode: boolean;
  dependencies: BubbleCreateDependencies;
}

export interface ReviewerFocusArtifactPersistResult {
  status: "written" | "write_failed";
  artifactPath: string;
  errorCode?: string;
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
  await ensureRuntimeSessionFile(input.paths.sessionsPath);

  if (!input.ideationMode) {
    try {
      await appendProtocolEnvelope({
        transcriptPath: input.paths.transcriptPath,
        lockPath: join(input.paths.locksDir, `${input.bubbleId}.lock`),
        now: input.createdAt,
        envelope: {
          bubble_id: input.bubbleId,
          sender: "orchestrator",
          recipient: input.config.agents.implementer,
          type: "TASK",
          round: input.state.round,
          payload: {
            summary: input.task.content,
            metadata: {
              source: input.task.source,
              ...(input.task.sourcePath !== undefined
                ? { source_path: input.task.sourcePath }
                : {})
            }
          },
          refs: [input.paths.taskArtifactPath]
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new BubbleCreateError(
        `Failed to append initial TASK envelope for bubble ${input.bubbleId}. Root error: ${reason}`
      );
    }
  }

  return {
    status: reviewerFocusArtifactWriteStatus,
    artifactPath: input.paths.reviewerFocusArtifactPath,
    ...(reviewerFocusArtifactWriteErrorCode !== undefined
      ? { errorCode: reviewerFocusArtifactWriteErrorCode }
      : {})
  };
}
