import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { preparePassRouting } from "../../../../src/v11/application/pass/passRoutingPreparation.js";

describe("preparePassRouting", () => {
  it("builds routing context via reviewer preparation, intent resolution, verification, and repeat-clean evaluation", async () => {
    const callOrder: string[] = [];
    const sampleTranscript = [{ id: "env-1" }] as never;

    const result = await preparePassRouting(
      {
        senderRole: "reviewer",
        round: 3,
        summary: "No findings",
        refs: ["artifact.log"],
        findings: [],
        hasFindings: false,
        noFindings: true,
        findingsPayloadInvalid: false,
        reviewerBlockingMinSeverity: "P2",
        bubbleConfig: {
          review_artifact_type: "code",
          severity_gate_round: 2,
          accuracy_critical: true
        },
        worktreePath: "/tmp/worktree",
        transcriptPath: "/tmp/transcript.ndjson",
        reviewer: "claude",
        implementer: "codex",
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        prepareReviewerPass: (input) => {
          callOrder.push("prepareReviewerPass");
          expect(input.senderRole).toBe("reviewer");
          expect(input.reviewerBlockingMinSeverity).toBe("P2");
          return {
            inferredReviewerIntent: "review",
            reviewerFindingsClaim: {
              state: "clean",
              source: "payload_flags"
            },
            reviewerFindingsClaimParserMetadata: {
              parserState: "clean",
              parserDivergence: false
            }
          };
        },
        resolvePassIntent: (input) => {
          callOrder.push("resolvePassIntent");
          expect(input.inferredReviewerIntent).toBe("review");
          return {
            intent: "review",
            inferredIntent: true
          };
        },
        prepareReviewerVerification: async (input) => {
          callOrder.push("prepareReviewerVerification");
          expect(input.intent).toBe("review");
          expect(input.accuracyCritical).toBe(true);
          return {
            payload: { overall: "pass" },
            inputRef: "artifact.log"
          } as never;
        },
        resolveReviewerVerification: async () => undefined,
        readTranscriptEnvelopes: async (transcriptPath, options) => {
          callOrder.push("readTranscriptEnvelopes");
          expect(transcriptPath).toBe("/tmp/transcript.ndjson");
          expect(options).toEqual({
            allowMissing: true,
            toleratePartialFinalLine: true
          });
          return sampleTranscript;
        },
        evaluateRepeatCleanAutoconvergeTrigger: (input) => {
          callOrder.push("evaluateRepeatCleanAutoconvergeTrigger");
          expect(input.round).toBe(3);
          expect(input.transcript).toBe(sampleTranscript);
          return {
            trigger: true,
            reasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
            reasonDetail: "previous_reviewer_pass_clean",
            mostRecentPreviousReviewerCleanPassEnvelope: true
          };
        }
      }
    );

    expect(callOrder).toEqual([
      "prepareReviewerPass",
      "resolvePassIntent",
      "prepareReviewerVerification",
      "readTranscriptEnvelopes",
      "evaluateRepeatCleanAutoconvergeTrigger"
    ]);
    expect(result.intent).toBe("review");
    expect(result.inferredIntent).toBe(true);
    expect(result.repeatCleanTrigger.trigger).toBe(true);
    expect(result.reviewerFindingsClaim).toEqual({
      state: "clean",
      source: "payload_flags"
    });
    expect(result.reviewerFindingsClaimParserMetadata).toEqual({
      parserState: "clean",
      parserDivergence: false
    });
  });

  it("forwards optional input intent and default intent inferrer dependency", async () => {
    let inferDefaultPassIntentSeen = false;

    await preparePassRouting(
      {
        senderRole: "implementer",
        round: 1,
        summary: "handoff",
        inputIntent: "fix_request",
        refs: [],
        findings: [],
        hasFindings: false,
        noFindings: false,
        findingsPayloadInvalid: false,
        reviewerBlockingMinSeverity: "P3",
        bubbleConfig: {
          review_artifact_type: "document",
          severity_gate_round: 2,
          accuracy_critical: false
        },
        worktreePath: "/tmp/worktree",
        transcriptPath: "/tmp/transcript.ndjson",
        reviewer: "claude",
        implementer: "codex",
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        prepareReviewerPass: () => ({}),
        resolvePassIntent: (input, dependencies) => {
          inferDefaultPassIntentSeen = dependencies?.inferDefaultPassIntent !== undefined;
          expect(input.inputIntent).toBe("fix_request");
          return {
            intent: "fix_request",
            inferredIntent: false
          };
        },
        inferDefaultPassIntent: () => "review",
        prepareReviewerVerification: async () => undefined,
        resolveReviewerVerification: async () => undefined,
        readTranscriptEnvelopes: async () => [],
        evaluateRepeatCleanAutoconvergeTrigger: () => ({
          trigger: false,
          reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
          reasonDetail: "base_precondition_not_met",
          mostRecentPreviousReviewerCleanPassEnvelope: false
        })
      }
    );

    expect(inferDefaultPassIntentSeen).toBe(true);
  });
});
