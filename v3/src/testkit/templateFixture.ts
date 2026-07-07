import type { TemplateRef, WorkflowTemplate } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";

/**
 * MD-1 — declared migration debt (plan §1.3): the walking skeleton
 * instantiates from this FIXTURE-FORM template so the skeleton stays
 * thin. The canonical authoring format lands in chapter 8, which MUST
 * migrate this fixture onto it and retire MD-1.
 *
 * Shape: the model's local-pair-v0 — implement ⇄ review with
 * PASS/CONVERGED navigation, defaults implementer→codex,
 * reviewer→claude (the l0b trace's binding snapshot).
 */
export function fixtureTemplate(): WorkflowTemplate {
  return {
    ref: { id: "local-pair-v0", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review" },
      },
      review: {
        role: "reviewer",
        instruction: "review it",
        transitions: { PASS: "implement", CONVERGED: "done" },
      },
    },
    terminal: ["done"],
    roles: {
      implementer: { defaultActor: "codex" },
      reviewer: { defaultActor: "claude" },
    },
  };
}

/**
 * In-memory pinned DefinitionStore fixture: loads exactly the
 * { id, version } asked, nothing else — the "separate store; pinned
 * immutable version" seam without a persistence substrate.
 */
export function fixtureDefinitionStore(
  ...templates: readonly WorkflowTemplate[]
): DefinitionStore {
  const byRef = new Map<string, WorkflowTemplate>(
    templates.map((template) => [refKey(template.ref), template]),
  );
  return {
    load(ref: TemplateRef): Promise<WorkflowTemplate | null> {
      return Promise.resolve(byRef.get(refKey(ref)) ?? null);
    },
  };
}

function refKey(ref: TemplateRef): string {
  return `${ref.id}@${String(ref.version)}`;
}
