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
    const corrupted: WorkflowTemplate = {
      ...template,
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "vanished" },
        },
      },
    };
    const rec = createRecordingDiagnosticsSink();
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(baseInstance);
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: { load: () => Promise.resolve(admit(corrupted)) },
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
    const corrupted: WorkflowTemplate = {
      ...template,
      start: "phantom",
      steps: template.steps,
    };
    const rec = createRecordingDiagnosticsSink();
    const handle = openStore(":memory:", createControlledClock(0));
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: { load: () => Promise.resolve(admit(corrupted)) },
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
