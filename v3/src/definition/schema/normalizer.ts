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

/** Resolve a declared operand path (`$.steps`, `$.round.advanceOnArrivalAt`)
 * over the normalized value. */
function at(root: unknown, path: string): unknown {
  let cursor: unknown = root;
  for (const segment of path.split(".")) {
    if (segment === "$") continue;
    if (!isRecord(cursor)) return undefined;
    cursor = ownGet(cursor, segment);
  }
  return cursor;
}

/**
 * R4's first member (ch11-C39): expand each entry's edge map into a
 * COMPLETE per-edge boolean map against the declared advancing set. An
 * absent declaration yields all-false (ch11-C38's none-default); the
 * PRODUCER MONOPOLY holds — the map is recomputed and overwrites whatever
 * the input carried.
 */
function expandFlagMaps(
  root: Record<string, unknown>,
  hook: Extract<NormalizerHookDecl, { hook: "expandAdvancesRound" }>,
): void {
  const entries = at(root, hook.over);
  if (!isRecord(entries)) return;
  const declared = at(root, hook.advanceSet);
  const advancing = new Set<string>(Array.isArray(declared) ? (declared as string[]) : []);
  for (const key of Object.keys(entries)) {
    const entry = ownGet(entries, key);
    if (!isRecord(entry)) continue;
    const edges = ownGet(entry, hook.edges);
    const flags: Record<string, boolean> = {};
    if (isRecord(edges)) {
      for (const edge of Object.keys(edges)) {
        defineOwn(flags, edge, advancing.has(ownGet(edges, edge) as string));
      }
    }
    defineOwn(entry, hook.into, flags);
  }
}

/**
 * R4's second member (ch11-C20/C5): write each registration's EFFECTIVE
 * config into the binding's single config surface. The binding is rebuilt
 * from its CARRIED fields plus the effective config — the one downstream
 * config form.
 */
function materializeConfigs(
  root: Record<string, unknown>,
  hook: Extract<NormalizerHookDecl, { hook: "materializeEffectiveConfigs" }>,
  effectiveConfigs: ReadonlyMap<string, unknown>,
): void {
  // `over` addresses the pipeline map through two open-map levels:
  // `$.steps.*.gates` — the entry key and the event key are the wildcards.
  const [ownerPath, ...rest] = hook.over.split(".*.");
  const owners = at(root, ownerPath ?? "$");
  if (!isRecord(owners)) return;
  const inner = rest.join(".*.");
  for (const ownerKey of Object.keys(owners)) {
    const owner = ownGet(owners, ownerKey);
    if (!isRecord(owner)) continue;
    const pipelines = ownGet(owner, inner);
    if (!isRecord(pipelines)) continue;
    const rebuiltPipelines: Record<string, unknown> = {};
    for (const eventKey of Object.keys(pipelines)) {
      const pipeline = ownGet(pipelines, eventKey);
      if (!Array.isArray(pipeline)) continue;
      const base = `${ownerPath === "$" ? "" : `${(ownerPath ?? "").replace("$.", "")}.`}${ownerKey}.${inner}.${eventKey}`;
      defineOwn(
        rebuiltPipelines,
        eventKey,
        pipeline.map((binding: unknown, index: number) => {
          const carried: Record<string, unknown> = {};
          if (isRecord(binding)) {
            for (const field of hook.carry) defineOwn(carried, field, ownGet(binding, field));
          }
          defineOwn(carried, hook.into, effectiveConfigs.get(`${base}[${String(index)}]`));
          return carried;
        }),
      );
    }
    defineOwn(owner, inner, rebuiltPipelines);
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
      expandFlagMaps(value, hook);
      continue;
    }
    materializeConfigs(value, hook, effectiveConfigs);
  }
  return value;
}
