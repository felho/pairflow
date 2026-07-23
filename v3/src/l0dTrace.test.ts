import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  AdmittedTemplate,
  RuntimeContextRef,
  RuntimeContextSpec,
  WorkflowTemplate,
} from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createKernel } from "./kernel/index.js";
import { createStaticProviderRegistry } from "./ports/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  createScriptedRuntimeContextProvider,
  fixtureDefinitionStore,
} from "./testkit/index.js";

/**
 * The l0d chapter trace as a golden test (packet ch12-p3, TR family): the
 * deferred-kickoff HOLD + cancel run whose requested/READY legs P1b deferred
 * to P3 — create(deferred, NO task) → start(provision, Accepted, requested) →
 * READY(ready(ref), WAITING(kickoff_pending)) → kickoff(ACTIVE, TASK_SUPPLIED)
 * → cancel(TERMINAL(cancelled)). Replayed through the REAL walking skeleton
 * with the scripted provider.
 */
const gateCatalog = createGateRegistry();
const WORKTREE_SPEC: RuntimeContextSpec = { kind: "worktree", provider: "pairflow.worktree" };
const READY_REF: RuntimeContextRef = { kind: "worktree", locator: "/ws/inst-l0d" };

function l0dTemplate(): WorkflowTemplate {
  return {
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
    runtimeContext: WORKTREE_SPEC,
    activation: { mode: "deferred_kickoff" },
  };
}

function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`l0d trace admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

describe("l0d golden trace — the deferred-kickoff provisioned hold + cancel (TR family)", () => {
  it("runs create(deferred) → provision → READY(WAITING) → kickoff → cancel with the scripted provider", async () => {
    const clock = createControlledClock(50_000);
    const handle = openStore(":memory:", clock);
    const admitted = admit(l0dTemplate());
    const provider = createScriptedRuntimeContextProvider();
    const kernel = createKernel({
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: fixtureDefinitionStore(admitted),
      time: clock,
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: noopDiagnosticsSink,
      providerRegistry: createStaticProviderRegistry({ "pairflow.worktree": provider }),
    });
    provider.bindCompletionSink((i, r, completion) => kernel.deliverCompletion(i, r, completion));

    // create (deferred_kickoff, NO task — legal over the mode default) → v1.
    const created = await kernel.create({
      instanceId: "inst-l0d",
      templateRef: admitted.ref,
      mode: "deferred_kickoff",
    });
    expect(created).toEqual({ kind: "created", instanceId: "inst-l0d", version: 1 });

    // start → provision(r1) → requested(r1) + STARTED{op1}, v→2 → Accepted.
    const started = await kernel.start({ instanceId: "inst-l0d", opId: "op1" });
    expect(started).toEqual({ kind: "accepted" });
    const requestId = provider.provisionCalls[0]?.requestId ?? "";
    expect(await handle.store.loadInstance("inst-l0d")).toMatchObject({
      kernelStatus: "CREATED",
      runtimeContext: { state: "requested", requestId },
      version: 2,
    });

    // runtime_context_ready(r1, ref) → ready(ref); activate_or_hold(deferred):
    // WAITING(kickoff_pending), v→3 → Accepted.
    const ready = await kernel.runtimeContextReady("inst-l0d", requestId, READY_REF);
    expect(ready).toEqual({ kind: "accepted" });
    expect(await handle.store.loadInstance("inst-l0d")).toMatchObject({
      kernelStatus: "WAITING",
      wait: { kind: "kickoff_pending", requestedBy: "activation", resumeEvents: ["KICKOFF"] },
      runtimeContext: { state: "ready", ref: READY_REF },
      task: null,
      version: 3,
    });

    // kickoff(task): admit (WAITING ∧ kickoff_pending) → task set, wait NULL,
    // activate: ACTIVE, round 1, TASK_SUPPLIED{op2}, v→4 → Activated.
    const kicked = await kernel.kickoff({
      instanceId: "inst-l0d",
      opId: "op2",
      task: "ship the deferred run",
    });
    expect(kicked.kind).toBe("activated");
    expect(await handle.store.loadInstance("inst-l0d")).toMatchObject({
      kernelStatus: "ACTIVE",
      currentStep: "implement",
      round: 1,
      task: "ship the deferred run",
      runtimeContext: { state: "ready", ref: READY_REF },
      version: 4,
    });

    // cancel: admit (≠ TERMINAL) → TERMINAL, cancelled, CANCELLED{op3}, v→5.
    const cancelled = await kernel.cancel({ instanceId: "inst-l0d", opId: "op3" });
    expect(cancelled).toEqual({ kind: "terminated", disposition: "cancelled" });
    const detail = await handle.store.getInstanceDetail("inst-l0d");
    if (detail === null) throw new Error("l0d trace: detail vanished");
    expect(detail.instance).toMatchObject({
      kernelStatus: "TERMINAL",
      terminalDisposition: "cancelled",
      runtimeContext: { state: "ready", ref: READY_REF },
      version: 5,
    });
    // The op_id facts (READY adds no fact row): STARTED, TASK_SUPPLIED, CANCELLED.
    expect(detail.transcript).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op1", committedAt: 50_000 },
      { entryKind: "TASK_SUPPLIED", seq: 2, opId: "op2", committedAt: 50_000 },
      { entryKind: "CANCELLED", seq: 3, opId: "op3", committedAt: 50_000 },
    ]);
    // NOTE: runAllCheckers is not run here — its version-arithmetic checker
    // assumes one transcript row per version bump, which the rowless READY
    // commit (ready(ref) + WAITING, no fact) breaks; the version arithmetic is
    // asserted directly above (v1→v2→v3→v4→v5).

    handle.close();
  });
});
