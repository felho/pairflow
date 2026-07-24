import { describe, expect, it } from "vitest";

import { admitTemplate } from "../definition/index.js";
import type {
  AdmittedTemplate,
  EventEnvelope,
  Outcome,
  RuntimeContextProjection,
  RuntimeContextRef,
  TranscriptEntry,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import { createGateRegistry } from "../gates/index.js";
import { deriveDispatchIntent } from "../kernel/dispatchIntent.js";
import type { AttemptResult } from "../ports/delivery.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { DiagnosticEventBody, DiagnosticsSink } from "../ports/diagnostics.js";
import { createStaticProviderRegistry } from "../ports/index.js";
import type {
  LocalExecutionCapability,
  ProviderRegistry,
  RuntimeContextProvider,
} from "../ports/runtimeContextProvider.js";
import type { InstanceDetail } from "../ports/store.js";
import {
  createControlledClock,
  createRecordingDiagnosticsSink,
  createScriptedAttemptExecutor,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import type { ScriptedAttemptExecutor, ScriptedAttemptStep } from "../testkit/index.js";
import { createDeliveryLoop, createErrandReader } from "./index.js";
import type { DeliveryLoop, DeliveryReadSeam, DeliveryWait } from "./index.js";
import { openErrandStore } from "./errandStore.js";
import type { ErrandStore } from "./errandStore.js";

// ── The D/L/CF/B/K/DG families (packet ch9-p3a): the delivery loop over the
// durable ledger, driven by a scripted executor + a fake read seam.

const gateCatalog = createGateRegistry();
function admitted(): AdmittedTemplate {
  const result = admitTemplate(fixtureTemplate(), gateCatalog);
  if (!result.ok) {
    throw new Error(`fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

function mkInstance(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    instanceId: "inst-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "build the thing",
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

function mkTransition(
  seq: number,
  actorId: string,
  expectedVersion: number,
  type = "PASS",
): TranscriptEntry {
  const envelope: EventEnvelope = {
    instanceId: "inst-1",
    opId: `op-${String(seq)}`,
    type,
    actorId,
    expectedVersion,
    expectedRole: "implementer",
    payload: { note: `${actorId}@${String(expectedVersion)}` },
  };
  return {
    entryKind: "transition",
    seq,
    envelope,
    payloadDigest: "digest",
    gateDecisions: [],
    issuedAgentConfig: {},
    committedAt: 1,
  };
}

/** A mutable in-memory read seam (the fake kernel store projection). */
class FakeSeam implements DeliveryReadSeam {
  private readonly runs = new Map<string, InstanceDetail>();
  detailCalls = 0;

  set(instance: WorkflowInstance, transcript: readonly TranscriptEntry[] = []): void {
    this.runs.set(instance.instanceId, { instance, transcript });
  }

  patch(instanceId: string, overrides: Partial<WorkflowInstance>): void {
    const run = this.runs.get(instanceId);
    if (run === undefined) {
      throw new Error(`FakeSeam.patch: unknown instance '${instanceId}'`);
    }
    this.runs.set(instanceId, {
      instance: { ...run.instance, ...overrides },
      transcript: run.transcript,
    });
  }

  addTransition(instanceId: string, entry: TranscriptEntry): void {
    const run = this.runs.get(instanceId);
    if (run === undefined) {
      throw new Error(`FakeSeam.addTransition: unknown instance '${instanceId}'`);
    }
    this.runs.set(instanceId, {
      instance: run.instance,
      transcript: [...run.transcript, entry],
    });
  }

  remove(instanceId: string): void {
    this.runs.delete(instanceId);
  }

  listInstances(): Promise<readonly WorkflowInstance[]> {
    return Promise.resolve([...this.runs.values()].map((r) => r.instance));
  }

  loadInstance(instanceId: string): Promise<WorkflowInstance | null> {
    return Promise.resolve(this.runs.get(instanceId)?.instance ?? null);
  }

  getInstanceDetail(instanceId: string): Promise<InstanceDetail | null> {
    this.detailCalls += 1;
    return Promise.resolve(this.runs.get(instanceId) ?? null);
  }
}

interface Harness {
  readonly loop: DeliveryLoop;
  readonly store: ErrandStore;
  readonly seam: FakeSeam;
  readonly diag: DiagnosticsSink;
  readonly events: DiagnosticEventBody[];
  readonly executor: ScriptedAttemptExecutor;
  readonly close: () => void;
}

interface WireOptions {
  readonly script?: readonly ScriptedAttemptStep[];
  readonly observe?: (input: { attemptId: string }) => void;
  readonly definitions?: DefinitionStore;
  readonly providerRegistry?: ProviderRegistry;
  readonly diag?: DiagnosticsSink;
  readonly leaseMs?: number;
  readonly attemptsPerErrand?: number;
  readonly clockStart?: number;
  readonly workerId?: string;
  readonly store?: ErrandStore;
  readonly seam?: FakeSeam;
  readonly idPrefix?: string;
}

function wire(opts: WireOptions = {}): Harness {
  const clock = createControlledClock(opts.clockStart ?? 1_000);
  const handle = opts.store === undefined ? openErrandStore(":memory:", clock) : null;
  const store = opts.store ?? handle!.store;
  const seam = opts.seam ?? new FakeSeam();
  const recording = createRecordingDiagnosticsSink();
  const diag = opts.diag ?? recording.sink;
  let attemptCounter = 0;
  const idPrefix = opts.idPrefix ?? "att";
  const observe = opts.observe;
  const executor = createScriptedAttemptExecutor(
    opts.script ?? [],
    observe !== undefined ? { observe: (input) => observe({ attemptId: input.attemptId }) } : {},
  );
  const loop = createDeliveryLoop(
    {
      errandStore: store,
      readSeam: seam,
      definitions: opts.definitions ?? fixtureDefinitionStore(admitted()),
      providerRegistry: opts.providerRegistry ?? createStaticProviderRegistry({}),
      executor,
      time: clock,
      wait: () => Promise.resolve(),
      attemptIdSource: () => `${idPrefix}-${String(++attemptCounter)}`,
      sessionNamer: (instanceId, attemptId) => `sess:${instanceId}:${attemptId}`,
      diag,
      workerId: opts.workerId ?? "worker-A",
    },
    {
      ...(opts.leaseMs !== undefined ? { leaseMs: opts.leaseMs } : {}),
      ...(opts.attemptsPerErrand !== undefined ? { attemptsPerErrand: opts.attemptsPerErrand } : {}),
    },
  );
  return {
    loop,
    store,
    seam,
    diag,
    events: recording.events,
    executor,
    close: () => handle?.close(),
  };
}

const KEY = "inst-1@v2";
const committed: Outcome = { kind: "committed", version: 3, intent: null };
const submitted = (outcome: Outcome): AttemptResult => ({ kind: "submitted", outcome });

// ─────────────────────────────────────────────────────────────────────────
// D — discovery
// ─────────────────────────────────────────────────────────────────────────
describe("D — discovery / identity", () => {
  it("D1: exactly the ACTIVE instances acquire live rows; CREATED/WAITING/TERMINAL acquire none", async () => {
    const h = wire();
    h.seam.set(mkInstance({ instanceId: "act", kernelStatus: "ACTIVE" }));
    h.seam.set(mkInstance({ instanceId: "cre", kernelStatus: "CREATED", currentStep: null }));
    h.seam.set(mkInstance({ instanceId: "wai", kernelStatus: "WAITING", currentStep: null }));
    h.seam.set(mkInstance({ instanceId: "ter", kernelStatus: "TERMINAL", terminalDisposition: "done" }));
    await h.loop.poll();
    const ids = h.store.listErrands().map((e) => e.instanceId);
    expect(ids).toEqual(["act"]);
    expect(h.store.getErrand("act", "act@v2")?.state).toBe("pending");
    h.close();
  });

  it("D2: the key is <instance_id>@v<version>, the SAME value deriveDispatchIntent projects", async () => {
    const h = wire();
    const instance = mkInstance({ version: 2 });
    h.seam.set(instance);
    await h.loop.poll();
    const errand = h.store.listErrands()[0];
    expect(errand?.contextPacketId).toBe(`${instance.instanceId}@v${String(instance.version)}`);
    const intent = deriveDispatchIntent(instance, admitted(), "implement", createStaticProviderRegistry({}));
    expect(intent.packet.expectedVersion).toBe(instance.version);
    expect(errand?.expectedVersion).toBe(intent.packet.expectedVersion);
    expect(errand?.actorId).toBe("codex"); // the current-step role binding (D3)
    h.close();
  });

  it("D3: N polls create at most one row per key (idempotent)", async () => {
    const h = wire();
    h.seam.set(mkInstance());
    await h.loop.poll();
    await h.loop.poll();
    await h.loop.poll();
    expect(h.store.listErrands()).toHaveLength(1);
    // Only ONE create event emitted.
    expect(h.events.filter((e) => e.errandEdge === "create")).toHaveLength(1);
    h.close();
  });

  it("D4: run() runs one pass per wait cycle and hands the configured pollMs to the wait", async () => {
    const msSeen: number[] = [];
    let calls = 0;
    const wait: DeliveryWait = (ms) => {
      msSeen.push(ms);
      calls += 1;
      return calls >= 2 ? Promise.reject(new Error("stop")) : Promise.resolve();
    };
    const clock = createControlledClock(1_000);
    const handle = openErrandStore(":memory:", clock);
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const loop = createDeliveryLoop(
      {
        errandStore: handle.store,
        readSeam: seam,
        definitions: fixtureDefinitionStore(admitted()),
        providerRegistry: createStaticProviderRegistry({}),
        executor: createScriptedAttemptExecutor([submitted(committed), submitted({ kind: "duplicate" })]),
        time: clock,
        wait,
        attemptIdSource: () => "a",
        sessionNamer: () => "s",
        diag: createRecordingDiagnosticsSink().sink,
        workerId: "w",
      },
      { pollMs: 250 },
    );
    await loop.run();
    expect(msSeen).toEqual([250, 250]); // one wait per tick, the configured pollMs
    expect(handle.store.getErrand("inst-1", KEY)?.state).toBe("confirmed"); // ticks ran
    handle.close();
  });

  it("D5: a run read TERMINAL moots every non-terminal errand of that run (per state)", async () => {
    for (const setup of ["pending", "claimed", "attempting", "unconfirmed"] as const) {
      const h = wire({ script: [{ kind: "no_output" }] });
      h.seam.set(mkInstance());
      await h.loop.poll(); // pending
      if (setup !== "pending") {
        h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000 });
      }
      if (setup === "attempting") {
        h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
      }
      if (setup === "unconfirmed") {
        h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000 });
        h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
        h.store.concludeNoOutput({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "a" });
      }
      h.seam.patch("inst-1", { kernelStatus: "TERMINAL", terminalDisposition: "cancelled" });
      await h.loop.poll(); // moot pass observes terminal
      expect(h.store.getErrand("inst-1", KEY)?.state, setup).toBe("mooted");
      h.close();
    }
  });

  it("D5: a mootable errand on a terminal run WITH late evidence flips confirmed, wearing the moot trigger label", async () => {
    const h = wire();
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    h.seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled" }),
      [mkTransition(1, "codex", 2)],
    );
    await h.loop.poll();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed"); // CF1 first, never mooted
    // The D5-poll terminal context labels the precedence hit "moot" (L1).
    expect(h.events.some((e) => e.errandEdge === "moot" && e.errandTo === "confirmed")).toBe(true);
    expect(h.events.some((e) => e.errandEdge === "evidence-promotion")).toBe(false);
    h.close();
  });

  it("D5 race: a stale live insert into a just-terminal run normalizes to mooted next tick", async () => {
    const h = wire();
    // A row inserted from a stale ACTIVE read; the run is already terminal.
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    h.seam.set(mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled" }));
    await h.loop.poll();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
    h.close();
  });
});

describe("D6 — the intent re-derivation integrity throws propagate fail-closed", () => {
  it("a missing pinned template throws out of the pass; the errand is unmutated", async () => {
    const h = wire({ script: [submitted(committed)], definitions: fixtureDefinitionStore() /* empty */ });
    h.seam.set(mkInstance());
    // discovery ITSELF resolves the actor via definitions.load — a missing
    // template is a discovery-creation integrity throw.
    await expect(h.loop.poll()).rejects.toThrow(/template.*not found/);
    expect(h.store.listErrands()).toHaveLength(0); // nothing committed
    h.close();
  });

  it("a provider-projection gate throw at attempt-start propagates; the errand row stays claimed", async () => {
    // A provisioned ref whose provider is absent from the registry → the
    // registry-stable-for-the-run integrity throw inside deriveDispatchIntent.
    const h = wire({ script: [submitted(committed)] });
    h.seam.set(
      mkInstance({ runtimeContext: { state: "ready", ref: { kind: "worktree", locator: "x" } } }),
    );
    await h.loop.poll(); // discovery does NOT derive the full intent (actor only) → succeeds
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("pending");
    // work() derives the full intent → the projection gate throws fail-closed.
    await expect(h.loop.tick()).rejects.toThrow(/kernel integrity/);
    // The errand was claimed but never advanced to attempting (no decrement).
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("claimed");
    expect(row?.remainingBudget).toBe(3);
    h.close();
  });
});

describe("D7 — the terminal reconciliation sweep + the totality AUDIT (F9)", () => {
  it("a consumed-but-never-discovered dispatch acquires a terminal_backfill CONFIRMED row", async () => {
    const h = wire();
    // A run that reached DONE: two consumed dispatches (@v2 by codex, @v3 by claude).
    h.seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done", version: 4 }),
      [mkTransition(1, "codex", 2), mkTransition(2, "claude", 3, "CONVERGED")],
    );
    await h.loop.poll();
    const rows = h.store.listErrands();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.state === "confirmed" && r.discovery === "terminal_backfill")).toBe(true);
    // AUDIT: rows == transition-row count + 0 (a `done` run fires no aggregate).
    expect(rows).toHaveLength(2);
    expect(h.store.isReconciled("inst-1")).toBe(true);
    h.close();
  });

  it("a run cancelled mid-dispatch acquires its aggregate-proven terminal_backfill MOOTED row; AUDIT exact", async () => {
    const h = wire();
    // PASS committed @v2 (transition), reviewer dispatched @v3, CANCEL @v3→v4.
    h.seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled", currentStep: "review", version: 4 }),
      [mkTransition(1, "codex", 2)],
    );
    await h.loop.poll();
    const rows = h.store.listErrands();
    // AUDIT: 1 transition row + 1 (aggregate fires: cancelled ∧ currentStep≠null) = 2.
    expect(rows).toHaveLength(2);
    const confirmed = rows.find((r) => r.state === "confirmed");
    const mooted = rows.find((r) => r.state === "mooted");
    expect(confirmed?.contextPacketId).toBe("inst-1@v2");
    expect(mooted?.contextPacketId).toBe("inst-1@v3"); // keyed at version-1
    expect(mooted?.actorId).toBe("claude"); // the surviving currentStep's role binding
    h.close();
  });

  it("a run cancelled while kickoff-pending (currentStep null) acquires NO dispatch row (aggregate negative)", async () => {
    const h = wire();
    h.seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled", currentStep: null, task: null, version: 2 }),
      [],
    );
    await h.loop.poll();
    expect(h.store.listErrands()).toHaveLength(0);
    expect(h.store.isReconciled("inst-1")).toBe(true);
    h.close();
  });

  it("a reconciled run is never re-walked (the skip gate), and the sweep is idempotent under re-run (W7)", async () => {
    const h = wire();
    h.seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled", currentStep: "review", version: 4 }),
      [mkTransition(1, "codex", 2)],
    );
    await h.loop.poll();
    await h.loop.poll();
    await h.loop.poll();
    // Idempotent: still exactly two rows, still marked, no backfill re-emitted.
    expect(h.store.listErrands()).toHaveLength(2);
    expect(h.events.filter((e) => e.errandEdge === "reconcile-backfill")).toHaveLength(2);
    h.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CF — confirmation / evidence
// ─────────────────────────────────────────────────────────────────────────
describe("CF1 — the evidence predicate + its three discriminating negatives", () => {
  async function restingUnconfirmed(seam: FakeSeam, store: ErrandStore, loop: DeliveryLoop): Promise<void> {
    seam.set(mkInstance());
    await loop.tick(); // no_output → unconfirmed
    expect(store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
  }

  it("positive: a transition at expected_version by actor_id → confirmed (read-time flip)", async () => {
    const h = wire({ script: [{ kind: "no_output" }] });
    await restingUnconfirmed(h.seam, h.store, h.loop);
    h.seam.addTransition("inst-1", mkTransition(1, "codex", 2));
    const reader = createErrandReader(h.store, h.seam, h.diag);
    expect((await reader.getErrand("inst-1", KEY))?.state).toBe("confirmed");
    h.close();
  });

  it("negative: a lifecycle FACT at the version is not evidence", async () => {
    const h = wire({ script: [{ kind: "no_output" }] });
    await restingUnconfirmed(h.seam, h.store, h.loop);
    // A fact row (entryKind != transition) at v2 is NOT evidence.
    h.seam.addTransition("inst-1", { entryKind: "CANCELLED", seq: 1, opId: "c", committedAt: 1 });
    const reader = createErrandReader(h.store, h.seam, h.diag);
    expect((await reader.getErrand("inst-1", KEY))?.state).toBe("unconfirmed");
    h.close();
  });

  it("negative: a transition by a DIFFERENT actor is not evidence", async () => {
    const h = wire({ script: [{ kind: "no_output" }] });
    await restingUnconfirmed(h.seam, h.store, h.loop);
    h.seam.addTransition("inst-1", mkTransition(1, "claude", 2));
    const reader = createErrandReader(h.store, h.seam, h.diag);
    expect((await reader.getErrand("inst-1", KEY))?.state).toBe("unconfirmed");
    h.close();
  });

  it("negative: a transition at a DIFFERENT version is not evidence", async () => {
    const h = wire({ script: [{ kind: "no_output" }] });
    await restingUnconfirmed(h.seam, h.store, h.loop);
    h.seam.addTransition("inst-1", mkTransition(1, "codex", 3));
    const reader = createErrandReader(h.store, h.seam, h.diag);
    expect((await reader.getErrand("inst-1", KEY))?.state).toBe("unconfirmed");
    h.close();
  });
});

describe("CF2 — the total, disjoint submitted-outcome classification", () => {
  async function runWith(step: ScriptedAttemptStep): Promise<Harness> {
    const h = wire({ script: [step] });
    h.seam.set(mkInstance());
    await h.loop.tick();
    return h;
  }

  it("committed → confirmed", async () => {
    const h = await runWith(submitted(committed));
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });

  it("duplicate → confirmed (dominant even from a terminal run)", async () => {
    // The attempt starts on an ACTIVE run; the run goes TERMINAL mid-attempt
    // (the observe hook fires inside execute() before the duplicate result);
    // duplicate still wins → confirmed (evidence exists), never mooted.
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const h = wire({
      seam,
      script: [submitted({ kind: "duplicate" })],
      observe: () => seam.patch("inst-1", { kernelStatus: "TERMINAL", terminalDisposition: "cancelled" }),
    });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });

  it("rejected(not_active) → mooted (no evidence)", async () => {
    const h = await runWith(submitted({ kind: "rejected", reason: "not_active" }));
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
    h.close();
  });

  it("no_output → unconfirmed", async () => {
    const h = await runWith({ kind: "no_output" });
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
    expect(h.store.getErrand("inst-1", KEY)?.recordedAdmitOutcome).toBeNull();
    h.close();
  });

  it("stale → unconfirmed with recorded_admit_outcome='stale'", async () => {
    const h = await runWith(submitted({ kind: "stale", currentVersion: 5 }));
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("unconfirmed");
    expect(row?.recordedAdmitOutcome).toBe("stale");
    h.close();
  });

  it("a non-duplicate rejection → unconfirmed with recorded_admit_outcome=<RejectionName>", async () => {
    const h = await runWith(submitted({ kind: "rejected", reason: "not_authorized" }));
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("unconfirmed");
    expect(row?.recordedAdmitOutcome).toBe("not_authorized");
    h.close();
  });

  it("op_id_collision from a still-active run lands unconfirmed; the poll backstop moots it once terminal", async () => {
    const h = wire({ script: [submitted({ kind: "rejected", reason: "op_id_collision" })] });
    h.seam.set(mkInstance());
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.recordedAdmitOutcome).toBe("op_id_collision");
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
    // Terminal → the poll's moot backstop.
    h.seam.patch("inst-1", { kernelStatus: "TERMINAL", terminalDisposition: "cancelled" });
    await h.loop.poll();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
    h.close();
  });
});

describe("CF3 — read-time flip from EACH resting state (through the reader facade only)", () => {
  it("unconfirmed / exhausted / mooted → confirmed on late evidence; a create/reconcile flip emits evidence-promotion", async () => {
    for (const setup of ["unconfirmed", "exhausted", "mooted"] as const) {
      const h = wire({ script: [{ kind: "no_output" }] });
      h.seam.set(mkInstance());
      await h.loop.poll();
      if (setup === "unconfirmed") {
        await h.loop.tick(); // no_output
      } else if (setup === "mooted") {
        h.store.concludeMooted({ instanceId: "inst-1", contextPacketId: KEY });
      } else {
        h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1 });
        for (const id of ["a", "b", "c"]) {
          h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1, attemptIdSource: () => id, sessionNamer: () => "s" });
          h.store.concludeNegativeBudgeted({ instanceId: "inst-1", contextPacketId: KEY, attemptId: id });
          h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1 });
        }
        h.store.exhaustAtClaim({ instanceId: "inst-1", contextPacketId: KEY });
        expect(h.store.getErrand("inst-1", KEY)?.state).toBe("exhausted");
      }
      // Late evidence appears.
      h.seam.addTransition("inst-1", mkTransition(9, "codex", 2));
      const reader = createErrandReader(h.store, h.seam, h.diag);
      expect((await reader.getErrand("inst-1", KEY))?.state, setup).toBe("confirmed");
      expect(h.events.some((e) => e.errandEdge === "evidence-promotion" && e.errandFrom === setup)).toBe(true);
      h.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// B — budget / attempts
// ─────────────────────────────────────────────────────────────────────────
describe("B — budget / attempts", () => {
  it("B1: the decrement PRECEDES the executor invocation (observable mid-attempt)", async () => {
    let budgetMid: number | undefined;
    const store = openErrandStore(":memory:", createControlledClock(1_000)).store;
    const h = wire({
      store,
      script: [{ kind: "no_output" }],
      observe: () => {
        budgetMid = store.getErrand("inst-1", KEY)?.remainingBudget;
      },
    });
    h.seam.set(mkInstance());
    await h.loop.tick();
    expect(budgetMid).toBe(2); // 3 → 2 BEFORE execute() ran
    h.close();
  });

  it("B3: an infra failure on a BUDGETED attempt returns the errand to pending (budget remains)", async () => {
    const h = wire({ script: [{ kind: "infra_failure", class: "nonzero_exit" }] });
    h.seam.set(mkInstance());
    await h.loop.tick();
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("pending");
    expect(row?.remainingBudget).toBe(2);
    h.close();
  });

  it("B3: no_output lands unconfirmed on BOTH kinds (never pending)", async () => {
    const h = wire({ script: [{ kind: "no_output" }, { kind: "no_output" }] });
    h.seam.set(mkInstance());
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
    await h.loop.respawn("inst-1", KEY); // respawn attempt → no_output again
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
    h.close();
  });

  it("B4: exhaustion fires only after the double final check; the exhaust edge lands exhausted", async () => {
    const h = wire({
      script: [
        { kind: "infra_failure", class: "nonzero_exit" },
        { kind: "infra_failure", class: "nonzero_exit" },
        { kind: "infra_failure", class: "nonzero_exit" },
      ],
      attemptsPerErrand: 3,
    });
    h.seam.set(mkInstance());
    await h.loop.tick(); // 3→2, pending
    await h.loop.tick(); // 2→1, pending
    await h.loop.tick(); // 1→0, exhaust
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("exhausted");
    h.close();
  });

  it("B4 rescue: late evidence at the exhaust point lands confirmed, never exhausted", async () => {
    // ch9-P3b (H5): the front evidence gate would shadow evidence present
    // BEFORE the start, so the exhaust-point double-check stays DRIVEN only if
    // evidence lands MID-EXECUTE — added inside the final attempt via observe,
    // AFTER the front check ran clean.
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const h = wire({
      seam,
      script: [
        { kind: "infra_failure", class: "nonzero_exit" },
        { kind: "infra_failure", class: "nonzero_exit" },
        { kind: "infra_failure", class: "nonzero_exit" },
      ],
      observe: ({ attemptId }) => {
        if (attemptId === "att-3") {
          seam.addTransition("inst-1", mkTransition(1, "codex", 2));
        }
      },
    });
    await h.loop.tick();
    await h.loop.tick();
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    // The exhaust-point double-check (not the front gate) is the driven lane:
    // the confirm rode the attempt's OWN conclusion (an attempt-scoped edge).
    expect(h.events.some((e) => e.errandEdge === "confirm" && e.errandTo === "confirmed")).toBe(
      true,
    );
    expect(h.events.some((e) => e.errandEdge === "evidence-at-claim")).toBe(false);
    h.close();
  });

  it("B4: the zero-budget claim resolution (exhaust-at-claim) resolves a claimed budget-0 errand", async () => {
    // attemptsPerErrand 0 → a claimed errand cannot start a budgeted attempt.
    const h = wire({ attemptsPerErrand: 0 });
    h.seam.set(mkInstance());
    await h.loop.tick(); // discover (budget 0) → claim → exhaust-at-claim (no evidence, not terminal)
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("exhausted");
    expect(h.events.some((e) => e.errandEdge === "exhaust-at-claim")).toBe(true);
    h.close();
  });

  it("B4 rescue: the zero-budget resolution lands confirmed on late evidence, emitting the exhaust-at-claim edge", async () => {
    const h = wire({ attemptsPerErrand: 0 });
    h.seam.set(mkInstance(), [mkTransition(1, "codex", 2)]);
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    // L1: the precedence hit inside the exhaust-at-claim context wears the
    // TRIGGER's label, not "evidence-promotion".
    expect(
      h.events.some((e) => e.errandEdge === "exhaust-at-claim" && e.errandTo === "confirmed"),
    ).toBe(true);
    expect(h.events.some((e) => e.errandEdge === "evidence-promotion")).toBe(false);
    h.close();
  });

  it("B2: a stale attempt's negative is inert while its committed evidence still promotes", async () => {
    const h = wire({ script: [{ kind: "no_output" }] });
    h.seam.set(mkInstance());
    await h.loop.poll();
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000 });
    h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000, attemptIdSource: () => "active", sessionNamer: () => "s" });
    // A stale (superseded) attempt's negative conclusion demotes nothing.
    expect(h.store.concludeNegativeBudgeted({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "stale" }).applied).toBe(false);
    // The stale attempt's committed evidence STILL promotes (attempt-independent).
    h.seam.addTransition("inst-1", mkTransition(1, "codex", 2));
    const reader = createErrandReader(h.store, h.seam, h.diag);
    // But the row is `attempting` (not resting) — the promotion happens at the
    // attempt's OWN conclusion; drive it with a committed outcome.
    expect((await reader.getErrand("inst-1", KEY))?.state).toBe("attempting");
    expect(h.store.concludeConfirmed({ instanceId: "inst-1", contextPacketId: KEY }).applied).toBe(true);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });

  it("B5: a re-spawn is UNBUDGETED (budget byte-identical), fresh claim pair set", async () => {
    const h = wire({ script: [{ kind: "no_output" }, { kind: "no_output" }, { kind: "no_output" }] });
    h.seam.set(mkInstance());
    await h.loop.tick(); // no_output → unconfirmed, budget 2
    const budget = h.store.getErrand("inst-1", KEY)?.remainingBudget;
    await h.loop.respawn("inst-1", KEY);
    await h.loop.respawn("inst-1", KEY);
    expect(h.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(budget); // frozen across respawns
    h.close();
  });

  it("B6: a name_collision remints in place AND immediately executes the fresh attempt (finding 1)", async () => {
    // The arm's repro: a scripted name_collision then a success must show BOTH
    // attempts executed — the errand never strands in `attempting`.
    const h = wire({ script: [{ kind: "name_collision" }, submitted(committed)] });
    h.seam.set(mkInstance());
    await h.loop.tick();
    // Both attempts were handed to the executor (the fresh one re-invoked).
    expect(h.executor.calls.map((c) => c.input.attemptId)).toEqual(["att-1", "att-2"]);
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("confirmed"); // the fresh attempt succeeded, same tick
    expect(row?.remainingBudget).toBe(2); // net-zero: the collision consumed no budget
    expect(h.events.some((e) => e.errandEdge === "remint" && e.attemptId === "att-2")).toBe(true);
    h.close();
  });

  it("B6: a respawn-kind name_collision remints unbudgeted and re-executes (frozen budget)", async () => {
    const h = wire({
      script: [{ kind: "no_output" }, { kind: "name_collision" }, submitted(committed)],
    });
    h.seam.set(mkInstance());
    await h.loop.tick(); // no_output → unconfirmed, budget 2 frozen
    const frozen = h.store.getErrand("inst-1", KEY)?.remainingBudget;
    await h.loop.respawn("inst-1", KEY); // respawn att-2 → collision → remint att-3 → committed
    expect(h.store.getAttempt("att-3")?.kind).toBe("respawn"); // the remint preserved the kind
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    expect(h.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(frozen); // still frozen
    h.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// K — the executor seam
// ─────────────────────────────────────────────────────────────────────────
describe("K2 — the rejecting executor lane", () => {
  it("a rejecting execute() is a CAS-applied infra failure; the loop stays alive and the next tick proceeds", async () => {
    const h = wire({ script: [{ reject: "spawn boom" }, submitted(committed)] });
    h.seam.set(mkInstance());
    await h.loop.tick(); // reject → infra → back to pending
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("pending");
    expect(h.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(2);
    await h.loop.tick(); // next tick proceeds (loop alive)
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// L — lifecycle / claims (closed machine + reclaim + respawn)
// ─────────────────────────────────────────────────────────────────────────
describe("L — lifecycle / claims", () => {
  it("L1 closed machine: respawn from a NON-unconfirmed state is a no-op (rejected)", async () => {
    const h = wire({ script: [submitted(committed)] });
    h.seam.set(mkInstance());
    await h.loop.tick(); // confirmed
    await h.loop.respawn("inst-1", KEY); // from confirmed → rejected (no-op)
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });

  it("L1 closed machine: a second concurrent claim on a claimed errand is rejected (CAS)", async () => {
    const h = wire();
    h.seam.set(mkInstance());
    await h.loop.poll();
    expect(h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1 }).claimed).toBe(true);
    expect(h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w2", now: 1 }).claimed).toBe(false);
    h.close();
  });

  it("L3/L7 reclaim QUAD: pending (budgeted) / unconfirmed (respawn) / confirmed / mooted", async () => {
    // budgeted stale attempt → pending
    {
      const h = wire({ leaseMs: 1_000 });
      h.seam.set(mkInstance());
      h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
      h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
      h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
      // A fresh loop over the same store/seam with an advanced clock (lease crossed).
      const advanced = wire({ store: h.store, seam: h.seam, leaseMs: 1_000, clockStart: 5_000 });
      await advanced.loop.poll();
      expect(h.store.getErrand("inst-1", KEY)?.state).toBe("pending");
      h.close();
    }
    // respawn-kind stale attempt → unconfirmed (L7)
    {
      const h = wire({ leaseMs: 1_000 });
      h.seam.set(mkInstance());
      h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
      h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000 });
      h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
      h.store.concludeNoOutput({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "a" });
      h.store.startRespawnAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "r", sessionNamer: () => "s" });
      const advanced = wire({ store: h.store, seam: h.seam, leaseMs: 1_000, clockStart: 5_000 });
      await advanced.loop.poll();
      expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
      h.close();
    }
    // stale attempt with evidence → confirmed
    {
      const h = wire({ leaseMs: 1_000 });
      h.seam.set(mkInstance(), [mkTransition(1, "codex", 2)]);
      h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
      h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
      h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
      const advanced = wire({ store: h.store, seam: h.seam, leaseMs: 1_000, clockStart: 5_000 });
      await advanced.loop.poll();
      expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
      // L1: a precedence hit inside the reclaim context wears the "reclaim"
      // trigger label (not "evidence-promotion"), whichever way it lands.
      expect(advanced.events.some((e) => e.errandEdge === "reclaim" && e.errandTo === "confirmed")).toBe(true);
      expect(advanced.events.some((e) => e.errandEdge === "evidence-promotion")).toBe(false);
      h.close();
    }
    // stale attempt on a terminal run → mooted
    {
      const h = wire({ leaseMs: 1_000 });
      h.seam.set(mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled" }));
      h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
      h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
      h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
      const advanced = wire({ store: h.store, seam: h.seam, leaseMs: 1_000, clockStart: 5_000 });
      await advanced.loop.poll();
      expect(h.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
      h.close();
    }
  });

  it("L5: the re-spawn edge is unconfirmed's only errand-level exit; a failed re-spawn returns to unconfirmed", async () => {
    const h = wire({ script: [{ kind: "no_output" }, { kind: "infra_failure", class: "spawn_infra" }] });
    h.seam.set(mkInstance());
    await h.loop.tick(); // unconfirmed
    await h.loop.respawn("inst-1", KEY); // respawn → infra → back to unconfirmed (never pending)
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
    h.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// DG — observability
// ─────────────────────────────────────────────────────────────────────────
describe("DG — one best-effort event per edge; fail-open leaves outcomes unchanged", () => {
  it("DG1: a create → claim → attempt-start → confirm sequence emits the edge labels with the right fields", async () => {
    const h = wire({ script: [submitted(committed)] });
    h.seam.set(mkInstance());
    await h.loop.tick();
    const edges = h.events.filter((e) => e.kind === "errand_transition").map((e) => e.errandEdge);
    expect(edges).toEqual(["create", "claim", "attempt-start", "confirm"]);
    const create = h.events.find((e) => e.errandEdge === "create");
    expect(create).toMatchObject({ source: "runner", errandTo: "pending", contextPacketId: KEY });
    expect(create?.errandFrom).toBeUndefined(); // birth edge — no from
    expect(create?.attemptId).toBeUndefined();
    const attemptStart = h.events.find((e) => e.errandEdge === "attempt-start");
    expect(attemptStart).toMatchObject({ errandFrom: "claimed", errandTo: "attempting", attemptId: "att-1" });
    const confirm = h.events.find((e) => e.errandEdge === "confirm");
    expect(confirm).toMatchObject({ errandFrom: "attempting", errandTo: "confirmed", attemptId: "att-1" });
    h.close();
  });

  it("DG2: a swallowing sink changes no disposition and no timing", async () => {
    const noop: DiagnosticsSink = { emit: () => { /* swallow */ } };
    const withNoop = wire({ script: [submitted(committed)], diag: noop });
    withNoop.seam.set(mkInstance());
    await withNoop.loop.tick();
    const withRecording = wire({ script: [submitted(committed)] });
    withRecording.seam.set(mkInstance());
    await withRecording.loop.tick();
    expect(withNoop.store.getErrand("inst-1", KEY)?.state).toBe(
      withRecording.store.getErrand("inst-1", KEY)?.state,
    );
    expect(withNoop.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    withNoop.close();
    withRecording.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Aftermath (gate-2 findings 2,3,5,6,7): precedence at every conclusion,
// respawn preconditions, blind-lane coverage, edge-label sensitivity.
// ─────────────────────────────────────────────────────────────────────────
describe("Finding 2 — the precedence check runs FIRST at every unconfirmed-landing conclusion", () => {
  it("a committed transition mid-execute makes a no_output conclusion land confirmed (not unconfirmed)", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const h = wire({
      seam,
      script: [{ kind: "no_output" }],
      observe: () => seam.addTransition("inst-1", mkTransition(1, "codex", 2)),
    });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });

  it("a run going terminal mid-execute makes a no_output conclusion land mooted", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const h = wire({
      seam,
      script: [{ kind: "no_output" }],
      observe: () => seam.patch("inst-1", { kernelStatus: "TERMINAL", terminalDisposition: "cancelled" }),
    });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
    h.close();
  });

  it("evidence mid-execute makes an other-admit (stale) conclusion land confirmed", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const h = wire({
      seam,
      script: [submitted({ kind: "stale", currentVersion: 9 })],
      observe: () => seam.addTransition("inst-1", mkTransition(1, "codex", 2)),
    });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();
  });
});

describe("Finding 3 — respawn runs the B1 instance-load preconditions before any attempt", () => {
  it("respawn on a TERMINAL run moots WITHOUT invoking the executor", async () => {
    const h = wire({ script: [{ kind: "no_output" }, submitted(committed)] });
    h.seam.set(mkInstance());
    await h.loop.tick(); // unconfirmed
    h.seam.patch("inst-1", { kernelStatus: "TERMINAL", terminalDisposition: "cancelled" });
    const callsBefore = h.executor.calls.length;
    await h.loop.respawn("inst-1", KEY);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
    expect(h.executor.calls.length).toBe(callsBefore); // executor NOT invoked
    h.close();
  });

  it("respawn on a TERMINAL run WITH evidence lands confirmed (CF1 first), no attempt", async () => {
    const h = wire({ script: [{ kind: "no_output" }, submitted(committed)] });
    h.seam.set(mkInstance());
    await h.loop.tick(); // unconfirmed
    h.seam.addTransition("inst-1", mkTransition(1, "codex", 2));
    h.seam.patch("inst-1", { kernelStatus: "TERMINAL", terminalDisposition: "cancelled" });
    const callsBefore = h.executor.calls.length;
    await h.loop.respawn("inst-1", KEY);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    expect(h.executor.calls.length).toBe(callsBefore);
    h.close();
  });
});

describe("Finding 5 — D/CF blind members driven", () => {
  it("D6: a null-task ACTIVE instance propagates the kernel integrity throw fail-closed", async () => {
    const h = wire({ script: [submitted(committed)] });
    h.seam.set(mkInstance({ task: null }));
    await h.loop.poll(); // discovery (actor from the binding) succeeds
    await expect(h.loop.tick()).rejects.toThrow(/kernel integrity/);
    h.close();
  });

  it("D7: a run FAILED mid-dispatch acquires its aggregate-proven mooted backfill (the failed arm)", async () => {
    const h = wire();
    h.seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "failed", currentStep: "review", version: 4 }),
      [mkTransition(1, "codex", 2)],
    );
    await h.loop.poll();
    const rows = h.store.listErrands();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.state === "mooted")?.contextPacketId).toBe("inst-1@v3");
    h.close();
  });

  it("D7: a fully-reconciled terminal run is NOT re-walked (the skip gate short-circuits the detail read)", async () => {
    const h = wire();
    h.seam.set(
      mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled", currentStep: "review", version: 4 }),
      [mkTransition(1, "codex", 2)],
    );
    await h.loop.poll(); // reconciles + marks
    const before = h.seam.detailCalls;
    await h.loop.poll(); // the skip gate must prevent a re-walk of this run
    expect(h.seam.detailCalls).toBe(before); // no additional detail read
    h.close();
  });

  it("CF1 (loop-side predicate): a DIFFERENT-actor mid-execute transition is NOT evidence", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const h = wire({
      seam,
      script: [{ kind: "no_output" }],
      observe: () => seam.addTransition("inst-1", mkTransition(1, "claude", 2)),
    });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed"); // claude ≠ codex
    h.close();
  });
});

describe("Finding 6 — L/B/K blind members driven", () => {
  it("respawn from a NON-unconfirmed state (exhausted) is rejected — no attempt, no executor", async () => {
    const h = wire({ script: [submitted(committed)] });
    h.seam.set(mkInstance());
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 0 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1_000 });
    h.store.exhaustAtClaim({ instanceId: "inst-1", contextPacketId: KEY });
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("exhausted");
    const callsBefore = h.executor.calls.length;
    const detailBefore = h.seam.detailCalls;
    await h.loop.respawn("inst-1", KEY);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("exhausted");
    expect(h.executor.calls.length).toBe(callsBefore);
    // The loop's own state guard short-circuits BEFORE the instance-load read.
    expect(h.seam.detailCalls).toBe(detailBefore);
    h.close();
  });

  it("B4: an exhausting attempt on a run that went TERMINAL lands mooted (never exhausted)", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance());
    const h = wire({
      seam,
      attemptsPerErrand: 1,
      script: [{ kind: "infra_failure", class: "nonzero_exit" }],
      observe: () => seam.patch("inst-1", { kernelStatus: "TERMINAL", terminalDisposition: "cancelled" }),
    });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
    h.close();
  });

  it("B3: every infra class consumes the attempt and returns to pending under budget", async () => {
    for (const cls of ["spawn_infra", "nonzero_exit", "own_timeout", "foreign_kill"] as const) {
      const h = wire({ script: [{ kind: "infra_failure", class: cls }] });
      h.seam.set(mkInstance());
      await h.loop.tick();
      const row = h.store.getErrand("inst-1", KEY);
      expect(row?.state, cls).toBe("pending");
      expect(row?.remainingBudget, cls).toBe(2);
      h.close();
    }
  });

  it("B5: a respawn attempt records the worker_id (fresh lease clock)", async () => {
    let workerMid: string | null | undefined;
    const h = wire({
      script: [{ kind: "no_output" }, { kind: "no_output" }],
      observe: () => {
        workerMid = h.store.getErrand("inst-1", KEY)?.workerId;
      },
      workerId: "respawner",
    });
    h.seam.set(mkInstance());
    await h.loop.tick(); // budgeted attempt (att-1)
    await h.loop.respawn("inst-1", KEY); // respawn attempt (att-2) — observe reads worker_id mid-attempt
    expect(workerMid).toBe("respawner");
    h.close();
  });
});

describe("Finding 7 — DG1 edge-label sensitivity across trigger contexts", () => {
  it("negative-budgeted / no-output / other-admit / moot each wear their own trigger label", async () => {
    // negative-budgeted
    {
      const h = wire({ script: [{ kind: "infra_failure", class: "nonzero_exit" }] });
      h.seam.set(mkInstance());
      await h.loop.tick();
      expect(h.events.some((e) => e.errandEdge === "negative-budgeted" && e.errandTo === "pending")).toBe(true);
      h.close();
    }
    // no-output
    {
      const h = wire({ script: [{ kind: "no_output" }] });
      h.seam.set(mkInstance());
      await h.loop.tick();
      expect(h.events.some((e) => e.errandEdge === "no-output" && e.errandTo === "unconfirmed")).toBe(true);
      h.close();
    }
    // other-admit
    {
      const h = wire({ script: [submitted({ kind: "stale", currentVersion: 9 })] });
      h.seam.set(mkInstance());
      await h.loop.tick();
      expect(h.events.some((e) => e.errandEdge === "other-admit" && e.errandTo === "unconfirmed")).toBe(true);
      h.close();
    }
    // moot (poll terminal)
    {
      const h = wire();
      h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
      h.seam.set(mkInstance({ kernelStatus: "TERMINAL", terminalDisposition: "cancelled" }));
      await h.loop.poll();
      expect(h.events.some((e) => e.errandEdge === "moot" && e.errandTo === "mooted")).toBe(true);
      h.close();
    }
  });

  it("reclaim wears the reclaim label in the budgeted context", async () => {
    const h = wire({ leaseMs: 1_000 });
    h.seam.set(mkInstance());
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 3 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000 });
    h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "gone", now: 1_000, attemptIdSource: () => "a", sessionNamer: () => "s" });
    const advanced = wire({ store: h.store, seam: h.seam, leaseMs: 1_000, clockStart: 5_000 });
    await advanced.loop.poll();
    expect(advanced.events.some((e) => e.errandEdge === "reclaim" && e.errandTo === "pending")).toBe(true);
    h.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ch9-P3b — H5 (the attempt-start evidence/version gate, flag F10) + H1 (the
// provider-contract cwd resolution, flag F5).
// ═══════════════════════════════════════════════════════════════════════════

const READY_REF: RuntimeContextRef = {
  kind: "worktree",
  locator: { path: "/ws/ready", branch: "b", repo: "/r", base_commit: "c0ffee" },
};

function localProvider(): RuntimeContextProvider & LocalExecutionCapability {
  return {
    provision: () => Promise.resolve(),
    projectForActor: (ref) =>
      ({ kind: "worktree", path: (ref.locator as { path: string }).path, branch: "b" }) as unknown as RuntimeContextProjection,
    resolveLocalWorkingDirectory: (ref) => (ref.locator as { path: string }).path,
  };
}
function plainProvider(): RuntimeContextProvider {
  return {
    provision: () => Promise.resolve(),
    projectForActor: (ref) =>
      ({ kind: "worktree", path: (ref.locator as { path: string }).path, branch: "b" }) as unknown as RuntimeContextProjection,
  };
}
function throwingProvider(): RuntimeContextProvider & LocalExecutionCapability {
  return {
    provision: () => Promise.resolve(),
    projectForActor: (ref) =>
      ({ kind: "worktree", path: (ref.locator as { path: string }).path, branch: "b" }) as unknown as RuntimeContextProjection,
    resolveLocalWorkingDirectory: () => {
      throw new Error("cwd resolution boom");
    },
  };
}
function rcTemplate(): WorkflowTemplate {
  return { ...fixtureTemplate(), runtimeContext: { kind: "worktree", provider: "test.local", config: { repo: "/r" } } };
}
function admittedRc(): AdmittedTemplate {
  const result = admitTemplate(rcTemplate(), gateCatalog);
  if (!result.ok) {
    throw new Error(`rc fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

describe("H5 — the attempt-start evidence/version gate (flag F10)", () => {
  it("budgeted hold: a reclaimed STALE errand whose instance advanced resolves confirmed by evidence, NO spawn (evidence-at-claim edge)", async () => {
    const seam = new FakeSeam();
    // The instance advanced to v3 (a sibling committed v2→v3), with the v2
    // commit as evidence; the stale @v2 errand sits claimed (reclaimed remnant).
    seam.set(mkInstance({ version: 3 }), [mkTransition(1, "codex", 2)]);
    const h = wire({ seam }); // no script — a spawn here would exhaust it (red)
    // Suppress @v3 discovery with a pre-confirmed @v3 row; work skips it.
    h.store.backfillConfirmed({ instanceId: "inst-1", contextPacketId: "inst-1@v3", expectedVersion: 3, actorId: "claude", budget: 3 });
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: "inst-1@v2", expectedVersion: 2, actorId: "codex", budget: 2 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000 });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", "inst-1@v2")?.state).toBe("confirmed");
    expect(h.executor.calls).toHaveLength(0); // ZERO spawn
    expect(
      h.events.some((e) => e.errandEdge === "evidence-at-claim" && e.errandFrom === "claimed" && e.errandTo === "confirmed" && e.attemptId === undefined),
    ).toBe(true);
    h.close();
  });

  it("budgeted hold: the version-gate SKIP (mismatch, no evidence) — no spawn, no decrement, row byte-unchanged", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance({ version: 3 })); // no v2 evidence
    const h = wire({ seam });
    h.store.backfillConfirmed({ instanceId: "inst-1", contextPacketId: "inst-1@v3", expectedVersion: 3, actorId: "claude", budget: 3 });
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: "inst-1@v2", expectedVersion: 2, actorId: "codex", budget: 2 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000 });
    await h.loop.tick();
    const row = h.store.getErrand("inst-1", "inst-1@v2");
    expect(row?.state).toBe("claimed"); // unchanged
    expect(row?.remainingBudget).toBe(2); // no decrement
    expect(row?.activeAttemptId).toBeNull();
    expect(h.executor.calls).toHaveLength(0);
    h.close();
  });

  it("re-spawn hold: evidence resolves confirmed by evidence, NO spawn (evidence-at-respawn edge)", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance({ version: 3 }), [mkTransition(1, "codex", 2)]);
    const h = wire({ seam });
    // Drive the @v2 errand to `unconfirmed` (a no-output attempt).
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: "inst-1@v2", expectedVersion: 2, actorId: "codex", budget: 2 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000 });
    const started = h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000, attemptIdSource: () => "a1", sessionNamer: () => "s1" });
    if (started.kind !== "started") throw new Error("setup");
    h.store.concludeNoOutput({ instanceId: "inst-1", contextPacketId: "inst-1@v2", attemptId: started.attemptId });
    expect(h.store.getErrand("inst-1", "inst-1@v2")?.state).toBe("unconfirmed");
    await h.loop.respawn("inst-1", "inst-1@v2");
    expect(h.store.getErrand("inst-1", "inst-1@v2")?.state).toBe("confirmed");
    expect(h.executor.calls).toHaveLength(0);
    expect(
      h.events.some((e) => e.errandEdge === "evidence-at-respawn" && e.errandFrom === "unconfirmed" && e.errandTo === "confirmed" && e.attemptId === undefined),
    ).toBe(true);
    h.close();
  });

  it("re-spawn hold: the version-gate SKIP (mismatch, no evidence) — no spawn, stays unconfirmed", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance({ version: 3 })); // no v2 evidence
    const h = wire({ seam });
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: "inst-1@v2", expectedVersion: 2, actorId: "codex", budget: 2 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000 });
    const started = h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000, attemptIdSource: () => "a1", sessionNamer: () => "s1" });
    if (started.kind !== "started") throw new Error("setup");
    h.store.concludeNoOutput({ instanceId: "inst-1", contextPacketId: "inst-1@v2", attemptId: started.attemptId });
    await h.loop.respawn("inst-1", "inst-1@v2");
    expect(h.store.getErrand("inst-1", "inst-1@v2")?.state).toBe("unconfirmed");
    expect(h.executor.calls).toHaveLength(0);
    h.close();
  });

  it("ORDER: TERMINAL + mismatch + no evidence → mooted (the SKIP never shadows the terminal moot)", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance({ version: 3, kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }));
    const h = wire({ seam });
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: "inst-1@v2", expectedVersion: 2, actorId: "codex", budget: 2 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000 });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", "inst-1@v2")?.state).toBe("mooted");
    expect(h.executor.calls).toHaveLength(0);
    h.close();
  });

  it("ORDER: evidence + TERMINAL + mismatch → confirmed (evidence beats the terminal moot)", async () => {
    const seam = new FakeSeam();
    seam.set(
      mkInstance({ version: 3, kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }),
      [mkTransition(1, "codex", 2)],
    );
    const h = wire({ seam });
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: "inst-1@v2", expectedVersion: 2, actorId: "codex", budget: 2 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: "inst-1@v2", workerId: "w", now: 1_000 });
    await h.loop.tick();
    expect(h.store.getErrand("inst-1", "inst-1@v2")?.state).toBe("confirmed");
    expect(h.executor.calls).toHaveLength(0);
    h.close();
  });
});

describe("H1 — the provider-contract cwd resolution (flag F5)", () => {
  it("a ready(ref) run hands the executor an explicit cwd = the capability-resolved path (byte-equal to locator.path AND projection.path)", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance({ runtimeContext: { state: "ready", ref: READY_REF } }));
    const h = wire({
      seam,
      script: [submitted(committed)],
      definitions: fixtureDefinitionStore(admittedRc()),
      providerRegistry: createStaticProviderRegistry({ "test.local": localProvider() }),
    });
    await h.loop.tick();
    const call = h.executor.calls[0];
    const locatorPath = (READY_REF.locator as { path: string }).path;
    expect(call?.input.cwd).toBe(locatorPath);
    // C17 value-identity: equal to the actor projection's path too.
    expect((call?.input.intent.packet.runtimeContext as unknown as { path: string }).path).toBe(locatorPath);
    h.close();
  });

  it("the `none` lane carries NO cwd field (the adapter derives its own)", async () => {
    const h = wire({ script: [submitted(committed)] });
    h.seam.set(mkInstance()); // ready ref null → the none lane
    await h.loop.tick();
    expect(h.executor.calls[0]?.input.cwd).toBeUndefined();
    h.close();
  });

  it("D6: a ready-ref run whose provider LACKS the capability throws fail-closed at derivation; errand unmutated, no budget burn", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance({ runtimeContext: { state: "ready", ref: READY_REF } }));
    const h = wire({
      seam,
      definitions: fixtureDefinitionStore(admittedRc()),
      providerRegistry: createStaticProviderRegistry({ "test.local": plainProvider() }),
    });
    await h.loop.poll(); // discovery derives the actor only → pending
    await expect(h.loop.tick()).rejects.toThrow(/not a local-execution provider/);
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("claimed"); // never advanced to attempting
    expect(row?.remainingBudget).toBe(3); // no decrement
    expect(h.executor.calls).toHaveLength(0);
    h.close();
  });

  it("D6: a THROWING capability resolution propagates fail-closed; errand unmutated, no budget burn", async () => {
    const seam = new FakeSeam();
    seam.set(mkInstance({ runtimeContext: { state: "ready", ref: READY_REF } }));
    const h = wire({
      seam,
      definitions: fixtureDefinitionStore(admittedRc()),
      providerRegistry: createStaticProviderRegistry({ "test.local": throwingProvider() }),
    });
    await h.loop.poll();
    await expect(h.loop.tick()).rejects.toThrow(/cwd resolution boom/);
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("claimed");
    expect(row?.remainingBudget).toBe(3);
    expect(h.executor.calls).toHaveLength(0);
    h.close();
  });
});
