import { createStaticProviderRegistry } from "./ports/index.js";
import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  Activated,
  AdmittedTemplate,
  EventEnvelope,
  Outcome,
  TransitionEntry,
  WorkflowTemplate,
} from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createKernel } from "./kernel/index.js";
import { openStore } from "./store/index.js";
import { createControlledClock, createScriptedProcessGateRunner, fixtureDefinitionStore } from "./testkit/index.js";

/**
 * The l0c chapter trace as a golden test (packet ch12-p2, TR family): a
 * two-role/two-step run whose per-dispatch `effectiveAgentConfig` and
 * per-commit `issuedAgentConfig` reproduce the l0c section's worked
 * cascade VALUES, replayed through the REAL walking skeleton
 * (create → start → HANDLE × 2). The C4 byte-identity — the dispatch
 * value equals the committed provenance for the SAME step — is asserted
 * directly (deterministic provenance).
 *
 * The template exhibits both cascade layers: role defaults
 * (`implementer`/`reviewer`) and step overrides (`implement`/`review`).
 * The trace variants add the third layer (create `runOverrides`) and the
 * no-override case (a step whose effective config IS the role default).
 */
const gateCatalog = createGateRegistry();

function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`test fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

function l0cTemplate(): WorkflowTemplate {
  return {
    ref: { id: "l0c-pair", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review" },
        agentConfig: { approach: "systematic" },
      },
      review: {
        role: "reviewer",
        instruction: "review it",
        transitions: { PASS: "implement", CONVERGED: "done" },
        agentConfig: {
          approach: "thorough",
          prompt_concern_refs: ["reviewer-severity-ontology"],
          skill_refs: ["test-runner"],
        },
      },
    },
    terminal: ["done"],
    roles: {
      implementer: {
        defaultActor: "codex",
        defaultAgentConfig: {
          mode: "builder",
          model_ref: "codex-default-engineer",
          prompt_profile_refs: ["engineer-defaults"],
        },
      },
      reviewer: { defaultActor: "claude", defaultAgentConfig: { mode: "critic" } },
    },
    round: { advanceOnArrivalAt: ["implement"] },
  };
}

// The worked cascade VALUES the trace must reproduce (§03-l0c).
const RESOLVE_IMPLEMENT = {
  mode: "builder",
  model_ref: "codex-default-engineer",
  prompt_profile_refs: ["engineer-defaults"],
  approach: "systematic",
};
const RESOLVE_REVIEW = {
  mode: "critic",
  approach: "thorough",
  prompt_concern_refs: ["reviewer-severity-ontology"],
  skill_refs: ["test-runner"],
};

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

function makeKernel(admitted: AdmittedTemplate): ReturnType<typeof createKernel> & { close: () => void } {
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
  return Object.assign(kernel, { store: handle.store, close: () => handle.close() });
}

describe("l0c golden trace — the run profile end-to-end (C family + TR)", () => {
  it("reproduces the two-step cascade: effective at dispatch, issued at commit, byte-identical per step", async () => {
    const admitted = admit(l0cTemplate());
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

    // create (immediate, context-free) → start → activation: v2, implement.
    const created = await kernel.create({
      instanceId: "inst-1",
      templateRef: admitted.ref,
      task: "t",
      mode: "immediate",
    });
    expect(created.kind).toBe("created");
    const activated = (await kernel.start({ instanceId: "inst-1", opId: "op-start" })) as Activated;
    expect(activated.kind).toBe("activated");
    expect(activated.version).toBe(2);

    // dispatch(implement): the packet's effectiveAgentConfig = resolve(implement).
    expect(activated.intent.packet.effectiveAgentConfig).toEqual(RESOLVE_IMPLEMENT);
    const dispatchImplement = activated.intent.packet.effectiveAgentConfig;

    // emit PASS at v2 → commit implement→review (v3).
    const pass = (await kernel.handle(
      envelope("a1", "PASS", 2, "codex", "implementer", { note: "impl" }),
    )) as Extract<Outcome, { kind: "committed" }>;
    expect(pass.kind).toBe("committed");
    expect(pass.version).toBe(3);
    // dispatch(review): effectiveAgentConfig = resolve(review).
    expect(pass.intent?.packet.effectiveAgentConfig).toEqual(RESOLVE_REVIEW);
    const dispatchReview = pass.intent?.packet.effectiveAgentConfig;

    // emit CONVERGED at v3 → commit review→done (v4, terminal — no intent).
    const converged = (await kernel.handle(
      envelope("b2", "CONVERGED", 3, "claude", "reviewer", { note: "rev" }),
    )) as Extract<Outcome, { kind: "committed" }>;
    expect(converged.kind).toBe("committed");
    expect(converged.version).toBe(4);
    expect(converged.intent).toBeNull();

    // ── The committed transcript's provenance (C2/C3/C4) ──
    const detail = await handle.store.getInstanceDetail("inst-1");
    if (detail === null) throw new Error("instance vanished");
    const transitions = detail.transcript.filter(
      (e): e is TransitionEntry => e.entryKind === "transition",
    );
    // Two transitions (implement→review, review→done); the seq-1 STARTED
    // fact is not a transition and carries NO issuedAgentConfig (C3).
    expect(transitions).toHaveLength(2);
    const facts = detail.transcript.filter((e) => e.entryKind !== "transition");
    expect(facts.length).toBeGreaterThanOrEqual(1);
    for (const fact of facts) {
      expect(fact).not.toHaveProperty("issuedAgentConfig");
    }

    // C2: each transition records the run profile it ISSUED.
    expect(transitions[0]?.issuedAgentConfig).toEqual(RESOLVE_IMPLEMENT);
    expect(transitions[1]?.issuedAgentConfig).toEqual(RESOLVE_REVIEW);

    // C4: the commit value equals the dispatch value per step —
    // deterministic provenance (same pure resolver, same immutable
    // sources). Asserted over the WHOLE map (R-LANE-SENSITIVITY: a
    // projected-field equality that would pass full-map divergence is
    // insufficient). The dispatch that ENTERED a step pairs with the
    // commit that LEAVES it. (The stored bytes' canonical-JSON key
    // ORDERING is the store's C2 concern — sqliteStore.test.ts.)
    expect(transitions[0]?.issuedAgentConfig).toEqual(dispatchImplement);
    expect(transitions[1]?.issuedAgentConfig).toEqual(dispatchReview);

    handle.close();
  });

  it("a create-supplied runOverrides layer wins at top-level-key grain (the third cascade layer)", async () => {
    const admitted = admit(l0cTemplate());
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

    await kernel.create({
      instanceId: "inst-1",
      templateRef: admitted.ref,
      task: "t",
      mode: "immediate",
      // Override the implement step's `approach` and add `extra`; `mode`,
      // `model_ref`, `prompt_profile_refs` survive from the role default.
      runOverrides: { implement: { approach: "override-approach", extra: "x" } },
    });
    const activated = (await kernel.start({ instanceId: "inst-1", opId: "op-start" })) as Activated;

    // The override wins on `approach` (present in all three layers) and
    // adds `extra`; every other key survives from the lower layers.
    expect(activated.intent.packet.effectiveAgentConfig).toEqual({
      mode: "builder",
      model_ref: "codex-default-engineer",
      prompt_profile_refs: ["engineer-defaults"],
      approach: "override-approach",
      extra: "x",
    });

    // And the commit records exactly that (byte-identical provenance).
    const pass = (await kernel.handle(
      envelope("a1", "PASS", 2, "codex", "implementer", { note: "impl" }),
    )) as Extract<Outcome, { kind: "committed" }>;
    const detail = await handle.store.getInstanceDetail("inst-1");
    const firstTransition = detail?.transcript.find(
      (e): e is TransitionEntry => e.entryKind === "transition",
    );
    expect(firstTransition?.issuedAgentConfig).toEqual(
      activated.intent.packet.effectiveAgentConfig,
    );
    expect(pass.version).toBe(3);
    handle.close();
  });

  it("a step with no override resolves to the role default verbatim (empty step-config layer)", async () => {
    // review authors an agentConfig, but drop it to exercise the
    // role-default-only case: a NO-agentConfig step whose effective config
    // is exactly the role default.
    const base = l0cTemplate();
    const template: WorkflowTemplate = {
      ...base,
      steps: {
        ...base.steps,
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          // no agentConfig here
        },
      },
    };
    const admitted = admit(template);
    const kernel = makeKernel(admitted);
    await kernel.create({ instanceId: "inst-1", templateRef: admitted.ref, task: "t", mode: "immediate" });
    const activated = (await kernel.start({ instanceId: "inst-1", opId: "op-start" })) as Activated;
    // effective = the implementer role default VERBATIM (no step override).
    expect(activated.intent.packet.effectiveAgentConfig).toEqual({
      mode: "builder",
      model_ref: "codex-default-engineer",
      prompt_profile_refs: ["engineer-defaults"],
    });
    kernel.close();
  });
});
