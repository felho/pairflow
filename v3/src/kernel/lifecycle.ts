import type {
  ActivationMode,
  ActorId,
  CancelOutcome,
  CreateOutcome,
  FailOutcome,
  InstanceId,
  KickoffOutcome,
  OpId,
  ProvisioningFailureReason,
  RoleName,
  RuntimeContext,
  RuntimeContextFailedOutcome,
  RuntimeContextReadyOutcome,
  RuntimeContextRef,
  StartOutcome,
  TemplateRef,
  WaitReason,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import { PROVISIONING_FAILURE_REASONS, resolveRuntimeContextRequirement } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { LifecycleFactKind } from "../domain/index.js";
import type { ProviderRegistry } from "../ports/runtimeContextProvider.js";
import type { StorePort } from "../ports/store.js";
import { admitLifecycle } from "./admission.js";
import { deriveDispatchIntent } from "./dispatchIntent.js";

/**
 * The l0d lifecycle handlers (packet ch12-p1b — CREATE_INSTANCE / START /
 * KICKOFF / CANCEL / FAIL / activate; ADR-014: the lifecycle IS the
 * kernel, this is a kernel file, not a module). Every op:
 * load-first (a null load is `Rejected(unknown_instance)` — L8), the
 * ONE admission protocol's lifecycle parameterization (idempotency
 * kind-aware FIRST, then the op's state expectation — A1/A2/A3), then
 * ONE atomic commit through `store.commitLifecycle` (F1); the UNNAMED
 * state rungs are fail-loud guard throws — no state change, no op_id
 * consumption, no invented rejection name (A4). On a CAS conflict the
 * handler restarts from load (the HANDLE culture — full re-admission on
 * fresh state, L9).
 */

export interface LifecycleDeps {
  readonly store: StorePort;
  readonly definitions: DefinitionStore;
  /**
   * E1/T3 (packet ch12-p3): the injected provider registry — reached from
   * `activate`/`activateOrHold`/`deriveDispatchIntent` (the projection leg)
   * and from `start` (spec resolution). The kernel never branches on a
   * concrete provider type (REV-E-NO-ADAPTER-BRANCH).
   */
  readonly providerRegistry: ProviderRegistry;
}

/**
 * The provisioning extras `start` needs beyond LifecycleDeps (packet
 * ch12-p3, S/SM families) — the request-id minter and the completion-seam
 * conclusion signal. Both are kernel-originated composition wiring: the seam
 * BUFFER lives inside `createKernel`; `start` signals `concludeAttempt` at
 * EACH provisioning attempt's conclusion (SM3), never on an event-loop
 * scheduling primitive.
 */
export interface StartDeps extends LifecycleDeps {
  /** Mint a FRESH unique request_id per provisioning attempt (S3/S5). */
  readonly newRequestId: () => string;
  /** Signal a provisioning attempt's conclusion — the seam flushes any held
   * completion for this request_id (SM3). PER-ATTEMPT (a superseded id
   * concludes at ITS attempt, inert by correlation). */
  readonly concludeAttempt: (requestId: string) => Promise<void>;
}

/**
 * The extras RUNTIME_CONTEXT_READY needs (packet ch12-p3, K family / PR4):
 * the ref transport gate — throws iff the delivered ref is not
 * canonical-JSON-safe (reuses the injected emit-lib; the kernel imports no
 * emit).
 */
export interface ReadyDeps extends LifecycleDeps {
  readonly assertRefCanonical: (
    instanceId: InstanceId,
    requestId: string,
    ref: RuntimeContextRef,
  ) => void;
}

export interface CreateInput {
  readonly instanceId: InstanceId;
  readonly templateRef: TemplateRef;
  readonly task?: string;
  readonly overrides?: Readonly<Record<RoleName, ActorId>>;
  readonly runOverrides?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** The CREATE-level choice (C13) — the DOMAIN token; the authored
   * camelCase face maps at the ingress wire. */
  readonly mode?: ActivationMode;
}

export interface StartInput {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
}

export interface KickoffInput {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
  readonly task: string;
}

export interface CancelInput {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
}

/** T3's pinned wait shape — the model exhibit, the ONLY P1b writer value. */
const KICKOFF_WAIT: WaitReason = {
  kind: "kickoff_pending",
  requestedBy: "activation",
  resumeEvents: ["KICKOFF"],
};

function resolveBinding(
  template: WorkflowTemplate,
  overrides: Readonly<Record<RoleName, ActorId>> | undefined,
): Readonly<Record<RoleName, ActorId>> {
  const binding: Record<RoleName, ActorId> = {};
  for (const [role, decl] of Object.entries(template.roles)) {
    const actor = overrides?.[role] ?? decl.defaultActor;
    if (actor !== undefined) {
      binding[role] = actor;
    }
  }
  // Coverage over ALL declared steps' roles — a superset of "reachable"
  // (strictly safe). The format layer fixes declared==used strictly
  // (draft C16, realized ch8-P1); reachability-aware relaxation stays
  // deferred-additive.
  for (const [stepId, step] of Object.entries(template.steps)) {
    if (binding[step.role] === undefined) {
      throw new Error(
        `create failed (binding coverage): role '${step.role}' (step '${stepId}') is unbound — ` +
          "bind it at create or declare a default actor; the invariant fails at create, not mid-run",
      );
    }
  }
  return binding;
}

/**
 * l0d-pseudocode/activate (L7): internal — never routed, never exported
 * as a handler. The activation WRITE-SET (ACTIVE + template.start +
 * round 1) rides the CALLER's atomic commit; this function is the
 * post-commit half — the readiness REQUIRE (readiness gates dispatch;
 * structurally satisfied at every call site, guarded FAIL-LOUD — the E4
 * pattern) and the first dispatch derived from COMMITTED state (commit ≠
 * deliver). E1 (packet ch12-p3): the `providerRegistry` is threaded to
 * `deriveDispatchIntent` for the runtime-context projection leg.
 */
function activate(
  committed: WorkflowInstance,
  template: WorkflowTemplate,
  providerRegistry: ProviderRegistry,
): {
  readonly kind: "activated";
  readonly instanceId: InstanceId;
  readonly version: number;
  readonly intent: ReturnType<typeof deriveDispatchIntent>;
} {
  if (committed.runtimeContext.state !== "ready" || committed.task === null) {
    throw new Error(
      `kernel integrity: activation of instance '${committed.instanceId}' without a ready context and task (readiness gates dispatch)`,
    );
  }
  const intent = deriveDispatchIntent(committed, template, template.start, providerRegistry);
  return {
    kind: "activated",
    instanceId: committed.instanceId,
    version: committed.version,
    intent,
  };
}

/** The activated/held outcome of `activateOrHold` (packet ch12-p3), plus the
 * internal `restart` signal returned on a CAS conflict so the CALLER's
 * load-first loop re-admits on fresh state. */
type ActivateOrHoldResult =
  | { readonly kind: "activated"; readonly instanceId: InstanceId; readonly version: number; readonly intent: ReturnType<typeof deriveDispatchIntent> }
  | { readonly kind: "accepted" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "rejected"; readonly reason: "op_id_collision" }
  | { readonly kind: "restart" };

/**
 * l0e-pseudocode/activate_or_hold (packet ch12-p3, K4): the SHARED
 * post-readiness decision, EXTRACTED from P1b's inline START fork so
 * RUNTIME_CONTEXT_READY reuses it. The immediate branch composes the
 * activation write-set (ACTIVE + template.start + round 1) into the SAME
 * atomic commit as the `ready(ref)`/`ready(∅)` write; the deferred branch
 * composes the WAITING(kickoff_pending) hold. START's none path passes the
 * STARTED fact; READY passes `fact: null` (a kernel event carries no op fact).
 * A CAS conflict returns `restart` for the caller's loop.
 */
async function activateOrHold(
  deps: LifecycleDeps,
  args: {
    readonly instance: WorkflowInstance;
    readonly template: WorkflowTemplate;
    readonly newRuntimeContext: RuntimeContext;
    readonly fact: { readonly kind: LifecycleFactKind; readonly opId: OpId } | null;
    readonly expectedVersion: number;
  },
): Promise<ActivateOrHoldResult> {
  const { instance, template, newRuntimeContext, fact, expectedVersion } = args;
  if (instance.activationMode === "immediate") {
    // The composed activation commit (L2/L7): ACTIVE + template.start + round
    // 1 + the resolved context (+ the STARTED fact on the none path), one move.
    const result = await deps.store.commitLifecycle({
      instanceId: instance.instanceId,
      expectedVersion,
      fact,
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
      newWait: null,
      newCurrentStep: template.start,
      newRound: 1,
      newRuntimeContext,
    });
    switch (result.kind) {
      case "duplicate_op":
        return { kind: "duplicate" };
      case "op_id_collision":
        return { kind: "rejected", reason: "op_id_collision" };
      case "cas_conflict":
        return { kind: "restart" };
      case "committed":
        // The post-commit half of activate (L7) — derive AFTER the commit,
        // from committed state (the task is guaranteed present in immediate mode).
        return activate(
          {
            ...instance,
            kernelStatus: "ACTIVE",
            currentStep: template.start,
            round: 1,
            runtimeContext: newRuntimeContext,
            wait: null,
            version: result.version,
          },
          template,
          deps.providerRegistry,
        );
    }
  }
  // deferred_kickoff: the hold commit — WAITING(kickoff_pending) + the
  // resolved context (+ the STARTED fact on the none path), one move (L2/T3).
  const result = await deps.store.commitLifecycle({
    instanceId: instance.instanceId,
    expectedVersion,
    fact,
    newKernelStatus: "WAITING",
    newTerminalDisposition: null,
    newWait: KICKOFF_WAIT,
    newRuntimeContext,
  });
  switch (result.kind) {
    case "duplicate_op":
      return { kind: "duplicate" };
    case "op_id_collision":
      return { kind: "rejected", reason: "op_id_collision" };
    case "cas_conflict":
      return { kind: "restart" };
    case "committed":
      return { kind: "accepted" };
  }
}

async function loadPinnedTemplate(
  definitions: DefinitionStore,
  instance: WorkflowInstance,
): Promise<WorkflowTemplate> {
  const template = await definitions.load(instance.templateRef);
  if (template === null) {
    // The ref was pinned at create — a missing definition is an
    // integrity failure, not a rejection (the built loadTemplate culture).
    throw new Error(
      `kernel integrity: pinned template '${instance.templateRef.id}@${String(instance.templateRef.version)}' not found`,
    );
  }
  return template;
}

/**
 * l0d-pseudocode/CREATE_INSTANCE (L1/G1): genesis — record + binding
 * coverage, NO dispatch, no transcript row, no op_id. The effective
 * mode resolves ONCE here (the CREATE choice ?? the admitted template's
 * activation default ?? `immediate` — C13; G3's materialization makes
 * the last leg structurally dead on admitted values, kept as the
 * type-level belt) and is snapshotted — thereafter the INSTANCE field
 * alone governs. `task_required` reads the EFFECTIVE mode (resolution
 * precedes the check). A duplicate instance id is the store's
 * creation-uniqueness THROW, never a Duplicate outcome.
 */
export async function createInstance(
  deps: LifecycleDeps,
  input: CreateInput,
): Promise<CreateOutcome> {
  const template = await deps.definitions.load(input.templateRef);
  if (template === null) {
    throw new Error(
      `create failed: template '${input.templateRef.id}@${String(input.templateRef.version)}' not found`,
    );
  }
  const effectiveMode: ActivationMode =
    input.mode ?? template.activation?.mode ?? "immediate";
  if (effectiveMode === "immediate" && input.task === undefined) {
    return { kind: "rejected", reason: "task_required" };
  }
  const binding = resolveBinding(template, input.overrides);
  const instance: WorkflowInstance = {
    instanceId: input.instanceId,
    templateRef: input.templateRef,
    task: input.task ?? null,
    binding,
    currentStep: null,
    round: 0,
    kernelStatus: "CREATED",
    terminalDisposition: null,
    activationMode: effectiveMode,
    wait: null,
    runtimeContext: { state: "none" },
    failureReason: null,
    runOverrides: input.runOverrides ?? {},
    version: 1,
  };
  await deps.store.createInstance(instance);
  return { kind: "created", instanceId: instance.instanceId, version: 1 };
}

/**
 * l0e-pseudocode/START (packet ch12-p3, S family; completing
 * l0d-pseudocode/START): single-shot provisioning-or-hold. After the
 * single-shot admission, the MATERIALIZED requirement (read through
 * `resolveRuntimeContextRequirement` over the admission-normalized field —
 * T1/R1, never re-derived) forks:
 *   - `none`  → `ready(∅)` + the STARTED fact + `activate_or_hold` (P1b's
 *     path, unchanged in effect);
 *   - `required(spec)` → resolve the provider (unresolved →
 *     `Rejected(runtime_context_provider_unavailable)` PRE-COMMIT, the op_id
 *     unconsumed, S2), `provision(...)` FIRST (the awaited value is the
 *     DETACH ACK — a throw/pre-commit-rejecting ack is a PORT BREACH, S4),
 *     then commit `requested(request_id)` + the STARTED fact in ONE atomic
 *     move (status stays CREATED) and return `Accepted` (the dispatch arrives
 *     on the async READY path, S3).
 * The completion seam is CONCLUSION-SIGNALLED (SM3): `start` signals
 * `concludeAttempt` at EACH provisioning attempt's conclusion — the
 * CAS-restart superseded id inline (per-attempt), and the terminal/failed
 * attempt via the leak-proof `try/finally` backstop over the restart loop.
 */
export async function start(deps: StartDeps, input: StartInput): Promise<StartOutcome> {
  const mintedRequestIds: string[] = [];
  try {
    for (;;) {
      const instance = await deps.store.loadInstance(input.instanceId);
      if (instance === null) {
        return { kind: "rejected", reason: "unknown_instance" };
      }
      const existing = await deps.store.findOp(input.instanceId, input.opId);
      const admitted = admitLifecycle({
        op: { existing, factKind: "STARTED" },
        stateHolds:
          instance.kernelStatus === "CREATED" && instance.runtimeContext.state === "none",
      });
      if (admitted.kind === "duplicate") {
        return { kind: "duplicate" };
      }
      if (admitted.kind === "rejected") {
        return admitted;
      }
      if (admitted.kind === "state_violation") {
        // The unnamed single-shot guard (A4): START is requestable only
        // from genesis — bare-REQUIRE semantics, no state change, the
        // op_id unconsumed.
        throw new Error(
          `start failed (single-shot guard): instance '${input.instanceId}' is not CREATED with an unprovisioned context — START is requestable only from none`,
        );
      }
      const template = await loadPinnedTemplate(deps.definitions, instance);
      // T1/R1: read the MATERIALIZED requirement — a total view over the
      // admission-normalized field (the interim `resolveWindowContext` seam
      // and the `runtimeContextRef` carrier retire here, W1).
      const requirement = resolveRuntimeContextRequirement(template.runtimeContext);
      if (requirement.state === "none") {
        // The none path (P1b's, unchanged): trivially ready — nothing to
        // provision — ready(∅) + the STARTED fact + activate_or_hold.
        const result = await activateOrHold(deps, {
          instance,
          template,
          newRuntimeContext: { state: "ready", ref: null },
          fact: { kind: "STARTED", opId: input.opId },
          expectedVersion: instance.version,
        });
        if (result.kind === "restart") {
          continue;
        }
        return result;
      }
      // The spec path (S2): resolve the provider against the injected registry.
      const provider = deps.providerRegistry.resolve(requirement.spec.provider);
      if (provider === null) {
        // Name-resolution failure = base contract error, a PRE-COMMIT reject:
        // NO `requested` marker, NO STARTED fact, the op_id NOT consumed.
        return { kind: "rejected", reason: "runtime_context_provider_unavailable" };
      }
      const requestId = deps.newRequestId();
      mintedRequestIds.push(requestId);
      // S3/S4: provision FIRST — an external async OUTSIDE any transaction.
      // The awaited fulfillment is the DETACH ACKNOWLEDGMENT; a synchronous
      // throw OR a pre-commit-rejecting ack propagates as a PORT BREACH
      // (fail-loud, NO state change — nothing committed yet, the op_id
      // unconsumed).
      await provider.provision(instance.instanceId, requestId, requirement.spec);
      // S3: the L0d single-shot marker + the STARTED fact in ONE atomic move;
      // status stays CREATED (= v1 PREPARING_WORKSPACE).
      const result = await deps.store.commitLifecycle({
        instanceId: instance.instanceId,
        expectedVersion: instance.version,
        fact: { kind: "STARTED", opId: input.opId },
        newKernelStatus: "CREATED",
        newTerminalDisposition: null,
        newWait: null,
        newRuntimeContext: { state: "requested", requestId },
      });
      switch (result.kind) {
        case "duplicate_op":
          return { kind: "duplicate" };
        case "op_id_collision":
          return { kind: "rejected", reason: "op_id_collision" };
        case "cas_conflict":
          // S5: this attempt is superseded — conclude it NOW (per-attempt
          // release, before the next attempt provisions under a FRESH id); a
          // buffered completion delivers inert by correlation (K3).
          await deps.concludeAttempt(requestId);
          continue;
        case "committed":
          return { kind: "accepted" };
      }
    }
  } finally {
    // SM3 leak-proof backstop: flush every minted id NOT already released at
    // its own attempt's conclusion (the committed/rejected/threw attempt).
    // Idempotent — an already-concluded id is a no-op.
    for (const requestId of mintedRequestIds) {
      await deps.concludeAttempt(requestId);
    }
  }
}

/**
 * l0e-pseudocode/RUNTIME_CONTEXT_READY (packet ch12-p3, K family): the new
 * kernel event handler — in-process only (no external ingress, C13); driven
 * by the completion seam or directly by tests. The checks run in ONE ORDER
 * (K2): the ADMISSION rungs FIRST — terminal-sink (`kernel_status ≠ TERMINAL`
 * — a late READY after CANCEL/FAIL must not resurrect the run) then
 * correlation (`runtime_context = requested(request_id)` — the readiness for
 * the request WE issued); a rung-rejected event is INERT (`ignored`, mutates
 * NOTHING). THEN the ref's transport gate (canonical-JSON-safety, PR4 —
 * breach = integrity throw), THEN the `required(spec)` bind (structurally
 * satisfied — a request was issued ⇒ required), THEN the ONLY business
 * validation: the kind boundary (`ref.kind = spec.kind`; a mismatch is inert,
 * NO state change — the LOCATOR is provider-defined, NEVER validated). An
 * accepted readiness commits `ready(ref)` and continues into the SHARED
 * `activate_or_hold` fork.
 */
export async function runtimeContextReady(
  deps: ReadyDeps,
  instanceId: InstanceId,
  requestId: string,
  ref: RuntimeContextRef,
): Promise<RuntimeContextReadyOutcome> {
  for (;;) {
    const instance = await deps.store.loadInstance(instanceId);
    if (instance === null) {
      // L8: an in-process event answered with an inert rejection is
      // droppable without a crash (the C15 event-anomaly semantics).
      return { kind: "rejected", reason: "unknown_instance" };
    }
    // K2 admission rung 1 — terminal-sink (inert).
    if (instance.kernelStatus === "TERMINAL") {
      return { kind: "ignored" };
    }
    // K2 admission rung 2 — correlation (inert: duplicate / unsolicited /
    // already-resolved / requested-of-a-different-id all fail here, K3).
    if (
      instance.runtimeContext.state !== "requested" ||
      instance.runtimeContext.requestId !== requestId
    ) {
      return { kind: "ignored" };
    }
    // K2 transport gate (PR4): the ref must be canonical-JSON-safe — a
    // violating provider return is a kernel/config integrity throw.
    deps.assertRefCanonical(instanceId, requestId, ref);
    const template = await loadPinnedTemplate(deps.definitions, instance);
    // K2 required(spec) bind: made explicit — a request was issued ⇒ a
    // context is required (structurally satisfied; START only sets the marker
    // on the required path).
    const requirement = resolveRuntimeContextRequirement(template.runtimeContext);
    if (requirement.state !== "required") {
      throw new Error(
        `kernel integrity: instance '${instanceId}' carries requested() but its pinned template declares no runtime context`,
      );
    }
    // K2 kind boundary — the ONLY business validation (inert on mismatch, no
    // state change; the run stays requested).
    if (ref.kind !== requirement.spec.kind) {
      return { kind: "ignored" };
    }
    // K4 accepted readiness: ready(ref) + activate_or_hold (fact: null — a
    // kernel event carries no op fact).
    const result = await activateOrHold(deps, {
      instance,
      template,
      newRuntimeContext: { state: "ready", ref },
      fact: null,
      expectedVersion: instance.version,
    });
    if (result.kind === "restart") {
      continue;
    }
    if (result.kind === "duplicate" || result.kind === "rejected") {
      // Structurally unreachable: a fact-less commit consumes no idempotency key.
      throw new Error(
        `kernel integrity: fact-less RUNTIME_CONTEXT_READY commit reported '${result.kind}' for instance '${instanceId}'`,
      );
    }
    return result;
  }
}

/**
 * l0d-pseudocode/KICKOFF (L4): the deferred task supplied now — ONE
 * atomic commit composing the task supply and activation (the unit's
 * "activate commits it"): task + wait cleared (S5's same-move rule) +
 * the L7 activation write-set + the TASK_SUPPLIED fact. The supplied
 * task OVERWRITES a create-time task (C13).
 */
export async function kickoff(
  deps: LifecycleDeps,
  input: KickoffInput,
): Promise<KickoffOutcome> {
  for (;;) {
    const instance = await deps.store.loadInstance(input.instanceId);
    if (instance === null) {
      return { kind: "rejected", reason: "unknown_instance" };
    }
    const existing = await deps.store.findOp(input.instanceId, input.opId);
    const admitted = admitLifecycle({
      op: { existing, factKind: "TASK_SUPPLIED" },
      stateHolds:
        instance.kernelStatus === "WAITING" && instance.wait?.kind === "kickoff_pending",
    });
    if (admitted.kind === "duplicate") {
      return { kind: "duplicate" };
    }
    if (admitted.kind === "rejected") {
      return admitted;
    }
    if (admitted.kind === "state_violation") {
      throw new Error(
        `kickoff failed (hold guard): instance '${input.instanceId}' is not WAITING(kickoff_pending)`,
      );
    }
    const template = await loadPinnedTemplate(deps.definitions, instance);
    const result = await deps.store.commitLifecycle({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      fact: { kind: "TASK_SUPPLIED", opId: input.opId },
      newKernelStatus: "ACTIVE",
      newTerminalDisposition: null,
      newWait: null,
      newCurrentStep: template.start,
      newRound: 1,
      newTask: input.task,
    });
    switch (result.kind) {
      case "duplicate_op":
        return { kind: "duplicate" };
      case "op_id_collision":
        return { kind: "rejected", reason: "op_id_collision" };
      case "cas_conflict":
        continue;
      case "committed":
        // The post-commit half of activate (L7).
        return activate(
          {
            ...instance,
            task: input.task,
            kernelStatus: "ACTIVE",
            currentStep: template.start,
            round: 1,
            wait: null,
            version: result.version,
          },
          template,
          deps.providerRegistry,
        );
    }
  }
}

/**
 * l0d-pseudocode/CANCEL (L5): terminal disposal from ANY non-terminal
 * state — TERMINAL + `cancelled` + wait cleared + the CANCELLED fact,
 * one move. A replayed CANCEL is Duplicate BEFORE the sink guard (A3).
 */
export async function cancel(deps: LifecycleDeps, input: CancelInput): Promise<CancelOutcome> {
  for (;;) {
    const instance = await deps.store.loadInstance(input.instanceId);
    if (instance === null) {
      return { kind: "rejected", reason: "unknown_instance" };
    }
    const existing = await deps.store.findOp(input.instanceId, input.opId);
    const admitted = admitLifecycle({
      op: { existing, factKind: "CANCELLED" },
      stateHolds: instance.kernelStatus !== "TERMINAL",
    });
    if (admitted.kind === "duplicate") {
      return { kind: "duplicate" };
    }
    if (admitted.kind === "rejected") {
      return admitted;
    }
    if (admitted.kind === "state_violation") {
      throw new Error(
        `cancel failed (terminal sink): instance '${input.instanceId}' is already TERMINAL — terminal is a sink`,
      );
    }
    const result = await deps.store.commitLifecycle({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      fact: { kind: "CANCELLED", opId: input.opId },
      newKernelStatus: "TERMINAL",
      newTerminalDisposition: "cancelled",
      newWait: null,
    });
    switch (result.kind) {
      case "duplicate_op":
        return { kind: "duplicate" };
      case "op_id_collision":
        return { kind: "rejected", reason: "op_id_collision" };
      case "cas_conflict":
        continue;
      case "committed":
        return { kind: "terminated", disposition: "cancelled" };
    }
  }
}

/**
 * l0d-pseudocode/FAIL (L6): kernel event — in-process only, no ingress
 * endpoint, no op_id, and NO fact row (the op_id-fact rule binds
 * op-carrying intents; FAIL carries none). At P1b nothing in
 * production fires it (C15's no-channel Absent) — tests drive it
 * directly; P3's composition seam is its first production caller.
 */
export async function fail(
  deps: LifecycleDeps,
  instanceId: InstanceId,
  reason: string,
): Promise<FailOutcome> {
  for (;;) {
    const instance = await deps.store.loadInstance(instanceId);
    if (instance === null) {
      // L8: an in-process event answered with an inert rejection is
      // droppable without a crash (the C15 event-anomaly semantics).
      return { kind: "rejected", reason: "unknown_instance" };
    }
    const admitted = admitLifecycle({
      op: null,
      stateHolds: instance.kernelStatus !== "TERMINAL",
    });
    if (admitted.kind === "state_violation") {
      throw new Error(
        `fail rejected (terminal sink): instance '${instanceId}' is already TERMINAL — terminal is a sink`,
      );
    }
    const result = await deps.store.commitLifecycle({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      fact: null,
      newKernelStatus: "TERMINAL",
      newTerminalDisposition: "failed",
      newWait: null,
      newFailureReason: reason,
    });
    switch (result.kind) {
      case "duplicate_op":
      case "op_id_collision":
        // Structurally unreachable: a fact-less commit consumes no key.
        throw new Error(
          `kernel integrity: fact-less FAIL commit reported '${result.kind}' for instance '${instanceId}'`,
        );
      case "cas_conflict":
        continue;
      case "committed":
        return { kind: "terminated", disposition: "failed" };
    }
  }
}

/**
 * G2 reason-domain membership gate (packet ch9-p1; contract:ch9-runner#C3/#C5):
 * PURE, at the completion's own transport gate AFTER the rungs — an unknown
 * `reason` token (outside the closed domain, INCLUDING a non-string wire value)
 * is a kernel/config INTEGRITY THROW, fail-closed, NEVER stored. Typed over
 * `unknown` (the wire is untrusted) and narrows to the closed enum.
 */
function assertReasonInDomain(
  instanceId: InstanceId,
  requestId: string,
  reason: unknown,
): asserts reason is ProvisioningFailureReason {
  if (
    typeof reason !== "string" ||
    !(PROVISIONING_FAILURE_REASONS as readonly string[]).includes(reason)
  ) {
    throw new Error(
      `kernel integrity: runtime-context failure reason for instance '${instanceId}' (request '${requestId}') is outside the closed provisioning-failure domain (transport gate): ${String(reason)}`,
    );
  }
}

/**
 * G3 detail string-gate (packet ch9-p1; contract:ch9-runner#C4/#C5): PURE,
 * the SAME gate point — a PRESENT `detail` that is not a plain string is the
 * same fail-closed integrity throw (a string is trivially canonical-JSON-safe,
 * so no digest gate is needed). `detail` is untrusted-confined: NEVER parsed,
 * NEVER matched against any token domain, NEVER stored in `failure_reason`.
 */
function assertDetailWellFormed(instanceId: InstanceId, requestId: string, detail: unknown): void {
  if (detail !== undefined && typeof detail !== "string") {
    throw new Error(
      `kernel integrity: runtime-context failure detail for instance '${instanceId}' (request '${requestId}') is present but not a string (transport gate)`,
    );
  }
}

/**
 * l0d-pseudocode/FAIL channel — the correlated RUNTIME_CONTEXT_FAILED handler
 * (packet ch9-p1, F family; contract:ch9-runner#C1–#C5): the NEW kernel event
 * beside `fail` — in-process only (C13, no ingress), driven by the completion
 * seam or directly by tests. It carries NO ref and loads NO template: a failure
 * report needs only IDENTITY (the rungs) and CLASSIFICATION (the gate). The
 * checks run in the ch12-C18 ORDER (F1): load the instance (a vanished instance
 * → the inert `rejected(unknown_instance)`, the L8 droppable-event culture);
 * ADMISSION rung 1 — terminal-sink (`kernel_status ≠ TERMINAL`); rung 2 —
 * correlation (`runtime_context = requested(request_id)`); a rung-rejected
 * completion returns `ignored`, mutates NOTHING, and its payload is NEVER
 * inspected (one outcome per event). THEN the transport gate (AFTER the rungs,
 * BEFORE the commit): the G2 reason-domain membership check + the G3 detail
 * string-gate — a violation is a fail-closed integrity throw, never stored. An
 * ADMITTED completion commits the EXISTING `FAIL` disposition atomically (F2 —
 * the built `fail` shape): `kernel_status → TERMINAL`, `terminal_disposition =
 * failed`, `failure_reason ← reason`, wait cleared, NO fact row; the
 * `runtime_context` marker is NOT written — it keeps `requested(request_id)` as
 * diagnostic state (the terminal disposition IS the record). A CAS conflict
 * restarts from load (F4 — a concurrently-terminal or -resolved run then
 * rung-rejects inert on fresh state).
 */
export async function runtimeContextFailed(
  deps: LifecycleDeps,
  instanceId: InstanceId,
  requestId: string,
  reason: string,
  detail?: unknown,
): Promise<RuntimeContextFailedOutcome> {
  for (;;) {
    const instance = await deps.store.loadInstance(instanceId);
    if (instance === null) {
      // F1/L8: an in-process event answered with an inert rejection is
      // droppable without a crash (the C15 event-anomaly semantics).
      return { kind: "rejected", reason: "unknown_instance" };
    }
    // F1 admission rung 1 — terminal-sink (inert). A late FAILED after a
    // concurrent CANCEL/FAIL took the run TERMINAL must not resurrect it; and
    // after a FAILED-first admission this rung rejects the second FAILED (F3c —
    // the run is already TERMINAL, C2 kept the marker `requested`, so
    // correlation alone would still pass: the terminal-sink rung is load-bearing).
    if (instance.kernelStatus === "TERMINAL") {
      return { kind: "ignored" };
    }
    // F1 admission rung 2 — correlation (inert: a completion for a superseded /
    // different request_id, and — after a READY-first admission — the marker
    // moved to `ready(ref)` so `requested(request_id)` no longer holds, F3a).
    if (
      instance.runtimeContext.state !== "requested" ||
      instance.runtimeContext.requestId !== requestId
    ) {
      return { kind: "ignored" };
    }
    // G2/G3 transport gate — AFTER the rungs, BEFORE the commit (a rung-rejected
    // completion's payload is never inspected; one outcome per event): the
    // reason-domain membership check + the detail string-gate. Fail-closed — a
    // violation throws with ZERO state change (no partial write, no
    // `failure_reason` pollution).
    assertReasonInDomain(instanceId, requestId, reason);
    assertDetailWellFormed(instanceId, requestId, detail);
    // F2 admitted FAIL commit: ONE atomic commitLifecycle (the built `fail`
    // shape) — TERMINAL + failed + `failure_reason ← reason` + wait cleared +
    // NO fact (a kernel event carries no op fact). The `runtime_context` field
    // is NOT written: the marker keeps `requested(request_id)` as diagnostic
    // state (do NOT "clean up" — the terminal disposition IS the record).
    const result = await deps.store.commitLifecycle({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      fact: null,
      newKernelStatus: "TERMINAL",
      newTerminalDisposition: "failed",
      newWait: null,
      newFailureReason: reason,
    });
    switch (result.kind) {
      case "duplicate_op":
      case "op_id_collision":
        // Structurally unreachable: a fact-less commit consumes no idempotency key.
        throw new Error(
          `kernel integrity: fact-less RUNTIME_CONTEXT_FAILED commit reported '${result.kind}' for instance '${instanceId}'`,
        );
      case "cas_conflict":
        // F4: this attempt raced a concurrent commit — restart from load and
        // re-run the rungs on fresh state (a now-terminal / now-resolved run
        // rung-rejects inert).
        continue;
      case "committed":
        return { kind: "terminated", disposition: "failed" };
    }
  }
}
