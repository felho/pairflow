import type { readFile, writeFile } from "node:fs/promises";

import type { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { StateStoreConflictError } from "../state/stateStore.js";
import type { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import type { resolveBubbleById } from "./bubbleLookup.js";
import {
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_STATE_CONFLICT,
  IDEATION_KICKOFF_TASK_INVALID,
  resolveIdeationMetadata
} from "./ideation.js";
import {
  KickoffTaskInputValidationError,
  type ResolvedKickoffTaskInput,
  resolveKickoffTaskInput
} from "../../v11/shared/kickoff/kickoffTaskInputResolution.js";
import { resolveKickoffEligibilityFailureReason } from "../../v11/shared/kickoff/kickoffEligibility.js";
import { buildKickoffNextState } from "../../v11/shared/kickoff/kickoffStateTransition.js";
import { executeKickoffMutationRollback } from "../../v11/shared/kickoff/kickoffMutationRollback.js";
import { prepareKickoffPersistence } from "../../v11/shared/kickoff/kickoffPersistencePreparation.js";
import { executeKickoffMutation } from "../../v11/shared/kickoff/kickoffMutationExecution.js";
import { resolveKickoffDependencies } from "../../v11/shared/kickoff/kickoffDependencyResolution.js";
import {
  buildKickoffFailureResult,
  buildKickoffSuccessResult,
  type KickoffBubbleResultShape
} from "../../v11/shared/kickoff/kickoffResultBuilders.js";

export interface KickoffBubbleInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now?: Date;
}

export type KickoffBubbleResult = KickoffBubbleResultShape;

export interface KickoffBubbleDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
}

export async function kickoffBubble(
  input: KickoffBubbleInput,
  dependencies: KickoffBubbleDependencies = {}
): Promise<KickoffBubbleResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const {
    resolveBubble,
    readState,
    writeState,
    readFileFn,
    writeFileFn,
    appendEnvelope
  } = resolveKickoffDependencies(dependencies);

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const ideationMetadata = resolveIdeationMetadata(resolved.bubbleConfig);
  const markersBefore = {
    ideation_mode: ideationMetadata.mode,
    ideation_task_pending: ideationMetadata.taskPending
  };

  const eligibilityFailureReason = resolveKickoffEligibilityFailureReason({
    hasParseWarning: resolved.bubbleConfig.ideation?.parse_warning !== undefined,
    ideationMode: ideationMetadata.mode,
    ideationTaskPending: ideationMetadata.taskPending,
    state
  });
  if (eligibilityFailureReason !== null) {
    return buildKickoffFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: eligibilityFailureReason,
      stateBefore: state,
      markersBefore
    });
  }

  let task: ResolvedKickoffTaskInput;
  try {
    task = await resolveKickoffTaskInput({
      ...(input.task !== undefined ? { task: input.task } : {}),
      ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
      cwd: input.cwd ?? process.cwd()
    });
  } catch (error) {
    if (error instanceof KickoffTaskInputValidationError) {
      return buildKickoffFailureResult({
        bubbleId: resolved.bubbleId,
        reasonCode: IDEATION_KICKOFF_TASK_INVALID,
        stateBefore: state,
        markersBefore
      });
    }
    throw error;
  }

  const latestState = await readState(resolved.bubblePaths.statePath);
  if (latestState.fingerprint !== loadedState.fingerprint) {
    return buildKickoffFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_STATE_CONFLICT,
      stateBefore: state,
      markersBefore
    });
  }

  const nextState = buildKickoffNextState({
    state,
    bubbleConfig: resolved.bubbleConfig,
    nowIso
  });

  const persistence = await prepareKickoffPersistence({
    taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
    bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
    nowIso,
    readFile: readFileFn
  });

  let writtenState;
  try {
    writtenState = await writeState(
      resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      return buildKickoffFailureResult({
        bubbleId: resolved.bubbleId,
        reasonCode: IDEATION_KICKOFF_STATE_CONFLICT,
        stateBefore: state,
        markersBefore
      });
    }
    throw error;
  }

  let transcriptBackup: string | null = null;
  try {
    transcriptBackup = await executeKickoffMutation({
      bubbleId: resolved.bubbleId,
      implementer: resolved.bubbleConfig.agents.implementer,
      task,
      taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
      bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
      nextBubbleToml: persistence.nextBubbleToml,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      locksDir: resolved.bubblePaths.locksDir,
      now,
      writeFile: writeFileFn,
      readFile: readFileFn,
      appendEnvelope
    });
  } catch (error) {
    const rollbackErrors = await executeKickoffMutationRollback({
      transcriptBackup,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
      previousTaskArtifact: persistence.previousTaskArtifact,
      bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
      previousBubbleToml: persistence.previousBubbleToml,
      statePath: resolved.bubblePaths.statePath,
      previousState: state,
      writtenStateFingerprint: writtenState.fingerprint,
      writeFile: writeFileFn,
      writeState
    });

    if (rollbackErrors.length > 0) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${IDEATION_KICKOFF_PERSISTENCE_FAILED}: mutation failed (${errorMessage}) and rollback failed (${rollbackErrors.join("; ")}).`
      );
    }

    return buildKickoffFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_PERSISTENCE_FAILED,
      stateBefore: state,
      markersBefore
    });
  }

  return buildKickoffSuccessResult({
    bubbleId: resolved.bubbleId,
    markersBefore,
    stateBefore: state,
    stateAfter: writtenState.state
  });
}
