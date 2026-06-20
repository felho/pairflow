# Hermes Agent Study — The Channel-Rich Agent Without a Kernel

Date: 2026-06-19

## Purpose

This note captures what Pairflow v3 can learn from **Hermes Agent**
(`NousResearch/hermes-agent`), a **self-improving personal AI agent** that "grows
with you" — it runs as a CLI or as a single messaging gateway process that talks to
you from Telegram, Slack, Signal, WhatsApp, Matrix, Discord, Feishu, and ~10 other
platforms, learns skills from experience, curates its own Markdown memory, schedules
cron automations, spawns subagents, and runs anywhere from a $5 VPS to a serverless
sandbox that hibernates when idle.

It is **huge and product-shaped** — ~1.14M lines of Python across 2,414 files, with a
678 KB `cli.py` and a 69 KB `AGENTS.md` — the opposite end of the spectrum from DBOS's
tight 31K-LOC engine. That matters: Hermes is the first project in this series whose
*reason to exist* is the **outer experience layers** (channels, memory, skills, cron,
human approval), not the kernel. It is therefore the **richest reference for L5–L11**
in the series, and the sharpest negative example for L0a.

The project owner's standing curiosity for this series is **"how those projects
communicate in different channels."** Hermes is the answer to that question: by a wide
margin the densest, most battle-tested multi-channel implementation studied. The L8/L9
slice below is the centerpiece.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/hermes-agent` (analyzed at HEAD `38f1a92`,
  pushed 2026-06-19)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)
- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself

Fifth in a series. Read alongside:

- [`omnigent-study.md`](omnigent-study.md) — meta-harness; validated "L4 child = full
  first-class instance"; weak on the kernel.
- [`symphony-study.md`](symphony-study.md) — OTP orchestrator; skipped L0a, outsourced
  durability to an external SaaS (Linear as system-of-record); unaudited human-decision
  gate.
- [`paperclip-study.md`](paperclip-study.md) — control plane that *built* a durable
  Postgres kernel (mutable-state-row + audit-feed), host-owned `AdapterSessionCodec`,
  UUID-secret-ref credential broker, audited `issue_execution_decisions`.
- [`dbos-study.md`](dbos-study.md) — the canonical L0a reference; one primitive
  (deterministic id + `INSERT … ON CONFLICT` + memoized replay) unifies idempotency,
  spawn, scheduling, recovery; exactly-once without event-sourcing or `expected_version`.

> Method: first-pass seven-slice analysis plus a second, independent 10-lens pass
> performed before rereading this report. The second pass looked specifically at state
> ownership, lifecycle/recovery, concurrency, runtime adapters, policy/security,
> delegation, channels, memory, operator UX, and modularity, with `file:line` citations
> relative to the repo root. The codebase is far too large to read whole; both passes
> targeted the load-bearing seams (`gateway/platforms/base.py`, `gateway/session.py`,
> `agent/transports/base.py`, `tools/environments/base.py`, `cron/jobs.py`,
> `tools/approval.py`, `hermes_state.py`, `acp_adapter/*`, `agent/background_review.py`,
> `agent/curator.py`, `tools/checkpoint_manager.py`, `gateway/platform_registry.py`,
> `agent/session_context.py`, `apps/desktop/src/**`).

## Executive Summary

Two load-bearing findings, in tension with each other.

> **1. Hermes is the channel/memory/skills reference — and the kernel anti-example.**
> Everything *above* the kernel is the richest in the series: 10+ live messaging
> platforms behind one capability-negotiating adapter contract; a genuinely closed
> (if LLM-authored, not metric-driven) learning loop writing durable Markdown memory
> and skills; an agentskills.io-standard skill primitive; a file-backed cron with a
> clean provider/execution split; six runtime backends with serverless hibernate/wake.
> Everything *at* the kernel is the weakest durable-execution story since symphony:
> the "transcript" is a mutable SQLite **chat** history (`sessions` + `messages`), with
> **no operation log, no `op_id`/idempotency key, no `expected_version`, no exactly-once
> replay**. A crash mid-turn re-runs the whole turn — LLM call and tool side-effects
> included. Hermes proves you can build a beloved, capable agent product *entirely on
> the outer layers* while skipping L0a — and shows exactly what that costs.

> **2. The recurring shape is "one central contract, N decentralized implementations,
> best-effort guarantees."** It appears at every level: channels (one `MessageEvent` +
> `SessionSource` target type, but 20 hand-written normalizers); correlation (one pure
> `build_session_key()`, exact-only, no fuzzy); credentials (one process-global
> `os.environ`, blocklist-filtered, "useful not a boundary"); approval (one layered gate,
> but decisions live in in-memory dicts + a config file, **never an audit row**); cron
> (at-most-once via pre-advance, with a real CAS only bolted on for multi-replica). This
> is the dominant lesson: Hermes gets *contracts* right and *guarantees* approximately.
> v3's job is to keep Hermes's contracts and replace its best-effort guarantees with
> kernel-enforced ones.

Where Hermes lands on the series spectrum for the **kernel** question:

```
symphony (no L0a) ──── HERMES ──── paperclip ──────── DBOS
```

Left of paperclip: real durability *mechanics* (WAL + jitter-retry, atomic replace,
malformed-DB self-repair, incremental flush, soft-delete undo-with-audit) but no
operation-level idempotency, no CAS, no resume-mid-operation. It persists the
*conversation*, not a *kernel operation log*.

Where Hermes **leads** the series: **L8/L9 channels** (10+ platforms, capability
negotiation, a relay/connector contract), **L11/L12 memory & learning** (the first
real treatment of this dimension in the series), **L5 skills** (open-standard primitive
+ lifecycle + curator), and the **ACP seam** (it implements a *third-party* typed
agent-client protocol, so external orchestrators like Zed and Claude Code drive it for
free).

The synthesis line for the series so far:

> **v3 = DBOS's kernel discipline + paperclip's control-plane mechanics + Hermes's
> outer-layer breadth (channels/memory/skills/cron) — with the audit ledger, the
> credential broker, and the fuzzy-correlation layer that none of the three got right.**

Second-pass refinement: Hermes is not just "chat store instead of kernel." It is a
set of **several adjacent sources of truth** — SQLite chat state, gateway session-key
maps, cron JSON, shadow Git checkpoints, compressed-message lineage, in-memory API run
streams — that are each reasonable locally but never converge into one durable
operation record. v3 should treat that as the precise anti-pattern: do not merely add
persistence; define which layer owns each fact.

Second-pass refinement: Hermes's operator UX is stronger than its API observability.
The desktop app embeds status, subagent traces, gateway controls, and preview-console
state directly in the working surface; the HTTP/API side still keeps run streams and
statuses in memory. v3 should copy the embedded work-surface pattern, but back it with
a durable event store.

---

## L8/L9 — Channels & Gateway

**3-sentence verdict.** Hermes's channel layer is a **distributed-normalization,
central-shape** architecture: there is NO single `EventNormalizer` function — each of
~20 platform adapters parses its own wire event — but every adapter is contractually
forced to converge on ONE uniform internal pair, `MessageEvent` + `SessionSource`
(`gateway/platforms/base.py:1422`, `gateway/session.py:71`), emitted through exactly two
seam methods (`self.build_source(...)` → `self.handle_message(event)`). Correlation (L9)
is **purely exact and deterministic** — a single pure function `build_session_key()`
(`gateway/session.py:646`) turns the `SessionSource` discriminators into a hierarchical
string key, with zero fuzzy/heuristic matching. It is by a wide margin the **richest
channel implementation studied** — rich in *breadth and capability mediation*, not in
correlation cleverness (correlation is deliberately the dumbest, most deterministic part).

### The EventNormalizer seam

The internal message type is **`MessageEvent`** (`base.py:1422-1505`) — a fully-featured
normalized envelope, not a thin wrapper: `text`, `message_type` (TEXT/PHOTO/VOICE/…
enum at `base.py:1401`), `source: SessionSource`, `raw_message`, `message_id`,
`platform_update_id` (offset bookkeeping), `media_urls`/`media_types` (**always local
file paths** — attachments are downloaded + cached *before* normalization via
`cache_media_bytes`, `base.py:1345`), reply context, per-channel binding fields, and
`internal: bool` (synthetic events bypass authz).

**`SessionSource`** (`session.py:71-99`) is the identity/threading half: `platform,
chat_id, chat_name, chat_type ∈ {dm,group,channel,thread}, user_id, user_name,
thread_id, chat_topic`, plus stable-alt slots `user_id_alt` (Signal UUID, Feishu
union_id), `chat_id_alt`, `guild_id` (Discord/Slack/Matrix server scope), and a
`profile` slot for multi-tenant key namespacing.

Inbound path (the seam is the adapter, the shape is central): each adapter does
platform-parse → `self.build_source(...)` (`base.py:4742`, the only sanctioned
`SessionSource` constructor) → `MessageEvent(...)` → `await self.handle_message(event)`
(`base.py:3926`). Confirmed identical across `telegram.py`, `slack.py`, `signal.py`.
Normalization *logic* is N-way duplicated; the *target type* and *entry points* are
single-sourced — "one normalize **contract**, N normalize **implementations**."

Outbound is symmetric and **capability-mediated via class-attribute flags + overridable
hooks**, not per-platform branching at call sites: `adapter.send(...) -> SendResult`
(`base.py:2313`); per-platform `MAX_MESSAGE_LENGTH` (Telegram 4096, Slack 39000, Signal
8000, email 50000…) with a shared code-block-aware `truncate_message()` (`base.py:4804`,
pluggable `len_fn` — Telegram passes `utf16_len` for surrogate-pair correctness);
`supports_code_blocks` + overridable `format_message()`; streaming via the
edit-transport model (`GatewayStreamConsumer` sends one message then progressively
`edit_message()`s it; `edit_message` defaults to "Not supported" so non-edit platforms
degrade to one-message-per-segment); `_send_with_retry()` (`base.py:3423`) with
exponential backoff + jitter on transient *connection* errors only.

### Correlation (L9)

**Exact, deterministic, no fuzzy matching anywhere.** The entire correlation logic is the
pure function `build_session_key(source, group_sessions_per_user, thread_sessions_per_user,
profile)` (`session.py:646-734`), key format:

```
agent:<profile-ns>:<platform>:<chat_type>:<chat_id>[:<thread_id>][:<user_id>]
```

DMs key on `chat_id` (+`thread_id`); groups key on `chat_id` + optional per-user
isolation, threads default to *shared*; WhatsApp ids canonicalized to survive the bridge's
JID/LID alias flip. This is the **same exact-only posture as paperclip** (no fuzzy
correlation), but richer in discriminator surface. Crucially, **the correlation key IS the
conformance oracle** — the relay contract (`docs/relay-connector-contract.md:67-69,150-154`)
names producing the same `build_session_key()` output "the single highest-correctness
responsibility" of an external connector; getting Discord's `guild_id` wrong "collides two
servers into one session" (the #1 High-severity risk).

**Cross-platform continuity is by `session_id` re-binding, not unified identity.** There is
no global user graph linking "CLI me" to "Telegram me." The CLI→platform handoff
(`gateway/run.py:5766-5895`) computes the *destination* platform's `build_session_key()` and
calls `switch_session(dest_key, cli_session_id)` to re-point the key at the CLI's transcript.
Identity authorization is separate: the DM-pairing system (per-platform allowlists + one-time
codes), not an identity merge.

### The base-adapter contract & pluggability

A new built-in channel must implement: `connect()`, `disconnect()`, `send(...) -> SendResult`,
`send_typing`, `send_image`, `get_chat_info`, and a module-level
`check_<platform>_requirements()`. Everything advanced (`edit_message`, `delete_message`,
interactive button senders, `format_message`) has a graceful-degrading default stub.

Pluggability is genuinely two-tier and the tiers diverge sharply:

- **Plugin path** — *zero core changes*: drop `plugin.yaml`+`adapter.py` in `~/.hermes/plugins/`,
  call `ctx.register_platform(PlatformEntry(...))`. `PlatformEntry`
  (`gateway/platform_registry.py:38-159`) is a rich descriptor (factory, `check_fn`,
  `validate_config`, env-var names, message limits, cron-deliver hook, standalone-sender hook).
- **Built-in path** — the opposite of clean: `ADDING_A_PLATFORM.md` enumerates **16 separate
  core files** a built-in adapter must touch (config enum, factory, two authz maps, session
  fields, prompt hints, toolsets, cron map, send map, channel directory, status display, setup
  wizard, redaction, docs, tests).
- **Relay path** — a generic `RelayAdapter` dials an opaque external connector that handshakes a
  `CapabilityDescriptor` and streams normalized `MessageEvent`s, so the gateway "never learns
  which concrete platform is fronting it" and sheds all platform crypto to the connector edge.

Delivery guarantees are **at-most-once-ish, no outbound dedup**: `_send_with_retry`
deliberately does NOT retry read/write timeouts ("the request may have reached the server —
retrying risks duplicate delivery", `base.py:1676-1693`); only connection-establishment
failures retry.

### LEARN / AVOID / ORTHOGONAL (L8/L9)

**LEARN**
- **Two-struct envelope split** — `MessageEvent` (content) + `SessionSource` (identity/routing),
  the identity half independently serializable and the *only* input to correlation. Adopt for v3's
  L8 internal message/EventEnvelope.
- **Correlation as a single pure, total function → deterministic hierarchical string key**, with
  the function's output as the documented conformance oracle for external implementers. The strongest
  L9 idea here: make "which conversation does this belong to" referentially transparent over a fixed
  discriminator set, with no fuzzy fallback in the kernel path.
- **Capability negotiation via flags + graceful-degrading default stubs** — new channels implement a
  tiny mandatory core, inherit safe no-ops for everything advanced. The right way to absorb channel
  heterogeneity without per-platform branching at the kernel.
- **The relay/connector contract** — a kernel-external transport fronts arbitrary channels by
  handshaking a `CapabilityDescriptor` and emitting the *same* normalized envelope, all
  crypto/secrets shed to the edge. This is the v3 "channel as a capability-bearing plugin behind one
  wire contract."
- **`profile` namespacing slot in the key** (byte-compatible with single-tenant keys) and **local
  file paths in the envelope, not platform URLs** (fetch/cache at the edge).

**AVOID**
- **N-way duplicated normalization** — push normalization into a thinner declarative per-channel
  mapping so there's one normalizer *engine*, not 20.
- **The 16-file built-in checklist** — make the *only* path the plugin `PlatformEntry` path; have no
  privileged built-in path with cross-cutting edits.
- **No outbound idempotency layer** — a kernel claiming delivery semantics should provide an
  idempotency-key/dedup primitive, not rely on "don't retry."

**ORTHOGONAL** — markdown-dialect/UTF-16 chunking/voice-vs-document rendering, proxy detection,
pairing-code OWASP mechanics, silence-narration anti-loop filters. Presentation/ops, not kernel.

---

## L11/L12 — Memory & the Learning Loop

**3-sentence verdict.** Hermes's memory+learning system is a **forked-agent reflection
architecture**: durable knowledge lives in flat human-readable Markdown (`MEMORY.md`, `USER.md`)
plus a `skills/` directory, and *every write is authored by an LLM*, never by rule-based
extraction — "curation" is a second agent instance reading the conversation transcript and calling
the same `memory`/`skill_manage` tools the primary agent has. The loop **is genuinely closed
structurally** (experience → periodic forked reflection → durable Markdown artifact → reloaded into
the next session's prompt) and this is the real, well-engineered core. But it is **not metric-driven
or autonomous in the ML sense**: "after complex tasks" is actually a fixed turn/iteration counter,
and "self-improve during use" is a prompt instruction telling the reflection fork to patch a skill if
the user complained — durable architecture wrapped in slightly inflated marketing.

### Memory model (L11)

Storage is **flat Markdown, profile-scoped, no DB for the durable layer**: `MEMORY.md` (agent notes,
2200-char cap) + `USER.md` (user model, 1375-char cap) under `$HERMES_HOME/memories/`
(`tools/memory_tool.py:55-57`), entries delimited by `§`. Scope is **per-profile** (a profile = a
`~/.hermes/profiles/<name>/` directory) — there is **no per-conversation or global scope** in the
durable layer. `SOUL.md` is the static, user-authored persona.

Write path is **agent-curated, not rule-based**: one `memory` tool with `action ∈ {add,replace,remove}`
× `target ∈ {memory,user}` (`memory_tool.py:932-1016`); the schema *description itself* is the only
"policy"; there is no regex/NLP extractor; when a file is full an `add` is rejected and the model must
batch-free space (consolidation is also LLM-driven).

Injection is a **frozen snapshot in the volatile prompt tier** — `load_from_disk()` captures a
`_system_prompt_snapshot` frozen for the session (mid-session writes hit disk but don't perturb the
prompt, keeping the prefix cache warm). Recalled provider context is fenced in `<memory-context>` with
a "treat as authoritative reference data, NOT new user input" note, and a `StreamingContextScrubber`
strips the fence from streamed output so memory never leaks to the UI — a careful prompt-injection
defense.

The reusable architectural asset is the **pluggable provider layer**: abstract `MemoryProvider`
(`agent/memory_provider.py`) with a rich lifecycle (`prefetch`, `sync_turn`, `on_session_end`,
`on_pre_compress`, `on_delegation`…); `MemoryManager` runs all sync/prefetch work on a **single-worker
background executor** so a slow backend can never stall the turn (the docstring cites a real 298s
Hindsight-daemon stall), and rejects a second external provider. **Honcho** (dialectic user modeling) is
an *optional remote SaaS, off by default* — "the deepening model of who you are" delegates the modeling
to an external service's LLM; it is not Hermes's own algorithm.

**Correction to the README:** "FTS5 session search with LLM summarization" overstates — the
`session_search` tool (`tools/session_search_tool.py`) is **pure BM25 keyword FTS5, explicitly
"zero LLM cost"**, agent-invoked, over a `messages_fts` virtual table (+ trigram table for CJK)
(`hermes_state.py:601-654`). The only LLM summarization of past conversations is the orthogonal
context-compression path.

### The learning loop (L12)

The mechanism is a **forked review agent, turn-count-triggered**: after a turn,
`turn_finalizer.py:393-398` spawns a background review when due. Triggers are **deterministic counters**,
not complexity detection — memory nudge every 10 user turns, skill nudge every 10 tool iterations. The
fork (`agent/background_review.py`) re-uses the same `AIAgent` (inheriting provider/model/credentials/
prefix-cache), **whitelists its toolset to `{memory, skill_manage}`**, replays the conversation snapshot,
and writes straight to the stores — the main conversation and prompt cache untouched.

The skill-review prompt (`background_review.py:45-148`) is genuinely sophisticated: a class-level
"umbrella" library shape, signals to patch a wrong skill "NOW", a 4-step preference order, and a strong
**anti-poisoning** list ("Do NOT capture environment-dependent failures / negative tool claims that
'harden into refusals the agent cites against itself for months'"). This anti-poisoning guidance is the
most thoughtful part of L12.

"Self-improvement" is **prompt-instructed, not usage-measured**. Usage *is* tracked
(`tools/skill_usage.py`: `use_count`, `last_used_at`, lifecycle `active|stale|archived|pinned`), but those
counters drive only lifecycle timers — the curator prompt explicitly says "DO NOT use usage counters as a
reason to skip consolidation… Judge overlap on CONTENT" (`agent/curator.py:391-392`). There is **no closed
metric loop**. The **curator** (`agent/curator.py`) is a second-order, inactivity-triggered (default 7-day)
auxiliary-model task that pins/archives/consolidates *only agent-created* skills, **never auto-deletes**
(archive is recoverable), with the expensive umbrella-merge pass opt-in/off by default — a clean split of
fast per-turn capture vs slow periodic GC. `/insights` (`agent/insights.py`) is analytics (cost/token/usage
dashboarding), **not** part of the feedback loop.

| Stage | Closed? | Evidence |
|---|---|---|
| Experience → reflection | ✅ deterministic | turn-count trigger (`turn_finalizer.py:376-398`) |
| Reflection → durable artifact | ✅ | fork calls `memory`/`skill_manage` → Markdown |
| Artifact → reused next session | ✅ | injected into system prompt; skills reloadable |
| Failure detection → targeted fix | ⚠️ heuristic | model judges from transcript, no metric |
| Usage metric → improvement | ❌ absent | counters drive only lifecycle; curator told to ignore them |

A **closed loop of LLM-authored reflection**, not a learned/optimized one.

### LEARN / AVOID / ORTHOGONAL (L11/L12)

**LEARN**
- **Flat human-readable durable memory beats a DB for the curated layer** — greppable, diffable,
  user-editable, trivially scoped (a scope = a directory). v3 memory scopes can be *directories*, not
  table rows.
- **The forked-reviewer pattern** — a second agent instance, *toolset-whitelisted to memory/skill writes*,
  replaying a conversation snapshot, never touching the primary's prompt cache. Decouples "do the task"
  from "learn from the task" without a bespoke learning subsystem. The cleanest L12 idea in the series.
- **Off-thread, single-worker, serialized memory writes** — turn N lands before N+1; a wedged backend
  never stalls the turn. Directly portable to v3's L11 write path.
- **Two-tier cadence** — fast per-turn capture + slow idle-triggered consolidation/GC (7-day,
  never-delete-only-archive, opt-in LLM merge).
- **The anti-poisoning rules** ("never capture 'this tool is broken' as a durable constraint") — hard-won
  operational wisdom any self-writing memory system needs.
- **Frozen-snapshot injection + streaming scrubber + "reference data, not user input" fencing** — defends
  both prefix-cache and against memory-as-prompt-injection.

**AVOID**
- **Char-count caps with reject-on-full + LLM-only GC** — brittle, model-dependent, silently caps how much
  the agent can know. Scope/segment memory, don't hard-truncate one file.
- **Marketing a fixed-counter reflection prompt as "autonomous self-improvement."** Be honest in v3:
  "periodic LLM reflection," not a closed metric loop.
- **Usage counters tracked but deliberately ignored** for the decisions that matter — close the metric loop
  or don't pay to collect them.
- **Profile-global-only scoping** — v3's L11 wants multiple scopes (per-conversation/per-project), which the
  durable layer lacks.
- **Delegating user-modeling to a remote SaaS (Honcho)** — off by default, so most installs don't get it.

**ORTHOGONAL** — FTS5/trigram transcript search (a useful agent tool, but session-history search, not a
kernel primitive); Honcho; `/insights` analytics; the streaming scrubber (an Anthropic-streaming concern).

---

## L5 — Skills System

**3-sentence verdict.** A Hermes "skill" is a **directory whose `SKILL.md` carries YAML frontmatter +
a Markdown body** — explicitly an adoption of Anthropic's Claude Skills progressive-disclosure model,
made wire-compatible with the **agentskills.io open standard** (`tools/skills_tool.py:11,28`). Skills are
*not* a separate execution primitive: they are **procedural memory injected as prompt context** — a
compact name+description catalog is rendered into the system prompt, and the agent pulls full bodies on
demand through three ordinary tools (`skills_list`, `skill_view`, `skill_manage`). The distinguishing
feature is the **closed lifecycle**: the agent authors new skills from experience, edits them when it finds
gaps, and a background curator auto-ages/archives stale agent-created ones — all over plain files with a
sidecar usage-telemetry JSON, no DB.

### Skill format, registry, invocation

On disk: a directory with a required `SKILL.md` + optional `references/`, `templates/`, `scripts/`,
`assets/` (`tools/skills_tool.py:14-26`). Frontmatter (`:28-49`): `name` (≤64), `description` (≤1024),
`version`, `license`, `platforms`, `compatibility`, `prerequisites.{env_vars,commands}`, and an open
`metadata:` map where Hermes namespaces its own fields under `metadata.hermes.*` (keeping the top level
standard-clean). 174 `SKILL.md` files ship bundled.

Discovery is a **filesystem scan, not a manifest** (`_find_all_skills`, `:602-679`): walk `~/.hermes/skills/`
then read-only external dirs, reading only the first 4 KB of each file. Namespacing is **flat by `name`,
first-seen-wins, local > external** — plugin skills use a qualified `plugin:skill` form (a later bolt-on,
showing the flat scheme didn't scale).

Three invocation paths, **all "inject prompt," none spawn a subflow**: (1) the system-prompt catalog
(`agent/prompt_builder.py:1244`) renders a compact `category → name: description` index with a "you MUST
load it with `skill_view(name)`" instruction (two-layer cached); (2) `skill_view(name)` pulls the full body
on demand (tier-2 progressive disclosure, supporting files loaded only via a further call); (3)
`/<skill-name>` slash inlines the rendered body + template-var substitution + the user's trailing
instruction into the *current* turn (`agent/skill_commands.py:245-344`) — it injects a message, does not fork.

### Lifecycle, sharing, layering

`skill_manage(action ∈ create|edit|patch|delete|write_file|remove_file)` is the single mutation API
(`tools/skill_manager_tool.py:946`); `_create_skill` validates, scans for collisions across all dirs, writes
atomically, then **runs a security scan and rolls back on a block verdict**. Autonomous creation is
**prompt-driven, not a code trigger** — the system prompt says "after difficult/iterative tasks, offer to
save as a skill." Provenance/quality metadata lives in a **sidecar** (`.usage.json`), deliberately out of
`SKILL.md` to avoid merge pressure on vendored skills. Sharing is the **Skills Hub** (agentskills.io): source
adapters + trust tiers (`builtin` / `trusted` allowlist {openai, anthropics, huggingface, NVIDIA} /
`community` — any scan finding blocks unless `--force`), every external install quarantined + scanned by
`tools/skills_guard.py`.

Skills vs tools vs MCP are **three distinct layers**: tools are executable primitives; MCP servers are
external tool providers; **skills are prose that teaches the agent how to orchestrate those tools** (a skill
carries no code path of its own — it references `scripts/` that the agent runs through the ordinary terminal
tool). Plugins are a fourth layer providing `plugin:skill`-namespaced skills.

### LEARN / AVOID / ORTHOGONAL (L5)

**LEARN**
- **Skill = directory + frontmatter'd Markdown, surfaced through 3 generic tools (list/view/manage), with a
  cached compact index pushed into context.** A clean reusable primitive: discovery is a filesystem scan (no
  registry service), the catalog is a cheap always-on prompt block, full bodies are pull-on-demand. Maps
  directly onto v3's "help subflow / skills": `skills_list` = discover, `skill_view` = invoke,
  `skill_manage` = author.
- **Adopt the existing agentskills.io / Claude Skills format rather than inventing one.** Hermes proves
  interop is nearly free (it's just the frontmatter contract + `assets/` convention) and buys a non-empty
  ecosystem (openai/anthropics/huggingface skill repos) on day one. Put v3's own fields under a namespaced
  `metadata.<vendor>` map, keeping the top level standard-clean.
- **Operational telemetry in a sidecar, never frontmatter** — usage/lifecycle churning a shared/vendored
  file creates constant merge conflicts.
- **Lifecycle states + never-auto-delete invariant** (`active|stale|archived|pinned`, archive-only) — a
  distributed kernel where multiple flows author skills needs exactly this: bounded growth without
  destroying recoverable work.
- **Trust-tiered security scan on every external skill** — skills are executable prose carrying
  injection/exfil risk; gate third-party skills with a `builtin/trusted/community` policy.
- **Slash-invocation expands the turn by message injection, not a subprocess** — the cheapest correct
  "help-subflow" semantics is "inline the procedure into the current flow's context."

**AVOID**
- **Flat first-seen-wins namespacing** — for a *distributed* kernel where many flows contribute skills,
  silent collisions resolved by scan order are a footgun. Namespace by owning flow/origin (Hermes bolted on
  `plugin:skill` later).
- **Autonomous creation as a pure prompt instruction with no kernel guardrail** — make skill creation a
  *governed* operation (review/approval state), not a free tool call. (Hermes itself gates gateway skill
  *writes* behind a pending-review queue, `gateway/slash_commands.py:2215`.)
- **A 3,888-line hub module in the kernel** — sharing/registry plumbing belongs *outside* the kernel; the
  kernel knows only "a skill is a directory with this frontmatter" + a verification hook.

**ORTHOGONAL** — the curator maintenance loop (an L12 concern); template-var/inline-shell expansion in skill
bodies (a convenience + injection surface, opt-in if adopted); hub provenance / GitHub-app auth / trust
allowlists (deployment policy).

> **Bottom line for "are skills a clean reusable primitive?"** Yes — Hermes reduces a skill to *a directory +
> standardized frontmatter + three generic tools + a cached prompt index*, with hub/curator/scanner/telemetry
> layered around as optional services. On standard-vs-invent: **adopt agentskills.io.**

---

## L0c/L0e — Actor Adapters & Runtime Context

**3-sentence verdict.** Hermes's adapter layer is a **stateless format-shim registry**, not a session-owning
adapter abstraction: `ProviderTransport` only converts message/tool formats and normalizes responses, while
the AIAgent host owns the *one canonical session representation* — an OpenAI-shaped `messages[]` list — and
every provider (including the stateful, subprocess-based Codex app-server) is **projected back into that
list**. The "run-intent" is not a portable config object but a set of mutable attributes on `AIAgent`
(`api_mode`, `model`, `provider`, `base_url`), with `api_mode` derived from model/provider/URL and used as a
string key into a transport registry; `hermes /model` switches providers by re-deriving `api_mode` and
clearing a transport cache, no code change. The runtime layer (L0e) is the stronger half: a clean
`BaseEnvironment` ABC with six backends behind one string-dispatch factory, two of which (Modal, Daytona)
deliver genuine serverless hibernate/wake keyed by a `task_id`.

### ActorAdapter (L0c)

The interface is `ProviderTransport` (ABC, `agent/transports/base.py:16`): four methods — `api_mode`
(registry key), `convert_messages`, `convert_tools`, `build_kwargs`, `normalize_response →
NormalizedResponse`. Its docstring is explicit: a transport "owns the data path… It does NOT own: client
construction, streaming, credential refresh, prompt caching, interrupt handling, or retry logic. Those stay
on AIAgent" (`base.py:3-7`). It is a **format codec, not a session adapter** — no `start_session`/`resume`/
`serialize_session` on the interface.

There is **no portable AgentConfig object**. The run-intent is scattered mutable state on `AIAgent`, resolved
in `agent/agent_init.py:316-347` into one of five `api_mode` strings; provider switching works because
`api_mode` is a string used to look up a transport in a `_REGISTRY` dict, and `/model` re-runs the resolution
+ clears `_transport_cache`. **Switching = runtime attribute mutation + cache invalidation, not a swapped
config value.**

**Session portability vs paperclip's host-owned `AdapterSessionCodec`: different, weaker as a *primitive* but
arguably cleaner as an *architecture*.** Paperclip persists an opaque `sessionParamsJson` blob per adapter
(adapter owns its session shape, host owns its bytes). Hermes does the opposite: **no opaque session blob
anywhere** — the host owns a *transparent, provider-neutral* session (the `messages[]` list), and anything
provider-specific that must survive replay is smuggled into per-message `provider_data` dicts
(`agent/transports/types.py:38,109` — Anthropic signed-thinking blocks, Gemini `thought_signature`, Codex
`call_id`). Portability is achieved by **normalization-into-a-shared-shape + a per-message escape hatch**, not
an opaque codec.

The **Codex session-projection pattern** is the standout: `CodexAppServerSession`
(`codex_app_server_session.py:191`) spawns the `codex` binary as a subprocess that owns its *own* thread
internally; Hermes does **not** persist or resume that `threadId`. Instead `CodexEventProjector`
(`codex_event_projector.py:69`) translates Codex's `item/*` notifications into the standard `{role, content,
tool_calls}` shape, returns `TurnResult.projected_messages`, and the host splices them into `messages[]`. **The
host-owned list IS the durable session; the foreign thread is disposable.** Tool-call IDs are made
deterministic (`_deterministic_call_id`) so replay/prefix-cache stays valid across respawns — a manual
reimplementation of what paperclip's codec would handle opaquely.

### RuntimeContext (L0e)

`BaseEnvironment` (ABC, `tools/environments/base.py:288`) — subclasses implement just `_run_bash() →
ProcessHandle` and `cleanup()`; the base provides a unified spawn-per-call `execute()` (fresh `bash -c`,
session env/functions snapshotted once at init and re-sourced per command, CWD persisted via stdout markers).
SDK backends with no real subprocess return a `_ThreadedProcessHandle` adapting a blocking `exec_fn` to the
`ProcessHandle` protocol.

Six backends via string dispatch (`tools/terminal_tool.py:1225`): `local`, `docker`, `singularity`, `modal`,
`daytona`, `ssh`. Hibernate/wake, both keyed by `task_id`: **Daytona** = sandbox stop/start of a named sandbox
(`hermes-{task_id}`), resuming a stopped sandbox's filesystem; **Modal** = filesystem snapshots
(`sandbox.snapshot_filesystem()` → image id in a host JSON store → restore by `Image.from_id`). Crucially,
**neither relies on the sandbox alone for durable agent state** — both wrap a `FileSyncManager` that mirrors the
host's `~/.hermes/` into the sandbox and syncs back, so the sandbox FS is **cache, not source-of-truth**.

Tools reach the agent across adapters in-band for native transports; for the out-of-process Codex adapter,
Hermes runs a **stdio MCP server** (`hermes_tools_mcp_server.py`) exposing a *curated stateless subset* and
**withholding** stateful agent-loop tools (`delegate_task`/`memory`/`session_search`/`todo`) — "a stateless MCP
callback can't drive them." The key tell: **the MCP boundary can only carry stateless tools.**

### LEARN / AVOID / ORTHOGONAL (L0c/L0e)

**LEARN**
- **Host-owned canonical session as the portability primitive** — keep ONE provider-neutral session shape
  that the host owns, make every adapter project into it. For a *distributed* kernel this is attractive: the
  session is inspectable/diffable/serializable by the kernel without adapter cooperation. The Codex projector
  is the reference example of folding a foreign stateful agent's event stream into the host's shape.
- **The `provider_data` per-message escape hatch** — opaque per-turn sidecar for non-portable replay state
  (signatures, call-ids) riding alongside the neutral shape. v3 session records should carry an equivalent.
- **String-keyed transport registry + cache-invalidation on switch** — dead-simple, right altitude for "swap
  the actor backend without touching the step"; `api_mode` derived from `(provider, base_url, model)` is a
  clean testable resolution function.
- **`BaseEnvironment` is a genuinely good L0e abstraction** — a two-method ABC with a shared `execute()`; the
  `_ThreadedProcessHandle` adapter lets SDK-only backends satisfy the same protocol (the seam v3 needs for
  remote/CCR backends).
- **Hibernate keyed by stable `task_id` + host-side FileSync of agent state** — "sandbox FS is cache, host owns
  durable agent state, re-push on wake." Directly applicable to v3's idle-hibernation, and avoids trusting the
  sandbox to survive.

**AVOID**
- **Run-intent as mutable attributes on a god-object (`AIAgent`)** with a manually-invalidated cache — hostile
  to a kernel that must serialize/replay run-intent across machines. v3 wants a real immutable `AgentConfig`
  value object, which Hermes lacks.
- **No durable adapter-session resume** — Hermes can't pause a Codex thread and resume it; only the *environment*
  hibernates, not the *conversation*. Don't copy "the thread is disposable" wholesale if v3 wants both.
- **The stateful/stateless tool split at the MCP boundary** — if v3's actor adapters are out-of-process, design
  tools as stateless-callable-with-explicit-context from day one or hit this same wall.
- **The volume of provider-quirk special-casing** (14-line thinking-block-order comment, version-drift key
  cross-filling) — the real cost of supporting many backends through format-shims; budget for it.

**ORTHOGONAL** — credential refresh/prompt-caching/retry/streaming/interrupt deliberately kept on the host (a
boundary-drawing lesson, not a mechanism); the local-execution process machinery; Modal's managed-vs-direct
Nous-product routing.

---

## L6/L4 — Triggers, Cron & Subagent Spawning

**3-sentence verdict.** Hermes's scheduler is a **file-backed, in-process cron daemon**
(`~/.hermes/cron/jobs.json` + a 60s ticker holding an OS file lock) where every fired job spins up a **fresh,
fully-isolated single-turn AIAgent session** whose final message is routed to a configured chat platform — no
DB, no queue, no central orchestrator. Its spawn primitive (`delegate_task`) makes a child a **full
first-class `AIAgent` instance** with its own `session_id`, transcript in the shared SQLite store, and
`parent_session_id` linkage, run on a thread pool and correlated back by collecting each child's
`final_response` into a `results[]` JSON array. The architecture is deliberately **provider-pluggable**
(`CronScheduler` ABC) so a managed "Chronos" provider can replace the in-process ticker with externally-armed
one-shots for scale-to-zero.

### Triggers & cron (L6)

Schedules parse into one of three `kind`s by `parse_schedule` (`cron/jobs.py:289`): `interval` (`"every 30m"`),
`cron` (5–6-field expr via `croniter`), `once` (ISO timestamp/duration). There is **no NL→schedule LLM
translation** — the "natural language" in the README is the *job prompt*, not the *schedule grammar*. Storage
is plain JSON (`jobs.json`), atomic writes (tempfile+fsync+replace) under a **dual lock** (in-process `RLock` +
cross-process `flock`).

**Firing is at-most-once via pre-advance**: `tick()` (60s) takes a non-blocking `flock` (overlapping ticks
no-op), gets due jobs, then **advances `next_run_at` for every recurring job BEFORE execution**
(`scheduler.py:2163` → `jobs.py:1034`) — "missing one run is far better than firing dozens in a crash loop."
Plus a **catch-up grace window** (a long-missed run is fast-forwarded, not back-filled) and parallel execution
on a thread pool (except `workdir` jobs, which serialize because they mutate process-global `TERMINAL_CWD`).
For multi-replica there's a real store-level **CAS**: `claim_job_for_fire` (`jobs.py:1080-1125`) stamps a
`fire_claim` with a 300s stale-TTL under the lock and advances the schedule, so exactly one replica wins and a
dead claimant self-heals.

Delivery (the L6↔L8 seam) is **resolved at fire time, not create time** (`scheduler.py:587-590`) via a
`deliver` field (`local`/`origin`/platform-name/`telegram:-1001:17`/`all`), written into per-job ContextVars
(deliberately *not* the session-identity vars — a cron run is internal). Delivery failure is tracked
**separately** from agent failure. Each fire is a throwaway session `cron_{job_id}_{ts}` with
`skip_memory=True`, persisted for `session_search`. The provider abstraction (`CronScheduler` ABC,
`scheduler_provider.py`) splits "when it fires" (provider) from "what firing means" (shared `run_one_job`) —
"providers must never reimplement agent construction or delivery"; the **Chronos** contract
(`docs/chronos-managed-cron-contract.md`) replaces the ticker with NAS-armed external one-shots (agent computes
`next_run_at`, POSTs an idempotent `provision`, NAS calls back with a short-lived `purpose=cron_fire` JWT, agent
re-arms). **Blueprints** (parameterized templates with typed slots) and **suggestions** (consent-first, dedup-
latched proposals) both compile down to the *same* `create_job` — "no second job engine."

### Subagent spawning (L4)

**First-class run, not a lightweight helper.** `delegate_task` (`tools/delegate_tool.py:2065`) builds each
child as a real `AIAgent` with its own model/provider/credentials (can route to a *different*, cheaper provider
than the parent), own iteration budget, `platform="subagent"`, and its **own `session_id`** persisted to the
shared `session_db` with `parent_session_id` linkage. A child has a full lifecycle and a real transcript —
comparable to the DBOS/omnigent "full instance" finding. It is **NOT first-class in durability**: it's an
in-memory thread, not a crash-resumable durable workflow.

Correlation: parent mints `subagent_id = f"sa-{task_index}-{uuid[:8]}"` + `parent_subagent_id` chaining nested
trees; live progress relays through a per-child callback threading `subagent_id`/`depth` into every event, plus
a heartbeat propagating child activity to the parent's `_touch_activity` so the gateway timeout doesn't kill a
parent whose children are busy. Isolation: `skip_context_files`/`skip_memory`/`quiet_mode`, toolsets
**intersected with the parent** ("must not gain tools the parent lacks"), bounded by `max_spawn_depth` (default
2), `max_concurrent_children`, a `leaf` vs `orchestrator` role, and an operator kill-switch.

Result return: `_run_single_child` shapes a structured dict (`final_response → summary`, `status`, `api_calls`,
`tokens`, reconstructed `tool_trace`); batch mode runs children on a `ThreadPoolExecutor`, sorts by
`task_index`, returns `json.dumps({"results":[...]})`. Child cost/tokens **fold back into the parent's session
total** (nested trees roll up). The `background=true` variant returns a `{status:"dispatched",delegation_id}`
handle immediately and, on completion, pushes a self-contained payload onto a shared `completion_queue` that
**re-enters the conversation as a brand-new idle turn** — chosen so it never splices between a tool result and
an assistant message (preserving role alternation + prefix cache). The "RPC tools / zero-context-cost turns" is
a *separate* mechanism — `execute_code` / Programmatic Tool Calling, where a generated Python script calls tools
over a Unix-domain-socket RPC so intermediate results never enter the context window. `batch_runner.py` is an
orthogonal offline trajectory/training harness.

### LEARN / AVOID / ORTHOGONAL (L6/L4)

**LEARN**
- **Pre-advance `next_run_at` before execution = at-most-once without distributed locks** — a crash drops one
  run instead of a storm. The cheap correctness trick for L6 firing.
- **`claim_job_for_fire` store-CAS with a stale-TTL** — a dependency-free exactly-once-across-replicas pattern
  (claim under lock, stamp `(at, by)`, advance, 300s TTL → dead claimant self-heals). Directly applicable to a
  v3 distributed trigger.
- **Split "when it fires" (provider) from "what firing means" (shared body)** — exactly the kernel/primitive
  separation v3 wants: trigger pluggable, execution+delivery contract fixed and reused. The Chronos scale-to-
  zero contract (agent-computed `next_run_at` + external one-shot + idempotent upsert by dedup_key + re-arm) is
  a strong model with a clean short-lived-JWT trust story.
- **Delivery resolved at fire time + delivery-error tracked separately from agent-error** — the L6↔L8 seam
  should be late-bound and distinguish "the run failed" from "succeeded but couldn't deliver."
- **L4 result-as-a-new-turn** — correlating a child back by forging a fresh idle turn (never splicing into live
  context) keeps role-alternation + prefix-cache invariants intact. A precise answer to "how does a child
  result re-enter the parent."
- **Child cost/token roll-up into the parent** — nested spawn trees aggregate spend bottom-up.
- **Templates/suggestions as thin front-ends over one `create_job`** — "no second job engine."

**AVOID**
- **JSON-file storage with hand-repair paths** — workable single-host, but a distributed v3 kernel needs a real
  transactional store, not flock-guarded JSON.
- **Process-global mutable env (`TERMINAL_CWD`) forcing `workdir` jobs to serialize** — per-run state leaking
  into `os.environ` is a parallelism foot-gun (they already moved *delivery* to ContextVars; finish the job).
- **Children are in-memory threads, not durable instances** — a parent crash loses all in-flight children with
  no resume. If v3 wants L4 children to be "full first-class runs," they must also be durable/resumable. Hermes
  is first-class in *identity/transcript* but not in *durability*.
- **`max_iterations` silently ignored + budgets that let total spend exceed the parent's cap** — fan-out cost is
  unbounded by design; v3 should make the aggregate budget a hard enforced ceiling.

**ORTHOGONAL** — `batch_runner.py` (offline training harness); `execute_code`/PTC UDS-RPC (a context-window
optimization, only the *name* "RPC" overlaps); the TUI JSON-RPC transport and ensemble tool.

---

## L7/L3 — Grants, Credentials & Human Approval

**3-sentence verdict.** Hermes is a **single-trust-domain, env-var-native** agent: credentials live as
plaintext-equivalent environment variables in `os.environ` (from `~/.hermes/.env`, optionally hydrated at
startup from Bitwarden Secrets Manager), and the security model is honest that anything running *inside* the
process — skills, plugins, the LLM-driven shell — can read them (`SECURITY.md:130-135`). There is **no broker,
no secret-ref indirection, no per-use mediation**: the "credential-never-travels" property holds only in the
weak sense that the LLM is *instructed* not to echo secrets and provider keys are *blocklist-stripped* from
subprocess env by default — both explicitly labelled "useful… not boundaries." Its real strength is L3: a
layered, pattern-based command-approval gate (hardline floor → yolo → allowlist → 47 danger patterns →
per-session/permanent approval) bridged into ACP's `request_permission`, plus a well-engineered DM-pairing flow
— but **none of the approval decisions are persisted as an audit record**, placing Hermes between symphony's
anti-pattern and paperclip's audited decision row.

### Grants & credentials (L7)

Bitwarden is a *startup hydration source, not a runtime broker*: `apply_bitwarden_secrets()` loops
`os.environ[key] = value` (`agent/secret_sources/bitwarden.py:660-671`), so once loaded a BSM secret is
indistinguishable from a plaintext `.env` secret. The credential does **not** enter the LLM context (by
instruction + redaction, not architecture: `prompt_builder.py:476-477` "Do NOT type passwords/API keys…ever";
output redaction; "A motivated output producer will defeat it", `SECURITY.md:148`). But **the actual secret
value travels into the subprocess the agent spawns** — the shell runs with a sanitized copy of `os.environ`
where the sanitizer is a **blocklist** (`_HERMES_PROVIDER_ENV_BLOCKLIST`, `tools/environments/local.py:206`):
provider keys stripped by default, operator/skill-declared vars pass through, "reduces casual exfiltration. It
is not containment."

**vs paperclip:** Paperclip used a **UUID secret-ref + host-side broker** — the agent holds an opaque
reference, the broker substitutes the real secret at the moment of use, the secret *never enters agent context
at all* (enforced by architecture: you cannot deref without the broker). Hermes has **no such indirection** —
the secret is a live env-var string the whole time; "uses a credential without seeing it" holds only because
the LLM is told not to print it and a blocklist tries to keep provider keys out of child processes. **Hermes is
the counter-example of how *not* to scope credentials within a single process** — its own SECURITY.md says the
real boundary must come from an external whole-process wrapper (NVIDIA OpenShell, "credentials injected from a
Provider store, never touch the sandbox filesystem" — *that* is the paperclip-shaped design, which Hermes
delegates outward rather than implementing). Grant scoping is **coarse/process-global**; the README's
"per-backend" refers to Tool-Gateway routing (which backend serves which tool), not capability-grant
granularity. Network egress isolation (Docker `internal`/`egress` networks + optional squid allowlist) is a
deployment control, explicitly "not a substitute for a sandbox backend."

### Human approval (L3)

Command approval (`tools/approval.py`, 1944 lines) pipeline (`check_dangerous_command`, `:1136-1240`):
containerized backends bypass → **hardline floor** (~13 unrecoverable patterns blocked unconditionally, *below*
yolo — a tier even the operator's `--yolo` cannot cross) → yolo bypass (**frozen at import time** so a skill
can't set it mid-run to escalate) → permanent allowlist (fnmatch globs in `config.yaml`) → **47 danger
patterns** over a normalized command (ANSI-stripped, NFKC-folded, de-escaped to defeat obfuscation) → per-
session approval → resolution (CLI prompt / gateway async queue / ACP `permissions.py` / optional smart-approve
aux-LLM). Three persistence tiers: per-call, per-session (in-memory dict), permanent (`config.yaml`).

Edit approval (`acp_adapter/edit_approval.py`, ACP sessions only) builds an `EditProposal` (path + diff) for
`write_file`/`patch`, surfaces it as an ACP `request_permission`, and **fails closed**; session-scoped auto-
approve policies can bypass **except** sensitive paths always ask (`.env*`, `id_rsa`, `.git`, `.ssh`). The ACP
permission bridge maps Hermes's `once/session/always/deny` onto ACP `PermissionOption` kinds with a 60s
timeout → auto-deny.

**Audit durability — the key finding.** **None of these decisions are persisted as an audited record.** A grep
for `decision_record|execution_decision|approval.*audit|CREATE TABLE.*approv` returns **zero hits**. Approval
state lives in process-global in-memory structures + the `config.yaml` allowlist. There are plugin lifecycle
*hooks* (`pre_approval_request`/`post_approval_response`) an operator *could* wire to a log, but no built-in
transactional record of "who approved what, when, with what recommendation+override."
- **vs symphony (unaudited anti-pattern):** *better* — the approval is a real fail-closed gate in the execution
  path (with a hardline floor), not ephemeral ticket state — but it shares the core defect: **the decision
  leaves no durable, queryable audit row**. A `session` approval evaporates on restart; an `always` approval is
  an undifferentiated allowlist line with no timestamp/actor/justification.
- **vs paperclip (audited `issue_execution_decisions`):** Hermes has **no equivalent.** Paperclip recorded a
  transactional decision row durably; Hermes records, at most, a config-file mutation. **Paperclip remains the
  reference; Hermes shows a mature *gate* without the *ledger*.**

DM pairing (`gateway/pairing.py`) is the strongest single component — near-textbook out-of-band human-
authorization: only a salted SHA-256 hash persisted, constant-time `compare_digest`, 1-hour TTL, rate limits,
lockout enforced on *both* issue and redeem, atomic 0600 writes (OWASP/NIST SP 800-63-4). **But the pairing
approval is also unaudited** (`approved.json` stores `{user_name, approved_at}` — a state file, no record of
*which operator* approved). `acp_adapter/provenance.py` is **session-lineage** provenance (parent/root session
ids for compression chains), not approval or credential provenance — it does not close the audit gap.

### LEARN / AVOID / ORTHOGONAL (L7/L3)

**LEARN**
- **The hardline floor below the bypass** — a tiny irreversible-only blocklist that even "yolo" cannot cross.
  v3's L3 gate should have an equivalent "no override possible" tier for unrecoverable kernel operations.
- **Freeze the bypass flag at boundary entry, not per-call** — reading a yolo/bypass var on every check is a
  prompt-injection escalation path. Snapshot trust-level flags at boundary entry.
- **Normalize before matching** (ANSI strip, NFKC fold, de-escape, absolute→`~`) — any v3 string-based policy
  check needs this.
- **DM-pairing crypto hygiene** — hash-only storage, constant-time compare, lockout on both issue and redeem,
  atomic 0600 writes. A reusable out-of-band human-authorization primitive.
- **Fail-closed approval bridging** (timeout + requester-exception both deny) and **sensitive-path always-ask
  override** (even autonomous policies can't auto-approve `.env`/`.ssh`/`.git` edits).

**AVOID**
- **The unaudited decision (the central anti-pattern).** v3's L3 gate MUST write a durable transactional
  decision record (recommendation + human choice + actor + timestamp + correlation id) — exactly paperclip's
  `issue_execution_decisions`. Do not repeat Hermes's in-memory + config-file approach.
- **Single-trust-domain credential model** — splatting secrets into a process-global `os.environ` the LLM-
  driven shell + every skill + every plugin can read is the antithesis of credential-never-travels. v3's L7
  must enforce broker/ref indirection *architecturally*, not request it via prompt + best-effort redaction.
- **Blocklist for credential filtering** — allowlist secret exposure, never blocklist it; a new provider key
  not yet on the blocklist leaks into every subprocess by default.

**ORTHOGONAL** — Bitwarden startup hydration (a storage source, independent of the brokering contract; reuse
its lazy-binary-install + SHA-256-verify + 0600-cache pattern if v3 shells out to a secrets CLI); network
egress isolation (deployment control); session-lineage provenance (a session/lifecycle concern); Tool-Gateway
per-backend routing (a billing/routing choice, not grant granularity).

---

## L0a/L0b — Kernel, Session Model & the ACP Seam

**3-sentence verdict.** Hermes has a real, well-engineered **persistence layer** — a single shared SQLite
store (`state.db`) with `sessions` + `messages`, FTS5 search, WAL + jitter-retry concurrency, incremental
message flushing on every loop exit-path — so it survives crashes *far better than symphony* and lands
**between symphony and paperclip, well short of DBOS**. But it is fundamentally a **mutable conversation-history
store, not a durable-execution kernel**: there is no event log of *operations*, no `op_id`/idempotency key, no
`expected_version` optimistic-concurrency, no exactly-once replay of side-effects — a crash mid-turn re-runs the
entire turn from the last-persisted message boundary (LLM call and tool side-effects included), it does not
resume a half-finished operation. The "transcript" is the chat transcript (model messages), not a transcript of
kernel operations.

### Session/kernel model (L0a)

Storage is one SQLite DB; schema is `sessions` (aggregate row: counters, billing, `rewind_count`,
`parent_session_id`, `end_reason`) + `messages` (child, autoincrement `id`, `role`/`content`/`tool_calls`/
`active`) — `hermes_state.py:509-590`. **There is no operation/event table**; `messages` rows are model-protocol
messages, not `EventEnvelope`s. A grep for `idempoten|op_id|expected_version|optimistic|ON CONFLICT` finds
nothing in the state store — the only "idempotent" constructs are `INSERT OR IGNORE` on the session PK and
schema bookkeeping. Concurrency is at the *transaction* level (`BEGIN IMMEDIATE` + 15-retry random-jitter
backoff vs `SQLITE_BUSY`), **not** the operation level — no `(instance_id, op_id)` uniqueness that would make a
re-applied operation a no-op. **This is the decisive gap vs DBOS** (whose `operation_outputs` PK
`(workflow_uuid, function_id)` *is* the exactly-once mechanism).

Source of truth during a turn is the **in-memory `messages` list; the DB is a write-behind snapshot**:
`_persist_session` (`run_agent.py:1499`) is called at ~20 branch/exit points, flushing via object-identity
tracking (`id(msg)` in a set — an idempotent *flush*, but keyed on in-process object identity, **not a persisted
idempotency key**, so no cross-restart exactly-once). Crash-mid-turn: partial transcript survives; the **turn
restarts, it does not resume** — a tool that ran but wasn't followed by a persist re-runs on the next attempt
(the side-effect is not transactionally tied to a durable operation record). `load/resume_session`
(`acp_adapter/server.py:1129-1209`) reload the full conversation and *replay it to the client*, then the agent
runs forward again — durable **chat state**, not durable execution. `/undo` = soft-delete (`active=0`, kept for
forensics); `/retry`//compress = `replace_messages` (DELETE + re-insert the entire history) — an audit-feed-
over-mutable-row model, close to **paperclip's** mutable-state + audit pattern.

### The ACP protocol seam

ACP is the third-party `agent-client-protocol` library (JSON-RPC over stdio); **Hermes implements the
`acp.Agent` server interface** (`acp_adapter/server.py:446`), so the event types and session/run lifecycle are
defined by the *spec*, not by Hermes — a clean, typed, externally-specified seam. Lifecycle RPCs: `initialize` →
`authenticate` → `new_session`/`load_session`/`resume_session`/`fork_session`/`cancel`/`prompt`/
`set_session_model`/`set_session_mode`. A turn is `prompt(session_id, blocks[]) -> PromptResponse(stop_reason)`.
The event stream is typed `session/update` notifications, but the vocabulary lives in `acp.schema`; Hermes's
`acp_adapter/events.py` is purely a **callback bridge** (translating internal AIAgent callbacks into ACP
`ToolCallStart`/`AgentThoughtChunk`/`AgentPlanUpdate` updates, fired threadsafe onto the event loop).

**Drivability: yes for chat, no for durable execution.** An external client *can* drive Hermes (new/load/resume/
prompt/cancel + stream tool-calls/plans) — Zed, Claude Code, OpenCode already do — with a stable session-id
handle and vendor lineage carried non-intrusively under `_meta.hermes.sessionProvenance`. **But the seam exposes
*turns*, not *operations*:** no `op_id` on `prompt`, no idempotency token to replay safely, `cancel` is best-
effort cooperative interrupt (not a durable abort). An orchestrator gets **at-least-once turn** semantics, not
exactly-once.

### L0b — actors & context-packet

**Actors are NOT first-class.** A grep for `Actor|actor_id|context_packet|role→actor` returns nothing; "who is
acting" is only the OpenAI-style `messages.role` string (`user`/`assistant`/`tool`/`system`). Closest is
`sessions.user_id` + `sessions.source` (`'cli'/'telegram'/'acp'`) — origin tags, not a modeled actor. **No
context-packet abstraction** — a turn's input is the raw `conversation_history` list passed into
`agent.run_conversation(...)`; the per-session object `SessionState` is an execution-context holder, not a typed
context-packet. `gateway/shutdown_forensics.py` does **not** checkpoint in-flight turn state — it snapshots *who
killed us* (`/proc/<pid>` ppid/cmdline/signal) for debugging; durability on shutdown relies entirely on the
loop's exit-path flushes having already run.

### LEARN / AVOID / ORTHOGONAL (L0a/L0b)

**LEARN**
- **Single-table append-with-soft-delete + atomic-full-replace** is a pragmatic, debuggable durability floor
  that beats symphony's no-kernel approach cheaply. `rewind_to_message` keeping `active=0` rows for forensics is
  a clean "undo with audit trail" worth stealing for v3's Transcript.
- **Application-level write-contention handling** (`BEGIN IMMEDIATE` + random-jitter retry to break SQLite's
  deterministic-backoff convoy) is transferable to any single-writer durable store, including a v3 SQLite-backed
  kernel variant. So are **malformed-DB self-repair** and **WAL-with-DELETE-fallback for NFS**.
- **The ACP seam is exemplary** — implementing a *third-party typed protocol* rather than inventing one means
  external orchestrators (Zed/Claude Code) drive Hermes for free, with a clean request/response + streaming-
  notification split and a stable session handle. **v3's "drivable by an external orchestrator" goal is exactly
  this shape — adopt a spec, expose lifecycle RPCs + a typed update stream.** The `_meta.hermes.sessionProvenance`
  extension shows how to carry vendor lineage without breaking spec clients.

**AVOID**
- **Treating the chat transcript as the execution log.** Hermes conflates "messages" (model protocol) with
  "what the kernel did," so there is no operation-level idempotency — a crash re-runs LLM calls and re-executes
  tools. **v3 must keep its `EventEnvelope`/op-log separate from model messages and key idempotency on
  `(instance_id, op_id)`.**
- **Object-identity-based flush dedup** (`id(msg)` set) — clever in-process, **zero cross-restart exactly-once**
  guarantee; the trap of "idempotent flush" masquerading as "idempotent operation."
- **Full-history `replace_messages` (DELETE+reinsert) per mutation** — O(history) rewrite, antithetical to an
  append-only event-sourced kernel.
- **Best-effort cooperative cancel with no durable abort record** — an orchestrator can't know whether a
  cancelled operation's side-effects landed.

**ORTHOGONAL** — FTS5/trigram search, compression-driven session splitting, billing/token columns, the
multi-platform gateway (product features irrelevant to the kernel question); provider/runtime resolution, MCP
registration, edit-approval policy (agent-runtime concerns).

> **Bottom line:** Hermes does **not** have a durable-execution kernel in the L0a sense — no operation event log,
> no idempotency keys, no `expected_version` CAS, no resume-mid-operation. It has a genuinely solid *durable
> chat-session store* that places it clearly above symphony but below paperclip and far below DBOS. The ACP seam
> is the strongest asset, but it exposes *turns*, not *operations* — at-least-once, not exactly-once.

---

## Second-pass deltas — what the independent 10-lens pass adds

These are not replacements for the slices above. They are the extra or sharper findings
from a separate pass performed before this report was reread.

### 1. The state model has multiple adjacent truths, not one weak truth

The first-pass kernel verdict is right but slightly too coarse. Hermes does not have
one accidental source of truth; it has several: `state.db` for chat sessions and
messages, gateway session-key/session-id routing maps, `jobs.json` for cron, a shadow
Git checkpoint store, compressed-message lineage, and in-memory API run streams. Each
one works locally, but there is no durable operation envelope tying them together.

Two details matter for v3. First, Hermes already separates **canonical transcript** from
**provider/API projection** in places: thinking-signature recovery rebuilds
`api_messages` without mutating canonical `messages` (`agent/conversation_loop.py:2447`,
`:2458`). That separation is worth copying. Second, compression has lineage semantics:
root/tip projected sessions are tracked in `hermes_state.py` (`:2297`, `:2917`, `:2938`).
v3 should make both distinctions explicit in the model instead of reconstructing them
from helper behavior.

The shadow Git checkpoint system is another useful but separate truth:
`tools/checkpoint_manager.py` defines per-session checkpoint repositories and commands
(`:1`, `:10`, `:13`, `:38`, `:601`, `:649`), and tool execution hooks it around writes
(`agent/tool_executor.py:905`, `:917`). That is valuable for workspace rollback, but it
is not a substitute for operation idempotency.

### 2. Recovery is a policy matrix, not just "retry the turn"

Cron has a more nuanced recovery policy than the first-pass summary suggests. Recurring
jobs advance before execution (`cron/jobs.py:1034-1043`), so a failed run is usually
skipped rather than duplicated; one-shot jobs use different retry/terminal behavior
(`cron/scheduler.py:2158-2164`). External scheduler dispatch adds a short-lived
`fire_claim` lease (`cron/scheduler_provider.py:85-105`; `cron/jobs.py:1080-1124`), and
recovery can repair, skip, fast-forward, retry, or terminalize malformed schedule state
(`cron/jobs.py:1152-1221`).

This is a useful v3 distinction: lifecycle recovery should be a table of explicit
policies per operation class, not a single global retry rule. Hermes also uses shutdown
cause and exit code as recovery evidence (`gateway/status.py:862-879`, `:991-1007`;
`gateway/run.py:17224-17300`, `:17495-17508`). The avoid case is equally important:
`Future.cancel()` is not a hard abort for an already-running tool
(`agent/tool_executor.py:572-604`), and provider notify/reconcile paths remain
best-effort.

### 3. Ownership has better local contracts than the report credited

Hermes has a good local pattern for worker ownership in Kanban/task processing: a live
concurrency cap counts already-running tasks, not just tick spawn budget
(`hermes_cli/kanban_db.py:6115`, `:6186`, `:6221`;
`tests/hermes_cli/test_kanban_per_profile_cap.py:73`). Lease renewal must prove
ownership by matching the claim token (`hermes_cli/kanban_db.py:3171`), with stale/crash
reclaim paths nearby (`:3202`, `:5530`).

The v3 lesson is to model claim, heartbeat, and reclaim as one ownership contract. The
cron provider split points the same way: trigger providers select delivery windows but
do not own execution semantics (`cron/scheduler_provider.py:10`;
`cron/scheduler.py:2040`). Avoid file locks, process-local `_running_job_ids`, and any
fail-open lock behavior as correctness mechanisms.

### 4. Runtime context is propagation, while `TurnContext` is a side-effect boundary

Hermes has several good context-propagation mechanisms that are distinct from its
agent-core state mutation. Platform registration is explicit through a registry and
factory path (`gateway/platform_registry.py:38`, `:48`, `:144`, `:208`), and
session/runtime context is propagated with contextvars (`gateway/session_context.py:1`,
`:10`, `:51`, `:101`, `:174`; `agent/runtime_cwd.py:1`, `:20`).

The caution is `TurnContext`: it heavily mutates the agent and runtime surface
(`agent/turn_context.py:15`, `:37`, `:91`, `:95`, `:112`, `:144`). v3 should keep
propagated execution context as explicit values and avoid turning the per-turn object
into an implicit side-effect orchestrator. The same applies to adapters: `PluginLLM`
is a host-owned facade (`agent/plugin_llm.py:17`, `:28`, `:33`, `:34`, `:50`, `:202`),
and code execution uses parent-mediated RPC/capability-token mechanics
(`tools/code_execution_tool.py:8`, `:59`, `:259`, `:1108`, `:1212`, `:1222-1232`).
Those are the right shapes; mega-adapter branching is the part to avoid.

### 5. Security boundaries are sharper at the surface than in the credential model

Hermes's best security lesson is that a session id is a routing handle, not authority.
The security docs say external surfaces must fail closed (`SECURITY.md:192`, `:202`,
`:207`), and gateway authorization defaults to deny (`gateway/authz_mixin.py:176`,
`:311`, `:325`). Slack approval callbacks perform independent authorization before
bridging decisions (`gateway/platforms/slack.py:3026`, `:3086`, `:3205`, `:3216`).

Approval state itself is still not a durable audit ledger, but it has useful mechanics:
session-scoped queues, timeout-deny behavior, and explicit pending records
(`tools/approval.py:32`, `:109`, `:681`, `:728`, `:1553`). Credential scoping also has
a better local primitive than the process-global critique alone implies:
context-local secret scope defaults closed (`agent/secret_scope.py:1`, `:123`, `:149`).
v3 should combine those with paperclip's broker/ref architecture. Do not treat
heuristic prompt rules (`SECURITY.md:137`, `:142`), non-interactive auto-approval
(`tools/approval.py:1183`, `:1197`, `:1421`), write-approval opt-in
(`tools/write_approval.py:18`, `:74`, `:264`, `:279`), or narrow MCP heuristics
(`hermes_cli/mcp_security.py:1`, `:64`) as hard boundaries.

### 6. Delegation is turn-scoped; scheduling is the durable shape

The first pass correctly says Hermes subagents are not durable. The sharper distinction
is that `delegate_task` is a turn-scoped convenience, while cron/Kanban are the durable
or semi-durable orchestration shapes. The delegation docs warn that parent interruption
can lose work (`tools/delegate_tool.py:2858-2864`; see also
`website/docs/user-guide/features/delegation.md:227-239`).

Hermes does have good scoping ideas for spawned work: child toolsets are intersected
with parent capability (`tools/delegate_tool.py:44-52`), cron has a denylist
(`cron/scheduler.py:115-160`), and per-job toolsets are explicit
(`tools/cronjob_tools.py:843-850`). Fan-in must not be inferred from context injection:
cron's `context_from` passes latest output (`cron/jobs.py:653-655`;
`tools/cronjob_tools.py:830-840`) but is not a dependency gate. Kanban parent links are
closer to a true gate (`skills/devops/kanban-orchestrator/SKILL.md:118-120`).

### 7. Inbound message events and outbound presentation streams should stay separate

The existing L8/L9 section captures `MessageEvent` + `SessionSource`. The additional
point is to preserve a separate outbound event model for presentation streams. Hermes
has inbound platform normalization, outbound streaming consumers, and API/SSE relay
events as different concerns (`gateway/platforms/api_server.py:1626`, `:1632`, `:1655`,
`:1666`, `:1683`).

v3 should make that split explicit: inbound normalized command/message envelopes,
internal durable operation events, and outbound presentation/progress events are not
the same type. Avoid ad-hoc string event names and callback-only surfaces
(`gateway/stream_events.py:11`; `agent/tool_executor.py:437`, `:1353`;
`gateway/platforms/api_server.py:1659`). Also keep platform routing exceptions outside
the correlation oracle; correlation should be deterministic and inspectable.

### 8. Memory is four layers, not one "memory system"

Hermes really has four knowledge layers: frozen declarative memory (`MEMORY.md` and
profile files), searchable transcript DB, procedural skills, and ephemeral provider
recall. Dynamic recall is injected into the current user message, not persisted as
history (`agent/conversation_loop.py:716`, `:719`, `:767`). Skills are indexed by
frontmatter/description and only expanded through progressive disclosure
(`tools/skills_tool.py:9`, `:28`, `:687`, `:862`;
`agent/prompt_builder.py:1244`, `:1251`, `:1258`, `:1426`).

The sidecar model for usage/provenance is worth copying: skill use is tracked outside
frontmatter (`tools/skill_usage.py:1`, `:8`, `:18`, `:622`). The avoid case is treating
long-term memory as a progress ledger (`agent/prompt_builder.py:144-156`). v3 should
scan assembled context after expansion, not just raw user input; Hermes's cron prompt
assembly includes that kind of late scan (`cron/scheduler.py:1094`, `:1115`, `:1144`,
`:1297`).

### 9. Operator UX is embedded; API observability is too ephemeral

Hermes's desktop UX provides a concrete v3 pattern: show operational state inside the
work surface. Composer status has a stack of active states
(`apps/desktop/src/store/composer-status.ts:11`, `:58`, `:123`, `:132`), subagents have
their own trace store (`apps/desktop/src/store/subagents.ts:13`, `:31`), and the agent
view exposes subagent progress in context (`apps/desktop/src/app/agents/index.tsx:321`,
`:324`, `:373`). Gateway controls and preview-console state are also first-class
surface elements (`apps/desktop/src/app/shell/gateway-menu-panel.tsx:64`, `:102`,
`:126`; `apps/desktop/src/app/preview-pane.tsx:237`, `:244`, `:267`, `:522`;
`apps/desktop/src/app/preview-console.tsx:193`).

The API side is weaker: run streams/statuses live in memory
(`gateway/platforms/api_server.py:771`, `:778`, `:3645`), SSE filtering handles
thinking/subagent progress imperatively (`:3664`, `:3680`, `:3706`), and detailed
health is exposed separately (`:1099`, `:1104`, `:1109`). v3 should back the rich work
surface with a durable event table keyed by `run_id`, `event_id`, `parent_event_id`,
`session_id`, timestamp, type, and visibility.

### 10. The extension model is strong, but registry paths must not coexist with legacy switches

Hermes has the right target shape: provider profiles, transport normalization, plugin
discovery, platform registries, and reset hooks. Tests around transport and plugin
discovery show this can be contract-tested (`tests/agent/transports/test_transport.py:13`;
`tests/providers/test_plugin_discovery.py:90`), and registries expose reset hooks where
testability was designed in (`agent/tts_registry.py:130`).

The anti-pattern is coexistence: registry-first paths still live beside `if/elif`
dispatch and downstream switches (`gateway/run.py:6915`, `:6940`;
`gateway/config.py:462`, `:597`; `tools/send_message_tool.py:468`, `:774`, `:901`).
v3 should require new provider/platform/tool integrations to enter through one
registry contract and a small contract-test suite, not through another switch site.

## Consolidated Direction for v3

| v3 level | What Hermes contributes | Verdict |
|---|---|---|
| **L0a kernel** | A durable *chat* store (WAL + jitter-retry, soft-delete undo, incremental flush) but **no op-log, no idempotency key, no CAS, no resume-mid-op**. | **Anti-example.** Keep DBOS's kernel; steal only the soft-delete-undo-with-audit and the SQLite contention tricks. |
| **L0a adjacent truth layers** | Chat DB, gateway routing maps, cron JSON, shadow Git checkpoints, compressed lineage, and API run streams are separate truths with no shared operation envelope. | **Sharper anti-example.** Persistence is not enough; v3 must state which layer owns each fact and bind facts with durable op ids. |
| **L0b actors** | None — "who acts" is a `role` string; no actor type, no context-packet. | **Gap.** v3's first-class actor + context-packet has no precedent here. |
| **L0c adapters** | Stateless format-shim registry + host-owned transparent `messages[]` session + per-message `provider_data` escape hatch. The Codex *projection* of a foreign stateful agent into the host shape. | **Adopt the projection + escape-hatch ideas.** But add the immutable `AgentConfig` value object Hermes lacks. |
| **L0e runtime** | Clean two-method `BaseEnvironment` ABC, six backends, hibernate/wake keyed by `task_id`, **sandbox FS = cache, host owns durable state, re-push on wake**. | **Strong — adopt the hibernation model and the FileSync-host-owns-state stance.** |
| **L3 human gate** | Layered fail-closed approval with a hardline floor + import-frozen bypass + normalize-before-match + textbook DM-pairing — **but every decision is unaudited**. | **Adopt the gate mechanics; reject the missing ledger.** Pair with paperclip's audited decision row. |
| **L3/L7 surface security** | Session ids are routing handles, not authority; callbacks re-authorize; context-local secret scope defaults closed, but credential brokering is still not architectural. | **Adopt fail-closed surface authz and context-local scoping; still require broker/ref credentials.** |
| **L5 skills** | Directory + agentskills.io frontmatter + 3 generic tools + cached prompt index + lifecycle states + trust-tiered scan. | **The reference. Adopt the open standard and the primitive shape.** Namespace by origin (Hermes's flat scheme didn't scale); govern creation. |
| **L6 triggers** | File-backed cron with pre-advance at-most-once, a real `claim_job_for_fire` CAS for multi-replica, provider/execution split, Chronos scale-to-zero, fire-time delivery resolution. | **Strong — adopt the CAS, the provider/body split, and late-bound delivery.** Replace JSON-file storage with a transactional store. |
| **L4 spawn** | Child = full first-class `AIAgent` (own session/transcript/`parent_session_id`), toolset-intersected, cost-rollup, result-as-a-new-turn. **Not durable** (in-memory thread). | **Confirms "child = full instance" (third time). Adopt result-as-a-new-turn + cost-rollup.** Make children durable/resumable (Hermes doesn't). |
| **L7 grants** | Process-global `os.environ`, blocklist-filtered, "useful not a boundary"; Bitwarden as startup hydration. | **Anti-example for credential-never-travels.** Keep paperclip's broker/ref; reuse only the secrets-CLI hygiene. |
| **L8 channels** | 10+ live platforms behind one capability-negotiating adapter contract; `MessageEvent`+`SessionSource` two-struct envelope; relay/connector contract. | **The reference for the series. Adopt the envelope split, capability-flag degradation, and the relay contract.** Collapse the 20 hand-written normalizers into one declarative engine. |
| **L9 correlation** | A single pure `build_session_key()` → deterministic hierarchical key, **exact-only, the documented conformance oracle**. | **Adopt the pure-function-as-oracle idea.** v3 still must build the *fuzzy* correlation layer none of the five projects has. |
| **L10/operator UX** | Desktop work surface exposes composer status, subagent traces, gateway controls, and preview-console state; API run streams/statuses are in-memory. | **Adopt embedded observability, but persist the event stream.** |
| **L11 memory** | Flat Markdown (`MEMORY.md`/`USER.md`), agent-curated, pluggable provider layer with off-thread serialized writes, profile-scoped. | **The first real L11 reference. Adopt scopes-as-directories + the forked-writer + off-thread serialized writes.** Add the per-conversation/per-project scopes Hermes lacks. |
| **L12 learning** | Forked-reviewer reflection on a fixed counter; durable Markdown artifacts; curator GC; anti-poisoning rules. **Structurally closed, not metric-driven.** | **Adopt the forked-reviewer + two-tier cadence + anti-poisoning rules.** Don't oversell it as autonomous self-improvement. |
| **Extension seams** | Provider/platform/plugin registries and contract tests exist, but legacy switch sites still coexist. | **Adopt registry + contract-test discipline; reject mixed registry/switch ownership.** |

## Reconsiderations for v3

1. **The ACP bet (adopt a spec, don't invent a protocol).** Hermes's single best architectural decision is
   implementing the *third-party* `agent-client-protocol` so Zed/Claude Code drive it for free. v3 wants to be
   "drivable by an external orchestrator" — this is a direct argument to **expose v3's kernel through an existing
   typed agent protocol (ACP) with a `_meta.<vendor>` extension channel**, rather than a bespoke API. Caveat: ACP
   exposes *turns*, not *operations* — v3 would need to layer op-level idempotency *underneath* an ACP-shaped
   surface, not adopt ACP's at-least-once semantics as the kernel contract.

2. **"One contract, N implementations" is the pattern to keep — but push the contract down.** Hermes's channels
   prove a single target type + two seam methods can absorb 20 platforms. v3 should keep the *contract* and
   collapse the *implementations*: one declarative per-channel mapping feeding one normalizer engine, instead of
   20 hand-written normalizers. Same for cron (one `create_job`, many front-ends — already right) and skills (one
   format, many sources — already right).

3. **The audit ledger is now a three-project verdict.** symphony (unaudited, in the ticket), Hermes (unaudited,
   in-memory + config file), vs paperclip (audited `issue_execution_decisions`). Two of three skip it. v3's L3
   must make the durable, queryable decision record (recommendation + override + actor + timestamp + correlation)
   a **kernel primitive**, not a product afterthought — this is the single most-repeated gap in the series.

4. **Credential-never-travels needs architecture, not prompts.** Hermes is the clearest demonstration that
   "credential-never-travels" *cannot* be achieved inside a single trust domain by instruction + redaction +
   blocklist — even its own SECURITY.md punts the real boundary to an external whole-process wrapper. v3 must
   enforce paperclip's broker/ref indirection architecturally.

5. **Memory scopes = directories (a new, concrete L11 stance).** Hermes shows flat human-readable Markdown, a
   forked-writer, and off-thread serialized writes beat a DB for the *curated* layer — and that a scope can be a
   directory. v3 should adopt this but add the per-conversation/per-project scopes Hermes lacks (it has only
   profile-global). Keep transcript search (FTS5) as an *optional tool*, separate from curated memory.

6. **L4 "child = full instance" is now confirmed three times (omnigent, DBOS, Hermes) — with the durability
   asterisk.** All three model a child as a first-class run with its own identity/transcript. Hermes adds two
   adoptable mechanics (result-as-a-new-turn to preserve role-alternation/prefix-cache; bottom-up cost roll-up)
   but is the cautionary case: its children are in-memory threads, lost on a parent crash. v3's children must be
   first-class *and durable*.

## Caveats

- **Scale forced sampling.** At 1.14M LOC the seven agents read the load-bearing seams (~400–700 lines each),
  not the whole tree. Findings about the *contracts* (the base classes, the key functions, the schemas) are
  high-confidence; claims about *coverage* ("there is no X") are grep-backed but a 678 KB `cli.py` and a sprawling
  `agent/` package leave room for a missed corner. The kernel verdict (no op-log/idempotency/CAS) was confirmed by
  targeted greps across the state store and is high-confidence.
- **Product, not kernel.** Hermes optimizes for a beloved single-user agent experience; many "anti-example"
  verdicts (process-global secrets, JSON-file cron, unaudited approval, mutable chat-history-as-truth) are
  *reasonable* at single-host product scale and only become anti-patterns under v3's distributed-kernel goals.
  The study judges Hermes against v3's bar, not its own.
- **README vs reality.** Two README claims overstate: "FTS5 session search with LLM summarization" (the search is
  deliberately zero-LLM) and "autonomous skill creation after complex tasks" (a fixed turn-counter + a reflection
  prompt). Noted so v3 doesn't cargo-cult the marketing.
- **HEAD is same-day.** Analyzed at `38f1a92`, pushed 2026-06-19 — an actively-moving target; line numbers are a
  snapshot.
