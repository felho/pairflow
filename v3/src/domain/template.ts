import type { ActorId, EventType, RoleName, StepId } from "./ids.js";

/**
 * Template aggregate (ledger §4 l0a + l0b) — the definition, immutable
 * at runtime. A run is pinned to a TemplateRef snapshot { id, version }.
 * Well-formedness VALIDATION is deferred: the ch-4 fixture builds valid
 * templates (MD-1); the format validator is chapter-8 work.
 */
export interface TemplateRef {
  readonly id: string;
  readonly version: number;
}

export interface Step {
  readonly role: RoleName;
  readonly instruction: string;
  /** event_type → target step; every target ∈ steps ∪ terminal. */
  readonly transitions: Readonly<Record<EventType, StepId>>;
  /** Raw optional pass-through until L0c (dispatch_intent unit comment). */
  readonly agentConfig?: unknown;
}

export interface WorkflowTemplate {
  readonly ref: TemplateRef;
  readonly start: StepId;
  readonly steps: Readonly<Record<StepId, Step>>;
  /** "target is terminal" ⇔ listed here. */
  readonly terminal: readonly StepId[];
  /** Actor defaults (l0b): resolve_binding = default_actor + start overrides. */
  readonly roles: Readonly<Record<RoleName, { readonly defaultActor?: ActorId }>>;
}
