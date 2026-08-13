import { describe, expect, it } from "vitest";

import { admitTemplate, loadTemplate } from "../definition/index.js";
import type { BlockId, ContextBlock, WorkflowInstance, WorkflowTemplate } from "../domain/index.js";
import type { GateCatalog, InlineGateRegistration } from "../ports/index.js";
import { assembleContextBlocks } from "./contextBlocks.js";

/**
 * Packet ch13-p1b — the l2b render's own lanes (families 1–6 and family
 * 12's arity-independent direct member). The families that need a PACKET
 * live in the dispatch suite; the ones that need a whole run live in the
 * l2b golden trace.
 */

const gateRegistration: InlineGateRegistration = {
  execution: "inline",
  implementation: "declarative",
  requiresRuntimeContext: false,
  validateAndNormalizeConfig: (raw) => ({ ok: true, effective: raw }),
  evaluate: () => ({ verdict: "allow" }),
};
const gateCatalog: GateCatalog = { resolve: () => gateRegistration };

/**
 * The ADMITTING channel: every family member that is reachable through
 * admission goes through it, so the render is driven against a value
 * admission actually produces (the produced ref positions, the
 * materialized empty lists, the rebuilt gate bindings).
 */
function admit(raw: WorkflowTemplate): WorkflowTemplate {
  const result = admitTemplate(raw, gateCatalog);
  if (!result.ok) {
    throw new Error(`fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

function ids(blocks: readonly ContextBlock[]): readonly BlockId[] {
  return blocks.map((block) => block.id);
}

interface Authored {
  readonly role?: readonly BlockId[];
  readonly step?: readonly BlockId[];
  readonly gate?: readonly BlockId[];
}

/**
 * A template issuing refs from the requested positions, with a catalog
 * declaring EXACTLY the union of what it issues — p1a's hygiene lane
 * refuses an entry no ref names, so a fixture cannot carry a spare.
 */
function issuing(authored: Authored): WorkflowTemplate {
  const issued = [...(authored.role ?? []), ...(authored.step ?? []), ...(authored.gate ?? [])];
  const contextBlocks = Object.fromEntries(
    [...new Set(issued)].map((id) => [id, { body: `body of ${id}` }]),
  );
  return {
    ref: { id: "t", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review" },
        ...(authored.step !== undefined ? { agentConfig: { promptConcernRefs: authored.step } } : {}),
        ...(authored.gate !== undefined
          ? { gates: { PASS: [{ uses: "declarative.threshold", config: {}, contextBlockRefs: authored.gate }] } }
          : {}),
      },
      review: { role: "reviewer", instruction: "review it", transitions: { CONVERGED: "done" } },
    },
    terminal: ["done"],
    roles: {
      implementer: {
        defaultActor: "codex",
        ...(authored.role !== undefined
          ? { defaultAgentConfig: { promptConcernRefs: authored.role } }
          : {}),
      },
      reviewer: { defaultActor: "claude" },
    },
    contextBlocks,
  };
}

// ───────────────────────────────────────────────────────────────────────
// Family 1 — the rendered set (guarantee 1; →[render-order]'s set half).
// Discipline: the rendered id list EQUALS exactly the ids the three
// positions issue, asserted WHOLE — never containment, so a spurious
// extra member reds.
// ───────────────────────────────────────────────────────────────────────

describe("family 1 — the rendered set is exactly what the three positions issue", () => {
  const cases: readonly { readonly name: string; readonly authored: Authored; readonly expected: readonly BlockId[] }[] = [
    { name: "role config only", authored: { role: ["role-block"] }, expected: ["role-block"] },
    { name: "step config only", authored: { step: ["step-block"] }, expected: ["step-block"] },
    { name: "gate binding only", authored: { gate: ["gate-block"] }, expected: ["gate-block"] },
    {
      name: "role + step",
      authored: { role: ["role-block"], step: ["step-block"] },
      expected: ["role-block", "step-block"],
    },
    {
      name: "role + gate",
      authored: { role: ["role-block"], gate: ["gate-block"] },
      expected: ["role-block", "gate-block"],
    },
    {
      name: "step + gate",
      authored: { step: ["step-block"], gate: ["gate-block"] },
      expected: ["step-block", "gate-block"],
    },
    {
      name: "all three positions",
      authored: { role: ["role-block"], step: ["step-block"], gate: ["gate-block"] },
      expected: ["role-block", "step-block", "gate-block"],
    },
    { name: "empty lists at every position", authored: { role: [], step: [], gate: [] }, expected: [] },
    { name: "absent lists at every position", authored: {}, expected: [] },
  ];

  for (const { name, authored, expected } of cases) {
    it(`renders exactly the issued set — ${name}`, () => {
      expect(ids(assembleContextBlocks(admit(issuing(authored)), "implement"))).toEqual(expected);
    });
  }

  it("renders the WHOLE member — id, body from the catalog, and the emitting position", () => {
    const template = admit(issuing({ role: ["role-block"] }));
    expect(assembleContextBlocks(template, "implement")).toEqual([
      {
        id: "role-block",
        body: "body of role-block",
        provenance: { sources: [{ source: "role_config" }] },
      },
    ]);
  });

  it("NAMED TRAP: a gate binding's id that no other position issues still renders", () => {
    const template = admit(issuing({ role: ["role-block"], gate: ["gate-only"] }));
    expect(assembleContextBlocks(template, "implement")).toEqual([
      { id: "role-block", body: "body of role-block", provenance: { sources: [{ source: "role_config" }] } },
      {
        id: "gate-only",
        body: "body of gate-only",
        provenance: { sources: [{ source: "gate_binding", stepId: "implement", eventType: "PASS" }] },
      },
    ]);
  });

  it("NAMED TRAP: the render follows the PRODUCED ref position, never the authored nested key", () => {
    // Directly constructed, admitted-SHAPED: on any template admission
    // produces, the two agree in VALUE (the lift COPIES), so this
    // compliance divergence has no other carrier.
    const divergent: WorkflowTemplate = {
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          agentConfig: { promptConcernRefs: ["step-authored"] },
          promptConcernRefs: ["step-produced"],
          advancesRound: { PASS: false },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { CONVERGED: "done" },
          promptConcernRefs: [],
          advancesRound: { CONVERGED: false },
        },
      },
      terminal: ["done"],
      roles: {
        implementer: {
          defaultActor: "codex",
          defaultAgentConfig: { promptConcernRefs: ["role-authored"] },
          promptConcernRefs: ["role-produced"],
        },
        reviewer: { defaultActor: "claude", promptConcernRefs: [] },
      },
      contextBlocks: {
        "role-produced": { body: "role produced" },
        "role-authored": { body: "role authored" },
        "step-produced": { body: "step produced" },
        "step-authored": { body: "step authored" },
      },
    };
    expect(ids(assembleContextBlocks(divergent, "implement"))).toEqual([
      "role-produced",
      "step-produced",
    ]);
  });

  it("NAMED TRAP: a catalog entry no position issues does NOT render", () => {
    // Directly constructed: p1a's hygiene lane refuses this document at
    // admission, so the trap is unreachable through the admitting channel.
    const spare: WorkflowTemplate = {
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          promptConcernRefs: ["issued"],
          advancesRound: { PASS: false },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { CONVERGED: "done" },
          promptConcernRefs: [],
          advancesRound: { CONVERGED: false },
        },
      },
      terminal: ["done"],
      roles: {
        implementer: { defaultActor: "codex", promptConcernRefs: [] },
        reviewer: { defaultActor: "claude", promptConcernRefs: [] },
      },
      contextBlocks: { issued: { body: "issued" }, unissued: { body: "never rendered" } },
    };
    expect(ids(assembleContextBlocks(spare, "implement"))).toEqual(["issued"]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Family 2 — order (→[render-order]). Discipline: the sequence is
// asserted WHOLE, on documents that DISCRIMINATE.
// ───────────────────────────────────────────────────────────────────────

describe("family 2 — the render order is source order, then authored order", () => {
  it("source order wins over the sequences the individual lists carry", () => {
    // Every source issues the SAME pair in a DIFFERENT sequence: only
    // role → step → gate with first-seen dedup yields [x, y].
    const template = admit(issuing({ role: ["xx", "yy"], step: ["yy", "xx"], gate: ["yy", "xx"] }));
    expect(ids(assembleContextBlocks(template, "implement"))).toEqual(["xx", "yy"]);
  });

  it("the gate leg walks the GATES record's own enumeration, not the transitions record's", () => {
    // The two records enumerate in DIFFERENT orders — this separates the
    // contract's ratified walk (the gates record) from the unit's coarser
    // one (the authorized ops, which default-derive the transitions keys).
    const template = admit({
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { BB: "review", AA: "review" },
          gates: {
            AA: [{ uses: "declarative.threshold", config: {}, contextBlockRefs: ["from-aa"] }],
            BB: [{ uses: "declarative.threshold", config: {}, contextBlockRefs: ["from-bb"] }],
          },
        },
        review: { role: "reviewer", instruction: "review it", transitions: { CONVERGED: "done" } },
      },
      terminal: ["done"],
      roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
      contextBlocks: { "from-aa": { body: "AA" }, "from-bb": { body: "BB" } },
    });
    // The two records disagree, which is what makes the document
    // discriminate: the gates record enumerates AA→BB, the transitions
    // record (and so the unit's coarser walk over the authorized ops)
    // BB→AA.
    expect(Object.keys(template.steps.implement?.gates ?? {})).toEqual(["AA", "BB"]);
    expect(Object.keys(template.steps.implement?.transitions ?? {})).toEqual(["BB", "AA"]);
    expect(ids(assembleContextBlocks(template, "implement"))).toEqual(["from-aa", "from-bb"]);
  });

  it("level 2: each event's pipeline runs in its authored binding sequence", () => {
    const template = admit({
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          gates: {
            PASS: [
              { uses: "declarative.threshold", config: { n: 1 }, contextBlockRefs: ["first-binding"] },
              { uses: "declarative.threshold", config: { n: 2 }, contextBlockRefs: ["second-binding"] },
            ],
          },
        },
        review: { role: "reviewer", instruction: "review it", transitions: { CONVERGED: "done" } },
      },
      terminal: ["done"],
      roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
      contextBlocks: { "first-binding": { body: "1" }, "second-binding": { body: "2" } },
    });
    expect(ids(assembleContextBlocks(template, "implement"))).toEqual([
      "first-binding",
      "second-binding",
    ]);
  });

  it("level 3: each binding's ref list runs in its authored order", () => {
    const template = admit(issuing({ gate: ["gate-first", "gate-second"] }));
    expect(ids(assembleContextBlocks(template, "implement"))).toEqual(["gate-first", "gate-second"]);
  });

  it("SUBSTRATE: an array-index-like event type hoists, a near-miss does not (the class boundary, PINNED)", () => {
    // Re-executed at this build against the live engine: `10` hoists to
    // the front and `01` keeps its authored position. Both are legal
    // event types (the id class bans whitespace and "." only), which is
    // what makes them usable as fixtures at all. Sampling ONE side of
    // the boundary measures nothing.
    const template = admit({
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { zz: "review", "10": "review", "01": "review" },
          gates: {
            zz: [{ uses: "declarative.threshold", config: {}, contextBlockRefs: ["from-zz"] }],
            "10": [{ uses: "declarative.threshold", config: {}, contextBlockRefs: ["from-ten"] }],
            "01": [{ uses: "declarative.threshold", config: {}, contextBlockRefs: ["from-oh-one"] }],
          },
        },
        review: { role: "reviewer", instruction: "review it", transitions: { CONVERGED: "done" } },
      },
      terminal: ["done"],
      roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
      contextBlocks: {
        "from-zz": { body: "Z" },
        "from-ten": { body: "T" },
        "from-oh-one": { body: "O" },
      },
    });
    // The admitted record's own enumeration is the render's order source —
    // asserted here so a substrate change names itself instead of
    // surfacing as an unexplained render defect.
    expect(Object.keys(template.steps.implement?.gates ?? {})).toEqual(["10", "zz", "01"]);
    expect(ids(assembleContextBlocks(template, "implement"))).toEqual([
      "from-ten",
      "from-zz",
      "from-oh-one",
    ]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Family 3 — dedup and retained provenance (→[render-order]'s dedup
// half). One member per id, first position stands, provenance appends.
// ───────────────────────────────────────────────────────────────────────

describe("family 3 — a repeated id yields ONE member whose provenance keeps every emitter", () => {
  it("twice in ONE list: one member, two identical-position sources", () => {
    // Directly constructed: the ref list's per-occurrence uniqueness lane
    // refuses this document at admission.
    const repeated: WorkflowTemplate = {
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          promptConcernRefs: ["twice", "twice"],
          advancesRound: { PASS: false },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { CONVERGED: "done" },
          promptConcernRefs: [],
          advancesRound: { CONVERGED: false },
        },
      },
      terminal: ["done"],
      roles: {
        implementer: { defaultActor: "codex", promptConcernRefs: [] },
        reviewer: { defaultActor: "claude", promptConcernRefs: [] },
      },
      contextBlocks: { twice: { body: "twice" } },
    };
    expect(assembleContextBlocks(repeated, "implement")).toEqual([
      {
        id: "twice",
        body: "twice",
        provenance: { sources: [{ source: "step_config" }, { source: "step_config" }] },
      },
    ]);
  });

  it("once from each of TWO sources: the FIRST position stands, both sources recorded", () => {
    const template = admit(issuing({ role: ["shared"], step: ["shared"], gate: ["shared"] }));
    expect(assembleContextBlocks(template, "implement")).toEqual([
      {
        id: "shared",
        body: "body of shared",
        provenance: {
          sources: [
            { source: "role_config" },
            { source: "step_config" },
            { source: "gate_binding", stepId: "implement", eventType: "PASS" },
          ],
        },
      },
    ]);
  });

  it("twice from TWO bindings of ONE step and event: two IDENTICAL source members, never collapsed", () => {
    const template = admit({
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          gates: {
            PASS: [
              { uses: "declarative.threshold", config: { n: 1 }, contextBlockRefs: ["shared"] },
              { uses: "declarative.threshold", config: { n: 2 }, contextBlockRefs: ["shared"] },
            ],
          },
        },
        review: { role: "reviewer", instruction: "review it", transitions: { CONVERGED: "done" } },
      },
      terminal: ["done"],
      roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
      contextBlocks: { shared: { body: "shared" } },
    });
    expect(assembleContextBlocks(template, "implement")).toEqual([
      {
        id: "shared",
        body: "shared",
        provenance: {
          sources: [
            { source: "gate_binding", stepId: "implement", eventType: "PASS" },
            { source: "gate_binding", stepId: "implement", eventType: "PASS" },
          ],
        },
      },
    ]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Family 4 — authority (→[authority-scope]). Both halves, both
// directions, on ONE document carrying two gated events and a second step.
// ───────────────────────────────────────────────────────────────────────

describe("family 4 — the gate leg is narrowed by AUTHORITY, not by step membership", () => {
  /**
   * TWO gated events on the dispatched step, because a single-event
   * document cannot tell the per-event predicate from a STEP-level one;
   * a SECOND step with gate bindings of its own, because the
   * iteration-domain negative passes vacuously on a document with no
   * outside.
   */
  function twoGatedEventsAndASecondStep(narrowed: boolean): WorkflowTemplate {
    return admit({
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review", HOLD: "review" },
          gates: {
            PASS: [{ uses: "declarative.threshold", config: {}, contextBlockRefs: ["pass-block"] }],
            HOLD: [{ uses: "declarative.threshold", config: {}, contextBlockRefs: ["hold-block"] }],
          },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { CONVERGED: "done" },
          gates: {
            CONVERGED: [
              { uses: "declarative.threshold", config: {}, contextBlockRefs: ["review-only-block"] },
            ],
          },
        },
      },
      terminal: ["done"],
      roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
      contextBlocks: {
        "pass-block": { body: "pass" },
        "hold-block": { body: "hold" },
        "review-only-block": { body: "review only" },
      },
      ...(narrowed ? { capabilityProfile: { implementer: { implement: ["PASS"] } } } : {}),
    });
  }

  it("the ITERATION-DOMAIN negative: no block originates outside the dispatched step's own gates", () => {
    const rendered = ids(assembleContextBlocks(twoGatedEventsAndASecondStep(false), "implement"));
    expect(rendered).toEqual(["pass-block", "hold-block"]);
    expect(rendered).not.toContain("review-only-block");
  });

  it("NON-WAIVABLE counterexample: a narrowing capability profile SILENCES that gate's blocks", () => {
    // Under default capability derivation the narrowing never bites, so a
    // lane set without this member is green and blind.
    expect(ids(assembleContextBlocks(twoGatedEventsAndASecondStep(true), "implement"))).toEqual([
      "pass-block",
    ]);
  });

  it("its DISCRIMINATING positive: with the profile removed, both gates' blocks appear", () => {
    expect(ids(assembleContextBlocks(twoGatedEventsAndASecondStep(false), "implement"))).toEqual([
      "pass-block",
      "hold-block",
    ]);
  });

  it("the SECOND step renders its own gate's blocks when IT is the dispatched one", () => {
    expect(ids(assembleContextBlocks(twoGatedEventsAndASecondStep(false), "review"))).toEqual([
      "review-only-block",
    ]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Family 5 — the body's single source and the integrity abort
// (→[integrity-abort]) at ALL THREE namespaces the render touches.
// ───────────────────────────────────────────────────────────────────────

describe("family 5 — bodies come from the catalog only, and a miss ABORTS", () => {
  /** A directly-constructed, admitted-SHAPED template with a chosen catalog. */
  function shaped(
    stepRefs: readonly BlockId[],
    contextBlocks: Record<string, { body: string }>,
  ): WorkflowTemplate {
    return {
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          promptConcernRefs: stepRefs,
          advancesRound: { PASS: false },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { CONVERGED: "done" },
          promptConcernRefs: [],
          advancesRound: { CONVERGED: false },
        },
      },
      terminal: ["done"],
      roles: {
        implementer: { defaultActor: "codex", promptConcernRefs: [] },
        reviewer: { defaultActor: "claude", promptConcernRefs: [] },
      },
      contextBlocks,
    };
  }

  describe("the CATALOG namespace", () => {
    it("a ref with no entry ABORTS — never a skipped block, never an undefined body", () => {
      expect(() => assembleContextBlocks(shaped(["ghost"], {}), "implement")).toThrow(
        /kernel integrity/,
      );
    });

    it("HOSTILE KEY: a prototype-named ref the catalog does not declare ABORTS", () => {
      // `constructor` is the ONE prototype member the block-id grammar
      // admits; a plain-object catalog answers it with an INHERITED
      // member whose body reads `undefined` — a silent degrade exactly
      // where the abort clause forbids one.
      expect(() => assembleContextBlocks(shaped(["constructor"], {}), "implement")).toThrow(
        /kernel integrity/,
      );
    });

    it("its DISCRIMINATING positive: the same prototype-named ref DECLARED renders its body", () => {
      const declared = shaped(["constructor"], {});
      const withEntry: WorkflowTemplate = {
        ...declared,
        contextBlocks: Object.fromEntries([["constructor", { body: "declared body" }]]),
      };
      expect(assembleContextBlocks(withEntry, "implement")).toEqual([
        {
          id: "constructor",
          body: "declared body",
          provenance: { sources: [{ source: "step_config" }] },
        },
      ]);
    });
  });

  describe("the STEPS namespace — a SILENT DEGRADE, not a throw, when unguarded", () => {
    /**
     * Unguarded, this lookup returns an INHERITED member: the
     * undefined-check does not fire, every downstream read yields empty,
     * and the render returns an EMPTY block list — green against every
     * other lane here.
     */
    it("a prototype-named step id ABORTS at the render", () => {
      expect(() => assembleContextBlocks(shaped([], {}), "constructor")).toThrow(/kernel integrity/);
    });

    it("its DISCRIMINATING positive: the same id declared as a REAL step renders", () => {
      const realStep: WorkflowTemplate = {
        ref: { id: "t", version: 1 },
        start: "constructor",
        steps: Object.fromEntries([
          [
            "constructor",
            {
              role: "implementer",
              instruction: "build it",
              transitions: { PASS: "done" },
              promptConcernRefs: ["visible"],
              advancesRound: { PASS: false },
            },
          ],
        ]),
        terminal: ["done"],
        roles: { implementer: { defaultActor: "codex", promptConcernRefs: [] } },
        contextBlocks: { visible: { body: "visible" } },
      };
      expect(ids(assembleContextBlocks(realStep, "constructor"))).toEqual(["visible"]);
    });

    it("CHANNEL: the `__proto__` spelling arrives through the FILE channel and ABORTS", () => {
      // A bare object literal would drop this key silently (it sets the
      // prototype instead), so the fixture is vacuously green on the
      // direct channel — the file channel is the route an operator can
      // actually author.
      const yaml = [
        "ref:",
        "  id: t",
        "  version: 1",
        "start: implement",
        "steps:",
        "  implement:",
        "    role: implementer",
        "    instruction: build it",
        "    transitions:",
        "      PASS: review",
        "  review:",
        "    role: reviewer",
        "    instruction: review it",
        "    transitions:",
        "      CONVERGED: done",
        "terminal:",
        "  - done",
        "roles:",
        "  implementer:",
        "    defaultActor: codex",
        "  reviewer:",
        "    defaultActor: claude",
        "",
      ].join("\n");
      const loaded = loadTemplate(new TextEncoder().encode(yaml), { catalog: gateCatalog });
      if (!loaded.ok) {
        throw new Error(`fixture load failed: ${JSON.stringify(loaded)}`);
      }
      expect(() => assembleContextBlocks(loaded.template, "__proto__")).toThrow(/kernel integrity/);
    });
  });

  describe("the GATES namespace — the opposite direction: no throw, no contribution", () => {
    /**
     * The step carries a PRESENT gates record (a second, gated event),
     * because the hazard is a lookup that lands ON a record and misses;
     * a step with no gates key at all short-circuits the optional read
     * and passes against an unguarded implementation.
     */
    function ungatedPrototypeEvent(spelling: string): WorkflowTemplate {
      const yaml = [
        "ref:",
        "  id: t",
        "  version: 1",
        "start: implement",
        "steps:",
        "  implement:",
        "    role: implementer",
        "    instruction: build it",
        "    agentConfig:",
        "      promptConcernRefs:",
        "        - legitimate",
        "    transitions:",
        "      PASS: review",
        `      ${spelling}: review`,
        "    gates:",
        "      PASS:",
        "        - uses: declarative.threshold",
        "          config: {}",
        "          contextBlockRefs:",
        "            - from-pass",
        "  review:",
        "    role: reviewer",
        "    instruction: review it",
        "    transitions:",
        "      CONVERGED: done",
        "terminal:",
        "  - done",
        "roles:",
        "  implementer:",
        "    defaultActor: codex",
        "  reviewer:",
        "    defaultActor: claude",
        "contextBlocks:",
        "  legitimate:",
        "    body: legitimate",
        "  from-pass:",
        "    body: from pass",
        "",
      ].join("\n");
      const loaded = loadTemplate(new TextEncoder().encode(yaml), { catalog: gateCatalog });
      if (!loaded.ok) {
        throw new Error(`fixture load failed: ${JSON.stringify(loaded)}`);
      }
      return loaded.template;
    }

    for (const spelling of ["__proto__", "constructor"]) {
      it(`an UNGATED '${spelling}' transition renders the legitimate blocks and contributes none`, () => {
        const template = ungatedPrototypeEvent(spelling);
        expect(ids(assembleContextBlocks(template, "implement"))).toEqual([
          "legitimate",
          "from-pass",
        ]);
      });
    }

    it("its DISCRIMINATING positive: the same event GATED contributes its blocks", () => {
      const yaml = [
        "ref:",
        "  id: t",
        "  version: 1",
        "start: implement",
        "steps:",
        "  implement:",
        "    role: implementer",
        "    instruction: build it",
        "    transitions:",
        "      PASS: review",
        "      __proto__: review",
        "    gates:",
        "      PASS:",
        "        - uses: declarative.threshold",
        "          config: {}",
        "          contextBlockRefs:",
        "            - from-pass",
        "      __proto__:",
        "        - uses: declarative.threshold",
        "          config: {}",
        "          contextBlockRefs:",
        "            - from-proto",
        "  review:",
        "    role: reviewer",
        "    instruction: review it",
        "    transitions:",
        "      CONVERGED: done",
        "terminal:",
        "  - done",
        "roles:",
        "  implementer:",
        "    defaultActor: codex",
        "  reviewer:",
        "    defaultActor: claude",
        "contextBlocks:",
        "  from-pass:",
        "    body: from pass",
        "  from-proto:",
        "    body: from proto",
        "",
      ].join("\n");
      const loaded = loadTemplate(new TextEncoder().encode(yaml), { catalog: gateCatalog });
      if (!loaded.ok) {
        throw new Error(`fixture load failed: ${JSON.stringify(loaded)}`);
      }
      expect(ids(assembleContextBlocks(loaded.template, "implement"))).toEqual([
        "from-pass",
        "from-proto",
      ]);
    });
  });
});

// ───────────────────────────────────────────────────────────────────────
// Family 6 — determinism (→[determinism]).
// ───────────────────────────────────────────────────────────────────────

describe("family 6 — the render is a deterministic function of its inputs", () => {
  it("two renders from ONE input set are equal as WHOLE values", () => {
    const template = admit(
      issuing({ role: ["role-block"], step: ["step-block", "role-block"], gate: ["gate-block"] }),
    );
    const first = assembleContextBlocks(template, "implement");
    const second = assembleContextBlocks(template, "implement");
    expect(second).toEqual(first);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Family 12 (direct member) — run-scope blindness (→[run-scope-blind]).
// The signature's closure is primary, but nothing mechanical enforces
// it: this member drives the render DIRECTLY with a run-scope-bearing
// instance in scope at the caller, and reds against any build that
// accepts and reads it — whatever arity that build wrote.
// ───────────────────────────────────────────────────────────────────────

describe("family 12 — the run-scope channel never feeds the block set (direct member)", () => {
  it("a run override naming a CATALOG-DECLARED id contributes nothing to the render", () => {
    const template: WorkflowTemplate = {
      ref: { id: "t", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          promptConcernRefs: ["authored"],
          advancesRound: { PASS: false },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { CONVERGED: "done" },
          promptConcernRefs: [],
          advancesRound: { CONVERGED: false },
        },
      },
      terminal: ["done"],
      roles: {
        implementer: { defaultActor: "codex", promptConcernRefs: [] },
        reviewer: { defaultActor: "claude", promptConcernRefs: [] },
      },
      contextBlocks: { authored: { body: "authored" }, "run-scope-only": { body: "forbidden" } },
    };
    // The forbidden channel, in scope at the call site and carrying a
    // ref that WOULD render if anything read it.
    const instance: WorkflowInstance = {
      instanceId: "i-1",
      templateRef: { id: "t", version: 1 },
      task: "a task",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: "implement",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: { implement: { promptConcernRefs: ["run-scope-only"] } },
      version: 1,
    };
    expect(instance.runOverrides.implement).toBeDefined();
    expect(ids(assembleContextBlocks(template, "implement"))).toEqual(["authored"]);
  });
});
