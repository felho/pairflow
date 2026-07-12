import type { EventEnvelope, Outcome } from "../domain/index.js";
import { isCanonicalizable } from "../emit/index.js";
import type { Kernel } from "../kernel/index.js";
import type {
  DiagnosticEventBody,
  DiagnosticsSink,
  IngressDetailToken,
} from "../ports/diagnostics.js";

/**
 * Op-envelope validation → kernel (IC-E; packet ch4-P3, hardened in the
 * ch-4 aftermath; diagnostics added in ch7-P1). Ingress owns
 * valid_shape: hand-rolled, strict/fail-closed — the raw envelope must
 * be a PLAIN object, unknown top-level keys (string OR symbol) reject,
 * and the payload must be canonicalizable (the emit-lib predicate):
 * what ingress admits is exactly what the store's JSON round-trip
 * preserves and the ch-5 digest path can pin. The kernel receives only
 * typed envelopes.
 *
 * Every rejection emits ONE diagnostic event with an ENUMERATED detail
 * token (one per admission gate block — the token list is a declared
 * claim) and best-effort PER-FIELD attribution: valid non-empty string
 * fields of the raw record are carried; `not_plain_object` carries
 * none. No fingerprint — ingress has no digest authority. The public
 * Outcome is byte-identical to ch-4. `diag.emit` is BARE per the
 * port's fail-open contract.
 */
const KNOWN_KEYS = new Set([
  "instanceId",
  "opId",
  "type",
  "actorId",
  "expectedVersion",
  "expectedRole",
  "eventId",
  "payload",
]);

const INVALID_SHAPE: Outcome = { kind: "rejected", reason: "invalid_shape" };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

type Attribution = Pick<DiagnosticEventBody, "instanceId" | "opId" | "actorId" | "type">;

type ParseResult =
  | { readonly ok: true; readonly envelope: EventEnvelope }
  | { readonly ok: false; readonly detail: IngressDetailToken; readonly attribution: Attribution };

/** Best-effort: only valid non-empty string fields are carried. */
function attributionOf(record: Record<string, unknown>): Attribution {
  const { instanceId, opId, actorId, type } = record;
  return {
    ...(isNonEmptyString(instanceId) ? { instanceId } : {}),
    ...(isNonEmptyString(opId) ? { opId } : {}),
    ...(isNonEmptyString(actorId) ? { actorId } : {}),
    ...(isNonEmptyString(type) ? { type } : {}),
  };
}

function parseEnvelope(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, detail: "not_plain_object", attribution: {} };
  }
  const proto: unknown = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) {
    return { ok: false, detail: "not_plain_object", attribution: {} };
  }
  if (Object.getOwnPropertySymbols(raw).length > 0) {
    return { ok: false, detail: "not_plain_object", attribution: {} };
  }
  const record = raw as Record<string, unknown>;
  const fail = (detail: IngressDetailToken): ParseResult => ({
    ok: false,
    detail,
    attribution: attributionOf(record),
  });
  // getOwnPropertyNames, not Object.keys: a NON-ENUMERABLE unknown key
  // is still an unknown key (it would silently vanish from the typed
  // envelope otherwise — the strict claim covers it).
  for (const key of Object.getOwnPropertyNames(record)) {
    if (!KNOWN_KEYS.has(key)) {
      return fail("unknown_key");
    }
  }
  const { instanceId, opId, type, actorId, expectedVersion, expectedRole, eventId, payload } =
    record;
  if (
    !isNonEmptyString(instanceId) ||
    !isNonEmptyString(opId) ||
    !isNonEmptyString(type) ||
    !isNonEmptyString(actorId)
  ) {
    return fail("invalid_required_string");
  }
  if (
    "expectedVersion" in record &&
    (typeof expectedVersion !== "number" ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 0 ||
      // Number.isInteger(-0) is true and -0 < 0 is false, yet the
      // round-trip flattens it to 0 — reject like the payload does.
      Object.is(expectedVersion, -0))
  ) {
    return fail("invalid_expected_version");
  }
  // Form-when-present ONLY — absence passes: mandatory-ness is the
  // KERNEL's (`missing_role`), the missing_version pattern (ch11-P1 W4).
  if ("expectedRole" in record && !isNonEmptyString(expectedRole)) {
    return fail("invalid_expected_role");
  }
  if ("eventId" in record && !isNonEmptyString(eventId)) {
    return fail("invalid_event_id");
  }
  if ("payload" in record && !isCanonicalizable(payload)) {
    return fail("payload_not_canonicalizable");
  }
  return {
    ok: true,
    envelope: {
      instanceId,
      opId,
      type,
      actorId,
      ...(typeof expectedVersion === "number" ? { expectedVersion } : {}),
      ...(typeof expectedRole === "string" ? { expectedRole } : {}),
      ...(typeof eventId === "string" ? { eventId } : {}),
      ...("payload" in record ? { payload } : {}),
    },
  };
}

export interface Ingress {
  submit(raw: unknown): Promise<Outcome>;
}

export interface IngressDeps {
  readonly kernel: Kernel;
  /** The non-authoritative diagnostic channel (ch7-P1; REQUIRED). */
  readonly diag: DiagnosticsSink;
}

export function createIngress(deps: IngressDeps): Ingress {
  const { kernel, diag } = deps;
  return {
    submit(raw: unknown): Promise<Outcome> {
      const parsed = parseEnvelope(raw);
      if (!parsed.ok) {
        diag.emit({
          source: "ingress",
          kind: "rejected",
          reason: "invalid_shape",
          detail: parsed.detail,
          ...parsed.attribution,
        });
        return Promise.resolve(INVALID_SHAPE);
      }
      return kernel.handle(parsed.envelope);
    },
  };
}
