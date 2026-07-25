import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner, createScriptedRuntimeContextProvider } from "../testkit/index.js";
import { describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  GateBinding,
  GateDecision,
  GateProjection,
  Outcome,
  RuntimeContextProjection,
  RuntimeContextRef,
  RuntimeContextSpec,
  TranscriptEntry,
  TransitionEntry,
  WorkflowInstance,
  AdmittedTemplate,
  WorkflowTemplate,
} from "../domain/index.js";

/** ch12-p3: the retired "required" string migrated to a provisionable spec. */
const KERNEL_WORKTREE_SPEC: RuntimeContextSpec = { kind: "worktree", provider: "pairflow.worktree" };
import { deriveEmitDigest } from "../emit/index.js";
import { createIngress } from "../ingress/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type {
  DiagnosticsSink,
  GateCatalog,
  GateInvocationProjection,
  GateRegistration,
  InlineGateRegistration,
  ProcessGateRegistration,
  ProcessGateRunner,
  ProcessResult,
  ProviderRegistry,
  RuntimeContextProvider,
} from "../ports/index.js";
import type { EffectiveProcessConfig } from "../domain/index.js";
import type { StorePort } from "../ports/store.js";
import { openStore } from "../store/index.js";
import { createControlledClock, createRecordingDiagnosticsSink } from "../testkit/index.js";
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
import type { Kernel } from "./kernel.js";
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
  kernelStatus: "ACTIVE",
  terminalDisposition: null,
  activationMode: "immediate",
  wait: null,
  runtimeContext: { state: "ready", ref: null },
  failureReason: null,
  runOverrides: {},
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

/** These lanes commit only actor transitions (never lifecycle facts), so a
 * committed transcript row narrows to its transition face (F4 discriminant
 * narrowing). A fact row here would be a rebase-time bug, not a tolerated
 * shape — it fails loud rather than silently reading `undefined`. */
function asTransition(entry: TranscriptEntry): TransitionEntry {
  if (entry.entryKind !== "transition") {
    throw new Error(`expected a transition transcript row, got '${entry.entryKind}'`);
  }
  return entry;
}

/** The transition row's retained gate decisions, tolerating an absent row
 * (the `detail?.transcript[0]?.gateDecisions` read shape). */
function gatesOf(entry: TranscriptEntry | undefined) {
  return entry === undefined ? undefined : asTransition(entry).gateDecisions;
}

async function setup() {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(baseInstance);
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
    "createInstance" | "commitLifecycle" | "listInstances" | "getInstanceDetail" | "getTimeline"
  > {
    return {
      createInstance: () => Promise.reject(new Error("unused")),
      commitLifecycle: () => Promise.reject(new Error("unused")),
      listInstances: () => Promise.reject(new Error("unused")),
      getInstanceDetail: () => Promise.reject(new Error("unused")),
      getTimeline: () => Promise.reject(new Error("unused")),
    };
  }

  it("conflict → reload shows the op landed → Duplicate (one commit attempt only)", async () => {
    let loads = 0;
    let findOpCalls = 0;
    let commits = 0;
    const landed = {
      payloadDigest: deriveEmitDigest(envelope("a1", "PASS", 1)),
      entryKind: "transition" as const,
    };
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
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: double,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
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
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: double,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
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
          // ch12-p2 (E1): the resolved run profile — no agentConfig
          // authored on this template, so the cascade yields `{}`.
          effectiveAgentConfig: {},
          // ch12-p3 (E1): a context-free run — the explicit `none`.
          runtimeContext: "none",
        },
      },
    });
  });

  it("a terminal commit yields intent: null and TERMINAL + done (commit ≠ deliver; E4)", async () => {
    const { kernel, store } = await setup();
    await kernel.handle(envelope("a1", "PASS", 1));
    const outcome = await kernel.handle({ ...envelope("b2", "CONVERGED", 2, undefined, "reviewer"), actorId: "claude" });
    expect(outcome).toEqual({ kind: "committed", version: 3, intent: null });
    const done = await store.loadInstance("inst-1");
    expect(done?.kernelStatus).toBe("TERMINAL");
    expect(done?.terminalDisposition).toBe("done");
  });

});

// ── packet ch11-P2c: round advancement is DECLARED transition semantics
// (dimensions 1–2) — the ch-4 `target === template.start` heuristic
// retired; the kernel reads the admission-normalized `advancesRound`
// flag for the committed event type (K1). ────────────────────────────

/** Admit `tmpl` and wire a kernel over a fresh in-memory store seeded
 * with `instance` (default: baseInstance at the start step, round 1). */
async function setupRound(
  tmpl: WorkflowTemplate,
  instance: WorkflowInstance = baseInstance,
): Promise<{ kernel: Kernel; store: StorePort }> {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(instance);
  const defs: DefinitionStore = { load: () => Promise.resolve(admit(tmpl)) };
  const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: defs,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
  });
  return { kernel, store: handle.store };
}

const reviewerPass = (opId: string, v: number): EventEnvelope => ({
  ...envelope(opId, "PASS", v, undefined, "reviewer"),
  actorId: "claude",
});

describe("round advancement — declared transition semantics (dimension 1: both directions)", () => {
  it("(a) a declared NON-start advancing target advances (+1) — the retired heuristic would NOT", async () => {
    // advanceOnArrivalAt: [review]; the FIRST PASS is implement→review, a
    // non-start target — the heuristic (target === start) would leave
    // round 1. Declared semantics advance it.
    const { kernel, store } = await setupRound({
      ...template,
      round: { advanceOnArrivalAt: ["review"] },
    });
    expect((await kernel.handle(envelope("a1", "PASS", 1))).kind).toBe("committed");
    expect((await store.loadInstance("inst-1"))?.round).toBe(2);
  });

  it("(b) a declaration-absent loop-back arrival AT start does NOT advance — the heuristic WOULD", async () => {
    // Declaration-absent ⇒ all-false flags (C38). The loop-back
    // review→implement lands on start; the heuristic would advance it.
    const { kernel, store } = await setupRound(template);
    expect((await kernel.handle(envelope("a1", "PASS", 1))).kind).toBe("committed");
    expect((await store.loadInstance("inst-1"))?.round).toBe(1);
    expect((await kernel.handle(reviewerPass("b2", 2))).kind).toBe("committed");
    expect((await store.loadInstance("inst-1"))?.round).toBe(1);
  });

  it("(c) a start-omitting list: arrival at the listed step advances, arrival at start does not (both halves)", async () => {
    // advanceOnArrivalAt: [review] LISTS the non-start review and OMITS
    // the start implement (C38's exhaustive-authored-list rule).
    const { kernel, store } = await setupRound({
      ...template,
      round: { advanceOnArrivalAt: ["review"] },
    });
    // arrival at the listed step (review) advances → 2
    expect((await kernel.handle(envelope("a1", "PASS", 1))).kind).toBe("committed");
    expect((await store.loadInstance("inst-1"))?.round).toBe(2);
    // arrival at start (implement) via loop-back does NOT advance → stays 2
    expect((await kernel.handle(reviewerPass("b2", 2))).kind).toBe("committed");
    expect((await store.loadInstance("inst-1"))?.round).toBe(2);
  });
});

describe("round advancement — dimension 2: declaration-absent default (kernel grain)", () => {
  it("a full loop-back run on a declaration-absent template ends round 1", async () => {
    const { kernel, store } = await setupRound(template);
    await kernel.handle(envelope("a1", "PASS", 1)); // implement → review
    await kernel.handle(reviewerPass("b2", 2)); // review → implement (loop-back)
    await kernel.handle(envelope("c3", "PASS", 3)); // implement → review
    await kernel.handle({
      ...envelope("d4", "CONVERGED", 4, undefined, "reviewer"),
      actorId: "claude",
    }); // review → done (terminal)
    const instance = await store.loadInstance("inst-1");
    expect(instance?.kernelStatus).toBe("TERMINAL");
    expect(instance?.terminalDisposition).toBe("done");
    expect(instance?.round).toBe(1);
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
    for (const raw of detail?.transcript ?? []) {
      const entry = asTransition(raw);
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
    rows: detail.transcript.map((entry) => [entry.seq, asTransition(entry).envelope.opId] as const),
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
    await store.createInstance({ ...baseInstance, instanceId: "inst-created", kernelStatus: "CREATED" });
    await expectNoStateChange(store, "inst-created", async () => {
      expect(
        await kernel.handle({ ...envelope("m3", "PASS", 1, { ref: "d" }), instanceId: "inst-created" }),
      ).toEqual({ kind: "rejected", reason: "not_active" });
    });
  });

  it("TERMINAL + missing version → not_active (the state rung precedes the version entry guard); state unchanged", async () => {
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
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: defs,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
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
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: defs,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
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
            gateDecisions: [],
            newCurrentStep: "done",
            newRound: 1,
            newKernelStatus: "TERMINAL",
            newTerminalDisposition: "done",
            issuedAgentConfig: {},
          });
          expect(winner.kind).toBe("committed");
          // ...and THIS attempt reports the conflict → whole-handle restart.
          return { kind: "cas_conflict" };
        }
        return inner.commitTransition(input);
      },
    };
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: contended,
      definitions,
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: noopDiagnosticsSink,
    });
    expect(await kernel.handle(envelope("r1", "PASS", 1, { ref: "d" }, "reviewer"))).toEqual({
      kind: "rejected",
      reason: "not_active",
    });
  });
});

// ── packet ch11-P2b: the L2 gate rung — K/O lanes (test-composed
// catalogs and stores; the shipped registry/store are never mutated) ──

/** A review instance the gated CONVERGED lanes emit into. */
const reviewInstance: WorkflowInstance = { ...baseInstance, currentStep: "review", version: 1 };

/** local-pair-v0 with a pipeline bound at (review, CONVERGED). */
function gatedReviewTemplate(pipeline: readonly GateBinding[]): WorkflowTemplate {
  return {
    ...template,
    steps: {
      implement: { role: "implementer", instruction: "build it", transitions: { PASS: "review" } },
      review: {
        role: "reviewer",
        instruction: "review it",
        transitions: { PASS: "implement", CONVERGED: "done" },
        gates: { CONVERGED: pipeline },
      },
    },
  };
}

/** An inline evaluator that logs its name (call order + count) and
 * returns a scripted decision — the recording-catalog probe. */
function scriptedInline(
  name: string,
  log: string[],
  decide: (projection: GateProjection) => GateDecision,
): InlineGateRegistration {
  return {
    implementation: "declarative",
    execution: "inline",
    requiresRuntimeContext: false,
    validateAndNormalizeConfig: () => ({ ok: true, effective: {} }),
    evaluate: (_config, projection) => {
      log.push(name);
      return decide(projection);
    },
  };
}

/** A process-implementation registration (no evaluate — the type
 * discriminant forbids one). ch11-P3b: the process arm now RUNS via the
 * injected runner; the admitted binding carries `effective` verbatim. */
function processRegWith(effective: EffectiveProcessConfig): ProcessGateRegistration {
  return {
    implementation: "process",
    execution: "inline",
    requiresRuntimeContext: true,
    validateAndNormalizeConfig: () => ({ ok: true, effective }),
  };
}

/** The exitCode-mode effective config (onExit zero→allow / nonzero→block; a
 * complete authored-or-default reason map). */
const exitCodeEffective: EffectiveProcessConfig = {
  command: "run the checks",
  timeoutMs: 1000,
  output: { mode: "exitCode" },
  onExit: { zero: "allow", nonzero: "block" },
  onRunnerError: "blockTransition",
  onTimeout: "blockTransition",
  reason: { zero: "sys:exit_zero", nonzero: "test_failed" },
};

const jsonEffective: EffectiveProcessConfig = {
  command: "emit a decision",
  timeoutMs: 1000,
  output: { mode: "gateDecisionJson" },
  onRunnerError: "blockTransition",
  onTimeout: "blockTransition",
};

/** A ready-ref review instance — the process arm's happy operand state. */
const READY_REF = "/ws/inst-1";
const reviewInstanceReady: WorkflowInstance = {
  ...reviewInstance,
  runtimeContext: { state: "ready", ref: { kind: "worktree", locator: READY_REF } },
};

/**
 * Seed inst-1 as a ready review instance whose committed transcript carries a
 * MULTI-ENTRY `implement ↔ review` PASS path — so the derived gate projection's
 * `history` is non-empty AND ordered:
 *   [{implement,PASS,implementer}, {review,PASS,reviewer}, {implement,PASS,implementer}]
 * The three alternating PASS commits leave the instance back at `review`,
 * version 4 (round stays 1 — the gated-review template declares no advance),
 * a state consistent with the replay. Used by the wire-content lanes so a
 * history CONTENT **or ORDERING** regression can turn red (positions 0 and 1
 * carry distinct step/role, so any reordering that touches them is caught; a
 * single-entry history — a palindrome — would be blind to ordering).
 */
async function seedReviewWithHistory(store: StorePort): Promise<void> {
  await store.createInstance({
    ...baseInstance,
    runtimeContext: { state: "ready", ref: { kind: "worktree", locator: READY_REF } },
  });
  // The alternating path: implement→review→implement→review (PASS each), so the
  // committed replay is well-formed and lands at review.
  const path: readonly [string, string][] = [
    ["seed-1", "review"],
    ["seed-2", "implement"],
    ["seed-3", "review"],
  ];
  let version = 1;
  for (const [opId, newCurrentStep] of path) {
    const role = newCurrentStep === "review" ? "implementer" : "reviewer";
    const actorId = newCurrentStep === "review" ? "codex" : "claude";
    const seeded = await store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: version,
      envelope: {
        instanceId: "inst-1",
        opId,
        type: "PASS",
        actorId,
        expectedVersion: version,
        expectedRole: role,
        payload: { ref: "d" },
      },
      payloadDigest: `seed-digest-${opId}`,
      gateDecisions: [],
      newCurrentStep,
      newRound: 1,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
      issuedAgentConfig: {},
    });
    if (seeded.kind !== "committed") {
      throw new Error(`history seed failed at ${opId}: ${seeded.kind}`);
    }
    version += 1;
  }
}

/** An ok ProcessResult with the given exit code + stdout. */
function okResult(exitCode: number, logRef: string, stdout = ""): ProcessResult {
  return { kind: "ok", exitCode, stdout, logRef, durationMs: 3 };
}

function catalogOf(map: Readonly<Record<string, GateRegistration>>): GateCatalog {
  return {
    resolve: (uses) =>
      Object.prototype.hasOwnProperty.call(map, uses) ? (map[uses] ?? null) : null,
  };
}

/** Admit the gated template with `admitCatalog`, arm the kernel with
 * `kernelCatalog` (the two differ only for the drift/interplay lanes). */
async function setupGatedReview(opts: {
  pipeline: readonly GateBinding[];
  admitCatalog: GateCatalog;
  kernelCatalog: GateCatalog;
  diag?: DiagnosticsSink;
  store?: StorePort;
  instance?: WorkflowInstance;
  processRunner?: ProcessGateRunner;
  runtimeContext?: RuntimeContextSpec;
  /** GR6 (packet ch9-p4a): override the injected provider registry — the KC
   * integrity-negative lanes need unresolvable / facet-less / throwing
   * providers. Default: the scripted provider under `pairflow.worktree`. */
  providerRegistry?: ProviderRegistry;
}): Promise<{ kernel: Kernel; store: StorePort }> {
  const baseTemplate = gatedReviewTemplate(opts.pipeline);
  const template = opts.runtimeContext
    ? { ...baseTemplate, runtimeContext: opts.runtimeContext }
    : baseTemplate;
  const admitted = admitTemplate(template, opts.admitCatalog);
  if (!admitted.ok) {
    throw new Error(`gated setup admission failed: ${JSON.stringify(admitted.findings)}`);
  }
  const defs: DefinitionStore = { load: () => Promise.resolve(admitted.template) };
  let store = opts.store;
  if (store === undefined) {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(opts.instance ?? reviewInstance);
    store = handle.store;
  }
  const kernel = createKernel({
    // A provider registered under the spec's name so a provisioned-ref
    // instance's dispatch projection resolves (E2) AND the process-gate arm's
    // GR6 capability-based cwd resolution answers (TK1's facet); context-free
    // tests seed ready(∅) and never invoke it.
    providerRegistry:
      opts.providerRegistry ??
      createStaticProviderRegistry({
        "pairflow.worktree": createScriptedRuntimeContextProvider(),
      }),
    processRunner: opts.processRunner ?? createScriptedProcessGateRunner([]),
    store,
    definitions: defs,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    diag: opts.diag ?? noopDiagnosticsSink,
    gates: opts.kernelCatalog,
  });
  return { kernel, store };
}

/** A reviewer-claimed emit into inst-1 (the gated step is review). */
function reviewEmit(opId: string, type: string, expectedVersion: number, payload: unknown = { ref: "d" }): EventEnvelope {
  return { instanceId: "inst-1", opId, type, actorId: "claude", expectedVersion, expectedRole: "reviewer", payload };
}

describe("gate rung — dimension 1: placement grid (the rung never runs before its predecessors)", () => {
  it("a WRONG role on a gated transition → role_not_authorized AND zero evaluator calls", async () => {
    const log: string[] = [];
    const cat = catalogOf({ "g.rec": scriptedInline("g.rec", log, () => ({ verdict: "allow" })) });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.rec" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(
        await kernel.handle({ ...reviewEmit("wr1", "CONVERGED", 1), expectedRole: "implementer" }),
      ).toEqual({ kind: "rejected", reason: "role_not_authorized" });
    });
    expect(log).toEqual([]);
  });

  it("a NONEXISTENT event type on a gated step → no_transition, zero evaluator calls", async () => {
    const log: string[] = [];
    const cat = catalogOf({ "g.rec": scriptedInline("g.rec", log, () => ({ verdict: "allow" })) });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.rec" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(reviewEmit("nx1", "NOPE", 1))).toEqual({
        kind: "rejected",
        reason: "no_transition",
      });
    });
    expect(log).toEqual([]);
  });

  it("an UNGATED transition on a gated template commits with gateDecisions [] and zero evaluator calls", async () => {
    const log: string[] = [];
    const cat = catalogOf({ "g.rec": scriptedInline("g.rec", log, () => ({ verdict: "allow" })) });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.rec" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    // PASS on review is ungated (the gate is on CONVERGED).
    expect((await kernel.handle(reviewEmit("ug1", "PASS", 1))).kind).toBe("committed");
    const detail = await store.getInstanceDetail("inst-1");
    expect(gatesOf(detail?.transcript[0])).toEqual([]);
    expect(log).toEqual([]);
  });
});

describe("gate rung — dimension 2: ordered, first-block-wins combination lanes", () => {
  it("[block, recorder] → the second evaluator NEVER runs", async () => {
    const log: string[] = [];
    const cat = catalogOf({
      "g.block": scriptedInline("g.block", log, () => ({ verdict: "block", reason: "x" })),
      "g.rec": scriptedInline("g.rec", log, () => ({ verdict: "allow" })),
    });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.block" }, { uses: "g.rec" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(reviewEmit("c1", "CONVERGED", 1))).toEqual({
        kind: "rejected",
        reason: "gate_blocked",
        gate: "g.block",
        gateReason: "x",
      });
    });
    expect(log).toEqual(["g.block"]);
  });

  it("[allow, block] → the first ran exactly once, nothing committed", async () => {
    const log: string[] = [];
    const cat = catalogOf({
      "g.allow": scriptedInline("g.allow", log, () => ({ verdict: "allow" })),
      "g.block": scriptedInline("g.block", log, () => ({ verdict: "block", reason: "x" })),
    });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }, { uses: "g.block" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    // ch12-P0 G3 combination lane: the field names the BLOCKING (second)
    // binding — a "first binding's uses" implementation goes red here.
    expect(await kernel.handle(reviewEmit("c1", "CONVERGED", 1))).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.block",
      gateReason: "x",
    });
    expect(log).toEqual(["g.allow", "g.block"]);
    expect((await store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
  });

  it("[warn, block] → the block wins and the warn's retained decision is DISCARDED (no row appended)", async () => {
    // Order-sensitive (arm-gate-2 finding 1): the warn evaluator ran
    // FIRST, exactly once — a block-first evaluation order fails this.
    const log: string[] = [];
    const cat = catalogOf({
      "g.warn": scriptedInline("g.warn", log, () => ({ verdict: "warn", reason: "w" })),
      "g.block": scriptedInline("g.block", log, () => ({ verdict: "block", reason: "x" })),
    });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.warn" }, { uses: "g.block" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    expect((await kernel.handle(reviewEmit("c1", "CONVERGED", 1))).kind).toBe("rejected");
    expect(log).toEqual(["g.warn", "g.block"]);
    expect((await store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
  });

  it("[warn, allow] → commits with BOTH decisions retained in authored order", async () => {
    const cat = catalogOf({
      "g.warn": scriptedInline("g.warn", [], () => ({ verdict: "warn", reason: "w" })),
      "g.allow": scriptedInline("g.allow", [], () => ({ verdict: "allow" })),
    });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.warn" }, { uses: "g.allow" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    expect((await kernel.handle(reviewEmit("c1", "CONVERGED", 1))).kind).toBe("committed");
    const detail = await store.getInstanceDetail("inst-1");
    expect(gatesOf(detail?.transcript[0])).toEqual([
      { uses: "g.warn", verdict: "warn", reason: "w" },
      { uses: "g.allow", verdict: "allow" },
    ]);
  });
});

describe("gate rung — dimension 3: block-before-commit semantics", () => {
  it("a block leaves the FULL instance unchanged and appends no row", async () => {
    const cat = catalogOf({
      "g.block": scriptedInline("g.block", [], () => ({ verdict: "block", reason: "nope" })),
    });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.block" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(reviewEmit("x1", "CONVERGED", 1))).toEqual({
        kind: "rejected",
        reason: "gate_blocked",
        gate: "g.block",
        gateReason: "nope",
      });
    });
    expect((await store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
  });
});

describe("gate rung — dimension 4: fail-closed backstop lanes", () => {
  it("a DRIFTED kernel catalog (admitted, then vanished) → gate_evaluator_unavailable, zero evaluations, no commit", async () => {
    const log: string[] = [];
    const full = catalogOf({ "g.x": scriptedInline("g.x", log, () => ({ verdict: "allow" })) });
    const drifted = catalogOf({});
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.x" }],
      admitCatalog: full,
      kernelCatalog: drifted,
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(reviewEmit("d1", "CONVERGED", 1))).toEqual({
        kind: "rejected",
        reason: "gate_evaluator_unavailable",
      });
    });
    expect(log).toEqual([]);
  });

  it("THE reject→run flip (X1): a process-implementation registration now RUNS via the runner (no gate_execution_not_supported)", async () => {
    // The ONE declared golden edit (Claim 5). Formerly this lane rejected
    // `gate_execution_not_supported`; the model's reject→run flip retires it —
    // a process binding reached with a ready ref invokes the injected runner
    // and classifies its result (here: exit 0 → allow → commit).
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const runner = createScriptedProcessGateRunner([okResult(0, "ev-1")]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstanceReady);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    const outcome = await kernel.handle(reviewEmit("pr1", "CONVERGED", 1));
    expect(outcome.kind).toBe("committed");
    expect(runner.calls).toHaveLength(1);
    // The retained allow decision rides the committed entry (reason + refs).
    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(gatesOf(detail?.transcript[0])).toEqual([
      { uses: "g.proc", verdict: "allow", reason: "sys:exit_zero", evidenceRefs: ["ev-1"] },
    ]);
  });

  it("order-interplay: [valid-allow, unresolvable] → the first EVALUATES once, the second rejects gate_evaluator_unavailable", async () => {
    const log: string[] = [];
    const allow = scriptedInline("g.allow", log, () => ({ verdict: "allow" }));
    const admitCat = catalogOf({
      "g.allow": allow,
      "g.miss": scriptedInline("g.miss", log, () => ({ verdict: "allow" })),
    });
    const kernelCat = catalogOf({ "g.allow": allow });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }, { uses: "g.miss" }],
      admitCatalog: admitCat,
      kernelCatalog: kernelCat,
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(reviewEmit("o1", "CONVERGED", 1))).toEqual({
        kind: "rejected",
        reason: "gate_evaluator_unavailable",
      });
    });
    expect(log).toEqual(["g.allow"]);
  });

  it("pre-read discipline: [unresolvable, …] over a throwing/counting store → the backstop rejection with ZERO read attempts", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstance);
    let reads = 0;
    const hostile: StorePort = {
      ...handle.store,
      getTimeline: () => {
        reads += 1;
        return Promise.reject(new Error("read boom"));
      },
    };
    const admitCat = catalogOf({
      "g.miss": scriptedInline("g.miss", [], () => ({ verdict: "allow" })),
      "g.allow": scriptedInline("g.allow", [], () => ({ verdict: "allow" })),
    });
    const kernelCat = catalogOf({ "g.allow": scriptedInline("g.allow", [], () => ({ verdict: "allow" })) });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.miss" }, { uses: "g.allow" }],
      admitCatalog: admitCat,
      kernelCatalog: kernelCat,
      store: hostile,
    });
    expect(await kernel.handle(reviewEmit("p1", "CONVERGED", 1))).toEqual({
      kind: "rejected",
      reason: "gate_evaluator_unavailable",
    });
    expect(reads).toBe(0);
  });
});

describe("gate rung — dimension 6: retained-decision fidelity", () => {
  it("a warn with ALL optional fields round-trips byte-equal through commit → BOTH read surfaces; [] on ungated rows", async () => {
    const warn = (): GateDecision => ({
      verdict: "warn",
      reason: "needs-followup",
      message: "minor",
      evidenceRefs: ["ev-1", "ev-2"],
    });
    const cat = catalogOf({ "g.warn": scriptedInline("g.warn", [], warn) });
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstance);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.warn" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
    });
    // Two ungated commits precede the gated one (proves decisions land
    // ONLY on their own row).
    expect((await kernel.handle(reviewEmit("w1", "PASS", 1))).kind).toBe("committed");
    expect((await kernel.handle(envelope("w2", "PASS", 2, { ref: "d" }, "implementer"))).kind).toBe(
      "committed",
    );
    expect((await kernel.handle(reviewEmit("w3", "CONVERGED", 3))).kind).toBe("committed");

    const detail = await handle.store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((r) => asTransition(r).gateDecisions)).toEqual([
      [],
      [],
      [
        {
          uses: "g.warn",
          verdict: "warn",
          reason: "needs-followup",
          message: "minor",
          evidenceRefs: ["ev-1", "ev-2"],
        },
      ],
    ]);
    // The one shared row mapper: getTimeline deep-equals the detail read.
    expect(await handle.store.getTimeline("inst-1", 0)).toEqual(detail?.transcript);
  });
});

describe("gate rung — dimension 9: gate_blocked outcome pass-through (both iff halves)", () => {
  it("surfaces gateReason + evidenceRefs by VALUE", async () => {
    const cat = catalogOf({
      "g.b": scriptedInline("g.b", [], () => ({ verdict: "block", reason: "why", evidenceRefs: ["r1", "r2"] })),
    });
    const { kernel } = await setupGatedReview({ pipeline: [{ uses: "g.b" }], admitCatalog: cat, kernelCatalog: cat });
    expect(await kernel.handle(reviewEmit("b1", "CONVERGED", 1))).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.b",
      gateReason: "why",
      evidenceRefs: ["r1", "r2"],
    });
  });

  it("absence half: a reasonless block yields NO gateReason key and NO evidenceRefs key", async () => {
    const cat = catalogOf({ "g.b": scriptedInline("g.b", [], () => ({ verdict: "block" })) });
    const { kernel } = await setupGatedReview({ pipeline: [{ uses: "g.b" }], admitCatalog: cat, kernelCatalog: cat });
    const outcome = await kernel.handle(reviewEmit("b1", "CONVERGED", 1));
    expect(outcome).toEqual({ kind: "rejected", reason: "gate_blocked", gate: "g.b" });
    expect("gateReason" in outcome).toBe(false);
    expect("evidenceRefs" in outcome).toBe(false);
  });

  it("absence half: a refs-less block yields NO evidenceRefs key but carries gateReason", async () => {
    const cat = catalogOf({ "g.b": scriptedInline("g.b", [], () => ({ verdict: "block", reason: "why" })) });
    const { kernel } = await setupGatedReview({ pipeline: [{ uses: "g.b" }], admitCatalog: cat, kernelCatalog: cat });
    const outcome = await kernel.handle(reviewEmit("b1", "CONVERGED", 1));
    expect(outcome).toEqual({ kind: "rejected", reason: "gate_blocked", gate: "g.b", gateReason: "why" });
    expect("evidenceRefs" in outcome).toBe(false);
  });

  it("an explicit-[] refs block rides an empty list verbatim (evidenceRefs: [])", async () => {
    const cat = catalogOf({
      "g.b": scriptedInline("g.b", [], () => ({ verdict: "block", reason: "why", evidenceRefs: [] })),
    });
    const { kernel } = await setupGatedReview({ pipeline: [{ uses: "g.b" }], admitCatalog: cat, kernelCatalog: cat });
    expect(await kernel.handle(reviewEmit("b1", "CONVERGED", 1))).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.b",
      gateReason: "why",
      evidenceRefs: [],
    });
  });

  it("the TYPE forbids gate/gateReason/evidenceRefs on non-gate reasons (each probe otherwise well-typed)", () => {
    // @ts-expect-error — a non-gate reason cannot carry gateReason (O1 exclusion)
    const p1: Outcome = { kind: "rejected", reason: "not_active", gateReason: "x" };
    // @ts-expect-error — a non-gate reason cannot carry evidenceRefs (O1 exclusion)
    const p2: Outcome = { kind: "rejected", reason: "no_transition", evidenceRefs: ["r"] };
    // @ts-expect-error — a non-gate reason cannot carry gate (ch12-P0 G8a exclusion)
    const p3: Outcome = { kind: "rejected", reason: "not_active", gate: "g.x" };
    void p1;
    void p2;
    void p3;
    expect(true).toBe(true);
  });

  it("the TYPE requires gate on the gate_blocked arm — readonly, exactly string (ch12-P0 G8b-d)", () => {
    // G8(b) requiredness — a gate-less gate_blocked literal is a compile
    // error; were the arm weakened to `gate?`, this directive goes UNUSED
    // and tsc reds (TS2578) — the runtime lanes cannot catch that mutant.
    // @ts-expect-error — the gate_blocked arm REQUIRES gate
    const p4: Outcome = { kind: "rejected", reason: "gate_blocked" };
    void p4;
    const blocked: Outcome = { kind: "rejected", reason: "gate_blocked", gate: "g.b" };
    if (blocked.kind === "rejected" && blocked.reason === "gate_blocked") {
      // G8(c) value type — exactly `string`: reds if the field widens to
      // `unknown` or admits `undefined`.
      const v: string = blocked.gate;
      void v;
      // G8(d) immutability — assignment to the readonly field is TS2540;
      // a mutable slip leaves this directive unused, tsc red.
      // @ts-expect-error — gate is readonly
      blocked.gate = "g.other";
    }
    expect(true).toBe(true);
  });
});

describe("gate rung — dimension 10: confinement", () => {
  it("counting store: an UNGATED emit performs ZERO gated-path reads", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstance);
    let reads = 0;
    const counting: StorePort = {
      ...handle.store,
      getTimeline: (id, after) => {
        reads += 1;
        return handle.store.getTimeline(id, after);
      },
    };
    const cat = catalogOf({ "g.allow": scriptedInline("g.allow", [], () => ({ verdict: "allow" })) });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: counting,
    });
    expect((await kernel.handle(reviewEmit("ug1", "PASS", 1))).kind).toBe("committed");
    expect(reads).toBe(0);
  });

  it("a gate rejection emits the EXISTING rejected diag keyset — registry name only, no gate reason/refs", async () => {
    const rec = createRecordingDiagnosticsSink();
    const cat = catalogOf({
      "g.b": scriptedInline("g.b", [], () => ({ verdict: "block", reason: "why", evidenceRefs: ["r1"] })),
    });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.b" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      diag: rec.sink,
    });
    await kernel.handle(reviewEmit("b1", "CONVERGED", 1));
    expect(rec.events).toHaveLength(1);
    const event = rec.events[0];
    expect(event).toMatchObject({ source: "kernel", kind: "rejected", reason: "gate_blocked" });
    // EXACT keyset (arm-gate-2 finding 3): the existing rejected-event
    // contract, nothing more — ANY new diag field fails, not just the
    // two gate-payload names.
    expect(Object.keys(event ?? {}).sort()).toEqual([
      "actorId",
      "instanceId",
      "kind",
      "opId",
      "payloadDigest",
      "reason",
      "source",
      "type",
    ]);
  });
});

describe("gate rung — dimension 11: the packaged evaluator's first-arrival block e2e", () => {
  it("pairflow.previous_reviewer_verdict blocks on empty history at the start step (sys:no_previous_verdict)", async () => {
    const realCat = createGateRegistry();
    const gatedStart: WorkflowTemplate = {
      ...template,
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          gates: { PASS: [{ uses: "pairflow.previous_reviewer_verdict", config: { required: true } }] },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { PASS: "implement", CONVERGED: "done" },
        },
      },
    };
    const admitted = admitTemplate(gatedStart, realCat);
    if (!admitted.ok) {
      throw new Error(`dim11 admission failed: ${JSON.stringify(admitted.findings)}`);
    }
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(baseInstance);
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: { load: () => Promise.resolve(admitted.template) },
      time: createControlledClock(0),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates: realCat,
    });
    await expectNoStateChange(handle.store, "inst-1", async () => {
      expect(await kernel.handle(envelope("f1", "PASS", 1, { ref: "d" }, "implementer"))).toEqual({
        kind: "rejected",
        reason: "gate_blocked",
        gate: "pairflow.previous_reviewer_verdict",
        gateReason: "sys:no_previous_verdict",
      });
    });
  });
});

describe("gate rung — dimension 12: CAS-restart re-derives the projection per attempt", () => {
  it("one forced conflict → the projection read fires per attempt, decisions from FRESH state", async () => {
    let reads = 0;
    let commits = 0;
    // The two attempts see DIFFERENT committed histories: [] first,
    // one committed PASS row second (the concurrent commit the CAS
    // conflict models). The evaluator RECORDS what it saw per call
    // (arm-gate-2 finding 2): a cross-attempt cache of the read OR of
    // the decision would surface as a repeated history length.
    const seedEntry = {
      entryKind: "transition" as const,
      seq: 1,
      envelope: envelope("seed-1", "PASS", 1, undefined, "implementer"),
      payloadDigest: "seed-digest",
      committedAt: 0,
      gateDecisions: [],
      issuedAgentConfig: {},
    };
    const store: StorePort = {
      loadInstance: () => Promise.resolve(reviewInstance),
      findOp: () => Promise.resolve(null),
      createInstance: () => Promise.reject(new Error("unused")),
      commitLifecycle: () => Promise.reject(new Error("unused")),
      listInstances: () => Promise.reject(new Error("unused")),
      getInstanceDetail: () => Promise.reject(new Error("unused")),
      getTimeline: () => {
        reads += 1;
        return Promise.resolve(reads === 1 ? [] : [seedEntry]);
      },
      commitTransition: () => {
        commits += 1;
        return Promise.resolve(commits === 1 ? { kind: "cas_conflict" } : { kind: "committed", version: 2 });
      },
    };
    const seenHistoryLengths: number[] = [];
    const evalLog: string[] = [];
    const cat = catalogOf({
      "g.allow": scriptedInline("g.allow", evalLog, (projection) => {
        seenHistoryLengths.push(projection.history.length);
        return { verdict: "allow" };
      }),
    });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store,
    });
    expect((await kernel.handle(reviewEmit("c1", "CONVERGED", 1))).kind).toBe("committed");
    // A cached cross-attempt projection would read ONCE — the rung re-derives.
    expect(reads).toBe(2);
    expect(commits).toBe(2);
    // The evaluator ran per attempt AND each run saw ITS attempt's
    // committed state — a cached decision or projection fails here.
    expect(evalLog).toEqual(["g.allow", "g.allow"]);
    expect(seenHistoryLengths).toEqual([0, 1]);
  });
});

describe("gate rung — the grid hostile-store lanes (integrity throws, not rejections)", () => {
  function baseHostile(overrides: Partial<StorePort>): StorePort {
    return {
      loadInstance: () => Promise.resolve(reviewInstance),
      findOp: () => Promise.resolve(null),
      createInstance: () => Promise.reject(new Error("unused")),
      commitLifecycle: () => Promise.reject(new Error("unused")),
      listInstances: () => Promise.reject(new Error("unused")),
      getInstanceDetail: () => Promise.reject(new Error("unused")),
      getTimeline: () => Promise.reject(new Error("unused")),
      commitTransition: () => Promise.reject(new Error("unused")),
      ...overrides,
    };
  }

  it("a rejecting projection read → internal_failure diag + rethrow (never a rejection)", async () => {
    const rec = createRecordingDiagnosticsSink();
    const boom = new Error("read boom");
    const store = baseHostile({ getTimeline: () => Promise.reject(boom) });
    const cat = catalogOf({ "g.allow": scriptedInline("g.allow", [], () => ({ verdict: "allow" })) });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store,
      diag: rec.sink,
    });
    await expect(kernel.handle(reviewEmit("h1", "CONVERGED", 1))).rejects.toBe(boom);
    expect(rec.events.some((e) => e.kind === "internal_failure")).toBe(true);
  });

  it("a null projection read (instance vanished) → a kernel-integrity throw", async () => {
    const store = baseHostile({ getTimeline: () => Promise.resolve(null) });
    const cat = catalogOf({ "g.allow": scriptedInline("g.allow", [], () => ({ verdict: "allow" })) });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store,
    });
    await expect(kernel.handle(reviewEmit("h2", "CONVERGED", 1))).rejects.toThrow(/kernel integrity/);
  });

  it("a throwing evaluator → internal_failure diag + rethrow, nothing committed", async () => {
    const rec = createRecordingDiagnosticsSink();
    const boom = new Error("evaluate boom");
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstance);
    const cat = catalogOf({
      "g.throw": scriptedInline("g.throw", [], () => {
        throw boom;
      }),
    });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.throw" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      diag: rec.sink,
    });
    await expect(kernel.handle(reviewEmit("h3", "CONVERGED", 1))).rejects.toBe(boom);
    expect((await handle.store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
    expect(rec.events.some((e) => e.kind === "internal_failure")).toBe(true);
  });
});

// ── ch11-P3b: the HANDLE process branch (S5/X1/X2/M1/E1) ─────────────

describe("gate rung — the C36 runtime backstop plane (S5, dimension 3, both directions)", () => {
  it("process binding × ready(∅) runtime context → C36 reject, ZERO runner calls, ZERO records, no commit", async () => {
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const runner = createScriptedProcessGateRunner([okResult(0, "ev-unused")]);
    // reviewInstance carries runtimeContext ready(∅) (ref null) — the X2 reject lane.
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(reviewEmit("bs1", "CONVERGED", 1))).toEqual({
        kind: "rejected",
        reason: "runtime_context_required_for_process_gate",
      });
    });
    expect(runner.calls).toEqual([]);
    expect(runner.records).toEqual([]);
  });

  it("process binding × NON-READY runtime context (state 'requested') → the C36 backstop's non-ready lane: reject, ZERO runner calls, ZERO records, no commit", async () => {
    // The ready(∅) sibling above pins `ref === null`; THIS lane pins the
    // `state !== "ready"` half of the backstop (a drifted non-ready state
    // reaching a process gate) — packet ch9-p4a KC family.
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const runner = createScriptedProcessGateRunner([okResult(0, "ev-unused")]);
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
      instance: {
        ...reviewInstance,
        runtimeContext: { state: "requested", requestId: "req-bs5" },
      },
    });
    await expectNoStateChange(store, "inst-1", async () => {
      expect(await kernel.handle(reviewEmit("bs5", "CONVERGED", 1))).toEqual({
        kind: "rejected",
        reason: "runtime_context_required_for_process_gate",
      });
    });
    expect(runner.calls).toEqual([]);
    expect(runner.records).toEqual([]);
  });

  it("process-FIRST form: the backstop precedes the FIRST projection read (ZERO reads)", async () => {
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const runner = createScriptedProcessGateRunner([]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstance); // null ctx
    let reads = 0;
    const counting: StorePort = {
      ...handle.store,
      getTimeline: (id, after) => {
        reads += 1;
        return handle.store.getTimeline(id, after);
      },
    };
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: counting,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    expect(await kernel.handle(reviewEmit("bs2", "CONVERGED", 1))).toEqual({
      kind: "rejected",
      reason: "runtime_context_required_for_process_gate",
    });
    expect(reads).toBe(0);
    expect(runner.calls).toEqual([]);
  });

  it("mixed pipeline [inline-allow, process] × null: the EARLIER inline read the snapshot, the reject STILL fires pre-run", async () => {
    const evalLog: string[] = [];
    const cat = catalogOf({
      "g.allow": scriptedInline("g.allow", evalLog, () => ({ verdict: "allow" })),
      "g.proc": processRegWith(exitCodeEffective),
    });
    const runner = createScriptedProcessGateRunner([]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstance); // null ctx
    let reads = 0;
    const counting: StorePort = {
      ...handle.store,
      getTimeline: (id, after) => {
        reads += 1;
        return handle.store.getTimeline(id, after);
      },
    };
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }, { uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: counting,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    expect(await kernel.handle(reviewEmit("bs3", "CONVERGED", 1))).toEqual({
      kind: "rejected",
      reason: "runtime_context_required_for_process_gate",
    });
    // The earlier inline evaluate already read the ONE shared snapshot; the
    // process arm's backstop still fires without invoking the runner.
    expect(evalLog).toEqual(["g.allow"]);
    expect(reads).toBe(1);
    expect(runner.calls).toEqual([]);
  });

  it("inline-only pipeline × null runtime context → evaluates NORMALLY (the backstop is process-scoped)", async () => {
    const cat = catalogOf({ "g.allow": scriptedInline("g.allow", [], () => ({ verdict: "allow" })) });
    const { kernel, store } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }],
      admitCatalog: cat,
      kernelCatalog: cat,
    });
    expect((await kernel.handle(reviewEmit("bs4", "CONVERGED", 1))).kind).toBe("committed");
    void store;
  });
});

// ── ch9-P4a (GR6/TK1): the capability-based cwd resolution at the process
//    arm — the X2 string-locator read RETIRED; the H1 mechanism (requirement →
//    registry → LocalExecutionCapability value-shape check) resolves cwd. The
//    C36 backstop AHEAD of it is byte-untouched (the describe above is the pin).
describe("gate rung — GR6 capability-based cwd resolution (packet ch9-p4a; KC family)", () => {
  /** The ch9-P2 worktree-shaped OBJECT locator (C10) — under the retired X2
   * string read this ref landed a kernel-integrity throw (the F5 live seam
   * defect); under GR6 the provider's OWN facet answers. */
  const OBJECT_REF: RuntimeContextRef = {
    kind: "worktree",
    locator: { path: "/ws/minted/wt-1", branch: "b", repo: "/repo", base_commit: "c0" },
  };

  /** A minimal LOCAL provider answering the facet from its own minted
   * `locator.path` (the worktree provider's shape, fixture grain). */
  function objectLocatorProvider(): RuntimeContextProvider {
    const provider: RuntimeContextProvider & {
      resolveLocalWorkingDirectory(ref: RuntimeContextRef): string;
    } = {
      provision: () => Promise.resolve(),
      projectForActor: (ref) =>
        ({
          workspace: (ref.locator as { path: string }).path,
        }) as unknown as RuntimeContextProjection,
      resolveLocalWorkingDirectory: (ref) => (ref.locator as { path: string }).path,
    };
    return provider;
  }

  /** A provider WITHOUT the facet (a non-local provider claiming nothing). */
  function facetlessProvider(): RuntimeContextProvider {
    return {
      provision: () => Promise.resolve(),
      projectForActor: () => ({ workspace: "opaque" }) as unknown as RuntimeContextProjection,
    };
  }

  /** A provider whose facet THROWS (D6's config-integrity lane). */
  function throwingFacetProvider(): RuntimeContextProvider {
    const provider: RuntimeContextProvider & {
      resolveLocalWorkingDirectory(ref: RuntimeContextRef): string;
    } = {
      provision: () => Promise.resolve(),
      projectForActor: () => ({ workspace: "opaque" }) as unknown as RuntimeContextProjection,
      resolveLocalWorkingDirectory: () => {
        throw new Error("scripted facet resolution failure");
      },
    };
    return provider;
  }

  async function runWithProvider(
    provider: RuntimeContextProvider | null,
  ): Promise<{ outcome: Promise<Outcome>; runner: ReturnType<typeof createScriptedProcessGateRunner>; store: StorePort }> {
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const runner = createScriptedProcessGateRunner([okResult(0, "kc-ev")]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance({
      ...reviewInstance,
      runtimeContext: { state: "ready", ref: OBJECT_REF },
    });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
      providerRegistry: createStaticProviderRegistry(
        provider === null ? {} : { "pairflow.worktree": provider },
      ),
    });
    return { outcome: kernel.handle(reviewEmit("kc1", "CONVERGED", 1)), runner, store: handle.store };
  }

  it("a worktree-shaped OBJECT-locator ready ref resolves cwd THROUGH the capability — the runner receives the provider-minted path BYTE-EQUAL", async () => {
    const { outcome, runner } = await runWithProvider(objectLocatorProvider());
    expect((await outcome).kind).toBe("committed");
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]?.cwd).toBe("/ws/minted/wt-1");
  });

  it("integrity negative 1: an UNRESOLVABLE provider → kernel-integrity throw, pre-commit, no state, ZERO runner calls", async () => {
    const { outcome, runner, store } = await runWithProvider(null);
    await expect(outcome).rejects.toThrow(/integrity/);
    expect(runner.calls).toEqual([]);
    expect((await store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
  });

  it("integrity negative 2: a FACET-LESS provider (no LocalExecutionCapability) → kernel-integrity throw, no state, zero runner calls", async () => {
    const { outcome, runner, store } = await runWithProvider(facetlessProvider());
    await expect(outcome).rejects.toThrow(/integrity/);
    expect(runner.calls).toEqual([]);
    expect((await store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
  });

  it("integrity negative 3: a THROWING resolution propagates (D6's fail-closed lane), no state, zero runner calls", async () => {
    const { outcome, runner, store } = await runWithProvider(throwingFacetProvider());
    await expect(outcome).rejects.toThrow(/scripted facet resolution failure/);
    expect(runner.calls).toEqual([]);
    expect((await store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
  });

  it("the string-locator scripted world keeps working through TK1's facet (the ch11/ch12 process-gate suites' composition)", async () => {
    // The default setupGatedReview registry (the scripted provider) + a
    // string-locator ready ref: GR6 resolves the SAME verbatim value the
    // retired X2 read produced — the E2 confinement lanes above stay the pin.
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const runner = createScriptedProcessGateRunner([okResult(0, "kc-str")]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstanceReady);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    expect((await kernel.handle(reviewEmit("kc2", "CONVERGED", 1))).kind).toBe("committed");
    expect(runner.calls[0]?.cwd).toBe(READY_REF);
  });
});

describe("gate rung — the six-outcome family end-to-end (M1, full-decision equality)", () => {
  async function runProcess(
    effective: EffectiveProcessConfig,
    result: ProcessResult,
  ): Promise<{ outcome: Outcome; runner: ReturnType<typeof createScriptedProcessGateRunner>; store: StorePort }> {
    const cat = catalogOf({ "g.proc": processRegWith(effective) });
    const runner = createScriptedProcessGateRunner([result]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstanceReady);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    const outcome = await kernel.handle(reviewEmit("p1", "CONVERGED", 1));
    return { outcome, runner, store: handle.store };
  }

  async function retained(store: StorePort): Promise<unknown> {
    const detail = await store.getInstanceDetail("inst-1");
    return gatesOf(detail?.transcript[0]);
  }

  it("ok/exit 0 → allow → commit; retained decision carries reason=sys:exit_zero + [logRef]", async () => {
    const { outcome, runner, store } = await runProcess(exitCodeEffective, okResult(0, "e0"));
    expect(outcome.kind).toBe("committed");
    expect(runner.calls).toHaveLength(1);
    expect(await retained(store)).toEqual([
      { uses: "g.proc", verdict: "allow", reason: "sys:exit_zero", evidenceRefs: ["e0"] },
    ]);
  });

  it("ok/exit nonzero → block(test_failed) → Rejected with [logRef], no commit", async () => {
    const { outcome, store } = await runProcess(exitCodeEffective, okResult(1, "e1"));
    expect(outcome).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.proc",
      gateReason: "test_failed",
      evidenceRefs: ["e1"],
    });
    expect((await store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
  });

  it("ok/exit nonzero warn bucket → warn → commit (warn-lane member)", async () => {
    const warnEffective: EffectiveProcessConfig = {
      ...exitCodeEffective,
      onExit: { zero: "allow", nonzero: "warn" },
      reason: { zero: "sys:exit_zero", nonzero: "flaky" },
    };
    const { outcome, store } = await runProcess(warnEffective, okResult(2, "e2"));
    expect(outcome.kind).toBe("committed");
    expect(await retained(store)).toEqual([
      { uses: "g.proc", verdict: "warn", reason: "flaky", evidenceRefs: ["e2"] },
    ]);
  });

  it("timeout → block(sys:timeout) → Rejected with [logRef]", async () => {
    const { outcome } = await runProcess(exitCodeEffective, {
      kind: "timeout",
      logRef: "t1",
      durationMs: 1000,
    });
    expect(outcome).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.proc",
      gateReason: "sys:timeout",
      evidenceRefs: ["t1"],
    });
  });

  it("runner_error → block(sys:runner_error) → Rejected with [logRef], DISTINCT from test_failed", async () => {
    const { outcome } = await runProcess(exitCodeEffective, {
      kind: "runner_error",
      logRef: "r1",
      durationMs: 0,
    });
    expect(outcome).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.proc",
      gateReason: "sys:runner_error",
      evidenceRefs: ["r1"],
    });
  });

  it("ok/JSON allow → commit; logRef appended to the returned refs (E1 append)", async () => {
    const { outcome, store } = await runProcess(
      jsonEffective,
      okResult(0, "j1", JSON.stringify({ verdict: "allow", evidence_refs: ["author-ref"] })),
    );
    expect(outcome.kind).toBe("committed");
    expect(await retained(store)).toEqual([
      { uses: "g.proc", verdict: "allow", evidenceRefs: ["author-ref", "j1"] },
    ]);
  });

  it("ok/JSON block → Rejected(gate_blocked) with the process reason + refs verbatim + logRef", async () => {
    const { outcome } = await runProcess(
      jsonEffective,
      okResult(0, "j2", JSON.stringify({ verdict: "block", reason: "policy_x", evidence_refs: ["a"] })),
    );
    expect(outcome).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.proc",
      gateReason: "policy_x",
      evidenceRefs: ["a", "j2"],
    });
  });

  it("ok/JSON-malformed → block(sys:malformed_gate_decision_json), NEVER a business block", async () => {
    const { outcome } = await runProcess(jsonEffective, okResult(0, "j3", "not json at all"));
    expect(outcome).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.proc",
      gateReason: "sys:malformed_gate_decision_json",
      evidenceRefs: ["j3"],
    });
  });
});

describe("gate rung — E2 confinement: hostile opaque values retained VERBATIM end-to-end", () => {
  // The confinement roster (E2): the runtimeContext ref (kernel-opaque, cwd-only)
  // and the process-returned reason/message/evidence_refs (untrusted-confined)
  // are NEVER trimmed / normalized / canonicalized — any such regression is red.
  async function runProcessWithCtx(
    effective: EffectiveProcessConfig,
    result: ProcessResult,
    runtimeContextRef: string,
  ): Promise<{
    outcome: Outcome;
    runner: ReturnType<typeof createScriptedProcessGateRunner>;
    store: StorePort;
  }> {
    const cat = catalogOf({ "g.proc": processRegWith(effective) });
    const runner = createScriptedProcessGateRunner([result]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance({
      ...reviewInstance,
      runtimeContext: { state: "ready", ref: { kind: "worktree", locator: runtimeContextRef } },
    });
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    const outcome = await kernel.handle(reviewEmit("e2", "CONVERGED", 1));
    return { outcome, runner, store: handle.store };
  }

  it("a runtimeContext ref with leading/trailing whitespace + path-like content reaches cwd VERBATIM", async () => {
    const hostile = "  ../x  ";
    const { runner } = await runProcessWithCtx(exitCodeEffective, okResult(0, "e0"), hostile);
    // Exact — untrimmed, un-normalized, un-canonicalized.
    expect(runner.calls[0]?.cwd).toBe(hostile);
  });

  it("a second path-like ref ('/ws/../etc') also reaches cwd verbatim (no path canonicalization)", async () => {
    const hostile = "/ws/../etc";
    const { runner } = await runProcessWithCtx(exitCodeEffective, okResult(0, "e0b"), hostile);
    expect(runner.calls[0]?.cwd).toBe(hostile);
  });

  it("an ALLOW decision's hostile reason/message/evidence_refs are RETAINED verbatim on the committed entry", async () => {
    const hostileReason = "  ../reason  ";
    const hostileMessage = "  /ws/../etc message  ";
    const hostileRefs = ["  ../ref-a  ", "/ws/../ref-b"];
    const stdout = JSON.stringify({
      verdict: "allow",
      reason: hostileReason,
      message: hostileMessage,
      evidence_refs: hostileRefs,
    });
    const { outcome, store } = await runProcessWithCtx(
      jsonEffective,
      okResult(0, "log-ref", stdout),
      READY_REF,
    );
    expect(outcome.kind).toBe("committed");
    const detail = await store.getInstanceDetail("inst-1");
    expect(gatesOf(detail?.transcript[0])).toEqual([
      {
        uses: "g.proc",
        verdict: "allow",
        reason: hostileReason,
        message: hostileMessage,
        evidenceRefs: [...hostileRefs, "log-ref"],
      },
    ]);
  });

  it("a BLOCK decision's hostile reason + evidence_refs surface verbatim on the Rejected outcome", async () => {
    const hostileReason = "  ../blocked  ";
    const hostileRefs = ["  /ws/../evidence  "];
    const stdout = JSON.stringify({
      verdict: "block",
      reason: hostileReason,
      evidence_refs: hostileRefs,
    });
    const { outcome } = await runProcessWithCtx(
      jsonEffective,
      okResult(0, "log-blk", stdout),
      READY_REF,
    );
    expect(outcome).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "g.proc",
      gateReason: hostileReason,
      evidenceRefs: [...hostileRefs, "log-blk"],
    });
  });
});

describe("gate rung — process ordering + one-snapshot (X2, dimension 8)", () => {
  it("inline block BEFORE a process gate → the runner is NEVER called and NO record exists", async () => {
    const cat = catalogOf({
      "g.block": scriptedInline("g.block", [], () => ({ verdict: "block", reason: "stop" })),
      "g.proc": processRegWith(exitCodeEffective),
    });
    const runner = createScriptedProcessGateRunner([okResult(0, "never")]);
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstanceReady);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.block" }, { uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    expect((await kernel.handle(reviewEmit("o1", "CONVERGED", 1))).kind).toBe("rejected");
    expect(runner.calls).toEqual([]);
    expect(runner.records).toEqual([]);
  });

  it("process block FIRST → later gates are NOT evaluated", async () => {
    const evalLog: string[] = [];
    const cat = catalogOf({
      "g.proc": processRegWith(exitCodeEffective),
      "g.after": scriptedInline("g.after", evalLog, () => ({ verdict: "allow" })),
    });
    const runner = createScriptedProcessGateRunner([okResult(1, "blk")]); // exit1 → block
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstanceReady);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }, { uses: "g.after" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    expect((await kernel.handle(reviewEmit("o2", "CONVERGED", 1))).kind).toBe("rejected");
    expect(runner.calls).toHaveLength(1);
    expect(evalLog).toEqual([]); // g.after never ran
  });

  it("one-snapshot: the wire projection DEEP-EQUALS the inline evaluator's input in a mixed pipeline", async () => {
    let seenProjection: GateProjection | undefined;
    const cat = catalogOf({
      "g.allow": scriptedInline("g.allow", [], (projection) => {
        seenProjection = projection;
        return { verdict: "allow" };
      }),
      "g.proc": processRegWith(exitCodeEffective),
    });
    const runner = createScriptedProcessGateRunner([okResult(0, "e0")]);
    const handle = openStore(":memory:", createControlledClock(0));
    // NON-EMPTY committed history (implement→review PASS) so a history-content
    // or ordering regression in the shared snapshot turns red.
    await seedReviewWithHistory(handle.store);
    let reads = 0;
    const counting: StorePort = {
      ...handle.store,
      getTimeline: (id, after) => {
        reads += 1;
        return handle.store.getTimeline(id, after);
      },
    };
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.allow" }, { uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: counting,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    expect((await kernel.handle(reviewEmit("o3", "CONVERGED", 4))).kind).toBe("committed");
    expect(reads).toBe(1); // ONE shared snapshot
    // The inline evaluator's input carries the MULTI-ENTRY history — the whole
    // snapshot, order included.
    const seen = seenProjection;
    expect(seen?.history).toEqual([
      { stepId: "implement", eventType: "PASS", role: "implementer" },
      { stepId: "review", eventType: "PASS", role: "reviewer" },
      { stepId: "implement", eventType: "PASS", role: "implementer" },
    ]);
    // The recorded stdin's projection is the pure snake_case rename of that SAME
    // domain projection — deep-equal as a whole (a per-field drift OR a history
    // reordering turns this red).
    const wire = JSON.parse(runner.calls[0]?.stdin ?? "{}") as {
      projection: GateInvocationProjection;
    };
    expect(wire.projection).toEqual({
      round: seen?.round,
      current_step: seen?.currentStep,
      event_type: seen?.eventType,
      history: (seen?.history ?? []).map((entry) => ({
        step_id: entry.stepId,
        event_type: entry.eventType,
        role: entry.role,
      })),
    });
  });

  it("EXACTLY ONE runner call per binding per attempt; the FULL invocation document (X3/X4 deep-equal)", async () => {
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const runner = createScriptedProcessGateRunner([okResult(0, "e0")]);
    const handle = openStore(":memory:", createControlledClock(0));
    // Seed a committed implement→review PASS so the projection history is
    // NON-EMPTY (the instance is now at review, version 2).
    await seedReviewWithHistory(handle.store);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: runner,
      runtimeContext: KERNEL_WORKTREE_SPEC,
    });
    await kernel.handle(reviewEmit("x1", "CONVERGED", 4));
    expect(runner.calls).toHaveLength(1);
    const call = runner.calls[0];
    expect(call?.command).toBe("run the checks");
    expect(call?.cwd).toBe(READY_REF);
    expect(call?.timeoutMs).toBe(1000);
    // FULL-document equality: parse the recorded stdin and deep-equal the ENTIRE
    // GateInvocation — `template_ref` and the COMPLETE projection (a MULTI-ENTRY
    // `history` whose entry `step_id`/`event_type`/`role` AND order are pinned)
    // included — so a keyset, config-verbatim, template_ref, or history-content/
    // ordering regression each turns red.
    const invocation = JSON.parse(call?.stdin ?? "{}") as unknown;
    expect(invocation).toEqual({
      instance_id: "inst-1",
      template_ref: { id: "local-pair-v0", version: 1 },
      step_id: "review",
      event_type: "CONVERGED",
      expected_version: 4,
      config: exitCodeEffective,
      projection: {
        round: 1,
        current_step: "review",
        event_type: "CONVERGED",
        history: [
          { step_id: "implement", event_type: "PASS", role: "implementer" },
          { step_id: "review", event_type: "PASS", role: "reviewer" },
          { step_id: "implement", event_type: "PASS", role: "implementer" },
        ],
      },
    });
  });

  it("a THROWING runner → internal_failure path (rethrown, no commit, no state) — dimension 13", async () => {
    const rec = createRecordingDiagnosticsSink();
    const boom = new Error("persist boom");
    const throwing: ProcessGateRunner = {
      run: () => {
        throw boom;
      },
    };
    const cat = catalogOf({ "g.proc": processRegWith(exitCodeEffective) });
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(reviewInstanceReady);
    const { kernel } = await setupGatedReview({
      pipeline: [{ uses: "g.proc" }],
      admitCatalog: cat,
      kernelCatalog: cat,
      store: handle.store,
      processRunner: throwing,
      runtimeContext: KERNEL_WORKTREE_SPEC,
      diag: rec.sink,
    });
    await expect(kernel.handle(reviewEmit("th1", "CONVERGED", 1))).rejects.toBe(boom);
    expect((await handle.store.getInstanceDetail("inst-1"))?.transcript).toHaveLength(0);
    expect(rec.events.some((e) => e.kind === "internal_failure")).toBe(true);
  });
});
