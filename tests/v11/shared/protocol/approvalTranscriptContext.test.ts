import { describe, expect, it } from "vitest";

import {
  hasParityInconsistencyMetadata,
  readApprovalTranscriptContext,
  resolveApprovalGateRouteFromRequest,
  resolveApprovalRecommendationFromRequest
} from "../../../../src/v11/shared/protocol/approvalTranscriptContext.js";
import type { ProtocolEnvelope } from "../../../../src/v11/shared/protocol/protocolEnvelopeContract.js";

function createApprovalRequest(
  id: string,
  round: number,
  ts: string
): ProtocolEnvelope<"APPROVAL_REQUEST"> {
  return {
    id,
    ts,
    bubble_id: "b_approval_transcript_context_01",
    sender: "orchestrator",
    recipient: "human",
    type: "APPROVAL_REQUEST",
    round,
    payload: {
      summary: `Approval summary ${id}`,
      metadata: {
        latest_recommendation: "approve"
      }
    },
    refs: []
  };
}

function createApprovalDecision(
  round: number,
  ts: string
): ProtocolEnvelope<"APPROVAL_DECISION"> {
  return {
    id: `env_round_${round}_decision`,
    ts,
    bubble_id: "b_approval_transcript_context_01",
    sender: "human",
    recipient: "orchestrator",
    type: "APPROVAL_DECISION",
    round,
    payload: {
      decision: "rework"
    },
    refs: []
  };
}

describe("approvalTranscriptContext", () => {
  it("extracts recommendation only from human approval request metadata", () => {
    expect(
      resolveApprovalRecommendationFromRequest(
        createApprovalRequest("env_round_2_latest", 2, "2026-04-11T20:03:00.000Z")
      )
    ).toBe("approve");
    expect(
      resolveApprovalRecommendationFromRequest({
        ...createApprovalRequest("env_missing_metadata", 2, "2026-04-11T20:04:00.000Z"),
        payload: {
          summary: "Approval summary without metadata"
        }
      })
    ).toBeUndefined();
    expect(
      resolveApprovalRecommendationFromRequest({
        ...createApprovalRequest("env_wrong_type", 2, "2026-04-11T20:05:00.000Z"),
        recipient: "claude"
      })
    ).toBeUndefined();
  });

  it("accepts only known gate-route metadata values", () => {
    expect(
      resolveApprovalGateRouteFromRequest({
        ...createApprovalRequest("env_known_route", 2, "2026-04-11T20:06:00.000Z"),
        payload: {
          summary: "Known route",
          metadata: {
            latest_recommendation: "rework",
            meta_review_gate_route: "human_gate_budget_exhausted"
          }
        }
      })
    ).toBe("human_gate_budget_exhausted");
    expect(
      resolveApprovalGateRouteFromRequest({
        ...createApprovalRequest("env_unknown_route", 2, "2026-04-11T20:07:00.000Z"),
        payload: {
          summary: "Unknown route",
          metadata: {
            latest_recommendation: "rework",
            meta_review_gate_route: "future_route_not_in_union"
          }
        }
      })
    ).toBeUndefined();
  });

  it("detects parity inconsistency from status and counts metadata", () => {
    expect(
      hasParityInconsistencyMetadata({
        ...createApprovalRequest("env_parity_status", 2, "2026-04-11T20:03:00.000Z"),
        payload: {
          summary: "Parity mismatch",
          findings_parity: {
            findings_parity_status: "mismatch"
          },
          metadata: {
            latest_recommendation: "approve"
          }
        }
      })
    ).toBe(true);
    expect(
      hasParityInconsistencyMetadata({
        ...createApprovalRequest("env_parity_counts", 2, "2026-04-11T20:03:00.000Z"),
        payload: {
          summary: "Parity count mismatch",
          findings_parity: {
            findings_claimed_open_total: 1,
            findings_artifact_open_total: 2
          },
          metadata: {
            latest_recommendation: "approve"
          }
        }
      })
    ).toBe(true);
    expect(
      hasParityInconsistencyMetadata(
        createApprovalRequest("env_clean", 2, "2026-04-11T20:03:00.000Z")
      )
    ).toBe(false);
  });

  it("returns only the latest current-round approval request", async () => {
    const context = await readApprovalTranscriptContext(
      "/tmp/transcript.ndjson",
      2,
      {
        readTranscriptEnvelopes: async () => [
          createApprovalRequest("env_round_1", 1, "2026-04-11T20:00:00.000Z"),
          createApprovalRequest("env_round_2_older", 2, "2026-04-11T20:01:00.000Z"),
          createApprovalDecision(2, "2026-04-11T20:02:00.000Z"),
          createApprovalRequest("env_round_2_latest", 2, "2026-04-11T20:03:00.000Z")
        ]
      }
    );

    expect(context).toStrictEqual({
      latestRoundApprovalRequest: createApprovalRequest(
        "env_round_2_latest",
        2,
        "2026-04-11T20:03:00.000Z"
      )
    });
  });

  it("returns an empty context when no current-round approval request exists", async () => {
    const context = await readApprovalTranscriptContext(
      "/tmp/transcript.ndjson",
      3,
      {
        readTranscriptEnvelopes: async () => [
          createApprovalRequest("env_round_1", 1, "2026-04-11T20:00:00.000Z"),
          createApprovalRequest("env_round_2", 2, "2026-04-11T20:01:00.000Z")
        ]
      }
    );

    expect(context).toStrictEqual({});
  });

  it("returns an empty context when a same-round approval decision is newer than the request", async () => {
    const context = await readApprovalTranscriptContext(
      "/tmp/transcript.ndjson",
      2,
      {
        readTranscriptEnvelopes: async () => [
          createApprovalRequest("env_round_2_request", 2, "2026-04-11T20:01:00.000Z"),
          createApprovalDecision(2, "2026-04-11T20:02:00.000Z")
        ]
      }
    );

    expect(context).toStrictEqual({});
  });
});
