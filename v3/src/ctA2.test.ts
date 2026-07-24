import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  AdmittedTemplate,
  EventEnvelope,
  Outcome,
  TranscriptEntry,
  WorkflowInstance,
} from "./domain/index.js";
import { deriveActorEmitOpId, deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import type { AttemptExecutor, AttemptResult } from "./ports/delivery.js";
import { createStaticProviderRegistry } from "./ports/index.js";
import type { InstanceDetail } from "./ports/store.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedAttemptExecutor,
  createScriptedProcessGateRunner,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "./testkit/index.js";
import type { ScriptedAttemptStep } from "./testkit/index.js";
import { createDeliveryLoop, openErrandStore } from "./runner/index.js";
import type { DeliveryReadSeam, ErrandStore, ErrandStoreHandle } from "./runner/index.js";

// ── The IC-A2 contract family (packet ch9-p3a): CT-A2-CRASH (durable-prefix
// crash simulation), CT-A2-CONFIRM, CT-A2-RETRY-DURABLE, plus the errand-plane
// two-worker lanes (idempotent discovery, claim race via the CAS, the kernel
// Duplicate collapse through real ingress).

const gateCatalog = createGateRegistry();
function admitted(): AdmittedTemplate {
  const result = admitTemplate(fixtureTemplate(), gateCatalog);
  if (!result.ok) {
    throw new Error(`fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

const dirs: string[] = [];
function tempPath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-ct-a2-"));
  dirs.push(dir);
  return join(dir, name);
}
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const KEY = "inst-1@v2";

function mkInstance(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    instanceId: "inst-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "build",
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
    version: 2,
    ...overrides,
  };
}

function evidenceEntry(actorId: string, expectedVersion: number): TranscriptEntry {
  return {
    entryKind: "transition",
    seq: 1,
    envelope: {
      instanceId: "inst-1",
      opId: "op-e",
      type: "PASS",
      actorId,
      expectedVersion,
      expectedRole: "implementer",
      payload: {},
    },
    payloadDigest: "d",
    gateDecisions: [],
    issuedAgentConfig: {},
    committedAt: 1,
  };
}

class FakeSeam implements DeliveryReadSeam {
  private readonly runs = new Map<string, InstanceDetail>();
  listInstancesCalls = 0;
  set(instance: WorkflowInstance, transcript: readonly TranscriptEntry[] = []): void {
    this.runs.set(instance.instanceId, { instance, transcript });
  }
  listInstances(): Promise<readonly WorkflowInstance[]> {
    this.listInstancesCalls += 1;
    return Promise.resolve([...this.runs.values()].map((r) => r.instance));
  }
  loadInstance(id: string): Promise<WorkflowInstance | null> {
    return Promise.resolve(this.runs.get(id)?.instance ?? null);
  }
  getInstanceDetail(id: string): Promise<InstanceDetail | null> {
    return Promise.resolve(this.runs.get(id) ?? null);
  }
}

function loopOver(
  store: ErrandStore,
  seam: DeliveryReadSeam,
  opts: {
    script?: readonly ScriptedAttemptStep[];
    clockStart?: number;
    leaseMs?: number;
    workerId?: string;
    idPrefix?: string;
    executor?: AttemptExecutor;
  } = {},
) {
  const clock = createControlledClock(opts.clockStart ?? 1_000);
  let n = 0;
  return createDeliveryLoop(
    {
      errandStore: store,
      readSeam: seam,
      definitions: fixtureDefinitionStore(admitted()),
      providerRegistry: createStaticProviderRegistry({}),
      executor: opts.executor ?? createScriptedAttemptExecutor(opts.script ?? []),
      time: clock,
      wait: () => Promise.resolve(),
      attemptIdSource: () => `${opts.idPrefix ?? "att"}-${String(++n)}`,
      sessionNamer: (i, a) => `sess:${i}:${a}`,
      diag: noopDiagnosticsSink,
      workerId: opts.workerId ?? "worker",
    },
    { leaseMs: opts.leaseMs ?? 1_000 },
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CT-A2-CRASH — the window inventory (durable-prefix crash simulation)
// ─────────────────────────────────────────────────────────────────────────
describe("CT-A2-CRASH — after restart the durable errand row alone decides", () => {
  it("W1: post-B1-transaction, pre-executor-effect → reclaim to pending; the decrement STANDS", () => {
    const path = tempPath("errands.db");
    const clock = createControlledClock(1_000);
    const a: ErrandStoreHandle = openErrandStore(path, clock);
    a.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    a.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
    a.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "att-crash", sessionNamer: () => "s" });
    a.close(); // crash: handle abandoned mid-sequence

    const b = openErrandStore(path, createControlledClock(5_000));
    const seam = new FakeSeam();
    seam.set(mkInstance());
    return loopOver(b.store, seam, { clockStart: 5_000, leaseMs: 1_000, workerId: "fresh" })
      .poll()
      .then(() => {
        const row = b.store.getErrand("inst-1", KEY);
        expect(row?.state).toBe("pending");
        expect(row?.remainingBudget).toBe(2); // the crashed attempt's decrement stands
        expect(row?.activeAttemptId).toBeNull();
        b.close();
      });
  });

  it("W2: post-kernel-commit, pre-conclusion-write → CF1 evidence lands confirmed (attempt memory irrelevant)", async () => {
    const path = tempPath("errands.db");
    const a = openErrandStore(path, createControlledClock(1_000));
    a.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    a.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
    a.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "att", sessionNamer: () => "s" });
    a.close();

    const b = openErrandStore(path, createControlledClock(5_000));
    const seam = new FakeSeam();
    seam.set(mkInstance(), [evidenceEntry("codex", 2)]); // the durable committed row alone decides
    await loopOver(b.store, seam, { clockStart: 5_000, leaseMs: 1_000 }).poll();
    expect(b.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    b.close();
  });

  it("W3: post-claim, pre-attempt-start → reclaim to pending, budget INTACT", async () => {
    const path = tempPath("errands.db");
    const a = openErrandStore(path, createControlledClock(1_000));
    a.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    a.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
    a.close();

    const b = openErrandStore(path, createControlledClock(5_000));
    const seam = new FakeSeam();
    seam.set(mkInstance());
    await loopOver(b.store, seam, { clockStart: 5_000, leaseMs: 1_000 }).poll();
    const row = b.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("pending");
    expect(row?.remainingBudget).toBe(3); // never started an attempt — budget intact
    b.close();
  });

  it("W4: a post-reclaim stale attempt's negative is INERT while its committed evidence still promotes", () => {
    const h = openErrandStore(":memory:", createControlledClock(1_000));
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
    h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "stale", sessionNamer: () => "s" });
    // A lease reclaim starts a successor: the marker is cleared → pending.
    h.store.reclaim({ instanceId: "inst-1", contextPacketId: KEY, now: 5_000, leaseMs: 1_000, landing: "pending" });
    // The stale attempt's late negative conclusion demotes NOTHING.
    expect(h.store.concludeNegativeBudgeted({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "stale" }).applied).toBe(false);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("pending");
    // The stale attempt's committed evidence STILL promotes (attempt-independent).
    expect(h.store.concludeConfirmed({ instanceId: "inst-1", contextPacketId: KEY }).applied).toBe(true);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });

  it("W5: mid-re-spawn crash → the kind-aware reclaim lands unconfirmed, the frozen budget untouched", async () => {
    const path = tempPath("errands.db");
    const a = openErrandStore(path, createControlledClock(1_000));
    a.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    a.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000 });
    a.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
    a.store.concludeNoOutput({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "a" }); // unconfirmed, budget 2 frozen
    a.store.startRespawnAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000, attemptIdSource: () => "r", sessionNamer: () => "s" });
    a.close();

    const b = openErrandStore(path, createControlledClock(5_000));
    const seam = new FakeSeam();
    seam.set(mkInstance());
    await loopOver(b.store, seam, { clockStart: 5_000, leaseMs: 1_000 }).poll();
    const row = b.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("unconfirmed"); // L7: a respawn reclaim never lands pending
    expect(row?.remainingBudget).toBe(2); // the frozen budget is untouched
    b.close();
  });

  it("W6: crash between a name_collision report and the remint commit → the decrement STANDS (bounded)", async () => {
    const path = tempPath("errands.db");
    const a = openErrandStore(path, createControlledClock(1_000));
    a.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    a.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
    a.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "collided", sessionNamer: () => "s" });
    // name_collision reported, but the remint transaction never commits (crash).
    a.close();

    const b = openErrandStore(path, createControlledClock(5_000));
    const seam = new FakeSeam();
    seam.set(mkInstance());
    await loopOver(b.store, seam, { clockStart: 5_000, leaseMs: 1_000 }).poll();
    const row = b.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("pending"); // recovered via the lease path
    expect(row?.remainingBudget).toBe(2); // the collided attempt's decrement stands (bounded)
    b.close();
  });

  it("W7: crash mid-reconciliation-sweep → the next poll re-runs the sweep to completion (idempotent)", async () => {
    const path = tempPath("errands.db");
    const a = openErrandStore(path, createControlledClock(1_000));
    // A partial backfill: one confirmed row written, NO reconciliation mark.
    a.store.backfillConfirmed({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    a.close();

    const b = openErrandStore(path, createControlledClock(2_000));
    const seam = new FakeSeam();
    seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled", currentStep: "review", version: 4 }),
      [evidenceEntry("codex", 2)],
    );
    await loopOver(b.store, seam, { clockStart: 2_000 }).poll();
    const rows = b.store.listErrands();
    expect(rows).toHaveLength(2); // @v2 confirmed (no-op) + @v3 mooted (aggregate), marked
    expect(b.store.isReconciled("inst-1")).toBe(true);
    // Idempotent re-run.
    await loopOver(b.store, seam, { clockStart: 2_000 }).poll();
    expect(b.store.listErrands()).toHaveLength(2);
    b.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CT-A2-CONFIRM — no_output → unconfirmed: frozen, distinct, never auto-retried
// ─────────────────────────────────────────────────────────────────────────
describe("CT-A2-CONFIRM — the no-output conclusion lands unconfirmed", () => {
  it("unconfirmed is non-terminal, frozen-budget, never auto-retried across N ticks, distinct from every sibling", async () => {
    const h = openErrandStore(":memory:", createControlledClock(1_000));
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const loop = loopOver(h.store, seam, { script: [{ kind: "no_output" }] });
    await loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
    const frozenBudget = h.store.getErrand("inst-1", KEY)?.remainingBudget;
    // The poll leaves it untouched across N ticks (never auto-retried).
    for (let i = 0; i < 4; i += 1) {
      await loop.tick();
    }
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("unconfirmed");
    expect(row?.state).not.toBe("confirmed");
    expect(row?.state).not.toBe("exhausted");
    expect(row?.state).not.toBe("mooted");
    expect(row?.remainingBudget).toBe(frozenBudget); // frozen
    h.close();
  });

  it("the re-spawn edge is its only errand-level exit — the respawned attempt ACTUALLY starts/executes under the frozen budget", async () => {
    const h = openErrandStore(":memory:", createControlledClock(1_000));
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const exec = createScriptedAttemptExecutor([{ kind: "no_output" }, { kind: "no_output" }]);
    const loop = loopOver(h.store, seam, { executor: exec });
    await loop.tick(); // att-1 no_output → unconfirmed
    const frozen = h.store.getErrand("inst-1", KEY)?.remainingBudget;
    const callsBefore = exec.calls.length;
    await loop.respawn("inst-1", KEY); // must START + EXECUTE the fresh attempt (no-op respawn would not)
    expect(exec.calls.length).toBe(callsBefore + 1); // the respawned attempt was executed
    expect(exec.calls[exec.calls.length - 1]?.input.attemptId).toBe("att-2");
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed"); // silent respawn → unconfirmed
    expect(h.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(frozen); // frozen
    h.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CT-A2-RETRY-DURABLE — the budget crosses a full restart
// ─────────────────────────────────────────────────────────────────────────
describe("CT-A2-RETRY-DURABLE — the budget's durable life crosses a restart", () => {
  it("a fresh worker CONTINUES from the remaining budget (never resets) and honors exhaustion across the boundary", async () => {
    const path = tempPath("errands.db");
    const seam = new FakeSeam();
    seam.set(mkInstance());

    // Worker A: one budgeted infra attempt (3 → 2), then crash.
    const a = openErrandStore(path, createControlledClock(1_000));
    await loopOver(a.store, seam, { script: [{ kind: "infra_failure", class: "nonzero_exit" }] }).tick();
    expect(a.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(2);
    a.close();

    // Worker B (fresh handle, same file): continues from 2 — NOT reset to 3.
    const b = openErrandStore(path, createControlledClock(1_000));
    const loopB = loopOver(b.store, seam, {
      script: [
        { kind: "infra_failure", class: "nonzero_exit" },
        { kind: "infra_failure", class: "nonzero_exit" },
      ],
    });
    await loopB.tick(); // 2 → 1
    expect(b.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(1);
    await loopB.tick(); // 1 → 0 → exhausted (honored across the restart boundary)
    expect(b.store.getErrand("inst-1", KEY)?.state).toBe("exhausted");
    b.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Two-worker (errand-plane): one errand file + one kernel store
// ─────────────────────────────────────────────────────────────────────────
function realEnvelope(instanceId: string, expectedVersion: number, actorId: string): EventEnvelope {
  const contextPacketId = `${instanceId}@v${String(expectedVersion)}`;
  const { opId } = deriveActorEmitOpId({ instanceId, contextPacketId, opType: "PASS", payload: {} });
  return {
    instanceId,
    opId,
    type: "PASS",
    actorId,
    expectedVersion,
    expectedRole: "implementer",
    payload: {},
  };
}

describe("Two-worker (errand-plane): one errand file, one kernel store", () => {
  it("idempotent discovery: two loops over ONE errand file create exactly one row", async () => {
    const errandPath = tempPath("errands.db");
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const wa = openErrandStore(errandPath, createControlledClock(1_000));
    const wb = openErrandStore(errandPath, createControlledClock(1_000));
    const aLoop = loopOver(wa.store, seam, { workerId: "A", idPrefix: "a" });
    const bLoop = loopOver(wb.store, seam, { workerId: "B", idPrefix: "b" });
    await Promise.all([aLoop.poll(), bLoop.poll()]);
    // B ACTIVELY discovered too — an observable only worker B's own pass can
    // produce (a no-op B leaves this at 1, not 2).
    expect(seam.listInstancesCalls).toBe(2);
    // …and the concurrent discovery still collapses to exactly one row (the
    // other direction: idempotency under two concurrent creators).
    expect(wa.store.listErrands()).toHaveLength(1);
    expect(wb.store.listErrands()).toHaveLength(1);
    wa.close();
    wb.close();
  });

  it("claim race: two racing workers settle by scheduling — exactly one ATTEMPTS, one disposition, both read it", async () => {
    const errandPath = tempPath("errands.db");
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const committed: Outcome = { kind: "committed", version: 3, intent: null };
    const execA = createScriptedAttemptExecutor([{ kind: "submitted", outcome: committed }]);
    const execB = createScriptedAttemptExecutor([{ kind: "submitted", outcome: committed }]);
    const wa = openErrandStore(errandPath, createControlledClock(1_000));
    const wb = openErrandStore(errandPath, createControlledClock(1_000));
    const aLoop = loopOver(wa.store, seam, { workerId: "A", idPrefix: "a", executor: execA });
    const bLoop = loopOver(wb.store, seam, { workerId: "B", idPrefix: "b", executor: execB });
    await Promise.all([aLoop.tick(), bLoop.tick()]);
    const rows = wa.store.listErrands();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.state).toBe("confirmed"); // one disposition, no double-create
    // The claim CAS let exactly ONE worker attempt; the loser never
    // double-submitted (correctness rests on scheduling only, REV-B).
    expect(execA.calls.length + execB.calls.length).toBe(1);
    // BOTH workers ACTIVELY ran their pass and CONTESTED the claim — an
    // observable only B's own participation produces (a no-op B → 1, not 2).
    expect(seam.listInstancesCalls).toBe(2);
    // The SECOND worker's outcome: it observes the SAME confirmed truth (one
    // errand, both handles), never a conflicting disposition of its own.
    expect(wb.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    wa.close();
    wb.close();
  });

  it("kernel Duplicate collapse: re-delivery of the same op is a kernel duplicate (op_id), errand confirmed", async () => {
    const kernelPath = tempPath("kernel.db");
    const errandPath = tempPath("errands.db");
    const handle = openStore(kernelPath, createControlledClock(1_000));

    // Create + start through the kernel (the twoWorker wiring shape).
    const k = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: fixtureDefinitionStore(admitted()),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: noopDiagnosticsSink,
    });
    const ing = createIngress({ kernel: k, diag: noopDiagnosticsSink });
    const created = await k.create({ instanceId: "inst-1", templateRef: { id: "local-pair-v0", version: 1 }, task: "t" });
    expect(created.kind).toBe("created");
    const started = await k.start({ instanceId: "inst-1", opId: "op-start" });
    expect(started.kind).toBe("activated");

    // A REAL-submitting executor: it derives the op from the contextPacketId
    // (ADR-004) and submits through ingress — re-delivery re-derives the SAME
    // op_id by construction, so the kernel collapses it to Duplicate.
    const realExecutor: AttemptExecutor = {
      async execute(input) {
        const p = input.intent.packet;
        const envelope = realEnvelope(p.instanceId, p.expectedVersion, input.intent.actor);
        const outcome: Outcome = await ing.submit(envelope);
        const result: AttemptResult = { kind: "submitted", outcome };
        return result;
      },
    };

    const errand = openErrandStore(errandPath, createControlledClock(1_000));
    const loop = loopOver(errand.store, handle.store, { executor: realExecutor });
    await loop.tick(); // discover (v2) → claim → attempt → real submit (committed) → confirmed
    expect(errand.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");

    // The kernel committed exactly one PASS transition at v2; a second delivery
    // of the SAME op is a Duplicate (the content-addressed op_id collapse).
    const second = await ing.submit(realEnvelope("inst-1", 2, "codex"));
    expect(second.kind).toBe("duplicate");
    errand.close();
    handle.close();
  });
});
