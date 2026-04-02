import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { IDEATION_PASS_BLOCKED } from "../../../../src/core/bubble/ideation.js";
import { preparePassWorkspaceContext } from "../../../../src/v11/shared/pass/passWorkspaceContextPreparation.js";

class SyntheticPassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticPassCommandError";
  }
}

describe("passWorkspaceContextPreparation", () => {
  it("prepares resolved workspace context and forwards updated agent mapping to handoff resolver", async () => {
    const now = new Date("2026-03-19T21:50:00.000Z");
    const nowIso = now.toISOString();

    const initialConfig = {
      id: "b_pass_ctx_01",
      agents: {
        implementer: "codex",
        reviewer: "claude"
      }
    } as never;
    const backfilledConfig = {
      id: "b_pass_ctx_01",
      agents: {
        implementer: "claude",
        reviewer: "codex"
      }
    } as never;
    const resolved = {
      bubbleId: "b_pass_ctx_01",
      bubbleConfig: initialConfig,
      bubblePaths: {
        statePath: "/repo/.pairflow/bubbles/b_pass_ctx_01/state.json"
      },
      repoPath: "/repo",
      worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_01",
      cwd: "/repo/.pairflow/worktrees/b_pass_ctx_01"
    } as never;

    let handoffInput: {
      implementer: string;
      reviewer: string;
      nowIso: string;
    } | undefined;

    const prepared = await preparePassWorkspaceContext(
      {
        cwd: "/repo/.pairflow/worktrees/b_pass_ctx_01",
        now,
        nowIso,
        createError: (message: PairflowCommandErrorInput) => new SyntheticPassCommandError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () => resolved,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: backfilledConfig,
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              state: "RUNNING",
              round: 1
            },
            fingerprint: "fp_ctx_01"
          }) as never,
        resolveIdeationMetadata: () =>
          ({
            mode: true,
            taskPending: false
          }) as never,
        resolvePassHandoff: (input) => {
          handoffInput = {
            implementer: input.implementer,
            reviewer: input.reviewer,
            nowIso: input.nowIso
          };
          return {
            senderAgent: input.implementer,
            senderRole: "implementer",
            recipientAgent: input.reviewer,
            recipientRole: "reviewer",
            envelopeRound: 1,
            nextRound: 1
          };
        }
      }
    );

    expect(prepared.resolved.bubbleConfig).toBe(backfilledConfig);
    expect(prepared.bubbleIdentity.bubbleConfig).toBe(backfilledConfig);
    expect(prepared.implementer).toBe("claude");
    expect(prepared.reviewer).toBe("codex");
    expect(prepared.handoff.senderAgent).toBe("claude");
    expect(handoffInput).toEqual({
      implementer: "claude",
      reviewer: "codex",
      nowIso
    });
  });

  it("rejects when ideation kickoff is still pending", async () => {
    const now = new Date("2026-03-19T21:55:00.000Z");
    const nowIso = now.toISOString();

    await expect(
      preparePassWorkspaceContext(
        {
          cwd: "/repo/.pairflow/worktrees/b_pass_ctx_02",
          now,
          nowIso,
          createError: (message: PairflowCommandErrorInput) => new SyntheticPassCommandError(toErrorMessage(message))
        },
        {
          resolveBubbleFromWorkspaceCwd: async () =>
            ({
              bubbleId: "b_pass_ctx_02",
              bubbleConfig: {
                id: "b_pass_ctx_02",
                agents: {
                  implementer: "codex",
                  reviewer: "claude"
                }
              },
              bubblePaths: {
                statePath: "/repo/.pairflow/bubbles/b_pass_ctx_02/state.json"
              },
              repoPath: "/repo",
              worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_02",
              cwd: "/repo/.pairflow/worktrees/b_pass_ctx_02"
            }) as never,
          ensureBubbleInstanceIdForMutation: async () =>
            ({
              bubbleInstanceId: "bi_1234567890_abcdef0123456789",
              bubbleConfig: {
                id: "b_pass_ctx_02",
                agents: {
                  implementer: "codex",
                  reviewer: "claude"
                }
              },
              backfilled: false
            }) as never,
          readStateSnapshot: async () =>
            ({
              state: {
                state: "RUNNING",
                round: 0
              },
              fingerprint: "fp_ctx_02"
            }) as never,
          resolveIdeationMetadata: () =>
            ({
              mode: true,
              taskPending: true
            }) as never
        }
      )
    ).rejects.toThrow(
      `${IDEATION_PASS_BLOCKED}: ideation kickoff is required before PASS handoff.`
    );
  });

  it("reuses authoritative actor context without re-resolving workspace or state", async () => {
    const now = new Date("2026-03-19T22:05:00.000Z");
    const nowIso = now.toISOString();
    let resolveBubbleCalls = 0;
    let readStateCalls = 0;

    const prepared = await preparePassWorkspaceContext(
      {
        now,
        nowIso,
        authoritativeContext: {
          repo: "/repo",
          bubble_id: "b_pass_ctx_03",
          handoff_id: "implementer:b_pass_ctx_03:round:2:attempt:1",
          expected_role: "implementer",
          expected_round: 2,
          expected_state_fingerprint: "fp_ctx_03",
          worktree_path: "/repo/.pairflow/worktrees/b_pass_ctx_03",
          resolved: {
            bubbleId: "b_pass_ctx_03",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_pass_ctx_03/state.json",
              worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_03"
            },
            bubbleConfig: {
              id: "b_pass_ctx_03",
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          } as never,
          loaded_state: {
            state: {
              state: "RUNNING",
              round: 2
            },
            fingerprint: "fp_ctx_03"
          } as never,
          execution_context: {
            handoff_id: "implementer:b_pass_ctx_03:round:2:attempt:1",
            round: 2
          } as never
        },
        createError: (message: PairflowCommandErrorInput) =>
          new SyntheticPassCommandError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () => {
          resolveBubbleCalls += 1;
          throw new Error("resolveBubbleFromWorkspaceCwd should not run");
        },
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: {
              id: "b_pass_ctx_03",
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            },
            backfilled: false
          }) as never,
        readStateSnapshot: async () => {
          readStateCalls += 1;
          throw new Error("readStateSnapshot should not run");
        },
        resolveIdeationMetadata: () =>
          ({
            mode: true,
            taskPending: false
          }) as never,
        resolvePassHandoff: (input) =>
          ({
            senderAgent: input.implementer,
            senderRole: "implementer",
            recipientAgent: input.reviewer,
            recipientRole: "reviewer",
            envelopeRound: 2,
            nextRound: 2
          }) as never
      }
    );

    expect(resolveBubbleCalls).toBe(0);
    expect(readStateCalls).toBe(0);
    expect(prepared.loadedState.fingerprint).toBe("fp_ctx_03");
    expect(prepared.state.round).toBe(2);
    expect(prepared.resolved.cwd).toBe("/repo/.pairflow/worktrees/b_pass_ctx_03");
  });
});
