import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../../../../src/v11/shared/reviewer/testEvidence.js";
import { executeNormalPassDelivery } from "../../../../src/v11/application/pass/normalPassDeliveryExecution.js";

describe("executeNormalPassDelivery", () => {
  it("forwards pre-resolved reviewer directive into delivery execution", async () => {
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
        now: new Date("2026-03-19T12:00:00.000Z"),
        reviewerTestDirective: directive
      },
      {
        resolveReviewerTestDirectiveForPass: async () => {
          throw new Error("should not resolve fallback directive");
        },
        executePassDelivery: async (input, deps) => {
          capturedDeliveryInput = input;
          capturedDeliveryDependencies = deps;
          return {
            result: {
              status: "accepted" as const,
              message: "delivered",
              sessionName: "pf_bubble",
              targetPaneIndex: 2
            },
            retried: false
          };
        },
        emitDeliveryNotificationAck: async () => ({
          status: "rejected" as const,
          message: "noop",
          reason: "command_failed" as const,
          reason_code: "DELIVERY_ACK_REJECTED" as const
        }),
        refreshReviewerContext: async () => ({
          refreshed: false,
          reason: "no_runtime_session"
        })
      }
    );

    expect(capturedDeliveryInput?.reviewerTestDirective).toEqual(directive);
    expect(typeof capturedDeliveryDependencies?.emitDeliveryNotificationAck).toBe("function");
    expect(typeof capturedDeliveryDependencies?.refreshReviewerContext).toBe("function");
    expect(result.reviewerTestDirective).toEqual(directive);
    expect(result.deliveryResult).toEqual({
      status: "accepted",
      message: "delivered",
      sessionName: "pf_bubble",
      targetPaneIndex: 2
    });
    expect(result.deliveryRetried).toBe(false);
  });

  it("falls back to directive resolution when no pre-resolved directive is provided", async () => {
    const directive: ReviewerTestExecutionDirective = {
      skip_full_rerun: false,
      reason_code: "evidence_missing",
      reason_detail: "run checks",
      verification_status: "missing"
    };
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
        resolveReviewerTestDirectiveForPass: async () => directive,
        executePassDelivery: async (input) => {
          capturedDeliveryInput = input;
          return {
            result: {
              status: "rejected" as const,
              reason: "delivery_unconfirmed",
              reason_code: "DELIVERY_ACK_REJECTED" as const,
              message: "failed"
            },
            retried: true
          };
        }
      }
    );

    expect(capturedDeliveryInput).toBeDefined();
    expect(capturedDeliveryInput?.reviewerTestDirective).toEqual(directive);
    expect(result.reviewerTestDirective).toEqual(directive);
    expect(result.deliveryResult).toEqual({
      status: "rejected",
      reason: "delivery_unconfirmed",
      reason_code: "DELIVERY_ACK_REJECTED",
      message: "failed"
    });
    expect(result.deliveryRetried).toBe(true);
  });

  it("prefers the canonical delivery override when wiring pass delivery dependencies", async () => {
    let capturedDeliveryDependencies:
      | Parameters<Parameters<typeof executeNormalPassDelivery>[1]["executePassDelivery"]>[1]
      | undefined;

    const emitDeliveryNotificationAck = (() => undefined) as never;

    await executeNormalPassDelivery(
      {
        senderRole: "reviewer",
        bubbleId: "b_456",
        bubbleConfig: {} as BubbleConfig,
        envelope: { id: "env_3" } as unknown as ProtocolEnvelope,
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
        executePassDelivery: async (_input, deps) => {
          capturedDeliveryDependencies = deps;
          return {
            result: undefined,
            retried: false
          };
        },
        emitDeliveryNotificationAck
      }
    );

    expect(capturedDeliveryDependencies?.emitDeliveryNotificationAck).toBe(
      emitDeliveryNotificationAck
    );
  });

  it("forwards meta-reviewer recipient routing without forcing reviewer fallback semantics", async () => {
    let capturedDeliveryInput:
      | Parameters<Parameters<typeof executeNormalPassDelivery>[1]["executePassDelivery"]>[0]
      | undefined;

    await executeNormalPassDelivery(
      {
        senderRole: "implementer",
        bubbleId: "b_meta_review_delivery",
        bubbleConfig: {} as BubbleConfig,
        envelope: { id: "env_meta" } as unknown as ProtocolEnvelope,
        worktreePath: "/tmp/wt",
        repoPath: "/tmp/repo",
        artifactsDir: "/tmp/artifacts",
        sessionsPath: "/tmp/sessions.json",
        reviewerBriefArtifactPath: "/tmp/reviewer-brief.md",
        reviewerFocusArtifactPath: "/tmp/reviewer-focus.json",
        recipientRole: "meta_reviewer",
        now: new Date("2026-03-19T12:00:00.000Z")
      },
      {
        resolveReviewerTestDirectiveForPass: async () => undefined,
        executePassDelivery: async (input) => {
          capturedDeliveryInput = input;
          return {
            result: undefined,
            retried: false
          };
        }
      }
    );

    expect(capturedDeliveryInput?.recipientRole).toBe("meta_reviewer");
  });

  it("keeps pass-path delivery bound to explicit recipientRole instead of envelope metadata", async () => {
    let capturedDeliveryInput:
      | Parameters<Parameters<typeof executeNormalPassDelivery>[1]["executePassDelivery"]>[0]
      | undefined;

    await executeNormalPassDelivery(
      {
        senderRole: "implementer",
        bubbleId: "b_meta_review_delivery_metadata_guard",
        bubbleConfig: {} as BubbleConfig,
        envelope: {
          id: "env_meta_guard",
          payload: {
            summary: "handoff",
            metadata: {
              delivery_target_role: "meta_reviewer"
            }
          }
        } as unknown as ProtocolEnvelope,
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
        resolveReviewerTestDirectiveForPass: async () => undefined,
        executePassDelivery: async (input) => {
          capturedDeliveryInput = input;
          return {
            result: undefined,
            retried: false
          };
        }
      }
    );

    expect(capturedDeliveryInput?.recipientRole).toBe("reviewer");
  });
});
