import { describe, expect, it } from "vitest";

import { buildAutoConvergePassResult, buildNormalPassResult } from "../../../../src/v11/application/pass/passResultBuilder.js";

function buildEnvelope(id: string) {
  return {
    id,
    ts: "2026-03-19T12:00:00.000Z",
    bubble_id: "b_123",
    sender: "claude" as const,
    recipient: "codex" as const,
    type: "PASS" as const,
    round: 2,
    payload: {
      summary: "handoff"
    },
    refs: []
  };
}

function buildState() {
  return {
    bubble_id: "b_123",
    state: "RUNNING" as const,
    round: 2,
    active_agent: "codex" as const,
    active_since: "2026-03-19T12:00:00.000Z",
    active_role: "implementer" as const,
    round_role_history: [],
    last_command_at: "2026-03-19T12:00:00.000Z"
  };
}

describe("passResultBuilder", () => {
  it("builds auto-converge result with canonical trigger metadata", () => {
    const result = buildAutoConvergePassResult({
      bubbleId: "b_123",
      inferredIntent: true,
      repeatCleanReasonDetail: "previous_reviewer_pass_clean",
      convergenceSequence: 42,
      convergenceEnvelope: buildEnvelope("msg_conv"),
      state: buildState(),
      gateRoute: "human_gate_approve",
      approvalRequestSequence: 43,
      approvalRequestEnvelope: buildEnvelope("msg_approval"),
      delivery: {
        delivered: true,
        retried: false
      },
      docGateArtifactWriteFailureReason: "EACCES"
    });

    expect(result).toMatchObject({
      bubbleId: "b_123",
      sequence: 42,
      resultEnvelopeKind: "convergence",
      transitionDecision: "auto_converge",
      repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
      repeatCleanReasonDetail: "previous_reviewer_pass_clean",
      repeatCleanTrigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: true,
      delivery: {
        delivered: true,
        retried: false
      },
      docGateArtifactWriteFailureReason: "EACCES",
      autoConverged: {
        gateRoute: "human_gate_approve",
        convergenceSequence: 42,
        approvalRequestSequence: 43
      }
    });
  });

  it("builds normal pass result and preserves optional omission semantics", () => {
    const result = buildNormalPassResult({
      bubbleId: "b_123",
      sequence: 7,
      envelope: buildEnvelope("msg_pass"),
      state: buildState(),
      inferredIntent: false,
      repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      repeatCleanReasonDetail: "base_precondition_not_met",
      repeatCleanTrigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false,
      passValidationCompatibilityArtifactWriteFailureReason: "compat_write_failed"
    });

    expect(result).toMatchObject({
      bubbleId: "b_123",
      sequence: 7,
      resultEnvelopeKind: "pass",
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      repeatCleanReasonDetail: "base_precondition_not_met",
      repeatCleanTrigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false,
      passValidationCompatibilityArtifactWriteFailureReason: "compat_write_failed"
    });
    expect("delivery" in result).toBe(false);
    expect("docGateArtifactWriteFailureReason" in result).toBe(false);
  });
});
