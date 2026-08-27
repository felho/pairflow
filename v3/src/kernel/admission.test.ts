import { describe, expect, it } from "vitest";

import type { RoleName, TranscriptEntry, WorkflowInstance } from "../domain/index.js";
import { admitLoaded } from "./admission.js";
import type { AdmitExpect, AdmitLoadedArity } from "./admission.js";

/**
 * The consolidated admission ladder in ISOLATION (packet ch11-P1,
 * matrix A): every rung outcome + the LADDER-INTERNAL dimension-1
 * combinations (the first seven — each lane stages BOTH conditions;
 * a reordered ladder fails them). The CROSS-BOUNDARY combinations
 * (8, 9, 10, 11 — authority vs navigation vs capability) cannot run
 * here (admit_loaded never sees the event type or capability): their
 * home is kernel.test.ts.
 */

function instance(over: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    instanceId: "inst-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "ship it",
    binding: { implementer: "codex", reviewer: "claude" },
    currentStep: "implement",
    round: 1,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    activationMode: "immediate",
    wait: null,
    runtimeContext: { state: "ready", ref: null },
    failureReason: null,
    runOverrides: {},
    version: 3,
    ...over,
  };
}

/**
 * THE ACTOR PATH'S EXPECTATION, in the OPENED ladder's shape (packet
 * ch14-p2b, Q3). Every lane below is byte-for-byte the same OUTCOME it
 * asserted before the opening — which is the point: family 2's no-move
 * CONTROL measures HANDLE's non-movement outcome by outcome, rather
 * than resting on "HANDLE passes neither", a claim that stops being
 * true the moment the state and authority rungs take parameters at all.
 *
 * THE AUTHORITY GROUP IS PASSED ALWAYS, with `claim` where
 * `expectedRole` used to sit: an absent CLAIM still means
 * `missing_role`. Only an absent GROUP is a skip.
 */
function expectation(over: Partial<AdmitExpect> = {}): AdmitExpect {
  return {
    idempotency: { existing: null, compare: { mode: "digest", payloadDigest: "dg-1" } },
    state: { holds: (loaded) => loaded.kernelStatus === "ACTIVE", reject: "not_active" },
    expectedVersion: 3,
    authority: {
      claim: "implementer",
      granted: "implementer",
      missing: "missing_role",
      mismatch: "role_not_authorized",
    },
    ...over,
  };
}

/** An actor expectation with a committed row under the op id. */
function withExisting(entryKind: TranscriptEntry["entryKind"], payloadDigest: string | null) {
  return {
    idempotency: {
      existing: { payloadDigest, entryKind },
      compare: { mode: "digest", payloadDigest: "dg-1" },
    },
  } satisfies Partial<AdmitExpect>;
}

/** An actor expectation whose authority CLAIM is overridden. */
function withClaim(claim: string | undefined): Partial<AdmitExpect> {
  return {
    authority: {
      claim,
      granted: "implementer",
      missing: "missing_role",
      mismatch: "role_not_authorized",
    },
  };
}

/** An actor expectation whose GRANT is overridden (a terminal position). */
function withGrant(granted: RoleName | undefined): Partial<AdmitExpect> {
  return {
    authority: {
      claim: "implementer",
      granted,
      missing: "missing_role",
      mismatch: "role_not_authorized",
    },
  };
}

describe("admitLoaded — rung outcomes", () => {
  it("full warrant on an ACTIVE instance → accepted", () => {
    expect(admitLoaded(instance(), expectation())).toEqual({ kind: "accepted" });
  });

  it("committed op_id + same digest → duplicate", () => {
    expect(
      admitLoaded(instance(), expectation(withExisting("transition", "dg-1"))),
    ).toEqual({ kind: "duplicate" });
  });

  it("committed op_id + different digest → op_id_collision", () => {
    expect(
      admitLoaded(instance(), expectation(withExisting("transition", "dg-OTHER"))),
    ).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("CREATED instance → not_active (the state rung's axis basis, E5)", () => {
    expect(admitLoaded(instance({ kernelStatus: "CREATED" }), expectation())).toEqual({
      kind: "rejected",
      reason: "not_active",
    });
  });

  it("WAITING instance → not_active (the axis basis covers every non-ACTIVE token)", () => {
    expect(admitLoaded(instance({ kernelStatus: "WAITING" }), expectation())).toEqual({
      kind: "rejected",
      reason: "not_active",
    });
  });

  it("TERMINAL(done) instance → not_active", () => {
    expect(
      admitLoaded(
        instance({ kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }),
        expectation(withGrant(undefined)),
      ),
    ).toEqual({ kind: "rejected", reason: "not_active" });
  });

  it("missing expectedVersion → missing_version (the entry guard)", () => {
    expect(admitLoaded(instance(), expectation({ expectedVersion: undefined }))).toEqual({
      kind: "rejected",
      reason: "missing_version",
    });
  });

  it("version mismatch → stale with the CURRENT version", () => {
    expect(admitLoaded(instance(), expectation({ expectedVersion: 2 }))).toEqual({
      kind: "stale",
      currentVersion: 3,
    });
  });

  it("missing expectedRole → missing_role (authority presence)", () => {
    expect(admitLoaded(instance(), expectation(withClaim(undefined)))).toEqual({
      kind: "rejected",
      reason: "missing_role",
    });
  });

  it("wrong role claim → role_not_authorized (authority match)", () => {
    expect(admitLoaded(instance(), expectation(withClaim("reviewer")))).toEqual({
      kind: "rejected",
      reason: "role_not_authorized",
    });
  });
});

describe("admitLoaded — the ladder-internal ordering combinations (dimension 1, #1–#7)", () => {
  it("#1 duplicate op_id on a TERMINAL instance → duplicate (idempotency precedes state)", () => {
    expect(
      admitLoaded(
        instance({ kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }),
        expectation({ ...withExisting("transition", "dg-1"), ...withGrant(undefined) }),
      ),
    ).toEqual({ kind: "duplicate" });
  });

  it("#2 collision digest on a TERMINAL instance → op_id_collision (idempotency precedes state)", () => {
    expect(
      admitLoaded(
        instance({ kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }),
        expectation({ ...withExisting("transition", "dg-OTHER"), ...withGrant(undefined) }),
      ),
    ).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("#3 TERMINAL + missing version → not_active (state precedes the version entry guard)", () => {
    expect(
      admitLoaded(
        instance({ kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }),
        expectation({ expectedVersion: undefined, ...withGrant(undefined) }),
      ),
    ).toEqual({ kind: "rejected", reason: "not_active" });
  });

  it("#4 TERMINAL + wrong role → not_active (state precedes authority)", () => {
    expect(
      admitLoaded(
        instance({ kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }),
        expectation({ authority: { claim: "reviewer", granted: undefined, missing: "missing_role", mismatch: "role_not_authorized" } }),
      ),
    ).toEqual({ kind: "rejected", reason: "not_active" });
  });

  it("#5 stale version + wrong role → stale (staleness precedes authority)", () => {
    expect(
      admitLoaded(instance(), expectation({ expectedVersion: 2, ...withClaim("reviewer") })),
    ).toEqual({ kind: "stale", currentVersion: 3 });
  });

  it("#6 missing version + missing role → missing_version (the entry guard precedes authority)", () => {
    expect(
      admitLoaded(
        instance(),
        expectation({ expectedVersion: undefined, ...withClaim(undefined) }),
      ),
    ).toEqual({ kind: "rejected", reason: "missing_version" });
  });

  it("#7 stale version + missing role → stale (staleness precedes authority presence)", () => {
    expect(
      admitLoaded(instance(), expectation({ expectedVersion: 2, ...withClaim(undefined) })),
    ).toEqual({ kind: "stale", currentVersion: 3 });
  });
});

describe("admitLoaded — structural surface (packet A13, re-titled at ch14-p2b)", () => {
  // THE TITLE WAS FALSE AFTER THE OPENING and nothing else caught it:
  // the assertion below stayed true while its stated REASON — "the
  // correlate rung's parameter is omitted entirely" — stopped being so
  // the moment ch14-p2b gave the rung its parameter. Q3 names correcting
  // it a duty, beside its production twin in `admission.ts`.
  it("takes exactly (instance, expect) — the intent's values ride `expect`, never a third parameter", () => {
    expect(admitLoaded.length).toBe(2);
  });

  // Q3's TYPE-LEVEL ARITY PIN, driven as a lane so the guard is
  // scheduled rather than merely declared. `.length` alone does NOT
  // carry it: `admitLoaded(instance, expect, input = undefined)` keeps
  // `.length === 2` and passes the lane above, while the TYPE below
  // widens to `2 | 3` and reds. The two guards are in DIFFERENT
  // registers — one runtime, one compile — and neither substitutes for
  // the other.
  it("pins the arity as a TYPE — either third parameter widens it to `2 | 3`", () => {
    const arity: AdmitLoadedArity = 2;
    expect(arity).toBe(2);
    const isExactlyTwo: AdmitLoadedArity extends 2 ? true : false = true;
    expect(isExactlyTwo).toBe(true);
  });
});

// ── Family 2: the OPERATOR ladders' rungs and their adjacent pairs ───
// Every rung is driven to its OWN rejection, and every ADJACENT PAIR is
// driven by a COMBINATION lane staging BOTH failures at once and
// asserting the EARLIER rung's name — isolated lanes cannot falsify a
// reordered ladder.

const PARKED_AT_GATE: Partial<WorkflowInstance> = {
  kernelStatus: "WAITING",
  currentStep: "gate",
  wait: {
    kind: "human_decision",
    requestedBy: "gate",
    resumeEvents: ["approve", "request_rework"],
    requestRef: "R-1",
  },
};

/** The SUBMIT path's expectation: five rungs, authority PRESENT. */
function submitExpectation(over: Partial<AdmitExpect> = {}): AdmitExpect {
  return {
    idempotency: { existing: null, compare: { mode: "kind", kind: "DECISION_MADE" } },
    state: {
      holds: (loaded) => loaded.kernelStatus === "WAITING" && loaded.wait?.kind === "human_decision",
      reject: "not_awaiting_decision",
    },
    correlate: { holds: (loaded) => loaded.wait?.requestRef === "R-1", reject: "decision_request_mismatch" },
    expectedVersion: 3,
    authority: {
      claim: "human-1",
      granted: "human-1",
      missing: "operator_not_authorized",
      mismatch: "operator_not_authorized",
    },
    ...over,
  };
}

/** The RESUME path's expectation: four rungs, authority ABSENT. */
function resumeExpectation(over: Partial<AdmitExpect> = {}): AdmitExpect {
  return {
    idempotency: { existing: null, compare: { mode: "kind", kind: "WAIT_RESUMED" } },
    state: { holds: (loaded) => loaded.kernelStatus === "WAITING", reject: "not_waiting" },
    correlate: {
      holds: (loaded) => (loaded.wait?.resumeEvents ?? []).includes("COMMIT"),
      reject: "resume_event_mismatch",
    },
    expectedVersion: 3,
    ...over,
  };
}

const PARKED_AT_WAIT: Partial<WorkflowInstance> = {
  kernelStatus: "WAITING",
  currentStep: "commit_wait",
  wait: { kind: "commit_pending", requestedBy: "commit_wait", resumeEvents: ["COMMIT"] },
};

describe("admitLoaded — the SUBMIT path's five rungs (family 2)", () => {
  it("full warrant on a parked gate → accepted", () => {
    expect(admitLoaded(instance(PARKED_AT_GATE), submitExpectation())).toEqual({ kind: "accepted" });
  });

  it("idempotency: a DECISION_MADE row under the op id → duplicate (the intent's OWN kind)", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_GATE),
        submitExpectation({
          idempotency: {
            existing: { payloadDigest: null, entryKind: "DECISION_MADE" },
            compare: { mode: "kind", kind: "DECISION_MADE" },
          },
        }),
      ),
    ).toEqual({ kind: "duplicate" });
  });

  it("idempotency: a TRANSITION row under the op id → op_id_collision (ANY other kind)", () => {
    // THE TRANSITION CELL proves the digest half was not reused: the
    // KIND compare answers `op_id_collision` where a digest-aware
    // compare might have found a match.
    expect(
      admitLoaded(
        instance(PARKED_AT_GATE),
        submitExpectation({
          idempotency: {
            existing: { payloadDigest: "dg-1", entryKind: "transition" },
            compare: { mode: "kind", kind: "DECISION_MADE" },
          },
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("state: an ACTIVE instance → not_awaiting_decision (only a parked gate accepts a decision)", () => {
    expect(admitLoaded(instance(), submitExpectation())).toEqual({
      kind: "rejected",
      reason: "not_awaiting_decision",
    });
  });

  it("state: a BARE wait → not_awaiting_decision (the wait KIND is part of the rung)", () => {
    expect(admitLoaded(instance(PARKED_AT_WAIT), submitExpectation())).toEqual({
      kind: "rejected",
      reason: "not_awaiting_decision",
    });
  });

  it("correlate: a stale request_ref → decision_request_mismatch", () => {
    expect(
      admitLoaded(
        instance({
          ...PARKED_AT_GATE,
          wait: {
            kind: "human_decision",
            requestedBy: "gate",
            resumeEvents: ["approve"],
            requestRef: "R-OLD",
          },
        }),
        submitExpectation(),
      ),
    ).toEqual({ kind: "rejected", reason: "decision_request_mismatch" });
  });

  it("version: absent expectedVersion → missing_version (the F-W4-2 canonicalization on THIS path too)", () => {
    expect(
      admitLoaded(instance(PARKED_AT_GATE), submitExpectation({ expectedVersion: undefined })),
    ).toEqual({ kind: "rejected", reason: "missing_version" });
  });

  it("version: a mismatch → stale with the CURRENT version", () => {
    expect(admitLoaded(instance(PARKED_AT_GATE), submitExpectation({ expectedVersion: 2 }))).toEqual({
      kind: "stale",
      currentVersion: 3,
    });
  });

  it("authority: an ABSENT claim → operator_not_authorized (a present group, an absent claim)", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_GATE),
        submitExpectation({
          authority: {
            claim: undefined,
            granted: "human-1",
            missing: "operator_not_authorized",
            mismatch: "operator_not_authorized",
          },
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "operator_not_authorized" });
  });

  it("authority: a MISMATCHING claim → operator_not_authorized (both branches, one name)", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_GATE),
        submitExpectation({
          authority: {
            claim: "someone-else",
            granted: "human-1",
            missing: "operator_not_authorized",
            mismatch: "operator_not_authorized",
          },
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "operator_not_authorized" });
  });
});

describe("admitLoaded — the SUBMIT path's ADJACENT PAIRS (family 2)", () => {
  it("idempotency ≻ state: a replay on an ACTIVE instance → duplicate", () => {
    expect(
      admitLoaded(
        instance(),
        submitExpectation({
          idempotency: {
            existing: { payloadDigest: null, entryKind: "DECISION_MADE" },
            compare: { mode: "kind", kind: "DECISION_MADE" },
          },
        }),
      ),
    ).toEqual({ kind: "duplicate" });
  });

  it("state ≻ correlate: an ACTIVE instance with a stale ref → not_awaiting_decision", () => {
    expect(
      admitLoaded(
        instance({ wait: null }),
        submitExpectation({
          correlate: { holds: () => false, reject: "decision_request_mismatch" },
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "not_awaiting_decision" });
  });

  it("correlate ≻ version: a stale ref with an absent version → decision_request_mismatch", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_GATE),
        submitExpectation({
          correlate: { holds: () => false, reject: "decision_request_mismatch" },
          expectedVersion: undefined,
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "decision_request_mismatch" });
  });

  it("version ≻ authority: a stale version with an absent claim → stale", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_GATE),
        submitExpectation({
          expectedVersion: 2,
          authority: {
            claim: undefined,
            granted: "human-1",
            missing: "operator_not_authorized",
            mismatch: "operator_not_authorized",
          },
        }),
      ),
    ).toEqual({ kind: "stale", currentVersion: 3 });
  });
});

describe("admitLoaded — the RESUME path's four rungs and pairs (family 2)", () => {
  it("full warrant on a parked bare wait → accepted", () => {
    expect(admitLoaded(instance(PARKED_AT_WAIT), resumeExpectation())).toEqual({
      kind: "accepted",
    });
  });

  // THE ABSENT AUTHORITY RUNG IS DRIVEN POSITIVELY. The resume keyset
  // has no `by` at all, so an ADDED authority rung would red every
  // positive resume lane rather than pass them — this lane is what
  // proves the rung is absent rather than merely unexercised.
  it("carries NO authority claim and SUCCEEDS — the rung is ABSENT, not satisfied", () => {
    const expectation = resumeExpectation();
    expect(expectation.authority).toBeUndefined();
    expect(admitLoaded(instance(PARKED_AT_WAIT), expectation)).toEqual({ kind: "accepted" });
  });

  it("idempotency: a WAIT_RESUMED row under the op id → duplicate", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_WAIT),
        resumeExpectation({
          idempotency: {
            existing: { payloadDigest: null, entryKind: "WAIT_RESUMED" },
            compare: { mode: "kind", kind: "WAIT_RESUMED" },
          },
        }),
      ),
    ).toEqual({ kind: "duplicate" });
  });

  it("idempotency: a DECISION_MADE row under the op id → op_id_collision", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_WAIT),
        resumeExpectation({
          idempotency: {
            existing: { payloadDigest: null, entryKind: "DECISION_MADE" },
            compare: { mode: "kind", kind: "WAIT_RESUMED" },
          },
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("state: an ACTIVE instance → not_waiting", () => {
    expect(admitLoaded(instance(), resumeExpectation())).toEqual({
      kind: "rejected",
      reason: "not_waiting",
    });
  });

  it("correlate: an undeclared event type → resume_event_mismatch", () => {
    expect(
      admitLoaded(
        instance({
          ...PARKED_AT_WAIT,
          wait: { kind: "commit_pending", requestedBy: "commit_wait", resumeEvents: ["OTHER"] },
        }),
        resumeExpectation(),
      ),
    ).toEqual({ kind: "rejected", reason: "resume_event_mismatch" });
  });

  it("version: absent expectedVersion → missing_version", () => {
    expect(
      admitLoaded(instance(PARKED_AT_WAIT), resumeExpectation({ expectedVersion: undefined })),
    ).toEqual({ kind: "rejected", reason: "missing_version" });
  });

  it("version: a mismatch → stale", () => {
    expect(admitLoaded(instance(PARKED_AT_WAIT), resumeExpectation({ expectedVersion: 2 }))).toEqual(
      { kind: "stale", currentVersion: 3 },
    );
  });

  it("idempotency ≻ state: a replay on an ACTIVE instance → duplicate", () => {
    expect(
      admitLoaded(
        instance(),
        resumeExpectation({
          idempotency: {
            existing: { payloadDigest: null, entryKind: "WAIT_RESUMED" },
            compare: { mode: "kind", kind: "WAIT_RESUMED" },
          },
        }),
      ),
    ).toEqual({ kind: "duplicate" });
  });

  it("state ≻ correlate: an ACTIVE instance with an undeclared event → not_waiting", () => {
    expect(
      admitLoaded(
        instance({ wait: null }),
        resumeExpectation({ correlate: { holds: () => false, reject: "resume_event_mismatch" } }),
      ),
    ).toEqual({ kind: "rejected", reason: "not_waiting" });
  });

  it("correlate ≻ version: an undeclared event with an absent version → resume_event_mismatch", () => {
    expect(
      admitLoaded(
        instance(PARKED_AT_WAIT),
        resumeExpectation({
          correlate: { holds: () => false, reject: "resume_event_mismatch" },
          expectedVersion: undefined,
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "resume_event_mismatch" });
  });
});
