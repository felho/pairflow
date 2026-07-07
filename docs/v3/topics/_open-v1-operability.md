# Open: V1 operability — testing, debugging, and the visibility floor

Status: **open (2026-07-07)** — decision round in progress. **Q1 and Q2
settled (2026-07-07, ratified)**; Q3–Q4 pending. A fifth section reserves
implementation-plan chapters that need no design decision now.

## Why this memo exists

Block A is design-complete: the core model covers the full local v1 at the
correctness level (L0a–L5, LC1–LC4, five primitives, emit contract), and the
open direction questions of the memo layer are settled. But "correct" and
"practically usable" are different bars. If Block A is implemented exactly as
planned today, the builder gets a kernel that:

- can only be debugged by reading the raw transcript by hand — no query
  surface, no timeline view, no "what is this instance waiting for" answer,
  even though every fact needed for those answers is durably recorded;
- has a named acceptance-test skeleton (`implementation-contract.md` IC-*)
  but none of the tooling those tests require — no scripted actor, no fake
  adapter, no fixture strategy, no injectable clock;
- leaves the richest verification asset the project owns — the machine-checked
  model ledger (85 named rejections, 116 invariants, scenario traces) — as a
  modeling-time artifact with no stated path into implementation-time tests.

This memo was produced by a three-sweep survey of the corpus (testability /
debug-observability-UI / dev-ops practicalities, 2026-07-07). The survey's
shared conclusion: **the corpus is strong on correctness contracts and
boundary decisions, and deliberately silent on operational procedure.** Most
of that silence correctly belongs to the not-yet-written implementation plan;
the four questions below are the exceptions — scope or contract decisions
that shape the implementation plan and are cheapest to settle before it is
written.

## What the survey found (evidence base)

**Testing.** The one implementation-facing test story is
`../convergence/implementation-contract.md`: every IC-* item names concrete
acceptance/contract tests (concurrent-duplicate race, crash-window kill tests,
retransmission vs refresh, two-worker equivalence, purge-preserves-audit-floor)
plus schema/lint/CI checks, and `approach.md` binds it as the implementation
plan's mandatory first chapter. Beyond that file, verification is a
modeling-time discipline (the paper test, `check.sh` golden build, ledger
diffs as semantic checksums) with no stated transfer to implementation.
Fake/stub adapters, a scripted actor, fixtures, and a clock abstraction are
absent from the corpus entirely. The richest harness material (event-stream
conformance harness, adapter golden tests) is parked at future L12/L13.

**Debugging and live observability.** The observe seam is designed in detail —
history-plus-tail primitive, three media (live push / durable replay /
forensic audit), typed event envelope, addressed streams — in
`../convergence/core-model-future-topic.md` (Observe seam §§1–7), and the
inspector-UI memo carries concrete read-model type sketches
(`InstanceSummary`, `TimelineEvent`, `CurrentRequest`) plus named query
signatures (`listInstances`, `getInstanceDetail`, `getTimeline`, …) in the
core-API memo. **None of it is sequenced anywhere in `approach.md`** — the
Block A ramp contains no observe/UI build item. The substrate is fully in
Block A (typed rejections, typed FAIL paths, durable transcript, one
policy-facing read model `gate_projection`); only the surface that shows any
of it to a human is missing.

**Dev/ops practicalities.** Template *validation* is rich (the fail-at-create
validator family, L0f typed slots, version pinning) but there is no canonical
template file-format spec — the authoring surface exists only by example.
Bootstrap / hello-world / local-runner procedure: absent (only the "possible
SQLite + filesystem prototype" sketch in the storage memo, itself open
question #1 there). Store schema migration: explicitly open (storage memo
open question #8). Crash recovery: a deliberate boundary (durable no-loss
markers + idempotent redelivery in Block A; watchdog/retry/timeout at L9;
even `fail_instance` is rejected at load until terminal-failure ownership is
modeled) — correct, but the v1 operator's manual recourse (cancel /
deleteRequested / queryable silence) is scattered rather than stated in one
place. Runner builds: contracts settled, MVP scope explicitly
implementation-plan territory — not a gap.

## Q1 — The visibility floor: what observe/query surface ships WITH Block A?

**Settled direction (2026-07-07, ratified).** A CLI-first, read-only
visibility floor ships **as part of the Block A implementation milestone** —
the kernel is not "done" without a visible inside. The floor is the four
pieces below, drawn from the already-named query family; all four are in
scope (the live tail was proposed as optional and **promoted to required at
ratification** — the user's expectation is that watching an instance live
while it runs is precisely the most useful affordance in the early period):

- `listInstances(filter)` — what is running / waiting / terminal;
- `getInstanceDetail(id)` — status, current step, wait kind, actor, round;
- `getTimeline(id, cursor)` — the transcript rendered as typed rows,
  including rejected / stale / duplicate diagnostics and gate outcomes;
- a live tail (`subscribe`-shape over a single instance) — follow a running
  instance's committed facts as they land.

Boundaries, unchanged from the proposal: everything else in the observe seam
(three-media discipline, addressed streams, protocol adapter, the inspector
UI itself) stays parked exactly where it is; the live tail here is the
single-instance seed of the seam's §1 history-plus-tail primitive, not the
seam itself. The floor is read-only; any operator action still re-enters
through normal ingress. This is a scope decision, not a model change.

**The original question and rationale (kept as record).** Is a minimal
query/observe surface part of the Block A implementation scope, or a
follow-up? Today the plan implied "follow-up by default" simply because no
build item existed. Without the floor, even the *developer of the kernel*
debugs by reading raw store rows, and every IC acceptance test that asserts
over outcomes grows ad-hoc inspection helpers anyway. The marginal cost of
shipping the floor with Block A is low (read models over the transcript — no
new kernel behavior); the cost of not having it is paid daily.

## Q2 — The test kit: scripted actor, fake adapter, fixtures

**Settled direction (2026-07-07, ratified).** The implementation plan gets a
**"test kit" chapter as a peer of the IC chapter**, with three named
deliverables:

- a **scripted actor** — a trivial ActorAdapter implementation that replays a
  declared op sequence with controllable op_ids, versions, and timing (the
  deterministic performer for all IC tests: races, crash windows, and
  duplicate deliveries staged on demand);
- a **fake egress adapter** — records intents instead of performing effects,
  for confirmed-effect and crash-window tests;
- a **fixture convention** — how a test declares its starting state
  (template + instance + transcript prefix) without hand-writing store rows.

And one kernel-side contract line, stated rather than implied: **nothing in
the ingress path may assume a particular adapter implementation.** The model
already implies this; the decision makes it an explicit, testable line (the
scripted actor and fake egress are its cheapest implementations, which is
exactly why the kit is cheap to build).

**The original question and rationale (kept as record).** Do the IC-*
acceptance tests get their required tooling as a named deliverable, and is
"drivable by a scripted actor" a stated kernel requirement? Every IC test
needs a deterministic performer; if the kernel's ingress is only reachable
through a real ActorAdapter, the tests can't be written. A cheap requirement
to state now, an expensive retrofit later.

## Q3 — Time as an injected dependency

**The question.** Does the kernel read wall-clock time directly, or through a
single injected time source?

**Why it should be answered now.** Block A already has one time bound (the
process-gate timeout) and one timestamp write (`purged_at: now()`); L6
(scheduling) and L9 (timeouts/watchdog) will multiply these. If wall-clock
calls scatter through the kernel now, deterministic tests of anything
time-dependent become impossible and L6/L9 inherit a retrofit. The corpus
currently has no clock abstraction at all.

**Proposed direction.** One rule, stated as an IC-style contract line: **the
kernel never reads the clock directly; every timestamp and every time bound
comes from a single injected time source.** Production binds it to wall
clock; tests bind it to a controlled clock. This is a one-line discipline
today and the precondition for both the IC crash-window tests and every
future L6/L9 test.

## Q4 — The model ledger as a conformance asset

**The question.** Do the modeling-time artifacts — the rejection registry,
the invariant inventory, the scenario traces — become implementation-time
test artifacts, and in what form?

**Why it should be answered now.** This is the project's highest-leverage
testing opportunity: the model was built with machine-checked
behavior-neutrality, so an executable form of the same checks would carry the
paper-test discipline across the model→code boundary. Nothing in the corpus
currently claims this transfer, so by default it won't happen.

**Proposed direction (three graded commitments, cheapest first).**

1. **Rejection names as the shared error vocabulary.** The implementation's
   rejection type is generated from (or checked against) the ledger's
   85-name registry — a drift test, not a behavior test. Near-zero cost.
2. **Model scenario traces as golden tests.** The traces used in level
   ratifications become executable: feed the trace's ingress sequence to the
   real kernel via the Q2 scripted actor, assert the committed transcript
   and outcomes match. This is the direct heir of the paper test.
3. **Invariant checks as a post-condition suite.** A reusable checker that
   any test can run over a store after acting on it (idempotency ledger
   consistency, CAS monotonicity, audit-floor presence) — the executable
   form of the ledger's invariant inventory.

Commitment 1 should be unconditional; 2 and 3 can be scoped in the
implementation plan (e.g. traces for the primitives and the emit contract
first).

## Reserved implementation-plan chapters (no design decision needed now)

Recorded so the implementation plan inherits them as chapters, not
rediscoveries:

- **Template file-format spec** — the canonical authoring format (today it
  exists only by example: the config lens + the gate-policy synthesis's
  authoring profile). First template written = first day this hurts.
- **Bootstrap / hello-world** — stand up the store, load a template, run one
  instance end to end; the storage memo's SQLite+filesystem sketch is the
  candidate substrate (its open question #1).
- **Storage substrate pick + migration stance** — already open questions #1
  and #8 in `_open-v3-storage-architecture.md`; for the prototype phase an
  explicit "wipe-and-recreate, no migration guarantee" stance may be the
  right answer, but it must be stated.
- **Runner MVP scope** — local-worktree only vs headless/cloud; already named
  as implementation-plan territory in `_open-agent-runtime-and-pane-layout.md`.
- **Operator recourse card** — one page stating what a v1 operator can
  actually do when a run misbehaves (query the silence via Q1's floor,
  cancel, deleteRequested; no watchdog/retry until L9) — all decided, just
  scattered.
