# Honcho Study — The Perspectival Memory Engine (the L11/L12 Reference)

Date: 2026-06-19

## Purpose

This note captures what Pairflow v3 can learn from **Honcho**
(`plastic-labs/honcho`), a **dedicated memory engine for stateful agents** — "memory
infrastructure for building stateful agents that understand changing people, agents,
groups, projects, and ideas over time." You store messages on a session, Honcho reasons
in the background to derive conclusions about each *peer*, and you query a peer's
representation, a hybrid search, or a natural-language ("dialectic") answer from any model.

It is the **only purpose-built memory engine in the study series**, and it is the engine
that the prior-studied **Hermes** *delegated its user-modeling to* (Honcho was Hermes's
optional remote "dialectic user modeling" backend). So this study examines directly the
thing Hermes outsourced — making it the authoritative reference for the two least-covered
dimensions in the series: **L11 (memory scopes & retrieval)** and **L12 (metacognition /
learning)**. As a bonus, Honcho is Postgres-backed with a real background derivation
*queue*, so it also yields a seventh data point on the durability spectrum.

Compact, well-factored core: the service is a FastAPI server with the interesting logic
concentrated in `src/` (~30K of the repo's ~124K Python LOC; the rest is SDKs, tests,
examples).

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/honcho` (analyzed at HEAD `a2adeb9`, pushed 2026-06-19)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)
- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself

Seventh in a series. Read alongside:

- [`omnigent-study.md`](omnigent-study.md) — meta-harness; "L4 child = full instance"; weak kernel.
- [`symphony-study.md`](symphony-study.md) — OTP orchestrator; skipped L0a; unaudited human gate.
- [`paperclip-study.md`](paperclip-study.md) — durable Postgres kernel; `FOR UPDATE`+CAS checkout; credential broker; audited decisions.
- [`dbos-study.md`](dbos-study.md) — the canonical L0a reference; one primitive (deterministic id + `INSERT … ON CONFLICT` + memoized replay) gives exactly-once.
- [`hermes-agent-study.md`](hermes-agent-study.md) — channel/memory/skills reference; flat-Markdown profile-global memory, forked-reviewer L12; **delegated dialectic user-modeling to Honcho**.
- [`vibe-kanban-study.md`](vibe-kanban-study.md) — human-review board; `MsgStore` observe-seam; git-anchored checkpoints; durable execution_process rows but no op-log/idempotency.

> Method: the original study used six parallel sub-agent analyses, each mapping one
> slice onto specific v3 levels, with `file:line` citations relative to the repo root.
> A later second-pass audit used ten fresh source-only lenses before rereading this
> report: durable state, lifecycle/recovery, concurrency/ownership, runtime adapters,
> policy/security, fan-out/scheduling, events/streaming, memory/context, operator UX,
> and modularity/extensibility. The core is compact enough that both passes could read
> the load-bearing files thoroughly (`src/models.py`, `src/deriver/*`, `src/reconciler/*`,
> `src/dialectic/*`, `src/dreamer/*`, `src/llm/*`, `src/crud/*`, SDK/CLI/MCP surfaces).

## Executive Summary

Four load-bearing findings.

> **1. Honcho is the L11 reference — memory as a *directed edge*, not a node attribute.**
> Every observation is keyed by an `(observer, observed)` peer pair (`models.py:339-340`),
> so memory is "*who* believes *what* about *whom*." Self-model (`observer == observed`) and
> **theory-of-mind** (`observer != observed`, peer X's model of peer Y) unify under one
> mechanism. A single observation lives at a 5-coordinate address
> `(workspace, observer, observed, session|NULL, level)` — two of those axes (the
> perspectival `(observer,observed)` axis and the episodic `session|NULL` axis) are exactly
> what Hermes lacked and outsourced. Hermes's flat-Markdown profile-global memory occupies
> only the degenerate point of this space. **This is the most important single thing in the
> study for v3's L11.**

> **2. L12 is a two-speed structured learning loop — and the part that looks most
> sophisticated is theater.** The hot path (the **deriver**) does cheap, constrained
> extraction of *explicit atomic facts only* (one JSON LLM call per batch, no memory of
> prior conclusions). A separate, threshold+idle-triggered **dreamer** later reasons over
> the accumulated fact store to produce typed **deductive / inductive / contradiction**
> conclusions with required `source_ids` provenance. Reconciliation is **structural**
> (embedding-dedup ≥0.95 → keep-information-richer + a `times_derived` reinforcement
> counter), not LLM-rewrite. **But** the dreamer's headline "surprisal + cover-tree / LSH /
> RP-tree" machinery is **off by default** (`SurprisalSettings.ENABLED = False`; the default
> tree is a plain kdtree), runs on ≤200 ephemeral embeddings, and produces only non-binding
> "hints." Stripped of it, the dreamer *is* a more refined Hermes curator. The honest lesson:
> adopt the two-speed loop and the structural reconciliation; **do not cargo-cult the
> surprisal vocabulary** — pgvector ANN gives the identical signal.

> **3. The async kernel lands between paperclip and DBOS — with the same idempotency hole,
> and an outbox/reconciler that *admits* it.** Honcho's derivation queue is a Postgres table
> of immutable work records, claimed by a **lease-row-as-partition-mutex** (`INSERT … ON
> CONFLICT DO NOTHING` on `active_queue_sessions`, a UNIQUE `work_unit_key` —
> `queue_manager.py:407-431`), giving per-session serialization *without* `FOR UPDATE`. But
> the hot path has **no idempotency key**, a **two-transaction "do work, then mark
> processed"** (→ at-least-once on crash), and a **terminal mark-failed with no retry/
> dead-letter**. The tell: a **separate reconciler** (`sync_vectors`, with a real
> `sync_state`+`sync_attempts`+backoff state machine) exists specifically to heal missed
> vector writes — an outbox/reconcile pattern that openly concedes the main queue does *not*
> guarantee the side-effect landed.

> **4. L0c finally has its immutable-`AgentConfig` reference.** Honcho's `ModelConfig`
> (`config.py:238-294`) is the flat, serializable, immutable-by-copy run-intent value object
> *with `transport` as a field* (the value selects its own backend) that Hermes conspicuously
> lacked. Two tiers: a persisted `ConfiguredModelSettings` holding secret *references* →
> resolved at the boundary into a runtime `ModelConfig` with injected credentials. Per-task
> model routing is config-resolution pushed to call sites, keeping the adapter task-blind.

Kernel-spectrum placement (now seven projects):

```
symphony (no L0a) ── hermes ── vibe-kanban ── HONCHO ── paperclip ──── DBOS
```

Honcho edges above vibe-kanban (a real partition-mutex + the outbox reconciler give it more
durability machinery) but sits below paperclip (no `FOR UPDATE`+CAS on the work row, no
exactly-once) and far below DBOS. The recurring pattern across hermes/vibe-kanban/honcho is
now unmistakable: **a Postgres/SQLite queue without DBOS-grade `(instance_id, op_id)`
idempotency is at-least-once, and everyone patches the gap downstream instead of closing it
at the source.**

The synthesis line for the series so far:

> **v3 = DBOS's kernel discipline + paperclip's control-plane mechanics + Hermes's
> outer-layer breadth + Vibe Kanban's observe-seam & git-anchored checkpoints + Honcho's
> perspectival memory model (L11), two-speed structured learning loop (L12), and immutable
> `ModelConfig` (L0c) — with the audit ledger, the credential broker, the
> result-correlation/fan-in, and the fuzzy-correlation layer that none of the seven got
> fully right.**

---

## Second-Pass Audit Deltas

The ten-lens second pass confirmed the main verdicts, but added several findings that the
original memory-focused study underweighted:

1. **Message ordering has a narrow, useful concurrency primitive.** `create_messages()` takes
   `pg_advisory_xact_lock(hashtext(workspace), hashtext(session))` before assigning
   `seq_in_session`, then the DB also enforces uniqueness on
   `(workspace_name, session_name, seq_in_session)` (`src/crud/message.py:237-261`,
   `src/models.py:258`). This is a concrete v3 pattern for linear transcript/event numbering:
   lock the aggregate, not the world, and back the lock with a uniqueness invariant.

2. **The `work_unit_key` is a domain correlation key, not just an implementation id.**
   Honcho has explicit key constructors for representation, summary, dream, webhook,
   deletion, and reconciler jobs (`src/utils/work_unit.py:44-71`). This sharpens the L0a/L6
   lesson: v3 should name the partition/correlation key in the task spec itself, so dedupe,
   queue ownership, operator status, and fan-in all speak the same domain language.

3. **API-triggered background work has an outbox gap before it even reaches the queue.**
   Message creation commits primary rows, then FastAPI `BackgroundTasks` enqueue the deriver
   and immediate embedding work (`src/crud/message.py:308`, `src/routers/messages.py:123-147`).
   If the process dies between commit and background enqueue, the message exists but the
   derived work may never be scheduled. The original queue critique still stands, but v3
   should also close this earlier boundary with same-transaction outbox writes for critical
   derivations.

4. **Security is capability-token scoped, but not actor/principal rich.** `require_auth()`
   centralizes Bearer JWT decoding and checks admin/workspace/peer/session scopes
   (`src/security.py:115-192`), and admin-only key creation issues explicitly scoped tokens
   (`src/routers/keys.py:17-45`). However, disabled auth returns admin capability
   (`src/security.py:166`), no revocation registry was found, route-level manual create checks
   can drift, and MCP/API share the same Bearer capability without a distinct human-vs-agent
   authority model. v3 should keep the capability hierarchy, but bind it to durable actors,
   revocation, and tool-specific authority/confirmation policy.

5. **Events are two separate systems: product webhooks and telemetry CloudEvents.** Product
   webhooks are queued (`task_type="webhook"`) and HMAC-signed, but the payload is only
   `{type,data,timestamp}`, with no event id, delivery attempt, retry count, or per-endpoint
   delivery log (`src/webhooks/events.py:46-71`, `src/webhooks/webhook_delivery.py:33-94`).
   Telemetry, by contrast, uses typed CloudEvents with deterministic ids, schema versions,
   categories, run-id sampling, batching, shutdown flush, and Prometheus health metrics
   (`src/telemetry/events/base.py:17-109`, `src/telemetry/emitter.py:30-339`). v3 should not
   conflate these: lifecycle/product events need the delivery rigor that Honcho mostly gives
   telemetry, not only best-effort webhook POSTs.

6. **SSE streaming is intentionally a text-delta UX, not an observe-seam.** The dialectic
   streaming API emits simple `data: {"delta":{"content":...},"done":false}` chunks followed
   by `done=true` (`src/routers/peers.py:193-202`, `src/schemas/api.py:579-589`), after DB
   preflight is closed (`src/dialectic/chat.py:103-139`). It streams only the final synthesis,
   not tool/context events (`src/dialectic/core.py:472-511`), and has no `event:`, `id:`, retry,
   or resume contract. Good for chat UX; insufficient for v3's durable run observation API.

7. **Operator UX is stronger than the study said.** Honcho exposes queue status through API,
   CLI, SDK, and MCP, with global and per-session counts for user-facing task types only
   (`representation`, `summary`, `dream`) (`src/routers/workspaces.py:158-178`,
   `src/crud/deriver.py:78-214`, `mcp/src/tools/system.ts:46-51`). The CLI is explicitly an
   admin/debug tool, resolves config as flag -> env -> config -> default, auto-switches TTY
   tables vs JSON, emits structured errors, and has a doctor-style check
   (`honcho-cli/src/honcho_cli/main.py:57-87`, `honcho-cli/src/honcho_cli/output.py:35-82`,
   `honcho-cli/src/honcho_cli/commands/setup.py:209-257`). The caveat: queue `completed`
   is an operational count after cleanup, not an audit trail.

8. **The public API boundary is clean, but SDK contracts are hand-mirrored.** Backend public
   schemas alias external `id`/`peer_id` language away from internal `name`/`peer_name`
   (`src/schemas/api.py:97-246`), and SDK/MCP/CLI integrate through public APIs rather than
   backend internals (`sdks/typescript/src/api-version.ts:4`, `mcp/src/config.ts:55`,
   `honcho-cli/src/honcho_cli/common.py:68`). But TS and Python SDK API types are manually
   mirrored from Pydantic (`sdks/typescript/src/types/api.ts:1`,
   `sdks/python/src/honcho/api_types.py:1`), and no in-repo OpenAPI-to-SDK generation gate was
   found. v3 should make this either generated or CI-checked for schema drift.

9. **Queue payload contracts are validated late, not fully produced as typed commands.**
   Consumers validate Pydantic queue payloads with `extra="forbid"`
   (`src/utils/queue_payload.py:9-44`, `src/deriver/consumer.py:63-137`), but regular and
   upload message routes still build similar payload dicts by hand (`src/routers/messages.py:123`,
   `src/routers/messages.py:200`). v3 should use the same typed command factory on the producer
   side, not rely only on consumer validation.

10. **The LLM seam is cleaner than adjacent seams.** `ProviderBackend` + `CompletionResult` +
    provider-specific history adapters are good, but vector-store selection, embedding client
    branching, and webhook delivery are more hardcoded/global-singleton shaped. The v3 lesson is
    not just "make adapters"; it is "enforce the adapter pattern consistently at every volatile
    boundary."

---

## L11 — Memory Data Model & Scopes

**3-sentence verdict.** Honcho is a **peer-centric, observation-derived memory engine** where
memory is not a flat profile but a **directed graph of observations keyed by
`(observer, observed)` peer pairs** — every fact is "*who* believes *what* about *whom*,"
making theory-of-mind a first-class storage primitive. Raw `Message`s are ingested into a
session, an async deriver distills them into vector-embedded `Document`s organized into
`(observer, observed)` `Collection`s, surfaced publicly as **Conclusions** (deductive/
inductive), rolled up into static **Representations** and identity **PeerCards**, while
**Summaries** compress the raw stream. This **two-dimensional scope** (perspectival
`(observer, observed)` × episodic per-session-vs-global) decisively surpasses Hermes's
flat-Markdown, agent-curated, **profile-global-only** model: Honcho can address "Alice's
session-3 model of Bob" as a distinct, queryable, isolated cell — a coordinate Hermes
literally cannot name (which is exactly why Hermes delegates dialectic modeling to Honcho).

### Entity graph & scope hierarchy

The hard tenant boundary is **Workspace**; everything below is keyed by `workspace_name` and
FK-constrained to it.

```
Workspace (tenant root)                          models.py:96-126   name UNIQUE
  ├── Peer        (workspace_name FK)            models.py:129-163  UNIQUE(name, workspace_name)
  │     └── identity = name + JSONB config/metadata   (NO human/agent type discriminator)
  ├── Session     (workspace_name FK)            models.py:166-202  UNIQUE(name, workspace_name)
  │     └── Message (session+peer FK)            models.py:205-273  + seq_in_session ordering
  │           └── MessageEmbedding (HNSW)        models.py:276-331
  ├── session_peers_table  (M:N Peer↔Session)    models.py:41-93    + joined_at/left_at (temporal)
  └── Collection  (observer,observed,workspace)  models.py:334-375  UNIQUE(observer,observed,workspace)
        └── Document (the memory atom)           models.py:378-473  level + observer/observed + session_name(nullable)
```

The scope hierarchy is **four nested dimensions**: `Workspace` (tenant) →
`(observer, observed)` Collection (perspective) → `session_name` (episodic vs global) →
`Document.level` (raw → derived). **Peers are first-class for humans AND AI agents with no
type discriminator** (`models.py:130-148`) — an agent and a human are the same entity class,
both can be observer and observed. Peer↔Session is many-to-many with *temporal membership*
(`joined_at`/`left_at`, `models.py:72-82`).

### Theory-of-mind: the `(observer, observed)` collection keying — the L11 frontier

The standout idea, absent from every other studied project. A **Collection** is keyed by
exactly two peer names, `observer` and `observed` (`models.py:339-340`), unique per workspace
(`models.py:357-362`). **Self-model and cross-peer model are the same mechanism**, distinguished
only by whether the keys are equal:
- `observer == observed` → a peer's **self-representation** (what Honcho knows about Alice).
- `observer != observed` → **theory-of-mind** (what Alice believes about Bob).

The equality test is explicit in the peer-card label logic (`crud/peer_card.py:103-106`:
`"peer_card"` when equal, else `"{observed}_peer_card"`). Every Document and API-level
Conclusion carries the same `observer`/`observed` pair (`schemas/api.py:440-447, 483-484`),
and semantic queries *require* both keys (`routers/conclusions.py:111-114`). The retrieval API
exposes it directly: a representation is "for [target], from the perspective of this peer"
(`schemas/api.py:179-182`). **Memory in Honcho is a directed edge in a peer graph, not a node
attribute** — the addressable unit is *a belief held by one agent about another*.

### The memory artifact taxonomy

Five distinct artifact types, each keyed/scoped differently:

| Artifact | What it is | Storage | Keying / Scope |
|---|---|---|---|
| **Message** | Raw verbatim utterance | `messages` table | `(session, peer, workspace)` + `seq_in_session` |
| **Document** | Derived memory atom (embedded) | `documents` table | `(observer, observed, workspace)` + nullable `session_name` + `level` |
| **Conclusion** | Public-API view of a Document | = Document | `level` discriminates deductive/inductive |
| **Representation** | Static low-latency roll-up of conclusions | computed on read | `(observer, observed)`, optional `session_id` |
| **PeerCard** | Compact identity summary (`list[str]`) | **peer `internal_metadata` JSONB** | label `peer_card` / `{observed}_peer_card` |
| **Summary** | Rolling compression of the message stream | **session `internal_metadata`** | per-session, short/long |

The **Document `level`** is the reasoning ladder (`utils/types.py:240`:
`explicit | deductive | inductive | contradiction`). Deductive/inductive/contradiction
**require `source_ids`** linking premises (`schemas/internal.py:104-121`) — Documents form a
**provenance tree** (`source_ids` GIN-indexed at `models.py:461-466`; `times_derived` counts
semantic re-derivations = reinforcement). Inductive carries `pattern_type ∈ {preference,
behavior, personality, tendency, correlation}` + `confidence`.

### Scope dimensions (explicit Hermes contrast)

Memory is scoped on **two orthogonal axes simultaneously**: (1) **perspectival** —
`(observer, observed)` on the Collection/Document (absent entirely in Hermes); (2) **episodic**
— `Document.session_name` is *nullable* (`models.py:405`): non-null = session-scoped, **NULL =
global** ("NULL for global observations", `schemas/internal.py:63-66`). Plus the **tenant** axis
(`workspace_name`, structurally FK-enforced isolation, no cross-workspace query path). A single
observation lives at `(workspace, observer, observed, session|NULL, level)`. **Hermes occupies
only the degenerate point `(profile, ∅, self, NULL, explicit)`** of this space.

### LEARN / AVOID / ORTHOGONAL (L11)

**LEARN**
- **The `(observer, observed)` keying is the L11 prize.** v3's L11 should make memory a *directed
  edge* (who-believes-what-about-whom), not a node attribute. In a multi-agent kernel this maps
  cleanly: a worker holding a model of *another* worker, or of a *task entity*. Self-model and
  theory-of-mind unify via the `observer == observed` test — adopt that elegance.
- **Two orthogonal scope axes: perspectival × episodic, with a *nullable* session column** (NULL =
  promote a session-scoped fact to global). v3 should let a memory be run/conversation-scoped OR
  global with one nullable column, not two stores. This is the precise thing Hermes lacked.
- **Artifact stratification by derivation level + an explicit provenance tree** (`source_ids` +
  `times_derived`). v3 gets auditability for free: every derived conclusion links to its premises;
  reinforcement is counted, not overwritten.
- **Peer = uniform first-class entity for humans and AI** (no type discriminator) — the right call
  for a multi-agent kernel where workers and humans are the same memory citizen.
- **Workspace as a clean tenant root with structural (FK-enforced) isolation** rather than runtime
  filtering.

**AVOID**
- **Identity-summary / summary artifacts smuggled into JSONB metadata** (PeerCards in
  `peer.internal_metadata` under string-constructed labels; Summaries in `session.internal_metadata`).
  Schema-less, hard to index/migrate, label-collision-prone. Give such artifacts **first-class tables**.
- **Two parallel embedding pipelines** (`MessageEmbedding` *and* `Document.embedding`, each with its
  own HNSW index + sync-state machinery) — consolidate the vector-sync story.
- **Async derivation as the only path to usable memory** — raw messages are inert until the background
  deriver processes them, adding eventual-consistency lag between "stored" and "queryable." Decide
  consciously whether v3's memory is synchronous.

**ORTHOGONAL** — the queue/dreamer/reconciler machinery (a different kernel concern, covered below);
LLM-call telemetry / embedding cost accounting / webhooks; pgvector/HNSW tuning params.

---

## L12a — The Deriver Pipeline (reasoning / write path)

**3-sentence verdict.** Honcho's write path is a **continuous, session-ordered background queue**
that splits derivation into two stages: a fast, cheap **deriver** that extracts only *explicit
atomic facts* from new messages (one JSON LLM call per batch, no memory of prior conclusions), and
a separate threshold-triggered **dreamer** (next section) that reasons *over the accumulated fact
store* to produce deductive/inductive/contradiction observations with explicit source-linkage.
Reconciliation is not an LLM rewriting a document — it is a **structural, embedding-based
dedup-and-reinforce** operation (cosine ≥0.95 → token-richness compare → keep-superior + increment
`times_derived`), plus the dreamer's tool-driven "knowledge update → DELETE the outdated
observation" pass. This is a **two-speed learning loop**: ingestion (explicit, per-message) is
decoupled from consolidation (higher-order reasoning, count-triggered), with the fact store as the
contract between them.

### Trigger + task types + extraction shape

Every ingested message is enqueued (`deriver/enqueue.py:25, 293`), producing up to two task types:
**`representation`** (update peer representations — the L12 fact-extraction path, per-message with an
`observers` list + single `observed`, `enqueue.py:168`) and **`summary`** (session summaries on a
sequence modulo). Derivation is **continuous/data-triggered**: representation work is claimed once a
session's unprocessed messages accumulate `>= REPRESENTATION_BATCH_MAX_TOKENS` (`queue_manager.py:330-394`).

**The deriver emits `explicit` only.** The prompt asks exclusively for explicit atomic facts ("direct
quotes or clear paraphrases only, no interpretation," `prompts.py:58-77`); the structured output
hardcodes `deductive=[], inductive=[]` (`utils/representation.py:666-678`). One
`honcho_llm_call(response_model=PromptRepresentation, json_mode=True, retry_attempts=3)` per batch
(`deriver.py:146-163`), saved to every observer collection. **Deductive/inductive/contradiction are
produced by the dreamer, not the deriver** — and enforced structurally: deductive requires `source_ids`
(`internal.py:107-110`); inductive carries `pattern_type` + `confidence` keyed to source count
(`internal.py:91-97`); contradiction needs ≥2 conflicting sources.

### Ordering & reconciliation-with-prior-knowledge (the learning crux)

**Ordering is per-session, single-claimed, token-batched.** A work-unit key encodes
`(workspace, observed, observers)`; it is exclusively claimed via `INSERT … ON CONFLICT DO NOTHING`
into `ActiveQueueSession` (`queue_manager.py:407-431`), so one worker processes a given
session-representation stream at a time, walking messages **in id order** (`queue_manager.py:807-909`).
Per-session serialization + id-ordered batching — not a global total order; different sessions process
concurrently.

**Reconciliation is structural, not LLM-rewrite. Three mechanisms:** (1) in-memory literal dedup within
a batch (`utils/representation.py:338-372`); (2) **semantic dedup + reinforcement on write**
(`crud/document.py:970-1047`): cosine search at ≥0.95; if a near-duplicate exists, compare information
content by token-set richness — new richer → soft-delete existing & carry `times_derived`; existing
richer → **reject new, atomically increment `existing.times_derived`** (the "new evidence reinforces
old conclusion" loop, surfaced as ranking signal); (3) **dreamer-driven supersession** — the deduction
specialist detects a knowledge update and creates a deductive observation AND deletes the stale source
(`specialists.py:559-596`). Contradictions are *recorded as observations*, not auto-resolved.

**Idempotency / crash semantics:** not transactionally idempotent — documents commit before vector
upsert; a crash leaves `sync_state='pending'` docs a reconciler re-embeds. Re-running messages
re-extracts the same facts, but the semantic-dedup layer collapses them (reinforcing `times_derived`),
so the *fact store* converges even though the *pipeline* is at-least-once.

### LEARN / AVOID / ORTHOGONAL (L12a)

**Contrast with Hermes's forked-reviewer.** Hermes L12 = a second LLM instance forked every 10 turns,
reading raw conversation and writing freeform Markdown — periodic, counter-triggered, freeform,
append-mostly, no reconciliation. Honcho is the structured opposite: continuous + data-triggered
extraction; count-triggered consolidation; **typed structured conclusions (4 levels with source-linkage
+ confidence)** instead of Markdown; **active reconciliation** (semantic dedup, reinforcement counting,
supersession-by-deletion) instead of append.

**LEARN**
- **Split ingestion from consolidation (two-speed loop).** Cheap deterministic extraction on the hot
  path (one constrained JSON call, explicit-only); expensive reasoning deferred and triggered by
  *accumulated evidence*, not wall-clock. v3's "derive" primitive should emit cheap verifiable atoms
  synchronously; promote a separate idempotent "consolidate" task on a backlog threshold.
- **Make reconciliation structural, not prompt-based.** Embedding-dedup + a `times_derived` reinforcement
  counter gives convergence and confidence-by-repetition without asking an LLM to rewrite memory —
  replayable and cheap. The keep-the-information-richer rule is a clean deterministic merge policy.
- **Typed conclusions with required source-linkage** (`source_ids` mandatory for any derived conclusion)
  makes the knowledge graph traversable and auditable. v3's L12 facts should carry provenance edges as a
  hard schema invariant.
- **Break the feedback loop explicitly** (count only primary/explicit docs toward the consolidation
  trigger) — prevents a learning loop amplifying its own output.

**AVOID**
- **Embedding-similarity dedup is shallow reconciliation** — only catches near-literal paraphrases (≥0.95);
  contradictory-but-differently-worded facts coexist until the dreamer happens to inspect them ("I love
  coffee" / "I hate coffee" survive as two docs + a contradiction observation — *recorded*, never
  *resolved*). v3 should decide whether L12 stores conflicts or arbitrates them.
- **Non-transactional write path** (commit-then-embed; batch-error marks only item[0]) — fine for an
  eventually-consistent memory engine, but a *kernel* needs exactly-once or explicit at-least-once +
  idempotent-replay.
- **Two LLM stages with no metric feedback** — `confidence` is a heuristic of source-count, not of
  downstream usefulness. Still LLM-authored reflection, just structured.

**ORTHOGONAL** — the queue durability machinery (covered in L0a); peer-card writes, summary cadence,
multi-observer fan-out.

---

## L12b — The Dreamer (offline consolidation)

**3-sentence verdict.** Honcho's "dreamer" is an **idle-triggered, document-count-gated batch job** that
wakes two LLM "specialist" agents — a *deduction* agent and an *induction* agent — which freely tool-call
over a peer's accumulated observations to synthesize higher-level facts (logical implications,
contradictions, behavioral patterns) and write them back as new `deductive`/`inductive` observations plus
an updated peer card. The genuinely novel "surprisal + spatial trees" machinery is **not the trigger and
not the consolidation engine** — it is an *optional, off-by-default pre-filter*
(`SurprisalSettings.ENABLED = False`, `config.py:1146`) that, when enabled, ranks observations by
embedding-space novelty and hands the top 10% to the specialists as *non-binding hints*. Underneath the
impressive vocabulary, the actually-shipping dreamer is **structurally almost identical to Hermes's
timer-based curator** — a slow periodic auxiliary-LLM consolidation pass — and the cover-tree/LSH/RP-tree
apparatus is a research-grade bolt-on whose default code path (`TREE_TYPE = "kdtree"`) doesn't even use
the exotic structures.

### Surprisal: the trigger/gate

**Surprisal does NOT trigger dreams.** The trigger is a count+timer gate (`dream_scheduler.py:248-329`):
count *explicit-level* docs since the last dream (deliberately excluding dreamer output to avoid a feedback
loop, `:280-281`), schedule iff `>= DREAM.DOCUMENT_THRESHOLD` (default 50); an `asyncio` timer waits
`IDLE_TIMEOUT_MINUTES` (default 60) and a new qualifying event **cancels and reschedules** the pending dream
— so a dream only fires after the peer goes quiet (idle-consolidation, like Hermes's 7-day timer on a
shorter clock). Rate-limited by `MIN_HOURS_BETWEEN_DREAMS` (default 8); in-flight guard via a pending `dream`
QueueItem.

**Surprisal, when enabled, is a within-dream sampling gate, defined geometrically (not
information-theoretically over text):** `sample_observations_with_surprisal` (`surprisal.py:46`) fetches
≤200 observations, pulls their stored embeddings, builds a tree, scores each by `tree.surprisal(embedding)`,
min-max normalizes, keeps the **top 10%** as exploration "hints" injected into the specialist prompt as
"these topics may be worth investigating … But follow the evidence." Surprisal = embedding-space rarity of
a point relative to the local fact cloud (LSH: `-log(bucket collision density)`; cover/RP tree: path
self-information; prototype: distance to nearest centroid).

### The spatial trees: what they organize and why

Seven interchangeable `SurprisalTree` implementations behind one ABC (`base.py:37-63`), selected by string
config (`TREE_TYPE ∈ {kdtree, balltree, rptree, covertree, lsh, graph, prototype}`). They organize **the
embedding space of a single peer's recent observations** — they do *not* cluster facts into durable groups,
build no persistent hierarchy, and do not survive the dream: the tree is built fresh from ≤200 embeddings,
queried once per observation, and thrown away. Their sole output is a scalar novelty score. **There is no
defensible reason for the custom trees over pgvector ANN** — the task is "score the local novelty of ≤200
points already in memory," a single in-process kNN call. The bespoke trees look like a research exploration
("which spatial index best captures surprisal?") shipped behind a feature flag; the factory silently drops
a `k` kwarg 4 of 7 trees can't accept (`trees/__init__.py:32-39`), and HEAD itself carries a fresh bugfix
("Fix surprisal tree kwarg mismatch") — signs of an under-exercised subsystem.

### Specialists + what a dream produces (write-back)

Exactly **two specialists** (`specialists.py:758-761`), run **sequentially** (deduction first so induction
reads fresh deductive facts). Each is a fully autonomous tool-calling LLM agent (bounded loop of ≤12/10
iterations) with discovery tools then action tools. **Deduction** finds implications, knowledge updates
(create update + **DELETE the stale observation**), and contradictions; it is the **only** specialist
allowed to delete observations and to write the **peer card** (a strict identity store with four allowed
prefixes `IDENTITY:/ATTRIBUTE:/RELATIONSHIP:/INSTRUCTION:`). **Induction** finds behavioral
patterns/preferences across ≥2 sources with `pattern_type` + `confidence`; it **cannot** touch the peer
card. A dream produces new Documents at `deductive`/`inductive` level (linked to sources, through the same
dedup path as the deriver), optional deletions of superseded facts, and an optional peer-card rewrite — it
**appends higher-order facts and prunes stale ones; it does not reorganize storage**. On success it
atomically advances the `last_dream_at` + `last_dream_document_count` guard, re-arming the gate.

### LEARN / AVOID / ORTHOGONAL (L12b)

**LEARN**
- **The idle+threshold trigger is the right primitive** — a *work-count* gate (counting only *primary*
  artifacts, not consolidation output) + an *idle debounce* that cancels-and-reschedules on new activity =
  "consolidate when there's enough new material AND the workflow has gone quiet," no surprisal needed.
  Strictly more principled than Hermes's single fixed timer.
- **The anti-feedback-loop discipline is the load-bearing insight** — count only `explicit` docs toward the
  threshold; advance the baseline only on *successful* consolidation. Any v3 L12 consolidation must encode
  this or it spins.
- **Split consolidation by reasoning mode with explicit write-permissions** — deduction (can delete + write
  canonical identity store) vs induction (append-only patterns) is a clean, auditable division. A kernel
  consolidator should separate "rewrite/prune canonical state" from "append derived inferences," with the
  destructive role tightly scoped.
- **In-flight idempotency via the queue** (exactly-one pending consolidation per work unit) is the correct
  kernel pattern; don't rely on in-memory pending state alone.

**AVOID**
- **The surprisal + spatial-tree machinery.** Off by default, default tree is plain kdtree (so the exotic
  trees are dead on the default path), operates on ≤200 ephemeral embeddings, only effect is a non-binding
  hint string. Over-engineering: seven density estimators + a kwarg-dropping factory kludge + a fresh-HEAD
  bugfix, to produce "topics worth investigating" the agent may ignore. **pgvector ANN yields the identical
  signal.** Do not import this into a kernel.
- **Don't let "surprisal" imply information-theoretic rigor** — as implemented it's normalized
  embedding-distance/density, geometric not textual. The sophistication is largely nominal.

**ORTHOGONAL** — the peer-card identity store with prefix grammar (a domain-memory concern), though the
*pattern* ("consolidation maintains a small, strictly-typed canonical summary alongside the append-only
log") is worth noting as a design option.

> **Bottom line vs Hermes:** strip the surprisal layer (which the default config does) and Honcho's dreamer
> IS a more refined Hermes curator — idle-triggered, auxiliary-LLM, periodic GC + consolidation — with
> better trigger hygiene (count gate + idle debounce + anti-feedback baseline + queue idempotency) and a
> cleaner deduction/induction split. The surprisal+trees subsystem is novel territory but does not earn its
> complexity. **A genuinely useful study lesson: impressive machinery behind a feature flag is not evidence
> it's load-bearing — read the default config before copying the vocabulary.**

---

## L11b — Query / Retrieval: Dialectic, Representations & Search

**3-sentence verdict.** Honcho's retrieval is a *two-tier query surface over a derived-observation store*:
a low-latency **static representation** (rendered markdown of stored observations + a peer card) for cheap
injection, and a flagship **agentic "dialectic"** (`POST /peers/{id}/chat`) where an LLM *tool-calls its
way* through the memory — semantic prefetch, then iterative `search_memory`/`search_messages`/`grep`/
`reasoning_chain` calls — to synthesize a grounded natural-language answer. Crucially the "memory" searched
is not raw text but a typed reasoning tree (explicit → deductive → inductive → contradiction), so retrieval
is reasoning-aware: the agent can pull a conclusion and then traverse to its premises. Hybrid BM25+vector
fusion exists but only on the *message* substrate (RRF over pgvector + Postgres FTS); *observation* search
is pure vector similarity filtered by reasoning level.

### Dialectic chat: context assembly + tiered reasoning

The chat endpoint (`routers/peers.py:159`) delegates to `agentic_chat` (`dialectic/chat.py:20`): a
read-only preflight (validate peers, load config + peer cards), then it **closes the DB** and hands a
stateless `DialecticAgent` (`dialectic/core.py:52`) the work — the DB connection is *not* held while the
agent runs/streams. Context layers: (1) a large hand-tuned system prompt with observer/observed perspective
+ peer-card blocks; (2) recent session history up to `SESSION_HISTORY_MAX_TOKENS` (default 4096); (3)
**prefetched observations** — before any tool call, the query is embedded once and run through **two separate**
`search_memory` calls (one for `explicit`, one for `deductive/inductive/contradiction`) to avoid retrieval
dilution (`core.py:151-226`); (4) the tool loop.

**Tiered reasoning** (`ReasoningLevel = minimal|low|medium|high|max`). Each level is a `DialecticLevelSettings`
bundling `MODEL_CONFIG` + `MAX_TOOL_ITERATIONS` + `MAX_OUTPUT_TOKENS` + `TOOL_CHOICE` + prefetch depth — a
**config bundle, not just a model knob** (`config.py:858-930`). `minimal` is the cost-floor (1 iteration,
250 output tokens, 2 tools, half prefetch); defaults route every level to the same model but operators
override per-level. So the level scales retrieval depth + loop budget together.

### Hybrid search + representation/context shaping

**Hybrid (BM25+vector) — messages only.** `utils/search.py:314` runs semantic (pgvector cosine) and
full-text (`to_tsvector('english') @@ plainto_tsquery`) in parallel, then fuses by **Reciprocal Rank
Fusion** (`RRF = Σ 1/(k+rank)`, `k=60`, `search.py:36-75`) — combined purely by rank position (raw scores
discarded, the classic robust-but-lossy RRF tradeoff). **Observation `search_memory` is NOT hybrid** — pure
vector + a `level` filter. **Representation shaping**: one `Representation` model (four typed observation
lists) with multiple render shapes (`format_as_markdown(include_ids=)`, `str_with_ids`, `str_no_timestamps`)
so the caller picks the shape for its token budget, with built-in caps (inductive sources capped at 5).
**Static endpoints** (`/representation`, `/context`) return the snapshot with optional semantic curation, no
LLM. The session **`context` endpoint** uses a **40/60 token split** (≤40% summary, ≥60% recent messages),
preferring the long summary if it fits.

**Vector-store abstraction:** a clean pluggable `VectorStore` ABC (`vector_store/__init__.py:53`:
`upsert_many`/`query`/`delete_many`/…), namespaces content-hashed; **pgvector returns `None`** (it lives in
the ORM directly), so callers branch on `_uses_pgvector()` between in-DB cosine and an external call.
Backends: pgvector (in-ORM) + turbopuffer + lancedb.

### LEARN / AVOID / ORTHOGONAL (L11b)

**LEARN**
- **Two-tier retrieval surface** — a cheap static snapshot (rendered, token-budgeted, no LLM) AND an optional
  agentic synthesis tier over the same target. v3's L11 should offer both.
- **Reasoning tiers as a config bundle, not just a model knob** — tie {model, max tool iterations, max output,
  tool subset, prefetch depth} together per level; default same model, let operators override.
- **DB-connection discipline** — preflight loads everything, closes the DB, the agent runs tool-calls holding
  *no* connection (each tool opens its own short-lived session). Essential for a distributed kernel where LLM
  latency must not pin a pool connection.
- **Typed, multi-shape injection unit** — one representation model with several render shapes + built-in caps;
  good model for "prompt-ready context with a budget."
- **Split-search to avoid dilution + RRF for rank fusion** — two separate embedded searches (explicit vs
  derived) instead of one mixed query; RRF as dependency-light fusion.

**AVOID**
- **The mega-prompt as control flow** — a ~230-line behavioral playbook (enumeration discipline, contradiction
  protocol). Powerful but brittle/model-coupled and unverifiable; a kernel should encode hard invariants in
  code, not prose.
- **Hybrid only on messages, not observations** — an undocumented, surprising asymmetry; if v3 advertises
  hybrid search, apply it uniformly or be explicit where it doesn't.
- **RRF discards scores** — fine for recall, but you lose any calibrated-confidence signal.
- **`@cache` singleton vector store** — convenient but complicates testing/reconfiguration; a kernel wants
  explicit lifecycle/DI.

**ORTHOGONAL** — the peer/observer/observed ontology and the explicit→deductive→inductive→contradiction
reasoning taxonomy are Honcho's product domain (modeling humans); adopt the *shapes* (typed tiers, two-tier
surface, budgeted injection), not the ontology.

---

## L0a/L6 — The Async Processing Kernel (derivation queue + reconciler)

**3-sentence verdict.** Honcho's async kernel is a **Postgres derivation queue** (`queue` table) of
immutable, append-only work records, drained by a fleet of in-process asyncio workers; claiming is done not
by row-locking the work but by **inserting a per-partition lease row** (`active_queue_sessions`) via
`INSERT … ON CONFLICT DO NOTHING`, serializing processing per session/peer "work unit" while parallelizing
across them. On the durability spectrum it lands **between vibe-kanban and paperclip but with a critical
hole**: a durable Postgres work table, atomic partition-level claiming (lease-row uniqueness rather than
`FOR UPDATE` on the work row), lease-based crash recovery, even partial-unique-index dedup for *some* task
types — yet for its primary representation/summary workloads there is **no idempotency key and no retry**: a
failed item is marked `processed=True` with an error string (terminal mark-failed, like hermes/vibe-kanban),
and a successful item that crashes after side-effects but before the `processed=True` write is **re-derived
(at-least-once, not exactly-once)**. The separately-engineered **reconciler** (`sync_vectors`) is the part
that actually reaches DBOS-grade durability — lease + `sync_attempts` + `MAX_SYNC_ATTEMPTS` + backoff — and
its existence is a direct admission that the main queue does *not* guarantee the embedding side-effects
landed.

### Queue schema + claiming + idempotency

**Work-item table** `QueueItem` / `queue` (`models.py:477-532`): `id BIGINT IDENTITY` PK (drives FIFO),
`work_unit_key TEXT` (partition key), `task_type`, `payload JSONB`, `processed BOOL` (indexed), `error TEXT`.
**Append-only at enqueue, mutated in place at completion** — the only post-insert write is `processed=True`
(+ optional `error`); there is **no `attempts`/`status`/`leased_until` column on the work row**. Completion
is a binary flag, not a status machine. **Partial unique indexes for dedup exist only for `reconciler` and
`dream`** (`UNIQUE … WHERE processed=false`); **representation and summary have NO uniqueness** — duplicate
enqueues are physically possible and rely on downstream dedup.

**Claiming — NOT `FOR UPDATE SKIP LOCKED` on the work rows.** Work-discovery selects distinct unprocessed
`work_unit_key`s with no existing `ActiveQueueSession` (an anti-join, no row lock on `queue`); the actual
claim is an insert into a separate lease table with `.on_conflict_do_nothing().returning(...)`
(`queue_manager.py:407-431`). Because `ActiveQueueSession.work_unit_key` is UNIQUE (`models.py:541`), only
one worker (across all deriver instances) holds the lease for a given key. `SKIP LOCKED` is used only for
stale-lease cleanup and the reconciler's claims — never to claim a `queue` work row. **No exactly-once on
the hot path:** items are marked processed *after* the side-effect in a *separate transaction*
(`queue_manager.py:620-656`); a crash in that window re-runs the item → at-least-once. There is no
`(workflow_id, step_id)`-keyed dedup as in DBOS.

### Per-session ordering + crash recovery

**Per-session ordering while parallelizing across sessions** — the partition key + lease pattern. The
`work_unit_key` encodes the partition (e.g. `representation:{workspace}:{session}:{observed}`); at most one
lease per key, and the holder drains items `ORDER BY id`, so all items of one partition process serially in
id order by one worker while different partitions are leased by different workers concurrently. **A clean
partitioned-queue solution: serialize per partition, parallelize across partitions — achieved *without*
`FOR UPDATE`, using a uniqueness-constrained lease row as the partition mutex.**

**Crash recovery = coarse-grained lease + visibility timeout.** No per-item lease; the lease is on the whole
work unit, `last_updated`-bumped per batch. A dead worker orphans the lease row; `cleanup_stale_work_units`
deletes `ActiveQueueSession` rows older than `STALE_SESSION_TIMEOUT_MINUTES` (using `FOR UPDATE SKIP LOCKED`),
after which the partition's unprocessed items become claimable again. So recovery = reclaim the partition
after a minutes-scale timeout, then re-drain. **Retry/dead-letter — effectively NONE on the main queue:** on
exception, only the *first* item of the batch is marked `processed=True, error=…` (terminal mark-failed; no
attempt counter, no requeue, no dead-letter) — a permanently-failing head item silently drops one message's
derivation. The only real retry is the in-memory LLM-call retry (`retry_attempts=3`) within a single attempt.

### The reconciler (L6) and what it reveals

`ReconcilerScheduler` (`reconciler/scheduler.py:68`) is a singleton interval scheduler that *enqueues*
`reconciler`-type QueueItems (run by the same workers), with cross-instance single-execution via an advisory
check + the partial unique index. Two tasks: **`sync_vectors`** (interval) and **`cleanup_queue`** (12h,
hard-deletes processed items). **`sync_vectors` is a separate durable kernel** over `documents` and
`message_embeddings`: those tables carry the real lease+retry state machine the `queue` table lacks —
`sync_state` (`pending`/`synced`/`failed`), `sync_attempts INT`, `last_sync_at` (`models.py:297-303,
411-417`) — claimed with genuine `FOR UPDATE SKIP LOCKED`, failures bumping the counter to `MAX_SYNC_ATTEMPTS=20`
with backoff. The docstring is explicit: it syncs embeddings "on a rolling basis, **healing any missed
writes**." **This is the clearest evidence of where the main queue's durability stops:** the queue guarantees
the *derivation logic ran* (at-least-once) but **not** that the *downstream vector write committed* — that gap
is closed asynchronously by L6, a textbook outbox/reconcile pattern compensating for a non-transactional
cross-store side-effect.

### LEARN / AVOID / ORTHOGONAL (L0a/L6)

**LEARN**
- **Lease-row-as-partition-mutex via `UNIQUE` + `ON CONFLICT DO NOTHING`** — per-partition serialization
  *without* `FOR UPDATE`, across multiple stateless workers, where the partition key is just a string. A
  strong primitive for v3's "serialize per workflow-instance, parallelize across instances" requirement.
- **Partial unique indexes for pending-dedup** (`UNIQUE … WHERE processed=false`) — a cheap DB-enforced
  idempotency gate for "only one pending instance of this logical task." v3 should apply this to *all*
  trigger/spawn enqueues, not just two task types.
- **Stale-lease reclaim with jittered, gated cleanup + `SKIP LOCKED`** — clean crash recovery without
  cross-instance coordination and without hammering a struggling DB.
- **The outbox/reconciler split** — a `sync_state`+`attempts`+`backoff` column set on the side-effect table +
  a periodic converger is the right shape for *any* non-transactional external write v3 must make durable.

**AVOID**
- **Two-transaction "do work, then mark processed" with no idempotency key** → at-least-once with no dedup on
  the hot path. v3 must key idempotency on a stable `(instance_id, op_id)` and CAS the status in the *same*
  transaction as the side-effect (DBOS pattern), or inherit Honcho's re-derivation-on-crash.
- **Terminal mark-failed with no attempt counter or dead-letter** — a transient failure silently consumes the
  work item. v3 needs `attempts`, a max, and a dead-letter/parked state on the *primary* queue, not only on
  the reconciler's tables.
- **Lease at partition granularity, recovered only by a minutes-scale timeout** — a crashed worker freezes an
  entire session's queue for the full timeout. Consider per-item leases or heartbeats for tighter recovery.
- **Relying on a separate reconciler to achieve durability the queue should provide** — it works, but means
  the queue alone is not the source of truth for "did the effect happen." v3's single-durable-kernel goal
  argues for folding the side-effect commit into the work record's transaction where possible.

**ORTHOGONAL** — the token-budgeted batching CTE and adaptive polling backoff (throughput/load optimizations);
the dreamer scheduler and webhook/deletion task types (domain features riding the same queue — the reusable
idea is just "everything is a `QueueItem` with a `work_unit_key`").

---

## L0c — The LLM Abstraction Layer

**3-sentence verdict.** Honcho's `src/llm/` is a **provider-adapter layer fronted by a single public
entrypoint (`honcho_llm_call`) whose first argument is a portable, serializable `ModelConfig` run-intent
value object** — the exact abstraction Hermes lacked. Each provider is a thin `ProviderBackend` adapter (a
structural `Protocol` with two methods, `complete` and `stream`) that translates one neutral request shape
into native Anthropic/OpenAI/Gemini calls, normalizes the response into a shared `CompletionResult`, and
self-handles structured-output enforcement in its own native idiom. Per-task model routing is not a router
inside the LLM layer at all — it is **pushed up to the call sites**: every internal task (deriver, summary,
each dialectic level, each dream specialist) holds its own model config and passes the resolved `ModelConfig`
into the *same* `honcho_llm_call`, so "which model does this job use" is a config-resolution concern fully
decoupled from the call mechanics.

### The backend interface + the `ModelConfig` run-intent object

The backend interface (`llm/backend.py:47-88`) is a `@runtime_checkable Protocol` `ProviderBackend`; a new
provider implements exactly **two methods** (`complete`, `stream`) over a neutral kwarg surface, with
**credentials NOT in the interface** ("baked into the underlying SDK client at backend construction time").
Normalized return types are dataclasses (`CompletionResult`, `ToolCallResult`).

**`ModelConfig`** (`config.py:238-294`) lives deliberately *outside* `src/llm/` — a Pydantic `BaseModel` with
`model` + `transport` (`Literal["anthropic","openai","gemini"]`) plus every portable knob (temperature, top_p,
seed, thinking_effort/budget, max_output_tokens, stop, cache_policy, optional `fallback`, api_key/base_url
overrides). It is **fully serializable** (Pydantic round-trip), **immutable-by-convention** (mutated only via
`for_model()`/`model_copy(update=…)`), and **decoupled from the call site** (`honcho_llm_call(model_config=…)`).
Two tiers: persisted `ConfiguredModelSettings` (operator intent + secret *references* / env aliases) →
`resolve_model_config()` → runtime `ModelConfig` with injected secrets. **vs Hermes:** the immutable value
object Hermes never had — run-intent travels as *data* (transport is a field on the value), not as mutable
object state keyed by an `api_mode` string. **vs vibe-kanban:** both are serializable run-intent values, but
`ExecutorAction` is recursive (wraps subprocess CLIs); `ModelConfig` is flat (single optional `fallback`) and
drives raw model APIs.

### Per-task model routing + cross-provider structured output

**Per-task routing is config-resolution, not a dispatcher.** No `get_model(task)` switch inside `src/llm/`;
each task owns a config field and passes it in: deriver → `settings.DERIVER.MODEL_CONFIG`; dialectic →
`settings.DIALECTIC.LEVELS[level].MODEL_CONFIG`; dream specialists → `DEDUCTION_MODEL_CONFIG` /
`INDUCTION_MODEL_CONFIG`; summary likewise. Operators override any leaf via env nesting. **The cleanest
per-task routing of the three studies: the run-intent value object makes "different model per internal job" a
pure data decision.**

**Cross-provider structured output: same Pydantic schema, three native translations, one shared repair
fallback.** Anthropic serializes the JSON schema into the prompt + assistant-prefill (gated by a Claude-4
carve-out); OpenAI uses native `.parse(response_format=<Model>)`; Gemini uses native `response_schema`. The
uniform seam is `structured_output.py`: a `validate → repair → empty` policy ladder + a JSON-repair function
(with a domain-specific patch for the deriver's schema). Providers diverge on *how* JSON is requested,
converge on *one* validate-and-repair contract. Tool loop + caching are also abstracted (a `HistoryAdapter`
Protocol per provider; caching is provider-shaped — Anthropic ephemeral markers vs a Gemini handle store —
bridged by a shared cache-key function).

### LEARN / AVOID / ORTHOGONAL (L0c)

**LEARN**
- **The `ModelConfig` value object is the L0c gold standard** — a flat, serializable Pydantic run-intent that
  carries `transport` as a *field* (the value selects its own backend) and is mutated only by copy. Exactly
  the "portable AgentConfig" v3 wants, and the precise thing Hermes lacked. Adopt: run-intent as immutable
  data, transport-as-field, per-call overrides layered by copy.
- **Two-tier config: persisted `ConfiguredModelSettings` (secret references) → resolved runtime `ModelConfig`
  (injected credentials).** v3 should keep its portable run-intent free of resolved secrets and resolve them
  at the boundary.
- **Per-task routing pushed to call sites, not a router in the adapter layer** — each task owns a config field
  and passes the resolved value into one shared entrypoint. v3's "different actor/model per workflow step"
  should be a config-resolution decision the kernel passes down, keeping the actor-adapter task-blind.
- **A two-method `ProviderBackend` Protocol with credentials *outside* the interface** — a clean minimal
  contract for "what a new actor adapter implements." Plus a shared structured-output enforcement seam with a
  failure-policy ladder.

**AVOID**
- **Three structured-output mechanisms that quietly diverge** (Anthropic prompt-prefill hack vs OpenAI
  `.parse` vs Gemini `response_schema`), including a model-family carve-out and a *schema-specific* repair
  branch leaking domain types into the generic layer. Define one schema contract; keep domain-specific repair
  out of the adapter.
- **Provider-shaped caching with no unified handle abstraction** — if v3 wants portable caching, model the
  cache handle as a first-class abstraction, not per-provider special cases.
- **The fat neutral kwarg surface** (12+ params, several provider-specific) plus an `extra_params` escape
  hatch — push more into the `ModelConfig` value and keep the adapter call narrow.

**ORTHOGONAL** — token-accounting/telemetry threading, streaming output-token drain capture, tenacity
retry+temperature-bump heuristics, Langfuse/Sentry hooks (Honcho-runtime concerns).

---

## Consolidated Direction for v3

| v3 level | What Honcho contributes | Verdict |
|---|---|---|
| **L0a kernel** | Postgres queue, lease-row partition-mutex (`ON CONFLICT DO NOTHING`), per-partition serialization. No op-log/idempotency on the hot path, terminal mark-failed, at-least-once; an outbox reconciler patches the side-effect gap. | **Adopt the partition-mutex + partial-unique-dedup + outbox pattern; reject the missing idempotency.** Keep DBOS's `(instance_id, op_id)` + same-txn CAS. |
| **L0c adapters** | **`ModelConfig`: the immutable, serializable, transport-as-field run-intent Hermes lacked.** Two-tier (secret-ref → resolved). Per-task routing as config resolution. | **The L0c reference. Adopt the value-object + two-tier secret resolution + call-site routing.** |
| **L6 triggers** | Idle+threshold consolidation trigger with anti-feedback discipline; interval reconciler enqueues onto the same queue. | **Adopt the idle+count gate + anti-feedback baseline.** |
| **L11 model** | **`(observer, observed)` keying = memory as a directed edge; theory-of-mind + self-model unified; perspectival × episodic scope; provenance tree via `source_ids`+`times_derived`.** | **The L11 reference — adopt the directed-edge model, the two scope axes (nullable session), and the provenance tree.** Surpasses Hermes decisively. |
| **L11 retrieval** | Two-tier surface (static representation vs agentic dialectic); reasoning tiers as a config bundle; RRF hybrid search; DB-connection discipline; typed multi-shape injection unit. | **Adopt the two-tier surface, tier-as-config-bundle, and connection discipline.** Apply hybrid uniformly (Honcho doesn't). |
| **L12 extraction** | Two-speed loop: cheap explicit-only extraction on the hot path + deferred structured consolidation; **structural** reconciliation (embedding-dedup + reinforcement counter), not LLM-rewrite; typed conclusions with required source-linkage. | **Adopt the two-speed split, structural reconciliation, and provenance-as-invariant.** |
| **L12 consolidation** | Idle+threshold dreamer with deduction/induction split + scoped write-permissions. **Surprisal+spatial-trees = off-by-default research theater.** | **Adopt the trigger hygiene + reasoning-mode split; ignore the surprisal/trees.** |

## Reconsiderations for v3

1. **L11 finally has a reference, and it reframes the level.** Before Honcho, L11 in the series was just
   Hermes's flat Markdown. Honcho reframes memory as a **directed edge in a peer graph** — `(observer,
   observed)` — which unifies self-model and theory-of-mind and gives a clean 5-coordinate address
   `(workspace, observer, observed, session|NULL, level)`. For a *multi-agent* kernel this is more than a
   user-modeling nicety: it is exactly how one worker should hold a model of another, or of a task entity.
   v3's L11 should be built on this directed-edge model, with the nullable-session episodic axis, not on a
   flat per-entity store.

2. **The two-speed learning loop resolves the L12 tension.** Earlier studies posed L12 as either continuous
   (expensive) or periodic (Hermes's counter-fork). Honcho shows the right answer is *both, split*: cheap
   verifiable extraction synchronously (explicit atoms only) + deferred structured consolidation on an
   evidence threshold, with the fact store as the contract. And reconciliation should be **structural**
   (embedding-dedup + a reinforcement counter), not an LLM rewriting memory — that keeps L12 replayable and
   cheap. v3's L12 should adopt this shape directly.

3. **"Impressive ≠ load-bearing" — read the default config.** The dreamer's surprisal + cover-tree/LSH/RP-tree
   apparatus is the most sophisticated-looking subsystem in the entire series, and it is **off by default,
   runs on ≤200 ephemeral embeddings, and produces non-binding hints a plain pgvector kNN would equal.** This
   is a methodological lesson for the whole study series and for v3 design: when a subsystem looks novel,
   check whether the shipping default path even uses it before copying the vocabulary. v3 should resist
   building surprisal/spatial machinery for L12; the idle+threshold+anti-feedback trigger is the part that
   earns its keep.

4. **The idempotency hole is now a four-project pattern — stop patching it downstream.** hermes, vibe-kanban,
   and now honcho all build a durable-looking Postgres/SQLite queue, all lack `(instance_id, op_id)`
   idempotency on the hot path, and all are at-least-once with terminal mark-failed. Honcho is the most
   instructive because it then builds a *second* durable system (the `sync_vectors` reconciler with real
   leases+attempts+backoff) specifically to heal the gap the first one leaves. The lesson for v3 is sharp:
   **close idempotency at the source (DBOS's same-transaction id+CAS), so you never need a compensating
   reconciler.** The outbox pattern is worth knowing for genuinely external side-effects, but it should be the
   exception, not the load-bearing durability story.

5. **`ModelConfig` settles the L0c "immutable AgentConfig" question.** Hermes's L0c was flagged as weak
   precisely because run-intent was mutable attributes on a god-object. Honcho's `ModelConfig` is the concrete
   counter-example: a flat, serializable, immutable-by-copy value with transport-as-a-field and a clean
   secret-reference→resolved two-tier. v3's L0c AgentConfig should look like this, combined with vibe-kanban's
   `ExecutorAction` insight (a serialized run-intent persisted in the durable record) and paperclip's
   host-owned session bytes — three complementary pieces of one portable-run-intent design.

## Caveats

- **Compact core, thorough read.** Unlike the larger prior subjects, Honcho's interesting logic is small
  enough that the six agents read the load-bearing files thoroughly; confidence is correspondingly high. The
  one acknowledged gap: whether the representation *writes* are themselves idempotent upserts (which would
  soften, not close, the at-least-once re-derivation) was not traced to the bottom.
- **A product for modeling humans, judged as a kernel.** Honcho's domain is user/peer psychology; many of its
  richest ideas (peer cards, the deductive/inductive/contradiction ontology, the dialectic mega-prompt) are
  domain-shaped. The study deliberately extracts the *structural* lessons (directed-edge scoping, two-speed
  loop, structural reconciliation, `ModelConfig`) and treats the ontology as orthogonal.
- **Same-day HEAD, active development.** Analyzed at `a2adeb9`, pushed 2026-06-19 — HEAD itself carries a
  surprisal-subsystem bugfix, underscoring that subsystem's under-exercised state. Line numbers are a snapshot.
- **The surprisal verdict is a default-config judgment.** "Off by default / theater" is correct for the
  shipping configuration; an operator who enables it and tunes the trees might extract value. The study judges
  what ships, and flags the gap between the subsystem's prominence and its default-path role.
