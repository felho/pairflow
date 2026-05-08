import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { prepareAskHumanRouting } from "../../../../src/v11/application/askHuman/internal/delivery/askHumanRoutingPreparation.js";
import type { ResolvedBubbleWorkspace } from "../../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";

class AskHumanRoutingTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanRoutingTestError";
  }
}

describe("prepareAskHumanRouting", () => {
  it("builds ask-human routing context and validates RUNNING state prerequisites", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const callOrder: string[] = [];

    const resolved = {
      bubbleId: "b_ask_human_01",
      repoPath: "/repo",
      bubblePaths: {
        statePath: "/repo/.pairflow/bubbles/b_ask_human_01/state.json"
      },
      bubbleConfig: { id: "b_ask_human_01" }
    } as ResolvedBubbleWorkspace;

    const updatedBubbleConfig = {
      id: "b_ask_human_01",
      bubble_instance_id: "bi_1234567890_abcdef0123456789"
    } as never;

    const result = await prepareAskHumanRouting(
      {
        question: "  Need decision on migration strategy? ",
        refs: [" artifact://a ", "artifact://a", "artifact://b", " "],
        cwd: "/repo/worktrees/b_ask_human_01",
        now,
        createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async (cwd) => {
          callOrder.push("resolveBubbleFromWorkspaceCwd");
          expect(cwd).toBe("/repo/worktrees/b_ask_human_01");
          return resolved;
        },
        ensureBubbleInstanceIdForMutation: async (input) => {
          callOrder.push("ensureBubbleInstanceIdForMutation");
          expect(input.now).toBe(now);
          expect(input.bubbleId).toBe("b_ask_human_01");
          expect(input.bubbleConfig).toBe(resolved.bubbleConfig);
          return {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: updatedBubbleConfig,
            backfilled: false
          };
        },
        readStateSnapshot: async (statePath) => {
          callOrder.push("readStateSnapshot");
          expect(statePath).toBe("/repo/.pairflow/bubbles/b_ask_human_01/state.json");
          return {
            state: {
              state: "RUNNING",
              round: 3,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z"
            },
            fingerprint: "fp_running_01"
          } as never;
        }
      }
    );

    expect(callOrder).toEqual([
      "resolveBubbleFromWorkspaceCwd",
      "ensureBubbleInstanceIdForMutation",
      "readStateSnapshot"
    ]);
    expect(result.nowIso).toBe("2026-02-21T12:10:00.000Z");
    expect(result.question).toBe("Need decision on migration strategy?");
    expect(result.refs).toEqual(["artifact://a", "artifact://b"]);
    expect(result.resolved.bubbleConfig).toBe(updatedBubbleConfig);
    expect(result.state.state).toBe("RUNNING");
  });

  it("throws when ask-human is invoked outside RUNNING state", async () => {
    await expect(
      prepareAskHumanRouting(
        {
          question: "Need human input",
          now: new Date("2026-02-21T12:10:00.000Z"),
          createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
        },
        {
          resolveBubbleFromWorkspaceCwd: async () =>
            ({
              bubbleId: "b_ask_human_02",
              repoPath: "/repo",
              bubblePaths: {
                statePath: "/repo/.pairflow/bubbles/b_ask_human_02/state.json"
              },
              bubbleConfig: { id: "b_ask_human_02" }
            }) as never,
          ensureBubbleInstanceIdForMutation: async () =>
            ({
              bubbleInstanceId: "bi_1234567890_abcdef0123456789",
              bubbleConfig: { id: "b_ask_human_02" },
              backfilled: false
            }) as never,
          readStateSnapshot: async () =>
            ({
              state: {
                state: "WAITING_HUMAN",
                round: 1,
                active_agent: "codex",
                active_role: "implementer",
                active_since: "2026-02-21T12:00:00.000Z"
              },
              fingerprint: "fp_waiting_human_01"
            }) as never
        }
      )
    ).rejects.toMatchObject({
      name: "AskHumanRoutingTestError",
      message:
        "ASK_HUMAN_STATE_NOT_RUNNING: ask-human can only be used while bubble is RUNNING (current: WAITING_HUMAN)."
    });
  });

  it("omits activation when loaded execution context has blank execution_id without authoritative context", async () => {
    const result = await prepareAskHumanRouting(
      {
        question: "Need human input",
        now: new Date("2026-02-21T12:10:00.000Z"),
        createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_ask_human_blank_execution_id",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_ask_human_blank_execution_id/state.json"
            },
            bubbleConfig: { id: "b_ask_human_blank_execution_id" }
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: { id: "b_ask_human_blank_execution_id" },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                active_role: "implementer",
                awaited_output_type: "pass_result",
                handoff_id: "implementer:b_ask_human_blank_execution_id:round:2:attempt:1",
                execution_id: "   ",
                round: 2,
                started_at: "2026-02-21T12:00:00.000Z",
                deadline_at: "2026-02-21T13:00:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_blank_execution_id_01"
          }) as never
      }
    );

    expect(result.activation).toBeUndefined();
  });

  it("omits activation when loaded execution context is missing execution_id without authoritative context", async () => {
    const result = await prepareAskHumanRouting(
      {
        question: "Need human input",
        now: new Date("2026-02-21T12:10:00.000Z"),
        createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_ask_human_missing_execution_id",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_ask_human_missing_execution_id/state.json"
            },
            bubbleConfig: { id: "b_ask_human_missing_execution_id" }
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: { id: "b_ask_human_missing_execution_id" },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                active_role: "implementer",
                awaited_output_type: "pass_result",
                handoff_id: "implementer:b_ask_human_missing_execution_id:round:2:attempt:1",
                round: 2,
                started_at: "2026-02-21T12:00:00.000Z",
                deadline_at: "2026-02-21T13:00:00.000Z",
                attempt: 1
              } as never
            },
            fingerprint: "fp_missing_execution_id_01"
          }) as never
      }
    );

    expect(result.activation).toBeUndefined();
  });

  it("maps activation from loaded state execution context when authoritative context is absent", async () => {
    const result = await prepareAskHumanRouting(
      {
        question: "Need human input",
        now: new Date("2026-02-21T12:10:00.000Z"),
        createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_ask_human_state_activation",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_ask_human_state_activation/state.json"
            },
            bubbleConfig: { id: "b_ask_human_state_activation" }
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: { id: "b_ask_human_state_activation" },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                active_role: "implementer",
                awaited_output_type: "pass_result",
                handoff_id: "implementer:b_ask_human_state_activation:round:2:attempt:1",
                execution_id: "exec_ask_human_state_activation",
                round: 2,
                started_at: "2026-02-21T12:00:00.000Z",
                deadline_at: "2026-02-21T13:00:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ask_human_state_activation"
          }) as never
      }
    );

    expect(result.activation).toEqual({
      handoff_id: "implementer:b_ask_human_state_activation:round:2:attempt:1",
      execution_id: "exec_ask_human_state_activation",
      expected_role: "implementer",
      expected_round: 2,
      expected_state_fingerprint: "fp_ask_human_state_activation"
    });
  });

  it("surfaces authoritative activation context when the authoritative snapshot stays coherent", async () => {
    const result = await prepareAskHumanRouting(
      {
        question: "Need human input",
        now: new Date("2026-02-21T12:10:00.000Z"),
        authoritativeContext: {
          repo: "/repo",
          bubble_id: "b_ask_human_authoritative",
          handoff_id: "implementer:b_ask_human_authoritative:round:3:attempt:1",
          execution_id: "exec_ask_human_authoritative",
          expected_role: "implementer",
          expected_round: 3,
          expected_state_fingerprint: "fp_ask_human_authoritative",
          worktree_path: "/repo/worktrees/b_ask_human_authoritative",
          resolved: {
            bubbleId: "b_ask_human_authoritative",
            repoPath: "/repo",
            worktreePath: "/repo/worktrees/b_ask_human_authoritative",
            cwd: "/repo/worktrees/b_ask_human_authoritative",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_ask_human_authoritative/state.json",
              worktreePath: "/repo/worktrees/b_ask_human_authoritative"
            },
            bubbleConfig: { id: "b_ask_human_authoritative" }
          } as never,
          loaded_state: {
            state: {
              bubble_id: "b_ask_human_authoritative",
              state: "RUNNING",
              round: 3,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                active_role: "implementer",
                awaited_output_type: "pass_result",
                handoff_id: "implementer:b_ask_human_authoritative:round:3:attempt:1",
                execution_id: "exec_ask_human_authoritative",
                round: 3,
                started_at: "2026-02-21T12:00:00.000Z",
                deadline_at: "2026-02-21T13:00:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ask_human_authoritative"
          } as never,
          execution_context: {
            active_role: "implementer",
            awaited_output_type: "pass_result",
            handoff_id: "implementer:b_ask_human_authoritative:round:3:attempt:1",
            execution_id: "exec_ask_human_authoritative",
            round: 3,
            started_at: "2026-02-21T12:00:00.000Z",
            deadline_at: "2026-02-21T13:00:00.000Z",
            attempt: 1
          }
        },
        createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () => {
          throw new Error("resolveBubbleFromWorkspaceCwd should not be used with authoritative context");
        },
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: { id: "b_ask_human_authoritative" },
            backfilled: false
          }) as never,
        readStateSnapshot: async () => {
          throw new Error("readStateSnapshot should not be used with authoritative context");
        }
      }
    );

    expect(result.activation).toEqual({
      handoff_id: "implementer:b_ask_human_authoritative:round:3:attempt:1",
      execution_id: "exec_ask_human_authoritative",
      expected_role: "implementer",
      expected_round: 3,
      expected_state_fingerprint: "fp_ask_human_authoritative"
    });
  });

  it("omits activation when authoritative context disagrees with the live loaded-state role", async () => {
    const result = await prepareAskHumanRouting(
      {
        question: "Need human input",
        now: new Date("2026-02-21T12:10:00.000Z"),
        authoritativeContext: {
          repo: "/repo",
          bubble_id: "b_ask_human_authoritative_mismatch",
          handoff_id: "implementer:b_ask_human_authoritative_mismatch:round:3:attempt:1",
          execution_id: "exec_ask_human_authoritative_mismatch",
          expected_role: "reviewer",
          expected_round: 3,
          expected_state_fingerprint: "fp_ask_human_authoritative_mismatch",
          worktree_path: "/repo/worktrees/b_ask_human_authoritative_mismatch",
          resolved: {
            bubbleId: "b_ask_human_authoritative_mismatch",
            repoPath: "/repo",
            worktreePath: "/repo/worktrees/b_ask_human_authoritative_mismatch",
            cwd: "/repo/worktrees/b_ask_human_authoritative_mismatch",
            bubblePaths: {
              statePath:
                "/repo/.pairflow/bubbles/b_ask_human_authoritative_mismatch/state.json",
              worktreePath: "/repo/worktrees/b_ask_human_authoritative_mismatch"
            },
            bubbleConfig: { id: "b_ask_human_authoritative_mismatch" }
          } as never,
          loaded_state: {
            state: {
              bubble_id: "b_ask_human_authoritative_mismatch",
              state: "RUNNING",
              round: 3,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                active_role: "reviewer",
                awaited_output_type: "pass_result",
                handoff_id: "implementer:b_ask_human_authoritative_mismatch:round:3:attempt:1",
                execution_id: "exec_ask_human_authoritative_mismatch",
                round: 3,
                started_at: "2026-02-21T12:00:00.000Z",
                deadline_at: "2026-02-21T13:00:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ask_human_authoritative_mismatch"
          } as never,
          execution_context: {
            active_role: "reviewer",
            awaited_output_type: "pass_result",
            handoff_id: "implementer:b_ask_human_authoritative_mismatch:round:3:attempt:1",
            execution_id: "exec_ask_human_authoritative_mismatch",
            round: 3,
            started_at: "2026-02-21T12:00:00.000Z",
            deadline_at: "2026-02-21T13:00:00.000Z",
            attempt: 1
          }
        },
        createError: (message: PairflowCommandErrorInput) =>
          new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () => {
          throw new Error("resolveBubbleFromWorkspaceCwd should not be used with authoritative context");
        },
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: { id: "b_ask_human_authoritative_mismatch" },
            backfilled: false
          }) as never,
        readStateSnapshot: async () => {
          throw new Error("readStateSnapshot should not be used with authoritative context");
        }
      }
    );

    expect(result.activation).toBeUndefined();
  });

  it("omits activation when implementer execution_id reuses handoff_id", async () => {
    const result = await prepareAskHumanRouting(
      {
        question: "Need human input",
        now: new Date("2026-02-21T12:10:00.000Z"),
        createError: (message: PairflowCommandErrorInput) =>
          new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_ask_human_same_id_activation",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_ask_human_same_id_activation/state.json"
            },
            bubbleConfig: { id: "b_ask_human_same_id_activation" }
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: { id: "b_ask_human_same_id_activation" },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                active_role: "implementer",
                awaited_output_type: "pass_result",
                handoff_id: "implementer:b_ask_human_same_id_activation:round:2:attempt:1",
                execution_id:
                  "implementer:b_ask_human_same_id_activation:round:2:attempt:1",
                round: 2,
                started_at: "2026-02-21T12:00:00.000Z",
                deadline_at: "2026-02-21T13:00:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ask_human_same_id_activation"
          }) as never
      }
    );

    expect(result.activation).toBeUndefined();
  });

  it("omits activation when reviewer invokes ask-human from RUNNING state", async () => {
    const result = await prepareAskHumanRouting(
      {
        question: "Need reviewer-side human input",
        now: new Date("2026-02-21T12:10:00.000Z"),
        createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_ask_human_reviewer_no_activation",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_ask_human_reviewer_no_activation/state.json"
            },
            bubbleConfig: { id: "b_ask_human_reviewer_no_activation" }
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: { id: "b_ask_human_reviewer_no_activation" },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              state: "RUNNING",
              round: 2,
              active_agent: "claude",
              active_role: "reviewer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                active_role: "reviewer",
                awaited_output_type: "pass_result",
                handoff_id: "reviewer:b_ask_human_reviewer_no_activation:round:2:attempt:1",
                execution_id: "exec_ask_human_reviewer_no_activation",
                round: 2,
                started_at: "2026-02-21T12:00:00.000Z",
                deadline_at: "2026-02-21T13:00:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ask_human_reviewer_no_activation"
          }) as never
      }
    );

    expect(result.activation).toBeUndefined();
  });

  const invalidRunningStateCases: Array<{
    name: string;
    state: Record<string, unknown>;
    expectedMessage: string;
  }> = [
    {
      name: "throws when RUNNING state has round lower than 1",
      state: {
        state: "RUNNING",
        round: 0,
        active_agent: "codex",
        active_role: "implementer",
        active_since: "2026-02-21T12:00:00.000Z"
      },
      expectedMessage: "ASK_HUMAN_RUNNING_ROUND_INVALID: RUNNING state must have round >= 1 (found 0)."
    },
    {
      name: "throws when RUNNING state is missing active agent context",
      state: {
        state: "RUNNING",
        round: 2,
        active_agent: null,
        active_role: "implementer",
        active_since: "2026-02-21T12:00:00.000Z"
      },
      expectedMessage:
        "ASK_HUMAN_ACTIVE_CONTEXT_MISSING: RUNNING state is missing active agent context; cannot emit HUMAN_QUESTION."
    },
    {
      name: "throws when RUNNING state active role is meta_reviewer",
      state: {
        state: "RUNNING",
        round: 2,
        active_agent: "meta-reviewer",
        active_role: "meta_reviewer",
        active_since: "2026-02-21T12:00:00.000Z"
      },
      expectedMessage:
        "ASK_HUMAN_ROLE_UNSUPPORTED: ask-human cannot be used from meta_reviewer role while bubble is RUNNING."
    }
  ];

  for (const testCase of invalidRunningStateCases) {
    it(testCase.name, async () => {
      await expect(
        prepareAskHumanRouting(
          {
            question: "Need human input",
            now: new Date("2026-02-21T12:10:00.000Z"),
            createError: (message: PairflowCommandErrorInput) => new AskHumanRoutingTestError(toErrorMessage(message))
          },
          {
            resolveBubbleFromWorkspaceCwd: async () =>
              ({
                bubbleId: "b_ask_human_invalid_running",
                repoPath: "/repo",
                bubblePaths: {
                  statePath: "/repo/.pairflow/bubbles/b_ask_human_invalid_running/state.json"
                },
                bubbleConfig: { id: "b_ask_human_invalid_running" }
              }) as never,
            ensureBubbleInstanceIdForMutation: async () =>
              ({
                bubbleInstanceId: "bi_1234567890_abcdef0123456789",
                bubbleConfig: { id: "b_ask_human_invalid_running" },
                backfilled: false
              }) as never,
            readStateSnapshot: async () =>
              ({
                state: testCase.state,
                fingerprint: "fp_invalid_running_01"
              }) as never
          }
        )
      ).rejects.toMatchObject({
        name: "AskHumanRoutingTestError",
        message: testCase.expectedMessage
      });
    });
  }
});
