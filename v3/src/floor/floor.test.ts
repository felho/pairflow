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
