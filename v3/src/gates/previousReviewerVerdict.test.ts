import { describe, expect, it } from "vitest";

import type { GateProjection, GateProjectionEntry } from "../domain/index.js";
import { previousReviewerVerdictRegistration } from "./previousReviewerVerdict.js";

/**
 * `pairflow.previous_reviewer_verdict` (packet ch11-P2a, G5/G6): the
 * config lanes (reserved-toggle `required: false`, unknown key, non-map,
 * the absent-default) and the semantics grid — empty history / same-step
 * prior / other-step-only (the sensitivity catch a naive nonempty check
 * passes wrongly). G7 purity: the history ARRAY is deep-frozen too.
 */

const reg = previousReviewerVerdictRegistration;

function projection(history: readonly GateProjectionEntry[]): GateProjection {
  return { round: 1, currentStep: "review", eventType: "PASS", history };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

describe("pairflow.previous_reviewer_verdict — the descriptor (G7)", () => {
  it("is a packaged inline registration, context-free, with an evaluator", () => {
    expect(reg.implementation).toBe("packaged");
    expect(reg.execution).toBe("inline");
    expect(reg.requiresRuntimeContext).toBe(false);
    expect(typeof reg.evaluate).toBe("function");
  });
});

describe("pairflow.previous_reviewer_verdict — validateAndNormalizeConfig (G5)", () => {
  it("ABSENT config ⇒ effective {required: true} materialized", () => {
    const result = reg.validateAndNormalizeConfig(undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effective).toEqual({ required: true });
  });

  it("explicit {required: true} is preserved as effective {required: true}", () => {
    const result = reg.validateAndNormalizeConfig({ required: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effective).toEqual({ required: true });
  });

  it("reserved-toggle lane: {required: false} rejects, uncoded, at path required", () => {
    const result = reg.validateAndNormalizeConfig({ required: false });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ path: "required" });
    expect(result.findings[0]).not.toHaveProperty("code");
  });

  it("unknown key rejects at that key's path", () => {
    const result = reg.validateAndNormalizeConfig({ required: true, extra: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("extra");
  });

  it("a present-but-missing `required` (empty map) rejects at path required", () => {
    const result = reg.validateAndNormalizeConfig({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("required");
  });

  it("container precondition: a non-map config is ONE finding, suppressed", () => {
    for (const raw of [1, "x", [], null]) {
      const result = reg.validateAndNormalizeConfig(raw);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.path).toBe("");
    }
  });

  it("G8 own-property: an inherited `required` phantom is never read (present map ⇒ required missing)", () => {
    const config = Object.create({ required: true }) as object;
    const result = reg.validateAndNormalizeConfig(config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("required");
  });

  it("G8 own-property: a computed `__proto__` OWN key is caught as an unknown key (arm-gate-2 finding 4)", () => {
    const config = { ["__proto__"]: { injected: true }, required: true };
    const result = reg.validateAndNormalizeConfig(config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("__proto__");
  });
});

describe("pairflow.previous_reviewer_verdict — evaluate (G6)", () => {
  /** G7 discipline on EVERY semantics lane (arm-gate-2 finding 3): the
   * inputs run recursively deep-frozen — the history ARRAY included —
   * and every branch is called twice for determinism. */
  function evaluateFrozen(history: GateProjectionEntry[]) {
    const effective = deepFreeze({ required: true });
    const proj = deepFreeze(projection(deepFreeze(history)));
    const first = reg.evaluate(effective, proj);
    const second = reg.evaluate(effective, proj);
    expect(second).toEqual(first);
    return first;
  }

  it("empty history ⇒ block(sys:no_previous_verdict) (frozen + deterministic)", () => {
    expect(evaluateFrozen([])).toEqual({
      verdict: "block",
      reason: "sys:no_previous_verdict",
    });
  });

  it("a prior committed transition FROM the current step ⇒ allow (frozen + deterministic)", () => {
    expect(
      evaluateFrozen([{ stepId: "review", eventType: "PASS", role: "reviewer" }]),
    ).toEqual({ verdict: "allow" });
  });

  it("the sensitivity catch: history with OTHER-step entries only ⇒ block (a naive nonempty check passes wrongly; frozen + deterministic)", () => {
    expect(
      evaluateFrozen([
        { stepId: "implement", eventType: "PASS", role: "implementer" },
        { stepId: "triage", eventType: "PASS", role: "lead" },
      ]),
    ).toEqual({
      verdict: "block",
      reason: "sys:no_previous_verdict",
    });
  });
});
