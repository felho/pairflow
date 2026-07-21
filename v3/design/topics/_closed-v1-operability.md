# Closed: V1 operability — testing, debugging, and the visibility floor

Status: **CLOSED (2026-07-07)** — settled AND fully anchored: nothing in this
file is pending, it is purely the record of *why*. Binding homes: IC-D/IC-E
plus the `PI-*` plan-intake checklist in
[`implementation-contract.md`](../implementation-contract.md),
the "V1 operability scope" paragraph in
[`approach.md`](../approach.md), and `core-model-todo.md` T1
(realized: ledger §4).

Settlement record: all four questions ratified one at a time
(Q1 visibility floor incl. required live tail; Q2 test kit; Q3 injected time
source; Q4 the ledger as the model↔code contract surface, extended at
ratification with the pseudocode-unit mapping and the domain-registry lift),
**plus the external-review addendum (same day, ratified): the debug bundle,
the operator CLI's command side, and the sharpened runner-MVP chapter; plus
Addendum 2 (third review, ratified): the rejection-visibility seam resolved
via the diagnostic channel, the Q2/Q3 lines landed as IC-D/IC-E, and the
domain-registry lift anchored in the model-build backlog — and realized
the same day (ledger §4, `core-model-todo.md` T1).**
The final section reserves implementation-plan chapters that need no design
decision now.

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
`../implementation-contract.md`: every IC-* item names concrete
acceptance/contract tests (concurrent-duplicate race, crash-window kill tests,
retransmission vs refresh, two-worker equivalence, purge-preserves-audit-floor)
plus schema/lint/CI checks, and [`approach.md`](../approach.md)
binds it as the implementation plan's mandatory first chapter. Beyond that file, verification is a
modeling-time discipline (the paper test, `check.sh` golden build, ledger
diffs as semantic checksums) with no stated transfer to implementation.
Fake/stub adapters, a scripted actor, fixtures, and a clock abstraction are
absent from the corpus entirely. The richest harness material (event-stream
conformance harness, adapter golden tests) is parked at future L12/L13.

**Debugging and live observability.** The observe seam is designed in detail —
history-plus-tail primitive, three media (live push / durable replay /
forensic audit), typed event envelope, addressed streams — in
`../../model/core-model-future-topic.md` (Observe seam §§1–7), and the
[inspector-UI memo](_open-v3-workflow-inspector-ui.md) carries concrete
read-model type sketches (`InstanceSummary`, `TimelineEvent`,
`CurrentRequest`) plus named query signatures (`listInstances`,
`getInstanceDetail`, `getTimeline`, …) in the
[core-API memo](_open-v3-core-api-surface.md). **At survey time, none of it
was sequenced anywhere in `approach.md`** — the Block A ramp contained no
observe/UI build item. (This memo's Q1 changed that: the visibility floor is
now bound into the Block A milestone via the approach.md pointer; the full
inspector UI remains parked.) The substrate is fully in
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
- `getTimeline(id, cursor)` — the committed transcript rendered as typed
  rows, including gate outcomes. *Corrected at the third review:* committed
  facts only — rejected / stale / duplicate diagnostics are NOT transcript
  rows (IC-A1: a rejected attempt never becomes a committed operation) and
  come from the diagnostic channel instead (see Addendum 2, B1);
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
**"test kit" chapter as a peer of the IC chapter**, with four named
deliverables (the fourth added at the second review):

- a **scripted actor** — a trivial ActorAdapter implementation that replays a
  declared op sequence with controllable op_ids, versions, and timing (the
  deterministic performer for all IC tests: races, crash windows, and
  duplicate deliveries staged on demand);
- a **fake egress adapter** — records intents instead of performing effects,
  for confirmed-effect and crash-window tests;
- a **fixture convention** — how a test declares its starting state
  (template + instance + transcript prefix) without hand-writing store rows;
- **deterministic gate/process fixtures** *(added at the second review)* — a
  scripted gate/process runner that returns a declared outcome on demand
  (`allow` | `warn` | `block` | timeout | runner_error | malformed), so L2/L2a
  gate behavior and the emit-contract paths are testable without real
  external processes.

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

**Settled direction (2026-07-07, ratified).** One rule, stated as an
IC-style contract line:

> **The kernel never reads the clock directly; every timestamp and every
> time bound comes from a single injected time source.**

Production binds it to wall clock; tests bind it to a controlled clock the
test advances. Today this is one interface + one parameter — Block A's two
existing time uses (the process-gate timeout and the LC4 `purged_at`
timestamp) move onto it — and it completes the Q2 test kit (scripted actor +
fake egress + controlled clock = every IC test writable) while handing L6
(scheduling) and L9 (timeouts/watchdog) their foundation instead of a
retrofit.

**Scope clarification (so the rule is not over-read):** this is *not*
deterministic replay — the plan deliberately bans replaying nondeterministic
actor work (IC-N), and that stands. Time simply becomes a swappable
dependency, exactly like adapters are after Q2.

**The original question and rationale (kept as record).** Does the kernel
read wall-clock time directly, or through a single injected time source? The
corpus had no clock abstraction at all; scattered wall-clock calls would make
every time-dependent test nondeterministic and leave L6/L9 an expensive
cleanup.

## Q4 — The model ledger as the model↔code contract surface

**Settled direction (2026-07-07, ratified — extended at ratification with
the pseudocode and DDD questions the user raised).** The organizing frame:
**the derived ledger becomes the contract surface between the model and the
implementation** — names unconditionally, behavior scoped, internal laws as
post-conditions.

**1. Name-space drift tests — unconditional.** Three name-spaces, all
checked the same cheap way (generated from, or asserted against, the model
source; a drift test, not a behavior test):

- **rejection names** — the implementation's rejection type matches the
  ledger's 85-name registry; code and model never speak two error languages;
- **domain concepts** — the implementation's type layer (types, table
  schemas) is generated from / checked against the domain registry (see
  point 4); the ubiquitous language, enforced. *Sequencing (second review):*
  this test becomes unconditional **once the point-4 registry lift lands**;
  until then the fallback is a hand-declared concept↔type mapping checked
  against the Domain-lens blocks. *(The lift landed 2026-07-07 — ledger §4
  exists; this test is now unconditional, no fallback needed.)*;
- **pseudocode units** — every one of the model's pseudocode units (158
  files, one per kernel function: `RECEIVE`, `CREATE_INSTANCE`,
  `choice_point`, …) has a declared counterpart in code, and a completeness
  check asserts the mapping covers all units. Behavior is tested by the
  traces (point 2); the mapping keeps the *structure* legible — "where is
  `choice_point` implemented?" always has one answer.

**2. Model traces as golden tests — mandatory core + scoped extension.**
Ratification clarified exactly which traces: the **"A concrete trace" block
at the head of each level section** (numbered ingress→commit→outcome rows;
several already include skew rows such as L0a's 3′ duplicate delivery).
These become executable: the Q2 scripted actor plays the trace's ingress
sequence against the real kernel; the test asserts the committed transcript
and outcomes match the model's rows. The chapter traces are the mandatory
core. They deliberately show the typical path — the corpus itself notes the
pseudocode states branches "the trace never exercises" — so the **scoped
extension** is rejection-branch traces, with the 85-name registry as the
coverage checklist (over time, each named rejection gets a trace that
triggers it). The extension is scheduled by the implementation plan, not
sized now.

**3. Invariant checks as a post-condition suite — scoped.** A reusable
checker any test can run over a store after acting on it (idempotency ledger
consistency, CAS monotonicity, audit-floor presence) — the executable form
of the ledger's invariant inventory; runs as a free extra assertion at the
end of every trace test.

**4. The domain-registry lift — a model-side tooling touch (coordinate with
the model-build thread).** The DDD layer is already semi-structured (every
section carries exactly one Domain-lens block with marked-up aggregates and
entities) but is absent from the derived ledger. The invariant pattern
repeats: extend the ledger generator with a **§4 domain registry**
(aggregate / entity / relation inventory per level), making the domain
vocabulary a semantic checksum on model edits and the source for the
implementation's type layer (point 1). This touches the model-src/ledger
tooling owned by the model-build thread — this memo records the requirement;
the lift itself lands there. *(REALIZED 2026-07-07: ledger §4 now exists —
51 aggregate blocks · 121 entities, derived per Domain-lens slice, guarded
by `check.sh`; recorded as `core-model-todo.md` T1.)*

**The original question and rationale (kept as record).** Do the
modeling-time artifacts — the rejection registry, the invariant inventory,
the scenario traces — become implementation-time test artifacts, and in what
form? The model was built with machine-checked behavior-neutrality; an
executable form of the same checks carries the paper-test discipline across
the model→code boundary. Nothing in the corpus claimed this transfer, so by
default it would not have happened.

## Addendum (2026-07-07, ratified) — external-review deltas

After the Q1–Q4 round settled, an independent external review of the original
gap assessment was brought in. Its five-chapter breakdown (conformance tests /
harness / observable run log / debug surface / operator-UI MVP) converged on
the settled round almost item-for-item — three of its five chapters are
exactly Q4, Q2+Q3, and Q1, and its framing ("don't push these back into the
core model; make them first-class implementation-plan chapters") is the
round's own formula. Independent convergence is recorded as validation. Two
genuine additions and one sharpening were absorbed:

**A1 — The debug bundle (the Q1 floor's fifth piece).** A single read-only
operation that exports *everything about one run* as a structured diagnostic
artifact: instance state, transcript, gate decisions, actor dispatches,
rejected inputs, payload digests, correlation/request ids, evidence refs.
Distinct use case from the floor's queries: bug reports, post-mortems, and
handing a stuck run to another person or agent for analysis. Same substrate,
read-only, cheap — ships with the floor. *Guardrail (second review):*
"everything about one run" has a redaction boundary — the bundle carries
structured refs and safe payloads; secret material, runtime env, and private
artifact contents are redacted or omitted (the full L7/L10 visibility model
comes later, but the bundle must not become the accidental secret exfil path
in the meantime).

**A2 — The operator CLI's command side ships with Block A too.** Q1 was
deliberately read-only; but the milestone's CLI also carries the command
verbs (already named in the [core-API memo](_open-v3-core-api-surface.md):
`createInstance`, `start`,
`submitDecision`, `resumeWait`, …) and the dev verbs (inject a fixture emit
via the Q2 scripted actor, replay a golden trace, dump the debug bundle).
All writes go through normal ingress — the CLI stays the thin client the
core-API memo settled; the addendum only states that the command side is in
the Block A milestone, not after it. Without it the kernel is formally done
but cannot even be driven comfortably. *The full Block A CLI in one line:*
the read-only floor (Q1 + the A1 debug bundle) + the command side (A2) + the
dev verbs.

**A3 — The runner-MVP reserved chapter, sharpened.** The chapter's content
is now the concrete first-decision trio: the local worktree provider
(`pairflow.worktree`), one real actor adapter, and the process-gate runner.
(See the updated bullet below.)

Not absorbed: the review's separate "UI/read-model" item — covered by Q1 +
the inspector-UI memo, and the review itself lands on the same sequencing
(CLI + read model first, web UI later).

## Addendum 2 (2026-07-07, ratified) — third-review deltas

A third independent review verified the memo's factual claims (all held) and
surfaced one real design seam plus two landing steps. Its remaining layer —
treating unstarted implementation-plan steps as gaps — was not absorbed: the
plan has not started, and "settled in the memo, bound by the plan" is exactly
where the process stands.

**B1 — The rejection-visibility seam, resolved.** Q1's original wording
promised rejected / stale / duplicate diagnostics in `getTimeline`, but
IC-A1 rules that rejected/non-committed attempts never become committed
operation rows — and the settled tail carries committed facts, and the A1
debug bundle lists "rejected inputs" with no stated source. Two capabilities
were conflated. The resolution splits them, using IC-A1's own allowance
("if rejected attempts need audit, model that as audit, not as the committed
operation ledger"):

- `getTimeline` runs over **committed rows only** (the Q1 bullet is
  corrected above);
- a named **diagnostic channel** — a structured kernel log plus
  rejection-audit stream, explicitly non-authoritative, separate from the
  transcript, best-effort — is the stated source for the live tail's
  diagnostic layer (a rejection is visible the moment it happens) and for
  the debug bundle's "rejected inputs" section;
- the broader unnamed category the review identified — kernel-internal,
  never-committed failures (crashed ingress, stuck adapter, store timeout,
  runner crash) — belongs to the same channel and becomes the sixth
  reserved chapter below.

**B2 — The Q2/Q3 contract lines landed as IC items.** The injected time
source is now [`implementation-contract.md`](../implementation-contract.md)
**IC-D** and ingress adapter-independence is **IC-E**, each with enforcement
bullets in the file's own pattern — the two lines this memo settled are now
binding, not merely recorded.

**B3 — The domain-registry lift is no longer orphaned.** Q4.4's "the lift
lands there" now has a "there": a tooling-backlog entry in
[`core-model-todo.md`](../../model/core-model-todo.md) points back at
this memo, so the model-build thread inherits it as an actionable item.
*(And realized the same day — see the T1 STATUS line and Q4.4's note.)*

## Reserved implementation-plan chapters (no design decision needed now)

Recorded so the implementation plan inherits them as chapters, not
rediscoveries. Ordering these pieces is the plan's job; the natural forcing
function is a walking-skeleton hello-world that exercises the floor, the
test kit, the injected clock, and bootstrap in one thin slice.
*(This memo's full plan-facing payload — these chapters plus the Q1–Q4 /
addenda deliverables — is mirrored as the `PI-*` plan-intake checklist at the
end of [`implementation-contract.md`](../implementation-contract.md),
which the plan's mandatory first chapter consumes; the memo stays the record
of why.)*

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
  Sharpened by addendum A3: the chapter's first-decision trio is the local
  worktree provider (`pairflow.worktree`), one real actor adapter, and the
  process-gate runner.
- **Operator recourse card** — one page stating what a v1 operator can
  actually do when a run misbehaves (query the silence via Q1's floor,
  cancel, deleteRequested; no watchdog/retry until L9) — all decided, just
  scattered.
- **Kernel diagnostics & structured logging** *(added at the third review,
  Addendum 2 B1)* — the diagnostic channel's concrete form: structured
  kernel log + rejection-audit stream, non-authoritative and separate from
  the transcript. Standard implementation hygiene, but named as a chapter
  because two settled pieces depend on it (the tail's rejection visibility
  and the debug bundle's "rejected inputs" section), and because
  kernel-internal failures — the ones that never reach the transcript — have
  no other home.
