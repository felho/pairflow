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
> them in place. Read §8 alongside §4. Study **13 (the ETCLOVG survey)** is a different kind of
> artifact — not a codebase but an *external academic taxonomy of the whole problem space*; it
> acts as a **checksum on the level map** and is consolidated in **§9 — Addendum**, which records
> where an independent decomposition agrees with v3's joints (and where the two informative
> mismatches fall). Read §9 as a meta-layer over §4, not another row in it. Study **14 (OneCLI)** is a
> third kind of artifact — not an engine and not a taxonomy but a **single layer (L7, the credential/
> capability boundary) shipped as standalone infrastructure**, and the real component behind the BitSafe
> egress narrative. Its deltas are in **§11 — Addendum**: it sharpens the L7/L2/L13 verdicts and supplies
> a cross-source divergence anchor (article-prose vs. first-party code). It adds no new central bet. Study
> **15 (mnemon)** is the same artifact class as study 14 — a **single pair of layers (L11/L12, agent
> memory) shipped as standalone infra**, and the second memory reference opposite Honcho (study 7):
> *deterministic store + intent protocol + compaction-trigger* against Honcho's *perspectival derived
> edges + two-speed loop*. Its deltas are in **§12 — Addendum**: it sharpens the L11/L12 verdicts and
> supplies the **memory-must-be-a-kernel-port** cautionary anchor. It adds no new central bet. Study
**16 (nanoclaw)** is a **full codebase** whose verdict is *"not a kernel"* — the runtime/supervision/
isolation layer **behind the BitSafe fleet** ("BitSafe's v3"), read at source (six slices). Its deltas
are in **§13 — Addendum**: it grounds the BitSafe narrative in first-party code, **confirms §11 (OneCLI
fail-closed credentials) and §12 (mnemon memory-is-a-port) at the source**, contributes one new
mechanism (the **integration-point contract** as machine-checkable L12), and supplies the corpus's
cleanest **negative proof** of the kernel discipline (its duplicate/loss delivery seams). It adds no
new central bet.

The studies (in order written), and the two pre-existing reference notes:

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
| 13 | [`agent-harness-survey-study.md`](agent-harness-survey-study.md) | academic survey / **ETCLOVG taxonomy** (71pp paper) | **the external checksum** — 6/7 layers map clean; the 2 mismatches (no transactional kernel; no channels layer) ARE v3's deepest bets |
| 14 | [`onecli-study.md`](onecli-study.md) | credential gateway / **Agent Vault** (Rust+TS) | **the L7 capability boundary, shipped** — the survey's "credential never travels" pattern as standalone infra; produce-not-perform for secrets; a divergence anchor |
| 15 | [`mnemon-study.md`](mnemon-study.md) | persistent agent memory (Go+SQLite) | **the L11/L12 deterministic-store reference, opposite Honcho** — LLM-supervises/binary-performs; intent-native `remember`/`link`/`recall`; compaction-boundary writeback; memory-must-be-a-port cautionary anchor |
| 16 | [`nanoclaw-study.md`](nanoclaw-study.md) | containerized agent runtime (TS) | **the runtime/supervision/isolation layer, NOT a kernel** — the component behind the BitSafe fleet; the most operationally concrete L0d supervision loop + best L7/L0e sandbox reference (lockdown on); the **integration-point contract** (machine-checkable L12); the delivery-seam negative proof; confirms §11/§12 at the source |
| — | [`ruflo-v3-sdlc-workflow.md`](ruflo-v3-sdlc-workflow.md) | SPARC/DDD method study | adopt concepts not framework (pre-series) |
| — | [`v3-gate-policy-config-design-synthesis.md`](../topics/v3-gate-policy-config-design-synthesis.md) | gate/policy/config synthesis | L2 design input (pre-series) |

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
| **Open** | The teardown/release contract (the convergence work's LC2 strand already covers this — the L0e provision↔release mirror). |

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
| **L0e runtime-context** | Opaque handle; scripts-as-processes; two-tier cleanup; provision↔release mirror (the LC2 strand). |
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

**Now meta-corroborated by study 13 (the external taxonomy, see §9):**
- **The two central bets** — an independent academic group named v3's thesis verbatim
  ("agent frameworks → agent platforms") and confirmed the *corpus is blind to the transactional
  kernel* (the ETCLOVG L-layer never mentions idempotency/CAS/exactly-once — §9). v3 frames
  idempotency as a field blind-spot, not a debate it wins.
- **The verify gate** — a FOURTH corroboration, now from the meta-level: the survey promotes
  Verification to a *first-class layer* co-equal with Execution/Lifecycle.
- **Record-not-replay & durable-artifact recovery** — the survey's open-problem §12.2 endorses
  v3's fix verbatim ("reconstruct missing state from durable artifacts rather than compressed
  history"), even as its §5.6 mis-files the *mechanism* under context management (the conflation
  v3 disambiguates).

**Still open / v3-must-design-itself (little or no prior art):**
- **L9 fuzzy/external correlation** — the standout open question; every studied system is exact-only.
  **Study 13 confirms this field-wide:** no fuzzy/heuristic correlation mechanism appears anywhere in
  the survey's ~138-project corpus or its five open problems; the richest external description is the
  survey's own §12.4 (posed as *open*), whose handoff field-list v3 should adopt as the ContextPacket
  checklist (§9).
- **L10 cross-firm private-data federation** — now has a *cautionary* first reference (gastown), but a
  correct claim-arbitration/trust-gate model is still v3's own work.
- **L13 trust calibration** and **L14 org-scale governance** — gastown's reputation/Spider design is a
  first input; the rest is essentially v3-original.
- **L4 fan-in synthesis** — the *pieces* exist (slot + barrier + discipline); combining them into one
  coherent v3 contract is v3's own work (the convergence L4 slice).
- **NEW (study 13): self-ablating gates + Observability-as-first-class.** The survey's open-problem
  §12.5 names a concern no studied system solves — every gate/wrapper encodes an assumption about model
  weakness that must be *re-estimated, not assumed*, as models improve; v3 has no "is this gate still
  load-bearing?" ablation mechanism. And the survey promotes **Observability to a first-class layer with
  cost tracking as an output** (§7) — v3 has only a cross-cutting observe-seam, no home for cost/trace as
  operational outputs. Both are v3-must-design (see §9 reconsiderations).
- **NEW (second-pass sweep, §10): internal-event delivery durability + the substrate question.** The L4
  fan-in design corners *creation/correlation* but not the **durability of internal-event delivery** — a
  created-but-undelivered `CHILD_LIFECYCLE` wake re-parks the parent forever (omnigent's sharpest live
  failure); v3 must deliver internal events at-least-once with retry + a deliverability timeout (§10.1).
  And **"which substrate"** is an unexamined default — symphony erases hand-built concurrency control by
  running on BEAM; the whole §4 matrix silently assumes Node/TS-on-Postgres, and that choice deserves an
  explicit, evidence-based answer rather than an implicit one (§10.3).

**Recommended next step:** channel the §4 matrix + §5 mapping into the convergence build —
specifically, fold the resolved items into `approach.md`'s level notes and realize the
highest-leverage additions in `core-model.html` (the `verify` gate at L2; the audited decision
already at L3; the idempotency-ledger framing at L0a; the fan-in slot+barrier at L4). The research
phase has done its job: the spine is corroborated, the open edges are named, and every lesson has a
home.

---

## 8. Addendum — studies 11–12 (gastown, gstack)

Two studies were pulled in after the §1–§7 synthesis, both relevant to the **parked agent-runtime
topic** ([`_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md)).
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

## 9. Addendum — study 13 (the ETCLOVG survey): the external checksum

Study 13 ([`agent-harness-survey-study.md`](agent-harness-survey-study.md)) is the inverse of every
other study and the only one of its kind: not a reverse-engineered codebase but an **independent
academic taxonomy of the entire harness problem space** — Li et al. 2026, *Agent Harness Engineering:
A Survey* (the **ETCLOVG** seven-layer model: Execution / Tooling / Context / Lifecycle / Observability
/ Verification / Governance, coding ~138 open-source projects). Its job in this synthesis is a
**checksum on v3's level map**: does a group that never heard of pairflow carve the harness at the same
joints? It changes none of the two central bets; it **validates the decomposition from the outside** and
locates v3's contribution precisely at the two places the external taxonomy is *silent*.

### The crosswalk verdict — 6/7 clean, the 2 mismatches are the whole signal

| ETCLOVG | v3 home | Fit |
|---|---|---|
| **E** Execution & Sandbox | L0e runtime-context (+ the parked agent-runtime topic) | clean — and "sandbox abstraction layer" is a *named* pattern (SWE-ReX, smolagents `executor_type`, k8s Agent-Sandbox CRD) = the strongest proof L0e should be a layer, not a per-actor feature |
| **T** Tool & Protocol | L0c adapter · L1 capability · L5 skills | clean — but the survey's *four boundaries* (Model↔Function / **Agent↔Capability=MCP** / **Agent↔Agent=A2A** / Agent↔Repo=AGENTS.md) say v3 needs **distinct seams for actor-invocation vs inter-actor delegation** |
| **C** Context & Memory | L0b packet · L11 memory · L12 learning | clean — adopt "horizon" as the axis label; the C=9 "thin" reading is *corrected* (rich standalone-memory market, §below) |
| **L** Lifecycle & Orchestration | L0a · L0d · L4 · L6 | **partial — THE mismatch:** the survey folds the durable kernel into orchestration and **never names idempotency/CAS/exactly-once** (§6.1 "durable"=resumable, not transactional). v3's L0a is the missing inner discipline of this 47-project layer |
| **O** Observability & Operations | the observe-seam (no numbered level) | **gap in v3** — the survey makes O a first-class layer with cost/trace outputs; v3 has only a cross-cutting seam (reconsider, §below) |
| **V** Verification & Evaluation | L2 gates + the `verify` gate | clean+ — V is a *first-class layer*; tells v3 the verify gate is **layer-sized**, with a 5-stage sub-structure |
| **G** Governance & Security | L2 · L3 · L7 · L10 · L13 | clean — "declarative constitution" = the policy-config's user-facing name; audit-record **must hash/sign** |

**No ETCLOVG home for** v3's **L8 channels** (dispersed across T/L/O) or **L9 fuzzy correlation** (nobody
has it) or the **L0a idempotency kernel** (folded into L). The external taxonomy being silent at exactly
v3's two deepest bets (L0a, L8) is the evidence those bets are *non-obvious differentiators*, not errors.

### Per-level matrix amendments (study 13)

- **L0a** — *meta-confirms the §3.1 idempotency hole at field scale.* The survey's densest layer
  (L = 47 of ~138 primary projects) is built **without any named durability protocol**: §6.1 enumerates
  *what* state to persist but its only axis is stateless/stateful/hybrid; "stateful" is an unaudited label
  ("stores state outside the prompt"), no system credited with dedup/CAS/outbox. Tellingly the corpus's
  *most durable* system (Anthropic Managed Agents) is filed under **Observability (§7.4)** and is still
  **event-sourced replay-resume**, not commit/CAS. **v3 must frame L0a as the gap the corpus is blind to**
  (the survey never *debates* commit-vs-replay at the orchestration level — it doesn't raise the question).
- **L0b** — *adopt the survey's vocabulary.* "Horizon" as the context axis label (short active-window /
  mid-term session / long-term persistent); the KV-cache constraint (**append-only, stable-ordering,
  deterministic-serialization** packet assembly — cached $0.30 vs uncached $3.00/MTok). Honcho's
  `(observer, observed)` edge is named precisely in §5.5.2 ("models users not facts; per-agent perspective
  prevents cross-contamination while a shared user-model accumulates").
- **L0e** — *the parked agent-runtime topic gets its clean split named.* The survey's own E/T/O division
  *is* the disambiguation the parked doc reached for: **substrate = E-category choice; I/O-transport
  (screen-scrape vs API vs shell) = a property of that category; observation = the O-seam.** tmux
  screen-scraping is a low-fidelity point in the computer-use/shell I/O space — an adapter detail below the
  kernel line (confirms gastown's cautionary reading, §8). *Adopt:* the **self-hosted / cloud / hybrid-BYOC**
  deployment triad and the **Local/Remote-Workspace split** as L0e's first-class abstraction (the parked
  topic's MVP-scope question). Design rule: **"minimal, not maximally capable"** substrate.
- **L1 / L5** — *no longer purely v3-original on tooling.* "**Fewer but better tools**" is empirically
  backed: oversized menus degrade reliability → L1 should be **pruned per-step**, not just enumerated.
  Skill-selection is a *distinct* retrieval problem from tool-selection (SkillRouter/SkillRet) → confirms
  L5 as a separate retrieval surface above L1.
- **L2 / verify gate** — *the FOURTH corroboration, and a sub-structure.* V is a first-class layer; the
  root framing "**a score is a property of the model–harness *pair***" and "**the evaluator is a component
  under test, not an oracle**" are the academic root of durable-state-over-self-report. The 5 stages give
  the `verify` gate its shape: **pre-execution readiness = a FRONT gate** (3 sub-checks: env reset / tool-
  context-permission consistency / **versioned grader**); **multi-level judgement = a panel layered by
  *level* not voter** (outcome / trajectory / evaluator); **continuous regression = the deferred-gate-into-
  a-layered-suite**, **re-fired by *harness* changes, not just model changes** (a gate/policy edit must
  re-trigger the suite). Gates should carry **cost/latency**, not just correctness.
- **L3** — *the four canonical hook points = a gate-placement spec.* H1 input-guardrail / H2 action-
  validation (= gstack's PreToolUse) / H3 post-exec info-flow / **H4 human-in-the-loop (= v3's
  DECISION_REQUEST)**. HITL hooks have three named design dimensions — validation-scope / alert-richness /
  recurrence (allow-once vs allow-always) — that parameterize the L3 payload. The Android-permission
  warning (17% read dialogs) argues for **rich, infrequent** decisions.
- **L7** — *credential-never-travels is the survey's exact pattern* (Skyvern: vault + placeholders to the
  LLM + raw substitution at the execution layer), with a **named unsolved part v3 inherits**: secret
  lifecycle over long-horizon sessions (tokens expire/revoke mid-trajectory; renewed creds must stay
  outside model context). Identity model: authenticated-delegation token chain (User-ID + Agent-ID +
  scoped Delegation Tokens).
- **L8** — *confirms the two-classes instinct by negative space.* The survey has **no first-class channel
  layer**; it disperses handoffs across T (protocol) / L (orchestration) / O (observability) and elevates
  them only as open-problem §12.4. **The §12.4 handoff field-list = the ContextPacket checklist:** nine
  payload fields (*intent, constraints, permissions, artifacts, provenance, budget state, risk level, trace
  history, unresolved decisions*) **+ five responsibility clauses** (*who authorized / which state
  transferred / which evidence / what the receiver may do / when control returns*). Adopt as a two-section
  ContextPacket spec — v3 making L8 a first-class level is *ahead* of the field.
- **L9** — *meta-confirms the standout open gap.* No fuzzy/heuristic/external-correlation mechanism appears
  anywhere in §9–§13 or the corpus; every handoff/identity/correlation surveyed is exact/explicit. The
  survey poses rich-handoff (§12.4) as *open*. L9 has no prior art — confirmed field-wide.
- **L11** — *the C=9 "thin" reading is corrected.* The low count is a *primary-label artifact*: §5.5
  documents a **rich standalone-memory market** (MemGPT paging, Mem0 ~14M downloads, A-MEM retroactive
  links, Honcho, cq MCP-native fleet memory, MemoryBank decay+contradiction-resolution). honcho's
  standalone-memory bet is **strengthened**, not merely validated. *Vocabulary:* context **rot**
  (single-step degradation, begins before window-full) vs context **drift** (trajectory-level, 100+ turns).
- **G / policy-config** — *the constitution is a YAML *file*, enforcement is *hooks*.* AutoHarness schema =
  the policy-config field list (pipeline-mode / risk-patterns / allow+deny tool patterns / token-budget /
  audit-destinations); position v3's config consciously on the **YAML → policy-DSL → hard-coded spectrum**
  (no portable standard exists — define v3's own, MCP-analogously). Audit-record field list (§9.5) = the
  paperclip-ledger spec, with the warning **"few sign or hash records, leaving trails susceptible to
  tampering by a compromised agent"** → v3's ledger must hash/sign. Detection splits **inline per-commit
  gate + async trajectory-level ledger-scan**.

### New reconsiderations study 13 raises for the convergence build

1. **Promote Observability to a named concern with cost as an output.** The survey's O-layer (15 projects,
   5 subcategories) is owned by a different team/stack in production — the argument for a boundary. v3 has
   the observe-seam (read side) but no home for traces/cost/reliability as operational outputs. The
   **AgentSight out-of-process eBPF model** (monitors from outside the process at the SSL boundary,
   uncircumventable by a compromised agent) says the observe-seam belongs *below* the actor, in the
   kernel/runtime — which v3's commit-log is well-positioned to be.
2. **Resolve capability–control as one-config-surface-over-five-levels.** §11.2 states capability+control is
   **one design axis** "linking tool schemas, context policy, runtime permissions, identity, auditability,
   human approval" — *because* it threads v3's L1/L2/L3/L7/L13. This **resolves** the apparent fragmentation:
   one *config surface* (the "constitution") projecting onto five *mechanism levels*. Document it in
   `approach.md`.
3. **Add a self-ablation discipline for gates (§12.5).** Every gate encodes an assumption about model
   weakness that must be re-estimated as models improve (Anthropic: context-resets useful for one model
   became dispensable for a stronger one). v3 needs gates to be **ablatable / shadow-testable**, with the
   O-layer meta-monitoring which interventions still pay.
4. **Naming hygiene at zero cost:** adopt "horizon" (C axis), "constitution" (policy-config), "task runner"
   (the WF-1 abstraction §6.4 names) to align v3 with the field vocabulary.

### The §9 throughline

An independent academic group decomposed the harness into seven layers and **six of them land on v3's
existing joints** — the level map is not idiosyncratic. The taxonomy's two silences — no name for the
transactional kernel (it folds durability into orchestration *and* mis-files it under context, §6.1/§5.6),
no first-class channel layer (handoffs dispersed, rich-handoff left as open-problem §12.4) — fall **exactly
on v3's two deepest, least-obvious bets (L0a, L8)**. The survey's headline arc — *"from agent frameworks to
agent platforms"* — is v3's positioning verbatim, and it places v3 precisely: a **kernel under the platform
tier**, the thing that makes a fleet's actions "inspectable and reversible over time" (the commit log). Net:
study 13 leaves the §6 synthesis line intact and **hardens it** — the verify gate is now four-times
corroborated, L9's emptiness is confirmed field-wide, and the two things the external taxonomy can't name
are the two things v3 should say loudest.

---

## 10. Addendum — the second-pass delta sweep

An independent 10-lens *second pass* was run over **all twelve** studies. §1–§9 above were written from the
*first* pass. This section folds back only the second-pass findings that **move a cross-study conclusion**
— it does not re-summarize the deltas, and it deliberately leaves the original first-pass matrix rows (§4)
untouched as the record, layering the sharpenings on top with explicit cross-references. The signal that
earned a finding its place here is **convergence**: most of the load-bearing items are points where *two or
more* studies independently sharpened the same conclusion. §10.1–§10.3 fold the first eight studies
(omnigent, symphony, paperclip, dbos, hermes, superpowers, gstack, gastown); **§10.4** folds the round-two
pass over the final four (vibe-kanban, honcho, temporal, langgraph), which produced the corpus's single
strongest *new* theme — the identity/durability decomposition.

### 10.1 Convergent sharpenings (≥2 studies independently)

- **The event model is under-specified: delivery durability + one unified model** *(omnigent, gastown)*.
  The §4 L4 matrix models fan-in *creation/correlation* (slot + barrier + partition) but never the
  **durability of internal-event *delivery***: omnigent's single most safety-critical live failure is a
  `CHILD_LIFECYCLE` wake that is created-but-not-delivered → the parent re-parks forever. Gastown shows the
  dual disease from the other side — *three overlapping* event/trigger systems (capacity dispatch, convoy
  DAG, filesystem channel-triggers, flocked audit log) accreted with no unified model. **Adopt:** v3 needs
  **one** internal event model with explicit durability tiers, trigger semantics, and a correlation id
  (`run.id`), and internal kernel events must be delivered **at-least-once with retry + a deliverability
  timeout** — delivery gets the same rigor as creation. *(Sharpens §3.3 / L4 "Adopt"; flips L4 "Open" from
  "—" to: internal-event-delivery durability is the residual L4 edge.)*

- **Recovery is typed data, not one `failed` bucket** *(paperclip, hermes)*. The §4 L0d row only states the
  *negative* ("reject mark-failed-as-only-recovery"). Both second passes supply the *positive*: paperclip
  distinguishes ~8 recovery classes (zombie / process-loss / silent-live / success-without-disposition /
  stale-lock / transient-upstream / max-turn / intentional-pause), each routing different
  retry/handoff/pause/human-review behavior; hermes frames it as an explicit **per-operation-class policy
  table** (repair / skip / fast-forward / retry / terminalize) and adds that cooperative cancellation
  (`Future.cancel`) is **not** a hard abort — a kernel needs a durable abort path. **Adopt into L0d:**
  encode *recovery reason* as typed data driving a per-operation-class policy table; one global retry rule
  (and one `failed` status) is too weak. *(Sharpens §4 L0d "Adopt"; extends gastown's §8 binary
  restart-vs-mark-failed into a policy-matrix axis.)*

- **Ownership-claim ≠ live-reachability; the lease is one (claim + heartbeat + reclaim) contract**
  *(omnigent, hermes, gastown)*. §2 Bet 2 reserves the fencing token for multi-step leases but never states
  the contract shape. Three studies converge: omnigent binds a durable `runner_id` via a `WHERE runner_id
  IS NULL` CAS (the leaderless analogue of Temporal's lease), **orthogonal** to heartbeat liveness — so
  dispatch distinguishes *conflict* (no owner bound) from *unavailable* (owner offline); hermes models the
  lease as one contract proven by **matching a claim token on renewal**, with the live concurrency cap
  counting *running* work not spawn budget; gastown shows the failure mode — a cross-process
  read-modify-write needs a lock around the **whole** cycle, and PID-only stale-lock detection is too weak.
  **Adopt:** model the multi-step lease as one claim+heartbeat+reclaim contract with a renewal token;
  separate durable ownership from live reachability; **reject** file-locks, process-local running-sets, and
  any fail-open lock as correctness mechanisms. *(Sharpens §2 Bet 2 + §4 L0d/L6.)*

- **Fan-in must be durable state — and context-injection is not a gate** *(paperclip, hermes)*. The
  corpus's biggest open question (§3.3) gets two sharpenings. Paperclip is the **durable** instance the
  pattern lacked: fan-out writes a claim/fingerprint decomposition row + child issues, and fan-in is a
  **state predicate over committed child rows** (parent wakes only when every child is `done`/`cancelled`),
  not an in-process subagent handle. Hermes supplies the **named anti-pattern**: its cron `context_from`
  injects the predecessor's latest output into the prompt but is *not* a dependency gate — **context-
  injection masquerading as fan-in** is the trap; a real join needs a barrier on identity (LangGraph's
  `NamedBarrierValue`), not output-passing. *(Sharpens §3.3: add paperclip as the durable reference + the
  context-injection-is-not-a-barrier AVOID.)*

- **The observe-seam is three media; never use the live cursor as the replay cursor** *(paperclip, hermes,
  gstack, gastown — four-study convergence)*. The cross-cutting observe-seam row adopts vibe-kanban's
  `MsgStore` but understates the durable/live split. Convergence: paperclip — a durable per-run **sequenced**
  event stream is the replay cursor; the process-local live envelope is acceleration/invalidation only
  (never use the live id as a replay cursor). Hermes — **three distinct event types** (inbound normalized
  command · internal durable op-event · outbound presentation/progress) must not be one type, and the
  correlation oracle must stay free of platform-routing exceptions (reinforces L9). Gstack — **three media**
  (in-memory live ring-buffer/cursorable-SSE with monotonic id + `after` cursor + explicit gap event ·
  durable replayable lifecycle events · append-only JSONL forensic audit); the ring buffer is explicitly
  **not** the replay log. Gastown — the same three planes (operational / disaster-ledger / observable-events)
  must be distinct stores, not one store pretending to be all. **Adopt:** back the seam with a durable event
  table keyed `(run_id, event_id, parent_event_id, session_id, ts, type, visibility)` — note the
  `parent_event_id` (event-tree) and `visibility` (operator-facing vs internal) columns the in-memory
  variants lack — and keep live-push, durable-replay-log, and forensic-audit as three media. *(Sharpens the
  cross-cutting observe-seam row + gives §9's "promote Observability to a first-class layer" reconsideration
  the concrete schema it lacked.)*

- **The verify gate: verify at the transaction boundary, with multiple independent oracles** *(paperclip,
  gstack)*. Paperclip is the cautionary exhibit — its README claims "atomic" budget enforcement and
  "revisioned" config, but budgets are a preflight TOCTOU check and revisioning covers only docs/routines;
  the *only* genuinely-atomic move is the §3.2 decision-insert-in-same-transaction. Lesson: v3's own
  invariants (atomic commit, idempotency, audited decision) must be **verified at the transaction boundary,
  not asserted in docs**. Gstack adds the **oracle-multiplicity** dimension: high-value artifacts should
  carry invariant checks across *multiple independent* non-model oracles (e.g. text-extraction + pixel/
  structural assertions), explicitly not screenshots or model judgment alone. *(Sharpens §3.5.)*

- **Adapters & capabilities need a generated/shared schema + conformance tests** *(paperclip, superpowers)*.
  Paperclip's `OPERATION_CAPABILITIES` is the §4 L10 federation reference, but the second pass shows the
  capability/adapter knowledge is duplicated across registry, shared constants, env-support, UI maps, and
  per-plugin registries → hand-sync **drift**. Superpowers shows the same gap from the adapter side: it has
  no machine-readable provider capability schema, and provider contracts (session-start context injection,
  hook message-shape, skill-routing **event-order**) are documented, not conformance-tested. **Adopt:**
  v3's federation/capability + adapter layer should use a **single generated/shared schema** with **golden
  compatibility / conformance tests** (including event-order regression tests), not scattered adapter-type
  branching. *(Sharpens §4 L0c + L10.)*

- **Fail-closed is a cross-layer rule, and the scan surface is *post-expansion*** *(superpowers, hermes,
  gastown, gstack)*. Four security sharpenings converge on "fail closed, check identity, scan the right
  surface": superpowers — cleanup/teardown must validate a durable **instance identity** (not PID/path
  alone) and fail closed on stale/impostor metadata; an uncertain owner must **observe, not commit** (never
  overwrite persisted state it doesn't own). Hermes — gate/scan the **assembled** context *after*
  skill-expansion and dynamic-recall injection, not just raw user input (that is where the injection surface
  is). Gastown — a declared sandbox mode must **error rather than silently degrade** to local execution
  (its proxy client falls back to local exec when the proxy env is absent — an anti-pattern); its host proxy
  is also a copyable capability boundary (mTLS CN identity, command allowlists, **server-side git-branch
  authorization** — directly relevant to a commit-based kernel's write-scope-per-actor question). Gstack —
  root tokens mint/revoke and never enter untrusted environments while children get per-spawn **scoped**
  tokens, and external/browser-derived context packets need a **content-security** layer (injection
  sanitizing, exfil-domain blocking) distinct from transport auth. *(Sharpens §4 L0e + L7 + L2; gives the
  per-actor write-scope question a concrete reference.)*

### 10.2 Precision correction to a central bet

- **DBOS exactly-once is two-layered — don't over-claim it at the *effect* level** *(dbos)*. §2 Bet 1 credits
  DBOS with flat "exactly-once via step-memoization." The second pass corrects: `operation_outputs` memoizes
  orchestration steps (replay-safe **orchestration**), but true exactly-once **effects** require the side
  effect *and* its checkpoint to co-commit in **one** transaction (DBOS's datasource-local
  `transaction_completion`). A generic step is **not** atomic with its side effect. v3 must claim
  exactly-once *effects* only for a provider that co-commits effect + checkpoint; otherwise it is
  exactly-once *orchestration* with at-least-once effects. The same pass adds a leaderless-dispatch invariant
  the synthesis omitted: a transition from available→claimed must **dispatch in the same local control path**
  (or persist a recoverable handoff / revert) before returning — "claim many, dispatch later" orphans work
  (a real DBOS `wfqueue` bug). And idempotency is **one mechanism over four keyed contracts** (whole-run /
  step+name-drift / queue-dedup / message-delivery) — specs/tests must name *which* key layer a change
  touches. *(Sharpens §2 Bet 1 + §3.1/§3.4 + §4 L6.)*

### 10.3 Singletons worth recording

- **Substrate is an unexamined default, not a settled choice** *(symphony)* — symphony ships a working
  orchestrator with *zero* concurrency-control code because BEAM serializes mutations and supervises crashes
  natively. The whole §4 matrix silently assumes a Node/TS-on-Postgres substrate that hand-builds mailboxes,
  role→actor dispatch, and version guards. Not a recommendation to adopt OTP — a flag that **"which
  substrate" deserves an explicit, evidence-based answer** rather than an implicit default. *(New §7 open
  item.)*
- **The fork-ownership rule + named checkpoint scope** *(omnigent)* — operationalizes gastown's §8
  Identity/Sandbox/Session split: a fork copies replayable history + portable context but must **not** copy
  live-ownership facts (`external_session_id`, `workspace`, `git_branch`) — the new instance re-acquires its
  own Sandbox/Session; and checkpoint/approval **scope** (run / session-tree / user-day / op) must be named
  explicitly. *(Sharpens §8 L0b.)*
- **Five-record separation + two-phase lock acquisition** *(paperclip)* — "durable kernel" ≠ "one durable
  table": notification-intent / execution-run / issue-lock / runtime-session / durable-log-stream are five
  records with distinct failure modes; and ownership is acquired in two phases (atomic run-claim
  `queued→running` *before* binding the durable work-lock) so a queued-but-never-started run can't hold work
  hostage. *(Sharpens §4 L0a.)*

### 10.4 Round-two deltas — the final four studies (vibe-kanban, honcho, temporal, langgraph)

The round-two pass over the four previously-undeltaed studies produced the corpus's strongest *new*
cross-study theme plus several sharp refinements. None overturned a bet; the headline (identity
decomposition) is genuinely new.

- **The identity/durability decomposition — do NOT collapse distinct durable identities into one "run
  state"** *(langgraph, temporal, paperclip §10.3, honcho — four-study convergence; the strongest new
  theme)*. LangGraph proves **five** distinct durable identities — timeline (`thread_id`), attempt (`run`),
  state-point (`checkpoint`), task-scoped idempotency record (`pending write`), cross-thread memory
  (`store`) — *and* four distinct runtime ports (context / state / config / store) that must not silently
  substitute for each other. Temporal adds that the **current-execution pointer is a separate mutable
  pointer from the durable history row** (write modes brand-new / update-current / bypass / ignore-current):
  once reruns/forks exist, *instance identity is a pointer, not a row*. Temporal also separates **three
  context-durability classes** — durable transcript truth / queryable projections (memo, search attrs) /
  runtime in-flight registries (query waiters, in-flight updates) — where a live operation is
  registry-backed while pending and *graduates* to history-backed on completion. Honcho shows the dual
  discipline: name **one** correlation/partition key (`work_unit_key`) in the task spec itself, so
  idempotency-dedupe, queue-ownership, operator-status, and fan-in all speak one domain language. **Adopt:**
  v3 must keep timeline / attempt / commit / recorded-effect / long-term-memory as distinct durable
  identities (the idempotency ledger is *task-scoped*, not attempt- or thread-scoped), keep the
  current-run *pointer* separate from the durable instance *row*, and name the correlation key in the task
  contract rather than synthesizing it per-subsystem. *(Sharpens §4 L0a/L0b; generalizes §10.3's paperclip
  five-record singleton into a four-study theme.)*

- **Fan-out is identity-preserving; the slot generalizes to a three-record deferred-correlate primitive**
  *(langgraph, temporal)*. The synthesis's §3.3 AVOID ("anonymous reduction loses child→result identity")
  is real but the loss is **purely a join-side choice**: LangGraph's `Send` is a durable write carrying a
  deterministic `task_id`/`path`/`checkpoint_ns`, so fan-*out* is identity-preserving — v3 keeps that spawn
  id and carries it through the barrier rather than reducing into an anonymous aggregate. Temporal
  generalizes Temporal's own slot (§3.3) into *the* universal primitive: every deferred-correlate operation
  (child start, activity schedule, external signal, retry) is **three records** — (a) the durable domain
  fact, (b) a pending record keyed by the issued event-id/request-id (this **is** the authorization slot),
  (c) a transfer/timer task that merely drives delivery. Correlation-is-authorization lives in (b);
  delivery durability lives in (c). *(Sharpens §3.3 — the corpus's most-open question.)*

- **Merge/reducer laws are unproven even in the closest analogue — type them or route to explicit conflict
  states** *(langgraph)*. The §2 validation rested on LangGraph's superstep-commit + reducer model, but the
  second pass shows LangGraph does **not** prove associativity/commutativity for user reducers — order
  invariance is a documented-but-unenforced contract, safe only because it is single-writer. In v3's
  *leaderless* kernel, merge order is genuinely nondeterministic, so v3 must either make reducer laws
  typed/testable or **route non-commutative merges into explicit conflict states** — never rely on
  arrival-order accidents. *(Sharpens §2 Bet 2 + §3.3; a real caveat on the validation, not just a witness.)*

- **The ownership decomposition: three axes, and the fence must be an inline write-predicate** *(temporal)*.
  §2 Bet 2 treats ownership as one axis (per-instance CAS / the fencing token). Temporal's second pass
  separates **three**: instance/history ownership, dispatch-queue ownership (its own range-ID lease +
  read/write partition split), and sticky actor affinity — independent decisions, not one lease. And the
  real fence is the `rangeID` check **composed inline into the state-mutating write transaction**; a
  separate "am I still owner?" preflight is theater (the SQL `AssertShardOwnership` can be a no-op).
  **Adopt:** keep the conceptual three-axis split even though v3 wants none of the partitioning, and make
  any lease/ownership check an *inline predicate of the mutating write*, never a preflight. *(Sharpens §2
  Bet 2 + the §10.1 lease cluster.)*

- **The aggregate-scoped lock backed by a uniqueness invariant** *(honcho)*. Honcho assigns linear
  per-session sequence numbers by taking a `pg_advisory_xact_lock(workspace, session)` and enforcing DB
  uniqueness on `(workspace, session, seq)`: **lock the aggregate, not the world, and back the lock with a
  uniqueness invariant** so the sequence stays correct even if the lock is bypassed. This is the concrete
  per-aggregate ordering primitive the leaderless kernel's event-numbering needs. *(Sharpens §4 L0a.)*

- **Authority must equal the *checked* authority; the four-input decision shape** *(vibe-kanban, temporal)*.
  Vibe-kanban's `ApprovalResponse` DTO carries a `process_id`, but `respond()` authorizes purely by
  `approval_id` map-removal — the recorded authority is richer than the checked authority. Bind the durable
  decision row to `(approval_id, process_id, actor_id)` so they are equal. Temporal supplies the general
  shape: an authorization decision separates **four inputs** — action (API name), target resource
  (namespace/endpoint), caller claims (mapped roles), transport trust (TLS for bearer) — and token-derived
  identity **cannot** be overridden by request-body fields, with cross-resource ops getting a second
  target-side check. *(Sharpens §3.2 + §4 L3; the only structured authority model in the corpus.)*

- **Smaller round-two sharpenings** *(bundle)*: **control plane ≠ state plane** (langgraph — lifecycle
  commands, approvals, resume inputs, child-routing are typed `Command` envelopes with explicit target
  scope incl. cross-boundary parent targeting, never generic state patches; adopt its persisted *id-keyed*
  gate identity + reserved system keyspace `__interrupt__`/`__resume__` even while replacing its unaudited
  resume value with an audited record → §4 L3). **The replay→live handoff needs an explicit
  "snapshot-complete" marker** (vibe-kanban's `LogMsg::Ready`) so clients don't infer readiness from timing
  — pair it with the in-band terminator so both stream edges are typed signals (→ observe-seam). **L6 timer
  refinement** (temporal — don't materialize every conceptual timer edge; store waiting *intent* in state
  and emit only the earliest next wake-up for a family of deadlines, using status bits to dedupe → §4 L6).
  **Adapter discipline must be *uniform*** (honcho — a clean `ProviderBackend` LLM seam alongside hardcoded
  vector-store/embedding/webhook globals proves the lesson is not "add adapters" but "enforce the adapter
  pattern at *every* volatile boundary" → §10.1 adapter theme).

- **Round-two confirming witnesses** (no new text needed): all four studies independently re-confirmed the
  §10.1 themes — recovery-as-typed-data (vibe-kanban's Killed≠Failed≠Completed + two-phase graceful
  shutdown), event-delivery durability (honcho's outbox gap *before* the queue; webhooks-given-less-rigor-
  than-telemetry-in-one-codebase), the three-media observe-seam (temporal's metadata-only history notifier;
  honcho's SSE-is-chat-UX-not-an-observe-seam; langgraph's seq-not-timestamp typed projections),
  transaction-boundary verification (langgraph's publish-barrier: a checkpoint must not be visible before
  its writes are durable; temporal's `OperationPossiblySucceeded` ambiguous-commit type), and
  adapter-conformance (langgraph's shipped checkpointer conformance suite; the recurring "generated artifact
  without a CI drift gate" gap). The convergence is now corpus-wide.

### The §10 throughline

The second pass — across all twelve studies — moved **no** first-pass conclusion and overturned **neither**
central bet — it *sharpened*, and at one point added a genuinely new theme. The highest-value additions are
convergent: the observe-seam three-media split and the ownership-lease contract each came from 3–4 studies
independently, and the round-two **identity/durability decomposition** (don't collapse timeline / attempt /
commit / effect / memory into one "run state") is a four-study theme the first pass never crystallized. The
one genuine correction (DBOS exactly-once is orchestration-level unless effects co-commit) tightens a claim
the synthesis risked over-stating, and one round-two caveat (LangGraph never proves reducer commutativity —
unsafe to assume in a *leaderless* kernel) flags a real obligation. Net: the spine in §1–§9 holds; §10 adds
the operational-grade detail — the identity decomposition, event-delivery durability, typed recovery, the
inline-fence lease contract, identity-preserving durable fan-in, the three-media observe-seam,
transaction-boundary verification, generated adapter schemas, and fail-closed-by-default — that a *kernel*,
as opposed to a research sketch, has to get right.

---

## 11. Addendum — study 14 (OneCLI): the L7 capability boundary, shipped

Study 14 ([`onecli-study.md`](onecli-study.md)) is the third artifact class in the series: not a
workflow engine (1–12) and not a taxonomy (13), but a **single v3 layer realised as standalone
infrastructure** — OneCLI, the credential gateway / "Agent Vault" that mediates every outbound API call
an agent makes. It is the **concrete reference implementation of the abstract L7 pattern study 13 only
named** ("credential never travels; vault + placeholder to the LLM + raw substitution at the execution
layer," §L7 Skyvern), and the **real component behind the BitSafe egress narrative** that the NanoClaw
harness consumes but does not contain. It changes none of the central bets; it **hardens L7, gives L2/L3
a working human-gate payload, and supplies a cross-source divergence anchor.**

### Per-level matrix amendments (study 14)

- **L7** — *the pattern is now triangulated and shipped.* Studies 3 (paperclip "credential broker"),
  13 (survey "credential never travels"), and 14 (OneCLI, the running instance) name the same seam.
  Mechanism, confirmed from both ends of the wire: agent makes a **credential-less call to the real URL**
  (`HTTPS_PROXY`), a MITM proxy injects the secret by **(host, path) match**, decrypt-at-request-time,
  never entering the model's address space; MCP servers that need a local file get a `0600`
  **`"onecli-managed"` placeholder stub** swapped on the wire; a miss returns an inert `connect_url`, never
  a silent unauthenticated fallback. **Adopt as a first-class port:** a `CapabilityIntent` produced by the
  actor and performed by the kernel/provider, symmetric with `ActionIntent`/`SpawnIntent` — the actor names
  the capability by ref and never receives the value. **Inherit the named-unsolved part** (study 13 flagged
  it; OneCLI doesn't close it): **secret freshness at resume** — a token can expire/revoke mid-trajectory,
  so a parked L4 child or long parent may wake against a dead credential; renewal must stay outside model
  context. Make "capability freshness at resume" an explicit L7 concern.
- **L2 / L3 / LC2 DECISION_REQUEST** — *a working human-gate at the I/O boundary, with the transport to
  reject.* OneCLI's credential-approval flow is structurally v3's LC2: the gateway marks a request for
  approval, a durable `pending_approvals` row is written, an approver is resolved by a policy order
  (scoped-admin → global-admin → owner), and **expiry is a real disposition** (`deny`). **Adopt the
  payload** (record + approver-policy + timeout-route) as the DECISION_REQUEST shape; this is H4 (study 13)
  with a concrete schema. **Reject the transport:** approval is implemented by **holding a live HTTP socket
  open** until a human clicks — if the host callback dies, *every credentialed call hangs to timeout*, and
  the two independently-configured sides (gateway rule ⟷ host callback) can desync. v3's **durable
  WAITING(decision) + committed disposition** is strictly better, and OneCLI is the concrete "why durable
  park beats synchronous hold" example for `approach.md`.
- **L0a / load-time validation** — *fail-closed wiring is the I/O twin of `validate_*`.* Spawn refuses if
  the capability seam can't be established (`ensureAgent()`; no open-egress fallback). Same discipline as
  `validate_child_steps`/`validate_action_steps` rejecting at definition load: *a seam that can't be
  established is a hard reject, never a soft default.*
- **L13 (governance / audit)** — *audit-at-the-boundary the agent can't reach.* The choke point owns the
  trail; "see what every agent is doing" is a property of topology, not of model honesty — the inboard twin
  is v3's out-of-process commit log. Pairs with study-13's "hash/sign the ledger."
- **G / policy-config ("constitution")** — *a cautionary data point.* OneCLI's security-critical
  **approval policy is settable only in the web UI** (CLI exposes only `block | rate_limit` as of
  `onecli@1.3.0`). Click-ops for a gate is non-reproducible, non-reviewable config — the exact failure
  the **constitution-as-checked-in-YAML** bet (study 13, §G) exists to prevent. Reinforces: v3 policy is a
  diffable, version-gated artifact, never UI state.

### The divergence anchor (a discipline note, not a level)

The BitSafe article describes egress control as "**iptables rules + a config-file allowlist + a reload
MCP call**." First-party code shows a different and stronger mechanism: enforcement by **network
topology** — agents on a Docker `--internal` network with the gateway as the only reachable hop, non-root
and no `NET_ADMIN` so the agent can't undo it; **no host firewall on the agent**, and on macOS the
substrate is `pfctl` NAT, **not** `iptables`. The allowlist/policy and the "reload" handshake live **inside
OneCLI**, a separately-pinned component, not in the consuming harness. Verdict for the series: **verify
mechanism claims against source, not prose** — a system's description of its own security layer can diverge
from its implementation *and* its cross-platform reality.

### The §11 throughline

The series' three artifact classes now triangulate the credential seam from three angles: a control-plane
app that *had* a broker (paperclip, study 3), an academic taxonomy that *named* the pattern (survey,
study 13), and a standalone gateway that *ships* it (OneCLI, study 14). All three say the same thing —
**the actor names a capability and never holds it; the boundary performs the privileged act and owns the
audit** — which is **produce-not-perform, extended from actions and spawns to secrets.** OneCLI's one new
obligation for v3 is the part none of the three closes: **capability freshness across a durable wait.** Its
one cautionary tale — approval-by-held-socket and click-ops policy — is a clean argument *for* v3's durable
park and declarative constitution. Net: §11 leaves the §6 synthesis line intact and adds a fourth corner to
the L7 verdict, now the most heavily corroborated single seam outside the kernel itself.

---

## 12. Addendum — study 15 (mnemon): the deterministic memory store, opposite Honcho

Study 15 reverse-engineers **mnemon** ([`mnemon-study.md`](mnemon-study.md)) — a persistent
cross-session agent memory shipped as a single deterministic binary (Go + SQLite, **no LLM in the
pipeline**). It is the same artifact class as study 14 (one layer-pair as standalone infra, not an
engine), and the **second L11/L12 reference**, sitting opposite **Honcho (study 7)**. The two
triangulate memory from opposite ends: **Honcho** owns *perspective and derivation* (directed
`(observer, observed)` edges + a two-speed LLM-in-the-loop consolidation loop); **mnemon** owns
*deterministic write and protocol* (the actor supervises, the binary performs; `remember`/`link`/`recall`
as intent verbs; event-boundary hooks). Neither is the whole answer — v3 composes them: **the write is
deterministic (mnemon); the perspective/derivation is Honcho's.**

### New dimension — memory as a produce-not-perform port (the write is deterministic)

Mnemon's thesis — *"your host LLM is the supervisor; the binary is deterministic"* — is **record-not-
replay applied to memory**: the non-deterministic actor *produces* a `remember` / `link` intent; a
deterministic component *performs* the durable write, dedup, and edge-link, returning **structured JSON
with signal**, not rows (`mnemon-study.md` Slices 1–2). This is the memory analogue of `ActionIntent`
(study 1+), `SpawnIntent` (L4), `CapabilityIntent` (study 14): v3 should expose memory as
**`RememberIntent` / `LinkIntent`** produced by the actor and performed by a **kernel-owned memory
provider**. Honcho proved the *derivation* can be LLM-driven on a deferred path; mnemon proves the *write*
can — and should — be deterministic and out-of-actor. They compose on Honcho's two-speed loop: cheap
deterministic write on the hot path, perspectival consolidation deferred.

### New trigger — the compaction boundary is a first-class L12 writeback signal

Mnemon's **Nudge** hook (prompt a durable writeback *before* the context window is compacted) is the
mechanism the BitSafe Part-1 thread circled — *"structured plans survive compaction because the plan is
externalised."* It adds a second concrete trigger beside Honcho's idle+threshold: **pre-compaction =
consolidate-or-lose-it.** Hooks driving recall/writeback from *outside* the actor loop is also an
**observe-seam** instance (structure over self-report), consistent with the cross-cutting seam and the
commit log.

### The cautionary anchor — memory must be a kernel port, not an actor-adapter hook

The load-bearing consumer-side fact (line-precise from the NanoClaw `add-mnemon` skill): mnemon's hooks
**fire only under `--target claude-code`**; switch a group to `opencode`/Codex and memory **silently
stops**, because that provider never invokes the `claude` CLI the hooks attach to. A separate
`migrate-memory` skill exists precisely because *"each provider keeps its own store."* This is the
series' sharpest argument that **memory must be resolved per instance as a kernel-owned port, independent
of the actor adapter** (the L0c `AgentConfig` ⟂ `ActorAdapter` separation), and that "memory unavailable"
must be an **explicit, observable state** (study-14's fail-closed), never mnemon's silent no-op.

### Per-level matrix amendments (read against §4)

- **L11 — Agent registry & memory scopes.** *Best references* → add **mnemon (deterministic store + edge-
  kind), the simpler-scope/non-perspectival end**, beside Honcho (perspectival) and hermes (flat-Markdown).
  *Adopt* → **carry an edge-*kind* on the `(observer, observed)` directed edge** (mnemon's temporal /
  entity / **causal** / semantic split; causal = decision-provenance the `source_ids` tree only partly
  covers). *Reject* → **flat non-perspectival memory** (mnemon has no observer/observed — keep Honcho's
  5-coordinate address; mnemon is the *store* reference, not the *scope* reference) and **memory coupled to
  one actor runtime** (provider-coupled hooks → silent loss on switch).
- **L12 — Metacognition / learning.** *Best references* → add **mnemon (deterministic-write + intent
  protocol)**. *Adopt* → **the memory write is produce-not-perform** (actor intent, deterministic
  performer), **intent-native verbs** (`remember`/`link`/`recall`, signal-bearing JSON), and
  **pre-compaction as a writeback trigger** (joins Honcho's idle+threshold). *Reject* → **graph-over-vector
  as dogma** (mnemon's GNN≈attention claim is marketing-grade, the same "research theater" caution already
  applied to Honcho's surprisal tree) and **what-to-remember as actor-side prose only** (`GUIDELINE.md`
  echoes the BitSafe "`noted`" rule — useful, but it does not close the memory-to-definition gradient).
- **L0c / port abstraction & Cross-cutting observe-seam.** Reinforced: memory triggers are **kernel
  events**, not actor-config edits; the memory port is adapter-independent and fail-explicit.

### The memory-to-definition gradient (connection to the convergence work)

Mnemon is a concrete **midpoint** on the convergence work's memory-to-definition gradient: it hardens
ephemeral recall into durable, *typed* graph edges — past raw context, short of a checked-in definition.
The gradient's hard end (promoting a durable memory into a **definition** guarded by `validate_*` / the
constitution) is exactly what **neither** memory reference closes: Honcho derives, mnemon stores, but the
*what-rises-to-a-rule* judgment stays actor-side prose. That open end is v3-original work, and §12 marks
where the two best external memory systems stop.

### The §12 throughline

Memory now has **two corners, deliberately opposite**: Honcho (perspective + derivation) and mnemon
(deterministic write + protocol + boundary hooks). v3 takes **both halves** — a kernel-owned memory port
whose *write* is produce-not-perform (mnemon) and whose *model* is perspectival directed edges with
edge-kind (Honcho + mnemon's causal), triggered at idle, threshold, **and pre-compaction**, and which
fails *explicitly* when unavailable. §12 leaves the §6 synthesis line and both central bets intact; it
sharpens L11/L12 and adds the **memory-is-a-port** discipline to the same family as study-14's
**capability-is-a-port**.

---

## 13. Addendum — study 16 (nanoclaw): the runtime/supervision layer, not a kernel

Study 16 reverse-engineers **nanoclaw** ([`nanoclaw-study.md`](nanoclaw-study.md)) — a small
(~26K host `src/` incl. tests + ~6.5K container agent-runner, TypeScript) system that runs AI agents in per-session Docker
containers, analyzed via six parallel **source-verified** slices. It is a different artifact from
studies 14–15: a *full codebase*, but one whose verdict is **"not a kernel."** Its significance is
twofold. First, it is **the runtime component behind the BitSafe fleet** (`bitsafe-ai-os-capture.md`)
— effectively "BitSafe's v3" — so it grounds the BitSafe narrative in first-party code, and it
**closes the loop on §11–§12**: OneCLI (§11) and mnemon (§15/§12) were read *through* nanoclaw's
`add-*` skills, and this study reads nanoclaw itself. Second, it is the corpus's cleanest statement
of the **two-axis split**: nanoclaw sits **below** the discipline axis (no `(instance_id, op_id)`
idempotency, no CAS/`expected_version`, no canonical transcript/**T1**, no typed wait kinds — state
mutated in place across two single-writer SQLite files) yet **above** most of the corpus on the
runtime/isolation axis. Placement: `symphony ── nanoclaw ── LangGraph ── … ── DBOS ── Temporal`.
It adds **no central bet**; it sharpens L0d/L6/L7/L8/L11/L12 and supplies the corpus's cleanest
**negative proof** of why v3's kernel discipline exists. (Doc-drift note in the study's own idiom:
nanoclaw's `architecture.md` had drifted to "one DB, WAL" while source is two single-writer files —
the fourth study to catch a high-level doc lagging a schema-level truth; treat every architecture.md
as a hypothesis.)

### New details — the L0d supervision loop (sharpens §8's watchdog dimension)

§8 named gastown the watchdog reference; nanoclaw adds three details gastown did *not* give, all
worth folding into the L9/L0d recovery contract:
1. **Workload-declared silence budgets.** The executor publishes "running tool X, declared timeout T"
   into shared state (a PreToolUse hook → `container_state`), and the watchdog's tolerance becomes
   `max(floor, T)` — the agent's own `Bash(timeout: 45min)` widens its SLA. A cheap tier *below*
   gastown's judgment tier: before routing "stuck" to intelligence, let the work declare how long
   silence is legitimate.
2. **Recovery consumes its own evidence.** After a kill, the host deletes the orphan `processing`
   claim (and grants a one-tick grace), or the next sweep reads the stale claim and SIGKILLs the
   freshly respawned replacement before its startup cleanup runs. Any claim+heartbeat+reclaim design
   (which v3's is) must make this explicit; gastown's discover-don't-track model sidesteps it.
3. **Executor-side self-exit on unhealable local failure.** A corruption streak (poisoned VirtioFS
   page cache) makes the container `exit(75)` so the supervisor respawns it with a fresh mount — a
   typed "I am poisoned, respawn me" path so the watchdog's kill tier is the last resort, not the only
   one. Also: heartbeat is a **file mtime off the contended data plane**, and a **startup circuit
   breaker** lets a dumb supervisor (launchd `KeepAlive`) stay dumb.
The one place nanoclaw is *weaker* than gastown: its **retry-exhaustion** ladder never escalates to a
judgment tier or a human — that path collapses into one silent `failed` bucket (the "one failed
bucket" v3's L9 typed-recovery-reasons item avoids). (Other paths do escalate — channel-registration
approvals and billing-error notices — so the gap is specific to host-side max-retry, not absolute.)

### New mechanism — the integration-point contract as machine-checkable L12

The sharpest single idea in the study. A customization's coupling to the evolving host is quantified
as an explicit list of **reach-in points**, each guarded by a **red/green test that fails when the
wiring drifts** — "the failing list *is* the set of skills to update" — behind a **single
self-updating, fail-closed upgrade channel** (a gitignore-sealed marker + a boot tripwire whose error
text is addressed to the coding agent). This turns v3's L12 "definition changes flow through one
audited channel" from *policy* into a *machine-checkable seam contract*: drift is detected by
construction, not by review. It is also what makes a heavily-customized downstream fork (the BitSafe
pattern) viable — "a fork is a recipe of skills," rebuildable from clean upstream — the governance
precondition §-nothing-prior named.

### The confirmation — provider-shaped memory, now source-verified (closes §12's anchor)

§12 inferred mnemon's "memory-must-be-a-port" cautionary anchor from the provider-coupled hooks in
nanoclaw's `add-mnemon` skill. Study 16 confirms it **at nanoclaw's own source** and generalizes it:
nanoclaw's *native* memory is provider-shaped too — Claude gets a flat `CLAUDE.local.md` (auto-loaded),
Codex gets a `memory/` scaffold, and crossing providers needs `/migrate-memory`, a human-invoked LLM
distillation. This is v3's named L11 failure mode in production, now with a **second, source-verified
witness** beside mnemon: the argument for an adapter-independent, kernel-owned memory port with
memory-unavailable as an explicit state is now doubly grounded.

### The negative-proof catalog — why markers come before effects (L0a/L8)

Nanoclaw is the cleanest catalog of the seams v3's produce-not-perform + idempotency ledger close.
Three distinct, source-located leaks: **marker-after-effect** delivery (the `delivered` row written
*after* the platform send → duplicate on crash); **mark-complete-before-processing** (follow-up
pushes marked done *before* the agent sees them → silent loss window); and the single worst hole,
**mark-delivered-on-undefined** (an offline adapter's `deliver()` returns `undefined` not throw → the
loop logs "delivered", deletes the outbox attachments, and marks it delivered → permanent silent
loss, on the path whose own comment claims it feeds the retry path). Each is exactly what v3's
"durable marker before external effect" + `UNIQUE(instance_id, op_id)` eliminate.

### Per-level matrix amendments (read against §4)

- **L0a — kernel/idempotency/atomic-commit.** *Best references* → add **nanoclaw as the negative
  proof** (single-writer mailbox topology + apply/ack ledger, but no op-id exactly-once, no CAS, no
  transcript; delivery marker-after-effect). *Adopt* → the **single-writer-per-plane topology**
  (one authority per plane, reconciliation not shared mutation) and the discipline of treating
  **SQLite-across-a-mount as a fragile file protocol, not a database** (T1 on one side of any
  virtualization boundary, T7 physically separate). *Reject* → **marker-after-effect delivery** and
  **comment-enforced invariants** (nanoclaw's seq-parity rule is violated by its own code).
- **L0c — AgentConfig + ActorAdapter.** *Adopt* → a **typed provider contract with capability flags**
  ("a capability, never a provider name" — the direct antidote to omnigent's §4 duck-typed drift) +
  **per-provider continuation slots** (provider identity ⟂ workflow identity) + **checkpoint-at-init**
  record-not-replay. *Reject* → **authoritative output as in-band model-text parsing** (nanoclaw's
  `<message>` XML + MCP-tool split is two prompt-fragile output channels — the §4 "structured emit =
  authority" rule, violated).
- **L0d — Instance lifecycle & supervision.** *Best references* → add **nanoclaw (the supervision loop
  reference)** beside gastown (the watchdog reference). *Adopt* → **pure `decideStuckAction` over
  durable signals**, **workload-declared silence budgets**, **recovery-consumes-its-own-evidence**,
  **executor self-exit on unhealable local fault**, **startup circuit breaker**. *Reject* → **liveness
  as in-memory state** (nanoclaw's `activeContainers` map dies on restart → blunt kill-all-labeled
  reconcile) and **flat status columns with no typed wait kinds** (a container waiting on a human
  burns a live container, indistinguishable from busy).
- **L0e — Runtime-context provider.** *Best references* → add **nanoclaw (best stock-Docker OS-level
  sandbox in the corpus, with lockdown on)**. *Adopt* → **container = zero durable identity**
  (session = conversation identity, group = memory/config, container = nothing), **install-label-scoped
  orphan reaping**, **idempotent wake via an in-flight promise map**, **fail-closed spawn** (refuse
  without credentials/egress, never silent downgrade). *Note the gap* → nanoclaw has **no
  provision→ready event** (omnigent §5 does); wake is fire-and-forget, workable only because it
  *pulls* from a durable queue.
- **L6 — Triggers & scheduling.** *Adopt* → **durable `process_after` rows** + **drift-free cron
  recurrence in the user's TZ** (completion = advance). *Reject* → the **60s polling ticker scanning
  every session DB** (O(sessions)/tick — the anti-look-ahead shape) and **at-least-once firing with no
  self-discard** (nanoclaw is *half* of L6: copy the storage, not the firing).
- **L7 — Grants & credentials.** *Best references* → **nanoclaw sharpens §11 (OneCLI) with the
  source-verified consumer side**: **fail-closed spawn** (grant unavailable ⇒ no execution at all) +
  **egress lockdown via `docker network --internal` without a MITM CA**. *Adopt* both. *Reject* →
  **default-open egress** (nanoclaw ships lockdown *off* → "credentials safe, data exfiltratable") and
  **fail-open module seams** ("table absent ⇒ allow all" — enforcement that evaporates when a module
  is missing; posture, not mechanism). Confirms §11's **held-open approval socket** anti-pattern at
  the source (pending approval must be durable data, not a live socket).
- **L8 — Channels & task inbox.** *Adopt* → the **exact correlation oracle as a `UNIQUE` constraint**
  (`(channel_type, platform_id, instance)`, exact-only inbound, auto-create over hijack — the
  DB-enforced form of §4's oracle), the **inbound non-delivery ledger** (`dropped_messages` — the
  mirror of v3's outbound-only ledger), **session-existence-as-subscription**, and
  **correlation-by-stored-state** for responses (re-derive the address from a persisted row, never
  trust the echoed payload). *Reject* → the **two-format envelope** (content/identity not separated;
  sender identity buried in an opaque blob) and **per-adapter inbound dedup** (host backstop is
  idempotency-by-crash — v3 owns the key at the ledger boundary). Worst hole = the mark-delivered-on-
  undefined loss above.
- **L11 / L12 — Memory & metacognition.** *L11 Reject* → **provider-shaped memory** (now a
  source-verified second witness beside mnemon §12 — memory keyed to each provider's native surface →
  provider-switch is a lossy human-driven migration). *L12 Adopt* → the **integration-point contract**
  (reach-in points + red/green guards + self-updating fail-closed audited channel) as the
  machine-checkable form of "definitions through one audited channel"; and **skill-lifecycle operations
  must be deterministic host ops, not LLM-run prose** (nanoclaw's prose-package-manager is the AVOID).
- **L0f / templates.** *Adopt* → the **portable-definition / repo-local-deployment split, enforced**
  (template carries no provider/model/secrets — the anti-omnigent-leak, §9's concern realized).
  *Note the gap* → nanoclaw's templates are **untyped** (no declared slots, no cascade, no
  template→instance version link) — v3's typed-slot L0f is still ahead of it.

### The §13 throughline

Nanoclaw is the study that most cleanly separates v3's **two axes of value**: it is at once the
corpus's best *runtime/supervision/isolation* reference and its clearest demonstration of what a
*kernel* is *for* — every duplicate/loss seam it exhibits is one the idempotency ledger +
produce-not-perform + typed lifecycle close. It grounds the BitSafe narrative in first-party code,
confirms two prior addenda at the source (§11 OneCLI fail-closed credential plane; §12 mnemon
memory-is-a-port), and contributes one genuinely new mechanism — the **integration-point contract**
as machine-checkable L12. It leaves the §6 synthesis line and both central bets intact; it sharpens
L0d/L0e/L6/L7/L8/L11/L12 and adds the **runtime-is-not-the-kernel** discipline: the layer that runs
and supervises the actor is real, hard, and worth a best-in-class reference — and it is *below* the
commit log, never a substitute for it.

---

## Caveats

- **This is a meta-layer, not a re-summary.** Each claim here is backed by a specific study's
  LEARN/AVOID verdict (cited there with `file:line`); this note records the *cross-study decision*,
  not the evidence — follow the per-study links for the grounding.
- **Judged against v3's bar.** Many "Reject" verdicts mean "appropriate for that system's scale/scope,
  wrong for v3's distributed-kernel-for-LLM-actors goal," not "wrong."
- **The studies' glossary is simplified.** §5 maps it onto the convergence roadmap; where a study said
  "L9" it meant the broad wait/correlation concern, which the convergence work splits more finely.
- **Snapshot in time.** Fifteen reverse-engineering studies + one external survey (study 13), written
  2026-06-19 through 2026-07-04, against same-recent HEADs (studies 1–13 §1–§10; 14–16 added in §11–§13).
  The synthesis reflects those HEADs; the design conclusions are intended to outlast them.
- **Study 13 is a different artifact class.** §1–§8 distil *reverse-engineered codebases* with `file:line`
  grounding; §9 distils an *academic taxonomy* — it contributes boundaries and vocabulary, not mechanisms.
  Cite it for *where a concern lives* and *whether the field has solved it*, never for an implementation
  choice (every mechanism-level claim in §9 is imported from studies 1–12).
- **§10 is a second-pass overlay, not a rewrite.** §1–§9 are the first-pass record; §10 folds back an
  independent 10-lens second pass over **all 12** studies (§10.1–§10.3 = the first eight; §10.4 = the
  round-two pass over vibe-kanban / honcho / temporal / langgraph), keeping the original §4 matrix rows
  intact and layering the convergent sharpenings on top with cross-references. It moved no first-pass
  conclusion and overturned neither central bet — read it as the operational-grade detail on top of the
  spine, and follow the `(Sharpens §X)` pointers to see where each lands.
- **§11 is a single-layer reference, not an engine study.** Study 14 (OneCLI) reverse-engineers one
  layer (L7) shipped as standalone infra; its consumer-side evidence is line-precise (NanoClaw checkout),
  its OneCLI-internal facts are repo/README-granularity. It adds no central bet — read it as the L7/L2/L13
  sharpening plus a divergence anchor.
- **§13 is a full codebase whose verdict is "not a kernel."** Study 16 (nanoclaw) is source-verified
  across six slices (unlike §11/§12, whose consumer side was read through nanoclaw's `add-*` skills —
  §13 reads nanoclaw itself, closing that loop). It contributes no central bet: read it as the
  L0d/L0e/L6/L7/L8/L11/L12 sharpening, the source-grounding of the BitSafe narrative, and the corpus's
  cleanest negative proof of the kernel discipline. Its "two-axis split" (below discipline, above
  runtime/isolation) is the frame; its one new mechanism is the integration-point L12 contract.
- **§12 is a layer-pair reference, same class as §11.** Study 15 (mnemon) reverse-engineers L11/L12
  shipped as standalone infra; its consumer-side mechanics (install, mount, hooks-into-`settings.json`, the
  provider-coupling silent-loss) are **line-precise** from the NanoClaw `add-mnemon` skill, its
  mnemon-internal facts (four-graph edges, `remember`/`link`/`recall`, lifecycle-hook names, the
  GNN-isomorphism philosophy) are **repo/README-granularity and not line-verified** — the hook-event
  mapping is inferred. It adds no central bet — read it as the L11/L12 sharpening (deterministic write +
  intent protocol + compaction trigger + edge-kind) plus the memory-must-be-a-port anchor opposite Honcho.
