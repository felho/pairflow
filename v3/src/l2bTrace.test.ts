import { createStaticProviderRegistry } from "./ports/index.js";
import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  Activated,
  AdmittedTemplate,
  ContextBlock,
  EventEnvelope,
  Outcome,
  TransitionEntry,
  WorkflowTemplate,
} from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createKernel, deriveDispatchIntent } from "./kernel/index.js";
import { openStore } from "./store/index.js";
import type { DispatchIntent, HumanDecisionRequest } from "./domain/index.js";

/**
 * K6 (packet ch14-p2a): `committed.intent` widened to
 * `DispatchIntent | HumanDecisionRequest | null`. This narrows on a
 * DISCRIMINATING key — `packet`, which only a dispatch carries — never
 * on truthiness and never by a bare type assertion.
 */
const asDispatch = (intent: DispatchIntent | HumanDecisionRequest | null | undefined) =>
  intent !== null && intent !== undefined && "packet" in intent ? intent : null;

import {
  createControlledClock,
  createScriptedProcessGateRunner,
  fixtureDefinitionStore,
} from "./testkit/index.js";

/**
 * The l2b chapter trace as a golden test (packet ch13-p1b, D13): the
 * context-block render replayed through the REAL walking skeleton
 * (create → start → HANDLE), carrying the THREE legs plan §13.2 ratifies
 * for this section.
 *
 * The section has no prior trace in the tree, so its home is minted here.
 * It follows the SIBLING section traces' shape — a direct-constructed
 * template through admission, a scripted run — and adopts WHOLE-VALUE
 * assertions as THIS trace's own discipline rather than as theirs: the
 * siblings are mixed, several asserting their dispatched packet by
 * containment, which is precisely the blindness that discipline exists to
 * close.
 *
 * This is where the ORDER rule, the BODY rule and the AUTHORITY rule meet
 * on ONE document — the thing no per-rule lane can prove.
 */
const gateCatalog = createGateRegistry();

function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`l2b trace fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

/**
 * ONE document exercising all THREE source positions, with an id issued
 * from two of them (`shared`) so the dedup and its retained provenance
 * are visible in the same rendered list. The reviewer's step is gated on
 * CONVERGED and NARROWED by a capability profile, which is what makes
 * the authority legs observable on this one template.
 */
function l2bTemplate(narrowed: boolean): WorkflowTemplate {
  return {
    ref: { id: "l2b-pair", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review" },
        agentConfig: { promptConcernRefs: ["shared", "step-only"] },
      },
      review: {
        role: "reviewer",
        instruction: "review it",
        transitions: { PASS: "implement", CONVERGED: "done" },
        gates: {
          CONVERGED: [
            { uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 1 }, contextBlockRefs: ["gate-only"] },
          ],
        },
      },
    },
    terminal: ["done"],
    roles: {
      implementer: {
        defaultActor: "codex",
        defaultAgentConfig: { promptConcernRefs: ["shared", "role-only"] },
      },
      reviewer: {
        defaultActor: "claude",
        defaultAgentConfig: { promptConcernRefs: ["reviewer-role-block"] },
      },
    },
    round: { advanceOnArrivalAt: ["implement"] },
    contextBlocks: {
      shared: { body: "issued from BOTH the role default and the step" },
      "role-only": { body: "issued from the role default only" },
      "step-only": { body: "issued from the step only" },
      "gate-only": { body: "issued from the CONVERGED gate binding only" },
      "reviewer-role-block": { body: "the reviewer's own role default" },
    },
    // The reviewer may PASS but not CONVERGE — so the CONVERGED gate's
    // block must fall silent for an actor who could not emit it.
    ...(narrowed ? { capabilityProfile: { reviewer: { review: ["PASS"] } } } : {}),
  };
}

/**
 * LEG 1's named list — ids in RENDER order (role refs, then step refs,
 * then gate refs; authored order inside each), bodies from the catalog,
 * and `shared` carrying BOTH emitters in encounter order.
 */
const IMPLEMENT_BLOCKS: readonly ContextBlock[] = [
  {
    id: "shared",
    body: "issued from BOTH the role default and the step",
    provenance: { sources: [{ source: "role_config" }, { source: "step_config" }] },
  },
  {
    id: "role-only",
    body: "issued from the role default only",
    provenance: { sources: [{ source: "role_config" }] },
  },
  {
    id: "step-only",
    body: "issued from the step only",
    provenance: { sources: [{ source: "step_config" }] },
  },
];

/** LEG 2: the reviewer CAN emit CONVERGED, so that gate's block renders. */
const REVIEW_BLOCKS_AUTHORIZED: readonly ContextBlock[] = [
  {
    id: "reviewer-role-block",
    body: "the reviewer's own role default",
    provenance: { sources: [{ source: "role_config" }] },
  },
  {
    id: "gate-only",
    body: "issued from the CONVERGED gate binding only",
    provenance: { sources: [{ source: "gate_binding", stepId: "review", eventType: "CONVERGED" }] },
  },
];

/** LEG 3: narrowed below CONVERGED — the SAME document renders without it. */
const REVIEW_BLOCKS_NARROWED: readonly ContextBlock[] = [
  {
    id: "reviewer-role-block",
    body: "the reviewer's own role default",
    provenance: { sources: [{ source: "role_config" }] },
  },
];

function envelope(
  opId: string,
  type: string,
  expectedVersion: number,
  actorId: string,
  expectedRole: string,
  payload?: unknown,
): EventEnvelope {
  return {
    instanceId: "inst-1",
    opId,
    type,
    actorId,
    expectedVersion,
    expectedRole,
    ...(payload !== undefined ? { payload } : {}),
  };
}

function makeKernel(admitted: AdmittedTemplate): {
  kernel: ReturnType<typeof createKernel>;
  store: ReturnType<typeof openStore>["store"];
  close: () => void;
} {
  const handle = openStore(":memory:", createControlledClock(1_000));
  const kernel = createKernel({
    providerRegistry: createStaticProviderRegistry({}),
    processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: fixtureDefinitionStore(admitted),
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
  });
  return { kernel, store: handle.store, close: () => { handle.close(); } };
}

describe("l2b golden trace — the context-block render end-to-end (packet ch13-p1b, D13)", () => {
  it("LEG 1 + LEG 2: the rendered lists at both dispatches, whole, with the committed rows beside them", async () => {
    const admitted = admit(l2bTemplate(false));
    const { kernel, store, close } = makeKernel(admitted);
    try {
      const created = await kernel.create({
        instanceId: "inst-1",
        templateRef: admitted.ref,
        task: "t",
        mode: "immediate",
      });
      expect(created.kind).toBe("created");

      // LEG 1 — the activation dispatch at `implement`: all three source
      // positions, the repeated id deduped to ONE member, provenance in
      // encounter order.
      const activated = (await kernel.start({
        instanceId: "inst-1",
        opId: "op-start",
      })) as Activated;
      expect(activated.kind).toBe("activated");
      expect(activated.version).toBe(2);
      expect(activated.intent.packet.contextBlocks).toEqual(IMPLEMENT_BLOCKS);

      // LEG 2 — commit implement→review; the reviewer CAN emit CONVERGED,
      // so that gate's block travels on the dispatch into `review`.
      const pass = (await kernel.handle(
        envelope("a1", "PASS", 2, "codex", "implementer", { note: "impl" }),
      )) as Extract<Outcome, { kind: "committed" }>;
      expect(pass.kind).toBe("committed");
      expect(pass.version).toBe(3);
      expect(asDispatch(pass.intent)?.packet.contextBlocks).toEqual(REVIEW_BLOCKS_AUTHORIZED);

      // The committed rows the run produces, asserted beside the render.
      const converged = (await kernel.handle(
        envelope("b2", "CONVERGED", 3, "claude", "reviewer", { note: "rev" }),
      )) as Extract<Outcome, { kind: "committed" }>;
      expect(converged.kind).toBe("committed");
      expect(converged.version).toBe(4);
      expect(converged.intent).toBeNull();

      const detail = await store.getInstanceDetail("inst-1");
      if (detail === null) {
        throw new Error("instance vanished");
      }
      const transitions = detail.transcript.filter(
        (e): e is TransitionEntry => e.entryKind === "transition",
      );
      expect(transitions.map((t) => t.envelope.type)).toEqual(["PASS", "CONVERGED"]);
      expect(detail.instance.kernelStatus).toBe("TERMINAL");
      expect(detail.instance.currentStep).toBe("done");
      // The catalog reaches NO committed row beyond the config positions
      // the refs always rode: the gate-sourced ref appears in no column.
      expect(transitions.map((t) => t.issuedAgentConfig)).toEqual([
        { promptConcernRefs: ["shared", "step-only"] },
        { promptConcernRefs: ["reviewer-role-block"] },
      ]);
    } finally {
      close();
    }
  });

  it("LEG 3: the SAME document, narrowed — a gate the actor could NOT emit contributes nothing", async () => {
    const admitted = admit(l2bTemplate(true));
    const { kernel, close } = makeKernel(admitted);
    try {
      await kernel.create({
        instanceId: "inst-1",
        templateRef: admitted.ref,
        task: "t",
        mode: "immediate",
      });
      await kernel.start({ instanceId: "inst-1", opId: "op-start" });
      const pass = (await kernel.handle(
        envelope("a1", "PASS", 2, "codex", "implementer", { note: "impl" }),
      )) as Extract<Outcome, { kind: "committed" }>;
      expect(pass.kind).toBe("committed");
      // The WHOLE rendered document changes with authority — which is
      // what this leg proves, while the per-rule authority family proves
      // the predicate itself on its own documents.
      expect(asDispatch(pass.intent)?.packet.contextBlocks).toEqual(REVIEW_BLOCKS_NARROWED);
      // The silenced event is STILL a navigation affordance on the packet:
      // the two fields disagreeing on purpose is the point.
      expect(asDispatch(pass.intent)?.packet.availableOps).toEqual(["PASS", "CONVERGED"]);
    } finally {
      close();
    }
  });

  it("DETERMINISM: the same committed state and admitted template reproduce the list byte for byte", async () => {
    const admitted = admit(l2bTemplate(false));
    const { kernel, store, close } = makeKernel(admitted);
    try {
      await kernel.create({
        instanceId: "inst-1",
        templateRef: admitted.ref,
        task: "t",
        mode: "immediate",
      });
      const activated = (await kernel.start({
        instanceId: "inst-1",
        opId: "op-start",
      })) as Activated;
      const detail = await store.getInstanceDetail("inst-1");
      if (detail === null) {
        throw new Error("instance vanished");
      }
      const rederived = deriveDispatchIntent(
        detail.instance,
        admitted,
        "implement",
        createStaticProviderRegistry({}),
      );
      expect(rederived.packet.contextBlocks).toEqual(activated.intent.packet.contextBlocks);
    } finally {
      close();
    }
  });
});
