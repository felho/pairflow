import type {
  ActivationMode,
  ActorId,
  CancelOutcome,
  CreateOutcome,
  FailOutcome,
  InstanceId,
  KickoffOutcome,
  OpId,
  RoleName,
  RuntimeContext,
  StartOutcome,
  TemplateRef,
  WaitReason,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
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
  /** The interim window carrier (L3) — the ch11-P3b seam's ready-ref,
   * re-homed onto START for the P1b–P3 window; retires at P3 (C14). */
  readonly runtimeContextRef?: string;
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
 * L3 (packet ch12-p1b): the interim window context lanes — the
 * ch11-P3b lane table RE-HOMED onto START byte-for-byte; runs
 * POST-admission, PRE-commit (a throw = no state change, the op_id
 * unconsumed). Retirement is P3's (C14 — the wire key, the CLI eager
 * guard, and the behavior-level reconciliation).
 *   undeclared + ref ABSENT  → `ready(∅)` (C18's none lane)
 *   undeclared + ref PRESENT → THROW (surplus input — fail-closed)
 *   "required" + ref PRESENT → ready({kind: "worktree", locator}) (X1)
 *   "required" + ref ABSENT  → THROW (the provider machinery is P3's)
 *   empty-string ref         → THROW on every lane (the value grammar)
 */
function resolveWindowContext(
  template: WorkflowTemplate,
  ref: string | undefined,
): RuntimeContext {
  if (ref === "") {
    throw new Error(
      "start failed (runtime context): runtimeContextRef must be a nonempty string — '' is not a ref and not null",
    );
  }
  const declared = template.runtimeContext === "required";
  if (declared) {
    if (ref === undefined) {
      throw new Error(
        "start failed (runtime context): template declares runtimeContext 'required' but no runtimeContextRef was supplied — " +
          "the provider machinery arrives at P3; supply a ready ref, or the run is unstartable in this window",
      );
    }
    return { state: "ready", ref: { kind: "worktree", locator: ref } };
  }
  if (ref !== undefined) {
    throw new Error(
      "start failed (runtime context): a runtimeContextRef was supplied for a context-free workflow (no runtimeContext declaration) — " +
        "surplus input has zero consuming paths; fail-closed rather than silently drop it",
    );
  }
  return { state: "ready", ref: null };
}

/**
 * l0d-pseudocode/activate (L7): internal — never routed, never exported
 * as a handler. The activation WRITE-SET (ACTIVE + template.start +
 * round 1) rides the CALLER's atomic commit; this function is the
 * post-commit half — the readiness REQUIRE (readiness gates dispatch;
 * structurally satisfied at every P1b call site, guarded FAIL-LOUD —
 * the E4 pattern) and the first dispatch derived from COMMITTED state
 * (commit ≠ deliver).
 */
function activate(
  committed: WorkflowInstance,
  template: WorkflowTemplate,
): { readonly kind: "activated"; readonly instanceId: InstanceId; readonly version: number; readonly intent: ReturnType<typeof deriveDispatchIntent> } {
  if (committed.runtimeContext.state !== "ready" || committed.task === null) {
    throw new Error(
      `kernel integrity: activation of instance '${committed.instanceId}' without a ready context and task (readiness gates dispatch)`,
    );
  }
  const intent = deriveDispatchIntent(committed, template, template.start);
  return {
    kind: "activated",
    instanceId: committed.instanceId,
    version: committed.version,
    intent,
  };
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
 * l0d-pseudocode/START (L2/L3): single-shot provisioning-or-hold. The
 * none-requirement path resolves `ready(∅)` (or the window's seam ref)
 * and continues INTO the activate_or_hold fork on the instance's
 * snapshotted mode; EVERY successful START commits the STARTED fact in
 * the SAME atomic move (the op_id's consumption record — C12). The
 * provider legs (spec form, `requested` marker) are P3's.
 */
export async function start(deps: LifecycleDeps, input: StartInput): Promise<StartOutcome> {
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
    const context = resolveWindowContext(template, input.runtimeContextRef);
    if (instance.activationMode === "immediate") {
      // The composed activation commit (L2/L7): ACTIVE + template.start
      // + round 1 + the resolved context + the STARTED fact, one move.
      const result = await deps.store.commitLifecycle({
        instanceId: instance.instanceId,
        expectedVersion: instance.version,
        fact: { kind: "STARTED", opId: input.opId },
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
        newCurrentStep: template.start,
        newRound: 1,
        newRuntimeContext: context,
      });
      switch (result.kind) {
        case "duplicate_op":
          return { kind: "duplicate" };
        case "op_id_collision":
          return { kind: "rejected", reason: "op_id_collision" };
        case "cas_conflict":
          continue;
        case "committed":
          // The post-commit half of activate (L7) — derive AFTER the
          // commit, from committed state.
          return activate(
            {
              ...instance,
              kernelStatus: "ACTIVE",
              currentStep: template.start,
              round: 1,
              runtimeContext: context,
              wait: null,
              version: result.version,
            },
            template,
          );
      }
    }
    // deferred_kickoff: the hold commit — WAITING(kickoff_pending) +
    // the resolved context + the STARTED fact, one move (L2/T3).
    const result = await deps.store.commitLifecycle({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      fact: { kind: "STARTED", opId: input.opId },
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: KICKOFF_WAIT,
      newRuntimeContext: context,
    });
    switch (result.kind) {
      case "duplicate_op":
        return { kind: "duplicate" };
      case "op_id_collision":
        return { kind: "rejected", reason: "op_id_collision" };
      case "cas_conflict":
        continue;
      case "committed":
        return { kind: "accepted" };
    }
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
