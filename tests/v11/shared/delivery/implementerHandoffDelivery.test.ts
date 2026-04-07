import { describe, expect, it } from "vitest";

import type { EmitTmuxDeliveryNotificationInput } from "../../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";
import {
  executeImplementerHandoffDelivery,
  shouldRetryImplementerHandoffDelivery
} from "../../../../src/v11/shared/delivery/implementerHandoffDelivery.js";

function createDeliveryInput(): EmitTmuxDeliveryNotificationInput {
  return {
    bubbleId: "b_shared_delivery_01",
    bubbleConfig: {
      id: "b_shared_delivery_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "pf/b_shared_delivery_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "code",
      pairflow_command_profile: "external",
      reviewer_context_mode: "persistent",
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
    },
    sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
    envelope: {
      id: "msg_20260403_100",
      ts: "2026-04-03T12:20:00.000Z",
      bubble_id: "b_shared_delivery_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "handoff"
      },
      refs: []
    },
    messageRef: "artifact://handoff.md"
  };
}

describe("implementerHandoffDelivery", () => {
  it("retries once with reviewer-parity warm-up on delivery_unconfirmed", async () => {
    const calls: EmitTmuxDeliveryNotificationInput[] = [];
    const result = await executeImplementerHandoffDelivery({
      deliveryInput: createDeliveryInput(),
      emitDelivery: async (input) => {
        calls.push(input);
        if (calls.length === 1) {
          return {
            delivered: false,
            message: "unconfirmed",
            reason: "delivery_unconfirmed"
          };
        }
        return {
          delivered: true,
          message: "ok"
        };
      }
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result).toEqual({
      result: {
        delivered: true,
        message: "ok"
      },
      retried: true
    });
  });

  it("normalizes unexpected throw to tmux_send_failed and retries once", async () => {
    const calls: EmitTmuxDeliveryNotificationInput[] = [];
    const result = await executeImplementerHandoffDelivery({
      deliveryInput: createDeliveryInput(),
      emitDelivery: async (input) => {
        calls.push(input);
        if (calls.length === 1) {
          throw new Error("transport exploded");
        }
        return {
          delivered: true,
          message: "retry recovered"
        };
      }
    });

    expect(calls).toHaveLength(2);
    expect(result).toEqual({
      result: {
        delivered: true,
        message: "retry recovered"
      },
      retried: true
    });
  });

  it("keeps the original retryable failure when the retry attempt throws", async () => {
    const calls: EmitTmuxDeliveryNotificationInput[] = [];
    const result = await executeImplementerHandoffDelivery({
      deliveryInput: createDeliveryInput(),
      emitDelivery: async (input) => {
        calls.push(input);
        if (calls.length === 1) {
          return {
            delivered: false,
            message: "first attempt unconfirmed",
            reason: "delivery_unconfirmed"
          };
        }
        throw new Error("retry transport exploded");
      }
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      initialDelayMs: 5000,
      deliveryAttempts: 6
    });
    expect(result).toEqual({
      result: {
        delivered: false,
        message: "first attempt unconfirmed",
        reason: "delivery_unconfirmed"
      },
      retried: true
    });
  });

  it("does not retry successful deliveries", async () => {
    const calls: EmitTmuxDeliveryNotificationInput[] = [];
    const result = await executeImplementerHandoffDelivery({
      deliveryInput: createDeliveryInput(),
      emitDelivery: async (input) => {
        calls.push(input);
        return {
          delivered: true,
          message: "ok"
        };
      }
    });

    expect(calls).toHaveLength(1);
    expect(result.retried).toBe(false);
  });

  it("retries only retryable failure reasons", () => {
    expect(
      shouldRetryImplementerHandoffDelivery({
        delivered: false,
        message: "",
        reason: "delivery_unconfirmed"
      })
    ).toBe(true);
    expect(
      shouldRetryImplementerHandoffDelivery({
        delivered: false,
        message: "",
        reason: "tmux_send_failed"
      })
    ).toBe(true);
    expect(
      shouldRetryImplementerHandoffDelivery({
        delivered: false,
        message: "",
        reason: "registry_read_failed"
      })
    ).toBe(false);
    expect(
      shouldRetryImplementerHandoffDelivery({
        delivered: false,
        message: "",
        reason: "unsupported_recipient"
      })
    ).toBe(false);
    expect(
      shouldRetryImplementerHandoffDelivery({
        delivered: false,
        message: "",
        reason: "no_runtime_session"
      })
    ).toBe(false);
  });
});
