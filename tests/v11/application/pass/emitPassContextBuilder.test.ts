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
            bubbleConfig: {
              id: "b_emit_ctx_01",
              review_artifact_type: "code",
              severity_gate_round: 4
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
            fingerprint: "fp_emit_ctx_01"
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
    expect(capturedRoutingDependencies).toBeDefined();
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
            fingerprint: "fp_emit_ctx_02"
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
    expect(
      Object.prototype.hasOwnProperty.call(capturedRoutingInput ?? {}, "inputIntent")
    ).toBe(false);
  });
});
