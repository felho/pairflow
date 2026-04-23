import { describe, expect, it } from "vitest";

import {
  prepareConvergedPolicy,
  type PrepareConvergedPolicyDependencyError
} from "../../../../src/v11/application/converged/convergedPolicyPreparation.js";

describe("prepareConvergedPolicy", () => {
  it("reads transcript with tolerant options and forwards policy input", async () => {
    const callOrder: string[] = [];
    const sampleTranscript = [{ id: "env_1" }] as never;

    const result = await prepareConvergedPolicy(
      {
        transcriptPath: "/tmp/transcript.ndjson",
        currentRound: 3,
        reviewer: "claude",
        implementer: "codex",
        reviewArtifactType: "document",
        roundRoleHistory: [] as never,
        severityGateRound: 2,
        effectiveLoopMode: "meta_only"
      },
      {
        readTranscriptEnvelopes: async (path, options) => {
          callOrder.push("readTranscriptEnvelopes");
          expect(path).toBe("/tmp/transcript.ndjson");
          expect(options).toEqual({
            allowMissing: true,
            toleratePartialFinalLine: true
          });
          return sampleTranscript;
        },
        validateConvergencePolicy: (input) => {
          callOrder.push("validateConvergencePolicy");
          expect(input.currentRound).toBe(3);
          expect(input.reviewer).toBe("claude");
          expect(input.implementer).toBe("codex");
          expect(input.reviewArtifactType).toBe("document");
          expect(input.severity_gate_round).toBe(2);
          expect(input.effectiveLoopMode).toBe("meta_only");
          expect(input.transcript).toBe(sampleTranscript);
          return {
            ok: true,
            errors: [],
            diagnostics: ["diag_a", "   ", "diag_b"]
          };
        }
      }
    );

    expect(callOrder).toEqual([
      "readTranscriptEnvelopes",
      "validateConvergencePolicy"
    ]);
    expect(result.policy.ok).toBe(true);
    expect(result.convergencePolicyDiagnostics).toEqual(["diag_a", "diag_b"]);
  });

  it("returns policy errors unchanged for caller-side error mapping", async () => {
    const result = await prepareConvergedPolicy(
      {
        transcriptPath: "/tmp/transcript.ndjson",
        currentRound: 1,
        reviewer: "claude",
        implementer: "codex",
        reviewArtifactType: "code",
        roundRoleHistory: [] as never,
        severityGateRound: 2,
        effectiveLoopMode: "full"
      },
      {
        readTranscriptEnvelopes: async () => [],
        validateConvergencePolicy: () => ({
          ok: false,
          errors: ["POLICY_ERROR_A"],
          diagnostics: ["POLICY_DIAG_A"]
        })
      }
    );

    expect(result.policy).toEqual({
      ok: false,
      errors: ["POLICY_ERROR_A"],
      diagnostics: ["POLICY_DIAG_A"]
    });
    expect(result.convergencePolicyDiagnostics).toEqual(["POLICY_DIAG_A"]);
  });

  it("attaches context when transcript dependency is missing", async () => {
    await expect(
      prepareConvergedPolicy({
        transcriptPath: "/tmp/missing-transcript.ndjson",
        currentRound: 1,
        reviewer: "claude",
        implementer: "codex",
        reviewArtifactType: "document",
        roundRoleHistory: [] as never,
        severityGateRound: 1,
        effectiveLoopMode: "full"
      })
    ).rejects.toMatchObject({
      name: "PrepareConvergedPolicyDependencyError",
      context: {
        source: "prepare_converged_policy",
        missingDependency: "readTranscriptEnvelopes",
        transcriptPath: "/tmp/missing-transcript.ndjson"
      }
    } satisfies Partial<PrepareConvergedPolicyDependencyError>);
  });
});
