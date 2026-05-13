import { describe, expect, it } from "vitest";

import { deliveryTargetRoleMetadataKey } from "../../../../src/v11/shared/delivery/deliveryTargetMetadataContract.js";
import { buildHumanReplyEnvelopeDraft } from "../../../../src/v11/domain/reply/replyEnvelopeDraft.js";

describe("buildHumanReplyEnvelopeDraft", () => {
  it("builds HUMAN_REPLY envelope draft with delivery target metadata", () => {
    const draft = buildHumanReplyEnvelopeDraft({
      bubbleId: "b_reply_01",
      recipient: "codex",
      recipientRole: "implementer",
      round: 2,
      message: "Proceed with fallback path.",
      refs: ["docs/spec.md#L10"]
    });

    expect(draft).toEqual({
      bubble_id: "b_reply_01",
      sender: "human",
      recipient: "codex",
      type: "HUMAN_REPLY",
      round: 2,
      payload: {
        message: "Proceed with fallback path.",
        metadata: {
          [deliveryTargetRoleMetadataKey]: "implementer"
        }
      },
      refs: ["docs/spec.md#L10"]
    });
  });

  it("supports reviewer and meta-reviewer delivery roles", () => {
    const reviewerDraft = buildHumanReplyEnvelopeDraft({
      bubbleId: "b_reply_02",
      recipient: "claude",
      recipientRole: "reviewer",
      round: 1,
      message: "Please verify finding severity.",
      refs: []
    });
    const metaReviewerDraft = buildHumanReplyEnvelopeDraft({
      bubbleId: "b_reply_03",
      recipient: "codex",
      recipientRole: "meta_reviewer",
      round: 3,
      message: "Re-evaluate the gate decision.",
      refs: []
    });

    expect(reviewerDraft.payload.metadata?.[deliveryTargetRoleMetadataKey]).toBe("reviewer");
    expect(metaReviewerDraft.payload.metadata?.[deliveryTargetRoleMetadataKey]).toBe(
      "meta_reviewer"
    );
  });
});
