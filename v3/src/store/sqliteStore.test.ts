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
  kernelStatus: "ACTIVE",
  terminalDisposition: null,
  activationMode: "immediate",
  wait: null,
  runtimeContext: { state: "ready", ref: null },
  failureReason: null,
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      gateDecisions: [],
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      gateDecisions: [],
      newCurrentStep: "implement",
      newRound: 2,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });

    // op a1 retransmitted with its (now stale) original expectation:
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
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
      gateDecisions: [],
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    clock.advance(500);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      gateDecisions: [],
      newCurrentStep: "implement",
      newRound: 2,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });

    const collided = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: differingEnvelope("a1", 2),
      payloadDigest: deriveEmitDigest(differingEnvelope("a1", 2)),
      gateDecisions: [],
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 2,
      envelope: envelope("b2", 2),
      payloadDigest: DIGEST,
      gateDecisions: [],
      newCurrentStep: "implement",
      newRound: 2,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });

    const collided = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1, // stale on purpose — the rung must answer first
      envelope: differingEnvelope("a1", 1),
      payloadDigest: deriveEmitDigest(differingEnvelope("a1", 1)),
      gateDecisions: [],
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript[0]?.payloadDigest).toBe(DIGEST);
    expect(await handle.store.findOp("inst-1", "a1")).toEqual({ payloadDigest: DIGEST });
    handle.close();
  });
});

describe("schema → v5 — THE ch12 lifecycle-axis bump rides the fenced wipe (packet ch12-p1a, S1, ADR-003)", () => {
  it("a known PROTOTYPE store at marker '4' wipes on open and re-marks as '5'", async () => {
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
    expect(marker.value).toBe("5");
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
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
      });
      expect(result.kind).toBe("committed");
    }
    return handle;
  }

  it("dims 1+2 — cursor semantics, seq-ascending always", async () => {
    const handle = await seeded();
    const full = await handle.store.getTimeline("inst-1", 0);
    expect(full?.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(full?.map((r) => r.envelope.opId)).toEqual(["a1", "b2", "c3"]);
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    expect(result).toEqual({ kind: "committed", version: 5 });
    handle.close();
  });

  it("watchpoint — a row-parse error surfaces AND leaves no open transaction", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);

    const raw = new DatabaseSync(path);
    raw
      .prepare(
        "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run("inst-1", 1, "bad", "transition", "not-json", "d", "[]", 0);
    raw.close();

    await expect(handle.store.getTimeline("inst-1", 0)).rejects.toThrow(SyntaxError);
    const result = await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("x9", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    expect(result.kind).toBe("committed");
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript[0]?.envelope).toEqual(roleEnvelope);
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    expect(result.kind).toBe("committed");
    // One write, two reads: a mapper divergence between getInstanceDetail
    // and getTimeline fails this deep-equality.
    const detail = await handle.store.getInstanceDetail("inst-1");
    const timeline = await handle.store.getTimeline("inst-1", 0);
    expect(detail?.transcript[0]?.gateDecisions).toEqual(decisions);
    expect(timeline?.[0]?.gateDecisions).toEqual(decisions);
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript[0]?.gateDecisions).toEqual([]);
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

  it("every committed row is written entry_kind 'transition' with issued_agent_config NULL (S11's P1a write shape)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: envelope("a1", 1),
      payloadDigest: DIGEST,
      gateDecisions: [],
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
    });
    handle.close();
    const raw = new DatabaseSync(path);
    const row = raw
      .prepare("SELECT entry_kind, issued_agent_config FROM transcript WHERE instance_id = 'inst-1'")
      .get() as { entry_kind: string; issued_agent_config: string | null };
    expect(row.entry_kind).toBe("transition");
    expect(row.issued_agent_config).toBeNull();
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
      newCurrentStep: "review",
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
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
      newCurrentStep: "done",
      newRound: 1,
      newKernelStatus: "TERMINAL",
      newTerminalDisposition: "done",
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

  it("S11 class iff, read side: a staged fact-kind row (or a transition row with a NULL class field) is refused by the mapper", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    const raw = new DatabaseSync(path);
    // A fact row has NO reader until P1b — the transition-side mapper refuses it loudly.
    raw
      .prepare(
        "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?)",
      )
      .run("inst-1", 1, "fact-1", "STARTED", 0);
    raw.close();
    await expect(handle.store.getTimeline("inst-1", 0)).rejects.toThrow(/entry_kind 'STARTED'/);

    const raw2 = new DatabaseSync(path);
    raw2.prepare("UPDATE transcript SET entry_kind = 'transition' WHERE op_id = 'fact-1'").run();
    raw2.close();
    await expect(handle.store.getTimeline("inst-1", 0)).rejects.toThrow(/class-required field/);
    handle.close();
  });

  it("the mapper refuses a NULL task/current_step (S9's type-staging guard — the P1b readers have not landed)", async () => {
    const path = tempDbPath();
    const handle = openStore(path, createControlledClock(0));
    await handle.store.createInstance(instance);
    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE instances SET task = NULL WHERE instance_id = 'inst-1'").run();
    raw.close();
    expect(() => handle.store.loadInstance("inst-1")).toThrow(/NULL task\/current_step/);
    handle.close();
  });
});
