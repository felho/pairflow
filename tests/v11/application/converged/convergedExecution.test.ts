import { describe, expect, it } from "vitest";

import { deliveryTargetRoleMetadataKey } from "../../../../src/types/protocol.js";
import { executeConvergedExecution } from "../../../../src/v11/application/converged/convergedExecution.js";

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
        convergencePolicyDiagnostics: ["diagnostic-a"]
      },
      {
        appendProtocolEnvelope: async (input) => {
          expect(input.envelope.payload.findings).toEqual([
            {
              severity: "P2",
              title: "Follow-up",
              refs: ["artifact://review/follow-up.md"]
            }
          ]);
          expect(input.envelope.payload.metadata).toMatchObject({
            advisory_findings_open_total: 1,
            convergence_policy_diagnostics: ["diagnostic-a"]
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
        emitTmuxDeliveryNotification: async (input) => {
          deliveryCalls.push({
            recipient: input.envelope.recipient,
            roleMetadata: input.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey]
          });
          if (input.envelope.recipient === "codex") {
            return {
              delivered: false,
              message: "",
              reason: "delivery_unconfirmed"
            };
          }
          return {
            delivered: true,
            message: ""
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
      delivered: false,
      reason: "partial_delivery_failed",
      retried: false
    });
    expect(notifications).toEqual(["converged"]);
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
        convergencePolicyDiagnostics: []
      },
      {
        appendProtocolEnvelope: async (input) => {
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
        emitTmuxDeliveryNotification: async (input) => {
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
              delivered: false,
              message: "",
              reason: "delivery_unconfirmed"
            };
          }
          return {
            delivered: true,
            message: ""
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
      delivered: true,
      retried: true
    });
  });
});
