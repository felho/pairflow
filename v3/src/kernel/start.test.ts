import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { describe, expect, it } from "vitest";

import { deriveEmitDigest } from "../emit/index.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
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
import { createKernel } from "./kernel.js";
import { noopDiagnosticsSink } from "../diag/index.js";

function setup(template = fixtureTemplate()) {
  const handle = openStore(":memory:", createControlledClock(0));
  const kernel = createKernel({
      processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: fixtureDefinitionStore(admit(template)),
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
  });
  return { kernel, store: handle.store };
}

describe("START_INSTANCE — bootstrap (l0b)", () => {
  it("creates at template.start with version 1, round 1, RUNNING, and derives the first intent", async () => {
    const { kernel, store } = setup();
    const started = await kernel.startInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "ship the feature",
    });

    expect(started.kind).toBe("started");
    expect(started.version).toBe(1);
    expect(started.intent).toEqual({
      actor: "codex",
      packet: {
        instanceId: "inst-1",
        expectedVersion: 1,
        role: "implementer",
        task: "ship the feature",
        instruction: "build it",
        availableOps: ["PASS"],
      },
    });

    const instance = await store.loadInstance("inst-1");
    expect(instance).toMatchObject({
      currentStep: "implement",
      round: 1,
      status: "RUNNING",
      version: 1,
      binding: { implementer: "codex", reviewer: "claude" },
    });
  });

  it("start overrides beat template defaults in the binding", async () => {
    const { kernel, store } = setup();
    await kernel.startInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
      startOverrides: { reviewer: "gemini" },
    });
    expect((await store.loadInstance("inst-1"))?.binding).toEqual({
      implementer: "codex",
      reviewer: "gemini",
    });
  });

  it("binding coverage fails at start, not mid-run: unbound role → throw, NO state", async () => {
    const template = fixtureTemplate();
    const noDefault = {
      ...template,
      roles: { ...template.roles, reviewer: {} },
    };
    const { kernel, store } = setup(noDefault);

    await expect(
      kernel.startInstance({
        instanceId: "inst-1",
        templateRef: { id: "local-pair-v0", version: 1 },
        task: "t",
      }),
    ).rejects.toThrow(/binding coverage.*reviewer/);
    expect(await store.listInstances()).toEqual([]);
  });

  it("an override can complete a binding a default does not cover", async () => {
    const template = fixtureTemplate();
    const noDefault = {
      ...template,
      roles: { ...template.roles, reviewer: {} },
    };
    const { kernel, store } = setup(noDefault);
    await kernel.startInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
      startOverrides: { reviewer: "gemini" },
    });
    expect((await store.loadInstance("inst-1"))?.binding.reviewer).toBe("gemini");
  });

  it("unknown templateRef → start-side failure: throw, no state, no invented rejection name", async () => {
    const { kernel, store } = setup();
    await expect(
      kernel.startInstance({
        instanceId: "inst-1",
        templateRef: { id: "nope", version: 1 },
        task: "t",
      }),
    ).rejects.toThrow(/start failed/);
    expect(await store.listInstances()).toEqual([]);
  });
});

describe("START_INSTANCE — the runtime-context lane table (packet ch11-P3b, S2/S3)", () => {
  const requiredTemplate = (): WorkflowTemplate => ({
    ...fixtureTemplate(),
    runtimeContext: "required",
  });

  it("declared 'required' + ref present → the instance starts with runtimeContext = ref", async () => {
    const { kernel, store } = setup(requiredTemplate());
    await kernel.startInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
      runtimeContextRef: "/ws/ready",
    });
    expect((await store.loadInstance("inst-1"))?.runtimeContext).toBe("/ws/ready");
  });

  it("declared 'required' + ref ABSENT → START-SIDE throw, no state, no invented rejection name", async () => {
    const { kernel, store } = setup(requiredTemplate());
    await expect(
      kernel.startInstance({
        instanceId: "inst-1",
        templateRef: { id: "local-pair-v0", version: 1 },
        task: "t",
      }),
    ).rejects.toThrow(/runtime context.*required/i);
    expect(await store.listInstances()).toEqual([]);
  });

  it("undeclared + ref ABSENT → runtimeContext = null (ready(∅))", async () => {
    const { kernel, store } = setup();
    await kernel.startInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
    });
    expect((await store.loadInstance("inst-1"))?.runtimeContext).toBeNull();
  });

  it("undeclared + ref PRESENT → START-SIDE throw (surplus input, S3), no state", async () => {
    const { kernel, store } = setup();
    await expect(
      kernel.startInstance({
        instanceId: "inst-1",
        templateRef: { id: "local-pair-v0", version: 1 },
        task: "t",
        runtimeContextRef: "/ws/surplus",
      }),
    ).rejects.toThrow(/runtime context.*context-free|surplus/i);
    expect(await store.listInstances()).toEqual([]);
  });

  it("an EMPTY-STRING ref throws on the REQUIRED lane", async () => {
    const { kernel, store } = setup(requiredTemplate());
    await expect(
      kernel.startInstance({
        instanceId: "inst-1",
        templateRef: { id: "local-pair-v0", version: 1 },
        task: "t",
        runtimeContextRef: "",
      }),
    ).rejects.toThrow(/nonempty|not a ref/i);
    expect(await store.listInstances()).toEqual([]);
  });

  it("an EMPTY-STRING ref throws on the UNDECLARED lane too (the value grammar, every lane)", async () => {
    const { kernel, store } = setup();
    await expect(
      kernel.startInstance({
        instanceId: "inst-1",
        templateRef: { id: "local-pair-v0", version: 1 },
        task: "t",
        runtimeContextRef: "",
      }),
    ).rejects.toThrow(/nonempty|not a ref/i);
    expect(await store.listInstances()).toEqual([]);
  });
});
