import type { MetaReviewGateRoute } from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type { PairflowCommandPathAssessment } from "../../../core/runtime/pairflowCommand.js";

export interface ResolveMetaReviewRolloutBlockingReasonCodesInput {
  gateRoute: MetaReviewGateRoute;
  metaReviewWarnings: Array<{ reason_code: string }>;
  commandPathStatus: PairflowCommandPathAssessment;
}

export function resolveMetaReviewRolloutBlockingReasonCodesV11(
  input: ResolveMetaReviewRolloutBlockingReasonCodesInput
): string[] {
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
    && input.commandPathStatus.reasonCode === "PAIRFLOW_COMMAND_PATH_STALE"
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
