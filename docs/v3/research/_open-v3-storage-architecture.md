# Open Topic - V3 Storage Architecture

Date: 2026-06-27
Status: draft open research note

## Question

V3 already defines several important storage semantics: atomic instance commits,
transcript-as-ledger idempotency, durable evidence refs, read-model projections,
observable streams, archive/purge tombstones, and runtime-context lifecycle. But
the full storage architecture is not yet spelled out.

The question is not only "which database should v3 use?". The more important
question is how to separate authority, evidence, projections, streams, runtime
storage, and operational indexes so the kernel remains correct while the system
can grow from local prototype to org-scale deployment.

## Current conclusion

Treat v3 storage as a set of authority planes with explicit contracts, not as one
undifferentiated database.

The core invariant remains:

```text
canonical workflow truth = instance state + transcript + idempotency ledger,
committed atomically under CAS
```

Everything else should be classified by whether it is canonical, referenced
evidence, rebuildable projection, operational stream, tombstone/index, or
runtime-provider-local state.

## Already decided by the core model

### Atomic canonical commit

The L0a kernel commits instance state and transcript together under
`expected_version` / CAS. Transcript append and state update are one logical
commit, not two best-effort writes.

This is the storage foundation. A CAS failure must not leave a transcript entry
without the matching state update, or a state update without the matching
transcript entry.

### Transcript-as-ledger idempotency

For committed operations, the transcript is the default idempotency ledger:

```text
UNIQUE(instance_id, op_id)
```

The ledger stores the canonical operation `payload_digest` alongside the op id.
That lets the kernel distinguish:

```text
same op_id + same digest      -> Duplicate
same op_id + different digest -> op_id_collision / contract error
```

Version CAS and the op ledger are distinct guards: CAS prevents stale lost
updates; the ledger prevents redelivery from applying twice.

### Store stays dumb

The store should enforce CAS, uniqueness, durability, and retrieval. It should not
know workflow semantics. The kernel owns the meaning of transitions, lifecycle,
gates, decisions, waits, and routing.

### Evidence by reference, not inline blob

The transcript may carry small structured outcomes and refs, but logs, test
artifacts, screenshots, large diffs, vendor traces, and process outputs belong in
a durable evidence/artifact store.

This keeps canonical records small and makes purge/closure rules explicit.

### Read models are projections

The UI, CLI, and API should read stable projections such as instance summaries,
timelines, current requests, graph annotations, and evidence lists. Those
projections are not authoritative. Mutations must go back through kernel ingress.

### Archive / purge is a storage lifecycle

Archive/export/purge are operator/ops commands, not workflow-declared behavior.
Hard purge writes a tombstone/manifest before deleting closure-owned records, so
cleanup can be re-driven even after the full run record is gone.

## Proposed storage planes

### T1 - Canonical run store

Owns:

- workflow instance row/state;
- transcript entries;
- idempotency ledger (`instance_id`, `op_id`, `payload_digest`);
- per-instance version / CAS authority;
- wait state, current step, lifecycle status, child links, runtime-context state
  when those are part of the kernel model.

Properties:

- strongest consistency requirement;
- one atomic logical commit per transition;
- append transcript + update state together;
- no large blobs;
- source of truth for workflow state.

Possible prototype shape: one SQLite database with tables for instances,
transcript entries, and op ledger. Possible org shape: Postgres with the same
transactional boundary.

### T2 - Definition and configuration store

Owns:

- templates and pinned resolved definitions;
- AgentConfig;
- catalog resources such as context blocks and findings vocabularies;
- project config / definition-resolution inputs where applicable.

Properties:

- mostly immutable or versioned;
- referenced from T1 by pinned ids;
- a run should record enough definition identity that future reads know exactly
  what definition/config was active.

Open point: whether resolved definitions live in the same physical database as
T1 for the prototype or in a separate definition catalog later.

### T3 - Evidence and artifact store

Owns:

- gate logs and process outputs;
- test results and command metadata;
- screenshots, diffs, vendor transcripts, large JSON, uploaded traces;
- any external or binary artifact referenced by an `evidence_ref`.

Properties:

- content-addressed or ref-addressed;
- evidence refs are stored in T1 transcript entries or gate decisions;
- purge uses a closure manifest so owned blobs do not dangle;
- shared/dedup evidence ownership is a later design topic.

Important rule:

```text
T1 carries the evidence reference and enough structured summary;
T3 carries the heavy artifact.
```

### T4 - Read models and projections

Owns:

- instance list/search views;
- workflow graph projection with current position;
- timeline rows;
- current request projections;
- child/session tree projections;
- evidence indexes for UI display.

Properties:

- rebuildable from T1/T3 where possible;
- optimized for UI/API queries;
- never authoritative for mutations;
- may be materialized tables, in-memory caches, or generated on read in the
  first prototype.

This plane connects to
[`_open-v3-workflow-inspector-ui.md`](_open-v3-workflow-inspector-ui.md) and
[`_open-v3-core-api-surface.md`](_open-v3-core-api-surface.md).

### T5 - Observe stream and durable replay

Owns:

- observable event envelopes;
- addressed stream offsets;
- replay/live-tail cursor semantics;
- terminal markers and gap markers.

Properties:

- consumers should be able to join through a `history_plus_stream()`-style
  primitive;
- live push and durable replay are related but not identical media;
- stream events should be typed and versioned;
- slow consumers, reconnect, and lag must be explicit.

Open point: T5 may derive from T1 transcript directly at first, but the contract
should not assume that a live WebSocket cursor is a durable replay cursor.

### T6 - Ops index, tombstones, and coarse audit

Owns:

- `run_index` / tombstones for purged or archived runs;
- closure manifests for re-drive after hard purge;
- coarse global audit floor;
- cost ledger and operational metrics that may survive purge.

Properties:

- survives removal of the full run record where required;
- not a replacement for T1 while the run is live;
- supports listing/ops queries later;
- must be careful about what survives privacy-sensitive purge.

### T7 - Runtime-provider-local storage

Owns:

- worktree / sandbox files;
- vendor-local transcripts such as Claude JSONL;
- tmux pane state, terminal buffers, native app-server session files;
- provider-local continuation ids and caches.

Properties:

- useful for observation, adapter recovery, and debugging;
- not canonical workflow truth unless explicitly imported as evidence or an
  actor emit;
- may be deleted or released by runtime-context lifecycle;
- must not be the only copy of a load-bearing workflow fact.

This plane connects to
[`_open-agent-runtime-and-pane-layout.md`](_open-agent-runtime-and-pane-layout.md).

## Canonical vs rebuildable vs external

A useful rule of thumb:

```text
canonical: cannot be lost without losing workflow truth
referenced: needed as evidence/artifact, but addressed by durable refs
rebuildable: can be regenerated from canonical records
external/local: belongs to a provider unless imported into the kernel
```

Examples:

| Item | Classification |
|---|---|
| instance version/current step/wait state | canonical T1 |
| transcript entry with `op_id` | canonical T1 |
| `payload_digest` for an op | canonical T1 |
| pinned template ref | canonical T1 -> T2 |
| process gate log | referenced T3 |
| UI timeline row | rebuildable T4 |
| WebSocket live cursor | operational T5, not durable authority |
| purge tombstone and manifest | ops authority T6 |
| tmux pane bytes | runtime-provider-local T7 |
| Claude vendor JSONL | runtime-provider-local unless imported as evidence |

## Local-first and org-scale shapes

The storage contract should be independent from the first physical deployment.

Possible local prototype:

```text
SQLite for T1/T2/T4/T6
filesystem directory for T3 artifacts
in-process event emitter plus transcript replay for T5
workspace directories for T7
```

Possible org deployment:

```text
Postgres for T1/T2/T4/T6
object/blob store for T3
durable stream or replay-capable event table for T5
remote runtime providers for T7
```

The important thing is not to choose the final infrastructure too early. The
important thing is to keep the transactional boundary and reference contracts
clear enough that a local implementation can be promoted later.

## Event-sourcing caution

V3 has a transcript, but it is not trying to be full event sourcing.

The hot path uses materialized instance state guarded by CAS. The transcript is
the audit/idempotency/provenance ledger and a source for projections and
diagnostics. Actor outputs are record-not-replay: nondeterministic actor calls are
not replayed to reconstruct truth.

So the storage model should not drift toward:

```text
replay every actor/tool step to recover state
```

The intended shape is closer to:

```text
commit materialized state + transcript atomically;
derive projections and audits from committed facts;
never replay nondeterministic actors as recovery.
```

## Open questions

1. What is the first runnable prototype substrate: SQLite + filesystem, Postgres
   + filesystem, or Postgres + object store?
2. Should T1 transcript entries and op ledger be one table, or separate tables
   with a shared transaction?
3. What is the canonical `payload_digest` algorithm and where is canonicalization
   implemented?
4. How are evidence refs typed, validated, and garbage-collected?
5. Which read models should be materialized in the first prototype versus derived
   on demand?
6. Is T5 initially just transcript replay + live notifications, or a separate
   durable observable-event table?
7. How should archive/export formats relate to T1/T3 without becoming the
   preservation authority?
8. What minimal migration/versioning story is needed for local prototypes before
   storage schemas start moving quickly?
9. Where do dynamic `ActorSessionRef` records belong if that model is adopted:
   T1 as kernel state, T7 as adapter-local state, or a split between the two?
10. What storage surfaces are allowed to cross a future private-data/federation
    boundary?

