import type { EventType, RoleName, StepId, WorkflowTemplate } from "../domain/index.js";

/**
 * l1-pseudocode/capability (packet ch11-P1): role × step → allowed
 * action set. An explicit profile entry is returned UNCONDITIONALLY
 * (an explicit empty list blocks everything for that pair — C6);
 * absent a profile, the OWN role default-derives the step's
 * transition event types and any other role derives the empty set.
 * `not_authorized` stays dormant under default derivation — the
 * profile channel (type-level, test-constructed values) drives it.
 */
export function capability(
  template: WorkflowTemplate,
  role: RoleName,
  stepId: StepId,
): readonly EventType[] {
  const profile = template.capabilityProfile?.[role]?.[stepId];
  if (profile !== undefined) {
    return profile;
  }
  const step = template.steps[stepId];
  if (step !== undefined && role === step.role) {
    return Object.keys(step.transitions);
  }
  return [];
}
