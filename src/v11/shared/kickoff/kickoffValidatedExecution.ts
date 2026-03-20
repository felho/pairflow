import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import {
  buildKickoffValidatedSuccessResult,
  type KickoffBubbleResultShape
} from "./kickoffValidatedExecutionResultBuilders.js";
import { executeKickoffMutationOrFailure } from "./kickoffValidatedExecutionMutation.js";
import { persistKickoffNextStateOrFailure } from "./kickoffValidatedExecutionPersistence.js";
import { prepareKickoffValidatedExecutionContext } from "./kickoffValidatedExecutionPreparation.js";

export interface ExecuteKickoffValidatedFlowInput {
  validation: KickoffPreparedValidation;
  now: Date;
  nowIso: string;
}

export async function executeKickoffValidatedFlow(
  input: ExecuteKickoffValidatedFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<KickoffBubbleResultShape> {
  const { nextState, persistence } = await prepareKickoffValidatedExecutionContext({
    validation: input.validation,
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
