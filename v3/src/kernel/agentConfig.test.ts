import { describe, expect, it } from "vitest";

import type { AgentConfig, StepId, WorkflowInstance, WorkflowTemplate } from "../domain/index.js";
import { resolveAgentConfig } from "./agentConfig.js";

// ── Minimal fixtures ─────────────────────────────────────────────────
// The resolver reads exactly three sources: template.roles[role]
// .defaultAgentConfig, template.steps[step].agentConfig, and
// instance.runOverrides[step]. Everything else on the aggregates is
// inert here.

function template(parts: {
  readonly roleDefault?: AgentConfig;
  readonly stepConfig?: AgentConfig;
}): WorkflowTemplate {
  return {
    ref: { id: "t", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review" },
        ...(parts.stepConfig !== undefined ? { agentConfig: parts.stepConfig } : {}),
      },
      review: {
        role: "reviewer",
        instruction: "review it",
        transitions: { CONVERGED: "done" },
      },
    },
    terminal: ["done"],
    roles: {
      implementer: {
        defaultActor: "codex",
        ...(parts.roleDefault !== undefined ? { defaultAgentConfig: parts.roleDefault } : {}),
      },
      reviewer: { defaultActor: "claude" },
    },
  };
}

function instance(
  runOverrides: Readonly<Record<StepId, Readonly<Record<string, unknown>>>> = {},
): WorkflowInstance {
  return {
    instanceId: "i1",
    templateRef: { id: "t", version: 1 },
    task: "do it",
    binding: { implementer: "codex", reviewer: "claude" },
    currentStep: "implement",
    round: 1,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    activationMode: "immediate",
    wait: null,
    runtimeContext: { state: "ready", ref: null },
    failureReason: null,
    runOverrides,
    version: 2,
  };
}

describe("resolveAgentConfig — the L0c cascade (R family)", () => {
  it("R1: cascades role default ⊕ step config ⊕ run override, left to right", () => {
    const resolved = resolveAgentConfig(
      template({ roleDefault: { a: "role" }, stepConfig: { b: "step" } }),
      "implement",
      instance({ implement: { c: "override" } }),
    );
    expect(resolved).toEqual({ a: "role", b: "step", c: "override" });
  });

  it("R1: each layer defaults to {} — an all-empty cascade yields {}", () => {
    expect(resolveAgentConfig(template({}), "implement", instance())).toEqual({});
  });

  it("R1: a role with no default and a step with no config each contribute {}", () => {
    // review's role (reviewer) has no defaultAgentConfig; review has no
    // agentConfig; no override for review.
    expect(resolveAgentConfig(template({}), "review", instance())).toEqual({});
  });

  it("R2: three-layer precedence — the overriding layer wins for a key present in TWO layers", () => {
    // `k` present in all three layers; the rightmost (override) wins.
    const resolved = resolveAgentConfig(
      template({ roleDefault: { k: "role" }, stepConfig: { k: "step" } }),
      "implement",
      instance({ implement: { k: "override" } }),
    );
    expect(resolved).toEqual({ k: "override" });
  });

  it("R2: step wins over role when the override is absent (two-layer precedence)", () => {
    const resolved = resolveAgentConfig(
      template({ roleDefault: { k: "role" }, stepConfig: { k: "step" } }),
      "implement",
      instance(),
    );
    expect(resolved).toEqual({ k: "step" });
  });

  it("R2: a scalar overwrites wholesale", () => {
    const resolved = resolveAgentConfig(
      template({ roleDefault: { mode: "builder" }, stepConfig: { mode: "critic" } }),
      "implement",
      instance(),
    );
    expect(resolved).toEqual({ mode: "critic" });
  });

  it("R2: an array REPLACES — never deep-merges/concatenates", () => {
    const resolved = resolveAgentConfig(
      template({ roleDefault: { refs: ["a", "b"] }, stepConfig: { refs: ["c"] } }),
      "implement",
      instance(),
    );
    expect(resolved).toEqual({ refs: ["c"] });
  });

  it("R2: a nested map REPLACES wholesale — never deep-merges keys", () => {
    const resolved = resolveAgentConfig(
      template({ roleDefault: { policy: { x: 1, y: 2 } }, stepConfig: { policy: { x: 9 } } }),
      "implement",
      instance(),
    );
    expect(resolved).toEqual({ policy: { x: 9 } });
  });

  it("R2: an authored null is a VALUE that overwrites (no deletion semantics)", () => {
    const resolved = resolveAgentConfig(
      template({ roleDefault: { k: "role" }, stepConfig: { k: null } }),
      "implement",
      instance(),
    );
    expect(resolved).toEqual({ k: null });
    expect("k" in resolved).toBe(true);
  });

  it("R2: a key present only in the base layer survives unchanged", () => {
    const resolved = resolveAgentConfig(
      template({ roleDefault: { base: "kept" }, stepConfig: { extra: "added" } }),
      "implement",
      instance(),
    );
    expect(resolved).toEqual({ base: "kept", extra: "added" });
  });

  it("R4: a step with no matching override entry contributes {} (override inert)", () => {
    // runOverrides carries an entry for `review`, not `implement` — inert
    // for the implement dispatch.
    const resolved = resolveAgentConfig(
      template({ stepConfig: { b: "step" } }),
      "implement",
      instance({ review: { c: "other-step" } }),
    );
    expect(resolved).toEqual({ b: "step" });
  });

  it("R4: a runOverrides key ∉ keys(steps) is never read (inert)", () => {
    const resolved = resolveAgentConfig(
      template({}),
      "implement",
      instance({ nonexistent: { c: "ghost" } }),
    );
    expect(resolved).toEqual({});
  });

  it("R4: resolving a NON-step id yields {} — a ghost override key is never surfaced", () => {
    // The resolver is only called for a valid current step; a non-step id
    // has no role/step layer AND must not leak its OWN runOverrides entry
    // (would FAIL an impl that reads runOverrides[stepId] for a ghost id).
    const resolved = resolveAgentConfig(template({}), "ghost", instance({ ghost: { x: 1 } }));
    expect(resolved).toEqual({});
  });
});

describe("resolveAgentConfig — purity + determinism (R3)", () => {
  it("returns byte-identical output for identical inputs (deterministic)", () => {
    const t = template({ roleDefault: { a: 1 }, stepConfig: { b: 2 } });
    const i = instance({ implement: { c: 3 } });
    expect(resolveAgentConfig(t, "implement", i)).toEqual(resolveAgentConfig(t, "implement", i));
  });

  it("does NOT mutate any source layer, the template, or the instance (no side effects)", () => {
    const roleDefault = { a: "role" };
    const stepConfig = { b: "step" };
    const override = { c: "override" };
    const t = template({ roleDefault, stepConfig });
    const i = instance({ implement: override });
    const tBefore = JSON.stringify(t);
    const iBefore = JSON.stringify(i);
    resolveAgentConfig(t, "implement", i);
    expect(roleDefault).toEqual({ a: "role" });
    expect(stepConfig).toEqual({ b: "step" });
    expect(override).toEqual({ c: "override" });
    // no-template/instance-side-effect: the WHOLE aggregates are byte-equal
    // afterwards — catches a resolver mutating e.g. instance.version or
    // template.ref, which a source-layer-only check would miss.
    expect(JSON.stringify(t)).toBe(tBefore);
    expect(JSON.stringify(i)).toBe(iBefore);
  });

  it("returns a FRESH map — not an alias of any input layer", () => {
    const stepConfig = { b: "step" };
    const t = template({ stepConfig });
    const resolved = resolveAgentConfig(t, "implement", instance());
    expect(resolved).not.toBe(stepConfig);
    expect(resolved).toEqual({ b: "step" });
  });
});
