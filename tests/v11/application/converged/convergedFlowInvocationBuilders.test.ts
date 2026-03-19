import { describe, expect, it } from "vitest";

import {
  buildConvergedFlowDependencies,
  buildConvergedFlowInput
} from "../../../../src/v11/shared/converged/convergedFlowInvocationBuilders.js";

describe("convergedFlowInvocationBuilders", () => {
  it("builds runConvergedFlow input and forwards only provided optionals", () => {
    const now = new Date("2026-03-19T20:05:00.000Z");
    const createError = (message: string) => new Error(message);
    const resolveMetaReviewRolloutBlockingReasonCodes = () => ["CODE_A"];

    const input = buildConvergedFlowInput({
      summary: "ready for converged",
      refs: ["artifacts/review.md"],
      now,
      expectedRound: 4,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes
    });

    expect(input).toEqual({
      summary: "ready for converged",
      refs: ["artifacts/review.md"],
      now,
      expectedRound: 4,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes
    });
    expect("cwd" in input).toBe(false);
    expect("expectedStateFingerprint" in input).toBe(false);
    expect("expectedReviewer" in input).toBe(false);
  });

  it("builds dependencies and forwards only provided optional overrides", () => {
    const dependencies = buildConvergedFlowDependencies({
      prepareConvergedRouting: async () =>
        ({
          resolved: {},
          bubbleIdentity: {},
          state: {},
          implementer: "codex",
          reviewer: "claude"
        }) as never,
      prepareConvergedPolicy: async () =>
        ({
          transcript: [],
          policy: {
            ok: true,
            errors: [],
            diagnostics: []
          },
          convergencePolicyDiagnostics: []
        }) as never,
      prepareConvergedValidation: async () =>
        ({
          specLockState: {},
          roundGateState: {},
          summaryVerifierGateDecision: {}
        }) as never,
      executeConvergedExecution: async () =>
        ({
          convergence: {},
          gateResult: {}
        }) as never,
      finalizeConvergedFlow: async () =>
        ({
          bubbleId: "b_1",
          convergenceSequence: 1,
          convergenceEnvelope: {},
          gateRoute: "human_gate_approve",
          approvalRequestSequence: 2,
          approvalRequestEnvelope: {},
          state: {}
        }) as never,
      emitBubbleNotification: async () =>
        ({
          kind: "waiting-human",
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        }) as never
    });

    expect(dependencies.prepareConvergedRouting).toBeTypeOf("function");
    expect(dependencies.prepareConvergedPolicy).toBeTypeOf("function");
    expect(dependencies.prepareConvergedValidation).toBeTypeOf("function");
    expect(dependencies.executeConvergedExecution).toBeTypeOf("function");
    expect(dependencies.finalizeConvergedFlow).toBeTypeOf("function");
    expect(dependencies.emitBubbleNotification).toBeTypeOf("function");
    expect("emitTmuxDeliveryNotification" in dependencies).toBe(false);
    expect("applyMetaReviewGateOnConvergence" in dependencies).toBe(false);
    expect("recoverMetaReviewGateFromSnapshot" in dependencies).toBe(false);
  });
});
