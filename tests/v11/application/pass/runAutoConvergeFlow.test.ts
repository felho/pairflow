import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { runAutoConvergeFlow } from "../../../../src/v11/application/pass/runAutoConvergeFlow.js";

describe("runAutoConvergeFlow", () => {
  it("orchestrates prepare -> converged execution -> finalization in order", async () => {
    const callOrder: string[] = [];
    let capturedExpectedFingerprint: string | undefined;
    let capturedFinalConverged: unknown;

    const result = await runAutoConvergeFlow(
      {
        summary: "auto-converge",
        refs: [".pairflow/evidence/test.log"],
        now: new Date("2026-03-19T12:00:00.000Z"),
        nowIso: "2026-03-19T12:00:00.000Z",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        repoPath: "/tmp/repo",
        bubbleConfig: {
          review_artifact_type: "document"
        } as never,
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        taskArtifactPath: "/tmp/task.md",
        statePath: "/tmp/state.json",
        reviewVerificationArtifactPath: "/tmp/review-verification.json",
        handoff: {
          senderRole: "reviewer",
          senderAgent: "claude",
          envelopeRound: 2
        },
        reviewer: "claude",
        implementer: "codex",
        roundRoleHistory: [],
        transcript: [],
        severityGateRound: 2,
        expectedStateFingerprint: "fp_initial",
        reviewerVerification: undefined,
        passIntent: "review",
        inferredIntent: true,
        hasFindings: false,
        noFindings: true,
        findings: [],
        repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
        repeatCleanReasonDetail: "previous_reviewer_pass_clean",
        repeatCleanTrigger: true,
        mostRecentPreviousReviewerCleanPassEnvelope: true,
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        onDownstreamRejected: (reason) => {
          throw new Error(`unexpected:${reason}`);
        }
      },
      {
        prepareRepeatCleanAutoConverge: async () => {
          callOrder.push("prepare");
          return {
            expectedStateFingerprint: "fp_refreshed"
          };
        },
        executeAutoConvergeConverged: async (input) => {
          callOrder.push("execute");
          capturedExpectedFingerprint = input.expectedStateFingerprint;
          return {
            convergenceSequence: 9,
            convergenceEnvelope: { id: "conv" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" },
            gateRoute: "human_gate_approve",
            approvalRequestSequence: 10,
            approvalRequestEnvelope: { id: "approval" }
          } as never;
        },
        finalizeAutoConvergePass: async (input) => {
          callOrder.push("finalize");
          capturedFinalConverged = input.converged;
          return { ok: true };
        }
      }
    );

    expect(callOrder).toEqual(["prepare", "execute", "finalize"]);
    expect(capturedExpectedFingerprint).toBe("fp_refreshed");
    expect(capturedFinalConverged).toEqual(
      expect.objectContaining({
        convergenceSequence: 9
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("propagates downstream rejection path from converged execution", async () => {
    let finalizeCalled = false;

    await expect(() =>
      runAutoConvergeFlow(
        {
          summary: "auto-converge",
          refs: [],
          now: new Date("2026-03-19T12:00:00.000Z"),
          nowIso: "2026-03-19T12:00:00.000Z",
          bubbleId: "b_123",
          bubbleInstanceId: "inst_1",
          repoPath: "/tmp/repo",
          bubbleConfig: {
            review_artifact_type: "code"
          } as never,
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          taskArtifactPath: "/tmp/task.md",
          statePath: "/tmp/state.json",
          reviewVerificationArtifactPath: "/tmp/review-verification.json",
          handoff: {
            senderRole: "reviewer",
            senderAgent: "claude",
            envelopeRound: 2
          },
          reviewer: "claude",
          implementer: "codex",
          roundRoleHistory: [],
          transcript: [],
          severityGateRound: 2,
          expectedStateFingerprint: "fp_initial",
          reviewerVerification: undefined,
          passIntent: "review",
          inferredIntent: true,
          hasFindings: false,
          noFindings: true,
          findings: [],
          repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
          repeatCleanReasonDetail: "previous_reviewer_pass_clean",
          repeatCleanTrigger: true,
          mostRecentPreviousReviewerCleanPassEnvelope: true,
          createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
          onDownstreamRejected: (reason) => {
            throw new Error(`wrapped:${reason}`);
          }
        },
        {
          prepareRepeatCleanAutoConverge: async () => ({
            expectedStateFingerprint: "fp_refreshed"
          }),
          executeAutoConvergeConverged: async (input) => {
            return input.onDownstreamRejected("downstream failed");
          },
          finalizeAutoConvergePass: async () => {
            finalizeCalled = true;
            return { ok: true };
          }
        }
      )
    ).rejects.toThrow("wrapped:downstream failed");

    expect(finalizeCalled).toBe(false);
  });
});
