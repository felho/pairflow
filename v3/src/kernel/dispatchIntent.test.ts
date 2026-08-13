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
  // Packet ch13-p1b D16: `contextBlocks` is REQUIRED too since this
  // packet's growth, so it is supplied here on purpose — the directive
  // above witnesses ONE named absence, and a two-property miss would be
  // satisfied by either omission, silently de-discriminating the probe.
  contextBlocks: [],
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

// ───────────────────────────────────────────────────────────────────────
// Packet ch13-p1b — the rendered context blocks on the packet.
// ───────────────────────────────────────────────────────────────────────

/**
 * A directly-constructed ADMITTED-SHAPED template: the produced ref
 * positions are set the way admission produces them (the render reads
 * those and never an authored nested key), so the dispatch suite keeps
 * its direct-construction style without importing `definition/`.
 */
function blockBearingTemplate(
  options: {
    readonly roleRefs?: readonly string[];
    readonly stepRefs?: readonly string[];
    readonly gateRefs?: readonly string[];
    readonly narrowed?: boolean;
    readonly catalogExtras?: Readonly<Record<string, { readonly body: string }>>;
  } = {},
): WorkflowTemplate {
  const roleRefs = options.roleRefs ?? [];
  const stepRefs = options.stepRefs ?? [];
  const gateRefs = options.gateRefs ?? [];
  const issued = [...roleRefs, ...stepRefs, ...gateRefs];
  return {
    ref: { id: "t", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review", HOLD: "review" },
        promptConcernRefs: stepRefs,
        advancesRound: { PASS: false, HOLD: false },
        ...(gateRefs.length > 0
          ? {
              gates: {
                HOLD: [{ uses: "declarative.threshold", config: {}, contextBlockRefs: gateRefs }],
              },
            }
          : {}),
      },
      review: {
        role: "reviewer",
        instruction: "r",
        transitions: { CONVERGED: "done" },
        promptConcernRefs: [],
        advancesRound: { CONVERGED: false },
      },
    },
    terminal: ["done"],
    roles: {
      implementer: { defaultActor: "codex", promptConcernRefs: roleRefs },
      reviewer: { defaultActor: "claude", promptConcernRefs: [] },
    },
    contextBlocks: {
      ...Object.fromEntries([...new Set(issued)].map((id) => [id, { body: `body of ${id}` }])),
      ...(options.catalogExtras ?? {}),
    },
    // Narrows the implementer at `implement` to PASS — the HOLD gate's
    // blocks must fall silent while HOLD stays in availableOps.
    ...(options.narrowed === true
      ? { capabilityProfile: { implementer: { implement: ["PASS"] } } }
      : {}),
  };
}

describe("deriveDispatchIntent — the rendered context blocks (packet ch13-p1b)", () => {
  it("the field is ALWAYS present — an empty list when nothing is issued", () => {
    const intent = deriveDispatchIntent(instance(), template(), "implement", providerRegistry);
    expect(intent.packet.contextBlocks).toEqual([]);
    // The KEY must be present, never omitted for the empty case.
    expect(Object.prototype.hasOwnProperty.call(intent.packet, "contextBlocks")).toBe(true);
  });

  it("the members carry the three declared parts — id, body, and every emitting position", () => {
    const intent = deriveDispatchIntent(
      instance(),
      blockBearingTemplate({ roleRefs: ["role-block"], gateRefs: ["gate-block"] }),
      "implement",
      providerRegistry,
    );
    expect(intent.packet.contextBlocks).toEqual([
      {
        id: "role-block",
        body: "body of role-block",
        provenance: { sources: [{ source: "role_config" }] },
      },
      {
        id: "gate-block",
        body: "body of gate-block",
        provenance: { sources: [{ source: "gate_binding", stepId: "implement", eventType: "HOLD" }] },
      },
    ]);
  });

  it("the WHOLE packet, asserted as one value (the growth-blind assert-by-parts site, re-pinned)", () => {
    // Written from the AUTHORED source above, never pasted from a run:
    // the subject here is ORDER, and a pasted expectation would bake the
    // implementation's own sequence into the assertion.
    const intent = deriveDispatchIntent(
      instance(),
      blockBearingTemplate({ stepRefs: ["step-block"] }),
      "implement",
      providerRegistry,
    );
    expect(intent.packet).toEqual({
      instanceId: "inst-1",
      expectedVersion: 2,
      task: "do it",
      role: "implementer",
      instruction: "build it",
      availableOps: ["PASS", "HOLD"],
      effectiveAgentConfig: {},
      runtimeContext: "none",
      contextBlocks: [
        {
          id: "step-block",
          body: "body of step-block",
          provenance: { sources: [{ source: "step_config" }] },
        },
      ],
    });
  });

  it("AUTHORITY: a narrowing profile silences the gate's blocks while the event STAYS in availableOps", () => {
    // The two fields disagreeing on purpose is the assertion: the packet
    // still advertises HOLD as a navigation affordance (L1 enforces
    // capability in HANDLE), and the render carries none of its blocks.
    const intent = deriveDispatchIntent(
      instance(),
      blockBearingTemplate({ gateRefs: ["hold-block"], narrowed: true }),
      "implement",
      providerRegistry,
    );
    expect(intent.packet.availableOps).toEqual(["PASS", "HOLD"]);
    expect(intent.packet.contextBlocks).toEqual([]);
  });

  it("its DISCRIMINATING positive: without the profile the same gate's blocks travel", () => {
    const intent = deriveDispatchIntent(
      instance(),
      blockBearingTemplate({ gateRefs: ["hold-block"] }),
      "implement",
      providerRegistry,
    );
    expect(intent.packet.contextBlocks.map((block) => block.id)).toEqual(["hold-block"]);
  });

  it("a ghost step id ABORTS at the ENTRY's own read, naming the STEP — not the start invariant", () => {
    // Unguarded, the entry's `template.steps[stepId]` answers a
    // prototype-named id with an INHERITED member: the `undefined` check
    // an inherited value DEFEATS does not fire, and what throws is the
    // later actor guard, on a message blaming the start invariant.
    expect(() =>
      deriveDispatchIntent(instance(), template(), "constructor", providerRegistry),
    ).toThrow(/dispatch target step 'constructor' has no definition/);
  });
});

describe("deriveDispatchIntent — the run-scope channel never feeds the blocks (family 12)", () => {
  it("a run override naming a CATALOG-DECLARED id changes nothing", () => {
    const overriding = instance({ implement: { promptConcernRefs: ["run-scope-only"] } });
    const withRunScope = deriveDispatchIntent(
      overriding,
      blockBearingTemplate({
        stepRefs: ["authored"],
        catalogExtras: { "run-scope-only": { body: "forbidden" } },
      }),
      "implement",
      providerRegistry,
    );
    const withoutRunScope = deriveDispatchIntent(
      instance(),
      blockBearingTemplate({
        stepRefs: ["authored"],
        catalogExtras: { "run-scope-only": { body: "forbidden" } },
      }),
      "implement",
      providerRegistry,
    );
    // The override's list DIFFERS from the authored one, or the member
    // discriminates nothing.
    expect(overriding.runOverrides.implement).toEqual({ promptConcernRefs: ["run-scope-only"] });
    expect(withRunScope.packet.contextBlocks).toEqual(withoutRunScope.packet.contextBlocks);
    expect(withRunScope.packet.contextBlocks.map((block) => block.id)).toEqual(["authored"]);
  });

  it("a run override naming an UNDECLARED id renders identically and does NOT abort", () => {
    // This is what separates a purity violation from a live outage: run-scope
    // values are belted by nothing, so a ghost id read here would kill a
    // dispatch AFTER its transition committed.
    const intent = deriveDispatchIntent(
      instance({ implement: { promptConcernRefs: ["never-declared"] } }),
      blockBearingTemplate({ stepRefs: ["authored"] }),
      "implement",
      providerRegistry,
    );
    expect(intent.packet.contextBlocks.map((block) => block.id)).toEqual(["authored"]);
  });
});
