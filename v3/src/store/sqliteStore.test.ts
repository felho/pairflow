import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import type { EventEnvelope, WorkflowInstance } from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createControlledClock } from "../testkit/index.js";
import { openStore } from "./sqliteStore.js";

const instance: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "build it",
  binding: { implementer: "codex", reviewer: "claude" },
  currentStep: "implement",
  round: 1,
  status: "RUNNING",
  version: 1,
};

function envelope(opId: string, expectedVersion: number): EventEnvelope {
  return {
    instanceId: "inst-1",
    opId,
    type: "PASS",
    actorId: "codex",
    expectedVersion,
    payload: { ref: "diff-1" },
  };
}

// All fixture envelopes share type+payload → one digest serves them all;
// the collision tests below derive DIFFERING digests explicitly.
const DIGEST = deriveEmitDigest(envelope("a1", 1));

const dirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-store-"));
  dirs.push(dir);
  return join(dir, "store.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("commitTransition — atomic transition commit (l0a invariant)", () => {
  it("commits transcript row + instance update as one unit", async () => {
    const clock = createControlledClock(1000);
    const handle = openStore(":memory:", clock);
    await handle.store.createInstance(instance);

    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });

    expect(result).toEqual({ kind: "committed", version: 2 });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.instance.version).toBe(2);
    expect(detail?.instance.currentStep).toBe("review");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.transcript[0]?.seq).toBe(1);
    expect(detail?.transcript[0]?.envelope).toEqual(envelope("a1", 1));
    handle.close();
  });

  it("a CAS conflict writes NOTHING — no transcript row survives the rollback", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);

    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 7,
      envelope: envelope("b2", 7),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });

    expect(result).toEqual({ kind: "cas_conflict" });
    expect(await handle.store.findOp("inst-1", "b2")).toBeNull();
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.instance.version).toBe(1);
    handle.close();
  });

  it("duplicate beats CAS: a retransmission AFTER the version advanced reports duplicate_op", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      newCurrentStep: "implement",
      newRound: 2,
      newStatus: "RUNNING",
    });

    // op a1 retransmitted with its (now stale) original expectation:
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    expect(result).toEqual({ kind: "duplicate_op" });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(2);
    handle.close();
  });

  it("seq is 1-based and increments per instance", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    for (const [i, opId] of ["a1", "b2", "c3"].entries()) {
      await handle.store.commitTransition({
        instanceId: "inst-1",
        expectedVersion: i + 1,
        envelope: envelope(opId, i + 1),
        payloadDigest: DIGEST,
        newCurrentStep: "review",
        newRound: 1,
        newStatus: "RUNNING",
      });
    }
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((entry) => entry.seq)).toEqual([1, 2, 3]);
    handle.close();
  });

  it("createInstance on an existing id throws a store-integrity error", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await expect(handle.store.createInstance(instance)).rejects.toThrow(/already exists/);
    handle.close();
  });
});

describe("CHK-A1-SCHEMA — the uniqueness constraint lives in the database", () => {
  it("a raw-SQL duplicate (instance_id, op_id) bypassing the port fails at the DB level", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    handle.close();

    const raw = new DatabaseSync(path);
    expect(() =>
      raw
        .prepare(
          // payload_digest supplied: the red must be the UNIQUE
          // constraint, never the NOT NULL (P4 build watchpoint).
          "INSERT INTO transcript (instance_id, seq, op_id, envelope, payload_digest, committed_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run("inst-1", 99, "a1", "{}", "d", 0),
    ).toThrow(/UNIQUE/);
    raw.close();
  });
});

describe("CHK-C-TS-SOURCE — timestamps come from the injected TimeSource", () => {
  it("stamps created_at / committed_at with exactly the frozen clock value", async () => {
    const clock = createControlledClock(1_000);
    const handle = openStore(":memory:", clock);
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    clock.advance(500);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      newCurrentStep: "implement",
      newRound: 2,
      newStatus: "RUNNING",
    });

    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((entry) => entry.committedAt)).toEqual([1_000, 1_500]);
    handle.close();
  });
});

describe("store-open — fail-closed marker (ADR-003)", () => {
  it("fresh database: initializes schema, writes the marker, reopen preserves data", async () => {
    const path = tempDbPath();
    const first = openStore(path, createControlledClock(0));
    await first.store.createInstance(instance);
    first.close();

    const second = openStore(path, createControlledClock(0));
    expect(await second.store.loadInstance("inst-1")).not.toBeNull();
    second.close();
  });

  it("tables present but marker missing → refuses to open", () => {
    const path = tempDbPath();
    const raw = new DatabaseSync(path);
    raw.exec("CREATE TABLE something (a INTEGER)");
    raw.close();
    expect(() => openStore(path, createControlledClock(0))).toThrow(/fail closed|refus/i);
  });

  it("non-prototype marker → refuses to open, never wipes", async () => {
    const path = tempDbPath();
    const first = openStore(path, createControlledClock(0));
    await first.store.createInstance(instance);
    first.close();

    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE meta SET value = 'false' WHERE key = 'prototype'").run();
    raw.close();

    expect(() => openStore(path, createControlledClock(0))).toThrow(/fail closed|refus/i);
    const check = new DatabaseSync(path);
    const row = check.prepare("SELECT COUNT(*) AS n FROM instances").get() as { n: number };
    expect(row.n).toBe(1);
    check.close();
  });

  it("prototype marker with a DIFFERENT schema version → wipe-and-recreate (the fenced dev path)", async () => {
    const path = tempDbPath();
    const first = openStore(path, createControlledClock(0));
    await first.store.createInstance(instance);
    first.close();

    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE meta SET value = '0' WHERE key = 'schema_version'").run();
    raw.close();

    const second = openStore(path, createControlledClock(0));
    expect(await second.store.listInstances()).toEqual([]);
    second.close();
  });
});

describe("op_id_collision — the digest-aware idempotency rung (packet ch5-P4)", () => {
  function differingEnvelope(opId: string, expectedVersion: number): EventEnvelope {
    return { ...envelope(opId, expectedVersion), payload: { ref: "SOMETHING-ELSE" } };
  }

  it("an existing op with a DIFFERING digest → op_id_collision, nothing written", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });

    const collided = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: differingEnvelope("a1", 2),
      payloadDigest: deriveEmitDigest(differingEnvelope("a1", 2)),
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    expect(collided).toEqual({ kind: "op_id_collision" });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.instance.version).toBe(2);
    handle.close();
  });

  it("collision beats CAS: a differing digest under an ADVANCED version → op_id_collision, never cas_conflict", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      newCurrentStep: "implement",
      newRound: 2,
      newStatus: "RUNNING",
    });

    const collided = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1, // stale on purpose — the rung must answer first
      envelope: differingEnvelope("a1", 1),
      payloadDigest: deriveEmitDigest(differingEnvelope("a1", 1)),
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    expect(collided).toEqual({ kind: "op_id_collision" });
    handle.close();
  });

  it("committed rows carry their digest; findOp reads the same stored value", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      newCurrentStep: "review",
      newRound: 1,
      newStatus: "RUNNING",
    });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript[0]?.payloadDigest).toBe(DIGEST);
    expect(await handle.store.findOp("inst-1", "a1")).toEqual({ payloadDigest: DIGEST });
    handle.close();
  });
});

describe("schema v1 → v2 — the first LIVE fenced wipe (packet ch5-P4, ADR-003)", () => {
  it("a known PROTOTYPE store at marker '1' wipes on open and re-marks as '2'", async () => {
    const path = tempDbPath();
    const first = openStore(path, createControlledClock(0));
    await first.store.createInstance(instance);
    first.close();

    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE meta SET value = '1' WHERE key = 'schema_version'").run();
    raw.close();

    const second = openStore(path, createControlledClock(0));
    expect(await second.store.listInstances()).toEqual([]);
    second.close();

    const check = new DatabaseSync(path);
    const marker = check
      .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
      .get() as { value: string };
    expect(marker.value).toBe("2");
    check.close();
  });
});
