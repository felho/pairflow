import type { EventEnvelope, Outcome } from "../domain/index.js";
import { isCanonicalizable } from "../emit/index.js";
import type { Kernel } from "../kernel/index.js";

/**
 * Op-envelope validation → kernel (IC-E; packet ch4-P3, hardened in the
 * ch-4 aftermath). Ingress owns valid_shape: hand-rolled,
 * strict/fail-closed — the raw envelope must be a PLAIN object, unknown
 * top-level keys (string OR symbol) reject, and the payload must be
 * canonicalizable (the emit-lib predicate): what ingress admits is
 * exactly what the store's JSON round-trip preserves and the ch-5
 * digest path can pin. The kernel receives only typed envelopes.
 */
const KNOWN_KEYS = new Set([
  "instanceId",
  "opId",
  "type",
  "actorId",
  "expectedVersion",
  "eventId",
  "payload",
]);

const INVALID_SHAPE: Outcome = { kind: "rejected", reason: "invalid_shape" };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseEnvelope(raw: unknown): EventEnvelope | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const proto: unknown = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) {
    return null;
  }
  if (Object.getOwnPropertySymbols(raw).length > 0) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!KNOWN_KEYS.has(key)) {
      return null;
    }
  }
  const { instanceId, opId, type, actorId, expectedVersion, eventId, payload } = record;
  if (
    !isNonEmptyString(instanceId) ||
    !isNonEmptyString(opId) ||
    !isNonEmptyString(type) ||
    !isNonEmptyString(actorId)
  ) {
    return null;
  }
  if (
    "expectedVersion" in record &&
    (typeof expectedVersion !== "number" ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 0)
  ) {
    return null;
  }
  if ("eventId" in record && !isNonEmptyString(eventId)) {
    return null;
  }
  if ("payload" in record && !isCanonicalizable(payload)) {
    return null;
  }
  return {
    instanceId,
    opId,
    type,
    actorId,
    ...(typeof expectedVersion === "number" ? { expectedVersion } : {}),
    ...(typeof eventId === "string" ? { eventId } : {}),
    ...("payload" in record ? { payload } : {}),
  };
}

export interface Ingress {
  submit(raw: unknown): Promise<Outcome>;
}

export function createIngress(kernel: Kernel): Ingress {
  return {
    submit(raw: unknown): Promise<Outcome> {
      const envelope = parseEnvelope(raw);
      if (envelope === null) {
        return Promise.resolve(INVALID_SHAPE);
      }
      return kernel.handle(envelope);
    },
  };
}
