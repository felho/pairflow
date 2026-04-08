import type {
  ExecuteConvergedExecutionDependencies,
  RunConvergedFlowDependencies,
  RunConvergedFlowInput,
  RunConvergedFlowResult
} from "./runConvergedFlowContract.js";
import {
  convergedPolicyGateId,
  createConvergedGateContext,
  requireValidationGateDecision,
  resolvePolicyGateResult,
  runConvergedGatePipeline,
  toConvergedBlockedGateError,
  type ResolvedConvergedValidationPassResult
} from "./runConvergedFlowGateSupport.js";

export type {
  ExecuteConvergedExecutionDependencies,
  RunConvergedFlowDependencies,
  RunConvergedFlowInput,
  RunConvergedFlowResult
} from "./runConvergedFlowContract.js";

function buildExecutionDependencies(
  dependencies: RunConvergedFlowDependencies
): ExecuteConvergedExecutionDependencies {
  return {
    ...(dependencies.applyMetaReviewGateOnConvergence !== undefined
      ? {
          applyMetaReviewGateOnConvergence:
            dependencies.applyMetaReviewGateOnConvergence
        }
      : {}),
    ...(dependencies.recoverMetaReviewGateFromSnapshot !== undefined
      ? {
          recoverMetaReviewGateFromSnapshot:
            dependencies.recoverMetaReviewGateFromSnapshot
        }
      : {}),
    ...(dependencies.emitTmuxDeliveryNotification !== undefined
      ? {
          emitTmuxDeliveryNotification:
            dependencies.emitTmuxDeliveryNotification
        }
      : {}),
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : {})
  };
}

function buildRoutingInput(input: RunConvergedFlowInput): Parameters<
  RunConvergedFlowDependencies["prepareConvergedRouting"]
>[0] {
  return {
    now: input.now,
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    ...(input.authoritativeContext !== undefined
      ? { authoritativeContext: input.authoritativeContext }
      : {}),
    ...(input.expectedStateFingerprint !== undefined
      ? { expectedStateFingerprint: input.expectedStateFingerprint }
      : {}),
    ...(input.expectedRound !== undefined
      ? { expectedRound: input.expectedRound }
      : {}),
    ...(input.expectedReviewer !== undefined
      ? { expectedReviewer: input.expectedReviewer }
      : {}),
    createError: input.createError
  };
}

function buildFinalizeConvergedFlowInput(input: {
  flowInput: RunConvergedFlowInput;
  routing: Awaited<ReturnType<RunConvergedFlowDependencies["prepareConvergedRouting"]>>;
  executionResult: Awaited<
    ReturnType<RunConvergedFlowDependencies["executeConvergedExecution"]>
  >;
  validationResult: ResolvedConvergedValidationPassResult;
}): Parameters<RunConvergedFlowDependencies["finalizeConvergedFlow"]>[0] {
  const { flowInput, routing, executionResult, validationResult } = input;

  return {
    resolved: routing.resolved,
    bubbleIdentity: routing.bubbleIdentity,
    state: routing.state,
    summary: flowInput.summary,
    refs: flowInput.refs,
    now: flowInput.now,
    convergence: executionResult.convergence,
    gateResult: executionResult.gateResult,
    summaryVerifierGateDecision: validationResult.summaryVerifierGateDecision,
    specLockState: validationResult.specLockState,
    roundGateState: validationResult.roundGateState,
    ...(validationResult.docGateArtifactReadFailureReason !== undefined
      ? {
          docGateArtifactReadFailureReason:
            validationResult.docGateArtifactReadFailureReason
        }
      : {}),
    ...(executionResult.delivery !== undefined
      ? { delivery: executionResult.delivery }
      : {})
  };
}

export async function runConvergedFlow(
  input: RunConvergedFlowInput,
  dependencies: RunConvergedFlowDependencies
): Promise<RunConvergedFlowResult> {
  const nowIso = input.now.toISOString();
  const routing = await dependencies.prepareConvergedRouting(
    buildRoutingInput(input)
  );
  const pipelineResult = await runConvergedGatePipeline({
    flowInput: input,
    dependencies,
    routing,
    nowIso
  });
  if (pipelineResult.final_outcome === "block") {
    throw toConvergedBlockedGateError({
      flowInput: input,
      round: routing.state.round,
      pipelineResult
    });
  }

  const policyResult = resolvePolicyGateResult(pipelineResult);
  if (policyResult === undefined) {
    throw input.createError({
      reasonCode: "GATE_CONTEXT_INVALID",
      message: "Converged policy gate did not produce a result.",
      context: createConvergedGateContext(routing.state.round, convergedPolicyGateId)
    });
  }
  const validationResult = requireValidationGateDecision({
    flowInput: input,
    round: routing.state.round,
    pipelineResult
  });
  const executionResult = await dependencies.executeConvergedExecution(
    {
      resolved: routing.resolved,
      state: routing.state,
      reviewer: routing.reviewer,
      implementer: routing.implementer,
      summary: input.summary,
      refs: input.refs,
      ...(input.findings !== undefined && input.findings.length > 0
        ? { findings: input.findings }
        : {}),
      now: input.now,
      convergencePolicyDiagnostics: policyResult.convergencePolicyDiagnostics,
      gatePipelineDiagnostics: pipelineResult.diagnostics
    },
    buildExecutionDependencies(dependencies)
  );

  return dependencies.finalizeConvergedFlow(
    buildFinalizeConvergedFlowInput({
      flowInput: input,
      routing,
      executionResult,
      validationResult
    }),
    {
      resolveMetaReviewRolloutBlockingReasonCodes:
        input.resolveMetaReviewRolloutBlockingReasonCodes
    }
  );
}
