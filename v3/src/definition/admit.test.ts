import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { createGateRegistry } from "../gates/index.js";
import type { GateCatalog } from "../ports/index.js";
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
  it("a gate-free template admits with a structurally-equal value (vacuous scan)", () => {
    const raw = template();
    const result = admitTemplate(raw, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template).toEqual(raw);
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
});
