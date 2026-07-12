import { describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  WorkflowInstance,
  AdmittedTemplate,
  WorkflowTemplate,
} from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createIngress } from "../ingress/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { StorePort } from "../ports/store.js";
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
import { createKernel } from "./kernel.js";
import { noopDiagnosticsSink } from "../diag/index.js";

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
    Promise.resolve(ref.id === "local-pair-v0" && ref.version === 1 ? admit(template) : null),
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

async function setup() {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
  const kernel = createKernel({
    store: handle.store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    diag: noopDiagnosticsSink,
  });
  return { kernel, store: handle.store };
}

describe("CT-A1-DUP — op_id idempotency (IC-A1)", () => {
  it("two racing deliveries of the same (instance_id, op_id) through ingress: exactly one commit, one Duplicate", async () => {
    const { kernel, store } = await setup();
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
    const raw = {
      instanceId: "inst-1",
      opId: "a1",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 1,
      expectedRole: "implementer",
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
    "createInstance" | "listInstances" | "getInstanceDetail" | "getTimeline"
  > {
    return {
      createInstance: () => Promise.reject(new Error("unused")),
      listInstances: () => Promise.reject(new Error("unused")),
      getInstanceDetail: () => Promise.reject(new Error("unused")),
      getTimeline: () => Promise.reject(new Error("unused")),
    };
  }

  it("conflict → reload shows the op landed → Duplicate (one commit attempt only)", async () => {
    let loads = 0;
    let findOpCalls = 0;
    let commits = 0;
    const landed = { payloadDigest: deriveEmitDigest(envelope("a1", "PASS", 1)) };
    const double: StorePort = {
      ...unusedStoreParts(),
      loadInstance: () => {
        loads += 1;
        return Promise.resolve(loads === 1 ? baseInstance : { ...baseInstance, version: 2 });
      },
      findOp: () => {
        findOpCalls += 1;
        return Promise.resolve(findOpCalls > 1 ? landed : null);
      },
      commitTransition: () => {
        commits += 1;
        return Promise.resolve({ kind: "cas_conflict" as const });
      },
    };
    const kernel = createKernel({
      store: double,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
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
      findOp: () => Promise.resolve(null),
      commitTransition: () => {
        commits += 1;
        return Promise.resolve({ kind: "cas_conflict" as const });
      },
    };
    const kernel = createKernel({
      store: double,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
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

  it("a DONE instance (terminal current step) → Rejected(not_active); full-instance state unchanged", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    await kernel.handle({ ...envelope("b2", "CONVERGED", 2, undefined, "reviewer"), actorId: "claude" });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(envelope("c3", "PASS", 3))).toEqual({
        kind: "rejected",
        reason: "not_active",
      });
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
          role: "reviewer",
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
    const outcome = await kernel.handle({ ...envelope("b2", "CONVERGED", 2, undefined, "reviewer"), actorId: "claude" });
    expect(outcome).toEqual({ kind: "committed", version: 3, intent: null });
    expect((await store.loadInstance("inst-1"))?.status).toBe("DONE");
  });

  it("round increments exactly on the loop-back commit (target = template.start)", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    expect((await store.loadInstance("inst-1"))?.round).toBe(1);
    await kernel.handle({ ...envelope("b2", "PASS", 2, undefined, "reviewer"), actorId: "claude" });
    expect((await store.loadInstance("inst-1"))?.round).toBe(2);
    await kernel.handle(envelope("c3", "PASS", 3));
    expect((await store.loadInstance("inst-1"))?.round).toBe(2);
  });
});

describe("CT-A1-COLLISION — a committed op_id pins its content (IC-A1, packet ch5-P4)", () => {
  it("same op_id, different payload → Rejected(op_id_collision); nothing consumed; the original still answers Duplicate; the payload commits under a fresh op", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff-1" }));

    const collided = await kernel.handle(envelope("a1", "PASS", 2, { ref: "diff-2" }));
    expect(collided).toEqual({ kind: "rejected", reason: "op_id_collision" });
    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.instance.version).toBe(2);

    // the ORIGINAL content retried → still a plain retransmission
    expect(await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff-1" }))).toEqual({
      kind: "duplicate",
    });
    // the rejected payload under a FRESH op_id → commits (no key consumed)
    const fresh = await kernel.handle({
      ...envelope("b2", "PASS", 2, { ref: "diff-2" }, "reviewer"),
      actorId: "claude",
    });
    expect(fresh.kind).toBe("committed");
  });

  it("the digest is TYPE-inclusive: same payload under a different event type collides", async () => {
    const { kernel } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff-1" }));
    expect(await kernel.handle(envelope("a1", "CONVERGED", 2, { ref: "diff-1" }))).toEqual({
      kind: "rejected",
      reason: "op_id_collision",
    });
  });

  it("absence is identity: an absent payload collides with a null payload under the same op_id", async () => {
    const { kernel } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    expect(await kernel.handle(envelope("a1", "PASS", 2, null))).toEqual({
      kind: "rejected",
      reason: "op_id_collision",
    });
  });

  it("collision WINS over stale — the idempotency rung answers first", async () => {
    const { kernel } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff-1" }));
    expect(await kernel.handle(envelope("a1", "PASS", 999, { ref: "diff-2" }))).toEqual({
      kind: "rejected",
      reason: "op_id_collision",
    });
  });
});

describe("CHK-A1-DIGEST — committed rows carry the emit digest; rejections record nothing", () => {
  it("every committed row's payloadDigest equals deriveEmitDigest(envelope), read through the ports", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff-1" }));
    await kernel.handle({ ...envelope("b2", "PASS", 2, { note: "findings" }, "reviewer"), actorId: "claude" });

    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(2);
    for (const entry of detail?.transcript ?? []) {
      expect(entry.payloadDigest).toBe(deriveEmitDigest(entry.envelope));
    }
  });

  it("rejected / duplicate / collision attempts leave row count and version untouched", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1, { ref: "diff-1" }));

    await kernel.handle(envelope("a1", "PASS", 2, { ref: "diff-1" })); // duplicate
    await kernel.handle(envelope("a1", "PASS", 2, { ref: "diff-2" })); // collision
    await kernel.handle(envelope("z9", "PASS", 7, { ref: "x" })); // stale
    await kernel.handle(envelope("z8", "NOPE", 2, { ref: "x" }, "reviewer")); // no_transition

    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.instance.version).toBe(2);
  });
});

// ── packet ch11-P1: the L1 authority slice — end-to-end lanes ────────

type FullState = {
  readonly instance: WorkflowInstance;
  readonly rows: readonly (readonly [number, string])[];
};

/** A11's proof: the FULL WorkflowInstance value + the transcript row set. */
async function fullState(store: StorePort, id: string): Promise<FullState> {
  const detail = await store.getInstanceDetail(id);
  if (detail === null) {
    throw new Error(`no instance '${id}'`);
  }
  return {
    instance: detail.instance,
    rows: detail.transcript.map((entry) => [entry.seq, entry.envelope.opId] as const),
  };
}

async function expectNoStateChange(
  store: StorePort,
  id: string,
  act: () => Promise<unknown>,
): Promise<void> {
  const before = await fullState(store, id);
  await act();
  const after = await fullState(store, id);
  expect(after).toEqual(before);
}

describe("L1 authority — the four new rejections through the real seam (A4/A7/A8/A10)", () => {
  it("missing expectedRole → Rejected(missing_role); full-instance state unchanged", async () => {
    const { kernel, store } = await setup();
    const { expectedRole: dropped, ...roleless } = envelope("m1", "PASS", 1, { ref: "d" });
    void dropped;
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(roleless)).toEqual({
        kind: "rejected",
        reason: "missing_role",
      });
    });
  });

  it("wrong role claim → Rejected(role_not_authorized); state unchanged", async () => {
    const { kernel, store } = await setup();
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(envelope("m2", "PASS", 1, { ref: "d" }, "reviewer"))).toEqual({
        kind: "rejected",
        reason: "role_not_authorized",
      });
    });
  });

  it("a store-staged CREATED instance → Rejected(not_active); state unchanged", async () => {
    const { kernel, store } = await setup();
    await store.createInstance({ ...baseInstance, instanceId: "inst-created", status: "CREATED" });
    await expectNoStateChange(store, "inst-created", async () => {
      expect(
        await kernel.handle({ ...envelope("m3", "PASS", 1, { ref: "d" }), instanceId: "inst-created" }),
      ).toEqual({ kind: "rejected", reason: "not_active" });
    });
  });

  it("DONE + missing version → not_active (the state rung precedes the version entry guard); state unchanged", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("d1", "PASS", 1, { ref: "d" }));
    await kernel.handle(envelope("d2", "CONVERGED", 2, { ref: "d" }, "reviewer"));
    await expectNoStateChange(store, "inst-1", async () => {
      const { expectedVersion: dv, expectedRole: dr, ...bare } = envelope("d3", "PASS");
      void dv;
      void dr;
      expect(await kernel.handle(bare)).toEqual({ kind: "rejected", reason: "not_active" });
    });
  });

  it("not_authorized: the action EXISTS as a transition but an explicit profile forbids it (dimension 4); state unchanged", async () => {
    const profiled: WorkflowTemplate = {
      ...template,
      capabilityProfile: { reviewer: { review: ["CONVERGED"] } },
    };
    const defs: DefinitionStore = { load: () => Promise.resolve(admit(profiled)) };
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance({ ...baseInstance, currentStep: "review", version: 1 });
    const kernel = createKernel({
      store: handle.store,
      definitions: defs,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
    // PASS exists as a review transition, the profile allows only CONVERGED.
    await expectNoStateChange(handle.store, "inst-1", async () => {
      expect(await kernel.handle(envelope("p1", "PASS", 1, { ref: "d" }, "reviewer"))).toEqual({
        kind: "rejected",
        reason: "not_authorized",
      });
    });
  });
});

describe("L1 authority — the cross-boundary ordering combinations (dimension 1, #8/#9/#11)", () => {
  it("#8 wrong role + NONEXISTENT type → role_not_authorized (the canonical reorder catch: navigation hoisted above authority would answer no_transition)", async () => {
    const { kernel, store } = await setup();
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(envelope("c8", "NOPE", 1, { ref: "d" }, "reviewer"))).toEqual({
        kind: "rejected",
        reason: "role_not_authorized",
      });
    });
  });

  it("#9 right role + NONEXISTENT type → no_transition (navigation precedes capability)", async () => {
    const { kernel, store } = await setup();
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(envelope("c9", "NOPE", 1, { ref: "d" }))).toEqual({
        kind: "rejected",
        reason: "no_transition",
      });
    });
  });

  it("#11 wrong role + an explicit profile forbidding the granted role's type → role_not_authorized (authority precedes capability)", async () => {
    // The profile forbids PASS for the GRANTED role (implementer on
    // implement) — a capability-first reorder would answer
    // not_authorized; the correct order answers role_not_authorized.
    const profiled: WorkflowTemplate = {
      ...template,
      capabilityProfile: { implementer: { implement: [] } },
    };
    const defs: DefinitionStore = { load: () => Promise.resolve(admit(profiled)) };
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(baseInstance);
    const kernel = createKernel({
      store: handle.store,
      definitions: defs,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
    await expectNoStateChange(handle.store, "inst-1", async () => {
      expect(await kernel.handle(envelope("c11", "PASS", 1, { ref: "d" }, "reviewer"))).toEqual({
        kind: "rejected",
        reason: "role_not_authorized",
      });
    });
  });
});

describe("L1 authority — CAS restart × terminal (dimension 6, A12)", () => {
  it("a restart that lands on a concurrently-terminal instance answers not_active", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance({ ...baseInstance, currentStep: "review", version: 1 });
    const inner = handle.store;
    let intercepted = false;
    const contended: StorePort = {
      ...inner,
      commitTransition: async (input) => {
        if (!intercepted) {
          intercepted = true;
          // A concurrent terminal commit wins the race...
          const winner = await inner.commitTransition({
            instanceId: "inst-1",
            expectedVersion: 1,
            envelope: envelope("w1", "CONVERGED", 1, { ref: "w" }, "reviewer"),
            payloadDigest: "dg-w",
            newCurrentStep: "done",
            newRound: 1,
            newStatus: "DONE",
          });
          expect(winner.kind).toBe("committed");
          // ...and THIS attempt reports the conflict → whole-handle restart.
          return { kind: "cas_conflict" };
        }
        return inner.commitTransition(input);
      },
    };
    const kernel = createKernel({
      store: contended,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
    expect(await kernel.handle(envelope("r1", "PASS", 1, { ref: "d" }, "reviewer"))).toEqual({
      kind: "rejected",
      reason: "not_active",
    });
  });
});
