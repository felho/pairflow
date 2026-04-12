import { describe, expect, it, vi } from "vitest";

import { applyStateTransition } from "../../../../src/v11/domain/state/machine.js";
import { deliveryTargetRoleMetadataKey } from "../../../../src/types/protocol.js";
import { runApprovalDecisionFlow } from "../../../../src/v11/application/approval/runApprovalFlow.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

function createReadyForHumanApprovalState() {
  return {
    bubble_id: "b_approval_flow_01",
    state: "READY_FOR_HUMAN_APPROVAL",
    round: 2,
    active_agent: null,
    active_since: null,
    active_role: null,
    round_role_history: [],
    last_command_at: "2026-03-20T10:00:00.000Z",
    pending_rework_intent: null,
    rework_intent_history: [],
    meta_review: {
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false
    }
  } as const;
}

function createFlowDependencies(nowIso: string) {
  const state = createReadyForHumanApprovalState();
  const approvalRequest = [
    {
      id: "msg_approval_request_001",
      ts: "2026-03-20T10:00:00.000Z",
      bubble_id: state.bubble_id,
      sender: "orchestrator",
      recipient: "human",
      type: "APPROVAL_REQUEST",
      round: state.round,
      payload: {
        summary: "Approval summary",
        metadata: {
          latest_recommendation: "approve"
        }
      },
      refs: []
    } as const
  ];
  const emittedDeliveries: Array<{
    bubbleId: string;
    messageRef?: string;
    envelope: {
      recipient: string;
      payload: {
        metadata?: Record<string, unknown>;
      };
    };
  }> = [];
  const appendProtocolEnvelope = vi.fn(async (input: {
    envelope: {
      bubble_id: string;
      sender: "human";
      recipient: "orchestrator";
      type: "APPROVAL_DECISION";
      round: number;
      payload: Record<string, unknown>;
      refs: string[];
    };
  }) => ({
    sequence: 11,
    envelope: {
      id: "msg_approval_001",
      ts: nowIso,
      ...input.envelope
    }
  }));

  return {
    emittedDeliveries,
    dependencies: {
      resolveBubbleById: vi.fn(async () => ({
        bubbleId: state.bubble_id,
        repoPath: "/repo",
        bubblePaths: {
          statePath: "/repo/.pairflow/bubbles/b_approval_flow_01/state.json",
          transcriptPath: "/repo/.pairflow/bubbles/b_approval_flow_01/transcript.ndjson",
          inboxPath: "/repo/.pairflow/bubbles/b_approval_flow_01/inbox.ndjson",
          locksDir: "/repo/.pairflow/bubbles/b_approval_flow_01/locks",
          sessionsPath: "/repo/.pairflow/runtime/sessions.json"
        },
        bubbleConfig: {
          agents: {
            implementer: "codex",
            reviewer: "claude"
          },
          watchdog_timeout_minutes: 60
        }
      })),
      ensureBubbleInstanceIdForMutation: vi.fn(async (input: {
        bubbleConfig: {
          agents: {
            implementer: "codex";
            reviewer: "claude";
          };
          watchdog_timeout_minutes: number;
        };
      }) => ({
        bubbleInstanceId: "bi_approval_01",
        bubbleConfig: input.bubbleConfig
      })),
      readStateSnapshot: vi.fn(async () => ({
        state,
        fingerprint: "fp_state_01"
      })),
      readTranscriptEnvelopes: vi.fn(async () => approvalRequest),
      appendProtocolEnvelope,
      applyStateTransition,
      writeStateSnapshot: vi.fn(async (_path: string, nextState: unknown) => ({
        state: nextState,
        fingerprint: "fp_state_written_01"
      })),
      resolveDeliveryMessageRef: vi.fn(() => "transcript.ndjson#msg_approval_001"),
      emitTmuxDeliveryNotification: vi.fn(async (input: {
        bubbleId: string;
        messageRef?: string;
        envelope: {
          recipient: string;
          payload: {
            metadata?: Record<string, unknown>;
          };
        };
      }) => {
        emittedDeliveries.push(input);
        return {
          delivered: true,
          message: "ok"
        };
      }),
      emitBubbleLifecycleEventBestEffort: vi.fn(async () => undefined),
      queueDeferredReworkIntent: vi.fn(async () => ({}))
    } as never
  };
}

describe("runApprovalDecisionFlow delivery invariant", () => {
  it("emits status delivery once on approve decision", async () => {
    const now = new Date("2026-03-20T10:05:00.000Z");
    const nowIso = now.toISOString();
    const flow = createFlowDependencies(nowIso);

    const result = await runApprovalDecisionFlow(
      {
        bubbleId: "b_approval_flow_01",
        decision: "approve",
        refs: [],
        now,
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result.sequence).toBe(11);
    expect(flow.emittedDeliveries).toHaveLength(1);
    expect(flow.emittedDeliveries[0]).toMatchObject({
      bubbleId: "b_approval_flow_01",
      messageRef: "transcript.ndjson#msg_approval_001",
      envelope: {
        recipient: "orchestrator"
      }
    });
  });

  it("emits implementer-targeted delivery on rework decision", async () => {
    const now = new Date("2026-03-20T10:06:00.000Z");
    const nowIso = now.toISOString();
    const flow = createFlowDependencies(nowIso);

    const result = await runApprovalDecisionFlow(
      {
        bubbleId: "b_approval_flow_01",
        decision: "rework",
        message: "Please rework.",
        refs: [],
        now,
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result.state.state).toBe("RUNNING");
    expect(flow.emittedDeliveries).toHaveLength(2);
    expect(flow.emittedDeliveries[0]).toMatchObject({
      envelope: {
        recipient: "orchestrator"
      }
    });
    expect(flow.emittedDeliveries[1]).toMatchObject({
      envelope: {
        recipient: "codex",
        payload: {
          metadata: {
            [deliveryTargetRoleMetadataKey]: "implementer"
          }
        }
      }
    });
  });
});
