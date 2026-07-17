import { describe, expect, it } from "vitest";

import type { InlineGateRegistration, ProcessGateRegistration } from "../ports/index.js";
import { previousReviewerVerdictRegistration } from "./previousReviewerVerdict.js";
import { processRegistration } from "./process.js";
import { createGateRegistry, REGISTRY_IDS } from "./registry.js";
import { thresholdRegistration } from "./threshold.js";

/**
 * `createGateRegistry` (packet ch11-P2a G2, ch11-P3a G1): the exact
 * chapter-end THREE-member set (both directions), resolution returning the
 * registered descriptor, unknown ids resolving null, and each member's G7
 * descriptor fields. Plus the R1/R2/G2 compile-negative type probes
 * (isolation discipline: each probe object is otherwise well-typed so its
 * ONLY error is the target field — an incomplete probe would satisfy
 * `@ts-expect-error` through an unrelated error, silently defeating the
 * widening guard).
 */

describe("createGateRegistry — the static Block A composition (G1/G2)", () => {
  const catalog = createGateRegistry();

  it("resolves declarative.threshold to its registration", () => {
    expect(catalog.resolve("declarative.threshold")).toBe(thresholdRegistration);
  });

  it("resolves pairflow.previous_reviewer_verdict to its registration", () => {
    expect(catalog.resolve("pairflow.previous_reviewer_verdict")).toBe(
      previousReviewerVerdictRegistration,
    );
  });

  it("resolves external.process to its registration (ch11-P3a G1 — the null-probe FLIPS)", () => {
    expect(catalog.resolve("external.process")).toBe(processRegistration);
  });

  it("G1 exact-set (two-way): EXACTLY the three members resolve; every other id resolves null", () => {
    const members = ["declarative.threshold", "pairflow.previous_reviewer_verdict", "external.process"];
    for (const id of members) {
      expect(catalog.resolve(id), `resolve('${id}') must resolve`).not.toBeNull();
    }
    for (const id of ["external.Process", "declarative.Threshold", "pairflow.x", "process", "", "nope"]) {
      expect(catalog.resolve(id), `resolve('${id}') must be null`).toBeNull();
    }
  });

  it("G7: each member carries its implementation axis + context flag (threshold/packaged inline, process)", () => {
    expect(catalog.resolve("declarative.threshold")).toMatchObject({ implementation: "declarative", execution: "inline", requiresRuntimeContext: false });
    expect(catalog.resolve("pairflow.previous_reviewer_verdict")).toMatchObject({ implementation: "packaged", execution: "inline", requiresRuntimeContext: false });
    expect(catalog.resolve("external.process")).toMatchObject({ implementation: "process", execution: "inline", requiresRuntimeContext: true });
  });

  it("G2: external.process is the sole implementation=process member; all three are execution=inline", () => {
    const members = ["declarative.threshold", "pairflow.previous_reviewer_verdict", "external.process"].map(
      (id) => catalog.resolve(id),
    );
    expect(members.filter((m) => m?.implementation === "process")).toHaveLength(1);
    expect(members.every((m) => m?.execution === "inline")).toBe(true);
    // The process arm carries NO evaluate (foreclosed by the union — the G2
    // shipped-registration compile probe below proves it statically).
    expect(catalog.resolve("external.process")).not.toHaveProperty("evaluate");
  });

  it("composition, not mutation: the catalog exposes no registration/mutation API (note 5)", () => {
    const surface = catalog as unknown as Record<string, unknown>;
    expect(typeof surface["register"]).toBe("undefined");
    expect(Object.keys(catalog)).toEqual(["resolve"]);
  });
});

describe("REGISTRY_IDS — the exact-set single source (G1 enumerability)", () => {
  const catalog = createGateRegistry();

  it("equals EXACTLY the three C8 members (an undeclared fourth registration turns this red)", () => {
    expect([...REGISTRY_IDS]).toEqual([
      "declarative.threshold",
      "pairflow.previous_reviewer_verdict",
      "external.process",
    ]);
  });

  it("has length 3 — the chapter-end catalog size, measured", () => {
    expect(REGISTRY_IDS).toHaveLength(3);
  });

  it("every REGISTRY_IDS member resolves non-null (the catalog is built FROM this source)", () => {
    for (const id of REGISTRY_IDS) {
      expect(catalog.resolve(id), `resolve('${id}') must resolve`).not.toBeNull();
    }
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

// ── G2 (ch11-P3a): the standing process-arm probe extended to the SHIPPED
// registration — the process registration exposes NO evaluate property. ──
// @ts-expect-error G2: `evaluate` does not exist on the shipped process registration.
export const __probeShippedProcessNoEvaluate: unknown = processRegistration.evaluate;
