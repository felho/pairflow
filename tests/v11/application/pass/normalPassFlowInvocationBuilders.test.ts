import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  type BuildNormalPassFlowDependenciesInput,
  type BuildNormalPassFlowInputInput,
  buildNormalPassFlowDependencies,
  buildNormalPassFlowInput
} from "../../../../src/v11/shared/pass/normalPassFlowInvocationBuilders.js";

function createNormalBaseInput(
  passRoutingOverrides?: Partial<BuildNormalPassFlowInputInput["passRouting"]>
): BuildNormalPassFlowInputInput {
  return {
    summary: "pass summary",
    refs: ["artifacts/pass.md"],
    now: new Date("2026-03-19T22:10:00.000Z"),
    nowIso: "2026-03-19T22:10:00.000Z",
    findings: [],
    hasFindings: false,
    noFindings: true,
    resolved: {
      bubbleId: "b_pass_builder_01",
      repoPath: "/repo",
      bubbleConfig: {
        id: "b_pass_builder_01",
        review_artifact_type: "code",
        severity_gate_round: 4
      } as never,
      bubblePaths: {
        transcriptPath: "/repo/.pairflow/bubbles/b_pass_builder_01/transcript.ndjson",
        reviewVerificationArtifactPath:
          "/repo/.pairflow/bubbles/b_pass_builder_01/artifacts/review-verification.json",
        statePath: "/repo/.pairflow/bubbles/b_pass_builder_01/state.json",
        artifactsDir: "/repo/.pairflow/bubbles/b_pass_builder_01/artifacts",
        taskArtifactPath: "/repo/.pairflow/bubbles/b_pass_builder_01/task.md",
        worktreePath: "/repo/.pairflow/worktrees/b_pass_builder_01",
        sessionsPath: "/repo/.pairflow/bubbles/b_pass_builder_01/sessions",
        reviewerBriefArtifactPath:
          "/repo/.pairflow/bubbles/b_pass_builder_01/artifacts/reviewer-brief.md",
        reviewerFocusArtifactPath:
          "/repo/.pairflow/bubbles/b_pass_builder_01/artifacts/reviewer-focus.json",
        locksDir: "/repo/.pairflow/bubbles/b_pass_builder_01/locks"
      }
    },
    bubbleIdentity: {
      bubbleInstanceId: "bi_1234567890_abcdef0123456789"
    },
    handoff: {
      senderAgent: "claude",
      senderRole: "reviewer",
      recipientAgent: "codex",
      recipientRole: "implementer",
      envelopeRound: 2,
      nextRound: 3
    },
    reviewer: "claude",
    implementer: "codex",
    state: {
      state: "RUNNING",
      round: 2
    } as never,
    loadedState: {
      fingerprint: "fp_normal_01"
    },
    passRouting: {
      intent: "review",
      inferredIntent: false,
      reviewerVerification: undefined,
      transcript: [],
      repeatCleanTrigger: {
        reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
        reasonDetail: "base_precondition_not_met",
        trigger: false,
        mostRecentPreviousReviewerCleanPassEnvelope: false
      },
      ...passRoutingOverrides
    },
    createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
  } as unknown as BuildNormalPassFlowInputInput;
}

describe("normalPassFlowInvocationBuilders", () => {
  it("builds runNormalPassFlow input and omits optional reviewer claim fields", () => {
    const input = buildNormalPassFlowInput(createNormalBaseInput());

    expect(input.intent).toBe("review");
    expect(input.inferredIntent).toBe(false);
    expect(input.repeatClean).toEqual({
      reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      reasonDetail: "base_precondition_not_met",
      trigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false
    });
    expect("reviewerFindingsClaim" in input).toBe(false);
    expect("reviewerFindingsClaimParserMetadata" in input).toBe(false);
  });

  it("forwards optional reviewer claim fields when provided", () => {
    const input = buildNormalPassFlowInput(
      createNormalBaseInput({
        reviewerFindingsClaim: {
          state: "clean",
          source: "payload_flags"
        },
        reviewerFindingsClaimParserMetadata: {
          parserState: "clean",
          parserDivergence: false
        }
      })
    );

    expect(input.reviewerFindingsClaim).toEqual({
      state: "clean",
      source: "payload_flags"
    });
    expect(input.reviewerFindingsClaimParserMetadata).toEqual({
      parserState: "clean",
      parserDivergence: false
    });
  });

  it("builds dependencies and omits optional delivery overrides when undefined", () => {
    type StubResult = { status: string };

    const dependencyInput: BuildNormalPassFlowDependenciesInput<StubResult> = {
      prepareNormalPassAppend: () => ({
        docGateScopeActive: false,
        findingsForPayload: [],
        lockPath: "/tmp/pass.lock"
      }),
      executeNormalPassAppend: async () => ({
        sequence: 1,
        envelope: {
          id: "env_pass_01"
        } as never
      }),
      persistNormalPassPostAppend: async () => ({
        written: {
          state: {
            state: "RUNNING",
            round: 2
          }
        } as never
      }),
      writePostAppendReviewVerificationArtifact: async () => undefined,
      writePostAppendPassState: async () =>
        ({
          state: {
            state: "RUNNING",
            round: 2
          }
        }) as never,
      updateReviewerDocGateArtifact: async () => undefined,
      executeNormalPassDelivery: async () => ({
        deliveryResult: undefined,
        deliveryRetried: false
      }),
      resolveReviewerTestDirectiveForPass: async () => undefined,
      executePassDelivery: async () => ({
        result: undefined,
        retried: false
      }),
      finalizeNormalPass: async () => ({
        status: "ok"
      }),
      emitBubbleLifecycleEventBestEffort: async () => undefined,
      buildPassLifecycleMetricMetadata: () => ({}),
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata: () => undefined,
      mapPassResultDelivery: () => ({
        delivered: true,
        retried: false
      }),
      buildNormalPassResult: () => ({
        status: "ok"
      })
    };
    const dependencies = buildNormalPassFlowDependencies(dependencyInput);

    expect(dependencies.prepareNormalPassAppend).toBeTypeOf("function");
    expect(dependencies.executeNormalPassAppend).toBeTypeOf("function");
    expect(dependencies.persistNormalPassPostAppend).toBeTypeOf("function");
    expect(dependencies.executeNormalPassDelivery).toBeTypeOf("function");
    expect(dependencies.finalizeNormalPass).toBeTypeOf("function");
    expect("emitTmuxDeliveryNotification" in dependencies).toBe(false);
    expect("refreshReviewerContext" in dependencies).toBe(false);
  });
});
