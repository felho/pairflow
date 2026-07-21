import type {
  ActivationMode,
  CancelOutcome,
  CreateOutcome,
  EventEnvelope,
  KickoffOutcome,
  Outcome,
  StartOutcome,
  TemplateRef,
} from "../domain/index.js";
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
 * Outcome is the kernel's, returned verbatim — no reshaping. `diag.emit`
 * is BARE per the port's fail-open contract.
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

/** The operator-intent entry's return: the per-op unions plus the
 * `invalid_shape` rejected arm (packet ch12-p1b, I1/V1). */
export type IntentOutcome =
  | CreateOutcome
  | StartOutcome
  | KickoffOutcome
  | CancelOutcome
  | { readonly kind: "rejected"; readonly reason: "invalid_shape" };

export interface Ingress {
  submit(raw: unknown): Promise<Outcome>;
  /**
   * The operator-intent write family (packet ch12-p1b, I1 — the l0d
   * RECEIVE source routing at the wire: `submit` IS the actor_envelope
   * class, this the operator_intent class; kernel events have NO
   * external endpoint at ch12, C13). Strict, fail-closed, hand-rolled
   * validation; the kernel outcome returns VERBATIM.
   */
  submitIntent(raw: unknown): Promise<IntentOutcome>;
}

export interface IngressDeps {
  readonly kernel: Kernel;
  /** The non-authoritative diagnostic channel (ch7-P1; REQUIRED). */
  readonly diag: DiagnosticsSink;
}

// ── The operator-intent wire family (packet ch12-p1b, I1–I4) ─────────
// Per-intent keysets EXACT (I2, camelCase — the C13 rename culture);
// validation strict fail-closed at BLOCK grain (I3/I4): every gate
// block carries its own detail token; the CREATE-side task is
// form-when-present (`invalid_task` — its ABSENCE is the kernel's
// `task_required`, never an ingress lane).

const INTENT_KINDS = new Set(["create", "start", "kickoff", "cancel"]);

const INTENT_KEYS: Record<string, ReadonlySet<string>> = {
  create: new Set([
    "intent",
    "instanceId",
    "templateRef",
    "task",
    "overrides",
    "runOverrides",
    "mode",
  ]),
  start: new Set(["intent", "instanceId", "opId", "runtimeContextRef"]),
  kickoff: new Set(["intent", "instanceId", "opId", "task"]),
  cancel: new Set(["intent", "instanceId", "opId"]),
};

/** The authored↔stored mode mapping (C1/C13) — the wire is camelCase,
 * the domain carries the MODEL token; the mapping happens exactly once,
 * here. */
const WIRE_MODES: Record<string, ActivationMode> = {
  immediate: "immediate",
  deferredKickoff: "deferred_kickoff",
};

function asPlainRecord(raw: unknown): Record<string, unknown> | null {
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
  return raw as Record<string, unknown>;
}

/** The `templateRef.version` ladder (I3, R-NUMERIC-LADDER): integer,
 * ≥ 1, safe, `-0` rejected via Object.is; non-number forms fall to the
 * typeof gate. */
function isTemplateRef(value: unknown): value is TemplateRef {
  const record = asPlainRecord(value);
  if (record === null) {
    return false;
  }
  for (const key of Object.getOwnPropertyNames(record)) {
    if (key !== "id" && key !== "version") {
      return false;
    }
  }
  const { id, version } = record;
  return (
    isNonEmptyString(id) &&
    typeof version === "number" &&
    Number.isSafeInteger(version) &&
    version >= 1 &&
    !Object.is(version, -0)
  );
}

function isStringMap(value: unknown): value is Record<string, string> {
  const record = asPlainRecord(value);
  if (record === null) {
    return false;
  }
  return Object.getOwnPropertyNames(record).every((key) => isNonEmptyString(record[key]));
}

/** The C7 CREATE-input canonical-JSON-safe check (I3): a plain map of
 * step-id → PLAIN MAP, every entry canonicalizable — fail-closed HERE,
 * never a commit-time serialization crash. */
function isRunOverrides(
  value: unknown,
): value is Record<string, Readonly<Record<string, unknown>>> {
  const record = asPlainRecord(value);
  if (record === null) {
    return false;
  }
  return Object.getOwnPropertyNames(record).every((key) => {
    const entry = asPlainRecord(record[key]);
    return entry !== null && isCanonicalizable(entry);
  });
}

type IntentParseFailure = {
  readonly detail: IngressDetailToken;
  readonly attribution: Pick<DiagnosticEventBody, "instanceId" | "opId">;
};

function intentFailure(
  detail: IngressDetailToken,
  record: Record<string, unknown>,
): IntentParseFailure {
  const { instanceId, opId } = record;
  return {
    detail,
    attribution: {
      ...(isNonEmptyString(instanceId) ? { instanceId } : {}),
      ...(isNonEmptyString(opId) ? { opId } : {}),
    },
  };
}

export function createIngress(deps: IngressDeps): Ingress {
  const { kernel, diag } = deps;

  function rejectIntent(failure: IntentParseFailure): Promise<IntentOutcome> {
    diag.emit({
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail: failure.detail,
      ...failure.attribution,
    });
    return Promise.resolve({ kind: "rejected", reason: "invalid_shape" });
  }

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

    submitIntent(raw: unknown): Promise<IntentOutcome> {
      const record = asPlainRecord(raw);
      if (record === null) {
        return rejectIntent({ detail: "not_plain_object", attribution: {} });
      }
      const intent = record["intent"];
      if (!isNonEmptyString(intent) || !INTENT_KINDS.has(intent)) {
        return rejectIntent(intentFailure("unknown_intent", record));
      }
      const keys = INTENT_KEYS[intent];
      if (keys === undefined) {
        return rejectIntent(intentFailure("unknown_intent", record));
      }
      for (const key of Object.getOwnPropertyNames(record)) {
        if (!keys.has(key)) {
          return rejectIntent(intentFailure("unknown_key", record));
        }
      }
      const { instanceId, opId, task, runtimeContextRef } = record;
      if (!isNonEmptyString(instanceId)) {
        return rejectIntent(intentFailure("invalid_required_string", record));
      }
      if (intent !== "create" && !isNonEmptyString(opId)) {
        return rejectIntent(intentFailure("invalid_required_string", record));
      }
      switch (intent) {
        case "create": {
          if (!isTemplateRef(record["templateRef"])) {
            return rejectIntent(intentFailure("invalid_template_ref", record));
          }
          // Form-when-present ONLY (I3): absence is the KERNEL's
          // `task_required` decision, never an ingress shape lane.
          if ("task" in record && !isNonEmptyString(task)) {
            return rejectIntent(intentFailure("invalid_task", record));
          }
          if ("mode" in record) {
            const mode = record["mode"];
            if (!isNonEmptyString(mode) || WIRE_MODES[mode] === undefined) {
              return rejectIntent(intentFailure("invalid_mode", record));
            }
          }
          if ("overrides" in record && !isStringMap(record["overrides"])) {
            return rejectIntent(intentFailure("invalid_overrides", record));
          }
          if ("runOverrides" in record && !isRunOverrides(record["runOverrides"])) {
            return rejectIntent(intentFailure("invalid_run_overrides", record));
          }
          const wireMode = record["mode"];
          return kernel.create({
            instanceId,
            templateRef: record["templateRef"],
            ...(isNonEmptyString(task) ? { task } : {}),
            ...(isStringMap(record["overrides"]) ? { overrides: record["overrides"] } : {}),
            ...("runOverrides" in record
              ? {
                  runOverrides: record["runOverrides"] as Record<
                    string,
                    Readonly<Record<string, unknown>>
                  >,
                }
              : {}),
            ...(isNonEmptyString(wireMode) && WIRE_MODES[wireMode] !== undefined
              ? { mode: WIRE_MODES[wireMode] }
              : {}),
          });
        }
        case "start": {
          if ("runtimeContextRef" in record && !isNonEmptyString(runtimeContextRef)) {
            return rejectIntent(intentFailure("invalid_runtime_context_ref", record));
          }
          return kernel.start({
            instanceId,
            opId: opId as string,
            ...(isNonEmptyString(runtimeContextRef) ? { runtimeContextRef } : {}),
          });
        }
        case "kickoff": {
          if (!isNonEmptyString(task)) {
            return rejectIntent(intentFailure("invalid_required_string", record));
          }
          return kernel.kickoff({ instanceId, opId: opId as string, task });
        }
        default:
          return kernel.cancel({ instanceId, opId: opId as string });
      }
    },
  };
}
