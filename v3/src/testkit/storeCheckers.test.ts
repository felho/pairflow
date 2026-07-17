import { describe, expect, it } from "vitest";

import { admitTemplate } from "../definition/index.js";
import type {
  AdmittedTemplate,
  EventEnvelope,
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
    seq,
    envelope: envelope(opId, type),
    payloadDigest: `digest-${opId}`,
    gateDecisions: [],
    committedAt: 1_000 + seq,
  };
}

function detail(
  rows: readonly TranscriptEntry[],
  overrides: Partial<WorkflowInstance> = {},
): InstanceDetail {
  const instance: WorkflowInstance = {
    instanceId: "i1",
    templateRef: template.ref,
    task: "fixture task",
    binding: { implementer: "codex", reviewer: "claude" },
    currentStep: "done",
    round: 1,
    status: "DONE",
    version: 1 + rows.length,
    runtimeContext: null,
    ...overrides,
  };
  return { instance, transcript: rows };
}

const greenRows = [row(1, "a1", "PASS"), row(2, "b2", "CONVERGED")];

describe("post-condition checker kit (packet ch5-P2)", () => {
  it("green fixture: every checker passes and the aggregator is empty", () => {
    const green = detail(greenRows);
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

  it("end-state consistency: DONE on a non-terminal step is a violation", () => {
    const wrong = detail(greenRows, { currentStep: "review", status: "DONE" });
    expect(checkEndStateConsistency(wrong, template)).not.toEqual([]);
  });

  it("end-state consistency: RUNNING parked on a terminal step is a violation", () => {
    const wrong = detail(greenRows, { currentStep: "done", status: "RUNNING" });
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
      status: "DONE",
      version: 9,
    });
    const violations = runAllCheckers(bad, template);
    expect(violations.length).toBeGreaterThanOrEqual(3);
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

// advance on arrival at the start step (the model's exhibited declaration)
// — the loop-back review→implement advances the round.
const admittedDeclared = admit({
  ...fixtureTemplate(),
  round: { advanceOnArrivalAt: ["implement"] },
});
const admittedAbsent = admit(fixtureTemplate());

// Two loop-backs → stored round 3 (a DECLARATION-ABSENT fixture would be
// blind to a raw-template regression here — this reconstructs > 1).
const multiLoopRows = [
  row(1, "a1", "PASS"), // implement → review        round 1
  row(2, "b2", "PASS"), // review → implement (+1)   round 2
  row(3, "c3", "PASS"), // implement → review        round 2
  row(4, "d4", "PASS"), // review → implement (+1)   round 3
  row(5, "e5", "PASS"), // implement → review        round 3
  row(6, "f6", "CONVERGED"), // review → done        round 3
];

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
    // undefined`) — the walk lands on a position absent from `steps`
    // (a transition targeting a non-step, non-terminal id; admission
    // does not own structural well-formedness, so this admits).
    const ghostly = admit({
      ref: { id: "ghost", version: 1 },
      start: "implement",
      steps: {
        implement: { role: "implementer", instruction: "i", transitions: { PASS: "ghost" } },
      },
      terminal: ["done"],
      roles: { implementer: { defaultActor: "codex" } },
    });
    // Row 1 walks implement → ghost; row 2 replays FROM 'ghost', which
    // has no step entry — the checker must violate, not skip.
    const stranded = detail([row(1, "a1", "PASS"), row(2, "b2", "PASS")], { round: 1 });
    const violations = checkRoundReconstruction(stranded, ghostly);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("'ghost'");
    expect(violations[0]).toContain("no step entry");
  });

  it("a declaration-absent loop-back history reconstructs 1", () => {
    const absent = detail([row(1, "a1", "PASS"), row(2, "b2", "PASS")], {
      currentStep: "review",
      status: "RUNNING",
      round: 1,
    });
    expect(checkRoundReconstruction(absent, admittedAbsent)).toEqual([]);
  });

  it("the aggregate carries the checker: a tampered round fails through runAllCheckers", () => {
    const tampered = detail(multiLoopRows, { round: 2 });
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
      seq,
      envelope: envelope(`op-${String(seq)}`, "CONVERGED"),
      payloadDigest: `d-${String(seq)}`,
      gateDecisions: [{ uses: "external.process", verdict: "allow", evidenceRefs: [...refs] }],
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

  it("refs PRESENT with NO seam provided is a violation (fail-closed, never a skip)", () => {
    const detail = { instance: {} as WorkflowInstance, transcript: [rowWithRefs(1, ["ev-1"])] };
    expect(checkEvidenceResolution(detail)).toHaveLength(1);
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
      status: "RUNNING",
      version: 1 + rows.length,
      runtimeContext: null,
    },
    transcript: rows,
  };
}
