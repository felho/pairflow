import { describe, expect, it } from "vitest";

import type { WorkflowInstance } from "../domain/index.js";
import { openStore } from "../store/index.js";
import { createControlledClock } from "../testkit/index.js";
import { createFloor } from "./floor.js";

const instance: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "t",
  binding: { implementer: "codex", reviewer: "claude" },
  currentStep: "implement",
  round: 1,
  status: "RUNNING",
  version: 1,
};

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
