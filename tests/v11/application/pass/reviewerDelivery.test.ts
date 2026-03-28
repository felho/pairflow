import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";
import {
  executePassDelivery,
  type PassDeliveryDependencies
} from "../../../../src/v11/application/pass/reviewerDelivery.js";

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
      reviewer: "claude"
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
  };
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
    const emitTmuxDeliveryNotification: NonNullable<
      PassDeliveryDependencies["emitTmuxDeliveryNotification"]
    > = async (input) => {
      emitCalls.push(input);
      return {
        delivered: true,
        message: "ok"
      };
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
      {
        refreshReviewerContext,
        emitTmuxDeliveryNotification
      }
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
        delivered: true,
        message: "ok"
      },
      retried: false
    });
  });

  it("retries once on unconfirmed delivery during implementer->reviewer handoff", async () => {
    const calls: unknown[] = [];
    const emitTmuxDeliveryNotification: NonNullable<
      PassDeliveryDependencies["emitTmuxDeliveryNotification"]
    > = async (input) => {
      calls.push(input);
      if (calls.length === 1) {
        return {
          delivered: false,
          reason: "delivery_unconfirmed",
          message: "first attempt unconfirmed"
        };
      }
      return {
        delivered: true,
        message: "second attempt confirmed"
      };
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
      {
        emitTmuxDeliveryNotification
      }
    );

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result).toEqual({
      result: {
        delivered: true,
        message: "second attempt confirmed"
      },
      retried: true
    });
  });

  it("does not retry when sender role is reviewer", async () => {
    const calls: unknown[] = [];
    const emitTmuxDeliveryNotification: NonNullable<
      PassDeliveryDependencies["emitTmuxDeliveryNotification"]
    > = async (input) => {
      calls.push(input);
      return {
        delivered: false,
        reason: "delivery_unconfirmed",
        message: "not retried"
      };
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
      {
        emitTmuxDeliveryNotification
      }
    );

    expect(calls).toHaveLength(1);
    expect(result).toEqual({
      result: {
        delivered: false,
        reason: "delivery_unconfirmed",
        message: "not retried"
      },
      retried: false
    });
  });
});
