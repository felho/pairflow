import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  DecisionRequestBody,
  TranscriptEntry,
  TransitionEntry,
  WorkflowInstance,
} from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createControlledClock } from "../testkit/index.js";
import { openStore } from "./sqliteStore.js";
import type { StoreHandle } from "./sqliteStore.js";
import type { ArrivalEffect, ArrivalEffectFields } from "../ports/store.js";

/**
 * K1 (packet ch14-p2a): the arrival effect is BRANDED, and its only
 * sanctioned producer is `applyTargetEntryEffects` — that is what makes
 * "the object the store receives is the object the arrival returned" a
 * property the TYPE carries rather than a lane's aspiration.
 *
 * A fixture is not a caller on that path. This file authors effects
 * directly to drive rules on either side of the port, the same class as
 * the deliberately-loose builders that author admission-negative input.
 * The seal lives here ONCE and named, so the bypass is visible instead
 * of sprinkled through the suite.
 */
const arrivalFixture = (fields: ArrivalEffectFields): ArrivalEffect => fields as ArrivalEffect;


// ch12-p1b: transcript reads are now the discriminated union
// TransitionEntry | LifecycleFactEntry. These commitTransition-only
// lanes read transition rows exclusively — narrow (throwing on any
// other class, so the assertion never silently weakens to a fact row).
function asTransition(entry: TranscriptEntry | undefined): TransitionEntry {
  if (entry?.entryKind !== "transition") {
    throw new Error(`expected a transition entry, got ${String(entry?.entryKind)}`);
  }
  return entry;
}

const instance: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "build it",
  binding: { implementer: "codex", reviewer: "claude" },
  currentStep: "implement",
  round: 1,
  kernelStatus: "ACTIVE",
  terminalDisposition: null,
  activationMode: "immediate",
  wait: null,
  runtimeContext: { state: "ready", ref: null },
  failureReason: null,
  runOverrides: {},
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });

    expect(result).toEqual({ kind: "committed", version: 2 });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.instance.version).toBe(2);
    expect(detail?.instance.currentStep).toBe("review");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.transcript[0]?.seq).toBe(1);
    expect(asTransition(detail?.transcript[0]).envelope).toEqual(envelope("a1", 1));
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "implement",
        newRound: 2,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });

    // op a1 retransmitted with its (now stale) original expectation:
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
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
        gateDecisions: [],
        arrival: arrivalFixture({
          newCurrentStep: "review",
          newRound: 1,
          newKernelStatus: "ACTIVE",
          newTerminalDisposition: null,
          newWait: null,
          issuedAgentConfig: {},
        }),
      });
    }
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((entry) => entry.seq)).toEqual([1, 2, 3]);
    handle.close();
  });

  it("build-close aftermath (ch12-p1a): a fault BETWEEN the instances UPDATE and the transcript INSERT rolls back BOTH halves", async () => {
    // The atomicity lane made ABLE TO FAIL: a persistent SQLite trigger
    // (visible to the store's own connection) aborts the transcript
    // INSERT — i.e. fires AFTER the instances UPDATE already ran inside
    // the same transaction. A non-transactional commit path would leave
    // the advanced instances row behind; the rollback must take BOTH
    // halves back.
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);

    const raw = new DatabaseSync(path);
    raw.exec(
      "CREATE TRIGGER fault_split_txn BEFORE INSERT ON transcript BEGIN SELECT RAISE(ABORT, 'fault: split transaction'); END",
    );
    raw.close();

    await expect(
      handle.store.commitTransition({
        instanceId: "inst-1",
        expectedVersion: 1,
        envelope: envelope("a1", 1),
        payloadDigest: DIGEST,
        gateDecisions: [],
        arrival: arrivalFixture({
          newCurrentStep: "review",
          newRound: 1,
          newKernelStatus: "ACTIVE",
          newTerminalDisposition: null,
          newWait: null,
          issuedAgentConfig: {},
        }),
      }),
    ).rejects.toThrow(/fault: split transaction/);

    // BOTH halves rolled back: the instances row did NOT advance…
    const check = new DatabaseSync(path);
    const row = check
      .prepare("SELECT version, current_step FROM instances WHERE instance_id = 'inst-1'")
      .get() as { version: number; current_step: string };
    expect(row.version).toBe(1);
    expect(row.current_step).toBe("implement");
    // …and no transcript row survived.
    const count = check.prepare("SELECT COUNT(*) AS n FROM transcript").get() as { n: number };
    expect(count.n).toBe(0);
    check.exec("DROP TRIGGER fault_split_txn");
    check.close();

    // No transaction leaked either: with the fault removed, the SAME
    // commit goes through cleanly on the same handle.
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    expect(result).toEqual({ kind: "committed", version: 2 });
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    handle.close();

    const raw = new DatabaseSync(path);
    expect(() =>
      raw
        .prepare(
          // payload_digest AND gate_decisions supplied: the red must be
          // the UNIQUE constraint, never a NOT NULL (P4/P2b watchpoint).
          "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run("inst-1", 99, "a1", "transition", "{}", "d", "[]", 0),
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    clock.advance(500);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "implement",
        newRound: 2,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });

    const collided = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: differingEnvelope("a1", 2),
      payloadDigest: deriveEmitDigest(differingEnvelope("a1", 2)),
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "implement",
        newRound: 2,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });

    const collided = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1, // stale on purpose — the rung must answer first
      envelope: differingEnvelope("a1", 1),
      payloadDigest: deriveEmitDigest(differingEnvelope("a1", 1)),
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
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
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(asTransition(detail?.transcript[0]).payloadDigest).toBe(DIGEST);
    expect(await handle.store.findOp("inst-1", "a1")).toEqual({
      payloadDigest: DIGEST,
      entryKind: "transition",
    });
    handle.close();
  });
});

describe("schema → v6 — the ch14 transcript-class bump rides the SAME fenced wipe (packet ch14-p2a, K8; ADR-003)", () => {
  it("a known PROTOTYPE store at marker '4' wipes on open and re-marks as '6'", async () => {
    const path = tempDbPath();
    const first = openStore(path, createControlledClock(0));
    await first.store.createInstance(instance);
    first.close();

    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE meta SET value = '4' WHERE key = 'schema_version'").run();
    raw.close();

    const second = openStore(path, createControlledClock(0));
    expect(await second.store.listInstances()).toEqual([]);
    second.close();

    const check = new DatabaseSync(path);
    const marker = check
      .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
      .get() as { value: string };
    expect(marker.value).toBe("6");
    check.close();
  });

  it("an incomplete marker (schema_version present, prototype missing) refuses at v5", () => {
    const path = tempDbPath();
    const first = openStore(path, createControlledClock(0));
    first.close();
    const raw = new DatabaseSync(path);
    raw.prepare("DELETE FROM meta WHERE key = 'prototype'").run();
    raw.close();
    expect(() => openStore(path, createControlledClock(0))).toThrow(/fail closed|incomplete|refus/i);
  });
});

describe("runtime_context — the discriminated-state column (packet ch12-p1a, S7/X1)", () => {
  it("ready(∅): the WHOLE instance round-trips deep-equal across every read surface", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const created: WorkflowInstance = { ...instance, runtimeContext: { state: "ready", ref: null } };
    await handle.store.createInstance(created);
    // FULL deep-equality (not just the runtimeContext field): the whole read
    // value equals the created value on ALL THREE reads — a mapper divergence
    // in ANY field turns this red.
    expect(await handle.store.loadInstance("inst-1")).toEqual(created);
    expect((await handle.store.listInstances())[0]).toEqual(created);
    expect((await handle.store.getInstanceDetail("inst-1"))?.instance).toEqual(created);
  });

  it("ready(worktree ref): the WHOLE instance round-trips deep-equal across every read surface", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const created: WorkflowInstance = {
      ...instance,
      runtimeContext: { state: "ready", ref: { kind: "worktree", locator: "/ws/abc-123" } },
    };
    await handle.store.createInstance(created);
    expect(await handle.store.loadInstance("inst-1")).toEqual(created);
    expect((await handle.store.listInstances())[0]).toEqual(created);
    expect((await handle.store.getInstanceDetail("inst-1"))?.instance).toEqual(created);
  });

  it("stored BYTES are canonical (sorted keys, strict — the emit-lib culture)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance({ ...instance, runtimeContext: { state: "ready", ref: null } });
    await handle.store.createInstance({
      ...instance,
      instanceId: "inst-2",
      runtimeContext: { state: "ready", ref: { kind: "worktree", locator: "/ws/x" } },
    });
    handle.close();
    const raw = new DatabaseSync(path);
    const rows = raw
      .prepare("SELECT instance_id, runtime_context, wait, failure_reason, run_overrides FROM instances ORDER BY instance_id")
      .all() as { instance_id: string; runtime_context: string; wait: string | null; failure_reason: string | null; run_overrides: string }[];
    // ready(∅) — the ∅ encoding stores `ref: null` (S7); sorted keys.
    expect(rows[0]?.runtime_context).toBe('{"ref":null,"state":"ready"}');
    // ready(ref) — the transitional worktree bridge (X1); sorted keys.
    expect(rows[1]?.runtime_context).toBe('{"ref":{"kind":"worktree","locator":"/ws/x"},"state":"ready"}');
    // S5/S6/S8 always-NULL / constant lanes at P1a.
    expect(rows[0]?.wait).toBeNull();
    expect(rows[0]?.failure_reason).toBeNull();
    expect(rows[0]?.run_overrides).toBe("{}");
    raw.close();
  });
});

describe("getTimeline — the ch6-P1 cursor read", () => {
  async function seeded() {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    for (const [opId, version] of [
      ["a1", 1],
      ["b2", 2],
      ["c3", 3],
    ] as const) {
      const result = await handle.store.commitTransition({
        instanceId: "inst-1",
        expectedVersion: version,
        envelope: envelope(opId, version),
        payloadDigest: DIGEST,
        gateDecisions: [],
        arrival: arrivalFixture({
          newCurrentStep: "review",
          newRound: 1,
          newKernelStatus: "ACTIVE",
          newTerminalDisposition: null,
          newWait: null,
          issuedAgentConfig: {},
        }),
      });
      expect(result.kind).toBe("committed");
    }
    return handle;
  }

  it("dims 1+2 — cursor semantics, seq-ascending always", async () => {
    const handle = await seeded();
    const full = await handle.store.getTimeline("inst-1", 0);
    expect(full?.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(full?.map((r) => asTransition(r).envelope.opId)).toEqual(["a1", "b2", "c3"]);
    const suffix = await handle.store.getTimeline("inst-1", 2);
    expect(suffix?.map((r) => r.seq)).toEqual([3]);
    // Exact-last-seq and beyond-end are both VALID and empty — never null.
    expect(await handle.store.getTimeline("inst-1", 3)).toEqual([]);
    expect(await handle.store.getTimeline("inst-1", 999)).toEqual([]);
    expect(await handle.store.getTimeline("inst-1", Number.MAX_SAFE_INTEGER)).toEqual([]);
    handle.close();
  });

  it("dim 3 — unknown = null, known-but-empty = []", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    expect(await handle.store.getTimeline("ghost", 0)).toBeNull();
    await handle.store.createInstance(instance);
    expect(await handle.store.getTimeline("inst-1", 0)).toEqual([]);
    handle.close();
  });

  it("dim 5 — rows deep-equal getInstanceDetail's transcript (one surface, two entrypoints)", async () => {
    const handle = await seeded();
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(await handle.store.getTimeline("inst-1", 0)).toEqual(detail?.transcript);
    handle.close();
  });

  it("C2: issued_agent_config projects with its NON-EMPTY value on BOTH read surfaces (each SELECT separately driven)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    const issued = { mode: "builder", approach: "systematic" };
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: issued,
      }),
    });
    const d0 = (await handle.store.getInstanceDetail("inst-1"))?.transcript[0];
    const t0 = (await handle.store.getTimeline("inst-1", 0))?.[0];
    if (d0?.entryKind !== "transition" || t0?.entryKind !== "transition") {
      throw new Error("expected transition rows on both surfaces");
    }
    // Dropping issued_agent_config from EITHER read SELECT reddens its own
    // lane — a non-empty value distinguishes a real projection from a
    // '{}'-defaulting stub.
    expect(d0.issuedAgentConfig).toEqual(issued);
    expect(t0.issuedAgentConfig).toEqual(issued);
    handle.close();
  });

  it("dim 6 — invalid cursors fail closed with RangeError", async () => {
    const handle = await seeded();
    for (const bad of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      await expect(handle.store.getTimeline("inst-1", bad)).rejects.toThrow(RangeError);
    }
    handle.close();
  });

  it("flag 1(b) — `-0` is rejected via Object.is, though `0` is a valid full replay", async () => {
    const handle = await seeded();
    // 0 is the full-replay cursor and MUST be accepted.
    expect((await handle.store.getTimeline("inst-1", 0))?.map((r) => r.seq)).toEqual([1, 2, 3]);
    // -0 is observationally 0 to <, and Number.isSafeInteger(-0) is true,
    // so only the Object.is rung rejects it (the ch7-P2 inherited guard).
    await expect(handle.store.getTimeline("inst-1", -0)).rejects.toThrow(RangeError);
    handle.close();
  });

  it("watchpoint — a rejected invalid cursor opened no transaction", async () => {
    const handle = await seeded();
    await expect(handle.store.getTimeline("inst-1", -1)).rejects.toThrow(RangeError);
    // commitTransition's BEGIN IMMEDIATE would throw "within a
    // transaction" if the rejected call had left one open.
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 4,
      envelope: envelope("d4", 4),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    expect(result).toEqual({ kind: "committed", version: 5 });
    handle.close();
  });

  it("watchpoint — a row-parse error surfaces AND leaves no open transaction", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);

    const raw = new DatabaseSync(path);
    // A class-iff-VALID transition row (issued_agent_config non-null,
    // ch12-p2 C3) whose ENVELOPE is malformed JSON — so the failure under
    // test is the row PARSE (JSON.parse), not the class-iff guard.
    raw
      .prepare(
        "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run("inst-1", 1, "bad", "transition", "not-json", "d", "[]", "{}", 0);
    raw.close();

    await expect(handle.store.getTimeline("inst-1", 0)).rejects.toThrow(SyntaxError);
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("x9", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    expect(result).toEqual({ kind: "committed", version: 2 });
    handle.close();
  });
});

// ── packet ch11-P1 (W6): expectedRole rides the transcript envelope
// JSON verbatim — additive field, no schema change. ──

describe("expectedRole round-trip (packet ch11-P1, W6)", () => {
  it("a role-carrying envelope survives the commit + detail read byte-equal", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const roleEnvelope: EventEnvelope = {
      ...envelope("op-role", 1),
      expectedRole: "implementer",
    };
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: roleEnvelope,
      payloadDigest: "dg-role",
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    expect(result.kind).toBe("committed");
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(asTransition(detail?.transcript[0]).envelope).toEqual(roleEnvelope);
  });
});

// ── packet ch11-P2b (S1–S4): the gate_decisions column ──

describe("gate_decisions — the retained-decision column (packet ch11-P2b, S1–S4)", () => {
  it("the FULL optional-field shape round-trips byte-equal on BOTH read surfaces", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const decisions = [
      { uses: "declarative.threshold", verdict: "allow" as const },
      {
        uses: "pairflow.previous_reviewer_verdict",
        verdict: "warn" as const,
        reason: "needs-followup",
        message: "minor",
        evidenceRefs: ["ev-1", "ev-2"],
      },
    ];
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: decisions,
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    expect(result.kind).toBe("committed");
    // One write, two reads: a mapper divergence between getInstanceDetail
    // and getTimeline fails this deep-equality.
    const detail = await handle.store.getInstanceDetail("inst-1");
    const timeline = await handle.store.getTimeline("inst-1", 0);
    expect(asTransition(detail?.transcript[0]).gateDecisions).toEqual(decisions);
    expect(asTransition(timeline?.[0]).gateDecisions).toEqual(decisions);
    expect(timeline).toEqual(detail?.transcript);
    handle.close();
  });

  it("known-empty: a transition that ran no gates carries gateDecisions [] (never null, never absent)", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(asTransition(detail?.transcript[0]).gateDecisions).toEqual([]);
    handle.close();
  });

  it("METADATA lane: gate_decisions is TEXT (NULLABLE at v5 — the S11 class face) and the table is STRICT", () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    handle.close();

    const raw = new DatabaseSync(path);
    const columns = raw.prepare("PRAGMA table_info(transcript)").all() as {
      name: string;
      type: string;
      notnull: number;
    }[];
    const column = columns.find((c) => c.name === "gate_decisions");
    expect(column).toBeDefined();
    expect(column?.type).toBe("TEXT");
    // v5 (packet ch12-p1a, S11): nullable BY CLASS — a transition row
    // carries it non-null (the mapper refuses otherwise), a fact row
    // (P1b) carries it NULL. The known-empty [] culture is unchanged on
    // the transition side.
    expect(column?.notnull).toBe(0);
    // The table's STRICT flag (a type-loose column would not survive a
    // STRICT declaration byte-for-byte).
    const ddl = raw
      .prepare("SELECT sql FROM sqlite_master WHERE name = 'transcript'")
      .get() as { sql: string };
    expect(ddl.sql).toMatch(/STRICT/);
    raw.close();
  });
});

// ── packet ch12-p1a: THE v5 lifecycle-axis schema (S2–S12) ──

describe("the axis columns — schema shape (packet ch12-p1a, S2–S11)", () => {
  function tableInfo(raw: DatabaseSync, table: string) {
    return raw.prepare(`PRAGMA table_info(${table})`).all() as {
      name: string;
      type: string;
      notnull: number;
    }[];
  }

  it("instances carries the FULL C11 column set with exact nullability; the ch-4 `status` column is GONE (S10)", () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    handle.close();
    const raw = new DatabaseSync(path);
    const columns = tableInfo(raw, "instances");
    const byName = new Map(columns.map((c) => [c.name, c]));
    // The named replacement (S10): no `status` column survives.
    expect(byName.has("status")).toBe(false);
    const expectCol = (name: string, notnull: number) => {
      expect(byName.get(name)?.type, name).toBe("TEXT");
      expect(byName.get(name)?.notnull, name).toBe(notnull);
    };
    expectCol("kernel_status", 1); // S2
    expectCol("terminal_disposition", 0); // S3
    expectCol("activation_mode", 1); // S4
    expectCol("wait", 0); // S5
    expectCol("failure_reason", 0); // S6
    expectCol("runtime_context", 1); // S7 — NOT NULL at v5
    expectCol("run_overrides", 1); // S8
    expectCol("task", 0); // S9 — nullable column, non-null TS (type-staging)
    expectCol("current_step", 0); // S9
    raw.close();
  });

  it("transcript carries the S11 entry-kind face: entry_kind NOT NULL; the three class fields + issued_agent_config NULLABLE", () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    handle.close();
    const raw = new DatabaseSync(path);
    const columns = tableInfo(raw, "transcript");
    const byName = new Map(columns.map((c) => [c.name, c]));
    expect(byName.get("entry_kind")?.notnull).toBe(1);
    expect(byName.get("envelope")?.notnull).toBe(0);
    expect(byName.get("payload_digest")?.notnull).toBe(0);
    expect(byName.get("gate_decisions")?.notnull).toBe(0);
    expect(byName.get("issued_agent_config")?.notnull).toBe(0);
    raw.close();
  });

  it("every committed row is written entry_kind 'transition' with issued_agent_config CANONICAL JSON (C2 — the P2 write shape)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        // Multi-key with UNSORTED input order — so the byte assertion below
        // is SENSITIVE to a `canonicalJson` → `JSON.stringify` regression
        // (which would write '{"zeta":1,"alpha":2}' verbatim).
        issuedAgentConfig: { zeta: 1, alpha: 2 },
      }),
    });
    handle.close();
    const raw = new DatabaseSync(path);
    const row = raw
      .prepare("SELECT entry_kind, issued_agent_config FROM transcript WHERE instance_id = 'inst-1'")
      .get() as { entry_kind: string; issued_agent_config: string | null };
    expect(row.entry_kind).toBe("transition");
    // C2 (packet ch12-p2): the P2 writer lands — canonical JSON with SORTED
    // keys, in place of the P1a NULL. Fact rows keep it NULL by class.
    expect(row.issued_agent_config).toBe('{"alpha":2,"zeta":1}');
    raw.close();
  });

  it("a terminal commit round-trips TERMINAL + 'done'; a non-terminal commit ACTIVE + null (E3, the same transaction)", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    let read = await handle.store.loadInstance("inst-1");
    expect(read?.kernelStatus).toBe("ACTIVE");
    expect(read?.terminalDisposition).toBeNull();
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "done",
        newRound: 1,
        newKernelStatus: "TERMINAL",
        newTerminalDisposition: "done",
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    read = await handle.store.loadInstance("inst-1");
    expect(read?.kernelStatus).toBe("TERMINAL");
    expect(read?.terminalDisposition).toBe("done");
    handle.close();
  });

  it("token-domain refusal at the mapper: out-of-domain stored tokens throw store integrity, never widen (S2/S3/S4)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);

    const stage = (column: string, value: string) => {
      const raw = new DatabaseSync(path);
      raw.prepare(`UPDATE instances SET ${column} = ? WHERE instance_id = 'inst-1'`).run(value);
      raw.close();
    };

    stage("kernel_status", "PAUSED");
    expect(() => handle.store.loadInstance("inst-1")).toThrow(/unknown kernel_status token 'PAUSED'/);
    stage("kernel_status", "TERMINAL");
    stage("terminal_disposition", "abandoned");
    expect(() => handle.store.loadInstance("inst-1")).toThrow(/unknown terminal_disposition token 'abandoned'/);
    stage("terminal_disposition", "done");
    stage("activation_mode", "deferredKickoff"); // the camelCase fork the model tokens forbid
    expect(() => handle.store.loadInstance("inst-1")).toThrow(/unknown activation_mode token 'deferredKickoff'/);
    handle.close();
  });

  it("S11 class iff, read side: a transition row with NULL class fields is refused by the mapper", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    // ch12-p1b RE-BASE: the fact reader HAS landed — a STARTED/CANCELLED/
    // TASK_SUPPLIED row now maps to a LifecycleFactEntry (the transcript
    // mapper returns BOTH classes; the packet owner's fact-reader family
    // exercises that acceptance). What stays load-bearing on THIS lane is
    // the transition-side class iff: a row DECLARED 'transition' but
    // missing its class-required fields (envelope / payload_digest /
    // gate_decisions all NULL) is refused loudly.
    const raw = new DatabaseSync(path);
    raw
      .prepare(
        "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at) VALUES (?, ?, ?, 'transition', NULL, NULL, NULL, NULL, ?)",
      )
      .run("inst-1", 1, "fact-1", 0);
    raw.close();
    await expect(handle.store.getTimeline("inst-1", 0)).rejects.toThrow(/class-required field/);
    handle.close();
  });

  it("S11/C3 class iff: a FACT row carrying a non-null issued_agent_config is refused (transition-only, ch12-p2)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    // A STARTED fact row (the three transition-only columns NULL by class)
    // that ILLEGALLY carries a non-null issued_agent_config — a
    // transition-only field (C10/C12); the mapper refuses it loudly.
    const raw = new DatabaseSync(path);
    raw
      .prepare(
        "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at) VALUES (?, ?, ?, 'STARTED', NULL, NULL, NULL, ?, ?)",
      )
      .run("inst-1", 1, "st-1", "{}", 0);
    raw.close();
    await expect(handle.store.getTimeline("inst-1", 0)).rejects.toThrow(
      /non-null issued_agent_config/,
    );
    handle.close();
  });

  // Build-close aftermath (ch12-p1a): the S11 refusal driven PER
  // CONJUNCT — a real committed transition row with exactly ONE class
  // field nulled, so each conjunct of the `||` is proven load-bearing
  // alone (the all-three fixture above could green with a single-field
  // check).
  for (const column of ["envelope", "payload_digest", "gate_decisions", "issued_agent_config"] as const) {
    it(`S11 class iff, single conjunct: a transition row with ONLY ${column} NULL is refused`, async () => {
      const path = tempDbPath();
      const handle = openStore(path, createControlledClock(0));
      await handle.store.createInstance(instance);
      const committed = await handle.store.commitTransition({
        instanceId: "inst-1",
        expectedVersion: 1,
        envelope: envelope("a1", 1),
        payloadDigest: DIGEST,
        gateDecisions: [],
        arrival: arrivalFixture({
          newCurrentStep: "review",
          newRound: 1,
          newKernelStatus: "ACTIVE",
          newTerminalDisposition: null,
          newWait: null,
          issuedAgentConfig: {},
        }),
      });
      expect(committed.kind).toBe("committed");
      const raw = new DatabaseSync(path);
      raw.prepare(`UPDATE transcript SET ${column} = NULL WHERE op_id = 'a1'`).run();
      raw.close();
      await expect(handle.store.getTimeline("inst-1", 0)).rejects.toThrow(/class-required field/);
      handle.close();
    });
  }

  // ch12-p1b RE-BASE (G2): the S9 guard is now STATUS-AWARE — a NULL
  // task/current_step is LEGAL at genesis (CREATED/WAITING) and REFUSED
  // only when the row is ACTIVE (or terminal-done). Driven PER COLUMN
  // over an ACTIVE row — task=NULL and current_step=NULL as SEPARATE
  // cases, each alone, so a guard that dropped one disjunct goes red on
  // exactly its lane. (`instance` is ACTIVE, so the fabricated row is
  // the refused ACTIVE+NULL shape, not a legal genesis NULL.)
  for (const column of ["task", "current_step"] as const) {
    it(`the mapper refuses a NULL ${column} ALONE on an ACTIVE row (S9's status-aware guard)`, async () => {
      const path = tempDbPath();
      const handle = openStore(path, createControlledClock(0));
      await handle.store.createInstance(instance);
      const raw = new DatabaseSync(path);
      raw.prepare(`UPDATE instances SET ${column} = NULL WHERE instance_id = 'inst-1'`).run();
      raw.close();
      expect(() => handle.store.loadInstance("inst-1")).toThrow(/NULL task\/current_step/);
      handle.close();
    });
  }
});

describe("commitLifecycle — the uniform-commit write member (packet ch12-p1b, F1/F2)", () => {
  const genesis: WorkflowInstance = {
    instanceId: "lc-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: null,
    binding: { implementer: "codex", reviewer: "claude" },
    currentStep: null,
    round: 0,
    kernelStatus: "CREATED",
    terminalDisposition: null,
    activationMode: "deferred_kickoff",
    wait: null,
    runtimeContext: { state: "none" },
    failureReason: null,
    runOverrides: {},
    version: 1,
  };
  const HOLD_WAIT = {
    kind: "kickoff_pending" as const,
    requestedBy: "activation",
    resumeEvents: ["KICKOFF"],
  };

  it("writes the state change + the fact row in ONE commit; the fact row is all-three-NULL by class", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(7));
    await handle.store.createInstance(genesis);
    const result = await handle.store.commitLifecycle({
      instanceId: "lc-1",
      expectedVersion: 1,
      fact: { kind: "STARTED", opId: "op-s" },
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: HOLD_WAIT,
      newRuntimeContext: { state: "ready", ref: null },
    });
    expect(result).toEqual({ kind: "committed", version: 2 });
    const detail = await handle.store.getInstanceDetail("lc-1");
    expect(detail?.instance.kernelStatus).toBe("WAITING");
    expect(detail?.instance.wait).toEqual(HOLD_WAIT);
    expect(detail?.instance.version).toBe(2);
    // The mapped fact entry — the class-shared fields in full (F3).
    expect(detail?.transcript).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-s", committedAt: 7 },
    ]);
    // The RAW row: the three class columns AND issued_agent_config all
    // NULL by class (F2 — per-column assert, not keyset-only).
    const raw = new DatabaseSync(path);
    const row = raw
      .prepare(
        "SELECT entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config FROM transcript WHERE instance_id = 'lc-1'",
      )
      .get() as Record<string, unknown>;
    raw.close();
    expect(row).toEqual({
      entry_kind: "STARTED",
      envelope: null,
      payload_digest: null,
      gate_decisions: null,
      issued_agent_config: null,
    });
    handle.close();
  });

  it("rolls back BOTH halves on a fault between the instances UPDATE and the fact INSERT", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(genesis);
    const raw = new DatabaseSync(path);
    raw.exec(
      "CREATE TRIGGER fault_lc BEFORE INSERT ON transcript BEGIN SELECT RAISE(ABORT, 'fault: lifecycle split'); END",
    );
    raw.close();
    await expect(
      handle.store.commitLifecycle({
        instanceId: "lc-1",
        expectedVersion: 1,
        fact: { kind: "STARTED", opId: "op-s" },
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: HOLD_WAIT,
      }),
    ).rejects.toThrow(/fault: lifecycle split/);
    const check = new DatabaseSync(path);
    const row = check
      .prepare("SELECT version, kernel_status, wait FROM instances WHERE instance_id = 'lc-1'")
      .get() as { version: number; kernel_status: string; wait: string | null };
    expect(row).toEqual({ version: 1, kernel_status: "CREATED", wait: null });
    expect(
      (check.prepare("SELECT COUNT(*) AS n FROM transcript").get() as { n: number }).n,
    ).toBe(0);
    check.exec("DROP TRIGGER fault_lc");
    check.close();
    // The same handle commits cleanly after the fault is dropped.
    const after = await handle.store.commitLifecycle({
      instanceId: "lc-1",
      expectedVersion: 1,
      fact: { kind: "STARTED", opId: "op-s" },
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: HOLD_WAIT,
    });
    expect(after.kind).toBe("committed");
    handle.close();
  });

  it("re-checks idempotency IN the transaction, kind-aware: own kind → duplicate_op, other kind → op_id_collision", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(genesis);
    const first = await handle.store.commitLifecycle({
      instanceId: "lc-1",
      expectedVersion: 1,
      fact: { kind: "STARTED", opId: "op-s" },
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: HOLD_WAIT,
    });
    expect(first.kind).toBe("committed");
    expect(
      await handle.store.commitLifecycle({
        instanceId: "lc-1",
        expectedVersion: 2,
        fact: { kind: "STARTED", opId: "op-s" },
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: HOLD_WAIT,
      }),
    ).toEqual({ kind: "duplicate_op" });
    expect(
      await handle.store.commitLifecycle({
        instanceId: "lc-1",
        expectedVersion: 2,
        fact: { kind: "CANCELLED", opId: "op-s" },
        newKernelStatus: "TERMINAL",
        newTerminalDisposition: "cancelled",
        newWait: null,
      }),
    ).toEqual({ kind: "op_id_collision" });
    handle.close();
  });

  it("reports cas_conflict and writes NOTHING on a stale expectedVersion", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(genesis);
    const result = await handle.store.commitLifecycle({
      instanceId: "lc-1",
      expectedVersion: 9,
      fact: { kind: "STARTED", opId: "op-s" },
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: HOLD_WAIT,
    });
    expect(result).toEqual({ kind: "cas_conflict" });
    const detail = await handle.store.getInstanceDetail("lc-1");
    expect(detail?.instance.version).toBe(1);
    expect(detail?.transcript).toEqual([]);
    handle.close();
  });

  it("FAIL's fact-less commit: version advances with ZERO transcript rows; absent optionals leave columns unchanged", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(genesis);
    const result = await handle.store.commitLifecycle({
      instanceId: "lc-1",
      expectedVersion: 1,
      fact: null,
      newKernelStatus: "TERMINAL",
      newTerminalDisposition: "failed",
      newWait: null,
      newFailureReason: "boom",
    });
    expect(result).toEqual({ kind: "committed", version: 2 });
    const detail = await handle.store.getInstanceDetail("lc-1");
    expect(detail?.instance.kernelStatus).toBe("TERMINAL");
    expect(detail?.instance.terminalDisposition).toBe("failed");
    expect(detail?.instance.failureReason).toBe("boom");
    // Absent optionals unchanged: task/currentStep/round/runtimeContext
    // keep their genesis values.
    expect(detail?.instance.task).toBeNull();
    expect(detail?.instance.currentStep).toBeNull();
    expect(detail?.instance.round).toBe(0);
    expect(detail?.instance.runtimeContext).toEqual({ state: "none" });
    expect(detail?.transcript).toEqual([]);
    handle.close();
  });

  it("refuses a fact row carrying a class-forbidden column — per conjunct (the S11 iff, fact side)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(genesis);
    await handle.store.commitLifecycle({
      instanceId: "lc-1",
      expectedVersion: 1,
      fact: { kind: "STARTED", opId: "op-s" },
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: HOLD_WAIT,
    });
    const conjuncts = [
      ["envelope", "'{}'", /non-null envelope/],
      ["payload_digest", "'sha:fake'", /non-null payload_digest/],
      ["gate_decisions", "'[]'", /non-null gate_decisions/],
    ] as const;
    for (const [column, value, pattern] of conjuncts) {
      const raw = new DatabaseSync(path);
      raw.exec(`UPDATE transcript SET ${column} = ${value} WHERE instance_id = 'lc-1'`);
      raw.close();
      // The mapper refusal surfaces as a SYNCHRONOUS throw (the P1a
      // rowToInstance culture).
      expect(() => handle.store.getInstanceDetail("lc-1")).toThrow(pattern);
      const restore = new DatabaseSync(path);
      restore.exec(`UPDATE transcript SET ${column} = NULL WHERE instance_id = 'lc-1'`);
      restore.close();
    }
    handle.close();
  });

  it("refuses an unknown entry_kind token at the mapper", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(genesis);
    await handle.store.commitLifecycle({
      instanceId: "lc-1",
      expectedVersion: 1,
      fact: { kind: "STARTED", opId: "op-s" },
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: HOLD_WAIT,
    });
    const raw = new DatabaseSync(path);
    raw.exec("UPDATE transcript SET entry_kind = 'PAUSED' WHERE instance_id = 'lc-1'");
    raw.close();
    expect(() => handle.store.getInstanceDetail("lc-1")).toThrow(
      /unknown entry_kind 'PAUSED'/,
    );
    handle.close();
  });

  it("round-trips a non-empty runOverrides snapshot through the RAW column (G1's red-on-drop)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance({
      ...genesis,
      instanceId: "lc-ro",
      runOverrides: { review: { budget: 2, mode: "strict" } },
    });
    const raw = new DatabaseSync(path);
    const row = raw
      .prepare("SELECT run_overrides FROM instances WHERE instance_id = 'lc-ro'")
      .get() as { run_overrides: string };
    raw.close();
    // Canonical bytes (sorted keys) — a regression to the retired "{}"
    // hardcode reds here.
    expect(row.run_overrides).toBe('{"review":{"budget":2,"mode":"strict"}}');
    const loaded = await handle.store.loadInstance("lc-ro");
    expect(loaded?.runOverrides).toEqual({ review: { budget: 2, mode: "strict" } });
    handle.close();
  });
});

describe("the DECISION_REQUEST class — the op-less third entry class (packet ch14-p2a, K8)", () => {
  const park = (overrides: Partial<DecisionRequestBody> = {}): DecisionRequestBody => ({
    requestRef: "req-1000-1",
    recipient: "operator",
    decisions: ["approve", "reject"],
    ...overrides,
  });

  const commitPark = async (
    handle: StoreHandle,
    request: DecisionRequestBody,
    opId = "a1",
    expectedVersion = 1,
  ) =>
    handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion,
      envelope: envelope(opId, expectedVersion),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "gate",
        newRound: 1,
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: {
          kind: "human_decision",
          requestedBy: "gate",
          resumeEvents: ["approve", "reject"],
          requestRef: request.requestRef,
        },
        issuedAgentConfig: {},
        decisionRequest: request,
      }),
    });

  it("round-trips the op-less row BESIDE the transition, in ONE commit", async () => {
    const handle = openStore(tempDbPath(), createControlledClock(0));
    await handle.store.createInstance(instance);
    expect(await commitPark(handle, park({ recommendation: "approve", recommendationSource: { fromStep: "implement", eventType: "PASS" }, contextRef: { note: "n" } }))).toEqual({
      kind: "committed",
      version: 2,
    });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((e) => e.entryKind)).toEqual(["transition", "DECISION_REQUEST"]);
    expect(detail?.transcript[1]).toStrictEqual({
      entryKind: "DECISION_REQUEST",
      seq: 2,
      requestRef: "req-1000-1",
      recipient: "operator",
      decisions: ["approve", "reject"],
      recommendation: "approve",
      recommendationSource: { fromStep: "implement", eventType: "PASS" },
      contextRef: { note: "n" },
      committedAt: 0,
    });
    // The wait record carries the ref back too.
    expect(detail?.instance.wait?.requestRef).toBe("req-1000-1");
    handle.close();
  });

  it("stores the body as canonical JSON with the model's SNAKE keys", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    await commitPark(handle, park({ recommendation: "approve", recommendationSource: { fromStep: "implement", eventType: "PASS" } }));
    handle.close();
    const raw = new DatabaseSync(path);
    const row = raw
      .prepare("SELECT op_id, entry_body, envelope, payload_digest, gate_decisions, issued_agent_config FROM transcript WHERE entry_kind = 'DECISION_REQUEST'")
      .get() as {
      op_id: string | null;
      entry_body: string;
      envelope: string | null;
      payload_digest: string | null;
      gate_decisions: string | null;
      issued_agent_config: string | null;
    };
    // OP-LESS by class, and every transition-only column NULL.
    expect(row.op_id).toBeNull();
    expect([row.envelope, row.payload_digest, row.gate_decisions, row.issued_agent_config]).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(row.entry_body).toBe(
      '{"decisions":["approve","reject"],"recipient":"operator","recommendation":"approve","recommendation_source":{"event_type":"PASS","from_step":"implement"},"request_ref":"req-1000-1"}',
    );
    raw.close();
  });

  it("records a FALSY context surface as PRESENT — presence, never truth", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    await commitPark(handle, park({ contextRef: null }));
    const detail = await handle.store.getInstanceDetail("inst-1");
    const row = detail?.transcript[1];
    expect(row?.entryKind === "DECISION_REQUEST" && "contextRef" in row).toBe(true);
    expect(row?.entryKind === "DECISION_REQUEST" ? row.contextRef : "missing").toBeNull();
    handle.close();
  });

  it("lets MANY op-less rows coexist under one instance (UNIQUE treats NULLs as distinct)", async () => {
    const handle = openStore(tempDbPath(), createControlledClock(0));
    await handle.store.createInstance(instance);
    await commitPark(handle, park({ requestRef: "req-a" }), "a1", 1);
    await commitPark(handle, park({ requestRef: "req-b" }), "a2", 2);
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((e) => e.entryKind)).toEqual([
      "transition",
      "DECISION_REQUEST",
      "transition",
      "DECISION_REQUEST",
    ]);
    handle.close();
  });

  it("still raises on an op-carrying DUPLICATE — the relaxation did not weaken uniqueness", async () => {
    const handle = openStore(tempDbPath(), createControlledClock(0));
    await handle.store.createInstance(instance);
    await commitPark(handle, park(), "a1", 1);
    expect(await commitPark(handle, park({ requestRef: "req-2" }), "a1", 2)).toEqual({
      kind: "duplicate_op",
    });
    handle.close();
  });

  it("findOp NEVER matches an op-less row", async () => {
    const handle = openStore(tempDbPath(), createControlledClock(0));
    await handle.store.createInstance(instance);
    await commitPark(handle, park());
    expect(await handle.store.findOp("inst-1", "req-1000-1")).toBeNull();
    handle.close();
  });
});

describe("the INHERITED op_id guarantee — the DDL's NOT NULL, moved to the mapper (K8)", () => {
  const openWithRow = async (
    mutate: (raw: DatabaseSync) => void,
  ): Promise<{ path: string; handle: StoreHandle }> => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    handle.close();
    const raw = new DatabaseSync(path);
    mutate(raw);
    raw.close();
    return { path, handle: openStore(path, createControlledClock(0)) };
  };

  it("REFUSES an op-carrying row whose op_id went NULL", async () => {
    const { handle } = await openWithRow((raw) => {
      raw.prepare("UPDATE transcript SET op_id = NULL WHERE entry_kind = 'transition'").run();
    });
    expect(() => handle.store.getInstanceDetail("inst-1")).toThrow(/NULL op_id/);
    handle.close();
  });

  it("REFUSES an op-LESS row that carries one — the check binds BOTH directions", async () => {
    const { handle } = await openWithRow((raw) => {
      raw
        .prepare(
          "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, entry_body, committed_at) VALUES ('inst-1', 9, 'smuggled', 'DECISION_REQUEST', ?, 0)",
        )
        .run('{"decisions":[],"recipient":"operator","request_ref":"r"}');
    });
    expect(() => handle.store.getInstanceDetail("inst-1")).toThrow(/carries an op_id/);
    handle.close();
  });

  it("REFUSES an op-less row with no entry_body, and a transition row that has one", async () => {
    const a = await openWithRow((raw) => {
      raw
        .prepare(
          "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, entry_body, committed_at) VALUES ('inst-1', 9, NULL, 'DECISION_REQUEST', NULL, 0)",
        )
        .run();
    });
    expect(() => a.handle.store.getInstanceDetail("inst-1")).toThrow(/NULL entry_body/);
    a.handle.close();

    const b = await openWithRow((raw) => {
      raw.prepare("UPDATE transcript SET entry_body = '{}' WHERE entry_kind = 'transition'").run();
    });
    expect(() => b.handle.store.getInstanceDetail("inst-1")).toThrow(
      /non-null entry_body/,
    );
    b.handle.close();
  });

  it("REFUSES a recommendation and its source stored APART", async () => {
    const { handle } = await openWithRow((raw) => {
      raw
        .prepare(
          "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, entry_body, committed_at) VALUES ('inst-1', 9, NULL, 'DECISION_REQUEST', ?, 0)",
        )
        .run('{"decisions":[],"recipient":"operator","recommendation":"approve","request_ref":"r"}');
    });
    expect(() => handle.store.getInstanceDetail("inst-1")).toThrow(/travel together/);
    handle.close();
  });
});

describe("the park is ONE visible transition (packet ch14-p2a, K2 — the atomicity invariant)", () => {
  it("a SECOND-ROW append failure rolls the state write back — no half-entered gate", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);

    // The seam K2 names, and it needs NO new production surface: the
    // ch12-p1a atomicity staging, PREDICATED ON THE NEW ROW'S ENTRY
    // KIND so the fault is SECOND-ROW-specific — strictly stronger than
    // a blanket hook, and the rollback is the real SQLite transaction's
    // rather than a simulation. A second connection to the same file
    // installs it, so no test machinery enters production store code.
    const raw = new DatabaseSync(path);
    raw.exec(
      "CREATE TRIGGER fault_second_row BEFORE INSERT ON transcript " +
        "WHEN NEW.entry_kind = 'DECISION_REQUEST' " +
        "BEGIN SELECT RAISE(ABORT, 'fault: second row'); END",
    );
    raw.close();

    await expect(
      handle.store.commitTransition({
        instanceId: "inst-1",
        expectedVersion: 1,
        envelope: envelope("a1", 1),
        payloadDigest: DIGEST,
        gateDecisions: [],
        arrival: arrivalFixture({
          newCurrentStep: "gate",
          newRound: 1,
          newKernelStatus: "WAITING",
          newTerminalDisposition: null,
          newWait: {
            kind: "human_decision",
            requestedBy: "gate",
            resumeEvents: ["approve"],
            requestRef: "req-1",
          },
          issuedAgentConfig: {},
          decisionRequest: {
            requestRef: "req-1",
            recipient: "operator",
            decisions: ["approve"],
          },
        }),
      }),
    ).rejects.toThrow(/fault: second row/);

    // ALL THREE halves rolled back — the failure DIRECTION is the half a
    // positive-only lane cannot see.
    const check = new DatabaseSync(path);
    const row = check
      .prepare("SELECT current_step, kernel_status, wait, version FROM instances WHERE instance_id = 'inst-1'")
      .get() as { current_step: string; kernel_status: string; wait: string | null; version: number };
    expect(row).toMatchObject({
      current_step: "implement",
      kernel_status: "ACTIVE",
      wait: null,
      version: 1,
    });
    // …and NEITHER transcript row survived: not the request row the
    // trigger refused, and not the transition row that preceded it.
    const count = check.prepare("SELECT COUNT(*) AS n FROM transcript").get() as { n: number };
    expect(count.n).toBe(0);
    check.exec("DROP TRIGGER fault_second_row");
    check.close();

    // No transaction leaked: with the fault removed the SAME commit
    // goes through cleanly on the same handle, and BOTH rows land.
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      arrival: arrivalFixture({
        newCurrentStep: "gate",
        newRound: 1,
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: {
          kind: "human_decision",
          requestedBy: "gate",
          resumeEvents: ["approve"],
          requestRef: "req-1",
        },
        issuedAgentConfig: {},
        decisionRequest: { requestRef: "req-1", recipient: "operator", decisions: ["approve"] },
      }),
    });
    expect(result).toEqual({ kind: "committed", version: 2 });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((e) => e.entryKind)).toEqual(["transition", "DECISION_REQUEST"]);
    handle.close();
  });
});

/**
 * The row mapper's integrity errors surface SYNCHRONOUSLY out of
 * `getInstanceDetail` (it returns `Promise.resolve(...)` rather than
 * being `async`), so a bare `rejects.toThrow` would not see them. This
 * normalizes both shapes so a lane asserts the REFUSAL rather than the
 * throw's delivery mechanism.
 */
async function integrityError(read: () => Promise<unknown>): Promise<Error> {
  try {
    await read();
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
  throw new Error("expected a store-integrity refusal, got none");
}

// ─────────────────────────────────────────────────────────────────────
// FAMILY 5 — persistence of the two OPERATOR-ENTRY classes
// (packet ch14-p2b, Q2; →[new-variants], →[no-second-bump])
// ─────────────────────────────────────────────────────────────────────

describe("family 5 — the two operator classes round-trip, body byte-asserted in canonical form", () => {
  const parked: WorkflowInstance = {
    ...instance,
    instanceId: "op-1",
    kernelStatus: "WAITING",
    currentStep: "gate",
    wait: {
      kind: "human_decision",
      requestedBy: "gate",
      resumeEvents: ["approve"],
      requestRef: "R-1",
    },
  };

  const toWait = arrivalFixture({
    newCurrentStep: "commit_wait",
    newRound: 1,
    newKernelStatus: "WAITING",
    newTerminalDisposition: null,
    newWait: { kind: "commit_pending", requestedBy: "commit_wait", resumeEvents: ["COMMIT"] },
    issuedAgentConfig: {},
  });

  it("DECISION_MADE round-trips, and its stored body carries the model's SNAKE keys", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(7));
    await handle.store.createInstance(parked);
    const result = await handle.store.commitOperatorEntry({
      instanceId: "op-1",
      expectedVersion: parked.version,
      entry: {
        kind: "DECISION_MADE",
        opId: "d1",
        body: {
          decision: "request_rework",
          payload: { instruction: "again" },
          by: "human-1",
          requestRef: "R-1",
          override: true,
        },
      },
      arrival: toWait,
    });
    expect(result).toEqual({ kind: "committed", version: parked.version + 1 });

    const detail = await handle.store.getInstanceDetail("op-1");
    expect(detail?.transcript[0]).toEqual({
      entryKind: "DECISION_MADE",
      seq: 1,
      opId: "d1",
      decision: "request_rework",
      payload: { instruction: "again" },
      by: "human-1",
      requestRef: "R-1",
      override: true,
      committedAt: 7,
    });
    handle.close();

    // THE STORED BODY, byte-asserted: canonical JSON, SNAKE keys — the
    // SAME casing seam the `wait` column and the DECISION_REQUEST body
    // already follow. A camel-keyed body would round-trip through the
    // decoder's own spellings and never be seen from the TS side.
    const raw = new DatabaseSync(path);
    const row = raw
      .prepare("SELECT entry_body, op_id, envelope, payload_digest, gate_decisions, issued_agent_config FROM transcript WHERE seq = 1")
      .get() as {
      entry_body: string;
      op_id: string | null;
      envelope: string | null;
      payload_digest: string | null;
      gate_decisions: string | null;
      issued_agent_config: string | null;
    };
    expect(row.entry_body).toBe(
      '{"by":"human-1","decision":"request_rework","override":true,"payload":{"instruction":"again"},"request_ref":"R-1"}',
    );
    // THE COLUMN IFF, forward direction: op-carrying AND body-bearing,
    // with all four transition-only columns NULL by class.
    expect(row.op_id).toBe("d1");
    expect(row.envelope).toBeNull();
    expect(row.payload_digest).toBeNull();
    expect(row.gate_decisions).toBeNull();
    expect(row.issued_agent_config).toBeNull();
    raw.close();
  });

  it("WAIT_RESUMED round-trips with SNAKE keys and the same column iff", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(7));
    await handle.store.createInstance({
      ...parked,
      instanceId: "op-2",
      currentStep: "commit_wait",
      wait: { kind: "commit_pending", requestedBy: "commit_wait", resumeEvents: ["COMMIT"] },
    });
    await handle.store.commitOperatorEntry({
      instanceId: "op-2",
      expectedVersion: parked.version,
      entry: { kind: "WAIT_RESUMED", opId: "r1", body: { kind: "commit_pending", event: "COMMIT" } },
      arrival: arrivalFixture({
        newCurrentStep: "done",
        newRound: 1,
        newKernelStatus: "TERMINAL",
        newTerminalDisposition: "done",
        newWait: null,
        issuedAgentConfig: {},
      }),
    });
    const detail = await handle.store.getInstanceDetail("op-2");
    expect(detail?.transcript[0]).toEqual({
      entryKind: "WAIT_RESUMED",
      seq: 1,
      opId: "r1",
      kind: "commit_pending",
      event: "COMMIT",
      committedAt: 7,
    });
    handle.close();
    const raw = new DatabaseSync(path);
    const row = raw
      .prepare(
        "SELECT entry_body, op_id, envelope, payload_digest, gate_decisions, issued_agent_config FROM transcript WHERE seq = 1",
      )
      .get() as {
      entry_body: string;
      op_id: string | null;
      envelope: string | null;
      payload_digest: string | null;
      gate_decisions: string | null;
      issued_agent_config: string | null;
    };
    expect(row.entry_body).toBe('{"event":"COMMIT","kind":"commit_pending"}');
    // THE FORWARD DIRECTION AT FULL WIDTH, the same SIX columns the
    // DECISION_MADE lane reads: a per-class assertion that stopped at
    // `op_id` would leave the other class's four transition-only columns
    // unread on the only lane that commits one.
    expect(row.op_id).toBe("r1");
    expect(row.envelope).toBeNull();
    expect(row.payload_digest).toBeNull();
    expect(row.gate_decisions).toBeNull();
    expect(row.issued_agent_config).toBeNull();
    raw.close();
  });

  /**
   * THE COLUMN IFF IS AN EQUIVALENCE, TABLE-DRIVEN OVER BOTH CLASSES ×
   * ALL SIX COLUMNS (build-close aftermath, ch14-p2b).
   *
   * The earlier form of this lane drove ONE representative of the
   * transition-only half — `envelope` — and the other three conjuncts
   * of the branch's `||` rode along unmeasured. That is not a
   * hypothetical: deleting the `gate_decisions !== null` check from the
   * operator-class branch of the mapper leaves the whole suite green,
   * which is the precise blindness a single representative buys. The
   * grid is therefore written out per column, so each conjunct is
   * load-bearing ALONE on its own lane, for each class independently.
   */
  const CLASS_BODY = {
    DECISION_MADE: '{"by":"h","decision":"approve","request_ref":"R"}',
    WAIT_RESUMED: '{"event":"COMMIT","kind":"commit_pending"}',
  } as const;

  /**
   * The FOUR transition-only columns, with a legal-looking value for
   * each — a shape a build routing the class through the transition
   * branch would actually write, not a sentinel the decoder would
   * choke on for an unrelated reason.
   */
  const TRANSITION_ONLY = [
    { column: "envelope", value: "{}" },
    { column: "payload_digest", value: "digest-1" },
    { column: "gate_decisions", value: "[]" },
    { column: "issued_agent_config", value: "{}" },
  ] as const;

  const COLUMNS = ["op_id", "entry_body", "envelope", "payload_digest", "gate_decisions", "issued_agent_config"] as const;

  /** Stage ONE raw transcript row on a fresh db and read it back. */
  async function stagedRow(columns: {
    readonly op_id: string | null;
    readonly entry_kind: "DECISION_MADE" | "WAIT_RESUMED";
    readonly envelope: string | null;
    readonly payload_digest: string | null;
    readonly gate_decisions: string | null;
    readonly issued_agent_config: string | null;
    readonly entry_body: string | null;
  }): Promise<Error> {
    const path = tempDbPath();
    let handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance({ ...parked, instanceId: "x" });
    handle.close();
    const raw = new DatabaseSync(path);
    raw
      .prepare(
        "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at) VALUES ('x', 1, ?, ?, ?, ?, ?, ?, ?, 0)",
      )
      .run(
        columns.op_id,
        columns.entry_kind,
        columns.envelope,
        columns.payload_digest,
        columns.gate_decisions,
        columns.issued_agent_config,
        columns.entry_body,
      );
    raw.close();
    handle = openStore(path, createControlledClock(0));
    const error = await integrityError(() => handle.store.getInstanceDetail("x"));
    handle.close();
    return error;
  }

  for (const kind of ["DECISION_MADE", "WAIT_RESUMED"] as const) {
    /** The class's CORRECTLY-SHAPED row — the forward direction's subject. */
    function wellFormed() {
      return {
        op_id: "o1",
        entry_kind: kind,
        envelope: null,
        payload_digest: null,
        gate_decisions: null,
        issued_agent_config: null,
        entry_body: CLASS_BODY[kind],
      } as const;
    }

    it(`FORWARD, ${kind}: a correctly-shaped row DECODES and every transition-only column reads NULL`, async () => {
      const path = tempDbPath();
      let handle = openStore(path, createControlledClock(0));
      await handle.store.createInstance({ ...parked, instanceId: "x" });
      handle.close();
      const raw = new DatabaseSync(path);
      const w = wellFormed();
      raw
        .prepare(
          "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at) VALUES ('x', 1, ?, ?, NULL, NULL, NULL, NULL, ?, 0)",
        )
        .run(w.op_id, w.entry_kind, w.entry_body);
      raw.close();
      handle = openStore(path, createControlledClock(0));
      const detail = await handle.store.getInstanceDetail("x");
      // It DECODES — the forward half of the equivalence.
      expect(detail?.transcript[0]).toEqual(
        kind === "DECISION_MADE"
          ? {
              entryKind: "DECISION_MADE",
              seq: 1,
              opId: "o1",
              decision: "approve",
              by: "h",
              requestRef: "R",
              committedAt: 0,
            }
          : {
              entryKind: "WAIT_RESUMED",
              seq: 1,
              opId: "o1",
              kind: "commit_pending",
              event: "COMMIT",
              committedAt: 0,
            },
      );
      handle.close();
      // …and the SIX columns read as the class declares them: op_id
      // PRESENT, entry_body NON-NULL, the four transition-only ones NULL.
      const check = new DatabaseSync(path);
      const row = check
        .prepare(`SELECT ${COLUMNS.join(", ")} FROM transcript WHERE seq = 1`)
        .get() as Record<(typeof COLUMNS)[number], string | null>;
      check.close();
      expect(row.op_id).toBe("o1");
      expect(row.entry_body).toBe(CLASS_BODY[kind]);
      for (const { column } of TRANSITION_ONLY) {
        expect(row[column], `${kind}.${column}`).toBeNull();
      }
    });

    // REVERSE, the four transition-only columns — EACH INDEPENDENTLY, so
    // each conjunct of the branch's `||` is proven load-bearing alone.
    for (const { column, value } of TRANSITION_ONLY) {
      it(`REVERSE, ${kind}: a row carrying ONLY a non-null ${column} is refused by the class iff`, async () => {
        const error = await stagedRow({ ...wellFormed(), [column]: value });
        expect(error.message).toMatch(/transition-only field \(class iff\)/);
        expect(error.message).toContain(kind);
      });
    }

    it(`REVERSE, ${kind}: a row missing op_id is refused (the op-carrying half)`, async () => {
      const error = await stagedRow({ ...wellFormed(), op_id: null });
      expect(error.message).toMatch(/NULL op_id/);
    });

    it(`REVERSE, ${kind}: a row missing entry_body is refused (the body-bearing half)`, async () => {
      const error = await stagedRow({ ...wellFormed(), entry_body: null });
      expect(error.message).toMatch(/NULL entry_body/);
    });
  }

  it("THE PREDICATE SPLIT: a TRANSITION row still refuses an entry_body, and a fact row still refuses one", async () => {
    // The half that proves `opLess` no longer serves the body rule: the
    // two OTHER op-carrying classes must still refuse a body.
    const path = tempDbPath();
    let handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance({ ...parked, instanceId: "x" });
    handle.close();
    const raw = new DatabaseSync(path);
    raw
      .prepare(
        "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at) VALUES ('x', 1, 'o1', 'STARTED', NULL, NULL, NULL, NULL, '{}', 0)",
      )
      .run();
    raw.close();
    handle = openStore(path, createControlledClock(0));
    expect((await integrityError(() => handle.store.getInstanceDetail("x"))).message).toMatch(
      /non-null entry_body/,
    );
    handle.close();
  });

  it("→[no-second-bump]: SCHEMA_VERSION is BYTE-UNCHANGED at '6'", async () => {
    // The lane that reds if a build reaches for a second bump: p2a's was
    // ONE fence for the whole chapter, and its own row commits to
    // serving these two classes.
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance({ ...parked, instanceId: "x" });
    handle.close();
    const raw = new DatabaseSync(path);
    const marker = raw
      .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
      .get() as { value: string };
    expect(marker.value).toBe("6");
    raw.close();
  });
});

describe("family 5 — the commit member's OWN three results and the two-row rollback", () => {
  const parked: WorkflowInstance = {
    ...instance,
    instanceId: "res-1",
    kernelStatus: "WAITING",
    currentStep: "gate",
    wait: {
      kind: "human_decision",
      requestedBy: "gate",
      resumeEvents: ["approve"],
      requestRef: "R-1",
    },
  };
  const toWait = arrivalFixture({
    newCurrentStep: "commit_wait",
    newRound: 1,
    newKernelStatus: "WAITING",
    newTerminalDisposition: null,
    newWait: { kind: "commit_pending", requestedBy: "commit_wait", resumeEvents: ["COMMIT"] },
    issuedAgentConfig: {},
  });
  const body = { decision: "approve", by: "human-1", requestRef: "R-1" } as const;

  it("duplicate_op — the IN-TRANSACTION re-check on the entry's OWN kind", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(parked);
    await handle.store.commitOperatorEntry({
      instanceId: "res-1",
      expectedVersion: parked.version,
      entry: { kind: "DECISION_MADE", opId: "d1", body },
      arrival: toWait,
    });
    expect(
      await handle.store.commitOperatorEntry({
        instanceId: "res-1",
        expectedVersion: parked.version + 1,
        entry: { kind: "DECISION_MADE", opId: "d1", body },
        arrival: toWait,
      }),
    ).toEqual({ kind: "duplicate_op" });
    handle.close();
  });

  it("op_id_collision — the same key under ANY other kind", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(parked);
    await handle.store.commitOperatorEntry({
      instanceId: "res-1",
      expectedVersion: parked.version,
      entry: { kind: "DECISION_MADE", opId: "d1", body },
      arrival: toWait,
    });
    expect(
      await handle.store.commitOperatorEntry({
        instanceId: "res-1",
        expectedVersion: parked.version + 1,
        entry: {
          kind: "WAIT_RESUMED",
          opId: "d1",
          body: { kind: "commit_pending", event: "COMMIT" },
        },
        arrival: toWait,
      }),
    ).toEqual({ kind: "op_id_collision" });
    handle.close();
  });

  it("cas_conflict — from the CAS, on a stale expected version", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(parked);
    expect(
      await handle.store.commitOperatorEntry({
        instanceId: "res-1",
        expectedVersion: parked.version + 99,
        entry: { kind: "DECISION_MADE", opId: "d1", body },
        arrival: toWait,
      }),
    ).toEqual({ kind: "cas_conflict" });
    handle.close();
  });

  it("THE ROLLBACK leaves NOTHING of a failed TWO-ROW commit", async () => {
    // The member writes up to TWO rows in ONE transaction (the re-park's
    // fresh DECISION_REQUEST beside its own row). A failure inside must
    // leave NEITHER — two commits would BE the half-entered gate the
    // atomicity rule forbids.
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(parked);
    const before = await handle.store.getInstanceDetail("res-1");
    const rePark = arrivalFixture({
      newCurrentStep: "gate",
      newRound: 1,
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: {
        kind: "human_decision",
        requestedBy: "gate",
        resumeEvents: ["approve"],
        requestRef: "R-2",
      },
      // A body the canonical-JSON encoder REFUSES — the failure lands
      // between the two INSERTs.
      decisionRequest: {
        requestRef: "R-2",
        recipient: "operator",
        decisions: ["approve"],
        contextRef: { bad: () => 1 },
      },
      issuedAgentConfig: {},
    });
    await expect(
      handle.store.commitOperatorEntry({
        instanceId: "res-1",
        expectedVersion: parked.version,
        entry: { kind: "DECISION_MADE", opId: "d1", body },
        arrival: rePark,
      }),
    ).rejects.toThrow();
    // NEITHER row landed, and the CAS's version bump rolled back with them.
    const after = await handle.store.getInstanceDetail("res-1");
    expect(after?.transcript).toEqual(before?.transcript ?? []);
    expect(after?.instance.version).toBe(parked.version);
    handle.close();
  });
});
