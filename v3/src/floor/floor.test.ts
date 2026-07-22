import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  WorkflowInstance,
  AdmittedTemplate,
  WorkflowTemplate,
} from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createKernel } from "../kernel/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import { openStore } from "../store/index.js";
import { createControlledClock } from "../testkit/index.js";
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
import { createFloor } from "./floor.js";
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
    const floor = createFloor(handle.store);

    expect(await floor.listInstances()).toHaveLength(1);
    const detail = await floor.getInstanceDetail("inst-1");
    expect(detail?.instance.instanceId).toBe("inst-1");
    expect(detail?.transcript).toEqual([]);
    handle.close();
  });

  it("unknown instance → null", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    expect(await createFloor(handle.store).getInstanceDetail("nope")).toBeNull();
    handle.close();
  });
});

describe("floor.getTimeline — the §6.2 cursor read (packet ch6-P1)", () => {
  it("propagates the null/[] duality unchanged", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const floor = createFloor(handle.store);
    expect(await floor.getTimeline("ghost", 0)).toBeNull();
    await handle.store.createInstance(instance);
    expect(await floor.getTimeline("inst-1", 0)).toEqual([]);
    handle.close();
  });

  it("propagates the fail-closed invalid-cursor RangeError", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await expect(createFloor(handle.store).getTimeline("inst-1", 0.5)).rejects.toThrow(
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
    const floor = createFloor(handle.store);

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
    const rows = await createFloor(handle.store).listInstances();
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
    const rows = await createFloor(handle.store).listInstances();
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
    const rows = await createFloor(handle.store).listInstances();
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
    const detail = await createFloor(handle.store).getInstanceDetail("inst-ready");
    expect(detail?.instance.runtimeContext).toEqual({
      state: "ready",
      ref: { kind: "worktree", locator: SECRET_LOCATOR },
    });
    // The full wait payload survives for a held run too.
    await handle.store.createInstance(heldInstance);
    const held = await createFloor(handle.store).getInstanceDetail("inst-held");
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
    const floor = createFloor(handle.store);

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
