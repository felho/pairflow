# Implementation Contract — Block A

Binding constraints the Block A implementation MUST satisfy. These are not model
content: the core model's semantics are already correct without them. They pin
HOW an implementation realizes those semantics, so it does not drift toward the
failure modes the kernel-spectrum synthesis documented. Extracted from
`core-model-todo.md` (2026-07-06); the model-side counterparts live there and in
`core-model.html`.

**Process rule (the reason this file exists):** the implementation plan's FIRST
chapter consumes this file. Every `IC-*` item maps to one or more of: an
acceptance/contract test, a schema/lint/CI check, or an ADR that records a
deliberate deviation (ADR convention: PI-10 + the playbook §8 activation
addendum). An item with none of the three is a planning gap. Items
are numbered `IC-*` for referencing from the plan, tests, and ADRs. (The `PI-*`
section at the end is different in kind — see its own rule there.)

## IC-A — Idempotency enforcement (from todo A1/A2)

### IC-A1. Store-backed uniqueness is the correctness mechanism

- `(instance_id, op_id)` is a kernel-level unique operation record. The source
  of truth is a store-backed uniqueness guarantee such as
  `UNIQUE(instance_id, op_id)`, enforced in the SAME atomic commit as the
  instance CAS (insert/append the operation record and update the materialized
  instance state under one transaction/CAS boundary).
- `instance.transcript.has(op_id)` in the pseudocode is a fast path, not the
  correctness mechanism. If only the pre-check exists, concurrent delivery can
  race.
- Version CAS and the `op_id` ledger are DISTINCT guards: CAS prevents lost
  updates from a stale view; `(instance_id, op_id)` uniqueness prevents a
  re-delivered logical operation from applying twice. Versioned history alone is
  not idempotency.
- Rejected/non-committed attempts must not consume the apply-idempotency key
  (the model states this on the lifecycle ops; it is universal). If rejected
  attempts need audit, model that as audit, not as the committed operation
  ledger.
- A separate `IdempotencyLedger` is an escape hatch for later cases where an
  operation needs dedupe but has no committed transcript entry (e.g. a remote
  relay boundary, L8).
- **Enforcement:** a concurrent-duplicate contract test (two racing deliveries
  of the same `(instance_id, op_id)` → exactly one commit, one `Duplicate`);
  a schema check that the uniqueness constraint exists; a transaction-boundary
  review checklist item.

### IC-A2. Egress idempotency and confirmed-effect markers

- The pending-effect marker / `request_id` must be passed to the external
  system as an idempotency key where the external system supports it.
  Marker-before-effect alone still gives at-least-once effect execution after a
  crash between effect and result.
- For non-idempotent external effects, the egress contract must carry the
  operation identity across the boundary; otherwise recovery can duplicate the
  outside effect.
- A completion marker must follow a CONFIRMED effect: a no-error/no-ack outcome
  is a distinct non-terminal state, never success (the nanoclaw negative proof,
  memo `_synthesis.md` §13).
- Any delivery/effect retry budget is durable ledger state, never an in-memory
  counter (nanoclaw's outbound counter resets on restart → a stuck send
  oscillates forever).
- Reconciler/outbox machinery is for real external effects only — never for
  repairing the kernel's own internal state consistency.
- **Enforcement:** a crash-window contract test per errand instance (kill
  between claim commit and effect; between effect and completion); an egress
  adapter interface that REQUIRES an idempotency-key parameter; ADR for any
  external system that cannot accept one.

### IC-A3. The `op_id` generation contract (edge/actor/relay side)

- `op_id` stability is an edge/actor/relay contract: the kernel enforces the
  identity it receives; it cannot infer that two fresh IDs meant one logical
  operation.
- The same logical operation retry must reuse the same `op_id`; a new `op_id`
  means a new attempted operation.
- Distinguish retransmission from re-attempt: resend-without-ack reuses the
  `op_id`; a refresh after `Stale` (new context packet) is a NEW logical
  operation with a new `op_id`, because the input changed.
- Use content-addressed IDs where the operation is naturally identified by its
  content ("submit this exact decision payload"); use request-scoped nonces
  where two identical payloads may be two legitimate operations ("increment
  twice") — pure content-addressing would collapse them.
- Later relay/channel levels must preserve this identity across process, host,
  or network retries.
- **Enforcement:** the client/CLI emit library owns `op_id` derivation (one
  audited implementation, not per-call-site choices); a retransmission test
  (same op_id → Duplicate) and a refresh test (post-Stale re-emit → new op_id);
  ADR selecting content-addressed vs nonce per operation family.

## IC-B — Leaderless mechanics (from todo B1/B2)

The semantic contracts (record-not-replay; leaderless-by-construction; in-band
correlation as fencing) are stated in the model (the L0a note). The mechanics:

- Worker claiming such as `SELECT ... FOR UPDATE SKIP LOCKED` is a scheduling
  tool, not semantic authority — it never replaces the `op_id` ledger or CAS.
- Process-local state (`versions_seen`-style maps, caches) is optimization
  only; the store-backed instance version is authoritative.
- Accepted actor output should be recorded with content-addressed
  artifact/evidence refs rather than ephemeral process output, so the durable
  fact is verifiable later.
- Introduce a true fencing token ONLY if a future level adds the shape it
  fences: a lease-holding worker writing directly to a shared external resource
  where a superseded worker could corrupt it out-of-band. Nothing in Block A
  needs it — a single CAS claim has no timeout-driven successor. Watch: retry of
  partially completed external effects; L8 durable delivery.
- **Enforcement:** a two-worker contract test (both process the same instance
  stream; correctness must not depend on which one wins); a review rule that no
  code path treats a local lock/cache as authority; the fencing-token watch as
  an ADR trigger, not code.

## IC-C — Decision audit mechanics (from todo C1/C3)

- The `DECISION_MADE` timestamp comes from the kernel commit/append boundary,
  never from UI display time or an analytics event.
- Metrics, analytics feeds, UI state, and activity streams may DERIVE from
  `DECISION_REQUEST` / `DECISION_MADE`; they are never the decision source of
  truth, and a telemetry event cannot stand in for a missing decision record.
- Purge/archive/storage-lifecycle work preserves the declared decision audit
  floor (the LC4 model already carries the surviving-audit contract; the
  implementation must not weaken it via optional exports or UI history).
- **Enforcement:** schema-level timestamp source (DB default / commit
  metadata, not client-supplied); a lint/review rule that analytics readers
  consume projections, never write audit tables; the LC4 purge contract test
  asserts the audit floor survives a purge.

## IC-D — Injected time source (from the v1-operability round, Q3)

- The kernel never reads the clock directly; every timestamp and every time
  bound comes from a single injected time source. Production binds it to wall
  clock; tests bind a controlled clock the test advances.
- Block A's two existing time uses — the process-gate timeout and the LC4
  `purged_at` timestamp — move onto this source. Where the store stamps commit
  timestamps (IC-C's commit-boundary authority), that store binding is part of
  the time source's production binding; tests may bind both to the controlled
  clock.
- This is NOT deterministic replay — IC-N's ban stands. Time becomes a
  swappable dependency, exactly like adapters under IC-E; nothing more.
- **Enforcement:** every time-dependent contract test runs on the controlled
  clock (a gate-timeout test that needs a real sleep fails this item); a
  lint/review rule that kernel code contains no direct wall-clock read; the
  controlled clock is a named deliverable of the test-kit chapter.

## IC-E — Ingress adapter-independence (from the v1-operability round, Q2)

- Nothing in the ingress path may assume a particular adapter implementation.
  The kernel must be fully drivable by a scripted actor and fully observable
  by a fake egress adapter — the two cheapest implementations of the adapter
  seams, which is exactly why this line is testable at all.
- The adapter seams (ActorAdapter on the performer side, the egress adapter on
  the effect side, the gate/process runner) are injected dependencies; kernel
  code never branches on a concrete adapter type.
- **Enforcement:** the entire IC contract-test suite runs against the test
  kit's scripted actor + fake egress + deterministic gate/process fixtures —
  the suite passing IS the proof of this item; a review rule that no kernel
  code path special-cases a concrete adapter.

## IC-N — Non-goals (kernel-shape guardrails)

- No Temporal-style deterministic replay for actor/LLM work.
- No leader-per-shard coordination for the kernel.
- No full event-sourcing as the source of truth: keep the materialized
  `WorkflowInstance` + transcript/audit + per-instance version/CAS shape.
- No reconciler/outbox for the kernel's own internal state consistency.
- **Enforcement:** ADR-gated — any design document proposing one of these
  shapes must cite and overturn this section explicitly.

## PI — Plan-intake checklist (inherited chapters and deliverables)

These are NOT constraints: no test/lint/ADR mapping. They are the settled
plan-facing payload of the v1-operability round
([`topics/_closed-v1-operability.md`](topics/_closed-v1-operability.md) —
detail and rationale live there), parked here because the plan's first chapter
consumes this file and therefore cannot miss them. **Rule: every PI item must
appear in the implementation plan as a chapter or a named deliverable; a PI
item with no home in the plan is a planning gap.**

- **PI-1. The test-kit chapter** (peer of the IC chapter): scripted actor,
  fake egress adapter, fixture convention, deterministic gate/process
  fixtures, and the controlled clock (named in IC-D's enforcement). The IC
  suite runs on this kit (IC-E's enforcement). *(Memo Q2, Q3.)*
- **PI-2. The Block A visibility floor + CLI.** Read-only floor:
  `listInstances` / `getInstanceDetail` / `getTimeline` (committed rows only —
  IC-A1) / the live tail; the debug bundle (one-run structured export, with
  the redaction boundary); the operator CLI's command + dev verbs, all writes
  through normal ingress. *(Memo Q1 + A1/A2 + Addendum 2 B1.)*
- **PI-3. The ledger→test transfer.** Three unconditional name-space drift
  tests (85 rejection names / domain registry, ledger §4 / 158 pseudocode
  units→code mapping); chapter traces as golden tests (mandatory core;
  rejection-branch traces as the scoped extension over the 85-name
  checklist); the invariant post-condition suite. *(Memo Q4.)*
- **PI-4. Kernel diagnostics & structured logging** — the diagnostic
  channel's concrete form: structured kernel log + rejection-audit stream,
  non-authoritative, separate from the transcript; feeds the tail's rejection
  visibility and the debug bundle's "rejected inputs"; the only home of
  kernel-internal never-committed failures. *(Memo Addendum 2 B1.)*
- **PI-5. Template file-format spec** — the canonical authoring format.
- **PI-6. Bootstrap / hello-world** — the walking skeleton that exercises the
  floor, the test kit, the injected clock, and bootstrap in one thin slice.
- **PI-7. Storage substrate pick + migration stance** (storage memo open
  questions #1/#8; an explicit "wipe-and-recreate" prototype stance is
  acceptable but must be stated).
- **PI-8. Runner MVP scope** — the first-decision trio: local worktree
  provider (`pairflow.worktree`), one real actor adapter, the process-gate
  runner; plus the adapter's **attach channel** — a per-runtime-context
  observe/takeover verb (tmux for the local adapter), discovered via the
  PI-2 floor. There is NO pane-layout config in v1 (resolved 2026-07-07 —
  the agent-runtime memo Q3: the runtime-context set is dynamic, a
  declarative grid has no stable referent; the composed tree view is the
  parked inspector UI's job). Remaining sub-decision for the chapter:
  local-worktree only vs headless/cloud.
- **PI-9. Operator recourse card** — one page: what a v1 operator can do when
  a run misbehaves (query via the floor, cancel, deleteRequested; no
  watchdog/retry until L9).
- **PI-10. The ADR convention + compliance review step** (activated
  2026-07-07 — the design-method playbook §8 addendum is the definition).
  Deliverables: the ADR home directory near the code (the plan picks the
  location), the template with lifecycle + links, the flat index, the small
  integrity check (dangling refs / supersede cycles / status mismatches, in
  the `check.sh` culture), and the review-time ADR compliance step (diff vs
  accepted ADRs, incl. the unlinked-change prompt) as the third QA axis
  beside the IC contract tests and the PI-3 drift tests. This is the
  instrument every ADR reference in this file (process rule, IC-A2, IC-A3,
  IC-B, IC-N) resolves to. Boundary: implementation-side decisions only —
  model-side decisions stay in the corpus + topics memos, no retroactive
  conversion.
- **PI-11. The execution-model intake** (ratified 2026-07-07 — defined in
  [`../implementation/README.md`](../implementation/README.md) §5). The plan
  must consume: the two-layer **task-packet convention** (ledger projection
  as content; the v1 LLM-ergonomics gates — size/split, constraint density,
  embedding — inherited unchanged) with the constraint-transformation
  discipline (rule→environment / rule→data / residual in-context budget;
  packets self-contained for their operative set, no pointer-shaped
  constraint dumps), the **coverage-accounting script** (union of declared
  ledger slices = the in-scope inventory; no orphans, no undeclared double
  owners — the mechanical "plan is concrete enough for hands-off execution"
  criterion), and the **autonomy ramp** (calibration → measurement →
  chaining, with the standing human checkpoints incl. the model↔code
  divergence stop). The task-packet template + projection checklist is a
  named chapter-1 deliverable.

**Scoped OUT of the first round (deliberate, not an omission):** the
capability-query op family (`list_my_ops` / `list_spawnable_actors` /
`list_addressable_helpers` —
[`topics/_open-runtime-capability-surface.md`](topics/_open-runtime-capability-surface.md)).
Its memo says "op list + naming → implementation plan", but the pull form
belongs to the GAP-15 actor registry (Block B era); Block A's context packet
already projects `available_ops` / `op_contracts` (the emit contract's E8),
which is the push form the first round needs.
