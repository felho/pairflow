# LangGraph Study — The Closest Orchestration Analogue (and What It Validates)

Date: 2026-06-20

## Purpose

This note captures what Pairflow v3 can learn from **LangGraph**
(`langchain-ai/langgraph`), "a low-level orchestration framework for building stateful
agents" — durable execution, human-in-the-loop, and time-travel for long-running agent
workflows. The project owner flagged it specifically because **its orchestration model looks
similar to v3's**, and that instinct is correct: of all ten studies, LangGraph is the
**closest existing analogue to v3's commit-based kernel**. It is therefore the sharpest
validation study — it lets v3 check its resolved central bets (commit-based not replay-based;
an idempotency ledger; content-addressed ids; fan-in as state) against a production engine
that made many of the same choices, and it demonstrates the *cost* of the alternatives v3
deliberately rejected.

LangGraph is a Python library (~29K LOC core + separate checkpoint packages), not a
distributed service — and that framing is the key to the whole study: **LangGraph is roughly
"v3's orchestration DNA done as a single-process library."** It shares the transition-commit
shape, the pending-writes idempotency ledger, and the typed-state model; it lacks the
distributed/leaderless concurrency, the *mandatory* record-not-replay discipline, and the
audited human-decision record that are precisely v3's value-add. So the study reads as: same
core, and a crisp map of what v3 adds on top.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/langgraph` (analyzed at HEAD `711b315`, pushed 2026-06-19)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)
- [`../../model/core-model.html`](../../model/core-model.html) — the model itself

Tenth in a series. Read alongside the load-bearing prior studies:

- [`dbos-study.md`](dbos-study.md) — the light kernel: step-memoization via `operation_outputs` keyed `(workflow_uuid, function_id)`.
- [`temporal-study.md`](temporal-study.md) — the heavy kernel: event-sourced replay + leader-per-shard; CHASM (commit-based successor); the determinism finding (LLM = recorded Activity, never replayed); fan-in via an initiated-event-id slot.
- [`vibe-kanban-study.md`](vibe-kanban-study.md) — git-anchored checkpoints; left the L4 fan-in gap open.
- [`superpowers-study.md`](superpowers-study.md) — the verification gate; partition-then-verify fan-in; file-handle ContextPacket.
- (also: omnigent / symphony / paperclip / hermes / honcho.)

> Method: original six parallel sub-agent analyses with `file:line` citations, the central
> instruction being a precise comparison of LangGraph's orchestration to v3's kernel and to
> Temporal/DBOS, followed by a later ten-lens source-only second-pass audit before re-reading
> this report. The original slices were the Pregel execution model; the channel/state model;
> checkpointing/time-travel; interrupts (L3); subgraphs/Send/functional-API (L4);
> replay/recovery/determinism semantics. The second pass widened the audit across durable
> state/checkpoint/store, lifecycle/recovery, concurrency/ownership, runtime/adapters,
> policy/security, scheduling/fan-in, streaming/observability, memory/context, operator UX,
> and modularity/extensibility.

## Executive Summary

Four load-bearing findings.

> **1. The superstep barrier IS v3's transition-commit — LangGraph validates the commit-based
> bet in production.** LangGraph is a Bulk-Synchronous-Parallel (Pregel) engine: each superstep
> plans the triggered nodes against an immutable channel snapshot, runs them in parallel, then
> **atomically merges all writes into the channels and writes a checkpoint at the barrier**
> (`_loop.py:676` `after_tick` = `apply_writes` + `_put_checkpoint`). That barrier is exactly v3's
> "atomically advance state + enqueue durable side-effects per transition." It is **NOT
> event-sourced replay (Temporal) and NOT step-memoized (DBOS) by default — it is snapshot-commit,
> the same family as CHASM.** Of all ten studies this is the closest match to v3's resolved central
> bet, and it proves the commit-based (not replay-based) model works in production.

> **2. The pending-writes mechanism IS the idempotency ledger — and the ids are content-addressed.**
> Within a superstep, each completed node's output is persisted via `put_writes` to a separate
> `checkpoint_writes` table keyed `(checkpoint_id, task_id, idx)` *before* the next superstep applies
> them; on resume the recorded writes are re-bound to their tasks and the runner skips any task that
> already has writes (`_loop.py:724-737`, `_runner.py:745-754`). This is **functionally DBOS's
> `operation_outputs` keyed `(workflow_uuid, function_id)` = v3's `(instance_id, op_id)`** — a completed
> unit's output is its own resume token. And the `task_id` is **content-addressed** (an xxhash of
> node+path+checkpoint, `_algo.py:990-997`), so identity is *derived deterministically, not allocated* —
> directly validating v3's content-addressed spawn-correlation direction.

> **3. The determinism hazard is real in the default path — and it both validates and demonstrates
> the cost of v3's record-not-replay bet.** LangGraph's *unit of recovery is the whole graph node*: a
> node that does an LLM call / side-effect and then crashes (or hits `interrupt()`) re-runs the LLM call
> AND the side-effect on resume, because pre-crash writes are discarded and the node body replays from
> the top (`_loop.py:729-735`, `_retry.py:615`). This is **exactly the hazard Temporal warns about.**
> LangGraph's escape hatch — the `@task`/`@entrypoint` functional API — is genuine DBOS-style
> record-not-replay (run once, RETURN value checkpointed, returned-not-recomputed on resume,
> `_runner.py:745-756`), **but it is OPT-IN and positionally-keyed**. The verdict for v3 is sharp:
> LangGraph independently re-discovered record-not-replay as the *correct* answer (`@task`), yet leaves
> it *optional*, so its default path carries the determinism hazard for LLM workloads. **v3's choice to
> make record-not-replay the ONLY model — every LLM actor output an atomic, content-addressed,
> never-replayed commit — is the stronger, safer design; LangGraph is the real-world demonstration of
> what goes wrong when record-not-replay is optional rather than foundational.**

> **4. Two reusable primitives v3 should lift: typed reducer channels (state model) and the barrier
> channel (fan-in as state).** State is not a blob but a map of named fields, each a typed channel with
> its own merge policy declared via `Annotated[type, reducer]` (bare field = single-writer overwrite,
> annotated = explicit reducer); the channel catalog is a clean taxonomy of concurrent-merge semantics
> (reject / reduce / accumulate / barrier / assume-equal). And **fan-in is modeled as STATE, not an
> external coordinator**: `NamedBarrierValue` is a channel whose availability rule is "all N named writers
> seen", with the partial seen-set in the checkpoint (crash-safe, resumable) and a `consume()` reset for
> loops — a third fan-in model alongside Temporal's slot and Superpowers' partition-then-verify. (Caveat:
> `Send`-based map-reduce fan-in is *anonymous channel reduction* that loses child→result identity — the
> AVOID below.)

Where LangGraph sits on the series' kernel spectrum (storage/recovery axis):

```
symphony ── hermes ── vibe-kanban ── honcho ── paperclip ── DBOS ── LANGGRAPH ── CHASM ········ TEMPORAL
                                                            (step-memo) (snapshot-commit + pending-writes)        (event-sourced)
```

LangGraph clusters with DBOS/CHASM at the commit-based, snapshot-or-memoized end — exactly where v3
is headed. Its distance from v3 is not the *kernel model* but the *deployment model* (single-process,
no leader, optional-not-mandatory record-not-replay, unaudited human gate).

The synthesis line for the series, lightly extended:

> **v3 = a commit-based, leaderless kernel — and LangGraph is the closest existing proof the
> commit-based orchestration model works (superstep≈transition-commit, pending-writes≈idempotency-ledger,
> content-addressed task ids, typed reducer channels, barrier-channel fan-in). v3 adds what LangGraph
> stops short of: distributed leaderless concurrency (per-instance expected_version CAS instead of
> single-process single-writer), MANDATORY record-not-replay (every LLM call an atomic recorded commit,
> not an opt-in `@task`), an audited human-decision record (not a replayed resume value), and an
> idempotency ledger as the durability truth (instead of a full snapshot per superstep).**

---

## Second-Pass Audit Deltas

The second-pass audit did not change the report's main conclusion: LangGraph remains the
closest orchestration analogue and the strongest validation of v3's commit-based kernel
shape. It did add important precision around the operational and extension surfaces that the
first pass intentionally skimmed.

1. **Checkpoint visibility has a stricter barrier than "write checkpoint after step."** The
   first pass identifies pending writes as the idempotency ledger; the second pass sharpened
   the ordering invariant: LangGraph waits for prior checkpoint saves and pending/delta write
   futures before publishing the next checkpoint. A checkpoint must not become visible before
   the writes/blobs it references are durable, or ancestor/history walks can observe a partial
   state. v3 should encode the same rule for transcript/state/effect commits.

2. **Thread, run, checkpoint, pending write, and store are five separate identities.** The
   durable timeline is keyed by `thread_id`; a run is an execution attempt; a checkpoint is a
   parent-linked state point; pending writes are task-scoped idempotency records; the Store is
   cross-thread memory keyed by namespace/key. v3 should avoid collapsing bubble/session,
   attempt, checkpoint, recorded effect, and long-term memory into one "run state" concept.

3. **Lifecycle is status + control writes + checkpoint, not a single enum.** LangGraph has
   explicit loop statuses (`input`, `pending`, `done`, `draining`, interrupt states,
   `out_of_steps`), while interrupts/resumes/errors are persisted as control writes and
   checkpointed separately. This is a useful v3 model: lifecycle state should describe where
   the engine is, while durable control records explain why it can resume, retry, or await
   input.

4. **Interrupt resume has a stronger authority contract than the first pass described, even
   though it remains unaudited.** `Command(resume=...)` requires a checkpointer; multiple
   pending interrupts require explicit interrupt IDs; interrupt IDs are derived from namespace
   hashing; reserved keys like `__interrupt__`, `__resume__`, `__pregel_*`, `checkpoint_*`,
   and `thread_id` separate system control from user metadata. v3 should copy the persisted,
   id-keyed gate identity and reserved keyspace, while still rejecting LangGraph's unaudited
   replayed resume value as the final human-gate model.

5. **`Command` is a control envelope, not a state update.** LangGraph separates `update`,
   `resume`, `goto`, and parent-graph targeting; parent commands intentionally bubble across
   subgraph boundaries. Pairflow should treat lifecycle commands, approvals, resume inputs,
   and child-routing requests as typed control envelopes with target scope, not as generic
   state patches.

6. **Dynamic fan-out has two distinct primitives: `Send` packets and barrier/reducer join
   state.** The first pass covered anonymous reducer fan-in and `NamedBarrierValue`; the
   second pass adds that `Send` is not direct execution but a write to a reserved `TASKS`
   channel, then materialized as `PUSH` tasks with deterministic `task_id`, `path`, and
   `checkpoint_ns`. v3 should preserve this split: spawning work is a durable command/write,
   while joining results is an explicit state/reducer/barrier choice.

7. **Streaming is a typed projection layer over a raw event envelope.** LangGraph defines
   named stream modes (`values`, `updates`, `checkpoints`, `tasks`, `debug`, `messages`,
   `custom`), carries namespace on stream parts, and its v3 protocol uses a raw event envelope
   with optional `seq`; timestamps are explicitly not the ordering source. Pairflow's observe
   seam should likewise expose a stable raw event contract plus typed projections, with sequence
   numbers for ordering and namespace as first-class data.

8. **Debug output filters framework noise and sensitive config.** LangGraph debug task/checkpoint
   payloads remove internal framework metadata while preserving user-relevant tags, and tests
   assert that safe identifiers like thread/checkpoint/run/assistant/graph propagate while
   arbitrary nested config and API-key-like fields do not. v3 should treat debug/transcript
   payload shaping as an API contract, not a dump of internal state.

9. **Runtime context, graph state, config, and store are separate dependencies.** LangGraph's
   `context_schema` replaces the older `config_schema` for run-scoped immutable context;
   `Runtime` injects context, store, stream writer, previous value, and execution metadata
   while explicitly not being the config; Store is namespace/key cross-thread memory, not
   checkpoint state. Pairflow's execution context should mirror that separation so user
   configuration, runtime ports, durable state, and long-term memory cannot silently substitute
   for each other.

10. **Reducer determinism is a real contract gap.** LangGraph documents arbitrary update
    order and requires deterministic/batching-invariant reducers in some channels, but it
    does not generally prove associativity/commutativity for user reducers. v3 should either
    make reducer laws typed/testable or route non-commutative merges into explicit conflict
    states instead of relying on arrival/order accidents.

11. **Operator UX is much richer than the first pass captured.** `langgraph up` prints concrete
    API/docs/Studio URLs; deploy commands can emit both human text and JSON-lines events
    (`step`, `info`, `warn`, `status_change`, `heartbeat`, `result`); long-running commands
    report elapsed time and heartbeat; failures surface last relevant build log lines; logs
    have type/revision/level/query/time-window/follow controls. Pairflow's bubble lifecycle
    should offer machine-readable event output and targeted last-error context, not require
    scraping prose or progress notes.

12. **Config and version validation are operator-facing safety rails.** LangGraph validates
    runtime versions, deprecated distributions, missing graph declarations, unknown keys with
    suggestions, unsafe install/build command characters, and resolves compatible API versions
    rather than blindly accepting a tag. v3 should give task/plan/progress and hook/bootstrap
    config the same quality of diagnostics and compatibility gates.

13. **Checkpoint conformance is a reusable test pattern.** LangGraph ships a conformance suite
    for checkpoint saver implementations with base/extended capability checks, progress
    callbacks, and reports; sync/async API parity is also tested. v3 should have equivalent
    contract suites for state stores, effect/idempotency ledgers, lifecycle adapters, and any
    sync/async or local/remote execution lanes.

14. **Extension seams are strong where they are contract-owned, weak where convenience layers
    collapse concepts.** Checkpoint backends live in separate packages behind
    `BaseCheckpointSaver`; Store is batch-first; graph builder and compiled runtime are
    separate; `StreamTransformer` has lifecycle methods and explicit mutation warnings; public
    exports are small. Conversely, the main package depends on higher-level prebuilt/SDK
    packages, `state.py` is a broad builder hotspot, type introspection creates implicit runtime
    contracts, and prebuilt tool/agent code combines LangChain tools, state, store, runtime,
    interception, validation, and error formatting. v3 should keep core ports small and avoid
    letting convenience layers become kernel dependencies.

15. **Generated/schema artifacts need drift governance.** LangGraph has a canonical CLI schema
    source and generated JSON Schema artifact, but the second pass could not prove a CI drift
    gate. Pairflow should use generated artifacts where they reduce contract ambiguity, but only
    with explicit checks that source and generated output stay synchronized.

---

## L0a — The Pregel Execution Model (orchestration core)

**3-sentence verdict.** LangGraph is a Bulk-Synchronous-Parallel (Pregel) graph engine: each *superstep*
plans the set of triggered nodes against an immutable channel snapshot, runs them in parallel, then
**atomically merges all their writes into the channels and writes a checkpoint at the barrier**
(`_loop.py:676` `after_tick`). This superstep barrier IS a transition-commit in the v3 sense — atomic
state-advance (`apply_writes`) + durable side-effect (checkpoint) per step — making LangGraph
**architecturally the closest of all the studied engines to v3's commit-based kernel**: it is NOT
replay-based like Temporal and NOT step-memoized like DBOS; it is snapshot-commit, the same family as
CHASM. The decisive divergence is the *trigger model* (channel-version dataflow, not v3's
event-type→target reactive transitions) and the *deployment model* (single in-process driver loop with
within-superstep parallelism, no leader/shard — exactly the leaderless-but-single-process gap v3 must close).

### The superstep loop = a transition-commit

The driver is a plain `while loop.tick(): runner.tick(...); loop.after_tick()` (`pregel/main.py:2979-3003`),
mapping cleanly onto plan → execute → commit: (1) **plan** — `tick()` (`_loop.py:592`) calls
`prepare_next_tasks` (`_algo.py:392`) for the triggered task set; (2) **execute** — `runner.tick(...)` runs
active tasks in parallel, buffering each task's writes into its own deque (not applied yet); (3) **commit** —
`after_tick()` (`_loop.py:676`) is the barrier: `apply_writes(...)` once over all tasks (`_loop.py:680`), then
`_put_checkpoint` (`_loop.py:706`). The invariant comment is explicit: "Channel updates from step N are only
visible in step N+1… channels are immutable for the duration of the step, with updates applied only at the
transition between steps" (`main.py:2976-2978`). With `durability="sync"` the driver blocks on the checkpoint
future, making the commit fully durable per step.

### Triggering (channel-version) + replay-vs-snapshot-vs-memoization

Triggering is purely **channel-version-based**: a node fires iff a subscribed trigger channel's version exceeds
the version this node last *saw* (`_triggers`, `_algo.py:1260-1277`: `versions.get(chan) > seen.get(chan)`);
`apply_writes` bumps per-channel versions and records `versions_seen[task]`. This is structurally v3's
event→handler dispatch, but keyed on *which data changed* (dataflow), not *which event-type arrived*
(control-flow). **Placement: snapshot-commit, NOT replay, NOT memoization.** On resume, LangGraph restores
channel state from the checkpoint and continues from `step+1` (`_loop.py:1676`) — it does not re-execute the
graph from the start. The one DBOS-resemblance is the **pending-writes** layer (next section), which operates
only *within an unfinished superstep*; across completed supersteps recovery is pure snapshot-restore. There is
no Temporal-style deterministic event-replay anywhere.

### Concurrency / ownership

**Single-process driver loop, within-superstep parallelism, no leader and no lock.** One graph invocation = one
`PregelLoop` driven by one `while loop.tick()`; parallelism exists only *inside* a superstep (tasks submitted to
a background executor, awaited at the barrier). There is no shard ownership, no leader election, no distributed
lock — single-writer safety comes from being single-process. The `versions_seen` map is the in-memory, per-channel
*seed* of v3's per-instance `expected_version`, but it provides zero cross-process safety. This is the precise gap
v3 must close: replace single-process-single-writer with **persisted per-instance optimistic concurrency
(expected_version CAS) + an idempotency ledger** to get true leaderless distributed concurrency.

### LEARN / AVOID / ORTHOGONAL (L0a execution)

**LEARN**
- **The barrier-commit shape is v3's transition-commit, validated in production** (`after_tick` = `apply_writes`
  + checkpoint). LangGraph proves the commit-based (not replay-based) bet works — strong corroboration.
- **`versions_seen` → `expected_version`** — the per-subscriber "last seen version" comparison is a clean, cheap
  "has my input changed since I last ran"; v3's per-instance `expected_version` is its persisted, instance-scoped
  generalization.
- **Ordered async durability** — chaining each checkpoint put on the previous so a checkpoint never lands before
  the writes that justify it (`_loop.py:1507-1524`) — a clean commit→side-effect visibility invariant.

**AVOID**
- **Do NOT adopt the BSP superstep barrier as the transition unit** — it merges *all* active nodes' writes
  simultaneously and globalizes the commit (every transition is graph-wide, lock-stepped). v3 is per-instance
  reactive (one instance reacts to one event); importing BSP would force artificial global synchronization that
  defeats leaderless distribution.
- **Do NOT inherit the single-writer concurrency model** — safe only because single-process. v3's leaderless goal
  is the opposite problem (many concurrent writers, no coordinator), demanding persisted per-instance OCC that
  LangGraph lacks.
- **Do NOT adopt channel-version (dataflow) triggering as the primary control model** — it binds activation to
  *which data changed* and needs a pre-declared topology; v3's event-type→target dispatch is more flexible for
  distributed, dynamically-correlated workflows (spawn-correlation, child-lifecycle events).

**ORTHOGONAL** — subgraph namespacing machinery; DeltaChannel exit-mode accumulator (a checkpoint-size optimization);
node-level error-handler scheduling.

---

## State Model — Typed Reducer Channels & the Fan-In Barrier

**3-sentence verdict.** Graph state is not a blob but a `dict[str, BaseChannel]` — each state key is an
independent, typed channel that owns its own merge/reduce semantics, availability rule, and checkpoint
representation. A node never mutates state directly; it emits *writes* `(channel, value)`, and at each
superstep barrier the engine batches all writes per channel and calls `channel.update(values)` once, letting
the channel decide how to fold concurrent writes (overwrite / reduce / accumulate / barrier). The whole
control plane is driven by per-channel monotonic *versions*: a node fires when an input channel's version
advanced past what that node last saw — **state-merge and scheduling are the same mechanism.**

### The channel-type catalog + the reducer model

`BaseChannel` (`channels/base.py:19`) is a small contract: `update(values)` (the merge fn, called once per
superstep per channel with all that step's writes, returns "did I change"), `get()`, `is_available()` (the
trigger/read gate), `checkpoint()`/`from_checkpoint()`, and lifecycle hooks `consume()`/`finish()`. The catalog
is a taxonomy of concurrent-merge semantics: **LastValue** (overwrite, *rejects* >1 write/step with a concurrent-update
error), **BinaryOperatorAggregate** (reduce via a user fn like `operator.add`), **Topic** (accumulate/pubsub),
**NamedBarrierValue** (the fan-in barrier), **EphemeralValue** (last value, cleared each step), **AnyValue**
(assume-all-equal), **UntrackedValue** (never checkpointed), **DeltaChannel** (reduce with delta-checkpointing).
The user declares per-field merge via `Annotated[type, reducer]` (`graph/state.py:1836-1903`): a bare field →
`LastValue` (single-writer overwrite, the safe default); a field annotated with a 2-arg callable → wrapped in a
`BinaryOperatorAggregate`. `add_messages` (`graph/message.py:60`) is the canonical reducer and shows the power —
not a trivial append but merge-by-id with upsert + tombstone-delete + dedup.

### NamedBarrierValue as the fan-in / join primitive

The direct answer to v3's L4 fan-in gap. `NamedBarrierValue` (`channels/named_barrier_value.py:13`) holds `names`
(required writers, fixed at construction) and `seen` (writers that reported). Each write *is a writer name*;
**availability = the join condition** (`is_available()` returns `seen == names`, `:74-75`) — the channel stays
unavailable (and thus does not trigger its downstream) until *every* named writer has reported; `consume()` resets
`seen` so the barrier can fire again on a later loop iteration (`:77-81`). The builder wires it automatically when
multiple start nodes converge on one end node (`state.py:1546-1559`: a `join:A+B:end` channel, each parent writes
its own name). **The join is state**: the partial `seen` set lives in the checkpoint (`:46`), so a fan-in is
crash-safe and resumable — restart reloads which branches already arrived. This is a fundamentally different,
cleaner model than an external slot/counter: "waiting for N branches" is unified with normal state.

### Versions → triggering + concurrent writes

Versions are external to channels, stored in the checkpoint as `channel_versions` (current per channel) and
`versions_seen` (per node: last consumed). After `update()` returns True *and* the channel `is_available()`, the
engine bumps the version (a global max+1, `_algo.py:275-282`) and adds the channel to `updated_channels`
(unavailable channels — a half-filled barrier — are deliberately excluded, so they never trigger downstream). A
node runs iff a trigger channel is available AND its version advanced past `versions_seen` (`_algo.py:1273`).
Concurrent writes in one superstep are resolved entirely by the channel's `update`: two parallel writes to a
LastValue → error; to a BinOp → both folded (reducer **must be associative/commutative** for determinism, but
this is not enforced); to a Topic → both accumulated; to a barrier → both names recorded.

### LEARN / AVOID / ORTHOGONAL (State Model)

**LEARN**
- **State-field = typed reducer channel.** Model v3 instance state as a map of named fields, each carrying a
  declared merge policy. The `Annotated[type, reducer]` ergonomics — *bare field = single-writer overwrite,
  annotated = explicit reducer* — is a clean default-safe design: concurrency is opt-in per field.
- **Fan-in as a barrier *channel*, not an external coordinator** — the strongest L4 takeaway: represent a join as
  state whose availability rule is "all N named writers seen", persist the partial seen-set in the commit, reset via
  consume for loops. Crash-safe, resumable, and unifies "waiting for branches" with normal state. A concrete
  blueprint (`state.py:1546-1559`).
- **Versions drive triggering — merge and scheduling are one mechanism.** A monotonic per-field version + a
  per-actor "last seen version" gives "an actor re-runs when its input advanced" for free and suppresses re-fires.
- **Availability gates triggering** — keep "has a usable value" distinct from "was written" (a waiting barrier must
  not advance scheduling).

**AVOID**
- **`get_next_version` is a single global monotonic counter (max+1)** — a serialization point that will not survive
  concurrent committers across actors/branches without a central sequencer. v3 needs per-field versions that merge
  without a global max (vector/Lamport-per-field), or it inherits LangGraph's single-writer-of-the-version-counter
  assumption.
- **Order-arbitrary reduce demands associativity but doesn't enforce it** — a non-commutative reducer silently
  becomes non-deterministic under concurrency. v3 should make associativity/commutativity checkable or typed, not a
  doc footnote.
- **Single-writer-via-exception (LastValue)** — a blunt control that turns a concurrent write into a runtime error;
  v3 may want last-writer-wins-with-provenance or an explicit conflict state.

**ORTHOGONAL** — the LLM-conversation-specific `add_messages` reshaping; DeltaChannel storage optimization;
Ephemeral/Untracked scratch conveniences.

---

## L0a — Checkpointing, Resume & Time-Travel

**3-sentence verdict.** LangGraph's durability is **snapshot-per-superstep plus a per-task pending-writes log**:
after every superstep it writes a full `Checkpoint` (the entire channel state) keyed `(thread_id, checkpoint_ns,
checkpoint_id)`, and *within* a superstep each completed node's output is persisted via `put_writes` to a separate
`checkpoint_writes` table **before** the next superstep applies them. On the spectrum it sits between CHASM's
snapshot-commit and DBOS's step-log: the checkpoint is a **materialized full snapshot** (like Temporal's
MutableState, but it IS the truth — there is no event-sourced history to replay), while the pending-writes table
is a **mini step-log keyed `(checkpoint_id, task_id, idx)`** giving DBOS-style "completed node not re-run"
recovery for the in-flight superstep only. There is no global event log; "history" is the chain of full snapshots
linked by `parent_checkpoint_id`, and time-travel/forking is just "load an old snapshot and `put` a new child of it."

### The Checkpoint shape + the pending-writes crash-recovery

The `Checkpoint` TypedDict (`checkpoint/base/__init__.py:92-123`) holds `channel_values` (the deserialized value of
*every* channel — the full state), `channel_versions`, and `versions_seen` (which channel versions each node has
consumed — the field that drives resume). `create_checkpoint` rebuilds the full snapshot from live channels each
step (not a delta, in the default path). **Pending-writes is the crash-recovery primitive:** when a node finishes,
`put_writes` (`_loop.py:408-501`) immediately persists that node's outputs to `checkpoint_writes` keyed by `task_id`,
*before* the next superstep's checkpoint. On resume, the saved writes are re-bound to their tasks
(`_reapply_writes_to_succeeded_nodes`, `_loop.py:724-737`) — but ERROR/INTERRUPT/RESUME writes are skipped so failed/
interrupted tasks keep empty writes and DO re-run — and the runner treats any task that already has writes as
complete, returning its stored result (`_runner.py:745-754`). The `task_id` is content-addressed (xxhash of
node+path+checkpoint), so the same node deterministically gets the same id across runs.

### Postgres schema + resume + time-travel

The postgres schema (`checkpoint-postgres/.../base.py:43-91`) has three tables: `checkpoints` (PK
`(thread_id, checkpoint_ns, checkpoint_id)` + `parent_checkpoint_id` + JSONB), `checkpoint_blobs` (PK
`(thread_id, ns, channel, version)`, content-addressed by version so unchanged channels are **shared/deduped across
checkpoints**, `ON CONFLICT DO NOTHING`), and `checkpoint_writes` (PK `(..., checkpoint_id, task_id, idx)` — the
pending-writes log, PK-deduped). Checkpoints are append-per-id; blobs are write-once-immutable-shared. **Resume**
loads the latest checkpoint for a thread (`ORDER BY checkpoint_id DESC`, checkpoint_id is monotonic uuid6).
**Time-travel/forking** is always "load old snapshot → `put` a new child": pass a past `checkpoint_id` to branch, or
`update_state` to apply a manual edit creating a `source:"fork"` checkpoint. **Unlike vibe-kanban's destructive
git-reset restore, LangGraph never mutates history — restoring a past checkpoint creates a new forward branch**
(closer to `git checkout -b` than `git reset`): an immutable snapshot DAG per thread.

### LEARN / AVOID / ORTHOGONAL (Checkpointing)

**LEARN**
- **The pending-writes ledger is the transplantable idea** — `checkpoint_writes` keyed `(checkpoint_id, task_id, idx)`
  with PK-dedup is structurally identical to DBOS `operation_outputs` and to v3's idempotency-ledger goal: a completed
  unit's output is persisted (keyed by a deterministic content-addressed id) before its effect commits, so crash-resume
  re-binds the output and skips re-execution. The `NO_WRITES`/`ERROR`/`RESUME` sentinel channels (records that a task
  failed/interrupted so it DOES re-run) are a clean, copyable design for at-most-once node execution.
- **Blob-version content-addressing** — unchanged channels share one immutable blob row; how a full-snapshot model
  avoids quadratic storage. Worth lifting if v3 commits get large.
- **Restore-as-fork (never mutate history)** — adopt the principle (vs vibe-kanban's destructive git-reset): a v3
  instance could fork by snapshotting the materialized aggregate + replaying the idempotency ledger to a point.

**AVOID**
- **Full-snapshot-per-superstep as the primary record** — the default writes every channel each step; storage is
  O(supersteps × state-size), saved only by blob-dedup on unchanged channels. For v3's **materialized-aggregate** model
  this is the wrong default — v3 wants the aggregate to BE the current view and the idempotency ledger to be the
  durability truth, not a fresh full copy each transition. The DeltaChannel machinery is a leaky beta retrofit of deltas
  onto a snapshot store — a cautionary tale.
- **Non-transactional `put`** (pipelined inserts, not atomic with the step) — recovery relies on idempotent
  re-application, not a transactional boundary. v3's CHASM-style atomic node-diff commit is stronger.

**ORTHOGONAL** — resume-as-fork's per-namespace parent DAG (a thread-history concern, but the `checkpoint_ns`
parent-map keying is worth a second look for v3's L4 nested/child instances specifically).

---

## L3 — Interrupts (human-in-the-loop)

**3-sentence verdict.** LangGraph's `interrupt()` is a *resumable-exception + replay* mechanism: calling it inside a
node raises `GraphInterrupt`, which the Pregel runner catches and persists as a checkpoint write; on resume **the
entire node function re-runs from the top**, and the `interrupt()` call that previously raised now *returns* the
human's resume value instead. It is fundamentally a control-flow pause built on the checkpointer, **not a durable
decision record** — the resume value is matched positionally to interrupts by a per-task counter, and only the
interrupt request and the raw resume value are persisted (no validation, no audited decision artifact). **It is NOT
safe for LLM/side-effecting nodes:** any work done *before* `interrupt()` re-executes on every resume because the
node is replayed — exactly the determinism hazard Temporal's model was designed to forbid.

### The mechanism + the determinism trap

`interrupt(value)` (`types.py:811-934`) reads a per-task scratchpad counter; if a resume value exists at that index
it returns it, else it raises `GraphInterrupt`. `Command(resume=...)` injects the answer as a write that the next run
surfaces via the scratchpad. The docstring is explicit: "The graph resumes from the start of the node, **re-executing**
all logic" (`types.py:824`). **The hazard is in the code:** when the node raises `GraphInterrupt`, the runner persists
*only* the interrupt request (and prior RESUME writes) — the node's own `task.writes` (state it produced before
interrupting) are **discarded** (`runner.py:585-591`). So on resume the node re-enters from line 1; every statement
before `interrupt()` runs again — an LLM call re-fires, a "charge the card"/"send the email" side-effect repeats. The
interrupt counter only resolves the *interrupt calls* positionally; it does not memoize the surrounding code. Compare
Temporal Update: validate-before-mutate, zero-persistence on rejection, the validated request recorded in history;
LangGraph inverts the guarantee — it replays the user's *raw node code* rather than *recorded effects*.

A second, older model — static `interrupt_before`/`interrupt_after` (`_algo.py:155-185`) — pauses *between* nodes (no
re-run hazard) but carries *no payload* (no question to the human) and no resume value flows back; the human can only
inspect/edit state via `update_state`. So the value-carrying model has the replay hazard; the safe model can't carry a
question.

### Durability + audit

The pause is durable (the interrupt is a checkpoint write; a checkpointer is mandatory — `interrupt()` without one
cannot store the resume). But **the decision is essentially unaudited:** what's persisted is an `Interrupt(value, id)`
request and the raw RESUME value (an opaque `Any` consumed positionally) — **no actor identity, no decision timestamp,
no validation, no accept/reject distinction, no enumerated choice.** Contrast paperclip's audited decision row
(who/when/what, validated, queryable) and Temporal Update's acceptance event carrying the validated payload. LangGraph's
resume is "stuff a value back into a counter slot and replay."

### LEARN / AVOID / ORTHOGONAL (L3)

**LEARN**
- **Mandatory-checkpointer-before-pause** — a human gate must not be expressible without durable persistence.
- **Pending-vs-resolved reconciliation** (match interrupt-request writes against resume writes after restart,
  `_loop.py:807-831`) — a clean, idempotent way to compute "what is still awaiting a human."
- **Id-keyed resume map for parallel gates** (`_algo.py:1311-1314`) — the gate-id is the correct join key for v3's
  parallel/multi-gate case, not position.

**AVOID**
- **The re-run-the-node-on-resume model (the headline critique)** — discarding pre-interrupt writes and replaying user
  code means LLM calls / side-effects before the gate execute twice. v3's human gate should follow Temporal/paperclip:
  **suspend at a boundary (no replay of effects)** and record the human's answer as a **first-class audited decision
  artifact** (actor, timestamp, validated payload, accept/reject) — persist the *decision*, not just the *answer*.
- **The value-less static-interrupt model as the primary gate** — no request payload and no structured response can't
  carry validation or a closed-enum choice (the Superpowers pattern v3 wants on irreversible routes).

**ORTHOGONAL** — the Pregel super-step/channel-versioning machinery behind `should_interrupt`; `Command.goto`/`Send`
routing; the time-travel checkpoint-replay distinction.

---

## L4 — Subgraphs, Send (fan-out) & the Functional API

**3-sentence verdict.** LangGraph has **no explicit child-instance handle and no correlation slot anywhere** — spawn
and fan-in are both expressed as *writes to reducer channels*, executed inside the single BSP superstep loop. A `Send`
is just a message appended to a reserved `Topic` channel (`__pregel_tasks`); the engine drains it next superstep, runs
one task per packet in parallel, and each task's output flows back through *ordinary reducer channels* — fan-in is
**channel reduction, not slot-matching**. The functional API (`@entrypoint`/`@task`) is a thin imperative skin over the
*same* Pregel runtime: `@entrypoint` compiles to a one-node graph, and `@task` durably memoizes by writing its result
to a `RETURN` slot in `pending_writes`, so on resume the cached write is replayed instead of re-executing —
structurally identical to DBOS's `operation_outputs` step-log.

### Send: fan-out + channel-based fan-in

`[Send("node", state) for x in items]` appends each `Send` to the reserved `Topic(Send, accumulate=False)` channel
(`main.py:803-808`); next superstep `prepare_push_task_send` materializes one independent task per index, each with its
own state and a deterministic `task_id` hashed over `(ns, step, node, PUSH, idx)` (`_algo.py:961-997`). **Fan-in has no
join node and no collector** — each parallel invocation writes to a normal channel whose reducer aggregates (the
canonical `jokes: Annotated[list, operator.add]` concatenates all branch outputs). **Contrast Temporal's
slot-correlation:** Temporal matches each child completion to its initiated-event-id slot (correlation = authorization;
one initiation ↔ one completion). LangGraph has *no* per-child slot — child outputs are **anonymous and
order-insensitive**, merged by a commutative reducer. Cleaner for embarrassingly-parallel map-reduce (no bookkeeping,
deterministic ids give idempotent replay) but **weaker where you need to know *which* child produced *which* result** —
identity is lost the moment outputs hit the reducer.

### Subgraphs as nested first-class instances + the functional API

A compiled graph used as a node is a **full first-class instance** with its own checkpoints, nested by `checkpoint_ns`
path strings (`parent:childnode:taskid`, `_algo.py:615,988`, `_loop.py:322-333`) — independently resumable, own channel
state. Correlation is by **hierarchical name path** (the child's identity IS its position in the parent's namespace
tree, deterministically derivable, no slot), and state is shared parent↔child by *channel-name/schema overlap*. The
**functional API** compiles to the same runtime: `@entrypoint` builds a single-node `Pregel`; `@task` memoizes durably —
calling it schedules a PUSH task whose result is written to a `RETURN` channel in `pending_writes`, and on resume the
loop sees the recorded write and **short-circuits, returning the saved value without re-invoking the function**
(`_call.py:745-756`). This is **the same idea as DBOS `operation_outputs`** (step-output memoization for durable resume),
keyed by `(checkpoint, task_id, call_counter)` — but the positional `call_counter` is more fragile than DBOS's stable
`function_id` if you reorder `@task` calls.

### LEARN / AVOID / ORTHOGONAL (L4)

**LEARN**
- **Spawn-as-write-to-a-reserved-reducer-channel** — making fan-out *just an append to a durable channel* means spawn is
  automatically captured by the checkpoint with zero extra spawn-correlation machinery; the pending sends *are* the
  durable spawn ledger.
- **Deterministic child identity from a hashed path** (`task_id` over `(ns, step, node, PUSH, idx)`; subgraph ns nesting)
  — identity is *derived, not allocated*, so replay is idempotent and no id-allocation step is needed. Directly relevant
  to v3's spawn-correlation write-back contract.
- **Resume-replay memoization via a RETURN slot** — a child/step's output is its own resume token; mirrors DBOS and
  validates v3's durable-progress-ledger direction.
- **One runtime, two surfaces** (graph DSL + imperative both → Pregel) — strong argument that v3 should keep *one* kernel
  and offer the imperative API as sugar, not a parallel engine.

**AVOID**
- **Channel-reduction as the *only* fan-in model** — anonymous reducer merge loses child→result identity; v3 should not
  make this the sole mechanism. Temporal's initiated-event-id slot exists precisely so a parent can address a specific
  child's result and authorize exactly one completion. For verifiable fan-in (Superpowers' partition-then-verify), provide
  an explicit correlation slot *or* mandate keyed reducers — don't rely on `operator.add`.
- **Positional `call_counter` task sequencing** — fragile across code edits between checkpoint and resume; v3 should key
  recorded results on stable content/correlation ids, not execution position.

**ORTHOGONAL** — the BSP/Topic-flatten internals; `entrypoint.final(value/save)` return/checkpoint decoupling ergonomics.

---

## L0a/L0c — Replay, Recovery & Determinism Semantics

**3-sentence verdict.** LangGraph's recovery model is **NOT event-sourced replay** — it is
**completed-task-skip via durable pending-writes**: on resume it re-prepares the entire current superstep's task list,
restores recorded channel-writes for any task that *completed successfully* (so the runner skips it), while any task
that was mid-execution, failed, or interrupted **re-runs from the start**. The unit-of-recovery is therefore the
**whole graph node** (`task.proc.invoke(...)`), and LangGraph carries the **determinism hazard Temporal warns about**: a
node that did an LLM call / side-effect and then crashed before committing will re-execute that LLM call and side-effect
verbatim on resume. The **functional `@task`/`call()` API is LangGraph's escape hatch** — it promotes a sub-step into
its own checkpointed task whose RETURN value is recorded-not-replayed (genuine DBOS-style memoization) — but it is
**opt-in and only applies to code the author explicitly wraps**; ordinary graph nodes get node-granularity recovery only.

### The mechanism + the hazard + whether @task fixes it

The completed-node skip: `_reapply_writes_to_succeeded_nodes` (`_loop.py:724-737`) copies each recorded write back onto
its task; the runner saves a write for *every* completed task (even a `NO_WRITES` marker, `_runner.py:609-611`), so a
completed node always leaves a durable write and is skipped on resume (its output replayed as `cached=True`). **The
hazard is explicit:** the reapply step deliberately skips ERROR/INTERRUPT/RESUME writes "so that failed/interrupted tasks
remain with empty writes and will be re-executed" (`_loop.py:729-735`), and retry calls `task.writes.clear()` at the top
of *every* attempt (`_retry.py:615`). So a node that does `llm.invoke(...)` then a DB write then crashes → re-runs from
line 1: the LLM call re-fires (a *different* completion) and the DB write re-executes. **Every side-effect before the
crash/interrupt point inside that node repeats.** `@task` fixes it for wrapped code — `call()` gives each invocation a
deterministic position-based id and memoizes its RETURN value, so a wrapped LLM call is run once and returned-from-history
on resume (`_runner.py:745-756`) — genuine record-not-replay. **But it is opt-in and positionally-keyed:** the unit
shrinks only as far as the developer wraps things in `@task`; unwrapped side-effects in an entrypoint or plain node
re-execute, and the positional `call_counter` silently misaligns if pre-step control flow diverges across resume.

Retry is node-level (re-runs the whole node; defaults `max_attempts=3`, exponential backoff). Durability modes
(`sync`/`async`/`exit`) modulate *when* checkpoints flush — `exit` writes only at graph exit, so a mid-run crash re-runs
everything; they tune *how much re-execution happens*, not *whether non-deterministic work is replayed*.

### The verdict for v3

**LangGraph both validates and demonstrates the cost of v3's record-not-replay bet.** It *validates* it because `@task`
independently re-discovers DBOS-style record-not-replay as the *correct* answer for non-deterministic steps. It
*demonstrates the cost* because the default node-granularity recovery carries the precise determinism hazard for LLM
workloads, and its fix is opt-in and positionally-keyed. **v3's choice to make record-not-replay the ONLY model — every
LLM actor output an atomic, content-addressed, never-replayed commit — is the stronger, safer design; LangGraph is the
real-world demonstration of what goes wrong when record-not-replay is optional rather than foundational.**

### LEARN / AVOID / ORTHOGONAL (Determinism)

**LEARN**
- **The `@task` pattern is the closest external validation of v3's record-not-replay bet** — assign a stable id to a
  non-deterministic step, run it once, checkpoint the *result*, return it without re-running on resume. v3's "commit = the
  recorded result of an LLM actor, never replayed" is the same mechanism made *mandatory and the only path*. LangGraph
  proves it works and is performant.

**AVOID**
- **Do NOT adopt the node/superstep as the recovery unit** — for LLM actors a resumed run can produce a different
  completion and double-fire side-effects (the exact Temporal hazard). v3 should make the **LLM-call boundary the atomic
  commit boundary** (every actor output a committed, never-replayed record) rather than relying on authors to wrap calls.
  `@task` being opt-in is the trap.
- **Positional memoization keys** — break if pre-step control flow diverges across resume; v3 should key recorded results
  on stable content/correlation ids, not execution position.

**ORTHOGONAL** — durability modes and node-level RetryPolicy are useful operational knobs but, under v3's record-not-replay
model, would only affect *when commits flush*, not actor re-execution.

---

## Consolidated Direction for v3

| v3 level | What LangGraph contributes | Verdict |
|---|---|---|
| **L0a execution** | The superstep barrier = transition-commit (apply_writes + checkpoint); commit-based, snapshot-family (CHASM-like). | **Validates the commit-based bet in production.** Adopt the commit shape; reject BSP global-barrier + single-process concurrency. |
| **L0a durability** | Pending-writes log keyed `(checkpoint_id, task_id)` with content-addressed ids = the idempotency ledger; full-snapshot-per-superstep + blob-dedup. | **Adopt the pending-writes ledger + content-addressed ids + restore-as-fork.** Reject full-snapshot-as-primary-record (use materialized-aggregate + ledger). |
| **L0a concurrency** | Single-process single-writer; `versions_seen` per-channel; global max+1 version counter. | **The gap v3 closes: persisted per-instance expected_version CAS + idempotency ledger for true leaderless concurrency.** |
| **State model** | Typed reducer channels (Annotated[type, reducer]); concurrent-merge taxonomy. | **Adopt state-field = typed reducer; concurrency opt-in per field.** Fix the global version counter + enforce reducer associativity. |
| **L4 fan-in** | NamedBarrierValue (fan-in as crash-safe state); Send→reducer (anonymous map-reduce). | **Adopt the barrier-channel-as-state model** (third option alongside Temporal's slot + Superpowers' partition-then-verify). Reject anonymous channel-reduction as the *only* model — keep identity. |
| **L4 spawn / imperative** | Spawn = write to a reserved channel (durable spawn ledger); deterministic hashed child ids; @task = DBOS-style memoization; one runtime two surfaces. | **Adopt spawn-as-durable-write + derived ids + one-kernel-two-surfaces.** Reject positional memoization keys. |
| **L3 human gate** | interrupt() = resumable-exception + node replay; unaudited resume value. | **Anti-example.** Adopt mandatory-checkpointer + pending/resolved reconciliation + id-keyed parallel gates; reject node-replay-on-resume and persist an audited decision, not just the answer. |
| **L0c determinism** | Default node recovery has the determinism hazard; @task fixes it but opt-in. | **The sharpest validation: make record-not-replay the ONLY model** (mandatory, content-keyed), not an opt-in `@task`. |

## Reconsiderations for v3

1. **LangGraph confirms the architecture is right — the convergence is striking.** Of all ten studies, LangGraph made the
   most v3-aligned choices independently: a transition-commit (the superstep barrier), an idempotency ledger (pending-writes),
   content-addressed step/child ids, typed state with per-field merge, and DBOS-style record-not-replay (`@task`). The owner's
   instinct ("the orchestration looks similar") is correct, and the alignment is strong corroboration that v3's resolved central
   bet (commit-based, not replay-based) and its idempotency-ledger direction are sound. v3 is not inventing a novel orchestration
   model; it is taking the LangGraph/DBOS/CHASM commit-based model and making it **distributed, leaderless, and
   record-not-replay-by-default.**

2. **The four things LangGraph stops short of ARE v3's value-add — and the study maps them precisely.** (a) *Distributed
   leaderless concurrency:* LangGraph is single-process-single-writer; v3 needs persisted per-instance `expected_version` CAS +
   the idempotency ledger. (b) *Mandatory record-not-replay:* LangGraph's `@task` is opt-in, so its default path has the
   determinism hazard for LLM nodes; v3 makes every LLM-call boundary an atomic, content-addressed, never-replayed commit. (c) *An
   audited human-decision record:* LangGraph's interrupt resume is an opaque value consumed positionally; v3 records who/when/what
   validated (paperclip/Temporal). (d) *An idempotency-ledger-as-truth durability model:* LangGraph snapshots full state per
   superstep; v3 keeps a materialized aggregate as the view and the ledger as the truth. These four are exactly the gaps between "a
   great single-process agent library" and "a distributed-workflow kernel for LLM actors."

3. **The fan-in question now has three distinct models — v3 should combine them.** Temporal: an initiated-event-id *slot*
   (correlation = authorization, one-to-one, identity-preserving). LangGraph: a *barrier channel* (fan-in as crash-safe resumable
   state, "all N named writers seen") plus anonymous *reducer* map-reduce. Superpowers: *partition-then-verify* discipline. v3's L4
   should take the slot for *identity-preserving, authorized* fan-in (where "which child" matters), the barrier-channel idea for
   *crash-safe join state*, and keep reducer-merge only where outputs are genuinely interchangeable — and never rely on anonymous
   reduction where identity matters (LangGraph's one real weakness here).

4. **interrupt() is the cleanest demonstration of why v3's human gate must suspend-not-replay.** LangGraph's interrupt re-runs the
   whole node on resume, so any pre-gate LLM call or side-effect repeats — the determinism hazard surfacing in the L3 layer. This
   is independent corroboration that v3's human gate must follow Temporal/paperclip: park the instance at a boundary (no replay of
   effects), record an audited decision artifact, and resume forward — exactly the `human_gate` design the convergence work already
   established. LangGraph shows the failure mode of the alternative.

5. **A meta-point: the closest analogue is the most validating study, not the most novel.** Earlier studies added new dimensions
   (Honcho's perspectival memory, Temporal's CHASM). LangGraph adds little *new* — its value is that an independently-designed,
   widely-adopted engine converged on v3's core choices, which de-risks them, and that its *omissions* precisely delineate v3's
   contribution. This is the natural last research input before convergence: the field's closest existing system says "yes, this
   shape works — and here is exactly what you'd add to make it a distributed kernel for LLM actors."

## Caveats

- **A library, not a distributed service.** Many "AVOID" verdicts (single-process concurrency, global version counter,
  full-snapshot durability) mean "appropriate for an in-process Python library, insufficient for v3's distributed-kernel goals,"
  not "wrong." LangGraph is excellent at what it is; the study judges it against v3's distributed bar.
- **Two execution surfaces, one runtime.** Findings distinguish the graph DSL (node-granularity recovery, the determinism hazard)
  from the functional `@task` API (DBOS-style memoization). The hazard verdict is about the *default* graph-node path; `@task` is the
  (opt-in) mitigation — both are characterized so v3 doesn't conflate them.
- **Focused reads on a large repo.** The original six-agent pass read the load-bearing files (`pregel/_loop.py`,
  `_algo.py`, `_runner.py`, `_call.py`; `channels/*`; `checkpoint/base` + postgres; `types.py`). The later
  ten-lens second pass widened coverage to lifecycle/recovery, concurrency, runtime adapters, policy/security,
  scheduling, streaming/observability, memory/context, operator UX, and modularity. The orchestration/durability/
  determinism findings are high-confidence; the full server implementation was still not present in this checkout.
- **Same-recent HEAD.** Analyzed at `711b315`, pushed 2026-06-19 — an actively-developed library. Line numbers are a snapshot.
