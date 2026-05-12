import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildRunningExecutionContext } from "../../../../src/v11/domain/state/execution/executionContext.js";
import { createInitialBubbleState } from "../../../../src/v11/domain/state/initialState.js";
import { buildBubbleStateSnapshotVariant } from "../../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../src/v11/domain/state/snapshot/projection.js";
import {
  createDomainStateSnapshot,
  readDomainStateSnapshot,
  readStateSnapshot,
  writeDomainStateSnapshot
} from "../../../../src/v11/infrastructure/state/stateStore.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-v11-state-store-domain-"));
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

describe("v11 infrastructure state store — variant boundary", () => {
  it("createDomainStateSnapshot persists the persisted shape and returns the variant", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");
    const initial = buildBubbleStateSnapshotVariant(
      createInitialBubbleState("b_v11_domain_store_01")
    );

    const created = await createDomainStateSnapshot(statePath, initial);

    expect(created.state.kind).toBe("inactive_initial");
    expect(created.state.bubble_id).toBe("b_v11_domain_store_01");

    // The on-disk JSON must be the persisted shape — no domain-only `kind` field.
    const onDisk = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;
    expect(Object.hasOwn(onDisk, "kind")).toBe(false);
    expect(onDisk.state).toBe("CREATED");
  });

  it("readDomainStateSnapshot returns the variant union with kind discriminator", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");
    await createDomainStateSnapshot(
      statePath,
      buildBubbleStateSnapshotVariant(createInitialBubbleState("b_v11_domain_store_02"))
    );

    const loaded = await readDomainStateSnapshot(statePath);

    expect(loaded.state.kind).toBe("inactive_initial");
    if (loaded.state.kind === "inactive_initial") {
      expect(loaded.state.active_agent).toBeNull();
      expect(loaded.state.active_role).toBeNull();
      expect(loaded.state.execution_context).toBeNull();
    }
  });

  it("writeDomainStateSnapshot round-trips a running variant via the projection", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const initial = buildBubbleStateSnapshotVariant(
      createInitialBubbleState("b_v11_domain_store_03")
    );
    const initialLoaded = await createDomainStateSnapshot(statePath, initial);

    const startedAt = "2026-05-12T10:00:00.000Z";
    const runningPersisted = {
      ...toPersistedSnapshot(initial),
      state: "RUNNING" as const,
      round: 1,
      active_agent: "codex" as const,
      active_role: "implementer" as const,
      active_since: startedAt,
      last_command_at: startedAt,
      execution_context: buildRunningExecutionContext({
        bubbleId: "b_v11_domain_store_03",
        round: 1,
        activeRole: "implementer",
        startedAt,
        watchdogTimeoutMinutes: 30
      }),
      round_role_history: [
        {
          round: 1,
          implementer: "codex" as const,
          reviewer: "claude" as const,
          switched_at: startedAt
        }
      ]
    };
    const runningVariant = buildBubbleStateSnapshotVariant(runningPersisted);

    const written = await writeDomainStateSnapshot(statePath, runningVariant, {
      expectedFingerprint: initialLoaded.fingerprint,
      expectedState: "CREATED"
    });

    expect(written.state.kind).toBe("running_standard");
    if (written.state.kind === "running_standard") {
      expect(written.state.active_agent).toBe("codex");
      expect(written.state.active_role).toBe("implementer");
      expect(written.state.execution_context.active_role).toBe("implementer");
    }

    // Re-read with the persisted-shape API to confirm wire format stability.
    const reloadedPersisted = await readStateSnapshot(statePath);
    expect(Object.hasOwn(reloadedPersisted.state, "kind")).toBe(false);
    expect(reloadedPersisted.fingerprint).toBe(written.fingerprint);
  });

  it("writeDomainStateSnapshot fingerprint matches the persisted-shape fingerprint", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const initial = buildBubbleStateSnapshotVariant(
      createInitialBubbleState("b_v11_domain_store_04")
    );

    const writtenViaDomain = await createDomainStateSnapshot(statePath, initial);
    const readViaPersisted = await readStateSnapshot(statePath);

    // Fingerprints must agree: variant write → persisted read sees the same hash,
    // because the on-disk JSON is the persisted shape both ways.
    expect(writtenViaDomain.fingerprint).toBe(readViaPersisted.fingerprint);
  });
});
