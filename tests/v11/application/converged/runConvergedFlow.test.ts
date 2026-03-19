import { describe, expect, it } from "vitest";

import { runConvergedFlow } from "../../../../src/v11/application/converged/runConvergedFlow.js";

describe("runConvergedFlow", () => {
  it("orchestrates routing -> policy -> validation -> execution -> finalization in order", async () => {
    const callOrder: string[] = [];

    const result = await runConvergedFlow(
      {
        summary: "converged summary",
        refs: ["artifacts/review.md"],
        now: new Date("2026-03-19T19:30:00.000Z"),
        cwd: "/repo/worktree",
        expectedStateFingerprint: "fp_1",
        expectedRound: 3,
        expectedReviewer: "claude",
        createError: (message) => new Error(message),
        resolveMetaReviewRolloutBlockingReasonCodes: () => []
      },
      {
        prepareConvergedRouting: async (input) => {
          callOrder.push("prepareConvergedRouting");
          expect(input.cwd).toBe("/repo/worktree");
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
              delivered: true,
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
            delivery: { delivered: true, retried: false }
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

  it("raises normalized policy error via createError when policy validation fails", async () => {
    await expect(() =>
      runConvergedFlow(
        {
          summary: "summary",
          refs: [],
          now: new Date("2026-03-19T19:35:00.000Z"),
          createError: (message) => new Error(`wrapped:${message}`),
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
      "wrapped:Convergence validation failed: MISSING_ALTERNATION Diagnostics: DIAG_A"
    );
  });
});
