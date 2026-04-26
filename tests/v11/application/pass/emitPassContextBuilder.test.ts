import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  buildEmitPassContext,
  type BuildEmitPassContextDependencies
} from "../../../../src/v11/application/pass/emitPassContextBuilder.js";
import type { BuildPassRoutingInputInput } from "../../../../src/v11/application/pass/passRoutingInvocationBuilders.js";

describe("emitPassContextBuilder", () => {
  it("builds flow context from normalized command, payload and workspace data", async () => {
    const now = new Date("2026-03-19T22:30:00.000Z");
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));
    const passRouting = {
      intent: "review",
      inferredIntent: false,
      reviewerVerification: undefined,
      transcript: [],
      repeatCleanTrigger: {
        reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
        reasonDetail: "base_precondition_not_met",
        trigger: false,
        mostRecentPreviousReviewerCleanPassEnvelope: false
      }
    } as never;

    let capturedRoutingInput: BuildPassRoutingInputInput | undefined;
    let capturedRoutingDependencies: unknown;

    const dependencies: BuildEmitPassContextDependencies = {
      normalizePassCommandInput: () => ({
        summary: "normalized summary",
        refs: ["artifact://summary.md"],
        now
      }),
      normalizePassCommandPayload: () => ({
        findings: [],
        hasFindings: false,
        noFindings: true,
        findingsPayloadInvalid: false
      }),
      preparePassWorkspaceContext: async () =>
        ({
          resolved: {
            bubbleId: "b_emit_ctx_01",
            repoPath: "/repo",
            worktreePath: "/remote/repo",
            bubbleConfig: {
              id: "b_emit_ctx_01",
              review_artifact_type: "code",
              severity_gate_round: 4,
              review_policy: {
                review_loop_mode: "full",
                reviewer_blocking_min_severity: "P2",
                meta_review_auto_rework_min_severity: "P3"
              }
            },
            bubblePaths: {
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_01",
              transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_01/transcript.ndjson"
            }
          },
          bubbleIdentity: {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789"
          },
          loadedState: {
            fingerprint: "fp_emit_ctx_01",
            state: {}
          },
          state: {
            state: "RUNNING",
            round: 2
          },
          handoff: {
            senderAgent: "claude",
            senderRole: "reviewer",
            recipientAgent: "codex",
            recipientRole: "implementer",
            envelopeRound: 2,
            nextRound: 3
          },
          implementer: "codex",
          reviewer: "claude"
        }) as never,
      buildPassRoutingInput: (input) => {
        capturedRoutingInput = input;
        return input as never;
      },
      preparePassRouting: async (_input, routingDependencies) => {
        capturedRoutingDependencies = routingDependencies;
        return passRouting;
      },
      createPassRoutingDependencies: (inferDefaultPassIntent) =>
        ({
          inferDefaultPassIntent
        }) as never
    };

    const inferDefaultPassIntent = () => "review" as const;

    const context = await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary",
          refs: ["raw-ref"],
          intent: "review",
          findings: [],
          noFindings: true,
          cwd: "/repo/.pairflow/worktrees/b_emit_ctx_01",
          now
        },
        createError,
        inferDefaultPassIntent
      },
      dependencies
    );

    expect(context.summary).toBe("normalized summary");
    expect(context.refs).toEqual(["artifact://summary.md"]);
    expect(context.now).toBe(now);
    expect(context.nowIso).toBe("2026-03-19T22:30:00.000Z");
    expect(context.hasFindings).toBe(false);
    expect(context.noFindings).toBe(true);
    expect(context.passRouting).toBe(passRouting);
    expect(context.createError).toBe(createError);
    expect(capturedRoutingInput?.inputIntent).toBe("review");
    expect(capturedRoutingInput?.senderRole).toBe("reviewer");
    expect(capturedRoutingInput?.round).toBe(2);
    expect(capturedRoutingInput?.reviewerBlockingMinSeverity).toBe("P2");
    expect(capturedRoutingInput?.worktreePath).toBe("/remote/repo");
    expect(capturedRoutingDependencies).toBeDefined();
    expect(context.activation).toBeUndefined();
  });

  it("omits optional inputIntent when command input does not provide it", async () => {
    let capturedRoutingInput: BuildPassRoutingInputInput | undefined;

    const dependencies: BuildEmitPassContextDependencies = {
      normalizePassCommandInput: () => ({
        summary: "normalized summary",
        refs: [],
        now: new Date("2026-03-19T22:35:00.000Z")
      }),
      normalizePassCommandPayload: () => ({
        findings: [],
        hasFindings: false,
        noFindings: false,
        findingsPayloadInvalid: false
      }),
      preparePassWorkspaceContext: async () =>
        ({
          resolved: {
            bubbleId: "b_emit_ctx_02",
            repoPath: "/repo",
            worktreePath: "/remote/repo",
            bubbleConfig: {
              id: "b_emit_ctx_02",
              review_artifact_type: "code",
              severity_gate_round: 4
            },
            bubblePaths: {
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_02",
              transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_02/transcript.ndjson"
            }
          },
          bubbleIdentity: {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789"
          },
          loadedState: {
            fingerprint: "fp_emit_ctx_02",
            state: {}
          },
          state: {
            state: "RUNNING",
            round: 1
          },
          handoff: {
            senderAgent: "codex",
            senderRole: "implementer",
            recipientAgent: "claude",
            recipientRole: "reviewer",
            envelopeRound: 1,
            nextRound: 1
          },
          implementer: "codex",
          reviewer: "claude"
        }) as never,
      buildPassRoutingInput: (input) => {
        capturedRoutingInput = input;
        return input as never;
      },
      preparePassRouting: async () =>
        ({
          intent: "review",
          inferredIntent: true,
          reviewerVerification: undefined,
          transcript: [],
          repeatCleanTrigger: {
            reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
            reasonDetail: "base_precondition_not_met",
            trigger: false,
            mostRecentPreviousReviewerCleanPassEnvelope: false
          }
        }) as never,
      createPassRoutingDependencies: () => ({}) as never
    };

    await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary"
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        inferDefaultPassIntent: () => "review"
      },
      dependencies
    );

    expect(capturedRoutingInput).toBeDefined();
    expect(capturedRoutingInput?.reviewerBlockingMinSeverity).toBe("P3");
    expect(
      Object.prototype.hasOwnProperty.call(capturedRoutingInput ?? {}, "inputIntent")
    ).toBe(false);
  });

  it("omits activation when loaded execution context has blank execution_id without authoritative context", async () => {
    const context = await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary"
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        inferDefaultPassIntent: () => "review"
      },
      {
        normalizePassCommandInput: () => ({
          summary: "normalized summary",
          refs: [],
          now: new Date("2026-03-19T22:40:00.000Z")
        }),
        normalizePassCommandPayload: () => ({
          findings: [],
          hasFindings: false,
          noFindings: false,
          findingsPayloadInvalid: false
        }),
        preparePassWorkspaceContext: async () =>
          ({
            resolved: {
              bubbleId: "b_emit_ctx_03",
              repoPath: "/repo",
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_03",
              bubbleConfig: {
                id: "b_emit_ctx_03",
                review_artifact_type: "code",
                severity_gate_round: 4
              },
              bubblePaths: {
                worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_03",
                transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_03/transcript.ndjson"
              }
            },
            bubbleIdentity: {
              bubbleInstanceId: "bi_1234567890_abcdef0123456789"
            },
            loadedState: {
              fingerprint: "fp_emit_ctx_03",
              state: {
                execution_context: {
                  active_role: "reviewer",
                  awaited_output_type: "pass_result",
                  handoff_id: "implementer:b_emit_ctx_03:round:2:attempt:1",
                  execution_id: "   ",
                  round: 2,
                  started_at: "2026-03-19T22:00:00.000Z",
                  deadline_at: "2026-03-19T23:00:00.000Z",
                  attempt: 1
                }
              }
            },
            state: {
              state: "RUNNING",
              round: 2
            },
            handoff: {
              senderAgent: "claude",
              senderRole: "reviewer",
              recipientAgent: "codex",
              recipientRole: "implementer",
              envelopeRound: 2,
              nextRound: 3
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        buildPassRoutingInput: (input) => input as never,
        preparePassRouting: async () =>
          ({
            intent: "review",
            inferredIntent: true,
            reviewerVerification: undefined,
            transcript: [],
            repeatCleanTrigger: {
              reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
              reasonDetail: "base_precondition_not_met",
              trigger: false,
              mostRecentPreviousReviewerCleanPassEnvelope: false
            }
          }) as never,
        createPassRoutingDependencies: () => ({}) as never
      }
    );

    expect(context.activation).toBeUndefined();
  });

  it("omits activation when loaded execution context is missing execution_id without authoritative context", async () => {
    const context = await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary"
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        inferDefaultPassIntent: () => "review"
      },
      {
        normalizePassCommandInput: () => ({
          summary: "normalized summary",
          refs: [],
          now: new Date("2026-03-19T22:42:00.000Z")
        }),
        normalizePassCommandPayload: () => ({
          findings: [],
          hasFindings: false,
          noFindings: false,
          findingsPayloadInvalid: false
        }),
        preparePassWorkspaceContext: async () =>
          ({
            resolved: {
              bubbleId: "b_emit_ctx_035",
              repoPath: "/repo",
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_035",
              bubbleConfig: {
                id: "b_emit_ctx_035",
                review_artifact_type: "code",
                severity_gate_round: 4
              },
              bubblePaths: {
                worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_035",
                transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_035/transcript.ndjson"
              }
            },
            bubbleIdentity: {
              bubbleInstanceId: "bi_1234567890_abcdef0123456789"
            },
            loadedState: {
              fingerprint: "fp_emit_ctx_035",
              state: {
                execution_context: {
                  active_role: "reviewer",
                  awaited_output_type: "pass_result",
                  handoff_id: "implementer:b_emit_ctx_035:round:2:attempt:1",
                  round: 2,
                  started_at: "2026-03-19T22:00:00.000Z",
                  deadline_at: "2026-03-19T23:00:00.000Z",
                  attempt: 1
                } as never
              }
            },
            state: {
              state: "RUNNING",
              round: 2
            },
            handoff: {
              senderAgent: "claude",
              senderRole: "reviewer",
              recipientAgent: "codex",
              recipientRole: "implementer",
              envelopeRound: 2,
              nextRound: 3
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        buildPassRoutingInput: (input) => input as never,
        preparePassRouting: async () =>
          ({
            intent: "review",
            inferredIntent: true,
            reviewerVerification: undefined,
            transcript: [],
            repeatCleanTrigger: {
              reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
              reasonDetail: "base_precondition_not_met",
              trigger: false,
              mostRecentPreviousReviewerCleanPassEnvelope: false
            }
          }) as never,
        createPassRoutingDependencies: () => ({}) as never
      }
    );

    expect(context.activation).toBeUndefined();
  });

  it("maps activation from loaded state execution context when authoritative context is absent", async () => {
    const context = await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary"
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        inferDefaultPassIntent: () => "review"
      },
      {
        normalizePassCommandInput: () => ({
          summary: "normalized summary",
          refs: [],
          now: new Date("2026-03-19T22:45:00.000Z")
        }),
        normalizePassCommandPayload: () => ({
          findings: [],
          hasFindings: false,
          noFindings: false,
          findingsPayloadInvalid: false
        }),
        preparePassWorkspaceContext: async () =>
          ({
            resolved: {
              bubbleId: "b_emit_ctx_04",
              repoPath: "/repo",
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_04",
              bubbleConfig: {
                id: "b_emit_ctx_04",
                review_artifact_type: "code",
                severity_gate_round: 4
              },
              bubblePaths: {
                worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_04",
                transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_04/transcript.ndjson"
              }
            },
            bubbleIdentity: {
              bubbleInstanceId: "bi_1234567890_abcdef0123456789"
            },
            loadedState: {
              fingerprint: "fp_emit_ctx_04",
              state: {
                execution_context: {
                  active_role: "reviewer",
                  awaited_output_type: "pass_result",
                  handoff_id: "implementer:b_emit_ctx_04:round:2:attempt:1",
                  execution_id: "exec_emit_ctx_04",
                  round: 2,
                  started_at: "2026-03-19T22:00:00.000Z",
                  deadline_at: "2026-03-19T23:00:00.000Z",
                  attempt: 1
                }
              }
            },
            state: {
              state: "RUNNING",
              round: 2
            },
            handoff: {
              senderAgent: "claude",
              senderRole: "reviewer",
              recipientAgent: "codex",
              recipientRole: "implementer",
              envelopeRound: 2,
              nextRound: 3
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        buildPassRoutingInput: (input) => input as never,
        preparePassRouting: async () =>
          ({
            intent: "review",
            inferredIntent: true,
            reviewerVerification: undefined,
            transcript: [],
            repeatCleanTrigger: {
              reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
              reasonDetail: "base_precondition_not_met",
              trigger: false,
              mostRecentPreviousReviewerCleanPassEnvelope: false
            }
          }) as never,
        createPassRoutingDependencies: () => ({}) as never
      }
    );

    expect(context.activation).toBeUndefined();
  });

  it("prefers authoritative activation context over loaded state execution context", async () => {
    const context = await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary",
          authoritativeContext: {
            handoff_id: "implementer:b_emit_ctx_05:round:3:attempt:1",
            execution_id: "exec_authoritative_05",
            expected_role: "implementer",
            expected_round: 3,
            expected_state_fingerprint: "fp_authoritative_05"
          } as never
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        inferDefaultPassIntent: () => "review"
      },
      {
        normalizePassCommandInput: () => ({
          summary: "normalized summary",
          refs: [],
          now: new Date("2026-03-19T22:50:00.000Z")
        }),
        normalizePassCommandPayload: () => ({
          findings: [],
          hasFindings: false,
          noFindings: false,
          findingsPayloadInvalid: false
        }),
        preparePassWorkspaceContext: async () =>
          ({
            resolved: {
              bubbleId: "b_emit_ctx_05",
              repoPath: "/repo",
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_05",
              bubbleConfig: {
                id: "b_emit_ctx_05",
                review_artifact_type: "code",
                severity_gate_round: 4
              },
              bubblePaths: {
                worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_05",
                transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_05/transcript.ndjson"
              }
            },
            bubbleIdentity: {
              bubbleInstanceId: "bi_1234567890_abcdef0123456789"
            },
            loadedState: {
              fingerprint: "fp_emit_ctx_05",
              state: {
                execution_context: {
                  active_role: "reviewer",
                  awaited_output_type: "pass_result",
                  handoff_id: "stale_handoff",
                  execution_id: "stale_execution",
                  round: 99,
                  started_at: "2026-03-19T22:00:00.000Z",
                  deadline_at: "2026-03-19T23:00:00.000Z",
                  attempt: 1
                }
              }
            },
            state: {
              state: "RUNNING",
              round: 3
            },
            handoff: {
              senderAgent: "claude",
              senderRole: "reviewer",
              recipientAgent: "codex",
              recipientRole: "implementer",
              envelopeRound: 3,
              nextRound: 4
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        buildPassRoutingInput: (input) => input as never,
        preparePassRouting: async () =>
          ({
            intent: "review",
            inferredIntent: true,
            reviewerVerification: undefined,
            transcript: [],
            repeatCleanTrigger: {
              reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
              reasonDetail: "base_precondition_not_met",
              trigger: false,
              mostRecentPreviousReviewerCleanPassEnvelope: false
            }
          }) as never,
        createPassRoutingDependencies: () => ({}) as never
      }
    );

    expect(context.activation).toBeUndefined();
  });

  it("omits activation when implementer execution_id reuses handoff_id", async () => {
    const context = await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary"
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        inferDefaultPassIntent: () => "review"
      },
      {
        normalizePassCommandInput: () => ({
          summary: "normalized summary",
          refs: [],
          now: new Date("2026-03-19T22:55:00.000Z")
        }),
        normalizePassCommandPayload: () => ({
          findings: [],
          hasFindings: false,
          noFindings: false,
          findingsPayloadInvalid: false
        }),
        preparePassWorkspaceContext: async () =>
          ({
            resolved: {
              bubbleId: "b_emit_ctx_06",
              repoPath: "/repo",
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_06",
              bubbleConfig: {
                id: "b_emit_ctx_06",
                review_artifact_type: "code",
                severity_gate_round: 4
              },
              bubblePaths: {
                worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_06",
                transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_06/transcript.ndjson"
              }
            },
            bubbleIdentity: {
              bubbleInstanceId: "bi_1234567890_abcdef0123456789"
            },
            loadedState: {
              fingerprint: "fp_emit_ctx_06",
              state: {
                active_role: "implementer",
                round: 2,
                execution_context: {
                  active_role: "implementer",
                  awaited_output_type: "pass_result",
                  handoff_id: "implementer:b_emit_ctx_06:round:2:attempt:1",
                  execution_id: "implementer:b_emit_ctx_06:round:2:attempt:1",
                  round: 2,
                  started_at: "2026-03-19T22:00:00.000Z",
                  deadline_at: "2026-03-19T23:00:00.000Z",
                  attempt: 1
                }
              }
            },
            state: {
              state: "RUNNING",
              round: 2,
              active_role: "implementer"
            },
            handoff: {
              senderAgent: "codex",
              senderRole: "implementer",
              recipientAgent: "claude",
              recipientRole: "reviewer",
              envelopeRound: 2,
              nextRound: 2
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        buildPassRoutingInput: (input) => input as never,
        preparePassRouting: async () =>
          ({
            intent: "review",
            inferredIntent: true,
            reviewerVerification: undefined,
            transcript: [],
            repeatCleanTrigger: {
              reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
              reasonDetail: "base_precondition_not_met",
              trigger: false,
              mostRecentPreviousReviewerCleanPassEnvelope: false
            }
          }) as never,
        createPassRoutingDependencies: () => ({}) as never
      }
    );

    expect(context.activation).toBeUndefined();
  });

  it("reuses workspace activation provenance when activated meta-only bypass is resolved", async () => {
    const context = await buildEmitPassContext(
      {
        commandInput: {
          summary: "raw summary"
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        inferDefaultPassIntent: () => "review"
      },
      {
        normalizePassCommandInput: () => ({
          summary: "normalized summary",
          refs: [],
          now: new Date("2026-03-19T23:00:00.000Z")
        }),
        normalizePassCommandPayload: () => ({
          findings: [],
          hasFindings: false,
          noFindings: false,
          findingsPayloadInvalid: false
        }),
        preparePassWorkspaceContext: async () =>
          ({
            resolved: {
              bubbleId: "b_emit_ctx_07",
              repoPath: "/repo",
              worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_07",
              bubbleConfig: {
                id: "b_emit_ctx_07",
                review_artifact_type: "code",
                severity_gate_round: 4
              },
              bubblePaths: {
                worktreePath: "/repo/.pairflow/worktrees/b_emit_ctx_07",
                transcriptPath: "/repo/.pairflow/bubbles/b_emit_ctx_07/transcript.ndjson"
              }
            },
            bubbleIdentity: {
              bubbleInstanceId: "bi_1234567890_abcdef0123456789"
            },
            loadedState: {
              fingerprint: "fp_emit_ctx_07",
              state: {}
            },
            state: {
              state: "RUNNING",
              round: 2,
              active_role: "implementer"
            },
            activation: {
              handoff_id: "implementer:b_emit_ctx_07:round:2:attempt:1",
              execution_id: "exec_emit_ctx_07",
              expected_role: "implementer",
              expected_round: 2,
              expected_state_fingerprint: "fp_emit_ctx_07"
            },
            reviewPolicyRuntime: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "meta_only",
              support_status: "enabled",
              reviewer_blocking_min_severity: "P2",
              meta_review_auto_rework_min_severity: "P2"
            },
            handoff: {
              senderAgent: "codex",
              senderRole: "implementer",
              recipientAgent: "codex",
              recipientRole: "meta_reviewer",
              envelopeRound: 2,
              nextRound: 2
            },
            implementer: "codex",
            reviewer: "claude"
          }) as never,
        buildPassRoutingInput: (input) => input as never,
        preparePassRouting: async () =>
          ({
            intent: "review",
            inferredIntent: true,
            reviewerVerification: undefined,
            transcript: [],
            repeatCleanTrigger: {
              reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
              reasonDetail: "base_precondition_not_met",
              trigger: false,
              mostRecentPreviousReviewerCleanPassEnvelope: false
            }
          }) as never,
        createPassRoutingDependencies: () => ({}) as never
      }
    );

    expect(context.activation).toEqual({
      handoff_id: "implementer:b_emit_ctx_07:round:2:attempt:1",
      execution_id: "exec_emit_ctx_07",
      expected_role: "implementer",
      expected_round: 2,
      expected_state_fingerprint: "fp_emit_ctx_07"
    });
    expect(context.handoff.recipientRole).toBe("meta_reviewer");
  });
});
