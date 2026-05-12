import { mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";
import type {
  BubbleRemotePointer
} from "../../../../../src/v11/shared/remote/remoteExecutionTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { applyStateTransition } from "../../../../../src/v11/domain/state/machine.js";
import { buildBubbleStateSnapshotVariant } from "../../../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import { deliveryTargetRoleMetadataKey } from "../../../../../src/types/protocol.js";
import {
  remoteApprovalModeEnvVar,
  remoteApprovalModeInnerRemoteExecution,
  remoteApprovalWorkspaceRootEnvVar
} from "../../../../../src/v11/application/approval/internal/remote/remoteApprovalExecutionContext.js";
import {
  runApprovalCommandPipeline
} from "../../../../../src/v11/application/approval/internal/pipeline/approvalCommandPipeline.js";
import type {
  ApprovalCommandPipelineDecisionInput,
  ApprovalCommandPipelineDependencies,
  ApprovalCommandPipelineRequestReworkInput
} from "../../../../../src/v11/application/approval/internal/pipeline/approvalCommandPipelineContract.js";
import type {
  EmitApprovalDecisionResult,
  EmitRequestReworkResult
} from "../../../../../src/v11/application/approval/approvalCommandContract.js";
import { queueDeferredReworkIntent } from "../../../../../src/v11/application/approval/internal/rework/reworkIntentQueue.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

async function runApprovalDecisionFlow(
  input: Omit<ApprovalCommandPipelineDecisionInput, "intent">,
  dependencies: ApprovalCommandPipelineDependencies
): Promise<EmitApprovalDecisionResult> {
  return runApprovalCommandPipeline(
    {
      intent: "approval_decision",
      ...input
    },
    dependencies
  ) as Promise<EmitApprovalDecisionResult>;
}

async function runRequestReworkFlow(
  input: Omit<ApprovalCommandPipelineRequestReworkInput, "intent">,
  dependencies: ApprovalCommandPipelineDependencies
): Promise<EmitRequestReworkResult> {
  return runApprovalCommandPipeline(
    {
      intent: "request_rework",
      ...input
    },
    dependencies
  ) as Promise<EmitRequestReworkResult>;
}

function createReadyForHumanApprovalState(): PersistedBubbleStateSnapshot {
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
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    }
  };
}

function createWaitingHumanState(): PersistedBubbleStateSnapshot {
  const ready = createReadyForHumanApprovalState();
  return {
    ...ready,
    state: "WAITING_HUMAN"
  };
}

function createRemoteReadyForHumanApprovalState(): PersistedBubbleStateSnapshot {
  return {
    bubble_id: "b_remote_approval_01",
    state: "READY_FOR_HUMAN_APPROVAL",
    round: 2,
    active_agent: null,
    active_since: null,
    active_role: null,
    execution_context: null,
    round_role_history: [],
    last_command_at: "2026-04-17T09:00:00.000Z",
    pending_rework_intent: null,
    rework_intent_history: [],
    meta_review: {
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    }
  };
}

function createRemoteWaitingHumanState(): PersistedBubbleStateSnapshot {
  return {
    ...createRemoteReadyForHumanApprovalState(),
    state: "WAITING_HUMAN"
  };
}

function createFlowDependencies(
  nowIso: string,
  input: {
    state?: PersistedBubbleStateSnapshot;
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
      resolveBubbleFromWorkspaceCwd: vi.fn(async () => {
        throw new Error("workspace resolution is unused for local approvals");
      }),
      resolveDeliveryMessageRef: vi.fn(() => "transcript.ndjson#msg_approval_001"),
      emitDeliveryNotificationAck: vi.fn(async (input: {
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
          status: "accepted" as const,
          message: "ok",
          sessionName: "pf_approval_flow_01",
          targetPaneIndex: 1
        };
      }),
      emitBubbleLifecycleEventBestEffort: vi.fn(async () => undefined),
      queueDeferredReworkIntent: vi.fn(() => ({}))
    }
  };
}

function createRemoteFlowDependencies(
  input: {
    state?: PersistedBubbleStateSnapshot;
    resolvedRepoPath?: string;
    workspaceRepoPath?: string;
    workspaceWorktreePath?: string;
    remotePointer?:
      | {
          kind: "started";
          host: string;
          instanceId: string;
          remoteClonePath: string;
          tmuxSession: string;
          startedAt: string;
        }
      | null;
    remotePointerError?: Error;
    workspaceResolution?:
      | "unavailable"
      | "verified_remote_clone"
      | "different_bubble"
      | "ambiguous"
      | "resolution_error";
  } = {}
) {
  const executeRemoteBubbleApprovalCommand = vi.fn();
  const state = input.state ?? createRemoteReadyForHumanApprovalState();
  const resolvedRepoPath = input.resolvedRepoPath ?? "/repo";
  const workspaceRepoPath = input.workspaceRepoPath ?? resolvedRepoPath;
  const workspaceWorktreePath =
    input.workspaceWorktreePath ?? workspaceRepoPath;
  const approvalRequest = [
    {
      id: "msg_remote_approval_request_001",
      ts: "2026-04-17T09:00:00.000Z",
      bubble_id: state.bubble_id,
      sender: "orchestrator",
      recipient: "human",
      type: "APPROVAL_REQUEST",
      round: state.round,
      payload: {
        summary: "Remote approval summary",
        metadata: {
          latest_recommendation: "approve"
        }
      },
      refs: []
    } as const
  ];
  const remotePointer: BubbleRemotePointer | null = input.remotePointer === undefined
    ? {
        kind: "started" as const,
        host: "ssh.example.com",
        instanceId: "inst_remote_approval_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_approval_01",
        tmuxSession: "pf-b_remote_approval_01",
        startedAt: "2026-04-17T09:00:00.000Z"
      }
    : input.remotePointer;
  const workspaceResolution = input.workspaceResolution ?? "unavailable";
  const rawDependencies = {
    resolveBubbleById: vi.fn(async () => ({
      bubbleId: state.bubble_id,
      repoPath: resolvedRepoPath,
      bubblePaths: {
        statePath:
          `${resolvedRepoPath}/.pairflow/bubbles/${state.bubble_id}/state.json`,
        transcriptPath:
          `${resolvedRepoPath}/.pairflow/bubbles/${state.bubble_id}/transcript.ndjson`,
        inboxPath:
          `${resolvedRepoPath}/.pairflow/bubbles/${state.bubble_id}/inbox.ndjson`,
        locksDir: `${resolvedRepoPath}/.pairflow/bubbles/${state.bubble_id}/locks`,
        sessionsPath: `${resolvedRepoPath}/.pairflow/runtime/sessions.json`,
        remotePointerPath:
          `${resolvedRepoPath}/.pairflow/bubbles/${state.bubble_id}/remote.json`
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
    readRemotePointer: vi.fn<(path: string) => Promise<BubbleRemotePointer | null>>(
      async () => {
        if (input.remotePointerError !== undefined) {
          throw input.remotePointerError;
        }
        return remotePointer;
      }
    ),
    resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
      alias: "prod",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    })),
    executeRemoteBubbleApprovalCommand,
    readStateSnapshot: vi.fn(async () => ({
      state,
      fingerprint: "fp_remote_state_01"
    })),
    appendProtocolEnvelope: vi.fn(async (input: {
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
      sequence: 21,
      envelope: {
        id: "msg_remote_local_rework_001",
        ts: "2026-04-17T09:06:00.000Z",
        ...input.envelope
      }
    })),
    writeStateSnapshot: vi.fn(async (_path: string, nextState: unknown) => ({
      state: nextState,
      fingerprint: "fp_remote_state_written_01"
    })),
    readTranscriptEnvelopes: vi.fn(async () => approvalRequest),
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
    resolveBubbleFromWorkspaceCwd: vi.fn(async () => {
      if (workspaceResolution === "verified_remote_clone") {
        return {
          bubbleId: state.bubble_id,
          repoPath: workspaceRepoPath,
          worktreePath: workspaceWorktreePath,
          cwd: workspaceWorktreePath,
          bubblePaths: {
            statePath:
              `${workspaceRepoPath}/.pairflow/bubbles/${state.bubble_id}/state.json`,
            transcriptPath:
              `${workspaceRepoPath}/.pairflow/bubbles/${state.bubble_id}/transcript.ndjson`,
            inboxPath:
              `${workspaceRepoPath}/.pairflow/bubbles/${state.bubble_id}/inbox.ndjson`,
            locksDir: `${workspaceRepoPath}/.pairflow/bubbles/${state.bubble_id}/locks`,
            sessionsPath: `${workspaceRepoPath}/.pairflow/runtime/sessions.json`,
            remotePointerPath:
              `${workspaceRepoPath}/.pairflow/bubbles/${state.bubble_id}/remote.json`
          },
          bubbleConfig: {
            agents: {
              implementer: "codex",
              reviewer: "claude"
            },
            watchdog_timeout_minutes: 60,
            executor: {
              type: "ssh" as const,
              remote: "prod"
            }
          }
        };
      }
      if (workspaceResolution === "different_bubble") {
        return {
          bubbleId: "b_other_remote_bubble_01",
          repoPath: workspaceRepoPath,
          worktreePath: workspaceWorktreePath,
          cwd: workspaceWorktreePath,
          bubblePaths: {
            statePath:
              `${workspaceRepoPath}/.pairflow/bubbles/b_other_remote_bubble_01/state.json`,
            transcriptPath:
              `${workspaceRepoPath}/.pairflow/bubbles/b_other_remote_bubble_01/transcript.ndjson`,
            inboxPath:
              `${workspaceRepoPath}/.pairflow/bubbles/b_other_remote_bubble_01/inbox.ndjson`,
            locksDir:
              `${workspaceRepoPath}/.pairflow/bubbles/b_other_remote_bubble_01/locks`,
            sessionsPath: `${workspaceRepoPath}/.pairflow/runtime/sessions.json`,
            remotePointerPath:
              `${workspaceRepoPath}/.pairflow/bubbles/b_other_remote_bubble_01/remote.json`
          },
          bubbleConfig: {
            agents: {
              implementer: "codex",
              reviewer: "claude"
            },
            watchdog_timeout_minutes: 60,
            executor: {
              type: "ssh" as const,
              remote: "prod"
            }
          }
        };
      }
      if (workspaceResolution === "ambiguous") {
        const error = new Error("workspace resolution ambiguous");
        Object.assign(error, {
          name: "WorkspaceResolutionError",
          context: {
            reason: "ambiguous_bubble_config_match"
          }
        });
        throw error;
      }
      if (workspaceResolution === "resolution_error") {
        const error = new Error("workspace resolution failed");
        Object.assign(error, {
          name: "WorkspaceResolutionError",
          context: {
            reason: "no_matching_bubble_config"
          }
        });
        throw error;
      }
      throw new Error("workspace resolution unavailable");
    }),
    resolveDeliveryMessageRef: vi.fn(() => "unused"),
    emitDeliveryNotificationAck: vi.fn(async () => ({
      status: "accepted" as const,
      message: "unused",
      sessionName: "pf_remote_approval_01",
      targetPaneIndex: 1
    })),
    emitBubbleLifecycleEventBestEffort: vi.fn(async () => undefined),
    queueDeferredReworkIntent: vi.fn(() => ({}))
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

    if (!("sequence" in result)) {
      throw new Error("Expected immediate approval decision result.");
    }
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

    if (!("sequence" in result)) {
      throw new Error("Expected immediate approval decision result.");
    }
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

  it("routes remote generic rework decisions through request-rework action", async () => {
    const flow = createRemoteFlowDependencies();
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "decision",
      bubbleId: "b_remote_approval_01",
      sequence: 16,
      envelope: {
        id: "msg_remote_rework_decision_01",
        ts: "2026-04-17T09:06:00.000Z",
        bubble_id: "b_remote_approval_01",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "rework",
          message: "Please rework through the decision API."
        },
        refs: []
      },
      state: {
        ...createRemoteReadyForHumanApprovalState(),
        state: "RUNNING"
      }
    });

    const result = await runApprovalDecisionFlow(
      {
        bubbleId: "b_remote_approval_01",
        decision: "rework",
        message: "Please rework through the decision API.",
        refs: [],
        now: new Date("2026-04-17T09:06:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      bubbleId: "b_remote_approval_01",
      sequence: 16,
      state: {
        state: "RUNNING"
      }
    });
    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.rawDependencies.appendProtocolEnvelope).not.toHaveBeenCalled();
    expect(flow.rawDependencies.writeStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledWith({
      action: "request-rework",
      bubbleId: "b_remote_approval_01",
      message: "Please rework through the decision API.",
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

  it("fails closed before remote routing when generic rework decisions omit a message", async () => {
    const flow = createRemoteFlowDependencies();

    await expect(() =>
      runApprovalDecisionFlow(
        {
          bubbleId: "b_remote_approval_01",
          decision: "rework",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(/APPROVAL_REWORK_MESSAGE_REQUIRED/u);

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.rawDependencies.appendProtocolEnvelope).not.toHaveBeenCalled();
    expect(flow.rawDependencies.writeStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("returns queued result when remote generic rework decisions queue rework", async () => {
    const flow = createRemoteFlowDependencies();
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "queued_rework",
      bubbleId: "b_remote_approval_01",
      intentId: "intent_remote_rework_01",
      state: {
        ...createRemoteWaitingHumanState(),
        pending_rework_intent: {
          intent_id: "intent_remote_rework_01",
          message: "Please rework through the decision API.",
          requested_by: "human:request-rework",
          requested_at: "2026-04-17T09:06:00.000Z",
          status: "pending"
        }
      }
    });

    const result = await runApprovalDecisionFlow(
      {
        bubbleId: "b_remote_approval_01",
        decision: "rework",
        message: "Please rework through the decision API.",
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
      state: {
        state: "WAITING_HUMAN",
        pending_rework_intent: {
          intent_id: "intent_remote_rework_01",
          message: "Please rework through the decision API."
        }
      }
    });

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.rawDependencies.appendProtocolEnvelope).not.toHaveBeenCalled();
    expect(flow.rawDependencies.writeStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledWith({
      action: "request-rework",
      bubbleId: "b_remote_approval_01",
      message: "Please rework through the decision API.",
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

  it("uses the local canonical approval path inside a verified remote clone execution context", async () => {
    const now = new Date("2026-04-17T09:05:00.000Z");
    const flow = createRemoteFlowDependencies({
      remotePointer: null,
      resolvedRepoPath: "/srv/pairflow/repo--b_remote_approval_01"
    });

    vi.stubEnv(
      remoteApprovalModeEnvVar,
      remoteApprovalModeInnerRemoteExecution
    );
    vi.stubEnv(
      remoteApprovalWorkspaceRootEnvVar,
      "/srv/pairflow/repo--b_remote_approval_01"
    );

    try {
      const result = await runApprovalDecisionFlow(
        {
          bubbleId: "b_remote_approval_01",
          decision: "approve",
          refs: [],
          now,
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      );

      expect(result.state.state).toBe("APPROVED_FOR_COMMIT");
      expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
      expect(flow.rawDependencies.readStateSnapshot).toHaveBeenCalledOnce();
      expect(flow.rawDependencies.appendProtocolEnvelope).toHaveBeenCalledOnce();
      expect(flow.rawDependencies.writeStateSnapshot).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
    }
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

  it("uses the local canonical request-rework path inside a verified remote clone when WAITING_HUMAN", async () => {
    const now = new Date("2026-04-17T09:06:00.000Z");
    const flow = createRemoteFlowDependencies({
      state: createRemoteWaitingHumanState(),
      remotePointer: null,
      workspaceResolution: "verified_remote_clone"
    });
    const queued = queueDeferredReworkIntent({
      state: buildBubbleStateSnapshotVariant(createRemoteWaitingHumanState()),
      message: "Please rework locally.",
      requestedBy: "human:request-rework",
      now
    });
    flow.rawDependencies.queueDeferredReworkIntent = vi.fn(() => queued);

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework locally.",
        refs: [],
        now,
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "queued",
      bubbleId: "b_remote_approval_01",
      intentId: queued.intent.intent_id,
      state: {
        state: "WAITING_HUMAN"
      }
    });
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
    expect(flow.rawDependencies.readStateSnapshot).toHaveBeenCalledWith(
      "/repo/.pairflow/bubbles/b_remote_approval_01/state.json"
    );
    expect(flow.rawDependencies.writeStateSnapshot).toHaveBeenCalledOnce();
  });

  it("uses the local canonical request-rework path inside a verified remote clone when awaiting approval", async () => {
    const now = new Date("2026-04-17T09:06:00.000Z");
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      remotePointer: null,
      workspaceResolution: "verified_remote_clone"
    });

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework locally now.",
        refs: [],
        now,
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      state: {
        state: "RUNNING"
      }
    });
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
    expect(flow.rawDependencies.appendProtocolEnvelope).toHaveBeenCalledOnce();
  });

  it("accepts a symlinked verified remote clone root as the same local request-rework authority", async () => {
    const resolvedRepoPath = await mkdtemp(
      join(tmpdir(), "pairflow-approval-remote-clone-")
    );
    const symlinkRoot = await mkdtemp(
      join(tmpdir(), "pairflow-approval-remote-clone-link-")
    );
    const symlinkPath = join(symlinkRoot, "repo-link");
    await symlink(resolvedRepoPath, symlinkPath);

    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      resolvedRepoPath,
      workspaceRepoPath: symlinkPath,
      workspaceWorktreePath: symlinkPath,
      remotePointer: null,
      workspaceResolution: "verified_remote_clone"
    });

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework locally through the symlinked clone.",
        refs: [],
        now: new Date("2026-04-17T09:06:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      state: {
        state: "RUNNING"
      }
    });
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
    expect(flow.rawDependencies.appendProtocolEnvelope).toHaveBeenCalledOnce();
  });

  it("fails closed when the verified remote clone repo path does not match canonical bubble authority", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      resolvedRepoPath: "/canonical-repo",
      workspaceRepoPath: "/different-repo",
      workspaceWorktreePath: "/different-repo",
      remotePointer: null,
      workspaceResolution: "verified_remote_clone"
    });

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework locally.",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(
      /does not match the canonical bubble repository authority/u
    );

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("keeps the retained remote route when cwd is inside the clone but not at the verified clone root", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      workspaceWorktreePath: "/repo/subdir",
      workspaceResolution: "verified_remote_clone"
    });
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "decision",
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      sequence: 15,
      envelope: {
        id: "msg_remote_rework_001",
        ts: "2026-04-17T09:06:00.000Z",
        bubble_id: "b_remote_approval_01",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "request_rework"
        },
        refs: []
      },
      state: {
        ...createRemoteReadyForHumanApprovalState(),
        state: "RUNNING"
      }
    });

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework through retained remote routing.",
        refs: [],
        now: new Date("2026-04-17T09:06:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      sequence: 15
    });
    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledOnce();
  });

  it("fails closed when remote request-rework returns a malformed non-queued result", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState()
    });
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      sequence: 15,
      envelope: {
        id: "msg_remote_rework_001",
        ts: "2026-04-17T09:06:00.000Z",
        bubble_id: "b_remote_approval_01",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "request_rework"
        },
        refs: []
      },
      state: {
        ...createRemoteReadyForHumanApprovalState(),
        state: "RUNNING"
      }
    } as never);

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework through retained remote routing.",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(/invalid result kind/u);

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledOnce();
  });

  it("keeps the retained remote route when a local control-plane workspace has retained remote pointer artifacts", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      remotePointer: {
        kind: "started",
        host: "ssh.example.com",
        instanceId: "inst_remote_approval_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_approval_01",
        tmuxSession: "pf-b_remote_approval_01",
        startedAt: "2026-04-17T09:00:00.000Z"
      },
      workspaceResolution: "verified_remote_clone"
    });
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "decision",
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      sequence: 17,
      envelope: {
        id: "msg_remote_rework_retained_pointer_001",
        ts: "2026-04-17T09:06:00.000Z",
        bubble_id: "b_remote_approval_01",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "request_rework"
        },
        refs: []
      },
      state: {
        ...createRemoteReadyForHumanApprovalState(),
        state: "RUNNING"
      }
    });

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework through retained remote routing.",
        refs: [],
        now: new Date("2026-04-17T09:06:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "immediate",
      bubbleId: "b_remote_approval_01",
      sequence: 17
    });
    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledWith({
      action: "request-rework",
      bubbleId: "b_remote_approval_01",
      message: "Please rework through retained remote routing.",
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

  it("surfaces clone-root fallback diagnostics when subdirectory cwd falls back to the retained remote path", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      workspaceWorktreePath: "/repo/subdir",
      remotePointer: null,
      workspaceResolution: "verified_remote_clone"
    });

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework through retained remote routing.",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(
      /inside the verified clone but not at its clone root '\/repo'/u
    );

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("does not treat repo-only remote context as verified remote clone authority", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteWaitingHumanState(),
      remotePointer: null,
      workspaceResolution: "unavailable"
    });

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework locally.",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input)),
          repoPath: "/repo"
        },
        flow.dependencies
      )
    ).rejects.toThrow(/requires a started remote pointer/u);

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("keeps the retained remote route on non-ambiguous workspace resolution failures", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteWaitingHumanState(),
      workspaceResolution: "resolution_error"
    });
    flow.executeRemoteBubbleApprovalCommand.mockResolvedValue({
      kind: "queued_rework",
      mode: "queued",
      bubbleId: "b_remote_approval_01",
      intentId: "ri_remote_approval_01",
      sequence: 16,
      envelope: {
        id: "msg_remote_rework_queued_001",
        ts: "2026-04-17T09:06:00.000Z",
        bubble_id: "b_remote_approval_01",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "request_rework"
        },
        refs: []
      },
      state: createRemoteWaitingHumanState()
    });

    const result = await runRequestReworkFlow(
      {
        bubbleId: "b_remote_approval_01",
        message: "Please rework through retained remote routing.",
        refs: [],
        now: new Date("2026-04-17T09:06:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      flow.dependencies
    );

    expect(result).toMatchObject({
      mode: "queued",
      bubbleId: "b_remote_approval_01",
      intentId: "ri_remote_approval_01"
    });
    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).toHaveBeenCalledOnce();
  });

  it("fails closed when remote pointer verification throws inside the verified remote clone branch", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      remotePointer: null,
      remotePointerError: new Error("remote pointer unreadable"),
      workspaceResolution: "verified_remote_clone"
    });

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework locally.",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(/could not verify remote clone control-plane boundaries/u);

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("fails closed when the active workspace resolves to a different bubble", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      workspaceResolution: "different_bubble"
    });

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework locally.",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(/active workspace resolves to bubble b_other_remote_bubble_01/u);

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("fails closed when workspace authority is ambiguous", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      workspaceResolution: "ambiguous"
    });

    await expect(() =>
      runRequestReworkFlow(
        {
          bubbleId: "b_remote_approval_01",
          message: "Please rework locally.",
          refs: [],
          now: new Date("2026-04-17T09:06:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        flow.dependencies
      )
    ).rejects.toThrow(/could not disambiguate the active workspace authority/u);

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("keeps approve on the retained remote-routing path even inside a verified remote clone", async () => {
    const flow = createRemoteFlowDependencies({
      state: createRemoteReadyForHumanApprovalState(),
      remotePointer: null,
      workspaceResolution: "verified_remote_clone"
    });

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

    expect(flow.rawDependencies.readStateSnapshot).not.toHaveBeenCalled();
    expect(flow.executeRemoteBubbleApprovalCommand).not.toHaveBeenCalled();
  });

  it("queues local request-rework intent without approval transcript mutation while WAITING_HUMAN", async () => {
    const now = new Date("2026-03-20T10:07:00.000Z");
    const flow = createFlowDependencies(now.toISOString(), {
      state: createWaitingHumanState()
    });
    const queued = queueDeferredReworkIntent({
      state: buildBubbleStateSnapshotVariant(flow.state),
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

  it("queues local generic rework decisions without approval transcript mutation while WAITING_HUMAN", async () => {
    const now = new Date("2026-03-20T10:08:00.000Z");
    const flow = createFlowDependencies(now.toISOString(), {
      state: createWaitingHumanState()
    });
    const queued = queueDeferredReworkIntent({
      state: buildBubbleStateSnapshotVariant(flow.state),
      message: "Please rework later through decision API.",
      requestedBy: "human:request-rework",
      now
    });
    flow.rawDependencies.queueDeferredReworkIntent = vi.fn(() => queued);

    const result = await runApprovalDecisionFlow(
      {
        bubbleId: "b_approval_flow_01",
        decision: "rework",
        message: "Please rework later through decision API.",
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
      message: "Please rework later through decision API.",
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
