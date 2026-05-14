import { describe, expect, it } from "vitest";

import { deliveryTargetRoleMetadataKey } from "../../../../src/v11/shared/delivery/deliveryTargetMetadataContract.js";
import { executeConvergedExecution } from "../../../../src/v11/application/converged/internal/flow/convergedExecution.js";

describe("executeConvergedExecution", () => {
  it("delivers approval request to human + implementer + reviewer with role metadata", async () => {
    const deliveryCalls: Array<{
      recipient: string;
      roleMetadata: unknown;
    }> = [];
    const notifications: string[] = [];

    const result = await executeConvergedExecution(
      {
        resolved: {
          bubbleId: "b_exec_001",
          repoPath: "/repo",
          bubblePaths: {
            transcriptPath: "/repo/.pairflow/transcript.ndjson",
            locksDir: "/repo/.pairflow/locks",
            sessionsPath: "/repo/.pairflow/sessions.json",
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {},
          worktreePath: "/repo/worktree",
          cwd: "/repo/worktree"
        } as never,
        state: {
          round: 3
        } as never,
        reviewer: "claude",
        implementer: "codex",
        summary: "converged summary",
        refs: ["artifacts/review.md"],
        findings: [
          {
            severity: "P2",
            title: "Follow-up",
            refs: ["artifact://review/follow-up.md"]
          }
        ],
        now: new Date("2026-03-19T11:00:00.000Z"),
        convergencePolicyDiagnostics: ["diagnostic-a"],
        gatePipelineDiagnostics: ["diagnostic-a", "gate-warning"]
      },
      {
        appendProtocolEnvelope: async (input) => {
          expect(input.envelope.type).toBe("CONVERGENCE");
          if (input.envelope.type !== "CONVERGENCE") {
            throw new Error("Expected convergence envelope.");
          }
          expect(input.envelope.payload.findings).toEqual([
            {
              severity: "P2",
              title: "Follow-up",
              refs: ["artifact://review/follow-up.md"]
            }
          ]);
          expect(input.envelope.payload.metadata).toMatchObject({
            advisory_findings_open_total: 1,
            convergence_policy_diagnostics: ["diagnostic-a"],
            gate_pipeline_diagnostics: ["diagnostic-a", "gate-warning"]
          });
          return {
            sequence: 17,
            envelope: {
              id: "env_conv_1"
            }
          } as never;
        },
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: "b_exec_001",
          route: "human_gate_approve",
          gateSequence: 18,
          gateEnvelope: {
            id: "env_gate_1",
            ts: "2026-03-19T11:00:01.000Z",
            bubble_id: "b_exec_001",
            sender: "orchestrator",
            recipient: "human",
            type: "APPROVAL_REQUEST",
            round: 3,
            payload: {
              summary: "approval"
            },
            refs: []
          },
          state: {}
        }) as never,
        emitDeliveryNotificationAck: async (input) => {
          deliveryCalls.push({
            recipient: input.envelope.recipient,
            roleMetadata: input.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey]
          });
          if (input.envelope.recipient === "codex") {
            return {
              status: "rejected",
              message: "",
              reason: "delivery_unconfirmed",
              reason_code: "DELIVERY_ACK_REJECTED"
            };
          }
          return {
            status: "accepted",
            message: "",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          };
        },
        emitBubbleNotification: (config, commandName) => {
          void config;
          notifications.push(commandName);
          return Promise.resolve({
            kind: commandName,
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          });
        }
      }
    );

    expect(deliveryCalls).toEqual([
      {
        recipient: "human",
        roleMetadata: undefined
      },
      {
        recipient: "codex",
        roleMetadata: "implementer"
      },
      {
        recipient: "claude",
        roleMetadata: "reviewer"
      }
    ]);
    expect(result.delivery).toEqual({
      status: "rejected",
      reason: "partial_delivery_failed",
      reason_code: "DELIVERY_ACK_REJECTED",
      retried: false
    });
    expect(notifications).toEqual(["converged"]);
  });

  it("routes retained literal meta-reviewer recipients through the meta-review role fallback", async () => {
    const deliveryCalls: Array<{
      recipient: string;
      recipientRole: unknown;
    }> = [];

    await executeConvergedExecution(
      {
        resolved: {
          bubbleId: "b_exec_meta_literal_001",
          repoPath: "/repo",
          bubblePaths: {
            transcriptPath: "/repo/.pairflow/transcript.ndjson",
            locksDir: "/repo/.pairflow/locks",
            sessionsPath: "/repo/.pairflow/sessions.json",
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {},
          worktreePath: "/repo/worktree",
          cwd: "/repo/worktree"
        } as never,
        state: {
          round: 3
        } as never,
        reviewer: "claude",
        implementer: "codex",
        summary: "converged summary",
        refs: [],
        now: new Date("2026-03-19T11:05:00.000Z"),
        convergencePolicyDiagnostics: [],
        gatePipelineDiagnostics: []
      },
      {
        appendProtocolEnvelope: async () => ({
          sequence: 21,
          envelope: {
            id: "env_conv_meta_literal_1"
          }
        }) as never,
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: "b_exec_meta_literal_001",
          route: "human_gate_approve",
          gateSequence: 22,
          gateEnvelope: {
            id: "env_gate_meta_literal_1",
            ts: "2026-03-19T11:05:01.000Z",
            bubble_id: "b_exec_meta_literal_001",
            sender: "orchestrator",
            recipient: "meta-reviewer",
            type: "APPROVAL_REQUEST",
            round: 3,
            payload: {
              summary: "approval"
            },
            refs: []
          },
          state: {}
        }) as never,
        emitDeliveryNotificationAck: async (input) => {
          deliveryCalls.push({
            recipient: input.envelope.recipient,
            recipientRole: input.recipientRole
          });
          return {
            status: "accepted",
            message: "",
            sessionName: "pf_bubble",
            targetPaneIndex: 3
          };
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "converged",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          })
      }
    );

    expect(deliveryCalls).toEqual([
      {
        recipient: "meta-reviewer",
        recipientRole: "meta_reviewer"
      },
      {
        recipient: "codex",
        recipientRole: "implementer"
      },
      {
        recipient: "claude",
        recipientRole: "reviewer"
      }
    ]);
  });

  it("keeps shared-agent converged fallback role resolution fail-closed when no explicit target metadata exists", async () => {
    const deliveryCalls: Array<{
      recipient: string;
      recipientRole: unknown;
    }> = [];

    await executeConvergedExecution(
      {
        resolved: {
          bubbleId: "b_exec_shared_fallback_001",
          repoPath: "/repo",
          bubblePaths: {
            transcriptPath: "/repo/.pairflow/transcript.ndjson",
            locksDir: "/repo/.pairflow/locks",
            sessionsPath: "/repo/.pairflow/sessions.json",
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {
            agents: {
              implementer: "codex",
              reviewer: "codex",
              meta_reviewer: "claude"
            }
          },
          worktreePath: "/repo/worktree",
          cwd: "/repo/worktree"
        } as never,
        state: {
          round: 3
        } as never,
        reviewer: "codex",
        implementer: "codex",
        summary: "converged summary",
        refs: [],
        now: new Date("2026-03-19T11:06:00.000Z"),
        convergencePolicyDiagnostics: [],
        gatePipelineDiagnostics: []
      },
      {
        appendProtocolEnvelope: async () => ({
          sequence: 23,
          envelope: {
            id: "env_conv_shared_fallback_1"
          }
        }) as never,
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: "b_exec_shared_fallback_001",
          route: "human_gate_approve",
          gateSequence: 24,
          gateEnvelope: {
            id: "env_gate_shared_fallback_1",
            ts: "2026-03-19T11:06:01.000Z",
            bubble_id: "b_exec_shared_fallback_001",
            sender: "orchestrator",
            recipient: "codex",
            type: "APPROVAL_REQUEST",
            round: 3,
            payload: {
              summary: "approval"
            },
            refs: []
          },
          state: {}
        }) as never,
        emitDeliveryNotificationAck: async (input) => {
          deliveryCalls.push({
            recipient: input.envelope.recipient,
            recipientRole: input.recipientRole
          });
          return {
            status: "accepted",
            message: "",
            sessionName: "pf_bubble",
            targetPaneIndex: 0
          };
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "converged",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          })
      }
    );

    expect(deliveryCalls[0]).toEqual({
      recipient: "codex",
      recipientRole: undefined
    });
  });

  it("retries auto-rework delivery once with warm-up options", async () => {
    const deliveryOptions: Array<{
      initialDelayMs?: number;
      deliveryAttempts?: number;
    }> = [];
    let deliveryCallCount = 0;

    const result = await executeConvergedExecution(
      {
        resolved: {
          bubbleId: "b_exec_002",
          repoPath: "/repo",
          bubblePaths: {
            transcriptPath: "/repo/.pairflow/transcript.ndjson",
            locksDir: "/repo/.pairflow/locks",
            sessionsPath: "/repo/.pairflow/sessions.json",
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {},
          worktreePath: "/repo/worktree",
          cwd: "/repo/worktree"
        } as never,
        state: {
          round: 4
        } as never,
        reviewer: "claude",
        implementer: "codex",
        summary: "converged summary",
        refs: [],
        now: new Date("2026-03-19T11:10:00.000Z"),
        convergencePolicyDiagnostics: [],
        gatePipelineDiagnostics: []
      },
      {
        appendProtocolEnvelope: async (input) => {
          expect(input.envelope.type).toBe("CONVERGENCE");
          if (input.envelope.type !== "CONVERGENCE") {
            throw new Error("Expected convergence envelope.");
          }
          expect(input.envelope.payload.findings).toBeUndefined();
          expect(input.envelope.payload.metadata).toMatchObject({
            advisory_findings_open_total: 0
          });
          return {
            sequence: 19,
            envelope: {
              id: "env_conv_2"
            }
          } as never;
        },
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: "b_exec_002",
          route: "auto_rework",
          gateSequence: 20,
          gateEnvelope: {
            id: "env_gate_2",
            ts: "2026-03-19T11:10:01.000Z",
            bubble_id: "b_exec_002",
            sender: "orchestrator",
            recipient: "codex",
            type: "PASS",
            round: 4,
            payload: {
              summary: "rework"
            },
            refs: []
          },
          state: {}
        }) as never,
        emitDeliveryNotificationAck: async (input) => {
          deliveryCallCount += 1;
          deliveryOptions.push({
            ...(input.initialDelayMs !== undefined
              ? { initialDelayMs: input.initialDelayMs }
              : {}),
            ...(input.deliveryAttempts !== undefined
              ? { deliveryAttempts: input.deliveryAttempts }
              : {})
          });
          if (deliveryCallCount === 1) {
            return {
              status: "rejected",
              message: "",
              reason: "delivery_unconfirmed",
              reason_code: "DELIVERY_ACK_REJECTED"
            };
          }
          return {
            status: "accepted",
            message: "",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          };
        },
        emitBubbleNotification: (config, commandName) => {
          void config;
          return Promise.resolve({
            kind: commandName,
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          });
        }
      }
    );

    expect(deliveryCallCount).toBe(2);
    expect(deliveryOptions).toEqual([
      {},
      {
        initialDelayMs: 5000,
        deliveryAttempts: 6
      }
    ]);
    expect(result.delivery).toEqual({
      status: "accepted",
      retried: true
    });
  });

  it("keeps all-failure aggregate reason priority and reason_code when one delivery throws", async () => {
    const result = await executeConvergedExecution(
      {
        resolved: {
          bubbleId: "b_exec_003",
          repoPath: "/repo",
          bubblePaths: {
            transcriptPath: "/repo/.pairflow/transcript.ndjson",
            locksDir: "/repo/.pairflow/locks",
            sessionsPath: "/repo/.pairflow/sessions.json",
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {},
          worktreePath: "/repo/worktree",
          cwd: "/repo/worktree"
        } as never,
        state: {
          round: 4
        } as never,
        reviewer: "claude",
        implementer: "codex",
        summary: "converged summary",
        refs: [],
        now: new Date("2026-03-19T11:20:00.000Z"),
        convergencePolicyDiagnostics: [],
        gatePipelineDiagnostics: []
      },
      {
        appendProtocolEnvelope: async () => ({
          sequence: 21,
          envelope: {
            id: "env_conv_3"
          }
        }) as never,
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: "b_exec_003",
          route: "human_gate_approve",
          gateSequence: 22,
          gateEnvelope: {
            id: "env_gate_3",
            ts: "2026-03-19T11:20:01.000Z",
            bubble_id: "b_exec_003",
            sender: "orchestrator",
            recipient: "human",
            type: "APPROVAL_REQUEST",
            round: 4,
            payload: {
              summary: "approval"
            },
            refs: []
          },
          state: {}
        }) as never,
        emitDeliveryNotificationAck: async (input) => {
          if (input.envelope.recipient === "human") {
            throw new Error("simulated tmux send failure");
          }
          if (input.envelope.recipient === "codex") {
            return {
              status: "rejected",
              message: "",
              reason: "delivery_unconfirmed",
              reason_code: "DELIVERY_ACK_REJECTED"
            };
          }
          return {
            status: "rejected",
            message: "",
            reason: "no_runtime_session",
            reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
          };
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "converged",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          })
      }
    );

    expect(result.delivery).toEqual({
      status: "rejected",
      reason: "delivery_unconfirmed",
      reason_code: "DELIVERY_ACK_REJECTED",
      retried: false
    });
  });
});
