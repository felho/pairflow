import { describe, expect, it } from "vitest";

import {
  buildCanonicalPendingApprovalSignal,
  resolveCanonicalPendingApprovalSignal,
  resolveLatestPendingApprovalRequest
} from "../../../../src/v11/shared/approval/pendingApprovalSignal.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";

function createApprovalRequestEnvelope(
  overrides: Partial<ProtocolEnvelope> & {
    id: string;
    ts: string;
  }
): ProtocolEnvelope {
  const {
    id,
    ts,
    ...rest
  } = overrides;
  return {
    id,
    ts,
    bubble_id: "b_pending_approval_01",
    sender: "orchestrator",
    recipient: "human",
    type: "APPROVAL_REQUEST",
    round: 1,
    payload: {
      summary: "Approval summary"
    },
    refs: [],
    ...rest
  } satisfies ProtocolEnvelope;
}

describe("pendingApprovalSignal", () => {
  it("keeps only the latest unresolved approval request", () => {
    const pendingApproval = resolveLatestPendingApprovalRequest([
      createApprovalRequestEnvelope({
        id: "env_older",
        ts: "2026-02-22T10:12:00.000Z",
        payload: {
          summary: "Older approval summary"
        }
      }),
      createApprovalRequestEnvelope({
        id: "env_latest",
        ts: "2026-02-22T10:13:00.000Z",
        payload: {
          summary: "Latest approval summary"
        }
      })
    ]);

    expect(pendingApproval).toMatchObject({
      envelopeId: "env_latest",
      summary: "Latest approval summary"
    });
  });

  it("prefers a newer meta-review snapshot while waiting for human approval", () => {
    const pendingApproval = buildCanonicalPendingApprovalSignal({
      bubbleId: "b_pending_approval_01",
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 1,
      metaReview: {
        last_autonomous_run_id: "run_meta_newer",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Fresh approve summary",
        last_autonomous_report_ref: "artifacts/meta-review-last.json",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-02-22T10:15:00.000Z",
        auto_rework_count: 0,
        auto_rework_limit: 3,
        sticky_human_gate: false
      },
      pendingApproval: {
        envelopeId: "env_older",
        ts: "2026-02-22T10:14:00.000Z",
        round: 1,
        sender: "orchestrator",
        summary: "Older approval summary",
        refs: []
      }
    });

    expect(pendingApproval).toEqual({
      envelopeId: "meta_review_snapshot:b_pending_approval_01:2026-02-22T10:15:00.000Z",
      ts: "2026-02-22T10:15:00.000Z",
      round: 1,
      sender: "orchestrator",
      summary: "Fresh approve summary",
      refs: ["artifacts/meta-review-last.json"]
    });
  });

  it("keeps the approval request when the snapshot is older", () => {
    const pendingApproval = resolveCanonicalPendingApprovalSignal({
      bubbleId: "b_pending_approval_01",
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 1,
      metaReview: {
        last_autonomous_run_id: "run_meta_older",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Older snapshot summary",
        last_autonomous_report_ref: "artifacts/meta-review-last.json",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-02-22T10:12:00.000Z",
        auto_rework_count: 0,
        auto_rework_limit: 3,
        sticky_human_gate: false
      },
      envelopes: [
        createApprovalRequestEnvelope({
          id: "env_latest",
          ts: "2026-02-22T10:13:00.000Z",
          payload: {
            summary: "Latest approval summary"
          }
        })
      ]
    });

    expect(pendingApproval).toMatchObject({
      envelopeId: "env_latest",
      summary: "Latest approval summary"
    });
  });
});
