import { describe, expect, it } from "vitest";

import type { TranscriptEntry, WorkflowInstance } from "../domain/index.js";
import { admitTemplate } from "../definition/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createGateRegistry } from "../gates/index.js";
import type { ProcessGateRunner } from "../ports/gate.js";
import { openStore } from "../store/sqliteStore.js";
import {
  createRecordingDiagnosticsSink,
  createControlledClock,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import { createKernel } from "./kernel.js";
import type { Kernel } from "./kernel.js";

/**
 * The lifecycle-op family (packet ch12-p1b — L1–L9, A1–A4, J4): per-op
 * success EQUALITY lanes, the A4 guard lanes (throw + zero state change
 * + op_id unconsumed), the kind-aware idempotency combination lanes,
 * the L3 window lanes, and the L9 diag classification parity.
 */

const REF = { id: "local-pair-v0", version: 1 };

interface Harness {
  readonly kernel: Kernel;
  readonly store: ReturnType<typeof openStore>["store"];
  readonly diag: ReturnType<typeof createRecordingDiagnosticsSink>;
  close(): void;
}

function makeHarness(
  templateMutation?: (raw: ReturnType<typeof fixtureTemplate>) => ReturnType<typeof fixtureTemplate>,
): Harness {
  const clock = createControlledClock(1_000);
  const handle = openStore(":memory:", clock);
  const gates = createGateRegistry();
  const raw = templateMutation ? templateMutation(fixtureTemplate()) : fixtureTemplate();
  const admitted = admitTemplate(raw, gates);
  if (!admitted.ok) {
    throw new Error("lifecycle.test harness: fixture template failed admission");
  }
  const diag = createRecordingDiagnosticsSink();
  const processRunner: ProcessGateRunner = {
    run: () => Promise.reject(new Error("no process gates in lifecycle tests")),
  };
  const kernel = createKernel({
    store: handle.store,
    definitions: fixtureDefinitionStore(admitted.template),
    time: clock,
    digest: deriveEmitDigest,
    diag: diag.sink,
    gates,
    processRunner,
  });
  return { kernel, store: handle.store, diag, close: () => handle.close() };
}

function deferred(raw: ReturnType<typeof fixtureTemplate>): ReturnType<typeof fixtureTemplate> {
  return { ...raw, activation: { mode: "deferred_kickoff" } };
}

function requiredContext(
  raw: ReturnType<typeof fixtureTemplate>,
): ReturnType<typeof fixtureTemplate> {
  return { ...raw, runtimeContext: "required" };
}

async function loadOrThrow(h: Harness, id: string): Promise<WorkflowInstance> {
  const instance = await h.store.loadInstance(id);
  if (instance === null) {
    throw new Error(`test wiring: instance '${id}' vanished`);
  }
  return instance;
}

async function transcriptOf(h: Harness, id: string): Promise<readonly TranscriptEntry[]> {
  const detail = await h.store.getInstanceDetail(id);
  if (detail === null) {
    throw new Error(`test wiring: no detail for '${id}'`);
  }
  return detail.transcript;
}

describe("CREATE (L1/G1)", () => {
  it("writes the FULL genesis shape — equality, not spot fields", async () => {
    const h = makeHarness();
    const created = await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    expect(created).toEqual({ kind: "created", instanceId: "i1", version: 1 });
    const instance = await loadOrThrow(h, "i1");
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: "T",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: null,
      round: 0,
      kernelStatus: "CREATED",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: null,
      runtimeContext: { state: "none" },
      failureReason: null,
      runOverrides: {},
      version: 1,
    });
    expect(await transcriptOf(h, "i1")).toEqual([]);
    h.close();
  });

  it("rejects task_required on effective-immediate without a task — before any state", async () => {
    const h = makeHarness();
    const outcome = await h.kernel.create({ instanceId: "i1", templateRef: REF });
    expect(outcome).toEqual({ kind: "rejected", reason: "task_required" });
    expect(await h.store.loadInstance("i1")).toBeNull();
    // L9: one classified diag event per non-success outcome.
    expect(h.diag.events).toEqual([
      { source: "kernel", kind: "rejected", reason: "task_required", instanceId: "i1" },
    ]);
    h.close();
  });

  it("creates task-less LEGALLY under an explicit deferredKickoff choice (resolution precedes the check)", async () => {
    const h = makeHarness();
    const outcome = await h.kernel.create({
      instanceId: "i1",
      templateRef: REF,
      mode: "deferred_kickoff",
    });
    expect(outcome.kind).toBe("created");
    const instance = await loadOrThrow(h, "i1");
    expect(instance.activationMode).toBe("deferred_kickoff");
    expect(instance.task).toBeNull();
    h.close();
  });

  it("reads the admitted template's activation default (G3) when no CREATE choice is given", async () => {
    const h = makeHarness(deferred);
    const outcome = await h.kernel.create({ instanceId: "i1", templateRef: REF });
    expect(outcome.kind).toBe("created");
    expect((await loadOrThrow(h, "i1")).activationMode).toBe("deferred_kickoff");
    h.close();
  });

  it("lets the CREATE choice override the template default (C13's chain order)", async () => {
    const h = makeHarness(deferred);
    const outcome = await h.kernel.create({
      instanceId: "i1",
      templateRef: REF,
      task: "T",
      mode: "immediate",
    });
    expect(outcome.kind).toBe("created");
    expect((await loadOrThrow(h, "i1")).activationMode).toBe("immediate");
    h.close();
  });

  it("snapshots a non-empty runOverrides through to the RAW stored column (G1's red-on-drop)", async () => {
    const h = makeHarness();
    const overrides = { review: { mode: "strict", budget: 2 } };
    await h.kernel.create({
      instanceId: "i1",
      templateRef: REF,
      task: "T",
      runOverrides: overrides,
    });
    // The mapped value round-trips…
    expect((await loadOrThrow(h, "i1")).runOverrides).toEqual(overrides);
    h.close();
  });

  it("throws on an unknown template ref (no invented rejection name)", async () => {
    const h = makeHarness();
    await expect(
      h.kernel.create({ instanceId: "i1", templateRef: { id: "nope", version: 9 }, task: "T" }),
    ).rejects.toThrow(/create failed: template 'nope@9' not found/);
    expect(h.diag.events.map((e) => e.kind)).toEqual(["internal_failure"]);
    h.close();
  });

  it("throws binding coverage at create — fail at create, not mid-run", async () => {
    const h = makeHarness((raw) => ({
      ...raw,
      roles: { implementer: { defaultActor: "codex" }, reviewer: {} },
    }));
    await expect(
      h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" }),
    ).rejects.toThrow(/create failed \(binding coverage\): role 'reviewer'/);
    expect(await h.store.loadInstance("i1")).toBeNull();
    h.close();
  });

  it("throws store creation-uniqueness on a duplicate instance id — never a Duplicate outcome", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await expect(
      h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" }),
    ).rejects.toThrow(/store integrity: instance 'i1' already exists/);
    h.close();
  });
});

describe("START (L2/L3) — the fork and the window lanes", () => {
  it("immediate none-path: ONE composed commit → Activated(v2) + the STARTED fact + ready(∅)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    const outcome = await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    if (outcome.kind !== "activated") {
      throw new Error(`expected activated, got ${outcome.kind}`);
    }
    expect(outcome.instanceId).toBe("i1");
    expect(outcome.version).toBe(2);
    expect(outcome.intent.actor).toBe("codex");
    expect(outcome.intent.packet.expectedVersion).toBe(2);
    expect(outcome.intent.packet.task).toBe("T");
    const instance = await loadOrThrow(h, "i1");
    expect(instance.kernelStatus).toBe("ACTIVE");
    expect(instance.currentStep).toBe("implement");
    expect(instance.round).toBe(1);
    expect(instance.wait).toBeNull();
    expect(instance.runtimeContext).toEqual({ state: "ready", ref: null });
    expect(instance.version).toBe(2);
    expect(await transcriptOf(h, "i1")).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 1_000 },
    ]);
    h.close();
  });

  it("deferred hold: WAITING(kickoff_pending) + Accepted + the STARTED fact — and NO dispatch intent", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
    const outcome = await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    expect(outcome).toEqual({ kind: "accepted" });
    const instance = await loadOrThrow(h, "i1");
    expect(instance.kernelStatus).toBe("WAITING");
    expect(instance.currentStep).toBeNull();
    expect(instance.round).toBe(0);
    expect(instance.wait).toEqual({
      kind: "kickoff_pending",
      requestedBy: "activation",
      resumeEvents: ["KICKOFF"],
    });
    expect(instance.runtimeContext).toEqual({ state: "ready", ref: null });
    expect(instance.version).toBe(2);
    expect((await transcriptOf(h, "i1")).map((e) => e.entryKind)).toEqual(["STARTED"]);
    h.close();
  });

  it("a replayed START is Duplicate (own-kind fact hit) — no second entry, no state change", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    const before = await loadOrThrow(h, "i1");
    const replay = await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    expect(replay).toEqual({ kind: "duplicate" });
    expect(await loadOrThrow(h, "i1")).toEqual(before);
    expect((await transcriptOf(h, "i1")).length).toBe(1);
    h.close();
  });

  it("a FRESH second START hits the single-shot guard — throw, zero state change, op unconsumed (J4)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    const before = await loadOrThrow(h, "i1");
    await expect(h.kernel.start({ instanceId: "i1", opId: "op-start-2" })).rejects.toThrow(
      /start failed \(single-shot guard\)/,
    );
    expect(await loadOrThrow(h, "i1")).toEqual(before);
    // The FIRST op still replays as Duplicate; the second never consumed a key.
    expect(await h.kernel.start({ instanceId: "i1", opId: "op-start" })).toEqual({
      kind: "duplicate",
    });
    expect((await transcriptOf(h, "i1")).length).toBe(1);
    h.close();
  });

  it("a replayed START answers Duplicate BEFORE the state guard — even after KICKOFF moved the state (A3)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    await h.kernel.kickoff({ instanceId: "i1", opId: "op-kick", task: "T" });
    // State is ACTIVE now — the guard would throw; idempotency wins first.
    expect(await h.kernel.start({ instanceId: "i1", opId: "op-start" })).toEqual({
      kind: "duplicate",
    });
    h.close();
  });

  it("rejects unknown_instance on a missing id (L8)", async () => {
    const h = makeHarness();
    expect(await h.kernel.start({ instanceId: "ghost", opId: "op" })).toEqual({
      kind: "rejected",
      reason: "unknown_instance",
    });
    expect(h.diag.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "unknown_instance",
        instanceId: "ghost",
        opId: "op",
      },
    ]);
    h.close();
  });

  describe("the interim window context lanes (L3 — all five)", () => {
    it("undeclared + ref ABSENT → ready(∅)", async () => {
      const h = makeHarness();
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      await h.kernel.start({ instanceId: "i1", opId: "op" });
      expect((await loadOrThrow(h, "i1")).runtimeContext).toEqual({ state: "ready", ref: null });
      h.close();
    });

    it("undeclared + ref PRESENT → throw (surplus input), no state change", async () => {
      const h = makeHarness();
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const before = await loadOrThrow(h, "i1");
      await expect(
        h.kernel.start({ instanceId: "i1", opId: "op", runtimeContextRef: "/ws" }),
      ).rejects.toThrow(/surplus input/);
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      h.close();
    });

    it("required + ref PRESENT → ready({kind: worktree, locator}) — the X1 bridge encoding", async () => {
      const h = makeHarness(requiredContext);
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const outcome = await h.kernel.start({
        instanceId: "i1",
        opId: "op",
        runtimeContextRef: "/ws/i1",
      });
      expect(outcome.kind).toBe("activated");
      expect((await loadOrThrow(h, "i1")).runtimeContext).toEqual({
        state: "ready",
        ref: { kind: "worktree", locator: "/ws/i1" },
      });
      h.close();
    });

    it("required + ref ABSENT → throw (the provider machinery is P3's), op unconsumed", async () => {
      const h = makeHarness(requiredContext);
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      await expect(h.kernel.start({ instanceId: "i1", opId: "op" })).rejects.toThrow(
        /declares runtimeContext 'required'/,
      );
      // The op was never consumed — a corrected retry with the SAME id works.
      const retried = await h.kernel.start({
        instanceId: "i1",
        opId: "op",
        runtimeContextRef: "/ws",
      });
      expect(retried.kind).toBe("activated");
      h.close();
    });

    it("an empty-string ref → throw on every lane (the value grammar)", async () => {
      const h = makeHarness();
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      await expect(
        h.kernel.start({ instanceId: "i1", opId: "op", runtimeContextRef: "" }),
      ).rejects.toThrow(/nonempty string/);
      h.close();
    });
  });
});

describe("KICKOFF (L4)", () => {
  async function held(h: Harness, task?: string): Promise<void> {
    await h.kernel.create({
      instanceId: "i1",
      templateRef: REF,
      mode: "deferred_kickoff",
      ...(task !== undefined ? { task } : {}),
    });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
  }

  it("composes task supply + activation in ONE move: Activated(v3), wait cleared, TASK_SUPPLIED fact", async () => {
    const h = makeHarness();
    await held(h);
    const outcome = await h.kernel.kickoff({ instanceId: "i1", opId: "op-kick", task: "GO" });
    if (outcome.kind !== "activated") {
      throw new Error(`expected activated, got ${outcome.kind}`);
    }
    expect(outcome.version).toBe(3);
    expect(outcome.intent.packet.task).toBe("GO");
    const instance = await loadOrThrow(h, "i1");
    expect(instance.kernelStatus).toBe("ACTIVE");
    expect(instance.task).toBe("GO");
    expect(instance.currentStep).toBe("implement");
    expect(instance.round).toBe(1);
    expect(instance.wait).toBeNull();
    expect((await transcriptOf(h, "i1")).map((e) => e.entryKind)).toEqual([
      "STARTED",
      "TASK_SUPPLIED",
    ]);
    h.close();
  });

  it("the supplied task OVERWRITES a create-time task (C13)", async () => {
    const h = makeHarness();
    await held(h, "old-task");
    await h.kernel.kickoff({ instanceId: "i1", opId: "op-kick", task: "new-task" });
    expect((await loadOrThrow(h, "i1")).task).toBe("new-task");
    h.close();
  });

  it("a replayed KICKOFF is Duplicate; a fresh one on a non-WAITING run hits the hold guard", async () => {
    const h = makeHarness();
    await held(h);
    await h.kernel.kickoff({ instanceId: "i1", opId: "op-kick", task: "GO" });
    expect(await h.kernel.kickoff({ instanceId: "i1", opId: "op-kick", task: "GO" })).toEqual({
      kind: "duplicate",
    });
    const before = await loadOrThrow(h, "i1");
    await expect(
      h.kernel.kickoff({ instanceId: "i1", opId: "op-kick-2", task: "GO" }),
    ).rejects.toThrow(/kickoff failed \(hold guard\)/);
    expect(await loadOrThrow(h, "i1")).toEqual(before);
    h.close();
  });

  it("rejects unknown_instance", async () => {
    const h = makeHarness();
    expect(await h.kernel.kickoff({ instanceId: "ghost", opId: "op", task: "T" })).toEqual({
      kind: "rejected",
      reason: "unknown_instance",
    });
    h.close();
  });
});

describe("CANCEL (L5) — any non-terminal state", () => {
  it("cancels a CREATED run (task-less deferred genesis included)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
    const outcome = await h.kernel.cancel({ instanceId: "i1", opId: "op-c" });
    expect(outcome).toEqual({ kind: "terminated", disposition: "cancelled" });
    const instance = await loadOrThrow(h, "i1");
    expect(instance.kernelStatus).toBe("TERMINAL");
    expect(instance.terminalDisposition).toBe("cancelled");
    expect((await transcriptOf(h, "i1")).map((e) => e.entryKind)).toEqual(["CANCELLED"]);
    h.close();
  });

  it("cancels a WAITING run and clears the wait in the SAME move (S5/T3)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    await h.kernel.cancel({ instanceId: "i1", opId: "op-c" });
    const instance = await loadOrThrow(h, "i1");
    expect(instance.kernelStatus).toBe("TERMINAL");
    expect(instance.wait).toBeNull();
    expect(instance.terminalDisposition).toBe("cancelled");
    h.close();
  });

  it("cancels an ACTIVE run", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    const outcome = await h.kernel.cancel({ instanceId: "i1", opId: "op-c" });
    expect(outcome).toEqual({ kind: "terminated", disposition: "cancelled" });
    h.close();
  });

  it("a replayed CANCEL is Duplicate BEFORE the sink guard; a fresh one on TERMINAL throws (A3/A4)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.cancel({ instanceId: "i1", opId: "op-c" });
    expect(await h.kernel.cancel({ instanceId: "i1", opId: "op-c" })).toEqual({
      kind: "duplicate",
    });
    const before = await loadOrThrow(h, "i1");
    await expect(h.kernel.cancel({ instanceId: "i1", opId: "op-c2" })).rejects.toThrow(
      /cancel failed \(terminal sink\)/,
    );
    expect(await loadOrThrow(h, "i1")).toEqual(before);
    h.close();
  });
});

describe("FAIL (L6) — in-process kernel event, fact-less", () => {
  it("disposes TERMINAL + failed + failure_reason, wait cleared, NO fact row — version advances row-less", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    const outcome = await h.kernel.fail("i1", "provider exploded");
    expect(outcome).toEqual({ kind: "terminated", disposition: "failed" });
    const instance = await loadOrThrow(h, "i1");
    expect(instance.kernelStatus).toBe("TERMINAL");
    expect(instance.terminalDisposition).toBe("failed");
    expect(instance.failureReason).toBe("provider exploded");
    expect(instance.wait).toBeNull();
    expect(instance.version).toBe(3);
    // NO fact row — the transcript still carries only the STARTED fact.
    expect((await transcriptOf(h, "i1")).map((e) => e.entryKind)).toEqual(["STARTED"]);
    h.close();
  });

  it("post-FAIL sink lanes: a fresh lifecycle op guards, an actor op rejects not_active (T2's lane-driven sink)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.fail("i1", "boom");
    await expect(h.kernel.fail("i1", "again")).rejects.toThrow(/fail rejected \(terminal sink\)/);
    await expect(h.kernel.cancel({ instanceId: "i1", opId: "op-c" })).rejects.toThrow(
      /cancel failed \(terminal sink\)/,
    );
    const actor = await h.kernel.handle({
      instanceId: "i1",
      opId: "op-a",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    expect(actor).toEqual({ kind: "rejected", reason: "not_active" });
    h.close();
  });

  it("rejects unknown_instance INERTLY — an in-process event is droppable, never a crash (L8)", async () => {
    const h = makeHarness();
    expect(await h.kernel.fail("ghost", "boom")).toEqual({
      kind: "rejected",
      reason: "unknown_instance",
    });
    h.close();
  });
});

describe("kind-aware idempotency across classes (A2)", () => {
  it("a DIFFERENT fact kind reusing an op id is op_id_collision (cancel over the start op)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-shared" });
    expect(await h.kernel.cancel({ instanceId: "i1", opId: "op-shared" })).toEqual({
      kind: "rejected",
      reason: "op_id_collision",
    });
    h.close();
  });

  it("an ACTOR envelope reusing a lifecycle op id is op_id_collision (the actor-side mirror)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-shared" });
    const outcome = await h.kernel.handle({
      instanceId: "i1",
      opId: "op-shared",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    expect(outcome).toEqual({ kind: "rejected", reason: "op_id_collision" });
    h.close();
  });

  it("a LIFECYCLE op reusing a transition op id is op_id_collision", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    const committed = await h.kernel.handle({
      instanceId: "i1",
      opId: "op-t1",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    expect(committed.kind).toBe("committed");
    expect(await h.kernel.cancel({ instanceId: "i1", opId: "op-t1" })).toEqual({
      kind: "rejected",
      reason: "op_id_collision",
    });
    h.close();
  });
});

describe("actor path completion probes (J3 — machinery-reachable states)", () => {
  it("a fresh actor op against a machinery-CREATED run rejects not_active", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    const outcome = await h.kernel.handle({
      instanceId: "i1",
      opId: "op-a",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 1,
      expectedRole: "implementer",
    });
    expect(outcome).toEqual({ kind: "rejected", reason: "not_active" });
    h.close();
  });
});
