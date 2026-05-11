import { describe, expect, it, vi } from "vitest";

import { StateStoreConflictError } from "../../../../src/v11/infrastructure/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/domain/state/bubbleStateSnapshotTypes.js";
import { writeKickoffState } from "../../../../src/v11/application/kickoff/internal/mutation/kickoffStateWrite.js";

function createState(round: number): BubbleStateSnapshot {
  return {
    bubble_id: "b_kickoff_state_write_01",
    state: "RUNNING",
    round,
    active_agent: round === 0 ? "claude" : "codex",
    active_since: "2026-03-19T22:00:00.000Z",
    active_role: round === 0 ? "reviewer" : "implementer",
    round_role_history: [],
    last_command_at: "2026-03-19T22:00:00.000Z"
  };
}

describe("writeKickoffState", () => {
  it("returns success result when state write succeeds", async () => {
    const writeState = vi.fn(async () => ({
      fingerprint: "next-fingerprint",
      state: createState(1)
    }));

    const result = await writeKickoffState({
      statePath: "/tmp/state.json",
      nextState: createState(1),
      expectedFingerprint: "prev-fingerprint",
      writeState
    });

    expect(result).toEqual({
      kind: "success",
      writtenState: {
        fingerprint: "next-fingerprint",
        state: createState(1)
      }
    });
  });

  it("returns conflict result when write hits StateStoreConflictError", async () => {
    const writeState = vi.fn(async () => {
      throw new StateStoreConflictError("conflict");
    });

    const result = await writeKickoffState({
      statePath: "/tmp/state.json",
      nextState: createState(1),
      expectedFingerprint: "prev-fingerprint",
      writeState
    });

    expect(result).toEqual({
      kind: "conflict"
    });
  });

  it("rethrows non-conflict errors", async () => {
    const writeState = vi.fn(async () => {
      throw new Error("io failed");
    });

    await expect(
      writeKickoffState({
        statePath: "/tmp/state.json",
        nextState: createState(1),
        expectedFingerprint: "prev-fingerprint",
        writeState
      })
    ).rejects.toThrow("io failed");
  });
});
