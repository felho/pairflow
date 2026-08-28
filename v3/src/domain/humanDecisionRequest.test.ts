import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  humanDecisionRequest as kernelHumanDecisionRequest,
  requiredFields as kernelRequiredFields,
} from "../kernel/index.js";

import type {
  DecisionRequestBody,
  WorkflowInstance,
  WorkflowTemplate,
} from "./index.js";
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

/**
 * F4's THREE ASSERTED PROPERTIES OF THE MOVE (packet ch14-p3a). Each has
 * a plausible wrong form that EVERY behavioural lane above would pass —
 * a barrel import inside `domain/`, a forwarding shim left behind at the
 * old home, a consumer still resolving to a second definition — so each
 * is asserted rather than left to a mechanical copy.
 */
describe("F4 — the move's own properties", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "humanDecisionRequest.ts"), "utf8");

  it("imports its domain siblings as LEAF modules, never through ./index.js", () => {
    // A barrel import here would buy a cycle INSIDE `domain/`.
    const imports = [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    for (const specifier of imports) {
      expect(specifier, specifier).not.toContain("index.js");
      // …and nothing outside `domain/` is reached at all: the function's
      // altitude is what makes `floor/` and `kernel/` both able to see it.
      expect(specifier, specifier).toMatch(/^\.\/[A-Za-z]+\.js$/);
    }
  });

  it("leaves NO forwarding shim and NO second definition at the old kernel home", () => {
    // A boundary check admits a superset and would not notice one.
    const kernelDir = join(here, "..", "kernel");
    expect(existsSync(join(kernelDir, "humanDecisionRequest.ts"))).toBe(false);
    expect(existsSync(join(kernelDir, "humanDecisionRequest.test.ts"))).toBe(false);
  });

  it("every declared consumer resolves its import to the NEW origin — the WHOLE inventory, function AND type", () => {
    // Object identity through the kernel barrel: a second definition
    // anywhere would give a different function value here.
    expect(kernelHumanDecisionRequest).toBe(humanDecisionRequest);
    expect(kernelRequiredFields).toBe(requiredFields);
    // …and EVERY declared consumer names `domain/`, never a kernel
    // sibling and never a local re-declaration. The inventory is F4's
    // OWN enumeration and includes the TYPE consumers — a source list
    // that named only the function consumers would leave
    // `DecisionRequestBody`'s home unmeasured, and a structurally
    // identical second declaration in `ports/store.ts` with the old
    // imports still pointing at it would pass every behavioural lane.
    const consumers = [
      // the function's consumers
      ["../kernel/index.ts", /export \{ humanDecisionRequest, requiredFields \} from "\.\.\/domain\/index\.js"/],
      ["../kernel/postCommitOutput.ts", /import type \{[^}]*\bDecisionRequestBody\b[^}]*\} from "\.\.\/domain\/index\.js"/],
      ["../kernel/postCommitOutput.ts", /import \{ humanDecisionRequest \} from "\.\.\/domain\/index\.js"/],
      ["../kernel/operatorIntents.ts", /import \{ requiredFields \} from "\.\.\/domain\/index\.js"/],
      ["../floor/floor.ts", /import \{ humanDecisionRequest \} from "\.\.\/domain\/index\.js"/],
      // the TYPE's consumers — the half the earlier list omitted
      ["../kernel/arrival.ts", /import type \{[^}]*\bDecisionRequestBody\b[^}]*\} from "\.\.\/domain\/index\.js"/],
      ["../kernel/operatorIntents.ts", /import type \{[^}]*\bDecisionRequestBody\b[^}]*\} from "\.\.\/domain\/index\.js"/],
      ["../ports/store.ts", /import type \{[^}]*\bDecisionRequestBody\b[^}]*\} from "\.\.\/domain\/index\.js"/],
      ["../store/sqliteStore.ts", /import type \{[^}]*\bDecisionRequestBody\b[^}]*\} from "\.\.\/domain\/index\.js"/],
      // …and the test files of those consumers follow their subject
      ["../kernel/postCommitOutput.test.ts", /import type \{[^}]*\bDecisionRequestBody\b[^}]*\} from "\.[^"]*domain\/index\.js"/],
      ["../store/sqliteStore.test.ts", /import type \{[^}]*\bDecisionRequestBody\b[^}]*\} from "\.[^"]*domain\/index\.js"/],
      ["../floor/floor.test.ts", /import \{ humanDecisionRequest \} from "\.\.\/domain\/index\.js"/],
    ] as const;
    for (const [file, pattern] of consumers) {
      expect(readFileSync(join(here, file), "utf8"), file).toMatch(pattern);
    }
  });

  it("the tree carries EXACTLY ONE declaration of each moved name", () => {
    // The consumer list above is an inventory of IMPORTS, and an
    // inventory can only ever say that the files it names are right. A
    // structurally identical SECOND declaration elsewhere — the shape
    // `ports/store.ts` carried before the move — is invisible to it and
    // to every behavioural lane, so the tree itself is swept.
    const root = join(here, "..");
    const files = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((entry) => entry.endsWith(".ts"))
      .map((entry) => join(root, entry));
    expect(files.length).toBeGreaterThan(50);

    const declarations = [
      ["DecisionRequestBody", /^export interface DecisionRequestBody\b/m],
      ["humanDecisionRequest", /^export function humanDecisionRequest\b/m],
      ["requiredFields", /^export function requiredFields\b/m],
    ] as const;
    for (const [name, pattern] of declarations) {
      const homes = files.filter((file) => pattern.test(readFileSync(file, "utf8")));
      expect(homes.map((file) => file.slice(root.length + 1)), name).toEqual([
        join("domain", "humanDecisionRequest.ts"),
      ]);
    }
  });
});
