import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  AdmittedTemplate,
  DecisionMadeEntry,
  DecisionRequestEntry,
  WaitResumedEntry,
  WorkflowTemplate,
} from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { createStaticProviderRegistry } from "./ports/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  fixtureDefinitionStore,
  replayTrace,
} from "./testkit/index.js";
import type { TraceFixture } from "./testkit/index.js";

/**
 * The `l3` chapter trace as a golden test (packet ch14-p2b, Q14/C25) —
 * FAMILY 15.
 *
 * BOTH LEGS RUN THROUGH THE REAL WALKING SKELETON FROM THE INGRESS,
 * under the controlled clock, with the post-condition checker kit green
 * at the end — which is what BINDS families 11 and 9 to the same run
 * rather than leaving each checker asserted in isolation.
 *
 * THE FIXTURE TEMPLATE IS AUTHORED HERE and is deliberately NOT the
 * shipped `local-pair-v0`. Since ch14-p3b the shipped template carries
 * gate wiring of its own, so the original ground — that the wiring was
 * still ch14-P3's to build — has expired; what stands is that this
 * trace pins the park/decide/resume machinery INDEPENDENTLY of the
 * product declaration, on three steps, one of each class this chapter
 * admits, which is what lets ONE template drive every target class a
 * decision can reach.
 *
 * The template is DIRECT-CHANNEL, so the gate class is spelled
 * `human_gate` — `humanGate` is the FILE-channel spelling and would not
 * typecheck here.
 */
const catalog = createGateRegistry();

const l3Template: WorkflowTemplate = {
  ref: { id: "l3-trace", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "gate" },
      recommends: { PASS: "approve" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "approve or send back",
      decisions: {
        approve: { target: "commit_wait" },
        request_rework: {
          target: "implement",
          payload: { instruction: { required: true } },
        },
      },
    },
    commit_wait: {
      type: "wait",
      wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] },
      onResume: { COMMIT: "done" },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, operator: { defaultActor: "human-1" } },
  // The rework loop-back advances; the forward path does not.
  round: { advanceOnArrivalAt: ["implement"] },
};

function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, catalog);
  if (!result.ok) {
    throw new Error(`l3 trace admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

/**
 * `R` is the request ref's PLACE, not a wildcard: the mint composes the
 * injected clock with a kernel-local counter, so under the controlled
 * clock it is a COMPUTABLE LITERAL and the fixture pins the computed
 * string. The clock is frozen at 1_000 and the gate park is the run's
 * FIRST minted request, so the ref is `req-1000-1`.
 */
const R = "req-1000-1";

function wire(clockAt: number): {
  readonly store: ReturnType<typeof openStore>;
  readonly admitted: AdmittedTemplate;
  readonly seams: Parameters<typeof replayTrace>[1];
} {
  const handle = openStore(":memory:", createControlledClock(clockAt));
  const admitted = admit(l3Template);
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
  const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
  return {
    store: handle,
    admitted,
    seams: {
      submit: (raw) => ingress.submit(raw),
      // Q13: the trace drives the operator intents through the INGRESS's
      // `submitIntent`, never the kernel handlers — driving the kernel
      // directly would leave the wire keysets unexercised by the
      // chapter's one end-to-end proof.
      submitIntent: (raw) => ingress.submitIntent(raw),
      create: (input) => kernel.create(input),
      start: (input) => kernel.start(input),
      store: handle.store,
      template: admitted,
    },
  };
}

/** LEG A — the main cycle: converge → park + Ask; approve →
 * `commit_pending`; COMMIT → done. */
const legA: TraceFixture = {
  name: "l3 golden trace · leg A (the main cycle)",
  steps: [
    {
      kind: "start",
      instanceId: "inst-l3a",
      task: "ship it",
      opId: "s0",
      expect: { currentStep: "implement", version: 2 },
    },
    // codex emits PASS → the gate park. Two rows in ONE commit.
    {
      kind: "emit",
      opId: "a1",
      type: "PASS",
      actorId: "codex",
      payload: { note: "P" },
      expectedVersion: 2,
      expectedRole: "implementer",
      expect: { kind: "committed", version: 3 },
    },
    // The operator approves → a BARE wait; output is NONE.
    {
      kind: "submit-decision",
      opId: "d1",
      expectedVersion: 3,
      requestRef: R,
      verdict: "approve",
      by: "human-1",
      expect: { kind: "committed", version: 4 },
    },
    // COMMIT resumes the bare wait → done (TERMINAL); output is NONE.
    {
      kind: "resume-wait",
      opId: "r1",
      expectedVersion: 4,
      type: "COMMIT",
      expect: { kind: "committed", version: 5 },
    },
  ],
  // The DECISION_REQUEST row is OP-LESS, so its pair carries its
  // `request_ref` where the other rows carry an op id.
  finalTranscript: [
    [1, "s0"],
    [2, "a1"],
    [3, R],
    [4, "d1"],
    [5, "r1"],
  ],
  finalState: {
    currentStep: "done",
    round: 1,
    kernelStatus: "TERMINAL",
    terminalDisposition: "done",
    version: 5,
  },
};

/** LEG B — the alternate override rework round. A SEPARATE fixture over
 * the SAME template, because one run cannot end both at `done` and at a
 * re-opened round. */
const legB: TraceFixture = {
  name: "l3 golden trace · leg B (the override rework round)",
  steps: [
    {
      kind: "start",
      instanceId: "inst-l3b",
      task: "ship it",
      opId: "s0",
      expect: { currentStep: "implement", version: 2 },
    },
    // This leg's arriving envelope carries NO payload, so the park's
    // `context_ref` is ABSENT — the field's rule is PRESENCE of the
    // payload, not its truth.
    {
      kind: "emit",
      opId: "a1",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
      expect: { kind: "committed", version: 3 },
    },
    // THE ONE PLACE the override rule, the round rule and the
    // zero-side-effects rule are observed on a single run: the verdict
    // is AGAINST the recorded recommendation and the flag is absent.
    // NOTHING is committed — no row, version unchanged.
    {
      kind: "submit-decision",
      opId: "d1",
      expectedVersion: 3,
      requestRef: R,
      verdict: "request_rework",
      payload: { instruction: "I" },
      by: "human-1",
      expect: { kind: "rejected", reason: "override_required" },
    },
    // The SAME intent one flag later advances the round and carries the
    // operator's instruction to the actor.
    {
      kind: "submit-decision",
      opId: "d1",
      expectedVersion: 3,
      requestRef: R,
      verdict: "request_rework",
      payload: { instruction: "I" },
      override: true,
      by: "human-1",
      expect: { kind: "committed", version: 4 },
    },
  ],
  finalTranscript: [
    [1, "s0"],
    [2, "a1"],
    [3, R],
    [4, "d1"],
  ],
  finalState: {
    currentStep: "implement",
    round: 2,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    version: 4,
  },
};

describe("l3 golden trace — the two operator intents through the real skeleton (C25)", () => {
  it("leg A: park + Ask → approve → bare wait → COMMIT → done", async () => {
    const { seams } = wire(1_000);
    const result = await replayTrace(legA, seams);

    // THE HANDLERS' RETURNED OUTPUT IS ASSERTED HERE and not only their
    // committed effect: Q1 fixes that both handlers return
    // `Committed(version, post_commit_output(…))`, and no other family
    // reaches the return value ON THESE LEGS. The harness compares kind
    // and version; the per-step OUTPUT is the fixture's own assertion.
    const [, arrival, decision, resume] = result.outcomes;

    // Step 2's output is the ASK, whole.
    if (arrival?.kind !== "committed") throw new Error("leg A step 2 did not commit");
    // NARROW ON A DISCRIMINATING FIELD (the standing rule the drift
    // corpus scanner enforces): the two members share no key by
    // construction, so `allowedDecisions` discriminates the Ask from a
    // dispatch. A bare type assertion would assert its way past the
    // widening rather than reading it.
    const ask = arrival.intent;
    if (ask === null || !("allowedDecisions" in ask)) {
      throw new Error("leg A step 2 did not return the Ask");
    }
    expect(ask).toEqual({
      instanceId: "inst-l3a",
      expectedVersion: 3,
      requestRef: R,
      operator: "human-1",
      question: "approve or send back",
      recommendation: "approve",
      context: { task: "ship it", handoff: { note: "P" } },
      allowedDecisions: ["approve", "request_rework"],
      decisionRequirements: { approve: [], request_rework: ["instruction"] },
    });

    // Step 3's decision handler returns NONE — it routes to a BARE wait,
    // which awaits an inbound event and is owed no directive.
    if (decision?.kind !== "committed") throw new Error("leg A step 3 did not commit");
    expect(decision.intent).toBeNull();

    // Step 4's resume handler returns NONE — the run is TERMINAL.
    if (resume?.kind !== "committed") throw new Error("leg A step 4 did not commit");
    expect(resume.intent).toBeNull();

    // The committed rows' class field sets, asserted as WHOLE values.
    const rows = result.finalDetail.transcript;
    const request = rows[2] as DecisionRequestEntry;
    expect(request).toEqual({
      entryKind: "DECISION_REQUEST",
      seq: 3,
      requestRef: R,
      recipient: "operator",
      decisions: ["approve", "request_rework"],
      recommendation: "approve",
      recommendationSource: { fromStep: "implement", eventType: "PASS" },
      contextRef: { note: "P" },
      committedAt: 1_000,
    });
    const made = rows[3] as DecisionMadeEntry;
    // NO `payload` (approve declares none) and NO `override` — the
    // verdict EQUALS the recommendation, so there was nothing to
    // override.
    expect(made).toEqual({
      entryKind: "DECISION_MADE",
      seq: 4,
      opId: "d1",
      decision: "approve",
      by: "human-1",
      requestRef: R,
      committedAt: 1_000,
    });
    const resumed = rows[4] as WaitResumedEntry;
    expect(resumed).toEqual({
      entryKind: "WAIT_RESUMED",
      seq: 5,
      opId: "r1",
      kind: "commit_pending",
      event: "COMMIT",
      committedAt: 1_000,
    });
  });

  it("leg B: override_required with ZERO side effects, then the same intent one flag later", async () => {
    const { seams } = wire(1_000);
    const result = await replayTrace(legB, seams);

    const [, , refused, committed] = result.outcomes;
    expect(refused).toEqual({ kind: "rejected", reason: "override_required" });

    // Step 4's decision handler returns a DispatchIntent for `implement`
    // whose handoff IS the submitted payload — which is what proves the
    // operator's instruction reaches the actor rather than the pre-gate
    // transition's stale value.
    if (committed?.kind !== "committed") throw new Error("leg B step 4 did not commit");
    const dispatch = committed.intent;
    if (dispatch === null || !("actor" in dispatch)) {
      throw new Error("leg B step 4 did not return a DispatchIntent");
    }
    // THE WHOLE RETURNED OUTPUT, as ONE equality — the same grain Leg
    // A's Ask is read at. Three selected members left the rest of the
    // packet unasserted on the only leg that returns one, which is the
    // shape a per-path divergence hides in.
    //
    // Inside it: THE HANDOFF IS THE SUBMITTED PAYLOAD — not the pre-gate
    // transition's value. A build threading the payload only into the
    // arrival's `arriving` dispatches with an EMPTY handoff here. And
    // `expectedVersion` is the POST-commit version, off by one if a
    // build projects the pre-arrival instance.
    expect(dispatch).toEqual({
      actor: "codex",
      packet: {
        instanceId: "inst-l3b",
        expectedVersion: 4,
        task: "ship it",
        role: "implementer",
        instruction: "build it",
        handoff: { instruction: "I" },
        availableOps: ["PASS"],
        effectiveAgentConfig: {},
        contextBlocks: [],
        runtimeContext: "none",
      },
    });

    const rows = result.finalDetail.transcript;
    // As leg A but with NO `context_ref`: this leg's arriving envelope
    // carries no payload.
    const request = rows[2] as DecisionRequestEntry;
    expect(request).toEqual({
      entryKind: "DECISION_REQUEST",
      seq: 3,
      requestRef: R,
      recipient: "operator",
      decisions: ["approve", "request_rework"],
      recommendation: "approve",
      recommendationSource: { fromStep: "implement", eventType: "PASS" },
      committedAt: 1_000,
    });
    const made = rows[3] as DecisionMadeEntry;
    expect(made).toEqual({
      entryKind: "DECISION_MADE",
      seq: 4,
      opId: "d1",
      decision: "request_rework",
      payload: { instruction: "I" },
      by: "human-1",
      requestRef: R,
      override: true,
      committedAt: 1_000,
    });
  });
});
