import { describe, expect, it } from "vitest";

import { deriveEmitDigest } from "../emit/index.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import { createKernel } from "./kernel.js";

function setup(template = fixtureTemplate()) {
  const handle = openStore(":memory:", createControlledClock(0));
  const kernel = createKernel({
    store: handle.store,
    definitions: fixtureDefinitionStore(template),
    time: createControlledClock(0),
    digest: deriveEmitDigest,
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
