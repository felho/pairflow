import type { TemplateRef, WorkflowTemplate } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";

/**
 * MD-1 EXTENDED (packet ch6-P4a): the normal CLI graph cannot import
 * the testkit fixture (ADR-005), yet the kernel needs a DefinitionStore
 * for every handle — so the builtin template is a PRODUCTION COPY of
 * the fixture-form local-pair-v0. The duplication is drift-pinned:
 * templates.test.ts asserts deep-equality against the testkit
 * fixtureTemplate(). Chapter 8 migrates BOTH onto the canonical
 * authoring format and retires this copy with MD-1.
 */
export function builtinTemplate(): WorkflowTemplate {
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

export function builtinDefinitionStore(): DefinitionStore {
  const template = builtinTemplate();
  return {
    load(ref: TemplateRef): Promise<WorkflowTemplate | null> {
      return Promise.resolve(
        ref.id === template.ref.id && ref.version === template.ref.version ? template : null,
      );
    },
  };
}
