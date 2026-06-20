# DBOS Study — The Canonical L0a Reference (Durable Execution on Postgres)

Date: 2026-06-19

## Purpose

This note captures what Pairflow v3 can learn from **DBOS Transact**
(`dbos-inc/dbos-transact-ts`), a **lightweight durable-workflow engine built on
Postgres** — you annotate ordinary functions as workflows/steps, DBOS checkpoints
their state in Postgres, and on any failure they automatically resume from the last
completed step. It is small (~31K LOC TypeScript, core concentrated in a handful of
files) and is the **first purpose-built durable-execution engine** in this study
series — the category whose entire job *is* v3's kernel (L0a), plus L4 child
workflows, L6 scheduling, and durable L9 waits.

This is the study that matters most for v3's **central bet**, because DBOS is the
closest thing to a reference implementation of what v3's L0a is trying to build.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/dbos-transact-ts` (analyzed at HEAD
  `a9ba1dd`, 2026-06-16)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)
- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself

Fourth in a series. Read alongside:

- [`omnigent-study.md`](omnigent-study.md) — meta-harness; validated "L4 child = full
  first-class instance"; weak on the kernel.
- [`symphony-study.md`](symphony-study.md) — OTP orchestrator; skipped L0a, outsourced
  durability to an external SaaS; single-GenServer SPOF.
- [`paperclip-study.md`](paperclip-study.md) — control plane that *built* a durable
  Postgres kernel, but a mutable-state-row + audit-feed, no event-sourcing, no
  uniform version column, status-strings not a typed FSM, exact-only correlation.

> Method: first-pass slice research plus a second independent 10-lens sub-agent pass
> (kernel state, lifecycle, ownership, runtime context, policy, child/schedule,
> channels, metadata/versioning, operator UX, provider seams), each mapping DBOS onto
> specific v3 levels, with `file:line` citations relative to the DBOS repo root
> (`src/…`, `schemas/…`, `packages/…`). The codebase is small enough that the core
> files were read thoroughly.

## Executive Summary

The single load-bearing finding:

> **DBOS is the canonical L0a reference — and it is *simpler* than what v3 plans.**
> Its Transcript is one append-only table, `operation_outputs`, keyed by
> `(workflow_uuid, function_id)` — which is **exactly v3's `(instance_id, op_id)`**.
> `function_id` is a per-workflow monotonic counter assigned *synchronously before
> any await*, so the same code always assigns the same op-id to the same call site,
> and replay = re-run the workflow top-to-bottom while returning recorded outputs for
> already-completed steps. Crucially, DBOS achieves exactly-once **without
> event-sourcing and without an `expected_version` column**: the append-only step
> log + PK-uniqueness + `status`-predicate guarded UPDATEs replace both. This forces
> v3's two sharpest design questions into the open — *do you actually need full
> event-sourcing? do you actually need `expected_version`?* — and DBOS's answer is
> "you can ship correct durable execution without either."

The deepest architectural lesson cuts across every slice:

> **One primitive unifies almost everything.** "A deterministically-derived unique
> workflow/step id + `INSERT … ON CONFLICT` + memoized replay" is the *same*
> mechanism behind: step idempotency, whole-workflow idempotency, exactly-once child
> spawn (`child_id = parent_id-funcId`), exactly-once-per-interval scheduling
> (`sched-<name>-<ISO8601>`), queue dedup, and crash recovery. Where paperclip had
> scattered, per-entity, bespoke idempotency, DBOS has *one* idea applied everywhere.
> That collapse is the thing v3 should steal most.

What DBOS **validates** (model v3's kernel on this, close to line-for-line):

- **The Transcript = `operation_outputs(workflow_uuid, function_id)`** — append-only,
  write-once, PK-keyed; `ON CONFLICT … RETURNING` self-no-op makes duplicate
  detection one round-trip; replay returns the recorded output and **asserts
  `function_name` matches** (turning non-determinism into a loud `DBOSUnexpectedStepError`).
- **Deterministic replay-from-checkpoints is *the* resume model** — categorically
  better than paperclip's re-wake and symphony's fresh-dispatch. The price is the
  determinism contract: workflow *bodies* must be deterministic; all non-determinism
  (I/O, time, randomness, **LLM/agent calls**) lives in memoized *steps*.
- **Version-gated recovery** (`application_version` filter) is the safety latch that
  makes replay sound across deploys; **`MAX_RECOVERY_ATTEMPTS_EXCEEDED`** is the
  poison-pill dead-letter cap neither paperclip nor symphony had.
- **Queue-as-status-projection** — DBOS *had* a separate `workflow_queue` table and
  **migrated away from it**: an enqueued item is just a `workflow_status` row with
  `status='ENQUEUED'`. Dequeue + concurrency + rate-limit + priority + dedup all live
  in **one** `SELECT … FOR UPDATE SKIP LOCKED` + CAS-guarded UPDATE transaction.
- **Durable waits are checkpoints** — `send`/`recv` (point-to-point, consumed) and
  `setEvent`/`getEvent` (broadcast, pull) store the message in Postgres; the *block
  itself* is a checkpoint (the deadline is a durable `#durableSleep` step), so a crash
  mid-wait resumes the same wait and consumes exactly once. Wakeup = LISTEN/NOTIFY
  **over** polling ("polling is the floor, NOTIFY is the optimization").
- **L4 = full first-class instance** (confirms omnigent): child is a normal persisted
  workflow; `child_id = parent_id-funcId` makes idempotent spawn fall out for free;
  correlation recorded twice (`parent_workflow_id` on child + `child_workflow_id` in
  parent's step record).
- **No leader, no lease, no heartbeat** — N executors coordinate over one Postgres via
  `SKIP LOCKED` + conditional CAS; the DB *is* the control plane (answers symphony's
  SPOF). **`fork(id, startStep)`** elegantly collapses restart / retry-from-failure /
  edit-and-resume into one copy-history-then-replay primitive.

What DBOS **warns** about / where v3 must decide or go further:

- **Not event-sourced.** State is a *mutable* `workflow_status` row + an immutable
  *step* log; status is not derived by folding events. If v3 wants true event-sourcing
  (EventEnvelope, `actor_id`, multi-actor op attribution, time-travel), DBOS models
  only half of it — and proves you may not *need* the other half for correctness.
- **No `expected_version`.** DBOS uses value-based `status`-predicate CAS, which
  catches the *current* value but not A→B→A. v3's sequence-based `expected_version`
  buys multi-writer ordering — adopt it only if v3 truly has concurrent multi-actor
  writers to the *same* aggregate (DBOS's single-owner-executor model doesn't).
- **Correlation is always exact** (`dest_uuid::topic`, `wf_uuid::key`). There is **no
  fuzzy/external correlation** — the sender must already know the destination workflow
  id. v3's L9 differentiator (map an opaque external event to the right waiting run)
  is exactly the layer DBOS leaves to the application; v3 must build it *on top of*
  DBOS's durable substrate.
- **Determinism is a hard constraint, not a suggestion.** Changing workflow code can
  make old checkpoints unsafe to replay — hence version-gating. v3 must accept that
  resume is version-scoped (or fork from a step boundary).
- **No dead-executor detection.** DBOS has no liveness protocol; a crashed executor's
  PENDING workflows sit orphaned until an *external* actor triggers recovery. v3
  should add a TTL/lease sweep so recovery is self-healing, not operator-triggered.
- **No EventNormalizer, no agent/runtime/credential layers.** DBOS is a kernel, not a
  control plane — it has nothing for L0c/L0e/L7/L8-normalization/L11/L14 (source those
  from paperclip/omnigent). The waits are produced by *other workflows*, not ingested
  from heterogeneous external channels.
- **Poll-based waits/scheduling internals.** The child-result wait and the queue
  dispatcher are poll loops (NOTIFY is an optimization layer); the cron `nextWakeupTime`
  steps one second at a time (perf smell at scale). v3's push-wake design is better on
  latency — keep it, but borrow DBOS's "the wait is a durable checkpoint" framing.
- **Control-plane safety is not the same thing as kernel correctness.** DBOS has a rich
  admin surface, but the local admin server registers cancel/resume/restart/fork/list
  endpoints by default and emits wildcard CORS (`adminserver.ts:49-68,105-124`;
  `config.ts:213-221`). v3 should copy the operation catalog, not the safety defaults:
  lifecycle intervention must be privileged, audited, reasoned, and redacted by default.
- **Provider seams are present but too singleton-coupled for v3 federation.** DBOS's
  monorepo/provider-package shape is good (`package.json:33`; provider peer deps), but
  datasource/receiver adapters still read global `DBOS.workflowID`/`DBOS.stepID` or call
  static `DBOS.startWorkflow()` (`packages/nodepg-datasource/index.ts:182`;
  `packages/kafkajs-receive/index.ts:38-86`). v3 providers should receive explicit
  runtime ports and invocation-context DTOs.

---

## Slice 1 — System database & the L0a kernel

**Verdict:** The closest production-grade reference to v3's L0a — a durable-execution
kernel on Postgres with a genuinely append-only, replayable step-output table
(`operation_outputs`) keyed by `(workflow_uuid, function_id)`, exactly the
`(instance_id, op_id)` tuple v3 wants — but it is **NOT event-sourced**: a workflow's
own status is a single *mutable* row. It has **no `expected_version`/CAS column**;
concurrency is enforced by **PK-uniqueness of `(workflow_uuid, function_id)`** plus
per-statement `WHERE status=…` guards — a cleaner, more uniform mechanism than
paperclip's bespoke per-transition CAS. **LEARN FROM (canonical), with two deliberate
divergences v3 must choose consciously.**

### The durable model

Two tables form the kernel. **`workflow_status`** (`migrations.ts:26`,
`system_db_schema.ts:3-39`) — the **run aggregate**, a *single mutable row per
instance* (PK `workflow_uuid`): `status`, `name`/`class_name`/`config_name` (the
definition link), `inputs`, `output`, `error`, `executor_id`, `application_version`,
`recovery_attempts`, `parent_workflow_id`, timeouts, queue fields — **UPDATEd in
place**, not an event log. **`operation_outputs`** (`migrations.ts:24`) — the
**step-result/checkpoint table**, append-only, composite PK **`(workflow_uuid,
function_id)`**, with `output`, `error`, `function_name`, `child_workflow_id`,
timings, `serialization` (`system_db_schema.ts:56-66`). `function_id` is a
**per-workflow monotonic counter** (`functionIDGetIncrement()`,
`dbos-executor.ts:798`), so the table read in `function_id` order *is* the
deterministic step transcript. Satellites (all FK→status, ON DELETE CASCADE):
`notifications`, `workflow_events`(+`_history`), `streams`, `workflow_queue`/`queues`,
`workflow_schedules`.

**Precise framing answer:** the *step-output* table **is** the append-only replayable
Transcript; the *status* row is mutable. DBOS is **"mutable status row + immutable
memoized step log"**, not status-derived-from-events. State recovers by re-running the
function and short-circuiting each step from the recorded output.

### Checkpointing, idempotency, concurrency

The memoization contract — `recordOperationResultInternal`
(`system_database.ts:3787-3805`):
```sql
INSERT INTO operation_outputs (workflow_uuid, function_id, output, error, function_name, ...)
VALUES (...)
ON CONFLICT (workflow_uuid, function_id) DO UPDATE
  SET completed_at_epoch_ms = operation_outputs.completed_at_epoch_ms   -- no-op self-write
RETURNING completed_at_epoch_ms;
```
The no-op self-assignment makes the row RETURNable to detect a pre-existing record →
`DBOSWorkflowConflictError` on mismatch. Replay/skip (`dbos-executor.ts:828-841`):
before a step, `SELECT … WHERE workflow_uuid AND function_id`; if present, **don't
execute** — revive the recorded output. **This `(workflow_id, function_id)` *is* v3's
`(instance_id, op_id)`.** **Whole-workflow idempotency:** `workflow_uuid` is the
key; `insertWorkflowStatus` does `INSERT … ON CONFLICT (workflow_uuid) DO UPDATE`
(`:3592`) — a re-submit doesn't create a second run; `initWorkflowStatus` rejects
same-id-different-definition (`:751-765`).

**Concurrency — no version column.** Optimistic safety from (1) PK uniqueness on
`(workflow_uuid, function_id)` — two executors replaying the same step race on the
INSERT, loser gets `23505`/`40001` → conflict; (2) **`status`-predicate guarded
UPDATEs** with `rowCount===1` assertion (`:3750-3768`), e.g. terminal writes use
`WHERE notStatus=CANCELLED` so a cancellation during the final step wins. For
*transactional* steps, the business write AND the `operation_outputs` INSERT commit in
**one transaction on the same client** (`runTransactionalStep`, `:995-1031`). **vs
paperclip:** strictly cleaner and more uniform — an immutable step-log keyed by
`(wf, fn)` makes most CAS *unnecessary*, and residual transitions use a consistent
`status`-predicate guard rather than ad-hoc per-transition logic.

### Definition vs run, version-gating

Run aggregate = the status row. Definition = an **in-memory registry** (name → fn,
version, config); the row stores only references (`name`, `class_name`,
`application_version`). **Version-gated recovery:** `application_version` is stamped
on each row; recovery only picks pending workflows whose version matches the live
executor (`getPendingWorkflows … WHERE application_version=$3`, `:867-872`) — so a
redeployed binary won't mis-replay an old workflow. Per-step `function_name` equality
adds a finer drift check.

**v3 verdict — LEARN FROM (canonical), two divergences.** Copy directly: the
`(workflow_uuid, function_id)` step table as the Transcript; `workflow_uuid` as the
whole-workflow idempotency key; the `ON CONFLICT … RETURNING` self-no-op
duplicate-detect; version-gated recovery + `function_name` drift assertion; atomic
step-commit on one client. **Decide consciously:** (1) **event-sourcing** — DBOS only
event-sources the *step log*, not status; it proves you may not *need* full
event-sourcing for durable exactly-once, so v3 must justify the extra cost
(auditability, time-travel, multi-actor envelopes) rather than assume it. (2)
**`expected_version`** — DBOS drops it entirely (PK-uniqueness + value-based status
guards replace it); v3 should keep it only if it has concurrent multi-actor writers to
the same aggregate (sequence-based CAS catches A→B→A that value-based misses).

---

## Slice 2 — Executor: replay & recovery

**Verdict:** The *exact* model v3's L0a/L0d should follow — true deterministic
replay-from-checkpoints, not paperclip's re-wake or symphony's fresh-dispatch: on
recovery it re-invokes the workflow function from the top, and each step's recorded
output is returned from the durable log instead of re-executing, so the workflow
deterministically fast-forwards to the interruption point and continues. The cost v3
must accept is the **determinism contract**: workflow *bodies* must be deterministic
and side-effect-free, with all non-determinism (I/O, randomness, time, **LLM calls**)
in *steps* whose results are memoized — this is the price of replay, and it is the
right price.

### Execution & deterministic replay

Invoking a registered workflow → `internalWorkflow` (`dbos-executor.ts:420`), which
**synchronously persists a PENDING status row + inputs before running anything**
(`:492-524`), then calls the user fn inside a context carrying `workflowId` +
`curWFFunctionId`. Steps run through `callStepFunction` (`:779`); the checkpoint is
`recordOperationResult` after the body returns (`:966-974`). **`function_id` is
assigned by a counter advanced *before any await*** (`context.ts:91-100`; comment
`dbos-executor.ts:797` "Intentionally advance the function ID before any awaits") — so
the same source executed in the same order always assigns the same id to the same call
site. **Replay = re-run top-to-bottom**, where each step first checks the log
(`:828-841`): if `(wfid, funcID)` exists, return the recorded output, **don't re-run**;
and **assert `functionName` matches** or throw `DBOSUnexpectedStepError` — turning
silent non-determinism into a loud failure. What must be deterministic: the workflow
*body* (control flow, step order); non-determinism belongs *inside steps* whose
outputs are memoized (`dbos.ts:1982-1986`).

### Crash recovery, lifecycle, retries

Recovery runs **at executor startup** (`init` → `recoverPendingWorkflows([executorID])`,
`:381`), queries `getPendingWorkflows(execID, appVersion)`, and re-runs each (queued
ones re-enqueued, non-queued re-executed by reloading inputs). **Double-execution
prevention is multi-layered:** (1) executor partitioning by `application_version`; (2)
queue claims via `FOR UPDATE SKIP LOCKED` + conditional `UPDATE … WHERE status='ENQUEUED'`;
(3) the step-log PK is the ultimate guard — a second writer collides → conflict →
attach to the existing result rather than duplicate (`:676-681`); (4) in-process dedup.
**Lifecycle states** are a `const` union (`StatusString`, `workflow.ts:224-239`):
PENDING/SUCCESS/ERROR/MAX_RECOVERY_ATTEMPTS_EXCEEDED/CANCELLED/ENQUEUED/DELAYED, with
transitions guarded by SQL conditional UPDATEs (not a typed FSM object). **Dead-letter:**
`recovery_attempts` increments per recovery; exceeding `maxRecoveryAttempts` (default
100) moves the workflow to terminal `MAX_RECOVERY_ATTEMPTS_EXCEEDED`, preventing a
poison workflow from crash-looping. **Step retries:** exponential backoff (default 3
attempts, ×2, capped 1h) with an optional `shouldRetry` predicate; a permanently-failed
step is **checkpointed with its error** so replay re-throws from the log rather than
re-attempting.

**v3 verdict — LEARN FROM (strongly).** L0a: copy the replay contract (`function_id`
advanced before any await; look-up-or-execute-and-record; `op_name` asserted on
replay). L0d: deterministic replay *is* the resume model v3's lifecycle-guard should
use (vs paperclip re-wake / symphony fresh-dispatch); adopt the **dead-letter cap** and
**version-gated recovery** (the safety latch that makes replay sound). Keep the
SQL-guarded transitions as source of truth, add a typed FSM as a code-level
convenience. **The constraint v3 must accept:** orchestration code is deterministic;
all non-determinism (time, randomness, network, **LLM/agent calls, tool I/O**) lives in
memoized steps. For Pairflow, agent/LLM calls and tool I/O become steps (memoized),
while the agent-loop control flow becomes the replayable workflow body — exactly the
structure symphony and paperclip never imposed.

---

## Slice 3 — Durable queues & flow control

**Verdict:** A strong template for v3's L6 work-queue: not a separate queue table but a
**status projection** — an enqueued workflow is simply a `workflow_status` row with
`status='ENQUEUED'`, so enqueue is atomic/durable for free and there is no
queue↔workflow sync problem (DBOS explicitly *consolidated* a former separate
`workflow_queue` table into `workflow_status`). Dequeue, global/per-worker concurrency,
rate limit, priority, partitioning, and dedup all live in **one**
`findAndMarkStartableWorkflows` transaction using `SELECT … FOR UPDATE SKIP LOCKED` (or
`NOWAIT` under global limits) + a CAS-guarded `UPDATE … WHERE status='ENQUEUED'`. **LEARN
FROM** wholesale; the one thing not to blindly copy is the polling-with-backoff
dispatcher if v3 has a lower-latency wakeup.

### Queue-as-status-projection

The queue *config* lives in a `queues` table (concurrency, worker_concurrency,
rate_limit, priority_enabled, partition); the *items* are `workflow_status` rows with
`status='ENQUEUED'`. DBOS **deliberately folded** a dedicated `workflow_queue` table
into `workflow_status` (migration `20252528000000_consolidate_queues`,
`migrations.ts:167`) — "the workflow's existence *is* its queue membership." Enqueue =
the normal insert with `status='ENQUEUED'`, idempotent on `workflow_uuid`. **Dequeue**
(`findAndMarkStartableWorkflows`, `system_database.ts:2551`): step 1 selects candidates
`WHERE status='ENQUEUED' AND queue_name=$2 ORDER BY priority ASC, created_at ASC LIMIT
$maxTasks FOR UPDATE SKIP LOCKED` (or `NOWAIT` when a global concurrency limit needs an
exact count); step 2 claims via `UPDATE … SET status='PENDING' … WHERE workflow_uuid=$6
AND status='ENQUEUED'`, counting the claim only if `rowCount>0`. **This is paperclip's
optimistic WHERE-guarded claim, but with `SKIP LOCKED` on top** so the common case never
reaches a losing CAS, and as a *generic* primitive.

### Flow control, dedup, recovery

All three limits collapse into the dequeue transaction: **per-worker concurrency** from
an in-memory running count (process-local); **global concurrency** from a
`COUNT(*) WHERE status='PENDING'` under REPEATABLE READ + NOWAIT; **rate limit** from a
windowed count of `rate_limited` rows; **priority** from the `ORDER BY`. **Dedup** is a
DB unique index `(queue_name, deduplication_id)` with an explicit `DuplicationPolicy`
(`reject` | `return-existing`); the key is cleared on completion so it's reusable across
periods — cleaner than paperclip's app-level coalescing (the DB is the arbiter).
**Recovery:** a dead worker's PENDING rows are reset PENDING→ENQUEUED via
`clearQueueAssignment` (guarded by `status='PENDING'`), so the dispatcher re-claims them
— at-least-once dispatch, exactly-once effect (via step memoization).

**v3 verdict — LEARN FROM (one caveat).** Copy: queue-as-status-projection (the single
biggest lesson — DBOS *tried* a separate queue table and migrated away, eliminating
queue/workflow consistency bugs); one-transaction dequeue+flow-control; `SKIP LOCKED` +
CAS guard; dedup as a DB unique index + policy; per-executor PENDING-reset recovery.
**Caveat:** the dispatcher is a per-queue polling loop with backoff — robust but
poll-latency. If v3 has an event/wakeup channel (L6 triggers), drive the dispatcher off
that and use polling as a safety sweep; keep DBOS's dequeue SQL.

---

## Slice 4 — Durable communication & wait primitives

**Verdict:** The rigorous, crash-surviving model symphony (poll-only) and paperclip
(durable wakeup, *ephemeral* EventEmitter) both lacked: every wait is a Postgres row
(`notifications`/`workflow_events`), the wakeup is a LISTEN/NOTIFY-over-polling hybrid,
and the block itself is checkpointed so a replayed/recovered workflow re-derives the
same deadline and consumes each message exactly once. **LEARN FROM** for v3's L0a + the
durable-wait skeleton of L9; the debouncer is a near drop-in for L9 coalescing. But DBOS
correlation is **always exact** (`dest_uuid::topic` / `wf_uuid::key`) — it does **not**
solve v3's L9 hard problem (fuzzy/external correlation of opaque inbound events to the
right waiting run); that matching layer is the one thing v3 still must build, on top of
a DBOS-style durable substrate.

### send/recv, setEvent/getEvent, the wakeup transport

**send** = an INSERT into `notifications` wrapped in the step machinery (so replay is a
no-op), `ON CONFLICT (message_uuid) DO NOTHING` (idempotent on a caller key)
(`system_database.ts:1907`). **recv** durably blocks on the receiver's `workflowID`:
replay short-circuit first (`:1969`), then a **durable deadline** via `#durableSleep`
(itself a checkpointed step, `:1984`/`:3894`), then a wait loop racing a NOTIFY-driven
callback against a poll tick, then a **transactional consume** that flips
`consumed=true` on the oldest matching row AND records the operation result **in one
transaction** (`:2034-2072`) — the exactly-once linchpin. **setEvent/getEvent** is the
broadcast-pull dual: `setEvent` UPSERTs `workflow_events(workflow_uuid, key)` (latest
wins, + immutable history for fork); `getEvent` reads-without-consuming (many readers).
**Transport:** a DB trigger fires `pg_notify` on every insert; one background connection
holds `LISTEN` and resolves in-process waiter callbacks for instant wakeup — but **each
waiter also runs a bounded poll**, so **polling is the durability floor and NOTIFY is
the latency optimization** (DBOS even ships a self-test that warns if NOTIFY doesn't
arrive — PgBouncer transaction-mode breaks LISTEN/NOTIFY). The in-process NotificationMap
holds nothing durable; on recovery the workflow re-enters `recv`, re-registers, and the
initial SELECT finds any already-delivered row.

### Durable wait = checkpoint; the debouncer

Three checkpoints make the wait durable and memoized like a step: the **deadline**
(`#durableSleep` under `timeoutFunctionID`), the **completion** (recorded in the same
tx as consumption), and the **replay short-circuit** (returns the memoized value). So a
recovered workflow that already received a message does **not** re-block or re-consume.
**`debouncer.ts`** coalesces a burst of triggers for the same key into one downstream
run, built on send/recv/setEvent + queue dedup: first trigger enqueues a debouncer with
`deduplicationID`; each new message resets the debounce period (trailing-edge, with a
hard ceiling); subsequent producers hit the dedup, look up the live debouncer, `send`
new args, and `getEvent` to confirm receipt (an ack handshake). **A directly reusable
L9-coalescing skeleton.**

**v3 verdict.** **L0a — LEARN FROM (strongly):** two-layer idempotency
(step-checkpoint + `ON CONFLICT` caller key), consume-and-checkpoint in one transaction,
and `#durableSleep` making even the *deadline* recoverable — the wait's deadline, the
inbound event row, and the "I consumed it" record must all be durable, and consumption +
completion one atomic commit. **L8 — LEARN structure, ORTHOGONAL normalization:** the
`notifications` table *is* a durable inbox and the trigger→NOTIFY→callback→poll-floor
stack is a robust wakeup transport to copy (including the poll-floor stance and the
PgBouncer self-test); but there is **no EventNormalizer** — DBOS messages come from other
workflows in a known serialization, not opaque external channels. **L9 — LEARN the
durable-wait half, BUILD the fuzzy half:** DBOS nails durable-wait-with-resumption and
coalescing, but correlation is **always exact** (sender knows the destination id). v3's
right architecture: adopt DBOS's durable substrate (event row + checkpointed deadline +
atomic consume) **underneath** a v3-owned correlation layer that maps fuzzy external
events → an exact `(destination, topic/key)` before they hit the inbox — i.e., v3 must
build the function that computes the `destination_uuid` DBOS assumes the caller already
has.

---

## Slice 5 — Scheduling & child workflows

**Verdict:** DBOS strongly **confirms omnigent's "L4 = full first-class instance"** and
hands v3 a concrete, copyable mechanism: the child is a normal persisted workflow whose
id is **deterministically derived as `parent_id-funcId`**, so idempotent spawn is just
`INSERT … ON CONFLICT (workflow_uuid)` + a parent-side `(parent_id, function_id)`
checkpoint that short-circuits the replay. For **L6**, scheduling is *also* built on
deterministic ids derived from schedule time (`sched-<name>-<ISO8601>`), so
"exactly once per interval" falls out of the *same* unique-id dedup primitive as L4 —
**both are the same mechanism**, the key architectural lesson. **LEARN FROM** both.

### Scheduling (L6) and child workflows (L4) are one primitive

**Scheduling:** a scheduled workflow's receiver loops, computes the next cron match,
sleeps with jitter, then fires with `workflowID = sched-<name>-<date.toISOString()>`
(`scheduler.ts:251-264`). N executors firing the same interval compute the *same* id and
collide on `INSERT … ON CONFLICT (workflow_uuid)` → exactly one row per interval (the
status lookup is "for performance only, not needed for correctness"). **Backfill:**
`lastFiredAt` persisted; on restart, replay every missed slot with its deterministic id —
exactly-once make-up work. **Child spawn:** calling a `@DBOS.workflow` from within a
workflow is detected as a child (`dbos.ts:1800`); the child is a full persisted instance
with `child_id = parent_id + '-' + funcId` (`:1838-1841`), where `funcId` is reserved
synchronously before any await. **Idempotent spawn, two layers:** (1) parent-side
short-circuit — `internalWorkflow` first checks the parent's `(parent_id, function_id)`
checkpoint and returns a handle to the **existing** child on replay
(`dbos-executor.ts:535-542`); (2) DB backstop — both racers compute the same id and
collide on the PK. **Correlation recorded twice:** denormalized `parent_workflow_id` on
the child's status row (powers cancel-cascade + `getDirectChildren`) **and**
`child_workflow_id` in the parent's `operation_outputs` step record (powers replay).

### Parent wait, orphans

The parent waits via `handle.getResult(getResFuncID)` where `getResFuncID` is a **second
funcId reserved alongside the spawn** — so the wait is itself a **durable checkpointed
step**; on recovery the result is replayed from the checkpoint. The wait itself is **DB
polling** (`awaitWorkflowResult` loops `SELECT status … WHERE workflow_uuid`) — the child
delivers by writing its own terminal status row. Children can run detached
(`startWorkflow` without awaiting; null timeout not inherited). **No orphan GC:** cancel
*cascades down* via `parent_workflow_id`, but an un-awaited child keeps running as an
independent durable workflow when the parent finishes.

**v3 verdict — LEARN FROM.** L4: copy the mechanism directly — `child_id =
<parentID>-<stepNumber>` (monotonic counter reserved before any await) makes idempotent
spawn free; correlation recorded **twice** (each serves a different purpose); the wait is
a checkpointed step. **Refine over DBOS:** its wait is poll-based — v3's push-wake design
is better on latency; keep it, but borrow "the wait is a durable checkpoint" so a crash
mid-wait is replay-safe. Decide v3's orphan policy explicitly (DBOS punts). L6: the
single most transferable insight is that **L6 scheduling and L4 spawn are the same
primitive** — both reduce "run exactly once" to "INSERT a workflow row with a
deterministically-derived unique id," so v3 gets exactly-once-per-interval + cross-executor
dedup from a `UNIQUE(workflow_id)` constraint, no leases. (The brute-force 1-second cron
stepping is a perf smell — use algebraic cron; orthogonal to the durability design.)

---

## Slice 6 — Distribution & lifecycle management

**Verdict:** DBOS treats lifecycle operations (cancel/resume/restart/fork) as
first-class, durable, Postgres-native state transitions that **any process can issue** —
no in-memory control plane owns them — which v3 should **LEARN FROM** directly.
Multi-executor coordination uses **zero leader election**: every executor shares one
Postgres, claims work via `SELECT … FOR UPDATE SKIP LOCKED` + conditional `UPDATE …
WHERE status='ENQUEUED'`, and recovery is partitioned by `executor_id` +
`application_version` — far more robust than symphony's single GenServer. The conductor
(a remote SaaS websocket control plane) is **ORTHOGONAL** — a thin forwarder to the same
DB operations, valuable only as an operation-catalog reference.

### Lifecycle ops as durable transitions; distribution without a leader

All four ops are plain SQL on `workflow_status`, idempotent, callable from any process,
guarded by terminal-state (not by a lock). **Cancel** = `UPDATE … status='CANCELLED' …
WHERE status NOT IN ('SUCCESS','ERROR')` (`system_database.ts:1102`); cascade-to-children
is app-level BFS over `parent_workflow_id`. **Resume** = back to `ENQUEUED`, resets
`recovery_attempts`. **Restart** = `fork(id, 0)`. **Fork** (`:1196`) creates a *new* id,
copies identity/input, sets `forked_from`, and for `startStep>0` **copies checkpoints/
events/streams for steps `< startStep`** so the fork replays history and only
re-executes from that step — **restart, retry-from-failure, and edit-and-resume all
collapse into one `forkWorkflow(id, startStep)`**, DBOS's most elegant idea.
**Cancellation is cooperative**, not a thread-kill: `checkIfCanceled` at step boundaries
+ blocking primitives polling `#checkIfCanceledLimited` each interval; terminal writes
never overwrite CANCELLED. **Distribution:** `executor_id` per process; the queue
dequeue race (`SKIP LOCKED` + conditional CAS) is the anti-double-execution mechanism;
**no lease/heartbeat anywhere** — recovery is partitioned by `executor_id` +
`application_version`, each executor recovers its own orphaned PENDING workflows at
startup, and `MAX_RECOVERY_ATTEMPTS_EXCEEDED` bounds the loop. **The DB *is* the control
plane** — no process to fail over; any executor is interchangeable.

### Conductor, client/admin, read-model

The **conductor** (`conductor/conductor.ts`) is an outbound websocket to a SaaS control
plane; its protocol drives the entire operational surface (recover/cancel/resume/restart/
fork/list/export-import/metrics) but **every handler just calls the same `systemDatabase.*`
methods** — no logic, only remote transport + fleet fan-out. **Client** (`client.ts`) and
**admin server** (`adminserver.ts`) are thin wrappers over the same SystemDatabase; the
canonical read-model `WorkflowStatus` (`workflow_management.ts:71`) + `listWorkflowSteps`
(reads `operation_outputs`) is one projection reused across transports.

**v3 verdict.** **Lifecycle — LEARN FROM (strongly):** model cancel/resume/restart as DB
writes guarded by `terminal_disposition`; make **`fork(id, startStep)`** the one
copy-history-then-replay primitive (restart/retry-from-failure/edit-and-resume collapse
into it); adopt cooperative cancellation (poll at step/wait boundaries) + the
`recovery_attempts` cap. Cost: cancellation latency is bounded by the poll interval, no
hard preemption of CPU-bound steps — fine for orchestration, document it. **Distribution
— LEARN FROM (decisively over symphony):** N executors over one Postgres with no
leader/lease/heartbeat — `SKIP LOCKED` + conditional CAS for claims, `executor_id`-
partitioned recovery for orphans; the DB is the control plane, no SPOF. **The one gap v3
must close:** DBOS has **no dead-executor detection** — orphaned PENDING workflows wait
for an *external* recover call; v3 should add a TTL/lease sweep ("reclaim PENDING older
than N with a stale executor_id") so recovery is self-healing. **Conductor — ORTHOGONAL:**
copy the operation catalog (`protocol.ts:5-39` is a ready-made management-API spec),
expose it over whatever transport fits; the SaaS-websocket itself is product scaffolding
v3 doesn't need.

---

## Second-pass deltas — what the independent 10-lens pass adds

The first-pass report already captured DBOS's kernel story. The independent second pass
mostly adds **edge contracts** around that kernel: how context enters it, how operators
touch it, how providers extend it, and which failure modes must be made explicit in v3.

### 1. State machine as database contract, not just runner lifecycle

DBOS's lifecycle is not merely "a runner restarts work"; the database schema itself is
the state-machine contract. `workflow_status` carries status, executor ownership,
application version, recovery attempts, deadline, deduplication id, parent/fork lineage,
serialization, and attributes (`schemas/system_db_schema.ts:3`;
`system_database.ts:185`). `operation_outputs` is the step checkpoint table, while
datasource transactions use a second, datasource-local `transaction_completion` table
(`src/datasource.ts:325`; `packages/nodepg-datasource/index.ts:96-216`).

**v3 delta:** keep the report's `workflow_status + operation_outputs` kernel, but name
the two checkpoint layers separately:

- **System checkpoint:** `operation_outputs` records replayable orchestration steps.
- **Business-transaction checkpoint:** `transaction_completion` is the only place DBOS
  gets true business-write + completion-record atomicity on the same app DB client.

This matters because generic steps are not automatically atomic with their side effects;
v3 should not overclaim exactly-once effects outside a provider that can put the effect
and checkpoint in one transaction.

### 2. Idempotency is four separate contracts, not one slogan

The original study correctly identifies DBOS's unifying primitive. The sharper second
pass finding is that "idempotency" has multiple keys and failure modes:

- whole workflow: `workflow_uuid`;
- step replay: `(workflow_uuid, function_id)` plus `function_name` drift assertion;
- queue dedup: `(queue_name, deduplication_id)` unique partial index;
- message delivery: `message_uuid` with `ON CONFLICT DO NOTHING`
  (`system_database.ts:1891-1957`).

**v3 delta:** specs and tests should name which idempotency layer a change touches. A
single "idempotent" label will hide bugs, especially around queues and message delivery.

### 3. Claim must be coupled to dispatch, or explicitly rolled back/requeued

DBOS's queue SQL is strong, but the tests document a concrete historical failure:
claiming work across partitions and dispatching later can leave an orphan `PENDING`
workflow if a later partition hits lock contention (`tests/wfqueue.test.ts:2527-2537`).
The fix dispatches each partition's claimed workflows immediately after marking them
`PENDING` (`src/wfqueue.ts:569-581`).

**v3 delta:** add a kernel invariant: a command that changes work from available to
claimed must either dispatch in the same local control path, persist a recoverable
handoff record, or revert/requeue before returning. "Claim many, dispatch later" is an
anti-pattern, even if the claim itself is transactional.

### 4. Communication has three primitives, not one event bus

The report already covers `send`/`recv` and `setEvent`/`getEvent`. The second pass adds
the taxonomy v3 should preserve:

- **consumed message inbox:** `notifications(destination_uuid, topic, message_uuid,
  consumed)` for one-shot delivery;
- **last-value event latch:** `workflow_events(workflow_uuid, key)` for durable
  set/get state, with `_history` for fork support;
- **append-only stream:** `streams(workflow_uuid, key, offset)` for workflow-owned
  ordered read-model output (`migrations.ts:177`; `dbos.ts:1619-1657`).

`LISTEN/NOTIFY` is only a wakeup layer; DBOS itself documents the subscribe-then-read
pattern and poll fallback because notifications can be dropped and PgBouncer transaction
pooling breaks assumptions (`system_database.ts:611-637,3951-3971`).

**v3 delta:** do not collapse command messages, event latches, and streams into a vague
"event" primitive. Also, if v3 adopts DB-backed streams, avoid DBOS's simple
`SELECT MAX(offset)+1` offset allocation for high-throughput or multi-writer streams
(`system_database.ts:2311-2326`); use an explicit per-stream sequence/claim primitive.

### 5. Execution context is propagation, not isolation

DBOS uses `AsyncLocalStorage` to propagate workflow id, function id, auth/request data,
deadline and serialization (`context.ts:21-75`). `runWithContext` and wrappers such as
`withNextWorkflowID`, `withAuthedContext`, `withWorkflowQueue`, and `withWorkflowTimeout`
assemble ambient context at entry boundaries (`dbos.ts:1194-1265`).

**v3 delta:** this is a good propagation pattern, but not a sandbox or security boundary.
For Pairflow, every run should materialize an **Execution Context Snapshot** up front:
`run_id`, `task_id`, `definition_id`, allowed/forbidden paths, mode, selected skills,
agent/runtime version, input hash, actor/auth metadata, and normalized attributes. Agent
decisions should not depend on invisible ambient state that is absent from the persisted
run record.

### 6. Definition/run/version separation needs stable IDs, not only names

DBOS separates workflow definition config (`maxRecoveryAttempts`, `name`,
`serialization`, `inputSchema`) from run params (`WorkflowParams`) and durable run state
(`workflow.ts:43-77`; `system_database.ts:185`). It also stamps `application_version`
and recovers only matching versions (`dbos.ts:443`; `dbos-executor.ts:510,1329`;
`system_database.ts:867`). The weak spot: recovery maps persisted `workflowClassName` +
`workflowName` back to an in-memory registry and errors if code moved
(`dbos-executor.ts:1195-1224`).

**v3 delta:** use DBOS's definition/run split, but make the definition reference a
stable ID plus content/schema hash. Names and paths are operator-friendly labels; they
should not be the sole recovery contract for tasks, skills, or agent workflows.

### 7. Admin surface is a useful operation catalog with unsafe defaults

DBOS exposes a broad admin surface: health, recovery, perf, deactivate, conductor,
cancel, resume, restart, fork, list/get workflows, steps, queued workflows and GC
(`adminserver.ts:105-124`). That is exactly the sort of operation catalog v3 needs. But
the local admin server is enabled by default (`config.ts:213-221`), sets
`Access-Control-Allow-Origin: *`, and the control endpoints are not visibly protected by
the same auth gate as application routes (`adminserver.ts:49-68,393-510`).

**v3 delta:** lifecycle commands are privileged operations. v3 should require actor,
policy check, reason, audit record, idempotency key, and redaction defaults for
cancel/resume/restart/fork/deactivate/GC. The CLI/API should default to compact views;
input/output loading must be explicit to avoid leaking or overloading (`manage-workflows.ts:38-105`).

### 8. Observability needs productized telemetry state, not only OTLP emission

DBOS has good introspection: step listing includes output/error/childWorkflowID/timing
(`adminserver.ts:513-529`; `workflow_management.ts:23-50`), workflow listing has rich
filters and attributes containment (`adminserver.ts:532-586`;
`system_database.ts:2718-2897`), and aggregate status/name/queue/executor/app-version
metrics exist (`system_database.ts:2900-2955`). OTLP logs/traces exist, including
legacy-vs-semconv attributes (`telemetry/logs.ts:75-188`;
`telemetry/traces.ts:14-41`; `dbos-executor.ts:173-183`).

**v3 delta:** OTLP compatibility is not enough. Expose exporter health, buffer depth,
drop counts, flush errors, and backpressure policy; DBOS's collector is a simple
interval queue (`telemetry/collector.ts:20-66`; `telemetry/exporters.ts:35-65`).

### 9. Provider seams should be explicit ports, not singleton reads

DBOS's package architecture is a good v3 model: root SDK + `packages/*`, provider peer
dependencies, and published subpath contracts (`package.json:25,33`;
`packages/nodepg-datasource/package.json:22`). The datasource seam is also promising:
`DataSourceTransactionHandler` separates lifecycle and transaction invocation
(`src/datasource.ts:19-49,272`).

The weak spot is coupling direction. Datasource providers read `DBOS.workflowID` and
`DBOS.stepID` (`packages/nodepg-datasource/index.ts:182`); receiver packages call static
`DBOS.registerLifecycleCallback`, `DBOS.getAssociatedInfo`, `DBOS.startWorkflow`, and
`DBOS.logger` (`packages/kafkajs-receive/index.ts:38-86`); HTTP adapters depend on
internal registration shapes (`packages/koa-serve/src/dboshttp.ts:5`;
`packages/koa-serve/src/dboskoa.ts:169-231`).

**v3 delta:** provider packages should receive explicit ports:

- `InvocationContext` / `TransactionInvocation` for datasource calls;
- `ReceiverRuntimePort` for lifecycle, registration lookup, workflow start, logging and
  shutdown;
- stable `OperationDescriptor` DTO instead of exported internal method registration.

Also avoid duplicating durable idempotency policy in every provider: DBOS repeats
`transaction_completion` replay/output/error logic across SQL adapters. v3 should make
that a shared contract utility or core policy, with providers supplying storage and
transaction primitives.

### 10. Provider contract tests are part of the boundary

DBOS has useful E2E provider tests, but many require real external systems (Kafka/SQS)
and skip based on availability (`packages/kafkajs-receive/tests/kafkajs.test.ts:143,204`;
`packages/sqs-receive/tests/sqs.test.ts:64-81`). That proves integration, but not a
stable provider contract.

**v3 delta:** every provider should run a shared contract suite against a core-supplied
fake runtime port, plus targeted E2E tests for the actual service. This is especially
important for L10/federation: boundaries that only fail in live E2E will drift.

---

## Consolidated direction table

| v3 level | DBOS's stance | Verdict | The one thing to take/avoid |
|---|---|---|---|
| **L0a** Transcript | `operation_outputs(workflow_uuid, function_id)` append-only step log = `(instance_id, op_id)`; mutable status row (not event-sourced) | **LEARN FROM (canonical)** | Copy the step table verbatim; decide event-sourcing vs status-row consciously. |
| **L0a** idempotency | PK-uniqueness + `ON CONFLICT … RETURNING` self-no-op; `workflow_uuid` as whole-run key | **LEARN FROM** | One uniform idempotency primitive everywhere (vs paperclip's per-entity). |
| **L0a** concurrency | **No `expected_version`** — value-based `status`-predicate CAS + PK uniqueness | **LEARN, but DECIDE** | Adopt `expected_version` only for true concurrent multi-actor writers; else DBOS is less machinery. |
| **L0d** replay/recovery | Deterministic replay from checkpoints; version-gated; dead-letter cap | **LEARN FROM (the resume model)** | Replay-from-checkpoints beats re-wake/fresh-dispatch. Accept the determinism contract. |
| **L0d** lifecycle ops | cancel/resume/restart/**fork** as durable guarded transitions; cooperative cancel | **LEARN FROM** | `fork(id, startStep)` unifies restart/retry/edit-resume. |
| **L4** child workflows | Full instance; `child_id=parent-funcId` → free idempotent spawn; correlation recorded twice | **LEARN FROM (confirms omnigent)** | The deterministic-child-id mechanism; keep v3's push-wake over DBOS's poll-wait. |
| **L6** scheduling | `sched-<name>-<ISO>` deterministic id → exactly-once-per-interval; backfill | **LEARN FROM** | L6 and L4 are the *same* unique-id primitive — no leases needed. |
| **L6** queues | Queue = status projection (migrated away from a separate table); one-tx dequeue + flow control | **LEARN FROM** | Don't build a separate queue table; `SKIP LOCKED` + CAS + DB dedup. |
| **L8** channels/inbox | `notifications` table = durable inbox; NOTIFY-over-poll transport; **no normalizer** | **LEARN structure, ORTHOGONAL normalization** | Copy the durable inbox + poll-floor transport; build the EventNormalizer yourself. |
| **L9** durable wait | send/recv + setEvent/getEvent; block IS a checkpoint; debouncer coalescing | **LEARN the durable-wait half** | Atomic consume+checkpoint; durable deadline; debouncer as L9-coalescing skeleton. |
| **L9** correlation | **Always exact** (`dest_uuid::topic`) — no fuzzy/external | **BUILD yourself** | v3 must compute the `destination_uuid` DBOS assumes you already have. |
| **distribution** | No leader/lease/heartbeat; Postgres is the control plane; **no dead-executor detection** | **LEARN FROM (over symphony)** | Add a TTL/lease sweep for self-healing orphan recovery. |
| **operator surface** | Rich admin/read-model API, but local admin defaults are broad and CORS-open | **LEARN catalog, AVOID defaults** | Privileged lifecycle commands need auth, audit, reason, redaction, and safer CLI defaults. |
| **context/modeling** | ALS context + definition/run/version split + queryable attributes | **LEARN, REFINE** | Persist an execution-context snapshot and stable definition IDs/hashes. |
| **provider seams** | Good provider packages, but adapters read singleton state / static DBOS APIs | **LEARN shape, REWORK coupling** | Use explicit runtime ports, operation descriptors, and shared provider contract tests. |
| L0c / L0e / L7 / L11 / L14 | Absent (DBOS is a kernel, not a control plane) | **ORTHOGONAL** | Source agent/runtime/credential/registry/org layers from paperclip/omnigent. |

## Three reconsiderations DBOS forces

1. **v3's two hardest design choices are real forks, and DBOS takes the "less" side of
   both.** DBOS ships correct durable execution with **neither full event-sourcing nor an
   `expected_version` column** — an immutable step log keyed by `(wf, fn)` + PK uniqueness
   + value-based status guards is enough. v3 should be able to name *exactly* what it buys
   by adding event-sourcing (multi-actor `EventEnvelope` attribution, audit/time-travel)
   and `expected_version` (sequence-based CAS for concurrent same-aggregate writers) over
   DBOS's simpler model. If v3 can't point to a concrete need DBOS's model can't meet,
   adopt DBOS's model and save the machinery. This is the single most important takeaway
   for the kernel.

2. **The unifying primitive is the prize.** Across L0a/L4/L6/queues/recovery, DBOS uses
   *one* idea — "deterministically-derived unique id + `INSERT ON CONFLICT` + memoized
   replay." Scheduling, child spawn, idempotency, exactly-once, queue dedup, and crash
   recovery are all the same mechanism. Paperclip re-implemented idempotency per entity
   and paid in bespoke-CAS sprawl; DBOS pays once. v3 should architect its kernel around
   this single primitive and derive the higher levels from it, rather than treating them
   as separate subsystems.

3. **DBOS is the kernel; it is NOT the control plane — and that's the cleanest possible
   confirmation of v3's level split.** DBOS has L0a/L0d/L4/L6/L9-durable-wait and *nothing*
   above: no agent adapter, no runtime/sandbox, no credentials, no channels-normalizer, no
   org model. The prior three studies had the control-plane layers but a weaker (or absent)
   kernel. The synthesis writes itself: **v3 = DBOS's kernel discipline (this study) +
   paperclip's control-plane mechanics (adapters, governance, secrets, gatekeeper) + the
   fuzzy-correlation and multi-actor-envelope layers none of them built.** DBOS is the
   floor to build v3's L0a on; everything above is sourced or invented.

## Caveats

- DBOS's core is small and was read thoroughly, but `system_database.ts` (~4000 lines)
  was read selectively around the kernel paths; load-bearing claims (no `expected_version`,
  exact-only correlation, queue-as-status-projection, deterministic child id) were verified
  by targeted grep + the consolidation migration.
- Citations are relative to the DBOS repo root at HEAD `a9ba1dd` (2026-06-16).
- DBOS is a durable-execution *library*, not an agent platform — its lessons are about the
  kernel mechanics, not about how to run agents; the agent/LLM-specific concerns map onto
  DBOS only by analogy ("an LLM call is a memoized step; the agent loop is a replayable
  workflow").
- This is a *learning* study, not a recommendation to adopt DBOS as a dependency — though
  of the four projects studied, DBOS is the one whose *model* v3's L0a should follow most
  closely.
