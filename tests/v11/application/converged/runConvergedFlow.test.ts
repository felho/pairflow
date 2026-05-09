import { describe, expect, it } from "vitest";

import { runConvergedFlow } from "../../../../src/v11/application/converged/internal/flow/runConvergedFlow.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("runConvergedFlow", () => {
  it("orchestrates routing -> policy -> validation -> execution -> finalization in order", async () => {
    const callOrder: string[] = [];
    const authoritativeContext = {
      bubble_id: "b_run_001"
    } as never;

    const result = await runConvergedFlow(
      {
        summary: "converged summary",
        refs: ["artifacts/review.md"],
        findings: [
          {
            severity: "P2",
            title: "Follow-up",
            refs: ["artifact://review/follow-up.md"]
          }
        ],
        now: new Date("2026-03-19T19:30:00.000Z"),
        cwd: "/repo/worktree",
        authoritativeContext,
        expectedStateFingerprint: "fp_1",
        expectedRound: 3,
        expectedReviewer: "claude",
        createError: (input) => new Error(toErrorMessage(input)),
        resolveMetaReviewRolloutBlockingReasonCodes: () => []
      },
      {
        prepareConvergedRouting: async (input) => {
          callOrder.push("prepareConvergedRouting");
          expect(input.cwd).toBe("/repo/worktree");
          expect(input.authoritativeContext).toBe(authoritativeContext);
          expect(input.expectedStateFingerprint).toBe("fp_1");
          return {
            resolved: {
              bubbleId: "b_run_001",
              bubbleConfig: {
                review_artifact_type: "document",
                severity_gate_round: 2
              },
              bubblePaths: {
                transcriptPath: "/repo/.pairflow/transcript.ndjson"
              }
            },
            bubbleIdentity: {
              bubbleInstanceId: "bi_run_001"
            },
            state: {
              round: 3,
              round_role_history: []
            },
            implementer: "codex",
            reviewer: "claude"
          } as never;
        },
        prepareConvergedPolicy: async (input) => {
          callOrder.push("prepareConvergedPolicy");
          expect(input.transcriptPath).toBe("/repo/.pairflow/transcript.ndjson");
          return {
            transcript: [],
            policy: {
              ok: true,
              errors: [],
              diagnostics: []
            },
            convergencePolicyDiagnostics: ["diag-a"]
          };
        },
        prepareConvergedValidation: async (input) => {
          callOrder.push("prepareConvergedValidation");
          expect(input.summary).toBe("converged summary");
          return {
            outcome: "pass",
            diagnostics: [],
            specLockState: {
              state: "IMPLEMENTABLE",
              open_blocker_count: 0,
              open_required_now_count: 0
            },
            roundGateState: {
              applies: false,
              violated: false,
              round: 3
            },
            summaryVerifierGateDecision: {
              gate_decision: "allow",
              reason_code: "no_claim_in_docs_only",
              review_artifact_type: "document",
              verifier_status: "trusted",
              claim_classes_detected: "none",
              matched_claim_triggers: []
            }
          };
        },
        executeConvergedExecution: async (input) => {
          callOrder.push("executeConvergedExecution");
          expect(input.convergencePolicyDiagnostics).toEqual(["diag-a"]);
          expect(input.gatePipelineDiagnostics).toEqual([]);
          expect(input.findings).toEqual([
            {
              severity: "P2",
              title: "Follow-up",
              refs: ["artifact://review/follow-up.md"]
            }
          ]);
          return {
            convergence: {
              sequence: 41,
              envelope: {
                id: "env_conv_41"
              },
              mirrorWriteFailures: []
            },
            gateResult: {
              route: "human_gate_approve",
              gateSequence: 42,
              gateEnvelope: {
                id: "env_gate_42",
                type: "APPROVAL_REQUEST"
              },
              state: {
                state: "READY_FOR_HUMAN_APPROVAL"
              }
            },
            delivery: {
              status: "accepted",
              retried: false
            }
          } as never;
        },
        finalizeConvergedFlow: async () => {
          callOrder.push("finalizeConvergedFlow");
          return {
            bubbleId: "b_run_001",
            convergenceSequence: 41,
            convergenceEnvelope: { id: "env_conv_41" },
            gateRoute: "human_gate_approve",
            approvalRequestSequence: 42,
            approvalRequestEnvelope: { id: "env_gate_42", type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" },
            delivery: { status: "accepted", retried: false }
          } as never;
        }
      }
    );

    expect(callOrder).toEqual([
      "prepareConvergedRouting",
      "prepareConvergedPolicy",
      "prepareConvergedValidation",
      "executeConvergedExecution",
      "finalizeConvergedFlow"
    ]);
    expect(result.convergenceSequence).toBe(41);
  });

  it("keeps policy diagnostics separate from aggregate gate pipeline diagnostics on warn paths", async () => {
    await runConvergedFlow(
      {
        summary: "converged summary",
        refs: [],
        now: new Date("2026-03-19T19:32:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input)),
        resolveMetaReviewRolloutBlockingReasonCodes: () => []
      },
      {
        prepareConvergedRouting: async () =>
          ({
            resolved: {
              bubbleId: "b_run_warn_001",
              bubbleConfig: {
                review_artifact_type: "document",
                severity_gate_round: 2
              },
              bubblePaths: {
                transcriptPath: "/repo/.pairflow/transcript.ndjson"
              }
            },
            bubbleIdentity: {},
            state: {
              round: 3,
              round_role_history: []
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        prepareConvergedPolicy: async () => ({
          transcript: [],
          policy: {
            ok: true,
            errors: [],
            diagnostics: []
          },
          convergencePolicyDiagnostics: ["policy-diag"]
        }),
        prepareConvergedValidation: async () => ({
          outcome: "warn",
          diagnostics: ["Doc gate artifact read failed: gate artifact unreadable"],
          specLockState: {
            state: "IMPLEMENTABLE",
            open_blocker_count: 0,
            open_required_now_count: 0
          },
          roundGateState: {
            applies: false,
            violated: false,
            round: 3
          },
          docGateArtifactReadFailureReason: "gate artifact unreadable",
          summaryVerifierGateDecision: {
            gate_decision: "allow",
            reason_code: "no_claim_in_docs_only",
            review_artifact_type: "document",
            verifier_status: "trusted",
            claim_classes_detected: "none",
            matched_claim_triggers: []
          }
        }),
        executeConvergedExecution: async (input) => {
          expect(input.convergencePolicyDiagnostics).toEqual(["policy-diag"]);
          expect(input.gatePipelineDiagnostics).toEqual([
            "Doc gate artifact read failed: gate artifact unreadable"
          ]);
          return {
            convergence: {
              sequence: 41,
              envelope: {
                id: "env_conv_41"
              },
              mirrorWriteFailures: []
            },
            gateResult: {
              route: "human_gate_approve",
              gateSequence: 42,
              gateEnvelope: {
                id: "env_gate_42",
                type: "APPROVAL_REQUEST"
              },
              state: {
                state: "READY_FOR_HUMAN_APPROVAL"
              }
            }
          } as never;
        },
        finalizeConvergedFlow: async () =>
          ({
            bubbleId: "b_run_warn_001",
            convergenceSequence: 41,
            convergenceEnvelope: { id: "env_conv_41" },
            gateRoute: "human_gate_approve",
            approvalRequestSequence: 42,
            approvalRequestEnvelope: { id: "env_gate_42", type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" }
          }) as never
      }
    );
  });

  it("raises normalized policy error via createError when policy validation fails", async () => {
    await expect(() =>
      runConvergedFlow(
        {
          summary: "summary",
          refs: [],
          now: new Date("2026-03-19T19:35:00.000Z"),
          createError: (input) => new Error(`wrapped:${toErrorMessage(input)}`),
          resolveMetaReviewRolloutBlockingReasonCodes: () => []
        },
        {
          prepareConvergedRouting: async () => ({
            resolved: {
              bubbleConfig: {
                review_artifact_type: "code",
                severity_gate_round: 2
              },
              bubblePaths: {
                transcriptPath: "/repo/.pairflow/transcript.ndjson"
              }
            },
            bubbleIdentity: {},
            state: {
              round: 2,
              round_role_history: []
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
          prepareConvergedPolicy: async () => ({
            transcript: [],
            policy: {
              ok: false,
              errors: ["MISSING_ALTERNATION"],
              diagnostics: ["DIAG_A"]
            },
            convergencePolicyDiagnostics: []
          }),
          prepareConvergedValidation: async () => {
            throw new Error("unreachable");
          },
          executeConvergedExecution: async () => {
            throw new Error("unreachable");
          },
          finalizeConvergedFlow: async () => {
            throw new Error("unreachable");
          }
        }
      )
    ).rejects.toThrow(
      "wrapped:CONVERGED_POLICY_VALIDATION_FAILED: Convergence validation failed: MISSING_ALTERNATION Diagnostics: DIAG_A"
    );
  });

  it("does not forward findings to execution when input findings is an explicit empty array", async () => {
    await runConvergedFlow(
      {
        summary: "converged summary",
        refs: [],
        findings: [],
        now: new Date("2026-03-19T19:40:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input)),
        resolveMetaReviewRolloutBlockingReasonCodes: () => []
      },
      {
        prepareConvergedRouting: async () =>
          ({
            resolved: {
              bubbleConfig: {
                review_artifact_type: "document",
                severity_gate_round: 2
              },
              bubblePaths: {
                transcriptPath: "/repo/.pairflow/transcript.ndjson"
              }
            },
            bubbleIdentity: {},
            state: {
              round: 3,
              round_role_history: []
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        prepareConvergedPolicy: async () => ({
          transcript: [],
          policy: {
            ok: true,
            errors: [],
            diagnostics: []
          },
          convergencePolicyDiagnostics: []
        }),
        prepareConvergedValidation: async () => ({
          outcome: "pass",
          diagnostics: [],
          specLockState: {
            state: "IMPLEMENTABLE",
            open_blocker_count: 0,
            open_required_now_count: 0
          },
          roundGateState: {
            applies: false,
            violated: false,
            round: 3
          },
          summaryVerifierGateDecision: {
            gate_decision: "allow",
            reason_code: "no_claim_in_docs_only",
            review_artifact_type: "document",
            verifier_status: "trusted",
            claim_classes_detected: "none",
            matched_claim_triggers: []
          }
        }),
        executeConvergedExecution: async (input) => {
          expect("findings" in input).toBe(false);
          return {
            convergence: {
              sequence: 41,
              envelope: {
                id: "env_conv_41"
              },
              mirrorWriteFailures: []
            },
            gateResult: {
              route: "human_gate_approve",
              gateSequence: 42,
              gateEnvelope: {
                id: "env_gate_42",
                type: "APPROVAL_REQUEST"
              },
              state: {
                state: "READY_FOR_HUMAN_APPROVAL"
              }
            }
          } as never;
        },
        finalizeConvergedFlow: async () =>
          ({
            bubbleId: "b_run_001",
            convergenceSequence: 41,
            convergenceEnvelope: { id: "env_conv_41" },
            gateRoute: "human_gate_approve",
            approvalRequestSequence: 42,
            approvalRequestEnvelope: { id: "env_gate_42", type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" }
          }) as never
      }
    );
  });

  it("preserves validation block messaging and short-circuits execution", async () => {
    const calls: string[] = [];

    await expect(() =>
      runConvergedFlow(
        {
          summary: "summary",
          refs: [],
          now: new Date("2026-03-19T19:45:00.000Z"),
          createError: (input) => new Error(`wrapped:${toErrorMessage(input)}`),
          resolveMetaReviewRolloutBlockingReasonCodes: () => []
        },
        {
          prepareConvergedRouting: async () =>
            ({
              resolved: {
                bubbleId: "b_run_004",
                bubbleConfig: {
                  review_artifact_type: "document",
                  severity_gate_round: 2
                },
                bubblePaths: {
                  transcriptPath: "/repo/.pairflow/transcript.ndjson"
                }
              },
              bubbleIdentity: {},
              state: {
                round: 4,
                round_role_history: []
              },
              implementer: "codex",
              reviewer: "claude"
            }) as never,
          prepareConvergedPolicy: async () => {
            calls.push("prepareConvergedPolicy");
            return {
              transcript: [],
              policy: {
                ok: true,
                errors: [],
                diagnostics: []
              },
              convergencePolicyDiagnostics: []
            };
          },
          prepareConvergedValidation: async () => {
            calls.push("prepareConvergedValidation");
            return {
              outcome: "block",
              diagnostics: [
                "CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED: Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary."
              ],
              blockingError: {
                reasonCode: "CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED",
                message:
                  "Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary."
              },
              specLockState: {
                state: "IMPLEMENTABLE",
                open_blocker_count: 0,
                open_required_now_count: 0
              },
              roundGateState: {
                applies: false,
                violated: false,
                round: 4
              }
            };
          },
          executeConvergedExecution: async () => {
            calls.push("executeConvergedExecution");
            throw new Error("unreachable");
          },
          finalizeConvergedFlow: async () => {
            calls.push("finalizeConvergedFlow");
            throw new Error("unreachable");
          }
        }
      )
    ).rejects.toThrow(
      "wrapped:CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED: Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary."
    );

    expect(calls).toEqual([
      "prepareConvergedPolicy",
      "prepareConvergedValidation"
    ]);
  });

  it("wraps unexpected validation evaluator failures with gate context", async () => {
    await expect(() =>
      runConvergedFlow(
        {
          summary: "summary",
          refs: [],
          now: new Date("2026-03-19T19:50:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input)),
          resolveMetaReviewRolloutBlockingReasonCodes: () => []
        },
        {
          prepareConvergedRouting: async () =>
            ({
              resolved: {
                bubbleId: "b_run_005",
                bubbleConfig: {
                  review_artifact_type: "document",
                  severity_gate_round: 2
                },
                bubblePaths: {
                  transcriptPath: "/repo/.pairflow/transcript.ndjson"
                }
              },
              bubbleIdentity: {},
              state: {
                round: 5,
                round_role_history: []
              },
              implementer: "codex",
              reviewer: "claude"
            }) as never,
          prepareConvergedPolicy: async () => ({
            transcript: [],
            policy: {
              ok: true,
              errors: [],
              diagnostics: []
            },
            convergencePolicyDiagnostics: []
          }),
          prepareConvergedValidation: async () => {
            throw new Error("writer exploded");
          },
          executeConvergedExecution: async () => {
            throw new Error("unreachable");
          },
          finalizeConvergedFlow: async () => {
            throw new Error("unreachable");
          }
        }
      )
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof Error)) {
        return false;
      }
      const structuredError = error as Error & {
        reasonCode?: string;
        context?: PairflowCommandErrorContext;
        cause?: unknown;
      };
      return (
        structuredError.message === "Gate evaluator failed: converged_validation"
        && structuredError.reasonCode === "GATE_EVALUATOR_FAILED"
        && structuredError.context?.profile === "converged"
        && structuredError.context?.gate_id === "converged_validation"
        && structuredError.cause instanceof Error
        && structuredError.cause.message === "writer exploded"
      );
    });
  });
});
