import { describe, expect, it } from "vitest";

import type {
  EventEnvelope,
  LifecycleFactEntry,
  TranscriptEntry,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import { deriveGateProjection } from "./gateProjection.js";

/**
 * The `gate_projection` V grid (packet ch11-P2b, V1–V4): the PURE
 * derivation over (instance, template, committed entries, eventType).
 * No kernel, no store — the function is exercised directly.
 */

const template: WorkflowTemplate = {
  ref: { id: "local-pair-v0", version: 1 },
  start: "implement",
  steps: {
    implement: { role: "implementer", instruction: "build it", transitions: { PASS: "review" } },
    review: {
      role: "reviewer",
      instruction: "review it",
      transitions: { PASS: "implement", CONVERGED: "done" },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
};

function instanceAt(currentStep: string, round: number): WorkflowInstance {
  return {
    instanceId: "inst-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "build it",
    binding: { implementer: "codex", reviewer: "claude" },
    currentStep,
    round,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    activationMode: "immediate",
    wait: null,
    runtimeContext: { state: "ready", ref: null },
    failureReason: null,
    runOverrides: {},
    version: 1,
  };
}

/** A committed row carrying exactly `type` — the projection reads only
 * envelope.type; the other envelope fields are present but never
 * projected (the V3 negative asserts they never leak). */
function committed(seq: number, opId: string, type: string): TranscriptEntry {
  const envelope: EventEnvelope = {
    instanceId: "inst-1",
    opId,
    type,
    actorId: "codex",
    payload: { note: opId },
  };
  return {
    entryKind: "transition",
    seq,
    envelope,
    payloadDigest: `d-${opId}`,
    gateDecisions: [],
    issuedAgentConfig: {},
    committedAt: seq,
  };
}

/** A lifecycle fact row — carries no envelope and no gate decisions by
 * class, so the projection replay must skip it (F4). */
function fact(seq: number, kind: LifecycleFactEntry["entryKind"], opId: string): LifecycleFactEntry {
  return { entryKind: kind, seq, opId, committedAt: seq };
}

describe("deriveGateProjection — V1 scalar pass-through", () => {
  it("round / currentStep / eventType come from the loaded instance and the current envelope", () => {
    const projection = deriveGateProjection(instanceAt("review", 5), template, [], "CONVERGED");
    expect(projection.round).toBe(5);
    expect(projection.currentStep).toBe("review");
    expect(projection.eventType).toBe("CONVERGED");
  });

  it("an empty committed transcript yields history []", () => {
    const projection = deriveGateProjection(instanceAt("implement", 1), template, [], "PASS");
    expect(projection.history).toEqual([]);
  });
});

describe("deriveGateProjection — V2 replay-reconstructed history (multi-loop-back)", () => {
  it("stepId/eventType/role per committed row, transcript order, a step revisited twice", () => {
    const rows = [
      committed(1, "op-1", "PASS"), // from implement → review
      committed(2, "op-2", "PASS"), // from review → implement (loop-back)
      committed(3, "op-3", "PASS"), // from implement → review (implement revisited)
    ];
    const projection = deriveGateProjection(instanceAt("review", 2), template, rows, "CONVERGED");
    expect(projection.history).toEqual([
      { stepId: "implement", eventType: "PASS", role: "implementer" },
      { stepId: "review", eventType: "PASS", role: "reviewer" },
      { stepId: "implement", eventType: "PASS", role: "implementer" },
    ]);
  });
});

describe("deriveGateProjection — V3 two-grain negative (no raw transcript, no payloads)", () => {
  it("the projection's OWN keys are exactly C24's four, and each history entry's OWN keys are exactly {stepId, eventType, role}", () => {
    const rows = [committed(1, "op-1", "PASS")];
    const projection = deriveGateProjection(instanceAt("review", 1), template, rows, "CONVERGED");
    expect(Object.keys(projection).sort()).toEqual(["currentStep", "eventType", "history", "round"]);
    const entry = projection.history[0];
    expect(entry).toBeDefined();
    expect(Object.keys(entry ?? {}).sort()).toEqual(["eventType", "role", "stepId"]);
    // No payload / digest / opId / committedAt / envelope leaks anywhere.
    expect(JSON.stringify(projection)).not.toMatch(/payload|Digest|opId|committedAt|envelope|op-1/);
  });
});

describe("deriveGateProjection — fact rows are class-invisible to gate history (packet ch12-p1b F4)", () => {
  it("interleaved fact rows yield the SAME projection as the list with them removed (deep-equal histories)", () => {
    const withFacts: TranscriptEntry[] = [
      fact(1, "STARTED", "f-start"),
      committed(2, "op-1", "PASS"), // implement → review
      fact(3, "TASK_SUPPLIED", "f-kick"),
      committed(4, "op-2", "PASS"), // review → implement (loop-back)
      fact(5, "CANCELLED", "f-cancel"),
    ];
    const withoutFacts = withFacts.filter(
      (entry): entry is TranscriptEntry => entry.entryKind === "transition",
    );
    const instance = instanceAt("review", 2);
    const withProjection = deriveGateProjection(instance, template, withFacts, "CONVERGED");
    const withoutProjection = deriveGateProjection(instance, template, withoutFacts, "CONVERGED");
    // Skipping the fact rows IS the faithful semantics — not data loss.
    expect(withProjection).toEqual(withoutProjection);
    expect(withProjection.history).toEqual([
      { stepId: "implement", eventType: "PASS", role: "implementer" },
      { stepId: "review", eventType: "PASS", role: "reviewer" },
    ]);
  });
});

describe("deriveGateProjection — V4 non-resolving replay is a kernel-integrity throw", () => {
  it("a committed row whose type has no transition from its replayed position throws (never a rejection)", () => {
    const rows = [committed(1, "op-1", "NOPE")]; // implement has only PASS
    expect(() =>
      deriveGateProjection(instanceAt("implement", 1), template, rows, "PASS"),
    ).toThrow(/kernel integrity/);
  });

  it("a replay that steps past a terminal position (no step entry) throws", () => {
    // review --CONVERGED--> done, then a further row has no step to replay from.
    const rows = [committed(1, "op-1", "CONVERGED"), committed(2, "op-2", "PASS")];
    expect(() =>
      deriveGateProjection(instanceAt("review", 1), { ...template, start: "review" }, rows, "PASS"),
    ).toThrow(/kernel integrity/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 11 — THE PRODUCTION INHABITANT (packet ch14-p2b, Q11).
//
// This reader is the one that MATTERS: it is PRODUCTION. Before the fix,
// ANY gated workflow crossing a `humanGate` would resume its policy view
// from the PRE-GATE position and THROW on the next transition row.
// ─────────────────────────────────────────────────────────────────────

const gatedTemplate: WorkflowTemplate = {
  ref: { id: "gated-l3", version: 1 },
  start: "implement",
  steps: {
    implement: { role: "implementer", instruction: "build it", transitions: { PASS: "gate" } },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "decide",
      decisions: { approve: { target: "review" }, back: { target: "implement" } },
    },
    review: {
      role: "reviewer",
      instruction: "review it",
      transitions: { CONVERGED: "done" },
      gates: { CONVERGED: [] },
    },
  },
  terminal: ["done"],
  roles: {
    implementer: { defaultActor: "codex" },
    operator: { defaultActor: "human-1" },
    reviewer: { defaultActor: "claude" },
  },
};

function park(seq: number, requestRef: string): TranscriptEntry {
  return {
    entryKind: "DECISION_REQUEST",
    seq,
    requestRef,
    recipient: "operator",
    decisions: ["approve", "back"],
    committedAt: seq,
  };
}

function decision(seq: number, opId: string, key: string): TranscriptEntry {
  return {
    entryKind: "DECISION_MADE",
    seq,
    opId,
    decision: key,
    by: "human-1",
    requestRef: "R-1",
    committedAt: seq,
  };
}

function resumed(seq: number, opId: string, event: string): TranscriptEntry {
  return {
    entryKind: "WAIT_RESUMED",
    seq,
    opId,
    kind: "commit_pending",
    event,
    committedAt: seq,
  };
}

describe("deriveGateProjection — the DECISION-routed arrival advances the replay (family 11)", () => {
  it("THE SHAPE THAT REDS ON THE UN-FIXED READER: cross a gate, then commit a GATED transition", () => {
    // The history: PASS → gate (park, two rows) → approve → review, then
    // a gated CONVERGED at `review`. An un-fixed reader resumes from
    // `implement` and throws looking for `CONVERGED` there.
    const history: readonly TranscriptEntry[] = [
      committed(1, "a1", "PASS"),
      park(2, "R-1"),
      decision(3, "d1", "approve"),
    ];
    const projection = deriveGateProjection(
      instanceAt("review", 1),
      gatedTemplate,
      history,
      "CONVERGED",
    );
    // The gate history carries the ACTOR transition only — a decision
    // runs no gates, so it moves the walk and pushes NOTHING.
    expect(projection.history).toEqual([
      { stepId: "implement", eventType: "PASS", role: "implementer" },
    ]);
  });

  it("the op-less park row stays POSITION-INERT — the park does not move the run", () => {
    const history: readonly TranscriptEntry[] = [committed(1, "a1", "PASS"), park(2, "R-1")];
    // Position after the park is still `gate`; a reader that advanced on
    // the op-less row would land somewhere else and throw.
    const projection = deriveGateProjection(
      instanceAt("gate", 1),
      gatedTemplate,
      history,
      "approve",
    );
    expect(projection.history).toEqual([
      { stepId: "implement", eventType: "PASS", role: "implementer" },
    ]);
  });

  it("a RESUME-routed arrival advances the replay too", () => {
    const waitTemplate: WorkflowTemplate = {
      ...gatedTemplate,
      steps: {
        ...gatedTemplate.steps,
        gate: {
          type: "human_gate",
          role: "operator",
          instruction: "decide",
          decisions: { approve: { target: "commit_wait" } },
        },
        commit_wait: {
          type: "wait",
          wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] },
          onResume: { COMMIT: "review" },
        },
      },
    };
    const history: readonly TranscriptEntry[] = [
      committed(1, "a1", "PASS"),
      park(2, "R-1"),
      decision(3, "d1", "approve"),
      resumed(4, "r1", "COMMIT"),
    ];
    const projection = deriveGateProjection(
      instanceAt("review", 1),
      waitTemplate,
      history,
      "CONVERGED",
    );
    expect(projection.history).toEqual([
      { stepId: "implement", eventType: "PASS", role: "implementer" },
    ]);
  });

  it("A NON-RESOLVING DECISION KEY IS A KERNEL-INTEGRITY THROW, not a skip", () => {
    // The anti-skip instrument in THIS reader's own register — and the
    // key is a PROTOTYPE MEMBER NAME, so an unguarded index would answer
    // with an inherited member instead of throwing.
    const history: readonly TranscriptEntry[] = [
      committed(1, "a1", "PASS"),
      park(2, "R-1"),
      decision(3, "d1", "constructor"),
    ];
    expect(() =>
      deriveGateProjection(instanceAt("review", 1), gatedTemplate, history, "CONVERGED"),
    ).toThrow(/kernel integrity: gate projection replay found no route/);
  });

  it("A NON-RESOLVING RESUME EVENT throws the same way", () => {
    const waitTemplate: WorkflowTemplate = {
      ...gatedTemplate,
      steps: {
        ...gatedTemplate.steps,
        gate: {
          type: "human_gate",
          role: "operator",
          instruction: "decide",
          decisions: { approve: { target: "commit_wait" } },
        },
        commit_wait: {
          type: "wait",
          wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] },
          onResume: { COMMIT: "review" },
        },
      },
    };
    const history: readonly TranscriptEntry[] = [
      committed(1, "a1", "PASS"),
      park(2, "R-1"),
      decision(3, "d1", "approve"),
      resumed(4, "r1", "constructor"),
    ];
    expect(() =>
      deriveGateProjection(instanceAt("review", 1), waitTemplate, history, "CONVERGED"),
    ).toThrow(/kernel integrity: gate projection replay found no route/);
  });
});
