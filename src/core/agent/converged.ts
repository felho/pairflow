import { readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { validateConvergencePolicy } from "../convergence/policy.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import { WorkspaceResolutionError } from "../bubble/workspaceResolution.js";
import { readReviewVerificationArtifactStatus } from "../reviewer/reviewVerification.js";
import {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../reviewer/testEvidence.js";
import {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath,
  summaryVerifierConsistencyGateSchemaVersion,
  writeSummaryVerifierConsistencyGateArtifact
} from "../reviewer/summaryVerifierConsistencyGate.js";
import {
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGates.js";
import {
  toMetaReviewGateError,
  type MetaReviewGateRoute
} from "../bubble/metaReviewGate.js";
import type { PairflowCommandPathAssessment } from "../runtime/pairflowCommand.js";
import type {
  AgentName,
  BubbleStateSnapshot,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../types/bubble.js";
import { type ProtocolEnvelope } from "../../types/protocol.js";
import { prepareConvergedRouting } from "../../v11/application/converged/convergedRoutingPreparation.js";
import {
  executeConvergedExecution,
  type ExecuteConvergedExecutionDependencies
} from "../../v11/application/converged/convergedExecution.js";
import { finalizeConvergedFlow } from "../../v11/application/converged/convergedFinalization.js";

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export interface EmitConvergedDependencies {
  emitTmuxDeliveryNotification?: ExecuteConvergedExecutionDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?: ExecuteConvergedExecutionDependencies["emitBubbleNotification"];
  applyMetaReviewGateOnConvergence?: ExecuteConvergedExecutionDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?: ExecuteConvergedExecutionDependencies["recoverMetaReviewGateFromSnapshot"];
}

export interface EmitConvergedResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}

export class ConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConvergedCommandError";
  }
}

export function resolveMetaReviewRolloutBlockingReasonCodes(input: {
  gateRoute: MetaReviewGateRoute;
  metaReviewWarnings: Array<{ reason_code: string }>;
  commandPathStatus: PairflowCommandPathAssessment;
}): string[] {
  const codes = new Set<string>();

  if (input.gateRoute === "human_gate_run_failed") {
    codes.add("META_REVIEW_GATE_RUN_FAILED");
  }
  if (input.gateRoute === "human_gate_dispatch_failed") {
    codes.add("META_REVIEW_GATE_REWORK_DISPATCH_FAILED");
  }
  if (
    input.commandPathStatus.profile === "self_host"
    && input.commandPathStatus.status === "stale"
  ) {
    codes.add("PAIRFLOW_COMMAND_PATH_STALE");
  }
  if (
    input.commandPathStatus.profile === "self_host"
    && input.commandPathStatus.status === "unknown"
    && input.commandPathStatus.reasonCode === "PAIRFLOW_COMMAND_PATH_UNRESOLVED"
  ) {
    codes.add("PAIRFLOW_COMMAND_PATH_UNRESOLVED");
  }
  if (
    input.commandPathStatus.profile === "external"
    && input.commandPathStatus.reasonCode === "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
  ) {
    codes.add("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
  }
  for (const warning of input.metaReviewWarnings) {
    if (warning.reason_code === "META_REVIEW_RUNNER_ERROR") {
      codes.add("META_REVIEW_RUNNER_ERROR");
    }
  }

  return [...codes].sort((left, right) => left.localeCompare(right));
}

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const summary = requireNonEmptyString(
    input.summary,
    "Convergence summary",
    (message) => new ConvergedCommandError(message)
  );
  const refs = normalizeStringList(input.refs ?? []);

  const {
    resolved,
    bubbleIdentity,
    state,
    implementer,
    reviewer
  } = await prepareConvergedRouting({
    now,
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
    createError: (message) => new ConvergedCommandError(message)
  });

  const transcript = await readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });
  const policy = validateConvergencePolicy({
    currentRound: state.round,
    reviewer,
    implementer,
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    roundRoleHistory: state.round_role_history,
    transcript,
    severity_gate_round: resolved.bubbleConfig.severity_gate_round
  });
  if (!policy.ok) {
    const diagnosticsSuffix =
      policy.diagnostics.length > 0
        ? ` Diagnostics: ${policy.diagnostics.join(" ")}`
        : "";
    throw new ConvergedCommandError(
      `Convergence validation failed: ${policy.errors.join(" ")}${diagnosticsSuffix}`
    );
  }
  const convergencePolicyDiagnostics = policy.diagnostics.filter(
    (entry) => entry.trim().length > 0
  );

  const docGateScopeActive = isDocContractGateScopeActive({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type
  });
  const defaultSpecLockState: BubbleSpecLockState = {
    state: "IMPLEMENTABLE" as const,
    open_blocker_count: 0,
    open_required_now_count: 0
  };
  const defaultRoundGateState: BubbleRoundGateState = {
    applies: false,
    violated: false,
    round: state.round
  };
  let gateArtifact: Awaited<ReturnType<typeof readDocContractGateArtifact>> | undefined;
  let docGateArtifactReadFailureReason: string | undefined;
  if (docGateScopeActive) {
    try {
      gateArtifact = await readDocContractGateArtifact(
        resolveDocContractGateArtifactPath(resolved.bubblePaths.artifactsDir)
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      docGateArtifactReadFailureReason = reason;
      gateArtifact = undefined;
    }
  }
  const specLockState = docGateScopeActive
    ? gateArtifact?.spec_lock_state ?? defaultSpecLockState
    : defaultSpecLockState;
  const roundGateState = docGateScopeActive
    ? gateArtifact?.round_gate_state ?? defaultRoundGateState
    : defaultRoundGateState;

  if (resolved.bubbleConfig.accuracy_critical === true) {
    const verification = await readReviewVerificationArtifactStatus(
      resolved.bubblePaths.reviewVerificationArtifactPath,
      {
        expectedRound: state.round,
        expectedReviewer: reviewer
      }
    );
    if (verification.status !== "pass") {
      throw new ConvergedCommandError(
        `Convergence validation failed: accuracy-critical review verification must be pass (current: ${verification.status}).`
      );
    }
  }

  const reviewerTestDirective = await resolveReviewerTestExecutionDirective({
    artifactPath: resolveReviewerTestEvidenceArtifactPath(resolved.bubblePaths.artifactsDir),
    worktreePath: resolved.bubblePaths.worktreePath
  }).catch(() => ({
    skip_full_rerun: false,
    reason_code: "evidence_unverifiable" as const,
    reason_detail:
      "Failed to resolve reviewer test directive due to verification runtime error.",
    verification_status: "untrusted" as const
  }));
  const summaryVerifierGateDecision = evaluateSummaryVerifierConsistencyGate({
    summary,
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    verifierStatus: reviewerTestDirective.verification_status,
    ...(reviewerTestDirective.verification_status === "trusted"
      ? {}
      : { verifierOriginReason: reviewerTestDirective.reason_code })
  });
  const summaryVerifierGateArtifactPath = resolveSummaryVerifierConsistencyGateArtifactPath(
    resolved.bubblePaths.artifactsDir
  );
  try {
    await writeSummaryVerifierConsistencyGateArtifact(summaryVerifierGateArtifactPath, {
      schema_version: summaryVerifierConsistencyGateSchemaVersion,
      bubble_id: resolved.bubbleId,
      round: state.round,
      evaluated_at: nowIso,
      ...summaryVerifierGateDecision
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConvergedCommandError(
      `Convergence validation failed: summary/verifier consistency gate audit write failed. Root error: ${reason}`
    );
  }
  if (summaryVerifierGateDecision.gate_decision === "block") {
    throw new ConvergedCommandError(
      `Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary (reason_code=${summaryVerifierGateDecision.reason_code}, claim_classes_detected=${summaryVerifierGateDecision.claim_classes_detected}, verifier_status=${summaryVerifierGateDecision.verifier_status}, verifier_origin_reason=${summaryVerifierGateDecision.verifier_origin_reason ?? "unknown"}).`
    );
  }

  const {
    convergence,
    gateResult,
    delivery: convergedDelivery
  } = await executeConvergedExecution(
    {
      resolved,
      state,
      reviewer,
      implementer,
      summary,
      refs,
      now,
      convergencePolicyDiagnostics
    },
    {
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
    }
  );

  return finalizeConvergedFlow(
    {
      resolved,
      bubbleIdentity,
      state,
      summary,
      refs,
      now,
      convergence,
      gateResult,
      summaryVerifierGateDecision,
      specLockState,
      roundGateState,
      ...(docGateArtifactReadFailureReason !== undefined
        ? { docGateArtifactReadFailureReason }
        : {}),
      ...(convergedDelivery !== undefined
        ? { delivery: convergedDelivery }
        : {})
    },
    {
      resolveMetaReviewRolloutBlockingReasonCodes
    }
  );
}

export function asConvergedCommandError(error: unknown): never {
  if (error instanceof ConvergedCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new ConvergedCommandError(error.message);
  }

  if (error instanceof Error && error.name === "MetaReviewGateError") {
    const gateError = toMetaReviewGateError(error);
    throw new ConvergedCommandError(gateError.message);
  }

  if (error instanceof Error) {
    throw new ConvergedCommandError(error.message);
  }

  throw error;
}
