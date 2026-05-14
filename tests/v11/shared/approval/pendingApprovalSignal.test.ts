import { describe, expect, it } from "vitest";

import {
  resolveCanonicalPendingApprovalSignal,
  resolveLatestPendingApprovalRequest
} from "../../../../src/v11/shared/approval/pendingApprovalSignal.js";
import type { ProtocolEnvelope } from "../../../../src/v11/shared/protocol/protocolEnvelopeContract.js";

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
  } as ProtocolEnvelope;
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
    ], 1);

    expect(pendingApproval).toMatchObject({
      envelopeId: "env_latest",
      summary: "Latest approval summary"
    });
  });

  it("keeps only current-round unresolved approval requests", () => {
    const pendingApproval = resolveCanonicalPendingApprovalSignal({
      round: 2,
      envelopes: [
        createApprovalRequestEnvelope({
          id: "env_historical",
          ts: "2026-02-22T10:12:00.000Z",
          round: 1,
          payload: {
            summary: "Historical approval summary"
          }
        }),
        createApprovalRequestEnvelope({
          id: "env_current",
          ts: "2026-02-22T10:13:00.000Z",
          round: 2,
          payload: {
            summary: "Current approval summary"
          }
        })
      ]
    });

    expect(pendingApproval).toMatchObject({
      envelopeId: "env_current",
      summary: "Current approval summary",
      round: 2
    });
  });

  it("clears pending approval after a same-round decision", () => {
    const pendingApproval = resolveCanonicalPendingApprovalSignal({
      round: 1,
      envelopes: [
        createApprovalRequestEnvelope({
          id: "env_latest",
          ts: "2026-02-22T10:13:00.000Z",
          payload: {
            summary: "Latest approval summary"
          }
        }),
        {
          id: "env_decision",
          ts: "2026-02-22T10:14:00.000Z",
          bubble_id: "b_pending_approval_01",
          sender: "human",
          recipient: "orchestrator",
          type: "APPROVAL_DECISION",
          round: 1,
          payload: {
            decision: "approve"
          },
          refs: []
        } satisfies ProtocolEnvelope
      ]
    });

    expect(pendingApproval).toBeUndefined();
  });

  it("projects current-round approval recommendation and gate route metadata", () => {
    const pendingApproval = resolveCanonicalPendingApprovalSignal({
      round: 1,
      envelopes: [
        createApprovalRequestEnvelope({
          id: "env_budget_exhausted",
          ts: "2026-02-22T10:15:00.000Z",
          payload: {
            summary: "Human decision required after meta-review.",
            metadata: {
              latest_recommendation: "rework",
              meta_review_gate_route: "human_gate_budget_exhausted"
            }
          }
        })
      ]
    });

    expect(pendingApproval).toMatchObject({
      envelopeId: "env_budget_exhausted",
      latestRecommendation: "rework",
      gateRoute: "human_gate_budget_exhausted"
    });
  });
});
