import { describe, expect, it } from "vitest";

import type { WorkflowInstance, WorkflowTemplate } from "./../domain/index.js";
import type { DecisionRequestBody } from "./../ports/store.js";
import { humanDecisionRequest, requiredFields } from "./humanDecisionRequest.js";

/**
 * Drop keys from a request body WITHOUT a destructuring throwaway: the
 * lint's unused-vars rule is at its strict default here (no
 * ignoreRestSiblings, no `_` pattern), so `const { a: _drop, ...rest }`
 * is an error rather than an idiom. Typed, so a dropped key that stops
 * existing is a compile error rather than a silently vacuous lane.
 */
function omit<T extends object, K extends keyof T>(value: T, ...keys: readonly K[]): Omit<T, K> {
  const copy = { ...value } as Record<string, unknown>;
  for (const key of keys) {
    delete copy[key as string];
  }
  return copy as Omit<T, K>;
}

/**
 * Family: the Ask's field VALUES (dimension 8) — not presence.
 *
 * Every field here has a PLAUSIBLE WRONG SOURCE that a presence
 * assertion cannot see: the arriving step instead of the gate, the role
 * NAME instead of the resolved actor, the pre-commit version instead of
 * the post-commit one. Each lane names the wrong source it excludes.
 */

const TEMPLATE = (): WorkflowTemplate => ({
  ref: { id: "t", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "THE ARRIVING STEP'S INSTRUCTION",
      transitions: { PASS: "gate" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "approve it?",
      decisions: {
        approve: { target: "implement" },
        reject: { target: "done", payload: { why: { required: true }, note: {} } },
        defer: { target: "implement", payload: {} },
        soft: { target: "implement", payload: { hint: { required: false } } },
      },
    },
  },
  terminal: ["done"],
  roles: {
    implementer: { defaultActor: "codex" },
    operator: { defaultActor: "human-1" },
  },
});

/** POST-commit: parked at the gate, version already advanced. */
const PARKED = (): WorkflowInstance => ({
  instanceId: "i1",
  templateRef: { id: "t", version: 1 },
  task: "ship the thing",
  binding: { implementer: "codex", operator: "ACTOR-42" },
  currentStep: "gate",
  round: 3,
  kernelStatus: "WAITING",
  terminalDisposition: null,
  activationMode: "immediate",
  wait: { kind: "human_decision", requestedBy: "gate", resumeEvents: [], requestRef: "req-1" },
  runtimeContext: { state: "ready", ref: null },
  failureReason: null,
  runOverrides: {},
  version: 8,
});

const REQUEST: DecisionRequestBody = {
  requestRef: "req-1",
  recipient: "operator",
  decisions: ["approve", "reject", "defer", "soft"],
  recommendation: "approve",
  recommendationSource: { fromStep: "implement", eventType: "PASS" },
  contextRef: { note: "from the actor" },
};

const ask = (
  instance = PARKED(),
  template = TEMPLATE(),
  request: DecisionRequestBody = REQUEST,
) => humanDecisionRequest(instance, template, request);

describe("the Ask's resolved values (dimension 8)", () => {
  it("operator is the RESOLVED ACTOR ID — never the role name", () => {
    expect(ask().operator).toBe("ACTOR-42");
    expect(ask().operator).not.toBe("operator");
  });

  it("question is the GATE's instruction — never the arriving step's", () => {
    expect(ask().question).toBe("approve it?");
    expect(ask().question).not.toContain("ARRIVING");
  });

  it("allowedDecisions are the GATE's declared keys", () => {
    expect(ask().allowedDecisions).toEqual(["approve", "reject", "defer", "soft"]);
  });

  it("expectedVersion is the POST-COMMIT version — off by one if the pre-commit instance is projected", () => {
    expect(ask().expectedVersion).toBe(8);
  });

  it("carries the request's ref and recommendation", () => {
    expect(ask().requestRef).toBe("req-1");
    expect(ask().recommendation).toBe("approve");
  });

  it("omits recommendation entirely when the request carried none", () => {
    const bare = omit(REQUEST, "recommendation", "recommendationSource");
    expect("recommendation" in ask(PARKED(), TEMPLATE(), bare)).toBe(false);
  });
});

describe("the context projection, CLOSED at { task, handoff? }", () => {
  it("carries the run's task and the recorded context surface", () => {
    expect(ask().context).toStrictEqual({
      task: "ship the thing",
      handoff: { note: "from the actor" },
    });
  });

  it("omits handoff when no context surface was recorded", () => {
    const noContext = omit(REQUEST, "contextRef");
    expect("handoff" in ask(PARKED(), TEMPLATE(), noContext).context).toBe(false);
  });

  it("carries a FALSY recorded surface rather than dropping it", () => {
    const ctx = ask(PARKED(), TEMPLATE(), { ...REQUEST, contextRef: null }).context;
    expect("handoff" in ctx).toBe(true);
    expect(ctx.handoff).toBeNull();
  });

  it("a NULL task is integrity drift, not a widened field", () => {
    expect(() => ask({ ...PARKED(), task: null })).toThrow(/NULL task/);
  });
});

describe("decision_requirements over the four payload-spec shapes (C5)", () => {
  it("answers each shape at its own grain", () => {
    expect(ask().decisionRequirements).toStrictEqual({
      // no `payload` key at all
      approve: [],
      // a map with a required field — and a non-required sibling
      reject: ["why"],
      // an EMPTY payload map
      defer: [],
      // specs that are `{}` / `{required: false}` — the truthiness
      // filter's discriminating case: a build filtering on truthiness
      // of the SPEC would report `hint` as required.
      soft: [],
    });
  });
});

describe("required_fields — the ONE function p2b's submit guard reads", () => {
  it("is empty for an absent payload map", () => {
    expect(requiredFields(undefined)).toEqual([]);
  });

  it("selects on `required === true`, never truthiness of the spec", () => {
    expect(requiredFields({ a: {}, b: { required: false }, c: { required: true } })).toEqual(["c"]);
  });

  it("does not answer a prototype-named field with an inherited member", () => {
    expect(requiredFields({ toString: { required: true } })).toEqual(["toString"]);
    expect(requiredFields({ a: {} })).toEqual([]);
  });
});
