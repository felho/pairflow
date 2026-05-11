import { describe, expect, it, vi } from "vitest";

import { StateStoreConflictError } from "../../../../src/v11/infrastructure/state/stateStore.js";
import type { PersistedBubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { persistKickoffState } from "../../../../src/v11/application/kickoff/internal/mutation/kickoffStatePersistence.js";

function createState(round: number): PersistedBubbleStateSnapshot {
  return {
    bubble_id: "b_kickoff_state_persistence_01",
    state: "RUNNING",
    round,
    active_agent: round === 0 ? "claude" : "codex",
    active_since: "2026-03-19T22:00:00.000Z",
    active_role: round === 0 ? "reviewer" : "implementer",
    round_role_history: [],
    last_command_at: "2026-03-19T22:00:00.000Z"
  };
}

describe("persistKickoffState", () => {
  it("returns conflict when latest state fingerprint changed", async () => {
    const readState = vi.fn(async () => ({
      state: createState(0),
      fingerprint: "new-fingerprint"
    }));
    const writeState = vi.fn(async () => ({
      state: createState(1),
      fingerprint: "written-fingerprint"
    }));

    const result = await persistKickoffState({
      statePath: "/tmp/state.json",
      loadedFingerprint: "old-fingerprint",
      nextState: createState(1),
      readState,
      writeState
    });

    expect(result).toEqual({
      kind: "conflict"
    });
    expect(writeState).not.toHaveBeenCalled();
  });

  it("returns conflict when write detects concurrent update", async () => {
    const readState = vi.fn(async () => ({
      state: createState(0),
      fingerprint: "same-fingerprint"
    }));
    const writeState = vi.fn(async () => {
      throw new StateStoreConflictError("conflict");
    });

    const result = await persistKickoffState({
      statePath: "/tmp/state.json",
      loadedFingerprint: "same-fingerprint",
      nextState: createState(1),
      readState,
      writeState
    });

    expect(result).toEqual({
      kind: "conflict"
    });
  });

  it("returns written state when persisted successfully", async () => {
    const readState = vi.fn(async () => ({
      state: createState(0),
      fingerprint: "same-fingerprint"
    }));
    const writeState = vi.fn(async () => ({
      state: createState(1),
      fingerprint: "written-fingerprint"
    }));

    const result = await persistKickoffState({
      statePath: "/tmp/state.json",
      loadedFingerprint: "same-fingerprint",
      nextState: createState(1),
      readState,
      writeState
    });

    expect(result).toEqual({
      kind: "success",
      writtenState: {
        state: createState(1),
        fingerprint: "written-fingerprint"
      }
    });
  });
});
