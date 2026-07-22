import { DatabaseSync } from "node:sqlite";

import type {
  ActivationMode,
  AgentConfig,
  EventEnvelope,
  InstanceId,
  KernelStatus,
  LifecycleFactKind,
  RetainedGateDecision,
  RuntimeContext,
  TerminalDisposition,
  TranscriptEntry,
  WaitReason,
  WorkflowInstance,
} from "../domain/index.js";
import type {
  CommitLifecycleInput,
  CommitTransitionInput,
  CommitTransitionResult,
  InstanceDetail,
  StorePort,
} from "../ports/store.js";
import type { TimeSource } from "../ports/time.js";

/**
 * The SQLite StorePort implementation (ADR-003 substrate, ADR-006
 * driver; packet ch4-P2). The store owns atomicity and stamping; the
 * kernel owns semantics — newCurrentStep / newRound / the axis fields
 * arrive kernel-derived and are written verbatim.
 *
 * Timestamps come from the INJECTED TimeSource, stamped inside the
 * commit boundary (CHK-C-TS-SOURCE; IC-D's store binding) — deliberately
 * NOT a SQLite DEFAULT, so a frozen-clock test asserts the real path.
 */
// v5 (packet ch12-p1a): THE ch12 schema bump — the full C11 column set
// in ONE fenced bump (S1): the two-axis lifecycle truth
// (kernel_status + terminal_disposition; the ch-4 `status` column
// RETIRED, S10), activation_mode, wait, failure_reason, the
// discriminated runtime_context (NOT NULL canonical JSON, S7),
// run_overrides, the nullable task/current_step faces (S9), and the
// transcript entry-kind face (S11: entry_kind + per-class nullability +
// issued_agent_config, P2's writer). Sibling ch12 packets consume these
// columns; no second DDL change this chapter. It rides the SAME ADR-003
// fenced wipe: a known PROTOTYPE marker at any other version wipes on
// open; anything else still refuses. No migration path exists (no data
// carry — the bump recreates, never converts).
const SCHEMA_VERSION = "5";

const SCHEMA = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
CREATE TABLE instances (
  instance_id          TEXT PRIMARY KEY,
  template_id          TEXT    NOT NULL,
  template_version     INTEGER NOT NULL,
  task                 TEXT,
  binding              TEXT    NOT NULL,
  current_step         TEXT,
  round                INTEGER NOT NULL,
  kernel_status        TEXT    NOT NULL,
  terminal_disposition TEXT,
  activation_mode      TEXT    NOT NULL,
  wait                 TEXT,
  failure_reason       TEXT,
  runtime_context      TEXT    NOT NULL,
  run_overrides        TEXT    NOT NULL,
  version              INTEGER NOT NULL,
  created_at           INTEGER NOT NULL
) STRICT;
CREATE TABLE transcript (
  instance_id         TEXT    NOT NULL,
  seq                 INTEGER NOT NULL,
  op_id               TEXT    NOT NULL,
  entry_kind          TEXT    NOT NULL,
  envelope            TEXT,
  payload_digest      TEXT,
  gate_decisions      TEXT,
  issued_agent_config TEXT,
  committed_at        INTEGER NOT NULL,
  PRIMARY KEY (instance_id, seq),
  UNIQUE (instance_id, op_id)
) STRICT;
`;

export interface StoreHandle {
  readonly store: StorePort;
  close(): void;
}

// ── Canonical JSON (the emit-lib culture: sorted keys, strict) ───────
// The stored value-object encodings (wait, runtime_context,
// run_overrides) are byte-deterministic: object keys sorted, no
// undefined members, no non-finite numbers — so stored bytes are
// byte-testable (packet ch12-p1a, In-context notes).

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error(`store integrity: non-canonical number ${String(value)} in a stored value object`);
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts = Object.keys(record)
      .sort()
      .map((key) => {
        if (record[key] === undefined) {
          throw new Error(`store integrity: undefined property '${key}' in a stored value object`);
        }
        return `${JSON.stringify(key)}:${canonicalJson(record[key])}`;
      });
    return `{${parts.join(",")}}`;
  }
  throw new Error(`store integrity: non-canonicalizable ${typeof value} in a stored value object`);
}

// ── Token domains (S2/S3/S4) — refusal at the mapper ─────────────────
// The STORED tokens are the MODEL's; a row carrying an out-of-domain
// token is a store-integrity failure, never silently widened.

const KERNEL_STATUS_TOKENS: readonly KernelStatus[] = ["CREATED", "ACTIVE", "WAITING", "TERMINAL"];
const TERMINAL_DISPOSITION_TOKENS: readonly TerminalDisposition[] = ["done", "failed", "cancelled"];
const ACTIVATION_MODE_TOKENS: readonly ActivationMode[] = ["immediate", "deferred_kickoff"];

function parseKernelStatus(value: string): KernelStatus {
  if (!(KERNEL_STATUS_TOKENS as readonly string[]).includes(value)) {
    throw new Error(`store integrity: unknown kernel_status token '${value}'`);
  }
  return value as KernelStatus;
}

function parseTerminalDisposition(value: string | null): TerminalDisposition | null {
  if (value === null) {
    return null;
  }
  if (!(TERMINAL_DISPOSITION_TOKENS as readonly string[]).includes(value)) {
    throw new Error(`store integrity: unknown terminal_disposition token '${value}'`);
  }
  return value as TerminalDisposition;
}

function parseActivationMode(value: string): ActivationMode {
  if (!(ACTIVATION_MODE_TOKENS as readonly string[]).includes(value)) {
    throw new Error(`store integrity: unknown activation_mode token '${value}'`);
  }
  return value as ActivationMode;
}

// ── The wait encoding (S5) — stored snake keys, TS camelCase (T4) ────

function encodeWait(wait: WaitReason | null): string | null {
  if (wait === null) {
    return null;
  }
  return canonicalJson({
    kind: wait.kind,
    requested_by: wait.requestedBy,
    resume_events: wait.resumeEvents,
  });
}

function decodeWait(text: string | null): WaitReason | null {
  if (text === null) {
    return null;
  }
  const parsed = JSON.parse(text) as {
    kind?: unknown;
    requested_by?: unknown;
    resume_events?: unknown;
  };
  if (
    parsed.kind !== "kickoff_pending" ||
    typeof parsed.requested_by !== "string" ||
    !Array.isArray(parsed.resume_events) ||
    parsed.resume_events.some((event) => typeof event !== "string")
  ) {
    throw new Error(`store integrity: malformed wait value '${text}'`);
  }
  return {
    kind: parsed.kind,
    requestedBy: parsed.requested_by,
    resumeEvents: parsed.resume_events as readonly string[],
  };
}

// ── The runtime_context encoding (S7/X1) — the discriminated state ───
// Stored canonical JSON carries the MODEL's snake keys (`request_id`,
// C11's requested{request_id} spelling); TS fields are camelCase — the
// rowToInstance mapper culture (T4), stated so neither side forks.

function encodeRuntimeContext(context: RuntimeContext): string {
  switch (context.state) {
    case "none":
      return canonicalJson({ state: "none" });
    case "requested":
      return canonicalJson({ request_id: context.requestId, state: "requested" });
    case "ready":
      return canonicalJson({
        ref:
          context.ref === null
            ? null
            : { kind: context.ref.kind, locator: context.ref.locator },
        state: "ready",
      });
  }
}

function decodeRuntimeContext(text: string): RuntimeContext {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`store integrity: malformed runtime_context value '${text}'`);
  }
  switch (parsed["state"]) {
    case "none":
      return { state: "none" };
    case "requested": {
      const requestId = parsed["request_id"];
      if (typeof requestId !== "string") {
        throw new Error(`store integrity: malformed runtime_context value '${text}'`);
      }
      return { state: "requested", requestId };
    }
    case "ready": {
      const ref = parsed["ref"];
      if (ref === null) {
        return { state: "ready", ref: null };
      }
      if (typeof ref !== "object" || Array.isArray(ref)) {
        throw new Error(`store integrity: malformed runtime_context value '${text}'`);
      }
      const record = ref as Record<string, unknown>;
      if (typeof record["kind"] !== "string" || !("locator" in record)) {
        throw new Error(`store integrity: malformed runtime_context value '${text}'`);
      }
      // The locator is OPAQUE and kernel-uninterpreted (T4/C15) — it
      // round-trips verbatim, never validated here.
      return { state: "ready", ref: { kind: record["kind"], locator: record["locator"] } };
    }
    default:
      throw new Error(`store integrity: malformed runtime_context value '${text}'`);
  }
}

interface InstanceRow {
  instance_id: string;
  template_id: string;
  template_version: number;
  task: string | null;
  binding: string;
  current_step: string | null;
  round: number;
  kernel_status: string;
  terminal_disposition: string | null;
  activation_mode: string;
  wait: string | null;
  failure_reason: string | null;
  runtime_context: string;
  run_overrides: string;
  version: number;
}

/** G2 (packet ch12-p1b): the run_overrides round-trip — a canonical-JSON
 * map of step-id → plain map; anything else is integrity drift. */
function decodeRunOverrides(
  text: string,
): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  const parsed = JSON.parse(text) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`store integrity: malformed run_overrides value '${text}'`);
  }
  for (const value of Object.values(parsed as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`store integrity: malformed run_overrides entry in '${text}'`);
    }
  }
  return parsed as Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

function rowToInstance(row: InstanceRow): WorkflowInstance {
  // G2 (packet ch12-p1b): genesis/deferred NULLs are LEGAL now — the
  // guards refuse only non-genesis-consistent corruption: an ACTIVE
  // instance always has a position and a task (activate's REQUIRE),
  // and a `done` disposition presupposes a run that was active.
  const status = parseKernelStatus(row.kernel_status);
  const disposition = parseTerminalDisposition(row.terminal_disposition);
  if (status === "ACTIVE" && (row.current_step === null || row.task === null)) {
    throw new Error(
      `store integrity: ACTIVE instance '${row.instance_id}' carries a NULL task/current_step (readiness gates dispatch)`,
    );
  }
  if (disposition === "done" && (row.current_step === null || row.task === null)) {
    throw new Error(
      `store integrity: done instance '${row.instance_id}' carries a NULL task/current_step`,
    );
  }
  return {
    instanceId: row.instance_id,
    templateRef: { id: row.template_id, version: row.template_version },
    task: row.task,
    binding: JSON.parse(row.binding) as Readonly<Record<string, string>>,
    currentStep: row.current_step,
    round: row.round,
    kernelStatus: status,
    terminalDisposition: disposition,
    activationMode: parseActivationMode(row.activation_mode),
    wait: decodeWait(row.wait),
    // S7: the ONE row mapper decodes the discriminated state for every
    // instance read surface identically.
    runtimeContext: decodeRuntimeContext(row.runtime_context),
    failureReason: row.failure_reason,
    runOverrides: decodeRunOverrides(row.run_overrides),
    version: row.version,
  };
}

interface TranscriptRow {
  seq: number;
  op_id: string;
  entry_kind: string;
  envelope: string | null;
  payload_digest: string | null;
  gate_decisions: string | null;
  issued_agent_config: string | null;
  committed_at: number;
}

const LIFECYCLE_FACT_KINDS: readonly LifecycleFactKind[] = [
  "STARTED",
  "CANCELLED",
  "TASK_SUPPLIED",
];

/** One mapper for BOTH read surfaces (getInstanceDetail / getTimeline) —
 * the ch6-P1 cross-consistency dimension is structural, not incidental.
 * The gate_decisions column round-trips through JSON verbatim (S3).
 * F5 (packet ch12-p1b): the mapper splits on entry_kind and REFUSES the
 * S11 class iff loudly in BOTH directions, per conjunct — a transition
 * row missing a class field, or a fact row carrying one, is integrity
 * drift. */
function toTranscriptEntry(row: TranscriptRow): TranscriptEntry {
  if (row.entry_kind === "transition") {
    // S11/C3 class iff (packet ch12-p2): a transition row carries all
    // four class fields NON-NULL — issued_agent_config joins the trio now
    // its P2 writer exists (a canonical-JSON map, possibly `{}`).
    if (
      row.envelope === null ||
      row.payload_digest === null ||
      row.gate_decisions === null ||
      row.issued_agent_config === null
    ) {
      throw new Error(
        `store integrity: transition row seq ${String(row.seq)} missing a class-required field (S11 class iff)`,
      );
    }
    return {
      entryKind: "transition",
      seq: row.seq,
      envelope: JSON.parse(row.envelope) as EventEnvelope,
      payloadDigest: row.payload_digest,
      gateDecisions: JSON.parse(row.gate_decisions) as readonly RetainedGateDecision[],
      issuedAgentConfig: JSON.parse(row.issued_agent_config) as AgentConfig,
      committedAt: row.committed_at,
    };
  }
  if ((LIFECYCLE_FACT_KINDS as readonly string[]).includes(row.entry_kind)) {
    if (row.envelope !== null) {
      throw new Error(
        `store integrity: fact row seq ${String(row.seq)} carries a non-null envelope (S11 class iff)`,
      );
    }
    if (row.payload_digest !== null) {
      throw new Error(
        `store integrity: fact row seq ${String(row.seq)} carries a non-null payload_digest (S11 class iff)`,
      );
    }
    if (row.gate_decisions !== null) {
      throw new Error(
        `store integrity: fact row seq ${String(row.seq)} carries non-null gate_decisions (S11 class iff)`,
      );
    }
    // C3 (packet ch12-p2): issued_agent_config is a transition-only field
    // — a fact row carrying it is integrity drift (NULL by class forever).
    if (row.issued_agent_config !== null) {
      throw new Error(
        `store integrity: fact row seq ${String(row.seq)} carries non-null issued_agent_config (S11 class iff)`,
      );
    }
    return {
      entryKind: row.entry_kind as LifecycleFactKind,
      seq: row.seq,
      opId: row.op_id,
      committedAt: row.committed_at,
    };
  }
  throw new Error(
    `store integrity: transcript row seq ${String(row.seq)} carries unknown entry_kind '${row.entry_kind}'`,
  );
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

    findOp(
      instanceId,
      opId,
    ): Promise<{
      payloadDigest: string | null;
      entryKind: TranscriptEntry["entryKind"];
    } | null> {
      // A2 (packet ch12-p1b): kind-aware — a fact row's digest is NULL
      // and the entry kind is what the lifecycle idempotency rung reads.
      const row = db
        .prepare(
          "SELECT payload_digest, entry_kind FROM transcript WHERE instance_id = ? AND op_id = ?",
        )
        .get(instanceId, opId) as
        | { payload_digest: string | null; entry_kind: string }
        | undefined;
      if (row === undefined) {
        return Promise.resolve(null);
      }
      if (
        row.entry_kind !== "transition" &&
        !(LIFECYCLE_FACT_KINDS as readonly string[]).includes(row.entry_kind)
      ) {
        return Promise.reject(
          new Error(`store integrity: unknown entry_kind '${row.entry_kind}' under op lookup`),
        );
      }
      return Promise.resolve({
        payloadDigest: row.payload_digest,
        entryKind: row.entry_kind as TranscriptEntry["entryKind"],
      });
    },

    createInstance(instance: WorkflowInstance): Promise<void> {
      try {
        db.prepare(
          `INSERT INTO instances
             (instance_id, template_id, template_version, task, binding,
              current_step, round, kernel_status, terminal_disposition,
              activation_mode, wait, failure_reason, runtime_context,
              run_overrides, version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          instance.instanceId,
          instance.templateRef.id,
          instance.templateRef.version,
          instance.task,
          JSON.stringify(instance.binding),
          instance.currentStep,
          instance.round,
          // The axis fields are written VERBATIM (kernel-derived); the
          // stored tokens are the MODEL's (S2/S3/S4).
          instance.kernelStatus,
          instance.terminalDisposition,
          instance.activationMode,
          encodeWait(instance.wait),
          instance.failureReason,
          encodeRuntimeContext(instance.runtimeContext),
          // G1/G2 (packet ch12-p1b): the C9 snapshot is written from the
          // instance VALUE (the P1a `{}` hardcode retired); canonical
          // JSON, so stored bytes are deterministic and byte-testable.
          canonicalJson(instance.runOverrides),
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
        // Idempotency beats CAS (plan §4.2 + §5.4), digest-aware AND
        // kind-aware (A2, packet ch12-p1b): a matching-digest transition
        // row is a retransmission; a differing digest — or ANY fact row
        // under the key (the actor-side mirror: a digest compare is
        // unanswerable against a digest-less fact row) — is a visible
        // collision. Neither writes anything.
        const existing = db
          .prepare(
            "SELECT payload_digest, entry_kind FROM transcript WHERE instance_id = ? AND op_id = ?",
          )
          .get(input.instanceId, input.envelope.opId) as
          | { payload_digest: string | null; entry_kind: string }
          | undefined;
        if (existing !== undefined) {
          db.exec("ROLLBACK");
          return Promise.resolve(
            existing.entry_kind === "transition" &&
              existing.payload_digest === input.payloadDigest
              ? { kind: "duplicate_op" }
              : { kind: "op_id_collision" },
          );
        }

        // E3: both axis fields ride the SAME transaction the commit
        // always used (REV-A1-TXN unchanged).
        const cas = db
          .prepare(
            `UPDATE instances
               SET current_step = ?, round = ?, kernel_status = ?,
                   terminal_disposition = ?, version = version + 1
             WHERE instance_id = ? AND version = ?`,
          )
          .run(
            input.newCurrentStep,
            input.newRound,
            input.newKernelStatus,
            input.newTerminalDisposition,
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
        // S11/C2 (packet ch12-p2): the commit path writes `transition`
        // rows — the three class fields non-null, and issued_agent_config
        // now written CANONICAL JSON (P2's C10 writer, in place of the P1a
        // NULL); fact rows keep it NULL by class (commitLifecycle).
        db.prepare(
          "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at) VALUES (?, ?, ?, 'transition', ?, ?, ?, ?, ?)",
        ).run(
          input.instanceId,
          next.seq,
          input.envelope.opId,
          JSON.stringify(input.envelope),
          input.payloadDigest,
          JSON.stringify(input.gateDecisions),
          canonicalJson(input.issuedAgentConfig),
          time.now(),
        );
        db.exec("COMMIT");
        return Promise.resolve({ kind: "committed", version: input.expectedVersion + 1 });
      } catch (error) {
        db.exec("ROLLBACK");
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },

    commitLifecycle(input: CommitLifecycleInput): Promise<CommitTransitionResult> {
      db.exec("BEGIN IMMEDIATE");
      try {
        // F1/A2: the in-transaction idempotency re-check, KIND-AWARE —
        // an existing row of the fact's OWN kind is a replay, any other
        // kind under the key is a visible collision. FAIL passes
        // `fact: null` and consumes no key.
        if (input.fact !== null) {
          const existing = db
            .prepare(
              "SELECT entry_kind FROM transcript WHERE instance_id = ? AND op_id = ?",
            )
            .get(input.instanceId, input.fact.opId) as
            | { entry_kind: string }
            | undefined;
          if (existing !== undefined) {
            db.exec("ROLLBACK");
            return Promise.resolve(
              existing.entry_kind === input.fact.kind
                ? { kind: "duplicate_op" }
                : { kind: "op_id_collision" },
            );
          }
        }

        // ONE UPDATE, CAS on version (uniform commit discipline): the
        // always-written axis trio (kernel_status, terminal_disposition,
        // wait — F1's always-explicit rule) plus the op's optional
        // fields; absent optionals leave their columns unchanged.
        const sets: string[] = [
          "kernel_status = ?",
          "terminal_disposition = ?",
          "wait = ?",
          "version = version + 1",
        ];
        const params: (string | number | null)[] = [
          input.newKernelStatus,
          input.newTerminalDisposition,
          encodeWait(input.newWait),
        ];
        if (input.newCurrentStep !== undefined) {
          sets.push("current_step = ?");
          params.push(input.newCurrentStep);
        }
        if (input.newRound !== undefined) {
          sets.push("round = ?");
          params.push(input.newRound);
        }
        if (input.newTask !== undefined) {
          sets.push("task = ?");
          params.push(input.newTask);
        }
        if (input.newRuntimeContext !== undefined) {
          sets.push("runtime_context = ?");
          params.push(encodeRuntimeContext(input.newRuntimeContext));
        }
        if (input.newFailureReason !== undefined) {
          sets.push("failure_reason = ?");
          params.push(input.newFailureReason);
        }
        const cas = db
          .prepare(
            `UPDATE instances SET ${sets.join(", ")} WHERE instance_id = ? AND version = ?`,
          )
          .run(...params, input.instanceId, input.expectedVersion);
        if (cas.changes === 0) {
          db.exec("ROLLBACK");
          return Promise.resolve({ kind: "cas_conflict" });
        }

        // F2: the fact row rides the SAME transaction (REV-A1-TXN) —
        // entry_kind = the fact name VERBATIM, the three class columns
        // NULL by class, issued_agent_config NULL by class forever.
        if (input.fact !== null) {
          const next = db
            .prepare(
              "SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM transcript WHERE instance_id = ?",
            )
            .get(input.instanceId) as { seq: number };
          db.prepare(
            "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?)",
          ).run(input.instanceId, next.seq, input.fact.opId, input.fact.kind, time.now());
        }
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
          "SELECT seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at FROM transcript WHERE instance_id = ? ORDER BY seq",
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
                  "SELECT seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, committed_at FROM transcript WHERE instance_id = ? AND seq > ? ORDER BY seq",
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
