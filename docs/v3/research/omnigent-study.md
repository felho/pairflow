# Omnigent Study — What v3 Can Learn From a Shipped Meta-Harness

Date: 2026-06-19

## Purpose

This note captures what Pairflow v3 can learn from **Omnigent**, an open-source
("alpha") AI-agent **meta-harness** — a ~90k-line system that already ships, in
production, many capabilities the v3 core model is still designing on paper.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/omnigent`

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)
- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself

The goal is not to copy Omnigent. It is the opposite of the Ruflo study (which
was about *method*): Omnigent is about **substance** — a working instance of the
actor/runtime/credential/child-instance machinery v3 models abstractly. Because
it is a real system, its **design decisions and its scars** are both evidence.

> Method: first-pass seven-slice analysis plus a second, independent 10-lens pass
> performed before rereading this report. The second pass looked specifically at
> state ownership, lifecycle/recovery, concurrency, runtime adapters,
> policy/security, delegation, channels/events, memory/context, operator UX, and
> modularity. Citations are relative to the Omnigent repo root. A few deep-store
> paths (e.g. `stores/…`, `runner/app.py`, `inner/…`) were reached by sub-search.

## Executive Summary

The single load-bearing finding:

> **Omnigent is strong exactly where v3 is still planning the *outer* layers
> (L0c actor-adapter, L0e runtime-provider, L7 credentials, L4 child-instances),
> and it suffers exactly where v3 puts the *hard kernel invariants* (L0a
> idempotency / atomic-commit, L0d lifecycle).** v3's kernel is, in effect, a
> direct answer to Omnigent's worst live failure classes.**

What Omnigent **validates** (build it the way v3 already plans):

- **L4 child = full first-class instance** — persisted child session, `parent_ref`
  back-link, parent parks and is push-woken by a lifecycle event, idempotent
  spawn keyed on `(agent, title)`. This is the strongest single confirmation in
  the study, and it settles the L4-vs-L5 question in favour of "full instance".
- **L0e runtime provider** — async `provision` + an explicit ready-event
  rendezvous, teardown on every failure path, a durable provider identity
  distinct from the disposable runtime, and a worktree provider that is a
  remote-exec contract with request-id correlation.
- **L7 credential-never-travels** — a swap-on-access egress proxy puts *nothing*
  secret inside the sandbox.
- **L0a persist-before-publish** and **L1≠L2 separation** (authorization vs gate).

What Omnigent **warns** about (v3's kernel choices are the fix):

- **No kernel idempotency.** No `(instance_id, op_id)` keyed no-op, no
  atomic-commit-under-`expected_version`. The result is a real, user-visible
  **duplicate-message bug** and a "was it delivered?" classifier that exists only
  because the sink is not idempotent. This is the textbook argument *for* L0a.
- **Lifecycle conflation.** Session status is *computed on read* from an in-memory
  cache; there is no stored lifecycle axis, "closed" is a label, and parked waits
  live in RAM and die on restart. This is exactly the L0d gap.
- **Leaky actor abstraction.** Adapters are duck-typed by copy-paste convention,
  so per-harness drift is invisible until it bites.

What Omnigent is **missing** that becomes a v3 *strength*:

- No `warn`-that-continues gate verdict (only ALLOW/ASK/DENY).
- Human decisions are stored as *state*, not as an *audited
  `{recommendation, verdict, override}` tuple*.
- No bounded-subprocess process gate (its "process" policies are in-process
  callables) — so L2a is genuinely net-new.

Second-pass refinement: Omnigent is not simply "weak on the kernel." It has a
useful split between a durable session row, a positioned append-only item log, a
single-writer transcript rule per harness, and transient relay indexes. v3 should
copy the split and strengthen the missing piece: a first-class operation id and
durable outcome row for every mutation.

Second-pass refinement: Omnigent's operator surface is unusually rich for liveness
diagnostics. It distinguishes runner-online from host-online, gives different
recovery actions for `runner_asleep`, `host_offline`, and `local_stranded`, and
uses push-first observability with targeted polling fallback. v3 should treat this
as part of the lifecycle model, not merely UI polish.

---

## 1. L4 — Child workflow instances (strongest validation)

Omnigent's orchestrator/sub-agent model is, almost field-for-field, the v3 L4
design — proven in production.

- A sub-agent is a **persisted, resumable, UI-openable child session** with a
  DB-level `parent_conversation_id` back-link — **not** an embedded subroutine.
  This settles **L4 (full instance) vs L5 (embedded subflow)** in favour of L4.
  (`server/routes/sessions.py:1865-1867` walks `parent_conversation_id`;
  `:1747` lists children; `kind="sub_agent"` rows around `:385-400`.)
- The orchestrator dispatches via **tools**, not by spawning processes itself:
  `sys_session_send` (to a declared sub-agent) / `sys_session_create` (a
  self-authored child); `spawn: true` registers the create tool
  (`examples/polly/config.yaml:12-16, 95-100`).
- The parent **parks between turns** and is **push-woken** by a framework-injected
  message when a child reaches a terminal state:
  `"[System: sub-agent {agent}/{title} finished ({status}) — N results waiting…"`
  (`runner/app.py:4153-4170`). This wake **is** v3's `CHILD_LIFECYCLE` internal
  kernel event delivered as a channel.
- **Idempotent spawn on `(agent, title)`** = v3's `child_key` (DB unique index;
  re-sending the same title continues the existing child).
- Results return via an **inbox queue** drained on wake (`sys_read_inbox`).

### The refinement v3 should absorb

Omnigent treats the **delivery** of the lifecycle event as a first-class,
safety-critical concern, because a dropped wake **silently strands the parked
parent forever**:

- bounded retry budget on the wake POST (`_WAKE_POST_MAX_ATTEMPTS=3`,
  transient-4xx set, `runner/app.py:130-139`);
- the wake can itself park behind a human-approval gate for up to a day
  (`_ASK_GATE_DELIVERY_READ_TIMEOUT_S=86400`, `runner/app.py:111-122`);
- fan-out completions are **debounced** — while a parent's wake is outstanding,
  later child completions queue silently and one wake turn drains them
  (`_subagent_wake_pending`, `runner/app.py:4564-4570`).

> **v3 action:** model `CHILD_LIFECYCLE` (and other internal kernel events)
> delivery as **durable / at-least-once**, with retry and a deliverability
> timeout — not fire-and-forget. v3 currently models the *creation* of the event
> carefully; model the *delivery* with equal care. Add a fan-in **dispatch cap +
> debounce** so a wide join does not thundering-herd the parent.

### Fan-out / fan-in (the L4 deferred part, shown working)

`examples/polly` fans out one implementer sub-agent per parallel-safe task across
**different harnesses** (claude-native / codex / pi), each opening its own PR; a
per-turn `spawn_bounds` cap (`max_dispatches_per_turn: 5`,
`examples/polly/config.yaml:301-310`) forces "waves". **Fan-in is the inbox** —
heterogeneous vendors join uniformly because every child terminates into the
same wake/inbox contract. Roles ride `args.purpose`
(`implement | review | explore`), enforced by a `headless_subagent_purpose_guard`
policy. **Cross-review** = a typed join with a constraint: the reviewer must be a
*different vendor*, sees only the diff+contract (never the worktree), and blocking
issues route back to the **same** implementer session by reusing `(agent,title)`.

> **v3 lesson:** a fan-in join needs (a) a dispatch cap, (b) a uniform completion
> channel so vendor differences vanish at the join, (c) idempotent continuation
> (`child_key`) so a "fix" routes to the same child, not a fresh one.

---

## 2. L0a — Idempotency & atomic commit (the cautionary tale)

Omnigent has **no** kernel-level `(instance_id, op_id)` idempotency and **no**
atomic transition commit under `expected_version`. Instead:

- Append-only `conversation_items`, but concurrency is guarded by **pessimistic
  row-lock + a UNIQUE `(conversation_id, position)` index** — and the loser
  **crashes with `IntegrityError`** (`stores/conversation_store/sqlalchemy_store.py:502-512`),
  it is **not** absorbed as a no-op.
- Mirrored external items get a **random PK and are explicitly NOT deduped**
  (`_native_post_delivery.py:8-14`), so the system needs a
  `post_may_have_been_delivered` **classifier** to reason about retry safety
  (`_native_post_delivery.py:30-57`). A lost response after commit produces a
  **duplicate web bubble** — precisely the failure v3's idempotency erases.
- True idempotency exists only narrowly and **in-memory**: a Pi `seen` set that
  is wiped on relaunch (`pi_native_bridge.py:61-79,140-184`) — `clear_inbox`
  exists *because* a fresh process loses the dedup set.

The **one** place Omnigent gets it right is the **deterministic
`elicitation_id` tombstone** (`server/_elicitation_registry.py:59-92`): a
deterministic id consumed once = a keyed no-op. That is exactly the pattern v3
should generalize kernel-wide.

Also relevant (L8/L0a): **persist-before-publish (invariant "I1")** — an item is
written to the durable store *before* it is forwarded or streamed
(`server/routes/sessions.py` contract notes). And a cautionary detail: the wire
schema declares a `sequence_number` field that **no producer ever stamps**
(`server/schemas.py:1998`; `_format_sse` at `:1553-1562` never sets it) — ordering
actually rides on store-assigned item id. A nullable-but-unused ordering field is
a latent bug.

> **v3 action:** make the **sink** idempotent (`(instance_id, op_id)` keyed
> no-op committed atomically under `expected_version`), so producers never reason
> about retry safety; keep persist-before-publish as a hard kernel invariant; and
> ensure every ordering/identity field (`op_id`) is actually assigned at commit,
> never "aspirational". Prefer a keyed no-op over "lock + unique constraint that
> crashes the loser", and a deterministic id over an ephemeral seen-set.

---

## 3. L0d — Instance lifecycle (conflation warning)

Omnigent **computes** session `status` (`idle | running | failed`) on read from a
live in-memory cache + latest-task status (`server/schemas.py:1399-1422`). There
is **no stored universal lifecycle axis**, "closed" is just an `omnigent.closed`
label or a `:closed:` title infix (`session_lifecycle.py:7-87`), there is **no**
`terminal_disposition`, **no** typed `wait{}`, and **no** lifecycle guard. Parked
waits live in per-replica in-memory registries and **die on restart**.

| v3 `kernel_status` | Omnigent equivalent | Stored? |
|---|---|---|
| CREATED | — | no |
| ACTIVE | computed `running` | no (derived) |
| WAITING | in-memory elicitation/registry | ephemeral, lost on restart |
| TERMINAL | `omnigent.closed` label | label only |
| `terminal_disposition` | task-level `failed` only | partial |

A sound pattern to borrow: heartbeat-TTL liveness (host freshness 90s / 3 missed
30s heartbeats, `stores/host_store.py:35,97`) + a presence leave-grace
(`server/presence.py:66`) — useful for v3 WAITING actor-liveness / timeout.

> **v3 action:** store `kernel_status` + `terminal_disposition` + typed
> `wait{kind, resume_events}`; derive workflow phase from `current_step`/`wait`,
> never a second stored truth; enforce the emit-only-when-ACTIVE lifecycle guard.
> Persist `wait{}` in the transcript, not in RAM.

---

## 4. L0c — ActorAdapter (the leaky-abstraction lesson)

Omnigent does **not** put the four harnesses behind an explicit `Protocol`/ABC;
each `*_native.py` independently re-implements the same ~10 functions by **copy-
paste convention** (compare `pi_native.py:130-201` vs `cursor_native.py:155-226`).
The result is invisible per-harness drift (diverging `PreparedX` dataclasses;
"unlike claude_native" comments; mutually-exclusive flags).

The most load-bearing concrete finding: the **same run-intent (model + reasoning
effort) becomes a radically different invocation per harness**:

- Claude → argv flags `--effort <e>` / `--model <m>`;
- Codex → a **TOML `model_providers.*` config block** injected via `-c` (Codex has
  no `--effort` flag — effort rides inside config);
- Pi / Cursor → **nothing** (they ignore the override; hence
  `harness_supports_model_override`, `model_override.py:211-230`).

Model-family compatibility is a **hardcoded matrix** (`model_override.py:91-137`);
ids are validated at one shared choke point (`validate_model_override`,
`model_override.py:33-52`) but **localized per provider** (the `databricks-`
prefix dance, `:173-208`). Resume fidelity also leaks: Cursor **cannot reattach a
dead chat** → a unique `cold_resumed` flag (`cursor_native.py:84-109`). Tool/MCP/
skill wiring is a **separate** per-harness augment step (`augment_claude_args`,
`claude_native_bridge.py:1226-1280`), not part of the common launch path.

> **v3 action:** make `ActorAdapter` an **explicit Protocol** (launch / resume /
> capability-declaration / tooling as named methods), so divergence is visible at
> the type level. Treat "intent → invocation" as **fully adapter-owned and
> non-uniform** (argv *or* config file *or* env). Let an adapter **declare a ref
> unsupported and reject up front** rather than silently drop it. Validate config
> refs at a shared choke point, but **resolve them provider-relative** inside the
> adapter — keep the kernel free of any per-runtime model matrix. Give tooling its
> own `apply_tooling()` step.

---

## 5. L0e — Runtime context provider (validation)

- **Managed hosts** (Modal / Daytona / Islo cloud sandboxes) are provisioned
  per-session with `launcher.prepare()` → `launcher.provision(host) → sandbox_id`
  (`server/managed_hosts.py:1205-1213`), run off-thread.
- **Async ready signal**: `POST /v1/sessions` returns **before the sandbox
  exists**; a `ManagedLaunchTracker` (`server/managed_hosts.py:224-294`) exposes a
  `settled: asyncio.Event` waiters block on, resolved by polling the hosts table
  until online (`MANAGED_HOST_ONLINE_TIMEOUT_S=120`). **This is exactly v3's
  `RUNTIME_CONTEXT_READY` fired-event pattern.**
- **Teardown on every failure path** after provision
  (`_terminate_sandbox_best_effort`, `:1286`).
- **Durable host id vs disposable sandbox**: `relaunch_managed_host`
  (`:1233-1307`) re-provisions while host row + session bindings survive — decouple
  the `RuntimeContextRef` identity from the physical runtime so relaunch survives
  provider lifetime caps / crashes.
- **Worktree provider** = literally v3's `pairflow.worktree`: a **remote-exec
  contract** — the server sends a `host.create_worktree` frame over the tunnel and
  awaits a **request-id-correlated** reply (150s timeout); **the host runs git,
  not the server** (`server/routes/_host_worktree.py:132-182`). The mirror is
  `remove_worktree_on_host(...)` (`:185-231`). Copy this provision/release pair
  and the request-id correlation directly.
- **MCP pooling** = `tool_refs` provisioning: a spec-hash-keyed, warm-on-demand,
  LRU-evicted pool with a per-server `tools` allow-list = `tool_policy`
  (`server/mcp_pool.py:105-190`).

> **v3 action:** async provision + explicit ready-event; teardown mirrors every
> failure path; `RuntimeContextRef` identity ≠ physical sandbox; the worktree
> provider is a request-id-correlated remote-exec contract, not a local op.

---

## 6. L7 — Grants & credentials (the crown jewel)

`designs/SANDBOX_CREDENTIAL_PROXY.md` + the egress proxy are the most relevant
external reference for v3 L7's "the credential never travels".

- **Trust boundary**: the unsandboxed parent process and the in-memory proxy
  rewrite table are trusted; everything inside the sandbox is untrusted. The real
  secret lives **only** there — never in the serialized `SandboxPolicy`
  (`cli_sandbox.py` / `sandbox.py:151-157` deliberately omits `credential_proxy`
  from `to_jsonable`), never on argv, never on the sandbox disk.
- **Swap-on-access (default)**: the tool fires an *unauthenticated* request to the
  bound host; a parent-side MITM egress proxy **injects `Authorization` on the way
  out** (`inner/egress/proxy.py:1084-1129`). TLS is terminated via a trusted MITM
  CA. Nothing secret ever entered the sandbox.
- **Placeholder path (opt-in)** for clients that gate on a *local* token first
  (e.g. `gh`): the parent mints a single-use, host-bound, **non-secret**
  `oa_cred_*` placeholder, injects only that, and the proxy swaps it to the real
  secret — **rejecting a placeholder replayed to any other host with HTTP 403**
  (`credential_proxy.py:46`; `inner/egress/proxy.py:1116-1129`). This is the
  cross-host leak guard.
- **Precondition (the teeth)**: the proxy is secretless **only if it is the sole
  egress path** — a hard-isolating backend (bwrap / seatbelt) + egress rules — so a
  tool cannot open a raw socket around it
  (`designs/SANDBOX_CREDENTIAL_PROXY.md:91-98`).

OS sandbox itself: macOS Seatbelt prepends `sandbox-exec -f <0600 profile>`
(`seatbelt_sandbox.py:444-538`), `(deny default)` baseline, RO system roots,
cwd-only write, dotfile mask denying `.aws/.ssh/.env`; Linux bwrap adds
PID/UTS/IPC namespaces + seccomp + `--unshare-net`.

> **v3 action:** prefer **swap-on-access** over injection (nothing in the
> sandbox); bind each credential to a **target (host/argument)** and reject
> off-target use (the seed of L7 argument-level predicates); guarantee the secret
> is absent from every serializable surface (packet, log, dump); and treat
> "sole-egress" as the explicit precondition — a raw-socket escape voids the whole
> model.

---

## 7. L1 / L2 / L2a / L3 — Authorization, gates, human approval

### L1 ≠ L2 separation (validated)

Omnigent keeps **authorization** (a REST permission layer: read / edit / manage /
owner, `server/permissions.py`, `check_session_access`) **physically separate**
from the **policy gate** (the ALLOW/ASK/DENY pipeline). A read-only caller is
barred from even *entering* the ask gate, because parking is a mutation
(`server/routes/sessions.py:14341-14346`) — an L1 capability check running *inside
the kernel before* the L2 gate. This validates the v3 L1 (`role × current_step →
allowed actions`) vs L2 (`GateBinding` on `(step, event_type)`) split.

### L2 gate (validated + one gap)

- Policy = a phase-bound pipeline (REQUEST / TOOL_CALL / TOOL_RESULT / LLM_*),
  bound at three scopes (session → agent-spec → server, session-first,
  DENY short-circuits, `docs/POLICIES.md:13-21`), declared as
  `{type: function, handler: <dotted-path>, factory_params}` with a registered-
  handler allowlist as the RCE guard (`server/routes/session_policies.py:181-188`).
- **Verdicts are ALLOW / ASK / DENY only — there is no `warn`-that-continues**
  (`spec/types.py:1082-1095`; the closest is an advisory PostToolUse
  `additionalContext` *after* the fact). **v3's `allow | warn | block` is a
  genuine refinement Omnigent lacks.**
- **Hook interception**: gates are injected into agents Omnigent does not control
  via each harness's hook mechanism (Pre/Post-ToolUse, UserPromptSubmit;
  `native_policy_hook.py:73-123`). `ALLOW = "no opinion"` so the harness's own
  consent prompt still fires (`:144-164`). **Fail-closed on the blocking phase,
  fail-open elsewhere** (`:231-271`).

### L2a process gate (net-new for v3)

Omnigent's "process" policies are **in-process registered callables**
(`_e2e_policy_callables.py`, explicitly test-only), **not** bounded subprocesses
with timeout/exit-code mapping. So v3's L2a subprocess contract is **net-new —
nothing to copy**.

### L3 human approval (sophisticated, but no audit)

When a policy says "ask the human", for *blocking* phases the **server holds the
gate** rather than returning ASK to the agent (`server/routes/sessions.py:14336-14384`):
mint a deterministic `elicitation_id`, park an `asyncio.Future`, publish a request
the web UI renders as an approve card, then **race three signals** — web verdict /
a terminal-resolved native answer / disconnect-timeout (`:1146-1482`). A
pre-resolved tombstone honours a verdict that landed during a severed long-poll; a
sibling-lock ensures the human is prompted **once**.

The **critical L3 lesson**: resolve ASK **server-side, never trusting the agent's
permission mode** — returning ASK to the harness let `acceptEdits` /
`bypassPermissions` auto-approve, bypassing the human
(`native_policy_hook.py:196-205`).

The **gap → v3 strength**: Omnigent persists only *approval-as-state* (a memoized
cost-budget checkpoint, `cost.py:13-19`), **not** *decision-as-audit*; declines
leave no trace; there is **no override-vs-recommendation** notion. v3's L3 should
record the full `{recommendation, verdict, override?}` tuple — which Omnigent
explicitly lacks.

Spend caps are enforced as a **downgrade** (force a cheaper model), not a
hard-stop, with ASK at soft thresholds — a useful pattern for the v3 cost ledger.

---

## 8. L8 — Channels, normalization, multi-device sync

- **EventNormalizer**: per-harness "forwarders" translate raw output (Claude JSONL
  vs Codex JSON-RPC) into one normalized `SessionEventInput` envelope. **Cost
  scales with output structure**: ~650 lines for raw Claude JSONL vs ~165 for
  structured Codex JSON-RPC (≈4×). → push channels toward structured frames so the
  normalizer stays thin.
- **Canonical model**: a `ServerStreamEvent` Pydantic **discriminated union** keyed
  on `type: Literal[...]` with `extra="ignore"` for forward-compat
  (`server/schemas.py:1916-2000`).
- **Multi-device sync = snapshot + live-tail + id-dedup**, **no replay buffer**;
  the **durable append-only log is the source of truth** (the SSE stream is a
  fan-out, not the record). A joining device reads the snapshot, opens the live
  tail, and dedupes by item id any event in the race window. → validates v3's
  "projection authoritative only if reconstructable from the record".

Collaboration extras (L8 / L10-adjacent): presence is scoped to the **session-tree
root** so co-drivers on different sub-agents see each other (`server/presence.py`);
inline review comments are injected as a normal channel message
(`server/routes/comments.py:29-53`); `--fork ID` is a **deep copy** of session
items into a new instance (`chat.py:322-327`) = instance branching (with a caveat
that external-harness state may not perfectly replay).

---

## 9. L0c / L0f / L11 — Agent definition, project config, registry

- An Omnigent agent is a **portable directory image** (`config.yaml` + `AGENTS.md`
  + `skills/` + `tools/` + recursive `agents/`), parsed into a typed `AgentSpec`.
  But there is **no portable-vs-deployment split**: `executor.auth`
  (profile/base_url/credentials), `os_env`, sandbox `write_paths`, terminal
  commands, and branch/toolchain conventions all leak into the image (and into
  prompt prose). **This is the lesson for v3 L0f**: hoist exactly those into typed
  `slots` (`type` + `default` + `required`) filled by the
  `template → project → target → CLI` cascade; replace the untyped `params` kv with
  typed slots.
- **Unpinned model ⇒ provider default** (`examples/polly/config.yaml:24`) is a
  real-world validation of v3's `model_hint` (declared intent) vs effective
  resolution-by-cascade.
- **Refs by filesystem convention, resolved late, NOT verified at parse**
  (`tools.agents: [claude_code, codex, pi]` are bare names discovered under
  `agents/<name>/`). Availability is a **runtime probe** (`command -v`,
  `sys_list_models`) + **fail-loud at the dispatch gate** (`model_family_mismatch`).
  This validates v3's "`*_refs` are declared config, not provisioned capability".
- **Sub-agent composition** (orchestrator + fixed roster +
  `sys_session_send(purpose=…)`) prefigures v3 roles; `spawn: true` + `config_path`
  prefigures dynamically-authored child workflows. **Skills** are pure-prose
  `SKILL.md` attached by directory = v3 `skill_refs` as prompt-concern
  contributions.

Field inventory (condensed) → v3 analog: `name/description` → persona / L11 id;
`prompt`/`AGENTS.md` → `prompt_*_refs`; `executor.harness` → actor runtime / mode;
`executor.model` → `model_ref`/`model_hint`; `executor.auth` → **L0f**;
`tools.agents` → child roles / L11; `tools.<mcp/function>` → `tool_refs`;
`skills/` → `skill_refs`; `params` → L0f typed `slots`; `os_env/sandbox/terminals`
→ **L0f**; `guardrails.policies` → `tool_policy_ref`; `spawn` → L11 ephemeral
activation.

---

## 10. CLI / operator surface (vs the v1 predecessor)

- Click-based; the defining rule is **`stdout = data / stderr = decoration`**
  (`designs/CLI_CONTRACT.md:17`) — adopt verbatim; it gives scriptability without
  forcing JSON everywhere. There is **no global `--json`** (per-command opt-in on
  only two surfaces) → v3 should make structured output **uniform**.
- **Idempotency is purely "no-op if already absent"** — no `op_id` /
  `expected_version` at the CLI (grep-confirmed empty). v3's version-checked,
  op_id-idempotent operator intents are the advance.
- **Error taxonomy** (`errors.py:66-87`): a single `OmnigentError(message, code)` +
  a single-source `code → HTTP-status` map (`unauthorized/forbidden/not_found/
  invalid_input/already_exists/conflict/internal_error/…`). Borrow the **shape**
  (`code → semantic class → status`), but **add the concurrency codes Omnigent
  never needed** (`stale`, `duplicate`) that map to v3's versioned intents.
- **`upgrade` = "cycle, don't patch"**, safe **only because state is durable in
  sqlite, not process memory** (`docs/omni-upgrade-design.md`): drain in-flight
  sessions → stop → swap code → lazy respawn via a version-folded config signature.
  → validates v3's drain-before-stop + durable-record precondition.
- `attach` ("never starts anything") cleanly separates a read-only re-bind from a
  start intent — a good pattern for v3 read vs operator-intent.

Operator-intent mapping: `run/resume` → START/KICKOFF; `stop/host stop-session` →
CANCEL / teardown; `upgrade` → graceful drain; `server start/stop/status` → kernel
daemon lifecycle.

---

## 11. Distributed-workflow design proposals (L6 / L3 / L10)

Three Omnigent design docs are concrete, event-triggered, human-gated,
untrusted-actor workflows — real-world stress tests of v3's distributed scenarios.

- **`designs/issue-triage-proposal.md`** — trigger `on: issues:[opened]` →
  `omnigent run .github/triage/` (**L6**). State lives entirely in **GitHub
  labels** (externalized state machine). Human gate only on escalation; a 3-day
  veto on duplicate-close. **Untrusted-actor (L10) blueprint**: the LLM has **no
  tools, no shell, no token** — it emits allowlist-validated JSON consumed by
  trusted steps, so prompt injection cannot act. → v3 L6 triggers must
  **reconcile against external system state**, not own it solely.
- **`designs/contributor-review-merge-proposal.md`** — fork-PR trigger → security
  scan → AI review (cross-vendor) → CI → **maintainer approval before every merge**
  (read from `.github/MAINTAINER` at main's tip, so a PR can't self-grant). Trust
  tiers via `author_association`. **Sharp warning**: AI review **must not gate
  merge** — it is non-deterministic and prompt-injectable, so agent output is
  **advisory, never an authority gate**.
- **`designs/ci-external-contributors-proposal.md`** — read-only fork token vs a
  label-gated keyed tier on a privilege-separated mirror branch; the human gate is
  a **permission-gated label** (authenticated by the platform's permission model,
  persistent), deliberately chosen over a `/comment`.

> **v3 lessons (L10 / L13):** re-gate trust **per workflow instance, not by
> tenure** (Omnigent flags "returning-contributor auto-mirror" as its lone
> dangerous outlier); keep **agent output advisory**, never an authority gate;
> enforce **structural data/authority separation** (data in, allowlisted output
> out, the untrusted actor cannot act on the substrate) — the cleanest concrete
> L10 gatekeeper blueprint.

---

## Second-pass deltas — what the independent 10-lens pass adds

These are the additions or sharper readings from the independent pass, after
filtering out findings already covered by the slices above.

### 1. Session row, item log, and transient relay indexes are separate truths

Omnigent has a stronger state split than the first pass credited. The
`conversations` row is the session/source-of-truth row, while
`conversation_items` is a positioned transcript log with a unique
`(conversation_id, position)` constraint (`omnigent/db/db_models.py:236`, `:364`,
`:452`, `:496`). Append ordering normally comes from `conversations.next_position`
under a conversation lock, including a SQLite no-op update to force a write lock
(`omnigent/stores/conversation_store/sqlalchemy_store.py:487`, `:1350`, `:1383`,
`:1445`).

The avoid point is that Omnigent has many local ids — `persisted_item_id`,
`response_id`, `call_id`, `pending_id` — but no uniform operation id for every
durable mutation (`omnigent/server/routes/sessions.py:7598`, `:16621`, `:16928`).
v3 should copy the state/log split and add a kernel-level `operation_id` with a
stored outcome.

### 2. Single-writer ownership is explicit per harness

Omnigent does not let every path write every transcript item. Non-native paths
persist-before-forward, while native terminal paths rely on the runtime transcript
forwarder as the durable writer (`omnigent/server/routes/sessions.py:7490`,
`:7598`, `:7629`, `:7667`, `:7687`, `:7704`). That is a useful invariant: "who
writes durable history" is decided by harness mode, not by retry happenstance.

The same idea appears in the one-way native session latch:
`external_session_id` is idempotent for the same value and errors on a different
value (`omnigent/stores/conversation_store/sqlalchemy_store.py:1954`, `:1983`;
`tests/stores/test_conversation_store.py:2725`). v3 should use this one-way bind
for source/run/runtime ownership ids.

### 3. Runner claim is durable affinity; liveness is a separate freshness fact

Session `runner_id` is a DB claim: initially `None`, then bound by an update guarded
with `WHERE runner_id IS NULL` so exactly one runner wins
(`omnigent/entities/conversation.py:54`; `omnigent/db/db_models.py:270`;
`omnigent/stores/conversation_store/__init__.py:788`;
`omnigent/stores/conversation_store/sqlalchemy_store.py:1761`). Dispatch then reads
the already-bound runner; if none is bound, it returns conflict, and if the runner is
offline, it returns unavailable (`omnigent/runner/routing.py:88`, `:109`, `:229`).

Freshness is separate. Host online status requires both stored `status=="online"`
and a recent heartbeat (`omnigent/stores/host_store.py:26`, `:79`, `:435`), while
runner liveness comes from the live tunnel registry (`omnigent/server/app.py:1208`,
`:1235`). v3 should separate durable ownership from live reachability in the same
way.

### 4. Fork/checkpoint must not copy instance ownership

Forking copies replayable transcript state but intentionally does not copy
instance-owned facts like `external_session_id`, `workspace`, and `git_branch`, and
filters instance-scoped bridge/context labels (`omnigent/stores/conversation_store/sqlalchemy_store.py:2122`,
`:2130`, `:2294`, `:2318`; `tests/stores/test_conversation_store.py:3155`). This is
a concrete v3 checkpoint rule: forks may copy history and portable context, but not
live runtime ownership.

Cost approval is another scoped checkpoint: the highest approved threshold lives in
session/root-conversation state, while daily spend is a separate user/day row
(`omnigent/policies/builtins/cost.py:9`, `:85`;
`omnigent/runtime/policies/engine.py:480`, `:503`; `omnigent/db/db_models.py:746`).
v3 should name checkpoint scope explicitly: run, session tree, user/day, or op.

### 5. Lifecycle has sticky failure and observable retry, but transient waits remain weak

The first pass says lifecycle is conflated. The sharper reading is that Omnigent has
good transient lifecycle behavior but not a durable wait model. Snapshot status is
small (`idle|running|failed`), while SSE lifecycle is richer
(`launching|running|waiting|idle|failed`) (`omnigent/server/schemas.py:1593`,
`:2006`, `:2051`). A sticky failure guard prevents a trailing idle from hiding an
error (`omnigent/server/routes/sessions.py:4704`), and recovery clears it only when
there is proven new activity (`:4794`).

Retry is also protocol-visible: LLM/tool retry emits `response.retry` with attempt,
max, delay, and error (`omnigent/runtime/llm_retry.py:343`;
`omnigent/runtime/tool_retry.py:168`), and the UI renders it as a retry block
(`ap-web/src/lib/blockStream.ts:742`). v3 should make retries lifecycle events, not
log lines. But parked waits such as pending input/elicitation are still in-memory
and process-affine (`omnigent/runtime/pending_inputs.py:50`, `:75`;
`omnigent/runtime/pending_elicitations.py:29`), so durable WAITING remains v3's job.

### 6. Stream semantics require readiness, snapshot, and multiple correlation ids

Omnigent uses several channels for different purposes: per-conversation SSE
live-tail, session-list WebSocket watch sets, and per-user discovery fan-out
(`omnigent/runtime/session_stream.py:1`;
`omnigent/runtime/user_session_stream.py:1`;
`omnigent/server/routes/sessions.py:12900`). The stream has no replay buffer, so
the route and client rely on snapshot plus item-id dedupe
(`omnigent/server/routes/sessions.py:9924`; `ap-web/src/store/chatStore.ts:2260`).

Start sequencing matters: the server sends a ready heartbeat after subscription,
and the runner relay waits for runner stream readiness before forwarding input
(`omnigent/server/routes/sessions.py:9952`;
`omnigent/runtime/session_stream.py:166`;
`omnigent/server/routes/sessions.py:8715`). Correlation is not one generic event id:
approval uses `elicitation_id`, optimistic input uses `pending_id`, terminal-observed
text uses `message_id/index/final`, and tool results map `call_id -> response_id`
(`omnigent/server/schemas.py:2544`; `omnigent/runtime/policies/approval.py:127`;
`omnigent/runtime/pending_inputs.py:96`; `omnigent/server/routes/sessions.py:8248`).
v3 should keep distinct correlation ids per contract.

### 7. Context assembly is a projection pipeline, not the transcript itself

Omnigent builds prompt context through a clear pipeline:
`build_instructions` -> file reference resolution -> persisted history projection
into provider input items -> token-budget calculation (`omnigent/runtime/workflow.py:1706`,
`:1735`, `:1740`, `:1747`). The store contains both prompt content and lifecycle or
metadata items, and `NON_CONTENT_ITEM_TYPES` excludes compaction, error, resource,
slash-command, and terminal-command items from LLM context
(`omnigent/entities/conversation.py:377`, `:423`, `:539`).

Compaction is also layered: prune old/binary tool output, summarize, then emergency
truncate (`omnigent/runtime/compaction.py:1`). A `CompactionData` carries a
`last_item_id` cursor (`omnigent/entities/conversation.py:377`), later reinserted as
a synthetic user/assistant pair (`omnigent/runtime/compaction.py:463`). Guards reject
empty or bogus cursors because otherwise the runtime may believe context is tiny while
executor-internal history continues growing (`omnigent/runtime/workflow.py:1971`,
`:2159`). v3 should validate compaction cursors as hard invariants.

### 8. Skills are lazy knowledge, but host-skill discovery is too implicit

Omnigent's skill model has useful progressive disclosure: frontmatter requires
`name` and `description`, content is separate (`omnigent/spec/parser.py:1919`,
`:1961`), `load_skill` loads by name and lists resource files
(`omnigent/tools/builtins/load_skill.py:13`, `:138`), and `read_skill_file` enforces
relative-path containment (`omnigent/tools/builtins/read_skill_file.py:121`).

The avoid point is default host-skill bleed-through. The parser defaults
`skills: all` and searches ancestor `.claude/.agents` plus home directories
(`omnigent/spec/parser.py:1736`, `:1796`). Omnigent has to preserve explicit
`skills: none` across subprocess env handoff (`omnigent/runtime/workflow.py:951`,
`:1171`). v3 should prefer task-scope skill allowlists or opt-in host skill import.

### 9. Operator liveness is a multi-state UX contract

Omnigent's operator UX does not treat liveness as a boolean. It combines
`runner_online` and `host_online` into states such as `online`, `starting`,
`runner_asleep`, `host_offline`, `local_stranded`, and `unknown`
(`ap-web/src/hooks/useSessionLiveness.ts:57`, `:90`;
`omnigent/server/app.py:1208`, `:1273`). Recovery UX is state-specific:
host-offline opens reconnect/clone, non-owners default to clone, and local-stranded
shows a concrete `omnigent ... --resume` command
(`ap-web/src/shell/ReconnectSessionDialog.tsx:24`, `:54`, `:84`, `:141`).

The observability path is push-first with targeted polling fallback:
session-list updates use WebSocket, but the open session health path polls because a
dropped runner tunnel can otherwise leave stale-online state
(`ap-web/src/hooks/RunnerHealthProvider.tsx:5`, `:121`;
`ap-web/src/hooks/useRunnerHealth.ts:47`;
`ap-web/src/hooks/SessionUpdatesProvider.tsx:1`). The server `/health` endpoint
batches liveness computation and offloads blocking DB work (`omnigent/server/app.py:1190`,
`:1195`, `:1303`, `:1315`). v3 should make "what should the operator do next?"
part of lifecycle design.

### 10. Contract drift is the modularity risk

Omnigent has good seams: process-backed harnesses via registry and UDS HTTP client
(`omnigent/runtime/harnesses/__init__.py:27`;
`omnigent/runtime/harnesses/process_manager.py:1`, `:152`), shared harness scaffold
for turn lifecycle/tool dispatch/cancellation/policy (`omnigent/runtime/harnesses/_scaffold.py:351`,
`:447`, `:609`, `:714`), and contract tests for stream event union, wire type
uniqueness, OpenAPI appearance, and emit-site drift (`tests/server/test_stream_events.py:43`,
`:67`, `:96`, `:146`).

The avoid case is duplicated taxonomy. Harness/provider meaning is manually mirrored
in Python aliases, spec compat allowlists, UI native agent lists, and fork logic
(`omnigent/harness_aliases.py:9`, `:26`; `omnigent/spec/_omnigent_compat.py:76`;
`ap-web/src/lib/nativeCodingAgents.ts:21`; `ap-web/src/lib/forkHarness.ts:21`,
`:42`). The web README says TS reducer/types mirror Python manually and lack a
cross-language CI gate (`ap-web/README.md:86`;
`ap-web/src/lib/events.ts:1`; `ap-web/src/lib/types.ts:1`; `ap-web/src/lib/sse.ts:1`).
v3 should use one generated/typed provider catalog plus fixture-based parity tests.

## Consolidated direction

| v3 level | Omnigent verdict | One-line lesson |
|---|---|---|
| **L0a** idempotency / atomic-commit | ⚠️ absent → proves the need | keyed no-op + persist-before-publish; the duplicate-bubble bug is the textbook argument |
| **L0a state/log split** | ✅ useful but incomplete | keep session row + positioned item log + single-writer rules; add uniform operation ids/outcomes |
| **L0d** lifecycle | ⚠️ conflated (computed-on-read, RAM-parked) | store `kernel_status` + `disposition` + `wait{}`; lifecycle guard |
| **L0d liveness UX** | ✅ refined transient model | distinguish host/runner/live/session states; sticky failures and retry events are protocol-visible |
| **L0c** ActorAdapter | ✅ pattern, but leaky (duck-typed) | explicit Protocol; adapter declares capability; intent→invocation fully adapter-owned |
| **L0c native bridge** | ✅ important special case | native/CLI adapters need active-session guard, injection serialization, and transcript source-of-truth |
| **L0e** runtime provider | ✅ strongly validates | async provision + ready-event; ref identity ≠ sandbox; worktree = remote-exec + request_id |
| **L0f** project config | ⚠️ no split → that *is* the lesson | hoist auth/env/path/command values into typed slots |
| **L1 vs L2** | ✅ validates the split | who-may (permission) ≠ allowed-now (gate); read-only bars even parking |
| **L2** gate | ✅ + ⚠️ no WARN | v3's `allow\|warn\|block` is a real extension; fail-closed on the blocking phase |
| **L2a** process gate | ⚠️ only in-process callable | v3's subprocess contract is net-new |
| **L3** human Ask | ✅ sophisticated, but no audit | server-side gate; deterministic id; **record `{recommendation,verdict,override}`** |
| **L4** child workflow | ✅✅ strongest validation | child = full instance + parent_ref + child_key; **make lifecycle-event delivery durable** |
| **L6** triggers | ✅ + ⚠️ | trigger = external-state reconciliation; permission-gated label > `/comment` |
| **L7** grants/credentials | ✅✅ crown jewel | swap-on-access; credential never travels; only if the proxy is the sole egress |
| **L8** channels | ✅ validates | snapshot + tail + id-dedup; durable log is truth; add readiness heartbeat and stable envelope shape |
| **L8/L9 correlation** | ✅ multiple ids by contract | use `elicitation_id`, `pending_id`, `message_id`, `call_id` for distinct jobs; don't infer approval from tool results |
| **L11 context/skills** | ✅ useful projection model | prompt context is a projection pipeline; skills lazy-load resources; avoid implicit host-skill bleed-through |
| **L10** trust/federation | ✅ + ⚠️ | re-gate per instance, not by tenure; agent output advisory, never authority |
| **Modularity** | ✅ seams, ⚠️ duplicated taxonomy | process-backed harness seam + contract tests are strong; generate provider catalogs instead of hand-mirroring them |
| **Operator UX** | ✅ high-signal liveness/recovery | multi-state liveness, reconnect/clone/resume paths, raw debug logs plus higher-level explanations |

## Two things to reconsider in the v3 model because of Omnigent

1. **Internal kernel-event delivery semantics (esp. `CHILD_LIFECYCLE`, L4).**
   Make delivery durable / at-least-once with retry + a deliverability timeout.
   Omnigent's single most safety-critical live failure is "lost wake → forever-
   parked parent". v3 models the *creation* of internal events well; model their
   *delivery* with equal rigor.
2. **Trust per-instance, not by tenure (L10/L13), and agent-output-is-advisory.**
   The three GitHub proposals make this concrete; it should be an explicit design
   rule of the v3 gatekeeper / trust layer, not an implicit assumption.

## Caveats

- Omnigent is alpha; some code is in flux. Citations are a 2026-06-19 snapshot.
- A few deep paths (`runner/app.py`, `stores/…`, `inner/egress/proxy.py`,
  `tool_dispatch.py`) were reached via sub-search; their exact line numbers are
  indicative, and the load-bearing claims were cross-checked against the
  design docs (`designs/SANDBOX_CREDENTIAL_PROXY.md`, `docs/POLICIES.md`,
  `docs/AGENT_YAML_SPEC.md`, `docs/omni-upgrade-design.md`) and the example agents.
- This is a *learning* note, not a decision record. Where it suggests a v3 action,
  that action still has to survive the convergence play-through and the existing
  invariants — it is input to that argument, not a verdict.
