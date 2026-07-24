# Task Packet: ch9-p3a-delivery-core — the durable delivery-errand core

Plan step: plan.md §9.4 ch9-P3a row (the P3 sizing split's FOUNDATION
share; split executed at ch9-p3a authoring — the repartition record
lives in §9.4's process note, aligned at ch9-p3a pre-approval).
Realizes the errand half of §9.1 item 4: the delivery-errand ledger,
the durable delivery loop, and the IC-A2 contract family
(`CT-A2-CRASH` / `CT-A2-CONFIRM` / `CT-A2-RETRY-DURABLE`); the REAL
actor adapter behind the seam is ch9-P3b's (activation share), and
the CT-B two-worker re-run under the real runner rides P3b.
Draft anchors (= the manifest's C-row ref union):
`contract:ch9-runner` rows C12/C13/C14/C15/C16/C21/C23/C25/C26.
ADR-016 (the errand-ledger shape) is governing authority;
ADR-003/ADR-010 bind
through C12's store rules (separate file, WAL, mount discipline).
ADR-017 does NOT bind here — this packet spawns nothing.

Autonomy stage: measurement — inherited from the ch9 chapter header.
**First-of-a-kind: YES** — the first runner-plane durable
coordination machinery (durable claims, leases, a retry budget, an
evidence-disciplined confirmation read): the HUMAN approve is
inherited from the P3 row's declared mode and stands on R-FIRST-STOP
regardless of flags (the packet carries flags besides — STOP
`4:flagged-approve` coincides).

Plan alignment (R-ALIGNED-UP): the §9.4 P3→P3a/P3b repartition (the
process note, the two packet rows, the Order line) — prepared now,
landing in THIS packet's commit, marked "aligned at ch9-p3a
pre-approval". No other ratified plan text is contradicted.

Classification: **projection** — manifest tally: 18 anchored /
20 derived / 2 new-decision (machine-counted from the `packet_rows`
block). Every anchored row cites a ratified ch9-runner draft row;
derived rows narrow inside explicitly delegated claim surfaces
(C15's "committed-row check" realized at entry grain, C13's
discovery predicate, schema/representation detail below contract
grain) with in-row derivation notes. The TWO new-decision rows (K1
the executor-seam shape; T2 the module home) are flagged, dated
decision records riding this packet's HUMAN approve as
`approve-ratified` — below the Case-B threshold, neither touching
authority/separation/availability-class semantics (the authority
SHAPE itself is ratified: C12/ADR-016).

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

The EMPTY slice is a declaration, not an omission (R-EMPTY-SLICE;
plan §9.2: the runner surfaces are adapter/runtime-side, outside the
unit tree — the sole ch9 candidate unit resolved at ch9-P2). This
packet's claim surface is its canonical contract matrices. No
rejection-name registry change (the 54-name registry stays
byte-identical; the recorded admit-outcome values are ERRAND-ROW
data, never registry names — drift lanes green before and after).
Invariants: none newly owned. Traces: none (the executable
expectations are the CT-A2 family, this packet's acceptance).

## Sizing/risk (template §2 step 0 — materialized)

**The gate ran on the BUNDLED §9.4 P3 row first** (the row is the
declared sizing-split candidate). Axes on the bundled row: authority
movement — YES (the errand ledger is a NEW canonical source of truth
for runner-plane delivery state, ADR-016); surface spread — the ONE
delivery concept across the runner store schema + the loop machinery
+ the real adapter's spawn/handoff/result mechanics + the testkit
contract (a new seam) + the diag face (3+ surfaces); identity/join
fragility — YES (context_packet_id ↔ transcript rows ↔ attempt_id ↔
op_id must align across two stores); foundation + activation
coupling — YES (build the ledger AND turn on real actor processes in
one packet); acceptance multiplicity — the CT-A2 family + the CT-B
real-runner re-run + spawn-discipline negatives + result-seam lanes.
**Hard stops 1 and 2 TRIPPED** (authority introduction bundled with
new runtime behavior turned on; one concept across 3+ surfaces), with
hard-stop-9 material adjacent (the errand machinery IS
lease/retry/idempotency semantics — bundling it with real process
integration mixes coordination-primitive introduction into an
activation packet). **Single-packet closure proof: FAILED** — the
errand semantics are separately sequenceable and separately provable
(a deterministic executor seam drives the FULL CT-A2 family against
the durable ledger with zero real spawns), while the real adapter's
mechanics need their own substrate probes (files, processes, kill
windows) and their own proof surface (CT-B under real processes).
**Split shape: foundation → activation, depth 1, autonomous** (the
ch12-P1 precedent): ch9-P3a = the delivery core (this packet);
ch9-P3b = the real actor adapter behind the P3a seam. Split parts
inherit the P3 row's mode (HUMAN approve), predicted class, and
watchpoints; fresh watchdog each.

**The gate re-run on P3a alone:** authority movement — YES (the
ledger is born here), but NO runtime behavior turns on (the shipped
CLI is untouched; the loop is a composition-ready library driven by
tests; `runner run` is ch9-P4's) — hard stop 1 does NOT trip.
Surface spread — the ERRAND concept touches the new `runner/` module
+ the `ports/delivery.ts` seam + the seam's testkit far side =
THREE, hard stop 2 LETTER-TRIPPED; closure proof: the port and its
scripted far side are the SAME seam's two faces, born together in
one compile-linked change with the module — one bounded change, one
proof surface (`pnpm v3:test` families), no per-consumer sequencing
(the seam's real consumer is P3b BY the split's design). The diag
face growth (ports/diagnostics.ts + the store read gate) repeats
ch9-P2's closure-proven compile-linked pattern (the type-synced
allowlist makes the compiler the sequencer). **Single-packet
allowed: yes.** Consume-family scan (authority-heavy → run, from
the tree): producer = the delivery loop (HERE); persistence/replay =
the errand store (HERE); recovery/cleanup = the reclaim/crash paths
(HERE); execution consumer = the real adapter (ABSENT — staged to
P3b by the split); read/presentation = the module read API here,
floor/CLI surfacing ABSENT (staged to ch9-P4 per C25); validator/
gate = ABSENT (no kernel gate change); external/integration =
ABSENT (the seam's far side is P3b's); testkit = PRESENT (contract
change: the scripted executor — counted in the surface trip above).
Hard stop 6 does not fire: the authority's out-of-module consumer
families are exactly what the split stages OUT.

Conditional annexes:

- **Closure-budget triage:** buckets in scope — the NEW authority
  store (errand ledger), the shared diag contract face, the testkit
  seam. Intentionally collapsed: store + loop + port + scripted far
  side as one compile-linked change (safe — one module, one proof
  surface); diag type face + read gate as one change (the ch9-P2
  precedent). Explicitly deferred: the real executor (P3b), the
  floor/CLI read surfacing and the operator re-spawn verb (ch9-P4,
  C25), teardown/health/retry-on-FAILED (named Absents).
- **Proof-boundary triage:** kernel success/completion proof
  semantics UNCHANGED — the committed transcript row remains the
  sole canonical proof of delivery-relevant truth before and after;
  this packet ADDS a proof consumer (the CF1 evidence read), it
  moves nothing. The errand ledger is authoritative ONLY for
  runner-plane delivery bookkeeping (C26's honest split); no surface
  goes mixed-truth: kernel truth lives in kernel rows, errand truth
  in errand rows, the diag stream is declared best-effort history.
- **Mutable-flow record (hard-stop-9 material is near BY SUBJECT):**
  the coordination primitives introduced (durable claims, lease
  reclaim, active-attempt CAS, decrement-on-start) ARE the packet's
  ratified subject (C14/C16), landing in ONE slice with their whole
  proof (the CT-A2 family) — no producer-behavior change rides
  along (kernel, store, ingress byte-untouched). Precondition
  ordering is deliberate and stated: the attempt-start decrement
  PRECEDES the executor effect (bounded beats optimistic, C16) — a
  crash in that window consumes an attempt and produces no other
  side effect.

## Operative material (full text — projection, not invention)

The semantic source is the ratified `ch9-runner` contract
(2026-07-23, content commit `5c68f206`, amended `09825f78`,
re-ratified `4db149b1`). The errand rows — verbatim NORMATIVE bodies
(the `DECIDED HERE …` provenance clauses and markers — trailing and
mid-body — are elided; decision provenance lives in the draft, never
re-decided here):

> **C12** | The runner plane keeps its delivery bookkeeping in a
> RUNNER-OWNED durable store (host-local SQLite, WAL, same
> mount/agent-unreachability rules as the kernel DB) that is
> SEPARATE from the kernel store file — the kernel schema and its
> ADR-003 fence stay untouched by runner-plane evolution. Kernel
> state is written ONLY through normal ingress ops.
>
> **C13** | The delivery-errand ledger: one row per committed
> dispatch, keyed `(instance_id, context_packet_id)`, created
> idempotently on discovery (INSERT-or-ignore). CONTEXT-PACKET
> IDENTITY (the substrate carries no packet-id field; without a
> ratified rule two adapters could derive different `op_id`s for one
> packet): `context_packet_id = "<instance_id>@v<expected_version>"`
> where `expected_version` is the version the packet is projected
> against (the dispatch-committing row's RESULTING instance version —
> the transcript row itself carries no version column; any adapter
> derives it from the committed row's envelope + the linear-CAS
> single-outstanding-dispatch guarantee) — deterministic and unique
> per dispatch (the dev CLI's existing convention, RATIFIED here as
> the contract; it is exactly ADR-004's `contextPacketId` op-id
> input, so re-delivery re-derives the same `op_id` by construction;
> a later model-plane first-class packet id would supersede via
> reopen). Discovery = POLLING the committed transcript through the
> read seam (interval composition-configured, default 1000ms) —
> reads only, never a kernel write.
>
> **C14** | Errand lifecycle enum (durable, single-owner):
> `pending → claimed → attempting → (confirmed | unconfirmed |
> exhausted | mooted)`, with `failed attempt → pending` while budget
> remains; `unconfirmed` is NON-TERMINAL with exactly one
> ERRAND-LEVEL exit — the operator re-spawn (C25's verb), whose edge
> returns to `attempting` under the FROZEN budget (entering
> `unconfirmed` freezes the remaining budget; re-spawn is
> out-of-band to it, and mints its own fresh `attempt_id` — C16) and
> re-partitions onto the same outcomes with one narrowing: a failed
> or silent re-spawn returns to `unconfirmed`, never to `pending` or
> `exhausted`; `mooted` is a RUN-LEVEL SINK edge: a run reaching
> TERMINAL before confirmation (a mid-flight CANCEL or FAIL) flips
> ANY non-terminal errand state —
> `pending`, `claimed`, `attempting`, or `unconfirmed` — to
> `mooted`, observed by the C13 poll (the read seam is the TERMINAL
> observer; the errand-level qualifier above reserves exactly this
> run-level exit); terminal at the runner plane, no further
> attempts. DISPOSITION PRECEDENCE (stated once, applied by
> C15/C16): `confirmed > mooted > (unconfirmed | exhausted)` —
> EVERY terminal-disposition write (`mooted` included) runs C15's
> committed-row check FIRST, and reads of `exhausted` or `mooted`
> re-run it (C16); a re-spawn attempt is UNBUDGETED — C16's
> decrement and return-to-pending apply to BUDGETED attempts only.
> A claim carries `(worker_id, claimed_at)` and is SCHEDULING-ONLY
> (ADR-003's stance): a stale claim (age > the
> composition-configured lease window, default 15 min) is
> reclaimable by any worker FROM `claimed` OR `attempting` (the
> attempting-crash recovery edge: reclaim runs the C14 precedence
> checks — committed row → `confirmed`, run TERMINAL → `mooted` —
> and otherwise returns the row to `pending`, and the reclaim
> transaction atomically CLEARS the ACTIVE-attempt marker as it does
> so — the stale attempt's C16 CAS can never succeed after the
> reclaim, closing the reclaim-to-successor window; the crashed
> attempt's budget decrement stands); correctness NEVER depends on
> claim exclusivity — duplicate delivery is collapsed by the
> kernel's content-addressed `op_id` (`Duplicate`), the CT-B
> two-worker re-run's basis.
>
> **C15** | CONFIRMATION is committed kernel evidence, never runner
> self-report: an errand is `confirmed` iff the actor's emitted op
> landed as a COMMITTED transcript row (a `Duplicate` rejection on
> submission is evidence-already-exists → `confirmed`); confirmation
> detection is a COMMITTED-ROW CHECK independent of any attempt's
> liveness (a crash after commit but before the submitting attempt
> observed its response must still confirm — the durable row alone
> decides, never the attempt's memory). The exit-0 lane's
> ingress-outcome set is TOTAL and DISJOINT UNDER the C14 precedence
> order (submit-time kernel-integrity throws are not outcomes — they
> fall to C16's crash path): committed → `confirmed`; `Duplicate` →
> `confirmed` (dominant even from a terminal run — evidence exists);
> a run observed TERMINAL → `mooted` (checked BEFORE the unconfirmed
> lanes; the KEY is the run-TERMINAL observation itself — C14's
> poll/state read — for which the `not_active` submit response is
> the sufficient reachable signal; any other idempotency-rung
> outcome from a terminal run, e.g. the negligible-reachability
> `op_id_collision`, falls to the same poll backstop); NO
> readable/parseable emitted output → `unconfirmed`; any OTHER
> structured admit-outcome ON A STILL-ACTIVE RUN (the `stale` kind,
> or a non-`Duplicate` `RejectionName`) → `unconfirmed` with the
> STRUCTURED admit-outcome recorded on the errand row (a classified
> closed-domain value — an `AdmitResult` kind or `RejectionName`,
> never free text — the C4 boundary's mirror). `unconfirmed`'s
> widened definition: exit 0 WITHOUT committed evidence on a
> still-active run. `unconfirmed` is never success and never
> auto-retried (a silent actor may have done host work; resubmission
> safety is `op_id`'s, but re-SPAWN is the operator's call — C25's
> verb), floor-visible; CANCEL remains the RUN-level recourse (its
> errand landing is `mooted`). This realizes `CT-A2-CONFIRM`.
>
> **C16** | The retry budget is DURABLE errand state (never process
> memory): attempts-per-errand default 3 (composition-configured);
> the budget row decrements ON ATTEMPT START (a durable write BEFORE
> the spawn — a crash between decrement and spawn consumes the
> attempt: bounded beats optimistic; and EVERY attempt start mints a
> fresh durable `attempt_id` — the handoff-scoping and
> session-naming key (C17/C20/C23): the attempt-start durable write
> is ONE transaction recording the `attempt_id`, the attempt's
> session name (C23), and the errand's ACTIVE-attempt marker BEFORE
> the spawn (budgeted starts fold the budget decrement into the same
> transaction; a C14 unbudgeted re-spawn runs its own,
> budget-untouched instance of it); the id's uniqueness claim is
> PRECISE, never absolute: collision-resistant random form,
> `UNIQUE`-constrained in the runner store with mint-retry on
> collision (the collision domain = this runner store plus the host
> tmux namespace through the encoded session name) — an attempt id
> is never reused); spawn/infra errors, nonzero exits, the runner's
> OWN delivery-timeout kill (C19's SIGTERM/SIGKILL on the actor
> spawn), AND foreign `code: null` kills (C21's `runner_error` KIND
> class — bare, the kernel-side `sys:` tokens never appear on the
> delivery path) consume an attempt and return the errand to
> `pending`; a NEGATIVE attempt outcome (failure or no-output)
> applies ONLY through a CAS on the errand's ACTIVE-attempt marker —
> a STALE attempt's negative result (its `attempt_id` no longer
> active, e.g. after a lease-expiry reclaim started a successor) is
> INERT and demotes nothing, while a stale attempt's COMMITTED
> evidence still promotes `confirmed` (the precedence's
> committed-row check is attempt-independent); budget exhaustion →
> `exhausted` ONLY AFTER the FULL C14 precedence is consulted — a
> final C15 committed-row confirmation check (evidence found →
> `confirmed`) AND a run-terminal check (a TERMINAL run resolves the
> errand `mooted`, never `exhausted`), AND the dominance is
> re-evaluated AT READ TIME too: a floor/report read of any
> non-`confirmed` RESTING disposition (`unconfirmed` | `exhausted` |
> `mooted`; the TRANSIENT states — `pending` / `claimed` /
> `attempting` — run the same committed-row check at their OWN
> decision points: C15's attempt conclusion and C14's reclaim)
> re-runs the committed-row check (the `unconfirmed` case closes the
> cross-worker late-commit window — a sibling attempt's op
> committing after the no-output classification; evidence-promotion
> to `confirmed` is a PRECEDENCE flip, never an exit edge, so C14's
> exactly-one-errand-level-exit stands) and a later-discovered
> committed row flips it `confirmed` (closing the crash-after-commit
> races on both paths — a submission committing concurrently with
> another worker's exhaustion flip, and a commit landing before a
> CANCEL moots the errand; the errand ledger is runner-plane
> bookkeeping, so the flip is legal; the C14 precedence holds on
> every path — `confirmed` dominates both); the decrement and
> return-to-pending rules above apply to BUDGETED attempts only (a
> C14 re-spawn attempt is out-of-band); `exhausted` is runner-plane
> terminal, floor-visible, kernel state untouched. This realizes
> `CT-A2-RETRY-DURABLE`, and the two crash windows (kill between
> claim and effect / between effect and confirmation) land in
> `CT-A2-CRASH`: after restart the durable errand row alone
> decides — an attempted-but-unconfirmed errand retries under
> budget, duplicate spawn being the deliberate, kernel-safe cost
> (the ch12-C18 duplicate-provisioning precedent).
>
> **C26** | Runner-plane observability rides the EXISTING diagnostic
> channel (ch7 structured kernel log + audit stream, cited — a
> BEST-EFFORT, fail-open, non-authoritative channel by its own
> ratified contract): every errand state transition, every
> provisioning completion (both kinds), and every spawn outcome
> emits a structured diagnostic event. The authority split is
> honest: the errand LEDGER is the authoritative runner-plane
> CURRENT state; the diagnostic stream is best-effort HISTORY
> (events may be lost on channel failure — no full-history
> reconstruction is claimed); no new observability machinery is
> minted.

The C23 clause this packet realizes a HALF of (the attempt-start
transaction membership — the rest of C23 is ch9-P3b/P4's): *"the
errand row RECORDS the live attempt's session name IN the C16
attempt-start transaction, BEFORE the spawn — so a crash between the
record and the spawn leaves a recorded-but-never-born session,
landing on C24's already-defined 'not running' lane; the runner
ledger, not the opaque runtime ref, is attach's resolution source"*.

### Delegated sources expanded (R-DELEGATION-CLOSURE)

- **The submit-outcome vocabulary CF2 classifies** (the code
  substrate, read at source — `domain/outcome.ts`): `Outcome =
  { kind: "committed", version, intent } | { kind: "duplicate" } |
  { kind: "stale", currentVersion } | { kind: "rejected", reason:
  "gate_blocked", gate, gateReason?, evidenceRefs? } |
  { kind: "rejected", reason: Exclude<RejectionName,
  "gate_blocked"> }`. The kinds are the C15 "AdmitResult kind"
  domain; `not_active` and `op_id_collision` are `RejectionName`
  members (the 54-name registry, `domain/rejections.ts`).
  `duplicate` carries NO version; `committed.intent` is null at a
  terminal target.
- **The read seam** (`ports/store.ts`): `listInstances():
  Promise<readonly WorkflowInstance[]>`;
  `loadInstance(instanceId): Promise<WorkflowInstance | null>`;
  `getInstanceDetail(instanceId): Promise<InstanceDetail | null>`
  (`{ instance, transcript: readonly TranscriptEntry[] }`);
  `getTimeline(instanceId, afterSeq)`. Transcript entries
  are kind-discriminated: `entryKind: "transition"` rows carry the
  actor `envelope` (with `opId`, `actorId`, and `expectedVersion` —
  OPTIONAL in the wire type, always present on a committed
  transition: CF1's presence invariant);
  lifecycle fact rows are a DIFFERENT entryKind and carry no actor
  envelope. `WorkflowInstance.kernelStatus ∈ CREATED | ACTIVE |
  WAITING | TERMINAL` (`domain/instance.ts`).
- **Intent re-derivation** (`kernel/dispatchIntent.ts`, exported):
  `deriveDispatchIntent(instance, template, stepId,
  providerRegistry, handoff?)` — derived from COMMITTED state,
  after the commit (commit ≠ deliver; the store never delivers);
  the packet is projected at `instance.version`
  (`expectedVersion: instance.version`); throws kernel-integrity
  errors on an undefined step, an unbound role, a NULL task, a
  non-ready runtime context, a provisioned ref on a template
  declaring no runtime context, or an unresolvable pinned provider
  (`registry-stable-for-the-run`) — six in-function sites — PLUS
  the called helpers'/boundaries' own throw classes (the transitive
  rule): the `resolveRuntimeContextRequirement` helper's integrity
  throw (`domain/template.ts`), the provider's `projectForActor`
  gates AS BOUND (worktree: foreign-kind ref, malformed locator;
  the scripted provider adds a canonicality gate), and the
  definitions port's load failures. All kernel/config errors, never
  business states.
- **The op-id identity C13 rides** (`emit/opId.ts`, ADR-004):
  `ActorEmitIdentity = { instanceId, contextPacketId, opType,
  payload }` — `contextPacketId` is exactly C13's ratified string,
  so re-delivery re-derives the same `op_id` by construction. The
  emit-lib CALLER is the adapter (ch9-P3b, C20); this packet only
  fixes the identity the ledger keys on.
- **The diag channel's own contract** (`ports/diagnostics.ts`):
  `emit(body): void` NEVER throws (fail-open lives ON the port);
  call sites call it BARE (REV-DIAG-FAILOPEN); the body's field
  presence is per-lane canonical in the owning packet; `source:
  "runner"` exists since ch9-P2 with `requestId` present iff
  source = "runner" — SCOPED to the two provisioning kinds with an
  explicit re-examination clause for sibling packets ("a sibling
  packet introducing further `runner` kinds RE-EXAMINES it") — the
  re-examination is executed here (DG3, flag F5).
- **The store substrate rules C12 cites** (ADR-003/ADR-010, via the
  built kernel + diag stores): one SQLite file per concern, WAL
  journal, `BEGIN IMMEDIATE` write transactions, the
  mount/agent-unreachability stance; UNIQUE-constraint enforcement
  is the kernel store's proven op-id pattern. The TWO new substrate
  cells this packet stands on are probed in-session (P5a/P5b — the
  probe table below).
- **ADR-016's decision points** (governing): runner-owned separate
  store; claims scheduling-only; correctness = kernel op-id
  idempotency; confirmation = committed kernel evidence,
  liveness-independent; durable decrement-on-start budget; the
  precedence with read-time re-check; attempt-scoped identity.

### Substrate probes (2026-07-24, in-session; script + outputs in
the session scratchpad `ch9p3a-probes/` — node 24, `node:sqlite`,
darwin/APFS)

The in-tree-proven cells this packet stands on are cited in
Embedding gates — substrate. NEW cells probed now:

| Probe | Question | Observed |
|---|---|---|
| P5a | `INSERT OR IGNORE`, second insert on the same PK (single handle) | `changes = 0`, silent no-op; the first row's state survives — D3's idempotency mechanism |
| P5b | two WAL handles over one file: `BEGIN IMMEDIATE` while the sibling holds the write lock; post-commit `INSERT OR IGNORE` on the existing key | lock acquisition fails LOUD (`database is locked`, NO default wait) — ES6's bounded-busy mandate; the post-commit insert is `changes = 0`, no-op |

## Claim

The runner plane's delivery bookkeeping is DURABLE,
EVIDENCE-DISCIPLINED, and CRASH-CONVERGENT — and it cannot touch
kernel truth: (1) EVERY committed dispatch acquires exactly ONE durable errand
row under any number of concurrently polling workers (idempotent
discovery on the C13 key): live dispatches at discovery, the
remainder at their run's one-time terminal reconciliation (D7 —
consumed dispatches → `confirmed` by their own transition-row
evidence, the final outstanding dispatch — aggregate-proven —
→ `mooted`, both marked `terminal_backfill`) — the auditable,
EXACT totality invariant (F9);
(2) an errand is reported `confirmed` ONLY on committed kernel
evidence (CF1) — no runner self-report, no attempt memory, no crash
timing can fabricate a confirmation, and a delivered dispatch is
NEVER reported `unconfirmed`, `exhausted`, or `mooted` (the
precedence's write-time checks plus the read-time re-check); (3)
attempts are durably budgeted — bounded under EVERY crash window
(decrement-on-start) — and attempt-scoped: a stale attempt's
negative outcome is inert (active-attempt CAS) while its committed
evidence still promotes; (4) claims are scheduling-only — two
workers over one errand file lose no errand, double-create none,
and converge to the same dispositions, correctness resting solely
on the kernel's content-addressed `op_id` collapse; (5) a run
reaching TERMINAL moots its errand from every non-terminal state,
and a no-output conclusion lands `unconfirmed` — a distinct,
frozen-budget, non-terminal state whose only errand-level exit is
the re-spawn edge; (6) the packet's production code writes NO
kernel state whatsoever (the ingress-only rule holds vacuously —
submission is the executor's, ch9-P3b) and leaves the kernel
schema, store, ingress, and shipped CLI byte-untouched; (7) every
errand state transition emits a best-effort diagnostic event that
can never change errand or kernel truth (the ledger is the
authority, the stream is history).

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **Store/durability** (ES) — the separate authoritative file, the
   durable row contract, restart visibility, fail-loud character.
2. **Discovery/identity** (D) — the poll predicate, the C13 key,
   idempotent creation, the re-derivation path, terminal
   observation.
3. **Lifecycle/claims** (L) — the state machine, precedence, lease
   reclaim, the mooted sink, the frozen-budget re-spawn edge.
4. **Confirmation/evidence** (CF) — the evidence predicate, the
   total submitted-outcome classification, read-time re-check.
5. **Budget/attempts** (B) — decrement-on-start, attempt minting,
   the active-attempt CAS, exhaustion's final checks, unbudgeted
   re-spawn.
6. **The executor seam** (K) — the closed result vocabulary, the
   rejecting-port lane, the scripted far side, the deps contract.
7. **Observability** (DG) — per-edge events, fail-open, the honest
   authority split, the read-gate growth.
8. **Types/ripple** (T) — exports, lint fences, zero kernel ripple.
9. **Coverage/drift** (U) — the empty slice, registries untouched.

## Canonical matrices

### ES — the errand store

| ID | Rule |
|---|---|
| ES1 | The errand ledger is a RUNNER-OWNED host-local SQLite file, physically SEPARATE from the kernel store and the diag store (the ADR-010 one-file-per-concern pattern), WAL journal, `BEGIN IMMEDIATE` write transactions, the same mount/agent-unreachability rules as the kernel DB; the kernel schema and its ADR-003 fence are untouched (drift lanes prove the registries byte-identical). Opened via a module factory (`openErrandStore(path, time)`) mirroring the store/diag open pattern — the raw handle is module-INTERNAL; the MODULE-PUBLIC errand read API is a reader facade composed WITH the kernel read seam (`createErrandReader(errandStore, readSeam, diag)` on `runner/index.ts` — the sink carries CF3's evidence-promotion event), so CF3's read-time re-check is structurally unbypassable on the public path (a raw handle read never leaves the module). |
| ES2 | The durable errand-row contract (the FIELD LIST the C-rows demand; exact column names/DDL are build detail under it): key `(instance_id, context_packet_id)` PRIMARY; `expected_version` (int); `actor_id` (the dispatched actor — CF1's identity basis, recorded at creation); `state` (the L1 enum, TEXT-encoded closed domain); `remaining_budget` (int ≥ 0); `active_attempt_id` (nullable — B2's CAS marker); `live_session_name` (nullable — recorded in B1's transaction from the injected namer, OPAQUE here: the C23 derivation binds at ch9-P3b/P4); claim pair `worker_id` + `claimed_at` (nullable, L3); `recorded_admit_outcome` (nullable TEXT — CF2's closed-domain value: an `Outcome` kind or `RejectionName`, never free text); `discovery` (closed domain: `live` \| `terminal_backfill` — D7's discriminator; `live` on every poll-discovered row); `created_at`/`updated_at` stamped from the injected TimeSource (CHK-C-TS-SOURCE culture — the store stamps, callers carry no clock). Beside the errand rows the ledger carries the per-run reconciliation marks (`reconciled_runs`: instance_id, reconciled_at — D7's skip gate). DERIVATION note: the field set is the union of the facts C13–C16 demand PLUS the F9-ratified totality machinery (the `discovery` mark, the reconciliation record). DERIVATION: the field set is the union of the durable facts C13–C16 name (key, version, budget, marker, session name, claim, recorded outcome); `actor_id` is CF1's derivation (see CF1); no field beyond the rows' demands. Numeric fields (`expected_version`, `remaining_budget`) are INTERNALLY-DERIVED (kernel-committed reads and the store's own arithmetic — no wire parse anywhere in this module), so the R-NUMERIC-LADDER wire disciplines are out of scope BY BOUNDARY; ES5's read-side shape check is the descriptor guard. |
| ES3 | The attempts record: every attempt start durably records `attempt_id` (UNIQUE-constrained; mint-retry on constraint violation), the errand key, `kind` (`budgeted` \| `respawn`), `started_at`. The id source is COMPOSITION-INJECTED (collision-resistant random in production — the CliDeps `instanceIdSource` precedent; deterministic in the testkit): the kernel's randomness-free stance is untouched because the runner plane is not the kernel. DERIVATION: C16 fixes uniqueness-with-mint-retry and the durable mint; the injected-source representation follows the established composition pattern. |
| ES4 | Durability/restart visibility: every committed errand write is visible to a FRESH handle over the same file — errand state is never process memory; a restarted worker resumes from the rows alone (C16's restart rule; `CT-A2-RETRY-DURABLE`'s basis). |
| ES5 | Authority character: the errand store is AUTHORITATIVE for runner-plane delivery state and therefore FAIL-LOUD (the diag store's fail-open is the deliberate transpose, C26's authority split): open failure, IO failure, constraint violation (other than ES3's retried mint), and shape-invalid stored rows THROW typed errors — never `[]`, never a silent fallback. DERIVATION: C12's authority + C26's split; the loud-vs-open character assignment follows each store's contract role (the lens-1 own-contract-character rule). |
| ES6 | Two-worker write contention: concurrent `BEGIN IMMEDIATE` transactions from two workers over the one errand file contend at lock acquisition (probe P5b: the second acquirer fails LOUD — `database is locked` — with NO default wait); the store opens with a BOUNDED busy wait (`PRAGMA busy_timeout`, default 5000 ms, factory-configurable — a liveness knob below contract grain), and a still-contended write past the bound surfaces as ES5's fail-loud typed throw, retried by the loop's next tick — scheduling, never semantics (the claims/CAS rows carry correctness under any interleaving); transient contention and corruption-class throws are deliberately NOT discriminated at this grain — both surface loud, the lease/next-tick machinery is the recovery, discrimination is a named non-goal at ch9. DERIVATION: C12's WAL discipline + the two-worker claim; the probe mandates an explicit wait discipline the in-tree single-process topology never needed. |

### D — discovery

| ID | Rule |
|---|---|
| D1 | Discovery polls the injected READ seam: `listInstances()` filtered to `kernelStatus === "ACTIVE"` — an ACTIVE run has EXACTLY ONE outstanding committed dispatch (the linear-CAS single-outstanding-dispatch guarantee; CREATED/WAITING/TERMINAL runs have none). Reads only — discovery performs NO kernel write and NO kernel-store write of any kind. DERIVATION: C13 fixes poll-the-committed-transcript-through-the-read-seam; the ACTIVE predicate is the l0d macro-state's dispatch semantics (ch12-P1a: ACTIVE ⇔ the actor's turn), the cheapest committed read exposing exactly the dispatch set; for each NEW key the creation step performs its one per-instance committed read (D3's acquisition basis, D6's class). ANCHOR-LITERAL NOTE (the reclassification challenge, disposed `declined`): C13's "POLLING the committed transcript through the read seam" fixes the READ-ONLY, COMMITTED-STATE character and the seam — not a row-cursor mechanism; the instance list IS the store's committed-transcript projection (every instance field derives from committed rows, ch12-P1a's two-axis truth), and under the single-outstanding-dispatch guarantee the ACTIVE snapshot is EXACTLY the DELIVERABLE committed dispatch set. TOTALITY (flag F9 — a resolved STOP, user-elected): the poll's discovery set is the ACTIVE instances (live discovery — rows born `pending`, `discovery = live`) PLUS the not-yet-reconciled TERMINAL instances (the D7 one-time reconciliation sweep), so C13's one-row-per-committed-dispatch holds as an AUDITABLE EVENTUAL-TOTALITY invariant at its decidable boundary: a live run carries a row for its current dispatch; a reconciled terminal run carries one row per consumed dispatch PLUS one for its final outstanding dispatch exactly when the terminal aggregate proves one existed (D7's TOTAL decision rule). WATCH (successor-row): the predicate rests on WAITING carrying no dispatch-bearing wait kind (true at ch9 — `kickoff_pending` only); a future dispatch-bearing WAITING kind revisits it. |
| D2 | The errand key: `context_packet_id = "<instance_id>@v<expected_version>"` with `expected_version` = the ACTIVE instance's committed `version` at discovery — the SAME value `deriveDispatchIntent` projects (`expectedVersion: instance.version`), so the ledger key, the projected packet, and ADR-004's `contextPacketId` op-id input agree by construction. |
| D3 | Idempotent creation: INSERT-or-ignore on the C13 key (probe P5a: a second insert on an existing key is a silent zero-change no-op — the existing row's state survives; P5b: a sibling handle's post-commit insert is the same no-op); the created row is `state = pending`, `remaining_budget` = the configured attempts-per-errand (default 3), no claim, no active attempt, `actor_id` recorded from the committed dispatch's derivation — acquired by the creation step's per-new-key committed read (the dispatched actor = the instance's current-step role binding, the same value CF1 later matches on the confirming envelope). Any number of polls and workers create at most one row per key. |
| D4 | The poll interval is composition-configured (default 1000 ms) through an injected wait seam (the TailWait pattern — real timer in production, controllable in tests); cadence is scheduling, never semantics. |
| D5 | Run-TERMINAL is observed at THREE points (C14 — the read seam is the terminal observer): the poll (a run read TERMINAL flips EVERY non-terminal errand of that run — `pending`/`claimed`/`attempting`/`unconfirmed` — to `mooted` per L2's precedence, the mooted write running CF1 first), the attempt-start instance load (B1's precondition — moots BEFORE any attempt starts), and CF2's submit-response signal (`not_active`). The poll-side moot pass iterates the LEDGER's MOOTABLE rows (C14's non-terminal errand states: `pending`/`claimed`/`attempting`/`unconfirmed`) and re-reads their runs — INDEPENDENT of the reconciliation marks (the mark gates only D7's transcript walk) — so a live row inserted from a STALE ACTIVE read after the run went terminal (the live-discovery × sweep race) normalizes to `mooted` on the next tick; no atomic cross-store ordering is needed. |
| D6 | Committed-state reads beyond the poll: the creation step's per-new-key read (D3) and the attempt-time intent re-derivation — the loop re-derives the `DispatchIntent` from COMMITTED state via the kernel-exported `deriveDispatchIntent` (loadInstance + the pinned template from the injected definition store + the provider registry; `handoff` = the last committed transition's envelope payload, absent at start). A derivation INTEGRITY throw — the LIST, per the transitive call-graph rule (helpers and injected boundaries carry their own sites): the six in-function sites (undefined step, unbound role, NULL task, non-ready context, provisioned-ref-on-a-no-context-template, unresolvable provider), the `resolveRuntimeContextRequirement` helper's own integrity throw (`domain/template.ts`), the definitions port's own failures (load rejection / not-found), and the injected provider's `projectForActor` gate throws AS BOUND (the worktree provider: foreign-kind ref, malformed locator; the scripted testkit provider adds a canonicality gate — the boundary's throw set is the bound implementation's own, enumerated at build) — propagates FAIL-CLOSED out of the loop pass — a kernel/config error, never converted to errand state (the errand row stays as it was; the lease recovers a died worker). DERIVATION: C13's read-seam discovery + the kernel's established integrity-throw culture (`dispatchIntent.ts`); converting config corruption into errand failure would launder an integrity class into a business state. |
| D7 | The terminal reconciliation sweep (the C13 totality mechanism — flag F9): for a TERMINAL instance carrying no reconciliation mark, ONE pass backfills (a) a CONFIRMED `terminal_backfill` row per transition row lacking a ledger row — the transition row IS that dispatch's consumption evidence (keyed at its `envelope.expectedVersion`, actor = `envelope.actorId`; CF1 holds by construction) — and (b) ONE `mooted` `terminal_backfill` row for the run's final OUTSTANDING dispatch, whose existence is decided from the TERMINAL AGGREGATE, not the transcript tail: it existed iff `terminalDisposition ∈ {cancelled, failed}` AND `currentStep ≠ null` (`currentStep` survives the terminal write; a kickoff-pending or never-activated run carries null — no dispatch; a `done` run consumed its last dispatch by completing), keyed at `instance.version − 1` (the version the terminal commit consumed — on an ACTIVE run no other commit intervenes between the last dispatch and the terminal commit), actor from the surviving `currentStep`'s role binding (template via the injected definitions). The decision is TOTAL — no undecidable class. The sweep then writes the per-run reconciliation mark; re-runs are idempotent (INSERT-or-ignore per row; W7). Budget untouched on every backfill; `discovery = terminal_backfill` (ES2's discriminator: engaged rows read `live`). DERIVATION: C13 + C14 under the ACTUAL read vocabulary — the transcript alone cannot decide the outstanding dispatch (no per-row status/step/version columns; fact-null commits are row-less, FAIL included), but the terminal AGGREGATE can (`currentStep`/`binding`/`version`/`terminalDisposition` all survive the terminal write); the audit is EXACT: ledger rows per reconciled run == transition-row count + (1 iff the aggregate rule fires) — both sides counted from committed data. |

### L — lifecycle/claims

| ID | Rule |
|---|---|
| L1 | The durable state machine (C14, closed): `pending → claimed → attempting → (confirmed \| unconfirmed \| exhausted \| mooted)`; `attempting → pending` on a budgeted attempt's negative outcome while budget remains; `unconfirmed → attempting` on the re-spawn edge ONLY; `mooted` reachable from EVERY non-terminal state; read-time evidence flips `unconfirmed`/`exhausted`/`mooted` → `confirmed` (a precedence flip, not an errand-level exit edge — CF3). The FULL edge list (the shared inventory DG1 and the CT families parameterize over): create(∅→pending), reconcile-backfill(∅→mooted, ∅→confirmed — D7's births, born RESTING under L2's precedence, marked `terminal_backfill`), claim(pending→claimed), attempt-start(claimed→attempting), reclaim(claimed→pending \| attempting→pending for a BUDGETED active attempt; attempting→unconfirmed for a `respawn`-kind one — L7; a precedence hit inside the reclaim lands confirmed — the evidence check — or mooted — the terminal check — from either source state), negative-budgeted(attempting→pending — a budgeted attempt's infra-class conclusion), negative-respawn(attempting→unconfirmed — a `respawn`-kind attempt's infra-class conclusion; B5/L5's narrowing), confirm(attempting→confirmed), no-output(attempting→unconfirmed), other-admit(attempting→unconfirmed), exhaust(attempting→exhausted), exhaust-at-claim(claimed→exhausted — the zero-budget claim resolution: a claimed errand with `remaining_budget = 0` cannot start a budgeted attempt (B1's precondition), so the worker resolves it through B4's double final check — precedence hits land confirmed/mooted; the resolution SITE — at the claim-hold — is packet-chosen under C16's site-silent letter, flag F10), remint(attempting→attempting — a `name_collision` conclusion re-mints a fresh attempt id + session name, B6), moot(pending→mooted, claimed→mooted, attempting→mooted, unconfirmed→mooted), respawn(unconfirmed→attempting), evidence-promotion(unconfirmed→confirmed, exhausted→confirmed, mooted→confirmed — a PRECEDENCE flip: a state write on this inventory for DG1's events and the CT families, NOT an errand-level exit edge in L5's sense). TRIGGER-labeled entries (from/to pairs alone collide across triggers — DG1's `errandEdge` carries the label); a LIST, not a count — the schema grows only by contract successor rows. |
| L2 | Disposition precedence `confirmed > mooted > (unconfirmed \| exhausted)` (C14, stated once HERE): EVERY terminal-disposition write (`mooted` included) runs the CF1 committed-row check FIRST; reads of resting non-confirmed dispositions re-run it (CF3). |
| L3 | Claims are SCHEDULING-ONLY (`worker_id`, `claimed_at` — REV-B): a stale claim (age > the composition-configured lease window, default 15 min, measured on the injected TimeSource) is reclaimable by ANY worker from `claimed` OR `attempting`; the reclaim transaction runs the precedence checks (committed row → `confirmed`; run TERMINAL → `mooted`; else → `pending`) and ATOMICALLY clears the active-attempt marker AND the claim pair — a post-reclaim stale CAS can never succeed; the crashed attempt's budget decrement stands. The else-branch's landing is KIND-AWARE (L7): `pending` for a budgeted active attempt, `unconfirmed` for a `respawn`-kind one. |
| L4 | `mooted` is the run-level sink: run TERMINAL before confirmation flips ANY non-terminal errand state to `mooted` — runner-plane terminal, no further attempts, kernel state untouched. Observed at D5's THREE observation points (the poll, B1's attempt-start load, CF2's `not_active` signal). |
| L5 | `unconfirmed` is NON-terminal and FREEZES the remaining budget; its exactly-one errand-level exit is the re-spawn edge → `attempting` (unbudgeted, fresh `attempt_id` — B5); a failed or silent re-spawn returns to `unconfirmed`, never `pending`/`exhausted`. This packet ships the edge as MODULE API (`respawn(instanceId, contextPacketId)`); the operator verb riding it is C25/ch9-P4's. |
| L6 | Every errand state write is ONE transaction on the runner store (single-owner durable writes); negative attempt outcomes additionally pass B2's active-attempt CAS. No errand write ever touches the kernel store file. |
| L7 | Reclaim of a `respawn`-kind attempt lands `unconfirmed`, never `pending`/`exhausted`: the reclaim's else-branch consults the active attempt's ES3 `kind` — a crash or lease expiry during a re-spawn IS a "failed or silent re-spawn" outcome, and C14's re-spawn narrowing ("returns to `unconfirmed`, never to `pending` or `exhausted`") governs it as the SPECIFIC rule over the reclaim sentence's general `pending` landing; the frozen budget stays untouched on this path. DERIVATION: C14's two clauses harmonized specific-over-general (flag F7 — the reading rides the human approve); the kind-blind alternative (reclaim → `pending`) would breach the ratified narrowing and un-freeze the budget through B1's next decrement. |

### CF — confirmation/evidence

| ID | Rule |
|---|---|
| CF1 | The evidence predicate (liveness- and attempt-independent, any worker can run it through the read seam): the errand's dispatch is CONFIRMED iff the kernel transcript holds a committed `entryKind: "transition"` row with `envelope.expectedVersion === expected_version` AND `envelope.actorId === actor_id`. A lifecycle FACT row consuming the version (e.g. a CANCEL) is NOT evidence — its consequence arrives as run-TERMINAL → `mooted` (L4). DERIVATION: C15's "the actor's emitted op landed as a COMMITTED transcript row" realized at entry grain — transition-kind (an op, not a fact) + own-actor match (the DISPATCHED actor's emission); the any-consuming-row alternative is REJECTED by C15's own stale lane, which classifies foreign consumption on a live run as `unconfirmed`-with-recorded-outcome, never as delivery evidence. Presence invariant: `envelope.expectedVersion` is OPTIONAL in the wire type, but every COMMITTED transition carries it — the store's CAS commit consumes a REQUIRED `expectedVersion` (`CommitTransitionInput`) and the kernel rejects version-less actor ops — so the strict match never reads an absent field on the evidence path. |
| CF2 | The submitted-outcome classification is TOTAL and DISJOINT under L2's precedence (C15 verbatim): `committed` → `confirmed`; `duplicate` → `confirmed` (dominant even from a terminal run — evidence exists); run observed TERMINAL → `mooted` (checked BEFORE the unconfirmed lanes; the `not_active` rejection is the sufficient reachable submit-side signal, D5's poll the backstop for any other terminal-run outcome, e.g. `op_id_collision`); `no_output` → `unconfirmed`; any OTHER structured admit-outcome on a STILL-ACTIVE run (the `stale` kind, or a non-`duplicate` `RejectionName`) → `unconfirmed` with `recorded_admit_outcome` = the closed-domain value (an `Outcome` kind or `RejectionName`, never free text — C4's mirror). Submit-time kernel-integrity throws are NOT outcomes — they land on B2's crash/infra path. |
| CF3 | Read-time re-check (C16): every read of a RESTING non-confirmed disposition (`unconfirmed` \| `exhausted` \| `mooted`) through the module's READER FACADE (ES1 — the only module-public read path, composed with the kernel read seam) re-runs CF1; evidence found → the row flips `confirmed` (a PRECEDENCE flip, never an exit edge — L5's exactly-one-exit stands). Transient states (`pending`/`claimed`/`attempting`) run the same check at their own decision points: attempt conclusion (CF2), reclaim (L3), the attempt-start preconditions (B1 — the terminal-load moot runs L2's precedence, CF1 FIRST: late evidence found there lands `confirmed`, never `mooted`), and the zero-budget claim resolution (B4). |
| CF4 | `unconfirmed` is never success and never auto-retried; it is visible through the module read API now (floor/CLI surfacing is ch9-P4's, C25). CANCEL remains the RUN-level recourse; its errand landing is `mooted`. |

### B — budget/attempts

| ID | Rule |
|---|---|
| B1 | Attempt start is ONE durable transaction, committed BEFORE any executor invocation (C16 + C23's transaction-membership half): mint the fresh `attempt_id` (ES3), set the errand's active-attempt marker, record `live_session_name` (from the injected namer — opaque here), SET/REFRESH the claim pair (`worker_id`, `claimed_at` ← now — EVERY attempt, respawn included, carries a fresh lease clock; W5's recovery basis), and — budgeted starts only — decrement `remaining_budget`. PRECONDITIONS run on the SAME instance load the intent re-derivation needs (D6): a BUDGETED start REQUIRES `remaining_budget ≥ 1` (a zero-budget claimed errand resolves via the exhaust-at-claim edge — B4's double check, never a below-zero decrement), and a run loaded TERMINAL moots the errand HERE (the moot trigger's claimed→mooted edge — no attempt, no decrement; the residual race, TERMINAL committing between this load and the executor's effect, is the deliberate kernel-safe duplicate-work window: the conclusion's precedence still lands `mooted`). A crash between this transaction and the executor's effect CONSUMES the attempt (bounded beats optimistic). |
| B2 | EVERY NON-PROMOTING attempt conclusion — the infra classes, `no_output`, `name_collision`, AND the CF2 unconfirmed-landing admit outcomes (the `stale` kind, non-duplicate rejections) — applies ONLY through a CAS on the active-attempt marker: a stale attempt's conclusion (its `attempt_id` no longer the active one — e.g. after a lease reclaim started a successor) is INERT and demotes nothing. The PROMOTING writes are CAS-FREE precedence writes, attempt-independent: `confirmed` via CF1's committed evidence (a stale attempt's evidence still promotes) and `mooted` via the run-terminal observation. |
| B3 | The infra classes (`spawn_infra` \| `nonzero_exit` \| `own_timeout` \| `foreign_kill` — K1's vocabulary, C16's list with C21's `runner_error`-kind foreign-kill class, all BARE: no `sys:` token ever appears on the delivery path) consume the attempt; the landing is KIND-RESOLVED: a BUDGETED attempt returns the errand to `pending` while budget remains (the negative-budgeted edge), a `respawn`-kind attempt returns it to `unconfirmed` (the negative-respawn edge — B5/L5's narrowing); `no_output` lands `unconfirmed` (L5) on both kinds, never `pending`. |
| B4 | Exhaustion fires at TWO points, both ONLY AFTER the full precedence — the final CF1 check (evidence → `confirmed`) AND the run-terminal check (TERMINAL → `mooted`): a budgeted negative concluding with `remaining_budget` at 0 (the exhaust edge), and the zero-budget claim resolution (the exhaust-at-claim edge — B1's precondition found `remaining_budget = 0` on a claimed errand, the W1-crash aftermath's landing). `exhausted` is runner-plane terminal, kernel untouched. |
| B5 | Re-spawn attempts are UNBUDGETED (C14/C16): their attempt-start transaction is B1's shape minus the decrement — fresh id, marker, session name, AND the fresh claim pair (the respawn's own lease clock) — budget untouched; the decrement and return-to-pending rules bind BUDGETED attempts only; a re-spawn's negative or silent conclusion returns to `unconfirmed` (L5's narrowing). |
| B6 | A `name_collision` conclusion (K1 — the executor observed the attempt's session name already occupied in the host namespace, reported BEFORE any spawn side effect: C16's host-tmux half of the collision domain) is NON-CONSUMING BY CONSTRUCTION, and the remint is IN-PLACE (L1's remint(attempting→attempting) edge — the errand never leaves `attempting`, so the closed-machine negatives hold): ONE CAS-guarded errand-store transaction concludes the collided attempt and starts the fresh one — fresh `attempt_id` + session name minted, the active marker swapped, the claim pair refreshed; for a BUDGETED attempt the collided attempt's credit-back and the fresh start's decrement COLLAPSE TO NET-ZERO in that transaction (the budget is untouched by construction), a respawn-kind remint stays unbudgeted (C16's mint-retry realized across the store+host domain; repeat collisions are the id source's negligible-probability class). The net-zero is LEGAL against bounded-beats-optimistic because the lane is zero-external-effect by definition and rides one post-report transaction — a crash BEFORE it commits leaves the collided attempt's decrement standing (bounded, W6; the lease path recovers). DERIVATION: C16's mint-retry + collision-domain clauses; the alternative (collision consumes budget) would charge the operator's budget for machinery noise the contract explicitly says to retry. |

### K — the executor seam

| ID | Rule |
|---|---|
| K1 | The port (`ports/delivery.ts`, NEW): `AttemptExecutor.execute(input): Promise<AttemptResult>` with `input = { intent: DispatchIntent, attemptId: string, sessionName: string }` and `AttemptResult` the CLOSED union: `{ kind: "submitted", outcome: Outcome }` \| `{ kind: "no_output" }` \| `{ kind: "name_collision" }` \| `{ kind: "infra_failure", class: "spawn_infra" \| "nonzero_exit" \| "own_timeout" \| "foreign_kill" }`. The members ARE the C15/C16 attempt-outcome classes (`name_collision` = C16's host-namespace collision, pre-effect — B6's remint lane); the SHAPE (one port, one union, the input triple) is this packet's decision (NEW-DECISION — flag F2): ch9-P3b's real adapter maps C17–C23's mechanics onto exactly this vocabulary. The core consumes classes only and never branches on a concrete executor type (REV-E). |
| K2 | The awaited-port failure lane: `execute()` REJECTING (or throwing synchronously) is a distinct, driven lane — classified as an attempt-consuming `spawn_infra`-equivalent failure through the SAME B2 CAS path, never an unhandled loop crash and never a silent drop. DERIVATION: C16's "spawn/infra errors consume an attempt" — a rejecting delivery port IS the infra-error class arriving on the promise channel; bounded-by-budget beats loop-crash for a per-errand fault (a config-integrity fault crashes loud via D6 instead). |
| K3 | The scripted executor (testkit, NEW member — the sizing gate's counted testkit-contract change): plays a script of `AttemptResult`s and rejections in order, records every `execute` input (intent/attemptId/sessionName) for asserts; ADR-005 culture — selftest included, deterministic, no I/O. |
| K4 | The deps contract (`createDeliveryLoop(deps, options?)`): `deps = { errandStore, readSeam (the store read subset), definitions, providerRegistry, executor, time, wait, attemptIdSource, sessionNamer, workerId (the claim pair's L3 input), diag }`; `options = { pollMs = 1000, leaseMs = 900000, attemptsPerErrand = 3 }` (the C13/C14/C16 composition-configured knobs, defaults ratified). `sessionNamer(instanceId, attemptId)` is injected — ch9-P3b/P4 bind the C23 derivation; the testkit binds a deterministic namer. DERIVATION: the injected-seam composition culture (CliDeps precedent); every knob and seam is named by a ratified row. |

### DG — observability (the C26 errand share)

| ID | Rule |
|---|---|
| DG1 | Every errand state transition — every edge in L1's list, creation included — emits exactly ONE best-effort diagnostic event through the existing sink: `source: "runner"`, `kind: "errand_transition"`, body fields `instanceId`, `contextPacketId`, `errandEdge` (always present on this kind — the L1 TRIGGER label, a closed domain; the wire discriminator keying the per-edge iffs, since from/to pairs alone collide across triggers), `errandTo` (always present on this kind), `errandFrom` (present iff a prior state existed — absent on the two birth triggers, create and reconcile-backfill), `attemptId` (present iff `errandEdge` is attempt-scoped: attempt-start, negative-budgeted, negative-respawn, confirm, no-output, other-admit, exhaust, remint — the remint event carries the FRESH attempt's id, the transition's result (the collided id is recoverable from the attempts record) — and respawn; absent on create, reconcile-backfill, claim, reclaim, exhaust-at-claim, moot, evidence-promotion). The from/to values are L1's closed domain. DERIVATION: C26 fixes one-event-per-transition on the existing channel; the single-kind representation carrying the trigger label in `errandEdge` (vs kind-per-edge union growth) is the minimal-union-growth shape, below contract grain. |
| DG2 | Fail-open honored (C26 + the port contract): the sink is called BARE (REV-DIAG-FAILOPEN); a sink or diag-store failure never changes errand truth, kernel truth, or the loop's timing/outcomes. The ledger is the authoritative CURRENT state; the stream is best-effort HISTORY — events may be lost, no reconstruction is claimed. |
| DG3 | The diag read gate grows type-synced (the ch9-P2 DG3 pattern): the store allowlist gains the new kind + fields; every new presence iff (DG1's field rules) is enforced in BOTH directions on read, KEYED on `errandEdge` (the discriminator makes the attemptId iff wire-decidable — from/to alone could not); the debug-bundle exclusion set is unchanged. The P2 `requestId` iff is RE-EXAMINED as its own clause mandates and RE-SCOPED per kind: `requestId` present iff kind ∈ {provision_ready, provision_failed} (unchanged for them, NOT carried by `errand_transition`); the port doc's iff table updates accordingly (flag F5). Build note: the store's runner validation arm is currently SHAPED around the two provisioning kinds (`isRunnerKind`, the source-grain `requestId` iff, a required-instanceId profile) — the growth is STRUCTURAL (per-kind field branching), not a pure allowlist append. |

### T — types/ripple

| ID | Rule |
|---|---|
| T1 | Ripple is additive-only: `ports/index.ts`, `runner/index.ts`, `testkit/index.ts` export the new members; `v3/eslint.config.mjs` production ban lists (testkit/drift import bans, dynamic-form groups) gain `src/runner/**` (extend-don't-fork); typecheck green across the widened diag types (the debug-bundle projection compiles unchanged). The kernel, store, ingress, domain, and shipped CLI surfaces are byte-untouched — zero signature ripple by construction. |
| T2 | The module home (NEW-DECISION — flag F1): the runner plane lives in `v3/src/runner/` (`errandStore.ts`, `deliveryLoop.ts`, `index.ts`), the seam port in `v3/src/ports/delivery.ts` — the ADR-001 module-boundary pattern (ports in `ports/`, one concern per directory) extended to the runner plane; ADR-014 named no runner home (its point 4 birthed `providers/` only). Recorded as a dated decision riding the human approve. |

### U — coverage/drift

| ID | Rule |
|---|---|
| U1 | The EMPTY slice is declared (all five axes `[]` — R-EMPTY-SLICE); the 54-name rejection registry, the unit map, and the ledger are byte-untouched; the standing drift suite and `v3:coverage` run green before AND after (the recorded admit-outcome values are errand-row DATA mirroring registry names, never registry entries). |

## Site × shape × phase coverage grid

The core's awaited/fallible sites × failure shapes × execution
phases; every cell a driven lane or an explicit rule-out. Phases:
discovery poll / claim / attempt-start / attempt-conclusion /
read-API. (The executor's INTERNAL phases are ch9-P3b's grid; here
the port is one awaited site.)

| Site (source) | Shape | Phase | Disposition |
|---|---|---|---|
| `readSeam.listInstances()` / `loadInstance` / `getInstanceDetail` (awaited port) | rejection | discovery / read-API | driven: the failing CALL propagates LOUD and its own errand is unmutated (creations already committed earlier in the pass STAND — idempotent, the next tick retries the remainder) — kernel-read failure is never converted to errand state |
| `readSeam.*` | null return (`loadInstance`/`getInstanceDetail` null) | attempt-conclusion / read-API | driven: a vanished instance during CF1 re-derivation — treated as no-evidence (the check re-runs at the next decision point); rule-in note: the kernel store never deletes instances at ch9, so the lane is a defensive read contract, driven with a scripted read seam |
| `deriveDispatchIntent` (sync call, incl. its transitive `projectForActor` provider-gate throws) | integrity throw | attempt-start (pre-B1) | driven (D6): propagates fail-closed; errand row unmutated; lease recovers the worker |
| `definitions.load` (awaited/throwing injected port) | rejection / not-found | attempt-start (pre-B1) / discovery-creation | driven (D6's class): a failed template bind is the same config-integrity lane — propagates fail-closed, errand unmutated |
| `errandStore` transactions (own store) | IO/constraint throw | every phase | driven (ES5): fail-loud typed throw; ES3's UNIQUE mint-retry is the ONE retried constraint class |
| `executor.execute` (awaited port) | rejection / sync throw | attempt-conclusion | driven (K2): CAS-applied `spawn_infra`-equivalent attempt failure |
| `executor.execute` | resolved `AttemptResult` | attempt-conclusion | driven (CF2/B3/B6): the total classification, the remint lane included |
| `diag.emit` (sync port) | port contract: never throws | every phase | ruled out BY PORT CONTRACT (fail-open lives on the port; called BARE — a throwing fake would breach the port, not drive a lane); the sink-failure lane is driven at the CONTRACT grain: a swallowing sink leaves outcomes unchanged (DG2) |
| `time.now()` / `wait()` / `attemptIdSource()` / `sessionNamer()` (injected pure seams) | throw | discovery / claim / attempt-start | ruled out: deterministic injected seams with no failure contract (the TailWait/TimeSource precedent); a throwing member is config-integrity, crash-loud by default propagation — errand unmutated (an `attemptIdSource`/`sessionNamer` throw fires BEFORE B1's transaction commits) |

Crash (process death) is not a call-site shape — it is staged by the
CT-A2-CRASH window inventory (Acceptance): every durable-write
boundary above doubles as a crash point, and the windows enumerate
the decision-relevant prefixes.

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Mirrors (summarize/defer only) |
|---|---|---|
| Disposition precedence + write-time checks | L2 | C14/C15/C16 quotes (operative), CF2's mooted/duplicate ordering, B4's final checks, D5's mooted-write check, L3's precedence trio, Claim (2) |
| The evidence predicate | CF1 | the C15 quote (operative), L2/L3's "committed row" checks, B4, CT-A2-CRASH window W2, Claim (2) |
| Frozen budget + exactly-one-exit | L5 | the C15 quote (operative), B5, B3's kind-resolved landing, L1's negative-respawn edge, L7's frozen-path clause, CF3's "never an exit edge", in-context note 2, Claim (5) |
| Active-attempt CAS | B2 | L3's reclaim clear, L6, K2, CT-A2-CRASH window W4, Claim (3) |
| Decrement-on-start | B1 | ES3, the mutable-flow annex, CT-A2-RETRY-DURABLE discipline, Claim (3) |
| The attempt-outcome vocabulary | K1 | B3, B6's remint lane, CF2, ES2's `recorded_admit_outcome` |
| The lifecycle edge list | L1 | DG1's per-edge events, the CT family inventories |
| The C13 key | D2 | ES2's key fields, the ADR-016 quote, D7's backfill keying, Claim (1) |
| Fail-open diag / fail-loud ledger | ES5 + DG2 | C26 quote, the grid's diag row, in-context note 3, Claim (7) |

Fold policy: a change to a canonical row updates every named mirror
before handing back.

## In-context notes (the scarce budget)

- Commit ≠ deliver is the plane boundary: this module OWNS delivery
  bookkeeping and nothing else. Its production code performs zero
  kernel writes — do not add an ingress client here; submission
  lives behind the executor seam (ch9-P3b).
- `unconfirmed` freezes rather than retries because a silent actor
  may have done host work; resubmission is `op_id`-safe but re-SPAWN
  is the operator's judgment. Do not "improve" it into an auto-retry.
- The runner store is the fail-LOUD authority; the diag stream is
  the fail-open history. Keep the characters straight — an errand
  read must never degrade to `[]`, and a diag failure must never
  surface as an errand error.
- Do not add teardown, provider health, retry-on-FAILED, or any
  event-bus discovery — polling is the ratified MVP shape; the
  named Absents get their own chapter.
- The lease default (15 min) is deliberately long: reclaim is crash
  recovery, not load balancing. Duplicate spawn inside a
  lease/crash window is the deliberate, kernel-safe cost (ADR-016).
- `live_session_name` is an opaque recorded input at this packet's
  grain — resist deriving it here; the C23 encoding arrives with
  the adapter (P3b) and the tmux wrap (P4).

## Embedding gates

- **Target files (production):**
  - `v3/src/runner/errandStore.ts` — NEW: the ES family (open,
    schema, transactions, the CAS/reclaim/precedence write
    machinery, the read API with CF3's re-check).
  - `v3/src/runner/deliveryLoop.ts` — NEW: the D/L/CF/B machinery
    over the injected seams (K4).
  - `v3/src/runner/index.ts` — NEW: the module's public face.
  - `v3/src/ports/delivery.ts` — NEW: K1's port + result union.
  - `v3/src/ports/index.ts` — exports.
  - `v3/src/ports/diagnostics.ts` — DG1/DG3: the `errand_transition`
    kind, the new body fields with their iffs, the `requestId` iff
    re-scope.
  - `v3/src/diag/sqliteDiagStore.ts` — DG3: allowlist/kind growth +
    the new presence iffs in `validateShape`.
  - `v3/src/testkit/scriptedAttemptExecutor.ts` — NEW: K3.
  - `v3/src/testkit/index.ts` — exports.
  - `v3/eslint.config.mjs` — `src/runner/**` joins the production
    ban lists (extend-don't-fork).
- **Test targets:**
  - `v3/src/runner/errandStore.test.ts` — NEW: ES lanes (durability
    via fresh handles, fail-loud lanes, mint-retry, CAS semantics).
  - `v3/src/runner/deliveryLoop.test.ts` — NEW: D/L/CF/B/K/DG lanes
    with the scripted executor + scripted/real read seams.
  - `v3/src/ctA2.test.ts` — NEW: the CT-A2 family (the src-root
    contract-test culture: `twoWorker.test.ts`, `emitLoop.test.ts`).
  - `v3/src/testkit/scriptedAttemptExecutor.test.ts` — NEW: K3
    selftest.
  - `v3/src/diag/sqliteDiagStore.test.ts` — DG3 lanes (both-direction
    iff reds; bundle exclusion unchanged).
- **Entrypoints:** `openErrandStore`, `createDeliveryLoop`,
  `createErrandReader`, `createScriptedAttemptExecutor` (all
  module-public, NEW), plus — on the constructed objects — the
  reader facade's errand READ API (ES1/CF3/CF4: ch9-P4's floor
  basis, the seam-composed re-check path) and the
  `respawn(instanceId, contextPacketId)` edge (L5: C25's verb
  basis). NO
  shipped CLI change, NO ingress change, NO kernel change, NO
  provider change — the shipped entrypoint surface is untouched
  (the activation-journey rule does NOT fire: no previously-built
  foundation is wired into a shipped entrypoint here; the chapter's
  journey rides ch9-P4's `runner run`).
- **Substrate:** two NEW cells probed in-session (P5a/P5b — the
  probe table in Operative material): `INSERT OR IGNORE` no-op
  semantics and the two-handle `BEGIN IMMEDIATE` contention
  behavior. Every other driver behavior is in-tree-proven:
  multi-handle WAL over one SQLite file (`twoWorker.test.ts`, the
  ch7-P2 `walcheck.mjs` probes), UNIQUE-constraint enforcement (the
  kernel store's op-id lane), `BEGIN IMMEDIATE` transaction
  semantics (ADR-003's built store). The packet deliberately claims
  nothing OS/process-grain (kills, signals, spawn) — that substrate
  arrives with ch9-P3b's probes.
- **Mutation boundary** (machine face below): the files above plus
  this packet file and the §9.4-repartition plan edit.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/runner/errandStore.ts",
      "v3/src/runner/deliveryLoop.ts",
      "v3/src/runner/index.ts",
      "v3/src/runner/errandStore.test.ts",
      "v3/src/runner/deliveryLoop.test.ts",
      "v3/src/ports/delivery.ts",
      "v3/src/ports/index.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/diag/sqliteDiagStore.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/testkit/scriptedAttemptExecutor.ts",
      "v3/src/testkit/scriptedAttemptExecutor.test.ts",
      "v3/src/testkit/index.ts",
      "v3/src/ctA2.test.ts",
      "v3/eslint.config.mjs",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch9-p3a-delivery-core.md"
    ]
  }
}
```

## Pre-approval flags

- **F1 — the module home (T2).** `v3/src/runner/` +
  `v3/src/ports/delivery.ts` — no ratified row names a runner-plane
  code home (ADR-014 birthed `providers/` only). Risk if wrong: a
  later re-home is a mechanical move behind stable exports. Route:
  `approve-ratified` — the human approve act ratifies the placement
  (dated decision record; revisit: none).
- **F2 — the executor-seam shape (K1).** The `AttemptExecutor`
  port's input triple and closed `AttemptResult` union are the
  cross-packet interface ch9-P3b builds against; the MEMBERS are
  ratified classes (C15/C16), the SHAPE is this packet's decision.
  Risk if wrong: P3b discovers a mechanics class the union cannot
  express — the fix is a union member added at P3b with its own
  review, never a silent reinterpretation. Route: `approve-ratified`.
- **F3 — the evidence-predicate grain (CF1).** C15's committed-row
  check is realized as transition-kind + own-actor +
  expected-version match, with `actor_id` recorded on the errand
  row at creation. The any-consuming-row alternative is rejected on
  C15's own stale lane (foreign consumption on a live run is
  `unconfirmed`, not evidence). Risk if wrong: an over-narrow
  predicate misses a legitimate evidence form — bounded by the
  read-time re-check re-running the same predicate (a wrong grain
  is corrected in one place). Route: `approve-ratified` — the
  narrowing set rides the human approve as a dated record.
- **F4 — the session-name staging (ES2/B1).** The C16/C23
  transaction records `live_session_name` from an INJECTED namer;
  the C23 `pairflow-<enc(instance_id)>--<enc(attempt_id)>`
  derivation itself binds at ch9-P3b/P4 (where `enc` and tmux
  live). Risk if wrong: none semantic at this packet's grain — the
  column, the transaction membership, and the crash-window
  consequence (a recorded-but-never-born session) are exactly
  C23's; only the VALUE's derivation is staged. Route:
  `approve-ratified`.
- **F5 — the DG shapes + the `requestId` iff re-scope (DG1/DG3).**
  One `errand_transition` kind carrying the L1 trigger label in the
  always-present `errandEdge` field plus from/to fields (vs
  kind-per-edge union growth), and the P2-minted `requestId`
  presence iff re-scoped from source-grain to kind-grain (unchanged
  for the two provisioning kinds) — the re-examination the P2 row's
  own clause mandates, executed. Risk if wrong: representation-grain only; the
  read gate enforces whichever iff set is ratified. Route:
  `approve-ratified`.
- **F6 — the crash-window realization grain (Acceptance).**
  CT-A2-CRASH's kills are staged as DURABLE-PREFIX crash
  simulation: the worker's handles are abandoned mid-sequence and a
  FRESH worker opens the same files — exactly the durable states a
  process kill leaves, at kit grain (the `twoWorker.test.ts`
  culture). Process-grain kills over real spawns arrive with
  ch9-P3b (whose CT-B re-run runs real workers). Risk if wrong: a
  crash observable NOT expressible as a durable-write prefix would
  escape the simulation — none exists at this packet's seam by
  construction (the core's only effects are durable writes and the
  awaited executor call). Route: `approve-ratified`.
- **F8 — the `name_collision` non-consuming in-place remint
  (K1/B6).** The seam gained a pre-effect collision member so a
  real adapter can report C16's host-tmux collision without either
  charging the budget for machinery noise or breaking the closed
  union; the remint is IN-PLACE (attempting→attempting, one
  transaction — the collided attempt's credit and the fresh
  start's decrement collapse to NET-ZERO), the ONE narrow
  exception to decrement-permanence, legal because the lane is
  zero-external-effect by definition; a crash before the remint
  commits leaves the collided decrement standing (bounded — W6).
  Risk if wrong: an adapter misuses the lane for post-effect
  failures — the lane's definition (pre-spawn report) is the
  contract, and gate-2's sensitivity pass owns the built check.
  Route: `approve-ratified`.
- **F9 — the C13 totality resolution (D1/D7; a resolved STOP
  `2:contested-ratified-vs-reality`, user-elected 2026-07-24).**
  The external arm contested a discovered-only narrowing against
  C13's one-row-per-committed-dispatch letter; the USER elected the
  TOTALITY realization: the D7 terminal reconciliation sweep
  backfills every undiscovered dispatch at the run's end, marked
  `terminal_backfill` — the discriminator keeping the
  engaged-then-mooted and never-engaged histories separate — making
  one-row-per-committed-dispatch an AUDITABLE eventual-totality
  invariant (kernel dispatch count ↔ ledger row count per
  reconciled run). The discovered-only alternative
  (absence-as-evidence) was REJECTED on the bug-ambiguity argument:
  absence cannot discriminate a discovery bug from by-design
  absence; a positive record plus a cross-store audit can. Cost:
  one transcript walk per run at terminal, skip-marked forever
  after. REALIZATION (folded across the arm's substrate
  rounds): the transcript ALONE cannot decide the final
  outstanding dispatch (no per-row status/step/version; fact-null
  commits are row-less — FAIL included), but the TERMINAL
  AGGREGATE can: `currentStep`/`binding`/`version`/
  `terminalDisposition` survive the terminal write, and
  `disposition ∈ {cancelled, failed} ∧ currentStep ≠ null`
  decides existence TOTALLY, keyed at `version − 1` — the sweep
  is exact, no undecidable class, no residual mark. Route:
  `approve-ratified` (a resolved STOP verdict — the approve act
  ratifies it).
- **F10 — the zero-budget resolution site (L1/B4).** C16 fixes
  exhaustion's double final check but is silent on WHERE a
  zero-budget errand resolves; the packet chooses the CLAIM-HOLD
  (B1's precondition → the exhaust-at-claim edge). Admissible
  alternatives (resolve at reclaim; resolve at the poll) were not
  taken — the claim-hold is the first point a worker owns the row
  and every check input. Risk if wrong: representation-grain (the
  double check runs identically at any site). Route:
  `approve-ratified`.
- **F7 — the reclaim×re-spawn harmonization (L7).** C14 states both
  "reclaim … otherwise returns the row to `pending`" and "a failed
  or silent re-spawn returns to `unconfirmed`, never to `pending`
  or `exhausted`"; a crash or lease expiry during a re-spawn
  attempt sits in BOTH clauses' scope. L7 resolves it
  specific-over-general: the reclaim consults the active attempt's
  ES3 `kind` and lands a `respawn`-kind reclaim on `unconfirmed`
  under the frozen budget. Risk if wrong: the ratifier prefers the
  kind-blind reading — that side would need a contract successor
  row (this packet cannot ratify it). Route: `approve-ratified` —
  the human approve act ratifies the harmonized reading.

## Acceptance

- Contract tests: **`CT-A2-CRASH`**, **`CT-A2-CONFIRM`**,
  **`CT-A2-RETRY-DURABLE`** (the IC-A2 intake rows — flipped at the
  chapter DoD, executed green here), driven by claim-derived
  negatives (R-CLAIM-NEGATIVES; every declared matrix lane DRIVEN —
  R-MATRIX-LANES).
- Checks: the drift suite (registries/ledger byte-identical — U1),
  `v3:packet-lint`, `v3:adr-check` (ADR-016 status untouched),
  `v3:coverage` (the union unchanged — empty slice),
  `v3:deferred` namespace-clean (this packet adds no marker; the
  P2-minted `DEFERRED(ch9-p3)` marker is ch9-P3b's discharge).
- Test disciplines + family inventories (R-ALTITUDE-LINE:
  membership parameterized, fixture enumeration is build work;
  R-LANE-SENSITIVITY binds twice — at these lane texts now, at the
  built bodies via the arm gate-2 sensitivity pass; the §9.4
  mutation-pilot dual-run rides gate-2 scoped to this boundary):
  - **ES (store):** the declared set = {every ES2 field durably
    round-trips; a fresh handle over the same file reads every
    committed write (ES4); each ES5 fail-loud lane throws typed —
    open failure, IO failure on BOTH sides (a write-path failure
    throws; a READ-path failure throws typed too — never `[]`, the
    fail-loud read contract driven against a swallowing reader), a
    NON-mint constraint violation (not retried), a shape-invalid
    stored row; ES1's
    physical separation driven (three distinct files on disk; a
    burst of errand writes leaves the kernel store file's bytes
    untouched); the ES3 mint-retry lane (a
    scripted colliding id source retries to a fresh id, never
    reuses); the ES6 contention lane (a sibling handle holding the
    write lock: the bounded busy wait rides it out or surfaces the
    fail-loud typed throw, and the loop's next-tick retry after the
    throw is observed — two handles in-process, the P5b shape)}.
    Membership: ES1–ES6 (owner: this packet; driven in
    `runner/errandStore.test.ts`).
  - **D (discovery):** the declared set = {exactly the ACTIVE
    instances acquire LIVE rows (CREATED/WAITING acquire none;
    TERMINAL acquires no new LIVE rows steady-state — only D7's
    `terminal_backfill` rows, the bounded stale-read race residue
    normalizing next tick (the race lane); the negative half
    driven per status); the C13 key composes
    `<instance_id>@v<version>` (D2 — asserted against
    `deriveDispatchIntent`'s `expectedVersion`); N-poll × M-worker
    idempotency (one row per key); D4's cadence seam (the loop runs
    one discovery pass per wait cycle and hands the configured
    `pollMs` to the injected wait — the scripted wait observes
    both); D5's moot-on-terminal per non-terminal state; D6's
    integrity throws (the D6 LIST: the six in-function sites, the
    `resolveRuntimeContextRequirement` helper throw, the
    definitions-port failures, and the provider-projection gate
    class — staged via scripted seams) propagating with the failing
    errand unmutated; D7's reconciliation lanes — a
    consumed-but-never-discovered dispatch acquires a
    `terminal_backfill` `confirmed` row at the sweep, a run
    cancelled mid-dispatch acquires its aggregate-proven
    `terminal_backfill` `mooted` row, a run cancelled while
    kickoff-pending (`currentStep` null) acquires NO dispatch row
    (the aggregate rule's negative driven), the totality AUDIT
    (ledger rows per reconciled run == transition-row count +
    1-iff-the-aggregate-rule-fires — both sides counted from
    committed data), the race lane (a stale live insert into a
    just-terminal run normalizes to `mooted` at the next tick's
    ledger-side pass — D5), the mid-sweep-crash re-run (W7), and a
    reconciled run never re-walked}. Membership: D1–D7 (owner:
    this packet).
  - **L (lifecycle):** the declared set = L1's FULL edge list —
    every edge driven, every NON-edge rejected (the closed-machine
    negative: e.g. `exhausted → attempting`, a second concurrent
    claim, re-spawn from any state ≠ `unconfirmed`); L3's reclaim
    QUAD (confirmed/mooted/pending for a budgeted attempt,
    `unconfirmed` for a `respawn`-kind one — L7) + the atomic
    marker-and-claim clear (the post-reclaim stale CAS is inert);
    L5's frozen budget
    (a re-spawned errand's budget is unchanged after any number of
    re-spawns) + the failed-re-spawn return narrowing; the
    zero-budget claim resolution (exhaust-at-claim through B4's
    double check, with both rescue lanes driven at that point too);
    the B1 terminal-load moot (a TERMINAL run at attempt-start moots
    with no attempt and no decrement — BOTH rescue lanes driven at
    the same point: late evidence there lands `confirmed`, never
    `mooted`). Membership:
    L1–L7 (owner: this packet).
  - **CF (confirmation):** the declared set = {CF1 positive
    (transition at expected_version by actor_id → confirmed) and
    its THREE discriminating negatives (a lifecycle FACT at the
    version is not evidence; a transition by a DIFFERENT actor is
    not evidence; a transition at a DIFFERENT version is not
    evidence); each CF2 lane (committed / duplicate /
    duplicate-from-terminal-run / not_active→mooted /
    other-terminal-outcome-via-poll-backstop / no_output /
    stale-kind / non-duplicate-rejection) landing its exact
    disposition with `recorded_admit_outcome` asserted where
    declared; CF3's read-time flip from EACH resting state
    (unconfirmed/exhausted/mooted → confirmed on late evidence)}.
    Membership: CF1–CF4 (owner: this packet).
  - **B (budget):** the declared set = {decrement precedes executor
    invocation (observable ordering: the scripted executor reads
    the durable budget mid-attempt); each infra class → its
    KIND-RESOLVED landing (budgeted → pending under budget,
    respawn-kind → unconfirmed — B3); B1's preconditions (a
    zero-budget claimed errand never decrements below zero; a
    TERMINAL load moots pre-attempt); exhaustion only through B4's
    double final check at BOTH firing points (both rescue lanes
    driven at each: late evidence → confirmed; terminal run →
    mooted); B2's stale-conclusion inert (the infra classes AND the
    unconfirmed-landing admit outcomes — a stale `stale`/rejected
    submitted outcome demotes nothing) + stale-evidence promotes;
    B5's unbudgeted re-spawn (budget byte-identical across the
    re-spawn transaction, fresh claim pair set); B6's remint lanes
    (a scripted `name_collision`: budget net-zero across the
    credit-back, fresh attempt id + session name on the re-mint,
    CAS-guarded, both kinds). Membership: B1–B6 (owner: this
    packet).
  - **K (seam):** the declared set = {every `AttemptResult` member
    consumed to its declared disposition (the union walked
    member-by-member — `name_collision` → B6's remint included);
    K2's rejecting executor → CAS-applied infra
    failure (loop alive, next tick proceeds); the scripted
    executor's selftest (script order, input recording,
    exhaustion)}. Membership: K1–K4 (owner: this packet).
  - **DG (diag):** the declared set = {one event per L1 edge (the
    edge list parameterizes the family; errandEdge/from/to/attemptId
    presence per DG1's iffs, the read gate keyed on `errandEdge`); a swallowing sink changes no disposition and
    no timing (DG2); the read-gate iffs red in BOTH directions per
    new field; `requestId` absent on `errand_transition` rows and
    still present on the two provisioning kinds (the re-scope's
    both-direction pair); bundle exclusion unchanged}. Membership:
    DG1–DG3 (owner: this packet).
  - **CT-A2-CRASH (the window inventory):** the declared set of
    crash windows, each staged as a durable-prefix crash (F6) and
    decided by the durable rows alone after restart: W1 —
    post-B1-transaction, pre-executor-effect (restart: lease
    reclaim → pending; the decrement stands); W2 — post-kernel-
    commit, pre-conclusion-write (restart: CF1 evidence →
    confirmed, the attempt's memory irrelevant); W3 — post-claim,
    pre-attempt-start (restart: reclaim → pending, budget intact);
    W4 — post-reclaim, stale attempt concluding late (the stale
    negative inert, stale evidence promotes); W5 — mid-re-spawn
    crash (the respawn's own fresh lease expires → the kind-aware
    reclaim lands `unconfirmed`, the frozen budget untouched — L7);
    W6 — crash between a `name_collision` report and the remint
    transaction's commit (the decrement stands — bounded; the
    errand recovers through the lease path); W7 — crash
    mid-reconciliation-sweep (partial backfill rows, no mark — the
    next poll re-runs the sweep to completion, INSERT-or-ignore
    keeping it idempotent). W1's zero-budget
    aftermath resolves at the next claim via exhaust-at-claim
    (B4's double check). Membership:
    W1–W7 (owner: this packet; a window list, not a count — a new
    durable-write boundary mints a window).
  - **CT-A2-CONFIRM:** the no-output conclusion lands
    `unconfirmed` — non-terminal, frozen budget, never success,
    never auto-retried (the poll leaves it untouched across N
    ticks); distinct from EVERY sibling disposition (asserted
    against confirmed/exhausted/mooted on the same fixture shape);
    the re-spawn edge is its only errand-level exit. Owner: this
    packet.
  - **CT-A2-RETRY-DURABLE:** the budget's durable life crosses a
    full restart: decrements visible to a fresh worker, the fresh
    worker CONTINUES from the remaining budget (never resets),
    exhaustion honored across the restart boundary, and the B4
    final checks run on the post-restart path too. Owner: this
    packet.
  - **Two-worker (errand-plane):** two delivery-loop workers over
    ONE errand file + ONE kernel store file: discovery creates one
    row, claim races settle by scheduling only, both workers'
    conclusions converge to one disposition under L2's precedence
    (the kernel-collapse lane staged with a real ingress submit in
    the test composition — `duplicate` observed by the second
    worker). The REAL-process two-worker contract (`CT-B-TWOWORKER`
    re-run) is ch9-P3b's. Owner: this packet.
- Drift tests green (standing, unconditional — PI-3).
- Standing review rules in force: REV-B-LOCAL-NOT-AUTHORITY (claims
  are scheduling-only; no process-local map is authority — L3);
  REV-C-PROJECTIONS-READONLY (discovery/evidence reads consume the
  committed read seam; the diag stream never stands in for errand
  or kernel state); REV-E-NO-ADAPTER-BRANCH (the core never
  branches on a concrete executor type — K1); REV-DIAG-FAILOPEN
  (the sink is called BARE; a sink failure changes nothing — DG2).

## Build record

**Execution context:** fresh-context-DELEGATED build (the README §4
default) — an Opus-class build agent fed the self-contained packet
(approved basis `154b4933…`, human-approved and re-approved on the
arm-converged bytes); a second delegated leg executed the
edge-label conformance fix (the loop-side precedence-hit landings
re-labeled to their TRIGGER contexts per L1 — the build agent's
initial semantic labeling was the one build-grain divergence the
orchestrator's audit caught) and the R-DERIVED-PROBES round. The
main context held orchestration, the verification chain, the
approve/arm gates, and the commit boundary.

**Build-grain decisions (audited):** the store/loop precedence
split (precedence EVIDENCE read loop/reader-side through the
injected read seam, the target write CAS-guarded store-side —
C26's authority split, no cross-store atomicity needed);
`createErrandReader(errandStore, readSeam, diag)` (the CF3 flip
emits its event — ES1's parenthetical synced, bookkeeping);
`workerId` in the loop deps (the claim pair's input — K4 synced,
bookkeeping); the wait seam receives the configured `pollMs`
(D4's observable).

**Tests:** 1473 total (+102 over the pre-build 1371); every
Acceptance family realized member-by-member; suite + typecheck +
lint + coverage + adr-check + packet-lint + deferred green
pre-commit; kernel/store/ingress/domain byte-untouched (drift
green).

**Derived probes (R-DERIVED-PROBES):** 11 probes through
`tools/v3-plan/probe_runner.py` — one per family (ES fail-loud
read / D ACTIVE filter / D7 aggregate rule / L7 kind-blind
reclaim / CF1 actor conjunct / B1 decrement order / B2 CAS guard /
B6 remint net-zero / K2 rejecting executor / DG wrong errandEdge /
W2 committed-row check) — ALL RED, every restore byte-verified
(`cmp`), receipts in the session scratchpad
`ch9p3a-probes/receipts/`; zero green-but-blind probes.

**Aftermath (gate-2 + the mutation dual-run):** the §9.4 pilot
dual-run scored the boundary at 65.81 all-files / 73.47
covered-only (deliveryLoop 59.54, errandStore 69.87, index 81.13,
scriptedExecutor 95.24; 692 killed / 3 timeout / 251 survived /
110 no-cov, 18 s) — telemetry per the pilot rules; the run needed
a stryker-profile fix (the ch9-P2 journey smokes joined the
subprocess-exclude list — the logged P2 blind class, chore
`d9f6885b`). ARM GATE-2 on `c4fb8edf` yielded 9 findings (4
product: the B6 remint stranded without re-execution, the
unconfirmed-landing conclusions skipped the L2 precedence
re-check, `respawn()` bypassed the B1 preconditions, the open
failure was untyped; 5 test-evidence: proven-blind members across
the D/CF, L/B/K, DG-label, CT-A2/two-worker, and ES-read-IO
inventories). ALL folded by a delegated aftermath leg: the four
product fixes (the remint path now re-executes the fresh attempt
in-tick; a shared evidence-first conclusion runs CF1 + the
terminal check before every `unconfirmed` landing; `respawn` runs
the B1 terminal-load precedence; the open path is
typed-wrapped) + 19 new/strengthened tests (suite 1473 → 1492)
— EVERY arm-named blind mutation re-driven RED through the probe
runner (receipts 11 → 30, all restore-verified). RECORDED
RESIDUAL: the `moot` edge label has no dedicated single-mutation
probe — its emit string occurs at four byte-identical call sites,
so no unique anchor satisfies the runner's single-replacement
contract; the label is asserted by four tests across all four
contexts (an honest gap kept over a fragile contrived anchor).
The gate-2 RE-CHECK leg (on `9ea1b0db`) reproduced all folds RED
and yielded ONE residual — the two-worker tests were blind to a
no-op second worker — folded tests-only (worker B's ACTIVE
discovery asserted via the seam's call count; the arm's exact
mutation probe-runner-verified RED on both tests; receipts
30 → 31); the leg closes on the final arm confirmation.
Aftermath authorship: code + tests = the delegated build agent on
the orchestrator's per-finding instruction; packet-text folds +
this record = the orchestrator.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": { "predicted": "projection", "reasoning": "plan §9.4 P3 row carries no explicit prediction; the ratified draft rows C12-C16 fix the errand surface densely, predicting projection; sizing-split declared at ratification and executed here", "discovered": "projection" },
    "provenance": { "anchored": 18, "derived": 20, "new_decision": 2 },
    "rounds": { "review": 4, "doc_refinement": 5, "implementation": 2 },
    "stops": [
      { "type": "2:contested-ratified-vs-reality", "what": "the arm's gate-1 re-check contested the D1 discovered-only narrowing (the pre-resolution F9) against C13's one-row-per-committed-dispatch letter", "resolution": "user elected totality (2026-07-24): the D7 terminal reconciliation sweep with the terminal_backfill discriminator — one-row-per-dispatch as an auditable eventual-totality invariant; F9 rewritten as the resolved-STOP record" },
      { "type": "4:flagged-approve", "what": "first-of-a-kind human approve with flags F1-F10 (all approve-ratified: two new-decisions, six narrowings/stagings, the resolved F9 STOP, the F10 site choice)", "resolution": "approved on 51b48da1... after a per-flag walkthrough; re-approved on the arm-converged 154b4933... (2026-07-24)" }
    ],
    "detector_misses": [
      { "found_at": "arm-approve", "what": "three substrate/design classes a four-round panel missed: the C13 totality tension (became the F9 STOP), the D7 reconstruction's decidability against the actual transcript vocabulary (two arm rounds — the read shape carries no status/step/version and fact-null commits are row-less), and the reclaim/CAS/lease interaction set (respawn lease clock, stale submitted-outcome CAS bypass, zero-budget pending hole)", "why_missed": "the panel verified text-vs-contract and walked declared seams; the arm walked the SOURCES (read-shape columns, row-less commit sites, terminal-write preservation) and concrete interleavings — the same source-walking asymmetry ch9-P2 logged" },
      { "found_at": "implementation", "what": "the builder's semantic edge-labeling (evidence-promotion for every evidence-driven confirm) diverged from L1's trigger-context letter on precedence-hit landings", "why_missed": "L1 assigns landings to trigger labels through entry NESTING — a comprehension-grain implicitness; the orchestrator audit caught it, one conformance leg fixed it" }
    ],
    "learned": "gate-1's arm out-caught the panel again on source-walking (yield 9-6-4-4-3-0 across six legs; the decisive mechanism twice came FROM the arm — the terminal-aggregate rule it proposed replaced an undecidable transcript walk); the 600s doc-review arm timeout killed a third leg (boundary item: extend 1200s to all legs); a user bug-ambiguity argument flipped a discovered-only narrowing into an auditable totality invariant — absence-as-evidence lost to positive-record auditability; 11/11 derived probes red on first run",
    "main_thread_model": "claude-fable-5"
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "ES1", "class": "anchored", "refs": ["contract:ch9-runner#C12"] },
      { "id": "ES2", "class": "derived", "refs": ["contract:ch9-runner#C13", "contract:ch9-runner#C14", "contract:ch9-runner#C15", "contract:ch9-runner#C16", "contract:ch9-runner#C23"] },
      { "id": "ES3", "class": "derived", "refs": ["contract:ch9-runner#C16", "prose:cli/runtime.ts instanceIdSource composition precedent"] },
      { "id": "ES4", "class": "anchored", "refs": ["contract:ch9-runner#C16", "ADR-016"] },
      { "id": "ES5", "class": "derived", "refs": ["contract:ch9-runner#C12", "contract:ch9-runner#C26"] },
      { "id": "ES6", "class": "derived", "refs": ["contract:ch9-runner#C12", "prose:probe P5b (in-session, ch9p3a-probes)"] },
      { "id": "D1", "class": "derived", "refs": ["contract:ch9-runner#C13", "prose:domain/instance.ts l0d KernelStatus semantics (ch12-P1a)"] },
      { "id": "D2", "class": "anchored", "refs": ["contract:ch9-runner#C13"] },
      { "id": "D3", "class": "anchored", "refs": ["contract:ch9-runner#C13", "contract:ch9-runner#C14"] },
      { "id": "D4", "class": "anchored", "refs": ["contract:ch9-runner#C13"] },
      { "id": "D5", "class": "anchored", "refs": ["contract:ch9-runner#C14"] },
      { "id": "D6", "class": "derived", "refs": ["contract:ch9-runner#C13", "prose:kernel/dispatchIntent.ts integrity-throw culture"] },
      { "id": "D7", "class": "derived", "refs": ["contract:ch9-runner#C13", "contract:ch9-runner#C14", "prose:the resolved F9 STOP (user-elected totality, 2026-07-24)"] },
      { "id": "L1", "class": "derived", "refs": ["contract:ch9-runner#C14", "prose:the trigger-labeled edge representation + the F10 site element"] },
      { "id": "L2", "class": "anchored", "refs": ["contract:ch9-runner#C14"] },
      { "id": "L3", "class": "anchored", "refs": ["contract:ch9-runner#C14", "ADR-016"] },
      { "id": "L4", "class": "anchored", "refs": ["contract:ch9-runner#C14"] },
      { "id": "L5", "class": "anchored", "refs": ["contract:ch9-runner#C14", "contract:ch9-runner#C25"] },
      { "id": "L6", "class": "derived", "refs": ["contract:ch9-runner#C12", "contract:ch9-runner#C14"] },
      { "id": "L7", "class": "derived", "refs": ["contract:ch9-runner#C14"] },
      { "id": "CF1", "class": "derived", "refs": ["contract:ch9-runner#C15"] },
      { "id": "CF2", "class": "anchored", "refs": ["contract:ch9-runner#C15"] },
      { "id": "CF3", "class": "anchored", "refs": ["contract:ch9-runner#C15", "contract:ch9-runner#C16"] },
      { "id": "CF4", "class": "anchored", "refs": ["contract:ch9-runner#C15"] },
      { "id": "B1", "class": "anchored", "refs": ["contract:ch9-runner#C16", "contract:ch9-runner#C23"] },
      { "id": "B2", "class": "anchored", "refs": ["contract:ch9-runner#C16"] },
      { "id": "B3", "class": "anchored", "refs": ["contract:ch9-runner#C15", "contract:ch9-runner#C16", "contract:ch9-runner#C21"] },
      { "id": "B4", "class": "derived", "refs": ["contract:ch9-runner#C16", "prose:the F10 site element (claim-hold resolution)"] },
      { "id": "B5", "class": "anchored", "refs": ["contract:ch9-runner#C14", "contract:ch9-runner#C16"] },
      { "id": "B6", "class": "derived", "refs": ["contract:ch9-runner#C16"] },
      { "id": "K1", "class": "new-decision", "refs": [] },
      { "id": "K2", "class": "derived", "refs": ["contract:ch9-runner#C16"] },
      { "id": "K3", "class": "derived", "refs": ["ADR-005", "contract:ch9-runner#C16"] },
      { "id": "K4", "class": "derived", "refs": ["contract:ch9-runner#C13", "contract:ch9-runner#C14", "contract:ch9-runner#C16", "prose:cli/runtime.ts CliDeps composition culture"] },
      { "id": "DG1", "class": "derived", "refs": ["contract:ch9-runner#C26"] },
      { "id": "DG2", "class": "anchored", "refs": ["contract:ch9-runner#C26"] },
      { "id": "DG3", "class": "derived", "refs": ["contract:ch9-runner#C26", "prose:ports/diagnostics.ts requestId iff re-examination clause (ch9-P2 DG2)"] },
      { "id": "T1", "class": "derived", "refs": ["prose:ADR-001 module boundaries", "prose:eslint production ban-list pattern (ch9-P2)"] },
      { "id": "T2", "class": "new-decision", "refs": [] },
      { "id": "U1", "class": "derived", "refs": ["prose:plan §9.2", "prose:R-EMPTY-SLICE"] }
    ]
  }
}
```
