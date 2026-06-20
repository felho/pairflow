# Vibe Kanban Study — The Human-Review Board With the Best Observe-Seam

Date: 2026-06-19

## Purpose

This note captures what Pairflow v3 can learn from **Vibe Kanban**
(`BloopAI/vibe-kanban`), a **kanban board for orchestrating coding agents** — you
plan work as kanban issues, then spin up *workspaces* where a coding agent (Claude
Code, Codex, Gemini CLI, Copilot, Amp, Cursor, OpenCode, Droid, CCR, Qwen) runs on a
git branch with a terminal and a dev server; you review the diff, drop inline comments,
send feedback to the agent, and open a PR. It is the only project in the series that
approaches orchestration from the **human-board/review UX** angle, which is exactly the
dimension the project owner wanted to probe.

It is a mature Rust + TypeScript product — ~109K LOC Rust across ~33 crates + ~110K LOC
TS/TSX — built around a real `projects → tasks → workspaces → sessions →
execution_processes` data model with git-worktree isolation per attempt. **(Note: Vibe
Kanban is officially sunsetting — there is a shutdown announcement in the README — but
as a finished, battle-tested product it is a high-value reverse-engineering source.)**

Two of the project owner's standing curiosities converge here: the **human-UX/board**
angle (the review flow, the approval gate, how a human steers an agent) and the
**channels** angle ("how those projects communicate in different channels"). Vibe Kanban
answers the second very differently from Hermes — its `relay-*` crates are an
*infrastructure transport fabric* (WebRTC/WebSocket tunneling to reach a local instance
remotely), not messaging-platform adapters. That contrast turns out to be one of the
sharpest findings.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/vibe-kanban` (analyzed at HEAD `4deb7ec`)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)
- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself

Sixth in a series. Read alongside:

- [`omnigent-study.md`](omnigent-study.md) — meta-harness; "L4 child = full instance"; weak kernel.
- [`symphony-study.md`](symphony-study.md) — OTP orchestrator; skipped L0a; unaudited human gate.
- [`paperclip-study.md`](paperclip-study.md) — durable Postgres kernel; host-owned `AdapterSessionCodec`; UUID-secret-ref broker; audited `issue_execution_decisions`.
- [`dbos-study.md`](dbos-study.md) — the canonical L0a reference; one primitive (deterministic id + `INSERT … ON CONFLICT` + memoized replay) unifies idempotency/spawn/scheduling/recovery.
- [`hermes-agent-study.md`](hermes-agent-study.md) — channel/memory/skills reference, kernel anti-example; "one central contract, N decentralized implementations, best-effort guarantees."

> Method: the original study used seven parallel sub-agent analyses, each mapping one
> slice onto specific v3 levels, with `file:line` citations relative to the repo root.
> A later second-pass audit used ten fresh source-only lenses before rereading this
> report: durable state, lifecycle/recovery, concurrency/ownership, runtime adapters,
> policy/security, fan-out/scheduling, events/streaming, memory/context, operator UX,
> and modularity/extensibility. The codebase is large; agents read the most
> load-bearing schema, service, executor, relay, event-stream, and React workspace files.
> One original agent surfaced a late schema refactor
> (`20251216142123_refactor_task_attempts_to_workspaces_sessions.sql`) that renamed
> `task_attempts → workspaces` and split out `sessions` + `coding_agent_turns`; the
> findings below reflect the current model, not the original `init.sql`.

## Executive Summary

Three load-bearing findings.

> **1. Vibe Kanban is the human-review-board reference — and a third kernel
> anti-example, but the most kernel-shaped one yet.** It has the cleanest *unit of
> execution* in the series: every agent invocation (initial run, follow-up, setup/
> cleanup script, dev server) is a first-class, append-mostly `execution_process` row
> carrying a fully-serialized, replayable run-intent (`executor_action` JSON). Yet it
> has **no operation log, no idempotency key, no `expected_version`/CAS, and no
> resume-mid-operation** — a crash marks every `running` process `Failed` and the human
> must restart. It lands **between hermes and paperclip, below DBOS**: like paperclip a
> mutable status row + a partial audit trail, but *without* paperclip's `FOR UPDATE`/CAS
> — concurrency safety rests entirely on SQLite's single writer. Its one genuinely novel
> durability idea is **git-anchored checkpointing**: each process stores `before/
> after_head_commit` per repo, and "restore" = `git reset` to a stored commit OID +
> soft-delete (`dropped`) of later rows. Not event-sourcing — git is the system-of-record
> for code state, the DB just tombstones.

> **2. The best "observe a run from outside" primitive in the series — `MsgStore`.** A
> per-execution in-memory pub-sub (`crates/utils/src/msg_store.rs`) fronts a
> `tokio::broadcast` with a bounded replay buffer; one call, `history_plus_stream()`,
> snapshots history *and* subscribes *atomically* and returns `history.chain(live)` — so
> a late-joining UI (or external orchestrator) sees the full run so far, then live tail,
> with **no "what did I miss between snapshot and subscribe" race**. Persistence is *just
> another subscriber* to the same fan-out, so the observe API is identical whether the run
> is live or finished. This is the directly-stealable answer to v3's "drive/observe an
> instance from outside" requirement — adopt it verbatim, but fix its one defect (the
> stream envelope is untyped, hand-mirrored in TS).

> **3. "Channel" is overloaded — Vibe Kanban proves there are two distinct channel
> CLASSES.** Hermes channels are *message sources* (normalize heterogeneous human-platform
> content into one `MessageEvent`, fuzzy-correlate). Vibe Kanban channels are *transport/
> access pipes* (the `relay-*` crates tunnel the entire opaque HTTP/WS API over WebRTC/WS
> so a remote browser drives a localhost instance; the relay parses nothing, correlates by
> **exact transport-id `host_id` in the URL**, and authenticates the *channel* not the
> *message*). v3's L8/L9 should name these as two classes with different correlation
> oracles, and borrow Vibe Kanban's **SPAKE2-pairing + Ed25519 signed-request** trust kit
> for the channel-establishment seam regardless of class.

Kernel-spectrum placement (now six projects):

```
symphony (no L0a) ──── hermes ──── VIBE-KANBAN ──── paperclip ──────── DBOS
```

The synthesis line for the series so far:

> **v3 = DBOS's kernel discipline + paperclip's control-plane mechanics + Hermes's
> outer-layer breadth (channels/memory/skills) + Vibe Kanban's observe-seam (`MsgStore`),
> human-review UX, and git-anchored checkpoints — with the audit ledger, the credential
> broker, the result-correlation/fan-in, and the fuzzy-correlation layer that none of the
> six got fully right.**

The single most-repeated gap, now a **3-of-4 verdict**: human decisions are ephemeral.
symphony (in the ticket, unaudited), hermes (in-memory + config, unaudited), **vibe-kanban
(in-memory DashMap + analytics-only "audit", unaudited)** — only paperclip wrote a durable,
attributed `issue_execution_decisions` row. v3's L3 must make the audited decision record a
kernel primitive.

---

## Second-Pass Audit Deltas

The ten-lens second pass did **not** overturn the core verdicts above. It did add several
precision points that matter for v3 design:

1. **Lifecycle is more nuanced than "failed or completed."** `ExecutionProcessStatus`
   includes a distinct `Killed` state (`crates/db/src/models/execution_process.rs:43-47`).
   The older service-level orphan sweep marks abandoned rows `Failed`
   (`crates/services/src/services/container.rs:272-326`), but the local deployment startup
   path actively kills remaining running processes as `Killed`
   (`crates/local-deployment/src/container.rs:1603-1624`). Manual stop is a two-phase
   shutdown: mark completion, cancel, wait up to 5s, then force-kill the process group
   (`crates/local-deployment/src/container.rs:1405-1452`). v3 should keep these as separate
   terminal meanings: "the agent failed" and "the operator/runtime stopped it" are not the
   same fact.

2. **The follow-up queue is a UX queue, not durable scheduling.** Queued follow-ups live in
   an in-memory `DashMap`, one queued message per session
   (`crates/services/src/services/queued_message.rs:31-69`). The exit monitor consumes the
   queue only after a successful process, discards it after `Failed`/`Killed`, and then
   finalizes (`crates/local-deployment/src/container.rs:619-665`). This strengthens the L4
   warning: Vibe Kanban has a nice serialized follow-up UX, but v3 must not treat that as a
   scheduler primitive.

3. **Worktree ownership has a real single-process lock, but not a distributed lease.** The
   worktree manager serializes create/recreate by path with a global per-worktree
   `tokio::sync::Mutex` and rechecks under the lock
   (`crates/services/src/services/worktree_manager.rs:15-107`). That is useful for a desktop
   local runtime, but it is not a cross-process or cross-node claim. v3's runtime handle
   model needs a durable lease/CAS if multiple controllers can touch the same workspace.

4. **The live entity streams have a second useful pattern besides `MsgStore`: snapshot,
   `Ready`, then patches.** The event stream builds an initial JSON-Patch snapshot, emits
   `LogMsg::Ready`, then switches to live patches
   (`crates/services/src/services/events/streams.rs:40-141,176-222,246-314`). The frontend
   treats `Ready` and clean `finished` as protocol markers, reconnecting only on unexpected
   close. v3 should copy the explicit "initial state is complete now" marker, not leave
   clients to infer readiness from timing.

5. **Vibe Kanban has no global event cursor.** JSON-Patch streams are excellent for current
   observers, but there is no durable monotonic event sequence/resume cursor for entity
   streams. Slow clients either reconnect and resnapshot or, for raw logs, rely on the
   bounded `MsgStore`/persisted-log path. v3's observe seam should combine Vibe Kanban's
   snapshot-plus-tail ergonomics with an operation-log cursor when the event matters to the
   kernel.

6. **Approval identity is weaker than the DTO suggests.** `ApprovalResponse` carries an
   `execution_process_id` (`crates/utils/src/approvals.rs:74-77`), and the route forwards
   the whole body (`crates/server/src/routes/approvals.rs:24-40`), but
   `Approvals::respond` resolves by approval id and removes the pending waiter from the
   map (`crates/services/src/services/approvals.rs:143-166`). The response's process id is
   useful telemetry context, not the authority check. v3 should bind approval response
   authority to `(approval_id, process_id, actor_id)` in the durable decision row.

7. **Operator observability is richer than the first summary emphasized.** The UI does not
   just show logs; it protects against stale log streams, replaces history on reconnect,
   virtualizes large logs, disables auto-scroll when the operator scrolls back, renders
   ANSI/stdout/stderr/URLs/search highlights, and streams diffs with large-content omit
   policy. The broader lesson is that v3's operator console needs explicit degraded states
   and size policy, not only a backend stream.

8. **The modularity picture is strong at provider boundaries and weak at shared/frontend
   ownership boundaries.** Good seams: `StandardCodingAgentExecutor`, explicit
   `BaseAgentCapability`, `GitHostProvider`, relay transport traits, and generated Rust→TS
   contracts (`crates/executors/src/executors/mod.rs:58-177`,
   `crates/git-host/src/lib.rs:19-54`). Weak seams: central provider matches multiply, Azure
   lacks `list_open_prs` support (`crates/git-host/src/azure/mod.rs:250-255`), the type
   generator hand-lists many internal modules, and the frontend `shared` area is a broad
   dependency sink. v3 should keep explicit provider capability matrices and avoid letting
   "shared" become the default architecture.

## L0a/L0b — Kernel & Data Model

**3-sentence verdict.** Vibe Kanban has **no durable-execution kernel** in the L0a sense:
no append-only operation log, no idempotency key, no `expected_version`/CAS, no
replay-based recovery — the durable substrate is a set of **mutable status rows** in
SQLite plus an append-mostly per-process row, reconciled at startup by a crude "mark all
`running` as `Failed`" sweep. It sits **between hermes and paperclip, below DBOS**: like
paperclip a mutable state row + a partial audit trail (per-process rows are append-mostly
and carry git commit boundaries), but unlike paperclip there is **no `FOR UPDATE`/CAS and
no optimistic concurrency** — safety rests entirely on SQLite's single-writer model. Its
one genuinely interesting idea is the **restore/masking model** (`dropped` flag + per-repo
`before/after_head_commit`), a git-anchored soft-delete checkpoint, **not** event-log replay.

### Entity graph & the run aggregate

The model was heavily refactored (`20251216142123_refactor_task_attempts_to_workspaces_sessions.sql:10-118`).
Current graph:

```
projects
  └─ tasks (status FSM; tasks.parent_workspace_id → subtask lineage)
       └─ workspaces        (ex-task_attempts: branch, base_branch, container_ref, archived)
            └─ sessions      (one-or-more per workspace; sessions.executor = the agent)
                 └─ execution_processes   (run_reason, executor_action JSON, status, dropped)
                      ├─ coding_agent_turns          (ex-executor_sessions: agent_session_id, prompt, summary)
                      ├─ execution_process_repo_states (before/after/merge commit OID, per repo)
                      └─ execution_process_logs       (JSONL blob)
       merges (workspace_id, pr tracking)   repos / workspace_repos (multi-repo workspaces)
```

The **"run" aggregate is split across three rows**, none self-contained: `workspace` = the
durable git artifact (branch + worktree); `session` = a conversation thread with one agent;
`execution_process` = **one OS process invocation** (the finest unit, carrying `status`).
There is no aggregate-root enforcing cross-row invariants — they are joined ad-hoc
(`execution_process.rs:514-554 load_context`). **There is no definition entity at all** —
the "definition" is the `executor_action` JSON blob embedded in each process row
(`execution_process.rs:66-67`). This is the opposite of v3's definition-vs-run aggregate split.

### Mutable rows vs event log; idempotency/concurrency; status FSM

**Mutable rows, no event log.** `execution_processes` is append-mostly for *creation* (one
row per process) but its `status`/`exit_code`/`completed_at` are mutated by a blind
unguarded UPDATE: `update_completion` (`execution_process.rs:443-453`) does `UPDATE … SET
status=?,… WHERE id=?` with **no WHERE-guard on current status, no version, no CAS**.
`tasks.status` is a single mutable cell; writes flow through an Electric SQL sync layer
(`20251202000000_migrate_to_electric.sql`) + a generic `scratch` key-value table — i.e.
last-writer-wins replicated rows, not an event log. `execution_process_logs` is the closest
thing to an append log but is a JSONL **blob per process** (agent output, not operations).

**Idempotency / concurrency: none.** A grep across `crates/` finds **no `op_id`, no
`expected_version`, no `FOR UPDATE`, no status-CAS**. Concurrency rests on SQLite's single
writer. The nearest guard is a racy read-then-write TOCTOU (`was_stopped()` →
`container.rs:542`), safe only because SQLite serializes. Re-running a turn mints a **new**
`execution_process` UUID with no dedup — there is no exactly-once. **This is the decisive
gap vs DBOS** (whose `(workflow_uuid, function_id)` PK *is* the exactly-once mechanism).

**Status FSM: typed enum, unguarded transitions.** `ExecutionProcessStatus { Running,
Completed, Failed, Killed }` is a typed Rust enum + a SQLite CHECK constraint
(`execution_process.rs:43-48`), but the enum only constrains the *value set*, not the
*transitions* — any status overwrites any other via the blind UPDATE. No guarded transition
function at DB or repository layer.

### Crash recovery & the restore/masking model

**Crash recovery = orphan sweep, not resume.** At startup (`server/src/startup.rs:160`),
`cleanup_orphan_executions` (`services/.../container.rs:272-326`) finds every
`status='running'` row and **marks it `Failed`**, then best-effort captures the current git
HEAD per repo into `after_head_commit`. **There is no resume** — an interrupted agent turn
is declared failed; the user starts a follow-up. This is hermes-grade ("crash abandons the
turn"), worse than DBOS/paperclip which resume mid-workflow.

**Restore/masking = git-reset + soft-delete, not replay.** `reset_session_to_process`
(`container.rs:632-705`): look up the target's per-repo `before_head_commit` →
**`git reset` the worktree** to that OID → stop running processes → **soft-delete** every
process at/after the boundary via `drop_at_and_after` (`UPDATE … SET dropped=TRUE WHERE
created_at >= boundary`). The `dropped` flag (migration filename says "masked_by_restore",
actual column `dropped`) hides masked processes from the timeline while keeping them
queryable. **Characterization:** a checkpoint/undo built from (a) git as the real
system-of-record for code state and (b) a soft-delete tombstone on process rows. Durable and
principled *for the git artifact*, but **not event-sourced** — you cannot reconstruct
intermediate state by replay, only git-reset to stored commit boundaries and hide later rows.

### L0b actors — absent

**No first-class actor/author model.** No `created_by`/`actor_id`/`author`/`user_id` on
projects, tasks, workspaces, sessions, or execution_processes (grep-confirmed). "Who is
acting" is implicit and structural: a human acts by mutating rows through the API; the agent
identity is captured only as `sessions.executor` (a string) + the external
`coding_agent_turns.agent_session_id`. **No typed context-packet** — the closest analogue is
the `executor_action` JSON (the *command* to run, not a role→actor binding).

### LEARN / AVOID / ORTHOGONAL (L0a/L0b)

**LEARN**
- **Git-anchored checkpoints.** Storing `before/after_head_commit`/`merge_commit` per-repo
  per-process (`execution_process_repo_state.rs:8-19`) gives every execution a verifiable,
  externally-durable boundary. v3 can anchor each turn's effect to a content-addressed commit
  so "what did this turn change" is answerable and reset-able **independent of the event log**.
  Restore-as-`git reset`-to-stored-OID is robust precisely because the real artifact lives
  outside the DB.
- **Soft-delete tombstone for undo instead of physical delete** (`dropped` + `drop_at_and_after`):
  later operations are hidden, not destroyed, so history stays auditable. v3's Transcript
  masking/branching should use the same hide-don't-delete discipline.
- **Run-reason as a typed dimension** (`SetupScript/CodingAgent/DevServer/CleanupScript`) cleanly
  separates lifecycle phases of a run — useful turn/phase taxonomy.

**AVOID**
- **Blind status UPDATEs with no guard** (`update_completion`) — adopt v3's `expected_version` CAS
  so transitions are atomic + idempotent. The `was_stopped` read-then-write is a TOCTOU that only
  survives because SQLite has one writer; it will not survive a multi-writer/distributed kernel.
- **Crash recovery = mark-failed, never resume** — exactly the durability gap v3's replay-from-log
  eliminates. Do not ship a kernel whose only recovery is "abandon in-flight work."
- **No idempotency key / no dedup on retry** — re-issuing an op mints a fresh UUID; exactly-once is
  impossible. v3 must key the op-log on `(instance_id, op_id)` from day one.
- **Run aggregate smeared across workspace/session/execution_process with ad-hoc joins** and no
  aggregate root — invariants can't be enforced in one place.
- **Mutable status cell as system-of-record** replicated last-writer-wins via Electric — no operation
  history, drift resolved by overwrite.

**ORTHOGONAL** — the Electric/scratch client-replication sync layer; multi-repo workspaces; PR/merge
tracking (GitHub integration).

---

## L0c — Executors & Actor Adapters

**3-sentence verdict.** Vibe Kanban's executor layer is a **subprocess-orchestration
ActorAdapter registry**: a single `StandardCodingAgentExecutor` trait
(`crates/executors/src/executors/mod.rs:220-302`) with ~10 concrete adapters dispatched via
`enum_dispatch` over a `CodingAgent` enum, where each adapter translates a portable config
into a *spawned CLI process* and normalizes that process's heterogeneous stdout into one
shared `NormalizedEntry` stream. Unlike paperclip (opaque session codec) or hermes
(transparent host-owned message list), Vibe Kanban owns **neither the conversation bytes nor
a neutral message format as source of truth** — the agent CLIs own their own conversation
state on disk, and Vibe Kanban persists only a *foreign session-id pointer*
(`agent_session_id`) plus a derived, display-oriented normalized log. It is an **"own the
launch + the pointer + a projected view" model**, the richest L0c in the series precisely
because it must wrap 10 incompatible *stateful subprocess protocols* (raw CLI flags, JSON-RPC
app-servers, and ACP) behind one trait.

### The executor trait + ExecutorAction (run-intent)

**Trait** `StandardCodingAgentExecutor` (`executors/mod.rs:220-302`): the minimum is `spawn`,
`spawn_follow_up`, `default_mcp_config_path`; everything else has defaults. Dispatch is
zero-cost `#[enum_dispatch(CodingAgent)]` — adding an agent = a new enum variant + trait impl.
`spawn` returns a `SpawnedChild { child, exit_signal, cancel }` — the adapter's deliverable is
**a live OS process** plus cancellation channels, not a stream of messages.

**`ExecutorAction` — the portable run-intent (the AgentConfig-equivalent).** A recursive linked
list `{ typ: ExecutorActionType, next_action: Option<Box<ExecutorAction>> }`
(`actions/mod.rs:35-39`); `ExecutorActionType` is a 4-variant tagged union
(`CodingAgentInitialRequest | CodingAgentFollowUpRequest | ScriptRequest | ReviewRequest`). The
`next_action` chain is **a workflow primitive baked into the run-intent** — "run agent, then run
cleanup script" is one serialized action with a chained tail. The config payload `ExecutorConfig`
(`profile.rs:124-144`) is **executor-neutral** (`{executor, variant, model_id, agent_id,
reasoning_id, permission_policy}`); each adapter's `apply_overrides` projects neutral fields into
native flags (ClaudeCode `permission_policy: Plan → --plan`; Codex `reasoning_id → ReasoningEffort`).
**Persistence:** stored as one JSON TEXT column on `execution_processes`, with a SQLite *generated
virtual column* `executor_action_type` for indexing — fully serialized, self-contained, and
replayable from the DB. This is genuinely a portable run-intent.

### Session resume / portability

A **transparent foreign-session-id pointer**, distinct from both prior models. The host stores
only an opaque per-agent session-id string (`coding_agent_turns.agent_session_id`), **never the
conversation**. Capture is *via the log stream*: each adapter sniffs the session-id out of the
agent's own output and pushes `LogMsg::SessionId(...)` onto the shared `MsgStore` (Claude
`claude.rs:813`; Codex `codex/normalize_logs.rs:1298`; ACP `acp/normalize_logs.rs:71`); the host
writes it to the DB. Replay is the adapter's job using its native mechanism: Claude → `--resume
<id>` (+ `--resume-session-at <uuid>` to rewind); Codex → JSON-RPC `thread_fork` (forks, not
mutates); Gemini/Qwen → ACP session resume.

**Comparison:** paperclip = host persists/replays opaque adapter session *bytes* (movable anywhere);
hermes = host owns a transparent neutral `messages[]` *and is source of truth*. **Vibe Kanban is a
third way: the host owns neither bytes nor messages — it owns a foreign-key pointer into state the
agent CLI persists on its own disk** (`~/.claude.json`, `~/.codex`, …). *Less* portable than
paperclip (a session can't move machines — it's anchored to the agent's local store) and *less*
host-authoritative than hermes (the normalized log is a derived projection, never replayed back into
the agent). Closest to **a thin "session handle registry"** — conversation durability is delegated to
each agent.

### Output normalization

The uniform internal type is **`NormalizedEntry`** (`logs/mod.rs:114-121`): `{timestamp, entry_type:
NormalizedEntryType, content, metadata}`. `NormalizedEntryType` is a closed vocabulary
(`UserMessage|AssistantMessage|Thinking|ToolUse{tool_name, action_type, status}|SystemMessage|
ErrorMessage|TokenUsageInfo|...`); tool calls normalize into a structured `ActionType` enum
(`FileRead|FileEdit{changes}|CommandRun|Search|WebFetch|Tool|TaskCreate|PlanPresentation|...`); diffs
are first-class (`FileChange::Edit{unified_diff}`). Each adapter ships its **own bespoke projector**
into this shared vocabulary, emitting JSON-Patch deltas. Claude's `ClaudeLogProcessor` line-buffers
`--output-format=stream-json` NDJSON and maintains a `tool_map: HashMap<tool_use_id, …>` to
retroactively pair a `ToolResult` back to its tool entry; Codex has an entirely separate ~2400-line
normalizer emitting the *same* types. So heterogeneous output converges because **there is no neutral
wire format, only a neutral internal one** — and the projection target is a *display/audit log*, not
the resumable conversation.

### LEARN / AVOID / ORTHOGONAL (L0c)

**LEARN**
- **`ExecutorAction` as a serialized, recursive, replayable run-intent in one DB column.** The
  `{typ, next_action}` linked list folds a mini-workflow (agent → script → review) into the persisted
  intent, with a generated virtual column for type-indexing. A single self-contained JSON blob that
  fully reconstructs "what to run" is exactly the L0c AgentConfig primitive — and chaining
  `next_action` is a cheap workflow seam worth stealing.
- **Neutral overrides + per-adapter `apply_overrides` projection** — `{model_id, reasoning_id,
  permission_policy}` neutral, each adapter translates to native flags. Keeps the workflow step portable
  while letting adapters own their CLI surface. The 3-value `PermissionPolicy` (Auto/Supervised/Plan) as
  a cross-agent knob is a clean abstraction.
- **Session-id captured from the output stream, not the spawn return** (`LogMsg::SessionId` on a shared
  store) — robust for subprocess agents where the id only appears mid-stream.
- **MCP injection as canonical-list → per-dialect adapter transforms** (`mcp_config.rs:240-412`), with a
  comment-preserving CST merge — directly reusable if v3 injects its own tool server into heterogeneous
  agents.
- **The closed `NormalizedEntry`/`ActionType` vocabulary** with diffs/tool-calls/thinking/token-usage as
  first-class variants, streamed as JSON-Patch deltas.

**AVOID**
- **Resume anchored to the agent's local on-disk state** — a session can't migrate hosts. A hard
  portability ceiling for a *distributed* kernel; paperclip's opaque-codec (host owns the bytes) is the
  better primitive for v3.
- **The normalized log is derived/display-only, never replayed** — Vibe Kanban can render history but
  cannot reconstruct an agent conversation from its own store. If v3 wants host-authoritative replay,
  don't copy this one-way projection.
- **Per-adapter bespoke normalizers are huge and duplicative** (claude ~3300 lines, codex ~2400). The
  shared *target* type is good; the per-agent hand-written projectors are an O(agent) maintenance tax.
- **`enum_dispatch` over a closed enum** — adapters are compiled-in, not runtime-pluggable; wrong for a
  kernel that wants third-party adapters.

**ORTHOGONAL** — the entire layer assumes subprocess CLI agents (spawn + pump stdin/stdout protocol),
not LLM-API actors; the `SpawnedChild`/cancellation machinery, live model/agent discovery, and
availability/auth detection are CLI-wrapping concerns orthogonal to a kernel that treats actors as
logical addresses.

---

## L0e — Workspace & Runtime Context

**3-sentence verdict.** Vibe Kanban's runtime context is **git-worktree-centric, not
container-centric**: every workspace is a host-local directory under
`~/.vibe-kanban/worktrees/{id}/` holding one git worktree per project repo, and "execution"
means spawning OS child processes with `current_dir` set into that worktree — there is no
sandbox, no container image, no isolation beyond the filesystem path and the git branch. The
single provider seam is the `Deployment` trait (`crates/deployment/src/lib.rs:79`) whose
`container()` returns a `ContainerService` (`services/.../container.rs:88`), but the only
realized impl is `LocalContainerService` — the "container" vocabulary (including the
`worktree_path → container_ref` rename) is **aspirational abstraction for a future remote/
container backend that does not exist in this tree**. Remoteness is bolted on orthogonally as a
relay/tunnel layer (embedded SSH-over-WebSocket + a preview HTTP proxy), letting a *cloud UI*
reach a *locally-running* workspace, rather than relocating execution to a remote host.

### The provider abstraction
- **`Deployment` trait** (`deployment/src/lib.rs:79-158`): the DI seam — `container()`, `git()`,
  `repo()`, `preview_proxy()`, `remote_client()` (defaults to `RemoteClientNotConfigured`). Generic
  over `Self`, so a second impl is structurally possible, but the repo ships exactly one.
- **`ContainerService` trait** (`container.rs:88-193`): the real L0e interface — `create(&workspace)
  -> ContainerRef`, `delete`, `ensure_container_exists`, `workspace_to_current_dir -> PathBuf`.
  **`pub type ContainerRef = String`** — the "container reference" is literally a stringly-typed path.
  Only impl: `LocalContainerService`. **No multi-backend dispatch** (unlike hermes's `BaseEnvironment`
  ABC with six subclasses) — the provider is a single-impl trait kept generic "just in case."

### Worktree lifecycle + container_ref + cleanup
`container_ref` = the workspace directory path. `WorkspaceManager::create_workspace` makes the dir +
one git worktree per repo. The migration `20250726182144_update_worktree_path_to_container_ref.sql`
abstracts the column name so the same field could later hold a container ID — but today always holds a
worktree path. Lifecycle: create → `copy_files_and_images` (glob `.env`/secrets git won't carry into
the worktree) → synthesize a root `CLAUDE.md`/`AGENTS.md` that `@`-imports each repo's config → **setup
script** as an `ExecutionProcess(run_reason=SetupScript)` → **coding agent** child cwd'd into the
worktree → optional **dev server** → on finalize, `try_commit_changes` auto-commits → **cleanup script**.
`ensure_container_exists` is the idempotent cold-restart path. Race safety via a per-path `tokio::Mutex`
from a global `WORKTREE_CREATION_LOCKS` map. **Two-tier cleanup:** orphan (startup — on-disk dirs not in
the DB via `container_ref_exists`) + expired (periodic, 30-min loop via `find_expired_for_cleanup`), both
`DISABLE_WORKTREE_CLEANUP`-gated; teardown = `git worktree remove --force` → delete metadata → `prune`.

### Dev server / preview / terminal
- **Dev server = just another execution process** (`run_reason=DevServer`), never finalized/auto-committed,
  killed on teardown.
- **Preview proxy** (`preview-proxy/src/lib.rs`) — a subdomain-routed reverse proxy on a second port that
  forwards `{port}.localhost:{proxy_port}` → `localhost:{port}`, **strips framing headers** (CSP,
  `x-frame-options`) so the dev server renders in the UI iframe, and **injects DevTools scripts** (console/
  network capture, React-fiber `bippy`, click-to-component, Eruda). HMR WS upgrades bridged.
- **Terminal = host PTY** (`portable_pty`), no isolation.

### Remote execution (embedded-ssh) — a tunnel, not a backend
`embedded_ssh::run_ssh_session` is an SSH server over WebSocket that authenticates **public keys against
relay-signing sessions** (not OS users) and spawns the host `$SHELL`. It is **remote *access* to a local
environment**, not remote *execution* — execution still happens locally in the local worktree. Contrast
hermes, where SSH/Docker/Modal/Daytona are genuine *execution* backends.

### LEARN / AVOID / ORTHOGONAL (L0e)

**LEARN**
- **`container_ref: String` as a deliberately opaque runtime handle** — v3's L0e should store an opaque
  provider-issued handle (path *or* container ID *or* sandbox URL) and never assume its shape. The
  `worktree_path → container_ref` rename is the right instinct even though they never shipped the second
  backend.
- **Scripts-as-execution-processes, not special lifecycle hooks** — setup/cleanup/dev are the *same*
  primitive as the agent run (an `ExecutionProcess` + `run_reason`), differing only by metadata and a
  `should_finalize`/`next_action` policy. Collapses environment provisioning and agent work into one
  uniform execution model — clean for a kernel.
- **Two-tier cleanup (DB-vs-disk orphan reconciliation + TTL expiry)** + the per-path mutex map for
  create/cleanup race safety — concrete patterns to copy. v3 needs both crash-recovery reconciliation
  (disk has it, DB doesn't → orphan) and idle reclamation.
- **`ensure_*` idempotent re-provisioning** — the kernel can always call "ensure" and get a valid runtime
  context or a recreated one.
- **Preview proxy with header-stripping + script injection** — a complete reusable design if v3 wants
  in-UI dev-server preview.

**AVOID**
- **Single-impl "generic" trait that pretends to be pluggable** — the `Deployment`/`ContainerService`
  generics imply multiple backends but only `Local` exists, so the seams leak (`ContainerRef = String`
  assumes a path; `workspace_to_current_dir → PathBuf`). Design a multi-backend trait against ≥2 real
  impls so path-vs-handle leakage is caught early.
- **No real isolation** — bare host processes in a directory; a malicious agent has full host access.
  Keep the worktree idea but make the L0e provider able to wrap it in a sandbox.
- **Conflating "remote" with "tunnel to local"** — embedded-ssh/relay is remote *access*, not remote
  *execution*. Keep these as separate concerns.

**ORTHOGONAL (vs hermes)** — **no hibernate/wake, no FileSyncManager** because execution is always local
and durable on the host FS. Two genuinely different L0e archetypes: local-worktree (Vibe Kanban — needs
*none* of hermes's hibernate complexity) vs remote-sandbox (hermes — must build it). **Multi-repo
workspace** (N worktrees in one dir + synthesized `@import` root config) is a dimension worth lifting if
v3 tasks span repos.

---

## L3 + Human-UX — Board, Review & Approval

**3-sentence verdict.** Vibe Kanban's human-orchestration model is a **workspace-centric
IDE-in-the-browser**, not a decision-audit system: the kanban board is a lightweight planning
surface, but the real human-in-the-loop happens inside a *workspace* (diff viewer + chat + live
log stream) where a human reviews diffs, drops inline comments, and converses with the agent. Its
standout feature — inline diff review — is implemented **entirely as ephemeral client-side React
state** serialized into a single chat message and then discarded; there is no durable review
record. Approvals (mid-run permission gates) are likewise **in-memory only** (a `DashMap` of
`oneshot` channels), with the *only* persistence being a fire-and-forget analytics event and the
agent's own log line — so on the v3 axis, Vibe Kanban's human decisions are **NOT durably audited**,
placing it alongside symphony/hermes, not paperclip.

### The board / task-status model

Two parallel models. **Local OSS kanban** (`crates/db`): a hardcoded enum `TaskStatus { Todo,
InProgress, InReview, Done, Cancelled }` (`task.rs:14-21`), CHECK-enforced. Notably the `Task` model
exposes **only `find_all`/`find_by_id`** — **no `update`/`set_status` method, no `tasks.rs` route** —
and nothing in `services` auto-transitions a task on agent execution. The local board status is inert
metadata. **Cloud/remote "issues"** (`crates/remote`): the active board — status is *project-
configurable* (columns built from `ProjectContext.statuses`), **human-set by drag-and-drop**
(`KanbanContainer.tsx:658` → `bulkUpdateIssues`), backed by a partitioned `activity` event feed with a
`pg_notify` trigger. **Answer:** status is human-driven; agent execution does **not** move cards in the
OSS path; the cloud board is decoupled from the run.

### The review flow (diffs → inline comments → agent feedback) — the standout feature

The most surprising finding: **the inline-review feature has no backend at all.** It is purely a
frontend-state-to-prompt transform. A `ReviewComment {filePath, lineNumber, side, text, codeLine}`
(`useReview.ts:5-12`) lives only in React Context — **no API call, no localStorage, no DB row**. On send,
`generateReviewMarkdown` (`ReviewProvider.tsx:59-88`) renders the array into one markdown block (`**file**
(Line N)\n> text`), prepends it to the user's chat message, and sends it as a *normal* follow-up prompt;
then `clearComments()` **wipes the array**. The docs confirm this is intentional ("Comments are consumed
when you send a message"). The only trace is the resulting message in the agent log. **Naming trap:** the
`crates/review` crate + `reviews` table are a *completely different* hosted product (point Claude at a
GitHub PR URL for an AI review), unrelated to the inline workspace review.

### Approvals (mid-run human gate) — durability/audit

When an agent's tool needs permission, `Approvals::create_with_waiter` (`services/.../approvals.rs:86`)
inserts a `PendingApproval` (holding a `oneshot::Sender`) into an in-memory `DashMap`, broadcasts a
json-patch to the frontend WS, and spawns a 10-hour timeout. The human responds via
`POST /approvals/{id}/respond`; `respond` fires the `oneshot` to unblock the waiting executor. For Claude
Code this maps onto the native permission-prompt protocol via `--permission-prompt-tool=stdio` + PreToolUse
hooks (`claude.rs:166-252`).

**Durability/audit verdict — NOT audited.** The approval lives in `DashMap` + `oneshot` channels;
**zero DB write** (grep-confirmed). The only "record" is a **fire-and-forget analytics event**
`approval_responded` (`routes/approvals.rs:30-40`) — telemetry, no actor identity, not a queryable row.
The decision's *effect* is replayable (rendered into the agent log as a `ToolStatus`), but the decision
*record itself* (who/when/why) is not.

| System | Decision record | Audited (actor + timestamp)? |
|---|---|---|
| symphony | in the ticket UI | ❌ |
| **vibe-kanban** | **in-memory DashMap; analytics event + agent log line** | ❌ (no actor, no row) |
| hermes | in-memory + config file (fail-closed gate) | ❌ |
| paperclip | transactional `issue_execution_decisions` row | ✅ |

Vibe Kanban is architecturally closest to symphony/hermes — arguably *weaker* than hermes (which has a
fail-closed layered policy), since it defaults `approvals = false` (`claude.rs:162`) and supports
`--dangerously-skip-permissions`.

### Human steering (interrupt / follow-up / redirect)

Steering is through the **conversational session**, not the board: the primary verb is `followUp(sessionId,
{prompt, executor_config, retry_process_id, force_when_dirty, perform_git_reset})` — send another message
into the running session (optionally with inline review comments attached). The human can **swap the
executor mid-task** (`executor_config` re-resolved per send), **queue messages** while the agent is busy
(`routes/sessions/queue.rs`), and **re-run / git-reset** as part of redirecting. Live observation (so the
human knows when to intervene) is via WebSocket json-patch streams for process state + raw logs + approvals.
The board is the *plan*; the workspace stream is the *cockpit*.

### LEARN / AVOID / ORTHOGONAL (L3 + Human-UX)

**LEARN**
- **The inline-diff-comment → single-prompt pattern is a genuinely good human-feedback UX**: collect N
  spatially-anchored comments, batch them into one structured markdown block, send as one agent turn. v3
  should adopt the *shape* (anchored, batched, structured) — but back it with a durable record.
- **Approval as a blocking `oneshot` waiter + generous timeout + json-patch live broadcast** is a clean
  "agent pauses, human resolves, agent resumes" primitive. The `Pending → Approved/Denied/Answered/TimedOut`
  outcome enum — including a *question* variant (multi-answer, not just yes/no) — is a richer L3 vocabulary
  than a boolean gate.
- **Render the decision's effect into the replayable agent log** so the transcript shows "tool denied
  (reason)" — good for human re-reading (in addition to a structured record).
- **Configurable, drag-set board columns** decouple the board taxonomy from the engine — the human's
  planning vocabulary is theirs, not the kernel's.

**AVOID**
- **The core anti-pattern (same as symphony/hermes): human decisions are ephemeral.** Both review comments
  (cleared on send) and approvals (in-memory, no DB write) vanish. v3's L3 must make the decision a durable,
  queryable, attributed row (paperclip's model) — actor, timestamp, recommendation, override, reason.
- **Don't conflate a telemetry event with an audit record** — Vibe Kanban's `approval_responded` analytics
  call *looks* like audit but is fire-and-forget and unqueryable.
- **Don't let the board status be a dead enum** — the local `Task` has no setter and no transition code; if
  the board is meant to reflect agent progress, the lifecycle must actually drive it.
- **Default-open permissions + `--dangerously-skip-permissions`** — v3's gate should be fail-closed by policy.

**ORTHOGONAL** — the IDE-in-browser workspace (diff viewer, file tree, embedded preview) is product UX; the
`crates/review` GitHub-PR-AI-reviewer is a separate product; multiplayer cloud sync (Electric SQL, the
partitioned `activity` feed, `pg_notify`) is cloud infra — **though the *idea* of a single append-only
`activity` event log is worth stealing as the substrate for a unified human-decision log, the one thing Vibe
Kanban built but didn't point at approvals/reviews.**

---

## L8/L9 — Channels, Remote Access & Relay

**3-sentence verdict.** Vibe Kanban's relay is **not a message-channel abstraction at all — it is a
remote-access transport fabric that tunnels the *entire* local HTTP/WebSocket API over the internet** so a
phone or cloud browser can drive a localhost instance as if it were local. The "channel" is a
**yamux-multiplexed HTTP-proxy pipe** (`relay-tunnel-core`) with an optional **WebRTC P2P data-channel
fast-path** (`relay-webrtc`) that transparently upgrades from the WS relay fallback — carrying opaque framed
bytes, never parsing semantic messages. This is the polar opposite of hermes's channel model: hermes adapts
*N human messaging platforms* into one normalized `MessageEvent`; Vibe Kanban's channel is a *dumb byte
tunnel* that deliberately understands nothing — correlation is by **transport identity (`host_id`), not
message content**.

### The relay architecture — crate roles + topology

An *inverted* tunnel: the *local* instance dials *out* to the relay (NAT-friendly), the relay holds the open
control channel, and remote clients reach the local instance by hitting the relay.

```
[Local VK instance :localhost]              [Cloud Relay Server]            [Remote browser]
 relay-client (dial out, Bearer JWT) ──WS──▶ relay-tunnel (server)  ◀──HTTP── /relay/h/{host_id}/s/{sid}/...
  relay-tunnel-core::client                   RelayRegistry: HashMap<Uuid host_id, ActiveRelay>
   (yamux server, proxy_to_local) ◀─yamux── relay-tunnel-core::server (proxy_request_over_control)
```

Crate roles: **`relay-protocol`** (149 LOC) = the wire envelope `RelayWsFrame {msg_type, payload}` + a
`RelayTransportMessage` trait normalizing native WS messages across axum & tungstenite (transport plumbing,
not semantics). **`relay-tunnel-core`** = the tunnel: client establishes a **yamux session over the WS** and
proxies each inbound stream to `localhost` via a fresh HTTP/1 connection (`x-vk-relayed: 1` header); server
opens a yamux stream per remote request. **`relay-tunnel`** (1177 LOC) = the relay server binary (the
`RelayRegistry` `HashMap<Uuid host_id, …>`, routes, DB, edge auth). **`relay-hosts`** (971 LOC) = host-side
transport selector (tries WebRTC first, falls back to relay). **`relay-webrtc`** (1894 LOC) = P2P data-channel
+ signaling + HTTP-over-datachannel + SCTP fragmentation. **`relay-ws`** = an Ed25519-**signed** WS layer
(replay-protected). **`ws-bridge`** = turns an axum/tungstenite WS into `AsyncRead+AsyncWrite` for yamux.
**`remote`** (24K LOC) = the cloud SaaS backend (OAuth/JWT, billing, Electric-SQL reactive sync, host
registry); the relay server deploys alongside it — `remote` is the control plane, `relay-*` the data plane.

### Transport abstraction + normalized frame — WS vs WebRTC

Two parallel transports behind one host-side facade (`relay-hosts`), WebRTC as a transparent upgrade over a
WS baseline. **Baseline (WS relay tunnel):** HTTP request → yamux stream over the signed WS → proxied to
localhost. **Fast path (WebRTC P2P):** direct browser↔host data channel, bypassing the relay; negotiated in
the background after the first relay request, cached per host with a `Connecting/Connected/Failed(cooldown)`
state machine, fail-open fallback to relay. **The two transports do NOT share one frame type** — WS uses
`RelayWsFrame`; WebRTC re-implements HTTP-over-datachannel as a separate `DataChannelMessage` tagged enum
(`HttpRequest/HttpResponse` with `body_b64`) plus a hand-rolled SCTP fragmenter (64KB cap → 60KB chunks).
**Why both:** WS-over-relay is the universal firewall-friendly path; WebRTC buys direct P2P with NAT traversal
to drop the relay from the hot path.

### Correlation & addressing (L9) + auth/trust

**Correlation by transport identity, in the URL path:** `/relay/h/{host_id}/s/{browser_session_id}/{*tail}`.
The handler extracts `host_id`, looks it up in `RelayRegistry.get(&host_id)`, proxies over that host's live
yamux control channel. `host_id` is minted by **upserting on `(owner_user_id, machine_id)`** when the host
dials in — identity is `user × machine`, durable across reconnects. **A deterministic exact-match correlation
oracle** (host_id is the key), unlike hermes's *fuzzy* `build_session_key()`.

**Channel-establishment trust — two distinct models.** (1) **Cloud-relay edge auth**: host control channel =
Bearer **JWT**; remote client = a `relay_browser_sessions` DB row gating access (non-revoked, host_id matches,
user owns the host or is in its org). (2) **Direct-trust pairing (`trusted-key-auth`)**: a **SPAKE2 PAKE**
handshake bootstrapped by a 6-char one-time enrollment code; on success the browser's **Ed25519 public key is
persisted to a local trusted-keys file**, and thereafter every request is **Ed25519-signed with timestamp +
nonce** (±30s drift, replay-nonce rejection). A clean **password-authenticated pairing → key-grant →
per-request-signature** model that does *not* depend on the cloud — the relay can be a blind byte-mover while
browser and host authenticate end-to-end.

### LEARN / AVOID / ORTHOGONAL (L8/L9)

**The headline contrast with hermes:** two *legitimately different* meanings of "channel." Hermes channel = a
**message source** (adapter per platform; the app consumes normalized *content*; fuzzy message-key correlation).
Vibe Kanban channel = a **transport pipe** (carries the whole opaque API; the relay consumes *nothing*, routes
bytes by `host_id`; exact transport-id correlation). **v3's L8/L9 should name these as two channel CLASSES with
different correlation oracles.**

**LEARN**
- **The "tunnel the whole API" pattern as a distinct L8 mode** — "remote access to a running instance" is a
  different channel class than "ingest an external message." If v3 needs operators to reach a running kernel
  instance remotely, this dial-out + registry + yamux pattern is the reference.
- **Inverted dial-out + in-memory registry keyed by durable identity** (`upsert(user, machine)` so it survives
  reconnects) — a clean correlation primitive: deterministic exact-match, no fuzzy logic when the channel *is*
  the identity.
- **SPAKE2 pairing → Ed25519 trusted-key → per-request signature** as a self-contained E2E trust kit
  independent of the relay — exactly the "pairing/grant" model v3's L7 wants, and it makes the channel itself
  untrusted-by-design. Replay defense (nonce + drift window) is textbook.
- **Transparent transport upgrade with fail-open fallback** — always-works baseline + opportunistic fast path
  negotiated in the background, cached with a cooldown state machine.

**AVOID**
- **HTTP-over-datachannel re-implemented per transport** — two encodings of "an HTTP request as bytes" (WS
  `RelayWsFrame` vs WebRTC `DataChannelMessage` + hand-rolled fragmenter). v3 should define **one normalized
  frame** and make every transport a thin adapter to it (which is what `relay-protocol`'s trait *almost* is —
  but WebRTC doesn't use it).
- **Two parallel auth universes** (cloud JWT+DB sessions vs local SPAKE2 trusted-keys) — powerful but
  cognitively heavy. Pick one trust spine and treat the other as a derived credential.
- **In-memory-only registry** (`HashMap` in process) — single relay node, no horizontal scale/failover for the
  routing table.

**ORTHOGONAL** — the WebRTC/STUN/yamux/SCTP machinery is infra plumbing irrelevant to a workflow kernel; treat
this study as the boundary case that proves "channel" is overloaded.

---

## L9 + API Seam — Server, Live Streaming & Typed Boundary

**3-sentence verdict.** Vibe Kanban's run-observation architecture is a **per-execution in-memory pub-sub
buffer (`MsgStore`) fronting a `tokio::broadcast` channel**, where every observable thing — agent stdout/
stderr, normalized log entries, diffs, even global entity-state changes — is reduced to a single `LogMsg` enum
and pushed into a store that gives every subscriber **"replay history from the start, then tail live"** via one
`history_plus_stream()` call. Transport is **WebSocket for per-run streams and SSE for the global event bus**;
the wire frame is the raw serialized `LogMsg`, and the incremental UI-state protocol is **RFC-6902 JSON Patch**
applied client-side with Immer. The typed Rust→TS boundary is real but **manually curated** (ts-rs `decl()`
calls hand-listed in a generator binary) and notably **does NOT cover the streaming envelope** — only the
structured payloads are typed, while the `LogMsg` transport frame is hand-mirrored in TS.

### The event bus / MsgStore (buffer-replay-then-tail) — the key pattern

`MsgStore` (`crates/utils/src/msg_store.rs`) is the whole mechanism. **Structure** (`:21-29`): a
`RwLock<Inner>` holding a byte-bounded `VecDeque<StoredMsg>` history **plus** a `broadcast::Sender<LogMsg>` —
durable replay buffer + live fan-out. **`push()`** (`:49-63`) sends to the broadcast channel for live listeners
*first*, then appends to history, evicting from the front past `HISTORY_BYTES` (100 MB). **`history_plus_stream()`**
(`:101-121`) is the crux: it snapshots `get_history()` and `get_receiver()` (a fresh `broadcast::subscribe()`)
**together**, then returns `hist.chain(live)` — a UI connecting mid-run sees the whole run so far, then live
tail, from a single call, with **no snapshot-vs-subscribe race**. Lagged slow subscribers are dropped-with-log
rather than blocking producers. The envelope `LogMsg` (`log_msg.rs:13-22`) = `Stdout | Stderr | JsonPatch |
SessionId | MessageId | Ready | Finished`, the same enum for broadcast payload, history element, AND wire frame
(it renders itself as SSE `Event` and WS `Message`); `Finished` is the in-band terminator. Keyed per-run:
`msg_stores: HashMap<Uuid, Arc<MsgStore>>` (one per execution_process).

**Persist-AND-stream simultaneously.** Logs are appended to `execution_process_logs` as JSONL; the persistence
path is **just another subscriber to the same MsgStore** — `spawn_stream_raw_logs_to_storage`
(`execution_process.rs:256-308`) calls `history_plus_stream()` and drains lines into a JSONL writer. **Replay
after the run ends:** `stream_raw_logs` first tries the in-memory store (live tail); if the process is gone it
**reconstructs from `execution_process_logs`** — builds a throwaway `MsgStore`, replays the JSONL, pushes
`Finished`, serves the same stream shape. **The observer API is identical live-vs-historical.**

### SSE/WS subscription + correlation; the typed boundary

Per-run logs = WebSocket addressed by execution_process UUID (`/execution-processes/{id}/raw-logs/ws`); the
`{id}` → `MsgStore` HashMap key is the entire correlation mechanism. Global entity event bus = SSE (`/events`),
fed by **SQLite change hooks** that convert DB CRUD into JSON-Patch `LogMsg`s on the same primitive. A nice
production detail: the WS upgrade is **always accepted** even for a missing run — it sends `Finished` and closes
cleanly rather than HTTP 404. **The typed Rust→TS boundary** (`bin/generate_types.rs`) uses ts-rs but via a
**hand-maintained `Vec<String>` of `Type::decl()` calls** into a single `shared/types.ts`, with a `--check` CI
gate against drift. Structured payloads (`NormalizedEntry`, `PatchType`) ARE typed — **but `LogMsg` (the
streaming envelope) has no TS derive**; it is hand-mirrored in the frontend with bespoke wire shapes
(`{"finished":true}`). The typed boundary covers REST DTOs + log-entry payloads, but **the live-stream transport
contract is an untyped, hand-synced seam.**

### LEARN / AVOID / ORTHOGONAL (L9 + API)

**LEARN**
- **The `MsgStore` buffer-replay-then-tail primitive is the headline pattern for v3's L9 observe seam.** One
  `history_plus_stream()` solves the hardest problem — a late-joining external observer sees full history then
  live tail atomically, no race. The snapshot+subscribe-together (`msg_store.rs:104`) is the load-bearing line.
  Adopt verbatim for "follow an instance from outside."
- **One MsgStore per addressable unit, keyed in `HashMap<Uuid, Arc<MsgStore>>`** — correlation/addressing is
  just the key; trivial to expose over any transport.
- **Persistence as just-another-subscriber** — the DB writer and live clients drink from the same fan-out; v3
  gets durable replay-after-completion for free, and the observe API is identical live-vs-historical.
- **Self-describing envelope + in-band `Finished` terminator + lag-drop policy** — slow subscribers can't
  back-pressure the producer. Important for a kernel that must not let one observer stall an instance.
- **`--check` CI gate on the generated types file** — enforced single-source-of-truth.

**AVOID**
- **The untyped streaming envelope** — `LogMsg` hand-mirrored in TS with bespoke wire shapes. For a v3 kernel
  whose whole value is a typed contract, **the event/stream frame must be in the generated boundary too**, not
  just REST DTOs. The one real seam-quality defect.
- **The manually-curated `decl()` list** — every new exported type is a hand-edit; prefer auto-export-walk.
- **Two transports for one pattern** (WS for runs, SSE for the global bus, both `history_plus_stream`) — doubles
  the client glue; pick one.

**ORTHOGONAL** — the relay-signing WS auth; the SQLite-change-hook → JSON-Patch event bus (a UI-reactivity
convenience; v3's event sourcing would be primary, not trigger-derived); Immer/RFC-6902 client reconstruction.

> **Could an external orchestrator drive/observe through this API?** **Observe: yes, cleanly** — the WS/SSE
> endpoints are keyed by UUID, transport-agnostic, and serve history+live identically. **Drive: partially** —
> there are REST control endpoints, but the seam is built for the bundled UI (bespoke frames, untyped envelope).
> A **clean observe seam, a UI-coupled drive seam.** v3's lesson: keep the MsgStore observe primitive, but make
> the frame contract typed and transport-neutral so a third-party orchestrator is a first-class consumer.

---

## L4/L5/L6 — Spawn, Follow-ups, MCP & Git-Host

**3-sentence verdict.** Vibe Kanban is a **local-first orchestrator where the durable spawn unit is the
`ExecutionProcess`** — every agent invocation is a first-class, append-mostly DB row keyed to a `Session`, and
"continue vs restart" is expressed by whether you spawn a `CodingAgentFollowUpRequest` (resumes the agent's own
session) or a `CodingAgentInitialRequest` (fresh session). It is **not a distributed workflow kernel**: there is
no scheduler, no webhook trigger, and **no automatic result correlation up a task hierarchy** — humans create
issues and press buttons, and the only "trigger" that advances the board is a *polled* PR/merge status change.
Subtasks and follow-ups are durable and first-class *as records*, but correlation to a parent is mere
**lineage provenance** (`parent_workspace_id`), never an aggregated/awaited result.

### Follow-up vs new-attempt + subtasks (L4) — first-class as records, NO correlation

The durable spawn primitive is `ExecutionProcess` — a fully first-class row (`id, session_id, run_reason,
executor_action JSON, status, exit_code, dropped, started_at, completed_at`), with logs persisted per process.
The agent's own session id is captured back into the record as the process streams (`LogMsg::SessionId →
update_agent_session_id`, `execution_process.rs:309-313`) — the write-back that makes resume possible.

Three explicit lifecycle verbs, separated by *type* not flags:
- **Follow-up = CONTINUE** — `CodingAgentFollowUpRequest {prompt, session_id, reset_to_message_id, …}`; a new
  `ExecutionProcess` on the SAME session. Claude resumes via `--resume <id>` (+ `--resume-session-at <uuid>` to
  rewind); Codex via `thread_fork`. A human sends one by POSTing to the **session queue** — a serialized second
  turn that runs when the current execution finishes.
- **New attempt = RESTART** — `CodingAgentInitialRequest` (no `session_id`); a brand-new agent session.
- **Mid-session REWIND** — `reset_session_to_process(...)` restores worktrees to the pre-process commit, stops
  running processes, and `drop_at_and_after` soft-drops later rows (preserved, not deleted).

**Subtasks** (`tasks.parent_workspace_id`): a subtask **is a full first-class `Task`** (same struct), not a
checklist item. But **correlation up is provenance-only, not result aggregation** — `parent_workspace_id` is read
in exactly one place (to retarget child branches when the parent renames its branch); it is **not read by any
task route or the frontend**. The parent agent does **not** await or ingest child results; there is no
join/correlation/fan-in. **This is the opposite of the omnigent/DBOS/hermes finding** — Vibe Kanban subtasks are
loosely-coupled siblings sharing a branch lineage, not awaited child runs.

### MCP (L5) — both exposes AND injects

**Exposes** (Vibe Kanban IS an MCP server, `crates/mcp/`): orchestrator mode gives an agent 7 tools incl.
`run_session_prompt` (drive another coding-agent turn in an existing session, return immediately with the
execution-process handle — the agent-spawns-agent primitive), `create_session` (spawn a sibling session),
`start_workspace`. Global mode adds ~40 tools incl. `create_issue` with a `parent_issue_id` (these "issues" live
in Vibe Kanban's *cloud* backend, not GitHub). **Injects** (consumes MCP on behalf of the agents it runs):
`mcp_config.rs` writes the MCP server set into each agent's own config file/format (`get_mcp_config()` returns
each agent's `servers_path`) — so the spawned agent boots with Vibe Kanban's own MCP server already wired in,
closing the loop so the agent can manipulate its own kanban.

### PR/git-host + templates + issue-sync (L6) — merge is the only trigger, and it's polled

**PR open→track→merge:** `create_pr` pushes the branch + `gh pr create`; the AI-generated description is optional
and is itself produced by a *coding-agent follow-up* (a durable ExecutionProcess). **Track:** `PrMonitorService`
**polls every 60s** (`pr_monitor.rs:68`) — **no webhooks anywhere**. **Merge advances the board (the one real
trigger):** when polling sees `Merged`, `try_archive_workspace` archives once all PRs resolve, and the remote sync
emits `IssueWorkflowSignal::WorkMerged` → issue moves to In review/Done. Direct merge (no PR) is a synchronous path
into the `merges` table (cleanly typed `merge_type IN ('direct','pr')`). **Task templates** are static prompt
scaffolds (markdown checklists copied into a new task's description — no parameters, no execution). **Issue sync:
there is none from external systems** — "remote issues" = Vibe Kanban's own cloud backend; GitHub/Azure integration
is outbound-only (create/monitor PRs). **No cron, no scheduler, no webhook listener** — nothing auto-starts a task.

### LEARN / AVOID / ORTHOGONAL (L4/L5/L6)

**LEARN**
- **The `ExecutionProcess` model is the right L4 durable unit** — one append-only row per agent invocation
  carrying the full command spec (`executor_action` JSON) + status + exit_code + persisted logs + a `dropped`
  soft-delete flag. Make every spawn (initial, follow-up, retry) a first-class durable run record exactly like
  this — matches the confirmed-3× finding.
- **Three explicit lifecycle verbs cleanly separated by type, not flags:** CONTINUE / RESTART / REWIND. The
  `reset_to_message_id → --resume-session-at` rewind is a clean primitive for partial replay/time-travel within a run.
- **MCP symmetry** — being both an MCP server (orchestrator tools so an agent spawns peers) *and* an MCP injector
  (writing the server set into each spawned agent's native config) is a clean self-orchestration loop.
- **Merge-as-signal** (`IssueWorkflowSignal::WorkMerged`) decouples git-host events from board state via a typed
  signal — a good seam for v3's trigger layer.

**AVOID**
- **No result correlation / fan-in** — `parent_workspace_id` is provenance only; the parent never awaits or
  ingests child output. A workflow *kernel* must correlate child completion back to the parent (await, aggregate,
  resume parent on child-done). Don't inherit this gap.
- **Polling as the only trigger** — 60s PR polling with zero webhooks/scheduler means latency and no event-driven
  advancement. v3's L6 should be event/webhook-first.
- **Templates as dumb markdown prefill** — if v3 wants reusable scaffolds, make them parameterized run specs, not
  description strings.
- **Follow-up queue is single-lane serialized** — fine for a desktop UX, too restrictive for a distributed kernel.

**ORTHOGONAL** — the Vibe Kanban cloud backend (a SaaS multi-device-access layer); per-agent MCP config format
adaptation (TOML vs JSON); worktree/git reconciliation mechanics.

---

## Consolidated Direction for v3

| v3 level | What Vibe Kanban contributes | Verdict |
|---|---|---|
| **L0a kernel** | Mutable status rows + git-anchored checkpoints (`before/after_head_commit` + `dropped` soft-delete). No op-log, no idempotency, no CAS, mark-failed recovery. | **Anti-example with one gem.** Keep DBOS's kernel; steal git-anchored checkpoints + hide-don't-delete masking. |
| **L0b actors** | None — "who acts" is implicit; no actor type, no context-packet. | **Gap** (same as hermes). |
| **L0c adapters** | `ExecutorAction` = serialized, recursive (`next_action`), replayable run-intent in one DB column. Neutral overrides + per-adapter projection. Foreign-session-id-pointer resume. | **Adopt `ExecutorAction` as the AgentConfig primitive + the `next_action` chain.** But resume must be host-portable (paperclip's codec), not anchored to the agent's local disk. |
| **L0e runtime** | `container_ref: String` opaque handle; scripts-as-execution-processes; two-tier cleanup; multi-repo workspace. Single-impl "generic" trait; no isolation; no hibernate. | **Adopt the opaque handle, scripts-as-processes, two-tier cleanup.** Local-worktree archetype needs none of hermes's hibernate complexity — but design the trait against ≥2 real backends. |
| **L3 human gate** | Inline-diff-comment → single-prompt UX; blocking `oneshot` approval waiter with a *question* variant. **But review comments AND approvals are ephemeral — unaudited.** | **Adopt the review UX shape + the richer outcome enum; reject the missing ledger** (3-of-4 now skip it). Pair with paperclip's audited decision row. |
| **L8/L9 channels** | Proof that "channel" = two classes: message-source (hermes) vs transport-access (relay tunnel). SPAKE2-pairing + Ed25519 signed-request trust kit. Exact `host_id` correlation. | **Name the two classes; adopt the SPAKE2+signed-request trust kit for channel establishment.** |
| **L9 observe** | **`MsgStore` buffer-replay-then-tail** — `history_plus_stream()` solves the late-joiner race; persistence is just-another-subscriber; identical live-vs-historical API. | **The headline find. Adopt verbatim for "observe an instance from outside."** Fix the untyped envelope. |
| **API seam** | Typed Rust→TS via ts-rs with a `--check` CI gate — but the streaming envelope is untyped/hand-mirrored. | **Adopt the typed boundary + CI drift gate; put the event/stream frame in it too.** |
| **L4 spawn** | `ExecutionProcess` = first-class durable spawn record; CONTINUE/RESTART/REWIND verbs. **No fan-in: subtasks are provenance-only siblings, never awaited.** | **Adopt the durable spawn record + the three verbs. Build the result-correlation/fan-in Vibe Kanban omits.** |
| **L5 MCP** | MCP symmetry (server + injector); canonical-list → per-agent-dialect transform. | **Adopt the symmetry pattern.** |
| **L6 triggers** | Merge-as-typed-signal advances the board — but only via 60s polling; no webhooks, no scheduler. | **Adopt merge-as-signal; make L6 event/webhook-first, not polled.** |

## Reconsiderations for v3

1. **`MsgStore` is the observe-seam answer — make its frame typed and transport-neutral.** v3 wants instances
   drivable/observable from outside. Vibe Kanban's `history_plus_stream()` (snapshot history + subscribe live,
   atomically, persistence as just-another-subscriber, identical live-vs-historical API) is the cleanest
   realization of that in the series. Adopt it — but learn from its one defect and put the streaming envelope in
   the typed contract so a third-party orchestrator is a first-class consumer, not a reverse-engineerer of the
   board's WS dialect.

2. **Git-anchored checkpoints are a real alternative to event-sourcing for *code-state* recovery.** Vibe Kanban
   never event-sources, yet it can reliably undo by `git reset` to a stored per-process commit OID + tombstoning
   later rows. For v3, the lesson is hybrid: the Transcript/op-log is the system-of-record for *kernel state*, but
   each turn's *side-effect on the workspace* can be anchored to a content-addressed commit so "undo this turn's
   code changes" is answerable independent of replay. The two checkpointing layers are complementary, not rivals.

3. **"Channel" must be split into two classes in v3's model.** Six projects in, the evidence is decisive:
   message-source channels (hermes — normalize content, fuzzy-correlate) and transport/access channels (vibe-kanban
   — carry opaque bytes, exact-correlate by transport-id, authenticate the channel). These need *different*
   correlation oracles and belong in distinct L8 sub-models. Conflating them (treating a remote-access tunnel like a
   Slack adapter) would be a category error.

4. **The audited human-decision record is now a 3-of-4 failure — make it a kernel primitive.** symphony, hermes,
   and vibe-kanban all leave human decisions ephemeral (UI state / in-memory / analytics-only). Only paperclip wrote
   a durable, attributed `issue_execution_decisions` row. v3's L3 contract must record actor + timestamp +
   recommendation + override + reason as a queryable row, not let an analytics event masquerade as audit. Vibe
   Kanban even *built* the right substrate (a single append-only `activity` event feed) but never pointed it at
   approvals/reviews — the gap is architectural will, not capability.

5. **The "child = full instance" pattern has a second half v3 must build: fan-in.** omnigent/DBOS/hermes confirmed
   children are first-class runs; vibe-kanban confirms the *record* half (each spawn is a durable first-class row)
   but is the cautionary case for the *correlation* half — its subtasks are never awaited or aggregated. A workflow
   kernel needs both: a child is a full instance **and** its completion correlates back to (awaits, resumes,
   aggregates into) the parent. Vibe Kanban has the former without the latter.

6. **`ExecutorAction` is the best "what to run" primitive seen — but resume portability is the catch.** Its
   serialized, recursive (`next_action`-chained), DB-persisted run-intent is exactly v3's AgentConfig. The catch is
   the *session* half: Vibe Kanban resumes by handing a foreign session-id back to an agent CLI that owns its
   conversation on local disk, so a session can't migrate machines. v3 should combine Vibe Kanban's run-intent shape
   with paperclip's host-owned-bytes session codec to get both portable intent *and* portable session.

## Caveats

- **Scale forced sampling.** ~109K LOC Rust across 33 crates + ~110K LOC TS; the original seven agents and
  later ten-lens second-pass audit read the load-bearing files, not the whole tree. Contract-level findings
  (the traits, the schema, the `MsgStore` mechanism, the approval path) are high-confidence; "there is no X"
  claims are grep-backed across `crates/` but a large `crates/remote` (24K) and the React frontend leave room
  for a missed corner.
- **A heavily-refactored, sunsetting codebase.** The schema was refactored mid-life (`task_attempts → workspaces +
  sessions`), and the README announces a shutdown. Migration filenames occasionally lie (`masked_by_restore` → the
  actual column is `dropped`). Line numbers are a snapshot at `4deb7ec`. The product is mature and the patterns are
  real, but the codebase is a moving (now stopping) target.
- **Local-product, not distributed-kernel.** Many anti-example verdicts (mutable status rows, mark-failed recovery,
  ephemeral approvals, polling-only triggers, no fan-in, single-impl provider trait) are *reasonable* for a
  single-user desktop product and only become anti-patterns under v3's distributed-kernel goals. The study judges
  Vibe Kanban against v3's bar, not its own.
- **Two products in one repo.** The OSS local kanban and the cloud/remote SaaS (`crates/remote`, `relay-*`,
  Electric SQL) coexist; some findings (configurable board columns, the `activity` feed, the relay) live only in the
  cloud half. Where it matters, the study says which half.
