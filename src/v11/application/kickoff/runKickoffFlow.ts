import {
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_STATE_CONFLICT
} from "../../../core/bubble/ideation.js";
import type { ResolvedKickoffDependencies } from "../../shared/kickoff/kickoffDependencyResolution.js";
import { buildKickoffNextState } from "../../shared/kickoff/kickoffStateTransition.js";
import { prepareKickoffPersistence } from "../../shared/kickoff/kickoffPersistencePreparation.js";
import { executeKickoffMutationPipeline } from "../../shared/kickoff/kickoffMutationPipeline.js";
import { persistKickoffState } from "../../shared/kickoff/kickoffStatePersistence.js";
import {
  buildKickoffFailureResult,
  buildKickoffSuccessResult,
  type KickoffBubbleResultShape
} from "../../shared/kickoff/kickoffResultBuilders.js";
import { prepareKickoffValidation } from "../../shared/kickoff/kickoffValidationPreparation.js";

export interface RunKickoffFlowInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now: Date;
  nowIso: string;
}

export type RunKickoffFlowResult = KickoffBubbleResultShape;

export async function runKickoffFlow(
  input: RunKickoffFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<RunKickoffFlowResult> {
  const validation = await prepareKickoffValidation({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  }, dependencies);
  if (validation.kind === "failure") {
    return validation.result;
  }

  const {
    resolved,
    loadedState,
    state,
    markersBefore,
    task
  } = validation;

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
