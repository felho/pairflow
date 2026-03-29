import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createInitialBubbleState } from "../../../src/core/state/initialState.js";
import {
  StateStoreConflictError,
  createStateSnapshot,
  inspectStateSnapshot,
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

  it("returns inspectable diagnostics for legacy META_REVIEW_RUNNING state without execution_context", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_legacy_meta_01",
        state: "META_REVIEW_RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-08T10:00:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: "2026-03-08T10:01:00.000Z",
        meta_review: {
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
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);
    expect(inspected.state.state).toBe("META_REVIEW_RUNNING");
    expect(inspected.stateValidation?.errors).toEqual([
      {
        path: "meta_review.execution_context",
        message:
          "META_REVIEW_RUNNING state requires canonical meta_review.execution_context authority"
      }
    ]);

    await expect(readStateSnapshot(statePath)).rejects.toThrow("Invalid bubble state");
  });
});
