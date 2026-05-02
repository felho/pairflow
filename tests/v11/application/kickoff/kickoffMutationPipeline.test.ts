import { describe, expect, it, vi } from "vitest";

import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";
import { executeKickoffMutationPipeline } from "../../../../src/v11/application/kickoff/kickoffMutationPipeline.js";

function createState(round: number): BubbleStateSnapshot {
  return {
    bubble_id: "b_kickoff_pipeline_01",
    state: "RUNNING",
    round,
    active_agent: round === 0 ? "claude" : "codex",
    active_since: "2026-03-19T22:00:00.000Z",
    active_role: round === 0 ? "reviewer" : "implementer",
    round_role_history: [],
    last_command_at: "2026-03-19T22:00:00.000Z"
  };
}

function createInput() {
  return {
    persistenceFailureCode: "IDEATION_KICKOFF_PERSISTENCE_FAILED",
    bubbleId: "b_kickoff_pipeline_01",
    implementer: "codex" as const,
    task: {
      content: "Implement pipeline seam",
      source: "inline" as const
    },
    taskArtifactPath: "/tmp/task.md",
    bubbleTomlPath: "/tmp/bubble.toml",
    nextBubbleToml: "next-toml",
    previousBubbleToml: "prev-toml",
    previousTaskArtifact: "prev-task-artifact",
    transcriptPath: "/tmp/transcript.ndjson",
    locksDir: "/tmp/locks",
    now: new Date("2026-03-19T22:00:00.000Z"),
    statePath: "/tmp/state.json",
    previousState: createState(0),
    writtenStateFingerprint: "written-fingerprint",
    writeFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => "transcript-backup"),
    appendEnvelope: vi.fn(async () => {}),
    writeState: vi.fn(async () => ({
      fingerprint: "rollback-fingerprint",
      state: createState(0)
    }))
  };
}

describe("executeKickoffMutationPipeline", () => {
  it("returns success when mutation succeeds", async () => {
    const input = createInput();
    const executeMutation = vi.fn(async () => "transcript-backup");
    const executeRollback = vi.fn(async () => []);

    const result = await executeKickoffMutationPipeline(input, {
      executeMutation,
      executeRollback
    });

    expect(result).toEqual({
      kind: "success"
    });
    expect(executeRollback).not.toHaveBeenCalled();
  });

  it("returns rollback-success result when mutation fails but rollback succeeds", async () => {
    const input = createInput();
    const executeMutation = vi.fn(async () => {
      throw new Error("mutation failed");
    });
    const executeRollback = vi.fn(async () => []);

    const result = await executeKickoffMutationPipeline(input, {
      executeMutation,
      executeRollback
    });

    expect(result).toEqual({
      kind: "mutation_failed_rolled_back"
    });
    expect(executeRollback).toHaveBeenCalledTimes(1);
  });

  it("throws persistence failure error when rollback also fails", async () => {
    const input = createInput();
    const executeMutation = vi.fn(async () => {
      throw new Error("mutation failed");
    });
    const executeRollback = vi.fn(async () => ["state rollback failed"]);

    await expect(
      executeKickoffMutationPipeline(input, {
        executeMutation,
        executeRollback
      })
    ).rejects.toThrow(
      "IDEATION_KICKOFF_PERSISTENCE_FAILED: mutation failed (mutation failed) and rollback failed (state rollback failed)."
    );
  });
});
