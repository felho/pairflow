# Task Packet: ch4-P1 — domain first slice + StorePort / DefinitionStore port types

Plan step: plan.md §4.5 (domain first slice + 85-name rejection type) +
§4.2 (the port TYPES only — the SQLite implementation is ch4-P2)
Autonomy stage: calibration

## Ledger slice (declared — feeds the coverage accounting)

The slice is declared ONCE, in the machine block below — the coverage
script (`tools/v3-plan/check_coverage.py`, plan §3.6) parses it. No prose
duplicate beside it (prose drifts; the block is the declaration).

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [
      { "id": "l0a/definition-store", "disposition": "type/schema" }
    ],
    "traces": [],
    "shared_ownership": []
  }
}
```

(The 85-name rejection union this packet builds is drift-test surface,
not a per-packet rejection claim — plan §4.5 slice-semantics rule. The
l0a/l0b units quoted below are OWNED by ch4-P3/P4; they appear here as
shape sources only.)

## Operative material (full text — projection, not invention)

### Ledger §4 — the l0a registry block (verbatim)

> ### `l0a` (3 blocks · 7 entities)
>
> - **Template aggregate — the definition (immutable at runtime)** —
>   WorkflowTemplate [root] · Step · Role (name only)
> - **Instance aggregate — the run (mutable, append-only history)** —
>   WorkflowInstance [root] · Transcript · LifecycleStatus (value)
> - **Message — crosses the boundary** — EventEnvelope
> - *relations:* a Template (id + version) defines Steps bound to Role
>   names. A WorkflowInstance is created from a Template — snapshotting
>   its template_ref { id, version } so the run is pinned to an immutable
>   definition — and owns its Transcript. An EventEnvelope targets an
>   instance and carries an actor_id as provenance (who sent it); the
>   kernel applies it as a transition. Which concrete actor fills a role,
>   and how the next work item is dispatched, is L0b.

### Ledger §4 — the l0b registry block (verbatim)

> ### `l0b` (3 blocks · 6 entities)
>
> - **Template aggregate — gains actor defaults & guidance** — Role ·
>   Step · Actor
> - **Instance aggregate — gains task & effective binding** —
>   WorkflowInstance
> - **Kernel output — derived, not stored** — DispatchIntent ·
>   ContextPacket

### Shape sources — the l0b units (verbatim; owned by ch4-P3/P4)

```text
HANDLE envelope → Outcome
  IF not valid_shape(envelope)            THEN RETURN Rejected(invalid_shape)

  instance ← instanceStore.load(envelope.instance_id)
  IF instance is none                     THEN RETURN Rejected(unknown_instance)
  template ← definitionStore.load(instance.template_ref)   # separate store; pinned immutable version

  # idempotency, key scope (instance_id, op_id)
  IF instance.transcript.has(envelope.op_id) THEN RETURN Duplicate   # no-op, no 2nd entry

  # actor-supplied stale-intent — mandatory at L0b
  IF envelope.expected_version is missing  THEN RETURN Rejected(missing_version)
  IF envelope.expected_version ≠ instance.version THEN RETURN Stale(instance.version)

  step   ← template.step(instance.current_step)
  target ← step.transitions[envelope.type]   # transitions: event_type → target
  IF target is none                       THEN RETURN Rejected(no_transition)

  # one atomic commit, CAS on instance.version
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(envelope)
    instance.current_step ← target
    IF target is terminal THEN instance.status ← DONE
    instance.version ← instance.version + 1
  # on CAS conflict: restart HANDLE from load —
  #   re-check idempotency and re-resolve the transition;
  #   never re-commit a target computed from stale state

  intent ← (instance.status = DONE) ? none : dispatch_intent(instance, template, instance.current_step)  # derive after commit
  RETURN Committed(instance.version, intent)
```

```text
START_INSTANCE(template_ref, task, start_overrides) → Started
  template ← definitionStore.load(template_ref)
  binding  ← resolve_binding(template, start_overrides)        # template default_actor + start overrides
  REQUIRE binding covers every role reachable in template      # invariant: fail at start, not mid-run
  instance ← create { template_ref, task, binding, current_step: template.start, version: 1, status: RUNNING }
  COMMIT instance creation
  RETURN Started(instance.version, dispatch_intent(instance, template, template.start))  # derive after commit
```

```text
dispatch_intent(instance, template, step_id) → DispatchIntent
  step  ← template.step(step_id)
  actor ← instance.binding[step.role]                  # guaranteed present by the start invariant
  packet ← ContextPacket {
    instance_id, expected_version: instance.version, task: instance.task,
    instruction:   step.instruction,
    handoff:       payload_of_transition_into(instance, step_id),  # the envelope that brought us here; absent at start
    available_ops: event_types_of(step.transitions),              # PASS / CONVERGED — not on_pass; navigation, not L1
    agent_config:  step.agent_config }                            # raw/optional pass-through until L0c (may be absent)
  RETURN DispatchIntent { actor, packet }            # a local/manual driver delivers; durable channel is L8
```

### The 85-name rejection registry — machine contract

The names live in `v3/model/ledger.md` §3 (the
section headed `## 3 · Rejection registry — 85 distinct ...`), one name
per line matching the coverage script's parse rule:

```text
^- `([^`]+)` —
```

The union is hand-authored in code; the pre-test parses ledger §3
directly at test time (no second hand-copied list to drift) and asserts
**set equality** — same names, no extras, no misses, count 85.

## Canonical contract matrix (the single source P2/P3/P4 inherit)

Conventions binding for every row: **all port methods are async**
(`Promise` — a Postgres swap stays adapter work behind the port, ADR-003;
the SQLite implementation resolves synchronously inside). Identifier
types (`InstanceId`, `OpId`, `StepId`, `RoleName`, `EventType`,
`ActorId`) are plain `string` aliases — no branding (the existing
`ports/` culture: `IdempotencyKey = string`). Versions and `seq` are
plain `number` integers.

### Domain types

| Type | Fields | Opaque / deferred | Owner |
|---|---|---|---|
| `RejectionName` | literal union of ALL 85 ledger §3 names + runtime `REJECTION_NAMES` const array (the pre-test and the ch-5 drift test iterate it) | — | P1 |
| `TemplateRef` | `{ id: string; version: number }` — pinned snapshot (§4 relations text) | — | P1 |
| `Step` | `{ role: RoleName; instruction: string; transitions: Readonly<Record<EventType, StepId>>; agentConfig?: unknown }` | `agentConfig` raw pass-through (`unknown`) until L0c | P1 |
| `WorkflowTemplate` | `{ ref: TemplateRef; start: StepId; steps: Readonly<Record<StepId, Step>>; terminal: readonly StepId[]; roles: Readonly<Record<RoleName, { defaultActor?: ActorId }>> }`; "target is terminal" ⇔ listed in `terminal`; every transition target ∈ `steps` ∪ `terminal` | well-formedness VALIDATION deferred: fixture builds valid templates (P4); the format validator is ch 8 | P1 |
| `LifecycleStatus` | `"CREATED" \| "RUNNING" \| "DONE"` — the L0a value chain verbatim; ch-4 paths only ever COMMIT `RUNNING` (START_INSTANCE creates at RUNNING per the L0b unit) and `DONE`. L0d's kernel-status axis is NOT front-run | — | P1 |
| `WorkflowInstance` | `{ instanceId: InstanceId; templateRef: TemplateRef; task: string; binding: Readonly<Record<RoleName, ActorId>>; currentStep: StepId; round: number; status: LifecycleStatus; version: number }` — the L0a field list verbatim (incl. `round`); transcript NOT inline (store rows; joined by the detail read) | — | P1 |
| `EventEnvelope` | `{ instanceId: InstanceId; opId: OpId; type: EventType; actorId: ActorId; expectedVersion?: number; eventId?: string; payload?: unknown }` — `expectedVersion` optional in the TYPE so the `missing_version` branch stays representable (L0b makes it semantically mandatory); `eventId` = delivery provenance pass-through (l0a trace literal), consumed by nothing at L0b | `payload` opaque | P1 |
| `TranscriptEntry` | `{ seq: number; envelope: EventEnvelope; committedAt: EpochMillis }` — `seq` 1-based per instance; `committedAt` store-stamped (P2) | — | P1 |
| `ContextPacket` | `{ instanceId: InstanceId; expectedVersion: number; task: string; instruction: string; handoff?: unknown; availableOps: readonly EventType[]; agentConfig?: unknown }` — derived, never stored | `handoff`, `agentConfig` opaque | P1 |
| `DispatchIntent` | `{ actor: ActorId; packet: ContextPacket }` — derived, never stored; REPLACES the `ports/actor.ts` placeholder | — | P1 |
| `Outcome` | `{ kind: "committed"; version: number; intent: DispatchIntent \| null }` (`null` at terminal) \| `{ kind: "duplicate" }` \| `{ kind: "stale"; currentVersion: number }` \| `{ kind: "rejected"; reason: RejectionName }` — `reason` is `RejectionName`, never a free string | — | P1 (type) / P3 (producer) |
| `Started` | `{ kind: "started"; instanceId: InstanceId; version: number; intent: DispatchIntent }` — START's return, not an `Outcome` arm | — | P1 (type) / P4 (producer) |

**The `round` rule (inherited by P3/P4).** `round` starts at 1
(START_INSTANCE initializes it; L0a trace: `round=1` at creation). The
KERNEL increments it on a commit whose target step is `template.start` —
the loop-back re-entry edge; this is the rule the L0a/L0b traces exhibit
(`round=2` exactly at the `review → implement` commit, unchanged on
`implement → review` and at terminal). The store writes what it is told
(`newRound` input below); the P4 golden trace asserts the round sequence
against the model's own trace (1, 1, 2, 2, 2). The FORMAL round
machinery (round limits, gate rounds) is L2 — not front-run.

### `StorePort`

| Method | Input | Output | Timestamp rule | Deferred semantics |
|---|---|---|---|---|
| `loadInstance` | `instanceId` | `Promise<WorkflowInstance \| null>` — `null` = unknown (kernel maps to `Rejected(unknown_instance)`) | — | — |
| `hasOp` | `instanceId, opId` | `Promise<boolean>` — the transcript pre-check FAST PATH only; correctness comes from the commit txn (REV-A1-TXN) | — | — |
| `createInstance` | a full `WorkflowInstance` (version 1, RUNNING); **the caller mints `instanceId`** — tests/fixtures supply deterministic ids; production minting lands with the CLI (ch 6), keeping randomness out of kernel and store | `Promise<void>`; an existing id THROWS (store-integrity error, not a rejection — deterministic ids make it a caller bug in ch 4) | `created_at` stamped INSIDE the store from its injected `TimeSource`; not a parameter, not surfaced by ch-4 reads (ch 6 decides floor exposure) | — |
| `commitTransition` | `{ instanceId; expectedVersion: number; envelope: EventEnvelope; newCurrentStep: StepId; newRound: number; newStatus: LifecycleStatus }` — the KERNEL derives target/`newRound`/`newStatus` (store never interprets templates; store owns atomicity, kernel owns semantics) | `Promise<CommitTransitionResult>` (below) | `committed_at` stamped INSIDE the txn from the store's `TimeSource`; **no write API accepts a timestamp** (the type-level half of `CHK-C-TS-SOURCE`) | — |
| `listInstances` | — | `Promise<readonly WorkflowInstance[]>` — committed rows only (trivially: the store holds nothing else) | — | pagination/filtering: ch 6 |
| `getInstanceDetail` | `instanceId` | `Promise<{ instance: WorkflowInstance; transcript: readonly TranscriptEntry[] } \| null>` — transcript ordered by `seq` | — | timeline/live tail: ch 6 |

Store lifecycle (`open`/fail-closed marker/close) is NOT part of the port
type — it is the `store/` module's factory surface, owned by P2.

### `DefinitionStore`

| Method | Input | Output / missing behavior | Pinning rule |
|---|---|---|---|
| `load` | `TemplateRef` (`{ id, version }`) | `Promise<WorkflowTemplate \| null>`; `null` at START = start-side failure (no state, NO invented rejection name — the L0f names are not borrowed early); `null` at HANDLE = integrity error (the ref was pinned at create) → throw | loads exactly the version asked; NO "latest" API in ch 4 (latest-resolution is L0f/ch-8 territory). Separate port from `StorePort` — the separation + pinned ref IS this packet's `l0a/definition-store` (type/schema) claim |

### `CommitTransitionResult` — arms and inheritance

| Arm | Produced by (P2) | Interpreted by | Required test |
|---|---|---|---|
| `{ kind: "committed"; version: number }` | txn commits; version = expectedVersion + 1 | P3 kernel → `Outcome.committed` (P4 START analog) | l0b golden trace (P4) |
| `{ kind: "cas_conflict" }` | CAS `UPDATE … WHERE version = expectedVersion` hit no row AND the op is not a duplicate | P3 kernel → restart HANDLE from load (re-check idempotency, re-resolve transition; never re-commit a stale target) | CAS-restart test on a scripted `StorePort` double (P3) |
| `{ kind: "duplicate_op" }` | the txn sees an existing `(instance_id, op_id)` — **checked BEFORE the version check**, reported even when the version has since advanced (plan §4.2 precedence, IC-A1) | P3 kernel → `Outcome.duplicate` | precedence race test: retransmission after version advance → `duplicate_op`, never `cas_conflict` (P2 store-level, P3 kernel-level) |

## In-context notes (the scarce budget)

- **No mini-domain, no front-running.** Only l0a + l0b registry names
  become types — nothing from L0c+ (no AgentConfig shape, no
  kernel-status axis, no capability types). Where the matrix marks a
  field opaque, it STAYS `unknown`; later levels own its shape.
- **The matrix is the contract.** P2/P3/P4 inherit signatures from the
  matrix above, not from re-reading the units; if implementation
  pressure wants a different shape, that is a packet refine (back here),
  not an inline deviation.
- **`ports/actor.ts` placeholder replacement** is extend-don't-fork: the
  port keeps its `ActorAdapter` shape, only the intent type tightens
  from `unknown` to the domain `DispatchIntent`.

## Embedding gates (v1-inherited)

- Target files: `v3/src/domain/` (new content: rejection names + union,
  template/instance/envelope/outcome/dispatch types, index re-exports);
  `v3/src/ports/store.ts` (new), `v3/src/ports/definition.ts` (new),
  `v3/src/ports/actor.ts` (placeholder replacement),
  `v3/src/ports/index.ts`; `v3/src/domain/rejectionNames.test.ts`.
- Entrypoints: `domain/index.ts`, `ports/index.ts` re-exports.
- Mutation boundary: `v3/src/domain/` + `v3/src/ports/` ONLY. No
  `kernel/`, `store/`, `ingress/`, `floor/` content; `testkit/` must
  compile unchanged — if tightening `DispatchIntent` breaks it, STOP and
  log (process-log), do not widen the boundary silently.

## Acceptance

- Contract tests: none (CT-A1-DUP lands with ch4-P3).
- Checks: the rejection-name pre-test (`rejectionNames.test.ts` — set
  equality against ledger §3, exactly 85 names); `CHK-A2-IDEMKEY`
  untouched (egress port unchanged); all v3 bridges green
  (`v3:typecheck`, `v3:lint`, `v3:test`, `v3:adr-check`, `v3:coverage`).
- Drift tests green (standing, unconditional — PI-3; the name-set
  pre-test is its rejection axis arriving early, plan §4.5).
- Standing review rules in force: none — REV-A1-TXN / REV-B /
  REV-C / REV-E surfaces are not touched by a types-only packet.
