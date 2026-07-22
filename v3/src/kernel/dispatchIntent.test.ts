import { describe, expect, it } from "vitest";

import type {
  ContextPacket,
  RuntimeContextRef,
  StepId,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedRuntimeContextProvider } from "../testkit/index.js";
import { deriveDispatchIntent } from "./dispatchIntent.js";

const providerRegistry = createStaticProviderRegistry({});

// ── ch12-p3 T2 compile-negative probes (validated by v3:typecheck via
// TS2578 — the branded RuntimeContextProjection is nominally DISTINCT from the
// unbranded RuntimeContextRef, and the packet field is non-optional). ──
const __rawRef: RuntimeContextRef = { kind: "worktree", locator: "/x" };
// @ts-expect-error T2: a raw RuntimeContextRef is NOT assignable to the branded
// RuntimeContextProjection — `projection-never-the-ref` is compile-enforced.
export const __projectionRejectsRawRef: ContextPacket["runtimeContext"] = __rawRef;
// @ts-expect-error T2: ContextPacket.runtimeContext is NON-OPTIONAL — a packet
// literal omitting `runtimeContext` is rejected.
export const __packetMissingRuntimeContext: ContextPacket = {
  instanceId: "i",
  expectedVersion: 1,
  task: "t",
  role: "r",
  instruction: "build it",
  availableOps: [],
  effectiveAgentConfig: {},
};

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
      providerRegistry,
    );
    // role has no default → {}; step {b} ⊕ override {c}.
    expect(intent.packet.effectiveAgentConfig).toEqual({ b: "step", c: "override" });
  });

  it("empty-cascade lane: effectiveAgentConfig is ALWAYS present — `{}` when nothing is authored (fails the L0b conditional-spread idiom)", () => {
    const intent = deriveDispatchIntent(instance(), template(), "implement", providerRegistry);
    expect(intent.packet.effectiveAgentConfig).toEqual({});
    // The KEY must be present (an L0b conditional spread would OMIT it).
    expect(Object.prototype.hasOwnProperty.call(intent.packet, "effectiveAgentConfig")).toBe(true);
  });

  it("E1: the projection is unconditional even for a step that declares no agentConfig but the run does", () => {
    const intent = deriveDispatchIntent(
      instance({ implement: { only: "override" } }),
      template(),
      "implement",
      providerRegistry,
    );
    expect(intent.packet.effectiveAgentConfig).toEqual({ only: "override" });
  });

  it("E2: the packet carries no legacy `agentConfig` key — it is REPLACED by effectiveAgentConfig", () => {
    const intent = deriveDispatchIntent(
      instance(),
      template({ b: "step" }),
      "implement",
      providerRegistry,
    );
    expect(Object.prototype.hasOwnProperty.call(intent.packet, "agentConfig")).toBe(false);
  });
});

// Packet ch12-p3 (E family): the runtime-context projection leg.
const worktreeSpec = { kind: "worktree", provider: "pairflow.worktree" } as const;

function provisionedTemplate(): WorkflowTemplate {
  return { ...template(), runtimeContext: worktreeSpec };
}

function provisionedInstance(ref: RuntimeContextRef): WorkflowInstance {
  return { ...instance(), runtimeContext: { state: "ready", ref } };
}

describe("deriveDispatchIntent — the runtime-context projection (E family, ch12-p3)", () => {
  it("E1: a context-free run (ready(∅)) sets packet.runtimeContext to the explicit `none`", () => {
    const intent = deriveDispatchIntent(instance(), template(), "implement", providerRegistry);
    expect(intent.packet.runtimeContext).toBe("none");
    // The key is ALWAYS present (never absent).
    expect(Object.prototype.hasOwnProperty.call(intent.packet, "runtimeContext")).toBe(true);
  });

  it("E1: a provisioned run projects through the pinned-template provider — the RAW ref never enters the packet", () => {
    const provider = createScriptedRuntimeContextProvider({
      projection: { workspace: "/w/inst-1", branch: "b" },
    });
    const registry = createStaticProviderRegistry({ "pairflow.worktree": provider });
    const ref: RuntimeContextRef = { kind: "worktree", locator: "/w/inst-1" };
    const intent = deriveDispatchIntent(
      provisionedInstance(ref),
      provisionedTemplate(),
      "implement",
      registry,
    );
    expect(intent.packet.runtimeContext).toEqual({ workspace: "/w/inst-1", branch: "b" });
    // projection-never-the-ref: the raw {kind, locator} is NOT the packet value.
    expect(intent.packet.runtimeContext).not.toEqual(ref);
  });

  it("E2: a vanished provider on the provisioned path is a registry-stable-for-the-run INVARIANT throw", () => {
    const ref: RuntimeContextRef = { kind: "worktree", locator: "/w/inst-1" };
    // The registry no longer resolves `pairflow.worktree` (empty).
    expect(() =>
      deriveDispatchIntent(
        provisionedInstance(ref),
        provisionedTemplate(),
        "implement",
        createStaticProviderRegistry({}),
      ),
    ).toThrow(/registry must stay stable/);
  });
});
