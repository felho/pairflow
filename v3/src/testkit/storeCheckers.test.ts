import { describe, expect, it } from "vitest";

import type { EventEnvelope, TranscriptEntry, WorkflowInstance } from "../domain/index.js";
import type { InstanceDetail } from "../ports/store.js";
import {
  checkEndStateConsistency,
  checkOpUniqueness,
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
