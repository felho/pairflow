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
    // ch13v2-C13: the admitted binding's keyset is the carry list plus the
    // produced config — neither binding authors `contextBlockRefs`, so the
    // declared default materializes the empty list and the rebuild carries
    // it (a missing carry entry would drop an AUTHORED list, which the
    // admitted-form family drives directly).
    expect(pipeline).toEqual([
      { uses: "declarative.threshold", contextBlockRefs: [], config: { metric: "round", op: ">=", value: 2 } },
      { uses: "pairflow.previous_reviewer_verdict", contextBlockRefs: [], config: { required: true } },
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
    // ch11-P2c A1 + ch12-p1b G3 + ch12-p3 R1 + ch13v2-C1/C13: the shape
    // deltas are the expanded per-step advancesRound map
    // (declaration-absent ⇒ all-false, C38), the MATERIALIZED activation
    // default (absent ⇒ immediate, C1), the MATERIALIZED runtime-context
    // requirement (absent ⇒ "none", C4), the MATERIALIZED empty catalog
    // record, and the two ADMISSION-PRODUCED ref positions — one per roles
    // entry and one per step, each the EMPTY LIST because no agent config
    // is authored anywhere in this template (C13).
    expect(result.template).toEqual({
      ...raw,
      activation: { mode: "immediate" },
      runtimeContext: "none",
      contextBlocks: {},
      roles: {
        implementer: { defaultActor: "codex", promptConcernRefs: [] },
        reviewer: { defaultActor: "claude", promptConcernRefs: [] },
      },
      steps: {
        implement: { ...raw.steps["implement"], advancesRound: { PASS: false }, promptConcernRefs: [] },
        review: {
          ...raw.steps["review"],
          advancesRound: { PASS: false, CONVERGED: false },
          promptConcernRefs: [],
        },
      },
    });
  });

  it("a step named __proto__ survives admission as an OWN key (defineOwn write, not bracket assignment)", () => {
    const raw = {
      ref: { id: "t", version: 1 },
      start: "__proto__",
      steps: { ["__proto__"]: { role: "r", instruction: "i", transitions: {} } },
      terminal: ["done"],
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
      { uses: "declarative.threshold", contextBlockRefs: [], config: { metric: "round", op: ">=", value: 2 } },
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

// ═══════════════════════════════════════════════════════════════════════
// packet ch13-p1a — the context-block surface on the DIRECT channel.
//
// Family 1 (the declared-lane family) drives the ch13v2 lane inventory
// (contract ch13v2-C19) through the real admission entry, each lane at
// its OWN grain and each fixture asserting the WHOLE finding set —
// equality, never containment, so a spurious extra finding reds. Both
// directions per lane: the violating input produces exactly the declared
// finding at the declared path, the conforming one produces none.
// ═══════════════════════════════════════════════════════════════════════

/** The ch13 fixture base: one step with one transition (so a gates key
 * has an operand), one role, and whichever ch13 positions a row needs. */
function ctxTemplate(parts: {
  readonly contextBlocks?: unknown;
  readonly roleConfig?: unknown;
  readonly stepConfig?: unknown;
  readonly gates?: unknown;
} = {}): WorkflowTemplate {
  const step: Record<string, unknown> = { role: "r", instruction: "i", transitions: { GO: "done" } };
  if ("stepConfig" in parts) step["agentConfig"] = parts.stepConfig;
  if ("gates" in parts) step["gates"] = parts.gates;
  const role: Record<string, unknown> = {};
  if ("roleConfig" in parts) role["defaultAgentConfig"] = parts.roleConfig;
  const template: Record<string, unknown> = {
    ref: { id: "t", version: 1 },
    start: "s",
    steps: { s: step },
    terminal: ["done"],
    roles: { r: role },
  };
  if ("contextBlocks" in parts) template["contextBlocks"] = parts.contextBlocks;
  return template as unknown as WorkflowTemplate;
}

/** The whole finding set of one admission, or the empty list on success. */
function ctxFindings(parts: Parameters<typeof ctxTemplate>[0]): readonly ValidationFinding[] {
  const result = admitTemplate(ctxTemplate(parts), catalog);
  return result.ok ? [] : result.findings;
}

const THRESHOLD = { metric: "round", op: ">=", value: 2 } as const;
/** A one-binding pipeline, with the ref position authored iff supplied. */
const gateWith = (refs?: unknown): unknown => [
  refs === undefined
    ? { uses: "declarative.threshold", config: THRESHOLD }
    : { uses: "declarative.threshold", config: THRESHOLD, contextBlockRefs: refs },
];

const BLOCK_GRAMMAR = "^[a-z][a-z0-9-]*$";
const NONEMPTY_REF = 'invalid context block ref "": block ids are kebab-case strings';
const EMPTY_KEY = 'invalid context block id "": block ids are kebab-case strings';

interface LaneCase {
  /** The declaration tag whose lane this row drives. */
  readonly lane: string;
  readonly bad: Parameters<typeof ctxTemplate>[0];
  readonly findings: readonly ValidationFinding[];
  /** The same fixture with the one defect corrected: admits, zero findings. */
  readonly good: Parameters<typeof ctxTemplate>[0];
}

const CTX_LANES: readonly LaneCase[] = [
  {
    lane: "d-ctxblocks (container lane)",
    bad: { contextBlocks: 7 },
    findings: [{ path: "contextBlocks", message: "contextBlocks must be a map of block-id -> { body }; got 7" }],
    good: { contextBlocks: {} },
  },
  {
    // The key lane and C9's audit each report their own: a grammar-refused
    // key is still a key the catalog enumerates (ch13v2-C2 + C9).
    lane: "d-block-key (key lane) + the C9 audit reporting beside it",
    bad: { contextBlocks: { "Bad Key": { body: "x" } } },
    findings: [
      { path: "contextBlocks", message: `invalid context block id "Bad Key": block ids match ${BLOCK_GRAMMAR}` },
      { path: "contextBlocks.Bad Key", message: 'context block "Bad Key" is declared but no ref names it' },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "d-ctx-entry (container lane) + the C7 per-site finding beside it",
    bad: { contextBlocks: { alpha: 7 }, roleConfig: { promptConcernRefs: ["alpha"] } },
    findings: [
      { path: "contextBlocks.alpha", message: "a context block entry must be a map with exactly body; got 7" },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "alpha" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "d-ctx-entry (unknown-key lane)",
    bad: { contextBlocks: { alpha: { body: "x", extra: 1 } }, roleConfig: { promptConcernRefs: ["alpha"] } },
    findings: [
      {
        path: "contextBlocks.alpha.extra",
        message: 'unknown key "extra" (a context block entry\'s only key is body)',
      },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "alpha" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "d-ctx-entry (missing-key lane)",
    bad: { contextBlocks: { alpha: {} }, roleConfig: { promptConcernRefs: ["alpha"] } },
    findings: [
      { path: "contextBlocks.alpha", message: 'missing required key "body"' },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "alpha" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "d-ctx-body (type lane)",
    bad: { contextBlocks: { alpha: { body: 7 } }, roleConfig: { promptConcernRefs: ["alpha"] } },
    findings: [
      { path: "contextBlocks.alpha.body", message: "body must be a nonempty string; got 7" },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "alpha" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "d-ctx-body (nonempty lane)",
    bad: { contextBlocks: { alpha: { body: "" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
    findings: [
      { path: "contextBlocks.alpha.body", message: "body must be a nonempty string" },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "alpha" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  // vc-blockidlist's container lane is ONE declaration over THREE
  // positions, so the row is driven at each of them: the label and the
  // path are what differ, and a lane firing at the wrong one reds.
  {
    lane: "vc-blockidlist (container lane) at the ROLE position",
    bad: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: "nope" } },
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs",
        message: 'promptConcernRefs must be a list of context block ids; got "nope"',
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "vc-blockidlist (container lane) at the STEP position",
    bad: { contextBlocks: { alpha: { body: "x" } }, stepConfig: { promptConcernRefs: "nope" } },
    findings: [
      {
        path: "steps.s.agentConfig.promptConcernRefs",
        message: 'promptConcernRefs must be a list of context block ids; got "nope"',
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, stepConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "vc-blockidlist (container lane) at the GATE position",
    bad: { contextBlocks: { alpha: { body: "x" } }, gates: { GO: gateWith("nope") } },
    findings: [
      {
        path: "steps.s.gates.GO[0].contextBlockRefs",
        message: 'contextBlockRefs must be a list of context block ids; got "nope"',
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, gates: { GO: gateWith(["alpha"]) } },
  },
  {
    // No catalog: the member fails its OWN shape lane and is therefore
    // invisible to every list-level lane (ch13v2-C8), so the shape finding
    // is the whole set.
    lane: "vc-block-id (member type lane)",
    bad: { roleConfig: { promptConcernRefs: [7] } },
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: "invalid context block ref 7: block ids are kebab-case strings",
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    // The value class declares THREE lanes — type, nonempty, grammar —
    // and a node carrying several expands to all of them. The empty
    // string is the nonempty lane's own member: with the declaration
    // removed it falls through to the grammar lane and reports a
    // DIFFERENT message, which is what makes this row discriminating.
    lane: "vc-block-id (nonempty lane) at the MEMBER position",
    bad: { roleConfig: { promptConcernRefs: [""] } },
    findings: [
      { path: "roles.r.defaultAgentConfig.promptConcernRefs[0]", message: NONEMPTY_REF },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    // The key node's THIRD lane, on this channel. A plain record cannot
    // hold a non-string key, so the fixture is a Map — the hostile-cast
    // idiom this suite already uses — and the engine accepts a map
    // container on both channels, which is why the lane is reachable
    // here and not merely a file-channel property.
    lane: "vc-block-id (type lane) at the KEY position",
    bad: { contextBlocks: new Map<unknown, unknown>([[true, { body: "x" }]]) },
    findings: [
      { path: "contextBlocks", message: "invalid context block id true: block ids are kebab-case strings" },
      { path: "contextBlocks", message: 'context block true is declared but no ref names it' },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "vc-block-id (nonempty lane) at the KEY position",
    bad: { contextBlocks: { "": { body: "x" } } },
    findings: [
      { path: "contextBlocks", message: EMPTY_KEY },
      { path: "contextBlocks.", message: 'context block "" is declared but no ref names it' },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "vc-block-id (grammar lane)",
    bad: { roleConfig: { promptConcernRefs: ["Bad Ref"] } },
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: `invalid context block ref "Bad Ref": block ids match ${BLOCK_GRAMMAR}`,
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "vc-blockidlist (duplicate lane, per occurrence)",
    bad: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha", "alpha"] } },
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[1]",
        message: 'duplicate context block ref "alpha"',
      },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
  {
    lane: "vc-blockidlist (the CODED resolution lane)",
    bad: { roleConfig: { promptConcernRefs: ["ghost"] } },
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "ghost" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ],
    good: { contextBlocks: { ghost: { body: "x" } }, roleConfig: { promptConcernRefs: ["ghost"] } },
  },
  {
    // C9's semantic lane — the one member of the inventory the DECLARATION
    // does not carry (owner: packet row D7).
    lane: "the C9 hygiene lane",
    bad: { contextBlocks: { alpha: { body: "x" } } },
    findings: [
      { path: "contextBlocks.alpha", message: 'context block "alpha" is declared but no ref names it' },
    ],
    good: { contextBlocks: { alpha: { body: "x" } }, roleConfig: { promptConcernRefs: ["alpha"] } },
  },
];

describe("ch13-p1a family 1 — the ch13v2 lane inventory, DRIVEN (direct channel)", () => {
  for (const lane of CTX_LANES) {
    it(`${lane.lane}: the violating input produces exactly its finding set`, () => {
      expect(ctxFindings(lane.bad)).toStrictEqual(lane.findings);
    });

    it(`${lane.lane}: the conforming input produces none`, () => {
      expect(ctxFindings(lane.good)).toStrictEqual([]);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Family 2 — LANE INDEPENDENCE (packet row D13). Each normative pair is
// staged as a COMBINATION lane holding both conditions at once: isolated
// lanes cannot falsify a reordered implementation.
// ═══════════════════════════════════════════════════════════════════════

const HYGIENE = (id: string): ValidationFinding => ({
  path: `contextBlocks.${id}`,
  message: `context block ${JSON.stringify(id)} is declared but no ref names it`,
});

const UNRESOLVED = (path: string, id: string): ValidationFinding => ({
  path,
  message: `context block ref ${JSON.stringify(id)} does not resolve to an entry`,
  code: "unresolved_context_block_ref",
});

/** Findings addressed INSIDE the catalog. Where every entry is
 * well-formed, the hygiene lane is the only lane that can report there —
 * so the set is read structurally, never by matching message prose. */
function catalogFindings(findings: readonly ValidationFinding[]): readonly ValidationFinding[] {
  return findings.filter((f) => f.path === "contextBlocks" || f.path.startsWith("contextBlocks."));
}

describe("ch13-p1a family 2 — lane independence, the five normative pairs", () => {
  it("C1 + C7: refs issued BESIDE a refused catalog draw the container finding AND their per-site findings", () => {
    expect(
      ctxFindings({ contextBlocks: 7, roleConfig: { promptConcernRefs: ["alpha"] } }),
    ).toStrictEqual([
      { path: "contextBlocks", message: "contextBlocks must be a map of block-id -> { body }; got 7" },
      UNRESOLVED("roles.r.defaultAgentConfig.promptConcernRefs[0]", "alpha"),
    ]);
  });

  it("C7 + C8: a DUPLICATED unresolved ref reports per occurrence beside the duplicate finding", () => {
    // THREE findings, and the ORDER is the engine's own: the catalog is a
    // later field of the root than `roles`, so the resolution lane's
    // operand is still PENDING when the list is walked and both
    // occurrences DEFER to the drain, while the duplicate lane — which
    // reads nothing outside the list — reports in place.
    expect(
      ctxFindings({ contextBlocks: {}, roleConfig: { promptConcernRefs: ["ghost", "ghost"] } }),
    ).toStrictEqual([
      { path: "roles.r.defaultAgentConfig.promptConcernRefs[1]", message: 'duplicate context block ref "ghost"' },
      UNRESOLVED("roles.r.defaultAgentConfig.promptConcernRefs[0]", "ghost"),
      UNRESOLVED("roles.r.defaultAgentConfig.promptConcernRefs[1]", "ghost"),
    ]);
  });

  it("C8: a SHAPE-FAILING member repeated is invisible to every list-level lane — no duplicate, no membership", () => {
    expect(
      ctxFindings({ contextBlocks: {}, roleConfig: { promptConcernRefs: ["Bad Ref", "Bad Ref"] } }),
    ).toStrictEqual([
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: `invalid context block ref "Bad Ref": block ids match ${BLOCK_GRAMMAR}`,
      },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[1]",
        message: `invalid context block ref "Bad Ref": block ids match ${BLOCK_GRAMMAR}`,
      },
    ]);
  });

  it("C9's carve-out from C8: a GRAMMAR-FAILING mention still names its target, so the entry is not accused", () => {
    // `alpha` is named only by a member that failed its own shape lane.
    // C8 keeps that member invisible to the LIST-level lanes; C9's audit
    // is deliberately outside that rule and still counts the mention —
    // so the hygiene lane accuses `beta` and NOT `alpha`.
    const findings = ctxFindings({
      contextBlocks: { alpha: { body: "x" }, beta: { body: "x" } },
      roleConfig: { promptConcernRefs: ["alpha", "Bad Ref"] },
    });
    expect(catalogFindings(findings)).toStrictEqual([HYGIENE("beta")]);
  });

  it("C8's compound CLEAN case at the GATE position (an injected registry): zero findings", () => {
    expect(
      ctxFindings({
        contextBlocks: { alpha: { body: "x" }, beta: { body: "y" } },
        gates: { GO: gateWith(["alpha", "beta"]) },
      }),
    ).toStrictEqual([]);
  });
});

// ── The C9 stand-down, PARAMETERIZED over the derived trigger set, with
// the M1 floor as its checkable minimum. For each member: an enclosure
// broken by a MARKING malformation, the only mention of `alpha` sitting
// inside it, and `beta` mentioned nowhere at all — a template-wide
// stand-down leaves BOTH unaccused, and a per-entry one does not. Every
// row carries its DISCRIMINATING control: the same document without the
// malformation accuses both. ──────────────────────────────────────────

const TWO_BLOCKS = { alpha: { body: "x" }, beta: { body: "y" } };

interface StandDownCase {
  readonly tag: string;
  readonly broken: Parameters<typeof ctxTemplate>[0];
  readonly intact: Parameters<typeof ctxTemplate>[0];
}

const STAND_DOWN_FLOOR: readonly StandDownCase[] = [
  {
    tag: "d-prompt-refs (the role ref list itself)",
    broken: { contextBlocks: TWO_BLOCKS, roleConfig: { promptConcernRefs: "alpha" } },
    intact: { contextBlocks: TWO_BLOCKS, roleConfig: { promptConcernRefs: [] } },
  },
  {
    tag: "d-prompt-refs (the step ref list itself)",
    broken: { contextBlocks: TWO_BLOCKS, stepConfig: { promptConcernRefs: "alpha" } },
    intact: { contextBlocks: TWO_BLOCKS, stepConfig: { promptConcernRefs: [] } },
  },
  {
    tag: "d-ctx-gate-refs (the gate ref list itself)",
    broken: { contextBlocks: TWO_BLOCKS, gates: { GO: gateWith("alpha") } },
    intact: { contextBlocks: TWO_BLOCKS, gates: { GO: gateWith([]) } },
  },
  {
    tag: "d-agentconfig (the step's config container)",
    broken: { contextBlocks: TWO_BLOCKS, stepConfig: 7 },
    intact: { contextBlocks: TWO_BLOCKS, stepConfig: {} },
  },
  {
    tag: "d-defaultagent (the role's config container)",
    broken: { contextBlocks: TWO_BLOCKS, roleConfig: 7 },
    intact: { contextBlocks: TWO_BLOCKS, roleConfig: {} },
  },
  {
    tag: "d-binding",
    broken: { contextBlocks: TWO_BLOCKS, gates: { GO: [7] } },
    intact: { contextBlocks: TWO_BLOCKS, gates: { GO: gateWith() } },
  },
  {
    tag: "d-pipeline",
    broken: { contextBlocks: TWO_BLOCKS, gates: { GO: 7 } },
    intact: { contextBlocks: TWO_BLOCKS, gates: { GO: gateWith() } },
  },
  {
    tag: "d-gates (the container route)",
    broken: { contextBlocks: TWO_BLOCKS, gates: 7 },
    intact: { contextBlocks: TWO_BLOCKS, gates: {} },
  },
  {
    // The SECOND route to the same tag — the one the engine did not mark
    // before this packet (packet row D5's third capability).
    tag: "d-gates (the DEAD-CONFIG route)",
    broken: { contextBlocks: TWO_BLOCKS, gates: { GHOST: gateWith(["alpha"]) } },
    intact: { contextBlocks: TWO_BLOCKS, gates: { GO: gateWith() } },
  },
];

describe("ch13-p1a family 2 — the C9 stand-down over the derived trigger set (M1's floor)", () => {
  for (const member of STAND_DOWN_FLOOR) {
    it(`${member.tag}: a marking malformation stands the whole audit down`, () => {
      expect(catalogFindings(ctxFindings(member.broken))).toStrictEqual([]);
    });

    it(`${member.tag}: the DISCRIMINATING control — the same document intact accuses both entries`, () => {
      expect(catalogFindings(ctxFindings(member.intact))).toStrictEqual([HYGIENE("alpha"), HYGIENE("beta")]);
    });
  }

  // The floor's remaining members break an enclosing MAP or ENTRY node,
  // which the fixture builder cannot express as a part — they are staged
  // on the raw value instead.
  const raw = (mutate: (t: Record<string, unknown>) => void): readonly ValidationFinding[] => {
    const template = ctxTemplate({ contextBlocks: TWO_BLOCKS }) as unknown as Record<string, unknown>;
    mutate(template);
    const result = admitTemplate(template as unknown as WorkflowTemplate, catalog);
    return result.ok ? [] : result.findings;
  };

  for (const [tag, mutate] of [
    ["d-step", (t: Record<string, unknown>) => { (t["steps"] as Record<string, unknown>)["s"] = 7; }],
    ["d-steps", (t: Record<string, unknown>) => { t["steps"] = 7; }],
    ["d-roles-entry", (t: Record<string, unknown>) => { (t["roles"] as Record<string, unknown>)["r"] = 7; }],
    ["d-roles", (t: Record<string, unknown>) => { t["roles"] = 7; }],
  ] as const) {
    it(`${tag}: a marking malformation stands the whole audit down`, () => {
      expect(catalogFindings(raw(mutate))).toStrictEqual([]);
    });
  }

  it("the ARM-GATE-1 counterexample: a mention inside a DEAD gate key, and a second entry named nowhere", () => {
    // Pre-growth this document marked NO tag — the dead-config skip
    // removed the entry from evaluation while the container still
    // reported ok — so a stand-down reading the failed tags saw a clean
    // document and accused `beta`, whose only sin is being unreferenced
    // on a document C9 requires it to stand down on. The engine now marks
    // the enclosure on that skip, so the audit stands down whole.
    const findings = ctxFindings({ contextBlocks: TWO_BLOCKS, gates: { GHOST: gateWith(["alpha"]) } });
    expect(catalogFindings(findings)).toStrictEqual([]);
    // …and the dead-config lane still reports, unchanged.
    expect(findings).toStrictEqual([
      { path: "steps.s.gates.GHOST", message: "dead gate config: 'GHOST' is not a transition of step 's'" },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Family 3 — the ADMITTED FORM (packet rows D3/D4). On every admission
// SUCCESS each ref position is present with the value its authored source
// implies (absent source ⇒ the empty list); a caller-supplied produced
// position is RECOMPUTED, never carried; and the authored source key
// survives unmodified beside it. Membership: position × authored state.
// ═══════════════════════════════════════════════════════════════════════

/** Author a key the TYPE does not admit, at a nested address — the
 * hostile-fixture idiom this suite already uses at the top level. */
function authorRaw(template: WorkflowTemplate, path: readonly string[], value: unknown): void {
  let cursor = template as unknown as Record<string, unknown>;
  for (const segment of path.slice(0, -1)) cursor = cursor[segment] as Record<string, unknown>;
  cursor[path[path.length - 1] ?? ""] = value;
}

/** The admitted value, or a throw naming the findings that prevented one. */
function admitted(parts: Parameters<typeof ctxTemplate>[0]): WorkflowTemplate {
  const result = admitTemplate(ctxTemplate(parts), catalog);
  if (!result.ok) throw new Error(`expected admission to succeed: ${JSON.stringify(result.findings)}`);
  return result.template;
}

const roleRefs = (t: WorkflowTemplate): unknown => t.roles["r"]?.promptConcernRefs;
const stepRefs = (t: WorkflowTemplate): unknown => t.steps["s"]?.promptConcernRefs;
const gateRefs = (t: WorkflowTemplate): unknown => t.steps["s"]?.gates?.["GO"]?.[0]?.contextBlockRefs;

describe("ch13-p1a family 3 — the admitted form, position × authored state", () => {
  const CATALOG = { alpha: { body: "x" } };

  it("ROLE position: absent config ⇒ the empty list", () => {
    expect(roleRefs(admitted({}))).toStrictEqual([]);
  });

  it("ROLE position: a config without the key ⇒ the empty list", () => {
    expect(roleRefs(admitted({ roleConfig: { mode: "builder" } }))).toStrictEqual([]);
  });

  it("ROLE position: a PRESENT EMPTY authored list ⇒ the empty list", () => {
    expect(roleRefs(admitted({ contextBlocks: {}, roleConfig: { promptConcernRefs: [] } }))).toStrictEqual([]);
  });

  it("ROLE position: a populated authored list ⇒ that list, and the authored source survives beside it", () => {
    const template = admitted({ contextBlocks: CATALOG, roleConfig: { promptConcernRefs: ["alpha"] } });
    expect(roleRefs(template)).toStrictEqual(["alpha"]);
    // ch13v2-C13: the raw config map retains the authored key untouched —
    // the ch12 cascade reads it there, and the produced field is a
    // SIBLING, never a replacement.
    expect(template.roles["r"]?.defaultAgentConfig).toStrictEqual({ promptConcernRefs: ["alpha"] });
  });

  it("STEP position: absent config ⇒ the empty list", () => {
    expect(stepRefs(admitted({}))).toStrictEqual([]);
  });

  it("STEP position: a config without the key ⇒ the empty list", () => {
    expect(stepRefs(admitted({ stepConfig: { mode: "builder" } }))).toStrictEqual([]);
  });

  it("STEP position: a PRESENT EMPTY authored list ⇒ the empty list", () => {
    expect(stepRefs(admitted({ contextBlocks: {}, stepConfig: { promptConcernRefs: [] } }))).toStrictEqual([]);
  });

  it("STEP position: a populated authored list ⇒ that list, the authored source surviving", () => {
    const template = admitted({ contextBlocks: CATALOG, stepConfig: { promptConcernRefs: ["alpha"] } });
    expect(stepRefs(template)).toStrictEqual(["alpha"]);
    expect(template.steps["s"]?.agentConfig).toStrictEqual({ promptConcernRefs: ["alpha"] });
  });

  it("GATE position: an absent key ⇒ the declared empty-list default", () => {
    expect(gateRefs(admitted({ gates: { GO: gateWith() } }))).toStrictEqual([]);
  });

  it("GATE position: a PRESENT EMPTY authored list ⇒ the empty list", () => {
    expect(gateRefs(admitted({ contextBlocks: {}, gates: { GO: gateWith([]) } }))).toStrictEqual([]);
  });

  it("GATE position (NAMED TRAP): an AUTHORED NON-EMPTY list admits INTACT — a missing carry entry drops it", () => {
    const template = admitted({ contextBlocks: CATALOG, gates: { GO: gateWith(["alpha"]) } });
    expect(gateRefs(template)).toStrictEqual(["alpha"]);
    // the whole admitted binding: the carry list plus the produced config
    expect(template.steps["s"]?.gates?.["GO"]?.[0]).toStrictEqual({
      uses: "declarative.threshold",
      contextBlockRefs: ["alpha"],
      config: { metric: "round", op: ">=", value: 2 },
    });
  });

  it("GATE position (NAMED TRAP): a key valued `undefined` is REFUSED by its own field lane, never silently filled", () => {
    // The declared default fills an ABSENT key — the engine's presence
    // test is KEY PRESENCE — so this key is present, meets the ref-list
    // lane, and fails it. Widening the presence test to reach `undefined`
    // would turn this red into a silent fill.
    expect(
      ctxFindings({
        gates: { GO: [{ uses: "declarative.threshold", config: THRESHOLD, contextBlockRefs: undefined }] },
      }),
    ).toStrictEqual([
      {
        path: "steps.s.gates.GO[0].contextBlockRefs",
        message: "contextBlockRefs must be a list of context block ids; got undefined",
      },
    ]);
  });

  it("RECOMPUTE: a caller-supplied produced position is overwritten from its authored source, at BOTH landing nodes", () => {
    // The direct channel admits the produced key (it belongs to the
    // ADMITTED form, so a caller re-admitting an admitted value must not
    // meet a refusal) — and the producer monopoly recomputes it, which is
    // what keeps containment true on this channel.
    const template = ctxTemplate({ contextBlocks: CATALOG, roleConfig: { promptConcernRefs: ["alpha"] } });
    authorRaw(template, ["roles", "r", "promptConcernRefs"], ["GHOST"]);
    authorRaw(template, ["steps", "s", "promptConcernRefs"], ["GHOST"]);
    const result = admitTemplate(template, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(roleRefs(result.template)).toStrictEqual(["alpha"]);
    expect(stepRefs(result.template)).toStrictEqual([]);
  });

  it("RE-ADMISSION is a fixed point: admitting an admitted value reproduces it exactly", () => {
    const once = admitted({ contextBlocks: CATALOG, roleConfig: { promptConcernRefs: ["alpha"] } });
    const twice = admitTemplate(once, catalog);
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(twice.template).toStrictEqual(once);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Family 6 — the PARITY corpus's ONE expected delta class (packet row
// D11), asserted POSITIVELY: a build failing to produce the delta reds as
// loudly as one producing another. The standing suites ARE the corpus;
// this lane pins the class the replay is allowed to differ by.
// ═══════════════════════════════════════════════════════════════════════

describe("ch13-p1a family 6 — the one expected parity delta, asserted positively", () => {
  it("the produced key at the STEP node: a previously-refused unknown key is now accepted-and-recomputed", () => {
    const template = ctxTemplate({});
    authorRaw(template, ["steps", "s", "promptConcernRefs"], ["GHOST"]);
    const result = admitTemplate(template, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(stepRefs(result.template)).toStrictEqual([]);
  });

  it("the produced key at the ROLES-ENTRY node: likewise accepted-and-recomputed", () => {
    const template = ctxTemplate({});
    authorRaw(template, ["roles", "r", "promptConcernRefs"], ["GHOST"]);
    const result = admitTemplate(template, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(roleRefs(result.template)).toStrictEqual([]);
  });
});
