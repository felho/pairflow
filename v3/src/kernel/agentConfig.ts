import type { AgentConfig, StepId, WorkflowInstance, WorkflowTemplate } from "../domain/index.js";

/**
 * l0c-pseudocode/resolve_agent_config (packet ch12-p2, R1–R4) — the run
 * profile cascade. A PURE, TOTAL, DETERMINISTIC function over immutable
 * sources: it cascades three layers LEFT-to-RIGHT,
 *
 *   role.defaultAgentConfig ⊕ step.agentConfig ⊕ instance.runOverrides[step]
 *
 * each defaulting to the empty map `{}`. No I/O, no clock, no state; the
 * inputs are never mutated and a FRESH map is returned (so the
 * dispatch-time and commit-time computations agree byte-identically by
 * construction — deterministic provenance).
 *
 * The resolved value is an `AgentConfig` — a MAP, raw and format-OPEN,
 * no field kernel-interpreted (C7). It lives in its OWN module (not a
 * private helper of either call site) because BOTH the dispatch
 * projection (`effective_agent_config`) and the commit provenance
 * (`issued_agent_config`) resolve through it — a shared pure unit whose
 * codeRef is the l0c unit's home (D1).
 */
export function resolveAgentConfig(
  template: WorkflowTemplate,
  stepId: StepId,
  instance: WorkflowInstance,
): AgentConfig {
  const step = template.steps[stepId];
  const roleDefault =
    step === undefined ? undefined : template.roles[step.role]?.defaultAgentConfig;
  const stepConfig = step?.agentConfig;
  // R4: a step with no override entry (or an override for a non-step key)
  // reads as `undefined` here and contributes `{}` — the override is inert.
  const override = instance.runOverrides[stepId];
  return mergeAgentConfig(mergeAgentConfig(roleDefault, stepConfig), override);
}

/**
 * The SHALLOW, RIGHT-BIASED merge at TOP-LEVEL-KEY grain (R2): for every
 * key present in `over` the value REPLACES the base value WHOLESALE — a
 * scalar overwrites, an array or map REPLACES (never deep-merged), an
 * authored `null` is a value that overwrites (no deletion semantics). A
 * key present only in `base` survives. A missing layer defaults to `{}`.
 * The spread returns a FRESH object and never mutates its inputs (R3).
 */
function mergeAgentConfig(
  base: AgentConfig | undefined,
  over: AgentConfig | undefined,
): AgentConfig {
  return { ...(base ?? {}), ...(over ?? {}) };
}
