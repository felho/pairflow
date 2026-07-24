import { DatabaseSync } from "node:sqlite";

import { REJECTION_NAMES } from "../domain/index.js";
import type { ErrandState } from "../ports/diagnostics.js";
import { ERRAND_STATES } from "../ports/diagnostics.js";
import type { TimeSource } from "../ports/time.js";

/**
 * The delivery-errand ledger (ES family; packet ch9-p3a, ADR-016). A
 * RUNNER-OWNED host-local SQLite file, physically SEPARATE from the kernel
 * store and the diag store (ADR-010 one-file-per-concern), WAL journal,
 * `BEGIN IMMEDIATE` write transactions, same mount/agent-unreachability rules
 * as the kernel DB. The kernel schema and its ADR-003 fence stay untouched.
 *
 * Authority character: the errand store is AUTHORITATIVE for runner-plane
 * delivery state and therefore FAIL-LOUD (ES5 — the transpose of the diag
 * store's fail-open): open failure, IO failure, constraint violation (other
 * than ES3's retried mint), and shape-invalid stored rows THROW typed errors,
 * never `[]`, never a silent fallback.
 *
 * The raw handle is module-INTERNAL: the MODULE-PUBLIC read path is the
 * reader facade (`createErrandReader`, runner/index.ts) composed with the
 * kernel read seam, so CF3's read-time re-check is structurally unbypassable.
 */

const SCHEMA_VERSION = "1";

const SCHEMA = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
CREATE TABLE errands (
  instance_id            TEXT    NOT NULL,
  context_packet_id      TEXT    NOT NULL,
  expected_version       INTEGER NOT NULL,
  actor_id               TEXT    NOT NULL,
  state                  TEXT    NOT NULL,
  remaining_budget       INTEGER NOT NULL,
  active_attempt_id      TEXT,
  live_session_name      TEXT,
  worker_id              TEXT,
  claimed_at             INTEGER,
  recorded_admit_outcome TEXT,
  discovery              TEXT    NOT NULL,
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL,
  PRIMARY KEY (instance_id, context_packet_id)
) STRICT;
CREATE TABLE attempts (
  attempt_id        TEXT PRIMARY KEY,
  instance_id       TEXT NOT NULL,
  context_packet_id TEXT NOT NULL,
  kind              TEXT NOT NULL,
  started_at        INTEGER NOT NULL
) STRICT;
CREATE TABLE reconciled_runs (
  instance_id   TEXT PRIMARY KEY,
  reconciled_at INTEGER NOT NULL
) STRICT;
`;

export type AttemptKind = "budgeted" | "respawn";
export type DiscoveryMark = "live" | "terminal_backfill";

/** The public, shape-validated errand row (ES2). */
export interface ErrandRow {
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly expectedVersion: number;
  readonly actorId: string;
  readonly state: ErrandState;
  readonly remainingBudget: number;
  readonly activeAttemptId: string | null;
  readonly liveSessionName: string | null;
  readonly workerId: string | null;
  readonly claimedAt: number | null;
  readonly recordedAdmitOutcome: string | null;
  readonly discovery: DiscoveryMark;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface AttemptRecord {
  readonly attemptId: string;
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly kind: AttemptKind;
  readonly startedAt: number;
}

/** The typed fail-loud error (ES5) — the transpose of the diag store's
 * fail-open DiagUnavailableError. A consumer matches by `error.name`. */
export class ErrandStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrandStoreError";
  }
}

const ERRAND_STATE_SET: ReadonlySet<string> = new Set(ERRAND_STATES);
const ATTEMPT_KIND_SET: ReadonlySet<string> = new Set<AttemptKind>(["budgeted", "respawn"]);
const DISCOVERY_SET: ReadonlySet<string> = new Set<DiscoveryMark>(["live", "terminal_backfill"]);
// CF2's closed recorded-admit-outcome domain: an Outcome kind or a
// RejectionName, never free text (ES2). Validated on read (a violating stored
// row is ES5 fail-loud drift).
const RECORDED_ADMIT_OUTCOME_SET: ReadonlySet<string> = new Set<string>([
  "committed",
  "duplicate",
  "stale",
  "rejected",
  ...REJECTION_NAMES,
]);

interface ErrandDbRow {
  instance_id: string;
  context_packet_id: string;
  expected_version: number;
  actor_id: string;
  state: string;
  remaining_budget: number;
  active_attempt_id: string | null;
  live_session_name: string | null;
  worker_id: string | null;
  claimed_at: number | null;
  recorded_admit_outcome: string | null;
  discovery: string;
  created_at: number;
  updated_at: number;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ErrandStoreError(`errand store integrity: '${field}' is not a string`);
  }
  return value;
}

function requireInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new ErrandStoreError(`errand store integrity: '${field}' is not a safe integer`);
  }
  return value;
}

function requireNullableInt(value: unknown, field: string): number | null {
  return value === null ? null : requireInt(value, field);
}

function requireNullableString(value: unknown, field: string): string | null {
  return value === null ? null : requireString(value, field);
}

function mapErrandRow(row: ErrandDbRow): ErrandRow {
  const state = requireString(row.state, "state");
  if (!ERRAND_STATE_SET.has(state)) {
    throw new ErrandStoreError(`errand store integrity: unknown state token '${state}'`);
  }
  const discovery = requireString(row.discovery, "discovery");
  if (!DISCOVERY_SET.has(discovery)) {
    throw new ErrandStoreError(`errand store integrity: unknown discovery token '${discovery}'`);
  }
  const recordedAdmitOutcome = requireNullableString(
    row.recorded_admit_outcome,
    "recorded_admit_outcome",
  );
  if (recordedAdmitOutcome !== null && !RECORDED_ADMIT_OUTCOME_SET.has(recordedAdmitOutcome)) {
    throw new ErrandStoreError(
      `errand store integrity: recorded_admit_outcome '${recordedAdmitOutcome}' is not a closed-domain value`,
    );
  }
  const budget = requireInt(row.remaining_budget, "remaining_budget");
  if (budget < 0) {
    throw new ErrandStoreError("errand store integrity: remaining_budget is negative");
  }
  return {
    instanceId: requireString(row.instance_id, "instance_id"),
    contextPacketId: requireString(row.context_packet_id, "context_packet_id"),
    expectedVersion: requireInt(row.expected_version, "expected_version"),
    actorId: requireString(row.actor_id, "actor_id"),
    state: state as ErrandState,
    remainingBudget: budget,
    activeAttemptId: requireNullableString(row.active_attempt_id, "active_attempt_id"),
    liveSessionName: requireNullableString(row.live_session_name, "live_session_name"),
    workerId: requireNullableString(row.worker_id, "worker_id"),
    claimedAt: requireNullableInt(row.claimed_at, "claimed_at"),
    recordedAdmitOutcome,
    discovery: discovery as DiscoveryMark,
    createdAt: requireInt(row.created_at, "created_at"),
    updatedAt: requireInt(row.updated_at, "updated_at"),
  };
}

// The non-terminal states the moot sink reaches (L4) and the read-time
// re-check ignores in the transient set.
const NON_TERMINAL_STATES: readonly ErrandState[] = [
  "pending",
  "claimed",
  "attempting",
  "unconfirmed",
];

export interface CreateErrandInput {
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly expectedVersion: number;
  readonly actorId: string;
  readonly budget: number;
}

export interface StartAttemptInput {
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly workerId: string;
  readonly now: number;
  readonly attemptIdSource: () => string;
  readonly sessionNamer: (instanceId: string, attemptId: string) => string;
}

export type StartAttemptResult =
  | { readonly kind: "started"; readonly attemptId: string; readonly sessionName: string }
  | { readonly kind: "not_startable" };

export interface RemintInput {
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly oldAttemptId: string;
  readonly workerId: string;
  readonly now: number;
  readonly attemptIdSource: () => string;
  readonly sessionNamer: (instanceId: string, attemptId: string) => string;
}

export type RemintResult =
  | { readonly kind: "reminted"; readonly attemptId: string; readonly sessionName: string }
  | { readonly kind: "inert" };

export interface ConcludeInput {
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly attemptId: string;
}

export interface ReclaimInput {
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly now: number;
  readonly leaseMs: number;
  /** The loop-computed landing (evidence → confirmed, terminal → mooted, else
   * the kind-aware pending/unconfirmed). */
  readonly landing: ErrandState;
}

export interface ErrandStore {
  getErrand(instanceId: string, contextPacketId: string): ErrandRow | null;
  listErrands(): readonly ErrandRow[];
  getAttempt(attemptId: string): AttemptRecord | null;
  isReconciled(instanceId: string): boolean;

  createErrand(input: CreateErrandInput): { created: boolean };
  backfillConfirmed(input: CreateErrandInput): { created: boolean };
  backfillMooted(input: CreateErrandInput): { created: boolean };
  markReconciled(instanceId: string, now: number): void;

  claim(input: {
    instanceId: string;
    contextPacketId: string;
    workerId: string;
    now: number;
  }): { claimed: boolean };

  startBudgetedAttempt(input: StartAttemptInput): StartAttemptResult;
  startRespawnAttempt(input: StartAttemptInput): StartAttemptResult;
  remint(input: RemintInput): RemintResult;

  concludeNegativeBudgeted(input: ConcludeInput): { applied: boolean };
  concludeNegativeRespawn(input: ConcludeInput): { applied: boolean };
  concludeNoOutput(input: ConcludeInput): { applied: boolean };
  concludeOtherAdmit(
    input: ConcludeInput & { recordedAdmitOutcome: string },
  ): { applied: boolean };
  concludeExhaust(input: ConcludeInput): { applied: boolean };
  exhaustAtClaim(input: { instanceId: string; contextPacketId: string }): { applied: boolean };
  concludeConfirmed(input: { instanceId: string; contextPacketId: string }): { applied: boolean };
  concludeMooted(input: { instanceId: string; contextPacketId: string }): { applied: boolean };
  reclaim(input: ReclaimInput): { reclaimed: boolean; clearedAttemptId: string | null };
}

export interface ErrandStoreHandle {
  readonly store: ErrandStore;
  close(): void;
}

export interface OpenErrandStoreOptions {
  /** ES6: the bounded busy wait (default 5000ms) — a liveness knob below
   * contract grain. A still-contended write past the bound surfaces as ES5's
   * fail-loud typed throw. */
  readonly busyTimeoutMs?: number;
}

function initSchema(db: DatabaseSync): void {
  db.exec(SCHEMA);
  const insert = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  insert.run("schema_version", SCHEMA_VERSION);
  insert.run("prototype", "true");
}

/** Fail-CLOSED, fail-LOUD open (ADR-003 fence, ES5): no tables → fresh init;
 * tables but no/incomplete/non-prototype marker → THROW; known prototype at a
 * different schema version → wipe-and-recreate (the fenced dev path). */
function ensureSchema(db: DatabaseSync): void {
  const tableCount = db
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'")
    .get() as { n: number };
  if (tableCount.n === 0) {
    initSchema(db);
    return;
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
    throw new ErrandStoreError(
      "errand store open refused (fail closed): existing database has no readable schema marker",
    );
  }
  if (marker.schemaVersion === undefined || marker.prototype === undefined) {
    throw new ErrandStoreError("errand store open refused (fail closed): schema marker incomplete");
  }
  if (marker.prototype !== "true") {
    throw new ErrandStoreError(
      "errand store open refused (fail closed): non-prototype store; wipe is fenced to dev stores",
    );
  }
  if (marker.schemaVersion !== SCHEMA_VERSION) {
    db.exec(
      "DROP TABLE IF EXISTS reconciled_runs; DROP TABLE IF EXISTS attempts; DROP TABLE IF EXISTS errands; DROP TABLE IF EXISTS meta;",
    );
    initSchema(db);
  }
}

const MINT_RETRY_LIMIT = 100;

export function openErrandStore(
  path: string,
  time: TimeSource,
  options: OpenErrandStoreOptions = {},
): ErrandStoreHandle {
  // ES5: open failure (a bad path, an unopenable file, a rejected open-time
  // PRAGMA) is the fail-loud authority's typed throw — never a raw
  // ERR_SQLITE_ERROR leaking past the store boundary.
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(path);
    if (path !== ":memory:") {
      db.exec("PRAGMA journal_mode = WAL");
    }
    // ES6: the bounded busy wait — the probe-mandated explicit wait discipline
    // the single-process topology never needed.
    db.exec(`PRAGMA busy_timeout = ${String(options.busyTimeoutMs ?? 5000)}`);
  } catch (error) {
    throw new ErrandStoreError(
      `errand store open failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    ensureSchema(db);
  } catch (error) {
    db.close();
    throw error;
  }

  function wrapLoud<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof ErrandStoreError) {
        throw error;
      }
      throw new ErrandStoreError(
        `errand store IO failure: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  function loadErrand(instanceId: string, contextPacketId: string): ErrandRow | null {
    const row = db
      .prepare("SELECT * FROM errands WHERE instance_id = ? AND context_packet_id = ?")
      .get(instanceId, contextPacketId) as ErrandDbRow | undefined;
    return row === undefined ? null : mapErrandRow(row);
  }

  function stamp(): number {
    return time.now();
  }

  /** A CAS conclusion on the active-attempt marker (B2): applies iff the row
   * is `attempting` AND its active_attempt_id equals `attemptId`. Non-promoting
   * writes ride this; a stale attempt's conclusion is INERT. */
  function casConclude(
    input: ConcludeInput,
    toState: ErrandState,
    recordedAdmitOutcome: string | null,
  ): { applied: boolean } {
    return wrapLoud(() => {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = db
          .prepare(
            `UPDATE errands
               SET state = ?, active_attempt_id = NULL, worker_id = NULL, claimed_at = NULL,
                   recorded_admit_outcome = ?, updated_at = ?
             WHERE instance_id = ? AND context_packet_id = ?
               AND state = 'attempting' AND active_attempt_id = ?`,
          )
          .run(
            toState,
            recordedAdmitOutcome,
            stamp(),
            input.instanceId,
            input.contextPacketId,
            input.attemptId,
          );
        db.exec("COMMIT");
        return { applied: result.changes > 0 };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    });
  }

  function createRow(
    input: CreateErrandInput,
    state: ErrandState,
    discovery: DiscoveryMark,
  ): { created: boolean } {
    return wrapLoud(() => {
      db.exec("BEGIN IMMEDIATE");
      try {
        const now = stamp();
        const result = db
          .prepare(
            `INSERT OR IGNORE INTO errands
               (instance_id, context_packet_id, expected_version, actor_id, state,
                remaining_budget, active_attempt_id, live_session_name, worker_id,
                claimed_at, recorded_admit_outcome, discovery, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`,
          )
          .run(
            input.instanceId,
            input.contextPacketId,
            input.expectedVersion,
            input.actorId,
            state,
            input.budget,
            discovery,
            now,
            now,
          );
        db.exec("COMMIT");
        return { created: result.changes > 0 };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    });
  }

  function startAttempt(input: StartAttemptInput, kind: AttemptKind): StartAttemptResult {
    return wrapLoud(() => {
      db.exec("BEGIN IMMEDIATE");
      try {
        const row = db
          .prepare("SELECT * FROM errands WHERE instance_id = ? AND context_packet_id = ?")
          .get(input.instanceId, input.contextPacketId) as ErrandDbRow | undefined;
        if (row === undefined) {
          db.exec("ROLLBACK");
          return { kind: "not_startable" };
        }
        const errand = mapErrandRow(row);
        const requiredState: ErrandState = kind === "budgeted" ? "claimed" : "unconfirmed";
        const budgetOk = kind === "budgeted" ? errand.remainingBudget >= 1 : true;
        if (errand.state !== requiredState || errand.activeAttemptId !== null || !budgetOk) {
          db.exec("ROLLBACK");
          return { kind: "not_startable" };
        }
        // Mint the fresh attempt id with UNIQUE mint-retry (ES3).
        let attemptId = "";
        let minted = false;
        for (let i = 0; i < MINT_RETRY_LIMIT; i += 1) {
          attemptId = input.attemptIdSource();
          try {
            db.prepare(
              "INSERT INTO attempts (attempt_id, instance_id, context_packet_id, kind, started_at) VALUES (?, ?, ?, ?, ?)",
            ).run(attemptId, input.instanceId, input.contextPacketId, kind, stamp());
            minted = true;
            break;
          } catch (error) {
            if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) {
              continue; // collision — re-mint (the ONE retried constraint class)
            }
            throw error;
          }
        }
        if (!minted) {
          db.exec("ROLLBACK");
          throw new ErrandStoreError("errand store: attempt-id mint retries exhausted");
        }
        const sessionName = input.sessionNamer(input.instanceId, attemptId);
        const budgetSql = kind === "budgeted" ? "remaining_budget = remaining_budget - 1," : "";
        db.prepare(
          `UPDATE errands
             SET state = 'attempting', active_attempt_id = ?, live_session_name = ?,
                 worker_id = ?, claimed_at = ?, ${budgetSql} updated_at = ?
           WHERE instance_id = ? AND context_packet_id = ?`,
        ).run(
          attemptId,
          sessionName,
          input.workerId,
          input.now,
          stamp(),
          input.instanceId,
          input.contextPacketId,
        );
        db.exec("COMMIT");
        return { kind: "started", attemptId, sessionName };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    });
  }

  const store: ErrandStore = {
    getErrand(instanceId, contextPacketId) {
      return wrapLoud(() => loadErrand(instanceId, contextPacketId));
    },

    listErrands() {
      return wrapLoud(() => {
        const rows = db
          .prepare("SELECT * FROM errands ORDER BY rowid")
          .all() as unknown as ErrandDbRow[];
        return rows.map(mapErrandRow);
      });
    },

    getAttempt(attemptId) {
      return wrapLoud(() => {
        const row = db
          .prepare("SELECT * FROM attempts WHERE attempt_id = ?")
          .get(attemptId) as
          | { attempt_id: string; instance_id: string; context_packet_id: string; kind: string; started_at: number }
          | undefined;
        if (row === undefined) {
          return null;
        }
        const kind = requireString(row.kind, "kind");
        if (!ATTEMPT_KIND_SET.has(kind)) {
          throw new ErrandStoreError(`errand store integrity: unknown attempt kind '${kind}'`);
        }
        return {
          attemptId: requireString(row.attempt_id, "attempt_id"),
          instanceId: requireString(row.instance_id, "instance_id"),
          contextPacketId: requireString(row.context_packet_id, "context_packet_id"),
          kind: kind as AttemptKind,
          startedAt: requireInt(row.started_at, "started_at"),
        };
      });
    },

    isReconciled(instanceId) {
      return wrapLoud(() => {
        const row = db
          .prepare("SELECT instance_id FROM reconciled_runs WHERE instance_id = ?")
          .get(instanceId);
        return row !== undefined;
      });
    },

    createErrand(input) {
      return createRow(input, "pending", "live");
    },

    backfillConfirmed(input) {
      return createRow(input, "confirmed", "terminal_backfill");
    },

    backfillMooted(input) {
      return createRow(input, "mooted", "terminal_backfill");
    },

    markReconciled(instanceId, now) {
      wrapLoud(() => {
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare(
            "INSERT OR IGNORE INTO reconciled_runs (instance_id, reconciled_at) VALUES (?, ?)",
          ).run(instanceId, now);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
    },

    claim(input) {
      return wrapLoud(() => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = db
            .prepare(
              `UPDATE errands SET state = 'claimed', worker_id = ?, claimed_at = ?, updated_at = ?
                 WHERE instance_id = ? AND context_packet_id = ? AND state = 'pending'`,
            )
            .run(input.workerId, input.now, stamp(), input.instanceId, input.contextPacketId);
          db.exec("COMMIT");
          return { claimed: result.changes > 0 };
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
    },

    startBudgetedAttempt(input) {
      return startAttempt(input, "budgeted");
    },

    startRespawnAttempt(input) {
      return startAttempt(input, "respawn");
    },

    remint(input) {
      return wrapLoud(() => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const row = db
            .prepare("SELECT * FROM errands WHERE instance_id = ? AND context_packet_id = ?")
            .get(input.instanceId, input.contextPacketId) as ErrandDbRow | undefined;
          if (
            row === undefined ||
            row.state !== "attempting" ||
            row.active_attempt_id !== input.oldAttemptId
          ) {
            db.exec("ROLLBACK");
            return { kind: "inert" };
          }
          // The collided attempt's kind is preserved (budgeted remint's
          // credit-back/decrement collapse to NET-ZERO — budget untouched by
          // construction; a respawn-kind remint stays unbudgeted).
          const collided = db
            .prepare("SELECT kind FROM attempts WHERE attempt_id = ?")
            .get(input.oldAttemptId) as { kind: string } | undefined;
          const kind = (collided?.kind ?? "budgeted") as AttemptKind;
          let attemptId = "";
          let minted = false;
          for (let i = 0; i < MINT_RETRY_LIMIT; i += 1) {
            attemptId = input.attemptIdSource();
            try {
              db.prepare(
                "INSERT INTO attempts (attempt_id, instance_id, context_packet_id, kind, started_at) VALUES (?, ?, ?, ?, ?)",
              ).run(attemptId, input.instanceId, input.contextPacketId, kind, stamp());
              minted = true;
              break;
            } catch (error) {
              if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) {
                continue;
              }
              throw error;
            }
          }
          if (!minted) {
            db.exec("ROLLBACK");
            throw new ErrandStoreError("errand store: remint attempt-id retries exhausted");
          }
          const sessionName = input.sessionNamer(input.instanceId, attemptId);
          db.prepare(
            `UPDATE errands SET active_attempt_id = ?, live_session_name = ?, worker_id = ?,
               claimed_at = ?, updated_at = ?
             WHERE instance_id = ? AND context_packet_id = ?`,
          ).run(
            attemptId,
            sessionName,
            input.workerId,
            input.now,
            stamp(),
            input.instanceId,
            input.contextPacketId,
          );
          db.exec("COMMIT");
          return { kind: "reminted", attemptId, sessionName };
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
    },

    concludeNegativeBudgeted(input) {
      return casConclude(input, "pending", null);
    },

    concludeNegativeRespawn(input) {
      return casConclude(input, "unconfirmed", null);
    },

    concludeNoOutput(input) {
      return casConclude(input, "unconfirmed", null);
    },

    concludeOtherAdmit(input) {
      return casConclude(input, "unconfirmed", input.recordedAdmitOutcome);
    },

    concludeExhaust(input) {
      return casConclude(input, "exhausted", null);
    },

    exhaustAtClaim(input) {
      return wrapLoud(() => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = db
            .prepare(
              `UPDATE errands SET state = 'exhausted', worker_id = NULL, claimed_at = NULL, updated_at = ?
                 WHERE instance_id = ? AND context_packet_id = ?
                   AND state = 'claimed' AND remaining_budget = 0`,
            )
            .run(stamp(), input.instanceId, input.contextPacketId);
          db.exec("COMMIT");
          return { applied: result.changes > 0 };
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
    },

    concludeConfirmed(input) {
      // A CAS-FREE precedence write (B2), attempt-independent: `confirmed`
      // dominates from any non-confirmed state (a stale attempt's committed
      // evidence still promotes; the read-time flip rides this too).
      return wrapLoud(() => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = db
            .prepare(
              `UPDATE errands SET state = 'confirmed', active_attempt_id = NULL,
                 worker_id = NULL, claimed_at = NULL, updated_at = ?
               WHERE instance_id = ? AND context_packet_id = ? AND state <> 'confirmed'`,
            )
            .run(stamp(), input.instanceId, input.contextPacketId);
          db.exec("COMMIT");
          return { applied: result.changes > 0 };
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
    },

    concludeMooted(input) {
      // A CAS-FREE precedence write (B2/L4): `mooted` from any non-terminal
      // state (pending/claimed/attempting/unconfirmed). NEVER overrides
      // `confirmed` (precedence) or a resting terminal.
      return wrapLoud(() => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const placeholders = NON_TERMINAL_STATES.map(() => "?").join(", ");
          const result = db
            .prepare(
              `UPDATE errands SET state = 'mooted', active_attempt_id = NULL,
                 worker_id = NULL, claimed_at = NULL, updated_at = ?
               WHERE instance_id = ? AND context_packet_id = ? AND state IN (${placeholders})`,
            )
            .run(stamp(), input.instanceId, input.contextPacketId, ...NON_TERMINAL_STATES);
          db.exec("COMMIT");
          return { applied: result.changes > 0 };
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
    },

    reclaim(input) {
      return wrapLoud(() => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const row = db
            .prepare("SELECT * FROM errands WHERE instance_id = ? AND context_packet_id = ?")
            .get(input.instanceId, input.contextPacketId) as ErrandDbRow | undefined;
          if (row === undefined) {
            db.exec("ROLLBACK");
            return { reclaimed: false, clearedAttemptId: null };
          }
          const errand = mapErrandRow(row);
          const stale =
            errand.claimedAt !== null && input.now - errand.claimedAt > input.leaseMs;
          if ((errand.state !== "claimed" && errand.state !== "attempting") || !stale) {
            db.exec("ROLLBACK");
            return { reclaimed: false, clearedAttemptId: null };
          }
          db.prepare(
            `UPDATE errands SET state = ?, active_attempt_id = NULL, worker_id = NULL,
               claimed_at = NULL, updated_at = ?
             WHERE instance_id = ? AND context_packet_id = ?`,
          ).run(input.landing, stamp(), input.instanceId, input.contextPacketId);
          db.exec("COMMIT");
          return { reclaimed: true, clearedAttemptId: errand.activeAttemptId };
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
    },
  };

  return {
    store,
    close(): void {
      db.close();
    },
  };
}
