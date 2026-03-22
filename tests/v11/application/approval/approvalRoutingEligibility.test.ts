import { describe, expect, it } from "vitest";

import {
  assertApprovalDecisionEligibility,
  resolveApprovalDecisionMetadata
} from "../../../../src/v11/shared/approval/approvalRoutingEligibility.js";

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
          round: 3,
          meta_review: {
            last_autonomous_recommendation: "rework"
          }
        } as never,
        transcriptPath: "/tmp/transcript.ndjson",
        round: 3,
        readTranscriptEnvelopes: async () => [],
        createError
      })
    ).rejects.toThrow(/APPROVAL_OVERRIDE_REQUIRED/u);
  });

  it("emits override metadata when override parameters are valid", async () => {
    const metadata = await resolveApprovalDecisionMetadata({
      decision: "approve",
      state: {
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 2,
        meta_review: {
          last_autonomous_recommendation: "inconclusive"
        }
      } as never,
      transcriptPath: "/tmp/transcript.ndjson",
      round: 2,
      overrideNonApprove: true,
      overrideReason: "Human reviewed unresolved edge-case manually.",
      readTranscriptEnvelopes: async () => [],
      createError
    });

    expect(metadata).toMatchObject({
      recommendation_at_decision: "inconclusive",
      override_non_approve: true,
      override_reason: "Human reviewed unresolved edge-case manually."
    });
  });
});
