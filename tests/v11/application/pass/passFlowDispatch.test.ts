import { describe, expect, it } from "vitest";

import {
  dispatchPassFlow,
  type DispatchPassFlowInput,
  type PassFlowDispatchDependencies
} from "../../../../src/v11/shared/pass/passFlowDispatch.js";
import type { PassFlowRuntimeDependencies } from "../../../../src/v11/shared/pass/passFlowDependencyWiring.js";

function createDispatchInput(trigger: boolean): DispatchPassFlowInput {
  return {
    summary: "pass summary",
    refs: ["artifact://summary.md"],
    now: new Date("2026-03-19T22:40:00.000Z"),
    nowIso: "2026-03-19T22:40:00.000Z",
    findings: [],
    hasFindings: false,
    noFindings: true,
    resolved: {
      bubbleId: "b_dispatch_01",
      repoPath: "/repo",
      bubbleConfig: {
        id: "b_dispatch_01",
        review_artifact_type: "code",
        severity_gate_round: 4
      },
      bubblePaths: {
        worktreePath: "/repo/.pairflow/worktrees/b_dispatch_01",
        artifactsDir: "/repo/.pairflow/bubbles/b_dispatch_01/artifacts",
        taskArtifactPath: "/repo/.pairflow/bubbles/b_dispatch_01/task.md",
        statePath: "/repo/.pairflow/bubbles/b_dispatch_01/state.json",
        reviewVerificationArtifactPath:
          "/repo/.pairflow/bubbles/b_dispatch_01/artifacts/review-verification.json"
      }
    } as never,
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
      round: 2,
      round_role_history: []
    } as never,
    loadedState: {
      fingerprint: "fp_dispatch_01"
    },
    passRouting: {
      intent: "review",
      inferredIntent: false,
      reviewerVerification: undefined,
      transcript: [],
      repeatCleanTrigger: {
        reasonCode: trigger
          ? "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED"
          : "REPEAT_CLEAN_TRIGGER_NOT_MET",
        reasonDetail: trigger
          ? "previous_reviewer_pass_clean"
          : "base_precondition_not_met",
        trigger,
        mostRecentPreviousReviewerCleanPassEnvelope: trigger
      }
    },
    createError: (message: string) => new Error(message),
    onDownstreamRejected: (reason: string) => {
      throw new Error(`rejected:${reason}`);
    }
  } as unknown as DispatchPassFlowInput;
}

describe("passFlowDispatch", () => {
  it("routes to auto-converge flow when repeat-clean trigger is true", async () => {
    const input = createDispatchInput(true);
    const runtimeDependencies = {} as PassFlowRuntimeDependencies;

    let autoRunCalls = 0;
    let normalRunCalls = 0;
    let autoBuilderCalls = 0;
    let normalBuilderCalls = 0;
    let autoRuntimeDeps: PassFlowRuntimeDependencies | undefined;

    const dependencies: PassFlowDispatchDependencies = {
      runAutoConvergeFlow: async (flowInput) => {
        autoRunCalls += 1;
        expect((flowInput as unknown as { kind: string }).kind).toBe("auto-input");
        return { transitionDecision: "auto_converge" } as never;
      },
      runNormalPassFlow: async () => {
        normalRunCalls += 1;
        return { transitionDecision: "normal_pass" } as never;
      },
      buildAutoConvergeFlowInput: () => {
        autoBuilderCalls += 1;
        return { kind: "auto-input" } as never;
      },
      buildNormalPassFlowInput: () => {
        normalBuilderCalls += 1;
        return { kind: "normal-input" } as never;
      },
      createAutoConvergeFlowDependencies: (runtimeDeps) => {
        autoRuntimeDeps = runtimeDeps;
        return { kind: "auto-deps" } as never;
      },
      createNormalPassFlowDependencies: () => ({ kind: "normal-deps" }) as never
    };

    const result = await dispatchPassFlow(input, runtimeDependencies, dependencies);

    expect((result as { transitionDecision: string }).transitionDecision).toBe(
      "auto_converge"
    );
    expect(autoRunCalls).toBe(1);
    expect(normalRunCalls).toBe(0);
    expect(autoBuilderCalls).toBe(1);
    expect(normalBuilderCalls).toBe(0);
    expect(autoRuntimeDeps).toBe(runtimeDependencies);
  });

  it("routes to normal pass flow when repeat-clean trigger is false", async () => {
    const input = createDispatchInput(false);
    const runtimeDependencies = {} as PassFlowRuntimeDependencies;

    let autoRunCalls = 0;
    let normalRunCalls = 0;
    let autoBuilderCalls = 0;
    let normalBuilderCalls = 0;
    let normalRuntimeDeps: PassFlowRuntimeDependencies | undefined;

    const dependencies: PassFlowDispatchDependencies = {
      runAutoConvergeFlow: async () => {
        autoRunCalls += 1;
        return { transitionDecision: "auto_converge" } as never;
      },
      runNormalPassFlow: async (flowInput) => {
        normalRunCalls += 1;
        expect((flowInput as unknown as { kind: string }).kind).toBe("normal-input");
        return { transitionDecision: "normal_pass" } as never;
      },
      buildAutoConvergeFlowInput: () => {
        autoBuilderCalls += 1;
        return { kind: "auto-input" } as never;
      },
      buildNormalPassFlowInput: () => {
        normalBuilderCalls += 1;
        return { kind: "normal-input" } as never;
      },
      createAutoConvergeFlowDependencies: () => ({ kind: "auto-deps" }) as never,
      createNormalPassFlowDependencies: (runtimeDeps) => {
        normalRuntimeDeps = runtimeDeps;
        return { kind: "normal-deps" } as never;
      }
    };

    const result = await dispatchPassFlow(input, runtimeDependencies, dependencies);

    expect((result as { transitionDecision: string }).transitionDecision).toBe(
      "normal_pass"
    );
    expect(autoRunCalls).toBe(0);
    expect(normalRunCalls).toBe(1);
    expect(autoBuilderCalls).toBe(0);
    expect(normalBuilderCalls).toBe(1);
    expect(normalRuntimeDeps).toBe(runtimeDependencies);
  });
});
