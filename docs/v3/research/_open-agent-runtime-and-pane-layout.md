# Open Topic — Agent Runtime & Pane Layout (how we run agents)

Date: 2026-06-20 · Updated: 2026-06-24 (resumed — studies 11–12 folded in; omnigent re-examined at the source-code level)
Status: **RESUMED.** The two studies pending at parking (gastown #11, gstack #12) are in, and
omnigent was re-read at the **code** level for this topic. The central decision (Q1) now has a
settled direction; the pane-binding dimension (Q2) and the configurable-layout grid remain the
open **v3-original** part, pending a read of the v1 tmux/pane code.

Relation to the rest of the research corpus: this is an **MVP-driven design topic**, not a
reverse-engineering study. It sits at the convergence layer (mostly **L0e** runtime-context,
**L0c** ActorAdapter, **L7** grants, and the cross-cutting **observe-seam**), and draws on the
[`_synthesis.md`](_synthesis.md) decision matrix (see its §8 addendum for studies 11–12).

---

## 1. The topic (in the user's framing)

Two related MVP concerns the user wants to bring in:

1. **How we run the agents.** In v1, agents run inside a **TMUX session**, and the
   communication happens **through the orchestrator**. v3 needs a principled answer for how an
   actor is executed in a step and how its I/O flows.
2. **The TMUX *pane layout*** (not the session itself, but how the pane arrangement looks).
   In v1 this is **baked into the code**. v3 needs to figure out: how to *configure* something
   like this, and how to *attach a step (or rather a step + actor) to it*.

The user explicitly wants both: (a) what *we* would do with this from first principles, and
(b) whether any of the studied projects has anything usable here.

---

## 2. The key reframe — v1 TMUX conflates concerns that belong to different layers

The single most useful observation: in v1, TMUX is doing several different jobs at once, and v3
must pull them apart because they belong to different layers.

| What TMUX does in v1 | Where it belongs in v3 |
|---|---|
| **(a) Execution substrate** — the process actually runs inside a pane | **L0e** runtime-context provider (*where* it runs) |
| **(b) I/O transport** — the orchestrator talks via `send-keys` / `capture-pane` | **L0c** ActorAdapter (*how* we invoke + the I/O protocol) |
| **(c) Observation surface** — a human can attach; the pane layout is the visual arrangement | **observe-seam** (MsgStore-style) + an optional layout config |

The kernel must NEVER know about TMUX — it is an adapter+provider implementation detail. The v1
"communication through the orchestrator" maps to v3's reactive HANDLE loop: DispatchIntent
produces the dispatch, the actor emits envelopes back. `send-keys`/`capture-pane` is just one
concrete I/O mechanism that lives *behind* the ActorAdapter.

**The refinement the code-level omnigent read forces (§4):** "I/O transport" is itself not one
thing. At the adapter level it splits into **input**, **authoritative output**, and **tool
calls** — three independent channels — and the observation/attach surface is a fourth. So the
clean target is **four adapter-declared channels over a swappable substrate**, not "one
transport." This is the centerpiece of §5.

---

## 3. Design directions

### 3.1 The central decision (Q1): what is tmux, really? — settled direction

The original framing asked a binary: is tmux the *substrate* (it runs the work) or only the
*observation* (it shows the work)? The studies — above all omnigent's shipped code (§4) —
dissolve the binary:

- The abstraction is **`execution_process` / `actor_run` + `ActorAdapter`**, never a tmux session.
- The adapter picks the **cleanest channel each vendor exposes**, falling back to screen-scraping
  only where forced. (omnigent: codex over app-server JSON-RPC; claude over MCP-stdio tools +
  transcript output, with `send-keys` input only because the clean Channels-MCP path is
  org-blocked; the SDK harness fully headless over stdio.)
- The **substrate is swappable** (local worktree ↔ cloud sandbox), and the **kernel knows none**
  of it.
- tmux, where present, is the **human observe/takeover surface** and at most an **input
  fallback** — never the authoritative channel.

The one sub-decision still genuinely open here is **MVP-scope-gated**: does the MVP need the
headless/cloud provider now, or is local-worktree enough for the first cut? (See §6 Q1, §7.4.)

### 3.2 The pane-layout binding dimension (Q2) — still open

The pane layout is a **presentation config**, not a kernel concept. The hard part: the workflow is
a dynamic graph (rounds, child-spawn), the pane grid is static. The binding dimension is the real
question:

- **per-actor/role** — each role gets a fixed pane (implementer-pane, reviewer-pane). Stable,
  readable; but one actor runs many steps → pane content rotates, rounds blur in one pane.
- **per-runtime-context (worktree/sandbox)** — one pane = observation of one *execution-process*
  (agent-turn / dev-server / shell), bound to the worktree. Fits vibe-kanban's
  "scripts-as-execution-processes" (a pane = an execution-process view); the dev-server and a
  shell fit naturally as more execution-processes.
- **per-active-dispatch (dynamic)** — as many panes as active dispatches, dynamically. Mirrors
  exactly what's running; but the layout is unstable / jumps, hard to track by eye during a long run.

omnigent's instinct here is **per-conversation/run resource** (each run has its own terminal
resource; the UI composes the view) — the per-runtime-context dimension, with no shared grid. Still
needs the v1 pane code to settle. → open question Q2, §6.

### 3.3 Where the layout config lives (Q3) — settled direction

The **runtime-adapter / presentation config**, NOT the workflow definition — so the template stays
platform-independent and a different runtime (web/cloud) simply ignores it. The alternative (an
optional presentation block in the template) keeps everything in one place for the author but
leaks tmux into the definition. omnigent confirms the split: layout is the UI's job, and its
`terminals:` config is for ad-hoc shells, not agent launch (§4). → open question Q3, §6.

Note: a "pane" content is not necessarily a *step* but an *execution-process* (agent-turn,
dev-server, shell) — vibe-kanban's unified primitive.

---

## 4. What the studies offer (concrete)

### omnigent — the hybrid, channel-split native runtime reference (primary)

A shipped meta-harness that runs many vendor agents. Re-read at the source level for this topic, it
is the most complete external answer because it **separates the channels within a single actor**
instead of conflating them onto a pane:

- **Default execution layer = `HarnessProcessManager`, NOT tmux.** Per conversation it lazily
  spawns a harness **subprocess**, waits for a **Unix domain socket** to appear, and returns an
  `httpx.AsyncClient` over it — process + UDS + HTTP/SSE, with crash-detect-and-respawn and a
  per-conversation spawn lock (`omnigent/runtime/harnesses/process_manager.py:460` `get_client`,
  `:759` `_spawn_entry`; the runner's control-plane auth secret is stripped from the harness env so
  the agent payload cannot impersonate the runner). This is the clean "run the actor" layer.
- **Native interactive TUI = a special adapter** layered on top — and even there the channels are
  split, not welded:
  - **claude-native** (the hybrid): **tools** over an MCP stdio server Claude launches as a child
    (`serve-mcp`); **authoritative output** by tailing Claude Code's structured transcript JSONL at
    an offset (`omnigent/claude_native_forwarder.py` — `read_transcript_items_from_offset`,
    `read_message_deltas_from_offset`), **not** `capture-pane`; **input** via tmux `send-keys` +
    `capture-pane` confirm — but the bridge docstring is explicit that the clean **Channels-MCP**
    input path was original and is **blocked at the org-policy layer**, so send-keys is a *forced
    fallback*, not a design choice (`omnigent/claude_native_bridge.py` header).
  - **codex-native** (cleaner): a Codex **app-server process + JSON-RPC client** — `turn/start` for
    a new turn, `turn/steer` for mid-turn steering, lock-protected; no send-keys
    (`omnigent/codex_native_app_server.py`; `omnigent/inner/codex_native_executor.py:48-104`).
  - **claude-SDK** (fully headless): a stdio executor with live `_stdin_stream`/`_stdout_stream`,
    no tmux at all (`omnigent/inner/claude_sdk_executor.py:1070` `ClaudeSDKExecutor`, `:206-207`,
    `:451`).
- **Substrate / provider (L0e) = a real, shipped ABC.** Managed cloud hosts (Modal/Daytona/Islo)
  provisioned per session with an **async ready-event** (`POST /v1/sessions` returns before the
  sandbox exists; waiters block on `ManagedLaunchTracker.settled`, `server/managed_hosts.py:224-294`),
  **teardown on every failure path** (`:1286`), **durable host id ≠ disposable sandbox**
  (`relaunch_managed_host :1233-1307`), and a **worktree provider** that is literally v3's
  `pairflow.worktree` — a request-id-correlated remote-exec contract where the host runs git, not
  the server (`server/routes/_host_worktree.py:132-231`).
- **Observation / attach = a clean surface, not screen-scraping the work.** A **PTY ↔ WebSocket
  bridge** (`omnigent/terminals/ws_bridge.py`): server→client every PTY read is a binary frame;
  client→server text frames are JSON control (resize), binary frames are raw input — **dropped when
  `read_only`**. A **terminal registry** keyed `(conversation_id, terminal_name, session_key)`
  (`omnigent/terminals/registry.py`), and tmux **lockdown commands** that remove user pane/window
  creation so managed terminals stay under registry control (`omnigent/inner/terminal.py:144`
  `_tmux_lockdown_commands`, `:665` `TerminalInstance`). The Polly prompt says it plainly: the
  coding harnesses "run in their own terminal — the human can open either in the UI's Subagents
  panel and **watch or TAKE OVER**" (`examples/polly/config.yaml:59`).
- **No configured pane *layout*.** The `terminals:` config is for ad-hoc/long-running shells (dev
  servers, watchers, log tails), explicitly **NOT** for launching coding agents — those go through
  `sys_session_send` (`examples/polly/config.yaml:264`). Sub-agents are their own conversations with
  their own terminal resource; the UI composes the view. There is **no** shared, hardcoded
  "status + implementer + reviewer + meta-reviewer" grid.

> **Net:** omnigent proves you can keep tmux as a human **attach/takeover** surface while the
> tool/output/control channels stay **structured wherever the vendor allows**. The only
> non-structured channel is the forced input fallback (claude send-keys), and it is
> **adapter-owned, kernel-invisible**. Reframed from the earlier note: omnigent is a **hybrid,
> channel-split native runtime reference**, not a "clean no-tmux" one.

### vibe-kanban — the clean minimal PTY reference

- **`PtyService`** (`crates/local-deployment/src/pty.rs`) — native PTY (`portable_pty`), an
  interactive shell `cwd=worktree`, byte-stream over mpsc. "The terminal" — but **not tmux**; a
  direct PTY the user attaches to over the web.
- **Executor trait** — `spawn → SpawnedChild{child, exit_signal, cancel}`; the adapter returns a
  **live OS process** + cancellation channels; an async loop **pumps the protocol** over the
  child's stdin/stdout (e.g. Claude `ProtocolPeer`). The clean "execution + I/O" layer.
- **`MsgStore`** — per-execution log fan-out to the UI; **separates I/O from observation** (the
  (b)↔(c) split). The reference shape for v3's observe-seam.
- **scripts-as-execution-processes** — the dev-server is an `execution_process`
  (`run_reason=DevServer`), long-lived, never finalized. → a "pane" can be agent / dev-server /
  cleanup, all one primitive.

### gastown — the cautionary tmux reference

One detached tmux **session = agent**; the agent CLI is the pane's initial process via
`respawn-pane`; **ALL agent I/O is screen-scraping** (`send-keys -l` in, `capture-pane` +
`pane_current_command` polling out). tmux is simultaneously substrate, transport, **and**
observation — exactly the v1 conflation — and the code self-indicts: regex prompt detection is "a
ZFC violation… AI should observe AI, not regex" (`internal/tmux/tmux.go:2947-2961`), and the
readiness gate "fails open silently" (`:2998-3002`). There is **no** configurable pane layout (no
`split-window`/`select-layout` anywhere); the unit is session=agent, never pane=step, and they
**explicitly rejected** a `SessionBackend` interface ("`daytona exec` already looks like a local
process to send-keys") — a choice the gastown study notes is *contingent on keeping send-keys* and
collapses once a real transport exists. Liftable despite the cautionary core: the **Identity /
Sandbox / Session** three-way vocabulary, the **`ExecWrapper`** sandbox seam, and **declarative
agent presets** (per-agent TUI quirks in config, not code). See
[`gastown-study.md`](gastown-study.md) §L0e.

### gstack — the secure-attach pattern

A browse-PTY runtime (another PTY-not-tmux data point) with a stable, non-secret `sessionId`
separated from a short-lived **bearer attach token** (`gstack-study.md:368,425`) — the model for how
a human attaches to a live session securely (identity is not authority).

### Temporal / hermes — affinity & provider ABC, briefly

- **Temporal** — sticky task queue / **actor affinity**: the next step routes back to the worker
  holding state warm (engine-stamped address + bounded-timeout fallback). The conceptual model for
  "step + actor → warm runtime binding." **PULL-based** (worker polls) — a contrast to v1's PUSH.
- **hermes** — six backends (`local/Docker/SSH/Singularity/Modal/Daytona`) behind a
  `BaseEnvironment` ABC + hibernate. The survey shape for a **pluggable runtime provider**; omnigent
  is the shipped instance of the same idea.

### What NONE of them offers

A **configurable pane *layout*** (a declarative step/actor → pane-grid mapping). gastown confirms
the gap in a production *tmux* system (session=agent, never pane=step); omnigent and vibe-kanban
confirm it web-side (the UI composes the view; layout is not configured). So pane-layout config
remains **v3-original, no external reference** — like the L9 fuzzy-correlation gap.

---

## 5. The clean target architecture (sharpened)

Two layers, under a kernel/definition that stays platform-independent:

**(1) Substrate = L0e runtime-context provider.** An opaque, provider-issued ref (path /
container-id / sandbox-url). Providers: `pairflow.worktree` (MVP), later cloud sandbox (omnigent
shows the shipped shape: async provision + ready-event + teardown + durable host-id ≠ physical
runtime). Swappable; the kernel knows none of it.

**(2) Invocation & observation = L0c ActorAdapter, declaring FOUR channels.** The adapter — not the
kernel, not the workflow — owns the wire, and declares each role separately:

| Channel | What it is | v3 seam it plugs into |
|---|---|---|
| **input** | how the actor receives a dispatch; a *preferred* channel + an optional *fallback* | L0c dispatch (DispatchIntent / HANDLE) |
| **authoritative output** | where the binding truth of a turn comes from (structured emit / transcript) | L0b emit + **Part E** (`structured = authority, summary = headline`) |
| **tool calls** | how the actor invokes capabilities | L0c / **L7** (`tool_refs` + capability-bound host relay; omnigent `serve-mcp`) |
| **observe / takeover** | how a human watches or takes over | **observe-seam** (MsgStore) + attach surface (`read_only` / takeover) |

Three properties make this correct:

- **The four are logical roles, not necessarily four physical wires.** One adapter may map
  output+observe onto the same transcript and tools+input onto the same relay (omnigent does both).
  The point is that the adapter *declares* each role, so none is implicitly conflated the way
  v1/gastown conflate all of them onto the pane.
- **The fallback input channel is the only place screen-scraping may live, and it must be flagged
  as "fallback, not truth."** Where a vendor exposes no structured input (or it is policy-blocked,
  as with claude's Channels-MCP), the adapter may fall back to keystrokes — but that channel is
  adapter-owned and never an authority.
- **The rendered TUI/pane is a self-presentation, never a truth source.** This is the *existing*
  kernel discipline, not a new rule: a pane (like a `summary` or a self-report) is for humans;
  `core-model-todo.md` **F2** ("policy and verify read structured fields, never the summary") and
  **F3** ("self-report is never evidence") already make the structured emit the authority. The
  runtime topic therefore **plugs into the Part E/F contract on the output and observe side — it is
  not greenfield there.** Only the layout grid is greenfield.

**(3) Layout = UI/presentation config**, keyed by one of §3.2's binding dimensions, living in the
runtime-adapter / presentation layer — never in the workflow definition or the kernel. A different
runtime (web/cloud) simply ignores it. A "pane" subscribes to the observe channel; its content is an
*execution-process* (agent-turn / dev-server / shell — vibe-kanban's unified primitive), not
necessarily a workflow step.

The throughline: **the kernel and the workflow definition stay platform-independent; the four
channels live in the adapter; tmux/pane is one adapter's observe/attach surface (and at most an
input fallback); the layout is a presentation detail at the edge.**

---

## 6. Open decisions (status after convergence)

- **Q1 — tmux role: SETTLED direction.** Not "tmux vs protocol" but **per-adapter cleanest
  available channel; substrate swappable; kernel knows none**; tmux = observe/takeover surface +
  (forced) input fallback, never the authoritative channel. *Remaining sub-decision
  (MVP-scope-gated):* does the MVP ship the headless/cloud provider now, or local-worktree only?
  (omnigent shows the cloud-provider shape is well-trodden if needed; the worktree provider is cheap
  either way.)
- **Q2 — Pane-binding dimension: STILL OPEN.** per-runtime-context (worktree/sandbox) /
  per-actor-role / per-active-dispatch. Leaning per-runtime-context (fits the execution-process
  primitive; omnigent's per-conversation resource is the same instinct). Needs the v1 pane code to
  ground.
- **Q3 — Layout config location: SETTLED direction.** Runtime-adapter / presentation config, not the
  workflow definition — keeps the template platform-independent. (omnigent confirms: layout is the
  UI's job; the `terminals:` config is for ad-hoc shells, not agent launch.)

## 7. Clarifying questions still owed to the user

Three of these are now answerable from the v1 code (the grounding step); only the fourth is a
genuine product decision:

1. **What is TMUX actually used for in v1 today?** — does a human attach and type/intervene, or just
   glance? (decides whether live-attach/takeover is a real requirement) — *read from v1 code.*
2. **What does the v1 pane layout concretely look like?** — how many panes, what they show, the
   logic. (grounds Q2) — *read from v1 code.*
3. **What is the actual I/O today?** — `send-keys`/`capture-pane`, or does the agent already run a
   stdio/protocol and tmux is just the visual frame? (decides how cheap the transport split is — the
   omnigent claude-vs-codex question, applied to v1) — *read from v1 code.*
4. **MVP scope:** local/tmux only, or is headless/cloud execution (CI, remote) also an MVP
   requirement? — *genuine user decision; gates Q1's remaining sub-decision.*

## 8. Resume pointer

Studies 11–12 (gastown, gstack) are folded in; omnigent is re-examined at the code level and
reframed as the **hybrid channel-split** reference. **Next concrete step:** read the v1 tmux/pane
code (likely the v1 runtime/bubble layer — the [[v3-concept-divergence]] memory mentions
`terminateBubbleTmuxSession` / `removeRuntimeSession` and `bubblePaths.ts`) to answer §7.1–3 and
ground Q2, then settle Q1's MVP-scope sub-decision (§7.4) with the user. The **four-channel
ActorAdapter over a swappable substrate (§5)** is the target primitive; **omnigent + vibe-kanban**
are the clean references, **gastown** the cautionary one, **gstack** the secure-attach pattern. A
follow-up should also fold this transport-layer read back into
[`omnigent-study.md`](omnigent-study.md), whose §5 L0e did not examine the harness-transport layer.
