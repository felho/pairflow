import {
  type AgentName
} from "../../types/bubble.js";
import {
  runConvergedFlow,
  type RunConvergedFlowDependencies,
  type RunConvergedFlowResult
} from "../../v11/application/converged/runConvergedFlow.js";
import {
  buildConvergedCommandFlowInvocation,
} from "../../v11/shared/converged/convergedFlowInvocationBuilders.js";
import { normalizeConvergedCommandError } from "../../v11/shared/converged/convergedCommandErrorNormalization.js";
import { normalizeConvergedCommandInput } from "../../v11/shared/converged/convergedCommandInputNormalization.js";
import {
  ConvergedCommandError,
  createConvergedCommandError,
  isConvergedCommandError
} from "../../v11/shared/converged/convergedCommandError.js";
import { resolveConvergedRolloutBlockingReasonCodes as resolveMetaReviewRolloutBlockingReasonCodes } from "../../v11/shared/converged/convergedRolloutBlockingReasonResolver.js";
export { resolveMetaReviewRolloutBlockingReasonCodes };
export { ConvergedCommandError };

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export type EmitConvergedDependencies = Pick<
  RunConvergedFlowDependencies,
  | "emitTmuxDeliveryNotification"
  | "emitBubbleNotification"
  | "applyMetaReviewGateOnConvergence"
  | "recoverMetaReviewGateFromSnapshot"
>;

export type EmitConvergedResult = RunConvergedFlowResult;

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  const normalized = normalizeConvergedCommandInput({
    summary: input.summary,
    refs: input.refs,
    now: input.now,
    createError: createConvergedCommandError
  });
  const invocation = buildConvergedCommandFlowInvocation({
    summary: normalized.summary,
    refs: normalized.refs,
    now: normalized.now,
    cwd: input.cwd,
    expectedStateFingerprint: input.expectedStateFingerprint,
    expectedRound: input.expectedRound,
    expectedReviewer: input.expectedReviewer,
    createError: createConvergedCommandError,
    resolveMetaReviewRolloutBlockingReasonCodes,
    dependencies
  });

  return runConvergedFlow(invocation.flowInput, invocation.flowDependencies);
}

export function asConvergedCommandError(error: unknown): never {
  throw normalizeConvergedCommandError({
    error,
    isConvergedCommandError,
    createConvergedCommandError
  });
}
