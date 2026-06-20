# Open Topic — Agent Runtime & Pane Layout (how we run agents)

Date: 2026-06-20
Status: **PARKED / open thread.** Captured mid-discussion. Two more research studies are
to be pulled in before this topic is resumed. This note records the framing, the
design directions, what the ten studies offer, the open decisions, and the clarifying
questions still owed to the user — so the thread can be picked up later (even in a fresh
session) without rebuilding context.

Relation to the rest of the research corpus: this is an **MVP-driven design topic**, not a
reverse-engineering study. It sits at the convergence layer (mostly **L0e** runtime-context,
**L0c** ActorAdapter, and the cross-cutting **observe-seam**), and draws on the
[`_synthesis.md`](_synthesis.md) decision matrix.

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
(b) whether any of the ten studied projects has anything usable here.

---

## 2. The key reframe — v1 TMUX conflates three concerns

The single most useful observation: in v1, TMUX is doing three different jobs at once, and v3
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

---

## 3. Design directions (what we'd do from first principles)

### 3.1 The central decision: is TMUX the substrate, or only the observation?

In v1 TMUX is *everything* — it runs, it transports I/O, it displays. Two real weaknesses:
- **`capture-pane`-based I/O is screen-scraping** (ANSI parsing, races, pane-buffer truncation) —
  fragile.
- **Execution and observation are wired together**, so you cannot run headless (CI, cloud)
  without TMUX present.

The cleaner direction (and the vibe-kanban lesson, §4): **execution + I/O is a direct
child-process over a structured protocol** (stdio / JSON-RPC / ACP), and the **tmux / pane layout
is only an optional observation projection** — not the working mechanism. The adapter drives a
real process, routes its output to one normalized stream (the observe-seam), and a tmux pane (if
anyone wants one) just *subscribes* to that stream.

**Counter-pull to weigh (challenge to the above):** TMUX-as-substrate may matter to the user
because it gives, for free: (a) live **attach + human intervention**, (b) a **detachable,
persistent** session, (c) v1 already works this way. This decides whether tmux is a *provider*
(it runs the work) or an *observation adapter* (it only shows the work). → open question Q1, §6.

### 3.2 The pane-layout binding dimension

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

→ open question Q2, §6.

### 3.3 Where the layout config lives

Likely the **tmux-runtime-adapter config**, NOT the workflow definition — so the template stays
platform-independent and a different runtime (web/cloud) simply ignores it. The alternative (an
optional presentation block in the template) keeps everything in one place for the author but
leaks tmux into the definition. → open question Q3, §6.

Note: a "pane" content is not necessarily a *step* but an *execution-process* (agent-turn,
dev-server, shell) — vibe-kanban's unified primitive.

---

## 4. What the ten studies offer (concrete)

Three of the ten have real material; **vibe-kanban is the primary reference** (it solved exactly
this problem — with a web UI instead of tmux).

**vibe-kanban (primary):**
- **`PtyService` (`crates/local-deployment/src/pty.rs`)** — native PTY (`portable_pty`), an
  interactive shell `cwd=worktree`, `VIBE_KANBAN_TERMINAL=1` + `TERM=xterm-256color`, byte-stream
  over mpsc. This is "the terminal" — but **not tmux**; a direct PTY the user attaches to over the web.
- **Executor trait** — `spawn → SpawnedChild{child, exit_signal, cancel}`; the adapter returns a
  **live OS process** + cancellation channels; an async loop **pumps the protocol** over the child's
  stdin/stdout (e.g. Claude `ProtocolPeer`). The clean "execution + I/O" layer — the opposite of
  `capture-pane` screen-scraping.
- **`MsgStore`** (the observe-seam highlighted in [`_synthesis.md`](_synthesis.md)) — per-execution
  log fan-out to the UI; **separates I/O from observation** — exactly the (b)↔(c) split.
- **scripts-as-execution-processes** — the dev-server is an `execution_process`
  (`run_reason=DevServer`), long-lived, never finalized. → a "pane" can be agent / dev-server /
  cleanup, all one primitive.
- **`PreviewProxy`** — proxies the dev-server into the UI (header-strip + script-inject). → if the
  layout needs a live app-preview pane.

**Temporal — sticky task queue (actor affinity):**
- The next step routes back to the worker that holds the state **warm** — engine-stamped address +
  broker no-cold-load + bounded-timeout fallback. The *conceptual* model for "step + actor → runtime
  binding": if v3 wants an actor to hold a *warm runtime* (loaded worktree, live session) across
  steps, this is the primitive. **PULL-based** (the worker polls; the server does not launch it) — a
  key contrast to v1's push model (the orchestrator launches).

**hermes — terminal-backend ABC:**
- Six backends (`local/Docker/SSH/Singularity/Modal/Daytona`) behind a `BaseEnvironment` ABC +
  hibernate ("sandbox FS = cache, host owns durable state"). → the pattern for a **pluggable
  runtime provider** (local tmux ↔ cloud sandbox).

**What NONE of them offers:** the notion of a *configurable tmux pane layout*. The web-native
projects (vibe-kanban) have no pane-layout concept — every run shows on its own web surface, layout
is the UI's job, not configured. So **"pane-layout config" is terminal-UI-specific with no external
reference** → v3 must design it itself (like the L9 fuzzy-correlation gap).

---

## 5. The clean target architecture (proposed, not yet decided)

Pull the three v1-TMUX jobs into three v3 seams:

1. **Execution substrate = L0e runtime-context provider.** An opaque provider-issued ref
   (vibe-kanban `container_ref`: path / container-id / sandbox-url). Providers: `pairflow.worktree`
   (MVP), later cloud-sandbox. tmux *may* be one provider variant, or not a provider at all (see Q1).
2. **Invocation + I/O = L0c ActorAdapter.** Direct child-process + protocol pump (vibe-kanban
   executor trait), returning a live process handle + cancel. The kernel dispatches via HANDLE; the
   adapter owns the wire (stdio/ACP/JSON-RPC). NOT `send-keys`/`capture-pane`.
3. **Observation = observe-seam + optional layout.** A per-execution normalized stream (MsgStore
   buffer-replay-then-tail). A tmux pane (or web pane, or nothing) subscribes to it. The pane *layout*
   is an optional, provider/presentation-level config keyed by one of the §3.2 dimensions.

The throughline: **the kernel and the workflow definition stay platform-independent; tmux/pane is a
presentation/runtime detail at the edge.**

---

## 6. Open decisions (to settle with the user before building)

- **Q1 — TMUX role:** stays the execution+I/O substrate, OR splits into direct-process execution
  (vibe-kanban-style) + tmux as optional observation, OR hybrid (tmux is ONE pluggable provider
  among several, kernel knows none). *Trade-off:* direct-process is headless-able and not
  screen-scraping, but live-attach+intervention becomes separate work; tmux-as-substrate gives
  free attach/persistence but fragile I/O and hard-to-headless.
- **Q2 — Pane-binding dimension:** per-runtime-context (worktree/sandbox) / per-actor-role /
  per-active-dispatch. (Leaning per-runtime-context — fits the execution-process primitive.)
- **Q3 — Layout config location:** tmux-runtime-adapter config (provider-specific, keeps template
  platform-independent — leaning this) vs. an optional presentation block in the template.

## 7. Clarifying questions still owed to the user (asked, not yet answered)

Before settling Q1–Q3, these need answers — they determine whether live-attach is a real
requirement and what the actual v1 layout demands:

1. **What is TMUX actually used for in v1 today?** Does a human really attach and type into / intervene
   in a pane, or is it more "it runs there and you glance at it"? (Decides if live-attach is a real
   requirement or just how v1 happened to do observation.)
2. **What does the v1 pane layout concretely look like?** How many panes, what do they show (agent /
   dev-server / logs / orchestrator?), what's the logic? (Can be read from the v1 code; grounds the
   discussion in the real need vs abstract dimensions.)
3. **What is the actual I/O today?** Does the orchestrator talk via `send-keys`/`capture-pane`, or does
   the agent (e.g. Claude Code) run its own stdio protocol and tmux is just the visual frame? (Decides
   how much of the communication is really screen-scraping.)
4. **MVP scope:** is local/tmux enough for the MVP, or is headless/cloud execution (CI, remote) also an
   MVP requirement? (If local-only → "tmux stays" is more pragmatic; if headless needed → the split is
   near-mandatory.)

## 8. Resume pointer

When resuming: start by answering §7 (esp. read the v1 tmux/pane code to ground Q2 — likely in the v1
runtime/bubble layer; the [[v3-concept-divergence]] memory mentions `terminateBubbleTmuxSession` /
`removeRuntimeSession` in the release bundle, and `bubblePaths.ts` for the worktree layout). Then settle
Q1–Q3 (§6). The clean target architecture (§5) is the proposed shape; the vibe-kanban PtyService +
executor-trait + MsgStore triad (§4) is the concrete pattern to lift. Two more research studies are to
be pulled in first, per the user.
