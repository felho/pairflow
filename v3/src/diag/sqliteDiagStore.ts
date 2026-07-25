import { DatabaseSync } from "node:sqlite";

import { REJECTION_NAMES } from "../domain/index.js";
import type {
  DiagnosticEvent,
  DiagnosticEventBody,
  DiagnosticsReader,
  DiagnosticsSink,
  DiagUnavailableReason,
} from "../ports/diagnostics.js";
import {
  ATTEMPT_SCOPED_ERRAND_EDGES,
  ERRAND_BIRTH_EDGES,
  ERRAND_EDGES,
  ERRAND_STATES,
  SPAWN_OUTCOMES,
} from "../ports/diagnostics.js";
import type { TimeSource } from "../ports/time.js";

/**
 * The store-backed diagnostic channel (packet ch7-P2, ADR-010): ONE
 * SQLite file PER CHANNEL, physically separate from the main store, so
 * a diag row cannot reach a committed surface and a corrupt diag DB
 * cannot touch the main path. The sink FAILS OPEN (emit never throws);
 * the reader FAILS LOUD (unavailable/corrupt is a typed error, never
 * `[]`). It is the ADR-003 fence transposed: the SAME wipe fence as the
 * main store, but refusal DEGRADES to unavailable instead of throwing.
 *
 * OPEN ORDER — schema fence FIRST, WAL PRAGMA LAST — a deliberate
 * divergence from `openStore`'s WAL-first order: the PRAGMA is a
 * potential journal-mode-switch WRITE and must never fire before the
 * fence on hostile/readonly states; WAL is a persistent file property,
 * so setting it once the schema settles is equivalent.
 */
const SCHEMA_VERSION = "1";

const SCHEMA = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
CREATE TABLE diagnostics (
  ordinal     INTEGER PRIMARY KEY AUTOINCREMENT,
  at          INTEGER NOT NULL,
  instance_id TEXT,
  body        TEXT NOT NULL
) STRICT;
CREATE INDEX diagnostics_instance ON diagnostics (instance_id, ordinal);
`;

/**
 * The typed unavailability the reader raises. The cross-module contract
 * is `(name, reason)` — a consumer matches by `error.name` without a
 * `diag/` value import (`ports/` stays type-only, ADR-007). The message
 * is UNTRUSTED free text (may embed path/driver fragments), confined to
 * the diag channel's local surfaces (§7.4).
 */
export class DiagUnavailableError extends Error {
  readonly reason: DiagUnavailableReason;
  constructor(reason: DiagUnavailableReason, message?: string) {
    super(message ?? `diag store unavailable: ${reason}`);
    this.name = "DiagUnavailableError";
    this.reason = reason;
  }
}

export interface DiagStoreHandle {
  readonly sink: DiagnosticsSink;
  readonly reader: DiagnosticsReader;
  close(): void;
}

// ---------------------------------------------------------------------------
// Emit-side allowlist projection.
//
// TYPE-LEVEL SYNCED to DiagnosticEventBody: this Record forces a compile
// error if the port type gains or drops a key (the CHK-A2-IDEMKEY
// pattern), so the allowlist cannot silently drift from the shape it
// projects and validates.
// ---------------------------------------------------------------------------
const BODY_KEYS: Record<keyof DiagnosticEventBody, true> = {
  source: true,
  kind: true,
  instanceId: true,
  opId: true,
  actorId: true,
  type: true,
  reason: true,
  detail: true,
  requestId: true,
  providerReason: true,
  providerDetail: true,
  // packet ch9-p3a, DG1 — the errand_transition body fields.
  contextPacketId: true,
  errandEdge: true,
  errandTo: true,
  errandFrom: true,
  attemptId: true,
  // packet ch9-p3b, DG2 — the spawn_outcome body fields.
  spawnOutcome: true,
  spawnDetail: true,
  expectedVersion: true,
  currentVersion: true,
  payloadDigest: true,
  error: true,
};
const ALLOWLIST: ReadonlySet<string> = new Set(Object.keys(BODY_KEYS));

const KINDS: ReadonlySet<string> = new Set([
  "rejected",
  "stale",
  "duplicate",
  "cas_restart",
  "internal_failure",
  // packet ch9-p2, DG2 — the runner-plane provisioning kinds.
  "provision_ready",
  "provision_failed",
  // packet ch9-p3a, DG1 — the errand state-transition kind.
  "errand_transition",
  // packet ch9-p3b, DG2 — the spawn-outcome kind.
  "spawn_outcome",
]);
const ERRAND_STATE_SET: ReadonlySet<string> = new Set(ERRAND_STATES);
const ERRAND_EDGE_SET: ReadonlySet<string> = new Set(ERRAND_EDGES);
// The ONE membership source (ports/diagnostics.ts) — `name_collision` joined
// at ch9-P4a (DG3), so the read gate admits it through this same derivation.
const SPAWN_OUTCOME_SET: ReadonlySet<string> = new Set(SPAWN_OUTCOMES);
const ATTEMPT_SCOPED_EDGE_SET: ReadonlySet<string> = new Set(ATTEMPT_SCOPED_ERRAND_EDGES);
const ERRAND_BIRTH_EDGE_SET: ReadonlySet<string> = new Set(ERRAND_BIRTH_EDGES);
const DETAIL_TOKENS: ReadonlySet<string> = new Set([
  "not_plain_object",
  "unknown_key",
  "invalid_required_string",
  "invalid_expected_version",
  "invalid_expected_role",
  "invalid_event_id",
  "payload_not_canonicalizable",
]);
const REASONS: ReadonlySet<string> = new Set(REJECTION_NAMES);
// The L1 members (ch11-P1 D1) are all POST-DIGEST lanes; unknown_instance
// stays the only pre-digest member (the payloadDigest presence branch).
const KERNEL_REJECTED_REASONS: ReadonlySet<string> = new Set([
  "unknown_instance",
  "missing_version",
  "no_transition",
  "op_id_collision",
  "not_active",
  "missing_role",
  "role_not_authorized",
  "not_authorized",
]);
const ATTRIBUTION = ["instanceId", "opId", "actorId", "type"] as const;

/**
 * The ALLOWLIST PROJECTION: each declared key read as an own property
 * ONCE into a FRESH plain object, so extra enumerable keys are DROPPED
 * and a carrier `toJSON` is never consulted (the store performs COPIES,
 * never computation). A throwing getter surfaces here and is swallowed
 * by the emit fence.
 */
function project(body: DiagnosticEventBody): Record<string, unknown> {
  const {
    source,
    kind,
    instanceId,
    opId,
    actorId,
    type,
    reason,
    detail,
    requestId,
    providerReason,
    providerDetail,
    contextPacketId,
    errandEdge,
    errandTo,
    errandFrom,
    attemptId,
    spawnOutcome,
    spawnDetail,
    expectedVersion,
    currentVersion,
    payloadDigest,
    error,
  } = body;
  const out: Record<string, unknown> = { source, kind };
  if (instanceId !== undefined) out.instanceId = instanceId;
  if (opId !== undefined) out.opId = opId;
  if (actorId !== undefined) out.actorId = actorId;
  if (type !== undefined) out.type = type;
  if (reason !== undefined) out.reason = reason;
  if (detail !== undefined) out.detail = detail;
  if (requestId !== undefined) out.requestId = requestId;
  if (providerReason !== undefined) out.providerReason = providerReason;
  if (providerDetail !== undefined) out.providerDetail = providerDetail;
  if (contextPacketId !== undefined) out.contextPacketId = contextPacketId;
  if (errandEdge !== undefined) out.errandEdge = errandEdge;
  if (errandTo !== undefined) out.errandTo = errandTo;
  if (errandFrom !== undefined) out.errandFrom = errandFrom;
  if (attemptId !== undefined) out.attemptId = attemptId;
  if (spawnOutcome !== undefined) out.spawnOutcome = spawnOutcome;
  if (spawnDetail !== undefined) out.spawnDetail = spawnDetail;
  if (expectedVersion !== undefined) out.expectedVersion = expectedVersion;
  if (currentVersion !== undefined) out.currentVersion = currentVersion;
  if (payloadDigest !== undefined) out.payloadDigest = payloadDigest;
  // Nested error read ONCE each — never the carrier object verbatim.
  if (error !== undefined) out.error = { name: error.name, message: error.message };
  return out;
}

// ---------------------------------------------------------------------------
// Read-side shape gate (R3) — the Canonical R3 row-decidable shape table.
// The SAME allowlist as emit (zero key drift). Any violation throws;
// the reader maps every throw to `read_failed`.
// ---------------------------------------------------------------------------
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function present(o: Record<string, unknown>, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined;
}
function isSafeVersion(v: unknown): boolean {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && !Object.is(v, -0);
}
function bad(what: string): never {
  throw new Error(`R3 shape gate: ${what}`);
}

function validateShape(row: unknown): DiagnosticEventBody {
  if (!isPlainObject(row)) bad("row is not a plain object");
  // Allowlist: no non-allowlisted keys.
  for (const key of Object.keys(row)) {
    if (!ALLOWLIST.has(key)) bad(`unknown key '${key}'`);
  }
  const source = row.source;
  const kind = row.kind;
  if (source !== "ingress" && source !== "kernel" && source !== "runner") {
    bad("source not in enum");
  }
  if (typeof kind !== "string" || !KINDS.has(kind)) bad("kind not in enum");

  // Common field types (for every present field).
  for (const k of ATTRIBUTION) {
    if (present(row, k) && typeof row[k] !== "string") bad(`${k} not a string`);
  }
  if (present(row, "payloadDigest") && typeof row.payloadDigest !== "string") {
    bad("payloadDigest not a string");
  }
  if (present(row, "reason") && (typeof row.reason !== "string" || !REASONS.has(row.reason))) {
    bad("reason not a RejectionName");
  }
  if (present(row, "detail") && (typeof row.detail !== "string" || !DETAIL_TOKENS.has(row.detail))) {
    bad("detail not an IngressDetailToken");
  }
  // Runner-plane fields (packet ch9-p2, DG3) — STRING-typed. providerReason
  // is an UNTRUSTED report, so its enum membership is deliberately NOT
  // read-gated: a hostile token can never fail the whole read.
  if (present(row, "requestId") && typeof row.requestId !== "string") bad("requestId not a string");
  if (present(row, "providerReason") && typeof row.providerReason !== "string") {
    bad("providerReason not a string");
  }
  if (present(row, "providerDetail") && typeof row.providerDetail !== "string") {
    bad("providerDetail not a string");
  }
  // Runner-plane errand fields (packet ch9-p3a, DG3) — closed-domain / string.
  if (present(row, "contextPacketId") && typeof row.contextPacketId !== "string") {
    bad("contextPacketId not a string");
  }
  if (present(row, "attemptId") && typeof row.attemptId !== "string") bad("attemptId not a string");
  if (
    present(row, "spawnOutcome") &&
    (typeof row.spawnOutcome !== "string" || !SPAWN_OUTCOME_SET.has(row.spawnOutcome))
  ) {
    bad("spawnOutcome not a SpawnOutcome");
  }
  if (present(row, "spawnDetail") && typeof row.spawnDetail !== "string") {
    bad("spawnDetail not a string");
  }
  if (
    present(row, "errandEdge") &&
    (typeof row.errandEdge !== "string" || !ERRAND_EDGE_SET.has(row.errandEdge))
  ) {
    bad("errandEdge not an ErrandEdge");
  }
  for (const k of ["errandTo", "errandFrom"] as const) {
    if (present(row, k) && (typeof row[k] !== "string" || !ERRAND_STATE_SET.has(row[k]))) {
      bad(`${k} not an ErrandState`);
    }
  }
  for (const k of ["expectedVersion", "currentVersion"] as const) {
    if (present(row, k) && !isSafeVersion(row[k])) bad(`${k} not a nonnegative safe integer`);
  }
  if (present(row, "error")) {
    const error = row.error;
    if (!isPlainObject(error)) bad("error not an object");
    for (const key of Object.keys(error)) {
      if (key !== "name" && key !== "message") bad(`error has unexpected key '${key}'`);
    }
    if (typeof error.name !== "string" || typeof error.message !== "string") {
      bad("error.name/message not strings");
    }
  }

  // Presence iffs (both directions).
  if (present(row, "reason") !== (kind === "rejected")) bad("reason iff kind=rejected");
  if (present(row, "error") !== (kind === "internal_failure")) {
    bad("error iff kind=internal_failure");
  }
  const hasExp = present(row, "expectedVersion");
  const hasCur = present(row, "currentVersion");
  if (hasExp !== (kind === "stale") || hasCur !== (kind === "stale")) {
    bad("both versions iff kind=stale");
  }
  if (present(row, "detail") !== (source === "ingress")) bad("detail iff source=ingress");

  // Runner-plane presence iffs (packet ch9-p2 DG3 + ch9-p3a DG3 — both
  // directions). The runner source now carries THREE kinds; requestId is
  // RE-SCOPED to the two provisioning kinds (flag F5). The errand fields are
  // KEYED on kind=errand_transition, and errandFrom/attemptId are further
  // keyed on `errandEdge` (from/to alone could not decide the attemptId iff).
  const isProvisionKind = kind === "provision_ready" || kind === "provision_failed";
  const isErrandKind = kind === "errand_transition";
  const isSpawnKind = kind === "spawn_outcome";
  const isRunnerKind = isProvisionKind || isErrandKind || isSpawnKind;
  if (isRunnerKind !== (source === "runner")) bad("runner kinds iff source=runner");
  if (present(row, "requestId") !== isProvisionKind) bad("requestId iff a provisioning kind");
  if (present(row, "providerReason") !== (kind === "provision_failed")) {
    bad("providerReason iff kind=provision_failed");
  }
  if (present(row, "providerDetail") && kind !== "provision_failed") {
    bad("providerDetail requires kind=provision_failed");
  }
  // contextPacketId is SHARED by errand_transition + spawn_outcome (ch9-p3b
  // DG2 re-scope — split OUT of the errand-only loop); required on both.
  if (present(row, "contextPacketId") !== (isErrandKind || isSpawnKind)) {
    bad("contextPacketId iff kind ∈ {errand_transition, spawn_outcome}");
  }
  // errandEdge/errandTo ride ONLY errand_transition (both directions).
  for (const k of ["errandEdge", "errandTo"] as const) {
    if (present(row, k) !== isErrandKind) bad(`${k} iff kind=errand_transition`);
  }
  if (present(row, "errandFrom") && !isErrandKind) bad("errandFrom requires kind=errand_transition");
  // spawnOutcome iff spawn_outcome (both directions); spawnDetail requires it.
  if (present(row, "spawnOutcome") !== isSpawnKind) bad("spawnOutcome iff kind=spawn_outcome");
  if (present(row, "spawnDetail") && !isSpawnKind) bad("spawnDetail requires kind=spawn_outcome");
  // attemptId is legal on errand_transition (edge-gated below) AND on
  // spawn_outcome (always, gated in the runner branch below).
  if (present(row, "attemptId") && !isErrandKind && !isSpawnKind) {
    bad("attemptId requires kind ∈ {errand_transition, spawn_outcome}");
  }

  if (source === "runner") {
    // A runner event carries instanceId and NOTHING from the op/envelope world.
    if (!present(row, "instanceId")) bad("runner row requires instanceId");
    for (const k of ["opId", "actorId", "type"] as const) {
      if (present(row, k)) bad(`runner source carries no ${k}`);
    }
    if (present(row, "payloadDigest")) bad("runner carries no payloadDigest");
    if (isErrandKind) {
      // errandFrom iff a NON-birth edge; attemptId iff an attempt-scoped edge —
      // both keyed on errandEdge (DG3). The two H5 successor edges
      // (evidence-at-claim/evidence-at-respawn) are non-birth + non-attempt-
      // scoped, so they carry errandFrom and NO attemptId.
      const edge = row.errandEdge as string;
      const isBirth = ERRAND_BIRTH_EDGE_SET.has(edge);
      if (present(row, "errandFrom") === isBirth) bad("errandFrom iff a non-birth errand edge");
      if (present(row, "attemptId") !== ATTEMPT_SCOPED_EDGE_SET.has(edge)) {
        bad("attemptId iff an attempt-scoped errand edge");
      }
    } else if (isSpawnKind) {
      // spawn_outcome (ch9-p3b, DG2): contextPacketId, attemptId, spawnOutcome
      // are ALWAYS present (the presence iffs above already force
      // contextPacketId + spawnOutcome; attemptId is REQUIRED here — a
      // silently-swallowed reject would eat every spawn_outcome event behind
      // the fail-open fence).
      if (!present(row, "attemptId")) bad("spawn_outcome requires attemptId");
    } else if (present(row, "attemptId")) {
      // A provisioning kind carries no attemptId.
      bad("a provisioning kind carries no attemptId");
    }
    return row as unknown as DiagnosticEventBody;
  }

  const fullEnvelope = (): void => {
    for (const k of ATTRIBUTION) {
      if (!present(row, k)) bad(`kernel ${kind} requires full envelope (missing ${k})`);
    }
  };

  if (source === "ingress") {
    // ingress ⇒ rejected + invalid_shape + detail; NO payloadDigest.
    if (kind !== "rejected") bad("ingress source ⇒ kind=rejected");
    if (row.reason !== "invalid_shape") bad("ingress reason must be invalid_shape");
    if (present(row, "payloadDigest")) bad("ingress carries no payloadDigest");
    if (row.detail === "not_plain_object") {
      for (const k of ATTRIBUTION) {
        if (present(row, k)) bad(`not_plain_object carries no attribution (${k})`);
      }
    } else {
      // Other detail tokens: attribution OPTIONAL but each present field
      // must be a NON-EMPTY string (ingress admits only isNonEmptyString
      // values). INGRESS-ONLY — kernel attribution has no such gate.
      for (const k of ATTRIBUTION) {
        if (present(row, k) && (row[k] as string).length === 0) {
          bad(`ingress attribution '${k}' must be a non-empty string`);
        }
      }
    }
    return row as unknown as DiagnosticEventBody;
  }

  // source === "kernel"
  switch (kind) {
    case "duplicate":
    case "cas_restart":
      fullEnvelope();
      if (!present(row, "payloadDigest")) bad(`kernel ${kind} requires payloadDigest`);
      break;
    case "stale":
      fullEnvelope();
      if (!present(row, "payloadDigest")) bad("kernel stale requires payloadDigest");
      break;
    case "rejected": {
      if (!KERNEL_REJECTED_REASONS.has(row.reason as string)) {
        bad("kernel rejected reason not a kernel handle-lane reason");
      }
      fullEnvelope();
      if (row.reason === "unknown_instance") {
        if (present(row, "payloadDigest")) bad("unknown_instance is pre-digest (no payloadDigest)");
      } else if (!present(row, "payloadDigest")) {
        bad("post-digest kernel rejected requires payloadDigest");
      }
      break;
    }
    case "internal_failure": {
      // instanceId floor; opId/actorId/type all-or-none; digest ⇒ all three.
      if (!present(row, "instanceId")) bad("kernel internal_failure requires instanceId");
      const triple = ["opId", "actorId", "type"] as const;
      const some = triple.some((k) => present(row, k));
      const all = triple.every((k) => present(row, k));
      if (some && !all) bad("internal_failure opId/actorId/type must be all-or-none");
      if (present(row, "payloadDigest") && !all) {
        bad("digested internal_failure requires full envelope");
      }
      break;
    }
  }
  return row as unknown as DiagnosticEventBody;
}

interface DiagRow {
  ordinal: number;
  at: number;
  instance_id: string | null;
  body: string;
}

function initSchema(db: DatabaseSync): void {
  db.exec(SCHEMA);
  const insert = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  insert.run("schema_version", SCHEMA_VERSION);
  insert.run("prototype", "true");
}

interface OpenResult {
  readonly available: boolean;
  readonly reason?: DiagUnavailableReason;
}

/**
 * The fence, fail-OPEN. Returns the availability outcome; a controlled
 * REFUSE (bad/missing marker) returns `refused_marker` WITHOUT throwing
 * and leaves the file intact. A hostile substrate (constructor, probe,
 * wipe DROP, init CREATE) throws — the caller maps it to `open_failed`.
 */
function fence(db: DatabaseSync): OpenResult {
  const tableCount = db
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'")
    .get() as { n: number };
  if (tableCount.n === 0) {
    initSchema(db);
    return { available: true };
  }

  let marker: { schemaVersion: string | undefined; prototype: string | undefined };
  try {
    const rows = db.prepare("SELECT key, value FROM meta").all() as {
      key: string;
      value: string;
    }[];
    marker = {
      schemaVersion: rows.find((r) => r.key === "schema_version")?.value,
      prototype: rows.find((r) => r.key === "prototype")?.value,
    };
  } catch {
    return { available: false, reason: "refused_marker" };
  }
  if (marker.schemaVersion === undefined || marker.prototype === undefined) {
    return { available: false, reason: "refused_marker" };
  }
  if (marker.prototype !== "true") {
    return { available: false, reason: "refused_marker" };
  }
  if (marker.schemaVersion !== SCHEMA_VERSION) {
    // The fenced dev path: known prototype store, moved schema. The DROP
    // is the first WRITE — on a readonly file it throws here (→ open_failed,
    // file intact). The index falls with its table.
    db.exec("DROP TABLE IF EXISTS diagnostics; DROP TABLE IF EXISTS meta;");
    initSchema(db);
  }
  return { available: true };
}

export function openDiagStore(path: string, time: TimeSource): DiagStoreHandle {
  let db: DatabaseSync | undefined;
  let available = false;
  let reason: DiagUnavailableReason | undefined;

  try {
    db = new DatabaseSync(path);
    const result = fence(db);
    if (!result.available) {
      reason = result.reason;
    } else {
      // WAL PRAGMA LAST — the potential journal-mode-switch WRITE fires
      // only after the fence settles (skipped for in-memory).
      if (path !== ":memory:") {
        db.exec("PRAGMA journal_mode = WAL");
      }
      available = true;
    }
  } catch {
    reason = "open_failed";
    available = false;
  }

  if (!available) {
    // Born unavailable: release the underlying handle (if any). The file
    // is left exactly as found — refuse/hostile lanes never mutate it.
    if (db !== undefined) {
      try {
        db.close();
      } catch {
        // ignore — best-effort release
      }
      db = undefined;
    }
    reason ??= "open_failed";
  }

  const openReason = reason ?? "open_failed";

  const sink: DiagnosticsSink = {
    emit(body: DiagnosticEventBody): void {
      // The swallow fence wraps the ENTIRE body: unavailable store,
      // hostile getter, throwing clock, BigInt-lied stringify, closed
      // handle, STRICT type rejection — every failure is silent.
      try {
        if (!available || db === undefined) return;
        const projected = project(body);
        // WRITE-SIDE shape gate: the projected object must itself be a
        // valid P1 projection — the SAME gate the reader runs (R3). A
        // NON-throwing type-lie (e.g. `instanceId: 123`) is valid JSON
        // yet not a projection; without this it would write a row that
        // poisons EVERY later read as `read_failed` (dimension 8b: the
        // file holds ONLY projections; dimension 5: a lied value is lost
        // to the swallow fence — non-throwing lies included).
        validateShape(projected);
        const at = time.now();
        const instanceId = projected.instanceId;
        db.prepare("INSERT INTO diagnostics (at, instance_id, body) VALUES (?, ?, ?)").run(
          at,
          typeof instanceId === "string" ? instanceId : null,
          JSON.stringify(projected),
        );
      } catch {
        // Fail-open: swallow EVERY failure (REV-DIAG-FAILOPEN).
      }
    },
  };

  function read(sql: string, params: readonly (string | number)[], afterOrdinal: number): Promise<
    readonly DiagnosticEvent[]
  > {
    // 1. Cursor validation FIRST — before availability, before SQL.
    if (!Number.isSafeInteger(afterOrdinal) || afterOrdinal < 0 || Object.is(afterOrdinal, -0)) {
      return Promise.reject(
        new RangeError(
          `diag cursor must be a nonnegative safe integer, got ${String(afterOrdinal)}`,
        ),
      );
    }
    // 2. Availability — the open outcome's reason (open_failed / refused_marker).
    if (!available || db === undefined) {
      return Promise.reject(new DiagUnavailableError(openReason));
    }
    // 3. Single SELECT (no read transaction — no null decision to bind),
    // then parse + shape-gate each row. Any failure fails the WHOLE read.
    try {
      const rows = db.prepare(sql).all(...params) as unknown as DiagRow[];
      const events = rows.map((row): DiagnosticEvent => {
        const body = validateShape(JSON.parse(row.body));
        return { ...body, at: row.at, ordinal: row.ordinal };
      });
      return Promise.resolve(events);
    } catch {
      return Promise.reject(new DiagUnavailableError("read_failed"));
    }
  }

  const reader: DiagnosticsReader = {
    getDiagnostics(instanceId, afterOrdinal) {
      return read(
        "SELECT ordinal, at, instance_id, body FROM diagnostics WHERE instance_id = ? AND ordinal > ? ORDER BY ordinal",
        [instanceId, afterOrdinal],
        afterOrdinal,
      );
    },
    getGlobalDiagnostics(afterOrdinal) {
      return read(
        "SELECT ordinal, at, instance_id, body FROM diagnostics WHERE ordinal > ? ORDER BY ordinal",
        [afterOrdinal],
        afterOrdinal,
      );
    },
  };

  return {
    sink,
    reader,
    close(): void {
      // Single-close by the owning composition root (StoreHandle parity).
      // The reference is kept so a post-close read hits `read_failed`
      // (C1), not the born-unavailable reason. FAIL-OPEN (packet ch7-p4
      // V8, aftermath-born): the channel swallows its OWN release
      // failure — a close throw escaping a verb's `finally` would flip
      // a successful outcome, which the CLI's Claim 5/M10 forbid;
      // symmetric with the born-unavailable release catch above.
      try {
        db?.close();
      } catch {
        // ignore — best-effort release (the same catch owns OS-level
        // close failures; a second close lands here too)
      }
    },
  };
}
