import { describe, expect, it, vi } from "vitest";

import {
  prepareAcceptedMetaReviewSubmit
} from "../../../../src/v11/application/metaReview/internal/submit/preparation.js";
import {
  assertSubmitPayloadInvariants,
  assertSubmitStatusIsSuccess,
  resolveSubmitRunStatus
} from "../../../../src/v11/application/metaReview/internal/submit/validation.js";
import {
  assertMetaReviewSubmitterAuthority
} from "../../../../src/v11/application/metaReview/internal/submit/authority.js";
import { buildMetaReviewExecutionContext } from "../../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { metaReviewExecutionContextToRunningContext } from "../../../../src/v11/domain/state/execution/executionContext.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/bubbleStateSnapshotTypes.js";

function createMetaReviewRunningState(
  partial: Partial<BubbleStateSnapshot> = {}
): BubbleStateSnapshot {
  const nestedExecutionContext = buildMetaReviewExecutionContext({
    bubbleId: "b_meta_submit_validation_01",
    round: 2,
    startedAt: "2026-04-26T11:00:00.000Z",
    watchdogTimeoutMinutes: 30,
    attempt: 1
  });

  return {
    bubble_id: "b_meta_submit_validation_01",
    state: "RUNNING",
    round: 2,
    active_agent: "codex",
    active_since: "2026-04-26T11:00:00.000Z",
    active_role: "meta_reviewer",
    execution_context: metaReviewExecutionContextToRunningContext(
      nestedExecutionContext
    ),
    round_role_history: [],
    last_command_at: "2026-04-26T11:00:00.000Z",
    meta_review: {
      execution_context: nestedExecutionContext,
      auto_rework_count: 0,
      auto_rework_limit: 10,
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    },
    ...partial
  };
}

describe("metaReviewCommandSubmitValidation", () => {
  it("always resolves submit status to success for routed submit outcomes", () => {
    expect(resolveSubmitRunStatus()).toBe("success");
  });

  it("accepts inconclusive recommendation when submit payload invariants are satisfied", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "inconclusive",
        reworkTargetMessage: null
      })
    ).not.toThrow();
  });

  it("accepts rework recommendation when a non-empty rework target message is provided", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "rework",
        reworkTargetMessage: "Please address the reviewer concerns."
      })
    ).not.toThrow();
  });

  it("rejects rework recommendation without a non-empty rework target message", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "rework",
        reworkTargetMessage: null
      })
    ).toThrow(/rework target message/u);
  });

  it("rejects advisory rework target messages when they normalize to empty text", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "approve",
        reworkTargetMessage: "   "
      })
    ).toThrow(/advisory rework target message/u);
  });

  it("rejects non-success submit status even for inconclusive recommendation", () => {
    expect(() => assertSubmitStatusIsSuccess("inconclusive")).toThrow(
      /status=success/u
    );
  });

  it("rejects error status on submit as the same success-only contract", () => {
    expect(() => assertSubmitStatusIsSuccess("error")).toThrow(/status=success/u);
  });

  it("accepts submitter authority when the configured meta-reviewer matches live ownership", async () => {
    await expect(
      assertMetaReviewSubmitterAuthority({
        bubbleId: "b_meta_submit_validation_01",
        metaReviewerAgent: "claude",
        sessionsPath: "/tmp/runtime-sessions.json",
        readRuntimeSessions: async () => ({}),
        state: createMetaReviewRunningState({
          active_agent: "claude"
        })
      })
    ).resolves.toBeUndefined();
  });

  it("fails closed when live ownership diverges from the configured meta-reviewer", async () => {
    await expect(
      assertMetaReviewSubmitterAuthority({
        bubbleId: "b_meta_submit_validation_01",
        metaReviewerAgent: "claude",
        sessionsPath: "/tmp/runtime-sessions.json",
        readRuntimeSessions: async () => ({}),
        state: createMetaReviewRunningState({
          active_agent: "codex"
        })
      })
    ).rejects.toMatchObject({
      name: "MetaReviewError",
      reasonCode: "META_REVIEW_SENDER_MISMATCH"
    });
  });

  it("reads non-default meta-reviewer ownership from the prepared submit context path", async () => {
    const readRuntimeSessions = vi.fn(async () => ({}));
    const state = createMetaReviewRunningState({
      active_agent: "claude"
    });
    const prepared = await prepareAcceptedMetaReviewSubmit({
      submitInput: {
        bubbleId: "b_meta_submit_validation_01",
        round: 2,
        recommendation: "inconclusive",
        summary: "Meta-review remains inconclusive pending more evidence.",
        report_json: {
          findings_claim_state: "unknown",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0
        }
      },
      dependencies: {
        resolveBubbleById: async () =>
          ({
            bubbleId: "b_meta_submit_validation_01",
            repoPath: "/repo",
            bubblePaths: {
              statePath: "/tmp/b_meta_submit_validation_01/state.json",
              sessionsPath: "/tmp/b_meta_submit_validation_01/sessions.json",
              transcriptPath:
                "/tmp/b_meta_submit_validation_01/transcript.ndjson"
            },
            bubbleConfig: {
              id: "b_meta_submit_validation_01",
              agents: {
                implementer: "codex",
                reviewer: "claude",
                meta_reviewer: "claude"
              }
            }
          }) as never,
        readStateSnapshot: async () =>
          ({
            fingerprint: "fp_meta_submit_validation_prepare_01",
            state
          }) as never,
        readRuntimeSessionsRegistry: readRuntimeSessions,
        readFile: async () => "",
        randomUUID: () => "run_meta_submit_validation_prepare_01"
      },
      now: new Date("2026-04-26T11:05:00.000Z")
    });

    expect(readRuntimeSessions).toHaveBeenCalledWith(
      "/tmp/b_meta_submit_validation_01/sessions.json",
      { allowMissing: true }
    );
    expect(prepared.resolved.bubbleConfig.agents.meta_reviewer).toBe("claude");
    expect(prepared.executionContext.active_role).toBe("meta_reviewer");
    expect(prepared.runId).toBe("run_meta_submit_validation_prepare_01");
  });
});
