# Open Topic — Agent Runtime & Pane Layout (how we run agents)

Date: 2026-06-20 · Updated: 2026-07-04 (2026-06-25: resumed — studies 11–12 folded in; omnigent re-examined at the source-code level; v1 pane layer grounded. 2026-07-04: §8 transport-layer read folded back into omnigent-study §5.1)
Status: **SETTLED direction (2026-07-07).** Q1 (per-adapter cleanest channel; tmux =
observe/takeover only), Q3 (layout config = presentation layer), and Q2 (pane binds
**per-runtime-context** — one pane = one workspace/sandbox) are all settled; see §6.
The config-form sub-decision was **resolved at the v1-operability close-out
(2026-07-07): there is no layout config in v1** — discovery runs on the visibility
floor (`listInstances` / `getInstanceDetail`), attach is a per-runtime-context verb
on the adapter's observe/takeover channel, and the composed tree view belongs to the
parked inspector UI. The declarative pane-grid config is dropped as a one-bubble-era
holdover (no studied system built one — §5/§7); if it ever returns, it is a UI-side
convenience, never template or adapter config. What remains is the MVP-scope
sub-decision (local-worktree only vs headless/cloud) — anchored as
`implementation-contract.md` PI-8.

Relation to the rest of the research corpus: this is an **MVP-driven design topic**, not a
reverse-engineering study. It sits at the convergence layer (mostly **L0e** runtime-context,
**L0c** ActorAdapter, **L7** grants, and the cross-cutting **observe-seam**), and draws on the
[`_synthesis.md`](../research/_synthesis.md) decision matrix (see its §8 addendum for studies 11–12).

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

### 3.2 The pane-layout binding dimension (Q2) — v1-grounded, v3 choice open

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

Two reference points now bracket the choice. **v1** uses **per-actor/role**: a fixed four-pane grid
— `status` + the three agent roles (`implementer` / `reviewer` / `meta_reviewer`), each role bound
to a fixed pane index (`topologySlotCatalog.ts`, `topologySlotPaneProjection.ts`; see §7).
**omnigent's** instinct is the opposite — **per-conversation/run resource** (each run owns its
terminal resource; the UI composes the view), the per-runtime-context dimension, with no shared
grid. So Q2 is no longer "unknown": it is the **v3 design choice** between keeping v1's per-role grid
and moving to per-runtime-context (leaning the latter — it fits the execution-process primitive and
survives child-spawn). → open question Q2, §6.

### 3.3 Where the layout config lives (Q3) — settled direction

The **runtime-adapter / presentation config**, NOT the workflow definition — so the template stays
platform-independent and a different runtime (web/cloud) simply ignores it. The alternative (an
optional presentation block in the template) keeps everything in one place for the author but
leaks tmux into the definition. omnigent confirms the split: layout is the UI's job, and its
`terminals:` config is for ad-hoc shells, not agent launch (§4). The **location** is settled; what
remains open is only the concrete **config form and binding policy** (§6 Q3).

Note: a "pane" content is not necessarily a *step* but an *execution-process* (agent-turn,
dev-server, shell) — vibe-kanban's unified primitive.

---

## 4. What the studies offer (concrete)

> Dedup note (2026-07-06): the omnigent child-session-vs-`child_workflow` correction
> below restates [`_dynamic-orchestrator-workflow.md`](_dynamic-orchestrator-workflow.md) §1
> (kept here for this memo's self-contained live-run record); the open questions on
> that territory — including `ActorSessionRef` (Q1) — are owned by that memo, not this one.

### omnigent — the hybrid, channel-split native runtime reference (primary)

A shipped meta-harness that runs many vendor agents. Re-read at the source level for this topic, it
is the most complete external answer because it **separates the channels within a single actor**
instead of conflating them onto a pane:

- **Outer control/execution layer = `HarnessProcessManager` (process + UDS + HTTP/SSE), not a pane.**
  Per conversation it lazily spawns a harness **subprocess**, waits for a **Unix domain socket** to
  appear, and returns an `httpx.AsyncClient` over it — with crash-detect-and-respawn and a
  per-conversation spawn lock (`omnigent/runtime/harnesses/process_manager.py:460` `get_client`,
  `:759` `_spawn_entry`; the runner's control-plane auth secret is stripped from the harness env so
  the agent payload cannot impersonate the runner). This is the "run the actor" control plane —
  **under it, a native-TUI adapter may still host the vendor's interactive TUI in tmux** (next
  bullet); the point is that tmux is never the *outer* execution/transport layer, only at most one
  adapter's surface beneath it.
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

#### Live-run reference: sessions, communication, observation

The live Polly run made one layer distinction sharper than the source-only read: Omnigent's
visible "child" is primarily a **session** concept, not a pane and not necessarily a full child
workflow.

Omnigent session model:

- A **session** is an independent agent conversation/runtime container: it has history, status,
  runner/harness binding, resources, optional terminal resources, and an inbox queue.
- The top-level user-started Polly conversation is a session.
- A Polly-dispatched worker is also a session. It is a **child** because it carries
  `parent_session_id`, appears under Polly in the Subagents/Agents panel, and delivers its result
  to Polly's inbox.
- A child can become a parent of its own children if the tool surface allows it. So "inbox exists
  per session"; "sub-agent completion is delivered to the parent session's inbox" is the
  coordination pattern.

The communication path is separate from the observation path:

```text
Omnigent server/core
  -> runner / harness API
  -> actor session input
  <- structured or external output events
  <- status/completion/inbox result

Browser terminal
  -> WebSocket attach
  -> tmux attach PTY
  -> native agent TUI
```

The first path is the coordination/authority path. It creates or continues sessions, sends turns,
receives output/status, updates history, and delivers child completion to the parent inbox. The
second path is a human observe/takeover surface.

For **structured/headless harnesses**, a turn ends when the executor emits `TurnComplete`; the
scaffold turns that into `response.completed` and `session.status: idle`. For **native CLI
harnesses**, the adapter may return `TurnComplete(response=None)` after input injection; the real
completion is then observed through the native forwarder as `external_session_status: idle` (or
`failed`). If the native session is tracked as a sub-agent, that terminal status is transformed
into a parent-inbox payload:

```text
child session idle
  -> mark sub-agent work completed
  -> put sub_agent result into parent inbox
  -> wake parent with "call sys_read_inbox"
```

This is close to, but weaker than, v3's desired emit discipline. Omnigent often derives "done" from
session lifecycle/status plus forwarded transcript output. v3 should keep the stronger rule:

```text
actor emits structured output
  -> kernel validates authority/op_id/schema/CAS
  -> commit becomes durable truth
  -> wake/routing derives from committed facts
```

The live run also clarifies the v3 mapping:

| Omnigent term | Better v3 reading |
|---|---|
| child session | usually an `actor_session` / runtime conversation used by a step+role dispatch |
| child workflow | only when the delegated unit is itself a full kernel-modeled workflow instance |
| terminal tab | observe/takeover surface for the actor session |
| parent inbox item | completion/wake delivery; in v3 this should derive from committed emit/lifecycle facts |

So do **not** read Omnigent's "child" as v3 L4 `child_workflow` by default. The child session is
often closer to "the runtime conversation used inside a step for a role." A full v3 L4
`child_workflow` is appropriate only when the delegated unit has its own kernel workflow and
lifecycle.

The same live run exposed a second, adjacent topic: Polly behaves like a **dynamic orchestrator
workflow**. It plans, creates/continues child sessions, waits on inbox results, and decides
follow-up delegation at runtime. That is not only a pane/runtime concern; it is a workflow-model
gap tracked separately in
[`_dynamic-orchestrator-workflow.md`](_dynamic-orchestrator-workflow.md).

#### Practical notes from the live run

These are not new v3 decisions, but they were useful concrete learnings from running Omnigent and
watching Polly in the browser.

**The web UI has two separate layers.** The right-side Agents/Subagents panel is Omnigent's own
structured session tree: parent session, child sessions, statuses, previews, and resources. The
black terminal panel is not the truth model; it is an attached terminal view for one selected
session/resource.

**The browser terminal is xterm.js over a WebSocket.** The browser runs an xterm.js terminal
emulator. It does not understand "Claude" or "Codex"; it renders terminal bytes. The attach URL is
resource-addressed:

```text
WS /v1/sessions/{session_id}/resources/terminals/{terminal_id}/attach
```

Server to browser is binary frames containing PTY output bytes. Browser to server is:

- JSON text control messages for resize, e.g. `{"type":"resize","cols":120,"rows":40}`;
- binary input bytes for keystrokes, paste, and mouse-mode reports.

**Attach is a tmux client, not a direct stdout tap.** On the runner side, Omnigent starts a
`tmux attach` client on a fresh PTY and bridges that PTY to the browser WebSocket. So the browser
acts like another terminal attached to the same running tmux session. This preserves cursor motion,
ANSI colors, alternate screen, and native TUI behavior.

**Read-only observe and takeover are the same bridge with different authority.** In read-only mode,
Omnigent drops inbound binary input and also uses read-only tmux attach (`tmux attach -r`) as
defense in depth. Interactive takeover writes raw input bytes into the PTY and is owner-only,
because those keystrokes carry no separate end-user identity once they hit the native TUI.

**Claude native is hybrid.** The Claude Code native session is a real Claude TUI in tmux, but not
all channels go through screen scraping:

- tools go through an MCP stdio server;
- authoritative output is tailed from Claude Code's structured transcript JSONL by a forwarder;
- input may fall back to tmux `send-keys` because the cleaner Channels-MCP input path is blocked by
  org policy in Omnigent's environment.

So the terminal display is human-facing; it is not where Omnigent primarily derives history.

**Codex native is cleaner on input.** Codex native uses a Codex app-server / RPC path for turn
control (`turn/start`, `turn/steer`, interrupt/settings-style operations). The TUI can still be
visible/attachable, but input control does not have to be pane keystroke injection in the same way
Claude native does.

**Forwarders are the bridge from vendor-native history to Omnigent history.** For native sessions,
the executor may only inject input and return `TurnComplete(response=None)`. The durable Omnigent
history/status then arrives via a forwarder reading the vendor-native transcript/app-server stream
and posting `external_conversation_item`, `external_session_status`, usage/model changes, and
similar events back into Omnigent.

**`idle` means different things at different layers.** In a structured/headless harness,
`TurnComplete` leads to `response.completed` and `session.status: idle`. In native harnesses,
`external_session_status: idle` is often the practical "the native turn finished" edge. For a
tracked sub-agent, Omnigent transforms that idle/failed edge into a parent-inbox result.

**The local demo has an API-only trap.** A globally installed/source Omnigent server may answer
`http://localhost:6767/` with JSON if the web UI bundle is not built. For a source checkout, the
practical live-demo path is:

```text
omnigent server start
omnigent host --server http://localhost:6767
cd ap-web && npm install && npm run dev
open the Vite URL, usually http://localhost:5173/
```

This matters because seeing only the root JSON does not mean the server failed; it means the API is
running without a built/served SPA.

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
[`gastown-study.md`](../research/gastown-study.md) §L0e.

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

### nanoclaw — the four-channel scorecard, source-verified ([`../research/nanoclaw-study.md`](../research/nanoclaw-study.md), `_synthesis.md` §13)

A containerized per-session agent runtime — a fourth native-runtime data point beside omnigent, and
the one that most cleanly scores against §5's four adapter channels:

- **input — clean.** A durable SQLite queue + a typed `push` into the live stream, with the one case
  where push semantics break (slash-commands force a stream restart) handled correctly. Cleaner than
  omnigent's stdin writes.
- **tool calls — clean.** Typed MCP config + an allowlist, SDK hooks for policy and telemetry, zero
  scraping. Its PreToolUse hook writing the current tool + declared timeout into shared state — which
  the host's liveness SLA then reads — is the best tool-call/runtime integration in the reference set.
- **authoritative output — conflated, and prompt-fragile.** The transport (outbound rows) is clean,
  but *authority* is split between in-band `<message to="…">` XML parsing of the model's own text
  (with a detect-and-nudge retry) **and** a `send_message` MCP tool — two authoritative paths, one
  depending on the model emitting routing markup correctly. This is gastown's screen-scraping problem
  one level up, and the concrete AVOID that §5's "structured emit = the only authority, in-band text
  is never authoritative" rule is written against.
- **observe/takeover — mostly absent.** `activity`/`progress` collapse into a heartbeat mtime + log
  lines; there is no persisted observable event stream (vibe-kanban's `MsgStore` is strictly better)
  and no takeover affordance — the only operator intervention is kill/restart.

Two structural notes. Its substrate layer confirms §5's split cleanly — **container = zero durable
identity** (session = conversation identity, group = memory/config, container = nothing), the literal
"work durable, actor/session ephemeral" — with per-provider continuation *slots* that keep provider
identity orthogonal to workflow identity. But it has **no provision→ready event** (omnigent's shape):
wake is fire-and-forget, readiness implicit in the first heartbeat/claim, workable only because the
runtime *pulls* from a durable queue. And, like every runtime here, it has **no configurable pane
layout** — one more confirmation of the gap below.

### What NONE of them offers

A **configurable pane *layout*** (a declarative step/actor → pane-grid mapping). gastown confirms
the gap in a production *tmux* system (session=agent, never pane=step); omnigent and vibe-kanban
confirm it web-side (the UI composes the view; layout is not configured). So pane-layout config
remains **v3-original, no external reference** — like the L9 fuzzy-correlation gap.

---

## 5. The clean target architecture (sharpened)

Two runtime layers plus one presentation layer, under a kernel/definition that stays
platform-independent:

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
- **Q2 — Pane-binding dimension: SETTLED direction (2026-07-07) — per-runtime-context.** A pane
  binds to a workspace/sandbox (one pane = one runtime context, e.g. one worktree), not to a role
  and not to a dispatch. Rationale, ratified: per-role breaks the moment concurrency exists (two
  live children each have an implementer — whose pane is "the implementer pane"? the v1 fixed grid
  is a one-bubble-at-a-time legacy, see §7); per-dispatch churns (pane lifetimes in seconds);
  per-runtime-context is stable across dispatches within an instance, multiplexes naturally across
  parallel work (two workspaces = two panes), matches what a human actually watches ("what is
  happening in that worktree"), and fits the ratified Identity/Sandbox/Session decomposition — a
  pane observes a live session in a sandbox, never an abstract kernel concept. *Deferred to the
  implementation plan:* the MVP-scope sub-decision (local-worktree only vs headless/cloud) —
  anchored as PI-8. *(The config-form sub-decision resolved 2026-07-07: no layout config in v1 —
  see the status header and Q3 below.)*
- **Q3 — Layout config location: SETTLED (runtime-adapter / presentation layer); config form
  RESOLVED (2026-07-07): none in v1.** The *location* was settled — presentation config, never the
  workflow definition or kernel — which keeps the template platform-independent. The follow-up
  config-form question then resolved to "no config at all": the runtime-context set is dynamic
  (children spawn, worktrees come and go; no kernel plan object exists to lay out ahead of time —
  the dynamic-orchestrator decision), so a declarative grid has no stable referent. The v1 shape:
  the visibility floor is the discovery surface (what instances / runtime contexts exist), and
  **attach is a per-runtime-context verb** on the adapter's observe/takeover channel (tmux for the
  local adapter) — you attach to one runner, not to "the workflow". The composed tree view is the
  parked inspector UI's job (omnigent confirms: layout is the UI's job; the UI composes the view;
  layout is not configured). A multi-pane "watch these N" convenience may return later as UI-side
  presentation state, never as template or adapter config.

## 7. v1 grounding results

The first three questions owed at parking are now answered from the existing pairflow tmux/pane
layer (`src/v11/infrastructure/channel/tmux/`, `src/v11/shared/topology/`,
`src/v11/application/watchdog/`); only the fourth remains a genuine product decision:

1. **What the v1 pane layout concretely is — a fixed per-role grid.** Four topology slots: `status`
   (pane 0) + `implementer` (1) / `reviewer` (2) / `meta_reviewer` (3), each agent role bound to a
   fixed pane index (`topologySlotCatalog.ts:24-42`, `topologySlotPaneProjection.ts`). This grounds
   Q2: v1's binding dimension is **per-actor/role**.
2. **What the I/O actually is — screen-scraping.** Input is tmux `send-keys` (text, then a separate
   `Enter`; `tmuxInput.ts:91,111`); readiness/observation is `capture-pane` (`tmuxInput.ts:154,226`,
   `watchdogPaneActivitySampler.ts:58`). So the transport *is* the fragile path — the split into
   structured channels (§5) is real work, not a no-op (the omnigent claude-vs-codex question,
   applied to v1: v1 sits at the claude-send-keys end).
3. **Whether live-attach/intervention is real — yes, partially.** There is a `stuck_in_input` marker
   and a watchdog-driven **stuck-input retry** loop (`tmuxInput.ts:15,172,193-210`,
   `tmuxDelivery.ts:223`), plus a session **registry** the delivery path reads
   (`tmuxDelivery.ts:169`). The pane is a live, watched, recoverable surface — so an
   observe/takeover channel (§5) is a real requirement, not just cosmetics.
4. **MVP scope (still owed):** local/tmux only, or is headless/cloud execution (CI, remote) also an
   MVP requirement? — *genuine user decision; gates Q1's remaining sub-decision (§6 Q1).*

## 8. Resume pointer

Studies 11–12 (gastown, gstack) are folded in; omnigent is re-examined at the code level and
reframed as the **hybrid channel-split** reference; the v1 pane layer is read and folded into §7
(fixed per-role grid, `send-keys`/`capture-pane` I/O, stuck-input retry + session registry).
**Next concrete step:** settle the **v3 pane-binding choice (Q2)** — keep v1's per-role grid vs move
to per-runtime-context — and the **MVP-scope sub-decision of Q1** (§7.4) with the user; both feed
Q3's concrete config form. The **four-channel ActorAdapter over a swappable substrate (§5)** is the
target primitive; **omnigent + vibe-kanban** are the clean references, **gastown** the cautionary
one, **gstack** the secure-attach pattern. The transport-layer read is folded back into
[`omnigent-study.md`](../research/omnigent-study.md) §5.1 (done 2026-07-04).
