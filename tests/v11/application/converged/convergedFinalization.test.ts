import { describe, expect, it } from "vitest";

import { finalizeConvergedFlow } from "../../../../src/v11/application/converged/convergedFinalization.js";

describe("finalizeConvergedFlow", () => {
  it("emits human-gate and rollout-blocked lifecycle events when applicable", async () => {
    const emittedEventTypes: string[] = [];

    const result = await finalizeConvergedFlow(
      {
        resolved: {
          bubbleId: "b_final_001",
          repoPath: "/repo",
          bubblePaths: {
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {
            pairflow_command_profile: "self_host"
          }
        } as never,
        bubbleIdentity: {
          bubbleInstanceId: "bi_final_001"
        } as never,
        state: {
          round: 5
        } as never,
        summary: "Converged summary",
        refs: ["artifacts/review.md"],
        now: new Date("2026-03-19T12:00:00.000Z"),
        convergence: {
          sequence: 30,
          envelope: {
            id: "env_conv_final_1"
          }
        } as never,
        gateResult: {
          route: "human_gate_approve",
          gateSequence: 31,
          gateEnvelope: {
            id: "env_gate_final_1",
            type: "APPROVAL_REQUEST"
          },
          state: {
            meta_review: {
              last_autonomous_recommendation: "approve",
              last_autonomous_status: "ok"
            }
          },
          metaReviewRun: {
            recommendation: "approve",
            status: "ok",
            warnings: [{ reason_code: "META_REVIEW_RUNNER_ERROR" }]
          }
        } as never,
        summaryVerifierGateDecision: {
          gate_decision: "allow",
          reason_code: "no_claim_in_docs_only",
          review_artifact_type: "document",
          claim_classes_detected: "none",
          verifier_status: "trusted",
          matched_claim_triggers: []
        },
        specLockState: {
          state: "IMPLEMENTABLE",
          open_blocker_count: 0,
          open_required_now_count: 0
        },
        roundGateState: {
          applies: false,
          violated: false,
          round: 5
        },
        delivery: {
          delivered: true,
          retried: false
        }
      },
      {
        assessPairflowCommandPath: () => ({
          status: "stale",
          reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
          profile: "self_host",
          localEntrypoint: "/repo/worktree/dist/cli/index.js",
          activeEntrypoint: "/usr/local/bin/pairflow",
          localEntrypointExists: true,
          externalPairflowAvailable: true,
          pinnedCommand: "node '/repo/worktree/dist/cli/index.js'",
          message: "stale"
        }),
        resolveMetaReviewRolloutBlockingReasonCodes: (input) => {
          expect(input.gateRoute).toBe("human_gate_approve");
          return ["PAIRFLOW_COMMAND_PATH_STALE"];
        },
        emitBubbleLifecycleEventBestEffort: async (event) => {
          emittedEventTypes.push(event.eventType);
        },
        activeEntrypoint: "/usr/local/bin/pairflow"
      }
    );

    expect(emittedEventTypes).toEqual([
      "bubble_converged",
      "bubble_meta_review_routed",
      "bubble_meta_review_human_gate_reached",
      "bubble_meta_review_rollout_blocked"
    ]);
    expect(result).toEqual({
      bubbleId: "b_final_001",
      convergenceSequence: 30,
      convergenceEnvelope: {
        id: "env_conv_final_1"
      },
      gateRoute: "human_gate_approve",
      approvalRequestSequence: 31,
      approvalRequestEnvelope: {
        id: "env_gate_final_1",
        type: "APPROVAL_REQUEST"
      },
      state: {
        meta_review: {
          last_autonomous_recommendation: "approve",
          last_autonomous_status: "ok"
        }
      },
      delivery: {
        delivered: true,
        retried: false
      }
    });
  });

  it("emits auto-rework event and skips human-gate/blocked events when not needed", async () => {
    const emittedEventTypes: string[] = [];

    await finalizeConvergedFlow(
      {
        resolved: {
          bubbleId: "b_final_002",
          repoPath: "/repo",
          bubblePaths: {
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {
            pairflow_command_profile: "external"
          }
        } as never,
        bubbleIdentity: {
          bubbleInstanceId: "bi_final_002"
        } as never,
        state: {
          round: 2
        } as never,
        summary: "Converged summary",
        refs: [],
        now: new Date("2026-03-19T12:10:00.000Z"),
        convergence: {
          sequence: 40,
          envelope: {
            id: "env_conv_final_2"
          }
        } as never,
        gateResult: {
          route: "auto_rework",
          gateSequence: 41,
          gateEnvelope: {
            id: "env_gate_final_2",
            type: "PASS"
          },
          state: {
            meta_review: {
              auto_rework_count: 1,
              auto_rework_limit: 2
            }
          },
          metaReviewRun: {
            recommendation: "revise",
            status: "ok",
            rework_target_message: "Fix lint issue",
            warnings: []
          }
        } as never,
        summaryVerifierGateDecision: {
          gate_decision: "not_applicable",
          reason_code: "not_applicable_non_docs",
          review_artifact_type: "code",
          claim_classes_detected: "none",
          verifier_status: "trusted",
          matched_claim_triggers: []
        },
        specLockState: {
          state: "IMPLEMENTABLE",
          open_blocker_count: 0,
          open_required_now_count: 0
        },
        roundGateState: {
          applies: false,
          violated: false,
          round: 2
        }
      },
      {
        assessPairflowCommandPath: () => ({
          status: "external",
          profile: "external",
          localEntrypoint: "/repo/worktree/dist/cli/index.js",
          activeEntrypoint: "/usr/local/bin/pairflow",
          localEntrypointExists: true,
          externalPairflowAvailable: true,
          pinnedCommand: "pairflow",
          message: "external"
        }),
        resolveMetaReviewRolloutBlockingReasonCodes: () => [],
        emitBubbleLifecycleEventBestEffort: async (event) => {
          emittedEventTypes.push(event.eventType);
        }
      }
    );

    expect(emittedEventTypes).toEqual([
      "bubble_converged",
      "bubble_meta_review_routed",
      "bubble_meta_review_auto_rework_dispatched"
    ]);
  });
});
