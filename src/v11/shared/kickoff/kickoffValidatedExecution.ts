import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import { buildKickoffNextState } from "./kickoffStateTransition.js";
import { prepareKickoffPersistence } from "./kickoffPersistencePreparation.js";
import {
  buildKickoffValidatedSuccessResult,
  type KickoffBubbleResultShape
} from "./kickoffValidatedExecutionResultBuilders.js";
import { executeKickoffMutationOrFailure } from "./kickoffValidatedExecutionMutation.js";
import { persistKickoffNextStateOrFailure } from "./kickoffValidatedExecutionPersistence.js";

export interface ExecuteKickoffValidatedFlowInput {
  validation: KickoffPreparedValidation;
  now: Date;
  nowIso: string;
}

export async function executeKickoffValidatedFlow(
  input: ExecuteKickoffValidatedFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<KickoffBubbleResultShape> {
  const { resolved, state } = input.validation;

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

  const persistedState = await persistKickoffNextStateOrFailure({
    validation: input.validation,
    nextState,
    dependencies
  });
  if (persistedState.kind === "failure") {
    return persistedState.result;
  }
  const writtenState = persistedState.writtenState;

  const mutationOrFailure = await executeKickoffMutationOrFailure({
    validation: input.validation,
    persistence,
    writtenStateFingerprint: writtenState.fingerprint,
    now: input.now,
    dependencies
  });
  if (mutationOrFailure.kind === "failure") {
    return mutationOrFailure.result;
  }

  return buildKickoffValidatedSuccessResult({
    validation: input.validation,
    writtenState
  });
}
