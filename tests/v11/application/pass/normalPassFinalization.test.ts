import { describe, expect, it } from "vitest";

import { finalizeNormalPass } from "../../../../src/v11/application/pass/normalPassFinalization.js";

describe("finalizeNormalPass", () => {
  it("emits lifecycle metric and builds result with fallback repeat-clean metadata", async () => {
    let emitted = false;
    let capturedMetricInput: Record<string, unknown> | undefined;
    let capturedResultInput: Record<string, unknown> | undefined;

    const result = await finalizeNormalPass(
      {
        now: new Date("2026-03-19T12:00:00.000Z"),
        repoPath: "/tmp/repo",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        round: 2,
        actorRole: "reviewer",
        passIntent: "review",
        inferredIntent: true,
        activation: {
          handoff_id: "reviewer:b_123:round:2:attempt:1",
          execution_id: "exec_b_123_round2",
          expected_role: "reviewer",
          expected_round: 2,
          expected_state_fingerprint: "fp_123"
        },
        sender: "claude",
        recipient: "codex",
        recipientRole: "implementer",
        refsCount: 1,
        hasFindings: false,
        noFindings: true,
        repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
        repeatCleanReasonDetail: "base_precondition_not_met",
        repeatCleanTrigger: false,
        fallbackMostRecentPreviousReviewerCleanPassEnvelope: false,
        passValidationCompatibilityArtifactWriteFailureReason: "compat_write_failed",
        findings: [],
        sequence: 5,
        envelope: {
          id: "env_1",
          payload: {}
        } as never,
        state: {
          state: "RUNNING"
        } as never,
        deliveryResult: {
          status: "accepted",
          message: "ok",
          sessionName: "pf_bubble",
          targetPaneIndex: 1
        },
        deliveryRetried: false
      },
      {
        emitBubbleLifecycleEventBestEffort: async () => {
          emitted = true;
        },
        buildPassLifecycleMetricMetadata: (input) => {
          capturedMetricInput = input as unknown as Record<string, unknown>;
          return { metric: "ok" };
        },
        resolveMostRecentPreviousReviewerPassIsCleanFromMetadata: () => undefined,
        mapPassResultDelivery: () => ({
          status: "accepted",
          retried: false
        }),
        buildNormalPassResult: (input) => {
          capturedResultInput = input as unknown as Record<string, unknown>;
          return { ok: true, ...input };
        }
      }
    );

    expect(emitted).toBe(true);
    expect(capturedMetricInput?.transitionDecision).toBe("normal_pass");
    expect(capturedMetricInput?.passValidationCompatibilityArtifactWriteFailureReason).toBe(
      "compat_write_failed"
    );
    expect(capturedResultInput?.mostRecentPreviousReviewerCleanPassEnvelope).toBe(false);
    expect(capturedResultInput?.activation).toEqual({
      handoff_id: "reviewer:b_123:round:2:attempt:1",
      execution_id: "exec_b_123_round2",
      expected_role: "reviewer",
      expected_round: 2,
      expected_state_fingerprint: "fp_123"
    });
    expect(capturedResultInput?.passValidationCompatibilityArtifactWriteFailureReason).toBe(
      "compat_write_failed"
    );
    expect(capturedResultInput?.delivery).toEqual({
      status: "accepted",
      retried: false
    });
    expect((result as { ok: boolean }).ok).toBe(true);
  });

  it("prefers metadata-derived previous-clean flag and handles absent delivery", async () => {
    let capturedResultInput: Record<string, unknown> | undefined;

    await finalizeNormalPass(
      {
        now: new Date("2026-03-19T12:00:00.000Z"),
        repoPath: "/tmp/repo",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        round: 2,
        actorRole: "implementer",
        passIntent: "review",
        inferredIntent: false,
        activation: {
          handoff_id: "implementer:b_123:round:2:attempt:1",
          execution_id: "exec_b_123_round2_impl",
          expected_role: "implementer",
          expected_round: 2,
          expected_state_fingerprint: "fp_456"
        },
        sender: "codex",
        recipient: "claude",
        recipientRole: "reviewer",
        refsCount: 0,
        hasFindings: false,
        noFindings: false,
        repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
        repeatCleanReasonDetail: "base_precondition_not_met",
        repeatCleanTrigger: false,
        fallbackMostRecentPreviousReviewerCleanPassEnvelope: false,
        findings: [],
        sequence: 6,
        envelope: {
          id: "env_2",
          payload: {
            metadata: {
              most_recent_previous_reviewer_pass_is_clean: true
            }
          }
        } as never,
        state: {
          state: "RUNNING"
        } as never,
        deliveryResult: undefined,
        deliveryRetried: false
      },
      {
        emitBubbleLifecycleEventBestEffort: async () => undefined,
        buildPassLifecycleMetricMetadata: () => ({ metric: "ok" }),
        resolveMostRecentPreviousReviewerPassIsCleanFromMetadata: () => true,
        mapPassResultDelivery: (input) => {
          expect(input.deliveryResult).toBeUndefined();
          return undefined;
        },
        buildNormalPassResult: (input) => {
          capturedResultInput = input as unknown as Record<string, unknown>;
          return input;
        }
      }
    );

    expect(capturedResultInput?.mostRecentPreviousReviewerCleanPassEnvelope).toBe(true);
    expect(capturedResultInput?.activation).toEqual({
      handoff_id: "implementer:b_123:round:2:attempt:1",
      execution_id: "exec_b_123_round2_impl",
      expected_role: "implementer",
      expected_round: 2,
      expected_state_fingerprint: "fp_456"
    });
    expect(capturedResultInput?.delivery).toBeUndefined();
  });

  it("omits activation from the result-builder input when finalization receives no provenance", async () => {
    let capturedResultInput: Record<string, unknown> | undefined;

    await finalizeNormalPass(
      {
        now: new Date("2026-03-19T12:00:00.000Z"),
        repoPath: "/tmp/repo",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        round: 2,
        actorRole: "implementer",
        passIntent: "review",
        inferredIntent: true,
        sender: "codex",
        recipient: "claude",
        recipientRole: "reviewer",
        refsCount: 0,
        hasFindings: false,
        noFindings: false,
        repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
        repeatCleanReasonDetail: "base_precondition_not_met",
        repeatCleanTrigger: false,
        fallbackMostRecentPreviousReviewerCleanPassEnvelope: false,
        findings: [],
        sequence: 7,
        envelope: {
          id: "env_3",
          payload: {}
        } as never,
        state: {
          state: "RUNNING"
        } as never,
        deliveryResult: undefined,
        deliveryRetried: false
      },
      {
        emitBubbleLifecycleEventBestEffort: async () => undefined,
        buildPassLifecycleMetricMetadata: () => ({ metric: "ok" }),
        resolveMostRecentPreviousReviewerPassIsCleanFromMetadata: () => undefined,
        mapPassResultDelivery: () => undefined,
        buildNormalPassResult: (input) => {
          capturedResultInput = input as unknown as Record<string, unknown>;
          return input;
        }
      }
    );

    expect("activation" in (capturedResultInput ?? {})).toBe(false);
  });
});
