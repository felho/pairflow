import { describe, expect, it } from "vitest";

import { finalizeConvergedFlow } from "../../../../src/v11/application/converged/convergedFinalization.js";

describe("finalizeConvergedFlow", () => {
  it("emits human-gate and rollout-blocked lifecycle events when applicable", async () => {
    const emittedEvents: Array<{ eventType: string; metadata: Record<string, unknown> }> = [];

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
            id: "env_conv_final_1",
            payload: {
              summary: "Converged summary",
              metadata: {
                advisory_findings_open_total: 2
              },
              findings: [
                {
                  severity: "P2",
                  title: "follow-up 1"
                },
                {
                  severity: "P3",
                  title: "follow-up 2"
                }
              ]
            }
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
          entrypointConsistency: "inconsistent",
          message: "stale"
        }),
        resolveMetaReviewRolloutBlockingReasonCodes: (input) => {
          expect(input.gateRoute).toBe("human_gate_approve");
          return ["PAIRFLOW_COMMAND_PATH_STALE"];
        },
        emitBubbleLifecycleEventBestEffort: async (event) => {
          emittedEvents.push({
            eventType: event.eventType,
            metadata: event.metadata
          });
        },
        activeEntrypoint: "/usr/local/bin/pairflow"
      }
    );

    expect(emittedEvents.map((entry) => entry.eventType)).toEqual([
      "bubble_converged",
      "bubble_meta_review_routed",
      "bubble_meta_review_human_gate_reached",
      "bubble_meta_review_rollout_blocked"
    ]);
    expect(emittedEvents[0]?.metadata.advisory_findings_open_total).toBe(2);
    expect(emittedEvents[1]?.metadata.advisory_findings_open_total).toBe(2);
    expect(
      emittedEvents[0]?.metadata.pairflow_command_path_entrypoint_consistency
    ).toBe("inconsistent");
    expect(
      emittedEvents[1]?.metadata.pairflow_command_path_entrypoint_consistency
    ).toBe("inconsistent");
    expect(result).toEqual({
      bubbleId: "b_final_001",
      convergenceSequence: 30,
      convergenceEnvelope: {
        id: "env_conv_final_1",
        payload: {
          summary: "Converged summary",
          metadata: {
            advisory_findings_open_total: 2
          },
          findings: [
            {
              severity: "P2",
              title: "follow-up 1"
            },
            {
              severity: "P3",
              title: "follow-up 2"
            }
          ]
        }
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
    const emittedEvents: Array<{ eventType: string; metadata: Record<string, unknown> }> = [];

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
            id: "env_conv_final_2",
            payload: {
              summary: "Converged summary",
              metadata: {
                advisory_findings_open_total: 3
              }
            }
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
          entrypointConsistency: "consistent",
          message: "external"
        }),
        resolveMetaReviewRolloutBlockingReasonCodes: () => [],
        emitBubbleLifecycleEventBestEffort: async (event) => {
          emittedEvents.push({
            eventType: event.eventType,
            metadata: event.metadata
          });
        }
      }
    );

    expect(emittedEvents.map((entry) => entry.eventType)).toEqual([
      "bubble_converged",
      "bubble_meta_review_routed",
      "bubble_meta_review_auto_rework_dispatched"
    ]);
    expect(emittedEvents[0]?.metadata.advisory_findings_open_total).toBe(3);
    expect(emittedEvents[1]?.metadata.advisory_findings_open_total).toBe(3);
    expect(
      emittedEvents[0]?.metadata.pairflow_command_path_entrypoint_consistency
    ).toBe("consistent");
  });

  it("uses convergence metadata as single advisory metric source over list length and gate payload metadata", async () => {
    const emittedEvents: Array<{ eventType: string; metadata: Record<string, unknown> }> = [];

    const result = await finalizeConvergedFlow(
      {
        resolved: {
          bubbleId: "b_final_003",
          repoPath: "/repo",
          bubblePaths: {
            worktreePath: "/repo/worktree"
          },
          bubbleConfig: {
            pairflow_command_profile: "external"
          }
        } as never,
        bubbleIdentity: {
          bubbleInstanceId: "bi_final_003"
        } as never,
        state: {
          round: 7
        } as never,
        summary: "Converged summary",
        refs: [],
        now: new Date("2026-03-19T12:20:00.000Z"),
        convergence: {
          sequence: 50,
          envelope: {
            id: "env_conv_final_3",
            payload: {
              summary: "Converged summary",
              metadata: {
                advisory_findings_open_total: 5
              },
              findings: [
                {
                  severity: "P2",
                  title: "follow-up 1"
                }
              ]
            }
          }
        } as never,
        gateResult: {
          route: "human_gate_approve",
          gateSequence: 51,
          gateEnvelope: {
            id: "env_gate_final_3",
            type: "APPROVAL_REQUEST",
            payload: {
              metadata: {
                advisory_findings_open_total: 9
              },
              findings: [
                {
                  severity: "P2",
                  title: "gate-follow-up"
                }
              ]
            }
          },
          state: {
            meta_review: {
              last_autonomous_recommendation: "approve",
              last_autonomous_status: "ok"
            }
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
          round: 7
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
          emittedEvents.push({
            eventType: event.eventType,
            metadata: event.metadata
          });
        }
      }
    );

    expect(emittedEvents[0]?.eventType).toBe("bubble_converged");
    expect(emittedEvents[0]?.metadata.advisory_findings_open_total).toBe(5);
    expect(emittedEvents[1]?.eventType).toBe("bubble_meta_review_routed");
    expect(emittedEvents[1]?.metadata.advisory_findings_open_total).toBe(5);
    expect(emittedEvents[0]?.metadata.advisory_findings_open_total).not.toBe(1);
    expect(emittedEvents[1]?.metadata.advisory_findings_open_total).not.toBe(9);
    expect(
      (result.approvalRequestEnvelope as { payload?: { metadata?: { advisory_findings_open_total?: unknown } } })
        .payload?.metadata?.advisory_findings_open_total
    ).toBe(9);
  });
});
