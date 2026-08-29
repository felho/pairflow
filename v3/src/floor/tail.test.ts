import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  Outcome,
  TranscriptEntry,
  WorkflowInstance,
} from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createKernel } from "../kernel/index.js";
import type { Kernel } from "../kernel/index.js";
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
import { createTail, TailIntegrityError, TailUnknownInstanceError } from "./tail.js";
import { noopDiagnosticsSink } from "../diag/index.js";

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

function makeKernel(store: StorePort): Kernel {
  return createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
  });
}

async function committed(kernel: Kernel, envelope: EventEnvelope): Promise<void> {
  const outcome = await kernel.handle(envelope);
  expect(outcome.kind).toBe("committed");
}

/** The shipped request-ref mint under the controlled clock at 0: the
 * gate park is each lane's FIRST minted request, so the ref is a
 * COMPUTABLE literal rather than a wildcard. */
const R = "req-0-1";

/** ch14-p3b (R2's re-pin discipline): the shipped CONVERGED edge no
 * longer terminates — it PARKS at `human_approval`. The terminal
 * arrival these lanes complete on is RESTATED against the new route,
 * never dropped: the bound operator approves (routing to the
 * `commit_pending` wait) and a COMMIT resume reaches `done`. Both legs
 * commit, so each lane's row expectations GROW by the park's
 * DECISION_REQUEST row and the two operator rows. */
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

async function collect(rows: AsyncIterable<TranscriptEntry>): Promise<TranscriptEntry[]> {
  const out: TranscriptEntry[] = [];
  for await (const row of rows) {
    out.push(row);
  }
  return out;
}

async function nextRow(iterator: AsyncIterator<TranscriptEntry>): Promise<TranscriptEntry> {
  const result = await iterator.next();
  if (result.done === true) {
    throw new Error("iterator completed before the expected row");
  }
  return result.value;
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

/** [seq, opId] per class (C12): a transition's op id rides its
 * envelope, a fact's rides the row itself. */
function opIdOf(entry: TranscriptEntry): string {
  if (entry.entryKind === "transition") return entry.envelope.opId;
  // K12 (ch14-p2a): the DECISION_REQUEST class is OP-LESS — kernel-
  // derived, correlated by `requestRef`. An op-less row is not an op.
  if (entry.entryKind === "DECISION_REQUEST") return entry.requestRef;
  return entry.opId;
}

/** Engine-probe double (the traceHarness dim-4 precedent): scripted
 * read sequences stage interleaves the real store cannot schedule
 * deterministically. Reads consume their queues; running dry is a
 * test-script bug and throws. */
function scriptedStore(
  timelineBatches: ReadonlyArray<readonly TranscriptEntry[] | null>,
  instanceReads: ReadonlyArray<WorkflowInstance | null>,
): StorePort {
  const batches = [...timelineBatches];
  const reads = [...instanceReads];
  return {
    loadInstance: () => {
      if (reads.length === 0) {
        throw new Error("scripted store: instance-read queue dry");
      }
      return Promise.resolve(reads.shift() as WorkflowInstance | null);
    },
    findOp: () => Promise.reject(new Error("unused")),
    createInstance: () => Promise.reject(new Error("unused")),
    commitTransition: () => Promise.reject(new Error("unused")),
    commitLifecycle: () => Promise.reject(new Error("unused")),
    commitOperatorEntry: () => Promise.reject(new Error("unused")),
    listInstances: () => Promise.reject(new Error("unused")),
    getInstanceDetail: () => Promise.reject(new Error("unused")),
    getTimeline: () => {
      if (batches.length === 0) {
        throw new Error("scripted store: timeline queue dry");
      }
      return Promise.resolve(batches.shift() as readonly TranscriptEntry[] | null);
    },
  };
}

const dirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-tail-"));
  dirs.push(dir);
  return join(dir, "store.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("tailCommittedTimeline — the committed floor-tail seed (packet ch6-P2)", () => {
  it("dims 1+4b — already-terminal at start: full replay, completes with ZERO waits", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const kernel = makeKernel(handle.store);
    await committed(kernel, env("a1", "PASS", 1, { ref: "diff-1" }));
    await committed(kernel, env("b2", "CONVERGED", 2, undefined, "reviewer"));
    // The run is now PARKED, not terminal: the terminal arrival this
    // lane completes on runs THROUGH the human.
    await throughTheHuman(kernel, 3);

    const scripted = createScriptedTailWait([]);
    const tail = createTail(handle.store, scripted.wait);
    const rows = await collect(tail.tailCommittedTimeline("inst-1", 0));

    // The CONVERGED commit writes TWO rows — the transition and the
    // park's op-less DECISION_REQUEST — so the replay is five rows, and
    // the last committing entry before `done` is a WAIT_RESUMED.
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map(opIdOf)).toEqual(["a1", "b2", R, "d1", "r1"]);
    expect(rows.map((r) => r.entryKind)).toEqual([
      "transition",
      "transition",
      "DECISION_REQUEST",
      "DECISION_MADE",
      "WAIT_RESUMED",
    ]);
    expect(scripted.calls()).toBe(0);
    handle.close();
  });

  it("dims 2+3+4a — live no-skip/no-duplicate/stop over ONE WAL file, tail and writer on separate handles", async () => {
    const path = tempDbPath();
    const reader = openStore(path, createControlledClock(0));
    const writer = openStore(path, createControlledClock(0));
    await writer.store.createInstance(instance);
    const kernel = makeKernel(writer.store);
    await committed(kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const scripted = createScriptedTailWait([
      () => committed(kernel, env("b2", "PASS", 2, { ref: "diff-2" }, "reviewer")),
      () => committed(kernel, env("c3", "PASS", 3, { ref: "diff-3" })),
      () => committed(kernel, env("d4", "CONVERGED", 4, undefined, "reviewer")),
      // ch14-p3b: the CONVERGED commit parks; the terminal commit this
      // lane completes on is the RESUME, two operator steps later.
      () => throughTheHuman(kernel, 5),
    ]);
    const tail = createTail(reader.store, scripted.wait);
    const rows = await collect(tail.tailCommittedTimeline("inst-1", 0));

    // Replay (a1) + every mid-tail commit, each exactly once, in seq
    // order, then completion after the cross-handle terminal commit.
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rows.map(opIdOf)).toEqual(["a1", "b2", "c3", "d4", R, "d1", "r1"]);
    expect(scripted.calls()).toBe(4);
    reader.close();
    writer.close();
  });

  it("dim 4c — terminal lands BETWEEN drain and status read: the final drain yields it, no wait ever runs", async () => {
    // Scripted schedule: drain sees row 1 only; the status read already
    // shows DONE (the terminal commit landed just after the drain); the
    // no-wait final drain picks up row 2, then the empty batch closes.
    const store = scriptedStore(
      [[fakeRow(1)], [fakeRow(2)], []],
      [{ ...instance, kernelStatus: "TERMINAL", terminalDisposition: "done", version: 3 }],
    );
    const scripted = createScriptedTailWait([]);
    const tail = createTail(store, scripted.wait);

    const rows = await collect(tail.tailCommittedTimeline("inst-1", 0));
    expect(rows.map((r) => r.seq)).toEqual([1, 2]);
    expect(scripted.calls()).toBe(0);
  });

  it("dim 5 — unknown instance at start: named error on the FIRST next(), zero waits", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const scripted = createScriptedTailWait([]);
    const tail = createTail(handle.store, scripted.wait);

    await expect(collect(tail.tailCommittedTimeline("ghost", 0))).rejects.toThrow(
      TailUnknownInstanceError,
    );
    expect(scripted.calls()).toBe(0);
    handle.close();
  });

  it("dim 6 — invalid cursor: RangeError on the FIRST next(), zero waits", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const scripted = createScriptedTailWait([]);
    const tail = createTail(handle.store, scripted.wait);

    await expect(collect(tail.tailCommittedTimeline("inst-1", -1))).rejects.toThrow(
      RangeError,
    );
    expect(scripted.calls()).toBe(0);
    handle.close();
  });

  it("dim 7 — committed-only inherited: rejected lanes fired mid-tail yield NOTHING", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const kernel = makeKernel(handle.store);
    await committed(kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const rejectedOutcomes: Outcome[] = [];
    const scripted = createScriptedTailWait([
      async () => {
        // Stale + collision through the real kernel — no commit.
        rejectedOutcomes.push(await kernel.handle(env("z9", "PASS", 1, { ref: "x" })));
        rejectedOutcomes.push(await kernel.handle(env("a1", "PASS", 2, { ref: "TAMPERED" })));
      },
      () => committed(kernel, env("b2", "CONVERGED", 2, undefined, "reviewer")),
      () => throughTheHuman(kernel, 3),
    ]);
    const tail = createTail(handle.store, scripted.wait);
    const rows = await collect(tail.tailCommittedTimeline("inst-1", 0));

    expect(rejectedOutcomes.map((o) => o.kind)).toEqual(["stale", "rejected"]);
    expect(rows.map(opIdOf)).toEqual(["a1", "b2", R, "d1", "r1"]);
    expect(scripted.calls()).toBe(3);
    handle.close();
  });

  it("dim 8 — mid-stream vanish (timeline read): TailIntegrityError, tail over", async () => {
    const store = scriptedStore([[fakeRow(1)], null], [{ ...instance }]);
    const scripted = createScriptedTailWait([() => undefined]);
    const tail = createTail(store, scripted.wait);

    const it2 = tail.tailCommittedTimeline("inst-1", 0)[Symbol.asyncIterator]();
    expect((await nextRow(it2)).seq).toBe(1);
    await expect(it2.next()).rejects.toThrow(TailIntegrityError);
    expect(scripted.calls()).toBe(1);
  });

  it("dim 8 — mid-stream vanish (status read): TailIntegrityError before any wait", async () => {
    const store = scriptedStore([[fakeRow(1)]], [null]);
    const scripted = createScriptedTailWait([]);
    const tail = createTail(store, scripted.wait);

    const it2 = tail.tailCommittedTimeline("inst-1", 0)[Symbol.asyncIterator]();
    expect((await nextRow(it2)).seq).toBe(1);
    await expect(it2.next()).rejects.toThrow(TailIntegrityError);
    expect(scripted.calls()).toBe(0);
  });

  it("dim 9 — a wait() rejection propagates as-is and the tail is terminated", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const kernel = makeKernel(handle.store);
    await committed(kernel, env("a1", "PASS", 1, { ref: "diff-1" }));

    const tail = createTail(handle.store, () => Promise.reject(new Error("boom")));
    const it2 = tail.tailCommittedTimeline("inst-1", 0)[Symbol.asyncIterator]();

    expect((await nextRow(it2)).seq).toBe(1);
    await expect(it2.next()).rejects.toThrow("boom");
    expect((await it2.next()).done).toBe(true);
    handle.close();
  });

  it("scripted-wait guard — an exhausted script is a loud error, never a hang", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    // RUNNING instance, empty script: the first wait must blow up.
    const scripted = createScriptedTailWait([]);
    const tail = createTail(handle.store, scripted.wait);

    await expect(collect(tail.tailCommittedTimeline("inst-1", 0))).rejects.toThrow(
      /exhausted after 0 steps/,
    );
    handle.close();
  });
});
