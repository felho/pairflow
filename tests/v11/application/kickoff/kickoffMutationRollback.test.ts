import { describe, expect, it, vi } from "vitest";

import type { PersistedBubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { executeKickoffMutationRollback } from "../../../../src/v11/application/kickoff/internal/rollback/kickoffMutationRollback.js";

const baseState = {
  bubble_id: "b_kickoff_rollback_01",
  state: "RUNNING",
  round: 0,
  active_agent: "codex",
  active_role: "implementer",
  active_since: "2026-03-19T22:00:00.000Z",
  last_command_at: "2026-03-19T22:00:00.000Z",
  round_role_history: []
} as unknown as PersistedBubbleStateSnapshot;

describe("executeKickoffMutationRollback", () => {
  it("returns empty error list when all rollback operations succeed", async () => {
    const writeFile = vi.fn(async () => {});
    const writeState = vi.fn(async () => {});

    const errors = await executeKickoffMutationRollback({
      transcriptBackup: "backup",
      transcriptPath: "/tmp/transcript.ndjson",
      taskArtifactPath: "/tmp/task.md",
      previousTaskArtifact: "previous task",
      bubbleTomlPath: "/tmp/bubble.toml",
      previousBubbleToml: "previous toml",
      statePath: "/tmp/state.json",
      previousState: baseState,
      writtenStateFingerprint: "fp_01",
      writeFile,
      writeState
    });

    expect(errors).toEqual([]);
    expect(writeFile).toHaveBeenCalledTimes(3);
    expect(writeState).toHaveBeenCalledTimes(1);
  });

  it("collects rollback failures with deterministic error labels", async () => {
    const writeFile = vi.fn(
      async (path: string) => {
        if (path === "/tmp/transcript.ndjson") {
          throw new Error("transcript-fail");
        }
        if (path === "/tmp/task.md") {
          throw new Error("task-fail");
        }
      }
    );
    const writeState = vi.fn(async () => {
      throw new Error("state-fail");
    });

    const errors = await executeKickoffMutationRollback({
      transcriptBackup: "backup",
      transcriptPath: "/tmp/transcript.ndjson",
      taskArtifactPath: "/tmp/task.md",
      previousTaskArtifact: "previous task",
      bubbleTomlPath: "/tmp/bubble.toml",
      previousBubbleToml: "previous toml",
      statePath: "/tmp/state.json",
      previousState: baseState,
      writtenStateFingerprint: "fp_02",
      writeFile,
      writeState
    });

    expect(errors).toEqual([
      "transcript rollback failed: transcript-fail",
      "task artifact rollback failed: task-fail",
      "state rollback failed: state-fail"
    ]);
  });
});
