# Task Packet: ch12-p1b — the activation machinery

Plan step: plan.md §12.4 P1 row's ACTIVATION share under the ch12-P1
in-chapter sizing split (executed at ch12-p1a authoring — sizing, not
scope; parts P1a/P1b on the row's declared seam). Realizes §12.1
item 1's entry-machinery half: the source-routed entry, the
operator-intent ingress family (CREATE/START/KICKOFF/CANCEL — C13),
START's none-path + the activate_or_hold fork, the lifecycle fact
entries with `op_id` (C12), activate, FAIL, `task_required`
behavioral, the ch-4 `startInstance` RETIRED as the named replacement
(C24) + the C25 in-handler CLI bridge, and the context-free
deferred-hold journey (the draft's C25 trace staging). Draft anchors
(= the manifest's C-row ref union): `contract:ch12-runtime-core` rows
C1/C7/C9/C10/C11/C12/C13/C14/C15/C18/C19/C20/C21/C22/C24/C25. ADR-014
(module home — the lifecycle handlers ARE the kernel; `accepted` at
the draft ratification) is background authority, deliberately outside
the manifest union: no module moves here.
Plan alignment (R-ALIGNED-UP, propagation-class): the §12.4 P3 row
gains the partial-realization completion obligation for
`l0d-pseudocode/START` and `l0d-pseudocode/RECEIVE` (their provider /
READY legs complete at P3; the machine shares land BOTH-ENDS at P3's
commit — the HANDLE/P2 pattern), marked "aligned at ch12-p1b
pre-approval"; the prepared plan edit lands in the SAME commit as
this packet.
Autonomy stage: measurement — inherited from the ch12-P1 row through
the split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the activation-half-of-a-split
class has precedent (ch11-P2b's delivery share, ch8-P2's
activation packet), the shipped-entrypoint-rewire class has precedent
(ch8-P2's journey ratification), and the ingress-write-family class
is the ch-4/ch-6 ingress culture extended.
Classification: **projection** — manifest tally: 23 anchored /
18 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the ratified ch12 draft, the l0d unit
texts, ledger §2/§3/§4 + the 04-l0d entry-class list, or ratified
plan text, or derives from those with an in-row note.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l0d-pseudocode/RECEIVE", "disposition": "implement" },
      { "id": "l0d-pseudocode/CREATE_INSTANCE", "disposition": "implement" },
      { "id": "l0d-pseudocode/START", "disposition": "implement" },
      { "id": "l0d-pseudocode/KICKOFF", "disposition": "implement" },
      { "id": "l0d-pseudocode/CANCEL", "disposition": "implement" },
      { "id": "l0d-pseudocode/FAIL", "disposition": "implement" },
      { "id": "l0d-pseudocode/activate", "disposition": "implement" }
    ],
    "rejections": ["task_required"],
    "invariants": [
      { "id": "l0d/readiness-gates-dispatch", "disposition": "test" },
      { "id": "l0d/uniform-commit-discipline", "disposition": "review" },
      { "id": "l0d/actor-routable-execution", "disposition": "test" }
    ],
    "traces": [],
    "shared_ownership": [
      { "item": "l0d/actor-routable-execution", "co_owner": "ch12-p1a-lifecycle-axis.md" },
      { "item": "l0d-pseudocode/START", "co_owner": "ch12-p3-provider-contract.md" },
      { "item": "l0d-pseudocode/RECEIVE", "co_owner": "ch12-p3-provider-contract.md" }
    ]
  }
}
```

The EMPTY traces axis is a declaration, not an omission: the l0d
GOLDEN trace lands at P3 (its `requested(r1)`/READY legs presuppose
the provider machinery — C25's trace staging, plan §12.2); this
packet's acceptance vehicle is the context-free deferred-hold JOURNEY
(J1), an acceptance lane, not a chapter trace. The rejections axis
carries `task_required` alone: `not_active` stays ch11-p1-owned (its
E5 axis basis landed at P1a; this packet completes the REACHABLE
state coverage — J3), and `unknown_instance` / `op_id_collision` are
ch-4/ch-5-owned names this packet's ops surface without re-declaring.
`l0d/actor-routable-execution` is SHARED with ch12-p1a (the owner):
P1a realized and drove the guard's ACTIVE/TERMINAL half; THIS packet
lands the CREATED/WAITING probes against machinery-reachable states
(J3) — the share lands BOTH-ENDS at this commit: the entry above plus
the reciprocal `{l0d/actor-routable-execution, co_owner:
ch12-p1b-activation-machinery.md}` entry added to ch12-p1a's slice (a
sanctioned sibling-slice edit riding this packet's commit inside this
packet's boundary — the P1a-declared obligation, plan §12.4 P1b row).
PARTIAL REALIZATION, declared: `l0d-pseudocode/START`'s provider legs
(`request_runtime_context`, the `requested(request_id)` marker, the
spec-form C18 lanes) and `l0d-pseudocode/RECEIVE`'s
`kernel_event → RUNTIME_CONTEXT_READY` dispatch complete at P3 with
the provider machinery — the ch-11 partial-realization pattern; P3's
commit declares the shares both-ends (the prepared plan §12.4 P3-row
edit carries the obligation). `l0d-pseudocode/dispatch_intent` stays
P2's (the config-projection face); `RUNTIME_CONTEXT_READY` stays
P3's. The chapter union closes across the sibling packets
(plan §12.2).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §12.4, recorded at the ch12 ratification for
the parent P1 row, inherited by the split parts): **projection**
(basis: l0d-pseudocode + ledger §2/§3/§4 + the ratified chapter
draft). Discovered at authoring: **projection** — prediction and
discovery agree (zero new-decision rows).

**This packet's own six axes:**

- **authority movement:** YES by the parent assessment's own
  attribution — the one-shot start AUTHORITY splits into
  CREATE/START/activate HERE (record + coverage at CREATE,
  provisioning request at START, first dispatch at activation — the
  C24 named replacement executes in this packet). The stored
  lifecycle truth itself moved at P1a; what moves here is WHERE run
  genesis and activation are decided.
- **new runtime behavior turned on:** YES — this is the split's
  deliberate activation half: CREATED and WAITING become reachable,
  `task_required` becomes a live rejection, the operator-intent
  entry family and the lifecycle fact entries are new write
  surfaces, deferred kickoff and cancel/fail disposal are new
  reachable behavior.
- **surface spread:** TRIPPED — one concept (the entry family)
  touches domain (outcome vocabulary + instance/transcript type
  flips), kernel (handlers + admission parameterization), ingress
  (the intent wire family), store (the lifecycle commit + fact
  rows), the CLI (the C25 bridge rewire), and the testkit CONTRACT
  (the harness start-seam re-base + the checker family growth —
  both count under the surface rule).
- **identity/join fragility:** NO — the one `(instance_id, op_id)`
  key is REUSED, not remapped; both entry classes consume the same
  uniqueness (C12); no cross-store correlation exists until P3.
- **foundation + activation coupling:** NO — the foundation is
  BUILT (P1a landed 2026-07-21, schema v5 + axis + domain values);
  this packet only turns behavior on over it.
- **prerequisite coupling:** NO — P1a is committed and green
  (`f382e7f7` tip at authoring); P2/P3/P4 depend on THIS packet,
  not the reverse.
- **acceptance multiplicity:** schema-adjacent (fact rows) + kernel
  write paths + ingress validation + journey + checker growth —
  bounded by ONE proof surface (`pnpm v3:test` + the v3 bridges;
  full `ci:local` at close).

**Hard stops 1, 2, 6, 7, and 9 (letter-tripped, closure-proven;
single-packet allowed: yes).** All five trips share ONE cause — the
named replacement: retiring the one-shot WHILE landing its
replacement family is a single semantic cutover. Stop 1 (authority
movement + new behavior on): the moved authority IS the new behavior
— the split family is the one-shot's replacement, and C24's
no-parallel-path rule FORECLOSES the deeper split (an entry-family
packet without the retirement leaves TWO live start truths — exactly
what C24 forbids; a retirement packet without the family leaves NO
start path — the tree does not build). Stop 2/7 (one concept across
3+ surfaces; producer + the shared `TranscriptEntry` shape + CLI and
testkit fallout): ONE bounded cutover closes all of it — removing
`startInstance`/`Started`/`StartInstanceInput` makes every TYPED
consumer a compile error in the same commit (the P1a/ch11-P2a
brand-cutover precedent), the two non-type-bound surfaces (the dev
CLI replay fixture validator's hand-rolled keyset, the trace
fixtures) close through the W1 measured sweep plus their driven
lanes (W3's validator re-base, W4's fixture discipline), and the
re-based FULL suite plus the journeys are one proof surface
validating kernel, store, ingress, CLI, and testkit together. The
4+-surfaces × 3+-success-classes escalation combo trips on the same
cause and closes with the same proof. Stop 6 (the authority touches
3+ consume families — the scan below counts FIVE changed beside the
producer: admission/definition validation, store persistence, the
floor's both-classes reads, the CLI bridge + dev-CLI harness
binding, the testkit contract): letter-tripped; the prescribed
producer-first + consumer-family split is FORECLOSED by the same
C24 cause (a producer packet without the retirement leaves two
start truths; the retirement without the consumers does not
compile), and the family-by-family closure IS the mixed proof —
admission and store close under the compile-forced port/type
cutover, the floor closes through F5's driven both-classes lanes,
the CLI and dev CLI through W2/W3's driven bridge and validator
lanes, the testkit through W3 + the checker growth's red-proven
legs, all on the ONE re-based suite; no family can lag (typed by
the compiler, the non-type-bound by their same-commit driven
lanes). Stop 9 (producer behavior + idempotency semantics in one
packet — A2 EXTENDS the idempotency rung kind-aware): letter-
tripped; closure — the extension is reachable ONLY through the new
fact rows (no pre-existing input changes its answer: transition-row
hits keep the digest compare byte-identically, and fact rows do not
exist until this packet writes them), the rung ORDER is preserved
on every path (A3, the existing admission suite the standing
proof), and precondition failure still produces ZERO side effects
(the Mutable-flow record below). No per-family sequencing or
review loop exists anywhere: the same in-repo consumers own the
fallout. Stops 3, 4, 5,
8, 10, 11: not tripped — the prerequisite is built (stop 3); the
axis is the SINGLE authority and the ladder the single admission
path (stop 4); the join is the compiler (stop 5); no persisted schema change —
the fact columns EXIST since P1a's one bump, this packet lands their
writers (stop 8); the completion proof source is unchanged
(stop 10 — the Proof-boundary triage below); the reused proof
surfaces re-base under the W4 equivalence discipline, asserted
lane-by-lane (stop 11).

**Consume-family scan** (run because stop 2 tripped; measured from
the tree at authoring — receipts in Embedding gates): producer =
kernel (changed: the entry family, activate, FAIL, the terminal
writers); validator/gate = admission (changed: the ladder's l0d
expect parameterization + the kind-aware idempotency rung) and
definition admission (changed: the `activation` default
materialization — G3); persistence/replay = store (changed: the
lifecycle commit + fact rows + the `findOp` kind extension; NO DDL
change — the columns exist since P1a's fenced bump); execution
consumer = absent (the runner is ch 9's); read/presentation = floor
(present; `getTimeline`/`getInstanceDetail` return both entry
classes through the existing passthrough — no verb or handler
change; `debugBundle` exposes both classes, fact rows as discriminated bundle entries, while `kernel/gateProjection.ts` filters to transitions — F4) and the CLI
(changed: the C25 bridge rewire of the `start` verb, both
entrypoints); recovery/cleanup = absent (teardown/retry are named
Absents); external/integration = the dev CLI replay harness binding
(changed as a W3 harness-contract consumer — the start-seam keyset;
no verb/flag semantics change); testkit = changed (contract: the
harness start seam + fixture shape, the storeCheckers family
growth). No `unknown` cells.

**Closure-budget triage** (annex — buckets in scope): TWO buckets
are touched — the runtime-behavior bucket (the entry family, this
packet's own substance) and the shared-contract bucket (the
`TranscriptEntry` discriminated union + the `StorePort` lifecycle
members + the outcome vocabulary). The shared-contract closure is
COLLAPSED into the compile-enforced cutover deliberately, and the
collapse is safe: the type flips' inhabitants arrive WITH their
writers in the same commit (no window where a type promises what no
writer produces), every consumer is in-repo, and the W4 equivalence
family proves the actor path unmoved. The read-projection closure
(dedicated floor lanes, wait/runtime-context read docs, compact
discriminant) stays P4's BY the plan's packet cut (C21); the
provider bucket stays P3's.

**Proof-boundary triage** (annex — terminal writers join): the
completion truth's CANONICAL proof source is unchanged — the
committed transcript + the template reconstruction decide
terminality, the stored axis stays derived-verifiable against them
(P1a T2). What grows is the WRITER set (done | cancelled | failed)
and the checker family WITH it (T2 here): `cancelled`/`failed` gain
their reconstruction-consistency legs beside `done`'s. Both write
points of every terminal disposal ride ONE atomic commit, so no
surface is mixed-truth at any boundary; no reused proof contract
needs parity work — the checker family extends in place, red-proven
per new lane.

**Mutable-flow record** (annex — hard-stop-9 material near): NO
coordination primitive enters and no rollback/retry semantics
change. Precondition failure produces ZERO side effects: every
guard (named rejection, bare-REQUIRE throw, ingress refusal)
precedes every write, and a rejected/thrown attempt never consumes
the `op_id` (F1/A4 — the model's op_id-fact rule). The CAS conflict
path is the HANDLE culture UNCHANGED in kind: restart from load,
full re-admission on fresh state, never a commit computed from
stale state (L9). The admission rung ORDER is preserved
byte-for-byte on the actor path (P1a E5) and the lifecycle paths
use the same order (idempotency before state — A3).

## Claim

Every macro-lifecycle transition of a run is an operator-intent- or
kernel-event-driven ATOMIC commit through the kernel's ONE admission
protocol: the entry is source-routed (actor envelope / operator
intent / kernel event — RECEIVE realized); CREATE is genesis (record
+ binding coverage, NO dispatch, no op_id); START is single-shot
provisioning-or-hold (none-path `ready(∅)`, the activate_or_hold
fork); KICKOFF supplies the deferred task and activates; CANCEL and
FAIL dispose terminally — each disposition written EXACTLY ONCE;
every op-carrying intent consumes the one `(instance_id, op_id)` key
via a lifecycle fact entry committed in the SAME atomic move as its
state change (a replayed lifecycle op is Duplicate, a rejected
attempt consumes nothing); the first dispatch leaves ONLY activate
(readiness gates dispatch); the ch-4 one-shot is RETIRED with NO
parallel path (C24) behind the C25 in-handler CLI bridge; and the
ACTOR path's committed behavior is preserved under the split — every
existing transition row's payload bytes and relative order, every
actor-path outcome kind and rejection name, identical over the FULL
existing suite (the W4 re-base discipline: transcripts gain exactly
the STARTED fact and the version offset the split entails, nothing
else). Reachable states after this packet are exactly
CREATED / WAITING(kickoff_pending) / ACTIVE /
TERMINAL(done | cancelled | failed) — a PARAMETERIZED claim over the
write-site inventory in the L/F/T rows (`done` rides P1a's COMPLETE
branch, newly reachable here because ACTIVE is), closed by the
W-family measured sweep.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **Entry routing + wire shapes** (I family) — the intent entry,
   per-intent keysets, strict fail-closed validation, the numeric
   ladder on the create ref version, diag detail tokens.
2. **Genesis** (L1, G1) — record + coverage, no dispatch, effective
   mode resolution, `task_required`.
3. **START + the fork** (L2, L3) — single-shot guard, `ready(∅)`,
   immediate vs deferred, the STARTED fact, the interim window
   context lanes.
4. **KICKOFF** (L4) — the WAITING∧kickoff_pending expect, task
   supply + TASK_SUPPLIED + activation in one move.
5. **Terminal disposal** (L5, L6, T family) — CANCEL/FAIL writers,
   wait cleared, single-write discipline, checker growth.
6. **activate** (L7, J4) — the readiness REQUIRE, the activation
   write-set, post-commit intent derivation.
7. **Admission parameterization** (A family) — the expect form, the
   kind-aware idempotency rung, rung order, bare-REQUIRE guards.
8. **Fact entries + uniform commit** (F family) — the lifecycle
   commit port member, the fact row shape, the discriminated entry
   type, reader narrowing, both-classes reads.
9. **Outcome vocabulary** (V1) — Created/Accepted/Activated/
   Terminated arms, per-op unions, `Started` retired.
10. **Retirement + bridge** (W family) — the consumer sweep, the C25
    bridge, the harness contract re-base, the fixture re-base
    discipline.
11. **Journeys + reachability** (J family) — the deferred-hold
    journey, the shipped-entrypoint journey, state-coverage
    completion.
12. **Type flips** (G2, F3) — task/currentStep nullable + reader
    narrowing; the transcript union + its two production readers.
13. **Drift/coverage surface** (D family) — unit-map flips with
    partial notes, registry flips, the l0b one-shot row's re-point,
    ledger byte-identical.

The R-NUMERIC-LADDER ladder applies at exactly ONE new position: the
create intent's `templateRef.version` wire field (I3); every other
new wire field is a string, token, or opaque map by declared shape.

## Operative material (full text — projection, not invention)

### `l0d-pseudocode/RECEIVE` (verbatim)

```text
RECEIVE(input) → Outcome                                               # one kernel entry; route by input source class
  MATCH input.source:
    operator_intent → dispatch to CREATE_INSTANCE / START / KICKOFF / CANCEL   # lifecycle intents
    kernel_event    → dispatch to RUNTIME_CONTEXT_READY / FAIL               # internal events (done is internal-only, below)
    actor_envelope  → HANDLE(input)                                           # the L0a–L0c actor handler, now lifecycle-guarded
```

Realization note (intent, not restatement): the source classes
realize as the kernel's TYPED entry family (I1/D1) — `handle` is the
actor_envelope class (built), the four intent handlers the
operator_intent class, `fail` the kernel_event class (in-process
only, C13). The `kernel_event → RUNTIME_CONTEXT_READY` dispatch is
P3's (partial realization, declared in the slice).

### `l0d-pseudocode/CREATE_INSTANCE` (verbatim)

```text
# Convenience operator API, not a kernel primitive: a single "start workflow" command may
# compose CREATE_INSTANCE(...) then START(instance). activation_mode controls what happens
# after RUNTIME_CONTEXT_READY (activate vs WAITING(kickoff_pending)) — not whether CREATE dispatches.
CREATE_INSTANCE(template_ref, activation_mode, task, binding, run_overrides) → Created   # operator_intent; template + binding resolved on the start path (formalized by L0f)
  template ← definitionStore.load(template_ref)                # a pinned definition — a plain template, or an L0f-resolved definition (slots applied)
  IF activation_mode = immediate AND task is absent THEN RETURN Rejected(task_required)
  REQUIRE binding covers every role reachable in template      # binding resolved pre-kernel; the kernel only validates coverage (fail at create, not mid-run)
  instance ← create { template_ref, task, binding, activation_mode,
                      kernel_status: CREATED, current_step: none,        # position is meaningless until ACTIVE
                      runtime_context: none, run_overrides: snapshot(run_overrides), version: 1 }
  COMMIT instance creation
  RETURN Created(instance.version)                             # no dispatch yet — not active
```

### `l0d-pseudocode/START` (verbatim)

```text
START(instance, intent) → Outcome                                     # operator_intent — guarded, single-shot; intent = { op_id } (operation identity: F-W1-2 resolved, ingress touch)
  admitted ← admit_loaded(instance, expect: {
    op_id: intent.op_id,                                              # a replay of the same intent ⇒ Duplicate; a FRESH retry still hits the single-shot state guard
    state: kernel_status = CREATED AND runtime_context = none })      # state rung stays unnamed — bare-REQUIRE semantics
  IF admitted ≠ Accepted THEN RETURN admitted
  request_id ← new_request_id()
  request_runtime_context(instance, request_id)             # placeholder call; provider contract defined at L0e; later fires RUNTIME_CONTEXT_READY
  instance.runtime_context ← requested(request_id)          # marker; status stays CREATED (= v1 PREPARING_WORKSPACE)
  instance.transcript.append(STARTED { op_id: intent.op_id })   # the op_id fact rides the SAME atomic move as the marker — a rejected attempt never consumes the op_id
  RETURN Accepted
```

Realization note: the provider legs (`request_runtime_context`, the
`requested(request_id)` marker, C18's spec-form lanes) are P3's —
declared partial realization. THIS packet realizes the single-shot
admission, the NONE-requirement path (`runtime_context ← ready(∅)`
per C18's none lane), the activate_or_hold fork the none path
continues into (C18: none + immediate → Activated synchronously;
none + deferred_kickoff → WAITING(kickoff_pending) + Accepted), the
STARTED fact riding the same atomic move, and the interim window
context lanes (L3).

### `l0d-pseudocode/KICKOFF` (verbatim)

```text
KICKOFF(instance, intent) → Outcome                                   # operator_intent — intent = { op_id, task }: operation identity arrived (F-W1-2 resolved, ingress touch)
  # ADMISSION — the op_id rung joins the state rung; Duplicate must flow out, so the head propagates
  # outcomes (the state expectation stays unnamed ⇒ bare-REQUIRE semantics, per the ladder's rule)
  admitted ← admit_loaded(instance, expect: {
    op_id: intent.op_id,                                              # a replay of the same intent ⇒ Duplicate (no-op); a FRESH retry still hits the state guard
    state: kernel_status = WAITING AND wait.kind = kickoff_pending })
  IF admitted ≠ Accepted THEN RETURN admitted
  instance.task ← intent.task                                  # the deferred task, supplied now
  instance.transcript.append(TASK_SUPPLIED { op_id: intent.op_id })   # the op_id fact — SAME atomic move as the task supply (activate commits it); a rejected attempt never consumes the op_id
  RETURN activate(instance)
```

### `l0d-pseudocode/CANCEL` (verbatim)

```text
CANCEL(instance, intent) → Outcome                                   # operator_intent — any non-terminal; intent = { op_id } (operation identity: F-W1-2 resolved, ingress touch)
  admitted ← admit_loaded(instance, expect: {
    op_id: intent.op_id,                                              # a replayed CANCEL ⇒ Duplicate (no-op), not a terminal-sink rejection
    state: kernel_status ≠ TERMINAL })                                # state rung stays unnamed — terminal is a sink
  IF admitted ≠ Accepted THEN RETURN admitted
  instance.kernel_status ← TERMINAL ; instance.terminal_disposition ← cancelled
  instance.transcript.append(CANCELLED { op_id: intent.op_id })       # the op_id fact — SAME atomic move as the terminal flip
  RETURN Terminated(cancelled)
```

### `l0d-pseudocode/FAIL` (verbatim)

```text
FAIL(instance, reason) → Outcome                                     # kernel_event — any non-terminal
  REQUIRE admit_loaded(instance, expect: { state: kernel_status ≠ TERMINAL })   # ADMISSION: state rung — terminal is a sink
  instance.kernel_status ← TERMINAL ; instance.terminal_disposition ← failed ; instance.failure_reason ← reason
  RETURN Terminated(failed)
```

### `l0d-pseudocode/activate` (verbatim)

```text
activate(instance) → Outcome                                         # internal — produces the first dispatch
  REQUIRE instance.runtime_context = ready AND instance.task present
  template ← definitionStore.load(instance.template_ref)      # pinned immutable version — same template/instance boundary as HANDLE
  instance.kernel_status ← ACTIVE
  instance.current_step  ← template.start
  RETURN Activated(dispatch_intent(instance, template, template.start))   # dispatch is a kernel output (L0b), not a side effect
```

### The entry-class field lists (ledger §4 l0d + the 04-l0d section, verbatim)

- `OperatorIntent`: `CREATE / START / KICKOFF / CANCEL` — lifecycle
  intents
- `KernelEvent`: `RUNTIME_CONTEXT_READY / FAIL` — internal events
  (COMPLETE is an internal helper, not routed: done comes only from
  a terminal step)
- `ActorEnvelope`: unchanged; joins the others under an
  `input.source` discriminator

The intent WIRE keysets are C13's (realized in I2): CREATE carries
NO `op_id` (genesis, not a mutation); START `{instance_id, op_id}`;
KICKOFF `{instance_id, op_id, task}` (task REQUIRED, nonempty — the
draft's grammar; it overwrites a create-time task); CANCEL
`{instance_id, op_id}`; the three op-carrying intents' `op_id` is
minted by the request-scoped nonce family (ADR-004's operator side).

### Exact rejection strings (ledger §3 — the slice's surface)

- `task_required` — first appears in `l0d-pseudocode` (born here:
  CREATE's effective-immediate-without-task lane; already a
  registry member)

Pass-through names this packet's ops surface without owning:
`not_active` (ch11-p1; the actor-path guard the J3 probes complete),
`unknown_instance` (ch-4; the load step of every instance-addressed
op), `op_id_collision` (ch-5; the kind-aware rung — A2).

## Canonical ingress matrix (I — C13's wire face)

| ID | Rule |
|---|---|
| I1 | The ingress gains ONE operator-intent entry `submitIntent(raw)` beside the actor `submit(raw)` — the RECEIVE source routing realized at the wire: `submit` IS the actor_envelope class, `submitIntent` the operator_intent class (a required `intent` key ∈ `create \| start \| kickoff \| cancel` routes to the kernel's typed entry family), and the kernel_event class has NO external endpoint at ch12 (C13 — `fail` fires in-process; tests drive it directly; RUNTIME_CONTEXT_READY is P3's). Validation is hand-rolled, strict, fail-closed (the built ingress culture): plain object only (prototype + symbol checks), unknown keys reject, per-intent keysets exact (I2). The ingress performs NO store access and NO semantics — valid_shape is rung 0 at the caller (the l0d admit comment); the kernel outcome returns VERBATIM, no reshaping (derived: contract:ch12-runtime-core#C13, #C22 + the built `ingress.ts` contract; DERIVATION — the single discriminated entry vs four per-intent methods carries IDENTICAL semantics: the intent key IS the operator-class discriminator the model's `input.source` match implies one level down; a methods-only surface would leave the wire discriminator unrealized, and any other encoding is representation, not semantics — the D1 grain binds functionality/behavior choices, and every alternative here is observationally identical (the P1a S11 discriminator-encoding precedent, ratified through its approve: representation pins ride `derived`)) |
| I2 | Per-intent wire keysets (authored camelCase ↔ the model's snake forms — the C13/ch11-C16 rename culture, stated so neither side forks): `create` = `{intent, instanceId, templateRef: {id, version}, task?, overrides?, runOverrides?, mode?}` (the caller-minted instance id — the ch4-P1 rule; `overrides` the existing binding-override surface, role → actorId; `mode` ∈ `immediate \| deferredKickoff` — the CREATE-level choice, C13); `start` = `{intent, instanceId, opId, runtimeContextRef?}` (the LAST key is the interim window carrier — L3; it retires at P3 with the seam, C14); `kickoff` = `{intent, instanceId, opId, task}`; `cancel` = `{intent, instanceId, opId}`. `opId` is caller-minted request-scoped nonce (ADR-004 operator side — the ch6 `deriveOperatorOpId` culture; the C25 bridge mints it for the shipped verb); CREATE carries NO `opId` (anchored: contract:ch12-runtime-core#C13, #C20; derived note — the wire spellings are semantics-free camelCase pins under the stated rename culture; the `runtimeContextRef` key rides L3's derivation) |
| I3 | Field validation lanes (each driven both directions): every required id/string field nonempty (`instanceId`, `opId`, `task` at kickoff, `intent`, `templateRef.id`); `task` at `create` is OPTIONAL and shape-checked only when present (its violation token: `invalid_task` — I4; its ABSENCE is the KERNEL's semantic decision — `task_required` is L1's, never an ingress shape lane); `templateRef.version` runs the FULL numeric ladder — integer, ≥ 1, safe, `-0` rejected via `Object.is`, non-number/descriptor/prototype forms rejected by the plain-object + typeof gates [R-NUMERIC-LADDER]; `mode` ∈ the two authored tokens exactly; `overrides` a plain map of nonempty-string values; `runOverrides` a plain map of step-id → PLAIN MAP with every entry CANONICALIZABLE (the emit-lib predicate — C7's CREATE-input canonical-JSON-safe check at THIS gate, fail-closed here, never a commit-time serialization crash); `runtimeContextRef` nonempty string when present (derived: contract:ch12-runtime-core#C13, #C7, #C20 + the built ingress validation culture; the ladder placement is R-NUMERIC-LADDER's mandate at the one new numeric wire position) |
| I4 | Rejection channel + diag: a malformed intent returns the public `invalid_shape` outcome VERBATIM (the ch-4 CHK-C culture — the kernel receives only typed intents) and emits ONE ingress diagnostic event with an ENUMERATED detail token per admission gate block — the `IngressDetailToken` union grows ADDITIVELY with the intent gate blocks at BLOCK grain (the built culture: `invalid_required_string` already covers several required string fields in one block) — the intent-side token set, enumerated: the REUSED `not_plain_object` and `unknown_key`, plus the NEW `unknown_intent` (missing/non-member `intent` key), `invalid_required_string` (REUSED block — the required id/string fields: instanceId, opId, the kickoff task), `invalid_template_ref` (id + the version ladder, I3), `invalid_task` (the CREATE-side form-when-present task — the built expectedRole/eventId culture: a when-present field carries its OWN token), `invalid_mode`, `invalid_overrides`, `invalid_run_overrides` (shape OR a non-canonicalizable entry), `invalid_runtime_context_ref` — TEN tokens, each a declared claim member, each driven both directions per its I3 lane(s) — plus best-effort attribution (valid nonempty string fields only; the built attribution culture); `diag.emit` stays BARE (REV-DIAG-FAILOPEN) (anchored: contract:ch12-runtime-core#C13 "validated strictly fail-closed at ingress" + the built ch7-P1 ingress diag contract) |

## Canonical lifecycle-op matrix (L)

| ID | Rule |
|---|---|
| L1 | CREATE (kernel): load the pinned template (an unknown ref THROWS — the ch-4 start-side culture, no invented rejection name, plan §4.1); resolve the EFFECTIVE activation mode = the CREATE-input choice ?? the admitted template's `activation.mode` default ?? `immediate` (C13's chain; G3's materialization makes the last leg structurally dead on admitted values — kept as the type-level belt, the advancesRound `?.` culture), resolved ONCE and snapshotted onto the instance — thereafter the INSTANCE field alone governs (C13); IF effective mode is `immediate` AND task is absent → `Rejected(task_required)` BEFORE any state (ledger §3; an explicit `deferredKickoff` choice over an immediate-default template creates task-less, LEGALLY — resolution precedes the check); REQUIRE binding coverage (the built ch-4 resolver semantics VERBATIM — fail at create, not mid-run; unbound role THROWS); write the genesis instance (G1) via `store.createInstance`; return `Created` (V1). NO dispatch, NO transcript row, NO op_id; a duplicate instance id is the store's creation-uniqueness THROW, never a Duplicate outcome (creation-grain idempotency stays the named `creation_key` Absent) (anchored: the CREATE_INSTANCE unit verbatim; contract:ch12-runtime-core#C13, #C11) |
| L2 | START, none-requirement path: admission (op_id rung — A2; state rung `kernelStatus = CREATED ∧ runtimeContext.state = "none"` — the single-shot guard, bare-REQUIRE per A4); resolve the window context lanes (L3) → the resolved `runtime_context` value; then the activate_or_hold fork on the INSTANCE's snapshotted mode (C18's shared post-readiness decision, the none path entering it directly): `immediate` → ONE atomic commit composing activation (L7's write-set + `runtime_context` ← resolved + `wait` NULL + the STARTED fact) → `Activated(intent)` with the intent derived POST-commit; `deferred_kickoff` → ONE atomic commit of the hold (`kernel_status` ← WAITING, `wait` ← the T3 shape, `runtime_context` ← resolved, the STARTED fact) → `Accepted`. EVERY successful START commits the `STARTED {op_id}` fact in the SAME atomic move — the op_id's consumption record (derived: contract:ch12-runtime-core#C18 none-lane + fork cells, #C12; DERIVATION — the unit's fact append sits on the spec path, but C12's op_id-fact rule ("a fact entry commits in the SAME atomic move as its state change; a replayed lifecycle op is Duplicate") entails the fact on EVERY successful START: without it a replayed none-path START would find no `(instance_id, op_id)` row and re-run — the idempotency claim would be false; no alternative consumption record exists in the schema) |
| L3 | The interim window context lanes (the ch11-P3b lane table RE-HOMED onto START for the P1b–P3 window; the seam's retirement stays P3's — C14, C25): resolution runs POST-admission, PRE-commit (a throw = no state change, op_id unconsumed). Lanes, decided by `template.runtimeContext` (the ch11 string form — the window's file domain, C25): undeclared + ref ABSENT → `ready(∅)` (`{state: "ready", ref: null}` — C18's none lane); undeclared + ref PRESENT → THROW (surplus input, the ch11 fail-closed lane); declared `"required"` + ref PRESENT → `{state: "ready", ref: {kind: "worktree", locator: ref}}` (the P1a X1 transitional bridge encoding, unchanged); declared `"required"` + ref ABSENT → THROW (the ch11 supply-a-ready-ref culture — the provider machinery that would take this lane is P3's; the CLI's eager guard keeps the shipped path pre-empted, and `runtime_context_provider_unavailable` stays P3's registry lane — C16); empty-string ref → THROW on every lane (the value grammar) (derived: contract:ch12-runtime-core#C25 window + #C14 + the P1a X1 encoding + the ch11-P3b lane table as built; DERIVATION — the carrier must re-home because the one-shot retires HERE while the seam retires at P3: a CREATE-side re-home is FORECLOSED by the single-shot guard (a genesis-written `ready(ref)` would fail START's `runtime_context = none` expect — every seam run would be unstartable), and a harness-side store staging is a parallel start path C24 forbids; START is the ONLY remaining home, and the lane table transfers byte-for-byte. What REMAINS for P3's seam reconciliation (C14): the `runtimeContextRef` WIRE key's retirement, the CLI eager guard, and the behavior-level replacement by the real requirement machinery — the `start.ts` SYMBOLS (`StartInstanceInput`, `resolveRuntimeContext`) retire HERE with the one-shot, their semantics carried by this row; the P1a X3 sentence "their retirement is P3's" reads at the SEAM grain — the observable pieces (wire key, guard, lane BEHAVIOR) — while the deleted file's symbols ride W1 at P1b) |
| L4 | KICKOFF: admission (op_id rung; state rung `kernelStatus = WAITING ∧ wait.kind = "kickoff_pending"` — bare-REQUIRE); then ONE atomic commit composing the task supply and activation (the unit's "activate commits it"): `task` ← intent.task, `wait` ← NULL (S5's leaving-WAITING clear, same move), L7's activation write-set, the `TASK_SUPPLIED {op_id}` fact → `Activated(intent)` post-commit. The supplied task OVERWRITES a create-time task (C13) (anchored: the KICKOFF unit verbatim; contract:ch12-runtime-core#C13, #C12) |
| L5 | CANCEL: admission (op_id rung — a replayed CANCEL is Duplicate BEFORE the sink guard, the unit's own comment; state rung `kernelStatus ≠ TERMINAL` — bare-REQUIRE, terminal is a sink); ONE atomic commit: `kernel_status` ← TERMINAL, `terminal_disposition` ← `cancelled`, `wait` ← NULL, the `CANCELLED {op_id}` fact → `Terminated(cancelled)`. Cancellable from EVERY non-terminal state — CREATED, WAITING, ACTIVE (the C15 floor-visible recourse's operator half) (anchored: the CANCEL unit verbatim; contract:ch12-runtime-core#C12, #C15) |
| L6 | FAIL: kernel event — in-process ONLY, no ingress endpoint, no op_id (C13); guard `kernelStatus ≠ TERMINAL` (bare-REQUIRE, no idempotency rung — no key to consume); ONE atomic commit: TERMINAL + `failed` + `failure_reason` ← reason + `wait` NULL; NO fact row — the unit appends nothing: the op_id-fact rule binds op-carrying intents, and FAIL carries none → `Terminated(failed)`. At P1b NOTHING in production fires FAIL (no provider, no failure routing — C15's Absent); tests drive it directly through the kernel entry (anchored: the FAIL unit verbatim; contract:ch12-runtime-core#C13, #C15) |
| L7 | activate (internal — never routed, never exported as a handler): REQUIRE `runtimeContext.state = "ready"` AND `task` non-null (readiness-gates-dispatch) — structurally satisfied at every P1b call site (the immediate-START path: L1's task_required check + L3's resolution; the KICKOFF path: the task just supplied) and stated as the invariant it protects, guarded FAIL-LOUD (the E4-P1a REQUIRE pattern); the activation write-set `kernel_status ← ACTIVE, current_step ← template.start, round ← 1` (C11's activation clause) rides the CALLER's atomic commit; the first dispatch intent derives POST-commit from committed state (commit ≠ deliver — the built HANDLE culture) (anchored: the activate unit verbatim; contract:ch12-runtime-core#C11; ledger §2 l0d/readiness-gates-dispatch) |
| L8 | Unknown instance: START/KICKOFF/CANCEL/FAIL load the instance FIRST (the HANDLE culture — load precedes admission); a null load → `Rejected(unknown_instance)` — UNIFORMLY across all four instance-addressed ops, FAIL included (derived: the built HANDLE load contract + ledger §3 + contract:ch12-runtime-core#C15; DERIVATION — the entailment is the load contract's uniformity plus the CLOSED rejection namespace: `unknown_instance` is the only registry name fitting an instance-addressed op on a missing instance, and inventing a new name is the divergence stop; a throw would misclass an ordinary operator error as integrity on the intent paths; and on the EVENT path the throw alternative is foreclosed by RATIFIED text — C15 prescribes inert, non-mutating REJECTION semantics for event-path anomalies ("a duplicate, unsolicited, or already-resolved READY event … mutates NOTHING — a bare-REQUIRE guard rejection, no state change"), and a missing instance is the limiting unsolicited case: FAIL's rejection is that same event-anomaly semantics, not a fresh choice) |
| L9 | Cross-cutting handler discipline: on a `cas_conflict` the handler RESTARTS FROM LOAD (the HANDLE culture — full re-admission on fresh state, never a commit computed from stale state: a raced second START re-loads, sees non-CREATED, and takes the guard; a replay after the winner's commit finds the fact and returns Duplicate); diagnostics ride the ch7-P1 kernel classification UNCHANGED in kind — one classified event per non-success final outcome (`duplicate` / `rejected` with reason), NOTHING on success, `internal_failure` on any throw (attribution: instanceId + opId where present; no payload digest — intents carry no payload), every `diag.emit` BARE (derived: contract:ch12-runtime-core#C18's restart-from-load rule generalized to the family + the built kernel diag contract; DERIVATION — the restart rule is C18's own composition-seam culture stated for START's spec path, and the same CAS discipline is the only one the store offers; diag parity is the ch7-P1 emission contract's letter applied to new non-success returns) |

## Canonical admission matrix (A)

| ID | Rule |
|---|---|
| A1 | The admission ladder gains the l0d `expect.*` parameterization (the unit's own form — "expect.* parameterizes the rungs per entry path; an absent expectation skips its rung"): ONE protocol, rung order load → idempotency → state → (version → staleness → authority — the actor-only rungs, skipped when unexpected); the ACTOR parameterization is BEHAVIOR-IDENTICAL — the existing admission suite re-runs byte-unchanged as the equivalence proof (the P1a E5 rung order preserved). The lifecycle expects: START `{op_id, state: CREATED ∧ none}`, KICKOFF `{op_id, state: WAITING ∧ kickoff_pending}`, CANCEL `{op_id, state: ≠ TERMINAL}`, FAIL `{state: ≠ TERMINAL}` (no op_id — L6); no version or authority rung on any lifecycle path (the intents carry no expectedVersion/expectedRole — preconditions and the CAS commit are the safety, the l0d uniform-commit comment) (anchored: the admit_loaded unit verbatim + the built ch11-P1 ladder; contract:ch12-runtime-core#C13) |
| A2 | The idempotency rung goes KIND-AWARE at the entry-class grain: `findOp` extends to return `{payloadDigest: string \| null, entryKind}`; a lifecycle intent finding an existing `(instance_id, op_id)` row of ITS OWN fact kind → `Duplicate` (a replay — no-op, no second entry); ANY other kind under that key (a different fact kind OR a transition row) → `Rejected(op_id_collision)`; the ACTOR rung gains the mirror half — an existing FACT row under an actor envelope's op_id is `op_id_collision` (the digest compare is transition-only; fact rows carry no digest). The commit transaction RE-CHECKS with the same kind rule — the pre-check stays a fast path (REV-A1-TXN) (derived: contract:ch12-runtime-core#C12 ("BOTH classes consume the ONE uniqueness"; "a replayed lifecycle op is Duplicate") + the IC-A1 digest-aware collision culture; DERIVATION — a digest compare is UNANSWERABLE against a digest-less fact row, and an always-Duplicate reading would mask a cross-class op_id reuse as a replay, violating IC-A1's visible-collision principle; kind equality is the only replay test the schema supports) |
| A3 | Rung ORDER on every entry path: idempotency FIRST after load — Duplicate-before-guard on TERMINAL (the CANCEL unit's comment: "a replayed CANCEL ⇒ Duplicate, not a terminal-sink rejection") and Duplicate-before-guard on every other state expect, driven as COMBINATION lanes (both conditions staged at once — the ch7-P3 combination-lane discipline); the actor path's full sequence (idempotency → state → version-presence → staleness → role) stays byte-identical (anchored: the l0d unit comments + the P1a E5 row; the built admission suite is the order's standing proof) |
| A4 | The UNNAMED state rungs realize as FAIL-LOUD GUARD THROWS — no state change, no op_id consumption, no invented rejection name (the ledger's rejection namespace is CLOSED; plan §4.1's culture: guard rejections are not envelope rejections): START on non-(CREATED ∧ none), KICKOFF on non-(WAITING ∧ kickoff_pending), CANCEL/FAIL on TERMINAL. The NAMED lanes stay named: `task_required` (L1), `not_active` (the actor rung), `unknown_instance` (L8), `op_id_collision` (A2) (derived: the units' "state rung stays unnamed — bare-REQUIRE semantics" + plan §4.1 + the divergence-stop rule; DERIVATION — the only alternatives are inventing registry names (foreclosed: the divergence stop; the model deliberately withheld names) or returning an unnamed rejected outcome (foreclosed: the Outcome type's reason domain is the registry — an unnamed reason is not expressible); the ch-4 start-side throw culture is the standing realization of bare-REQUIRE at operator surfaces) |

## Canonical fact/store matrix (F)

| ID | Rule |
|---|---|
| F1 | `StorePort` gains `commitLifecycle(input)` — the uniform-commit write member. Field list (the kernel derives every written value; the store writes verbatim, stamps `committed_at`, and accepts NO timestamp — CHK-C-TS-SOURCE): `instanceId`, `expectedVersion` (CAS), `fact: {kind: "STARTED" \| "CANCELLED" \| "TASK_SUPPLIED", opId} \| null` (null = FAIL's fact-less commit), and the write-set — REQUIRED: `newKernelStatus`, `newTerminalDisposition` (non-null EXACTLY when entering TERMINAL — the T-face, P1a E3's pattern), `newWait` (ALWAYS explicit, value or null — S5's same-move discipline made unforgettable at the type); OPTIONAL (present = written, absent = unchanged): `newCurrentStep`, `newRound`, `newTask`, `newRuntimeContext`, `newFailureReason`. ONE transaction: the instances UPDATE (CAS, version + 1) + the fact INSERT when non-null (REV-A1-TXN); results `committed(version) \| cas_conflict \| duplicate_op \| op_id_collision` (the A2 kind rule re-checked in-txn). Every lifecycle commit advances `version` by exactly one (the uniform-commit discipline: atomically under `instance.version`) (derived: contract:ch12-runtime-core#C12 + ledger §2 l0d/uniform-commit-discipline + the built CommitTransitionInput culture; DERIVATION — the member shape is the minimal store-dumb image of the five ops' write-sets; per-op store methods would move op semantics into the store (foreclosed: "the store stays dumb, the kernel writes meaning"), reusing commitTransition is foreclosed by its envelope/digest-required shape, and among store-dumb spellings (this partition vs an always-full write-set) every variant writes IDENTICAL rows for identical kernel decisions — a representation pin at the D1 grain, the required/optional partition chosen only to make the S5 same-move wait rule unforgettable at the type (the `newWait` always-explicit field)) |
| F2 | Fact row shape (C12's write face, S11's schema realized on the fact side): `entry_kind` = the fact name VERBATIM (`STARTED` \| `CANCELLED` \| `TASK_SUPPLIED` — the discriminator IS the fact name); `envelope`, `payload_digest`, `gate_decisions` all NULL (absent by entry class); `issued_agent_config` NULL by class FOREVER (C10); `seq` (monotonic, shared sequence with transitions), `op_id`, `committed_at` present. The P1a-staged class iff is now DRIVEN ON BOTH SIDES: a transition row carries all three class columns non-null, a fact row all three null — the mapper refuses violations LOUDLY in both directions (anchored: contract:ch12-runtime-core#C12, #C10 + the P1a S11 row) |
| F3 | The TS `TranscriptEntry` becomes the S11-staged DISCRIMINATED union: `TransitionEntry` = `{entryKind: "transition", seq, envelope, payloadDigest, gateDecisions, committedAt}` (the built shape + the discriminator) \| `LifecycleFactEntry` = `{entryKind: "STARTED" \| "CANCELLED" \| "TASK_SUPPLIED", seq, opId, committedAt}` — the fact variant LACKS the transition-only fields (absent by class AT THE TYPE, never stored known-empty — C10); NEITHER variant gains `issuedAgentConfig` (its writer is P2's; the P1a excess-property probe re-bases per variant) (derived: contract:ch12-runtime-core#C12, #C10 + the P1a S11 type-staging clause naming P1b as this variant's entry point; the field spellings are the established camelCase mapper culture) |
| F4 | Production reader narrowing (the S11-named set, in-boundary) — the two readers narrow DIFFERENTLY, each per its own contract: `kernel/gateProjection.ts` FILTERS — the projection walks TRANSITION rows only (fact rows carry no envelope and no gate decisions by class, so they are class-invisible to gate history; skipping is the faithful semantics, not data loss); `floor/debugBundle.ts` EXPOSES BOTH classes — the ch6-P3 bundle contract's pass-through fidelity binds (every detail-transcript row appears in the bundle): a transition row keeps its built bundle shape, a fact row maps to a DISCRIMINATED fact bundle entry (`seq` + `entryKind` + `opId` + `committedAt` — the class-shared fields in full, F3's fact variant mirrored; the transition-only fields ABSENT by class — never known-empty), and the bundle's entry-keyset matrix re-bases per class (the P1a K-matrix precedent); the testkit round-reconstruction and checker walks filter like the projection where they read envelopes; every narrowing is an EXHAUSTIVE switch/discriminant, never a cast (anchored: the P1a S11 row's named reader set; contract:ch12-runtime-core#C12; prose:ch6-P3 bundle pass-through contract) |
| F5 | `getTimeline` and `getInstanceDetail` return BOTH entry classes with the kind VISIBLE, committed-rows-only rule unchanged (C12); the ONE shared row mapper splits on `entry_kind` and REFUSES loudly a fact row carrying any non-null class column or a transition row carrying a null one (the S11 iff enforced at the read boundary, per conjunct) (anchored: contract:ch12-runtime-core#C12, #C21) |

## Canonical genesis/type matrix (G)

| ID | Rule |
|---|---|
| G1 | The genesis write (CREATE's single `createInstance` call — C11's genesis clause, first WRITTEN here on P1a's schema support): `version: 1`, `round: 0`, `current_step: NULL`, `kernel_status: "CREATED"`, `terminal_disposition: NULL`, `activation_mode` ← the effective resolved mode (MODEL token stored — `immediate` \| `deferred_kickoff`), `wait: NULL`, `runtime_context: none`, `failure_reason: NULL`, `run_overrides` ← the snapshot carried on the instance (G2's field; absent input stores `{}` — the store writes the VALUE, the P1a `{}` hardcode retires), `task` ← the input or NULL, `binding` ← the coverage-validated resolution. The genesis equality lane asserts the RAW stored row (columns, not just the mapped instance) so a dropped snapshot write reds (anchored: contract:ch12-runtime-core#C11 genesis + activation clauses; the CREATE_INSTANCE unit verbatim; contract:ch12-runtime-core#C9) |
| G2 | The `WorkflowInstance` TS flip (the P1a S9/T3 staged step, landing WITH its inhabitants): `task: string \| null`, `currentStep: StepId \| null`; the MEASURED production reader set narrows with the established guard patterns — `kernel/dispatchIntent.ts` (the packet's `task` read: activate/HANDLE call sites guarantee non-null; integrity-throw narrowing), `kernel/processGate.ts`, `kernel/gateProjection.ts`, and `kernel/kernel.ts`'s two HANDLE-body `currentStep` reads (ACTIVE ⇒ non-null by the state rung — the P1a T3 argument, now type-visible); the untruncated `instance.task`/`instance.currentStep` reader sweep re-runs at build. The aggregate ALSO gains `runOverrides: Readonly<Record<StepId, Readonly<Record<string, unknown>>>>` (C9's snapshot face — step-id → agent-config-class map, each entry kernel-opaque per C7): the store's create write DE-HARDCODES from the P1a constant `{}` to the instance value and `rowToInstance` decodes the column (the round-trip closes), while NO production reader exists until P2's cascade (C8/C9 — the P1a S8 staging honored: the input surface is P1b's, the consumption P2's) (anchored: the P1a T3/S9/S8 rows naming this packet as the flip's and the CREATE-input surface's home + their named reader list; contract:ch12-runtime-core#C11, contract:ch12-runtime-core#C9, contract:ch12-runtime-core#C7) |
| G3 | `WorkflowTemplate` gains `activation?: {mode: ActivationMode}` — the C1 admission-default face on the DIRECT construction channel: `admitTemplate` MATERIALIZES an absent key to `{mode: "immediate"}` on the ADMITTED value (the advancesRound A-family precedent — admission expands, never mutates its input; raw directly-constructed templates may omit it); the DOMAIN value carries the model token (`deferred_kickoff`) — the authored camelCase faces are the create wire (I3) and P4's YAML walk; the FILE key stays unauthorable until P4 (the ch8 unknown-key rejection stands — C25's window; the source-form lanes, path grammar, and CLI validate extension are P4's) (derived: contract:ch12-runtime-core#C1 + #C25 staging; DERIVATION — the optional-input/materialized-admitted split is the built advancesRound/gates admission pattern, the only shape that keeps raw construction legal while honoring C1's "materialized once at admission, no absent state downstream"; a required-everywhere field would break every existing raw template literal for zero semantic gain) |

## Canonical outcome-vocabulary matrix (V)

| ID | Rule |
|---|---|
| V1 | The lifecycle outcome vocabulary (domain/outcome.ts — the units' return vocabulary, model-verbatim kinds; TS spellings are semantics-free pins): `Created` = `{kind: "created", instanceId, version}` (the unit's `Created(instance.version)`; the id echo is the ch-4 `Started` precedent — the CLI data doc names the minted id); `Accepted` = `{kind: "accepted"}` (bare — lifecycle intents carry no expectedVersion, so no caller needs a version from a hold); `Activated` = `{kind: "activated", instanceId, version, intent: DispatchIntent}` (the `Started` shape's successor — the FULL continuity set: instanceId + version + the first dispatch, exactly the fields the shipped stdout doc carries today); `Terminated` = `{kind: "terminated", disposition: "cancelled" \| "failed"}`. Per-op unions (the precise kernel signatures): create → `Created \| Rejected(task_required)`; start → `Activated \| Accepted \| Duplicate \| Rejected(unknown_instance \| op_id_collision)`; kickoff → `Activated \| Duplicate \| Rejected(unknown_instance \| op_id_collision)`; cancel → `Terminated \| Duplicate \| Rejected(unknown_instance \| op_id_collision)`; fail → `Terminated \| Rejected(unknown_instance)`. HANDLE's `Outcome` type is UNTOUCHED (no new arms — the actor vocabulary is closed); the ingress `submitIntent` returns the op unions plus the `invalid_shape` rejected arm; `Started` RETIRES with the one-shot (W1). The shared arms (`Duplicate`, the rejected shapes) REUSE the existing Outcome arm forms verbatim (derived: the seven units' RETURN lines + contract:ch12-runtime-core#C20's outcome-class framing; DERIVATION — every field beyond the model's letter is either the Started-precedent echo (instanceId, version) or a reuse of an existing arm shape, and the echoes are CONTINUITY-FORCED, not free: the shipped `start` verb's stdout doc carries `instanceId`/`version` TODAY via `Started`, and W2's bridge emits the START leg's outcome as that same doc — DROPPING the fields would be the breaking surface change C25's bridge exists to avoid, so the carried fields are the no-behavior-change default; a version on `Accepted` is foreclosed as dead surface — no lifecycle consumer reads it, and the floor is the state read) |

## Canonical retirement/bridge matrix (W)

| ID | Rule |
|---|---|
| W1 | The retirement sweep (C24, R-ABSENCE-CONSUMERS): consumers enumerated by the RETIRED values' names — `startInstance`, `StartInstanceInput`, `Started`, `resolveRuntimeContext`, `HarnessStartInput` — never only the new tokens; `kernel/start.ts` is DELETED (its binding-coverage resolver moves INTO the lifecycle module verbatim — L1); the `Kernel` interface drops `startInstance` and gains the typed entry family; the export removals make every TYPED consumer a compile error in the same commit, and the authoring receipt (Embedding gates — 18 files for `startInstance`, 7 for `Started`, 6 for `runtimeContextRef`) RE-RUNS UNTRUNCATED at build with a required end state of ZERO consumers outside this packet's own probes and comments (anchored: contract:ch12-runtime-core#C24; R-ABSENCE-CONSUMERS, R-UNTRUNCATED-SWEEP) |
| W2 | The C25 in-handler CLI bridge: BOTH shipped `kernel.startInstance` call sites — `cli/main.ts` (verbStart) and `cli/dev/main.ts` (the replay harness's start binding) — rewire to an in-handler CREATE→START sequence (the bridge mints the instance id from the existing source and the START `op_id` from the nonce family); the bridge passes NO CREATE-level mode (immediate default — the deferred path in the window is ingress/test-driven, J1; `--mode` arrives with C20's verb surface at P4) and is NOT the C19 convenience verb (interim wiring, P4-retired — naming it here keeps C19 and C24 unbent); the verb emits the START leg's `Activated` outcome as the stdout data document (the CREATE leg's `Created` is interior); a CREATE-committed/START-rejected residue is UNREACHABLE on the bridge's business paths (task and binding failures reject AT CREATE — verbStart's own `--task` parse gate makes `task_required` unreachable through the verb; `required` templates never reach CREATE, the Y6 eager guard staying until P3), and any non-business residue is an ordinary CREATED instance, resumable by a fresh START; the binding-coverage throw stays the verb's ONE usage lane (the 2-vs-1 split preserved) (anchored: contract:ch12-runtime-core#C25 — the bridge paragraph verbatim; #C19) |
| W3 | The trace-harness CONTRACT re-bases (testkit — counts in the sizing scan): `TraceSeams.start` becomes the lifecycle composition seam (CREATE→START through the kernel under test); the start STEP gains `opId` (the START intent's op_id, fixture-declared, deterministic) and its expect becomes `{currentStep, version: 2}` (genesis v1 + the activation commit v2); `HarnessStartInput` retires with the mirror (W1); the `runtimeContextRef` passthrough re-homes onto the START leg (L3); `finalTranscript` entries stay `[seq, opId]` with the STARTED fact appearing as `[1, <start opId>]`; the version lift tracks the shift; `finalState` is shape-unchanged. The dev CLI replay fixture-schema validator re-bases WITH the contract (the P1a W2 precedent — the start-step keyset gains `opId`; usage-2 refusals updated; no verb/flag/handler semantics change) (derived: contract:ch12-runtime-core#C25 + the built harness contract; DERIVATION — the seam MUST compose CREATE→START because the one-shot is retired with no parallel path (C24); the version-2 expect and the seq-1 fact are L2/F1's arithmetic, not choices; the fixture `opId` key is the minimal deterministic carrier for the fact's transcript expectation) |
| W4 | The fixture re-base DISCIPLINE (the equivalence family's scoped reading): every existing trace/journey/CLI/emitLoop/twoWorker fixture re-bases MECHANICALLY under the split map — the transcript gains EXACTLY the STARTED fact at seq 1 (every transition row's payload bytes and RELATIVE order preserved; seq and version expectations shift by exactly one), start-surface outcome assertions move to the V1 vocabulary, and NOTHING else changes: actor-path outcome kinds, rejection names, gate decisions, digests, and diag classifications are IDENTICAL over the FULL existing suite — the re-based suite green is the packet's behavior-preservation proof for the actor path (derived: contract:ch12-runtime-core#C24/#C25 + L2/F1; DERIVATION — the +1 shifts are entailed arithmetic of one fact row and one composed activation commit; any fixture change outside the enumerated classes is a regression, not a re-base) |

## Canonical journey/reachability matrix (J)

| ID | Rule |
|---|---|
| J1 | The context-free deferred-hold JOURNEY (C25's staging — the P1 acceptance vehicle; ingress-driven over PRODUCTION bindings: real SQLite store, real ingress, real kernel, deterministic; a dedicated suite): `create` (mode `deferredKickoff`, NO task) → `Created` + the genesis floor-read (CREATED, round 0, null step, `none` context) → `start` → `Accepted` + WAITING(kickoff_pending) + `ready(∅)` + the STARTED fact on the timeline → an actor-envelope probe → `not_active` (the WAITING leg of J3) → the SAME start replayed → `Duplicate` → `kickoff` (task) → `Activated` + ACTIVE + round 1 + the task set + the TASK_SUPPLIED fact + `wait` NULL → `cancel` → `Terminated(cancelled)` + TERMINAL + `cancelled` + the CANCELLED fact + `runAllCheckers` green — the full hold/kickoff/cancel machinery with no provider leg (anchored: contract:ch12-runtime-core#C25 — the journey's leg list verbatim, the Duplicate and floor-read legs its stated machinery driven end-to-end) |
| J2 | The SHIPPED-entrypoint journey (R-ACTIVATION-JOURNEY): the existing subprocess journey suite (`cli/journey.test.ts`) re-bases THROUGH the bridge — subprocess, production bindings, the full lifecycle from the operator-authored input to the end-state reads — proving the rewired shipped `start` path end-to-end; the DEFERRED path ships NO CLI verb by C25's own staging (SCOPED exclusion — deferral home: P4's verb surface) (anchored: R-ACTIVATION-JOURNEY + contract:ch12-runtime-core#C25) |
| J3 | Reachable-state coverage completion (the `l0d/actor-routable-execution` share, BOTH-ENDS at this commit): fresh actor envelopes probed against machinery-reachable CREATED (post-create) and WAITING (J1's probe) → `not_active`; ACTIVE admits and TERMINAL rejects ride P1a's lanes and the existing suite; the reciprocal slice entry lands in ch12-p1a's file in this commit (anchored: ledger §2 l0d/actor-routable-execution + the P1a share declaration; plan §12.4 P1b row) |
| J4 | `l0d/readiness-gates-dispatch` driven (disposition: test): the SINGLE-SHOT half — a fresh second START (state non-CREATED: held, active, and terminal variants) → the A4 guard throw with NO state change and NO op_id consumption (a subsequent replay of the FIRST op still returns Duplicate — the combination lane); the READY-GATE half — a deferred START produces NO dispatch intent (the hold returns `Accepted`, J1), activation write-sets asserted EXACTLY (L7), and activate's REQUIRE stated as the structural invariant (L7's fail-loud guard) (anchored: ledger §2 l0d/readiness-gates-dispatch + the invariant-disposition map) |

## Canonical terminal-extension matrix (T)

| ID | Rule |
|---|---|
| T1 | The terminal WRITER family grows to THREE — the COMPLETE branch (`done`, P1a), CANCEL (`cancelled`), FAIL (`failed`) — each writing `kernel_status ← TERMINAL` + its disposition EXACTLY ONCE from a non-terminal state in ONE atomic move; the single-write discipline stays STRUCTURAL (the sink guards reject every fresh mutation on TERMINAL, a replayed op returns Duplicate without a write, and the CAS restart re-checks state) AND checker-verified; `failure_reason` is written ONLY by FAIL and non-null ONLY at `failed` (anchored: contract:ch12-runtime-core#C11 single-write + the CANCEL/FAIL units; ledger §2 l0d/terminal-is-a-sink) |
| T2 | The `l0d/terminal-is-a-sink` checker family GROWS WITH its writers (the P1a T2(b) staged growth, in `storeCheckers.ts`): (b) extends per disposition — `done` ⇔ the replayed position is terminal (unchanged); `cancelled` ⇔ a CANCELLED fact row exists, position-INDEPENDENT (cancel is legal from any non-terminal state — the reconstruction position is whatever the run reached); `failed` ⇔ `failure_reason` non-null (both directions — a failed row without a reason and a reason outside failed both red); (c)'s sink half now reads BOTH entry classes and is SCOPED to the ROW-BEARING terminal writers — `done` (the terminal transition row) and `cancelled` (the CANCELLED fact): NO committed row of EITHER class follows that terminal row; FAIL's write is deliberately ROW-LESS (L6), so a pure `InstanceDetail` reader cannot LOCATE it in the sequence — FAIL's sink proof is STRUCTURAL (the state rungs reject every post-FAIL mutation) and LANE-DRIVEN (a post-FAIL actor op → `not_active`, a post-FAIL fresh lifecycle op → the A4 guard, a replayed op → Duplicate), never checker-located; (a) and (d) unchanged (axis iff; wait NULL at TERMINAL — now behaviorally reachable via CANCEL- and FAIL-from-WAITING) (derived: ledger §2 l0d/terminal-is-a-sink + the P1a T2 row's growth clause; DERIVATION — the cancelled/failed legs are the disposition-consistency reading of "the disposition is consistent with the reconstruction" at the states cancel/fail can fire from; the fact-row witness is the only committed evidence of a cancel, and the reason iff is L6's write rule inverted) |
| T3 | Typed waiting goes BEHAVIORAL (S5's iff, live): a WAITING instance ALWAYS carries the typed wait — `{kind: "kickoff_pending", requestedBy: "activation", resumeEvents: ["KICKOFF"]}` (the model exhibit, the P1a T4 pinned shape — the ONLY P1b writer value); every transition LEAVING WAITING (KICKOFF, CANCEL, FAIL — L6's wait-NULL write is a member: FAIL guards only non-TERMINAL, so it fires from WAITING too) clears it in the SAME atomic move; both iff directions driven at the store boundary and on the journey (anchored: contract:ch12-runtime-core#C11 wait-iff + the P1a S5/T4 rows; the 04-l0d WaitReason exhibit) |

## Canonical drift/coverage matrix (D)

| ID | Rule |
|---|---|
| D1 | Unit-map flips at build (implement, realized): `RECEIVE` → `v3/src/kernel/kernel.ts#createKernel` (the kernel entry object IS the routed entry — handle + the intent family + fail; the wire discriminator lives at the ingress, I1; PARTIAL: the READY dispatch leg is P3's, declared in the slice), `CREATE_INSTANCE` → `v3/src/kernel/lifecycle.ts#createInstance`, `START` → `v3/src/kernel/lifecycle.ts#start` (PARTIAL: the provider legs are P3's), `KICKOFF` → `v3/src/kernel/lifecycle.ts#kickoff`, `CANCEL` → `v3/src/kernel/lifecycle.ts#cancel`, `FAIL` → `v3/src/kernel/lifecycle.ts#fail`, `activate` → `v3/src/kernel/lifecycle.ts#activate` — the lifecycle handlers live in `kernel/` (ADR-014: they ARE the kernel; a new FILE in the kernel directory is the admission.ts/start.ts file-per-concern culture, not a new module) (derived: plan §12.2 + the unit-map schema as built + ADR-014; DERIVATION — the RECEIVE pin follows the model's "one kernel entry" letter: the kernel object is the single routed entry and the ingress is rung-0 wire validation; the per-handler symbol pins are file-layout spellings, semantics-free) |
| D2 | Registry rows flipping `realized` at P1b: `l0d/OperatorIntent`, `l0d/KernelEvent`, `l0d/ActorEnvelope` (the entry classes — the wire family + the typed kernel entries; ActorEnvelope's l0d face IS the joins-under-the-discriminator routing), `l0d/Template` (the `activation` admission-default face — the TS field + materialization, G3; the P4 format face is a walk lane, not a registry witness). After this packet every ledger §4 l0d row is realized (anchored: ledger §4 l0d + the domainRegistry level-axis semantics) |
| D3 | The ledger is BYTE-IDENTICAL; the drift lanes are green before AND after — any drift-lane movement is a STOP, never a packet-local fix (anchored: plan §12.2; PI-3) |
| D4 | ALL FOUR unit-map rows whose codeRef is the deleted `start.ts#startInstance` re-point at the retirement (the MEASURED set — a JSON-side sweep beside W1's `*.ts` greps: `l0b-pseudocode/START_INSTANCE`, `l2-pseudocode/CREATE_INSTANCE`, `l2-pseudocode/activate`, `l2a-pseudocode/CREATE_INSTANCE`): the CREATE_INSTANCE-named rows and the l0b one-shot → `v3/src/kernel/lifecycle.ts#createInstance`, the activate-named row → `v3/src/kernel/lifecycle.ts#activate`; ALL FOUR rows keep their DECLARED dispositions — the three l2/l2a rows `alias/inherited`, the l0b row `implement` (the coverage tool's disposition lock binds a unit's disposition to its DECLARING packet's slice — ch4-p4's historical declaration; only the codeRef re-points, into the successor's home per the fold-chain culture — l0a HANDLE's own pattern: an earlier version whose live semantics are carried by successors maps alias/inherited into the successor's home; the one-shot's composed semantics ARE the split family per C24's own statement, and the genesis handler is the composition's anchor symbol). No row goes pending (the units stay realized — their semantics live) and none keeps the deleted `start.ts` ref (derived: contract:ch12-runtime-core#C24 + the unit-map fold-chain culture as built; DERIVATION — the alternatives are foreclosed: a pending flip would red the owned==realized lock on realized units, and a dangling codeRef fails the drift lane's exists+symbol resolution; alias/inherited-into-successor is the map's established encoding for exactly this fold relationship, and on an `alias/inherited` row the codeRef SYMBOL carries no semantics (the semantics live in the successors, plural — the split); the `#createInstance` pick over `#start`/`#activate` is a defended semantics-free spelling (genesis is the composition's entry), the D1-grain representation class, not a functionality choice — no drift lane, test, or reader distinguishes the spellings beyond exists+symbol) |

## Site × shape × phase grid (the lifecycle seam)

Sites are the awaited port/boundary calls of the entry family
(kernel-side; the ingress is synchronous validation with no store
access — I1). Phases: pre-state (before any load), pre-commit
(after load, before the atomic write — ZERO side effects on every
exit), commit, post-commit (pure derivation only — no new fallible
work). Every cell is a driven lane or an explicit rule-out.

| Site | Ops | Shape | Phase | Disposition |
|---|---|---|---|---|
| `definitions.load(templateRef)` | CREATE | null return | pre-commit | THROW (unknown ref — L1; driven: the create unknown-template lane) |
| `definitions.load(templateRef)` | CREATE | rejection/throw | pre-commit | propagates → `internal_failure` diag + rethrow (L9; the ch-4 TemplateLoadError culture at the CLI) |
| `definitions.load(instance.templateRef)` | START(BOTH modes — the L3 lane table reads `template.runtimeContext` before any commit)·KICKOFF·activate | null return | pre-commit | kernel INTEGRITY throw (the pinned-ref culture — the built `loadTemplate`; driven: the existing integrity lane pattern, re-used) |
| `definitions.load(instance.templateRef)` | START·KICKOFF·activate | rejection/throw | pre-commit | propagates → `internal_failure` diag + rethrow (L9; the built loadTemplate culture) |
| `store.loadInstance` | START·KICKOFF·CANCEL·FAIL | null return | pre-commit | `Rejected(unknown_instance)` (L8; driven per op) |
| `store.loadInstance` | all | rejection/throw | pre-commit | propagates → `internal_failure` + rethrow (L9) |
| `store.findOp` | START·KICKOFF·CANCEL | fact-kind hit / other-kind hit / null | pre-commit | Duplicate / `op_id_collision` / continue (A2; driven as combination lanes) |
| `store.findOp` | START·KICKOFF·CANCEL | rejection/throw | pre-commit | propagates → `internal_failure` + rethrow (L9) |
| `store.createInstance` | CREATE | duplicate-id throw | commit | store-integrity THROW, never Duplicate (L1; driven: the existing creation-uniqueness lane) |
| `store.createInstance` | CREATE | other rejection/throw | commit | propagates → `internal_failure` + rethrow (L9; no partial state — the single INSERT is the whole write) |
| `store.commitLifecycle` | START·KICKOFF·CANCEL·FAIL | `cas_conflict` | commit | restart from load (L9; driven: the raced-START combination lane) |
| `store.commitLifecycle` | START·KICKOFF·CANCEL | `duplicate_op` / `op_id_collision` | commit | Duplicate / rejected — the in-txn re-check (A2/F1; driven at the store boundary) |
| `store.commitLifecycle` | all | rejection/throw | commit | propagates → `internal_failure` + rethrow (L9) |
| intent derivation (`deriveDispatchIntent`) | START(immediate)·KICKOFF | — | post-commit | PURE over committed state + the pinned template — no awaited call, no fallible new work (L7; the HANDLE post-commit culture) |

Ruled out: no diag-store site (the sink is fail-open and BARE —
REV-DIAG-FAILOPEN; not a failure lane of this seam); no provider
site (P3's — the window has no provider call, L3); no egress site
(dispatch is a RETURNED value — commit ≠ deliver).

## Mirrored surface map (one canonical statement per rule)

- The GENESIS shape is canonical in G1; mirrors: L1's write clause,
  J1's genesis floor-read leg, the P1a S12 row (external pointer).
- The ACTIVATION write-set (ACTIVE + `template.start` + round 1) is
  canonical in L7; mirrors: L2's immediate-commit clause, L4's
  composed commit, W3's version-2 expect.
- The op_id/fact CONSUMPTION rule is CO-CANONICAL: the positive half
  (the fact in the same atomic move) in F1, the negative half (a
  rejected/thrown attempt consumes nothing — no write, no key) in
  A4; mirrors: L2/L4/L5's fact clauses, A2's replay reading, W4's
  transcript arithmetic, the Mutable-flow record.
- The KIND-AWARE idempotency rule is canonical in A2; mirrors: F1's
  in-txn re-check, L5's replayed-CANCEL comment, the grid's findOp
  row.
- The BARE-REQUIRE guard realization is canonical in A4; mirrors:
  L2/L4/L5/L6's state-rung clauses, J4's single-shot lanes.
- The interim WINDOW context lanes are canonical in L3; mirrors:
  I2's `runtimeContextRef` key, W3's passthrough re-home clause.
- The EFFECTIVE-MODE chain is canonical in L1; mirrors: G3's
  materialization, I3's mode token lane, W2's bridge no-mode clause.
- The WAIT shape + same-move clear is canonical in T3; mirrors:
  L2's deferred commit, L4/L5/L6's wait-NULL writes, F1's `newWait`
  always-explicit field.
- The SINGLE-WRITE terminal rule is canonical in T1; mirrors: the
  Claim's EXACTLY-ONCE clause, T2's per-disposition checker legs,
  the CANCEL/FAIL unit clauses, F1's `newTerminalDisposition`
  non-null-EXACTLY-when field.
- The DISCRIMINATED entry type is canonical in F3; mirrors: F2 (the
  stored face), F4 (readers), F5 (the mapper refusals), W4's
  timeline expectations.
- The RETIREMENT closure (compiler + measured sweep) is canonical
  in W1; mirrors: the Sizing/risk closure proof, D4's map re-point.

## In-context notes (the scarce budget)

- The store writes MODEL tokens verbatim (`deferred_kickoff`, the
  fact names as `entry_kind` values); the authored camelCase faces
  (`deferredKickoff`) live at the ingress wire and, later, P4's
  format walk — the mapping happens exactly once, at the wire.
- Extend-don't-fork: `kernel/lifecycle.ts` is a kernel FILE, not a
  module (ADR-014); the checker growth lives in the existing
  `storeCheckers.ts`; the ingress intent family lives in the
  existing `ingress/` module.
- The bridge is INTERIM wiring (C25): P4 lands the four-verb
  surface and retires it; nothing in this packet's CLI change is
  the C19 convenience verb.
- The `wait` and `run_overrides` encodings use the emit-lib
  canonical serialization culture (sorted keys, strict) — stored
  bytes deterministic and byte-testable (the P1a note carried
  forward for the new writers).
- FAIL is exported on the kernel entry (tests and P3's composition
  seam call it); activate is NOT — it is a private branch of
  START/KICKOFF (the model: internal, never routed).

## Embedding gates (v1-inherited)

- Target files: the mutation boundary below, nothing else.
- Entrypoints: the shipped CLI verb SET is unchanged (no new verb,
  no flag change — the bridge rewires `start`'s interior only); the
  ingress gains `submitIntent` (a library surface, not a shipped
  verb); the kernel entry family replaces `startInstance`.
- Mutation boundary: the production files + the fixture-bearing
  test files + `plan.md` (the P3-row alignment edit) +
  `ch12-p1a-lifecycle-axis.md` (the reciprocal share entry) + this
  packet. The two drift TEST files are in-boundary for the
  registry/map content locks (the P1a aftermath precedent carried
  forward at authoring time).
- Sweep receipts (authoring-time, 2026-07-21; re-run UNTRUNCATED at
  build — R-UNTRUNCATED-SWEEP): `startInstance` — 40 hits / 18
  files: production `kernel/kernel.ts`, `kernel/start.ts`,
  `cli/main.ts`, `cli/dev/main.ts`, `testkit/traceHarness.ts`,
  `testkit/storeCheckers.ts` (comment), `ports/diagnostics.ts`
  (comment); test-side `kernel/start.test.ts`,
  `kernel/diagEmission.test.ts`, the five trace tests,
  `emitLoop.test.ts`, `twoWorker.test.ts`,
  `ingress/ingress.test.ts`, `diag/sqliteDiagStore.test.ts`.
  `Started` — 7 files (`domain/outcome.ts`, `domain/index.ts`,
  `kernel/kernel.ts`, `kernel/start.ts`, `testkit/traceHarness.ts`,
  `testkit/traceHarness.test.ts`, `l0bTrace.test.ts`).
  `runtimeContextRef` — 6 files (`kernel/start.ts`,
  `kernel/start.test.ts`, `kernel/kernel.test.ts`,
  `l2aTrace.test.ts`, `testkit/traceHarness.ts`,
  `testkit/traceHarness.test.ts`). `StartInstanceInput` — 4 files
  (`kernel/index.ts`, `kernel/kernel.ts`, `kernel/start.ts`,
  `ports/diagnostics.ts` — the last a doc-comment mention).
  `resolveRuntimeContext` — 1 file (`kernel/start.ts`).
  `HarnessStartInput` — 2 files (`testkit/index.ts`,
  `testkit/traceHarness.ts`). ALL FIVE retired names carry their
  authoring receipt here and re-run UNTRUNCATED at build with a
  required end state of ZERO consumers outside this packet's own
  probes/comments (W1's parameterized set — the same five names).
  The `task`/`currentStep`
  production reader set is the P1a T3 named list (G2), re-swept at
  build.
- Type-ripple targets (lens-5 sweep class): every `TranscriptEntry`
  consumer (the F3 union breaks non-narrowed `entry.envelope`
  reads — F4's named set plus test-side literals); every
  `WorkflowInstance` literal construction site already in-boundary
  from P1a re-bases only if it constructs the flipped fields as
  non-null (no shape change — the flip WIDENS); the trace fixtures
  re-base under W3/W4.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/domain/outcome.ts",
      "v3/src/domain/instance.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/index.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/lifecycle.ts",
      "v3/src/kernel/start.ts",
      "v3/src/kernel/admission.ts",
      "v3/src/kernel/dispatchIntent.ts",
      "v3/src/kernel/processGate.ts",
      "v3/src/kernel/gateProjection.ts",
      "v3/src/kernel/index.ts",
      "v3/src/definition/admit.ts",
      "v3/src/ingress/ingress.ts",
      "v3/src/ingress/index.ts",
      "v3/src/ports/store.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/store/sqliteStore.ts",
      "v3/src/floor/floor.ts",
      "v3/src/floor/tail.ts",
      "v3/src/floor/debugBundle.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/testkit/storeCheckers.ts",
      "v3/src/testkit/index.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/admission.test.ts",
      "v3/src/kernel/lifecycle.test.ts",
      "v3/src/kernel/start.test.ts",
      "v3/src/kernel/processGate.test.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/kernel/gateProjection.test.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/ingress/ingress.test.ts",
      "v3/src/store/sqliteStore.test.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/src/l0dJourney.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch12-p1a-lifecycle-axis.md",
      "v3/implementation/packets/ch12-p1b-activation-machinery.md"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "I1", "class": "derived", "refs": ["contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C22", "prose:built ingress.ts contract"] },
      { "id": "I2", "class": "derived", "refs": ["contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C20"] },
      { "id": "I3", "class": "derived", "refs": ["contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C7", "contract:ch12-runtime-core#C20"] },
      { "id": "I4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C13", "prose:built ch7-P1 ingress diag contract"] },
      { "id": "L1", "class": "anchored", "refs": ["prose:l0d-pseudocode/CREATE_INSTANCE", "contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C11"] },
      { "id": "L2", "class": "derived", "refs": ["contract:ch12-runtime-core#C18", "contract:ch12-runtime-core#C12"] },
      { "id": "L3", "class": "derived", "refs": ["contract:ch12-runtime-core#C25", "contract:ch12-runtime-core#C14", "prose:ch11-P3b lane table as built + P1a X1"] },
      { "id": "L4", "class": "anchored", "refs": ["prose:l0d-pseudocode/KICKOFF", "contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C12"] },
      { "id": "L5", "class": "anchored", "refs": ["prose:l0d-pseudocode/CANCEL", "contract:ch12-runtime-core#C12", "contract:ch12-runtime-core#C15"] },
      { "id": "L6", "class": "anchored", "refs": ["prose:l0d-pseudocode/FAIL", "contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C15"] },
      { "id": "L7", "class": "anchored", "refs": ["prose:l0d-pseudocode/activate", "contract:ch12-runtime-core#C11", "prose:ledger §2 l0d/readiness-gates-dispatch"] },
      { "id": "L8", "class": "derived", "refs": ["prose:built HANDLE load contract", "prose:ledger §3 unknown_instance", "contract:ch12-runtime-core#C15"] },
      { "id": "L9", "class": "derived", "refs": ["contract:ch12-runtime-core#C18", "prose:built kernel diag + CAS culture"] },
      { "id": "A1", "class": "anchored", "refs": ["prose:l0d-pseudocode/admit_loaded", "contract:ch12-runtime-core#C13", "prose:built ch11-P1 ladder"] },
      { "id": "A2", "class": "derived", "refs": ["contract:ch12-runtime-core#C12", "prose:IC-A1 digest-aware collision culture"] },
      { "id": "A3", "class": "anchored", "refs": ["prose:l0d unit comments (Duplicate-before-guard)", "prose:P1a E5 rung order"] },
      { "id": "A4", "class": "derived", "refs": ["prose:l0d units' unnamed state rungs", "prose:plan §4.1 no-invented-names"] },
      { "id": "F1", "class": "derived", "refs": ["contract:ch12-runtime-core#C12", "prose:ledger §2 l0d/uniform-commit-discipline", "prose:built CommitTransitionInput culture"] },
      { "id": "F2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C12", "contract:ch12-runtime-core#C10"] },
      { "id": "F3", "class": "derived", "refs": ["contract:ch12-runtime-core#C12", "contract:ch12-runtime-core#C10"] },
      { "id": "F4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C12", "prose:P1a S11 named reader set", "prose:ch6-P3 bundle pass-through contract"] },
      { "id": "F5", "class": "anchored", "refs": ["contract:ch12-runtime-core#C12", "contract:ch12-runtime-core#C21"] },
      { "id": "G1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C9", "prose:l0d-pseudocode/CREATE_INSTANCE"] },
      { "id": "G2", "class": "anchored", "refs": ["prose:P1a T3/S9/S8 staged flip + named readers", "contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C9", "contract:ch12-runtime-core#C7"] },
      { "id": "G3", "class": "derived", "refs": ["contract:ch12-runtime-core#C1", "contract:ch12-runtime-core#C25"] },
      { "id": "V1", "class": "derived", "refs": ["prose:l0d units' RETURN vocabulary", "contract:ch12-runtime-core#C20"] },
      { "id": "W1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C24"] },
      { "id": "W2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C25", "contract:ch12-runtime-core#C19"] },
      { "id": "W3", "class": "derived", "refs": ["contract:ch12-runtime-core#C25", "prose:built traceHarness contract"] },
      { "id": "W4", "class": "derived", "refs": ["contract:ch12-runtime-core#C24", "contract:ch12-runtime-core#C25"] },
      { "id": "J1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C25"] },
      { "id": "J2", "class": "anchored", "refs": ["prose:R-ACTIVATION-JOURNEY", "contract:ch12-runtime-core#C25"] },
      { "id": "J3", "class": "anchored", "refs": ["prose:ledger §2 l0d/actor-routable-execution", "prose:P1a share declaration + plan §12.4 P1b row"] },
      { "id": "J4", "class": "anchored", "refs": ["prose:ledger §2 l0d/readiness-gates-dispatch", "prose:invariant-disposition-map l0d rows"] },
      { "id": "T1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "prose:l0d CANCEL/FAIL units", "prose:ledger §2 l0d/terminal-is-a-sink"] },
      { "id": "T2", "class": "derived", "refs": ["prose:ledger §2 l0d/terminal-is-a-sink", "prose:P1a T2 growth clause"] },
      { "id": "T3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "prose:04-l0d WaitReason exhibit + P1a T4"] },
      { "id": "D1", "class": "derived", "refs": ["prose:plan §12.2", "prose:drift/unitMap.json schema as built", "ADR-014"] },
      { "id": "D2", "class": "anchored", "refs": ["prose:ledger §4 l0d", "prose:domainRegistry level-axis semantics"] },
      { "id": "D3", "class": "anchored", "refs": ["prose:plan §12.2", "prose:PI-3 standing rule"] },
      { "id": "D4", "class": "derived", "refs": ["contract:ch12-runtime-core#C24", "prose:unitMap fold-chain culture (l0a HANDLE alias/inherited)"] }
    ]
  }
}
```

## Pre-approval flags

None. Zero new-decision manifest rows (tally: 23 anchored / 18
derived / 0 new-decision); no narrowing, no contract-reality issue
open, no route awaiting an approve-time decision. The window
re-home (L3), the kind-aware idempotency rung (A2), the bare-REQUIRE
guard realization (A4), the outcome-vocabulary spellings (V1), and
the one-shot map re-point (D4) are DERIVED rows whose alternatives
are foreclosed by ratified text, the closed rejection namespace, the
single-shot guard, and the map's own fold culture — their derivation
notes are in-row.

## Acceptance

- Contract tests: no new CT-* ids — the packet's proof surface is
  the family set below; the standing suites re-base under W4.
- Test disciplines + family inventories (R-ALTITUDE-LINE form):
  - **The ingress-intent family (I)** — discipline: every keyset
    lane driven BOTH directions (a conforming intent reaches the
    kernel; each field violation refuses with its detail token, per
    field, unknown-key and non-plain-object included); the
    `templateRef.version` ladder driven rung-by-rung incl. `-0`;
    the runOverrides canonicalizable refusal driven with a
    non-finite and a non-plain value. Membership: the I rows
    (owner: this packet; driven in `ingress/ingress.test.ts`).
  - **The lifecycle-op family (L)** — discipline: per op — a
    success lane asserting the FULL committed instance state by
    EQUALITY (the P1a creation-equality culture), every guard lane
    (A4) asserting the throw AND zero state change AND op_id
    unconsumed, the unknown-instance lane, the L3 window lanes
    (all five), AND the grid's failure-site cells as a
    PARAMETERIZED sub-family — every awaited-site × shape × phase
    cell of the grid is driven or carries its stated rule-out: the
    port rejection/throw cells via a rejecting fake (the propagated
    throw + the `internal_failure` diag classification + zero
    state), the CAS cell via the raced-op combination lane, the
    commitLifecycle atomicity cell via the F-family trigger-fault
    rollback. Membership: L1–L9 + the grid rows (owner: this
    packet; driven in `kernel/lifecycle.test.ts` +
    `kernel/kernel.test.ts` + `store/sqliteStore.test.ts`).
  - **The admission family (A)** — discipline: the kind-aware rung
    driven with all three hit classes (own-kind / other-fact-kind /
    transition) per op-carrying intent PLUS the actor-side fact-hit
    mirror; Duplicate-before-guard as COMBINATION lanes (replayed
    op against TERMINAL and against WAITING); the actor ladder's
    existing suite green UNCHANGED as the equivalence proof.
    Membership: A1–A4 (owner: this packet; driven in
    `kernel/admission.test.ts` + `kernel/lifecycle.test.ts`).
  - **The fact/store family (F)** — discipline: commitLifecycle
    atomicity ABLE TO FAIL (the P1a trigger-fault pattern between
    the instances UPDATE and the fact INSERT — both halves roll
    back); the fact-side class iff driven PER CONJUNCT (each class
    column non-null alone on a fact row refuses; the P1a aftermath
    lesson applied at write time); the kind-aware in-txn re-check;
    version+1 per commit; timeline/detail both-classes reads with
    kind visible; the mapper refusals both directions. Membership:
    F1–F5 (owner: this packet; driven in
    `store/sqliteStore.test.ts` + `floor/floor.test.ts`).
  - **The genesis/type family (G)** — discipline: the genesis
    equality lane (a wrong column default reds) PLUS the non-empty
    snapshot lane — a CREATE carrying a NON-EMPTY `runOverrides`
    asserts the RAW stored column equals the canonicalized value
    AND `rowToInstance` round-trips it (a regression to the retired
    `{}` hardcode reds — G1's red-on-drop claim driven, not just
    the default cell); the task/
    currentStep NULL round-trip (now legal — the P1a S9 guard lanes
    re-base to accept genesis NULLs and still refuse
    non-genesis-consistent corruption); the G3 materialization
    lanes (absent → immediate on the admitted value; an authored
    mode carried verbatim; the raw input never mutated); compile
    probes on the narrowing set (a non-narrowed `entry.envelope` or
    `instance.task` read is a compile error — @ts-expect-error
    armed). Membership: G1–G3 (owner: this packet; driven in
    `store/sqliteStore.test.ts`, `definition/admit.test.ts`,
    `kernel/processGate.test.ts` compile probes).
  - **The outcome-vocabulary family (V)** — discipline: exact-union
    type probes per arm (out-of-union kinds red; excess-property
    probes prove no cross-arm fields; the retired `Started` import
    is a compile error — the W1 probe). Membership: V1 (owner:
    this packet; driven in `kernel/processGate.test.ts` probes).
  - **The retirement/bridge family (W)** — discipline: the
    untruncated build re-run of the W1 sweeps finds ZERO consumers
    of the retired names outside this packet's probes/comments; the
    bridge's verb lanes driven (the Activated stdout doc, the
    binding-coverage usage lane preserved, the unknown-template
    lane, exit classes unchanged); the dev replay validator's
    re-based keyset refusals (retired keys usage-2, the new opId
    key required). Membership: W1–W4 (owner: this packet; driven in
    `cli/cli.test.ts`, `cli/journey.test.ts`, `cli/dev/dev.test.ts`
    + the type probes).
  - **The journey family (J)** — discipline: J1 executed end-to-end
    on production bindings with EVERY leg's outcome, floor state,
    and timeline row asserted; J2 green through the bridge
    (subprocess); the J3 probes against machinery-reachable states;
    J4's single-shot combination lanes. Membership: J1–J4 (owner:
    this packet; driven in `l0dJourney.test.ts` +
    `cli/journey.test.ts` + `kernel/lifecycle.test.ts`).
  - **The terminal/checker family (T)** — discipline: each new
    checker leg red-proven on a fabricated violation (cancelled
    without a CANCELLED fact; a reason outside failed; a failed
    without a reason; a committed row after the terminal ROW —
    either class, fabricated after a terminal transition row AND
    after a CANCELLED fact (the two row-bearing writers — FAIL's
    row-less sink is lane-driven per T2(c), not checker-located);
    a non-null wait at TERMINAL — with BOTH
    WAITING-leaving terminal paths, CANCEL-from-WAITING and
    FAIL-from-WAITING, each driven as a positive wait-NULL lane);
    the wait iff both directions at the store
    boundary AND on the journey; PLUS the post-FAIL sink lanes
    (actor op → `not_active`, fresh lifecycle op → guard throw,
    replayed op → Duplicate). Membership: T1–T3 (owner: this
    packet; driven in `testkit/storeCheckers.test.ts` +
    `store/sqliteStore.test.ts`).
  - **The equivalence family (W4's discipline)** — membership: the
    FULL existing suite (owner: the build-time `pnpm v3:test` run);
    every re-base confined to the enumerated classes (the STARTED
    fact, the +1 shifts, the V1 start-surface outcomes) — any other
    fixture delta is a finding at build, not a re-base.
  - **The drift/registry family (D)** — discipline: the seven
    unit-map flips + the D4 re-point asserted (the aftermath-scoped
    content locks pin the packet-owned rows verbatim — the P1a
    precedent); D2's realized flips witnessed by the typecheck; the
    ledger byte-identical; every drift lane green before AND after.
    Membership: D1–D4 (owner: this packet).
- Build-close sensitivity (R-DERIVED-PROBES): the probe table
  derives from the families above — ≥1 red-on-break probe per
  family, materialized in the Build record.
- Checks: `pnpm v3:test` + the v3 bridges during build; FULL
  `pnpm ci:local` at build close; `tools/v3-model/check.sh`
  untouched (no model-plane edit rides this packet).
- Drift tests green (standing, unconditional — PI-3): D3's rule.
- Standing review rules in force: REV-A1-TXN (the fact INSERT and
  the instances UPDATE in ONE transaction — F1); REV-B-LOCAL-NOT-
  AUTHORITY (no process-local lifecycle cache; the store row is the
  only truth the restart-from-load re-reads); REV-C-PROJECTIONS-
  READONLY (the floor stays read-only; the journey reads never
  write); REV-E-NO-ADAPTER-BRANCH (no adapter branching enters —
  the provider seam is P3's); REV-DIAG-FAILOPEN (every new
  `diag.emit` call site BARE — I4, L9).

## Build record

**Rounds.** One production cutover pass (domain outcome/instance/
template types, the store's commitLifecycle + kind-aware findOp + the
two-class mapper, the parameterized admission, the new
`kernel/lifecycle.ts` entry family + the kernel wiring, the ingress
intent family, the G3 admission materialization, the two CLI bridges,
the drift flips — `start.ts` deleted, `tsc` enumerated every consumer
exactly as W1 predicted: 122 errors), one test-re-base wave to
first-green (the W4 discipline applied mechanically across 25 files —
five parallel build agents on disjoint partitions; the +1
version/seq shifts, the STARTED fact rows, the entryKind narrowing;
the new `kernel/lifecycle.test.ts`, `l0dJourney.test.ts`, the
F-family store lanes, the I-family ingress lanes, the T2 growth
lanes), then one fix round (sync-throw assertion forms on the mapper
refusals; two eslint autofixes; the W1/V1 compile probes' placement).
`rounds.implementation: 3`.

**Test delta.** 46 files / 1041 tests before → 47 files / **1095**
after (+54; `start.test.ts` retired into `lifecycle.test.ts`, two new
files): the L/A families in `kernel/lifecycle.test.ts` (35 — per-op
equality lanes, guard lanes with zero-state-change + op-unconsumed
asserts, the five L3 window lanes, kind-aware collision combinations,
Duplicate-before-guard after state movement, the J3 CREATED/WAITING
probes, the L9 diag parity), the J1 journey (`l0dJourney.test.ts` —
ingress-driven, production bindings, six legs each asserting outcome
+ floor state + timeline), the F family in `store/sqliteStore.test.ts`
(+8 — one-txn fact+state with the raw all-NULL row assert, the
trigger-fault rollback, in-txn kind-aware re-check, cas_conflict,
FAIL's row-less commit with absent-optionals-unchanged, per-conjunct
fact-side iff refusals, unknown entry_kind refusal, the non-empty
runOverrides raw-column round-trip), the I family in
`ingress/ingress.test.ts` (+21 — accept lanes with verbatim kernel
inputs and the single-point mode mapping, per-token refusal lanes
incl. the full templateRef.version ladder and the C7 canonicalizable
gate), the T2 growth lanes in `testkit/storeCheckers.test.ts` (+6),
the W2 binding-coverage usage lane in `cli/cli.test.ts`, and the
W1/V1 compile probes in `kernel/processGate.test.ts`. Checks at
close: `pnpm v3:test` 1095/1095, `pnpm v3:typecheck` clean,
`pnpm v3:lint` clean, `pnpm v3:packet-lint --forbid-reopened` 0
errors, `check_coverage.py` OK in BOTH modes, full `pnpm ci:local`
passed.

**Sensitivity probes (R-DERIVED-PROBES) — applied → RED → restored →
GREEN (restores byte-verified against scratchpad copies; final
1095/1095 + clean typecheck):**

| Family | Mutation | Expected red | Observed |
|---|---|---|---|
| equivalence (W4) | store commit writes `newRound + 1` | the golden traces red | RED — l0aTrace 1/6 |
| ingress (I) | the runOverrides canonicalizable gate dropped | the C7 fail-closed lanes red | RED — ingress.test 1/63 |
| lifecycle (L) | `task_required` check neutered | the create rejection lane reds | RED — lifecycle.test 1/35 |
| admission (A) | the idempotency rung made kind-BLIND | the cross-kind collision lanes red | RED — lifecycle.test 2/35 |
| fact/store (F) | commitLifecycle drops the `newWait` write | the deferred-hold + wait-iff lanes red | RED — store+lifecycle 6/85 |
| genesis/type (G) | the G3 activation materialization dropped | the admitted-value equality lanes red | RED — definition 2/198 |
| type (V/W1) | the `Started` export revived | the retired-name probe's suppression unused | RED — typecheck TS2578 |
| bridge (W) | the verb emits the CREATE leg's doc | the activated-stdout + downstream lanes red | RED — cli.test 25/42 |
| journey (J) | the deferred hold commits ACTIVE | the J1 hold leg reds | RED — l0dJourney 1/1 |
| terminal (T) | the cancelled-witness checker leg neutered | the fabricated cancelled-without-fact lane reds | first probe GREEN (blind lane found — see Surprises); lanes added → RED 1/33; the failed-reason leg RED 1/33 |
| drift (D) | unitMap RECEIVE flipped `pending` | the owned==realized lock reds | RED — plain `check_coverage.py` FAILs |

**Untruncated sweep receipts (R-UNTRUNCATED-SWEEP, re-run at close).**
(1) `startInstance` over `v3/src`: 6 comment-only hits, ZERO
consumers — the kernel.ts/kernel-index retirement notes, the
sqliteDiagStore.test re-base note, and (post-sweep) the cli/main.ts
header + storeCheckers doc comments were REWRITTEN present-tense (a
stale-comment class the sweep caught). (2) `StartInstanceInput`: 2
comment hits (the retirement notes), zero consumers.
(3) `Started`: 1 hit — the V1 continuity doc comment in outcome.ts;
the type itself is the W1 compile probe's target. (4)
`resolveRuntimeContext`: 0 hits. (5) `HarnessStartInput`: 1 comment
hit (the W3 retirement note). (6) `runtimeContextRef` (L3's separate
wire-key receipt): live in exactly the L3 carrier set — ingress,
lifecycle, harness + their tests and l2aTrace. ZERO consumers of any
retired name remain.

**Surprises.**
- The coverage tool's unit-map lock binds a unit's DISPOSITION to its
  DECLARING packet's slice (ch4-p4's `implement` for the l0b
  one-shot) — D4's alias-flip half was tool-foreclosed; the row keeps
  `implement` and only the codeRef re-points (D4 amended in-build,
  the fold recorded here).
- `definition/validate.test.ts` was a G3 structural consumer OUTSIDE
  the declared boundary (the canonical-example round-trip asserts the
  ADMITTED value, which now carries the materialized activation) —
  the boundary gained the file in-build (the lens-5/P3b
  boundary-ripple class, caught by the suite, not the sweep).
- The T-family probe pass caught its OWN blind lane: the
  cancelled-witness and failed-reason checker legs had no
  fabricated-violation drivers (the re-base agents were scoped to
  existing lanes by design) — the six T2 growth lanes were added and
  both legs red-proven (the arm-gate-2 green-but-blind class caught
  at build, by R-DERIVED-PROBES working as designed).
- The store's genesis NULL-guards re-scoped cleanly: ACTIVE+NULL and
  done+NULL refuse, genesis/held NULLs pass — the old S9 any-NULL
  refusal lanes re-based to fabricate the ACTIVE shape and stayed
  red-catching.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic (activation machinery, split part)",
    "prediction": { "predicted": "projection", "reasoning": "the P1 row's inherited prediction: l0d-pseudocode + ledger + the ratified chapter draft resolve every decision; the split inherits it", "discovered": "projection" },
    "provenance": { "anchored": 23, "derived": 18, "new_decision": 0 },
    "rounds": { "review": 3, "doc_refinement": 0, "implementation": 3 },
    "stops": [],
    "detector_misses": [],
    "learned": "the arm's gate-1 record-precision class repeated (8 findings on sizing letter-trips, manifest foreclosures, grid cells, receipts — zero product); R-DERIVED-PROBES caught its own blind lane at build (the T2 growth legs had no fabricated drivers until the probe stayed green); gate-2 out-caught with 2 product + 8 test-evidence items — the wire-descriptor hole and the sensitivity-altitude gap between declared disciplines and built assert strength"
  }
}
```

### Aftermath (build-close arm gate 2, 2026-07-21)

The build-close external review found ELEVEN items — two product, eight
test-evidence, one packet-docs — all folded in one aftermath pass on
the built packet (build commit `6aec56d4`):

1. **PRODUCT — the wire-descriptor gate (finding 1).** Accessor
   properties could answer validation with one value and the dispatch
   read with another (the nested `templateRef`/`runOverrides` objects
   travelled BY REFERENCE), and a throwing getter could crash at the
   store's canonical serialization. Fix: `asPlainRecord` now requires
   every own property to be a PLAIN DATA property (descriptor-checked
   at every wire level — the getter never runs), and the nested
   payloads are SINGLE-READ COPIES (`parseTemplateRefWire` /
   `parseStringMapWire` / `parseRunOverridesWire` return fresh
   literals; the runOverrides copy rides a canonical-JSON round-trip),
   so post-validation caller mutation cannot reach the kernel either.
   Hostile lanes: top-level and nested accessors, a throwing getter
   (proven never invoked), a non-enumerable smuggled key, and the
   post-dispatch mutation-immunity lane. ADJACENT SURFACE, observed
   not fixed: the ch-4 ACTOR envelope path reads values single-shot
   into locals (safe) but shares the `payload` object by reference —
   a pre-existing ch-4 surface outside this packet's findings
   (Route: boundary-review).
2. **PRODUCT — the dev replay start-step schema (finding 2).** The
   W3 harness contract carries the OPTIONAL `runtimeContextRef`; the
   validator's exact keyset refused it. Fix: the key joins the start
   step's allowed set (nonempty-string when present) with an accept
   lane (validator passes; the context-free replay then fails at the
   kernel's surplus-input throw — the usage-vs-runtime split) and a
   refusal lane (`""` → InvalidFixture usage 2).
3. **TEST — per-op FULL-equality lanes (finding 3).** The deferred
   hold, KICKOFF, CANCEL×3, FAIL, and immediate-START success lanes
   re-asserted as COMPLETE `WorkflowInstance` equality literals; a
   CAS-restart lane added (a pass-through store forcing one
   `cas_conflict` — the restart-from-load discipline observable as
   ≥2 commit attempts, one committed write); the L3 empty-string
   lane added on the DECLARED variant too.
4. **TEST — the A2 3×3 matrix (finding 4).** START/KICKOFF/CANCEL ×
   {own-kind → Duplicate; other-fact-kind → collision; transition
   reuse → collision} parameterized — all nine cells driven through
   real kernel states; mutation-verified (a kind-blind rung reds all
   six collision cells while the actor-mirror stays green).
5. **TEST — the F4 reader branches driven (finding 5).** A MIXED
   fact/transition transcript through the bundle asserts FULL
   per-class content equality (pass-through fidelity: row count
   equals the detail's); the gate projection's fact-invisibility lane
   (projection over interleaved facts deep-equals the facts-removed
   projection).
6. **TEST — the G narrowing compile probes (finding 6).**
   `@ts-expect-error`-armed probes: a non-narrowed `entry.envelope`
   read, a non-narrowed `instance.task`/`instance.currentStep`
   assignment — each red on a type revert (TS2578 on revival).
7. **TEST — the bridge stdout FULL equality (finding 7).** The start
   verb's activated document asserted COMPLETE (kind, minted id,
   version 2, the full intent incl. the packet's task/role/
   instruction/availableOps) in `cli.test.ts` and all three
   subprocess journeys.
8. **TEST — the journey's full-state legs (finding 8).** Every J1
   leg asserts the COMPLETE instance literal and the final transcript
   by FULL row equality (committedAt pinned by the controlled clock).
9. **TEST — the T-family lane classes (finding 9).** A fact row
   fabricated AFTER the terminal transition row; the post-FAIL replay
   of a pre-FAIL op → Duplicate (rung order survives terminal); the
   wait⇔WAITING iff extended to BOTH directions in the checker
   (`checkTerminalSink` (d): a stale wait outside WAITING and a
   WAITING hold without its typed wait both violate) with all three
   direction lanes red-proven.
10. **TEST — the D-family verbatim content locks (finding 10).** The
    seven D1 unit-map rows, the four D4 re-points, and the four D2
    registry rows pinned verbatim (the P1a aftermath's pin pattern) —
    a wrong-but-resolving codeRef and a drifted typeName now red
    where the resolver alone stayed green.
11. **PACKET-DOCS — the Build record's evidence claims (finding 11).**
    The record overstated assert strength (full equality, guard
    coverage, journey states) relative to the pre-aftermath bodies;
    with folds 3/8/9 the claims are now REPRODUCIBLE as written —
    this aftermath section is the correction's record.

**Checks after the fold.** `pnpm v3:test` 47 files / **1121**/1121
(+26 over the close's 1095), `pnpm v3:typecheck` clean, `pnpm v3:lint`
clean, `pnpm v3:packet-lint --forbid-reopened` 0 errors,
`check_coverage.py` OK in both modes.

**Aftermath sensitivity probes — applied → RED → restored → GREEN
(restores byte-verified against scratchpad copies; final re-run
1121/1121 + clean typecheck):**

| # | Mutation | Expected red | Observed |
|---|---|---|---|
| 1 | unitMap START codeRef → `#kickoff` (resolves!) | the verbatim pin reds where resolution stays green | RED — unitMap.test 1/6 |
| 2 | registry OperatorIntent typeName narrowed | the D2 pin reds while typecheck stays clean | RED — domainRegistry.test 1/6 |
| 3 | the wait-iff's non-WAITING direction narrowed to TERMINAL-only | the ACTIVE-wait lane reds | RED — storeCheckers.test 1/37 |
| 4 | (agent-verified) the CAS-restart `continue` → non-restart return | the CAS lane reds alone | RED (mutation-verified in-fold) |
| 5 | (agent-verified) `admitLifecycle` made kind-blind | all six collision matrix cells red, the actor mirror green | RED (mutation-verified in-fold) |
| 6 | (in-fold) the hostile getter's read counter | asserted ZERO reads — the descriptor gate precedes every value read | GREEN by design (the assert IS the lane) |
