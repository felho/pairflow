import {
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_STATE_CONFLICT
} from "../../../core/bubble/ideation.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import { buildKickoffNextState } from "./kickoffStateTransition.js";
import { prepareKickoffPersistence } from "./kickoffPersistencePreparation.js";
import { persistKickoffState } from "./kickoffStatePersistence.js";
import { executeKickoffMutationPipeline } from "./kickoffMutationPipeline.js";
import {
  buildKickoffFailureResult,
  buildKickoffSuccessResult,
  type KickoffBubbleResultShape
} from "./kickoffResultBuilders.js";

export interface ExecuteKickoffValidatedFlowInput {
  validation: KickoffPreparedValidation;
  now: Date;
  nowIso: string;
}

export async function executeKickoffValidatedFlow(
  input: ExecuteKickoffValidatedFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<KickoffBubbleResultShape> {
  const {
    resolved,
    loadedState,
    state,
    markersBefore,
    task
  } = input.validation;

  const nextState = buildKickoffNextState({
    state,
    bubbleConfig: resolved.bubbleConfig,
    nowIso: input.nowIso
  });

  const persistence = await prepareKickoffPersistence({
    taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
    bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
    nowIso: input.nowIso,
    readFile: dependencies.readFileFn
  });

  const statePersistenceResult = await persistKickoffState({
    statePath: resolved.bubblePaths.statePath,
    loadedFingerprint: loadedState.fingerprint,
    nextState,
    readState: dependencies.readState,
    writeState: dependencies.writeState
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
    now: input.now,
    statePath: resolved.bubblePaths.statePath,
    previousState: state,
    writtenStateFingerprint: writtenState.fingerprint,
    writeFile: dependencies.writeFileFn,
    readFile: dependencies.readFileFn,
    appendEnvelope: dependencies.appendEnvelope,
    writeState: dependencies.writeState
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
