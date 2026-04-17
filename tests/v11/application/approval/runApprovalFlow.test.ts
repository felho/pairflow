import { describe, expect, it, vi } from "vitest";

import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";
import { applyStateTransition } from "../../../../src/v11/domain/state/machine.js";
import { deliveryTargetRoleMetadataKey } from "../../../../src/types/protocol.js";
import { runApprovalDecisionFlow } from "../../../../src/v11/application/approval/runApprovalFlow.js";
import { runRequestReworkFlow } from "../../../../src/v11/application/approval/runApprovalFlow.js";
import { queueDeferredReworkIntent } from "../../../../src/v11/shared/approval/reworkIntent.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

function createReadyForHumanApprovalState(): BubbleStateSnapshot {
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
  };
}

function createWaitingHumanState(): BubbleStateSnapshot {
  const ready = createReadyForHumanApprovalState();
  return {
    ...ready,
    state: "WAITING_HUMAN"
  };
}

function createFlowDependencies(
  nowIso: string,
  input: {
    state?: BubbleStateSnapshot;
  } = {}
) {
  const state = input.state ?? createReadyForHumanApprovalState();
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
    state,
    rawDependencies: {
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
      queueDeferredReworkIntent: vi.fn(() => ({}))
    }
  };
}

function createRemoteFlowDependencies() {
  const executeRemoteBubbleApprovalCommand = vi.fn();
  const rawDependencies = {
    resolveBubbleById: vi.fn(async () => ({
      bubbleId: "b_remote_approval_01",
      repoPath: "/repo",
      bubblePaths: {
        statePath: "/repo/.pairflow/bubbles/b_remote_approval_01/state.json",
        transcriptPath:
          "/repo/.pairflow/bubbles/b_remote_approval_01/transcript.ndjson",
        inboxPath: "/repo/.pairflow/bubbles/b_remote_approval_01/inbox.ndjson",
        locksDir: "/repo/.pairflow/bubbles/b_remote_approval_01/locks",
        sessionsPath: "/repo/.pairflow/runtime/sessions.json",
        remotePointerPath:
          "/repo/.pairflow/bubbles/b_remote_approval_01/remote.json"
      },
      bubbleConfig: {
        agents: {
          implementer: "codex",
          reviewer: "claude"
        },
        watchdog_timeout_minutes: 60,
        executor: {
          type: "ssh",
          remote: "prod"
        }
      }
    })),
    readRemotePointer: vi.fn(async () => ({
      kind: "started",
      host: "ssh.example.com",
      instanceId: "inst_remote_approval_01",
      remoteClonePath: "/srv/pairflow/repo--b_remote_approval_01",
      tmuxSession: "pf-b_remote_approval_01",
      startedAt: "2026-04-17T09:00:00.000Z"
    })),
    resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
      alias: "prod",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    })),
    executeRemoteBubbleApprovalCommand,
    readStateSnapshot: vi.fn(async () => {
      throw new Error("readStateSnapshot should not be used for remote routing");
    }),
    appendProtocolEnvelope: vi.fn(async () => {
      throw new Error("appendProtocolEnvelope should not be used for remote routing");
    }),
    writeStateSnapshot: vi.fn(async () => {
      throw new Error("writeStateSnapshot should not be used for remote routing");
    }),
    readTranscriptEnvelopes: vi.fn(async () => []),
    ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
      bubbleInstanceId: "bi_remote_approval_01",
      bubbleConfig: {
        agents: {
          implementer: "codex",
          reviewer: "claude"
        },
        watchdog_timeout_minutes: 60
      }
    })),
    applyStateTransition,
    resolveDeliveryMessageRef: vi.fn(() => "unused"),
    emitTmuxDeliveryNotification: vi.fn(async () => ({
      delivered: true,
      message: "unused"
    })),
    emitBubbleLifecycleEventBestEffort: vi.fn(async () => undefined),
    queueDeferredReworkIntent: vi.fn(async () => ({}))
  };

  return {
    executeRemoteBubbleApprovalCommand,
    rawDependencies,
    dependencies: rawDependencies as never
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
      flow.rawDependencies as never
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
      flow.rawDependencies as never
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

  it("routes approve to the remote started pointer authority without local mutation fallback", async () => {
    const flow = createRemoteFlowDependencies();
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "decision",
      bubbleId: "b_remote_approval_01",
      sequence: 14,
      envelope: {
        id: "msg_remote_approval_01",
        ts: "2026-04-17T09:05:00.000Z",
        bubble_id: "b_remote_approval_01",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "approve"
        },
        refs: []
      },
      state: {
        bubble_id: "b_remote_approval_01",
        state: "APPROVED_FOR_COMMIT",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-17T09:05:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }
    });

    const result = await runApprovalDecisionFlow(
      {
        bubbleId: "b_remote_approval_01",
        decision: "approve",
        refs: [],
        now: new Date("2026-04-17T09:05:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result.sequence).toBe(14);
    expect(result.state.state).toBe("APPROVED_FOR_COMMIT");
    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.rawDependencies.appendProtocolEnvelope).not.toHaveBeenCalled();
    expect(flow.rawDependencies.writeStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledWith({
      action: "approve",
      bubbleId: "b_remote_approval_01",
      refs: [],
      remoteClonePath: "/srv/pairflow/repo--b_remote_approval_01",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      overrideNonApprove: false
    });
  });

  it("queues remote request-rework through the started pointer authority when WAITING_HUMAN remains retained", async () => {
    const flow = createRemoteFlowDependencies();
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "queued_rework",
      bubbleId: "b_remote_approval_01",
      intentId: "intent_remote_rework_01",
      supersededIntentId: "intent_remote_rework_00",
      state: {
        bubble_id: "b_remote_approval_01",
        state: "WAITING_HUMAN",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-17T09:06:00.000Z",
        pending_rework_intent: {
          intent_id: "intent_remote_rework_01",
          message: "Please rework.",
          requested_by: "human:request-rework",
          requested_at: "2026-04-17T09:06:00.000Z",
          status: "pending"
        },
        rework_intent_history: [
          {
            intent_id: "intent_remote_rework_00",
            message: "Old request",
            requested_by: "human:request-rework",
            requested_at: "2026-04-17T09:00:00.000Z",
            status: "superseded",
            superseded_by_intent_id: "intent_remote_rework_01"
          }
        ]
      }
    });

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework.",
        refs: [],
        now: new Date("2026-04-17T09:06:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "queued",
      bubbleId: "b_remote_approval_01",
      intentId: "intent_remote_rework_01",
      supersededIntentId: "intent_remote_rework_00"
    });
    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.rawDependencies.writeStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledWith({
      action: "request-rework",
      bubbleId: "b_remote_approval_01",
      message: "Please rework.",
      refs: [],
      remoteClonePath: "/srv/pairflow/repo--b_remote_approval_01",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      }
    });
  });

  it("routes remote request-rework as an immediate decision when the remote bubble is awaiting approval", async () => {
    const flow = createRemoteFlowDependencies();
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "decision",
      bubbleId: "b_remote_approval_01",
      sequence: 15,
      envelope: {
        id: "msg_remote_rework_01",
        ts: "2026-04-17T09:06:00.000Z",
        bubble_id: "b_remote_approval_01",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "rework",
          message: "Please rework."
        },
        refs: []
      },
      state: {
        bubble_id: "b_remote_approval_01",
        state: "RUNNING",
        round: 3,
        active_agent: "codex",
        active_since: "2026-04-17T09:06:00.000Z",
        active_role: "implementer",
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-17T09:06:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }
    });

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework.",
        refs: [],
        now: new Date("2026-04-17T09:06:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      sequence: 15,
      state: {
        state: "RUNNING"
      }
    });
    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.rawDependencies.writeStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledWith({
      action: "request-rework",
      bubbleId: "b_remote_approval_01",
      message: "Please rework.",
      refs: [],
      remoteClonePath: "/srv/pairflow/repo--b_remote_approval_01",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      }
    });
  });

  it("queues local request-rework intent without approval transcript mutation while WAITING_HUMAN", async () => {
    const now = new Date("2026-03-20T10:07:00.000Z");
    const flow = createFlowDependencies(now.toISOString(), {
      state: createWaitingHumanState()
    });
    const queued = queueDeferredReworkIntent({
      state: flow.state,
      message: "Please rework later.",
      requestedBy: "human:request-rework",
      now
    });
    flow.rawDependencies.queueDeferredReworkIntent = vi.fn(() => queued);

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_approval_flow_01",
        message: "Please rework later.",
        refs: [],
        now,
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.rawDependencies as never
    );

    expect(result).toMatchObject({
      mode: "queued",
      bubbleId: "b_approval_flow_01",
      intentId: queued.intent.intent_id,
      state: {
        state: "WAITING_HUMAN"
      }
    });
    expect(flow.rawDependencies.appendProtocolEnvelope).not.toHaveBeenCalled();
    expect(flow.emittedDeliveries).toHaveLength(0);
    expect(flow.rawDependencies.queueDeferredReworkIntent).toHaveBeenCalledWith({
      state: flow.state,
      message: "Please rework later.",
      refs: [],
      requestedBy: "human:request-rework",
      now
    });
  });

  it("fails closed for remote bubbles that are not started yet", async () => {
    const flow = createRemoteFlowDependencies();
    flow.rawDependencies.readRemotePointer = vi.fn(async () => ({
      kind: "created",
      host: "ssh.example.com"
    }));

    await expect(() =>
      runApprovalDecisionFlow(
        {
          bubbleId: "b_remote_approval_01",
          decision: "approve",
          refs: [],
          now: new Date("2026-04-17T09:07:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(/requires a started remote pointer/u);

    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("fails closed for remote request-rework when the remote bubble is not started yet", async () => {
    const flow = createRemoteFlowDependencies();
    flow.rawDependencies.readRemotePointer = vi.fn(async () => ({
      kind: "created",
      host: "ssh.example.com"
    }));

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework.",
          refs: [],
          now: new Date("2026-04-17T09:07:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(/requires a started remote pointer/u);

    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });
});
