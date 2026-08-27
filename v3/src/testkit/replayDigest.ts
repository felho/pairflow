import { createHash } from "node:crypto";

import type { InstanceDetail } from "../ports/store.js";

/**
 * The replay digest — K17's BEHAVIOUR half, at the two grains K14
 * names: the committed ROW SEQUENCE a trace reproduces, and the
 * INSTANCE RECORD itself.
 *
 * Both are computed from the replay's returned instance detail, which
 * is the whole closed input: the transcript in seq order and the
 * instance record. Nothing else is read, and nothing is derived from
 * the run that produced it.
 *
 * WHY THE TESTKIT OWNS THE CANONICALIZER: the store's own is private,
 * and the ADR-005 lint bars a testkit import of `store/**`. This is a
 * second implementation on purpose — a digest that shared the store's
 * serializer would move whenever the store's did, and the whole point
 * is a baseline that does NOT move with the code under measurement.
 */

const NON_REPRESENTABLE = "replayDigest: value cannot be canonicalized";

/**
 * A key that cannot appear in JSON, so it can never collide with real
 * data: `{ a: undefined }` and `{}` MUST digest differently, because
 * an absent key and a key set to undefined are different shapes, and
 * silently aliasing them is how a digest greens on a re-pin.
 */
const UNDEFINED_MARK = "\u0000undefined";

/**
 * Canonical form: sorted keys, explicit type tags, and a REFUSAL for
 * anything the form cannot represent.
 *
 * The refusal is the load-bearing part. A canonicalizer that drops
 * what it does not understand produces a digest that is stable across
 * exactly the changes it cannot see — so a field it silently omits is
 * a field a re-pin can move for free. Every value therefore either
 * has a representation here or throws.
 */
export function canonicalize(value: unknown, seen: Set<object> = new Set()): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return `s${JSON.stringify(value)}`;
    case "boolean":
      return value ? "true" : "false";
    case "number":
      // NaN and ±Infinity have no JSON form; JSON.stringify renders
      // all three as `null`, which would alias them onto each other
      // AND onto a real null.
      if (!Number.isFinite(value)) throw new TypeError(`${NON_REPRESENTABLE}: ${String(value)}`);
      // -0 and 0 are distinct here: they are distinguishable values,
      // and collapsing them would be an alias like any other.
      return `n${Object.is(value, -0) ? "-0" : String(value)}`;
    case "undefined":
      return UNDEFINED_MARK;
    case "bigint":
    case "symbol":
    case "function":
      throw new TypeError(`${NON_REPRESENTABLE}: ${typeof value}`);
    default:
      break;
  }
  const obj: object = value;
  if (seen.has(obj)) throw new TypeError(`${NON_REPRESENTABLE}: cycle`);
  seen.add(obj);
  try {
    if (Array.isArray(obj)) {
      return `[${obj.map((item) => canonicalize(item, seen)).join(",")}]`;
    }
    // Anything with its own prototype behaviour (Date, Map, Set, class
    // instances) is refused rather than guessed at: a Date rendered by
    // its ISO string would hide a type change, and a Map has no
    // ordering guarantee this form could honour.
    const proto: unknown = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError(`${NON_REPRESENTABLE}: ${obj.constructor?.name ?? "exotic object"}`);
    }
    const keys = Reflect.ownKeys(obj);
    if (keys.some((key) => typeof key === "symbol")) {
      throw new TypeError(`${NON_REPRESENTABLE}: symbol key`);
    }
    const entries = (keys as string[])
      .slice()
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize((obj as Record<string, unknown>)[key], seen)}`);
    return `{${entries.join(",")}}`;
  } finally {
    seen.delete(obj);
  }
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** The two grains, computed independently so a move in one is legible. */
export interface ReplayDigestPair {
  /** Over the committed transcript, in the seq order the store returned. */
  readonly transcript: string;
  /** Over the instance record, whole. */
  readonly instance: string;
}

/**
 * WHAT THIS DOES NOT REACH, named here rather than discovered later:
 * the store's raw `op_id` COLUMN is dropped by the mapper on a
 * transition row, so a divergence between that column and the
 * envelope's own op id is invisible to both grains. That class is
 * guarded by the class-conditional mapper lanes, not by this digest.
 */
export function replayDigest(detail: InstanceDetail): ReplayDigestPair {
  return {
    transcript: sha256(canonicalize(detail.transcript)),
    instance: sha256(canonicalize(detail.instance)),
  };
}
