import { DatabaseSync } from "node:sqlite";

import type {
  EventEnvelope,
  InstanceId,
  LifecycleStatus,
  RetainedGateDecision,
  TranscriptEntry,
  WorkflowInstance,
} from "../domain/index.js";
import type {
  CommitTransitionInput,
  CommitTransitionResult,
  InstanceDetail,
  StorePort,
} from "../ports/store.js";
import type { TimeSource } from "../ports/time.js";

/**
 * The SQLite StorePort implementation (ADR-003 substrate, ADR-006
 * driver; packet ch4-P2). The store owns atomicity and stamping; the
 * kernel owns semantics — newCurrentStep / newRound / newStatus arrive
 * kernel-derived and are written verbatim.
 *
 * Timestamps come from the INJECTED TimeSource, stamped inside the
 * commit boundary (CHK-C-TS-SOURCE; IC-D's store binding) — deliberately
 * NOT a SQLite DEFAULT, so a frozen-clock test asserts the real path.
 */
// v4 (packet ch11-P3b): instances carry the nullable runtime_context column
// (S4 — the chapter's SECOND schema change). It rides the SAME ADR-003 fenced
// wipe: a known PROTOTYPE marker at any other version wipes on open; anything
// else still refuses. No migration path exists (no data carry).
const SCHEMA_VERSION = "4";

const SCHEMA = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
CREATE TABLE instances (
  instance_id      TEXT PRIMARY KEY,
  template_id      TEXT    NOT NULL,
  template_version INTEGER NOT NULL,
  task             TEXT    NOT NULL,
  binding          TEXT    NOT NULL,
  current_step     TEXT    NOT NULL,
  round            INTEGER NOT NULL,
  status           TEXT    NOT NULL,
  version          INTEGER NOT NULL,
  runtime_context  TEXT,
  created_at       INTEGER NOT NULL
) STRICT;
CREATE TABLE transcript (
  instance_id    TEXT    NOT NULL,
  seq            INTEGER NOT NULL,
  op_id          TEXT    NOT NULL,
  envelope       TEXT    NOT NULL,
  payload_digest TEXT    NOT NULL,
  gate_decisions TEXT    NOT NULL,
  committed_at   INTEGER NOT NULL,
  PRIMARY KEY (instance_id, seq),
  UNIQUE (instance_id, op_id)
) STRICT;
`;

export interface StoreHandle {
  readonly store: StorePort;
  close(): void;
}

interface InstanceRow {
  instance_id: string;
  template_id: string;
  template_version: number;
  task: string;
  binding: string;
  current_step: string;
  round: number;
  status: string;
  version: number;
  runtime_context: string | null;
}

function rowToInstance(row: InstanceRow): WorkflowInstance {
  return {
    instanceId: row.instance_id,
    templateRef: { id: row.template_id, version: row.template_version },
    task: row.task,
    binding: JSON.parse(row.binding) as Readonly<Record<string, string>>,
    currentStep: row.current_step,
    round: row.round,
    status: row.status as LifecycleStatus,
    version: row.version,
    // S4: NULL ↔ null (ready(∅)); a stored string ↔ its exact ref. The ONE
    // row mapper serves every instance read surface identically.
    runtimeContext: row.runtime_context,
  };
}

interface TranscriptRow {
  seq: number;
  envelope: string;
  payload_digest: string;
  gate_decisions: string;
  committed_at: number;
}

/** One mapper for BOTH read surfaces (getInstanceDetail / getTimeline) —
 * the ch6-P1 cross-consistency dimension is structural, not incidental.
 * The gate_decisions column round-trips through JSON verbatim (S3). */
function toTranscriptEntry(row: TranscriptRow): TranscriptEntry {
  return {
    seq: row.seq,
    envelope: JSON.parse(row.envelope) as EventEnvelope,
    payloadDigest: row.payload_digest,
    gateDecisions: JSON.parse(row.gate_decisions) as readonly RetainedGateDecision[],
    committedAt: row.committed_at,
  };
}

function initSchema(db: DatabaseSync): void {
  db.exec(SCHEMA);
  const insert = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  insert.run("schema_version", SCHEMA_VERSION);
  insert.run("prototype", "true");
}

/**
 * Fail-closed open (ADR-003): a database with NO tables → fresh init.
 * Tables but no readable marker, or a non-prototype marker → refuse,
 * never wipe. A known PROTOTYPE marker with a different schema version →
 * wipe-and-recreate (the fenced dev path).
 */
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
    throw new Error(
      "store open refused (fail closed): existing database has no readable schema marker (ADR-003)",
    );
  }
  if (marker.schemaVersion === undefined || marker.prototype === undefined) {
    throw new Error(
      "store open refused (fail closed): schema marker incomplete (ADR-003)",
    );
  }
  if (marker.prototype !== "true") {
    throw new Error(
      "store open refused (fail closed): non-prototype store; wipe-and-recreate is fenced to dev stores (ADR-003)",
    );
  }
  if (marker.schemaVersion !== SCHEMA_VERSION) {
    // The fenced dev path: known prototype store, moved schema.
    db.exec("DROP TABLE IF EXISTS transcript; DROP TABLE IF EXISTS instances; DROP TABLE IF EXISTS meta;");
    initSchema(db);
  }
}

export function openStore(path: string, time: TimeSource): StoreHandle {
  const db = new DatabaseSync(path);
  if (path !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  try {
    ensureSchema(db);
  } catch (error) {
    db.close();
    throw error;
  }

  const store: StorePort = {
    loadInstance(instanceId: InstanceId): Promise<WorkflowInstance | null> {
      const row = db
        .prepare("SELECT * FROM instances WHERE instance_id = ?")
        .get(instanceId) as InstanceRow | undefined;
      return Promise.resolve(row === undefined ? null : rowToInstance(row));
    },

    findOp(instanceId, opId): Promise<{ payloadDigest: string } | null> {
      const row = db
        .prepare(
          "SELECT payload_digest FROM transcript WHERE instance_id = ? AND op_id = ?",
        )
        .get(instanceId, opId) as { payload_digest: string } | undefined;
      return Promise.resolve(
        row === undefined ? null : { payloadDigest: row.payload_digest },
      );
    },

    createInstance(instance: WorkflowInstance): Promise<void> {
      try {
        db.prepare(
          `INSERT INTO instances
             (instance_id, template_id, template_version, task, binding,
              current_step, round, status, version, runtime_context, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          instance.instanceId,
          instance.templateRef.id,
          instance.templateRef.version,
          instance.task,
          JSON.stringify(instance.binding),
          instance.currentStep,
          instance.round,
          instance.status,
          instance.version,
          // S4: the field is written VERBATIM (null → NULL); create-time-only
          // (CommitTransitionInput untouched — no post-create write path).
          instance.runtimeContext,
          time.now(),
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE")) {
          return Promise.reject(
            new Error(`store integrity: instance '${instance.instanceId}' already exists`),
          );
        }
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return Promise.resolve();
    },

    commitTransition(input: CommitTransitionInput): Promise<CommitTransitionResult> {
      db.exec("BEGIN IMMEDIATE");
      try {
        // Idempotency beats CAS (plan §4.2 + §5.4), digest-aware: a
        // matching digest is a retransmission, a differing one is a
        // visible collision — neither writes anything.
        const existing = db
          .prepare(
            "SELECT payload_digest FROM transcript WHERE instance_id = ? AND op_id = ?",
          )
          .get(input.instanceId, input.envelope.opId) as
          | { payload_digest: string }
          | undefined;
        if (existing !== undefined) {
          db.exec("ROLLBACK");
          return Promise.resolve(
            existing.payload_digest === input.payloadDigest
              ? { kind: "duplicate_op" }
              : { kind: "op_id_collision" },
          );
        }

        const cas = db
          .prepare(
            `UPDATE instances
               SET current_step = ?, round = ?, status = ?, version = version + 1
             WHERE instance_id = ? AND version = ?`,
          )
          .run(
            input.newCurrentStep,
            input.newRound,
            input.newStatus,
            input.instanceId,
            input.expectedVersion,
          );
        if (cas.changes === 0) {
          db.exec("ROLLBACK");
          return Promise.resolve({ kind: "cas_conflict" });
        }

        const next = db
          .prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM transcript WHERE instance_id = ?")
          .get(input.instanceId) as { seq: number };
        db.prepare(
          "INSERT INTO transcript (instance_id, seq, op_id, envelope, payload_digest, gate_decisions, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).run(
          input.instanceId,
          next.seq,
          input.envelope.opId,
          JSON.stringify(input.envelope),
          input.payloadDigest,
          JSON.stringify(input.gateDecisions),
          time.now(),
        );
        db.exec("COMMIT");
        return Promise.resolve({ kind: "committed", version: input.expectedVersion + 1 });
      } catch (error) {
        db.exec("ROLLBACK");
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listInstances(): Promise<readonly WorkflowInstance[]> {
      const rows = db
        .prepare("SELECT * FROM instances ORDER BY rowid")
        .all() as unknown as InstanceRow[];
      return Promise.resolve(rows.map(rowToInstance));
    },

    getInstanceDetail(instanceId: InstanceId): Promise<InstanceDetail | null> {
      const row = db
        .prepare("SELECT * FROM instances WHERE instance_id = ?")
        .get(instanceId) as InstanceRow | undefined;
      if (row === undefined) {
        return Promise.resolve(null);
      }
      const entries = db
        .prepare(
          "SELECT seq, envelope, payload_digest, gate_decisions, committed_at FROM transcript WHERE instance_id = ? ORDER BY seq",
        )
        .all(instanceId) as unknown as TranscriptRow[];
      return Promise.resolve({
        instance: rowToInstance(row),
        transcript: entries.map(toTranscriptEntry),
      });
    },

    getTimeline(
      instanceId: InstanceId,
      afterSeq: number,
    ): Promise<readonly TranscriptEntry[] | null> {
      // Watchpoint (ch6-P1): validate BEFORE any SQL — an invalid
      // cursor never opens a transaction. Integrity-style throw, not a
      // kernel rejection; the ch-6 CLI maps it to its usage class.
      // `-0` rung (flag 1(b), ch7-P2): Number.isSafeInteger(-0) is true
      // and -0 < 0 is false, so the numeric-identity guard is explicit —
      // making plan §7.3's "inherits §6.2 (… `-0` rejected)" true here.
      if (!Number.isSafeInteger(afterSeq) || afterSeq < 0 || Object.is(afterSeq, -0)) {
        return Promise.reject(
          new RangeError(
            `getTimeline cursor must be a nonnegative safe integer, got ${String(afterSeq)}`,
          ),
        );
      }
      // DEFERRED read transaction (never IMMEDIATE — a reader must not
      // take the write lock): the null/[] decision and the row suffix
      // come from ONE snapshot. Rows are mapped AFTER the transaction
      // closes, so a parse error can never leave it open (watchpoint).
      db.exec("BEGIN DEFERRED");
      let rows: TranscriptRow[] | null;
      try {
        const row = db
          .prepare("SELECT instance_id FROM instances WHERE instance_id = ?")
          .get(instanceId);
        rows =
          row === undefined
            ? null
            : (db
                .prepare(
                  "SELECT seq, envelope, payload_digest, gate_decisions, committed_at FROM transcript WHERE instance_id = ? AND seq > ? ORDER BY seq",
                )
                .all(instanceId, afterSeq) as unknown as TranscriptRow[]);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      if (rows === null) {
        return Promise.resolve(null);
      }
      try {
        return Promise.resolve(rows.map(toTranscriptEntry));
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  return {
    store,
    close(): void {
      db.close();
    },
  };
}
