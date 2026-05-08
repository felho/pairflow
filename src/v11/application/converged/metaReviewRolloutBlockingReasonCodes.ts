import type { MetaReviewGateRoute } from "../../shared/metaReviewGate/index.js";
import type { PairflowCommandPathAssessment } from "../../ports/pairflowCommand.js";

export interface ResolveMetaReviewRolloutBlockingReasonCodesInput {
  gateRoute: MetaReviewGateRoute;
  commandPathStatus: PairflowCommandPathAssessment;
}

export function resolveConvergedRolloutBlockingReasonCodes(
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
  return [...codes].sort((left, right) => left.localeCompare(right));
}
