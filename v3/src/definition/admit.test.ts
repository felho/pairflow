import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { createGateRegistry } from "../gates/index.js";
import type { GateCatalog, InlineGateRegistration } from "../ports/index.js";
import { fixtureTemplate } from "../testkit/templateFixture.js";
import { admitTemplate } from "./admit.js";
import type { ValidationFinding } from "./errors.js";
import { createFileDefinitionStore } from "./fileDefinitionStore.js";
import { loadTemplate } from "./load.js";

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
 * review step's `gates` verbatim (hostile shapes bypass the type).
 *
 * The RETURN cast this builder carried is GONE, not forgotten: K11's
 * relaxation made `Step`'s three fields optional, so the literal below
 * assigns directly. That is K11's "re-type where it authors a LEGAL class
 * value" half — the loose-builder half is untouched (twelve casts remain
 * in this file, each at a site that authors ILLEGAL input), and the
 * hostility still enters through the `Record<string, unknown>` review
 * step above. */
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
  };
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

/** The direct fixture's FILE twin — the SAME three-class document
 * `ch14()` builds, in its authored spelling, each block replaceable.
 * Families 3 and 8 both generate their file half from it: a register
 * that carries both fixtures cannot drift between the channels, which is
 * what a hand-written file-channel sample beside a direct one always
 * could (→ the two-channel discipline, dimension 1). */
const HAND_HEAD = "ref:\n  id: t\n  version: 1\nstart: implement\n";
const HAND_TAIL = "terminal:\n  - done\nroles:\n  implementer: {}\n  operator: {}\n";
const HAND_AGENT = "  implement:\n    role: implementer\n    instruction: i\n    transitions:\n      PASS: gate\n";
const HAND_GATE =
  "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n" +
  "    decisions:\n      approve:\n        target: done\n";
const HAND_WAIT =
  "  hold:\n    type: wait\n    wait:\n      kind: commit_pending\n      resumeEvents:\n        - COMMIT\n" +
  "    onResume:\n      COMMIT: done\n";

/** The direct fixture's FILE twin, each step block replaceable — the same
 * three-class document `ch14()` builds, in its authored spelling. */
function handFile(over: { agent?: string; gate?: string; wait?: string; tail?: string } = {}): string {
  return (
    HAND_HEAD +
    "steps:\n" +
    (over.agent ?? HAND_AGENT) +
    (over.gate ?? HAND_GATE) +
    (over.wait ?? HAND_WAIT) +
    (over.tail ?? HAND_TAIL)
  );
}

function handFileFindings(text: string): readonly ValidationFinding[] {
  const result = loadTemplate(new TextEncoder().encode(text), { catalog: createGateRegistry() });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected the file walk to refuse");
  expect(result.error.stage).toBe("validate");
  return result.error.findings as readonly ValidationFinding[];
}


// ── FAMILY 1: the DECLARED lanes of every node this packet adds or
// changes, driven through the real admission entry in BOTH directions,
// with the finding SET asserted WHOLE so a spurious extra reds. The
// membership is PARAMETERIZED over the declaration: one row per lane,
// derived by reading the nodes the packet mints. ─────────────────────────

interface LaneRow {
  /** The lane's CHANNEL-INDEPENDENT identity — the half the file
   * register carries verbatim. `lane` beside it is this channel's own
   * prose, which the two registers legitimately word differently. */
  readonly id: string;
  readonly node: string;
  readonly lane: string;
  readonly template: () => WorkflowTemplate;
  readonly findings: readonly ValidationFinding[];
}

const DECLARED_LANES: readonly LaneRow[] = [
  { id: "d-step-type/value-unknown-token", node: "d-step-type", lane: "value (an unknown token)",
    template: () => ch14({ gate: { type: "nope" } }),
    findings: [{ path: "steps.gate.type", message: "type must be one of human_gate, wait; got \"nope\"" }] },
  { id: "d-step-type/value-other-channels-spelling", node: "d-step-type", lane: "value (the FILE channel's authored spelling is not this channel's)",
    template: () => ch14({ gate: { type: "humanGate" } }),
    findings: [{ path: "steps.gate.type", message: "type must be one of human_gate, wait; got \"humanGate\"" }] },
  { id: "d-decisions/container", node: "d-decisions", lane: "container",
    template: () => ch14({ gate: { decisions: "x" } }),
    findings: [{ path: "steps.gate.decisions", code: "invalid_decision_gate_config",
      message: "decisions must be a map of decision key -> { target, payload? }; got \"x\"" }] },
  { id: "d-decision-key/key-grammar", node: "d-decision-key", lane: "key grammar",
    template: () => ch14({ gate: { decisions: { "a b": { target: "done" } } } }),
    findings: [{ path: "steps.gate.decisions",
      message: "invalid decision key \"a b\": ids contain no whitespace and no \".\" and are not the canonical " +
        "decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
  { id: "d-decision-entry/container", node: "d-decision-entry", lane: "container",
    template: () => ch14({ gate: { decisions: { approve: 5 } } }),
    findings: [{ path: "steps.gate.decisions.approve", code: "invalid_decision_gate_config",
      message: "a decision must be a map with exactly target (+ optional payload); got 5" }] },
  { id: "d-decision-entry/unknown-key", node: "d-decision-entry", lane: "unknown key (the `paylod` typo class)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", paylod: {} } } } }),
    findings: [{ path: "steps.gate.decisions.approve.paylod", code: "invalid_decision_gate_config",
      message: "unknown decision key 'paylod' (allowed: target, payload)" }] },
  { id: "d-decision-entry/missing-target", node: "d-decision-entry", lane: "missing `target`",
    template: () => ch14({ gate: { decisions: { approve: {} } } }),
    findings: [{ path: "steps.gate.decisions.approve", code: "invalid_decision_gate_config",
      message: "missing required key \"target\"" }] },
  { id: "d-decision-target/membership-unresolvable", node: "d-decision-target", lane: "membership (unresolvable)",
    template: () => ch14({ gate: { decisions: { approve: { target: "nope" } } } }),
    findings: [{ path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
      message: "decision target must name a step or a terminal id; got \"nope\"" }] },
  { id: "d-decision-target/membership-non-string", node: "d-decision-target", lane: "membership owns the NON-STRING fault too — ONE finding, no type lane",
    template: () => ch14({ gate: { decisions: { approve: { target: 5 } } } }),
    findings: [{ path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
      message: "decision target must name a step or a terminal id; got 5" }] },
  { id: "d-decision-payload/container", node: "d-decision-payload", lane: "container",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: true } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload", code: "invalid_decision_payload_schema",
      message: "payload must be a map of field name -> { required? }; got true" }] },
  { id: "d-payload-field/key-grammar", node: "d-payload-field", lane: "key grammar",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { "a.b": {} } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload",
      message: "invalid payload field name \"a.b\": ids contain no whitespace and no \".\" and are not the " +
        "canonical decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
  { id: "d-payload-spec/container", node: "d-payload-spec", lane: "container",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: true } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction", code: "invalid_decision_payload_schema",
      message: "a payload field spec must be a map with the single optional key required; got true" }] },
  { id: "d-payload-spec/unknown-key", node: "d-payload-spec", lane: "unknown key (no nested types yet)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { type: "markdown" } } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction.type", code: "invalid_decision_payload_schema",
      message: "unknown payload spec key 'type' (allowed: required)" }] },
  { id: "d-payload-required/value-non-boolean-scalar", node: "d-payload-required", lane: "value (the two BOOLEAN members)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { required: "yes" } } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction.required", code: "invalid_decision_payload_schema",
      message: "required must be one of true, false; got \"yes\"" }] },
  { id: "d-payload-required/value-quoted-boolean", node: "d-payload-required", lane: "value (a QUOTED boolean is not a boolean)",
    template: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { instruction: { required: "true" } } } } } }),
    findings: [{ path: "steps.gate.decisions.approve.payload.instruction.required", code: "invalid_decision_payload_schema",
      message: "required must be one of true, false; got \"true\"" }] },
  { id: "d-wait/container", node: "d-wait", lane: "container",
    template: () => ch14({ hold: { wait: 5 } }),
    findings: [{ path: "steps.hold.wait", message: "wait must be a map with exactly kind and resumeEvents; got 5" }] },
  { id: "d-wait/unknown-key", node: "d-wait", lane: "unknown key",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["COMMIT"], extra: 1 } } }),
    findings: [{ path: "steps.hold.wait.extra",
      message: "unknown key \"extra\" (a wait's only keys are kind, resumeEvents)" }] },
  { id: "d-wait-kind/presence", node: "d-wait-kind", lane: "presence",
    template: () => ch14({ hold: { wait: { resumeEvents: ["COMMIT"] } } }),
    findings: [{ path: "steps.hold.wait", message: "missing required key \"kind\"" }] },
  { id: "d-wait-kind/type-non-string", node: "d-wait-kind", lane: "type (a non-string kind)",
    template: () => ch14({ hold: { wait: { kind: 5, resumeEvents: ["COMMIT"] } } }),
    findings: [{ path: "steps.hold.wait.kind", message: "wait kind must be a nonempty string, got 5" }] },
  { id: "d-resume-events/presence", node: "d-resume-events", lane: "presence",
    template: () => ch14({ hold: { wait: { kind: "k" }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait", message: "missing required key \"resumeEvents\"" }] },
  { id: "d-resume-events/container", node: "d-resume-events", lane: "container",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: "COMMIT" }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait.resumeEvents",
      message: "resumeEvents must be a nonempty list of event-type ids; got \"COMMIT\"" }] },
  { id: "d-resume-events/nonempty", node: "d-resume-events", lane: "nonempty (a wait no event can resume is dead config)",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: [] }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait.resumeEvents", message: "resumeEvents must be a NONEMPTY list" }] },
  { id: "d-resume-events/per-occurrence-uniqueness", node: "d-resume-events", lane: "per-occurrence uniqueness",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["COMMIT", "COMMIT"] } } }),
    findings: [{ path: "steps.hold.wait.resumeEvents[1]", message: "duplicate resume event \"COMMIT\"" }] },
  { id: "d-resume-event/member-grammar", node: "d-resume-event", lane: "member grammar",
    template: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["a b"] }, onResume: {} } }),
    findings: [{ path: "steps.hold.wait.resumeEvents[0]",
      message: "invalid event type \"a b\": ids contain no whitespace and no \".\" and are not the canonical " +
        "decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
  { id: "d-on-resume/container", node: "d-on-resume", lane: "container",
    template: () => ch14({ hold: { onResume: 5 } }),
    findings: [{ path: "steps.hold.onResume",
      message: "onResume must be a map of event-type -> target id (it may be empty); got 5" }] },
  { id: "d-on-resume/dead-route", node: "d-on-resume", lane: "keysSubsetOf the step's own resumeEvents (dead route)",
    template: () => ch14({ hold: { onResume: { GHOST: "done" } } }),
    findings: [{ path: "steps.hold.onResume.GHOST",
      message: "dead resume route: 'GHOST' is not a declared resume event of step 'hold'" }] },
  { id: "d-resume-target/membership", node: "d-resume-target", lane: "membership",
    template: () => ch14({ hold: { onResume: { COMMIT: "nope" } } }),
    findings: [{ path: "steps.hold.onResume.COMMIT",
      message: "resume target must name a step or a terminal id; got \"nope\"" }] },
  { id: "d-recommends/container", node: "d-recommends", lane: "container",
    template: () => ch14({ implement: { recommends: 5 } }),
    findings: [{ path: "steps.implement.recommends",
      message: "recommends must be a map of event-type -> decision key; got 5" }] },
  { id: "d-recommends/dead-recommendation", node: "d-recommends", lane: "keysSubsetOf keys(transitions) (dead recommendation)",
    template: () => ch14({ implement: { recommends: { GHOST: "approve" } } }),
    findings: [{ path: "steps.implement.recommends.GHOST",
      message: "dead recommendation: 'GHOST' is not a transition of step 'implement'" }] },
  { id: "d-recommends-value/value-grammar", node: "d-recommends-value", lane: "value grammar (the decision-key class)",
    template: () => ch14({ implement: { recommends: { PASS: "a b" } } }),
    findings: [{ path: "steps.implement.recommends.PASS",
      message: "invalid decision key \"a b\": ids contain no whitespace and no \".\" and are not the canonical " +
        "decimal spelling of an integer in 0…4294967294 (a JS record hoists those keys)" }] },
];

/** A lane's CONTENT identity: its channel-independent id plus the SHAPE
 * of the finding set it owes — every path, with its code where it
 * carries one. A shared literal of these is what locks the two channel
 * registers together (see `CH14_LANE_IDENTITIES`). */
function laneIdentity(row: { readonly id: string; readonly findings: readonly ValidationFinding[] }): string {
  const shape = row.findings
    .map((finding) => (finding.code === undefined ? finding.path : `${finding.path}#${finding.code}`))
    .join(" + ");
  return `${row.id} | ${shape}`;
}

/** THE SHARED LANE REGISTER, compared by CONTENT.
 *
 * Family 1 runs the same declaration-derived register on both channels,
 * and the two halves live in two test MODULES: a genuinely shared
 * register is impossible between them, because importing one test file
 * from the other re-registers its whole suite. So the CONTENT comparison
 * is the mechanism — this list is spelled BYTE-IDENTICALLY in
 * `admit.test.ts` and `validate.test.ts`, each half asserts its own
 * register against it by equality, and each half additionally asserts
 * that every entry appears verbatim in the SIBLING module's source. The
 * pair is what closes the drift: a lane substituted in one register reds
 * against its own list, and a list edited to match it reds against the
 * sibling.
 *
 * Each entry is `<node>/<lane key> | <finding path>[#<code>]` — the
 * lane's identity plus the SHAPE of what it owes, so a row that keeps
 * its label while driving a NEIGHBOUR's case reds too. A node-set and a
 * count are not content: the arm's proving substitution kept both
 * (gate-2 re-check finding 2). The `lane` PROSE is deliberately not in
 * the identity: each channel names its own case (`humanGate` authored
 * against `human_gate` stored, YAML's unquoted `yes` against a JS
 * string), and dimension 1 rules that difference legitimate. */
const CH14_LANE_IDENTITIES: readonly string[] = [
  "d-step-type/value-unknown-token | steps.gate.type",
  "d-step-type/value-other-channels-spelling | steps.gate.type",
  "d-decisions/container | steps.gate.decisions#invalid_decision_gate_config",
  "d-decision-key/key-grammar | steps.gate.decisions",
  "d-decision-entry/container | steps.gate.decisions.approve#invalid_decision_gate_config",
  "d-decision-entry/unknown-key | steps.gate.decisions.approve.paylod#invalid_decision_gate_config",
  "d-decision-entry/missing-target | steps.gate.decisions.approve#invalid_decision_gate_config",
  "d-decision-target/membership-unresolvable | steps.gate.decisions.approve.target#decision_target_unresolved",
  "d-decision-target/membership-non-string | steps.gate.decisions.approve.target#decision_target_unresolved",
  "d-decision-payload/container | steps.gate.decisions.approve.payload#invalid_decision_payload_schema",
  "d-payload-field/key-grammar | steps.gate.decisions.approve.payload",
  "d-payload-spec/container | steps.gate.decisions.approve.payload.instruction#invalid_decision_payload_schema",
  "d-payload-spec/unknown-key | steps.gate.decisions.approve.payload.instruction.type#invalid_decision_payload_schema",
  "d-payload-required/value-non-boolean-scalar | steps.gate.decisions.approve.payload.instruction.required#invalid_decision_payload_schema",
  "d-payload-required/value-quoted-boolean | steps.gate.decisions.approve.payload.instruction.required#invalid_decision_payload_schema",
  "d-wait/container | steps.hold.wait",
  "d-wait/unknown-key | steps.hold.wait.extra",
  "d-wait-kind/presence | steps.hold.wait",
  "d-wait-kind/type-non-string | steps.hold.wait.kind",
  "d-resume-events/presence | steps.hold.wait",
  "d-resume-events/container | steps.hold.wait.resumeEvents",
  "d-resume-events/nonempty | steps.hold.wait.resumeEvents",
  "d-resume-events/per-occurrence-uniqueness | steps.hold.wait.resumeEvents[1]",
  "d-resume-event/member-grammar | steps.hold.wait.resumeEvents[0]",
  "d-on-resume/container | steps.hold.onResume",
  "d-on-resume/dead-route | steps.hold.onResume.GHOST",
  "d-resume-target/membership | steps.hold.onResume.COMMIT",
  "d-recommends/container | steps.implement.recommends",
  "d-recommends/dead-recommendation | steps.implement.recommends.GHOST",
  "d-recommends-value/value-grammar | steps.implement.recommends.PASS",
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

  it("this register IS the shared one, by CONTENT — identity and finding shape, in order", () => {
    expect(DECLARED_LANES.map(laneIdentity)).toStrictEqual(CH14_LANE_IDENTITIES);
  });

  it("and the FILE register carries the same content — every identity present verbatim in its module", () => {
    // The cross-module half of the lock. Reading the sibling's SOURCE is
    // what an import cannot do here without re-registering its suite;
    // the drift suites already read source text for the same reason.
    const sibling = readFileSync(new URL("./validate.test.ts", import.meta.url), "utf8");
    for (const identity of CH14_LANE_IDENTITIES) {
      expect(sibling, `lane identity missing from the file register: ${identity}`).toContain(
        JSON.stringify(identity),
      );
    }
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

/** The ONE id grammar's message tail — the D9 ban clause beside the
 * standing whitespace/dot clause — spelled once so a row asserting a
 * grammar finding by literal value cannot drift from its neighbours. */
const ID_RULE =
  ': ids contain no whitespace and no "." and are not the canonical decimal spelling of an ' +
  "integer in 0…4294967294 (a JS record hoists those keys)";

/** One case of one rule, in ONE register carrying BOTH channels'
 * fixtures. The file half is GENERATED from the same row as the direct
 * half — a rule driven on one channel only cannot hide here, and neither
 * can a file fixture that drifted from its direct twin (gate-2 re-check
 * finding 3: the matrix ran on the direct channel alone, so a file-only
 * regression of the ratified rule-4 stand-down stayed green). */
interface ReferenceCase {
  readonly claim: string;
  readonly direct: () => WorkflowTemplate;
  /** The AUTHORED file twin of the same case. */
  readonly file: () => string;
  /** The WHOLE finding set both channels owe. */
  readonly findings: readonly ValidationFinding[];
  /** Declared ONLY where dimension 1's two outcome classes make the
   * channels genuinely differ — the `type` token DOMAIN and the class
   * LABEL a message carries (`humanGate` authored, `human_gate` stored).
   * Absent means: byte-identical on both channels, and that identity is
   * itself the assertion. */
  readonly fileFindings?: readonly ValidationFinding[];
}

/** A conforming case needs no finding set: both channels must ADMIT. */
interface ReferenceConformingCase {
  readonly claim: string;
  readonly direct: () => WorkflowTemplate;
  readonly file: () => string;
}

/** One cross-position reference rule, expanded over dimension 9's FOUR
 * operand states. Each state asserts the WHOLE finding set, which is what
 * makes a stand-down provable: a lane that fired anyway would appear as a
 * spurious extra member rather than passing a containment check. */
interface ReferenceRuleRow {
  readonly rule: string;
  /** What the rule dereferences — the node whose four states are driven. */
  readonly operand: string;
  readonly violating: readonly ReferenceCase[];
  /** EVERY member of the declared domain, not a sample. */
  readonly conforming: readonly ReferenceConformingCase[];
  /** The operand present but of the WRONG KIND: its own container finding
   * alone, this rule standing down (→[suppression]). */
  readonly broken: readonly ReferenceCase[];
  /** The operand ABSENT: the declared knob's proof for the declared
   * lanes, D16's stand-down rule for the two hand lanes. */
  readonly absent: readonly ReferenceCase[];
}

/** Drop a key from a step of a freshly built fixture — a key authored
 * `undefined` is PRESENT and meets its own value lane, which is a
 * different case from the missing-key one an absent operand stages. */
function dropStepKey(template: WorkflowTemplate, id: string, key: string): WorkflowTemplate {
  const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
  const step = steps[id];
  if (step === undefined) throw new Error("fixture");
  steps[id] = without(step, key);
  return template;
}

/** Drop a ROOT key, for the operands that live at the template root. */
function dropRootKey(template: WorkflowTemplate, key: string): WorkflowTemplate {
  delete (template as unknown as Raw)[key];
  return template;
}

/** The three step blocks of the file twin, each with its variable body —
 * the authored counterparts of `ch14()`'s three overridable steps. */
const refAgent = (body: string): string => "  implement:\n    role: implementer\n    instruction: i\n" + body;
const refGate = (body: string): string =>
  "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n" + body;
const refHold = (body: string): string => "  hold:\n    type: wait\n" + body;

const REF_DECISIONS_DONE = "    decisions:\n      approve:\n        target: done\n";
const REF_WAIT_BODY = "    wait:\n      kind: commit_pending\n      resumeEvents:\n        - COMMIT\n";
const REF_ON_RESUME = "    onResume:\n      COMMIT: done\n";

const REFERENCE_RULES: readonly ReferenceRuleRow[] = [
  {
    rule: "1. a decision target ∈ steps ∪ terminal (D4)",
    operand: "the `steps` map and the `terminal` list — a UNION selector, so BOTH halves are driven",
    violating: [
      {
        claim: "an unresolvable target",
        direct: () => ch14({ gate: { decisions: { approve: { target: "ghost" } } } }),
        file: () => handFile({ gate: refGate("    decisions:\n      approve:\n        target: ghost\n") }),
        findings: [
          { path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
            message: "decision target must name a step or a terminal id; got \"ghost\"" },
        ],
      },
    ],
    // EVERY member of the domain — the TERMINAL half is the case a build
    // following the model SKETCH (which checks steps only) would miss.
    conforming: [
      { claim: "a step",
        direct: () => ch14({ gate: { decisions: { go: { target: "implement" } } } }),
        file: () => handFile({ gate: refGate("    decisions:\n      go:\n        target: implement\n") }) },
      { claim: "a TERMINAL",
        direct: () => ch14({ gate: { decisions: { go: { target: "done" } } } }),
        file: () => handFile({ gate: refGate("    decisions:\n      go:\n        target: done\n") }) },
      { claim: "its OWN gate (the self-target that genuinely re-arrives)",
        direct: () => ch14({ gate: { decisions: { go: { target: "gate" } } } }),
        file: () => handFile({ gate: refGate("    decisions:\n      go:\n        target: gate\n") }) },
    ],
    broken: [
      {
        claim: "a non-map `steps` (the union's first half)",
        direct: () => ch14({}, { steps: "x" }),
        file: () => HAND_HEAD + "steps: x\n" + HAND_TAIL,
        findings: [{ path: "steps", message: "steps must be a NONEMPTY map of step-id -> step" }],
      },
      {
        claim: "a non-list `terminal` (the union's second half)",
        direct: () => ch14({ gate: { decisions: { approve: { target: "done" } } } }, { terminal: 5 }),
        file: () => handFile({ tail: "terminal: 5\nroles:\n  implementer: {}\n  operator: {}\n" }),
        findings: [{ path: "terminal", message: "terminal must be a nonempty list of unique ids" }],
      },
    ],
    absent: [
      {
        claim: "`terminal` absent",
        direct: () => dropRootKey(ch14({ gate: { decisions: { approve: { target: "done" } } } }), "terminal"),
        file: () => handFile({ tail: "roles:\n  implementer: {}\n  operator: {}\n" }),
        findings: [{ path: "$", message: "missing required key \"terminal\"" }],
      },
      {
        claim: "`steps` absent",
        direct: () => dropRootKey(ch14(), "steps"),
        file: () => HAND_HEAD + HAND_TAIL,
        findings: [{ path: "$", message: "missing required key \"steps\"" }],
      },
    ],
  },
  {
    rule: "2. onResume keys ⊆ the step's own resumeEvents (D5, declared)",
    operand: "the SIBLING-NESTED `^.wait.resumeEvents` list",
    violating: [
      {
        claim: "a key outside the declared resume events",
        direct: () => ch14({ hold: { onResume: { GHOST: "done" } } }),
        file: () => handFile({ wait: refHold(REF_WAIT_BODY + "    onResume:\n      GHOST: done\n") }),
        findings: [
          { path: "steps.hold.onResume.GHOST",
            message: "dead resume route: 'GHOST' is not a declared resume event of step 'hold'" },
        ],
      },
    ],
    conforming: [
      { claim: "every declared member routed",
        direct: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["A", "B"] }, onResume: { A: "done", B: "implement" } } }),
        file: () => handFile({ wait: refHold(
          "    wait:\n      kind: k\n      resumeEvents:\n        - A\n        - B\n    onResume:\n      A: done\n      B: implement\n") }) },
      { claim: "a member with NO route beside one that has one — admissible by design",
        direct: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["A", "B"] }, onResume: { A: "done" } } }),
        file: () => handFile({ wait: refHold(
          "    wait:\n      kind: k\n      resumeEvents:\n        - A\n        - B\n    onResume:\n      A: done\n") }) },
      { claim: "the EMPTY onResume map",
        direct: () => ch14({ hold: { onResume: {} } }),
        file: () => handFile({ wait: refHold(REF_WAIT_BODY + "    onResume: {}\n") }) },
    ],
    broken: [
      {
        claim: "a non-map `wait`",
        direct: () => ch14({ hold: { wait: 5 } }),
        file: () => handFile({ wait: refHold("    wait: 5\n" + REF_ON_RESUME) }),
        findings: [{ path: "steps.hold.wait", message: "wait must be a map with exactly kind and resumeEvents; got 5" }],
      },
      {
        claim: "a non-list `resumeEvents`",
        direct: () => ch14({ hold: { wait: { kind: "k", resumeEvents: "A" } } }),
        file: () => handFile({ wait: refHold("    wait:\n      kind: k\n      resumeEvents: A\n" + REF_ON_RESUME) }),
        findings: [
          { path: "steps.hold.wait.resumeEvents",
            message: "resumeEvents must be a nonempty list of event-type ids; got \"A\"" },
        ],
      },
    ],
    absent: [
      // The declared `whenOperandAbsent: "skip"` knob's proof: without it
      // this answers `internal validator failure` instead of the class
      // hand lane's honest finding (PROBE-CH14P1-5).
      {
        claim: "`wait` absent — the declared knob's proof",
        direct: () => dropStepKey(ch14(), "hold", "wait"),
        file: () => handFile({ wait: refHold(REF_ON_RESUME) }),
        findings: [{ path: "steps.hold", message: "missing required key \"wait\"" }],
      },
      {
        claim: "`resumeEvents` absent inside a present `wait`",
        direct: () => ch14({ hold: { wait: { kind: "k" } } }),
        file: () => handFile({ wait: refHold("    wait:\n      kind: k\n" + REF_ON_RESUME) }),
        findings: [{ path: "steps.hold.wait", message: "missing required key \"resumeEvents\"" }],
      },
    ],
  },
  {
    rule: "3. recommends keys ⊆ keys(transitions) (D16, declared)",
    operand: "the SIBLING `transitions` map",
    violating: [
      {
        claim: "a key outside keys(transitions)",
        direct: () => ch14({ implement: { recommends: { GHOST: "approve" } } }),
        file: () => handFile({ agent: HAND_AGENT + "    recommends:\n      GHOST: approve\n" }),
        findings: [
          { path: "steps.implement.recommends.GHOST",
            message: "dead recommendation: 'GHOST' is not a transition of step 'implement'" },
        ],
      },
    ],
    conforming: [
      { claim: "every declared transition key recommended",
        direct: () => ch14({ implement: { transitions: { PASS: "gate", ALSO: "gate" }, recommends: { PASS: "approve", ALSO: "approve" } } }),
        file: () => handFile({ agent: refAgent(
          "    transitions:\n      PASS: gate\n      ALSO: gate\n    recommends:\n      PASS: approve\n      ALSO: approve\n") }) },
      { claim: "the EMPTY recommends map",
        direct: () => ch14({ implement: { recommends: {} } }),
        file: () => handFile({ agent: HAND_AGENT + "    recommends: {}\n" }) },
    ],
    broken: [
      // The WRONG-KIND operand: the gap a rule driven only for its ABSENT
      // state leaves open.
      {
        claim: "a non-map `transitions`",
        direct: () => ch14({ implement: { transitions: 5, recommends: { PASS: "approve" } }, hold: null }),
        file: () => handFile({ agent: refAgent("    transitions: 5\n    recommends:\n      PASS: approve\n"), wait: "" }),
        findings: [
          { path: "steps.implement.transitions",
            message: "transitions must be a map of event-type -> target id (it may be empty)" },
        ],
      },
    ],
    absent: [
      {
        claim: "`transitions` absent",
        direct: () => dropStepKey(ch14({ implement: { recommends: { PASS: "approve" } }, hold: null }), "implement", "transitions"),
        file: () => handFile({ agent: refAgent("    recommends:\n      PASS: approve\n"), wait: "" }),
        findings: [{ path: "steps.implement", message: "missing required key \"transitions\"" }],
      },
    ],
  },
  {
    rule: "4. the recommended edge's TARGET is a humanGate (D16, hand — a two-hop dereference)",
    operand: "the REMOTE step named by `transitions[event]`, and its class discriminator",
    violating: [
      {
        claim: "the target is another STEP",
        direct: () => ch14({ implement: { transitions: { PASS: "gate", SKIP: "hold" }, recommends: { SKIP: "approve" } } }),
        file: () => handFile({ agent: refAgent(
          "    transitions:\n      PASS: gate\n      SKIP: hold\n    recommends:\n      SKIP: approve\n") }),
        findings: [
          { path: "steps.implement.recommends.SKIP", code: "recommends_on_non_gate",
            message: "recommends: 'SKIP' routes to step 'hold', which is not a humanGate step — " +
              "a recommendation is meaningful only where a decision will be asked" },
        ],
      },
      // A TERMINAL target RESOLVES and is definitively not a gate — the
      // build-time defect this discipline caught (the lane had stood down
      // on it, conflating "terminal" with "unresolvable").
      {
        claim: "the target is a TERMINAL — it resolves, and is still not a gate",
        direct: () => ch14({ implement: { transitions: { PASS: "gate", SKIP: "done" }, recommends: { SKIP: "approve" } } }),
        file: () => handFile({ agent: refAgent(
          "    transitions:\n      PASS: gate\n      SKIP: done\n    recommends:\n      SKIP: approve\n") }),
        findings: [
          { path: "steps.implement.recommends.SKIP", code: "recommends_on_non_gate",
            message: "recommends: 'SKIP' routes to step 'done', which is not a humanGate step — " +
              "a recommendation is meaningful only where a decision will be asked" },
        ],
      },
    ],
    conforming: [
      { claim: "the target IS a humanGate",
        direct: () => ch14({ implement: { recommends: { PASS: "approve" } } }),
        file: () => handFile({ agent: HAND_AGENT + "    recommends:\n      PASS: approve\n" }) },
    ],
    broken: [
      {
        claim: "the remote step is not a map at all — its own container finding ALONE",
        direct: () => ch14({ implement: { recommends: { PASS: "approve" } } },
          { steps: {
            implement: { role: "implementer", instruction: "i", transitions: { PASS: "gate" }, recommends: { PASS: "approve" } },
            gate: 5,
          } }),
        file: () => handFile({ agent: HAND_AGENT + "    recommends:\n      PASS: approve\n", gate: "  gate: 5\n", wait: "" }),
        findings: [
          { path: "steps.gate",
            message: "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig, gates)" },
        ],
      },
      // The remote step's DISCRIMINATOR is unusable, so its class was never
      // decided — a third state beside `terminal` (resolves, definitively
      // not a gate) and unresolvable (already stands down). The lane STANDS
      // DOWN: the step's own type lane owns the authored mistake, and a
      // second finding naming a class the author never declared would
      // mis-address them. Ratified 2026-08-16 at the gate-2 aftermath.
      // The file twin is not decoration: the stand-down is a HAND lane, so
      // a channel-scoped regression of it is expressible and was, until
      // this row's file half, invisible.
      {
        claim: "the remote step's own `type` is unusable — its class was never decided",
        direct: () => ch14({ implement: { recommends: { PASS: "approve" } }, gate: { type: "nope" } }),
        file: () => handFile({
          agent: HAND_AGENT + "    recommends:\n      PASS: approve\n",
          gate: refGate(REF_DECISIONS_DONE).replace("humanGate", "nope"),
        }),
        findings: [{ path: "steps.gate.type", message: "type must be one of human_gate, wait; got \"nope\"" }],
        fileFindings: [{ path: "steps.gate.type", message: "type must be one of humanGate, wait; got \"nope\"" }],
      },
    ],
    absent: [
      {
        claim: "the agent step has no `transitions` — the operand cannot be read",
        direct: () => dropStepKey(ch14({ implement: { recommends: { PASS: "approve" } }, hold: null }), "implement", "transitions"),
        file: () => handFile({ agent: refAgent("    recommends:\n      PASS: approve\n"), wait: "" }),
        findings: [{ path: "steps.implement", message: "missing required key \"transitions\"" }],
      },
      {
        claim: "the transition target does not resolve — the declared membership lane already named it",
        direct: () => ch14({ implement: { transitions: { PASS: "ghost" }, recommends: { PASS: "approve" } }, hold: null }),
        file: () => handFile({ agent: refAgent("    transitions:\n      PASS: ghost\n    recommends:\n      PASS: approve\n"), wait: "" }),
        findings: [
          { path: "steps.implement.transitions.PASS",
            message: "transition target must name a step or a terminal id; got \"ghost\"" },
        ],
      },
    ],
  },
  {
    rule: "5. the recommends VALUE ∈ that gate's declared decision keys (D16, hand — the second hop)",
    operand: "the REMOTE gate's `decisions` keyset",
    violating: [
      {
        claim: "a value naming no decision of that gate",
        direct: () => ch14({ implement: { recommends: { PASS: "ghost" } } }),
        file: () => handFile({ agent: HAND_AGENT + "    recommends:\n      PASS: ghost\n" }),
        findings: [
          { path: "steps.implement.recommends.PASS", code: "recommends_unknown_decision",
            message: "recommends: 'ghost' is not a declared decision of step 'gate'" },
        ],
      },
    ],
    conforming: [
      { claim: "the gate's first declared decision",
        direct: () => ch14({
          implement: { recommends: { PASS: "approve" } },
          gate: { decisions: { approve: { target: "done" }, request_rework: { target: "implement" } } },
        }),
        file: () => handFile({
          agent: HAND_AGENT + "    recommends:\n      PASS: approve\n",
          gate: refGate("    decisions:\n      approve:\n        target: done\n      request_rework:\n        target: implement\n"),
        }) },
      { claim: "the gate's second declared decision",
        direct: () => ch14({
          implement: { recommends: { PASS: "request_rework" } },
          gate: { decisions: { approve: { target: "done" }, request_rework: { target: "implement" } } },
        }),
        file: () => handFile({
          agent: HAND_AGENT + "    recommends:\n      PASS: request_rework\n",
          gate: refGate("    decisions:\n      approve:\n        target: done\n      request_rework:\n        target: implement\n"),
        }) },
    ],
    broken: [
      {
        claim: "a non-map `decisions` on the target gate",
        direct: () => ch14({ implement: { recommends: { PASS: "approve" } }, gate: { decisions: "x" } }),
        file: () => handFile({
          agent: HAND_AGENT + "    recommends:\n      PASS: approve\n",
          gate: refGate("    decisions: x\n"),
        }),
        findings: [
          { path: "steps.gate.decisions", code: "invalid_decision_gate_config",
            message: "decisions must be a map of decision key -> { target, payload? }; got \"x\"" },
        ],
      },
      // The build-time defect this discipline caught: a grammar-invalid
      // value drew BOTH its grammar finding and a membership finding,
      // where the declared engine suppresses.
      {
        claim: "the VALUE's own grammar fails — the grammar finding ALONE",
        direct: () => ch14({ implement: { recommends: { PASS: "a b" } } }),
        file: () => handFile({ agent: HAND_AGENT + "    recommends:\n      PASS: \"a b\"\n" }),
        findings: [
          { path: "steps.implement.recommends.PASS", message: `invalid decision key "a b"${ID_RULE}` },
        ],
      },
    ],
    absent: [
      {
        claim: "the target gate declares no `decisions` at all",
        direct: () => dropStepKey(ch14({ implement: { recommends: { PASS: "approve" } } }), "gate", "decisions"),
        file: () => handFile({ agent: HAND_AGENT + "    recommends:\n      PASS: approve\n", gate: refGate("") }),
        findings: [
          { path: "steps.gate", code: "invalid_decision_gate_config", message: "missing required key \"decisions\"" },
        ],
      },
      {
        claim: "a `recommends` map on a class that refuses it — the class refusal ALONE",
        direct: () => ch14({ gate: { recommends: { PASS: "approve" } } }),
        file: () => handFile({ gate: refGate(REF_DECISIONS_DONE + "    recommends:\n      PASS: approve\n") }),
        findings: [
          { path: "steps.gate.recommends",
            message: "unknown key recommends on a human_gate step " +
              "(a human_gate step's keys are type, role, instruction, decisions)" },
        ],
        fileFindings: [
          { path: "steps.gate.recommends",
            message: "unknown key recommends on a humanGate step " +
              "(a humanGate step's keys are type, role, instruction, decisions)" },
        ],
      },
    ],
  },
];

// RULE 4's THIRD remote state, RATIFIED 2026-08-16 and pinned in the
// broken-operand rows above: where the remote step's own `type` is
// unusable its class was never decided, and `recommends_on_non_gate`
// STANDS DOWN — the step's own type lane owns the authored mistake. It
// is a third state beside `terminal` (resolves, definitively not a gate
// → finding) and unresolvable (stands down); the ground is D2's per-step
// gate, D16's "a second finding at a remote path would mis-address the
// author" and D7's binding of the hand lanes to the engine's suppression
// discipline. The whole set is pinned so a regression reds loudly.

describe("ch14-P1 family 3 — the five reference rules × dimension 9's four operand states", () => {
  for (const row of REFERENCE_RULES) {
    describe(`${row.rule} — operand: ${row.operand}`, () => {
      const drive = (label: string, cases: readonly ReferenceCase[]): void => {
        for (const entry of cases) {
          it(`${label} (direct): ${entry.claim}`, () => {
            expect(ch14Fail(entry.direct())).toStrictEqual(entry.findings);
          });
          it(`${label} (file): ${entry.claim}`, () => {
            expect(handFileFindings(entry.file())).toStrictEqual(entry.fileFindings ?? entry.findings);
          });
        }
      };

      drive("VIOLATING", row.violating);
      for (const entry of row.conforming) {
        it(`CONFORMING (direct): ${entry.claim}`, () => {
          expect(admitTemplate(entry.direct(), catalog).ok).toBe(true);
        });
        it(`CONFORMING (file): ${entry.claim}`, () => {
          expect(loadTemplate(new TextEncoder().encode(entry.file()), { catalog: createGateRegistry() }).ok).toBe(true);
        });
      }
      drive("BROKEN operand", row.broken);
      drive("ABSENT operand", row.absent);
    });
  }

  it("the register carries dimension 9's FIVE rules, each with all FOUR operand states, on BOTH channels", () => {
    expect(REFERENCE_RULES).toHaveLength(5);
    for (const row of REFERENCE_RULES) {
      expect(row.violating.length, `${row.rule}: violating`).toBeGreaterThanOrEqual(1);
      expect(row.conforming.length, `${row.rule}: conforming`).toBeGreaterThanOrEqual(1);
      expect(row.broken.length, `${row.rule}: broken operand`).toBeGreaterThanOrEqual(1);
      expect(row.absent.length, `${row.rule}: absent operand`).toBeGreaterThanOrEqual(1);
    }
    // The channel pairing is TYPE-enforced — every case carries both a
    // `direct` and a `file` fixture, so a half added to one channel only
    // does not compile. What is asserted here is that no case answers the
    // pairing with an empty document.
    const cases = REFERENCE_RULES.flatMap((row) => [...row.violating, ...row.broken, ...row.absent]);
    const conforming = REFERENCE_RULES.flatMap((row) => row.conforming);
    for (const entry of [...cases, ...conforming]) {
      expect(entry.file().length, `${entry.claim}: file fixture`).toBeGreaterThan(0);
    }
  });
});

// ── FAMILY 4: ACCUMULATION and its converse. Each member is a
// COMBINATION lane holding both conditions at once, because isolated
// lanes cannot falsify a reordered implementation. ───────────────────────

interface AccumulationRow {
  readonly container: string;
  /** Two INDEPENDENT faults in different positions → BOTH findings. */
  readonly both: () => WorkflowTemplate;
  /** The whole ORDERED finding set the `both` fixture owes, by LITERAL
   * value. A COUNT (`>= 2`) is not content: it survives a build that
   * emits the right number of wrong findings — swapping one expected
   * code or message here reds while the count stays 2, which is the
   * mutation this column exists to catch.
   *
   * It is the WHOLE document's set, taken with NO prefix narrowing: a
   * filter to the container's own subtree cannot see a spurious finding
   * OUTSIDE the container, which is the second mutation this column
   * exists to catch (gate-2 re-check finding 4). Every fixture below is
   * therefore staged so the container's faults are the document's ONLY
   * faults — a fixture that cannot be staged that way would be a
   * different row, not a reason to re-narrow. */
  readonly bothFindings: readonly ValidationFinding[];
  /** A fault UNDER a broken container → the container's finding ALONE. */
  readonly suppressed: () => WorkflowTemplate;
  /** The suppressed side's whole set, likewise by literal value and
   * likewise UNNARROWED. */
  readonly suppressedFindings: readonly ValidationFinding[];
}

const ACCUMULATION: readonly AccumulationRow[] = [
  { container: "decisions",
    both: () => ch14({ gate: { decisions: { approve: { target: "ghost" }, rework: { target: "phantom" } } } }),
    bothFindings: [
      { path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
        message: "decision target must name a step or a terminal id; got \"ghost\"" },
      { path: "steps.gate.decisions.rework.target", code: "decision_target_unresolved",
        message: "decision target must name a step or a terminal id; got \"phantom\"" },
    ],
    suppressed: () => ch14({ gate: { decisions: 5 } }),
    suppressedFindings: [
      { path: "steps.gate.decisions", code: "invalid_decision_gate_config",
        message: "decisions must be a map of decision key -> { target, payload? }; got 5" },
    ] },
  { container: "a decision entry",
    both: () => ch14({ gate: { decisions: { approve: { target: "ghost", paylod: {} } } } }),
    bothFindings: [
      { path: "steps.gate.decisions.approve.paylod", code: "invalid_decision_gate_config",
        message: "unknown decision key 'paylod' (allowed: target, payload)" },
      { path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved",
        message: "decision target must name a step or a terminal id; got \"ghost\"" },
    ],
    suppressed: () => ch14({ gate: { decisions: { approve: 5 } } }),
    suppressedFindings: [
      { path: "steps.gate.decisions.approve", code: "invalid_decision_gate_config",
        message: "a decision must be a map with exactly target (+ optional payload); got 5" },
    ] },
  { container: "payload",
    both: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: true, b: true } } } } }),
    bothFindings: [
      { path: "steps.gate.decisions.approve.payload.a", code: "invalid_decision_payload_schema",
        message: "a payload field spec must be a map with the single optional key required; got true" },
      { path: "steps.gate.decisions.approve.payload.b", code: "invalid_decision_payload_schema",
        message: "a payload field spec must be a map with the single optional key required; got true" },
    ],
    suppressed: () => ch14({ gate: { decisions: { approve: { target: "done", payload: 5 } } } }),
    suppressedFindings: [
      { path: "steps.gate.decisions.approve.payload", code: "invalid_decision_payload_schema",
        message: "payload must be a map of field name -> { required? }; got 5" },
    ] },
  { container: "a payload field spec",
    both: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: { type: "md" }, b: { nested: 1 } } } } } }),
    bothFindings: [
      { path: "steps.gate.decisions.approve.payload.a.type", code: "invalid_decision_payload_schema",
        message: "unknown payload spec key 'type' (allowed: required)" },
      { path: "steps.gate.decisions.approve.payload.b.nested", code: "invalid_decision_payload_schema",
        message: "unknown payload spec key 'nested' (allowed: required)" },
    ],
    suppressed: () => ch14({ gate: { decisions: { approve: { target: "done", payload: { a: 5 } } } } }),
    suppressedFindings: [
      { path: "steps.gate.decisions.approve.payload.a", code: "invalid_decision_payload_schema",
        message: "a payload field spec must be a map with the single optional key required; got 5" },
    ] },
  // `onResume` is emptied on the two `wait`-container rows: the fixture's
  // standing `COMMIT` route would otherwise draw a dead-route finding of
  // its OWN once the declared resume events are replaced — a third
  // finding outside the container under test. Staging it away is what
  // keeps the row a clean two-fault accumulation case while the set is
  // asserted UNNARROWED.
  { container: "wait",
    both: () => ch14({ hold: { wait: { kind: "a b", resumeEvents: ["c d"] }, onResume: {} } }),
    bothFindings: [
      { path: "steps.hold.wait.kind", message: `invalid wait kind "a b"${ID_RULE}` },
      { path: "steps.hold.wait.resumeEvents[0]", message: `invalid event type "c d"${ID_RULE}` },
    ],
    suppressed: () => ch14({ hold: { wait: 5 } }),
    suppressedFindings: [
      { path: "steps.hold.wait", message: "wait must be a map with exactly kind and resumeEvents; got 5" },
    ] },
  { container: "resumeEvents",
    both: () => ch14({ hold: { wait: { kind: "k", resumeEvents: ["a b", "c d"] }, onResume: {} } }),
    bothFindings: [
      { path: "steps.hold.wait.resumeEvents[0]", message: `invalid event type "a b"${ID_RULE}` },
      { path: "steps.hold.wait.resumeEvents[1]", message: `invalid event type "c d"${ID_RULE}` },
    ],
    suppressed: () => ch14({ hold: { wait: { kind: "k", resumeEvents: 5 } } }),
    suppressedFindings: [
      { path: "steps.hold.wait.resumeEvents",
        message: "resumeEvents must be a nonempty list of event-type ids; got 5" },
    ] },
  { container: "onResume",
    both: () => ch14({ hold: { onResume: { GHOST: "done", PHANTOM: "done" } } }),
    bothFindings: [
      { path: "steps.hold.onResume.GHOST",
        message: "dead resume route: 'GHOST' is not a declared resume event of step 'hold'" },
      { path: "steps.hold.onResume.PHANTOM",
        message: "dead resume route: 'PHANTOM' is not a declared resume event of step 'hold'" },
    ],
    suppressed: () => ch14({ hold: { onResume: 5 } }),
    suppressedFindings: [
      { path: "steps.hold.onResume",
        message: "onResume must be a map of event-type -> target id (it may be empty); got 5" },
    ] },
  { container: "recommends",
    both: () => ch14({ implement: { transitions: { PASS: "gate", SKIP: "hold" }, recommends: { GHOST: "approve", SKIP: "approve" } } }),
    bothFindings: [
      { path: "steps.implement.recommends.GHOST",
        message: "dead recommendation: 'GHOST' is not a transition of step 'implement'" },
      { path: "steps.implement.recommends.SKIP", code: "recommends_on_non_gate",
        message: "recommends: 'SKIP' routes to step 'hold', which is not a humanGate step — " +
          "a recommendation is meaningful only where a decision will be asked" },
    ],
    suppressed: () => ch14({ implement: { recommends: 5 } }),
    suppressedFindings: [
      { path: "steps.implement.recommends",
        message: "recommends must be a map of event-type -> decision key; got 5" },
    ] },
];

describe("ch14-P1 family 4 — findings accumulate; a broken container suppresses its dependents", () => {
  for (const row of ACCUMULATION) {
    it(`${row.container}: two INDEPENDENT faults yield BOTH findings (a first-return build reds here)`, () => {
      expect(ch14Fail(row.both())).toStrictEqual(row.bothFindings);
    });

    it(`${row.container}: a fault UNDER a broken container yields the container's finding ALONE`, () => {
      expect(ch14Fail(row.suppressed())).toStrictEqual(row.suppressedFindings);
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
      // ANY own `code` field, with NO prefix filter: four of the six
      // names (`invalid_decision_*`, `recommends_*`) do not begin with
      // "decision", so a prefix-filtered census would let a code land on
      // these lanes unseen — the exclusivity claim is code-LESS, not
      // "carries no name from one spelling family".
      const coded = findings.filter((finding) => finding.code !== undefined);
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

// ── FAMILY 7: NON-MOVEMENT. →[parity-corpus] rules the corpus DERIVED
// from the CALLERS of the entry points this packet touches — never from a
// file list, which the ADR-019 D5 parity gate measured as UNDER-counting
// the surface. The enumeration below is that derivation, re-run at this
// build: every PRODUCTION call site of `admitTemplate`, of the file
// pipeline's `loadTemplate` (whose validate stage is the sole consumer of
// `admitFromSource`), and of the dev CLI's validate verb. Each caller is
// REPLAYED and its WHOLE row compared — the admitted value entire, or the
// entire `{stage, findings}` document — so a moved path, message, code or
// produced field surfaces as a row difference rather than slipping past a
// containment check. The ONE delta is asserted POSITIVELY so its ABSENCE
// reds as loudly as an extra one, and the THREE carrier moves are
// asserted UNCHANGED so a build that manufactures a message change to
// satisfy the family reds instead. ───────────────────────────────────────

/** The canonical authoring file — the SINGLE source both channels and
 * every production caller reach (ADR-005; the testkit builder is
 * equality-pinned to it). */
const CANONICAL_DIR = join(process.cwd(), "templates");
const CANONICAL_FILE = "local-pair-v0@1.yaml";
const canonicalBytes = (): Uint8Array =>
  new Uint8Array(readFileSync(join(CANONICAL_DIR, CANONICAL_FILE)));

/** One PRODUCTION caller of a touched entry point. `site` is the
 * enumeration's own record: a caller that moves or disappears is a
 * re-derivation the next build owes, not a silent corpus shrink. */
interface ParityCaller {
  readonly site: string;
  readonly entry: string;
  /** The WHOLE row this caller observes. */
  readonly row: () => Promise<unknown>;
}

const PARITY_CALLERS: readonly ParityCaller[] = [
  {
    site: "src/cli/dev/main.ts:576 — verbReplay",
    entry: "admitTemplate",
    row: async () => {
      const result = admitTemplate(fixtureTemplate(), createGateRegistry());
      return result.ok ? result.template : result.findings;
    },
  },
  {
    site: "src/cli/dev/main.ts:667 — verbValidate",
    entry: "loadTemplate (file pipeline → admitFromSource)",
    row: async () => {
      const result = loadTemplate(canonicalBytes(), {
        path: join(CANONICAL_DIR, CANONICAL_FILE),
        catalog: createGateRegistry(),
      });
      return result.ok ? result.template : result.error;
    },
  },
  {
    site: "src/definition/fileDefinitionStore.ts:78 — the pinned DefinitionStore.load",
    entry: "loadTemplate (reached by cli/main.ts ×5, cli/runnerVerbs.ts ×2, cli/dev/main.ts inject)",
    row: async () => {
      const store = createFileDefinitionStore(CANONICAL_DIR, createGateRegistry());
      return await store.load({ id: "local-pair-v0", version: 1 });
    },
  },
];

describe("ch14-P1 family 7 — the caller-derived corpus: every production caller replayed, WHOLE rows compared", () => {
  it("the enumeration is the derivation's own record — three production call sites, two entry points", () => {
    expect(PARITY_CALLERS.map((caller) => caller.site)).toStrictEqual([
      "src/cli/dev/main.ts:576 — verbReplay",
      "src/cli/dev/main.ts:667 — verbValidate",
      "src/definition/fileDefinitionStore.ts:78 — the pinned DefinitionStore.load",
    ]);
  });

  it("every caller observes the SAME whole admitted value — the two channels have not forked", async () => {
    const rows = await Promise.all(PARITY_CALLERS.map(async (caller) => await caller.row()));
    const [direct] = rows;
    expect(direct, "the canonical fixture must still ADMIT — dev replay throws unreachable otherwise").toBeDefined();
    for (const [index, row] of rows.entries()) {
      expect(row, `${PARITY_CALLERS[index]?.site ?? ""} (${PARITY_CALLERS[index]?.entry ?? ""})`).toEqual(direct);
    }
  });

  // The whole-row comparison above is only as strong as the row's own
  // shape, so the produced positions the widened hook writes are named
  // here: a build that dropped `advancesRound` from the canonical
  // template's steps would still make all three rows EQUAL.
  it("the whole row carries the produced positions the widening touches", async () => {
    const row = (await (PARITY_CALLERS[0]?.row() ?? Promise.resolve(undefined))) as
      | { steps: Record<string, Record<string, unknown>> }
      | undefined;
    const steps = row?.steps ?? {};
    for (const [id, step] of Object.entries(steps)) {
      expect(step["advancesRound"], `steps.${id}.advancesRound`).toBeDefined();
    }
  });
});

describe("ch14-P1 family 7 — the file channel's whole findings DOCUMENT, per caller-reachable failure", () => {
  // `admitFromSource` (src/definition/load.ts:253) has no caller but the
  // validate stage, so its parity is measured where the two production
  // loadTemplate callers observe it: the whole `{stage, findings}`
  // document, compared entire rather than probed for one member.
  const hostile: readonly (readonly [string, string, unknown])[] = [
    ["a step with no `role` — the FIRST relaxed key, carrier move 1",
      "ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    instruction: i\n    transitions: {}\nterminal:\n  - done\nroles:\n  r: {}\n",
      { stage: "validate", findings: [
        { path: "steps.s", message: 'missing required key "role"' },
      ] }],
    ["an undeclared role — carrier move 2, direction 1",
      "ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: ghost\n    instruction: i\n    transitions: {}\nterminal:\n  - done\nroles:\n  r: {}\n",
      { stage: "validate", findings: [
        { path: "roles", message: 'role "ghost" is used by steps but not declared' },
        { path: "roles.r", message: 'role "r" is declared but not used by any step' },
      ] }],
    ["a non-map step — carrier move 3, the BYTE-IDENTICAL container message",
      "ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s: 5\nterminal:\n  - done\nroles:\n  r: {}\n",
      { stage: "validate", findings: [
        { path: "steps.s",
          message: "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig, gates)" },
      ] }],
    ["an in-class integer id — the ONE delta, at the file channel's own entry",
      "ref:\n  id: t\n  version: 1\nstart: \"10\"\nsteps:\n  \"10\":\n    role: r\n    instruction: i\n    transitions: {}\nterminal:\n  - done\nroles:\n  r: {}\n",
      { stage: "validate", findings: [
        { path: "steps", message: `invalid step id "10"${ID_RULE}` },
      ] }],
  ];
  for (const [claim, text, document] of hostile) {
    it(claim, () => {
      const result = loadTemplate(new TextEncoder().encode(text), { catalog: createGateRegistry() });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect({ stage: result.error.stage, findings: result.error.findings }).toStrictEqual(document);
    });
  }
});

describe("ch14-P1 family 7 — the ONE delta, asserted POSITIVELY", () => {
  it("the id grammar's message GROWS its ban clause and KEEPS its standing one", () => {
    const findings = ch14Fail(BAN_POSITIONS[0]?.template("10") ?? ch14());
    const message = findings.map((finding) => finding.message).join("\n");
    expect(message).toContain('ids contain no whitespace and no "."');
    expect(message).toContain("are not the canonical decimal spelling of an integer in 0…4294967294");
  });

  it("and it is the ONLY delta: the whole finding set at that position is the grown message and nothing else", () => {
    expect(ch14Fail(BAN_POSITIONS[0]?.template("10") ?? ch14())).toStrictEqual([
      { path: "steps", message: `invalid step id "10"${ID_RULE}` },
    ]);
  });
});

describe("ch14-P1 family 7 — the THREE carrier moves, asserted UNCHANGED (whole finding sets)", () => {
  it("move 1: the three relaxed keys' presence findings keep their PATHS and MESSAGES", () => {
    for (const key of ["role", "instruction", "transitions"] as const) {
      const template = ch14({ gate: null, hold: null }, { roles: { implementer: {} } });
      const steps = (template as unknown as { steps: Record<string, Raw> }).steps;
      const step = steps["implement"];
      if (step === undefined) throw new Error("fixture");
      steps["implement"] = { ...without(step, key), transitions: { PASS: "done" } };
      if (key === "transitions") delete steps["implement"]?.["transitions"];
      expect(ch14Fail(template), key).toStrictEqual([
        { path: "steps.implement", message: `missing required key "${key}"` },
      ]);
    }
  });

  it("move 2: the role-set equality's findings keep BOTH directions' paths and wordings", () => {
    // Swapping the only user of `implementer` for a ghost stages BOTH
    // directions at once, so the whole set names both — the container
    // grain for used-but-undeclared, the entry grain for
    // declared-but-unused (D6's two `at` values, carried over from the
    // retired declared rule).
    expect(ch14Fail(ch14({ implement: { role: "ghost" } }))).toStrictEqual([
      { path: "roles", message: 'role "ghost" is used by steps but not declared' },
      { path: "roles.implementer", message: 'role "implementer" is declared but not used by any step' },
    ]);
    expect(ch14Fail(ch14({}, { roles: { implementer: {}, operator: {}, spare: {} } }))).toStrictEqual([
      { path: "roles.spare", message: 'role "spare" is declared but not used by any step' },
    ]);
  });

  it("move 3: the step node's container message is held BYTE-IDENTICAL (class wording rides the hand lanes)", () => {
    expect(ch14Fail(ch14({ gate: null, hold: null }, { steps: { implement: 5 }, roles: {} }))).toStrictEqual([
      { path: "steps.implement",
        message: "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig, gates)" },
    ]);
  });
});

describe("ch14-P1 family 7 — the admitted-VALUE re-pin set, measured and expected EMPTY", () => {
  it("a template with no decision or resume edge gains NO advancesRound entry from the widening", () => {
    const steps = ch14Admit(ch14({ gate: null, hold: null }, { roles: { implementer: {} },
      steps: { implement: { role: "implementer", instruction: "i", transitions: { PASS: "done" } } } }));
    expect(steps["implement"]?.["advancesRound"]).toStrictEqual({ PASS: false });
  });

  // ch14-p3b (R3, the KEY half of the absence sweep): this lane was
  // written to expire HERE — it consumed the ABSENCE of exactly the two
  // classes T3 and T4 end, and no token search could have found it. It is
  // RE-PINNED to the new basis, never relaxed to a containment: the two
  // AGENT steps still carry none of the three keys, and the two ch14
  // steps carry exactly their own class's.
  it("and the CANONICAL template — the one every production caller loads — states the ch14-p3b basis", async () => {
    const row = (await (PARITY_CALLERS[0]?.row() ?? Promise.resolve(undefined))) as
      | { steps: Record<string, Record<string, unknown>> }
      | undefined;
    const steps = row?.steps ?? {};
    for (const id of ["implement", "review"] as const) {
      const step = steps[id];
      expect(step?.["type"], `steps.${id}.type — the agent class authors none`).toBeUndefined();
      expect(step?.["decisions"], `steps.${id}.decisions`).toBeUndefined();
      expect(step?.["wait"], `steps.${id}.wait`).toBeUndefined();
    }
    const gate = steps["human_approval"];
    expect(gate?.["type"], "steps.human_approval.type").toBe("human_gate");
    expect(gate?.["decisions"], "steps.human_approval.decisions").toStrictEqual({
      approve: { target: "commit_pending" },
      request_rework: {
        target: "implement",
        payload: { instruction: { required: true }, refs: { required: false } },
      },
    });
    expect(gate?.["wait"], "steps.human_approval.wait — the OTHER class's key stays absent").toBeUndefined();
    const wait = steps["commit_pending"];
    expect(wait?.["type"], "steps.commit_pending.type").toBe("wait");
    expect(wait?.["wait"], "steps.commit_pending.wait").toStrictEqual({
      kind: "commit_pending",
      resumeEvents: ["COMMIT"],
    });
    expect(wait?.["decisions"], "steps.commit_pending.decisions — the OTHER class's key stays absent").toBeUndefined();
  });
});

// ── FAMILY 8: THE HAND LANES — the half no declaration enumerates, and
// which therefore needs its own inventory. →[lane-drive]'s hand half.
//
// The inventory is ONE register, and BOTH channels are GENERATED from it:
// a member that exists on the direct channel and was never authored as a
// file cannot hide here, and neither can a file-channel sample that
// drifted from its direct twin. The eight members are the packet's own
// (D3's three class keysets and their presence re-imposition, D4's
// `decisions`-absent lane and ≥1-decision floor, D5's kernel-owned
// wait-kind reservation, D6's re-homed role-set equality, and D16's two
// two-hop rules); a COUNT over a literal list is not a drive, so each
// member carries its fixtures and its whole finding set on both sides.
//
// The two channels differ in exactly what dimension 1 says they differ
// in — the class LABEL a message names is the AUTHORED spelling, so a
// `humanGate` step is called `humanGate` in a file finding and
// `human_gate` in a direct one. That difference is carried in the data,
// never smoothed over.
//
// The `handFile` builder this family generates its file half from lives
// with the ch14 fixtures above, because family 3 generates from it too.
// ─────────────────────────────────────────────────────────────────────────

/** The eight members →[lane-drive]'s hand half owns. Named once, here,
 * because no declaration enumerates them. */
const HAND_LANE_MEMBERS = [
  "the three class keysets",
  "the per-class presence re-imposition",
  "the `decisions`-absent-on-a-humanGate presence lane",
  "the ≥1-decision floor",
  "the kernel-owned wait-kind reservation",
  "the re-homed role-set equality",
  "recommends_on_non_gate",
  "recommends_unknown_decision",
] as const;

interface HandLaneRow {
  readonly member: (typeof HAND_LANE_MEMBERS)[number];
  readonly claim: string;
  readonly direct: () => WorkflowTemplate;
  readonly directFindings: readonly ValidationFinding[];
  readonly file: () => string;
  readonly fileFindings: readonly ValidationFinding[];
}

/** ch14-C3's named constant, MIRRORED from `templateSurface.ts`'s
 * `KERNEL_WAIT_KINDS` (whose membership owner is ch12-C23). Drift between
 * the two is what the reservation rows exist to catch: a later kernel
 * kind added to that row without extending the constant reds here. */
const RESERVED_WAIT_KINDS = ["kickoff_pending", "human_decision", "child_workflow", "timeout"] as const;
const RESERVED_LIST = RESERVED_WAIT_KINDS.join(", ");
const reservedMessage = (kind: string): string =>
  `wait kind '${kind}' is reserved by the kernel (reserved: ${RESERVED_LIST}) — ` +
  "an authored collision would alias the kernel's own resume machinery";

const HAND_LANES: readonly HandLaneRow[] = [
  // ── member 1: the three class keysets ──────────────────────────────
  {
    member: "the three class keysets",
    claim: "the AGENT class refuses `decisions`",
    direct: () => ch14({ implement: { decisions: { approve: { target: "done" } } } }),
    directFindings: [
      { path: "steps.implement.decisions",
        message: "unknown key decisions on an agent step " +
          "(an agent step's keys are role, instruction, transitions, agentConfig, gates, recommends)" },
    ],
    file: () => handFile({ agent: HAND_AGENT + "    decisions:\n      approve:\n        target: done\n" }),
    fileFindings: [
      { path: "steps.implement.decisions",
        message: "unknown key decisions on an agent step " +
          "(an agent step's keys are role, instruction, transitions, agentConfig, gates, recommends)" },
    ],
  },
  {
    member: "the three class keysets",
    claim: "the humanGate class refuses `transitions`",
    direct: () => ch14({ gate: { transitions: { PASS: "done" } } }),
    directFindings: [
      { path: "steps.gate.transitions",
        message: "unknown key transitions on a human_gate step " +
          "(a human_gate step's keys are type, role, instruction, decisions)" },
    ],
    file: () => handFile({ gate: HAND_GATE + "    transitions:\n      PASS: done\n" }),
    fileFindings: [
      { path: "steps.gate.transitions",
        message: "unknown key transitions on a humanGate step " +
          "(a humanGate step's keys are type, role, instruction, decisions)" },
    ],
  },
  {
    member: "the three class keysets",
    claim: "the wait class refuses `role`",
    direct: () => ch14({ hold: { role: "operator" } }),
    directFindings: [
      { path: "steps.hold.role",
        message: "unknown key role on a wait step (a wait step's keys are type, wait, onResume)" },
    ],
    file: () => handFile({ wait: HAND_WAIT + "    role: operator\n" }),
    fileFindings: [
      { path: "steps.hold.role",
        message: "unknown key role on a wait step (a wait step's keys are type, wait, onResume)" },
    ],
  },
  // ch14-p3b family 1 — the register is EXTENDED, never forked: the
  // shipped wiring relies on the FULL C2/C3 keyset rules, and the three
  // refusals below were the members no lane drove. A second
  // parameterized table over the same rules would destroy the property
  // that a rule added later arrives LANE-LESS.
  {
    member: "the three class keysets",
    claim: "the humanGate class refuses `gates` — a WELL-FORMED pipeline, so only the class refusal can fire",
    direct: () => ch14({ gate: { gates: { PASS: [{ uses: "declarative.threshold", config: THRESHOLD }] } } }),
    directFindings: [
      { path: "steps.gate.gates",
        message: "unknown key gates on a human_gate step " +
          "(a human_gate step's keys are type, role, instruction, decisions)" },
    ],
    file: () => handFile({
      gate: HAND_GATE +
        "    gates:\n      PASS:\n        - uses: declarative.threshold\n" +
        "          config:\n            metric: round\n            op: \">=\"\n            value: 2\n",
    }),
    fileFindings: [
      { path: "steps.gate.gates",
        message: "unknown key gates on a humanGate step " +
          "(a humanGate step's keys are type, role, instruction, decisions)" },
    ],
  },
  {
    member: "the three class keysets",
    claim: "the humanGate class refuses `agentConfig` — a gate dispatches no actor, so it configures none",
    direct: () => ch14({ gate: { agentConfig: {} } }),
    directFindings: [
      { path: "steps.gate.agentConfig",
        message: "unknown key agentConfig on a human_gate step " +
          "(a human_gate step's keys are type, role, instruction, decisions)" },
    ],
    file: () => handFile({ gate: HAND_GATE + "    agentConfig: {}\n" }),
    fileFindings: [
      { path: "steps.gate.agentConfig",
        message: "unknown key agentConfig on a humanGate step " +
          "(a humanGate step's keys are type, role, instruction, decisions)" },
    ],
  },
  {
    member: "the three class keysets",
    claim: "the wait class refuses `instruction` — nothing asks, so there is nothing to say",
    direct: () => ch14({ hold: { instruction: "q" } }),
    directFindings: [
      { path: "steps.hold.instruction",
        message: "unknown key instruction on a wait step (a wait step's keys are type, wait, onResume)" },
    ],
    file: () => handFile({ wait: HAND_WAIT + "    instruction: q\n" }),
    fileFindings: [
      { path: "steps.hold.instruction",
        message: "unknown key instruction on a wait step (a wait step's keys are type, wait, onResume)" },
    ],
  },
  {
    member: "the three class keysets",
    claim: "the wait class refuses `recommends` — the sibling map is the AGENT class's alone",
    direct: () => ch14({ hold: { recommends: { COMMIT: "approve" } } }),
    directFindings: [
      { path: "steps.hold.recommends",
        message: "unknown key recommends on a wait step (a wait step's keys are type, wait, onResume)" },
    ],
    file: () => handFile({ wait: HAND_WAIT + "    recommends:\n      COMMIT: approve\n" }),
    fileFindings: [
      { path: "steps.hold.recommends",
        message: "unknown key recommends on a wait step (a wait step's keys are type, wait, onResume)" },
    ],
  },
  // ── member 2: the per-class presence re-imposition ─────────────────
  {
    member: "the per-class presence re-imposition",
    claim: "the humanGate class demands `instruction` — it IS the Ask's question (ch14-p3b family 1)",
    direct: () => dropStepKey(ch14(), "gate", "instruction"),
    directFindings: [{ path: "steps.gate", message: "missing required key \"instruction\"" }],
    file: () => handFile({
      gate: "  gate:\n    type: humanGate\n    role: operator\n" +
        "    decisions:\n      approve:\n        target: done\n",
    }),
    fileFindings: [{ path: "steps.gate", message: "missing required key \"instruction\"" }],
  },
  {
    member: "the per-class presence re-imposition",
    claim: "the AGENT class demands `instruction`",
    direct: () => dropStepKey(ch14(), "implement", "instruction"),
    directFindings: [{ path: "steps.implement", message: "missing required key \"instruction\"" }],
    file: () => handFile({ agent: "  implement:\n    role: implementer\n    transitions:\n      PASS: gate\n" }),
    fileFindings: [{ path: "steps.implement", message: "missing required key \"instruction\"" }],
  },
  {
    member: "the per-class presence re-imposition",
    claim: "the humanGate class demands `role`",
    direct: () => dropStepKey(ch14(), "gate", "role"),
    directFindings: [{ path: "steps.gate", message: "missing required key \"role\"" }],
    file: () => handFile({
      gate: "  gate:\n    type: humanGate\n    instruction: q\n    decisions:\n      approve:\n        target: done\n",
      tail: "terminal:\n  - done\nroles:\n  implementer: {}\n",
    }),
    fileFindings: [{ path: "steps.gate", message: "missing required key \"role\"" }],
  },
  {
    member: "the per-class presence re-imposition",
    claim: "the wait class demands `onResume` — required BUT legally empty, the pair a builder reads as optional",
    direct: () => dropStepKey(ch14(), "hold", "onResume"),
    directFindings: [{ path: "steps.hold", message: "missing required key \"onResume\"" }],
    file: () => handFile({
      wait: "  hold:\n    type: wait\n    wait:\n      kind: commit_pending\n      resumeEvents:\n        - COMMIT\n",
    }),
    fileFindings: [{ path: "steps.hold", message: "missing required key \"onResume\"" }],
  },
  // ── member 3: the `decisions`-absent presence lane (the ONE presence
  // lane of the three classes that carries a code) ────────────────────
  {
    member: "the `decisions`-absent-on-a-humanGate presence lane",
    claim: "a humanGate with no `decisions` — the one coded presence lane",
    direct: () => dropStepKey(ch14(), "gate", "decisions"),
    directFindings: [
      { path: "steps.gate", code: "invalid_decision_gate_config", message: "missing required key \"decisions\"" },
    ],
    file: () => handFile({ gate: "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n" }),
    fileFindings: [
      { path: "steps.gate", code: "invalid_decision_gate_config", message: "missing required key \"decisions\"" },
    ],
  },
  // ── member 4: the ≥1-decision floor ────────────────────────────────
  {
    member: "the ≥1-decision floor",
    claim: "an EMPTY decisions map — exactly ONE finding, since `nonempty` is NOT declared beside the hand floor",
    direct: () => ch14({ gate: { decisions: {} } }),
    directFindings: [
      { path: "steps.gate.decisions", code: "decision_gate_empty",
        message: "decisions must declare at least one decision (a gate no one can answer is refused)" },
    ],
    file: () => handFile({
      gate: "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n    decisions: {}\n",
    }),
    fileFindings: [
      { path: "steps.gate.decisions", code: "decision_gate_empty",
        message: "decisions must declare at least one decision (a gate no one can answer is refused)" },
    ],
  },
  // ── member 5: the kernel-owned wait-kind reservation, PARAMETERIZED
  // over ch14-C3's named constant — every member driven on both
  // channels, so a later kernel kind added without extending the
  // reservation reds in its own chapter. ───────────────────────────────
  ...RESERVED_WAIT_KINDS.map((kind): HandLaneRow => ({
    member: "the kernel-owned wait-kind reservation",
    claim: `the reserved kind '${kind}' is refused as an AUTHORED wait kind`,
    direct: () => ch14({ hold: { wait: { kind, resumeEvents: ["COMMIT"] } } }),
    directFindings: [{ path: "steps.hold.wait.kind", message: reservedMessage(kind) }],
    file: () => handFile({
      wait: `  hold:\n    type: wait\n    wait:\n      kind: ${kind}\n      resumeEvents:\n        - COMMIT\n    onResume:\n      COMMIT: done\n`,
    }),
    fileFindings: [{ path: "steps.hold.wait.kind", message: reservedMessage(kind) }],
  })),
  // ── member 6: the re-homed role-set equality, both directions ───────
  {
    member: "the re-homed role-set equality",
    claim: "direction 1: used-but-undeclared, at the CONTAINER grain",
    direct: () => ch14({ implement: { role: "ghost" } }),
    directFindings: [
      { path: "roles", message: 'role "ghost" is used by steps but not declared' },
      { path: "roles.implementer", message: 'role "implementer" is declared but not used by any step' },
    ],
    file: () => handFile({ agent: HAND_AGENT.replace("role: implementer", "role: ghost") }),
    fileFindings: [
      { path: "roles", message: 'role "ghost" is used by steps but not declared' },
      { path: "roles.implementer", message: 'role "implementer" is declared but not used by any step' },
    ],
  },
  {
    member: "the re-homed role-set equality",
    claim: "direction 2: declared-but-unused, at the ENTRY grain — a role-LESS wait step contributes nothing",
    direct: () => ch14({}, { roles: { implementer: {}, operator: {}, spare: {} } }),
    directFindings: [
      { path: "roles.spare", message: 'role "spare" is declared but not used by any step' },
    ],
    file: () => handFile({ tail: "terminal:\n  - done\nroles:\n  implementer: {}\n  operator: {}\n  spare: {}\n" }),
    fileFindings: [
      { path: "roles.spare", message: 'role "spare" is declared but not used by any step' },
    ],
  },
  // ── members 7 and 8: D16's two two-hop `recommends` rules ───────────
  {
    member: "recommends_on_non_gate",
    claim: "a recommendation routing to a step that is not a humanGate",
    direct: () => ch14({ implement: { transitions: { PASS: "gate", SKIP: "done" }, recommends: { SKIP: "approve" } } }),
    directFindings: [
      { path: "steps.implement.recommends.SKIP", code: "recommends_on_non_gate",
        message: "recommends: 'SKIP' routes to step 'done', which is not a humanGate step — " +
          "a recommendation is meaningful only where a decision will be asked" },
    ],
    file: () => handFile({
      agent: "  implement:\n    role: implementer\n    instruction: i\n    transitions:\n      PASS: gate\n      SKIP: done\n    recommends:\n      SKIP: approve\n",
    }),
    fileFindings: [
      { path: "steps.implement.recommends.SKIP", code: "recommends_on_non_gate",
        message: "recommends: 'SKIP' routes to step 'done', which is not a humanGate step — " +
          "a recommendation is meaningful only where a decision will be asked" },
    ],
  },
  {
    member: "recommends_unknown_decision",
    claim: "a recommendation naming no decision of the gate it routes to",
    direct: () => ch14({ implement: { recommends: { PASS: "ghost" } } }),
    directFindings: [
      { path: "steps.implement.recommends.PASS", code: "recommends_unknown_decision",
        message: "recommends: 'ghost' is not a declared decision of step 'gate'" },
    ],
    file: () => handFile({ agent: HAND_AGENT + "    recommends:\n      PASS: ghost\n" }),
    fileFindings: [
      { path: "steps.implement.recommends.PASS", code: "recommends_unknown_decision",
        message: "recommends: 'ghost' is not a declared decision of step 'gate'" },
    ],
  },
];

describe("ch14-P1 family 8 — the hand-lane inventory, GENERATED on both channels from ONE register", () => {
  it("the register covers every member this packet owns, and every member is DRIVEN rather than counted", () => {
    expect(new Set(HAND_LANES.map((row) => row.member))).toStrictEqual(new Set(HAND_LANE_MEMBERS));
    expect(HAND_LANE_MEMBERS).toHaveLength(8);
    // Every row carries a driver on BOTH channels — a member present on
    // one side only is the blind spot this register exists to close.
    for (const row of HAND_LANES) {
      expect(row.directFindings.length, `${row.member}: ${row.claim} (direct)`).toBeGreaterThanOrEqual(1);
      expect(row.fileFindings.length, `${row.member}: ${row.claim} (file)`).toBeGreaterThanOrEqual(1);
    }
  });

  for (const row of HAND_LANES) {
    it(`DIRECT — ${row.member}: ${row.claim}`, () => {
      expect(ch14Fail(row.direct())).toStrictEqual(row.directFindings);
    });

    it(`FILE — ${row.member}: ${row.claim}`, () => {
      expect(handFileFindings(row.file())).toStrictEqual(row.fileFindings);
    });
  }

  it("an authored wait kind OUTSIDE the reserved set admits on BOTH channels — the reservation does not close the namespace", () => {
    expect(admitTemplate(ch14({ hold: { wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] } } }), catalog).ok).toBe(true);
    expect(loadTemplate(new TextEncoder().encode(handFile()), { catalog: createGateRegistry() }).ok).toBe(true);
  });

  // ch14-p3b family 1: C5's own rule that `required` is OPTIONAL with
  // absent = not-required, which is the rule T3's `refs: { required:
  // false }` rests on — the two forms must agree on what the guard does.
  it("an EMPTY payload spec `{}` is LEGAL on both channels, and agrees with an explicit `required: false`", () => {
    const both = (spec: Record<string, unknown>): WorkflowTemplate =>
      ch14({ gate: { decisions: { approve: { target: "done", payload: { refs: spec } } } } });
    expect(admitTemplate(both({}), catalog).ok).toBe(true);
    expect(admitTemplate(both({ required: false }), catalog).ok).toBe(true);
    expect(
      loadTemplate(
        new TextEncoder().encode(
          handFile({
            gate: "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n" +
              "    decisions:\n      approve:\n        target: done\n        payload:\n          refs: {}\n",
          }),
        ),
        { catalog: createGateRegistry() },
      ).ok,
    ).toBe(true);
  });
});

describe("ch14-P1 family 8 — the role-set equality's remaining crossings (dimension 10)", () => {
  it("a ROLE-LESS step contributes nothing: a wait step does not make its roles map over-declared", () => {
    // The case the retired declaration could not express — its `collect`
    // had no per-member absence tolerance, and the only existing knob
    // would have disabled the equality for every wait-bearing template.
    expect(admitTemplate(ch14(), catalog).ok).toBe(true);
  });

  it("the grammar-invalid SUPPRESSION carries over: a bad role stands the equality down", () => {
    expect(ch14Fail(ch14({ implement: { role: "a b" } }))).toStrictEqual([
      { path: "steps.implement.role", message: `invalid role name "a b"${ID_RULE}` },
    ]);
  });

  it("the BROKEN-`steps` stand-down is SILENCE, not an internal validator failure — with a NONEMPTY roles map", () => {
    // The discriminating case the parity corpus cannot reach: its only
    // broken-`steps` fixture pairs it with an EMPTY roles map, where both
    // directions are empty regardless.
    expect(ch14Fail(ch14({}, { steps: "x", roles: { implementer: {}, operator: {} } }))).toStrictEqual([
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


// ── ch14-p3b FAMILY 8: NON-MOVEMENT AND KEY ORDER (T6, T7; dimensions
// 1 and 3). The ADMITTED canonical template is pinned against CLOSED
// LITERALS that are INDEPENDENT OF THE FIXTURE: the ch8-P2 pin already
// asserts whole-value equality of the two channels, so a region
// "asserted equal to the fixture" is entailed by a guard that is
// already green — and a delta authored into BOTH files, which is the
// stated method, would satisfy it while falsifying the claim. THE
// CHANNEL IS NAMED because the host offers two: the literals are read
// against the CANONICAL-FILE caller of the parity corpus, never against
// its direct-channel caller, which IS the fixture.
//
// A union over surfaces, an enumeration of watched parts, or a
// comparison to the delta's other copy are the three blind forms this
// family refuses. The closure rule: every node of the admitted value is
// pinned by a literal here, pinned by the ordered keyset literals, or a
// NAMED residual with its own owner — `contextBlocks`' BODY (guarded by
// `cli/journey.test.ts`'s transcribed third copy) and the two new
// steps' `advancesRound` (family 2's, asserted there in both
// directions).
//
// THE BYTE GRAIN IS EXPLICITLY NOT DRIVEN: a value-grade comparison
// cannot see a YAML comment, a quoting style or a block-scalar form, so
// no byte-identity claim is made about the untouched regions; the byte
// grain's only guard is the post-build audit's changed-file list.

/** The ADMITTED canonical value, through the FILE channel. */
function admittedCanonical(): Record<string, unknown> {
  const result = loadTemplate(canonicalBytes(), {
    path: join(CANONICAL_DIR, CANONICAL_FILE),
    catalog: createGateRegistry(),
  });
  if (result.ok) return result.template as unknown as Record<string, unknown>;
  throw new Error(`the canonical file did not ADMIT: ${JSON.stringify(result.error)}`);
}

/** The ADMITTED fixture value, through the DIRECT channel — used ONLY
 * for the cross-channel KEY-ORDER assertion, which the ch8-P2 pin's
 * value-grade `toEqual` cannot see. Never as a source of literals. */
function admittedFixture(): Record<string, unknown> {
  const result = admitTemplate(fixtureTemplate(), createGateRegistry());
  if (result.ok) return result.template as unknown as Record<string, unknown>;
  throw new Error(`the fixture did not ADMIT: ${JSON.stringify(result.findings)}`);
}

const stepsOf = (t: Record<string, unknown>): Record<string, Record<string, unknown>> =>
  t["steps"] as Record<string, Record<string, unknown>>;
const rolesOf = (t: Record<string, unknown>): Record<string, unknown> =>
  t["roles"] as Record<string, unknown>;

describe("ch14-p3b family 8 — the admitted canonical template, pinned to fixture-INDEPENDENT literals", () => {
  it("the top-level keyset is exactly the NINE admitted keys — seven authored plus two admission-filled", () => {
    expect(Object.keys(admittedCanonical()).sort()).toStrictEqual([
      "activation",
      "contextBlocks",
      "ref",
      "roles",
      "round",
      "runtimeContext",
      "start",
      "steps",
      "terminal",
    ]);
  });

  it("the untouched top-level values, each by LITERAL", () => {
    const t = admittedCanonical();
    expect(t["ref"]).toStrictEqual({ id: "local-pair-v0", version: 1 });
    expect(t["start"]).toBe("implement");
    expect(t["terminal"]).toStrictEqual(["done"]);
    expect(t["round"]).toStrictEqual({ advanceOnArrivalAt: ["implement"] });
    expect(t["runtimeContext"]).toBe("none");
    expect(t["activation"]).toStrictEqual({ mode: "immediate" });
  });

  it("`implement` is UNTOUCHED, whole — keyset, values, and its OWN advancesRound", () => {
    const step = stepsOf(admittedCanonical())["implement"];
    expect(Object.keys(step ?? {}).sort()).toStrictEqual([
      "advancesRound",
      "instruction",
      "promptConcernRefs",
      "role",
      "transitions",
    ]);
    expect(step).toStrictEqual({
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "review" },
      // Per EDGE, and DIFFERENT from `review`'s: the flag is true iff the
      // edge's TARGET is named in `round.advanceOnArrivalAt`. A literal
      // copied from the other agent step is wrong.
      advancesRound: { PASS: false },
      promptConcernRefs: [],
    });
  });

  it("`review` keeps its untouched keys and carries BOTH touched values at value grade", () => {
    const step = stepsOf(admittedCanonical())["review"];
    expect(Object.keys(step ?? {}).sort()).toStrictEqual([
      "advancesRound",
      "instruction",
      "promptConcernRefs",
      "recommends",
      "role",
      "transitions",
    ]);
    expect(step).toStrictEqual({
      role: "reviewer",
      instruction: "review it",
      // THE DELTA'S OWN TWO VALUES, pinned precisely because they are the
      // delta's: the retargeted CONVERGED edge and the new recommendation.
      transitions: { PASS: "implement", CONVERGED: "human_approval" },
      recommends: { CONVERGED: "approve" },
      advancesRound: { PASS: true, CONVERGED: false },
      promptConcernRefs: [],
    });
  });

  it("every `roles` entry's ADMITTED value — `operator` as ADMISSION produces it, not as T1 declares it", () => {
    const roles = rolesOf(admittedCanonical());
    expect(roles["implementer"]).toStrictEqual({
      defaultActor: "codex",
      defaultAgentConfig: { promptConcernRefs: ["emit-envelope"] },
      promptConcernRefs: ["emit-envelope"],
    });
    expect(roles["reviewer"]).toStrictEqual({
      defaultActor: "claude",
      defaultAgentConfig: { promptConcernRefs: ["emit-envelope"] },
      promptConcernRefs: ["emit-envelope"],
    });
    // The role-refs lift runs over EVERY entry and writes `[]` where
    // nothing is authored — which is exactly the new entry's case, and
    // the reason T1's declaration alone is not what admission produces.
    expect(roles["operator"]).toStrictEqual({ defaultActor: "human", promptConcernRefs: [] });
  });

  it("the two ORDERED keyset literals carry the delta — dimension 3 DRIVEN, not assumed", () => {
    const t = admittedCanonical();
    expect(Object.keys(rolesOf(t))).toStrictEqual(["implementer", "reviewer", "operator"]);
    expect(Object.keys(stepsOf(t))).toStrictEqual([
      "implement",
      "review",
      "human_approval",
      "commit_pending",
    ]);
  });

  it("the gate step: keyset, its authored fields in STORED form, and its produced refs", () => {
    const step = stepsOf(admittedCanonical())["human_approval"];
    expect(Object.keys(step ?? {}).sort()).toStrictEqual([
      "advancesRound",
      "decisions",
      "instruction",
      "promptConcernRefs",
      "role",
      "type",
    ]);
    // The step-class token is STORED, never the file-channel `humanGate`.
    expect(step?.["type"]).toBe("human_gate");
    expect(step?.["role"]).toBe("operator");
    expect(step?.["instruction"]).toBe("The reviewer has converged. Decide how this run continues.");
    expect(step?.["decisions"]).toStrictEqual({
      approve: { target: "commit_pending" },
      request_rework: {
        target: "implement",
        payload: { instruction: { required: true }, refs: { required: false } },
      },
    });
    expect(step?.["promptConcernRefs"]).toStrictEqual([]);
  });

  it("the wait step: keyset, its authored fields in STORED form, and its produced refs", () => {
    const step = stepsOf(admittedCanonical())["commit_pending"];
    expect(Object.keys(step ?? {}).sort()).toStrictEqual([
      "advancesRound",
      "onResume",
      "promptConcernRefs",
      "type",
      "wait",
    ]);
    expect(step?.["type"]).toBe("wait");
    expect(step?.["wait"]).toStrictEqual({ kind: "commit_pending", resumeEvents: ["COMMIT"] });
    expect(step?.["onResume"]).toStrictEqual({ COMMIT: "done" });
    expect(step?.["promptConcernRefs"]).toStrictEqual([]);
  });

  it("`contextBlocks` is pinned at KEYSET grain only — its BODY's guard is the transcribed third copy", () => {
    expect(Object.keys(admittedCanonical()["contextBlocks"] as object)).toStrictEqual(["emit-envelope"]);
  });

  it("the two channels agree on KEY ORDER — the assertion the value-grade ch8-P2 pin cannot make", () => {
    const file = admittedCanonical();
    const direct = admittedFixture();
    expect(Object.keys(rolesOf(direct))).toStrictEqual(Object.keys(rolesOf(file)));
    expect(Object.keys(stepsOf(direct))).toStrictEqual(Object.keys(stepsOf(file)));
    expect(Object.keys(direct)).toStrictEqual(Object.keys(file));
  });
});
