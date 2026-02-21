import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createInitialBubbleState } from "../../../src/core/state/initialState.js";
import {
  StateStoreConflictError,
  createStateSnapshot,
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-state-store-"));
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

describe("state store", () => {
  it("creates and reads state snapshot with fingerprint", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_01")
    );
    const loaded = await readStateSnapshot(statePath);

    expect(loaded.state.bubble_id).toBe("b_store_01");
    expect(loaded.fingerprint).toBe(created.fingerprint);
  });

  it("writes snapshot when expected fingerprint matches", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_02")
    );

    const next = {
      ...created.state,
      state: "PREPARING_WORKSPACE" as const
    };
    const written = await writeStateSnapshot(statePath, next, {
      expectedFingerprint: created.fingerprint,
      expectedState: "CREATED"
    });

    expect(written.state.state).toBe("PREPARING_WORKSPACE");
    expect(written.fingerprint).not.toBe(created.fingerprint);
  });

  it("rejects writes on stale fingerprint", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_03")
    );

    const newer = {
      ...created.state,
      state: "PREPARING_WORKSPACE" as const
    };
    await writeStateSnapshot(statePath, newer, {
      expectedFingerprint: created.fingerprint
    });

    const staleAttempt = {
      ...created.state,
      state: "CANCELLED" as const
    };

    await expect(
      writeStateSnapshot(statePath, staleAttempt, {
        expectedFingerprint: created.fingerprint
      })
    ).rejects.toBeInstanceOf(StateStoreConflictError);
  });

  it("rejects writes when state lock cannot be acquired in time", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_04")
    );

    await writeFile(`${statePath}.lock`, "locked", "utf8");

    await expect(
      writeStateSnapshot(
        statePath,
        {
          ...created.state,
          state: "PREPARING_WORKSPACE"
        },
        {
          expectedFingerprint: created.fingerprint,
          lockTimeoutMs: 20
        }
      )
    ).rejects.toBeInstanceOf(StateStoreConflictError);
  });
});
