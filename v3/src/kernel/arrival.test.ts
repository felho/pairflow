import { describe, expect, it } from "vitest";

import type { WorkflowInstance, WorkflowTemplate } from "./../domain/index.js";
import { applyTargetEntryEffects } from "./arrival.js";
import type { ArrivalDeps } from "./arrival.js";

/**
 * Family 12 (STRUCTURAL SHARING) + the fan-out, round, recommendation,
 * context-surface and mint dimensions.
 *
 * What this file proves is STRUCTURAL, and the distinction is the
 * packet's own: `HANDLE` is p2a's ONLY arrival inhabitant, so the
 * BEHAVIOURAL sharing across entry paths is p2b's and a lane claiming
 * it here would be a logged instruction rather than an execution.
 */

const GATE_TEMPLATE = (): WorkflowTemplate => ({
  ref: { id: "t", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "gate", SKIP: "gate", LOOP: "implement" },
      advancesRound: { PASS: false, SKIP: false, LOOP: true },
      recommends: { PASS: "approve" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "approve it?",
      decisions: {
        approve: { target: "implement" },
        reject: { target: "done", payload: { why: { required: true }, note: {} } },
      },
    },
    hold: {
      type: "wait",
      wait: { kind: "ci_pending", resumeEvents: ["CI_DONE", "CI_FAILED"] },
      onResume: { CI_DONE: "implement" },
    },
  },
  terminal: ["done"],
  roles: {
    implementer: { defaultActor: "codex" },
    operator: { defaultActor: "human-1" },
  },
});

const INSTANCE = (): WorkflowInstance => ({
  instanceId: "i1",
  templateRef: { id: "t", version: 1 },
  task: "do it",
  binding: { implementer: "codex", operator: "human-1" },
  currentStep: "implement",
  round: 3,
  kernelStatus: "ACTIVE",
  terminalDisposition: null,
  activationMode: "immediate",
  wait: null,
  runtimeContext: { state: "ready", ref: null },
  failureReason: null,
  runOverrides: {},
  version: 7,
});

const deps = (): ArrivalDeps => {
  let n = 0;
  return {
    newRequestId: () => {
      n += 1;
      return `req-1000-${String(n)}`;
    },
  };
};

const arrive = (
  target: string,
  edgeKey = "PASS",
  arriving: { payload?: unknown } = {},
  d: ArrivalDeps = deps(),
) =>
  applyTargetEntryEffects(
    d,
    INSTANCE(),
    GATE_TEMPLATE(),
    { stepId: "implement", edgeKey },
    target,
    arriving,
    { model: "x" },
  );

describe("apply_target_entry_effects — the fan-out (dimension 2)", () => {
  it("terminal ⇒ TERMINAL + done, wait CLEARED", () => {
    const effect = arrive("done", "CONVERGED");
    expect(effect.newKernelStatus).toBe("TERMINAL");
    expect(effect.newTerminalDisposition).toBe("done");
    expect(effect.newWait).toBeNull();
    expect(effect.decisionRequest).toBeUndefined();
  });

  it("agent ⇒ ACTIVE, disposition null, wait CLEARED", () => {
    const effect = arrive("implement", "LOOP");
    expect(effect.newKernelStatus).toBe("ACTIVE");
    expect(effect.newTerminalDisposition).toBeNull();
    // The S5 same-move clear: ALWAYS explicit, never omitted.
    expect(effect.newWait).toBeNull();
    expect("newWait" in effect).toBe(true);
  });

  it("human_gate ⇒ WAITING with the decision wait AND the request row", () => {
    const effect = arrive("gate");
    expect(effect.newKernelStatus).toBe("WAITING");
    expect(effect.newWait).toStrictEqual({
      kind: "human_decision",
      requestedBy: "gate",
      resumeEvents: ["approve", "reject"],
      requestRef: "req-1000-1",
    });
    expect(effect.decisionRequest?.requestRef).toBe("req-1000-1");
  });

  it("wait ⇒ WAITING with the DECLARED kind, NO request row and NO requestRef", () => {
    const effect = arrive("hold", "SKIP");
    expect(effect.newKernelStatus).toBe("WAITING");
    expect(effect.newWait).toStrictEqual({
      kind: "ci_pending",
      requestedBy: "hold",
      resumeEvents: ["CI_DONE", "CI_FAILED"],
    });
    // The presence rule, from the ABSENT side — a bare wait never
    // carries a ref.
    expect(effect.newWait && "requestRef" in effect.newWait).toBe(false);
    expect(effect.decisionRequest).toBeUndefined();
  });

  it("an UNKNOWN discriminator token is kernel-integrity drift, never a default arm", () => {
    const template = GATE_TEMPLATE();
    const steps = template.steps as Record<string, { type?: string }>;
    steps["mystery"] = { type: "teleport" };
    expect(() =>
      applyTargetEntryEffects(
        deps(),
        INSTANCE(),
        template,
        { stepId: "implement", edgeKey: "PASS" },
        "mystery",
        {},
        {},
      ),
    ).toThrow(/unknown step type 'teleport'/);
  });
});

describe("round advancement (dimension 3) — CROSSED with the fan-out", () => {
  it("reads the SOURCE step's flag for the EDGE, not the target", () => {
    // Both edges land on the SAME target; only one advances. A build
    // inferring from target equality answers both the same way.
    expect(arrive("gate", "PASS").newRound).toBe(3);
    expect(arrive("implement", "LOOP").newRound).toBe(4);
  });

  it("advances on the gate branch too — the round write precedes the fan-out", () => {
    const template = GATE_TEMPLATE();
    const implement = template.steps["implement"] as { advancesRound?: Record<string, boolean> };
    implement.advancesRound = { PASS: true };
    const effect = applyTargetEntryEffects(
      deps(),
      INSTANCE(),
      template,
      { stepId: "implement", edgeKey: "PASS" },
      "gate",
      {},
      {},
    );
    expect(effect.newRound).toBe(4);
    expect(effect.newKernelStatus).toBe("WAITING");
  });

  it("an absent flag does NOT advance (explicit-flag consumption)", () => {
    expect(arrive("gate", "SKIP").newRound).toBe(3);
  });
});

describe("recommendation presence (dimension 4)", () => {
  it("RECORDED when the firing edge declared one — with its source", () => {
    const effect = arrive("gate", "PASS");
    expect(effect.decisionRequest?.recommendation).toBe("approve");
    expect(effect.decisionRequest?.recommendationSource).toStrictEqual({
      fromStep: "implement",
      eventType: "PASS",
    });
  });

  it("ABSENT when an eligible edge declared none — and the SOURCE goes with it", () => {
    const effect = arrive("gate", "SKIP");
    expect(effect.decisionRequest && "recommendation" in effect.decisionRequest).toBe(false);
    expect(effect.decisionRequest && "recommendationSource" in effect.decisionRequest).toBe(false);
  });

  it("ABSENT STRUCTURALLY when the source step's class cannot carry one", () => {
    // A gate-sourced arrival takes C13's FIRST absence branch by the
    // source's CLASS — not by a lookup that could find the wrong edge.
    const effect = applyTargetEntryEffects(
      deps(),
      INSTANCE(),
      GATE_TEMPLATE(),
      { stepId: "gate", edgeKey: "approve" },
      "gate",
      {},
      {},
    );
    expect(effect.decisionRequest && "recommendation" in effect.decisionRequest).toBe(false);
  });
});

describe("context surface (dimension 5) — PRESENCE, never truth", () => {
  it("records an authored payload", () => {
    expect(arrive("gate", "PASS", { payload: { note: "x" } }).decisionRequest?.contextRef).toEqual({
      note: "x",
    });
  });

  it.each([{}, null, "", 0])("records a FALSY payload %o as PRESENT", (payload) => {
    const effect = arrive("gate", "PASS", { payload });
    expect(effect.decisionRequest && "contextRef" in effect.decisionRequest).toBe(true);
    expect(effect.decisionRequest?.contextRef).toStrictEqual(payload);
  });

  it("omits the field when the arriving entry carried NO payload", () => {
    const effect = arrive("gate", "PASS", {});
    expect(effect.decisionRequest && "contextRef" in effect.decisionRequest).toBe(false);
  });
});

describe("request_ref distinctness and mint discipline (dimension 12)", () => {
  it("two parks mint DIFFERENT refs — never a constant, never step-derived", () => {
    const shared = deps();
    const a = arrive("gate", "PASS", {}, shared);
    const b = arrive("gate", "PASS", {}, shared);
    expect(a.decisionRequest?.requestRef).not.toBe(b.decisionRequest?.requestRef);
    expect(a.decisionRequest?.requestRef).not.toContain("gate");
  });

  it("the wait record and the request row carry the SAME ref", () => {
    const effect = arrive("gate");
    expect(effect.newWait?.requestRef).toBe(effect.decisionRequest?.requestRef);
  });
});

describe("own-property guarding — an authored prototype spelling", () => {
  it("does not answer a prototype-named edge with an INHERITED member", () => {
    const template = GATE_TEMPLATE();
    const implement = template.steps["implement"] as {
      transitions?: Record<string, string>;
      advancesRound?: Record<string, boolean>;
      recommends?: Record<string, string>;
    };
    implement.transitions = { ...implement.transitions, ["toString"]: "gate" };
    const effect = applyTargetEntryEffects(
      deps(),
      INSTANCE(),
      template,
      { stepId: "implement", edgeKey: "toString" },
      "gate",
      {},
      {},
    );
    // `advancesRound["toString"]` and `recommends["toString"]` both
    // resolve to inherited FUNCTIONS on an unguarded index.
    expect(effect.newRound).toBe(3);
    expect(effect.decisionRequest && "recommendation" in effect.decisionRequest).toBe(false);
  });
});

describe("purity", () => {
  it("mutates no argument", () => {
    const instance = INSTANCE();
    const template = GATE_TEMPLATE();
    const before = JSON.stringify({ instance, template });
    applyTargetEntryEffects(
      deps(),
      instance,
      template,
      { stepId: "implement", edgeKey: "PASS" },
      "gate",
      { payload: { a: 1 } },
      {},
    );
    expect(JSON.stringify({ instance, template })).toBe(before);
  });
});
