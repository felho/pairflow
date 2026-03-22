import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { runNormalPassFlow } from "../../../../src/v11/application/pass/runNormalPassFlow.js";

describe("runNormalPassFlow", () => {
  it("orchestrates reviewer normal-pass flow and forwards normalized findings to finalization", async () => {
    const callOrder: string[] = [];
    let finalizeFindings: unknown;

    const result = await runNormalPassFlow(
      {
        now: new Date("2026-03-19T12:00:00.000Z"),
        nowIso: "2026-03-19T12:00:00.000Z",
        summary: "handoff",
        intent: "fix_request",
        refs: [".pairflow/evidence/test.log"],
        hasFindings: true,
        noFindings: false,
        findings: [{ title: "raw", priority: "P1" }],
        inferredIntent: true,
        reviewerVerification: undefined,
        state: { state: "RUNNING" } as never,
        expectedStateFingerprint: "fp_1",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        repoPath: "/tmp/repo",
        bubbleConfig: {
          review_artifact_type: "document",
          doc_contract_gates: {
            round_gate_applies_after: 1
          }
        } as never,
        paths: {
          transcriptPath: "/tmp/transcript.ndjson",
          reviewVerificationArtifactPath: "/tmp/review-verification.json",
          statePath: "/tmp/state.json",
          artifactsDir: "/tmp/artifacts",
          taskArtifactPath: "/tmp/task.md",
          worktreePath: "/tmp/worktree",
          sessionsPath: "/tmp/sessions.json",
          reviewerBriefArtifactPath: "/tmp/reviewer-brief.md",
          reviewerFocusArtifactPath: "/tmp/reviewer-focus.json",
          locksDir: "/tmp/locks"
        },
        handoff: {
          senderRole: "reviewer",
          senderAgent: "claude",
          recipientAgent: "codex",
          recipientRole: "implementer",
          envelopeRound: 2,
          nextRound: 3
        },
        repeatClean: {
          reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
          reasonDetail: "base_precondition_not_met",
          trigger: false,
          mostRecentPreviousReviewerCleanPassEnvelope: false
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        prepareNormalPassAppend: () => {
          callOrder.push("prepare-append");
          return {
            docGateScopeActive: true,
            findingsForPayload: [{ title: "normalized", priority: "P2" }],
            lockPath: "/tmp/locks/b_123.lock"
          };
        },
        executeNormalPassAppend: async () => {
          callOrder.push("execute-append");
          return {
            sequence: 11,
            envelope: { id: "env_1" } as never
          };
        },
        persistNormalPassPostAppend: async () => {
          callOrder.push("persist-post-append");
          return {
            written: { state: { state: "RUNNING" } } as never,
            docGateArtifactWriteFailureReason: "doc_gate_write_failed"
          };
        },
        executeNormalPassDelivery: async () => {
          callOrder.push("execute-delivery");
          return {
            deliveryResult: undefined,
            deliveryRetried: false
          };
        },
        finalizeNormalPass: async (input) => {
          callOrder.push("finalize");
          finalizeFindings = input.findings;
          return {
            ok: true
          };
        }
      }
    );

    expect(callOrder).toEqual([
      "prepare-append",
      "execute-append",
      "persist-post-append",
      "execute-delivery",
      "finalize"
    ]);
    expect(finalizeFindings).toEqual([{ title: "normalized", priority: "P2" }]);
    expect(result).toEqual({ ok: true });
  });

  it("uses original findings for implementer sender during finalization", async () => {
    let finalizeFindings: unknown;

    await runNormalPassFlow(
      {
        now: new Date("2026-03-19T12:00:00.000Z"),
        nowIso: "2026-03-19T12:00:00.000Z",
        summary: "handoff",
        intent: "review",
        refs: [],
        hasFindings: true,
        noFindings: false,
        findings: [{ title: "implementer-findings", priority: "P1" }],
        inferredIntent: true,
        reviewerVerification: undefined,
        state: { state: "RUNNING" } as never,
        expectedStateFingerprint: "fp_1",
        bubbleId: "b_123",
        bubbleInstanceId: "inst_1",
        repoPath: "/tmp/repo",
        bubbleConfig: {
          review_artifact_type: "code",
          doc_contract_gates: {
            round_gate_applies_after: 1
          }
        } as never,
        paths: {
          transcriptPath: "/tmp/transcript.ndjson",
          reviewVerificationArtifactPath: "/tmp/review-verification.json",
          statePath: "/tmp/state.json",
          artifactsDir: "/tmp/artifacts",
          taskArtifactPath: "/tmp/task.md",
          worktreePath: "/tmp/worktree",
          sessionsPath: "/tmp/sessions.json",
          reviewerBriefArtifactPath: "/tmp/reviewer-brief.md",
          reviewerFocusArtifactPath: "/tmp/reviewer-focus.json",
          locksDir: "/tmp/locks"
        },
        handoff: {
          senderRole: "implementer",
          senderAgent: "codex",
          recipientAgent: "claude",
          recipientRole: "reviewer",
          envelopeRound: 2,
          nextRound: 2
        },
        repeatClean: {
          reasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
          reasonDetail: "base_precondition_not_met",
          trigger: false,
          mostRecentPreviousReviewerCleanPassEnvelope: false
        },
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        prepareNormalPassAppend: () => ({
          docGateScopeActive: false,
          findingsForPayload: [{ title: "normalized", priority: "P2" }],
          lockPath: "/tmp/locks/b_123.lock"
        }),
        executeNormalPassAppend: async () => ({
          sequence: 12,
          envelope: { id: "env_2" } as never
        }),
        persistNormalPassPostAppend: async () => ({
          written: { state: { state: "RUNNING" } } as never
        }),
        executeNormalPassDelivery: async () => ({
          deliveryResult: undefined,
          deliveryRetried: false
        }),
        finalizeNormalPass: async (input) => {
          finalizeFindings = input.findings;
          return { ok: true };
        }
      }
    );

    expect(finalizeFindings).toEqual([
      { title: "implementer-findings", priority: "P1" }
    ]);
  });
});
