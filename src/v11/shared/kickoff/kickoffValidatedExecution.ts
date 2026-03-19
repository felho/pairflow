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

function buildKickoffPersistenceFailureResult(input: {
  validation: KickoffPreparedValidation;
  reasonCode: string;
}): KickoffBubbleResultShape {
  return buildKickoffFailureResult({
    bubbleId: input.validation.resolved.bubbleId,
    reasonCode: input.reasonCode,
    stateBefore: input.validation.state,
    markersBefore: input.validation.markersBefore
  });
}

function buildKickoffStatePersistenceInput(input: {
  validation: KickoffPreparedValidation;
  nextState: ReturnType<typeof buildKickoffNextState>;
  dependencies: ResolvedKickoffDependencies;
}): Parameters<typeof persistKickoffState>[0] {
  return {
    statePath: input.validation.resolved.bubblePaths.statePath,
    loadedFingerprint: input.validation.loadedState.fingerprint,
    nextState: input.nextState,
    readState: input.dependencies.readState,
    writeState: input.dependencies.writeState
  };
}

function buildKickoffMutationPipelineInput(input: {
  validation: KickoffPreparedValidation;
  persistence: Awaited<ReturnType<typeof prepareKickoffPersistence>>;
  writtenStateFingerprint: string;
  now: Date;
  dependencies: ResolvedKickoffDependencies;
}): Parameters<typeof executeKickoffMutationPipeline>[0] {
  return {
    persistenceFailureCode: IDEATION_KICKOFF_PERSISTENCE_FAILED,
    bubbleId: input.validation.resolved.bubbleId,
    implementer: input.validation.resolved.bubbleConfig.agents.implementer,
    task: input.validation.task,
    taskArtifactPath: input.validation.resolved.bubblePaths.taskArtifactPath,
    bubbleTomlPath: input.validation.resolved.bubblePaths.bubbleTomlPath,
    nextBubbleToml: input.persistence.nextBubbleToml,
    previousBubbleToml: input.persistence.previousBubbleToml,
    previousTaskArtifact: input.persistence.previousTaskArtifact,
    transcriptPath: input.validation.resolved.bubblePaths.transcriptPath,
    locksDir: input.validation.resolved.bubblePaths.locksDir,
    now: input.now,
    statePath: input.validation.resolved.bubblePaths.statePath,
    previousState: input.validation.state,
    writtenStateFingerprint: input.writtenStateFingerprint,
    writeFile: input.dependencies.writeFileFn,
    readFile: input.dependencies.readFileFn,
    appendEnvelope: input.dependencies.appendEnvelope,
    writeState: input.dependencies.writeState
  };
}

export async function executeKickoffValidatedFlow(
  input: ExecuteKickoffValidatedFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<KickoffBubbleResultShape> {
  const { resolved, state, markersBefore } = input.validation;

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

  const statePersistenceResult = await persistKickoffState(
    buildKickoffStatePersistenceInput({
      validation: input.validation,
      nextState,
      dependencies
    })
  );
  if (statePersistenceResult.kind === "conflict") {
    return buildKickoffPersistenceFailureResult({
      validation: input.validation,
      reasonCode: IDEATION_KICKOFF_STATE_CONFLICT
    });
  }
  const writtenState = statePersistenceResult.writtenState;

  const mutationPipelineResult = await executeKickoffMutationPipeline(
    buildKickoffMutationPipelineInput({
      validation: input.validation,
      persistence,
      writtenStateFingerprint: writtenState.fingerprint,
      now: input.now,
      dependencies
    })
  );
  if (mutationPipelineResult.kind === "mutation_failed_rolled_back") {
    return buildKickoffPersistenceFailureResult({
      validation: input.validation,
      reasonCode: IDEATION_KICKOFF_PERSISTENCE_FAILED
    });
  }

  return buildKickoffSuccessResult({
    bubbleId: resolved.bubbleId,
    markersBefore,
    stateBefore: state,
    stateAfter: writtenState.state
  });
}
