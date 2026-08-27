import type {
  DispatchIntent,
  InstanceId,
  TranscriptEntry,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import { resolveRuntimeContextRequirement } from "../domain/index.js";
import { deriveDispatchIntent } from "../kernel/dispatchIntent.js";
import type { AttemptExecutor, AttemptResult } from "../ports/delivery.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { DiagnosticEventBody, DiagnosticsSink, ErrandEdge, ErrandState } from "../ports/diagnostics.js";
import { ATTEMPT_SCOPED_ERRAND_EDGES } from "../ports/diagnostics.js";
import type { InstanceDetail } from "../ports/store.js";
import type {
  LocalExecutionCapability,
  ProviderRegistry,
} from "../ports/runtimeContextProvider.js";
import type { TimeSource } from "../ports/time.js";
import type { AttemptKind, ErrandRow, ErrandStore } from "./errandStore.js";

/**
 * The durable delivery loop (D/L/CF/B/K/DG machinery; packet ch9-p3a). It
 * discovers committed dispatches through the injected read seam, drives each
 * errand through the durable ledger under an evidence-disciplined,
 * crash-convergent state machine, and hands attempts to the injected executor
 * seam — writing ZERO kernel state (commit ≠ deliver; submission is the
 * executor's, ch9-P3b). Every state transition emits a best-effort diagnostic
 * event (DG1); the sink is called BARE (DG2, fail-open).
 */

/** The read subset the loop consumes (K4) — StorePort satisfies it structurally. */
export interface DeliveryReadSeam {
  listInstances(): Promise<readonly WorkflowInstance[]>;
  loadInstance(instanceId: InstanceId): Promise<WorkflowInstance | null>;
  getInstanceDetail(instanceId: InstanceId): Promise<InstanceDetail | null>;
}

/** The poll wait seam (D4): the TailWait pattern — real timer in production,
 * controllable in tests. Handed the configured `pollMs` per cycle. */
export type DeliveryWait = (pollMs: number) => Promise<void>;

export interface DeliveryLoopDeps {
  readonly errandStore: ErrandStore;
  readonly readSeam: DeliveryReadSeam;
  readonly definitions: DefinitionStore;
  readonly providerRegistry: ProviderRegistry;
  readonly executor: AttemptExecutor;
  readonly time: TimeSource;
  readonly wait: DeliveryWait;
  readonly attemptIdSource: () => string;
  readonly sessionNamer: (instanceId: string, attemptId: string) => string;
  readonly diag: DiagnosticsSink;
  /** This worker's claim identity (claims are scheduling-only, L3). */
  readonly workerId: string;
}

export interface DeliveryLoopOptions {
  readonly pollMs?: number;
  readonly leaseMs?: number;
  readonly attemptsPerErrand?: number;
}

export interface DeliveryLoop {
  /** One full pass: poll (reconcile + discover + reclaim + moot) then work. */
  tick(): Promise<void>;
  /** The poll pass ONLY (reconcile + discover + reclaim + moot) — no attempts.
   * The crash-recovery observation point (a fresh worker's first pass). */
  poll(): Promise<void>;
  /** The cadence run (D4): tick, then wait(pollMs), repeat until the injected
   * wait signals stop (rejects/throws — the scripted-exhaustion pattern). */
  run(): Promise<void>;
  /** The L5 re-spawn edge (unconfirmed → attempting, unbudgeted). C25's
   * `runner respawn` verb rides this — packet ch9-p4b. */
  respawn(instanceId: string, contextPacketId: string): Promise<void>;
}

const ATTEMPT_SCOPED_EDGE_SET: ReadonlySet<string> = new Set(ATTEMPT_SCOPED_ERRAND_EDGES);
const MOOTABLE_STATES: readonly ErrandState[] = ["pending", "claimed", "attempting", "unconfirmed"];

export function createDeliveryLoop(
  deps: DeliveryLoopDeps,
  options: DeliveryLoopOptions = {},
): DeliveryLoop {
  const pollMs = options.pollMs ?? 1000;
  const leaseMs = options.leaseMs ?? 900_000;
  const attemptsPerErrand = options.attemptsPerErrand ?? 3;
  const {
    errandStore: store,
    readSeam,
    definitions,
    providerRegistry,
    executor,
    time,
    wait,
    attemptIdSource,
    sessionNamer,
    diag,
    workerId,
  } = deps;

  function keyOf(instanceId: string, version: number): string {
    return `${instanceId}@v${String(version)}`;
  }

  // The DG1 emit — BARE (DG2). errandFrom present iff a prior state existed;
  // attemptId present iff the edge is attempt-scoped.
  function emitTransition(
    edge: ErrandEdge,
    instanceId: string,
    contextPacketId: string,
    from: ErrandState | null,
    to: ErrandState,
    attemptId?: string,
  ): void {
    const body: DiagnosticEventBody = {
      source: "runner",
      kind: "errand_transition",
      instanceId,
      contextPacketId,
      errandEdge: edge,
      errandTo: to,
      ...(from !== null ? { errandFrom: from } : {}),
      ...(ATTEMPT_SCOPED_EDGE_SET.has(edge) && attemptId !== undefined ? { attemptId } : {}),
    };
    diag.emit(body);
  }

  // Edge labelling follows L1's TRIGGER, not the landing: a precedence hit
  // inside a context emits THAT context's edge (reclaim → "reclaim";
  // exhaust-at-claim → "exhaust-at-claim"; the D5-poll / B1-attempt-start-load
  // terminal flip → "moot") whether it lands confirmed or mooted. The attempt's
  // OWN conclusion lands "confirm" (attempt-scoped). "evidence-promotion" is
  // RESERVED for the CF3 read-time flips from the three resting states
  // (unconfirmed/exhausted/mooted → confirmed, in the reader facade only).

  function hasEvidence(detail: InstanceDetail, errand: ErrandRow): boolean {
    for (const entry of detail.transcript) {
      if (entry.entryKind !== "transition") {
        continue;
      }
      if (
        entry.envelope.expectedVersion === errand.expectedVersion &&
        entry.envelope.actorId === errand.actorId
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * The runner is the SECOND DISPATCH PRODUCER (packet ch14-p2b, Q6):
   * the kernel returns a dispatch from the commit, and this loop
   * RE-DERIVES one from committed state when it delivers later. Both
   * must carry the SAME handoff, or a rework round is dispatched with
   * the wrong instruction.
   *
   * THE SCAN OPENS TO THE DECISION CLASS. Before this packet it read
   * the LAST TRANSITION row's payload; after a rework decision that
   * returns the PRE-GATE transition's payload — the actor's own last
   * emit — rather than the operator's instruction, which is exactly the
   * stale value the round advance exists to drop.
   *
   * Both classes are read in ONE ordered pass, so the LATEST of either
   * wins: a decision after a transition supersedes it, and a transition
   * after a decision supersedes that. The two remaining classes are
   * inert here — a WAIT_RESUMED carries no payload at this level
   * (C18's named Absent), and the op-less park row carries a `context_ref`
   * that is a RECORD of the arriving surface rather than a handoff to
   * the next actor.
   */
  function lastHandoff(transcript: readonly TranscriptEntry[]): unknown {
    let handoff: unknown;
    for (const entry of transcript) {
      if (entry.entryKind === "transition") {
        handoff = entry.envelope.payload;
      } else if (entry.entryKind === "DECISION_MADE") {
        handoff = entry.payload;
      }
    }
    return handoff;
  }

  /** The dispatched actor for a run (D3): the current-step role binding. A
   * missing definition/step/binding is a kernel/config integrity throw
   * (fail-closed, D6). */
  async function resolveActor(instance: WorkflowInstance): Promise<string> {
    if (instance.currentStep === null) {
      throw new Error(
        `delivery integrity: instance '${instance.instanceId}' is dispatchable with a null current step`,
      );
    }
    const template = await definitions.load(instance.templateRef);
    if (template === null) {
      throw new Error(
        `delivery integrity: pinned template for instance '${instance.instanceId}' not found`,
      );
    }
    const step = template.steps[instance.currentStep];
    if (step === undefined) {
      throw new Error(
        `delivery integrity: step '${instance.currentStep}' has no definition (instance '${instance.instanceId}')`,
      );
    }
    // K11 (ch14-p2a): `role` is optional since the class set opened.
    // Delivery addresses the actor of a DISPATCHED step, and only agent
    // steps dispatch — a role-less position here means a dispatch was
    // derived for a class that has no actor, which is integrity drift in
    // the same register as the missing-definition throw above.
    const { role } = step;
    if (role === undefined) {
      throw new Error(
        `delivery integrity: step '${instance.currentStep}' declares no role ` +
          `(instance '${instance.instanceId}') — only agent steps dispatch`,
      );
    }
    const actor = instance.binding[role];
    if (actor === undefined) {
      throw new Error(
        `delivery integrity: role '${role}' unbound (instance '${instance.instanceId}')`,
      );
    }
    return actor;
  }

  /**
   * The D6 intent re-derivation PLUS H1's cwd resolution (throws propagate
   * fail-closed, BEFORE any durable start write — a config-integrity fault
   * never consumes an attempt). The `cwd` is present iff the run has a runtime
   * context; on the `"none"` lane it is ABSENT and the adapter derives C17's
   * per-run subdirectory itself.
   */
  async function deriveExecution(
    instance: WorkflowInstance,
    detail: InstanceDetail,
  ): Promise<{ intent: DispatchIntent; cwd?: string }> {
    if (instance.currentStep === null) {
      throw new Error(
        `delivery integrity: instance '${instance.instanceId}' is dispatchable with a null current step`,
      );
    }
    const template = await definitions.load(instance.templateRef);
    if (template === null) {
      throw new Error(
        `delivery integrity: pinned template for instance '${instance.instanceId}' not found`,
      );
    }
    const handoff = lastHandoff(detail.transcript);
    const intent = deriveDispatchIntent(
      instance,
      template,
      instance.currentStep,
      providerRegistry,
      handoff,
    );
    const cwd = resolveLocalCwd(instance, template);
    return cwd === undefined ? { intent } : { intent, cwd };
  }

  /**
   * H1 (flag F5): resolve the local working directory at derivation, from the
   * provider's LocalExecutionCapability. Present iff the run has a runtime
   * context (`ready(ref)`). A ready-ref run whose provider lacks the capability,
   * or a throwing resolution, is D6's config-integrity lane — fail-closed loud
   * (throws propagate; the caller runs this BEFORE the durable start, so the
   * errand is unmutated and no budget is burned). A value-shape check, never a
   * provider-TYPE branch (REV-E-NO-ADAPTER-BRANCH).
   */
  function resolveLocalCwd(
    instance: WorkflowInstance,
    template: WorkflowTemplate,
  ): string | undefined {
    const rc = instance.runtimeContext;
    if (rc.state !== "ready" || rc.ref === null) {
      return undefined; // the `"none"` lane — the adapter derives its own cwd
    }
    const requirement = resolveRuntimeContextRequirement(template.runtimeContext);
    if (requirement.state !== "required") {
      throw new Error(
        `delivery integrity: instance '${instance.instanceId}' has a provisioned runtime-context ref but its pinned template declares no runtime context`,
      );
    }
    const provider = providerRegistry.resolve(requirement.spec.provider);
    if (provider === null) {
      throw new Error(
        `delivery integrity: provider '${requirement.spec.provider}' for active instance '${instance.instanceId}' is no longer resolvable (the registry must stay stable for the life of the run)`,
      );
    }
    const capability = provider as Partial<LocalExecutionCapability>;
    if (typeof capability.resolveLocalWorkingDirectory !== "function") {
      throw new Error(
        `delivery integrity: provider '${requirement.spec.provider}' has a runtime context but is not a local-execution provider (cannot resolve the working directory) for instance '${instance.instanceId}'`,
      );
    }
    return capability.resolveLocalWorkingDirectory(rc.ref);
  }

  // ── Poll sub-passes ────────────────────────────────────────────────────

  async function reconcile(instances: readonly WorkflowInstance[]): Promise<void> {
    for (const instance of instances) {
      if (instance.kernelStatus !== "TERMINAL" || store.isReconciled(instance.instanceId)) {
        continue;
      }
      const detail = await readSeam.getInstanceDetail(instance.instanceId);
      if (detail === null) {
        continue;
      }
      // (a) a CONFIRMED terminal_backfill row per transition row.
      for (const entry of detail.transcript) {
        if (entry.entryKind !== "transition") {
          continue;
        }
        const version = entry.envelope.expectedVersion;
        if (version === undefined) {
          continue; // presence invariant: committed transitions carry it — defensive.
        }
        const key = keyOf(instance.instanceId, version);
        const res = store.backfillConfirmed({
          instanceId: instance.instanceId,
          contextPacketId: key,
          expectedVersion: version,
          actorId: entry.envelope.actorId,
          budget: attemptsPerErrand,
        });
        if (res.created) {
          emitTransition("reconcile-backfill", instance.instanceId, key, null, "confirmed");
        }
      }
      // (b) ONE mooted terminal_backfill for the final outstanding dispatch,
      // decided from the TERMINAL AGGREGATE (D7's TOTAL rule).
      const disposition = detail.instance.terminalDisposition;
      if (
        (disposition === "cancelled" || disposition === "failed") &&
        detail.instance.currentStep !== null
      ) {
        const version = detail.instance.version - 1;
        const key = keyOf(instance.instanceId, version);
        const actor = await resolveActor(detail.instance);
        const res = store.backfillMooted({
          instanceId: instance.instanceId,
          contextPacketId: key,
          expectedVersion: version,
          actorId: actor,
          budget: attemptsPerErrand,
        });
        if (res.created) {
          emitTransition("reconcile-backfill", instance.instanceId, key, null, "mooted");
        }
      }
      store.markReconciled(instance.instanceId, time.now());
    }
  }

  async function discover(instances: readonly WorkflowInstance[]): Promise<void> {
    for (const instance of instances) {
      if (instance.kernelStatus !== "ACTIVE") {
        continue;
      }
      const key = keyOf(instance.instanceId, instance.version);
      if (store.getErrand(instance.instanceId, key) !== null) {
        continue; // idempotent — an existing row survives (D3).
      }
      const actor = await resolveActor(instance);
      const res = store.createErrand({
        instanceId: instance.instanceId,
        contextPacketId: key,
        expectedVersion: instance.version,
        actorId: actor,
        budget: attemptsPerErrand,
      });
      if (res.created) {
        emitTransition("create", instance.instanceId, key, null, "pending");
      }
    }
  }

  async function reclaimStale(): Promise<void> {
    for (const errand of store.listErrands()) {
      if (errand.state !== "claimed" && errand.state !== "attempting") {
        continue;
      }
      if (errand.claimedAt === null || time.now() - errand.claimedAt <= leaseMs) {
        continue;
      }
      const detail = await readSeam.getInstanceDetail(errand.instanceId);
      let landing: ErrandState;
      if (detail !== null && hasEvidence(detail, errand)) {
        landing = "confirmed";
      } else if (detail !== null && detail.instance.kernelStatus === "TERMINAL") {
        landing = "mooted";
      } else {
        const active =
          errand.activeAttemptId !== null ? store.getAttempt(errand.activeAttemptId) : null;
        landing = active?.kind === "respawn" ? "unconfirmed" : "pending";
      }
      const res = store.reclaim({
        instanceId: errand.instanceId,
        contextPacketId: errand.contextPacketId,
        now: time.now(),
        leaseMs,
        landing,
      });
      if (res.reclaimed) {
        emitTransition("reclaim", errand.instanceId, errand.contextPacketId, errand.state, landing);
      }
    }
  }

  async function mootTerminal(): Promise<void> {
    for (const errand of store.listErrands()) {
      if (!MOOTABLE_STATES.includes(errand.state)) {
        continue;
      }
      const detail = await readSeam.getInstanceDetail(errand.instanceId);
      if (detail === null || detail.instance.kernelStatus !== "TERMINAL") {
        continue;
      }
      // CF1 FIRST (L2) — late evidence lands confirmed, never mooted. The
      // D5-poll terminal context emits "moot" whichever way it lands (L1's
      // trigger-labelled precedence hit).
      if (hasEvidence(detail, errand)) {
        const res = store.concludeConfirmed({
          instanceId: errand.instanceId,
          contextPacketId: errand.contextPacketId,
        });
        if (res.applied) {
          emitTransition("moot", errand.instanceId, errand.contextPacketId, errand.state, "confirmed");
        }
      } else {
        const res = store.concludeMooted({
          instanceId: errand.instanceId,
          contextPacketId: errand.contextPacketId,
        });
        if (res.applied) {
          emitTransition("moot", errand.instanceId, errand.contextPacketId, errand.state, "mooted");
        }
      }
    }
  }

  // ── Work pass ──────────────────────────────────────────────────────────

  async function attemptClaimed(errand: ErrandRow): Promise<void> {
    const detail = await readSeam.getInstanceDetail(errand.instanceId);
    if (detail === null) {
      return; // defensive (the kernel never deletes instances at ch9).
    }
    const instance = detail.instance;
    if (instance.kernelStatus === "TERMINAL") {
      // B1 attempt-start-load terminal moot — CF1 FIRST. The trigger context is
      // the terminal load, so the precedence hit emits "moot" either way (L1).
      if (hasEvidence(detail, errand)) {
        const res = store.concludeConfirmed({
          instanceId: errand.instanceId,
          contextPacketId: errand.contextPacketId,
        });
        if (res.applied) {
          emitTransition("moot", errand.instanceId, errand.contextPacketId, errand.state, "confirmed");
        }
      } else {
        const res = store.concludeMooted({
          instanceId: errand.instanceId,
          contextPacketId: errand.contextPacketId,
        });
        if (res.applied) {
          emitTransition("moot", errand.instanceId, errand.contextPacketId, errand.state, "mooted");
        }
      }
      return;
    }
    if (errand.remainingBudget === 0) {
      // The zero-budget claim resolution (B4 double check). The trigger context
      // is exhaust-at-claim, so the precedence hit emits "exhaust-at-claim"
      // whether it lands confirmed (evidence) or exhausted (L1).
      if (hasEvidence(detail, errand)) {
        const res = store.concludeConfirmed({
          instanceId: errand.instanceId,
          contextPacketId: errand.contextPacketId,
        });
        if (res.applied) {
          emitTransition(
            "exhaust-at-claim",
            errand.instanceId,
            errand.contextPacketId,
            errand.state,
            "confirmed",
          );
        }
      } else {
        const res = store.exhaustAtClaim({
          instanceId: errand.instanceId,
          contextPacketId: errand.contextPacketId,
        });
        if (res.applied) {
          emitTransition(
            "exhaust-at-claim",
            errand.instanceId,
            errand.contextPacketId,
            "claimed",
            "exhausted",
          );
        }
      }
      return;
    }
    // ── H5 (flag F10): the ACTIVE budget≥1 hold — evidence-first + the C13
    // version gate BEFORE the durable start (the terminal + zero-budget holds
    // above already ran CF1 with their own edges; this closes the previously
    // unguarded B1 start so a reclaimed stale errand can never spawn the NEXT
    // dispatch's packet under the OLD errand row).
    // (1) evidence → confirmed, with ZERO mint/spawn/decrement — the successor
    //     edge `evidence-at-claim` (claimed→confirmed, attemptId ABSENT).
    if (hasEvidence(detail, errand)) {
      const res = store.concludeConfirmed({
        instanceId: errand.instanceId,
        contextPacketId: errand.contextPacketId,
      });
      if (res.applied) {
        emitTransition(
          "evidence-at-claim",
          errand.instanceId,
          errand.contextPacketId,
          "claimed",
          "confirmed",
        );
      }
      return;
    }
    // (3) ACTIVE + version mismatch (no evidence — unreachable on a healthy
    //     ACTIVE run by the evidence⇔version coupling) → the fail-closed SKIP:
    //     no spawn, no decrement, no state write; the next tick re-derives.
    if (instance.version !== errand.expectedVersion) {
      return;
    }
    // (4) else start. Derive intent + H1 cwd (D6 — throws propagate fail-closed)
    // BEFORE the durable start write, so a config-integrity fault never consumes
    // an attempt.
    const { intent, cwd } = await deriveExecution(instance, detail);
    const started = store.startBudgetedAttempt({
      instanceId: errand.instanceId,
      contextPacketId: errand.contextPacketId,
      workerId,
      now: time.now(),
      attemptIdSource,
      sessionNamer,
    });
    if (started.kind !== "started") {
      return; // race — another worker owns the row.
    }
    emitTransition(
      "attempt-start",
      errand.instanceId,
      errand.contextPacketId,
      "claimed",
      "attempting",
      started.attemptId,
    );
    await runAttempt(errand, started.attemptId, started.sessionName, "budgeted", intent, cwd);
  }

  async function runAttempt(
    errand: ErrandRow,
    attemptId: string,
    sessionName: string,
    kind: AttemptKind,
    intent: DispatchIntent,
    cwd?: string,
  ): Promise<void> {
    let result: AttemptResult;
    try {
      result = await executor.execute({
        intent,
        attemptId,
        sessionName,
        ...(cwd !== undefined ? { cwd } : {}),
      });
    } catch {
      // K2: a rejecting/throwing executor IS the infra-error class arriving on
      // the promise channel — the same B2 CAS path, never a loop crash.
      result = { kind: "infra_failure", class: "spawn_infra" };
    }
    await conclude(errand, attemptId, kind, result, intent, cwd);
  }

  /**
   * A conclusion whose default landing is `unconfirmed` (no_output, other-admit,
   * negative-respawn). L2/CF2: the precedence's committed-row check runs FIRST
   * at EVERY conclusion — evidence found → confirmed; run TERMINAL → mooted;
   * else the frozen `unconfirmed` landing (through B2's CAS). The confirmed /
   * mooted writes are attempt-independent precedence writes (a stale attempt's
   * committed evidence still promotes; its no-evidence CAS landing is inert).
   */
  async function concludeToUnconfirmed(
    errand: ErrandRow,
    attemptId: string,
    unconfirmedEdge: ErrandEdge,
    land: () => { applied: boolean },
  ): Promise<void> {
    const key = { instanceId: errand.instanceId, contextPacketId: errand.contextPacketId };
    const detail = await readSeam.getInstanceDetail(errand.instanceId);
    if (detail !== null && hasEvidence(detail, errand)) {
      const res = store.concludeConfirmed(key);
      if (res.applied) {
        emitTransition("confirm", key.instanceId, key.contextPacketId, "attempting", "confirmed", attemptId);
      }
      return;
    }
    if (detail !== null && detail.instance.kernelStatus === "TERMINAL") {
      const res = store.concludeMooted(key);
      if (res.applied) {
        emitTransition("moot", key.instanceId, key.contextPacketId, "attempting", "mooted");
      }
      return;
    }
    const res = land();
    if (res.applied) {
      emitTransition(unconfirmedEdge, key.instanceId, key.contextPacketId, "attempting", "unconfirmed", attemptId);
    }
  }

  async function conclude(
    errand: ErrandRow,
    attemptId: string,
    kind: AttemptKind,
    result: AttemptResult,
    intent: DispatchIntent,
    cwd?: string,
  ): Promise<void> {
    const key = { instanceId: errand.instanceId, contextPacketId: errand.contextPacketId };
    switch (result.kind) {
      case "submitted": {
        const outcome = result.outcome;
        if (outcome.kind === "committed" || outcome.kind === "duplicate") {
          const res = store.concludeConfirmed(key);
          if (res.applied) {
            emitTransition("confirm", key.instanceId, key.contextPacketId, "attempting", "confirmed", attemptId);
          }
        } else if (outcome.kind === "stale") {
          await concludeToUnconfirmed(errand, attemptId, "other-admit", () =>
            store.concludeOtherAdmit({ ...key, attemptId, recordedAdmitOutcome: "stale" }),
          );
        } else if (outcome.reason === "not_active") {
          // Run TERMINAL → mooted (CF1 FIRST).
          const detail = await readSeam.getInstanceDetail(errand.instanceId);
          if (detail !== null && hasEvidence(detail, errand)) {
            const res = store.concludeConfirmed(key);
            if (res.applied) {
              emitTransition("confirm", key.instanceId, key.contextPacketId, "attempting", "confirmed", attemptId);
            }
          } else {
            const res = store.concludeMooted(key);
            if (res.applied) {
              emitTransition("moot", key.instanceId, key.contextPacketId, "attempting", "mooted");
            }
          }
        } else {
          const reason = outcome.reason;
          await concludeToUnconfirmed(errand, attemptId, "other-admit", () =>
            store.concludeOtherAdmit({ ...key, attemptId, recordedAdmitOutcome: reason }),
          );
        }
        return;
      }
      case "no_output": {
        await concludeToUnconfirmed(errand, attemptId, "no-output", () =>
          store.concludeNoOutput({ ...key, attemptId }),
        );
        return;
      }
      case "name_collision": {
        const res = store.remint({
          ...key,
          oldAttemptId: attemptId,
          workerId,
          now: time.now(),
          attemptIdSource,
          sessionNamer,
        });
        if (res.kind === "reminted") {
          emitTransition("remint", key.instanceId, key.contextPacketId, "attempting", "attempting", res.attemptId);
          // The remint's fresh attempt is executed IMMEDIATELY (same tick) —
          // otherwise the errand strands in `attempting` until lease expiry
          // (which would burn real budget). Bounded by the id source's
          // collision resistance. (name_collision is RS4(a)-unreachable from
          // the real adapter; the same cwd rides the re-run for completeness.)
          await runAttempt(errand, res.attemptId, res.sessionName, kind, intent, cwd);
        }
        return;
      }
      case "infra_failure": {
        if (kind === "respawn") {
          await concludeToUnconfirmed(errand, attemptId, "negative-respawn", () =>
            store.concludeNegativeRespawn({ ...key, attemptId }),
          );
          return;
        }
        const current = store.getErrand(errand.instanceId, errand.contextPacketId);
        const exhausting =
          current !== null &&
          current.state === "attempting" &&
          current.activeAttemptId === attemptId &&
          current.remainingBudget === 0;
        if (exhausting) {
          // B4 double final check.
          const detail = await readSeam.getInstanceDetail(errand.instanceId);
          if (detail !== null && hasEvidence(detail, errand)) {
            const res = store.concludeConfirmed(key);
            if (res.applied) {
              emitTransition("confirm", key.instanceId, key.contextPacketId, "attempting", "confirmed", attemptId);
            }
          } else if (detail !== null && detail.instance.kernelStatus === "TERMINAL") {
            const res = store.concludeMooted(key);
            if (res.applied) {
              emitTransition("moot", key.instanceId, key.contextPacketId, "attempting", "mooted");
            }
          } else {
            const res = store.concludeExhaust({ ...key, attemptId });
            if (res.applied) {
              emitTransition("exhaust", key.instanceId, key.contextPacketId, "attempting", "exhausted", attemptId);
            }
          }
        } else {
          const res = store.concludeNegativeBudgeted({ ...key, attemptId });
          if (res.applied) {
            emitTransition("negative-budgeted", key.instanceId, key.contextPacketId, "attempting", "pending", attemptId);
          }
        }
        return;
      }
    }
  }

  async function work(): Promise<void> {
    for (const errand of store.listErrands()) {
      if (errand.state === "pending") {
        const claimed = store.claim({
          instanceId: errand.instanceId,
          contextPacketId: errand.contextPacketId,
          workerId,
          now: time.now(),
        });
        if (!claimed.claimed) {
          continue;
        }
        emitTransition("claim", errand.instanceId, errand.contextPacketId, "pending", "claimed");
        const reread = store.getErrand(errand.instanceId, errand.contextPacketId);
        if (reread !== null && reread.state === "claimed") {
          await attemptClaimed(reread);
        }
      } else if (errand.state === "claimed") {
        await attemptClaimed(errand);
      }
    }
  }

  async function poll(): Promise<void> {
    const instances = await readSeam.listInstances();
    await reconcile(instances);
    await discover(instances);
    await reclaimStale();
    await mootTerminal();
  }

  async function tick(): Promise<void> {
    await poll();
    await work();
  }

  async function run(): Promise<void> {
    for (;;) {
      await tick();
      try {
        await wait(pollMs);
      } catch {
        return; // the injected wait signalled stop (scripted-exhaustion).
      }
    }
  }

  async function respawn(instanceId: string, contextPacketId: string): Promise<void> {
    const errand = store.getErrand(instanceId, contextPacketId);
    if (errand === null || errand.state !== "unconfirmed") {
      return; // the exactly-one errand-level exit is from `unconfirmed` (L5).
    }
    const detail = await readSeam.getInstanceDetail(instanceId);
    if (detail === null) {
      return;
    }
    // The same B1/D5 instance-load precondition set BEFORE any attempt starts:
    // a TERMINAL run moots (CF1 FIRST — late evidence lands confirmed, never
    // mooted), no attempt, no executor invocation.
    if (detail.instance.kernelStatus === "TERMINAL") {
      if (hasEvidence(detail, errand)) {
        const res = store.concludeConfirmed({ instanceId, contextPacketId });
        if (res.applied) {
          emitTransition("moot", instanceId, contextPacketId, "unconfirmed", "confirmed");
        }
      } else {
        const res = store.concludeMooted({ instanceId, contextPacketId });
        if (res.applied) {
          emitTransition("moot", instanceId, contextPacketId, "unconfirmed", "mooted");
        }
      }
      return;
    }
    // ── H5 (flag F10): the re-spawn hold (B5's B1-shaped start) — evidence-first
    // + the version gate BEFORE the durable start, symmetric with the budgeted
    // hold. (1) evidence → confirmed via the successor edge `evidence-at-respawn`
    // (unconfirmed→confirmed, attemptId ABSENT).
    if (hasEvidence(detail, errand)) {
      const res = store.concludeConfirmed({ instanceId, contextPacketId });
      if (res.applied) {
        emitTransition("evidence-at-respawn", instanceId, contextPacketId, "unconfirmed", "confirmed");
      }
      return;
    }
    // (3) ACTIVE + version mismatch (no evidence) → the fail-closed SKIP.
    if (detail.instance.version !== errand.expectedVersion) {
      return;
    }
    // (4) else start.
    const { intent, cwd } = await deriveExecution(detail.instance, detail);
    const started = store.startRespawnAttempt({
      instanceId,
      contextPacketId,
      workerId,
      now: time.now(),
      attemptIdSource,
      sessionNamer,
    });
    if (started.kind !== "started") {
      return;
    }
    emitTransition("respawn", instanceId, contextPacketId, "unconfirmed", "attempting", started.attemptId);
    await runAttempt(errand, started.attemptId, started.sessionName, "respawn", intent, cwd);
  }

  return { tick, poll, run, respawn };
}
