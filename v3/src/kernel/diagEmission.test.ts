import { readFile } from "node:fs/promises";

import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { describe, expect, it } from "vitest";

import type {
  CommitTransitionInput,
  CommitTransitionResult,
  StorePort,
} from "../ports/store.js";
import type { AdmittedTemplate, EventEnvelope, WorkflowInstance, WorkflowTemplate } from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { DiagnosticsSink } from "../ports/diagnostics.js";
import { openStore } from "../store/index.js";
import { createControlledClock, createRecordingDiagnosticsSink } from "../testkit/index.js";
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

/**
 * An admitted template that has DRIFTED: admission is structural on both
 * channels (ADR-019 D1), so a dangling transition target or a `start`
 * naming no step can no longer be admitted in the first place. The
 * internal_failure lanes below are about a value that PASSED admission
 * and then lost a step — integrity drift, not an authoring defect — so
 * the fixture admits a whole template and removes the step afterwards.
 * ch11-P2a A6 keeps the brand mint in `definition/admit.ts`; this route
 * mints nothing.
 */
function admitThenDropStep(template: WorkflowTemplate, stepId: string): AdmittedTemplate {
  const admitted = admit(template);
  delete (admitted.steps as Record<string, unknown>)[stepId];
  return admitted;
}
import { createKernel } from "./kernel.js";

// Packet ch7-P1: the canonical emission matrix + lane-inventory table,
// every lane driven — BOTH success negatives, both origins of
// duplicate/op_id_collision, per-sublane throw fakes, exact keysets
// (source/kind structural; payloadDigest by DIGEST POINT).

const template: WorkflowTemplate = {
  ref: { id: "local-pair-v0", version: 1 },
  start: "implement",
  steps: {
    implement: { role: "implementer", instruction: "build it", transitions: { PASS: "review" } },
    review: {
      role: "reviewer",
      instruction: "review it",
      transitions: { PASS: "implement", CONVERGED: "done" },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
};

const definitions: DefinitionStore = {
  load: (ref) =>
    Promise.resolve(ref.id === "local-pair-v0" && ref.version === 1 ? admit(template) : null),
};

const baseInstance: WorkflowInstance = {
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

function envelope(
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

const attribution = {
  instanceId: "inst-1",
  actorId: "codex",
} as const;

async function setup() {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
  const diag = createRecordingDiagnosticsSink();
  const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: diag.sink,
  });
  return { kernel, store: handle.store, diag };
}

describe("separation negatives — success returns emit nothing", () => {
  it("a restart-free committed submit emits ZERO events", async () => {
    const { kernel, diag } = await setup();
    const outcome = await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff" }));
    expect(outcome.kind).toBe("committed");
    expect(diag.events).toEqual([]);
  });

  it("a successful create + start emits ZERO events", async () => {
    const { kernel, diag } = await setup();
    await kernel.create({
      instanceId: "inst-2",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "another",
    });
    await kernel.start({ instanceId: "inst-2", opId: "start-inst-2" });
    expect(diag.events).toEqual([]);
  });
});

describe("outcome lanes — exact keysets, payloadDigest by digest point", () => {
  it("duplicate via the findOp fast-path: full keyset, digest present", async () => {
    const { kernel, diag } = await setup();
    const env = envelope("a1", "PASS", 1, { ref: "diff" });
    await kernel.handle(env);
    diag.events.length = 0;
    const second = await kernel.handle(env);
    expect(second).toEqual({ kind: "duplicate" });
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "duplicate",
        ...attribution,
        opId: "a1",
        type: "PASS",
        payloadDigest: deriveEmitDigest(env),
      },
    ]);
  });

  it("duplicate via the commitTransition duplicate_op result (second origin)", async () => {
    const { store, diag, kernel } = await commitResultKernel({ kind: "duplicate_op" });
    const outcome = await kernel.handle(envelope("a1", "PASS", 1, { ref: "d" }));
    expect(outcome).toEqual({ kind: "duplicate" });
    expect(store.findOpCalls).toBeGreaterThan(0);
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({ source: "kernel", kind: "duplicate" });
    expect(diag.events[0]?.payloadDigest).toBeTypeOf("string");
  });

  it("op_id_collision via findOp digest mismatch: keyset + reason", async () => {
    const { kernel, diag } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff" }));
    diag.events.length = 0;
    const collided = await kernel.handle(envelope("a1", "PASS", 1, { ref: "OTHER" }));
    expect(collided).toEqual({ kind: "rejected", reason: "op_id_collision" });
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "op_id_collision",
        ...attribution,
        opId: "a1",
        type: "PASS",
        payloadDigest: deriveEmitDigest(envelope("a1", "PASS", 1, { ref: "OTHER" })),
      },
    ]);
  });

  it("op_id_collision via the commitTransition result (second origin)", async () => {
    const { diag, kernel } = await commitResultKernel({ kind: "op_id_collision" });
    const outcome = await kernel.handle(envelope("a1", "PASS", 1, { ref: "d" }));
    expect(outcome).toEqual({ kind: "rejected", reason: "op_id_collision" });
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({ kind: "rejected", reason: "op_id_collision" });
  });

  it("missing_version and no_transition: keyset with digest present", async () => {
    const { kernel, diag } = await setup();
    await kernel.handle(envelope("m1", "PASS"));
    await kernel.handle(envelope("n1", "NOPE", 1));
    expect(diag.events.map((e) => [e.kind, e.reason])).toEqual([
      ["rejected", "missing_version"],
      ["rejected", "no_transition"],
    ]);
    for (const event of diag.events) {
      expect(event.payloadDigest).toBeTypeOf("string");
      expect(event).toMatchObject({ ...attribution, source: "kernel" });
    }
  });

  it("stale: versions + digest present", async () => {
    const { kernel, diag } = await setup();
    const env = envelope("s1", "PASS", 999, { x: 1 });
    const outcome = await kernel.handle(env);
    expect(outcome).toEqual({ kind: "stale", currentVersion: 1 });
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "stale",
        ...attribution,
        opId: "s1",
        type: "PASS",
        expectedVersion: 999,
        currentVersion: 1,
        payloadDigest: deriveEmitDigest(env),
      },
    ]);
  });

  it("unknown_instance: pre-digest — NO payloadDigest in the keyset", async () => {
    const { kernel, diag } = await setup();
    const outcome = await kernel.handle({ ...envelope("u1", "PASS", 1), instanceId: "ghost" });
    expect(outcome).toEqual({ kind: "rejected", reason: "unknown_instance" });
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "unknown_instance",
        instanceId: "ghost",
        opId: "u1",
        actorId: "codex",
        type: "PASS",
      },
    ]);
  });

  it("absent payload still digests on post-digest lanes (arity encoding, ADR-008)", async () => {
    const { kernel, diag } = await setup();
    const env = envelope("ap1", "PASS", 999);
    await kernel.handle(env);
    expect(diag.events[0]?.payloadDigest).toBe(deriveEmitDigest(env));
  });
});

describe("cas_restart — count discipline", () => {
  it("one conflict then commit: exactly one cas_restart (full attribution + digest), zero outcome-classified", async () => {
    const { diag, kernel } = await conflictThenRealKernel(1);
    const env = envelope("c1", "PASS", 1, { r: 1 });
    const outcome = await kernel.handle(env);
    expect(outcome.kind).toBe("committed");
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "cas_restart",
        ...attribution,
        opId: "c1",
        type: "PASS",
        payloadDigest: deriveEmitDigest(env),
      },
    ]);
  });

  it("N conflicts → N cas_restart events", async () => {
    const { diag, kernel } = await conflictThenRealKernel(2);
    await kernel.handle(envelope("c2", "PASS", 1));
    expect(diag.events.filter((e) => e.kind === "cas_restart")).toHaveLength(2);
    expect(diag.events.filter((e) => e.kind !== "cas_restart")).toHaveLength(0);
  });

  it("restart then unknown_instance: the pre-digest lane must NOT inherit the prior attempt's digest", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(baseInstance);
    let loads = 0;
    const store: StorePort = {
      ...handle.store,
      loadInstance: (id) => {
        loads += 1;
        return loads === 1 ? handle.store.loadInstance(id) : Promise.resolve(null);
      },
      commitTransition: () => Promise.resolve({ kind: "cas_conflict" as const }),
    };
    const diag = createRecordingDiagnosticsSink();
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: diag.sink,
    });
    const env = envelope("x1", "PASS", 1, { r: 1 });
    const outcome = await kernel.handle(env);
    expect(outcome).toEqual({ kind: "rejected", reason: "unknown_instance" });
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "cas_restart",
        ...attribution,
        opId: "x1",
        type: "PASS",
        payloadDigest: deriveEmitDigest(env),
      },
      {
        source: "kernel",
        kind: "rejected",
        reason: "unknown_instance",
        ...attribution,
        opId: "x1",
        type: "PASS",
      },
    ]);
  });

  it("restart then a pre-digest throw: internal_failure must NOT inherit the prior attempt's digest", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(baseInstance);
    const boom = new Error("store down");
    let loads = 0;
    const store: StorePort = {
      ...handle.store,
      loadInstance: (id) => {
        loads += 1;
        return loads === 1 ? handle.store.loadInstance(id) : Promise.reject(boom);
      },
      commitTransition: () => Promise.resolve({ kind: "cas_conflict" as const }),
    };
    const diag = createRecordingDiagnosticsSink();
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: diag.sink,
    });
    await expect(kernel.handle(envelope("x2", "PASS", 1, { r: 1 }))).rejects.toBe(boom);
    const failure = diag.events.find((e) => e.kind === "internal_failure");
    expect(failure).toBeDefined();
    expect(failure?.payloadDigest).toBeUndefined();
    expect(failure?.error).toEqual({ name: "Error", message: "store down" });
  });
});

describe("handle internal_failure lanes — emit + rethrow unchanged", () => {
  it("loadInstance rejection: pre-digest keyset (no payloadDigest), same error rethrown", async () => {
    const { kernel, diag, boom } = await throwingStoreKernel("loadInstance");
    await expect(kernel.handle(envelope("t1", "PASS", 1, { x: 1 }))).rejects.toBe(boom);
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "internal_failure",
        ...attribution,
        opId: "t1",
        type: "PASS",
        error: { name: "Error", message: "store down" },
      },
    ]);
  });

  it("definitions.load rejection: pre-digest, emit + rethrow", async () => {
    const boom = new Error("defs down");
    const badDefs: DefinitionStore = { load: () => Promise.reject(boom) };
    const rec = createRecordingDiagnosticsSink();
    const kernel = await kernelWith({ definitions: badDefs, diag: rec });
    await expect(kernel.handle(envelope("t2", "PASS", 1))).rejects.toBe(boom);
    expect(rec.events[0]).toMatchObject({
      kind: "internal_failure",
      error: { name: "Error", message: "defs down" },
    });
    expect(rec.events[0]?.payloadDigest).toBeUndefined();
  });

  it("pinned-template integrity throw: emit with error name/message, rethrow unchanged", async () => {
    const rec = createRecordingDiagnosticsSink();
    const gone: DefinitionStore = { load: () => Promise.resolve(null) };
    const kernel = await kernelWith({ definitions: gone, diag: rec });
    await expect(kernel.handle(envelope("t3", "PASS", 1))).rejects.toThrow(
      /kernel integrity: pinned template/,
    );
    expect(rec.events[0]).toMatchObject({ kind: "internal_failure" });
    expect(rec.events[0]?.error?.message).toMatch(/pinned template/);
    expect(rec.events[0]?.payloadDigest).toBeUndefined();
  });

  it("digest throw (contract-violating fake): attribution, NO digest, rethrow", async () => {
    const rec = createRecordingDiagnosticsSink();
    const boom = new Error("digest exploded");
    const kernel = await kernelWith({
      diag: rec,
      digest: () => {
        throw boom;
      },
    });
    await expect(kernel.handle(envelope("t4", "PASS", 1, { x: 1 }))).rejects.toBe(boom);
    expect(rec.events).toEqual([
      {
        source: "kernel",
        kind: "internal_failure",
        ...attribution,
        opId: "t4",
        type: "PASS",
        error: { name: "Error", message: "digest exploded" },
      },
    ]);
  });

  it("findOp rejection: post-digest — payloadDigest present", async () => {
    const { kernel, diag, boom } = await throwingStoreKernel("findOp");
    const env = envelope("t5", "PASS", 1, { x: 1 });
    await expect(kernel.handle(env)).rejects.toBe(boom);
    expect(diag.events[0]?.payloadDigest).toBe(deriveEmitDigest(env));
    expect(diag.events[0]?.error).toEqual({ name: "Error", message: "store down" });
  });

  it("commitTransition rejection: post-digest — payloadDigest present, rethrow", async () => {
    const { kernel, diag, boom } = await throwingStoreKernel("commitTransition");
    const env = envelope("t6", "PASS", 1);
    await expect(kernel.handle(env)).rejects.toBe(boom);
    expect(diag.events[0]?.payloadDigest).toBe(deriveEmitDigest(env));
  });

  it("post-commit derive throw: emit + rethrow AND the transition IS persisted", async () => {
    const corrupted = admitThenDropStep(
      {
        ...template,
        steps: {
          ...template.steps,
          implement: {
            role: "implementer",
            instruction: "build it",
            transitions: { PASS: "vanished" },
          },
          vanished: { role: "implementer", instruction: "gone", transitions: {} },
        },
      },
      "vanished",
    );
    const rec = createRecordingDiagnosticsSink();
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(baseInstance);
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: { load: () => Promise.resolve(corrupted) },
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: rec.sink,
    });
    const env = envelope("t7", "PASS", 1, { x: 1 });
    await expect(kernel.handle(env)).rejects.toThrow(/no definition/);
    expect(rec.events[0]).toMatchObject({
      kind: "internal_failure",
      ...attribution,
      opId: "t7",
      payloadDigest: deriveEmitDigest(env),
    });
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.instance.version).toBe(2);
  });
});

describe("create/start internal_failure lanes — {instanceId, error} keyset", () => {
  const startInput = {
    instanceId: "born-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "t",
  };

  it("definitions.load rejection (port failure ≠ the null lane)", async () => {
    const rec = createRecordingDiagnosticsSink();
    const boom = new Error("defs down");
    const kernel = await kernelWith({
      definitions: { load: () => Promise.reject(boom) },
      diag: rec,
    });
    await expect(kernel.create(startInput)).rejects.toBe(boom);
    expect(rec.events).toEqual([
      {
        source: "kernel",
        kind: "internal_failure",
        instanceId: "born-1",
        error: { name: "Error", message: "defs down" },
      },
    ]);
  });

  it("unknown template (definitions.load → null)", async () => {
    const rec = createRecordingDiagnosticsSink();
    const kernel = await kernelWith({
      definitions: { load: () => Promise.resolve(null) },
      diag: rec,
    });
    await expect(kernel.create(startInput)).rejects.toThrow(/not found/);
    expect(rec.events[0]).toMatchObject({
      kind: "internal_failure",
      instanceId: "born-1",
    });
    expect(rec.events[0]?.opId).toBeUndefined();
  });

  it("binding coverage failure", async () => {
    const uncovered: WorkflowTemplate = {
      ...template,
      roles: { implementer: {}, reviewer: {} },
    };
    const rec = createRecordingDiagnosticsSink();
    const kernel = await kernelWith({
      definitions: { load: () => Promise.resolve(admit(uncovered)) },
      diag: rec,
    });
    await expect(kernel.create(startInput)).rejects.toThrow(/binding coverage/);
    expect(rec.events[0]?.error?.message).toMatch(/binding coverage/);
  });

  it("createInstance rejection (store port failure)", async () => {
    const rec = createRecordingDiagnosticsSink();
    const boom = new Error("disk full");
    const handle = openStore(":memory:", createControlledClock(0));
    const failing: StorePort = {
      ...handle.store,
      createInstance: () => Promise.reject(boom),
    };
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: failing,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: rec.sink,
    });
    await expect(kernel.create(startInput)).rejects.toBe(boom);
    expect(rec.events[0]?.error).toEqual({ name: "Error", message: "disk full" });
  });

  it("post-create derive throw: emit + rethrow AND the instance IS persisted", async () => {
    const corrupted = admitThenDropStep(
      {
        ...template,
        start: "phantom",
        steps: {
          ...template.steps,
          phantom: { role: "implementer", instruction: "gone", transitions: {} },
        },
      },
      "phantom",
    );
    const rec = createRecordingDiagnosticsSink();
    const handle = openStore(":memory:", createControlledClock(0));
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: { load: () => Promise.resolve(corrupted) },
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: rec.sink,
    });
    // CREATE persists the genesis record (emits nothing); the derive throw
    // now lives on START's activation path (the create/start split, C24), so
    // the internal_failure carries START's attribution — instanceId + opId.
    await kernel.create(startInput);
    await expect(kernel.start({ instanceId: "born-1", opId: "start-born-1" })).rejects.toThrow(
      /no definition/,
    );
    expect(rec.events).toEqual([
      {
        source: "kernel",
        kind: "internal_failure",
        instanceId: "born-1",
        opId: "start-born-1",
        error: {
          name: "Error",
          message: "kernel integrity: dispatch target step 'phantom' has no definition",
        },
      },
    ]);
    const persisted = await handle.store.loadInstance("born-1");
    expect(persisted).not.toBeNull();
  });
});

// --- fakes -----------------------------------------------------------

async function kernelWith(overrides: {
  definitions?: DefinitionStore;
  diag: { sink: DiagnosticsSink };
  digest?: (envelope: EventEnvelope) => string;
}) {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
  return createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: overrides.definitions ?? definitions,
    time: createControlledClock(0),
    digest: overrides.digest ?? deriveEmitDigest,
    gates: gateCatalog,
    diag: overrides.diag.sink,
  });
}

/** A store whose named method rejects; everything else is real. */
async function throwingStoreKernel(method: "loadInstance" | "findOp" | "commitTransition") {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
  const boom = new Error("store down");
  const store: StorePort = {
    ...handle.store,
    [method]: () => Promise.reject(boom),
  };
  const diag = createRecordingDiagnosticsSink();
  const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: diag.sink,
  });
  return { kernel, diag, boom };
}

/** A store whose commitTransition returns a scripted result once. */
async function commitResultKernel(result: CommitTransitionResult) {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
  let findOpCalls = 0;
  const store: StorePort & { findOpCalls: number } = {
    ...handle.store,
    get findOpCalls() {
      return findOpCalls;
    },
    findOp: (...args) => {
      findOpCalls += 1;
      return handle.store.findOp(...args);
    },
    commitTransition: () => Promise.resolve(result),
  };
  const diag = createRecordingDiagnosticsSink();
  const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: diag.sink,
  });
  return { kernel, diag, store };
}

/** First N commitTransition calls return cas_conflict, then real. */
async function conflictThenRealKernel(conflicts: number) {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
  let remaining = conflicts;
  const store: StorePort = {
    ...handle.store,
    commitTransition: (input: CommitTransitionInput) => {
      if (remaining > 0) {
        remaining -= 1;
        return Promise.resolve({ kind: "cas_conflict" as const });
      }
      return handle.store.commitTransition(input);
    },
  };
  const diag = createRecordingDiagnosticsSink();
  const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: diag.sink,
  });
  return { kernel, diag };
}

// ── packet ch11-P1: the four new kernel rejections (dimension 7, D3) ──

describe("L1 rejection lanes — one kernel/rejected event each, payloadDigest present (post-digest)", () => {
  it("missing_role: full keyset with digest", async () => {
    const { kernel, diag } = await setup();
    const { expectedRole: dropped, ...env } = envelope("l1a", "PASS", 1, { ref: "d" });
    void dropped;
    await kernel.handle(env);
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "missing_role",
        ...attribution,
        opId: "l1a",
        type: "PASS",
        payloadDigest: deriveEmitDigest(env),
      },
    ]);
  });

  it("role_not_authorized: full keyset with digest", async () => {
    const { kernel, diag } = await setup();
    const env = envelope("l1b", "PASS", 1, { ref: "d" }, "reviewer");
    await kernel.handle(env);
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "role_not_authorized",
        ...attribution,
        opId: "l1b",
        type: "PASS",
        payloadDigest: deriveEmitDigest(env),
      },
    ]);
  });

  it("not_active (DONE instance): full keyset with digest", async () => {
    const { kernel, diag } = await setup();
    await kernel.handle(envelope("l1c", "PASS", 1, { ref: "d" }));
    await kernel.handle(envelope("l1d", "CONVERGED", 2, { ref: "d" }, "reviewer"));
    diag.events.length = 0;
    const env = envelope("l1e", "PASS", 3, { ref: "d" });
    await kernel.handle(env);
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "not_active",
        ...attribution,
        opId: "l1e",
        type: "PASS",
        payloadDigest: deriveEmitDigest(env),
      },
    ]);
  });
});

describe("L1 rejection lanes — not_authorized (explicit profile, local wiring)", () => {
  it("not_authorized: full keyset with digest", async () => {
    const profiled: WorkflowTemplate = {
      ...template,
      capabilityProfile: { implementer: { implement: [] } },
    };
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(baseInstance);
    const diag = createRecordingDiagnosticsSink();
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: { load: () => Promise.resolve(admit(profiled)) },
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: diag.sink,
    });
    const env = envelope("l1f", "PASS", 1, { ref: "d" });
    await kernel.handle(env);
    expect(diag.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "not_authorized",
        ...attribution,
        opId: "l1f",
        type: "PASS",
        payloadDigest: deriveEmitDigest(env),
      },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 16 — the diagnostic classification the two operator intents
// need, and the NO-MOVE control over the shared wrapper's rider set
// (packet ch14-p2b, Q18).
// ─────────────────────────────────────────────────────────────────────

const opTemplate: WorkflowTemplate = {
  ref: { id: "diag-ops", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "gate" },
      recommends: { PASS: "approve" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "decide",
      decisions: { approve: { target: "done" } },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, operator: { defaultActor: "human-1" } },
};

async function parkedForDiag(rec: { readonly sink: DiagnosticsSink }) {
  const admittedOps = admit(opTemplate);
  const handle = openStore(":memory:", createControlledClock(1_000));
  const kernel = createKernel({
    providerRegistry: createStaticProviderRegistry({}),
    processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: {
      load: (ref) => Promise.resolve(ref.id === admittedOps.ref.id ? admittedOps : null),
    },
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
    diag: rec.sink,
    gates: gateCatalog,
  });
  await kernel.create({ instanceId: "d-1", templateRef: opTemplate.ref, task: "t" });
  await kernel.start({ instanceId: "d-1", opId: "s0" });
  await kernel.handle({
    instanceId: "d-1",
    opId: "a1",
    type: "PASS",
    actorId: "codex",
    expectedVersion: 2,
    expectedRole: "implementer",
  });
  const instance = await handle.store.loadInstance("d-1");
  const requestRef = instance?.wait?.requestRef;
  if (requestRef === undefined) throw new Error("fixture wiring: no request ref");
  return { kernel, store: handle.store, requestRef };
}

describe("family 16 — the two operator intents' diagnostic arms", () => {
  it("a STALE operator intent emits `stale` carrying `currentVersion` from the OPENED wrapper", async () => {
    // THESE ARE THE FIRST OPERATOR INTENTS WITH A VERSION RUNG. Before
    // the wrapper's `stale` arm existed, a stale operator intent emitted
    // NOTHING while the actor path emitted `stale` with its
    // `currentVersion` — the generic bound accepted a stale-carrying
    // union silently.
    const rec = createRecordingDiagnosticsSink();
    const rig = await parkedForDiag(rec);
    rec.events.length = 0;
    const outcome = await rig.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: "d-1",
      opId: "d1",
      expectedVersion: 2,
      requestRef: rig.requestRef,
      verdict: "approve",
      by: "human-1",
    });
    expect(outcome).toEqual({ kind: "stale", currentVersion: 3 });
    // Asserted on the recorded event's FIELDS, never by message
    // containment. Attribution follows the existing shape: instanceId +
    // opId, and NO payload digest — an operator intent carries no digest
    // even when it carries a payload.
    expect(rec.events).toEqual([
      {
        source: "kernel",
        kind: "stale",
        instanceId: "d-1",
        opId: "d1",
        currentVersion: 3,
      },
    ]);
  });

  it("a stale RESUME intent emits the same arm", async () => {
    const rec = createRecordingDiagnosticsSink();
    const rig = await parkedForDiag(rec);
    rec.events.length = 0;
    await rig.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "d-1",
      opId: "r1",
      expectedVersion: 99,
      type: "approve",
    });
    expect(rec.events).toEqual([
      { source: "kernel", kind: "stale", instanceId: "d-1", opId: "r1", currentVersion: 3 },
    ]);
  });

  it("a CAS-restarted operator intent emits `cas_restart` PER RESTART — from its OWN handler loop", async () => {
    // THE TWO ARMS ARE DRIVEN SEPARATELY because they are produced by
    // DIFFERENT MECHANISMS. `cas_restart` is not an outcome arm at all:
    // the shared wrapper awaits ONE call and classifies the RESOLVED
    // outcome, so it has no loop and no sentinel and could never fire
    // this class. A build that tried to source it from the wrapper emits
    // NOTHING — which is what this split lane catches.
    const rec = createRecordingDiagnosticsSink();
    const rig = await parkedForDiag(rec);
    rec.events.length = 0;
    let injected = false;
    const flaky: StorePort = {
      ...rig.store,
      loadInstance: (id) => rig.store.loadInstance(id),
      findOp: (id, opId) => rig.store.findOp(id, opId),
      getTimeline: (id, after) => rig.store.getTimeline(id, after),
      commitOperatorEntry: (input) => {
        if (!injected) {
          injected = true;
          return Promise.resolve({ kind: "cas_conflict" });
        }
        return rig.store.commitOperatorEntry(input);
      },
    };
    const admittedOps = admit(opTemplate);
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: flaky,
      definitions: { load: () => Promise.resolve(admittedOps) },
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      diag: rec.sink,
      gates: gateCatalog,
    });
    const outcome = await kernel.submitDecision({
      intent: "submit-decision",
      instanceId: "d-1",
      opId: "d1",
      expectedVersion: 3,
      requestRef: rig.requestRef,
      verdict: "approve",
      by: "human-1",
    });
    expect(outcome.kind).toBe("committed");
    expect(rec.events).toEqual([
      { source: "kernel", kind: "cas_restart", instanceId: "d-1", opId: "d1" },
    ]);
  });

  it("a REJECTED operator intent emits `rejected` with its reason", async () => {
    const rec = createRecordingDiagnosticsSink();
    const rig = await parkedForDiag(rec);
    rec.events.length = 0;
    await rig.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: "d-1",
      opId: "d1",
      expectedVersion: 3,
      requestRef: rig.requestRef,
      verdict: "nope",
      by: "human-1",
    });
    expect(rec.events).toEqual([
      {
        source: "kernel",
        kind: "rejected",
        reason: "unknown_decision",
        instanceId: "d-1",
        opId: "d1",
      },
    ]);
  });

  it("a COMMITTED operator intent emits NOTHING (the separation negative holds for the new riders too)", async () => {
    const rec = createRecordingDiagnosticsSink();
    const rig = await parkedForDiag(rec);
    rec.events.length = 0;
    const outcome = await rig.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: "d-1",
      opId: "d1",
      expectedVersion: 3,
      requestRef: rig.requestRef,
      verdict: "approve",
      by: "human-1",
    });
    expect(outcome.kind).toBe("committed");
    expect(rec.events).toEqual([]);
  });
});

/**
 * THE ONE ENUMERATION of the shared wrapper's riders, read from
 * `kernel.ts`'s `lifecycleOp(` call sites at RUN TIME — never from a
 * count in a document, and never transcribed twice.
 *
 * Each call site sits inside a member or a function whose name is the
 * rider's. The scan is LINE-BASED and walks BACKWARD from every call
 * site to the nearest declaration — the two forms this file actually
 * uses (`name: (…) =>` and `function name(`).
 */
async function liveRiders(): Promise<Set<string>> {
  const source = await readFile(new URL("./kernel.ts", import.meta.url), "utf8");
  const lines = source.split("\n");
  const declAt = new Map<number, string>();
  lines.forEach((line, i) => {
    // A MEMBER is `name: (` — the trailing `(` is what keeps a parameter
    // line (`ref: RuntimeContextRef,`) from being read as a declaration
    // and shadowing its own enclosing function.
    const member = /^ {4}([A-Za-z][A-Za-z0-9]*):\s*\(/.exec(line);
    const fn = /^\s*(?:async\s+)?function\s+([A-Za-z][A-Za-z0-9]*)\s*\(/.exec(line);
    const name = member?.[1] ?? fn?.[1];
    if (name !== undefined) declAt.set(i, name);
  });
  const wrapped = new Set<string>();
  lines.forEach((line, i) => {
    if (!line.includes("lifecycleOp(")) return;
    for (let j = i; j >= 0; j -= 1) {
      const owner = declAt.get(j);
      if (owner !== undefined) {
        if (owner !== "lifecycleOp") wrapped.add(owner);
        return;
      }
    }
  });
  return wrapped;
}

describe("family 16 — THE NO-MOVE CONTROL: the wrapper's FULL rider set, byte-unmoved", () => {
  /**
   * THE RIDER SET IS ENUMERATED FROM THE CALL SITES, never from a count
   * in a document — a count goes stale the moment a rider is added, and
   * the whole point of this control is to notice that.
   *
   * Read from `kernel.ts`'s `lifecycleOp(` call sites at this build, by
   * the name each site actually sits under: `readyOp` and `failedOp`
   * (the two runtime-context kernel-event handlers, wrapped through
   * their own local functions rather than at the member), plus the
   * members `create`, `start`, `kickoff`, `cancel` and `fail` — SEVEN,
   * and MORE THAN THE OPERATOR INTENTS, which is exactly why the set is
   * the wrapper's full rider list rather than "the lifecycle intents".
   *
   * Every one of their unions carries NO `stale` arm, so the arm added
   * for the two operator intents is UNREACHABLE for all seven. This
   * control asserts that as BEHAVIOUR rather than trusting the type.
   */
  const RIDERS = [
    "readyOp",
    "failedOp",
    "create",
    "start",
    "kickoff",
    "cancel",
    "fail",
  ] as const;

  it("the enumerated rider set matches the wrapper's live call sites", async () => {
    // The enumeration is CHECKED against the source rather than trusted:
    // a rider added without extending this list reds here, which is what
    // keeps "full rider set" true rather than historical.
    const wrapped = await liveRiders();
    // Every enumerated rider is a LIVE call site…
    for (const rider of RIDERS) {
      expect(wrapped.has(rider), `missing rider: ${rider}`).toBe(true);
    }
    // …and no call site is outside the enumeration plus this packet's own
    // two. A rider ADDED without extending the list REDS here, which is
    // what keeps "full rider set" true rather than historical — the
    // property a count in a document cannot carry.
    const declared = new Set<string>([...RIDERS, "submitDecision", "resumeWait"]);
    for (const found of wrapped) {
      expect(declared.has(found), `unenumerated rider: ${found}`).toBe(true);
    }
    expect(wrapped.size).toBe(declared.size);
  });

  it("every rider's emitted event set is BYTE-IDENTICAL to its pre-opening behaviour", async () => {
    // The riders' own outcome lanes above already pin their event sets;
    // this lane re-asserts the property the OPENING could have broken —
    // that no rider gained a `stale` event — over the whole set at once.
    const rec = createRecordingDiagnosticsSink();
    const kernel = await kernelWith({ diag: rec });
    const input = {
      instanceId: "nm-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
    };
    await kernel.create(input);
    await kernel.start({ instanceId: "nm-1", opId: "s0" });
    // A DUPLICATE start — a rider outcome the wrapper classifies.
    await kernel.start({ instanceId: "nm-1", opId: "s0" });
    // A rejected cancel on an unknown instance.
    await kernel.cancel({ instanceId: "nope", opId: "c1" });
    // NOT ONE `stale` event: no rider's union carries that arm, so the
    // added arm is unreachable for every one of them.
    expect(rec.events.filter((e) => e.kind === "stale")).toEqual([]);
    expect(rec.events.map((e) => e.kind)).toEqual(["duplicate", "rejected"]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 16 — THE NO-MOVE CONTROL, DRIVEN BEHAVIOURALLY OVER EVERY LIVE
// RIDER (build-close aftermath, ch14-p2b).
//
// The control above proves the rider LIST is complete and that no
// `stale` event appears — but it only ever DRIVES three of the riders
// (create, start, cancel), so "every rider's emitted event set is
// byte-identical" was a claim about a set the lane never visited. The
// measured consequence: adding a spurious `stale` emit to the `kickoff`
// rider leaves the whole suite green.
//
// So the set is driven, member by member, against its EXACT emitted
// event SEQUENCE — including the empty-sequence controls, which are the
// half a spurious emit actually breaks. The driver table's key set is
// checked against the SAME live call-site enumeration the lane above
// reads, so a rider added without a driver reds here rather than
// silently sitting undriven.
// ─────────────────────────────────────────────────────────────────────

const riderTemplate: WorkflowTemplate = {
  ref: { id: "diag-riders", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "gate", TO_WAIT: "commit_wait" },
      recommends: { PASS: "approve" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "decide",
      decisions: { approve: { target: "done" } },
    },
    commit_wait: {
      type: "wait",
      wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] },
      onResume: { COMMIT: "done" },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, operator: { defaultActor: "human-1" } },
};

function riderRig(rec: { readonly sink: DiagnosticsSink }) {
  const admittedRiders = admit(riderTemplate);
  const handle = openStore(":memory:", createControlledClock(1_000));
  const kernel = createKernel({
    providerRegistry: createStaticProviderRegistry({}),
    processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: {
      load: (ref) => Promise.resolve(ref.id === admittedRiders.ref.id ? admittedRiders : null),
    },
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
    diag: rec.sink,
    gates: gateCatalog,
  });
  return { kernel, store: handle.store };
}

interface RiderCase {
  readonly label: string;
  /**
   * Drives the rider. Whatever SETUP the case needs runs here too, and
   * the case clears the recorder before the drive it means to measure —
   * so `emits` is the rider's own sequence, not the fixture's.
   */
  readonly drive: (rec: ReturnType<typeof createRecordingDiagnosticsSink>) => Promise<void>;
  /** The EXACT emitted sequence, whole values, in order. */
  readonly emits: readonly unknown[];
}

/** Park a fresh run at the gate; returns the rig and the minted ref. */
async function riderParked(rec: ReturnType<typeof createRecordingDiagnosticsSink>) {
  const rig = riderRig(rec);
  await rig.kernel.create({ instanceId: "rd-1", templateRef: riderTemplate.ref, task: "t" });
  await rig.kernel.start({ instanceId: "rd-1", opId: "s0" });
  await rig.kernel.handle({
    instanceId: "rd-1",
    opId: "a1",
    type: "PASS",
    actorId: "codex",
    expectedVersion: 2,
    expectedRole: "implementer",
  });
  const instance = await rig.store.loadInstance("rd-1");
  const requestRef = instance?.wait?.requestRef;
  if (requestRef === undefined) throw new Error("fixture wiring: no request ref");
  return { ...rig, requestRef };
}

/** Park a fresh run at the BARE wait. */
async function riderParkedAtWait(rec: ReturnType<typeof createRecordingDiagnosticsSink>) {
  const rig = riderRig(rec);
  await rig.kernel.create({ instanceId: "rw-1", templateRef: riderTemplate.ref, task: "t" });
  await rig.kernel.start({ instanceId: "rw-1", opId: "s0" });
  await rig.kernel.handle({
    instanceId: "rw-1",
    opId: "a1",
    type: "TO_WAIT",
    actorId: "codex",
    expectedVersion: 2,
    expectedRole: "implementer",
  });
  return rig;
}

/**
 * ONE CASE LIST PER RIDER, keyed by the name the wrapper's call site
 * sits under. EVERY rider carries at least one EMPTY-sequence control —
 * a success (or an inert `ignored`) that must emit NOTHING — because a
 * spurious emit is invisible to a lane that only ever asserts the
 * classified arms.
 */
const RIDER_CASES: Readonly<Record<string, readonly RiderCase[]>> = {
  create: [
    {
      label: "a successful create emits NOTHING",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.create({ instanceId: "c-1", templateRef: riderTemplate.ref, task: "t" });
      },
      emits: [],
    },
    {
      label: "task_required is classified",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.create({ instanceId: "c-2", templateRef: riderTemplate.ref });
      },
      emits: [
        { source: "kernel", kind: "rejected", reason: "task_required", instanceId: "c-2" },
      ],
    },
  ],
  start: [
    {
      label: "a successful start emits NOTHING",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({ instanceId: "s-1", templateRef: riderTemplate.ref, task: "t" });
        rec.events.length = 0;
        await rig.kernel.start({ instanceId: "s-1", opId: "s0" });
      },
      emits: [],
    },
    {
      label: "a replayed start is `duplicate`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({ instanceId: "s-2", templateRef: riderTemplate.ref, task: "t" });
        await rig.kernel.start({ instanceId: "s-2", opId: "s0" });
        rec.events.length = 0;
        await rig.kernel.start({ instanceId: "s-2", opId: "s0" });
      },
      emits: [{ source: "kernel", kind: "duplicate", instanceId: "s-2", opId: "s0" }],
    },
    {
      label: "an unknown instance is `rejected`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.start({ instanceId: "ghost", opId: "s0" });
      },
      emits: [
        {
          source: "kernel",
          kind: "rejected",
          reason: "unknown_instance",
          instanceId: "ghost",
          opId: "s0",
        },
      ],
    },
  ],
  kickoff: [
    {
      // THE CELL THE OLD CONTROL NEVER VISITED. A spurious emit added to
      // this rider is invisible without exactly this assertion.
      label: "a successful kickoff emits NOTHING",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({
          instanceId: "k-1",
          templateRef: riderTemplate.ref,
          mode: "deferred_kickoff",
        });
        await rig.kernel.start({ instanceId: "k-1", opId: "s0" });
        rec.events.length = 0;
        await rig.kernel.kickoff({ instanceId: "k-1", opId: "k0", task: "GO" });
      },
      emits: [],
    },
    {
      label: "a replayed kickoff is `duplicate`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({
          instanceId: "k-2",
          templateRef: riderTemplate.ref,
          mode: "deferred_kickoff",
        });
        await rig.kernel.start({ instanceId: "k-2", opId: "s0" });
        await rig.kernel.kickoff({ instanceId: "k-2", opId: "k0", task: "GO" });
        rec.events.length = 0;
        await rig.kernel.kickoff({ instanceId: "k-2", opId: "k0", task: "GO" });
      },
      emits: [{ source: "kernel", kind: "duplicate", instanceId: "k-2", opId: "k0" }],
    },
    {
      label: "an unknown instance is `rejected`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.kickoff({ instanceId: "ghost", opId: "k0", task: "GO" });
      },
      emits: [
        {
          source: "kernel",
          kind: "rejected",
          reason: "unknown_instance",
          instanceId: "ghost",
          opId: "k0",
        },
      ],
    },
  ],
  cancel: [
    {
      label: "a successful cancel emits NOTHING",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({ instanceId: "x-1", templateRef: riderTemplate.ref, task: "t" });
        await rig.kernel.start({ instanceId: "x-1", opId: "s0" });
        rec.events.length = 0;
        await rig.kernel.cancel({ instanceId: "x-1", opId: "c0" });
      },
      emits: [],
    },
    {
      label: "an unknown instance is `rejected`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.cancel({ instanceId: "ghost", opId: "c0" });
      },
      emits: [
        {
          source: "kernel",
          kind: "rejected",
          reason: "unknown_instance",
          instanceId: "ghost",
          opId: "c0",
        },
      ],
    },
  ],
  fail: [
    {
      label: "a successful fail emits NOTHING",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({ instanceId: "f-1", templateRef: riderTemplate.ref, task: "t" });
        await rig.kernel.start({ instanceId: "f-1", opId: "s0" });
        rec.events.length = 0;
        await rig.kernel.fail("f-1", "sys:boom");
      },
      emits: [],
    },
    {
      label: "an unknown instance is `rejected`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.fail("ghost", "sys:boom");
      },
      emits: [
        { source: "kernel", kind: "rejected", reason: "unknown_instance", instanceId: "ghost" },
      ],
    },
  ],
  readyOp: [
    {
      // The INERT arm — the wrapper classifies nothing on `ignored`.
      label: "an uncorrelated READY is inert and emits NOTHING",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({ instanceId: "y-1", templateRef: riderTemplate.ref, task: "t" });
        await rig.kernel.start({ instanceId: "y-1", opId: "s0" });
        rec.events.length = 0;
        await rig.kernel.runtimeContextReady("y-1", "req-none", {
          kind: "pairflow.worktree",
          locator: "/tmp/x",
        });
      },
      emits: [],
    },
    {
      label: "an unknown instance is `rejected`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.runtimeContextReady("ghost", "req-none", {
          kind: "pairflow.worktree",
          locator: "/tmp/x",
        });
      },
      emits: [
        { source: "kernel", kind: "rejected", reason: "unknown_instance", instanceId: "ghost" },
      ],
    },
  ],
  failedOp: [
    {
      label: "an uncorrelated FAILED is inert and emits NOTHING",
      drive: async (rec) => {
        const rig = riderRig(rec);
        await rig.kernel.create({ instanceId: "z-1", templateRef: riderTemplate.ref, task: "t" });
        await rig.kernel.start({ instanceId: "z-1", opId: "s0" });
        rec.events.length = 0;
        await rig.kernel.runtimeContextFailed("z-1", "req-none", "sys:provision_failed");
      },
      emits: [],
    },
    {
      label: "an unknown instance is `rejected`",
      drive: async (rec) => {
        const rig = riderRig(rec);
        rec.events.length = 0;
        await rig.kernel.runtimeContextFailed("ghost", "req-none", "sys:provision_failed");
      },
      emits: [
        { source: "kernel", kind: "rejected", reason: "unknown_instance", instanceId: "ghost" },
      ],
    },
  ],
  submitDecision: [
    {
      label: "a committed decision emits NOTHING",
      drive: async (rec) => {
        const rig = await riderParked(rec);
        rec.events.length = 0;
        await rig.kernel.submitDecision({
          intent: "submit-decision",
          instanceId: "rd-1",
          opId: "d1",
          expectedVersion: 3,
          requestRef: rig.requestRef,
          verdict: "approve",
          by: "human-1",
        });
      },
      emits: [],
    },
    {
      label: "a rejected decision is classified with its reason",
      drive: async (rec) => {
        const rig = await riderParked(rec);
        rec.events.length = 0;
        await rig.kernel.submitDecision({
          intent: "submit-decision",
          instanceId: "rd-1",
          opId: "d1",
          expectedVersion: 3,
          requestRef: rig.requestRef,
          verdict: "nope",
          by: "human-1",
        });
      },
      emits: [
        {
          source: "kernel",
          kind: "rejected",
          reason: "unknown_decision",
          instanceId: "rd-1",
          opId: "d1",
        },
      ],
    },
  ],
  resumeWait: [
    {
      label: "a committed resume emits NOTHING",
      drive: async (rec) => {
        const rig = await riderParkedAtWait(rec);
        rec.events.length = 0;
        await rig.kernel.resumeWait({
          intent: "resume-wait",
          instanceId: "rw-1",
          opId: "r1",
          expectedVersion: 3,
          type: "COMMIT",
        });
      },
      emits: [],
    },
    {
      label: "a rejected resume is classified with its reason",
      drive: async (rec) => {
        const rig = await riderParkedAtWait(rec);
        rec.events.length = 0;
        await rig.kernel.resumeWait({
          intent: "resume-wait",
          instanceId: "rw-1",
          opId: "r1",
          expectedVersion: 3,
          type: "NOT_DECLARED",
        });
      },
      emits: [
        {
          source: "kernel",
          kind: "rejected",
          reason: "resume_event_mismatch",
          instanceId: "rw-1",
          opId: "r1",
        },
      ],
    },
  ],
};

describe("family 16 — the FULL rider set, DRIVEN: each rider's exact emitted sequence", () => {
  it("every LIVE rider has a driver — the table is checked against the call sites, never against a count", async () => {
    // The same enumeration the list lane reads. A rider added to
    // `kernel.ts` without a driver here REDS, which is what keeps this
    // grid full rather than historical.
    const wrapped = await liveRiders();
    const driven = new Set(Object.keys(RIDER_CASES));
    for (const rider of wrapped) {
      expect(driven.has(rider), `live rider with no driver: ${rider}`).toBe(true);
    }
    for (const rider of driven) {
      expect(wrapped.has(rider), `driver for a rider that is no longer wrapped: ${rider}`).toBe(
        true,
      );
    }
    expect(driven.size).toBe(wrapped.size);
    // …and EVERY rider carries at least one EMPTY-sequence control: the
    // half a spurious emit actually breaks.
    for (const [rider, cases] of Object.entries(RIDER_CASES)) {
      expect(
        cases.some((c) => c.emits.length === 0),
        `rider without an empty-sequence control: ${rider}`,
      ).toBe(true);
    }
  });

  for (const [rider, cases] of Object.entries(RIDER_CASES)) {
    for (const testCase of cases) {
      it(`${rider}: ${testCase.label}`, async () => {
        const rec = createRecordingDiagnosticsSink();
        await testCase.drive(rec);
        // THE EXACT SEQUENCE, whole values, in order — never a filter and
        // never a `kind` projection: a spurious emit of ANY class reds.
        expect(rec.events).toEqual(testCase.emits);
      });
    }
  }
});
