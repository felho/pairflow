import { DatabaseSync } from "node:sqlite";

import type {
  EventEnvelope,
  InstanceId,
  LifecycleStatus,
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
// v2 (packet ch5-P4): transcript carries the committed payload_digest.
// The v1→v2 bump exercises the ADR-003 fenced wipe live for the first
// time: a known PROTOTYPE marker at "1" wipes on open; anything else
// still refuses.
const SCHEMA_VERSION = "2";

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
  created_at       INTEGER NOT NULL
) STRICT;
CREATE TABLE transcript (
  instance_id    TEXT    NOT NULL,
  seq            INTEGER NOT NULL,
  op_id          TEXT    NOT NULL,
  envelope       TEXT    NOT NULL,
  payload_digest TEXT    NOT NULL,
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
              current_step, round, status, version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          "INSERT INTO transcript (instance_id, seq, op_id, envelope, payload_digest, committed_at) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(
          input.instanceId,
          next.seq,
          input.envelope.opId,
          JSON.stringify(input.envelope),
          input.payloadDigest,
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
          "SELECT seq, envelope, payload_digest, committed_at FROM transcript WHERE instance_id = ? ORDER BY seq",
        )
        .all(instanceId) as unknown as {
        seq: number;
        envelope: string;
        payload_digest: string;
        committed_at: number;
      }[];
      const transcript: TranscriptEntry[] = entries.map((entry) => ({
        seq: entry.seq,
        envelope: JSON.parse(entry.envelope) as EventEnvelope,
        payloadDigest: entry.payload_digest,
        committedAt: entry.committed_at,
      }));
      return Promise.resolve({ instance: rowToInstance(row), transcript });
    },
  };

  return {
    store,
    close(): void {
      db.close();
    },
  };
}
