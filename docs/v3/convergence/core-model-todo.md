# Core Model TODO

Follow-up clarifications for `core-model.html` based on the kernel-spectrum synthesis.

## Part A — Source-closed idempotency kernel

These three TODOs are one logical part, not independent cleanups. They form the
positive version of the synthesis warning: close idempotency at the source.

```text
stable op_id  ->  transactional ledger  ->  derived/effect boundary
 identity          enforcement              safe post-commit behavior
```

The dependency matters. A ledger is only useful if retries reuse a stable operation
identity. Derived dispatch is only safe because the return path is idempotent. External
effects need their own pending-effect marker and egress idempotency key, because kernel
dedupe does not automatically make the outside world idempotent.

### A1. Make the idempotency ledger explicit

The current model uses `instance.transcript.has(envelope.op_id)` to express duplicate
detection. Keep the semantics, but clarify the implementation contract:

- `(instance_id, op_id)` is a kernel-level unique operation record.
- For L0a, default to **transcript-as-ledger** for accepted/committed operations:
  presence in the append-only transcript means the operation has already applied.
- The source of truth must be a store-backed uniqueness guarantee such as
  `UNIQUE(instance_id, op_id)`, enforced in the same atomic commit as the instance CAS.
- Version CAS and the `op_id` ledger are distinct guards. Per-instance
  `expected_version`/CAS prevents lost updates from a stale view; `(instance_id, op_id)`
  uniqueness prevents a re-delivered logical operation from applying twice. Versioned
  history by itself is not idempotency: a transcript only serves as the ledger if it
  enforces stable operation identity and uniqueness.
- `instance.transcript.has(op_id)` may remain as a pseudocode fast path, but it is not
  the correctness mechanism. If only the pre-check exists, concurrent delivery can race.
- The correct write boundary is: insert/append the operation record and update the
  materialized instance state under one transaction/CAS boundary.
- A separate `IdempotencyLedger` is an escape hatch for later cases where an operation
  needs dedupe but has no committed transcript entry, such as a remote relay boundary.
- Do not let rejected/non-committed events accidentally consume the apply-idempotency
  key. If rejected attempts need audit, model that as audit, not as the committed
  operation ledger.

### A2. Clarify derived output vs durable pending-effect boundaries

The model already uses `DispatchIntent`, `ActionIntent`, `SpawnIntent`, and durable
markers such as `action_running` / `spawning`. Clarify when these are merely derived
post-commit outputs versus durable, retryable side-effect work.

- Use this test: **after a crash, can the output be safely re-derived from committed
  kernel state alone?**
- If yes, it can remain a derived output. Actor `DispatchIntent` can stay derived until
  durable delivery arrives at L8.
- Derived dispatch is safe only because actor/event apply is idempotent via A1:
  at-least-once dispatch + idempotent apply = effectively-once state transition.
- External or crash-sensitive side effects need a committed marker/outbox/pending-effect
  record before the side effect runs.
- `action_running`, runtime provisioning requests, and child `spawning` links should be
  described as concrete instances of this pattern.
- The pending-effect marker/request id should be passed to the external system as an
  idempotency key where the external system supports it. Marker-before-effect alone
  still gives at-least-once effect execution after a crash between effect and result.
- For non-idempotent external effects, the egress contract must carry the operation
  identity across the boundary; otherwise recovery can duplicate the outside effect.
- Reconciler/outbox is for real external effects, not for repairing the kernel's own
  state consistency.

### A3. Define the `op_id` generation contract

The model should state what makes an `op_id` stable enough for retries:

- `op_id` stability is an edge/actor/relay contract. The kernel can enforce the
  identity it receives, but it cannot infer that two fresh IDs were intended to be the
  same logical operation.
- The same logical operation retry must reuse the same `op_id`.
- A new `op_id` means a new attempted operation, not "retry the same one."
- Distinguish retransmission from re-attempt. If the actor resends the same envelope
  because it did not receive an acknowledgement, it must reuse the same `op_id`. If the
  kernel returns `Stale` and the actor refreshes to a newer context packet, the next
  emit is a new logical operation with a new `op_id`, because the packet/input changed.
- Use content-addressed IDs when the operation is naturally identified by its content,
  such as "submit this exact decision payload."
- Use request-scoped nonces when two identical-looking payloads may be two legitimate
  operations, such as "increment twice." Pure content-addressing would incorrectly
  collapse those operations into one.
- Later relay/channel levels must preserve this identity across process, host, or
  network retries.

## Part B — Commit-based actor output and leaderless concurrency

This section is the second logical part from the synthesis. The core model already
leans this way through atomic commits, `expected_version`, and transcript entries, but
the two central bets should be named explicitly so implementation does not drift toward
replay or leaderful coordination.

### B1. Make record-not-replay an actor-output invariant

The model should state that actor/LLM work is never recovered by replaying the actor.
The deterministic orchestration skeleton may be re-derived from committed kernel state;
the actor's output is the durable fact once accepted.

- Every accepted actor emit commits the actor output as an immutable transcript fact,
  ideally by content-addressed artifact/evidence refs rather than ephemeral process
  output.
- Recovery may re-derive routing, dispatch, gates, and post-commit outputs from
  committed state, but it must not re-run an LLM/actor to reconstruct a previously
  accepted result.
- Record-not-replay is the default kernel contract, not an opt-in `@task`-style
  annotation on selected steps.
- The transcript should preserve enough provenance to audit the accepted actor output:
  issued context/config, actor identity/role, operation identity, and output refs.
- This is related to, but distinct from, A1 idempotency. A1 prevents applying the same
  operation twice; record-not-replay prevents treating non-deterministic actor work as
  something the kernel can regenerate.

### B2. Name the leaderless/CAS/fencing boundary

The model should state that v3 correctness does not depend on a leader-per-shard,
process-local single writer, or in-memory version map. It should also separate in-band
`request_id` correlation from true external fencing tokens.

- Any worker may handle an instance event; correctness comes from store-backed
  `(instance_id, op_id)` uniqueness plus per-instance `expected_version`/CAS.
- Worker claiming mechanisms such as `SELECT ... FOR UPDATE SKIP LOCKED` are scheduling
  tools, not semantic authority. They do not replace idempotency or CAS.
- Process-local state such as `versions_seen` may be a cache/optimization only; the
  store-backed instance version is authoritative.
- In-band correlation is the default, and it already covers every external effect in
  the current model. Action running, runtime provision/release, and child spawn
  write-back each commit a `request_id` marker and return their result through the
  kernel as a CAS-guarded event.
- Result handlers must require the current committed marker to still match the
  `request_id`, so a stale or zombie worker's late result is rejected against the newer
  state. This is what fences a zombie here, not a separate token.
- A true fencing token, monotonic and enforced by an external system, is not required by
  anything in the current model. Out-of-band writes do occur, such as the runner's
  `git commit` / `merge` in the worktree, but the model never takes over an in-flight
  claim while the original worker may still be live: a single CAS claim has no
  timeout-driven or forced successor, and re-park happens only on a returned failure
  classification. A superseded worker and a replacement therefore cannot write
  out-of-band concurrently.
- Introduce a fencing token only if a future level adds that shape: a worker holding a
  lease that writes directly to a shared external resource where a superseded worker
  could corrupt it out-of-band. Watch retry of partially completed external effects and
  L8 durable delivery. Such a scoped per-operation lease is not leader-per-shard.

## Part C — Audited human decisions as kernel records

This section captures the synthesis point that most studied systems treated human
decisions as ephemeral UI/config/analytics facts. The current L3 model already makes
`DECISION_REQUEST` and `DECISION_MADE` durable transcript entries; the remaining work is
to keep that contract explicit and prevent telemetry from masquerading as audit.

### C1. Make the decision record completeness explicit

The L3 model should state the minimal durable audit fields for a human decision record.

- `DECISION_REQUEST` is the durable ask: request identity, recipient/role, declared
  decision keys, recommendation, recommendation source, and decision context.
- `DECISION_MADE` is the durable answer: request identity, operator identity, decision
  key, validated payload, override marker when applicable, operation identity, and
  commit timestamp or transcript commit metadata.
- The timestamp must come from the kernel commit/append boundary, not from UI display
  time or an analytics event.
- A decision record is generic and decision-agnostic. `approve`, `request_rework`,
  `accept_risk`, or `choose_strategy` are template decision keys, not kernel verbs.

### C2. Preserve validate-before-mutate for decisions

The L3 `SUBMIT_DECISION` path should keep all validation before the decision mutates
workflow state.

- Validate wait kind, request correlation, idempotency (`op_id` Duplicate), stale
  version, operator authority, declared decision key, required payload fields, and
  override applicability before appending `DECISION_MADE`. Keep idempotency before
  stale, as in A1.
- A rejected decision must not route the workflow and must not consume the committed
  decision audit slot. If rejected attempts need audit, model them as rejected-attempt
  audit, not as `DECISION_MADE`.
- The validated payload is the payload that gets recorded and handed off to the target
  actor when the decision routes back to work.

### C3. Keep analytics derived from audit, never the audit itself

The model should explicitly distinguish authoritative decision audit from metrics or
telemetry streams.

- Metrics, analytics feeds, UI state, and activity streams may derive from
  `DECISION_REQUEST` / `DECISION_MADE`, but they are not the decision source of truth.
- A telemetry event cannot stand in for a missing decision record, even if it contains
  similar fields.
- Purge/archive/storage-lifecycle work must preserve whatever audit floor is declared
  for decisions, rather than relying on optional exports or UI history.

## Part D — Child fan-in correlation and durable join state

This section is the synthesis fan-in point. The current L4 model already builds the
correct single-child primitive: a parent-owned durable `ChildWorkflowLink` (`child_key`,
`request_id`, `child_id`, `status`), `CHILD_SPAWNED` with request-id correlation + CAS,
and `CHILD_LIFECYCLE` correlated by `parent_ref`/`link_id`/`child_id` with fail-closed
wait conditions — and it explicitly defers fan-out (sequential, one child link per parent
step). Part D is not a fix for that primitive; it is the contract the real N-child fan-in
must satisfy when fan-out lands. D1 states the invariant the single-child slot already
meets; D2–D5 are the N-child extensions.

### D1. The slot is the authorization, not just provenance

The issued per-attempt slot — not the spawn selector key — is what authorizes a completion.

- The issued attempt slot is `link_id` (stable from spawn): `request_id` authorizes the
  spawn write-back, and `child_id` correlates the lifecycle once bound. `child_key` only
  selects/reuses the active link (≤ 1 active per `(instance, step, child_key)`); it is not
  sufficient authorization across attempts, because a terminal link lets a fresh attempt
  reuse the same `child_key` under a new `link_id`.
- Acceptance differs by whether the completion routes the parent. The spawn bind
  (`CHILD_SPAWNED`) binds `child_id` to an issued `spawning` link and does not route — the
  parent stays parked for the lifecycle. A completion that routes the parent
  (`CHILD_LIFECYCLE`, and the failed-spawn `CHILD_SPAWN_FAILED`) additionally requires the
  parent to still be parked on that link (`WAITING(child_event)`, matching `link_id`).
- This already holds for the single-child case. Preserve it under fan-out (N slots), and
  never regress to a `parent_workspace_id`-style provenance-only back-ref that is recorded
  but never awaited.

### D2. The fan-in barrier is a predicate over committed child-link rows

Fan-in is committed state, not an in-memory channel or a prompt injection.

- The parent wakes when a declared predicate over the committed child-link rows holds:
  wait-all, wait-any, quorum, terminal-set, etc. Because the join state is the committed
  rows themselves, it is crash-safe and resumable by construction.
- Scope the predicate to the current spawn generation/round, so a re-entered (looping)
  parent step re-arms the barrier and does not count a prior round's children. This is the
  LangGraph `consume()` reset expressed as round-scoped link selection (ties to A3
  identity-per-attempt).

### D3. Fan-in is identity-preserving where identity matters

The parent must know which child produced which result.

- Carry `child_key` / `link_id` → result/lifecycle identity through the join. On mixed
  outcomes the parent must see which child reached `done` versus `failed` / `cancelled`
  (a per-child terminal outcome, not a boolean "all done").
- Anonymous reduction (LangGraph `Send` → `operator.add` style) is acceptable only where
  it genuinely does not matter which child produced a result. Where it matters, identity
  must be preserved.

### D4. Internal lifecycle delivery needs an explicit durability contract

`CHILD_LIFECYCLE` is a real cross-instance delivery, not a re-derivable output.

- After a child reaches terminal it may be purged, so the event cannot be reconstructed
  from the child later. By the A2 test it is a durable side effect (a real delivery), not
  a re-derivable derived output.
- The model is already partway: consumption is idempotent and fail-closed (a repeated
  lifecycle after the parent has already routed is rejected as `not_awaiting_this_child`),
  and a lost `CHILD_SPAWNED` self-heals when the lifecycle binds `child_id`. The open edge
  is narrower — a lost terminal `CHILD_LIFECYCLE` after the child is purged.
- The constraint, whoever owns it: the child's terminal outcome must be durably recorded
  in a parent-correlated form before the child can wind down — otherwise "reconcile from
  the surviving link" has nothing to reconcile from.
- Leave the L4/L8 boundary open; Part D does not decide it. Either persist a
  parent-correlated transfer/outbox record at terminal commit, or explicitly leave delivery
  durability to the L8 (durable delivery) / L9 (reconciliation) contract — the model
  already points this way ("L8 generalizes the channel to external / durable"). Wherever it
  lands, pin down at-least-once delivery, retry, timeout, and a correlated transfer/timer
  record.
- Per the synthesis (§10.1), internal-delivery durability is still an open edge — confirm
  against that section when it is reviewed.

### D5. Partition-then-verify before relying on fan-in

Prevent overlapping child work at spawn time; verify is the backstop.

- Fan-out should declare non-overlapping work partitions / claims / fingerprints up front
  so child results cannot collide; fan-in then runs a conflict check. The partition/claim
  is the load-bearing prevention (no overlap at write time, the §3.1 lesson); the verify
  is the safety net. A work fingerprint is the claim key (ties to A3 content-addressed
  identity).
- This is mostly orchestration / template / gate responsibility, but the L4 contract must
  not permit the implicit "spawn a few children and let a reducer add them up" pattern.

## Non-goals

Keep the guardrails collected here, but grouped by the logical part they protect.

### Part A guardrails

- Do not use a reconciler/outbox to repair the kernel's own internal state consistency.

### Part B guardrails

- Do not introduce Temporal-style deterministic replay for actor/LLM work.
- Do not introduce leader-per-shard coordination for the L0a kernel.
- Do not treat worker-local locks, caches, or in-memory version maps as correctness
  authority.

### Part C guardrails

- Do not treat analytics, telemetry, UI state, or optional archive/export artifacts as
  the authoritative audit trail for human decisions.
- Do not let a human decision mutate workflow state before request correlation,
  idempotency (`op_id` Duplicate), stale/CAS, operator authority, required payload, and
  override checks pass. Keep the L3 check order aligned with A1: idempotency before
  stale.

### Part D guardrails

- Do not treat context injection, anonymous reduction where child identity matters,
  in-memory subagent handles, or a bare provenance back-ref as a fan-in mechanism.
- Do not let a fan-in barrier live in process memory or a prompt; the join predicate must
  be evaluable over committed child-link state.
- Do not assume internal `CHILD_LIFECYCLE` delivery is reliable without an explicit
  durability contract (transfer record + retry/timeout, or a declared L8/L9 boundary).

### Shared kernel-shape guardrails

- Do not move toward full event-sourcing as the source of truth.
- Keep the current materialized `WorkflowInstance` + transcript/audit + per-instance
  version/CAS shape.
