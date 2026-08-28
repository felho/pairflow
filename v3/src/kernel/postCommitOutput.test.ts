import { describe, expect, it } from "vitest";

import type {
  DecisionRequestBody,
  WorkflowInstance,
  WorkflowTemplate,
} from "./../domain/index.js";
import { postCommitOutput } from "./postCommitOutput.js";

/**
 * Dimension 7 — FOUR cells, not three. The two `none` answers reach one
 * value from DIFFERENT CAUSES, so each needs its own lane: a build that
 * returned null for "not ACTIVE" would pass a three-cell suite and
 * silently swallow the Ask.
 */

const TEMPLATE = (): WorkflowTemplate => ({
  ref: { id: "t", version: 1 },
  start: "implement",
  steps: {
    implement: { role: "implementer", instruction: "build it", transitions: { PASS: "gate" } },
    gate: {
      type: "human_gate",
      role: "operator",
      instruction: "approve it?",
      decisions: { approve: { target: "implement" } },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, operator: { defaultActor: "human-1" } },
});

const BASE: WorkflowInstance = {
  instanceId: "i1",
  templateRef: { id: "t", version: 1 },
  task: "ship it",
  binding: { implementer: "codex", operator: "human-1" },
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
};

const REQUEST: DecisionRequestBody = {
  requestRef: "req-1",
  recipient: "operator",
  decisions: ["approve"],
};

const registry = { get: () => undefined } as never;

const out = (instance: WorkflowInstance, request?: DecisionRequestBody) =>
  postCommitOutput(instance, TEMPLATE(), registry, undefined, request);

describe("post_commit_output — the four cells", () => {
  it("TERMINAL ⇒ none", () => {
    expect(
      out({ ...BASE, kernelStatus: "TERMINAL", terminalDisposition: "done", currentStep: "done" }),
    ).toBeNull();
  });

  it("ACTIVE ⇒ a DispatchIntent", () => {
    const result = out(BASE);
    expect(result && "packet" in result).toBe(true);
  });

  it("WAITING(human_decision) ⇒ the ASK", () => {
    const result = out(
      {
        ...BASE,
        kernelStatus: "WAITING",
        currentStep: "gate",
        wait: {
          kind: "human_decision",
          requestedBy: "gate",
          resumeEvents: ["approve"],
          requestRef: "req-1",
        },
      },
      REQUEST,
    );
    expect(result && "requestRef" in result).toBe(true);
    expect(result && "packet" in result).toBe(false);
  });

  it("WAITING(any other kind) ⇒ none — a DIFFERENT cause reaching the same value", () => {
    expect(
      out({
        ...BASE,
        kernelStatus: "WAITING",
        currentStep: "gate",
        wait: { kind: "ci_pending", requestedBy: "hold", resumeEvents: ["CI_DONE"] },
      }),
    ).toBeNull();
  });

  it("WAITING(an UNRECOGNIZED kind) ⇒ none — 'no directive is owed', never 'we do not know'", () => {
    expect(
      out({
        ...BASE,
        kernelStatus: "WAITING",
        currentStep: "gate",
        wait: { kind: "some_future_kind", requestedBy: "x", resumeEvents: [] },
      }),
    ).toBeNull();
  });
});

describe("post_commit_output — what it refuses", () => {
  it("throws if WAITING(human_decision) arrives without its own committed request", () => {
    expect(() =>
      out({
        ...BASE,
        kernelStatus: "WAITING",
        currentStep: "gate",
        wait: {
          kind: "human_decision",
          requestedBy: "gate",
          resumeEvents: ["approve"],
          requestRef: "req-1",
        },
      }),
    ).toThrow(/without the decision request/);
  });

  it("reads the ARRIVAL's wait — a PRE-arrival projection returns no Ask at all", () => {
    // The live post-commit assembly did not set `wait`; a build
    // reproducing it verbatim lands here with the pre-arrival value.
    const staleProjection = { ...BASE, kernelStatus: "WAITING" as const, currentStep: "gate", wait: null };
    expect(out(staleProjection, REQUEST)).toBeNull();
  });
});
