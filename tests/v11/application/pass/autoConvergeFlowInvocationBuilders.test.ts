import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  type BuildAutoConvergeFlowDependenciesInput,
  type BuildAutoConvergeFlowInputInput,
  buildAutoConvergeFlowDependencies,
  buildAutoConvergeFlowInput
} from "../../../../src/v11/application/pass/autoConvergeFlowInvocationBuilders.js";

function createAutoConvergeBaseInput(
  passRoutingOverrides?: Partial<BuildAutoConvergeFlowInputInput["passRouting"]>
): BuildAutoConvergeFlowInputInput {
  return {
    summary: "auto converge summary",
    refs: ["artifacts/summary.md"],
    now: new Date("2026-03-19T22:20:00.000Z"),
    nowIso: "2026-03-19T22:20:00.000Z",
    findings: [],
    hasFindings: false,
    noFindings: true,
    resolved: {
      bubbleId: "b_auto_builder_01",
      repoPath: "/repo",
      worktreePath: "/remote/repo",
      bubbleConfig: {
        id: "b_auto_builder_01",
        review_artifact_type: "code",
        severity_gate_round: 4
      } as never,
      bubblePaths: {
        worktreePath: "/repo/.pairflow/worktrees/b_auto_builder_01",
        artifactsDir: "/repo/.pairflow/bubbles/b_auto_builder_01/artifacts",
        taskArtifactPath: "/repo/.pairflow/bubbles/b_auto_builder_01/task.md",
        statePath: "/repo/.pairflow/bubbles/b_auto_builder_01/state.json",
        reviewVerificationArtifactPath:
          "/repo/.pairflow/bubbles/b_auto_builder_01/artifacts/review-verification.json"
      } as never
    },
    bubbleIdentity: {
      bubbleInstanceId: "bi_1234567890_abcdef0123456789"
    },
    handoff: {
      senderAgent: "claude",
      senderRole: "reviewer",
      recipientAgent: "codex",
      recipientRole: "implementer",
      envelopeRound: 4,
      nextRound: 5
    },
    reviewer: "claude",
    implementer: "codex",
    state: {
      state: "RUNNING",
      round: 4,
      round_role_history: []
    } as never,
    loadedState: {
      fingerprint: "fp_auto_01"
    },
    passRouting: {
      intent: "review",
      inferredIntent: true,
      reviewerVerification: undefined,
      transcript: [],
      repeatCleanTrigger: {
        reasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
        reasonDetail: "previous_reviewer_pass_clean",
        trigger: true,
        mostRecentPreviousReviewerCleanPassEnvelope: true
      },
      ...passRoutingOverrides
    },
    createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
    onDownstreamRejected: (reason: string) => {
      throw new Error(`rejected:${reason}`);
    }
  } as unknown as BuildAutoConvergeFlowInputInput;
}

describe("autoConvergeFlowInvocationBuilders", () => {
  it("builds runAutoConvergeFlow input and omits optional reviewer claim fields", () => {
    const input = buildAutoConvergeFlowInput(createAutoConvergeBaseInput());

    expect(input.passIntent).toBe("review");
    expect(input.worktreePath).toBe("/remote/repo");
    expect(input.inferredIntent).toBe(true);
    expect(input.repeatCleanReasonCode).toBe(
      "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED"
    );
    expect(input.repeatCleanReasonDetail).toBe("previous_reviewer_pass_clean");
    expect(input.repeatCleanTrigger).toBe(true);
    expect(input.mostRecentPreviousReviewerCleanPassEnvelope).toBe(true);
    expect("reviewerFindingsClaim" in input).toBe(false);
    expect("reviewerFindingsClaimParserMetadata" in input).toBe(false);
  });

  it("forwards optional reviewer claim fields when provided", () => {
    const input = buildAutoConvergeFlowInput(
      createAutoConvergeBaseInput({
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

  it("wires dependencies and omits optional converged emit overrides when undefined", async () => {
    type StubResult = { status: string };

    let capturedConvergedDeps: Record<string, unknown> | undefined;
    let capturedFinalizeDeps: Record<string, unknown> | undefined;

    const dependencyInput: BuildAutoConvergeFlowDependenciesInput<StubResult> = {
      prepareRepeatCleanAutoConverge: async () => ({
        expectedStateFingerprint: "fp_auto_02"
      }),
      executeAutoConvergeConverged: async (_input, dependencies) => {
        capturedConvergedDeps = dependencies as unknown as Record<string, unknown>;
        return {
          convergenceSequence: 11,
          convergenceEnvelope: { id: "env_converged_01" },
          state: { state: "READY_FOR_HUMAN_APPROVAL" },
          gateRoute: "human_gate_approve",
          approvalRequestSequence: 12,
          approvalRequestEnvelope: { id: "env_approval_01" }
        } as never;
      },
      emitConvergedFromWorkspace: async () =>
        ({
          convergenceSequence: 11,
          convergenceEnvelope: { id: "env_converged_01" },
          state: { state: "READY_FOR_HUMAN_APPROVAL" },
          gateRoute: "human_gate_approve",
          approvalRequestSequence: 12,
          approvalRequestEnvelope: { id: "env_approval_01" }
        }) as never,
      finalizeAutoConvergePass: async (_input, dependencies) => {
        capturedFinalizeDeps = dependencies as unknown as Record<string, unknown>;
        return { status: "ok" };
      },
      updateReviewerDocGateArtifact: async () => undefined,
      emitBubbleLifecycleEventBestEffort: async () => undefined,
      buildPassLifecycleMetricMetadata: () => ({}),
      buildAutoConvergePassResult: () => ({ status: "ok" })
    };
    const dependencies = buildAutoConvergeFlowDependencies(dependencyInput);

    await dependencies.executeAutoConvergeConverged({
      summary: "auto",
      refs: [],
      cwd: "/repo",
      now: new Date("2026-03-19T22:20:00.000Z"),
      expectedStateFingerprint: "fp_auto_02",
      expectedRound: 4,
      expectedReviewer: "claude",
      onDownstreamRejected: (reason) => {
        throw new Error(reason);
      }
    });
    await dependencies.finalizeAutoConvergePass({} as never);

    expect(capturedConvergedDeps).toBeDefined();
    expect(capturedFinalizeDeps).toBeDefined();
    if (capturedConvergedDeps === undefined || capturedFinalizeDeps === undefined) {
      throw new Error("expected dependency captures to be defined");
    }
    expect("emitConvergedFromWorkspace" in capturedConvergedDeps).toBe(true);
    expect(typeof capturedConvergedDeps.emitConvergedFromWorkspace).toBe(
      "function"
    );
    expect(capturedConvergedDeps).not.toHaveProperty("emitDeliveryNotificationAck");
    expect(capturedConvergedDeps).not.toHaveProperty("emitTmuxDeliveryNotification");
    expect(capturedConvergedDeps).not.toHaveProperty("emitBubbleNotification");
    expect(typeof capturedFinalizeDeps.updateReviewerDocGateArtifact).toBe(
      "function"
    );
    expect(typeof capturedFinalizeDeps.emitBubbleLifecycleEventBestEffort).toBe(
      "function"
    );
    expect(typeof capturedFinalizeDeps.buildPassLifecycleMetricMetadata).toBe(
      "function"
    );
    expect(typeof capturedFinalizeDeps.buildAutoConvergePassResult).toBe(
      "function"
    );
  });

  it("forwards optional converged emit overrides when provided", async () => {
    let capturedConvergedDeps: Record<string, unknown> | undefined;

    const emitDeliveryNotificationAck = (() => undefined) as never;
    const emitTmuxDeliveryNotification = (() => undefined) as never;
    const emitBubbleNotification = (() => undefined) as never;

    const dependencies = buildAutoConvergeFlowDependencies({
      prepareRepeatCleanAutoConverge: async () => ({
        expectedStateFingerprint: "fp_auto_03"
      }),
      executeAutoConvergeConverged: async (_input, dependencyOverrides) => {
        capturedConvergedDeps =
          dependencyOverrides as unknown as Record<string, unknown>;
        return {
          convergenceSequence: 13,
          convergenceEnvelope: { id: "env_converged_03" },
          state: { state: "READY_FOR_HUMAN_APPROVAL" },
          gateRoute: "human_gate_approve",
          approvalRequestSequence: 14,
          approvalRequestEnvelope: { id: "env_approval_03" }
        } as never;
      },
      emitConvergedFromWorkspace: async () => ({} as never),
      emitDeliveryNotificationAck,
      emitTmuxDeliveryNotification,
      emitBubbleNotification,
      finalizeAutoConvergePass: async () => ({ status: "ok" }),
      updateReviewerDocGateArtifact: async () => undefined,
      emitBubbleLifecycleEventBestEffort: async () => undefined,
      buildPassLifecycleMetricMetadata: () => ({}),
      buildAutoConvergePassResult: () => ({ status: "ok" })
    });

    await dependencies.executeAutoConvergeConverged({
      summary: "auto",
      refs: [],
      cwd: "/repo",
      now: new Date("2026-03-19T22:20:00.000Z"),
      expectedStateFingerprint: "fp_auto_03",
      expectedRound: 4,
      expectedReviewer: "claude",
      onDownstreamRejected: (reason) => {
        throw new Error(reason);
      }
    });

    expect(capturedConvergedDeps).toBeDefined();
    if (capturedConvergedDeps === undefined) {
      throw new Error("expected converged dependency capture to be defined");
    }
    expect(typeof capturedConvergedDeps.emitConvergedFromWorkspace).toBe(
      "function"
    );
    expect(capturedConvergedDeps.emitDeliveryNotificationAck).toBe(
      emitDeliveryNotificationAck
    );
    expect(capturedConvergedDeps.emitTmuxDeliveryNotification).toBe(
      emitTmuxDeliveryNotification
    );
    expect(capturedConvergedDeps.emitBubbleNotification).toBe(
      emitBubbleNotification
    );
  });
});
