import { describe, expect, it } from "vitest";
import type {
  ExecuteAutoConvergeConvergedDependencies
} from "../../../../src/v11/application/pass/autoConvergeConvergedExecution.js";
import type {
  FinalizeAutoConvergePassDependencies
} from "../../../../src/v11/application/pass/autoConvergeFinalization.js";

import {
  buildAutoConvergeFlowDependencies,
  buildAutoConvergeFlowInput
} from "../../../../src/v11/application/pass/autoConvergeFlowInvocationBuilders.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("autoConvergeFlowInvocationBuilders", () => {
  it("buildAutoConvergeFlowInput maps routing metadata and optional findings claim fields", () => {
    const created = buildAutoConvergeFlowInput({
      summary: "auto",
      refs: ["ref-a"],
      now: new Date("2026-03-19T12:00:00.000Z"),
      nowIso: "2026-03-19T12:00:00.000Z",
      findings: [],
      hasFindings: false,
      noFindings: true,
      resolved: {
        bubbleId: "b_1",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/remote-repo",
        bubbleConfig: {
          severity_gate_round: 2
        } as never,
        bubblePaths: {
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          taskArtifactPath: "/tmp/task.md",
          statePath: "/tmp/state.json",
          reviewVerificationArtifactPath: "/tmp/review-verification.json"
        } as never
      },
      bubbleIdentity: {
        bubbleInstanceId: "bi_1"
      },
      handoff: {
        senderRole: "reviewer",
        senderAgent: "claude",
        envelopeRound: 3
      } as never,
      reviewer: "claude",
      implementer: "codex",
      state: {
        round_role_history: []
      } as never,
      loadedState: {
        fingerprint: "fp_1"
      },
      passRouting: {
        intent: "review",
        inferredIntent: true,
        reviewerVerification: undefined,
        transcript: [],
        repeatCleanTrigger: {
          trigger: true,
          reasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
          reasonDetail: "previous_reviewer_pass_clean",
          mostRecentPreviousReviewerCleanPassEnvelope: true
        },
        reviewerFindingsClaim: {
          state: "clean",
          source: "payload_flags"
        },
        reviewerFindingsClaimParserMetadata: {
          parserState: "clean",
          parserDivergence: false
        }
      },
      createError: (input) => new Error(toErrorMessage(input)),
      onDownstreamRejected: (reason) => {
        throw new Error(reason);
      }
    });

    expect(created.bubbleId).toBe("b_1");
    expect(created.passIntent).toBe("review");
    expect(created.expectedStateFingerprint).toBe("fp_1");
    expect(created.worktreePath).toBe("/tmp/remote-repo");
    expect(created.repeatCleanTrigger).toBe(true);
    expect(created.reviewerFindingsClaim).toEqual({
      state: "clean",
      source: "payload_flags"
    });
  });

  it("buildAutoConvergeFlowDependencies wraps converged/finalize dependencies with optional notifiers", async () => {
    let executeDependencies:
      ExecuteAutoConvergeConvergedDependencies
      | undefined;
    let finalizeDependencies:
      FinalizeAutoConvergePassDependencies<{ ok: true }>
      | undefined;

    const built = buildAutoConvergeFlowDependencies<{ ok: true }>({
      prepareRepeatCleanAutoConverge: async () => ({
        expectedStateFingerprint: "fp_next"
      }),
      executeAutoConvergeConverged: async (_input, dependencies) => {
        executeDependencies = dependencies;
        return {
          convergenceSequence: 10,
          convergenceEnvelope: { id: "conv" },
          state: { state: "READY_FOR_HUMAN_APPROVAL" },
          gateRoute: "human_gate_approve",
          approvalRequestSequence: 11,
          approvalRequestEnvelope: { id: "approval" }
        } as never;
      },
      emitConvergedFromWorkspace: async () => ({}) as never,
      emitTmuxDeliveryNotification: async () => ({ delivered: true }) as never,
      emitBubbleNotification: async () => ({ shown: true } as never),
      finalizeAutoConvergePass: async (_input, dependencies) => {
        finalizeDependencies = dependencies;
        return { ok: true };
      },
      updateReviewerDocGateArtifact: async () => undefined,
      emitBubbleLifecycleEventBestEffort: async () => undefined,
      buildPassLifecycleMetricMetadata: () => ({}),
      buildAutoConvergePassResult: () => ({ ok: true })
    });

    await built.executeAutoConvergeConverged({} as never);
    await built.finalizeAutoConvergePass({} as never);

    expect(executeDependencies).toBeDefined();
    expect(typeof executeDependencies?.emitConvergedFromWorkspace).toBe("function");
    expect(typeof executeDependencies?.emitTmuxDeliveryNotification).toBe("function");
    expect(typeof executeDependencies?.emitBubbleNotification).toBe("function");
    expect(finalizeDependencies).toBeDefined();
    expect(typeof finalizeDependencies?.updateReviewerDocGateArtifact).toBe("function");
    expect(typeof finalizeDependencies?.emitBubbleLifecycleEventBestEffort).toBe("function");
    expect(typeof finalizeDependencies?.buildPassLifecycleMetricMetadata).toBe("function");
    expect(typeof finalizeDependencies?.buildAutoConvergePassResult).toBe("function");
  });
});
