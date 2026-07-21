# Task Packet: ch11-P2b — the gate rung activation (the HANDLE pipeline rung · `gate_projection` derived · the `gate_decisions` schema bump + the C27 read surface · the two evaluators end-to-end · the l2 golden trace)

Plan step: plan.md §11.4 P2b row — the P2 row's ACTIVATION share under
the ratified ch11-P2 in-chapter sizing split (executed at ch11-p2a
authoring; parts P2a/P2b/P2c). Realizes §11.1 item 2's runtime half
(the gate rung in `HANDLE`, `gate_projection`, the `gate_decisions`
transcript column — THE chapter schema bump — and the two Block A
evaluators driven end-to-end); §11.2's l2 coverage share (3 of the 6
l2 unit ids, the 3 l2 behavioral rejections, 3 of the 5 l2
invariants, the l2 chapter trace). Round machinery UNTOUCHED — the
rung reads `instance.round` as the ch-4 kernel maintains it; the
declared `advances_round` alignment and the reconstructability
checker are P2c's (the split's alignment share). Draft anchors (= the
manifest's C-row ref union): `contract:ch11-gate-format` rows
C3/C8/C22/C24/C27/C28/C29/C31/C32/C33/C35 + ADR-003 (the fenced-wipe
stance the bump rides). Plan alignment: none — no packet decision
contradicts ratified plan text (the P2b row's own words are this
packet's scope).
Autonomy stage: measurement — inherited from the ch11-P2 row through
the split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the kernel-rung-extension
class has precedent (ch11-P1 extended the admission ladder in the
same file), and the fenced schema-bump class has precedent (ch5-P4
exercised the v1→v2 bump live).
Classification: **projection** — manifest tally: 12 anchored /
11 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the l2 unit texts, ledger §2/§3/§4,
ratified draft rows, ADR-003, ratified plan text, or the ch11-P2a
packet's built rows, or derives from them with an in-row note.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l2-pseudocode/HANDLE", "disposition": "implement" },
      { "id": "l2-pseudocode/gate_projection", "disposition": "implement" },
      { "id": "l2-pseudocode/activate", "disposition": "alias/inherited" }
    ],
    "rejections": [
      "gate_blocked",
      "gate_evaluator_unavailable",
      "gate_execution_not_supported"
    ],
    "invariants": [
      { "id": "l2/gate-before-commit", "disposition": "test" },
      { "id": "l2/ordered-first-block-wins", "disposition": "test" },
      { "id": "l2/gate-is-read-only-stateless", "disposition": "review" }
    ],
    "traces": ["l2-pseudocode"],
    "shared_ownership": []
  }
}
```

The split's coverage union (declared at ch11-P2a, guarded mechanically
at the chapter close): P2a owns `CREATE_INSTANCE`/`GateRegistration`/
`admit_definition` + the `inline-declarative-packaged-only-in-l2-core`
invariant; THIS packet owns the three units, three rejections, three
invariants, and the trace above; P2c owns
`l2/round-is-canonical-reconstructable` (checker). Union = the full
§11.2 l2 share; no overlap, so `shared_ownership` is empty.

Partial-realization dispositions (projection-time disposition calls,
not scope changes):

- `l2-pseudocode/HANDLE` is `implement`: the l2 DELTA — the gate
  pipeline rung between the L1 capability check and the commit, plus
  the `gate_decisions` commit provenance — realizes here. The unit's
  `issued_agent_config` transcript field is L0c-inherited, unrealized
  (the ch-4 realization derives dispatch config POST-commit as intent;
  no issued-config column exists). The `advances_round` predicate
  stays the ch-4 `target === template.start` heuristic — the P2c row's
  alignment by the ratified plan cut, behavior-equivalent to the
  model's exhibited `round: { advance_on_arrival_at: [implement] }`
  declaration for the realized template set. The admission ladder,
  capability, navigation, CAS-restart, and diag rungs are the
  built P1/ch4/ch7 realizations, unchanged.
- `l2-pseudocode/gate_projection` is `implement`: the policy-facing
  read model derived in `kernel/` (V matrix); C24's field list is the
  P2a-built `GateProjection` domain type — this packet realizes the
  DERIVATION.
- `l2-pseudocode/activate` is `alias/inherited`: its l2 delta (round
  ← 1 at activation — "the first work cycle begins at activation")
  is ALREADY the realized behavior of the ch-4 `startInstance`
  composite (`round: 1` at create+start; `kernel/start.ts`). The
  unit's `runtime_context = ready` REQUIRE is L0e-inherited,
  unrealized (the representation lands at P3, provisioning at ch 9).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §11.4, recorded at the ch11 ratification for the
parent P2 row, inherited through the split): **projection** (basis:
l2-pseudocode + ledger §2/§3/§4 + ratified draft rows). Discovered at
authoring: **projection** — prediction and discovery agree.

**This packet's own six axes** (the parent P2 assessment lives in the
ch11-P2a packet — the split it justified produced this part):

- **authority movement:** NO — no canonical source of truth moves.
  Admission authority landed at P2a; round truth stays the ch-4
  kernel heuristic (P2c's alignment); the store keeps owning
  atomicity, the kernel semantics.
- **new runtime behavior turned on:** YES — this IS the activation
  share: the rung, the three behavioral rejections, the persisted
  provenance. Hard stop 1 requires authority movement AND activation
  in one packet — authority is NO, so stop 1 does not trip (the
  parent's stop-1 trip is exactly what the split quarantined:
  foundation P2a, activation here).
- **surface spread:** TRIPPED — hard stop 2 by letter. One concept
  (the retained gate-decision provenance) spans the kernel (produce),
  the store schema (persist), and the transcript read surface
  (expose). The testkit CONTRACT is UNCHANGED (no new fake, fixture
  type, or checker — the harness and kit types flow; gate asserts
  live in test files over `ReplayResult`), so testkit does not count.
- **identity/join fragility:** NO — the provenance rides the existing
  seq-joined transcript row; no new cross-seam identity.
- **foundation + activation coupling:** NO — the foundation is BUILT
  (P2a @ a76b0382 + the e9aad92f aftermath); this packet activates on
  a finished foundation and builds no new foundation of its own.
- **prerequisite coupling:** NO — P2a landed; P2c/P3 depend on this
  packet, not the reverse.
- **acceptance multiplicity:** kernel behavior + schema + read
  projection + the golden trace — multiple success classes, but the
  4+-surfaces × 3+-classes escalation combo does NOT fire (3
  production surfaces for the one concept, measured below).

**Hard stops 2 and 7 (letter-tripped, closure-proven).** Stop 7 by
letter: the kernel (the outcome/commit producer) changes behavior +
shared contract shapes change (`TranscriptEntry`, `CommitTransitionInput`,
the `Outcome` rejected arm) + fallout in the store and the CLI
composition roots. **Closure proof (single-packet allowed: yes):**
the trips share ONE cause — the additive, compile-enforced provenance
ripple. The `gateDecisions` field on `CommitTransitionInput` (required)
and `TranscriptEntry` forces every producer/consumer in the same
commit (an un-updated site does not compile); no separate sequencing
exists (the rung without the column would drop the model's committed
provenance; the column without the rung has no writer — the parent
split already cut along the only seam, and the plan's ratified P2b row
IS this bundle); ONE proof surface validates it (`pnpm v3:test`: the
rung/projection/store suites + the l2 trace + the untouched remainder
of the suite proving confinement); the same in-repo consumers own all
fallout (no external consumers, no per-family review loop); NO
migration risk — the ADR-003 fence means the v2→v3 bump wipes
prototype stores and refuses non-prototype ones; no data path exists
to migrate. Stop 8 assessed NOT tripped in substance: a persisted
schema change exists, but there is no shared-contract MIGRATION (no
carried data, no compatibility window) and the read-projection fallout
is a type pass-through with zero floor/CLI production code change.
Stop 9 assessed not tripped: the rung ADDS a pre-commit validation
stage exactly where the model's contract puts it; commit/rollback/
lock/idempotency semantics are untouched (the same single txn gains
one column write). Stops 5, 10, 11: no cutover, no proof-source move,
no reused proof contract (new suites + the regression corpus).

**Consume-family scan** (run because stop 2 tripped; measured from the
tree 2026-07-12 — receipts in Embedding gates): producer = kernel/
(changed: the rung + the projection derivation + the required
`gates: GateCatalog` dep); validator/gate = gates/ (present, UNCHANGED
— the P2a evaluators and registry are consumed as built, zero edits);
persistence/replay = store/ (changed: SCHEMA_VERSION 3, the
`gate_decisions` column, write + both read mappers);
execution consumer = dispatch intent derivation (present, UNCHANGED —
post-commit, as built); read/presentation = floor/ + operator CLI
(present, ZERO production code change — `TranscriptEntry` flows
through `createFloor`/`JSON.stringify` pass-through, measured:
`cli/main.ts` lines 131/144 stringify floor results; the debug
bundle's explicit keyset does NOT carry the field — O4);
recovery/cleanup = absent; external/integration = the CLI composition
roots (changed: `cli/main.ts` + `cli/dev/main.ts` wire the SAME
`createGateRegistry()` value into the kernel — no verb, flag, or
machine-shape change, C28); testkit = present, CONTRACT UNCHANGED
(tests update mechanically under T2's sanctioned change classes).

Conditional annexes: **closure-budget triage** — buckets touched:
runtime behavior (the rung), persisted schema (the column), read
projection (the additive field). The collapse into one packet is the
plan's own ratified P2b row (the split's activation share); it is safe
because one compile-enforced ripple closes all three and one proof
surface validates them; explicitly deferred: round alignment (P2c),
the process contract (P3), the format key (P4). **Proof-boundary
triage** — N/A: no success/completion proof source moves (commit
truth stays the store txn; trace truth stays the harness).
**Mutable-flow record** (hard-stop-9 material near): precondition
failure produces ZERO side effects — a block returns BEFORE the
commit with no transcript append, no version/step/round change
(driven by the full-instance-equality lane); no rollback/retry
change — a CAS restart re-runs the WHOLE rung on fresh state (K6);
no coordination primitive enters.

**R-ACTIVATION-JOURNEY disposition (the rule FIRES — this is the
activation share, and the rung is wired into `HANDLE`, reachable from
the shipped `submit` verb):** the journey discharge is
`cli/journey.test.ts` — the existing subprocess, production-bindings
journey EXTENDS to POSITIVELY assert the C27 read-surface delta
end-to-end (the timeline/detail rows of a full ungated lifecycle
carry `gateDecisions: []` — a positive assert, not a compile-survival
update). The GATED decision behavior is STRUCTURALLY EXEMPT from a
subprocess journey in this packet: no shipped channel can author a
gated template (the file format's `gates` key is P4's — the ch8 V8
unknown-key rejection stands), so the gated rung's journey obligation
TRANSFERS to P4 with the format key; until then the gated path is
driven at the ingress seam (`l2Trace.test.ts` through
`seams.submit`, T3) — the deepest shipped seam a gated template can
reach.

## Claim + dimensions (enumerated BEFORE deriving test rows)

**Claim (wide):**

1. **No commit passes a declared pipeline unevaluated:** from this
   packet on, EVERY committed actor transition at a gated
   (step, event-type) point has run its FULL authored pipeline, in
   authored order, to a unanimous allow/warn — and a block ALWAYS
   returns before the commit with ZERO state change: version,
   current step, round, and transcript are untouched, and the same
   emit can succeed later (no round burned).
2. **Decision provenance is committed truth:** every committed
   transition row carries its ordered retained allow/warn decisions —
   `[]` when the transition ran no gates — written in the SAME atomic
   commit, exposed on BOTH transcript read surfaces
   (`getInstanceDetail`, `getTimeline`) and every surface derived from
   them (tail, CLI detail/timeline output).
3. **Policy reads only the projection:** an evaluator receives
   exactly (effective config, `GateProjection`) — the canonical
   kernel-maintained round, position, event type, and the DERIVED
   history — never the store, the raw transcript, the instance
   aggregate, or any payload.
4. **The bump is fenced:** the store schema moves v2→v3 under
   ADR-003's prototype fence — a prototype-marked store wipes and
   recreates on open, a non-prototype store refuses; NO migration
   path exists or is written.
5. **One catalog, injected, fail-closed:** the SAME static Block A
   composition serves admission (P2a) and the rung (here), injected
   at the composition roots; at the rung an unresolvable `uses` is
   `Rejected(gate_evaluator_unavailable)` (the registry-drift
   backstop) and a process-implementation registration is
   `Rejected(gate_execution_not_supported)` — nothing on this surface
   is fail-open, and the deferred-execution lane is TYPE-ruled-out
   (no runtime check ships for an unrepresentable operand).
6. **Confinement:** for gate-free templates — every loadable YAML
   today — kernel behavior is byte-identical and the gated-path
   store read never fires (ZERO new awaited work on the ungated
   path); the ONLY read-surface delta anywhere is the additive
   `gateDecisions` field itself (`[]` known-empty); no CLI verb,
   flag, or machine-shape change; no diagnostic event shape change
   (a gate rejection emits the existing `rejected` event, registry
   name only); round machinery untouched (the ch-4 heuristic stands
   until P2c); the definition/admission surface (P2a) and the
   `gates/` module are consumed as built, zero edits.

Dimensions:

1. **Rung placement grid** (each lane driven and ABLE TO FAIL,
   R-LANE-SENSITIVITY): a gated transition emitted with a wrong role
   → the L1 rejection AND zero evaluator calls (a recording catalog
   proves the rung never ran — catches a rung hoisted above the
   ladder); a gated transition that does not exist → `no_transition`,
   zero evaluator calls; an UNGATED transition on a gated template →
   commits with `gateDecisions: []` and zero evaluator calls.
2. **Ordered, first-block-wins combination lanes** (isolated lanes
   cannot falsify a reordered implementation): [block, recorder] →
   the second evaluator NEVER runs; [allow, block] → the first ran
   exactly once, nothing committed; [warn, block] → the block wins
   and the warn's retained decision is DISCARDED with the aborted
   commit (no row appended — provenance is committed truth only);
   [warn, allow] → commits with BOTH decisions retained in authored
   order.
3. **Gate-before-commit block semantics:** a block yields
   full-instance equality (the harness A11 pre-snapshot), no
   transcript append, version/step/round untouched — and the SAME
   emit type succeeds later once state satisfies the policy (the
   trace's step-2/step-5 pair).
4. **Backstop lanes:** an admitted template handled under a DRIFTED
   catalog (the binding's `uses` resolves at admission, not at
   handle) → `gate_evaluator_unavailable`, zero evaluations, no
   commit; a test-composed catalog resolving to a
   process-implementation registration → `gate_execution_not_supported`
   before any evaluate; the ORDER-INTERPLAY combination: a pipeline
   `[valid-allow inline, unresolvable]` → the first gate EVALUATES
   (the projection read fired) and the second's resolve still rejects
   `gate_evaluator_unavailable` — a successful first evaluate never
   masks a later gate's backstop (K6's placement driven as a
   combination, not two isolated lanes); and the PRE-READ discipline
   twin: a pipeline whose FIRST gate is unresolvable (or
   process-implementation), handled over a counting store whose
   transcript read would THROW — the backstop rejection surfaces AND
   zero read attempts were made (an implementation deriving the
   projection before the first gate's K2/K3 checks fails it).
5. **Projection correctness grid:** `round` = the loaded instance's
   canonical round; `currentStep`/`eventType` = the position and the
   CURRENT envelope's type; `history` = one entry per committed
   transition, transcript order, `stepId` = the step the transition
   was emitted FROM (replay-reconstructed across loop-backs — the
   multi-round trace exercises a step revisited twice), `role` = that
   step's granted role; blocked/rejected attempts NEVER appear in
   history; an empty transcript yields `[]`; the projection carries
   NO payloads, digests, opIds, or timestamps at EITHER grain — the
   projection's own keys AND every history entry's own keys asserted
   exactly (V3's two-grain negative).
6. **Retained-decision fidelity:** the C27 field list rides the
   column verbatim — `uses` + narrowed verdict + optional
   `reason`/`message`/`evidenceRefs` (a warn with all fields
   round-trips byte-equal through commit → both read surfaces);
   `block` is UNREPRESENTABLE in the retained type; the decisions
   land ONLY on the row that ran them.
7. **Schema lanes:** a v2 prototype-marked store WIPES and re-inits
   on open at v3; the no-marker / incomplete-marker / non-prototype
   refuse lanes stand byte-identical; `gate_decisions` is NOT NULL
   and STRICT-typed — driven at the METADATA grain (a
   `PRAGMA table_info(transcript)` lane asserts the column's declared
   type `TEXT` and `notnull = 1`, and the table's STRICT flag — a
   nullable or type-loose column fails it, not just a happy-path
   round-trip); the JSON round-trip is lossless for the full
   optional-field shape.
8. **Read pass-through lanes:** CLI `detail` and `timeline` output
   rows carry `gateDecisions` (the `[]` form driven at the shipped
   surface); the tail yields entries carrying it; the debug bundle's
   row keyset is UNCHANGED (the O4 negative — a bundle row gaining
   the field fails).
9. **Outcome shape lanes (both halves of each iff):** `gate_blocked`
   rejections pass the blocking decision's fields through VERBATIM —
   `gateReason` present iff the decision carried `reason`,
   `evidenceRefs` present iff carried (an empty list rides as `[]`);
   every OTHER rejection reason CANNOT carry them (type-level —
   `@ts-expect-error` probes, the P2a type-permits-what-the-row-forbids
   lesson applied at write time). Driven: the trace asserts
   `round_below_min`; a dedicated lane asserts `no_previous_verdict`;
   a test-evaluator lane asserts refs surfaced; the ABSENCE halves —
   a reasonless test-evaluator block yields NO `gateReason` key, a
   refs-less block yields NO `evidenceRefs` key (asserted by key
   absence, not undefined-equality), and an explicit-`[]` refs block
   yields `evidenceRefs: []`.
10. **Confinement regression:** the FULL existing suite green after
    the mechanical ripple; the ungated path performs ZERO gated-path
    store reads (a counting store proves silence — sensitivity for
    an eagerly-derived projection); diag events for a gate rejection
    carry the existing keyset (recording sink, no new keys).
11. **Evaluators end-to-end:** `declarative.threshold` blocks below
    and allows AT the boundary THROUGH `HANDLE` (the trace's round
    1 block / round 2 allow — an off-by-one `<=` fails step 5);
    `pairflow.previous_reviewer_verdict` blocks on
    first-arrival-empty-history e2e (a gate on the START step's
    first transition — `no_previous_verdict`) and allows on the
    trace's same-step prior PASS.
12. **CAS-restart re-derivation:** a forced one-shot `cas_conflict`
    on a gated commit → the restart re-runs the rung on FRESH state
    (the projection read fires per attempt; decisions re-evaluated —
    a cached cross-attempt projection fails the lane).

## Operative material (full text — projection, not invention)

### `l2-pseudocode/HANDLE` (verbatim)

```
HANDLE envelope → Outcome
  IF not valid_shape(envelope)            THEN RETURN Rejected(invalid_shape)

  instance ← instanceStore.load(envelope.instance_id)
  IF instance is none                     THEN RETURN Rejected(unknown_instance)
  template ← definitionStore.load(instance.template_ref)   # separate store; a pinned immutable ADMITTED definition — effective configs, admission's output (L2)
  step     ← template.step(instance.current_step)           # positional read, NOT a rung — infallible over committed
                                                            # state (load-time validation: every reachable step id
                                                            # resolves in the pinned template), so hoisting it cannot
                                                            # reject or mask a rung; consumed by the authority rung

  # ADMISSION (born at L0d) — the actor-envelope rungs: idempotency → lifecycle/state → staleness → authority (born at L1)
  outcome ← admit_loaded(instance, expect: {
    op_id:     envelope.op_id,                                  # a duplicate is a no-op, no 2nd entry
    state:     kernel_status = ACTIVE → Rejected(not_active),   # L0d lifecycle guard: actor emits only in actor-routable ACTIVE execution
    version:   envelope.expected_version,                       # actor-supplied stale-intent — mandatory at L0b
    authority: { claim:   envelope.expected_role,               # L1 role authority — mandatory at L1 (shape-derived, todo E1)
                 granted: step.role,                            # this position's active role — read only at the authority rung
                 missing → Rejected(missing_role), mismatch → Rejected(role_not_authorized) } },
    envelope)
  IF outcome ≠ Accepted THEN RETURN outcome                     # Duplicate | Stale(v) | Rejected(…) pass through unchanged

  target ← step.transitions[envelope.type]   # navigation (L0b): does this action exist here?
  IF target is none                       THEN RETURN Rejected(no_transition)

  # L1: action authorization — exists as a transition, but may this role emit it here?
  IF envelope.type not in capability(template, step.role, instance.current_step)
                                          THEN RETURN Rejected(not_authorized)

  # L2: policy gate pipeline — the transition exists (L0b) and is authorized (L1); do the policies allow it now?
  gate_decisions ← []                                                                       # retained allow/warn verdicts + evidence refs, carried to the commit
  FOR gate IN template.gates_for(instance.current_step, envelope.type):   # ordered, authored; empty for ungated transitions
    registration ← gateRegistry.resolve(gate.uses)
    IF registration is none                  THEN RETURN Rejected(gate_evaluator_unavailable)    # runtime availability backstop — admission resolved the name at load; this lane guards registry drift
    IF registration.implementation = process THEN RETURN Rejected(gate_execution_not_supported)  # process contract is L2a — even an inline process gate
    IF registration.execution ≠ inline       THEN RETURN Rejected(gate_execution_not_supported)  # deferred ⇒ a later lifecycle slice (gate_pending + GATE_RESULT)
    decision ← registration.evaluate(gate.effective_config, gate_projection(instance, template, envelope))
    IF decision.verdict = block       THEN RETURN Rejected(gate_blocked(decision.reason), decision.evidence_refs)  # no commit ⇒ round not burned; refs surfaced
    gate_decisions.append(decision)                                                       # allow or warn ⇒ retained (verdict + evidence_refs + diagnostics)
    # allow or warn ⇒ next gate in the pipeline

  issued_config ← resolve_agent_config(template, step, instance)   # resolved only now — not for a rejected envelope

  # one atomic commit, CAS on instance.version
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(envelope, issued_agent_config: issued_config, gate_decisions: gate_decisions)   # provenance: issued config + gate verdicts / evidence refs
    instance.current_step ← target
    IF advances_round(step, target) THEN instance.round ← instance.round + 1    # advance predicate = transition semantics; transcript-reconstructable
    IF target is terminal THEN COMPLETE(instance)                  # kernel-internal completion path → TERMINAL(done)
    instance.version ← instance.version + 1
  # on CAS conflict: restart HANDLE from load —
  #   re-check idempotency and re-resolve the transition;
  #   never re-commit a target computed from stale state

  intent ← (instance.kernel_status = TERMINAL) ? none : dispatch_intent(instance, template, instance.current_step)  # derive after commit
  RETURN Committed(instance.version, intent)
```

### `l2-pseudocode/gate_projection` (verbatim)

```
gate_projection(instance, template, envelope) → Projection   # policy-facing read model — read-only, derived; the policy reads, never mutates
  RETURN {
    round:        instance.round,                       # canonical, kernel-maintained, commit-derived, transcript-reconstructable
    current_step: instance.current_step,
    event_type:   envelope.type,
    history:      derive_policy_view(instance.transcript) }   # derived view (prior verdicts / alternation); the projection exposes no raw transcript, though the kernel derives it from one
```

### `l2-pseudocode/activate` (verbatim)

```
activate(instance) → Outcome                                         # internal — produces the first dispatch
  REQUIRE instance.runtime_context = ready AND instance.task present
  template ← definitionStore.load(instance.template_ref)      # pinned immutable version — same template/instance boundary as HANDLE
  instance.kernel_status ← ACTIVE
  instance.current_step  ← template.start
  instance.round         ← 1                                  # the first work cycle begins at activation: round 0 → 1 (the start step is a round-start)
  RETURN Activated(dispatch_intent(instance, template, template.start))   # dispatch is a kernel output (L0b), not a side effect
```

### The gated template (the golden-trace Config view — the model's exhibited parameterization; the fragment shows the MODEL's nested view, and the realized DOMAIN binding is C1's parallel-key form at (review, CONVERGED))

```yaml
gates:                    # ordered inline pipeline; first block stops, round not burned
  - uses: declarative.threshold              # declarative DSL: path / op / value over allowed gate_projection fields
    config: { metric: round, op: ">=", value: 2 }
  - uses: pairflow.previous_reviewer_verdict # packaged pure pairflow policy
    config: { required: true }
```

The trace template is the canonical `local-pair-v0` shape (implement ⇄
review, CONVERGED → done) with the pipeline above bound at
(review, CONVERGED) — DIRECTLY CONSTRUCTED and admitted through
`admitTemplate` + `createGateRegistry()` (the FILE format carries no
`gates` key until P4; the ch8 V8 unknown-key rejection stands — the
P2a A8 confinement claim is untouched).

### Exact rejection strings (ledger §3 — the slice)

`gate_blocked` · `gate_evaluator_unavailable` ·
`gate_execution_not_supported` — all three already in the 54-name
registry (P2a shipped the names; this packet makes them BEHAVE). The
registry, its drift locks, and `domain/rejections.ts` are untouched.
`gate_blocked`'s REASON tokens (`round_below_min`,
`no_previous_verdict`, and every future authored/fixed token) are
REASON PAYLOAD on the rejection surface, never registry names — the
two namespaces are disjoint by C31, verified at draft time.

### Trace (executable expectation — the 08-l2 Runtime trace as a committed-row sequence)

At-level: explicit `expectedRole` and `expectedVersion` on every emit,
no lift (the l1Trace at-level precedent).

| # | Emit | Expected outcome |
|---|---|---|
| 0 | start `inst-l2`, task | `started`, version 1, currentStep `implement`, round 1 |
| 1 | codex `PASS` on implement `{expectedRole: implementer}` (v1) | committed v2 → review; round 1 |
| 2 | claude `CONVERGED` on review `{expectedRole: reviewer}` (v2) | **`Rejected(gate_blocked)`, gateReason `round_below_min`** — threshold: round 1 < 2; NO commit, version stays 2, still on review, round 1, no transcript row |
| 3 | claude `PASS` on review (pass back) `{expectedRole: reviewer}` (v2) | committed v3 → implement; round advances to 2 |
| 4 | codex `PASS` on implement `{expectedRole: implementer}` (v3) | committed v4 → review; round 2 |
| 5 | claude `CONVERGED` on review `{expectedRole: reviewer}` (v4) | committed v5 → done; threshold round 2 ≥ 2 allow → previous_reviewer_verdict: history carries the step-3 committed PASS from `review` → allow; terminal, intent null |

`finalTranscript`: `[1, op-1], [2, op-3], [3, op-4], [4, op-5]`.
`finalState`: `{ currentStep: "done", round: 2, status: "DONE",
version: 5 }`. Supplemental asserts — from `finalDetail`:
`gateDecisions` is `[]` on rows 1–3 and EXACTLY
`[{uses: "declarative.threshold", verdict: "allow"},
{uses: "pairflow.previous_reviewer_verdict", verdict: "allow"}]`
(order = authored order; allow carries NO optional fields — G4/G6) on
row 4; from `ReplayResult.outcomes`: the step-2 rejected outcome's
`gateReason` is `round_below_min` (a blocked step commits no row, and
the harness's `ExpectedOutcome` carries `reason` only — the
`gateReason` assert reads the outcomes array); `runAllCheckers` green
(the consistency belt, never the equality proof).

## Canonical kernel-rung matrix (K)

| Id | Rule |
|---|---|
| K1 | The rung's PLACE and INPUT: it runs after the L1 capability check and BEFORE any commit-side work, only for envelopes that passed every earlier rung; its pipeline is the ADMITTED template's binding list at (currentStep, envelope.type) — the model's `gates_for`, realized as the P2a `Step.gates` lookup; ABSENT key or absent map = the EMPTY pipeline (ungated); authored order IS evaluation order (anchored: prose:l2-pseudocode/HANDLE, contract:ch11-gate-format#C3, prose:packet ch11-p2a D1) |
| K2 | Per-binding sequence, fail-closed: `catalog.resolve(binding.uses)` against the INJECTED catalog; `null` → `Rejected(gate_evaluator_unavailable)` with zero further evaluation and no commit — the RUNTIME availability backstop guarding registry drift (admission resolved the id at load; an old instance under a new process generation's composition is the lane's reality) (anchored: contract:ch11-gate-format#C35, contract:ch11-gate-format#C8, prose:l2-pseudocode/HANDLE) |
| K3 | A resolved registration with `implementation === "process"` → `Rejected(gate_execution_not_supported)` BEFORE any evaluate (the l2-core lane; P3 realizes the process execution path from the l2a HANDLE unit and revisits this lane there — a stated proof boundary, the ratified plan cut). The unit's THIRD check (`execution ≠ inline`) ships NO runtime code: the P2a-realized `execution` domain is the singleton `"inline"` — the operand is UNREPRESENTABLE (the type/schema invariant), and dead code for it would violate the A13/R-EXECUTION stance; the lane re-enters when the deferred slice widens the union. DERIVATION: the model's two `gate_execution_not_supported` checks minus the type-foreclosed one; the P2a R1 row states the same staging (derived: prose:l2-pseudocode/HANDLE, prose:ledger §2 l2, prose:packet ch11-p2a R1) |
| K4 | `registration.evaluate(binding.config, projection)` — the binding's `config` IS the admission-materialized EFFECTIVE config (A5's single surface; the rung re-validates NOTHING — C22's standing rule). A `block` verdict RETURNS `Rejected(gate_blocked)` BEFORE the commit carrying the blocking decision's `reason`/`evidenceRefs` when present (O1's pass-through arm); version, current step, round, and transcript are UNTOUCHED, and later gates are NOT evaluated (first-block-wins) (anchored: prose:l2-pseudocode/HANDLE, contract:ch11-gate-format#C22, contract:ch11-gate-format#C33) |
| K5 | Allow/warn decisions are RETAINED in pipeline order as `RetainedGateDecision` values (`uses` from the binding + the decision's fields, O2) and ride the SAME atomic commit (`CommitTransitionInput.gateDecisions`); an ungated commit carries `[]`; a pipeline aborted by a block retains NOTHING (no commit, no row — provenance is committed truth only) (anchored: prose:l2-pseudocode/HANDLE, contract:ch11-gate-format#C27) |
| K6 | Projection derivation, once per attempt, lazy: the committed transcript is read through the EXISTING StorePort read surface (expected `getTimeline(instanceId, 0)`; the verb choice within the committed-rows read surface is build freedom) at the FIRST `evaluate` need — i.e. only after the first binding's resolve + implementation checks pass, EXACTLY where the model's own first `gate_projection(...)` call sits (the model derives the projection AT each evaluate, so for every gate AFTER the first evaluate the model's own read already precedes that gate's resolve; the realized order therefore preserves the unit's observable rejection order for EVERY pipeline shape — a store-read failure can never preempt the rejection of a gate that precedes the first evaluate in the unit's order, and a read failure at the first evaluate preempts a LATER gate's backstop in the model too); the UNGATED path performs ZERO gated-path reads; ONE snapshot serves the whole pipeline (every gate sees the SAME projection); a CAS restart re-runs the whole rung and re-derives on fresh state. DERIVATION: the model computes `gate_projection(...)` per gate inside the loop; evaluators are pure/read-only (G7) and the commit CAS rejects any concurrently-advanced state, so one-snapshot-per-attempt is observationally equivalent while never letting two gates of one attempt see DIFFERENT histories; the first-evaluate placement is the model's own read point (derived: prose:l2-pseudocode/HANDLE, prose:l2-pseudocode/gate_projection, prose:packet ch11-p2a G7) |
| K7 | Confinement: gate-free templates take the rung as a vacuous loop — kernel behavior byte-identical, zero new awaited work (dimension 10's counting-store lane); dispatch-intent/agent-config derivation stays POST-commit (the unit's pre-commit `issued_config` line is L0c-inherited, unrealized — the slice's disposition list); the diagnostic surface is UNCHANGED in shape: a gate rejection emits the existing `kind: "rejected"` event whose `reason` is the registry name only (the gate reason/refs stay on the Outcome — no new diag key); `advances_round` stays the ch-4 `target === template.start` heuristic (P2c's alignment; the trace is reproducible on it — behavior-equivalent to the model's exhibited declaration for the realized template set). DERIVATION: the P2a A8 confinement pattern applied to the rung's surfaces; the plan's P2b row states the round-untouched cut (derived: prose:plan §11.4 P2b row, contract:ch11-gate-format#C28, prose:packet ch11-p2a A8) |

## Canonical projection matrix (V)

| Id | Rule |
|---|---|
| V1 | `GateProjection` is C24's Block A field list (the P2a-built domain type, camelCase realization): `round` = the loaded instance's canonical `round`, `currentStep` = the loaded instance's position, `eventType` = the CURRENT envelope's type, `history` = V2's derived view. The derivation is realized as a PURE function over (instance, template, committed entries) in `kernel/` — the read stays in the kernel's rung (K6); the same shape later feeds the process wire inside C23 (P3) (anchored: contract:ch11-gate-format#C24, prose:l2-pseudocode/gate_projection) |
| V2 | `history` = the ordered (transcript-order) list of `{stepId, eventType, role}` for EVERY committed actor transition — today every transcript row. `stepId` is the step the transition was emitted FROM, reconstructed by REPLAY over the pinned template: pos₀ = `template.start`; entryᵢ's `stepId` = posᵢ, `eventType` = its envelope's type, `role` = `steps[posᵢ].role` (the GRANTED role — admission-equal to the committed envelope's claim); posᵢ₊₁ = `steps[posᵢ].transitions[type]`. DERIVATION: C24 fixes the field list and the emitted-FROM rule; the transcript-reconstructability of position is the model's own load-time-validation guarantee (the l1 HANDLE hoisted-read comment: every reachable step id resolves in the pinned template) — the replay is total over committed state, and no stored step column exists to read instead (derived: contract:ch11-gate-format#C24, prose:l2-pseudocode/gate_projection, prose:v3/src/kernel/kernel.ts) |
| V3 | No raw transcript exposure: the projection carries ONLY the derived entries — no payloads, no digests, no opIds, no timestamps, no envelope objects — at BOTH grains: the projection's own keys are exactly C24's four, AND each history entry's own keys are exactly `{stepId, eventType, role}` (a leaked per-entry `payloadDigest`/`opId`/`committedAt`/`envelope` key violates this row); evaluators receive no store handle and no instance aggregate (the model's derived-view rule; the read-only half of the `gate-is-read-only-stateless` invariant binds here as the packet's review disposition) (anchored: contract:ch11-gate-format#C24, prose:l2-pseudocode/gate_projection, prose:ledger §2 l2) |
| V4 | A replay step that fails to resolve (a committed entry whose type has no transition from its replayed position) is a kernel INTEGRITY throw — impossible over committed state under the pinned immutable template, so it is the `loadTemplate` precedent's class: a thrown Error through the outer catch (diag `internal_failure` + rethrow), NEVER a rejection. Driven via a hostile store fake (the P2a hostile-catalog precedent: the impossible lane is driven, not presumed). DERIVATION: the l1 HANDLE positional-read comment names the infallibility; the kernel-integrity throw class is the built `loadTemplate` behavior for same-class violations (derived: prose:v3/src/kernel/kernel.ts, prose:l2-pseudocode/HANDLE) |

## Canonical store/schema matrix (S)

| Id | Rule |
|---|---|
| S1 | `SCHEMA_VERSION` `"2"` → `"3"`; the `transcript` table gains `gate_decisions TEXT NOT NULL` (the retained-decision list as ONE JSON array document) — THE ch11 schema bump, under the ADR-003 fenced wipe exactly as built: a prototype-marked store at any OTHER version wipes-and-recreates on open; tables-but-no-marker, incomplete marker, and non-prototype stores REFUSE byte-identically (the existing lanes stand); a fresh store inits at v3 (anchored: contract:ch11-gate-format#C27, ADR-003, prose:plan §11.1 item 2) |
| S2 | `CommitTransitionInput` gains REQUIRED `gateDecisions: readonly RetainedGateDecision[]` — the kernel derives, the store writes VERBATIM (`JSON.stringify`) inside the SAME commit transaction (REV-A1-TXN unchanged: idempotency check → CAS → append, one txn; the store stamps nothing into the list). REQUIRED, not optional: every commit STATES its provenance — `[]` is a statement, absence is not (the C27 known-empty culture at the port grain). DERIVATION: C27 makes the column committed truth; the store-owns-atomicity / kernel-owns-semantics port culture (ch4-P1) assigns the writer; a nullable column or optional field would re-admit the silent-absence state C27 excludes (derived: contract:ch11-gate-format#C27, prose:v3/src/ports/store.ts) |
| S3 | `TranscriptEntry` gains `gateDecisions: readonly RetainedGateDecision[]`; BOTH read surfaces map the column through the ONE shared row mapper (`toTranscriptEntry` — the ch6-P1 cross-consistency is structural), so `getInstanceDetail` and `getTimeline` (and the tail built on it) expose identical values; the JSON round-trip is lossless for the whole C27 field list (string-typed fields only — no numeric-identity hazard; R-NUMERIC-LADDER assessed n/a: no numeric domain enters). DERIVATION: C27 names the transcript read surface; the one-mapper form is the built ch6-P1 structure this column joins (derived: contract:ch11-gate-format#C27, prose:v3/src/store/sqliteStore.ts) |
| S4 | The known-empty form: a committed transition that ran no gates carries `gateDecisions: []` — never null, never absent (the column is NOT NULL; the ch6 known-empty culture C27 states) (anchored: contract:ch11-gate-format#C27) |

## Canonical outcome/read-surface matrix (O)

| Id | Rule |
|---|---|
| O1 | The `Outcome` rejected arm realizes `Rejected(gate_blocked(reason), evidence_refs)` as a VERBATIM field pass-through of the blocking decision: `gateReason?: string` present iff the decision carried `reason`, and `evidenceRefs?: readonly string[]` present iff the decision carried `evidenceRefs` (an empty list rides as an empty list — the D4 value passes unmodified; NO synthesis, NO default token: the unit passes `decision.reason`/`decision.evidence_refs` through, and the P2a-built `GateDecision.reason` is OPTIONAL even on block, a shape this packet may not narrow — `ports/gate.ts` and `domain/gate.ts`'s decision type are consumed as built). Every BLOCK A blocking decision carries its fixed reason token (G4/G6), so the shipped lanes always surface one; a reasonless block from a test-composed evaluator yields `gate_blocked` with `gateReason` ABSENT (driven). EVERY OTHER rejection reason carries NEITHER field, expressed at the TYPE level (a discriminated rejected arm — the type forbids what the row forbids; the P2a arm-gate-2 lesson applied at write time). The exact TS union shape is build freedom within that type-expressed exclusion. DERIVATION: the unit's return is verbatim pass-through; C31 constrains reason-token VALUES (and every enumerated source carries one), not presence on hostile input — synthesizing a default would oblige MORE than the anchors force (derived: prose:l2-pseudocode/HANDLE, contract:ch11-gate-format#C31, contract:ch11-gate-format#C33) |
| O2 | `RetainedGateDecision { uses: string; verdict: "allow" \| "warn"; reason?: string; message?: string; evidenceRefs?: readonly string[] }` — C27's retained field list as a domain value (camelCase realization, the D4 precedent); `block` is UNREPRESENTABLE in the verdict union (block never commits — type-level), and `uses` names the producing binding (anchored: contract:ch11-gate-format#C27, prose:ledger §4 l2) |
| O3 | Read pass-through: the floor and the operator CLI expose `gateDecisions` through the EXISTING pass-through surfaces with ZERO production code change (`createFloor` delegates; `detail`/`timeline`/`tail` stringify the entries) — the field appears additively on every entry, `[]` known-empty; NO new verb, flag, or machine-shape change (C28: the entry SHAPE is C27's own surface) (anchored: contract:ch11-gate-format#C27, contract:ch11-gate-format#C28) |
| O4 | The debug bundle's `BundleTranscriptRow` keyset is UNCHANGED: the bundle is its OWN explicitly-projected surface (the ch7-P3 exact-keyset contract; the secret-exfil guardrail projects fields by name), and C27 binds the TRANSCRIPT read surface — which detail/timeline/tail carry (O3). Bundle growth is that surface's own later, explicit decision — stated here, never silently gapped. DERIVATION: the ch7-P3 packet fixed the bundle row keyset as a deliberate projection; extending it is a semantic change to a ratified surface no ch11 row demands (derived: prose:packet ch7-p3, contract:ch11-gate-format#C27, prose:v3/src/floor/debugBundle.ts) |
| O5 | Free-text classification (the packet's payload/redaction claim): retained `reason`/`message`/`evidenceRefs` and the rejection's `gateReason`/`evidenceRefs` are — for the Block A evaluators — FIXED tokens or absent (G4/G6 emit `round_below_min`/`no_previous_verdict` and nothing else); the general fields are UNTRUSTED-CONFINED diagnostic/display text retained VERBATIM on the committed read surface (C32's culture — its full process-seam realization is P3's), never re-parsed, never policy or path input; the reason-token and registry-name namespaces stay DISJOINT (C31; the 54-name drift lock is the mechanical witness) (anchored: contract:ch11-gate-format#C31, contract:ch11-gate-format#C32) |

## Canonical wiring/ripple matrix (T)

| Id | Rule |
|---|---|
| T1 | `KernelDeps` gains REQUIRED `gates: GateCatalog` (the `diag` culture: explicit wiring, no silent default — an absent catalog would turn every gated evaluation into the backstop rejection); the composition roots (`cli/main.ts`, `cli/dev/main.ts`) wire the SAME `createGateRegistry()` VALUE into the definition store (P2a, built) AND the kernel — one composition per root, two injection points (two different catalogs would re-open the registry drift the C35 backstop guards) (anchored: contract:ch11-gate-format#C29, contract:ch11-gate-format#C8) |
| T2 | The measured consumer set updates MECHANICALLY under three sanctioned change classes — kernel-deps wiring (every `createKernel` call site gains `gates`: the 13 measured test files + the 2 CLI roots), entry-shape completion (test-constructed `TranscriptEntry`/commit-input literals gain `gateDecisions: []`: the 5-file `committedAt:` sweep is the COVERING measurement — 4 of the 5 carried entry literals; `ingress/ingress.test.ts` hit on unknown-key probes and owed no edit, arm-gate-2 aftermath correction), and additive-field expectation updates (entry-equality asserts extended with `gateDecisions`) — zero lane-meaning changes; the testkit CONTRACT is unchanged (no new fixture type, no checker change, no harness field — gate asserts live in test files over `ReplayResult`); the build re-runs each sweep and treats a grown set as a boundary question, not a silent extension. DERIVATION: the P2a T3 sanctioned-change-class pattern applied to this packet's compile-enforced ripple (derived: prose:packet ch11-p2a T3, prose:v3/src/kernel/kernel.ts) |
| T3 | The l2 golden trace ships as `v3/src/l2Trace.test.ts` — at-level (explicit roles + versions, no lift), the directly-constructed gated template admitted through `admitTemplate` + `createGateRegistry()` (tests legally import `gates/` — the G1 ban binds production modules); the FILE format carries no `gates` key until P4, so the load-channel confinement (P2a A8) stands untouched. DERIVATION: the trace needs the rung + a gated admitted template; the direct-construction route is the only P4-free channel, and the l1Trace at-level pattern is the built precedent (derived: prose:packet ch11-p2a A8, prose:v3/src/l1Trace.test.ts, prose:plan §11.4 P4 row) |

## Site × shape × phase grid (template §2 write-time discipline)

Trigger check: the packet adds ONE new awaited site to a phased seam
(`HANDLE`: per-attempt execution with CAS restarts; pre- vs
post-commit). The grid, per attempt:

| Site | Phase | Failure shape | Channel | Driven by / ruled out |
|---|---|---|---|---|
| the projection transcript read (K6; expected `getTimeline(id, 0)`) | pre-commit, GATED path only, after the first binding's K2/K3 checks | port rejection / synchronous throw | propagates → the outer catch → diag `internal_failure` + rethrow (the built kernel channel) | DRIVEN: a hostile store whose read rejects during a gated handle |
| the same read | same | `null` return (instance vanished between `loadInstance` and the read) | kernel INTEGRITY throw (the `loadTemplate` precedent) → same outer channel | DRIVEN: a hostile store returning null |
| the same read | CAS-restart attempts | re-fires per attempt (fresh snapshot) | same | DRIVEN: dimension 12's forced-conflict lane |
| `commitTransition` | pre/post-commit | UNCHANGED shapes — the same single txn gains one column write; no new result kind, no new throw class | unchanged | RULED OUT as new lanes: the ch4-P2 lanes stand; the input type change is compile-level |
| the UNGATED path | — | ZERO new awaited sites (K7) | — | DRIVEN: dimension 10's counting-store silence lane |
| evaluator `evaluate` calls | pre-commit | synchronous throw (a hostile test evaluator; the shipped two are total) | propagates → the outer catch → diag `internal_failure` + rethrow — an evaluator throw is NOT a rejection and NOT fail-open (nothing commits) | DRIVEN: a throwing test-catalog evaluator |

No other awaited site changes; the file-load seam (ch8-P1's grid) and
the diag seam (ch7) are untouched.

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical | Mirrors |
|---|---|---|
| rung placement + first-block-wins + block-before-commit | K1 + K4 | Claim 1 · dimensions 1–3 · the trace's step-2 row · the invariant slice rows |
| retained decisions: shape, order, committed-only | K5 + O2 | Claim 2 · dimension 6 · S2/S4's writer clauses · the trace's supplemental asserts |
| one-snapshot lazy projection + restart re-derivation | K6 | dimensions 5/10/12 · the grid's read rows · in-context note 2 |
| the projection's field list + replay derivation | V1 + V2 | Claim 3's input clause · dimension 5 · the C23 forward pointer in V1 |
| the fenced schema bump | S1 | Claim 4 · dimension 7 · in-context note 6 |
| gate_blocked payload pass-through (both iffs; exclusion type-expressed) | O1 | dimension 9 · the rejection-strings section · the trace's step-2 assert |
| read pass-through + the bundle's unchanged keyset | O3 + O4 | Claim 2's surface list · dimension 8 · in-context note 5 |
| one injected catalog, both injection points | T1 | Claim 5's one-catalog clause · in-context note 3 |
| confinement (ungated zero-reads · diag shape · round untouched) | K7 | Claim 6 · dimension 10 · the grid's ungated row · the slice's HANDLE disposition |
| fail-closed backstop rejections (evaluator-unavailable · process-unsupported) | K2 + K3 | dimension 4 · Claim 5's fail-closed clause |
| the projection negative (no raw transcript · no store handle · no payloads to evaluators) | V3 | Claim 3's never-clause · dimension 5's V3-negative |
| reason-token vs registry-name disjointness | O5 | the rejection-strings section |
| the staged remainder (process path P3 · round alignment P2c · format key P4) | K3 + K7 + T3 | Claim 6's boundary clauses · the slice's partial-realization list · the header's split record |

The Pre-approval flags ledger stays out of the live mirror set (the
ch11-P1/P2a precedent): entries are dated decision snapshots.

## In-context notes (the scarce budget)

1. **The rung is a filter, not a writer:** it computes and returns;
   the ONLY state change on any gate path is the ONE atomic commit
   that a fully-allowing pipeline reaches — resist any "record the
   block attempt" impulse (blocked attempts are diag material, and
   the existing rejected-event emission already covers them).
2. **Derive lazily, snapshot once:** the transcript read fires only
   after the first binding's resolve/implementation checks pass;
   one projection serves the whole pipeline; never cache it across
   attempts (the CAS restart re-derives — dimension 12 catches a
   cross-attempt cache).
3. **One catalog value per composition root:** wire the SAME
   `createGateRegistry()` result into the definition store and the
   kernel — composing two would let admission and the rung disagree,
   exactly the drift the C35 backstop exists to CATCH, not cause.
4. **Do not re-validate at the rung:** the binding's `config` is the
   effective form by construction (C22); testing a bad config means
   asserting the COMPILER's findings (P2a), never handing a bad
   template to the kernel — the rung has no config-shape branch.
5. **The bundle stays projected:** `toBundleRow` keeps its exact
   keyset — do not "helpfully" add `gateDecisions` to the debug
   bundle (O4 is a stated decision; the transcript read surface
   carries the field).
6. **The bump is the fence, not a migration:** bump the constant,
   extend `SCHEMA`, extend the INSERT and the row mapper — no ALTER,
   no data carry, no new open-path branch (the wipe/refuse lanes are
   built and stay byte-identical).
7. **Hostile lanes ride test-composed catalogs and stores** (the P2a
   note-5 culture): recording/throwing evaluators, drifted catalogs,
   and read-failing stores are composed per test — never mutations of
   the shipped registry or store.

## Embedding gates (v1-inherited)

- **New:** `v3/src/kernel/gateProjection.ts` (V1–V4 — the pure
  derivation), `v3/src/kernel/gateProjection.test.ts` (the V grid),
  `v3/src/l2Trace.test.ts` (T3 — the golden trace).
- **Edited (production):** `v3/src/kernel/kernel.ts` (K1–K7 — the
  rung + the projection read + the `gates` dep),
  `v3/src/domain/gate.ts` (O2 — `RetainedGateDecision`),
  `v3/src/domain/outcome.ts` (O1 — the discriminated gate_blocked
  arm), `v3/src/domain/instance.ts` (S3 — `TranscriptEntry.gateDecisions`),
  `v3/src/domain/index.ts` (exports),
  `v3/src/ports/store.ts` (S2 — `CommitTransitionInput.gateDecisions`),
  `v3/src/store/sqliteStore.ts` (S1–S4 — version, schema, INSERT,
  mapper), `v3/src/cli/main.ts` + `v3/src/cli/dev/main.ts` (T1 — the
  kernel catalog wiring at both roots; no verb/flag/output change),
  `v3/src/drift/unitMap.json` (the three l2 ids flip realized:
  `HANDLE` → `kernel.ts#createKernel` implement, `gate_projection` →
  `kernel/gateProjection.ts#deriveGateProjection` implement,
  `activate` → `kernel/start.ts#startInstance` alias/inherited),
  `v3/src/drift/domainRegistry.ts` (`l2/gate_projection` flips
  realized witnessed by `GateProjection`; `l2/WorkflowInstance` STAYS
  pending — its row's load-bearing half is the reconstructable claim
  P2c's checker realizes; stated, not silently skipped).
- **Edited (tests — the type-ripple set; every file updates under
  T2's three sanctioned change classes):**
  `kernel/kernel.test.ts` (the K/O lanes + wiring),
  `kernel/gateProjection.test.ts` is new (above),
  `kernel/start.test.ts`, `kernel/diagEmission.test.ts` (wiring; the
  diag-confinement lane), `store/sqliteStore.test.ts` (the S lanes),
  `cli/cli.test.ts` (the dimension-8 spot lane + any entry-shape
  echoes), `cli/journey.test.ts` (the R-ACTIVATION-JOURNEY
  discharge — the subprocess journey positively asserts
  `gateDecisions: []` on its timeline rows), `floor/floor.test.ts`, `floor/tail.test.ts`,
  `floor/diagTail.test.ts`, `floor/debugBundle.test.ts` (wiring +
  entry literals + the O4 negative), `diag/sqliteDiagStore.test.ts`,
  `emitLoop.test.ts`, `twoWorker.test.ts`, `l0aTrace.test.ts`,
  `l0bTrace.test.ts`, `l1Trace.test.ts` (wiring),
  `testkit/storeCheckers.test.ts`, `testkit/traceHarness.test.ts`
  (entry-literal completion), and `ingress/ingress.test.ts` carried
  as MAY-change (its `committedAt:` sweep hits are unknown-key
  probes, not entry literals — the build confirmed no edit was owed;
  aftermath-corrected from the original "edited" listing, arm-gate-2
  note).
- **Untouched, explicitly:** `v3/src/gates/**` (the evaluators and
  registry are consumed AS BUILT — zero edits),
  `v3/src/definition/**` (admission as built; the load channel is
  P2a A8's pinned surface), `v3/src/ports/gate.ts` +
  `v3/src/ports/definition.ts` (as built), `v3/src/floor/*.ts`
  (production — pass-through, O3/O4), `v3/src/ingress/*.ts`
  (production), `v3/src/emit/**`, `v3/src/diag/*.ts` (production —
  no event shape change, K7), `v3/src/domain/rejections.ts` (the
  registry stays 54), `v3/src/kernel/admission.ts` /
  `capability.ts` / `dispatchIntent.ts` / `start.ts` (the ladder and
  dispatch as built; start's `round: 1` IS the activate alias),
  `v3/src/testkit/*.ts` (production kit — contract unchanged, T2),
  `v3/eslint.config.mjs` (the P2a boundary entries already cover
  every new edge: kernel takes the catalog as an injected TYPE, tests
  are ignored by the gates ban), `v3/templates/local-pair-v0@1.yaml`
  (no format change until P4), `tools/**`, `v3/adr/**` (no new ADR —
  the bump rides ADR-003's accepted stance; no module, driver, or
  boundary decision enters).
- **Sweeps (measured 2026-07-12, current tree; untruncated):**
  `grep -rn "createKernel(" v3/src --include="*.ts" | grep -v kernel/kernel.ts`
  → 32 sites in 15 files: `twoWorker.test.ts` (1), `l1Trace.test.ts`
  (1), `l0bTrace.test.ts` (1), `emitLoop.test.ts` (1),
  `l0aTrace.test.ts` (1), `diag/sqliteDiagStore.test.ts` (1),
  `cli/main.ts` (2), `cli/dev/main.ts` (2), `floor/floor.test.ts`
  (1), `floor/tail.test.ts` (1), `floor/debugBundle.test.ts` (1),
  `floor/diagTail.test.ts` (1), `kernel/start.test.ts` (1),
  `kernel/diagEmission.test.ts` (11), `kernel/kernel.test.ts` (6) —
  all carried in the boundary;
  `grep -rln "committedAt:" v3/src --include="*.test.ts"` → 5 files
  (`ingress/ingress.test.ts`, `testkit/storeCheckers.test.ts`,
  `testkit/traceHarness.test.ts`, `floor/diagTail.test.ts`,
  `floor/tail.test.ts`) — the COVERING sweep for entry-literal
  completion, all carried (4 of the 5 carried literals; the ingress
  hits proved to be unknown-key probes — the aftermath correction); `grep -rln "SCHEMA_VERSION\|schema_version" v3/src
  --include="*.ts"` → 5 files, of which the store pair changes and
  the diag pair is a SEPARATE store (ADR-010) with its own version —
  untouched (`debugBundle.test.ts` hits on the diag marker, carried
  for its wiring anyway); the build re-runs each sweep and treats a
  grown set as a boundary question, not a silent extension.
- **Type-ripple targets:** `CommitTransitionInput.gateDecisions`
  (required) ripples exactly the `commitTransition` callers/fakes
  (kernel.ts + the hostile-store wrappers in tests — carried);
  `TranscriptEntry.gateDecisions` ripples the 5 entry-literal files;
  `KernelDeps.gates` ripples the 15 `createKernel` files; the
  `Outcome` arm change is additive-discriminated (existing rejected
  literals name non-gate reasons and stay compatible);
  `v3:typecheck` is the closing backstop the sweeps never replace.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/gateProjection.ts",
      "v3/src/kernel/gateProjection.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/start.test.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/domain/gate.ts",
      "v3/src/domain/outcome.ts",
      "v3/src/domain/instance.ts",
      "v3/src/domain/index.ts",
      "v3/src/ports/store.ts",
      "v3/src/store/sqliteStore.ts",
      "v3/src/store/sqliteStore.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/ingress/ingress.test.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.ts"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "K1", "class": "anchored", "refs": ["prose:l2-pseudocode/HANDLE", "contract:ch11-gate-format#C3", "prose:packet ch11-p2a"] },
      { "id": "K2", "class": "anchored", "refs": ["contract:ch11-gate-format#C35", "contract:ch11-gate-format#C8", "prose:l2-pseudocode/HANDLE"] },
      { "id": "K3", "class": "derived", "refs": ["prose:l2-pseudocode/HANDLE", "prose:ledger §2 l2", "prose:packet ch11-p2a"] },
      { "id": "K4", "class": "anchored", "refs": ["prose:l2-pseudocode/HANDLE", "contract:ch11-gate-format#C22", "contract:ch11-gate-format#C33"] },
      { "id": "K5", "class": "anchored", "refs": ["prose:l2-pseudocode/HANDLE", "contract:ch11-gate-format#C27"] },
      { "id": "K6", "class": "derived", "refs": ["prose:l2-pseudocode/HANDLE", "prose:l2-pseudocode/gate_projection", "prose:packet ch11-p2a"] },
      { "id": "K7", "class": "derived", "refs": ["prose:plan §11.4 P2b row", "contract:ch11-gate-format#C28", "prose:packet ch11-p2a"] },
      { "id": "V1", "class": "anchored", "refs": ["contract:ch11-gate-format#C24", "prose:l2-pseudocode/gate_projection"] },
      { "id": "V2", "class": "derived", "refs": ["contract:ch11-gate-format#C24", "prose:l2-pseudocode/gate_projection", "prose:v3/src/kernel/kernel.ts"] },
      { "id": "V3", "class": "anchored", "refs": ["contract:ch11-gate-format#C24", "prose:l2-pseudocode/gate_projection", "prose:ledger §2 l2"] },
      { "id": "V4", "class": "derived", "refs": ["prose:v3/src/kernel/kernel.ts", "prose:l2-pseudocode/HANDLE"] },
      { "id": "S1", "class": "anchored", "refs": ["contract:ch11-gate-format#C27", "ADR-003", "prose:plan §11.1 item 2"] },
      { "id": "S2", "class": "derived", "refs": ["contract:ch11-gate-format#C27", "prose:v3/src/ports/store.ts"] },
      { "id": "S3", "class": "derived", "refs": ["contract:ch11-gate-format#C27", "prose:v3/src/store/sqliteStore.ts"] },
      { "id": "S4", "class": "anchored", "refs": ["contract:ch11-gate-format#C27"] },
      { "id": "O1", "class": "derived", "refs": ["prose:l2-pseudocode/HANDLE", "contract:ch11-gate-format#C31", "contract:ch11-gate-format#C33"] },
      { "id": "O2", "class": "anchored", "refs": ["contract:ch11-gate-format#C27", "prose:ledger §4 l2"] },
      { "id": "O3", "class": "anchored", "refs": ["contract:ch11-gate-format#C27", "contract:ch11-gate-format#C28"] },
      { "id": "O4", "class": "derived", "refs": ["prose:packet ch7-p3", "contract:ch11-gate-format#C27", "prose:v3/src/floor/debugBundle.ts"] },
      { "id": "O5", "class": "anchored", "refs": ["contract:ch11-gate-format#C31", "contract:ch11-gate-format#C32"] },
      { "id": "T1", "class": "anchored", "refs": ["contract:ch11-gate-format#C29", "contract:ch11-gate-format#C8"] },
      { "id": "T2", "class": "derived", "refs": ["prose:packet ch11-p2a", "prose:v3/src/kernel/kernel.ts"] },
      { "id": "T3", "class": "derived", "refs": ["prose:packet ch11-p2a", "prose:v3/src/l1Trace.test.ts", "prose:plan §11.4 P4 row"] }
    ]
  }
}
```

## Pre-approval flags

None. No new-decision manifest row exists (tally: 12 anchored /
11 derived / 0 new-decision); no narrowing or open decision point
rides outside the ratified sources: the staged remainder (the process
execution path P3, the round alignment P2c, the format key P4) is the
ratified plan's own packet cut, stated as proof boundaries; the O4
bundle-keyset reading and the K3 no-dead-code staging are derived
rows with their derivations in-row; no contested substrate premise
exists (the packet's only substrate-adjacent claims — the fenced
wipe/refuse lanes — are built, tested ch4-P2/ch5-P4 behavior this
packet re-drives at v3). The P2c round-format question stays
quarantined at P2c's authoring (the split's record).

## Acceptance

- **Dimensions 1–12 test-driven; every declared lane driven by name
  and ABLE TO FAIL (R-LANE-SENSITIVITY):**
  - `kernel/kernel.test.ts` — the K matrix: dimension 1's placement
    grid (recording catalog asserts ZERO evaluations on pre-rung
    rejections — a hoisted rung fails it); dimension 2's four
    combination lanes (recording evaluators assert call counts AND
    order; the warn-discard lane asserts no transcript row);
    dimension 3's block semantics (full-instance equality via
    before/after loads + no row + the later-success pair); dimension
    4's backstop lanes (drifted catalog; process-implementation
    registration — each asserting the EXACT rejection name and zero
    evaluate calls; PLUS the order-interplay combination:
    `[valid-allow, unresolvable]` → the first evaluated exactly
    once, the second rejects `gate_evaluator_unavailable`; AND the
    pre-read discipline twin: `[unresolvable, …]` over a counting
    store whose transcript read would throw → the backstop
    rejection with ZERO read attempts);
    dimension 6's retained fidelity (a warn with
    ALL optional fields round-trips byte-equal; decisions only on
    their own row); dimension 9's outcome lanes (`gateReason` +
    `evidenceRefs` asserted by VALUE on a blocking test evaluator;
    the ABSENCE halves — a reasonless test-evaluator block yields
    NO `gateReason` key, a refs-less block yields NO `evidenceRefs`
    key, an explicit-`[]` refs block yields `evidenceRefs: []`;
    `@ts-expect-error` probes proving non-gate reasons cannot carry
    them — each probe otherwise well-typed, the P2a isolation
    discipline); dimension 10's confinement (counting store: zero
    gated-path reads on an ungated emit; recording diag sink: the
    gate rejection event carries the EXISTING keyset only);
    dimension 12's CAS-restart lane (one forced conflict → the read
    fires per attempt, decisions from fresh state); the grid's
    hostile-store lanes (rejecting read → `internal_failure` diag +
    rethrow; null read → integrity throw; throwing test evaluator →
    same channel, nothing committed).
  - `kernel/gateProjection.test.ts` — the V grid over the PURE
    derivation: multi-loop-back replay (a step revisited twice —
    per-entry `stepId`/`role`/`eventType` asserted as exact lists,
    transcript order), empty transcript → `[]`, `round`/
    `currentStep`/`eventType` pass-through, V3's two-grain negative
    (the projection object carries NO payload/digest/opId/timestamp
    keys — asserted over its OWN keys — AND every history entry's
    own keys are exactly `{stepId, eventType, role}`), V4's
    non-resolving replay throw.
  - `store/sqliteStore.test.ts` — the S lanes: the column
    round-trips the FULL optional-field shape byte-equal on BOTH
    read surfaces (one write, two reads, deep equality — a
    mapper-divergence fails it); `[]` known-empty; the METADATA
    lane (`PRAGMA table_info(transcript)`: `gate_decisions` declared
    `TEXT`, `notnull = 1`; the table STRICT — a nullable or
    type-loose column fails it); the v2→v3 wipe
    lane (a v2 prototype-marked store re-opens empty at v3); the
    refuse lanes re-driven byte-identical (no-marker / incomplete /
    non-prototype — message equality, not keysets).
  - `v3/src/l2Trace.test.ts` — the trace table above as a
    `TraceFixture` (at-level), with the supplemental asserts: the
    step-2 `gateReason`, per-row `gateDecisions` (the `[]` rows AND
    the exact two-decision final row in authored order), and
    `runAllCheckers` green; dimension 11's threshold boundary rides
    steps 2/5 (an off-by-one `<=` fails step 5's commit); the
    `previous_reviewer_verdict` first-arrival block lane (a
    start-step gate → `no_previous_verdict` e2e) rides
    `kernel.test.ts` or this file.
  - `cli/cli.test.ts` — dimension 8's spot lane: `detail` and
    `timeline` output rows carry `gateDecisions: []` on an ungated
    run (the shipped-surface pass-through driven, C27/C28);
    `cli/journey.test.ts` — the R-ACTIVATION-JOURNEY discharge (the
    Sizing/risk disposition): the subprocess journey POSITIVELY
    asserts `gateDecisions: []` on its timeline rows;
    `floor/debugBundle.test.ts` — the O4 negative: bundle rows do
    NOT carry the field (an added key fails).
- **Behavior-change honesty:** the claimed deltas are EXACTLY: the
  rung's rejections on gated inputs (constructible only via
  direct-construction until P4), the additive `gateDecisions` field
  on transcript entries everywhere they surface, the v3 schema
  marker, and the `KernelDeps`/`CommitTransitionInput` type growth —
  everything else is proven unchanged by the FULL existing suite
  green after T2's mechanical updates.
- **The review-disposition invariant** (`l2/gate-is-read-only-stateless`,
  review): executed at build-loop step 6 — the reviewer confirms the
  rung hands evaluators ONLY (config, projection) values, no store
  handle, no instance aggregate, no kernel mutable state; the P2a G7
  purity lanes (frozen inputs, repeated-call determinism) stand as
  the evaluator-side mechanical floor.
- Drift tests green (standing, unconditional — PI-3): rejection
  registry untouched (54); `unitMap.json` +3 l2 flips (with
  codeRefs); `domainRegistry.ts` `l2/gate_projection` flipped with
  its witness, `l2/WorkflowInstance` stays pending (P2c's half —
  stated).
- Coverage validation green: units 17/159 owned, invariants 15/116,
  traces 4/20.
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint`, `v3:adr-check` (no new ADR).
- Standing review rules in force: **REV-A1-TXN** (the commit txn
  gains one column write INSIDE the existing boundary — the
  pre-check stays a fast path); **REV-B-LOCAL-NOT-AUTHORITY** (the
  catalog is composition, not a cache; the projection is derived per
  attempt, never memoized as authority); **REV-C-PROJECTIONS-READONLY**
  (`gate_projection` is a read model — evaluators and the derivation
  write nothing); **REV-E-NO-ADAPTER-BRANCH** (the rung branches on
  the ledger's own discriminant only); **REV-DIAG-FAILOPEN** (the
  diag emits stay BARE and shape-unchanged; no diag failure can
  change an Outcome — untouched surface).

## Build record

Approved 2026-07-12 on the AUTONOMOUS flag-free path (README §5.5) —
zero new-decision manifest rows, zero flags, every approve-time
tier-0 gate green at the approve moment, a clean FINAL close, and
arm gate 1 clean on the same final hash. The hash chronicle: R1 FULL
bound `caabde55…` (five lenses; one convergent sweep-transcription
defect, the mirror-map additions, and the R-ACTIVATION-JOURNEY
discharge folded); the fold produced `8488f3d2…`; R2 TARGETED
(lenses 1/3/4/5 + reconciliation; lens 2 skipped proven-unaffected)
ran CLEAN with one locus imprecision folded as bookkeeping to
`aead9b9c…`; the first close ran CLEAN on it. ARM GATE 1
(agent-invoked `codex exec`, pin-conform gpt-5.6-sol/high/never,
byte guard clean before+after) returned `refine` citing `aead9b9c…`
with FIVE findings — the K6 first-evaluate ordering equivalence
stated in-row + its order-interplay combination lane, the O1
required-`gateReason` corrected to the unit's VERBATIM pass-through
iff (the built `GateDecision.reason` is optional even on block — the
type-permits-what-the-row-forbids class caught at the PACKET grain
this time), the evidenceRefs ABSENCE halves driven, the V3 negative
deepened to TWO grains (per-entry own keys), and the NOT NULL/STRICT
obligation driven at the METADATA grain (`PRAGMA table_info`).
Reconciliation CLEAN on `eb16f581…` (+ one cosmetic K4
symmetrization → `50f5db7f…`); the arm's RE-CHECK resolved 4/5 and
sharpened the remnant: the pre-read discipline lane (an eager
pre-checks projection read must FAIL a named test) — folded;
reconciliation CLEAN on `6f091b4c…`; the arm's SECOND re-check
returned CLEAN citing it; the FINAL close ran CLEAN citing the same
hash. 2 counted panel rounds of the 8-round watchdog;
reconciliations, closes, and arm passes uncounted. All internal
passes Opus-class. Approve-basis disposition (the P2a precedent,
recorded per its arm-gate-2 finding 2): the approve-ready bytes =
this file with this `## Build record` section restored to its
pre-build placeholder + zeroed-metrics form; the verification trail
lives in the panel/arm transcripts.

Built the same day (delegated build round, the packet as the binding
contract @ `6f091b4c…`). **668 → 705 tests** (+2 test files:
`kernel/gateProjection.test.ts`, `l2Trace.test.ts`; +37 tests).
Bridges at close (orchestrator-rerun, not builder-claimed):
`v3:typecheck` 0 errors · `v3:lint` clean · `v3:test` 705/705 ·
`v3:coverage` OK (units 17/159, invariants 15/116, traces 4/20 —
exactly the acceptance numbers) · `v3:packet-lint` 0 errors
(0 reopened) · `v3:adr-check` OK (14 ADRs, no new ADR). Sweep
receipts at build close (the authoring-time numbers were the
pre-build tree): `createKernel` grew 32/15 → 35 sites/16 files —
the growth is `l2Trace.test.ts` (new, in boundary) + two new
`kernel/kernel.test.ts` helper/lane sites (in boundary): the grown
set answered as a boundary question, not a silent extension;
`committedAt:` gained only the new `gateProjection.test.ts`
(`ingress/ingress.test.ts` needed NO edit — its hits are unknown-key
probes, not entry literals; the boundary carried it as may-change);
`SCHEMA_VERSION` set unchanged (store pair bumped to "3", diag pair
untouched). Every dimension 1–12 lane driven by a named test (the
per-dimension receipt table lives in the build transcript); the
review-disposition invariant (`l2/gate-is-read-only-stateless`)
confirmed at review: the rung hands evaluators (config, projection)
only. Zero deviations from the packet; changed files ⊆ the declared
boundary (the post-build audit is the mechanical witness).

**Aftermath (2026-07-12, ARM GATE 2 — the build-close implementation
review; pin-conform gpt-5.6-sol/high/never, verdict `refine` citing
the build sha `9bc76da7`, byte guard clean):** three test-evidence
findings + one packet-docs note, folded in ONE `fix(v3)` round: (1)
**the [warn, block] discard lane was order-insensitive** — it proved
the rejection and the empty transcript but not that the warn
evaluator ran FIRST; a block-first evaluation order stayed green;
fix: the lane's recording log asserts `["g.warn", "g.block"]`. (2)
**the CAS-restart lane counted reads and commits but not
re-evaluation** — a cross-attempt cache of the DECISION passed; fix:
the two attempts now see different committed histories and the
evaluator records what each call saw (`[0, 1]` + two evaluations —
the fresh-state half of dimension 12 driven, not implied). (3) **the
diag-confinement lane asserted a partial shape** — matchObject +
two banned keys; ANY other new diag field passed; fix: the lane
asserts the EXACT sorted keyset of the existing rejected-event
contract. (4) note: the Embedding-gates prose listed
`ingress/ingress.test.ts` as edited while the build correctly left
it untouched — corrected to a carried-as-may-change entry. 705
tests before and after (three lanes strengthened in place); full
bridges re-verified green; the aftermath commit's post-build audit
run against the packet at its own sha.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "inherited from the ch11-P2 row through the sizing split (plan §11.4, recorded at the ch11 ratification): pure projection from l2-pseudocode + ledger + the ratified draft's rung/read-surface rows", "discovered": "projection" },
    "provenance": { "anchored": 12, "derived": 11, "new_decision": 0 },
    "rounds": { "review": 2, "doc_refinement": 0, "implementation": 2 },
    "stops": [],
    "detector_misses": [
      {
        "found_at": "approve",
        "what": "arm gate 1 found five items two internal panel rounds had accepted: a derived row obliging more than its anchors force (O1's REQUIRED gateReason vs the built optional GateDecision.reason — the type-permits-what-the-row-forbids class at the packet grain), the K6 ordering-equivalence argument left implicit plus its undriven combination lane, two undriven negative halves (evidenceRefs absence; per-entry projection leakage), and a happy-path-only schema obligation (NOT NULL/STRICT undriven at the metadata grain)",
        "why_missed": "the internal lenses verified the O1 iff AGAINST THE MODEL UNIT but not against the ALREADY-BUILT sibling type it must consume; and the sensitivity probes asked whether each lane could fail on its own row's violation, not whether a STATED equivalence or a NOT-NULL declaration had a lane at all"
      },
      {
        "found_at": "approve",
        "what": "the arm's re-check found the fold's order-interplay lane still one-sided: it drove read-after-first-checks but nothing failed an EAGER pre-checks read — the pre-read discipline twin was missing",
        "why_missed": "the fold drove the direction the finding named; the complementary direction of the same discipline was not re-derived (the fix-scoped-to-the-finding class, at lane grain)"
      },
      {
        "found_at": "arm-build-close",
        "what": "three green-but-blind lanes in the BUILT tests: the [warn, block] discard lane proved discard but not order (a block-first evaluation passed); the CAS-restart lane counted reads/commits but never proved re-EVALUATION on fresh state (a cached decision passed); the diag-confinement lane asserted a partial shape (matchObject + two banned keys) instead of the exact keyset (any OTHER new field passed)",
        "why_missed": "the packet's lane texts stated the right meanings but the build realized weaker asserts, and no internal pass re-derived the sensitivity question AGAINST THE BUILT TEST BODIES — R-LANE-SENSITIVITY was applied at packet-writing time, not re-applied at build close"
      }
    ],
    "learned": "a derived row's obligations are checked against the BUILT sibling types it consumes, not only its model anchors; every ordering/discipline claim needs BOTH directions driven; and R-LANE-SENSITIVITY binds twice — once against the packet's lane texts, once against the BUILT test bodies at close"
  }
}
```
