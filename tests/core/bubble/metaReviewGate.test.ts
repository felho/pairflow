import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyMetaReviewGateOnConvergence,
  MetaReviewGateError
} from "../../../src/core/bubble/metaReviewGate.js";
import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("applyMetaReviewGateOnConvergence", () => {
  it("auto-dispatches revise when recommendation is rework and budget is available", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_01",
      task: "Auto rework"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Reviewer converged with unresolved defects.",
        now: new Date("2026-03-08T11:00:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_01",
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "Needs rework before human review.",
            report_markdown: "# Report\n\nRework required.",
            rework_target_message: "Fix retry gate and add missing tests."
          })
        }
      }
    );

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(result.gateEnvelope.payload.decision).toBe("revise");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer"
    });
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.round).toBe(2);
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.meta_review?.auto_rework_count).toBe(1);

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("APPROVAL_DECISION");
    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.at(-1)?.type).toBe("APPROVAL_DECISION");
  });

  it("allows auto-rework at exact budget boundary count=limit-1 and increments to limit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_01b",
      task: "Auto rework budget boundary"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
          auto_rework_count: 4,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Boundary auto rework dispatch.",
        now: new Date("2026-03-08T11:05:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_01b",
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "Still needs one more auto rework.",
            report_markdown: "# Report\n\nBoundary rework dispatch.",
            rework_target_message: "Apply final boundary rework."
          })
        }
      }
    );

    expect(result.route).toBe("auto_rework");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.meta_review?.auto_rework_count).toBe(5);
    expect(result.state.meta_review?.auto_rework_limit).toBe(5);
  });

  it("routes to human gate when budget is exhausted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_02",
      task: "Budget exhausted"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
          auto_rework_count: 5,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged with pending issues.",
        now: new Date("2026-03-08T11:10:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_02",
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "Rework still needed.",
            report_markdown: "# Report\n\nRework still required.",
            rework_target_message: "Address remaining regression risk."
          })
        }
      }
    );

    expect(result.route).toBe("human_gate_budget_exhausted");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.sticky_human_gate).toBe(true);
    expect(result.state.meta_review?.auto_rework_count).toBe(5);
  });

  it("routes to human gate with approve recommendation", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_02b",
      task: "Approve recommendation route"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged and approve recommended.",
        now: new Date("2026-03-08T11:15:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_02b",
          runLiveReview: async () => ({
            recommendation: "approve",
            summary: "Approve recommendation.",
            report_markdown: "# Report\n\nLooks good."
          })
        }
      }
    );

    expect(result.route).toBe("human_gate_approve");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      latest_recommendation: "approve"
    });
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.sticky_human_gate).toBe(true);
  });

  it("routes to human gate with inconclusive recommendation", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_02c",
      task: "Inconclusive recommendation route"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but recommendation inconclusive.",
        now: new Date("2026-03-08T11:17:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_02c",
          runLiveReview: async () => ({
            recommendation: "inconclusive",
            summary: "Inconclusive recommendation.",
            report_markdown: "# Report\n\nNeed human follow-up."
          })
        }
      }
    );

    expect(result.route).toBe("human_gate_inconclusive");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.sticky_human_gate).toBe(true);
  });

  it("keeps bubble in READY_FOR_APPROVAL when meta-review run returns error status", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_02d",
      task: "Error-status fallback route"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but meta-review runtime failed.",
        now: new Date("2026-03-08T11:18:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_02d",
          runLiveReview: async () => {
            throw new Error("simulated meta-review adapter unavailable");
          }
        }
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_APPROVAL");
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
    expect(result.state.meta_review?.last_autonomous_status).toBe("error");
    expect(result.state.meta_review?.last_autonomous_recommendation).toBe(
      "inconclusive"
    );
  });

  it("bypasses autonomous run when sticky_human_gate is already true", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_03",
      task: "Sticky bypass"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
          auto_rework_count: 1,
          auto_rework_limit: 5,
          sticky_human_gate: true
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged again.",
        now: new Date("2026-03-08T11:20:00.000Z")
      },
      {
        runMetaReview: async () => {
          throw new Error("runMetaReview should not be called on sticky bypass");
        }
      }
    );

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
  });

  it("falls back to human gate when auto-dispatch append fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_04",
      task: "Dispatch fallback"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but needs auto rework.",
        now: new Date("2026-03-08T11:30:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_04",
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "Dispatch should fail.",
            report_markdown: "# Report\n\nDispatch failure scenario.",
            rework_target_message: "Please update failing path."
          })
        },
        appendProtocolEnvelope: async (input) => {
          if (input.envelope.type === "APPROVAL_DECISION") {
            throw new Error("dispatch unavailable");
          }
          return appendProtocolEnvelope(input);
        }
      }
    );

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.round).toBe(1);
    expect(result.state.meta_review?.auto_rework_count).toBe(0);
  });

  it("keeps auto_rework_count increment atomic with successful dispatch under CAS retry", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_04c",
      task: "Dispatch success + counter CAS retry"
    });

    let injectedConflict = false;
    const writeWithCounterConflict = async (
      statePath: Parameters<typeof writeStateSnapshot>[0],
      state: Parameters<typeof writeStateSnapshot>[1],
      options?: Parameters<typeof writeStateSnapshot>[2]
    ) => {
      if (
        !injectedConflict &&
        options?.expectedState === "RUNNING" &&
        state.state === "RUNNING" &&
        state.meta_review?.auto_rework_count === 1
      ) {
        injectedConflict = true;
        throw new StateStoreConflictError("simulated counter CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged with autonomous rework recommendation.",
        now: new Date("2026-03-08T11:32:00.000Z")
      },
      {
        writeStateSnapshot: writeWithCounterConflict,
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_04c",
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "Auto rework dispatch should still increment counter once.",
            report_markdown: "# Report\n\nCounter CAS retry.",
            rework_target_message: "Apply requested fix set."
          })
        }
      }
    );

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.meta_review?.auto_rework_count).toBe(1);
  });

  it("classifies sticky precondition flips before auto-rework dispatch as state conflict", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_04b",
      task: "Sticky precondition conflict classification"
    });

    let readCount = 0;
    const readWithStickyFlip = async (statePath: string) => {
      const loaded = await readStateSnapshot(statePath);
      readCount += 1;
      if (readCount === 2) {
        return {
          ...loaded,
          state: {
            ...loaded.state,
            meta_review: {
              ...(loaded.state.meta_review ?? {
                last_autonomous_run_id: null,
                last_autonomous_status: null,
                last_autonomous_recommendation: null,
                last_autonomous_summary: null,
                last_autonomous_report_ref: null,
                last_autonomous_rework_target_message: null,
                last_autonomous_updated_at: null,
                auto_rework_count: 0,
                auto_rework_limit: 5,
                sticky_human_gate: false
              }),
              sticky_human_gate: true
            }
          }
        };
      }
      return loaded;
    };

    await expect(
      applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged but precondition race happened.",
          now: new Date("2026-03-08T11:35:00.000Z")
        },
        {
          readStateSnapshot: readWithStickyFlip,
          metaReviewDependencies: {
            randomUUID: () => "run_meta_gate_04b",
            runLiveReview: async () => ({
              recommendation: "rework",
              summary: "Would auto rework without sticky flip.",
              report_markdown: "# Report\n\nPrecondition race.",
              rework_target_message: "Rework target"
            })
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
  });

  it("enforces no-lifecycle-change invariant on CAS conflict during auto-rework write", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_05",
      task: "CAS conflict"
    });

    const failOnAutoReworkWrite = async (
      statePath: Parameters<typeof writeStateSnapshot>[0],
      state: Parameters<typeof writeStateSnapshot>[1],
      options?: Parameters<typeof writeStateSnapshot>[2]
    ) => {
      if (options?.expectedState === "META_REVIEW_RUNNING" && state.state === "RUNNING") {
        throw new StateStoreConflictError("simulated conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    await expect(
      applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged with rework recommendation.",
          now: new Date("2026-03-08T11:40:00.000Z")
        },
        {
          writeStateSnapshot: failOnAutoReworkWrite,
          metaReviewDependencies: {
            randomUUID: () => "run_meta_gate_05",
            runLiveReview: async () => ({
              recommendation: "rework",
              summary: "Will conflict on write.",
              report_markdown: "# Report\n\nConflict test.",
              rework_target_message: "Attempt auto rework."
            })
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("META_REVIEW_RUNNING");
    expect(loaded.state.active_agent).toBeNull();
    expect(loaded.state.active_role).toBeNull();
    expect(loaded.state.active_since).toBeNull();

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath, {
      allowMissing: true
    });
    expect(inbox.some((entry) => entry.type === "APPROVAL_DECISION")).toBe(false);
  });

  it("keeps bubble in READY_FOR_APPROVAL when meta-review invocation throws", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_06",
      task: "Run failure fallback"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-08T11:50:00.000Z")
      },
      {
        runMetaReview: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_RUN_FAILED",
            "simulated runner invocation failure"
          );
        }
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.state.state).toBe("READY_FOR_APPROVAL");
    expect(result.state.meta_review).toMatchObject({
      sticky_human_gate: false,
      last_autonomous_status: "error",
      last_autonomous_recommendation: "inconclusive"
    });
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      latest_recommendation: "inconclusive"
    });
  });

  it("overwrites stale previous recommendation on run_failed fallback", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_06b",
      task: "Run failure stale recommendation overwrite"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          last_autonomous_run_id: "run_meta_gate_previous_ok",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Previous run approved.",
          last_autonomous_report_ref:
            "artifacts/reports/meta-review/run_meta_gate_previous_ok.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T11:00:00.000Z",
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-08T11:52:00.000Z")
      },
      {
        runMetaReview: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_RUN_FAILED",
            "simulated runner invocation failure"
          );
        }
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.state.meta_review).toMatchObject({
      sticky_human_gate: false,
      last_autonomous_status: "error",
      last_autonomous_recommendation: "inconclusive"
    });
    expect(result.state.meta_review?.last_autonomous_summary).toContain(
      "META_REVIEW_GATE_RUN_FAILED"
    );
  });

  it("persists READY_FOR_HUMAN_APPROVAL before throwing when approval-request append fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_07",
      task: "Human gate append failure state persistence"
    });

    await expect(
      applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged with approve recommendation.",
          now: new Date("2026-03-08T12:00:00.000Z")
        },
        {
          metaReviewDependencies: {
            randomUUID: () => "run_meta_gate_07",
            runLiveReview: async () => ({
              recommendation: "approve",
              summary: "Needs human approval gate.",
              report_markdown: "# Report\n\nApprove path."
            })
          },
          appendProtocolEnvelope: async (input) => {
            if (input.envelope.type === "APPROVAL_REQUEST") {
              throw new Error("approval request append unavailable");
            }
            return appendProtocolEnvelope(input);
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(loaded.state.meta_review?.sticky_human_gate).toBe(true);
  });
});
