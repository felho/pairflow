import {
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_STATE_CONFLICT,
  IDEATION_KICKOFF_TASK_INVALID
} from "../../../core/bubble/ideation.js";
import type { ResolvedKickoffDependencies } from "../../shared/kickoff/kickoffDependencyResolution.js";
import { prepareKickoffEligibility } from "../../shared/kickoff/kickoffEligibilityPreparation.js";
import { buildKickoffNextState } from "../../shared/kickoff/kickoffStateTransition.js";
import { prepareKickoffPersistence } from "../../shared/kickoff/kickoffPersistencePreparation.js";
import { resolveKickoffTask } from "../../shared/kickoff/kickoffTaskResolution.js";
import { executeKickoffMutationPipeline } from "../../shared/kickoff/kickoffMutationPipeline.js";
import { persistKickoffState } from "../../shared/kickoff/kickoffStatePersistence.js";
import {
  buildKickoffFailureResult,
  buildKickoffSuccessResult,
  type KickoffBubbleResultShape
} from "../../shared/kickoff/kickoffResultBuilders.js";

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
  const resolved = await dependencies.resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await dependencies.readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const preparedEligibility = prepareKickoffEligibility({
    bubbleConfig: resolved.bubbleConfig,
    state
  });
  const { markersBefore, eligibilityFailureReason } = preparedEligibility;
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
