import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createInitialBubbleState } from "../../../../src/v11/domain/state/initialState.js";
import {
  StateStoreConflictError,
  createStateSnapshot,
  inspectStateSnapshot,
  readStateSnapshot,
  writeStateSnapshot
} from "../../../../src/v11/infrastructure/state/stateStore.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-v11-state-store-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("v11 infrastructure state store", () => {
  it("creates and reads state snapshots with a stable fingerprint", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_v11_state_store_01")
    );
    const loaded = await readStateSnapshot(statePath);

    expect(loaded.state.bubble_id).toBe("b_v11_state_store_01");
    expect(loaded.fingerprint).toBe(created.fingerprint);
  });

  it("keeps inspect fallback diagnostics on invalid persisted snapshots", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_v11_state_store_02",
        state: "RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-04-06T10:00:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: "2026-04-06T10:01:00.000Z",
        meta_review: {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);

    expect(inspected.state.state).toBe("RUNNING");
    expect(inspected.stateValidation?.errors).toEqual([
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority"
      }
    ]);
  });

  it("rejects stale writes with the canonical v11 conflict error", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_v11_state_store_03")
    );

    await writeStateSnapshot(
      statePath,
      {
        ...created.state,
        state: "PREPARING_WORKSPACE"
      },
      {
        expectedFingerprint: created.fingerprint
      }
    );

    await expect(
      writeStateSnapshot(
        statePath,
        {
          ...created.state,
          state: "CANCELLED"
        },
        {
          expectedFingerprint: created.fingerprint
        }
      )
    ).rejects.toBeInstanceOf(StateStoreConflictError);
  });
});
