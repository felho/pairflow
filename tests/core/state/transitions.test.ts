import { describe, expect, it } from "vitest";

import {
  assertTransitionAllowed,
  canTransition,
  getAllowedTransitions,
  isFinalState
} from "../../../src/core/state/transitions.js";

describe("state transitions", () => {
  it("accepts spec-defined direct transitions", () => {
    expect(canTransition("CREATED", "PREPARING_WORKSPACE")).toBe(true);
    expect(canTransition("PREPARING_WORKSPACE", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "WAITING_HUMAN")).toBe(true);
    expect(canTransition("RUNNING", "READY_FOR_APPROVAL")).toBe(true);
    expect(canTransition("WAITING_HUMAN", "RUNNING")).toBe(true);
    expect(canTransition("READY_FOR_APPROVAL", "RUNNING")).toBe(true);
    expect(canTransition("READY_FOR_APPROVAL", "APPROVED_FOR_COMMIT")).toBe(true);
    expect(canTransition("APPROVED_FOR_COMMIT", "COMMITTED")).toBe(true);
    expect(canTransition("COMMITTED", "DONE")).toBe(true);
  });

  it("rejects invalid direct transitions", () => {
    expect(canTransition("CREATED", "RUNNING")).toBe(false);
    expect(canTransition("WAITING_HUMAN", "READY_FOR_APPROVAL")).toBe(false);
    expect(canTransition("DONE", "RUNNING")).toBe(false);
    expect(canTransition("RUNNING", "RUNNING")).toBe(false);
    expect(canTransition("DONE", "DONE")).toBe(false);
  });

  it("allows FAILED from active states and CANCELLED from non-final states", () => {
    expect(canTransition("RUNNING", "FAILED")).toBe(true);
    expect(canTransition("READY_FOR_APPROVAL", "FAILED")).toBe(true);
    expect(canTransition("CREATED", "CANCELLED")).toBe(true);
    expect(canTransition("WAITING_HUMAN", "CANCELLED")).toBe(true);
    expect(canTransition("DONE", "CANCELLED")).toBe(false);
    expect(canTransition("FAILED", "CANCELLED")).toBe(false);
  });

  it("exposes allowed transitions for a state", () => {
    const allowed = getAllowedTransitions("RUNNING");
    expect(allowed).toContain("WAITING_HUMAN");
    expect(allowed).toContain("READY_FOR_APPROVAL");
    expect(allowed).toContain("FAILED");
    expect(allowed).toContain("CANCELLED");
  });

  it("throws with assertTransitionAllowed when transition is invalid", () => {
    expect(() => assertTransitionAllowed("CREATED", "RUNNING")).toThrow(
      /Invalid state transition/u
    );
  });

  it("detects final states correctly", () => {
    expect(isFinalState("DONE")).toBe(true);
    expect(isFinalState("FAILED")).toBe(true);
    expect(isFinalState("CANCELLED")).toBe(true);
    expect(isFinalState("RUNNING")).toBe(false);
  });
});
