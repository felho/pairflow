import type { TemplateRef, WorkflowTemplate } from "../domain/index.js";

/**
 * The definition store — a SEPARATE port from StorePort (the model:
 * "separate store; pinned immutable version"); the separation + the
 * pinned ref realize the l0a/definition-store invariant (type/schema).
 * Loads exactly the version asked; NO "latest" API — pinned-only by
 * the ch-8 ratification (plan §8.5): latest-resolution is L0f
 * semantics, re-homed to the future L0f chapter.
 *
 * null at START = start-side failure (no state, no invented rejection
 * name); null at HANDLE = integrity error (the ref was pinned at
 * create) — the kernel throws.
 *
 * The load Promise MAY REJECT by type (ch8-P1 / draft C28): a PRESENT
 * but invalid-or-unreadable definition rejects with the store's typed
 * error — never conflated with the absent-`null` disposition. Callers
 * propagate it; the mapping to an operator surface is the CLI's.
 */
export interface DefinitionStore {
  load(ref: TemplateRef): Promise<WorkflowTemplate | null>;
}
