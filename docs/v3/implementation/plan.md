# V3 Implementation Plan

Written chapter by chapter, each chapter proposed → ratified → committed
(process: [`README.md`](README.md) §3). Chapters present: 1–6.

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
| IC-A1 | `CT-A1-DUP` — two racing deliveries of the same `(instance_id, op_id)` → exactly one commit, one `Duplicate` | ch 4 | realized |
| IC-A1 | `CT-A1-COLLISION` — after a committed actor emit, same `op_id` with a different payload/contract identity → `Rejected(op_id_collision)`, NOT `Duplicate` (the EC digest branch) | ch 5 | realized |
| IC-A1 | `CHK-A1-SCHEMA` — the store carries `UNIQUE(instance_id, op_id)`, enforced in the same atomic commit as the instance CAS | ch 4 | realized |
| IC-A1 | `CHK-A1-DIGEST` — actor-emit committed facts store `payload_digest` (rejected attempts record nothing) | ch 5 | realized |
| IC-A1 | `REV-A1-TXN` — transaction-boundary checklist line (op record + CAS under one boundary) | review rubric | realized |
| IC-A2 | `CT-A2-CRASH` — crash-window test family per errand instance: kill between claim commit and effect; between effect and completion marker | ch 9 | planned(ch 9) |
| IC-A2 | `CT-A2-CONFIRM` — a no-error/no-ack outcome is a distinct non-terminal state, never success | ch 9 | planned(ch 9) |
| IC-A2 | `CT-A2-RETRY-DURABLE` — delivery/effect retry budget survives a process restart (durable ledger state, not memory) | ch 9 | planned(ch 9) |
| IC-A2 | `CHK-A2-IDEMKEY` — the egress adapter interface REQUIRES an idempotency-key parameter (type-level; the fake egress adapter implements it first) | ch 3 | realized |
| IC-A2 | `ADR-A2-EXT` — trigger: an external system that cannot accept an idempotency key | ADR machinery | deferred(trigger) |
| IC-A3 | emit-lib — `op_id` derivation in ONE audited implementation, shared by the scripted actor (ch 3) and the operator CLI (ch 6); named deliverable | ch 3 | realized |
| IC-A3 | `CT-A3-RETRANS` — resend-without-ack reuses the `op_id` → kernel answers `Duplicate` | ch 5 | realized |
| IC-A3 | `CT-A3-EMITLIB-REFRESH` — the emit-lib derives a NEW logical `op_id` from a fresh context packet after `Stale`. This is an emit-lib contract, not a kernel rule: the kernel only answers `Stale`, and rejected attempts never consume the idempotency key | ch 5 | realized |
| IC-A3 | `ADR-A3-IDSCHEME` — content-addressed vs request-scoped-nonce `op_id`, decided per operation family (= ADR-004) | ch 3 | realized |
| IC-B | `CT-B-TWOWORKER` — two workers process the same instance stream; correctness is winner-independent (kit-driven in ch 5; re-run under the real runner in ch 9) | ch 5 | realized (kit-driven; ch-9 re-run stands) |
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
| 6 | Visibility floor + operator CLI: full floor (`listInstances` / `getInstanceDetail` / `getTimeline` committed-rows-only / live tail), debug bundle with redaction boundary, command + dev verbs, all writes through normal ingress | PI-2 | planned(ch 6) |
| 7 | Kernel diagnostics & structured logging: the named non-authoritative diagnostic channel's concrete form | PI-4 | planned(ch 7) |
| 8 | Template file-format spec: the canonical authoring format; **migrates MD-1** | PI-5 | planned(ch 8) |
| 9 | Runner MVP: local worktree provider, one real actor adapter, process-gate runner, attach channel (tmux observe/takeover); sub-decision: local-worktree only vs headless/cloud | PI-8 | planned(ch 9) |
| 10 | Operator recourse card: one page (query via the floor, cancel, deleteRequested; no watchdog/retry until L9) | PI-9 | planned(ch 10) |

**Map extension note (added at ch-5 ratification, §5.6).** The 10-chapter
map is the Block A core sequence, not a closed list: semantic surfaces the
model ladder carries beyond it enter as APPENDED chapters when their
prerequisites exist — first candidate: the archive-purge / LC4 surface,
the re-homed `CT-C-PURGE-AUDIT`'s owner. A re-home is recorded in both the
intake row and the ratifying chapter; it is never a silent drop.

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

- **Inventory sources:** the `model-src/units/` tree (158 files =
  `<section>/<UnitName>` ids), ledger §2 (116 invariants,
  `<section>/<slug>`), ledger §3 (85 rejection names), the 20 unit
  sections (= the chapter-trace inventory), scoped by the §1.4 rules.
- **Packet source:** `docs/v3/implementation/packets/` (the convention this
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
the ch-4 map row flipped to `realized` (PI-6); MD-1 stays open by design
(ch-8 debt); coverage validation green over the four packets; process-log
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
modules never import `drift/`; drift tests read the `model-src` documents
at test time (the ch-4 `rejectionNames.test.ts` precedent).

1. **Rejection names (85).** The ch-4 pre-test moves here unchanged
   (`git mv` from `domain/`) — ch 5 formally absorbs it, closing §4.5's
   forward reference.
2. **Domain registry (51 aggregate blocks · 121 entities).** The test
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
3. **Unit→code mapping (158).** A manifest (`drift/unitMap.json` — JSON,
   dual-read by the vitest test and the stdlib coverage script; aligned
   at P1 pre-approval): unit id → `{"status": "pending"}` or
   `{"status": "realized", "disposition": <§1.4 enum>, "codeRef":
   "<path>#<symbol>"}` (the packet's canonical matrix is the schema
   source). The test asserts: key set == the
   `model-src/units/` tree at test time; every `codeRef` resolves (file
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
- **The canonical template format** → ch 8 (MD-1 stands). The CLI
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
  (`../topics/_closed-v1-operability.md`), NOT the seam itself.
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
| ch6-P4 | `cli/` + `cli/dev/` entrypoints, command + dev verbs, nonce-family consumer, exit-code matrix + ADR-009 | pre-approve (first-of-a-kind: new module + boundary ADR) |

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
