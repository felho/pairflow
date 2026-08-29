import { describe, expect, it } from "vitest";

import { admitTemplate } from "../definition/index.js";
import type {
  AdmittedTemplate,
  EventEnvelope,
  LifecycleFactEntry,
  TranscriptEntry,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { GateCatalog } from "../ports/index.js";
import type { InstanceDetail } from "../ports/store.js";
import type { ProcessGateEvidence } from "../ports/gate.js";
import {
  checkEndStateConsistency,
  checkEvidenceResolution,
  checkOpUniqueness,
  checkRoundReconstruction,
  checkSeqContinuity,
  checkTerminalSink,
  checkVersionArithmetic,
  runAllCheckers,
} from "./storeCheckers.js";
import { fixtureTemplate } from "./templateFixture.js";

/**
 * Packet ch5-P2: each checker is proven RED on a violating fixture —
 * the negatives ARE the unit tests (the checker-kit claim's derivation).
 */
const template = fixtureTemplate();

function envelope(opId: string, type: string): EventEnvelope {
  return { instanceId: "i1", opId, type, actorId: "codex" };
}

function row(seq: number, opId: string, type: string): TranscriptEntry {
  return {
    entryKind: "transition",
    seq,
    envelope: envelope(opId, type),
    payloadDigest: `digest-${opId}`,
    gateDecisions: [],
    issuedAgentConfig: {},
    committedAt: 1_000 + seq,
  };
}

/** packet ch12-p1b: the immediate-mode activation's STARTED fact at
 * seq 1 — the round-reconstruction basis (C11: genesis round 0, the
 * activation write sets 1). Position-inert to the terminal-sink walk. */
function startedFact(opId: string): LifecycleFactEntry {
  return { entryKind: "STARTED", seq: 1, opId, committedAt: 1_000 };
}

function detail(
  rows: readonly TranscriptEntry[],
  overrides: Partial<WorkflowInstance> = {},
): InstanceDetail {
  const instance: WorkflowInstance = {
    instanceId: "i1",
    templateRef: template.ref,
    task: "fixture task",
    binding: { implementer: "codex", reviewer: "claude", operator: "human" },
    currentStep: "done",
    round: 1,
    kernelStatus: "TERMINAL",
    terminalDisposition: "done",
    activationMode: "immediate",
    wait: null,
    runtimeContext: { state: "ready", ref: null },
    failureReason: null,
    runOverrides: {},
    version: 1 + rows.length,
    ...overrides,
  };
  return { instance, transcript: rows };
}

// The STARTED activation fact (seq 1) heads every green history so the
// round reconstructs to 1 (the C11 activation basis); the transitions
// follow at seq 2+.
//
// ch14-p3b: the shipped CONVERGED edge no longer sinks at `done` — it
// PARKS at `human_approval`, committing the transition and the OP-LESS
// DECISION_REQUEST together. The green history is RESTATED through the
// new route rather than truncated: approve routes to `commit_pending`
// and a COMMIT resume reaches the terminal. FIVE commits, SIX rows —
// which is why the fixture's version is stated explicitly here rather
// than left to `detail()`'s row-count default.
const greenRows = [
  startedFact("s0"),
  row(2, "a1", "PASS"),
  row(3, "b2", "CONVERGED"),
  parkRow(4, "R-1"),
  decisionRow(5, "d1", "approve"),
  resumeRow(6, "r1", "COMMIT"),
];
const GREEN_VERSION = 6;

describe("post-condition checker kit (packet ch5-P2)", () => {
  it("green fixture: every checker passes and the aggregator is empty", () => {
    const green = detail(greenRows, { version: GREEN_VERSION });
    expect(checkSeqContinuity(green)).toEqual([]);
    expect(checkVersionArithmetic(green)).toEqual([]);
    expect(checkOpUniqueness(green)).toEqual([]);
    expect(checkEndStateConsistency(green, template)).toEqual([]);
    expect(checkTerminalSink(green, template)).toEqual([]);
    expect(runAllCheckers(green, template)).toEqual([]);
  });

  it("seq continuity: a gap in seq is a violation", () => {
    const gapped = detail([row(1, "a1", "PASS"), row(3, "b2", "CONVERGED")]);
    expect(checkSeqContinuity(gapped)).not.toEqual([]);
  });

  it("version arithmetic: version ≠ 1 + committed transitions is a violation", () => {
    const off = detail(greenRows, { version: 5 });
    expect(checkVersionArithmetic(off)).not.toEqual([]);
  });

  it("op uniqueness: a duplicated (instanceId, opId) pair is a violation", () => {
    const duplicated = detail([row(1, "a1", "PASS"), row(2, "a1", "CONVERGED")]);
    expect(checkOpUniqueness(duplicated)).not.toEqual([]);
  });

  it("end-state consistency: TERMINAL on a non-terminal step is a violation", () => {
    const wrong = detail(greenRows, { currentStep: "review" });
    expect(checkEndStateConsistency(wrong, template)).not.toEqual([]);
  });

  it("end-state consistency: ACTIVE parked on a terminal step is a violation", () => {
    const wrong = detail(greenRows, {
      currentStep: "done",
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
    });
    expect(checkEndStateConsistency(wrong, template)).not.toEqual([]);
  });

  it("terminal sink (the mandated negative): a transcript row AFTER the terminal arrival is a violation", () => {
    const afterTerminal = detail([
      row(1, "a1", "PASS"),
      row(2, "b2", "CONVERGED"),
      row(3, "c3", "PASS"),
    ]);
    const violations = checkTerminalSink(afterTerminal, template);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("terminal");
  });

  it("terminal sink: a mid-path row with no transition at the reconstructed position is a violation (corrupt history)", () => {
    const corrupt = detail([row(1, "a1", "NOPE"), row(2, "b2", "CONVERGED")]);
    const violations = checkTerminalSink(corrupt, template);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("no transition");
  });

  it("the aggregator surfaces every checker's violations together", () => {
    const bad = detail([row(1, "a1", "PASS"), row(1, "a1", "PASS")], {
      currentStep: "review",
      version: 9,
    });
    const violations = runAllCheckers(bad, template);
    expect(violations.length).toBeGreaterThanOrEqual(3);
  });
});

// ── packet ch12-p1a (T2): the terminal-sink extension — the axis lanes
// (a) TERMINAL ⇔ disposition, (b) disposition ⇔ reconstruction,
// (d) wait NULL at TERMINAL; each proven RED on a fabricated violation. ──

describe("checkTerminalSink — the axis extension (packet ch12-p1a, T2)", () => {
  it("(a) TERMINAL without a disposition is a violation (single-write rule)", () => {
    const bare = detail(greenRows, { version: GREEN_VERSION, terminalDisposition: null });
    const violations = checkTerminalSink(bare, template);
    expect(violations.some((v) => v.includes("without a terminal_disposition"))).toBe(true);
  });

  it("(a) a disposition on a non-TERMINAL instance is a violation", () => {
    // Mid-run shape with a stray disposition: ACTIVE at review, one row.
    const stray = detail([row(1, "a1", "PASS")], {
      currentStep: "review",
      kernelStatus: "ACTIVE",
      terminalDisposition: "done",
    });
    const violations = checkTerminalSink(stray, template);
    expect(violations.some((v) => v.includes("non-TERMINAL"))).toBe(true);
  });

  it("(b) disposition 'done' with a NON-terminal replayed position is a violation", () => {
    // One PASS row replays implement → review (not terminal), yet the
    // instance claims TERMINAL + done.
    const mismatched = detail([row(1, "a1", "PASS")], { currentStep: "review" });
    const violations = checkTerminalSink(mismatched, template);
    expect(violations.some((v) => v.includes("not terminal"))).toBe(true);
  });

  it("(b) a terminal replayed position whose disposition is not 'done' is a violation (P1a inventory)", () => {
    const wrongToken = detail(greenRows, {
      version: GREEN_VERSION,
      kernelStatus: "TERMINAL",
      terminalDisposition: "cancelled",
    });
    const violations = checkTerminalSink(wrongToken, template);
    expect(violations.some((v) => v.includes("expected 'done'"))).toBe(true);
  });

  it("(d) a non-null wait at TERMINAL is a violation (S5's iff at the terminal cell)", () => {
    const waiting = detail(greenRows, {
      version: GREEN_VERSION,
      wait: { kind: "kickoff_pending", requestedBy: "activation", resumeEvents: ["KICKOFF"] },
    });
    const violations = checkTerminalSink(waiting, template);
    expect(violations.some((v) => v.includes("non-null wait"))).toBe(true);
  });

  it("the aggregator carries the extension: a TERMINAL-without-disposition detail fails through runAllCheckers", () => {
    const bare = detail(greenRows, { version: GREEN_VERSION, terminalDisposition: null });
    expect(runAllCheckers(bare, template).some((v) => v.includes("terminal_disposition"))).toBe(
      true,
    );
  });
});

// ── packet ch11-P2c: checkRoundReconstruction — replay = stored round
// (dimension 5). Admitted templates built with the INLINE stub catalog
// (the G1 eslint ban covers src/testkit/** — no gates/ import). ────────

function admit(t: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(t, { resolve: () => null } satisfies GateCatalog);
  if (!result.ok) {
    throw new Error(`storeCheckers fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

/** An admitted template that has DRIFTED — admitted whole, then missing a
 * step. Since ADR-019 D1 admission is structural on BOTH channels, a
 * dangling transition target cannot be admitted; the checker's subject
 * here is a value that passed admission and later lost a position. */
function admitThenDropStep(t: WorkflowTemplate, stepId: string): AdmittedTemplate {
  const admitted = admit(t);
  delete (admitted.steps as Record<string, unknown>)[stepId];
  return admitted;
}

// advance on arrival at the start step (the model's exhibited declaration)
// — the loop-back review→implement advances the round.
const admittedDeclared = admit({
  ...fixtureTemplate(),
  round: { advanceOnArrivalAt: ["implement"] },
});
// The declaration-ABSENT fixture strips the round key: `fixtureTemplate()`
// is declaration-PRESENT since ch11-P4 (the C38 restoration), and this
// checker lane's meaning is reconstruct-1 over an ABSENT declaration.
const { round: strippedDeclaration, ...declarationAbsentTemplate } = fixtureTemplate();
void strippedDeclaration; // stripped by design — the fixture must be declaration-free
const admittedAbsent = admit(declarationAbsentTemplate);

// Two loop-backs → stored round 3 (a DECLARATION-ABSENT fixture would be
// blind to a raw-template regression here — this reconstructs > 1).
const multiLoopRows = [
  startedFact("s0"), //                              round 1 (activation)
  row(2, "a1", "PASS"), // implement → review        round 1
  row(3, "b2", "PASS"), // review → implement (+1)   round 2
  row(4, "c3", "PASS"), // implement → review        round 2
  row(5, "d4", "PASS"), // review → implement (+1)   round 3
  row(6, "e5", "PASS"), // implement → review        round 3
  // ch14-p3b: CONVERGED reaches the GATE, not the terminal — so the
  // history is RESTATED through the human route it now takes. Neither
  // operator edge is named by `advanceOnArrivalAt`, so the round stays 3
  // and this lane keeps its subject.
  row(7, "f6", "CONVERGED"), // review → human_approval  round 3
  parkRow(8, "R-1"), //        the park's OP-LESS row     round 3
  decisionRow(9, "d1", "approve"), // gate → commit_pending  round 3
  resumeRow(10, "r1", "COMMIT"), //   commit_pending → done  round 3
];
/** NINE commits over TEN rows — the park's second row is op-less. */
const MULTI_LOOP_VERSION = 10;

describe("checkRoundReconstruction — replay = stored (dimension 5, packet ch11-P2c)", () => {
  it("a multi-loop-back committed history over a DECLARED-ADVANCING template reconstructs the stored round (green)", () => {
    const green = detail(multiLoopRows, { round: 3 });
    expect(checkRoundReconstruction(green, admittedDeclared)).toEqual([]);
  });

  it("a TAMPERED stored round → a violation whose message carries BOTH values", () => {
    const tampered = detail(multiLoopRows, { round: 2 }); // reconstructed is 3
    const violations = checkRoundReconstruction(tampered, admittedDeclared);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("stored round 2");
    expect(violations[0]).toContain("reconstructed round 3");
  });

  it("a corrupt history (non-resolving replay) → a violation, never a skip", () => {
    const corrupt = detail([row(1, "a1", "NOPE"), row(2, "b2", "CONVERGED")], { round: 1 });
    const violations = checkRoundReconstruction(corrupt, admittedAbsent);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("corrupt history");
  });

  it("a replay position with NO step entry → a violation naming the position, never a skip", () => {
    // Arm-gate-2 finding 3: the OTHER non-resolving branch (`step ===
    // undefined`) — the walk lands on a position absent from `steps`.
    // Since ADR-019 D1 that position cannot be AUTHORED (admission owns
    // structural well-formedness on both channels), so the fixture drifts
    // an admitted template instead: `ghost` is admitted as a real step and
    // then removed.
    const ghostly = admitThenDropStep(
      {
        ref: { id: "ghost", version: 1 },
        start: "implement",
        steps: {
          implement: { role: "implementer", instruction: "i", transitions: { PASS: "ghost" } },
          ghost: { role: "implementer", instruction: "g", transitions: {} },
        },
        terminal: ["done"],
        roles: { implementer: { defaultActor: "codex" } },
      },
      "ghost",
    );
    // Row 1 walks implement → ghost; row 2 replays FROM 'ghost', which
    // has no step entry — the checker must violate, not skip.
    const stranded = detail([row(1, "a1", "PASS"), row(2, "b2", "PASS")], { round: 1 });
    const violations = checkRoundReconstruction(stranded, ghostly);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("'ghost'");
    expect(violations[0]).toContain("no step entry");
  });

  it("a declaration-absent loop-back history reconstructs 1", () => {
    const absent = detail([startedFact("s0"), row(2, "a1", "PASS"), row(3, "b2", "PASS")], {
      currentStep: "review",
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      round: 1,
    });
    expect(checkRoundReconstruction(absent, admittedAbsent)).toEqual([]);
  });

  it("the aggregate carries the checker: a tampered round fails through runAllCheckers", () => {
    const tampered = detail(multiLoopRows, { round: 2, version: MULTI_LOOP_VERSION });
    const violations = runAllCheckers(tampered, admittedDeclared);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("round reconstruction");
  });
});

describe("checkEvidenceResolution — the store-visible evidence half (packet ch11-P3b, T2)", () => {
  const fakeRecord: ProcessGateEvidence = {
    log: "ok",
    kind: "ok",
    exitCode: 0,
    durationMs: 1,
    headSha: "h",
    gitStatusHash: "g",
  };
  function rowWithRefs(seq: number, refs: readonly string[]): TranscriptEntry {
    return {
      entryKind: "transition",
      seq,
      envelope: envelope(`op-${String(seq)}`, "CONVERGED"),
      payloadDigest: `d-${String(seq)}`,
      gateDecisions: [{ uses: "external.process", verdict: "allow", evidenceRefs: [...refs] }],
      issuedAgentConfig: {},
      committedAt: 1_000 + seq,
    };
  }

  it("a resolving trace is clean", () => {
    const detail = { instance: {} as WorkflowInstance, transcript: [rowWithRefs(1, ["ev-1"])] };
    const seam = (ref: string): ProcessGateEvidence | undefined =>
      ref === "ev-1" ? fakeRecord : undefined;
    expect(checkEvidenceResolution(detail, seam)).toEqual([]);
  });

  it("a NON-resolving ref is a violation naming the ref", () => {
    const detail = { instance: {} as WorkflowInstance, transcript: [rowWithRefs(1, ["ev-x"])] };
    const seam = (): ProcessGateEvidence | undefined => undefined;
    const violations = checkEvidenceResolution(detail, seam);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("ev-x");
  });

  it("refs PRESENT with NO seam provided is a violation naming the missing seam AND the ref", () => {
    const detail = { instance: {} as WorkflowInstance, transcript: [rowWithRefs(1, ["ev-1"])] };
    const violations = checkEvidenceResolution(detail);
    expect(violations).toHaveLength(1);
    // The CONTENT, not just the length: the violation names the missing seam
    // and the affected ref (a message that dropped either turns this red).
    expect(violations[0]).toContain("ev-1");
    expect(violations[0]).toContain("seam");
  });

  it("a LATER ref on a LATER decision that does NOT resolve is caught (every-decision-every-ref universality)", () => {
    // A first-ref-only checker would pass this — the non-resolving ref is the
    // SECOND ref of the SECOND decision on the SECOND row; everything before it
    // resolves, so only a checker that walks every decision × every ref is red.
    const laterDecisionRow: TranscriptEntry = {
      entryKind: "transition",
      seq: 2,
      envelope: envelope("op-2", "CONVERGED"),
      payloadDigest: "d-2",
      gateDecisions: [
        { uses: "external.process", verdict: "allow", evidenceRefs: ["ok-2"] },
        { uses: "external.process", verdict: "warn", evidenceRefs: ["ok-3", "bad-ref"] },
      ],
      issuedAgentConfig: {},
      committedAt: 1_002,
    };
    const detail = {
      instance: {} as WorkflowInstance,
      transcript: [rowWithRefs(1, ["ok-1"]), laterDecisionRow],
    };
    const resolves = new Set(["ok-1", "ok-2", "ok-3"]);
    const seam = (ref: string): ProcessGateEvidence | undefined =>
      resolves.has(ref) ? fakeRecord : undefined;
    const violations = checkEvidenceResolution(detail, seam);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("bad-ref");
  });

  it("a ref-FREE detail with no seam is clean (every pre-l2a trace passes unchanged)", () => {
    const detail = {
      instance: {} as WorkflowInstance,
      transcript: [row(1, "op-1", "PASS")],
    };
    expect(checkEvidenceResolution(detail)).toEqual([]);
  });

  it("runAllCheckers threads the seam — a non-resolving committed ref surfaces through the aggregate", () => {
    const detail = detailWith([rowWithRefs(1, ["ev-x"])]);
    const seam = (): ProcessGateEvidence | undefined => undefined;
    const violations = runAllCheckers(detail, template, seam);
    expect(violations.some((v) => v.includes("ev-x"))).toBe(true);
  });
});

function detailWith(rows: readonly TranscriptEntry[]): InstanceDetail {
  return {
    instance: {
      instanceId: "i1",
      templateRef: template.ref,
      task: "t",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: template.start,
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 1 + rows.length,
    },
    transcript: rows,
  };
}

// ── ch12-p1b T2: the per-disposition growth legs, each red-proven on a
// fabricated violation (cancelled ⇔ CANCELLED fact; failed ⇔
// failure_reason; the row-bearing sink) ───────────────────────────────

describe("checkTerminalSink — the ch12-p1b disposition growth (T2)", () => {
  function cancelledFact(seq: number, opId: string): LifecycleFactEntry {
    return { entryKind: "CANCELLED", seq, opId, committedAt: 0 };
  }

  it("cancelled WITHOUT a CANCELLED fact row → violation (the cancel witness)", () => {
    const fabricated = detail([startedFact("s0"), row(2, "a1", "PASS")], {
      currentStep: "review",
      terminalDisposition: "cancelled",
      version: 4,
    });
    expect(checkTerminalSink(fabricated, template).join("\n")).toMatch(
      /cancelled' without a CANCELLED fact|disposition 'cancelled' without/,
    );
  });

  it("a CANCELLED fact with a NON-cancelled disposition → violation", () => {
    const fabricated = detail(
      [startedFact("s0"), row(2, "a1", "PASS"), cancelledFact(3, "c1")],
      { currentStep: "review", terminalDisposition: "failed", failureReason: "x", version: 4 },
    );
    expect(checkTerminalSink(fabricated, template).join("\n")).toMatch(
      /CANCELLED fact exists but the disposition/,
    );
  });

  it("a clean cancel from mid-run passes (position-independent)", () => {
    const clean = detail([startedFact("s0"), row(2, "a1", "PASS"), cancelledFact(3, "c1")], {
      currentStep: "review",
      terminalDisposition: "cancelled",
      version: 4,
    });
    expect(checkTerminalSink(clean, template)).toEqual([]);
  });

  it("a committed row AFTER the CANCELLED fact → sink violation (the row-bearing scope)", () => {
    const fabricated = detail(
      [startedFact("s0"), cancelledFact(2, "c1"), row(3, "z9", "PASS")],
      { currentStep: "implement", terminalDisposition: "cancelled", version: 4 },
    );
    expect(checkTerminalSink(fabricated, template).join("\n")).toMatch(
      /committed AFTER the terminal row/,
    );
  });

  it("failed WITHOUT a failure_reason → violation; a reason OUTSIDE failed → violation (both directions)", () => {
    const noReason = detail([startedFact("s0")], {
      currentStep: null,
      terminalDisposition: "failed",
      failureReason: null,
      version: 3,
    });
    expect(checkTerminalSink(noReason, template).join("\n")).toMatch(
      /'failed' without a failure_reason/,
    );
    const strayReason = detail([startedFact("s0"), row(2, "a1", "PASS")], {
      currentStep: "review",
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      failureReason: "stray",
      version: 3,
    });
    expect(checkTerminalSink(strayReason, template).join("\n")).toMatch(
      /failure_reason present but the disposition/,
    );
  });

  it("a FAILED run's version arithmetic counts the row-less commit (checkVersionArithmetic)", () => {
    const failed = detail([startedFact("s0")], {
      currentStep: null,
      terminalDisposition: "failed",
      failureReason: "boom",
      version: 3,
    });
    expect(checkVersionArithmetic(failed)).toEqual([]);
    const wrong = detail([startedFact("s0")], {
      currentStep: null,
      terminalDisposition: "failed",
      failureReason: "boom",
      version: 2,
    });
    expect(checkVersionArithmetic(wrong).join("\n")).toMatch(/version arithmetic/);
  });
});

// ── ch12-p1b gate-2 aftermath: the wait iff at the store boundary
// BOTH directions (checkTerminalSink (d) is now the full wait⇔WAITING
// iff) + a FACT row after the terminal TRANSITION row (the row-bearing
// sink's second class, complementing the after-CANCELLED lane) ─────────

describe("checkTerminalSink — the wait iff both directions + fact-after-terminal (gate-2 aftermath)", () => {
  const KICKOFF_WAIT = {
    kind: "kickoff_pending",
    requestedBy: "activation",
    resumeEvents: ["KICKOFF"],
  } as const;

  function lateFact(kind: "STARTED" | "CANCELLED", seq: number, opId: string): LifecycleFactEntry {
    return { entryKind: kind, seq, opId, committedAt: 1_000 + seq };
  }

  it("a FACT row committed AFTER the terminal TRANSITION row → sink violation (complements the after-CANCELLED lane)", () => {
    // ch14-p3b: the green history reaches `done` on the RESUME row at
    // seq 6, so the fabricated fact lands at seq 7 — after the terminal
    // row, which is the lane's subject. The sink walk reds on the OTHER
    // row-bearing writer (a fact after `done`, not after CANCELLED).
    const afterDone = detail([
      ...greenRows,
      lateFact("STARTED", 7, "late"),
    ]);
    expect(checkTerminalSink(afterDone, template).join("\n")).toMatch(
      /committed AFTER the terminal row/,
    );
  });

  it("(d) a WAITING instance with a NULL wait → violation (the iff's WAITING⇒wait direction)", () => {
    const waitingNoWait = detail([startedFact("s0")], {
      currentStep: null,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      wait: null,
    });
    expect(
      checkTerminalSink(waitingNoWait, template).some((v) =>
        v.includes("WAITING instance without a typed wait"),
      ),
    ).toBe(true);
  });

  it("(d) a non-null wait on an ACTIVE instance → violation (the iff's wait⇒WAITING direction)", () => {
    const activeWithWait = detail([startedFact("s0"), row(2, "a1", "PASS")], {
      currentStep: "review",
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      wait: KICKOFF_WAIT,
    });
    expect(
      checkTerminalSink(activeWithWait, template).some((v) =>
        v.includes("non-null wait on a ACTIVE instance"),
      ),
    ).toBe(true);
  });

  it("(d) the existing TERMINAL + non-null wait lane still reds", () => {
    const terminalWithWait = detail(greenRows, { wait: KICKOFF_WAIT });
    expect(
      checkTerminalSink(terminalWithWait, template).some((v) => v.includes("non-null wait")),
    ).toBe(true);
  });
});

// ── ch14-p2a aftermath: the two obligations the packet declared and the
// build left open. Both are of the class the packet's own `learned` line
// names — a rule asserted in prose with nothing measuring it. ───────────

/**
 * A gate- and wait-bearing template. Since ch14-p3b the shipped
 * `local-pair-v0` carries a gate and a wait of its own, so the old
 * ground for a LOCAL fixture — that no shipped wiring existed yet — has
 * expired. The fixture stays local for a DIFFERENT and standing reason:
 * the correspondence needs edges the shipped template does not declare
 * (a HOLD route out of the start step, a decision reaching a terminal),
 * and driving it off the shipped value would tie this lane's inventory
 * to a product declaration it does not own.
 */
const CORRESPONDENCE_TEMPLATE: WorkflowTemplate = {
  ref: { id: "t-corr", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "gate", HOLD: "hold" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "approve it?",
      decisions: { approve: { target: "implement" }, reject: { target: "done" } },
    },
    hold: {
      type: "wait",
      wait: { kind: "ci_pending", resumeEvents: ["CI_DONE"] },
      onResume: { CI_DONE: "implement" },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, operator: { defaultActor: "human-1" } },
};

/** The same template with the WAIT step at `start` — the only shape that
 * puts a kernel-owned activation hold at a `wait` position, which is the
 * exemption conjunct (iii) is scoped against. */
const WAIT_START_TEMPLATE: WorkflowTemplate = { ...CORRESPONDENCE_TEMPLATE, start: "hold" };

const ACTIVATION_HOLD = {
  kind: "kickoff_pending",
  requestedBy: "activation",
  resumeEvents: ["KICKOFF"],
} as const;

/** Parked, mid-run: the STARTED fact plus the rows that replay to `at`. */
function parked(
  rows: readonly TranscriptEntry[],
  wait: WorkflowInstance["wait"],
  at: string | null,
): InstanceDetail {
  return detail(rows, {
    currentStep: at,
    kernelStatus: "WAITING",
    terminalDisposition: null,
    wait,
  });
}

const toGate = [startedFact("s0"), row(2, "a1", "PASS")];
const toHold = [startedFact("s0"), row(2, "a1", "HOLD")];

const DECISION_WAIT = {
  kind: "human_decision",
  requestedBy: "gate",
  resumeEvents: ["approve", "reject"],
  requestRef: "req-1000-1",
} as const;

describe("checkTerminalSink — l3/waiting-is-honest, the kind↔position half (ch14-C14)", () => {
  // The S5 iff above this says a WAITING run HAS a wait. It says nothing
  // about that wait's KIND agreeing with WHERE the run is parked, which
  // is the chapter's own half and the reason the disposition is `checker`
  // rather than `satisfied`.

  it("green: a decision wait at a parked humanGate with a live request_ref is clean", () => {
    expect(checkTerminalSink(parked(toGate, DECISION_WAIT, "gate"), CORRESPONDENCE_TEMPLATE)).toEqual(
      [],
    );
  });

  it("green: an authored kind at the wait step DECLARING it is clean", () => {
    const wait = { kind: "ci_pending", requestedBy: "hold", resumeEvents: ["CI_DONE"] };
    expect(checkTerminalSink(parked(toHold, wait, "hold"), CORRESPONDENCE_TEMPLATE)).toEqual([]);
  });

  it("(i) a human_decision record at a NON-gate position is a violation", () => {
    // Replays to `implement` (an agent step) — the kernel's decision kind
    // exists only at a parked gate.
    const wrongPosition = parked([startedFact("s0")], DECISION_WAIT, "implement");
    expect(
      checkTerminalSink(wrongPosition, CORRESPONDENCE_TEMPLATE).some((v) =>
        v.includes("human_decision"),
      ),
    ).toBe(true);
  });

  it("(ii) a human_decision record at a gate with NO live request_ref is a violation", () => {
    const noRef = parked(
      toGate,
      { kind: "human_decision", requestedBy: "gate", resumeEvents: ["approve", "reject"] },
      "gate",
    );
    expect(
      checkTerminalSink(noRef, CORRESPONDENCE_TEMPLATE).some((v) => v.includes("request_ref")),
    ).toBe(true);
  });

  it("(iii) an authored kind at a wait step declaring a DIFFERENT one is a violation", () => {
    const drifted = parked(
      toHold,
      { kind: "deploy_pending", requestedBy: "hold", resumeEvents: ["CI_DONE"] },
      "hold",
    );
    expect(
      checkTerminalSink(drifted, CORRESPONDENCE_TEMPLATE).some((v) =>
        v.includes("declares wait kind"),
      ),
    ).toBe(true);
  });

  it("(iii) the activation hold at a wait-class START step is NOT a violation (the scoping's own negative)", () => {
    // The kernel-owned hold names no step (`requestedBy: activation`), so
    // it is outside the correspondence — and a build that dropped that
    // scoping would red exactly here while every other lane stayed green.
    const hold = parked([], ACTIVATION_HOLD, null);
    expect(checkTerminalSink(hold, WAIT_START_TEMPLATE)).toEqual([]);
  });

  it("the aggregator carries the correspondence", () => {
    const wrongPosition = parked([startedFact("s0")], DECISION_WAIT, "implement");
    expect(
      runAllCheckers(wrongPosition, CORRESPONDENCE_TEMPLATE).some((v) =>
        v.includes("human_decision"),
      ),
    ).toBe(true);
  });
});

// ── K12's checker-contract boundary (family 16): the op-less class is
// SKIPPED, and the skip must not become a blanket. ─────────────────────

function decisionRequestRow(seq: number, requestRef: string): TranscriptEntry {
  return {
    entryKind: "DECISION_REQUEST",
    seq,
    requestRef,
    recipient: "operator",
    decisions: ["approve", "reject"],
    committedAt: 1_000 + seq,
  };
}

describe("checkOpUniqueness — the op-less class boundary (ch14-p2a, K12)", () => {
  it("TWO op-less rows on one instance report NO violation", () => {
    // The false-duplicate defect K12 names: recording `undefined` as a
    // seen key makes the SECOND op-less row look like a repeat.
    const twoOpLess = detail([
      startedFact("s0"),
      decisionRequestRow(2, "req-1000-1"),
      decisionRequestRow(3, "req-1000-2"),
    ]);
    expect(checkOpUniqueness(twoOpLess)).toEqual([]);
  });

  it("the skip is NOT a blanket: duplicate op-carrying rows beside op-less rows still report", () => {
    const mixed = detail([
      decisionRequestRow(1, "req-1000-1"),
      row(2, "a1", "PASS"),
      decisionRequestRow(3, "req-1000-2"),
      row(4, "a1", "PASS"),
    ]);
    const violations = checkOpUniqueness(mixed);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("a1");
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 11 — the FOUR blind replay readers, CLOSED
// (packet ch14-p2b, Q11). THE TWO AXES ARE DRIVEN SEPARATELY, because
// one obligation cannot cover both: three readers are POSITION-blind,
// the fourth is ROW-COUNT-blind.
// ─────────────────────────────────────────────────────────────────────

const gatedTemplate: WorkflowTemplate = {
  ref: { id: "f11", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "gate" },
      recommends: { PASS: "approve" },
    },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "decide",
      decisions: { approve: { target: "commit_wait" }, back: { target: "implement" } },
    },
    commit_wait: {
      type: "wait",
      wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] },
      onResume: { COMMIT: "done" },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, operator: { defaultActor: "human-1" } },
  round: { advanceOnArrivalAt: ["implement"] },
};
const admittedF11 = admit(gatedTemplate);

function parkRow(seq: number, requestRef: string): TranscriptEntry {
  return {
    entryKind: "DECISION_REQUEST",
    seq,
    requestRef,
    recipient: "operator",
    decisions: ["approve", "back"],
    committedAt: 1_000 + seq,
  };
}

function decisionRow(seq: number, opId: string, decision: string): TranscriptEntry {
  return {
    entryKind: "DECISION_MADE",
    seq,
    opId,
    decision,
    by: "human-1",
    requestRef: "R-1",
    committedAt: 1_000 + seq,
  };
}

function resumeRow(seq: number, opId: string, event: string): TranscriptEntry {
  return {
    entryKind: "WAIT_RESUMED",
    seq,
    opId,
    kind: "commit_pending",
    event,
    committedAt: 1_000 + seq,
  };
}

/**
 * A history containing a DECISION-routed AND a RESUME-routed arrival:
 * start → PASS (park, TWO rows in ONE commit) → approve → COMMIT → done.
 * FOUR commits, FIVE rows.
 */
const threeWayRows: readonly TranscriptEntry[] = [
  startedFact("s0"),
  row(2, "a1", "PASS"),
  parkRow(3, "R-1"),
  decisionRow(4, "d1", "approve"),
  resumeRow(5, "r1", "COMMIT"),
];

function f11Detail(
  rows: readonly TranscriptEntry[],
  overrides: Partial<WorkflowInstance> = {},
): InstanceDetail {
  return {
    instance: {
      instanceId: "i1",
      templateRef: gatedTemplate.ref,
      task: "t",
      binding: { implementer: "codex", operator: "human-1" },
      currentStep: "done",
      round: 1,
      kernelStatus: "TERMINAL",
      terminalDisposition: "done",
      activationMode: "immediate",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      // COMMITS, not rows: the park's second row is the OP-LESS class.
      version: 5,
      ...overrides,
    },
    transcript: rows,
  };
}

describe("family 11 — the THREE POSITION-blind readers, driven POSITIVELY", () => {
  it("the terminal-sink walk advances on BOTH new row classes", () => {
    expect(checkTerminalSink(f11Detail(threeWayRows), admittedF11)).toEqual([]);
  });

  it("the round reconstruction advances on BOTH new row classes", () => {
    // The decision routes to `commit_wait` (no advance) and the resume to
    // `done` (no advance), so the round stays 1 — reconstructed through
    // the SAME per-step map ch14-P1 expanded all three edge classes into.
    expect(checkRoundReconstruction(f11Detail(threeWayRows), admittedF11)).toEqual([]);
  });

  it("the round walk counts a DECISION edge that DOES advance", () => {
    // `back` targets `implement`, which `advanceOnArrivalAt` names — so a
    // reader keyed only on transition rows reconstructs 1 against a
    // stored 2 and REDS. The lane proves the edge is really consumed.
    const rows = [startedFact("s0"), row(2, "a1", "PASS"), parkRow(3, "R-1"), decisionRow(4, "d1", "back")];
    expect(
      checkRoundReconstruction(
        f11Detail(rows, {
          currentStep: "implement",
          round: 2,
          kernelStatus: "ACTIVE",
          terminalDisposition: null,
          version: 4,
        }),
        admittedF11,
      ),
    ).toEqual([]);
  });

  it("EACH POSITION READER REJECTS A CORRUPT HISTORY — so the fix is not a SKIP", () => {
    // The non-resolving key is a PROTOTYPE MEMBER NAME rather than an
    // arbitrary miss (→[own-property-indexes]): a fixture keyed on `zzz`
    // satisfies the discipline sentence while leaving both replay indexes
    // unguarded.
    const hostile = [
      startedFact("s0"),
      row(2, "a1", "PASS"),
      parkRow(3, "R-1"),
      decisionRow(4, "d1", "constructor"),
    ];
    expect(checkTerminalSink(f11Detail(hostile), admittedF11).length).toBeGreaterThan(0);
    expect(checkRoundReconstruction(f11Detail(hostile), admittedF11).length).toBeGreaterThan(0);

    // …and the same on the RESUME index.
    const hostileResume = [
      startedFact("s0"),
      row(2, "a1", "PASS"),
      parkRow(3, "R-1"),
      decisionRow(4, "d1", "approve"),
      resumeRow(5, "r1", "constructor"),
    ];
    expect(checkTerminalSink(f11Detail(hostileResume), admittedF11).length).toBeGreaterThan(0);
    expect(
      checkRoundReconstruction(f11Detail(hostileResume), admittedF11).length,
    ).toBeGreaterThan(0);
  });
});

describe("family 11 — THE FOURTH READER's OWN NEGATIVE LANE (the row-count axis)", () => {
  it("the version arithmetic is a count of COMMITS, not of ROWS", () => {
    // FIVE rows, FOUR commits (the park wrote two in one), version 5.
    // The pre-re-base reader computed 1 + 5 = 6 and REDS here.
    expect(checkVersionArithmetic(f11Detail(threeWayRows))).toEqual([]);
  });

  it("A DEGENERATE SKIP IS REFUSED: an off-by-one park history REPORTS a violation", () => {
    // THE ANTI-SKIP INSTRUMENT FOR THIS READER, written in ITS OWN
    // vocabulary: the three position readers' corrupt-history lanes are
    // meaningless for a checker that replays no positions. A build can
    // discharge the re-base by DEGENERATING the check — reporting nothing
    // whenever the transcript carries an op-less row — and the golden
    // trace then goes GREEN, satisfying every other lane here while
    // silently removing version arithmetic from every future trace.
    //
    // The transcript carries a PARK (TWO rows, ONE commit) and the
    // version is deliberately off by one. A degenerate skip returns
    // empty and REDS this lane; the correct commit-count re-base passes.
    const offByOne = f11Detail(threeWayRows, { version: 6 });
    const violations = checkVersionArithmetic(offByOne);
    expect(violations.length).toBe(1);
    expect(violations[0]).toContain("version arithmetic");
  });

  it("the reader still runs on histories with NO op-less row — the re-base is a NO-OP there", () => {
    // ch14-p3b: the green history now CARRIES an op-less row, so this
    // lane states its own no-op-less history rather than borrowing one —
    // otherwise the claim's subject would have quietly moved.
    const noOpLess = [startedFact("s0"), row(2, "a1", "PASS")];
    expect(checkVersionArithmetic(detail(noOpLess))).toEqual([]);
    expect(checkVersionArithmetic(detail(noOpLess, { version: 99 })).length).toBe(1);
  });
});

describe("family 11 — the op-uniqueness checker's SKIP SCOPING", () => {
  it("BOTH new classes' op ids ARE seen — the skip stays scoped to the OP-LESS class", () => {
    // The lane that reds if a build widens the skip to "non-transition":
    // a duplicated op id across a transition and a DECISION_MADE row must
    // still be caught.
    const duplicated = [
      startedFact("s0"),
      row(2, "a1", "PASS"),
      parkRow(3, "R-1"),
      decisionRow(4, "a1", "approve"),
    ];
    expect(checkOpUniqueness(f11Detail(duplicated, { version: 4 })).length).toBe(1);

    const duplicatedResume = [
      startedFact("s0"),
      row(2, "a1", "PASS"),
      parkRow(3, "R-1"),
      decisionRow(4, "d1", "approve"),
      resumeRow(5, "d1", "COMMIT"),
    ];
    expect(checkOpUniqueness(f11Detail(duplicatedResume)).length).toBe(1);
  });

  it("TWO op-less rows do NOT report a false duplicate — the skip is still needed", () => {
    const twoParks = [startedFact("s0"), row(2, "a1", "PASS"), parkRow(3, "R-1"), parkRow(4, "R-2")];
    expect(checkOpUniqueness(f11Detail(twoParks, { version: 3 }))).toEqual([]);
  });
});
