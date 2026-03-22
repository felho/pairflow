import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import type { EmitConvergedResult } from "../../../../src/core/agent/converged.js";
import { finalizeAutoConvergePass } from "../../../../src/v11/application/pass/autoConvergeFinalization.js";

function buildConvergedResult(): EmitConvergedResult {
  return {
    convergenceSequence: 10,
    convergenceEnvelope: { id: "conv" },
    state: { state: "READY_FOR_HUMAN_APPROVAL" },
    gateRoute: "human_gate_approve",
    approvalRequestSequence: 11,
    approvalRequestEnvelope: { id: "approval" }
  } as unknown as EmitConvergedResult;
}

describe("finalizeAutoConvergePass", () => {
  it("updates reviewer doc-gate artifact and forwards failure reason into metric and result", async () => {
    const callOrder: string[] = [];
    let capturedMetricInput: Record<string, unknown> | undefined;
    let capturedResultInput: Record<string, unknown> | undefined;

    const result = await finalizeAutoConvergePass(
      {
        now: new Date("2026-03-19T12:00:00.000Z"),
        bubbleConfig: {
          review_artifact_type: "document"
        } as never,
        artifactsDir: "/tmp/artifacts",
        taskArtifactPath: "/tmp/task.md",
        round: 2,
        senderRole: "reviewer",
        findings: [{ title: "p1", priority: "P1" }],
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        repoPath: "/tmp/repo",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        passIntent: "fix_request",
        inferredIntent: true,
        senderAgent: "claude",
        refsCount: 1,
        hasFindings: true,
        noFindings: false,
        repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
        repeatCleanReasonDetail: "previous_reviewer_pass_clean",
        repeatCleanTrigger: true,
        mostRecentPreviousReviewerCleanPassEnvelope: true,
        converged: buildConvergedResult()
      },
      {
        updateReviewerDocGateArtifact: async () => {
          callOrder.push("update-doc-gate");
          return "write_failed";
        },
        emitBubbleLifecycleEventBestEffort: async () => {
          callOrder.push("emit-lifecycle");
        },
        buildPassLifecycleMetricMetadata: (input) => {
          callOrder.push("build-metric");
          capturedMetricInput = input as unknown as Record<string, unknown>;
          return { metric: "ok" };
        },
        buildAutoConvergePassResult: (input) => {
          callOrder.push("build-result");
          capturedResultInput = input as unknown as Record<string, unknown>;
          return { status: "ok", ...input };
        }
      }
    );

    expect(callOrder).toEqual([
      "update-doc-gate",
      "build-metric",
      "emit-lifecycle",
      "build-result"
    ]);
    expect(capturedMetricInput?.docGateArtifactWriteFailureReason).toBe("write_failed");
    expect(capturedResultInput?.docGateArtifactWriteFailureReason).toBe("write_failed");
    expect((result as { status: string }).status).toBe("ok");
  });

  it("skips doc-gate update for implementer sender role", async () => {
    let updateCalled = false;
    let capturedResultInput: Record<string, unknown> | undefined;

    await finalizeAutoConvergePass(
      {
        now: new Date("2026-03-19T12:00:00.000Z"),
        bubbleConfig: {
          review_artifact_type: "code"
        } as never,
        artifactsDir: "/tmp/artifacts",
        taskArtifactPath: "/tmp/task.md",
        round: 2,
        senderRole: "implementer",
        findings: [],
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message)),
        repoPath: "/tmp/repo",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        passIntent: "review",
        inferredIntent: true,
        senderAgent: "codex",
        refsCount: 0,
        hasFindings: false,
        noFindings: false,
        repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
        repeatCleanReasonDetail: "previous_reviewer_pass_clean",
        repeatCleanTrigger: true,
        mostRecentPreviousReviewerCleanPassEnvelope: true,
        converged: buildConvergedResult()
      },
      {
        updateReviewerDocGateArtifact: async () => {
          updateCalled = true;
          return "unexpected";
        },
        emitBubbleLifecycleEventBestEffort: async () => undefined,
        buildPassLifecycleMetricMetadata: () => ({ metric: "ok" }),
        buildAutoConvergePassResult: (input) => {
          capturedResultInput = input as unknown as Record<string, unknown>;
          return input;
        }
      }
    );

    expect(updateCalled).toBe(false);
    expect(capturedResultInput?.docGateArtifactWriteFailureReason).toBeUndefined();
  });
});
