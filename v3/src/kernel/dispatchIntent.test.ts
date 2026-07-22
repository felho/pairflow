import { describe, expect, it } from "vitest";

import type { StepId, WorkflowInstance, WorkflowTemplate } from "../domain/index.js";
import { deriveDispatchIntent } from "./dispatchIntent.js";

// Packet ch12-p2 (E family): the dispatch projection — the resolved run
// profile lands on the packet's `effectiveAgentConfig`, UNCONDITIONALLY,
// replacing the L0b conditional raw `agentConfig` spread.

function template(stepAgentConfig?: Readonly<Record<string, unknown>>): WorkflowTemplate {
  return {
    ref: { id: "t", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review" },
        ...(stepAgentConfig !== undefined ? { agentConfig: stepAgentConfig } : {}),
      },
      review: { role: "reviewer", instruction: "r", transitions: { CONVERGED: "done" } },
    },
    terminal: ["done"],
    roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
  };
}

function instance(
  runOverrides: Readonly<Record<StepId, Readonly<Record<string, unknown>>>> = {},
): WorkflowInstance {
  return {
    instanceId: "inst-1",
    templateRef: { id: "t", version: 1 },
    task: "do it",
    binding: { implementer: "codex", reviewer: "claude" },
    currentStep: "implement",
    round: 1,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    activationMode: "immediate",
    wait: null,
    runtimeContext: { state: "ready", ref: null },
    failureReason: null,
    runOverrides,
    version: 2,
  };
}

describe("deriveDispatchIntent — the run-profile projection (E family)", () => {
  it("E1: sets effectiveAgentConfig to the resolved cascade (role ⊕ step ⊕ override)", () => {
    const intent = deriveDispatchIntent(
      instance({ implement: { c: "override" } }),
      template({ b: "step" }),
      "implement",
    );
    // role has no default → {}; step {b} ⊕ override {c}.
    expect(intent.packet.effectiveAgentConfig).toEqual({ b: "step", c: "override" });
  });

  it("empty-cascade lane: effectiveAgentConfig is ALWAYS present — `{}` when nothing is authored (fails the L0b conditional-spread idiom)", () => {
    const intent = deriveDispatchIntent(instance(), template(), "implement");
    expect(intent.packet.effectiveAgentConfig).toEqual({});
    // The KEY must be present (an L0b conditional spread would OMIT it).
    expect(Object.prototype.hasOwnProperty.call(intent.packet, "effectiveAgentConfig")).toBe(true);
  });

  it("E1: the projection is unconditional even for a step that declares no agentConfig but the run does", () => {
    const intent = deriveDispatchIntent(
      instance({ implement: { only: "override" } }),
      template(),
      "implement",
    );
    expect(intent.packet.effectiveAgentConfig).toEqual({ only: "override" });
  });

  it("E2: the packet carries no legacy `agentConfig` key — it is REPLACED by effectiveAgentConfig", () => {
    const intent = deriveDispatchIntent(instance(), template({ b: "step" }), "implement");
    expect(Object.prototype.hasOwnProperty.call(intent.packet, "agentConfig")).toBe(false);
  });
});
