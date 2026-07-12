import type {
  ContextPacket,
  DispatchIntent,
  StepId,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";

/**
 * l0b-pseudocode/dispatch_intent — derived from COMMITTED state, after
 * the commit (commit ≠ deliver; the store never delivers). The actor is
 * guaranteed present by the start invariant (binding coverage).
 * `handoff` is the payload of the envelope that brought us here; absent
 * at start. Shared by HANDLE (ch4-P3) and START_INSTANCE (ch4-P4).
 */
export function deriveDispatchIntent(
  instance: WorkflowInstance,
  template: WorkflowTemplate,
  stepId: StepId,
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
  const packet: ContextPacket = {
    instanceId: instance.instanceId,
    expectedVersion: instance.version,
    task: instance.task,
    // Dispatched-as role (l1) — echoed back as expectedRole.
    role: step.role,
    instruction: step.instruction,
    ...(handoff !== undefined ? { handoff } : {}),
    availableOps: Object.keys(step.transitions),
    ...(step.agentConfig !== undefined ? { agentConfig: step.agentConfig } : {}),
  };
  return { actor, packet };
}
