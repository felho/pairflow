import { describe, expect, it } from "vitest";

import {
  assertApprovalDecisionEligibility,
  resolveApprovalDecisionMetadata
} from "../../../../../src/v11/application/approval/internal/flow/approvalRoutingEligibility.js";
import type { ProtocolEnvelope } from "../../../../../src/types/protocol.js";

class ApprovalRoutingEligibilityTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ApprovalRoutingEligibilityTestError";
  }
}

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

const createError: PairflowCreateCommandError = (input) =>
  new ApprovalRoutingEligibilityTestError(toErrorMessage(input));

describe("approvalRoutingEligibility", () => {
  function createApprovalRequest(
    round: number,
    recommendation?: "approve" | "rework" | "inconclusive",
    metadataOverrides?: Record<string, unknown>
  ): ProtocolEnvelope[] {
    return [
      {
        id: "msg_approval_request_01",
        ts: "2026-03-20T10:00:00.000Z",
        bubble_id: "b_approval_routing_01",
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round,
        payload: {
          summary: "Approval summary",
          metadata: {
            ...(recommendation !== undefined
              ? { latest_recommendation: recommendation }
              : {}),
            ...metadataOverrides
          }
        },
        refs: []
      }
    ];
  }

  it("rejects decisions outside approval states", () => {
    expect(() =>
      assertApprovalDecisionEligibility(
        {
          state: "WAITING_HUMAN",
          round: 1
        } as never,
        createError
      )
    ).toThrow(/approval decision can only be used while bubble is/u);
  });

  it("requires override when latest recommendation is non-approve", async () => {
    await expect(
      resolveApprovalDecisionMetadata({
        decision: "approve",
        state: {
          state: "READY_FOR_HUMAN_APPROVAL",
          round: 3
        } as never,
        transcriptPath: "/tmp/transcript.ndjson",
        round: 3,
        readTranscriptEnvelopes: async () => createApprovalRequest(3, "rework"),
        createError
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REQUIRED/u);
  });

  it("prefers current-round transcript recommendation over conflicting cached state", async () => {
    await expect(
      resolveApprovalDecisionMetadata({
        decision: "approve",
        state: {
          state: "READY_FOR_HUMAN_APPROVAL",
          round: 3
        } as never,
        transcriptPath: "/tmp/transcript.ndjson",
        round: 3,
        readTranscriptEnvelopes: async () => createApprovalRequest(3, "rework"),
        createError
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REQUIRED/u);
  });

  it("requires parity override when current-round approval metadata is inconsistent", async () => {
    await expect(
      resolveApprovalDecisionMetadata({
        decision: "approve",
        state: {
          state: "READY_FOR_HUMAN_APPROVAL",
          round: 3
        } as never,
        transcriptPath: "/tmp/transcript.ndjson",
        round: 3,
        readTranscriptEnvelopes: async () =>
          createApprovalRequest(3, "approve", {
            findings_parity_status: "mismatch"
          }),
        createError
      })
    ).rejects.toThrow(/APPROVAL_PARITY_OVERRIDE_REQUIRED/u);
  });

  it("emits override metadata when override parameters are valid", async () => {
    const metadata = await resolveApprovalDecisionMetadata({
      decision: "approve",
      state: {
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 2
      } as never,
      transcriptPath: "/tmp/transcript.ndjson",
        round: 2,
        overrideNonApprove: true,
        overrideReason: "Human reviewed unresolved edge-case manually.",
        readTranscriptEnvelopes: async () => createApprovalRequest(2, "inconclusive"),
        createError
    });

    expect(metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true,
      override_reason: "Human reviewed unresolved edge-case manually."
    });
  });

  it("emits parity inconsistency metadata when parity override parameters are valid", async () => {
    const metadata = await resolveApprovalDecisionMetadata({
      decision: "approve",
      state: {
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 2
      } as never,
      transcriptPath: "/tmp/transcript.ndjson",
      round: 2,
      overrideNonApprove: true,
      overrideReason: "Human verified the findings mismatch manually.",
      readTranscriptEnvelopes: async () =>
        createApprovalRequest(2, "approve", {
          approval_summary_consistency_status: "mismatch"
        }),
      createError
    });

    expect(metadata).toMatchObject({
      recommendation_at_decision: "approve",
      findings_parity_inconsistent: true,
      override_non_approve: true,
      override_reason: "Human verified the findings mismatch manually."
    });
  });

  it("prioritizes parity override semantics when non-approve recommendation and parity mismatch are both present", async () => {
    await expect(
      resolveApprovalDecisionMetadata({
        decision: "approve",
        state: {
          state: "READY_FOR_HUMAN_APPROVAL",
          round: 2
        } as never,
        transcriptPath: "/tmp/transcript.ndjson",
        round: 2,
        readTranscriptEnvelopes: async () =>
          createApprovalRequest(2, "rework", {
            findings_parity_status: "mismatch"
          }),
        createError
      })
    ).rejects.toThrow(/APPROVAL_PARITY_OVERRIDE_REQUIRED/u);

    const metadata = await resolveApprovalDecisionMetadata({
      decision: "approve",
      state: {
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 2
      } as never,
      transcriptPath: "/tmp/transcript.ndjson",
      round: 2,
      overrideNonApprove: true,
      overrideReason: "Human verified both the rework recommendation and parity mismatch manually.",
      readTranscriptEnvelopes: async () =>
        createApprovalRequest(2, "rework", {
          findings_parity_status: "mismatch"
        }),
      createError
    });

    expect(metadata).toMatchObject({
      recommendation_at_decision: "rework",
      findings_parity_inconsistent: true,
      override_non_approve: true,
      override_reason:
        "Human verified both the rework recommendation and parity mismatch manually."
    });
  });

  it("fails closed when current-round approval request metadata lacks latest recommendation", async () => {
    await expect(
      resolveApprovalDecisionMetadata({
        decision: "approve",
        state: {
          state: "READY_FOR_HUMAN_APPROVAL",
          round: 3
        } as never,
        transcriptPath: "/tmp/transcript.ndjson",
        round: 3,
        readTranscriptEnvelopes: async () => createApprovalRequest(3),
        createError
      })
    ).rejects.toThrow(/APPROVAL_RECOMMENDATION_UNAVAILABLE/u);
  });

  it("fails closed when only historical-round approval request metadata exists", async () => {
    await expect(
      resolveApprovalDecisionMetadata({
        decision: "approve",
        state: {
          state: "READY_FOR_HUMAN_APPROVAL",
          round: 3
        } as never,
        transcriptPath: "/tmp/transcript.ndjson",
        round: 3,
        readTranscriptEnvelopes: async () => createApprovalRequest(2, "approve"),
        createError
      })
    ).rejects.toThrow(/APPROVAL_RECOMMENDATION_UNAVAILABLE/u);
  });
});
