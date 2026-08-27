import type { DefinitionStore } from "../ports/index.js";
import type { WorkflowInstance, WorkflowTemplate } from "../domain/index.js";

/**
 * The KERNEL-INTERNAL pinned-template load (packet ch14-p2b, the site
 * grid's loader duty).
 *
 * The loader lived as a module-private `loadTemplate` in `kernel.ts`,
 * and `lifecycle.ts` carried `loadPinnedTemplate` — a body identical
 * but for its NAME and ONE comment line, with the throw string
 * byte-identical. The submit path's load now sits in the operator-intent
 * module, so the loader must be reachable from a third place, and a
 * THIRD COPY is refused.
 *
 * EXPORTING IT FROM `kernel.ts` IS REFUSED and the refusal is measured
 * rather than stylistic: `kernel.ts` must import the operator-intent
 * module to wire the two handlers into the kernel object, so an
 * operator-intent import of `./kernel.js` would close a CYCLE.
 * `lifecycle.ts` is the living demonstration of why the tree took the
 * copy route instead — it is imported BY `kernel.ts` and imports nothing
 * back. So the loader MOVES here, to a module every caller may import
 * and which imports no kernel module itself.
 *
 * The ref was pinned at create — a missing definition is an INTEGRITY
 * failure, not a rejection (the P1 matrix). The throw string is carried
 * BYTE-UNCHANGED from both former copies: it is asserted by existing
 * lanes on both paths, and moving a message while moving a function
 * would make one edit look like two.
 */
export async function loadPinnedTemplate(
  definitions: DefinitionStore,
  instance: WorkflowInstance,
): Promise<WorkflowTemplate> {
  const template = await definitions.load(instance.templateRef);
  if (template === null) {
    throw new Error(
      `kernel integrity: pinned template '${instance.templateRef.id}@${String(instance.templateRef.version)}' not found`,
    );
  }
  return template;
}
