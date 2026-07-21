import type {
  EpochMillis,
  EventEnvelope,
  InstanceId,
  LifecycleFactKind,
  OpId,
  RejectionName,
  TranscriptEntry,
  WorkflowInstance,
} from "../domain/index.js";
import type {
  DiagnosticEvent,
  DiagnosticKind,
  DiagnosticSource,
  DiagnosticsReader,
  DiagUnavailableReason,
  IngressDetailToken,
} from "../ports/diagnostics.js";
import type { RedactionPolicy } from "../ports/redaction.js";
import type { StorePort } from "../ports/store.js";

/**
 * The debug bundle (plan §6.4, packet ch6-P3; `rejectedInputs` flipped
 * three-state by packet ch7-P3): ONE read-only export of one run,
 * reading from the store and the injected diag reader ONLY —
 * env/runtime material cannot enter by construction.
 *
 * The shape below IS the canonical bundle schema (the ch7-P3 K matrix
 * supersedes ch6-P3's `rejectedInputs` row; every other level is
 * inherited unchanged — the single source for the keyset tests and the
 * ch7-P4 JSON consumer). Unknown instance = null (the §6.2 read-surface
 * duality) — decided by the committed detail read alone: the diag store
 * has no instance-existence authority (S7).
 */
export interface BundleEnvelopeMeta {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
  readonly type: string;
  readonly actorId: string;
  readonly expectedVersion?: number;
  /** The warrant's role claim (ch11-P1 aftermath: the bundle is a
   * hand-projection surface, not a pass-through — the field must be
   * carried explicitly or it silently vanishes from the export). */
  readonly expectedRole?: string;
  /** Delivery provenance, pass-through (optional on EventEnvelope). */
  readonly eventId?: string;
  /** Distinguishes "payload omitted by policy" from "never had one". */
  readonly hasPayload: boolean;
  /** Present ONLY when hasPayload AND the policy admits it. */
  readonly payload?: unknown;
}

export interface BundleTranscriptRow {
  readonly seq: number;
  readonly committedAt: EpochMillis;
  readonly payloadDigest: string;
  readonly envelope: BundleEnvelopeMeta;
}

/**
 * F4 (packet ch12-p1b): a lifecycle fact row in the bundle — the
 * ch6-P3 pass-through fidelity binds (every detail-transcript row
 * appears), so fact rows map to this DISCRIMINATED shape: the
 * class-shared fields in full, the transition-only fields ABSENT by
 * class (never known-empty). Transition rows keep the built
 * `BundleTranscriptRow` shape unchanged.
 */
export interface BundleFactRow {
  readonly seq: number;
  readonly entryKind: LifecycleFactKind;
  readonly opId: OpId;
  readonly committedAt: EpochMillis;
}

export type BundleRow = BundleTranscriptRow | BundleFactRow;

/**
 * The bundle diag-row projection (the ch7-P3 J matrix): a COPY of
 * plan-enumerated fields from the read-face event — it derives nothing
 * and performs no fallible work beyond its own reads. `errorName` is
 * `error.name` ONLY, flattened to a scalar (an error OBJECT would leave
 * a structural slot for `message`; the flat key makes the no-message
 * rule structural) and capped at a 64-code-unit prefix (J10).
 * `error.message`, attribution fields, and version fields NEVER appear
 * (J9's closed exclusion list).
 */
export interface BundleDiagRow {
  readonly kind: DiagnosticKind;
  readonly source: DiagnosticSource;
  readonly at: EpochMillis;
  readonly ordinal: number;
  readonly reason?: RejectionName;
  readonly errorName?: string;
  readonly payloadDigest?: string;
  readonly detail?: IngressDetailToken;
}

/**
 * Three-state, NEVER a silent empty (plan §7.4): attributed rows
 * present (zero rows = known-empty), or `unavailable(reason)` with the
 * enumerated token — never underlying error text. The ch6-P3 `absent`
 * state RETIRED with this packet: the union has no such member, so it
 * cannot re-enter.
 */
export type RejectedInputsSection =
  | { readonly status: "present"; readonly rows: readonly BundleDiagRow[] }
  | { readonly status: "unavailable"; readonly reason: DiagUnavailableReason };

export interface DebugBundle {
  readonly formatVersion: 1;
  /** The RedactionPolicy id this bundle was produced under. */
  readonly policy: string;
  readonly instance: WorkflowInstance;
  readonly transcript: readonly BundleRow[];
  readonly rejectedInputs: RejectedInputsSection;
}

/**
 * The production default (the closed memo's secret-exfil guardrail):
 * payloads do NOT appear; hasPayload + payloadDigest remain as the
 * fingerprint. The normal CLI graph MUST bind this policy
 * (REV-BUNDLE-DEFAULT-POLICY, verified at the P4 review).
 */
export const redactPayloadsPolicy: RedactionPolicy = {
  id: "redact-payloads",
  includePayload: () => false,
};

export interface DebugBundleExporter {
  exportDebugBundle(instanceId: InstanceId): Promise<DebugBundle | null>;
}

/** J10: the projected errorName is `error.name`'s first 64 UTF-16 code
 * units — deterministic prefix truncation, unmarked; a conforming name
 * is untouched. Caps the per-event covert-channel bandwidth of the one
 * stated free-text exception (the STOP-2 verdict). */
const ERROR_NAME_CAP = 64;

/** K3's token enum — a name-matched carrier's `reason` is VALIDATED
 * against it, so a lying carrier degrades to `read_failed` and free
 * text never rides the `unavailable` lane. */
const DIAG_UNAVAILABLE_REASONS: ReadonlySet<string> = new Set([
  "open_failed",
  "refused_marker",
  "read_failed",
]);

/**
 * The reader is REQUIRED (X2): an optional dep would leave a silent
 * path back toward an undeclared section state — explicit wiring
 * forecloses it (the `KernelDeps.diag` culture, ch7-P1).
 */
export function createDebugBundleExporter(
  store: StorePort,
  policy: RedactionPolicy,
  diag: DiagnosticsReader,
): DebugBundleExporter {
  return {
    async exportDebugBundle(instanceId: InstanceId): Promise<DebugBundle | null> {
      // The committed half is authoritative: its failure is the export's
      // failure (S9), and existence is ITS decision — on null the diag
      // reader is never consulted (S7).
      const detail = await store.getInstanceDetail(instanceId);
      if (detail === null) {
        return null;
      }
      return {
        formatVersion: 1,
        policy: policy.id,
        instance: detail.instance,
        transcript: detail.transcript.map((entry) => toBundleRow(entry, policy)),
        rejectedInputs: await readRejectedInputs(diag, instanceId),
      };
    },
  };
}

/**
 * The succeed-anyway scope is the DIAG side only (§7.3: the bundle
 * itself SUCCEEDS under ANY diag-side failure). The catch wraps the
 * diag read AND the row projection — the whole diag-side consumption,
 * never the committed half. Every S6 member lands here: a non-typed
 * rejection or synchronous throw, a lying name-matched carrier, and a
 * malformed resolved row that breaks the projection.
 */
async function readRejectedInputs(
  diag: DiagnosticsReader,
  instanceId: InstanceId,
): Promise<RejectedInputsSection> {
  try {
    const events = await diag.getDiagnostics(instanceId, 0);
    return { status: "present", rows: events.map(toDiagRow) };
  } catch (error) {
    return { status: "unavailable", reason: diagFailureReason(error) };
  }
}

/**
 * `DiagUnavailableError` is matched BY NAME — the P2 cross-module
 * `(name, reason)` contract; `floor/` takes no `diag/` value import
 * (ADR-007 discipline, lint-mechanized in this packet) — and its
 * `reason` is validated against the three-token enum.
 */
function diagFailureReason(error: unknown): DiagUnavailableReason {
  if (error instanceof Error && error.name === "DiagUnavailableError") {
    const reason: unknown = (error as unknown as { reason?: unknown }).reason;
    if (typeof reason === "string" && DIAG_UNAVAILABLE_REASONS.has(reason)) {
      return reason as DiagUnavailableReason;
    }
  }
  return "read_failed";
}

function toDiagRow(event: DiagnosticEvent): BundleDiagRow {
  return {
    kind: event.kind,
    source: event.source,
    at: event.at,
    ordinal: event.ordinal,
    ...(event.reason !== undefined ? { reason: event.reason } : {}),
    // internal_failure carries `error` by the P1/P2 contract; a
    // malformed resolved row (error absent) breaks THIS read — S6
    // member (iii), lost to the diag-side catch, never a thrown export.
    ...(event.kind === "internal_failure"
      ? { errorName: (event.error as { name: string }).name.slice(0, ERROR_NAME_CAP) }
      : {}),
    ...(event.payloadDigest !== undefined ? { payloadDigest: event.payloadDigest } : {}),
    ...(event.detail !== undefined ? { detail: event.detail } : {}),
  };
}

function toBundleRow(entry: TranscriptEntry, policy: RedactionPolicy): BundleRow {
  // F4: exhaustive discriminant — a fact row maps to its own shape,
  // pass-through fidelity preserved (every detail row appears).
  if (entry.entryKind !== "transition") {
    return {
      seq: entry.seq,
      entryKind: entry.entryKind,
      opId: entry.opId,
      committedAt: entry.committedAt,
    };
  }
  const envelope: EventEnvelope = entry.envelope;
  const hasPayload = "payload" in envelope;
  return {
    seq: entry.seq,
    committedAt: entry.committedAt,
    payloadDigest: entry.payloadDigest,
    envelope: {
      instanceId: envelope.instanceId,
      opId: envelope.opId,
      type: envelope.type,
      actorId: envelope.actorId,
      ...(envelope.expectedVersion !== undefined
        ? { expectedVersion: envelope.expectedVersion }
        : {}),
      ...(envelope.expectedRole !== undefined ? { expectedRole: envelope.expectedRole } : {}),
      ...(envelope.eventId !== undefined ? { eventId: envelope.eventId } : {}),
      hasPayload,
      ...(hasPayload && policy.includePayload(envelope)
        ? { payload: envelope.payload }
        : {}),
    },
  };
}
