# Implementation Contract — Block A

Binding constraints the Block A implementation MUST satisfy. These are not model
content: the core model's semantics are already correct without them. They pin
HOW an implementation realizes those semantics, so it does not drift toward the
failure modes the kernel-spectrum synthesis documented. Extracted from
`core-model-todo.md` (2026-07-06); the model-side counterparts live there and in
`core-model.html`.

**Process rule (the reason this file exists):** the implementation plan's FIRST
chapter consumes this file. Every item below maps to one or more of: an
acceptance/contract test, a schema/lint/CI check, or an ADR that records a
deliberate deviation. An item with none of the three is a planning gap. Items
are numbered `IC-*` for referencing from the plan, tests, and ADRs.

## IC-A — Idempotency enforcement (from todo A1/A2)

### IC-A1. Store-backed uniqueness is the correctness mechanism

- `(instance_id, op_id)` is a kernel-level unique operation record. The source
  of truth is a store-backed uniqueness guarantee such as
  `UNIQUE(instance_id, op_id)`, enforced in the SAME atomic commit as the
  instance CAS (insert/append the operation record and update the materialized
  instance state under one transaction/CAS boundary).
- `instance.transcript.has(op_id)` in the pseudocode is a fast path, not the
  correctness mechanism. If only the pre-check exists, concurrent delivery can
  race.
- Version CAS and the `op_id` ledger are DISTINCT guards: CAS prevents lost
  updates from a stale view; `(instance_id, op_id)` uniqueness prevents a
  re-delivered logical operation from applying twice. Versioned history alone is
  not idempotency.
- Rejected/non-committed attempts must not consume the apply-idempotency key
  (the model states this on the lifecycle ops; it is universal). If rejected
  attempts need audit, model that as audit, not as the committed operation
  ledger.
- A separate `IdempotencyLedger` is an escape hatch for later cases where an
  operation needs dedupe but has no committed transcript entry (e.g. a remote
  relay boundary, L8).
- **Enforcement:** a concurrent-duplicate contract test (two racing deliveries
  of the same `(instance_id, op_id)` → exactly one commit, one `Duplicate`);
  a schema check that the uniqueness constraint exists; a transaction-boundary
  review checklist item.

### IC-A2. Egress idempotency and confirmed-effect markers

- The pending-effect marker / `request_id` must be passed to the external
  system as an idempotency key where the external system supports it.
  Marker-before-effect alone still gives at-least-once effect execution after a
  crash between effect and result.
- For non-idempotent external effects, the egress contract must carry the
  operation identity across the boundary; otherwise recovery can duplicate the
  outside effect.
- A completion marker must follow a CONFIRMED effect: a no-error/no-ack outcome
  is a distinct non-terminal state, never success (the nanoclaw negative proof,
  memo `_synthesis.md` §13).
- Any delivery/effect retry budget is durable ledger state, never an in-memory
  counter (nanoclaw's outbound counter resets on restart → a stuck send
  oscillates forever).
- Reconciler/outbox machinery is for real external effects only — never for
  repairing the kernel's own internal state consistency.
- **Enforcement:** a crash-window contract test per errand instance (kill
  between claim commit and effect; between effect and completion); an egress
  adapter interface that REQUIRES an idempotency-key parameter; ADR for any
  external system that cannot accept one.

### IC-A3. The `op_id` generation contract (edge/actor/relay side)

- `op_id` stability is an edge/actor/relay contract: the kernel enforces the
  identity it receives; it cannot infer that two fresh IDs meant one logical
  operation.
- The same logical operation retry must reuse the same `op_id`; a new `op_id`
  means a new attempted operation.
- Distinguish retransmission from re-attempt: resend-without-ack reuses the
  `op_id`; a refresh after `Stale` (new context packet) is a NEW logical
  operation with a new `op_id`, because the input changed.
- Use content-addressed IDs where the operation is naturally identified by its
  content ("submit this exact decision payload"); use request-scoped nonces
  where two identical payloads may be two legitimate operations ("increment
  twice") — pure content-addressing would collapse them.
- Later relay/channel levels must preserve this identity across process, host,
  or network retries.
- **Enforcement:** the client/CLI emit library owns `op_id` derivation (one
  audited implementation, not per-call-site choices); a retransmission test
  (same op_id → Duplicate) and a refresh test (post-Stale re-emit → new op_id);
  ADR selecting content-addressed vs nonce per operation family.

## IC-B — Leaderless mechanics (from todo B1/B2)

The semantic contracts (record-not-replay; leaderless-by-construction; in-band
correlation as fencing) are stated in the model (the L0a note). The mechanics:

- Worker claiming such as `SELECT ... FOR UPDATE SKIP LOCKED` is a scheduling
  tool, not semantic authority — it never replaces the `op_id` ledger or CAS.
- Process-local state (`versions_seen`-style maps, caches) is optimization
  only; the store-backed instance version is authoritative.
- Accepted actor output should be recorded with content-addressed
  artifact/evidence refs rather than ephemeral process output, so the durable
  fact is verifiable later.
- Introduce a true fencing token ONLY if a future level adds the shape it
  fences: a lease-holding worker writing directly to a shared external resource
  where a superseded worker could corrupt it out-of-band. Nothing in Block A
  needs it — a single CAS claim has no timeout-driven successor. Watch: retry of
  partially completed external effects; L8 durable delivery.
- **Enforcement:** a two-worker contract test (both process the same instance
  stream; correctness must not depend on which one wins); a review rule that no
  code path treats a local lock/cache as authority; the fencing-token watch as
  an ADR trigger, not code.

## IC-C — Decision audit mechanics (from todo C1/C3)

- The `DECISION_MADE` timestamp comes from the kernel commit/append boundary,
  never from UI display time or an analytics event.
- Metrics, analytics feeds, UI state, and activity streams may DERIVE from
  `DECISION_REQUEST` / `DECISION_MADE`; they are never the decision source of
  truth, and a telemetry event cannot stand in for a missing decision record.
- Purge/archive/storage-lifecycle work preserves the declared decision audit
  floor (the LC4 model already carries the surviving-audit contract; the
  implementation must not weaken it via optional exports or UI history).
- **Enforcement:** schema-level timestamp source (DB default / commit
  metadata, not client-supplied); a lint/review rule that analytics readers
  consume projections, never write audit tables; the LC4 purge contract test
  asserts the audit floor survives a purge.

## IC-N — Non-goals (kernel-shape guardrails)

- No Temporal-style deterministic replay for actor/LLM work.
- No leader-per-shard coordination for the kernel.
- No full event-sourcing as the source of truth: keep the materialized
  `WorkflowInstance` + transcript/audit + per-instance version/CAS shape.
- No reconciler/outbox for the kernel's own internal state consistency.
- **Enforcement:** ADR-gated — any design document proposing one of these
  shapes must cite and overturn this section explicitly.
