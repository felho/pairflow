import { describe, expect, it } from "vitest";

import { admitTemplate } from "../definition/index.js";
import { noopDiagnosticsSink } from "../diag/index.js";
import type {
  AdmittedTemplate,
  AgentConfig,
  DecisionMadeEntry,
  DecisionRequestEntry,
  InstanceId,
  WorkflowTemplate,
} from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createGateRegistry } from "../gates/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import { createStaticProviderRegistry } from "../ports/index.js";
import type {
  CommitOperatorEntryInput,
  CommitTransitionInput,
  StorePort,
} from "../ports/index.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  fixtureDefinitionStore,
} from "../testkit/index.js";
import type { AdmitCompareKind } from "./admission.js";
import { applyTargetEntryEffects } from "./arrival.js";
import { createKernel } from "./kernel.js";
import type { Kernel } from "./kernel.js";
import { resumeWait, submitDecision } from "./operatorIntents.js";
import type { OperatorIntentDeps } from "./operatorIntents.js";

/**
 * The two OPERATOR INTENTS' handler suite (packet ch14-p2b) — the home
 * of families 1, 3, 4, 6, 7, 8, 9 and 14.
 *
 * Every lane drives the REAL store and the REAL arrival: the handlers'
 * subject is what they COMMIT, and a fake store would make the column
 * iff, the two-row park and the CAS all unobservable. The one lane that
 * uses a fake PORT is family 1's `issuedAgentConfig` seam capture, and
 * it says why in place.
 */
const catalog = createGateRegistry();

/**
 * ONE template reaching EVERY target class from BOTH operator paths —
 * which is what lets family 1 drive dimension 10's four classes × the
 * three entry paths without four fixtures.
 *
 * THE ROLE LAYER IS WHERE LEFT-VS-TARGET IS STAGED, and it has to be: a
 * `human_gate` cannot carry an `agentConfig` at all (C2 refuses the
 * key), so the discriminating fixture gives the GATE's role and the
 * TARGET's role different `defaultAgentConfig` values.
 */
const template: WorkflowTemplate = {
  ref: { id: "op-intents", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      // `TO_AGENT` is the ACTOR path's AGENT-class target, and it is here
      // because family 1's membership is dimension 10's four target
      // classes × the THREE entry paths: without an agent-targeting edge
      // out of `implement` the actor path could reach only three of the
      // four, and the twelfth cell would be unauthorable rather than
      // undriven.
      transitions: {
        PASS: "gate",
        TO_WAIT: "commit_wait",
        TO_DONE: "done",
        TO_GATE: "gate",
        TO_AGENT: "implement",
      },
      recommends: { PASS: "approve" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "approve or send back",
      decisions: {
        approve: { target: "commit_wait" },
        request_rework: { target: "implement", payload: { instruction: { required: true } } },
        to_done: { target: "done" },
        re_park: { target: "gate" },
        to_gate2: { target: "gate2" },
      },
    },
    gate2: {
      type: "human_gate",
      role: "operator",
      instruction: "second gate",
      decisions: { ok: { target: "done" } },
    },
    commit_wait: {
      type: "wait",
      wait: { kind: "commit_pending", resumeEvents: ["COMMIT", "TO_AGENT", "TO_GATE", "TO_WAIT2"] },
      onResume: {
        COMMIT: "done",
        TO_AGENT: "implement",
        TO_GATE: "gate",
        TO_WAIT2: "wait2",
      },
    },
    wait2: {
      type: "wait",
      wait: { kind: "other_pending", resumeEvents: ["GO"] },
      onResume: { GO: "done" },
    },
  },
  terminal: ["done"],
  roles: {
    // The LEFT step's role (the gate's) and the TARGET step's role carry
    // DIFFERENT `defaultAgentConfig` values — the only authorable way to
    // separate a from-the-left build from a from-the-target one.
    implementer: { defaultActor: "codex", defaultAgentConfig: { profile: "target-side" } },
    operator: { defaultActor: "human-1", defaultAgentConfig: { profile: "left-side" } },
  },
  round: { advanceOnArrivalAt: ["implement"] },
};

function admit(t: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(t, catalog);
  if (!result.ok) {
    throw new Error(`admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

const admitted = admit(template);

interface Rig {
  readonly kernel: Kernel;
  readonly store: StorePort;
}

function rig(clockAt = 1_000): Rig {
  const handle = openStore(":memory:", createControlledClock(clockAt));
  const kernel = createKernel({
    providerRegistry: createStaticProviderRegistry({}),
    processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: fixtureDefinitionStore(admitted),
    time: createControlledClock(clockAt),
    digest: deriveEmitDigest,
    diag: noopDiagnosticsSink,
    gates: catalog,
  });
  return { kernel, store: handle.store };
}

/** Drive the real skeleton to a run parked at `gate`, via `type`. */
async function parked(
  id: InstanceId,
  type: "PASS" | "TO_GATE" = "PASS",
  payload?: unknown,
): Promise<Rig & { readonly requestRef: string; readonly version: number }> {
  const r = rig();
  await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
  await r.kernel.start({ instanceId: id, opId: "s0" });
  const outcome = await r.kernel.handle({
    instanceId: id,
    opId: "a1",
    type,
    actorId: "codex",
    expectedVersion: 2,
    expectedRole: "implementer",
    ...(payload !== undefined ? { payload } : {}),
  });
  if (outcome.kind !== "committed") {
    throw new Error(`fixture wiring: park did not commit (${outcome.kind})`);
  }
  const instance = await r.store.loadInstance(id);
  const requestRef = instance?.wait?.requestRef;
  if (requestRef === undefined) {
    throw new Error("fixture wiring: park wrote no request ref");
  }
  return { ...r, requestRef, version: outcome.version };
}

/** Drive the real skeleton to a run parked at a BARE wait. */
async function parkedAtWait(id: InstanceId): Promise<Rig & { readonly version: number }> {
  const r = rig();
  await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
  await r.kernel.start({ instanceId: id, opId: "s0" });
  const outcome = await r.kernel.handle({
    instanceId: id,
    opId: "a1",
    type: "TO_WAIT",
    actorId: "codex",
    expectedVersion: 2,
    expectedRole: "implementer",
  });
  if (outcome.kind !== "committed") {
    throw new Error(`fixture wiring: wait park did not commit (${outcome.kind})`);
  }
  return { ...r, version: outcome.version };
}

function decisionIntent(
  id: InstanceId,
  over: Partial<Parameters<Kernel["submitDecision"]>[0]> = {},
): Parameters<Kernel["submitDecision"]>[0] {
  return {
    intent: "submit-decision",
    instanceId: id,
    opId: "d1",
    expectedVersion: 3,
    requestRef: "R",
    verdict: "approve",
    by: "human-1",
    ...over,
  };
}

// ─────────────────────────────────────────────────────────────────────
// FAMILY 1 — arrival sharing (dimensions 1 and 10)
// ─────────────────────────────────────────────────────────────────────

describe("family 1 — the SAME target class entered from ALL THREE entry paths", () => {
  /** The committed instance record, read WHOLE. */
  async function stateAfter(store: StorePort, id: InstanceId) {
    const instance = await store.loadInstance(id);
    if (instance === null) throw new Error("instance vanished");
    const { currentStep, round, kernelStatus, terminalDisposition, wait, version } = instance;
    return { currentStep, round, kernelStatus, terminalDisposition, wait, version };
  }

  it("AGENT target: decision and resume agree with the actor path on the WHOLE record", async () => {
    // The ACTOR path's arrival into `implement` (round advances).
    const viaActor = await parked("i-a1", "PASS");
    const rework = await viaActor.kernel.submitDecision(
      decisionIntent("i-a1", {
        requestRef: viaActor.requestRef,
        verdict: "request_rework",
        payload: { instruction: "again" },
        override: true,
      }),
    );
    expect(rework.kind).toBe("committed");
    const afterDecision = await stateAfter(viaActor.store, "i-a1");

    // The RESUME path's arrival into the same target class.
    const viaResume = await parkedAtWait("i-a2");
    const resumed = await viaResume.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-a2",
      opId: "r1",
      expectedVersion: viaResume.version,
      type: "TO_AGENT",
    });
    expect(resumed.kind).toBe("committed");
    const afterResume = await stateAfter(viaResume.store, "i-a2");

    // The arrival's own fields agree class-for-class: ACTIVE at the
    // agent step, wait CLEARED in the same move, round advanced on both
    // (the edge targets `implement`, which `advanceOnArrivalAt` names).
    expect(afterDecision.kernelStatus).toBe("ACTIVE");
    expect(afterResume.kernelStatus).toBe("ACTIVE");
    expect(afterDecision.currentStep).toBe("implement");
    expect(afterResume.currentStep).toBe("implement");
    expect(afterDecision.wait).toBeNull();
    expect(afterResume.wait).toBeNull();
    expect(afterDecision.terminalDisposition).toBeNull();
    expect(afterResume.terminalDisposition).toBeNull();
    expect(afterDecision.round).toBe(2);
    expect(afterResume.round).toBe(2);
  });

  it("TERMINAL target: decision and resume both complete, wait cleared, disposition done", async () => {
    const viaDecision = await parked("i-t1");
    // `to_done` is AGAINST the recorded recommendation (`approve`), so
    // the flag is required — asserted here rather than assumed, because
    // a silent `override_required` would leave the run parked and the
    // state assertions below would read the PARK, not the arrival.
    const done = await viaDecision.kernel.submitDecision(
      decisionIntent("i-t1", {
        requestRef: viaDecision.requestRef,
        verdict: "to_done",
        override: true,
      }),
    );
    expect(done.kind).toBe("committed");
    const viaResume = await parkedAtWait("i-t2");
    await viaResume.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-t2",
      opId: "r1",
      expectedVersion: viaResume.version,
      type: "COMMIT",
    });
    for (const [store, id] of [
      [viaDecision.store, "i-t1"],
      [viaResume.store, "i-t2"],
    ] as const) {
      const state = await stateAfter(store, id);
      expect(state.kernelStatus).toBe("TERMINAL");
      expect(state.terminalDisposition).toBe("done");
      expect(state.currentStep).toBe("done");
      expect(state.wait).toBeNull();
    }
  });

  it("WAIT target: decision and resume both park on the target's DECLARED wait", async () => {
    const viaDecision = await parked("i-w1");
    const approve = await viaDecision.kernel.submitDecision(
      decisionIntent("i-w1", { requestRef: viaDecision.requestRef, verdict: "approve" }),
    );
    expect(approve.kind).toBe("committed");
    const viaResume = await parkedAtWait("i-w2");
    await viaResume.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-w2",
      opId: "r1",
      expectedVersion: viaResume.version,
      type: "TO_WAIT2",
    });
    const d = await stateAfter(viaDecision.store, "i-w1");
    expect(d.kernelStatus).toBe("WAITING");
    expect(d.wait).toEqual({
      kind: "commit_pending",
      requestedBy: "commit_wait",
      resumeEvents: ["COMMIT", "TO_AGENT", "TO_GATE", "TO_WAIT2"],
    });
    const r = await stateAfter(viaResume.store, "i-w2");
    expect(r.kernelStatus).toBe("WAITING");
    expect(r.wait).toEqual({
      kind: "other_pending",
      requestedBy: "wait2",
      resumeEvents: ["GO"],
    });
  });

  it("GATE target: decision and resume both park at a gate with a FRESH ref and NO recommendation", async () => {
    // Dimension 16 — C13's FIRST absence branch reaching an inhabitant:
    // a decision- or resume-routed arrival into a gate reads
    // `recommends` off a SOURCE that structurally cannot carry it.
    const viaDecision = await parked("i-g1");
    const toGate = await viaDecision.kernel.submitDecision(
      decisionIntent("i-g1", {
        requestRef: viaDecision.requestRef,
        verdict: "to_gate2",
        override: true,
      }),
    );
    expect(toGate.kind).toBe("committed");
    const viaResume = await parkedAtWait("i-g2");
    await viaResume.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-g2",
      opId: "r1",
      expectedVersion: viaResume.version,
      type: "TO_GATE",
    });
    for (const [store, id] of [
      [viaDecision.store, "i-g1"],
      [viaResume.store, "i-g2"],
    ] as const) {
      const detail = await store.getInstanceDetail(id);
      const park = detail?.transcript.find(
        (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST" && e.seq > 3,
      );
      expect(park?.recommendation).toBeUndefined();
      expect(park?.recommendationSource).toBeUndefined();
    }
  });

  it("→[config-from-left]: `issuedAgentConfig` is captured AT THE STORE-PORT SEAM and comes from the step being LEFT", async () => {
    // THE HONEST CARRIER IS THE SEAM, not a committed byte: C22 puts
    // `issued_agent_config` ABSENT BY CLASS on both classes this packet
    // adds, so a wrongly-resolved value writes NO byte difference and a
    // lane reaching for the committed row reaches for an observable that
    // does not exist. A TYPE-LEVEL assertion alone would green on the
    // wrong build too — BOTH resolutions produce an `AgentConfig`.
    //
    // So a fake port CAPTURES the branded effect record the handler
    // hands it and the lane reads the config member off that record —
    // the last point at which the value is observable.
    const base = await parked("i-cfg");
    const captured: CommitOperatorEntryInput[] = [];
    const capturing: StorePort = {
      ...base.store,
      loadInstance: (id) => base.store.loadInstance(id),
      findOp: (id, opId) => base.store.findOp(id, opId),
      getTimeline: (id, after) => base.store.getTimeline(id, after),
      commitOperatorEntry: (input) => {
        captured.push(input);
        return base.store.commitOperatorEntry(input);
      },
    };
    await submitDecision(
      {
        store: capturing,
        definitions: fixtureDefinitionStore(admitted),
        providerRegistry: createStaticProviderRegistry({}),
        newRequestId: () => "req-fixed-1",
      },
      decisionIntent("i-cfg", {
        requestRef: base.requestRef,
        verdict: "request_rework",
        payload: { instruction: "again" },
        override: true,
      }),
    );
    expect(captured).toHaveLength(1);
    // The GATE's role carries `left-side`; the TARGET's role carries
    // `target-side`. A from-the-target build yields the other value and
    // REDS here.
    expect(captured[0]?.arrival.issuedAgentConfig).toEqual({ profile: "left-side" });
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 3 — idempotency domain (dimension 4)
// ─────────────────────────────────────────────────────────────────────

describe("family 3 — the idempotency compare's KIND domain", () => {
  it("a replay of the intent's OWN kind → Duplicate", async () => {
    const base = await parked("i-d1");
    const first = await base.kernel.submitDecision(
      decisionIntent("i-d1", { requestRef: base.requestRef }),
    );
    expect(first.kind).toBe("committed");
    const replay = await base.kernel.submitDecision(
      decisionIntent("i-d1", { requestRef: base.requestRef }),
    );
    expect(replay).toEqual({ kind: "duplicate" });
  });

  it("an op id consumed by a TRANSITION row → op_id_collision, never Duplicate", async () => {
    // THE TRANSITION CELL proves the digest half was not reused. Since
    // →[compare-excludes-transition] makes `"transition"` unrepresentable
    // as a compare KIND, this lane no longer stands in for a missing type
    // guard — it asserts the RUNTIME disposition the type cannot reach.
    const base = await parked("i-d2");
    const outcome = await base.kernel.submitDecision(
      // `a1` is the op id the PARK's transition row consumed.
      decisionIntent("i-d2", { requestRef: base.requestRef, opId: "a1" }),
    );
    expect(outcome).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("an op id consumed by a LIFECYCLE FACT row → op_id_collision", async () => {
    const base = await parked("i-d3");
    const outcome = await base.kernel.submitDecision(
      // `s0` is the STARTED fact's op id.
      decisionIntent("i-d3", { requestRef: base.requestRef, opId: "s0" }),
    );
    expect(outcome).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("a resume replaying a DECISION_MADE op id → op_id_collision (the cross-class cell)", async () => {
    const base = await parked("i-d4");
    await base.kernel.submitDecision(decisionIntent("i-d4", { requestRef: base.requestRef }));
    const outcome = await base.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-d4",
      opId: "d1",
      expectedVersion: 4,
      type: "COMMIT",
    });
    expect(outcome).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("THE ACTOR PATH'S RECIPROCAL: an actor envelope replaying a DECISION_MADE op id → op_id_collision", async () => {
    // Opening the store's `findOp` whitelist (→[findop-whitelist]) means
    // HANDLE's own idempotency rung can now RETRIEVE a DECISION_MADE row
    // under an actor's op id, where before the whitelist rejected it AT
    // THE STORE — a throw where the rung needs the row returned. The rung
    // must answer `op_id_collision`.
    const base = await parked("i-d5");
    const rework = await base.kernel.submitDecision(
      decisionIntent("i-d5", {
        requestRef: base.requestRef,
        verdict: "request_rework",
        payload: { instruction: "again" },
        override: true,
      }),
    );
    expect(rework.kind).toBe("committed");
    const outcome = await base.kernel.handle({
      instanceId: "i-d5",
      opId: "d1",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 4,
      expectedRole: "implementer",
    });
    expect(outcome).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("the OP-LESS class is UNREACHABLE by this rung — the lookup does not find it", async () => {
    // Asserted rather than assumed: an `op_id = ?` lookup never matches a
    // NULL row, so a DECISION_REQUEST row cannot reach the compare. The
    // instance below CARRIES one (the park wrote it); a submit citing its
    // `request_ref` as an OP ID finds nothing and proceeds past the rung.
    const base = await parked("i-d6");
    const detail = await base.store.getInstanceDetail("i-d6");
    const opLess = detail?.transcript.find((e) => e.entryKind === "DECISION_REQUEST");
    expect(opLess).toBeDefined();
    expect(await base.store.findOp("i-d6", base.requestRef)).toBeNull();
    // …and the intent using that string as its op id is NOT a duplicate
    // and NOT a collision: it commits.
    const outcome = await base.kernel.submitDecision(
      decisionIntent("i-d6", { requestRef: base.requestRef, opId: base.requestRef }),
    );
    expect(outcome.kind).toBe("committed");
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 4 — the pending-request read (Q4)
// ─────────────────────────────────────────────────────────────────────

describe("family 4 — the pending DECISION_REQUEST read", () => {
  it("the recommendation the override guard reads EQUALS the one on the committed row", async () => {
    const base = await parked("i-p1");
    const detail = await base.store.getInstanceDetail("i-p1");
    const row = detail?.transcript.find(
      (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST",
    );
    expect(row?.recommendation).toBe("approve");
    // EQUALITY, not mere presence: the guard agrees with `approve`
    // (no override needed) and disagrees with anything else.
    const agreeing = await base.kernel.submitDecision(
      decisionIntent("i-p1", { requestRef: base.requestRef, verdict: "approve" }),
    );
    expect(agreeing.kind).toBe("committed");

    const other = await parked("i-p2");
    const disagreeing = await other.kernel.submitDecision(
      decisionIntent("i-p2", { requestRef: other.requestRef, verdict: "to_done" }),
    );
    expect(disagreeing).toEqual({ kind: "rejected", reason: "override_required" });
  });

  it("CORRUPT HISTORY: the correlation rung passes but the request row is ABSENT → kernel-integrity THROW, nothing committed", async () => {
    const base = await parked("i-p3");
    const before = await base.store.loadInstance("i-p3");
    // A store whose timeline hides the park row: the wait still cites the
    // ref (so the correlation rung passes) and the row is gone.
    const corrupt: StorePort = {
      ...base.store,
      loadInstance: (id) => base.store.loadInstance(id),
      findOp: (id, opId) => base.store.findOp(id, opId),
      commitOperatorEntry: (input) => base.store.commitOperatorEntry(input),
      getTimeline: async (id, after) => {
        const rows = await base.store.getTimeline(id, after);
        return rows?.filter((e) => e.entryKind !== "DECISION_REQUEST") ?? null;
      },
    };
    await expect(
      submitDecision(
        {
          store: corrupt,
          definitions: fixtureDefinitionStore(admitted),
          providerRegistry: createStaticProviderRegistry({}),
          newRequestId: () => "req-fixed-1",
        },
        decisionIntent("i-p3", { requestRef: base.requestRef }),
      ),
    ).rejects.toThrow(/kernel integrity/);
    // NOTHING COMMITTED — the throw precedes the commit.
    expect(await base.store.loadInstance("i-p3")).toEqual(before);
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 6 — the override truth table + the key-scoped guards
// ─────────────────────────────────────────────────────────────────────

describe("family 6 — the override truth table, all SIX cells", () => {
  it("against ∧ ¬override → override_required", async () => {
    const base = await parked("i-o1");
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-o1", { requestRef: base.requestRef, verdict: "to_done" }),
      ),
    ).toEqual({ kind: "rejected", reason: "override_required" });
  });

  it("against ∧ override → committed", async () => {
    const base = await parked("i-o2");
    expect(
      (
        await base.kernel.submitDecision(
          decisionIntent("i-o2", {
            requestRef: base.requestRef,
            verdict: "to_done",
            override: true,
          }),
        )
      ).kind,
    ).toBe("committed");
  });

  it("¬against (AGREEMENT with the recorded recommendation) ∧ override → override_not_applicable", async () => {
    const base = await parked("i-o3");
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-o3", {
          requestRef: base.requestRef,
          verdict: "approve",
          override: true,
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "override_not_applicable" });
  });

  it("¬against (NO recommendation recorded at all) ∧ override → override_not_applicable", async () => {
    // THE SECOND CAUSE, driven SEPARATELY: it reaches the same name from
    // a DIFFERENT state, and a build handling only the agreement case
    // passes half the lane. The park is reached by an edge that declares
    // NO `recommends`, so nothing is recorded.
    const base = await parked("i-o4", "TO_GATE");
    const detail = await base.store.getInstanceDetail("i-o4");
    const row = detail?.transcript.find(
      (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST",
    );
    expect(row?.recommendation).toBeUndefined();
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-o4", {
          requestRef: base.requestRef,
          verdict: "approve",
          override: true,
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "override_not_applicable" });
  });

  it("¬against (no recommendation) ∧ ¬override → committed", async () => {
    const base = await parked("i-o5", "TO_GATE");
    expect(
      (
        await base.kernel.submitDecision(
          decisionIntent("i-o5", { requestRef: base.requestRef, verdict: "to_done" }),
        )
      ).kind,
    ).toBe("committed");
  });

  it("¬against (agreement) ∧ ¬override → committed", async () => {
    const base = await parked("i-o6");
    expect(
      (
        await base.kernel.submitDecision(
          decisionIntent("i-o6", { requestRef: base.requestRef, verdict: "approve" }),
        )
      ).kind,
    ).toBe("committed");
  });

  it("→[override-absent-not-false]: `override` is ABSENT on the row, never `false`", async () => {
    const base = await parked("i-o7");
    await base.kernel.submitDecision(
      decisionIntent("i-o7", { requestRef: base.requestRef, verdict: "approve" }),
    );
    const detail = await base.store.getInstanceDetail("i-o7");
    const made = detail?.transcript.find(
      (e): e is DecisionMadeEntry => e.entryKind === "DECISION_MADE",
    );
    // ABSENCE asserted AS ABSENCE: an explicit `false` would satisfy
    // every truthiness assertion while making the audit surface answer
    // "declined to override" where the contract says there was nothing
    // to override.
    expect(made).toBeDefined();
    expect("override" in (made as object)).toBe(false);
  });
});

describe("family 6 — the key-scoped guard ORDER and the required-payload set", () => {
  it("an unknown verdict → unknown_decision", async () => {
    const base = await parked("i-k1");
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-k1", { requestRef: base.requestRef, verdict: "nope" }),
      ),
    ).toEqual({ kind: "rejected", reason: "unknown_decision" });
  });

  it("COMBINATION: an unknown verdict WITH an inapplicable override → unknown_decision", async () => {
    // The guard ORDER is driven by a combination lane, never an isolated
    // one: an unknown verdict must NEVER reach the override guards.
    const base = await parked("i-k2");
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-k2", {
          requestRef: base.requestRef,
          verdict: "nope",
          override: true,
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "unknown_decision" });
  });

  it("→[own-property-indexes]: a HOSTILE verdict spelling a prototype member → unknown_decision", async () => {
    // An unguarded index answers `constructor` with an INHERITED member
    // instead of the refusal — this is the lane that makes the
    // own-property obligation falsifiable rather than stated.
    const base = await parked("i-k3");
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-k3", { requestRef: base.requestRef, verdict: "constructor" }),
      ),
    ).toEqual({ kind: "rejected", reason: "unknown_decision" });
  });

  it("the CLOSED empty set rejects at every member, ABSENT rejects, a nonempty value is the control", async () => {
    const cells: readonly (readonly [string, unknown])[] = [
      ["null", null],
      ["empty string", ""],
      ["empty array", []],
      ["empty object", {}],
    ];
    for (const [label, value] of cells) {
      const id = `i-e-${label.replace(/\s/g, "")}`;
      const base = await parked(id);
      expect(
        await base.kernel.submitDecision(
          decisionIntent(id, {
            requestRef: base.requestRef,
            verdict: "request_rework",
            override: true,
            payload: { instruction: value },
          }),
        ),
        label,
      ).toEqual({ kind: "rejected", reason: "missing_required_field" });
    }
    // ABSENT is its own condition.
    const absent = await parked("i-e-absent");
    expect(
      await absent.kernel.submitDecision(
        decisionIntent("i-e-absent", {
          requestRef: absent.requestRef,
          verdict: "request_rework",
          override: true,
          payload: {},
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "missing_required_field" });
    // The nonempty control ACCEPTS.
    const control = await parked("i-e-control");
    expect(
      (
        await control.kernel.submitDecision(
          decisionIntent("i-e-control", {
            requestRef: control.requestRef,
            verdict: "request_rework",
            override: true,
            payload: { instruction: "do it" },
          }),
        )
      ).kind,
    ).toBe("committed");
  });

  it("THE SEVENTH CELL: a WHITESPACE-ONLY string must NOT be trimmed — it is NOT empty", async () => {
    // A trimming build passes all six closed cells (each rejects either
    // way) and the control (it accepts either way), so ONLY this cell
    // separates the two builds.
    const base = await parked("i-ws");
    expect(
      (
        await base.kernel.submitDecision(
          decisionIntent("i-ws", {
            requestRef: base.requestRef,
            verdict: "request_rework",
            override: true,
            payload: { instruction: "   " },
          }),
        )
      ).kind,
    ).toBe("committed");
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 7 — round advancement and the handoff (dimension 9)
// ─────────────────────────────────────────────────────────────────────

describe("family 7 — round advancement is EDGE-KEYED, never verdict-named", () => {
  it("THE DISCRIMINATING FIXTURE: the VERDICT NAME and the TARGET's flag DISAGREE, both ways", async () => {
    // The authorable shape that kills a verdict-name build: an `approve`
    // whose target does NOT advance, and a `request_rework` whose target
    // DOES. (The shape it is NOT is two decisions on one target with
    // different flags: the flag is expanded from `advanceOnArrivalAt`, a
    // flat set of TARGETS, so two edges into one target always carry the
    // SAME flag and that fixture cannot exist.)
    const advancing = await parked("i-r1");
    const rework = await advancing.kernel.submitDecision(
      decisionIntent("i-r1", {
        requestRef: advancing.requestRef,
        verdict: "request_rework",
        payload: { instruction: "again" },
        override: true,
      }),
    );
    expect(rework.kind).toBe("committed");
    expect((await advancing.store.loadInstance("i-r1"))?.round).toBe(2);

    const notAdvancing = await parked("i-r2");
    const approve = await notAdvancing.kernel.submitDecision(
      decisionIntent("i-r2", { requestRef: notAdvancing.requestRef, verdict: "approve" }),
    );
    expect(approve.kind).toBe("committed");
    // `approve` targets `commit_wait`, which `advanceOnArrivalAt` does
    // NOT name — so the round STAYS, despite the approving name.
    expect((await notAdvancing.store.loadInstance("i-r2"))?.round).toBe(1);
  });

  it("the rework target's FIRST DISPATCH packet is asserted WHOLE — the submitted payload, no stale value beside it", async () => {
    const base = await parked("i-r3", "PASS", { stale: "the actor's own last emit" });
    const outcome = await base.kernel.submitDecision(
      decisionIntent("i-r3", {
        requestRef: base.requestRef,
        verdict: "request_rework",
        payload: { instruction: "the operator's instruction" },
        override: true,
      }),
    );
    if (outcome.kind !== "committed") throw new Error("rework did not commit");
    const dispatch = outcome.intent;
    if (dispatch === null || !("actor" in dispatch)) {
      throw new Error("rework did not return a DispatchIntent");
    }
    expect(dispatch.packet).toEqual({
      instanceId: "i-r3",
      expectedVersion: 4,
      task: "ship it",
      role: "implementer",
      instruction: "build it",
      // THE SUBMITTED PAYLOAD, and no stale value beside it: the
      // pre-gate transition's `{ stale: … }` must NOT survive here.
      handoff: { instruction: "the operator's instruction" },
      availableOps: ["PASS", "TO_WAIT", "TO_DONE", "TO_GATE", "TO_AGENT"],
      effectiveAgentConfig: { profile: "target-side" },
      contextBlocks: [],
      runtimeContext: "none",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 8 — the resume path's shape guard and routing
// ─────────────────────────────────────────────────────────────────────

describe("family 8 — the wait-SHAPE guard at BOTH reachable inhabitants", () => {
  it("INHABITANT 1: a `humanGate` park met by a DECLARED decision key → not_bare_wait", async () => {
    // Entered on an event its OWN earlier rungs admit: a decision wait's
    // `resume_events` ARE its decision keys, so `approve` passes the
    // correlate rung and REACHES the shape guard.
    const base = await parked("i-s1");
    expect(
      await base.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: "i-s1",
        opId: "r1",
        expectedVersion: 3,
        type: "approve",
      }),
    ).toEqual({ kind: "rejected", reason: "not_bare_wait" });
  });

  it("INHABITANT 2: a `kickoff_pending` hold met by KICKOFF → not_bare_wait (a hold carries NO position)", async () => {
    const r = rig();
    await r.kernel.create({
      instanceId: "i-s2",
      templateRef: template.ref,
      task: "ship it",
      mode: "deferred_kickoff",
    });
    await r.kernel.start({ instanceId: "i-s2", opId: "s0" });
    const held = await r.store.loadInstance("i-s2");
    expect(held?.wait?.kind).toBe("kickoff_pending");
    expect(held?.currentStep).toBeNull();
    expect(
      await r.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: "i-s2",
        opId: "r1",
        expectedVersion: held?.version,
        type: "KICKOFF",
      }),
    ).toEqual({ kind: "rejected", reason: "not_bare_wait" });
  });

  it("THE THIRD CASE IS BOUNDED BY THE LADDER, not the guard: an ACTIVE agent step → not_waiting at the STATE rung", async () => {
    const r = rig();
    await r.kernel.create({ instanceId: "i-s3", templateRef: template.ref, task: "ship it" });
    await r.kernel.start({ instanceId: "i-s3", opId: "s0" });
    expect(
      await r.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: "i-s3",
        opId: "r1",
        expectedVersion: 2,
        type: "COMMIT",
      }),
    ).toEqual({ kind: "rejected", reason: "not_waiting" });
  });

  it("THE RUNG ORDER'S OUTCOME: a MISMATCHING event on a decision wait → resume_event_mismatch, NEVER not_bare_wait", async () => {
    // The correlation rung fires FIRST by design, so this gate cell never
    // reaches the shape guard — which is why it is a member of family 8
    // as a CORRELATION-SHADOWED cell rather than a guard inhabitant.
    const base = await parked("i-s4");
    expect(
      await base.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: "i-s4",
        opId: "r1",
        expectedVersion: 3,
        type: "NOT_A_DECISION_KEY",
      }),
    ).toEqual({ kind: "rejected", reason: "resume_event_mismatch" });
  });
});

describe("family 8 — the resume ROUTING cells", () => {
  it("a declared route → committed", async () => {
    const base = await parkedAtWait("i-n1");
    expect(
      (
        await base.kernel.resumeWait({
          intent: "resume-wait",
          instanceId: "i-n1",
          opId: "r1",
          expectedVersion: base.version,
          type: "COMMIT",
        })
      ).kind,
    ).toBe("committed");
  });

  it("`no_resume_transition` is driven from an ADMITTED template declaring a resume event with NO route", async () => {
    // The lane proves the ADMISSION SURFACE really permits the shape —
    // C3 admits a partial or empty `onResume`, which is what keeps
    // `no_resume_transition` reachable BY DESIGN.
    const routeless = admit({
      ...template,
      ref: { id: "routeless", version: 1 },
      steps: {
        ...template.steps,
        commit_wait: {
          type: "wait",
          wait: { kind: "commit_pending", resumeEvents: ["COMMIT", "UNROUTED"] },
          onResume: { COMMIT: "done" },
        },
      },
    });
    const handle = openStore(":memory:", createControlledClock(1_000));
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: fixtureDefinitionStore(routeless),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates: catalog,
    });
    await kernel.create({ instanceId: "i-n2", templateRef: routeless.ref, task: "ship it" });
    await kernel.start({ instanceId: "i-n2", opId: "s0" });
    await kernel.handle({
      instanceId: "i-n2",
      opId: "a1",
      type: "TO_WAIT",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    expect(
      await kernel.resumeWait({
        intent: "resume-wait",
        instanceId: "i-n2",
        opId: "r1",
        expectedVersion: 3,
        type: "UNROUTED",
      }),
    ).toEqual({ kind: "rejected", reason: "no_resume_transition" });
  });

  it("THE HOSTILE RESUME KEY: `resumeEvents: [\"constructor\"]` over an empty `onResume` → no_resume_transition", async () => {
    // The resume index IS reachable with a hostile key: `resumeEvents`
    // members cite the ordinary id class, which admits `constructor`,
    // and a declared member with NO `onResume` route is admissible BY
    // DESIGN. So the correlate rung passes and the index is REACHED,
    // where an unguarded read answers with an INHERITED member instead
    // of the refusal.
    const hostile = admit({
      ...template,
      ref: { id: "hostile-resume", version: 1 },
      steps: {
        ...template.steps,
        commit_wait: {
          type: "wait",
          wait: { kind: "commit_pending", resumeEvents: ["constructor"] },
          onResume: {},
        },
      },
    });
    const handle = openStore(":memory:", createControlledClock(1_000));
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: fixtureDefinitionStore(hostile),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates: catalog,
    });
    await kernel.create({ instanceId: "i-n3", templateRef: hostile.ref, task: "ship it" });
    await kernel.start({ instanceId: "i-n3", opId: "s0" });
    await kernel.handle({
      instanceId: "i-n3",
      opId: "a1",
      type: "TO_WAIT",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    expect(
      await kernel.resumeWait({
        intent: "resume-wait",
        instanceId: "i-n3",
        opId: "r1",
        expectedVersion: 3,
        type: "constructor",
      }),
    ).toEqual({ kind: "rejected", reason: "no_resume_transition" });
  });

  it("→[resume-kind-source]: WAIT_RESUMED's `kind` is read off the INSTANCE record", async () => {
    const base = await parkedAtWait("i-n4");
    await base.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-n4",
      opId: "r1",
      expectedVersion: base.version,
      type: "COMMIT",
    });
    const detail = await base.store.getInstanceDetail("i-n4");
    const row = detail?.transcript.find((e) => e.entryKind === "WAIT_RESUMED");
    expect(row).toEqual({
      entryKind: "WAIT_RESUMED",
      seq: 3,
      opId: "r1",
      kind: "commit_pending",
      event: "COMMIT",
      committedAt: 1_000,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 9 — COMPLETE's widened precondition (Q8)
// ─────────────────────────────────────────────────────────────────────

describe("family 9 — completion from the two NEWLY REACHABLE arrivals", () => {
  it("a DECISION arrival into a terminal target completes", async () => {
    const base = await parked("i-c1");
    const outcome = await base.kernel.submitDecision(
      decisionIntent("i-c1", {
        requestRef: base.requestRef,
        verdict: "to_done",
        override: true,
      }),
    );
    expect(outcome.kind).toBe("committed");
    // The returned output is NONE — the run is over.
    if (outcome.kind !== "committed") throw new Error("unreachable");
    expect(outcome.intent).toBeNull();
    const state = await base.store.loadInstance("i-c1");
    expect(state?.kernelStatus).toBe("TERMINAL");
    expect(state?.terminalDisposition).toBe("done");
  });

  it("a RESUME arrival into a terminal target completes — the chapter's anchor realization", async () => {
    // `commit_pending ⇐ [COMMIT] → done`: the run completes from a
    // RESUMED WAITING arrival rather than from an ACTIVE actor
    // transition, which is what makes the widened precondition
    // INHABITED rather than merely written.
    const base = await parkedAtWait("i-c2");
    const outcome = await base.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-c2",
      opId: "r1",
      expectedVersion: base.version,
      type: "COMMIT",
    });
    expect(outcome.kind).toBe("committed");
    if (outcome.kind !== "committed") throw new Error("unreachable");
    expect(outcome.intent).toBeNull();
    const state = await base.store.loadInstance("i-c2");
    expect(state?.kernelStatus).toBe("TERMINAL");
    expect(state?.terminalDisposition).toBe("done");
  });

  it("THE DOUBLE-COMPLETION BAR is a DEFENSIVE assert reached only by a DIRECT unit call", async () => {
    // Every entry path's STATE rung refuses a TERMINAL instance before
    // the arrival runs, so no routed entry can present one — the only
    // way to reach this bar is to call the arrival directly. The lane
    // carries NO committed-state assertion: a direct call commits
    // nothing, so there is no committed state to assert.
    const base = await parkedAtWait("i-c3");
    await base.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-c3",
      opId: "r1",
      expectedVersion: base.version,
      type: "COMMIT",
    });
    const terminal = await base.store.loadInstance("i-c3");
    expect(terminal?.kernelStatus).toBe("TERMINAL");
    expect(() =>
      applyTargetEntryEffects(
        { newRequestId: () => "req-fixed-1" },
        terminal as NonNullable<typeof terminal>,
        admitted,
        { stepId: "commit_wait", edgeKey: "COMMIT" },
        "done",
        {},
        {},
      ),
    ).toThrow(/double completion/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 14 — the same-instance re-park (dimensions 15, 16 and 4b)
// ─────────────────────────────────────────────────────────────────────

describe("family 14 — the re-park mints a FRESH ref and the OLD one is refused", () => {
  it("a decision routing back to the SAME gate mints a FRESH request_ref", async () => {
    const base = await parked("i-rp1");
    const first = base.requestRef;
    const outcome = await base.kernel.submitDecision(
      decisionIntent("i-rp1", {
        requestRef: first,
        verdict: "re_park",
        override: true,
      }),
    );
    expect(outcome.kind).toBe("committed");
    const after = await base.store.loadInstance("i-rp1");
    expect(after?.kernelStatus).toBe("WAITING");
    expect(after?.currentStep).toBe("gate");
    // A FRESH ref — a build REUSING the old one leaves these equal.
    expect(after?.wait?.requestRef).toBeDefined();
    expect(after?.wait?.requestRef).not.toBe(first);
  });

  it("a submit citing the OLD ref is REFUSED by the correlation rung — the assertion a ref-reusing build fails", async () => {
    const base = await parked("i-rp2");
    const first = base.requestRef;
    await base.kernel.submitDecision(
      decisionIntent("i-rp2", { requestRef: first, verdict: "re_park", override: true }),
    );
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-rp2", { opId: "d2", expectedVersion: 4, requestRef: first }),
      ),
    ).toEqual({ kind: "rejected", reason: "decision_request_mismatch" });
  });

  it("`first-park × stale ref` is a NEVER-VALID ref, not a superseded one — same rung, different reason", async () => {
    const base = await parked("i-rp3");
    expect(
      await base.kernel.submitDecision(
        decisionIntent("i-rp3", { requestRef: "never-minted" }),
      ),
    ).toEqual({ kind: "rejected", reason: "decision_request_mismatch" });
  });

  it("`re-park × fresh ref` succeeds — the fourth cell of the SUM", async () => {
    const base = await parked("i-rp4");
    await base.kernel.submitDecision(
      decisionIntent("i-rp4", { requestRef: base.requestRef, verdict: "re_park", override: true }),
    );
    const after = await base.store.loadInstance("i-rp4");
    const fresh = after?.wait?.requestRef;
    expect(fresh).toBeDefined();
    expect(
      (
        await base.kernel.submitDecision(
          decisionIntent("i-rp4", {
            opId: "d2",
            expectedVersion: 4,
            requestRef: fresh as string,
            verdict: "to_done",
          }),
        )
      ).kind,
    ).toBe("committed");
  });

  it("THE RE-PARK'S RETURNED ASK cites the FRESHLY COMMITTED row — not the pre-arrival wait, not the old ref", async () => {
    // NO OTHER FAMILY REACHES THIS. Family 15's two trace legs do not
    // re-park, and family 1 asserts committed state only — so TWO
    // NON-THROWING wrong builds are green everywhere else: an Ask
    // assembled from the PRE-arrival instance (which reads a stale wait),
    // and an Ask carrying the OLD `request_ref` while the committed row
    // carries the fresh one, handing the operator an Ask citing a ref the
    // correlation rung would already refuse.
    const base = await parked("i-rp5");
    const outcome = await base.kernel.submitDecision(
      decisionIntent("i-rp5", { requestRef: base.requestRef, verdict: "re_park", override: true }),
    );
    if (outcome.kind !== "committed") throw new Error("re-park did not commit");
    const ask = outcome.intent;
    if (ask === null || !("allowedDecisions" in ask)) {
      throw new Error("re-park did not return an Ask");
    }
    const detail = await base.store.getInstanceDetail("i-rp5");
    const fresh = detail?.transcript.filter(
      (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST",
    );
    const committedRef = fresh?.[fresh.length - 1]?.requestRef;
    expect(committedRef).toBeDefined();
    expect(committedRef).not.toBe(base.requestRef);
    // The Ask's ref EQUALS the freshly committed row's — which is what
    // makes Q1's five selection arguments an observable on the one path
    // that can see them.
    expect(ask.requestRef).toBe(committedRef);
    // …together with its `expectedVersion` (the POST-commit version, off
    // by exactly one if a build projects the pre-commit instance) and its
    // `allowedDecisions`.
    expect(ask.expectedVersion).toBe(outcome.version);
    expect(ask.allowedDecisions).toEqual([
      "approve",
      "request_rework",
      "to_done",
      "re_park",
      "to_gate2",
    ]);
  });

  it("dimension 16: a decision-routed re-park records NO recommendation and NO source", async () => {
    const base = await parked("i-rp6");
    await base.kernel.submitDecision(
      decisionIntent("i-rp6", { requestRef: base.requestRef, verdict: "re_park", override: true }),
    );
    const detail = await base.store.getInstanceDetail("i-rp6");
    const parks = detail?.transcript.filter(
      (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST",
    );
    const rePark = parks?.[parks.length - 1];
    expect(rePark?.recommendation).toBeUndefined();
    expect(rePark?.recommendationSource).toBeUndefined();
  });
});

describe("family 14 — dimension 4b: the arriving payload's SOURCE on a re-park", () => {
  it("CELL 1: a submit WITH a payload records the DECISION's payload as `context_ref`", async () => {
    const base = await parked("i-4b1", "PASS", { stale: "pre-gate" });
    await base.kernel.submitDecision(
      decisionIntent("i-4b1", {
        requestRef: base.requestRef,
        verdict: "re_park",
        override: true,
        payload: { from: "the decision" },
      }),
    );
    const detail = await base.store.getInstanceDetail("i-4b1");
    const parks = detail?.transcript.filter(
      (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST",
    );
    // C13's stated widening of the model's transition-only
    // `payload_of_transition_into`: the DECISION's payload, not the
    // pre-gate transition's.
    expect(parks?.[parks.length - 1]?.contextRef).toEqual({ from: "the decision" });
  });

  it("CELL 2 (the MIDDLE one): a payload-LESS submit records `context_ref` ABSENT, never `{}`", async () => {
    // This is the cell an empty `arriving` passes everywhere else — it is
    // named apart from cell 1 because a build reading one sentence as
    // both authors cell 1 twice and leaves the `{}`-as-present shape
    // undriven.
    const base = await parked("i-4b2");
    await base.kernel.submitDecision(
      decisionIntent("i-4b2", { requestRef: base.requestRef, verdict: "re_park", override: true }),
    );
    const detail = await base.store.getInstanceDetail("i-4b2");
    const parks = detail?.transcript.filter(
      (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST",
    );
    const rePark = parks?.[parks.length - 1];
    expect(rePark).toBeDefined();
    expect("contextRef" in (rePark as object)).toBe(false);
  });

  it("CELL 3: a RESUME-routed park carries NO `context_ref` — C18's declared Absent", async () => {
    const base = await parkedAtWait("i-4b3");
    await base.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: "i-4b3",
      opId: "r1",
      expectedVersion: base.version,
      type: "TO_GATE",
    });
    const detail = await base.store.getInstanceDetail("i-4b3");
    const park = detail?.transcript.find(
      (e): e is DecisionRequestEntry => e.entryKind === "DECISION_REQUEST",
    );
    expect(park).toBeDefined();
    expect("contextRef" in (park as object)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 2 — THE LOAD CELL, on BOTH operator paths
// (build-close aftermath, ch14-p2b: family 2's MEMBERSHIP names the
// load that PRECEDES the rungs — `unknown_instance` on both paths —
// "not a rung, which is why it is named rather than assumed inside the
// ladder". The rung lanes live in `admission.test.ts` over the pure
// ladder, which by construction cannot reach a load that happens before
// it; so the cell has no home there and needs one here.)
// ─────────────────────────────────────────────────────────────────────

describe("family 2 — the LOAD cell: an ABSENT instance on BOTH operator paths", () => {
  /**
   * THE LOAD'S ANSWER IS THE ONLY OBSERVABLE, so the lane reads it three
   * ways at once: the returned reason EXACTLY, that NOTHING was
   * committed, and that no LATER read of any kind was performed. The
   * third is what separates "returns the right name" from "returns the
   * right name after running the ladder anyway" — `admitInput` returns
   * BEFORE `findOp`, before the pinned-template load and before every
   * rung, and a build that reordered the load past them would still
   * answer `unknown_instance` on the first two assertions alone.
   */
  interface Watched {
    readonly deps: OperatorIntentDeps;
    readonly reads: {
      loadInstance: number;
      findOp: number;
      getTimeline: number;
      definitions: number;
      commits: number;
    };
    readonly store: StorePort;
  }

  function absentRig(): Watched {
    const handle = openStore(":memory:", createControlledClock(1_000));
    // NO instance is created — `loadInstance` genuinely answers null out
    // of the REAL store rather than out of a fake that pretends to.
    const reads = { loadInstance: 0, findOp: 0, getTimeline: 0, definitions: 0, commits: 0 };
    const backing = fixtureDefinitionStore(admitted);
    const watched: StorePort = {
      ...handle.store,
      loadInstance: (id) => {
        reads.loadInstance += 1;
        return handle.store.loadInstance(id);
      },
      findOp: (id, opId) => {
        reads.findOp += 1;
        return handle.store.findOp(id, opId);
      },
      getTimeline: (id, after) => {
        reads.getTimeline += 1;
        return handle.store.getTimeline(id, after);
      },
      commitOperatorEntry: (input) => {
        reads.commits += 1;
        return handle.store.commitOperatorEntry(input);
      },
    };
    const definitions: DefinitionStore = {
      load: (ref) => {
        reads.definitions += 1;
        return backing.load(ref);
      },
    };
    return {
      deps: {
        store: watched,
        definitions,
        providerRegistry: createStaticProviderRegistry({}),
        newRequestId: () => "req-never-minted",
      },
      reads,
      store: handle.store,
    };
  }

  it("SUBMIT_DECISION against an absent instance → exactly Rejected(unknown_instance), nothing read after the load", async () => {
    const rig = absentRig();
    const outcome = await submitDecision(rig.deps, decisionIntent("ghost-1"));
    // EXACTLY the load's own name — the whole value, not a `kind` probe.
    expect(outcome).toEqual({ kind: "rejected", reason: "unknown_instance" });
    // Nothing committed: the instance still does not exist.
    expect(await rig.store.getInstanceDetail("ghost-1")).toBeNull();
    expect(rig.reads.commits).toBe(0);
    // ONE load, and then NOTHING — no idempotency lookup, no pinned
    // template, no pending-request read. The load is not a rung and it
    // returns before every rung.
    expect(rig.reads).toEqual({
      loadInstance: 1,
      findOp: 0,
      getTimeline: 0,
      definitions: 0,
      commits: 0,
    });
  });

  it("RESUME_WAIT against an absent instance → exactly Rejected(unknown_instance), nothing read after the load", async () => {
    // BOTH PATHS, because `admitInput` is shared and a per-path
    // divergence is exactly what a shared helper makes invisible: the
    // submit lane alone would green a resume path that had its own copy.
    const rig = absentRig();
    const outcome = await resumeWait(rig.deps, {
      intent: "resume-wait",
      instanceId: "ghost-2",
      opId: "r1",
      expectedVersion: 3,
      type: "COMMIT",
    });
    expect(outcome).toEqual({ kind: "rejected", reason: "unknown_instance" });
    expect(await rig.store.getInstanceDetail("ghost-2")).toBeNull();
    expect(rig.reads).toEqual({
      loadInstance: 1,
      findOp: 0,
      getTimeline: 0,
      definitions: 0,
      commits: 0,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 1 — DIMENSION 10's FOUR TARGET CLASSES × THE THREE ENTRY PATHS
// (build-close aftermath, ch14-p2b: the membership declares "ALL TWELVE
// ARE REACHABLE" and the build drove a SAMPLE of it — the decision and
// resume paths over the four classes, with a handful of selected
// instance fields. The grid is written out here, and both halves of
// each cell are read as WHOLE VALUES: the post-arrival instance
// projection and the rows the move APPENDED. A per-path divergence in
// any unasserted field is exactly what a selected-field read cannot
// see, and the whole point of a shared arrival is that there is no such
// field.)
// ─────────────────────────────────────────────────────────────────────

describe("family 1 — ALL TWELVE CELLS: four target classes × three entry paths, whole values", () => {
  /** The post-arrival instance projection, WHOLE. */
  async function projection(store: StorePort, id: InstanceId) {
    const instance = await store.loadInstance(id);
    if (instance === null) throw new Error(`instance '${id}' vanished`);
    const { currentStep, round, kernelStatus, terminalDisposition, wait, version } = instance;
    return { currentStep, round, kernelStatus, terminalDisposition, wait, version };
  }

  /** The rows the MOVE appended — everything past the pre-move high-water seq. */
  async function appended(store: StorePort, id: InstanceId, afterSeq: number) {
    const detail = await store.getInstanceDetail(id);
    return (detail?.transcript ?? []).filter((entry) => entry.seq > afterSeq);
  }

  async function highWater(store: StorePort, id: InstanceId): Promise<number> {
    const detail = await store.getInstanceDetail(id);
    return (detail?.transcript ?? []).reduce((max, entry) => Math.max(max, entry.seq), 0);
  }

  /**
   * A rig whose store CAPTURES the `issuedAgentConfig` each commit
   * carries, on BOTH commit members — the store-port seam family 1
   * names as the honest carrier, since the two operator classes put
   * `issued_agent_config` ABSENT BY CLASS and a lane reaching for a
   * committed byte there reaches for an observable that does not exist.
   */
  function capturingRig(clockAt = 1_000) {
    const handle = openStore(":memory:", createControlledClock(clockAt));
    const seam: AgentConfig[] = [];
    const capturing: StorePort = {
      ...handle.store,
      loadInstance: (id) => handle.store.loadInstance(id),
      findOp: (id, opId) => handle.store.findOp(id, opId),
      getTimeline: (id, after) => handle.store.getTimeline(id, after),
      commitTransition: (input: CommitTransitionInput) => {
        seam.push(input.arrival.issuedAgentConfig);
        return handle.store.commitTransition(input);
      },
      commitOperatorEntry: (input: CommitOperatorEntryInput) => {
        seam.push(input.arrival.issuedAgentConfig);
        return handle.store.commitOperatorEntry(input);
      },
    };
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: capturing,
      definitions: fixtureDefinitionStore(admitted),
      time: createControlledClock(clockAt),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates: catalog,
    });
    return { kernel, store: handle.store, seam };
  }

  interface Observed {
    readonly state: Awaited<ReturnType<typeof projection>>;
    readonly rows: readonly unknown[];
    readonly issuedAgentConfig: AgentConfig | undefined;
  }

  /** ENTRY PATH 1 — the ACTOR envelope through HANDLE. */
  async function viaActor(id: InstanceId, type: string): Promise<Observed> {
    const r = capturingRig();
    await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
    await r.kernel.start({ instanceId: id, opId: "s0" });
    const before = await highWater(r.store, id);
    const outcome = await r.kernel.handle({
      instanceId: id,
      opId: "a1",
      type,
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    if (outcome.kind !== "committed") {
      throw new Error(`actor path did not commit (${outcome.kind})`);
    }
    return {
      state: await projection(r.store, id),
      rows: await appended(r.store, id, before),
      issuedAgentConfig: r.seam[r.seam.length - 1],
    };
  }

  /** ENTRY PATH 2 — the operator's DECISION at the parked gate. */
  async function viaDecision(
    id: InstanceId,
    over: Partial<Parameters<Kernel["submitDecision"]>[0]>,
  ): Promise<Observed> {
    const r = capturingRig();
    await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
    await r.kernel.start({ instanceId: id, opId: "s0" });
    const park = await r.kernel.handle({
      instanceId: id,
      opId: "a1",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    if (park.kind !== "committed") throw new Error(`fixture wiring: park (${park.kind})`);
    const before = await highWater(r.store, id);
    r.seam.length = 0;
    const outcome = await r.kernel.submitDecision(
      decisionIntent(id, { requestRef: "req-1000-1", ...over }),
    );
    if (outcome.kind !== "committed") {
      throw new Error(`decision path did not commit (${outcome.kind})`);
    }
    return {
      state: await projection(r.store, id),
      rows: await appended(r.store, id, before),
      issuedAgentConfig: r.seam[r.seam.length - 1],
    };
  }

  /** ENTRY PATH 3 — the RESUME of the parked bare wait. */
  async function viaResume(id: InstanceId, type: string): Promise<Observed> {
    const r = capturingRig();
    await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
    await r.kernel.start({ instanceId: id, opId: "s0" });
    const park = await r.kernel.handle({
      instanceId: id,
      opId: "a1",
      type: "TO_WAIT",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    if (park.kind !== "committed") throw new Error(`fixture wiring: wait park (${park.kind})`);
    const before = await highWater(r.store, id);
    r.seam.length = 0;
    const outcome = await r.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: id,
      opId: "r1",
      expectedVersion: 3,
      type,
    });
    if (outcome.kind !== "committed") {
      throw new Error(`resume path did not commit (${outcome.kind})`);
    }
    return {
      state: await projection(r.store, id),
      rows: await appended(r.store, id, before),
      issuedAgentConfig: r.seam[r.seam.length - 1],
    };
  }

  /** The actor envelope each ACTOR cell commits, and its digest. */
  function actorEnvelope(id: InstanceId, type: string) {
    return {
      instanceId: id,
      opId: "a1",
      type,
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    };
  }

  function actorRow(id: InstanceId, type: string, seq: number) {
    const env = actorEnvelope(id, type);
    return {
      entryKind: "transition",
      seq,
      envelope: env,
      payloadDigest: deriveEmitDigest(env),
      gateDecisions: [],
      // The ACTOR path leaves `implement`, whose role carries
      // `target-side` — committed by class on this path, which is why
      // this half of the config rule IS a committed byte here and a seam
      // capture on the other two.
      issuedAgentConfig: { profile: "target-side" },
      committedAt: 1_000,
    };
  }

  const GATE_DECISIONS = ["approve", "request_rework", "to_done", "re_park", "to_gate2"];
  const COMMIT_WAIT_EVENTS = ["COMMIT", "TO_AGENT", "TO_GATE", "TO_WAIT2"];

  interface Cell {
    readonly path: "actor" | "decision" | "resume";
    readonly targetClass: "agent" | "terminal" | "wait" | "gate";
    readonly run: () => Promise<Observed>;
    readonly state: Awaited<ReturnType<typeof projection>>;
    readonly rows: readonly unknown[];
    /**
     * ABSENT on the two cells the packet names as unable to discriminate
     * `issuedAgentConfig` at all — resume × terminal and resume × wait,
     * which resolve to `{}` on BOTH sides. They are members of this
     * family for the arrival's OTHER assertions; forcing a config
     * equality onto them would look like coverage while proving nothing.
     *
     * Of the ten that DO carry one, these discriminate a from-the-left
     * build from a from-the-target build: actor × {terminal, wait, gate},
     * decision × {agent, terminal, wait}, resume × {agent, gate}. The
     * remaining two — actor × agent (a self-loop, so left IS target) and
     * decision × gate (both steps carry the `operator` role) — read the
     * same value either way and are asserted as ordinary whole-value
     * reads rather than as →[config-from-left] evidence.
     */
    readonly issuedAgentConfig?: AgentConfig;
  }

  const CELLS: readonly Cell[] = [
    // ── ENTRY PATH: the ACTOR envelope ────────────────────────────────
    {
      path: "actor",
      targetClass: "agent",
      run: () => viaActor("c-aa", "TO_AGENT"),
      state: {
        currentStep: "implement",
        round: 2,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        wait: null,
        version: 3,
      },
      rows: [actorRow("c-aa", "TO_AGENT", 2)],
      issuedAgentConfig: { profile: "target-side" },
    },
    {
      path: "actor",
      targetClass: "terminal",
      run: () => viaActor("c-at", "TO_DONE"),
      state: {
        currentStep: "done",
        round: 1,
        kernelStatus: "TERMINAL",
        terminalDisposition: "done",
        wait: null,
        version: 3,
      },
      rows: [actorRow("c-at", "TO_DONE", 2)],
      issuedAgentConfig: { profile: "target-side" },
    },
    {
      path: "actor",
      targetClass: "wait",
      run: () => viaActor("c-aw", "TO_WAIT"),
      state: {
        currentStep: "commit_wait",
        round: 1,
        kernelStatus: "WAITING",
        terminalDisposition: null,
        wait: {
          kind: "commit_pending",
          requestedBy: "commit_wait",
          resumeEvents: COMMIT_WAIT_EVENTS,
        },
        version: 3,
      },
      rows: [actorRow("c-aw", "TO_WAIT", 2)],
      issuedAgentConfig: { profile: "target-side" },
    },
    {
      path: "actor",
      targetClass: "gate",
      run: () => viaActor("c-ag", "PASS"),
      state: {
        currentStep: "gate",
        round: 1,
        kernelStatus: "WAITING",
        terminalDisposition: null,
        wait: {
          kind: "human_decision",
          requestedBy: "gate",
          resumeEvents: GATE_DECISIONS,
          requestRef: "req-1000-1",
        },
        version: 3,
      },
      rows: [
        actorRow("c-ag", "PASS", 2),
        // The gate park's SECOND row, in the SAME commit.
        {
          entryKind: "DECISION_REQUEST",
          seq: 3,
          requestRef: "req-1000-1",
          recipient: "operator",
          decisions: GATE_DECISIONS,
          // The ONLY cell of the twelve whose source can carry a
          // recommendation: an agent step's `recommends`.
          recommendation: "approve",
          recommendationSource: { fromStep: "implement", eventType: "PASS" },
          committedAt: 1_000,
        },
      ],
      issuedAgentConfig: { profile: "target-side" },
    },
    // ── ENTRY PATH: the operator's DECISION ───────────────────────────
    {
      path: "decision",
      targetClass: "agent",
      run: () =>
        viaDecision("c-da", {
          verdict: "request_rework",
          payload: { instruction: "again" },
          override: true,
        }),
      state: {
        currentStep: "implement",
        round: 2,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        wait: null,
        version: 4,
      },
      rows: [
        {
          entryKind: "DECISION_MADE",
          seq: 4,
          opId: "d1",
          decision: "request_rework",
          payload: { instruction: "again" },
          by: "human-1",
          requestRef: "req-1000-1",
          override: true,
          committedAt: 1_000,
        },
      ],
      issuedAgentConfig: { profile: "left-side" },
    },
    {
      path: "decision",
      targetClass: "terminal",
      run: () => viaDecision("c-dt", { verdict: "to_done", override: true }),
      state: {
        currentStep: "done",
        round: 1,
        kernelStatus: "TERMINAL",
        terminalDisposition: "done",
        wait: null,
        version: 4,
      },
      rows: [
        {
          entryKind: "DECISION_MADE",
          seq: 4,
          opId: "d1",
          decision: "to_done",
          by: "human-1",
          requestRef: "req-1000-1",
          override: true,
          committedAt: 1_000,
        },
      ],
      issuedAgentConfig: { profile: "left-side" },
    },
    {
      path: "decision",
      targetClass: "wait",
      run: () => viaDecision("c-dw", { verdict: "approve" }),
      state: {
        currentStep: "commit_wait",
        round: 1,
        kernelStatus: "WAITING",
        terminalDisposition: null,
        wait: {
          kind: "commit_pending",
          requestedBy: "commit_wait",
          resumeEvents: COMMIT_WAIT_EVENTS,
        },
        version: 4,
      },
      rows: [
        {
          entryKind: "DECISION_MADE",
          seq: 4,
          opId: "d1",
          decision: "approve",
          by: "human-1",
          requestRef: "req-1000-1",
          // NO `override`: the verdict EQUALS the recommendation, so
          // there was nothing to override — absence, never `false`.
          committedAt: 1_000,
        },
      ],
      issuedAgentConfig: { profile: "left-side" },
    },
    {
      path: "decision",
      targetClass: "gate",
      run: () => viaDecision("c-dg", { verdict: "to_gate2", override: true }),
      state: {
        currentStep: "gate2",
        round: 1,
        kernelStatus: "WAITING",
        terminalDisposition: null,
        wait: {
          kind: "human_decision",
          requestedBy: "gate2",
          resumeEvents: ["ok"],
          requestRef: "req-1000-2",
        },
        version: 4,
      },
      rows: [
        {
          entryKind: "DECISION_MADE",
          seq: 4,
          opId: "d1",
          decision: "to_gate2",
          by: "human-1",
          requestRef: "req-1000-1",
          override: true,
          committedAt: 1_000,
        },
        {
          entryKind: "DECISION_REQUEST",
          seq: 5,
          requestRef: "req-1000-2",
          recipient: "operator",
          decisions: ["ok"],
          // NO recommendation and NO source: the SOURCE is a
          // `human_gate`, which structurally cannot carry `recommends`
          // (C13's first absence branch).
          committedAt: 1_000,
        },
      ],
      issuedAgentConfig: { profile: "left-side" },
    },
    // ── ENTRY PATH: the RESUME of a bare wait ─────────────────────────
    {
      path: "resume",
      targetClass: "agent",
      run: () => viaResume("c-ra", "TO_AGENT"),
      state: {
        currentStep: "implement",
        round: 2,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        wait: null,
        version: 4,
      },
      rows: [
        {
          entryKind: "WAIT_RESUMED",
          seq: 3,
          opId: "r1",
          kind: "commit_pending",
          event: "TO_AGENT",
          committedAt: 1_000,
        },
      ],
      // DISCRIMINATING: the LEFT step is a role-less `wait`, so the only
      // authorable layer resolves to `{}` — a from-the-target build
      // would read `implement`'s role and yield `target-side` here.
      issuedAgentConfig: {},
    },
    {
      path: "resume",
      targetClass: "terminal",
      run: () => viaResume("c-rt", "COMMIT"),
      state: {
        currentStep: "done",
        round: 1,
        kernelStatus: "TERMINAL",
        terminalDisposition: "done",
        wait: null,
        version: 4,
      },
      rows: [
        {
          entryKind: "WAIT_RESUMED",
          seq: 3,
          opId: "r1",
          kind: "commit_pending",
          event: "COMMIT",
          committedAt: 1_000,
        },
      ],
      // NO `issuedAgentConfig` — the packet's own carve-out: a terminal
      // target carries no role, so BOTH resolutions answer `{}`.
    },
    {
      path: "resume",
      targetClass: "wait",
      run: () => viaResume("c-rw", "TO_WAIT2"),
      state: {
        currentStep: "wait2",
        round: 1,
        kernelStatus: "WAITING",
        terminalDisposition: null,
        wait: { kind: "other_pending", requestedBy: "wait2", resumeEvents: ["GO"] },
        version: 4,
      },
      rows: [
        {
          entryKind: "WAIT_RESUMED",
          seq: 3,
          opId: "r1",
          kind: "commit_pending",
          event: "TO_WAIT2",
          committedAt: 1_000,
        },
      ],
      // NO `issuedAgentConfig` — the packet's second carve-out cell: a
      // `wait` target carries no role either.
    },
    {
      path: "resume",
      targetClass: "gate",
      run: () => viaResume("c-rg", "TO_GATE"),
      state: {
        currentStep: "gate",
        round: 1,
        kernelStatus: "WAITING",
        terminalDisposition: null,
        wait: {
          kind: "human_decision",
          requestedBy: "gate",
          resumeEvents: GATE_DECISIONS,
          requestRef: "req-1000-1",
        },
        version: 4,
      },
      rows: [
        {
          entryKind: "WAIT_RESUMED",
          seq: 3,
          opId: "r1",
          kind: "commit_pending",
          event: "TO_GATE",
          committedAt: 1_000,
        },
        {
          entryKind: "DECISION_REQUEST",
          seq: 4,
          requestRef: "req-1000-1",
          recipient: "operator",
          decisions: GATE_DECISIONS,
          committedAt: 1_000,
        },
      ],
      // DISCRIMINATING: a from-the-target build reads the gate's
      // `operator` role and yields `left-side`.
      issuedAgentConfig: {},
    },
  ];

  it("the grid is COMPLETE — four target classes × three entry paths, twelve distinct cells", () => {
    // The membership stated positively, checked rather than trusted: a
    // cell dropped in a later edit reds here rather than quietly
    // shrinking the grid back to the sample this lane replaced.
    const seen = new Set(CELLS.map((c) => `${c.path}×${c.targetClass}`));
    expect(seen.size).toBe(12);
    for (const path of ["actor", "decision", "resume"] as const) {
      for (const targetClass of ["agent", "terminal", "wait", "gate"] as const) {
        expect(seen.has(`${path}×${targetClass}`), `missing cell: ${path}×${targetClass}`).toBe(
          true,
        );
      }
    }
  });

  for (const cell of CELLS) {
    it(`${cell.path} → ${cell.targetClass} target: instance projection and committed rows, WHOLE`, async () => {
      const observed = await cell.run();
      expect(observed.state).toEqual(cell.state);
      expect(observed.rows).toEqual(cell.rows);
      if (cell.issuedAgentConfig !== undefined) {
        expect(observed.issuedAgentConfig).toEqual(cell.issuedAgentConfig);
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 3 — THE COMPARE-KIND TOKENS × THE TWO OPERATOR PATHS
// (build-close aftermath, ch14-p2b: the membership is "the COMPARE-KIND
// tokens existing after this packet × the two operator paths, read from
// the EXCLUDED domain at build rather than counted here". The build
// drove one lifecycle token on one path; the grid is written out here.)
//
// THE TOKEN SET IS DERIVED, NEVER TRANSCRIBED. The table below is typed
// `Record<AdmitCompareKind, KindCell>`, and `AdmitCompareKind` IS the
// live discriminant expression
// `Exclude<TranscriptEntry["entryKind"], "transition">`. A token added
// to the transcript union with no row here is a COMPILE error, and a
// row for a token the union no longer carries is one too — enforced by
// `pnpm v3:typecheck`, which the packet's Acceptance names as a check
// in force. A hand-written list would go stale silently, which is the
// failure class this whole fold exists to close.
// ─────────────────────────────────────────────────────────────────────

describe("family 3 — every COMPARE-KIND token × BOTH operator paths", () => {
  /** The op id EVERY staging consumes, so each lane replays exactly it. */
  const SHARED_OP = "shared-op";

  interface GateStage {
    readonly rig: Rig;
    readonly requestRef: string;
    readonly version: number;
  }
  interface WaitStage {
    readonly rig: Rig;
    readonly version: number;
    /** A resume event the staged wait actually DECLARES. */
    readonly resumeType: string;
  }

  interface KindCell {
    /**
     * Stage a run PARKED AT A GATE whose transcript already consumed
     * `SHARED_OP` under this class — or `null` for the OP-LESS class,
     * which consumes no `(instance_id, op_id)` key and therefore cannot
     * reach the rung at all.
     */
    readonly atGate: ((id: InstanceId) => Promise<GateStage>) | null;
    /** The same, parked at a BARE WAIT, for the resume path. */
    readonly atWait: ((id: InstanceId) => Promise<WaitStage>) | null;
    /** Why the staging looks the way it does, where that is not obvious. */
    readonly note?: string;
  }

  async function gateAfter(r: Rig, id: InstanceId, version: number): Promise<GateStage> {
    const instance = await r.store.loadInstance(id);
    const requestRef = instance?.wait?.requestRef;
    if (requestRef === undefined) throw new Error("fixture wiring: no request ref");
    return { rig: r, requestRef, version };
  }

  const KIND_CELLS: Readonly<Record<AdmitCompareKind, KindCell>> = {
    STARTED: {
      atGate: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: SHARED_OP });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        return gateAfter(r, id, 3);
      },
      atWait: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: SHARED_OP });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "TO_WAIT",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        return { rig: r, version: 3, resumeType: "COMMIT" };
      },
    },
    CANCELLED: {
      // THE ONE CLASS WHOSE STAGING CANNOT LEAVE THE RUN PARKED: a
      // CANCELLED fact takes the run TERMINAL. The lane still measures
      // the idempotency rung because that rung is FIRST — which is a
      // property family 2 owns and this staging depends on, stated here
      // rather than left as an accident of the fixture.
      note: "cancel takes the run TERMINAL; the idempotency rung answers before the state rung",
      atGate: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        const staged = await gateAfter(r, id, 3);
        await r.kernel.cancel({ instanceId: id, opId: SHARED_OP });
        return { ...staged, version: 4 };
      },
      atWait: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "TO_WAIT",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        await r.kernel.cancel({ instanceId: id, opId: SHARED_OP });
        return { rig: r, version: 4, resumeType: "COMMIT" };
      },
    },
    TASK_SUPPLIED: {
      note: "the only op-carrying fact a `deferred_kickoff` run consumes",
      atGate: async (id) => {
        const r = rig();
        await r.kernel.create({
          instanceId: id,
          templateRef: template.ref,
          mode: "deferred_kickoff",
        });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.kickoff({ instanceId: id, opId: SHARED_OP, task: "ship it" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 3,
          expectedRole: "implementer",
        });
        return gateAfter(r, id, 4);
      },
      atWait: async (id) => {
        const r = rig();
        await r.kernel.create({
          instanceId: id,
          templateRef: template.ref,
          mode: "deferred_kickoff",
        });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.kickoff({ instanceId: id, opId: SHARED_OP, task: "ship it" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "TO_WAIT",
          actorId: "codex",
          expectedVersion: 3,
          expectedRole: "implementer",
        });
        return { rig: r, version: 4, resumeType: "COMMIT" };
      },
    },
    DECISION_REQUEST: {
      // OP-LESS BY CLASS: it consumes no `(instance_id, op_id)` key, so
      // the rung cannot retrieve it and neither path has a stageable
      // cell. Its own unreachability lane is above and stays as it is;
      // this row keeps the token IN the derived grid rather than letting
      // it vanish into an unwritten case.
      note: "op-less — consumes no key, so the rung cannot reach it on either path",
      atGate: null,
      atWait: null,
    },
    DECISION_MADE: {
      atGate: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        const first = await gateAfter(r, id, 3);
        // `re_park` routes the gate back to ITSELF, so the run is parked
        // at a gate again with a FRESH ref — which is what lets the
        // submit path be driven against a consumed op id.
        await r.kernel.submitDecision(
          decisionIntent(id, {
            opId: SHARED_OP,
            requestRef: first.requestRef,
            verdict: "re_park",
            override: true,
          }),
        );
        return gateAfter(r, id, 4);
      },
      atWait: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        const first = await gateAfter(r, id, 3);
        await r.kernel.submitDecision(
          decisionIntent(id, {
            opId: SHARED_OP,
            requestRef: first.requestRef,
            verdict: "approve",
          }),
        );
        return { rig: r, version: 4, resumeType: "COMMIT" };
      },
    },
    WAIT_RESUMED: {
      atGate: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "TO_WAIT",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        await r.kernel.resumeWait({
          intent: "resume-wait",
          instanceId: id,
          opId: SHARED_OP,
          expectedVersion: 3,
          type: "TO_GATE",
        });
        return gateAfter(r, id, 4);
      },
      atWait: async (id) => {
        const r = rig();
        await r.kernel.create({ instanceId: id, templateRef: template.ref, task: "ship it" });
        await r.kernel.start({ instanceId: id, opId: "s0" });
        await r.kernel.handle({
          instanceId: id,
          opId: "a1",
          type: "TO_WAIT",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
        });
        await r.kernel.resumeWait({
          intent: "resume-wait",
          instanceId: id,
          opId: SHARED_OP,
          expectedVersion: 3,
          type: "TO_WAIT2",
        });
        return { rig: r, version: 4, resumeType: "GO" };
      },
    },
  };

  /**
   * THE DISPOSITION IS A RULE, NOT A TRANSCRIPTION: the compare is an
   * equality on the KIND, so a replay of the intent's OWN committed kind
   * is a Duplicate and every other op-carrying class is a collision. A
   * per-cell literal would let one wrong expectation hide as data.
   */
  function expected(token: AdmitCompareKind, ownKind: AdmitCompareKind) {
    return token === ownKind
      ? { kind: "duplicate" }
      : { kind: "rejected", reason: "op_id_collision" };
  }

  const TOKENS = Object.keys(KIND_CELLS) as readonly AdmitCompareKind[];

  it("the grid covers the LIVE compare-kind domain, and every op-carrying token is stageable on BOTH paths", () => {
    // The domain's SIZE is checked here so a token added to the union
    // (which the `Record` type already compile-forces into the table)
    // cannot be answered with a `null` pair and quietly skipped: only
    // the OP-LESS class is allowed to have no staging, and it is named.
    for (const token of TOKENS) {
      const cell = KIND_CELLS[token];
      const stageable = cell.atGate !== null && cell.atWait !== null;
      expect(stageable, `${token} must be stageable on both paths unless op-less`).toBe(
        token !== "DECISION_REQUEST",
      );
    }
    expect(TOKENS).toContain("DECISION_REQUEST");
  });

  for (const token of TOKENS) {
    const cell = KIND_CELLS[token];
    const gate = cell.atGate;
    const wait = cell.atWait;

    if (gate === null || wait === null) {
      it(`${token}: OP-LESS — the lookup cannot retrieve it, so neither path reaches the compare`, async () => {
        const base = await parked(`k-ol-${token}`);
        // Its correlation handle is a `request_ref`, not an op id, and an
        // `op_id = ?` lookup never matches a NULL row.
        expect(await base.store.findOp(`k-ol-${token}`, base.requestRef)).toBeNull();
      });
      continue;
    }

    it(`SUBMIT against an op id consumed by a ${token} row → ${JSON.stringify(expected(token, "DECISION_MADE"))}`, async () => {
      const staged = await gate(`k-s-${token}`);
      const outcome = await staged.rig.kernel.submitDecision(
        decisionIntent(`k-s-${token}`, {
          opId: SHARED_OP,
          requestRef: staged.requestRef,
          expectedVersion: staged.version,
        }),
      );
      expect(outcome).toEqual(expected(token, "DECISION_MADE"));
    });

    it(`RESUME against an op id consumed by a ${token} row → ${JSON.stringify(expected(token, "WAIT_RESUMED"))}`, async () => {
      const staged = await wait(`k-r-${token}`);
      const outcome = await staged.rig.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: `k-r-${token}`,
        opId: SHARED_OP,
        expectedVersion: staged.version,
        type: staged.resumeType,
      });
      expect(outcome).toEqual(expected(token, "WAIT_RESUMED"));
    });
  }
});

describe("family 3 — THE ACTOR PATH'S RECIPROCAL, for BOTH new classes", () => {
  /**
   * Opening the store's `findOp` whitelist (→[findop-whitelist]) means
   * HANDLE's own idempotency rung can now RETRIEVE a row of EITHER new
   * class under an actor's op id, where before the whitelist rejected it
   * AT THE STORE. The build drove `DECISION_MADE` only; `WAIT_RESUMED`
   * went through the same whitelist opening and had no lane.
   */
  const RECIPROCALS = [
    {
      kind: "DECISION_MADE",
      id: "i-rc1" as InstanceId,
      /** Leave the run ACTIVE at an agent step with the op id consumed. */
      stage: async (id: InstanceId, opId: string): Promise<Rig & { version: number }> => {
        const base = await parked(id);
        const outcome = await base.kernel.submitDecision(
          decisionIntent(id, {
            opId,
            requestRef: base.requestRef,
            verdict: "request_rework",
            payload: { instruction: "again" },
            override: true,
          }),
        );
        if (outcome.kind !== "committed") throw new Error(`staging failed (${outcome.kind})`);
        return { kernel: base.kernel, store: base.store, version: outcome.version };
      },
    },
    {
      kind: "WAIT_RESUMED",
      id: "i-rc2" as InstanceId,
      stage: async (id: InstanceId, opId: string): Promise<Rig & { version: number }> => {
        const base = await parkedAtWait(id);
        const outcome = await base.kernel.resumeWait({
          intent: "resume-wait",
          instanceId: id,
          opId,
          expectedVersion: base.version,
          type: "TO_AGENT",
        });
        if (outcome.kind !== "committed") throw new Error(`staging failed (${outcome.kind})`);
        return { kernel: base.kernel, store: base.store, version: outcome.version };
      },
    },
  ] as const;

  for (const reciprocal of RECIPROCALS) {
    it(`an actor envelope replaying a ${reciprocal.kind} op id → op_id_collision`, async () => {
      const staged = await reciprocal.stage(reciprocal.id, "op-x");
      const outcome = await staged.kernel.handle({
        instanceId: reciprocal.id,
        opId: "op-x",
        type: "PASS",
        actorId: "codex",
        expectedVersion: staged.version,
        expectedRole: "implementer",
      });
      expect(outcome).toEqual({ kind: "rejected", reason: "op_id_collision" });
    });
  }
});
