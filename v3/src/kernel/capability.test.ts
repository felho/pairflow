import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { fixtureTemplate } from "../testkit/index.js";
import { capability } from "./capability.js";

/**
 * l1-pseudocode/capability (packet ch11-P1, matrix C + dimension 4):
 * profile present/absent × claim role own/other × allowed set
 * contains/lacks/empty. Explicit profiles are TYPE-LEVEL values —
 * directly constructed here, never format-borne (C4's proof
 * boundary).
 */

function withProfile(profile: WorkflowTemplate["capabilityProfile"]): WorkflowTemplate {
  return { ...fixtureTemplate(), ...(profile !== undefined ? { capabilityProfile: profile } : {}) };
}

describe("capability — default derivation (no profile)", () => {
  it("own role derives the step's transition event types (C2)", () => {
    expect(capability(fixtureTemplate(), "implementer", "implement")).toEqual(["PASS"]);
    expect([...capability(fixtureTemplate(), "reviewer", "review")].sort()).toEqual([
      "CONVERGED",
      "PASS",
    ]);
  });

  it("any other role derives the empty set (C3)", () => {
    expect(capability(fixtureTemplate(), "reviewer", "implement")).toEqual([]);
    expect(capability(fixtureTemplate(), "implementer", "review")).toEqual([]);
  });

  it("an unknown step id derives the empty set (no step, no transitions)", () => {
    expect(capability(fixtureTemplate(), "implementer", "nope")).toEqual([]);
  });
});

describe("capability — explicit profile (C1/C6, type-level channel)", () => {
  it("a profile hit is returned unconditionally (C1)", () => {
    const template = withProfile({ reviewer: { review: ["CONVERGED"] } });
    expect(capability(template, "reviewer", "review")).toEqual(["CONVERGED"]);
  });

  it("an explicit EMPTY allow list blocks everything for that pair (C6)", () => {
    const template = withProfile({ implementer: { implement: [] } });
    expect(capability(template, "implementer", "implement")).toEqual([]);
  });

  it("the profile takes precedence over default derivation even when it narrows (C1 over C2)", () => {
    const template = withProfile({ reviewer: { review: ["PASS"] } });
    // Default derivation would allow PASS + CONVERGED; the profile narrows.
    expect(capability(template, "reviewer", "review")).toEqual(["PASS"]);
  });

  it("a profile entry for another pair leaves this pair on default derivation", () => {
    const template = withProfile({ reviewer: { review: ["CONVERGED"] } });
    expect(capability(template, "implementer", "implement")).toEqual(["PASS"]);
  });
});

// ── arm gate 2 aftermath (ch11-P1): prototype-hazard lanes — the
// validated format legally admits __proto__/constructor ids. ──

describe("capability — own-property discipline on hostile ids", () => {
  it("a __proto__ role/step pair on a profile-bearing template derives from the OWN step, never the prototype chain", () => {
    const steps = Object.create(null) as Record<string, WorkflowTemplate["steps"][string]>;
    Object.defineProperty(steps, "__proto__", {
      value: { role: "__proto__", instruction: "i", transitions: { PASS: "done" } },
      enumerable: true,
    });
    const template: WorkflowTemplate = {
      ref: { id: "x", version: 1 },
      start: "__proto__",
      steps,
      terminal: ["done"],
      roles: {},
      capabilityProfile: { reviewer: { review: ["CONVERGED"] } },
    };
    expect(capability(template, "__proto__", "__proto__")).toEqual(["PASS"]);
  });

  it("an inherited key (constructor/toString) never reads a phantom profile entry or step", () => {
    const template: WorkflowTemplate = {
      ...fixtureTemplate(),
      capabilityProfile: { implementer: { implement: ["PASS"] } },
    };
    expect(capability(template, "constructor", "implement")).toEqual([]);
    expect(capability(template, "implementer", "toString")).toEqual([]);
  });
});
