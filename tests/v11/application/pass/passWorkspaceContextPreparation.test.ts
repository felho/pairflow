import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { IDEATION_PASS_BLOCKED } from "../../../../src/v11/shared/ideation/ideationReasonCodes.js";
import { preparePassWorkspaceContext } from "../../../../src/v11/application/pass/internal/normalPass/passWorkspaceContextPreparation.js";

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
        reviewer: "claude",
        meta_reviewer: "codex"
      }
    } as never;
    const backfilledConfig = {
      id: "b_pass_ctx_01",
      agents: {
        implementer: "claude",
        reviewer: "codex",
        meta_reviewer: "claude"
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
      metaReviewer: string;
      effectiveLoopMode: string;
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
            metaReviewer: input.metaReviewer,
            effectiveLoopMode: input.effectiveLoopMode,
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
    expect(prepared.metaReviewer).toBe("claude");
    expect(prepared.handoff.senderAgent).toBe("claude");
    expect(handoffInput).toEqual({
      implementer: "claude",
      reviewer: "codex",
      metaReviewer: "claude",
      effectiveLoopMode: "full",
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
                  reviewer: "claude",
                  meta_reviewer: "codex"
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
                  reviewer: "claude",
                  meta_reviewer: "codex"
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
          execution_id: "exec_pass_ctx_03_round2",
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
                reviewer: "claude",
                meta_reviewer: "codex"
              }
            }
          } as never,
          loaded_state: {
            state: {
              bubble_id: "b_pass_ctx_03",
              state: "RUNNING",
              round: 2,
              active_role: "implementer",
              execution_context: {
                handoff_id: "implementer:b_pass_ctx_03:round:2:attempt:1",
                execution_id: "exec_pass_ctx_03_round2",
                round: 2,
                active_role: "implementer"
              }
            },
            fingerprint: "fp_ctx_03"
          } as never,
          execution_context: {
            handoff_id: "implementer:b_pass_ctx_03:round:2:attempt:1",
            execution_id: "exec_pass_ctx_03_round2",
            round: 2,
            active_role: "implementer"
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
                reviewer: "claude",
                meta_reviewer: "codex"
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

  it("rejects incoherent authoritative context snapshots before any workspace fallback", async () => {
    let resolveBubbleCalls = 0;
    let readStateCalls = 0;

    await expect(
      preparePassWorkspaceContext(
        {
          now: new Date("2026-03-19T22:06:00.000Z"),
          nowIso: "2026-03-19T22:06:00.000Z",
          authoritativeContext: {
            repo: "/repo",
            bubble_id: "b_pass_ctx_04",
            handoff_id: "implementer:b_pass_ctx_04:round:2:attempt:1",
            execution_id: "exec_pass_ctx_04_round2",
            expected_role: "implementer",
            expected_round: 2,
            expected_state_fingerprint: "fp_ctx_04",
            worktree_path: "/repo/.pairflow/worktrees/b_pass_ctx_04",
            resolved: {
              bubbleId: "b_pass_ctx_04_conflict",
              repoPath: "/repo",
              bubblePaths: {
                statePath: "/repo/.pairflow/bubbles/b_pass_ctx_04/state.json",
                worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_04"
              },
              bubbleConfig: {
                id: "b_pass_ctx_04",
                agents: {
                  implementer: "codex",
                  reviewer: "claude",
                  meta_reviewer: "codex"
                }
              }
            } as never,
            loaded_state: {
              state: {
                bubble_id: "b_pass_ctx_04",
                state: "RUNNING",
                round: 2,
                active_role: "implementer",
                execution_context: {
                  handoff_id: "implementer:b_pass_ctx_04:round:2:attempt:1",
                  execution_id: "exec_pass_ctx_04_round2",
                  round: 2,
                  active_role: "implementer"
                }
              },
              fingerprint: "fp_ctx_04"
            } as never,
            execution_context: {
              handoff_id: "implementer:b_pass_ctx_04:round:2:attempt:1",
              execution_id: "exec_pass_ctx_04_round2",
              round: 2,
              active_role: "implementer"
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
          ensureBubbleInstanceIdForMutation: async () => {
            throw new Error("ensureBubbleInstanceIdForMutation should not run");
          },
          readStateSnapshot: async () => {
            readStateCalls += 1;
            throw new Error("readStateSnapshot should not run");
          }
        }
      )
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "Canonical actor emit resolved bubble mismatch: expected b_pass_ctx_04, resolved b_pass_ctx_04_conflict."
    });

    expect(resolveBubbleCalls).toBe(0);
    expect(readStateCalls).toBe(0);
  });

  it("normalizes missing execution_id in authoritative snapshot state to ACTOR_EMIT_CONTEXT_INVALID", async () => {
    await expect(
      preparePassWorkspaceContext(
        {
          now: new Date("2026-03-19T22:07:00.000Z"),
          nowIso: "2026-03-19T22:07:00.000Z",
          authoritativeContext: {
            repo: "/repo",
            bubble_id: "b_pass_ctx_05",
            handoff_id: "implementer:b_pass_ctx_05:round:2:attempt:1",
            execution_id: "exec_pass_ctx_05_round2",
            expected_role: "implementer",
            expected_round: 2,
            expected_state_fingerprint: "fp_ctx_05",
            worktree_path: "/repo/.pairflow/worktrees/b_pass_ctx_05",
            resolved: {
              bubbleId: "b_pass_ctx_05",
              repoPath: "/repo",
              bubblePaths: {
                statePath: "/repo/.pairflow/bubbles/b_pass_ctx_05/state.json",
                worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_05"
              },
              bubbleConfig: {
                id: "b_pass_ctx_05",
                agents: {
                  implementer: "codex",
                  reviewer: "claude",
                  meta_reviewer: "codex"
                }
              }
            } as never,
            loaded_state: {
              state: {
                bubble_id: "b_pass_ctx_05",
                state: "RUNNING",
                round: 2,
                active_role: "implementer",
                execution_context: {
                  handoff_id: "implementer:b_pass_ctx_05:round:2:attempt:1",
                  round: 2,
                  active_role: "implementer"
                }
              },
              fingerprint: "fp_ctx_05"
            } as never,
            execution_context: {
              handoff_id: "implementer:b_pass_ctx_05:round:2:attempt:1",
              execution_id: "exec_pass_ctx_05_round2",
              round: 2,
              active_role: "implementer"
            } as never
          },
          createError: (message: PairflowCommandErrorInput) =>
            new SyntheticPassCommandError(toErrorMessage(message))
        }
      )
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    });
  });

  it("rejects spoofed implementer authority before meta-only activation when persisted execution authority still belongs to reviewer", async () => {
    let resolveBubbleCalls = 0;
    let ensureIdentityCalls = 0;
    let readStateCalls = 0;
    let resolveHandoffCalls = 0;

    await expect(
      preparePassWorkspaceContext(
        {
          now: new Date("2026-03-19T22:08:00.000Z"),
          nowIso: "2026-03-19T22:08:00.000Z",
          authoritativeContext: {
            repo: "/repo",
            bubble_id: "b_pass_ctx_spoof_01",
            handoff_id: "implementer:b_pass_ctx_spoof_01:round:2:attempt:1",
            execution_id: "exec_pass_ctx_spoof_01_round2",
            expected_role: "implementer",
            expected_round: 2,
            expected_state_fingerprint: "fp_ctx_spoof_01",
            worktree_path: "/repo/.pairflow/worktrees/b_pass_ctx_spoof_01",
            resolved: {
              bubbleId: "b_pass_ctx_spoof_01",
              repoPath: "/repo",
              bubblePaths: {
                statePath: "/repo/.pairflow/bubbles/b_pass_ctx_spoof_01/state.json",
                worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_spoof_01"
              },
              bubbleConfig: {
                id: "b_pass_ctx_spoof_01",
                review_policy: {
                  review_loop_mode: "meta_only",
                  reviewer_blocking_min_severity: "P2",
                  meta_review_auto_rework_min_severity: "P2",
                  meta_review_consecutive_clean_runs_required: 1,
                },
                agents: {
                  implementer: "codex",
                  reviewer: "claude",
                  meta_reviewer: "codex"
                }
              }
            } as never,
            loaded_state: {
              state: {
                bubble_id: "b_pass_ctx_spoof_01",
                state: "RUNNING",
                round: 2,
                active_role: "reviewer",
                active_agent: "claude",
                execution_context: {
                  handoff_id: "reviewer:b_pass_ctx_spoof_01:round:2:attempt:1",
                  execution_id: "exec_pass_ctx_spoof_01_round2_real",
                  round: 2,
                  active_role: "reviewer",
                  awaited_output_type: "pass_result",
                  started_at: "2026-03-19T22:00:00.000Z",
                  deadline_at: "2026-03-19T22:30:00.000Z",
                  attempt: 1
                }
              },
              fingerprint: "fp_ctx_spoof_01"
            } as never,
            execution_context: {
              handoff_id: "implementer:b_pass_ctx_spoof_01:round:2:attempt:1",
              execution_id: "exec_pass_ctx_spoof_01_round2",
              round: 2,
              active_role: "implementer",
              awaited_output_type: "pass_result",
              started_at: "2026-03-19T22:00:00.000Z",
              deadline_at: "2026-03-19T22:30:00.000Z",
              attempt: 1
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
          ensureBubbleInstanceIdForMutation: async () => {
            ensureIdentityCalls += 1;
            throw new Error("ensureBubbleInstanceIdForMutation should not run");
          },
          readStateSnapshot: async () => {
            readStateCalls += 1;
            throw new Error("readStateSnapshot should not run");
          },
          resolvePassHandoff: () => {
            resolveHandoffCalls += 1;
            throw new Error("resolvePassHandoff should not run");
          }
        }
      )
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "Canonical actor emit snapshot handoff mismatch: expected implementer:b_pass_ctx_spoof_01:round:2:attempt:1, loaded reviewer:b_pass_ctx_spoof_01:round:2:attempt:1."
    });

    expect(resolveBubbleCalls).toBe(0);
    expect(ensureIdentityCalls).toBe(0);
    expect(readStateCalls).toBe(0);
    expect(resolveHandoffCalls).toBe(0);
  });

  it("activates meta-only pass-path routing only with canonical implementer authority", async () => {
    const now = new Date("2026-03-19T22:10:00.000Z");
    const nowIso = now.toISOString();
    let capturedEffectiveLoopMode: string | undefined;

    const prepared = await preparePassWorkspaceContext(
      {
        cwd: "/repo/.pairflow/worktrees/b_pass_ctx_04",
        now,
        nowIso,
        createError: (message: PairflowCommandErrorInput) =>
          new SyntheticPassCommandError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_pass_ctx_04",
            bubbleConfig: {
              id: "b_pass_ctx_04",
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P2",
                meta_review_auto_rework_min_severity: "P2",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "claude",
                reviewer: "codex",
                meta_reviewer: "codex"
              }
            },
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_pass_ctx_04/state.json"
            },
            repoPath: "/repo",
            worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_04",
            cwd: "/repo/.pairflow/worktrees/b_pass_ctx_04"
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: {
              id: "b_pass_ctx_04",
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P2",
                meta_review_auto_rework_min_severity: "P2",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "claude",
                reviewer: "codex",
                meta_reviewer: "codex"
              }
            },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              bubble_id: "b_pass_ctx_04",
              state: "RUNNING",
              round: 2,
              active_agent: "claude",
              active_role: "implementer",
              execution_context: {
                handoff_id: "implementer:b_pass_ctx_04:round:2:attempt:1",
                execution_id: "exec_pass_ctx_04_round2",
                round: 2,
                active_role: "implementer",
                awaited_output_type: "pass_result",
                started_at: "2026-03-19T22:00:00.000Z",
                deadline_at: "2026-03-19T22:30:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ctx_04"
          }) as never,
        resolveIdeationMetadata: () =>
          ({
            mode: true,
            taskPending: false
          }) as never,
        resolvePassHandoff: (input) => {
          capturedEffectiveLoopMode = input.effectiveLoopMode;
          return {
            senderAgent: "claude",
            senderRole: "implementer",
            recipientAgent: "codex",
            recipientRole: "meta_reviewer",
            envelopeRound: 2,
            nextRound: 2
          };
        }
      }
    );

    expect(capturedEffectiveLoopMode).toBe("meta_only");
    expect(prepared.activation).toEqual({
      handoff_id: "implementer:b_pass_ctx_04:round:2:attempt:1",
      execution_id: "exec_pass_ctx_04_round2",
      expected_role: "implementer",
      expected_round: 2,
      expected_state_fingerprint: "fp_ctx_04"
    });
    expect(prepared.reviewPolicyRuntime).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "meta_only",
      support_status: "enabled",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
      meta_review_consecutive_clean_runs_required: 1,
    });
  });

  it("fails closed for meta-only pass-path routing when canonical activation is unresolved", async () => {
    const now = new Date("2026-03-19T22:15:00.000Z");
    const nowIso = now.toISOString();
    let capturedEffectiveLoopMode: string | undefined;

    const prepared = await preparePassWorkspaceContext(
      {
        cwd: "/repo/.pairflow/worktrees/b_pass_ctx_05",
        now,
        nowIso,
        createError: (message: PairflowCommandErrorInput) =>
          new SyntheticPassCommandError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_pass_ctx_05",
            bubbleConfig: {
              id: "b_pass_ctx_05",
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P3",
                meta_review_auto_rework_min_severity: "P3",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "codex",
                reviewer: "claude",
                meta_reviewer: "codex"
              }
            },
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_pass_ctx_05/state.json"
            },
            repoPath: "/repo",
            worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_05",
            cwd: "/repo/.pairflow/worktrees/b_pass_ctx_05"
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: {
              id: "b_pass_ctx_05",
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P3",
                meta_review_auto_rework_min_severity: "P3",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "codex",
                reviewer: "claude",
                meta_reviewer: "codex"
              }
            },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              bubble_id: "b_pass_ctx_05",
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              execution_context: {
                handoff_id: "reviewer:b_pass_ctx_05:round:2:attempt:1",
                execution_id: "exec_wrong_role_ctx_05",
                round: 2,
                active_role: "reviewer",
                awaited_output_type: "pass_result",
                started_at: "2026-03-19T22:00:00.000Z",
                deadline_at: "2026-03-19T22:30:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ctx_05"
          }) as never,
        resolveIdeationMetadata: () =>
          ({
            mode: true,
            taskPending: false
          }) as never,
        resolvePassHandoff: (input) => {
          capturedEffectiveLoopMode = input.effectiveLoopMode;
          return {
            senderAgent: "codex",
            senderRole: "implementer",
            recipientAgent: "claude",
            recipientRole: "reviewer",
            envelopeRound: 2,
            nextRound: 2
          };
        }
      }
    );

    expect(capturedEffectiveLoopMode).toBe("full");
    expect(prepared.activation).toBeUndefined();
    expect(prepared.reviewPolicyRuntime).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity: "P3",
      meta_review_auto_rework_min_severity: "P3",
      meta_review_consecutive_clean_runs_required: 1,
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
      blocked_prerequisites: ["reviewer_bypass_activation_provenance_required"],
      provenance_note:
        "Requested meta-only review remains fail-closed on the full review loop until canonical implementer pass authority proves reviewer-bypass activation for the live pass path."
    });
  });

  it("keeps meta-only activation fail-closed when implementer state lacks distinct execution authority", async () => {
    const now = new Date("2026-03-19T22:20:00.000Z");
    const nowIso = now.toISOString();
    let capturedEffectiveLoopMode: string | undefined;

    const prepared = await preparePassWorkspaceContext(
      {
        cwd: "/repo/.pairflow/worktrees/b_pass_ctx_06",
        now,
        nowIso,
        createError: (message: PairflowCommandErrorInput) =>
          new SyntheticPassCommandError(toErrorMessage(message))
      },
      {
        resolveBubbleFromWorkspaceCwd: async () =>
          ({
            bubbleId: "b_pass_ctx_06",
            bubbleConfig: {
              id: "b_pass_ctx_06",
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P2",
                meta_review_auto_rework_min_severity: "P2",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "codex",
                reviewer: "claude",
                meta_reviewer: "codex"
              }
            },
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_pass_ctx_06/state.json"
            },
            repoPath: "/repo",
            worktreePath: "/repo/.pairflow/worktrees/b_pass_ctx_06",
            cwd: "/repo/.pairflow/worktrees/b_pass_ctx_06"
          }) as never,
        ensureBubbleInstanceIdForMutation: async () =>
          ({
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: {
              id: "b_pass_ctx_06",
              review_policy: {
                review_loop_mode: "meta_only",
                reviewer_blocking_min_severity: "P2",
                meta_review_auto_rework_min_severity: "P2",
                meta_review_consecutive_clean_runs_required: 1,
              },
              agents: {
                implementer: "codex",
                reviewer: "claude",
                meta_reviewer: "codex"
              }
            },
            backfilled: false
          }) as never,
        readStateSnapshot: async () =>
          ({
            state: {
              bubble_id: "b_pass_ctx_06",
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              execution_context: {
                handoff_id: "implementer:b_pass_ctx_06:round:2:attempt:1",
                execution_id: "implementer:b_pass_ctx_06:round:2:attempt:1",
                round: 2,
                active_role: "implementer",
                awaited_output_type: "pass_result",
                started_at: "2026-03-19T22:00:00.000Z",
                deadline_at: "2026-03-19T22:30:00.000Z",
                attempt: 1
              }
            },
            fingerprint: "fp_ctx_06"
          }) as never,
        resolveIdeationMetadata: () =>
          ({
            mode: true,
            taskPending: false
          }) as never,
        resolvePassHandoff: (input) => {
          capturedEffectiveLoopMode = input.effectiveLoopMode;
          return {
            senderAgent: "codex",
            senderRole: "implementer",
            recipientAgent: "claude",
            recipientRole: "reviewer",
            envelopeRound: 2,
            nextRound: 2
          };
        }
      }
    );

    expect(capturedEffectiveLoopMode).toBe("full");
    expect(prepared.activation).toBeUndefined();
    expect(prepared.reviewPolicyRuntime).toEqual({
      requested_loop_mode: "meta_only",
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
      meta_review_consecutive_clean_runs_required: 1,
      blocked_reason_code: "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED",
      blocked_prerequisites: ["reviewer_bypass_activation_provenance_required"],
      provenance_note:
        "Requested meta-only review remains fail-closed on the full review loop until canonical implementer pass authority proves reviewer-bypass activation for the live pass path."
    });
  });
});
