import type {
  ActivationMode,
  CancelOutcome,
  CreateOutcome,
  EventEnvelope,
  KickoffOutcome,
  Outcome,
  ResumeWaitOutcome,
  StartOutcome,
  SubmitDecisionOutcome,
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
  if ("expectedVersion" in record && !isWireExpectedVersion(expectedVersion)) {
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

/**
 * Q19 (packet ch14-p2b): the envelope's `expectedVersion` ladder,
 * EXTRACTED so BOTH wires call ONE function.
 *
 * The intent wire already carries a DIFFERENT numeric ladder — the
 * create intent's template-ref version, `Number.isSafeInteger` with a
 * `>= 1` floor. This is the ENVELOPE's, and the operator intents take
 * IT rather than that one, because the field IS `expectedVersion`: the
 * same value, the same CAS semantics, checked against the same instance
 * counter. Reusing the ladder that already governs it, with the token
 * that already names its failure, is what keeps ONE rule where a second
 * would drift.
 *
 * "VERBATIM" IS AN OBLIGATION WITH A COUNT: the ladder is FOUR refusal
 * cells, and a copy that drops the last one passes a single-lane gate
 * block while admitting the value the round-trip flattens. Extraction
 * is what makes the reuse compile-visible and a single driving lane
 * sufficient — a behavioural lane through one wire cannot distinguish a
 * shared helper from a faithful copy, which is the only thing the
 * extraction exists to prevent.
 *
 * THE RESIDUAL IS NAMED rather than inherited: this ladder omits the
 * `Number.isSafeInteger` bound the create wire carries, so
 * `Number.MAX_VALUE` passes ingress. It then lands at the version rung,
 * compares unequal, and answers `Stale` — a correct-enough disposition,
 * which is why the weaker ladder is accepted rather than strengthened
 * (strengthening it would change the ACTOR wire, out of scope here).
 */
export function isWireExpectedVersion(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    // Number.isInteger(-0) is true and -0 < 0 is false, yet the
    // round-trip flattens it to 0 — reject like the payload does.
    !Object.is(value, -0)
  );
}

/** The operator-intent entry's return: the per-op unions plus the
 * `invalid_shape` rejected arm (packet ch12-p1b, I1/V1). */
export type IntentOutcome =
  | CreateOutcome
  | StartOutcome
  | KickoffOutcome
  | CancelOutcome
  // ch14-p2b (Q13): the two operator intents' outcomes join the union.
  // This is a PRODUCTION type and the widening reaches every caller —
  // measured at authoring as the two TEST callers, both compile-silent
  // (`ingress.test.ts` is `toEqual`-shaped throughout; `l0dJourney`
  // narrows on `.kind`, and a discriminant narrow survives a widened
  // union). The CLI binds this type nowhere.
  | SubmitDecisionOutcome
  | ResumeWaitOutcome
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

// ch14-p2b: the two operator intents join the kind set. Their TOKEN
// spelling is this packet's build choice; the keysets below carry
// `intent` for the same reason every existing one does — the ingress
// reads the discriminator out of the record and then closes the keyset
// over every own property, so a keyset authored without it would make
// EVERY well-formed intent draw `unknown_key`.
const INTENT_KINDS = new Set([
  "create",
  "start",
  "kickoff",
  "cancel",
  "submit-decision",
  "resume-wait",
]);

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
  start: new Set(["intent", "instanceId", "opId"]),
  kickoff: new Set(["intent", "instanceId", "opId", "task"]),
  cancel: new Set(["intent", "instanceId", "opId"]),
  // C9's CLOSED keysets in the realized camel spelling. `expectedVersion`
  // and `by` are MEMBERS, not required-presence lanes: an ABSENT
  // `expectedVersion` must REACH the version rung's `missing_version`
  // and an ABSENT `by` must REACH the authority rung's
  // `operator_not_authorized` (Q9's presence boundary — the keyset
  // governs MEMBERSHIP, never presence).
  "submit-decision": new Set([
    "intent",
    "instanceId",
    "opId",
    "expectedVersion",
    "requestRef",
    "verdict",
    "override",
    "payload",
    "by",
  ]),
  "resume-wait": new Set(["intent", "instanceId", "opId", "expectedVersion", "type"]),
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
  // Gate-2 aftermath (finding 1): every own property must be a PLAIN
  // DATA property — an accessor could answer validation with one value
  // and the dispatch read with another (or throw mid-commit at the
  // store's canonical serialization). Descriptor-checked at EVERY wire
  // record level; nested payloads are additionally COPIED single-read
  // below, so a post-validation caller mutation cannot reach the
  // kernel either.
  for (const key of Object.getOwnPropertyNames(raw)) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return null;
    }
  }
  return raw as Record<string, unknown>;
}

/** The `templateRef.version` ladder (I3, R-NUMERIC-LADDER): integer,
 * ≥ 1, safe, `-0` rejected via Object.is; non-number forms fall to the
 * typeof gate. Returns a FRESH literal (single-read copy) — the raw
 * wire object never travels past the gate. */
function parseTemplateRefWire(value: unknown): TemplateRef | null {
  const record = asPlainRecord(value);
  if (record === null) {
    return null;
  }
  for (const key of Object.getOwnPropertyNames(record)) {
    if (key !== "id" && key !== "version") {
      return null;
    }
  }
  const { id, version } = record;
  if (
    !isNonEmptyString(id) ||
    typeof version !== "number" ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    Object.is(version, -0)
  ) {
    return null;
  }
  return { id, version };
}

/** Single-read copy: validated values land in a FRESH map. */
function parseStringMapWire(value: unknown): Record<string, string> | null {
  const record = asPlainRecord(value);
  if (record === null) {
    return null;
  }
  const copy: Record<string, string> = {};
  for (const key of Object.getOwnPropertyNames(record)) {
    const entry = record[key];
    if (!isNonEmptyString(entry)) {
      return null;
    }
    copy[key] = entry;
  }
  return copy;
}

/** The C7 CREATE-input canonical-JSON-safe check (I3): a plain map of
 * step-id → PLAIN MAP, every entry canonicalizable — fail-closed HERE,
 * never a commit-time serialization crash. Deep-copies via a canonical
 * JSON round-trip so the dispatched value is descriptor-free, plain,
 * and immune to post-validation caller mutation. */
function parseRunOverridesWire(
  value: unknown,
): Record<string, Readonly<Record<string, unknown>>> | null {
  const record = asPlainRecord(value);
  if (record === null) {
    return null;
  }
  for (const key of Object.getOwnPropertyNames(record)) {
    const entry = asPlainRecord(record[key]);
    if (entry === null || !isCanonicalizable(entry)) {
      return null;
    }
  }
  // Canonicalizable ⇒ JSON-round-trip-faithful; the copy is the value
  // the kernel snapshots.
  return JSON.parse(JSON.stringify(record)) as Record<
    string,
    Readonly<Record<string, unknown>>
  >;
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
      const { instanceId, opId, task } = record;
      if (!isNonEmptyString(instanceId)) {
        return rejectIntent(intentFailure("invalid_required_string", record));
      }
      if (intent !== "create" && !isNonEmptyString(opId)) {
        return rejectIntent(intentFailure("invalid_required_string", record));
      }
      switch (intent) {
        case "create": {
          const templateRef = parseTemplateRefWire(record["templateRef"]);
          if (templateRef === null) {
            return rejectIntent(intentFailure("invalid_template_ref", record));
          }
          // Form-when-present ONLY (I3): absence is the KERNEL's
          // `task_required` decision, never an ingress shape lane.
          if ("task" in record && !isNonEmptyString(task)) {
            return rejectIntent(intentFailure("invalid_task", record));
          }
          const wireMode = record["mode"];
          if ("mode" in record) {
            if (!isNonEmptyString(wireMode) || WIRE_MODES[wireMode] === undefined) {
              return rejectIntent(intentFailure("invalid_mode", record));
            }
          }
          let overrides: Record<string, string> | null = null;
          if ("overrides" in record) {
            overrides = parseStringMapWire(record["overrides"]);
            if (overrides === null) {
              return rejectIntent(intentFailure("invalid_overrides", record));
            }
          }
          let runOverrides: Record<string, Readonly<Record<string, unknown>>> | null = null;
          if ("runOverrides" in record) {
            runOverrides = parseRunOverridesWire(record["runOverrides"]);
            if (runOverrides === null) {
              return rejectIntent(intentFailure("invalid_run_overrides", record));
            }
          }
          return kernel.create({
            instanceId,
            templateRef,
            ...(isNonEmptyString(task) ? { task } : {}),
            ...(overrides !== null ? { overrides } : {}),
            ...(runOverrides !== null ? { runOverrides } : {}),
            ...(isNonEmptyString(wireMode) && WIRE_MODES[wireMode] !== undefined
              ? { mode: WIRE_MODES[wireMode] }
              : {}),
          });
        }
        case "start": {
          // W2 (packet ch12-p3): the interim `runtimeContextRef` wire key is
          // RETIRED — a `start` intent carrying it is now an unknown-key
          // rejection (the fail-closed ingress culture); the provider
          // machinery resolves the requirement kernel-side.
          return kernel.start({ instanceId, opId: opId as string });
        }
        case "kickoff": {
          if (!isNonEmptyString(task)) {
            return rejectIntent(intentFailure("invalid_required_string", record));
          }
          return kernel.kickoff({ instanceId, opId: opId as string, task });
        }
        case "submit-decision": {
          if (!isNonEmptyString(record["requestRef"])) {
            return rejectIntent(intentFailure("invalid_required_string", record));
          }
          if (!isNonEmptyString(record["verdict"])) {
            return rejectIntent(intentFailure("invalid_required_string", record));
          }
          // Q19's ONE ladder, called — not copied.
          if ("expectedVersion" in record && !isWireExpectedVersion(record["expectedVersion"])) {
            return rejectIntent(intentFailure("invalid_expected_version", record));
          }
          // Form-when-present: `override` is a boolean or absent. Its
          // ABSENCE is asserted as ABSENCE by the kernel, never as
          // `false`.
          if ("override" in record && typeof record["override"] !== "boolean") {
            return rejectIntent(intentFailure("invalid_override", record));
          }
          if ("payload" in record && !isCanonicalizable(record["payload"])) {
            return rejectIntent(intentFailure("payload_not_canonicalizable", record));
          }
          // `by` is form-when-present ONLY — its absence must reach the
          // AUTHORITY rung, which is why there is no required-string
          // lane for it here.
          if ("by" in record && !isNonEmptyString(record["by"])) {
            return rejectIntent(intentFailure("invalid_required_string", record));
          }
          return kernel.submitDecision({
            intent: "submit-decision",
            instanceId,
            opId: opId as string,
            expectedVersion:
              "expectedVersion" in record ? (record["expectedVersion"] as number) : undefined,
            requestRef: record["requestRef"],
            verdict: record["verdict"],
            ...("override" in record ? { override: record["override"] as boolean } : {}),
            ...("payload" in record ? { payload: record["payload"] } : {}),
            by: "by" in record ? (record["by"] as string) : undefined,
          });
        }
        case "resume-wait": {
          if (!isNonEmptyString(record["type"])) {
            return rejectIntent(intentFailure("invalid_required_string", record));
          }
          if ("expectedVersion" in record && !isWireExpectedVersion(record["expectedVersion"])) {
            return rejectIntent(intentFailure("invalid_expected_version", record));
          }
          return kernel.resumeWait({
            intent: "resume-wait",
            instanceId,
            opId: opId as string,
            expectedVersion:
              "expectedVersion" in record ? (record["expectedVersion"] as number) : undefined,
            type: record["type"],
          });
        }
        default:
          return kernel.cancel({ instanceId, opId: opId as string });
      }
    },
  };
}
