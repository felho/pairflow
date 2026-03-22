import { describe, expect, it } from "vitest";

import { IDEATION_CONVERGED_BLOCKED } from "../../../../src/core/bubble/ideation.js";
import { prepareConvergedRouting } from "../../../../src/v11/application/converged/convergedRoutingPreparation.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("prepareConvergedRouting", () => {
  it("loads workspace routing context and enforces reviewer ownership", async () => {
    const now = new Date("2026-03-19T10:00:00.000Z");
    const callOrder: string[] = [];

    const resolvedWorkspace = {
      bubbleId: "b_test_123",
      repoPath: "/repo",
      bubblePaths: {
        statePath: "/repo/.pairflow/state.json"
      },
      bubbleConfig: {
        agents: {
          implementer: "codex",
          reviewer: "claude"
        }
      }
    } as never;
    const bubbleIdentity = {
      bubbleInstanceId: "bi_test_123",
      bubbleConfig: {
        agents: {
          implementer: "codex",
          reviewer: "claude"
        },
        marker: "updated"
      }
    } as never;

    const result = await prepareConvergedRouting(
      {
        cwd: "/repo/worktree",
        now,
        expectedStateFingerprint: "fp-1",
        expectedRound: 2,
        expectedReviewer: "claude",
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        resolveBubbleFromWorkspaceCwd: async (cwd) => {
          callOrder.push("resolveBubbleFromWorkspaceCwd");
          expect(cwd).toBe("/repo/worktree");
          return resolvedWorkspace;
        },
        ensureBubbleInstanceIdForMutation: async (input) => {
          callOrder.push("ensureBubbleInstanceIdForMutation");
          expect(input.bubbleId).toBe("b_test_123");
          expect(input.now).toBe(now);
          return bubbleIdentity;
        },
        readStateSnapshot: async (statePath) => {
          callOrder.push("readStateSnapshot");
          expect(statePath).toBe("/repo/.pairflow/state.json");
          return {
            fingerprint: "fp-1",
            state: {
              state: "RUNNING",
              round: 2,
              active_role: "reviewer",
              active_agent: "claude",
              active_since: "2026-03-19T09:55:00.000Z"
            }
          } as never;
        },
        resolveIdeationMetadata: () => {
          callOrder.push("resolveIdeationMetadata");
          return {
            mode: false,
            taskPending: false
          };
        }
      }
    );

    expect(callOrder).toEqual([
      "resolveBubbleFromWorkspaceCwd",
      "ensureBubbleInstanceIdForMutation",
      "readStateSnapshot",
      "resolveIdeationMetadata"
    ]);
    expect(result.implementer).toBe("codex");
    expect(result.reviewer).toBe("claude");
  });

  it("throws stale-state error when expected fingerprint mismatches", async () => {
    await expect(
      prepareConvergedRouting(
        {
          now: new Date("2026-03-19T10:00:00.000Z"),
          expectedStateFingerprint: "fp-expected",
          createError: (input) => new Error(toErrorMessage(input))
        },
        {
          resolveBubbleFromWorkspaceCwd: async () => ({
            bubbleId: "b_test_456",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/state.json"
            },
            bubbleConfig: {
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          ensureBubbleInstanceIdForMutation: async () => ({
            bubbleInstanceId: "bi_test_456",
            bubbleConfig: {
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          readStateSnapshot: async () => ({
            fingerprint: "fp-actual",
            state: {
              state: "RUNNING",
              round: 3,
              active_role: "reviewer",
              active_agent: "claude",
              active_since: "2026-03-19T09:50:00.000Z"
            }
          }) as never,
          resolveIdeationMetadata: () => ({
            mode: false,
            taskPending: false
          })
        }
      )
    ).rejects.toThrow(
      "AUTO_CONVERGE_STATE_STALE: Convergence validation failed: state changed before converged transition."
    );
  });

  it("blocks converged when ideation kickoff is pending", async () => {
    await expect(
      prepareConvergedRouting(
        {
          now: new Date("2026-03-19T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        {
          resolveBubbleFromWorkspaceCwd: async () => ({
            bubbleId: "b_test_789",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/state.json"
            },
            bubbleConfig: {
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          ensureBubbleInstanceIdForMutation: async () => ({
            bubbleInstanceId: "bi_test_789",
            bubbleConfig: {
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          readStateSnapshot: async () => ({
            fingerprint: "fp-ideation",
            state: {
              state: "RUNNING",
              round: 0,
              active_role: "reviewer",
              active_agent: "claude",
              active_since: "2026-03-19T09:50:00.000Z"
            }
          }) as never,
          resolveIdeationMetadata: () => ({
            mode: true,
            taskPending: true
          })
        }
      )
    ).rejects.toThrow(new RegExp(IDEATION_CONVERGED_BLOCKED, "u"));
  });
});
