import type { SummaryVerifierConsistencyGateDecisionRecord } from "../../../../shared/reviewer/summaryVerifierConsistencyGate.js";
import type { PairflowCommandPathAssessment } from "../../../../ports/pairflowCommand.js";
import { type MetaReviewGateRoute } from "../../../../shared/metaReviewGate/index.js";
import type { BubbleStateSnapshot } from "../../../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../../shared/gates/gateStateTypes.js";
import type { ProtocolEnvelope } from "../../../../../types/protocol.js";

export function buildConvergedEventMetadata(input: {
  summary: string;
  refs: string[];
  advisoryFindingsOpenTotal: number;
  convergenceEnvelopeId: string;
  gateResult: {
    route: MetaReviewGateRoute;
    gateEnvelope: ProtocolEnvelope;
    state: BubbleStateSnapshot;
    metaReviewRun?: {
      status: string;
      recommendation: string;
      warnings?: Array<{ reason_code: string }>;
      rework_target_message?: string | null;
    };
  };
  commandPathStatus: PairflowCommandPathAssessment;
  blockingReasonCodes: string[];
  summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
}): Record<string, unknown> {
  return {
    refs_count: input.refs.length,
    summary_length: Array.from(input.summary).length,
    advisory_findings_open_total: input.advisoryFindingsOpenTotal,
    convergence_envelope_id: input.convergenceEnvelopeId,
    gate_handoff_envelope_id: input.gateResult.gateEnvelope.id,
    gate_handoff_type: input.gateResult.gateEnvelope.type,
    gate_route: input.gateResult.route,
    pairflow_command_path_status: input.commandPathStatus.status,
    pairflow_command_path_local_entrypoint: input.commandPathStatus.localEntrypoint,
    pairflow_command_path_entrypoint_consistency:
      input.commandPathStatus.entrypointConsistency ?? "unknown",
    ...(input.commandPathStatus.activeEntrypoint !== null
      ? {
          pairflow_command_path_active_entrypoint:
            input.commandPathStatus.activeEntrypoint
        }
      : {}),
    ...(input.commandPathStatus.reasonCode !== undefined
      ? {
          pairflow_command_path_reason_code: input.commandPathStatus.reasonCode
        }
      : {}),
    meta_review_warning_reason_codes: JSON.stringify(
      (input.gateResult.metaReviewRun?.warnings ?? []).map((warning) => warning.reason_code)
    ),
    meta_review_rollout_blocking_reason_codes: JSON.stringify(input.blockingReasonCodes),
    summary_verifier_gate_decision: input.summaryVerifierGateDecision.gate_decision,
    summary_verifier_gate_reason_code: input.summaryVerifierGateDecision.reason_code,
    summary_verifier_gate_claim_classes_detected:
      input.summaryVerifierGateDecision.claim_classes_detected,
    summary_verifier_gate_verifier_status:
      input.summaryVerifierGateDecision.verifier_status,
    summary_verifier_gate_matched_claim_triggers:
      JSON.stringify(input.summaryVerifierGateDecision.matched_claim_triggers),
    spec_lock_state: input.specLockState.state,
    spec_lock_open_blocker_count: input.specLockState.open_blocker_count,
    spec_lock_open_required_now_count: input.specLockState.open_required_now_count,
    round_gate_applies: input.roundGateState.applies,
    round_gate_violated: input.roundGateState.violated,
    ...(input.roundGateState.reason_code !== undefined
      ? { round_gate_reason_code: input.roundGateState.reason_code }
      : {}),
    ...(input.summaryVerifierGateDecision.verifier_origin_reason !== undefined
      ? {
          summary_verifier_gate_verifier_origin_reason:
            input.summaryVerifierGateDecision.verifier_origin_reason
        }
      : {}),
    ...(input.docGateArtifactReadFailureReason !== undefined
      ? {
          doc_gate_artifact_read_failed: true,
          doc_gate_artifact_read_failure_reason: input.docGateArtifactReadFailureReason
        }
      : {})
  };
}

export function resolveMetaReviewRouteRecommendation(input: {
  route: MetaReviewGateRoute;
}): string {
  switch (input.route) {
    case "auto_rework":
    case "human_gate_budget_exhausted":
    case "human_gate_threshold_not_met":
    case "human_gate_threshold_unresolved":
      return "rework";
    case "human_gate_approve":
      return "approve";
    case "human_gate_inconclusive":
    case "human_gate_run_failed":
    case "human_gate_dispatch_failed":
    case "human_gate_sticky_bypass":
    case "meta_review_running":
      return "inconclusive";
  }
  return throwUnexpectedMetaReviewRoute(input.route, "recommendation");
}

export function resolveMetaReviewRouteStatus(input: {
  route: MetaReviewGateRoute;
}): string {
  switch (input.route) {
    case "human_gate_run_failed":
    case "human_gate_dispatch_failed":
      return "error";
    case "human_gate_sticky_bypass":
    case "meta_review_running":
      return "inconclusive";
    case "auto_rework":
    case "human_gate_approve":
    case "human_gate_budget_exhausted":
    case "human_gate_threshold_not_met":
    case "human_gate_threshold_unresolved":
    case "human_gate_inconclusive":
      return "success";
  }
  return throwUnexpectedMetaReviewRoute(input.route, "status");
}

function throwUnexpectedMetaReviewRoute(
  route: never,
  source: "recommendation" | "status"
): never {
  const reasonCode = "CONVERGED_META_REVIEW_ROUTE_UNEXPECTED";
  const context = {
    source,
    route: String(route)
  };
  throw new Error(
    `${reasonCode}: ${source} fallback is undefined for route=${String(route)} context=${JSON.stringify(context)}`
  );
}

export function buildMetaReviewRoutedMetadata(input: {
  advisoryFindingsOpenTotal: number;
  gateResult: {
    route: MetaReviewGateRoute;
    gateEnvelope: ProtocolEnvelope;
    state: BubbleStateSnapshot;
    metaReviewRun?: {
      status: string;
      recommendation: string;
      warnings?: Array<{ reason_code: string }>;
      rework_target_message?: string | null;
    };
  };
  blockingReasonCodes: string[];
  commandPathStatus: PairflowCommandPathAssessment;
}): Record<string, unknown> {
  return {
    gate_route: input.gateResult.route,
    gate_handoff_type: input.gateResult.gateEnvelope.type,
    advisory_findings_open_total: input.advisoryFindingsOpenTotal,
    recommendation:
      input.gateResult.metaReviewRun?.recommendation ??
      resolveMetaReviewRouteRecommendation({ route: input.gateResult.route }),
    run_status:
      input.gateResult.metaReviewRun?.status ??
      resolveMetaReviewRouteStatus({ route: input.gateResult.route }),
    warning_reason_codes: JSON.stringify(
      (input.gateResult.metaReviewRun?.warnings ?? []).map((warning) => warning.reason_code)
    ),
    blocking_reason_codes: JSON.stringify(input.blockingReasonCodes),
    pairflow_command_path_status: input.commandPathStatus.status,
    pairflow_command_path_entrypoint_consistency:
      input.commandPathStatus.entrypointConsistency ?? "unknown",
    pairflow_command_path_local_entrypoint: input.commandPathStatus.localEntrypoint,
    ...(input.commandPathStatus.activeEntrypoint !== null
      ? {
          pairflow_command_path_active_entrypoint:
            input.commandPathStatus.activeEntrypoint
        }
      : {}),
    ...(input.commandPathStatus.reasonCode !== undefined
      ? {
          pairflow_command_path_reason_code: input.commandPathStatus.reasonCode
        }
      : {})
  };
}
