import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  buildPassRoutingDependencies,
  buildPassRoutingInput
} from "../../../../src/v11/shared/pass/passRoutingInvocationBuilders.js";

describe("passRoutingInvocationBuilders", () => {
  it("builds preparePassRouting input and omits undefined optional fields", () => {
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const routingInput = buildPassRoutingInput({
      senderRole: "implementer",
      round: 2,
      summary: "review handoff",
      refs: ["artifacts/review.md"],
      findings: [],
      hasFindings: false,
      noFindings: false,
      findingsPayloadInvalid: false,
      bubbleConfig: {
        review_artifact_type: "code",
        severity_gate_round: 4
      } as never,
      worktreePath: "/repo/.pairflow/worktrees/b_pass_01",
      transcriptPath: "/repo/.pairflow/bubbles/b_pass_01/transcript.ndjson",
      reviewer: "claude",
      implementer: "codex",
      createError
    });

    expect(routingInput).toEqual({
      senderRole: "implementer",
      round: 2,
      summary: "review handoff",
      refs: ["artifacts/review.md"],
      findings: [],
      hasFindings: false,
      noFindings: false,
      findingsPayloadInvalid: false,
      bubbleConfig: {
        review_artifact_type: "code",
        severity_gate_round: 4
      },
      worktreePath: "/repo/.pairflow/worktrees/b_pass_01",
      transcriptPath: "/repo/.pairflow/bubbles/b_pass_01/transcript.ndjson",
      reviewer: "claude",
      implementer: "codex",
      createError
    });
    expect("inputIntent" in routingInput).toBe(false);
    expect("accuracy_critical" in routingInput.bubbleConfig).toBe(false);
  });

  it("forwards optional inputIntent and accuracy_critical when provided", () => {
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const routingInput = buildPassRoutingInput({
      senderRole: "reviewer",
      round: 3,
      summary: "clean reviewer handoff",
      inputIntent: "review",
      refs: [],
      findings: [],
      hasFindings: false,
      noFindings: true,
      findingsPayloadInvalid: false,
      bubbleConfig: {
        review_artifact_type: "document",
        severity_gate_round: 4,
        accuracy_critical: true
      } as never,
      worktreePath: "/repo/.pairflow/worktrees/b_pass_02",
      transcriptPath: "/repo/.pairflow/bubbles/b_pass_02/transcript.ndjson",
      reviewer: "claude",
      implementer: "codex",
      createError
    });

    expect(routingInput.inputIntent).toBe("review");
    expect(routingInput.bubbleConfig.accuracy_critical).toBe(true);
  });

  it("builds dependencies and forwards only provided optional overrides", () => {
    const dependencies = buildPassRoutingDependencies({
      prepareReviewerPass: () =>
        ({
          inferredReviewerIntent: "review"
        }) as never,
      resolvePassIntent: () =>
        ({
          intent: "review",
          inferredIntent: false
        }) as never,
      prepareReviewerVerification: async () => undefined,
      resolveReviewerVerification: async () => undefined,
      inferDefaultPassIntent: () => "review"
    });

    expect(dependencies.prepareReviewerPass).toBeTypeOf("function");
    expect(dependencies.resolvePassIntent).toBeTypeOf("function");
    expect(dependencies.prepareReviewerVerification).toBeTypeOf("function");
    expect(dependencies.resolveReviewerVerification).toBeTypeOf("function");
    expect(dependencies.inferDefaultPassIntent).toBeTypeOf("function");
    expect("readTranscriptEnvelopes" in dependencies).toBe(false);
    expect("evaluateRepeatCleanAutoconvergeTrigger" in dependencies).toBe(false);
  });

  it("includes transcript and repeat-clean overrides when provided", () => {
    const dependencies = buildPassRoutingDependencies({
      prepareReviewerPass: () => ({}) as never,
      resolvePassIntent: () =>
        ({
          intent: "review",
          inferredIntent: true
        }) as never,
      prepareReviewerVerification: async () => undefined,
      resolveReviewerVerification: async () => undefined,
      readTranscriptEnvelopes: async () => [],
      evaluateRepeatCleanAutoconvergeTrigger: () =>
        ({
          reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
          reasonDetail: "base_precondition_not_met",
          trigger: false,
          mostRecentPreviousReviewerCleanPassEnvelope: false
        }) as never
    });

    expect(dependencies.readTranscriptEnvelopes).toBeTypeOf("function");
    expect(dependencies.evaluateRepeatCleanAutoconvergeTrigger).toBeTypeOf(
      "function"
    );
    expect("inferDefaultPassIntent" in dependencies).toBe(false);
  });
});
