import { describe, expect, it } from "vitest";

import type { WorkflowInstance } from "../domain/index.js";
import { admitLoaded } from "./admission.js";
import type { AdmitExpect } from "./admission.js";

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
    status: "RUNNING",
    version: 3,
    ...over,
  };
}

function expectation(over: Partial<AdmitExpect> = {}): AdmitExpect {
  return {
    existingOp: null,
    payloadDigest: "dg-1",
    expectedVersion: 3,
    expectedRole: "implementer",
    grantedRole: "implementer",
    ...over,
  };
}

describe("admitLoaded — rung outcomes", () => {
  it("full warrant on a RUNNING instance → accepted", () => {
    expect(admitLoaded(instance(), expectation())).toEqual({ kind: "accepted" });
  });

  it("committed op_id + same digest → duplicate", () => {
    expect(
      admitLoaded(instance(), expectation({ existingOp: { payloadDigest: "dg-1" } })),
    ).toEqual({ kind: "duplicate" });
  });

  it("committed op_id + different digest → op_id_collision", () => {
    expect(
      admitLoaded(instance(), expectation({ existingOp: { payloadDigest: "dg-OTHER" } })),
    ).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("CREATED instance → not_active (the state rung, live at L1)", () => {
    expect(admitLoaded(instance({ status: "CREATED" }), expectation())).toEqual({
      kind: "rejected",
      reason: "not_active",
    });
  });

  it("DONE instance → not_active", () => {
    expect(
      admitLoaded(
        instance({ status: "DONE", currentStep: "done" }),
        expectation({ grantedRole: undefined }),
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
    expect(admitLoaded(instance(), expectation({ expectedRole: undefined }))).toEqual({
      kind: "rejected",
      reason: "missing_role",
    });
  });

  it("wrong role claim → role_not_authorized (authority match)", () => {
    expect(admitLoaded(instance(), expectation({ expectedRole: "reviewer" }))).toEqual({
      kind: "rejected",
      reason: "role_not_authorized",
    });
  });
});

describe("admitLoaded — the ladder-internal ordering combinations (dimension 1, #1–#7)", () => {
  it("#1 duplicate op_id on a DONE instance → duplicate (idempotency precedes state)", () => {
    expect(
      admitLoaded(
        instance({ status: "DONE", currentStep: "done" }),
        expectation({ existingOp: { payloadDigest: "dg-1" }, grantedRole: undefined }),
      ),
    ).toEqual({ kind: "duplicate" });
  });

  it("#2 collision digest on a DONE instance → op_id_collision (idempotency precedes state)", () => {
    expect(
      admitLoaded(
        instance({ status: "DONE", currentStep: "done" }),
        expectation({ existingOp: { payloadDigest: "dg-OTHER" }, grantedRole: undefined }),
      ),
    ).toEqual({ kind: "rejected", reason: "op_id_collision" });
  });

  it("#3 DONE + missing version → not_active (state precedes the version entry guard)", () => {
    expect(
      admitLoaded(
        instance({ status: "DONE", currentStep: "done" }),
        expectation({ expectedVersion: undefined, grantedRole: undefined }),
      ),
    ).toEqual({ kind: "rejected", reason: "not_active" });
  });

  it("#4 DONE + wrong role → not_active (state precedes authority)", () => {
    expect(
      admitLoaded(
        instance({ status: "DONE", currentStep: "done" }),
        expectation({ expectedRole: "reviewer", grantedRole: undefined }),
      ),
    ).toEqual({ kind: "rejected", reason: "not_active" });
  });

  it("#5 stale version + wrong role → stale (staleness precedes authority)", () => {
    expect(
      admitLoaded(instance(), expectation({ expectedVersion: 2, expectedRole: "reviewer" })),
    ).toEqual({ kind: "stale", currentVersion: 3 });
  });

  it("#6 missing version + missing role → missing_version (the entry guard precedes authority)", () => {
    expect(
      admitLoaded(
        instance(),
        expectation({ expectedVersion: undefined, expectedRole: undefined }),
      ),
    ).toEqual({ kind: "rejected", reason: "missing_version" });
  });

  it("#7 stale version + missing role → stale (staleness precedes authority presence)", () => {
    expect(
      admitLoaded(instance(), expectation({ expectedVersion: 2, expectedRole: undefined })),
    ).toEqual({ kind: "stale", currentVersion: 3 });
  });
});

describe("admitLoaded — structural surface (packet A13)", () => {
  it("takes exactly (instance, expect) — the correlate rung's parameter is omitted entirely", () => {
    expect(admitLoaded.length).toBe(2);
  });
});
