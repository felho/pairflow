import { describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import { createIngress } from "../ingress/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { StorePort } from "../ports/store.js";
import { openStore } from "../store/index.js";
import { createControlledClock } from "../testkit/index.js";
import { createKernel } from "./kernel.js";

// Test-local fixtures: the testkit MD-1 template builder is ch4-P4's
// deliverable; P3 wires the kernel against hand-built shapes.
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
    Promise.resolve(ref.id === "local-pair-v0" && ref.version === 1 ? template : null),
};

const baseInstance: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "build it",
  binding: { implementer: "codex", reviewer: "claude" },
  currentStep: "implement",
  round: 1,
  status: "RUNNING",
  version: 1,
};

function envelope(
  opId: string,
  type: string,
  expectedVersion?: number,
  payload?: unknown,
): EventEnvelope {
  return {
    instanceId: "inst-1",
    opId,
    type,
    actorId: "codex",
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    ...(payload !== undefined ? { payload } : {}),
  };
}

async function setup() {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
  const kernel = createKernel({
    store: handle.store,
    definitions,
    time: createControlledClock(0),
  });
  return { kernel, store: handle.store };
}

describe("CT-A1-DUP — op_id idempotency (IC-A1)", () => {
  it("two racing deliveries of the same (instance_id, op_id) through ingress: exactly one commit, one Duplicate", async () => {
    const { kernel, store } = await setup();
    const ingress = createIngress(kernel);
    const raw = {
      instanceId: "inst-1",
      opId: "a1",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 1,
      payload: { ref: "diff" },
    };
    const outcomes = await Promise.all([ingress.submit(raw), ingress.submit(raw)]);
    expect(outcomes.map((o) => o.kind).sort()).toEqual(["committed", "duplicate"]);
    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.instance.version).toBe(2);
  });

  it("sequential redelivery answers Duplicate with no second transcript entry", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    const second = await kernel.handle(envelope("a1", "PASS", 1));
    expect(second).toEqual({ kind: "duplicate" });
    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(1);
  });

  it("duplicate WINS over a missing/stale version on a committed op (idempotency checked first)", async () => {
    const { kernel } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    expect(await kernel.handle(envelope("a1", "PASS"))).toEqual({ kind: "duplicate" });
    expect(await kernel.handle(envelope("a1", "PASS", 999))).toEqual({ kind: "duplicate" });
  });
});

describe("CAS restart — never re-commit a target computed from stale state", () => {
  function unusedStoreParts(): Pick<
    StorePort,
    "createInstance" | "listInstances" | "getInstanceDetail"
  > {
    return {
      createInstance: () => Promise.reject(new Error("unused")),
      listInstances: () => Promise.reject(new Error("unused")),
      getInstanceDetail: () => Promise.reject(new Error("unused")),
    };
  }

  it("conflict → reload shows the op landed → Duplicate (one commit attempt only)", async () => {
    let loads = 0;
    let hasOpCalls = 0;
    let commits = 0;
    const double: StorePort = {
      ...unusedStoreParts(),
      loadInstance: () => {
        loads += 1;
        return Promise.resolve(loads === 1 ? baseInstance : { ...baseInstance, version: 2 });
      },
      hasOp: () => {
        hasOpCalls += 1;
        return Promise.resolve(hasOpCalls > 1);
      },
      commitTransition: () => {
        commits += 1;
        return Promise.resolve({ kind: "cas_conflict" as const });
      },
    };
    const kernel = createKernel({ store: double, definitions, time: createControlledClock(0) });
    const outcome = await kernel.handle(envelope("a1", "PASS", 1));
    expect(outcome).toEqual({ kind: "duplicate" });
    expect(commits).toBe(1);
    expect(loads).toBe(2);
  });

  it("conflict → reload shows ANOTHER op advanced the version → Stale, no re-commit", async () => {
    let loads = 0;
    let commits = 0;
    const double: StorePort = {
      ...unusedStoreParts(),
      loadInstance: () => {
        loads += 1;
        return Promise.resolve(loads === 1 ? baseInstance : { ...baseInstance, version: 2 });
      },
      hasOp: () => Promise.resolve(false),
      commitTransition: () => {
        commits += 1;
        return Promise.resolve({ kind: "cas_conflict" as const });
      },
    };
    const kernel = createKernel({ store: double, definitions, time: createControlledClock(0) });
    const outcome = await kernel.handle(envelope("a1", "PASS", 1));
    expect(outcome).toEqual({ kind: "stale", currentVersion: 2 });
    expect(commits).toBe(1);
  });
});

describe("expected-version-mandatory (l0b)", () => {
  it("missing expected_version → Rejected(missing_version)", async () => {
    const { kernel } = await setup();
    expect(await kernel.handle(envelope("a1", "PASS"))).toEqual({
      kind: "rejected",
      reason: "missing_version",
    });
  });

  it("mismatched expected_version → Stale(currentVersion)", async () => {
    const { kernel } = await setup();
    expect(await kernel.handle(envelope("a1", "PASS", 7))).toEqual({
      kind: "stale",
      currentVersion: 1,
    });
  });
});

describe("rejection branches", () => {
  it("unknown instance → Rejected(unknown_instance)", async () => {
    const { kernel } = await setup();
    const env = { ...envelope("a1", "PASS", 1), instanceId: "nope" };
    expect(await kernel.handle(env)).toEqual({ kind: "rejected", reason: "unknown_instance" });
  });

  it("no transition for the event type → Rejected(no_transition)", async () => {
    const { kernel } = await setup();
    expect(await kernel.handle(envelope("a1", "CONVERGED", 1))).toEqual({
      kind: "rejected",
      reason: "no_transition",
    });
  });

  it("a DONE instance (terminal current step) → Rejected(no_transition)", async () => {
    const { kernel } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    await kernel.handle({ ...envelope("b2", "CONVERGED", 2), actorId: "claude" });
    expect(await kernel.handle(envelope("c3", "PASS", 3))).toEqual({
      kind: "rejected",
      reason: "no_transition",
    });
  });
});

describe("committed path — intent derived from POST-commit state", () => {
  it("derives the next DispatchIntent: actor, fresh expectedVersion, availableOps, handoff", async () => {
    const { kernel } = await setup();
    const outcome = await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff-1" }));
    expect(outcome).toEqual({
      kind: "committed",
      version: 2,
      intent: {
        actor: "claude",
        packet: {
          instanceId: "inst-1",
          expectedVersion: 2,
          task: "build it",
          instruction: "review it",
          handoff: { ref: "diff-1" },
          availableOps: ["PASS", "CONVERGED"],
        },
      },
    });
  });

  it("a terminal commit yields intent: null and status DONE (commit ≠ deliver)", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    const outcome = await kernel.handle({ ...envelope("b2", "CONVERGED", 2), actorId: "claude" });
    expect(outcome).toEqual({ kind: "committed", version: 3, intent: null });
    expect((await store.loadInstance("inst-1"))?.status).toBe("DONE");
  });

  it("round increments exactly on the loop-back commit (target = template.start)", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    expect((await store.loadInstance("inst-1"))?.round).toBe(1);
    await kernel.handle({ ...envelope("b2", "PASS", 2), actorId: "claude" });
    expect((await store.loadInstance("inst-1"))?.round).toBe(2);
    await kernel.handle(envelope("c3", "PASS", 3));
    expect((await store.loadInstance("inst-1"))?.round).toBe(2);
  });
});
