import { describe, expect, it } from "vitest";

import { IDEATION_CONVERGED_BLOCKED } from "../../../../src/v11/shared/ideation/ideationReasonCodes.js";import type {
  AgentName
} from "../../../../src/v11/domain/agentIdentity/agentIdentity.js";
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
    expect(result.effectiveLoopMode).toBe("full");
  });

  it("allows converged routing from the active implementer when meta_only activation is proven", async () => {
    const result = await prepareConvergedRouting(
      {
        now: new Date("2026-03-19T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () => ({
          bubbleId: "b_test_meta_only_active",
          repoPath: "/repo",
          bubblePaths: {
            statePath: "/repo/.pairflow/state.json"
          },
          bubbleConfig: {
            review_policy: {
              review_loop_mode: "meta_only",
              reviewer_blocking_min_severity: "P2",
              meta_review_auto_rework_min_severity: "P2",
              meta_review_consecutive_clean_runs_required: 1,
            },
            agents: {
              implementer: "codex",
              reviewer: "claude"
            }
          }
        }) as never,
        ensureBubbleInstanceIdForMutation: async () => ({
          bubbleInstanceId: "bi_test_meta_only_active",
          bubbleConfig: {
            review_policy: {
              review_loop_mode: "meta_only",
              reviewer_blocking_min_severity: "P2",
              meta_review_auto_rework_min_severity: "P2",
              meta_review_consecutive_clean_runs_required: 1,
            },
            agents: {
              implementer: "codex",
              reviewer: "claude"
            }
          }
        }) as never,
        readStateSnapshot: async () => ({
          fingerprint: "fp-meta-only",
          state: {
            bubble_id: "b_test_meta_only_active",
            state: "RUNNING",
            round: 3,
            active_role: "implementer",
            active_agent: "codex",
            active_since: "2026-03-19T09:55:00.000Z",
            last_command_at: "2026-03-19T09:59:00.000Z",
            round_role_history: [],
            execution_context: {
              active_role: "implementer",
              awaited_output_type: "pass_result",
              handoff_id: "implementer:b_test_meta_only_active:round:3:attempt:1",
              execution_id: "exec_meta_only_active_round_3",
              round: 3,
              started_at: "2026-03-19T09:55:00.000Z",
              deadline_at: "2026-03-19T10:25:00.000Z",
              attempt: 1
            }
          }
        }) as never,
        resolveIdeationMetadata: () => ({
          mode: false,
          taskPending: false
        })
      }
    );

    expect(result.implementer).toBe("codex");
    expect(result.reviewer).toBe("claude");
    expect(result.effectiveLoopMode).toBe("meta_only");
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

  it("throws stale-state error when expected round mismatches", async () => {
    await expect(
      prepareConvergedRouting(
        {
          now: new Date("2026-03-19T10:00:00.000Z"),
          expectedRound: 2,
          createError: (input) => new Error(toErrorMessage(input))
        },
        {
          resolveBubbleFromWorkspaceCwd: async () => ({
            bubbleId: "b_test_round_mismatch",
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
            bubbleInstanceId: "bi_test_round_mismatch",
            bubbleConfig: {
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          readStateSnapshot: async () => ({
            fingerprint: "fp-round",
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
      "AUTO_CONVERGE_STATE_STALE: Convergence validation failed: expected round 2, got 3."
    );
  });

  it("throws stale-state error when expected reviewer mismatches", async () => {
    await expect(
      prepareConvergedRouting(
        {
          now: new Date("2026-03-19T10:00:00.000Z"),
          expectedReviewer: "other-reviewer" as AgentName,
          createError: (input) => new Error(toErrorMessage(input))
        },
        {
          resolveBubbleFromWorkspaceCwd: async () => ({
            bubbleId: "b_test_reviewer_mismatch",
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
            bubbleInstanceId: "bi_test_reviewer_mismatch",
            bubbleConfig: {
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          readStateSnapshot: async () => ({
            fingerprint: "fp-reviewer",
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
      "AUTO_CONVERGE_STATE_STALE: Convergence validation failed: expected reviewer other-reviewer, got claude."
    );
  });

  it("fails closed to reviewer ownership when meta_only proof is incomplete", async () => {
    await expect(
      prepareConvergedRouting(
        {
          now: new Date("2026-03-19T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        {
          resolveBubbleFromWorkspaceCwd: async () => ({
            bubbleId: "b_test_meta_only_unproven",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/state.json"
            },
            bubbleConfig: {
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P2",
                meta_review_auto_rework_min_severity: "P2",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          ensureBubbleInstanceIdForMutation: async () => ({
            bubbleInstanceId: "bi_test_meta_only_unproven",
            bubbleConfig: {
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P2",
                meta_review_auto_rework_min_severity: "P2",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          }) as never,
          readStateSnapshot: async () => ({
            fingerprint: "fp-meta-only-unproven",
            state: {
              bubble_id: "b_test_meta_only_unproven",
              state: "RUNNING",
              round: 3,
              active_role: "implementer",
              active_agent: "codex",
              active_since: "2026-03-19T09:55:00.000Z",
              last_command_at: "2026-03-19T09:59:00.000Z",
              round_role_history: [],
              execution_context: {
                active_role: "implementer",
                awaited_output_type: "pass_result",
                handoff_id: "implementer:b_test_meta_only_unproven:round:2:attempt:1",
                execution_id: "exec_meta_only_unproven_round_3",
                round: 2,
                started_at: "2026-03-19T09:55:00.000Z",
                deadline_at: "2026-03-19T10:25:00.000Z",
                attempt: 1
              }
            }
          }) as never,
          resolveIdeationMetadata: () => ({
            mode: false,
            taskPending: false
          })
        }
      )
    ).rejects.toThrow(
      "CONVERGED_ACTIVE_ROLE_UNSUPPORTED: converged may only be invoked by the active reviewer (active role: implementer)."
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

  it("reuses authoritative actor context without re-resolving workspace and still revalidates persisted state", async () => {
    const now = new Date("2026-03-19T10:05:00.000Z");
    let resolveBubbleCalls = 0;
    let readStateCalls = 0;

    const prepared = await prepareConvergedRouting(
      {
        now,
        authoritativeContext: {
          repo: "/repo",
          bubble_id: "b_conv_ctx_01",
          handoff_id: "reviewer:b_conv_ctx_01:round:3:attempt:1",
          execution_id: "exec_conv_ctx_01_round3",
          expected_role: "reviewer",
          expected_round: 3,
          expected_state_fingerprint: "fp_conv_ctx_01",
          worktree_path: "/repo/.pairflow/worktrees/b_conv_ctx_01",
          resolved: {
            bubbleId: "b_conv_ctx_01",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_conv_ctx_01/state.json",
              worktreePath: "/repo/.pairflow/worktrees/b_conv_ctx_01"
            },
            bubbleConfig: {
              agents: {
                implementer: "codex",
                reviewer: "claude"
              }
            }
          } as never,
          loaded_state: {
            fingerprint: "fp_conv_ctx_01",
            state: {
              state: "RUNNING",
              round: 3,
              active_role: "reviewer",
              active_agent: "claude",
              active_since: "2026-03-19T09:55:00.000Z"
            }
          } as never,
          execution_context: {
            handoff_id: "reviewer:b_conv_ctx_01:round:3:attempt:1",
            execution_id: "exec_conv_ctx_01_round3",
            round: 3
          } as never
        },
        expectedStateFingerprint: "fp_conv_ctx_01",
        expectedRound: 3,
        expectedReviewer: "claude",
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () => {
          resolveBubbleCalls += 1;
          throw new Error("resolveBubbleFromWorkspaceCwd should not run");
        },
        ensureBubbleInstanceIdForMutation: async () => ({
          bubbleInstanceId: "bi_conv_ctx_01",
          bubbleConfig: {
            agents: {
              implementer: "codex",
              reviewer: "claude"
            }
          }
        }) as never,
        readStateSnapshot: async (statePath) => {
          readStateCalls += 1;
          expect(statePath).toBe("/repo/.pairflow/bubbles/b_conv_ctx_01/state.json");
          return {
            fingerprint: "fp_conv_ctx_01",
            state: {
              state: "RUNNING",
              round: 3,
              active_role: "reviewer",
              active_agent: "claude",
              active_since: "2026-03-19T09:55:00.000Z"
            }
          } as never;
        },
        resolveIdeationMetadata: () => ({
          mode: false,
          taskPending: false
        })
      }
    );

    expect(resolveBubbleCalls).toBe(0);
    expect(readStateCalls).toBe(1);
    expect(prepared.state.round).toBe(3);
    expect(prepared.resolved.cwd).toBe("/repo/.pairflow/worktrees/b_conv_ctx_01");
  });
});
