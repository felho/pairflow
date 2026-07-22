import { describe, expect, it } from "vitest";

import type { RuntimeContextRef, TranscriptEntry, WorkflowInstance } from "../domain/index.js";
import { admitTemplate } from "../definition/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createGateRegistry } from "../gates/index.js";
import type { ProcessGateRunner } from "../ports/gate.js";
import { createStaticProviderRegistry } from "../ports/index.js";
import type { StorePort } from "../ports/store.js";
import { openStore } from "../store/sqliteStore.js";
import {
  createRecordingDiagnosticsSink,
  createControlledClock,
  createScriptedRuntimeContextProvider,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import type {
  ScriptedRuntimeContextProvider,
  ScriptedRuntimeContextProviderOptions,
} from "../testkit/index.js";
import { createKernel } from "./kernel.js";
import type { Kernel } from "./kernel.js";

const WORKTREE_SPEC = { kind: "worktree", provider: "pairflow.worktree" } as const;
const SPEC_REF: RuntimeContextRef = { kind: "worktree", locator: "/ws/i1" };

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
  readonly provider: ScriptedRuntimeContextProvider;
  close(): void;
}

function makeHarness(
  templateMutation?: (raw: ReturnType<typeof fixtureTemplate>) => ReturnType<typeof fixtureTemplate>,
  /**
   * The kernel-under-test's store seam — wraps the REAL store the
   * harness still exposes as `store` (the assertions read committed
   * truth). Used by the CAS-restart lane to inject a `cas_conflict`
   * on the first commit and delegate afterward (L9).
   */
  storeWrap?: (real: StorePort) => StorePort,
  /** The scripted provider's per-provision behavior (S/SM families). */
  providerOptions?: ScriptedRuntimeContextProviderOptions,
): Harness {
  const clock = createControlledClock(1_000);
  const handle = openStore(":memory:", clock);
  const gates = createGateRegistry();
  const raw = templateMutation ? templateMutation(fixtureTemplate()) : fixtureTemplate();
  const admitted = admitTemplate(raw, gates);
  if (!admitted.ok) {
    throw new Error(
      `lifecycle.test harness: fixture template failed admission: ${JSON.stringify(admitted.findings)}`,
    );
  }
  const diag = createRecordingDiagnosticsSink();
  const processRunner: ProcessGateRunner = {
    run: () => Promise.reject(new Error("no process gates in lifecycle tests")),
  };
  const provider = createScriptedRuntimeContextProvider(providerOptions);
  const kernel = createKernel({
    store: storeWrap ? storeWrap(handle.store) : handle.store,
    definitions: fixtureDefinitionStore(admitted.template),
    time: clock,
    digest: deriveEmitDigest,
    diag: diag.sink,
    gates,
    processRunner,
    providerRegistry: createStaticProviderRegistry({ "pairflow.worktree": provider }),
  });
  provider.bindCompletionSink((i, r, ref) => kernel.deliverCompletion(i, r, ref));
  return { kernel, store: handle.store, diag, provider, close: () => handle.close() };
}

/**
 * A pass-through StorePort delegating every member to `real`, with
 * `commitLifecycle` forced to report `cas_conflict` on its FIRST call
 * (writing nothing) and delegating on every later call. `count()`
 * exposes how many commitLifecycle attempts the kernel made — the
 * restart-from-load discipline (L9) is observable as ≥2.
 */
function casOnceStore(real: StorePort): { readonly store: StorePort; count(): number } {
  let calls = 0;
  let injected = false;
  const store: StorePort = {
    loadInstance: (id) => real.loadInstance(id),
    findOp: (id, opId) => real.findOp(id, opId),
    createInstance: (instance) => real.createInstance(instance),
    commitTransition: (input) => real.commitTransition(input),
    commitLifecycle: (input) => {
      calls += 1;
      if (!injected) {
        injected = true;
        return Promise.resolve({ kind: "cas_conflict" });
      }
      return real.commitLifecycle(input);
    },
    listInstances: () => real.listInstances(),
    getInstanceDetail: (id) => real.getInstanceDetail(id),
    getTimeline: (id, afterSeq) => real.getTimeline(id, afterSeq),
  };
  return { store, count: () => calls };
}

function deferred(raw: ReturnType<typeof fixtureTemplate>): ReturnType<typeof fixtureTemplate> {
  return { ...raw, activation: { mode: "deferred_kickoff" } };
}

function requiredContext(
  raw: ReturnType<typeof fixtureTemplate>,
): ReturnType<typeof fixtureTemplate> {
  return { ...raw, runtimeContext: { kind: "worktree", provider: "pairflow.worktree" } };
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
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: "T",
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
    });
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
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: null,
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: null,
      round: 0,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      activationMode: "deferred_kickoff",
      wait: { kind: "kickoff_pending", requestedBy: "activation", resumeEvents: ["KICKOFF"] },
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 2,
    });
    expect((await transcriptOf(h, "i1")).map((e) => e.entryKind)).toEqual(["STARTED"]);
    h.close();
  });

  it("a CAS conflict on the first commit RESTARTS from load — one committed write, ≥2 attempts (L9)", async () => {
    let counter: { count(): number } | undefined;
    const h = makeHarness(undefined, (real) => {
      const wrapped = casOnceStore(real);
      counter = wrapped;
      return wrapped.store;
    });
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    const outcome = await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    // The injected conflict is invisible in the outcome — the restart
    // re-admits on fresh state and activates correctly.
    if (outcome.kind !== "activated") {
      throw new Error(`expected activated, got ${outcome.kind}`);
    }
    expect(outcome.instanceId).toBe("i1");
    expect(outcome.version).toBe(2);
    // Exactly ONE lifecycle write landed (the conflict wrote nothing).
    const instance = await loadOrThrow(h, "i1");
    expect(instance.kernelStatus).toBe("ACTIVE");
    expect(instance.version).toBe(2);
    expect(await transcriptOf(h, "i1")).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 1_000 },
    ]);
    // …across ≥2 commit attempts — the restart-from-load discipline.
    expect(counter?.count()).toBeGreaterThanOrEqual(2);
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

  describe("the provider legs (S family, ch12-p3)", () => {
    it("S1: the none path is unchanged — ready(∅) + activate, NO provider call", async () => {
      const h = makeHarness();
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const started = await h.kernel.start({ instanceId: "i1", opId: "op" });
      expect(started.kind).toBe("activated");
      expect((await loadOrThrow(h, "i1")).runtimeContext).toEqual({ state: "ready", ref: null });
      expect(h.provider.provisionCalls).toHaveLength(0);
      h.close();
    });

    it("S3: the spec path — resolve → provision FIRST → requested(request_id) + STARTED, Accepted; status stays CREATED", async () => {
      const h = makeHarness(requiredContext);
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const started = await h.kernel.start({ instanceId: "i1", opId: "op" });
      expect(started).toEqual({ kind: "accepted" });
      expect(h.provider.provisionCalls).toHaveLength(1);
      const call = h.provider.provisionCalls[0];
      expect(call?.instanceId).toBe("i1");
      expect(call?.spec).toEqual(WORKTREE_SPEC);
      const inst = await loadOrThrow(h, "i1");
      expect(inst.kernelStatus).toBe("CREATED");
      expect(inst.runtimeContext).toEqual({ state: "requested", requestId: call?.requestId });
      expect(await h.store.getTimeline("i1", 0)).toEqual([
        { entryKind: "STARTED", seq: 1, opId: "op", committedAt: 1_000 },
      ]);
      h.close();
    });

    it("S2: an UNRESOLVED provider → Rejected(runtime_context_provider_unavailable) PRE-commit; op_id NOT consumed, no marker/fact", async () => {
      const h = makeHarness((raw) => ({
        ...raw,
        runtimeContext: { kind: "worktree", provider: "nope.absent" },
      }));
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const before = await loadOrThrow(h, "i1");
      const outcome = await h.kernel.start({ instanceId: "i1", opId: "op" });
      expect(outcome).toEqual({ kind: "rejected", reason: "runtime_context_provider_unavailable" });
      expect(h.provider.provisionCalls).toHaveLength(0);
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      expect(await h.store.getTimeline("i1", 0)).toEqual([]);
      h.close();
    });

    it("S4: a synchronous provision throw is a PORT BREACH — fail-loud, zero state change, op_id unconsumed", async () => {
      const h = makeHarness(requiredContext, undefined, { script: [{ throwOnProvision: true }] });
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const before = await loadOrThrow(h, "i1");
      await expect(h.kernel.start({ instanceId: "i1", opId: "op" })).rejects.toThrow(/port breach/i);
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      expect(await h.store.getTimeline("i1", 0)).toEqual([]);
      h.close();
    });

    it("S4: a pre-commit-rejecting detach ack is a PORT BREACH — same fail-loud, no state change", async () => {
      const h = makeHarness(requiredContext, undefined, { script: [{ rejectAck: true }] });
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const before = await loadOrThrow(h, "i1");
      await expect(h.kernel.start({ instanceId: "i1", opId: "op" })).rejects.toThrow(/port breach/i);
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      h.close();
    });

    it("S5: a CAS-conflicted requested commit RESTARTS and re-provisions under a FRESH request_id", async () => {
      const h = makeHarness(requiredContext, (real) => casOnceStore(real).store);
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const started = await h.kernel.start({ instanceId: "i1", opId: "op" });
      expect(started).toEqual({ kind: "accepted" });
      // ≥2 provision calls under DISTINCT request_ids (the superseded id + the retry).
      expect(h.provider.provisionCalls.length).toBeGreaterThanOrEqual(2);
      const ids = h.provider.provisionCalls.map((c) => c.requestId);
      expect(new Set(ids).size).toBe(ids.length);
      // The committed marker correlates to the LAST (surviving) request_id.
      const inst = await loadOrThrow(h, "i1");
      expect(inst.runtimeContext).toEqual({
        state: "requested",
        requestId: ids[ids.length - 1],
      });
      h.close();
    });
  });

  describe("RUNTIME_CONTEXT_READY (K family) + the completion seam (SM)", () => {
    async function provisioned(
      h: Harness,
      opts: { deferred?: boolean } = {},
    ): Promise<string> {
      await h.kernel.create({
        instanceId: "i1",
        templateRef: REF,
        ...(opts.deferred ? { mode: "deferred_kickoff" as const } : { task: "T" }),
      });
      await h.kernel.start({ instanceId: "i1", opId: "op" });
      return h.provider.provisionCalls[0]?.requestId ?? "";
    }

    it("K2/K4 immediate: a correlated kind-matching ref → ready(ref) + activate", async () => {
      const h = makeHarness(requiredContext);
      const requestId = await provisioned(h);
      const outcome = await h.kernel.runtimeContextReady("i1", requestId, SPEC_REF);
      expect(outcome.kind).toBe("activated");
      const inst = await loadOrThrow(h, "i1");
      expect(inst.kernelStatus).toBe("ACTIVE");
      expect(inst.currentStep).toBe("implement");
      expect(inst.runtimeContext).toEqual({ state: "ready", ref: SPEC_REF });
      h.close();
    });

    it("K4 deferred: READY holds WAITING(kickoff_pending), Accepted", async () => {
      const h = makeHarness((raw) => ({ ...requiredContext(raw), activation: { mode: "deferred_kickoff" } }));
      const requestId = await provisioned(h, { deferred: true });
      const outcome = await h.kernel.runtimeContextReady("i1", requestId, SPEC_REF);
      expect(outcome).toEqual({ kind: "accepted" });
      const inst = await loadOrThrow(h, "i1");
      expect(inst.kernelStatus).toBe("WAITING");
      expect(inst.wait).toEqual({
        kind: "kickoff_pending",
        requestedBy: "activation",
        resumeEvents: ["KICKOFF"],
      });
      h.close();
    });

    it("K3 correlation: a wrong request_id READY is INERT — no state change", async () => {
      const h = makeHarness(requiredContext);
      await provisioned(h);
      const before = await loadOrThrow(h, "i1");
      expect(await h.kernel.runtimeContextReady("i1", "wrong-req", SPEC_REF)).toEqual({
        kind: "ignored",
      });
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      h.close();
    });

    it("K2 kind boundary: a WRONG-kind ref is INERT — no state change, stays requested", async () => {
      const h = makeHarness(requiredContext);
      const requestId = await provisioned(h);
      const before = await loadOrThrow(h, "i1");
      expect(
        await h.kernel.runtimeContextReady("i1", requestId, { kind: "container", locator: "/x" }),
      ).toEqual({ kind: "ignored" });
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      h.close();
    });

    it("K2 terminal-sink: a late READY after CANCEL does not resurrect the run — INERT", async () => {
      const h = makeHarness(requiredContext);
      const requestId = await provisioned(h);
      await h.kernel.cancel({ instanceId: "i1", opId: "op-c" });
      const before = await loadOrThrow(h, "i1");
      expect(await h.kernel.runtimeContextReady("i1", requestId, SPEC_REF)).toEqual({
        kind: "ignored",
      });
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      h.close();
    });

    it("K2 transport gate: a non-canonical ref is an integrity throw (no state change)", async () => {
      const h = makeHarness(requiredContext);
      const requestId = await provisioned(h);
      const before = await loadOrThrow(h, "i1");
      await expect(
        h.kernel.runtimeContextReady("i1", requestId, {
          kind: "worktree",
          locator: { bad: Number.POSITIVE_INFINITY },
        }),
      ).rejects.toThrow(/transport gate/);
      expect(await loadOrThrow(h, "i1")).toEqual(before);
      h.close();
    });

    it("K3: an unknown-instance READY is the inert droppable unknown_instance", async () => {
      const h = makeHarness(requiredContext);
      expect(await h.kernel.runtimeContextReady("ghost", "r", SPEC_REF)).toEqual({
        kind: "rejected",
        reason: "unknown_instance",
      });
      h.close();
    });

    it("SM1: a synchronous-completion provider is HELD until the START commit — the run reaches ready/ACTIVE", async () => {
      // The provider fires READY INSIDE provision() (before the requested
      // marker commits). A deliver-before-commit impl would lose it (the run
      // stuck `requested`); the seam holds it until conclusion → ACTIVE.
      const h = makeHarness(requiredContext, undefined, { script: [{ fireOnProvision: SPEC_REF }] });
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const started = await h.kernel.start({ instanceId: "i1", opId: "op" });
      expect(started).toEqual({ kind: "accepted" });
      const inst = await loadOrThrow(h, "i1");
      expect(inst.kernelStatus).toBe("ACTIVE");
      expect(inst.runtimeContext).toEqual({ state: "ready", ref: SPEC_REF });
      h.close();
    });

    it("SM3: a held completion on a FAILED (port-breach) attempt is delivered INERT, never dropped, no crash beyond the breach", async () => {
      const h = makeHarness(requiredContext, undefined, {
        script: [{ fireOnProvision: SPEC_REF, rejectAck: true }],
      });
      await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
      const before = await loadOrThrow(h, "i1");
      await expect(h.kernel.start({ instanceId: "i1", opId: "op" })).rejects.toThrow(/port breach/i);
      // The held completion flushed at conclusion delivers inert (correlation
      // rejects — no requested marker committed); zero state change.
      expect(await loadOrThrow(h, "i1")).toEqual(before);
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
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: "GO",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: "implement",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      activationMode: "deferred_kickoff",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 3,
    });
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
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: null,
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: null,
      round: 0,
      kernelStatus: "TERMINAL",
      terminalDisposition: "cancelled",
      activationMode: "deferred_kickoff",
      wait: null,
      runtimeContext: { state: "none" },
      failureReason: null,
      runOverrides: {},
      version: 2,
    });
    expect((await transcriptOf(h, "i1")).map((e) => e.entryKind)).toEqual(["CANCELLED"]);
    h.close();
  });

  it("cancels a WAITING run and clears the wait in the SAME move (S5/T3)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    await h.kernel.cancel({ instanceId: "i1", opId: "op-c" });
    const instance = await loadOrThrow(h, "i1");
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: null,
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: null,
      round: 0,
      kernelStatus: "TERMINAL",
      terminalDisposition: "cancelled",
      activationMode: "deferred_kickoff",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 3,
    });
    h.close();
  });

  it("cancels an ACTIVE run", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    const outcome = await h.kernel.cancel({ instanceId: "i1", opId: "op-c" });
    expect(outcome).toEqual({ kind: "terminated", disposition: "cancelled" });
    const instance = await loadOrThrow(h, "i1");
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: "T",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: "implement",
      round: 1,
      kernelStatus: "TERMINAL",
      terminalDisposition: "cancelled",
      activationMode: "immediate",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 3,
    });
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
    expect(instance).toEqual({
      instanceId: "i1",
      templateRef: REF,
      task: null,
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: null,
      round: 0,
      kernelStatus: "TERMINAL",
      terminalDisposition: "failed",
      activationMode: "deferred_kickoff",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: "provider exploded",
      runOverrides: {},
      version: 3,
    });
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

  it("a replay of an op consumed BEFORE the fail still answers Duplicate (idempotency survives terminal — rung order)", async () => {
    const h = makeHarness();
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    expect(await h.kernel.fail("i1", "boom")).toEqual({ kind: "terminated", disposition: "failed" });
    // The instance is TERMINAL, yet the STARTED op's key still lives —
    // the kind-aware idempotency rung fires BEFORE the terminal-sink guard.
    expect(await h.kernel.start({ instanceId: "i1", opId: "op-start" })).toEqual({
      kind: "duplicate",
    });
    h.close();
  });
});

describe("kind-aware idempotency across classes (A2)", () => {
  const SHARED = "op-shared";

  /** Commit an actor TRANSITION row under `opId` (leaves the run ACTIVE
   * at review) — the cross-class hit source for the transition column. */
  async function committedTransition(h: Harness, opId: string): Promise<void> {
    await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
    await h.kernel.start({ instanceId: "i1", opId: "op-start" });
    const committed = await h.kernel.handle({
      instanceId: "i1",
      opId,
      type: "PASS",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    if (committed.kind !== "committed") {
      throw new Error(`test wiring: expected committed transition, got ${committed.kind}`);
    }
  }

  // The 3×3 hit-class matrix per op-carrying intent (A2): own-kind
  // replay → Duplicate; other-FACT-kind reuse and TRANSITION reuse →
  // op_id_collision (the kind-aware rung fires FIRST — the prior op's
  // state need not hold; the collision precedes the state guard, A3).
  const matrix: ReadonlyArray<{
    readonly op: string;
    readonly hitClass: string;
    readonly expected: { readonly kind: string; readonly reason?: string };
    readonly drive: (h: Harness) => Promise<{ readonly kind: string; readonly reason?: string }>;
  }> = [
    {
      op: "START",
      hitClass: "own-kind replay → duplicate",
      expected: { kind: "duplicate" },
      drive: async (h) => {
        await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
        await h.kernel.start({ instanceId: "i1", opId: SHARED });
        return h.kernel.start({ instanceId: "i1", opId: SHARED });
      },
    },
    {
      op: "START",
      hitClass: "other-fact-kind reuse → op_id_collision",
      expected: { kind: "rejected", reason: "op_id_collision" },
      drive: async (h) => {
        await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
        await h.kernel.cancel({ instanceId: "i1", opId: SHARED }); // CANCELLED fact under SHARED
        return h.kernel.start({ instanceId: "i1", opId: SHARED });
      },
    },
    {
      op: "START",
      hitClass: "transition op reuse → op_id_collision",
      expected: { kind: "rejected", reason: "op_id_collision" },
      drive: async (h) => {
        await committedTransition(h, SHARED);
        return h.kernel.start({ instanceId: "i1", opId: SHARED });
      },
    },
    {
      op: "KICKOFF",
      hitClass: "own-kind replay → duplicate",
      expected: { kind: "duplicate" },
      drive: async (h) => {
        await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
        await h.kernel.start({ instanceId: "i1", opId: "op-start" });
        await h.kernel.kickoff({ instanceId: "i1", opId: SHARED, task: "GO" });
        return h.kernel.kickoff({ instanceId: "i1", opId: SHARED, task: "GO" });
      },
    },
    {
      op: "KICKOFF",
      hitClass: "other-fact-kind reuse → op_id_collision",
      expected: { kind: "rejected", reason: "op_id_collision" },
      drive: async (h) => {
        await h.kernel.create({ instanceId: "i1", templateRef: REF, mode: "deferred_kickoff" });
        await h.kernel.start({ instanceId: "i1", opId: SHARED }); // STARTED fact under SHARED
        return h.kernel.kickoff({ instanceId: "i1", opId: SHARED, task: "GO" });
      },
    },
    {
      op: "KICKOFF",
      hitClass: "transition op reuse → op_id_collision",
      expected: { kind: "rejected", reason: "op_id_collision" },
      drive: async (h) => {
        await committedTransition(h, SHARED);
        return h.kernel.kickoff({ instanceId: "i1", opId: SHARED, task: "GO" });
      },
    },
    {
      op: "CANCEL",
      hitClass: "own-kind replay → duplicate",
      expected: { kind: "duplicate" },
      drive: async (h) => {
        await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
        await h.kernel.cancel({ instanceId: "i1", opId: SHARED });
        return h.kernel.cancel({ instanceId: "i1", opId: SHARED });
      },
    },
    {
      op: "CANCEL",
      hitClass: "other-fact-kind reuse → op_id_collision",
      expected: { kind: "rejected", reason: "op_id_collision" },
      drive: async (h) => {
        await h.kernel.create({ instanceId: "i1", templateRef: REF, task: "T" });
        await h.kernel.start({ instanceId: "i1", opId: SHARED }); // STARTED fact under SHARED
        return h.kernel.cancel({ instanceId: "i1", opId: SHARED });
      },
    },
    {
      op: "CANCEL",
      hitClass: "transition op reuse → op_id_collision",
      expected: { kind: "rejected", reason: "op_id_collision" },
      drive: async (h) => {
        await committedTransition(h, SHARED);
        return h.kernel.cancel({ instanceId: "i1", opId: SHARED });
      },
    },
  ];

  for (const cell of matrix) {
    it(`${cell.op}: ${cell.hitClass}`, async () => {
      const h = makeHarness();
      expect(await cell.drive(h)).toEqual(cell.expected);
      h.close();
    });
  }

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
