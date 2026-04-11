import { describe, expect, it } from "vitest";

import {
  buildConvergedCommandFlowInvocation,
  buildDefaultConvergedExecutionDependencies,
  buildDefaultConvergedGateDeliveryDependencies,
  buildDefaultConvergedFlowDependencies,
  buildConvergedFlowDependencies,
  buildConvergedFlowInput
} from "../../../../src/v11/application/converged/convergedFlowInvocationBuilders.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("convergedFlowInvocationBuilders", () => {
  it("builds runConvergedFlow input and forwards only provided optionals", () => {
    const now = new Date("2026-03-19T20:05:00.000Z");
    const createError = (input: PairflowCommandErrorInput) => new Error(toErrorMessage(input));
    const resolveMetaReviewRolloutBlockingReasonCodes = () => ["CODE_A"];
    const authoritativeContext = {
      bubble_id: "b_conv_builder_01"
    } as never;

    const input = buildConvergedFlowInput({
      summary: "ready for converged",
      refs: ["artifacts/review.md"],
      findings: [
        {
          severity: "P2",
          title: "Follow-up"
        }
      ],
      now,
      authoritativeContext,
      expectedRound: 4,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes
    });

    expect(input).toEqual({
      summary: "ready for converged",
      refs: ["artifacts/review.md"],
      findings: [
        {
          severity: "P2",
          title: "Follow-up"
        }
      ],
      now,
      authoritativeContext,
      expectedRound: 4,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes
    });
    expect("cwd" in input).toBe(false);
    expect(input.authoritativeContext).toBe(authoritativeContext);
    expect("expectedStateFingerprint" in input).toBe(false);
    expect("expectedReviewer" in input).toBe(false);
  });

  it("omits optional runConvergedFlow input fields when explicitly undefined", () => {
    const now = new Date("2026-03-19T20:10:00.000Z");
    const createError = (input: PairflowCommandErrorInput) => new Error(toErrorMessage(input));
    const input = buildConvergedFlowInput({
      summary: "ready for converged",
      refs: [],
      now,
      cwd: undefined,
      authoritativeContext: undefined,
      expectedStateFingerprint: undefined,
      expectedRound: undefined,
      expectedReviewer: undefined,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes: () => []
    });

    expect("cwd" in input).toBe(false);
    expect("authoritativeContext" in input).toBe(false);
    expect("expectedStateFingerprint" in input).toBe(false);
    expect("expectedRound" in input).toBe(false);
    expect("expectedReviewer" in input).toBe(false);
  });

  it("omits findings from runConvergedFlow input when findings is an explicit empty array", () => {
    const input = buildConvergedFlowInput({
      summary: "ready for converged",
      refs: [],
      findings: [],
      now: new Date("2026-03-19T20:12:00.000Z"),
      createError: (input: PairflowCommandErrorInput) => new Error(toErrorMessage(input)),
      resolveMetaReviewRolloutBlockingReasonCodes: () => []
    });

    expect("findings" in input).toBe(false);
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
  });

  it("omits optional dependency overrides when explicitly undefined", () => {
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
      applyMetaReviewGateOnConvergence: undefined,
      emitTmuxDeliveryNotification: undefined,
      emitBubbleNotification: undefined
    });

    expect("applyMetaReviewGateOnConvergence" in dependencies).toBe(false);
    expect("emitTmuxDeliveryNotification" in dependencies).toBe(false);
    expect("emitBubbleNotification" in dependencies).toBe(false);
  });

  it("builds default dependencies and forwards optional notifier overrides", () => {
    const dependencies = buildDefaultConvergedFlowDependencies({
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
  });

  it("builds default execution and gate-delivery dependencies", () => {
    const executionDependencies = buildDefaultConvergedExecutionDependencies();
    const gateDeliveryDependencies = buildDefaultConvergedGateDeliveryDependencies();

    expect(executionDependencies.appendProtocolEnvelope).toBeTypeOf("function");
    expect(executionDependencies.emitTmuxDeliveryNotification).toBeTypeOf("function");
    expect(executionDependencies.emitBubbleNotification).toBeTypeOf("function");
    expect(executionDependencies.resolveDeliveryMessageRef).toBeTypeOf("function");
    expect(executionDependencies.applyMetaReviewGateOnConvergence).toBeTypeOf("function");
    expect(gateDeliveryDependencies.emitTmuxDeliveryNotification).toBeTypeOf("function");
    expect(gateDeliveryDependencies.resolveDeliveryMessageRef).toBeTypeOf("function");
  });

  it("builds command flow invocation and forwards only defined optionals", () => {
    const now = new Date("2026-03-19T20:15:00.000Z");
    const createError = (input: PairflowCommandErrorInput) => new Error(toErrorMessage(input));
    const resolveMetaReviewRolloutBlockingReasonCodes = () => ["CODE_A"];
    const invocation = buildConvergedCommandFlowInvocation({
      summary: "ready for converged",
      refs: ["artifacts/review.md"],
      findings: [
        {
          severity: "P3",
          title: "Minor note",
          refs: ["artifact://review/minor.md"]
        }
      ],
      now,
      expectedRound: 5,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes,
      dependencies: {
        emitBubbleNotification: async () =>
          ({
            kind: "waiting-human",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          }) as never
      }
    });

    expect(invocation.flowInput).toEqual({
      summary: "ready for converged",
      refs: ["artifacts/review.md"],
      findings: [
        {
          severity: "P3",
          title: "Minor note",
          refs: ["artifact://review/minor.md"]
        }
      ],
      now,
      expectedRound: 5,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes
    });
    expect("cwd" in invocation.flowInput).toBe(false);
    expect("expectedStateFingerprint" in invocation.flowInput).toBe(false);
    expect("expectedReviewer" in invocation.flowInput).toBe(false);
    expect(invocation.flowDependencies.emitBubbleNotification).toBeTypeOf("function");
    expect("emitTmuxDeliveryNotification" in invocation.flowDependencies).toBe(false);
    expect("applyMetaReviewGateOnConvergence" in invocation.flowDependencies).toBe(false);
  });

  it("omits optional dependency overrides in command flow invocation when explicitly undefined", () => {
    const invocation = buildConvergedCommandFlowInvocation({
      summary: "ready for converged",
      refs: [],
      now: new Date("2026-03-19T20:20:00.000Z"),
      createError: (input: PairflowCommandErrorInput) => new Error(toErrorMessage(input)),
      resolveMetaReviewRolloutBlockingReasonCodes: () => [],
      dependencies: {
        applyMetaReviewGateOnConvergence: undefined,
        emitTmuxDeliveryNotification: undefined,
        emitBubbleNotification: undefined
      }
    });

    expect("applyMetaReviewGateOnConvergence" in invocation.flowDependencies).toBe(false);
    expect("emitTmuxDeliveryNotification" in invocation.flowDependencies).toBe(false);
    expect("emitBubbleNotification" in invocation.flowDependencies).toBe(false);
  });

  it("omits findings from command flow invocation when findings is an explicit empty array", () => {
    const invocation = buildConvergedCommandFlowInvocation({
      summary: "ready for converged",
      refs: [],
      findings: [],
      now: new Date("2026-03-19T20:21:00.000Z"),
      createError: (input: PairflowCommandErrorInput) => new Error(toErrorMessage(input)),
      resolveMetaReviewRolloutBlockingReasonCodes: () => []
    });

    expect("findings" in invocation.flowInput).toBe(false);
  });
});
