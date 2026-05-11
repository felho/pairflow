import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { CommitBubbleDependencies } from "../../../../src/v11/application/commit/commitCommandApiContract.js";
import { getBubblePaths } from "../../../../src/v11/shared/bubble/bubblePaths.js";
import type { BubbleConfig } from "../../../../src/v11/shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";

const order: string[] = [];

const runCommitGitStep = vi.fn(async () => {
  order.push("git");
  return {
    stagedFiles: ["feature.txt"],
    commitMessage: "bubble(b_pipeline_01): finalize",
    commitSha: "abc1234"
  };
});

const appendCommitResultEnvelope = vi.fn(async () => {
  order.push("append");
  return {
    sequence: 12,
    envelope: {
      id: "msg_commit_pipeline_01",
      ts: "2026-05-09T08:00:00.000Z",
      bubble_id: "b_pipeline_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 3,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_pipeline_01): finalize",
          commit_sha: "abc1234"
        }
      },
      refs: ["ref-a"]
    } satisfies ProtocolEnvelope
  };
});

const doneState: BubbleStateSnapshot = {
  bubble_id: "b_pipeline_01",
  state: "DONE",
  round: 3,
  active_agent: null,
  active_since: null,
  active_role: null,
  execution_context: null,
  round_role_history: [],
  last_command_at: "2026-05-09T08:00:00.000Z",
  pending_rework_intent: null,
  rework_intent_history: []
};

const persistCommittedThenDoneState = vi.fn(async () => {
  order.push("persist");
  return {
    state: doneState,
    raw: `${JSON.stringify(doneState)}\n`
  };
});

const emitCommitLifecycleEvent = vi.fn(async () => {
  order.push("event");
});

vi.mock("../../../../src/v11/application/commit/internal/git/commitCommandGitStep.js", () => ({
  runCommitGitStep
}));

vi.mock("../../../../src/v11/application/commit/internal/finalization/commitCommandFinalization.js", () => ({
  appendCommitResultEnvelope,
  emitCommitLifecycleEvent,
  persistCommittedThenDoneState
}));

vi.mock("../../../../src/v11/application/commit/remoteCommitContinuitySync.js", () => ({
  syncRemoteCommitContinuityArtifacts: vi.fn()
}));

describe("runCommitCommandPipeline", () => {
  it("owns the local route side-effect ordering behind the internal pipeline boundary", async () => {
    order.length = 0;
    vi.clearAllMocks();

    const approvedState: BubbleStateSnapshot = {
      ...doneState,
      state: "APPROVED_FOR_COMMIT",
      last_command_at: "2026-05-09T07:59:00.000Z"
    };
    const { runCommitCommandPipeline } = await import(
      "../../../../src/v11/application/commit/internal/pipeline/commitCommandPipeline.js"
    );
    const bubbleConfig = {
      id: "b_pipeline_01",
      repo_path: "/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_pipeline_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "code",
      pairflow_command_profile: "external",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 60,
      max_rounds: 5,
      severity_gate_round: 2,
      commit_requires_approval: true,
      agents: {
        implementer: "codex",
        reviewer: "claude",
        meta_reviewer: "codex"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      },
      notifications: {
        enabled: false
      },
      doc_contract_gates: {
        round_gate_applies_after: 2
      }
    } satisfies BubbleConfig;
    const dependencies: CommitBubbleDependencies = {
      appendProtocolEnvelope: vi.fn(),
      executeRemoteBubbleCommitCommand: vi.fn(),
      importRemoteBubbleCommitContinuity: vi.fn(),
      ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
        bubbleInstanceId: "bi_pipeline_01",
        bubbleConfig,
        backfilled: false
      })),
      readRemotePointer: vi.fn(),
      readStateSnapshot: vi.fn(async () => ({
        state: approvedState,
        fingerprint: "state-fingerprint"
      })),
      readTranscriptEnvelopes: vi.fn(async () => []),
      resolveRemoteBubbleStatusTarget: vi.fn(),
      resolveBubbleById: vi.fn(async () => ({
        bubbleId: "b_pipeline_01",
        repoPath: "/repo",
        bubblePaths: getBubblePaths("/repo", "b_pipeline_01"),
        bubbleConfig
      })),
      runGit: vi.fn(),
      writeTextFile: vi.fn(),
      writeStateSnapshot: vi.fn()
    };

    const result = await runCommitCommandPipeline(
      {
        bubbleId: "b_pipeline_01",
        cwd: "/repo",
        refs: [" ref-a ", ""],
        now: new Date("2026-05-09T08:00:00.000Z")
      },
      dependencies
    );

    expect(order).toEqual(["git", "append", "persist", "event"]);
    expect(result).toMatchObject({
      bubbleId: "b_pipeline_01",
      sequence: 12,
      state: {
        state: "DONE"
      },
      commitSha: "abc1234",
      stagedFiles: ["feature.txt"]
    });
    expect(runCommitGitStep).toHaveBeenCalledWith(expect.objectContaining({
      stageAll: false,
      force: false
    }));
    expect(appendCommitResultEnvelope).toHaveBeenCalledWith(expect.objectContaining({
      refs: ["ref-a"]
    }));
  });

  it("keeps route orchestration out of the public commit API boundary", async () => {
    const apiSource = await readFile(
      resolve("src/v11/application/commit/commitCommandApi.ts"),
      "utf8"
    );

    expect(apiSource).toContain("runCommitCommandPipeline");
    expect(apiSource).not.toMatch(/function prepareCommitExecutionContext/u);
    expect(apiSource).not.toMatch(/function commitRemoteExecutionRoute/u);
    expect(apiSource).not.toMatch(/function commitLocalExecutionRoute/u);
  });
});
