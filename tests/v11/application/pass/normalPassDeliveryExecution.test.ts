import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../../../../src/core/reviewer/testEvidence.js";
import { executeNormalPassDelivery } from "../../../../src/v11/application/pass/normalPassDeliveryExecution.js";

describe("executeNormalPassDelivery", () => {
  it("resolves reviewer directive and forwards it into delivery execution", async () => {
    const directive: ReviewerTestExecutionDirective = {
      skip_full_rerun: true,
      reason_code: "evidence_missing",
      reason_detail: "no artifact",
      verification_status: "missing"
    };
    const envelope = { id: "env_1" } as unknown as ProtocolEnvelope;
    const bubbleConfig = {} as BubbleConfig;
    let capturedDeliveryInput:
      | Parameters<Parameters<typeof executeNormalPassDelivery>[1]["executePassDelivery"]>[0]
      | undefined;
    let capturedDeliveryDependencies:
      | Parameters<Parameters<typeof executeNormalPassDelivery>[1]["executePassDelivery"]>[1]
      | undefined;

    const result = await executeNormalPassDelivery(
      {
        senderRole: "implementer",
        bubbleId: "b_123",
        bubbleConfig,
        envelope,
        worktreePath: "/tmp/wt",
        repoPath: "/tmp/repo",
        artifactsDir: "/tmp/artifacts",
        sessionsPath: "/tmp/sessions.json",
        reviewerBriefArtifactPath: "/tmp/reviewer-brief.md",
        reviewerFocusArtifactPath: "/tmp/reviewer-focus.json",
        recipientRole: "reviewer",
        now: new Date("2026-03-19T12:00:00.000Z")
      },
      {
        resolveReviewerTestDirectiveForPass: async () => directive,
        executePassDelivery: async (input, deps) => {
          capturedDeliveryInput = input;
          capturedDeliveryDependencies = deps;
          return {
            result: {
              delivered: true,
              message: "delivered"
            },
            retried: false
          };
        },
        emitTmuxDeliveryNotification: async () => ({
          delivered: false,
          message: "noop"
        }),
        refreshReviewerContext: async () => ({
          refreshed: false,
          reason: "no_runtime_session"
        })
      }
    );

    expect(capturedDeliveryInput?.reviewerTestDirective).toEqual(directive);
    expect(typeof capturedDeliveryDependencies?.emitTmuxDeliveryNotification).toBe("function");
    expect(typeof capturedDeliveryDependencies?.refreshReviewerContext).toBe("function");
    expect(result.reviewerTestDirective).toEqual(directive);
    expect(result.deliveryResult).toEqual({
      delivered: true,
      message: "delivered"
    });
    expect(result.deliveryRetried).toBe(false);
  });

  it("omits reviewer directive from delivery input when resolver returns undefined", async () => {
    const envelope = { id: "env_2" } as unknown as ProtocolEnvelope;
    const bubbleConfig = {} as BubbleConfig;
    let capturedDeliveryInput:
      | Parameters<Parameters<typeof executeNormalPassDelivery>[1]["executePassDelivery"]>[0]
      | undefined;

    const result = await executeNormalPassDelivery(
      {
        senderRole: "reviewer",
        bubbleId: "b_123",
        bubbleConfig,
        envelope,
        worktreePath: "/tmp/wt",
        repoPath: "/tmp/repo",
        artifactsDir: "/tmp/artifacts",
        sessionsPath: "/tmp/sessions.json",
        reviewerBriefArtifactPath: "/tmp/reviewer-brief.md",
        reviewerFocusArtifactPath: "/tmp/reviewer-focus.json",
        recipientRole: "implementer",
        now: new Date("2026-03-19T12:00:00.000Z")
      },
      {
        resolveReviewerTestDirectiveForPass: async () => undefined,
        executePassDelivery: async (input) => {
          capturedDeliveryInput = input;
          return {
            result: {
              delivered: false,
              reason: "delivery_unconfirmed",
              message: "failed"
            },
            retried: true
          };
        }
      }
    );

    expect(capturedDeliveryInput).toBeDefined();
    expect("reviewerTestDirective" in (capturedDeliveryInput as object)).toBe(false);
    expect(result.reviewerTestDirective).toBeUndefined();
    expect(result.deliveryResult).toEqual({
      delivered: false,
      reason: "delivery_unconfirmed",
      message: "failed"
    });
    expect(result.deliveryRetried).toBe(true);
  });
});
