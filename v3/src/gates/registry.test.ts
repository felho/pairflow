import { describe, expect, it } from "vitest";

import type { InlineGateRegistration, ProcessGateRegistration } from "../ports/index.js";
import { previousReviewerVerdictRegistration } from "./previousReviewerVerdict.js";
import { createGateRegistry } from "./registry.js";
import { thresholdRegistration } from "./threshold.js";

/**
 * `createGateRegistry` (packet ch11-P2a, G2): the exact CURRENT member
 * set (both directions), resolution returning the registered descriptor,
 * unknown ids resolving null, and each member's G7 descriptor fields.
 * Plus the R1/R2 compile-negative type probes (isolation discipline: each
 * probe object is otherwise well-typed so its ONLY error is the target
 * field — an incomplete probe would satisfy `@ts-expect-error` through an
 * unrelated error, silently defeating the widening guard).
 */

describe("createGateRegistry — the static Block A composition (G2)", () => {
  const catalog = createGateRegistry();

  it("resolves declarative.threshold to its registration", () => {
    expect(catalog.resolve("declarative.threshold")).toBe(thresholdRegistration);
  });

  it("resolves pairflow.previous_reviewer_verdict to its registration", () => {
    expect(catalog.resolve("pairflow.previous_reviewer_verdict")).toBe(
      previousReviewerVerdictRegistration,
    );
  });

  it("contains NOTHING else: every other id resolves null — including P3's staged external.process", () => {
    for (const id of ["external.process", "declarative.Threshold", "pairflow.x", "", "nope"]) {
      expect(catalog.resolve(id), `resolve('${id}') must be null`).toBeNull();
    }
  });

  it("G7: each member is a context-free inline registration with its implementation axis", () => {
    const threshold = catalog.resolve("declarative.threshold");
    const packaged = catalog.resolve("pairflow.previous_reviewer_verdict");
    expect(threshold).toMatchObject({ implementation: "declarative", execution: "inline", requiresRuntimeContext: false });
    expect(packaged).toMatchObject({ implementation: "packaged", execution: "inline", requiresRuntimeContext: false });
  });

  it("composition, not mutation: the catalog exposes no registration/mutation API (note 5)", () => {
    const surface = catalog as unknown as Record<string, unknown>;
    expect(typeof surface["register"]).toBe("undefined");
    expect(Object.keys(catalog)).toEqual(["resolve"]);
  });
});

// ── R1/R2 compile-negative probes (validated by v3:typecheck via TS2578
// on an unused @ts-expect-error if the union ever widens) ──────────────

export const __probeDeferredExecution: InlineGateRegistration = {
  implementation: "declarative",
  // @ts-expect-error R1: the execution axis is pinned to "inline" — "deferred" is unrepresentable.
  execution: "deferred",
  requiresRuntimeContext: false,
  validateAndNormalizeConfig: () => ({ ok: true, effective: {} }),
  evaluate: () => ({ verdict: "allow" }),
};

export const __probeProcessWithEvaluate: ProcessGateRegistration = {
  implementation: "process",
  execution: "inline",
  requiresRuntimeContext: false,
  validateAndNormalizeConfig: () => ({ ok: true, effective: {} }),
  // @ts-expect-error R2: a process-implementation registration carries NO evaluate.
  evaluate: () => ({ verdict: "allow" }),
};

// @ts-expect-error R2: an inline registration MUST carry evaluate.
export const __probeInlineMissingEvaluate: InlineGateRegistration = {
  implementation: "packaged",
  execution: "inline",
  requiresRuntimeContext: false,
  validateAndNormalizeConfig: () => ({ ok: true, effective: {} }),
};
