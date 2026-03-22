import type {
  ExecuteConvergedExecutionDependencies,
  RunConvergedFlowDependencies,
  RunConvergedFlowInput,
  RunConvergedFlowResult
} from "./runConvergedFlowContract.js";

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

export async function runConvergedFlow(
  input: RunConvergedFlowInput,
  dependencies: RunConvergedFlowDependencies
): Promise<RunConvergedFlowResult> {
  const nowIso = input.now.toISOString();
  const routing = await dependencies.prepareConvergedRouting(
    buildRoutingInput(input)
  );
  const policyResult = await dependencies.prepareConvergedPolicy({
    transcriptPath: routing.resolved.bubblePaths.transcriptPath,
    currentRound: routing.state.round,
    reviewer: routing.reviewer,
    implementer: routing.implementer,
    reviewArtifactType: routing.resolved.bubbleConfig.review_artifact_type,
    roundRoleHistory: routing.state.round_role_history,
    severityGateRound: routing.resolved.bubbleConfig.severity_gate_round
  });
  if (!policyResult.policy.ok) {
    const diagnosticsSuffix =
      policyResult.policy.diagnostics.length > 0
        ? ` Diagnostics: ${policyResult.policy.diagnostics.join(" ")}`
        : "";
    throw input.createError({
      reasonCode: "CONVERGED_POLICY_VALIDATION_FAILED",
      message: `Convergence validation failed: ${policyResult.policy.errors.join(" ")}${diagnosticsSuffix}`,
      context: {
        command_name: "converged",
        round: routing.state.round
      }
    });
  }

  const validationResult = await dependencies.prepareConvergedValidation({
    resolved: routing.resolved,
    state: routing.state,
    reviewer: routing.reviewer,
    summary: input.summary,
    nowIso,
    createError: input.createError
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
      convergencePolicyDiagnostics: policyResult.convergencePolicyDiagnostics
    },
    buildExecutionDependencies(dependencies)
  );

  return dependencies.finalizeConvergedFlow(
    {
      resolved: routing.resolved,
      bubbleIdentity: routing.bubbleIdentity,
      state: routing.state,
      summary: input.summary,
      refs: input.refs,
      now: input.now,
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
    },
    {
      resolveMetaReviewRolloutBlockingReasonCodes:
        input.resolveMetaReviewRolloutBlockingReasonCodes
    }
  );
}
