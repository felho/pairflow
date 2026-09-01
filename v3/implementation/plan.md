# V3 Implementation Plan

Written chapter by chapter, each chapter proposed → ratified → committed
(process: [`README.md`](README.md) §3). Chapters present: 1–9, 11–14.

**Genre note.** This is the implementation **master plan** — it is NOT a
directly `ExecutePairflowPlan`-executable task list, and it carries no
Pairflow plan metadata contract. The executable unit is the **task packet**
([`task-packet-template.md`](task-packet-template.md)); the plan orders and
scopes, the packet projects, the gates verify (README §5.1). If a later
chapter is run through the Pairflow machinery, its packets — not this
document — are the artifacts that machinery consumes.

---

## Chapter 1 — Intake (ratified 2026-07-07)

Autonomy stage: **calibration** (README §5.5).

This chapter consumes
[`../design/implementation-contract.md`](../design/implementation-contract.md)
per its process rule: every `IC-*` item maps to a named acceptance/contract
test, a schema/lint/CI check, or an ADR; every `PI-*` item maps to a chapter
or a named deliverable. An unmapped item is a planning gap; the chapter is
not done until both tables close (§1.6).

### 1.1 Method and notation

**Realization name-spaces** (stable IDs for referencing from packets, tests,
and ADRs):

- `CT-*` — acceptance/contract test (executable, runs on the PI-1 test kit).
- `CHK-*` — schema / lint / CI / type-level check (mechanical, environment-enforced).
- `REV-*` — standing review rule. **Supplementary form only**: every IC item
  must have at least one *strong* realization (`CT`/`CHK`/`ADR`); a `REV-*`
  alone never closes an item. The `REV-*` registry lives in the task-packet
  template's "standing review rules" section and is applied at build-loop
  step 6 (README §4).
- `ADR-*` — an ADR to be born (`proposed` → `accepted` at a human
  checkpoint), or a named ADR **trigger** that stays dormant until its
  condition fires.

**Status model** (visible in the tables; flipped by the owning chapter's
definition of done, README §6):

- `planned(ch N)` — realization assigned to chapter N, not yet built.
- `realized` — built and green (tests/checks) or landed (deliverables/ADRs).
- `deferred(trigger)` — trigger-gated; dormant by design, not a gap.

### 1.2 IC intake table

| IC | Realization | Home | Status |
|---|---|---|---|
| IC-A1 | `CT-A1-DUP` — two racing deliveries of the same `(instance_id, op_id)` → exactly one commit, one `Duplicate` | ch 4 | realized |
| IC-A1 | `CT-A1-COLLISION` — after a committed actor emit, same `op_id` with a different payload/contract identity → `Rejected(op_id_collision)`, NOT `Duplicate` (the EC digest branch) | ch 5 | realized |
| IC-A1 | `CHK-A1-SCHEMA` — the store carries `UNIQUE(instance_id, op_id)`, enforced in the same atomic commit as the instance CAS | ch 4 | realized |
| IC-A1 | `CHK-A1-DIGEST` — actor-emit committed facts store `payload_digest` (rejected attempts record nothing) | ch 5 | realized |
| IC-A1 | `REV-A1-TXN` — transaction-boundary checklist line (op record + CAS under one boundary) | review rubric | realized |
| IC-A2 | `CT-A2-CRASH` — crash-window test family per errand instance: kill between claim commit and effect; between effect and completion marker | ch 9 | realized (ch9-P3a) |
| IC-A2 | `CT-A2-CONFIRM` — a no-error/no-ack outcome is a distinct non-terminal state, never success | ch 9 | realized (ch9-P3a) |
| IC-A2 | `CT-A2-RETRY-DURABLE` — delivery/effect retry budget survives a process restart (durable ledger state, not memory) | ch 9 | realized (ch9-P3a) |
| IC-A2 | `CHK-A2-IDEMKEY` — the egress adapter interface REQUIRES an idempotency-key parameter (type-level; the fake egress adapter implements it first) | ch 3 | realized |
| IC-A2 | `ADR-A2-EXT` — trigger: an external system that cannot accept an idempotency key | ADR machinery | deferred(trigger) |
| IC-A3 | emit-lib — `op_id` derivation in ONE audited implementation, shared by the scripted actor (ch 3) and the operator CLI (ch 6); named deliverable | ch 3 | realized |
| IC-A3 | `CT-A3-RETRANS` — resend-without-ack reuses the `op_id` → kernel answers `Duplicate` | ch 5 | realized |
| IC-A3 | `CT-A3-EMITLIB-REFRESH` — the emit-lib derives a NEW logical `op_id` from a fresh context packet after `Stale`. This is an emit-lib contract, not a kernel rule: the kernel only answers `Stale`, and rejected attempts never consume the idempotency key | ch 5 | realized |
| IC-A3 | `ADR-A3-IDSCHEME` — content-addressed vs request-scoped-nonce `op_id`, decided per operation family (= ADR-004) | ch 3 | realized |
| IC-B | `CT-B-TWOWORKER` — two workers process the same instance stream; correctness is winner-independent (kit-driven in ch 5; re-run under the real runner in ch 9) | ch 5 | realized (kit-driven; the ch-9 re-run EXECUTED under the real runner — ch9-P3b CB1, real process contention) |
| IC-B | `REV-B-LOCAL-NOT-AUTHORITY` — no code path treats a local lock/cache as authority; claiming (`SKIP LOCKED` etc.) is scheduling only | review rubric | realized |
| IC-B | `ADR-B-FENCE` — fencing-token watch: fires only if a future shape adds a lease-holding worker writing out-of-band to a shared external resource | ADR machinery | deferred(trigger) |
| IC-C | `CHK-C-TS-SOURCE` — `DECISION_MADE` timestamps come from the commit/append boundary (DB default / commit metadata), never client-supplied | ch 4 | realized |
| IC-C | `CT-C-PURGE-AUDIT` — the LC4 purge contract test: the decision audit floor survives a purge | purge chapter (map extension; re-homed at ch-5 ratification, §5.6) | planned(purge chapter) |
| IC-C | `REV-C-PROJECTIONS-READONLY` — analytics/metrics/UI readers consume projections, never write audit tables | review rubric | realized |
| IC-D | `CHK-D-NOCLOCK` — lint: kernel code contains no direct wall-clock read; all time flows through the injected `TimeSource` | ch 3 | realized |
| IC-D | `CHK-D-TESTCLOCK` — every time-dependent contract test runs on the controlled clock; a test needing a real sleep fails this check | ch 3 | realized |
| IC-D | controlled clock — named test-kit deliverable (PI-1) | ch 3 | realized |
| IC-E | `CHK-E-SUITE-ON-KIT` — CI wiring: the entire `CT-*` suite runs against scripted actor + fake egress + deterministic gate/process fixtures; the suite passing IS the proof | ch 3 | realized |
| IC-E | `REV-E-NO-ADAPTER-BRANCH` — no kernel code path special-cases a concrete adapter type | review rubric | realized |
| IC-N | ADR gate — the ADR template carries a mandatory IC-N screen field, and the compliance-review step checks diffs against the banned shapes; a banned shape enters only via an `accepted` ADR that cites and overturns IC-N explicitly | ch 2 | realized |

**IC-A1 digest scope note.** The `payload_digest` / `op_id_collision` branch
is scoped to the **actor-emit path** in this round (the EC memo's scope
decision); operator/lifecycle-op digests are a later Absent. `CT-A1-COLLISION`
and `CHK-A1-DIGEST` assert exactly this scope — no wider.

### 1.3 PI intake table and the chapter map

The homes below double as the plan's provisional chapter skeleton. Each later
chapter is still proposed → ratified individually (README §3); this map fixes
ownership, not content. Every chapter header carries its autonomy stage
(calibration → measurement → chaining, README §5.5) — the ramp-marking
convention is itself a chapter-1 rule.

| Ch | Content | PI | Status |
|---|---|---|---|
| 1 | Intake: these tables, the in-scope inventory (§1.4), the task-packet template + projection checklist (§1.5), the ramp-marking convention | PI-11 (convention + template + ramp) | realized |
| 2 | Architecture skeleton: repo layout, module boundaries, language/tooling picks, storage substrate + migration stance, the ADR machinery (home dir, template with IC-N screen, flat index, integrity check, compliance-review step) + first ADRs | PI-7, PI-10 | realized |
| 3 | Test kit: scripted actor, fake egress adapter, fixture convention, deterministic gate/process fixtures, controlled clock (IC-D), emit-lib (IC-A3), **coverage-accounting script** (check.sh culture — PI-11's mechanical half) | PI-1 (+ PI-11 script) | realized |
| 4 | Walking skeleton / bootstrap: minimal ingress→commit, minimal floor read, injected clock, bootstrap in one thin slice | PI-6 | realized |
| 5 | Ledger→test transfer: the three unconditional drift tests, the chapter-trace golden harness, the invariant post-condition suite + the invariant disposition map (§1.4) | PI-3 | realized |
| 6 | Visibility floor + operator CLI: full floor (`listInstances` / `getInstanceDetail` / `getTimeline` committed-rows-only / live tail), debug bundle with redaction boundary, command + dev verbs, all writes through normal ingress | PI-2 | realized |
| 7 | Kernel diagnostics & structured logging: the named non-authoritative diagnostic channel's concrete form | PI-4 | realized |
| 8 | Template file-format spec: the canonical authoring format; **migrates MD-1** | PI-5 | realized |
| 11 | **Gate core** (appended chapter, build order: BEFORE ch 9 — §11): the L1 authority slice, the L2 gate pipeline + inline evaluators (the ch-4 provisional `round` aligned to its L2 contract), the L2a process-gate contract (kernel side — the spawn is ch 9's), a minimal runtime-context representation, the format's gate-declaration surface (§8.2 stance) | — (map-extension, §8.1) | realized |
| 12 | **Runtime core** (appended chapter, build order: BEFORE ch 9 — §12): the L0c run profile (AgentConfig cascade + issued provenance), the L0d lifecycle/activation axis (kernel_status, source-routed entry, the CREATE/START split, typed waits, terminal dispositions, KICKOFF/CANCEL), the L0e runtime-context provider contract (requirement + registry + packet projection; testkit provider — the real worktree provider stays ch 9's), the gate-field watchpoint realization (model fix `6dd8bd15`), the format's runtime keys (§8.2 stance) + lifecycle operator verbs + floor extension | — (map-extension, §1.3) | realized |
| 9 | Runner MVP (chapter §9): local worktree provider (`pairflow.worktree` — the ch-12 L0e contract's first real provider), one real actor adapter, process-gate runner spawn side, attach channel (tmux observe/takeover); **MVP scope RESOLVED (user, 2026-07-18): local-worktree only** — headless/cloud is a later provider behind the same contract (its async ready-event + opaque-ref shape keeps that additive; the deferred teardown / provider-health / retry-on-FAILED Absents are the named rework surface — the one-shot provisioning-failure→FAIL channel itself realizes IN ch9, §9 opening disposition 2; aligned at the ch9 draft rounds, 2026-07-23); **watchpoint RESOLVED (user, 2026-07-18):** the gate-block observability fix landed as a model-plane change (ratified @ `6dd8bd15` — `Rejected(gate_blocked)` carries the blocking binding's `uses` as `gate`), code realization owned by ch12-P0; prerequisites: ch 11 (gate call site) + ch 12 (runtime core) + **the production-provider gate (the ch12 ratifier's D5 condition, 2026-07-19 — the ch12 draft's C15):** no production provider registers until the provisioning-failure → correlated kernel `FAIL` channel is ratified and realized; **ch12-boundary work item (2026-07-22):** wire the MUTATION-TESTING PILOT — StrykerJS+vitest scoped to the packet `mutation_boundary` (`pnpm v3:mutation` bridge; first step = feasibility proof), DUAL-RUN beside arm gate-2 for two chapters, catches labeled code-mutation vs input-domain (the ch12 boundary's test-reliability verdict; ch9 ratification disposes it) | PI-8 | realized |
| 13 | **Context blocks** (appended chapter, build order: AFTER ch 9 — §13): the L2b render (`assemble_context_blocks` at dispatch, ordered/deduped, provenance-carrying), the definition-load ref check (`validate_context_refs` under `admit_definition`, the `unresolved_context_block_ref` issue lane), the format's three context keys (catalog + role/step + gate refs) per the §8.2 stance, the shipped template's first real catalog entry, and the ch9-carried EPIPE fix as the chapter's hygiene packet | — (map-extension, §11.1) | realized |
| 14 | **Human decision core** (appended chapter, build order: AFTER ch 13 — §14): the L3 three-entry spine (`SUBMIT_DECISION` + `RESUME_WAIT` beside `HANDLE`, all over one shared `apply_target_entry_effects`), the `human_gate` step type (atomic park + `DECISION_REQUEST`/`DECISION_MADE` + the override rule), the minimal `type: wait` bare wait (`commit_pending` ⇐ `COMMIT`), `admit_input` (the F-W4-2 delta), `validate_decision_gates` under admission, the format's decision/wait keys + the `operator` role (§8.2 stance), the integer-key ban bundle (ch13 boundary verdict (f)), the two operator intent verbs + the floor's pending-Ask read, the shipped template's `human_approval` wiring + journey smoke | — (map-extension, §1.3 critical-path note) | realized |
| 10 | Operator recourse card: one page (query via the floor, cancel, deleteRequested; no watchdog/retry until L9) | PI-9 | planned(ch 10) |

**Predicted-class convention (process-v2, added at the Phase-1 flip;
applies from ch8 ratifications; reference form aligned at realignment
round 6 — AL-18/AL-19).** Each chapter's Packets-and-flow-mode table
rows carry a one-word PREDICTED class — `projection (source: …)` /
`invention (memo-born)` — recorded AT ratification (a boundary-time
retro-annotation is worthless); the authoring-time discovery is always
the authority, and a prediction/discovery mismatch routes to a
friction-log line. **Granularity (ratified at the ch8 boundary,
2026-07-11 — the ch8-P1 flag-2 resolution):** (1) the prediction
binds the packet-time RESIDUAL ad-hoc decision content — the
D1-manifest the detector sees at the packet boundary; structural
invention absorbed by a declared prerequisite artifact (the chapter's
contract-draft) is the DRAFT's, not the packet's, so packets
anchoring to a ratified draft are predicted `projection`; (2) the
prediction NAMES ITS BASIS in the parenthetical, and a basis not yet
ratified at prediction time (the chapter's own draft) marks the
prediction as visibly CONDITIONAL — `projection (basis: the chapter
draft — pending ratification)`; the enum stays two-valued, the basis
note carries the ready-vs-pending distinction; (3) the prediction and
the row's flow mode must be CONSISTENT — an invention-predicted row
cannot declare flag-free autonomous mode. The same tables reference every chapter
contract-draft with the `draft: …, ratified <date>` convention (the
refs are REPEATABLE — the chapter's draft set is what the table
references, mirrored by the `contracts/chN-*-contract.md` glob). From
ch8 ratifications the section's heading is exactly `Packets and flow
mode` (legacy headings vary and the section NUMBER wanders by
chapter — resolvers match the heading, never the number).

**Map extension note (added at ch-5 ratification, §5.6).** The 10-chapter
map is the Block A core sequence, not a closed list: semantic surfaces the
model ladder carries beyond it enter as APPENDED chapters when their
prerequisites exist — first candidate: the archive-purge / LC4 surface,
the re-homed `CT-C-PURGE-AUDIT`'s owner. A re-home is recorded in both the
intake row and the ratifying chapter; it is never a silent drop.
Second named candidate (added at ch-8 ratification, §8.1): the **L2
gate core**, expected to precede chapter 9 — the process-gate runner
needs its call site (`GateRegistration` + the `HANDLE` gate hook —
GateEvaluator until the ch11 model fix), and
the template format gains its gate-declaration surface in that
chapter, per the §8.2 evolution stance. **ENTERED as chapter 11
(ratified 2026-07-11, §11)** — the mechanism's first live use, which
also mints its numbering convention: an appended chapter takes the
next free NUMBER (arrival order) and an explicit build-order position
in this map; existing chapter ids never renumber (ch-9/ch-10
references live in ratified text and test contracts). Third named
candidate (added at ch-11 ratification): the **L2b context-block
surface** — deliberately excluded from ch 11 (§11.1); its render
semantics and its format keys (`context_blocks` catalog,
`context_block_refs`, interpreted `prompt_concern_refs`) land
together in their own appended chapter, naturally after ch 9 when a
real actor adapter consumes dispatched packets. **ENTERED as chapter
13 (ratified 2026-07-25, §13)**, build order after ch 9 — the third
live use of the mechanism, numbering per the ch-11-minted
convention; the "naturally after ch 9" condition came TRUE at the ch9
close (the real adapter materializes the packet the blocks ride in).
Fifth named candidate (added at ch-13 ratification, 2026-07-25): the
**EC emit-contract surface** — the per-op `EmitContract` machine
(payload schemas on transition edges, the versioned vocabularies
catalog, the gate `policy | verify` family split with a mandatory
verify currency binding, `payload_digest` + the idempotency rung's
digest branch, `offerable_ops`), whose packet-projection leg
(`op_contracts`, per offerable op: required fields, domains,
assertions, evidence obligations, from the SAME lookup the validator
uses) is the MECHANIZED successor to what ch 13 ships as authored
prose. The model plane calls it "the last v1-parity gap" and orders
it AFTER the MVP cut — the tension §1.3's carried item (3) re-read at
the ch13 boundary (2026-08-13; the walk record is
`v1-prompt-parity-audit.md` §7): the cut stands, and EC is the FIRST
post-cut chapter with audit-evidenced actor-facing need. RATIFICATION
DUTY bound here by that walk: the chapter's ratification DECIDES the
transport carrier of the interim envelope block's retirement —
adapter-side shaping (implementation-plane Absent-narrowing) or a
kernel-injected default block (a MODEL-PLANE act, not modeled today) —
because EC's `op_contracts` projection carries per-op SHAPE, not the
file-transport mechanics; the STAKE MEASUREMENT lives in the audit §7
addendum and is not re-derived at that ratification. SECOND
RATIFICATION DUTY bound here (the §13.5(h) capability-profile
disposition, owner-ratified KEEP-WITH-RECORD at the ch13 boundary,
2026-08-14): the L1 `CapabilityProfile` construct STAYS, with its four
findings recorded at §13.5(h), and the GUARD-or-RETIRE decision is an
INTERVAL bound to THIS chapter's ratification as its NAMED CLOSING ACT
— the ratified forward-scoped-exemption pattern (ADR-019 D4's form:
an interval with a named end, never an open state). The record's
explicit grounds: GUARD ALONE WOULD BE INSUFFICIENT — finding (i)
stands guarded or not (every live call passes `step.role`, so the
construct cannot reach its two cross-role motivating cases); and
RETIRE IS A MODEL-PLANE ACT which the two model-ledger `→ later`
items' intent-preservation argues against
(`l1 · authored-capability-restrictions-in-the-baseline`,
`l1 · capability-filtered-packet-ops`) — the boundary smuggles no
model decision. Two bindings ride the interval: (a) the never-built
guard invariant (explicit entries may only NARROW, never invent —
`HELP_REQUEST` and op-family ops included) is a PRECONDITION of the
file format ever accepting the key; (b) the model's L1 illustration
(a single-role-step narrowing that instantiates neither motivating
case) is replaced or removed WITH the winning disposition, as a
model-plane act.
**Retirement obligation bound here (the carrier choice, user-ratified
2026-07-25): the chapter that enters this candidate carries in its
DoD the retirement of ch 13's interim emit-envelope catalog entry**
(§13.1 item 4 / opening disposition 1) — the same inheritance shape
the ch9 detached map-audit uses, and the reason this line exists at
all: a "temporary" marker living only in chapter prose has no
carrier, and the R-PRESENT-TENSE reference-economy rule requires one.
Unit-side tripwire for a re-reader: the 11 still-`pending`
`emit-contract-pseudocode/*` entries in `v3/src/drift/unitMap.json`
(only `payload_digest` is realized, by ch5-P4) — the surface cannot
be realized without flipping them. Fourth named
candidate (raised at the ch11 close as ch-9's own map-extension
question — §11.1's honest boundary; decided by the user at the
ch9 scoping round, 2026-07-18): the **runtime core** — the L0c/L0d/
L0e kernel slices the runner MVP presupposes. **ENTERED as chapter
12 (ratified 2026-07-18, §12)**, build order before ch 9 — the
second live use of the mechanism, numbering per the ch-11-minted
convention.
**The L3 human-decision surface ENTERED as chapter 14 (ratified
2026-08-14, §14)**, build order after ch 13 — the fourth live use of
the mechanism, and the first whose entry derives NOT from a prior
named candidate but from the ch13 boundary's critical-path note
below (L3 never had a candidate row; the MVP-cut walk's sequencing
record is the derivation source). Seventh named candidate (added at
ch-14 ratification, 2026-08-14): the **LC3a workflow-actions
surface** — `type: action` + `RUN_ACTION` + the `ActionRunner` leg
(the L2a runner family), the `outcomes` ChoicePoint instantiation
with its additive `emits?` extension and kernel-classified selector,
the CAS-claim single-winner run protocol, the commit/merge anchor
actions, `ActionRequest`. THREE bindings recorded at entry: (a)
**adjacency** — it is sequenced as the NEXT implementation chapter
after ch 14 (the critical-path note's "sequences adjacent" read,
user-ratified 2026-08-14: without it approve→commit→merge stays
half-manual); (b) **anchoring** — its contract-draft EXTENDS ch 14's
shared-grain ChoicePoint C-rows additively (`emits?`, the
kernel-classified selector), never a parallel shape — the
declared-schema re-lock machinery holds the fork; (c) **carried-item
home** — it is runner-touching by construction (the ActionRunner
spawns), so plan carried item (4) (the spawn-outcome diagnostics
gap) lands there. Unit-side tripwire: the 11 still-`pending`
`action-pseudocode/*` entries in `v3/src/drift/unitMap.json`; the
shipped template's `commit_pending` wait grows into `commit_action`
there (the model ladder's own rhythm, accepted at the ch14 scoping
round).
**Close verdict (the ch11 boundary, 2026-07-18 — §11.5's
first-exercise verdict): VALIDATED** — the appended chapter ran the
standard rails end-to-end (own ratification; contract-draft lifecycle
incl. one sanctioned reopen; seven packets with two in-chapter
splits; the standard DoD close). One minted duty: the extension act
ALSO updates this header's "Chapters present" range (the ch8/ch11
insertions left it stale — caught and fixed at the ch11 close).
**Carried cross-chapter items (recorded at the ch9 close,
2026-07-25 — this block is on the next-step derivation's reading
path, deliberately):** (1) the **EPIPE product item** (ch9 boundary
verdict, ADOPTED later-chapter: the operator CLI's stdout sink
crashes with a raw stack on a closed pipe — repro `pnpm v3:cli
detail … | head -1`; a small fix + test lane, natural first-packet
or hygiene content for the NEXT chapter); (2) the **detached
realized-map arm audit for ch9** (plan §9.5's DoD clause: the arm's
per-row map audit of `ch9-runner-contract.md` runs DETACHED,
deadline = the NEXT chapter's close — the next chapter's DoD
inherits it as a close obligation) — **DISCHARGED at the ch13 close
(2026-08-13):** the audit ran (byte guard clean, hash identical
before and after), 11 map-block folds landed in the audit's minimal
form, `pnpm v3:realized-map` green after; its one substantive find
became carried item (4) below. (3) the **MVP-cut vs
v1-parity re-read** (raised by the owner, 2026-07-25, off the
`v1-prompt-parity-audit.md` measurement): the model plane's MVP cut
is defined as "build until local WF-7 runs" — a DIFFERENT target
from "v3 can replace the v1 pair-workflow", which the cut never
claimed to answer. The audit produced one concrete instance: the EC
layer, which the model's own text calls "the last v1-parity gap",
sits AFTER the cut, and no v3 surface tells a real actor the emit
envelope shape until it lands (§5 of the audit). OBLIGATION: before
this plan sequences the chapters that follow the L2b chapter, walk
the post-cut and late-Block-A layers against the audit and record,
per layer, whether v1-workflow replication needs it EARLIER than the
cut implies — **DISCHARGED at the ch13 boundary (2026-08-13):** the
walk ran and its per-layer record is `v1-prompt-parity-audit.md` §7;
no re-cut warranted; the EC candidate row above carries the bound
ratification duty; the CRITICAL-PATH note below carries the
sequencing read. The walk's explicit sub-question (raised by the owner at
the ch13 draft ratification round, 2026-07-26): which actor-facing
instructions are SYSTEM-level rather than workflow-level, and does
each have a template-INDEPENDENT carrier — the candidate carriers
being the EC packet projection (mechanized, from the validator's own
lookup), a kernel-injected default-block surface (NOT modeled today —
adopting one is a model-plane act), or adapter-side shaping (a named
L2b Absent)? The ch13 interim state is honest but seed-dependent: the
emit-envelope block lives in the SHIPPED template, so a from-scratch
template author does not inherit it. This is an implementation-plane read; a finding that
the CUT itself is mis-drawn is a model-plane matter and routes to
the standing model↔code divergence stop (README §6), never a silent
re-cut here. (4) the **process-gate spawn-outcome
diagnostics gap** (found by the ch9 detached realized-map arm audit,
recorded at the ch13 close, 2026-08-13; SOURCE OF THE OBLIGATION:
`ch9-runner-contract.md` C26, which promises a structured diagnostic
event for EVERY spawn outcome on the best-effort ch7 channel): the
actor-attempt half emits (`runner/actorAdapter.ts` `spawn_outcome`);
the process-gate runner half does NOT — `runner/processGateRunner.ts`
performs spawns and carries zero diagnostic calls (the executed
receipt lives in the ch9-C26 map entry's open note). WORK ITEM: the
gate runner's spawn outcomes join the existing best-effort diag
channel, with tests, owned by the next runner-touching chapter; the
ch9-C26 map entry's UNDER-REALIZATION note retires with it.

**Sixth named candidate (added at the ch13 boundary, 2026-08-14 —
the user-routed 2026-08-05 finding's §7-mandated plan-map row):**
**gate-config declarations as data through the port** — the three
delegated gate schemas (threshold / previous-reviewer-verdict /
process config) cannot join the ADR-019 declared-schema substrate
because the ch11-P2a lint boundary confines `gates/`; the
purpose-preserving path is a DECLARATION field on `GateRegistration`
travelling through the port. Scope: the next gate-surface-touching
chapter's ordinary work, prerequisites carried with it — a ratified
port-shape change, the `[d-gc-*]` paper declarations, a per-surface
parity gate. Never a while-we-are-here act (the routing entry's own
rule).

**Eighth and ninth named candidates (added at ch14-p2a pre-approval,
2026-08-16 — the two `later-chapter` routes that packet takes, landing
their plan-map rows in the routing act itself per the §7 rule; the
packet's own K18 and K16 carry the reasoning, this map carries the
obligation):**

- **A non-agent `start` step refused at ADMISSION.** ch14-p2a closes
  the reachable defect with a fail-loud kernel guard at each activation
  commit, because a declaration rule does not belong in a packet whose
  boundary excludes the definition plane. The durable home is an
  admission cross-rule: a template whose `start` step carries a `type`
  is refused at `admit_definition`, which retires the kernel guard.
  Scope: the next definition-plane-touching chapter's ordinary work.
  Never a while-we-are-here act.
- **The bundle redaction seam and envelope-less rows.** The debug
  bundle's policy predicate takes an ENVELOPE, so no policy can be
  consulted about a field on an envelope-less transcript row;
  ch14-p2a omits the field uniformly, fail-closed, under both shipped
  policies. The durable question — may a pass-through policy carry a
  decision request's context surface, and what shape does the seam take
  to ask it — belongs to the next bundle-touching chapter, together
  with the port change and both shipped policies' suites. Scope: that
  chapter's ordinary work. Never a while-we-are-here act.

**Critical-path note (recorded at the ch13 boundary walk, 2026-08-13
— sequencing input for the next-chapter derivation; chapter entry
stays the owner's explicit act):** the MVP cut's own remaining
critical path is **L3 (human decision-request, 18 pending units) and
L4 (child workflows, 14 pending units) — NEITHER has a chapter**; they
are what "local WF-7 runs" still needs, ahead of any post-cut layer.
LC3a (workflow actions) sequences adjacent to L3 (the `commit_pending`
action), else approve→commit→merge stays half-manual. EC is the first
post-cut chapter (its row above); the L2b computed-bodies/phase-axis
Absents route to the MODEL PLANE for leveling FIRST if v1-replacement
ever becomes a target (audit §7's conditional route). **(Aligned at
the ch14 ratification, 2026-08-14: L3 ENTERED as chapter 14; LC3a =
the seventh named candidate carrying the adjacency binding; L4
remains chapterless — this note stays its carrier.)**

**Ordering note (walking-skeleton-first, README §3.4).** Chapter 3 before
chapter 4 does not contradict the principle: ch 3 is the constraint-sink /
test-kit **foundation** the skeleton runs on (controlled clock, scripted
actor, fake egress, emit-lib); the first **runtime code slice** is still the
ch 4 walking skeleton.

**MD-1 (declared migration debt).** Chapter 4's walking skeleton instantiates
from a **fixture-form template** (hardcoded, test-kit shaped) so the skeleton
stays thin. The canonical authoring format lands in chapter 8, which MUST
migrate the fixture onto it and retire MD-1. This is a deliberate sequencing
decision, not an oversight. **Retired at ch8-P2 (2026-07-11):** the
canonical file `v3/templates/local-pair-v0@1.yaml` is the single source;
the testkit fixture is equality-pinned to its parsed form from tests; the
CLI builtin copy is deleted.

**PI-11 split.** The task-packet convention, the projection checklist, and
the ramp-marking rule are realized by this chapter (the template file is the
named deliverable). The coverage-accounting **script** is planned(ch 3); its
accounting *rules* — the in-scope inventory it asserts over — are fixed in
§1.4 below.

### 1.4 The in-scope inventory (coverage-accounting basis)

Per README §5.4, "in scope" is a plan decision. The round-1 inventory:

- **159 pseudocode units — all in scope** (158 → 159, aligned at the ch11
  gate-admission model fix, ratified 2026-07-11 — `admit_definition` born;
  the exact delta: `ch11-model-sync-delta.md`). Every unit has exactly one owner
  task packet; shared ownership only by explicit declaration. Ownership
  carries a **disposition** (the template's Units line: `implement` /
  `type/schema` / `test-only` / `generated/mapped` / `alias/inherited` /
  `review-only`) — the ledger's units include declarations, helper
  contracts, overrides, and inherited/reprinted units, and not all of them
  realize as code the same way; the coverage script asserts ownership +
  disposition, never uniform code implementation. The unit→code mapping
  drift test is unconditional (PI-3).
- **54 rejection names — names unconditional, behavior scoped** (85 → 54,
  aligned at the ch11 model fix: the definition-static validate family moved
  to the definition-issue channel — those 31 names are admission ISSUE CODES
  now). The
  implementation's rejection type carries all 54 names from day one (drift
  test); a rejection-branch trace that *triggers* each name is the **scoped
  extension**, scheduled by later chapters over the 54-name checklist.
  Round-1 done does NOT require 54/54 behavioral coverage.
- **20 chapter traces — mandatory core.** The "A concrete trace" block at the
  head of each section becomes a golden test: the scripted actor plays the
  ingress sequence; the test asserts the committed transcript and outcome
  rows match the model's.
- **116 invariants — disposition-tagged, suite scoped.** Accounting rule:
  every invariant gets exactly one disposition — `checker` (the post-condition
  suite runs it over the store), `type/schema` (enforced by construction),
  `test` (a dedicated `CT-*`), or `review` (not machine-checkable; a `REV-*`
  line). The disposition map is a chapter-5 deliverable; this chapter fixes
  only the rule.
- **Domain registry (51 aggregates · 122 entities** — 121 → 122 at the ch11
  model fix: `AdmittedDefinition`) — the type layer is
  checked against ledger §4 (unconditional drift test; the ubiquitous
  language, enforced).
- **140 Absents — NOT implemented.** Realization rule (fail-closed, scoped to
  real surface):
  - If Block A actually exposes a config/API/CLI/emit surface on which the
    Absent could be requested → fail-closed with a **named rejection from the
    54-name registry**. If no existing name fits, that is a model↔code
    divergence — mandatory stop, back to the model plane (README §6); never a
    code-invented name.
  - If no such surface exists → absent-by-construction / omitted affordance;
    no code artifact at all.
  - No Absent is ever speculatively implemented.
  - Absents do not participate in the unit-ownership union.
- **Scoped OUT (deliberate):** the capability-query op family
  (`list_my_ops` / `list_spawnable_actors` / `list_addressable_helpers`) —
  the push form (`available_ops` / `op_contracts` in the context packet, EC
  E8) covers round-1 needs; the pull form belongs to the GAP-15 registry era.

The chapter-3 coverage script asserts over the plan: union of declared packet
slices = this inventory; no orphans; no undeclared double owners. Splits
re-declare their slices and the union must still close. The disposition names
are exact machine tokens — the script parses them as a fixed enum
(`implement`, `type/schema`, `test-only`, `generated/mapped`,
`alias/inherited`, `review-only`); no free-form variants.

### 1.5 Named deliverable: the task-packet template

[`task-packet-template.md`](task-packet-template.md) — the two-layer packet
convention (content layer = ledger projection; LLM-ergonomics layer =
inherited v1 gates), the projection checklist with the
constraint-transformation pass, and the standing `REV-*` registry. Executed
manually during calibration; skill-ified 2026-07-08 per README §8 (the
repo-local `CreateTaskPacket` skill — this template stays the canonical
source; the skill carries procedure only).

### 1.6 Gap closure

Both tables close: every `IC-*` item above has at least one strong
realization (`CT`/`CHK`/`ADR`) with a named home or a declared trigger; every
`PI-*` item has a chapter or named deliverable. No unmapped items remain.
Status flips happen at each owning chapter's definition of done and are part
of that chapter's DoD (README §6).

---

## Chapter 2 — Architecture skeleton (ratified 2026-07-07)

Autonomy stage: **calibration** (README §5.5).

This chapter fixes the implementation-side architecture decisions (PI-7,
PI-10) and builds the ADR machinery. It ships decisions and machinery, not
runtime code — the first runtime slice is the chapter-4 walking skeleton.
Every decision below is recorded in a born ADR (§2.6): this section is the
plan-side summary; the ADR is the decision record.

### 2.1 Code home and package topology (ADR-001)

The v3 kernel lives in this repo, in a top-level `v3/` directory, as a
**standalone package**: own `package.json`, own lockfile, own `tsconfig`,
reached from the root via `pnpm --dir v3 ...` script bridges — the existing
`ui/` pattern, stated explicitly. The repo does NOT become a pnpm workspace;
switching to a workspace would be a separate tooling decision (a new ADR),
never a silent drift.

- **Not a separate repo:** the PI-3 drift tests read
  `v3/model/ledger.md` — the model↔code contract
  surface and the code must share a repo, or the divergence stop (README §6)
  degrades into a cross-repo sync problem. The build loop's execution
  vehicle (the v1 machinery) also lives here.
- **Not inside the v1 `src/`:** the v1 CLI's build/test/release pipeline
  (tsconfig.build → dist → npm publish) is a different lifecycle; mixing
  would make every v3 commit touch the published package.

### 2.2 Module boundaries (ADR-001)

Under `v3/src/`, the dependency direction IS the rule:

| Module | Role |
|---|---|
| `domain/` | the type layer targeted by ledger §4 (51 aggregates / 122 entities at the ch11 alignment) + the rejection type (85 → 54 names at the ch11 model fix) |
| `kernel/` | the **port-parametric kernel**: apply/commit logic and invariants, parameterized over the `ports/` interfaces; imports `domain/` and `ports/` ONLY |
| `ports/` | injected dependency interfaces: `StorePort`, `ActorAdapter`, `EgressAdapter`, `GateRegistration`/`GateCatalog` (the ch-3 `GateRunner` placeholder reconciled to the ledger shapes — ADR-013/C29; aligned at ch11-p2a pre-approval), `TimeSource` (IC-D / IC-E as types) |
| `store/` | the SQLite `StorePort` implementation + schema (IC-A1 uniqueness, IC-C commit-boundary timestamps) |
| `ingress/` | op-envelope validation → kernel; adapter-independent (IC-E) |
| `emit/` | the emit-lib (`op_id` derivation) — content lands in ch 3 |
| `floor/` | the read-only visibility floor — content lands in ch 6 |
| `diag/` | the non-authoritative diagnostic channel — content lands in ch 7 |

The boundary rule, stated now and mechanized later: **`kernel/` never
imports `store/`, an adapter, or the clock — everything arrives through
`ports/`.** Chapter 3 (the constraint sink) turns this into lint enforcement
(an import-boundary check beside `CHK-D-NOCLOCK`); until then it is a review
surface (`REV-E-NO-ADAPTER-BRANCH`, `REV-B-LOCAL-NOT-AUTHORITY`).

### 2.3 Language and tooling (ADR-002)

TypeScript strict / Node ≥22 / pnpm / vitest / eslint — the repo's existing
culture, with isolated v3 configs (the v3 tsconfig mirrors the root's strict
flags). Root gains bridge scripts (`v3:typecheck`, `v3:adr-check`). Vitest
wiring lands with its first consumer (the ch-3 test kit); the scaffold ships
typecheck only.

### 2.4 Storage substrate and migration stance (PI-7, ADR-003)

**Substrate.** The T1 canonical run store's first substrate is **SQLite**
(WAL mode); evidence/artifacts live on the filesystem by reference (T3); all
access goes through the `StorePort`. Block A is a local, single-operator v1
— Postgres is an external dependency a local-first tool does not need first.
SQLite gives real transactions, so IC-A1's core (op-record insert + instance
CAS under ONE transaction, `UNIQUE(instance_id, op_id)`) holds natively.

IC-B compatibility: `SKIP LOCKED`-style claiming is a Postgres idiom, but
IC-B itself says claiming is scheduling, never semantics — correctness comes
from uniqueness + CAS, which SQLite enforces the same way. `CT-B-TWOWORKER`
runs on WAL + immediate transactions. A Postgres swap is later adapter work
behind the port, not a model decision (this closes the storage memo's open
question #1 for this round; the memo stays on the model plane, the ADR
records the pick).

**Authority guardrail (ADR-003, binding).** The SQLite T1 store is
**kernel-owned, host-local authority**. Actors, runtimes, and worktrees get
NO direct database access — they reach state only through the ingress, the
floor, and the adapter surfaces. The DB file is never an agent-touchable
working file, and it never sits on a shared/synced mount as a coordination
surface (the storage memo's mount-boundary fragility warning).

**Migration stance (storage memo #8; PI-7 requires it stated).**
**Wipe-and-recreate — fenced:**

- applies to **development/prototype stores only**, identified by an
  explicit schema marker (schema version + prototype flag) written at store
  init;
- a store with an unknown, missing, or non-prototype marker → **fail
  closed**: refuse to open, never silently wipe;
- no migration framework until the schema stops moving fast.

### 2.5 ADR machinery (PI-10 + the IC-N gate; ADR-000)

Home: **`v3/adr/`** — per playbook §8 ("near the code, not in the model
corpus"). This MOVES the README §1 default (`docs/v3/implementation/adr/`),
recorded here.

- **Template** ([`../adr/_template.md`](../adr/_template.md)):
  the playbook minimum template + lifecycle (`proposed → accepted →
  deprecated | superseded by ADR-XXX`) + relationship links (`supersedes` /
  `amends` / `depends-on` / `related`) + a mandatory **IC-N screen** field:
  the author declares whether the decision touches any of the four banned
  kernel shapes; a banned shape enters only via an `accepted` ADR that cites
  and overturns IC-N by name. The screen also states: an ADR touching the
  kernel-shape guardrail is necessary but does NOT bypass the model↔code
  divergence stop — a decision that changes model meaning goes back to the
  model plane (README §6); an ADR records only deviations the model contract
  itself permits.
- **Flat index** (`v3/adr/README.md`): id · title · status · date table,
  plus a **trigger watch** section for the dormant ADR triggers
  (`ADR-A2-EXT`, `ADR-B-FENCE`) — `deferred(trigger)` items get a visible
  home beyond their intake-table rows.
- **Integrity check** (`v3/adr/check.sh`, check.sh culture): dangling ADR
  references, supersede reciprocity + cycles, status values, index↔file
  consistency. Root bridge: `pnpm v3:adr-check`.
- **Compliance review** (build-loop step 6's ADR half; playbook §8): diff vs
  accepted ADRs, references-to-superseded flagged, the unlinked-change
  prompt. The definition lives in the playbook; this chapter binds it into
  the loop.

This realizes the intake row "IC-N ADR gate (ch 2)".

### 2.6 Born ADRs

| ADR | Title | Status |
|---|---|---|
| ADR-000 | Record implementation decisions as ADRs | accepted (2026-07-07) |
| ADR-001 | Code home, package topology, module boundaries | accepted (2026-07-07) |
| ADR-002 | Language and tooling | accepted (2026-07-07) |
| ADR-003 | Storage substrate and migration stance | accepted (2026-07-07) |

(`ADR-A3-IDSCHEME` is born in chapter 3 with the emit-lib, per the intake
table.)

### 2.7 Deliverables and DoD closure

Shipped: this section; the `v3/` scaffold (package.json, tsconfig, module
directories — typechecks, no runtime code); `v3/adr/` (template, index with
trigger watch, ADR-000..003, integrity check); the root bridge scripts.

Deliberately NOT this chapter: runtime code and the domain type layer
(ch 3/4), the `CHK-*` lint/schema checks (ch 3/4 per the intake table), the
emit-lib content (ch 3).

DoD: integrity check green; the four ADRs `accepted`; chapter-1 statuses
flipped (the IC-N gate row, the ch-2 map row → realized, covering PI-7 and
PI-10); process-log review held at this boundary (log empty — recorded in
the log).

---

## Chapter 3 — Test kit, emit-lib, coverage accounting (ratified 2026-07-07)

Autonomy stage: **calibration** (README §5.5).

This chapter is the main **constraint sink** (README §5.3): rules that ride
review surfaces today become environment enforcement here — types, lint,
kit fixtures, CI wiring. It realizes PI-1 (the test kit) and PI-11's
mechanical half (the coverage-accounting script), and turns seven intake
rows green.

### 3.1 Ports first — the kit's type base

The kit is built BEFORE the kernel (the §1.3 ordering note), so the
`ports/` content this chapter authors is exactly what the kit realizes:

- `TimeSource` — the injected clock (IC-D);
- `EgressAdapter` — the send signature REQUIRES an idempotency-key
  parameter: **this is `CHK-A2-IDEMKEY`, enforced at the type level**; the
  fake egress adapter implements it first (IC-A2's enforcement line);
- `ActorAdapter` — the performer-side seam the scripted actor plays;
- `GateRunner` / process-runner seam — the surface the deterministic
  gate/process fixtures implement.

`StorePort` content stays chapter-4 work.

**No-mini-domain rule (ratification finding).** Chapter 3 must not freeze a
parallel domain model for the ch-4/5 work to dodge. Port signatures use
**opaque payloads** (`unknown` / generic parameters) wherever the ledger §4
type does not exist yet; any NAMED type this chapter introduces either
(a) uses exact ledger terminology as a final basic (e.g. `DispatchIntent`
as a name), with its shape explicitly **ch-4-owned** and marked so in the
source, or (b) stays port-local plumbing (e.g. `IdempotencyKey`,
`EpochMillis`). The ch-5 drift tests are the arbiter — nothing authored
here may compete with ledger §4.

### 3.2 The test kit (PI-1) — `v3/src/testkit/` (ADR-005)

`testkit/` is a NEW module — ADR-001's map did not carry it, so **ADR-005
(amends ADR-001)** adds it with the binding import rule: a **test-only
support module** — production modules never import `testkit/`; `testkit/`
imports `ports/`, `domain/`, and `emit/` at most, never `kernel/` or
`store/` (it is the far side of the seams, not a consumer of the kernel).

Deliverables:

- **Controlled clock** — the named IC-D deliverable: `now()` + `advance()`;
  gate-timeout integration deepens in ch 5 with the first time-dependent CT.
- **Fake egress adapter** — implements `EgressAdapter` first
  (`CHK-A2-IDEMKEY`'s runtime witness): records every call WITH its
  idempotency key; scripted acks, including the no-ack outcome (IC-A2's
  distinct non-terminal state).
- **Scripted actor** — plays an ingress-op sequence against an injected
  deliver seam (the kernel does not exist yet; the seam is a parameter).
  The ch-5 golden-trace engine; consumes the emit-lib for `op_id`s.
- **Deterministic gate/process fixtures** — scripted verdicts / scripted
  process results; typed builders.
- **Fixture convention** (short `testkit/README.md`): fixtures never read
  wall-clock time and never randomize — both halves MECHANIZED in §3.3
  (ratification minor), not left as prose.

### 3.3 The lint layer — rules become environment

eslint enters at its first consumer (ADR-002). Isolated v3 config
(`v3/eslint.config.mjs`); the ROOT lint ignores `v3/**` — the standalone
package lints itself (ratification finding: separate bridges, no root
entanglement).

- **`CHK-D-NOCLOCK`** — `Date.now` / `new Date()` / `performance.now` /
  timer globals banned under `kernel/` and `domain/`; all time flows
  through `TimeSource`.
- **Import-boundary check** — the mechanization ADR-001 promised for this
  chapter: `kernel/` imports `domain/` + `ports/` ONLY; production modules
  never import `testkit/`; `testkit/` never imports `kernel/` / `store/`
  (ADR-005).
- **`CHK-D-TESTCLOCK`** — real-sleep primitives (`setTimeout` etc.) banned
  in v3 tests; the kit's controlled clock is the only `TimeSource` a test
  binds. A test needing a real sleep fails the lint, not a review.
- **No-randomness** — `Math.random` / `crypto.randomUUID` banned in
  `testkit/` and tests (the fixture convention's second half, mechanized).
  The emit-lib's nonce path is not an accidental exemption: it takes an
  injected nonce source (§3.5) — production binds crypto, tests bind a
  deterministic source.

Every lint rule lands **negative-tested**: a deliberate violation must fail
before the rule counts as realized (the ch-2 aftermath lesson: a gate must
prove its claim).

### 3.4 Vitest + CI wiring (`CHK-E-SUITE-ON-KIT`)

- v3 vitest config; suite convention: a contract test drives the kernel
  ONLY through the kit (scripted actor + fake egress + fixtures +
  controlled clock). The named `CT-*` rows land in ch 4/5/9 — the WIRING is
  this chapter's deliverable; the suite grows into it. Ch-3's own tests:
  kit self-tests + emit-lib tests.
- Root bridges: `v3:lint`, `v3:test`, `v3:coverage` (beside the existing
  `v3:typecheck`, `v3:adr-check`).
- **CI, concretely (ratification finding):** `scripts/ci-local.sh`'s
  install step gains `pnpm --dir v3 install --frozen-lockfile`; its quality
  suite gains a v3 child (v3 lint + typecheck + test + adr-check + coverage
  validation). The GitHub validate path (`release.yml` validate job, which
  `ci-github-local` mirrors) gains the same steps.

### 3.5 The emit-lib (IC-A3) + ADR-004 (= `ADR-A3-IDSCHEME`)

One audited implementation in `src/emit/`, consumed by the scripted actor
now and the operator CLI in ch 6. ADR-004 records the scheme per operation
family (ratified):

- **actor-emit family: content-addressed** — `op_id` derived from
  (instance id, context-packet identity, op type, payload digest). Refresh
  after `Stale` yields a new `op_id` BY CONSTRUCTION (new packet identity);
  resend-without-ack reproduces the same hash. `CT-A3-RETRANS` /
  `CT-A3-EMITLIB-REFRESH` prove the kernel-facing halves in ch 5.
- **operator/CLI verb family: request-scoped nonce** — one nonce per
  logical invocation, reused across retries within it (two identical
  cancels may be two legitimate operations; content-addressing would
  collapse them). The nonce source is INJECTED — deterministic in tests,
  crypto in production.

Ch-3-local tests: derivation determinism, packet-identity sensitivity (the
refresh guarantee's lib-side half), payload-digest sensitivity, family
separation. Kernel-dependent behavior (`Duplicate` / `Stale` answers) stays
ch 5.

### 3.6 The coverage-accounting script (PI-11's mechanical half)

Home: `tools/v3-plan/check_coverage.py` — beside `tools/v3-model/`,
**stdlib only** (the `report_ledger.py` culture). Root bridge:
`v3:coverage`.

- **Inventory sources:** the `v3/model/units/` tree (159 files at the ch11
  alignment = `<section>/<UnitName>` ids), ledger §2 (116 invariants,
  `<section>/<slug>`), ledger §3 (54 rejection names at the ch11 alignment), the 20 unit
  sections (= the chapter-trace inventory), scoped by the §1.4 rules.
- **Packet source:** `v3/implementation/packets/` (the convention this
  script fixes; empty until ch 4). It parses the packet's MACHINE slice
  block — a fenced ` ```json ` block with a `ledger_slice` top-level key
  (ratification finding: canonical parseable form, not prose; JSON over
  YAML keeps the checker stdlib-only). The template carries the schema
  (`task-packet-template.md` §1).
- **Dispositions are exact machine tokens** — the fixed enums of §1.4
  (unit dispositions) and the invariant dispositions; free-form variants
  are errors.
- **Two modes (ratified):** *validation* always runs in CI — parse errors,
  unknown ids, enum violations, undeclared double owners are hard failures
  even with zero packets; *closure* (`--assert-closed`: union = inventory,
  no orphans) is the gated §5.4 chaining criterion, asserted when a chapter
  claims packet-complete coverage — not a standing failure on an empty set.

### 3.7 Execution note (ratified)

Chapter 3 runs the build loop DIRECTLY (README §4, manual, calibration) —
no task packets: the ledger slices here are thin (infra + emit-lib). The
packet convention's first live use is chapter 4, where the kernel slices
are dense. Recorded as a decision, not drift.

### 3.8 Deliverables and DoD

Shipped: this section; the machine-slice template block; ADR-004 + ADR-005;
the `ports/` content of §3.1; the test kit (clock, fake egress, scripted
actor, fixtures + README); the v3 lint layer + vitest wiring; the emit-lib;
the coverage script; root bridges + CI wiring.

DoD: all v3 bridges green (`v3:typecheck`, `v3:lint`, `v3:test`,
`v3:adr-check`, `v3:coverage`); every lint check negative-tested; ADR-004 /
ADR-005 `accepted` with the integrity check green; the seven ch-3 intake
rows + the ch-3 map row flipped to `realized` (PI-1 + the PI-11 script);
process-log review held at the boundary.

---

## Chapter 4 — Walking skeleton / bootstrap (ratified 2026-07-07)

Autonomy stage: **calibration** (README §5.5).

This chapter ships the first runtime slice — ingress → kernel commit →
floor read, bootstrapped from a fixture-form template (MD-1), driven
end-to-end by the chapter-3 kit — and is the packet convention's **first
live use** (§3.7). It realizes PI-6 and the three ch-4 intake rows
(`CT-A1-DUP`, `CHK-A1-SCHEMA`, `CHK-C-TS-SOURCE`).

### 4.1 The semantic level: L0b

The skeleton implements the **L0b** kernel, not L0a: bootstrap
(`START_INSTANCE`), the mandatory `expected_version` (`Stale`), and
post-commit `dispatch_intent` derivation are all born at L0b — and the
ch-5 kernel-facing halves of ADR-004 (`CT-A3-RETRANS`,
`CT-A3-EMITLIB-REFRESH`) presuppose exactly this surface.

The declared ledger slice (owned by the §4.8 packets):

- **Units (4):** `l0b-pseudocode/HANDLE`, `l0b-pseudocode/START_INSTANCE`,
  `l0b-pseudocode/dispatch_intent` → `implement`;
  `l0a-pseudocode/HANDLE` → `alias/inherited` (subsumed by the L0b HANDLE).
- **Rejections (4, behaviorally triggered here):** `invalid_shape`,
  `unknown_instance`, `no_transition`, `missing_version`.
- **Invariants:** l0a `op-id-idempotency` (test),
  `atomic-transition-commit` (test), `instance-store` /
  `transcript-event-log` / `definition-store` (type/schema); l0b
  `expected-version-mandatory` (test), `binding-coverage-at-start` (test),
  `commit-deliver` (test). `l0a/artifact-refs` is NOT owned this chapter —
  the evidence layer is later work; closure is not asserted.
- **Trace:** `l0b-pseudocode` (golden test, §4.7). The l0a trace stays
  with the ch-5 harness: its envelopes carry no `expected_version`, so
  replaying it against an L0b kernel needs the level-lifting convention
  the harness must define for all 20 traces anyway.
- **No invented names.** The binding-coverage failure at start has NO
  ledger §3 rejection name — it is a start-side failure (no `Started`, no
  state change), and the test asserts exactly that. Per §1.4, a
  code-invented rejection name is a model↔code divergence; if a named
  start rejection turns out to be needed, that goes back to the model
  plane (README §6).

### 4.2 Store: `StorePort` + SQLite (realizing ADR-003)

- **`StorePort`** lands in `ports/` (the §3.1 leftover): `loadInstance`,
  `createInstance`, `commitTransition`, and the floor-read methods. No
  write API accepts a timestamp (§4.3).
- **`DefinitionStore` is a separate port** (the model: "separate store;
  pinned immutable version"); this chapter binds it to the MD-1 fixture
  implementation (§4.6).
- **Schema (`CHK-A1-SCHEMA`):** `instances` (version, CAS), `transcript`
  with `UNIQUE(instance_id, op_id)`, `meta` (schema marker: version +
  prototype flag, ADR-003). Transcript append + instance CAS under ONE
  IMMEDIATE transaction (`REV-A1-TXN`).
- **Conflict precedence (ratification finding — binding store contract):**
  inside the commit transaction the duplicate check precedes the version
  check — if the transaction sees an existing `(instance_id, op_id)`, it
  reports `duplicate_op` even when the instance version has since
  advanced (the L0b HANDLE order: idempotency before stale). A "CAS
  update first, then transcript insert" implementation that misreports a
  retransmission as a CAS conflict violates IC-A1; a dedicated race test
  asserts the precedence (§4.7).
- **Store-open is fail-closed** (ADR-003's verification line): unknown /
  missing / non-prototype marker → refuse to open; wipe-and-recreate only
  on a known dev marker.

### 4.3 Commit timestamps: store-stamped from the injected TimeSource

Ratification finding. IC-C's commit-boundary authority is realized per
IC-D's binding rule ("where the store stamps commit timestamps … that
store binding is part of the time source's production binding; tests may
bind both to the controlled clock"):

- the `StorePort` write API accepts NO client timestamp (the type-level
  half);
- the SQLite store is CONSTRUCTED with a `TimeSource` and stamps
  `committed_at` / `created_at` inside the commit transaction — NOT a
  SQLite `DEFAULT`: with a DB default, a frozen-clock acceptance test
  would not test what it claims;
- `CHK-C-TS-SOURCE` = the type-level half + the claim-derived test: under
  a frozen controlled clock, committed rows carry exactly the frozen
  timestamp, and nothing an envelope carries can influence it.

### 4.4 ADR-006 — SQLite driver: `node:sqlite` on Node ≥ 24

`node:sqlite` (`DatabaseSync`): built-in — zero external dependency (the
stdlib culture) — with a synchronous API that fits the single-writer
IMMEDIATE-transaction shape IC-A1 needs. The cost is a Node floor bump,
folded in EXPLICITLY (ratification finding — the driver pick cannot land
as an engines line alone):

- `v3/package.json` engines → `>=24`;
- the validate path runs Node 24: `release.yml` setup-node 22 → 24;
  `ci-github-local` default image `node:22-bookworm` →
  `node:24-bookworm` (parity);
- root engines stays `>=22` — v1's own floor is untouched (24 satisfies
  it; the local suite already runs green on Node 26).

ADR-006 (amends ADR-002, depends-on ADR-003) records the pick; a driver
swap (better-sqlite3) stays adapter work behind the port.

### 4.5 Domain first slice + the 85-name rejection type

- `domain/` gains ONLY the l0a + l0b registry names (ledger §4):
  `WorkflowTemplate` / `Step` / `Role`; `WorkflowInstance` / `Transcript`
  / `LifecycleStatus`; `EventEnvelope`; `DispatchIntent` /
  `ContextPacket` (derived, not stored). No L0c+ type is front-run.
- The rejection type carries ALL 85 names from day one (§1.4), with a
  local pre-test: the name set equals ledger §3 exactly (ratified — the
  PI-3 rejection drift test arriving early; ch 5 formalizes/absorbs it).
  A typo would otherwise sleep until ch 5.
- **Slice-semantics rule (fixed here for every future packet):** the
  85-name union is drift-test surface, not a per-packet rejection claim —
  a packet's `rejections` list declares only the names it BEHAVIORALLY
  triggers.

### 4.6 Ingress, floor, wiring — minimal by design

- **Ingress:** hand-rolled envelope shape validation (`invalid_shape`),
  zero new dependencies → kernel. The HANDLE unit's shape-check half
  lives here (the ch-5 unit→code mapping records the split).
- **Floor:** `listInstances` + `getInstanceDetail`, committed rows only
  (trivially — the store holds nothing else). `getTimeline` + live tail
  stay ch 6 (PI-2).
- **Kernel factory:** port-parametric — store, definitions, `TimeSource`
  injected NOW (PI-6's injected clock: the seam is proven live even
  though its first real consumer is the ch-5 gate timeout).
- **MD-1:** the fixture-form template — a testkit builder shaped like the
  model's `local-pair-v0` (implement ⇄ review, PASS / CONVERGED) + an
  in-memory `DefinitionStore` fixture (pinned version). Marked MD-1 in
  source; ch 8 migrates it onto the canonical format and retires the debt.
- **Deliberately NOT this chapter:** delivery/runner (the
  `DispatchIntent` is returned, never delivered — commit ≠ deliver; ch 9),
  CLI (ch 6), `payload_digest` storage + `op_id_collision` (ch 5), drift
  tests (ch 5), L0c+ semantics.

### 4.7 Acceptance

- **`CT-A1-DUP`** — two racing deliveries of the same
  `(instance_id, op_id)` → exactly one commit, one `Duplicate`; plus the
  CAS-restart rule (restart from load, re-check idempotency, never
  re-commit a stale target) proven against a scripted `StorePort` double
  (the kernel is port-parametric — the conflict is injectable); plus the
  §4.2 precedence race: a retransmission after the version has advanced →
  `duplicate_op`, never `Stale`.
- **`CHK-A1-SCHEMA`** — claim-derived negative test: a duplicate insert
  BYPASSING the kernel pre-check fails at the database level.
- **`CHK-C-TS-SOURCE`** — §4.3's frozen-clock test + type-level half.
- **Store-open fail-closed** contract test (ADR-003).
- **The l0b golden trace:** the scripted actor plays the six-step trace
  (including the Stale step) and the committed-row sequence matches the
  model's.
- All bridges green; coverage validation green with the ch-4 packets
  parsed. Closure NOT asserted — a report showing e.g. `units 4/158
  owned` is the expected healthy state.

### 4.8 Packets — the convention's first live use

Four packets, cut along constraint cohesion (template §2, executed
manually — calibration):

| Packet | Content | Slice focus |
|---|---|---|
| ch4-P1 | domain first slice + 85-name union + `StorePort` / `DefinitionStore` port types | invariant: `l0a/definition-store` |
| ch4-P2 | SQLite store: schema, marker, fail-closed, txn shape | `CHK-A1-SCHEMA`, `CHK-C-TS-SOURCE`; invariants: `instance-store`, `transcript-event-log`, `atomic-transition-commit` |
| ch4-P3 | kernel HANDLE + `dispatch_intent` + ingress | `CT-A1-DUP`; units `HANDLE` ×2, `dispatch_intent`; the four rejections; `op-id-idempotency`, `expected-version-mandatory` |
| ch4-P4 | bootstrap `START_INSTANCE` + MD-1 fixture + floor read + golden trace | unit `START_INSTANCE`; `binding-coverage-at-start`, `commit-deliver`; trace `l0b-pseudocode` |

Calibration flow (ratified): **P1 is approved BEFORE build** (the packet
form's first live validation); P2–P4 flow and are reviewed at commit
boundaries. One packet = packet file + code + tests in ONE commit.

### 4.9 Deliverables and DoD

Shipped: this section; ADR-006 + the Node-24 validate path; the four
packets with their code and tests; the MD-1 fixture template.

DoD: all §4.7 tests green; every `CHK-*` negative-tested from its
DECLARED claim (README §4 step 2 — these are the first post-rule gates);
ADR-006 `accepted`, integrity check green; the three ch-4 intake rows +
the ch-4 map row flipped to `realized` (PI-6); MD-1 stayed open by design
(ch-8 debt; retired at ch8-P2, 2026-07-11); coverage validation green over
the four packets; process-log
review held at the boundary.

---

## Chapter 5 — Ledger→test transfer (ratified 2026-07-07)

Autonomy stage: **calibration** (README §5.5).

This chapter builds the transfer machinery PI-3 names — the three
unconditional drift tests, the chapter-trace golden harness, the invariant
disposition map + post-condition suite — and realizes five of the six
ch-5 intake rows (`CT-A1-COLLISION`, `CHK-A1-DIGEST`, `CT-A3-RETRANS`,
`CT-A3-EMITLIB-REFRESH`, `CT-B-TWOWORKER`); the sixth is re-homed (§5.6).

**Chapter rules (binding, from the ch-4 aftermath — process log):**

1. **Enumerate claim dimensions first.** Every gate/check packet lists
   its claim's DIMENSIONS before deriving tests (the ch-4 ladder — value
   shapes → descriptors → prototypes → numeric identity — is the
   precedent for what "wide enough" means).
2. **A logged instruction is not execution.** A sweep or check a packet
   prescribes is EXECUTED and test-pinned in the same commit; it is part
   of the packet's acceptance, never a note for later.

### 5.1 The three unconditional drift tests (PI-3)

Home: **`v3/src/drift/`** — a NEW test-only module; **ADR-007 (amends
ADR-001)** adds it to the module map with the binding rule: production
modules never import `drift/`; drift tests read the `v3/model` documents
at test time (the ch-4 `rejectionNames.test.ts` precedent).

1. **Rejection names (85 at ch5; 54 from the ch11 model fix — the P0 bridge re-pins).** The ch-4 pre-test moves here unchanged
   (`git mv` from `domain/`) — ch 5 formally absorbs it, closing §4.5's
   forward reference.
2. **Domain registry (51 aggregate blocks · 121 entities at ch5; 122 from the ch11 model fix).** The test
   parses ledger §4 at test time; the code-side counterpart is a
   **manifest** (`drift/domainRegistry.ts`): every ledger entity →
   `realized(<exported type name>)`, `pending` (no chapter claim — the
   plan map owns scheduling; aligned at P1 pre-approval), or
   `contract-row` (a §4 prose/contract surface, never a type). The test
   asserts key-set equality; **existence is proven by the typecheck** —
   the manifest references realized types via `import type`, so a
   vanished type is a compile error (types are erased; no runtime trick
   can check them). Non-type §4 tokens (e.g. storage-scope shape /
   constraint / policy rows) carry their own manifest dispositions; the
   normalization rule (annotation stripping: `[root]`, `(value)`, …) is
   pinned in the P1 packet with the full row table.
3. **Unit→code mapping (158 at ch5; 159 from the ch11 model fix).** A manifest (`drift/unitMap.json` — JSON,
   dual-read by the vitest test and the stdlib coverage script; aligned
   at P1 pre-approval): unit id → `{"status": "pending"}` or
   `{"status": "realized", "disposition": <§1.4 enum>, "codeRef":
   "<path>#<symbol>"}` (the packet's canonical matrix is the schema
   source). The test asserts: key set == the
   `v3/model/units/` tree at test time; every `codeRef` resolves (file
   exists, symbol present). **Three-way lock:** the coverage script's
   validation mode gains a cross-check — a packet-owned unit's declared
   disposition must equal the manifest's; ledger ↔ manifest ↔ packet
   cannot shear pairwise. (Negative-tested through the script's
   `--packets-dir` seam, derived from the widened claim.)

### 5.2 The chapter-trace golden harness + level-lifting

- **Declarative trace fixture** (testkit): a step list (`start` /
  `emit` with expected outcome + state assertions) plus a final
  transcript expectation (`[seq, opId]` sequence). The engine replays it
  scripted-actor → ingress → kernel → REAL store, then runs the §5.3
  post-condition checkers over the final store state.
- **Level-lifting convention — declared data, not ad-hoc:** a level-Lx
  trace replays against the CURRENT kernel; a lift may only ADD fields
  the kernel's present level makes mandatory (now: `expectedVersion`,
  tracked from the running version in a declared way), and it may
  **never weaken a trace assertion** (the l0a 3′ redelivery step's
  `Duplicate` expectation stands). The convention lives here; each
  trace's lift rule lives in its fixture.
- **Ch-5 transfer: the l0a trace** (lifted — traces 2/20). The ch-4 l0b
  golden test is REFACTORED onto the harness; trace ownership stays with
  ch4-P4 (no slice change, no double owner).
- **Trace-status table** (P3 packet): all 20 traces — level, lift need,
  expected owner chapter. The storage-scope row is stated precisely
  (ratification finding): the section HAS a runtime-shaped block, but
  the model itself says **"Not a handler trace"** — a non-handler /
  placement-contract trace, not harness-replayable; its realization
  stays a documentation/review disposition with its owner chapter.

### 5.3 The invariant disposition map + post-condition suite

- **The map dispositions ALL 116 invariants now**:
  `invariant-disposition-map.md` (this directory), with a machine JSON
  block. Exactly one disposition each — `checker` / `type/schema` /
  `test` / `review` (§1.4). The coverage script validates: key set ==
  ledger §2, enum validity, and **packet-declared invariant dispositions
  == the map** (the ch-4 packets' 8 rows are already bound — the map
  conforms to them, not the reverse).
- **Post-condition checker kit** (testkit): store-state checkers — seq
  continuity, version arithmetic (version == 1 + committed
  transitions), terminal-is-a-sink, uniqueness consistency. The harness
  runs them after every trace replay. Accounting: harness
  INFRASTRUCTURE, not a disposition owner — the ch-4 `CT-*` rows keep
  their invariants; the `checker` disposition mostly awaits later
  levels' store-surfaced invariants.

### 5.4 The digest slice: `CT-A1-COLLISION` + `CHK-A1-DIGEST` (actor-emit scope)

Realizes the emit-contract HANDLE's digest rung in its **schema-less
branch** (`contract is none → digest_of(type ⊕ canonical(payload))`) —
exactly the EC memo's scope decision; operator/lifecycle digests stay a
named Absent.

- **Two digest surfaces (ratification finding — binding contract):**
  - `digestPayload` (payload-only) REMAINS the op_id-derivation
    component (ADR-004's material is unchanged); its "CHK-A1-DIGEST
    input" source comment was WRONG and is corrected in P4.
  - The **transcript/collision digest is type-inclusive**, per the
    model's `payload_digest` unit: a NEW emit-lib function (the one
    audited implementation grows, not forks) — sha256 over a
    domain-separation tag + `JSON.stringify([TAG, type,
    canonicalize(payload)])`; **absent payload encodes as `[TAG, type]`,
    `null` as `[TAG, type, "null"]`** — the third element is ALWAYS
    the canonical output STRING (uniform rule; aligned at P4
    pre-approval), absence is arity; absent ≠ null by encoding,
    test-pinned.
  - **ADR-008 (amends ADR-004)** records the transcript-digest form —
    born in P4. The P4 packet carries a small **canonical contract
    matrix for the two digest surfaces** (ratification finding).
- **`DigestSource` port** — the kernel's import boundary stays intact
  (domain + ports ONLY); the production binding is the emit-lib
  function. The kernel computes the digest ONCE in HANDLE; the rung
  compares, the commit records — the model's order.
- **Store schema v2:** the transcript gains a `payload_digest` column;
  `SCHEMA_VERSION` "1" → "2" — the ADR-003 **fenced wipe path runs live
  for the first time** (known dev marker → wipe-and-recreate;
  non-prototype → still fail-closed).
- **Precedence extension (continues §4.2's binding contract):** the
  in-transaction duplicate check becomes digest-aware — an existing
  `(instance_id, op_id)` row with a MATCHING digest → `duplicate_op`; a
  DIFFERING digest → a new result arm `op_id_collision` (a ledger §3
  registry name, not invented). Both precede the CAS check.
- **`CHK-A1-DIGEST`** claim-derived: a committed actor-emit row carries
  its digest; rejected / duplicate / collision attempts write NOTHING
  and consume no idempotency key.

### 5.5 The emit⇄kernel loop + two workers

- **`CT-A3-RETRANS`** — scripted actor + emit-lib against the REAL
  kernel: a retransmission (same context-packet identity) reproduces the
  same `op_id` → `Duplicate`, one transcript row.
- **`CT-A3-EMITLIB-REFRESH`** — a stale emit → `Stale(v)`; a refresh
  from a FRESH context packet derives a new `op_id` by construction →
  commit; and the rejected attempt consumed no key.
- **`CT-B-TWOWORKER`** — the deterministic **op-level interleave form**:
  two kernels over two real store handles on ONE WAL file, permuted
  submission orders — the semantic race is real (cross-handle staleness
  → `cas_conflict` → restart-from-load across handles; `duplicate` after
  the other worker's commit); the final state and transcript are
  schedule-independent, every op committed exactly once.
- **Contention boundary (stated narrowly — ratification edit):** under
  THIS chapter's test topology — one process, one JS event loop,
  synchronous `node:sqlite` calls — no two `BEGIN IMMEDIATE`
  transactions can be in flight at once, so `SQLITE_BUSY` does not arise
  *here*. This is a property of the ch-5 topology, NOT a general
  SQLite/`node:sqlite` claim. Process-level contention (BUSY taxonomy,
  `busy_timeout`, retry ownership) is an EXPLICIT ch-9 contract, where
  the intake row already schedules `CT-B-TWOWORKER`'s real-runner
  re-run.
- **P5 flow guard (ratification edit):** P5 stays flow ONLY while it is
  test-only — if `CT-B-TWOWORKER` turns out to require ANY production
  change (StorePort taxonomy, retry/busy handling, kernel contract), P5
  falls back to pre-approve/refine BEFORE that change is made.

### 5.6 Intake amendment: `CT-C-PURGE-AUDIT` re-homed

The L0b surface has neither decision-audit rows nor a purge; the test's
prerequisites land nowhere on the ch-1–10 map, and front-running a purge
surface would violate scope. The §1.2 row is EDITED (re-homed at this
ratification): Home → *purge chapter (map extension)*, Status →
`planned(purge chapter)`; §1.3 gains the map-extension note. A visible
`planned(...)` was chosen over `deferred(trigger)` deliberately — this is
sequencing, not dormant-by-design.

### 5.7 Correction note: the gate-timeout forward reference

Ch 3 §3.2 / ch4-P3 said the `TimeSource`'s "first real consumer is the
ch-5 gate timeout" — that forward reference was WRONG: no gate semantics
(L2a) live in ch 5. Ratified texts stay as ratified; this note is the
correction of record: the first time consumer beyond store timestamps is
the L2a chapter's gate timeout.

### 5.8 Packets and the flow mode

**Flow-mode rule (fixed here for this and later chapters): first-of-a-kind
stop** — a packet introducing a NEW artifact or contract class stops for
approval BEFORE build; a packet of an already-validated class flows to
commit-boundary review.

| Packet | Content | Mode |
|---|---|---|
| ch5-P1 | drift suite (3 tests + manifests + script cross-check) + ADR-007 | pre-approve (first-of-a-kind: manifest) |
| ch5-P2 | invariant disposition map (116 rows) + checker kit + script validation | pre-approve (first-of-a-kind: map) |
| ch5-P3 | trace harness + level-lifting + l0a trace + l0b migration | pre-approve (first-of-a-kind: harness) |
| ch5-P4 | digest slice: ADR-008 + schema v2 + `DigestSource` + collision + `CHK-A1-DIGEST` | pre-approve (first-of-a-kind: schema bump, new result arm, digest contract — ratification finding) |
| ch5-P5 | `CT-A3-RETRANS` + `CT-A3-EMITLIB-REFRESH` + `CT-B-TWOWORKER` (interleave form) | flow (test-only; §5.5 flow guard applies) |

Order: P1; P2 → P3 (the harness calls the checker kit); P4 → P5 (the
digest precedence is a prerequisite). One packet = packet file + code +
tests in ONE commit.

### 5.9 Deliverables and DoD

Shipped: this section; the §1.2/§1.3 intake amendment (§5.6); the drift
module + manifests + script cross-check; the disposition map + checker
kit; the trace harness + the lifted l0a trace + the l0b migration; the
digest slice with ADR-007/ADR-008; the three §5.5 contract tests.

DoD: drift suite green (3/3); the map validated (116/116,
packet-consistent); traces 2/20; `CT-A1-COLLISION`, `CHK-A1-DIGEST`,
`CT-A3-RETRANS`, `CT-A3-EMITLIB-REFRESH`, `CT-B-TWOWORKER` green; every
gate packet's claim dimensions enumerated and its prescribed checks
EXECUTED (chapter rules 1–2) — verified at the boundary review; all v3
bridges green; ADR-007 / ADR-008 `accepted`, integrity check green; the
five ch-5 intake rows + the ch-5 map row flipped to `realized` (PI-3);
process-log review held at the boundary.

## Chapter 6 — Visibility floor + operator CLI (ratified 2026-07-08)

Autonomy stage: **calibration** (README §5.5). The ch-5 chapter rules
remain binding: (1) enumerate a claim's DIMENSIONS before deriving its
tests; (2) a logged instruction is not execution — prescribed checks are
EXECUTED and test-pinned in the same commit.

This chapter realizes PI-2 — the full read-only floor, the debug bundle,
and the operator CLI's command + dev verbs. Governing principle:
**chapter 6 adds ZERO new kernel semantics** — read models, a thin
client, and wiring over the existing L0b surface; every write enters
through the surfaces that already exist. The kernel, ingress, emit-lib,
and schema (`SCHEMA_VERSION` "2") are untouched.

### 6.1 Scope and boundaries

**In:** `getTimeline` (committed rows only, cursor read), the live tail
as the **committed floor-tail seed** (§6.3 — deliberately NOT the observe
seam), the debug bundle with the redaction boundary as a seam (§6.4),
the CLI command verbs over the existing kernel surface + the dev verbs
behind a separate entrypoint (§6.5).

**Out, stated (not silently absent):**

- **The diagnostic layer** — live rejection visibility in the tail and
  the bundle's "rejected inputs" section → ch 7 (PI-4). The ch-6
  surfaces carry committed facts ONLY; the seams are named so ch 7 adds
  a layer, not a rewrite.
- **`cancel` / `deleteRequested` command verbs** — their kernel levels
  (LC1+) are not implemented; the CLI covers the surface that exists.
  The ch-10 recourse card resolves its own dependency when scheduled.
- **The canonical template format** → ch 8 (MD-1 stood until ch8-P2 —
  retired 2026-07-11). The CLI
  `create` works with the fixture-form template and says so.

### 6.2 `getTimeline`: the cursor read (P1)

- `StorePort` gains one read:
  `getTimeline(instanceId, afterSeq): Promise<readonly TranscriptEntry[] | null>`
  — **unknown instance = `null`, known-but-empty = `[]`** (ratification
  finding: the CLI must distinguish "no such run" from "no new rows";
  consistent with `getInstanceDetail`'s existing null contract). The
  floor wraps it with the same duality.
- Rows are the existing `TranscriptEntry` (seq / envelope /
  payloadDigest / committedAt) — no new row type, no schema change.
  `REV-C-PROJECTIONS-READONLY` stands.
- **The committed-only claim is stated WIDE** (chapter rule 1): not
  "trivially true because the store holds nothing else" but "no
  diagnostic or non-committed data can EVER enter this surface" — ch 7's
  channel is separate by construction, and the negative tests derive
  from the wide claim.
- Claim dimensions: cursor semantics (0 = full replay / mid-cursor /
  beyond-end = `[]`), ordering stability (seq-ascending, always),
  unknown vs known-empty vs beyond-end distinguished, committed-only.
- **Cursor domain (aligned at ch6-P1 pre-approval):** `afterSeq` is a
  nonnegative safe integer; anything else fails closed with an
  integrity-style `RangeError` BEFORE any query — never a kernel
  rejection. The ch-6 CLI (P4) maps it to its usage/config error
  class; the tail (P2) inherits the same domain. The null/`[]`
  decision and the row suffix come from ONE read-transaction snapshot
  (`BEGIN DEFERRED` — a reader never takes the write lock).

### 6.3 The live tail: the committed floor-tail seed (P2)

- Deliverable: **`tailCommittedTimeline(instanceId, fromSeq)`** on the
  floor — the closed memo's "single-instance seed" of the observe seam's
  history-plus-tail primitive
  (`../design/topics/_closed-v1-operability.md`), NOT the seam itself.
- **Explicitly deferred to the observe seam's own future chapter:** live
  push media, addressed streams, backpressure, terminal/gap MARKER
  semantics, the diagnostic layer (ch 7). The seed's stop-at-terminal is
  a pragmatic completion condition (a terminal instance commits no
  further rows), not the seam's typed terminal-marker contract.
- Shape: **cursor-polling over the shared WAL file** — the honest
  cross-process form (the ch-5 two-worker test is the multi-handle
  precedent); replay from the cursor first, then new rows as they land.
- **The wait seam is floor-side**: an injected `TailWait` drives the
  poll loop — production binds real timers; tests bind a controlled
  wait. The kernel's `TimeSource` is untouched (IC-D unchanged). No
  tail test may real-sleep (CHK-D-TESTCLOCK's spirit; the seam is what
  makes the loop deterministic).
- **Unknown instance: fail-closed at start** — an explicit error, never
  a silent empty stream (ratification finding). V1 boundary stated: an
  instance cannot vanish mid-tail (no purge exists), so unknown is a
  start-time question only.
- The claim (scoped by ratification): **the seq cursor guarantees no
  committed row is skipped or duplicated, in order** — not "full
  observe". Dimensions: no-skip across commits landing DURING the tail,
  no-duplicate across poll rounds, ordering, stop condition, unknown
  fail-closed.
- **Factory shape + error contract (aligned at ch6-P2 pre-approval):**
  the tail is its own floor-module factory — `createTail(store, wait)`
  in `floor/tail.ts` — NOT a `createFloor` signature extension: the
  request/response `Floor` stays seam-free; the CLI (P4) wires the two
  together, and the production timer binding for `TailWait` activates
  THERE (P2 = seam + engine foundation, not an end-to-end operator
  tail). Stop rule: `wait()` runs only after a non-terminal POST-drain
  status read; once terminal is observed the engine drains till empty
  and completes. Failure surface: the factory never throws — every
  failure lands on iteration (invalid cursor `RangeError`, startup
  unknown `TailUnknownInstanceError`, mid-stream vanish
  `TailIntegrityError`, `wait()` rejections propagate as-is and end
  the tail).

### 6.4 The debug bundle + the redaction boundary (P3)

- One read-only export of one run, **reading from the store ONLY** —
  env/runtime material cannot enter by construction. Content: instance
  state, the typed transcript with digests, template ref, versions,
  status, timestamps.
- **The redaction boundary is a seam, not a promise:** every payload
  passes an injected `RedactionPolicy` before entering the bundle.
  **Default policy: redact/omit — payloads do NOT appear**; the bundle
  carries structured metadata only (ids, types, seq, versions, status,
  digests, timestamps). Pass-through is a separate NAMED dev/test
  policy, explicit opt-in only (ratification finding: the closed memo's
  secret-exfil guardrail binds the production default; a pass-through
  default would violate it even with the policy named). The bundle
  records which policy produced it.
- The **"rejected inputs" section is named in the bundle schema and
  explicitly marked absent** ("diagnostic channel lands ch 7") — a
  stated gap, not a silent one.
- Claim-derived negative (wide claim): a marker string planted in a
  payload appears NOWHERE in the default bundle's entire serialized
  output — not merely "the payload field is missing".
- **Foundation shape + guardrail precision (aligned at ch6-P3
  pre-approval):** the exporter is its own factory —
  `createDebugBundleExporter(store, policy)` in `floor/debugBundle.ts`
  (the P2 pattern; `Floor` stays seam-free); unknown instance = `null`
  (the §6.2 duality). P3 ships exactly TWO named policies: the
  production default `redactPayloadsPolicy` (payloads omitted;
  `hasPayload` + digest remain) and the testkit-only
  `devPassthroughRedactionPolicy` — the testkit home keeps the named
  pass-through OUT of the normal production import graph (ADR-005
  lint); the seam itself stays public, so the binding obligation is
  review-owned: **REV-BUNDLE-DEFAULT-POLICY** — P4's normal CLI graph
  binds the default, pass-through only under `cli/dev/`. The packet's
  canonical bundle schema matrix (incl. optional `eventId`) is the
  single source for the keyset tests and the P4 JSON/dump consumer.
  P3 is foundation only — the bundle-dump verb activates in P4.

### 6.5 The operator CLI (P4)

- New top-level module **`cli/`** — a thin client (the core-API memo's
  settled role): formatting, defaults, wiring; zero semantics.
- **Command verbs over the existing surface only:** `create` (wraps the
  ch-4 bootstrap seam; **production instance-id minting lands here** —
  an injected id source: deterministic in tests, crypto in production;
  kernel and store stay randomness-free), `start`, `submit` (through
  `ingress.submit`).
- **The operator nonce family's first real consumer (ADR-004):**
  `submit` derives its op_id via `deriveOperatorOpId(nonce)` — one nonce
  per logical invocation, reused across retries within it;
  `NonceSource` injected.
- **Dev verbs behind a separate entrypoint:** fixture-emit injection
  (scripted actor), golden-trace replay (the testkit harness), bundle
  dump under the dev/test pass-through policy. Home: **`cli/dev/` with
  its own entrypoint** (ratification decision: a structural boundary,
  not a lint concession — and not a lazy import, which would hide the
  edge from the static module graph). The normal CLI graph must not
  import testkit even transitively; the lint boundary is enforced in
  BOTH directions and negative-tested from the declared claim. The
  packaging split (separate bin/command) is part of the boundary.
- **ADR-009 (amends ADR-001 AND ADR-005):** `cli/` enters the module
  map with its import rules; ADR-005's categorical production→testkit
  ban stays, with the dev-entrypoint exception recorded as its own
  **"dev CLI boundary"** line. The same ADR records the tooling pick:
  stdlib `node:util` parseArgs, zero new dependencies (the coverage
  script's stdlib culture).
- **Output contract: JSON-first** (deterministic, agent-friendly);
  human formatting later or behind an explicit flag. **The exit-code
  contract is mandatory** and lands as a canonical matrix in the P4
  packet (see watchpoints).
- **P4 watchpoints (carried from ratification — packet obligations,
  binding at pre-approval):**
  1. an explicit **write-entrypoint matrix**: which existing
     bootstrap/kernel surface `create`/`start` call, when `submit` goes
     through `ingress.submit`, and the proof obligation that no CLI
     command handler EVER writes through `StorePort` directly;
  2. the **JSON/exit-code contract as one canonical matrix** (success /
     usage-config error / kernel negative outcome / integrity-internal
     error as distinct classes), not scattered prose.
- **Aligned at ch6-P4a pre-approval (two refine rounds):**
  - **Single `start` verb — there is no `create`.** The existing
    surface is the single-call `START_INSTANCE` bootstrap
    (`kernel.startInstance`: template load → binding → create RUNNING
    v1 → intent; the caller mints the id). A separate create/start op
    pair is model territory (the open creation-identity topic); the
    bullet above is corrected by this line.
  - **P4 split into P4a (normal CLI + ADR-009 + lint + template copy)
    and P4b (dev entrypoint verbs)** — the boundary is PROVEN in P4a
    (lint entry + executed probes both directions); the dev content
    and its own input/output/exit matrix land in P4b.
  - **Template source (MD-1 extended):** the normal CLI graph cannot
    import the testkit fixture, so `cli/templates.ts` carries a
    production COPY of local-pair-v0, drift-pinned by test against
    `fixtureTemplate()`; ch 8 retired both (ch8-P2, 2026-07-11: the
    copy deleted, the pin retargeted onto the
    canonical file).
  - **Channel + error contract:** stdout carries ONLY data documents
    (one JSON per verb; tail = NDJSON rows; protocol outcomes incl.
    stale/rejected are DATA); every failure is ONE canonical error
    document on stderr — `error.{class,name,message[,details]}`,
    keyset-tested — plus the class exit code (0 ok / 2 usage / 3
    not-found·kernel-negative / 1 internal).
  - **Config vs integrity split:** missing/empty `--db`/env = usage
    (2); store-OPEN failures (ADR-003 fail-closed, IO) = internal (1).
  - **Activation:** the ROOT bridge script `v3:cli` runs the shipped
    entrypoint via the root-side `tsx` (zero new deps; native Node
    type-stripping cannot resolve `.js`-specifier TS imports); proven
    by a last-mile smoke on the real entrypoint.
- **Aligned at ch6-P4b pre-approval (two refine rounds):**
  - **Dev runtime config:** `bundle` and `inject` inherit the P4a
    config contract in full; **`replay` is HERMETIC** — an ephemeral
    in-memory store per invocation, `--db` not an accepted flag (a
    user DB is neither read nor polluted).
  - **Replay mismatch is TYPE-discriminated:** the testkit harness
    gains `TraceMismatchError` (lane: outcome / state / transcript /
    checker + stepIndex/expected/actual); the dev CLI maps it to
    exit 1 with a `TraceMismatchError`-named error doc carrying those
    details — wiring errors keep their own names. No message-text
    matching anywhere.
  - **Inject = the actor-emit family's staging tool**, schema strict
    and validated in FULL before any submit: the DERIVED path (no
    opId) requires a present, canonicalizable payload AND
    expectedVersion (the emit-lib's content-addressed contract —
    ratification finding); the OVERRIDE path (explicit opId) may
    stage absent / null / non-admissible payloads, whose ingress
    answers are outcome DATA rows at exit 0.
  - Activation: the ROOT `v3:cli:dev` bridge; the dev entrypoint
    shares the dispatch shell + error contract via `cli/common.ts`
    (mechanically extracted; the P4a suite is the no-behavior-change
    guard).

### 6.6 Coverage and intake impact

- **Ledger slices: empty or near-empty** (the ch5-P5 precedent) — the
  floor and CLI are operability surfaces (PI-2), not model pseudocode.
  Units 5/158, invariants 8/116, traces 2/20 unchanged on ownership
  axes.
- The one export-adjacent unit
  (`complete-pseudocode/archive_or_export`) is LC4/purge territory, NOT
  the debug bundle — stated here so it cannot silently change owner.
- At close: the ch-6 map row + **PI-2 → realized**. No IC row reopens;
  `REV-C-PROJECTIONS-READONLY` and all-writes-through-normal-ingress
  bind in the P4 review rubric.

### 6.7 Packets and flow mode

The §5.8 first-of-a-kind rule stands. Every ch-6 packet introduces a new
artifact or contract class — **all four are pre-approve**; nothing is
marked flow. If a trivial extra slice emerges during build, it flows
only under the ch-5-style guard (test-only; any production change falls
back to pre-approve).

| Packet | Content | Mode |
|---|---|---|
| ch6-P1 | `getTimeline` cursor read: StorePort + sqlite + floor, null/`[]` contract | pre-approve (first-of-a-kind: cursor read surface) |
| ch6-P2 | `tailCommittedTimeline` seed + `TailWait` seam | pre-approve (first-of-a-kind: streaming shape + wait seam) |
| ch6-P3 | debug bundle + `RedactionPolicy` (redact default, dev pass-through) | pre-approve (first-of-a-kind: redaction boundary) |
| ch6-P4a | `cli/` normal entrypoint: read + command verbs, nonce-family consumer, config/exit/error matrices, ADR-009 + lint boundary, MD-1 template copy | pre-approve (first-of-a-kind: new module + boundary ADR; split at the P4 refine round) |
| ch6-P4b | `cli/dev/` entrypoint: inject / replay / pass-through bundle dump, own input/output/exit matrix | pre-approve (first-of-a-kind: dev input contracts) |

Order: P1 → P2 (the tail builds on the cursor read); P3 after P1 (the
bundle reads detail + timeline); P4 last (consumes floor, bundle,
emit-lib, and the dev-side testkit). One packet = packet file + code +
tests in ONE commit.

### 6.8 Deliverables and DoD

Shipped: this section; the StorePort/floor cursor read; the tail seed +
wait seam; the bundle + redaction policy pair; the `cli/` + `cli/dev/`
modules with ADR-009; the P4 contract matrices.

DoD: the four packets' contract tests green with claim-derived negatives
EXECUTED (chapter rules 1–2, verified at the boundary review); drift
suite green; coverage unchanged on ownership axes and validation green;
all v3 bridges green; **the FULL local CI gate (`pnpm ci:local`) green —
the first chapter under the README §6 rule (root suite included)**;
ADR-009 `accepted`, integrity check green; the ch-6 map row + PI-2
flipped to `realized`; process-log review held at the boundary.

---

## Chapter 7 — Kernel diagnostics & structured logging (ratified 2026-07-08)

Autonomy stage: **calibration** (README §5.5). The standing chapter rules
bind (README §4 step 2 carries all three now): enumerate a claim's
DIMENSIONS before deriving its tests; a logged instruction is not
execution; a canonical contract matrix is a declared claim — every lane
driven. Ratified after one refine round (four findings: ingress
time/diag deps; the birth-seam emission gap; the fail-open/fail-closed
boundary; tail cross-lane order+stop) plus two follow-up findings (the
free-text redaction boundary; the fail-open contract owner) — all six
folded below.

This chapter realizes PI-4 — the **named non-authoritative diagnostic
channel** (`_closed-v1-operability.md` Addendum 2 B1): a structured
kernel log plus rejection-audit stream, explicitly non-authoritative,
separate from the transcript, best-effort. Its legal basis is IC-A1's
own allowance ("if rejected attempts need audit, model that as audit,
not as the committed operation ledger"). Governing principle: **chapter
7 adds ZERO kernel semantics** — every Outcome is unchanged; the chapter
adds visibility. The ch-6 wide claim binds from the other side: no
diagnostic or non-committed data can EVER enter a committed read
surface — the channel is separate BY CONSTRUCTION, and this chapter
must prove the separation in BOTH directions. REV-C boundary restated:
the diag channel is telemetry — it never stands in for a missing
decision record (`REV-C-PROJECTIONS-READONLY`).

### 7.1 Scope and boundaries

**In:** the diagnostic event types + the `DiagnosticsSink` port with the
fail-open contract (§7.2), the canonical emission matrix over ingress
AND both kernel entry points (§7.2), the persistent diag store as a
separate SQLite file with its availability matrix and read surface
(§7.3), the two ch-6-named consumer seams resolved — the tail's
diagnostic layer and the bundle's `rejectedInputs` flip (§7.4), and the
CLI surface (§7.5).

**Out, stated (not silently absent):**

- **Runner/adapter-side emission** (stuck adapter, runner crash, crashed
  ingress process) → ch 9: the event TYPE is ready here; those emission
  points land with the runner. Named-absent in the emission matrix.
- **The observe seam's full form** — unchanged from §6.3 (live push,
  addressed streams, backpressure, typed terminal/gap markers).
- **Retention/rotation** — v1 stance: the diag stream is unbounded,
  stated. NO dev wipe verb (ratification decision): a new destructive
  dev affordance while retention is out of scope; the P2 fenced-wipe
  negative covers the schema lane.
- **Metrics/analytics layer** — the channel is not a metrics substrate.
- **Watchdog/retry** — L9 (unchanged).

### 7.2 The channel core (P1)

- **Two event faces:** emitters produce a `DiagnosticEventBody` (no
  timestamp, no ordinal); the read side is `DiagnosticEvent` (`at` +
  `ordinal`). **Timestamp authority: the SINK stamps `at` from its own
  injected `TimeSource`** — the CHK-C-TS-SOURCE precedent (the store
  stamps `committedAt`), one stamping authority, no clock in any
  emitter. Consequence (ratification finding): the ingress factory
  becomes `createIngress({ kernel, diag })` — a diag dep, NO time dep,
  no hidden wall-clock. The signature change is a mechanical ripple
  (CLI wiring + ingress/kernel call sites + tests) carried in the P1
  embedding gates.
- **Event fields:** `source` (`ingress` | `kernel`), `kind` enum:
  `rejected` | `stale` | `duplicate` | `cas_restart` |
  `internal_failure`; `instanceId` OPTIONAL (an `invalid_shape` input
  may carry no parseable id); `opId`/`actorId`/`type` when parseable;
  payload boundary (**aligned at ch7-P1 pre-approval** — the earlier
  "raw payload NEVER enters an event" was too strong): events never
  carry a structured/raw payload FIELD; `payloadDigest` is the ONLY
  payload derivative; `error.message` is UNTRUSTED diagnostic free
  text (a thrown error may embed payload/env/path fragments) confined
  to the diag channel's store and LOCAL read surfaces — the
  marker-scan negative binds the default-BUNDLE path (P3, §7.4), not
  the raw event; ingress-source events never carry a fingerprint (no
  digest authority in ingress — kept dep-minimal); kernel-source
  events carry `payloadDigest` DIGEST-POINT-based (aligned at ch7-P1
  pre-approval; distinct from the STATE phase — the never-committed
  vs persisted axis): present on every post-digest lane — absent
  payload included, the ch-5 digest is type-inclusive (ADR-008) —
  absent on pre-digest lanes and the digest-throw lane; the emit path
  never invokes `DigestSource` itself; `detail` on ingress rejections: an
  ENUMERATED token naming the failed admission gate (the token list is
  a declared claim — every token driven); `error` (`{name, message}`)
  on `internal_failure` — the free-text boundary is §7.4's.
- **`DiagnosticsSink` port:** `emit(body): void`. **The fail-open
  contract lives ON THE PORT** (ratification finding — one canonical
  owner): emit never THROWS; implementations swallow their OWN
  failures; an emit never changes an `Outcome` and never touches the
  main commit path. **Aligned at ch7-P1 pre-approval:** the contract
  does NOT claim non-blocking — the current SQLite path is a sync
  driver, so an inline write may briefly occupy the caller; a true
  non-blocking queue/async-drain contract would be a NEW contract
  class and is deliberately not promised (P2 may propose it as its own
  decision). Call sites call it BARE — a defensive wrapper would blur
  the owner. P1 proves the emission LANES with the testkit
  recording sink; the fail-open proof belongs to P2 (failing backing
  store). **`REV-DIAG-FAILOPEN`** is born as a standing review rule for
  custom sink implementations (the REV-BUNDLE-DEFAULT-POLICY pattern: a
  public seam's obligation is review-owned).
- **The canonical emission matrix** (a declared claim — every lane
  driven; the "only home of kernel-internal never-committed failures"
  claim closes THROUGH this matrix, both kernel entry points included):

| Lane | Emit |
|---|---|
| `handle` → committed | **no outcome-classified event** — separation, driven by a negative (prior `cas_restart` events from the same call are their own lane; total zero only on a restart-free call — aligned at ch7-P1 pre-approval) |
| `handle` → duplicate / stale / rejected (every reason, `op_id_collision` included) | emit (`kind` = the outcome class; rejected carries the exact rejection name) |
| `handle` → CAS restart | emit `cas_restart` (kernel-log; the first real internal visibility) |
| `handle` → any never-committed throw — port-call sublanes listed, each driven (aligned at ch7-P1 pre-approval: an awaited port call is a throw source with no visible `throw` site, and a collapsed "store rejection" is not an inventory): `store.loadInstance`, `definitions.load`, pinned-template integrity, `store.findOp`, `store.commitTransition` (txn did not land — never-committed) | catch → emit `internal_failure` (`error.name` + `error.message`) → **rethrow unchanged** |
| BOTH entry points → post-success `deriveDispatchIntent` throw (aligned at ch7-P1 pre-approval: the shared derive site — missing step definition / unbound role — is called post-commit by `handle` and post-create by `startInstance`; template well-formedness is ch-8 debt, so the lane is REACHABLE and driven with corrupted-template fakes; the transition/instance is already persisted when the call fails) | catch → emit `internal_failure` → **rethrow unchanged** |
| `handle` → digest throw | catch → emit `internal_failure` → **rethrow unchanged** — driven with a contract-violating throwing `DigestSource` fake (aligned at ch7-P1 pre-approval: unreachable via ingress — the ch-4 admission pin stands; the lane proves the WRAPPER, not reachability) |
| `startInstance` → started | **NO emit** — the birth-side separation negative (aligned at ch7-P1 pre-approval: the channel must not become a birth/audit substitute, for the same reason `handle` → committed carries a negative) |
| `startInstance` → any PRE/AT-create throw — code-path inventory, port boundaries included (aligned at ch7-P1 pre-approval; a list, not a count): `definitions.load` rejection (port failure ≠ the null lane), unknown template (`definitions.load` → null), binding-coverage failure, `store.createInstance` rejection (the colliding minted id integrity throw is its known in-repo instance); the post-create derive throw is the shared row above | catch → emit `internal_failure` → **rethrow unchanged** |
| ingress → `invalid_shape` | emit `rejected` with the enumerated `detail` token; attribution fields only when parseable |
| runner/adapter lanes | **named absent** → ch 9 |

- `KernelDeps.diag` is REQUIRED (explicit wiring; the testkit provides
  the recording sink). Wide claim, driven from both sides (aligned at
  ch7-P1 pre-approval — the earlier "a committed outcome emits
  nothing" over-claimed under CAS restarts): a committed/`Started`
  FINAL outcome emits no outcome-classified event — a call's total is
  zero only when no CAS restart occurred — and no diagnostic write can
  change an `Outcome`.

### 7.3 The diag store (P2)

- **Substrate: a SEPARATE SQLite file** — `<main-db>.diag.sqlite`, WAL
  mode (ADR-010). Rationale: the separation claim becomes PHYSICAL (a
  diag row cannot enter a committed surface by construction); no
  write-lock contention — SQLite is single-writer per database, and a
  best-effort layer must not steal locks from the authoritative commit
  path; failure isolation (a corrupt diag DB never touches the main
  path); the authoritative store's `SCHEMA_VERSION` "2" is untouched.
  Own schema marker + fenced wipe-and-recreate (the ADR-003 culture
  inherited).
- `ordinal` = AUTOINCREMENT; **no CAS, no uniqueness contract** — the
  stream is non-authoritative by type. The sink stamps `at` from its
  injected `TimeSource`.
- The store-backed sink swallows write failures per the port contract —
  proven with a **failing backing store**: start/submit outcomes are
  UNCHANGED while the diag DB is corrupt or unavailable (the
  availability matrix's write row; this is P2's half of the fail-open
  proof).
- **Read surface:** `getDiagnostics(instanceId, afterOrdinal)` +
  a global cursor read (unattributed rows are reachable ONLY there).
  Reads are **fail-LOUD**: an unavailable/corrupt diag DB is a typed
  error, never `[]` — known-empty = `[]` (the §6.2 duality transposed:
  unavailable ≠ known-empty). Cursor domain inherits §6.2 (nonnegative
  safe integer, `RangeError` before any SQL, `-0` rejected).
- **The diag availability matrix** (canonical — every lane driven):

| Surface | Diag DB unavailable / corrupt |
|---|---|
| normal start/submit (write path, emit) | Outcome UNCHANGED — the sink swallows by contract (stated + tested, not an accidental silent failure) |
| `getDiagnostics` / global read | typed error, LOUD — never an empty list |
| `tail --diag` | one stderr error doc, internal / exit 1 |
| `bundle` `rejectedInputs` | section = `unavailable(reason)` — the bundle itself SUCCEEDS (the committed half is authoritative; the stated-gap culture) |
| dev `diag` dump | one stderr error doc, internal / exit 1 |

### 7.4 Consumers (P3)

- **Tail diagnostic layer:** the ch-6 seed is EXTENDED, not rewritten
  (the seam was named for exactly this): rows become a discriminated
  union (committed row | diag event), two cursors. **No cross-lane
  total order claim** — each lane in its OWN cursor order (`seq`;
  `ordinal`), the interleave is polling-incidental, rows carry their
  own cursors; ordering across two databases by `(at, ordinal)` would
  be false precision. The committed lane's no-skip/no-duplicate
  guarantee is UNCHANGED, and the diag lane's presence cannot weaken
  it (wide claim, driven).
- **Stop semantics:** the `--diag` tail closes at the COMMITTED
  terminal — after terminal is observed, a final drain of BOTH lanes,
  then complete. Post-close diag events (e.g. a rejected submit against
  a DONE instance) are NOT streamed; the query surface
  (`getDiagnostics` / dump / bundle) is the recourse — driven by a test
  (a post-close rejected submit is visible in the dump). Rationale:
  completion anchors to the authoritative lifecycle's terminal-sink
  invariant; the diag lane has no terminal marker of its own (a stray
  submit can mint events forever); a default-eternal tail is the worse
  operator default.
- **Bundle flip:** `RejectedInputsSection` becomes three-state:
  `present(rows)` | `unavailable(reason)` — never a silent empty;
  `present` with zero rows = known-empty. Only ATTRIBUTED rows (the
  bundle's instance) enter; unattributed rows are the global read's
  territory. The bundle succeeds under diag unavailability (§7.3
  matrix).
- **The free-text boundary (ratification finding):** the FULL
  `error.message` lives in the diag store and its LOCAL read surfaces
  (`getDiagnostics`, dev dump, `tail --diag`) — the ch-6 split
  transposed (the store holds payloads; the bundle redacts). The BUNDLE
  projection carries ONLY enumerated or derived fields — `kind`,
  `source`, `at`, `ordinal`, the rejection name / `error.name`, the
  fingerprint, the enumerated ingress `detail`; **`error.message` does
  not appear at all** (not even as a redacted string), and
  `unavailable(reason)` is an enumerated constant, never the raw
  underlying error text. Wide claim: **no free text sourced from
  runtime errors or payloads appears ANYWHERE in the default bundle's
  full serialization** — the ch6-P3 marker-scan extends to the
  `internal_failure.message` path (a payload marker embedded in an
  error message) and the `unavailable` lane — with one enumerated
  exception: `error.name` rides as the projection's `errorName`
  scalar, verbatim up to a 64-character (UTF-16 code-unit) prefix
  cap, an untrusted-in-principle identifier-by-convention (aligned at
  ch7-P3 pre-approval; the marker-scan negative binds every OTHER
  position of the serialization, and the hostile-name lane pins the
  boundary and the cap).

### 7.5 The CLI surface (P4)

- Operator `tail --diag`: NDJSON rows gain a lane discriminator; the
  stdout=data / one-stderr-error-doc rule stands; a diag-lane failure
  is internal / exit 1 (§7.3 matrix).
- `bundle`: carries the three-state section — no new flag; the default
  redaction policy and REV-BUNDLE-DEFAULT-POLICY unchanged.
- Dev CLI: **`diag` verb** — the global cursor dump (the only surface
  for unattributed rows). NO wipe verb (§7.1).
- Config: the diag DB path DERIVES from the resolved main DB path
  (`<db>.diag.sqlite`) — no separate flag; the P4a config matrix is
  untouched. `replay` stays hermetic with NO diag surface.
- Exit/parse matrices per the ch-6 culture — every lane driven.

### 7.6 Coverage and intake impact

- **Ledger slices: EMPTY** (the ch-6 precedent) — the diagnostic
  channel is memo-born operability (PI-4 / Addendum 2 B1), not model
  pseudocode; the ledger carries no diagnostic units (verified at
  ratification: zero hits). Units 5/158, invariants 8/116, traces 2/20
  unchanged on ownership axes.
- At close: the ch-7 map row + **PI-4 → realized**. The two ch-6-named
  seams (tail rejection visibility; bundle `rejectedInputs`) RESOLVE
  here; the observe seam and the runner lanes stay named-deferred.

### 7.7 Packets and flow mode

All four packets are pre-approve (each introduces a first-of-a-kind
class). Process note: **ch7-P1 is the first live run of the
`CreateTaskPacket` skill** (README §8); the skill-run verdict is part of
the boundary review.

| Packet | Content | Mode |
|---|---|---|
| ch7-P1 | channel core: event types + `DiagnosticsSink` (fail-open on the port) + the emission matrix over ingress/kernel + testkit recording sink + `createIngress({kernel, diag})` ripple | pre-approve (first-of-a-kind: the diagnostic seam; first skill run) |
| ch7-P2 | diag store: separate-file SQLite sink + fenced wipe + availability matrix + read surface + ADR-010 | pre-approve (first-of-a-kind: second store substrate; the fail-open proof) |
| ch7-P3 | consumers: tail diag layer (order + stop semantics) + bundle three-state flip + the free-text boundary | pre-approve (first-of-a-kind: cross-lane streaming; export-boundary extension); predicted: projection (sources: the P1/P2 packet contracts + §7.4) |
| ch7-P4 | CLI: `tail --diag`, bundle section pass-through, dev `diag` dump, derived diag-DB config | pre-approve (matrix extensions on both entrypoints); predicted: projection (the six-precedent CLI class + §7.5) |

Prediction provenance: the P3/P4 predicted classes were PRE-REGISTERED
at the Phase-1 flip (2026-07-09), BEFORE P3 authoring started — the
§1.3 convention's first data points (ch7 itself was ratified pre-v2).

Order: P1 → P2 (the store implements the port) → P3 (consumers read the
store) → P4 (the CLI activates the consumers). One packet = packet file
+ code + tests in ONE commit.

### 7.8 Deliverables and DoD

Shipped: this section; the event types + sink port + emission matrix;
the separate-file diag store + availability matrix + read surface; the
tail diag layer + the bundle flip with the free-text boundary; the CLI
surface; ADR-010; `REV-DIAG-FAILOPEN`.

DoD: the four packets' contract tests green with claim-derived
negatives EXECUTED; the emission AND availability matrices fully
driven; drift suite green; coverage unchanged on ownership axes and
validation green; all v3 bridges + the FULL `pnpm ci:local` gate green;
ADR-010 `accepted`, integrity check green; the ch-7 map row + PI-4
flipped to `realized`; process-log review held at the boundary,
including the CreateTaskPacket first-run verdict.

---

## Chapter 8 — Template file-format spec (ratified 2026-07-10)

(autonomy stage: **measurement** — the first chapter at measurement:
a flag-free panel approve proceeds to build AUTONOMOUSLY with the
post-hoc boundary audit; flags, STOPs, and first-of-a-kind classes
still route to the human, per README §5.5 and the ch7 boundary
package.)

Realizes **PI-5** (the canonical authoring format) and **migrates
MD-1** (§1.3). The chapter's central surface — the file format
itself — is memo-born (the model deliberately states no file syntax),
so this is the **first chapter with a contract-draft phase**: the
DraftContract round runs before any packet (README §4), and its
ratification act is the human's.

### 8.1 Scope and boundaries

**In scope:**

1. **The canonical authoring file format** for the template surface
   the implementation has REALIZED so far — the ch-4 domain shape,
   1:1: `ref {id, version}`, `start`, `steps` (role, instruction,
   transitions), `terminal`, `roles` (defaultActor), and the
   `agentConfig` raw pass-through block (uninterpreted until L0c).
   The format maps onto the existing `WorkflowTemplate`; it does not
   extend it.
2. **The format validator** — the fail-at-create family's concrete
   form: file bytes → a valid `WorkflowTemplate` OR a typed,
   path-addressed error list (§8.4).
3. **A file-backed `DefinitionStore`** — pinned `{id, version}` load
   from canonical files (§8.5).
4. **The MD-1 migration** — BOTH hardcoded copies (the testkit
   `fixtureTemplate()` and the CLI `builtinTemplate()` production
   copy) move onto the canonical format; the drift-pin is retargeted;
   MD-1 is retired (§8.6).
5. **CLI activation** — the operator start path accepts a template
   file and the dev entrypoint gains a validate surface; exact verbs
   and flags are draft C-rows (§8.8).

**Out of scope (deliberate, with corrected framing):**

- **The gate/policy template surface.** L2/L2a/L2b are Block A MODEL
  surface (all their units sit in the §1.4 inventory) — they are NOT
  deferred out of Block A; they enter the FORMAT together with the
  chapter that realizes gate semantics, per the ratified evolution
  stance (§8.2). This ratification records the plan-structural
  consequence: **an L2 gate-core chapter is expected to enter the map
  as an appended chapter BEFORE chapter 9** (the §1.3 map-extension
  mechanism) — ch-9's process-gate runner needs its call site
  (`GateRegistration` + the `HANDLE` gate hook — GateEvaluator until
  the ch11 model fix), and the format gains
  gate declarations in that chapter, with its own semantics.
- **Latest-resolution** (load by id without a version). Re-homed to
  the future L0f chapter (§8.5) — the D1 decision of this
  ratification.
- **Format versioning.** None, by design — §8.2 is the stance.
- The L0f slot/mode resolution cascade; template marketplace /
  discovery beyond the local convention; cross-version migration
  tooling.

### 8.2 The evolution stance — the format grows with realized capabilities

Ratified principle (the user's, 2026-07-10): **the config format
evolves together with the implemented capabilities — the format
always covers exactly what the implementation supports, and a
capability and its format surface land in the same chapter.** No
speculative keys, ever.

The operative rules (sharpened against a survey of omnigent's config
evolution practice, 2026-07-10; the survey's LEARN/AVOID detail lands
in the chapter draft's rationale — the rules below are the binding
form):

1. **No format-version field, no compat machinery during Block A.**
   The format and its single in-repo consumer move together; there is
   NO cross-version compatibility guarantee while development is
   active — the PI-7 storage stance ("wipe-and-recreate, stated
   explicitly") mirrored onto the authoring surface. Re-authoring a
   template file after a format change is acceptable and cheap at
   this population size. A mandatory-constant version field is the
   named anti-pattern (it decays into dead weight); if a format-family
   discriminator is ever needed, it is an honest `kind:` key.
2. **Evolution mechanics: additive optional keys with
   behavior-preserving defaults.** An old file keeps its exact
   meaning under a newer parser; each new key's default is chosen so
   absence = the pre-key behavior. DEVIATION CLAUSE (added at the
   ch11-gate-format reopen re-ratification, 2026-07-12): a
   non-behavior-preserving default is legal ONLY as the ratifier's
   explicit, per-key ratification act, recorded in the realizing
   chapter's contract row (the deciding row states the deviation and
   its rationale); never by inference, never silently. First
   exercised: the `round` key — absent = NO advancing transitions
   (ch11-gate-format C38; the superseded pre-key behavior was the
   ch-4 provisional heuristic).
3. **Removed or renamed keys fail LOUD with migration text** in the
   error message ("key X was removed/renamed to Y — edit the file"),
   never silently ignored. If an alias is ever introduced, it
   canonicalizes at parse time so downstream code reads one shape.
4. **Unknown key = fail-closed, path-addressed rejection.** The
   silent-typo drop is the named failure mode this rule exists
   against. Openness is not needed for evolution: the parser learns a
   new key in the capability's own commit; an old file never carries
   unknown keys, and a newer-format file against an older in-repo
   parser cannot occur.
5. **Existing defaults are stable** (added at the ch11 model-fix
   ratification, 2026-07-11 — THE single authority for this rule;
   surface contracts inherit it by name, never restate it). Defaults
   MATERIALIZE into the effective config at definition admission, so
   changing an EXISTING key's absent-meaning is a BREAKING change: it
   takes the removed/renamed route (rule 3 — fail loud with migration
   text), never a silent redefinition.

### 8.3 The authoring format: YAML 1.2

The syntax family is **YAML with YAML 1.2 semantics mandatory** (D2,
ratified 2026-07-10). The deciding requirement: **step instruction
prose is multiline and must be comfortably authorable INLINE** (block
scalars) — a v1-scale workflow already carries many prompt fragments,
and fragmenting them into side files makes editing materially worse;
the separate-file form was rejected as the primary authoring shape (a
file-ref variant may arrive later as an additive option).

Guardrails:

- **YAML 1.2 core-schema semantics are part of the contract**: only
  `true`/`false` are booleans — the YAML-1.1 `on`/`off`/`yes`/`no`
  coercion trap is the named hazard (omnigent had to patch its loader
  to escape it; we pick a 1.2 parser instead). The parser choice is
  the chapter's dependency decision.
- **This is the v3 package's FIRST runtime dependency**, amending
  ADR-002's stdlib-only stance — the dependency ADR is authored in
  the draft phase and accepted with the draft ratification (the
  draft-ratified ADR lane, README §4 step 5).
- The exact field grammar, id/name rules, and the canonical example
  are draft C-rows; `agentConfig` stays a raw pass-through block
  (uninterpreted map, the omnigent `params:` precedent).

### 8.4 The validator (fail-at-create)

- **Shape:** file bytes → `WorkflowTemplate` OR an **accumulated**
  error list of `{path, message}` entries (dotted paths, e.g.
  `steps.review.transitions.PASS`) surfaced in ONE result — never
  first-error-only, never a throw per finding.
- **The validation rule table is a canonical contract matrix** (the
  ch-6 rule binds: every declared lane is DRIVEN by a test, never
  merely documented).
- **Channel boundary:** template well-formedness failures are
  LOAD-side failures, not envelope rejections — the `start.ts`
  precedent stands (a definition-load failure at START is a
  start-side failure with NO invented rejection name). Whether any
  validator lane maps onto an existing 85-registry name is a draft
  C-row; a needed-but-missing model name is the model↔code divergence
  stop (README §6), never a code-invented name.
- The well-formedness floor derives from the realized domain type's
  stated rules (every transition target ∈ steps ∪ terminal; `start` ∈
  steps; terminal ids disjoint from step ids) — the exact lane list
  is the draft's matrix.

### 8.5 The file-backed DefinitionStore (pinned-only)

Implements the existing `ports/definition.ts` contract 1:1 —
**pinned `{id, version}` load only** (D1, ratified 2026-07-10).
Discovery and file-naming conventions (how a file's identity relates
to its `ref`) are draft C-rows; the null-at-start vs loud-validator
split follows §8.4's channel boundary.

**Latest-resolution re-home (recorded here, the declining chapter):**
the ch-4 forward pointer ("latest-resolution is L0f / chapter-8
territory", `ports/definition.ts`) is resolved AGAINST ch-8 — "which
version is newest" is a semantics package belonging to the L0f
resolution cascade (whose own invariant, template-pinned-at-
resolution, already fixes that any resolution ends in a pinned
snapshot). The port comment is corrected in this ratification commit;
the future L0f chapter records the receipt when ratified. Adding
latest later is purely additive; nothing in ch-8 blocks it.

### 8.6 The MD-1 migration (P2)

The canonical file becomes the SINGLE source of the `local-pair-v0`
template; both hardcoded copies are re-expressed against it and the
duplication ends:

- the **testkit** `fixtureTemplate()` and the **CLI**
  `builtinTemplate()` production copy both derive from (or are
  equality-pinned to) the canonical bytes;
- the ADR-005 import stance is untouched: the testkit itself does NOT
  import `definition/` — the equality with the canonical file is
  asserted from TESTS (tests may import anything), or the kit fixture
  is retired in favor of test-layer file loading; the exact shape is
  packet work;
- **MD-1 is retired at the chapter DoD with the full old-status
  sweep**: the §1.3 MD-1 block, §4.8, the `templateFixture.ts` and
  `templates.ts` comments — every surface stating the debt flips in
  the retiring commit (the status-flip sweep rule).

### 8.7 Module home: `src/definition/` (ADR-011)

The authored-definition surface — format knowledge, the validator,
and the file-backed `DefinitionStore` — lives in a NEW top-level v3
module, `src/definition/` (D3, ratified 2026-07-10):

- **Cohesion:** everything about authored definitions in one module;
  future format growth (the gate surface, §8.1) touches one home.
- **Mirrors the model:** the definition aggregate is a SEPARATE store
  from the run store ("separate store; pinned immutable version") —
  the code map now shows the same cut. `domain/` stays the pure
  ledger mirror (the file format is memo-born and has no model
  units); `store/` keeps meaning "the run-state SQLite substrate".
- **Import stance:** `definition/` imports `domain/` (types),
  `ports/`, node builtins, and the YAML dependency; kernel, floor,
  and the other production modules never import it — composition
  roots (CLI runtime) wire it. The production testkit/drift lint bans
  (static + dynamic forms) extend to `src/definition/**`; the lint
  extension lands in P1 with executed probes.
- **ADR-011** records this and amends ADR-001's module map; born at
  THIS ratification, it is accepted by the ratification act itself
  (the chapter-ratification-born ADR lane).

### 8.8 The draft phase — the first live DraftContract run

Before any packet: `contracts/ch8-template-format-contract.md`
(surface: `template-format`). Indicative C-row set — the draft
decides, this list only scopes it: the field grammar + canonical
example; id/name rules; the discovery/file-naming convention; the
unknown-key and removed-key error contracts (§8.2 rules 3–4 made
concrete); the validator lane matrix + its channel mapping (§8.4);
the CLI verbs (`start --template`, dev `validate`); the dependency
pick + its ADR (amends ADR-002); the canonical `local-pair-v0` file's
in-repo home. The draft's rationale section carries the omnigent
survey's LEARN/AVOID detail as provenance. Ratification is
permanently human; packets anchor to ratified rows as
`contract:ch8-template-format#Cn`. The plan's table below references
the draft file; its `ratified <date>` completion is recorded when the
draft phase closes (a plan-alignment edit riding the draft's own
commit).

### 8.9 Packets and flow mode

Process note: the FIRST chapter at measurement stage and the first
draft exercise — both verdicts are boundary-review material. The
draft phase precedes P1 (README §4).

| Packet | Content | Mode |
|---|---|---|
| ch8-P1 | the `definition/` module: YAML 1.2 parse + the fail-at-create validator (path-accumulated errors, full lane matrix) + the file-backed pinned `DefinitionStore` + the lint-boundary extension + the dependency landing | pre-approve (first-of-a-kind: file-format parser/validator class; first draft-anchored packet; the first runtime dependency); predicted: invention (memo-born; draft: `contracts/ch8-template-format-contract.md`, ratified 2026-07-10) |
| ch8-P2 | the MD-1 migration: both template copies onto the canonical file, drift-pin retarget, CLI activation (`start --template` + dev `validate` per the draft), MD-1 retired with the old-status sweep; PLUS the repo's first FULL-LIFECYCLE JOURNEY SMOKE through the shipped CLI process — template file → `start` → submitted events → terminal → floor reads (`tail`/`timeline`) verified end-to-end (user-ratified 2026-07-11: the activation packet carries the e2e journey — before P2 the "end" of end-to-end, an operator-authored input artifact, does not exist) | flag-free approve → autonomous build (measurement; the §5.5 fallbacks stand — any flag, STOP, or first-of-a-kind reclassification at authoring routes to the human); predicted: projection (source: the ratified draft rows + the P1 packet contract + the ch4/ch6 template copies) |

Order: draft → P1 → P2. One packet = packet file + code + tests in
ONE commit.

### 8.10 Deliverables and DoD

Shipped: this section; the ratified-then-realized
`ch8-template-format` contract-draft; the `src/definition/` module
(format + validator + file store); the CLI activation; the canonical
`local-pair-v0` file as single source; ADR-011 (this act) + the
draft-lane dependency ADR; the lint-boundary extension.

DoD: the packets' contract tests green with claim-derived negatives
EXECUTED; the validator matrix fully driven; drift suite green;
coverage unchanged on ownership axes (empty ledger slices BY DESIGN —
the format is memo-born operability; any unit discovered at authoring
routes through the D1 detector) and validation green; all v3 bridges
+ the FULL `pnpm ci:local` gate green; ADR-011 `accepted` (this act),
the dependency ADR `accepted` with the draft ratification, integrity
check green; the draft flipped `realized`-in-place with its
`realized_map`; the ch-8 map row + PI-5 flipped to `realized`; MD-1
retired with the full old-status sweep; process-log review held at
the boundary, including the first-DraftContract verdict and the first
measurement-stage data points.

## Chapter 11 — Gate core: L1 authority + L2 pipeline + L2a process contract (ratified 2026-07-11)

(autonomy stage: **measurement** — flag-free panel approves proceed
to build autonomously THROUGH the two transitional external-arm gates
(README §5.5, arm-pin.md); flags, STOPs, the draft ratification, and
any first-of-a-kind reclassification route to the human.)

The **first live use of the §1.3 map-extension mechanism**, realizing
the §8.1 ratified expectation: an appended chapter BEFORE chapter 9,
because the ch-9 process-gate runner needs its call site
(`GateRegistration` + the `HANDLE` gate hook + the classification
contract) and the ch-3 `ports/gate.ts` placeholder seam is
deliberately not the ledger shape. Numbered 11 (arrival order),
ordered before ch 9 (build order) — the convention minted in §1.3.
No PI item: this is model-ladder surface, not operability spine.

**Why L1 rides in (the survey finding of this ratification):** the
kernel stands at L0b + digest; the gate rung sits ABOVE the L1
authority rungs on the model's admission ladder, and the 08-l2
chapter trace asserts them explicitly ("role ✓ · capability ✓ → gate
pipeline"). A gates-only chapter could not play its own golden trace.
The L1 slice is small (6 units / 3 rejections / 3 invariants / 1
trace) — a standalone chapter would be ceremony.

### 11.1 Scope and boundaries

**In scope:**

1. **The L1 authority slice.** The envelope gains `expected_role`
   (the warrant's second context-authority field); `admit_loaded`
   consolidates the admission ladder (idempotency → lifecycle/state →
   staleness → authority) with the state rung LIVE — an actor emits
   only in actor-routable running execution, otherwise `not_active`
   (the name is l0d-born in the 54-name registry; driving it here is the
   scoped-extension rule, no l0d unit ownership); `capability()`
   default-derived; rejections `missing_role` / `role_not_authorized`
   / `not_authorized`.
2. **The L2 gate core.** `GateBinding`/`GatePipeline` on the template
   aggregate; the `GateRegistration` descriptor (declarative | packaged,
   inline-only; `validate_and_normalize_config` + the
   `requires_runtime_context` flag; `evaluate` on the inline
   variant — the ratified model fix); a STATIC gateRegistry/catalog
   (dynamic-module-loading stays
   Absent); the gate rung in `HANDLE` (ordered, first-block-wins;
   block returns BEFORE the commit — version, step, and **round
   untouched**); `gate_projection` as the policy-facing read model;
   **the ch-4 provisional `round` ALIGNED to its L2 contract** — the
   field, column, and loop-back increment already exist (the
   `instance.ts` comment's own forward pointer: "Formal round
   machinery (limits, gate rounds) is L2"); this chapter declares the
   `advances_round` predicate against transition semantics (the ch-4
   `target === template.start` heuristic assessed at projection and
   RETIRED — replaced by admission-normalized per-transition flags
   with DECLARED-ONLY advancement (an absent declaration ⇒ none),
   draft C38/C39; the model's per-transition-override half of the
   loader expansion stays UNREALIZED in Block A — an explicit
   partial-realization disposition, draft C41; aligned at the
   ch11-gate-format reopen re-ratification, 2026-07-12), adds the
   `round-is-canonical-reconstructable` checker,
   and makes `gate_projection` its first policy consumer; the
   transcript gains `gate_decisions` provenance (retained allow/warn
   verdicts + evidence refs) — THAT column is the chapter's first
   schema bump, under the ADR-003 fenced-wipe stance (the second is
   P3b's nullable instance `runtime_context` column, riding the same
   fence — aligned at ch11-p3b pre-approval); the two Block A
   evaluators: `declarative.threshold` and the packaged
   `pairflow.previous_reviewer_verdict`.
3. **The L2a process-gate contract, kernel side.** The model's own
   cut governs the ch-11/ch-9 boundary: *"the kernel owns the
   contract, the runner owns the spawn."* Here: `validate_gate_config`
   as the `external.process` REGISTRATION's validate-and-normalize
   body, run by ADMISSION (`admit_definition`) at definition load —
   the ratified model fix (453d3be9); the `ProcessGateRunner` PORT + a testkit fake runner —
   ch 3 shipped the GENERIC deterministic seam
   (`ScriptedGateRunner`/`ScriptedProcessRunner`, pass|fail verdicts);
   the ledger-shaped six-outcome fixture drive
   (allow/warn/block/timeout/runner_error/malformed) lands HERE, in
   the P3 slot (split at the ch11-P3 findings round: the kit piece
   at P3a, the end-to-end drive at P3b — aligned at ch11-p3a
   pre-approval); `run_process_gate`; `classify_process_result`;
   `runner_outcome` (only `block_transition` realized;
   `fail_instance` → `gate_config_not_supported`);
   `GateInvocation`/`ProcessResult` values; the
   `runtime_context_required_for_process_gate` rejection (the HANDLE
   `ready(∅)` runtime backstop — the config lanes are DEFINITION-ISSUE
   codes at admission since the model fix:
   `invalid_process_gate_config` / `gate_config_not_supported`).
4. **A minimal runtime-context REPRESENTATION** — the template's
   declaration key + the instance field + a testkit-injected ready
   ref, because `admit_definition`'s cross-rule (the registration's
   `requires_runtime_context` flag) and the `HANDLE` backstop read
   them. Provisioning (L0e) stays out; this is the chapter's
   most-guarded boundary.
5. **The format's gate-declaration surface** (§8.2: a capability and
   its format surface land in the same chapter): gate declarations in
   the YAML template, the process-config keys, the `runtime_context`
   declaration key, the `round` declaration key (added at the
   2026-07-12 gate-format reopen — draft C37/C38/C40), the validator
   lanes, the CLI validate extension.
   The ch-8 contract's C7 forward declaration anticipates exactly
   this ("the fixed keysets grow ONLY by ADDITIVE OPTIONAL keys
   ratified in the realizing chapter — first expected: the L2 gate
   core's key"). A REAL C10 tension exists and the draft must
   confront it explicitly: C10 bans `.` in its id classes (ids are
   C21 path segments), while the model's canonical evaluator names
   are dotted (`external.process`, `declarative.threshold`,
   `pairflow.previous_reviewer_verdict`); evaluator ids enter as
   VALUES (never path segments), so the draft decides the new
   class's grammar and STATES its relation to C10 — and if the
   resolution touches C10's ratified rows, that is a human
   re-ratification act, never an inferred relaxation.
   The ch-3 `ports/gate.ts` placeholder
   (`GateRunner`/`GateSpec`/`GateVerdict`) is RECONCILED to the
   ledger shapes — a named replacement, never a parallel seam.

**Out of scope (deliberate):**

- **L2b context blocks** — their own appended chapter (the §1.3 third
  named candidate). §8.2's no-speculative-keys rule decides it: the
  `context_block_refs` format key enters WITH the render semantics,
  additively. The ch-9 call site does not need it.
- **Deferred execution** (`gate_pending` + `GATE_RESULT`) — a later
  lifecycle slice; fail-closed behind `gate_execution_not_supported`.
- **The `route` verdict** — routing slice / L3 Absent; the verdict
  enum is allow | warn | block.
- **`fail_instance` disposition, dynamic module loading,
  gate-private mutable state, findings vocabulary** — declared
  Absents, unchanged.
- **The real spawn** — worktree cwd, real evidence in the world,
  attach channel: ch 9. **Honest boundary:** this chapter clears
  ch-9's gate call-site prerequisite ONLY; ch 9 still faces its own
  map-extension question (the worktree provider is L0e surface) at
  its own ratification.

### 11.2 Coverage and intake impact

Unit ownership: **20 ids** (6 l1 + 6 l2 + 8 l2a — `admit_definition`
joined l2 at the model fix), several as
reprint/`alias/inherited` dispositions (the CREATE_INSTANCE reprints,
GateRegistration ×2, the HANDLE inheritance chain); partial-realization
dispositions on `l1-pseudocode/dispatch_intent` and
`l1-pseudocode/RECEIVE` (their L0c/L0e-inherited branches stay
unrealized — a projection-time disposition call, not a scope change);
the round surface's per-transition-override half is the same class —
C41's partial-realization disposition (the gate-format draft, added
at the 2026-07-12 reopen).
Rejections: **7 behavioral** (3 l1 + 3 l2 + 1 l2a — the config lanes are
definition-issue codes at admission since the model fix) + `not_active`
driven as a scoped extension + the admission issue-codes driven on the
definition channel. Invariants: **15**, dispositions already fixed by
the ch-5 map (8 `test` / 4 `type/schema` / 2 `checker` / 1 `review`);
the two checkers — `l2/round-is-canonical-reconstructable` (P2c — aligned at ch11-p2a pre-approval) and
`l2a/evidence-on-every-run` (P3b — the P3 split, aligned at
ch11-p3a pre-approval) — land as storeCheckers extensions
with named packet owners. Chapter traces:
**3 golden traces** (the l1, l2, and l2a section traces). The l2b
slice (4 units / 1 rejection / 6 invariants / 1 trace) stays unowned
— the coverage lock closes at Block A end, not per chapter.

### 11.3 The draft phase

Before ANY packet (README §4: a referenced draft not yet
ratified-or-later means the DraftContract round runs FIRST):
`contracts/ch11-gate-format-contract.md` (surface: `gate-format`).
Indicative C-row set — the draft decides, this list
only scopes it: the gate-declaration grammar (step/transition
binding, `uses`, `config`); the evaluator-id grammar as a NEW value
class + its explicitly stated relation to ch-8 C10's dot-ban (§11.1
item 5 — any touch of C10's ratified rows is a human
re-ratification act); the process-config keys (the ADMISSION lane matrix replaces the two-seam F/K split — single-authority admission per the ratified model fix, the two HANDLE backstops as standalone rows; keys: `command`,
`timeout_ms`, `output.mode`, `on_exit` buckets, `on_runner_error` /
`on_timeout`) + the validator lane matrix and its channel mapping;
the `runtime_context` declaration key; the `GateDecision` JSON schema
for `gate_decision_json` (a machine contract); the Block A registry
composition + per-evaluator config grammar; the evidence-persistence
shape (`log_ref` on the transcript entry); the module-home ADR
(amends ADR-001; the ADR-011 pattern) and the `ports/gate.ts`
reconciliation; the round-declaration surface — the `round` key, its
absent-key default, the normalization, the override deferral (added
at the 2026-07-12 reopen: rows C37–C41). Ratification is permanently
human; packets anchor as
`contract:ch11-gate-format#Cn`; **ratified 2026-07-12** (the first
ratification under the post-model-fix single-admission form);
reopened and re-ratified 2026-07-12 (the round-declaration rows
C37–C41 — the P2c draft-routing decision point resolved:
reopen/extend; §8.2 rule 2's deviation clause established at the
same act).

### 11.4 Packets and flow mode

Draft reference (§1.3 convention): `contracts/ch11-gate-format-contract.md`,
ratified 2026-07-12; reopened and re-ratified 2026-07-12 (the
round-declaration rows C37–C41).
Process note: the draft round runs FIRST, before any packet (README
§4). P1's CONTENT is a pure ledger projection with no format surface;
P2a anchors to the draft for the module home + the `ports/gate.ts`
reconciliation (aligned at ch11-p2a pre-approval — the anchor moved
with the split); P2c anchors to the re-ratified round rows (C38/C39 +
C40's value-level share); the P3 parts and P4 anchor to ratified
draft rows. P2 was the
declared sizing split candidate (template §2 step 0); the split
EXECUTED at ch11-p2a authoring (autonomous in-chapter split, hard
stops 1+2 tripped on the bundled row — sizing, not scope; the
P2a/P2b/P2c rows below are the repartition, coverage union
preserved). The P3 split EXECUTED at the ch11-P3 findings round
(2026-07-16): the panel-approved single-packet form carried a
hard-stop-2 closure proof the RATIFIER rejected against the visible
foundation→activation seam — the P3a/P3b rows are the repartition,
coverage union preserved (aligned at ch11-p3a pre-approval; the
ratified draft's "ch11-P3" references predate the split and denote
the P3 slot).

| Packet | Content | Mode |
|---|---|---|
| ch11-P0 | the model-registry sync — the ratified one-off bridge's single instance (`ch11-model-sync-delta.md` @ de33d245): the three mechanical mirrors re-derived from the ratified ledger (453d3be9) + the drift locks re-pinned as two-way exact-set (rejectionNames count sites 85→54); mutation boundary = the evidence file's CLOSED list | pre-approve — HUMAN approve MANDATORY (the bridge demands it; first-of-a-kind: model-sync class; at approve the three named drift lanes are red by EXACTLY the enumerated delta AND the `check_coverage --fold-time` gate by EXACTLY the Lane-4 addendum's 9 items, everything else green); predicted: projection (source: the ratified ledger @ 453d3be9 + the evidence file) |
| ch11-P1 | the L1 authority slice: `expected_role` on the envelope (warrant), `admit_loaded` consolidation with the live state rung, `capability()`, the three L1 rejections + `not_active` driven, the l1 golden trace, the dev `inject` schema extension + the operator `submit` role flag (aligned at ch11-p1 pre-approval — the mandatory role's transport closure on the shipped write surface) | flag-free approve → autonomous build (measurement; the §5.5 fallbacks stand); predicted: projection (source: l1-pseudocode + ledger §2/§3) |
| ch11-P2a | the gate admission foundation (the P2 row's foundation share; split executed at ch11-p2a authoring): `ports/gate.ts` reconciled to the ledger shapes (placeholder + scripted players retired; the runner half joins at P3), the `src/gates/` module (ADR-013) with the static registry + the two inline evaluator registrations, `admit_definition` realized as the single-authority admission (effective configs, issue accumulation, `AdmittedTemplate` as the definition store's only output, testkit-through-admission), the domain gate values | flag-free approve → autonomous build (measurement; the §5.5 fallbacks stand); predicted: projection (inherited from the P2 row: l2-pseudocode + ledger §2/§3/§4 + [module home, `ports/gate.ts` reconciliation] draft rows) |
| ch11-P2b | the gate rung activation (the P2 row's activation share): the HANDLE pipeline rung (ordered, first-block-wins; the three L2 rejections behavioral; the C35 registry backstop), `gate_projection` derived, the `gate_decisions` transcript column (THE fenced schema bump) + the C27 read surface, the two evaluators driven end-to-end, the l2 golden trace (round machinery untouched — the rung reads `instance.round` as the ch-4 kernel maintains it) | flag-free approve → autonomous build (inherited); predicted: projection (inherited) |
| ch11-P2c | the round alignment (the P2 row's alignment share): the `advances_round` predicate declared against transition semantics — the ch-4 `target === template.start` heuristic assessed at projection and RETIRED (declared-only advancement: an absent declaration means NO advancing transitions — C38's ratifier-decided default under §8.2 rule 2's deviation clause, its first exercise) — realized as admission-normalized per-transition flags (the `admit_definition` P2a-built normalization touch included) + C40's value-level admission lanes (empty list, membership incl. the terminal exclusion, duplicates — every channel); the round-advancing trace set updates WRAPPER-ONLY: `l2Trace`'s direct-constructed template declares in-packet; `l0aTrace` (incl. its negative variant), `l0bTrace`, and `twoWorker` run through a LOCAL direct round-declaration wrapper — the round-2 golden expectations are NEVER temporarily rewritten, and the shared `fixtureTemplate()` + the shipped YAML stay declaration-absent and deep-equal until P4 (the ch8-P2 equality pin); the `round-is-canonical-reconstructable` storeChecker; `gate_projection`'s round consumption pinned; the model's per-transition-override half stays unrealized per C41's disposition (the round-format decision point RESOLVED at the 2026-07-12 reopen — reopen/extend, re-ratified; the STOP clause retired; anchors: `contract:ch11-gate-format#C38`/`#C39`/`#C40`; aligned at the ch11-gate-format reopen re-ratification) | flag-free approve → autonomous build (inherited); predicted: projection (inherited) |
| ch11-P3a | the process-admission foundation (the P3 slot's foundation share; split executed at the ch11-P3 findings round, 2026-07-16 — the ratifier rejected the single-packet closure proof against the visible foundation→activation seam): `validate_gate_config` as the `external.process` registration's validator body (the C13–C17 lane matrix, issue codes on the definition channel), the registration joins the static registry (C8's chapter-end three-member composition), the `ProcessGateRunner`/`ProcessResult`/evidence-record PORT shapes (C34/C26 contract + the ledger-shaped six-outcome scripted testkit runner — kit piece only, the end-to-end drive is P3b's), the template-side `runtimeContext` declaration key (C18 domain grain) + the C19 admission cross-rule; the kernel is byte-untouched — a process gate still rejects at run (the P2b `gate_execution_not_supported` lane stands until P3b) | flag-free approve → autonomous build (inherited; the §5.5 fallbacks stand — exercised at this packet: the F1/F2 new-decision flags route the approve to the human, STOP `4:flagged-approve`); predicted: projection (inherited from the P3 row: draft rows + the l2a units) |
| ch11-P3b | the process-execution activation (the P3 slot's activation share): the instance-side runtime-context representation (the instance field + the start-input seam + the nullable store column — the chapter's SECOND store-schema change, riding the same ADR-003 fence; the §11.1 item 2 accounting sentence aligns with P3b) with the testkit-injected ready ref, the HANDLE process branch (the C36 runtime backstop behavioral; the P2b `gate_execution_not_supported` behavioral lane retires with the model's reject→run flip), `run_process_gate` / `classify_process_result` / `runner_outcome` + the C23/C24/C25 wire forms + C31's `gate_blocked(reason)` rejection surface + C33 evidence propagation + C32 confinement, the `l2a/evidence-on-every-run` storeChecker, the C26-compliant durable fail-closed composition slot, the l2a golden trace | flag-free approve → autonomous build (inherited); predicted: projection (inherited) |
| ch11-P4 | the format extension: YAML gate declarations + process-config keys + the `runtime_context` key + the `round` declaration key (C37 + C40's source-form lanes — added at the 2026-07-12 gate-format reopen; the shipped template and `fixtureTemplate()` gain the round declaration TOGETHER under the ch8-P2 equality pin, and P2c's window wrappers retire here) + the validator lanes driven + the CLI validate extension + template-fixture updates | flag-free approve → autonomous build; predicted: projection (basis: draft: `contracts/ch11-gate-format-contract.md`, ratified 2026-07-12, re-ratified 2026-07-12) |

Order: draft → P0 → P1 → P2a → P2b → P2c → P3a → P3b → P4 (the chapter's draft-first rule sequences P0 after the draft ratification; P0 anchors no draft row; the P2a/P2b/P2c order is the P2 split's foundation → activation → alignment shape — aligned at ch11-p2a pre-approval; the P3a/P3b order is the P3 split's foundation → activation shape — aligned at ch11-p3a pre-approval). One packet = packet file + code +
tests in ONE commit.

### 11.5 Deliverables and DoD

Shipped: this section; the ratified-then-realized `ch11-gate-format`
contract-draft; the L1 admission extension; the gate pipeline + the
two evaluators + the registry; the L2a contract + port + fake runner;
the format gate surface + validator lanes; the round alignment (the
declared `advances_round` flags + the reconstructability checker) and
the round-declaration format surface; the module-home ADR; the
`ports/gate.ts` reconciliation.

DoD: the packets' contract tests green with claim-derived negatives
EXECUTED; the three golden traces green; the drift suite green (the registry's 54 names post-model-fix — the P0
bridge re-pins the locks; this chapter makes SEVEN more of them BEHAVE
and drives the admission issue-codes on the definition channel; the
unit-map lock extends with the 20 ids); invariant
dispositions realized per the ch-5 map (both checkers in
storeCheckers); the `gate_decisions` schema bump behind the ADR-003
fence; coverage
validation green; all v3 bridges + the FULL `pnpm ci:local` gate
green; the module-home ADR `accepted` per its lane; the draft flipped
`realized`-in-place with its `realized_map`; the ch-11 map row
flipped to `realized`; the dogfooding checkpoint run-or-waived
(recorded); process-log review held at the boundary, including the
first map-extension exercise verdict.

## Chapter 12 — Runtime core: L0c run profile + L0d lifecycle/activation + L0e provider contract (ratified 2026-07-18)

(autonomy stage: **measurement** — flag-free panel approves proceed
to build autonomously THROUGH the two transitional external-arm gates
(README §5.5, arm-pin.md); flags, STOPs, the draft ratification, and
any first-of-a-kind reclassification route to the human. The ch11
boundary's ARMED falling-yield prediction is measured on this
chapter's arm gates — the adopted catch-class lens duties and
R-DERIVED-PROBES run here for the first time.)

The **second live use of the §1.3 map-extension mechanism** (the
first, ch 11, closed VALIDATED), realizing the §11.1 honest-boundary
mandate: the ch-9 runner MVP presupposes kernel-side runtime
machinery the model carries at three levels and no chapter owns —
the L0c run profile (which agent config a dispatch is issued), the
L0d lifecycle/activation axis (a run that is created, provisioned,
held, activated, and terminally disposed — without it the kernel
cannot wait for a worktree to be built), and the L0e provider
contract (how a runtime context is declared, provisioned, and
projected to the actor). The user's scoping decision (2026-07-18):
a separate appended kernel chapter BEFORE ch 9 — the ch-11 shape
("the kernel owns the contract, the runner owns the spawn")
extended one rung down: the kernel owns the provisioning contract
and the activation machinery; the runner chapter owns the git
mechanics, the real adapter, and the attach surface. Numbered 12
(arrival order), ordered before ch 9 (build order). No PI item:
model-ladder surface, not operability spine (the floor/CLI
extension below exists to keep the chapter's own traces drivable
and the dogfooding real, not as a new operability deliverable).

### 12.1 Scope and boundaries

**In scope:**

1. **The L0d lifecycle/activation spine.** `kernel_status` as the
   second stored axis (`CREATED | ACTIVE | WAITING | TERMINAL`)
   beside `current_step`; the source-routed entry (`RECEIVE` —
   `input.source`: actor / operator / kernel); the ch-4
   `startInstance` one-shot RETIRED as a named replacement by the
   L0d split — `CREATE_INSTANCE` (record + binding coverage, NO
   dispatch) + `START` (provisioning request) + `activate` (the
   first dispatch moves here); the operator intents `KICKOFF` /
   `CANCEL` and the kernel event `FAIL` (with `COMPLETE` as the
   internal helper it already is in ch-4 code); `ActivationMode`
   (`immediate | deferred_kickoff`) and the typed wait
   (`kickoff_pending` — the ONLY wait kind here); single-write
   `terminal_disposition`; the lifecycle fact entries (`STARTED` /
   `CANCELLED` / `TASK_SUPPLIED`) carrying `op_id` under the
   uniform commit discipline (a replayed lifecycle op is
   `Duplicate`); the `not_active` guard's L0d unit basis (the
   name is BEHAVIORAL since ch11-P1 — this chapter lands the
   lifecycle machinery under it); `task_required` behavioral. The
   instance store gains the lifecycle columns (`kernel_status`,
   `terminal_disposition`, `activation_mode`, `wait`,
   `failure_reason`, `task` nullable, `runtime_context` state) —
   THE chapter's schema bump, under the ADR-003 fenced-wipe stance.
2. **The L0c run profile.** `AgentConfig` (portable run intent —
   inline fields + declared refs) with the cascade `role default ⊕
   step override ⊕ run override`; `resolve_agent_config` pure and
   deterministic; `effective_agent_config` in the packet, computed
   at dispatch and RECOMPUTED at commit into the transcript's
   `issued_agent_config` provenance (never stored as instance
   state); `run_overrides` snapshotted at start. The refs are
   declared intent — resolution is the ch-9 adapter's (and later
   ContextAssembly's) job, and `issued ≠ proven runtime` stays a
   review-disposition truth.
3. **The L0e provider contract.** `RuntimeContextRequirement`
   (`none | required(spec { kind, provider, config })`) on the
   template — RECONCILING the ch-11 minimal `runtimeContext`
   declaration key (C18/C19) into the full requirement form. This
   is an OWNERSHIP and meaning change, not a conditional touch:
   the ratified C18 names the consuming chapter (then ch 9) and
   prescribes additive value-domain growth ("a spec map JOINS
   `required` as a legal value; existing files keep their exact
   meaning") — the ch12 draft ratification therefore INCLUDES the
   NAMED reopen + re-ratification of ch11-gate-format C18/C19,
   plus C21's two runtime-context lane texts and C30's
   runtimeContext growth item (consistency edits — those rows
   hard-code or promise-bind the value domain C18 owned), plus
   ch8-template-format C14 (the agentConfig value domain moves to
   the ch12 draft's C7 — one owner on every page; the reopen set as
   aligned at the ch12 draft rounds, 2026-07-18) (the contract-draft
   lifecycle's reopen mechanics), deciding the bare
   `runtimeContext: required` string form's compatibility/migration
   (does it stay legal, and how a provider resolves for it) — a
   human act on named rows, never inferred; the `RuntimeContextProvider` contract
   (`provision(instance_id, request_id, spec)` async →
   `RUNTIME_CONTEXT_READY`, plus `project_for_actor(ref)`);
   `ProviderRegistry` (registry-stable-for-the-run); the
   kind-boundary check on readiness (the kernel validates kind +
   correlation, NEVER the provider-defined locator); the packet's
   `runtime_context` projection (the actor sees the projection or
   an explicit `none`, never the raw ref);
   `runtime_context_provider_unavailable` behavioral. This chapter
   ships the CONTRACT + a deterministic testkit provider; the real
   `pairflow.worktree` provider (git mechanics) is ch 9's — the
   chapter's most-guarded boundary, the ch-11 pattern one level
   down. The ch11-P3b start-input runtime-context seam is
   RECONCILED into the real lifecycle (`none | requested(r) |
   ready(ref)`) as a named replacement, never a parallel seam.
4. **The gate-field watchpoint realization (ch12-P0).** The
   ratified model fix (`6dd8bd15`: `Rejected(gate_blocked)`
   carries the blocking binding's `uses` as `gate`) realized in
   code: the `Outcome` gate_blocked arm, the kernel emission, the
   CLI rejection detail, and the affected test expectations — a
   pure projection from the ratified model, drift-lanes green
   before AND after (the model fix was registry-neutral).
5. **The format's runtime keys + operator verbs + floor extension.**
   Per the §8.2 stance (a capability and its format surface land in
   the same chapter): the role `default_agent_config` / step
   `agent_config` override keys with the refs fields, the
   `activation { mode }` key, and the `runtime_context` requirement
   block (the C18 key's successor form via the §12.1 item 3
   reopen + re-ratification) in the YAML template +
   validator lanes + CLI validate extension; the operator CLI gains
   the lifecycle verbs (`create` / `start` / `kickoff` / `cancel`
   as thin ingress writers — the ch-6 pattern; a convenience
   composition of CREATE+START may exist per the model's note);
   the floor (`listInstances` / `getInstanceDetail` / timeline)
   surfaces `kernel_status`, the wait, and the runtime-context
   state so the chapter's own dogfooding can watch a held run.

**Out of scope (deliberate):**

- **The real spawn and everything runner** — the `pairflow.worktree`
  provider's git mechanics, the real actor adapter, the process-gate
  runner's real spawn, the attach channel: ch 9.
- **Provisioning-failure handling, teardown lifecycle, provider
  health, run-override cascade for the context, conditional
  per-step context** — declared Absents (`→ later`), unchanged;
  provisioning failure has NO channel at ch 12 (a failed provision
  simply never fires READY — the run stays floor-visible and
  cancellable); the model's failure→`FAIL` routing arrives WITH
  this Absent (aligned at the ch12 draft round, 2026-07-18 — the
  draft's C15).
- **Waits beyond `kickoff_pending`** — `human_decision` (L3),
  `child_workflow` (L4), `timeout` (L9) ride the same machinery
  later.
- **Operator authority** (who may kickoff/cancel — L7/L10) —
  dormant-until-restricted, per the model.
- **The L0f pre-kernel resolution** (slots, workflow selection) —
  the ch-4 start-path binding merge stays; L0f is unowned surface
  for a later chapter.
- **Retry on FAILED** (§18) — Absent.

### 12.2 Coverage and intake impact

Unit ownership: **21 ids** (4 l0c + 12 l0d + 5 l0e), a substantial
share as `alias/inherited` / reprint dispositions (the HANDLE and
`dispatch_intent` version chains — the live fold already carries
several of these semantics via later levels; the packet projection
declares per-unit dispositions, the authoring-time discovery being
the authority). The ch-11 partial-realization dispositions on
`l1-pseudocode/dispatch_intent` and `l1-pseudocode/RECEIVE` (their
L0c/L0e-inherited branches) COMPLETE here — the completion is
declared in the owning packets. Rejections: **2 new behavioral**
(`task_required`, `runtime_context_provider_unavailable`) +
`not_active`'s owning units land (behavioral since ch11-P1).
Invariants: **15**, dispositions already fixed by the ch-5 map
(7 `type/schema` / 5 `test` / 1 `checker` / 2 `review`); the checker
— `l0d/terminal-is-a-sink` — lands as a storeCheckers extension
with a named packet owner. Chapter traces: **3 golden traces** (the
l0c, l0d, and l0e section traces; the l0d trace exercises the
deferred-kickoff hold + cancel, the l0e trace the provisioned
immediate run + the unknown-provider variant); ch12-P1b additionally
ships a context-free deferred-hold JOURNEY trace (an acceptance
vehicle, not a fourth golden trace — the draft's C25 staging; the
P1a/P1b partition aligned at ch12-p1a pre-approval). No IC/PI intake rows
flip: the chapter is map-extension surface (the IC-A2 family and
the CT-B two-worker re-run stay ch 9's).

### 12.3 The draft phase

Before ANY packet (README §4): `contracts/ch12-runtime-core-contract.md`
(surface: `runtime-core`). Indicative C-row set — the draft decides,
this list only scopes it: the `agent_config` YAML grammar (role
default + step override keys, the inline field set, the `*_refs`
value classes and their relation to the ch-8 id grammar); the
`activation` key (mode enum, absent-key default = `immediate`); the
`runtime_context` requirement block's grammar VIA the NAMED reopen +
re-ratification of the ratified ch-11 C18/C19 rows + C21's two
runtime-context lane texts + C30's runtimeContext growth item, and
ch-8 C14 for the agentConfig value domain (ownership moves from the
then-named consuming chapters to ch 12; the bare
`runtimeContext: required` string form's compatibility/migration
decision is part of the same human act — §12.1 item 3);
the run-override start-input surface; the provider contract's wire
shapes (provision inputs, the ready event, the projection JSON);
the per-chapter registry composition (testkit provider here,
`pairflow.worktree` joining at ch 9); the lifecycle verbs' CLI
schemas + exit-code lanes; the store schema columns + the wait/
runtime-context encodings; the module home ADR (the ADR-011/ADR-013
pattern — where the lifecycle handlers and the provider seam live).
Ratification is permanently human; packets anchor as
`contract:ch12-runtime-core#Cn`.

### 12.4 Packets and flow mode

Draft reference (§1.3 convention): `contracts/ch12-runtime-core-contract.md`
— RATIFIED 2026-07-19 (the draft round ran first, before any packet;
the prediction bases below are unconditional now).
Process note: P1 was the declared sizing-split candidate (template §2
step 0); the split EXECUTED at ch12-p1a authoring (autonomous
in-chapter split — sizing, not scope; hard stops 1, 2, and 8 tripped
on the bundled row and the single-packet closure proof failed on the
separately-sequenceable foundation→activation buckets; the P1a/P1b
rows below are the repartition on the row's own expected seam,
coverage union preserved — aligned at ch12-p1a pre-approval).

| Packet | Content | Mode |
|---|---|---|
| ch12-P0 | the gate-field watchpoint realization: the `Outcome` gate_blocked arm + kernel emission + CLI rejection detail gain `gate` per the ratified model fix (`6dd8bd15`), test expectations updated | flag-free approve → autonomous build (measurement; the §5.5 fallbacks stand); predicted: projection (source: the ratified model @ `6dd8bd15` — anchors no draft row) |
| ch12-P1a | the lifecycle axis (the ch12-P1 sizing split's FOUNDATION share; split executed at ch12-p1a authoring): THE schema bump (fenced — the full C11 instances set PLUS the C12/C10 transcript face — entry-kind + provenance columns, schema-supported with their writers staged to P1b/P2 — in ONE bump; the ch-4 `status` column retired per C24 with the packet-owned consumer sweep, whose structural consequence is that the passthrough read documents surface the axis fields at P1a — the DEDICATED floor extension stays P4), the l0d domain value objects, the admission state rung re-based onto `kernel_status` (the `not_active` name unchanged — behavioral since ch11-P1), COMPLETE → TERMINAL(done) under the single-write disposition rule, the ch-4 one-shot `startInstance` INTERIM-mapped onto the axis (its retirement stays P1b's), the `l0d/terminal-is-a-sink` storeChecker, the C14-transitional runtime-context state encoding | flag-free approve → autonomous build (inherited); predicted: projection (basis: inherited from the P1 row — l0d-pseudocode + ledger §2/§3/§4 + the ratified chapter draft) |
| ch12-P1b | the activation machinery (the split's ACTIVATION share): the source-routed entry, the operator-intent ingress family (CREATE/START/KICKOFF/CANCEL — C13), START's none-path + the activate_or_hold fork, the lifecycle fact entries with `op_id` (C12), activate, FAIL, `task_required` behavioral, the ch-4 `startInstance` RETIRED as the named replacement (C24) + the C25 in-handler CLI bridge, a context-free deferred-hold journey trace (the l0d golden trace's requested/READY legs need the provider machinery — it moves to P3; aligned at the ch12 draft refine round, 2026-07-18, the draft's C25 trace staging); the `l0d/actor-routable-execution` share lands BOTH-ENDS at this commit (this packet's slice + the reciprocal entry in ch12-p1a's — the coverage both-ends rule) | flag-free approve → autonomous build (inherited); predicted: projection (basis: inherited from the P1 row — l0d-pseudocode + ledger §2/§3/§4 + the ratified chapter draft) |
| ch12-P2 | the L0c run profile: `AgentConfig` + the cascade + `resolve_agent_config`, the packet's `effective_agent_config`, the transcript's `issued_agent_config` recomputed-at-commit provenance, `run_overrides` at start, the l0c golden trace; the `l0d-pseudocode/HANDLE` share lands BOTH-ENDS at this commit (this packet's slice + the reciprocal entry in ch12-p1a's — the coverage both-ends rule) | flag-free approve → autonomous build (inherited); predicted: projection (basis: l0c-pseudocode + ledger §2/§4 + the ratified chapter draft) |
| ch12-P3 | the L0e provider contract: the requirement on the template (C18/C19 successor), the provider port + `ProviderRegistry` + the deterministic testkit provider, the kind-boundary readiness check, the packet projection, `runtime_context_provider_unavailable` behavioral, the ch11-P3b start-input seam reconciled, the l0e golden trace (incl. the unknown-provider variant) + the l0d golden trace (the deferred hold + cancel — its requested/READY legs realized with the scripted provider; moved from the pre-split P1 row, aligned 2026-07-18); the `l0d-pseudocode/START` and `l0d-pseudocode/RECEIVE` provider/READY legs COMPLETE here (partial realization declared at P1b) — the machine shares land BOTH-ENDS at P3's commit (its own co_owner entries plus the reciprocal entries added to ch12-p1b's slice — the HANDLE pattern; aligned at ch12-p1b pre-approval) | flag-free approve → autonomous build (inherited); predicted: projection (basis: l0e-pseudocode + ledger §2/§3/§4 + the ratified chapter draft) |
| ch12-P4 | the format + operator surface: the runtime YAML keys (agent_config / activation / runtime_context requirement) + validator lanes + CLI validate extension, the lifecycle CLI verbs, the floor extension (kernel_status / wait / runtime-context state); the shipped template/fixture gain NO new keys, the ch8-P2 equality pin held byte-unedited (aligned at ch12-p4 pre-approval — C25's ratified narrowing of the earlier "template-fixture updates" shorthand: the shipped canonical file's behavior IS the defaults) | flag-free approve → autonomous build (inherited; EXERCISED-to-human at ch12-p4: an arm-gate-1 reclassification (F1, the compact-list field selection) minted a new-decision, demoting to the human approve — ratified 2026-07-22); predicted: projection (basis: the ratified chapter draft) |

Order: draft ratification → P0 → P1a → P1b → P2 → P3 → P4 (the README
§4 draft-first rule binds without exception — P0 anchors no draft row
but still follows the ratification; the P1a/P1b order is the P1
split's foundation → activation shape — aligned at ch12-p1a
pre-approval). One packet = packet file + code + tests in ONE commit.

### 12.5 Deliverables and DoD

Shipped: this section; the ratified-then-realized `ch12-runtime-core`
contract-draft; the lifecycle/activation spine + schema bump; the
run-profile cascade + provenance; the provider contract + testkit
provider + projection; the gate-field realization; the runtime
format keys + lifecycle verbs + floor extension; the module-home
ADR.

DoD: the packets' contract tests green with claim-derived negatives
EXECUTED; the three golden traces green; the drift suite green (the
unit-map lock extends with the 21 ids; the two new rejection names
BEHAVE); invariant dispositions realized per the ch-5 map (the
`terminal-is-a-sink` checker in storeCheckers); the schema bump
behind the ADR-003 fence; coverage validation green; all v3 bridges
+ the FULL `pnpm ci:local` gate green; the module-home ADR
`accepted` per its lane; the draft flipped `realized`-in-place with
its `realized_map`; the ch-12 map row flipped to `realized`; the
dogfooding checkpoint run-or-waived (a hand-driven
create → start → held → kickoff → cancel lifecycle on the CLI);
process-log review held at the boundary, including the ARMED
falling-yield measurement (gate-1/gate-2 yields vs the P3b
prediction) and the second map-extension exercise verdict.

## Chapter 9 — Runner MVP: worktree provider + real adapter + process-runner spawn + attach (ratified 2026-07-23)

(autonomy stage: **measurement** — flag-free panel approves proceed
to build autonomously THROUGH the two transitional external-arm gates
(README §5.5, arm-pin.md); flags, STOPs, the draft ratification, and
every first-of-a-kind packet route to the human. Main-thread arm:
**Fable-class** — the `model-tier-experiment-2.md` first assignment,
recorded in its §8 log at this ratification; panel lenses and the
external arm stay as ratified. The mutation-testing pilot DUAL-RUNS
beside arm gate-2 on every packet of this chapter — see the flow
note in §9.4.)

The ORIGINAL ch-9 row's chapter (PI-8 — the runner-MVP reserved
chapter, the trio: `pairflow.worktree` provider / one real actor
adapter / process-gate runner spawn side, plus the attach channel).
Both build-order prerequisites are realized: ch 11 (the gate call
site) and ch 12 (the runtime core — the L0e provider contract this
chapter's provider implements). MVP scope stands as resolved
(user, 2026-07-18): **local-worktree only** — headless/cloud is a
later provider behind the same contract.

**Opening dispositions (user, 2026-07-23 — the four parked items,
resolved stepwise at the chapter opening):**

1. **Mutation-testing pilot:** feasibility PROVEN and wired AT the
   opening (commit `c95e9889`): Stryker 9.6.1 + vitest-runner on
   vitest 4.1.10, 171 mutants on `emit/opId.ts` in ~11s, score
   81.29% with real survivors — the `v3:mutation` bridge exists.
   The pilot's dual-run rule binds in this chapter (§9.4 flow note).
2. **The production-provider gate (ch12-C15's D5 condition)
   discharges IN-CHAPTER:** the provisioning-failure → correlated
   kernel `FAIL` channel's rows land in THIS chapter's contract
   draft (the rows ch12-C15 explicitly deferred to "that later
   chapter"), and an EARLY packet realizes them BEFORE the
   provider-registration packet — the gate is carried by packet
   ordering (§9.4), never by a registered-but-unprotected provider.
3. **Map-extension disposed:** NO further appended chapter is needed
   before ch 9 (the FAIL channel moved in-chapter; ch 11 + ch 12
   closed the earlier gaps). The deferred teardown / provider-health
   / cloud-provider topics STAY named Absents (rework surface,
   mention-level) — they get a chapter when they come due, cut with
   this chapter's experience. The §1.3 candidate list is unchanged.
4. **The ch11-C31 `sys:` reopen rides THIS chapter's draft
   ratification act** (one GO covers both — the ch12 precedent):
   the seven FIXED reason tokens gain the `sys:`
   prefix (`sys:round_below_min`, `sys:no_previous_verdict`,
   `sys:exit_zero`, `sys:exit_nonzero`, `sys:runner_error`,
   `sys:timeout`, `sys:malformed_gate_decision_json`) so the
   authored/fixed disjointness the ratified C31 claims holds BY
   CONSTRUCTION (the authored grammar `^[a-z][a-z0-9_]*$` cannot
   express `:`) — closing the arm-audit's material
   under-realization (an authored process returning `gate_blocked`
   is accepted verbatim today). Code realization = ch9-P0, BEFORE
   any runner packet builds on the tokens. (Scope aligned at the ch9
   draft rounds: the rename's ratified-text footprint is five ch11
   rows + one reference + map entries — §9.3 and the draft's C27.)

### 9.1 Scope and boundaries

**In scope:**

1. **The ch11-C31 `sys:` namespace realization (ch9-P0).** The
   seven fixed reason tokens renamed per the reopened +
   re-ratified C31: code, tests, the l2a golden trace, and the
   transcript/audit surface. NO registry rejection name changes
   (reason tokens are `gate_blocked` REASON PAYLOAD — the 54-name
   registry is untouched, drift lanes stay green).
2. **The provisioning-failure → `FAIL` channel.** The
   `RuntimeContextProvider` port gains its failure completion (the
   wire shape), correlated exactly like READY (request_id
   correlation + the terminal-sink state rung; ordered-after-commit
   under the same C15 seam), routing to the EXISTING kernel `FAIL`
   event with a draft-decided reason domain; single-shot — retry,
   health, and teardown machinery stay Absent. The testkit scripted
   provider gains the failure script. This is the C15 D5 gate's
   realization half.
3. **The `pairflow.worktree` provider.** Local git worktree
   mechanics behind the ch12 L0e port: the spec's config surface,
   worktree/branch creation, the opaque ref (locator
   provider-defined, kernel never interprets), the actor-facing
   projection; REGISTERED into the production registry (the
   ch12-C16 successor composition) — legal only after item 2 is
   realized. Worktree teardown is Absent (worktrees persist;
   named rework surface).
4. **The real actor adapter + the durable delivery loop.** One real
   adapter delivering committed dispatch packets to a real actor
   process in its runtime context and feeding the emitted op back
   through normal ingress (commit ≠ deliver — the delivery half the
   kernel deliberately does not own). Delivery runs as a durable
   errand: the IC-A2 contract family lands here (`CT-A2-CRASH`
   crash-window kills, `CT-A2-CONFIRM` no-error/no-ack as a
   distinct non-terminal state, `CT-A2-RETRY-DURABLE` restart-
   surviving retry budget), and `CT-B-TWOWORKER` re-runs under the
   real runner (the ch-5 kit-driven result re-proven).
5. **The process-gate runner spawn side.** The real child-process
   spawn behind the ch11 kernel contract: timeout enforcement,
   exit-code lanes, gate-decision JSON capture — producing the
   (now `sys:`-prefixed) fixed reason tokens the kernel already
   classifies.
6. **The attach channel.** The per-runtime-context observe/takeover
   verb on the adapter (tmux mechanics; pane-layout config stays
   none-in-v1 per the settled pane-binding decision), plus the
   minimal CLI/floor surface the chapter's dogfooding needs.

**Out of scope (deliberate):**

- **Teardown / provider health / retry-on-FAILED / cloud-headless
  provider** — named Absents, mention-level (opening disposition 3).
- **L2b context blocks** — the named §1.3 candidate, naturally after
  this chapter.
- **Pane-layout configuration** — none-in-v1 (settled 2026-07-07).
- **Capability-query op family** — scoped out since ch 1.
- **Any second adapter or provider** — one real adapter, one real
  provider; breadth is later work behind the same contracts.

### 9.2 Coverage and intake impact

Unit ownership: a NEAR-EMPTY ledger slice — the runner surfaces
(git mechanics, spawn, delivery, attach) are adapter/runtime-side,
outside the unit tree; their claim surface is the draft's canonical
contract matrices (the operability-packet shape). ONE candidate id:
`l0d-pseudocode/RUNTIME_CONTEXT_READY` — the sole unowned l0d rung
(ch12-P3 owns the l0e version) — expected `alias/inherited`;
authoring-time projection confirms or corrects. The FAIL-channel
rows are draft-owned decisions ch12-C15 explicitly deferred here —
no model-plane change is expected (the model's failure→`FAIL` prose
already exists; a divergence discovered at authoring routes through
the standing model↔code stop, never a silent patch). Rejections:
no new registry names expected (failure reasons are `FAIL` payload
domain — the draft decides its tokens; the `sys:` rename touches
payload tokens only). Invariants: none newly owned. Traces: no new
ledger section trace; the chapter's acceptance vehicles are the
IC-A2 CT family, the CT-B re-run, and the end-to-end dogfooding
journey (§9.5). Intake flips at DoD: the three IC-A2 rows +
`CT-B-TWOWORKER`'s ch-9 re-run annotation + §1.3 row 9 (PI-8
closes).

### 9.3 The draft phase

Before ANY packet (README §4): `contracts/ch9-runner-contract.md`
(surface: `runner`). Indicative C-row set — the draft decides, this
list only scopes it: the FAIL-channel wire shape / correlation /
reason domain (the C15-anticipated rows; whether failure reasons
adopt a namespace form consistent with the `sys:` convention is a
draft-time decision); the provider failure single-shot semantics;
the `pairflow.worktree` spec grammar (kind, config keys) + ref +
projection shapes; the worktree git-mechanics contract (directory/
branch naming, collision and dirty-state guards, substrate probes
for git worktree behavior — probes ARE draft-time work); the
delivery-errand contract (claim, crash-window atomicity, the
distinct no-ack state, the durable retry budget — the IC-A2 family's
row basis); the real actor adapter contract (spawn environment,
packet handoff, emitted-op capture back through ingress — ingress
never assumes a particular adapter impl, IC-E); the process-gate
spawn contract rows (timeout, exit-code lanes, malformed-JSON —
realizing the ch11 kernel contract's spawn side); the attach verb's
schema + capability rules (per-runtime-context, observe/takeover);
CLI schemas + exit-code lanes; the production-registry composition
successor (C16's `pairflow.worktree` join). The K0→K4 decision-home
triage (README §6, adopted at this chapter's opening) runs on every
new-decision row; expected outcomes, named at ratification: the
delivery-errand durability semantics get the K0 question EXPLICITLY
(L8 is a modeled-but-deferred surface) plus an ADR candidate for
the errand shape (K1); the spawn/attach confinement boundary is an
ADR candidate (K4); the provider seam is ALREADY model-side (the
ch12 L0e precedent) — its git mechanics stay code-side. The
RATIFICATION ACT
also carries the ch11-C31 reopen + re-ratification (opening
disposition 4; SCOPE aligned at the ch9 draft rounds, 2026-07-23:
the rename touches the five token-defining ch11 rows
C10/C11/C17/C25/C31 PLUS C26's classification reference and the
named realized_map entries — the draft's C27 carries the full act,
"C31 reopen" stays the act's shorthand) — one GO, two named acts,
the reopen window closed
inside the act (zero reopened drafts at any packet approve).
Ratification is permanently human; packets anchor as
`contract:ch9-runner#Cn`.

### 9.4 Packets and flow mode

Draft reference (§1.3 convention): `contracts/ch9-runner-contract.md`
— RATIFIED 2026-07-23 (the draft round ran first, before any packet;
the prediction bases below are unconditional now; the ratification
act also executed the ch11-C31 `sys:` reopen per C27).

**Mutation-pilot flow note (binds every packet):** arm gate-2
dual-runs `pnpm v3:mutation` scoped to the packet's
`mutation_boundary`; catches are labeled code-mutation vs
input-domain and recorded with the packet's metrics — two chapters
of paired data, then the boundary review disposes the pilot.

Process note: P3 was the declared sizing-split candidate (template
§2 step 0); the split EXECUTED at ch9-p3a authoring (autonomous
in-chapter split — sizing, not scope; hard stops 1 and 2 tripped on
the bundled row — the errand-ledger authority introduction bundled
with real-process activation, one delivery concept across 3+
surfaces — and the single-packet closure proof failed on the
separately-sequenceable foundation→activation buckets; the P3a/P3b
rows below are the repartition on the row's own expected seam,
coverage union preserved — aligned at ch9-p3a pre-approval).

Process note: P4 was the second declared sizing-split candidate
(template §2 step 0); the split EXECUTED at ch9-p4a authoring
(autonomous in-chapter split — sizing, not scope; hard stop 2
tripped on the bundled row — the session-liveness concept alone
spans the adapter's tmux wrap, the attach verb, and the floor's
availability read (3+ surfaces for one concept) — the row couples
new spawn machinery with its shipped-entrypoint activation (the
foundation→activation shape), and the single-packet closure proof
failed on the separately-sequenceable machinery vs operator-surface
buckets with their distinct proof surfaces and consumer families;
the P4a/P4b rows below are the repartition on the row's own
machinery/surface seam, coverage union preserved (both slices
empty) — aligned at ch9-p4a pre-approval).

| Packet | Content | Mode |
|---|---|---|
| ch9-P0 | the ch11-C31 `sys:` rename realization: the seven fixed reason tokens gain the prefix in code + tests + the l2a golden trace + the transcript/audit surface; registry names untouched (drift lanes green before and after) | flag-free approve → autonomous build (measurement); predicted: projection (basis: the re-ratified C31 row) |
| ch9-P1 | the provisioning-failure → `FAIL` channel: the port's failure completion + ordered-after-commit hold/release + correlation & terminal-sink rungs + reason domain + kernel `FAIL` routing; testkit failure script; the C15 D5 gate's realization half — MUST land before ch9-P2 | flag-free approve → autonomous build (measurement); predicted: projection + derived (basis: the ratified ch9 draft rows + the ch12-C15/C18 mechanics) |
| ch9-P2 | the `pairflow.worktree` provider: git worktree mechanics, spec/ref/projection, production-registry registration (legal here — the gate discharged at P1); the `l0d-pseudocode/RUNTIME_CONTEXT_READY` candidate id resolves in this packet's slice | HUMAN approve — first-of-a-kind (first real provider; external side effects on the host) |
| ch9-P3a | the durable delivery-errand core (the P3 split's FOUNDATION share; split executed at ch9-p3a authoring): the runner-owned errand ledger realizing ADR-016 — the C12 store, C13 discovery/identity, C14 lifecycle/claims/precedence, C15 kernel-evidence confirmation, C16 durable budget + attempt minting — the `AttemptExecutor` seam + scripted testkit executor, the C26 errand-transition diag share; the IC-A2 CT family (`CT-A2-CRASH` / `CT-A2-CONFIRM` / `CT-A2-RETRY-DURABLE`) lands here | HUMAN approve — first-of-a-kind (inherited from the P3 row: the first runner-plane durable coordination machinery) |
| ch9-P3b | the real actor adapter (the split's ACTIVATION share): the C19 shared spawn seam born here (the P2 provider spawn's `DEFERRED(ch9-p3)` fold-in), C17 attempt-scoped handoff, C18 argv mapping, C20 emit capture + ingress submission, C23's exit-result seam on the direct-spawn path — the real `AttemptExecutor` behind the P3a seam; the `CT-B-TWOWORKER` re-run under the real runner | HUMAN approve — first-of-a-kind (first real adapter; inherited) |
| ch9-P4a | the real-spawn machinery (the P4 split's FOUNDATION share; split executed at ch9-p4a authoring): the C21 real `ProcessGateRunner` — C19-seam spawn, total kind production, workspace-fact measurement, durable C26 evidence — WITHOUT the shipped-composition swap (the fail-closed slot stays until P4b; the milestone-gated activation rule), plus the process-gate cwd-resolution seam fix (the ch12-P1a string-locator read yields to the L0e `LocalExecutionCapability` resolution); the C23 tmux session channel on the actor adapter — the session wrap preserving the P3b result seam, liveness-derived conclusion, session-level timeout escalation, the `name_collision` lane activated (the C16 tmux collision half + the P3b-pre-authorized `SPAWN_OUTCOMES` growth) | HUMAN approve — first-of-a-kind (first real process-gate spawn; first tmux machinery; inherited from the P4 row) |
| ch9-P4b | the operator surface (the split's ACTIVATION share): the composition swaps (the real gate runner into the shipped CLI kernel wiring; the tmux channel as the runner composition's delivery default), the C25 CLI verbs (`runner run` with the lease-above-timeout pairing validation — the P3b F8 obligation; `attach` per C24; `runner respawn`), the floor/CLI instance-detail growth (runtime-context projection summary, errand state + budget, attach availability), the R-ACTIVATION-JOURNEY smokes through the shipped entrypoints, and the chapter's dogfooding-checkpoint preparation | HUMAN approve — first-of-a-kind (first operator runner surface + attach; inherited) |

Order: draft ratification (carrying the C31 reopen act) → P0 → P1 →
P2 → P3a → P3b → P4a → P4b (P1-before-P2 is the production-provider
gate's ordering; P0-first keeps every runner packet on the renamed
tokens; the P3a/P3b order is the P3 split's foundation → activation
shape — aligned at ch9-p3a pre-approval; the P4a/P4b order is the P4
split's same shape — machinery before the operator surface that
activates it — aligned at ch9-p4a pre-approval).
One packet = packet file + code + tests in ONE commit. Per-packet
difficulty scores + `main_thread_model: fable` recorded per
`model-tier-experiment-2.md` §5.

### 9.5 Deliverables and DoD

Shipped: this section; the ratified-then-realized `ch9-runner`
contract-draft (+ the re-ratified ch11-C31); the `sys:` token
realization; the FAIL channel; the registered `pairflow.worktree`
provider; the real adapter + durable delivery errand; the
process-gate spawn side; the attach channel + CLI/floor bits; the
wired mutation pilot's first full-chapter dual-run data.

DoD: the packets' contract tests green with claim-derived negatives
EXECUTED; the IC-A2 CT family + the CT-B re-run green under the real
runner; the drift suite green (registry names unchanged by the
`sys:` rename); coverage validation green; all v3 bridges + the FULL
`pnpm ci:local` gate green; the draft flipped `realized`-in-place
with its `realized_map` and `pnpm v3:realized-map` GREEN inside the
close act (the arm map-audit layer runs DETACHED, deadline = the
next chapter's close); the ch-9 map row + the IC-A2 intake rows
flipped; `pnpm v3:deferred --closed ch9` clean; the dogfooding
checkpoint run-or-waived (a hand-driven REAL run: create → start →
worktree provisioned → attach observed → the actor's emitted op
lands → a process gate runs — the first live end-to-end journey);
process-log review held at the boundary, including the
model-tier-experiment-2 §7 arm-comparison entry and the
mutation-pilot yield read.

## Chapter 13 — Context blocks: the L2b render + definition-load ref check + the format's context keys (ratified 2026-07-25)

(autonomy stage: **measurement** — flag-free panel approves proceed
to build autonomously THROUGH the two transitional external-arm gates
(README §5.5, arm-pin.md); flags, STOPs, and the draft ratification
route to the human. Main-thread arm: **Opus-class** — the FIRST Opus
chapter of `model-tier-experiment-2.md`, per its §2 pre-registration
("the next implementation chapter opens the Opus arm"), the K3
prerequisite hardenings having landed at the ch12 boundary; recorded
in its §8 log at this ratification. **No chapter-named
Fable-mandatory slice** (user, 2026-07-25): no packet here is
first-of-a-kind or idiom-minting — the render extends the existing
dispatch assembly and reuses ch11's authority logic, the definition
side extends the ch8/ch11 format and admission machinery. The
standing Fable-mandatory categories are unchanged (this section, the
contract-draft + its ratification support, process revisions, the
boundary review). Panel lenses and the external arm stay as ratified.
**The GROUND of that decision moved at ch13-p1a's approve (aligned
2026-08-09), the decision did not.** The re-derivation made the
definition side idiom-minting after all: ch13-p1a admits a new
normalizer-hook CONSTRUCT into the ADR-019 vocabulary and scores E = 2
on the difficulty index's idiom-minting pole, so the sentence above no
longer describes p1a. The no-Fable-slice disposition nevertheless
stands, on the reason it was always for: a SLICE is build work, and
the chapter's build work remains Opus-class — which is the data the
model-tier experiment opened this chapter to collect. What the
re-derivation produces instead are two Fable-mandatory `docs(v3)`
ACTS, both inside the standing categories above (the contract-draft's
ratification support; process revisions), both prerequisites of
ch13-p1a's build and neither a slice of it.
The mutation-testing pilot DUAL-RUNS beside arm gate-2 on every
packet — this is the pilot's SECOND and final data chapter, see the
flow note in §13.4.)

The **third live use of the §1.3 map-extension mechanism** (ch 11
closed VALIDATED, ch 12 followed), realizing the §1.3 third named
candidate — the **L2b context-block surface**, deliberately excluded
from ch 11 (§11.1) with a stated condition: it lands "naturally after
ch 9 when a real actor adapter consumes dispatched packets." That
condition came TRUE at the ch9 close — the shipped adapter
materializes the ContextPacket as canonical `packet.json` and hands
the actor its path, so a block rendered into the packet reaches a
real actor with no prompt-assembly layer in between. Numbered 13
(arrival order), ordered after ch 9 (build order). No PI item:
model-ladder surface.

**What the layer is for.** L2 enforces a rule; L2b COMMUNICATES it.
The kernel renders deterministic, actor-facing blocks into the
dispatched packet so an actor is told the rule before it acts instead
of burning a round on an emit the gate would block. One render
mechanism, two ref sources: a template-level catalog is the single
body source, and both the L0c-declared role/step prompt-concern refs
and the gate/policy block refs are id lists into it. Nothing here
changes a verdict — deleting a block cannot change what L2 enforces.

**Opening dispositions (user, 2026-07-25 — the scoping round):**

1. **Acceptance floor = capability AND shipped wiring.** Not the
   capability alone: the shipped canonical template gains a REAL
   catalog entry and a journey smoke proves the block reaches a real
   actor's `packet.json` through the shipped entrypoint
   (R-ACTIVATION-JOURNEY). The first catalog entry is the
   **emit-envelope block** — the interim carrier for the gap named in
   [`v1-prompt-parity-audit.md`](v1-prompt-parity-audit.md) §5 (no v3
   surface tells a real actor the emit envelope shape; the ch9
   dogfooding tier-2 leg supplied it by hand in the `--actor-cmd`
   invocation). It retires when EC's `op_contracts` lands — and that
   retirement has a CARRIER, not a promise: the EC surface is entered
   as a named §1.3 map-extension candidate at this ratification, with
   the retirement of this catalog entry bound into the DoD of
   whichever chapter takes it (user-ratified 2026-07-25, after the
   owner asked what would guarantee the pickup; a chapter-prose
   "temporary" marker is exactly the carrier-less form the
   R-PRESENT-TENSE reference-economy rule forbids).
2. **The ch9-carried EPIPE item rides as this chapter's own first
   packet** (§1.3 carried item 1), not folded into a content packet:
   one packet = one logical change, and a Light-band opener is a
   clean first calibration point for the Opus arm.
3. **One contract-draft, for the L2b surface only.** The EPIPE
   closed-pipe behavior contract stays a PACKET-time decision (the
   decision-home triage: a single-packet decision has no cross-packet
   drift to prevent).
4. **Arm slicing: none** — see the autonomy-stage note above.

### 13.1 Scope and boundaries

**In scope:**

1. **The dispatch-time render.** `assemble_context_blocks`:
   deterministic, bodies ONLY from the catalog, source order = render
   order (role → step → gate, declaration order within each), a
   repeated id renders once while `provenance.sources[]` accumulates
   every emitter. The gate ref's predicate — it renders iff its
   transition is in `available_ops ∩ L1 capability` — REUSES the
   transition-existence + L1 authority logic ch 11 already defines;
   no fresh authority logic is written here. The packet gains one
   ordered field of `{ id, body, provenance }`. `HANDLE`'s verdict
   path is untouched.
2. **The definition-load ref check.** `validate_context_refs` runs
   under ADMISSION (`admit_definition`), beside the rest of the
   definition-static family; an unresolved ref is the
   `unresolved_context_block_ref` DEFINITION ISSUE — an admission
   failure, never a render-time drop. The code is an EXISTING name
   (the ch11 model fix's 31-name definition-issue family, see
   `ch11-model-sync-delta.md`); it joins the named-lane carrier the
   ch11 gate work established (`code` on the validate-stage finding).
3. **The format's three context keys.** Per the §8.2 stance (a
   capability and its format surface land in the same chapter): the
   template-level catalog (single body source — bodies never live
   inline at a ref site), the role/step prompt-concern refs (the L0c
   slot that has had no resolver until now), and the gate/policy
   block refs. camelCase realization of the model's snake_case names
   per the established rename culture (ch11-C13/C16/C37, ch12) —
   stated so neither side silently forks; unknown keys are ADMISSION
   issues per the ch8-C13 fail-closed culture.
4. **The shipped template's first catalog entry + the journey
   smoke.** Per opening disposition 1. The catalog additionally
   carries an AUTHORING COMMENT beside it (user-ratified
   2026-07-25): a block body stating a gate's configured value can go
   stale against that gate with nothing detecting it. It sits in the
   shipped file because the reader who needs it is whoever opens that
   file to add the NEXT entry — the person who turns the latent risk
   live. This chapter ships no such body (the only entry describes
   the emit envelope, not a gate), so the risk is latent here by
   construction; the comment and its draft sibling (§13.3) are aim,
   not enforcement.
5. **The EPIPE fix (the chapter's hygiene packet).** The SHIPPED CLI
   entrypoints' output sinks — the operator CLI's and the dev CLI's,
   whose entrypoints carry the byte-identical bare sink and share the
   `dispatch` shell that recognizes the quiet-termination path (scope
   aligned at ch13-p0 pre-approval, 2026-07-26) — handle a closed pipe
   quietly instead of crashing with a raw stack (repro: `pnpm v3:cli
   detail … | head -1`; also reached via a `| jq` that parse-fails
   mid-stream). Today those sinks are bare `process.stdout.write` /
   `process.stderr.write` calls with no EPIPE handling — note the
   contrast with the gate lane, which already treats an EPIPE against
   a fast-exiting child as best-effort (`runner/spawn.ts` GR2). The
   closed-pipe behavior contract is decided in the packet,
   against the ch6-P4a canonical exit-code matrix.

**Out of scope (deliberate):**

- **Computed / templated bodies** — a body is authored static text;
  interpolation like `{{ gate.config.value }}` is a declared Absent.
  The consequence is stated, not hidden: bump a gate's threshold and
  the prose that describes it silently lies until someone edits it.
- **Semantic parity check** — the ref check proves a ref RESOLVES,
  never that its prose matches the gate config it describes. Drift is
  not detected (declared Absent).
- **Conditional block bodies** — selection is by the authority
  predicate only; round- or state-dependent body variants are
  computed-body work (declared Absent).
- **Rich context assembly** — semantic retrieval, memory, skill-doc
  expansion, model-specific prompt shaping (declared Absent).
- **Actor-adapter prompt shaping** — the shipped adapter materializes
  the packet verbatim; how a model-specific adapter folds blocks into
  a prompt is adapter work (declared Absent).
- **A phase axis** (separate ref lists for a fresh start vs a
  continuation) — a v1 mechanism with NO L2b counterpart
  (`v1-prompt-parity-audit.md` §1). No speculative key: it enters
  with its semantics or not at all.
- **EC's `op_contracts`** — the MECHANIZED emit contract (per
  offerable op: required fields, domains, assertions, evidence
  obligations) stays EC's, after the MVP cut. This chapter's
  emit-envelope catalog entry is an INTERIM prose carrier and says so.
- **The `round ≥ 2` converge gate in the shipped template** — the
  model's config instance pairs the block with a real gate; adding
  that gate would change how OUR pair-workflow runs (the reviewer
  could no longer converge in round 1). That is a product decision,
  deliberately not made as an L2b side effect (user, 2026-07-25).

### 13.2 Coverage and intake impact

Unit ownership: **4 ids** (all `l2b-pseudocode`) — two new-name units
(`assemble_context_blocks`, `validate_context_refs`) and two reprints
(`CREATE_INSTANCE`, `dispatch_intent`) whose dispositions the owning
packets declare (the authoring-time discovery is the authority).
Rejections: **ZERO new behavioral** — the 54-name registry is
byte-untouched, because `unresolved_context_block_ref` is a
definition ISSUE code, not a registry rejection name; the drift lanes
must be green before AND after. Invariants: **6**, dispositions
already fixed by the ch-5 map (4 `test` / 1 `type/schema` /
1 `review`) — no checker, so `storeCheckers` is untouched. Chapter
traces: **1 golden trace** (`l2b-pseudocode`) — the rule renders for
the actor who could emit the gated transition, is ABSENT for one who
could not, and a multi-source id renders once with both sources
retained. No IC/PI intake rows flip: map-extension surface.

Carried IN from ch 9 (§1.3 carried items): the EPIPE product item
(realized at P0) and the DETACHED realized-map arm audit of
`ch9-runner-contract.md`, whose deadline is THIS chapter's close —
inherited as a close obligation (§13.5). The §1.3 carried item (3),
the MVP-cut vs v1-parity re-read, is due at this chapter's BOUNDARY,
before the plan sequences what follows — a boundary-review duty, not
a build blocker.

### 13.3 The draft phase

Before ANY packet (README §4):
`contracts/ch13-context-block-contract.md` (surface: `context-block`).
Indicative C-row set — the draft decides, this list only scopes it:
the three YAML keys' camelCase spelling, their attachment points, and
their keyset rules; the catalog entry's fixed keyset and its
unknown-key disposition; the packet field's TS shape and how the
three provenance source kinds are spelled (including the
gate-binding pair of step + event); the admission finding's lane
(path form, the `code` carrier, accumulate-vs-short-circuit against
ch8-C21/C36); the empty/absent matrix (no catalog and no refs; a
catalog present but unreferenced; an empty ref list; the same id
reached from a role AND its step); the render's behavior when a gate
ref's binding is not offerable; and the shipped catalog entry's
PRESENCE rule (its id and that it exists — its prose is packet-time
authoring, not a contract row). REQUIRED row (user-ratified
2026-07-25): a catalog-authoring CAVEAT — a block body that states a
gate's configured VALUE can go stale against that gate, and nothing
detects it (the two declared L2b Absents, `computed-templated-bodies`
and `semantic-parity-check`, are the missing capability; the ref
check proves resolution, never parity). The caveat is placed where
the risk is CREATED, not where it is suffered: this row plus the
§13.1 item 4 template comment. Neither enforces — they aim, and the
enforcing form is deliberately out of chapter (§13.1). Ratification
is permanently human;
packets anchor as `contract:ch13-context-block#Cn`.

**Superseded, and its successor (aligned at the ch13 contract-v2
ratification, 2026-08-08):** the `context-block` draft named above was
superseded 2026-08-05 (record in its own file; oracle branch
`ch13-prose-line`, authorizing plan `ch13-rederivation-plan.md`). The
live surface is `contracts/ch13-context-block-v2-contract.md`
(surface: `context-block-v2`), authored on the ADR-019 declared-schema
substrate; the indicative C-row list above described the prose line
and is history. Packets anchor as `contract:ch13-context-block-v2#Cn`
— an anchor into the superseded draft is lint-red. Ratification is
permanently human, unchanged.

### 13.4 Packets and flow mode

Draft reference (§1.3 convention):
`contracts/ch13-context-block-v2-contract.md` — the successor of
`contracts/ch13-context-block-contract.md`, which was NOT YET RATIFIED
at this chapter ratification, was ratified 2026-07-26 and superseded
2026-08-05 (aligned at the ch13 contract-v2 ratification, 2026-08-08);
the draft round runs FIRST, before any packet, so the prediction bases
below are visibly CONDITIONAL per the §1.3 convention.

| Packet | Content | Mode |
|---|---|---|
| ch13-P0 | the EPIPE hygiene fix: the shipped CLI entrypoints' output sinks survive a closed pipe (quiet termination instead of a raw stack; scope aligned at ch13-p0 pre-approval, 2026-07-26 — both entrypoints and the shared dispatch shell), its behavior contract decided against the ch6-P4a canonical exit-code matrix, with the claim-derived negative lane; empty ledger slice (a DECLARATION, not an omission — the ch9-P1 precedent) | human approve (the row carries its own new decision — the closed-pipe behavior contract — and §1.3's consistency rule bars an invention-predicted row from flag-free autonomous mode); predicted: invention (memo-born — basis: the ch9 boundary verdict; the enum's closest fit, the basis being a boundary verdict rather than a design memo) |
| ch13-P1 | the definition side: the three context format keys + the catalog on the parsed template, `validate_context_refs` under `admit_definition`, the `unresolved_context_block_ref` issue lane on the established named-lane carrier, the CLI validate extension | flag-free approve → autonomous build (measurement; the §5.5 fallbacks stand); predicted: projection (basis: the chapter draft — pending ratification) |
| ch13-P2 | the dispatch side: `assemble_context_blocks` (order, dedup, retained provenance), the packet's context-blocks field, the gate-ref predicate over ch11's authority logic, the `l2b-pseudocode` golden trace, the shipped template's first catalog entry (the emit-envelope block) + the catalog-authoring caveat comment beside it (§13.1 item 4), the l0c golden-trace re-pin (the C4 fixture disposition), and the journey smoke through the shipped entrypoint | flag-free approve → autonomous build (measurement); predicted: projection (basis: the chapter draft — pending ratification) |

Order: draft ratification (carrying the ch11 reopen act — C4 + C30
+ the C41 comparative clause; the draft's C16 carrier row; aligned
at the ch13 draft round, 2026-07-26) → P0 → P1 → P2 (the README §4 draft-first
rule binds without exception — P0 anchors no draft row but still
follows the ratification, the ch12-P0 precedent). P1 before P2 is the
definition → dispatch dependency: the render reads the parsed
catalog. The §8.2 no-speculative-keys stance binds at CHAPTER grain —
a key never ships without its semantics in the same chapter — so P1's
keys being consumed only at P2 is inside the stance, not an exception
to it. One packet = packet file + code + tests in ONE commit.

**Re-derivation alignment (aligned at the ch13 contract-v2
ratification, 2026-08-08):** the order above is the PROSE line's and
stands as history — its draft ratification and the ch11 reopen act it
carried (C4 + C30 + the C41 comparative clause, the SUPERSEDED draft's
C16 carrier row) both EXECUTED on 2026-07-26, and P0 landed. The live
order from that point is: contract v2 ratification → the ch13-p1 v2
packet (`ch13-rederivation-plan.md` phase P5 — definition side and
dispatch side; the P1/P2 split of the table above is the prose line's
and does not bind the re-derivation). The v2 draft carries NO
cross-contract reopen act: the ch11 binding keyset is already
ch11-C4's realized text. The live packet's row values, recorded HERE
at the v2 ratification (the §1.3 convention's recorded-at-ratification
rule): **ch13-p1 v2** — content: the definition side and the dispatch
side in one packet (declaration growth + the C13 normalizer hook and
carry-list growth, the C9 lane, the render and the packet field, the
registry flips, the C16/C18 fixture duties); mode: flag-free approve →
autonomous build (measurement — the §5.5 fallbacks stand, the two
transitional external-arm gates unchanged); predicted: projection
(basis: `contracts/ch13-context-block-v2-contract.md` — the surface
this act ratifies). A
split into ch13-p1a/p1b inherits this row's values unchanged.

**The split, EXECUTED (aligned at ch13-p1a pre-approval, 2026-08-08):**
the row above's pre-authorization was taken — the combined scope trips
two risk-gate hard stops (authority movement together with new runtime
behavior turned on; one concept across 3+ surfaces) and the
implementation-closure proof fails, the assessment being materialized in
`packets/ch13-p1a-context-definition.md`'s `## Sizing/risk`. Shape:
`foundation → activation`, depth 1, coverage union preserved.

**This is ch13's LIVE Packets-and-flow-mode table**, and the mechanical
next-packet derivation reads it: the prose-line table earlier in this
section is history, and its `ch13-P1` / `ch13-P2` rows never acquire
packet files.

| Packet | Content | Mode |
|---|---|---|
| ch13-p1a | the definition side: the declared ch13v2 lanes DRIVEN at the admission entries on both channels, the C13 declaration growth (the two admission-produced ref positions) with its normalizer hooks, engine growth and carry-list growth, the C9 hygiene lane, the C13 type grain, the C18 code-travel lanes, the catalog + ContextBlockRef registry flips, and the schema re-lock act its own build triggers | predicted class inherited from the ch13-p1 v2 row (projection); the MODE resolves to **human approve** (STOP `4:flagged-approve`) — the packet carries new-decision rows and `approve-ratified` routes, so the parent row's flag-free⇒autonomous letter does not reach it (the ch13-P0 row is the precedent for recording this in place) |
| ch13-p1b | the dispatch side — its content is enumerated ONCE, in `packets/ch13-p1a-context-definition.md`'s out-of-scope row, and deliberately not repeated here, so the two cannot drift | inherited from the ch13-p1 v2 row; predicted: projection. The inherited flag-free-⇒-autonomous letter REACHES this packet and its §5.5 condition then fails at authoring: the packet carries five `approve-ratified` routes (the shipped catalog entry's authored body, this mode record, the build-choice names, the de-discriminated compile-negative, and the render's signature deviation from the unit's spelling) and one new-decision row, so the MODE resolves to **human approve** (STOP `4:flagged-approve`) — recorded in place at ch13-p1b pre-approval, on the ch13-P0 / ch13-p1a precedent |

Order: ch13-p1a → ch13-p1b (the render reads the admission-produced ref
positions, so the producer precedes its consumer). Human acts sit
INSIDE that order and are not packet boundaries; which acts, and their
commit choreography, are recorded in ch13-p1a's own D4 and D6 and
ride its approve rather than being settled here (disambiguated at
ch13-p1b pre-approval — p1b carries unrelated rows of those ids). The §8.2
no-speculative-keys stance binds at CHAPTER grain, so p1a's produced
positions being consumed only at p1b is inside the stance — the same
reading the prose line's P1/P2 order already carried.

Mutation-pilot flow note: the pilot DUAL-RUNS beside arm gate-2 on
every packet of this chapter, catches labeled code-mutation vs
input-domain. This is the pilot's SECOND data chapter — its
pre-declared two-chapter window CLOSES at this boundary, which
decides keep or stop.

### 13.5 Deliverables and DoD

Shipped: this section; the ratified-then-realized
`ch13-context-block-v2` contract-draft (its superseded predecessor
stays in the tree, frozen, as the decision record — aligned at the
ch13 contract-v2 ratification, 2026-08-08); the EPIPE fix; the
definition-load ref check + its issue lane; the three context format
keys; the dispatch-time render + the packet field; the shipped
template's first catalog entry; the journey smoke.

DoD: the packets' contract tests green with claim-derived negatives
EXECUTED; the `l2b` golden trace green; the drift suite green (the
unit-map lock extends with the 4 ids; the 54-name registry
byte-untouched — zero new behavioral rejections, asserted before AND
after; the three l2b entity rows of the domain registry flipped
realized by their owning packets — the registry test pins key sets,
not dispositions, so the flip is a named duty, never gate-caught);
invariant dispositions realized per the ch-5 map (no checker
added); coverage validation green; all v3 bridges + the FULL
`pnpm ci:local` gate green; the draft flipped `realized`-in-place
with its `realized_map` and `pnpm v3:realized-map` GREEN inside the
close act; the ch-13 map row flipped; `pnpm v3:deferred --closed ch13`
clean; the dogfooding checkpoint run-or-waived (a hand-driven run
whose actor's `packet.json` carries the catalog block — the
acceptance floor's live half); process-log review held at the
boundary, including (a) the `model-tier-experiment-2.md` §7
arm-comparison entry — the FIRST Opus-arm chapter, read against ch9's
Fable data on same-band packet pairs; (b) the mutation-pilot
second-chapter yield read and its keep/stop verdict; (c) the
INHERITED detached realized-map arm audit of `ch9-runner-contract.md`
(§1.3 carried item 2 — its deadline is this close); (d) the §1.3
carried item (3) MVP-cut vs v1-parity re-read, due before the plan
sequences the chapters that follow; and (e) the
reopen-vs-aggregate-note criterion (first applied at the ch13 draft —
its Context carries the applied form): decide its promotion to a
standing README rule or its retirement — until then the SUPERSEDED
`ch13-context-block` draft's Context is its only home (the v2 draft
does not carry the criterion — aligned at the ch13 contract-v2
ratification, 2026-08-08; that file is frozen and never-copy, so a
promotion decision must lift the criterion OUT of it rather than
leave it sitting there), and this line is the carrier that keeps
that decision from silently lapsing; a DEFERRED decision enters §1.3
as a carried item (the standing cross-chapter carry form), never a
silent lapse; and (f) the integer-like key-ban candidate on the
ch8-C10 namespace (owner-raised at the ch13 draft ratification round,
2026-07-26): canonical integer-form string keys (`"2"`, `"10"`) are
legal event-type/step-id spellings today and are the exact class JS
record enumeration re-orders (the ch13 PROBE-CB3 measurement,
recorded in the superseded `ch13-context-block` draft's frozen
Context; the v2 draft's C10 handles the corner honestly, so ch13 does
not need the ban — aligned at the ch13 contract-v2 ratification,
2026-08-08) — that class name REFINED at ch13-p1b pre-approval, whose
own probe measures the re-ordering class as the canonical decimal
spellings of 0 … 2³²−2 only, so `"4294967295"` is such a key and does
NOT re-order (re-confirmed at that packet's build; a disagreeing
re-execution corrects this line in the same commit) — the boundary decides ADOPT (a ch8-C10 reopen in its own act,
with migration text; an untruncated draft-time sweep found ZERO
affected files, so the ban is free now and only gets more expensive
with time) or WATCH; a deferred adoption likewise enters §1.3 as a
carried item; and (g) the ch11 POINTER MAINTENANCE (routed here by
the ch13 contract-v2 draft's named carried scope, 2026-08-08):
`ch11-gate-format-contract.md` names `contract:ch13-context-block#C6`
in C4, C30, C41, the fourth reopen record and two `realized_map`
entries (a third map entry mentions the reopen act without carrying
the pointer) — the pointed-at SEMANTICS are carried unchanged by
ch13v2-C6, so this is pointer maintenance, not meaning drift, and no
lint catches it (the realized-map scanner matches same-contract refs
only; the packet-anchor rule is manifest-scoped). The boundary
decides REPOINT (a ch11 annotation act, tense/pointer conversions
only) or LEAVE-WITH-RECORD; either way the decision is recorded,
never a silent lapse.

And (h) THE CAPABILITY-PROFILE DISPOSITION (routed here 2026-08-11
from the ch13-p1b approve, where the shipped `availableOps` wording
put the question in front of the user). The L1 `CapabilityProfile`
is TYPE-LEVEL ONLY — the authoring format rejects the key
(`domain/template.ts`) — and its `not_authorized` branch has been
dormant since L1 by declaration. Four findings, each checkable
against tree bytes, say the dormancy is not merely "not yet used":
(i) EVERY live call passes `step.role` — `capability(template,
step.role, …)` at l1/l2/l2a/l2b/l3/l5/emit-contract and at
`kernel/kernel.ts`'s single call site — and the role-authority
rejection precedes it, so a profile entry for any OTHER role is
unreachable; (ii) the natural wake-up ARRIVED and went around: L3's
operator path is a separate input class with its own
`operator_not_authorized`, stated in `l3-pseudocode/SUBMIT_DECISION`
as "NOT the L1 actor-envelope gate"; (iii) at L5 the derived set
outgrew the step graph — `event_types_of(step.transitions) ∪
({HELP_REQUEST} IF step.help is declared)` — while an authored
profile REPLACES that set wholesale, so a profile written to narrow
one op silently disables the ask unless it re-lists `HELP_REQUEST`,
and NOTHING guards that (a template-validation invariant of exactly
this shape — explicit entries may only narrow, never invent — was
asked for in the L1 design round and never built); (iv) the offer
side is already repaired in the model but not in the tree:
`emit-contract-pseudocode/offerable_ops` calls capability AS THE
FUNCTION so an authored filter reaches the offered ops, whereas the
shipped `deriveDispatchIntent` still sets `availableOps` from
`Object.keys(step.transitions)` alone. The boundary decides GUARD
(build the never-built invariant, extended to op-family ops, and
land the offer-side intersection), RETIRE (narrowing lives in the
step graph; an ADR/model act removes the construct), or
KEEP-WITH-RECORD (carry the hazard with the reason stated). Two
model-ledger `→ later` items are the same question and move with it:
`l1 · authored-capability-restrictions-in-the-baseline` and `l1 ·
capability-filtered-packet-ops` — authored restrictions are only
safe once the offer side filters, which is what (iv) is about. The
model's own L1 illustration (`capability_profile: - { role:
reviewer, step: review, allow: [converged] }`, unchanged since
2026-06-14) narrows a SINGLE-ROLE step and so instantiates neither
motivating case the design round argued from (an operator-only
button; `human_question` from either role) — both of which are
cross-role, hence unreachable per (i); it is replaced or removed
with whichever disposition wins. PROVENANCE, recorded because the
history is not in this repo: the L1 design round ran on 2026-06-14
across two sessions relaying through the user by copy-paste — Claude
`e5616c72-61ee-4b7b-8894-b50eba6d1e98` and Codex rollout
`019ec0f4-ec0f-7b02-bef5-456797d3d0ca` — and a rendered
reconstruction of that hour exists outside the tree; the user brings
it into the boundary session if the history is wanted. No finding
above depends on it.

## Chapter 14 — Human decision core: the L3 human_gate + bare wait + operator decision intents (ratified 2026-08-14)

(autonomy stage: **measurement** — flag-free panel approves proceed
to build autonomously THROUGH the two transitional external-arm gates
(README §5.5, arm-pin.md); flags, STOPs, and the draft ratification
route to the human. Main-thread arm: **Fable-class** — the
alternating rule's assignment (`model-tier-experiment-2.md` §2: ch13
was the experiment's first Opus chapter), recorded in its §8 log at
this ratification; the TIER-RECORD rule binds (arm-pin.md — a record
names a model tier only machine-confirmed). The mutation-testing
pilot is STOPPED (ch13 boundary verdict (b)) — no dual-run beside
the arm gates; the wiring stays.)

The **fourth live use of the §1.3 map-extension mechanism** (ch 11
closed VALIDATED; ch 12, ch 13 followed) — and the first whose entry
derives NOT from a prior named candidate but from the ch13 boundary's
CRITICAL-PATH note (2026-08-13): the MVP cut's own remaining critical
path is L3 + L4, neither owning a chapter. This chapter enters L3 —
the largest unbuilt pre-cut slice (18 pending units); L4 remains on
the critical-path note as its carrier. Numbered 14 (arrival order),
build order after ch 13. No PI item: model-ladder surface.

**What the layer is for.** L2/L2a/L2b gated and communicated MACHINE
policy; L3 introduces the human as DECISION-MAKER — and the human is
a different mover: a decision is an operator-intent on a
WAITING(human_decision) state (a KICKOFF sibling), never an actor
envelope through HANDLE's ACTIVE path, so ACTIVE stays honest ("an
agent is working") and WAITING means "blocked on a human." A
`human_gate` step parks the instance and records a DECISION_REQUEST;
the operator's decision routes the workflow through the gate's
`decisions` map — a keyed routing map whose keys the kernel does not
know (`approve` / `request_rework` are the anchor's vocabulary, not
the kernel's). With it comes the WAITING axis's missing other half:
the minimal `type: wait` bare wait and its RESUME_WAIT (the
`commit_pending` ⇐ COMMIT anchor) — a decision targeting a wait
would otherwise dead-end. The narrowest Ask — not a general human
platform (the agent-initiated ask-human/help reply is L5).

**Opening dispositions (user, 2026-08-14 — the scoping round):**

1. **LC3a stays OUT; the sharedness is contract-level, not
   chapter-level.** The scoping question was explicitly "how much
   must these two share one contract." The model's own answer: the
   routing map is ONE construct (the wave-4 **ChoicePoint** —
   `decisions` and `outcomes` are the same keyed map, different
   selector authority), the arrival spine is one unit
   (`apply_target_entry_effects`), and the Ask family is one
   (**Directive**); but the CAS-claim run protocol, the ActionRunner
   leg, and the recorded-vs-derived ask weight are genuinely LC3a's
   own machinery. Resolution: this chapter's draft declares the
   ChoicePoint C-rows at the SHARED grain (key →
   `{ target, payload? }` — `emits` deliberately absent: the §8.2
   chapter-grain rule, no key without its consumer), with L3's
   `decisions` as the first live instantiation; LC3a enters as the
   seventh named §1.3 candidate with the adjacency binding and the
   anchoring duty (its draft EXTENDS these rows additively, never a
   parallel shape). Scale was the second ground: 18 units is
   ch11/ch12-scale; 29 would exceed every precedent and muddy the
   chapter's Fable data point in the tier experiment.
2. **Acceptance floor = capability AND shipped wiring** (the ch13
   opening-disposition-1 precedent, R-ACTIVATION-JOURNEY): the
   shipped `local-pair-v0` template gains the `operator` role, the
   converge route's target flips to a `human_approval` `human_gate`,
   approve targets a `commit_pending` `type: wait` (⇐ COMMIT →
   done), request_rework returns to implement — and a journey smoke
   proves park → decide → resume through the shipped entrypoint.
   This is v1-faithful (READY_FOR_HUMAN_APPROVAL and the commit wait
   are v1's live behavior), so no product decision is smuggled; the
   known two-step (`commit_pending` grows into `commit_action` at
   LC3a) is the model ladder's own rhythm, accepted. Existing golden
   traces re-pin where the template change reaches them — a named
   duty, not a side effect.
3. **The integer-key ban bundle rides here** (ch13 boundary verdict
   (f) named "the next format-touching chapter" as carrier, and this
   is it): the ban itself, the ch8-C10 reopen, the schema re-lock,
   and the ch13v2-C10 narrowing land with this chapter — the reopen
   act rides the draft ratification (the
   ch13-draft-carrying-the-ch11-reopen precedent).
4. **Two standing carriers explicitly NOT taken:** plan carried item
   (4) (spawn-outcome diagnostics) belongs to "the next
   runner-touching chapter" — this chapter spawns nothing; it lands
   with LC3a (runner-touching by construction, recorded in the
   seventh candidate's bindings). The sixth named candidate
   (gate-config declarations as data) belongs to "the next
   gate-surface-touching chapter" — `human_gate` is a STEP type in
   the kernel/definition plane, not the `gates/` L2 surface; not
   taken.

### 14.1 Scope and boundaries

**In scope:**

1. **The three-entry spine.** `SUBMIT_DECISION` (a new
   operator-intent handler, KICKOFF's sibling) and `RESUME_WAIT`
   join `HANDLE`; each keeps its own guards and its own commit, and
   all three share ONE
   `apply_target_entry_effects(instance, template, from_step_id,
   target)` — the target-entry rule factored OUT of HANDLE's inline
   form so the entry paths cannot drift — plus the shared
   `post_commit_output` that reads the resulting status (dispatch /
   Ask / nothing / terminal).
2. **The human_gate step type.** `park_for_human_decision` parks
   WAITING(human_decision) + appends DECISION_REQUEST (recipient,
   declared decision keys, recommendation + recommendation_source,
   context ref) INSIDE the same atomic arrival commit — no
   half-entered gate; `SUBMIT_DECISION` guards (wait.kind,
   request_ref correlation, operator authority via the binding, CAS,
   op_id) and appends DECISION_MADE; the override rule — `override`
   required exactly when the chosen key ≠ the recorded
   recommendation (`override_required` / `override_not_applicable`);
   per-decision required payload fields, delivered as the rework
   target's first-dispatch handoff.
3. **The bare wait.** `type: wait` declares
   `wait: { kind, resume_events }` + `on_resume`; arrival parks
   WAITING(kind) with NO Ask; `RESUME_WAIT(event)` resumes on a
   matching event (WAIT_RESUMED) via `on_resume` — the anchor
   realizes `commit_pending` ⇐ [COMMIT] → done. Result payloads, the
   resume ACTION, child-event sources (L4), timeouts/correlation
   (L9) are declared Absents.
4. **admit_input.** The admission ladder's load-first companion
   (announced at L0d): the two operator ops fold their guard heads
   into it; the one deliberate behavior delta is F-W4-2 (a
   version-less operator intent gets the ladder's `missing_version`
   entry guard, never an absent-vs-current `Stale`).
5. **validate_decision_gates.** Definition-static validation of
   `human_gate` and `wait` declarations under `admit_definition`,
   beside the existing definition-static family — issue codes on the
   established named-lane carrier; lanes and
   accumulate-vs-short-circuit per the draft.
6. **The format's decision/wait surface** (§8.2 stance): the two
   step types, the `decisions` map, the wait declaration +
   `on_resume`, the `operator` role — camelCase realization per the
   established rename culture (ch11-C13/C16/C37, ch12, ch13);
   unknown keys are ADMISSION issues per the ch8-C13 fail-closed
   culture.
7. **The integer-key ban bundle** (opening disposition 3).
8. **The operator surface.** CLI verbs for the two intents
   (submit-decision, resume) beside ch12's lifecycle verbs; the
   floor's detail read shows the pending Ask (HumanDecisionRequest
   is local/derived delivery — a durable channel is L8).
9. **The shipped wiring + journey smoke** (opening disposition 2) +
   the `l3-pseudocode` golden trace.

**Out of scope (deliberate):**

- **LC3a action steps** — `type: action`, `RUN_ACTION`,
  `ActionRunner`, `emits` — the seventh named candidate (adjacent
  next chapter).
- **Result payloads on resume; the resume ACTION mechanics** — the
  actual git commit/merge runs are LC3a's.
- **Child-event resume sources** (L4); **timeouts / escalation /
  external-or-fuzzy correlation** (L9); **a durable Ask channel**
  (L8).
- **Warn-sensitive / dynamic recommendation** — the recommendation
  is the firing edge's static `recommends`, recorded with its
  source.
- **Deferred rework; the agent-initiated ask-human/help reply**
  (L5).
- **Carried item (4) and the sixth named candidate** (opening
  disposition 4 — both explicitly not taken, with their carriers
  named).

### 14.2 Coverage and intake impact

Unit ownership: **18 ids** (all `l3-pseudocode`) — new-name handler
and rule units (`SUBMIT_DECISION`, `RESUME_WAIT`,
`apply_target_entry_effects`, `park_for_human_decision`,
`park_for_wait`, `admit_input`, `validate_decision_gates`,
`post_commit_output`), declaration-class units (`choice_point`,
`directive`, `decision_keys`, `required_fields`,
`human_decision_request`, `incoming_recommendation`), and reprints
(`CREATE_INSTANCE`, `RECEIVE`, `HANDLE`, `COMPLETE`) — per-unit
dispositions are the owning packets' authoring-time discovery, the
authority as ever. Rejections: **ZERO new names** — the 54-name
registry is byte-untouched (every decision/wait name shipped with it
on day one); the chapter's contribution is the BEHAVIORAL scoped
extension over ~11 of them (`not_awaiting_decision`,
`decision_request_mismatch`, `operator_not_authorized`,
`unknown_decision`, `missing_required_field`, `override_required`,
`override_not_applicable`, `not_waiting`, `not_bare_wait`,
`resume_event_mismatch`, `no_resume_transition` — plus
`Stale`/`Duplicate` on the two new operator paths and the F-W4-2
`missing_version` canonicalization). Invariants: **8**, dispositions
fixed by the ch-5 map (5 `test` / 1 `type/schema` / 1 `review` / 1
**`checker`** — `l3/waiting-is-honest`, landing on the EXISTING S5
wait⇔WAITING iff checker in `storeCheckers`; whether it extends or
is already satisfied by ch12's typed-wait machinery is the owning
packet's disposition call, stated not assumed). Chapter traces:
**1 golden trace** (`l3-pseudocode`: converge → park + Ask; approve
→ `commit_pending`; COMMIT → done; the alternate override rework
round). Domain registry: the **5 `l3/*` rows** flip realized by
their owning packets (a named duty — the registry test pins key
sets, not dispositions). No IC/PI intake rows flip: map-extension
surface.

### 14.3 The draft phase

Before ANY packet (README §4):
`contracts/ch14-human-decision-contract.md` (surface:
`human-decision`), authored on the ADR-019 declared-schema substrate
(the ch13v2 precedent). Indicative C-row set — the draft decides,
this list only scopes it: the **ChoicePoint keyed-routing-map schema
at the shared grain** (key → `{ target, payload? }`; opening
disposition 1 — `emits` deliberately absent) with `decisions` as its
first instantiation; the two step types' YAML keysets, camelCase
spellings, and attachment points; the wait declaration (`kind`,
`resume_events`, `on_resume`) and its keyset rules; the `operator`
role binding row; the DECISION_REQUEST / DECISION_MADE row shapes +
the override recording rule (override present ONLY when chosen ≠
recommendation); the HumanDecisionRequest TS shape (the
self-contained Ask); `admit_input`'s rung order + the F-W4-2
`missing_version` row; the admission finding lanes for
`validate_decision_gates` (issue codes, path form,
accumulate-vs-short-circuit against ch8-C21/C36); the empty/absent
matrix (a `human_gate` with no/empty `decisions`; an unknown
decision target; an undeclared payload field; a wait with empty
`resume_events`; an `on_resume` key outside `resume_events`; a
decision arriving on a bare wait and a resume arriving on a decision
wait); the **integer-key ban rows** (the bundle: ban + ch8-C10
reopen + re-lock + the ch13v2-C10 narrowing — the reopen act rides
this draft's ratification; aligned at the ch14 draft ratification,
2026-08-15: the act's reopen SET also carries ch8-C9 and ch11-C1 —
the step-class partition's falsified keyset universals — with
ch14-C26 as the normative carrier); and the shipped template's PRESENCE rule
(the gate id, the wait id, and that the wiring exists — its prose is
packet-time authoring, not a contract row). Ratification is
permanently human; packets anchor as
`contract:ch14-human-decision#Cn`.

### 14.4 Packets and flow mode

Draft reference (§1.3 convention):
`contracts/ch14-human-decision-contract.md` — NOT YET RATIFIED at
this chapter ratification; the draft round runs FIRST, before any
packet, so the prediction bases below are visibly CONDITIONAL per
the §1.3 convention.

| Packet | Content | Mode |
|---|---|---|
| ch14-P1 | the definition side: the format's decision/wait keys + the `operator` role, `validate_decision_gates` under `admit_definition` with its issue lanes, the integer-key ban bundle's code half (the re-lock act its build triggers), the registry flips it owns | flag-free approve → autonomous build (measurement; the §5.5 fallbacks stand); predicted: projection (basis: the chapter draft — pending ratification). The inherited flag-free-⇒-autonomous letter REACHES this packet and its §5.5 condition then fails at authoring: the packet carries `approve-ratified` routes (the two amendment placements, the re-lock's doubled red window, the build-choice names, the two registry flips), plus two new-decision rows (the resolved code-grain STOP and the type-relaxation scope call), so the MODE resolves to **human approve** (STOP `4:flagged-approve`) — recorded in place at ch14-p1 pre-approval, 2026-08-15, on the ch13-P0 / ch13-p1a precedent. **BUILD-CLOSE TRACKED ITEM** (aligned at ch14-p1 pre-approval, 2026-08-16, the ratifier's addition at the flag-2 approve): the load guard's REVERSE direction — a declared inventory entry whose READER disappears — is not closed by the inventory and is not claimed to be; it is discharged at THIS packet's build close by an EXECUTED mutation probe (remove the reader, keep the entry) with its receipt, under the standing probe protocol. The receipt is collected from this row, never from the packet's prose |
| ch14-P2 | the kernel core: `apply_target_entry_effects` factored out + `post_commit_output`, `park_for_human_decision` / `park_for_wait`, `SUBMIT_DECISION` + `RESUME_WAIT` over `admit_input` (the F-W4-2 delta), the DECISION_REQUEST/DECISION_MADE transcript pair, the override rule, the HumanDecisionRequest value, the `l3-pseudocode` golden trace | flag-free approve → autonomous build (measurement); predicted: projection (basis: the chapter draft — pending ratification) |
| ch14-P3 | the activation: the two operator CLI verbs + the floor's pending-Ask read, the shipped template wiring (`operator` role + `human_approval` + `commit_pending`), the golden-trace re-pins the template change reaches, the journey smoke through the shipped entrypoint | flag-free approve → autonomous build (measurement); predicted: projection (basis: the chapter draft — pending ratification) |

Order: draft ratification → P1 → P2 → P3 (definition → kernel →
activation: the kernel reads admitted declarations, the activation
wires what the kernel realizes — the ch13 producer-precedes-consumer
reading; the §8.2 no-speculative-keys stance binds at CHAPTER grain,
so P1's keys being consumed at P2/P3 is inside the stance, not an
exception to it). One packet = packet file + code + tests in ONE
commit, with TWO named exception classes. THE FIRST: the schema re-lock a
declaration edit owes each contract bound to it lands in a FOLLOW-UP
commit, because its block records the build commit's own sha (the
form authority's §4 shape), together with the form-authority prose
that act entails. That follow-up is a human act inside the order, not
a packet boundary; its choreography is recorded in the
owning packet's own rows and rides its approve rather than being
settled here (aligned at ch14-p1 pre-approval, 2026-08-15; the
ch13-p1a precedent). In-chapter splits stay the loop's per §5.5.

**THE SECOND named exception class — the INSTRUMENT-LANDING commit
(aligned at ch14-p2a pre-approval, 2026-08-17):** where a packet's
acceptance proof requires a baseline RECOMPUTABLE at a pre-change ref,
the measuring instrument must EXIST at that ref — and a single commit
cannot both introduce an instrument and be the change the instrument
baselines. The reason is stated here so the exception reads as
time-forced rather than convenient, and the two exceptions are mirror
images: the schema re-lock is forced AFTER the build because its block
records the build commit's own sha; this one is forced BEFORE it
because a ref cannot carry an instrument landed later. Every
alternative breaks a ratified rule — a sibling commit is not an
ancestor, and overlaying the instrument onto an old checkout means the
cited ref does not carry it and the instrument's provenance is
unratified.
THE EXCEPTION IS DEFINED BY CONTENT, not by intent, and the definition
is machine-checkable: the instrument commit carries BEHAVIOUR-PRESERVING
TESTKIT ADDITIONS ONLY — the measuring hook and its selftest — and NO
product code, NO declaration bytes, and NOT the packet file. THE
CARRIER OF THAT DEFINITION IS A MACHINE BLOCK, `instrument_manifest`,
and the audit leg that reads it was BUILT for this exception rather
than assumed: the ratified `--post-build` path could not check the
instrument commit at all — it refuses any commit that does not change
the packet file, which the instrument commit by definition does not —
so the first form of this paragraph named a check that could never run
(caught by the pre-approval arm, 2026-08-17, and closed in the same
act). The realized shape binds the two commits together: declaring the
manifest makes the BUILD commit's audit also audit its FIRST PARENT —
nonempty change list, no packet file, a subset of the manifest whose
own paths must all sit under the testkit (so "no product code" is
refused at DECLARATION time and not merely at audit time), and
ADDITIONS ONLY (every entry a git addition), and ORDINARY BLOBS ONLY
(no symlink, no gitlink). THE THREE AXES ARE ONE CLAIM MEASURED THREE
WAYS, and each was found open in turn at this pre-approval rather than
reasoned about in advance: without add-only, a commit may modify or
delete an existing testkit file, which is inside the manifest by path
while changing what every existing consumer of that file sees; without
the mode leg, an added symlink or gitlink satisfies both other axes
while its bytes live where the confinement never looks. One audit, two
commits, nothing optional to remember; a product path, a non-addition,
or a non-blob in an instrument commit is an audit failure, not a
judgement call. Beside it, the receipt for what no path check reaches:
THE INSTRUMENT COMMIT'S REF MUST CARRY A GREEN `pnpm v3:test` AND A
GREEN `pnpm v3:typecheck`, both recorded in the owning packet's Build
record. TWO COMMANDS, because the suite alone is `vitest run` and a
type-invalid added file passes it while `tsc --noEmit` refuses it —
requiring only the first would leave the typecheck claim below
unbacked, which is a false green in the receipt rather than in the
audit. AND NEITHER COMMAND'S EXIT CODE IS THE EVIDENCE: a file of
skipped cases exits zero from both, so the instrument selftest's proof
of execution is the runner's machine-read per-file summary — passed
> 0 and skipped = 0 — carried in the Build record. Its reach is stated
exactly, because this is where earlier forms of this paragraph
overclaimed in BOTH directions. It is not a proof that the added files
are correct — that is the instrument's own selftest's job, shipped in
the same commit. And it is not blind to them either: an added test
file is DISCOVERED BY THE EXISTING GLOB (`src/**/*.test.ts`), and both
added files are typechecked under `include: ["src"]`, so the suite at
that ref runs the new selftest as well as every old test. That same
glob is why the receipt is REQUIRED and not optional — an addition can
change what an existing run does precisely because existing
configuration picks it up. What remains after all of it is a human
read of the added files, named as a residual rather than a gate. The
build commit that follows is
the ordinary one-commit shape, packet file included. Like the first
exception, this is an act inside the order rather than a packet
boundary, and its per-packet choreography is recorded in the owning
packet's own rows.

**The instrument-landing exception, MEASURED AGAINST ITS OWN CONTENTS
(aligned at ch14-p2a build, 2026-08-18):** the exception above is kept,
and one thing it was built to carry is now known NOT to fit inside it.
The ch14-p2a gate specified a leg that RECOMPUTES a baseline digest at
the pre-change ref, so that a cited ref would have to reproduce its own
number rather than merely be an ancestor. That leg is DROPPED, and the
reason belongs here rather than only in the packet: recomputing at the
pre-change ref requires the measurement to be TAKEN there, and taking it
requires wiring inside an EXISTING file — while the instrument commit
that puts the measuring hook at that ref is ADD-ONLY by the very
confinement that makes this exception auditable. THE HOOK IS ADDITIVE;
ITS CALL SITE IS NOT. So the exception cannot carry an instrument whose
measurement must modify something that already exists, and that is a
PROPERTY OF THE EXCEPTION rather than a defect of one packet's gate.
WHAT IS NO LONGER PROVEN IS NAMED, not inherited silently: a post-hoc
FABRICATED BASELINE — a receipt asserting a digest never computed at the
ref it cites. What stands in its place is less, and is written as less:
the gate's TEXT half remains the primary re-pin guard (the defect class
being a changed expectation, which bytes catch and digests do not), the
instrument commit's ancestry remains a cheap precondition it always was,
and the receipt's claim is scoped to the equality it actually evidences.
Two alternatives were declined with their reasons recorded — relaxing
add-only would reopen a confinement whose carve-out is semantically
uncheckable, and building substitute proof machinery at the ROOT of the
evidence chain, at the last step of a build, runs against this chapter's
measured new-mechanism error rate.

**The ch14-P2 split, EXECUTED (aligned at ch14-p2a pre-approval,
2026-08-16):** the in-chapter split pre-authorization — §5.5's, kept
by the ORDER paragraph above the two exception classes — was
taken — the combined `ch14-P2` scope trips six risk-gate hard stops
and the implementation-closure proof fails. WHICH stops, the per-part
re-evaluation, the closure proof and the coverage-union partition are
materialized ONCE, in `packets/ch14-p2a-arrival-spine.md`'s
`## Sizing/risk`, and are deliberately not restated here — not even in
summary — so the two cannot drift. Shape: `foundation → delivery`,
depth 1, coverage union preserved and declared.

**The prose line above is HISTORY from this point:** its `ch14-P2` and
`ch14-P3` rows never acquire packet files, and its `Order:` sentence is superseded by
the Order line below. **This is ch14's LIVE Packets-and-flow-mode
table**, and the mechanical next-packet derivation reads it.

| Packet | Content | Mode |
|---|---|---|
| ch14-p2a | the arrival half: `apply_target_entry_effects` factored out of HANDLE with its golden-trace parity obligation and the machine gate that distinguishes a compiler-forced narrow from a re-pin, `park_for_human_decision` / `park_for_wait`, `post_commit_output` and the `HumanDecisionRequest` value, the DECISION_REQUEST transcript class with the chapter's one fenced schema bump, the debug bundle's third row class, the wait record's opened kind seam, the binding-coverage role-less skip with the activation guard it makes necessary, the `Step` type relaxation ch14-P1 deferred, and the registry flips it owns | inherited from the `ch14-P2` row (flag-free approve → autonomous build, measurement; the §5.5 fallbacks stand); predicted: projection (basis: the ratified `ch14-human-decision` contract). The inherited letter REACHES this packet and its §5.5 condition then fails at authoring: the packet carries six new-decision rows and six `approve-ratified` routes — each enumerated ONCE, in the packet's own header and flags — so the MODE resolves to **human approve** (STOP `4:flagged-approve`), recorded in place at ch14-p2a pre-approval, 2026-08-16, on the ch14-P1 / ch13-p1a precedent. ONE of those routes is the RATIFIER's own binding condition at that approve, recorded here because it originated outside the packet: the compiler-forced-vs-re-pin distinction must be machine-checkable in both halves rather than narrative; its realization is the packet's K17 |
| ch14-p2b | the delivery half — its content is enumerated ONCE, in `packets/ch14-p2a-arrival-spine.md`'s out-of-scope row, and deliberately not repeated here, so the two cannot drift | inherited from the `ch14-P2` row; predicted: projection. The inherited letter REACHES this packet and its §5.5 condition then fails at authoring: the packet carries seven new-decision rows and nine pre-approval flags, seven of them `approve-ratified` and two `fold-now` — each enumerated ONCE, in the packet's own header and flags — so the MODE resolves to **human approve** (STOP `4:flagged-approve`), recorded in place at ch14-p2b pre-approval, 2026-08-27, on the ch14-p2a / ch14-P1 precedent. The seven are admitted against the test the ch14-p2a approve RATIFIED — a shared forcing origin plus a per-row risk statement, never a count: all seven follow from ONE fact, that the two operator intents are a THIRD ENTRY CLASS, sibling to neither the actor envelope nor the lifecycle intent — from which follow the op-carrying row that is neither a transition nor a lifecycle fact, a guard that must consult a record an earlier commit wrote, an admission that needs rungs no existing ladder parameterizes, the version rung no existing lifecycle intent carries, and a driver no existing harness step can supply. TWO of the seven OPEN A SHARED PRODUCTION SURFACE the actor path also rides (the admission ladder, the diagnostic wrapper), and that pair is the substance of two of the flags. They RAISED NO AXIS, stated here because the obvious reading of the equal Σ is false and this row is what a later derivation reads: two of the three axis inputs FELL against ch14-p2a and the third held EXACTLY EQUAL (rows 20 → 19, boundary 61 → 48 frozen-to-frozen, derived+new-decision 13 → 13 with the mix inverted), and Σ=7 is EQUAL because the two that fell fell WITHIN their bands rather than across a threshold. The shared-surface reach is what keeps the boundary axis over its edge, never what pushed the index up; the packet's difficulty-index paragraph carries the arithmetic. A FURTHER cut would be depth 2 and therefore NOT the loop's; the packet's `## Sizing/risk` records the eleven-stop walk (seven trip), the six consume families, and the closure proof WITH its falsifier (the proof fails if the replay closures are deferred, because the golden trace runs the checker kit) |
| ch14-p3a | the operator surface: the floor's pending-Ask read with the definition-store dependency C21 names, kept at C21's two values with no unavailability member elected anywhere, the two operator CLI verbs with their one-read resolution, `submit-decision`'s `--by` default and per-flag absence class, and an activation journey over a STAGED gate template | inherited from the `ch14-P3` row (flag-free approve → autonomous build, measurement; the §5.5 fallbacks stand); predicted: projection (basis: the ratified `ch14-human-decision` contract). The inherited letter REACHES this packet and its §5.5 condition then fails at authoring: the packet carries TWO new-decision rows and FOUR `approve-ratified` routes — each enumerated ONCE, in the packet's own header and flags — so the MODE resolves to **human approve** (STOP `4:flagged-approve`), recorded in place at ch14-p3a pre-approval, 2026-08-28, on the ch14-p2b / ch14-p2a / ch14-P1 precedent. The two are a MEASURING-INSTRUMENT decision (a checker's erasure list) and a MODULE HOME. The packet walks the Case-B signal on both limbs: the mass limb does not fire at two rows, and the SEMANTIC limb DOES — the module home is separation — closed not by a classification but by the ratifier's explicit resolution of it at a STOP, twice, the second time after the pre-build arm refused the first home. The chapter's third undecided surface, the disposition of a non-yielded pinned template, was ratified OUT of the packet at this packet's own contract reopen (C27, 2026-08-28) |
| ch14-p3b | the activation half — its content is enumerated ONCE, in `packets/ch14-p3a-operator-surface.md`'s out-of-scope row (X1), and deliberately not repeated here, so the two cannot drift | inherited from the `ch14-P3` row; predicted: projection. The inherited letter REACHES this packet and its §5.5 condition then fails at authoring: the packet carries FIVE new-decision rows and EIGHT pre-approval flags, seven of them `approve-ratified` and one `boundary-review` — each enumerated ONCE, in the packet's own header and flags — so the MODE resolves to **human approve** (STOP `4:flagged-approve`), recorded in place at ch14-p3b pre-approval, 2026-08-29, on the ch14-p3a / ch14-p2b / ch14-p2a / ch14-P1 precedent. The five are a MEASURING-INSTRUMENT decision, two VERIFICATION-CORPUS calls — a re-pin disposition and a membership widening past C24's word `suites`, the latter raised by the pre-ratification arm against an internal close that had cleared it — and two DECLARATION-side elections, a product-facing sentence and the two maps' key order — and the packet walks the Case-B signal on both limbs with NEITHER firing: the mass limb does not fire at five rows (p2a carried six, p2b seven), and the SEMANTIC limb does not either, because none of the five touches authority, separation or availability-class semantics; the instrument row's clearance is argued directly rather than by the p3a-F2 precedent, which does not reach it. The instrument decision is forced rather than reached for: the shipped template's retarget reaches exactly one file of ch14-p2a's K17 gate's four-entry live corpus and reds BOTH its halves correctly, so the gate learns a DECLARED EDIT CLASS whose receipt names `contract:ch14-human-decision#C24` as the delta it is declared against — and which cannot survive its own commit, because a declaration that did would satisfy the inverted checks forever and green a later deleted assertion. Its `## Sizing/risk` records this part's own post-split re-evaluation: ONE enumerated surface (the testkit contract), hard stop 11 binding once and answered by an explicitly narrowed reuse, five consume families reached by a declaration whose authority does not move, and the six-clause closure proof holding WITH its two falsifiers (the proof fails if the boundary acquires a kernel, floor, ingress, store or definition-schema source file, or a CLI source file other than the one named exception; and it fails a second way if the declared edit class grows beyond its one file and one delta, or if its single-use check (g) is dropped) |

Order: ch14-p2a → ch14-p2b → ch14-p3a → ch14-p3b (the arrival precedes
the intents that route through it, the operator's tooling precedes the
shipped workflow that is driven through it, and the activation wires
what the kernel realizes — the same producer-precedes-consumer reading
the P1 → P2 → P3 order already carried).

**The ch14-P3 split, EXECUTED (aligned at ch14-p3a pre-approval,
2026-08-28):** the in-chapter split pre-authorization — §5.5's, kept by
the ORDER paragraph above the two exception classes — was taken a second
time in this chapter. The combined `ch14-P3` scope trips the risk gate
and the implementation-closure proof fails. WHICH stops, the per-part
re-evaluation, the closure proof, the two declined alternative cuts and
the coverage-union partition are materialized ONCE, in
`packets/ch14-p3a-operator-surface.md`'s `## Sizing/risk`, and are
deliberately not restated here — not even in summary — so the two cannot
drift. Shape: `delivery → activation`, depth 1, coverage union preserved
and declared.

### 14.5 Deliverables and DoD

Shipped: this section; the ratified-then-realized
`ch14-human-decision` contract-draft; the three-entry spine + the
shared target-entry rule; the `human_gate` and bare-wait step types
end to end (park → decide/resume → route); `admit_input`;
`validate_decision_gates` + its issue lanes; the format's
decision/wait surface; the integer-key ban bundle; the two operator
verbs + the floor's Ask read; the shipped template wiring + the
journey smoke.

DoD: the packets' contract tests green with claim-derived negatives
EXECUTED; the `l3` golden trace green; the drift suite green (the
unit-map lock extends with the 18 ids; the 54-name registry
byte-untouched asserted before AND after; the 5 `l3/*`
domain-registry rows flipped realized by their owning packets);
invariant dispositions realized per the ch-5 map INCLUDING the
`waiting-is-honest` checker disposition resolved
(extend-or-satisfied, stated in the owning packet); the F-W4-2 delta
realized and tested on BOTH operator paths; coverage validation
green; all v3 bridges + the FULL `pnpm ci:local` gate green; the
draft flipped `realized`-in-place with its `realized_map` and
`pnpm v3:realized-map` GREEN inside the close act; the ch-14 map row
flipped; `pnpm v3:deferred --closed ch14` clean; the §1.3 header
"Chapters present" range updated (done at this ratification, the
ch11-minted duty); the boundary review runs per README §6/§7 with
the seventh candidate's adjacency binding on its reading path.
