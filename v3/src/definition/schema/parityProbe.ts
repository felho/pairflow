import { appendFileSync } from "node:fs";

/**
 * ADR-019 D5: THE PARITY GATE's instrument.
 *
 * TEMPORARY, and default-OFF. It exists to replay the EXISTING fixture
 * corpus against the engine-backed path and report every divergence in
 * verdict, finding PATH or finding MESSAGE — before any switch, never
 * after. It is enabled only by `PAIRFLOW_V3_PARITY=1`; with the variable
 * unset every call is one comparison-free early return, so the production
 * path is unchanged in behaviour and effectively unchanged in cost.
 *
 * It is removed at the switch: once the engine IS the path, there is no
 * reference implementation left to compare against.
 */

const ENABLED = process.env["PAIRFLOW_V3_PARITY"] === "1";
const OUT = process.env["PAIRFLOW_V3_PARITY_OUT"] ?? "/tmp/p3-parity.jsonl";
/** The DRY-RUN of the switch: return the engine's answer instead of the
 * reference's, so the corpus can be replayed against the engine-backed
 * path without the switch being made. Measurement only. */
const ENGINE_FIRST = process.env["PAIRFLOW_V3_ENGINE"] === "1";

/** Key-order-insensitive canonical rendering: a difference in object key
 * ORDER is not a difference in verdict, path or message, and must not be
 * reported as one. Arrays keep their order — finding order IS observable. */
function canonical(value: unknown): unknown {
  if (value instanceof Map) {
    return { "<map>": [...value.entries()].map(([key, item]) => [canonical(key), canonical(item)]) };
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return `<${String(value)}>`;
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    return `<${typeof value}>`;
  }
  return value;
}

function render(value: unknown): string {
  try {
    return JSON.stringify(canonical(value)) ?? "undefined";
  } catch {
    return "<unserializable>";
  }
}

export function parityProbe<T>(label: string, reference: T, candidate: () => T): T {
  if (!ENABLED && !ENGINE_FIRST) return reference;
  let candidateValue: T;
  try {
    candidateValue = candidate();
  } catch (error) {
    if (ENGINE_FIRST) throw error;
    candidateValue = { "<threw>": error instanceof Error ? error.message : String(error) } as T;
  }
  if (ENABLED) {
    const left = render(reference);
    const right = render(candidateValue);
    if (left !== right) {
      appendFileSync(OUT, `${JSON.stringify({ label, reference: left, candidate: right })}\n`);
    }
  }
  return ENGINE_FIRST ? candidateValue : reference;
}
