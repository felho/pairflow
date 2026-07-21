import type {
  ActorId,
  RoleName,
  Started,
  TemplateRef,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { StorePort } from "../ports/store.js";
import { deriveDispatchIntent } from "./dispatchIntent.js";

/**
 * l0b-pseudocode/START_INSTANCE (packet ch4-P4). Start-side failures
 * (unknown ref, binding coverage) THROW before any state exists — they
 * are not envelope rejections and carry NO invented rejection name
 * (plan §4.1). The caller mints instanceId (P1 matrix).
 */
export interface StartInstanceInput {
  readonly instanceId: string;
  readonly templateRef: TemplateRef;
  readonly task: string;
  readonly startOverrides?: Readonly<Record<RoleName, ActorId>>;
  /**
   * S2 (packet ch11-P3b): the OPTIONAL ready workspace ref (a nonempty
   * string — the testkit-injected ready ref; plan §11.1 item 4). The lane
   * table (`resolveRuntimeContext`) is decided by `template.runtimeContext`.
   */
  readonly runtimeContextRef?: string;
}

/**
 * S2/S3 (packet ch11-P3b): the start-seam runtime-context lane table, decided
 * by `template.runtimeContext` (C18's declaration). Start-side throws carry NO
 * invented rejection name (plan §4.1) — they fail at START, not mid-run.
 *   declared "required" + ref present → `ready(ref)`
 *   declared "required" + ref ABSENT  → THROW (binding-coverage culture)
 *   undeclared + ref ABSENT           → `ready(∅)` (null)
 *   undeclared + ref PRESENT          → THROW (surplus input, S3 — fail-closed)
 *   an EMPTY-STRING ref               → THROW on EVERY lane ('' is not a ref
 *                                       and not null; the value grammar)
 */
function resolveRuntimeContext(
  template: WorkflowTemplate,
  ref: string | undefined,
): string | null {
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
          "supply a ready ref at start; the invariant fails at start, not mid-run",
      );
    }
    return ref;
  }
  if (ref !== undefined) {
    throw new Error(
      "start failed (runtime context): a runtimeContextRef was supplied for a context-free workflow (no runtimeContext declaration) — " +
        "surplus input has zero consuming paths; fail-closed rather than silently drop it",
    );
  }
  return null;
}

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
  // deferred-additive (pointer retired at ch8-P2).
  for (const [stepId, step] of Object.entries(template.steps)) {
    if (binding[step.role] === undefined) {
      throw new Error(
        `start failed (binding coverage): role '${step.role}' (step '${stepId}') is unbound — ` +
          "bind it at start or declare a default actor; the invariant fails at start, not mid-run",
      );
    }
  }
  return binding;
}

export async function startInstance(
  deps: { readonly store: StorePort; readonly definitions: DefinitionStore },
  input: StartInstanceInput,
): Promise<Started> {
  const template = await deps.definitions.load(input.templateRef);
  if (template === null) {
    throw new Error(
      `start failed: template '${input.templateRef.id}@${String(input.templateRef.version)}' not found`,
    );
  }
  const binding = resolveBinding(template, input.startOverrides);
  const resolvedRef = resolveRuntimeContext(template, input.runtimeContextRef);
  // E2 (packet ch12-p1a): the one-shot's INTERIM axis mapping — its
  // single write produces the composed create+activate end state
  // (kernel_status ACTIVE, current_step = template.start, round 1,
  // activation_mode "immediate"); the Started return shape and the
  // throw surface above are byte-unchanged. Retirement is P1b's (C24).
  // X1: the seam ref maps onto the discriminated runtime-context state
  // at this single write site — null IS ready(∅); a seam ref stores
  // ready with the v1 `worktree` kind (the transitional bridge).
  const instance: WorkflowInstance = {
    instanceId: input.instanceId,
    templateRef: input.templateRef,
    task: input.task,
    binding,
    currentStep: template.start,
    round: 1,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    activationMode: "immediate",
    wait: null,
    runtimeContext:
      resolvedRef === null
        ? { state: "ready", ref: null }
        : { state: "ready", ref: { kind: "worktree", locator: resolvedRef } },
    failureReason: null,
    version: 1,
  };
  await deps.store.createInstance(instance);
  // Derive AFTER the commit — commit ≠ deliver; the intent is a value.
  const intent = deriveDispatchIntent(instance, template, template.start);
  return { kind: "started", instanceId: instance.instanceId, version: 1, intent };
}
