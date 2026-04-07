import { runConvergedFlow } from "./runConvergedFlow.js";
import {
  buildConvergedCommandFlowInvocation
} from "./convergedFlowInvocationBuilders.js";
import { normalizeConvergedCommandError } from "./convergedCommandErrorNormalization.js";
import { normalizeConvergedCommandInput } from "../../shared/converged/convergedCommandInputNormalization.js";
import {
  createConvergedCommandError,
  isConvergedCommandError
} from "../../shared/converged/convergedCommandError.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedInput,
  EmitConvergedResult
} from "../../shared/converged/convergedCommandTypes.js";
import { resolveConvergedRolloutBlockingReasonCodes } from "./convergedRolloutBlockingReasonResolver.js";

export async function emitConvergedFromWorkspaceCommandOrchestration(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  const normalized = normalizeConvergedCommandInput({
    summary: input.summary,
    refs: input.refs,
    findings: input.findings,
    now: input.now,
    createError: createConvergedCommandError
  });
  const invocation = buildConvergedCommandFlowInvocation({
    summary: normalized.summary,
    refs: normalized.refs,
    ...(normalized.findings.length > 0 ? { findings: normalized.findings } : {}),
    now: normalized.now,
    cwd: input.cwd,
    authoritativeContext: input.authoritativeContext,
    expectedStateFingerprint: input.expectedStateFingerprint,
    expectedRound: input.expectedRound,
    expectedReviewer: input.expectedReviewer,
    createError: createConvergedCommandError,
    resolveMetaReviewRolloutBlockingReasonCodes:
      resolveConvergedRolloutBlockingReasonCodes,
    dependencies
  });

  return runConvergedFlow(invocation.flowInput, invocation.flowDependencies);
}

export function throwAsConvergedCommandError(error: unknown): never {
  // reason_code=CONVERGED_COMMAND_ERROR_NORMALIZED context=command_error_normalization
  throw normalizeConvergedCommandError({
    error,
    isConvergedCommandError,
    createConvergedCommandError
  });
}
