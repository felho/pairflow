import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  AdmittedTemplate,
  DispatchIntent,
  HumanDecisionRequest,
  InstanceId,
  Step,
  StepId,
  WorkflowTemplate,
} from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createKernel } from "./kernel/index.js";
import type { Kernel } from "./kernel/index.js";
import { createStaticProviderRegistry } from "./ports/index.js";
import type { StorePort } from "./ports/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "./testkit/index.js";

/**
 * ch14-p3b family 2 — THE SHIPPED ROUTE AND THE OPERATOR-INTENT SEAM,
 * driven IN-PROCESS over the ADMITTED SHIPPED TEMPLATE.
 *
 * WHY THIS FILE IS NEW rather than an extension: the family must drive
 * the shipped template, and every route to it names either
 * `fixtureTemplate` or the shipped templates directory — a third inline
 * copy of the declaration is what the ch8-P2 single-source pin forbids.
 * `kernel/operatorIntents.test.ts` cannot serve either: its rig helpers
 * close over its own `op-intents` template with no template parameter,
 * so joining it would mean a parallel rig inside it.
 *
 * IT IS NOT A RE-PIN FAMILY MEMBER, and the rule that makes that true is
 * the family predicate's own: the family is the set of PRE-EXISTING
 * consumers the delta REACHES, so a file this packet creates is outside
 * it by construction.
 *
 * WHAT IS NEW HERE IS THE REACH, not the kernel: the gate and wait
 * branches of the shared arrival were built at ch14-p2b. What this
 * packet turns on is that a run of the SHIPPED template can occupy every
 * position of the seam and answer at every cell of it.
 *
 * The shipped fixture is the DIRECT channel of the same declaration the
 * canonical file carries; the ch8-P2 pin is what ties the two, and
 * `definition/admit.test.ts` pins the canonical file's admitted value to
 * fixture-independent literals.
 */

const catalog = createGateRegistry();

const REF = { id: "local-pair-v0", version: 1 } as const;

function admittedShipped(): AdmittedTemplate {
  const result = admitTemplate(fixtureTemplate(), catalog);
  if (result.ok) return result.template;
  throw new Error(`the shipped template did not admit: ${JSON.stringify(result.findings)}`);
}

const shipped = admittedShipped();

/**
 * A DERIVED variant of the shipped declaration — the only form the
 * decorrelation lanes below may take. A third inline copy of the
 * declaration is what T6's single-source anchor forbids, so `mutate`
 * receives the shipped value and returns it with EXACTLY the fields one
 * lane needs overridden; everything else is the shipped template's own.
 */
function admitDerived(mutate: (base: WorkflowTemplate) => WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(mutate(fixtureTemplate()), catalog);
  if (result.ok) return result.template;
  throw new Error(`the derived template did not admit: ${JSON.stringify(result.findings)}`);
}

/** The shipped fixture's own step, fetched loudly — a derivation that
 * silently spread `undefined` would author a NEW step rather than
 * override one. */
function stepOf(base: WorkflowTemplate, id: StepId): Step {
  const step = base.steps[id];
  if (step === undefined) throw new Error(`the shipped fixture carries no \`${id}\` step`);
  return step;
}

interface Rig {
  readonly kernel: Kernel;
  readonly store: StorePort;
  readonly close: () => void;
}

function rig(template: AdmittedTemplate = shipped): Rig {
  const handle = openStore(":memory:", createControlledClock(1_000));
  const kernel = createKernel({
    providerRegistry: createStaticProviderRegistry({}),
    processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: fixtureDefinitionStore(template),
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
    diag: noopDiagnosticsSink,
    gates: catalog,
  });
  return { kernel, store: handle.store, close: () => handle.close() };
}

/** The shipped gate park's request ref under the controlled clock at
 * 1_000 — each run's park is its FIRST minted request, so a computable
 * literal rather than a wildcard. */
const R = "req-1000-1";

interface Phase extends Rig {
  readonly id: InstanceId;
  readonly version: number;
}

/** CREATED — `create` alone commits it; nothing is WAITING yet. */
async function atCreated(id: InstanceId): Promise<Phase> {
  const r = rig();
  const created = await r.kernel.create({ instanceId: id, templateRef: REF, task: "ship it" });
  if (created.kind !== "created") throw new Error(`create: ${created.kind}`);
  return { ...r, id, version: created.version };
}

/** WAITING(kickoff_pending) — the deferred hold: a CREATE-level mode
 * followed by `start`. A lane staged on either half alone never reaches
 * this position. */
async function atKickoffHold(id: InstanceId): Promise<Phase> {
  const r = rig();
  await r.kernel.create({ instanceId: id, templateRef: REF, mode: "deferred_kickoff" });
  const started = await r.kernel.start({ instanceId: id, opId: "s0" });
  if (started.kind !== "accepted") throw new Error(`deferred start: ${started.kind}`);
  const instance = await r.store.loadInstance(id);
  return { ...r, id, version: instance?.version ?? 0 };
}

/** ACTIVE at `implement` — the start step. */
async function atImplement(id: InstanceId, template: AdmittedTemplate = shipped): Promise<Phase> {
  const r = rig(template);
  await r.kernel.create({ instanceId: id, templateRef: REF, task: "ship it" });
  const started = await r.kernel.start({ instanceId: id, opId: "s0" });
  if (started.kind !== "activated") throw new Error(`start: ${started.kind}`);
  return { ...r, id, version: started.version };
}

/** ACTIVE at `review` — one PASS on. */
async function atReview(id: InstanceId, template: AdmittedTemplate = shipped): Promise<Phase> {
  const at = await atImplement(id, template);
  const outcome = await at.kernel.handle({
    instanceId: id,
    opId: "a1",
    type: "PASS",
    actorId: "codex",
    expectedVersion: at.version,
    expectedRole: "implementer",
    payload: { note: "P" },
  });
  if (outcome.kind !== "committed") throw new Error(`PASS: ${outcome.kind}`);
  return { ...at, version: outcome.version };
}

/** WAITING(human_decision) at `human_approval` — the park CONVERGED
 * reaches on the shipped template. */
async function atGate(
  id: InstanceId,
  template: AdmittedTemplate = shipped,
): Promise<Phase & { readonly ask: DispatchIntent | HumanDecisionRequest | null }> {
  const at = await atReview(id, template);
  const outcome = await at.kernel.handle({
    instanceId: id,
    opId: "b2",
    type: "CONVERGED",
    actorId: "claude",
    expectedVersion: at.version,
    expectedRole: "reviewer",
    payload: { note: "C" },
  });
  if (outcome.kind !== "committed") throw new Error(`CONVERGED: ${outcome.kind}`);
  return { ...at, version: outcome.version, ask: outcome.intent };
}

/** WAITING(commit_pending) — the approve route's own park. */
async function atCommitWait(id: InstanceId, template: AdmittedTemplate = shipped): Promise<Phase> {
  const at = await atGate(id, template);
  const outcome = await at.kernel.submitDecision({
    intent: "submit-decision",
    instanceId: id,
    opId: "d1",
    expectedVersion: at.version,
    requestRef: R,
    verdict: "approve",
    by: "human",
  });
  if (outcome.kind !== "committed") throw new Error(`approve: ${JSON.stringify(outcome)}`);
  return { ...at, version: outcome.version };
}

/** TERMINAL(`done`) — reached only through the human. */
async function atDone(id: InstanceId): Promise<Phase> {
  const at = await atCommitWait(id);
  const outcome = await at.kernel.resumeWait({
    intent: "resume-wait",
    instanceId: id,
    opId: "r1",
    expectedVersion: at.version,
    type: "COMMIT",
  });
  if (outcome.kind !== "committed") throw new Error(`COMMIT: ${JSON.stringify(outcome)}`);
  return { ...at, version: outcome.version };
}

async function stateOf(store: StorePort, id: InstanceId) {
  const instance = await store.loadInstance(id);
  if (instance === null) throw new Error("instance vanished");
  const { currentStep, round, kernelStatus, terminalDisposition, wait, version } = instance;
  return { currentStep, round, kernelStatus, terminalDisposition, wait, version };
}

// ─────────────────────────────────────────────────────────────────────
// The PHASE axis — every position a run of the shipped template can
// occupy, REACHED and asserted. The two parks are new at this packet and
// are the ones no pre-ch14 expectation has a word for.
// ─────────────────────────────────────────────────────────────────────

describe("family 2 — the shipped template's PHASE axis, every position reached", () => {
  it("CREATED: `create` alone leaves the run un-started and not WAITING at all", async () => {
    const at = await atCreated("p-created");
    expect(await stateOf(at.store, at.id)).toStrictEqual({
      currentStep: null,
      round: 0,
      kernelStatus: "CREATED",
      terminalDisposition: null,
      wait: null,
      version: 1,
    });
    at.close();
  });

  it("WAITING(kickoff_pending): the deferred hold — a null position and the activation's own wait", async () => {
    const at = await atKickoffHold("p-hold");
    expect(await stateOf(at.store, at.id)).toStrictEqual({
      currentStep: null,
      round: 0,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      wait: { kind: "kickoff_pending", requestedBy: "activation", resumeEvents: ["KICKOFF"] },
      version: 2,
    });
    at.close();
  });

  it("ACTIVE at `implement`, then ACTIVE at `review` — the two agent positions", async () => {
    const first = await atImplement("p-impl");
    expect(await stateOf(first.store, first.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      wait: null,
      round: 1,
    });
    first.close();

    const second = await atReview("p-review");
    expect(await stateOf(second.store, second.id)).toMatchObject({
      currentStep: "review",
      kernelStatus: "ACTIVE",
      wait: null,
      round: 1,
    });
    second.close();
  });

  it("WAITING(human_decision) at `human_approval`: the park, its wait record and a LIVE request ref", async () => {
    const at = await atGate("p-gate");
    expect(await stateOf(at.store, at.id)).toStrictEqual({
      currentStep: "human_approval",
      round: 1,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      // The decision wait's resume events ARE the gate's declared
      // decision keys — which is what makes the `resume` cells below
      // reachable at all.
      wait: {
        kind: "human_decision",
        requestedBy: "human_approval",
        resumeEvents: ["approve", "request_rework"],
        requestRef: R,
      },
      version: 4,
    });
    at.close();
  });

  it("the park RETURNS the Ask, derived from the shipped declaration — whole", async () => {
    const at = await atGate("p-ask");
    const ask = at.ask;
    // NARROW ON A DISCRIMINATING KEY: the two members share none by
    // construction, so `allowedDecisions` tells the Ask from a dispatch.
    if (ask === null || !("allowedDecisions" in ask)) {
      throw new Error("the park did not return the Ask");
    }
    expect(ask).toEqual({
      instanceId: "p-ask",
      expectedVersion: 4,
      requestRef: R,
      operator: "human",
      question: "The reviewer has converged. Decide how this run continues.",
      recommendation: "approve",
      context: { task: "ship it", handoff: { note: "C" } },
      allowedDecisions: ["approve", "request_rework"],
      // `refs` is declared `required: false`, so it reaches NO
      // requirement list — the field is a REQUIRED-field list by its
      // own words.
      decisionRequirements: { approve: [], request_rework: ["instruction"] },
    });
    at.close();
  });

  it("WAITING(commit_pending): the approve route's park, with its ONE declared resume event", async () => {
    const at = await atCommitWait("p-wait");
    expect(await stateOf(at.store, at.id)).toStrictEqual({
      currentStep: "commit_pending",
      round: 1,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      // A BARE wait: no `requestRef` — the presence rule the type cannot
      // carry, asserted here rather than inferred from the optionality.
      wait: { kind: "commit_pending", requestedBy: "commit_pending", resumeEvents: ["COMMIT"] },
      version: 5,
    });
    at.close();
  });

  it("TERMINAL at `done` — reached ONLY through the human", async () => {
    const at = await atDone("p-done");
    expect(await stateOf(at.store, at.id)).toStrictEqual({
      currentStep: "done",
      round: 1,
      kernelStatus: "TERMINAL",
      terminalDisposition: "done",
      wait: null,
      version: 6,
    });
    at.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// The DECISION KEYS — both driven, with their round effect asserted in
// BOTH directions, and the produced per-edge `advancesRound` read off
// the admitted declaration beside them.
// ─────────────────────────────────────────────────────────────────────

describe("family 2 — both decision keys, and the round effect in BOTH directions", () => {
  it("the admitted gate and wait carry their per-edge advancesRound, and the two gate edges DISAGREE", () => {
    const steps = shipped.steps as unknown as Record<string, Record<string, unknown>>;
    // The flag is true iff the edge's TARGET is named in
    // `round.advanceOnArrivalAt` — `implement` is, `commit_pending` and
    // `done` are not. A build hard-wiring either answer for the class
    // reds here.
    expect(steps["human_approval"]?.["advancesRound"]).toStrictEqual({
      approve: false,
      request_rework: true,
    });
    expect(steps["commit_pending"]?.["advancesRound"]).toStrictEqual({ COMMIT: false });
  });

  it("`approve` routes to the wait and does NOT advance the round", async () => {
    const at = await atGate("k-approve");
    const outcome = await at.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: at.id,
      opId: "d1",
      expectedVersion: at.version,
      requestRef: R,
      verdict: "approve",
      by: "human",
    });
    expect(outcome).toMatchObject({ kind: "committed", version: 5 });
    // The approve route parks at a BARE wait, which awaits an inbound
    // event and is owed no directive.
    if (outcome.kind !== "committed") throw new Error("unreachable");
    expect(outcome.intent).toBeNull();
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "commit_pending",
      round: 1,
    });
    at.close();
  });

  it("`request_rework` returns to `implement`, ADVANCES the round, and its payload rides as the handoff", async () => {
    const at = await atGate("k-rework");
    const outcome = await at.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: at.id,
      opId: "d1",
      expectedVersion: at.version,
      requestRef: R,
      verdict: "request_rework",
      payload: { instruction: "tighten the error path" },
      override: true,
      by: "human",
    });
    expect(outcome).toMatchObject({ kind: "committed", version: 5 });
    if (outcome.kind !== "committed") throw new Error("unreachable");
    const dispatch = outcome.intent;
    if (dispatch === null || !("actor" in dispatch)) {
      throw new Error("the rework route did not return a DispatchIntent");
    }
    // The handoff is the SUBMITTED payload, not the pre-gate
    // transition's stale value.
    expect(dispatch.packet).toMatchObject({
      role: "implementer",
      instruction: "build it",
      handoff: { instruction: "tighten the error path" },
    });
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      wait: null,
      // `implement` IS the round declaration's arrival step, so the
      // rework round advances — the other direction of the same rule.
      round: 2,
    });
    at.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// The DECORRELATION lane — the same rule, driven where the shipped
// declaration cannot drive it. On the SHIPPED wiring the decision-key
// NAMES and the round EFFECTS correlate perfectly (`request_rework`
// advances, `approve` does not), so every lane above is satisfied by a
// runtime that hard-wires `edgeKey === "request_rework"` and never
// reads the admitted flag. THE ADMISSION-ONLY COUNTEREXAMPLE ABOVE DOES
// NOT CLOSE THAT: it never traverses the runtime path. This lane pulls
// name and effect APART on a DERIVED declaration and asserts BOTH
// directions THROUGH the kernel.
// ─────────────────────────────────────────────────────────────────────

/**
 * The shipped declaration with the gate's two decision TARGETS SWAPPED
 * and the rework key RENAMED — derived, never transcribed. The flag is
 * producer-owned, so the inversion is expressed the only way an author
 * can express it: `approve` now arrives at `implement`, which
 * `round.advanceOnArrivalAt` names, and the rework-shaped key — spelled
 * `send_back`, so no name/effect correlation survives — arrives at
 * `commit_pending`, which it does not. `review.recommends` still names
 * `approve`, which stays a declared key, so the derivation admits.
 */
const decorrelatedRound = admitDerived((base) => ({
  ...base,
  steps: {
    ...base.steps,
    human_approval: {
      ...stepOf(base, "human_approval"),
      decisions: {
        approve: { target: "implement" },
        send_back: { target: "commit_pending" },
      },
    },
  },
}));

describe("family 2 — the round effect follows the ADMITTED FLAG, not the decision key's NAME", () => {
  it("the derived gate's produced flags are INVERTED against the shipped ones", () => {
    const steps = decorrelatedRound.steps as unknown as Record<string, Record<string, unknown>>;
    // The decorrelation itself, measured: an `approve`-named edge whose
    // flag is TRUE and a rework-shaped edge whose flag is FALSE — the
    // exact opposite of the shipped pairing asserted above.
    expect(steps["human_approval"]?.["advancesRound"]).toStrictEqual({
      approve: true,
      send_back: false,
    });
  });

  it("RUNTIME: the `approve`-named edge carrying `advancesRound: true` ADVANCES the round", async () => {
    const at = await atGate("dc-approve", decorrelatedRound);
    const outcome = await at.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: at.id,
      opId: "d1",
      expectedVersion: at.version,
      requestRef: R,
      verdict: "approve",
      by: "human",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    // THE DISCRIMINATING ASSERTION, at exactly its proven width: a
    // runtime keyed on the NAME `request_rework` leaves the round at 1
    // here, so this lane closes the KEY-NAME mutant. It does NOT close
    // a TARGET-inferring one — the derivation moved the targets and
    // left the round declaration on `implement`, so `approve` here
    // both targets `implement` AND carries `true`, and a build reading
    // `target === "implement"` passes every assertion of this
    // describe — MEASURED, not argued: probe
    // `p3b-f1-decorrelated-lane-blind-to-target-mutant` runs this
    // describe under exactly that mutant and it stays GREEN. The
    // round-DECLARATION lane below is what reds it.
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      round: 2,
    });
    at.close();
  });

  it("RUNTIME: the rework-shaped edge carrying `advancesRound: false` does NOT advance the round", async () => {
    // The other direction, and it is not the mirror of the first by
    // construction: a runtime keyed on `edgeKey !== "approve"` — the
    // dual hard-wiring — advances here and reds.
    const at = await atGate("dc-sendback", decorrelatedRound);
    const outcome = await at.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: at.id,
      opId: "d1",
      expectedVersion: at.version,
      requestRef: R,
      // AGAINST the recorded `approve` recommendation, so the flag is
      // the override rung's due, not a round-lane convenience.
      verdict: "send_back",
      override: true,
      by: "human",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "commit_pending",
      kernelStatus: "WAITING",
      round: 1,
    });
    at.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// The ROUND-DECLARATION lane — the SECOND decorrelation, and the one
// the first cannot reach. Above, the gate's TARGETS moved while the
// round declaration stayed on `implement`, so every produced flag still
// AGREED with the predicate `target === "implement"`: a build that
// ignored the admitted flag and inferred the round off the target's
// name passed every lane there. Here the gate's `decisions` map is the
// SHIPPED one, untouched, and the ROUND DECLARATION moves instead —
// `advanceOnArrivalAt` names `commit_pending` — which produces the
// pairing that predicate cannot reproduce: an edge INTO `implement`
// that must NOT advance, and an edge away from it that must. Probe
// `p3b-f1b-round-effect-keyed-on-target` reds BOTH runtime lanes below
// under that mutant.
//
// RESIDUAL, stated because this lane's reach ends short of the claim it
// invites: a runtime that RECOMPUTES `target ∈ round.advanceOnArrivalAt`
// at arrival — rather than reading the per-edge flag admission produced
// — is behaviourally IDENTICAL to the correct one on every admissible
// template, since that membership is exactly what the expansion
// computes and admission rebuilds any hand-forged `advancesRound` from
// it. No suite can separate those two, this one included. That it is
// READ rather than recomputed is a code-shape rule (C39's ban,
// discharged by reading `arrival.ts`), not a testable behaviour.
//
// AND THE LANES TO HERE ARE STILL NARROWER THAN THE RULE, which is the
// third correlation and is stated rather than left to a reader: every
// `true` round effect driven above leaves a `human_gate` step, so the
// runtime `fromStep.type === "human_gate" ? admittedFlag : false`
// satisfies all of them. The SOURCE-CLASS section below closes that,
// and the width this file finally claims is stated there.
// ─────────────────────────────────────────────────────────────────────

/**
 * The shipped declaration with ONLY `round` overridden — derived, and
 * the gate's own `decisions` map left exactly as shipped. This is
 * authorable because `advanceOnArrivalAt` is a list of STEP ids with no
 * step-CLASS restriction (ch11-C37: every member of `keys(steps)` is
 * legal, terminal ids alone excluded; ch14-C1/C2/C3 partition the step
 * space without narrowing that membership), so the `commit_pending`
 * wait is a legal arrival point and the advancing target can be pulled
 * off `implement` entirely.
 */
const advanceAtTheWait = admitDerived((base) => ({
  ...base,
  round: { advanceOnArrivalAt: ["commit_pending"] },
}));

describe("family 2 — the round effect follows the ADMITTED FLAG, not the TARGET's name", () => {
  it("the derived gate's flags DISAGREE with `target === implement` on BOTH edges", () => {
    const steps = advanceAtTheWait.steps as unknown as Record<string, Record<string, unknown>>;
    // The decorrelation, measured: the `implement`-targeting edge is
    // FALSE and the `commit_pending`-targeting edge is TRUE — the exact
    // inversion of what the target's name would predict.
    expect(steps["human_approval"]?.["advancesRound"]).toStrictEqual({
      approve: true,
      request_rework: false,
    });
    // The agent edges move with the declaration, which is what keeps
    // the run below arriving at the gate on round 1.
    expect(steps["review"]?.["advancesRound"]).toStrictEqual({ PASS: false, CONVERGED: false });
    expect(steps["implement"]?.["advancesRound"]).toStrictEqual({ PASS: false });
  });

  it("RUNTIME: the edge INTO `implement` carrying `advancesRound: false` does NOT advance the round", async () => {
    const at = await atGate("ra-rework", advanceAtTheWait);
    const outcome = await at.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: at.id,
      opId: "d1",
      expectedVersion: at.version,
      requestRef: R,
      // AGAINST the recorded `approve` recommendation, so the override
      // flag is the rung's due rather than a round-lane convenience.
      verdict: "request_rework",
      payload: { instruction: "tighten the error path" },
      override: true,
      by: "human",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    // THE DISCRIMINATING ASSERTION: the run arrives AT `implement` and
    // the round must stay 1. A build answering `target === "implement"`
    // for the gate class reaches 2 here and reds.
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      round: 1,
    });
    at.close();
  });

  it("RUNTIME: the edge into the WAIT carrying `advancesRound: true` ADVANCES the round", async () => {
    // The other direction, and not the mirror of the first: it reds a
    // build that answers `target !== "implement"` — the dual
    // hard-wiring — and it reds one keyed on the name `approve` too.
    const at = await atGate("ra-approve", advanceAtTheWait);
    const outcome = await at.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: at.id,
      opId: "d1",
      expectedVersion: at.version,
      requestRef: R,
      verdict: "approve",
      by: "human",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "commit_pending",
      kernelStatus: "WAITING",
      round: 2,
    });
    at.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// The SOURCE-STEP CLASS lane — the THIRD decorrelation, and the one
// neither lane above reaches. Both of those move the GATE's own edges,
// so every `true` they drive originates at a `human_gate` source and
// the runtime `fromStep.type === "human_gate" ? admittedFlag : false`
// passes them while mishandling the SHIPPED `review` --PASS-->
// `implement` edge. ch11-C39 keys the flag on the TRANSITION —
// `advancesRound = (target ∈ advanceOnArrivalAt)`, with no source-class
// term — and ch14-C11 widens the expansion basis to all THREE edge
// classes (`transitions`, `decisions`, `onResume`), so the rule spans
// the whole of ch14-C1's step-class partition and the evidence must
// too.
//
// Both remaining classes are driven with a `true` edge here: the AGENT
// class off the SHIPPED template, needing no derivation at all because
// `review`'s PASS edge already targets `implement`, the shipped round
// declaration's own member; and the WAIT class off a derivation giving
// `commit_pending` a SECOND resume event routed back to `implement`.
// Probe `p3b-f1c-agent-source-round-effect-suppressed` reds the first
// and `p3b-f1d-wait-source-round-effect-suppressed` the second, each
// under exactly that mutant.
//
// The FALSE direction is driven for all three classes too — but a
// `false` edge only PAIRS with a class's `true` edge when the two agree
// on everything a build could key on instead of the flag, and the ones
// lying around do not: the PHASE-axis lane's `implement` --PASS-->
// `review` and the terminal lane's `commit_pending` --COMMIT--> `done`
// are `false` edges of the agent and wait classes whose TARGETS differ
// from those classes' `true` edges. So the agent lane below drives
// `review` --PASS--> `implement` a SECOND time on `advanceAtTheWait`,
// where source, edge key and target are all held and only the admitted
// flag moves; the gate row's pair is the shipped and derived `approve`
// edge; and the WAIT row's pair is driven on a FOURTH derivation
// (`resumeBackToImplementRoundAtTheWait`, below the wait describe) that
// re-runs `commit_pending` --RETRY--> `implement` under a round
// declaration naming `commit_pending` instead of `implement`. Every row
// therefore holds source, key AND target across its two flag values.
//
// THE MATRIX THIS FILE NOW DRIVES — ch14-C1's THREE step classes by
// both admitted flag values, every cell traversed at RUNTIME and never
// admission-only:
//
//   agent       true : shipped               `review` --PASS--> `implement`      1→2
//               false: advanceAtTheWait      `review` --PASS--> `implement`      1→1
//   human_gate  true : advanceAtTheWait      `approve` --> `commit_pending`      1→2
//               false: shipped               `approve` --> `commit_pending`      1→1
//   wait        true : resumeBackToImplement `RETRY` --> `implement`             1→2
//               false: resumeBackToImplement `COMMIT` --> `done`                 1→1
//               false: resumeBackToImplement `RETRY` --> `implement`             2→2
//                        RoundAtTheWait
//
// THE PAIR EACH ROW HOLDS — the SAME source step, the SAME edge key and
// the SAME target on both flag values, which is what makes the row a
// pair rather than two unrelated cells:
//
//   agent       `review` --PASS--> `implement`          shipped / advanceAtTheWait
//   human_gate  `approve` --> `commit_pending`          advanceAtTheWait / shipped
//   wait        `commit_pending` --RETRY--> `implement` resumeBackToImplement /
//                                                       …RoundAtTheWait
//
// The wait row keeps its `COMMIT` --> `done` cell beside the pair: it
// is not part of the held pair, and it is what reds a build that
// advances on ANY wait-sourced resume.
//
// THE CLOSURE RULE, now for ALL THREE rows: on every row the paired
// edges agree on the SOURCE step (its id, hence its class), on the EDGE
// KEY's name and on the TARGET's name, and disagree ONLY in the
// admitted flag. No predicate over those fields can answer both sides
// of any row — in any combination, and even applied PER CLASS, which is
// the form the earlier lanes each let through and the form the accepted
// near-miss took. Every per-class substitution is MEASURED rather than
// argued, each one run over the WHOLE file:
// `p3b-f1e-agent-source-target-inferred` reds the agent one,
// `p3b-f1h-gate-class-target-inferred` the gate one, and for the wait
// class `p3b-f1i-wait-class-target-inferred-closed`,
// `p3b-f1j-wait-class-key-inferred-closed` and
// `p3b-f1k-wait-class-key-and-target-inferred-closed` red the
// target-inferring, key-inferring and CONJUNCTION forms — the strongest
// predicate the three fields admit. On every class the flag must be
// READ.
//
// THE SUBSTITUTION SPACE IS FINER THAN THE CLASS, and that is measured
// too rather than left as a class-grain claim: the two wait-row edges
// leave the SAME source STEP, so even a build keyed on the source step
// ID instead of its class has nowhere to hide —
// `p3b-f1l-wait-source-step-target-inferred-closed` reds
// `from.stepId === "commit_pending" ? target === "implement" : flag`.
//
// TWO EARLIER PROBES ARE SUPERSEDED BY THIS ROW AND ARE KEPT, not
// deleted, because they are the evidence the hole was REAL:
// `p3b-f1f-wait-class-target-inferred-survives` and
// `p3b-f1g-wait-class-key-inferred-survives` recorded those exact two
// substitutions surviving the whole file (`suite_red: false`) when the
// wait row had no target-held pair. They describe a CLOSED hole, not an
// open one: `p3b-f1i-…` and `p3b-f1j-…` are the same two substitutions
// re-run against this file and RED. WHAT "SAME" MEANS HERE IS THE
// PREDICATE, NOT THE BYTES, and the distinction is stated rather than
// glossed: the f1f/f1g mutant VARIANTS were not kept as artifacts (the
// runner keeps only the receipt, the log and the baseline log), so the
// f1i/f1j mutants carry reconstructed mutant text and their
// `mutated_sha256` differs from f1f/f1g's. The link is measured rather
// than asserted — `p3b-f1m-wait-class-target-inferred-blind-to-the-OLD-
// wait-lanes` runs f1i's OWN mutant, byte-identical by
// `mutated_sha256`, against the PRE-EXISTING wait describe alone and
// records it still GREEN, so the FOURTH derivation below is
// demonstrably what closes it and nothing else in this file is.
//
// The matrix is closed on CELLS and on TARGET-HELD PAIRS for ALL THREE
// classes, and that is the width this file claims.
//
// C1's class set grows ADDITIVELY, so a step type a later chapter mints
// arrives here LANE-LESS: that is the derivation noticing, not a gap
// closed. The recompute residual above is untouched by any of this —
// it is a code-shape rule, not a behaviour, and no lane can move it.
// ─────────────────────────────────────────────────────────────────────

describe("family 2 — the round effect follows the ADMITTED FLAG from an AGENT source too", () => {
  it("the shipped `review` step's own edges DISAGREE, and the advancing one is AGENT-sourced", () => {
    const steps = shipped.steps as unknown as Record<string, Record<string, unknown>>;
    // No derivation is involved: `review` is an ordinary agent step —
    // its `type` is ABSENT, which IS the agent class — and its PASS edge
    // targets `implement`, which the shipped `round.advanceOnArrivalAt`
    // names. Restated here rather than borrowed from `admit.test.ts`
    // because the runtime lane below is what makes it observable.
    expect(steps["review"]?.["advancesRound"]).toStrictEqual({ PASS: true, CONVERGED: false });
  });

  it("RUNTIME: `review` --PASS--> `implement`, an AGENT-sourced advancing edge, ADVANCES the round", async () => {
    const at = await atReview("src-agent");
    const outcome = await at.kernel.handle({
      instanceId: at.id,
      opId: "a2",
      type: "PASS",
      actorId: "claude",
      expectedVersion: at.version,
      expectedRole: "reviewer",
      payload: { note: "back" },
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    // THE DISCRIMINATING ASSERTION: the SOURCE step is `review`, whose
    // class is agent, and the round must reach 2. A build that consults
    // the admitted flag only when the source is a `human_gate` — and
    // answers `false` for every other class — leaves it at 1 here.
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      round: 2,
    });
    at.close();
  });

  it("RUNTIME: the SAME agent edge carrying `advancesRound: false` does NOT advance the round", async () => {
    // THE PAIR OF THE LANE ABOVE, at the only width that makes it one:
    // the SOURCE step (`review`, agent class), the EDGE KEY (`PASS`)
    // and the TARGET (`implement`) are all held exactly as they are
    // there, and the ONLY thing that moves is the admitted flag —
    // `advanceAtTheWait` pulls the round declaration off `implement`
    // and onto `commit_pending` while leaving every step's
    // `transitions` map the shipped one, which is why the same triple
    // can carry the opposite flag at all. The admitted value itself is
    // asserted in that derivation's own describe above
    // (`review` → `{ PASS: false, CONVERGED: false }`); here it is
    // TRAVERSED.
    const at = await atReview("src-agent-false", advanceAtTheWait);
    const outcome = await at.kernel.handle({
      instanceId: at.id,
      opId: "a2",
      type: "PASS",
      actorId: "claude",
      expectedVersion: at.version,
      expectedRole: "reviewer",
      payload: { note: "back" },
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    // THE DISCRIMINATING ASSERTION: the run arrives AT `implement` from
    // an AGENT source and the round must stay 1. A build that reads the
    // admitted flag for the gate and wait classes but answers
    // `target === "implement"` for the AGENT class alone passes every
    // other lane in this file and reaches 2 here — MEASURED, not
    // argued: probe `p3b-f1e-agent-source-target-inferred` runs this
    // describe under exactly that mutant and it goes RED.
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      round: 1,
    });
    at.close();
  });
});

/**
 * The shipped declaration with the `commit_pending` WAIT step given a
 * SECOND resume event routed back to `implement` — derived, never
 * transcribed, and every other position the shipped fixture's own, the
 * `round` declaration included.
 *
 * THE ROWS SAY THIS IS AUTHORABLE, not the code: ch14-C3 closes the wait
 * keyset at `{ type, wait, onResume }` with `resumeEvents` a NONEMPTY
 * list of UNIQUE event-type ids and `onResume` an open map whose keys
 * are members of that list and whose values name a step or a terminal
 * id — so a second event routed to `implement` is an ordinary
 * declaration. ch14-C11 puts `onResume` in the `advancesRound`
 * expansion basis EXPLICITLY ("all three edge classes — `transitions`,
 * `decisions`, `onResume`"), which is why a wait step's resume edge
 * carries a flag at all; ch11-C39 computes it as
 * `target ∈ advanceOnArrivalAt` with no source-class term; and
 * ch11-C37 excludes only TERMINAL ids from that declaration, so
 * `implement` stays a legal member of it. The shipped `COMMIT` route to
 * `done` is left in place, so the terminal stays reachable.
 */
const resumeBackToImplement = admitDerived((base) => ({
  ...base,
  steps: {
    ...base.steps,
    commit_pending: {
      ...stepOf(base, "commit_pending"),
      wait: { kind: "commit_pending", resumeEvents: ["COMMIT", "RETRY"] },
      onResume: { COMMIT: "done", RETRY: "implement" },
    },
  },
}));

describe("family 2 — the round effect follows the ADMITTED FLAG from a WAIT source too", () => {
  it("the derived wait's two resume edges carry OPPOSITE flags", () => {
    const steps = resumeBackToImplement.steps as unknown as Record<string, Record<string, unknown>>;
    // `RETRY` targets `implement`, which the shipped round declaration
    // names; `COMMIT` targets the terminal `done`, which ch11-C37
    // forbids that declaration to name at all. The expansion producing
    // both is the one that produced the gate's flags — ch14-C11's THIRD
    // edge class, reached here for the first time at runtime.
    expect(steps["commit_pending"]?.["advancesRound"]).toStrictEqual({
      COMMIT: false,
      RETRY: true,
    });
  });

  it("RUNTIME: resuming a WAIT onto `implement` on a `true` edge ADVANCES the round", async () => {
    const at = await atCommitWait("src-wait", resumeBackToImplement);
    const outcome = await at.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: at.id,
      opId: "r1",
      expectedVersion: at.version,
      type: "RETRY",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    // THE DISCRIMINATING ASSERTION: the SOURCE step's `type` is `wait`,
    // the third and last of ch14-C1's classes, and the round must reach
    // 2. The same gate-only build reds here as well as on the agent
    // lane above — two independent classes, so a build answering only
    // one of them still reds.
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      round: 2,
    });
    at.close();
  });

  it("RUNTIME: the SAME wait's `false` edge still does NOT advance — both directions on ONE step", async () => {
    // Not the mirror of the lane above and not a duplicate of the
    // shipped terminal lane: here the two edges leave the SAME source
    // step under the SAME declaration, so a build that advanced on any
    // wait-sourced resume reds on this lane alone.
    const at = await atCommitWait("src-wait-commit", resumeBackToImplement);
    const outcome = await at.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: at.id,
      opId: "r1",
      expectedVersion: at.version,
      type: "COMMIT",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "done",
      kernelStatus: "TERMINAL",
      round: 1,
    });
    at.close();
  });
});

/**
 * THE FOURTH DERIVATION — the wait derivation above with the round
 * declaration ADDITIONALLY pulled off `implement`, which is the exact
 * composition of the two moves already made separately in this file:
 * `resumeBackToImplement`'s second resume route and `advanceAtTheWait`'s
 * round declaration. Derived, never transcribed; every other position
 * the shipped fixture's own.
 *
 * WHAT IT EXISTS FOR: the wait row's `true` cell is
 * `commit_pending` --RETRY--> `implement`, and until this derivation
 * existed the only wait-sourced `false` cell in the file was
 * `commit_pending` --COMMIT--> `done` — a different key AND a different
 * target, so the wait row had no TARGET-HELD pair and a wait-class-only
 * substitution of `target === "implement"` or `edgeKey === "RETRY"` for
 * the flag passed the whole file. Here the SAME source step, the SAME
 * edge key `RETRY` and the SAME target `implement` carry the OPPOSITE
 * admitted flag, so that substitution has nowhere left to hide.
 *
 * THE ROWS SAY THIS IS AUTHORABLE, and the deciding row is ch11-C37:
 * `advanceOnArrivalAt` is a NONEMPTY list whose every member must be a
 * member of `keys(steps)`, with TERMINAL ids the ONLY exclusion and no
 * step-CLASS restriction and no requirement that the start step be
 * named — so `["commit_pending"]` is a legal declaration and
 * `implement`'s absence from it is an ordinary authoring choice, not a
 * hole in the grammar. ch11-C39 then FIXES the flag as
 * `target ∈ advanceOnArrivalAt` with no source-class term, which is
 * what turns that absence into `RETRY: false` on an edge that is
 * otherwise identical to the `true` one above; ch14-C3 admits the
 * second resume event and its `onResume` route (the same clause the
 * derivation above cites); and ch14-C11 puts `onResume` in the
 * expansion basis, which is why the resume edge carries a flag at all.
 * No row is silent on any part of this, so nothing here is decided by
 * judgement.
 */
const resumeBackToImplementRoundAtTheWait = admitDerived((base) => ({
  ...base,
  steps: {
    ...base.steps,
    commit_pending: {
      ...stepOf(base, "commit_pending"),
      wait: { kind: "commit_pending", resumeEvents: ["COMMIT", "RETRY"] },
      onResume: { COMMIT: "done", RETRY: "implement" },
    },
  },
  round: { advanceOnArrivalAt: ["commit_pending"] },
}));

describe("family 2 — the WAIT row's pair, with the TARGET and the KEY held", () => {
  it("the SAME `RETRY` edge that carries `true` above carries `false` here", () => {
    const steps = resumeBackToImplementRoundAtTheWait.steps as unknown as Record<
      string,
      Record<string, unknown>
    >;
    // `RETRY` still targets `implement`; what moved is the round
    // declaration, so `implement` is no longer a member and ch11-C39's
    // membership computation answers `false` for it. `COMMIT` → `done`
    // is unchanged at `false` — a terminal id can never be a member
    // (ch11-C37), so that cell cannot move at all.
    expect(steps["commit_pending"]?.["advancesRound"]).toStrictEqual({
      COMMIT: false,
      RETRY: false,
    });
    // Where the park's round 2 below comes from: the gate's `approve`
    // edge now arrives at the declared step. Asserted here so the
    // runtime lane's starting number is derived rather than observed.
    expect(steps["human_approval"]?.["advancesRound"]).toStrictEqual({
      approve: true,
      request_rework: false,
    });
  });

  it("RUNTIME: the SAME wait edge — source, key and target all held — does NOT advance", async () => {
    const at = await atCommitWait("src-wait-held", resumeBackToImplementRoundAtTheWait);
    // The park's own arrival is the advancing one under this
    // declaration, so the resume starts from 2 rather than 1. Stated as
    // an assertion, not as a comment: the lane below claims the round
    // did not MOVE, and a claim about movement needs both endpoints.
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "commit_pending",
      kernelStatus: "WAITING",
      round: 2,
    });
    const outcome = await at.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: at.id,
      opId: "r1",
      expectedVersion: at.version,
      type: "RETRY",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    // THE DISCRIMINATING ASSERTION, and the one this whole derivation
    // was built for: the source step is `commit_pending` (wait class),
    // the edge key is `RETRY` and the target is `implement` — exactly
    // the triple the `true` lane above drives — and the round must stay
    // at 2. A build that reads the admitted flag for the agent and gate
    // classes but substitutes `target === "implement"`, or
    // `edgeKey === "RETRY"`, or their conjunction, for the WAIT class
    // alone reaches 3 here. MEASURED, not argued: probes
    // `p3b-f1i-wait-class-target-inferred-closed`,
    // `p3b-f1j-wait-class-key-inferred-closed` and
    // `p3b-f1k-wait-class-key-and-target-inferred-closed` run this
    // whole file under exactly those three mutants and it goes RED.
    expect(await stateOf(at.store, at.id)).toMatchObject({
      currentStep: "implement",
      kernelStatus: "ACTIVE",
      round: 2,
    });
    at.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// The RECOMMENDATION axis, driven as a COMBINATION lane over ONE
// recorded recommendation: an isolated lane cannot falsify an
// implementation that ignores the recommendation entirely.
// ─────────────────────────────────────────────────────────────────────

describe("family 2 — the recommendation axis, THREE cells over ONE recorded recommendation", () => {
  it("request_rework WITHOUT --override rejects; WITH it commits; approve WITH it rejects", async () => {
    // (1) AGAINST the recorded recommendation, no flag → refused, and
    // the payload is present so the guard order reaches the override
    // rung rather than answering `missing_required_field` first.
    const a = await atGate("rec-1");
    expect(
      await a.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: a.id,
        opId: "d1",
        expectedVersion: a.version,
        requestRef: R,
        verdict: "request_rework",
        payload: { instruction: "again" },
        by: "human",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "override_required" });
    // ZERO side effects: the refusal left the run on the gate.
    expect(await stateOf(a.store, a.id)).toMatchObject({
      currentStep: "human_approval",
      version: 4,
    });
    a.close();

    // (2) the SAME intent one flag later commits.
    const b = await atGate("rec-2");
    expect(
      await b.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: b.id,
        opId: "d1",
        expectedVersion: b.version,
        requestRef: R,
        verdict: "request_rework",
        payload: { instruction: "again" },
        override: true,
        by: "human",
      }),
    ).toMatchObject({ kind: "committed" });
    b.close();

    // (3) AGREEING with the recommendation while carrying the flag is
    // refused too — the rule is symmetric, and the shipped CONVERGED
    // edge is the first shipped edge to declare a recommendation at all.
    const c = await atGate("rec-3");
    expect(
      await c.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: c.id,
        opId: "d1",
        expectedVersion: c.version,
        requestRef: R,
        verdict: "approve",
        override: true,
        by: "human",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "override_not_applicable" });
    c.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// The SAME three cells over a NON-`approve` recommendation. The lane
// above records `approve` at every cell, so it is satisfied by a
// runtime that compares the verdict to the literal `"approve"` and
// never reads the RECORDED VALUE at all. Moving the recorded value is
// the only thing that separates the two, and it moves on a DERIVED
// declaration because the shipped edge declares exactly one.
// ─────────────────────────────────────────────────────────────────────

/** The shipped declaration with the CONVERGED edge recommending
 * `request_rework` instead of `approve` — one authored key overridden,
 * derived from the shipped fixture. Both are declared decision keys of
 * the same gate, so C6's membership rule is satisfied either way. */
const reworkRecommended = admitDerived((base) => ({
  ...base,
  steps: {
    ...base.steps,
    review: { ...stepOf(base, "review"), recommends: { CONVERGED: "request_rework" } },
  },
}));

describe("family 2 — the recommendation's VALUE is consulted: the same three cells, recommending `request_rework`", () => {
  it("the park RECORDS the moved recommendation, and the three cells INVERT with it", async () => {
    // (0) the recorded value itself — the Ask is where the operator
    // reads it, and every cell below is scoped by it.
    const zero = await atGate("nrec-0", reworkRecommended);
    const ask = zero.ask;
    if (ask === null || !("allowedDecisions" in ask)) {
      throw new Error("the park did not return the Ask");
    }
    expect(ask.recommendation).toBe("request_rework");
    zero.close();

    // (1) MATCHING the recorded recommendation with NO flag COMMITS.
    // THE DISCRIMINATING CELL: a runtime comparing the verdict to the
    // literal `"approve"` calls this against-recommendation and answers
    // `override_required` here.
    const a = await atGate("nrec-1", reworkRecommended);
    expect(
      await a.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: a.id,
        opId: "d1",
        expectedVersion: a.version,
        requestRef: R,
        verdict: "request_rework",
        payload: { instruction: "again" },
        by: "human",
      }),
    ).toMatchObject({ kind: "committed" });
    expect(await stateOf(a.store, a.id)).toMatchObject({
      currentStep: "implement",
      round: 2,
    });
    a.close();

    // (2) AGAINST it — `approve` this time — with no flag is REFUSED.
    // The mirror of the shipped lane's cell (1), and the pair is what
    // proves the rung reads the value rather than the key.
    const b = await atGate("nrec-2", reworkRecommended);
    expect(
      await b.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: b.id,
        opId: "d1",
        expectedVersion: b.version,
        requestRef: R,
        verdict: "approve",
        by: "human",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "override_required" });
    // ZERO side effects: the refusal left the run on the gate.
    expect(await stateOf(b.store, b.id)).toMatchObject({
      currentStep: "human_approval",
      version: 4,
    });
    b.close();

    // (3) the SAME `approve` one flag later commits — and reaches the
    // wait, so the override rung's answer is a route and not just a
    // verdict.
    const c = await atGate("nrec-3", reworkRecommended);
    expect(
      await c.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: c.id,
        opId: "d1",
        expectedVersion: c.version,
        requestRef: R,
        verdict: "approve",
        override: true,
        by: "human",
      }),
    ).toMatchObject({ kind: "committed" });
    expect(await stateOf(c.store, c.id)).toMatchObject({
      currentStep: "commit_pending",
      round: 1,
    });
    c.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// The SITE × SHAPE × PHASE grid — every DRIVEN cell, on the shipped
// template. Most off-diagonal cells are newly reachable HERE.
// ─────────────────────────────────────────────────────────────────────

describe("family 2 — submit-decision, at the gate: the key-scoped and payload shapes", () => {
  it("`unknown_decision`: a key outside the gate's declared two", async () => {
    const at = await atGate("s-unknown");
    expect(
      await at.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: at.id,
        opId: "d1",
        expectedVersion: at.version,
        requestRef: R,
        verdict: "ship_it",
        by: "human",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "unknown_decision" });
    at.close();
  });

  it("`missing_required_field`: request_rework with the flag and NO instruction", async () => {
    const at = await atGate("s-missing");
    expect(
      await at.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: at.id,
        opId: "d1",
        expectedVersion: at.version,
        requestRef: R,
        verdict: "request_rework",
        override: true,
        by: "human",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "missing_required_field" });
    at.close();
  });

  it("an UNDECLARED payload field beside `instruction` is CARRIED as data, never refused", async () => {
    const at = await atGate("s-extra");
    const outcome = await at.kernel.submitDecision({
      intent: "submit-decision",
      instanceId: at.id,
      opId: "d1",
      expectedVersion: at.version,
      requestRef: R,
      verdict: "request_rework",
      payload: { instruction: "again", severity: "high" },
      override: true,
      by: "human",
    });
    expect(outcome).toMatchObject({ kind: "committed" });
    if (outcome.kind !== "committed") throw new Error("unreachable");
    const dispatch = outcome.intent;
    if (dispatch === null || !("actor" in dispatch)) throw new Error("no dispatch");
    // The whole submitted payload rides the handoff — the undeclared
    // member included, uninterpreted.
    expect(dispatch.packet.handoff).toStrictEqual({
      instruction: "again",
      severity: "high",
    });
    at.close();
  });

  it("`operator_not_authorized`: the ONE ladder rung that reads the TEMPLATE's step graph", async () => {
    // Before this packet no shipped run could reach it: the claim
    // resolves the GATE STEP's declared role off the step graph and then
    // through the instance binding, and the shipped template declared no
    // gate step to resolve.
    const at = await atGate("s-authz");
    expect(
      await at.kernel.submitDecision({
        intent: "submit-decision",
        instanceId: at.id,
        opId: "d1",
        expectedVersion: at.version,
        requestRef: R,
        verdict: "approve",
        by: "not-the-operator",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "operator_not_authorized" });
    at.close();
  });
});

describe("family 2 — submit-decision, at every OTHER phase: `not_awaiting_decision`", () => {
  // Driven at the KERNEL grain: the shipped verb's own pre-read answers
  // the non-raced case first with the ch6 NoPendingDecision not-found
  // document, so the kernel rung is where the name is observable.
  const cells: readonly (readonly [string, (id: InstanceId) => Promise<Phase>])[] = [
    ["CREATED", atCreated],
    ["WAITING(kickoff_pending)", atKickoffHold],
    ["ACTIVE at `implement`", atImplement],
    ["ACTIVE at `review`", atReview],
    ["WAITING(commit_pending)", atCommitWait],
    ["TERMINAL(`done`)", atDone],
  ];
  for (const [phase, reach] of cells) {
    it(`${phase} → not_awaiting_decision`, async () => {
      const at = await reach(`nad-${phase.replace(/[^a-z]/gi, "")}`);
      expect(
        await at.kernel.submitDecision({
          intent: "submit-decision",
          instanceId: at.id,
          opId: "x1",
          expectedVersion: at.version,
          requestRef: R,
          verdict: "approve",
          by: "human",
        }),
      ).toStrictEqual({ kind: "rejected", reason: "not_awaiting_decision" });
      at.close();
    });
  }
});

describe("family 2 — resume, at every phase of the shipped run", () => {
  it("WAITING(commit_pending) + COMMIT: commits and reaches the terminal through the COMPLETE branch", async () => {
    const at = await atCommitWait("r-commit");
    const outcome = await at.kernel.resumeWait({
      intent: "resume-wait",
      instanceId: at.id,
      opId: "r1",
      expectedVersion: at.version,
      type: "COMMIT",
    });
    expect(outcome).toMatchObject({ kind: "committed", version: 6 });
    if (outcome.kind !== "committed") throw new Error("unreachable");
    expect(outcome.intent).toBeNull();
    at.close();
  });

  it("WAITING(commit_pending) + any other event: `resume_event_mismatch`", async () => {
    const at = await atCommitWait("r-mismatch");
    expect(
      await at.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: at.id,
        opId: "r1",
        expectedVersion: at.version,
        type: "ABORT",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "resume_event_mismatch" });
    at.close();
  });

  it("WAITING(human_decision) + COMMIT: `resume_event_mismatch` — the rung ORDER is what produces it", async () => {
    // A decision wait's resume events are its DECISION KEYS, so `COMMIT`
    // fails correlation BEFORE the wait-shape guard is reached.
    const at = await atGate("r-gate-commit");
    expect(
      await at.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: at.id,
        opId: "r1",
        expectedVersion: at.version,
        type: "COMMIT",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "resume_event_mismatch" });
    at.close();
  });

  it("WAITING(human_decision) + a DECISION KEY: `not_bare_wait` — the guard's FIRST named inhabitant", async () => {
    // The SIBLING of the cell above rather than a variant of it:
    // `approve` IS a declared resume event of a decision wait, so it
    // passes state AND correlation and lands on the shape guard. A lane
    // that never stages a decision key as the resume event never gets
    // here.
    const at = await atGate("r-gate-approve");
    expect(
      await at.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: at.id,
        opId: "r1",
        expectedVersion: at.version,
        type: "approve",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "not_bare_wait" });
    at.close();
  });

  it("WAITING(kickoff_pending) + KICKOFF: `not_bare_wait` — the guard's SECOND named inhabitant", async () => {
    const at = await atKickoffHold("r-hold");
    expect(
      await at.kernel.resumeWait({
        intent: "resume-wait",
        instanceId: at.id,
        opId: "r1",
        expectedVersion: at.version,
        type: "KICKOFF",
      }),
    ).toStrictEqual({ kind: "rejected", reason: "not_bare_wait" });
    at.close();
  });

  const notWaiting: readonly (readonly [string, (id: InstanceId) => Promise<Phase>])[] = [
    ["CREATED", atCreated],
    ["ACTIVE at `implement`", atImplement],
    ["ACTIVE at `review`", atReview],
    ["TERMINAL(`done`)", atDone],
  ];
  for (const [phase, reach] of notWaiting) {
    it(`${phase} → not_waiting — the state rung answers before any wait exists`, async () => {
      const at = await reach(`nw-${phase.replace(/[^a-z]/gi, "")}`);
      expect(
        await at.kernel.resumeWait({
          intent: "resume-wait",
          instanceId: at.id,
          // A FRESH op id: `atDone` reaches the terminal through its own
          // COMMIT resume, and re-using that id would answer `duplicate`
          // on the idempotency rung before the state rung is reached.
          opId: "r9",
          expectedVersion: at.version,
          type: "COMMIT",
        }),
      ).toStrictEqual({ kind: "rejected", reason: "not_waiting" });
      at.close();
    });
  }

  it("`no_resume_transition` is UNREACHABLE on this template — the route is declared, and that is why", () => {
    // The grid rules this cell out rather than leaving it undriven: the
    // shipped wait declares exactly one resume event and routes it, so
    // no declared event can arrive route-less. The name stays driven on
    // ch14-p2b's own fixture.
    const steps = shipped.steps as unknown as Record<string, Record<string, unknown>>;
    const wait = steps["commit_pending"]?.["wait"] as { resumeEvents: readonly string[] };
    const onResume = steps["commit_pending"]?.["onResume"] as Record<string, string>;
    expect(wait.resumeEvents).toStrictEqual(["COMMIT"]);
    expect(Object.keys(onResume)).toStrictEqual([...wait.resumeEvents]);
  });
});
