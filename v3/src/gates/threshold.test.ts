import { describe, expect, it } from "vitest";

import type { GateProjection } from "../domain/index.js";
import { thresholdRegistration } from "./threshold.js";

/**
 * `declarative.threshold` (packet ch11-P2a, G3/G4): the config lanes
 * (including dimension 5's hostile shapes + the numeric ladder) and the
 * evaluate semantics grid (below/at/above the boundary — the at-boundary
 * allow is the reorder catch). G7 purity: recursively deep-frozen inputs
 * + repeated-call determinism.
 */

const reg = thresholdRegistration;

function projection(round: number): GateProjection {
  return { round, currentStep: "review", eventType: "PASS", history: [] };
}

/** Recursive freeze covering every reachable mutable object (G7). */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

describe("declarative.threshold — the descriptor (G7)", () => {
  it("is a declarative inline registration, context-free, with an evaluator", () => {
    expect(reg.implementation).toBe("declarative");
    expect(reg.execution).toBe("inline");
    expect(reg.requiresRuntimeContext).toBe(false);
    expect(typeof reg.evaluate).toBe("function");
  });
});

describe("declarative.threshold — validateAndNormalizeConfig (G3)", () => {
  it("accepts the exact {metric, op, value} set and returns the validated identity as effective", () => {
    const result = reg.validateAndNormalizeConfig({ metric: "round", op: ">=", value: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effective).toEqual({ metric: "round", op: ">=", value: 2 });
  });

  it("C5: config REQUIRED — an absent config is ONE finding at the config root, uncoded", () => {
    const result = reg.validateAndNormalizeConfig(undefined);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("");
    expect(result.findings[0]?.message).toContain("requires a config");
    expect(result.findings[0]).not.toHaveProperty("code");
  });

  it("container precondition: a non-map config is ONE finding, dependent lanes suppressed (no key cascade)", () => {
    for (const raw of [42, "str", true, [], null]) {
      const result = reg.validateAndNormalizeConfig(raw);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.path).toBe("");
    }
  });

  it("missing member x3: an empty map reports metric, op, AND value as required (accumulated)", () => {
    const result = reg.validateAndNormalizeConfig({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings.map((f) => f.path).sort()).toEqual(["metric", "op", "value"]);
  });

  it("unknown key: a surplus key is a finding at that key's path", () => {
    const result = reg.validateAndNormalizeConfig({ metric: "round", op: ">=", value: 2, extra: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ path: "extra" });
  });

  it("non-allowlisted metric / op reject at their own paths", () => {
    const metricBad = reg.validateAndNormalizeConfig({ metric: "spins", op: ">=", value: 2 });
    expect(metricBad.ok).toBe(false);
    if (!metricBad.ok) {
      expect(metricBad.findings).toHaveLength(1);
      expect(metricBad.findings[0]?.path).toBe("metric");
    }
    const opBad = reg.validateAndNormalizeConfig({ metric: "round", op: ">", value: 2 });
    expect(opBad.ok).toBe(false);
    if (!opBad.ok) {
      expect(opBad.findings).toHaveLength(1);
      expect(opBad.findings[0]?.path).toBe("op");
    }
  });

  it("dimension 5 — the numeric ladder on `value`: every off-domain shape rejects at path value", () => {
    const badValues: readonly unknown[] = ["2", NaN, Infinity, -Infinity, 1.5, 0, -1, -0, 2 ** 53, true, null, {}];
    for (const value of badValues) {
      const result = reg.validateAndNormalizeConfig({ metric: "round", op: ">=", value });
      expect(result.ok, `value ${String(value)} must reject`).toBe(false);
      if (result.ok) continue;
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.path).toBe("value");
      expect(result.findings[0]?.message).toContain("safe integer");
    }
  });

  it("accepts value === 1 (the lower bound of the >= 1 domain)", () => {
    expect(reg.validateAndNormalizeConfig({ metric: "round", op: ">=", value: 1 }).ok).toBe(true);
  });

  it("G8 own-property: an INHERITED-key phantom is never read as a member (all three read as missing)", () => {
    const proto = { metric: "round", op: ">=", value: 2 };
    const config = Object.create(proto) as object;
    const result = reg.validateAndNormalizeConfig(config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings.map((f) => f.path).sort()).toEqual(["metric", "op", "value"]);
  });

  it("G8 own-property: a computed `__proto__` OWN key is caught as an unknown key", () => {
    const config = { ["__proto__"]: { injected: true }, metric: "round", op: ">=", value: 2 };
    const result = reg.validateAndNormalizeConfig(config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("__proto__");
  });
});

describe("declarative.threshold — evaluate (G4)", () => {
  /** G7 discipline on EVERY semantics lane (arm-gate-2 finding 3): the
   * inputs run recursively deep-frozen (a mutating evaluator throws in
   * strict mode) and every branch is called twice for determinism. */
  function evaluateFrozen(effective: unknown, round: number) {
    const frozenEffective = deepFreeze(effective);
    const proj = deepFreeze(projection(round));
    const first = reg.evaluate(frozenEffective, proj);
    const second = reg.evaluate(frozenEffective, proj);
    expect(second).toEqual(first);
    return first;
  }

  it("blocks with sys:round_below_min iff round < value; no reason/message/evidence otherwise (frozen + deterministic per branch)", () => {
    const effective = { metric: "round", op: ">=", value: 2 } as const;
    expect(evaluateFrozen({ ...effective }, 1)).toEqual({ verdict: "block", reason: "sys:round_below_min" });
    // the at-boundary allow (round === value): an off-by-one `<=` fails here.
    expect(evaluateFrozen({ ...effective }, 2)).toEqual({ verdict: "allow" });
    expect(evaluateFrozen({ ...effective }, 3)).toEqual({ verdict: "allow" });
  });

  it("never warns across the whole ladder (frozen + deterministic per branch)", () => {
    for (const round of [0, 1, 2, 3, 4, 99]) {
      expect(evaluateFrozen({ metric: "round", op: ">=", value: 3 }, round).verdict).not.toBe("warn");
    }
  });
});
