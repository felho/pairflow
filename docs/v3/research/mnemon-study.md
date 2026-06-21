# Mnemon Study — The Deterministic Memory Store + LLM-as-Supervisor (Persistent Agent Memory)

Date: 2026-06-21

## Purpose

Mnemon ([`github.com/mnemon-dev/mnemon`](https://github.com/mnemon-dev/mnemon)) is a **persistent
cross-session memory system for LLM agents**, shipped as a single deterministic binary (Go + SQLite)
with **no LLM embedded in the memory pipeline**. Its thesis — *"your host LLM is the supervisor"* — is
that the actor decides *what* to remember and *when* to recall, while the binary deterministically
performs storage, dedup, linking, and retrieval. It is the component behind the NanoClaw `add-mnemon`
skill, and the closest shipped analogue to the **typed memory store** the BitSafe Part-1 article
describes (and to the user's own `~/.claude` memory model).

This is study **15**, and like study 14 (OneCLI) it is **not a workflow kernel** — it is a **single
pair of v3 layers (L11 memory scopes, L12 metacognition/learning) realised as standalone
infrastructure**. It is the **second L11/L12 reference**, sitting opposite **Honcho (study 7)**: where
Honcho is *perspectival derived memory* (directed `(observer, observed)` edges + a two-speed
consolidation loop, LLM-in-the-loop), mnemon is *flat deterministic memory* (an actor-supervised store
with an intent-native protocol and event-boundary hooks, LLM-out-of-the-pipeline). The two triangulate
the L11/L12 design from opposite ends: **what the write costs** (mnemon: nothing, it's deterministic)
vs **what the model expresses** (Honcho: perspective and provenance).

It also lands directly on the convergence work's recent **memory-to-definition gradient**: mnemon is a
concrete midpoint — recall hardened into durable, typed graph edges — between ephemeral context and a
checked-in definition.

> **Citation fidelity.** Mnemon's own internals were read at **repo/README granularity** (web fetch),
> so mnemon-internal facts (Go/SQLite, the four-graph edge model, the `remember`/`link`/`recall`
> protocol, named stores, the lifecycle-hook names, the GNN-isomorphism claim) are cited *(mnemon
> repo)* without line numbers and are **not line-verified**. The **load-bearing, line-precise evidence
> is consumer-side** — the NanoClaw `add-mnemon` skill
> (`/Users/felho/dev/repos-to-learn-from/nanoclaw/.claude/skills/add-mnemon/SKILL.md`) — which pins how
> mnemon is wired, where it stores, and (critically) the provider-coupling failure mode. Where a claim
> rests only on the README read, it is flagged. See Caveats.

---

## Executive Summary

1. **Mnemon is a deterministic memory binary the actor supervises — not an LLM memory agent.** Go +
   SQLite, no embedded model, no API key; the host LLM decides cognitive ops and the binary performs
   them *(mnemon repo)*. This is **produce-not-perform applied to memory**: the actor emits a
   `remember` / `link` *intent*; the store performs the write, dedup, and edge-linking deterministically.
   It is the cleanest memory-side instance of v3's **record-not-replay / structure-over-self-report**
   discipline.

2. **The protocol is intent-native, not SQL.** Three verbs in the actor's cognitive vocabulary —
   `remember` (≠ INSERT), `link` (≠ UPDATE), `recall` (≠ SELECT) — returning **structured JSON with
   signal** (confidence / relevance), not database rows *(mnemon repo)*. The memory API is shaped like
   the actor's intent seam, the same way v3's `ActionIntent` / `SpawnIntent` / (study-14) `CapabilityIntent`
   are.

3. **Memory ops are prompted at event boundaries by hooks, not left to actor whim.** `mnemon setup`
   writes hooks into the actor runtime's config; the README names four lifecycle phases — **Prime**
   (session start: surface skill/guideline/store), **Remind** (prompt arrives: recall decision),
   **Nudge** (before compaction: writeback decision), **Compact** (preserve continuity) *(mnemon repo)*.
   The **Nudge/Compact pair is the exact mechanism behind the BitSafe "structured plans survive
   compaction" discussion** — pre-compaction is a first-class writeback trigger. This is an
   **observe-seam** instance: memory is driven from *outside* the actor loop.

4. **The edge model is richer than Honcho's single directed edge.** Four edge types — **temporal,
   entity, causal, semantic** (the last optional, via local Ollama embeddings + RRF fusion) — over
   insight nodes *(mnemon repo)*. Honcho carries one edge kind keyed `(observer, observed)`; mnemon
   carries an **edge-*kind*** but **no perspective**. Causal edges in particular are a decision-provenance
   primitive v3's L11 lacks.

5. **But mnemon is flat, not perspectival — and coupled to one actor runtime.** There is no
   observer/observed; memory is global within a (named) store. And the load-bearing consumer-side fact:
   **mnemon's hooks fire only under `--target claude-code`** — switch a NanoClaw group to `opencode`/Codex
   and memory **silently stops**, because that provider never invokes the `claude` CLI the hooks attach to
   (`add-mnemon/SKILL.md` "Provider Compatibility"). That is precisely the anti-pattern v3's L11 must
   avoid: **memory bolted into an actor adapter, not owned by the kernel as a port.**

6. **Scope is one coarse axis: named stores + a shared pool.** `MNEMON_STORE` isolates pools; the
   default vision is a single shared `~/.mnemon` across all local agents, with per-project isolation
   opt-in *(mnemon repo)*. This is the *simpler end* of v3's L11 scope model (the hermes end), not the
   Honcho 5-coordinate address.

---

## Slice 1 — The deterministic store + the LLM-as-supervisor split

### The mechanism

Mnemon is a single Go binary over SQLite, installed in NanoClaw as a GitHub-release linux binary
(`MNEMON_VERSION`, `mnemon_${VER}_linux_${ARCH}.tar.gz`) and pointed at a mounted data dir
(`ENV MNEMON_DATA_DIR=/home/node/.claude/mnemon`, per-agent-group `.claude/` mount, survives container
restarts) (`add-mnemon/SKILL.md` Phase 2 §1, "Memory Storage"). **No LLM runs inside the pipeline** —
the design statement is *"your host LLM is the supervisor; the binary is deterministic"* *(mnemon
repo)*. Optional vector search uses a **local** Ollama model (`nomic-embed-text`) and the system is
fully functional without it (graph-only recall) *(mnemon repo)*.

### LEARN / AVOID / ORTHOGONAL (Slice 1)

- **LEARN — the memory *write* can and should be deterministic and out-of-actor.** This is the memory-side
  twin of v3's record-not-replay: the non-deterministic actor *produces* a memory intent; a deterministic
  component *performs* the durable write/dedup/link. v3's L12 should keep the **write deterministic**
  (mnemon) even while keeping Honcho's perspectival *derivation* — the two are separable.
- **LEARN — no embedded LLM / no API key is the right default for a memory port.** Recall and storage
  should not themselves cost an inference call; the actor already in the loop is the only model needed.
  Mirrors Honcho's "cheap explicit-only extraction on the hot path."
- **ORTHOGONAL** — Go, SQLite, Ollama/`nomic-embed-text`, RRF fusion mechanics: implementation, no bearing
  on the model.

---

## Slice 2 — Intent-native protocol = produce-not-perform for memory

### The mechanism

The CLI maps cognitive vocabulary onto storage ops: `remember` (auto-dedups / detects conflicts), `link`
(create an edge between concepts), `recall "query"` (graph traversal + optional vector, returning
structured JSON with signal, not rows) *(mnemon repo)*. The actor decides *what* merits persistence,
guided by an installed `GUIDELINE.md` (judgment rules) and `SKILL.md` (command syntax) — the
extraction is **LLM-driven**, the storage **deterministic** *(mnemon repo)*.

### LEARN / AVOID / ORTHOGONAL (Slice 2)

- **LEARN — model memory as named intents in the actor's vocabulary, not as a database.** `remember` /
  `link` / `recall` is the memory analogue of v3's intent seam. v3 should expose memory as
  **`RememberIntent` / `LinkIntent`** produced by the actor and performed by a kernel-owned memory
  provider — symmetric with `ActionIntent` (study 1+), `SpawnIntent` (L4), `CapabilityIntent` (study 14).
- **LEARN — structured-JSON-with-signal over raw rows** is the correct return shape: recall hands the
  actor *graded* candidates (confidence/relevance) it can reason over, the same way v3 gate decisions
  carry evidence, not just a boolean.
- **AVOID — the judgment lives in actor-side prose (`GUIDELINE.md`).** *What to remember* is still an
  LLM prompt rule — the same shape as the BitSafe "`noted` without a file write means nothing" discipline.
  Useful, but it means memory quality rides on prose the actor can ignore. v3 keeps the *write*
  deterministic but should treat *what-to-remember* as the same memory-to-definition gradient question,
  not assume a guideline closes it.

---

## Slice 3 — The four-graph edge model (L11) vs Honcho's directed edge

### The mechanism

Insight nodes carry four edge types: **temporal** (sequence/recency), **entity** (concept↔subject),
**causal** (dependency/influence), **semantic** (vector-similarity, optional). Recall is **graph
traversal** first, vector second (RRF fusion when embeddings are on) — a deliberate *graph-over-vector*
stance, argued from a claimed GNN≈attention isomorphism *(mnemon repo)*. There is **no observer/observed
dimension**: edges connect insights, not perspectives.

### LEARN / AVOID / ORTHOGONAL (Slice 3)

- **LEARN — carry an edge-*kind* on v3's directed-edge memory.** Honcho's L11 edge is keyed
  `(observer, observed)` but is single-kind; mnemon's temporal/entity/**causal**/semantic split is a
  richer relation taxonomy. **Causal edges** especially give decision-provenance ("this memory caused that
  decision") that v3's L11 `source_ids` provenance tree only partially covers.
- **AVOID — graph-over-vector as dogma.** The GNN-isomorphism argument is **marketing-grade**, not a
  mechanism this study verified; v3 already rejected Honcho's "surprisal/spatial-tree research theater" for
  the same reason. Treat richer edges as useful structure, not as a retrieval-quality silver bullet.
- **AVOID — flat (non-perspectival) memory.** Mnemon has no theory-of-mind axis; Honcho's
  `(observer, observed)` (self-model when `observer==observed`) is strictly richer and is the v3 adopt.
  Mnemon is the *deterministic-store* reference, **not** the scope-model reference.
- **ORTHOGONAL** — RRF fusion, embedding model choice.

---

## Slice 4 — Lifecycle hooks: memory at the event boundary (L12 + observe-seam)

### The mechanism

`mnemon setup --target claude-code --yes --global` runs idempotently in the NanoClaw entrypoint (routed
to stderr so it never corrupts the JSON stdin handshake) and **writes hooks into
`/home/node/.claude/settings.json`** (`add-mnemon/SKILL.md` Phase 2 §2, Phase 3). The README maps four
lifecycle phases onto runtime events — **Prime** (session start), **Remind** (user prompt arrives →
recall decision), **Nudge** (before context compaction → writeback decision), **Compact** (preserve
continuity through compression) *(mnemon repo)*. On Claude Code these correspond to the
`SessionStart` / `UserPromptSubmit` / `PreCompact` / `Stop` hook family (mapping inferred; the README
does not pin exact event names — see Caveats).

### LEARN / AVOID / ORTHOGONAL (Slice 4)

- **LEARN — the compaction boundary is a first-class writeback trigger (L12).** Mnemon's **Nudge** (prompt
  a durable writeback *before* the context window is compressed) is the concrete mechanism the parent
  BitSafe thread circled — *"structured plans survive compaction because the plan is externalised."* It
  adds a second reference (beside Honcho's idle+threshold) for v3's L12 trigger set: **pre-compaction =
  consolidate-or-lose-it.**
- **LEARN — memory driven from outside the actor loop is an observe-seam.** Hooks recall/writeback at
  event boundaries rather than trusting the actor to remember to remember — the same structure-over-
  self-report property as v3's commit log and the cross-cutting observe-seam.
- **AVOID — hooks into one actor adapter ≠ a kernel port.** The whole mechanism is "edit the Claude Code
  settings.json"; it only works for that runtime (Slice 5). v3's L11/L12 triggers must be **kernel-owned
  events**, not actor-config edits, or memory becomes a per-adapter accident.
- **ORTHOGONAL** — the stderr-routing detail (keep setup output off the stdin JSON channel) is a NanoClaw
  wiring nicety.

---

## Slice 5 — Scope (named stores), and the provider-coupling cautionary tale

### The mechanism

Isolation is one coarse axis: `MNEMON_STORE` selects a pool; the default vision is a single shared
`~/.mnemon` across all local agents, per-project isolation opt-in via named stores *(mnemon repo)*. In
NanoClaw the store is the per-agent-group `.claude/mnemon/` mount; reset = delete that subdirectory
(`add-mnemon/SKILL.md` "Memory Storage"). **The load-bearing caution:** mnemon's hooks **fire only under
`--target claude-code`**; a group on `AGENT_PROVIDER=opencode` (or any non-Claude provider) "spawns its
own process and never invokes the `claude` CLI, so the hooks registered by `mnemon setup` do not run"
(`add-mnemon/SKILL.md` "Provider Compatibility"). Memory **silently stops** on a provider switch — and a
separate NanoClaw skill (`migrate-memory`) exists precisely because *"each provider keeps its own store."*

### LEARN / AVOID / ORTHOGONAL (Slice 5)

- **LEARN — a coarse named-store axis is the cheap, correct floor.** Per-pool isolation with a shared
  default is the hermes-simple end of v3's L11 scope model — fine as a substrate, below the Honcho
  5-coordinate address.
- **AVOID — memory coupled to the actor runtime is a correctness hazard.** Provider-coupled hooks mean
  switching the actor **silently drops memory**; the consumer has to hand-run a `migrate-memory` skill to
  recover. This is the sharpest argument in the series for v3's rule that **memory is a kernel-owned port,
  resolved per instance independent of which actor adapter runs** — exactly as L0c separates `AgentConfig`
  from the `ActorAdapter`.
- **AVOID — silent stop, not a fail-closed reject.** When memory can't run it just doesn't (no error);
  contrast study-14 OneCLI's *fail-closed* spawn. v3's memory port should make "memory unavailable" an
  explicit, observable state, not a silent no-op.
- **ORTHOGONAL** — the exact host-mount discovery `docker inspect` incantation.

---

## Consolidated Direction for v3

| v3 level | What mnemon contributes | Verdict |
|---|---|---|
| **L11 (registry / memory scopes)** | An **edge-*kind*** taxonomy (temporal/entity/**causal**/semantic) richer than Honcho's single edge; a coarse named-store scope axis. **No perspective.** | **Adopt edge-kind (esp. causal) on Honcho's `(observer, observed)` edge.** Keep Honcho's perspectival 5-coordinate address; mnemon is *not* the scope reference. |
| **L12 (metacognition / learning)** | **Deterministic, out-of-actor write** (LLM supervises, binary performs); **intent-native protocol** (`remember`/`link`/`recall`); **compaction-boundary writeback trigger**. | **Adopt all three.** Memory write = produce-not-perform; pre-compaction joins idle+threshold as a trigger. |
| **L0c / port abstraction** | A cautionary tale: memory bolted into one **actor adapter** (claude-code hooks) silently dies on a provider switch. | **Make memory a kernel-owned port**, resolved per instance, adapter-independent. "Memory unavailable" is explicit, not silent. |
| **Cross-cutting — observe-seam** | Memory recall/writeback **driven from outside the actor loop** by event hooks. | **Adopt the framing** (kernel events, not actor-config edits). |
| **Kernel scope** | Mnemon is *infrastructure a memory port could sit behind*, not kernel. | **Keep it a provider/port**; do not absorb a memory engine. |

---

## Reconsiderations for v3

1. **Name the memory port as produce-not-perform (L11/L12).** Studies 7 (Honcho, the derivation/scope
   model) and now 15 (mnemon, the deterministic-write + intent-protocol model) triangulate the same seam
   from opposite ends. v3 should declare memory a **first-class port**: the actor produces
   `RememberIntent` / `LinkIntent`, a kernel-owned provider performs the durable write/dedup/link —
   symmetric with `ActionIntent` / `SpawnIntent` / `CapabilityIntent`. **The write is deterministic
   (mnemon); the derivation/perspective is Honcho's.** They compose; don't pick one.

2. **The compaction boundary is a first-class L12 writeback trigger.** Add *pre-compaction →
   consolidate-or-lose-it* to Honcho's idle+threshold trigger set. This generalises the entire parent
   BitSafe thread ("structured plans survive compaction") into the learning loop: the moment context is
   about to be compressed is the cheapest, most reliable signal that durable writeback is due.

3. **Memory must be adapter-independent — mnemon's provider-coupling is the proof.** Hooks into one
   actor runtime mean a provider switch **silently drops memory** (consumer-side, line-precise). v3's
   observe-seam already wants memory driven from outside the actor; make the trigger a **kernel event**,
   and make "memory unavailable" an explicit state (study-14's fail-closed, not mnemon's silent stop).

4. **Carry edge-kind (especially causal) on the directed-edge memory (L11).** Honcho's `(observer,
   observed)` edge is single-kind; mnemon's causal edge is a decision-provenance primitive worth folding
   into v3's `source_ids` provenance tree — "this memory *caused* that decision," not just "this memory was
   *seen* by that observer."

5. **Mnemon as a memory-to-definition gradient data point.** It hardens ephemeral recall into durable,
   typed graph edges — a concrete midpoint on the convergence work's gradient from context → structured
   memory → checked-in definition. The open question it inherits (same as Slice 2's AVOID): *what to
   remember* is still actor-side prose (`GUIDELINE.md`), not a checked-in policy. The gradient's hard end
   — promoting a durable memory into a definition — is exactly where v3's `validate_*` / constitution
   should sit, and neither mnemon nor Honcho closes it.

---

## Caveats

- **Citation asymmetry.** Mnemon-internal facts (Go/SQLite, the four-graph edge model, the
  `remember`/`link`/`recall` protocol, named stores, the Prime/Remind/Nudge/Compact lifecycle names, the
  GNN-isomorphism and "compound interest" philosophy) are from a **repo/README web read**, cited
  *(mnemon repo)* and **not line-verified**. The **consumer-side mechanics** (binary install,
  `MNEMON_DATA_DIR` mount, idempotent `mnemon setup` in the entrypoint, hooks written into
  `settings.json`, and the **provider-coupling failure mode**) are **line-precise** from the NanoClaw
  `add-mnemon` skill and are the load-bearing evidence.
- **Hook-event mapping is inferred.** The README's Prime/Remind/Nudge/Compact phases are mapped to the
  Claude Code `SessionStart`/`UserPromptSubmit`/`PreCompact`/`Stop` family by analogy; the exact event
  names mnemon writes into `settings.json` were not read line-by-line. The *shape* of the lesson
  (memory at event boundaries; pre-compaction writeback) is robust to the exact names.
- **Marketing vs mechanism.** The "GNN ≈ attention isomorphism," "compound interest," and
  "only component worth deep investment" claims are **philosophy**, recorded as stated, not endorsed as
  verified retrieval-quality results. The graph-over-vector stance is treated as a structural choice, not
  a proven win.
- **Single consumer.** All line-precise evidence is from one integrator (NanoClaw/BitSafe). The
  `migrate-memory` "each provider keeps its own store" framing and the per-agent-group mount are NanoClaw
  conventions; mnemon's own multi-framework story (Codex/Cursor/TRAE/Hermes/OpenClaw) was not exercised.
- **Scope.** Mnemon is one pair of layers (L11/L12) shipped as standalone infra — narrower than the
  engine studies (1–13). It adds **no new central bet**; it sharpens the L11/L12 verdicts (deterministic
  write, intent protocol, compaction trigger, edge-kind) and supplies the **memory-must-be-a-port**
  cautionary anchor opposite Honcho.
