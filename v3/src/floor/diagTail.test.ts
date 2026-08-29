import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { DiagUnavailableError, openDiagStore } from "../diag/index.js";
import type { DiagStoreHandle } from "../diag/index.js";
import type { EventEnvelope, TranscriptEntry, WorkflowInstance } from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createKernel } from "../kernel/index.js";
import type { Kernel } from "../kernel/index.js";
import type {
  DiagnosticEvent,
  DiagnosticEventBody,
  DiagnosticsReader,
  DiagnosticsSink,
} from "../ports/diagnostics.js";
import type { StorePort } from "../ports/store.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
  createScriptedTailWait,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import type { AdmittedTemplate, WorkflowTemplate } from "../domain/index.js";
import { admitTemplate } from "../definition/index.js";
import { createGateRegistry } from "../gates/index.js";

const gateCatalog = createGateRegistry();
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`test fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}
import type { DiagTailRow } from "./tail.js";
import { createDiagTail, TailIntegrityError, TailUnknownInstanceError } from "./tail.js";

const definitions = fixtureDefinitionStore(admit(fixtureTemplate()));

const instance: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "t",
  // ch14-p3b: the shipped template declares a third role, and a run
  // that reaches the gate needs its binding — the real `create` path
  // seeds it from `roles.operator.defaultActor`, which this hand-built
  // instance record restates rather than inherits.
  binding: { implementer: "codex", reviewer: "claude", operator: "human" },
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

function env(
  opId: string,
  type: string,
  expectedVersion?: number,
  payload?: unknown,
  expectedRole = "implementer",
): EventEnvelope {
  return {
    instanceId: "inst-1",
    opId,
    type,
    actorId: "codex",
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    ...(payload !== undefined ? { payload } : {}),
    expectedRole,
  };
}

function makeKernel(store: StorePort, diag: DiagnosticsSink): Kernel {
  return createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,

    gates: gateCatalog,    diag,
  });
}

async function committed(kernel: Kernel, envelope: EventEnvelope): Promise<void> {
  const outcome = await kernel.handle(envelope);
  expect(outcome.kind).toBe("committed");
}

/** The shipped request-ref mint under the controlled clock at 0: each
 * lane's gate park is its FIRST minted request, so the ref is a
 * COMPUTABLE literal rather than a wildcard. */
const R = "req-0-1";

/** ch14-p3b (R2's re-pin discipline): the shipped CONVERGED edge no
 * longer terminates — it PARKS at `human_approval`. The terminal
 * arrival these lanes stop on is RESTATED against the new route, never
 * dropped: the bound operator approves (routing to the `commit_pending`
 * wait) and a COMMIT resume reaches `done`. Both legs commit, so each
 * lane's committed-row expectations GROW by the park's DECISION_REQUEST
 * row and the two operator rows. */
async function throughTheHuman(kernel: Kernel, parkedVersion: number): Promise<void> {
  const decided = await kernel.submitDecision({
    intent: "submit-decision",
    instanceId: "inst-1",
    opId: "d1",
    expectedVersion: parkedVersion,
    requestRef: R,
    verdict: "approve",
    by: "human",
  });
  expect(decided.kind).toBe("committed");
  const resumed = await kernel.resumeWait({
    intent: "resume-wait",
    instanceId: "inst-1",
    opId: "r1",
    expectedVersion: parkedVersion + 1,
    type: "COMMIT",
  });
  expect(resumed.kind).toBe("committed");
}

async function collectAll(rows: AsyncIterable<DiagTailRow>): Promise<DiagTailRow[]> {
  const out: DiagTailRow[] = [];
  for await (const row of rows) {
    out.push(row);
  }
  return out;
}

function committedRows(rows: readonly DiagTailRow[]): TranscriptEntry[] {
  return rows.flatMap((r) => (r.lane === "committed" ? [r.row] : []));
}

/** [seq, opId] per class (C12): a transition's op id rides its
 * envelope, a fact's rides the row itself. */
function opIdOf(entry: TranscriptEntry): string {
  if (entry.entryKind === "transition") return entry.envelope.opId;
  // K12 (ch14-p2a): the DECISION_REQUEST class is OP-LESS — kernel-
  // derived, correlated by `requestRef`. An op-less row is not an op.
  if (entry.entryKind === "DECISION_REQUEST") return entry.requestRef;
  return entry.opId;
}

function diagEvents(rows: readonly DiagTailRow[]): DiagnosticEvent[] {
  return rows.flatMap((r) => (r.lane === "diag" ? [r.event] : []));
}

async function nextRow(iterator: AsyncIterator<DiagTailRow>): Promise<DiagTailRow> {
  const result = await iterator.next();
  if (result.done === true) {
    throw new Error("iterator completed before the expected row");
  }
  return result.value;
}

/** An R3-valid kernel-source body attributed to `instanceId` (duplicate
 * requires the full envelope + digest — the cheapest stageable class). */
function diagBody(opId: string, instanceId = "inst-1"): DiagnosticEventBody {
  return {
    source: "kernel",
    kind: "duplicate",
    instanceId,
    opId,
    actorId: "codex",
    type: "PASS",
    payloadDigest: `dg-${opId}`,
  };
}

/** R3-valid unattributed body: `not_plain_object` carries no attribution
 * — reachable ONLY through the global read (S8's territory). */
const UNATTRIBUTED: DiagnosticEventBody = {
  source: "ingress",
  kind: "rejected",
  reason: "invalid_shape",
  detail: "not_plain_object",
};

/** A read-face event literal for scripted-reader schedules. */
function fakeEvent(ordinal: number): DiagnosticEvent {
  return {
    source: "kernel",
    kind: "duplicate",
    instanceId: "inst-1",
    opId: `late-${String(ordinal)}`,
    actorId: "codex",
    type: "PASS",
    payloadDigest: "dg-late",
    at: 0,
    ordinal,
  };
}

function fakeRow(seq: number): TranscriptEntry {
  return {
    entryKind: "transition",
    seq,
    envelope: env(`op-${String(seq)}`, "PASS", seq),
    payloadDigest: "d",
    gateDecisions: [],
    issuedAgentConfig: {},
    committedAt: 0,
  };
}

type Thunk<T> = () => Promise<T>;
const ok =
  <T>(value: T): Thunk<T> =>
  () =>
    Promise.resolve(value);
const failWith =
  <T>(error: Error): Thunk<T> =>
  () =>
    Promise.reject(error);

/** Engine-probe store double (the ch6-P2 scripted-store precedent,
 * thunk-queued so E4/E9 rejection lanes are stageable per read). */
function scriptedStore(
  timelineReads: ReadonlyArray<Thunk<readonly TranscriptEntry[] | null>>,
  instanceReads: ReadonlyArray<Thunk<WorkflowInstance | null>>,
): StorePort {
  const timelines = [...timelineReads];
  const instances = [...instanceReads];
  return {
    loadInstance: () => {
      const next = instances.shift();
      if (next === undefined) {
        throw new Error("scripted store: instance-read queue dry");
      }
      return next();
    },
    findOp: () => Promise.reject(new Error("unused")),
    createInstance: () => Promise.reject(new Error("unused")),
    commitTransition: () => Promise.reject(new Error("unused")),
    commitLifecycle: () => Promise.reject(new Error("unused")),
    commitOperatorEntry: () => Promise.reject(new Error("unused")),
    listInstances: () => Promise.reject(new Error("unused")),
    getInstanceDetail: () => Promise.reject(new Error("unused")),
    getTimeline: () => {
      const next = timelines.shift();
      if (next === undefined) {
        throw new Error("scripted store: timeline queue dry");
      }
      return next();
    },
  };
}

/** Per-call reader fake (the P1 per-call-fake precedent): each read
 * consumes one thunk; `calls()` pins T5's ONE final read. */
function scriptedReader(reads: ReadonlyArray<Thunk<readonly DiagnosticEvent[]>>): {
  reader: DiagnosticsReader;
  calls(): number;
} {
  const queue = [...reads];
  let consumed = 0;
  return {
    calls: () => consumed,
    reader: {
      getDiagnostics: () => {
        const next = queue.shift();
        if (next === undefined) {
          throw new Error("scripted reader: read queue dry");
        }
        consumed += 1;
        return next();
      },
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    },
  };
}

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-diagtail-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface Rig {
  readonly store: StorePort;
  readonly kernel: Kernel;
  readonly diag: DiagStoreHandle;
  close(): void;
}

async function rig(): Promise<Rig> {
  const main = openStore(":memory:", createControlledClock(0));
  const diag = openDiagStore(":memory:", createControlledClock(0));
  await main.store.createInstance(instance);
  const kernel = makeKernel(main.store, diag.sink);
  return {
    store: main.store,
    kernel,
    diag,
    close: () => {
      main.close();
      diag.close();
    },
  };
}

describe("tailWithDiagnostics — committed-lane parity (dimension 1)", () => {
  it("parity 1+4b — already-terminal at start: full committed replay, ZERO waits, empty diag lane", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);

    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));

    // The CONVERGED commit writes TWO rows — the transition and the
    // park's op-less DECISION_REQUEST — and the run reaches `done` on a
    // WAIT_RESUMED two operator steps later.
    expect(committedRows(rows).map((row) => row.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(committedRows(rows).map(opIdOf)).toEqual(["a1", "b2", R, "d1", "r1"]);
    expect(committedRows(rows).map((row) => row.entryKind)).toEqual([
      "transition",
      "transition",
      "DECISION_REQUEST",
      "DECISION_MADE",
      "WAIT_RESUMED",
    ]);
    expect(diagEvents(rows)).toEqual([]);
    expect(scripted.calls()).toBe(0);
    r.close();
  });

  it("parity 2+3+4a — live no-skip/no-duplicate/stop across rounds: committed lane identical to the plain tail's", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const scripted = createScriptedTailWait([
      () => committed(r.kernel, env("b2", "PASS", 2, { ref: "diff-2" }, "reviewer")),
      () => committed(r.kernel, env("c3", "PASS", 3, { ref: "diff-3" })),
      async () => {
        await committed(r.kernel, env("d4", "CONVERGED", 4, undefined, "reviewer"));
        // ch14-p3b: the CONVERGED commit parks; the terminal commit this
        // lane completes on is the RESUME, two operator steps later.
        await throughTheHuman(r.kernel, 5);
      },
    ]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));

    // Replay + every mid-tail commit, each exactly once, in seq order,
    // completion after the terminal commit — the ch6-P2 expectations,
    // unchanged by the diag lane's presence (which stays empty here).
    expect(committedRows(rows).map((row) => row.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(committedRows(rows).map(opIdOf)).toEqual(["a1", "b2", "c3", "d4", R, "d1", "r1"]);
    expect(diagEvents(rows)).toEqual([]);
    expect(scripted.calls()).toBe(3);
    r.close();
  });

  it("parity 4c — terminal lands BETWEEN drain and status read (fake seams): final drain yields it, zero waits, ONE final diag read", async () => {
    const store = scriptedStore(
      [ok([fakeRow(1)]), ok([fakeRow(2)]), ok([])],
      [ok({ ...instance, kernelStatus: "TERMINAL" as const, terminalDisposition: "done" as const, version: 3 })],
    );
    const reader = scriptedReader([ok([]), ok([])]);
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(store, reader.reader, scripted.wait);

    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));
    expect(committedRows(rows).map((row) => row.seq)).toEqual([1, 2]);
    expect(scripted.calls()).toBe(0);
    expect(reader.calls()).toBe(2);
  });
});

describe("diag-lane delivery (dimension 2)", () => {
  it("pre-tail history replays on the first poll, in ordinal order", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);
    r.diag.sink.emit(diagBody("e1"));
    r.diag.sink.emit(diagBody("e2"));
    r.diag.sink.emit(diagBody("e3"));

    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));

    expect(diagEvents(rows).map((event) => event.ordinal)).toEqual([1, 2, 3]);
    expect(diagEvents(rows).map((event) => event.opId)).toEqual(["e1", "e2", "e3"]);
    expect(scripted.calls()).toBe(0);
    r.close();
  });

  it("live events staged between rounds appear exactly once, each row carrying its own cursor", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    r.diag.sink.emit(diagBody("e1"));

    const scripted = createScriptedTailWait([
      () => {
        r.diag.sink.emit(diagBody("e2"));
      },
      async () => {
        r.diag.sink.emit(diagBody("e3"));
        await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
        // The CONVERGED commit now PARKS; the terminal this lane stops
        // on is reached THROUGH the human.
        await throughTheHuman(r.kernel, 3);
      },
    ]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));

    expect(diagEvents(rows).map((event) => event.opId)).toEqual(["e1", "e2", "e3"]);
    expect(diagEvents(rows).map((event) => event.ordinal)).toEqual([1, 2, 3]);
    expect(committedRows(rows).map(opIdOf)).toEqual(["a1", "b2", R, "d1", "r1"]);
    expect(scripted.calls()).toBe(2);
    r.close();
  });

  it("fromOrdinal mid-cursor: only ordinal > fromOrdinal is delivered", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);
    r.diag.sink.emit(diagBody("e1"));
    r.diag.sink.emit(diagBody("e2"));
    r.diag.sink.emit(diagBody("e3"));

    const tail = createDiagTail(r.store, r.diag.reader, createScriptedTailWait([]).wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 1));

    expect(diagEvents(rows).map((event) => event.opId)).toEqual(["e2", "e3"]);
    r.close();
  });
});

describe("attribution scope + separation at the consumer (dimension 3)", () => {
  it("(a) foreign-instance and unattributed events exist in the store yet NEVER appear on the tail", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);
    r.diag.sink.emit(diagBody("own-1"));
    r.diag.sink.emit(diagBody("foreign-1", "other-1"));
    r.diag.sink.emit(UNATTRIBUTED);

    // Driven from BOTH sides: the rows exist (global read sees all
    // three)…
    const all = await r.diag.reader.getGlobalDiagnostics(0);
    expect(all).toHaveLength(3);

    // …and the tail yields only the instance's attributed one.
    const tail = createDiagTail(r.store, r.diag.reader, createScriptedTailWait([]).wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));
    expect(diagEvents(rows).map((event) => event.opId)).toEqual(["own-1"]);
    r.close();
  });

  it("(b) both lanes react to ONE input: a mid-tail stale submit through the REAL kernel hits the diag lane and mints NO committed row", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const scripted = createScriptedTailWait([
      async () => {
        // The ch6-P2 dimension-7 probe transposed and SHARPENED: the
        // same input that must NOT mint a committed row must APPEAR on
        // the diag lane.
        const outcome = await r.kernel.handle(env("z9", "PASS", 1, { ref: "x" }));
        expect(outcome.kind).toBe("stale");
      },
      async () => {
        await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
        await throughTheHuman(r.kernel, 3);
      },
    ]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));

    expect(committedRows(rows).map(opIdOf)).toEqual(["a1", "b2", R, "d1", "r1"]);
    const events = diagEvents(rows);
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("stale");
    expect(events[0]?.opId).toBe("z9");
    r.close();
  });
});

describe("union row shape (dimension 4 / T1)", () => {
  it("every yielded row matches exactly ONE variant with the EXACT keyset; the diag variant carries the FULL event, error.message included", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);
    const hostileMessage = "went wrong at /private/path with PAYLOAD_FRAGMENT_x1";
    r.diag.sink.emit({
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      error: { name: "ExplodedInTransit", message: hostileMessage },
    });

    const tail = createDiagTail(r.store, r.diag.reader, createScriptedTailWait([]).wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      if (row.lane === "committed") {
        expect(Object.keys(row).sort()).toEqual(["lane", "row"]);
      } else {
        expect(Object.keys(row).sort()).toEqual(["event", "lane"]);
      }
    }
    const events = diagEvents(rows);
    expect(events).toHaveLength(1);
    // The tail is a LOCAL surface (§7.4): the FULL read-face event rides,
    // untrusted free text included.
    expect(events[0]?.error?.message).toBe(hostileMessage);
    expect(events[0]?.at).toBe(0);
    expect(events[0]?.ordinal).toBe(1);
    r.close();
  });
});

describe("stop semantics (dimension 5 / T5)", () => {
  it("(a)+(c)+(d) — final-drain window pickup; no wait after terminal; the final drain is ONE diag read, never till-empty", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);

    // Scripted reader over the REAL terminal store: the round read is
    // empty, the ONE final read carries the window event — a third
    // queued read would only be consumed by a (forbidden) diag
    // till-empty drain.
    const reader = scriptedReader([ok([]), ok([fakeEvent(7)]), ok([fakeEvent(8)])]);
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(r.store, reader.reader, scripted.wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));

    expect(diagEvents(rows).map((event) => event.ordinal)).toEqual([7]);
    expect(reader.calls()).toBe(2);
    expect(scripted.calls()).toBe(0);
    r.close();
  });

  it("(b) — post-close diag events are NOT streamed and ARE visible on the query surface (the recourse, at the library seam)", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);

    const tail = createDiagTail(r.store, r.diag.reader, createScriptedTailWait([]).wait);
    const rows = await collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));
    expect(diagEvents(rows)).toEqual([]);

    // A rejected submit against the TERMINAL instance, AFTER completion.
    // The version the late submit carries follows the run: the terminal
    // is now version 5, so the state rung is still what answers it.
    const outcome = await r.kernel.handle(env("p9", "PASS", 5));
    expect(outcome).toEqual({ kind: "rejected", reason: "not_active" });

    const late = await r.diag.reader.getDiagnostics("inst-1", 0);
    expect(late).toHaveLength(1);
    expect(late[0]?.kind).toBe("rejected");
    expect(late[0]?.opId).toBe("p9");
    r.close();
  });
});

describe("tail error contract (dimension 6 / the E matrix)", () => {
  it("E1 — invalid fromSeq: RangeError from getTimeline's owner validator; zero rows, zero waits, diag reader NEVER consulted", async () => {
    const r = await rig();
    const reader = scriptedReader([]);
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(r.store, reader.reader, scripted.wait);

    await expect(collectAll(tail.tailWithDiagnostics("inst-1", -1, 0))).rejects.toThrow(
      RangeError,
    );
    expect(reader.calls()).toBe(0);
    expect(scripted.calls()).toBe(0);
    r.close();
  });

  it("E2 — invalid fromOrdinal: RangeError from getDiagnostics' P2 validator (delegation, dimension 13); zero rows, zero waits", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);

    await expect(collectAll(tail.tailWithDiagnostics("inst-1", 0, -1))).rejects.toThrow(
      /diag cursor/,
    );
    expect(scripted.calls()).toBe(0);
    r.close();
  });

  it("E3 — unknown instance at start: TailUnknownInstanceError, zero waits", async () => {
    const r = await rig();
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);

    await expect(collectAll(tail.tailWithDiagnostics("ghost", 0, 0))).rejects.toThrow(
      TailUnknownInstanceError,
    );
    expect(scripted.calls()).toBe(0);
    r.close();
  });

  it("E3 precedence — unknown id + UNAVAILABLE diag in the SAME first round: the committed error wins (a diag-first engine fails here)", async () => {
    const main = openStore(":memory:", createControlledClock(0));
    const garbage = join(tempDir(), "diag.sqlite");
    writeFileSync(garbage, "not a sqlite database — born unavailable");
    const diag = openDiagStore(garbage, createControlledClock(0));

    const tail = createDiagTail(main.store, diag.reader, createScriptedTailWait([]).wait);
    await expect(collectAll(tail.tailWithDiagnostics("ghost", 0, 0))).rejects.toThrow(
      TailUnknownInstanceError,
    );
    diag.close();
    main.close();
  });

  it("E4 — mid-stream vanish, timeline read: TailIntegrityError", async () => {
    const store = scriptedStore(
      [ok([fakeRow(1)]), ok(null)],
      [ok({ ...instance })],
    );
    const reader = scriptedReader([ok([]), ok([])]);
    const scripted = createScriptedTailWait([() => undefined]);
    const tail = createDiagTail(store, reader.reader, scripted.wait);

    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();
    expect((await nextRow(iterator)).lane).toBe("committed");
    await expect(iterator.next()).rejects.toThrow(TailIntegrityError);
    expect(scripted.calls()).toBe(1);
  });

  it("E4 — mid-stream vanish, status read: TailIntegrityError before any wait", async () => {
    const store = scriptedStore([ok([fakeRow(1)])], [ok(null)]);
    const reader = scriptedReader([ok([])]);
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(store, reader.reader, scripted.wait);

    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();
    expect((await nextRow(iterator)).lane).toBe("committed");
    await expect(iterator.next()).rejects.toThrow(TailIntegrityError);
    expect(scripted.calls()).toBe(0);
  });

  it("E4 — stop-path DRAIN-null variant: terminal observed, the drain read resolves null → TailIntegrityError, never a silent completion", async () => {
    const store = scriptedStore(
      [ok([fakeRow(1)]), ok(null)],
      [ok({ ...instance, kernelStatus: "TERMINAL" as const, terminalDisposition: "done" as const, version: 2 })],
    );
    const reader = scriptedReader([ok([])]);
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(store, reader.reader, scripted.wait);

    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();
    expect((await nextRow(iterator)).lane).toBe("committed");
    await expect(iterator.next()).rejects.toThrow(TailIntegrityError);
    expect(scripted.calls()).toBe(0);
  });

  it("E5 — diag unavailable at start: DiagUnavailableError propagates AS-IS on the first next(); zero rows, zero waits", async () => {
    const main = openStore(":memory:", createControlledClock(0));
    await main.store.createInstance(instance);
    const garbage = join(tempDir(), "diag.sqlite");
    writeFileSync(garbage, "not a sqlite database — born unavailable");
    const diag = openDiagStore(garbage, createControlledClock(0));

    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(main.store, diag.reader, scripted.wait);
    const collected = collectAll(tail.tailWithDiagnostics("inst-1", 0, 0));
    await expect(collected).rejects.toThrow(DiagUnavailableError);
    await expect(collected).rejects.toMatchObject({
      name: "DiagUnavailableError",
      reason: "open_failed",
    });
    expect(scripted.calls()).toBe(0);
    diag.close();
    main.close();
  });

  it("E6 — diag failure MID-STREAM (closed handle): loud on that next(), tail terminated", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const scripted = createScriptedTailWait([
      () => {
        r.diag.close();
      },
    ]);
    const tail = createDiagTail(r.store, r.diag.reader, scripted.wait);
    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();

    expect((await nextRow(iterator)).lane).toBe("committed");
    await expect(iterator.next()).rejects.toMatchObject({
      name: "DiagUnavailableError",
      reason: "read_failed",
    });
    expect((await iterator.next()).done).toBe(true);
  });

  it("E6 — stop-path FINAL-read variant: terminal observed, committed lane drained, the final diag read rejects → loud on the last next(), never a silent completion", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);

    const reader = scriptedReader([
      ok([]),
      failWith(new DiagUnavailableError("read_failed")),
    ]);
    const tail = createDiagTail(r.store, reader.reader, createScriptedTailWait([]).wait);
    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();

    // ch14-p3b: the committed lane is FIVE rows now — the two
    // transitions, the park's DECISION_REQUEST, and the two operator
    // rows — and the whole lane drains before the final diag read.
    for (let i = 0; i < 5; i += 1) {
      expect((await nextRow(iterator)).lane, `committed row ${String(i + 1)}`).toBe("committed");
    }
    await expect(iterator.next()).rejects.toMatchObject({
      name: "DiagUnavailableError",
      reason: "read_failed",
    });
    expect((await iterator.next()).done).toBe(true);
    expect(reader.calls()).toBe(2);
    r.close();
  });

  it("E7 — wait() rejection propagates as-is; tail terminated (re-driven in the two-lane engine)", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const tail = createDiagTail(r.store, r.diag.reader, () => Promise.reject(new Error("boom")));
    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();

    expect((await nextRow(iterator)).lane).toBe("committed");
    await expect(iterator.next()).rejects.toThrow("boom");
    expect((await iterator.next()).done).toBe(true);
    r.close();
  });

  it("E8 — contract-violating reader (NON-typed rejection) at the round phase: propagates as-is, the tail classifies NOTHING", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const reader = scriptedReader([failWith(new Error("not a typed diag error"))]);
    const tail = createDiagTail(r.store, reader.reader, createScriptedTailWait([]).wait);
    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toThrow("not a typed diag error");
    expect((await iterator.next()).done).toBe(true);
    r.close();
  });

  it("E8 — contract-violating reader at the STOP-PATH final read: the name-filtering-catch falsifier — loud, never a silent completion", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The CONVERGED commit now PARKS; the terminal this lane stops on
    // is reached THROUGH the human (approve → commit_pending → COMMIT).
    await throughTheHuman(r.kernel, 3);

    const reader = scriptedReader([ok([]), failWith(new Error("untyped final-read failure"))]);
    const tail = createDiagTail(r.store, reader.reader, createScriptedTailWait([]).wait);
    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();

    // ch14-p3b: the committed lane is FIVE rows now — the two
    // transitions, the park's DECISION_REQUEST, and the two operator
    // rows — and the whole lane drains before the final diag read.
    for (let i = 0; i < 5; i += 1) {
      expect((await nextRow(iterator)).lane, `committed row ${String(i + 1)}`).toBe("committed");
    }
    await expect(iterator.next()).rejects.toThrow("untyped final-read failure");
    expect((await iterator.next()).done).toBe(true);
    r.close();
  });

  it("E9 — committed-lane port rejection, round reads: getTimeline and loadInstance rejections propagate as-is, tail terminated", async () => {
    // getTimeline rejects on the first round read.
    const store1 = scriptedStore([failWith(new Error("timeline-boom"))], []);
    const reader1 = scriptedReader([]);
    const tail1 = createDiagTail(store1, reader1.reader, createScriptedTailWait([]).wait);
    const it1 = tail1.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();
    await expect(it1.next()).rejects.toThrow("timeline-boom");
    expect((await it1.next()).done).toBe(true);
    expect(reader1.calls()).toBe(0);

    // loadInstance rejects after the round's yields.
    const store2 = scriptedStore([ok([fakeRow(1)])], [failWith(new Error("load-boom"))]);
    const reader2 = scriptedReader([ok([])]);
    const tail2 = createDiagTail(store2, reader2.reader, createScriptedTailWait([]).wait);
    const it2 = tail2.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();
    expect((await nextRow(it2)).lane).toBe("committed");
    await expect(it2.next()).rejects.toThrow("load-boom");
    expect((await it2.next()).done).toBe(true);
  });

  it("E9 — stop-path DRAIN-read rejection: terminal observed, the drain getTimeline rejects → loud on that next(), rows between last yield and terminal are never dropped silently", async () => {
    const store = scriptedStore(
      [ok([fakeRow(1)]), failWith(new Error("drain-boom"))],
      [ok({ ...instance, kernelStatus: "TERMINAL" as const, terminalDisposition: "done" as const, version: 2 })],
    );
    const reader = scriptedReader([ok([])]);
    const scripted = createScriptedTailWait([]);
    const tail = createDiagTail(store, reader.reader, scripted.wait);

    const iterator = tail.tailWithDiagnostics("inst-1", 0, 0)[Symbol.asyncIterator]();
    expect((await nextRow(iterator)).lane).toBe("committed");
    await expect(iterator.next()).rejects.toThrow("drain-boom");
    expect((await iterator.next()).done).toBe(true);
    expect(scripted.calls()).toBe(0);
  });

  it("dimension 6 resume lane — a round's fetch failure precedes its yields, and a new tail from the last yielded cursors delivers everything exactly once", async () => {
    const r = await rig();
    await committed(r.kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    r.diag.sink.emit(diagBody("e1"));

    // Tail #1: a pass-through reader that fails on its SECOND read —
    // the same round that carries freshly committed rows.
    let reads = 0;
    const failingReader: DiagnosticsReader = {
      getDiagnostics: (id, afterOrdinal) => {
        reads += 1;
        if (reads >= 2) {
          return Promise.reject(new DiagUnavailableError("read_failed"));
        }
        return r.diag.reader.getDiagnostics(id, afterOrdinal);
      },
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const scripted = createScriptedTailWait([
      async () => {
        await committed(r.kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
        // The CONVERGED commit now PARKS; the terminal this lane stops
        // on is reached THROUGH the human.
        await throughTheHuman(r.kernel, 3);
        r.diag.sink.emit(diagBody("e2"));
      },
    ]);
    const tail1 = createDiagTail(r.store, failingReader, scripted.wait);
    const yielded: DiagTailRow[] = [];
    await expect(
      (async () => {
        for await (const row of tail1.tailWithDiagnostics("inst-1", 0, 0)) {
          yielded.push(row);
        }
      })(),
    ).rejects.toMatchObject({ name: "DiagUnavailableError", reason: "read_failed" });

    // (i) The failing round's committed rows were NOT yielded before the
    // error (T3: fetches precede yields).
    expect(committedRows(yielded).map(opIdOf)).toEqual(["a1"]);
    expect(diagEvents(yielded).map((event) => event.opId)).toEqual(["e1"]);

    // (ii) A new tail from the last yielded cursors delivers everything
    // exactly once (rows carry their own cursors — T4).
    const lastSeq = committedRows(yielded).at(-1)?.seq ?? 0;
    const lastOrdinal = diagEvents(yielded).at(-1)?.ordinal ?? 0;
    const tail2 = createDiagTail(r.store, r.diag.reader, createScriptedTailWait([]).wait);
    const resumed = await collectAll(tail2.tailWithDiagnostics("inst-1", lastSeq, lastOrdinal));
    expect(committedRows(resumed).map(opIdOf)).toEqual(["b2", R, "d1", "r1"]);
    expect(diagEvents(resumed).map((event) => event.opId)).toEqual(["e2"]);
    r.close();
  });
});
