import type {
  ContextPacket,
  DispatchIntent,
  RuntimeContextProjection,
  StepId,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import { resolveRuntimeContextRequirement } from "../domain/index.js";
import type { ProviderRegistry } from "../ports/runtimeContextProvider.js";
import { resolveAgentConfig } from "./agentConfig.js";

/**
 * l0e-pseudocode/dispatch_intent (packet ch12-p3, E1/E2; completing
 * l0d-pseudocode/dispatch_intent) — derived from COMMITTED state, after the
 * commit (commit ≠ deliver; the store never delivers). The actor is
 * guaranteed present by the start invariant (binding coverage). `handoff` is
 * the payload of the envelope that brought us here; absent at start.
 *
 * The `runtime_context` projection leg: `ready(∅)` → the packet's explicit
 * `none`; a provisioned `ready(ref)` → `projectForActor(ref)` resolved
 * through the SAME pinned-template provider that issued the request (a failed
 * re-resolve is a kernel/config INVARIANT throw — `registry-stable-for-the-run`,
 * E2), carried OPAQUELY; the raw ref stays kernel-side
 * (`projection-never-the-ref`). `projectForActor` is synchronous (PR1), so
 * this stays sync.
 */
export function deriveDispatchIntent(
  instance: WorkflowInstance,
  template: WorkflowTemplate,
  stepId: StepId,
  providerRegistry: ProviderRegistry,
  handoff?: unknown,
): DispatchIntent {
  const step = template.steps[stepId];
  if (step === undefined) {
    throw new Error(`kernel integrity: dispatch target step '${stepId}' has no definition`);
  }
  const actor = instance.binding[step.role];
  if (actor === undefined) {
    throw new Error(
      `kernel integrity: role '${step.role}' unbound — the start invariant should have failed`,
    );
  }
  // G2 (packet ch12-p1b): every dispatch site is task-guaranteed
  // (activate REQUIREs the task; HANDLE dispatches only ACTIVE runs) —
  // a NULL here is integrity drift, never a business state.
  if (instance.task === null) {
    throw new Error(
      `kernel integrity: dispatch for instance '${instance.instanceId}' with a NULL task (readiness gates dispatch)`,
    );
  }
  const packet: ContextPacket = {
    instanceId: instance.instanceId,
    expectedVersion: instance.version,
    task: instance.task,
    // Dispatched-as role (l1) — echoed back as expectedRole.
    role: step.role,
    instruction: step.instruction,
    ...(handoff !== undefined ? { handoff } : {}),
    availableOps: Object.keys(step.transitions),
    // E1 (packet ch12-p2): the resolved run profile, ALWAYS present (a
    // map, possibly `{}`) — replaces the L0b conditional raw agentConfig
    // pass-through spread.
    effectiveAgentConfig: resolveAgentConfig(template, stepId, instance),
    // E1/E2 (packet ch12-p3): the runtime-context projection — `none` for a
    // context-free run, the provider's opaque projection for a provisioned one.
    runtimeContext: projectRuntimeContext(instance, template, providerRegistry),
  };
  return { actor, packet };
}

/**
 * E1/E2 (packet ch12-p3): the packet's `runtime_context` value. Dispatch runs
 * only for an ACTIVE (ready) run; `ready(∅)` (ref null) is the context-free
 * `none`, a provisioned `ready(ref)` projects through the SAME pinned-template
 * provider (a failed re-resolve is a `registry-stable-for-the-run` invariant
 * throw — a kernel/config error, never a business rejection). The raw ref
 * never enters the packet (`projection-never-the-ref`).
 */
function projectRuntimeContext(
  instance: WorkflowInstance,
  template: WorkflowTemplate,
  providerRegistry: ProviderRegistry,
): RuntimeContextProjection | "none" {
  const rc = instance.runtimeContext;
  if (rc.state !== "ready") {
    // Dispatch happens post-activation (ready gates dispatch) — a non-ready
    // context here is integrity drift, never a business state.
    throw new Error(
      `kernel integrity: dispatch for instance '${instance.instanceId}' with a non-ready runtime context (readiness gates dispatch)`,
    );
  }
  if (rc.ref === null) {
    return "none";
  }
  const requirement = resolveRuntimeContextRequirement(template.runtimeContext);
  if (requirement.state !== "required") {
    throw new Error(
      `kernel integrity: instance '${instance.instanceId}' has a provisioned runtime-context ref but its pinned template declares no runtime context`,
    );
  }
  const provider = providerRegistry.resolve(requirement.spec.provider);
  if (provider === null) {
    // E2 registry-stable-for-the-run: a provider used by an active instance
    // stays resolvable for the life of the run — a kernel/config INVARIANT
    // throw, NOT a business rejection.
    throw new Error(
      `kernel integrity: provider '${requirement.spec.provider}' for active instance '${instance.instanceId}' is no longer resolvable (the registry must stay stable for the life of the run)`,
    );
  }
  return provider.projectForActor(rc.ref);
}
