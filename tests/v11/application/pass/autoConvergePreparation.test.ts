import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import type { ReviewVerificationInputResolution } from "../../../../src/core/reviewer/reviewVerification.js";
import { prepareRepeatCleanAutoConverge } from "../../../../src/v11/application/pass/autoConvergePreparation.js";

class TestAutoConvergePreparationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestAutoConvergePreparationError";
  }
}

function createError(message: PairflowCommandErrorInput): Error {
  return new TestAutoConvergePreparationError(toErrorMessage(message));
}

function buildInput(
  overrides: Partial<Parameters<typeof prepareRepeatCleanAutoConverge>[0]> = {}
): Parameters<typeof prepareRepeatCleanAutoConverge>[0] {
  return {
    round: 2,
    reviewer: "claude",
    implementer: "codex",
    reviewArtifactType: "code",
    roundRoleHistory: [],
    transcript: [],
    severityGateRound: 4,
    statePath: "/tmp/state.json",
    expectedStateFingerprint: "fp_expected",
    reviewerVerification: undefined,
    reviewVerificationArtifactPath: "/tmp/review-verification.json",
    bubbleId: "b_123",
    reviewerAgent: "claude",
    generatedAt: "2026-03-19T12:00:00.000Z",
    createError,
    ...overrides
  };
}

function buildReviewerVerification(): ReviewVerificationInputResolution {
  return {
    inputRef: "review-verification-input.json",
    resolvedPath: "/tmp/review-verification-input.json",
    payload: {
      schema: "review_verification_v1",
      overall: "pass",
      claims: [
        {
          claim_id: "C1",
          status: "verified",
          evidence_refs: ["src/a.ts:10"]
        }
      ]
    }
  };
}

describe("prepareRepeatCleanAutoConverge", () => {
  it("returns refreshed expected fingerprint when policy passes and state is unchanged", async () => {
    const result = await prepareRepeatCleanAutoConverge(
      buildInput(),
      {
        validateConvergencePolicy: () => ({
          ok: true,
          errors: [],
          diagnostics: []
        }),
        readStateSnapshot: async () => ({
          state: {
            bubble_id: "b_123",
            state: "RUNNING",
            round: 2,
            active_agent: "claude",
            active_since: "2026-03-19T12:00:00.000Z",
            active_role: "reviewer",
            round_role_history: [],
            last_command_at: "2026-03-19T12:00:00.000Z"
          },
          fingerprint: "fp_expected"
        })
      }
    );

    expect(result).toEqual({
      expectedStateFingerprint: "fp_expected"
    });
  });

  it("fails closed when convergence policy rejects", async () => {
    await expect(
      prepareRepeatCleanAutoConverge(
        buildInput(),
        {
          validateConvergencePolicy: () => ({
            ok: false,
            errors: ["round/history mismatch"],
            diagnostics: ["diag-1"]
          })
        }
      )
    ).rejects.toThrowError(
      new TestAutoConvergePreparationError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=policy_gate_rejected; round/history mismatch diagnostics=diag-1"
      )
    );
  });

  it("fails closed when state fingerprint changed before convergence", async () => {
    await expect(
      prepareRepeatCleanAutoConverge(
        buildInput(),
        {
          validateConvergencePolicy: () => ({
            ok: true,
            errors: [],
            diagnostics: []
          }),
          readStateSnapshot: async () => ({
            state: {
              bubble_id: "b_123",
              state: "RUNNING",
              round: 2,
              active_agent: "claude",
              active_since: "2026-03-19T12:00:00.000Z",
              active_role: "reviewer",
              round_role_history: [],
              last_command_at: "2026-03-19T12:00:00.000Z"
            },
            fingerprint: "fp_changed"
          })
        }
      )
    ).rejects.toThrowError(
      new TestAutoConvergePreparationError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=policy_gate_rejected; AUTO_CONVERGE_STATE_STALE: state changed between repeat-clean evaluation and convergence transition."
      )
    );
  });

  it("fails closed when pre-converge verification artifact write fails", async () => {
    await expect(
      prepareRepeatCleanAutoConverge(
        buildInput({
          reviewerVerification: buildReviewerVerification()
        }),
        {
          validateConvergencePolicy: () => ({
            ok: true,
            errors: [],
            diagnostics: []
          }),
          readStateSnapshot: async () => ({
            state: {
              bubble_id: "b_123",
              state: "RUNNING",
              round: 2,
              active_agent: "claude",
              active_since: "2026-03-19T12:00:00.000Z",
              active_role: "reviewer",
              round_role_history: [],
              last_command_at: "2026-03-19T12:00:00.000Z"
            },
            fingerprint: "fp_expected"
          }),
          writeReviewVerificationArtifactAtomic: async () => {
            throw new Error("EACCES");
          }
        }
      )
    ).rejects.toThrowError(
      new TestAutoConvergePreparationError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=review_verification_write_failed; review-verification artifact write failed before convergence transition. Root error: EACCES"
      )
    );
  });
});
