import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  parseBubbleConfigToml,
  renderBubbleConfigToml
} from "../../../src/config/bubbleConfig.js";
import {
  UiBubbleReviewPolicyConflictError,
  REVIEW_POLICY_STATE_CONFLICT,
  updateBubbleReviewPolicyForUi
} from "../../../src/v11/defaults/ui/updateBubbleReviewPolicyForUi.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../src/v11/domain/state/snapshot/projection.js";
import { withFileLock } from "../../../src/v11/infrastructure/foundation/fs/fileLock.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-update-review-policy-ui-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("updateBubbleReviewPolicyForUi", () => {
  it("routes started remote bubble review-policy updates to the remote clone and mirrors the local control-plane config", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b-update-policy-remote-01",
      repoPath,
      task: "Remote review-policy update test."
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "lab"
        }
      }),
      "utf8"
    );
    const initialBubbleToml = await readFile(bubble.paths.bubbleTomlPath, "utf8");
    const remoteCalls: unknown[] = [];

    const result = await updateBubbleReviewPolicyForUi(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        reviewLoopMode: "meta_only",
        reviewBlockingMinSeverity: "P2",
        expectedBubbleToml: initialBubbleToml
      },
      {
        readRemotePointer: async () => ({
          kind: "started",
          host: "remote.example",
          instanceId: "inst_remote_policy",
          remoteClonePath: "/srv/pairflow/b-update-policy-remote-01",
          tmuxSession: "pairflow-b-update-policy-remote-01",
          startedAt: "2026-02-21T12:00:00.000Z"
        }),
        resolveRemoteBubbleStatusTarget: async () => ({
          alias: "lab",
          host: "remote.example",
          pairflowCommand: "pairflow"
        }),
        executeRemoteBubbleReviewPolicyCommand: async (remoteInput) => {
          remoteCalls.push(remoteInput);
          return {
            kind: "review_policy_updated",
            bubbleId: remoteInput.bubbleId,
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "guarded",
              reviewer_blocking_min_severity: "P2",
              meta_review_auto_rework_min_severity: "P2",
              meta_review_consecutive_clean_runs_required: 1,
              blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED",
              blocked_prerequisites: [
                "reviewer_bypass_activation_phase3b_pending"
              ],
              provenance_note: "remote"
            },
            previousRequestedLoopMode: "full",
            nextRequestedLoopMode: "meta_only",
            activationChange: "none",
            bubbleToml: "remote bubble toml"
          };
        }
      }
    );

    expect(remoteCalls).toHaveLength(1);
    expect(remoteCalls[0]).toMatchObject({
      bubbleId: bubble.bubbleId,
      remoteClonePath: "/srv/pairflow/b-update-policy-remote-01",
      reviewLoopMode: "meta_only",
      reviewBlockingMinSeverity: "P2"
    });
    expect(result.reviewPolicy.requested_loop_mode).toBe("meta_only");
    const localConfig = parseBubbleConfigToml(
      await readFile(bubble.paths.bubbleTomlPath, "utf8")
    );
    expect(localConfig.repo_path).toBe(repoPath);
    expect(localConfig.review_policy).toEqual({
      review_loop_mode: "meta_only",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
    });
  });

  it("does not mirror local review-policy config when the remote update reports a state conflict", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b-update-policy-remote-conflict-01",
      repoPath,
      task: "Remote review-policy conflict test."
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "lab"
        }
      }),
      "utf8"
    );
    const initialBubbleToml = await readFile(bubble.paths.bubbleTomlPath, "utf8");

    await expect(
      updateBubbleReviewPolicyForUi(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          reviewLoopMode: "meta_only",
          expectedBubbleToml: initialBubbleToml
        },
        {
          readRemotePointer: async () => ({
            kind: "started",
            host: "remote.example",
            instanceId: "inst_remote_policy_conflict",
            remoteClonePath: "/srv/pairflow/b-update-policy-remote-conflict-01",
            tmuxSession: "pairflow-b-update-policy-remote-conflict-01",
            startedAt: "2026-02-21T12:00:00.000Z"
          }),
          resolveRemoteBubbleStatusTarget: async () => ({
            alias: "lab",
            host: "remote.example",
            pairflowCommand: "pairflow"
          }),
          executeRemoteBubbleReviewPolicyCommand: async () => ({
            kind: "conflict",
            reasonCode: REVIEW_POLICY_STATE_CONFLICT,
            currentState: "DONE"
          })
        }
      )
    ).rejects.toMatchObject({
      name: "UiBubbleReviewPolicyStateConflictError",
      reasonCode: REVIEW_POLICY_STATE_CONFLICT,
      currentState: "DONE"
    });
    await expect(readFile(bubble.paths.bubbleTomlPath, "utf8")).resolves.toBe(
      initialBubbleToml
    );
  });

  it("uses the prepared local policy as remote conflict fallback when the remote omits policy context", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b-update-policy-remote-conflict-fallback-01",
      repoPath,
      task: "Remote review-policy fallback conflict test."
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "lab"
        },
        review_policy: {
          review_loop_mode: "full",
          reviewer_blocking_min_severity: "P1",
          meta_review_auto_rework_min_severity: "P1",
          meta_review_consecutive_clean_runs_required: 1,
        }
      }),
      "utf8"
    );
    const initialBubbleToml = await readFile(bubble.paths.bubbleTomlPath, "utf8");
    let capturedError: unknown;

    try {
      await updateBubbleReviewPolicyForUi(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          reviewLoopMode: "meta_only",
          reviewBlockingMinSeverity: "P3",
          metaReviewQualityPreset: "P3+1",
          expectedBubbleToml: initialBubbleToml
        },
        {
          readRemotePointer: async () => ({
            kind: "started",
            host: "remote.example",
            instanceId: "inst_remote_policy_conflict_fallback",
            remoteClonePath:
              "/srv/pairflow/b-update-policy-remote-conflict-fallback-01",
            tmuxSession:
              "pairflow-b-update-policy-remote-conflict-fallback-01",
            startedAt: "2026-02-21T12:00:00.000Z"
          }),
          resolveRemoteBubbleStatusTarget: async () => ({
            alias: "lab",
            host: "remote.example",
            pairflowCommand: "pairflow"
          }),
          executeRemoteBubbleReviewPolicyCommand: async () => ({
            kind: "conflict",
            reasonCode: "REMOTE_REVIEW_POLICY_UNKNOWN_CONFLICT",
            currentBubbleToml: "remote current bubble.toml"
          })
        }
      );
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(UiBubbleReviewPolicyConflictError);
    expect(capturedError).toMatchObject({
      currentBubbleToml: "remote current bubble.toml",
      currentReviewPolicy: {
        requested_loop_mode: "meta_only",
        effective_loop_mode: "full",
        reviewer_blocking_min_severity: "P3",
        meta_review_auto_rework_min_severity: "P3",
        meta_review_consecutive_clean_runs_required: 2
      }
    });
    await expect(readFile(bubble.paths.bubbleTomlPath, "utf8")).resolves.toBe(
      initialBubbleToml
    );
  });

  it("rolls back the local mirror when the remote review-policy command throws after local preparation", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b-update-policy-remote-rollback-01",
      repoPath,
      task: "Remote review-policy rollback test."
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "lab"
        }
      }),
      "utf8"
    );
    const initialBubbleToml = await readFile(bubble.paths.bubbleTomlPath, "utf8");

    await expect(
      updateBubbleReviewPolicyForUi(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          reviewLoopMode: "meta_only",
          reviewBlockingMinSeverity: "P2",
          expectedBubbleToml: initialBubbleToml
        },
        {
          readRemotePointer: async () => ({
            kind: "started",
            host: "remote.example",
            instanceId: "inst_remote_policy_rollback",
            remoteClonePath: "/srv/pairflow/b-update-policy-remote-rollback-01",
            tmuxSession: "pairflow-b-update-policy-remote-rollback-01",
            startedAt: "2026-02-21T12:00:00.000Z"
          }),
          resolveRemoteBubbleStatusTarget: async () => ({
            alias: "lab",
            host: "remote.example",
            pairflowCommand: "pairflow"
          }),
          executeRemoteBubbleReviewPolicyCommand: async () => {
            throw new Error("simulated remote write failure");
          }
        }
      )
    ).rejects.toThrow("simulated remote write failure");

    await expect(readFile(bubble.paths.bubbleTomlPath, "utf8")).resolves.toBe(
      initialBubbleToml
    );
  });

  it("forwards expected bubble.toml to the remote review-policy command and preserves thresholds when omitted from the UI patch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b-update-policy-remote-preserve-01",
      repoPath,
      task: "Remote omission-preserve test."
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "lab"
        },
        review_policy: {
          review_loop_mode: "full",
          reviewer_blocking_min_severity: "P1",
          meta_review_auto_rework_min_severity: "P1",
          meta_review_consecutive_clean_runs_required: 1,
        }
      }),
      "utf8"
    );
    const initialBubbleToml = await readFile(bubble.paths.bubbleTomlPath, "utf8");
    const remoteCalls: unknown[] = [];

    const result = await updateBubbleReviewPolicyForUi(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        reviewLoopMode: "meta_only",
        expectedBubbleToml: initialBubbleToml
      },
      {
        readRemotePointer: async () => ({
          kind: "started",
          host: "remote.example",
          instanceId: "inst_remote_policy_preserve",
          remoteClonePath: "/srv/pairflow/b-update-policy-remote-preserve-01",
          tmuxSession: "pairflow-b-update-policy-remote-preserve-01",
          startedAt: "2026-02-21T12:00:00.000Z"
        }),
        resolveRemoteBubbleStatusTarget: async () => ({
          alias: "lab",
          host: "remote.example",
          pairflowCommand: "pairflow"
        }),
        executeRemoteBubbleReviewPolicyCommand: async (remoteInput) => {
          remoteCalls.push(remoteInput);
          return {
            kind: "review_policy_updated",
            bubbleId: remoteInput.bubbleId,
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "guarded",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1",
              meta_review_consecutive_clean_runs_required: 1,
              blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED",
              blocked_prerequisites: [
                "reviewer_bypass_activation_phase3b_pending"
              ],
              provenance_note: "remote"
            },
            previousRequestedLoopMode: "full",
            nextRequestedLoopMode: "meta_only",
            activationChange: "none",
            bubbleToml: "remote bubble toml"
          };
        }
      }
    );

    expect(remoteCalls).toHaveLength(1);
    expect(remoteCalls[0]).toMatchObject({
      bubbleId: bubble.bubbleId,
      remoteClonePath: "/srv/pairflow/b-update-policy-remote-preserve-01",
      reviewLoopMode: "meta_only",
      expectedBubbleToml: initialBubbleToml
    });
    expect(result.reviewPolicy.reviewer_blocking_min_severity).toBe("P1");
    expect(result.reviewPolicy.meta_review_auto_rework_min_severity).toBe("P1");
    const localConfig = parseBubbleConfigToml(
      await readFile(bubble.paths.bubbleTomlPath, "utf8")
    );
    expect(localConfig.review_policy).toEqual({
      review_loop_mode: "meta_only",
      reviewer_blocking_min_severity: "P1",
      meta_review_auto_rework_min_severity: "P1",
      meta_review_consecutive_clean_runs_required: 1,
    });
  });

  it("revalidates mutable lifecycle state under the shared state lock before writing bubble.toml", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b-update-policy-lock-01",
      repoPath,
      task: "Lock-aware state revalidation test."
    });
    const initialBubbleToml = await readFile(bubble.paths.bubbleTomlPath, "utf8");
    let pendingUpdate:
      | ReturnType<typeof updateBubbleReviewPolicyForUi>
      | undefined;

    await withFileLock(
      {
        lockPath: `${bubble.paths.statePath}.lock`,
        timeoutMs: 5_000
      },
      async () => {
        pendingUpdate = updateBubbleReviewPolicyForUi({
          bubbleId: bubble.bubbleId,
          repoPath,
          reviewLoopMode: "meta_only",
          expectedBubbleToml: initialBubbleToml
        });
        const loaded = await readStateSnapshot(bubble.paths.statePath);
        await writeFile(
          bubble.paths.statePath,
          `${JSON.stringify(
            toPersistedSnapshot(
              applyStateTransition(buildBubbleStateSnapshotVariant(loaded.state), {
                to: "CANCELLED",
                activeAgent: null,
                activeRole: null,
                activeSince: null,
                lastCommandAt: "2026-02-21T12:05:00.000Z"
              })
            ),
            null,
            2
          )}\n`,
          "utf8"
        );
      }
    );

    if (pendingUpdate === undefined) {
      throw new Error("Expected pending review-policy update promise to be created.");
    }

    await expect(pendingUpdate).rejects.toMatchObject({
      name: "UiBubbleReviewPolicyStateConflictError",
      reasonCode: REVIEW_POLICY_STATE_CONFLICT,
      currentState: "CANCELLED"
    });
    await expect(readFile(bubble.paths.bubbleTomlPath, "utf8")).resolves.toBe(
      initialBubbleToml
    );
  });
});
