# V3 Implementation Plan

Written chapter by chapter, each chapter proposed → ratified → committed
(process: [`README.md`](README.md) §3). Chapters present: 1–2.

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
[`../convergence/implementation-contract.md`](../convergence/implementation-contract.md)
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
| IC-A1 | `CT-A1-DUP` — two racing deliveries of the same `(instance_id, op_id)` → exactly one commit, one `Duplicate` | ch 4 | planned(ch 4) |
| IC-A1 | `CT-A1-COLLISION` — after a committed actor emit, same `op_id` with a different payload/contract identity → `Rejected(op_id_collision)`, NOT `Duplicate` (the EC digest branch) | ch 5 | planned(ch 5) |
| IC-A1 | `CHK-A1-SCHEMA` — the store carries `UNIQUE(instance_id, op_id)`, enforced in the same atomic commit as the instance CAS | ch 4 | planned(ch 4) |
| IC-A1 | `CHK-A1-DIGEST` — actor-emit committed facts store `payload_digest` (rejected attempts record nothing) | ch 5 | planned(ch 5) |
| IC-A1 | `REV-A1-TXN` — transaction-boundary checklist line (op record + CAS under one boundary) | review rubric | realized |
| IC-A2 | `CT-A2-CRASH` — crash-window test family per errand instance: kill between claim commit and effect; between effect and completion marker | ch 9 | planned(ch 9) |
| IC-A2 | `CT-A2-CONFIRM` — a no-error/no-ack outcome is a distinct non-terminal state, never success | ch 9 | planned(ch 9) |
| IC-A2 | `CT-A2-RETRY-DURABLE` — delivery/effect retry budget survives a process restart (durable ledger state, not memory) | ch 9 | planned(ch 9) |
| IC-A2 | `CHK-A2-IDEMKEY` — the egress adapter interface REQUIRES an idempotency-key parameter (type-level; the fake egress adapter implements it first) | ch 3 | planned(ch 3) |
| IC-A2 | `ADR-A2-EXT` — trigger: an external system that cannot accept an idempotency key | ADR machinery | deferred(trigger) |
| IC-A3 | emit-lib — `op_id` derivation in ONE audited implementation, shared by the scripted actor (ch 3) and the operator CLI (ch 6); named deliverable | ch 3 | planned(ch 3) |
| IC-A3 | `CT-A3-RETRANS` — resend-without-ack reuses the `op_id` → kernel answers `Duplicate` | ch 5 | planned(ch 5) |
| IC-A3 | `CT-A3-EMITLIB-REFRESH` — the emit-lib derives a NEW logical `op_id` from a fresh context packet after `Stale`. This is an emit-lib contract, not a kernel rule: the kernel only answers `Stale`, and rejected attempts never consume the idempotency key | ch 5 | planned(ch 5) |
| IC-A3 | `ADR-A3-IDSCHEME` — content-addressed vs request-scoped-nonce `op_id`, decided per operation family | ch 3 | planned(ch 3) |
| IC-B | `CT-B-TWOWORKER` — two workers process the same instance stream; correctness is winner-independent (kit-driven in ch 5; re-run under the real runner in ch 9) | ch 5 | planned(ch 5) |
| IC-B | `REV-B-LOCAL-NOT-AUTHORITY` — no code path treats a local lock/cache as authority; claiming (`SKIP LOCKED` etc.) is scheduling only | review rubric | realized |
| IC-B | `ADR-B-FENCE` — fencing-token watch: fires only if a future shape adds a lease-holding worker writing out-of-band to a shared external resource | ADR machinery | deferred(trigger) |
| IC-C | `CHK-C-TS-SOURCE` — `DECISION_MADE` timestamps come from the commit/append boundary (DB default / commit metadata), never client-supplied | ch 4 | planned(ch 4) |
| IC-C | `CT-C-PURGE-AUDIT` — the LC4 purge contract test: the decision audit floor survives a purge | ch 5 | planned(ch 5) |
| IC-C | `REV-C-PROJECTIONS-READONLY` — analytics/metrics/UI readers consume projections, never write audit tables | review rubric | realized |
| IC-D | `CHK-D-NOCLOCK` — lint: kernel code contains no direct wall-clock read; all time flows through the injected `TimeSource` | ch 3 | planned(ch 3) |
| IC-D | `CHK-D-TESTCLOCK` — every time-dependent contract test runs on the controlled clock; a test needing a real sleep fails this check | ch 3 | planned(ch 3) |
| IC-D | controlled clock — named test-kit deliverable (PI-1) | ch 3 | planned(ch 3) |
| IC-E | `CHK-E-SUITE-ON-KIT` — CI wiring: the entire `CT-*` suite runs against scripted actor + fake egress + deterministic gate/process fixtures; the suite passing IS the proof | ch 3 | planned(ch 3) |
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
| 3 | Test kit: scripted actor, fake egress adapter, fixture convention, deterministic gate/process fixtures, controlled clock (IC-D), emit-lib (IC-A3), **coverage-accounting script** (check.sh culture — PI-11's mechanical half) | PI-1 (+ PI-11 script) | planned(ch 3) |
| 4 | Walking skeleton / bootstrap: minimal ingress→commit, minimal floor read, injected clock, bootstrap in one thin slice | PI-6 | planned(ch 4) |
| 5 | Ledger→test transfer: the three unconditional drift tests, the chapter-trace golden harness, the invariant post-condition suite + the invariant disposition map (§1.4) | PI-3 | planned(ch 5) |
| 6 | Visibility floor + operator CLI: full floor (`listInstances` / `getInstanceDetail` / `getTimeline` committed-rows-only / live tail), debug bundle with redaction boundary, command + dev verbs, all writes through normal ingress | PI-2 | planned(ch 6) |
| 7 | Kernel diagnostics & structured logging: the named non-authoritative diagnostic channel's concrete form | PI-4 | planned(ch 7) |
| 8 | Template file-format spec: the canonical authoring format; **migrates MD-1** | PI-5 | planned(ch 8) |
| 9 | Runner MVP: local worktree provider, one real actor adapter, process-gate runner, attach channel (tmux observe/takeover); sub-decision: local-worktree only vs headless/cloud | PI-8 | planned(ch 9) |
| 10 | Operator recourse card: one page (query via the floor, cancel, deleteRequested; no watchdog/retry until L9) | PI-9 | planned(ch 10) |

**Ordering note (walking-skeleton-first, README §3.4).** Chapter 3 before
chapter 4 does not contradict the principle: ch 3 is the constraint-sink /
test-kit **foundation** the skeleton runs on (controlled clock, scripted
actor, fake egress, emit-lib); the first **runtime code slice** is still the
ch 4 walking skeleton.

**MD-1 (declared migration debt).** Chapter 4's walking skeleton instantiates
from a **fixture-form template** (hardcoded, test-kit shaped) so the skeleton
stays thin. The canonical authoring format lands in chapter 8, which MUST
migrate the fixture onto it and retire MD-1. This is a deliberate sequencing
decision, not an oversight.

**PI-11 split.** The task-packet convention, the projection checklist, and
the ramp-marking rule are realized by this chapter (the template file is the
named deliverable). The coverage-accounting **script** is planned(ch 3); its
accounting *rules* — the in-scope inventory it asserts over — are fixed in
§1.4 below.

### 1.4 The in-scope inventory (coverage-accounting basis)

Per README §5.4, "in scope" is a plan decision. The round-1 inventory:

- **158 pseudocode units — all in scope.** Every unit has exactly one owner
  task packet; shared ownership only by explicit declaration. Ownership
  carries a **disposition** (the template's Units line: `implement` /
  `type/schema` / `test-only` / `generated/mapped` / `alias/inherited` /
  `review-only`) — the ledger's units include declarations, helper
  contracts, overrides, and inherited/reprinted units, and not all of them
  realize as code the same way; the coverage script asserts ownership +
  disposition, never uniform code implementation. The unit→code mapping
  drift test is unconditional (PI-3).
- **85 rejection names — names unconditional, behavior scoped.** The
  implementation's rejection type carries all 85 names from day one (drift
  test); a rejection-branch trace that *triggers* each name is the **scoped
  extension**, scheduled by later chapters over the 85-name checklist.
  Round-1 done does NOT require 85/85 behavioral coverage.
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
- **Domain registry (51 aggregates · 121 entities)** — the type layer is
  checked against ledger §4 (unconditional drift test; the ubiquitous
  language, enforced).
- **140 Absents — NOT implemented.** Realization rule (fail-closed, scoped to
  real surface):
  - If Block A actually exposes a config/API/CLI/emit surface on which the
    Absent could be requested → fail-closed with a **named rejection from the
    85-name registry**. If no existing name fits, that is a model↔code
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
manually during calibration; skill-ification deferred per README §8.

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
  `docs/v3/convergence/model-src/ledger.md` — the model↔code contract
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
| `domain/` | the type layer targeted by ledger §4 (51 aggregates / 121 entities) + the 85-name rejection type |
| `kernel/` | the **port-parametric kernel**: apply/commit logic and invariants, parameterized over the `ports/` interfaces; imports `domain/` and `ports/` ONLY |
| `ports/` | injected dependency interfaces: `StorePort`, `ActorAdapter`, `EgressAdapter`, `GateRunner`, `TimeSource` (IC-D / IC-E as types) |
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

- **Template** ([`../../../v3/adr/_template.md`](../../../v3/adr/_template.md)):
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
