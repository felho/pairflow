import type { TemplateRef, WorkflowTemplate } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";

/**
 * MD-1 RETIRED at ch8-P2 (2026-07-11): the canonical authoring file
 * `v3/templates/local-pair-v0@1.yaml` is the SINGLE source of this
 * template. This fixture STAYS for the kit's own consumers and is
 * equality-pinned to the canonical file's parsed form FROM TESTS
 * (`templateFixture.test.ts` — the kit itself never imports
 * `definition/`; the ADR-005 stance is untouched).
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
