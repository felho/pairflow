# Symphony Study — What v3 Can Learn From a Shipped, OTP-Native Issue Orchestrator

Date: 2026-06-19

## Purpose

This note captures what Pairflow v3 can learn from **Symphony** (`openai/symphony`),
an open-source **Elixir/OTP orchestrator** that turns issue-tracker work into
"isolated, autonomous implementation runs" — the tagline is *"manage work instead
of supervising coding agents."* It is small (~20.5K LOC Elixir, 59 files) but it
**ships**, and it makes a set of architectural choices that are almost the exact
photo-negative of v3's kernel bet — which is what makes it valuable.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/symphony` (analyzed at `origin/main` HEAD
  `4cbe3a9`, 2026-06-09)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)
- [`../../model/core-model.html`](../../model/core-model.html) — the model itself

This is a companion to [`omnigent-study.md`](omnigent-study.md). Where that study
examined a ~90K-line meta-harness strong on outer layers, Symphony is the
opposite kind of evidence: a **tiny, OTP-native** system that reveals (a) how much
of v3's L0b/L0d a BEAM substrate hands you for free, and (b) what a competent
orchestrator looks like when it **deliberately skips v3's L0a kernel** and borrows
durability from an external SaaS instead.

> Method: first pass used six parallel sub-agent analyses, each mapping one slice of
> Symphony onto specific v3 levels, with `file:line` citations relative to the
> Symphony repo root (`elixir/lib/symphony_elixir/…` unless noted; `SPEC.md` at repo
> root). A second independent pass used ten lenses: state/source-of-truth,
> lifecycle/recovery, concurrency/ownership, runtime adapter, policy/security,
> delegation/scheduling, channels/events, memory/context, operator UX, and
> modularity. The deltas below only add findings that were missing or too coarsely
> stated in the first pass.

## Executive Summary

The single load-bearing finding:

> **Symphony is what an orchestrator looks like when you skip L0a.** It has no
> append-only transcript, no `(instance_id, op_id)` idempotency, no
> atomic-commit-under-`expected_version`, and no typed lifecycle FSM. It survives
> crashes **only** by treating an external issue tracker (Linear) as its system of
> record and rebuilding all in-memory state by polling. OTP gives it L0b (actor
> model) and the *isolation half* of L0d essentially for free — but **OTP does not
> give durability**, and Symphony's "durability" is just *someone else's database*.

This sharpens v3's central bet from two directions at once:

1. **v3 may be reinventing substrate.** On BEAM, v3's L0b (actor model, role→actor
   binding, message-passing mailboxes) is near-native, and its in-VM
   optimistic-concurrency / `expected_version` CAS is **unnecessary within a single
   node** because a GenServer serializes every mutation. Symphony ships a working
   orchestrator with **zero** hand-rolled concurrency-control code. That is real
   evidence worth respecting.
2. **But L0a is genuinely not in the gift.** OTP restart hands you a blank
   `init/1`; process state does not survive. Symphony proves L0a is separable by
   *omitting it* — and pays for the omission by making Linear its event store, with
   all the coarseness that implies (you can recover "issue is in-progress"; you
   cannot recover "which step, with what idempotency, at what version").

What Symphony **validates / offers to steal** (mostly outer-layer and methodology):

- **Spec-as-code, the serious version** — a 2185-line RFC-2119 normative `SPEC.md`
  that is the authority, the Elixir being *one* conformant implementation, shipping
  its own tiered **conformance test matrix** (§17) + **Definition-of-Done checklist**
  (§18) *inside* the spec. This is the most transferable thing in the project.
- **The normalization seam** — raw provider JSON → a stable `%Issue{}` struct →
  behaviour-fronted `Tracker` adapter. A clean, swappable EventNormalizer boundary
  (v3 L8) where the provider payload never leaks past the adapter.
- **Split read/write credential boundary** — Symphony holds the *read* token
  centrally and polls; the *agent* writes back using its **own host-environment
  auth**. The credential never travels to the worker (v3 L7) — achieved by
  construction, not by a proxy.
- **Snapshot → shared Presenter → many renderers** — orchestrator is the single
  source of truth; one projection module feeds *both* LiveView and JSON API, so
  HTML and JSON cannot drift. Plus the **content-free PubSub "dirty bit" + pull
  authoritative snapshot** pattern for surfacing live instances (v3 L0d/L8).
- **Clean RuntimeContext lifecycle + path-safety** — `provision → ready-hook →
  release` with symlink-escape rejection, and an optional SSH remote-worker backend
  behind the same interface (v3 L0e).
- **Reconcile-before-dispatch + fresh revalidation** — every dispatch cycle first
  reconciles running/blocked entries against tracker reality, then re-fetches the
  candidate issue immediately before spawning work (`orchestrator.ex:248,302,909,995`).
  This is a practical anti-TOCTOU pattern v3 should keep even with a durable kernel.
- **Explicitly separate retry, continuation, and human-input blockers** — normal
  worker exit schedules a short continuation re-check, abnormal exit schedules
  exponential backoff, while approval/input/MCP elicitation moves the issue to
  `blocked` instead of retrying (`orchestrator.ex:200,234,652,740,1023,1192`).
  The policy is volatile, but the taxonomy is useful.

What Symphony **warns** about (v3's choices are the fix, or the trap to avoid):

- **Durability outsourced to a SaaS.** No transcript, no idempotency, no resume.
  A crash mid-run re-dispatches a *fresh* agent session against the live repo; the
  prior session is not correlated or resumed. This is exactly v3's L0a reason to
  exist.
- **No L4 whatsoever.** Only flat orchestrator→worker process spawn, correlated by
  `issue_id`. No child *workflow* instances, no parent/child correlation, no
  join/await. Symphony offers v3's most-wanted feature *nothing*.
- **Blocked/retry/session state is not merely weakly modeled; it is volatile.**
  The first pass correctly called out missing L0a, but the sharper finding is that
  `blocked`, `retry_attempts`, live `session_id`, timer refs, and remote worker
  ownership are all process-memory facts. A restart can preserve the workspace and
  re-poll Linear, but cannot restore "waiting for this approval" or "continue this
  exact thread" (`SPEC.md:1591,1598,2111`; `agent_runner.ex:91,100,143`).
- **The human decision gate lives in the ticket, not the kernel.** When an agent
  needs approval, Symphony moves the run to a `blocked` map and the human resolves
  it **out-of-band in Linear**; the decision is **never recorded as a kernel audit
  event** (no recommendation, no override record). This is an L3 anti-pattern.
- **Policy and protocol boundaries are high-trust.** The shipped workflow defaults
  to `approval_policy: never`, `networkAccess: true`, and inherited environment in
  its example workflow, the dashboard/API are unauthenticated on the configured
  bind address, and the `linear_graphql` dynamic tool is a raw GraphQL passthrough
  using Symphony's token (`elixir/WORKFLOW.md:32`; `router.ex:31`;
  `dynamic_tool.ex:8,56`). Fine for an engineering preview; not a v3 security model.
- **The 2000-line god-module.** `status_dashboard.ex` fuses GenServer lifecycle +
  render-throttling + ANSI formatting + a ~900-line event-humanization catalog, and
  is then secretly depended on by the web layer. A cautionary structure.
- **Single-channel, poll-only, identity-only correlation.** One channel (Linear),
  no webhooks, no event bus, and correlation works only because work is *pulled*
  (Symphony already knows the ids it dispatched). It gives v3's L9 (push + durable +
  fuzzy correlation) **zero** guidance — by never needing to solve it.

---

## Slice 1 — Workflow model & spec-as-code

**Verdict:** Symphony is **not** an event-sourced workflow engine — a "run" is
ephemeral in-memory orchestrator state (a single GenServer-owned map of
`running`/`claimed`/`retry_attempts`), with **no append-only log, no persisted run
aggregate, no version/op_id/idempotency key, and no instance lifecycle FSM** —
exactly the L0a/L0d kernel layer v3 cares about is absent **by deliberate design**
(`SPEC.md` Non-Goal §2.2 "General-purpose workflow engine"; §18.2 lists "persist
retry queue and session metadata across restarts" as an unimplemented TODO,
`SPEC.md:2111`). Concurrency safety is pure actor-serialization ("single
authority" GenServer, `SPEC.md:606,696`) — last-writer-wins within one serialized
actor, not optimistic concurrency. The one genuinely transferable idea is
**spec-as-code**.

### The core model — what is a "run"?

Three nested granularities, none a persisted aggregate:

- **Orchestrator runtime state** — one authoritative in-memory struct owned by a
  single GenServer: `{ running, claimed, retry_attempts, completed, codex_totals,
  codex_rate_limits }` (`SPEC.md:260-273,1702-1711`). Identity is the tracker's
  `issue_id` (`SPEC.md:268-270`). **No run UUID, no instance_id, no op_id.**
- **Run Attempt** — one execution attempt for one issue (`SPEC.md:211-223`); not
  stored, it *is* the lifetime of a spawned worker process.
- **Live Session** — Codex subprocess metadata; `session_id = "<thread_id>-<turn_id>"`
  (`SPEC.md:225-245,286-287`).

State lives **entirely in process memory**. A grep for
`ecto.repo|migration|event_log|transcript|append.only|event_store|persist` over
`lib/` returned **zero hits**. Recovery is tracker- + filesystem-driven, not
DB-driven (`SPEC.md:55-56,699`). The only durable artifacts are per-issue workspace
directories on disk. State is **mutable last-write**: `dispatch_issue` directly
assigns `state.running[issue.id] = {...}` (`SPEC.md:1796-1817`); reconciliation
overwrites in place (`SPEC.md:1775`). No transcript, no replay.

### Lifecycle & state machine

There is an explicit state **vocabulary** in the spec but **no enforced FSM in
code** — it documents what the GenServer happens to do:

- Claim states `Unclaimed → Claimed (Running | RetryQueued) → Released`
  (`SPEC.md:609-630`) are *derived from set/map membership*, not a stored enum or
  guarded transition function.
- Run-attempt phases — an 11-name list `PreparingWorkspace … Succeeded/Failed/
  TimedOut/Stalled/CanceledByReconciliation` (`SPEC.md:645-661`) — drive log strings
  and retry policy, not a typed lifecycle.

Crucially there is **no L0d-style instance lifecycle** (CREATED/ACTIVE/WAITING/
TERMINAL + terminal_disposition + guard). A run never reaches a durable terminal
disposition — after a *normal* worker exit the orchestrator schedules a ~1s
continuation retry to re-check tracker state (`SPEC.md:631-643,1888-1893`).
"Done" lives in the tracker, not in Symphony.

**Concurrent updates (the key L0a finding):** no optimistic concurrency, no
`expected_version`, no idempotency key. Safety is **actor serialization** — "the
orchestrator is the only component that mutates scheduling state" (`SPEC.md:606`),
"serializes state mutations through one authority to avoid duplicate dispatch"
(`SPEC.md:696`). Duplicate-dispatch prevention is a pre-flight membership check
(not-in-`running` AND not-in-`claimed`, `SPEC.md:731-733`), not a versioned CAS.
This works for a single-node orchestrator but provides **none** of L0a's primitives.

### Spec-as-code (high interest — the strongest transferable idea)

Three layers:

1. **Prose spec as the authority.** `SPEC.md` is RFC-2119 normative
   (`SPEC.md:7-14`), explicitly *language-agnostic*; the Elixir code is one
   implementation of it, not the source of truth. The spec even states when the
   Codex protocol overrides the spec (`SPEC.md:922-928`). Genuine spec-first design.
2. **Conformance matrix (§17) + Definition-of-Done (§18) shipped inside the spec**,
   tiered `Core Conformance` (required) / `Extension Conformance` (only if shipped) /
   `Real Integration Profile` (`SPEC.md:1936-1945`). E.g. §17.4 enumerates exact
   orchestrator behaviors to test ("Normal worker exit schedules a short
   continuation retry"; "Abnormal worker exit increments retries with 10s-based
   exponential backoff", `SPEC.md:2004-2005`). The spec→behavior binding is
   **human-mediated**: a developer reads §17 and writes matching tests.
3. **The one *mechanical* check — and the caveat for v3.** `specs_check.ex`
   (`Mix.Tasks.Specs.Check`) is an AST-walking task that enforces every public `def`
   in `lib/` has an adjacent `@spec` type annotation, with an exemptions file and
   `@impl` exemption (`specs_check.ex:12-23,43-58,73-146`). So the "checkable
   artifact" is **type-signature coverage discipline**, *not* behavioral conformance
   to the prose. Visible in this slice's files (`workflow.ex:10,16,36,47`;
   `tracker.ex:8-12` declares a `@callback` behavior contract). Useful, but narrower
   than v3's spec-as-code ambition — v3 would need *executable spec assertions* to
   close the spec→behavior loop that Symphony leaves to human-written tests.

### Child / sub-runs

**None.** The only "spawn" is OS/BEAM-process: `dispatch_issue` →
`spawn_worker(fn -> run_agent_attempt(issue, attempt, parent_pid) end)`
(`SPEC.md:1786-1788`), a flat orchestrator→worker fan-out; the worker streams events
back (`send(orchestrator_channel, {codex_update, issue.id, msg})`, `SPEC.md:1851`),
correlated only by `issue_id`. No hierarchy, no child instance, no join. L4 is out
of scope.

| v3 layer | Verdict | Why |
|---|---|---|
| **L0a** (transcript, op_id idempotency, version CAS, def-vs-run aggregate) | **AVOID / negative example** | No event log, op_id, version, or idempotency key; mutable map serialized by one GenServer. Actor-serialization does not generalize to multiple writers / a distributed kernel. |
| **L0d** (typed lifecycle + terminal_disposition + guard) | **AVOID / weak** | Claim states derived from collection membership, not a guarded FSM; runs never truly terminate (continuation-retry loop); completion truth delegated to the tracker. |
| **L4** (child instances + correlation) | **ORTHOGONAL** | Concept absent; only flat process-spawn with `issue_id`. |
| **spec-as-code** | **LEARN FROM (partially)** | Steal: prose-as-authority + RFC-2119, a tiered conformance matrix + DoD *inside* the spec, the redundant "Cheat Sheet" (§6.4) for fast agent implementation. Be honest: the only mechanical gate checks `@spec` coverage, not behavior. |

---

## Slice 2 — Orchestrator & kernel

**Verdict:** Symphony is a **polling issue dispatcher**, not a durable workflow
kernel — a single global GenServer whose entire run-state lives in volatile process
memory and is reconstructed on crash by **re-polling Linear**, not by replaying any
local log. No append-only transcript, no op_id/version-guarded transitions, no
idempotency keying, no explicit lifecycle FSM. **LEARN-FROM** for OTP run-loop
ergonomics and the reconciliation pattern; **AVOID** as a kernel model — it is the
photo-negative of v3's explicit-kernel invariants.

### Architecture

- **Single global GenServer**, not one-process-per-run (`orchestrator.ex:6`),
  started once under a `:one_for_one` app supervisor (`symphony_elixir.ex:30,36`).
  Runs are entries inside its `%State{}` struct (`orchestrator.ex:24-44`:
  `running`, `completed`, `claimed`, `blocked`, `retry_attempts`, token/rate
  accumulators). Each running entry is a plain map with `pid`, monitor `ref`,
  `issue`, `session_id`, counters (`orchestrator.ex:952-973`).
- **OTP primitives:** `Task.Supervisor` per agent run (`Task.Supervisor.start_child`,
  `orchestrator.ex:943`, monitored via `Process.monitor`, `:947`, reacting to
  `{:DOWN,…}` `:120`); `Phoenix.PubSub`; sibling GenServers. **No `Registry`, no
  `DynamicSupervisor`, no persistent storage.** Timers (`Process.send_after`) drive
  the poll tick (`:1548`) and retries (`:1041`).
- **Durability:** `:one_for_one` restart → orchestrator restarts with a **fresh
  empty `%State{}`** (`init/1`, `:53-72`) and immediately re-polls. An orchestrator
  crash **orphans running Codex tasks** (their pid/ref are lost; the new orchestrator
  cannot reattach). **Supervision buys restart-without-cascade, NOT state
  durability.**

### The run loop (timer-driven polling, not event-sourced)

`:tick` (token-guarded against stale timers, `:75-92`) → `:run_poll_cycle`
(`:110`) → `maybe_dispatch` (`:248`): **reconcile** running+blocked issues against
fresh Linear state (`:302`), fetch candidates, check `available_slots`,
`choose_issues` (sort by priority then created_at `:784`, guard
`should_dispatch_issue?` `:804`), **re-validate against Linear again** before
dispatch (`:910/:995`), pick a worker host (`:932`),
`Task.Supervisor.start_child(... AgentRunner.run ...)` (`:943`). The agent run is
**synchronous, sequential, blocking inside the Task** (`agent_runner.ex:20`):
workspace → before-hook → `run_codex_turns` (loop up to `max_turns`) → after-hook,
each turn re-fetching Linear and deciding continue/done (`agent_runner.ex:112,155`).
Completion arrives as `{:DOWN,…}` (`:120`): `:normal` → `complete_issue` + 1s
continuation re-check (`:200-216`); abnormal → exponential backoff retry
(`:234,:1200`); input-required → move to `blocked` (`:226`). **The next action is
derived entirely from current external tracker state, never from local history.**

### Concurrency & correctness

All mutation serialized through one GenServer mailbox (no locks). "Claiming"
(`claimed: MapSet`, `:37,:978`) prevents double-dispatch **within one orchestrator**
— but it is **in-memory only**, lost on restart, and there is no `(instance_id,
op_id)` key, no transcript, no replay. No version-guarding: transitions are plain
`Map.put`/`MapSet` ops (`:951,:1015,:745`). Crash mid-run = state lost, recovered by
re-polling → the issue is re-discovered and **re-dispatched as a NEW Codex session**
(possible duplicate work; no resume/correlation of the prior session). The
stall-detector (`reconcile_stalled_running_issues`, `:574`) and Linear reconciliation
are the correctness backstops, not a kernel. Token-guarded timers (`tick_token`
`:75-92`, `retry_token` `:1064-1080`) are a nice operational-dedup touch.

### Agent invocation

Driven via an OS `Port` to the **Codex "app-server" speaking JSON-RPC 2.0 over
stdio** (`app_server.ex:2-3,189-210`), or tunneled via SSH for remote hosts
(`:214`). A *session* = one thread; a *turn* = one `run_turn` (`app_server.ex:71`).
`AgentRunner` loops turns up to `max_turns`; turn ≥2 sends a "Continuation guidance"
prompt (`agent_runner.ex:143-153`). Streaming via `receive_loop` (`app_server.ex:329`),
auto-approving tool/approval requests when policy is `"never"` (`:53`), pushing
`{:codex_worker_update, issue_id, update}` back to the orchestrator
(`agent_runner.ex:65`). Input-required → blocked entry (crude human-in-the-loop wait).

### Child runs / fan-out

**None.** Only independent top-level issues dispatched concurrently up to
`max_concurrent_agents` + per-state/per-host caps. The nearest analog to
dependencies is `todo_issue_blocked_by_non_terminal?` (`:864`) — external DAG gating
via the tracker's `blocked_by` links, not orchestrator-spawned children. **For v3's
L4, Symphony offers nothing.**

| v3 layer | Verdict | Why |
|---|---|---|
| **L0a** | **AVOID / negative example** | No transcript/EventEnvelope/op_id/`expected_version`; idempotency delegated to in-memory `claimed` (lost on restart) + Linear as truth. |
| **L0b** (actor + role→actor binding) | **LEARN FROM** | Cleanly realized via OTP: the Task running `AgentRunner` is the actor bound to an issue, messaging the orchestrator via `send/2`; `Process.monitor` gives actor-death notification for free. The one layer where OTP genuinely earns its keep. |
| **L0d** | **AVOID** | No FSM; lifecycle inferred from Linear states + ad-hoc buckets; any `handle_info` can move an entry between maps. Weaker than even omnigent's lifecycle. |
| **L4** | **ORTHOGONAL (absent)** | Only external `blocked_by` gating. |

---

## Slice 3 — Channels & external communication

**Verdict:** Symphony is a **single-channel system** — exactly one external work
channel (Linear, via GraphQL), pure **polling** (never webhooks), so there is no
inbound push and no EventNormalizer-style bus; correlation is trivial because the
issue's stable `id` *is* the run key, held in in-memory maps. Steal the **clean
normalization boundary** and the **credential-never-travels split**; reject the
**polling-only, in-memory, identity-only correlation** — v3's whole L9
reason-for-existing is the exact thing Symphony deliberately never built.

### Channel inventory

- **Linear (issue tracker)** — `linear/client.ex`, `linear/adapter.ex`. Both
  directions but **asymmetric**: inbound = read-only polling
  (`fetch_candidate_issues/0`, `client.ex:106`); outbound capability *exists*
  (`create_comment/2` `adapter.ex:49`, `update_issue_state/3` `adapter.ex:61`) but
  is **not wired into the orchestrator** (see Outbound).
- **HTTP server** — `http_server.ex`. **Outbound/observability only** — a facade
  that starts the Phoenix endpoint and serves a status snapshot; no webhook route.
- **CLI / escript** — `cli.ex`. Operator control plane, not a work channel; takes a
  `WORKFLOW.md` path + `--port`, requires a guardrails-acknowledgement flag (`:8`).
- **Codex coding agent** — internal worker channel; it is the actor that performs
  the outbound Linear writes (below).
- **Filesystem / `WORKFLOW.md`** — config + restart-recovery channel.

**No chat, email, or webhook.** Single external work channel: Linear.

### Inbound flow — polling, with a real normalization layer

Polling, not webhooks (`SPEC.md §2.1`; `orchestrator.ex:110`, default 30000ms).
Server-side filtering pushes selection into the GraphQL query (`client.ex:13`,
cursor pagination `:49`). The **EventNormalizer analogue:** `normalize_issue/2`
(`client.ex:448`) maps raw Linear JSON → the stable `%Linear.Issue{}` struct
(`issue.ex:6`: id, identifier, title, priority, state, branch_name, url,
assignee_id, **blocked_by** extracted from `inverseRelations` `:550`, **labels**
lowercased/trimmed `:541`, timestamps). This is exactly v3's EventNormalizer shape:
provider payload → canonical internal record. **Behaviour indirection:** `Tracker`
is a behaviour; `Linear.Adapter` is the concrete impl, swappable via
`Application.get_env(:symphony_elixir, :linear_client_module, Client)`
(`adapter.ex:76`) with an in-memory test tracker (`tracker/memory.ex`). A good seam
— but only for *tracker-shaped* channels.

### Correlation (v3 L9) — trivial identity, no fuzzy matching, in-memory only

**The correlation key is the Linear issue `id` itself** — no separate run-id↔issue-id
table; the issue id *is* the run identity. Orchestrator state keys everything on it
(`running` map, `claimed` set, `retry_attempts` map). Workspace correlation is a
deterministic pure function of the identifier (`safe_identifier/1`,
`workspace.ex:206`) — no stored mapping, recomputed each time. Reconciliation
re-fetches by id (`fetch_issue_states_by_ids`, `orchestrator.ex:309`;
`client.ex:316` re-sorts to requested order). **No fuzzy/heuristic matching
anywhere** — because work is *pulled*, Symphony already knows which ids it
dispatched, so the L9 "which waiting run does this arriving event belong to?"
problem **does not exist here**. Correlation state is in-memory only, lost on
restart, rebuilt by re-polling.

### Outbound flow — Symphony delegates ticket writes to the agent

The clearest architectural decision: `SPEC.md §1` — "Ticket writes (state
transitions, comments, PR links) are **typically performed by the coding agent**
using tools available in the runtime"; §2.2 lists "Built-in business logic for how
to edit tickets/PRs/comments" as a **non-goal** ("That logic lives in the workflow
prompt and agent tooling"). The adapter *can* write (`commentCreate`,
`issueUpdate`) but grep confirms these are **dead from the orchestrator's
perspective** — only the `Tracker` façade and the test tracker call them. Outbound
observability is the HTTP snapshot + structured logs. Real ticket-update cadence is
**inside the agent's run**, driven by the `WORKFLOW.md` prompt; a run can end at a
non-`Done` handoff state like `Human Review`.

### Credentials — central read token, credential-never-travels for writes

The read token is held **centrally** by the Symphony process:
`resolve_secret_setting(settings.tracker.api_key, System.get_env("LINEAR_API_KEY"))`
(`config/schema.ex:377`, generic `$VAR` resolver `:444-476`); the client sets
`{"Authorization", token}` against `tracker.endpoint` (`client.ex:383-394`). **The
token does NOT travel to the worker** — `agent_runner.ex` injects no Linear token.
`SPEC.md §3.2` separates the two auth sources: when the *agent* writes back it uses
**its own host-environment auth/tooling**, not Symphony's polling token. This is
precisely v3 L7 **credential-never-travels**, achieved structurally. Secrets are
also defended in logs (`summarize_error_body` 1000-byte cap, `client.ex:361`; hook
output sanitized, `workspace.ex:339`).

| v3 layer | Verdict | Action for v3 |
|---|---|---|
| **L8** (channels + EventNormalizer) | **LEARN the seam / AVOID the shape** | Steal the `Tracker` behaviour + `normalize_issue → %Issue{}` boundary. Reject: one channel, tracker-shaped only, no generic event type, no bus, no inbox, no Ask/notification primitive. |
| **L9** (wait + external/fuzzy correlation) | **AVOID / ORTHOGONAL** | Symphony pulls, so it never solves L9. Only transferable idea: deterministic key derivation (`safe_identifier/1`) for the exact-match fast path. |
| **L0b** (actor + role→actor binding) | **LEARN FROM** | Two distinct roles: orchestrator-as-reader vs agent-as-writer. `assignee` routing (`routing_assignee_filter` `client.ex:490`, `"me"` resolved via `viewer` `:513`) is a lightweight role→actor binding. |
| **L7** (credential-never-travels) | **LEARN FROM — strong positive** | Central read credential never injected into the worker; worker writes via host auth. Also steal `$VAR` env-indirection (`schema.ex:444`) + secret-safe log truncation. |

---

## Slice 4 — Human UX & board

**Verdict:** Symphony's web surface is a deliberately thin, **read-only** Phoenix
LiveView observability dashboard + JSON API — it shows running/retrying/blocked
sessions but offers **zero in-app intervention** (the only write is `POST
/api/v1/refresh`, which just nudges a poll). The "human decision gate" is real but
lives **entirely in Linear, not in Symphony**: a blocked run is resolved by editing
the ticket, which the orchestrator reconciles on its next poll. **LEARN FROM** the
snapshot→Presenter→renderers layering; **AVOID** the 1952-line `status_dashboard.ex`
god-module and the unauditable, tracker-delegated decision gate.

### The board model & rendering

Not a movable-column kanban — stacked metric cards + tables (`dashboard_live.ex:42-329`),
four lists keyed off lifecycle buckets:

| Board bucket | Orchestrator source | v3 lifecycle (L0d) |
|---|---|---|
| Running | `state.running` | ACTIVE |
| Retrying | `state.retry_attempts` (has `due_in_ms`) | WAITING (timed) |
| **Blocked** | `state.blocked` (has `blocked_at`, `error`) | WAITING (on human, L3) |
| (snapshot unavailable) | `:timeout`/`:unavailable` | UI degraded, not a run state |

Per-row "state" is the **raw tracker workflow state** ("In Progress"), colorized by
keyword heuristic (`state_badge_class/1`, `dashboard_live.ex:428-438`). **Phoenix
LiveView**, server-rendered HEEx at `/` (`router.ex:28`; `dashboard_live.ex:6`).
**Live updates via PubSub, not polling:** on connect it subscribes to
`"observability:dashboard"` (`:18-21`); on state change code calls
`StatusDashboard.notify_update/1` → `ObservabilityPubSub.broadcast_update()`
(`status_dashboard.ex:84-95`); the LiveView re-pulls a fresh snapshot
(`dashboard_live.ex:33-38`). A secondary 1s `:runtime_tick` only refreshes "now" so
elapsed counters tick smoothly without re-fetching (`:27-30,440-442`). **The
broadcast is a content-free "something changed" ping; each subscriber then pulls a
full snapshot via `Orchestrator.snapshot/2`** (a 15s-timeout `GenServer.call`,
`orchestrator.ex:1354`). Orchestrator is the single source of truth; the UI never
holds derived state. **This is the "how instances surface live" pattern v3 wants:
push a dirty-bit, pull authoritative state.**

### Human intervention — almost none, and the gate is in the ticket

The web surface is read-only by design — `SPEC.md:1366-1367,1527`: dashboard/API
"MUST be observability/control surfaces only," "SHOULD be read-only except for
operational triggers like `/refresh`." **No approve/reject/pause/retry/kill buttons
exist.** The only write endpoint is `POST /api/v1/refresh` (`router.ex:36`), which
just schedules an immediate poll (`orchestrator.ex:1447-1460`) — it targets no
specific run and carries no decision.

The **L3 decision gate is real but lives in the tracker.** When Codex emits
`turn_input_required` / `approval_required` / an MCP `elicitation/request`, the
orchestrator detects it (`input_required_blocker?/1`, `:652-657`), **stops the
task**, and moves the issue into `state.blocked` with a human-readable error
(`stop_and_block_issue`, `:740-767`). The human acts **out-of-band in Linear**: a
blocked issue is released only when the *ticket's state changes* — each reconcile
poll re-fetches and releases if terminal/non-active/re-routed
(`reconcile_blocked_issue_state/4`, `:448-466`). **Decisions are NOT recorded as
structured audit events** — no decision log, no recommendation+override record;
auto-approvals appear only as transient humanized strings + `Logger.warning`
(`:611`). This is an L3 anti-pattern for v3.

### What `status_dashboard.ex` (1952 lines) is doing

It is **both a GenServer and the *terminal* TUI view layer** (moduledoc `:3`):
GenServer render/throttle state (~`:41-306`: timers, token samples, fingerprint
diffing, a coalescing render engine `:233-306`); ANSI/terminal formatting
(~`:333-1068`: box-drawing, a token-throughput sparkline `tps_graph/3` `:864-915`,
column-width math); and **~900 lines of event humanization** (`humanize_codex_*`,
`:1070-end`) turning raw Codex JSON into one-line summaries. **The web layer
secretly depends on this terminal module** — `Presenter.summarize_message` calls
`StatusDashboard.humanize_codex_message/1` (`presenter.ex:224`). The humanization
corpus (a genuinely valuable full catalog of agent event types) is **trapped inside
a god-module** instead of living in its own `EventHumanizer`.

| v3 layer | Verdict | Why |
|---|---|---|
| **L0d** (state rendering) | **LEARN FROM** | snapshot→shared `Presenter`→both LiveView and JSON API (`presenter.ex:9-34`) so HTML/JSON can't drift; content-free PubSub ping + pull-authoritative-snapshot; the 1s cosmetic tick. Adopt all three. |
| **L8** (task inbox) | **LEARN the projection; it's a board, not an inbox** | The `Blocked` table separates waiting-on-human from waiting-on-timer — closest thing to an inbox. No per-item actions, no claim/assignment, no notification. v3's inbox is a strict superset. |
| **L3** (human decision) | **LEARN the surfacing, AVOID the routing** | Learn: detect the gate from agent signals + never stall indefinitely. Avoid: decision delegated to the external tracker, observed via polling, **no in-kernel Ask/approve and no audit record**. v3 must keep the decision a first-class audited kernel event. |
| — | **Anti-pattern** | The 2000-line god-module fusing GenServer + throttle + ANSI + humanization, secretly depended on by the web layer. Keep the humanization catalog its own module; keep throttling separate from formatting. |

---

## Slice 5 — Agent adapter & runtime context

**Verdict:** A deliberately lightweight, **single-agent-coupled** design: it speaks
the **Codex app-server JSON-RPC 2.0 protocol over stdio**, provisions workspaces as
**bare `mkdir` directories** (not git worktrees) under a configurable root, and
delegates *all* sandboxing and credential-isolation to **Codex's own native sandbox
policy** rather than building its own proxy/broker. **L0c: AVOID as a generic
adapter** (hard-coded to one Codex protocol, no adapter abstraction) but **LEARN
FROM as a protocol-integration reference**; **L0e/L0f: LEARN FROM** (clean
path-safety, optional SSH remote workers, typed Ecto config); **L7: ORTHOGONAL /
gap** — no broker, secrets either stay in the orchestrator or go wholesale to
Codex's sandbox.

### Agent adapter — Codex app-server over JSON-RPC/stdio, not swappable

Symphony is a JSON-RPC 2.0 **client** over a stdio pipe; Codex is the long-lived
server. It spawns `codex app-server` inside `bash -lc` (`app_server.ex:189-210`;
default `command` `schema.ex:166`) and drives `initialize → initialized →
thread/start → turn/start`, then pumps a receive loop (`receive_loop`/`handle_incoming`,
`:340-438`) dispatching `turn/completed|failed|cancelled` plus a large family of
**approval requests** (`item/commandExecution/requestApproval`, `execCommandApproval`,
`applyPatchApproval`, `item/fileChange/requestApproval`, `item/tool/requestUserInput`,
`item/tool/call`) via `maybe_handle_approval_request` (`:526-682`). With
`auto_approve_requests` (set when `approval_policy == "never"`, `:54`), approvals are
auto-answered (`"acceptForSession"`, even a canned non-interactive answer string
`:835`). **Tools exposed to the agent** (`dynamic_tool.ex`): Codex calls *back* into
Symphony via `item/tool/call` — the only registered dynamic tool is **`linear_graphql`**
(`dynamic_tool.ex:8-54`), a raw GraphQL passthrough using Symphony's auth. An
MCP-flavored client-tool registry, but Symphony-specific.

**Portability: Codex-coupled.** No `ActorAdapter`-style abstraction — the module is
`Codex.AppServer`, with method names, sandbox-policy shapes, and approval-decision
strings all Codex-specific and hard-coded. Dropping in Claude/Cursor needs a
parallel adapter module; nothing is a protocol-agnostic seam (the one clean
injection point is `tool_executor`/`on_message` for testing, `:86-89`). **Weaker
than omnigent's swappable-adapter strength** — but `app_server.ex` is an excellent
worked example of a real JSON-RPC/stdio coding-agent integration that v3's
Codex-protocol ActorAdapter could lift almost directly.

### Runtime context / isolation — bare directories under a root

Each run gets a per-issue directory named after a sanitized identifier
(`safe_identifier` strips to `[a-zA-Z0-9._-]`, `workspace.ex:206`) under
`workspace.root` (default `$TMPDIR/symphony_workspaces`, `schema.ex:99`). Lifecycle:
**create** `create_for_issue/2 → File.mkdir_p!` + `after_create` hook (`:34-85`) —
**a plain `mkdir`, not a git worktree/clone**; repo provisioning is left to
user-configured hooks (`after_create`/`before_run`, e.g. a `git clone`). **use**
`before_run` hook → `AppServer.start_session` → loop turns → `after_run` hook in an
`after` block. **teardown** `remove/2` → `before_remove` hook → `File.rm_rf`. Isolation
between concurrent runs is **filesystem path separation** with strong **path-safety**:
`validate_workspace_cwd`/`validate_workspace_path` canonicalize via
`PathSafety.canonicalize` (manual segment-by-segment symlink resolution,
`path_safety.ex:25-45`) and reject `workspace == root`, symlink-escape, outside-root
(`app_server.ex:147-173`, `workspace.ex:358-384`). No OS container/namespace
isolation from Symphony itself — process sandboxing is delegated to Codex's
`sandboxPolicy`.

### SSH / remote workers

`ssh.ex` runs an issue's whole workspace + Codex session on a remote machine, a thin
shell-out to system `ssh`: `SSH.run/3 → System.cmd("ssh",…)` (`:5-9`),
`SSH.start_port/3` opens a long-lived port for the remote app-server stream
(`:12-27`), commands wrapped `bash -lc '<escaped>'` (`:30-32`), `host:port` + IPv6
parsing (`:67-95`), optional `-F $SYMPHONY_SSH_CONFIG`. A remote run ships a
`set -eu` script over SSH that does the `mkdir`/`cd` and prints a tab-delimited
`__SYMPHONY_WORKSPACE__` marker that Symphony parses back (`workspace.ex:48-79,412-433`),
then `cd <ws> && exec codex app-server` over SSH. Note: remote sandbox policy uses
`remote: true`, which **skips local path canonicalization** (`schema.ex:499-508`) — a
trust relaxation v3 should not copy. Config: `worker.ssh_hosts` +
`worker.max_concurrent_agents_per_host` (`schema.ex:109-126`); "one worker lifetime
never hops machines" (`agent_runner.ex:22`).

### Config & typed slots — Ecto-validated, single global config

Config loads from `WORKFLOW.md` front-matter (`config.ex:1,31`) validated through
**Ecto embedded schemas** (`config/schema.ex`) — genuinely typed, not a raw map.
Top-level embeds (`:270-280`): `tracker`, `polling`, `workspace`, `worker`, `agent`,
`codex`, `hooks`, `observability`, `server`, each with `cast` +
`validate_number`/`validate_required`. `parse/1` returns
`{:error, {:invalid_workflow_config, …}}` (`:282-296`); `validate_semantics` adds
cross-field rules (`config.ex:117-134`). **This is one global per-project config, not
per-run typed slots.** The only per-run variation is computed: `turn_sandbox_policy`
resolved per-workspace (`writableRoots = that run's workspace`, `schema.ex:488-497`)
and `worker_host` selected per run. The run "input" is just the issue + a
Liquid-templated prompt (`@default_prompt_template`, `config.ex:9-21`). **No typed
I/O slots.**

### Credentials — no broker

Two paths, neither a general broker: (1) **Linear key** resolved from
`tracker.api_key`/`$LINEAR_API_KEY` (`schema.ex:377,444-456`), lives in the
**orchestrator process**, used only when Codex calls back via the `linear_graphql`
dynamic tool (`dynamic_tool.ex:56-66`) — a narrow hard-coded broker for one API; the
Linear secret never travels to the agent. (2) **Everything else** delegated to
Codex's native sandbox: default `turn_sandbox_policy` is `workspaceWrite` with
`writableRoots: [workspace]`, `readOnlyAccess: fullAccess`, and crucially
**`networkAccess: false`** (`schema.ex:488-497`). Credentials the agent *does* need
(e.g. for a `before_run` `git clone`) are provided by the **user's hook in the
orchestrator/worker shell**, outside the agent's sandbox — not proxied. The
thread-level `approval_policy` default rejects sandbox-escalation, rules, and MCP
elicitations (`schema.ex:168-176`).

| v3 layer | Verdict | Why |
|---|---|---|
| **L0c** (AgentConfig + ActorAdapter) | **AVOID as architecture, LEARN as protocol reference** | No portable run-intent or adapter seam — one concrete Codex client. But `app_server.ex` is a directly liftable worked example of JSON-RPC/stdio agent integration (handshake, turn lifecycle, approval/elicitation taxonomy, dynamic client-tools). |
| **L0e** (RuntimeContextProvider) | **LEARN FROM** | `create → before_run (ready) → after_run/remove (release)` all hookable; `PathSafety` symlink-escape guard; remote-workspace marker-line protocol; SSH as a second backend behind one interface. Gap: bare dirs not worktrees (repo setup offloaded to hooks); `remote:true` skips canonicalization — don't copy. |
| **L0f** (config + typed slots) | **LEARN (config) / ORTHOGONAL (slots)** | Ecto-schema-validated config with per-section changesets + `$REF` resolution + flattened errors is worth emulating. No typed run slots — config is one global blob. |
| **L7** (credential-never-travels) | **ORTHOGONAL / gap** | No broker, no per-grant issuance, no proxy. Illustrates the lighter-weight alternative (sandbox the agent's network entirely + broker the one API you care about) — a strength for a single tracker, a gap for v3's multi-credential goal. |

---

## Slice 6 — OTP architecture lens & the durability question

**Verdict:** Symphony gets v3's L0b (actor model/message-passing) and a *single-VM*
slice of L0d (crash isolation + supervised restart) essentially **for free** from
OTP, and leans on them hard — its entire orchestrator is one supervised GenServer
dispatching monitored `Task`s, with **zero hand-rolled concurrency machinery**. But
it does **not** durably persist run state: a VM crash wipes the orchestrator's
in-memory state, and it survives only because it externalizes durability to
**Linear** as its source of truth and rebuilds state by polling. This confirms v3's
thesis sharply: **OTP solves supervision but not durability** — Symphony's
"durability" is just *someone else's database*, so v3's L0a is a genuinely separate
concern no substrate hands you; OTP would let v3 delete a lot of L0b/L0d
hand-coding, but L0a remains unavoidable.

### Process topology

Only **3 GenServers** in the codebase (orchestrator, workflow_store,
status_dashboard). Supervision tree (`symphony_elixir.ex:26-39`):

```
SymphonyElixir.Supervisor              (one_for_one)
├── Phoenix.PubSub (SymphonyElixir.PubSub)
├── Task.Supervisor (SymphonyElixir.TaskSupervisor)   ← per-run worker tasks
├── WorkflowStore        (GenServer)                   polls WORKFLOW.md every 1s
├── Orchestrator         (GenServer)  ← THE singleton  holds ALL run state
├── HttpServer           (Phoenix endpoint facade)
└── StatusDashboard      (GenServer)                   terminal/web UI render
```

**One shared singleton, not one-process-per-run** — the `Orchestrator` GenServer
holds every in-flight run in one `%State{}` (`orchestrator.ex:29-43`). No `Registry`,
no `DynamicSupervisor`. **One ephemeral Task per run** under `Task.Supervisor`,
tracked by `Process.monitor` (`:943-947`); the agent work is `AgentRunner.run/3`
(`agent_runner.ex:21`), a plain functional module, not a GenServer. Crash handling is
**hand-coded inside the singleton** (`{:DOWN,…}` `:120-140` → manual backoff
`:1200-1203` + stall watchdog `:574-632`), using OTP monitoring as a *signal* but
re-implementing the restart/guard policy itself.

### What OTP gives for free vs. what v3 hand-builds

| Concern | v3 layer | Relies on OTP? | Effect |
|---|---|---|---|
| **(a) Actor model / message passing** | L0b | **Yes, fully** | Orchestrator IS an actor; `GenServer.call(:snapshot)` (`:1369`), worker→orchestrator via `send`/`handle_info` (`:159,:142`), PubSub fan-out. v3's hand-built EventEnvelope mailbox / role→actor binding is **native**. The language *is* the actor model. |
| **(b) Crash isolation + supervised restart** | L0d (guard) | **Partially** | OTP gives process isolation (a crashing Task can't corrupt the orchestrator heap) + death notices; the restart *policy* (backoff, max attempts, stall watchdog, blocked-state) is hand-coded (`:218-246,593-632`). Isolation free; recovery semantics still app code, but cheaper. |
| **(c) Concurrency without shared-memory races** | (implicit) | **Yes, fully** | All run state in one serialized message loop; no locks, no `expected_version` CAS *within the VM*. The biggest single "OTP gift" — a whole class of v3's explicit concurrency control disappears within one node. |

### The durability gap (the crux)

**Symphony persists run state nowhere durable.** Confirmed by exhaustive grep: no
file writes, no `:dets`/`:ets`/`persistent_term` for run state, **no database**
(`ecto` is in deps but used **only for config validation** — `use Ecto.Schema` +
`Ecto.Changeset` over the `WORKFLOW.md` front-matter, zero `Repo`, zero migrations).
On a VM crash the supervisor restarts the orchestrator with a **fresh empty `%State{}`**
(`init/1`, `:53-72`); every `running`/`blocked`/`retry_attempts` entry is gone.

**How it bridges the gap: it doesn't event-source — it externalizes the source of
truth to Linear.** On restart, `init` schedules a poll (`:69`) and `maybe_dispatch`
*reconstructs* in-flight work by re-fetching issue states from Linear
(`fetch_candidate_issues`, `fetch_issue_states_by_ids`, `:254-325`) and
re-dispatching anything still active. The `Tracker` behaviour abstracts this; the
real adapter is `Linear.Adapter`.

**What this teaches v3 about "supervised" vs "durable":** a *supervised* process is
one the runtime restarts on crash; a *durable* process is one whose **state survives
the restart**. OTP gives the first, explicitly not the second — restart hands you a
blank `init/1`. Symphony's pattern is "supervised + reconstructable-from-an-external-
system-of-record," not "durable." It works **only because** Linear is the real
database and re-dispatching an active issue re-runs the agent against the live repo.
There is **no transcript, no op_id idempotency, no atomic versioned commit** — exactly
v3's L0a, all absent. You can recover "issue is in-progress"; you cannot recover
"which step, with what idempotency, at what version."

### Distribution

**Not a distributed BEAM system** — zero `Node.`/`:rpc`/`:global`/`libcluster`.
Single BEAM node. "Distribution" is **SSH out to remote worker hosts**
(`ssh.ex:6-25`); the orchestrator load-balances issues across `worker.ssh_hosts`
with a per-host cap (`select_worker_host`, `:1241-1301`). The **control plane
(orchestrator, all state, all scheduling) is one machine, one process — a single
point of failure with no failover.** It scales *work* horizontally (N SSH workers)
but not the orchestrator itself; it does not use BEAM's actual distribution
primitives.

### v3 verdict — the split answer

**Does a different substrate change v3's hard problems? Symphony's answer is "half
yes, half no," and both halves matter:**

1. **v3 is partly reinventing the substrate.** On BEAM, v3's L0b would be near-native
   and its in-VM optimistic-concurrency / `expected_version` CAS would be
   *unnecessary within a node* (a GenServer serializes mutations — Symphony has
   **zero** such machinery and races cannot happen). The isolation half of L0d is
   also free. Symphony's 3-GenServer, ~20K-LOC orchestrator with **no
   concurrency-control code** is striking evidence of the leverage — worth a hard
   look for *that* reason.
2. **But L0a is NOT in the gift, and Symphony proves it by its absence.** OTP restart
   = blank `init/1`, full stop. Symphony survives crashes *only* by treating Linear
   as its event store and polling reality back into memory. That is L0a **outsourced**,
   not L0a **solved**. The moment v3 wants self-contained durability (replayable
   transcript, exactly-once op semantics, optimistic-concurrency commits that don't
   depend on an external SaaS's coarse state machine), **no runtime substrate
   provides it** — you build it, exactly as v3 is doing.

**The sharp recommendation:** consider BEAM/OTP-style actor+monitor ergonomics to
shrink L0b and the in-VM portion of L0d — but do not mistake supervision for the
kernel. Symphony is the clarifying example of what an orchestrator looks like when
you *skip* L0a: simple, OTP-elegant, and entirely dependent on an external system of
record for its memory. v3's distinguishing bet — durable, self-contained,
event-sourced workflow instances with idempotency and optimistic concurrency — is
precisely the thing Symphony chose not to build.

---

## Second-pass deltas

The ten-lens reread mostly confirmed the first report's thesis, but it added several
important details that change what v3 should copy or avoid.

### State, lifecycle, and ownership

- **The useful pattern is "single scheduler authority + reconciliation," not "no
  kernel needed."** The orchestrator owns `running`, `claimed`, `blocked`,
  `retry_attempts`, and token/accounting state in one GenServer (`orchestrator.ex:24`),
  and every poll cycle reconciles before dispatching (`orchestrator.ex:248`). That
  is a good shape for one local scheduler. It does not replace a durable L0a store,
  because those maps disappear on restart.
- **Claiming is broader than running.** `claimed` excludes already-running,
  retry-queued, and blocked issues from dispatch (`orchestrator.ex:804,812,951,978`).
  That distinction matters for v3: "not active" is not the same as "available."
- **Timer refs are fenced, but not durable operation ids.** Retry and tick timers use
  fresh references to ignore stale messages (`orchestrator.ex:1029,1064`), which is
  a useful in-process dedup pattern. It should not be mistaken for v3's durable
  `(instance_id, op_id)` idempotency.
- **Workspace durability is artifact durability, not run durability.** Per-issue
  workspaces are deterministic and retained across non-terminal interruptions
  (`workspace.ex:196`; `orchestrator.ex:1106,1141`). That helps recovery by
  preserving files, but it does not preserve lifecycle, step position, approval
  state, thread ownership, or idempotency.
- **Remote worker ownership is deliberately sticky.** Once selected, a run's worker
  host is part of execution identity; retry prefers the same host rather than
  silently failing over (`orchestrator.ex:1241,1293`; `agent_runner.ex:22`). v3
  should model execution-location ownership explicitly when leases can span hosts.

### Delegation and event flow

- **Symphony fan-out is issue-worker fan-out, not subagent delegation.** The child
  unit is an OTP `Task` running `AgentRunner`, monitored by the orchestrator and
  fanning events back as `{:codex_worker_update, issue_id, message}`
  (`symphony_elixir.ex:26`; `orchestrator.ex:943`; `agent_runner.ex:57`). There is
  no parent/child workflow tree, but the supervision and fan-in mechanics are worth
  stealing for L4 execution plumbing.
- **Concurrency limits are multidimensional.** Dispatch is gated by global slots,
  tracker state, routability, blocked-by links, and optional per-worker-host caps
  (`config/schema.ex:137`; `orchestrator.ex:822,864,1241`). v3 should avoid a single
  flat "max children" number if execution hosts, ownership, and external workflow
  state also constrain runnable work.
- **PubSub is only an invalidation channel.** The web dashboard receives a
  content-free update ping and then pulls the authoritative snapshot; it does not
  treat the pushed event as truth (`observability_pubsub.ex:6,15`;
  `dashboard_live.ex:18,33`). This is cleaner than mixing durable event semantics
  with UI refresh notifications.
- **Codex protocol events are not normalized enough.** Symphony stores mostly the
  last event/message plus extracted tokens/rate limits (`orchestrator.ex:1468,1534`),
  with many payload-shape branches for token/rate extraction
  (`orchestrator.ex:1703,1727,1760`). v3 should put that into a versioned event
  normalizer and keep a timeline, not just a last-message projection.
- **The JSON-RPC receive loop has demux risk.** The app-server client waits for
  responses while also receiving notifications, and some notification handling can
  be dropped or sidelined during `await_response` paths (`app_server.ex:922,956`).
  v3's adapter boundary should make response correlation and notification fan-out a
  first-class protocol concern.

### Policy, memory, and UX

- **Symphony has a workpad memory pattern worth naming.** Durable task memory is
  externalized into the Linear issue/workpad and workflow instructions, while the
  actual prompt render is intentionally small: workflow template + normalized issue
  + attempt metadata (`elixir/WORKFLOW.md:141,294`; `prompt_builder.ex:8,44`). That
  is a useful "small prompt, durable external workpad" model, but v3 should not make
  the tracker the only durable memory.
- **`WORKFLOW.md` is both policy and live config, with last-known-good semantics.**
  Frontmatter/body parsing is watched and invalid edits keep the last valid workflow
  (`workflow.ex:63`; `workflow_store.ex:61,150`). This is a good operator UX pattern
  for editable policy, provided v3 separates "policy text" from enforceable kernel
  gates.
- **Skills are prompt references, not verified runtime capabilities.** The workflow
  can tell the agent to use skills, but Symphony does not verify that those skills
  exist or are available in the runtime; only the hard-coded dynamic tool registry is
  checked (`elixir/WORKFLOW.md:98,104`; `dynamic_tool.ex:45`). v3 should bind skill
  availability into the run contract if skills are semantically required.
- **Operator surfaces share one snapshot, but lack action history.** Web, JSON, and
  terminal views all derive from the orchestrator snapshot via a presenter
  (`presenter.ex:1`; `observability_api_controller.ex:12`; `dashboard_live.ex:15`).
  That prevents renderer drift. The missing piece is a durable per-run event
  timeline; current "issue logs" are mostly placeholders and latest-status summaries
  (`presenter.ex:82,210`).
- **URL and display hardening exists in small places.** The dashboard sanitizes
  external issue URLs before rendering (`dashboard_live.ex:365`), which is worth
  keeping in v3's operator views even if the broader API/auth story is stronger.

### Modularity and drift

- **The cleanest seam is the tracker behaviour, but provider language leaks inward.**
  `Tracker` is a small behaviour and the Linear adapter is testable
  (`tracker.ex:8,14`), yet core modules still import or type against
  `Linear.Issue` (`orchestrator.ex:10`; `agent_runner.ex:8`;
  `tracker/memory.ex:8`). v3 should keep provider-normalized records out of the
  core domain namespace once multiple channels/providers exist.
- **`AppServer` owns too much policy.** The Codex client module handles protocol
  framing, approval decisions, dynamic tool dispatch, sandbox options, response
  waiting, and event summarization hooks (`app_server.ex:39,329,466,548`). As a
  reference implementation it is valuable; as a v3 module boundary it is too broad.
- **Remote execution weakens otherwise good local guards.** Local workspace cwd/path
  validation is strong (`workspace.ex:358,371`; `app_server.ex:147,160`), while
  remote mode necessarily trusts host-side paths and marker parsing more
  (`workspace.ex:386,412`; `app_server.ex:175`). v3 should make "local verified
  path" and "remote attested path" different runtime-context variants.
- **There is a concrete spec/test drift.** The spec describes `linear_graphql` as a
  single-operation tool (`SPEC.md:1080,1084`), while the dynamic-tool tests allow a
  multi-operation payload (`dynamic_tool_test.exs:102`; `dynamic_tool.ex:68`). This
  is exactly why v3's spec-as-code aspiration needs executable behavioral checks,
  not only prose plus type/spec coverage.
- **Critical modules are excluded from coverage gates.** The coverage setup excludes
  modules such as generated/console-facing surfaces (`mix.exs:11,15`), while some of
  those surfaces contain protocol and operator logic. v3 should be cautious about
  excluding "just UI/adapter" files when those files own policy decisions.

## Consolidated direction table

| v3 level | Symphony's stance | Verdict for v3 | The one thing to take/avoid |
|---|---|---|---|
| **L0a** kernel (transcript, op_id, version CAS) | Absent by design; Linear/workspace artifacts are the reconstructable truth | **AVOID — negative example** | Symphony is what skipping L0a looks like: re-dispatches fresh sessions on crash, no durable blocked/retry/thread state. Confirms L0a is the differentiator. |
| **L0b** actor + role→actor | Native via OTP GenServer/Task/monitor | **LEARN FROM** | Actor model + monitors come free on BEAM; orchestrator-as-reader vs agent-as-writer is a clean role split; supervised Task fan-in maps well to child execution plumbing. |
| **L0c** AgentConfig + ActorAdapter | One hard-coded Codex JSON-RPC/stdio client | **AVOID arch / LEARN protocol** | Lift `app_server.ex` as a Codex-protocol ActorAdapter reference, but split protocol demux, approval policy, dynamic tools, and sandbox config into explicit seams. |
| **L0d** lifecycle FSM | Derived from collection membership + Linear states; no typed FSM | **AVOID (weak); LEARN state rendering** | Build the typed FSM v3 plans; adopt reconcile-before-dispatch, retry-token fencing, blocked-vs-retry taxonomy, and snapshot→Presenter→renderers + dirty-bit-ping. |
| **L0e** RuntimeContextProvider | `mkdir` dirs + hooks + path-safety + SSH backend | **LEARN FROM** | provision/ready/release lifecycle, symlink-escape guard, SSH as a second backend. Don't copy `remote:true` skipping canonicalization; model remote path trust separately. |
| **L0f** config + typed slots | Ecto-validated global config; no run slots | **LEARN (config) / ORTHOGONAL (slots)** | Typed, per-section validated config with `$REF` resolution. |
| **L3** human decision | Gate detected, but decision lives in the ticket, unaudited | **AVOID** | Keep the decision a first-class **audited kernel event**, not a ticket field bounced through polling; preserve "input required blocks, not retries." |
| **L4** child instances | Absent; only flat issue-worker spawn | **ORTHOGONAL with plumbing lessons** | No child workflow model, but monitored Task spawn, issue-keyed fan-in, and multidimensional scheduler caps are useful execution mechanics. |
| **L7** credentials | Central read token; agent writes via host auth; raw GraphQL dynamic tool | **LEARN split / AVOID passthrough** | credential-never-travels by construction; sandbox agent network + broker only the APIs you need, but do not expose raw provider GraphQL as the durable action boundary. |
| **L8** channels + EventNormalizer | One channel (Linear), poll-only, clean `%Issue{}` normalization | **LEARN the seam / AVOID the shape** | Steal the behaviour+normalize seam and PubSub-as-invalidation; generalize beyond one tracker-shaped channel and store a real event timeline. |
| **L9** wait + fuzzy correlation | Identity-only, in-memory, never needed (pull model) | **AVOID / ORTHOGONAL** | Only deterministic exact-match key derivation and stable workspace naming transfer; no evidence for fuzzy inbound correlation. |
| **Memory/context** | Linear workpad + small prompt render + live workflow reload | **LEARN with caution** | Small prompt + durable external workpad is useful, but v3 should not make tracker state its only durable task memory; verify required skills/tools at runtime. |
| **spec-as-code** (methodology) | 2185-line RFC-2119 SPEC + tiered conformance matrix + DoD; `@spec` lint | **LEARN FROM (best in project)** | Ship the spec as the authority with its own conformance tiers; go further than Symphony with *executable* spec assertions and drift checks. |

## Two reconsiderations Symphony forces

1. **Substrate choice is a real lever, not a settled question.** Symphony ships a
   working orchestrator with **zero concurrency-control code** because BEAM serializes
   mutations and supervises crashes natively. If v3 is hand-building mailboxes,
   role→actor dispatch, and in-VM version guards on a Node/TS stack, Symphony is
   concrete evidence of how much of that a different substrate erases. This does not
   decide anything — but "would BEAM delete half of L0b/L0d?" deserves an explicit,
   evidence-based answer rather than an implicit default.

2. **"Outsource durability to the tracker" is a tempting shortcut v3 must consciously
   reject.** Symphony proves you can ship without L0a by making an external SaaS your
   system of record. It is simpler and it works — until you need resume,
   exactly-once, sub-issue granularity, or independence from one tracker's coarse
   state machine. v3's whole reason to exist is those four things. The study's value
   is making the trade explicit: L0a is *optional* for an orchestrator and
   *load-bearing* for a kernel.

## Caveats

- Symphony is small and young; some capabilities (durable retry/session persistence)
  are explicitly listed as **unbuilt TODOs** in its own spec (`SPEC.md:2111,18.2`),
  so several "absent" findings are acknowledged gaps, not oversights — judged here as
  evidence of *what an MVP orchestrator chooses to defer*.
- Citations are relative to the Symphony repo root at HEAD `4cbe3a9` (2026-06-09).
  Line numbers from `SPEC.md` reference the spec's pseudocode/section structure.
- This is a *learning* study, not a recommendation to adopt Elixir/OTP — Slice 6's
  "consider BEAM" is a prompt to answer the substrate question explicitly, nothing
  more.
