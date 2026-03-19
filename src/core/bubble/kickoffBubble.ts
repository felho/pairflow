import type { readFile, writeFile } from "node:fs/promises";

import type { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import type { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import type { resolveBubbleById } from "./bubbleLookup.js";
import {
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_STATE_CONFLICT,
  IDEATION_KICKOFF_TASK_INVALID,
  resolveIdeationMetadata
} from "./ideation.js";
import { resolveKickoffEligibilityFailureReason } from "../../v11/shared/kickoff/kickoffEligibility.js";
import { buildKickoffNextState } from "../../v11/shared/kickoff/kickoffStateTransition.js";
import { prepareKickoffPersistence } from "../../v11/shared/kickoff/kickoffPersistencePreparation.js";
import { resolveKickoffDependencies } from "../../v11/shared/kickoff/kickoffDependencyResolution.js";
import { resolveKickoffTask } from "../../v11/shared/kickoff/kickoffTaskResolution.js";
import { executeKickoffMutationPipeline } from "../../v11/shared/kickoff/kickoffMutationPipeline.js";
import { persistKickoffState } from "../../v11/shared/kickoff/kickoffStatePersistence.js";
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

  const taskResolution = await resolveKickoffTask({
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    cwd: input.cwd ?? process.cwd()
  });
  if (taskResolution.kind === "invalid") {
    return buildKickoffFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_TASK_INVALID,
      stateBefore: state,
      markersBefore
    });
  }
  const task = taskResolution.task;

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

  const statePersistenceResult = await persistKickoffState({
    statePath: resolved.bubblePaths.statePath,
    loadedFingerprint: loadedState.fingerprint,
    nextState,
    readState,
    writeState
  });
  if (statePersistenceResult.kind === "conflict") {
    return buildKickoffFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_STATE_CONFLICT,
      stateBefore: state,
      markersBefore
    });
  }
  const writtenState = statePersistenceResult.writtenState;

  const mutationPipelineResult = await executeKickoffMutationPipeline({
    persistenceFailureCode: IDEATION_KICKOFF_PERSISTENCE_FAILED,
    bubbleId: resolved.bubbleId,
    implementer: resolved.bubbleConfig.agents.implementer,
    task,
    taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
    bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
    nextBubbleToml: persistence.nextBubbleToml,
    previousBubbleToml: persistence.previousBubbleToml,
    previousTaskArtifact: persistence.previousTaskArtifact,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    locksDir: resolved.bubblePaths.locksDir,
    now,
    statePath: resolved.bubblePaths.statePath,
    previousState: state,
    writtenStateFingerprint: writtenState.fingerprint,
    writeFile: writeFileFn,
    readFile: readFileFn,
    appendEnvelope,
    writeState
  });
  if (mutationPipelineResult.kind === "mutation_failed_rolled_back") {
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
