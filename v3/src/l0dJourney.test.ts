import { createStaticProviderRegistry } from "./ports/index.js";
import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import type { ProcessGateRunner } from "./ports/gate.js";
import { openStore } from "./store/sqliteStore.js";
import {
  createControlledClock,
  createRecordingDiagnosticsSink,
  fixtureDefinitionStore,
  fixtureTemplate,
  runAllCheckers,
} from "./testkit/index.js";

/**
 * J1 (packet ch12-p1b): the context-free deferred-hold JOURNEY — the
 * C25 acceptance vehicle, ingress-driven over PRODUCTION bindings
 * (real SQLite store, real ingress, real kernel, deterministic):
 * create(deferred, no task) → genesis floor-read → start → the
 * WAITING hold + ready(∅) + the STARTED fact → a not_active actor
 * probe → a replayed start → Duplicate → kickoff → ACTIVE + round 1 +
 * TASK_SUPPLIED → cancel → TERMINAL(cancelled) + CANCELLED + the
 * checkers green. Every leg asserts outcome, floor state, and
 * timeline rows.
 */
describe("the context-free deferred-hold journey (J1)", () => {
  it("runs the full hold/kickoff/cancel machinery with no provider leg", async () => {
    const clock = createControlledClock(50_000);
    const handle = openStore(":memory:", clock);
    const gates = createGateRegistry();
    const admitted = admitTemplate(fixtureTemplate(), gates);
    if (!admitted.ok) {
      throw new Error("journey wiring: fixture template failed admission");
    }
    const diag = createRecordingDiagnosticsSink();
    const processRunner: ProcessGateRunner = {
      run: () => Promise.reject(new Error("no process gates on this journey")),
    };
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      store: handle.store,
      definitions: fixtureDefinitionStore(admitted.template),
      time: clock,
      digest: deriveEmitDigest,
      diag: diag.sink,
      gates,
      processRunner,
    });
    const ingress = createIngress({ kernel, diag: diag.sink });

    // Leg 1 — create (mode deferredKickoff, NO task): Created + genesis.
    const created = await ingress.submitIntent({
      intent: "create",
      instanceId: "j1",
      templateRef: { id: "local-pair-v0", version: 1 },
      mode: "deferredKickoff",
    });
    expect(created).toEqual({ kind: "created", instanceId: "j1", version: 1 });
    const genesis = await handle.store.loadInstance("j1");
    // FULL instance equality (arm gate 2 aftermath, fold 8): the complete
    // WorkflowInstance literal — a stray/dropped field is red, not silently
    // tolerated by a shape match.
    expect(genesis).toEqual({
      instanceId: "j1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: null,
      // ch14-p3b: `create` seeds the binding from EVERY role's
      // `defaultActor`, so the shipped template's third role widens this
      // closed literal. Re-pinned to the new closed set, not relaxed.
      binding: { implementer: "codex", reviewer: "claude", operator: "human" },
      currentStep: null,
      round: 0,
      kernelStatus: "CREATED",
      terminalDisposition: null,
      activationMode: "deferred_kickoff",
      wait: null,
      runtimeContext: { state: "none" },
      failureReason: null,
      runOverrides: {},
      version: 1,
    });

    // Leg 2 — start: Accepted + WAITING(kickoff_pending) + ready(∅) +
    // the STARTED fact on the timeline.
    const started = await ingress.submitIntent({
      intent: "start",
      instanceId: "j1",
      opId: "op-start",
    });
    expect(started).toEqual({ kind: "accepted" });
    const held = await handle.store.loadInstance("j1");
    expect(held).toEqual({
      instanceId: "j1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: null,
      // ch14-p3b: `create` seeds the binding from EVERY role's
      // `defaultActor`, so the shipped template's third role widens this
      // closed literal. Re-pinned to the new closed set, not relaxed.
      binding: { implementer: "codex", reviewer: "claude", operator: "human" },
      currentStep: null,
      round: 0,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      activationMode: "deferred_kickoff",
      wait: { kind: "kickoff_pending", requestedBy: "activation", resumeEvents: ["KICKOFF"] },
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 2,
    });
    const heldTimeline = await handle.store.getTimeline("j1", 0);
    expect(heldTimeline).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 50_000 },
    ]);

    // Leg 3 — a fresh actor envelope against the WAITING hold → not_active
    // (the J3 probe; the E5 state coverage completed on a
    // machinery-reachable state).
    const probe = await ingress.submit({
      instanceId: "j1",
      opId: "op-probe",
      type: "PASS",
      actorId: "codex",
      expectedVersion: 2,
      expectedRole: "implementer",
    });
    expect(probe).toEqual({ kind: "rejected", reason: "not_active" });
    // The probe leg's floor state: byte-identical to the held literal —
    // a rejected envelope mutates NOTHING (zero side effects).
    expect(await handle.store.loadInstance("j1")).toEqual(held);
    expect(await handle.store.getTimeline("j1", 0)).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 50_000 },
    ]);

    // Leg 4 — the SAME start replayed → Duplicate (no second entry).
    const replay = await ingress.submitIntent({
      intent: "start",
      instanceId: "j1",
      opId: "op-start",
    });
    expect(replay).toEqual({ kind: "duplicate" });
    // The replay leg's floor state: still the held literal — a Duplicate
    // is a no-op, no second entry (C12).
    expect(await handle.store.loadInstance("j1")).toEqual(held);
    expect(await handle.store.getTimeline("j1", 0)).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 50_000 },
    ]);

    // Leg 5 — kickoff: Activated + ACTIVE + round 1 + the task set +
    // the TASK_SUPPLIED fact + wait NULL.
    const kicked = await ingress.submitIntent({
      intent: "kickoff",
      instanceId: "j1",
      opId: "op-kick",
      task: "ship the journey",
    });
    if (kicked.kind !== "activated") {
      throw new Error(`kickoff leg: expected activated, got ${kicked.kind}`);
    }
    expect(kicked.version).toBe(3);
    expect(kicked.intent.actor).toBe("codex");
    expect(kicked.intent.packet.task).toBe("ship the journey");
    const active = await handle.store.loadInstance("j1");
    expect(active).toEqual({
      instanceId: "j1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "ship the journey",
      // ch14-p3b: `create` seeds the binding from EVERY role's
      // `defaultActor`, so the shipped template's third role widens this
      // closed literal. Re-pinned to the new closed set, not relaxed.
      binding: { implementer: "codex", reviewer: "claude", operator: "human" },
      currentStep: "implement",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      activationMode: "deferred_kickoff",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 3,
    });

    // Leg 6 — cancel: Terminated(cancelled) + TERMINAL + the CANCELLED
    // fact + wait NULL; the checkers close the journey green.
    const cancelled = await ingress.submitIntent({
      intent: "cancel",
      instanceId: "j1",
      opId: "op-cancel",
    });
    expect(cancelled).toEqual({ kind: "terminated", disposition: "cancelled" });
    const terminal = await handle.store.loadInstance("j1");
    expect(terminal).toEqual({
      instanceId: "j1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "ship the journey",
      // ch14-p3b: `create` seeds the binding from EVERY role's
      // `defaultActor`, so the shipped template's third role widens this
      // closed literal. Re-pinned to the new closed set, not relaxed.
      binding: { implementer: "codex", reviewer: "claude", operator: "human" },
      currentStep: "implement",
      round: 1,
      kernelStatus: "TERMINAL",
      terminalDisposition: "cancelled",
      activationMode: "deferred_kickoff",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 4,
    });
    const detail = await handle.store.getInstanceDetail("j1");
    if (detail === null) {
      throw new Error("journey wiring: detail vanished");
    }
    // FULL row equality: every fact row's {entryKind, seq, opId,
    // committedAt} exact — the controlled clock pins committedAt at 50_000.
    expect(detail.transcript).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 50_000 },
      { entryKind: "TASK_SUPPLIED", seq: 2, opId: "op-kick", committedAt: 50_000 },
      { entryKind: "CANCELLED", seq: 3, opId: "op-cancel", committedAt: 50_000 },
    ]);
    expect(runAllCheckers(detail, admitted.template)).toEqual([]);

    handle.close();
  });
});
