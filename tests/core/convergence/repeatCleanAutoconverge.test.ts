import { describe, expect, it } from "vitest";

import {
  evaluateRepeatCleanAutoconvergeTrigger,
  repeatCleanAutoconvergeTriggeredReasonCode,
  repeatCleanInputIncompleteReasonCode,
  repeatCleanPreviousMissingReasonCode,
  repeatCleanPreviousNotCleanReasonCode,
  repeatCleanRound1DisabledReasonCode,
  repeatCleanTriggerNotMetReasonCode
} from "../../../src/core/convergence/repeatCleanAutoconverge.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";

function createReviewerPass(input: {
  id: string;
  round: number;
  ts: string;
  passIntent?: "task" | "review" | "fix_request";
  findings?: unknown;
}): ProtocolEnvelope {
  const payload: Record<string, unknown> = {
    summary: input.id
  };
  if (input.passIntent !== undefined) {
    payload["pass_intent"] = input.passIntent;
  }
  if ("findings" in input) {
    payload["findings"] = input.findings;
  }

  return {
    id: input.id,
    ts: input.ts,
    bubble_id: "b_repeat_clean_01",
    sender: "claude",
    recipient: "codex",
    type: "PASS",
    round: input.round,
    payload: payload as ProtocolEnvelope["payload"],
    refs: []
  };
}

describe("evaluateRepeatCleanAutoconvergeTrigger", () => {
  it("returns trigger=true when reviewer clean PASS repeats from round 2", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: [
        createReviewerPass({
          id: "msg_001",
          round: 1,
          ts: "2026-03-01T10:00:00.000Z",
          passIntent: "review",
          findings: []
        })
      ]
    });

    expect(result).toEqual({
      trigger: true,
      reasonCode: repeatCleanAutoconvergeTriggeredReasonCode,
      reasonDetail: "previous_reviewer_pass_clean",
      mostRecentPreviousReviewerCleanPassEnvelope: true
    });
  });

  it("returns E5 generic fallback when active role is not reviewer", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "implementer",
      passIntent: "review",
      hasFindings: false,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: []
    });

    expect(result.reasonCode).toBe(repeatCleanTriggerNotMetReasonCode);
    expect(result.reasonDetail).toBe("base_precondition_not_met");
    expect(result.trigger).toBe(false);
  });

  it("returns E5 generic fallback when pass_intent is not review", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "fix_request",
      hasFindings: false,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: []
    });

    expect(result.reasonCode).toBe(repeatCleanTriggerNotMetReasonCode);
    expect(result.reasonDetail).toBe("base_precondition_not_met");
    expect(result.trigger).toBe(false);
  });

  it("returns E5 generic fallback when findings are present", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: true,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: []
    });

    expect(result.reasonCode).toBe(repeatCleanTriggerNotMetReasonCode);
    expect(result.reasonDetail).toBe("base_precondition_not_met");
    expect(result.trigger).toBe(false);
  });

  it("uses E2 precedence over E3 when round=1 and transcript is incomplete", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 1,
      reviewer: "claude",
      implementer: "codex",
      transcript: [
        createReviewerPass({
          id: "msg_incomplete",
          round: 1,
          ts: "2026-03-01T10:00:00.000Z",
          passIntent: "review"
        })
      ]
    });

    expect(result.reasonCode).toBe(repeatCleanRound1DisabledReasonCode);
    expect(result.reasonDetail).toBe("round_gate_disabled");
    expect(result.trigger).toBe(false);
  });

  it("uses E2 precedence over E4 when round=1 and previous clean pass is missing", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 1,
      reviewer: "claude",
      implementer: "codex",
      transcript: []
    });

    expect(result.reasonCode).toBe(repeatCleanRound1DisabledReasonCode);
    expect(result.reasonDetail).toBe("round_gate_disabled");
    expect(result.trigger).toBe(false);
  });

  it("returns E4 when no previous reviewer PASS exists in round>=2", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: []
    });

    expect(result.reasonCode).toBe(repeatCleanPreviousMissingReasonCode);
    expect(result.reasonDetail).toBe("previous_reviewer_pass_absent");
    expect(result.trigger).toBe(false);
  });

  it("returns distinct non-clean reason when most recent previous reviewer PASS exists but is non-clean", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: [
        createReviewerPass({
          id: "msg_prev_non_clean",
          round: 1,
          ts: "2026-03-01T10:00:00.000Z",
          passIntent: "fix_request",
          findings: [{ severity: "P2", title: "Issue" }]
        })
      ]
    });

    expect(result.reasonCode).toBe(repeatCleanPreviousNotCleanReasonCode);
    expect(result.reasonDetail).toBe("previous_reviewer_pass_not_clean");
    expect(result.trigger).toBe(false);
  });

  it("returns E3 when most recent previous reviewer PASS is incomplete", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: [
        createReviewerPass({
          id: "msg_prev_incomplete",
          round: 1,
          ts: "2026-03-01T10:00:00.000Z",
          passIntent: "review"
        })
      ]
    });

    expect(result.reasonCode).toBe(repeatCleanInputIncompleteReasonCode);
    expect(result.reasonDetail).toBe("previous_reviewer_pass_incomplete");
    expect(result.trigger).toBe(false);
  });

  it("selects most recent previous reviewer PASS by append order, not timestamp", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 3,
      reviewer: "claude",
      implementer: "codex",
      transcript: [
        createReviewerPass({
          id: "msg_older_append_but_newer_ts",
          round: 1,
          ts: "2026-03-02T10:00:00.000Z",
          passIntent: "fix_request",
          findings: [{ severity: "P2", title: "Issue" }]
        }),
        createReviewerPass({
          id: "msg_newer_append_but_older_ts",
          round: 2,
          ts: "2026-03-01T10:00:00.000Z",
          passIntent: "review",
          findings: []
        })
      ]
    });

    expect(result).toEqual({
      trigger: true,
      reasonCode: repeatCleanAutoconvergeTriggeredReasonCode,
      reasonDetail: "previous_reviewer_pass_clean",
      mostRecentPreviousReviewerCleanPassEnvelope: true
    });
  });

  it("uses canonical most-recent candidate only: malformed most-recent yields E3", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 3,
      reviewer: "claude",
      implementer: "codex",
      transcript: [
        createReviewerPass({
          id: "msg_clean_but_not_most_recent",
          round: 1,
          ts: "2026-03-01T10:00:00.000Z",
          passIntent: "review",
          findings: []
        }),
        createReviewerPass({
          id: "msg_most_recent_malformed",
          round: 2,
          ts: "2026-03-01T11:00:00.000Z",
          passIntent: "review",
          findings: "not-an-array"
        })
      ]
    });

    expect(result.reasonCode).toBe(repeatCleanInputIncompleteReasonCode);
    expect(result.reasonDetail).toBe("previous_reviewer_pass_incomplete");
    expect(result.trigger).toBe(false);
  });

  it("ignores same-round reviewer PASS entries when selecting previous candidate (retains non-clean previous reason)", () => {
    const result = evaluateRepeatCleanAutoconvergeTrigger({
      activeRole: "reviewer",
      passIntent: "review",
      hasFindings: false,
      round: 2,
      reviewer: "claude",
      implementer: "codex",
      transcript: [
        createReviewerPass({
          id: "msg_prev_non_clean_r1",
          round: 1,
          ts: "2026-03-01T09:00:00.000Z",
          passIntent: "fix_request",
          findings: [{ severity: "P2", title: "Issue" }]
        }),
        createReviewerPass({
          id: "msg_same_round_clean_r2",
          round: 2,
          ts: "2026-03-01T10:00:00.000Z",
          passIntent: "review",
          findings: []
        })
      ]
    });

    expect(result.reasonCode).toBe(repeatCleanPreviousNotCleanReasonCode);
    expect(result.reasonDetail).toBe("previous_reviewer_pass_not_clean");
    expect(result.trigger).toBe(false);
  });
});
