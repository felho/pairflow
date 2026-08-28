import { DatabaseSync } from "node:sqlite";

import type {
  ActivationMode,
  AgentConfig,
  DecisionMadeEntry,
  DecisionRequestBody,
  DecisionRequestEntry,
  EventEnvelope,
  InstanceId,
  KernelStatus,
  LifecycleFactKind,
  RetainedGateDecision,
  RuntimeContext,
  TerminalDisposition,
  TranscriptEntry,
  WaitReason,
  WaitResumedEntry,
  WorkflowInstance,
} from "../domain/index.js";
import type {
  CommitLifecycleInput,
  CommitOperatorEntryInput,
  CommitTransitionInput,
  CommitTransitionResult,
  DecisionMadeBody,
  WaitResumedBody,
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
// ch14 (packet ch14-p2a, K8): the transcript's THIRD entry class. Two
// DDL deltas, both forced by a class that is kernel-derived rather than
// op-carrying: `op_id` becomes NULLABLE (an op-less row is
// INEXPRESSIBLE under NOT NULL), and the class's own fields ride one new
// `entry_body` column carrying canonical JSON with the model's SNAKE
// keys — the same store casing seam the `wait` column follows.
//
// SQLite's UNIQUE treats NULLs as DISTINCT, so many op-less rows coexist
// under one instance while an op-carrying duplicate still raises
// (receipt PROBE-CH14P2A-1, measured on the live driver). STRICT keeps
// the PRIMARY KEY's columns implicitly NOT NULL, so relaxing `op_id`
// cannot weaken `(instance_id, seq)`.
//
// THE GUARANTEE THE DDL USED TO CARRY IS NOT DROPPED, it MOVES: with
// NOT NULL gone, the mapper takes over a CLASS-CONDITIONAL check — the
// two op-carrying classes require `op_id` present, the op-less class
// requires it absent — because a relaxation that leaves no carrier is
// how a guarantee silently disappears.
const SCHEMA_VERSION = "6";

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
  op_id               TEXT,
  entry_kind          TEXT    NOT NULL,
  envelope            TEXT,
  payload_digest      TEXT,
  gate_decisions      TEXT,
  issued_agent_config TEXT,
  entry_body          TEXT,
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

// ── The DECISION_REQUEST body (K8/C22) — the SAME casing seam ────────
// The class's own fields ride one column as canonical JSON with the
// model's SNAKE keys, exactly as the wait column does. The TS grain
// stays camelCase; the model's TOKEN spelling is what is preserved,
// never the TS field spelling.

function encodeDecisionRequestBody(body: DecisionRequestBody): string {
  return canonicalJson({
    // `context_ref` is spread on PRESENCE (K3): an authored `{}`, `null`,
    // `""` or `0` must record as faithfully as an object, so the test is
    // `!== undefined` and never truthiness.
    ...(body.contextRef !== undefined ? { context_ref: body.contextRef } : {}),
    decisions: body.decisions,
    ...(body.recommendation !== undefined ? { recommendation: body.recommendation } : {}),
    ...(body.recommendationSource !== undefined
      ? {
          recommendation_source: {
            event_type: body.recommendationSource.eventType,
            from_step: body.recommendationSource.fromStep,
          },
        }
      : {}),
    recipient: body.recipient,
    request_ref: body.requestRef,
  });
}

function decodeDecisionRequestEntry(
  seq: number,
  text: string,
  committedAt: number,
): DecisionRequestEntry {
  const parsed = JSON.parse(text) as {
    context_ref?: unknown;
    decisions?: unknown;
    recommendation?: unknown;
    recommendation_source?: unknown;
    recipient?: unknown;
    request_ref?: unknown;
  };
  const source = parsed.recommendation_source as
    | { from_step?: unknown; event_type?: unknown }
    | undefined;
  if (
    typeof parsed.request_ref !== "string" ||
    typeof parsed.recipient !== "string" ||
    !Array.isArray(parsed.decisions) ||
    parsed.decisions.some((key) => typeof key !== "string") ||
    (parsed.recommendation !== undefined && typeof parsed.recommendation !== "string") ||
    (source !== undefined &&
      (typeof source.from_step !== "string" || typeof source.event_type !== "string"))
  ) {
    throw new Error(`store integrity: malformed decision_request body at seq ${String(seq)}`);
  }
  // The PAIR RULE, refused in both directions rather than repaired: a
  // recommendation without its source, or a source without its
  // recommendation, is a half-written audit answer.
  if ((parsed.recommendation === undefined) !== (source === undefined)) {
    throw new Error(
      `store integrity: decision_request seq ${String(seq)} carries recommendation and ` +
        `recommendation_source apart (they travel together)`,
    );
  }
  return {
    entryKind: "DECISION_REQUEST",
    seq,
    requestRef: parsed.request_ref,
    recipient: parsed.recipient,
    decisions: parsed.decisions as readonly string[],
    ...(parsed.recommendation !== undefined ? { recommendation: parsed.recommendation } : {}),
    ...(source !== undefined
      ? {
          recommendationSource: {
            fromStep: source.from_step as string,
            eventType: source.event_type as string,
          },
        }
      : {}),
    // Presence again, on the read side: `"context_ref" in parsed` and
    // never a truth test, so a stored `null` decodes as PRESENT.
    ...("context_ref" in parsed ? { contextRef: parsed.context_ref } : {}),
    committedAt,
  };
}

// ── The two OPERATOR-ENTRY bodies (C22/Q2, packet ch14-p2b) — the SAME
// casing seam the wait column and the DECISION_REQUEST body follow: the
// class's own fields ride `entry_body` as canonical JSON with the
// model's SNAKE keys, the TS grain staying camelCase. A THIRD user of
// one rule, never a new rule.

function encodeDecisionMadeBody(body: DecisionMadeBody): string {
  return canonicalJson({
    by: body.by,
    decision: body.decision,
    // `override` is spread on PRESENCE and is `true` when present —
    // NEVER written `false` (Q5/dimension 8): an explicit `false` would
    // make the audit surface answer "declined to override" where the
    // contract says there was nothing to override.
    ...(body.override !== undefined ? { override: body.override } : {}),
    // `payload` on PRESENCE, never truthiness — an authored `{}`, `null`,
    // `""` or `0` records as faithfully as an object.
    ...(body.payload !== undefined ? { payload: body.payload } : {}),
    request_ref: body.requestRef,
  });
}

function encodeWaitResumedBody(body: WaitResumedBody): string {
  return canonicalJson({ event: body.event, kind: body.kind });
}

function decodeDecisionMadeEntry(
  seq: number,
  opId: string,
  text: string,
  committedAt: number,
): DecisionMadeEntry {
  const parsed = JSON.parse(text) as {
    by?: unknown;
    decision?: unknown;
    override?: unknown;
    payload?: unknown;
    request_ref?: unknown;
  };
  if (
    typeof parsed.by !== "string" ||
    typeof parsed.decision !== "string" ||
    typeof parsed.request_ref !== "string"
  ) {
    throw new Error(`store integrity: malformed decision_made body at seq ${String(seq)}`);
  }
  // The ABSENT-NOT-FALSE rule read back from the other side: the column
  // may carry `true` or nothing at all. A stored `false` is drift, not a
  // value to repair — it is exactly the shape the write side refuses.
  if (parsed.override !== undefined && parsed.override !== true) {
    throw new Error(
      `store integrity: decision_made seq ${String(seq)} carries a non-true override ` +
        `(recorded true IFF against a recommendation, ABSENT otherwise — never false)`,
    );
  }
  return {
    entryKind: "DECISION_MADE",
    seq,
    opId,
    decision: parsed.decision,
    // Presence on the read side too: `"payload" in parsed`, so a stored
    // `null` decodes as PRESENT.
    ...("payload" in parsed ? { payload: parsed.payload } : {}),
    by: parsed.by,
    requestRef: parsed.request_ref,
    ...(parsed.override === true ? { override: true as const } : {}),
    committedAt,
  };
}

function decodeWaitResumedEntry(
  seq: number,
  opId: string,
  text: string,
  committedAt: number,
): WaitResumedEntry {
  const parsed = JSON.parse(text) as { event?: unknown; kind?: unknown };
  if (typeof parsed.kind !== "string" || typeof parsed.event !== "string") {
    throw new Error(`store integrity: malformed wait_resumed body at seq ${String(seq)}`);
  }
  return {
    entryKind: "WAIT_RESUMED",
    seq,
    opId,
    kind: parsed.kind,
    event: parsed.event,
    committedAt,
  };
}

// ── The wait encoding (S5) — stored snake keys, TS camelCase (T4) ────

function encodeWait(wait: WaitReason | null): string | null {
  if (wait === null) {
    return null;
  }
  return canonicalJson({
    kind: wait.kind,
    // K4 (ch14-p2a): present IFF the human-gate park wrote this record.
    // Spread-on-presence, never a null placeholder — a stored `null`
    // would make "no ref" and "a ref we lost" the same bytes.
    ...(wait.requestRef !== undefined ? { request_ref: wait.requestRef } : {}),
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
    request_ref?: unknown;
    requested_by?: unknown;
    resume_events?: unknown;
  };
  // K4 (ch14-p2a): the kind guard OPENS with the union. It was an
  // equality against the single kernel-owned member; a `wait` step now
  // declares its own authored kind, so a persisted decision wait or an
  // authored wait must never meet a closed decode. What stays checked is
  // the SHAPE — a nonempty string kind, not a membership list, because
  // admission owns the collision refusal and a second membership
  // constant here would be a competing authority.
  if (
    typeof parsed.kind !== "string" ||
    parsed.kind === "" ||
    typeof parsed.requested_by !== "string" ||
    !Array.isArray(parsed.resume_events) ||
    parsed.resume_events.some((event) => typeof event !== "string") ||
    (parsed.request_ref !== undefined && typeof parsed.request_ref !== "string")
  ) {
    throw new Error(`store integrity: malformed wait value '${text}'`);
  }
  return {
    kind: parsed.kind,
    requestedBy: parsed.requested_by,
    resumeEvents: parsed.resume_events as readonly string[],
    ...(parsed.request_ref !== undefined ? { requestRef: parsed.request_ref } : {}),
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
  /** NULLABLE since schema 6 (K8): the op-less class carries none. */
  op_id: string | null;
  entry_kind: string;
  envelope: string | null;
  payload_digest: string | null;
  gate_decisions: string | null;
  issued_agent_config: string | null;
  /** The op-less class's own fields, canonical JSON with SNAKE keys. */
  entry_body: string | null;
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
  // THE INHERITED INVARIANT (K8, ch14-p2a). Until schema 6 the DDL's
  // `op_id TEXT NOT NULL` was the ONLY thing guaranteeing an op-carrying
  // row has an op id — the mapper passed the column through unchecked.
  // Relaxing the column to make the op-less class expressible would have
  // dropped that guarantee entirely, so it MOVES here rather than
  // disappearing, and it is CLASS-CONDITIONAL in both directions: the
  // two op-carrying classes require it PRESENT, the op-less class
  // requires it ABSENT. A row that has it backwards is integrity drift.
  // Q2 (packet ch14-p2b): THE PREDICATE SPLITS IN TWO. Until this packet
  // one `opLess` flag governed BOTH "carries no op id" and "carries a
  // body", because the ONE op-less class was also the ONE body-bearing
  // one. The two operator classes carry an op id AND a body, so the
  // partitions come apart and the name `opLess` stops covering the body
  // rule. Keeping one predicate for both would route a new class through
  // the wrong branch and still read green on everything but `op_id`.
  const opLess = row.entry_kind === "DECISION_REQUEST";
  const bodyBearing =
    row.entry_kind === "DECISION_REQUEST" ||
    row.entry_kind === "DECISION_MADE" ||
    row.entry_kind === "WAIT_RESUMED";
  if (!opLess && row.op_id === null) {
    throw new Error(
      `store integrity: ${row.entry_kind} row seq ${String(row.seq)} has a NULL op_id ` +
        `(op-carrying class; the DDL's NOT NULL moved here at schema 6)`,
    );
  }
  if (opLess && row.op_id !== null) {
    throw new Error(
      `store integrity: DECISION_REQUEST row seq ${String(row.seq)} carries an op_id ` +
        `(the class is op-less — it consumes no (instance_id, op_id) uniqueness)`,
    );
  }
  // …and the entry_body column iff, the same rule from the other side:
  // the op-less class REQUIRES it, the other two refuse it. Checking one
  // direction only would let a build route the new class through the
  // fact branch and still read green on everything but `op_id`.
  if (bodyBearing && row.entry_body === null) {
    throw new Error(
      `store integrity: ${row.entry_kind} row seq ${String(row.seq)} has a NULL entry_body ` +
        `(the class's fields live there)`,
    );
  }
  if (!bodyBearing && row.entry_body !== null) {
    throw new Error(
      `store integrity: ${row.entry_kind} row seq ${String(row.seq)} carries a non-null entry_body ` +
        `(body-bearing-class-only field)`,
    );
  }
  if (opLess) {
    if (
      row.envelope !== null ||
      row.payload_digest !== null ||
      row.gate_decisions !== null ||
      row.issued_agent_config !== null
    ) {
      throw new Error(
        `store integrity: DECISION_REQUEST row seq ${String(row.seq)} carries a transition-only field (class iff)`,
      );
    }
    return decodeDecisionRequestEntry(row.seq, row.entry_body as string, row.committed_at);
  }
  // The two OPERATOR-ENTRY classes (Q2): op-carrying AND body-bearing,
  // with all four transition-only columns NULL by class (C22's
  // absence-by-class, the same iff refused in both directions above).
  if (row.entry_kind === "DECISION_MADE" || row.entry_kind === "WAIT_RESUMED") {
    if (
      row.envelope !== null ||
      row.payload_digest !== null ||
      row.gate_decisions !== null ||
      row.issued_agent_config !== null
    ) {
      throw new Error(
        `store integrity: ${row.entry_kind} row seq ${String(row.seq)} carries a transition-only field (class iff)`,
      );
    }
    return row.entry_kind === "DECISION_MADE"
      ? decodeDecisionMadeEntry(
          row.seq,
          row.op_id as string,
          row.entry_body as string,
          row.committed_at,
        )
      : decodeWaitResumedEntry(
          row.seq,
          row.op_id as string,
          row.entry_body as string,
          row.committed_at,
        );
  }
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
      opId: row.op_id as string,
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
      // Q15 (packet ch14-p2b): THE WHITELIST OPENS BY TWO. Before this
      // packet a row of either operator class would make this lookup
      // THROW where the operator ladder's idempotency rung needs the row
      // RETURNED — the compare is over a SQL `string`, so `tsc`
      // enumerates nothing here and only opening it by hand works. Its
      // reciprocal binds too: an ACTOR envelope reusing an op id
      // consumed by a DECISION_MADE row must answer `op_id_collision`
      // rather than throwing.
      //
      // The op-less class never appears: an `op_id = ?` lookup never
      // matches a NULL row (measured on the live driver, receipt
      // PROBE-CH14P2A-1), so DECISION_REQUEST is absent by construction
      // rather than by exclusion here.
      if (
        row.entry_kind !== "transition" &&
        row.entry_kind !== "DECISION_MADE" &&
        row.entry_kind !== "WAIT_RESUMED" &&
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

        // E3: the axis fields ride the SAME transaction the commit
        // always used (REV-A1-TXN unchanged). K1 (ch14-p2a): they now
        // arrive NESTED in the arrival's branded effect record, and the
        // `wait` column joins them — ALWAYS written, value or null, so
        // the S5 same-move clear cannot be forgotten by an arrival that
        // simply omitted the field.
        const arrival = input.arrival;
        const cas = db
          .prepare(
            `UPDATE instances
               SET current_step = ?, round = ?, kernel_status = ?,
                   terminal_disposition = ?, wait = ?, version = version + 1
             WHERE instance_id = ? AND version = ?`,
          )
          .run(
            arrival.newCurrentStep,
            arrival.newRound,
            arrival.newKernelStatus,
            arrival.newTerminalDisposition,
            encodeWait(arrival.newWait),
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
          canonicalJson(arrival.issuedAgentConfig),
          time.now(),
        );
        // K2 (ch14-p2a): the human-gate park's SECOND ROW, in the SAME
        // transaction as the state write above. An append failure rolls
        // the whole commit back, and no half-entered gate exists — two
        // commits would BE that half-entered gate, and a kernel-side
        // compensating delete would be a second correctness mechanism
        // beside the transaction.
        //
        // The row is OP-LESS by class: `op_id` NULL (it consumes no
        // uniqueness), the transition-only columns NULL, and the class's
        // own fields in `entry_body` as canonical JSON with snake keys.
        if (arrival.decisionRequest !== undefined) {
          db.prepare(
            "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at) VALUES (?, ?, NULL, 'DECISION_REQUEST', NULL, NULL, NULL, NULL, ?, ?)",
          ).run(
            input.instanceId,
            next.seq + 1,
            encodeDecisionRequestBody(arrival.decisionRequest),
            time.now(),
          );
        }
        db.exec("COMMIT");
        return Promise.resolve({ kind: "committed", version: input.expectedVersion + 1 });
      } catch (error) {
        db.exec("ROLLBACK");
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Q2 (packet ch14-p2b): the OPERATOR-ENTRY write member — ONE member
    // for BOTH op-carrying operator classes, discriminated by
    // `entry.kind`. It reproduces `commitTransition`'s shape exactly:
    // the in-transaction idempotency re-check FIRST (the pre-check is a
    // fast path, the transaction stays the correctness mechanism —
    // REV-A1-TXN), then the CAS, then the row, then the human-gate
    // park's OPTIONAL SECOND ROW in the SAME transaction.
    commitOperatorEntry(input: CommitOperatorEntryInput): Promise<CommitTransitionResult> {
      db.exec("BEGIN IMMEDIATE");
      try {
        // The in-transaction re-check is KIND-AWARE (Q15's compare, the
        // sibling members' shape): a row of the entry's OWN kind under
        // the key is a replay; ANY other kind is a visible collision.
        // The digest half is deliberately absent — these classes carry
        // no digest and the compare is an equality on the discriminant.
        const existing = db
          .prepare("SELECT entry_kind FROM transcript WHERE instance_id = ? AND op_id = ?")
          .get(input.instanceId, input.entry.opId) as { entry_kind: string } | undefined;
        if (existing !== undefined) {
          db.exec("ROLLBACK");
          return Promise.resolve(
            existing.entry_kind === input.entry.kind
              ? { kind: "duplicate_op" }
              : { kind: "op_id_collision" },
          );
        }

        const arrival = input.arrival;
        const cas = db
          .prepare(
            `UPDATE instances
               SET current_step = ?, round = ?, kernel_status = ?,
                   terminal_disposition = ?, wait = ?, version = version + 1
             WHERE instance_id = ? AND version = ?`,
          )
          .run(
            arrival.newCurrentStep,
            arrival.newRound,
            arrival.newKernelStatus,
            arrival.newTerminalDisposition,
            encodeWait(arrival.newWait),
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
        // OP-CARRYING and BODY-BEARING (Q2's column iff): `op_id`
        // PRESENT, `entry_body` NON-NULL, and all four transition-only
        // columns NULL by class.
        db.prepare(
          "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)",
        ).run(
          input.instanceId,
          next.seq,
          input.entry.opId,
          input.entry.kind,
          input.entry.kind === "DECISION_MADE"
            ? encodeDecisionMadeBody(input.entry.body)
            : encodeWaitResumedBody(input.entry.body),
          time.now(),
        );
        // The park's SECOND ROW — a decision routing back to a gate
        // commits its own op-carrying row AND a fresh DECISION_REQUEST in
        // ONE transaction, exactly as the transition member does.
        if (arrival.decisionRequest !== undefined) {
          db.prepare(
            "INSERT INTO transcript (instance_id, seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at) VALUES (?, ?, NULL, 'DECISION_REQUEST', NULL, NULL, NULL, NULL, ?, ?)",
          ).run(
            input.instanceId,
            next.seq + 1,
            encodeDecisionRequestBody(arrival.decisionRequest),
            time.now(),
          );
        }
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
          "SELECT seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at FROM transcript WHERE instance_id = ? ORDER BY seq",
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
                  "SELECT seq, op_id, entry_kind, envelope, payload_digest, gate_decisions, issued_agent_config, entry_body, committed_at FROM transcript WHERE instance_id = ? AND seq > ? ORDER BY seq",
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
