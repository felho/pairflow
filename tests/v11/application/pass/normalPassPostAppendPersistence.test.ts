import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { persistNormalPassPostAppend } from "../../../../src/v11/application/pass/internal/normalPass/normalPassPostAppendPersistence.js";

describe("persistNormalPassPostAppend", () => {
  it("writes verification/state and updates doc-gate artifact with normalized findings input", async () => {
    const callOrder: string[] = [];
    let updaterFindings: unknown;

    const result = await persistNormalPassPostAppend(
      {
        reviewerVerification: undefined,
        bubbleId: "b_123",
        handoff: {
          nextRound: 3,
          senderAgent: "claude",
          envelopeRound: 2,
          recipientAgent: "codex",
          recipientRole: "implementer"
        },
        generatedAt: "2026-03-19T12:00:00.000Z",
        reviewVerificationArtifactPath: "/tmp/review-verification.json",
        mappedEnvelopeId: "env_mapped",
        statePath: "/tmp/state.json",
        state: { state: "RUNNING" } as never,
        expectedFingerprint: "fp_1",
        appendEnvelopeId: "env_append",
        docGateScopeActive: true,
        now: new Date("2026-03-19T12:00:00.000Z"),
        bubbleConfig: { review_artifact_type: "document" } as never,
        artifactsDir: "/tmp/artifacts",
        taskArtifactPath: "/tmp/task.md",
        hasFindings: false,
        findings: [{ title: "p1", priority: "P1" }],
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        writePostAppendReviewVerificationArtifact: async () => {
          callOrder.push("write-verification");
        },
        writePostAppendPassState: async () => {
          callOrder.push("write-state");
          return {
            state: { state: "RUNNING" },
            fingerprint: "fp_2"
          } as never;
        },
        updateReviewerDocGateArtifact: async (input) => {
          callOrder.push("update-doc-gate");
          updaterFindings = input.findings;
          return "doc_gate_write_failed";
        }
      }
    );

    expect(callOrder).toEqual([
      "write-verification",
      "write-state",
      "update-doc-gate"
    ]);
    expect(updaterFindings).toEqual([]);
    expect(result.docGateArtifactWriteFailureReason).toBe("doc_gate_write_failed");
  });

  it("skips doc-gate update when scope is inactive", async () => {
    let docGateCalled = false;

    const result = await persistNormalPassPostAppend(
      {
        reviewerVerification: undefined,
        bubbleId: "b_123",
        handoff: {
          nextRound: 3,
          senderAgent: "claude",
          envelopeRound: 2,
          recipientAgent: "codex",
          recipientRole: "implementer"
        },
        generatedAt: "2026-03-19T12:00:00.000Z",
        reviewVerificationArtifactPath: "/tmp/review-verification.json",
        mappedEnvelopeId: "env_mapped",
        statePath: "/tmp/state.json",
        state: { state: "RUNNING" } as never,
        expectedFingerprint: "fp_1",
        appendEnvelopeId: "env_append",
        docGateScopeActive: false,
        now: new Date("2026-03-19T12:00:00.000Z"),
        bubbleConfig: { review_artifact_type: "code" } as never,
        artifactsDir: "/tmp/artifacts",
        taskArtifactPath: "/tmp/task.md",
        hasFindings: true,
        findings: [{ title: "p1", priority: "P1" }],
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        writePostAppendReviewVerificationArtifact: async () => undefined,
        writePostAppendPassState: async () => ({
          state: { state: "RUNNING" },
          fingerprint: "fp_2"
        } as never),
        updateReviewerDocGateArtifact: async () => {
          docGateCalled = true;
          return "unexpected";
        }
      }
    );

    expect(docGateCalled).toBe(false);
    expect(result.docGateArtifactWriteFailureReason).toBeUndefined();
  });
});
