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

// ═══════════════════════════════════════════════════════════════════════
// packet ch14-p1 — the human-decision / bare-wait DECLARATION surface, on
// the DIRECT-CONSTRUCTION channel. The file channel's half of every
// family lives in `validate.test.ts`; the two differ in exactly two
// outcome classes (the `type` token DOMAIN and the produced-field
// carve-out) plus the cases only a file can express.
//
// FIXTURE NOTE (ch14-P1 D11, the deferred type relaxation): `role`,
// `instruction` and `transitions` stay REQUIRED on the shared `Step`
// type until ch14-P2, so the two new classes' fixtures are cast-authored
// on this suite's standing idiom. The casts retire with the relaxation —
// the deferred marker beside those three fields carries that half.
// ═══════════════════════════════════════════════════════════════════════

type Raw = Record<string, unknown>;

/** A three-class template: an agent step, a `humanGate` and a bare wait,
 * each overridable, with the roles map the equality demands. */
function ch14(over: Record<string, Raw | null> = {}, root: Raw = {}): WorkflowTemplate {
  const merge = (base: Raw, patch: Raw | null | undefined): Raw | undefined =>
    patch === null ? undefined : { ...base, ...(patch ?? {}) };
  const steps: Raw = {};
  const put = (id: string, value: Raw | undefined): void => {
    if (value !== undefined) steps[id] = value;
  };
  put("implement", merge({ role: "implementer", instruction: "i", transitions: { PASS: "gate" } }, over["implement"]));
  put(
    "gate",
    merge(
      { type: "human_gate", role: "operator", instruction: "q", decisions: { approve: { target: "done" } } },
      over["gate"],
    ),
  );
  put(
    "hold",
    merge(
      { type: "wait", wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] }, onResume: { COMMIT: "done" } },
      over["hold"],
    ),
  );
  return {
    ref: { id: "t", version: 1 },
    start: "implement",
    steps,
    terminal: ["done"],
    roles: { implementer: {}, operator: {} },
    ...root,
  } as unknown as WorkflowTemplate;
}

/** Drop a key rather than authoring it `undefined` — a key authored
 * `undefined` is PRESENT and meets its own value lane, which is a
 * different case from the missing-key one every presence lane drives. */
function without(base: Raw, ...keys: readonly string[]): Raw {
  const copy: Raw = { ...base };
  for (const key of keys) delete copy[key];
  return copy;
}

function ch14Fail(template: WorkflowTemplate): readonly ValidationFinding[] {
  const result = admitTemplate(template, catalog);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected admission to fail");
  return result.findings;
}

function ch14Admit(template: WorkflowTemplate): Record<string, Raw> {
  const result = admitTemplate(template, catalog);
  if (!result.ok) throw new Error(`expected admission to succeed: ${JSON.stringify(result.findings)}`);
  return result.template.steps as unknown as Record<string, Raw>;
}

// ── FAMILY 1: the DECLARED lanes of every node this packet adds or
// changes, driven through the real admission entry in BOTH directions,
// with the finding SET asserted WHOLE so a spurious extra reds. The
// membership is PARAMETERIZED over the declaration: one row per lane,
// derived by reading the nodes the packet mints. ─────────────────────────

interface LaneRow {
  readonly node: string;
  readonly lane: string;
  readonly template: () => WorkflowTemplate;
  readonly findings: readonly ValidationFinding[];
}

const DECLARED_LANES: readonly LaneRow[] = [
  { node: "d-step-type", lane: "value (an unknown token)",
    template: () => ch14({ gate: { type: "nope" } }),
    findings: [{ path: "steps.gate.type", message: "type must be one of human_gate, wait; got \"nope\"" }] },
  { node: "d-step-type", lane: "value (the FILE channel's authored spelling is not this channel's)",
    template: () => ch14({ gate: { type: "humanGate" } }),
    findings: [{ path: "steps.gate.type", message: "type must be one of human_gate, wait; got \"humanGate\"" }] },
  { node: "d-decisions", lane: "container",
    template: () => ch14({ gate: { decisions: "x" } }),
    findings: [{ path: "steps.gate.decisions", code: "invalid_decision_gate_config",
      message: "decisions must be a map of decision key -> { target, payload? }; got \"x\"" }] },
  { node: "d-decision-key", lane: "key grammar",
    template: () => ch14({ gate: { decisions: { "a b": { target: "done" } } } }),
    findings: [{ path: "steps.gate.decisions",
      message: "invalid decision key \"a b\": ids contain no whitespace and no \".\" and are not the canonical " +
        "decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
  { node: "d-decision-entry", lane: "container",
    template: () => ch14({ gate: { decisions: { approve: 5 } } }),
    findings: [{ path: "steps.gate.decisions.approve", code: "invalid_decision_gate_config",
      message: "a decision must be a map with exactly target (+ optional payload); got 5" }] },
  { node: "d-decision-entry", lane: "unknown key (the `paylod` typo class)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", paylod: {} } } } }),
    findings: [{ path: "steps.gate.decisions.approve.paylod", code: "invalid_decision_gate_config",
      message: "unknown decision key 'paylod' (allowed: target, payload)" }] },
  { node: "d-decision-entry", lane: "missing `target`",
    template: () => ch14({ gate: { decisions: { approve: {} } } }),
    findings: [{ path: "steps.gate.decisions.approve", code: "invalid_decision_gate_config",
      message: "missing required key \"target\"" }] },
  { node: "d-decision-target", lane: "membership (unresolvable)",
    template: () => ch14({ gate: { decisions: { approve: { target: "nope" } } } }),
    findings: [{ path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
      message: "decision target must name a step or a terminal id; got \"nope\"" }] },
  { node: "d-decision-target", lane: "membership owns the NON-STRING fault too — ONE finding, no type lane",
    template: () => ch14({ gate: { decisions: { approve: { target: 5 } } } }),
    findings: [{ path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
      message: "decision target must name a step or a terminal id; got 5" }] },
  { node: "d-decision-payload", lane: "container",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: true } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload", code: "invalid_decision_payload_schema",
      message: "payload must be a map of field name -> { required? }; got true" }] },
  { node: "d-payload-field", lane: "key grammar",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { "a.b": {} } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload",
      message: "invalid payload field name \"a.b\": ids contain no whitespace and no \".\" and are not the " +
        "canonical decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
  { node: "d-payload-spec", lane: "container",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: true } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction", code: "invalid_decision_payload_schema",
      message: "a payload field spec must be a map with the single optional key required; got true" }] },
  { node: "d-payload-spec", lane: "unknown key (no nested types yet)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { type: "markdown" } } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction.type", code: "invalid_decision_payload_schema",
      message: "unknown payload spec key 'type' (allowed: required)" }] },
  { node: "d-payload-required", lane: "value (the two BOOLEAN members)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { required: "yes" } } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction.required", code: "invalid_decision_payload_schema",
      message: "required must be one of true, false; got \"yes\"" }] },
  { node: "d-payload-required", lane: "value (a QUOTED boolean is not a boolean)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { required: "true" } } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction.required", code: "invalid_decision_payload_schema",
      message: "required must be one of true, false; got \"true\"" }] },
  { node: "d-wait", lane: "container",
    template: () => ch14({ hold: { wait: 5 } }),
    findings: [{ path: "steps.hold.wait", message: "wait must be a map with exactly kind and resumeEvents; got 5" }] },
  { node: "d-wait", lane: "unknown key",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["COMMIT"], extra: 1 } } }),
    findings: [{ path: "steps.hold.wait.extra",
      message: "unknown key \"extra\" (a wait's only keys are kind, resumeEvents)" }] },
  { node: "d-wait-kind", lane: "presence",
    template: () => ch14({ hold: { wait: { resumeEvents: ["COMMIT"] } } }),
    findings: [{ path: "steps.hold.wait", message: "missing required key \"kind\"" }] },
  { node: "d-wait-kind", lane: "type (a non-string kind)",
    template: () => ch14({ hold: { wait: { kind: 5, resumeEvents: ["COMMIT"] } } }),
    findings: [{ path: "steps.hold.wait.kind", message: "wait kind must be a nonempty string, got 5" }] },
  { node: "d-resume-events", lane: "presence",
    template: () => ch14({ hold: { wait: { kind: "k" }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait", message: "missing required key \"resumeEvents\"" }] },
  { node: "d-resume-events", lane: "container",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: "COMMIT" }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait.resumeEvents",
      message: "resumeEvents must be a nonempty list of event-type ids; got \"COMMIT\"" }] },
  { node: "d-resume-events", lane: "nonempty (a wait no event can resume is dead config)",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: [] }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait.resumeEvents", message: "resumeEvents must be a NONEMPTY list" }] },
  { node: "d-resume-events", lane: "per-occurrence uniqueness",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["COMMIT", "COMMIT"] } } }),
    findings: [{ path: "steps.hold.wait.resumeEvents[1]", message: "duplicate resume event \"COMMIT\"" }] },
  { node: "d-resume-event", lane: "member grammar",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["a b"] }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait.resumeEvents[0]",
      message: "invalid event type \"a b\": ids contain no whitespace and no \".\" and are not the canonical " +
        "decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
  { node: "d-on-resume", lane: "container",
    template: () => ch14({ hold: { onResume: 5 } }),
    findings: [{ path: "steps.hold.onResume",
      message: "onResume must be a map of event-type -> target id (it may be empty); got 5" }] },
  { node: "d-on-resume", lane: "keysSubsetOf the step's own resumeEvents (dead route)",
    template: () => ch14({ hold: { onResume: { NOPE: "done" } } }),
    findings: [{ path: "steps.hold.onResume.NOPE",
      message: "dead resume route: 'NOPE' is not a declared resume event of step 'hold'" }] },
  { node: "d-resume-target", lane: "membership",
    template: () => ch14({ hold: { onResume: { COMMIT: "nope" } } }),
    findings: [{ path: "steps.hold.onResume.COMMIT",
      message: "resume target must name a step or a terminal id; got \"nope\"" }] },
  { node: "d-recommends", lane: "container",
    template: () => ch14({ implement: { recommends: 5 } }),
    findings: [{ path: "steps.implement.recommends",
      message: "recommends must be a map of event-type -> decision key; got 5" }] },
  { node: "d-recommends", lane: "keysSubsetOf keys(transitions) (dead recommendation)",
    template: () => ch14({ implement: { recommends: { NOPE: "approve" } } }),
    findings: [{ path: "steps.implement.recommends.NOPE",
      message: "dead recommendation: 'NOPE' is not a transition of step 'implement'" }] },
  { node: "d-recommends-value", lane: "value grammar (the decision-key class)",
    template: () => ch14({ implement: { recommends: { PASS: "a b" } } }),
    findings: [{ path: "steps.implement.recommends.PASS",
      message: "invalid decision key \"a b\": ids contain no whitespace and no \".\" and are not the canonical " +
        "decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
];

describe("ch14-P1 family 1 — the declared lanes, direct channel (violating direction, finding SET whole)", () => {
  for (const row of DECLARED_LANES) {
    it(`${row.node}: ${row.lane}`, () => {
      expect(ch14Fail(row.template())).toStrictEqual(row.findings);
    });
  }

  it("the lane register covers every node this packet mints, and each lane is named once", () => {
    // Derived by READING the declaration's ch14 growth: the eleven
    // intended nodes plus the sub-nodes the composition rules mint.
    expect(new Set(DECLARED_LANES.map((row) => row.node))).toStrictEqual(
      new Set([
        "d-step-type", "d-decisions", "d-decision-key", "d-decision-entry", "d-decision-target",
        "d-decision-payload", "d-payload-field", "d-payload-spec", "d-payload-required",
        "d-wait", "d-wait-kind", "d-resume-events", "d-resume-event",
        "d-on-resume", "d-resume-target", "d-recommends", "d-recommends-value",
      ]),
    );
    expect(new Set(DECLARED_LANES.map((row) => `${row.node} ${row.lane}`)).size).toBe(DECLARED_LANES.length);
  });
});

describe("ch14-P1 family 1 — the CONFORMING direction: a legal declaration produces no finding", () => {
  const conforming: readonly (readonly [string, () => WorkflowTemplate])[] = [
    ["all three classes together", () => ch14()],
    ["a decision routing to a STEP", () => ch14({ gate: { decisions: { rework: { target: "implement" } } } })],
    ["a decision routing to a TERMINAL", () => ch14({ gate: { decisions: { approve: { target: "done" } } } })],
    ["a decision routing to its OWN gate (the self-target that genuinely re-arrives)",
      () => ch14({ gate: { decisions: { again: { target: "gate" } } } })],
    ["an EMPTY payload spec — `required` absent means not-required",
      () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: {} } } } } })],
    ["required: true", () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { required: true } } } } } })],
    ["required: false", () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { required: false } } } } } })],
    ["an EMPTY onResume — a declared resume event with no route is admissible by design",
      () => ch14({ hold: { onResume: {} } })],
    ["a resumeEvents member with no route beside one that has a route",
      () => ch14({ hold: { wait: { kind: "commit_pending", resumeEvents: ["COMMIT", "ABORT"] } } })],
    ["a recommendation naming a real decision of a real gate", () => ch14({ implement: { recommends: { PASS: "approve" } } })],
  ];
  for (const [claim, make] of conforming) {
    it(claim, () => {
      expect(admitTemplate(make(), catalog).ok).toBe(true);
    });
  }
});

// ── FAMILY 2: the CLASS PARTITION. The declared step node holds the
// UNION of the three classes' fields, so every cell of (class × key) is
// decided by a hand lane, a declared lane, or both. ──────────────────────

const CLASS_KEYSETS = {
  agent: ["role", "instruction", "transitions", "agentConfig", "gates", "recommends"],
  human_gate: ["type", "role", "instruction", "decisions"],
  wait: ["type", "wait", "onResume"],
} as const;

/** Every AUTHORABLE step key the declaration carries — the union the
 * partition binds. The produced channel-direct positions are NOT here:
 * they are the carve-out, driven by re-admission below. */
const AUTHORABLE = [
  "type", "role", "instruction", "transitions", "agentConfig", "gates",
  "decisions", "wait", "onResume", "recommends",
] as const;

/** A legal-in-isolation value for each key, so a class-refusal cell
 * carries a value its OWN declared lane accepts — the converse half of
 * the two-finding rule. */
const LEGAL_VALUE: Readonly<Record<string, unknown>> = {
  type: "wait",
  role: "operator",
  instruction: "i",
  transitions: { PASS: "done" },
  agentConfig: {},
  gates: {},
  decisions: { approve: { target: "done" } },
  wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] },
  onResume: {},
  recommends: {},
};

describe("ch14-P1 family 2 — every key a class does not own is REFUSED, on its own", () => {
  const stepOf = { agent: "implement", human_gate: "gate", wait: "hold" } as const;
  for (const [cls, keyset] of Object.entries(CLASS_KEYSETS) as readonly (readonly [
    keyof typeof CLASS_KEYSETS,
    readonly string[],
  ])[]) {
    for (const key of AUTHORABLE) {
      if (keyset.includes(key)) continue;
      // `type` on the agent class is not a refusal cell: a PRESENT legal
      // `type` selects a different class by definition, so the cell is
      // construction-unreachable rather than exempted.
      if (cls === "agent" && key === "type") continue;
      it(`${cls}: '${key}' draws the class refusal ALONE (its value satisfies its own declared lane)`, () => {
        const findings = ch14Fail(ch14({ [stepOf[cls]]: { [key]: LEGAL_VALUE[key] } }));
        expect(findings).toHaveLength(1);
        expect(findings[0]?.path).toBe(`steps.${stepOf[cls]}.${key}`);
        expect(findings[0]?.message).toContain(`unknown key ${key} on`);
        expect(findings[0]).not.toHaveProperty("code");
      });
    }
  }
});

describe("ch14-P1 family 2 — every key a class REQUIRES is demanded", () => {
  const stepOf = { agent: "implement", human_gate: "gate", wait: "hold" } as const;
  const required = {
    agent: ["role", "instruction", "transitions"],
    human_gate: ["type", "role", "instruction", "decisions"],
    wait: ["type", "wait", "onResume"],
  } as const;
  for (const [cls, keys] of Object.entries(required) as readonly (readonly [
    keyof typeof required,
    readonly string[],
  ])[]) {
    for (const key of keys) {
      // Dropping `type` drops the CLASS, so the demand is only meaningful
      // for the keys that survive the discriminator.
      if (key === "type") continue;
      it(`${cls}: a missing '${key}' is re-imposed by the hand lane, at the declared lane's own path and wording`, () => {
        const id = stepOf[cls];
        const template = ch14();
        const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
        const step = steps[id];
        if (step === undefined) throw new Error("fixture");
        steps[id] = without(step, key);
        const findings = admitTemplate(template, catalog);
        expect(findings.ok).toBe(false);
        if (findings.ok) return;
        expect(findings.findings).toContainEqual(
          key === "decisions"
            ? { path: `steps.${id}`, message: `missing required key "${key}"`, code: "invalid_decision_gate_config" }
            : { path: `steps.${id}`, message: `missing required key "${key}"` },
        );
      });
    }
  }
});

describe("ch14-P1 family 2 — the presence relaxation's three failure modes (dimension 4)", () => {
  // The relaxation moves three live findings onto new carriers. A build
  // that lands the hand lanes but drops a case admits a step with no
  // instruction (SILENT); one that leaves the declared lane in place
  // reports twice (WRONGLY DOUBLED); one that forgets an absent-operand
  // knob answers `internal validator failure` (NOISY).
  for (const key of ["role", "instruction", "transitions"] as const) {
    it(`'${key}': not SILENT and not DOUBLED — exactly ONE missing-key finding`, () => {
      const template = ch14({ gate: null, hold: null }, { roles: { implementer: {} } });
      const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
      const step = steps["implement"];
      if (step === undefined) throw new Error("fixture");
      steps["implement"] = { ...without(step, key), transitions: key === "transitions" ? undefined : { PASS: "done" } };
      if (key === "transitions") delete steps["implement"]?.["transitions"];
      const findings = ch14Fail(template);
      expect(findings.filter((finding) => finding.message === `missing required key "${key}"`)).toStrictEqual([
        { path: "steps.implement", message: `missing required key "${key}"` },
      ]);
    });
  }

  // The NOISY mode is parameterized over the operand CONSUMERS only.
  // `instruction` feeds no dependent lane, and `role`'s only consumer is
  // the equality this same build re-homes to an absence-tolerant hand
  // lane — neither can stage a noisy cell, so demanding one would demand
  // a case the surface does not have.
  const noisy: readonly (readonly [string, () => WorkflowTemplate])[] = [
    ["transitions → the gates dead-config lane", () =>
      ch14({ implement: { transitions: undefined, gates: { PASS: [] } }, gate: null, hold: null },
        { roles: { implementer: {} } })],
    ["transitions → the recommends dead-recommendation lane", () =>
      ch14({ implement: { transitions: undefined, recommends: { PASS: "approve" } }, hold: null })],
    ["wait → the onResume dead-route lane", () =>
      ch14({ hold: { wait: undefined } })],
  ];
  for (const [claim, make] of noisy) {
    it(`${claim}: an ABSENT operand is SILENT, never an internal validator failure`, () => {
      const template = make();
      const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
      for (const step of Object.values(steps)) {
        for (const [key, value] of Object.entries(step)) if (value === undefined) delete step[key];
      }
      const findings = ch14Fail(template);
      expect(JSON.stringify(findings)).not.toContain("internal validator failure");
      expect(findings.map((finding) => finding.path)).not.toContain("$");
    });
  }
});

describe("ch14-P1 family 2 — the produced-field CARVE-OUT: re-admitting an admitted value recomputes", () => {
  it("all three classes survive a second admission, produced positions and all", () => {
    const once = admitTemplate(ch14(), catalog);
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = admitTemplate(once.template, catalog);
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(twice.template).toStrictEqual(once.template);
  });
});

describe("ch14-P1 family 2 — D3's composition rule, both directions", () => {
  it("a class-refused key whose value ALSO fails its own declared lane draws BOTH findings", () => {
    const findings = ch14Fail(ch14({ implement: { decisions: "x" } }));
    expect(findings).toStrictEqual([
      { path: "steps.implement.decisions", code: "invalid_decision_gate_config",
        message: "decisions must be a map of decision key -> { target, payload? }; got \"x\"" },
      { path: "steps.implement.decisions",
        message: "unknown key decisions on an agent step " +
          "(an agent step's keys are role, instruction, transitions, agentConfig, gates, recommends)" },
    ]);
  });

  it("its CONVERSE: a class-refused key whose value satisfies its lane draws the class refusal ALONE", () => {
    const findings = ch14Fail(ch14({ implement: { decisions: { approve: { target: "done" } } } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.implement.decisions");
  });
});

describe("ch14-P1 family 2 — the discriminator GATE is per STEP, never template-wide", () => {
  it("a broken `type` on one step does not stand the OTHER step's class lanes down", () => {
    // The combination document a template-wide gate would pass: one step
    // with an unusable discriminator, and a second, class-VALID step
    // carrying a class fault that must still be reported.
    const findings = ch14Fail(ch14({ gate: { type: "nope" }, hold: { decisions: { approve: { target: "done" } } } }));
    expect(findings).toStrictEqual([
      { path: "steps.gate.type", message: "type must be one of human_gate, wait; got \"nope\"" },
      { path: "steps.hold.decisions",
        message: "unknown key decisions on a wait step (a wait step's keys are type, wait, onResume)" },
    ]);
  });

  it("and the gated step draws ONE finding, never an enum finding plus an agent-class cascade", () => {
    const findings = ch14Fail(ch14({ gate: { type: "nope" } }));
    expect(findings).toStrictEqual([
      { path: "steps.gate.type", message: "type must be one of human_gate, wait; got \"nope\"" },
    ]);
  });
});

// ── FAMILY 3: the FIVE cross-position reference rules, each driven with
// a violating operand, a conforming one at EVERY member of its declared
// domain, a BROKEN operand container (suppression asserted positively)
// and an ABSENT operand. ─────────────────────────────────────────────────

describe("ch14-P1 family 3 — reference rule 1: a decision target ∈ steps ∪ terminal (D4)", () => {
  it("violating: an unresolvable target", () => {
    expect(ch14Fail(ch14({ gate: { decisions: { approve: { target: "ghost" } } } }))).toStrictEqual([
      { path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
        message: "decision target must name a step or a terminal id; got \"ghost\"" },
    ]);
  });

  // EVERY member of the domain — the terminal half is the case a build
  // following the model SKETCH (which checks steps only) would miss.
  for (const [claim, target] of [["a step", "implement"], ["a TERMINAL", "done"], ["its OWN gate", "gate"]] as const) {
    it(`conforming: ${claim}`, () => {
      expect(admitTemplate(ch14({ gate: { decisions: { go: { target } } } }), catalog).ok).toBe(true);
    });
  }

  it("BROKEN operand: a non-map `steps` yields its container finding and this lane stands down", () => {
    const findings = ch14Fail(ch14({}, { steps: "x" }));
    expect(findings).toStrictEqual([
      { path: "steps", message: "steps must be a NONEMPTY map of step-id -> step" },
    ]);
  });
});

describe("ch14-P1 family 3 — reference rule 2: onResume keys ⊆ the step's own resumeEvents (D5)", () => {
  it("violating: a key outside the declared resume events", () => {
    expect(ch14Fail(ch14({ hold: { onResume: { GHOST: "done" } } }))).toStrictEqual([
      { path: "steps.hold.onResume.GHOST",
        message: "dead resume route: 'GHOST' is not a declared resume event of step 'hold'" },
    ]);
  });

  it("conforming at every member of the domain", () => {
    expect(
      admitTemplate(
        ch14({ hold: { wait: { kind: "k", resumeEvents: ["A", "B"] }, onResume: { A: "done", B: "implement" } } }),
        catalog,
      ).ok,
    ).toBe(true);
  });

  it("BROKEN operand: a non-map `wait` yields its container finding ALONE", () => {
    expect(ch14Fail(ch14({ hold: { wait: 5 } }))).toStrictEqual([
      { path: "steps.hold.wait", message: "wait must be a map with exactly kind and resumeEvents; got 5" },
    ]);
  });

  it("BROKEN operand: a non-list `resumeEvents` likewise", () => {
    expect(ch14Fail(ch14({ hold: { wait: { kind: "k", resumeEvents: "A" } } }))).toStrictEqual([
      { path: "steps.hold.wait.resumeEvents",
        message: "resumeEvents must be a nonempty list of event-type ids; got \"A\"" },
    ]);
  });

  it("ABSENT operand: the declared knob's proof — the class hand lane's honest finding, never an internal failure", () => {
    const template = ch14();
    const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
    const hold = steps["hold"];
    if (hold === undefined) throw new Error("fixture");
    steps["hold"] = without(hold, "wait");
    const findings = ch14Fail(template);
    expect(findings).toStrictEqual([{ path: "steps.hold", message: "missing required key \"wait\"" }]);
  });
});

describe("ch14-P1 family 3 — reference rules 3-5: the three `recommends` rules (D16)", () => {
  it("rule 3 violating: a key outside keys(transitions)", () => {
    expect(ch14Fail(ch14({ implement: { recommends: { GHOST: "approve" } } }))).toStrictEqual([
      { path: "steps.implement.recommends.GHOST",
        message: "dead recommendation: 'GHOST' is not a transition of step 'implement'" },
    ]);
  });

  it("rule 4 violating: the referenced transition's target is not a humanGate (a STEP target)", () => {
    expect(
      ch14Fail(ch14({ implement: { transitions: { PASS: "gate", SKIP: "hold" }, recommends: { SKIP: "approve" } } })),
    ).toStrictEqual([
      { path: "steps.implement.recommends.SKIP", code: "recommends_on_non_gate",
        message: "recommends: 'SKIP' routes to step 'hold', which is not a humanGate step — " +
          "a recommendation is meaningful only where a decision will be asked" },
    ]);
  });

  it("rule 4 violating: a TERMINAL target resolves and is still not a gate", () => {
    expect(
      ch14Fail(ch14({ implement: { transitions: { PASS: "gate", SKIP: "done" }, recommends: { SKIP: "approve" } } })),
    ).toStrictEqual([
      { path: "steps.implement.recommends.SKIP", code: "recommends_on_non_gate",
        message: "recommends: 'SKIP' routes to step 'done', which is not a humanGate step — " +
          "a recommendation is meaningful only where a decision will be asked" },
    ]);
  });

  it("rule 5 violating: the value is not a declared decision of that gate", () => {
    expect(ch14Fail(ch14({ implement: { recommends: { PASS: "ghost" } } }))).toStrictEqual([
      { path: "steps.implement.recommends.PASS", code: "recommends_unknown_decision",
        message: "recommends: 'ghost' is not a declared decision of step 'gate'" },
    ]);
  });

  it("conforming at every member: each declared decision key of the target gate", () => {
    for (const decision of ["approve", "request_rework"]) {
      expect(
        admitTemplate(
          ch14({
            implement: { recommends: { PASS: decision } },
            gate: { decisions: { approve: { target: "done" }, request_rework: { target: "implement" } } },
          }),
          catalog,
        ).ok,
      ).toBe(true);
    }
  });

  it("BROKEN operand: a non-map `decisions` on the target gate yields its container finding, both lanes standing down", () => {
    const findings = ch14Fail(ch14({ implement: { recommends: { PASS: "approve" } }, gate: { decisions: "x" } }));
    expect(findings.filter((finding) => finding.path.startsWith("steps.implement.recommends"))).toStrictEqual([]);
  });

  it("ABSENT operand: an agent step with no `transitions` stands BOTH hand lanes down", () => {
    const template = ch14({ implement: { recommends: { PASS: "approve" } }, hold: null });
    const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
    const step = steps["implement"];
    if (step === undefined) throw new Error("fixture");
    steps["implement"] = without(step, "transitions");
    const findings = ch14Fail(template);
    expect(findings.filter((finding) => finding.path.startsWith("steps.implement.recommends"))).toStrictEqual([]);
    expect(findings).toContainEqual({ path: "steps.implement", message: "missing required key \"transitions\"" });
  });

  it("ABSENT operand: a `recommends` map on a class that refuses it draws the class refusal ALONE", () => {
    const findings = ch14Fail(ch14({ gate: { recommends: { PASS: "approve" } } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("steps.gate.recommends");
  });
});

// ── FAMILY 4: ACCUMULATION and its converse. Each member is a
// COMBINATION lane holding both conditions at once, because isolated
// lanes cannot falsify a reordered implementation. ───────────────────────

interface AccumulationRow {
  readonly container: string;
  /** Two INDEPENDENT faults in different positions → BOTH findings. */
  readonly both: () => WorkflowTemplate;
  /** A fault UNDER a broken container → the container's finding ALONE. */
  readonly suppressed: () => WorkflowTemplate;
  readonly containerPath: string;
  /** The prefix the two INDEPENDENT faults share — the container's own
   * path where both sit inside it, its PARENT where the container is one
   * of two siblings. */
  readonly bothPrefix?: string;
}

const ACCUMULATION: readonly AccumulationRow[] = [
  { container: "decisions", containerPath: "steps.gate.decisions",
    both: () => ch14({ gate: { decisions: { approve: { target: "ghost" }, rework: { target: "phantom" } } } }),
    suppressed: () => ch14({ gate: { decisions: 5 } }) },
  { container: "a decision entry", containerPath: "steps.gate.decisions.approve",
    both: () => ch14({ gate: { decisions: { approve: { target: "ghost", paylod: {} } } } }),
    suppressed: () => ch14({ gate: { decisions: { approve: 5 } } }) },
  { container: "payload", containerPath: "steps.gate.decisions.approve.payload",
    both: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: true, b: true } } } } }),
    suppressed: () => ch14({ gate: { decisions: { approve: { target: "done", payload: 5 } } } }) },
  { container: "a payload field spec", containerPath: "steps.gate.decisions.approve.payload.a",
    bothPrefix: "steps.gate.decisions.approve.payload",
    both: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: { type: "md" }, b: { nested: 1 } } } } } }),
    suppressed: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: 5 } } } } }) },
  { container: "wait", containerPath: "steps.hold.wait",
    both: () => ch14({ hold: { wait: { kind: "a b", resumeEvents: ["c d"] } } }),
    suppressed: () => ch14({ hold: { wait: 5 } }) },
  { container: "resumeEvents", containerPath: "steps.hold.wait.resumeEvents",
    both: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["a b", "c d"] } } }),
    suppressed: () => ch14({ hold: { wait: { kind: "k", resumeEvents: 5 } } }) },
  { container: "onResume", containerPath: "steps.hold.onResume",
    both: () => ch14({ hold: { onResume: { GHOST: "done", PHANTOM: "done" } } }),
    suppressed: () => ch14({ hold: { onResume: 5 } }) },
  { container: "recommends", containerPath: "steps.implement.recommends",
    both: () => ch14({ implement: { transitions: { PASS: "gate", SKIP: "hold" }, recommends: { GHOST: "approve", SKIP: "approve" } } }),
    suppressed: () => ch14({ implement: { recommends: 5 } }) },
];

describe("ch14-P1 family 4 — findings accumulate; a broken container suppresses its dependents", () => {
  for (const row of ACCUMULATION) {
    it(`${row.container}: two INDEPENDENT faults yield BOTH findings (a first-return build reds here)`, () => {
      const findings = ch14Fail(row.both());
      const own = findings.filter((finding) => finding.path.startsWith(row.bothPrefix ?? row.containerPath));
      expect(own.length).toBeGreaterThanOrEqual(2);
    });

    it(`${row.container}: a fault UNDER a broken container yields the container's finding ALONE`, () => {
      const findings = ch14Fail(row.suppressed());
      const own = findings.filter((finding) => finding.path.startsWith(row.containerPath));
      expect(own).toHaveLength(1);
      expect(own[0]?.path).toBe(row.containerPath);
    });
  }

  it("the container register is the set ch14-C8 names for this chapter", () => {
    expect(ACCUMULATION.map((row) => row.container)).toStrictEqual([
      "decisions", "a decision entry", "payload", "a payload field spec",
      "wait", "resumeEvents", "onResume", "recommends",
    ]);
  });
});

// ── FAMILY 5: CODE CARRIAGE. Each of the six names asserted by VALUE on
// every lane the code table assigns it, at the GRAIN the widened
// vocabulary admits — a container-lane code on a CONTAINER-lane finding,
// so a build attaching it to a sibling value lane reds. The
// declaration-wide EXCLUSIVITY census lives in the engine suite; the CLI
// travel in the dev-cli suite. ───────────────────────────────────────────

interface CodeRow {
  readonly code: string;
  readonly lane: string;
  readonly path: string;
  readonly template: () => WorkflowTemplate;
}

const CODE_TABLE: readonly CodeRow[] = [
  { code: "invalid_decision_gate_config", lane: "the `decisions` container lane (declared)",
    path: "steps.gate.decisions", template: () => ch14({ gate: { decisions: 5 } }) },
  { code: "invalid_decision_gate_config", lane: "the `decisions`-absent-on-a-humanGate presence lane (hand)",
    path: "steps.gate", template: () => {
      const template = ch14();
      const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
      const gate = steps["gate"];
      if (gate === undefined) throw new Error("fixture");
      steps["gate"] = without(gate, "decisions");
      return template;
    } },
  { code: "invalid_decision_gate_config", lane: "the decision-entry container lane (declared)",
    path: "steps.gate.decisions.approve", template: () => ch14({ gate: { decisions: { approve: 5 } } }) },
  { code: "invalid_decision_gate_config", lane: "the decision-entry unknown-key lane (declared)",
    path: "steps.gate.decisions.approve.zz",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", zz: 1 } } } }) },
  { code: "invalid_decision_gate_config", lane: "the entry's missing-`target` lane (declared)",
    path: "steps.gate.decisions.approve", template: () => ch14({ gate: { decisions: { approve: {} } } }) },
  { code: "decision_gate_empty", lane: "the ≥1-decision floor (hand)",
    path: "steps.gate.decisions", template: () => ch14({ gate: { decisions: {} } }) },
  { code: "decision_target_unresolved", lane: "the decision-target membership lane (declared)",
    path: "steps.gate.decisions.approve.target",
    template: () => ch14({ gate: { decisions: { approve: { target: "ghost" } } } }) },
  { code: "invalid_decision_payload_schema", lane: "the `payload` container lane (declared)",
    path: "steps.gate.decisions.approve.payload",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: 5 } } } }) },
  { code: "invalid_decision_payload_schema", lane: "the spec container lane (declared)",
    path: "steps.gate.decisions.approve.payload.a",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: 5 } } } } }) },
  { code: "invalid_decision_payload_schema", lane: "the spec unknown-key lane (declared)",
    path: "steps.gate.decisions.approve.payload.a.zz",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: { zz: 1 } } } } } }) },
  { code: "invalid_decision_payload_schema", lane: "the spec `required` value lane (declared)",
    path: "steps.gate.decisions.approve.payload.a.required",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: { required: 1 } } } } } }) },
  { code: "recommends_on_non_gate", lane: "the recommends target-class lane (hand)",
    path: "steps.implement.recommends.SKIP",
    template: () => ch14({ implement: { transitions: { PASS: "gate", SKIP: "done" }, recommends: { SKIP: "approve" } } }) },
  { code: "recommends_unknown_decision", lane: "the recommends value-membership lane (hand)",
    path: "steps.implement.recommends.PASS", template: () => ch14({ implement: { recommends: { ghost: "x", PASS: "ghost" } } }) },
];

describe("ch14-P1 family 5 — the six names, by VALUE, on exactly the lanes the code table assigns", () => {
  for (const row of CODE_TABLE) {
    it(`${row.code} — ${row.lane}`, () => {
      const carrying = ch14Fail(row.template()).filter((finding) => finding.path === row.path);
      expect(carrying.map((finding) => finding.code)).toContain(row.code);
    });
  }

  it("the table's membership IS the model unit's own issue sites plus C8's two anchored splits", () => {
    // Eleven `issue(...)` sites, six distinct names, two splits (the
    // decisions absent-or-not-a-map site, and the absent `target`) =
    // THIRTEEN lanes. A fourteenth would be an invention.
    expect(CODE_TABLE).toHaveLength(13);
    expect(new Set(CODE_TABLE.map((row) => row.code))).toStrictEqual(
      new Set([
        "invalid_decision_gate_config", "decision_gate_empty", "decision_target_unresolved",
        "invalid_decision_payload_schema", "recommends_on_non_gate", "recommends_unknown_decision",
      ]),
    );
  });

  it("EXCLUSIVITY, chapter-scoped: every OTHER ch14 lane is code-LESS", () => {
    // The four remaining containers and every class-keyset and presence
    // lane not in the table above. The declaration-WIDE census (the half
    // a chapter-scoped inventory cannot reach) lives in the engine suite.
    const uncoded: readonly (readonly [string, () => WorkflowTemplate])[] = [
      ["the `wait` container lane", () => ch14({ hold: { wait: 5 } })],
      ["the `resumeEvents` container lane", () => ch14({ hold: { wait: { kind: "k", resumeEvents: 5 } } })],
      ["the `onResume` container lane", () => ch14({ hold: { onResume: 5 } })],
      ["the `recommends` container lane", () => ch14({ implement: { recommends: 5 } })],
      ["a class-keyset refusal", () => ch14({ hold: { role: "operator" } })],
      ["a class presence re-imposition (not `decisions`)", () => ch14({ hold: { wait: { kind: "k" } } })],
      ["the kernel wait-kind reservation", () => ch14({ hold: { wait: { kind: "timeout", resumeEvents: ["COMMIT"] } } })],
      ["the onResume dead-route lane", () => ch14({ hold: { onResume: { GHOST: "done" } } })],
      ["the recommends dead-recommendation lane", () => ch14({ implement: { recommends: { GHOST: "approve" } } })],
      ["the step-class discriminator's enum lane", () => ch14({ gate: { type: "nope" } })],
    ];
    for (const [claim, make] of uncoded) {
      const findings = ch14Fail(make());
      const coded = findings.filter((finding) => finding.code !== undefined && finding.code.startsWith("decision"));
      expect(coded, claim).toStrictEqual([]);
    }
  });
});

// ── FAMILY 6: THE INTEGER-KEY BAN, driven at EVERY citing position in
// both directions — the ban REUSES the id grammar's proof surface, so
// proof-parity is taken here rather than inherited. ──────────────────────

/** PROBE-CH14P1-2's enumerated sample, MINUS `1.5` (a ban-class
 * non-member the STANDING dot clause already refuses, which rides below
 * as that control rather than as a legality case), PLUS the build's own
 * extension: one ten-digit value FAR above the ceiling, whose leading
 * digit no in-class branch reaches. The sample's above-ceiling members
 * all sit in the `42949672xx` neighbourhood, so an alternation whose top
 * branch wrongly admits a high leading digit over-refuses there and
 * stays green on every member measured. */
const BANNED_IDS = ["0", "1", "9", "10", "999999999", "1000000000", "4294967293", "4294967294"] as const;
const LEGAL_IDS = [
  "4294967295", "4294967296", "01", "9999999999", "-1", "-0", "+1", "1_000",
  "٠", "٠١", "99999999999999999999", "1e3", "0x10", "a1", "10a", "implement", "COMMIT",
] as const;

interface BanPosition {
  readonly node: string;
  readonly idClass: string;
  readonly path: string;
  readonly template: (id: string) => WorkflowTemplate;
}

const banBase = (over: Record<string, Raw | null> = {}, root: Raw = {}): WorkflowTemplate => {
  const steps: Raw = {};
  const put = (id: string, base: Raw): void => {
    const patch = over[id];
    if (patch === null) return;
    steps[id] = { ...base, ...(patch ?? {}) };
  };
  put("s", { role: "r", instruction: "i", transitions: { PASS: "g" } });
  put("g", { type: "human_gate", role: "r", instruction: "q", decisions: { approve: { target: "done" } } });
  put("h", { type: "wait", wait: { kind: "k", resumeEvents: ["E"] }, onResume: {} });
  return {
    ref: { id: "t", version: 1 },
    start: "s",
    steps,
    terminal: ["done"],
    roles: { r: {} },
    ...root,
  } as unknown as WorkflowTemplate;
};

const BAN_POSITIONS: readonly BanPosition[] = [
  { node: "d-step-id", idClass: "step id", path: "steps",
    template: (id) => banBase({}, {
      start: id,
      steps: {
        [id]: { role: "r", instruction: "i", transitions: {} },
        g: { type: "human_gate", role: "r", instruction: "q", decisions: { approve: { target: "done" } } },
      },
    }) },
  { node: "d-terminal-id", idClass: "terminal id", path: "terminal",
    template: (id) => banBase({ s: { transitions: { PASS: id } }, g: null, h: null }, { terminal: [id] }) },
  { node: "d-role-name", idClass: "role name", path: "roles",
    template: (id) => banBase({ s: { role: id }, g: { role: id } }, { roles: { [id]: {} } }) },
  { node: "d-role-ref", idClass: "role name", path: "steps.s.role",
    template: (id) => banBase({ s: { role: id }, g: { role: id } }, { roles: { [id]: {} } }) },
  { node: "d-event-type", idClass: "event type", path: "steps.s.transitions",
    template: (id) => banBase({ s: { transitions: { [id]: "g" } } }) },
  { node: "d-resume-event", idClass: "event type", path: "steps.h.wait.resumeEvents[0]",
    template: (id) => banBase({ h: { wait: { kind: "k", resumeEvents: [id] } } }) },
  { node: "d-decision-key", idClass: "decision key", path: "steps.g.decisions",
    template: (id) => banBase({ g: { decisions: { [id]: { target: "done" } } } }) },
  { node: "d-payload-field", idClass: "payload field name", path: "steps.g.decisions.approve.payload",
    template: (id) => banBase({ g: { decisions: { approve: { target: "done", payload: { [id]: {} } } } } }) },
  { node: "d-wait-kind", idClass: "wait kind", path: "steps.h.wait.kind",
    template: (id) => banBase({ h: { wait: { kind: id, resumeEvents: ["E"] } } }) },
  { node: "d-recommends-value", idClass: "decision key", path: "steps.s.recommends.PASS",
    template: (id) => banBase({ s: { recommends: { PASS: id } }, g: { decisions: { [id]: { target: "done" } } } }) },
];

describe("ch14-P1 family 6 — the ban binds wherever the ONE grammar is cited", () => {
  for (const position of BAN_POSITIONS) {
    for (const id of BANNED_IDS) {
      it(`${position.node} (${position.idClass}): ${JSON.stringify(id)} is REFUSED`, () => {
        const carrying = ch14Fail(position.template(id)).filter((finding) => finding.path === position.path);
        expect(carrying.map((finding) => finding.message).join("\n")).toContain("0…4294967294");
      });
    }
    it(`${position.node} (${position.idClass}): every measured NON-member stays LEGAL`, () => {
      // A ban that over-reaches is as much a defect as one that
      // under-reaches, so the whole non-member sample rides here.
      for (const id of LEGAL_IDS) {
        const result = admitTemplate(position.template(id), catalog);
        expect(result.ok, `${position.node} must admit ${JSON.stringify(id)}`).toBe(true);
      }
    });
    it(`${position.node} (${position.idClass}): the "1.5" CONTROL is refused by the STANDING dot clause`, () => {
      const carrying = ch14Fail(position.template("1.5")).filter((finding) => finding.path === position.path);
      expect(carrying.map((finding) => finding.message).join("\n")).toContain('no whitespace and no "."');
    });
  }

  it("the POSITION expansion covers every id CLASS ch14-C10 names — a class with no citing node reds", () => {
    expect(new Set(BAN_POSITIONS.map((position) => position.idClass))).toStrictEqual(
      new Set(["step id", "terminal id", "role name", "event type", "decision key", "payload field name", "wait kind"]),
    );
    expect(new Set(BAN_POSITIONS.map((position) => position.node)).size).toBe(BAN_POSITIONS.length);
  });

  it("EXCLUSION 1: a delegated gate-config schema's OWN keys are outside the id namespace", () => {
    const template = ch14({
      implement: {
        gates: {
          PASS: [{ uses: "external.process", config: { command: ["x"], onExit: { "10": "allow", zero: "allow", nonzero: "block" } } }],
        },
      },
    });
    const findings = ch14Fail(template);
    const own = findings.filter((finding) => finding.path.includes("onExit"));
    expect(own.map((finding) => finding.message).join("\n")).toContain("unknown onExit key '10'");
    expect(JSON.stringify(own)).not.toContain("0…4294967294");
  });

  it("EXCLUSION 2: the `capabilityProfile` position is untouched — a TYPE-LEVEL surface with no authored form", () => {
    expect(admitTemplate(ch14({}, { capabilityProfile: { "10": { s: ["PASS"] } } }), catalog).ok).toBe(true);
  });

  // EXCLUSION 3, RECORDED rather than driven: the CLI `runOverrides` key
  // surface is a create-instance input this packet's admission walk never
  // reaches, so it has NO LANE here. ch14-C10 rules it "no new lane, the
  // ratified ch12 disposition unmoved", and that disposition — not a test
  // this boundary could host — is what carries it.
});

// ── FAMILY 7: NON-MOVEMENT. The corpus is derived from the CALLERS of
// the entry points this packet touches; the ONE delta is asserted
// POSITIVELY so its ABSENCE reds as loudly as an extra one, and the
// THREE carrier moves are asserted UNCHANGED so a build that
// manufactures a message change to satisfy the family reds instead. ──────

describe("ch14-P1 family 7 — the ONE delta, asserted POSITIVELY", () => {
  it("the id grammar's message GROWS its ban clause and KEEPS its standing one", () => {
    const findings = ch14Fail(BAN_POSITIONS[0]?.template("10") ?? ch14());
    const message = findings.map((finding) => finding.message).join("\n");
    expect(message).toContain('ids contain no whitespace and no "."');
    expect(message).toContain("are not the canonical decimal spelling of an integer in 0…4294967294");
  });
});

describe("ch14-P1 family 7 — the THREE carrier moves, asserted UNCHANGED", () => {
  it("move 1: the three relaxed keys' presence findings keep their PATHS and MESSAGES", () => {
    for (const key of ["role", "instruction", "transitions"] as const) {
      const template = ch14({ gate: null, hold: null }, { roles: { implementer: {} } });
      const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
      const step = steps["implement"];
      if (step === undefined) throw new Error("fixture");
      steps["implement"] = { ...without(step, key), transitions: { PASS: "done" } };
      if (key === "transitions") delete steps["implement"]?.["transitions"];
      expect(ch14Fail(template)).toContainEqual({
        path: "steps.implement",
        message: `missing required key "${key}"`,
      });
    }
  });

  it("move 2: the role-set equality's findings keep BOTH directions' paths and wordings", () => {
    const used = ch14Fail(ch14({ implement: { role: "ghost" } }));
    expect(used).toContainEqual({ path: "roles", message: 'role "ghost" is used by steps but not declared' });
    const declared = ch14Fail(ch14({}, { roles: { implementer: {}, operator: {}, spare: {} } }));
    expect(declared).toContainEqual({
      path: "roles.spare",
      message: 'role "spare" is declared but not used by any step',
    });
  });

  it("move 3: the step node's container message is held BYTE-IDENTICAL (class wording rides the hand lanes)", () => {
    const findings = ch14Fail(
      ch14({ gate: null, hold: null }, { steps: { implement: 5 }, roles: {} }),
    );
    expect(findings).toContainEqual({
      path: "steps.implement",
      message: "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig, gates)",
    });
  });
});

describe("ch14-P1 family 7 — the admitted-VALUE re-pin set, measured and expected EMPTY", () => {
  it("a template with no decision or resume edge gains NO advancesRound entry from the widening", () => {
    const steps = ch14Admit(ch14({ gate: null, hold: null }, { roles: { implementer: {} },
      steps: { implement: { role: "implementer", instruction: "i", transitions: { PASS: "done" } } } }));
    expect(steps["implement"]?.["advancesRound"]).toStrictEqual({ PASS: false });
  });
});

// ── FAMILY 8: THE HAND LANES — the half no declaration enumerates, and
// which therefore needs its own inventory. ───────────────────────────────

describe("ch14-P1 family 8 — the hand-lane inventory", () => {
  it("its membership is the set this packet owns, named once", () => {
    expect([
      "the three class keysets",
      "the per-class presence re-imposition",
      "the `decisions`-absent-on-a-humanGate presence lane",
      "the ≥1-decision floor",
      "the kernel-owned wait-kind reservation",
      "the re-homed role-set equality",
      "recommends_on_non_gate",
      "recommends_unknown_decision",
    ]).toHaveLength(8);
  });

  // PARAMETERIZED over ch14-C3's named constant, so a later kernel kind
  // added to ch12-C23 without extending the reservation reds in its own
  // chapter. The list here is that row's own, mirrored — drift between
  // the two is what this lane exists to catch.
  for (const kind of ["kickoff_pending", "human_decision", "child_workflow", "timeout"] as const) {
    it(`the reservation refuses the kernel-owned kind '${kind}' as an AUTHORED wait kind`, () => {
      expect(ch14Fail(ch14({ hold: { wait: { kind, resumeEvents: ["COMMIT"] } } }))).toStrictEqual([
        { path: "steps.hold.wait.kind",
          message: `wait kind '${kind}' is reserved by the kernel ` +
            "(reserved: kickoff_pending, human_decision, child_workflow, timeout) — " +
            "an authored collision would alias the kernel's own resume machinery" },
      ]);
    });
  }

  it("an authored kind OUTSIDE the reserved set admits — the reservation does not close the namespace", () => {
    expect(admitTemplate(ch14({ hold: { wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] } } }), catalog).ok).toBe(true);
  });

  it("`nonempty` is NOT declared on `decisions` beside the hand floor: an empty map yields exactly ONE finding", () => {
    expect(ch14Fail(ch14({ gate: { decisions: {} } }))).toStrictEqual([
      { path: "steps.gate.decisions", code: "decision_gate_empty",
        message: "decisions must declare at least one decision (a gate no one can answer is refused)" },
    ]);
  });
});

describe("ch14-P1 family 8 — the re-homed role-set equality, dimension 10's full crossing", () => {
  it("direction 1: used-but-undeclared, at the CONTAINER grain", () => {
    expect(ch14Fail(ch14({ implement: { role: "ghost" } }))).toContainEqual({
      path: "roles", message: 'role "ghost" is used by steps but not declared',
    });
  });

  it("direction 2: declared-but-unused, at the ENTRY grain", () => {
    expect(ch14Fail(ch14({}, { roles: { implementer: {}, operator: {}, spare: {} } }))).toContainEqual({
      path: "roles.spare", message: 'role "spare" is declared but not used by any step',
    });
  });

  it("a ROLE-LESS step contributes nothing: a wait step does not make its roles map over-declared", () => {
    // The case the retired declaration could not express — its `collect`
    // had no per-member absence tolerance, and the only existing knob
    // would have disabled the equality for every wait-bearing template.
    expect(admitTemplate(ch14(), catalog).ok).toBe(true);
  });

  it("the grammar-invalid SUPPRESSION carries over: a bad role stands the equality down", () => {
    const findings = ch14Fail(ch14({ implement: { role: "a b" } }));
    expect(findings.filter((finding) => finding.path.startsWith("roles"))).toStrictEqual([]);
    expect(findings).toHaveLength(1);
  });

  it("the BROKEN-`steps` stand-down is SILENCE, not an internal validator failure — with a NONEMPTY roles map", () => {
    // The discriminating case the parity corpus cannot reach: its only
    // broken-`steps` fixture pairs it with an EMPTY roles map, where both
    // directions are empty regardless.
    const findings = ch14Fail(ch14({}, { steps: "x", roles: { implementer: {}, operator: {} } }));
    expect(findings).toStrictEqual([
      { path: "steps", message: "steps must be a NONEMPTY map of step-id -> step" },
    ]);
  });

  it("a step whose CLASS demands a role and has none stands it down too — the missing finding is the trace", () => {
    const template = ch14({ gate: null, hold: null }, { roles: { implementer: {} } });
    const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
    const step = steps["implement"];
    if (step === undefined) throw new Error("fixture");
    steps["implement"] = { ...without(step, "role"), transitions: { PASS: "done" } };
    expect(ch14Fail(template)).toStrictEqual([
      { path: "steps.implement", message: 'missing required key "role"' },
    ]);
  });
});

// ── FAMILY 10: the PRODUCED FORM — the half no finding-shaped lane can
// reach. ─────────────────────────────────────────────────────────────────

describe("ch14-P1 family 10 — the widened hook's admitted `advancesRound` map", () => {
  const threeClasses = (advanceOnArrivalAt?: readonly string[]): WorkflowTemplate =>
    ch14(
      {
        implement: { transitions: { PASS: "gate", SKIP: "hold" }, recommends: { PASS: "approve" } },
        gate: { decisions: { approve: { target: "hold" }, rework: { target: "implement" } } },
        hold: { wait: { kind: "commit_pending", resumeEvents: ["COMMIT", "ABORT"] },
          onResume: { COMMIT: "done", ABORT: "implement" } },
      },
      advanceOnArrivalAt === undefined ? {} : { round: { advanceOnArrivalAt } },
    );

  it("every edge of every class is present with an EXPLICIT boolean, both directions driven", () => {
    const steps = ch14Admit(threeClasses(["implement", "hold"]));
    // Per class, one advancing edge and one not — so a build that hard-
    // wired either answer for a class reds.
    expect(steps["implement"]?.["advancesRound"]).toStrictEqual({ PASS: false, SKIP: true });
    expect(steps["gate"]?.["advancesRound"]).toStrictEqual({ approve: true, rework: true });
    expect(steps["hold"]?.["advancesRound"]).toStrictEqual({ COMMIT: false, ABORT: true });
  });

  it("the per-class target extraction is FALSIFIABLE: a build reading a decision entry as its own target " +
    "produces all-false decision edges", () => {
    // `rework` targets `implement`, which advances; a build that read the
    // ENTRY (a map) instead of its `target` key would flag it false.
    const steps = ch14Admit(threeClasses(["implement"]));
    expect(steps["gate"]?.["advancesRound"]).toStrictEqual({ approve: false, rework: true });
  });

  it("no advancing set declared: the map is COMPLETE and all-false across all three classes", () => {
    const steps = ch14Admit(threeClasses());
    expect(steps["implement"]?.["advancesRound"]).toStrictEqual({ PASS: false, SKIP: false });
    expect(steps["gate"]?.["advancesRound"]).toStrictEqual({ approve: false, rework: false });
    expect(steps["hold"]?.["advancesRound"]).toStrictEqual({ COMMIT: false, ABORT: false });
  });
});
