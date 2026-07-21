# NanoClaw Study — The Hardened Runtime & Supervision Layer (Not a Kernel)

Date: 2026-07-04

## Purpose

This note captures what Pairflow v3 can learn from **NanoClaw** (nanocoai/nanoclaw,
v2), a small (~26K LOC host `src/` incl. tests, ~16K excl.; ~6.5K container agent-runner; TypeScript) system that
"runs AI agents securely in their own containers." It is deliberately built to be
*small enough for one person to fully understand* and *forked per user*, in explicit
reaction to larger frameworks whose security is "at the application level rather than
true OS-level isolation."

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/nanoclaw` (clone verified current: HEAD
  `b28c917`, 2026-07-04, 0 behind origin)

Why this study, and why now: NanoClaw is **the runtime component the BitSafe "AI OS"
capture is built on** (`bitsafe-ai-os-capture.md`) — arguably "BitSafe's v3." The
requester's hypothesis going in was that it might not be a v3 *kernel* competitor but a
*sandboxing* reference. That hypothesis is **confirmed and sharpened** below: NanoClaw
is a best-in-class **transport + supervision + isolation** layer with **no workflow
kernel at all** (no op-id idempotency, no CAS/versioning, no canonical transcript, no
typed lifecycle) — which makes it simultaneously the strongest L0e/L7/L0d/L6 reference
in the corpus and a clean catalog of exactly the duplicate/lost-message seams v3's
kernel discipline exists to close.

The reference points for every mapping are the v3 roadmap and model:

- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)
- [`../../model/core-model.html`](../../model/core-model.html) — the model
- [`_synthesis.md`](_synthesis.md) — the cross-study bridge (kernel spectrum, resolved bets)

> Method: six parallel v3-level-sliced analysts (kernel/state · runtime/adapter ·
> security · liveness/scheduling · channels/routing · skills/governance), each with the
> shared glossary, explicit comparison to prior studies, and LEARN/AVOID/ORTHOGONAL
> tags. Citations are relative to the NanoClaw repo root. **Source is ground truth**: a
> prior doc-level capture and NanoClaw's own high-level `docs/architecture.md` had
> drifted (see finding 0); every prior claim below was re-verified at `file:line`.

---

## Executive Summary

The single load-bearing finding:

> **NanoClaw is a hardened runtime+supervision layer, not a workflow kernel.** It nails
> exactly the *outer* concerns v3 models as L0e (runtime provider), L7 (credentials),
> L0d (lifecycle/supervision), and the runtime side of L0c (actor adapter) — often more
> cleanly than any prior study — while having *no* kernel: no `(instance_id, op_id)`
> idempotency, no CAS/expected_version, no append-only transcript, no typed wait kinds.
> Its state is mutated in place across single-writer SQLite files, and its message/
> delivery guarantees leak duplicates and (in one path) silently lose messages. It is
> "BitSafe's v3" only in the sense of being their *runtime*; it is not v3's kernel
> ambition, and reads as a catalog of what a kernel is *for*.

Kernel-spectrum placement:

```text
symphony ── nanoclaw ── LangGraph ── honcho ── paperclip ── DBOS ·········· TEMPORAL
```

Durable mailboxes + an apply/ack ledger + bounded-retry sweep supervision put NanoClaw
above bare orchestrators; the absence of op-id exactly-once, CAS/versioning, a
transcript, and its effect-after-marker delivery keep it well below DBOS. It is the
first study to sit *below* LangGraph on the discipline axis while sitting *above* most
of the corpus on the runtime/isolation axis — the two axes come apart here.

What NanoClaw **validates** (v3 already plans it this way):

- **"Work durable, actor/session ephemeral," implemented literally** — the container
  carries *zero* durable identity; session row = conversation identity, group dir =
  memory/config identity, container = nothing. Mid-turn death loses only one turn's
  un-emitted text; everything resumes from the durable queue + persisted provider
  continuation (checkpointed at `init`, not turn-end).
- **A genuinely typed provider (actor) adapter contract** — variance expressed as typed
  optional methods + boolean **capability flags** ("a capability, never a provider
  name"), the direct antidote to omnigent's duck-typed harness drift. Per-provider
  continuation *slots* make provider identity orthogonal to workflow identity.
- **L7 credential-never-travels, fail-closed** — real credentials live only in the
  OneCLI vault; the container gets a placeholder header the gateway rewrites on the
  wire; spawn **refuses** if credentials/egress aren't applied (no silent downgrade).
- **The most operationally concrete supervision loop in the corpus** (and the reference
  for the claim-tracking, pull-based shape v3 actually uses) — a pure, unit-testable
  `decideStuckAction` over durable signals, with a *workload-declared* silence budget (the
  agent's own `Bash(timeout:…)` widens the SLA — Bash-only in nanoclaw's implementation)
  and the rule that **recovery consumes its own evidence** (delete stale claims + one-tick
  grace, or the watchdog serially kills every replacement it spawns). Not "best" outright:
  it stays in the timer paradigm gastown argued against and lacks gastown's escalation tier
  (finding 32) — the three *details* are the load-bearing contribution, not a crown.
- **Exact correlation as a `UNIQUE` constraint** — `(channel_type, platform_id,
  instance)`, exact-only inbound (auto-create over hijack), the DB-enforced form of v3's
  "exact correlation oracle."

What NanoClaw **warns** about (v3's kernel choices are the fix):

- **No kernel idempotency / CAS / transcript.** State mutated in place; the closest
  thing to a ledger is an apply-ack table and an outbound `delivered` table, both keyed
  by message-id only, not `(instance, op_id, payload_digest)`. **There is no T1** —
  history is unreconstructable.
- **Delivery marker-after-effect** — the `delivered` marker is written *after* the
  platform send, so a crash between them re-sends (at-least-once, dup risk). Follow-up
  pushes are marked complete *before* the agent sees them (at-most-once, loss window).
- **The single worst hole: silent message loss.** An offline/unregistered adapter makes
  `deliver()` return `undefined` (not throw); the loop logs "delivered", deletes the
  outbox attachments, and permanently marks the message delivered — on the exact path
  whose own comment claims it feeds the retry path.
- **Fail-open module seams** — "table absent ⇒ allow all" for admin checks and
  cross-channel sends; enforcement that evaporates when a module isn't installed.
- **Provider-shaped memory** — per-group memory keyed to each provider's native surface
  (flat `CLAUDE.local.md` vs a `memory/` scaffold); crossing providers is a
  human-triggered LLM distillation. v3's named L11 failure mode, in production.

What is **net-new or best-in-class** here (not just confirmation):

- **The integration-point contract** as an L12 mechanism (not policy): a customization's
  coupling to the host is an explicit list of "reach-ins," each guarded by a red/green
  test; "the failing list *is* the set of skills to update." Plus a self-updating,
  fail-closed upgrade channel (gitignore-sealed marker + boot tripwire whose error text
  is addressed to the coding agent).
- **Single-writer-per-file mailbox topology** across a hostile mount boundary — one
  authority per plane, reconciliation instead of shared mutation, with SQLite treated
  honestly as "a fragile file protocol, not a database" across VirtioFS.

---

## 0. Resolving the doc drift (method note worth keeping)

The prior doc-level capture claimed "two single-writer SQLite files `inbound.db`/
`outbound.db` as the entire IPC." NanoClaw's own `docs/architecture.md:5,430` contradicts
it ("one mounted DB… two tables… WAL handles this"). **The capture is correct and
`architecture.md` is stale design-doc fiction**: the implementation is two single-writer
files with `journal_mode=DELETE` (`src/db/schema.ts:153-159` — "split into two files so
each has exactly one writer"; `src/session-manager.ts:1-12`; container
`db/connection.ts:1-19`). `docs/db.md` / `docs/db-session.md` are current and match
source. The load-bearing invariants survived the drift only because they are restated as
comments at every callsite — which is itself the lesson: **convention-only invariants rot
unless they are the mechanism.** (This is the fourth study in the series to catch a
high-level doc drifting away from a schema-level truth; treat every "architecture.md" as
a hypothesis until checked.)

---

## 1. L0a — Kernel, state, idempotency (the cautionary core)

**1. LEARN (with a caveat) — Single-writer-per-file mailbox IPC.** On the *steady-state
delivery path* the host writes `inbound.db` + central `v2.db` and the container writes
only `outbound.db`: the container never updates `messages_in.status` (it acks through its
own `processing_ack` and the host reconciles via `syncProcessingAcks`,
`src/db/session-db.ts:169-182`), and delivery outcomes go in the *host's* file (`delivered`
table in inbound.db, `schema.ts:191-198`) so the delivery poll never writes container-owned
storage (`src/delivery.ts:5-9`). "Each party appends only to its own ledger, the other polls
read-only" removes cross-process lock contention by construction — a clean realization of
v3's T1-canonical vs T7-provider-local writer boundary. **The caveat (verified): it is
single-writer-*at-a-time*, not single-writer-*ever*.** The host does write the
container-owned `outbound.db` in two guarded spots — `writeOutboundDirect`
(`session-manager.ts:372-393`, finding 3, the parity-violating one) and
`resetStuckProcessingRows` opening it read-write (`host-sweep.ts:344-351` via
`openOutboundDbRw`, whose own doc says "only safe when no container is running") — both
gated on no live container. So the invariant v3 should copy is "one writer at a time per
plane, exceptions explicitly quiesced," not the stronger "one writer ever" the mailbox
framing suggests.

**2. LEARN — Seq parity as a disjoint ID namespace (verified even=host / odd=container).**
Host assigns even seqs in `messages_in` (`nextEvenSeq`, `session-db.ts:89-92`); the
container assigns odd seqs, reading MAX across *both* DBs to keep global order
(`container/agent-runner/src/db/messages-out.ts:45-77`). Seq is the agent-facing message
id; shared seqs would make "edit message #5" hit the wrong row. A leaderless allocation
scheme with no coordination — partition the ID space instead of coordinating a counter,
a good L0a detail (though v3's op-ids are content/nonce-derived, not positional).

**3. AVOID — The parity invariant is comment-enforced and the code already violates it.**
`writeOutboundDirect` (`session-manager.ts:372-393`) is a *host* write into
container-owned `outbound.db` using `COALESCE(MAX(seq),0)+2`, which preserves the current
max's parity — once the container has written any odd seq, the host's messages land odd
too; and `INSERT OR IGNORE` silently drops on a UNIQUE race. Convention-only invariants
rot; v3's op_id/expected_version must be schema-enforced (UNIQUE + CAS), not
comment-enforced.

**4. LEARN (as evidence) / ORTHOGONAL (mechanics) — SQLite across a mount boundary is a
fragile file protocol, not a database.** `journal_mode=DELETE` + `mmap_size=0` +
open-write-close-per-op are load-bearing for VirtioFS coherency: host side opens DELETE
journal per session-DB op with an explicit "do not refactor to a long-lived connection"
warning (`session-db.ts:15,23,38`; `session-manager.ts:186-189`); container side
`PRAGMA mmap_size=0` + fresh RO open per poll because WAL's mmapped `-shm` doesn't
propagate host→guest (`container/agent-runner/src/db/connection.ts:45-57`). The central
host-only DB uses WAL. Meta-lesson for v3: T1 must live on one side of any virtualization
boundary, with T7 runtime-local state physically separate — exactly what NanoClaw does.

**5. LEARN — Corruption-streak self-exit (exit 75).** After 10 consecutive
`SQLITE_CORRUPT`-class errors (~5s at 500ms polls) the container stops heartbeating and
`process.exit(75)` (EX_TEMPFAIL) so the host respawns it with a fresh mount — the poisoned
page cache is unrecoverable in-process (`poll-loop.ts:22-44,438-452`). Crash-only + supervisor
respawn: the runtime converts an unrecoverable local fault into a lifecycle event instead
of wedging. Maps to v3's runtime-provider plane signalling the kernel via typed failure.

**6. LEARN — Migration uniqueness keyed on `name`, not version.** `schema_version` has a
UNIQUE index on `name`; `version` is auto-assigned in applied order, and module
migrations interleave with core ones at arbitrary array positions
(`src/db/migrations/index.ts:75-131`). Decouples independently-authored modules from a
global version counter — relevant to v3's T2 definitions plane if workflow/module
definitions carry their own migrations. Bonus: FK-off migrations diff `foreign_key_check`
before/after and fail only on violations they *introduced*.

**7. LEARN (with caution) — `hasTable()` degrade-silently pluggability.** Core code probes
`sqlite_master` and degrades: no `user_roles` → allow-all (`command-gate.ts:51`), no
`agent_destinations` → skip ACL (`delivery.ts:268,312`), no `pending_questions` → skip
persistence (`delivery.ts:331`). Table presence *is* the feature flag — elegant for a
module system, but it means no typed contract about what's installed; v3's gate/capability
taxonomy should make installed-capability explicit (and see finding 21 — the fail-open
direction is the anti-pattern half).

**8. Durable vs in-memory — mostly right, two real holes.** Durable: central `v2.db`
(identity, wiring, session registry, pending questions/approvals), per-session `inbound.db`/
`outbound.db`, `.heartbeat` mtime, attachment dirs, provider continuations
(`session_state`), in-flight tool state (`container_state`). **In-memory, lost on host
restart:** delivery attempt counts (`deliveryAttempts` Map, `delivery.ts:34-35` —
deliberate "fresh chance"), the delivery re-entrancy guard (`inflightDeliveries`), and the
**entire container-liveness registry** (`activeContainers`/`wakePromises`,
`container-runner.ts:57-67`). **AVOID** for v3: retry budgets and liveness are kernel
state; NanoClaw's `sessions.container_status` column is a projection of the in-memory Map,
not authoritative — hence the blunt `cleanupOrphans()` kill-all-labeled at boot (finding
19).

**9. AVOID — Message-apply is at-least-once with a hidden at-most-once window.** The apply
"ledger" is `processing_ack (message_id PK)` `INSERT OR REPLACE`
(`container/agent-runner/src/db/messages-in.ts:100-121`); `getPendingMessages` filters
acked ids. Crash between read and act: a fresh container deletes stale `processing` rows
and re-reads; host sweep resets orphaned claims to pending with `tries++`, backoff,
`MAX_TRIES=5 → failed`. So the **initial batch is at-least-once** (crash mid-LLM-turn
replays the whole turn — the agent may have already half-responded via MCP → duplicate
user-visible replies). But **follow-up pushes are at-most-once**: `markCompleted(keptIds)`
fires immediately after `query.push(prompt)` (`poll-loop.ts:421-423`), *before* the agent
processes them — stream dies right after ⇒ those messages are permanently
completed-but-never-seen. v3's `UNIQUE(instance_id, op_id)` + payload_digest +
commit-then-derive is exactly what closes both asymmetries. Compare DBOS `(workflow_uuid,
function_id)` PK: DBOS records the *effect* exactly once; NanoClaw records intent (ack)
decoupled from effect (LLM turn, sends) — the omnigent duplicate-message bug mitigated at
ingest, not at effect.

**10. AVOID (v3's model) / LEARN (negative proof) — Delivery is marker-after-effect.**
`delivered (message_out_id PK)` `INSERT OR IGNORE`, written *after* `adapter.deliver()`
returns (`delivery.ts:193-197`). Crash between platform send and `markDelivered` →
duplicate send. The dual-poll race (1s active + 60s sweep) is guarded by an in-memory
`inflightDeliveries` set with an honest comment: the DB is idempotent "but the user has
already seen the message twice." This is precisely why v3 specifies *durable markers
before external effects* — NanoClaw shows every seam that leaks duplicates when the marker
comes after.

**11. AVOID — Lifecycle is flat columns, no state machine, no wait kinds.** Sessions:
`status: active|closed` × `container_status: running|idle|stopped` (`types.ts:130-140`).
Inbound: `pending → completed|failed`. No CREATED/WAITING distinction; "waiting for a
human answer" is modeled as the container holding an MCP tool call open while polling
`messages_in` (`messages-in.ts:146-165`) — an *in-process* wait, invisible to the host
except via heartbeat. A container waiting on a human **burns a live container** and is
indistinguishable from a busy one. v3's typed wait kinds (WAITING(human_decision), etc.)
are exactly what's missing.

**12. ORTHOGONAL — No CAS/versioning anywhere.** All state mutated in place; no
expected_version, no append-only transcript. Concurrency control = topology (single
writer) + in-memory mutexes. NanoClaw doesn't *need* CAS because one process owns each
file; v3 is leaderless/multi-writer and cannot borrow this. The closest artifacts are
token-checked TTL locks and an `INSERT OR IGNORE` chat-SDK dedupe key — plus a good war
story: without per-bot namespacing the dedupe key `dedupe:${adapter}:${id}` makes a second
same-platform bot *silently drop every message* the first processed (`state-sqlite.ts:24-38`).

**13. Storage-plane mapping — there is no T1.** Central `v2.db` ≈ **T2** (definitions:
agent_groups, container_configs) + **T6** (ops index: session registry, dropped_messages,
approvals) — one DB serving two planes. `inbound.db` ≈ inbound stream **T5** + host-
materialized routing projections **T4** (`destinations`, `session_routing`, overwritten
every wake). `outbound.db` ≈ outbound stream **T5** + **T7** provider-local
(`session_state` continuations, `container_state` tool scratch). Attachment dirs ≈ **T3**
evidence (with heavy symlink/containment hardening). **No T1, no transcript, no
EventEnvelope** — `messages_in/out` rows are mutated and the LLM transcript lives inside
the provider (T7). History is unreconstructable — the single biggest structural gap
between NanoClaw and a v3 kernel.

---

## 2. L0e / L0c — Runtime provider & actor adapter (best-in-class outer layer)

**14. LEARN — Containers are fully disposable; durable identity is session row + session
dir, never the container.** Container names are timestamped throwaways
(`container-runner.ts:146`). Survives restarts: session row (keyed by mode over
agent_group/messaging_group/thread), session dir (`inbound.db`/`outbound.db`/`.heartbeat`),
per-provider continuation in `outbound.db.session_state`, group dir (memory, config) and
`.claude-shared` SDK transcripts — all host-backed mounts. v3's "work durable, actor/session
ephemeral" implemented literally: **session = conversation identity, group = memory/config
identity, container = nothing.**

**15. LEARN — A genuinely typed provider adapter contract, split across two registries.**
Container-side `AgentProvider` interface (`providers/types.ts:1-51`): `query() → AgentQuery
{push,end,events,abort}`, a typed `ProviderEvent` union, `isSessionInvalid()`, optional
`maybeRotateContinuation()`/`onExchangeComplete()`. Host-side
`provider-container-registry.ts` contributes spawn-time mounts/env + **declared
capabilities** (`providesAgentSurfaces`). The direct antidote to omnigent's leaky
duck-typed harness drift: variance is typed optional methods *or* boolean capability flags,
never `if (provider === 'codex')` — the codebase says so ("a capability, never a provider
name", `container-runner.ts:277`).

**16. LEARN — Per-provider continuation slots + checkpoint-at-init.** The opaque provider
session id is persisted the moment the SDK emits `system/init`, not at turn end, so a
mid-turn crash still resumes (`poll-loop.ts:467-475`), and it is keyed per-provider so a
Codex thread id is never fed to Claude (`session-state.ts:1-17`). Provider flips are
lossless round-trips. This is NanoClaw's whole answer to Temporal-style replay: **don't
replay — checkpoint the provider's own resume token early and often.** Validates v3's
record-not-replay stance for LLM work. `maybeRotateContinuation` also drops transcripts too
big to cold-resume within the kill window — a subtle case where *resume cost itself* becomes
a liveness hazard.

**17. AVOID — Authoritative output is conflated across two prompt-fragile paths.** The turn
result is regex-parsed for `<message to="name">…</message>`; bare text is dropped as
scratchpad, patched by a self-nudge retry ("your response was not delivered…",
`poll-loop.ts:500-643`). There is *also* a mid-turn `mcp__nanoclaw__send_message` tool. So
"the authoritative output channel" is genuinely two channels with different failure modes,
one of them depending on the model emitting routing markup correctly — gastown's
screen-scraping problem one level up. This is NanoClaw's biggest deviation from v3's L0c
"authoritative output = structured emit" contract.

**18. LEARN — Deterministic layered context assembly with mount-enforced ownership.**
`composeGroupClaudeMd` regenerates the group CLAUDE.md every spawn as pure imports in a
fixed order — persona fragment → shared base (`container/CLAUDE.md`, RO) → sorted
`skill-*` → `module-*` (cli skipped when scope disabled — capability gating by prompt
omission + host-side dispatch rejection) → `mcp-*` (`claude-md-compose.ts:48-153`). The
composed file is *nested RO-mounted over the RW group dir*, so agent edits are **prevented,
not merely overwritten**. Only `CLAUDE.local.md` is agent-writable. Layer ownership is
physical, not conventional — a clean generated-vs-owned split for v3's L2b/L0c context
assembly.

**Adapter-channel scorecard (v3's four L0c channels):**

| Channel | NanoClaw | Verdict |
|---|---|---|
| **input** | durable DB queue + typed `push` into the live stream; slash-commands correctly force a stream restart | **clean** (cleaner than omnigent stdin / vibe-kanban one-shot) |
| **authoritative output** | in-band `<message>` XML parsing of model text **and** an MCP tool | **conflated + prompt-fragile** (finding 17) |
| **tool calls** | typed MCP config + allowlist; SDK hooks for policy + telemetry; zero scraping; PreToolUse→`container_state`→host-SLA loop | **clean** (best tool-call/runtime integration in the set) |
| **observe/takeover** | `activity`/`progress` collapse to heartbeat mtime + logs; no persisted observable stream; no takeover | **mostly absent** (vibe-kanban's MsgStore is strictly better) |

Notably, NanoClaw has **no provision→ready event** (v3 L0e's core shape, which omnigent's
managed-host path *does* have): wake is fire-and-forget, readiness is implicit in the first
heartbeat/claim — workable only because the runtime *pulls* work from a durable queue rather
than being handed a turn. What its runtime layer adds over prior references: tool-timeout-
aware liveness SLA (vs wall-clock idle kill), install-label-scoped orphan reaping,
per-provider continuation slots, transcript-rotation-as-lifecycle-policy, mount-enforced
context-layer ownership.

---

## 3. L7 + sandbox seam — the security model (the requester's core question)

The hypothesis ("security was a first-class design goal") is **confirmed** — with a sharp
default-vs-configured split.

**Trust boundary:** untrusted chat participants → channel adapters (in the trusted host
process, which holds channel auth, central SQLite, and the `.env` with the OneCLI key) →
host spawns non-root `--rm` containers where **the container IS the permission boundary**
(the SDK runs `bypassPermissions` by design) → egress via an injected proxy → the OneCLI
gateway (separate container) holds real creds and injects `Authorization` on the wire.

**19. LEARN — OneCLI credential-never-travels is real and fail-closed.** The token enters
only the vault (`setup/auth.ts:93-114`, never logged); spawn calls `onecli.ensureAgent` +
**refuses to spawn** without it ("refusing to spawn container without credentials",
`container-runner.ts:492-498`); custom endpoints use `ANTHROPIC_AUTH_TOKEN=placeholder`
rewritten on the wire (`providers/claude.ts:20-28`). The container env carries no NanoClaw
*secret* — what it does carry is `TZ`, provider contributions, `HOME` for non-1000 UIDs, and
the OneCLI proxy/cert config that `applyContainerConfig` injects (`container-runner.ts:448-455,
471, 495`; the proxy config is the *mechanism*, not a credential). The closest real-world
implementation of v3's L7 "secret refs resolve only at the runtime boundary" in the series,
**including the fail-closed spawn** — grant unavailable ⇒ no execution at all, which is
precisely v3's L7 semantics.

**20. LEARN — Egress lockdown is an elegant network-level mechanism (but opt-in).** `docker
network create --internal` + gateway attached as `host.docker.internal` makes the proxy the
only routable hop; non-root + no NET_ADMIN means the agent can't undo it
(`egress-lockdown.ts:64-90`). Fail-fast: `EgressLockdownError` aborts the spawn rather than
silently downgrading — v3's "never silently downgrade" rule, implemented. Achieves omnigent's
"sole egress" goal **without a MITM CA** (CONNECT-level host matching at the gateway), from
stock Docker primitives.

**21. AVOID — Default egress is open, and two module seams fail *open*.**
`NANOCLAW_EGRESS_LOCKDOWN` defaults to `false` (`egress-lockdown.ts:20`): credentials can't
be stolen (vault) but anything in the mounts can be exfiltrated by any raw socket, and DNS
(127.0.0.11) is unaddressed even under lockdown. Worse for v3's fail-closed-grants stance:
`isAdmin` returns `true` when `user_roles` is absent (`command-gate.ts:51`), and non-origin
sends are permitted when `agent_destinations` is absent (`delivery.ts:308-312`).
Enforcement that evaporates when a module isn't installed is *posture, not mechanism* — the
same critique gstack's opt-in/fail-open hook gate earned.

**22. LEARN — Group-to-group isolation is structural, not policy.** Group A can't read B
because nothing of B's is mounted; the central SQLite is **not mounted into any container**
in v2 (verified). Cross-group communication is a host-side ACL (`agent_destinations` row
required, `agent-route.ts:236-238`) with optional per-edge human approval; the
container-visible destination map is **advisory only — the host re-validates on delivery,
authoritative** (`container/agent-runner/src/destinations.ts:10-12`). A clean two-tier
"container map advisory, host authoritative" pattern worth copying at v3's L1/L7.

**23. LEARN — Inbox/attachment safety is boundary-owned content defense.** Both inbound
paths funnel through one guard: lstat the inbox *root* (a symlinked root defeats naive
containment — the GHSA #2828 gap, explained at `inbox-safety.ts:9-41`), realpath
containment, then `COPYFILE_EXCL` so a pre-placed symlinked file can't be followed;
filenames require `basename(name) === name`. NanoClaw treats the platform message id as
attacker-controlled (WhatsApp's `msg.key.id` is client-generated). v3's "content security ≠
transport auth," applied to filesystem writes; the single-chokepoint refactor is itself the
lesson (the fix originally lived in only one of two identical paths).

**24. LEARN — Command gate is deterministic and host-side.** Pure set-membership (6 filtered
/ 6 admin-checked / rest pass), no LLM in the loop (`command-gate.ts:14-47`) — but see the
fail-open caveat (21).

**25. AVOID — Comment-claimed-but-unused safety, and one root-build gap.**
`container-runtime.ts:28` says "Uses execFileSync to avoid shell injection"; line 33 is
`execSync(\`… stop -t 1 ${name}\`)` — actual safety is a regex on validated names. Where
there's no regex it bites: `buildAgentGroupImage` interpolates admin-approved apt/npm
package names into Dockerfile `RUN` lines and `execSync`s the build as root
(`container-runner.ts:526-548`) — a malicious package name surviving admin review executes
at build time (contained blast radius, but real). v3's "boundary-owned audit" should make
comment-claimed-but-unused mechanisms impossible.

**26. LEARN — Supply-chain posture, verified better than claimed.** `pnpm-workspace.yaml`:
`minimumReleaseAge: 4320` (3 days) + a 4-package `onlyBuiltDependencies` allowlist; `.npmrc`
fallback; exact-version pins host + container; pnpm pinned in lockstep because pnpm 11
silently broke the allowlist (they caught a *silent policy regression* in their toolchain).
Blemishes: `curl | sh` installs for Bun and the OneCLI gateway, version-pinned but
checksum-unverified.

**Blast radius of a prompt-injected agent:** CAN run arbitrary bash as non-root in an
ephemeral container, read/write its own group + session dirs (poison its own memory), read
RO global + code, reply to its own chat, *request* packages/a2a sends (stall at human
approval), and (default config) exfiltrate mounted data over open egress. CANNOT read any
credential, reach other groups, send to non-ACL'd destinations, redirect host writes via
symlinks, modify host code or its own gate config, or — under lockdown — reach any endpoint
the gateway doesn't match. **No host-path enforcement rests on prompt discipline**; inside
the container the disallowed-tool list is prompt-adjacent but guards nothing (the wall is
the container, by design).

**Verdict on security:** with `NANOCLAW_EGRESS_LOCKDOWN=true`, NanoClaw is a **real
OS-level trust boundary — the best L0e/L7 sandbox reference architecture in the study
series** (mounts-only visibility + non-root ephemeral containers + vault-side credentials +
no-route network, composed from stock Docker with no MITM CA). In its **default shipped
config** it degrades to "credentials safe, data exfiltratable," and its two fail-open module
seams are posture. **Strongest link:** the OneCLI credential plane with fail-closed spawn.
**Weakest link:** default-open egress + unaddressed DNS.

---

## 4. L6 / L9 — Scheduling, timers, liveness, recovery

**27. LEARN — Scheduled tasks are durable rows on the message queue, not a timer
subsystem.** A task is a `messages_in` row with `kind='task'`, `process_after`,
`recurrence` (cron), `series_id` (`src/modules/scheduling/db.ts:29-36`; "No DB migration —
tasks are messages_in rows"). One-shot/recurring/chat share one lifecycle; everything
survives host restart because the only volatile state is the in-memory `activeContainers`
map. Storage is exactly v3's L6 leaning (durable rows with `process_after`, reconstructable
after crash).

**28. ORTHOGONAL / AVOID (for L6 firing) — Firing is a two-level polling ticker, not
look-ahead.** A self-rescheduling 60s host sweep opens *every* active session's DBs per tick
(O(sessions)) to find due rows (`host-sweep.ts:62,146-211`); an in-container 1s poll picks
them up. Nothing stores a "next wake at T" row. Fine at personal-assistant scale, exactly
the shape v3's L6 wants to avoid at fleet scale. **Copy the row schema; do not copy the
firing mechanism.**

**29. LEARN — Recurrence is drift-free via cron-parser in the user's timezone;
completion=advance.** Completed rows carrying a `recurrence` get the next occurrence via
`CronExpressionParser.parse(…, {tz})`, a fresh pending row inherits `series_id`, and the
recurrence is cleared on the original (`recurrence.ts:26-37`). Cancel/pause match `id OR
series_id` so they hit the *live next occurrence*, not the completed row. **AVOID** the one
flaw: `insertRecurrence` then `clearRecurrence` are two statements — a crash between them
re-clones (v3's "completion = delete-or-advance" must be one atomic step).

**30. LEARN — Stuck detection is a pure decision function over durable signals, with a
workload-declared silence budget.** `decideStuckAction` (`host-sweep.ts:83-119`) is
deterministic/unit-testable; all I/O in the caller. Two rules: absolute ceiling = heartbeat
mtime age > `max(30min, current Bash tool's declared timeout)` (the agent's own
`Bash(timeout:45min)` widens its SLA, recorded via PreToolUse hook into `container_state`);
per-claim stuck = claim age > `max(60s, declared timeout)` AND no heartbeat since claim. The
two-signal conjunction ("claimed and showed no sign of life since") is evidence of silence,
not a wall-clock guess. Heartbeat is a file mtime, deliberately off the contended data plane.

**31. LEARN — Recovery consumes its own evidence.** After a kill, the host resets processing
rows *and deletes the orphan `processing` claims* — otherwise the next tick reads the stale
claim, concludes the freshly respawned container is stuck, and SIGKILLs it before its
startup cleanup runs (`host-sweep.ts:340-356`). Same theme: `justWoke` grace skips the SLA
check on the spawning tick (dedicated regression test); spawn deletes the previous heartbeat
file (missing = "fresh, give grace" not "infinitely stale"). **A recovery action must
consume the evidence that triggered it** — a contract v3's claim+heartbeat+reclaim design
needs explicitly (gastown's discovery model sidesteps it; any claim-tracking design can't).

**32. AVOID — The *retry-exhaustion* ladder never escalates to judgment or a human.** For a
message that keeps failing, the ladder is kill → reset with backoff → `MAX_TRIES` →
`status='failed'` + `log.warn`. No notification, no quarantine, no judgment tier — that
message goes dark; the user notices only by silence. Kill *reasons* are typed strings, but
retry-exhaustion collapses into one `failed` bucket — the "one failed bucket" v3's L9
typed-recovery-reasons item avoids. (gastown's escalation-as-bead is the stronger reference
here.) Scope note (verified): NanoClaw *does* escalate on other paths — unknown-channel
registration routes an approval card to the owner (`router.ts:228,251`), and non-retryable
provider errors (billing/quota) are pushed to the origin chat (`deliverErrorResult`,
`poll-loop.ts:582-593`). The gap is specific to host-side max-retry `failed`, not "no
escalation anywhere."

**33. LEARN — Idle-kill deliberately removed; on_wake race fixed in the query.** "No
host-side idle timeout… avoids killing long-running legitimate work on a wall-clock timer"
(`container-runner.ts:189-192`); idle = same 30-min ceiling. The restart `on_wake=1` row is
visible only to a container's *first* poll (`isFirstPoll`, `messages-in.ts:70-80`), so the
dying container can't consume the restart message — the race is eliminated in the query, not
by timing. Message-arrives-while-killing is benign (row stays pending, next sweep wakes a
fresh container — latency, never loss); concurrent wakes dedup on an in-flight promise map.

**34. LEARN — Startup-after-crash is reconcile-by-discovery, kill-all-labeled.**
`cleanupOrphans` stops all same-label containers at boot (`container-runtime.ts:67-90`):
after a host crash *every* surviving container is an orphan (the in-memory map is gone), so
NanoClaw kills even healthy ones and rebuilds from durable state. Cruder than gastown's
"kill only proven dead" — but here it *is* proven (no supervisor owned them; label scopes
the kill to this install). The `parseSqliteUtc` fix (`host-sweep.ts:51-60`) is a worthwhile
war story: timezoneless SQLite timestamps parsed as local time made every claim look hours
stale → spurious kills on fresh messages.

**35. LEARN — Startup circuit breaker so the dumb supervisor can stay dumb.** A file-based
attempt counter: each startup within 1h of the previous increments and sleeps
`[0,0,10s,30s,2m,5m,15m]`; clean shutdown deletes the file so only *crashes* count
(`circuit-breaker.ts`). It protects against launchd `KeepAlive=true` respawning a
boot-crashing host forever — the process itself carries the backoff. Complements bitsafe's
dead-man's-switch from the opposite direction ("don't thrash if restart always dies").

**36. LEARN — Upgrade tripwire exploits gitignore as a tamper-evident seal.** Marker
`data/upgrade-state.json` records `{version}`; boot refuses unless it matches
`package.json` (`upgrade-state.ts:74-126`). Because `data/` is gitignored, a raw `git pull`
changes code but *cannot* touch the marker — the mismatch is structural, not policed. Fails
closed (unreadable = absent); the refusal message is dual-audience (a human paragraph + a
"CODING AGENT:" paragraph with the exact clear command). Only sanctioned flows stamp it.

**Loop-shape verdict:** NanoClaw is **half of L6** — storage is exactly L6's leaning
(durable `process_after` rows, completion=advance for recurrence, reconstructable after
crash), but firing is the polling-ticker shape v3 avoids (60s sweep scanning every session
DB) and is at-least-once, not idempotent-with-self-discard. **What L9 should copy that
gastown didn't give:** (1) workload-declared silence budgets (a cheap tier *below* gastown's
judgment tier); (2) recovery-consumes-its-own-evidence; (3) executor-side self-exit on
unhealable local failure (typed "I am poisoned, respawn me"); (4) heartbeat off the data
plane, the gitignore upgrade tripwire, and the startup circuit breaker.

---

## 5. L8 — Channels, routing, delivery, identity

**37. LEARN — The declared discriminator set is literally a `UNIQUE` constraint.**
`(channel_type, platform_id, instance)` UNIQUE on `messaging_groups` (`schema.ts:39`) is v3's
"exact correlation oracle" DB-enforced. Inbound lookup is exact-only with **no fallback**
(unknown instance auto-creates its own row rather than hijacking a sibling's,
`messaging-groups.ts:84-101`). The only fuzzy steps are *outbound* (default-instance-first
resolution, and a2a peer-affinity — finding 43), and both are *documented as deliberate* —
an unusually honest treatment of the exact-vs-lenient split.

**38. AVOID — `platform_id` shape is a fragile cross-adapter convention.**
`namespacedPlatformId` (`platform-id.ts:19-25`) decides prefixing by string-sniffing
(`@`→raw, `+`/`group:`→raw, `deltachat`→raw — a hardcoded platform branch). Any writer of a
`messaging_groups` row must reproduce the exact shape the adapter later emits "or router
lookups miss and messages get silently dropped." v3's "transport id is opaque, adapter-owned,
never synthesized elsewhere" rule prevents this.

**39. LEARN — The `instance` dimension as a third correlation coordinate with asymmetric
resolution.** `instance` is the host-side routing key; `channelType` stays the semantic
platform key (`adapter.ts:120-126`). Multi-install of one platform requires namespacing
three keyspaces separately (routing, identity, SDK-dedupe state) — evidence that "connector
id" deserves first-class envelope status, which v3's L8 already says. The net-new nuance
v3 hasn't named: the **inbound/outbound asymmetry rule** (exact-only inbound auto-create vs
default-first outbound convenience) and origin-session-first reply resolution (replies exit
through the identity they entered on).

**40. AVOID — The envelope does NOT cleanly separate content from identity.** `messages_in`
columns carry the delivery address while `content` is an opaque JSON blob
(`schema.ts:163-188`): sender identity lives *inside* the blob (permissions must sniff three
shapes), there are two message kinds (`chat`/`chat-sdk`) with different schemas, and the
address columns are overwritten by `replyTo` for CLI-originated events (source identity
lost). A live example of the two-format tax v3's one-envelope stance avoids — plus the
net-new observation that the identity block has *two addresses* (source vs delivery) with
different trust levels, which v3 hasn't named.

**41. LEARN — Attachments dematerialized to local artifact refs; raw dropped.** The bridge
downloads bytes, strips `data`, writes to `inbox/<msgId>/`, rewrites to `localPath`; no
platform URL survives, and `serialized.raw = undefined` (`chat-sdk-bridge.ts:160-204`) —
unlike omnigent's keep-everything EventNormalizer (~4× cost for unstructured). Exactly v3's
"large/sensitive payloads by local artifact ref."

**42. AVOID — Inbound dedup is delegated per-adapter; the host backstop is idempotency-by-
crash.** "The host does not deduplicate — if the adapter forwards it, the host writes it"
(`architecture.md:183`). The only host backstop is a PK violation on redelivery, caught and
*error-logged*. Native adapters each reinvent dedup. v3's L8 should own an idempotency key
at the ledger boundary.

**43. AVOID — The *outbound* ledger is two-state and mixes crash vs platform-fail; its retry
counter is in-memory.** `delivered` has only `delivered|failed` ("queued" implicit); no
acknowledged/expired/superseded. The **outbound delivery** retry counter is an in-memory Map
that resets on restart, so the 3-attempt cap is per-process and a persistently-failing send
oscillates forever; `failed` is terminal and silent. (Contrast — verified: the *inbound* side
*does* have durable retry state, `messages_in.tries` + `process_after` surviving restart,
`schema.ts:169-172`; the in-memory-counter defect is specific to outbound delivery.) v3's
six-state ledger with a stable delivery id is strictly richer. (a2a reply correlation
additionally degrades to fuzzy: exact `in_reply_to` → "peer-affinity" heuristic →
newest-active-session — L8/L9 contamination v3 forbids.)

**44. AVOID — The single worst delivery hole: offline adapter ⇒ marked delivered and
destroyed.** `deliver()` returns `undefined` (not throw) when the exact-instance adapter is
offline (`channel-registry.ts:86-90`); the loop then logs "delivered", `clearOutbox()`
deletes the attachments, and `markDelivered` fires (`delivery.ts:370-390`). Permanent silent
loss — on the path whose own comment claims it feeds the retry path, re-creating the exact
"marked delivered when nothing was delivered" bug the ACL refactor fixed one screen above.

**45. LEARN — but the duplicate-send race is understood at three layers.**
`inflightDeliveries` guards the poll race; `clearOutbox` failure deliberately does not
propagate ("already on the user's screen… a thrown error would deliver twice"); the container
has "output-sent protection" (don't retry the turn if `messages_out` already has delivered
rows). NanoClaw chose at-least-once + dup risk deliberately; finding 44 is the unintended
opposite.

**46. LEARN — Session-existence-as-subscription (mention-sticky).** `engage_mode=
'mention-sticky'` fires on mention OR when a session already exists for (agent, mg, thread)
(`router.ts:403-410`) — no separate subscription table; correlation state doubles as
engagement state, idempotent by construction. A net-new pattern v3's L8 hasn't named.

**47. LEARN — dropped_messages as an inbound *non-delivery* ledger.** Structural drops
(`no_agent_wired`, `no_agent_engaged`) recorded by core; policy refusals by the gate that
refused (`router.ts:16-19,240-360`). v3's ledger taxonomy is outbound-only; this is the
inbound mirror. Plus a security-conscious rule: gate-refused messages are *not* accumulated
as silent context (that would stage an untrusted sender's attachments to disk).

**48. LEARN — Response (button-click) correlation does not trust the transport.** `onAction`
dispatches only `(questionId, value, userId)` with `platformId: ''`; handlers re-derive the
delivery address from the `pending_questions` row persisted at send time
(`delivery.ts:331-354`). Correlation-by-stored-state, not by echoed-payload — the platform
can't spoof where a response lands, only which question it answers.

**49. AVOID (trust) — Any stranger who @mentions the bot creates a DB row.** Router
auto-creates `messaging_groups` on first mention/DM from any unwired channel
(`router.ts:196-221`) — unauthenticated row creation driven by webhook content. Mitigations:
no engagement without wiring, `denied_at` tombstones, owner-escalation gate,
`UNIQUE(messaging_group_id, sender_identity)` dedup so a spammer can't flood the admin.
Meanwhile **agent-group** creation *is* properly host-authorized (container-side MCP gate "is
trivially bypassed by writing the outbound system row directly", so it fails closed to admin
approval). The webhook server itself does no auth (binds 0.0.0.0:3000); signature
verification is delegated to per-platform handlers.

**Channel verdict:** trunk ships **zero platforms** — all 20+ adapters live on a long-lived
`channels` branch, installed per-fork via `/add-<channel>` skills (finding 51). The
normalizer contract is frozen while the fleet iterates on a donor branch. What NanoClaw adds
over v3's named L8: the inbound/outbound asymmetry rule, the inbound non-delivery ledger,
session-existence-as-subscription, and the two-address (source vs delivery) identity split.
The single worst hole is finding 44.

---

## 6. L5 / L0f / L11 / L12 — Skills, config, templates, fork governance, memory

**50. LEARN — "A fork is a recipe of skills": customization as a replayable, testable
artifact, not a diff.** Each customization = one skill carrying its own code, idempotent
apply, `REMOVE.md`, tests, and a recipe entry (`docs/skills-model.md:17-26`); a fork is
defined by its recipe and rebuildable from clean upstream. This is what makes a heavily
customized downstream fork (the **BitSafe pattern**) viable: the fork's identity is a
declarative-ish list of skills, not thousands of diverged lines. Plugin-like composability
*without* a plugin API — the "API" is the file tree + a few barrels, enforced by tests.

**51. LEARN — Integration-point tests as the upgrade contract (the most v3-relevant idea in
this slice).** Upgrade risk is quantified as the count of "reach-ins" into existing code, and
*every functional reach-in ships a test that goes red if the wiring drifts*
(`skill-guidelines.md:22-34`, "red if the wiring is deleted or drifts"; the `:161-184` range
is the "Worked examples" section); "the failing list *is* the set of skills to update"
(`skills-model.md:87`). Behavior tests run through the real barrel (a structural parse "stays
green when the barrel can't evaluate — exactly when the thing is broken"). This is the
missing third leg beyond superpowers/gstack skill *methodology*: how a skill proves it still
*works* after the host changed underneath it. Reusable for v3 **L12** as a machine-checkable
seam contract between accepted definitions and the evolving core: it turns "definition
changes through one audited channel" from policy into mechanism — drift is detected by
construction. Altitude note: this is really a *fork/upgrade governance discipline* (keeping a
downstream's customizations wired as trunk moves) that L12's audited channel can **adopt as a
mechanism** — it is adjacent to, not identical with, L12's core memory→definition learning
loop; the shared thread is "definition/customization change must be drift-detected and
audited."

**52. LEARN — The upgrade path is a single audited, self-updating, fail-closed channel.**
`/update-nanoclaw` is the only sanctioned way in: it refreshes its own instructions *first*
(Step 0a — "otherwise you're upgrading with stale instructions"), backup branch+tag, dry-run
conflict preview, `[BREAKING]` CHANGELOG parsing routing to migration skills, and only then
stamps the tripwire marker. The two-sided maintainer contract (users skillify; maintainer
keeps core small, runs the skill fleet against every core change, ships migrations packaged
with breaking changes) plus a public-registry rule — *every new version re-reviewed*,
"approving once and trusting forever is how supply chains get poisoned" — is exactly v3's L5
lifecycle+trust bar as policy.

**53. AVOID — The package manager is prose executed by an LLM.** Apply/remove/upgrade are
natural-language SKILL.md steps run by Claude Code. Well-mitigated (idempotence rule,
pre-flight checks, "apply with a small cheap model" robustness check, an anti-pattern
catalog), but the failure modes it must catalog — half-applied skills, stale reach-in
targets, incomplete `REMOVE.md` — are exactly what a deterministic package manager doesn't
have. For v3: skill lifecycle *operations* should be deterministic host operations; prose is
for judgment, not for `cp`/`pnpm install`. (And registry branches recreate the merge fight
one level up — the maintainer absorbs an O(branches) manual merge chore.)

**54. LEARN — The template is a genuinely portable definition; deployment is excluded by
rule (the anti-omnigent).** A template = persona `instructions.md` + optional context +
`.mcp.json` (command+args, **no secrets**) + skills. Explicit exclusion: "No provider, model,
effort, or packages in a template" (`docs/templates.md:82-84`) — those bind later via the
DB `container_configs` row + vault. Where omnigent's AgentSpec leaks auth/os_env into the
portable image, NanoClaw's split is portable-definition (template) / repo-local-deployment,
and the stamping code enforces it (`agent_provider: null` deferred to first spawn,
`templates/create-agent.ts:34-77`). What's *missing* vs v3's typed-slot L0f: nothing is typed
(no declared slots type+default+required), the cascade is implicit, and stamped context files
silently go stale (no template→instance version link). One residual leak: the `.mcp.json`
`env: {ACME_API_KEY: "placeholder"}` hack for MCP servers that refuse to boot without the var
present — acknowledged and bounded, but a small instance of the omnigent leak class.

**55. AVOID — Provider-shaped memory (the clearest anti-pattern in this slice).** Memory is
agent-curated prose with no types, no provenance, no perspective: `CLAUDE.local.md` +
agent-invented satellite files + `conversations/` transcripts (`container/CLAUDE.md:11-19`),
written by the agent at its own judgment. Worse, it is **provider-shaped** — Claude gets flat
`CLAUDE.local.md` (auto-loaded), Codex gets a `memory/` scaffold, and crossing providers
requires `/migrate-memory`, a human-invoked LLM distillation ("you are the inference step").
Against the honcho bar (typed, perspective-aware, provenance) this is exactly v3's named L11
failure mode — memory via a provider-specific hook — implemented deliberately and mitigated
with an ops skill instead of an adapter-independent port. Worth keeping: the explicit
*tiering* language (persona = system-prompt tier, must NOT live in a recall-tier memory
file).

**56. LEARN — The scripted-path / judgment-handoff hybrid, with a written contract (the most
complete "AI-native ops" in the series).** `setup/` (~18.7K LOC) pairs deterministic
installers with a strict output contract: `docs/setup-flow.md` defines **three output levels
with three audiences** — user terminal (product), `logs/setup.log` ("the thing an AI agent
would read": timestamped step blocks, user *choices* logged as first-class entries because
they determine the path), and per-step raw logs (evidence). Every step emits a
machine-parseable `STATUS:` block and exits non-zero on hard failure. Deterministic core;
Claude gets error recovery, post-install ops, and the migration tail — `migrate-v2.sh`
refuses to run inside Claude (TTY check), does the 700-line deterministic migration, writes
`handoff.json`, then `exec claude "/migrate-from-v1"` for the judgment tail. The "Anthropic
exception" (exactly one step may own the TTY for OAuth, documented with rationale) shows the
discipline. Relevant to v3's ops layer and to the L12 "audited channel" pattern: logs
designed for an agent reader, error text addressed to agents, deterministic core with named
judgment exits.

**57. LEARN — DB-as-truth, file-as-spawn-time-materialization for config.** Per-group config
(provider, model, effort, packages, MCP, mounts, skills, `cli_scope`) lives in
`container_configs`; `materializeContainerJson` writes `container.json` fresh every spawn;
the backfill migration is "DB wins over file (matches old cascade)". Clean generated-vs-owned
split — everything host-composed is regenerable; exactly two files are persistent and owned
(persona prepend, `CLAUDE.local.md`).

**58. ORTHOGONAL — "Fits in one context window" as a measured (currently failing) public
metric.** `repo-tokens/` is a tiktoken GitHub Action rendering a README badge colored by % of
a 200k window; current state **`207k tokens, 104%`** — the repo is over its own budget,
displayed honestly (red badge) but not textually acknowledged and *not enforced* (the
workflow updates the badge, never fails the build). For v3: if "agent-legible size" is a
design constraint, make the threshold a failing check, not a badge color.

**59. ORTHOGONAL — "Skill" is four different things, and only one is L5-shaped.** Channel/
provider install skills (code installers), utility skills (scripts), operational skills
(runbooks), and container skills (loaded into agent sessions). Only container + template
skills resemble L5 portable capability packaging; the rest are governance/ops artifacts
sharing the SKILL.md container. No action-indirection layer — skills embed concrete commands.
The v3 lesson is taxonomic: "skill" as one word absorbs installers, runbooks, personas, and
capabilities unless the model names them as distinct kinds.

---

## Consolidated Direction

| v3 level | NanoClaw's contribution | Verdict |
|---|---|---|
| **L0a kernel** | single-writer mailbox topology; seq-parity ID partition; corruption self-exit; SQLite-as-fragile-file-protocol; **no T1/CAS/transcript**; apply at-least-once + delivery marker-after-effect | **cautionary** — the catalog of seams v3's idempotency ledger + produce-not-perform close |
| **L0c adapter** | typed provider contract + capability flags (anti-omnigent-drift); per-provider continuation slots; checkpoint-at-init record-not-replay; input/tool channels clean; **output conflated + prompt-fragile**; observe absent | **adopt** the contract + slots; **avoid** the in-band-envelope output |
| **L0d lifecycle** | pure `decideStuckAction`; workload-declared silence budget; recovery-consumes-evidence; startup circuit breaker; kill-all-labeled reconcile | **best-in-class supervision reference** |
| **L0e provider** | container = zero durable identity; install-label orphan reaping; idempotent wake via promise map; **no provision→ready event** | **adopt** identity split + orphan reaping; note the missing ready-event |
| **L6 triggers** | durable `process_after` rows + drift-free cron recurrence (adopt); 60s polling ticker + at-least-once firing (avoid) | **half of L6** — copy storage, not firing |
| **L7 credentials** | OneCLI vault, fail-closed spawn, egress lockdown without MITM; **default-open egress + fail-open module seams** | **best L7 reference** with lockdown on; posture off |
| **L8 channels** | UNIQUE-constraint correlation oracle; inbound non-delivery ledger; session-as-subscription; two-address identity; **silent-loss delivery hole**; two-format envelope tax | **adopt** the oracle + non-delivery ledger; **avoid** the delivery guarantees |
| **L9 recovery** | workload silence budget + recovery-consumes-evidence + executor self-exit (net-new over gastown); **no escalation to judgment/human** | **adopt** the four new details; note the missing escalation tier |
| **L11 memory** | provider-shaped prose memory | **anti-pattern** — v3's named L11 failure mode in production |
| **L12 metacognition** | integration-point tests as upgrade contract; single self-updating fail-closed audited channel | **strong mechanism** — turns L12 policy into a machine-checkable seam contract |
| **L0f / templates** | portable-definition/deployment split enforced (anti-omnigent); **untyped, no slot cascade, no version link** | **adopt** the split; note the missing typed slots |
| **sandbox seam** | stock-Docker OS-level isolation, mounts-only, structural group isolation, boundary-owned content defense | **best sandbox reference in the corpus** (lockdown on) |

## Reconsiderations for the v3 model

1. **The integration-point contract (L12).** NanoClaw is the first study to show a
   *machine-checkable* form of "definition changes through one audited channel": quantify a
   customization's coupling as reach-in points, guard each with a red/green test, make the
   upgrade channel self-updating and fail-closed. Worth folding into the L12 future-topic as
   a concrete mechanism, not just a policy.

2. **Workload-declared silence budgets (L9).** A cheap tier *below* gastown's judgment tier:
   the executor publishes "running tool X, declared timeout T" and the watchdog's tolerance
   becomes `max(floor, T)`. Before routing "stuck" to intelligence, let the work itself
   declare how long silence is legitimate. New detail the L9 slice should carry.

3. **Recovery-consumes-its-own-evidence (L9/L0d).** Any claim+heartbeat+reclaim design must
   delete the stale claim (and grant a one-tick grace) as part of the recovery action, or the
   watchdog serially kills every replacement it spawns. gastown's discovery model sidesteps
   this; v3's claim-tracking design cannot.

4. **The delivery-guarantee catalog (L0a/L8).** NanoClaw is the cleanest negative proof of
   why v3 puts durable markers *before* external effects: marker-after-effect (dup) and
   mark-complete-before-processing (loss) and mark-delivered-on-undefined (silent loss) are
   three distinct seams, all present here, all closed by v3's produce-not-perform +
   idempotency ledger.

5. **Provider-shaped memory as the concrete L11 anti-pattern.** Cite NanoClaw's
   `/migrate-memory` as the production form of "memory via a provider-specific hook makes
   provider-switch a lossy migration" — the argument for v3's adapter-independent memory port.

## Caveats

- **v2 only.** All findings are against the v2 checkout at HEAD `b28c917`. v1 differs
  (the migration scripts encode the delta); `docs/SECURITY.md` is partially stale toward v1
  and in places describes the system as *weaker* than v2 actually is (v2 mounts no project
  root / no store into any container) — the rare good direction of doc drift, but the same
  failure class as a comment claiming an unused mechanism (finding 25).
- **Trunk vs branches.** Trunk ships zero channels and only the `claude`+`mock` providers;
  channel breadth and alternative providers live on long-lived donor branches and install
  per-fork. Statements about "20+ platforms" describe the `channels` branch, not trunk.
- **Not a kernel.** The recurring "no T1 / no CAS / no transcript" finding is not a gap
  NanoClaw is trying to fill — it is a different layer. This study reads it as the runtime
  and supervision reference it is, not as a failed kernel.
