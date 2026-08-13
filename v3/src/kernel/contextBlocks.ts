import type {
  BlockId,
  ContextBlock,
  ContextBlockSource,
  StepId,
  WorkflowTemplate,
} from "../domain/index.js";
import { capability } from "./capability.js";

/**
 * l2b-pseudocode/assemble_context_blocks (packet ch13-p1b, D3–D5) — the
 * DETERMINISTIC render: a PURE derivation over the pinned admitted
 * template, called from `deriveDispatchIntent` and nowhere else. Bodies
 * resolve from the admitted catalog only; the result is ordered, deduped
 * by id, and carries every place each block came from.
 *
 * THE SIGNATURE takes the template and the STEP ID — the id rather than
 * the step VALUE because this tree's `Step` carries no id of its own (it
 * is the key of the steps record), and both the authority call and the
 * gate provenance's step field need it. The unit spells a third
 * parameter, the INSTANCE, and READS IT NOWHERE; dropping it satisfies
 * C15's three-input clause (an upper bound on what rendering may DEPEND
 * on, not a floor on arity) and makes C5's forbidden run-scope channel
 * UNREPRESENTABLE here rather than merely prohibited — a compile-time
 * closure where the behavioural one costs fixtures. The call-site half of
 * C5 stays the call site's.
 *
 * Exported from THIS module and deliberately NOT re-exported from the
 * kernel barrel: the mutation boundary is the pin.
 */
export function assembleContextBlocks(
  template: WorkflowTemplate,
  stepId: StepId,
): readonly ContextBlock[] {
  const step = ownEntry(template.steps, stepId);
  if (step === undefined) {
    // The steps read is one of the TWO guarded indexed lookups. Unguarded
    // its failure is a SILENT DEGRADE, not a throw: an inherited member
    // passes an undefined-check, every downstream read yields empty, and
    // the render returns an empty block list instead of aborting.
    throw new Error(
      `kernel integrity: context-block render for step '${stepId}' has no step definition`,
    );
  }
  const catalog = template.contextBlocks;
  const rendered = new Map<BlockId, MutableBlock>();

  // Resolve once; on a repeat only append the provenance source — the
  // FIRST position stands and provenance is never collapsed.
  const emit = (ref: BlockId, source: ContextBlockSource): void => {
    const already = rendered.get(ref);
    if (already !== undefined) {
      already.provenance.sources.push(source);
      return;
    }
    const entry = ownEntry(catalog, ref);
    if (entry === undefined) {
      // C10's abort clause. After admission no lookup can fail, so a
      // dispatch-time miss is kernel-integrity drift: never a skipped
      // block and never an `undefined` body. The block-id grammar admits
      // `constructor`, so an UNGUARDED index here would answer that
      // spelling with an inherited member — a silent degrade exactly
      // where the clause forbids one.
      throw new Error(
        `kernel integrity: context block '${ref}' has no catalog entry (admission should have refused the ref)`,
      );
    }
    rendered.set(ref, { id: ref, body: entry.body, provenance: { sources: [source] } });
  };

  // Render order IS source order: role refs → step refs → gate refs,
  // declaration order within each. This is RENDER order, never
  // precedence or override.

  // 1) Role identity / operating rules. The roles read needs NO guard and
  // is the third indexed lookup: the roles cross-rule is an EQUALITY, and
  // the half that carries this is that every step's role must be a
  // DECLARED roles key — so the read's key is always own.
  for (const ref of template.roles[step.role]?.promptConcernRefs ?? []) {
    emit(ref, { source: "role_config" });
  }

  // 2) The current step. Both produced positions read TOTALLY over the
  // optional type with an empty-list fallback that is structurally dead
  // on an admitted value (the admitted-form belt idiom).
  for (const ref of step.promptConcernRefs ?? []) {
    emit(ref, { source: "step_config" });
  }

  // 3) Gates on transitions this actor may legally emit — narrowed by
  // AUTHORITY, not by blind step membership. `capability` is the existing
  // authority logic and no part of it is reimplemented here; the step's
  // own gates record is the ITERATION DOMAIN, which is what discharges
  // the membership half.
  const authorized = new Set<string>(capability(template, step.role, stepId));
  // The gates record is reached by its OWN ENUMERATION and never indexed
  // — own-key by construction, so a guard here would be dead code. The
  // unit's coarser walk (index the record by an authorized op) would meet
  // the prototype hazard head on: an ungated prototype-named transition
  // admits with zero findings and yields an INHERITED value where a list
  // is expected — non-nullish, non-iterable, throwing at a site whose
  // transition is already durably committed.
  for (const [eventType, pipeline] of Object.entries(step.gates ?? {})) {
    if (!authorized.has(eventType)) {
      continue;
    }
    for (const binding of pipeline) {
      for (const ref of binding.contextBlockRefs ?? []) {
        emit(ref, { source: "gate_binding", stepId, eventType });
      }
    }
  }

  return [...rendered.values()];
}

/** The block under construction — its provenance list grows as repeats arrive. */
interface MutableBlock {
  readonly id: BlockId;
  readonly body: string;
  readonly provenance: { readonly sources: ContextBlockSource[] };
}

/**
 * The authority module's own-entry idiom, RE-IMPLEMENTED locally because
 * that helper is private to its module and lifting it would land a file
 * outside this packet's mutation boundary. The validated format legally
 * admits ids like `constructor` (block ids) or `__proto__` (event types
 * and step ids), and an unguarded index would read INHERITED members.
 */
function ownEntry<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}
