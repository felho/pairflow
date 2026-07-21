# Paperclip Study — The Counter-Example That Builds the Kernel

Date: 2026-06-19

## Purpose

This note captures what Pairflow v3 can learn from **Paperclip**
(`paperclipai/paperclip`), an open-source **control plane for AI-agent companies**
— "the app people use to manage AI agents for work." It is large (~436K LOC
TypeScript monorepo: ~137K server, ~172K UI, ~98K packages, ~24K CLI) and mature
(71K+ stars, actively developed). Its framing — *"if OpenClaw is an employee,
Paperclip is the company"* — is product-specific, but under the hood it is the
**most complete realization of the v3 control-plane levels** of the three projects
studied so far, and crucially it is the one that **actually builds the durable
kernel** that omnigent and symphony both skipped.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/paperclip` (analyzed at HEAD `6a3f5b6`,
  2026-06-19)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)
- [`../../model/core-model.html`](../../model/core-model.html) — the model itself

This is the third in a series. Read alongside:

- [`omnigent-study.md`](omnigent-study.md) — a ~90K-line meta-harness; strong on
  outer layers (L0c/L0e/L7/L4), weak at the hard kernel (L0a/L0d).
- [`symphony-study.md`](symphony-study.md) — a ~20K-line OTP orchestrator; skips
  L0a entirely and outsources durability to an external SaaS (Linear).

> Method: first-pass seven-slice analysis plus a second, independent 10-lens pass
> performed before rereading this report. The second pass looked specifically at state
> ownership, lifecycle/recovery, concurrency, runtime adapters, policy/security,
> delegation, channels/events, memory/context, operator UX, and modularity, with
> `file:line` citations relative to the Paperclip repo root. The repo is too large to
> read fully — each pass was selective (grep-to-locate, read the core files). Paths are
> `server/src/…`, `packages/db/src/schema/…`, `packages/adapters/…`, `packages/plugins/…`,
> `ui/src/…`, or `doc/…` as cited.

## Executive Summary

The single load-bearing finding:

> **Paperclip is the counter-example.** Where omnigent and symphony were strong on
> outer layers but skipped the hard kernel, Paperclip **builds the durable,
> atomic, idempotent, audited kernel on Postgres in a TypeScript stack** — and it
> ships. It is existence proof that v3's L0a/L0d/L2/L3 are buildable without exotic
> infrastructure. But it stops one step short of v3's *specific* L0a ideal: its
> durable record is a **mutable state row + an immutable audit feed**, not an
> **event-sourced replayable Transcript**; it has **no uniform `expected_version`
> column** (concurrency is pessimistic locks + bespoke compare-and-set per
> transition); and its lifecycle is **status strings**, not a typed FSM. v3's
> contribution over Paperclip is precisely to *unify* its scattered-but-correct
> mechanisms under one transcript + one version column.

What Paperclip **validates** (build it; Paperclip proves it works on Postgres/TS):

- **The hard kernel is buildable (L0a).** Cross-process-safe atomic checkout via
  `FOR UPDATE` + conditional UPDATE; DB-enforced idempotency (partial-unique index
  + catch-unique-violation-return-existing) on at least one entity; an effectively
  append-only `activity_log`; persisted process/session state for reboot recovery.
- **Real session resume (L0d/L0a durability).** Unlike symphony's always-fresh
  re-dispatch, Paperclip persists an opaque adapter-owned `sessionParamsJson` and
  re-threads it as `previousSessionParams` into the next invocation. The README
  claim holds.
- **The best adapter contract of the three (L0c).** A 2-method `ServerAdapterModule`
  (`execute` + `testEnvironment`) with optional capability methods/flags, ~13
  swappable adapters + generic `process`/`http`/socket tiers + out-of-tree plugins,
  and a **host-owned per-adapter session codec** — the single best portability
  primitive seen.
- **Audited human-decision gates (L2/L3) — the symphony fix.** Approval decisions
  are first-class rows (`decidedByUserId`/`decisionNote`/`decidedAt`) AND in-flight
  execution-stage decisions are written to `issue_execution_decisions`
  **transactionally** with the status change, carrying actor + outcome + rationale +
  run id. A comment is *mandatory* to approve.
- **Credential-never-travels, most complete of the three (L7).** UUID secret-refs in
  config, schema-annotated secret paths, encrypted-at-rest + AWS/KMS backend behind
  one provider interface, fork-with-scrubbed-env, and a host-side broker for plugin
  secret resolution.
- **A capability-gated out-of-process plugin host (L10).** `OPERATION_CAPABILITIES`
  static map + install-time validation + runtime `assertOperation` (403) +
  scoped-invoker wrapper + per-plugin DB namespace — the closest thing to v3's
  gatekeeper/federation idea in any repo studied.
- **Durable, coalesced, correlated wakeups (L6/L9).** Every inbound signal becomes a
  DB-backed wakeup row with an explicit `(agentId, issueId)` correlation key, a
  `wakeReason`, an `idempotencyKey`, and two-level dedup (synchronous map + durable
  same-task-scope coalescing).
- **A compelling org/registry/governance substrate (L0b/L11/L14).** Durable agent
  identity with role/title/reporting-line, cycle-checked org chart, config-revision
  history with redaction-safe rollback, version-pinned runtime skill injection, and
  portable multi-tenant companies with secret-scrubbing export.

What Paperclip **warns** about (where v3's design must go further, or not copy):

- **No event-sourced Transcript.** `activity_log` is immutable but a *side-channel
  notification feed*; authoritative state is mutable `issues`/`heartbeat_runs` rows.
  You cannot replay/rebuild a run from the log. This is exactly the L0a primitive
  Paperclip skipped — and the one v3 must add.
- **No uniform optimistic concurrency.** No `version`/`expected_version` column;
  every transition hand-picks its own `FOR UPDATE` + multi-column CAS guard. The
  cost is a combinatorial explosion (the `checkout()` path alone has ~4 self-healing
  fallback branches). One version column collapses all of it.
- **Lifecycle is status strings, not a typed FSM.** "Waiting" states are smeared
  across a nullable `liveness_state` column + issue `executionState`; recovery
  **re-wakes** rather than resumes the orphaned run.
- **Idempotency is inconsistent.** One entity does it right (DB partial-unique +
  catch-conflict); most rely on locks + status checks + best-effort SELECT dedup.
  No single kernel-level idempotency primitive.
- **The context-packet is intentionally thin.** Goal ancestry, instructions, and
  skills are NOT assembled into a layered packet; the agent *pulls* them on demand.
  SPEC.md defends this as a design principle — so Paperclip is the wrong template
  for v3's eager context-packet (borrow only the per-issue Continuation Summary).
- **Correlation is always exact and platform-internal.** Paperclip owns the issue,
  so the id is always already in the payload. There is **no fuzzy correlation of
  opaque external events** — v3's L9 must add what Paperclip never needed.
- **No local OS sandbox for the agent.** Low-trust safety is *policy* (forced
  isolated worktree + sandbox driver) + cloud delegation; there is no
  seatbelt/bwrap agent jail. For that, source from omnigent.
- **"Atomic" is sometimes marketing.** Budget enforcement is a *preflight* check,
  not one transaction with checkout — a real (narrow) TOCTOU window. Config
  revisioning/rollback is real only for documents/routines, not budgets/grants/trust.

Second-pass refinement: Paperclip's strongest operational pattern is the distinction
between **notification intent**, **execution run**, **domain lock**, **runtime session**,
and **operator-facing log/event stream**. The first report already names wakeups and
runs; the sharper v3 lesson is that each has a separate lifecycle and failure mode.
Do not collapse them into one "task run" object.

Second-pass refinement: Paperclip is better at operator control loops than the first
report emphasized. A run is inspectable, cancellable, retryable, tied to activity and
cost events, streamed live with polling fallback, and interpreted by liveness semantics
that distinguish "process succeeded" from "work advanced." v3 should make that a core
product contract, not a dashboard afterthought.

---

## Slice 1 — Persistence & the L0a kernel

**Verdict:** Paperclip is the **counter-example** omnigent/symphony were not — a
real, durable, Postgres-backed kernel with atomic transitions under row locks,
DB-enforced idempotency keys, and an immutable activity log, in a TS/Drizzle stack.
But "atomic" is **pessimistic row-lock + compound CAS WHERE-clauses**, *not* a clean
optimistic `expected_version` model — and the durable record is a **mutable per-issue
state row plus a human-oriented audit feed**, *not* an append-only replayable
Transcript the run is reconstructed from. **LEARN FROM** the locking/idempotency
mechanics; **improve on** the missing event-sourced transcript and the absent uniform
version column.

### System of record — durable, but state-row-centric (not transcript-sourced)

Real DB model (`packages/db/src/schema/`): **`issues`** (`issues.ts:22`) is the work
item *and* its run-binding in one mutable row — `status` (`:33`),
`assigneeAgentId` (`:36`), execution-lock columns
`checkoutRunId`/`executionRunId`/`executionLockedAt` (`:38-41`). **`heartbeat_runs`**
(`heartbeat_runs.ts:6`) is the *run/execution* aggregate (`status`, `startedAt/
finishedAt`, `processPid/processGroupId` `:34-35`, `retryOfRunId` `:41`,
`livenessState` `:51`) — persisted PIDs/session-ids let a restarted control plane
re-adopt or reap processes. **`agent_runtime_state`** (one row per agent, `sessionId`,
`stateJson`, cumulative counters). **`activity_log`** (`activity_log.ts:6`:
`actorType`/`actorId`, `action`, `entityType`/`entityId`, `runId`, `details` jsonb)
is written only via `logActivity` (`activity-log.ts:65`) with a bare insert — **no
UPDATE/DELETE in production code**, so it is **append-only/immutable in practice**
(by convention, not constraint).

**Crucial caveat for v3:** the activity log is a **human/plugin audit *feed*** (it
fires `publishLiveEvent` and forwards to a plugin event bus, `activity-log.ts:85,
100-117`), **not a *transcript* you replay to rebuild state**. Authoritative state is
the mutable `issues`/`heartbeat_runs` rows; there is no `EventEnvelope`-with-`op_id`
append-only stream the run aggregate is derived from. **This is exactly the L0a gap
v3 names: durability + audit trail, but not event-sourcing.**

### Atomic checkout — real cross-process safety (pessimistic locks + compound CAS)

Genuinely atomic and cross-process-safe (unlike symphony's in-memory mutex). Two
layers:

(a) **Compound compare-and-set UPDATE** — `issues.ts:5480` `checkout()`:
```ts
.update(issues).set({ assigneeAgentId, checkoutRunId, executionRunId: checkoutRunId,
                      status: "in_progress", startedAt: now })
.where(and(eq(issues.id, id), inArray(issues.status, expectedStatuses),
           or(isNull(issues.assigneeAgentId), sameRunAssigneeCondition),
           executionLockCondition))     // isNull(executionRunId) OR == my run
.returning()
```
An empty `returning()` ⇒ a competing process owns it ⇒ re-read and decide. CAS keyed
on `(status, assignee, executionRunId)`, **not on a version number**.

(b) **`SELECT … FOR UPDATE` pessimistic locks** for multi-row / stale-adoption
transactions: `adoptStaleCheckoutRun` (`issues.ts:3694`) opens a transaction, locks
the issue `.for("update")` (`:3705`), locks the `heartbeat_runs` rows `for update`
(`:3721`), re-asserts `eq(checkoutRunId, expected)` (`:3759`); blocker-graph edits
lock the whole sorted set `ORDER BY id FOR UPDATE` (`:3638`) to avoid deadlocks. The
contract (`doc/execution-semantics.md:113-133`) frames stale-lock recovery as **crash
recovery, not a retry loop** — "a real `409` means stop, don't retry."

> **Honesty check:** "atomic" is **coarser than an event-log/2-phase model** —
> row-level pessimistic locking + many bespoke CAS WHERE-clauses, with a sprawling
> self-healing adoption ladder (`checkout()` has ~4 fallback branches:
> fresh-claim → adopt-unowned → adopt-stale-checkout → adopt-stale-execution,
> `issues.ts:5544-5650`). Correct and process-safe, but the complexity is a warning:
> without a uniform version column, every transition re-derives its own guard.
> Note `agent-start-lock.ts` is an **in-process `Map` mutex** (single-process,
> symphony-grade) — the *real* cross-process guarantee is the DB checkout above.

### Idempotency — present, DB-enforced in one place (the strongest L0a evidence)

A real `(scope, op_id)` key exists, two flavors. **Application-level (racy):**
`agent_wakeup_requests.idempotencyKey` has no unique index; dedup is a SELECT on
`(companyId, idempotencyKey, status IN …)` (`run-liveness-continuations.ts:64`), keys
deterministic (`issue-monitor:${issueId}:${scheduledAtIso}`). **DB-enforced (gold
standard):** `issue_thread_interactions` has a **partial unique index**
`(company_id, issue_id, idempotency_key) WHERE idempotency_key IS NOT NULL` (migration
`0064`). The create path (`issue-thread-interactions.ts:765-849`) is the textbook
idempotent-mutation pattern: pre-check → return existing on replay → INSERT → **catch
unique-violation, re-read, return existing** → `409` if same key carries a different
payload. **This is exactly the `(instance_id, op_id)` idempotency v3 wants** — but
it's re-implemented per entity, not a kernel primitive.

### Optimistic concurrency — absent as a uniform mechanism

**No `version`/`lockVersion`/`expected_version` on `issues`, `heartbeat_runs`, or
`agents`.** Concurrency control is pessimistic (`FOR UPDATE`) + state-based CAS. **This
is the single clearest thing v3 should improve:** add one `version integer` per
run/instance aggregate, bump-on-write, instead of N bespoke CAS predicates.

### Definition vs run separation — partial

**Agents:** clean — definition (`agents.ts`) + `agent_config_revisions` (before/after
jsonb + `rolledBackFromRevisionId`) + `agent_runtime_state` (live) + `heartbeat_runs`
(per-invocation). A real four-way decomposition. **Issues:** NOT separated — one
mutable row mixes work-item definition with volatile run-binding (`checkoutRunId`,
`executionRunId`, `executionState`), which is *why* checkout needs so much machinery.

**v3 verdict — LEARN FROM (with two improvements).** Copy: the
catch-unique-violation idempotency pattern (make it the *uniform* kernel primitive);
lock-then-conditional-UPDATE + the "stale lock = crash recovery, never retry"
contract; the `agents` four-way definition/run decomposition. Improve: **add a
uniform `version` column + optimistic CAS** (collapses the bespoke-guard explosion);
**make the append-only log a true replayable Transcript** (EventEnvelope w/ op_id,
not just an audit feed) so idempotency + audit + state-reconstruction come from *one*
primitive instead of three.

---

## Slice 2 — Heartbeat lifecycle, scheduling & recovery

**Verdict:** A strong **LEARN-FROM** for v3's L0a durability and L6 scheduling, partial
for the L0d guard: a genuinely DB-backed durable wakeup queue with application-level
coalescing, **real session resume** across heartbeats (README claim holds), and a
polling recovery sweep with idempotent corrective wakes, pause/hold suppression, and
bounded retry. Decisively better than symphony (no real lifecycle, fresh-dispatch
recovery). **Key limit:** the run lifecycle is **NOT a typed FSM** — `status` is a bare
`text` column with WHERE-clause guards, waiting states aren't first-class, and recovery
**re-wakes** rather than resumes the dead run.

### Heartbeat loop & wakeup queue

A "heartbeat" = a DB-backed wakeup scheduling an agent to execute work on an issue.
Two durable tables: **`agent_wakeup_requests`** (enqueue/dedup ledger) +
**`heartbeat_runs`** (run rows) — wakeups survive restarts because they're rows, not
timers. Cycle: `enqueueWakeup()` (`heartbeat.ts:10364`) validates company-active /
invokable / budget / issue-exists, inserts a `queued` request + run; a polling
`resumeQueuedRuns()` (`:7702`) respects `maxConcurrentRuns` and `claimQueuedRun()`
(`:6890`) atomically flips `queued→running` with a WHERE-guard (`:7315`); then
`executeRun()` (`:7902`). **Coalescing is application-level:** a wake for an issue with
a running execution is parked `deferred_issue_execution`; a second arrival merges its
`contextSnapshot` and bumps `coalescedCount` (`:10934-10971`), keyed by a
caller-supplied `idempotencyKey`.

### Run lifecycle — not a typed FSM

`heartbeat_runs.status` is `text(...).default("queued")` (`schema/heartbeat_runs.ts:14`).
States `queued → running → {succeeded|failed|cancelled|timed_out}` + a `scheduled_retry`
side-state, enforced by ad-hoc optimistic WHERE-guards, not a transition table. **Typed
WAITING states are weak/split:** no `waiting-on-human/-blocker/-schedule` enum; instead
a nullable `liveness_state` column (`:51`) + the issue's `executionState`/`blocked`
status. "Waiting" is inferred, not modeled — a real gap vs v3 L0d.

### Session persistence & resume (the README claim holds)

Real resume (`heartbeat.ts:8081-8120`): each run records `session_id_before/after`;
prior session loaded via `getTaskSession`, deserialized through an adapter-specific
`sessionCodec`, fed forward as `previousSessionParams` into `adapter.execute()`
(`:9185/9188`). Reset is explicit/gated: `resetTaskSession = shouldReset(...) ||
modelChanged`. Explicit cross-run resume via `payload.resumeFromRunId`. **Categorically
better than symphony's always-fresh dispatch.**

### Orphan/stuck recovery (the lifecycle guard)

Detection = **polling staleness sweep**: `scanSilentActiveRuns()`
(`recovery/service.ts:1810`) finds `running` runs whose `coalesce(last_output_at,
process_started_at, started_at, created_at)` exceeds **60 min** (suspicious) / **4 h**
(critical). Recovery **does NOT resume the dead run** — three paths: (A) fold as
false-positive if the issue already reached terminal; (B) `enqueueStrandedIssueRecovery`
— a *fresh* continuation wake, bounded to **2 attempts**; (C) move to `blocked` for a
human. Plus `reconcileIssueGraphLiveness` (dependency deadlock), `sweepStaleIssueLocks`,
`successful-run-handoff`. **Pause/hold guard** (`recovery/pause-hold-guard.ts:6-14`)
skips intentionally paused issues — the exact "don't recover an intentional wait" guard
v3's L0d needs. Idempotent via deterministic continuation keys + a watchdog-decisions
dismissal ledger + `pg_advisory_xact_lock()` serializing sweeps. **vs symphony:**
strictly better, but shares the limit that the recovered unit is a *new wake*, not a
resumed run.

### Triggers & scheduling (L6)

Sources: schedule (cron), webhook (publicId + secret + signing/replay window), manual,
api (`schema/routines.ts:96`), plus ~24 fine-grained `wakeReason` values. Recurring:
`cron_expression` + `timezone` + pre-computed `next_run_at`; tick loop atomically
claims each trigger via optimistic update on `currentNextRunAt` to prevent double-fire.
**Concurrency policy** `skip_if_active`/`coalesce_if_active`/`always_enqueue`;
**catch-up policy** `skip_missed`/`enqueue_missed_with_cap` (cap 25). Caveat: a homegrown
cron parser (`cron.ts:253-319`) is a maintenance liability — v3 should use a vetted lib.

**v3 verdict.** L0a durability — **LEARN FROM** (wakeup-as-DB-row: an idempotency
ledger + a run-state table, optimistic claims, advisory-lock-serialized sweeps). L6 —
**LEARN FROM** (the `concurrency_policy × catch_up_policy` matrix, pre-computed
`next_run_at` + atomic claim-on-tick, unified `wakeReason` taxonomy). L0d — **LEARN the
guard, AVOID the modeling**: adopt the staleness sweep keyed on a `last_output_at`
heartbeat + the pause/hold suppression + bounded idempotent retries; but make
CREATED/ACTIVE/WAITING/TERMINAL and the typed waits first-class enum states with a
transition table, and **resume the persisted session on the recovery path** (Paperclip
proves resume is possible — it does it on the happy path) rather than re-waking fresh.

---

## Slice 3 — Agent adapters (BYO agent)

**Verdict:** The cleanest adapter layer of the three and the closest match to v3's L0c
— a single `ServerAdapterModule` interface (one `AdapterExecutionContext` in /
`AdapterExecutionResult` out), ~13 swappable adapters + generic `process`/`http` modes
+ a true out-of-tree plugin system. Decisively beats symphony (1 hard-coded protocol)
and is structurally richer than omnigent's per-harness modules because the run-intent
and session-resume contract are **portable data shapes the host owns**. One caveat: the
"AgentConfig" half is weaker than the ActorAdapter half — run-intent is a loosely-typed
`config: Record<string, unknown>` bag, not a typed schema.

### The adapter contract

`ServerAdapterModule` (`packages/adapter-utils/src/types.ts:352-435`) — only two
required methods (`execute`, `testEnvironment`); everything else is optional capability
(`listSkills?/syncSkills?/sessionCodec?/models?/getConfigSchema?/onHireApproved?` + bool
flags `supportsLocalAgentJwt?/supportsInstructionsBundle?/requiresMaterializedRuntimeSkills?`).
**Input `AdapterExecutionContext`** (`types.ts:122-141`) is split exactly the v3 way:
`agent` (identity) / `config` (the AgentConfig equivalent — untyped bag) / `runtime`
(prior session: `{sessionId, sessionParams, taskKey}`) / `context` (per-wake task) /
`executionTarget` (local/ssh/sandbox/managed) / `authToken?` (a scoped Paperclip JWT
minted per run) + push callbacks `onLog/onMeta/onSpawn`. **Output
`AdapterExecutionResult`** (`types.ts:69-102`) is a structured object (not a stream):
`{exitCode, usage, sessionParams (write-back!), provider, model, costUsd, summary,
clearSession, question?}` — the `question` field is a built-in human-in-the-loop
multiple-choice pause.

### Execution modes & "if it can receive a heartbeat, it's hired"

Both generic modes are themselves `ServerAdapterModule`s: **`process`** (~86 lines —
spawn any local CLI from `config.command/args/cwd/env`, stream via `onLog`) and
**`http`** (~53 lines — POST to a webhook). The richest non-subprocess model is
**`openclaw-gateway`** (1524 LOC): `execute()` opens a **WebSocket** to a gateway, does
an Ed25519 signed-device handshake, sends a wake prompt + standardized `paperclip`
context, then blocks on `agent.wait` streaming events back through `onLog`. The agent
is a **long-lived external service receiving a wake over a socket** — no subprocess, no
shared-filesystem assumption (it calls back into Paperclip's REST API). Genuinely
realized, not aspirational.

### Portability, plugins, session threading

Single dispatch site `getServerAdapter(type).execute(ctx)` (`heartbeat.ts:3014`); the
orchestrator never names a specific agent. Real third-party adapters live outside
`packages/adapters/` (e.g. `hermes-paperclip-adapter`). Out-of-tree plugin system:
a `~/.paperclip/adapter-plugins.json` store, dynamic `import()` of each package's
`createServerAdapter()`, `validateAdapterModule()` (`plugin-loader.ts:147`), a versioned
UI-parser contract, hot-reload, and **collision-fallback** (built-in saved as fallback
when an external overrides its type, pausable live, `registry.ts:609-810`). **The best
idea for v3:** the **host-owned per-adapter `AdapterSessionCodec`** — the host stores an
opaque `sessionParamsJson` blob; each adapter owns serialize/deserialize; **resume-vs-cold
collapses to "is `runtime.sessionParams` present."** A documented invariant: adapters
must never `git push` for state — the local execution-workspace cwd is the only
persistence boundary (`AUTHORING.md`, CI-enforced).

**v3 verdict — LEARN FROM (strongest of the three).** v3's ActorAdapter + AgentConfig
should adopt: (1) the **minimal 2-method interface** + optional capability
methods/flags; (2) the **host-owned opaque per-adapter session codec** (copy verbatim
into v3's L0b lifecycle binding); (3) the **split context object** (don't conflate
run-intent with session state); (4) the **generic `process` + `http`/socket tiers** so
most agents need no bespoke adapter, and the socket-gateway model so an Actor can be a
long-lived external service; (5) **out-of-tree plugins via `createServerAdapter()` +
collision-fallback**. **AVOID / be better than:** the untyped `config: Record<string,
unknown>` — make the common AgentConfig core (model, provider, instructions, tools, cwd)
a **typed schema**, reserve the bag for adapter-specific extras. Note the *incomplete
de-hard-coding* (`adapter-plugin.md:118-124`): even Paperclip still had hard-coded
adapter lists in UI/validation — "swappable" requires sustained discipline.

---

## Slice 4 — Channels, events & inbox

**Verdict:** A genuinely multi-party, push/event-driven communication system built
almost entirely on **issue threads as the universal channel** — comments + `agent://`
@-mentions are the message bus, and a DB-backed wakeup engine turns every mutation into
a coalesced, correlated agent run. The standout asset for v3 is its **correlation +
coalescing layer** (durable `(agentId, issueId)` key + `wakeReason` + idempotency +
two-level dedup) — exactly the L9 primitive v3 needs. Its weakness vs v3's L9: correlation
is always **exact and self-known** (Paperclip owns the issue), with no fuzzy/external
matching, and the realtime layer is a content-light in-process `EventEmitter` with no
durable normalizer or replay.

### Channel inventory & the universal channel

The bus is **issue comment threads** (`PRODUCT.md:102`: "tasks/comments are the built-in
communication model"). Channels: comment threads (human↔agent↔agent↔system); `agent://`
**@-mentions** (markdown links `[@Name](agent://<id>)`, `project-mentions.ts`); `#PAP-123`
**issue references** (a navigation/graph channel, not a wakeup); **board-chat/concierge**
SSE (local-trusted, spawns a `claude` CLI); **live-events WebSocket** (per-company
fan-out); **plugin event bus** (in-process typed, `plugin.<id>.<name>` namespacing) +
**plugin stream bus** (SSE); **inbox/sidebar badges** (pull surface); **routine webhook
triggers**. No email.

### Inbound → wakeup → correlation (the core L9 mechanism)

For a human comment with `@agent`: the POST handler (`routes/issues.ts:5604`) builds a
`Map<"agentId:issueId", wakeup>` — **the correlation key is literally
`${agentId}:${issueId}`** (`:5612`), pre-deduping assignment+comment+mention into one
wakeup. Mentions resolve via `findMentionedAgents` (`issues.ts:6336`), self-mentions
skipped. Then `heartbeat.wakeup()` per entry hits the **durable coalescing engine**
(`heartbeat.ts:10840-11140`): each wakeup writes an `agentWakeupRequests` + a
`heartbeatRuns` row; before insert it matches same-task-scope live runs and either
**coalesces** (`status:"coalesced"`, `coalescedCount`, merged context), **defers**
(`deferred_issue_execution` if the agent is mid-execution), **skips** (deps blocked), or
**queues** fresh. Two-level dedup — synchronous per-request map **plus** durable
same-task-scope coalescing in a DB transaction — handles *concurrent push* correctly
(symphony never had to, since it pulls).

### Inbox (L8) & realtime

Two pull/derived surfaces. **Sidebar badges** (`sidebar-badges.ts:25`) computes counts
on demand from domain tables (`inbox = approvals + failedRuns + joinRequests +
unreadTouchedIssues`) — a derived view, not a stored queue. **Inbox dismissals** store a
per-`(company, user, itemKey)` read marker with **timestamp-versioned dismissal**
(`isDismissed` hides only if `dismissedAt >= activityAt`) — so re-activity auto-resurfaces
an item. `itemKey` is typed (`approval:<id>|join:<id>|run:<id>`). The inbox is
human-only; agents' "inbox" is the wakeup queue. **Realtime** (`live-events.ts`) is a
single in-process `EventEmitter` keyed by `companyId`; the WS server forwards events
(agents can also subscribe via API-key). It is **payload-bearing but coarse** (9
lifecycle event types carrying ids → clients refetch) — closer to a "dirty bit +
pointer" than a content stream. **No EventNormalizer, no durability, single-process, no
replay** — the clearest gap vs an L8 normalizer.

### Agent↔agent

No separate primitive — routed through the same issue/comment/mention channel.
Delegation is *task creation* (a child/sub-issue assigned to another agent, with a
"request depth increment"); completion propagates up via `issue_children_completed`
wakeups; blocked dependents wake on `issue_blockers_resolved`. `issue-thread-interactions.ts`
adds *structured* agent→human asks (`suggest_tasks`, `ask_user_questions`,
`request_confirmation`, `request_checkbox_confirmation`).

**v3 verdict.** **L9 — LEARN FROM (strongest signal):** the durable DB-backed
wakeup-request model (status ∈ {queued, deferred, coalesced, skipped}, `coalescedCount`,
`idempotencyKey`, explicit `(agentId, issueId)` + `taskKey/wakeReason` key) and the
two-level dedup. **Short of v3's L9:** no fuzzy correlation of opaque external events —
v3 must add that layer. **L8 — MIXED:** LEARN the inbox (derive-counts-from-domain +
timestamp-versioned dismissal that auto-resurfaces) and the self-describing
`itemKey/wakeReason/source` discipline; **AVOID** modeling v3's event spine on the
ephemeral in-process `EventEmitter` — v3's durable EventNormalizer is genuinely *more*
than Paperclip has. **L0b — ORTHOGONAL, one lesson:** a universal threaded channel with
typed `agent://` mention links is a surprisingly capable substitute for a message bus,
but it conflates message/task/review (disambiguated only by `wakeReason`) — v3 should
keep the mention-resolution + self-mention suppression but give actor messages their own
envelope.

---

## Slice 5 — Governance: approvals, policies, trust, budgets

**Verdict:** The positive L2/L3/L13 template symphony failed to be — it has the audited,
first-class human-decision record symphony lacked: every approval carries
`decidedByUserId`/`decisionNote`/`decidedAt`, and every in-flight execution-stage gate
decision is written to a dedicated `issue_execution_decisions` table **in the same DB
transaction** as the issue status change, with actor + outcome + body + run id. Its
execution-policy model is a genuine staged review/approval workflow as a pure transition
function. **Honest caveat:** the "checkout and budget enforcement are atomic" claim is
aspirational — budget enforcement is a *preflight* check, not one transaction with
checkout, so a narrow TOCTOU window exists.

### Approval gates (L3) — the symphony fix, done right

An approval is a first-class row (`approvals.ts`), typed
`hire_agent|approve_ceo_strategy|budget_override_required|request_board_approval`, with a
lifecycle `pending → revision_requested → approved|rejected|cancelled`. `resolveApproval`
(`approvals.ts:54-65`) writes `status`/`decidedByUserId`/`decisionNote`/`decidedAt`
atomically with a guarded `WHERE status IN (resolvable)` — **idempotent** (a repeat
approve returns `{applied:false}`). The route layer *additionally* logs
`approval.approved/rejected/revision` with the deciding user. **In-flight execution
stages** (`issue-execution-policy.ts:612` `applyIssueExecutionStageTransition`): approving
a `review`/`approval` stage **requires a comment** (`:700-701`); the run pauses by the
issue going `in_review` with `currentParticipant` set, resumes only when *that exact
participant* acts ("Only the active reviewer or approver can advance", `:783`); the
decision is persisted to `issue_execution_decisions` **inside the same transaction** as
the status update (`routes/issues.ts:5108-5134`): `{stageId, stageType, actorAgentId,
actorUserId, outcome, body, createdByRunId}`. **This is the audited recommendation+override
record symphony never had. Adopt directly.**

### Execution policies (L2), authz (L1), trust (L13), budgets

**L2** — two distinct "execution policy" things: (a) per-issue **staged review workflow**
as a **pure transition function** returning `patch` + optional `decision` (the positive
template for v3 process gates); (b) instance **allow/deny sandbox guard**
(`execution-allowlist.ts:76` `evaluateExecutionAllowlist` — `kubernetes` forces untrusted
agents onto the K8s sandbox), enforced **in the per-run heartbeat guard, not middleware**
(`execution-policy-bootstrap.ts:11-15`: "the boot hook is convenience; the actual security
gate is the per-run guard"). **L1** — `authorizationService.decide({actor, action,
resource, scope})` returns a typed decision with an **enumerable reason set**
(`allow_explicit_grant`, `deny_company_boundary`, `deny_low_trust_boundary`, …) +
self-explaining `explanation` + matching `grant`; capability matrix via
`principal_permission_grants` + manager-subtree authority (`agentIsInSubtree`); **company
boundary is a hard deny**; **fails closed on `unknown`** policy. **L13** —
`trust-preset-resolver.ts` merges policy from agent/project/issue/run into a preset
(`standard` | `low_trust_review`); a low-trust preset *requires* a concrete
`LowTrustBoundary` (boundaries **intersected**, narrowing-only); trust feeds the authz
gate as a pre-check; `low-trust-runtime-containment.ts:44` enforces mandatory isolated
workspace + sandbox driver + tool-class gating. **Budgets** — `evaluateCostEvent`
(`budgets.ts:648`) on each cost event: hard threshold → `budget_incident` →
auto-creates a `budget_override_required` approval + `pauseAndCancelScopeForBudget`
(pause + cancel queued work); resume requires a human budget raise > observed spend. A
*preflight* `getInvocationBlock` re-checks budgets at ~13 invocation sites.

### Revisioning/rollback — real only for documents/routines

`document_revisions`/`routine_revisions` are append-only with rollback; **budget/grant/
trust config is overwrite-with-activity-log**, not snapshot-rollback. So the README's
"config changes are revisioned and rollback-able" is true only for documents/routines.

**v3 verdict.** **L1/L2/L3/L13/L7-grants — LEARN FROM** (the most directly liftable
patterns: the transactional, rationale-bearing `issue_execution_decisions` gate-decision
record; the self-explaining `authorization.decide()` object with enumerable reasons +
fail-closed-on-unknown; scoped `principal_permission_grants` with subtree scope;
trust-by-merge+intersect feeding the gate + runtime containment; hard-stop →
pause+cancel+approval-to-resume). **AVOID:** believing budget enforcement is atomic with
checkout (preflight TOCTOU gap — fold into the checkout transaction if v3 wants true
atomicity); citing Paperclip as a template for *governance-config* rollback (it isn't).

---

## Slice 6 — Runtime, sandbox, secrets & plugins

**Verdict:** Between omnigent and symphony, leaning toward omnigent on architecture but
lighter on local OS enforcement — a real `git worktree`-per-run model with branch
lifecycle and a pluggable multi-backend environment driver (local/ssh/sandbox/plugin),
plus the **strongest credential-never-travels posture of the three** (UUID refs in
config, decryption only at the host, scrubbed child-process env, AWS Secrets Manager +
KMS). Its true isolation strength is the **plugin system**: out-of-process forked workers
with scrubbed env, a VM-sandboxed loader with module allow-listing, and a capability-gated
host bridge (`OPERATION_CAPABILITIES`, 403 on undeclared ops) — a near-complete blueprint
for v3's gatekeeper/federation (L10). The gap vs omnigent: the **agent run has no local
seatbelt/bwrap jail** — low-trust containment is policy-enforced + cloud-delegated.

### Runtime context (L0e), sandbox, secrets (L7), plugins (L10)

**L0e** — a real **git worktree, branch-per-workspace** (`workspace-runtime.ts:1228`
`git worktree add -b`), with reuse/idempotency (`reuseExistingWorktree`), **base-drift
detection** (`:610-624`), optional provision command, and release (`worktree remove
--force` + `git branch -d` **only if `createdByRuntime`**). A **multi-backend provider
abstraction** (`workspace-realization.ts:119`) keys transport off `environment.driver` ∈
{local, ssh, sandbox, plugin}, each with its own sync strategy + a `WorkspaceRealizationRecord`
carrying `rebuild` metadata. `worktree-config.ts` isolates the *control-plane itself* per
worktree instance — DB data dir, backups, logs, storage, **secrets master key**, and
auto-allocated non-colliding ports. More careful than symphony's bare `mkdir`.

**Sandbox** — two layers. Agent-run containment is **policy-based, not OS-jailed**
(`low-trust-runtime-containment.ts:44` requires isolated workspace + `sandbox` driver +
boundary membership; **no local seatbelt/bwrap**). Real OS sandboxing is
**provider-delegated** to `packages/plugins/sandbox-providers/{modal,daytona,e2b,
kubernetes,novita,cloudflare,exe-dev}` (lease lifecycle `acquire/resume/release/destroy`).
**Plugin-code containment is genuinely strong** (closer to omnigent):
`plugin-runtime-sandbox.ts` loads worker modules in a `node:vm` context with no
`process`/host globals (tight allow-list), module-import allow-listing, root-confined
relative imports (realpath escape throws), and a body-covering timeout.

**L7 (strongest of the three)** — stored encrypted-at-rest (AES-256-GCM local provider,
`0600` master key) or provider-backed (AWS Secrets Manager + **KMS**, refuses to store
AWS root creds). Config never holds values — only **UUID refs**; `json-schema-secret-refs.ts`
walks for `format:"secret-ref"` fields so only annotated paths are secrets. Injected only
at dispatch (`secrets.ts:resolveEnvBindings:2322`), with a per-key redaction manifest and
`collectMissingRuntimeBindings` pre-validating bindings **without resolving values** (run
blocked at config-time if a binding is missing). **Credential-never-travels, two
mechanisms:** plugin workers are forked with a **scrubbed env**
(`plugin-worker-manager.ts:718` — only PATH/NODE_*/plugin-id pass), and plugin secret
resolution is **brokered host-side** (`plugin-secrets-handler.ts` — never logged/persisted,
capability-gated `secrets.read-ref`, rate-limited, fail-closed). (Nuance: for *agent* env
bindings, secrets resolve to plaintext env values — they *do* travel into the adapter
process; v3 could push the agent path toward the same broker model the plugin path uses.)

**L10** — `plugin-capability-validator.ts` is the gatekeeper: a static
`OPERATION_CAPABILITIES` map (`:44`) binds each host op to required capabilities
(`issues.create→["issues.create"]`, `secrets.resolve→["secrets.read-ref"]`,
`db.query→["database.namespace.read"]`); `validateManifestCapabilities()` at install-time;
`assertOperation()` at runtime **throws 403 on undeclared ops**; `createCapabilityScopedInvoker`
wraps every host call so the check is unavoidable; each plugin gets a partitioned **DB
namespace**. This is the closest thing to v3's "capability request → validate → grant
before touching host/private data" in any repo studied.

**L0f** — per-environment config is a **Zod discriminated union** keyed by driver, each
referencing secrets via `secretRefSchema` (typed slots holding refs, not values);
per-project workspace policy is a parsed/validated typed model with issue-level overrides,
gated behind a feature flag.

**v3 verdict.** **L0e/L0f/L7/L10 — LEARN FROM** (copy nearly wholesale): the
worktree+realization-record lifecycle + per-instance control-plane isolation; the Zod-union
+ `format:"secret-ref"` typed-slot model; the entire secrets/credential-never-travels
architecture (UUID refs, host-only decryption, scrubbed-env fork, host-side broker,
config-time binding validation); and the capability-gated out-of-process plugin host
(operation→capability static map + unavoidable scoped invoker + per-plugin DB namespace).
**ORTHOGONAL / don't over-copy:** OS-level *agent* containment — Paperclip delegates to
cloud providers and has no local jail; for omnigent-grade local isolation, source from
omnigent (but do copy the `vm`-based plugin sandbox for any in-process untrusted code).

---

## Slice 7 — Org model, context assembly & skills

**Verdict:** Paperclip's distinctive contribution is a genuinely first-class **org model**
— durable agent identity with role/title/reporting-line, a cycle-checked org chart,
budgets, config-revision history, and portable multi-tenant companies — a strong
LEARN-FROM for v3's L0b actor-identity, L11 registry, and L14 org-governance. But its
**context "packet" is deliberately thin**: goal ancestry, instructions, and skills are
NOT assembled into a layered packet pushed to the agent; the server hands the adapter flat
task context + a runtime-skill array, and the agent *pulls* goal/org/instructions on
demand (a design SPEC.md explicitly defends). So the org/goal *data model* is compelling,
but Paperclip is the wrong template if v3 wants a server-assembled layered context-packet.

### Agent identity & org chart (L0b/L11)

Durable per-company rows (`agents.ts:40-52`: `name, role, title, reportsTo, capabilities,
adapterType, adapterConfig, budgetMonthlyCents, …`). `agentService` (`:222`) is the
**registry**: list/getById, stable `urlKey`, slug-or-UUID resolution, collision dedup. Org
chart: `reportsTo` self-FK, cycle-checked (`assertNoCycle`), same-company managers, tree
built recursively (`orgForCompany`), upward chain via `getChainOfCommand` (depth cap 50).
**Config revisions** snapshot before/after with `changedKeys` + redaction-safe rollback
(`rollbackConfigRevision` refuses to restore redacted secrets). **Role→actor binding is
exactly v3's:** stable identity (role/title) bound to a swappable adapter via
`adapterType`+`adapterConfig`, the same agent able to change adapters via a recorded config
revision; "hiring" fires `onHireApproved`.

### Context assembly (L0b) — the important finding

**Paperclip does not push a layered context packet.** The server-built `contextSnapshot`
is flat task-execution data (`issueId, projectId, taskKey, wakeReason`, workspace, redacted
secrets, `paperclipTaskMarkdown`, `paperclipContinuationSummary`, model profile); skills go
in `runtimeConfig.paperclipRuntimeSkills`, **not** the context; there is **no goal text and
no chain-of-command** in the run path. The "context flows up" claim is **true but
pull-based**: `resolveIssueProjectAndGoal` (`routes/issues.ts:2333`) walks `issue.goalId →
project.goalId → defaultCompanyGoal` and attaches `goal` to the **issue-detail API
response** — the agent sees it by *querying* its issue, not via an assembled packet.
Instructions are **adapter-loaded from disk** (AGENTS.md bundle, the adapter reads it). The
one genuine server-built carry is the **Continuation Summary** (`issue-continuation-summary.ts`):
after each run, a structured markdown doc per issue (Objective / Acceptance / Recent Actions
/ Files / Blockers / **Next Action**, ≤8k chars) fed back as `paperclipContinuationSummary`
— the closest thing to a context-packet, worth lifting.

### Skills (L5), registry/memory (L11), org-scale (L14), metacognition (L12)

**L5 — LEARN FROM:** SKILL.md bundles (Anthropic Agent-Skills format), GitHub-pinned by
commit + per-file sha256 (hash-verified), company-scoped install with conflict strategies,
**runtime injection without retraining** + per-task @mention skill injection
(`company-skills.ts:4112`, `heartbeat.ts:8462`). **L11 — registry strong, memory absent by
design:** a knowledge base is an explicit *anti-goal for core* (SPEC.md:500-504, future
plugin); only Continuation Summaries + comments + AGENTS.md/skill bundles exist — no
per-agent semantic memory, no vector DB. **L14 — LEARN FROM:** company = tenant boundary +
portable unit; **portability** (`company-portability.ts`) with template-vs-full modes,
**secret-scrubbing** (secret_refs export as named *requirements* with empty values, broad
`isSensitiveEnvKey` heuristic), collision strategies, and a generated `README.md` with a
**Mermaid org chart**. Caution: company-scoping is enforced **per-query** (`eq(table.companyId,
…)` everywhere), not a central RLS gate — robust but discipline-dependent; v3 should
centralize tenant scoping. **L12 — ORTHOGONAL:** `productivity-review.ts` is a heuristic
stuck-work detector (no_comment_streak / long_active_duration / high_churn) that files a
review issue and wakes a manager — sound governance, but **no learning**.

**v3 verdict.** **L0b binding / L5 / L11 registry / L14 — LEARN FROM** the org/goal/skill
*substrate* (durable identity + adapter binding + config-revision rollback; hash-pinned
runtime skill injection; company-as-tenant + portable unit with secret-scrubbing export).
**L0b context-packet — AVOID as template** (intentional thinness; borrow only the per-issue
Continuation Summary). **L11 memory scopes — ORTHOGONAL** (punted to plugins). **L12 —
ORTHOGONAL** (heuristic monitoring, not metacognition).

---

## Second-pass deltas — what the independent 10-lens pass adds

These are the additions or sharper readings from the independent pass, after filtering
out findings already covered by the seven slices above.

### 1. Separate wakeup intent, execution run, issue lock, runtime session, and log stream

The existing report correctly says Paperclip has DB-backed wakeups and runs. The
additional lesson is that these are intentionally **different objects**:
`agent_wakeup_requests` records source/reason/payload/status/idempotency/run linkage
(`packages/db/src/schema/agent_wakeup_requests.ts:5`, `:15`, `:19`, `:20`),
`heartbeat_runs` records execution status, session before/after, log refs, retry
lineage, output progress, liveness, and `contextSnapshot`
(`packages/db/src/schema/heartbeat_runs.ts:6`, `:21`, `:25`, `:37`, `:45`, `:51`,
`:56`), while `issues.checkoutRunId`/`executionRunId` own domain execution rights
(`packages/db/src/schema/issues.ts:38`, `:46`).

v3 should preserve this split. A notification can be coalesced or deferred without
being an execution; a queued run need not yet own an issue; a running run may have an
adapter session; a log stream is evidence, not state.

### 2. Delayed execution lock is a stronger pattern than eager queue ownership

Paperclip does not set the issue's execution lock merely because a wakeup was queued.
The run is first claimed with an atomic `queued -> running` update
(`server/src/services/heartbeat.ts:6968`, `:6976`), and only then does the issue get
bound to the live execution (`server/src/services/heartbeat.ts:7000`, `:11033`). This
prevents a queued-but-never-started run from holding work hostage.

Finalization and cleanup also compare against the run that still owns the row:
terminal cleanup locks all affected issues in deterministic order
(`server/src/services/heartbeat.ts:9812`, `:9822`) and clears only locks pointing at
that run (`:9864`). Reassignment/status changes explicitly release checkout/execution
locks (`server/src/services/issues.ts:5214`, `:5220`). v3 should model "queued
interest" separately from "active execution ownership."

### 3. Recovery taxonomy is richer than "rerun failed work"

Paperclip distinguishes process loss, zombie running state, silent-but-live work,
successful process with no issue disposition, stale execution locks, transient upstream
failure, max-turn continuation, and intentional pause/hold. Examples: zombie detection
checks DB `running` state against in-memory execution (`server/src/services/heartbeat.ts:2193`,
`:2207`, `:2220`); process-loss retry has bounded local-child handling (`:7591`,
`:7600`, `:7633`, `:7665`); "successful run, but issue still in progress" creates a
corrective handoff (`server/src/services/recovery/successful-run-handoff.ts:359`,
`:375`, `:399`); stale lock sweeping handles terminal or missing run references
(`server/src/services/recovery/service.ts:3824`, `:3865`, `:3877`).

v3 should encode recovery reason as data. One `failed` status is too weak to drive the
right retry, handoff, pause, or human-review behavior.

### 4. Durable fan-out/fan-in is child-issue orchestration, not subagent threads

The first report covers issue threads as the universal channel. The extra finding is
that Paperclip's "subagent" shape is durable child-issue delegation: child creation
inherits project/goal/workspace context, increments request depth, and writes acceptance
criteria (`server/src/services/issues.ts:4523`, `:4549`, `:4554`, `:4557`). Accepted-plan
decomposition uses a durable claim/fingerprint row before fan-out and records progress
as children are created (`server/src/services/issues.ts:4601`, `:4628`, `:4672`,
`:4732`; `packages/db/src/schema/issue_plan_decompositions.ts:10`, `:21`, `:24`, `:42`).

Fan-in is state-triggered: a parent is only woken when every child is `done` or
`cancelled`, with summaries and truncation flags in the wake payload
(`server/src/services/issues.ts:4451`, `:4480`, `:4514`;
`server/src/routes/issues.ts:5763`, `:5771`). v3 should not treat delegated work as
lost background process state; it should be resumable task graph state.

### 5. Durable run stream plus ephemeral live push is the right observability split

Paperclip has two event surfaces. `heartbeat_run_events` is durable and sequenced by
run (`packages/db/src/schema/heartbeat_run_events.ts:6`), and append publishes the same
event live (`server/src/services/heartbeat.ts:5304`, `:5317`, `:11624`). `LiveEvent`
is a lightweight company-scoped invalidation/push envelope (`packages/shared/src/types/live.ts:3`),
with process-local IDs (`server/src/services/live-events.ts:10`, `:17`).

The UI respects this split: global live updates ignore high-frequency run event/log
payloads (`ui/src/context/LiveUpdatesProvider.tsx:820`, `:839`), while run detail uses
run-specific events/logs and deduplicates by `seq` (`ui/src/pages/AgentDetail.tsx:3880`,
`:3890`, `:3921`). v3 should not use a process-local live ID as a replay cursor; use
durable per-stream sequence for replay and live push only as acceleration.

### 6. Operator UX is part of the control-plane contract

Paperclip treats a run as an inspectable and controllable object. Run detail loads
events, streams via WebSocket, and falls back to log polling (`ui/src/pages/AgentDetail.tsx:3645`,
`:3818`, `:3840`); long logs are offset-readable NDJSON (`server/src/services/run-log-store.ts:30`,
`:109`, `:138`); the UI offers "Jump to live" and "Load more log" controls
(`ui/src/pages/AgentDetail.tsx:4040`, `:4068`). Human controls are immediate and
audited: cancel writes activity (`server/src/routes/agents.ts:3580`), pause cancels
active work (`:2963`, `:2975`), and approval resolution wakes the requesting agent with
approval context (`server/src/routes/approvals.ts:168`, `:182`).

Two avoid points follow. First, do not confuse "recent" with "live"; Paperclip's route
comment explicitly warns that `minCount` padding can make historical runs look live
(`server/src/routes/agents.ts:3482`). Second, do not make cost reporting passive:
cost events attach to agent/issue/project/goal/run (`packages/db/src/schema/cost_events.ts:12`),
hard thresholds pause/cancel work (`server/src/services/budgets.ts:252`, `:692`), and
incident resolution either raises budget and resumes or leaves the scope paused
(`:880`, `:922`).

### 7. Prompt, skill, memory, and document state are different persistence classes

Paperclip's memory landscape explicitly argues for a small portable core and provider
adapters rather than one monolithic memory engine (`doc/memory-landscape.md:9`, `:14`,
`:16`, `:117`, `:135`, `:139`, `:141`). Instructions are moving from legacy prompt
strings to managed/external AGENTS.md bundles (`server/src/services/agent-instructions.ts:6`,
`:12`, `:28`), and new agents reject the deprecated prompt fields
(`server/src/routes/agents.ts:1326`, `:1333`). Skills carry provenance, source refs,
trust level, file inventory, versions, and metadata (`packages/db/src/schema/company_skills.ts:21`,
`:25`, `:26`, `:29`, `:31`, `:46`, `:64`, `:72`), with external executable imports and
unpinned refs rejected (`server/src/services/company-skills.ts:189`, `:191`, `:201`).

The most transferable snapshot model is document anchoring: annotations store quote,
prefix, suffix, and position (`packages/shared/src/document-anchors.ts:116`, `:123`,
`:128`), then remap exact/duplicate/fuzzy/missing across revisions and audit anchor
snapshots (`:195`, `:212`; `server/src/services/document-annotations.ts:447`, `:480`).
v3 should use this for prompt/context/knowledge citations instead of byte offsets.

### 8. Plugin/provider seams are strong, but their drift risks are visible

The report already praises `OPERATION_CAPABILITIES`. The extra modularity finding is
about contract shape and drift. Plugin manifests declare extension points, including
tools and environment drivers (`packages/shared/src/types/plugin.ts:102`, `:121`), and
validators enforce cross-field rules (`packages/shared/src/validators/plugin.ts:574`).
Provider lifecycle is a real RPC seam: validate/probe/acquire/resume/release/destroy/
execute (`packages/plugins/sdk/src/define-plugin.ts:246`, `:259`, `:264`, `:279`,
`:284`; `packages/plugins/sdk/src/protocol.ts:580`, `:613`, `:629`, `:633`).

The avoid case is central and duplicated knowledge. `server/src/adapters/registry.ts`
imports many built-ins directly (`:13`) and defines a large built-in module set
(`:268`); capability knowledge is also hardcoded in shared constants, environment
support, UI fallback maps, and forms (`packages/shared/src/constants.ts:30`;
`packages/shared/src/environment-support.ts:33`; `ui/src/adapters/use-adapter-capabilities.ts:18`;
`ui/src/components/AgentConfigForm.tsx:617`). The Kubernetes plugin documents a
cross-package duplicated registry shape that must stay synced by hand
(`packages/plugins/sandbox-providers/kubernetes/src/adapter-registry.ts:7`, `:10`,
`:11`). v3 should require generated/shared schemas or golden compatibility tests.

### 9. Fail-closed auth and secret binding are even stronger than the summary states

Paperclip request auth builds explicit actor variants, not a bool:
`local_implicit`, board user/session, `board_key`, `agent_key`, `agent_jwt`, and
`cloud_tenant`, with company/membership/key/run metadata (`server/src/middleware/auth.ts:22`,
`:110`, `:132`, `:162`, `:190`). Authorization decisions include reason,
explanation, and optional matching grant (`server/src/services/authorization.ts:69`,
`:454`, `:498`), while company boundaries and low-trust boundaries are first-order
denials (`server/src/routes/authz.ts:53`, `:63`, `:77`;
`server/src/services/authorization.ts:725`, `:756`).

Secrets are not just encrypted refs. Runtime resolution requires consumer type/id and
config-path binding, optionally narrowed by low-trust allowed binding ids
(`server/src/services/secrets.ts:376`, `:398`, `:410`), and every access is audited in
`secret_access_events` (`packages/db/src/schema/secret_access_events.ts:8`). Strict mode
rejects plain sensitive env persistence, and low-trust dispatch blocks inline sensitive
env values (`server/src/services/secrets.ts:726`, `:747`;
`server/src/services/heartbeat.ts:434`, `:471`).

### 10. Some "good enough" local mechanisms must not become v3 invariants

Several Paperclip mechanisms are useful locally but should stay below the correctness
line in v3. `withAgentStartLock` is an in-memory Map with timeout, not a distributed
claim (`server/src/services/agent-start-lock.ts:3`, `:32`). File `mkdir` lockdirs are
good for local skill materialization and workspace restore artifacts
(`packages/adapter-utils/src/server-utils.ts:1933`, `:1970`, `:2019`;
`packages/adapter-utils/src/workspace-restore-merge.ts:137`), but not for durable work
ownership. `agent_wakeup_requests.idempotencyKey` exists without the uniform unique
constraint that v3 should demand (`packages/db/src/schema/agent_wakeup_requests.ts:19`,
`:28`).

Use these as local coordination aids, not as the authoritative v3 kernel contract.

## Consolidated direction table

| v3 level | Paperclip's stance | Verdict | The one thing to take/avoid |
|---|---|---|---|
| **L0a** kernel | Durable Postgres; atomic checkout (locks+CAS); DB-idempotency on one entity; immutable audit feed — but **no event-sourced transcript, no version column** | **LEARN FROM** | Take the catch-unique-violation idempotency pattern + lock-then-CAS discipline. Add what's missing: a replayable Transcript + a uniform `expected_version`. |
| **L0a adjacent records** | Wakeup intent, execution run, issue lock, runtime session, run events, run log, and activity log are distinct records with distinct failure modes. | **LEARN FROM** | Preserve the split; do not collapse notification, ownership, execution, session, and observability into one object. |
| **L0b** actor + binding | Durable identity; role→adapter binding via `adapterType`+`adapterConfig`; config-revision rollback | **LEARN FROM** | Stable role bound to swappable adapter, with audited config revisions. |
| **L0b** context-packet | Flat snapshot; goal/instructions **pulled** on demand; thin by design | **AVOID as template** | Borrow only the per-issue Continuation Summary; design the layered packet natively. |
| **L0c** AgentConfig + adapter | 2-method `ServerAdapterModule`; ~13 adapters + process/http/socket; host-owned session codec; out-of-tree plugins | **LEARN FROM (best of 3)** | The host-owned opaque session codec + split context object + minimal interface. Make AgentConfig typed (Paperclip's is an untyped bag). |
| **L0d** lifecycle | DB-durable runs + real resume + staleness/pause-hold recovery — but **status strings, not a typed FSM**; recovery re-wakes not resumes | **LEARN the guard, AVOID the modeling** | Take the staleness sweep + pause-hold guard + bounded idempotent retry. Build the typed FSM + resume-on-recovery. |
| **L0d recovery taxonomy** | Zombie, process loss, silence, success-without-disposition, stale locks, transient upstream, and intentional pause are separate recovery classes. | **LEARN FROM** | Encode recovery reason as data; one `failed` bucket is too weak. |
| **L0e** runtime | git-worktree-per-run + multi-backend realization record + per-instance control-plane isolation | **LEARN FROM** | Worktree lifecycle + realization-record/transport abstraction + base-drift detection. |
| **L0f** config + slots | Zod discriminated-union per driver + `format:"secret-ref"` typed slots | **LEARN FROM** | Typed-slots-hold-refs-not-values. |
| **L1** capability matrix | `authorization.decide()` with enumerable reasons + scoped grants + fail-closed | **LEARN FROM** | Self-explaining decision object; fail-closed on unknown policy. |
| **L2** gates/policies | Per-issue staged review as a **pure transition function**; instance allow/deny in the run guard | **LEARN FROM** | Pure-function gate transitions; security gate at the run, not middleware. |
| **L3** human decision | First-class audited approval rows + **transactional `issue_execution_decisions`** w/ rationale; mandatory comment | **LEARN FROM (the symphony fix)** | Transactional, rationale-bearing gate-decision record. |
| **L6** triggers/scheduling | cron/webhook/assignment/mention; concurrency × catch-up policy matrix; atomic claim-on-tick | **LEARN FROM** | The policy matrix + pre-computed `next_run_at` + atomic claim. (Use a vetted cron lib.) |
| **L6/L4 delegation** | Child work is durable child issues with claim/cursor fan-out and state-triggered fan-in, not process-local subagent work. | **LEARN FROM** | Model delegated work as resumable task graph state. |
| **L7** credentials | UUID refs; host-only decryption; scrubbed-env fork; host-side broker; AWS/KMS | **LEARN FROM (best of 3)** | The whole credential-never-travels posture; push the agent path toward the broker too. |
| **L8** channels + inbox | Threads-as-bus; derived inbox + timestamp-versioned dismissal — but ephemeral in-process events, **no normalizer** | **MIXED** | Take the inbox pattern; don't model v3's event spine on the in-memory emitter. |
| **L8 observability streams** | Durable `heartbeat_run_events` and NDJSON logs feed live WS/polling UI; process-local live events are only invalidation. | **LEARN FROM** | Durable replay cursor first, live push second. |
| **L9** wait + correlation | Durable wakeup rows + `(agentId, issueId)` key + two-level coalescing — but **exact/internal only, no fuzzy** | **LEARN FROM** | The durable coalescing/correlation engine; add fuzzy external correlation v3 needs. |
| **L10** gatekeeper/federation | `OPERATION_CAPABILITIES` + install+runtime validation + scoped invoker + per-plugin DB namespace | **LEARN FROM (best of 3)** | The capability map + unavoidable scoped invoker. |
| **L10 provider contracts** | Manifest + validator + SDK + out-of-process JSON-RPC are strong; hardcoded adapter maps and duplicated schemas create drift risk. | **LEARN/AVOID** | Use shared/generated contracts and golden compatibility tests; avoid scattered adapter-type branching. |
| **L11** registry / memory | Strong durable registry; **memory is an explicit anti-goal** | **LEARN registry, ORTHOGONAL memory** | The per-company registry + config biography; memory punted to plugins. |
| **L11 snapshots** | Skills, instruction bundles, document revisions, and anchors are distinct persistence classes with provenance. | **LEARN FROM** | Use quote/prefix/suffix anchor snapshots for context citations; do not store only byte offsets. |
| **L12** metacognition | Heuristic stuck-work detection → review issue; no learning | **ORTHOGONAL** | The escalate-as-an-issue pattern only. |
| **L13** trust | Trust-by-merge+intersect → preset+boundary → authz pre-check → runtime containment | **LEARN FROM** | Trust as a gate input + mandatory sandbox/isolation on low trust. |
| **Operator UX** | Runs are inspectable/cancellable/retryable, with log pagination, WS+poll fallback, activity links, budget enforcement, and health/admin guardrails. | **LEARN FROM** | Treat control loops and observability as product contracts, not dashboard decoration. |
| **L14** org-scale | Company = tenant + portable unit; secret-scrubbing export + org-chart README | **LEARN FROM** | Portable-org export with secret-as-requirement; centralize tenant scoping (Paperclip is per-query). |

## Three reconsiderations Paperclip forces

1. **The hard kernel is buildable on boring infrastructure — so v3's L0a is a choice,
   not a necessity, and must justify its added rigor.** Paperclip ships a correct,
   cross-process-safe, idempotent control plane on Postgres + Drizzle + pessimistic locks,
   with *no* event-sourcing and *no* version column. v3's bet — a replayable Transcript +
   uniform `expected_version` — is a real improvement (it collapses Paperclip's
   bespoke-guard explosion and unifies idempotency/audit/state-reconstruction into one
   primitive), but Paperclip proves you can be correct without it. v3 should be able to
   articulate *what specifically* the transcript+version buys over Paperclip's
   locks+audit-feed, because "correctness" alone is not the differentiator — Paperclip is
   already correct.

2. **The adapter session codec is the portability primitive v3 was missing.** Across all
   three studies, the cleanest single idea is Paperclip's host-owned, opaque, per-adapter
   `AdapterSessionCodec`: the host persists a blob it never interprets; the adapter owns
   serialize/deserialize; resume-vs-cold collapses to "is the prior session present." This
   is strictly better than symphony (no resume) and cleaner than omnigent (per-harness
   conventions). v3's L0c/L0d should adopt it close to verbatim.

3. **"Atomic" and "revisioned" are load-bearing words that don't always survive contact
   with the code.** Paperclip's README claims atomic budget-enforcement and revisioned
   config-with-rollback; the code shows budget enforcement is a preflight check with a
   TOCTOU gap, and revisioning covers only documents/routines (budgets/grants/trust are
   overwrite-with-log). This is not a knock on Paperclip — it's a reminder that v3's own
   invariants (atomic commit, idempotency, audited decisions) must be *verified at the
   transaction boundary*, not asserted in docs. Paperclip's genuinely-atomic move — the
   `issue_execution_decisions` insert in the same transaction as the status update — is the
   pattern to copy *because* it is actually transactional.

## Caveats

- Paperclip is large (~436K LOC); each sub-agent read selectively (grep-to-locate + core
  files), so "absent" findings are high-confidence for the paths searched but not a proof
  of universal absence. Where a claim is load-bearing (no version column, no event-sourced
  transcript, no fuzzy correlation), it was checked by targeted grep across `packages/db`
  and `server/src`.
- Citations are relative to the Paperclip repo root at HEAD `6a3f5b6` (2026-06-19). Some
  `doc/SPEC-implementation.md` line references are to the spec's section/pseudocode
  structure.
- Paperclip's product framing (companies, hiring, org charts, budgets) is domain-specific
  and partly orthogonal to v3; this study extracts the *control-plane mechanics* under that
  framing, not the company metaphor itself.
- This is a *learning* study, not a recommendation to adopt Paperclip or its stack.
