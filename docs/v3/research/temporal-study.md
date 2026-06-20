# Temporal Study — The Heavy Reference That Points Toward the Light Path

Date: 2026-06-20

## Purpose

This note captures what Pairflow v3 can learn from **Temporal**
(`temporalio/temporal`), the mature, canonical **durable-execution platform** — the
"heavy" end of the spectrum whose entire job is exactly v3's kernel (L0a), plus durable
timers (L6), task dispatch (L8/L9), child workflows & signals/updates (L4/L9/L3), and a
brand-new general-purpose state-machine framework (CHASM) that is the closest existing
analogue to what v3 is trying to build.

Temporal is large and battle-tested — ~410K LOC of Go (excluding tests/generated), with
the durable-execution engine concentrated in `service/history/` (~100K LOC). It is the
direct counterweight to the prior **DBOS** study (the "light" reference): DBOS achieves
exactly-once on plain Postgres with *no event log, no expected_version, and no leader*;
Temporal achieves it with *full event-sourcing, two-level optimistic concurrency, and a
leader-per-shard lease*. v3's three sharpest kernel questions — **do we need
event-sourcing? do we need expected_version? do we need a leader?** — are precisely the
axes on which these two diverge. This study exists to weigh Temporal's machinery against
DBOS's so v3 can choose deliberately.

The single most important thing this study surfaces: **Temporal's own evolution points
away from its heaviest mechanism.** Its new CHASM framework is *commit-based, not
replay-based*, and its own non-determinism carve-out (anything non-deterministic must be
a recorded Activity, never replayed) is exactly the design v3 needs because v3's actors
are LLMs — the textbook violators of replay determinism.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/temporal` (analyzed at HEAD `cf28c44`, pushed 2026-06-20)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)
- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself

Eighth in a series. Read alongside:

- [`omnigent-study.md`](omnigent-study.md) — meta-harness; "L4 child = full instance"; weak kernel.
- [`symphony-study.md`](symphony-study.md) — OTP orchestrator; skipped L0a; unaudited human gate.
- [`paperclip-study.md`](paperclip-study.md) — durable Postgres kernel; `FOR UPDATE`+CAS; credential broker; audited decisions.
- [`dbos-study.md`](dbos-study.md) — **the light reference**: exactly-once with no event log, no expected_version, no leader.
- [`hermes-agent-study.md`](hermes-agent-study.md) — channel/memory/skills reference; flat-Markdown memory; forked-reviewer L12.
- [`vibe-kanban-study.md`](vibe-kanban-study.md) — human-review board; `MsgStore` observe-seam; git-anchored checkpoints; **left the L4 fan-in gap open**.
- [`honcho-study.md`](honcho-study.md) — perspectival memory engine (L11/L12 reference); immutable `ModelConfig` (L0c); the four-project idempotency hole.

> Method: original seven parallel sub-agent analyses, each mapping one slice onto specific
> v3 levels, with `file:line` citations, followed by a later ten-lens source-only
> second-pass audit before re-reading this report. Temporal ships excellent architecture
> docs (`docs/architecture/*.md`) which the original agents read first as authoritative,
> then verified against the code (`service/history/{workflow,shard,queues,api}`,
> `service/matching/`, `chasm/`). The second pass intentionally emphasized edges the
> first pass was likely to compress: raw persistence contracts, lifecycle/recovery,
> ownership fencing, adapter boundaries, policy/security, dispatch/fan-out,
> history/visibility/replication streams, memory/context, operator UX, and modular seams.

## Executive Summary

Five load-bearing findings.

> **1. Temporal answers v3's three kernel questions — and the answers favor the LIGHT
> path.** *Event-sourcing?* Temporal's history events are the source of truth, but even
> Temporal does NOT replay-from-events on the hot path — a cache miss reloads the
> materialized `MutableState` row directly (`workflow/context.go:148-178`); replay is a
> cold path for reset/conflict/replication only. *expected_version?* Yes — `DBRecordVersion`,
> a per-workflow generation counter checked under a row lock — but this is **orthogonal**
> to event-sourcing (you can have one without the other). *A leader?* Temporal is leaderful
> (a `rangeID` lease per shard); DBOS is leaderless. **The recommendation that falls out:
> v3 should take DBOS's lighter storage (materialized aggregate + an `(instance_id, op_id)`
> idempotency ledger, no canonical event log) + a per-instance `expected_version` (the one
> piece of Temporal's heavy machinery that earns its keep when a transition mutates many
> correlated fields) + leaderless ownership (with Temporal's fencing-token trick reserved
> for multi-step worker leases).**

> **2. The determinism bombshell — v3's agents CANNOT use a replay model, and Temporal
> already tells you what to do instead.** Temporal's replay contract requires the workflow
> function to produce byte-identical decisions when re-run against the same history. An LLM
> is the textbook violator (temperature, drift, tokenization, tool-ordering). Temporal's own
> carve-out: **anything non-deterministic must be an Activity — run once, its result recorded
> into history, and on replay the recorded result is handed back, the code never re-runs.**
> The load-bearing translation for v3: **an LLM call is an Activity, not the workflow body.**
> The deterministic skeleton is the orchestration (which agent runs, in what order, with what
> inputs, retry/timeout policy); the LLM/tool calls are *recorded side-effects*. Corollary: v3
> should prefer **state-snapshotting over replay** precisely because the recompute isn't
> reproducible. The kernel must never try to *detect* actor non-determinism (Temporal proves
> the server can't — it doesn't run the code; the SDK self-reports).

> **3. CHASM is the closest existing thing to v3's kernel — and it is COMMIT-based, not
> replay-based.** Temporal generalized its workflow engine into CHASM (Coordinated
> Heterogeneous Application State Machines): "a kernel for arbitrary durable, replicated,
> transactionally-consistent application state machines" where Workflow is just one component
> among many. Its primitives map almost 1:1 onto v3's L0a: Execution=instance, Node-tree=
> structured state, `Transition`→`CloseTransaction`→one node-diff write = atomic
> transition-commit, `VersionedTransition`=logical clock, two task flavors (pure in-lock /
> side-effect post-commit) with a `Validate` gate = transactional outbox + dedup,
> `ComponentRef`=self-validating return address, Library/Registry = higher constructs as
> state machines. Crucially, **CHASM durability comes from the atomic node-diff commit +
> VersionedTransition, NOT from re-execution** — Temporal itself is moving from replay toward
> the commit-based model that finding #2 says v3 must use. This is the single most important
> slice: the proof that a commit-based kernel for arbitrary durable state machines is viable
> and is where the canonical engine is heading.

> **4. The L4 fan-in gap (left open by vibe-kanban) is solved here — by a single correlation
> primitive.** Signals, updates, child-completions all correlate to a running instance via a
> monotonic per-instance event-id slot. For child workflows: the parent allocates an
> `InitiatedEventId` slot at spawn, the child carries `ParentInitiatedId` end-to-end, and on
> close the parent looks up that exact slot and **rejects any completion whose id it didn't
> issue** (`recordchildworkflowcompleted/api.go:115`) — the correlation key IS also the
> authorization check. This is the fan-in primitive v3 needs.

> **5. Two more directly-stealable primitives: sticky actor-affinity and look-ahead timers.**
> Sticky task queues are a near-perfect actor-routing primitive — the engine stamps the
> address of the *next* unit of work onto state, the broker *refuses to cold-load* the affinity
> queue (so it provably means "that specific live runtime"), and a bounded timeout cleanly
> falls back to the shared queue with no penalty; **affinity is a hint, never a binding** —
> losing the cached actor costs one replay, never correctness. Durable timers use look-ahead +
> a single gate deadline (a 30-day sleep is one row + one deadline, no ticker) — strictly better
> than honcho's polled ticker, and exactly-once is achieved by **idempotent re-execution** (the
> task is a pointer; the handler re-reads live state and drops if stale via a `Stamp` guard),
> not exactly-once delivery.

Kernel-spectrum placement (now eight projects), on the storage/concurrency axis:

```
symphony ── hermes ── vibe-kanban ── honcho ── paperclip ── DBOS ·········· TEMPORAL
   (no L0a)        (queue, no idempotency)      (FOR UPDATE+CAS)  (light)      (heavy: event-sourced + leader + 2-level OCC)
```

Temporal sits at the far heavy end — but the arrow of its own evolution (CHASM, commit-based)
points back toward the light/DBOS region, which is where v3 should live.

The synthesis line for the series so far:

> **v3 = a commit-based (not replay-based), leaderless kernel: DBOS's storage discipline
> (materialized aggregate + an `(instance_id, op_id)` idempotency ledger) + a per-instance
> `expected_version` + Temporal's commit/outbox discipline, fencing token, fan-in correlation,
> sticky actor-affinity, look-ahead durable timers, and validate-before-mutate gate + CHASM's
> component-registry generalization + paperclip's credential broker & audit ledger + Hermes/
> vibe-kanban/honcho's outer-layer breadth (channels, observe-seam, perspectival memory) —
> with LLM calls modeled as recorded Activities, never replayed.**

---

## Second-Pass Audit Deltas

The second-pass audit did not overturn the report's main recommendation. It sharpened the
boundary between Temporal mechanisms v3 should copy and mechanisms v3 should only treat as
scale-specific cautionary tales.

1. **Current-execution identity is a separate mutable pointer, not just "the workflow row."**
   Temporal splits append-only history nodes, derived mutable state, and the current-execution
   pointer. The persistence contract has explicit current-workflow write modes
   (brand-new, update-current, bypass, ignore-current) so run identity, run state, and the
   namespace/workflow "current run" pointer can move independently. For v3 this is the missing
   precision behind "instance identity": if retries/forks/reruns ever exist, the durable state
   row and the user-facing current pointer must be separate concepts.

2. **MutableState has an explicit state/status validator and transition-history guard.** The
   first report correctly describes MutableState as a materialized view, but the second pass
   found two finer recovery tools: Temporal validates workflow state/status combinations
   (`CREATED`/`RUNNING`/`COMPLETED`/`ZOMBIE` plus close status), and stores compact transition
   history/version metadata used to reject stale tasks. v3 should not rely only on an
   `expected_version`; lifecycle state should have its own legal-transition contract, and
   background tasks should carry enough causal stamp to prove they still target the right state.

3. **Recovery treats uncertain commits as a first-class outcome.** Temporal has paths where a
   persistence call may have succeeded even though the caller cannot prove it
   (`OperationPossiblySucceeded`), and recovery/rebuild tooling assumes "retry blindly" can be
   wrong. Pairflow's command-local persistence should model this outcome explicitly: after a
   process crash, reconnect, or ambiguous filesystem/git boundary, the next step should
   reconcile durable facts before issuing a second side effect.

4. **The real ownership boundary is the persistence write, not membership or an assert call.**
   The first report already recommends stealing the fencing token without leaderful sharding.
   The correction is sharper: SQL `AssertShardOwnership` can be effectively a no-op; the true
   fence is the `rangeID` check composed into the write transaction. If v3 adds worker leases,
   the lease check must be inline with the state mutation, never a separate "still owner?"
   preflight.

5. **Matching has its own lease and partition policy separate from history ownership.** Beyond
   sticky queues and sync-match, Temporal's task queue manager uses its own range-ID lease,
   renews task-ID blocks, and separates write partition selection from read partition selection
   (writes distributed among partitions; reads biased by outstanding poller load). v3 likely
   does not need the partitioning, but it should keep the conceptual split: instance ownership,
   dispatch-queue ownership, and actor affinity are three different axes.

6. **Scheduling/fan-out is a three-record pattern: domain event, pending mutable-state record,
   dispatch task.** The child-workflow section captured initiated-event fan-in, but the second
   pass made the broader shape clearer. Activity schedules, child starts, external signals, and
   retries all separate (a) the durable domain fact, (b) a pending record keyed by event id /
   request id, and (c) a transfer/timer task that merely drives delivery. This is the clean v3
   primitive for any "do this later and correlate the result" feature.

7. **Timers materialize the next actionable deadline, not every conceptual timer edge.** The
   L6 section already recommends look-ahead timers. The second pass adds that Temporal's
   activity/user-timer machinery uses flags/status bits to avoid duplicate timer tasks and often
   materializes only the earliest next timer for a family of deadlines. For v3, "one durable row
   per conceptual waiting condition" may already be too much; store intent in state, emit only
   the next necessary wake-up.

8. **History observation is paginated fetch plus long-poll notification, not a durable event
   stream.** Temporal's history notifier is in-memory pub/sub carrying "something changed"
   metadata (workflow key, next event id, status/version history), while the actual events are
   read from history pages. Visibility/search is a separate query/index surface updated by
   durable visibility tasks. v3 should keep observe-streams honest: use wake notifications as
   latency hints, but make the durable read model page/replay from committed state or transcript.

9. **Visibility/search is a transactional-outbox projection with ordering hazards of its own.**
   Temporal creates start/upsert/close visibility tasks from workflow transactions, collapses
   redundant visibility tasks before commit, releases the mutable-state lock before calling the
   visibility manager, and protects close-before-delete ordering so a late close cannot resurrect
   a deleted visibility row. If v3 adds searchable run indexes, they should be treated as
   projections with their own task queue, not inline writes sprinkled through lifecycle code.

10. **Memory/context has three distinct durability classes.** Workflow history is durable truth;
    memo/search attributes are queryable projections; query registries, update registries, and
    request metadata are runtime/in-flight context. Temporal also makes completed update outcomes
    history-backed while live update polling remains registry-backed. For v3 this is a useful
    vocabulary: do not put transient agent session state, query waiters, and durable transcript
    facts into the same "context" bucket.

11. **Authorization is more structured than a namespace check.** Temporal's authorization seam
    passes an explicit `CallTarget` containing API name, namespace, Nexus endpoint, and request;
    JWT claims map system and namespace roles; task-token namespace enforcement prevents request
    body namespace from overriding token-derived namespace; cross-namespace workflow operations
    get a second target-namespace authorization check; bearer auth for remote clusters requires
    TLS. v3's approval/authority model should preserve that shape: action, target resource,
    caller claims, and transport trust are separate inputs to the decision.

12. **Operator UX is a separate product surface.** Temporal's `tdbg` groups debug/admin commands
    by object (`execution`, `shard`, `history-host`, `taskqueue`, `membership`, `dlq`, `schedule`,
    `decode`), has raw history export/import with payload decode, compares cache mutable state to
    database mutable state, gates shard task listing, and makes DLQ read/purge/merge bounded or
    prompt-confirmed, with v2 async job tokens for long operations. Pairflow should not bury
    destructive lifecycle/debug actions inside normal user flows; it needs an operator surface
    with bounded commands, progress tokens, and explicit cache-vs-durable diagnostics.

13. **Generated/contract-first boundaries are a real complexity reducer, but need drift gates.**
    Temporal uses proto-owned internal service contracts and generated history client wrappers to
    absorb repetitive routing/metrics/retry glue. The second pass also found replay-history tests
    used as backwards-compatibility contracts for scheduler/worker-deployment logic. If v3 adopts
    generated boundaries for lifecycle/runtime APIs, the matching requirement is CI drift checks
    plus replay/fixture tests for state-machine migrations.

14. **The modularity warning is broader than the 10K-LOC MutableState monolith.** Temporal has
    good extension seams (worker component registration via small interfaces and DI groups,
    HSM/CHASM registries, layered persistence factories), but also a large `admin_handler`
    hotspot that imports many domain and infrastructure concepts. For Pairflow, the caution is
    direct: lifecycle coordinators and CLI handlers must not become the place where state store,
    transition policy, transcript ordering, worker routing, validation, and operator repair all
    meet without a typed boundary.

---

## L0a — Event-Sourced History, MutableState & Atomic Commit

**3-sentence verdict.** Temporal is **full event-sourcing with a materialized projection
cache**: the linear sequence of immutable history events is the canonical source of truth
(it alone recovers everything — `history-service.md:113-124`), while `MutableState` is a
*persisted, materialized view* of that log. Each state transition is an "atomically append
events + transition the projection + enqueue side-effect tasks" operation, guarded by
**per-workflow optimistic concurrency** (`DBRecordVersion`, a generation counter on the
`executions` row) — the polar opposite of DBOS (exactly-once with one `operation_outputs`
table, PK-uniqueness + status-CAS, no version counter, no event log). Crucially, **Temporal
does NOT replay-from-events on the hot path**: a cache miss reloads the materialized
MutableState row directly (`context.go:148-178`); replay is reserved for reset, conflict
resolution, and cross-cluster replication.

### History-as-truth + MutableState-as-view + the atomic commit

History events are append-only and authoritative; MutableState is the persisted summary view
(for Cassandra, a single `executions` row, `MutableStateImpl` is ~10K LOC at
`workflow/mutable_state_impl.go`). Every transition is built **in-memory first** (create
events; update MutableState; create tasks), then committed via `CloseTransactionAsMutation`
(`context.go:582`) → `NewTransaction(shard).UpdateWorkflowExecution` (`context.go:641-654`).
In the SQL store (`persistence/sql/execution.go:339-358`): **history events are appended
first**, then the MutableState mutation + the generated transfer/timer/visibility tasks are
written **inside one shard-locked DB transaction**. The atomic unit is **{MutableState row +
sub-entity rows + side-effect tasks} in one transaction** — a transactional outbox (the tasks
enqueued in the same tx drive Matching). MutableState records "the latest history event
reflected in the view," so a half-written event is invisible until the MutableState commit
succeeds (`history-service.md:320-322`).

### Optimistic concurrency (DBRecordVersion) vs DBOS's status-CAS

`DBRecordVersion` is a per-`executions`-row monotonic counter, bumped on every close-transaction
(`mutable_state_impl.go:7764-7768`) and enforced under `SELECT … FOR UPDATE` in
`lockAndCheckExecution` (`persistence/sql/execution_util.go:629-665`: asserts
`version == dbRecordVersion-1`; mismatch → `WorkflowConditionFailedError` → context cleared,
reload, retry). **Contrast DBOS:** no row-version counter — it keys each step result by
`(workflow_uuid, function_id)` and relies on PK-uniqueness + a value-based status-CAS. DBOS's
check is content-addressed and lock-free at the *step* grain; Temporal's is version-addressed
and row-locked at the *whole-workflow* grain. Temporal needs the version because a single
transition mutates dozens of correlated sub-structures (activities, timers, children, tasks)
that must move together — there's no per-operation idempotency key the way DBOS keys each call.

### Buffered events + replay/rebuild

**Buffered events** exist because a worker holding a workflow task is replaying deterministic
history and must not see new external events injected mid-task (it would diverge event-ID
numbering). Events arriving during an in-flight workflow task (signals, completions, timer-fires)
are parked with `BufferedEventID` (`historybuilder/event_store.go:94-102`) and flushed —
reordered, then allocated real sequential IDs, then scheduled→started references wired up — on
`WorkflowTaskCompleted` (`event_store.go:166-204`). **Replay/rebuild** has two paths: the hot
path is NOT a replay (loads the materialized row); replay-from-events
(`ndc/state_rebuilder.go:103-150`, paginates full history + `ApplyEvents`) is the cold path for
reset/conflict/replication — the literal proof that MutableState is a function of the log, but
exercised only when the view is untrusted.

### LEARN / AVOID / ORTHOGONAL (L0a event-sourcing)

**LEARN**
- **The atomic-transition-commit invariant** — append-events + transition-state + enqueue-tasks
  must land in one transaction (`context.go:582-654`, `sql/execution.go:351-357`). This is v3's
  L0a core *regardless* of storage style.
- **The transactional outbox for side effects** — tasks enqueued in the same tx as the state
  change, drained by a processor (`history-service.md:322`).
- **"The materialized view records the high-water-mark of the log it reflects; reload on commit
  failure"** (`history-service.md:320-322`) — clean, cheap consistency rule v3's Transcript needs
  *even without* full event-sourcing.

**AVOID**
- **Full event-sourcing as the source of truth.** Temporal itself avoids replay-from-events on the
  hot path. For a kernel at v3's scale, DBOS's "the materialized row IS the truth, the log is an
  idempotency ledger" is dramatically cheaper and loses little.
- **Buffered events + dense event-ID wiring + reorder logic** — exists only because Temporal needs
  deterministic worker replay with contiguous integer IDs. v3 with content-addressed `(instance_id,
  op_id)` correlation does not need dense IDs and should not inherit buffering.
- The **10K-LOC `MutableStateImpl` monolith** — a consequence of cramming the whole aggregate into
  one row.

**ORTHOGONAL** — **`expected_version` is orthogonal to event-sourcing.** You can have optimistic
concurrency *without* an event log (and DBOS shows exactly-once *without* `expected_version`). v3's
sweet spot, which Temporal's own hot path hints at: **a materialized aggregate guarded by a
per-instance version, with the log demoted to an idempotency/audit ledger keyed `(instance_id,
op_id)` à la DBOS.** Reset/NDC replication/branching history are Temporal-specific features out of
v3 scope.

---

## L0a — Sharding, Ownership & the rangeID Lease

**3-sentence verdict.** Temporal is fundamentally **leaderful**: the history service is statically
partitioned into a fixed number of **shards**, and at any instant exactly one host owns each shard,
established by a monotonically-increasing **`rangeID` lease** (a fencing token) in the shard's
persistence row. Ownership is *hinted* by a consistent-hash membership ring but **authoritatively
enforced in the database**: every workflow write rides in the same conditional transaction as an
`IF range_id = ?` check, so a stale owner whose `rangeID` was bumped by a successor has *all* its
in-flight writes rejected with `ShardOwnershipLost`. This is the polar opposite of DBOS's leaderless
`SKIP LOCKED` + status-CAS — Temporal pays a lease handshake, a shard-reload on failover, and
partition-granularity blast radius for the benefits of in-memory authoritative caches and gap-free
in-memory ID allocation.

### The mechanism

Shard count is fixed at cluster creation and immutable (`cluster_metadata_store.go:207`). A workflow
maps to a shard by a pure hash (`common/util.go:391` `WorkflowIDToHistoryShard`); a shard maps to an
owner host via the ring (`shard/ownership.go:135`). The lease: acquiring a shard **increments
`rangeID`** conditioned on the previous value (`shard/context_impl.go:1155-1176` `renewRangeLocked`),
fenced in persistence (`sql/shard.go:137-142` / Cassandra LWT `IF range_id = ?`). **Two-level
optimistic concurrency:** every workflow write must satisfy *both* the shard `rangeID` AND the
per-workflow `DBRecordVersion`, atomically — Cassandra appends a `templateUpdateLeaseQuery` to the
same LWT batch (`mutable_state_store.go:701-715`); SQL wraps the mutation in `txExecuteShardLocked`
that read-locks the shard then checks the row version (`execution.go:40-58`). A zombie owner fails
condition 1; a lost race fails condition 2.

**The payoff that justifies the lease:** because the shard is the single writer, it allocates a block
of ~1M task IDs per `rangeID` (`RangeSizeBits=20`) and hands them out **from memory with no per-ID DB
round-trip** (`task_key_generator.go:151-154`) — gap-free monotonic IDs a leaderless model cannot do
cheaply. Crash recovery is split-brain-safe because the fence is *inline in every write*, not a
separate probe (`AssertShardOwnership` is deliberately a no-op): two hosts cannot both hold the latest
`rangeID` (the increment is a linearizable CAS), so at worst the ring being wrong causes unavailability,
never two writers.

### LEARN / AVOID / ORTHOGONAL (L0a ownership)

**Recommendation up front: v3 should go leaderless (DBOS-style), not leaderful — but steal the fencing
token.**

**LEARN**
- **The fencing-token pattern** (increment a generation number on ownership acquisition, check it on
  every write). Even a leaderless v3 wants this *if* it ever hands a single worker a multi-step lease
  that must survive that worker going zombie — DBOS's pure status-CAS does not fence a slow worker that
  wakes up mid-step.
- **Fence inline in the write, not as a separate "assert ownership" probe** — eliminates the TOCTOU gap.
- **Two-level conditional write composed atomically** (infrastructure-level rangeID × record-level
  version in one statement) — v3 could stack `(workflow_epoch, step_version)` the same way.
- **Block-allocated monotonic IDs** — only safe under a single-writer guarantee.

**AVOID**
- **Static immutable shard count** — choosing the partition count forever is a serious operational
  constraint; DBOS has no partition count to pick.
- **Shard reload on failover** — a whole partition's workflows are briefly unavailable on owner change;
  DBOS picks up crashed workflows individually via `SKIP LOCKED`, no per-partition warm-up.
- **Partition-granularity ownership** — one wedged owner stalls every workflow in its shard; per-workflow
  contention (DBOS) is better for a commodity-Postgres kernel.
- **The Ringpop membership machinery** — substantial infrastructure that only earns its keep with
  leaderful sharding.

**ORTHOGONAL** — the transactional outbox (wanted regardless of leadership); event-sourcing (a separate
axis); the specific CAS backend (Cassandra LWT vs SQL `FOR SHARE` — both honor the same contract).

---

## L6 — Durable Timers & the Task-Queue Processing Model

**3-sentence verdict.** Temporal's durable-task engine is a **per-shard, per-category set of persisted
task queues** where every side-effect (dispatch a workflow task, start an activity, fire a timer, run
visibility) is a row written **in the same DB transaction as the MutableState mutation that produced
it**, then processed asynchronously. Each category is processed by either an **immediate (id-ordered)**
or a **scheduled (time-ordered)** queue on a shared `queueBase`: a reader pages tasks out in key order,
wraps each in an `Executable`, submits to a worker pool, and re-arms on failure with backoff — never
blocking the worker. Exactly-once is achieved not by dedup but by **idempotent re-execution**: the task
carries only a pointer (workflow key + event id + `Stamp`/`Attempt`/`Version`), the executor re-reads
live MutableState, drops the task if stale, and the queue only advances its **exclusive ack-level
watermark** (deleting the row) after the executable reports `Acked`.

### The mechanism

Seven persisted categories (`tasks/category.go:18-44`): transfer (immediate), timer (scheduled),
replication, visibility, archival, memory-timer (in-memory, never persisted), outbound. The
immediate/time-ordered split lives entirely in the task **key** `(FireTime, TaskID)` (`tasks/key.go`):
immediate tasks pin `FireTime=epoch` (→ monotonic id-order); timers use real `FireTime` (→ time-order,
TaskID a tiebreaker). The crucial timer mechanism: **look-ahead + gate, not a ticker** — the scheduled
queue loads *one* row past the horizon (`BatchSize:1`, `queue_scheduled.go:227-278`) and arms a
`timer.Gate` at that task's `FireTime`, so a 30-day sleep costs one row + one deadline, with no per-timer
goroutine. The shared `queueBase` tracks an `exclusiveReaderHighWatermark` (loaded) and an
`exclusiveDeletionHighWatermark` (the ack-level), with the crash-safety invariant **delete-then-advance**
(`queue_base.go:332-349`): range-delete the acked tasks first, persist the new watermark second.
**Exactly-once = idempotent re-execution:** the activity-retry executor (`timer_queue_active_task_executor.go:525-624`)
reloads MutableState and drops the task if `task.Stamp != activityInfo.Stamp` or the attempt already
advanced. **Retry-with-backoff is a durable timer:** `RetryActivity` computes the next delay, persists
`now + backoff` into MutableState, and emits an `ActivityRetryTimerTask` whose fire-time IS that deadline
(`mutable_state_impl.go:6829-6847`) — the schedule survives crashes for free.

### LEARN / AVOID / ORTHOGONAL (L6)

**LEARN**
- **One composite key `(FireTime, TaskID)` unifies both queue shapes** — one durable `task` table;
  immediate = epoch-FireTime (id-order), timer = real FireTime (time-order).
- **Look-ahead + gate for time-ordered timers** — one row + one deadline, no ticker. Strictly better than
  honcho's polled ticker; the durable analog of DBOS's deadline-checkpoint.
- **Exactly-once via idempotent re-execution, not exactly-once delivery** — the task is a pointer; the
  handler re-reads live state and drops if stale via a `Stamp`-like guard. The single most portable idea —
  removes the need for a distributed dedup store.
- **Persist-then-notify; notify is best-effort** — the in-memory wake is a latency hint over a durable
  table; polling/look-ahead is the backstop. v3 should treat its event bus this way.
- **Delete-then-advance-watermark** crash-safety; **backoff as a durable timer row**; **two retry layers**
  (infra-level queue Nack→rescheduler→DLQ vs business-level activity retry materialized as a timer); a **DLQ**
  for poison tasks.

**AVOID**
- **The full 7-category × per-shard-processor split** — over-engineered for a kernel (exists for multi-cluster
  replication, separate visibility, archival, Nexus). v3 needs only two: immediate + timer.
- **The slice/reader/mitigator/reader-group load-shedding machinery** — enormous complexity for thousands of
  shards; a low-shard-count v3 uses a plain "read batch in [ack, readLevel) order by key" loop.

**ORTHOGONAL** — active/standby executor duplication + `CheckTaskVersion` (multi-cluster only); the in-memory
queue / speculative tasks (a niche zero-write optimization); Nexus circuit-breaker grouping.

> **Net cut for v3:** one durable `task(fire_time, task_id, …)` table; two logical queues by whether
> `fire_time` is now (immediate) or future (timer); look-ahead+gate for timers; an exclusive ack-level
> advanced delete-first; idempotent handlers that re-read live state and drop stale tasks via a `Stamp`
> guard; retries materialized as timer rows; a DLQ. Everything else is scale-driven and deferrable.

---

## L8/L9/L0c — Matching: Task Dispatch & Sticky Actor Affinity

**3-sentence verdict.** Temporal's matching service is a **distributed in-memory rendezvous broker**: it
matches task producers against worker long-polls over an unbuffered Go channel, using persistence only as
an overflow/durability backstop when no consumer is immediately present. The central optimization is
**sync-match** — if a poller is already blocked waiting, the task is handed off directly through the channel
and *never written to the matching DB*; persistence happens only on the async (`SpoolTask`) path. Sticky
task queues layer **actor affinity** on top: a per-worker single-partition queue routes a workflow's
follow-up tasks back to the exact worker that already holds the workflow's MutableState cache, with a short
timeout that cleanly falls back to the shared normal queue when that worker is gone.

### The mechanism

The rendezvous is an unbuffered channel `taskC chan *internalTask` (`matching/matcher.go:27`); a producer
and consumer "meet" only if both are present. `Offer` does a non-blocking send: success = sync-match (no DB
write); `default` = return "not matched" so the caller spools it. The whole sync-vs-async decision is one
seam (`task_queue_partition_manager.go:611` `TrySyncMatch` returns *before* `:653` `SpoolTask`). **The
durability seam:** matching is never the system of record — history has already committed a durable transfer
task; a sync-matched task the worker then drops is recovered by history's schedule-to-start timeout. So
sync-match's "skip the write" is a *latency* optimization, safe because **a durable upstream owns retry**.

**Sticky = actor affinity, beautifully decomposed into three parts:** (a) the engine stamps the *next* unit
of work with a per-actor address — `MutableStateImpl.CurrentTaskQueue` returns `KIND_STICKY` with the sticky
name (`mutable_state_impl.go:1425`); (b) the broker *refuses to cold-load* the affinity queue — if no worker
is polling it, `AddWorkflowTask` returns `StickyWorkerUnavailable` (`matching_engine.go:598`), so a sticky
queue provably means "that specific live runtime"; (c) a bounded fallback — on timeout,
`failWorkflowTask` calls `ClearStickyTaskQueue()` *without* incrementing the attempt count
(`workflow_task_state_machine.go:1020-1031`), and the next schedule returns `KIND_NORMAL` so any worker picks
it up and reconstructs state by replay. **Affinity is a hint, never a binding** — losing the cached actor
costs one replay, never correctness.

### LEARN / AVOID / ORTHOGONAL (L8/L9/L0c)

**LEARN**
- **The unbuffered-channel rendezvous as the dispatch primitive** — "task meets a waiting actor-poll → hand
  off in memory; else durably enqueue" is the whole dispatcher, a tiny auditable core.
- **Sync-match-skips-persistence as a first-class latency seam, made safe by a durable upstream** — the hot
  path (actor live and waiting) avoids the journal write; correctness comes from the engine owning a
  schedule-to-start timer + retry, not from the dispatcher being durable.
- **Sticky affinity as a clean, decomposable actor-routing primitive** — adopt all three parts:
  engine-stamped address-of-next-work, broker no-cold-load semantics, and bounded timeout→shared-queue
  fallback. This is exactly v3's "route work to a specific actor/runtime, degrade to any runtime if it's
  gone." And keep affinity reconstructible from the journal so its loss is always recoverable.

**AVOID**
- **The two parallel matcher implementations** (mid-migration cruft) — pick one matcher with a pluggable
  policy.
- **Hand-rolled prioritized `select` copy-pasted across blocks** — abstract it once.
- **Stringly-typed `/_sys/<name>/<id>` routing-key mangling** — use structured routing keys.

**ORTHOGONAL** — Build-ID/versioning routing; fairness/priority policy; Nexus task dispatch; forwarding-tree
rate-limiting (all scale/policy concerns, not the core rendezvous).

---

## L4/L9/L3 — Signals, Queries, Updates & Child Workflows

**3-sentence verdict.** Temporal's external-correlation model is **one uniform substrate — the
per-workflow MutableState protected by a single workflow lock — onto which three delivery channels (history
events for signals, an in-memory registry for updates, an in-memory registry for queries) are projected,
all correlated back to a running workflow by a monotonic `int64` event-id**. The defining invariant is
**commit-then-observe**: every transition is staged provisionally and made externally visible only via
`OnAfterCommit` callbacks (the `effect` package) once the persistence write succeeds. Child workflows are
full first-class instances, and **fan-in is solved by the same event-id correlation key**
(`ParentInitiatedEventId`) carried end-to-end.

### The mechanism

**Signals** always write one history event, are deduped by request-id (`signalworkflow/api.go:45`,
`IsSignalRequested`), and buffer while a workflow task is in flight. **Queries** are sync reads that never
mutate history (`queryworkflow/api.go:77-81` releases the lock with `nil`), dispatched directly through
matching when provably consistent (no pending/started task) else buffered until the next task. **Updates**
are the L3-adjacent reference: a synchronous request the workflow can **reject with zero persistence
side-effects** — the request travels as an in-memory *message* on a *speculative* (never-persisted) task,
the worker runs a *validator function first*, and **a rejection writes NO event to history** (`update.go:711`);
only on acceptance does `AddWorkflowExecutionUpdateAcceptedEvent` (`update.go:643`) record the first event,
carrying the original request payload. **Child workflows:** the parent allocates a slot keyed by
`InitiatedEventId` (`mutable_state_impl.go:141` "Initiated Event ID -> Child Execution Info") with a
deterministic child request-id `runId:eventId:version` (the spawn idempotency key); the child stores
`ParentInitiatedId` and, on close, RPCs `RecordChildExecutionCompleted` to the parent carrying that id; the
parent looks up the exact slot and **fails with `ErrChildExecutionNotFound` if it didn't issue that id**
(`recordchildworkflowcompleted/api.go:115`) — correlation and authorization in one check — then resolves the
slot and wakes the parent. Parent-close policies (ABANDON/TERMINATE/REQUEST_CANCEL) govern pending children.

### LEARN / AVOID / ORTHOGONAL (L4/L9/L3)

**LEARN**
- **One correlation primitive: a monotonic per-instance event-id slot.** v3's fan-in (the vibe-kanban gap)
  should adopt exactly this — parent allocates a slot at spawn, child carries it back, parent matches and
  **rejects any completion whose id it didn't issue**. The correlation key IS the authorization check.
- **Validate-before-mutate with zero-persistence rejection (the L3 gate).** A rejected request leaves no
  durable trace; only an accepted decision becomes a fact; carry the original request payload into the
  acceptance event so the durable record is self-contained. This is the reference for v3's human-decision/
  approval gate.
- **Commit-then-observe (the `effect` package)** — never set a caller-visible future until the persistence
  write commits; stage everything provisional + `OnAfterCommit`/`OnAfterRollback`. The cleanest answer to
  "what does an external caller see if the write fails?" — nothing.
- **Deterministic idempotency keys derived from position, not random UUIDs** (child request-id =
  `runId:initiatedEventId:version`; repeated update-id returns the *same completed outcome*).
- **Parent-close policy model** (ABANDON/TERMINATE/REQUEST_CANCEL per child).

**AVOID**
- **The speculative-task + in-memory-registry complexity** is enormous — it exists only to satisfy "zero
  writes on reject" layered onto an *append-only immutable* log. **If v3's store can do cheap transactional
  deletes/rollbacks, you avoid this whole machine** — keep the validate-before-commit semantics, drop the
  speculative apparatus.
- **Lock-ordering hazards** (must release the instance lock before a blocking RPC / before calling matching)
  — make "no blocking RPC under the instance lock" a structural rule, not a hand-maintained comment.
- **Event buffering as the signal-ordering mechanism** — only needed because everything binds to an
  append-only workflow-task boundary; a non-event-sourced v3 doesn't need `BufferedEventID` reordering (but
  *does* need an explicit answer for "external event arrives mid-step").

**ORTHOGONAL** — sticky queues, worker-versioning, reset reconciliation; parent-close *delivery at scale* (a
system workflow above a threshold) — the *policy model* is the LEARN part, the scale delivery is operational.

---

## CHASM/HSM — The General Durable State-Machine Kernel

**3-sentence verdict.** CHASM ("Coordinated Heterogeneous Application State Machines") is Temporal's
deliberate generalization of its workflow engine into **a kernel for arbitrary durable, replicated,
transactionally-consistent application state machines** — Workflow is merely one "Application State Machine"
among many (`chasm.md:9-11`), behind a clean typed API exposing sharding, atomic storage, replication, and a
durable task engine. This is the single closest existing analogue to v3's L0a ambition: the atomic unit of
change is a **Transition** that commits a whole component tree to one DB write (`tree.go:1630`
`CloseTransaction`) stamped with a logical clock (`VersionedTransition`). Critically it reuses the *exact
same* durability machinery as workflows — the CHASM node tree is embedded directly inside `MutableStateImpl`
and snapshotted into the same persistence record (`mutable_state_impl.go:157,975`) — so CHASM is not a
parallel store but a refactoring of the engine itself, and it is **commit-based, not replay-based**.

### The mechanism

A `Component` is a Go interface with one required method, `LifecycleState() → Running/Paused/Completed/Failed`
(`component.go:13-18`); the tree root is a `RootComponent` whose terminal state closes the Execution and frees
its BusinessID. State is expressed as typed `Field[T]` wrappers — plain Go fields are *transient* (not
persisted); the field kinds are data (a protobuf leaf), component (a nested sub-tree), and pointer (a typed
reference resolved at commit, requiring a proper-ancestor target), plus `Map[K,T]` (`field.go`, `field_type.go`).
Each field/map-entry persists as a **separate Node** (enabling future partial loading). The **Transition** is the
atomic unit: `CloseTransaction()` runs immediate pure tasks, reconciles the Go object graph into nodes, allocates
one `VersionedTransition{FailoverVersion, TransitionCount}` for the commit, serializes dirty nodes, generates
physical tasks, and returns a `NodesMutation{Updated, Deleted}` diff written in one record (`tree.go:1630-1681`).
A **`ComponentRef`** is a durable, self-validating return address — path + `componentInitialVT` + `executionLastUpdateVT`,
re-checked on callback, rejecting on either mismatch (`ref.go:23-55`) — exactly v3's "deliver a result back to the
right instance/state after an async gap" problem solved with an OCC guard. **Tasks come in two flavors:** *pure*
(run inside the write-lock, can mutate state directly) vs *side-effect* (run post-commit, do I/O, and **cannot mutate
state except by re-entering the public engine API as an external caller**) — each fronted by a `Validate` gate that
discards stale/superseded tasks (`task.go:30-73`). Components register into a Library under a hashed Archetype name
(`registry.go`); five real libraries ship (workflow, scheduler, activity, callback, nexusoperation).

### CHASM's primitives mapped onto v3's L0a

| v3 L0a aspiration | CHASM primitive |
|---|---|
| Instance (durable identity) | `Execution` keyed by `ExecutionKey{NamespaceID, BusinessID, RunID}` |
| Structured instance state | `Node` tree of `Component`s; fields = data / sub-component / pointer |
| Transition-commit (atomic advance) | `Transition` → `CloseTransaction()` → one `NodesMutation` write or rollback |
| Transcript / causal clock | `VersionedTransition{FailoverVersion, TransitionCount}` stamped per node + per commit |
| Tasks (durable side effects) | pure (in-txn) vs side-effect (post-commit, re-enter via API); transactional outbox |
| Task validity / dedup / cancel | `TaskValidator.Validate` gate before execution |
| Return-address / causal guard | `ComponentRef` with initialVT + lastUpdateVT consistency check |
| Reactive read / await | `PollComponent` (monotonic-predicate long-poll) + `NotifyExecution` |
| Higher constructs as state machines | `Library` registers Components + Tasks into a global Registry |

**Two divergences for v3:** (1) the pure/side-effect task split (a clean read/write separation worth stealing
wholesale); (2) **the transition function is plain developer Go code, NOT a replayed deterministic interpreter** —
CHASM does *not* use event-sourcing/replay for components; durability comes from the atomic node-diff commit +
VersionedTransition. **CHASM is the proof that the commit-based path (which finding #2 says v3 must take, because its
actors are LLMs) is viable for a kernel — and is where the canonical engine is heading.**

### Maturity

**Production, not preview — but mid-migration.** CHASM is wired into the history service with no feature flag; five
libraries ship; the CHASM scheduler is the default. Caveats: the `Workflow` CHASM component is a **hybrid shim** (its
own state is `*emptypb.Empty` because "workflow state is managed by mutable_state_impl, not CHASM" — so workflow is
*hosted on* CHASM for its sub-components but its core is not yet refactored *into* CHASM), and ~30 TODOs (partial
loading deferred, speculative-transition task execution open). The kernel exists and is load-bearing; the
workflow-into-component refactor is underway but incomplete.

### LEARN / AVOID / ORTHOGONAL (CHASM)

**LEARN — this is the closest prior art to v3's kernel; adopt aggressively:**
- **The ASM/Library/Component/Task registry model** — "a higher construct = a Library of Components + Tasks
  registered under a stable hashed Archetype ID." This is exactly v3's "arbitrary constructs as state machines on
  L0a," and gives schema evolution + routing for free.
- **Transition = atomic whole-tree commit producing a node diff** — developer code mutates a live object graph; the
  framework diffs and commits one record. This is v3's transition-commit, with an explicit dirty-state machine.
- **VersionedTransition as a uniform logical clock** stamped per node + per commit — reuse for both ordering and
  OCC guards.
- **`ComponentRef` as a self-validating return address** (path + initialVT + lastUpdateVT, re-checked on callback) —
  the canonical "deliver a result back to the right instance/state after an async gap."
- **Two task flavors with a `Validate` gate** (pure in-lock / side-effect post-commit-re-enter-via-API) — solves
  exactly-once-effect, stale-timer cancellation, and replica dedup in one mechanism.
- **One durability substrate for everything** — CHASM embedded its tree into the existing per-instance record and
  reused the same task queues; it did NOT build a second store. v3's L0a should be the *one* persistence/commit/task
  path all higher constructs share.
- **Separate node per field** for independent load/change frequency.

**AVOID**
- **The hybrid `*emptypb.Empty` Workflow component** — migration debt where the flagship construct lives half-in/
  half-out of the kernel. For greenfield v3, model your flagship construct (the workflow/plan) as a first-class
  component from day one, or inherit this dual-source-of-truth awkwardness.
- **Panic-on-framework-error in the field API**, heavy reflection/codegen, and **unfinished primitives shipped
  without flags** (speculative-transition tasks, partial loading) — known gaps; prefer typed errors / compile-time
  guarantees where v3's language allows.

**ORTHOGONAL** — Nexus integration; visibility/search-attributes as a built-in component (a nice "cross-cutting
concern as a reserved child" pattern, but an app feature); cross-DC failover; HSM itself (legacy — study it only to
understand the evolution; build on the CHASM-equivalent).

---

## L0a/L0c — Determinism, Replay & the Worker Protocol

**3-sentence verdict.** Temporal's determinism/replay contract is a **division of labor**: the *server* is a
dumb, immutable, append-only event log that never executes workflow logic, and the *worker* (the actor) is the
only thing that runs code — it reconstructs state by re-feeding the entire history through the workflow function,
then emits *commands* (intended transitions) that the server validates and converts to events. Determinism is the
price of this split: because the server replays history to the worker rather than checkpointing in-memory state,
the workflow function must produce byte-identical decisions when re-run — any divergence is a contract violation.
The server does almost no determinism *checking* (it can't — it doesn't run the code); the **SDK self-reports**
non-determinism, and the server's job is to make the consequences safe and recoverable (fail-and-retry the task,
never corrupt the log).

### The mechanism

The worker polls a workflow task (history-since-last), replays, and returns commands; the server validates each
(`respondworkflowtaskcompleted/workflow_task_completed_handler.go:275` switch over ~17 command types) with sequence
rules ("a close command must be **last**", `command_attr_validator.go:633`), per-command attribute validation, and
resource/size limits. **Non-determinism is detected by the SDK, not the server** — on divergence the SDK panics and
calls `RespondWorkflowTaskFailed` with `NON_DETERMINISTIC_ERROR`; the server logs it, counts a metric, writes the
failed event, and **the task fails and retries with backoff — the workflow itself does not fail** (`api.go:484`),
giving an operator time to deploy fixed code. **Code-change versioning is server-agnostic:** the SDK `GetVersion`/
`patched` API records a `RecordMarker` ("Version") that the server treats as an opaque payload — all branching logic
lives in the SDK. Two genuinely server-side tools: the `BAD_BINARY` blocklist (mark a poison build, force-reset its
workflows onto a good binary) and Deployment Versioning (pin a run to a code version). Efficiency lever: **sticky =
ship only events since the last completed task** (`recordworkflowtaskstarted/api.go:273-278`); cold = ship full
history.

### The bombshell for v3, stated directly

**Can v3's LLM-driven agent-actors use a replay model? No — and Temporal already tells you what to do instead.**
The replay contract rests on "re-running the actor against the same history produces identical decisions." An LLM is
the textbook violator. Temporal's own carve-out: **anything non-deterministic must be an Activity, not workflow
code.** Activities are *not* replayed — they run once and their **result is recorded into history**
(`ActivityTaskCompleted` with the result payload); on replay the recorded result is handed back. **The load-bearing
translation: an LLM call is an Activity, not the workflow body.** The deterministic "workflow" is the orchestration
skeleton (which agent runs, in what order, with what inputs, retry/timeout policy); the LLM/tool calls are recorded
side-effects.

### LEARN / AVOID / ORTHOGONAL (L0a/L0c determinism)

**LEARN**
- **The actor↔kernel command contract** — the actor returns a *list of intended transitions*; the kernel validates
  (sequence rules + attr validation + limits) and *only the kernel* mutates durable state. v3's agents proposing
  actions a kernel validates/commits is exactly this shape, *even without* event-sourcing.
- **"Close command must be last" + "history ends only with neutral events"** — a clean structural invariant that
  makes commit/rollback decidable.
- **Record-the-result-of-non-determinism, don't replay it.** Even without full event-sourcing, *recording LLM
  outputs / tool results as durable facts* (so a resumed/retried orchestration reuses the recorded answer instead of
  re-calling the model) gives the durability benefit of Activities without the determinism tax. **The single most
  important pattern to steal.**
- **Speculative/discardable tasks** ("run it; if it changed nothing, make it vanish") — relevant to v3 queries/
  dry-runs/validations that must not pollute the durable record.
- **`BAD_BINARY` + Deployment Versioning** — operator-driven "this build/prompt is poison, drive runs off it" and
  "pin a run to a code/prompt version" are kernel-level tools v3 will want for agent/prompt versioning.
- **Fail-the-task-not-the-workflow + backoff** — a transient actor failure (LLM 500, non-determinism) must be
  recoverable by retry/redeploy, never permanent run death.

**AVOID**
- **Full deterministic-replay event-sourcing as v3's primary model.** It buys exact in-memory-state recovery for
  *deterministic* code; LLM actors can't pay it, and the speculative-WT / transient-WT / buffered-event-reorder
  complexity is the cost of immutability. **Prefer state-snapshotting over replay** precisely because the recompute
  isn't reproducible.
- **Letting the kernel try to *detect* actor non-determinism** — Temporal proves the server can't (it doesn't run
  the code). Any "the agent did something inconsistent" check belongs in the actor/SDK layer; the kernel only records
  and rate-limits the consequence.
- **Coupling "1 command ↔ 1 event"** — Temporal is visibly paying for that early assumption (the whole message
  protocol works around it). v3's command→event mapping should be many-to-many from day one.

**ORTHOGONAL** — sticky-vs-full-history (a replay-specific optimization that *disappears* if v3 snapshots state
instead of replaying); the in-memory timer queue; Build-ID routing/matching.

---

## Consolidated Direction for v3

| v3 level | What Temporal contributes | Verdict |
|---|---|---|
| **L0a storage** | Full event-sourcing (history=truth, MutableState=view) — but the hot path loads the view, not a replay. | **Take DBOS's light storage; borrow Temporal's commit discipline + outbox + view-records-log-high-water-mark.** Don't make the log canonical. |
| **L0a concurrency** | Per-workflow `DBRecordVersion` (expected_version), checked under a row lock. | **Adopt a per-instance `expected_version`** — the one heavy piece worth keeping (a transition mutates many fields). Orthogonal to event-sourcing. |
| **L0a ownership** | Leaderful: rangeID lease per shard, two-level OCC, in-memory ID blocks. | **Go leaderless (DBOS); steal only the fencing token** for multi-step worker leases. |
| **L0a kernel generalization** | **CHASM: a commit-based kernel for arbitrary durable state machines** — Execution/Node-tree/Transition/VersionedTransition/ComponentRef/two-task-flavors/Library-registry. | **The reference architecture for v3's kernel. Adopt the component-registry model, the atomic node-diff commit, the self-validating ComponentRef, and the pure/side-effect task split.** |
| **L0c actor contract** | Worker returns validated commands; non-determinism = recorded Activity, never replayed. | **Adopt the command-contract + "LLM call = recorded Activity". Do NOT adopt replay.** Prefer snapshot over replay. |
| **L6 timers** | Look-ahead+gate durable timers; exactly-once via idempotent re-execution; retries as durable timer rows. | **Adopt all three.** Two queues (immediate + timer), one composite key, delete-then-advance ack. |
| **L8/L9/L0c dispatch** | Unbuffered-channel rendezvous; sync-match-skips-persistence; sticky actor-affinity (3 parts). | **Adopt the rendezvous, the sync/async persistence seam, and sticky affinity as the actor-routing primitive.** |
| **L4 fan-in** | Initiated-event-id slot: parent allocates, child carries back, parent rejects-if-not-issued. | **The fan-in primitive vibe-kanban left open. Adopt: correlation key = authorization check.** |
| **L3 gate** | Update: validate-before-mutate, zero-persistence rejection, request payload in the acceptance event. | **Adopt the semantics; skip the speculative-task machinery** (v3's store can roll back cheaply). |
| **commit-then-observe** | The `effect` package: caller-visible result set only in `OnAfterCommit`. | **Adopt — never expose un-persisted state.** |

## Reconsiderations for v3

1. **The heavy reference argues for the light path — and Temporal itself is moving there.** The biggest surprise of
   this study is that the canonical event-sourced engine (a) doesn't replay-from-events on its own hot path, and
   (b) has built a *commit-based* successor (CHASM) for everything new. Both signals point v3 to the DBOS-shaped
   storage model: a materialized aggregate guarded by `expected_version`, with the log demoted to an `(instance_id,
   op_id)` idempotency/audit ledger. v3 should resolve its central bet decisively: **commit-based, not
   replay-based; materialized-aggregate, not event-sourced-truth; leaderless, not leader-per-shard** — while
   borrowing Temporal's *disciplines* (atomic commit + outbox, fencing token, fan-in correlation, sticky affinity,
   look-ahead timers, validate-before-mutate, commit-then-observe).

2. **The determinism finding settles whether v3 can be a "workflow engine" at all.** v3's actors are LLMs, which
   cannot satisfy replay determinism. Temporal's own answer — non-determinism must be a *recorded Activity*, not
   replayed code — is the design v3 must adopt: **the deterministic orchestration skeleton is durable and
   re-runnable; every LLM/tool call is a recorded side-effect whose result is reused on resume.** This is the
   reconciliation of "durable execution" with "non-deterministic agents," and it is the most important single
   takeaway of the whole study series for v3's L0a/L0c boundary.

3. **CHASM is the architecture to study most closely before writing v3's core-model.** It is, concretely, "a kernel
   for arbitrary durable state machines built on one shared persistence/commit/task substrate" — v3's exact goal,
   from the team that has run it at scale longer than anyone. Its primitive set (Execution, Node-tree, Transition→
   CloseTransaction, VersionedTransition, ComponentRef, pure/side-effect tasks, Library/Registry) should be the
   starting vocabulary for v3's L0a, *minus* the replay/event-sourcing Temporal's older workflow path carries and
   *minus* the leaderful sharding. CHASM's one cautionary lesson — don't let the flagship construct live half-in/
   half-out of the kernel (the `*emptypb.Empty` Workflow shim) — argues for modeling v3's plan/workflow as a
   first-class component from day one.

4. **The L4 fan-in gap is now closed by a concrete primitive.** Across the series, "child = full instance" was
   confirmed but fan-in was the open gap (vibe-kanban's `parent_workspace_id` was provenance-only). Temporal closes
   it: the parent allocates an initiated-event-id slot, the child carries it end-to-end, and the parent **rejects
   any completion whose id it didn't issue** — correlation and authorization in one check. v3's L4 should implement
   exactly this slot-allocate / carry-back / match-and-authorize pattern.

5. **Sticky affinity is the actor-routing primitive v3's L0c/L9 needs.** v3 routes work to runtimes/actors that may
   hold warm state (a loaded worktree, a cached agent session). Temporal's three-part decomposition — engine-stamped
   address-of-next-work + broker no-cold-load + bounded-timeout fallback, with affinity always a recoverable hint —
   is the clean primitive for "prefer the warm actor, degrade to any actor." Combined with paperclip's host-owned
   session bytes and honcho's `ModelConfig`, v3 has a complete actor-routing + run-intent + session-portability story.

## Caveats

- **Large codebase, focused reads.** At ~410K LOC the original seven-agent pass read the load-bearing files
  (the architecture docs first as authoritative, then `service/history/{workflow,shard,queues,api}`,
  `service/matching/`, `chasm/`), and the later ten-lens second pass widened the audit across persistence,
  lifecycle/recovery, ownership, adapters, policy/security, scheduling, streaming/visibility, memory/context,
  operator UX, and modularity. Contract-level findings are high-confidence; some breadth (multi-cluster
  replication, the full matching fairness layer) was still deliberately skimmed as out-of-scope.
- **CHASM is mid-migration.** The findings reflect a production-but-incomplete framework (no feature flag, five
  shipping libraries, but the Workflow component is a hybrid shim and ~30 roadmap TODOs). v3 should treat CHASM as a
  strong *direction* indicator, not a finished blueprint — its unfinished edges (partial loading, speculative-transition
  tasks) are exactly the parts v3 would have to design itself.
- **Judged against v3's bar, not Temporal's.** Temporal's heavy machinery (event-sourcing, leader-per-shard,
  determinism contract, multi-cluster replication) is *correct and necessary* for its mission: a general-purpose,
  multi-tenant, multi-region durable-execution platform running untrusted deterministic code at massive scale. Most
  "AVOID" verdicts mean "v3 doesn't need this at its scale / for its LLM-actor model," not "this is wrong."
- **Same-day HEAD.** Analyzed at `cf28c44`, pushed 2026-06-20 — an actively-developed engine; CHASM especially is
  moving fast. Line numbers are a snapshot.
