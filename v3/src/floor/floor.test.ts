import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  TranscriptEntry,
  WorkflowInstance,
  AdmittedTemplate,
  WorkflowTemplate,
} from "../domain/index.js";
import { humanDecisionRequest } from "../domain/index.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createKernel } from "../kernel/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import { openStore } from "../store/index.js";
import { createControlledClock } from "../testkit/index.js";
import { admitTemplate, TemplateLoadError } from "../definition/index.js";
import { createGateRegistry } from "../gates/index.js";

const gateCatalog = createGateRegistry();
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`test fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}
import { createFloor } from "./floor.js";
import type { CreateFloorArity } from "./floor.js";
import { noopDiagnosticsSink } from "../diag/index.js";

const instance: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "t",
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

// Test-local fixtures (the kernel.test.ts / MD-1 precedent).
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

describe("floor — the minimal committed-rows-only read (plan §4.6)", () => {
  it("lists instances and returns instance detail with the transcript", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const floor = createFloor(handle.store, null);

    expect(await floor.listInstances()).toHaveLength(1);
    const detail = await floor.getInstanceDetail("inst-1");
    expect(detail?.instance.instanceId).toBe("inst-1");
    expect(detail?.transcript).toEqual([]);
    handle.close();
  });

  it("unknown instance → null", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    expect(await createFloor(handle.store, null).getInstanceDetail("nope")).toBeNull();
    handle.close();
  });
});

describe("floor.getTimeline — the §6.2 cursor read (packet ch6-P1)", () => {
  it("propagates the null/[] duality unchanged", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const floor = createFloor(handle.store, null);
    expect(await floor.getTimeline("ghost", 0)).toBeNull();
    await handle.store.createInstance(instance);
    expect(await floor.getTimeline("inst-1", 0)).toEqual([]);
    handle.close();
  });

  it("propagates the fail-closed invalid-cursor RangeError", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await expect(createFloor(handle.store, null).getTimeline("inst-1", 0.5)).rejects.toThrow(
      RangeError,
    );
    handle.close();
  });

  it("dim 4 — committed-only: every rejected lane through the REAL kernel leaves the timeline identical", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: noopDiagnosticsSink,
    });
    const floor = createFloor(handle.store, null);

    expect((await kernel.handle(env("a1", "PASS", 1, { ref: "diff-1" }))).kind).toBe(
      "committed",
    );
    expect((await kernel.handle(env("b2", "PASS", 2, { ref: "diff-2" }, "reviewer"))).kind).toBe(
      "committed",
    );
    const snapshot = await floor.getTimeline("inst-1", 0);
    expect(snapshot).toHaveLength(2);

    // The negative lanes, each through the real kernel (instance is at
    // version 3, currentStep "implement"):
    expect(await kernel.handle(env("a1", "PASS", 3, { ref: "diff-1" }))).toEqual({
      kind: "duplicate",
    });
    expect(await kernel.handle(env("a1", "PASS", 3, { ref: "TAMPERED" }))).toEqual({
      kind: "rejected",
      reason: "op_id_collision",
    });
    expect(await kernel.handle(env("z9", "PASS", 1, { ref: "x" }))).toEqual({
      kind: "stale",
      currentVersion: 3,
    });
    expect(await kernel.handle(env("z8", "PASS", undefined, { ref: "x" }))).toEqual({
      kind: "rejected",
      reason: "missing_version",
    });
    expect(await kernel.handle(env("z7", "NOPE", 3, { ref: "x" }))).toEqual({
      kind: "rejected",
      reason: "no_transition",
    });
    expect(
      await kernel.handle({ ...env("z6", "PASS", 1, { ref: "x" }), instanceId: "ghost" }),
    ).toEqual({ kind: "rejected", reason: "unknown_instance" });

    // The wide claim: none of the six lanes moved the surface.
    expect(await floor.getTimeline("inst-1", 0)).toEqual(snapshot);
    handle.close();
  });
});

// ── packet ch12-P4: R1/R2/R3 — the compact/full floor split ──────────────

const SECRET_LOCATOR = "/secret/worktree/locator-path";

const provisionedActive: WorkflowInstance = {
  ...instance,
  instanceId: "inst-ready",
  runtimeContext: { state: "ready", ref: { kind: "worktree", locator: SECRET_LOCATOR } },
};

const heldInstance: WorkflowInstance = {
  ...instance,
  instanceId: "inst-held",
  currentStep: null,
  round: 0,
  kernelStatus: "WAITING",
  wait: { kind: "kickoff_pending", requestedBy: "activation", resumeEvents: ["KICKOFF"] },
  runtimeContext: { state: "ready", ref: null },
};

const SECRET_REQUEST_ID = "req-secret-provision-987";

const noneInstance: WorkflowInstance = {
  ...instance,
  instanceId: "inst-none",
  currentStep: null,
  round: 0,
  kernelStatus: "CREATED",
  runtimeContext: { state: "none" },
};

const requestedInstance: WorkflowInstance = {
  ...instance,
  instanceId: "inst-requested",
  currentStep: null,
  round: 0,
  kernelStatus: "CREATED",
  runtimeContext: { state: "requested", requestId: SECRET_REQUEST_ID },
};

describe("floor — R1 the compact listInstances projection (packet ch12-P4)", () => {
  it("projects the state-scan discriminant and EXCLUDES the opaque locator (a sensitivity assert)", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(provisionedActive);
    const rows = await createFloor(handle.store, null).listInstances();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    // The axis fields present, the runtime-context STATE discriminant present…
    expect(row).toEqual({
      instanceId: "inst-ready",
      templateRef: { id: "local-pair-v0", version: 1 },
      currentStep: "implement",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: null,
      runtimeContext: { state: "ready" },
    });
    // …but the opaque locator is ABSENT from the compact row (no `ref`), and
    // no read-doc field carries the retired ch-4 `status`/`version` on a list
    // row.
    expect(JSON.stringify(row)).not.toContain(SECRET_LOCATOR);
    expect(row?.runtimeContext).not.toHaveProperty("ref");
    expect(row).not.toHaveProperty("status");
    expect(row).not.toHaveProperty("version");
    handle.close();
  });

  it("projects the typed wait's KIND alone (not the full payload) for a WAITING run", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(heldInstance);
    const rows = await createFloor(handle.store, null).listInstances();
    const row = rows[0];
    expect(row?.kernelStatus).toBe("WAITING");
    expect(row?.wait).toEqual({ kind: "kickoff_pending" });
    // The full wait payload (requestedBy / resumeEvents) is `detail`'s, not
    // the compact row's.
    expect(row?.wait).not.toHaveProperty("requestedBy");
    expect(row?.wait).not.toHaveProperty("resumeEvents");
    handle.close();
  });

  it("carries the runtime-context STATE discriminant for all THREE states (none / requested / ready) — and neither the locator NOR the request_id leaks", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(noneInstance);
    await handle.store.createInstance(requestedInstance);
    await handle.store.createInstance(provisionedActive);
    const rows = await createFloor(handle.store, null).listInstances();
    const byId = new Map(rows.map((r) => [r.instanceId, r]));

    // none → { state: "none" }
    expect(byId.get("inst-none")?.runtimeContext).toEqual({ state: "none" });

    // requested → { state: "requested" } — the request_id must NOT leak (a
    // hardcoded `ready` or a request_id leak would fail).
    expect(byId.get("inst-requested")?.runtimeContext).toEqual({ state: "requested" });
    expect(byId.get("inst-requested")?.runtimeContext).not.toHaveProperty("requestId");

    // ready → { state: "ready" } — the opaque locator must NOT leak.
    expect(byId.get("inst-ready")?.runtimeContext).toEqual({ state: "ready" });
    expect(byId.get("inst-ready")?.runtimeContext).not.toHaveProperty("ref");

    // The whole compact payload leaks neither secret.
    expect(JSON.stringify(rows)).not.toContain(SECRET_REQUEST_ID);
    expect(JSON.stringify(rows)).not.toContain(SECRET_LOCATOR);
    handle.close();
  });
});

describe("floor — R2 getInstanceDetail keeps the FULL state incl. the opaque ref (packet ch12-P4)", () => {
  it("the detail read carries the opaque runtime-context ref locator (the operator/debug read)", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(provisionedActive);
    const detail = await createFloor(handle.store, null).getInstanceDetail("inst-ready");
    expect(detail?.instance.runtimeContext).toEqual({
      state: "ready",
      ref: { kind: "worktree", locator: SECRET_LOCATOR },
    });
    // The full wait payload survives for a held run too.
    await handle.store.createInstance(heldInstance);
    const held = await createFloor(handle.store, null).getInstanceDetail("inst-held");
    expect(held?.instance.wait).toEqual({
      kind: "kickoff_pending",
      requestedBy: "activation",
      resumeEvents: ["KICKOFF"],
    });
    // The retired ch-4 `status` field appears in no read doc.
    expect(JSON.stringify(detail?.instance)).not.toContain('"status"');
    handle.close();
  });
});

describe("floor — R3 getTimeline returns both transcript entry classes (packet ch12-P4)", () => {
  it("a create→start→transition run's timeline carries the STARTED lifecycle fact AND the transition, kinds visible", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: noopDiagnosticsSink,
    });
    const floor = createFloor(handle.store, null);

    await kernel.create({ instanceId: "inst-tl", templateRef: { id: "local-pair-v0", version: 1 }, task: "t" });
    const started = await kernel.start({ instanceId: "inst-tl", opId: "op-start" });
    expect(started.kind).toBe("activated");
    expect(
      (await kernel.handle({ ...env("a1", "PASS", 2, { ref: "d" }), instanceId: "inst-tl" })).kind,
    ).toBe("committed");

    const rows = await floor.getTimeline("inst-tl", 0);
    expect(rows).not.toBeNull();
    const kinds = (rows ?? []).map((r) => r.entryKind);
    expect(kinds).toContain("STARTED");
    expect(kinds).toContain("transition");
    // The retired ch-4 `status` field appears in no timeline row.
    expect(JSON.stringify(rows)).not.toContain('"status"');

    // R3 (packet:519): the TransitionEntry carries `issuedAgentConfig` (C10) —
    // it must SURVIVE the timeline projection. A content-dropping projection
    // (or one that compacts the transition row) would fail this. The canonical
    // template authors no agentConfig, so the resolved profile is `{}`.
    const transition = (rows ?? []).find((r) => r.entryKind === "transition");
    expect(transition).toBeDefined();
    expect(transition && "issuedAgentConfig" in transition).toBe(true);
    expect((transition as { issuedAgentConfig: unknown }).issuedAgentConfig).toEqual({});
    handle.close();
  });
});

// ── packet ch14-p3a: F1/F3/F5/F7 — the floor's pending-decision member ──

/**
 * A gated template: an agent step whose PASS edge recommends `approve`
 * and routes to a `humanGate`. `approve` names the gate ITSELF — an
 * admissible route that genuinely re-arrives — which is how the
 * two-DECISION_REQUEST-row fixture the join family needs is REACHED
 * through the real kernel instead of hand-authored.
 */
const gatedTemplate: WorkflowTemplate = {
  ref: { id: "gated-v0", version: 1 },
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
      instruction: "approve it?",
      decisions: {
        approve: { target: "gate" },
        finish: { target: "done" },
        rework: { target: "implement", payload: { instruction: { required: true }, refs: {} } },
      },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, operator: { defaultActor: "human-1" } },
};

const gatedDefinitions: DefinitionStore = {
  load: (ref) =>
    Promise.resolve(ref.id === "gated-v0" && ref.version === 1 ? admit(gatedTemplate) : null),
};

/** A dependency that YIELDS NOTHING — the C27 `null` shape. */
const nullDefinitions: DefinitionStore = { load: () => Promise.resolve(null) };

/**
 * A dependency yielding a template ADMISSION WOULD REFUSE. The
 * derivation's integrity throws describe COMMITTED STATE that cannot
 * exist, so the fixture must author what an admitted value cannot
 * express — the tree's deliberately-loose builder class, and the
 * `never` route keeps it clear of the `as AdmittedTemplate` owner guard.
 */
function brokenDefinitions(template: WorkflowTemplate): DefinitionStore {
  return { load: () => Promise.resolve(template as never) };
}

/** A store that hands the floor a DOCTORED detail — the only way to
 * stage a transcript/wait pair C13's atomicity forbids. */
function doctoredStore(
  base: StorePort,
  map: (detail: InstanceDetail) => InstanceDetail,
): StorePort {
  return {
    ...base,
    getInstanceDetail: async (id) => {
      const detail = await base.getInstanceDetail(id);
      return detail === null ? null : map(detail);
    },
  };
}

function gatedKernel(store: StorePort, definitions: DefinitionStore = gatedDefinitions) {
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

/** create → start → PASS: the run lands PARKED at the gate with its
 * DECISION_REQUEST row committed (C13's one visible transition). */
async function parkAtGate(
  store: StorePort,
  instanceId = "inst-gate",
  kernel = gatedKernel(store),
): Promise<void> {
  await kernel.create({ instanceId, templateRef: { id: "gated-v0", version: 1 }, task: "ship it" });
  const started = await kernel.start({ instanceId, opId: `${instanceId}-start` });
  if (started.kind !== "activated") throw new Error(`fixture: start ${started.kind}`);
  const passed = await kernel.handle({
    instanceId,
    opId: `${instanceId}-pass`,
    type: "PASS",
    actorId: "codex",
    expectedVersion: 2,
    expectedRole: "implementer",
    payload: { note: "done" },
  });
  if (passed.kind !== "committed") throw new Error(`fixture: PASS ${passed.kind}`);
}

function decisionRequestRows(
  detail: InstanceDetail,
): readonly (TranscriptEntry & { readonly entryKind: "DECISION_REQUEST" })[] {
  return detail.transcript.filter(
    (e): e is TranscriptEntry & { entryKind: "DECISION_REQUEST" } =>
      e.entryKind === "DECISION_REQUEST",
  );
}

describe("floor — F5 the pendingDecision member's presence rule (C21's binary)", () => {
  it("PRESENT for a parked-on-human-decision run whose pinned template is yielded", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await parkAtGate(handle.store);
    const detail = await createFloor(handle.store, gatedDefinitions).getInstanceDetail("inst-gate");
    expect(detail?.instance.wait?.kind).toBe("human_decision");
    expect(detail?.pendingDecision).toBeDefined();
    handle.close();
  });

  it("ABSENT for every non-parked member of dimension 1 — ACTIVE, a NON-decision wait, TERMINAL", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    // ACTIVE (the shared fixture's own instance), a kickoff_pending wait,
    // and a terminal run — each staged directly, each read with a WIRED
    // dependency so absence cannot be bought by an unwired floor.
    await handle.store.createInstance(instance);
    await handle.store.createInstance(heldInstance);
    await handle.store.createInstance({
      ...instance,
      instanceId: "inst-terminal",
      kernelStatus: "TERMINAL",
      terminalDisposition: "done",
      currentStep: "done",
      wait: null,
    });
    const floor = createFloor(handle.store, gatedDefinitions);
    for (const id of ["inst-1", "inst-held", "inst-terminal"]) {
      const detail = await floor.getInstanceDetail(id);
      expect(detail, id).not.toBeNull();
      expect(detail && "pendingDecision" in detail, id).toBe(false);
    }
    handle.close();
  });

  it("the read's OWN null survives — an unknown instance is null, never a member-less document", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    expect(await createFloor(handle.store, gatedDefinitions).getInstanceDetail("ghost")).toBeNull();
    handle.close();
  });

  it("ABSENT — not a value — when the dependency is null, and when it YIELDS null (C27's two shapes)", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await parkAtGate(handle.store);
    for (const definitions of [null, nullDefinitions]) {
      const detail = await createFloor(handle.store, definitions).getInstanceDetail("inst-gate");
      // Still PARKED — the operator reads `wait.kind` beside the absence.
      expect(detail?.instance.wait?.kind).toBe("human_decision");
      expect(detail && "pendingDecision" in detail).toBe(false);
    }
    handle.close();
  });

  it("the park test SHORT-CIRCUITS the load — a NOT-parked run reaches the dependency ZERO times", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    let loads = 0;
    const counting: DefinitionStore = {
      load: (ref) => {
        loads += 1;
        return gatedDefinitions.load(ref);
      },
    };
    await createFloor(handle.store, counting).getInstanceDetail("inst-1");
    expect(loads).toBe(0);
    // …and the SAME store IS reached for a parked one (the control that
    // keeps the zero from being vacuous).
    await parkAtGate(handle.store);
    await createFloor(handle.store, counting).getInstanceDetail("inst-gate");
    expect(loads).toBe(1);
    handle.close();
  });
});

describe("floor — F5/F4 the member's CONTENT is the derivation's own output", () => {
  it("equals humanDecisionRequest(instance, template, request) by WHOLE VALUE", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await parkAtGate(handle.store);
    const detail = await createFloor(handle.store, gatedDefinitions).getInstanceDetail("inst-gate");
    const raw = await handle.store.getInstanceDetail("inst-gate");
    if (raw === null || detail == null) throw new Error("fixture");
    const rows = decisionRequestRows(raw);
    expect(rows).toHaveLength(1);
    // The expectation is computed from the SAME committed inputs through
    // the derivation itself — a keyset assert would pass a build that
    // reached the right arm and dropped `decisionRequirements`.
    expect(detail.pendingDecision).toStrictEqual(
      humanDecisionRequest(raw.instance, admit(gatedTemplate), rows[0]!),
    );
    // …and the value is not vacuously empty: the gate's declared shape
    // rides it (a fixture whose gate declared nothing could not fail).
    expect(detail.pendingDecision?.allowedDecisions).toEqual(["approve", "finish", "rework"]);
    expect(detail.pendingDecision?.decisionRequirements).toStrictEqual({
      approve: [],
      finish: [],
      rework: ["instruction"],
    });
    expect(detail.pendingDecision?.recommendation).toBe("approve");
    expect(detail.pendingDecision?.operator).toBe("human-1");
    handle.close();
  });
});

describe("floor — F3 the correlation JOIN, and F6's no-catch rule", () => {
  it("uses the row `wait.requestRef` NAMES, not the newest — a recency read fails this", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    // ONE kernel across both parks: `newRequestId` counts per kernel, so a
    // second one would re-mint the SAME ref and the lane could not fail.
    const kernel = gatedKernel(handle.store);
    await parkAtGate(handle.store, "inst-gate", kernel);
    const first = await handle.store.getInstanceDetail("inst-gate");
    const firstRef = decisionRequestRows(first!)[0]!.requestRef;
    // `approve` re-arrives at the gate: a SECOND committed request row.
    const decided = await kernel.submitDecision({
      intent: "submit-decision",
      instanceId: "inst-gate",
      opId: "op-approve",
      expectedVersion: first!.instance.version,
      requestRef: firstRef,
      verdict: "approve",
      by: "human-1",
    });
    expect(decided.kind).toBe("committed");
    const both = await handle.store.getInstanceDetail("inst-gate");
    expect(decisionRequestRows(both!)).toHaveLength(2);
    // The wait now names the LATEST row; doctor it back to the EARLIER
    // one — the state C13's atomicity forbids, and the only shape on
    // which a join and a recency read disagree.
    const store = doctoredStore(handle.store, (detail) => ({
      ...detail,
      instance: {
        ...detail.instance,
        wait: { ...detail.instance.wait!, requestRef: firstRef },
      },
    }));
    const detail = await createFloor(store, gatedDefinitions).getInstanceDetail("inst-gate");
    expect(detail?.pendingDecision?.requestRef).toBe(firstRef);
    expect(decisionRequestRows(both!)[1]?.requestRef).not.toBe(firstRef);
    handle.close();
  });

  it("THROWS when the wait's handle names no committed row, and when the handle is ABSENT", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await parkAtGate(handle.store);
    const unmatched = doctoredStore(handle.store, (detail) => ({
      ...detail,
      instance: {
        ...detail.instance,
        wait: { ...detail.instance.wait!, requestRef: "req-that-never-committed" },
      },
    }));
    await expect(
      createFloor(unmatched, gatedDefinitions).getInstanceDetail("inst-gate"),
    ).rejects.toThrow(Error);
    const absent = doctoredStore(handle.store, (detail) => ({
      ...detail,
      instance: {
        ...detail.instance,
        wait: {
          kind: detail.instance.wait!.kind,
          requestedBy: detail.instance.wait!.requestedBy,
          resumeEvents: detail.instance.wait!.resumeEvents,
        },
      },
    }));
    await expect(
      createFloor(absent, gatedDefinitions).getInstanceDetail("inst-gate"),
    ).rejects.toThrow(Error);
    handle.close();
  });

  it("propagates ALL SIX of the derivation's integrity throws — the floor catches NOTHING", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await parkAtGate(handle.store);
    const gateWithout = (key: "role" | "instruction"): WorkflowTemplate => {
      // DROP the key rather than authoring it `undefined`: under
      // exactOptionalPropertyTypes a key authored `undefined` is PRESENT,
      // which is a different state from the missing one this site names.
      const gate: Record<string, unknown> = { ...gatedTemplate.steps["gate"] };
      delete gate[key];
      return { ...gatedTemplate, steps: { ...gatedTemplate.steps, gate } };
    };
    const noRole = gateWithout("role");
    const noInstruction = gateWithout("instruction");
    // The six sites, each staged at its OWN precondition. The lane
    // asserts the PRECONDITION and that the floor did not convert the
    // throw into an absence — never a message token: all six are bare
    // `Error`s and `name` cannot discriminate them.
    const sites: readonly {
      readonly site: string;
      readonly definitions: DefinitionStore;
      readonly doctor: (d: InstanceDetail) => InstanceDetail;
    }[] = [
      { site: "null currentStep", definitions: gatedDefinitions,
        doctor: (d) => ({ ...d, instance: { ...d.instance, currentStep: null } }) },
      { site: "gate with no step definition", definitions: gatedDefinitions,
        doctor: (d) => ({ ...d, instance: { ...d.instance, currentStep: "ghost" } }) },
      { site: "gate declares no role", definitions: brokenDefinitions(noRole), doctor: (d) => d },
      { site: "gate role unbound", definitions: gatedDefinitions,
        doctor: (d) => ({ ...d, instance: { ...d.instance, binding: {} } }) },
      { site: "gate declares no instruction", definitions: brokenDefinitions(noInstruction), doctor: (d) => d },
      { site: "null task", definitions: gatedDefinitions,
        doctor: (d) => ({ ...d, instance: { ...d.instance, task: null } }) },
    ];
    for (const { site, definitions, doctor } of sites) {
      const floor = createFloor(doctoredStore(handle.store, doctor), definitions);
      await expect(floor.getInstanceDetail("inst-gate"), site).rejects.toThrow(Error);
    }
    handle.close();
  });

  it("a REJECTING load propagates unaltered — the floor does not degrade it to an absence", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await parkAtGate(handle.store);
    const rejecting: DefinitionStore = {
      load: () =>
        Promise.reject(new TemplateLoadError({ stage: "read", findings: [] })),
    };
    await expect(
      createFloor(handle.store, rejecting).getInstanceDetail("inst-gate"),
    ).rejects.toBeInstanceOf(TemplateLoadError);
    handle.close();
  });
});

describe("floor — F7/F1 non-movement, MEASURED, and the required-not-optional parameter", () => {
  it("the constructor's arity is pinned at the TYPE level — an optional 2nd parameter widens it", () => {
    // The ch14-p2b arity-pin idiom: `2` is the ONLY inhabitant, which a
    // required parameter gives and an optional or defaulted one does not.
    const arity: CreateFloorArity = 2;
    expect(arity).toBe(2);
    const isExactlyTwo: CreateFloorArity extends 2 ? true : false = true;
    expect(isExactlyTwo).toBe(true);
  });

  it("REV-C-PROJECTIONS-READONLY: the floor's exported members are the THREE reads, unchanged", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    // The dependency buys a DERIVED read and no write surface: a member
    // added here would be caught by the closed literal, not by a reader.
    expect(Object.keys(createFloor(handle.store, gatedDefinitions)).sort()).toEqual([
      "getInstanceDetail",
      "getTimeline",
      "listInstances",
    ]);
    handle.close();
  });

  it("the floor's read surface grows by EXACTLY {pendingDecision}, and by NOTHING in every other state", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await parkAtGate(handle.store);
    await handle.store.createInstance(instance);
    const derivable = await createFloor(handle.store, gatedDefinitions).getInstanceDetail("inst-gate");
    // PER SURFACE and PER STATE, against a CLOSED literal keyset — a
    // union over states would pass the very placement error this pin
    // exists to catch.
    expect(Object.keys(derivable ?? {}).sort()).toEqual([
      "instance",
      "pendingDecision",
      "transcript",
    ]);
    for (const [state, floor, id] of [
      ["parked-and-underivable", createFloor(handle.store, nullDefinitions), "inst-gate"],
      ["not-parked", createFloor(handle.store, gatedDefinitions), "inst-1"],
      ["no-dependency", createFloor(handle.store, null), "inst-gate"],
    ] as const) {
      const detail = await floor.getInstanceDetail(id);
      expect(Object.keys(detail ?? {}).sort(), state).toEqual(["instance", "transcript"]);
    }
    handle.close();
  });
});
