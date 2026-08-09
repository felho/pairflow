import { instanceKey, reachAll } from "./engine.js";
import type { NormalizerHookDecl, SurfaceDecl } from "./vocabulary.js";

/**
 * ADR-019 D3: THE NORMALIZER — the engine's SECOND capability, named so
 * that "schema" is never read as covering it.
 *
 * A declaration says what is LEGAL; it does not compute a value. Admission
 * both validates and PRODUCES the admitted form (the audit's residual R4:
 * `advancesRound` expanded per transition, the effective gate config
 * materialized). Those are TRANSFORMS, and they live here.
 *
 * The boundary is exact and load-bearing:
 * - plain `default:` materialization IS declarable and stays SCHEMA-side
 *   (the engine applies it while walking — `activation`, `runtimeContext`,
 *   `output.mode`, the disposition and reason defaults);
 * - DERIVATION — a value computed from other values — is the normalizer's.
 *
 * Each hook is a NAMED capability parameterized by declared operand paths,
 * so adding one is D7 format growth (a ratified amendment), never an edit
 * that slips in under "normalization".
 *
 * WHERE THOSE OPERAND PATHS ARE RESOLVED is not this module's business and
 * no longer its code. It used to walk them with a reader of its own, which
 * read `*` as a literal key and assumed a path carried exactly one of
 * them; a declared path the gate had certified could therefore reach
 * nothing and the hook would return having written NOTHING, without a
 * word. Both hooks now walk with `reachAll` — the engine's own descent,
 * the same one the gate resolves with — so a path the gate accepts is a
 * path this module walks.
 */

/** Own-property WRITE: a step id or event type legally admits `__proto__`. */
function defineOwn<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownGet(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/**
 * R4's first member (ch11-C39): expand each entry's edge map into a
 * COMPLETE per-edge boolean map against the declared advancing set. An
 * absent declaration yields all-false (ch11-C38's none-default); the
 * PRODUCER MONOPOLY holds — the map is recomputed and overwrites whatever
 * the input carried.
 */
function expandFlagMaps(
  surface: SurfaceDecl,
  root: unknown,
  hook: Extract<NormalizerHookDecl, { hook: "expandAdvancesRound" }>,
): void {
  // EVERY position the operand path reaches, not the first. A wildcard
  // path resolves to many, and reading only `[0]` dropped the rest with
  // nothing recording it.
  const advancing = new Set<string>();
  for (const declared of reachAll(surface, root, hook.advanceSet)) {
    if (!Array.isArray(declared.value)) continue;
    for (const item of declared.value as readonly unknown[]) {
      if (typeof item === "string") advancing.add(item);
    }
  }
  for (const entry of reachAll(surface, root, hook.over, { kind: "entry" })) {
    if (!isRecord(entry.value)) continue;
    const edges = ownGet(entry.value, hook.edges);
    const flags: Record<string, boolean> = {};
    if (isRecord(edges)) {
      for (const edge of Object.keys(edges)) {
        defineOwn(flags, edge, advancing.has(ownGet(edges, edge) as string));
      }
    }
    defineOwn(entry.value, hook.into, flags);
  }
}

/**
 * ch13v2-C13's member: LIFT the ref list nested inside a format-open map
 * onto a sibling field of the enclosing entry. An unauthored source lands
 * as the EMPTY LIST, never an absence — the admitted form carries the
 * position on every value. The PRODUCER MONOPOLY holds: the field is
 * recomputed and overwrites whatever the input carried, which is what
 * makes a caller-supplied produced position a silent recompute rather
 * than a finding.
 *
 * The lifted list is COPIED: the authored source survives unmodified at
 * its own position (the ch12 cascade reads it there), and the two must
 * not share one array.
 */
function liftNestedLists(
  surface: SurfaceDecl,
  root: unknown,
  hook: Extract<NormalizerHookDecl, { hook: "liftNestedList" }>,
): void {
  for (const entry of reachAll(surface, root, hook.over, { kind: "entry" })) {
    if (!isRecord(entry.value)) continue;
    const nested = ownGet(entry.value, hook.from);
    const authored = isRecord(nested) ? ownGet(nested, hook.source) : undefined;
    defineOwn(entry.value, hook.into, Array.isArray(authored) ? [...(authored as readonly unknown[])] : []);
  }
}

/**
 * R4's second member (ch11-C20/C5): write each registration's EFFECTIVE
 * config into the binding's single config surface. The binding is rebuilt
 * from its CARRIED fields plus the effective config — the one downstream
 * config form.
 */
function materializeConfigs(
  surface: SurfaceDecl,
  root: unknown,
  hook: Extract<NormalizerHookDecl, { hook: "materializeEffectiveConfigs" }>,
  effectiveConfigs: ReadonlyMap<string, unknown>,
): void {
  for (const pipeline of reachAll(surface, root, hook.over, { kind: "entry" })) {
    const owner = pipeline.owner;
    const key = pipeline.key;
    if (!Array.isArray(pipeline.value) || owner === undefined || key === undefined) continue;
    // The per-binding key is the WALK's own finding grain, carried here
    // rather than rebuilt from path text.
    const rebuilt = pipeline.value.map((binding: unknown, index: number) => {
      const carried: Record<string, unknown> = {};
      if (isRecord(binding)) {
        for (const field of hook.carry) defineOwn(carried, field, ownGet(binding, field));
      }
      // The binding's STRUCTURAL address — the same key the walk wrote
      // under. A rendered path collapses two distinct addresses onto one.
      defineOwn(carried, hook.into, effectiveConfigs.get(instanceKey([...pipeline.segments, index])));
      return carried;
    });
    defineOwn(owner, key, rebuilt);
  }
}

/**
 * Run every declared normalizer hook over a VALIDATED value. The caller
 * guarantees the value carries no findings — a declaration that refused
 * the input never reaches derivation.
 */
export function normalize(
  surface: SurfaceDecl,
  value: unknown,
  effectiveConfigs: ReadonlyMap<string, unknown>,
): unknown {
  if (!isRecord(value)) return value;
  for (const hook of surface.normalizers) {
    if (hook.hook === "expandAdvancesRound") {
      expandFlagMaps(surface, value, hook);
      continue;
    }
    if (hook.hook === "liftNestedList") {
      liftNestedLists(surface, value, hook);
      continue;
    }
    materializeConfigs(surface, value, hook, effectiveConfigs);
  }
  return value;
}
