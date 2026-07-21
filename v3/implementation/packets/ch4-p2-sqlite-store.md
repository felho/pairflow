# Task Packet: ch4-P2 — SQLite store: schema, marker, fail-closed, txn shape

Plan step: plan.md §4.2 (store) + §4.3 (timestamps) + §4.4 (ADR-006
driver); realizes `CHK-A1-SCHEMA` + `CHK-C-TS-SOURCE`
Autonomy stage: calibration

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [
      { "id": "l0a/instance-store", "disposition": "type/schema" },
      { "id": "l0a/transcript-event-log", "disposition": "type/schema" },
      { "id": "l0a/atomic-transition-commit", "disposition": "test" }
    ],
    "traces": [],
    "shared_ownership": []
  }
}
```

## Operative material (full text — projection, not invention)

**Inherited contract:** the ch4-P1 canonical contract matrix — the
`StorePort` / `CommitTransitionResult` shapes are code now
(`v3/src/ports/store.ts`); this packet implements them, it does not
reinterpret them.

### Schema requirements (plan §4.2, `CHK-A1-SCHEMA`)

- `instances` — one row per `WorkflowInstance` (instance_id PK, pinned
  template ref, task, binding JSON, current_step, round, status,
  version, store-stamped created_at).
- `transcript` — append-only event log: `PRIMARY KEY (instance_id, seq)`,
  **`UNIQUE (instance_id, op_id)`** — the IC-A1 constraint lives in the
  DATABASE, not in code.
- `meta` — the ADR-003 schema marker: `schema_version` + `prototype`.
- WAL mode (ADR-003) on file-backed stores.

### Transaction shape (plan §4.2, binding)

ONE `BEGIN IMMEDIATE` transaction per `commitTransition`:

1. duplicate check FIRST: existing `(instance_id, op_id)` →
   `duplicate_op` — even when the instance version has since advanced
   (precedence: idempotency before stale, the L0b HANDLE order);
2. CAS: `UPDATE instances … WHERE instance_id = ? AND version =
   expectedVersion`; zero rows → `cas_conflict`, nothing written;
3. append: next `seq` (1-based per instance), envelope JSON,
   `committed_at` stamped from the store's injected `TimeSource`;
4. commit → `{ kind: "committed", version: expectedVersion + 1 }`.

The `UNIQUE` constraint stays the schema-level backstop under the
SELECT-based precedence check.

### Timestamp rule (plan §4.3, `CHK-C-TS-SOURCE`)

The store is CONSTRUCTED with a `TimeSource` and stamps `created_at` /
`committed_at` inside the commit boundary. NOT a SQLite `DEFAULT` — a DB
default would make the frozen-clock acceptance test meaningless. No
write API accepts a timestamp (already type-enforced by `StorePort`).

### Store-open — fail-closed (ADR-003, verbatim stance)

> - applies to **development/prototype stores only**, identified by an
>   explicit schema marker (schema version + prototype flag) written at
>   store init;
> - a store with an unknown, missing, or non-prototype marker → **fail
>   closed**: refuse to open, never silently wipe;
> - no migration framework until the schema stops moving fast.

Mechanized: a database with NO tables at all → fresh init (schema +
marker). Tables present but marker missing/unreadable → refuse.
`prototype` ≠ true → refuse. Known prototype marker with a DIFFERENT
schema version → wipe-and-recreate (the fenced dev path). Same version →
open.

## In-context notes (the scarce budget)

- The store NEVER interprets templates — `newCurrentStep` / `newRound` /
  `newStatus` arrive kernel-derived (P1 matrix); the store's job is
  atomicity + stamping.
- Envelope persistence is JSON round-trip fidelity (the transcript
  stores what ingress admitted); payload semantics/validation are NOT
  store concerns (ingress = P3, digest = ch 5 emit-lib).
- `listInstances` ordering: insertion order (rowid) — deliberately
  unspecified in the port contract; ch 6 decides operator-facing
  ordering.
- Store lifecycle (`openStore(path, timeSource)` → handle with `close()`)
  is the `store/` module's factory surface, NOT part of `StorePort`
  (P1 matrix).

## Embedding gates (v1-inherited)

- Target files: `v3/src/store/sqliteStore.ts` (new),
  `v3/src/store/index.ts` (re-export), `v3/src/store/sqliteStore.test.ts`.
- Entrypoints: `openStore` factory.
- Mutation boundary: `v3/src/store/` ONLY. `ports/`, `domain/`,
  `testkit/` unchanged (tests IMPORT the testkit controlled clock —
  that is consumption, not mutation).

## Acceptance

- Contract tests (this packet):
  - atomicity: commit writes transcript row + instance update as one
    unit; `cas_conflict` leaves NO transcript row;
  - precedence race: committed op retransmitted AFTER the version
    advanced → `duplicate_op`, never `cas_conflict`;
  - `CHK-A1-SCHEMA` claim-derived negative: a duplicate
    `(instance_id, op_id)` inserted by RAW SQL (kernel pre-check
    bypassed) fails at the database level;
  - `CHK-C-TS-SOURCE`: frozen controlled clock → `created_at` /
    `committed_at` equal the frozen value exactly; advancing the clock
    moves the next stamp;
  - store-open fail-closed family: fresh init writes the marker; reopen
    preserves data; missing marker → refuse; non-prototype → refuse;
    version mismatch on prototype → wipe-and-recreate.
- Checks: `CHK-A1-SCHEMA`, `CHK-C-TS-SOURCE` flip to realized at chapter
  close; all v3 bridges green.
- Drift tests green (standing — PI-3 pre-test from P1 unaffected).
- Standing review rules in force: **REV-A1-TXN** (op record + CAS under
  ONE boundary; the pre-check is a fast path, never the correctness
  mechanism).
