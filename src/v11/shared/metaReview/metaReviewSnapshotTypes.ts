import type {
  BubbleMetaReviewExecutionContext
} from "../../domain/state/executionContextTypes.js";

export const DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT = 10;

export const metaReviewRuntimeDeliveryStatuses = [
  "confirmed",
  "uncertain",
  "failed"
] as const;

export type MetaReviewRuntimeDeliveryStatus =
  (typeof metaReviewRuntimeDeliveryStatuses)[number];

export interface BubbleMetaReviewRuntimeDeliveryState {
  // Observability-only diagnostic block. It must never become canonical
  // submit/approval authority and is only active when same-authority
  // correlation fields match the current meta-review execution context.
  status: MetaReviewRuntimeDeliveryStatus;
  reason_code: string | null;
  message: string;
  observed_at: string;
  observed_for_handoff_id: string | null;
  observed_for_round: number | null;
}

export interface BubbleMetaReviewSnapshotState {
  execution_context?: BubbleMetaReviewExecutionContext | null;
  runtime_delivery?: BubbleMetaReviewRuntimeDeliveryState | null;
  auto_rework_count: number;
  auto_rework_limit: number;
  sticky_human_gate: boolean;
  consecutive_clean_runs?: number;
}

export function isMetaReviewRuntimeDeliveryStatus(
  value: unknown
): value is MetaReviewRuntimeDeliveryStatus {
  return (
    typeof value === "string" &&
    (metaReviewRuntimeDeliveryStatuses as readonly string[]).includes(value)
  );
}
