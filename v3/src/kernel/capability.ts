import type { EventType, RoleName, StepId, WorkflowTemplate } from "../domain/index.js";

/**
 * l1-pseudocode/capability (packet ch11-P1): role × step → allowed
 * action set. An explicit profile entry is returned UNCONDITIONALLY
 * (an explicit empty list blocks everything for that pair — C6);
 * absent a profile, the OWN role default-derives the step's
 * transition event types and any other role derives the empty set.
 * `not_authorized` stays dormant under default derivation — the
 * profile channel (type-level, test-constructed values) drives it.
 *
 * Every record lookup is OWN-PROPERTY-guarded (the ch11-P1 arm-gate-2
 * catch, the ch8-P1 `__proto__` lesson's kernel-side face): the
 * validated format legally admits ids like `__proto__` or
 * `constructor`, and an unguarded index would read INHERITED members
 * — a phantom profile entry, or the prototype object itself.
 */
function ownEntry<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

export function capability(
  template: WorkflowTemplate,
  role: RoleName,
  stepId: StepId,
): readonly EventType[] {
  const profile = ownEntry(ownEntry(template.capabilityProfile, role), stepId);
  if (profile !== undefined) {
    return profile;
  }
  const step = ownEntry(template.steps, stepId);
  // K11 (ch14-p2a) — THE SILENT CELL, written out because the compiler
  // cannot surface it: with `role` optional, `role === step.role` is
  // false for every role-less step, so the fall-through below would
  // hand back an EMPTY capability set without anything looking wrong.
  // The role-less answer IS empty at this packet (a gate's vocabulary
  // is `decisions`, routed at p2b), but it is empty BY CLASS and not by
  // a failed comparison, so the branch says which.
  if (step !== undefined && step.role !== undefined && role === step.role) {
    return Object.keys(step.transitions ?? {});
  }
  return [];
}
