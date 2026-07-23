import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  Activated,
  AdmittedTemplate,
  Outcome,
  RuntimeContextRef,
  RuntimeContextSpec,
  WorkflowTemplate,
} from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createKernel } from "./kernel/index.js";
import { createStaticProviderRegistry } from "./ports/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  createScriptedRuntimeContextProvider,
  fixtureDefinitionStore,
} from "./testkit/index.js";
import type { ScriptedProvisionBehavior } from "./testkit/index.js";

/**
 * The l0e chapter trace as a golden test (packet ch12-p3, TR family): the
 * PROVISIONED-immediate run — create → start (resolve → provision, Accepted,
 * requested(r1)) → RUNTIME_CONTEXT_READY (ready(ref), activate) → dispatch
 * carrying the provider projection → the actor path — plus the
 * unknown-provider and hostile-kind variants. Replayed through the REAL
 * walking skeleton (store + admit + kernel + the scripted provider registry).
 */
const gateCatalog = createGateRegistry();
const WORKTREE_SPEC: RuntimeContextSpec = {
  kind: "worktree",
  provider: "pairflow.worktree",
  config: {
    repo: "current",
    base_branch: "main",
    branch_pattern: "bubble/{instance_id}",
    work_mode: "worktree",
  },
};
const READY_REF: RuntimeContextRef = { kind: "worktree", locator: "/ws/inst-l0e" };
const PROJECTION = { workspace: "/ws/inst-l0e", branch: "bubble/inst-l0e" };

function l0eTemplate(spec: RuntimeContextSpec | "none"): WorkflowTemplate {
  return {
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
    runtimeContext: spec,
    activation: { mode: "immediate" },
  };
}

function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`l0e trace admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

function makeKernel(
  admitted: AdmittedTemplate,
  providerName: string,
  projection?: unknown,
  script?: readonly ScriptedProvisionBehavior[],
): {
  kernel: ReturnType<typeof createKernel>;
  store: ReturnType<typeof openStore>["store"];
  provider: ReturnType<typeof createScriptedRuntimeContextProvider>;
  close: () => void;
} {
  const handle = openStore(":memory:", createControlledClock(1_000));
  const provider = createScriptedRuntimeContextProvider({
    ...(projection !== undefined ? { projection } : {}),
    ...(script !== undefined ? { script } : {}),
  });
  const kernel = createKernel({
    processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: fixtureDefinitionStore(admitted),
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
    providerRegistry: createStaticProviderRegistry({ [providerName]: provider }),
  });
  provider.bindCompletionSink((i, r, completion) => kernel.deliverCompletion(i, r, completion));
  return { kernel, store: handle.store, provider, close: () => handle.close() };
}

describe("l0e golden trace — the provisioned-immediate run (TR family)", () => {
  it("reproduces create → provision(requested) → READY(ready(ref)+activate) → dispatch(projection)", async () => {
    const admitted = admit(l0eTemplate(WORKTREE_SPEC));
    const { kernel, store, provider, close } = makeKernel(
      admitted,
      "pairflow.worktree",
      PROJECTION,
    );

    // create (immediate, task present) → Created(v1); genesis: CREATED, none.
    const created = await kernel.create({
      instanceId: "inst-l0e",
      templateRef: admitted.ref,
      task: "ship it",
      mode: "immediate",
    });
    expect(created).toEqual({ kind: "created", instanceId: "inst-l0e", version: 1 });
    const genesis = await store.loadInstance("inst-l0e");
    expect(genesis?.kernelStatus).toBe("CREATED");
    expect(genesis?.runtimeContext).toEqual({ state: "none" });

    // start → resolve(pairflow.worktree) → provision(instanceId, r1, spec)
    // [the scripted player RECORDS and detaches] → requested(r1), STARTED{op1},
    // v→2; RETURN Accepted; floor: CREATED, requested(r1).
    const started = await kernel.start({ instanceId: "inst-l0e", opId: "op1" });
    expect(started).toEqual({ kind: "accepted" });
    expect(provider.provisionCalls).toHaveLength(1);
    const call = provider.provisionCalls[0];
    expect(call?.instanceId).toBe("inst-l0e");
    expect(call?.spec).toEqual(WORKTREE_SPEC);
    const requestId = call?.requestId ?? "";
    const requested = await store.loadInstance("inst-l0e");
    expect(requested?.kernelStatus).toBe("CREATED");
    expect(requested?.runtimeContext).toEqual({ state: "requested", requestId });
    expect(requested?.version).toBe(2);
    expect(await store.getTimeline("inst-l0e", 0)).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op1", committedAt: 1_000 },
    ]);

    // runtime_context_ready(instanceId, r1, ref{worktree, locator}): admit ✓
    // → transport gate ✓ → kind boundary ✓ → ready(ref); activate_or_hold
    // (immediate) → activate: ACTIVE, implement, round 1, v→3 → Activated.
    const ready = (await kernel.runtimeContextReady("inst-l0e", requestId, READY_REF)) as Activated;
    expect(ready.kind).toBe("activated");
    expect(ready.version).toBe(3);
    // dispatch(implement): packet.runtime_context = project_for_actor(ref).
    expect(ready.intent.packet.runtimeContext).toEqual(PROJECTION);
    const active = await store.loadInstance("inst-l0e");
    expect(active?.kernelStatus).toBe("ACTIVE");
    expect(active?.currentStep).toBe("implement");
    expect(active?.round).toBe(1);
    expect(active?.runtimeContext).toEqual({ state: "ready", ref: READY_REF });

    // emit PASS → implement→review; the next dispatch carries the projection too.
    const pass = (await kernel.handle({
      instanceId: "inst-l0e",
      opId: "a1",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 3,
      expectedRole: "implementer",
      payload: { note: "impl" },
    })) as Extract<Outcome, { kind: "committed" }>;
    expect(pass.kind).toBe("committed");
    expect(pass.version).toBe(4);
    expect(pass.intent?.packet.runtimeContext).toEqual(PROJECTION);
    // The RAW ref never enters the packet (projection-never-the-ref).
    expect(pass.intent?.packet.runtimeContext).not.toEqual(READY_REF);

    close();
  });

  it("UNKNOWN-PROVIDER variant: start → Rejected(runtime_context_provider_unavailable) PRE-commit, op_id unconsumed", async () => {
    const admitted = admit(l0eTemplate({ kind: "worktree", provider: "not.registered" }));
    const { kernel, store, provider, close } = makeKernel(admitted, "pairflow.worktree");
    await kernel.create({
      instanceId: "inst-l0e",
      templateRef: admitted.ref,
      task: "t",
      mode: "immediate",
    });
    const before = await store.loadInstance("inst-l0e");
    const outcome = await kernel.start({ instanceId: "inst-l0e", opId: "op1" });
    expect(outcome).toEqual({ kind: "rejected", reason: "runtime_context_provider_unavailable" });
    expect(provider.provisionCalls).toHaveLength(0);
    // No requested marker, no STARTED fact — the op_id is unconsumed.
    expect(await store.loadInstance("inst-l0e")).toEqual(before);
    expect(await store.getTimeline("inst-l0e", 0)).toEqual([]);
    // A corrected retry may reuse the op_id (here: still unresolvable, but the
    // guard proves the op_id was never consumed — a fresh call re-enters).
    const retry = await kernel.start({ instanceId: "inst-l0e", opId: "op1" });
    expect(retry).toEqual({ kind: "rejected", reason: "runtime_context_provider_unavailable" });
    close();
  });

  it("HOSTILE-KIND variant: a READY whose ref.kind ≠ worktree → kind-boundary reject, stays requested, NO state change", async () => {
    const admitted = admit(l0eTemplate(WORKTREE_SPEC));
    const { kernel, store, provider, close } = makeKernel(admitted, "pairflow.worktree");
    await kernel.create({
      instanceId: "inst-l0e",
      templateRef: admitted.ref,
      task: "t",
      mode: "immediate",
    });
    await kernel.start({ instanceId: "inst-l0e", opId: "op1" });
    const requestId = provider.provisionCalls[0]?.requestId ?? "";
    const requested = await store.loadInstance("inst-l0e");
    const hostile = await kernel.runtimeContextReady("inst-l0e", requestId, {
      kind: "container",
      locator: "/x",
    });
    expect(hostile).toEqual({ kind: "ignored" });
    // runtime_context stays requested(r1); NO state change.
    expect(await store.loadInstance("inst-l0e")).toEqual(requested);
    close();
  });

  it("FAILED variant: the provider FAILS THROUGH THE DECLARED SEAM (failOnProvision, held path) → TERMINAL failed, failure_reason = the token, the marker RETAINED (the floor asserts all three)", async () => {
    const admitted = admit(l0eTemplate(WORKTREE_SPEC));
    // Drive the failure through the REAL provider seam — the scripted provider
    // fires RUNTIME_CONTEXT_FAILED synchronously inside provision() (the SM1 hold
    // hazard); the seam holds it until start's commit lands, then flushes it into
    // the FAILED handler. NOT a direct kernel.runtimeContextFailed() call — this
    // exercises the bound sink + the held-then-released completion path.
    const { kernel, store, provider, close } = makeKernel(admitted, "pairflow.worktree", undefined, [
      { failOnProvision: { reason: "sys:provision_failed", detail: "git clone exited 128" } },
    ]);
    await kernel.create({
      instanceId: "inst-l0e",
      templateRef: admitted.ref,
      task: "ship it",
      mode: "immediate",
    });
    // start → resolve → provision (RECORDS + fires FAILED through the sink, HELD)
    // → requested(r1) commits → conclusion flushes the held FAILED → FAIL routed.
    const started = await kernel.start({ instanceId: "inst-l0e", opId: "op1" });
    expect(started).toEqual({ kind: "accepted" });
    const requestId = provider.provisionCalls[0]?.requestId ?? "";
    // The floor read asserts all three: TERMINAL failed, failure_reason = token,
    // the marker retained as diagnostic state (the detail is NOWHERE in state).
    const terminal = await store.loadInstance("inst-l0e");
    expect(terminal?.kernelStatus).toBe("TERMINAL");
    expect(terminal?.terminalDisposition).toBe("failed");
    expect(terminal?.failureReason).toBe("sys:provision_failed");
    expect(terminal?.runtimeContext).toEqual({ state: "requested", requestId });
    // The untrusted detail rode the seam but is NOWHERE in committed state.
    expect(JSON.stringify(terminal)).not.toContain("git clone exited 128");
    close();
  });
});
