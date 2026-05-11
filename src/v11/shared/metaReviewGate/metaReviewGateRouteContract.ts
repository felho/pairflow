import type {
  BubbleReviewAutoReworkSeverity
} from "../reviewPolicy/reviewPolicyTypes.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import type { FindingPriority } from "../../../types/findings.js";

export type MetaReviewGateThresholdStatus =
  | "not_met"
  | "unresolved"
  | "incomplete";

export type MetaReviewGateThresholdMetadata =
  | {
      status: "not_met";
      reasonCode: "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET";
      minSeverity: BubbleReviewAutoReworkSeverity;
      highestOpenSeverity: FindingPriority;
    }
  | {
      status: "unresolved";
      reasonCode: "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED";
    }
  | {
      status: "incomplete";
      reasonCode: "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE";
    };

export const metaReviewGateRoutes = [
  "meta_review_running",
  "auto_rework",
  "human_gate_sticky_bypass",
  "human_gate_approve",
  "human_gate_budget_exhausted",
  "human_gate_threshold_not_met",
  "human_gate_threshold_unresolved",
  "human_gate_inconclusive",
  "human_gate_run_failed",
  "human_gate_dispatch_failed"
] as const;

export type MetaReviewGateRoute = (typeof metaReviewGateRoutes)[number];

export type MetaReviewGateReasonCode =
  | "META_REVIEW_GATE_RUN_FAILED"
  | "META_REVIEW_GATE_REWORK_DISPATCH_FAILED"
  | "META_REVIEW_GATE_STATE_CONFLICT"
  | "META_REVIEW_GATE_TRANSITION_INVALID";

export interface MetaReviewGateErrorDiagnostics {
  bubbleId?: string;
  round?: number;
  rollbackReasonCode?: string;
  rollbackOutcome?: "not_attempted" | "applied" | "failed";
  rollbackTargetState?: BubbleStateSnapshot["state"];
  stageReasonCode?: string;
  restoreReasonCode?: string;
  retryInvariantReasonCode?: string;
}

export class MetaReviewGateError extends Error {
  public readonly reasonCode: MetaReviewGateReasonCode;
  public readonly diagnostics: MetaReviewGateErrorDiagnostics | undefined;

  public constructor(
    reasonCode: MetaReviewGateReasonCode,
    message: string,
    diagnostics?: MetaReviewGateErrorDiagnostics
  ) {
    super(message);
    this.name = "MetaReviewGateError";
    this.reasonCode = reasonCode;
    this.diagnostics = diagnostics;
  }
}
