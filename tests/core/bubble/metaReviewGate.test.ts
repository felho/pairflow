import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyMetaReviewGateOnConvergence,
  awaitMetaReviewSubmission,
  MetaReviewGateError,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
import { submitMetaReviewResult } from "../../../src/core/bubble/metaReview.js";
import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../../../src/core/state/stateStore.js";
import type { BubbleMetaReviewSnapshotState } from "../../../src/types/bubble.js";
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

async function waitForState(
  statePath: string,
  expected: "META_REVIEW_RUNNING" | "READY_FOR_HUMAN_APPROVAL" | "META_REVIEW_FAILED"
): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (Date.now() <= deadline) {
    const loaded = await readStateSnapshot(statePath);
    if (loaded.state.state === expected) {
      return;
    }
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 50);
    });
  }
  throw new Error(`Timed out while waiting for state ${expected}.`);
}

function buildBoundMetaReviewerPaneResult(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  active: boolean;
  runId?: string | null;
}) {
  return {
    updated: true as const,
    record: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      tmuxSessionName: "pf_meta_structured",
      updatedAt: "2026-03-10T10:00:00.000Z",
      metaReviewerPane: {
        role: "meta-reviewer" as const,
        paneIndex: 3,
        active: input.active,
        runId: input.runId ?? null,
        updatedAt: "2026-03-10T10:00:00.000Z"
      }
    }
  };
}

async function writeRecoveryMetaReviewRunningState(input: {
  statePath: string;
  loaded: LoadedStateSnapshot;
  metaReview: BubbleMetaReviewSnapshotState;
  transitionedAt: string;
}): Promise<void> {
  const readyForApproval = applyStateTransition(input.loaded.state, {
    to: "READY_FOR_APPROVAL",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.transitionedAt
  });
  const metaReviewRunning = applyStateTransition(readyForApproval, {
    to: "META_REVIEW_RUNNING",
    activeAgent: "codex",
    activeRole: "meta_reviewer",
    activeSince: input.transitionedAt,
    lastCommandAt: input.transitionedAt
  });
  // Direct meta_review payload write is intentional: state transitions do not author canonical autonomous snapshot fields.
  await writeStateSnapshot(
    input.statePath,
    {
      ...metaReviewRunning,
      meta_review: input.metaReview
    },
    {
      expectedFingerprint: input.loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

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

  it("routes bubble to META_REVIEW_FAILED when meta-review run returns error status", async () => {
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
    expect(result.state.state).toBe("META_REVIEW_FAILED");
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
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
    expect(result.gateEnvelope.payload.summary).toContain("append_error=dispatch unavailable");
    expect(result.gateEnvelope.payload.summary).toContain("restore_outcome=applied");
  });

  it("surfaces append root error and restore-failure outcome when auto-dispatch recovery restore fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_04b",
      task: "Dispatch fallback restore failure"
    });

    let dispatchAppendAttempted = false;
    let failure: unknown;
    await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but needs auto rework.",
        now: new Date("2026-03-08T11:31:00.000Z")
      },
      {
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_04b",
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "Dispatch should fail then restore should conflict.",
            report_markdown: "# Report\n\nDispatch failure + restore conflict.",
            rework_target_message: "Please update failing path."
          })
        },
        appendProtocolEnvelope: async (input) => {
          if (input.envelope.type === "APPROVAL_DECISION") {
            dispatchAppendAttempted = true;
            throw new Error("dispatch unavailable");
          }
          return appendProtocolEnvelope(input);
        },
        writeStateSnapshot: async (statePath, state, options) => {
          if (
            dispatchAppendAttempted &&
            options?.expectedState === "RUNNING" &&
            state.state === "READY_FOR_APPROVAL"
          ) {
            throw new StateStoreConflictError("restore conflict");
          }
          return writeStateSnapshot(statePath, state, options);
        }
      }
    ).catch((error: unknown) => {
      failure = error;
    });
    expect(failure).toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
    if (failure instanceof Error) {
      expect(failure.message).toContain("append_error=dispatch unavailable");
      expect(failure.message).toContain("restore_outcome=failed");
    }
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

  it("accepts concurrent higher auto_rework_count on CAS retry after successful dispatch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_04d",
      task: "Dispatch success + counter CAS drift"
    });

    let injectedConflict = false;
    const writeWithCounterDrift = async (
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
        const latest = await readStateSnapshot(statePath);
        const latestMetaReview = latest.state.meta_review ?? {
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
        };
        await writeStateSnapshot(
          statePath,
          {
            ...latest.state,
            meta_review: {
              ...latestMetaReview,
              auto_rework_count: 2
            }
          },
          {
            expectedFingerprint: latest.fingerprint,
            expectedState: "RUNNING"
          }
        );
        throw new StateStoreConflictError("simulated counter drift conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged with autonomous rework recommendation.",
        now: new Date("2026-03-08T11:33:00.000Z")
      },
      {
        writeStateSnapshot: writeWithCounterDrift,
        metaReviewDependencies: {
          randomUUID: () => "run_meta_gate_04d",
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "Concurrent counter drift should still converge.",
            report_markdown: "# Report\n\nCounter CAS drift.",
            rework_target_message: "Apply requested fix set."
          })
        }
      }
    );

    expect(injectedConflict).toBe(true);
    expect(result.route).toBe("auto_rework");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.meta_review?.auto_rework_count).toBe(2);
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
    expect(loaded.state.active_agent).toBe("codex");
    expect(loaded.state.active_role).toBe("meta_reviewer");
    expect(loaded.state.active_since).not.toBeNull();

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath, {
      allowMissing: true
    });
    expect(inbox.some((entry) => entry.type === "APPROVAL_DECISION")).toBe(false);
  });

  it("routes bubble to META_REVIEW_FAILED when meta-review invocation throws", async () => {
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
    expect(result.state.state).toBe("META_REVIEW_FAILED");
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

  it("recovers from concurrent structured submit instead of overwriting with META_REVIEW_FAILED on run-failed CAS conflict", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_06c",
      task: "Run-failed fallback CAS conflict with concurrent structured submit"
    });

    let injectedConflict = false;
    const writeWithRunFailedConflict = async (
      statePath: Parameters<typeof writeStateSnapshot>[0],
      state: Parameters<typeof writeStateSnapshot>[1],
      options?: Parameters<typeof writeStateSnapshot>[2]
    ) => {
      if (
        !injectedConflict &&
        options?.expectedState === "META_REVIEW_RUNNING" &&
        state.state === "META_REVIEW_FAILED"
      ) {
        injectedConflict = true;
        const latest = await readStateSnapshot(statePath);
        const latestMetaReview = latest.state.meta_review ?? {
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
        };
        await writeStateSnapshot(
          statePath,
          {
            ...latest.state,
            meta_review: {
              ...latestMetaReview,
              last_autonomous_run_id: "run_meta_gate_06c_concurrent_submit",
              last_autonomous_status: "success",
              last_autonomous_recommendation: "approve",
              last_autonomous_summary: "Concurrent structured submit won the race.",
              last_autonomous_report_ref: "artifacts/meta-review-last.md",
              last_autonomous_rework_target_message: null,
              last_autonomous_updated_at: "2026-03-08T11:53:00.000Z"
            }
          },
          {
            expectedFingerprint: latest.fingerprint,
            expectedState: "META_REVIEW_RUNNING"
          }
        );
        throw new StateStoreConflictError("simulated run-failed route CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-08T11:53:00.000Z")
      },
      {
        runMetaReview: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_RUN_FAILED",
            "simulated runner invocation failure"
          );
        },
        writeStateSnapshot: writeWithRunFailedConflict
      }
    );

    expect(injectedConflict).toBe(true);
    expect(result.route).toBe("human_gate_approve");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.last_autonomous_run_id).toBe(
      "run_meta_gate_06c_concurrent_submit"
    );
    expect(result.state.meta_review?.last_autonomous_recommendation).toBe("approve");
  });

  it("rolls back to META_REVIEW_RUNNING when approval-request append fails", async () => {
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
    expect(loaded.state.state).toBe("META_REVIEW_RUNNING");
    expect(loaded.state.active_agent).toBe("codex");
    expect(loaded.state.active_role).toBe("meta_reviewer");
    expect(loaded.state.meta_review?.sticky_human_gate).toBe(false);
  });

  it("classifies append-fail rollback conflict as META_REVIEW_GATE_STATE_CONFLICT", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_07b",
      task: "Human gate append failure rollback conflict classification"
    });

    const defaultWriteStateSnapshot = writeStateSnapshot;
    await expect(
      applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged with approve recommendation.",
          now: new Date("2026-03-08T12:02:00.000Z")
        },
        {
          metaReviewDependencies: {
            randomUUID: () => "run_meta_gate_07b",
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
          },
          writeStateSnapshot: async (statePath, state, options) => {
            if (
              options?.expectedState === "READY_FOR_HUMAN_APPROVAL" &&
              state.state === "META_REVIEW_RUNNING"
            ) {
              throw new StateStoreConflictError(
                "simulated rollback conflict"
              );
            }
            return defaultWriteStateSnapshot(statePath, state, options);
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
  });

  it("routes from canonical structured submit snapshot (approve)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_01",
      task: "Structured submit approve route"
    });

    const gatePromise = applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged with structured submit.",
        now: new Date("2026-03-10T10:00:00.000Z")
      },
      {
        awaitMetaReviewSubmission: (submissionInput, submissionDependencies) =>
          awaitMetaReviewSubmission(
            {
              ...submissionInput,
              timeoutMs: 15_000
            },
            submissionDependencies
          ),
        setMetaReviewerPaneBinding: async (bindingInput) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          }),
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    await waitForState(bubble.paths.statePath, "META_REVIEW_RUNNING");

    await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary: "Structured submit approve summary.",
        report_markdown: "# Meta Review\n\nStructured submit approve."
      },
      {
        now: new Date("2026-03-10T10:00:01.000Z"),
        randomUUID: () => "run_meta_gate_structured_01",
        readRuntimeSessionsRegistry: async () => ({
          [bubble.bubbleId]: {
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_meta_structured",
            updatedAt: "2026-03-10T10:00:01.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active: true,
              runId: "run_meta_gate_structured_01",
              updatedAt: "2026-03-10T10:00:01.000Z"
            }
          }
        })
      }
    );

    const result = await gatePromise;
    expect(result.route).toBe("human_gate_approve");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.last_autonomous_recommendation).toBe(
      "approve"
    );
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      actor_agent: "codex",
      latest_recommendation: "approve"
    });
  });

  it("routes from canonical structured submit snapshot (rework) through auto-rework gate path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_02",
      task: "Structured submit rework route"
    });

    const gatePromise = applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged with structured rework submit.",
        now: new Date("2026-03-10T10:05:00.000Z")
      },
      {
        awaitMetaReviewSubmission: (submissionInput, submissionDependencies) =>
          awaitMetaReviewSubmission(
            {
              ...submissionInput,
              timeoutMs: 15_000
            },
            submissionDependencies
          ),
        setMetaReviewerPaneBinding: async (bindingInput) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          }),
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    await waitForState(bubble.paths.statePath, "META_REVIEW_RUNNING");

    await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "rework",
        summary: "Structured submit rework summary.",
        report_markdown: "# Meta Review\n\nStructured submit rework.",
        rework_target_message: "Apply structured rework follow-up."
      },
      {
        now: new Date("2026-03-10T10:05:01.000Z"),
        randomUUID: () => "run_meta_gate_structured_02",
        readRuntimeSessionsRegistry: async () => ({
          [bubble.bubbleId]: {
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_meta_structured",
            updatedAt: "2026-03-10T10:05:01.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active: true,
              runId: "run_meta_gate_structured_02",
              updatedAt: "2026-03-10T10:05:01.000Z"
            }
          }
        })
      }
    );

    const result = await gatePromise;
    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(result.gateEnvelope.payload.decision).toBe("revise");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.round).toBe(2);
    expect(result.state.meta_review?.last_autonomous_recommendation).toBe("rework");
  });

  it("routes structured inconclusive submit to human_gate_inconclusive", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_03",
      task: "Structured submit inconclusive route"
    });

    const gatePromise = applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged with structured inconclusive submit.",
        now: new Date("2026-03-10T10:10:00.000Z")
      },
      {
        awaitMetaReviewSubmission: (submissionInput, submissionDependencies) =>
          awaitMetaReviewSubmission(
            {
              ...submissionInput,
              timeoutMs: 15_000
            },
            submissionDependencies
          ),
        setMetaReviewerPaneBinding: async (bindingInput) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          }),
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    await waitForState(bubble.paths.statePath, "META_REVIEW_RUNNING");

    await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "inconclusive",
        summary: "Structured submit inconclusive summary.",
        report_markdown: "# Meta Review\n\nStructured submit inconclusive."
      },
      {
        now: new Date("2026-03-10T10:10:01.000Z"),
        randomUUID: () => "run_meta_gate_structured_03",
        readRuntimeSessionsRegistry: async () => ({
          [bubble.bubbleId]: {
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_meta_structured",
            updatedAt: "2026-03-10T10:10:01.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active: true,
              runId: "run_meta_gate_structured_03",
              updatedAt: "2026-03-10T10:10:01.000Z"
            }
          }
        })
      }
    );

    const result = await gatePromise;
    expect(result.route).toBe("human_gate_inconclusive");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      actor_agent: "codex",
      latest_recommendation: "inconclusive"
    });
  });

  it("routes to META_REVIEW_FAILED on structured submit timeout", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_timeout_01",
      task: "Structured submit timeout"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but submit timed out.",
        now: new Date("2026-03-10T10:20:00.000Z")
      },
      {
        awaitMetaReviewSubmission: (submissionInput, submissionDependencies) =>
          awaitMetaReviewSubmission(
            {
              ...submissionInput,
              timeoutMs: 5
            },
            submissionDependencies
          ),
        setMetaReviewerPaneBinding: async (bindingInput) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          }),
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_RUN_FAILED: timeout waiting for structured meta-review submit"
    );
  });

  it("rejects late structured submit in timeout/deactivation window with explicit cutoff reason", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_timeout_02",
      task: "Structured submit timeout late-submit cutoff"
    });
    let lateSubmitError: unknown;

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but submit timed out.",
        now: new Date("2026-03-10T10:22:00.000Z")
      },
      {
        awaitMetaReviewSubmission: (submissionInput, submissionDependencies) =>
          awaitMetaReviewSubmission(
            {
              ...submissionInput,
              timeoutMs: 5
            },
            submissionDependencies
          ),
        setMetaReviewerPaneBinding: async (bindingInput) => {
          if (!bindingInput.active) {
            await submitMetaReviewResult(
              {
                bubbleId: bubble.bubbleId,
                repoPath,
                round: 1,
                recommendation: "approve",
                summary: "Late submit near timeout cutoff.",
                report_markdown: "# Meta Review\n\nLate submit."
              },
              {
                readRuntimeSessionsRegistry: async () => ({
                  [bubble.bubbleId]: {
                    bubbleId: bubble.bubbleId,
                    repoPath,
                    worktreePath: bubble.paths.worktreePath,
                    tmuxSessionName: "pf_meta_structured",
                    updatedAt: "2026-03-10T10:22:01.000Z",
                    metaReviewerPane: {
                      role: "meta-reviewer",
                      paneIndex: 3,
                      active: false,
                      runId: null,
                      updatedAt: "2026-03-10T10:22:01.000Z"
                    }
                  }
                })
              }
            ).catch((error: unknown) => {
              lateSubmitError = error;
            });
          }
          return buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          });
        },
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_RUN_FAILED: timeout waiting for structured meta-review submit"
    );
    expect(lateSubmitError).toMatchObject({
      reasonCode: "META_REVIEW_STATE_INVALID"
    });
    if (lateSubmitError instanceof Error) {
      expect(lateSubmitError.message).toContain("submit window closed");
    }
  });

  it("generates collision-resistant submit run ids for same-timestamp gate starts", async () => {
    const repoPath = await createTempRepo();
    const bubbleA = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_submit_runid_01a",
      task: "Structured submit run id uniqueness A"
    });
    const bubbleB = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_submit_runid_01b",
      task: "Structured submit run id uniqueness B"
    });

    const capturedRunIds: string[] = [];
    const now = new Date("2026-03-10T10:22:30.000Z");

    const runGate = async (bubble: {
      bubbleId: string;
      paths: { worktreePath: string };
    }) =>
      applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Capture submit run id generation.",
          now
        },
        {
          awaitMetaReviewSubmission: async () => {
            throw new MetaReviewGateError(
              "META_REVIEW_GATE_RUN_FAILED",
              "forced stop after run id capture"
            );
          },
          setMetaReviewerPaneBinding: async (bindingInput) => {
            if (bindingInput.active && typeof bindingInput.runId === "string") {
              capturedRunIds.push(bindingInput.runId);
            }
            return buildBoundMetaReviewerPaneResult({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath,
              active: bindingInput.active,
              runId: bindingInput.runId ?? null
            });
          },
          notifyMetaReviewerSubmissionRequest: async () => undefined
        }
      );

    const [resultA, resultB] = await Promise.all([
      runGate(bubbleA),
      runGate(bubbleB)
    ]);

    expect(resultA.route).toBe("human_gate_run_failed");
    expect(resultB.route).toBe("human_gate_run_failed");
    expect(capturedRunIds).toHaveLength(2);
    expect(capturedRunIds[0]).toMatch(/^run_meta_submit_\d+_[0-9a-f]{32}$/u);
    expect(capturedRunIds[1]).toMatch(/^run_meta_submit_\d+_[0-9a-f]{32}$/u);
    expect(capturedRunIds[0]).not.toBe(capturedRunIds[1]);
  });

  it("rejects duplicate structured submit for the same gate run and keeps route deterministic", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_double_submit_01",
      task: "Structured submit duplicate same gate run"
    });
    let duplicateSubmitError: unknown;

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged with duplicate structured submit attempt.",
        now: new Date("2026-03-10T10:23:00.000Z")
      },
      {
        awaitMetaReviewSubmission: (submissionInput, submissionDependencies) =>
          awaitMetaReviewSubmission(
            {
              ...submissionInput,
              timeoutMs: 5_000
            },
            submissionDependencies
          ),
        setMetaReviewerPaneBinding: async (bindingInput) => {
          if (bindingInput.active && typeof bindingInput.runId === "string") {
            const runtimeSessions = {
              [bubble.bubbleId]: {
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath,
                tmuxSessionName: "pf_meta_structured",
                updatedAt: "2026-03-10T10:23:01.000Z",
                metaReviewerPane: {
                  role: "meta-reviewer" as const,
                  paneIndex: 3,
                  active: true,
                  runId: bindingInput.runId,
                  updatedAt: "2026-03-10T10:23:01.000Z"
                }
              }
            };
            await submitMetaReviewResult(
              {
                bubbleId: bubble.bubbleId,
                repoPath,
                round: 1,
                recommendation: "approve",
                summary: "First submit should determine route.",
                report_markdown: "# Meta Review\n\nFirst submit."
              },
              {
                now: new Date("2026-03-10T10:23:01.000Z"),
                readRuntimeSessionsRegistry: async () => runtimeSessions
              }
            );
            await submitMetaReviewResult(
              {
                bubbleId: bubble.bubbleId,
                repoPath,
                round: 1,
                recommendation: "approve",
                summary: "Second submit should be rejected.",
                report_markdown: "# Meta Review\n\nSecond submit."
              },
              {
                now: new Date("2026-03-10T10:23:02.000Z"),
                readRuntimeSessionsRegistry: async () => runtimeSessions
              }
            ).catch((error: unknown) => {
              duplicateSubmitError = error;
            });
          }
          return buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          });
        },
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    expect(result.route).toBe("human_gate_approve");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(duplicateSubmitError).toMatchObject({
      reasonCode: "META_REVIEW_STATE_INVALID"
    });
    if (duplicateSubmitError instanceof Error) {
      expect(duplicateSubmitError.message).toContain("duplicate structured submit");
    }
  });

  it("retries run-failed route persist on teardown-phase state conflict and avoids stranded META_REVIEW_RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_teardown_conflict_01",
      task: "Structured submit teardown conflict retry"
    });

    let bindStopSeen = false;
    let conflictInjected = false;
    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but structured submit failed.",
        now: new Date("2026-03-10T10:24:00.000Z")
      },
      {
        awaitMetaReviewSubmission: async () => {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_RUN_FAILED",
            "simulated submit failure during gate wait"
          );
        },
        setMetaReviewerPaneBinding: async (bindingInput) => {
          if (!bindingInput.active) {
            bindStopSeen = true;
          }
          return buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          });
        },
        writeStateSnapshot: async (statePath, state, options) => {
          if (
            bindStopSeen &&
            !conflictInjected &&
            options?.expectedState === "META_REVIEW_RUNNING" &&
            state.state === "META_REVIEW_FAILED"
          ) {
            conflictInjected = true;
            throw new StateStoreConflictError("teardown race conflict");
          }
          return writeStateSnapshot(statePath, state, options);
        },
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    expect(conflictInjected).toBe(true);
    expect(result.route).toBe("human_gate_run_failed");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("META_REVIEW_FAILED");
  });

  it("fails closed immediately when structured submit notification is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_notify_unavailable_01",
      task: "Structured submit notification unavailable"
    });
    let awaitCalled = false;

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged but meta-reviewer notify path is unavailable.",
        now: new Date("2026-03-10T10:25:00.000Z")
      },
      {
        awaitMetaReviewSubmission: async () => {
          awaitCalled = true;
          throw new Error("await should not be invoked when notify is unavailable");
        },
        setMetaReviewerPaneBinding: async (bindingInput) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          }),
        notifyMetaReviewerSubmissionRequest: async () => {
          throw new Error("tmux delivery unavailable");
        }
      }
    );

    expect(awaitCalled).toBe(false);
    expect(result.route).toBe("human_gate_run_failed");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(result.gateEnvelope.payload.summary).toContain(
      "structured submit request unavailable"
    );
  });

  it("prefers structured await path over legacy runMetaReview fallback when both are provided", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_structured_nohybrid_01",
      task: "No hybrid precedence"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "No hybrid precedence test.",
        now: new Date("2026-03-10T10:30:00.000Z")
      },
      {
        runMetaReview: async () => {
          throw new Error("legacy marker-based path must not execute");
        },
        awaitMetaReviewSubmission: async () => ({
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: "run_meta_gate_structured_nohybrid_01",
          status: "success",
          recommendation: "approve",
          summary: "Structured await submission result.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-10T10:30:01.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }),
        setMetaReviewerPaneBinding: async (bindingInput) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active: bindingInput.active,
            runId: bindingInput.runId ?? null
          }),
        notifyMetaReviewerSubmissionRequest: async () => undefined
      }
    );

    expect(result.route).toBe("human_gate_approve");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
  });
});

describe("recoverMetaReviewGateFromSnapshot", () => {
  it("routes approve recommendation snapshot to READY_FOR_HUMAN_APPROVAL", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_01",
      task: "Recovery approve route"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeRecoveryMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      loaded,
      transitionedAt: "2026-03-08T12:10:00.000Z",
      metaReview: {
        last_autonomous_run_id: "run_meta_gate_recover_01",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Recovered approve summary.",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T12:10:00.000Z",
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    const result = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      now: new Date("2026-03-08T12:11:00.000Z")
    });

    expect(result.route).toBe("human_gate_approve");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.sticky_human_gate).toBe(true);
  });

  it("dispatches auto-rework from snapshot when recommendation is rework with message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_02",
      task: "Recovery auto-rework route"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeRecoveryMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      loaded,
      transitionedAt: "2026-03-08T12:20:00.000Z",
      metaReview: {
        last_autonomous_run_id: "run_meta_gate_recover_02",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: "Recovered rework summary.",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "Fix recovered issue.",
        last_autonomous_updated_at: "2026-03-08T12:20:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    const result = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      now: new Date("2026-03-08T12:21:00.000Z")
    });

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.round).toBe(2);
    expect(result.state.meta_review?.auto_rework_count).toBe(2);
  });

  it("fails with state conflict when runResult and canonical snapshot diverge during recovery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_02a",
      task: "Recovery runResult/snapshot divergence"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeRecoveryMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      loaded,
      transitionedAt: "2026-03-08T12:22:00.000Z",
      metaReview: {
        last_autonomous_run_id: "run_meta_gate_recover_02a_snapshot",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Snapshot changed before recovery route.",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T12:22:00.000Z",
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-03-08T12:23:00.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: "run_meta_gate_recover_02a_runresult",
          status: "success",
          recommendation: "approve",
          summary: "Run result from earlier await read.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-08T12:22:30.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
  });

  it("routes to human dispatch_failed with non-sticky gate when recovered rework snapshot lacks target message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_02b",
      task: "Recovery dispatch fallback route"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeRecoveryMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      loaded,
      transitionedAt: "2026-03-08T12:25:00.000Z",
      metaReview: {
        last_autonomous_run_id: "run_meta_gate_recover_02b",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: "Recovered rework summary with missing dispatch payload.",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "Snapshot payload exists; runResult drives fallback.",
        last_autonomous_updated_at: "2026-03-08T12:25:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    const result = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      now: new Date("2026-03-08T12:26:00.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_meta_gate_recover_02b",
        status: "success",
        recommendation: "rework",
        summary: "Recovered runResult missing dispatch payload.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: null,
        updated_at: "2026-03-08T12:25:00.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: []
      }
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
  });

  it("fails with state conflict when sticky_human_gate is true before snapshot auto-rework dispatch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_03",
      task: "Recovery sticky conflict"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeRecoveryMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      loaded,
      transitionedAt: "2026-03-08T12:30:00.000Z",
      metaReview: {
        last_autonomous_run_id: "run_meta_gate_recover_03",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: "Recovered rework summary with sticky conflict.",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "Fix recovered sticky conflict.",
        last_autonomous_updated_at: "2026-03-08T12:30:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: true
      }
    });

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-03-08T12:31:00.000Z")
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
  });
});

describe("awaitMetaReviewSubmission", () => {
  it("returns structured snapshot even if lifecycle already moved out of META_REVIEW_RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_await_01",
      task: "Await structured snapshot recovery"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const baselineSnapshot = loaded.state.meta_review ?? {
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
    };

    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "READY_FOR_HUMAN_APPROVAL",
        active_agent: null,
        active_role: null,
        active_since: null,
        meta_review: {
          ...baselineSnapshot,
          last_autonomous_run_id: "run_meta_gate_await_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Recovered from snapshot while state moved.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_updated_at: "2026-03-08T12:40:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await awaitMetaReviewSubmission({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      baselineSnapshot,
      timeoutMs: 200
    });

    expect(result.recommendation).toBe("approve");
    expect(result.status).toBe("success");
    expect(result.run_id).toBe("run_meta_gate_await_01");
  });

  it("fails fast when lifecycle leaves META_REVIEW_RUNNING without structured submit snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_await_02",
      task: "Await terminal departure fast-fail"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const baselineSnapshot = loaded.state.meta_review ?? {
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
    };

    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "META_REVIEW_FAILED",
        active_agent: null,
        active_role: null,
        active_since: null
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    let caught: unknown;
    try {
      await awaitMetaReviewSubmission({
        bubbleId: bubble.bubbleId,
        statePath: bubble.paths.statePath,
        baselineSnapshot,
        timeoutMs: 5_000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MetaReviewGateError);
    expect(caught).toMatchObject({
      reasonCode: "META_REVIEW_GATE_RUN_FAILED"
    });
    if (caught instanceof MetaReviewGateError) {
      expect(caught.message).toContain("lifecycle left META_REVIEW_RUNNING");
    }
  });

  it("performs exactly one post-deadline final snapshot read before timeout", async () => {
    vi.useFakeTimers();
    try {
      let readCount = 0;
      const baselineSnapshot = {
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
      };

      const promise = awaitMetaReviewSubmission(
        {
          bubbleId: "b_meta_gate_await_final_read_01",
          statePath: "/tmp/ignored",
          baselineSnapshot,
          timeoutMs: 1
        },
        {
          readStateSnapshot: async () => {
            readCount += 1;
            if (readCount === 1) {
              return {
                fingerprint: "fp_1",
                state: {
                  bubble_id: "b_meta_gate_await_final_read_01",
                  state: "META_REVIEW_RUNNING",
                  round: 1,
                  active_agent: "codex",
                  active_role: "meta_reviewer",
                  active_since: "2026-03-08T12:00:00.000Z",
                  round_role_history: [],
                  last_command_at: "2026-03-08T12:00:00.000Z",
                  meta_review: baselineSnapshot
                }
              };
            }
            return {
              fingerprint: "fp_2",
              state: {
                bubble_id: "b_meta_gate_await_final_read_01",
                state: "META_REVIEW_RUNNING",
                round: 1,
                active_agent: "codex",
                active_role: "meta_reviewer",
                active_since: "2026-03-08T12:00:00.000Z",
                round_role_history: [],
                last_command_at: "2026-03-08T12:00:01.000Z",
                meta_review: {
                  ...baselineSnapshot,
                  last_autonomous_run_id: "run_final_read_01",
                  last_autonomous_status: "success",
                  last_autonomous_recommendation: "approve",
                  last_autonomous_summary: "Submitted near timeout boundary",
                  last_autonomous_report_ref: "artifacts/meta-review-last.md",
                  last_autonomous_updated_at: "2026-03-08T12:00:01.000Z"
                }
              }
            };
          }
        }
      );

      await vi.advanceTimersByTimeAsync(2);
      const result = await promise;

      expect(result.run_id).toBe("run_final_read_01");
      expect(result.recommendation).toBe("approve");
      expect(readCount).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns explicit final-read lifecycle departure reason instead of timeout when state moved after deadline", async () => {
    vi.useFakeTimers();
    try {
      let readCount = 0;
      const baselineSnapshot = {
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
      };

      let caught: unknown;
      const guardedPromise = awaitMetaReviewSubmission(
        {
          bubbleId: "b_meta_gate_await_final_read_02",
          statePath: "/tmp/ignored",
          baselineSnapshot,
          timeoutMs: 1
        },
        {
          readStateSnapshot: async () => {
            readCount += 1;
            if (readCount <= 2) {
              return {
                fingerprint: readCount === 1 ? "fp_1" : "fp_2",
                state: {
                  bubble_id: "b_meta_gate_await_final_read_02",
                  state: "META_REVIEW_RUNNING",
                  round: 1,
                  active_agent: "codex",
                  active_role: "meta_reviewer",
                  active_since: "2026-03-08T12:00:00.000Z",
                  round_role_history: [],
                  last_command_at:
                    readCount === 1
                      ? "2026-03-08T12:00:00.000Z"
                      : "2026-03-08T12:00:01.000Z",
                  meta_review: baselineSnapshot
                }
              };
            }
            return {
              fingerprint: "fp_3",
              state: {
                bubble_id: "b_meta_gate_await_final_read_02",
                state: "META_REVIEW_FAILED",
                round: 1,
                active_agent: null,
                active_role: null,
                active_since: null,
                round_role_history: [],
                last_command_at: "2026-03-08T12:00:01.000Z",
                meta_review: baselineSnapshot
              }
            };
          }
        }
      ).catch((error: unknown) => {
        caught = error;
      });

      await vi.advanceTimersByTimeAsync(2);
      await guardedPromise;

      expect(caught).toMatchObject({
        reasonCode: "META_REVIEW_GATE_RUN_FAILED"
      });
      if (caught instanceof Error) {
        expect(caught.message).toContain("FINAL_READ_LIFECYCLE_DEPARTURE");
        expect(caught.message).not.toContain("timeout waiting for structured meta-review submit");
      }
      expect(readCount).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
