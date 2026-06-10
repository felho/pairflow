import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/v11/shared/config/bubbleConfigTypes.js";
import type { ProtocolEnvelope } from "../../../../src/v11/shared/protocol/protocolEnvelopeContract.js";
import {
  executePassDelivery,
  type PassDeliveryDependencies
} from "../../../../src/v11/application/pass/internal/reviewerDelivery/reviewerDelivery.js";
import {
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "../../../../src/v11/infrastructure/artifact/reviewer/reviewerBriefArtifacts.js";
import {
  resolveDeliveryMessageRef
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";

function createBubbleConfig(
  reviewerContextMode: BubbleConfig["reviewer_context_mode"] = "persistent"
): BubbleConfig {
  return {
    id: "b_delivery_v11_01",
    repo_path: "/tmp/repo",
    base_branch: "main",
    bubble_branch: "pf/b_delivery_v11_01",
    work_mode: "worktree",
    quality_mode: "strict",
    review_artifact_type: "code",
    pairflow_command_profile: "external",
    reviewer_context_mode: reviewerContextMode,
    watchdog_timeout_minutes: 5,
    max_rounds: 8,
    severity_gate_round: 4,
    commit_requires_approval: true,
    attach_launcher: "auto",
    agents: {
      implementer: "codex",
      reviewer: "claude",
      meta_reviewer: "codex"
    },
    commands: {
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    },
    notifications: {
      enabled: true
    },
    doc_contract_gates: {
      round_gate_applies_after: 2
    }
  };
}

function createEnvelope(overrides: Partial<ProtocolEnvelope> = {}): ProtocolEnvelope {
  return {
    id: "msg_20260319_001",
    ts: "2026-03-19T12:00:00.000Z",
    bubble_id: "b_delivery_v11_01",
    sender: "codex",
    recipient: "claude",
    type: "PASS",
    round: 1,
    payload: {
      summary: "handoff"
    },
    refs: [],
    ...overrides
  } as ProtocolEnvelope;
}

describe("executePassDelivery", () => {
  it("refreshes reviewer context and applies short warm-up delay on implementer handoff", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-reviewer-delivery-"));
    const briefPath = join(tempDir, "reviewer-brief.md");
    const focusPath = join(tempDir, "reviewer-focus.json");
    await writeFile(briefPath, "Verify claims against evidence.\n", "utf8");
    await writeFile(
      focusPath,
      JSON.stringify({
        status: "present",
        source: "section",
        focus_text: "Prioritize boundary and transition gates."
      }),
      "utf8"
    );

    const refreshCalls: unknown[] = [];
    const emitCalls: unknown[] = [];
    const refreshReviewerContext: NonNullable<
      PassDeliveryDependencies["refreshReviewerContext"]
    > = async (input) => {
      refreshCalls.push(input);
      return {
        refreshed: true
      };
    };
    const emitDeliveryNotificationAck: NonNullable<
      PassDeliveryDependencies["emitDeliveryNotificationAck"]
    > = async (input) => {
      emitCalls.push(input);
      return {
        status: "accepted",
        message: "ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      };
    };
    const reviewerDeliveryDependencies: PassDeliveryDependencies = {
      refreshReviewerContext,
      emitDeliveryNotificationAck,
      readReviewerBriefArtifact,
      readReviewerFocusArtifact,
      resolveDeliveryMessageRef
    };

    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("fresh"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: briefPath,
        reviewerFocusArtifactPath: focusPath,
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "reviewer"
      },
      reviewerDeliveryDependencies
    );

    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0]).toMatchObject({
      bubbleId: "b_delivery_v11_01"
    });
    expect(refreshCalls[0]).toHaveProperty("reviewerStartupPrompt");
    expect(String((refreshCalls[0] as { reviewerStartupPrompt?: unknown }).reviewerStartupPrompt))
      .toContain("Verify claims against evidence.");
    expect(String((refreshCalls[0] as { reviewerStartupPrompt?: unknown }).reviewerStartupPrompt))
      .toContain("Prioritize boundary and transition gates.");

    expect(emitCalls).toHaveLength(1);
    expect(emitCalls[0]).toMatchObject({
      initialDelayMs: 1500,
      reviewerBrief: "Verify claims against evidence.",
      reviewerFocus: {
        status: "present",
        source: "section",
        focus_text: "Prioritize boundary and transition gates."
      }
    });
    expect(result).toEqual({
      result: {
        status: "accepted",
        message: "ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      },
      retried: false
    });
  });

  it("omits reviewer focus from delivery when the artifact is absent", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-reviewer-delivery-"));
    const focusPath = join(tempDir, "reviewer-focus.json");
    await writeFile(
      focusPath,
      JSON.stringify({
        status: "absent",
        source: "none",
        reason_code: "REVIEWER_FOCUS_ABSENT"
      }),
      "utf8"
    );

    const emitCalls: unknown[] = [];
    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("persistent"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/missing-brief.md",
        reviewerFocusArtifactPath: focusPath,
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "reviewer"
      },
      {
        emitDeliveryNotificationAck: async (input) => {
          emitCalls.push(input);
          return {
            status: "accepted",
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          };
        },
        readReviewerBriefArtifact,
        readReviewerFocusArtifact,
        resolveDeliveryMessageRef
      }
    );

    expect(emitCalls).toHaveLength(1);
    expect(emitCalls[0]).not.toHaveProperty("reviewerFocus");
    expect(result.retried).toBe(false);
  });

  it("omits invalid reviewer focus from refreshed reviewer startup prompt", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-reviewer-delivery-"));
    const briefPath = join(tempDir, "reviewer-brief.md");
    const focusPath = join(tempDir, "reviewer-focus.json");
    await writeFile(briefPath, "Brief should still appear.\n", "utf8");
    await writeFile(
      focusPath,
      JSON.stringify({
        status: "present",
        source: "none",
        focus_text: "invalid payload"
      }),
      "utf8"
    );

    const refreshCalls: unknown[] = [];
    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("fresh"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: briefPath,
        reviewerFocusArtifactPath: focusPath,
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "reviewer"
      },
      {
        refreshReviewerContext: async (input) => {
          refreshCalls.push(input);
          return {
            refreshed: true
          };
        },
        emitDeliveryNotificationAck: async () => ({
          status: "accepted",
          message: "ok",
          sessionName: "pf_bubble",
          targetPaneIndex: 1
        }),
        readReviewerBriefArtifact,
        readReviewerFocusArtifact,
        resolveDeliveryMessageRef
      }
    );

    expect(refreshCalls).toHaveLength(1);
    expect(String((refreshCalls[0] as { reviewerStartupPrompt?: unknown }).reviewerStartupPrompt))
      .toContain("Brief should still appear.");
    expect(String((refreshCalls[0] as { reviewerStartupPrompt?: unknown }).reviewerStartupPrompt))
      .not.toContain("Reviewer Focus (bridged from task artifact `reviewer-focus.json`):");
    expect(result.retried).toBe(false);
  });

  it("keeps delivery fail-open when optional reviewer artifacts cannot be read", async () => {
    const refreshCalls: unknown[] = [];
    const emitCalls: unknown[] = [];

    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("fresh"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/unreadable-brief.md",
        reviewerFocusArtifactPath: "/tmp/unreadable-focus.json",
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "reviewer"
      },
      {
        refreshReviewerContext: async (input) => {
          refreshCalls.push(input);
          return {
            refreshed: true
          };
        },
        emitDeliveryNotificationAck: async (input) => {
          emitCalls.push(input);
          return {
            status: "accepted",
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          };
        },
        readReviewerBriefArtifact: async () => {
          throw new Error("brief unreadable");
        },
        readReviewerFocusArtifact: async () => {
          throw new Error("focus unreadable");
        },
        resolveDeliveryMessageRef
      }
    );

    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0]).not.toHaveProperty("reviewerStartupPrompt");
    expect(emitCalls).toHaveLength(1);
    expect(emitCalls[0]).not.toHaveProperty("reviewerBrief");
    expect(emitCalls[0]).not.toHaveProperty("reviewerFocus");
    expect(result).toEqual({
      result: {
        status: "accepted",
        message: "ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      },
      retried: false
    });
  });

  it("omits reviewer focus from reviewer-origin delivery", async () => {
    const emitCalls: unknown[] = [];
    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("persistent"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/unused-brief.md",
        reviewerFocusArtifactPath: "/tmp/unused-focus.json",
        envelope: createEnvelope({
          sender: "claude",
          recipient: "codex"
        }),
        senderRole: "reviewer",
        recipientRole: "implementer"
      },
      {
        emitDeliveryNotificationAck: async (input) => {
          emitCalls.push(input);
          return {
            status: "accepted",
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          };
        },
        readReviewerBriefArtifact,
        readReviewerFocusArtifact,
        resolveDeliveryMessageRef
      }
    );

    expect(emitCalls).toHaveLength(1);
    expect(emitCalls[0]).not.toHaveProperty("reviewerFocus");
    expect(result.retried).toBe(false);
  });

  it("retries once on unconfirmed delivery during implementer->reviewer handoff", async () => {
    const calls: unknown[] = [];
    const emitDeliveryNotificationAck: NonNullable<
      PassDeliveryDependencies["emitDeliveryNotificationAck"]
    > = async (input) => {
      calls.push(input);
      if (calls.length === 1) {
        return {
          status: "rejected",
          reason: "delivery_unconfirmed",
          reason_code: "DELIVERY_ACK_REJECTED",
          message: "first attempt unconfirmed"
        };
      }
      return {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      };
    };
    const reviewerDeliveryDependencies: PassDeliveryDependencies = {
      emitDeliveryNotificationAck,
      readReviewerBriefArtifact,
      readReviewerFocusArtifact,
      resolveDeliveryMessageRef
    };

    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("persistent"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/missing-brief.md",
        reviewerFocusArtifactPath: "/tmp/missing-focus.json",
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "reviewer"
      },
      reviewerDeliveryDependencies
    );

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result).toEqual({
      result: {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      },
      retried: true
    });
  });

  it("retries once on no_runtime_session during implementer->reviewer handoff", async () => {
    const calls: unknown[] = [];
    const emitDeliveryNotificationAck: NonNullable<
      PassDeliveryDependencies["emitDeliveryNotificationAck"]
    > = async (input) => {
      calls.push(input);
      if (calls.length === 1) {
        return {
          status: "rejected",
          reason: "no_runtime_session",
          reason_code: "DELIVERY_ACK_REJECTED",
          message: "reviewer runtime session not registered yet"
        };
      }
      return {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 2
      };
    };
    const reviewerDeliveryDependencies: PassDeliveryDependencies = {
      emitDeliveryNotificationAck,
      readReviewerBriefArtifact,
      readReviewerFocusArtifact,
      resolveDeliveryMessageRef
    };

    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("persistent"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/missing-brief.md",
        reviewerFocusArtifactPath: "/tmp/missing-focus.json",
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "reviewer"
      },
      reviewerDeliveryDependencies
    );

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result).toEqual({
      result: {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 2
      },
      retried: true
    });
  });

  it("retries once on unconfirmed delivery during reviewer->implementer handoff", async () => {
    const calls: unknown[] = [];
    const refreshCalls: unknown[] = [];
    const emitDeliveryNotificationAck: NonNullable<
      PassDeliveryDependencies["emitDeliveryNotificationAck"]
    > = async (input) => {
      calls.push(input);
      if (calls.length === 1) {
        return {
          status: "rejected",
          reason: "delivery_unconfirmed",
          reason_code: "DELIVERY_ACK_REJECTED",
          message: "first attempt unconfirmed"
        };
      }
      return {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      };
    };
    const refreshReviewerContext: NonNullable<
      PassDeliveryDependencies["refreshReviewerContext"]
    > = async (input) => {
      refreshCalls.push(input);
      return {
        refreshed: true
      };
    };
    const reviewerDeliveryDependencies: PassDeliveryDependencies = {
      emitDeliveryNotificationAck,
      refreshReviewerContext,
      readReviewerBriefArtifact,
      readReviewerFocusArtifact,
      resolveDeliveryMessageRef
    };

    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("persistent"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/missing-brief.md",
        reviewerFocusArtifactPath: "/tmp/missing-focus.json",
        envelope: createEnvelope(),
        senderRole: "reviewer",
        recipientRole: "implementer"
      },
      reviewerDeliveryDependencies
    );

    expect(refreshCalls).toHaveLength(0);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result).toEqual({
      result: {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      },
      retried: true
    });
  });

  it("routes implementer -> meta-reviewer handoff through direct delivery without reviewer refresh", async () => {
    const refreshCalls: unknown[] = [];
    const emitCalls: unknown[] = [];
    const emitDeliveryNotificationAck: NonNullable<
      PassDeliveryDependencies["emitDeliveryNotificationAck"]
    > = async (input) => {
      emitCalls.push(input);
      return {
        status: "accepted",
        message: "meta-review delivery confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 3
      };
    };
    const refreshReviewerContext: NonNullable<
      PassDeliveryDependencies["refreshReviewerContext"]
    > = async (input) => {
      refreshCalls.push(input);
      return {
        refreshed: true
      };
    };

    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("fresh"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/unused-brief.md",
        reviewerFocusArtifactPath: "/tmp/unused-focus.json",
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "meta_reviewer"
      },
      {
        emitDeliveryNotificationAck,
        refreshReviewerContext,
        readReviewerBriefArtifact,
        readReviewerFocusArtifact,
        resolveDeliveryMessageRef
      }
    );

    expect(refreshCalls).toHaveLength(0);
    expect(emitCalls).toHaveLength(1);
    expect(result).toEqual({
      result: {
        status: "accepted",
        message: "meta-review delivery confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 3
      },
      retried: false
    });
  });

  it("retries once on unconfirmed delivery during implementer->meta-reviewer handoff", async () => {
    const calls: unknown[] = [];
    const emitDeliveryNotificationAck: NonNullable<
      PassDeliveryDependencies["emitDeliveryNotificationAck"]
    > = async (input) => {
      calls.push(input);
      if (calls.length === 1) {
        return {
          status: "rejected",
          reason: "delivery_unconfirmed",
          reason_code: "DELIVERY_ACK_REJECTED",
          message: "first attempt unconfirmed"
        };
      }
      return {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 3
      };
    };

    const result = await executePassDelivery(
      {
        bubbleId: "b_delivery_v11_01",
        bubbleConfig: createBubbleConfig("persistent"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        reviewerBriefArtifactPath: "/tmp/unused-brief.md",
        reviewerFocusArtifactPath: "/tmp/unused-focus.json",
        envelope: createEnvelope(),
        senderRole: "implementer",
        recipientRole: "meta_reviewer"
      },
      {
        emitDeliveryNotificationAck,
        readReviewerBriefArtifact,
        readReviewerFocusArtifact,
        resolveDeliveryMessageRef
      }
    );

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      recipientRole: "meta_reviewer",
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result).toEqual({
      result: {
        status: "accepted",
        message: "second attempt confirmed",
        sessionName: "pf_bubble",
        targetPaneIndex: 3
      },
      retried: true
    });
  });
});
