import { mkdir, rm, writeFile } from "node:fs/promises";

import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
import {
  createDocContractGateArtifact,
  isDocContractGateScopeActive
} from "../../../v11/shared/gates/docContractGates.js";
import {
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../../shared/gates/docContractGateArtifactDefaults.js";
import { appendInitialTaskEnvelope } from "../../shared/create/createInitialTaskEnvelopeAppend.js";
import { renderBubbleConfigToml } from "../../../config/bubbleConfig.js";
import type {
  BubbleConfig,
  BubbleRemotePointerCreated,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import {
  validateRemotePointer
} from "../../../v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import type {
  BubbleCreateDependencies,
  ResolvedTaskInput
} from "./createCommandContract.js";
import { BubbleCreateError, ensureRuntimeSessionFile, renderTaskArtifact } from "./createCommandRuntime.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";
import { assertValidation } from "../../shared/validation/primitives.js";

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

function validateCreateRemotePointer(
  pointer: BubbleRemotePointerCreated
): BubbleRemotePointerCreated {
  return assertValidation(
    validateRemotePointer(pointer),
    "Invalid remote pointer"
  ) as BubbleRemotePointerCreated;
}

async function writeExclusiveRemotePointer(input: {
  path: string;
  pointer: BubbleRemotePointerCreated;
  writeRemotePointerFile?: typeof writeFile;
}): Promise<void> {
  const writeRemotePointerFile = input.writeRemotePointerFile ?? writeFile;
  await writeRemotePointerFile(
    input.path,
    `${JSON.stringify(input.pointer, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx"
    }
  );
}

async function persistRemotePointer(input: {
  path: string;
  pointer: BubbleRemotePointerCreated;
  writeRemotePointerFile?: typeof writeFile;
}): Promise<void> {
  const validatedRemotePointer = validateCreateRemotePointer(input.pointer);

  try {
    await writeExclusiveRemotePointer({
      path: input.path,
      pointer: validatedRemotePointer,
      ...(input.writeRemotePointerFile !== undefined
        ? { writeRemotePointerFile: input.writeRemotePointerFile }
        : {})
    });
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "EEXIST") {
      throw new BubbleCreateError(`Remote pointer already exists: ${input.path}`);
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCreateError(
      `Failed to write remote pointer at ${input.path}: ${reason}`,
      { cause: error }
    );
  }
}

async function rollbackCreatedArtifacts(paths: string[]): Promise<void> {
  for (const path of [...paths].reverse()) {
    await rm(path, { force: true }).catch(() => undefined);
  }
}

async function rollbackBubbleNamespace(paths: BubblePaths): Promise<void> {
  await rm(paths.bubbleDir, { recursive: true, force: true }).catch(() => undefined);
}

export async function persistCreatedBubbleArtifacts(
  input: CreateBubblePersistenceInput
): Promise<ReviewerFocusArtifactPersistResult> {
  // Bubble-local files live under paths.bubbleDir and are cleaned up via namespace rollback.
  const createdExternalArtifactPaths: string[] = [];
  let reviewerFocusArtifactWriteStatus: "written" | "write_failed" = "written";
  let reviewerFocusArtifactWriteErrorCode: string | undefined;

  try {
    await mkdir(input.paths.messageArtifactsDir, { recursive: true });
    await mkdir(input.paths.locksDir, { recursive: true });
    await mkdir(input.paths.runtimeDir, { recursive: true });

    if (input.remotePointer !== undefined) {
      await persistRemotePointer({
        path: input.paths.remotePointerPath,
        pointer: input.remotePointer,
        ...(input.dependencies.writeRemotePointerFile !== undefined
          ? { writeRemotePointerFile: input.dependencies.writeRemotePointerFile }
          : {})
      });
    }

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

    const writeReviewerFocusArtifact =
      input.dependencies.writeReviewerFocusArtifact ?? writeFile;
    await writeReviewerFocusArtifact(
      input.paths.reviewerFocusArtifactPath,
      `${JSON.stringify(input.reviewerFocus, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx"
      }
    ).then(() => {
      return undefined;
    }).catch((error: NodeJS.ErrnoException) => {
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

    const createdRuntimeSessionFile = await ensureRuntimeSessionFile(
      input.paths.sessionsPath
    );
    if (createdRuntimeSessionFile) {
      createdExternalArtifactPaths.push(input.paths.sessionsPath);
    }

    if (!input.ideationMode) {
      if (input.dependencies.appendProtocolEnvelope === undefined) {
        throw new BubbleCreateError(
          "Missing required create bubble dependency: appendProtocolEnvelope."
        );
      }
      await appendInitialTaskEnvelope({
        bubbleId: input.bubbleId,
        createdAt: input.createdAt,
        paths: input.paths,
        config: input.config,
        round: input.state.round,
        task: input.task,
        appendEnvelope: input.dependencies.appendProtocolEnvelope,
        createError: (message) => new BubbleCreateError(message)
      });
    }
  } catch (error) {
    if (createdExternalArtifactPaths.length > 0) {
      await rollbackCreatedArtifacts(createdExternalArtifactPaths);
    }
    await rollbackBubbleNamespace(input.paths);
    throw error;
  }

  return {
    status: reviewerFocusArtifactWriteStatus,
    artifactPath: input.paths.reviewerFocusArtifactPath,
    ...(reviewerFocusArtifactWriteErrorCode !== undefined
      ? { errorCode: reviewerFocusArtifactWriteErrorCode }
      : {})
  };
}
