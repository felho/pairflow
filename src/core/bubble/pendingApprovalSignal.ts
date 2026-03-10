import type {
  BubbleLifecycleState,
  BubbleMetaReviewSnapshotState
} from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface PendingApprovalSignal {
  envelopeId: string;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
}

function deriveApprovalSummary(payload: Record<string, unknown>): string {
  const value = payload.summary;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "(missing approval summary)";
}

export function isHumanApprovalState(state: BubbleLifecycleState): boolean {
  return (
    state === "READY_FOR_HUMAN_APPROVAL"
    || state === "READY_FOR_APPROVAL"
    || state === "META_REVIEW_FAILED"
  );
}

export function resolveLatestPendingApprovalRequest(
  envelopes: ProtocolEnvelope[]
): PendingApprovalSignal | undefined {
  let pendingApproval: PendingApprovalSignal | undefined;

  for (const envelope of envelopes) {
    if (envelope.type === "APPROVAL_REQUEST") {
      pendingApproval = {
        envelopeId: envelope.id,
        ts: envelope.ts,
        round: envelope.round,
        sender: envelope.sender,
        summary: deriveApprovalSummary(
          envelope.payload as unknown as Record<string, unknown>
        ),
        refs: envelope.refs
      };
      continue;
    }

    if (envelope.type === "APPROVAL_DECISION") {
      pendingApproval = undefined;
    }
  }

  return pendingApproval;
}

export function buildCanonicalPendingApprovalSignal(input: {
  bubbleId: string;
  state: BubbleLifecycleState;
  round: number;
  metaReview: BubbleMetaReviewSnapshotState | undefined;
  pendingApproval: PendingApprovalSignal | undefined;
}): PendingApprovalSignal | undefined {
  if (!isHumanApprovalState(input.state)) {
    return input.pendingApproval;
  }

  const updatedAt = input.metaReview?.last_autonomous_updated_at ?? null;
  const summary = input.metaReview?.last_autonomous_summary ?? null;
  if (
    updatedAt === null ||
    summary === null ||
    summary.trim().length === 0
  ) {
    return input.pendingApproval;
  }
  if (
    input.pendingApproval !== undefined &&
    input.pendingApproval.ts >= updatedAt
  ) {
    return input.pendingApproval;
  }

  return {
    envelopeId: `meta_review_snapshot:${input.bubbleId}:${updatedAt}`,
    ts: updatedAt,
    round: input.round,
    sender: "orchestrator",
    summary: summary.trim(),
    refs:
      input.metaReview?.last_autonomous_report_ref !== null &&
        input.metaReview?.last_autonomous_report_ref !== undefined
        ? [input.metaReview.last_autonomous_report_ref]
        : []
  };
}

export function resolveCanonicalPendingApprovalSignal(input: {
  bubbleId: string;
  state: BubbleLifecycleState;
  round: number;
  metaReview: BubbleMetaReviewSnapshotState | undefined;
  envelopes: ProtocolEnvelope[];
}): PendingApprovalSignal | undefined {
  return buildCanonicalPendingApprovalSignal({
    bubbleId: input.bubbleId,
    state: input.state,
    round: input.round,
    metaReview: input.metaReview,
    pendingApproval: resolveLatestPendingApprovalRequest(input.envelopes)
  });
}
