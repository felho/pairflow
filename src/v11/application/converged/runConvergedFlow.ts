import type {
  ExecuteConvergedExecutionDependencies,
  RunConvergedFlowDependencies,
  RunConvergedFlowInput,
  RunConvergedFlowResult
} from "./runConvergedFlowContract.js";
import type { GatePipelineResult } from "../gates/gatePipelineContract.js";
import { runGatePipeline } from "../gates/runGatePipeline.js";

export type {
  ExecuteConvergedExecutionDependencies,
  RunConvergedFlowDependencies,
  RunConvergedFlowInput,
  RunConvergedFlowResult
} from "./runConvergedFlowContract.js";

const convergedPolicyGateId = "converged_policy";
const convergedValidationGateId = "converged_validation";

type ResolvedConvergedPolicyResult = Awaited<
  ReturnType<RunConvergedFlowDependencies["prepareConvergedPolicy"]>
>;
type ResolvedConvergedValidationResult = Awaited<
  ReturnType<RunConvergedFlowDependencies["prepareConvergedValidation"]>
>;
type ResolvedConvergedValidationPassResult = Extract<
  ResolvedConvergedValidationResult,
  { outcome: "pass" | "warn" }
>;
type ConvergedGateMetadata =
  | {
      kind: "policy";
      value: ResolvedConvergedPolicyResult;
    }
  | {
      kind: "validation";
      value: ResolvedConvergedValidationResult;
    };

function getGateMetadata(
  result: GatePipelineResult<ConvergedGateMetadata>,
  gateId: string
): ConvergedGateMetadata | undefined {
  return result.gate_outcomes.find((gateOutcome) => gateOutcome.gate_id === gateId)
    ?.metadata;
}

function resolvePolicyGateResult(
  result: GatePipelineResult<ConvergedGateMetadata>
): ResolvedConvergedPolicyResult | undefined {
  const metadata = getGateMetadata(result, convergedPolicyGateId);
  return metadata?.kind === "policy" ? metadata.value : undefined;
}

function resolveValidationGateResult(
  result: GatePipelineResult<ConvergedGateMetadata>
): ResolvedConvergedValidationResult | undefined {
  const metadata = getGateMetadata(result, convergedValidationGateId);
  return metadata?.kind === "validation" ? metadata.value : undefined;
}

function createConvergedGateContext(round: number, gateId?: string): PairflowCommandErrorContext {
  return {
    command_name: "converged",
    round,
    ...(gateId !== undefined
      ? { gate_id: gateId }
      : {})
  };
}

function buildDiagnosticsSuffix(input: {
  diagnostics: string[];
  exclude?: string[];
}): string {
  const excluded = new Set(input.exclude ?? []);
  const filteredDiagnostics = input.diagnostics.filter(
    (entry) => entry.trim().length > 0 && !excluded.has(entry)
  );
  return filteredDiagnostics.length > 0
    ? ` Diagnostics: ${filteredDiagnostics.join(" ")}`
    : "";
}

function toConvergedBlockedGateError(input: {
  flowInput: RunConvergedFlowInput;
  round: number;
  pipelineResult: GatePipelineResult<ConvergedGateMetadata>;
}): Error {
  const blockedGateId = input.pipelineResult.stopped_at_gate_id;
  if (blockedGateId === convergedPolicyGateId) {
    const policyResult = resolvePolicyGateResult(input.pipelineResult);
    if (policyResult === undefined) {
      return input.flowInput.createError({
        reasonCode: "GATE_CONTEXT_INVALID",
        message: "Converged policy gate block result is missing.",
        context: {
          ...createConvergedGateContext(input.round, blockedGateId),
          ...(input.pipelineResult.diagnostics.length > 0
            ? { pipeline_diagnostics: input.pipelineResult.diagnostics }
            : {})
        }
      });
    }

    const diagnosticsSuffix = buildDiagnosticsSuffix({
      diagnostics: input.pipelineResult.diagnostics,
      exclude: policyResult.policy.errors
    });
    return input.flowInput.createError({
      reasonCode: "CONVERGED_POLICY_VALIDATION_FAILED",
      message: `Convergence validation failed: ${policyResult.policy.errors.join(" ")}${diagnosticsSuffix}`,
      context: createConvergedGateContext(input.round, blockedGateId)
    });
  }

  if (blockedGateId === convergedValidationGateId) {
    const validationResult = resolveValidationGateResult(input.pipelineResult);
    if (validationResult === undefined || validationResult.outcome !== "block") {
      return input.flowInput.createError({
        reasonCode: "GATE_CONTEXT_INVALID",
        message: "Converged validation gate block result is missing.",
        context: {
          ...createConvergedGateContext(input.round, blockedGateId),
          ...(input.pipelineResult.diagnostics.length > 0
            ? { pipeline_diagnostics: input.pipelineResult.diagnostics }
            : {})
        }
      });
    }

    return input.flowInput.createError(validationResult.blockingError);
  }

  return input.flowInput.createError({
    reasonCode: "CONVERGED_GATE_PIPELINE_BLOCKED",
    message: `Convergence validation failed: gate pipeline blocked at ${blockedGateId ?? "unknown"}.`,
    context: {
      ...createConvergedGateContext(input.round, blockedGateId),
      ...(input.pipelineResult.diagnostics.length > 0
        ? { pipeline_diagnostics: input.pipelineResult.diagnostics }
        : {})
    }
  });
}

function requireValidationGateDecision(input: {
  flowInput: RunConvergedFlowInput;
  round: number;
  pipelineResult: GatePipelineResult<ConvergedGateMetadata>;
}): ResolvedConvergedValidationPassResult {
  const validationResult = resolveValidationGateResult(input.pipelineResult);
  if (
    validationResult !== undefined
    && validationResult.outcome !== "block"
  ) {
    return validationResult;
  }

  throw input.flowInput.createError({
    reasonCode: "GATE_CONTEXT_INVALID",
    message: "Converged validation gate did not produce a summary verifier decision.",
    context: createConvergedGateContext(input.round, convergedValidationGateId)
  });
}

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

async function runConvergedGatePipeline(input: {
  flowInput: RunConvergedFlowInput;
  dependencies: RunConvergedFlowDependencies;
  routing: Awaited<ReturnType<RunConvergedFlowDependencies["prepareConvergedRouting"]>>;
  nowIso: string;
}): Promise<GatePipelineResult<ConvergedGateMetadata>> {
  const { flowInput, dependencies, routing, nowIso } = input;

  return runGatePipeline<
    { bubble_id: string; round: number },
    "converged",
    ConvergedGateMetadata
  >({
    profile: "converged",
    context: {
      bubble_id: routing.resolved.bubbleId,
      round: routing.state.round
    },
    gates: [
      {
        gate_id: convergedPolicyGateId,
        evaluate: async () => {
          const policyResult = await dependencies.prepareConvergedPolicy({
            transcriptPath: routing.resolved.bubblePaths.transcriptPath,
            currentRound: routing.state.round,
            reviewer: routing.reviewer,
            implementer: routing.implementer,
            reviewArtifactType: routing.resolved.bubbleConfig.review_artifact_type,
            roundRoleHistory: routing.state.round_role_history,
            severityGateRound: routing.resolved.bubbleConfig.severity_gate_round
          });

          return {
            gate_id: convergedPolicyGateId,
            outcome: policyResult.policy.ok ? "pass" : "block",
            diagnostics: [
              ...policyResult.policy.errors,
              ...policyResult.policy.diagnostics
            ],
            metadata: {
              kind: "policy",
              value: policyResult
            } satisfies ConvergedGateMetadata
          };
        }
      },
      {
        gate_id: convergedValidationGateId,
        evaluate: async () => {
          const validationResult = await dependencies.prepareConvergedValidation({
            resolved: routing.resolved,
            state: routing.state,
            reviewer: routing.reviewer,
            summary: flowInput.summary,
            nowIso,
            createError: flowInput.createError
          });

          return {
            gate_id: convergedValidationGateId,
            outcome: validationResult.outcome,
            diagnostics: validationResult.diagnostics,
            metadata: {
              kind: "validation",
              value: validationResult
            } satisfies ConvergedGateMetadata
          };
        }
      }
    ]
  });
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
