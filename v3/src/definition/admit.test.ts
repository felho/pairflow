import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { createGateRegistry } from "../gates/index.js";
import type { GateCatalog, InlineGateRegistration } from "../ports/index.js";
import { admitTemplate } from "./admit.js";
import type { ValidationFinding } from "./errors.js";

/**
 * `admitTemplate` (packet ch11-P2a, A1–A7): the admission lane grid over
 * directly-constructed templates (dimension 1, each lane staged so ONLY
 * the target fires), accumulation + all-or-nothing (dimension 2),
 * effective-config materialization (dimension 3), and the C7 finding
 * addresses with `[<i>]` segments (dimension 6). LANE-CODE FIDELITY: each
 * lane asserts the FULL finding object — path, message present, and
 * `code` present XOR absent per its C21 assignment.
 */

const catalog = createGateRegistry();

/** A structurally valid template; `reviewGates` is written onto the
 * review step's `gates` verbatim (hostile shapes bypass the type). */
function template(reviewGates?: unknown): WorkflowTemplate {
  const review: Record<string, unknown> = {
    role: "reviewer",
    instruction: "r",
    transitions: { PASS: "implement", CONVERGED: "done" },
  };
  if (reviewGates !== undefined) {
    review["gates"] = reviewGates;
  }
  return {
    ref: { id: "t", version: 1 },
    start: "implement",
    steps: {
      implement: { role: "implementer", instruction: "i", transitions: { PASS: "review" } },
      review,
    },
    terminal: ["done"],
    roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
  } as unknown as WorkflowTemplate;
}

function admitFail(reviewGates: unknown, cat: GateCatalog = catalog): readonly ValidationFinding[] {
  const result = admitTemplate(template(reviewGates), cat);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected admission to fail");
  }
  return result.findings;
}

describe("admitTemplate — the admission lane grid (dimension 1, lane-code fidelity)", () => {
  it("A3 unknown `uses`: the CODED gate_evaluator_unavailable lane — asserted on BOTH path and code", () => {
    const findings = admitFail({ PASS: [{ uses: "no.such.gate" }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0]");
    expect(findings[0]?.code).toBe("gate_evaluator_unavailable");
    expect(findings[0]?.message).toContain("no.such.gate");
  });

  it("A4/C2 dead event-type key: a gates key that is not a transition — UNCODED", () => {
    const findings = admitFail({ REJECTED: [{ uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 1 } }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "steps.review.gates.REJECTED" });
    expect(findings[0]).not.toHaveProperty("code");
    expect(typeof findings[0]?.message).toBe("string");
  });

  it("A4/C3 empty gate list — UNCODED", () => {
    const findings = admitFail({ PASS: [] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("A4/C5 config missing where required (threshold): surfaces at the binding's .config address — UNCODED", () => {
    const findings = admitFail({ PASS: [{ uses: "declarative.threshold" }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0].config");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("A5 per-registration config lane: a bad threshold metric lands at .config.<key> — UNCODED", () => {
    const findings = admitFail({ PASS: [{ uses: "declarative.threshold", config: { metric: "spins", op: ">=", value: 2 } }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0].config.metric");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("A5 reserved-toggle lane (previous_reviewer_verdict): required:false at .config.required — UNCODED", () => {
    const findings = admitFail({ PASS: [{ uses: "pairflow.previous_reviewer_verdict", config: { required: false } }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0].config.required");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("dimension 6: the [<i>] index segment tracks position (the second binding)", () => {
    const findings = admitFail({
      PASS: [
        { uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 1 } },
        { uses: "no.such.gate" },
      ],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "steps.review.gates.PASS[1]", code: "gate_evaluator_unavailable" });
  });
});

describe("admitTemplate — container-shape lanes with LOCAL dependent suppression (A2, note 3)", () => {
  it("a non-map gates value: ONE finding at steps.<stepId>.gates", () => {
    const findings = admitFail(42);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates");
  });

  it("a non-list gate pipeline: ONE finding at the event-type path", () => {
    const findings = admitFail({ PASS: 42 });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS");
  });

  it("a non-map gate binding: ONE finding at the binding path", () => {
    const findings = admitFail({ PASS: [42] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0]");
  });

  it("a non-map config: ONE finding at .config — no per-key cascade", () => {
    const findings = admitFail({ PASS: [{ uses: "declarative.threshold", config: 42 }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0].config");
  });
});

describe("admitTemplate — accumulation + all-or-nothing (dimension 2)", () => {
  it("reports the FULL finding set across bindings (three issues, two gates)", () => {
    const findings = admitFail({
      PASS: [{ uses: "declarative.threshold", config: { metric: "spins", op: ">=", value: 2 } }],
      CONVERGED: [
        { uses: "pairflow.previous_reviewer_verdict", config: { required: false } },
        { uses: "no.such.gate" },
      ],
    });
    const byPath = new Map(findings.map((f) => [f.path, f]));
    expect(findings).toHaveLength(3);
    expect(byPath.get("steps.review.gates.PASS[0].config.metric")).not.toHaveProperty("code");
    expect(byPath.get("steps.review.gates.CONVERGED[0].config.required")).not.toHaveProperty("code");
    expect(byPath.get("steps.review.gates.CONVERGED[1]")).toMatchObject({ code: "gate_evaluator_unavailable" });
  });

  it("the cross-binding lane: a broken CONTAINER on one binding + an unknown `uses` on another → BOTH (suppression is local)", () => {
    const findings = admitFail({
      PASS: [{ uses: "declarative.threshold", config: 42 }],
      CONVERGED: [{ uses: "no.such.gate" }],
    });
    expect(findings).toHaveLength(2);
    const paths = findings.map((f) => f.path).sort();
    expect(paths).toEqual(["steps.review.gates.CONVERGED[0]", "steps.review.gates.PASS[0].config"]);
  });

  it("all-or-nothing: ANY finding ⇒ no admitted value exists", () => {
    const result = admitTemplate(template({ PASS: [{ uses: "no.such.gate" }] }), catalog);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("template");
  });
});

describe("admitTemplate — effective-config materialization (dimension 3, A5)", () => {
  it("materializes the absent previous_reviewer_verdict default and preserves the threshold identity ONCE", () => {
    const result = admitTemplate(
      template({
        PASS: [
          { uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 2 } },
          { uses: "pairflow.previous_reviewer_verdict" },
        ],
      }),
      catalog,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pipeline = result.template.steps["review"]?.gates?.["PASS"];
    expect(pipeline).toEqual([
      { uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 2 } },
      { uses: "pairflow.previous_reviewer_verdict", config: { required: true } },
    ]);
  });

  it("preserves an explicit {required: true}", () => {
    const result = admitTemplate(
      template({ PASS: [{ uses: "pairflow.previous_reviewer_verdict", config: { required: true } }] }),
      catalog,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["review"]?.gates?.["PASS"]?.[0]?.config).toEqual({ required: true });
  });
});

describe("admitTemplate — the gate-free confinement (A8) and own-property write discipline (G8)", () => {
  it("a gate-free template admits with a structurally-equal value plus all-false round flags (C38)", () => {
    const raw = template();
    const result = admitTemplate(raw, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // ch11-P2c A1 + ch12-p1b G3 + ch12-p3 R1: the shape deltas are the
    // expanded per-step advancesRound map (declaration-absent ⇒ all-false,
    // C38), the MATERIALIZED activation default (absent ⇒ immediate, C1), and
    // the MATERIALIZED runtime-context requirement (absent ⇒ "none", C4).
    expect(result.template).toEqual({
      ...raw,
      activation: { mode: "immediate" },
      runtimeContext: "none",
      steps: {
        implement: { ...raw.steps["implement"], advancesRound: { PASS: false } },
        review: { ...raw.steps["review"], advancesRound: { PASS: false, CONVERGED: false } },
      },
    });
  });

  it("a step named __proto__ survives admission as an OWN key (defineOwn write, not bracket assignment)", () => {
    const raw = {
      ref: { id: "t", version: 1 },
      start: "s",
      steps: { ["__proto__"]: { role: "r", instruction: "i", transitions: {} } },
      terminal: [],
      roles: { r: {} },
    } as unknown as WorkflowTemplate;
    const result = admitTemplate(raw, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.hasOwn(result.template.steps, "__proto__")).toBe(true);
  });
});

describe("admitTemplate — the injected catalog (A3, note 5)", () => {
  it("resolution runs against the INJECTED catalog: an empty catalog makes every uses unknown", () => {
    const empty: GateCatalog = { resolve: () => null };
    const findings = admitFail({ PASS: [{ uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 1 } }] }, empty);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "steps.review.gates.PASS[0]", code: "gate_evaluator_unavailable" });
  });

  it("R4/A2 belt (arm-gate-2 finding 1): a cast-forged EMPTY-findings failure still blocks admission", () => {
    // The failure arm is statically nonempty; a hostile registration can
    // only express it through a cast — admission must still refuse to
    // admit (the synthesized finding), never brand with no effective
    // config.
    const forged: GateCatalog = {
      resolve: () => ({
        implementation: "declarative",
        execution: "inline",
        requiresRuntimeContext: false,
        validateAndNormalizeConfig: () =>
          ({ ok: false, findings: [] }) as unknown as ReturnType<
            InlineGateRegistration["validateAndNormalizeConfig"]
          >,
        evaluate: () => ({ verdict: "allow" }) as const,
      }),
    };
    const findings = admitFail({ PASS: [{ uses: "declarative.threshold", config: {} }] }, forged);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0].config");
    expect(findings[0]?.message).toContain("without findings");
    expect(findings[0]).not.toHaveProperty("code");
  });
});

// ── packet ch11-P2c: the round declaration — value-level lanes (A2/A3),
// the normalization completeness grid (A1/D2), producer monopoly (A1),
// and input purity (A4). ──────────────────────────────────────────────

/** `template()` + a `round` declaration (hostile shapes bypass the type). */
function withRound(round: unknown, reviewGates?: unknown): WorkflowTemplate {
  return { ...template(reviewGates), round } as unknown as WorkflowTemplate;
}

/** Recursive Object.freeze — a mutating implementation throws in strict
 * mode (ESM) on any frozen object it touches. */
function deepFreeze(value: unknown): void {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
}

/** Every INVALID round lane runs on a DEEP-FROZEN input (arm-gate-2
 * finding 1: A4's purity binds the FAILING path too — a validator that
 * mutates rejected inputs throws here, not just on the valid lane). */
function admitRoundFail(round: unknown, reviewGates?: unknown): readonly ValidationFinding[] {
  const input = withRound(round, reviewGates);
  deepFreeze(input);
  const result = admitTemplate(input, catalog);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected admission to fail");
  }
  return result.findings;
}

describe("admitTemplate — round declaration value-level lanes (dimension 3, A2/A3)", () => {
  it("an EMPTY advanceOnArrivalAt list → a finding at round.advanceOnArrivalAt", () => {
    const findings = admitRoundFail({ advanceOnArrivalAt: [] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("round.advanceOnArrivalAt");
    expect(findings[0]).not.toHaveProperty("code");
    expect(findings[0]?.message).toContain("empty");
  });

  it("an UNKNOWN member → a finding at round.advanceOnArrivalAt[<i>]", () => {
    const findings = admitRoundFail({ advanceOnArrivalAt: ["nope"] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("round.advanceOnArrivalAt[0]");
    expect(findings[0]?.message).toContain("not a step");
  });

  it("a TERMINAL-id member BY NAME → the same membership lane (C37's exclusion)", () => {
    // 'done' is terminal — it lives in template.terminal, NOT steps, so
    // the keys(steps) membership lane catches it.
    const findings = admitRoundFail({ advanceOnArrivalAt: ["done"] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("round.advanceOnArrivalAt[0]");
    expect(findings[0]?.message).toContain("'done'");
    expect(findings[0]?.message).toContain("not a step");
  });

  it("DUPLICATE members → a finding at the duplicate's index", () => {
    const findings = admitRoundFail({ advanceOnArrivalAt: ["implement", "implement"] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("round.advanceOnArrivalAt[1]");
    expect(findings[0]?.message).toContain("duplicated");
  });

  it("ACCUMULATION: a bad gate AND a bad round declaration report BOTH (C21/A3 one channel)", () => {
    const findings = admitRoundFail({ advanceOnArrivalAt: [] }, { PASS: [{ uses: "no.such.gate" }] });
    const paths = findings.map((f) => f.path).sort();
    expect(paths).toEqual(["round.advanceOnArrivalAt", "steps.review.gates.PASS[0]"]);
  });

  it("a VALID declaration admits", () => {
    const result = admitTemplate(withRound({ advanceOnArrivalAt: ["implement"] }), catalog);
    expect(result.ok).toBe(true);
  });
});

describe("admitTemplate — normalization completeness grid (dimension 4, A1/D2)", () => {
  /** a, b both transition into the LISTED target c; d has no transitions. */
  const gridTemplate = (round?: unknown): WorkflowTemplate =>
    ({
      ref: { id: "grid", version: 1 },
      start: "a",
      steps: {
        a: { role: "r", instruction: "i", transitions: { GO: "c" } },
        b: { role: "r", instruction: "i", transitions: { GO: "c" } },
        c: { role: "r", instruction: "i", transitions: { DONE: "end" } },
        d: { role: "r", instruction: "i", transitions: {} },
      },
      terminal: ["end"],
      roles: { r: {} },
      ...(round !== undefined ? { round } : {}),
    }) as unknown as WorkflowTemplate;

  it("two sources into one LISTED target → both flagged; empty-transitions step → empty map", () => {
    const result = admitTemplate(gridTemplate({ advanceOnArrivalAt: ["c"] }), catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["a"]?.advancesRound).toEqual({ GO: true });
    expect(result.template.steps["b"]?.advancesRound).toEqual({ GO: true });
    expect(result.template.steps["c"]?.advancesRound).toEqual({ DONE: false });
    expect(result.template.steps["d"]?.advancesRound).toEqual({});
  });

  it("absent declaration → all-false maps (asserted exactly)", () => {
    const result = admitTemplate(gridTemplate(), catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["a"]?.advancesRound).toEqual({ GO: false });
    expect(result.template.steps["b"]?.advancesRound).toEqual({ GO: false });
    expect(result.template.steps["c"]?.advancesRound).toEqual({ DONE: false });
    expect(result.template.steps["d"]?.advancesRound).toEqual({});
  });
});

describe("admitTemplate — producer monopoly (dimension 4, A1: input flags never trusted)", () => {
  it("a declared input with WRONG pre-populated maps → RECOMPUTED wholesale", () => {
    const hostile = {
      ...template(),
      round: { advanceOnArrivalAt: ["implement"] },
      steps: {
        implement: {
          role: "implementer",
          instruction: "i",
          transitions: { PASS: "review" },
          advancesRound: { PASS: true }, // WRONG: review ∉ [implement] ⇒ false
        },
        review: {
          role: "reviewer",
          instruction: "r",
          transitions: { PASS: "implement", CONVERGED: "done" },
          advancesRound: { PASS: false, CONVERGED: true }, // WRONG on both
        },
      },
    } as unknown as WorkflowTemplate;
    const result = admitTemplate(hostile, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["implement"]?.advancesRound).toEqual({ PASS: false });
    expect(result.template.steps["review"]?.advancesRound).toEqual({ PASS: true, CONVERGED: false });
  });

  it("a declaration-ABSENT input with pre-populated TRUE maps → ALL-FALSE", () => {
    const hostile = {
      ...template(),
      steps: {
        implement: {
          role: "implementer",
          instruction: "i",
          transitions: { PASS: "review" },
          advancesRound: { PASS: true },
        },
        review: {
          role: "reviewer",
          instruction: "r",
          transitions: { PASS: "implement", CONVERGED: "done" },
          advancesRound: { PASS: true, CONVERGED: true },
        },
      },
    } as unknown as WorkflowTemplate;
    const result = admitTemplate(hostile, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["implement"]?.advancesRound).toEqual({ PASS: false });
    expect(result.template.steps["review"]?.advancesRound).toEqual({ PASS: false, CONVERGED: false });
  });

  it("a GATED step with WRONG pre-populated maps → recomputed EXACTLY on the gated rebuild branch too", () => {
    // Arm-gate-2 finding 2: the `{ ...step, gates: admittedGates }` branch
    // needs its own exact-map/monopoly drive — a merge, stale key, or
    // extra key on the gated path fails toStrictEqual here.
    const hostile = {
      ...template(),
      round: { advanceOnArrivalAt: ["implement"] },
      steps: {
        implement: {
          role: "implementer",
          instruction: "i",
          transitions: { PASS: "review" },
        },
        review: {
          role: "reviewer",
          instruction: "r",
          transitions: { PASS: "implement", CONVERGED: "done" },
          // VALID binding (the file's gate-lane pattern) — admission succeeds.
          gates: { PASS: [{ uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 2 } }] },
          // WRONG on both keys: PASS→implement ∈ [implement] ⇒ true;
          // CONVERGED→done ∉ ⇒ false. Plus a STALE key no transition has.
          advancesRound: { PASS: false, CONVERGED: true, GHOST: true },
        },
      },
    } as unknown as WorkflowTemplate;
    const result = admitTemplate(hostile, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["review"]?.advancesRound).toStrictEqual({
      PASS: true,
      CONVERGED: false,
    });
    // The gateless sibling recomputes too (PASS→review ∉ [implement]).
    expect(result.template.steps["implement"]?.advancesRound).toStrictEqual({ PASS: false });
    // The gated rebuild branch really ran: the effective config landed.
    expect(result.template.steps["review"]?.gates?.["PASS"]).toEqual([
      { uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 2 } },
    ]);
  });
});

describe("admitTemplate — input purity (dimension 4, A4)", () => {
  it("a DEEP-FROZEN input template (incl. declaration + list) admits without throwing, declaration unmutated", () => {
    const input = withRound({ advanceOnArrivalAt: ["implement"] });
    const before = structuredClone(input.round);
    deepFreeze(input);
    // A mutating implementation throws in strict mode (ESM) on the frozen
    // declaration/list; a pure expander does not.
    const result = admitTemplate(input, catalog);
    expect(result.ok).toBe(true);
    // Before/after deep-equality on the declaration object (never mutated).
    expect(input.round).toEqual(before);
  });
});

// ── packet ch11-P3a: the external.process registration reached THROUGH
// admission — the V4/A9 code propagation, the C19 cross-rule (V5, lane s)
// in every direction, and the count member at its distinguishing arity. ──

/** A valid exitCode-mode process config. */
const validProcessConfig = {
  command: "gate.sh",
  timeoutMs: 1000,
  output: { mode: "exitCode" },
  onExit: { zero: "allow", nonzero: "block" },
};
/** The same config with `command` omitted → lane d (invalid_process_gate_config). */
const processConfigNoCommand = {
  timeoutMs: 1000,
  output: { mode: "exitCode" },
  onExit: { zero: "allow", nonzero: "block" },
};

/** ch12-p3: the retired "required" string migrated to a provisionable spec. */
const WORKTREE_SPEC = { kind: "worktree", provider: "pairflow.worktree" } as const;

/** `template()` + optional `runtimeContext` (hostile shapes bypass the type). */
function withRuntimeContext(
  runtimeContext: unknown,
  reviewGates?: unknown,
): WorkflowTemplate {
  const base = template(reviewGates);
  return (runtimeContext === undefined
    ? base
    : ({ ...base, runtimeContext } as unknown as WorkflowTemplate));
}

describe("admitTemplate — external.process code propagation (V4/A9) at the admission grain", () => {
  it("a coded config lane propagates its code to the C7-prefixed ValidationFinding path", () => {
    // command missing → lane d (invalid_process_gate_config). runtimeContext
    // declared so the C19 cross-rule stays silent — the config lane is isolated.
    const result = admitTemplate(
      withRuntimeContext(WORKTREE_SPEC, { PASS: [{ uses: "external.process", config: processConfigNoCommand }] }),
      catalog,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      path: "steps.review.gates.PASS[0].config.command",
      code: "invalid_process_gate_config",
    });
  });

  it("an UNCODED config lane stays code-free through admission (own-property parity)", () => {
    const result = admitTemplate(
      withRuntimeContext(WORKTREE_SPEC, { PASS: [{ uses: "external.process", config: { ...validProcessConfig, bogus: 1 } }] }),
      catalog,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("steps.review.gates.PASS[0].config.bogus");
    expect(result.findings[0]).not.toHaveProperty("code");
  });

  it("a valid process gate WITH runtimeContext: required ADMITS, effective config materialized", () => {
    const result = admitTemplate(
      withRuntimeContext(WORKTREE_SPEC, { PASS: [{ uses: "external.process", config: validProcessConfig }] }),
      catalog,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.runtimeContext).toEqual(WORKTREE_SPEC);
    expect(result.template.steps["review"]?.gates?.["PASS"]?.[0]?.config).toEqual({
      command: "gate.sh",
      timeoutMs: 1000,
      output: { mode: "exitCode" },
      onExit: { zero: "allow", nonzero: "block" },
      onRunnerError: "blockTransition",
      onTimeout: "blockTransition",
      reason: { zero: "sys:exit_zero", nonzero: "sys:exit_nonzero" },
    });
  });
});

describe("admitTemplate — the C19 cross-rule (V5, lane s), both directions", () => {
  it("a process gate WITHOUT runtimeContext → EXACTLY ONE finding at the top-level runtimeContext path", () => {
    const findings = admitFail({ PASS: [{ uses: "external.process", config: validProcessConfig }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("runtimeContext");
    expect(findings[0]?.code).toBe("runtime_context_required_for_process_gate");
  });

  it("the count member: N ≥ 2 offending process gates → EXACTLY ONE finding (the collapse)", () => {
    const findings = admitFail({
      PASS: [
        { uses: "external.process", config: validProcessConfig },
        { uses: "external.process", config: validProcessConfig },
      ],
      CONVERGED: [{ uses: "external.process", config: validProcessConfig }],
    });
    const crossRule = findings.filter(
      (f) => f.code === "runtime_context_required_for_process_gate",
    );
    expect(crossRule).toHaveLength(1);
    expect(crossRule[0]?.path).toBe("runtimeContext");
  });

  it("negative direction: a declaring template (runtimeContext: required) with a process gate ADMITS", () => {
    const result = admitTemplate(
      withRuntimeContext(WORKTREE_SPEC, { PASS: [{ uses: "external.process", config: validProcessConfig }] }),
      catalog,
    );
    expect(result.ok).toBe(true);
  });

  it("negative direction: a process-gate-FREE template admits WITHOUT the declaration", () => {
    const result = admitTemplate(
      template({ PASS: [{ uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 1 } }] }),
      catalog,
    );
    expect(result.ok).toBe(true);
  });

  it("negative direction: a process-gate-FREE template admits WITH the declaration present (C19 iff)", () => {
    const result = admitTemplate(withRuntimeContext(WORKTREE_SPEC), catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.runtimeContext).toEqual(WORKTREE_SPEC);
  });

  it("accumulation: an invalid process config AND a missing runtimeContext report BOTH", () => {
    const findings = admitFail({ PASS: [{ uses: "external.process", config: processConfigNoCommand }] });
    const codes = findings.map((f) => f.code).sort();
    expect(codes).toEqual(["invalid_process_gate_config", "runtime_context_required_for_process_gate"]);
  });

  it("the cross-rule fires even when the offending gate's config is invalid (the gate IS declared)", () => {
    const findings = admitFail({ PASS: [{ uses: "external.process", config: { command: "" } }] });
    expect(
      findings.some((f) => f.code === "runtime_context_required_for_process_gate" && f.path === "runtimeContext"),
    ).toBe(true);
  });
});

// ── packet ch11-P4: the admission extension lanes (A1/A2/A3) driven on
// the DIRECT channel via `admitTemplate` on cast-forged values (the
// A-rows' both-channels letter), plus the A3+C19 accumulation. ──────────

describe("admitTemplate — A1 the gate-binding UNKNOWN-KEY lane (C4, direct channel)", () => {
  it("a surplus own key is an UNCODED finding at its own C7 address", () => {
    const findings = admitFail({
      PASS: [{ uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 1 }, id: "x" }],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0].id");
    expect(findings[0]).not.toHaveProperty("code");
    expect(findings[0]?.message).toContain("unknown gate binding key");
  });

  it("the surplus-key lane ACCUMULATES with the config lanes (not a short-circuit)", () => {
    // `implementation` surplus key AND a bad threshold metric → BOTH.
    const findings = admitFail({
      PASS: [{ uses: "declarative.threshold", config: { metric: "spins", op: ">=", value: 1 }, implementation: "process" }],
    });
    const paths = findings.map((f) => f.path).sort();
    expect(paths).toEqual([
      "steps.review.gates.PASS[0].config.metric",
      "steps.review.gates.PASS[0].implementation",
    ]);
  });
});

describe("admitTemplate — A2 the `uses` GRAMMAR lane (C6, direct channel)", () => {
  const grammarInvalid = ["nodots", "Bad.Case", "a.b.", ".a.b", "a..b", "a.b c", "_x.y", "1.a"];
  for (const uses of grammarInvalid) {
    it(`a grammar-invalid uses ${JSON.stringify(uses)} → an UNCODED finding at .uses, never the coded lane`, () => {
      const findings = admitFail({ PASS: [{ uses }] });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.path).toBe("steps.review.gates.PASS[0].uses");
      expect(findings[0]).not.toHaveProperty("code");
    });
  }

  it("the grammar check runs BEFORE resolve: a grammatical-but-unknown id stays the CODED lane", () => {
    const findings = admitFail({ PASS: [{ uses: "no.such.gate" }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.review.gates.PASS[0]");
    expect(findings[0]?.code).toBe("gate_evaluator_unavailable");
  });

  it("the two-lane split, side by side: one grammar-invalid + one unknown-but-grammatical → uncoded AND coded", () => {
    const findings = admitFail({
      PASS: [{ uses: "nodots" }],
      CONVERGED: [{ uses: "no.such.gate" }],
    });
    const byPath = new Map(findings.map((f) => [f.path, f]));
    expect(byPath.get("steps.review.gates.PASS[0].uses")).not.toHaveProperty("code");
    expect(byPath.get("steps.review.gates.CONVERGED[0]")).toMatchObject({ code: "gate_evaluator_unavailable" });
  });
});

describe("admitTemplate — A3 the runtimeContext ILLEGAL-VALUE lane (C18, direct channel)", () => {
  it("R2: a present runtimeContext that is neither 'none' nor a spec map → an UNCODED finding at runtimeContext", () => {
    const result = admitTemplate(withRuntimeContext("optional"), catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("runtimeContext");
    expect(result.findings[0]).not.toHaveProperty("code");
    expect(result.findings[0]?.message).toContain("spec map");
  });

  it("R2: the retired bare 'required' string → the LOUD migration refusal (uncoded)", () => {
    const result = admitTemplate(withRuntimeContext("required"), catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.path).toBe("runtimeContext");
    expect(result.findings[0]).not.toHaveProperty("code");
    expect(result.findings[0]?.message).toContain("retired");
  });

  it("R4: an ILLEGAL value fires ONLY its own container finding — the C5 cross-rule is SUPPRESSED as its dependent", () => {
    const result = admitTemplate(
      withRuntimeContext("optional", { PASS: [{ uses: "external.process", config: validProcessConfig }] }),
      catalog,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const atRuntimeContext = result.findings.filter((f) => f.path === "runtimeContext");
    // ONLY the illegal-value (uncoded) finding — the C5 dependent is suppressed.
    expect(atRuntimeContext).toHaveLength(1);
    expect(atRuntimeContext.some((f) => f.code === "runtime_context_required_for_process_gate")).toBe(false);
    expect(atRuntimeContext[0]).not.toHaveProperty("code");
  });

  it("the negative direction: an ABSENT runtimeContext on an ungated template does not fire A3", () => {
    const result = admitTemplate(template(), catalog);
    expect(result.ok).toBe(true);
  });
});

// ── packet ch12-p2 (A family): the C7 run-profile value-level narrowing
// on the DIRECT-construction channel — steps.<s>.agentConfig and
// roles.<r>.defaultAgentConfig must be a MAP whose resolved values are
// canonical-JSON-safe. Claim-derived negatives (map + canonical-JSON-safe),
// never the implemented predicate's shape. (The file-channel parity lanes
// live in validate.test.ts, where load() runs validate → admit.)
describe("admitTemplate — the C7 agentConfig value-level narrowing (A1/A2)", () => {
  function admitWith(parts: {
    readonly stepAgentConfig?: unknown;
    readonly roleDefaultAgentConfig?: unknown;
  }): ReturnType<typeof admitTemplate> {
    const t = template() as unknown as {
      steps: Record<string, Record<string, unknown>>;
      roles: Record<string, Record<string, unknown>>;
    };
    if ("stepAgentConfig" in parts) {
      t.steps["implement"]!["agentConfig"] = parts.stepAgentConfig;
    }
    if ("roleDefaultAgentConfig" in parts) {
      t.roles["implementer"]!["defaultAgentConfig"] = parts.roleDefaultAgentConfig;
    }
    return admitTemplate(t as unknown as WorkflowTemplate, catalog);
  }

  function findingsOf(result: ReturnType<typeof admitTemplate>): readonly ValidationFinding[] {
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected admission to fail");
    return result.findings;
  }

  it("map-admits: a valid canonical-JSON map on BOTH positions admits", () => {
    const result = admitWith({
      stepAgentConfig: { approach: "systematic", refs: ["a", "b"] },
      roleDefaultAgentConfig: { mode: "builder", nested: { k: 1 } },
    });
    expect(result.ok).toBe(true);
  });

  it("steps-non-map-rejects: a non-map step agentConfig — ONE finding at steps.<s>.agentConfig", () => {
    for (const nonMap of ["a string", 42, true, ["a", "list"], null]) {
      const findings = findingsOf(admitWith({ stepAgentConfig: nonMap }));
      const at = findings.filter((f) => f.path === "steps.implement.agentConfig");
      expect(at).toHaveLength(1);
      expect(at[0]?.message).toMatch(/agentConfig must be a map/);
      // dependent-lane suppression: NOT also the canonical-safety lane.
      expect(at[0]?.message).not.toMatch(/canonical/);
    }
  });

  it("steps-non-canonical-rejects: a plain map with a non-finite value — the canonical-safety lane", () => {
    const findings = findingsOf(admitWith({ stepAgentConfig: { rate: Number.NaN } }));
    const at = findings.filter((f) => f.path === "steps.implement.agentConfig");
    expect(at).toHaveLength(1);
    expect(at[0]?.message).toMatch(/canonical-JSON-safe/);
  });

  it("steps-non-canonical-rejects: an Infinity member fails at admission (not at commit-time serialization)", () => {
    const findings = findingsOf(admitWith({ stepAgentConfig: { limit: Number.POSITIVE_INFINITY } }));
    expect(findings.some((f) => f.path === "steps.implement.agentConfig")).toBe(true);
  });

  it("roles-non-map-rejects (direct channel): a non-map defaultAgentConfig at roles.<r>.defaultAgentConfig", () => {
    const findings = findingsOf(admitWith({ roleDefaultAgentConfig: "not a map" }));
    const at = findings.filter((f) => f.path === "roles.implementer.defaultAgentConfig");
    expect(at).toHaveLength(1);
    expect(at[0]?.message).toMatch(/defaultAgentConfig must be a map/);
  });

  it("roles-non-canonical-rejects (direct channel): a map role default with a non-finite value", () => {
    const findings = findingsOf(admitWith({ roleDefaultAgentConfig: { weight: Number.NaN } }));
    const at = findings.filter((f) => f.path === "roles.implementer.defaultAgentConfig");
    expect(at).toHaveLength(1);
    expect(at[0]?.message).toMatch(/canonical-JSON-safe/);
  });

  it("both positions accumulate: a bad step config AND a bad role default → TWO path-addressed findings", () => {
    const findings = findingsOf(
      admitWith({ stepAgentConfig: 1, roleDefaultAgentConfig: 2 }),
    );
    const paths = findings.map((f) => f.path);
    expect(paths).toContain("steps.implement.agentConfig");
    expect(paths).toContain("roles.implementer.defaultAgentConfig");
  });

  it("the empty map admits (the vacuous run profile)", () => {
    expect(admitWith({ stepAgentConfig: {}, roleDefaultAgentConfig: {} }).ok).toBe(true);
  });
});

// ── ch12-p3 T1 compile-negative probe: runtimeContext's authored domain is
// RuntimeContextSpec | "none" | "required" | undefined — "optional" is NOT
// representable (validated by v3:typecheck via TS2578). ──
// @ts-expect-error T1: "optional" is not in the runtimeContext authored domain.
export const __probeRuntimeContextLiteral: WorkflowTemplate["runtimeContext"] = "optional";
