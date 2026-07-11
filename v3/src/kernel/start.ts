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
  const instance: WorkflowInstance = {
    instanceId: input.instanceId,
    templateRef: input.templateRef,
    task: input.task,
    binding,
    currentStep: template.start,
    round: 1,
    status: "RUNNING",
    version: 1,
  };
  await deps.store.createInstance(instance);
  // Derive AFTER the commit — commit ≠ deliver; the intent is a value.
  const intent = deriveDispatchIntent(instance, template, template.start);
  return { kind: "started", instanceId: instance.instanceId, version: 1, intent };
}
