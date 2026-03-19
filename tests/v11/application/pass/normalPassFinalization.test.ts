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
          delivered: true,
          message: "ok"
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
          delivered: true,
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
    expect(capturedResultInput?.mostRecentPreviousReviewerCleanPassEnvelope).toBe(false);
    expect(capturedResultInput?.delivery).toEqual({
      delivered: true,
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
    expect(capturedResultInput?.delivery).toBeUndefined();
  });
});
