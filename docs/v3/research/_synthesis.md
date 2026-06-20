# V3 Research Synthesis — The Convergence Bridge

Date: 2026-06-20

## Purpose

This document is the **bridge between the research-study series and the convergence
build**. The series reverse-engineered twelve external systems (plus two pre-existing
reference notes), each producing a `*-study.md` that maps its mechanisms onto v3 levels
with `file:line` citations and per-slice LEARN/AVOID/ORTHOGONAL verdicts. This note does
**not** re-summarize those studies — it distils the *cross-study* result: the
load-bearing decisions every study converged on, the verdicts where studies disagreed,
and a single per-level decision matrix that the convergence work (`approach.md` +
`core-model.html`) can consume directly.

Read it as the answer to: *"after looking at twelve systems, what has v3's design actually
learned, what are its resolved bets, what is still open, and where does each lesson get
channelled in the level roadmap?"*

> **Coverage note.** §1–§7 below were written after study 10 and corner the *kernel* and
> outer-layer bets from studies 1–10. Studies **11 (gastown)** and **12 (gstack)** were
> pulled in afterwards (both relevant to the parked agent-runtime topic); their deltas are
> consolidated in **§8 — Addendum**, which amends the named matrix rows rather than rewriting
> them in place. Read §8 alongside §4.

The twelve studies (in order written), and the two pre-existing reference notes:

| # | Study | What it is | One-line role |
|---|---|---|---|
| 1 | [`omnigent-study.md`](omnigent-study.md) | meta-harness | "L4 child = full instance"; weak kernel |
| 2 | [`symphony-study.md`](symphony-study.md) | OTP orchestrator (Elixir) | skips L0a, outsources durability; unaudited human gate |
| 3 | [`paperclip-study.md`](paperclip-study.md) | control-plane app (TS) | durable Postgres kernel; **credential broker**; **audited decision row** |
| 4 | [`dbos-study.md`](dbos-study.md) | durable-execution engine (TS) | **the light kernel reference**: exactly-once, no event-sourcing, no leader |
| 5 | [`hermes-agent-study.md`](hermes-agent-study.md) | self-improving agent (Python) | channel/skills breadth; kernel anti-example |
| 6 | [`vibe-kanban-study.md`](vibe-kanban-study.md) | human-review board (Rust) | **`MsgStore` observe-seam**; git-anchored checkpoints; left fan-in open |
| 7 | [`honcho-study.md`](honcho-study.md) | memory engine (Python) | **L11/L12 reference** (perspectival memory); **immutable `ModelConfig`** |
| 8 | [`temporal-study.md`](temporal-study.md) | durable-execution platform (Go) | **the heavy kernel reference**; CHASM; **the determinism finding**; fan-in slot |
| 9 | [`superpowers-study.md`](superpowers-study.md) | SDLC methodology (skills) | **the verification gate**; reference workflow; file-handle ContextPacket |
| 10 | [`langgraph-study.md`](langgraph-study.md) | orchestration library (Python) | **the closest analogue** — validates the commit-based bet |
| 11 | [`gastown-study.md`](gastown-study.md) | multi-agent workspace manager (Go) | **the parallel-universe v3**; the TMUX cautionary tale; **the dedicated watchdog** + the **first federation reference** |
| 12 | [`gstack-study.md`](gstack-study.md) | role-team Claude Code setup (Markdown) | **the 2nd methodology lens**; "roles without actors"; **the deterministic L2 gate primitive** |
| — | [`ruflo-v3-sdlc-workflow.md`](ruflo-v3-sdlc-workflow.md) | SPARC/DDD method study | adopt concepts not framework (pre-series) |
| — | [`v3-gate-policy-config-design-synthesis.md`](v3-gate-policy-config-design-synthesis.md) | gate/policy/config synthesis | L2 design input (pre-series) |

> **A note on level vocabulary.** The studies use a *simplified* v3-level glossary
> (L0a..L14) chosen to make cross-project comparison legible. The convergence build's
> roadmap (`approach.md`) has a finer, evolving level structure (L0a–L0f, L1, L2/L2a/L2b,
> L3, L4 … L14). Section 5 of this note explicitly maps study-vocabulary lessons onto the
> convergence roadmap so nothing is lost in translation.

---

## 1. The kernel spectrum

The single most useful frame the series produced is a **spectrum of durability/recovery
models**, from "no kernel" to "full event-sourcing", with v3's target marked:

```
symphony ── hermes ── vibe-kanban ── honcho ── paperclip ── DBOS ── LANGGRAPH ── CHASM ········· TEMPORAL
 no L0a    chat-store  exec_process  PG queue   FOR UPDATE   step-   superstep    node-diff      event-sourced
 (re-poll  (no op-log) rows (no      + outbox   + CAS        memo    commit +     commit +       + leader-per-shard
  Linear)               idempotency) reconciler             (light) pending-     VersionedTxn   + 2-level OCC
                                                                     writes       (commit-based)  (heavy)
                                          └──────────────── v3 TARGET ZONE ───────────────┘
```

- **The left end (symphony, hermes, vibe-kanban, honcho)** repeatedly built a
  durable-*looking* store **without operation-level idempotency** — at-least-once with
  terminal mark-failed recovery. Honcho is the most instructive: it then built a *second*
  durable system (the `sync_vectors` reconciler) to heal the gap the first one left. **The
  four-project idempotency hole** (§3.1) is the sharpest cautionary pattern of the series.
- **The right end (Temporal)** pays for full event-sourcing + leader-per-shard + a
  deterministic worker-replay contract. Its own hot path avoids replay-from-events, and its
  own successor framework (**CHASM**) is *commit-based, not replay-based*.
- **v3's target zone (DBOS ↔ LangGraph ↔ CHASM)** is the commit-based, snapshot-or-memoized
  middle: a materialized aggregate, an idempotency ledger keyed `(instance_id, op_id)`, and a
  per-instance optimistic-concurrency token. **LangGraph (the closest analogue) and DBOS (the
  cleanest light kernel) both sit here, which de-risks the choice.**

---

## 2. The two resolved central bets

The series came in to answer v3's two sharpest open questions. Both are now resolved with
external corroboration.

### Bet 1 — Commit-based, NOT replay-based (record-not-replay for actors)

**Resolved: v3 is commit-based; every LLM/actor output is an atomic, content-addressed,
never-replayed commit.**

The evidence chain:
- **Temporal** (heavy reference) proves the *replay* contract requires byte-identical
  re-execution — and that **an LLM is the textbook violator**. Its own carve-out:
  non-determinism must be a *recorded Activity*, run once, result recorded, never replayed.
- **DBOS** proves exactly-once is achievable *without* event-sourcing via step-memoization
  (`operation_outputs` keyed `(workflow_uuid, function_id)`).
- **CHASM** (Temporal's own successor) is commit-based (atomic node-diff + VersionedTransition),
  not replay — the canonical engine is itself moving toward v3's model.
- **LangGraph** independently re-discovered record-not-replay (`@task` memoization) as the
  *correct* answer for non-deterministic steps — **but left it opt-in**, so its default
  node-recovery path carries the determinism hazard (a crashed LLM node re-runs the LLM call
  and its side-effects). This is the real-world demonstration of the cost of making
  record-not-replay optional.

**The v3 decision:** make record-not-replay the **only** model — not an opt-in `@task` but the
foundation. Every actor invocation's *result* is the durable fact; the orchestration skeleton
(which actor, what inputs, what routing) is the deterministic, re-runnable part.

### Bet 2 — Leaderless, NOT leader-per-shard

**Resolved: v3 is leaderless (DBOS-style), with Temporal's fencing token reserved only for
multi-step worker leases.**

- **Temporal** is leaderful: a `rangeID` lease per shard buys in-memory authoritative caches
  and gap-free in-memory ID allocation, at the cost of a fixed shard count, shard-reload on
  failover, and partition-granularity blast radius.
- **DBOS** is leaderless: `SELECT … FOR UPDATE SKIP LOCKED` + value-CAS; any worker runs any
  workflow; per-workflow (not per-partition) failover; no membership infrastructure.
- **LangGraph** is single-process-single-writer — safe only because it isn't distributed; its
  `versions_seen` map is the in-memory seed of a per-instance version but gives zero
  cross-process safety.

**The v3 decision:** leaderless, on commodity Postgres, with **per-instance `expected_version`
CAS** + the idempotency ledger doing the work the leader-lease does in Temporal. Borrow the
**fencing-token pattern** only where v3 hands a single worker a multi-step lease that must
survive that worker going zombie.

---

## 3. The five cross-study patterns

Beyond the two bets, five patterns recurred across studies and shaped v3's design.

### 3.1 The idempotency hole (the cautionary pattern)

**Five projects (hermes, vibe-kanban, honcho, gastown, + symphony at the limit) built a
durable-looking store WITHOUT `(instance_id, op_id)` idempotency**, ending up at-least-once with
terminal mark-failed recovery, and patched the gap *downstream* (honcho's `sync_vectors`
reconciler is the explicit admission). Gastown is the newest and most instructive instance: its
Beads/Dolt (git-for-data) store gives *versioned history for free* yet still runs **all-on-main,
newest-`updated_at`-wins** concurrency — so it can *audit and revert* a racing op after the fact
(`AS OF`/`dolt_diff`) but cannot *prevent* it at write time. Versioning ≠ idempotency. **v3 must
close idempotency at the source** (DBOS's
same-transaction id+CAS / LangGraph's pending-writes ledger), so it never needs a compensating
reconciler. The reconciler/outbox is for genuinely external side-effects, not the load-bearing
durability story.

> Channels to: **L0a** (the idempotency ledger keyed `(instance_id, op_id)` as a kernel primitive).

### 3.2 The audited decision (a 3-of-4 failure)

**Human decisions are ephemeral in three of four systems that have them**: symphony (in the
ticket, unaudited), hermes (in-memory + config file), vibe-kanban (in-memory DashMap +
analytics-only "audit"); **only paperclip wrote a durable, attributed `issue_execution_decisions`
row.** LangGraph's `interrupt()` resume is also unaudited (an opaque value consumed positionally).
Temporal Update is the positive mechanism reference (validate-before-mutate, the validated request
recorded in the acceptance event). **v3's L3 must make the audited decision record — actor,
timestamp, recommendation, override, validated payload — a kernel primitive, and must not let an
analytics/telemetry event masquerade as audit.** (Vibe-kanban even *built* the right substrate — a
single append-only `activity` feed — but never pointed it at approvals.)

> Channels to: **L3** (DECISION_REQUEST/DECISION_MADE as durable transcript entries — already the
> convergence design; the series confirms it from four angles).

### 3.3 Fan-in — now three models, and a mechanism + discipline

"Child = full instance" was confirmed across omnigent/DBOS/hermes/Temporal. **Fan-in (correlating
child results back) was the recurring open gap** (vibe-kanban's `parent_workspace_id` is
provenance-only, never awaited). The series produced **three distinct fan-in models** to combine:

1. **Temporal — the slot (the mechanism):** parent allocates an `initiated-event-id` slot, child
   carries `ParentInitiatedId` end-to-end, parent **rejects any completion whose id it didn't issue**
   — correlation key IS the authorization check. Identity-preserving, one-to-one.
2. **LangGraph — the barrier channel (fan-in as state):** `NamedBarrierValue` is a channel whose
   availability rule is "all N named writers seen", with the partial seen-set in the checkpoint
   (crash-safe, resumable) and a `consume()` reset for loops. Plus anonymous reducer map-reduce
   (`Send` → `operator.add`) — clean but **loses child→result identity** (the AVOID).
3. **Superpowers — partition-then-verify (the discipline):** partition into non-overlapping domains
   up front so results can't collide, then reconcile empirically (conflict-check + full-suite);
   ContextPacket as a *file handle* (never pasted); the spawn→correlation binding persisted in a
   durable ledger so a forgetful parent can't re-dispatch completed work.

**v3's L4 should take the slot for identity-preserving authorized fan-in (where "which child"
matters), the barrier-channel idea for crash-safe join state, the partition-then-verify discipline
for orchestration, and never rely on anonymous reduction where identity matters.**

> Channels to: **L4** (spawn-correlation slot + write-back contract; internal-events-as-a-channel).

### 3.4 Record-not-replay for non-deterministic actors

Already stated as Bet 1, but it recurs as a *pattern*: Temporal (Activity = recorded), DBOS (step =
memoized), LangGraph (`@task` = memoized), CHASM (commit, not replay). The convergence: **the
boundary around a non-deterministic actor call is the atomic commit boundary; its result is the
durable fact.** v3 makes this mandatory and content-keyed (not positional, à la LangGraph's fragile
`call_counter`).

> Channels to: **L0a / L0c** (the actor-output commit; the issued-config-vs-proven-runtime split
> already in the convergence model is the same instinct).

### 3.5 Durable state over self-report (the verification discipline)

**The "agents over-claim done" anti-pattern recurred** (vibe-kanban's ephemeral approvals, hermes's
best-effort everything, LangGraph's trust-the-node-report). **Superpowers turns it into a crisp
structural rule:** a step's own success report does NOT satisfy a downstream gate — the gate checks
an *independent* artifact (VCS diff, test exit-code, requirements checklist). This is the structural
form of v3's core contract "durable state is authority, agent self-report is not evidence."

**This is now the most-validated single addition in the corpus — three independent corroborations:**
Superpowers (the principle), **gastown's gate-bead** (the *structural* implementation — a memoryless
verifier bead blocked-by all implementation tasks; "verifier ≠ implementer" enforced via the blocking
dependency; plus two-phase post-squash gates on the *combined* tree no worker saw), and **gstack**
(three independent-evidence stages — QA reads a real browser, review uses fresh-context/cross-model
reviewers ("'This looks fine' is not a finding"), the pre-emit gate requires quoting the source). After
three systems independently arrive at it, the `verify` gate should be a non-negotiable L2 gate kind.

> Channels to: **L2** (a `verify` gate kind whose evaluator reads an independent artifact, never the
> actor's self-report).

---

## 4. The per-level decision matrix

For each v3 concern: the **best reference** the series produced, what to **adopt**, what to
**reject**, and the **open** edge. (Level names use the study glossary; §5 maps to the roadmap.)

### L0a — Reactive kernel (the durable core)

| | |
|---|---|
| **Best references** | DBOS (light), CHASM (commit-based generalization), LangGraph (closest analogue), Temporal (the heavy contrast) |
| **Adopt** | Commit-based transition: atomically advance the materialized aggregate + append to an idempotency ledger keyed `(instance_id, op_id)` + enqueue side-effect tasks, in one transaction (Temporal/CHASM commit discipline; LangGraph's `after_tick` barrier; DBOS's `INSERT … ON CONFLICT`). Per-instance `expected_version` CAS. Content-addressed op/step ids. The transactional outbox for side-effects. "Materialized view records the high-water-mark of the log it reflects; reload on commit failure." |
| **Reject** | Full event-sourcing as the source of truth (even Temporal avoids replay-from-events on the hot path; the buffered-events + dense-ID machinery is pure replay tax). Full-snapshot-per-superstep as the primary record (LangGraph's default — use materialized aggregate + ledger instead). The 10K-LOC single-row aggregate monolith. |
| **Open** | — (the kernel model is the most thoroughly cornered question in the series; both spectrum ends + the closest analogue agree on the commit-based middle) |

### L0b — Actor + role→actor binding + context-packet

| | |
|---|---|
| **Best references** | (mostly v3-original; no studied system models a first-class actor with role binding) |
| **Adopt** | The convergence model's existing ActorBinding + ContextPacket. Superpowers' insight that the ContextPacket should be a **file handle, mechanically extracted, never pasted** (the "42k-char, 99% pasted history" anti-pattern). |
| **Reject** | Implicit/structural actors (vibe-kanban, honcho, LangGraph all lack a first-class actor type — "who acts" is a string/role; a gap v3 fills). |
| **Open** | — |

### L0c — AgentConfig (portable run-intent) + ActorAdapter

| | |
|---|---|
| **Best references** | **Honcho `ModelConfig`** (the reference), vibe-kanban `ExecutorAction`, paperclip `AdapterSessionCodec`, hermes (the anti-example) |
| **Adopt** | An **immutable, serializable run-intent value object with transport-as-a-field** (Honcho `ModelConfig` — the thing hermes lacked). Two-tier: persisted config holding secret *references* → resolved at the boundary into runtime config with injected credentials. Per-task model routing as config-resolution pushed to call sites (keep the adapter task-blind). The serialized-run-intent-in-the-durable-record idea (vibe-kanban `ExecutorAction`, recursive `next_action` chain). Host-owned session bytes for portability (paperclip codec). |
| **Reject** | Run-intent as mutable attributes on a god-object (hermes). Resume anchored to the agent's local on-disk session (vibe-kanban — can't migrate hosts). Positional memoization keys (LangGraph). |
| **Open** | — |

### L0d — Instance lifecycle + activation

| | |
|---|---|
| **Best references** | Temporal (workflow lifecycle FSM), DBOS (status-CAS) |
| **Adopt** | The convergence model's existing lifecycle (CREATED/ACTIVE/WAITING/TERMINAL + typed waits). Temporal's "close command must be last / history ends only with neutral events" structural invariant. Commit-then-observe (the `effect` package): never expose un-persisted state to an external caller. |
| **Reject** | Mark-failed-as-only-recovery (symphony/hermes/vibe-kanban/honcho — "abandon in-flight work"). |
| **Open** | — |

### L0e — Runtime-context provider (worktree/sandbox)

| | |
|---|---|
| **Best references** | hermes (six backends + hibernate), vibe-kanban (git-worktree), Temporal (none — orthogonal) |
| **Adopt** | The opaque provider-issued handle (vibe-kanban `container_ref: String` — path *or* container id *or* sandbox url). Scripts-as-execution-processes (setup/cleanup/dev = the same primitive as the agent run, differing by run-reason). Two-tier cleanup (DB-vs-disk orphan reconciliation + TTL expiry). `ensure_*` idempotent re-provisioning. Hibernate keyed by a stable id + "sandbox FS is cache, host owns durable state, re-push on wake" (hermes) — for the remote-sandbox archetype. |
| **Reject** | Single-impl "generic" trait that pretends to be pluggable (vibe-kanban — design against ≥2 real backends). No-isolation bare-host execution for untrusted agents. Conflating remote *access* (tunnel) with remote *execution*. |
| **Open** | The teardown/release contract (the convergence work's ② strand already covers this — the L0e provision↔release mirror). |

### L0f — Project/repo config + definition resolution

| | |
|---|---|
| **Best references** | vibe-kanban (per-repo scripts), Superpowers (the durable plan artifact), the convergence model's existing L0f |
| **Adopt** | Typed slots/holes + the resolution cascade (already in the convergence model). The durable plan/definition as a referenceable artifact with global constraints + per-step interfaces (Superpowers). |
| **Reject** | — |
| **Open** | — |

### L1 — Capability matrix (role×step→action authorization)

| | |
|---|---|
| **Best references** | (mostly v3-original; closest is hermes's role-based actor dispatch) |
| **Adopt** | The convergence model's existing CapabilityProfile + role-authority/action-authorization HANDLE gates. |
| **Reject** | — |
| **Open** | — |

### L2 — Gates & policies (allow/warn/block) + the verification gate

| | |
|---|---|
| **Best references** | paperclip (transactional audited gate decision), **Superpowers (the verification gate)**, Temporal (validate-before-mutate), v1 command-gates (the pre-existing synthesis) |
| **Adopt** | The convergence model's existing gate pipeline (declarative/packaged/process × inline/deferred). **A new `verify` gate kind** whose contract is "fresh independent evidence in this transition" — the evaluator reads an independent artifact (diff/test-output/checklist), **never the actor's self-report** (Superpowers §3.5). Read-only & stateless gates. WARN as a first-class verdict. |
| **Reject** | Persuasion-prose-as-enforcement (Superpowers' rationalization tables work for one LLM; a kernel enforces with machine-checkable conditions). Human-trust heuristics baked into mechanism. |
| **Open** | — (the gate model is well-cornered by L2/L2a/L2b convergence work + this verify addition) |

### L3 — Human decision (Ask/approval gate)

| | |
|---|---|
| **Best references** | **paperclip (audited decision row)**, **Temporal Update (validate-before-mutate)**, Superpowers (closed-enum + destructive-route validation), the LangGraph/symphony/hermes/vibe-kanban anti-examples |
| **Adopt** | The convergence model's existing `human_gate` (park WAITING(human_decision) + DECISION_REQUEST/DECISION_MADE durable entries). **The audited decision record as a kernel primitive** (actor, timestamp, recommendation, override, validated payload — §3.2). Validate-before-mutate with zero-persistence on rejection (only an accepted decision becomes a durable fact). Closed-enum decision keys + per-route validation on the irreversible route (Superpowers). Round caps that *escalate into* a human gate (Superpowers). Id-keyed resume for parallel gates (LangGraph). |
| **Reject** | Re-run-the-node-on-resume (LangGraph interrupt — replays pre-gate side-effects). Ephemeral/analytics-only "audit" (vibe-kanban). Value-less static pause that can't carry a question (LangGraph static interrupt). |
| **Open** | — |

### L4 — Child workflow instances + fan-in correlation

| | |
|---|---|
| **Best references** | **Temporal (the slot)**, **LangGraph (the barrier channel)**, **Superpowers (partition-then-verify)**, omnigent/DBOS (child = full instance) |
| **Adopt** | The slot for identity-preserving authorized fan-in (parent allocates, child carries back, parent rejects-if-not-issued — correlation = authorization). The barrier-channel-as-crash-safe-state idea for joins. Spawn-as-durable-write (LangGraph — the pending sends *are* the spawn ledger). Deterministic child identity from a derived/hashed path. Persisted spawn→correlation binding (Superpowers — survives parent restart). Child cost/token roll-up (hermes). Result-as-a-new-turn re-entry (hermes — preserves role alternation). Parent-close policies (Temporal). |
| **Reject** | Provenance-only "fan-in" that never awaits (vibe-kanban). Anonymous channel-reduction as the *only* fan-in (LangGraph — loses identity). Children as in-memory threads lost on parent crash (hermes/vibe-kanban — make children durable). Correlation-by-naming-convention (Superpowers — correlate by identity). |
| **Open** | — (this was the biggest open gap of the series; the slot + barrier + discipline together close it) |

### L5 — Help subflow / skills

| | |
|---|---|
| **Best references** | hermes (agentskills.io format + 3 generic tools + cached catalog), **Superpowers (action-indirection portability)** |
| **Adopt** | Skill = directory + frontmatter'd Markdown, surfaced through list/view/manage + a cached prompt-index (hermes). Adopt the **agentskills.io open standard** (don't invent). **Action-indirection portability** — skill text names capabilities, a per-host table binds capability→tool (one source → N hosts, Superpowers). **Trigger-only `description`** (never workflow-summary — empirical: summaries make agents skip the body). Bootstrap-as-active-entry-gate over a passive catalog. Lifecycle states + never-auto-delete; trust-tiered security scan on external skills (hermes). |
| **Reject** | Flat first-seen-wins namespacing (namespace by origin). Autonomous creation with no governance. Prose-only dependency graph with no machine-checked manifest. |
| **Open** | — |

### L6 — Triggers & scheduling

| | |
|---|---|
| **Best references** | **Temporal (look-ahead durable timers)**, hermes (file-cron with `claim_job_for_fire` CAS), honcho (idle+threshold + anti-feedback) |
| **Adopt** | Durable timers via **look-ahead + a single gate deadline** (a 30-day sleep = one row + one deadline, no ticker — Temporal). Exactly-once via **idempotent re-execution** (the task is a pointer; re-read live state and drop if stale via a `Stamp` guard) — not exactly-once delivery. Retries materialized as durable timer rows. Two queues (immediate + timer) on one composite key; delete-then-advance ack. The `claim_job_for_fire` store-CAS for multi-replica (hermes). Idle+threshold consolidation trigger with anti-feedback discipline (honcho). Merge-as-typed-signal (vibe-kanban). |
| **Reject** | Polled tickers (hermes/honcho — Temporal's look-ahead is strictly better). Terminal mark-failed with no retry/dead-letter on the primary queue (honcho). The full 7-category × per-shard processor split (Temporal — v3 needs two). |
| **Open** | — |

### L7 — Grants & credentials (credential-never-travels)

| | |
|---|---|
| **Best references** | **paperclip (UUID secret-ref + host-side broker)**, hermes (the anti-example), vibe-kanban (SPAKE2 pairing + signed requests) |
| **Adopt** | **Credential-never-travels enforced architecturally** — the agent holds a ref, a broker substitutes the secret at point of use, the secret never enters agent context (paperclip). Two-tier secret-ref→resolved (Honcho `ModelConfig`). SPAKE2-pairing → Ed25519 signed-request trust kit for channel establishment (vibe-kanban). Secrets-CLI hygiene (hermes — lazy-install + verify + 0600-cache) if shelling out. |
| **Reject** | Process-global `os.environ` secrets readable by the LLM-driven shell + every skill/plugin (hermes — its own SECURITY.md punts the real boundary to an external wrapper). Blocklist credential filtering (allowlist, never blocklist). |
| **Open** | — |

### L8 — Channels & task inbox (two classes) + EventNormalizer

| | |
|---|---|
| **Best references** | **hermes (message-source channels)**, **vibe-kanban (transport-access channels)** |
| **Adopt** | **Name two channel CLASSES with different correlation oracles:** (a) *message-source* — normalize heterogeneous platform content into one envelope (hermes `MessageEvent` + `SessionSource`); (b) *transport-access* — tunnel the whole opaque API, correlate by exact transport-id, authenticate the channel (vibe-kanban relay). Two-struct envelope split (content + identity). Capability negotiation via flags + graceful-degrading default stubs (hermes). The relay/connector contract (an opaque connector fronts any platform behind one wire contract). Local file paths in the envelope, not platform URLs. |
| **Reject** | N-way duplicated normalization (one declarative engine, not 20 hand-written normalizers — hermes). The 16-file built-in channel checklist (make the *only* path the plugin path). No outbound idempotency. |
| **Open** | — |

### L9 — Wait conditions & external/fuzzy correlation **(THE OPEN GAP)**

| | |
|---|---|
| **Best references** | hermes (`build_session_key` — exact-only pure-function oracle), Temporal (signals/queries, exact id correlation), vibe-kanban (exact host-id), LangGraph (barrier as wait-state) |
| **Adopt** | The pure-function-as-conformance-oracle idea for *exact* correlation (hermes `build_session_key` — referentially transparent over a fixed discriminator set). Signals as buffered durable events correlated by id (Temporal). Wait-as-checkpoint (durable deadline, send/recv as commit points — DBOS/Temporal). |
| **Reject** | — |
| **Open** | **FUZZY / heuristic external correlation has NO reference in the series — every studied system is exact-only.** "Which in-flight conversation/run does this loosely-matching external event belong to?" (content-based, heuristic, probabilistic) is the **one layer v3 must design itself** with no prior art to lean on. This is the standout open question after ten studies. |

### L10 — Gatekeeper & private-data federation

| | |
|---|---|
| **Best references** | paperclip (`OPERATION_CAPABILITIES` capability-gated plugin gatekeeper — closest), hermes (network egress isolation) |
| **Adopt** | The capability-gated gatekeeper as the federation boundary (paperclip). |
| **Reject** | — |
| **Open** | Cross-firm private-data federation is lightly covered; mostly v3-original (the convergence work's L10). |

### L11 — Agent registry & memory scopes

| | |
|---|---|
| **Best references** | **Honcho (the reference)**, hermes (flat-Markdown, the simpler end) |
| **Adopt** | **Memory as a directed edge keyed `(observer, observed)`** — self-model (observer==observed) and theory-of-mind unified; the 5-coordinate address `(workspace, observer, observed, session|NULL, level)` (Honcho). Two orthogonal scope axes (perspectival × episodic, nullable-session = promote-to-global). Provenance tree via `source_ids` + reinforcement counter. Two-tier retrieval (static representation vs agentic synthesis). Off-thread serialized memory writes (hermes). Scopes-as-directories for the curated layer (hermes). |
| **Reject** | Profile-global-only scope (hermes — lacks per-conversation/per-project). Identity-summary artifacts in JSONB metadata (Honcho — give them first-class tables). |
| **Open** | — |

### L12 — Metacognition / learning

| | |
|---|---|
| **Best references** | **Honcho (two-speed structured loop)**, hermes (forked-reviewer), Superpowers (human-curated + tested) |
| **Adopt** | The **two-speed loop**: cheap explicit-only extraction on the hot path + deferred structured consolidation on an evidence threshold (Honcho). **Structural reconciliation** (embedding-dedup + reinforcement counter), not LLM-rewrite. Typed conclusions with required source-linkage. The forked-reviewer pattern (toolset-whitelisted second agent, Hermes). Idle+threshold trigger with anti-feedback discipline (Honcho). "Match the Form to the Failure" + behavioral regression tests for curated procedures (Superpowers). |
| **Reject** | Surprisal/spatial-tree "research theater" (Honcho — off by default; pgvector ANN gives the same signal). Marketing a fixed-counter loop as "autonomous self-improvement." The hand-TDD-every-skill cost model at kernel scale (Superpowers). |
| **Open** | — |

### L13 — Trust calibration & evals

| | |
|---|---|
| **Best references** | (lightly covered; Superpowers' behavioral regression tests + Temporal's BAD_BINARY are the closest) |
| **Adopt** | A conformance harness that replays a procedure against a fresh agent and asserts on the emitted event stream (Superpowers). BAD_BINARY-style "this build/prompt is poison" + version-pinning for agent/prompt versioning (Temporal). |
| **Reject** | — |
| **Open** | Trust calibration is mostly v3-original. |

### L14 — Org-scale governance

| | |
|---|---|
| **Best references** | (out of scope for all studies) |
| **Adopt** | — |
| **Reject** | — |
| **Open** | Entirely v3-original. |

### Cross-cutting — Observe-seam (drive/observe a run from outside)

| | |
|---|---|
| **Best references** | **vibe-kanban (`MsgStore`)**, LangGraph (checkpoint streaming), Temporal (the ACP-style external protocol) |
| **Adopt** | **The `MsgStore` buffer-replay-then-tail primitive** — `history_plus_stream()` snapshots history + subscribes live *atomically* (no late-joiner race); persistence is just-another-subscriber; identical live-vs-historical API (vibe-kanban). One store per addressable unit keyed in a map. Self-describing envelope + in-band terminator + lag-drop. Implement a *third-party typed protocol* (Temporal's ACP) so external orchestrators drive v3 for free. Typed Rust/TS boundary with a CI drift gate. |
| **Reject** | An untyped streaming envelope (vibe-kanban's one defect — put the event frame in the typed contract). |
| **Open** | — |

---

## 5. Mapping study lessons onto the convergence roadmap

The studies' simplified glossary maps onto the convergence build's finer roadmap as follows.
This is the channelling guide: when a convergence level is built, the listed cross-study lessons
are its external evidence.

| Convergence level | Cross-study lessons to channel in |
|---|---|
| **L0a kernel** | Commit-based transition + idempotency ledger `(instance_id, op_id)` + `expected_version` CAS + transactional outbox (§2.1, §3.1, L0a matrix). Record-not-replay actor-output commit (§3.4). |
| **L0b actor + packet** | File-handle ContextPacket (§Superpowers). First-class actor (the gap all systems leave). |
| **L0c AgentConfig** | Immutable `ModelConfig` value object + two-tier secret-ref→resolved + call-site routing (Honcho). Serialized run-intent in the durable record (vibe-kanban). |
| **L0d lifecycle** | Commit-then-observe; close-command-last invariant; no mark-failed-only recovery. |
| **L0e runtime-context** | Opaque handle; scripts-as-processes; two-tier cleanup; provision↔release mirror (the ② strand). |
| **L0f project config** | Typed slots cascade (already built); durable plan artifact with constraints+interfaces. |
| **L1 capability** | (v3-original; no strong external reference) |
| **L2 / L2a / L2b gates** | The `verify` gate (independent-evidence, §3.5); read-only stateless gates; WARN verdict; declarative/packaged/process × inline/deferred (already built). |
| **L3 human Ask** | Audited decision record as kernel primitive (§3.2); validate-before-mutate; closed-enum + destructive-route validation; escalating round caps; id-keyed parallel gates. |
| **L4 child workflow** | Slot-correlation (=authorization) + barrier-channel join-state + partition-then-verify discipline + persisted spawn binding + spawn-as-durable-write (§3.3). |
| **L5 help / skills** | agentskills.io format + action-indirection portability + trigger-only descriptions + active-entry bootstrap. |
| **L6 triggers** | Look-ahead durable timers + idempotent-re-execution exactly-once + retries-as-timers + claim-for-fire CAS. |
| **L7 grants** | Credential-never-travels broker (architectural) + SPAKE2/signed-request channel trust. |
| **L8 channels** | Two channel classes (message-source / transport-access) + two-struct envelope + capability-flag degradation + relay contract. |
| **L9 wait/correlation** | Exact: pure-function oracle + signals-as-buffered-events. **Fuzzy: design from scratch (the open gap).** |
| **L10 gatekeeper** | Capability-gated federation boundary. |
| **L11 registry/memory** | Directed-edge `(observer, observed)` memory + perspectival×episodic scopes + provenance tree + two-tier retrieval. |
| **L12 learning** | Two-speed loop + structural reconciliation + forked-reviewer + idle+threshold+anti-feedback. |
| **L13 trust/evals** | Conformance harness + BAD_BINARY/version-pinning. |
| **L14 org-scale** | (v3-original) |
| **Cross-cutting observe-seam** | `MsgStore` buffer-replay-then-tail + typed external protocol + typed boundary with CI drift gate. |

---

## 6. The final synthesis line

> **v3 = a commit-based, leaderless distributed-workflow kernel for LLM actors.**
>
> **Kernel (L0a):** DBOS's storage discipline (materialized aggregate + an `(instance_id, op_id)`
> idempotency ledger) + a per-instance `expected_version` CAS + Temporal/CHASM's commit/outbox
> discipline + the fencing token only for multi-step leases — validated end-to-end by LangGraph
> (the closest analogue) converging on the same commit-based, pending-writes shape.
>
> **Actors (L0c):** Honcho's immutable `ModelConfig` run-intent + paperclip's host-owned session
> bytes, with **every LLM call an atomic, content-addressed, never-replayed commit** (Temporal's
> Activity carve-out made mandatory, not LangGraph's opt-in `@task`).
>
> **Correlation (L4/L9):** Temporal's slot (identity=authorization) + LangGraph's barrier-channel
> join-state + Superpowers' partition-then-verify discipline for fan-in — and a **fuzzy external
> correlation layer v3 must build itself** (the one layer with no prior art).
>
> **Gates & humans (L2/L3):** the convergence gate pipeline + Superpowers' independent-evidence
> `verify` gate + paperclip's audited decision row + Temporal's validate-before-mutate — never an
> ephemeral or self-reported decision.
>
> **Outer layers (L5–L12):** Hermes/vibe-kanban's two channel classes + the `MsgStore` observe-seam,
> Honcho's perspectival directed-edge memory + two-speed learning loop, the agentkills.io skill
> standard with action-indirection portability, look-ahead durable timers, and the
> credential-never-travels broker.
>
> The throughline: **the field's closest existing system (LangGraph) converged on v3's core choices,
> which de-risks them; v3's contribution is making that core distributed, leaderless,
> record-not-replay-by-default, and audited — plus the fuzzy-correlation layer nobody has built.**

---

## 7. What is settled vs what is open

**Settled by the series (high external corroboration):**
- The two central bets (commit-based, leaderless) — §2.
- Close idempotency at the source — §3.1.
- The audited decision record as a kernel primitive — §3.2.
- Record-not-replay mandatory for actors — §3.4.
- The `verify` gate / durable-state-over-self-report — §3.5.
- The L0c immutable run-intent value object — L0c matrix.
- The L11 perspectival memory model — L11 matrix.
- The two channel classes + the observe-seam — L8 / cross-cutting matrices.
- Look-ahead durable timers + idempotent-re-execution — L6 matrix.
- Credential-never-travels (architectural broker) — L7 matrix.

**Now-corroborated by studies 11-12 (were open / thin, see §8):**
- **The verify gate** — now THREE independent corroborations (§3.5); the most-validated addition.
- **Watchdog / liveness / dead-executor recovery** — gastown is the dedicated reference (the
  "stuck is an intelligence problem, not a timer" law + restart-first/work-durable recovery).
- **L10/L14 federation & org-scale** — gastown's Wasteland is the *first* external reference
  (git-for-data sovereign forks + reputation/Spider-fraud-detection), though cautionary (its
  "claim is intent, not a lock" wild-west mode is a correctness hole v3 must not inherit).
- **The L2 gate enforcement mechanism** — gstack's deterministic three-valued PreToolUse check.

**Still open / v3-must-design-itself (little or no prior art):**
- **L9 fuzzy/external correlation** — the standout open question; every studied system is exact-only.
- **L10 cross-firm private-data federation** — now has a *cautionary* first reference (gastown), but a
  correct claim-arbitration/trust-gate model is still v3's own work.
- **L13 trust calibration** and **L14 org-scale governance** — gastown's reputation/Spider design is a
  first input; the rest is essentially v3-original.
- **L4 fan-in synthesis** — the *pieces* exist (slot + barrier + discipline); combining them into one
  coherent v3 contract is v3's own work (the convergence L4 slice).

**Recommended next step:** channel the §4 matrix + §5 mapping into the convergence build —
specifically, fold the resolved items into `approach.md`'s level notes and realize the
highest-leverage additions in `core-model.html` (the `verify` gate at L2; the audited decision
already at L3; the idempotency-ledger framing at L0a; the fan-in slot+barrier at L4). The research
phase has done its job: the spine is corroborated, the open edges are named, and every lesson has a
home.

---

## 8. Addendum — studies 11–12 (gastown, gstack)

Two studies were pulled in after the §1–§7 synthesis, both relevant to the **parked agent-runtime
topic** ([`_open-agent-runtime-and-pane-layout.md`](_open-agent-runtime-and-pane-layout.md)).
**Gastown** (`gastownhall/gastown`, Go ~243K LOC) is the *parallel-universe v3* — a production
multi-agent workspace manager that runs/coordinates many coding agents on real repos. **gstack**
(`garrytan/gstack`, Markdown) is the *second methodology lens* after Superpowers. Neither moves the
two central bets (§2); together they **corroborate** the verify gate (§3.5), the idempotency hole
(§3.1), and the actor model, and they **fill** two previously-open dimensions (watchdog, federation).

### New dimension — Watchdog / liveness / dead-executor recovery (gastown is the reference)

No prior study had a dedicated liveness subsystem; gastown does (its four-tier "discover, don't
track" cascade). The two laws to adopt:
- **"Stuck is an intelligence problem, not a timer problem."** A kernel primitive may kill only what
  it can prove *dead*; killing what merely looks *stuck* must route to a judgment tier (the named
  "Deacon murder spree" bug is the cautionary origin).
- **Restart-first / work-durable / agent-ephemeral recovery** — resurrect the execution in place
  (preserve worktree+branch+ledger), re-derive position from the durable record. The *opposite* of the
  mark-failed-only anti-pattern (L0d matrix). Plus a crisp **completion invariant** (work pinned +
  sandbox persists + someone respawns ⇒ eventual completion), escalation-as-bead with
  unack-auto-promotion (the timeout is itself a liveness signal), and an **estop kill-switch that
  exempts the coordinator** ("stop the world but keep the brain").

> Channels to: **L9 / a new watchdog slice** (dead-vs-stuck split; restart-first recovery; the
> completion invariant) — and to **L3** (escalation-auto-promotion-on-unack).

### Per-level matrix amendments

- **L0a** — *add* gastown: Beads/Dolt **git-for-data** gives *versioned history for free* (fork =
  `DOLT_BRANCH`, restore = `AS OF`), which aligns with v3's *restore-never-mutate (fork)* principle —
  **steal the capability, not the engine** (Dolt's commit-graph-as-storage-cost needs a fleet of GC
  daemons; all-on-main last-write-wins is the §3.1 hole). Tiered durability (operational / immutable-
  ledger / design planes) corroborates the materialized-aggregate + periodic-snapshot shape.
- **L0b** — *no longer "mostly v3-original."* gastown is the strongest validation of
  identity-durable/activation-ephemeral, **refined to a three-layer split: Identity (durable record) /
  Sandbox (worktree, reusable) / Session (context+pane, ephemeral)** — adopt the vocabulary, consider
  the explicit middle tier. Context is *regenerated from a durable pointer*, not handed over. gstack is
  the negative-space proof: **"roles without actors"** (stateless personas, one implicit actor) — the
  inverse of v3's actor-bound-to-role. *Lift from gstack:* promote **blocking-vs-advisory authority** to
  a schema field on the role→actor binding ("only the eng review gates shipping" — concept present,
  left in prose).
- **L0e** — *add* gastown as the **cautionary tmux reference** for the parked topic: tmux conflates
  substrate+transport+observation, all I/O is screen-scraping (self-labeled a "ZFC violation"), no
  pane-layout config (session=agent, never pane=step), and they *rejected* a backend interface. *Lift:*
  the **Identity/Sandbox/Session** vocabulary + the **`ExecWrapper` sandbox seam + declarative agent
  presets**. (vibe-kanban remains the *clean* PTY reference; gastown is the *cautionary* one.)
- **L2** — *add* gstack: **the deterministic three-valued PreToolUse gate** (`{allow | ask | deny}`
  from a deterministic script, **model out of the enforcement loop**, two strengths: soft `ask` /
  hard `deny`=directory-confinement) is v3's L2 gate *enforcement mechanism* — but make it **default-on
  + fail-closed at the capability layer** (gstack is opt-in/fail-open/session-scoped — a convenience
  guardrail, not a trust boundary). *Add* gastown's **gate-bead** as the structural `verify` gate
  (§3.5). **Two new gate types for the WF-1..WF-7 library:** a CEO **product-premise FRONT-gate**
  (rethink-the-right-thing + mandatory 2-3 alternatives before any code) and a dedicated **security
  OWASP/STRIDE gate** (confidence-tunable = the allow/warn/block sensitivity knob, reads the real
  repo+git). gstack also shows **prose-bypass of a human gate is a *named bug*** → L3 must be
  kernel-enforced, not instruction-enforced.
- **L5** — *add* gstack as a third data point: **portability-by-codegen** (typed `HostConfig` → 10 host
  dialects, **`suppressedResolvers`** = capability-gated step elision, **`preamble-tier`** = graded
  bootstrap dial) — the AOT alternative to Superpowers' runtime action-indirection (adopt the
  config-schema concept, not the materialized 55×10 files). Richer **gate-tier evals** (LLM-judge +
  routing E2E + diff-selected). Clean **power-tool=mechanism vs persona=prose** split.
- **L6** — *add* gastown's **Scheduler** as the cleanest spawn-rate governor: `toDispatch = min(capacity,
  batch, ready)`, **dispatch gated on system health, not just queue depth**, a generic `DispatchCycle`
  with injected callbacks (governor/policy split), scheduling-state-on-a-separate-bead (never mutate the
  work item), circuit breaker, at-most-once "OnSuccess-failure counts as dispatch-failure."
- **L8** — *add* the gastown **nudge-vs-mail doctrine**: ephemeral filesystem poke drained at the turn
  boundary (never cancels in-flight) vs durable addressed message — "ephemeral by default, durable only
  if it must survive death." *Reject* mail-as-permanent-commit + N-copy fan-out.
- **L10 / L14** — *add* gastown's **Wasteland** as the **first external federation reference**:
  git-for-data sovereign forks (sync = `fetch`+`merge`, no central server/consensus) + multi-dimensional
  **reputation stamps** + a hash-chained passbook + **statistical fraud detection on public data (the
  Spider Protocol)** + a **distinct-validators** requirement + multi-criteria time-gated tier escalation.
  *Reject* "claim is intent, not a lock" (wild-west mode) — v3 needs real claim arbitration (a lease/CAS
  in the shared substrate).
- **L11** — *add* two continuity points on the existing honcho↔raw axis: gastown **Seance** (read-only
  *fork of the predecessor's literal session* — zero distillation, the raw-fork end) and gstack's
  **distilled 4-field Markdown checkpoint + a decisions ledger** ("settled unless explicitly
  superseded" — the cross-session-decision primitive). Both are *fallbacks*; honcho's perspectival model
  remains the reference for cross-many-predecessor memory.
- **L13** — *add* gastown's reputation design (**diverse attestation + statistical fraud detection on
  public data**) + gstack's gate-tier evals as concrete first inputs to trust calibration.

### The §8 throughline

Gastown is the **production existence-proof that v3's ambition is buildable**, and its specific pains
(tmux-conflation, the Dolt GC-fleet, the idempotency hole, mail-as-commit, wild-west claims) map
one-to-one onto exactly the things v3's cleaner choices avoid. gstack supplies v3's **L2 gate
enforcement mechanism** (the deterministic three-valued check) and the **"roles without actors" mirror**
that confirms the actor-bound-to-role inversion. The two together leave the §6 final synthesis line
intact and **strengthen it**: the verify gate is now thrice-corroborated, the watchdog and federation
dimensions now have references, and the parked agent-runtime topic has both a clean (vibe-kanban) and a
cautionary (gastown) reference ready for when it resumes.

---

## Caveats

- **This is a meta-layer, not a re-summary.** Each claim here is backed by a specific study's
  LEARN/AVOID verdict (cited there with `file:line`); this note records the *cross-study decision*,
  not the evidence — follow the per-study links for the grounding.
- **Judged against v3's bar.** Many "Reject" verdicts mean "appropriate for that system's scale/scope,
  wrong for v3's distributed-kernel-for-LLM-actors goal," not "wrong."
- **The studies' glossary is simplified.** §5 maps it onto the convergence roadmap; where a study said
  "L9" it meant the broad wait/correlation concern, which the convergence work splits more finely.
- **Snapshot in time.** Twelve studies over 2026-06-19/20, against same-recent HEADs. The synthesis reflects
  those HEADs; the design conclusions are intended to outlast them.
