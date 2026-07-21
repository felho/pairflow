# Gas Town Study — The Parallel-Universe v3 (and the TMUX Cautionary Tale)

Date: 2026-06-20

## Purpose

This note captures what Pairflow v3 can learn from **Gas Town**
(`gastownhall/gastown`), a **multi-agent orchestration system / workspace manager** for
Claude Code, Copilot, Codex, Gemini, and other coding agents (Go, ~243K LOC). Of all
eleven studies it is the **closest in *ambition* to v3** — a production system whose whole
job is to durably run and coordinate many AI coding agents working on real git
repositories — making it effectively a **parallel-universe v3 built pragmatically, today,
on tmux + git-for-data**. Its strengths are directly liftable; its pain points
(tmux screen-scraping welded together, a fleet of garbage-collector daemons, the
idempotency hole, mail-as-permanent-commits, wild-west federation) precisely validate
v3's cleaner architectural bets.

Crucially, Gas Town is **the single best external reference for the parked agent-runtime
topic** ([`_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md)):
it runs its agents in tmux, and its experience is a *cautionary confirmation* of that
note's reframe.

It is from the Steve Yegge ecosystem (the **Beads** ledger is `github.com/steveyegge/beads`),
and uses **Dolt** ("git-for-data" — a versioned SQL database with git-like commit/branch/
merge) as its storage substrate. The vocabulary: Town → Mayor (AI coordinator) → Rig
(project) → Crew (human workspace) + Polecat (worker agent) + Hooks (work pinned to an
agent) + Beads (work-state ledger) + Molecules/Formulas (workflow templates) + Refinery
(merge queue) + Witness/Deacon/Dogs (watchdogs) + Wasteland (DoltHub federation) + Seance
(session continuity).

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/gastown` (analyzed at HEAD `5118351`, pushed 2026-06-20; cloned with `--filter=blob:limit=1m` — large binaries excluded)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)
- [`../../model/core-model.html`](../../model/core-model.html) — the model itself

Eleventh in a series, and the convergence bridge over the first ten is
[`_synthesis.md`](_synthesis.md). Read alongside:

- [`vibe-kanban-study.md`](vibe-kanban-study.md) — the *clean* runtime reference (native PTY + executor-trait + MsgStore observe-seam, NOT tmux); the contrast Gas Town's tmux model needs.
- [`temporal-study.md`](temporal-study.md) / [`dbos-study.md`](dbos-study.md) — the kernel spectrum; the idempotency standard Gas Town lacks.
- [`superpowers-study.md`](superpowers-study.md) — the `verify` gate (Gas Town's gate-bead is its structural implementation).
- [`honcho-study.md`](honcho-study.md) — the memory reference (vs Gas Town's Seance "re-animate the raw session" continuity).
- [`paperclip-study.md`](paperclip-study.md) — the audited-decision / capability-gatekeeper reference.

> Method: initial report from seven parallel sub-agent analyses with `file:line` citations,
> then a second independent ten-lens review before rereading this report. Initial slices: the
> actor model & identity; the tmux runtime (the parked-topic slice); the Beads/Dolt durability;
> Molecules/Formulas & the merge queue; mail/ACP/scheduler; the watchdog/escalation system;
> federation (Wasteland) & session continuity (Seance). Second-pass lenses: state, lifecycle,
> concurrency, runtime adapters, policy/security, fan-out/fan-in, events/relay, memory/context,
> operator observability, and modularity/extensibility.

## Executive Summary

Five load-bearing findings.

> **1. The strongest external validation of v3's "identity durable, activation ephemeral"
> actor model — and a refinement to a THREE-layer split.** A Polecat is "an employee who
> clocks in/out": durable **Identity** (an agent *bead* with a deterministic id
> `gt-<rig>-polecat-<name>` + work history) is cleanly separated from **Session** (the Claude
> context window + tmux pane, ephemeral, cycles every step) by a *third* middle layer —
> **Sandbox** (the git worktree + branch, persistent across assignments, reusable)
> (`persistent-polecat-pool.md:9-44`, `polecat-lifecycle.md:96-100`). The context-packet is
> **not handed over — it is regenerated** from durable pointers: the identity bead stores only
> a `hook_bead` pointer, and `gt prime` re-materializes the full brief at every activation
> (`prime.go:906-974`). This validates v3's L0b and *refines* it: v3 should consider whether
> its actor model needs the explicit middle Sandbox tier (a reusable execution environment
> distinct from both identity and a single turn).

> **2. The TMUX runtime is the CAUTIONARY confirmation for the parked agent-runtime topic.**
> Gas Town runs one detached tmux session per agent and — exactly like Pairflow v1 — tmux is
> simultaneously the **execution substrate, the I/O transport, AND the observation surface**.
> ALL agent I/O is **screen-scraping**: input via `send-keys -l` (a fragile 6-step keystroke
> dance), liveness/idle/readiness via `capture-pane` + regex prompt-matching — which the code
> *itself* flags as "a ZFC violation… AI should observe AI, not regex" (`tmux.go:2947-2961`)
> and "fails open silently" if the upstream TUI text changes (`tmux.go:2998-3002`). There is
> **NO configurable pane layout** (no `split-window`/`select-layout` anywhere); the unit is
> *session = agent*, never *pane = step*, and they **explicitly rejected** a `SessionBackend`
> interface (`sandboxed-polecat-execution.md:583-588`). This is the strongest possible
> confirmation of the parked note's reframe: **split substrate/transport/observation, use a
> real transport (vibe-kanban's PTY, not screen-scraping), and build the pane-layout as a
> separate observe-seam config.** Gas Town does give two clean things to lift: (a) the
> **Identity/Sandbox/Session decomposition** (vocabulary), and (b) the **`ExecWrapper` sandbox
> seam + declarative agent presets** (per-agent quirk flags externalized to config).

> **3. The dedicated watchdog/recovery system — the liveness reference NO prior study had,
> and it fills v3's convergence-flagged watchdog gap.** A four-tier "discover, don't track"
> cascade (mechanical Go **Daemon** → ephemeral-AI **Boot** triage → continuous-AI **Deacon**
> → per-rig-AI **Witness**), whose load-bearing stance is **"stuck is an intelligence problem,
> not a timer problem"**: the mechanical daemon NEVER kills a stuck-but-alive agent (the named
> "Deacon murder spree" bug, `polecat-lifecycle-patrol.md:472-477`) — it *notifies* an AI tier
> to judge. Recovery is **restart-first / work-is-durable / agent-is-ephemeral** — resurrect
> the session in place, preserve the worktree+branch+ledger state, re-derive position from the
> bead (`handlers.go:1761-1763`) — the *opposite* of the prior-studied **mark-failed-only
> anti-pattern**. Plus: a crisp completion invariant (work pinned + sandbox persists + someone
> respawns ⇒ eventual completion), TOCTOU re-check before every destructive action, cooldown +
> consecutive-failure thresholds before force-kill, an **estop kill-switch that exempts the
> coordinator**, best-effort + nil-sentinel liveness writes, and **escalation-as-durable-bead
> with auto-promotion on unack-timeout** (the timeout itself is a liveness signal).

> **4. The gate-bead is the structural implementation of v3's `verify` gate.** A verification
> gate is **a bead blocked-by all implementation tasks, judged by a FRESH, MEMORYLESS agent**:
> *"You are a gate polecat. You have no memory of the implementation — everything you need is in
> this description and in the code on the current branch"* (`gate-bead-instructions.md:30-33`).
> "The verifier is not the implementer" is enforced **structurally via the blocking dependency**,
> not by convention. The Refinery's **two-phase gates** add the other half: pre-merge gates on
> the source branch + **post-squash gates on the *combined* tree** — the independent artifact no
> single worker ever saw (`engineer.go:60-72, 662-673`). This corroborates and strengthens the
> §3.5 verify-gate finding from `_synthesis.md` from a second, independent system.

> **5. Two more references for under-covered v3 levels: a clean spawn-rate governor (L6) and the
> FIRST external federation model (L10/L14).** The **Scheduler** is the cleanest spawn-governance
> reference in the series: `toDispatch = min(capacity, batchSize, readyCount)`, dispatch **gated
> on system health, not just queue depth**, a generic `DispatchCycle` with injected callbacks
> (governor/policy split), scheduling state on a *separate* ephemeral bead (never mutate the work
> item), a circuit breaker, and "OnSuccess-failure counts as dispatch-failure" for at-most-once
> (`scheduler.md`, `dispatch.go`). **Wasteland** is the first external L10/L14 reference:
> **git-for-data (DoltHub) as the coordination plane** — each installation owns a sovereign fork,
> sync = `fetch`+`merge`, no central server/consensus — with **multi-dimensional reputation stamps
> + a hash-chained passbook + statistical fraud detection (the Spider Protocol) + a
> distinct-validators requirement + multi-criteria time-gated tier escalation**. (Cautionary: its
> "claim is intent, not a lock" wild-west mode is a correctness hole v3 must not inherit.)

Where Gas Town sits in the series: it is the **pragmatic-production parallel of v3** — the same
goal reached with tmux + git-for-data, today. Its architecture is a giant existence proof that
the v3 *ambition* is buildable, and its specific pain points are a checklist of what v3's cleaner
choices avoid.

The synthesis line, lightly extended:

> **Gas Town confirms v3's hardest bets from the production-pragmatic side: the actor model
> (identity-durable/activation-ephemeral, refined to Identity/Sandbox/Session), the verify gate
> (the memoryless gate-bead), the spawn-governor (health-gated capacity), and a federation
> substrate (git-for-data) — while its tmux-conflation, Dolt-GC-fleet, idempotency-hole,
> mail-pollution, and wild-west-claim pains are exactly the things v3's split-transport,
> light-ledger, (instance_id, op_id)-idempotency, ephemeral-by-default-comms, and
> real-claim-arbitration choices are designed to avoid.**

---

## Second-Pass Deltas from the Independent Ten-Lens Review

The second pass mostly **confirmed** the first report's major claims, but it added five concrete
implementation-level corrections/refinements that matter for v3.

1. **Gas Town's state model is more explicit than "Dolt plus tmux": it has operational, ledger,
   and observability planes that must not be conflated.** Dolt is the live operational store;
   JSONL-in-git is a disaster-recovery ledger/export, not the primary state store
   (`docs/design/dolt-storage.md:11-16,205-220`); `.events.jsonl` is an activity/audit feed, not
   recovery truth (`internal/events/events.go:1-18,82`). Within the operational plane, the second
   pass found a useful pattern and a warning: cross-process read-modify-write needs a real lock
   around the whole cycle (`internal/beads/beads_agent.go:19,449`), temp+rename only makes the
   write atomic (`internal/lock/lock.go:207`), and PID-only stale-lock detection is too weak
   (`internal/lock/lock.go:39`). v3 should separate **durable state**, **disaster ledger**,
   **observable events**, and **coordination leases** as first-class things rather than letting
   one store pretend to be all four.

2. **The runtime/provider surface is stronger as a config and security reference than the first
   report emphasized.** `AgentPresetInfo` is effectively the single source of truth for binary,
   args, env, process names, readiness, hook, resume, and ACP quirks (`internal/config/agents.go:55,226`);
   ACP support is not one shape but native binary, subcommand, or flag mode (`internal/config/agents.go:174,1150`);
   `AgentEnv` centralizes identity/env isolation (`internal/config/env.go:77,146,166`). The host
   proxy is a concrete capability-boundary pattern: mTLS identity from cert CN, command/subcommand
   allowlists, rate/concurrency limits, timeouts, minimal subprocess env, and server-side git branch
   authorization for `refs/heads/polecat/<name>-*` (`internal/proxy/exec.go:50,83,218`;
   `internal/proxy/git.go:26,207`). The caution is equally concrete: a declared sandbox mode must
   fail closed, because Gas Town's proxy client can silently fall back to local execution when proxy
   env is absent (`cmd/gt-proxy-client/main.go:47,127`), and local-only admin cert issuance is not a
   strong multi-user trust boundary (`internal/proxy/server.go:282,412,490`).

3. **The scheduling/event layer has three separate ideas v3 should keep separate: dispatch
   governance, channel triggers, and correlated observability.** Capacity scheduling is a clean
   host-wide governor: `max_polecats`, `batch_size`, and `spawn_delay` bound deferred dispatch
   (`internal/scheduler/capacity/config.go:8,23,28`), while `PlanDispatch` computes
   `min(capacity,batch,ready)` and filters messaging artifacts before worker dispatch
   (`internal/scheduler/capacity/pipeline.go:126,152`). Convoy fan-out/fan-in is a staged DAG with
   Kahn-computed waves and a separate synthesis gate once tracked legs close
   (`internal/cmd/convoy_stage.go:936,975`; `internal/cmd/synthesis.go:160,527,633`). Separately,
   channel events are filesystem trigger files under `~/gt/events/<channel>/*.event`, with
   path-safe names and timestamp+seq+pid uniqueness (`internal/channelevents/channelevents.go:3,22,90`),
   while `.events.jsonl` has its own flocked append path (`internal/events/events.go:107,127`).
   v3 should not reproduce "three overlapping event systems"; it should encode these as one event
   model with explicit durability tiers, trigger semantics, and correlation (`run.id` is the closest
   Gas Town has: `internal/telemetry/recorder.go:27,236`).

4. **The context/memory/operator UX lesson is more actionable than Seance alone.** `gt prime`
   rebuilds role, identity, and work context after compaction/session loss (`AGENTS.md:127-133`;
   `templates/polecat-CLAUDE.md:101-104`), and the polecat contract says durable reasoning belongs
   in structured bead fields like `notes`/`design`, not transient LLM memory
   (`templates/polecat-CLAUDE.md:234-244`). Formula metadata is a useful typed schema
   (`type`, `version`, `agent`, `review_only`, `steps`, `vars`, `acceptance`) with duplicate/cycle
   validation (`internal/formula/types.go:27-36,120-129`; `internal/formula/parser.go:129,150`).
   On the operator side, `gt status` is both human and machine UX (`--json`, `--fast`, `--watch`,
   `--verbose`) and caches the last good watch result to avoid false "everything is down" moments
   (`internal/cmd/status.go:55-64,481-545`); Dolt incident docs require evidence capture before restart
   (`docs/dolt-health-guide.md:16,23,40`); telemetry is opt-in and sensitive content is redacted or
   truncated by default (`internal/telemetry/telemetry.go:6,105`; `internal/telemetry/recorder.go:293,438,793`).

5. **The modularity story is mixed: Gas Town has excellent narrow seams, but the CLI/cmd layer still
   owns too much orchestration.** Good seams: plugin discovery is a simple filesystem contract
   (`plugin.md` plus optional `run.sh`, town overridden by rig: `internal/plugin/scanner.go:26,63,138`);
   plugin sync reports hash-based missing/drift/extra states (`internal/plugin/sync.go:13,91,257`);
   the scheduler core is a pure domain package with callback-injected I/O
   (`internal/scheduler/capacity/config.go:1`; `internal/scheduler/capacity/dispatch.go:48`);
   formula resolution has rig > town > embedded precedence (`internal/formula/embed.go:47,61,77`);
   and ACP has an explicit provider interface (`internal/agent/provider/provider.go:31`). Weak seams:
   `capacity_dispatch.go` still lock-loads config, mutates context state, dispatches, logs events, and
   saves state in one command path (`internal/cmd/capacity_dispatch.go:76,93,140,246`); some provider
   launch logic is still string/shell-command branching (`internal/config/types.go:862,888,895,900`);
   structured domain state is parsed out of issue descriptions (`internal/beads/fields.go:31,48,60`);
   and plugin sync's "atomic" replacement deletes the target before rename (`internal/plugin/sync.go:123,150`).
   v3 should copy the seams, not the command-layer accumulation.

---

## L0b/L4 — The Agent/Actor Model & Identity

**3-sentence verdict.** Gas Town's actor model is a **named, hierarchical role-taxonomy** where
every actor is a slash-path identity (`<rig>/polecats/<name>`) backed by a durable **agent bead**
(a git/Dolt-stored record), while the running Claude instance, the tmux session, and the git
worktree are disposable layers *underneath* the identity. It implements identity-durable/
activation-ephemeral by separating **three independently-lifecycled layers** — Identity (agent
bead + work history, *permanent*), Sandbox (worktree + branch, *persistent-reusable*), Session
(context window + tmux pane, *ephemeral, cycles per step*) (`persistent-polecat-pool.md:9-44`). A
respawned agent recovers itself entirely from durable state: it re-derives its deterministic
agent-bead id, reads its `hook_bead` pointer, and `gt prime` regenerates the whole working context
— the session carries *no* state of its own.

### The hierarchy + persistent-identity-vs-ephemeral-session

Two-tier taxonomy (`docs/overview.md:30-58`): **infrastructure roles** — Town (workspace root),
**Mayor** (global singleton coordinator, reserved name, `internal/mayor/manager.go:167`), Deacon
(daemon supervisor), per-rig Witness (polecat lifecycle) + Refinery (merge queue); **worker roles**
— **Polecat** (Witness-controlled worker, transient sessions, work *slung* via `gt sling`, branch
merged by the Refinery; rich lifecycle state machine, `internal/polecat/types.go:30-112`) vs **Crew**
(human-controlled, long-lived, pushes to main directly, **no `State` field — nothing to supervise**,
`internal/crew/types.go:7-25`). Dogs are Deacon's short-lived maintenance helpers, not workers.

**The mechanism** (`docs/concepts/identity.md:206-221`): durable identity = the **agent bead** with a
**deterministic id** `gt-<rig>-polecat-<name>` (derived from rig+name, so any process re-derives it
without lookup, `manager.go:398-406`) holding `AgentState`, `HookBead` (the pinned-work pointer),
`Branch`, completion metadata (`beads_agent.go:38-60`); creating it **fails hard** ("a polecat without
an agent bead is untrackable", `manager.go:324-326`) — proving the bead *is* the identity. The session
(Claude + tmux + context window) is killed on `gt done`/handoff/compaction; **session cycling is normal
operation, not failure** (three sessions can complete one assignment, all the same polecat). Respawn
recovery: `ReuseIdlePolecat` `loadFromBeads(name)` reads state back from the bead and reuses the same
worktree; `CreateOrReopenAgentBead` *reopens* a closed/nuked bead rather than making a new one; even
`gt polecat nuke` (destroy sandbox) "leaves identity intact." Transient binding state (the name-pool
`InUse` map) is **explicitly never persisted** — reconciled from the filesystem, durable truth in the
beads (`namepool.go:107-109`).

### Spawn + the context-packet (regenerated, not handed over)

`gt sling` → spawn (reuse-idle or allocate-name + create worktree + agent bead atomically under a pool
lock) → attach `hook_bead` atomically at spawn → **session start deferred** until the work bead is
attached so `gt prime` sees the work. **The context-packet is NOT passed inline — it is *regenerated*
at session start by `gt prime`** (reads the agent bead's `hook_bead` → fetches the hooked bead + any
attached molecule → prints the role, the bead details, the current step, an autonomous-work directive,
`prime.go:906-974`). A durable `CLAUDE.md`/`PRIME.md` fallback is written into the worktree because
"gt prime output scrolls past and gets lost." **Contrast v3's ContextPacket + Superpowers' file-handle
task-brief:** Gas Town hands the actor only a *pointer* (`hook_bead`) on its own identity record, then
re-materializes the full brief from durable state at every activation — the natural consequence of
ephemeral sessions (you can't hand context to a process that doesn't exist yet).

### LEARN / AVOID / ORTHOGONAL (L0b/L4)

**LEARN**
- **The three-layer split (Identity / Sandbox / Session) is the cleanest real-world articulation of v3's
  actor model — and goes further than v3's two-way split.** v3 should consider an explicit middle Sandbox
  tier: a reusable execution environment distinct from both the durable identity and a single ephemeral turn.
- **Identity = a durable record holding pointers; activation = stateless regeneration from those pointers.**
  The agent bead stores only `hook_bead`; the ContextPacket is *derivable*, so respawn/recovery is trivial.
  v3's ContextPacket should be reconstructible from durable state, not a one-shot handover.
- **Deterministic identity ids** (`gt-<rig>-polecat-<name>`) — no registry lookup; derive the record from the
  path. Directly applicable to v3's role→actor binding addressing.
- **Fail-hard on identity, warn-only on session state** — the durable identity write is non-negotiable;
  ephemeral session/monitoring writes degrade gracefully.

**AVOID**
- **Identity stored as a repurposed *issue/work-item bead* with fields packed into a description string** —
  forces lock/reopen/reset gymnastics. v3's actor store should be a **first-class typed entity**, not an
  overloaded task record.
- **Lifecycle state inferred at query-time by cross-checking tmux liveness vs beads** — fragile; spawns whole
  patrol subsystems. v3's kernel should make activation liveness *explicit/observable*, not reconstructed.
- **Context delivered via terminal scrollback "that gets lost," patched by writing fallback files** — a symptom
  of coupling the context-packet to stdout. v3's ContextPacket should be a durable re-readable object.

**ORTHOGONAL** — tmux/worktree/git-branch mechanics, the merge queue, themed name pools, the human-owner-vs-
agent-executor split via git email.

---

## L0e — The TMUX Runtime & Agent Execution (the parked-topic slice)

**3-sentence verdict.** Gas Town runs **one detached tmux session per agent** (session name = agent
identity), the agent CLI is the pane's *initial process* via `respawn-pane`, and **ALL agent I/O is
screen-scraping** — input via `send-keys -l`, observation via `capture-pane` + `pane_current_command`
polling. tmux is simultaneously the **execution substrate, the I/O transport, AND the observation
surface** — exactly the Pairflow-v1 conflation — and Gas Town *explicitly rejected* abstracting it (a
`SessionBackend` interface was considered and dropped). It is therefore a **cautionary reference for the
transport/observation split**, but a **clean reference for two orthogonal things**: the Identity/Sandbox/
Session decomposition, and the runtime-provider *config* surface (presets + an `ExecWrapper` sandbox seam).

### The I/O transport: screen-scraping, not a protocol (THE parked-topic answer)

Launch is one session/window/pane per agent: `new-session -d` then **`respawn-pane -k` replaces the shell
with the agent** so `pane_current_command` reflects the agent (`tmux.go:381-449`, `loader.go:2350-2354`).
**Input** = `send-keys -t <target> -l <text>` + a separate `Enter` (`tmux.go:1215-1228`); the nudge protocol
is a fragile 6-step keystroke dance — dismiss Rewind menu, cancel copy-mode, sanitize control chars, send,
adaptive delay, conditionally send `Escape` to exit vim INSERT mode (`tmux.go:1707-1756`) — gated by
**capturing the pane and looking for the literal substring "esc to interrupt"** to decide if the agent is busy
(`tmux.go:2980-3025`). **Output/readiness** = poll `CapturePaneLines` + regex-match the configured prompt
prefix `❯ ` (`tmux.go:3040-3075`). The code self-indicts: *"This function uses regex to detect runtime prompts
— a ZFC violation. ZFC (Zero False Commands): AI should observe AI, not regex"* (`tmux.go:2947-2961`), and the
escape-gate carries a `FRAGILITY` warning that it **fails open silently** if the upstream TUI status text changes
(`tmux.go:2998-3002`). The `internal/proxy/` + `gt-proxy-server/client` is **NOT** the agent I/O channel — it is a
control-plane mTLS RPC (`POST /v1/exec` for `gt`/`bd` argv + git smart-HTTP) for sandboxed polecats to reach the
host's Dolt/git; even in a remote container, keystroke I/O *still* tunnels through local `send-keys`.

### Pane layout + step→pane attachment (there is none — by design)

**No configurable pane layout, no step→pane attachment.** There are *no* `split-window`/`select-layout`/
`join-pane` calls anywhere in `internal/tmux/` (grep confirms only `new-session`/`respawn-pane`/`capture-pane`/
`send-keys`). The unit of attachment is **session = agent**, never *pane = step*; the human navigates *between
sessions* via global keybindings (`prefix+n`/`p` cycle type-groups, `prefix+g` agent-switcher popup, `prefix+a`
activity feed, `tmux-keybindings.md:8-30`). The only per-session "layout" is cosmetic theming (status-bar color/
format per role). Multi-window grouping (`group_sessions: true`) is an *optional future*. So Gas Town offers
**nothing** for the parked note's requirements (b)/(c): a configurable pane layout and a step+actor→pane mapping.

### Substrate/transport/observation — fully conflated; sandbox seam; no provider interface

**Fully conflated** — tmux is all three; the one clean seam is control-plane (gt/bd/git via mTLS proxy) vs
agent-work-plane. Partial bolt-ons reach toward decoupling observation (a `GT_PANE_ID` env so `FindAgentPane`
reads declared identity not the process tree; a `GT_AGENT_READY` push-signal from the agent's own SessionStart
hook) — but these mitigate the screen-scrape, they don't replace it. **Sandboxing** is layered *inside* the
launch command via a single `ExecWrapper []string` (`exec env ... exitbox run --profile=… -- claude …`,
`loader.go:2357-2361`), with three backends behind that one string (exitbox Seatbelt, macOS sandbox-exec,
daytona remote container with zero-outbound + mTLS-proxy). **Provider abstraction: a *config* abstraction
(`AgentPresetInfo` presets externalize per-agent quirks — `Command`/`ProcessNames`/`ReadyPromptPrefix`/
`EscapeCancelsRequest`/`HasTurnBoundaryDrain`/ACP config) but NOT a *backend interface*** — the substrate is
hardcoded tmux; they dropped `SessionBackend` reasoning "`daytona exec` already looks like a local process to
send-keys, so a backend abstraction buys nothing" (`sandboxed-polecat-execution.md:583-588`). That reasoning is
**contingent on keeping send-keys** — once you have a real transport it collapses, and you want hermes's
`BaseEnvironment`-style ABC.

### LEARN / AVOID / ORTHOGONAL (L0e — explicitly for the parked topic)

**LEARN**
- **The Identity / Sandbox / Session three-way decomposition** — the cleanest external statement of exactly the
  parked-note reframe. v3's L0e "where it executes" = Sandbox; the actor = Identity; the runtime/context-window =
  Session. **Adopt this vocabulary directly.**
- **`ExecWrapper` as a deployment-level, agent-orthogonal sandbox seam** — a single ordered token-list injected
  between env and binary cleanly separates sandbox policy from agent choice from transport. Good model for v3's
  L0e provider config: the provider is "what wraps the command," composable with any agent.
- **Declarative agent presets** capturing per-agent TUI quirks (`ReadyPromptPrefix`, `EscapeCancelsRequest`, …) in
  config not code branches — v3's L0c adapter/actor config should externalize these.
- **The control-plane/work-plane split + per-actor-cert mTLS relay** — if a v3 step runs in a remote sandbox, route
  its kernel calls back over an authenticated RPC keyed by a per-actor cert CN, rather than giving the sandbox host
  credentials. A clean, reusable control-transport pattern (and an L7 credential-never-travels echo).

**AVOID (the cautionary core — this is the parked-topic confirmation)**
- **Do NOT make tmux the I/O transport.** The entire fragility surface — the 6-step nudge dance, the Escape-cancels-
  generation hazard, the "esc to interrupt" substring gate that fails-open-silently, regex prompt detection
  self-labeled a "ZFC violation" — exists *only because* input is keystrokes and output is screen pixels. v3's L0c
  transport must be a real stdio/PTY/protocol channel (vibe-kanban's native-PTY + MsgStore), so the orchestrator
  reads structured turn events, not scraped TUI frames.
- **Do NOT weld observation to the transport.** Liveness/idle/readiness all read the same pane the keystrokes go into
  (a focused user window can falsely report the agent dead). v3's observe-seam must be a *separate* event stream
  (the `GT_PANE_ID`/`GT_AGENT_READY` push-signals are Gas Town reaching toward this — generalize that, don't bolt it on).
- **Do NOT bake one substrate in and reject the provider interface.** "tmux already works" foreclosed their backend
  ABC; once v3 has a real transport the argument collapses — keep hermes's `BaseEnvironment`-style provider so
  worktree/sandbox/remote/PTY are swappable.
- **Do NOT bake the pane layout into the runtime.** Gas Town's "layout" is just per-agent sessions + global cycle
  keybindings — no layout *config*, no step→pane. Build that as a **separate observe-seam layout config**
  (declarative: actor/step → pane), decoupled from execution.

**ORTHOGONAL** — the process-tree teardown machinery (PGID reparent scanning, descendant-killing — necessary *because*
tmux + setsid orphan processes; with a real PTY provider most of it disappears); tmux socket isolation; theme/status-bar
keybinding configuration (human-watching-tmux ergonomics).

> **Net for the parked topic:** Gas Town is the *cautionary* second reference (vibe-kanban is the *clean* one). It
> confirms, in production, every failure mode of the v1-style "tmux does everything" model, and validates the parked
> note's three-way split. The two liftable pieces: the Identity/Sandbox/Session vocabulary, and the ExecWrapper +
> agent-preset config surface.

---

## L0a — The Beads Ledger & Durability Substrate

**3-sentence verdict.** Gas Town's durability is a **mutable materialized SQL aggregate** — every unit of work
(task, message, agent, gate) is a *bead* = a row in the `issues` table of a Dolt database
(`dolt-storage.md:119-138`) — wrapped in a **git-versioned commit graph that gives row-level history for free**
(`dolt_history_*`, `AS OF`, `dolt_diff`). Durability is **commit-based, not replay-based** (every write does
`BEGIN → UPDATE → DOLT_COMMIT → COMMIT`), but the live record is **mutated in place on `main`** — the immutable
layer is *derived history*, not an idempotency ledger. On the kernel spectrum it sits at **CHASM/LangGraph
altitude** but **below paperclip on the idempotency axis**: it has the **four-project idempotency hole** — no
`(instance_id, op_id)` ledger, no per-instance `expected_version` CAS; concurrency is "all writers race on main,
newest `updated_at` wins."

### Beads + Dolt (git-for-data) — the novel part, and its cost

A bead is a **mutable SQL row** (`issues(id, title, status, agent_state, hook_bead, metadata JSON, …)`,
`dolt-storage.md:119-138`); *everything* is a bead — tasks, **mail** (`issue_type='message'`), **agents**
(`issue_type='agent'`), gates, molecules. Work-state lives in **Dolt (versioned SQL), not git files** — the
prompt premise "git-backed hooks" is wrong for the current architecture: *"Dolt is the sole storage backend…
no SQLite. JSONL is used only for disaster-recovery backups"* (`dolt-storage.md:5,14-16`). The genuinely novel
substrate: **Dolt's commit graph IS the history** — `AS OF '<ts>'`, `dolt_diff()`, `dolt_history_issues` are
queryable via SQL, so the audit/event layer is free. **But the cost model is inverted: "the commit graph IS the
storage cost, not the rows"** — a bead touched 7× = 7 commits forever; this forces a 6-stage lifecycle
(CREATE→…→COMPACT→FLATTEN) and a **fleet of garbage-collector daemons** (Reaper/Compactor/Doctor Dogs) running
`DOLT_REBASE`/`DOLT_GC`. **Three durability planes** (`dolt-storage.md:206-220`): Operational (live, in Dolt),
**Ledger** (completed work, the only truly immutable disaster-durable layer — exported to JSONL-in-git every
15 min, scrubbed, "the durable record that survives disasters"), Design (DoltHub-federated). Hooks ≠ git-worktree
storage (it's either Claude Code lifecycle hooks, or the agent's pinned `hook_bead` pointer); checkpoint recovery
= a `.polecat-checkpoint.json` cursor reconstructed from git; `.events.jsonl` = a best-effort append-only activity
log (observability, **not** a recovery source).

### Idempotency / concurrency placement

**No operation-level idempotency ledger** — grep finds only doc-comment "idempotent" meaning *exists-check-then-no-op*.
**Concurrency = all-on-main, newest-`updated_at`-wins** (`dolt-storage.md:91-110, 202`); the former branch-per-worker
strategy was removed; the only mutual exclusion is out-of-band advisory file locks. Dolt transactions give
atomicity-per-write but **not** the per-aggregate `expected_version` check — two agents updating the same bead both
succeed, newest wins, no conflict surfaced. **Spectrum: the durable-store-no-idempotency tier alongside hermes/
vibe-kanban/honcho**, but with a twist — Dolt's row-level versioning gives **forensic recovery** (`AS OF`/`dolt_diff`
to *audit and revert* a racing op *after the fact*) that the other no-idempotency projects lack. But **versioning ≠
idempotency**: it lets you audit-after, it does not prevent at write time. So the four-project hole, *partially
mitigated by time-travel forensics*, but not closed.

### LEARN / AVOID / ORTHOGONAL (L0a)

**LEARN**
- **History-for-free as an audit substrate is genuinely attractive** — a store where every mutation is automatically a
  queryable historical version eliminates the hand-rolled audit/event table. For v3's **restore-never-mutate (fork)**
  principle, Dolt's branch/merge model is a natural fit: fork = `DOLT_BRANCH`, restore = `AS OF`. Steal the *capability*,
  not necessarily the engine.
- **Tiered durability is sound and matches v3's layering** — live mutable operational store + immutable append-only
  disaster record (periodic, scrubbed) + ephemeral best-effort observability. v3's materialized-aggregate + a periodic
  immutable snapshot mirrors this.
- **"The trigger is the boundary, not the clock" + export-is-append-only** — exactly v3's commit-at-boundary instinct.

**AVOID**
- **Don't adopt Dolt's commit-graph-as-storage-cost model** — "your databases are small but your commit history is big";
  the cost is *three background GC daemons* + rebase/flatten/gc pipelines + server-downtime push windows. A massive
  operational tax for a kernel wanting a *light* durable record. v3 must NOT make the aggregate's history immortal-by-default.
- **Avoid the all-on-main last-write-wins concurrency model** — "newest `updated_at` wins" silently loses concurrent
  updates, exactly the bug L0a's per-instance version CAS prevents. v3 should *prevent*, not *audit-after*.
- **Avoid "idempotent = exists-check"** as the idempotency story — none are operation-replay-safe under partial failure.

**ORTHOGONAL** — Claude Code lifecycle Hooks (context-injection plumbing); `.events.jsonl` activity feed; the HOP skill-
derivation ledger.

> **Bottom line for v3's durable-record question:** the *capability* — auto-versioned, branch/merge-able, time-travel-
> queryable state — is the right target and aligns with v3's fork-to-restore principle. The *implementation* — Dolt as
> the live engine with immortal history needing a fleet of GC daemons — is over-complex. The v3 synthesis (which Gas
> Town's *ledger plane* already hints at): a **light materialized aggregate + an `(instance_id, op_id)` idempotency
> ledger + per-instance `expected_version`**, periodic immutable snapshots, and *optional* versioned history as a
> queryable side-channel.

---

## L0f/L2/L3 — Molecules/Formulas & the Merge Queue

**3-sentence verdict.** Gas Town's workflow-definition model is a **TOML-declared step DAG** (`Formula`) cooked into
a frozen template (`Protomolecule`) and instantiated either as a lightweight **root-wisp** (steps read inline at
prime time, no DB rows) or a heavyweight **poured molecule** (steps materialized as recoverable sub-wisps) — i.e.
v3's L0f Template-with-typed-steps plus a runtime/persistence knob. The **Refinery** merge queue is a **Bors-style
batch-then-bisect engine**: stack N squash-merges, run configurable shell *gates* once on the stack tip, fast-forward
on green, binary-search to isolate the culprit on red — v3's LC3 commit/merge action fused with an L2 gate that routes
by outcome. The whole thing rests on "state lives in the data (beads/git), not in any agent's memory," which is
*why* its verification gates are independent-evidence gates by construction.

### Formulas → Molecules → wisps + the merge queue

A **Formula** (`.formula.toml`) is a typed step DAG (`Step{id, title, needs[], target, parallel, interactive,
acceptance}`, `internal/formula/types.go:120-130`) with topo-sort + cycle detection — `interactive=true` forces a
step into the human session (a built-in **human-decision slot**). The **`pour` flag** is a first-class persistence
knob: **root-only wisps** (default) materialize no rows and the agent reads the checklist inline (the throughput
optimization, "~6000 → ~400 rows/day"), restart-the-whole-wisp on crash (cheap); **poured wisps** materialize steps
as sub-wisps with **checkpoint recovery** ("completed steps remain closed, resume from last checkpoint"). The
heuristic is explicit: *"If you would curse losing the progress after a crash, set pour = true"* (`molecules.md:110`).
Checkpoint = a file cursor (`current step + git SHA + modified files`), correctness resting on git as the durable
store — closer to LangGraph's thread-state snapshot than Temporal's event replay.

The **Refinery** (`internal/refinery/`): MRs are beads, scored for anti-starvation (`BaseScore + age/priority
weights`), then **batch-then-bisect** — `BuildRebaseStack` squash-merges up to 5 branches sequentially; `ProcessBatch`
runs gates **once on the stack tip**; green → fast-forward push all; red → flaky-retry once, then **binary-search to
isolate culprit(s)**, merge the good subset. Failed MRs route via a `FailureType→label→reassign` table
(`conflict→needs-rebase`, `tests_fail→needs-fix`, …) back to the originating polecat; a merge-slot lock serializes the
default-branch push. **This *is* v3's LC3 commit/merge action** (runs `git merge --squash` + `git push`, routes by
outcome) fused with an **L2 block-on-evidence gate**.

### The gate-bead = the structural `verify` gate

Two complementary independent-evidence gate mechanisms. **(1) Refinery two-phase shell gates**: pre-merge gates
validate the source branch; **post-squash gates run on the *combined* tree** — "catching issues that only manifest in
the merged result (broken imports, boot failures)" — on failure `git reset --hard` (`engineer.go:60-72, 662-673`). The
post-squash gate reads the independent artifact (the *combined* code no single worker ever saw) — the strongest form
of the Superpowers `verify` gate. **(2) Gate beads**: a verification gate is **a bead blocked-by all implementation
tasks, judged by a fresh memoryless agent**: *"You are a gate polecat. You have no memory of the implementation —
everything you need is in this description and in the code on the current branch"* (`gate-bead-instructions.md:30-33`).
**"The verifier is not the implementer" is enforced structurally via the blocking dependency** — the single best
artifact to steal for v3's `verify` gate. **Convoys** bundle beads into cross-rig DAG work-units; **`mountain`** convoys
(a label, no new schema) get the "No Agent Holds the Thread" stall-detection (the epic IS the thread, the beads ARE the
state; stateless periodic re-derivation) — though partly design-stage.

### LEARN / AVOID / ORTHOGONAL (L0f/L2/L3)

**LEARN**
- **The `pour` flag as a first-class per-template persistence knob** — *materialize-and-checkpoint* vs *inline-and-restart*,
  chosen by cost-of-lost-progress ("would you curse losing this?"). A better design rule than blanket "always checkpoint."
  v3's WF-1..WF-7 should expose this axis.
- **The gate-bead is the reference implementation of the L2 `verify` gate** — a fresh, memoryless verifier blocked-by all
  implementation tasks, judging only the artifact. Steal verbatim: "verifier ≠ implementer" enforced via the blocking dep.
- **Two-phase gates (pre-merge on source + post-squash on the combined tree)** — v3's LC3 merge action should re-verify the
  *merged* tree, the independent artifact no worker saw; catches integration-only failures per-branch CI misses.
- **Batch-then-bisect with flaky-retry + a phase state machine + `FailureType→label→reassign` routing + a merge-slot lock** —
  an excellent reference for v3's merge-queue-as-commit-action.

**AVOID**
- **Steps as natural-language prose, not executable specs** — the DAG is typed and validated, but step *bodies* are markdown
  instructions to an LLM. v3's value is a *kernel* with typed gates/actions: keep step bodies machine-executable (the gate
  `Cmd` model), reserve prose for human-decision slots.
- **File-based checkpoint as a bare cursor** — correctness rests entirely on git being the durable store; can't recover side
  effects outside git. v3 shouldn't model expensive multi-actor workflows this way.
- **Mountain-eater's four-layer "no agent holds the thread" is partly aspirational** — the *principle* (state in data, not
  memory) is sound; the full layering is unproven; don't adopt before validating convergence.

**ORTHOGONAL** — Convoy as a cross-rig *tracking* unit (a layer above a single WF — "many-WF coordination," not a WF
primitive); Mol Mall / three-tier formula resolution (template distribution/precedence).

---

## L8/L6/L4 — Mail/ACP, Dispatch & Scheduling

**3-sentence verdict.** Gas Town's inter-agent layer is a **beads-backed (Dolt/git) mailbox protocol over a
standard-ACP tmux process orchestrator**: durable agent-to-agent messages are `bd create` issues addressed to an
identity, ephemeral pokes are filesystem-queued "nudges," and every agent process is spoken to over the *standard*
JSON-RPC Agent Client Protocol via a transparent proxy. Dispatch is governed by a **config-driven capacity governor**
(one step of a 3-minute daemon heartbeat) that batches polecat spawns under a `max_polecats` cap with a circuit
breaker. Work distribution (`gt sling`) is spawn-then-hook, with scheduling state held on *separate* ephemeral beads so
the work bead stays pristine.

### Mail / nudge / ACP + the Scheduler

**Mail** = durable git-backed beads addressed to an identity (`bd create --assignee <id> --labels gt:message`); a
message is a permanent Dolt commit. Delivery semantics (direct/list/queue/announce/channel/group) are projected onto
the one bead substrate via address-prefix routing; **group/broadcast fans out by sending one bead copy per recipient**.
Typed protocol messages (MERGE_READY/MERGED/REWORK_REQUEST/…) parse with a trivial `Key: value` scanner. **Nudge** = an
ephemeral JSON file in `.runtime/nudge_queue/<session>/`, FIFO by nanosecond timestamp, drained by the agent's
`UserPromptSubmit` hook at the next turn boundary as a `<system-reminder>` — so it **never cancels an in-flight tool
call** (the explicit design goal); atomic rename-to-`.claimed` prevents double-delivery. **Doctrine: default to nudge,
mail only when the message must survive session death** (every mail is a permanent commit). **ACP** is the *standard*
Agent Client Protocol (not a Gas Town invention) — a transparent JSON-RPC proxy (`initialize`/`session/new`/`prompt`/
`update`/`set_mode`/`cancel`) with pragmatic additions (idle keep-alive, propulsion-mode output suppression). Crucially
**agents do NOT talk to each other over ACP** — ACP is strictly orchestrator↔single-agent; agent-to-agent is mail+nudge.

**The Scheduler (the spawn-governance reference):** `max_polecats = -1/0` → direct dispatch, `N>0` → deferred. Scheduling
state lives on a **separate ephemeral `gt:sling-context` bead** tracking the work bead (never mutate the work item). Runs
as **step 14 of the daemon heartbeat, after all health checks** — *dispatch is gated on system health, not just queue
depth*. A generic `DispatchCycle` injects all domain logic as callbacks (`AvailableCapacity`/`QueryPending`/`Validate`/
`Execute`/`OnSuccess`/`OnFailure`) — a clean governor/policy split. The formula: `toDispatch = min(capacity, batchSize,
readyCount)`, `capacity = maxPolecats − activePolecats` (active count from a live tmux-session snapshot + a two-phase
filesystem-reservation admission system so concurrent dispatchers can't oversubscribe). A **circuit breaker**
(`dispatch_failures ≥ 3` closes the context) and **OnSuccess-failure-counts-as-dispatch-failure** (prevents double-dispatch
at-most-once). Work distribution = `gt sling` spawn-then-hook (one polecat per bead); handoffs are either session-continuity
(a `🤝 HANDOFF` mail an agent sends to its successor) or work-redistribution (witness detects zombie → reset bead → deacon
re-dispatches with cooldown + model-escalation).

### LEARN / AVOID / ORTHOGONAL (L8/L6/L4)

**LEARN**
- **The capacity-governor pattern is the cleanest spawn-rate reference in the series** — `min(capacity, batch, ready)` +
  circuit breaker + **run-as-a-heartbeat-step-after-health-checks** (dispatch gated on system health). Directly portable to
  v3's L6 scheduler.
- **Generic `DispatchCycle` with injected callbacks** — separates the governor (capacity/batching/retry) from domain
  dispatch; a good kernel/policy split.
- **Scheduling state on a separate ephemeral bead, work item kept pristine** — the scheduler never mutates the thing it
  schedules; maps to a v3 "work item vs dispatch envelope" separation.
- **The nudge-vs-mail dichotomy** — ephemeral filesystem poke drained at turn-boundary (never cancels) vs durable addressed
  message; "ephemeral by default, durable only if it must survive death" is a genuinely good L8 doctrine.
- **OnSuccess-failure counts as dispatch-failure** — a subtle at-most-once correctness lesson.
- **Standard ACP as the agent-process boundary** — off-the-shelf protocol, not a bespoke wire format; the loose-coupling
  choice v3 should validate (echoes Temporal's "adopt a spec" and vibe-kanban/hermes's ACP use).

**AVOID**
- **Mail-as-beads = a permanent Dolt commit per message** — the team's own doc calls it "a critical pollution source"
  (~120 commits/day of chatter, needing social-rule budgets). v3 must NOT make durable inter-agent comms this expensive.
- **Fan-out by N copies** (one bead per recipient) — N writes/commits/inboxes per logical broadcast; doesn't scale.
- **Three overlapping "event" mechanisms** (`.events.jsonl` + `events/<channel>/*.event` + beads-channels) with different
  durability — v3 should have *one* event substrate with explicit durability tiers.
- **Address resolution by heuristic string-parsing** — brittle; v3 should make identity a first-class typed value.

**ORTHOGONAL** — the Dolt/git substrate; tmux session orchestration; the merge-queue protocol vocabulary; the
rig/polecat/deacon/mayor org chart.

---

## L9/L3/L13 — Watchdog, Supervision & Escalation

**3-sentence verdict.** Gas Town's liveness system is a **four-tier "discover, don't track" supervision cascade** —
a mechanical Go daemon, an ephemeral AI triage agent (Boot), a continuous AI supervisor (Deacon), and per-rig AI
lifecycle managers (Witness) — where the tiers deliberately overlap so any one can fail and another re-derives the
degraded state from observables and self-heals. Its single most important stance is that **"stuck" is an intelligence
problem, not a timer problem**: the mechanical daemon uses only generous thresholds and *notifies* an AI tier rather
than acting, because the project was burned by a "Deacon murder spree" where mechanical detection killed agents that
were merely thinking hard. Recovery is **restart-first, never mark-failed-only**: a stuck polecat's session is
restarted in place, preserving its worktree/branch/beads state, so a completion invariant guarantees the work
eventually finishes.

### The cascade + stuck-detection + restart-first recovery

**Daemon** (mechanical, 3-min tick) checks session liveness but "can't reason"; on a no-progress condition it only mails
a `GUPP_VIOLATION:` to the witness, never kills. **Boot** (ephemeral AI, spawned fresh every tick, one decision then
exits — no context debt) bridges "daemon can't reason" and "Deacon can't observe itself." **Deacon** (continuous AI)
monitors Mayor + Witnesses, writes a heartbeat file (its own liveness probe), force-kills a monitored agent only after
`ConsecutiveFailures ≥ 3` with a 5-min cooldown, and runs reconciler-style jobs (re-feed stranded convoys, re-dispatch
recovered beads with model-escalation); its `Start` is self-healing (installs a tmux auto-respawn hook to break the
restart crash-loop). **Witness** (per-rig AI) detects zombies by cross-checking three independent observables (tmux
liveness, agent-process liveness, beads `hook_bead` status); an **Idle Polecat Heresy guard** treats idle agents as
*healthy*; **Heartbeat v2** trusts the agent's *self-reported* state (`exiting`/`stuck`/`working`) and only infers
freshness; a **TOCTOU re-check** runs before every destructive action. **Recovery = restart-first**: `RestartPolecatSession`
kills the dead Claude process but **preserves worktree+branch+beads molecule state**, so the new session re-derives from
the last checkpoint — the *opposite* of mark-failed-only. `NukePolecat` (destroy sandbox) is heavily interlocked (refuses
if an MR is pending) and persistent polecats are no longer auto-nuked. Only genuinely unrecoverable cases escalate (auth-401
is flagged-for-review not restarted; a 3× same-step crash loop files a bug bead + mails the Mayor).

### Escalation + liveness primitives

**Escalation** is severity-routed (`medium→[bead, mail:mayor]`, `high→+email`, `critical→+sms`), tracked as a first-class
bead with a SHA-256 fingerprint label for dedup, resolved Deacon→Mayor→Overseer. **Stale re-escalation** is the L9↔L3
bridge: an escalation unacked past a threshold (4h) **auto-promotes** severity and re-runs the (now wider) route — *the
unack timeout is itself a liveness signal*. **Liveness primitives:** keepalive (every `gt` command touches a file;
best-effort + a nil-sentinel where "no signal" and "stale signal" collapse to one branch); the Deacon heartbeat file;
**estop** (a town-wide `ESTOP` sentinel file freezes all agents **except the Mayor**, so you stop-the-world without losing
the coordinator; auto-deactivate refuses to clear a manual stop); reaper (a beads/Dolt GC, not a session reaper).

### LEARN / AVOID / ORTHOGONAL (L9/L3/L13)

**LEARN — this is the dedicated watchdog reference none of the other ten studies had:**
- **Split "is it alive?" (mechanical) from "is it stuck?" (intelligent).** A kernel primitive can detect *dead*
  deterministically, but *stuck* needs a policy/agent decision. The convergence-flagged v3 watchdog should make this split.
- **Restart-first recovery, work-is-durable / agent-is-ephemeral.** Resurrect in place (preserve worktree+branch+ledger),
  re-derive position from the ledger — exactly the dead-executor-detection + runtime-context-release behavior v3 wants. The
  **completion invariant** (work pinned + sandbox persists + someone respawns ⇒ eventual completion) is a crisp liveness
  contract worth stating formally.
- **"Discover, don't track" + intentional patrol overlap** — no agent holds private state others depend on; every tier
  re-derives from observables, overlapping patrols mean any single tier can fail without losing recovery. The
  reconciler-convergence property (cf. honcho) made multi-tier.
- **Escalation-as-bead with auto-promotion on unack-timeout** — durable, severity-routed, fingerprint-deduped; the timeout
  is itself a liveness event bumping severity. Directly reusable for v3 L3.
- **TOCTOU re-check before every destructive action + cooldown/consecutive-failure thresholds before force-kill** — concrete
  guardrails against detection/action races and flapping.
- **Sentinel-file kill switch that exempts the coordinator (estop)** — "stop the world but keep the brain."
- **Best-effort + nil-sentinel liveness writes** — failures in the liveness layer must never break the work layer.

**AVOID**
- **Mechanical stuck-detection acting autonomously** — the literal "Deacon murder spree." v3 must never let a timer alone
  trigger a kill; route to a judgment tier. **The strongest cautionary lesson in the codebase.**
- **tmux-as-transport coupling** — the entire liveness layer is welded to tmux (sessions/panes/send-keys/readiness waits);
  their own migration doc admits this is painful. With a transport that emits real lifecycle events, Boot + tmux-polling
  collapse into structural hooks. v3 should aim for the event-driven end-state, not the polling cascade.
- **The four-tier cascade is heavy** — much of it exists *because* tmux can't self-report; don't replicate the polling
  cascade with a real transport.
- **Liveness threshold sprawl** — timeouts scattered across packages; centralize timeout policy in v3.

**ORTHOGONAL** — the reaper (Dolt/beads GC); Dolt write-contention mitigation (an artifact of the SQL-git substrate); tmux
dialog/theming/pane-scraping; the shutdown-warrant dog pool (the *pattern* — mechanical state machines, no LLM, persistent
state files, orphan-recovery — is reusable; the warrant/interrogate/pardon framing is Gas-Town-specific).

---

## L10/L11/L14 — Federation (Wasteland) & Session Continuity (Seance)

**3-sentence verdict.** Gas Town's federation (Wasteland) is **git-for-data as the coordination plane**: independent
installations each hold a *sovereign fork* of a shared Dolt commons, and "coordination" is literally Dolt fork → local
commit → push → upstream merge — no live server, no consensus, no locking, just eventually-reconciled forks where the
real GitHub PR (not the claim) is the source of truth. Reputation is a **multi-dimensional stamp ledger** in that same
commons, made portable by carrying the commons row itself and tamper-evident via a per-subject **hash-chained "passbook,"**
with a separate **statistical fraud layer (the Spider Protocol)** instead of cryptographic trust. Session continuity
(Seance) is **not memory at all** — it is a read-only *subprocess summoning* of a predecessor's literal Claude session
(`claude --fork-session --resume <id>`), so you *ask the dead agent questions* rather than merging its memory.

### Wasteland federation + Seance — the first external L10/L14 reference

**Join = fork+clone+register+push** (entirely Dolt/DoltHub primitives, `wasteland.go:315-375`); config persists to
`mayor/wasteland.json`. **Claim is a signal, not a lock** — `UPDATE wanted SET claimed_by=…` + `DOLT_COMMIT` in the
*local* fork only; the docs are explicit that two rigs can claim the same item and "the actual work (your GitHub PR)
establishes priority." **Evidence** = a completion row + status flip, guarded by `claimed_by = your rig` and a *per-database*
one-completion guard. **Stamps** = valence JSON `{quality, reliability, creativity}` (0–5) + `confidence` + `severity` +
`skill_tags`, with a DB-level `CHECK(author ≠ subject)` (can't stamp your own work). **Trust-tier escalation** (L14) is a
pure function requiring **ALL** of multi-criteria, time-gated thresholds incl. **distinct validators** ("the Spider
Protocol's first line of defense against collusion"). DoltHub = "GitHub for Dolt" — **federation needs no central server**;
`gt wl sync` is `dolt fetch + dolt merge`, semver-gated. **Cross-town trust is deliberately unfinished** — Phase 1 is
"wild-west mode," `trust_level` defaults stubbed to 1; instead of cryptographic trust, defense is **post-hoc statistical
fraud detection** (the Spider Protocol: collusion / rubber-stamp / confidence-inflation / reciprocal-self-loop anomalies
over *public* stamps data, **signals not verdicts**), with a hash-chained passbook for tamper-evidence and a `chain_meta`
table for federation-of-federations. **Seance** = discover predecessor sessions from `.events.jsonl`, then
`claude --fork-session --resume <id>` (one-shot Q&A or interactive) — read-only, zero distillation; the predecessor's raw
context *is* the memory.

### LEARN / AVOID / ORTHOGONAL (L10/L11/L14)

**LEARN**
- **Git-for-data as the federation kernel substrate** — a versioned SQL DB with fork/PR/merge gives cross-installation
  coordination with *no central server, no bespoke consensus*; sync = `fetch`+`merge`, conflicts are a known git problem. A
  remarkably small surface for L10. "Each installation owns a sovereign fork; upstream is just another remote."
- **Reputation as portable data + a statistical fraud layer, not cryptographic trust** — stamps travel because they *are*
  cloned commons rows; the hash-chained passbook gives cheap tamper-evidence; the **distinct-validators requirement** + the
  Spider collusion/rubber-stamp/self-loop detectors on *public* data are a concrete, copyable L13/L14 design (trust earned
  through *diverse* attestation, gamed-trust caught by graph anomaly detection).
- **Multi-criteria, time-gated, ALL-must-pass tier escalation** — quality + volume + diversity + time-in-tier, with
  per-criterion failure reasons; a clean L14 governance primitive.
- **Seance's "continuity = read-only fork of the predecessor's literal session"** — the cheapest possible L11 primitive;
  worth stealing as a *fallback* (zero distillation infra, perfect fidelity, ask-the-predecessor UX).

**AVOID**
- **"Claim is intent, not a lock" / per-database guard** — a correctness hole: two towns double-claim and double-complete,
  reconciled only on upstream merge with the external GitHub PR as tiebreaker. A v3 kernel wanting L10 work-distribution must
  **not** inherit wild-west mode — it needs real claim arbitration (a CAS/lease in the shared substrate). Don't ship
  federation with the trust gate stubbed out.
- **Seance does not scale across predecessors** — one summon = one full model spin-up per question, no cross-session
  synthesis; for multi-hop handoff chains honcho's distilled/perspectival memory is the better reference.
- **SQL built by string-formatting** throughout (hand-rolled escaping) — a fragile injection surface unsuitable for a
  kernel's trust boundary.

**ORTHOGONAL** — Convoys (intra-town work-tracking, not cross-town); DoltHub-specific plumbing (vendor-coupled — the
transferable idea is "git-for-data remote," not DoltHub); the `hop://` URI scheme + delegation primitives (mostly not yet
implemented).

---

## Consolidated Direction for v3

| v3 level | What Gas Town contributes | Verdict |
|---|---|---|
| **L0b actor** | Identity (agent bead) / Sandbox (worktree) / Session (context+pane) three-layer split; context regenerated from a `hook_bead` pointer. | **Adopt the three-layer vocabulary** (refines v3's two-way split); ContextPacket reconstructible from durable pointers. Reject identity-as-repurposed-issue-bead. |
| **L0e runtime (parked topic)** | tmux conflates substrate+transport+observation; ALL I/O screen-scraping; no pane-layout config; rejected a backend interface. `ExecWrapper` sandbox seam + declarative agent presets. | **Cautionary confirmation of the parked reframe.** Adopt Identity/Sandbox/Session vocab + ExecWrapper + presets; reject tmux-as-transport, welded observation, baked substrate, no-layout-config. |
| **L0c/L7 provider+security boundary** | `AgentPresetInfo` as a provider-quirk registry; centralized `AgentEnv`; mTLS host proxy with command/subcommand allowlists, minimal env, rate/concurrency limits, and server-side git branch authorization. | **Adopt config-driven provider adapters and capability-bound host relays.** Require sandbox-intent fail-closed behavior; do not treat local admin cert issuance or tmux separation as a strong security boundary. |
| **L0a durability** | Beads (mutable SQL rows) on Dolt (git-for-data) — versioned history free; but commit-graph-as-storage-cost (GC-daemon fleet), all-on-main last-write-wins, the four-project idempotency hole. | **Steal the capability (fork-to-restore, time-travel) + tiered durability; reject the Dolt engine + last-write-wins + exists-check idempotency.** v3 = light aggregate + `(instance_id,op_id)` ledger + `expected_version`. |
| **L0f/L2/L3 templates+gates** | Formulas→Molecules→wisps (TOML DAG + the `pour` persistence knob); Refinery Bors merge queue (= LC3 commit/merge + L2 gate); **the gate-bead = the structural `verify` gate**; two-phase post-squash gates. | **Adopt the gate-bead `verify` pattern, two-phase gates, the merge-queue-as-LC3-action, and the `pour` knob.** Reject NL-prose step bodies. |
| **L6 scheduling** | The Scheduler: health-gated capacity governor, generic DispatchCycle, scheduling-state-on-a-separate-bead, circuit breaker. | **Adopt the capacity governor (the cleanest spawn-rate reference) + governor/policy split + at-most-once dispatch.** |
| **L6 fan-out/fan-in** | Convoy staging builds a DAG, computes waves, launches Wave 1 immediately, and triggers synthesis only after tracked legs close. | **Adopt staged fan-out plus explicit synthesis gate; require idempotent synthesis and one dispatch path.** Avoid mixing direct launch with a separate deferred scheduler unless their ownership guarantees are unified. |
| **L8 channels/events** | Mail (durable beads-to-identity) vs Nudge (ephemeral turn-boundary poke); standard ACP for the agent boundary; `.events.jsonl` activity feed; separate channel-event trigger files; `run.id` telemetry correlation. | **Adopt the nudge-vs-mail ephemeral-by-default doctrine + standard-ACP boundary + explicit durability tiers for events.** Reject mail-as-permanent-commit + N-copy fan-out + 3 overlapping event systems. |
| **L9/L3/L13 watchdog** | The four-tier "discover-don't-track" cascade; **"stuck is intelligence not a timer"**; restart-first recovery; estop-exempts-coordinator; escalation-as-bead with unack-auto-promotion. | **The dedicated liveness reference — adopt the dead-vs-stuck split, restart-first/work-durable recovery, the completion invariant, escalation-auto-promotion, estop.** Reject mechanical-autonomous-kill + tmux-welded liveness. |
| **Operator evidence/observability** | `gt status` supports human and JSON/watch modes with stale-cache handling; Dolt health docs require evidence capture before restart; telemetry is opt-in and redacted/truncated by default. | **Adopt evidence-first diagnostics and dual human/machine status surfaces.** Do not let restart/cleanup destroy the evidence needed for RCA. |
| **Modularity/extensibility** | Good seams: plugin filesystem contract + drift sync, pure capacity scheduler core, callback-injected dispatch, formula overlay precedence, ACP provider interface. Weak seams: command-layer orchestration accumulation, provider shell-branching, description-field parsing. | **Copy the seams, not the accumulation.** Keep v3 domain packages pure and typed; avoid issue-description parsing and command-local mega-workflows. |
| **L10/L14 federation** | The FIRST external reference: git-for-data sovereign-fork coordination; reputation stamps + hash-chained passbook + Spider fraud detection + distinct-validators + multi-criteria tier escalation. | **Adopt git-for-data-remote federation + diverse-attestation reputation + statistical-fraud-on-public-data.** Reject "claim is intent not a lock" — v3 needs real claim arbitration. |
| **L11 continuity** | Seance: read-only fork of the predecessor's literal session. | **Adopt as a fallback continuity primitive; for cross-many-predecessor memory, honcho's distilled model is better.** |

## Reconsiderations for v3

1. **Gas Town is the production existence-proof that v3's ambition is buildable — and a checklist of what its cleaner
   choices avoid.** No other study is this close in *goal*: durably run and coordinate many AI coding agents on real
   repos. Its strengths (the three-layer actor model, the intelligent watchdog, the gate-bead verify, the capacity
   governor, git-for-data federation) are directly liftable; its pains (tmux-conflation, Dolt-GC-fleet, the idempotency
   hole, mail-pollution, wild-west claims) map one-to-one onto the exact things v3's split-transport, light-ledger,
   `(instance_id,op_id)`-idempotency, ephemeral-comms, and claim-arbitration choices are designed to prevent. **This is
   the strongest single corroboration that v3's architectural bets are the right ones — from the system that paid the
   price of not making them.**

2. **The parked agent-runtime topic now has both a clean reference and a cautionary one.** vibe-kanban (native PTY +
   executor-trait + MsgStore) is *how to do it right*; Gas Town (tmux conflating everything, screen-scraping I/O
   self-labeled a "ZFC violation," no pane-layout config, a rejected backend interface) is *the production proof of why
   the v1-style model hurts*. The two liftable Gas Town pieces — the **Identity/Sandbox/Session decomposition** and the
   **`ExecWrapper` + agent-preset config surface** — should fold into the parked note when it resumes. The parked note's
   reframe (split substrate/transport/observation) is now confirmed from two independent angles.

3. **The watchdog is a genuinely new dimension the convergence work flagged but no prior study covered.** Gas Town's
   "stuck is an intelligence problem, not a timer problem" + restart-first/work-durable recovery + the completion
   invariant + escalation-auto-promotion-on-unack is the reference for v3's L9 watchdog and dead-executor detection. The
   key design law to adopt: **a kernel primitive may kill only what it can prove *dead*; killing what merely looks
   *stuck* must route to a judgment tier.**

4. **The gate-bead independently re-derives the `verify` gate — two systems now agree.** Superpowers gave the principle
   ("a step's self-report is not evidence; check an independent artifact"); Gas Town gives a second, structural
   implementation (a memoryless verifier bead blocked-by all implementation tasks + post-squash gates on the combined
   tree). v3's `verify` gate is now corroborated from two independent angles — it should be a first-class L2 gate kind.

5. **git-for-data fills the L10/L14 reference gap — but with a sharp warning.** Wasteland is the first external answer to
   "how do independent installations coordinate," and the *substrate* idea (sovereign forks of a versioned SQL commons,
   sync = fetch+merge) is elegant and small. But its **unenforced trust + "claim is intent not a lock"** is exactly the
   correctness hole a kernel cannot ship: v3's federation must have real claim arbitration (a lease/CAS in the shared
   substrate) and must not stub the trust gate. The reputation design (diverse attestation + statistical fraud detection
   on public data) is the genuinely reusable L13/L14 contribution.

## Caveats

- **Large repo, focused reads, blob-filtered clone.** ~243K LOC Go; the initial seven-agent pass plus the second
  independent ten-lens pass read the load-bearing files + design docs (`internal/{polecat,tmux,beads,refinery,witness,
  deacon,mail,wasteland,proxy,plugin,scheduler,formula,telemetry}`, `docs/design/*`, `docs/guides/*`,
  `gt-model-eval/*`). The clone used `--filter=blob:limit=1m` (large binaries excluded) — code/docs are complete;
  build artifacts are not. Contract-level findings are high-confidence.
- **Some subsystems are partly design-stage.** The mountain-eater four-layer model, parts of the escalation category-routing,
  and the `hop://` federation delegation are roadmap/design docs, not all shipped — flagged where it matters.
- **A pragmatic production system judged against v3's bar.** Most "AVOID" verdicts mean "the price Gas Town pays for shipping
  today on tmux + Dolt, which v3's cleaner choices avoid," not "wrong." Gas Town is impressive at what it is.
- **Same-day HEAD.** Analyzed at `5118351`, pushed 2026-06-20 — an actively-developed system. Line numbers are a snapshot.
