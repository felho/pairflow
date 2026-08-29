# Task Packet: ch14-p2b-decision-delivery — the two operator intents, their records, and the cycle closing

Plan step: plan.md §14.4's LIVE Packets-and-flow-mode table, row `ch14-p2b`
— the delivery half of the `ch14-P2` split executed at ch14-p2a's
pre-approval. Order: draft ratification → P1 → p2a → p2b → P3.
Autonomy stage: measurement — inherited from the chapter header (plan §14)
through the split (split parts inherit mode, predicted class and
watchpoints). Not first-of-a-kind: a kernel-semantic packet realizing model
units onto the walking skeleton has ample precedent (ch14-p2a, ch12-p1b,
ch9-p1), and an entry-handler family with its own admission ladder and its
own transcript class has one in ch12-p1b.
Classification: **projection** — manifest tally: 6 anchored / 6 derived /
7 new-decision (machine-counted from the `packet_rows` block). The SIX
derived rows add PLACEMENT, REALIZATION ROUTE or a forced closure inside slots their
anchors delegate; the seven new-decision rows are each carried by a named
flag and ride to a HUMAN approve, so the inherited flag-free-⇒-autonomous
letter REACHES this packet and its §5.5 condition then FAILS at
authoring, and the MODE resolves to **human approve** (STOP `4:flagged-approve`), recorded in place in plan §14.4's
live table on the ch14-p2a / ch14-P1 precedent.
**The Case-B judgement, stated with the test the ch14-p2a approve
RATIFIED rather than with a count.** That approve admitted six
new-decision rows on TWO properties, and recorded that a future packet
must demonstrate THOSE PROPERTIES and never the count. Demonstrated here:
(i) ONE FORCING ORIGIN — every one of the seven is forced by a single
fact, that THE TWO OPERATOR INTENTS ARE A THIRD ENTRY CLASS, sibling to
neither the actor envelope nor the lifecycle intent. From that one fact:
they commit an op-carrying row that is neither a transition nor a
lifecycle fact (the store's write member, the compare's kind mode, the
bundle's row shapes); their guards must consult a record an EARLIER
commit wrote in another process lifetime (the pending-request read);
their admission needs rungs no existing ladder parameterizes (the
ladder's opening); they carry a VERSION RUNG
where every existing lifecycle intent carries none (the diagnostic
classification); and they need a driver no existing harness step can
supply (the harness step kinds). THE ORIGIN IS STATED AT THE CLASS GRAIN
RATHER THAN AT THE ROW GRAIN, because a row-shaped origin covers only the
rows whose forcing runs through that one shape, and this class's
consequences are several. They are forced by where the work lands, not
chosen. (ii) EACH ROW NAMES ITS OWN
RISK, in its own text. None moves MODEL meaning: a write-member shape, a
SHARED LADDER'S PARAMETER SET, a rung's compare domain, a read route, two
projection row shapes, a DIAGNOSTIC CLASSIFICATION, and a test-harness
surface. None touches authority, separation or availability-class
SEMANTICS — the two that come closest are addressed head-on in their own
rows: Q4's pending-request read names its alternatives, and Q3 opens the
AUTHORITY RUNG's shape without moving what it decides, since which
principal may act on which path is fixed by C15 and C18 and this row only
makes the rung's presence and its names expressible.
Prediction and discovery agree (plan §14.4 predicted `projection`,
inherited from the `ch14-P2` row through the split).

## Reading rule

This packet is POINTER-ONLY on the two authorities the chapter states:
every SEMANTIC rule of this surface lives as a C-row in
`contracts/ch14-human-decision-contract.md`, byte-locked by its
ratification blocks, and every STRUCTURAL rule of the template surface
lives as DATA in `v3/src/definition/schema/templateFormat.ts`, re-locked
at ch14-P1's build. A row below CITES its authority and adds only what
projection adds — placement, realization route, and the build decisions
the cited row leaves open. Re-wording a cited rule is a defect even when
the wording is better.

HANDOVER, stated because the reading rule makes it load-bearing: the
build's context — delegated or main — carries this packet AND the
`ch14-human-decision` contract. THE SIBLING PACKET IS NOT A HANDOVER
ITEM, and that is a deliberate cost: everything of `ch14-p2a` this build
needs is restated HERE in the rows that need it — among them the
arrival's signature and effect record at Q1, the wait record's
correlation handle at Q4, the op-less class's column iff at Q2, the
`request_ref` mint's placement at dimension 15, and the shared
required-field reader at Q5 — because a packet that can only be
built beside its sibling is not self-contained. The list is EXEMPLARY,
not exhaustive: each restatement declares itself where it stands. The declaration is NOT a
handover item either: nothing here edits or reads its bytes; the kernel
reads the ADMITTED value, whose shape the domain types carry.

Two disciplines govern what this packet STATES. **Necessity precedes
truth:** each sentence earns its place by the delegation litmus — what
does the builder get wrong without it? **A set the tree regenerates is
not stated:** where the compiler, the suite or the type system re-derives
a membership for free, this packet states the DERIVATION RULE and its
owner, plus the floor where one is measured — never a hand-assembled
list.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l3-pseudocode/admit_input", "disposition": "implement" },
      { "id": "l3-pseudocode/SUBMIT_DECISION", "disposition": "implement" },
      { "id": "l3-pseudocode/RESUME_WAIT", "disposition": "implement" },
      { "id": "l3-pseudocode/COMPLETE", "disposition": "implement" },
      { "id": "l3-pseudocode/RECEIVE", "disposition": "implement" },
      { "id": "l3-pseudocode/choice_point", "disposition": "review-only" }
    ],
    "rejections": [
      "not_awaiting_decision",
      "decision_request_mismatch",
      "operator_not_authorized",
      "unknown_decision",
      "missing_required_field",
      "override_required",
      "override_not_applicable",
      "not_waiting",
      "not_bare_wait",
      "resume_event_mismatch",
      "no_resume_transition",
      "unknown_instance",
      "invalid_shape",
      "op_id_collision",
      "missing_version"
    ],
    "invariants": [
      { "id": "l3/decision-is-operator-intent-not-actor-envelope", "disposition": "type/schema" },
      { "id": "l3/override-is-explicit-and-recorded", "disposition": "test" },
      { "id": "l3/a-loop-back-resumes-clean", "disposition": "test" },
      { "id": "l3/a-decision-carries-its-required-payload", "disposition": "test" },
      { "id": "l3/decisions-carry-no-lifecycle-meaning", "disposition": "review" },
      { "id": "l3/a-parked-wait-resumes-only-on-a-matching-event", "disposition": "test" }
    ],
    "traces": ["l3-pseudocode"],
    "shared_ownership": []
  }
}
```

THE REJECTION LIST IS FIFTEEN AND THE SPLIT INSIDE IT IS STATED, because
a flat list would hide the one thing C19 is careful about. ELEVEN are
names whose FIRST LIVE WRITER arrives here — they existed in the 54-name
registry from day one and nothing in the tree could reach them until the
two operator paths exist. FOUR are pre-existing names gaining a NEW
WRITER SITE on those paths: `unknown_instance` (the `admit_input` load),
`invalid_shape` (the two wires' ingress refusal), `op_id_collision` (the
operator ladder's idempotency rung) and `missing_version` (the F-W4-2
canonicalization). Declaring all fifteen is safe because the coverage
script reports the rejection axis rather than locking ownership; naming
the split is what keeps "first live writer" an honest claim. **ZERO new
registry names** — the 54-name registry is asserted byte-untouched before
AND after (C19; family 12).

`shared_ownership` is EMPTY as an ASSERTION: the units, invariants and the
trace declared above are wholly this packet's. `l3-pseudocode/HANDLE` and
`l3-pseudocode/CREATE_INSTANCE` are p2a's and are NOT re-declared, even
though this packet's Q1 changes what `HANDLE`'s arrival call reaches —
the change is inside the arrival, and a second owner on a unit whose text
this packet does not realize would buy a bookkeeping entry rather than a
review. The `decisions-carry-no-lifecycle-meaning` invariant is declared
HERE and not shared with p2a for the reason p2a's own slice states: no
decision key is ever selected until `SUBMIT_DECISION` exists, so at p2a
the invariant had nothing it could falsify.

## Operative material (full text — projection, not invention)

All SIX slice units are quoted VERBATIM and carry NO packet-authored bytes — the realization deltas sit in a note BELOW the fences, so a build can always tell the model's sentences from this packet's; that separation is the reason the note is not inline. Quoted VERBATIM from
`v3/model/units/l3-pseudocode/` — the five implementing ones and the
review-only `choice_point`. Template §2 step 2 admits no paraphrase and
carries no review-only carve-out, and the sole precedent (p2a's
`directive`) quotes its own review-only unit in full.

`COMPLETE` and `RECEIVE` are REPRINTS carrying one delta each, quoted in
full rather than glossed because the delta is this packet's own subject:
`COMPLETE`'s precondition widens and `RECEIVE` grows two routes.

```
# ─── ADMISSION gains its load-first companion (L3) — announced at L0d, arriving with the operator ops ───
# admit_input owns the load: one call either rejects an unknown instance or runs the full ladder —
# the loaded instance leaves this helper ONLY through Accepted.
# Expectations are evaluated LAZILY, each at its own rung, in rung order. An expectation may read the
# loaded instance, its pinned template (definitionStore.load — pinned immutable version), and step
# positions — all infallible, side-effect-free reads over committed state (load-time validation
# guarantees them); if such a read ever grows a reject/assert branch, that is a new finding, not a
# silent property.
# The payload rung stays key-scoped at the call sites: it runs AFTER the ChoicePoint selection, so
# its reject names live there. HANDLE deliberately keeps its inline load: its lineage runs from L0a,
# and folding only this level's copy would fork it — the asymmetry is chosen, not overlooked.
admit_input(input, expect) → Accepted(instance) | Duplicate | Stale | Rejected
  instance ← instanceStore.load(input.instance_id)
  IF instance is none THEN RETURN Rejected(unknown_instance)
  outcome ← admit_loaded(instance, expect, input)
  IF outcome ≠ Accepted THEN RETURN outcome
  RETURN Accepted(instance)
```

**REALIZATION NOTE on `admit_input`, authored HERE and deliberately kept
OUTSIDE the fence above** — the six quoted blocks carry model bytes only,
and a build must be able to tell which sentences are the model's. FIVE
realized deltas, all decided by Q3 and all about the SITE of work rather
than its semantics:

- **The ladder's arity stays TWO.** The model writes
  `admit_loaded(instance, expect, input)`; the realized ladder takes
  `(instance, expect)` and the intent's values reach the rungs as members
  of `expect`, exactly as HANDLE's `expectedVersion` and `expectedRole`
  do today. This is not a free choice: Q3 pins the two-parameter
  signature at the type level and treats a third parameter the way it
  treats an async ladder — a change to a shared signature that no C-row
  asks for. (A13's `.length` lane does NOT carry it; Q3 says why.)
- **The pinned-template load is not a rung and never was.** The l0d unit
  Q3 quotes says so in its own words — *"NOT rungs: the
  template/definition load (callers load it where they always did — no
  semantic move intended in this pass)"* — so
  the realized hoist FOLLOWS the model rather than departing from it; it
  is the l3 `SUBMIT_DECISION` block's rung comment that sites the load at
  the authority rung, and l0d decides against it.
- **`admit_input` is the one that loads, and its `Accepted` widens.** The
  template ref lives on the instance `admit_input` loads, so the HANDLER
  cannot pre-resolve the template the way HANDLE does — only
  `admit_input` can. It therefore takes the two PORTS as dependencies,
  loads the pinned template ONLY when an authority expectation is present
  (which is what keeps the resume path's load post-admission), resolves
  that expectation's GRANTED side to a plain `grantedRole` VALUE before
  delegating — so no port and no `await` ever reaches a rung — and
  returns the loaded template BESIDE the instance. That widening is
  what makes the submit path's ONE load true rather than asserted.
- **The authority expectation is a GROUP, not HANDLE's flat pair.**
  HANDLE passes
  `expectedRole` and `grantedRole` side by side, and an ABSENT
  `expectedRole` there means `missing_role` — a REJECTION, not a skip.
  Q3(iii) decides the opposite for this ladder: the rung becomes
  SKIPPABLE and carries PER-PATH names. Both cannot hold of one flat
  pair, so the expectation becomes the optional GROUP the l0d header
  already describes (*"a rung's reject name rides the expectation (the
  ladder knows no vocabulary)"*) — a claim, a granted value, and its own
  two names. HANDLE's pair is SUBSUMED by it, carrying `missing_role`
  and `role_not_authorized` as its names, and HANDLE's call site moves
  with the group, which is exactly what family 2's no-move CONTROL
  measures outcome by outcome. **THE TWO ABSENCES ARE DIFFERENT STATES
  and a build that collapses them turns a rejection into an accept:**
  HANDLE passes the group ALWAYS, with `claim: envelope.expectedRole` —
  so an absent CLAIM keeps meaning `missing_role`, exactly as today.
  Only an absent GROUP is a skip, and the RESUME path is its one
  inhabitant. A build reading "the rung becomes SKIPPABLE" and mapping
  HANDLE's absent `expectedRole` onto an absent group hands an actor with
  no role claim an `accepted`; family 2's control lane reds on it.
- **`admitInput` takes its OWN expectation type, not `AdmitExpect`**, for
  two forced reasons: it carries the intent's `op_id` because IT performs
  the `findOp` lookup (the live ladder receives the found ROW, resolved
  by its caller), and it must read whether an authority expectation is
  PRESENT before it can resolve the granted side. It PRODUCES
  `AdmitExpect` and delegates. ITS ACCEPTED ARM carries the template as a
  REQUIRED member on the submit path and none on the resume path — two
  accepted shapes discriminated by the caller's own expectation, never
  one shape narrowed by an assertion, because the load is conditional and
  a handler asserting non-null on a state its own call shape guarantees
  is how that guarantee stops being checked. Its
  home is the operator-intent module the boundary pins, NOT
  `admission.ts`, whose header declares the ladder a PURE pre-check and
  whose imports are domain types only.

```
SUBMIT_DECISION(decision) → Outcome                                  # operator_intent — a KICKOFF sibling; resumes WAITING(human_decision). decision = { instance_id, op_id, expected_version, request_ref, verdict, override?, payload?, by }. verdict is a DECLARED decision key — the kernel knows no decision names
  # ADMISSION via admit_input (load-first, born at L3) — the operator-intent rungs: idempotency → lifecycle/state → correlation → staleness → authority
  admitted ← admit_input(decision, expect: {
    op_id:     decision.op_id,                                                                # same (instance_id, op_id) scope as HANDLE
    state:     kernel_status = WAITING AND wait.kind = human_decision → Rejected(not_awaiting_decision),   # only a parked human_gate accepts a decision
    correlate: wait.request_ref = decision.request_ref → Rejected(decision_request_mismatch), # correlation to THIS pending DECISION_REQUEST
    version:   decision.expected_version,                                                     # CAS precheck (actor-supplied stale-intent, as in HANDLE)
    authority: { claim:   decision.by,
                 granted: instance.binding[template.step(instance.current_step).role],        # lazy rung-local read: `template` here IS the pinned-template load (definitionStore), performed at this rung — not the later textual load below
                 missing → Rejected(operator_not_authorized), mismatch → Rejected(operator_not_authorized) } })   # both branches declared (the L1 house style); operator authority on THIS path — NOT the L1 actor-envelope gate (a human decision is a different input class)
  IF admitted ≠ Accepted THEN RETURN admitted                       # Duplicate | Stale(v) | Rejected(…) pass through unchanged
  instance ← admitted.instance
  template ← definitionStore.load(instance.template_ref)
  step     ← template.step(instance.current_step)                   # the human_gate
  choice   ← step.decisions[decision.verdict]                       # a human_gate's decisions map IS its transition map, keyed by decision key; the kernel routes by the key — it does not know what "approve" means. CHOICEPOINT decisions: principal-committed selection by the bound operator
  IF choice is none                                THEN RETURN Rejected(unknown_decision)        # the verdict must be one of the gate's declared decision keys
  # required payload fields — declared per decision (the anchor's request_rework requires a non-empty instruction); generic, NO verdict name is hardcoded
  FOR field IN required_fields(choice):
    IF decision.payload[field] is absent OR empty  THEN RETURN Rejected(missing_required_field)
  request  ← pending_decision_request(instance)                     # the DECISION_REQUEST recorded on entry
  # override (the fiduciary invariant): override is meaningful ONLY against a recorded recommendation — choosing against the machine must be explicit and recorded. The decisions instance's irreducible rule, not a ChoicePoint phase
  against_recommendation ← request.recommendation is present AND decision.verdict ≠ request.recommendation
  IF against_recommendation     AND NOT decision.override THEN RETURN Rejected(override_required)        # went against the recommendation without flagging it
  IF NOT against_recommendation AND decision.override     THEN RETURN Rejected(override_not_applicable)  # no recommendation, or agreeing with it ⇒ there is nothing to override
  COMMIT atomically at expected_version = instance.version:
    entry ← DECISION_MADE { op_id: decision.op_id, decision: decision.verdict, payload: decision.payload, by: decision.by, request_ref: decision.request_ref }   # one generic entry; payload carries the decision's declared fields (e.g. rework's instruction + refs); op_id ⇒ the Duplicate-check idempotency key
    IF decision.override THEN entry.override ← true                                            # recorded ONLY against a recommendation (guarded above: present iff chosen ≠ recommended) — absent otherwise, audit-clean
    instance.transcript.append(entry)
    IF advances_round(step.id, choice.target) THEN clear_stale_decision_context(instance)       # a loop-back (e.g. rework → implement) opens a new round and drops the stale review/approval context — keyed on round advancement, NOT a verdict name; the fresh payload stays as the handoff
    apply_target_entry_effects(instance, template, step.id, choice.target)                      # GENERIC arrival: the TARGET's type decides park / dispatch / complete — the decision carries no lifecycle meaning. The SAME apply_target_entry_effects() HANDLE uses, so the entry paths never drift
    instance.version ← instance.version + 1
  RETURN Committed(instance.version, post_commit_output(instance, template))
```

```
RESUME_WAIT(event) → Outcome                                         # operator/kernel event resumes a type: wait step — the BARE-wait dual of SUBMIT_DECISION; generalizes KICKOFF. event = { instance_id, op_id, expected_version, type }
  # ADMISSION via admit_input (load-first, born at L3) — no authority rung on this path today: the
  # resume is kernel-classified (an authority hook is a later slice), so the expectation is simply absent
  admitted ← admit_input(event, expect: {
    op_id:     event.op_id,                                                                   # same (instance_id, op_id) scope as HANDLE
    state:     kernel_status = WAITING → Rejected(not_waiting),                               # only a parked instance can be resumed
    correlate: event.type ∈ wait.resume_events → Rejected(resume_event_mismatch),             # correlation to THIS open wait's declared resume class
    version:   event.expected_version })                                                      # CAS precheck
  IF admitted ≠ Accepted THEN RETURN admitted                       # Duplicate | Stale(v) | Rejected(…) pass through unchanged
  instance ← admitted.instance
  template ← definitionStore.load(instance.template_ref)
  IF NOT is_wait_step(template, instance.current_step)  THEN RETURN Rejected(not_bare_wait)     # wait-SHAPE guard, not a rung: RESUME_WAIT resumes ONLY a type: wait step; a decision wait resumes via SUBMIT_DECISION
  step     ← template.step(instance.current_step)
  target   ← step.on_resume[event.type]                             # CHOICEPOINT on_resume: kernel-classified — the event's validated-and-routed type is the key
  IF target is none                                THEN RETURN Rejected(no_resume_transition)   # the wait step must declare this resume route
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(WAIT_RESUMED { op_id: event.op_id, kind: instance.wait.kind, event: event.type })   # the resume rides the transcript; a result payload, an authority hook, and the actual action (e.g. running git commit) are later slices
    apply_target_entry_effects(instance, template, step.id, target)                     # the SAME apply_target_entry_effects() — routes by the target's type (here done ⇒ COMPLETE)
    instance.version ← instance.version + 1
  RETURN Committed(instance.version, post_commit_output(instance, template))
```

```
COMPLETE(instance)                                                   # internal helper — finalizes a COMMITTED ARRIVAL into a terminal target (a HANDLE actor transition OR a resumed human decision, both via apply_target_entry_effects)
  REQUIRE instance.kernel_status ≠ TERMINAL                            # was ACTIVE-only; apply_target_entry_effects() may complete from a resumed WAITING(human_decision) arrival too — only double-completion is barred
  instance.kernel_status ← TERMINAL ; instance.terminal_disposition ← done
```

```
RECEIVE(input) → Outcome                                               # one kernel entry; route by input source class
  MATCH input.source:
    operator_intent → dispatch to CREATE_INSTANCE / START / KICKOFF / SUBMIT_DECISION / RESUME_WAIT / CANCEL   # lifecycle + human-decision + wait-resume intents (later resume sources, e.g. child events, arrive as kernel_event on the same RESUME_WAIT)
    kernel_event    → dispatch to RUNTIME_CONTEXT_READY / FAIL               # internal events (done is internal-only, below)
    actor_envelope  → HANDLE(input)                                           # the L0a–L1 actor handler, now lifecycle-guarded
```

```
# ─── CHOICEPOINT (P2) — guarded keyed selection; the one structure behind the routing maps ───
# Born at L3: a second keyed routing map arrives (decisions joins transitions), so the shape gets its
# name. A position OFFERS a declared key set; an AUTHORIZED SELECTOR picks one key; guards validate;
# the commit routes by the key through the shared arrival (apply_target_entry_effects). The kernel
# knows no key names (de-vocabularized per map) — the ChoicePoint de-vocabularizes the map kinds
# themselves.
# Selector authority — who may pick (two values live today; the third is named now so a later level
# finds its slot ready-made):
#   principal-committed   an authorized principal picks, and the commit is theirs
#   kernel-classified     no accountable selector: the kernel derives the key and commits — by
#                         classifying a result, or by validating-and-routing an incoming event's
#                         type as the key
#   proposed              reserved (→ L9): the selector may only propose, never commit
# Maps existing by L3 — the instances:
#   transitions (L0b)   agent step    principal-committed (the bound actor; gates run before commit)
#   decisions   (L3)    human_gate    principal-committed (the bound operator; the override rule is
#                                     the instance's irreducible logic, not a ChoicePoint phase)
#   on_resume   (L3)    wait step     kernel-classified (the event's validated-and-routed type)
# Later maps are labeled in their own blocks: outcomes (LC3a/b — the runner's classified result),
# wait_for (L4 — the child's terminal commit).
# Route values: a route normally names a target entered through the shared arrival — including a
# SELF-TARGET, which genuinely re-arrives (re-park, arrival effects run; the LC3a conflict →
# merge_action re-park). A *stay* route: same position WITHOUT re-arrival — no arrival effects, no
# round advance; the enriched handoff belongs to the next dispatch. Stay went LIVE at L5 (the help
# reply's commit is its first load-bearing instance); it is a route value, not a selector authority.
```

The `choice_point` unit is REVIEW-ONLY — a family block naming the shape
behind the routing maps, not a routine. It mints no code. What it is READ
for here is its selector-authority table: `decisions` is
principal-committed (the bound operator, Q3's authority rung) while
`on_resume` is kernel-classified (no authority rung at all, C18's
deliberate absence). A gloss that dropped that distinction would make the
two handlers' rung sets look like an oversight rather than a contract.

### The `l3` golden trace (executable expectation — the committed-row sequence the test must reproduce)

FIXTURE TEMPLATE, authored HERE and deliberately NOT the shipped
`local-pair-v0` (whose gate wiring is P3's by plan §14.4 — a trace
reaching for it would take P3's work into this packet). Three steps, one
of each class this chapter admits, which is what lets ONE template drive
every target class a decision can reach:

- `ref { id: "l3-trace", version: 1 }`, `start: implement`.
- `implement` — an AGENT step: role `implementer`, an `instruction`
  (class-REQUIRED — a step without one fails admission), `transitions
  { PASS: gate }`, `recommends { PASS: approve }`.
- `gate` — the GATE class, spelled `human_gate` here because the fixture
  is DIRECT-CHANNEL (the harness takes an admitted domain template);
  `humanGate` is the file-channel spelling and would not typecheck.
  Role `operator`, an `instruction`, `decisions
  { approve: { target: commit_wait }, request_rework: { target:
  implement, payload: { instruction: { required: true } } } }`.
- `commit_wait` — `wait`: `wait { kind: commit_pending, resumeEvents:
  [COMMIT] }`, `onResume { COMMIT: done }`.
- `terminal: [done]`; roles `implementer → codex`, `operator → human-1`;
  `round { advanceOnArrivalAt: [implement] }`, so the rework loop-back
  advances and the forward path does not.

Both legs run through the REAL walking skeleton from the INGRESS, under
the controlled clock, with `runAllCheckers` green at the end. THE
"EXPECTED OUTCOME" COLUMN CARRIES MORE THAN THE HARNESS'S OWN
EXPECTATION TYPE, and the carrier is named rather than left to a reader:
the harness compares kind and version, so the per-step OUTPUT assertions
(the Ask's field values, the two `none` answers, the dispatch) are
asserted by the fixture file against the replay's RETURNED outcomes, not
by the harness's own comparison. Family 15 owns them. The
DECISION_REQUEST row is OP-LESS, so its `finalTranscript` pair carries
its `request_ref` where the other rows carry an op id — the harness's
existing rule, stated because a fixture author cannot guess it. THE FIELD SETS BELOW ARE IN THE MODEL'S SNAKE FACE, which is the STORED
form; the harness reads the DOMAIN face, which is camel, and the two are
the same values under the store casing seam. A fixture author asserts
against the domain face and translates — stated because the section's own
standard is that a fixture author should not have to guess. `R` below
is that ref's PLACE, not its spelling: the mint composes the injected
clock with a kernel-local counter, so under the controlled clock it is a
computable literal and the fixture pins the computed string rather than a
wildcard.

**LEG A — the main cycle** (converge → park + Ask; approve →
`commit_pending`; COMMIT → done).

| # | Input | Expected outcome | State after |
|---|---|---|---|
| 1 | `start { opId: s0, task }` — the harness's start step carries the run's task | `activated`, version 2 — STARTED fact at seq 1 | ACTIVE at `implement`, round 1, v2 |
| 2 | codex emits `PASS` — `{ opId: a1, expectedVersion: 2, expectedRole: implementer, payload: P }` | `committed`, version 3; output is the **Ask** — `allowedDecisions [approve, request_rework]`, `recommendation approve`, `question` = the GATE's instruction, `operator` = `human-1`, `expectedVersion` 3 | WAITING(`human_decision`) at `gate`, round 1, v3 |
| 3 | `SUBMIT_DECISION { opId: d1, expectedVersion: 3, requestRef: R, verdict: approve, by: human-1 }` | `committed`, version 4; output **none** (a bare wait awaits an inbound event) | WAITING(`commit_pending`) at `commit_wait`, round 1, v4 |
| 4 | `RESUME_WAIT { opId: r1, expectedVersion: 4, type: COMMIT }` | `committed`, version 5; output **none** (TERMINAL) | `done`, round 1, TERMINAL(`done`), v5 |

Committed rows, in seq order, with the class fields each carries:
`[1, s0]` STARTED · `[2, a1]` transition · `[3, R]` DECISION_REQUEST
`{ request_ref: R, recipient: operator, decisions: [approve,
request_rework], recommendation: approve, recommendation_source:
{ from_step: implement, event_type: PASS }, context_ref: P }` ·
`[4, d1]` DECISION_MADE `{ op_id: d1, decision: approve, by: human-1,
request_ref: R }` — no `payload` (approve declares none) and **no
`override`** (the verdict EQUALS the recommendation, so there was
nothing to override) · `[5, r1]` WAIT_RESUMED `{ op_id: r1, kind:
commit_pending, event: COMMIT }`.

Final transcript (full-sequence equality): `[[1, s0], [2, a1], [3, R],
[4, d1], [5, r1]]`.
Final state: `{ currentStep: "done", round: 1, kernelStatus: "TERMINAL",
terminalDisposition: "done", version: 5 }`.

**LEG B — the alternate override rework round.** A separate fixture over
the SAME template, because one run cannot end both at `done` and at a
re-opened round.

| # | Input | Expected outcome | State after |
|---|---|---|---|
| 1 | `start { opId: s0, task }` | `activated`, version 2 | ACTIVE at `implement`, round 1, v2 |
| 2 | codex emits `PASS` — `{ opId: a1, expectedVersion: 2, expectedRole: implementer }` | `committed`, version 3; the Ask, `recommendation approve` | WAITING(`human_decision`) at `gate`, round 1, v3 |
| 3 | `SUBMIT_DECISION { opId: d1, expectedVersion: 3, requestRef: R, verdict: request_rework, payload: { instruction: I }, by: human-1 }` — **no `override`** | `rejected` `override_required` — the verdict is AGAINST the recorded recommendation and the flag is absent. **Nothing committed**: no row, version unchanged | unchanged, v3 |
| 4 | the same intent WITH `override: true` | `committed`, version 4; output is a **DispatchIntent** for `implement` whose handoff IS the submitted payload | ACTIVE at `implement`, **round 2**, v4 |

Committed rows: `[1, s0]` · `[2, a1]` · `[3, R]` DECISION_REQUEST — as Leg A but
with NO `context_ref`, because this leg's arriving envelope carries no
payload and the field's rule is PRESENCE of the payload, not its truth ·
`[4, d1]` DECISION_MADE `{ op_id: d1, decision: request_rework,
payload: { instruction: I }, by: human-1, request_ref: R, override:
true }`.

Final transcript: `[[1, s0], [2, a1], [3, R], [4, d1]]`.
Final state: `{ currentStep: "implement", round: 2, kernelStatus:
"ACTIVE", terminalDisposition: null, version: 4 }`.

WHAT THE TWO LEGS PROVE THAT NO PER-ROW LANE DOES, stated so the trace is
not read as a duplicate of the families: step 3 of Leg B is the ONE place
the override rule, the round rule and the zero-side-effects rule are
observed on a single run — a rejected submit leaves the transcript and
the version untouched, and the SAME intent one flag later advances the
round and carries the operator's instruction to the actor. And Leg A's
step 4 is where `COMPLETE`'s widened precondition has its inhabitant: a
run completing from a RESUMED WAIT arrival rather than from an ACTIVE
actor transition.

Rejection strings: the FIFTEEN declared in the slice above, each quoted
there VERBATIM from ledger §3. Names DO recur in the prose below — a rung
or a guard is unreadable without its answer — so the drift guard is not
non-repetition but the DECLARATION: the slice block is the one place a
name is authored, the drift suite compares that block against the
registry, and every prose mention is a quotation of it.

## Claim

A parked run RESUMES FORWARD along its workflow only on an intent its own
committed record authorizes — SCOPED deliberately, and the exclusions are
NAMED rather than gestured at. TERMINATIONS: `CANCEL`, `FAIL` and the
runtime-context failure each admit any non-terminal run, a parked one
included, and end it with no authority rung — this claim is about the run
moving ON, never about it being stopped. AND ONE FORWARD RESUME:
`KICKOFF` moves a run out of its activation hold without routing through
a ChoicePoint at all, guarding on the wait's KIND rather than on its
declared resume events; it is the specialized resume the model says this
chapter's bare one generalizes, and Q7 keeps it OUT by refusing it at the
wait-shape guard. EVERYTHING ELSE THAT MOVES A PARKED RUN FORWARD DOES SO
THROUGH A CHOICEPOINT ITS OWN COMMITTED RECORD AUTHORIZES — and every
such move is ONE atomic commit whose record is
complete enough to reconstruct WHO decided, WHAT they chose, AGAINST WHAT
the machine recommended, and WHERE the run went, without consulting
anything the commit did not write. A decision routes by a DECLARED KEY
the kernel never interprets: the lifecycle meaning of the move comes from
the TARGET's type alone, through the SAME arrival every entry path
shares — so a decision can send a run to an agent step, to another gate,
to a wait, or to done, and the kernel learns nothing from the key's name
in any of those cases. A bare wait resumes only on an event its own
declaration listed, and answers an unrouted one rather than guessing. And
a human who decides against the machine's recorded recommendation can do
so only explicitly and on the record — while a human who was offered no
recommendation, or who agrees with it, cannot claim to have overridden
anything.

## Dimensions (enumerated BEFORE any test row)

1. **Entry path × the shared arrival.** THREE inhabitants now — `HANDLE`,
   `SUBMIT_DECISION`, `RESUME_WAIT`. p2a proved the sharing STRUCTURALLY
   (one function, one signature) and named the BEHAVIOURAL half as
   unreachable until this packet. It is reachable here, and family 1
   drives it: the same target class entered from all three paths produces
   the same effect record.
2. **SUBMIT_DECISION's rung order** — idempotency → state → correlation →
   version → authority. FIVE rungs, and the dimension is not the rungs
   but their ORDER: each adjacent pair is driven by a COMBINATION lane
   staging both failures at once, because isolated lanes cannot falsify a
   reordered ladder.
3. **RESUME_WAIT's rung order** — idempotency → state → correlation →
   version, and THEN the wait-SHAPE guard, after admission. The ABSENT
   authority rung is a cell of this dimension, not an omission: the
   selection is kernel-classified. It is driven POSITIVELY — a resume
   carrying no authority claim must SUCCEED — because the resume keyset
   has no `by` at all, so an added authority rung would red every
   positive resume lane rather than pass them.
4. **Idempotency compare domain.** The operator ladder compares KIND over
   op-carrying rows: the intent's OWN committed kind ⇒ Duplicate, ANY
   other kind ⇒ `op_id_collision`, and the digest compare stays
   transition-only. Membership: the entry-kind TOKENS existing after this
   packet × the two operator paths — tokens, not classes, because the
   compare is an equality on the discriminant and the lifecycle-fact
   class alone contributes three of them; the op-less token's cell is the
   one a build reaches by accident.
4b. **The arriving payload's SOURCE** — p2a's context-surface dimension
   covered the TRANSITION source only; the decision source is C13's
   stated widening and arrives here. Cells: a submit carrying a payload
   (the re-park's `context_ref` records the DECISION's payload) · a
   submit carrying none · a RESUME, which carries none by C18's declared
   Absent. The middle cell is the one a build passing an empty `arriving`
   on the submit path leaves green everywhere else.
5. **Key-scoped guard order** (AFTER the ChoicePoint selection):
   `unknown_decision` → `missing_required_field` → the override guards.
   An unknown verdict NEVER reaches the override guards, which is a
   combination lane and not an isolated one.
6. **Required-payload emptiness** — C15's CLOSED empty set (`null` ·
   `""` · `[]` · `{}`), plus ABSENT as its own condition and a nonempty
   value as the control: SIX cells. A SEVENTH is the discriminating one
   and is not a member of the closed set at all — a WHITESPACE-ONLY
   string, which must NOT be trimmed. It is named separately because a
   trimming build passes all six: every closed member rejects either way
   and the control accepts either way, so only the seventh separates
   them.
7. **The override truth table** — `against` × `override`, four cells,
   with `against` FALSE for TWO distinct causes (no recommendation
   recorded at all; a verdict EQUAL to the recommendation). Six cells in
   total, and the two ¬against causes must be driven separately because
   they reach one rejection from different states.
8. **`override`'s presence iff on DECISION_MADE** — recorded `true` IFF
   `against`, ABSENT otherwise. Never `false`: a build writing an
   explicit `false` satisfies every truthiness assertion while making the
   audit surface answer "declined to override" where the contract says
   "there was nothing to override".
9. **Round and context on a decision commit** — advancing vs not, keyed
   on the ADMITTED `advancesRound` of the (gate → target) edge and NEVER
   on a verdict name. CROSSED with the payload's delivery as the target's
   first-dispatch handoff, because a build keyed on the name passes every
   single-verdict fixture.
10. **Target class reached FROM a decision** — agent · `humanGate`
    (a genuine re-park, SELF-target included) · `wait` · terminal. The
    terminal cell is what makes COMPLETE's widening reachable at all.
11. **Resume routing and its refusals** — `onResume[type]` present ·
    absent (`no_resume_transition`, reachable BY DESIGN) · a DECISION
    wait meeting `RESUME_WAIT` in its TWO outcomes — a MISMATCHING event
    answers `resume_event_mismatch` at the correlation rung, which fires
    FIRST by the rung order's design; a DECLARED DECISION KEY passes that
    rung and REACHES the shape guard, which answers `not_bare_wait` · a
    KICKOFF hold meeting `RESUME_WAIT`
    (`not_bare_wait` again, because a hold carries no position).
12. **Wire keyset closure** — each intent's CLOSED keyset at ingress; an
    unknown or malformed key draws `invalid_shape`. The dimension's sharp
    cell is what ingress does NOT check: an absent `expected_version`
    must REACH the version rung's `missing_version`, and an absent `by`
    must REACH the authority rung — presence is deliberately not an
    ingress lane.
13. **The op-carrying row's stored shape** — `entry_body`'s SNAKE keys,
    `op_id` PRESENT, the transition-only columns NULL. The per-class
    column iff, in BOTH directions, for two more classes.
14. **Replay blindness, on TWO AXES** — POSITION is now three-way (a
    transition row, a DECISION_MADE row, a WAIT_RESUMED row) and THREE
    readers carry the blindness p2a marked, one of them PRODUCTION. The
    FOURTH reader is blind on the ROW-COUNT axis instead: the
    version-arithmetic checker counts ROWS where the human-gate park
    commits two in one commit. Four readers close, not three (Q11).
15. **Same-instance re-park** — p2a's dimension 12 cell it could not
    reach: a decision routing back to the SAME gate mints a FRESH
    `request_ref`, and a submit citing the OLD one must be refused by the
    correlation rung. THE MINT'S PLACEMENT IS RESTATED HERE rather than
    left to the sibling packet, because this family turns on it: the mint
    rides INSIDE the CAS-restart loop, so a restarted attempt mints again
    and the committed ref is the WINNING attempt's, with the losing
    attempt's value burned from the shared sequence.
16. **The recommendation's FIRST absence branch** — p2a's dimension 4
    cell it could not reach: an arrival whose firing edge belongs to a
    map that cannot carry `recommends` at all (a `decisions` or
    `onResume` edge). Reachable here, and the park it produces must
    record NO recommendation and NO source.

## Canonical rows

| ID | Rule |
|---|---|
| Q1 | **The two entry handlers, and the arrival they share — the BEHAVIOURAL half p2a could not prove — DERIVED.** DERIVATION: C11 fixes ONE shared arrival and C12 fixes that all three entry handlers return `Committed(version, post_commit_output(…))`; what neither fixes is WHAT EACH HANDLER SUPPLIES at the call, and this row derives that from the arrival's realized parameter list plus each path's own inbound state. The alternative it forecloses is a per-handler arrival copy, which C11's "the entry paths cannot drift" refuses outright. Anchor: `contract:ch14-human-decision#C11` and `contract:ch14-human-decision#C12`. Both handlers end the same way: append their own committed row, apply the SHARED arrival to the routed target, `version + 1`, and RETURN `Committed(version, post_commit_output(…))`. **THE SELECTION'S ARGUMENTS ARE STATED, because THREE of them are invisible from the model's two-argument sketch and one of those three THROWS when omitted:** it takes the POST-ARRIVAL instance projection (a snapshot carrying the arrival's own `wait`, not the pre-arrival instance — reproducing the caller's pre-ch14 assembly reads a stale wait and returns no Ask), the pinned template, the provider registry, the DISPATCH HANDOFF (Q6's, and `decision.payload` on the submit path), and the ARRIVAL'S OWN `decisionRequest` — which the selection requires whenever the arrival parked at a gate and fails loud without it. A decision routing back to a gate is exactly that case (dimension 10's re-park cell), so the submit handler threads it or that cell throws. The arrival is CALLED, never re-implemented — its signature is `applyTargetEntryEffects(deps, instance, template, from, target, arriving, issuedAgentConfig)` and it returns the CLOSED, BRANDED effect record the store's transition input nests; the brand's only sanctioned producer is the arrival, so a handler cannot hand-build a substitute and cannot swap one member. RESTATED HERE rather than delegated to the sibling packet, because the handover rule makes this build read this file alone. WHAT EACH HANDLER SUPPLIES, and this is where a build goes wrong invisibly: `from` is `{ stepId: the PARKED position, edgeKey: the DECISION KEY (submit) or the EVENT TYPE (resume) }` — the edge key is the selector's own key, which is what `advancesRound` is keyed by for all three edge classes since ch14-P1 expanded them into ONE per-step map; `arriving` carries the SUBMITTED PAYLOAD on the decision path (so a re-park's `context_ref` records the decision's payload — C13's stated widening of the model's transition-only `payload_of_transition_into`) and carries NOTHING on the resume path (a resume event has no payload at this level, C18's named Absent); `issuedAgentConfig` IS SUPPLIED AND HAS NO COMMITTED SINK ON EITHER OPERATOR PATH, and stating that is the point of this clause. The arrival's effect record REQUIRES the member, so both handlers must pass one; but the store writes `issued_agent_config` only on a TRANSITION row, and C22 puts it ABSENT BY CLASS on both classes this packet adds — which Q2 restates from the other side. So a wrongly-resolved value writes NO byte difference anywhere on these two paths, and a lane reaching for the committed row to catch it is reaching for an observable that does not exist. WHAT IS DECIDED: both handlers supply the config resolved from the step being LEFT — the GATE or the WAIT step — which is what HANDLE does from the agent step it leaves, and never from the target. WHAT IT COSTS: on these paths that supply writes NO COMMITTED BYTE, so the honest carrier is not the transcript — but it is not a bare type assertion either, and the distinction decides whether the lane can fail. A TYPE-LEVEL assertion ALONE would green on the wrong build, because BOTH resolutions produce an `AgentConfig` and the compiler cannot tell them apart. The carrier is therefore the STORE-PORT SEAM: family 1 captures the branded effect record the handler hands the port and reads the config member off it — a runtime value, observed at the last point before it is dropped. That is what makes a from-the-target build RED. A gate resolves to whatever the role's `defaultAgentConfig` and the instance's run overrides give it, since C2 REFUSES `agentConfig` on the `humanGate` keyset — so a fixture separating left-from-target must differ at the ROLE layer, which is where family 1 stages it. THE RECOMMENDATION'S FIRST ABSENCE BRANCH BECOMES REACHABLE HERE and needs no new code: the arrival reads `recommends` only when the SOURCE step is an agent step, and a gate or wait source structurally is not, so a decision- or resume-routed arrival into another gate parks with no recommendation and no source. Dimension 16 drives it; the code for it already exists and this row's obligation is to prove it rather than to write it. **THIS ROW IS THE `decisions-carry-no-lifecycle-meaning` INVARIANT'S HOME, disposition REVIEW**, and it also carries the OWN-PROPERTY OBLIGATION for every authored-key index this packet adds — the submit's `decisions[verdict]`, the resume's `onResume[type]`, and the two replay lookups Q11 opens — each going through the kernel's live guarding idiom, because the id grammar admits prototype member names and an unguarded index answers `constructor` with an inherited member instead of `unknown_decision`. THE FOUR INDEXES DO NOT SHARE ONE LANE, named because a build that guards the verdict index and hand-rolls the other three is otherwise green: family 6 drives the submit's `decisions[verdict]` with a hostile verdict key; family 8 drives the resume's `onResume[type]` with a template declaring a prototype member name among its `resumeEvents` and no matching `onResume` entry — reachable because the correlate rung only requires membership in that AUTHORED list, so an unguarded index answers with an inherited member instead of `no_resume_transition`; and family 11's corrupt-history negative lanes use a prototype member name as one of their non-resolving keys, which covers Q11's two replay lookups. AND THE REVIEW DISPOSITION HAS A NAMED SUBJECT RATHER THAN A MOOD: every branch the arrival takes from a decision-routed entry is selected by the TARGET's class, and the review asks of the built code whether any branch anywhere downstream of the ChoicePoint selection reads the KEY. Family 1's cross-path lanes are its evidence — the same target class entered from all three paths must produce the same effect record — and a build that branched on a key name would differ on exactly those lanes |
| Q2 | **The two op-carrying entry classes and the store write member they force — DECIDED HERE (flag 1).** Anchor for what IS anchored: `contract:ch14-human-decision#C22` fixes both FIELD LISTS, the op consumption and the absence-by-class, and explicitly leaves "whether the two op-carrying rows realize as fact-kind growth or new variants" to this packet. DECIDED: **new union variants**, never `LifecycleFactKind` growth. GROUND, and it is structural rather than aesthetic: a `LifecycleFactEntry` carries EXACTLY `{entryKind, seq, opId, committedAt}` and nothing else, because a lifecycle fact IS its op-consumption record; DECISION_MADE carries five more fields (`decision`, `payload?`, `by`, `request_ref`, `override?`) and WAIT_RESUMED two (`kind`, `event`), so growing the fact kind would either widen every fact row with fields three of its members can never carry, or push the fields somewhere the fact shape does not reach. THE WRITE MEMBER IS FORCED AND ITS SHAPE IS THE DECISION: `commitTransition` hard-codes `entry_kind = 'transition'` in its INSERT and takes an `EventEnvelope` it serializes into the `envelope` column, so it cannot express either class. DECIDED: ONE NEW PORT MEMBER, `commitOperatorEntry`, taking `{instanceId, expectedVersion, entry: {kind, opId, body}, arrival}` — ONE member for BOTH classes, discriminated by `entry.kind`, rather than two members or a widened `commitTransition`. Two members would duplicate the CAS + arrival-write half twice over; widening `commitTransition` would make the envelope optional and hand every existing caller a shape that can be under-filled. THE MEMBER WRITES UP TO TWO ROWS, not one, stated because the shape admits it silently: the arrival's effect record carries the human-gate park's OPTIONAL SECOND ROW, so a decision routing back to a gate commits its own op-carrying row AND a fresh DECISION_REQUEST in the SAME transaction — exactly as the transition member already does. It also reproduces the IN-TRANSACTION idempotency re-check both existing commit members carry; the pre-check is a fast path and the transaction stays the correctness mechanism (REV-A1-TXN). The body rides `entry_body` as canonical JSON with the model's SNAKE keys — the SAME store casing seam the `wait` column and p2a's DECISION_REQUEST body already follow, so this row adds a THIRD user of one rule and no new rule. THE COLUMN IFF GROWS BY TWO CLASSES, both directions, restated here because the build must extend the live mapper rather than infer it: on a DECISION_MADE or WAIT_RESUMED row `op_id` is PRESENT and `entry_body` is NON-NULL, while `envelope`, `payload_digest`, `gate_decisions` and `issued_agent_config` are ALL NULL. The class-conditional `op_id` check p2a moved into the mapper already covers both by class (they are op-carrying). THE `entry_body` HALF IS DIFFERENT AND MUST BE RE-BASED RATHER THAN EXTENDED, stated because the two halves' status differs and a build reading only the first sentence gets it wrong: the mapper's single `opLess` predicate today governs BOTH "carries no op id" and "carries a body", and after this packet those are DIFFERENT partitions — the two new classes carry an op id AND a body. The predicate splits in two, and the name `opLess` stops covering the body rule. Family 5 drives the new columns' iff in both directions and reds on a build that leaves one predicate serving both. NO SCHEMA CHANGE: p2a's bump was ONE fence for the whole chapter and its own row says `entry_body` and the nullable `op_id` serve these two classes — a second DDL change at this packet would falsify that, and family 5 asserts `SCHEMA_VERSION` byte-unchanged |
| Q3 | **`admit_input`, and the OPENING of the kernel's shared admission ladder — DECIDED HERE (flag 6).** Anchor: `contract:ch14-human-decision#C9` (the load, the lazy per-rung evaluation, the infallible rung-local reads), `contract:ch14-human-decision#C15` and `contract:ch14-human-decision#C18` (the two rung ORDERS, which are contract), and `prose:v3/model/units/l0d-pseudocode/admit_loaded.txt` (the ladder's own parameterization rule). **WHY THIS IS A DECISION AND NOT A PROJECTION**, stated because the model reads the other way: the model declares ONE parameterized ladder and names `admit_input` as its load-first companion, so following the model is what this row does — but the TREE already forked the protocol once, at ch12-p1b, minting `admitLifecycle` beside `admitLoaded` rather than parameterizing either. That fork is the nearest REALIZED precedent and it points opposite. Refusing a third fork is therefore choosing the model over a live precedent, on a function the PRODUCTION ACTOR PATH rides — which is exactly the shape flag 7 puts in front of the ratifier for a lighter surface, and it would be inconsistent to flag that one and not this. **IT IS ONE LADDER, PARAMETERIZED — NOT A NEW ONE, and the model says so in the text this packet quotes.** `admit_loaded`'s own header reads *"expect.* parameterizes the rungs per entry path; an absent expectation skips its rung"*, declares `correlate` as a rung ALREADY, and names the companion outright: *"The load-first companion (admit_input: load → unknown_instance → admit_loaded) arrives with the L3-born operator ops"*. The quoted `admit_input` unit calls `admit_loaded(instance, expect, input)`. So `admitInput` LOADS (`null` ⇒ `unknown_instance`) and DELEGATES to the EXISTING `admitLoaded`, whose expectation set OPENS; the alternative of a third ladder beside `admitLoaded` and `admitLifecycle` is REFUSED here, because it forks the kernel's admission protocol three ways where the model has one and where the ORDER is the only thing contract fixes. **THE OPENING IS FOUR EXPECTATION DIMENSIONS, A UNION GROWTH, AND A CALL-SHAPE CONSTRAINT, enumerated because an unenumerated blast radius is what makes a shared-surface change look cheap.** The live ladder is not parameterized today: its STATE rung is hard-coded to `kernelStatus !== "ACTIVE"` with the fixed name `not_active`, and its AUTHORITY rung is mandatory and two-step with the actor-specific names `missing_role` / `role_not_authorized` — so an ABSENT authority expectation currently MEANS `missing_role` rather than "skip". The four: (i) the STATE rung takes a caller-supplied predicate WITH its own reject name (`not_awaiting_decision` / `not_waiting`); (ii) a `correlate` expectation lands BETWEEN state and version, the position C15 and C18 both fix and the model already declares; (iii) the AUTHORITY rung becomes SKIPPABLE — absent on the resume path by C18 — and carries per-path names, `operator_not_authorized` on BOTH branches for the decision path; (iv) the idempotency MODE Q15 owns. AND `AdmitResult`'s rejected-reason union — closed at five names today — grows by `not_awaiting_decision`, `not_waiting`, `decision_request_mismatch`, `resume_event_mismatch`, `operator_not_authorized` — and by `unknown_instance` too UNLESS the load's answer is carried outside the ladder's result, which is a shape this row deliberately leaves to the build: the model puts the load in `admit_input` and the rejection in its return, so a build either widens the shared union by six or gives `admitInput` its own wider result. Five or six is a build choice; that the union grows on a type every path shares is not. **AND THE LADDER STAYS SYNCHRONOUS — the CALL-SHAPE CONSTRAINT of this row's three named groups, and the only item of the six that would move the actor path's SIGNATURE rather than its behaviour.** `admitLoaded` is a synchronous function today; `DefinitionStore.load` returns a Promise. An awaited load placed INSIDE the authority rung would make the shared ladder `async`, which changes the signature the production actor path and every lifecycle rider call — a wider blast radius than all four dimensions above combined, and one no C-row asks for. DECIDED: the rung reads a value ALREADY RESOLVED before the ladder is called, exactly as HANDLE does today — `kernel.ts` loads the pinned template first and hands the rung its `grantedRole` pre-resolved. **AND THE MODEL'S TWO TEXTS DISAGREE HERE, WITH THE OLDER ONE DECIDING IT** — stated because the opposite framing would ask the ratifier to approve a departure that is not one: the l3 `SUBMIT_DECISION` block's rung comment sites the pinned-template load AT the authority rung, while `l0d-pseudocode/admit_loaded.txt` — this row's own quoted anchor — lists *"the template/definition load (callers load it where they always did — no semantic move intended in this pass)"* among the things that are NOT rungs. The hoist FOLLOWS l0d. What is decided here is that the l3 comment's siting does not override it, and that an async ladder is out of scope. **THE CALLER THAT RESOLVES IS `admitInput`, NOT THE HANDLER** — the template ref lives on the instance `admitInput` loads, so the handler cannot pre-resolve it the way HANDLE does. The REALIZATION NOTE below the operative fences carries that shape whole and is where it is stated ONCE: the ports, the conditional load, `admitInput`'s own expectation type, the authority GROUP that replaces HANDLE's flat pair, and the two accepted arms. **AND THE LADDER'S ARITY STAYS TWO**: the model's third `input` argument realizes as expectation membership, because a third parameter is the same class of unasked-for signature change as an async one. **THE GUARD IS A TYPE-LEVEL ARITY PIN, NOT A13**, and this row is its home rather than a flag, because a build reads here: `Function.prototype.length` stops at the first parameter carrying a DEFAULT VALUE or a rest — NOT at the first optional one — so the two shapes a build reaches for behave differently and only one of them is caught: a bare `admitLoaded(instance, expect, input?)` emits a plain third parameter, `.length` is 3, and A13 REDS; but `admitLoaded(instance, expect, input = undefined)` keeps `.length === 2` and PASSES. The obvious replacement is worse — a `const` of the two-parameter FUNCTION type is blind to BOTH, since assignability accepts a source whose extra parameters are optional. What REDS on both is the arity read as a TYPE: `Parameters<typeof admitLoaded>["length"]` bound to the literal `2`, which either third widens to `2 | 3`. The three were measured separately and in the right register — the `.length` behaviour by RUNNING it, the two type pins under this tree's `tsc --strict` — because `.length` is a runtime fact a typechecker says nothing about. SO THE RUNGS' READS STAY INFALLIBLE AND SYNCHRONOUS BOTH, and a build that reaches for `await` inside a rung has left the shape this row decided, not made a build choice. THE ACTOR PATH'S NON-MOVEMENT IS THEREFORE AN ASSERTION, NOT A CONSEQUENCE OF THE SHAPE: family 2 drives HANDLE's every rung outcome byte-unmoved across the opening, and the earlier form of this row rested that claim on "HANDLE passes neither", which stops being true the moment the state and authority rungs take parameters at all. THE RUNGS, in order, with what each reads: **idempotency** — Q15's compare; **state** — a caller-supplied predicate over the loaded instance (`WAITING ∧ wait.kind = human_decision` ⇒ `not_awaiting_decision`; `WAITING` ⇒ `not_waiting`), and unlike the LIFECYCLE ladder's unnamed bare-REQUIRE this rung's failure is a NAMED REJECTION, because C19 gives both names; **correlate** — the rung's first arrival AS A LADDER EXPECTATION — the anchor's own wording, kept, with the delta named: two kernel-event handlers already run correlation checks INLINE, so what is new here is the rung in the ladder rather than correlation in the kernel (`wait.request_ref = the intent's` ⇒ `decision_request_mismatch`; `event.type ∈ wait.resume_events` ⇒ `resume_event_mismatch`), and ch11-P1's stale doc-comment saying the correlate rung "arrives with kernel events" is CORRECTED in the same edit — a named duty, because a comment describing an absent rung is how the next reader concludes it is still absent — AND SO IS ITS TEST-SIDE TWIN, `admission.test.ts`'s A13 lane, whose TITLE carries the same stale reason ("the correlate rung's parameter is omitted entirely"): after this packet the lane's assertion stays true and its title becomes false, and nothing else catches that; **version** — ABSENT ⇒ `missing_version` (the F-W4-2 canonicalization, on BOTH paths), mismatch ⇒ `Stale`; **authority** — present on the decision path ONLY (`by` vs `binding[gate.role]`, missing AND mismatch both `operator_not_authorized`, the L1 both-branches house style), and ABSENT on the resume path, which is C18's contract and not an omission. THE READS AT THE RUNGS ARE THE INFALLIBLE CLASS C9 NAMES — the loaded instance, its pinned template, step positions — and this row states the CONSEQUENCE rather than the permission: if a build finds itself adding a reject or assert branch to a rung-local read, that is a NEW FINDING and a STOP. THE PENDING-REQUEST READ IS NOT A RUNG READ and is not covered by that rule: it runs AFTER admission, in the key-scoped guard phase, and Q4 owns it |
| Q15 | **The idempotency compare's MODE and its kind domain — DECIDED HERE (flag 2).** Anchor for what IS anchored: `contract:ch14-human-decision#C15` names "the realized compare's kind parameter widens from the lifecycle-fact domain to the entry-kind domain — the owning packet's named seam". The seam is named and DECIDED here, on the ONE ladder Q3 keeps. The live `admitLoaded` compares DIGEST over a transition row; the live `admitLifecycle` compares KIND over a fact row. The operator intents need the KIND compare — C15 is explicit that "the digest compare stays transition-only" — so the opened ladder takes an idempotency MODE: the actor path keeps the digest compare, the operator paths take the kind compare, and the mode is the caller's, not inferred from the row found. DECIDED, AND AMENDED BY THE RATIFIER AT THIS APPROVE: the kind parameter's TYPE is `Exclude<TranscriptEntry["entryKind"], "transition">` — the union's own discriminant MINUS the one value that must never reach this compare. The row's earlier form took the bare discriminant and accepted a cost; the amendment removes the cost instead of guarding it, and the reasoning is recorded here because it is the ratifier's, not this packet's. **IT KEEPS THE AUTO-EXTENSION PROPERTY**, which was the whole argument for the bare discriminant: a SUBTRACTION still grows with the union, so a future entry class needs no edit here and there is no hand-maintained list anyone can forget to extend. **AND IT MAKES THE DANGEROUS VALUE UNREPRESENTABLE** rather than merely undriven: `"transition"` as a compare kind would bypass the digest half the actor path's duplicate detection depends on, and under the bare discriminant NOTHING in the type prevented it — one test lane did. Under the exclusion the compiler refuses it at every call site. **IT ALSO STATES C15's OWN LETTER AS A TYPE**: the contract says the digest compare stays transition-only, and the exclusion is that sentence expressed where it cannot drift. THE PATTERN HAS PRIOR ART IN THE TREE, cited by the ratifier and verified here: `domain/outcome.ts` types one rejected arm as `Exclude<RejectionName, "gate_blocked">` for exactly this purpose. IF A FUTURE ROW CLASS EVER NEEDS DIGEST MODE, that is a CONTRACT change and the type moves with its ratification — it is not a build's to widen. FAMILY 3'S LANE STAYS, with its role changed: it no longer carries the guard alone but asserts the RUNTIME behaviour the type cannot reach — that an operator intent whose op id was consumed by a TRANSITION row draws `op_id_collision` and never `Duplicate`. THE STORE'S OWN LOOKUP MUST OPEN WITH IT, and this is the half a compiler cannot enumerate: `findOp` carries a RUNTIME WHITELIST — it REJECTS any `entry_kind` that is neither `transition` nor a `LIFECYCLE_FACT_KINDS` member — so after this packet a replay of a decision would make the lookup THROW where the rung needs the row returned. The comparison is over a SQL `string`, so `pnpm v3:typecheck` enumerates nothing; it is one of SEVERAL raw-string `entry_kind` narrowing sites in the store — the mapper's class iff, `commitTransition`'s hard-coded INSERT, and the IN-TRANSACTION idempotency re-checks both commit members already carry — and the count is deliberately not fixed here, because the set is read from the file at build rather than transcribed. THREE OF THEM BIND THIS PACKET DIRECTLY: this lookup, the mapper's class iff (whose `opLess` predicate Q2 splits), and the in-transaction re-check `commitOperatorEntry` must reproduce in its siblings' shape. Its reciprocal binds too: an ACTOR envelope reusing an op id consumed by a DECISION_MADE row must answer `op_id_collision` rather than throwing. THE OP-LESS CLASS'S CELL is decided explicitly: a DECISION_REQUEST row carries NO `op_id`, so the lookup cannot return it (an `op_id = ?` lookup never matches a NULL row — measured on the live driver at p2a, receipt PROBE-CH14P2A-1). The rung never sees that class, and family 3 asserts the absence rather than assuming it |
| Q4 | **The pending DECISION_REQUEST read — DECIDED HERE (flag 3).** No C-row decides it. C16 defines `against` over "a recommendation RECORDED on the pending request", and the model reads `pending_decision_request(instance)`; p2a's K20 decided the ASK's derivation takes the request as a PARAMETER, on the ground that a POST-commit transcript scan would add a second awaited fallible boundary after the commit. That ground does NOT transfer: the override guard runs PRE-commit, in the key-scoped guard phase that runs AFTER the ladder and BEFORE the commit, where a store read is ordinary — Q3 states why C9's infallible-rung-read rule does not reach it, and the phase is named that way rather than as "the admission phase" precisely so an awaited read is never read as sitting under that rule. DECIDED: the submit path READS the pending request from committed state through the store's EXISTING timeline read, selecting the DECISION_REQUEST row whose `request_ref` equals the wait's — no new store member. THREE ALTERNATIVES, with their rejection grounds: (a) a NEW targeted store member `findDecisionRequest(instanceId, requestRef)` — rejected as a port widening bought for ONE caller, where the existing read already answers. ITS COST IS STATED HONESTLY rather than minimised: the timeline read returns the transcript from a cursor, so the scan is O(transcript), not O(parks) — acceptable at this basis because a run's transcript is bounded by its own committed ops, and named here so a later chapter measuring it finds the claim rather than a surprise; (b) DENORMALISING the recommendation onto the WAIT record — rejected because it would put the same value in two committed places with no mechanism keeping them equal, and C14 closes the wait record's field list, so it would also be a contract edit; (c) threading it from the ARRIVAL, the K20 shape — rejected because it is STRUCTURALLY IMPOSSIBLE here: the arrival that wrote the request ran in a DIFFERENT PROCESS-LIFETIME commit, and the submit's only inbound state is its wire intent. WHAT THE DECISION COSTS, stated: the read is a fallible boundary in the key-scoped guard phase, so its failure mode is named — a WAITING(`human_decision`) instance whose correlation rung passed but whose DECISION_REQUEST row is absent is CORRUPT COMMITTED HISTORY and a fail-loud kernel-integrity throw, never a rejection, because the correlation rung already proved the wait cites that ref. Family 4 drives both directions |
| Q5 | **The override rule and DECISION_MADE's record.** Anchor: `contract:ch14-human-decision#C16`. `against` := a recommendation is RECORDED on the pending request AND `verdict` ≠ it. `against ∧ ¬override` ⇒ `override_required`; `¬against ∧ override` ⇒ `override_not_applicable` — and the SECOND has TWO distinct causes (no recommendation recorded; agreement with the one recorded) which family 6 drives separately, because they reach one name from different states and a build handling only the agreement case passes half the lane. **THE REQUIRED-FIELD READER IS SHARED, NOT RE-WRITTEN**, and this clause exists because the no-sibling-handover rule would otherwise drop it: the payload-spec filter already ships as its own exported function beside the Ask, minted at p2a for exactly this reason — the Ask's `decision_requirements` and this guard must read ONE function, or C20's self-containment guarantee ("everything the submit path will guard is in the operator's hand") becomes two implementations agreeing by luck. The submit guard CALLS it. Its filter is `required === true`, never truthiness, and its index over the authored spec map is own-property guarded — a hand-rolled loop reproduces neither for free. Family 6 cross-asserts the Ask's `decisionRequirements` against the guard's own answer on one fixture, which is the only lane that can see the two diverge. The guards run AFTER the key-scoped guards, so by the time they bind the verdict is known-declared and its required payload present — an unknown verdict NEVER reaches them, which is a combination lane and not an ordering note. DECISION_MADE's field list, CLOSED: `{ op_id, decision, payload?, by, request_ref, override? }`. THE WIRE'S `verdict` RECORDS AS THE ENTRY'S `decision` — the model's own two spellings, stated once here so the seam cannot fork, and UNRELATED to `GateDecision.verdict`'s `allow|warn|block` domain, which is named against conflation rather than left to a reader's care. `override` is recorded `true` IFF `against` and ABSENT otherwise — never `false`, which dimension 8 drives: an explicit `false` would make the audit surface answer "declined to override" where the contract says there was nothing to override. This row is the `override-is-explicit-and-recorded` invariant's home, disposition TEST, and CO-HOMES `a-decision-carries-its-required-payload` with Q6 — the GUARD is here, beside the shared reader it runs on; its DELIVERY point is there. Stated on both sides, because a co-home named at only one of them leaves a reader arriving at the other with no home declaration for it |
| Q6 | **Round and context on a decision commit — DERIVED.** Anchor: `contract:ch14-human-decision#C17`. Advancement is keyed on the ADMITTED `advancesRound` of the (gate → target) edge — NEVER on a verdict name — and the arrival already consumes exactly that flag off the SOURCE step's per-edge map, so this row's realization is Q1's `from.edgeKey` being the DECISION KEY and nothing further. `clear_stale_decision_context` IS REALIZED AS A NAMED FUNCTION, not as an absence, and the reason is that the unit carrying its call is declared `implement`: a live call in an implemented unit gets a witness, or the unit is not realized. WHAT THE FUNCTION DOES TODAY IS NOTHING, and that is stated IN it rather than inferred: the realized instance record holds no review or approval context — the `wait` is cleared by the arrival's own branch, and the context a dispatch carries is assembled per-dispatch from the pinned template plus the THREADED handoff, never read from stored state. So the function is vacuous at this basis, named, called on the advancing branch, and carrying its own emptiness as a comment — the tree's own idiom for a rule that is reached for a reason its current body does not show. THE DELIVERY IS THE OPERATIVE HALF, and the mechanism is NOT the arrival: `arriving` reaches only the arrival, where the gate branch consumes it as `context_ref`. The dispatch handoff is a SEPARATE parameter of the post-commit selection, which HANDLE supplies from its envelope's payload. SO THE SUBMIT HANDLER SUPPLIES `decision.payload` AS THE HANDOFF and the resume handler supplies nothing, and a build that threads the payload only into `arriving` dispatches with an empty handoff. THE SECOND DISPATCH PRODUCER IS NAMED, because the kernel's is not the only one: the runner's delivery loop re-derives a dispatch from committed state and takes its handoff from `lastHandoff`, which scans for the LAST TRANSITION row's payload. After a rework decision that scan returns the PRE-GATE transition's payload, not the operator's instruction — so the loop's scan opens to the DECISION_MADE class, and family 7 drives the runner's leg as well as the kernel's. THE PROOF BOUNDARY IS STATED rather than the claim widened: this packet proves that the rework target's first dispatch carries the submitted payload FROM BOTH PRODUCERS and that no stale value survives into it; it CANNOT prove that no future stored decision context will need clearing, and the row does not claim to. This row is the `a-loop-back-resumes-clean` invariant's home, disposition TEST, and co-homes `a-decision-carries-its-required-payload` with Q5 |
| Q7 | **RESUME_WAIT's shape guard and WAIT_RESUMED.** Anchor: `contract:ch14-human-decision#C18`. AFTER admission — the order is contract — the guard is TOTAL over the position read: a current step that is not a bare `wait` step ⇒ `not_bare_wait`. THE GUARD'S INHABITANTS ARE TWO, NOT THREE, and the third is named as UNREACHABLE rather than dropped: an ACTIVE run at an agent step fails the STATE rung (`WAITING`, else `not_waiting`) and never reaches this guard at all, so a lane claiming it here would silently re-label a state-rung lane. The two reachable ones are a run parked at a `humanGate` — a decision wait resumes ONLY via SUBMIT_DECISION — and the KERNEL-OWNED `kickoff_pending` hold, which carries NO current step (the position is null until ACTIVE) and so is not a bare wait step. EACH CARRIES ITS OWN EARLIER-RUNG CONDITION, because both are reachable only on a matching event: the gate inhabitant needs an event that IS one of its decision keys (any other draws `resume_event_mismatch` at the correlation rung, the rung order's designed outcome, since a decision wait's `resume_events` ARE its decision keys), and the hold inhabitant needs `KICKOFF` (its declared resume event) for the same reason. Then `onResume[type]` absent ⇒ `no_resume_transition`, REACHABLE BY DESIGN because C3 admits a partial or empty `onResume`; family 8 drives it from an admitted template rather than from a hand-built one, so the lane proves the admission surface really permits the shape. WAIT_RESUMED's field list, CLOSED: `{ op_id, kind, event }` — `kind` is the WAIT's kind read off the instance record, not the step's declaration, which are equal by the correspondence checker and would diverge silently in a corrupt history. This row is the `a-parked-wait-resumes-only-on-a-matching-event` invariant's home, disposition TEST |
| Q8 | **COMPLETE's precondition, WIDENED — and the guard that keeps the widening honest.** Anchor: `contract:ch14-human-decision#C11`. The unit's REQUIRE widens from ACTIVE-only to NON-TERMINAL: a resumed decision or wait arrival may complete. In the realized tree this precondition has NO current carrier — p2a's arrival writes `TERMINAL`/`done` in its terminal branch with no guard, because at p2a every arrival came from an ACTIVE `HANDLE` commit and the state rung had already refused everything else. This packet makes a NON-ACTIVE arrival reachable for the first time, so the WIDENED PRECONDITION acquires its inhabitant here: a run completing from a resumed WAITING arrival rather than from an ACTIVE actor transition. **ITS GUARD DOES NOT, AND THAT IS STATED RATHER THAN DRESSED AS A DRIVEN LANE.** Every entry path's STATE rung refuses a TERMINAL instance before the arrival runs — HANDLE requires ACTIVE, the submit requires WAITING(`human_decision`), the resume requires WAITING — so no routed entry can present an already-TERMINAL instance to the arrival. The double-completion assert is therefore a DEFENSIVE INTEGRITY BAR over a state the ladder already forecloses, fail-loud and never a registry rejection (C19's surface is closed), and its lane is a DIRECT UNIT CALL on the arrival, not an entry-path lane. THE 'COMMITTED STATE UNMOVED' ASSERTION IS WITHDRAWN WITH IT: the arrival touches no store, so on a direct call there is no committed state to assert, and claiming that lane would be the same silent re-labelling Q7 refuses one row above. REACHABILITY IS THE ROW'S OWN OBLIGATION: a decision whose target is terminal, and a resume whose `onResume` target is terminal, are BOTH driven — the second is the chapter's anchor realization (`commit_pending ⇐ [COMMIT] → done`) and the first is what makes "approve can target done" more than a sentence |
| Q9 | **The wire keysets, RECEIVE's two new routes, and the class separation that makes the operator intent a distinct TYPE — DERIVED.** DERIVATION, stated because the row goes past both anchors: C9 declares each keyset CLOSED and lists its members, and C15 fixes the class separation as a PROPERTY without saying what realizes it — while this row ADDS `intent` to both closed keysets and SETTLES where the discriminator lives. Neither is a free choice, which is why the row carries no flag: the live ingress reads the discriminator out of the record and then closes the keyset over every own property, so a keyset authored without `intent` makes every well-formed intent draw `unknown_key`; and the same ingress STRIPS `intent` before calling the kernel, so a discriminator living only on the wire leaves no typed parameter for a compile-negative to bind to. Both follow from the measured wire, not from preference. Anchor: `contract:ch14-human-decision#C9`. Both intents enter through the operator-intent source class beside START/KICKOFF/CANCEL. C9 states the keysets in the MODEL's snake spelling and this row adds the projection C9 delegates — the route onto the live wire, which is where a build otherwise guesses: THE REALIZED KEYS ARE camelCase (`instanceId`, `opId`, `expectedVersion`, `requestRef`, `verdict`, `override?`, `payload?`, `by`; and `instanceId`, `opId`, `expectedVersion`, `type`), the ch12-C13 rename culture every existing intent keyset already follows; and EACH KEYSET ADDITIONALLY CARRIES `intent`, because the live ingress reads the discriminator out of the record itself and then closes the keyset over every own property — a keyset authored without it makes EVERY well-formed intent draw `unknown_key`. The two intent-kind TOKENS join the existing kind set; their spelling is a build choice (flag 8). An unknown or malformed wire key draws the ingress's standing `invalid_shape` — no new name. THE KEYSET GOVERNS MEMBERSHIP, NOT PRESENCE, which is this row's sharpest obligation because the live ingress already mixes the two for other intents: an ABSENT `expectedVersion` must REACH the version rung's `missing_version`, and an ABSENT `by` must REACH the authority rung's `operator_not_authorized` — so neither may be an ingress required-string lane, and family 10 drives both by asserting the KERNEL's name at the far end. `payload` is canonicalizable-when-present (it is stored); `override` is form-when-present; `expectedVersion` is Q19's. **THIS ROW IS THE `decision-is-operator-intent-not-actor-envelope` INVARIANT'S HOME, disposition TYPE/SCHEMA, and the disposition is realized by a NOMINAL discriminator rather than by shape.** C15 fixes the type half as the CLASS SEPARATION — a shape no envelope type is assignable to — and SHAPE ALONE DOES NOT DELIVER IT: an `EventEnvelope` is structurally assignable to a `{ instanceId, opId, expectedVersion?, type }` resume intent, because excess-property checking binds only fresh object literals. The `intent` key is what closes it: a REQUIRED literal-typed member (`intent: "submit-decision"` / `intent: "resume-wait"`) that no envelope carries and no envelope type can satisfy. **ITS HOME IS NAMED, because the wire alone cannot carry the disposition:** the live ingress STRIPS `intent` before calling the kernel — every existing intent reaches its handler as a bare input record — so a discriminator that lived only on the raw wire would have no typed parameter for a compile-negative to bind to. DECIDED: the literal member rides the KERNEL-SIDE INPUT TYPE of each new handler, which is a deliberate departure from the four existing intent inputs' shape and is stated as one: those four are mutually distinguishable by their own required fields, while these two must be distinguishable from an ACTOR ENVELOPE, which the existing shapes are not. `RECEIVE`'s source routing stays the runtime carrier. Family 17 drives it as a COMPILE-NEGATIVE against that named type. THE DISPOSITION HAS A SECOND HALF and it is carried, not dropped: C15 splits the invariant into the class separation ABOVE and a five-guard body — wait-kind, correlation, authority, op_id, CAS — which realizes as the two ladders' RUNG TESTS. Those are family 2's, and this row names them as this invariant's second carrier so the disposition is not read as satisfied by the type alone |
| Q10 | **The read surfaces the two classes reach, and the bundle's two more row shapes — DECIDED HERE (flag 4).** Anchor: `contract:ch14-human-decision#C21` for the floor. `getTimeline` returns both new classes with their kind VISIBLE — FORCED by the union growth rather than chosen, and the floor's own module needs no code change (its timeline read is a verbatim pass-through), which is ASSERTED rather than assumed. The DEBUG BUNDLE is the projection, and it is what this row decides: the live `BundleFactRow` requires a `LifecycleFactKind` and carries exactly `{seq, entryKind, opId, committedAt}`, which neither class satisfies — so a shape is forced, and the CONTENT is the decision. DECIDED: TWO new discriminated row shapes rather than one widened fact row, on the same ground Q2 gives for the union, and their SANITIZED field sets are: DECISION_MADE ⇒ `{ seq, entryKind, opId, decision, by, requestRef, override?, committedAt }` PLUS a `hasPayload` PRESENCE BIT and NOT the payload itself; WAIT_RESUMED ⇒ `{ seq, entryKind, opId, kind, event, committedAt }` whole, because every one of its fields is a kernel-minted or admitted id-grammar token. THE PAYLOAD OMISSION FOLLOWS p2a's K16 EXACTLY, and the reason it is not re-decided is that the seam has not moved: the redaction seam's only DECIDING member takes an ENVELOPE, which an envelope-less row cannot supply, so no policy can be consulted and the value is omitted UNIFORMLY under both shipped policies. The presence bit is not decoration — it is what separates "omitted by policy" from "never carried one", the same rule the envelope row and p2a's third shape already follow. `by` and `decision` are carried: `decision` is an admitted decision key, and `by` is the SAME operator-authored actor-id class p2a's K19 already classified as untrusted-but-carried on the Ask. The bundle-policy widening question stays where p2a routed it |
| Q11 | **The blind replay readers, CLOSED — the three markers p2a left, and a fourth blind on a different axis — DERIVED.** DERIVATION, stated because two of the four readers lie OUTSIDE the anchors: C14 delegates the two TESTKIT checkers' dispositions and C22 the op-uniqueness delta, but the PRODUCTION policy view appears in no C-row, and the fourth reader is this packet's own finding. Both are derived from the same fact this packet CREATES — the first commit that writes two rows — and neither is a free choice, which is why they ride this row rather than a flag: a reader left blind on a reachable arrival is a defect, not an option. Anchor: `contract:ch14-human-decision#C14` (which names TWO testkit replay checkers — the anchor's count, not this row's; the fourth reader below is outside it and is this packet's own finding) and `contract:ch14-human-decision#C22`. p2a left `DEFERRED(ch14-p2b)` markers beside THREE readers that advance position on TRANSITION rows only — `testkit/storeCheckers.ts`'s terminal-sink walk and round reconstruction, and `kernel/gateProjection.ts`'s policy view, which is PRODUCTION. This packet creates the arrivals that make the blindness reachable, so it closes all three: the walk advances on a DECISION_MADE row through `steps[position].decisions[entry.decision].target` and on a WAIT_RESUMED row through `steps[position].onResume[entry.event]`, each own-property guarded (→[own-property-indexes]) exactly as the arrival's own indexes are. THE ROUND WALK GAINS THE SAME EDGES for `advancesRound`, keyed by the DECISION KEY and the EVENT TYPE, which is the single per-step map ch14-P1 expanded all three edge classes into. THE PRODUCTION INHABITANT IS THE ONE THAT MATTERS: before this fix, any gated workflow crossing a `humanGate` would resume its policy view from the PRE-GATE position and throw on the next transition row — p2a named it, and family 11 drives it with a gated template that crosses a gate and then commits a gated transition, which is the only shape that reds on the un-fixed reader. **A FOURTH READER IS BLIND ON A DIFFERENT AXIS, and it is the one that makes the golden trace FAIL rather than merely under-report.** The version-arithmetic checker computes `1 + detail.transcript.length + failCommits` — a count of ROWS, corrected upward for the row-LESS commits it already knows about — which holds while every commit writes exactly one row, and the human-gate park writes TWO in ONE commit. The tree already knows the shape from the other side: the l0d trace deliberately does NOT run the checker kit, saying so in place, because a row-LESS commit breaks the same arithmetic. p2a opened the two-row park and never met this, because no p2a trace parks; the `l3` fixture is its FIRST inhabitant — exactly the reachability argument the three position-blind readers ride, which is why it closes with them rather than later. SO THE EXPECTATION BECOMES A COUNT OF COMMITS RATHER THAN OF ROWS, derivable from the committed sequence because the park's second row is the OP-LESS class and carries no version of its own. THE TWO AXES ARE NOT ONE: the three are POSITION-blind, this one is ROW-COUNT-blind, and a closure written for the first axis alone leaves the trace red. ONE MORE READER IS NAMED, because C22 assigns its delta to this packet and no marker carries it: the op-uniqueness checker reads an op id off every non-`DECISION_REQUEST` entry, and the two new classes ARE op-carrying, so the read is correct for them by construction — the delta is that its skip list stays SCOPED to the op-less class rather than growing to "non-transition". Family 11 asserts both new classes' op ids ARE seen by it, which is the lane that reds if a build widens the skip. The markers are REMOVED in the same edit; `pnpm v3:deferred` validates marker FORM now and REMAINING markers at the chapter close, so a marker left behind is caught there while a half-discharged one is caught by nothing — which is why family 11 asserts the BEHAVIOUR and not the marker's absence |
| Q13 | **The trace harness's two new step kinds — DECIDED HERE (flag 5).** No C-row decides it: C25 fixes the `l3` trace's CONTENT, and the harness is testkit infrastructure whose shape is this packet's. The live `TraceStep` union has exactly `start` and `emit`, and `TraceSeams` carries `submit`/`create`/`start`/`store`/`template` plus the OPTIONAL `resolveEvidence` seam ch11-P3b added; none of the six drives an operator intent. DECIDED: TWO new step kinds, `submit-decision` and `resume-wait`, each carrying its own wire fields and its `expect`, and ONE new seam — the ingress's `submitIntent`, NOT the kernel's handlers. THE SEAM CHOICE IS THE DECISION AND ITS GROUND IS THE TRACE'S OWN VALUE: driving the kernel directly would leave the wire keysets (Q9) unexercised by the chapter's one end-to-end proof, and the `l3` trace is where the ingress→kernel→store→floor path is proven as a path. Driving through `submitIntent` costs a widening of `IntentOutcome` — and that is a PRODUCTION type in `ingress.ts`, not a harness one, stated correctly here because the cost lands wider than the trace: the union carries the create/start/kickoff/cancel outcomes and `invalid_shape`, none of which has a `committed` or `stale` arm, so both new handlers' outcomes widen `Ingress.submitIntent`'s return and every caller of it sees the widening — MEASURED at authoring as the two TEST callers, `ingress.test.ts` and `l0dJourney.test.ts`, both compile-SILENT, which is the property that matters, and stated as measured rather than assumed: `ingress.test.ts` is `toEqual`-shaped throughout, while `l0dJourney.test.ts` is except at its kickoff leg, which narrows on `.kind` before asserting — silent for the same reason, since a discriminant narrow survives a widened union. **THE CLI IS NOT AMONG THEM**, stated because an earlier form of this clause claimed it was: the CLI drives the lifecycle ops through `kernel.create` / `kickoff` / `cancel` directly and binds `IntentOutcome` nowhere — the same fact the closure-budget triage states from the other side when it puts `cli/cli.test.ts` in the boundary for family 13's document lane rather than for compiler ripple. The harness's typing FOLLOWS that widening rather than causing it. WHAT IS NOT TAKEN: a generic "any intent" step, rejected because its `expect` could not be typed per intent and every fixture would carry an untyped bag; and driving the SHIPPED CLI, which is P3's activation journey and a different proof (subprocess, production bindings) that this packet does not own. The harness change is a testkit CONTRACT change, which is why the sizing gate counts testkit as a surface |
| Q14 | **The `l3` golden trace.** Anchor: `contract:ch14-human-decision#C25`. The trace is CARRIED, not described: its two legs' committed-row sequences, class field sets, final transcripts and final states are in the operative material above, and the fixture template is authored there with them. This row adds the ONE thing the operative section does not carry — the CHECKER-KIT BINDING and what it buys: the harness runs the post-condition checkers on every replay, so the correspondence checker, the round reconstruction and the terminal sink all bind to ONE run, which is what makes the closure proof's falsifier mechanical rather than argued. The fixture template, both legs' row sequences, their field contents, the final transcripts and the final states are STATED THERE and are not restated here |
| Q12 | **The registry and unit-map flips this packet owns, and the untouched registry.** Anchor: `contract:ch14-human-decision#C25`, `contract:ch14-human-decision#C19`, and `prose:plan §14.5 DoD` (the flip is a NAMED duty precisely because the registry test pins key sets and not dispositions). TWO domain-registry rows flip realized — `l3/wait step + RESUME_WAIT` and `l3/DECISION_REQUEST / DECISION_MADE` — each pinned VERBATIM to its realized type name AND bound in the type table, so a renamed or vanished witness is a COMPILE error rather than a stale string; that binding is stated as a requirement here because the sibling packet's flip landed as a string with no binding and the aftermath had to add it. The second row is named with care: HALF of it existed after p2a, and a flip on half a pair is the error this row exists to avoid — it flips only now, when both members have writers. SIX unit-map rows flip, addressed FULLY QUALIFIED — a discipline this row states as a RULE rather than a count, because the bare names `COMPLETE` and `RECEIVE` each exist in several other sections and a bare-name edit would flip the wrong row. The 54-name rejection registry is asserted byte-untouched before AND after |
| Q18 | **The diagnostic classification these two handlers need, and the two classes the existing wiring drops — DECIDED HERE (flag 7).** No C-row anchors it: C19 fixes the rejection surface and says nothing about the diagnostic channel. The existing operator intents are wired through a shared wrapper that emits on exactly `duplicate`, on `rejected` with a reason, and `internal_failure` on a throw. NONE OF ITS RIDERS CARRIES A VERSION RUNG — the ladder's own comment says so — so the wrapper has never needed a `stale` arm and does not have one. THESE TWO ARE THE FIRST OPERATOR INTENTS WITH A VERSION RUNG, and both C15 and C18 specify `Stale` on a mismatch; the generic bound accepts a stale-carrying union silently, so a stale operator intent would emit NOTHING while the actor path emits `stale` WITH its `currentVersion`. **THE CAS-RESTART CLASS IS A DIFFERENT SHAPE, AND THE DIFFERENCE DECIDES THE MECHANISM.** `cas_restart` is not an outcome arm at all: `HANDLE` emits it from its OWN outer retry loop, on a sentinel, where the emitter IS the loop. The shared wrapper awaits ONE call and classifies the RESOLVED outcome — it has no loop and no sentinel, and every existing lifecycle handler carries its restart loop INSIDE the call, invisible to it. So no arm added to an outcome-inspecting wrapper can ever fire `cas_restart`, and making the wrapper the retry driver would be both the second wrapper this row refuses AND a change to every existing rider's path. DECIDED, SPLIT BY SHAPE: `stale` is delivered by OPENING the shared wrapper with one arm AND THE GENERIC BOUND THAT ARM REQUIRES — stated because "one arm" alone understates the change: the wrapper is generic over a `T` constrained to `{ kind, reason? }`, and a `kind`-narrowed generic cannot reach `currentVersion`, so the CONSTRAINT widens to admit it as an OPTIONAL member. That is a change to the wrapper's SIGNATURE and not only its body. It stays compile-silent for EVERY rider, because an added optional member moves no call site — and family 16 measures that over the rider set ENUMERATED FROM THE CALL SITES, never from a count stated here; `cas_restart` is emitted by EACH NEW HANDLER FROM ITS OWN RESTART LOOP, which is `HANDLE`'s own pattern and touches no rider. THE EXISTING RIDERS MUST NOT MOVE — and they are MORE THAN THE OPERATOR INTENTS: the wrapper is also ridden by the FAIL and runtime-context handlers, so the no-move set is the wrapper's FULL rider list, enumerated from the call sites at build rather than from this sentence. Their unions carry no `stale` arm, so the new arm is unreachable for every one of them; family 16 asserts that over the measured rider set rather than trusting the type. Attribution follows the existing shape (instanceId + opId, no payload digest — an operator intent carries no payload digest even when it carries a payload, because no digest is computed on these paths) |
| Q19 | **`expected_version` is the operator wire's FIRST numeric field — DERIVED.** Anchor: `contract:ch14-human-decision#C9` (the closed keysets, the presence boundary) and `prose:v3/src/ingress/ingress.ts` (the house ladder this row reuses). THE INTENT WIRE ALREADY CARRIES ONE NUMERIC LADDER and it is NOT the envelope's — the create intent's template-ref version is validated with `Number.isSafeInteger` and a `>= 1` floor, where the envelope's `expectedVersion` uses `Number.isInteger` and a `>= 0` floor. So the question this row answers is not "is there a validator" but WHICH of two live ladders governs a NEW numeric field on this wire. DECIDED: the ENVELOPE's, because the field IS `expectedVersion` — the same value, the same CAS semantics, checked against the same instance counter — and reusing the ladder that already governs it, with the token that already names its failure, is what keeps ONE rule where a second would drift. THE TWO LADDERS DIFFER AT BOTH ENDS, and each end is stated so the ground is not mistaken for a safety argument. AT ZERO: an instance is created at version 1 and every commit advances by one, so no legitimate expectation is ever 0 and the create wire's floor of 1 would refuse nothing real — the choice costs nothing. AT THE TOP: the envelope ladder is the WEAKER of the two, omitting the `Number.isSafeInteger` bound the create wire carries, so `Number.MAX_VALUE` passes ingress where the create wire would have refused it. That end is a REAL residual and is named rather than inherited: the value lands at the version rung, compares unequal, and answers `Stale` — a correct-enough disposition, which is why the weaker ladder is accepted rather than strengthened, and why strengthening it would be a change to the ACTOR wire and out of this packet's scope. The envelope ladder is — `typeof` number, `Number.isInteger`, `< 0`, and `-0` refused via `Object.is` because the round-trip flattens it — with its own detail token `invalid_expected_version` already in the token domain. THE LADDER AND THE TOKEN ARE REUSED VERBATIM, not re-derived: a second numeric ladder on a sibling wire is how the two drift. AND "VERBATIM" IS AN OBLIGATION WITH A COUNT, because the live ladder is INLINE in `parseEnvelope` (`v3/src/ingress/ingress.ts`) rather than an extracted helper, so reuse means copying FOUR refusal cells — `typeof` number, `Number.isInteger`, `< 0`, and `Object.is(v, -0)` — and a copy that drops the last one passes a single-lane gate block while admitting the value the round-trip flattens. DECIDED: the build EXTRACTS the four cells into one shared exported helper that BOTH wires call, which makes the reuse compile-visible and a single driving lane sufficient; absent the extraction, family 10 must drive all four cells per new numeric block, and the row states that fallback rather than leaving the choice silent. WHAT THIS ROW EXISTS TO PREVENT: without it, `expectedVersion: "3"` or `1.5` passes ingress, reaches the version rung, compares unequal to a number, and answers `Stale` — a malformed wire value classified as a stale intent, and (before Q18) with no diagnostic at all. The PRESENCE boundary is unchanged and is Q9's: form-when-present only, because an ABSENT value must reach the rung's `missing_version` |
| Q16 | **The free-text boundary, classified — DERIVED.** Anchor: `contract:ch14-human-decision#C16`, `contract:ch14-human-decision#C18` and `prose:v3/src/ports/redaction.ts` (the standing bundle redaction seam). Every free-text-capable field this packet mints is classified, because a redaction claim coexisting with an unclassified field is the recurring hole. `payload` on DECISION_MADE is UNTRUSTED — operator-authored, carried verbatim as data (C5 admits fields beyond the declared spec), stored, and OMITTED from the bundle behind Q10's presence bit; `by` is operator-authored untrusted text whose grammar nothing constrains (the create wire and the CLI take an actor id raw) — the SAME class p2a classified on the Ask's `operator`, and it is carried into the bundle deliberately, because an audit surface that hides WHO decided answers the wrong question; `op_id` is CALLER-AUTHORED UNTRUSTED TEXT and is named rather than swept into the id bucket: the wire validates it as a nonempty string and nothing else — no id grammar reaches a wire-supplied op id — so it carries whatever the caller sent, onto both new rows and into both of Q10's bundle shapes. It is CARRIED deliberately, on the same ground as `by`: an audit surface that cannot say WHICH OP correlated a decision cannot correlate at all, and the same class already rides the lifecycle fact row, so this is a precedented carry rather than a new exposure. `decision`, `request_ref`, `kind` and `event` are admitted id-grammar tokens or kernel-minted, sanitized by construction. THE CONFINEMENT SET, stated in full: the untrusted values reach the store row, the floor's timeline and tail, the shipped CLI's timeline/tail/detail documents (by CONTENT REACHABILITY — those documents serialize the floor's rows whole, so the class reaches them with no CLI code change, and naming them on that ground rather than on "this packet edits no CLI file" is the renderer rule's own requirement), and the bundle for `by` but NOT for `payload`. TWO MORE SURFACES THIS PACKET'S OWN ROWS OPEN, named because a set claiming fullness must carry them: the DIAGNOSTIC CHANNEL — Q18's attribution carries `op_id`, so the value classified above rides the diag sink, its store, the bundle's diag rows and the diag tail; and the DISPATCH HANDOFF — Q6 delivers the operator's submitted payload into the actor's next packet, untrusted operator text crossing onto an actor-facing surface by design. Family 13 drives the one asymmetry that is falsifiable on surfaces this packet owns: `payload` PRESENT on the store row and ABSENT from the bundle row, with `hasPayload` asserted in both states beside it |
| Q17 | **Out of scope — the single in-packet home for what ch14-P3 and the chapter close hold.** Anchor: `prose:plan §14.4` (the LIVE Packets-and-flow-mode table, whose `ch14-p3a` and `ch14-p3b` rows carry the membership below — the `ch14-P3` row this anchor named was REPLACED by the split ch14-p3a executed, so the membership is now stated across the two rows while this row's own enumeration remains the packet-side statement of it; re-anchored at ch14-p3b's build, bookkeeping-only), plus `contract:ch14-human-decision#C23` and `contract:ch14-human-decision#C24` — cited because two members below are THEIRS and not the plan row's: the floor-read resolution and the `--by` default (C23: `--by` is OPTIONAL, defaulting to the same read's bound operator) and the shipped `local-pair-v0` wiring (C24). P3 (the activation): the two operator CLI verbs with their floor-read resolution and the `--by` default, the floor's pending-Ask read (C21's other half), the shipped `local-pair-v0` wiring (the `operator` role, the `human_approval` gate, the `commit_pending` wait), the golden-trace re-pins that template change reaches, and the journey smoke through the shipped entrypoint. NAMED NON-MEMBERS, because they are the CHAPTER CLOSE's: the draft's `realized` flip with its `realized_map`, the ch-14 map row, the §1.3 header range, and the §14.5 DoD items. ALSO ROUTED OUT, each with its carrier: the bundle-policy seam question stays where p2a routed it (the next chapter touching the bundle, carried by p2a's plan-map row) and is NOT re-opened here; and the `instrument_manifest` audit leg's aftermath-commit misfire, found at p2a's aftermath, is a VERIFICATION-SURFACE tooling question already carried by a process-log entry for the boundary review — this packet neither depends on it nor fixes it. FORWARD SCOPE: this packet closes the arrival → resume cut p2a opened, so after it the chapter's kernel is complete and only the activation remains |

## Mirrored Surface Map

Every rule above is stated ONCE at its canonical row; every other mention
defers with an arrow-bracket pointer naming a registered rule, or is
allow-listed below. The SIX restating genres p2a declared are inherited
unchanged and are declared again here rather than cross-referenced, so
this register reads without the sibling: the Claim, a dimension's cell
name, a standing-review-rule gloss, a PRE-APPROVAL FLAG's decision
statement (the ratifier must rule without chasing rows), the Sizing/risk
assessment's own findings, and a test family's DISCIPLINE — which
restates only what it ASSERTS, never the rule's ground. Verbatim runs
quoted from the contract and from the model units are NOT censused: every
quoting site names its source in the same sentence that carries it.

```json
{
  "mirror_map": {
    "form": "pointer-only",
    "rules": [
      { "id": "shared-arrival-call", "canonical": "Q1", "signature": ["The arrival is CALLED, never re-implemented"], "allow": [] },
      { "id": "handler-supplies", "canonical": "Q1", "signature": ["WHAT EACH HANDLER SUPPLIES"], "allow": [] },
      { "id": "config-from-left", "canonical": "Q1", "signature": ["resolved from the step being LEFT"], "allow": [] },
      { "id": "own-property-indexes", "canonical": "Q1", "signature": ["OWN-PROPERTY OBLIGATION for every authored-key index"], "allow": [] },
      { "id": "new-variants", "canonical": "Q2", "signature": ["never `LifecycleFactKind` growth"], "allow": [] },
      { "id": "one-write-member", "canonical": "Q2", "signature": ["ONE NEW PORT MEMBER"], "allow": [] },
      { "id": "no-second-bump", "canonical": "Q2", "signature": ["NO SCHEMA CHANGE"], "allow": [] },
      { "id": "one-ladder", "canonical": "Q3", "signature": ["IT IS ONE LADDER, PARAMETERIZED"], "allow": [] },
      { "id": "rung-read-finding", "canonical": "Q3", "signature": ["that is a NEW FINDING and a STOP"], "allow": [] },
      { "id": "correlate-arrives", "canonical": "Q3", "signature": ["the rung's first arrival AS A LADDER EXPECTATION"], "allow": [] },
      { "id": "kind-domain", "canonical": "Q15", "signature": ["the kind parameter's TYPE is"], "allow": [] },
      { "id": "compare-excludes-transition", "canonical": "Q15", "signature": ["the union's own discriminant MINUS the one value"], "allow": [] },
      { "id": "findop-whitelist", "canonical": "Q15", "signature": ["THE STORE'S OWN LOOKUP MUST OPEN WITH IT"], "allow": [] },
      { "id": "op-less-unreachable", "canonical": "Q15", "signature": ["THE OP-LESS CLASS'S CELL"], "allow": [] },
      { "id": "pending-read-route", "canonical": "Q4", "signature": ["through the store's EXISTING timeline read"], "allow": [] },
      { "id": "pending-absent-throw", "canonical": "Q4", "signature": ["CORRUPT COMMITTED HISTORY"], "allow": [] },
      { "id": "override-two-causes", "canonical": "Q5", "signature": ["the SECOND has TWO distinct causes"], "allow": [] },
      { "id": "override-absent-not-false", "canonical": "Q5", "signature": ["never `false`"], "allow": [] },
      { "id": "verdict-decision-seam", "canonical": "Q5", "signature": ["RECORDS AS THE ENTRY'S `decision`"], "allow": [] },
      { "id": "clear-is-named-vacuous", "canonical": "Q6", "signature": ["WHAT THE FUNCTION DOES TODAY IS NOTHING"], "allow": [] },
      { "id": "second-producer", "canonical": "Q6", "signature": ["THE SECOND DISPATCH PRODUCER IS NAMED"], "allow": [] },
      { "id": "handoff-delivery", "canonical": "Q6", "signature": ["SUPPLIES `decision.payload` AS THE HANDOFF"], "allow": [] },
      { "id": "shape-guard-two", "canonical": "Q7", "signature": ["THE GUARD'S INHABITANTS ARE TWO, NOT THREE"], "allow": [] },
      { "id": "nominal-intent-key", "canonical": "Q9", "signature": ["The `intent` key is what closes it"], "allow": [] },
      { "id": "wire-casing", "canonical": "Q9", "signature": ["THE REALIZED KEYS ARE camelCase"], "allow": [] },
      { "id": "resume-kind-source", "canonical": "Q7", "signature": ["read off the instance record"], "allow": [] },
      { "id": "double-completion", "canonical": "Q8", "signature": ["ITS GUARD DOES NOT, AND THAT IS STATED"], "allow": [] },
      { "id": "keyset-not-presence", "canonical": "Q9", "signature": ["THE KEYSET GOVERNS MEMBERSHIP, NOT PRESENCE"], "allow": [] },
      { "id": "bundle-two-shapes", "canonical": "Q10", "signature": ["TWO new discriminated row shapes"], "allow": [] },
      { "id": "payload-presence-bit", "canonical": "Q10", "signature": ["`hasPayload` PRESENCE BIT"], "allow": [] },
      { "id": "three-blind-readers", "canonical": "Q11", "signature": ["THE PRODUCTION INHABITANT IS THE ONE THAT MATTERS"], "allow": [] },
      { "id": "harness-seam-choice", "canonical": "Q13", "signature": ["THE SEAM CHOICE IS THE DECISION"], "allow": [] },
      { "id": "trace-checker-binding", "canonical": "Q14", "signature": ["the CHECKER-KIT BINDING and what it buys"], "allow": [] },
      { "id": "flip-both-halves", "canonical": "Q12", "signature": ["a flip on half a pair"], "allow": [] },
      { "id": "shared-required-fields", "canonical": "Q5", "signature": ["THE REQUIRED-FIELD READER IS SHARED, NOT RE-WRITTEN"], "allow": [] },
      { "id": "oplessness-rebased", "canonical": "Q2", "signature": ["MUST BE RE-BASED RATHER THAN EXTENDED"], "allow": [] },
      { "id": "edge-keyed-round", "canonical": "Q6", "signature": ["keyed on the ADMITTED `advancesRound`"], "allow": [] },
      { "id": "registry-byte-untouched", "canonical": "Q12", "signature": ["asserted byte-untouched before AND after"], "allow": [] },
      { "id": "by-untrusted-carried", "canonical": "Q16", "signature": ["operator-authored untrusted text whose grammar nothing constrains"], "allow": [] },
      { "id": "confinement-set", "canonical": "Q16", "signature": ["THE CONFINEMENT SET, stated in full"], "allow": [] }
    ]
  }
}
```

## In-context notes

- The kernel branches on no actor being human
  (`contract:ch14-human-decision#C7` — `defaultActor` is an ordinary
  roles-entry key and `human` is a VALUE, not a semantic) and on no
  decision key's NAME (`contract:ch14-human-decision#C4` — an open map
  whose keys are data, which the kernel never interprets). Both are
  deferred to, neither restated; the two halves are cited apart because
  C4 carries only the second.
  What this packet ADDS as an intent note: the only thing distinguishing
  the operator path from the actor path at runtime is WHICH MAP the
  arrival routed through, and both maps reach the same arrival — so a
  build tempted to branch on "is this a decision?" downstream of the
  arrival has found a design smell rather than a requirement.
- The own-property rule is CONTRACT and therefore no longer lives here:
  its canonical home is Q1, which carries the per-site obligation for
  every authored-key index this packet adds. What remains a note is only
  why a reader should expect it at all — the id grammar admits prototype
  member names, so an unguarded index answers a hostile key with an
  inherited member rather than with a refusal.
- The two handlers are SIBLINGS of KICKOFF in shape, not in lifecycle:
  they resume a wait, they carry an op id, and they commit through ONE
  transaction — but they route through a ChoicePoint and KICKOFF does
  not, and that routing is what can make the transaction write TWO rows
  (Q2's park case) where KICKOFF's writes one. Reading
  them as lifecycle intents is what would put their rows in the fact
  class, which Q2 refuses on the field lists.

## Embedding gates

- Target files: the mutation boundary below, nothing else. FOUR of its
  entries do not exist yet and are this packet's CREATIONS — the
  operator-intent kernel module, its suite, the `l3` trace test, and the
  kernel-internal pinned-template module the site grid's loader duty
  mints. The
  two new bundle row shapes land in an EXISTING file. Every other entry
  exists and is `ls`-checkable.
- Entrypoints: the ingress's `submitIntent` (the two new intents), the
  kernel entry object's two new handlers, the store's new write member
  and its `getTimeline`/`getInstanceDetail` mapper, the floor's timeline
  pass-through and the debug bundle as a projection, and the trace
  harness's replay.
- Verified against the CURRENT tree at this authoring, each an
  `ls`/`grep`-checkable fact and each the reason a file is in the
  boundary: `kernel/admission.ts` carries EXACTLY TWO ladders
  (`admitLoaded`, `admitLifecycle`) and `admitLifecycle`'s `factKind` is
  typed `LifecycleFactKind`; `commitTransition` hard-codes
  `entry_kind = 'transition'` in its INSERT and takes an `EventEnvelope`;
  `SCHEMA_VERSION` is `"6"` and the `transcript` table already carries a
  nullable `op_id` and an `entry_body` column; the mapper's class iff
  covers three classes with a fail-loud unknown-kind throw;
  `INTENT_KINDS` holds exactly `create|start|kickoff|cancel` and
  `INTENT_KEYS` four keysets; `IngressDetailToken` is a hand-authored
  union that grew additively at ch12-p1b; `BundleFactRow` requires a
  `LifecycleFactKind` and an `OpId`; `TraceStep` has exactly `start` and
  `emit`, and `TraceSeams` has no intent seam; `storeCheckers.ts` and
  `kernel/gateProjection.ts` carry the three `DEFERRED(ch14-p2b)`
  markers; `l3/wait step + RESUME_WAIT` and
  `l3/DECISION_REQUEST / DECISION_MADE` are `pending` in the domain
  registry; the six l3 unit-map rows this packet owns are `pending`.
- THE FALLOUT SPLITS IN TWO, stated because collapsing it is how a
  semantic sweep gets mistaken for the compiler's work.
  **COMPILER-FORCED, enumerated by `tsc` and by nothing else:** the
  union's growth by two classes forces exactly ONE site — the debug
  bundle's row projection, the one place that TYPES the class rather than
  passing it through; and the store port's new write member forces every
  HAND-BUILT `StorePort` OBJECT LITERAL — which is the larger set and the
  one a build meets first, but NOT every literal, and the difference is
  measured rather than assumed: a literal that SPREADS the real store
  inherits the new member and keeps typechecking. Of the TWENTY-FIVE literals in the
  tree — twenty in the `const x: StorePort = {` form and five more
  RETURNED from a function (`): StorePort {`), a form a census keyed on
  the first shape misses entirely — THIRTEEN break, across seven files:
  `lifecycle.test.ts`, `kernel.test.ts`, `debugBundle.test.ts`,
  `tail.test.ts`, `diagTail.test.ts`, `traceHarness.test.ts` and
  `sqliteStore.ts`. Those thirteen are the hand-built ones PLUS the two
  that spread a `Pick<StorePort, …>` helper rather than the real store —
  a spread is only inert when what it spreads is the whole port. The
  twelve that spread the REAL store, every one in `diagEmission.test.ts`
  among them, do not break. THE CENSUS WAS TAKEN THE ONLY WAY IT IS
  SOUND: by adding the member and running `tsc`, never by counting
  literals — which is how the earlier figures in this bullet came to be
  wrong in both directions at once. Both sets are re-derived by RUNNING the change, never read
  off a list here. **SEMANTIC, reached but not forced:** the sites that
  narrow on `entryKind` behind a skip-continue filter keep typechecking
  unchanged while their MEANING moves — THREE testkit checkers (the
  terminal-sink walk, the round reconstruction, and the version
  arithmetic, that last one on the ROW-COUNT axis rather than the
  position one), the gate pipeline's policy view, and the runner's
  delivery loop. Those are
  Q11's and Q6's, and a green typecheck says nothing about them. Fixture
  CONSTRUCTION sites of the entry types do not break.
- The definition plane is not in scope for PRODUCTION code: admission,
  the declaration and the schema lock are ch14-P1's landed work, and this
  packet reads only the ADMITTED value. A build that finds itself editing
  definition-plane production code has found a real finding.
- FIVE BARREL files sit in the boundary and every named type this packet
  mints joins its module's explicit re-export list, which is the
  convention each barrel already follows by name: the two entry types in
  `domain/`, the write member's input in `ports/`, the two bundle row
  shapes in `floor/`, the handlers in `kernel/`, and the harness's two
  new step kinds with its widened seam in `testkit/`.
- Test homes that already exist: the ladder lanes join the admission
  suite; the handler lanes join the new operator-intent suite; the write
  member and the class iff join the store suite; the wire lanes join the
  ingress suite; the timeline class lane joins the floor suite and the
  bundle lanes its own; the replay closures join the testkit and
  gate-projection suites; the flips join the two drift suites. FOUR MORE,
  named because their families had none: family 16's no-move control joins the DIAG-EMISSION suite — the wrapper's rider lanes' OWN HOME, which is why that file is in the boundary at all; NOT because the port widening breaks it, since all six of its `StorePort` literals spread the real store and inherit the new member — and
  joins the lifecycle suite (which also carries the `StorePort` literals
  the write member breaks); family 7's runner leg joins the delivery-loop
  suite; family 13's document lane joins the CLI suite; and family 17's
  compile-negative joins the drift directory beside the existing
  intent-narrow scanner — itself a corpus lane this packet's new files
  enter. The `l3` trace's home is minted beside its sibling section
  traces.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/implementation/packets/ch14-p2b-decision-delivery.md",
      "v3/implementation/plan.md",
      "v3/src/cli/cli.test.ts",
      "v3/src/domain/index.ts",
      "v3/src/domain/instance.ts",
      "v3/src/domain/outcome.ts",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/intentNarrow.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/floor/debugBundle.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/index.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/ingress/ingress.test.ts",
      "v3/src/ingress/ingress.ts",
      "v3/src/kernel/admission.test.ts",
      "v3/src/kernel/admission.ts",
      "v3/src/kernel/arrival.test.ts",
      "v3/src/kernel/arrival.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/kernel/gateProjection.test.ts",
      "v3/src/kernel/gateProjection.ts",
      "v3/src/kernel/index.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/lifecycle.test.ts",
      "v3/src/kernel/operatorIntents.test.ts",
      "v3/src/kernel/operatorIntents.ts",
      "v3/src/kernel/pinnedTemplate.ts",
      "v3/src/l3Trace.test.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/ports/index.ts",
      "v3/src/ports/store.ts",
      "v3/src/runner/deliveryLoop.test.ts",
      "v3/src/runner/deliveryLoop.ts",
      "v3/src/store/sqliteStore.test.ts",
      "v3/src/store/sqliteStore.ts",
      "v3/src/testkit/index.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/testkit/storeCheckers.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/twoWorker.test.ts"
    ]
  }
}
```

NO `instrument_manifest` is declared. This packet's acceptance needs no
baseline RECOMPUTABLE at a pre-change ref: the golden traces it touches
are touched by ADDITION (a new `l3` trace) rather than by re-pin. THE
EXISTING-TRACE RISK IS NAMED AT ITS REAL SITE, because an earlier ground
here was measured false: the union growth compile-forces exactly ONE site
and NO trace, so the typecheck owns nothing on this axis. What the
existing traces DO exercise is Q11's rewrite — the trace harness runs the
post-condition checker kit on every replay, so all of them execute the
two replays this packet opens. That risk is carried by the REPLAY'S OWN
SHAPE rather than by a baseline: Q11's new edges are disjoint from the old
by ROW CLASS, so a regression makes a trace go RED rather than shift a
value silently, which is the property a digest baseline would otherwise
have to supply. THE FOURTH READER IS THE ONE THAT COULD HAVE BROKEN THIS
GROUND, and it is measured rather than waved past: the version-arithmetic
re-base changes an expression every existing trace evaluates, so a
re-based reader that got the arithmetic wrong would move a value on
traces this packet never touches. It cannot, and the reason is a
property of the existing histories: the re-base is a NO-OP wherever rows
and commits are equal, and only a park commits two rows in one — a shape
no pre-p2b history contains, since this packet's `l3` fixture is its
first inhabitant. The re-base was run against the tree at authoring and
the suite was green — 79 files / 2847 tests, the basis tree's own count,
which matches ch14-p2a's Build record and is what an in-place edit to one
checker must leave unmoved. That is the measurement this ground rests on. Declaring
the block would bind the build commit's audit to its first parent for no
claim, and the leg's own aftermath-commit misfire is already routed
(Q17).

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "Q1", "class": "derived", "refs": ["contract:ch14-human-decision#C11", "contract:ch14-human-decision#C12"] },
      { "id": "Q2", "class": "new-decision", "refs": [] },
      { "id": "Q3", "class": "new-decision", "refs": [] },
      { "id": "Q15", "class": "new-decision", "refs": [] },
      { "id": "Q4", "class": "new-decision", "refs": [] },
      { "id": "Q5", "class": "anchored", "refs": ["contract:ch14-human-decision#C16"] },
      { "id": "Q6", "class": "derived", "refs": ["contract:ch14-human-decision#C17"] },
      { "id": "Q7", "class": "anchored", "refs": ["contract:ch14-human-decision#C18"] },
      { "id": "Q8", "class": "anchored", "refs": ["contract:ch14-human-decision#C11"] },
      { "id": "Q9", "class": "derived", "refs": ["contract:ch14-human-decision#C9", "contract:ch14-human-decision#C15"] },
      { "id": "Q10", "class": "new-decision", "refs": [] },
      { "id": "Q11", "class": "derived", "refs": ["contract:ch14-human-decision#C14", "contract:ch14-human-decision#C22"] },
      { "id": "Q13", "class": "new-decision", "refs": [] },
      { "id": "Q14", "class": "anchored", "refs": ["contract:ch14-human-decision#C25"] },
      { "id": "Q12", "class": "anchored", "refs": ["contract:ch14-human-decision#C25", "contract:ch14-human-decision#C19", "prose:plan §14.5 DoD"] },
      { "id": "Q18", "class": "new-decision", "refs": [] },
      { "id": "Q19", "class": "derived", "refs": ["contract:ch14-human-decision#C9", "prose:v3/src/ingress/ingress.ts (the envelope wire's numeric ladder and its detail token)"] },
      { "id": "Q16", "class": "derived", "refs": ["contract:ch14-human-decision#C16", "contract:ch14-human-decision#C18", "prose:v3/src/ports/redaction.ts (the standing bundle redaction seam)"] },
      { "id": "Q17", "class": "anchored", "refs": ["prose:plan §14.4", "contract:ch14-human-decision#C23", "contract:ch14-human-decision#C24"] }
    ]
  }
}
```

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §14.4's `ch14-p2b` row, inherited through the
split): **projection**. Discovered at authoring: **projection** — the
header's classification line carries the derivation and the Case-B
demonstration.

**A FURTHER SPLIT WOULD BE DEPTH 2 AND IS THEREFORE NOT THE LOOP'S**, so
this assessment is written to be overturned rather than to justify a
conclusion: if the closure proof fails, the packet STOPS with a split
proposal instead of executing one.

**ALL ELEVEN HARD STOPS WALKED, SEVEN TRIP.**

1. **TRIPS.** Authority movement (the two entry handlers become the
   canonical route for decision and resume moves) together with new
   runtime behaviour turned on — both go live here.
2. **TRIPS.** One concept across FIVE surfaces: kernel logic, the store's
   write member and mapper, the ingress-write seam, the read projection
   (the bundle's two row shapes), and the testkit contract.
3. Clear — nothing here waits on unfinished work: p2a is built, every
   anchor is ratified, and P3 comes after.
4. Clear — and NOT vacuously: Q15 explicitly refuses a second
   digest-aware compare and Q4 refuses a second recorded home for the
   recommendation. Both are the competing-authority shape this stop
   names, and both are answered by refusal rather than by absence.
5. Clear, and the SPLIT is why: `request_ref` is the fragile join, and
   its contract cutover landed at p2a while its consumer cutover lands
   here. They are in different packets by construction, which is exactly
   the relief `foundation → delivery` was cut for.
6. **TRIPS.** SIX consume families present (below).
7. **TRIPS.** The authority producer changes and THREE shared shapes
   change with it (`TranscriptEntry`, `StorePort`, `IntentOutcome`), with
   more than two fallout families.
8. **TRIPS, on the persisted-authority limb only, and the relief is
   named rather than used to mark it clear:** the persisted CLASS SET
   grows by two and the shared contract migrates, with read-projection
   fallout in the same packet. What does NOT happen is a DDL change —
   p2a's bump was ONE fence for the chapter and its own row commits to
   serving these two classes, so a second bump here would falsify it.
   The limb still trips; the schema relief is why it trips smaller.
9. **TRIPS.** Producer behaviour changes together with IDEMPOTENCY
   semantics: Q15 widens the compare's kind domain and two new classes
   join the `(instance_id, op_id)` uniqueness as consumers.
10. **TRIPS**, and this one is argued rather than assumed. Where
    COMPLETION is reachable FROM changes (Q8), and the surface that
    PROVES completion — the terminal-sink checker's replay — changes in
    the same packet (Q11). A packet that moved both and called the stop
    clear would be doing exactly what this gate exists to catch. No
    cleanup semantics move, and the terminal WRITE itself is byte-
    unchanged.
11. Binds — the packet REUSES the checker-kit and golden-trace proof
    contracts, so proof-parity is taken HERE: the checkers are extended
    WITH their own lanes (family 11) rather than inherited, and the trace
    is new rather than re-pinned.

**Consume-family scan** (run because the packet moves an authority), from
the tree and not from this packet's own list: producer `present` (not a
consume family, excluded from the count); validator/gate `present` — the
gate pipeline's policy view is a PRODUCTION replay this packet must fix;
persistence/replay `present` — the write member, the mapper, the two
testkit checkers, the trace harness; execution consumer `present` — the
post-commit selection (built at p2a) and the runner's delivery loop
through the widened union; read/presentation `present` — the floor
timeline and the bundle's two new shapes; external/integration `present`
— the ingress-write seam gains two intents; testkit `present` and
COUNTING, because the harness's step union is its contract;
recovery/cleanup `absent` — VERIFIED from the tree: every reclaim and
evidence predicate skips non-transition rows and reads no op id.
**SIX consume families.**

**The implementation-closure proof — ALL SIX CLAUSES HOLD, and its
FALSIFIER is named** (the expected form the ch14-p2a approve ratified for
a clause-6 claim over multiple hard stops).

1. *One build closes it without separate sequencing.* The handlers, the
   write member, the mapper branches, the replay closures and the trace
   are mutually dependent: a handler with no write member cannot commit,
   a written row with no mapper branch fails the class iff on its first
   read, and the replay closures cannot be DRIVEN until the arrivals
   they are blind to exist.
2. *The same bounded code change closes the touched buckets.* The two
   handlers are siblings over ONE ladder and ONE write member; the
   bundle's two shapes are the same union growth arriving at the one site
   that types the class rather than passing it through.
3. *The same consumers own the fallout.* The union growth's fallout is
   compiler-enumerated, exactly as p2a's was; no consumer needs a
   semantic negotiation.
4. *The same proof surface validates it* — `pnpm v3:test` including the
   `l3` trace and the checker kit, plus `ci:local` at the chapter close.
5. *No per-consumer-family review loop is expected.* The read-projection
   family receives two row shapes DECIDED here, and the testkit family
   one harness extension decided here — decisions, not loops.
6. *No SEPARATE compatibility / diagnostics / read-projection / recovery
   / ordering risk is introduced.* The operative word is SEPARATE — a
   risk needing its own closure elsewhere. The ordering this packet
   introduces (two rung orders) is decided IN it and closed by family 2's
   combination lanes; the read-projection work is its own union growth
   reaching its own projection.
   **THE FALSIFIER:** the proof FAILS if Q11 is deferred, and it fails on
   TWO INDEPENDENT AXES rather than one. The `l3` trace runs the
   post-condition checker kit: a decision-routed arrival makes the round
   reconstruction and the terminal-sink walk resume from the PRE-GATE
   position, and the version-arithmetic checker counts the park's TWO
   rows against its ONE version bump — so the trace goes red on the
   position axis and on the row-count axis independently. That is
   what binds the replay closures into this closure rather than a later
   one, and it is a mechanical consequence rather than a judgement.

**single-packet allowed: yes** — on all six clauses. Shared invariant
coherence is explicitly NOT the argument.

**The escalation list, WALKED.** *4+ surfaces AND 3+ success classes* —
5 surfaces and more than 3 classes: FIRES, carried by the same closure
proof (it overlaps hard stop 2 by construction). *Multiple competing
identity forms AND 3+ surfaces* — does not fire: ONE identity form
(`request_ref`), minted at p2a and consumed here, with no second form to
align. *ANY authority change AND a consumer-relied cross-seam mapping AND
a CLI/human-payload change* — authority YES; cross-seam mapping YES (the
`(instance_id, op_id)` uniqueness feeding the idempotency rung, whose
kind domain this packet widens); CLI/human-payload change NO, on DOCUMENT
SHAPE rather than on "this packet edits no CLI file": no field is added,
removed or re-keyed on any emitted document, and family 13 drives that
reachability rather than leaving it asserted. The combination does not
complete.

**Closure-budget triage:** the AUTHORITY, RUNTIME, SHARED-CONTRACT and
READ-PROJECTION buckets are touched and deliberately collapsed — the
write member exists only to carry what the handlers commit, its only
readers are in this build, and the projection is what the new classes
force. The PERSISTED-SCHEMA bucket is NOT touched (p2a's one fence
covers it). The CLI bucket is deferred whole to P3 — the ONE `cli/` path in the mutation boundary is `cli/cli.test.ts`, and it is there for family 13's DOCUMENT LANE, not for compiler ripple: the file binds neither entry union (its `entryKind` reads are locally declared inline types over `JSON.parse` results, so the union's growth compile-forces nothing in it), and the lane asserts that a timeline carrying both new classes survives the CLI's documents WHOLE. CONTENT reachability, no CLI code change, no product behaviour; named here so a builder meeting the path in the boundary does not read the deferral as broken.
**Proof-boundary triage:** TRIGGERED. Current canonical proof source for
completion: the terminal-sink checker's transition-only replay. Target:
the same checker with a three-way replay, plus the `l3` trace. No surface
goes mixed-truth across phases — the replay's old and new edges are
disjoint by row class. The reused proof contracts need FULL proof-parity
here, taken as family 11's own lanes.
**Mutable-flow record:** TRIGGERED by hard-stop-9 adjacency. Precondition
failure produces ZERO side effects on both paths: every rung and every
key-scoped guard returns BEFORE the commit. Q8's double-completion assert
is a DEFENSIVE bar over a state every entry path's ladder already
forecloses — it has no entry-path inhabitant at all — so family 9 drives
it by a DIRECT unit call with NO committed-state assertion, a pure
function having committed nothing. No rollback,
retry, lease or serialization semantics move; no coordination primitive
is introduced; the CAS-restart loop follows HANDLE's shape unchanged.

**Site × shape × phase grid — TRIGGERED** (p2a's was not: its arrival was
single-phase and its post-commit selection performed no I/O). The submit
path now has MULTIPLE awaited sites before its commit, so the grid is
written once, here.

| Site | Phase | Rejection/absent | Throw | Driven or ruled out |
|---|---|---|---|---|
| `store.loadInstance` | pre-state | `null` ⇒ `unknown_instance` | store failure propagates | family 2's LOAD cell — a member of its inventory, named separately because the load is NOT a rung (the unit is explicit) |
| `store.findOp` | pre-state | `null` ⇒ rung passes; a row of ANY op-carrying class ⇒ the rung's compare | store failure propagates — AND, before Q15's whitelist opens, a row of either NEW class rejects here | family 3, both directions |
| `definitions.load` (pinned) | SUBMIT: pre-ladder (threaded into the authority rung) · RESUME: post-admission, pre-commit | `null` ⇒ kernel-integrity THROW | — | ruled out AS A CLASS — the live `loadTemplate` behaviour is unchanged and already driven — WITH ONE NAMED DUTY, because the loader is module-PRIVATE to `kernel.ts` (`loadTemplate`) and the submit path's load now sits in the operator-intent module, so it must become reachable from both. **THE TREE HAS ALREADY FORKED IT ONCE, which is this duty's real ground rather than a hypothetical: `lifecycle.ts` carries `loadPinnedTemplate`, a body identical but for its NAME and ONE comment line, with the throw string byte-identical. A third copy is a STOP.** DECIDED: the loader MOVES to a KERNEL-INTERNAL module that `kernel.ts` and the operator-intent module both import. **EXPORTING IT FROM `kernel.ts` IS REFUSED and the refusal is measured, not stylistic:** `kernel.ts` must import the operator-intent module to wire the two handlers into the kernel object, so an operator-intent import of `./kernel.js` closes a CYCLE — and `lifecycle.ts` is the living demonstration of why the tree took the copy route instead, being imported BY `kernel.ts` and importing nothing back. CONSOLIDATING `lifecycle.ts`'s COPY IS AVAILABLE IN THE SAME EDIT AND IS DELIBERATELY OUT OF SCOPE: it is pre-existing debt touching no behaviour this packet adds, and it is named here so the fork reads as KNOWN rather than unnoticed — a build that consolidates it states the move in its Build record, which the audit's convention admits. THE PHASE DIFFERS BY PATH and is written as two. THE SUBMIT PATH RESOLVES THE TEMPLATE ONCE, BEFORE THE LADDER, and threads it — which is why this cell's SUBMIT phase reads *pre-ladder* and not *inside the authority rung*. The unit places the read AT the authority rung and the realized shape HOISTS it — Q3 decides that and carries the ground. What this cell adds is the consequence for the SITE COUNT: the same loaded template then serves the post-admission ChoicePoint selection, so the submit path has ONE occurrence here and not two, and the rung reads a value already in hand |
| `store.getTimeline` (Q4's pending read) | pre-commit | row ABSENT ⇒ kernel-integrity THROW | store failure propagates | family 4, BOTH directions |
| `commitOperatorEntry` | commit | `cas_conflict` ⇒ restart · `duplicate_op` · `op_id_collision` | transaction rollback | family 5, whose inventory carries the three results and the rollback, and family 16 for the restart's own emission |
| post-commit selection | post-commit | — | — | ruled out: NO I/O — p2a's K5 states its full input set and every input is in the caller's hand |

The resume path is the submit path MINUS the pending read and MINUS the
authority rung. No site is unique to it, which is why it shares this grid
— but the sharing is at SITE grain only: with no authority rung to feed,
the resume path has no reason to hoist the load, so `definitions.load`
lands POST-admission there and PRE-ladder on the submit path. Same site,
two phases, which is why the row above states it as two cells rather
than one. NEITHER phase is inside a rung: the ladder is synchronous on
both paths (Q3).

**Difficulty index** (`model-tier-experiment-2.md` §3, computed at this
approve from the machine blocks): **A = 1** (`packet_rows` = 19, in
16–30) · **B = 2** (derived 6 + new-decision 7 = 13, ABOVE 10) ·
**C = 2** (`mutation_boundary` = 48, ABOVE the 45 band edge) · **D = 1** — the
runtime substrate gains ONE awaited store read in the post-admission
guard phase (Q4) and no NEW async, temporal or external seam; the CAS-restart shape
is HANDLE's, unchanged. THE SCORE RESTS ON A DECISION, not on an
absence: Q3 keeps the shared ladder SYNCHRONOUS by threading the loaded
template in, per HANDLE. A build that instead awaits inside a rung turns
`admitLoaded` async and moves the call shape of the actor path and every
lifecycle rider — which would be a D of 2 and a different packet · **E = 1** — precedented in kind: an entry-handler
family with its own ladder and its own transcript class is ch12-p1b's
shape, and the ChoicePoint routing is p2a's arrival called rather than
re-derived. **Σ = 7 → Heavy band** (Light 0–3 / Medium 4–6 / Heavy
7–10). EQUAL to p2a's 7, and the arithmetic of that equality is worth
recording HONESTLY, because the obvious reading of it is false. TWO OF THE THREE AXIS INPUTS FELL AND THE THIRD HELD EXACTLY EQUAL,
which is a different and less flattering story than the one an equal Σ
invites, so it is written out. ROWS FELL, 20 → 19. BOUNDARY FELL,
61 → 48 — each packet's FROZEN approve-time score, which is the
comparable pair; p2a's own block now reads 63 — its build and
aftermath extended the boundary and recorded that without re-scoring, as
the index directs — so block to block the fall is steeper still, and the
direction does not turn on which pair is used. INFERENCE LOAD DID NOT FALL AT ALL: derived +
new-decision is 13 here and was 13 at p2a — identical, with the mix
inverted (p2a carried 7 derived and 6 new-decision; this packet carries 6
and 7). THE SPLIT BOUGHT NO INFERENCE-LOAD DIVIDEND, and the reason is
visible in that inversion: a delivery half that CALLS a built arrival
trades derivation for decision one-for-one rather than shedding either. Nothing
rose. The equal Σ is a BANDING artifact — the TWO that fell fell WITHIN
their bands rather than across a threshold, and the third did not move at
all, so two real decreases score identically. THE HONEST CLAIM IS THEREFORE NARROWER than "the
dividend was spent": the split's dividend on the SUBSTRATE axes is real
and visible in D and E scoring 1 (the schema, the arrival and the effect
record are already built and this packet calls them), and the dividend
on the OTHER three axes is UNEVEN and partly absent — C at 48 clears the
45 edge by three; A fell within its band; and B did not move at all, sitting at 13
against p2a's 13, three clear of the 10 edge. What the two SHARED
SURFACES this packet opens (the admission ladder and the diagnostic
wrapper) actually cost is the boundary breadth that keeps C over its
edge; they did not RAISE any axis, they kept two from falling far
enough. **AND B'S STICKINESS IS ARGUED RATHER THAN ASSERTED, because B
is the axis that partitions most readily and the narration would
otherwise lean on C alone.** The obvious further cut — submit path vs
resume path — WOULD move B: of the seven new-decision rows only Q4 is
submit-only, so six of seven land in a FIRST half (B ≈ 1) and the second keeps
almost none (B ≈ 0) — and *foundation* and *activation* are deliberately
NOT reused for them, because this packet has already fixed those words
to the p2a cut and to P3. The cut is therefore
arithmetically available and still REFUSED, and the ground has to be
stated precisely, because dependency alone does not refuse a cut — the
ch14-P2 split that produced this packet is itself dependent: p2a built
the arrival and p2b calls it. WHAT SEPARATES THE TWO CASES IS AN
INHABITANT. p2a's arrival had one at its own approve — HANDLE already
called it, so p2a could be proven standing alone. A
submit/resume cut leaves its first half a write member, a ladder
opening and an arrival call with NO committing handler anywhere in it:
nothing in that half could drive any of the three, so it is not a packet
that can be approved, it is a dependency chain. (Depth is a second and
independent bar — a further cut here is depth 2, which the process makes
a STOP rather than a verdict — and it is recorded separately above.) A split that halves the substrate and keeps the
shared-surface reach does not halve the index. The index freezes at this approve.

**Size, recorded rather than argued, because the precedent this packet's
earlier sizing rested on is DEAD and a reader should not have to
rediscover that.** Both v0 thresholds are breached and both are
advisory: 48 KiB, breached 3.7×, a threshold every packet since ch-8 has
breached; and +50% growth across the review rounds, breached at roughly
+70%. THE p2a COMPARISON NO LONGER FAVOURS THIS PACKET and is stated
brief-to-brief, the same frozen-to-frozen discipline the boundary figure
above uses: p2a's total carries about 14 KB of Build record and
aftermath that did not exist at ITS approve, so the comparable pair is
approve-time brief against approve-time brief, and on that pair p2b is
the larger by roughly 27% — measured at this approve, like the index
itself, since the figure moves with every fold. WHAT THE SIZE IS MADE OF, because "trim it"
is not available: about a fifth is template-mandated verbatim model
quotation and machine blocks, and the rest is roughly a hundred
structural units — rows, dimensions, families, flags, mirror rules — at
a fairly uniform density, not one bloated section. The count of those
units has been FLAT for three rounds.

**Residual risk, recorded here rather than as a flag because it carries
no decision:** the silent-failure modes are TEST risks in specific
directions. SEVEN builds go quietly wrong, each with its dimension and its
driving family named in pairs: one that keys round advancement on a
verdict NAME rather than on the edge flag (dimension 9, family 7 — every
single-verdict fixture passes it); one that writes `override: false`
instead of omitting it (dimension 8, family 6); one that resolves
`issuedAgentConfig` from the TARGET rather than the step being left
(→[config-from-left], dimension 1, family 1 — invisible in the committed
row BY CLASS on both these paths, which is why the lane reads the value
at the STORE-PORT SEAM instead: a type assertion alone greens on both
resolutions); one that reorders
the correlation and version rungs (dimension 2, family 2 — isolated
lanes cannot see it); one that treats an op-carrying row of ANOTHER kind
as a Duplicate rather than a collision (dimension 4, family 3); one
that fixes only the terminal-sink replay and leaves the round
reconstruction or the policy view blind (dimension 14's POSITION axis,
family 11); and one that discharges the version-arithmetic re-base by
DEGENERATING the check — reporting nothing on any transcript carrying an
op-less row — which greens every trace while removing the arithmetic
from all of them (dimension 14's ROW-COUNT axis, family 11's negative
lane, which exists for exactly this mode).

## Pre-approval flags

1. **The store's write member is this packet's decision (Q2,
   new-decision).** C22 fixes both classes' field lists, their op
   consumption and their absence-by-class, and explicitly leaves the
   realization — fact-kind growth or new variants — to this packet.
   DECIDED: new union variants, and ONE new port member
   (`commitOperatorEntry`) serving both, discriminated by entry kind.
   THE HALF THIS FLAG EXISTS TO PUT IN FRONT OF YOU: it is a PORT
   WIDENING — `StorePort` grows a write member for the first time since
   ch12-p1b — and the alternative that avoids it (widening
   `commitTransition`) would make its `envelope` optional and hand every
   existing caller a shape that can be under-filled. Ratifying the member
   ratifies that trade.
   Route: `approve-ratified`.
   Risk if wrong: a second write member later, or a `commitTransition`
   whose envelope is optional for one caller's benefit.
2. **The idempotency compare's kind domain widens to the union's own
   discriminant MINUS one value (Q15, new-decision).** C15 names the seam
   and hands it here. DECIDED AS AMENDED AT THE APPROVE:
   `Exclude<TranscriptEntry["entryKind"], "transition">`. The domain
   still grows with the union — a SUBTRACTION, not a hand-maintained
   list, so a future entry class needs no edit here — and `"transition"`
   is UNREPRESENTABLE rather than merely undriven. THE COST THE ROW FIRST
   ACCEPTED IS REMOVED RATHER THAN GUARDED: under the bare discriminant a
   transition-kind compare would have bypassed the digest half the actor
   path's duplicate detection depends on, with nothing in the type to
   prevent it and one test lane standing in the way; the exclusion also
   states C15's own letter — the digest compare stays transition-only —
   where it cannot drift. Prior art in the tree:
   `Exclude<RejectionName, "gate_blocked">` in `domain/outcome.ts`.
   Family 3's lane stays, asserting the RUNTIME behaviour the type cannot
   reach.
   Route: `approve-ratified` — RATIFIED WITH THIS AMENDMENT.
   Risk if wrong: a future row class legitimately needs digest mode, and
   the type must widen — which is a CONTRACT change moving with its own
   ratification, never a build's to make.
3. **The pending DECISION_REQUEST is READ from committed state (Q4,
   new-decision).** No C-row decides it, and p2a's K20 decided the
   MIRROR question the other way for the Ask — so this flag exists
   because the two look contradictory and are not. K20's ground was that
   a POST-commit scan adds a fallible boundary AFTER the commit; the
   override guard runs PRE-commit, where a store read is ordinary.
   DECIDED: read through the EXISTING timeline read, no new store member.
   Three alternatives are named with their rejection grounds in the row,
   one of them (threading it from the arrival, K20's shape) rejected as
   structurally impossible here.
   Route: `approve-ratified`.
   Risk if wrong: a per-submit read that a targeted store member would
   answer more cheaply — a cost question, not a correctness one.
4. **The bundle grows TWO more row shapes and omits the decision payload
   (Q10, new-decision).** The shapes are FORCED by the union growth (the
   fact row requires a lifecycle-fact kind, which neither class has);
   what is DECIDED is their sanitized content, and the one substantive
   call is that `payload` is omitted behind a `hasPayload` presence bit
   while `by` and `decision` are CARRIED. The asymmetry is deliberate: an
   audit surface that hid WHO decided and WHAT they chose would answer
   the wrong question, while the payload is operator-authored free text
   under the standing omission rule. The seam question p2a routed —
   whether a pass-through policy may carry such a value — is NOT
   reopened.
   Route: `approve-ratified`.
   Risk if wrong: a debug bundle that under-reports a decision's payload
   for longer than necessary — a diagnostics gap, not a leak.
5. **The trace harness grows two step kinds driven through the INGRESS
   (Q13, new-decision).** The step kinds are forced; the SEAM is the
   decision. DECIDED: `submitIntent`, not the kernel handlers — because
   the wire keysets (Q9) would otherwise go unexercised by the chapter's
   one end-to-end proof, and the `l3` trace is where the
   ingress→kernel→store→floor path is proven AS a path. The cost is an
   `IntentOutcome` widening on the harness seam, stated rather than
   discovered.
   Route: `approve-ratified`.
   Risk if wrong: a harness coupled to the wire where a kernel-level
   driver would have been simpler — and a trace that proves more than
   the section strictly needs.
6. **The kernel's shared admission ladder is OPENED, and the opening is
   wider than a rung (Q3, new-decision).** The model declares ONE
   parameterized ladder and names `admit_input` as its load-first
   companion, so following it is what this packet does. But the TREE
   forked the protocol once already, minting a second ladder rather than
   parameterizing the first — so refusing a third fork chooses the model
   over a live precedent, on a function the PRODUCTION ACTOR PATH rides.
   THE HALF THIS FLAG EXISTS TO PUT IN FRONT OF THE RATIFIER is the BLAST
   RADIUS, because an earlier form of this decision rode an unflagged row
   on the claim that it was two optional fields: the state rung gains a
   caller-supplied predicate AND its own reject name, the authority rung
   becomes skippable with per-path names, an idempotency mode joins them,
   a correlate expectation lands between state and version, and the
   rejected-reason union grows by five names — six if the load's
   `unknown_instance` rides the shared result rather than `admitInput`'s
   own — every one of them on the type the actor path and every
   lifecycle path share. THE UNION GROWTH
   IS COMPILE-SILENT for the existing callers: they widen what they may
   RECEIVE, not what they must handle, so no existing `switch` breaks and
   nothing red-flags a caller that silently falls through a new name —
   which is why this is flagged rather than left to the typechecker.
   THE CALL-SHAPE CONSTRAINT — the SIXTH item of Q3's opening, the five
   above being its four expectation dimensions and the union growth, and
   the ONLY one that would move the actor path's SIGNATURE rather than
   its behaviour — is decided here rather than left open: the ladder STAYS
   SYNCHRONOUS, and its arity stays TWO. What the ratifier is asked to
   approve is NOT a departure from the model — the model's own l0d unit
   already puts the template load at the caller and calls it NOT a rung;
   only the l3 block's rung comment reads the other way, and l0d decides
   it. What IS being ratified is that this packet CLOSES both shapes
   rather than leaving them to the build: awaiting inside a rung would
   make `admitLoaded` async and a third parameter would move its
   signature, and either changes the call shape of the production actor
   path and every lifecycle rider. THE ARITY IS PINNED AT THE TYPE LEVEL
   RATHER THAN BY THE EXISTING LANE, stated because the obvious guard is
   blind in ONE of the two directions that matter: A13's
   `admitLoaded.length === 2` REDS on a bare optional third parameter but
   PASSES a DEFAULTED one, and the obvious type-level replacement passes
   both. Q3 carries the pin that reds on either. Both are out of scope for this
   packet, not a build's to choose.
   Route: `approve-ratified`.
   Risk if wrong: a shared admission surface carrying four parameters for
   two callers, where a second ladder would have left the actor path
   untouched — the trade the tree already made once, reversed here.
7. **The two handlers get the ACTOR path's diagnostic classification, not
   the lifecycle path's (Q18, new-decision).** No C-row touches the
   diagnostic channel. The existing operator intents ride a SHARED wrapper
   that emits on `duplicate`, on `rejected`, and on a throw — and it has
   never needed more, because none of its riders carries a version rung.
   These two are the FIRST that do, and both C15 and C18 specify `Stale`
   on a mismatch, so as wired a stale operator intent would emit NOTHING
   while the actor path emits `stale` with its `currentVersion`; the same
   holds for every CAS restart. DECIDED, SPLIT BY SHAPE: `stale` is
   delivered by opening the shared wrapper with ONE arm and widening its
   GENERIC BOUND by one optional member (a `kind`-narrowed generic cannot
   reach `currentVersion` otherwise) — a signature change, compile-silent
   for every rider; `cas_restart`
   cannot come from there at all — the wrapper awaits one call and
   classifies a RESOLVED outcome, so it never sees a restart — and each
   new handler therefore emits it from its OWN restart loop, which is the
   actor path's own pattern and touches no rider.
   THE HALF THIS FLAG EXISTS TO PUT IN FRONT OF THE RATIFIER: opening a
   shared wrapper changes its SIGNATURE and the path of EVERY RIDER, not
   only the new ones,
   and the riders are MORE THAN THE OPERATOR INTENTS — the FAIL and
   runtime-context handlers ride it too. It is safe because no rider's
   outcome union carries a `stale` arm, so the new arm is unreachable for
   all of them; but that is a claim about every existing behaviour on
   that wrapper, and family 16 asserts them byte-unmoved over the rider
   set ENUMERATED FROM THE CALL SITES, never from a count in this
   packet.
   A KNOWN-STALE READ GATE SITS DOWNSTREAM AND IS OUT OF SCOPE, named so a
   build meeting a red diag read does not treat it as this packet's
   regression: the diag store's reader whitelists kernel rejection
   reasons by hand and requires envelope-shaped fields, and it is ALREADY
   violated by the shipped lifecycle path — `task_required` is emitted
   through this same wrapper and is not in the list. This packet's new
   `stale` arm is the first NEW inhabitant of a hole it does not create;
   the gate's own repair belongs to whichever packet next owns that
   reader.
   Route: `approve-ratified`.
   Risk if wrong: a diagnostic channel that is silent on the two states
   an operator most needs to see — someone else moved the run, or the
   kernel retried under them.
8. **Four build choices are named, not taken — the FOLD-NOW set.** (Q3 names a fifth, the union's five-or-six shape; it rides flag 6 because it sits on a type every path shares, not here.) The two intent-kind
   TOKEN SPELLINGS joining the live intent-kind set (the RULE is
   contract — one token per intent, the discriminator the class
   separation rests on; the spelling is the build's), the operator-intent
   module's NAME (the boundary pins `kernel/operatorIntents.ts` so the
   post-build audit has something to compare; a build landing a
   better-placed file states the move in its Build record, which the
   audit's convention admits), the two handlers' OUTCOME UNION names,
   and the ingress DETAIL TOKENS the two new gate blocks need — whose
   RULE is contract (one token per gate block, the ch12-p1b additive
   growth culture, reusing `invalid_required_string`,
   `payload_not_canonicalizable` and — for Q19's numeric block —
   `invalid_expected_version`, wherever the block IS that block) while
   their SPELLING is the build's.
   Route: `fold-now`.
9. **What this packet does NOT prove, stated so it is not read as
   proven.** The SHIPPED template still carries no gate after this
   packet — the `l3` trace authors its own — so nothing here proves that
   `local-pair-v0` parks correctly; that is P3's activation journey. The
   floor's pending-Ask read (C21's other half) is P3's, so an operator
   has no discovery surface until then: after this packet a run can be
   parked and decided only by a caller that already knows the
   `request_ref`. Both are inside plan §14.4's chapter-grain reading of
   the §8.2 stance rather than gaps.
   Route: `fold-now`.

## Acceptance

- Contract tests: no new `CT-*` ids — this packet realizes no IC item;
  its claim surface is the Q-row set plus the declared slice.
- Checks in force: the drift suites (the whole directory, not a named
  subset — two of them scan the source corpus, and a packet adding four
  files is exactly what perturbs those), `pnpm v3:typecheck` (the union
  growth's reader set and the harness widening), `pnpm v3:lint`,
  `pnpm v3:coverage` (the build-close mode, whose unit-map lock this
  packet's six flips must satisfy), `pnpm v3:packet-lint`, and
  `pnpm v3:deferred` (the three markers this packet REMOVES). ONE check
  is named for what it does NOT cover: the post-build boundary audit
  reads no behaviour, so the `l3` trace's correctness is an acceptance
  obligation and not an audited one.
- Test disciplines + family inventories (DISCIPLINE plus PARAMETERIZED
  membership with its owner named; fixture-level enumeration is build
  work, verified member by member by the build-close arm gate's
  sensitivity pass):
  - **1. Arrival-sharing family** — drives dimensions 1 and 10 and
    →[shared-arrival-call], →[config-from-left]. Discipline: the SAME
    target class is entered from ALL THREE entry paths and the committed
    instance record plus the committed row are asserted WHOLE, so a
    per-path divergence cannot hide in an unasserted field;
    `issuedAgentConfig` is asserted AT THE STORE-PORT SEAM and NOT by a
    committed byte, because on these two paths it has no committed sink
    (→[config-from-left]): a fake port captures the branded effect record
    the handler hands it and the lane reads the config member off that
    record — the last point at which the value is observable. The seam capture is what makes the lane
    falsifiable rather than merely typed (→[config-from-left] carries
    why). THE
    DISCRIMINATING FIXTURE DIFFERS AT THE ROLE LAYER, and it has to: a
    `humanGate` cannot carry an `agentConfig` at all (C2 refuses the
    key), so left-vs-target cannot be staged by putting different configs
    on the two STEPS. ON THE DECISION PATH it is staged by giving the
    LEFT step's role (the gate's) and the TARGET step's role different
    `defaultAgentConfig` values. ON THE RESUME PATH THAT RECIPE IS NOT
    AUTHORABLE and the separation is written the other way round, stated
    because a build following the decision-path recipe there reaches for
    a key that does not exist: a `wait` step's keyset carries NO `role` and no
    `agentConfig`, so `resolveAgentConfig` leaves the LEFT resolution
    exactly ONE authorable layer — `runOverrides` — and it resolves to
    `{}` wherever the fixture declares none. Not "empty by
    construction": the role-less branch nulls only the ROLE layer, and an
    override keyed on the wait step still merges, which is what the
    alternative staging below uses. The resume lane therefore stages
    a FORCED-EMPTY left against a target whose role carries a NONEMPTY
    `defaultAgentConfig` — a from-the-target build yields that value where
    a from-the-left build yields `{}` — or, where a nonempty left is
    wanted, a `runOverrides` entry keyed on the wait step, which is the
    only layer a role-less step has. TWO CELLS CANNOT DISCRIMINATE AT ALL
    and are named rather than left to look covered: resume × terminal
    target and resume × `wait` target resolve to `{}` on BOTH sides, so
    →[config-from-left] cannot fail in either — they are members for the
    arrival's other assertions, not for this one. MEMBERSHIP: dimension 10's
    four target classes × the three entry paths — ALL TWELVE ARE
    REACHABLE, stated positively because an earlier form of this clause
    promised to name the combinations HANDLE cannot reach and there are
    none: an agent step's `transitions` may target an agent step, a
    `humanGate`, a `wait` or a terminal. The cells that ARE special are
    the two named above, which cannot discriminate `issuedAgentConfig`
    at all; they are members for the arrival's other assertions. Owner
    Q1.
  - **2. Ladder-order family** — drives dimensions 2 and 3 and
    →[one-ladder]. Discipline: every rung is driven to its own
    rejection, and every ADJACENT PAIR is driven by a COMBINATION lane
    staging both failures at once and asserting the EARLIER rung's name —
    isolated lanes cannot falsify a reordered ladder. The resume path's
    ABSENT authority rung is driven positively: a resume with no
    authority claim SUCCEEDS. MEMBERSHIP: the five submit rungs and the
    four resume rungs plus their adjacent pairs, PLUS the load that
    precedes them (`unknown_instance` on both paths — not a rung, which
    is why it is named rather than assumed inside the ladder), PLUS the
    ACTOR path's every rung outcome as the no-move control for the
    ladder's opening, owner C15 and C18.
  - **3. Idempotency-domain family** — drives dimension 4 and
    →[kind-domain], →[compare-excludes-transition], →[op-less-unreachable]. Discipline: a replay of the
    intent's OWN kind is `Duplicate`; an op id consumed by ANY other
    op-carrying kind — including a TRANSITION row, which is the cell
    that proves the digest half was not reused — is `op_id_collision`;
    and the op-less class is asserted UNREACHABLE by this rung rather
    than assumed, by staging an instance carrying an op-less row and
    showing the lookup does not find it. MEMBERSHIP: the COMPARE-KIND tokens
    existing after this packet × the two operator paths — read from the
    EXCLUDED domain at build rather than counted here, because the
    compare is an equality on the discriminant minus one value, and the
    classes and the tokens are not the same set. THE TRANSITION CELL IS
    STILL A MEMBER and its role is now precise: since
    →[compare-excludes-transition] makes `"transition"` unrepresentable
    as a compare KIND, the lane no longer stands in for a missing type
    guard — it asserts the RUNTIME disposition the type cannot reach,
    that an op id consumed by a transition ROW answers `op_id_collision` — PLUS the ACTOR PATH'S RECIPROCAL, which is this
    family's and had no owner before: opening the store's `findOp`
    whitelist (→[findop-whitelist]) means HANDLE's own idempotency rung
    can now RETRIEVE a DECISION_MADE or WAIT_RESUMED row under an
    actor's op id, where before the whitelist rejected it at the store.
    The rung must answer `op_id_collision`, and a lane stages exactly
    that — an actor envelope replaying an op id an operator intent
    consumed. Owner Q15.
  - **4. Pending-request family** — drives Q4 and →[pending-read-route],
    →[pending-absent-throw]. Discipline: the recommendation the override
    guard reads is asserted EQUAL to the one on the committed
    DECISION_REQUEST row (not merely present), and the corrupt-history
    direction is driven — a WAITING(`human_decision`) instance whose
    correlation rung passes but whose request row is absent must THROW
    kernel-integrity and commit nothing. MEMBERSHIP: the two directions,
    owner Q4.
  - **5. Persistence family** — drives dimension 13 and →[new-variants],
    →[no-second-bump]. Discipline: each new class round-trips with its
    body byte-asserted in canonical form and its SNAKE keys asserted; the
    per-class column iff is driven as an EQUIVALENCE in both directions
    for both classes; and `SCHEMA_VERSION` is asserted BYTE-UNCHANGED,
    which is the lane that reds if a build reaches for a second bump.
    MEMBERSHIP: the entry classes existing after this packet × the six
    per-class columns, PLUS the commit member's own three results
    (`duplicate_op` and `op_id_collision` from the in-transaction
    re-check, `cas_conflict` from the CAS) and the rollback that leaves
    NOTHING of a failed two-row commit, owner Q2.
  - **6. Override family** — drives dimensions 5, 6, 7, 8 and
    →[own-property-indexes] (the submit's `decisions[verdict]` index) and
    →[override-two-causes], →[override-absent-not-false]. Discipline: the
    truth table is driven at all SIX cells — four `against` × `override`
    combinations with the ¬against half split by its TWO causes (no
    recommendation recorded; agreement with the one recorded); the
    key-scoped guard ORDER is driven by a COMBINATION lane (an unknown
    verdict WITH an inapplicable override must answer `unknown_decision`);
    the empty set is driven at every member C15 closes, INCLUDING the
    whitespace case that must NOT be trimmed; and `override`'s absence is
    asserted as ABSENCE, never as `false`. ONE HOSTILE KEY joins the set:
    a verdict spelling a prototype member name must answer
    `unknown_decision`, which an unguarded index answers with an
    inherited member instead — the lane that makes the own-property
    obligation falsifiable rather than stated. MEMBERSHIP, a SUM rather than a cross-product because the guard
    ORDER shadows the crossing: dimension 7's six cells PLUS dimension
    6's six cells PLUS its seventh discriminating cell PLUS the
    Ask-vs-guard cross-assertion on one fixture
    (→[shared-required-fields]) PLUS the HOSTILE VERDICT KEY cell
    (→[own-property-indexes]) — both named in the MEMBERSHIP and not only
    in the discipline above, because a lane
    living only in prose is never scheduled by the build-close
    sensitivity pass, and that rule applies to this family's own
    discipline sentence exactly as it applies to a Q row. The ONE deliberate crossing is the existing
    guard-order combination lane; a full 6×6 would answer
    `missing_required_field` in some thirty lanes regardless of their
    override coordinate — enumerable, but not falsifiable on that axis.
    Owner C15 and C16.
  - **7. Round-and-handoff family** — drives dimension 9 and
    →[clear-is-named-vacuous], →[handoff-delivery]. Discipline: round
    advancement is driven on a fixture where the VERDICT NAME and the
    TARGET's flag DISAGREE — an `approve` whose target advances and a
    `request_rework` whose target does not — which is the authorable
    shape that kills a verdict-name build. The shape it is NOT is two
    decisions on the same target with different flags: the admitted flag
    is expanded from `round.advanceOnArrivalAt`, a flat set of TARGETS,
    so two edges into one target always carry the SAME flag and that
    fixture cannot exist — and the rework
    target's first dispatch packet is asserted WHOLE, carrying the
    submitted payload as its handoff with no stale value beside it.
    THE RUNNER LEG IS THIS FAMILY'S TOO, named because Q6's second
    dispatch producer had no owning membership: the decision handler is
    the SECOND site that produces a dispatch handoff, and the runner's
    delivery loop is the consumer that must see it. A lane drives the
    handoff from the DECISION path through the runner to the actor
    adapter and asserts the delivered packet, which is the only place
    the two producers' outputs can be compared for shape.
    MEMBERSHIP: advancing × not, PLUS the runner leg, owner C17 and Q6.
  - **8. Resume-guard family** — drives dimension 11 and
    →[own-property-indexes] (the resume's `onResume[type]` index) and
    →[shape-guard-two], →[resume-kind-source]. Discipline: the
    wait-shape guard is driven at BOTH of its REACHABLE inhabitants — a
    `humanGate` park and a `kickoff_pending` hold with its null position,
    each entered on an event its own earlier rungs admit (a declared
    decision key; `KICKOFF`) — and the ACTIVE-agent-step case is driven
    to answer `not_waiting` at the STATE rung INSTEAD, which is the lane
    that proves the guard's reach is bounded by the ladder rather than by
    the guard; `no_resume_transition` is driven from an ADMITTED
    template declaring a resume event with no route, so the lane proves
    admission really permits the shape; and the rung-order outcome is
    driven — a MISMATCHING event on a decision wait answers
    `resume_event_mismatch`, never `not_bare_wait`. **THE HOSTILE RESUME
    KEY IS THIS FAMILY'S**, because the resume index is reachable with
    one: `resumeEvents` members cite the ordinary id class, which admits
    `constructor`, and a declared member with NO `onResume` route is
    admissible BY DESIGN — the format says so in place, to keep
    `no_resume_transition` reachable. So an admitted template declaring
    `resumeEvents: ["constructor"]` over an empty `onResume` passes the
    correlate rung and REACHES the index, where an unguarded read answers
    with an inherited member instead of the refusal. MEMBERSHIP: the two
    reachable guard inhabitants PLUS the correlation-shadowed gate cell —
    a decision wait met by a MISMATCHING event, which never reaches the
    guard — PLUS the two routing cells PLUS the hostile-key routing cell
    (→[own-property-indexes]), owner C18,
    with the state-rung-shadowed case named and driven at its own rung.
  - **9. Completion family** — drives dimension 10's terminal cell and
    →[double-completion]. Discipline: completion is driven from a
    DECISION arrival and from a RESUME arrival — both newly reachable —
    and the double-completion assert is driven to THROW by a DIRECT unit call
    on the arrival with an already-TERMINAL instance — the only way to
    reach it, since every entry path's state rung forecloses that state —
    and the lane is labelled a defensive bar rather than an entry-path
    lane, with NO committed-state assertion, because a direct call
    commits nothing. MEMBERSHIP: the two newly-reachable completion paths
    plus the defensive assert, owner Q8.
  - **10. Wire family** — drives dimension 12 and →[keyset-not-presence].
    Discipline: each intent's keyset is driven CLOSED (an unknown key
    reds); and the presence boundary is driven by asserting the KERNEL's
    name at the far end — an intent with NO `expected_version` answers
    `missing_version` and one with NO `by` answers
    `operator_not_authorized`, neither being an ingress refusal. Each new
    gate block's DETAIL TOKEN is asserted on the emitted diagnostic
    event's FIELD, never by message containment. MEMBERSHIP: the two
    keysets' members plus the two presence cells plus one lane per new
    gate block — AND Q19's NUMERIC block is the one place that count is
    not one, named here because a lane living only in a Q row is never
    scheduled by the build-close sensitivity pass: ONE lane suffices only
    if the four refusal cells are EXTRACTED into a shared helper both
    wires call, and the lane then asserts the shared call SITES
    STRUCTURALLY — importing the exported helper and corpus-scanning the
    ONE ingress production module for BOTH of them — the idiom
    `v3/src/drift/intentNarrow.test.ts` already uses (it is NOT family
    17's, which is this packet's compile-negative family and scans
    nothing; the live scanner is p2a's). **THE TWO WIRES ARE NOT TWO MODULES**, stated because
    a lane written for two would be unauthorable: the envelope path
    (`parseEnvelope`) and
    the operator-intent path (`submitIntent`'s keyset branch) both live
    in `v3/src/ingress/ingress.ts`, and `ingress/index.ts` is a barrel
    that re-exports it. The lane therefore identifies TWO CALL SITES
    inside one file rather than one reference in each of two files —
    which is what makes a single lane enough. A BEHAVIOURAL lane
    driving one refusal cell through the new wire does NOT suffice, and
    is named as insufficient rather than left to look adequate: it cannot
    distinguish a shared helper from a faithful copy, which is the only
    thing the extraction exists to prevent; absent the extraction the block carries
    ALL FOUR cells, because a copy that drops `Object.is(v, -0)` passes a
    single lane while admitting the value the round-trip flattens.
    Owner C9, and Q19 for the numeric block.
  - **11. Replay-closure family** — drives dimension 14 and
    →[own-property-indexes] (Q11's two replay lookups) and
    →[three-blind-readers] (an id that predates the fourth reader; the
    RULE it points at is Q11's, whose scope is all four). Discipline:
    **THE TWO AXES ARE DRIVEN SEPARATELY, because one obligation cannot
    cover both.** THE THREE POSITION-blind readers — the terminal-sink
    walk, the round reconstruction, and the PRODUCTION policy view — are
    each driven over a history containing a decision-routed AND a
    resume-routed arrival, the policy view with a GATED template that
    crosses a `humanGate` and then commits a gated transition, which is
    the only shape that reds on the un-fixed reader. Each POSITION reader is additionally
    driven to REJECT a corrupt history (an arrival whose key resolves to
    no target), so the fix does not become a skip. **THE FOURTH READER
    NEEDS ITS OWN NEGATIVE LANE and gets one**, because that anti-skip
    instrument is written in a position reader's vocabulary and is
    meaningless for a checker that replays no positions: a build can
    discharge the re-base by DEGENERATING the check — reporting nothing
    whenever the transcript carries an op-less row — and the golden trace
    then goes GREEN, satisfying every other lane named here while
    silently removing version arithmetic from every future trace. The
    lane hands `checkVersionArithmetic` a detail whose transcript carries
    a park (TWO rows, ONE commit) and whose `version` is deliberately off
    by one, and asserts it REPORTS a violation. A degenerate skip returns
    empty and REDS it; the correct commit-count re-base passes.
    MEMBERSHIP: the FOUR blind readers × the two
    new row classes — three position-blind, each driven positively by the
    arrivals and negatively by the corrupt history, whose non-resolving
    key is a PROTOTYPE MEMBER NAME rather than an arbitrary miss
    (→[own-property-indexes]), pinned in the MEMBERSHIP because a fixture
    keyed on `zzz` satisfies the discipline sentence while leaving both
    replay indexes unguarded; and one
    row-count-blind, driven positively by the golden trace going green
    under the checker kit and negatively by the off-by-one park lane —
    PLUS the op-uniqueness
    checker's skip-scoping cell, owner Q11.
  - **12. Drift family** — drives Q12 and →[flip-both-halves].
    Discipline: the two flipped rows are pinned VERBATIM to their
    realized type names AND bound in the registry's type table, so a
    renamed witness is a COMPILE error and not a stale string; the six
    unit-map rows are addressed FULLY QUALIFIED; and the 54-name
    rejection registry is read at both ends of the build and compared.
    MEMBERSHIP: the two `l3` registry rows and the six unit-map rows,
    owner the registry and the unit map themselves — read at build rather
    than transcribed.
  - **13. Confinement family** — drives Q16, Q10 and →[confinement-set],
    →[payload-presence-bit]. Discipline: the confinement is driven in its
    two OWNED directions — the decision `payload` PRESENT on the store row
    and ABSENT from the bundle row, under BOTH shipped policies so the
    uniform omission is proven rather than assumed — with `hasPayload`
    asserted beside it in BOTH states, since a silent omission and a
    declared one are the two things the bit exists to keep apart. The CLI
    documents are DRIVEN, not merely named: a timeline containing both
    new classes is serialized and the classes are asserted to survive the
    document whole. MEMBERSHIP: the store-row and bundle asymmetry with `hasPayload` in
    BOTH states under BOTH policies, PLUS the CLI documents' content
    reachability. The OTHER surfaces Q16's confinement set names are
    deliberately NOT re-driven here — the diagnostic channel's op-id
    carry is family 16's and the dispatch handoff is family 7's, each as
    BEHAVIOUR rather than as a confinement classification — which is why
    this reads as a list and not as "every surface Q16 names". Owner Q16.
  - **14. Re-park family** — drives dimensions 15 and 16, the two cells
    p2a declared construction-unreachable, AND dimension 4b, which is
    C13's widening arriving here rather than a p2a leftover. Discipline: a decision routing
    back to the SAME gate mints a FRESH `request_ref`, and a submit
    citing the OLD one is REFUSED by the correlation rung — the assertion
    that a build reusing the ref passes; and a decision- or resume-routed
    arrival into a gate is asserted to record NO recommendation and NO
    source, which is C13's first absence branch reaching an inhabitant
    for the first time. AND the re-park's own `context_ref` is asserted to carry
    the SUBMITTED payload rather than the pre-gate transition's, which is
    dimension 4b's FIRST cell; the MIDDLE cell is the payload-LESS
    submit, whose `context_ref` is asserted ABSENT rather than recorded
    as an empty object, and that is the cell an empty `arriving` passes
    everywhere else. The two are named APART because a build reading one
    sentence as both authors cell 1 twice and leaves the `{}`-as-present
    shape undriven.
    **THE RE-PARK'S RETURNED ASK IS THIS FAMILY'S, named because no other
    family reaches it**: family 15's two trace legs do not re-park, and
    family 1 asserts committed state only, so two NON-THROWING wrong
    builds are green everywhere else — an Ask assembled from the
    PRE-arrival instance, which reads a stale wait (Q1's named failure),
    and an Ask carrying the OLD `request_ref` while the committed row
    carries the fresh one, so the operator is handed an Ask citing a ref
    the correlation rung would already refuse. The lane asserts the
    RETURNED Ask's `requestRef` EQUALS the freshly committed
    DECISION_REQUEST row's, together with its `expectedVersion` and
    `allowedDecisions` — which is what makes Q1's five selection
    arguments an observable on the one path that can see them.
    MEMBERSHIP, a SUM rather than a cross-product because the REF AXIS
    EXISTS ONLY ON THE SUBMIT WIRE — a resume intent's keyset is
    `instanceId, opId, expectedVersion, type` and carries no
    `requestRef` at all, so crossing the ref states with the resume cell
    names four lanes nobody can author: `{re-park, first-park}` ×
    `{fresh ref, stale ref}` on the SUBMIT path — four cells, and
    `first-park × stale ref` is named as a NEVER-VALID ref rather than a
    superseded one, because a first park has no earlier ref to supersede
    and the two answer the correlation rung for different reasons — PLUS
    dimension 4b's three source cells PLUS the re-park's returned Ask
    PLUS the two non-agent source classes, owner Q1.
  - **15. Trace family** — drives Q14, Q13 and →[trace-checker-binding]. 
    Discipline: BOTH legs run through the REAL walking skeleton from the
    INGRESS, each asserting its committed-row sequence and final state as
    a whole-value expectation, with the post-condition checker kit
    applied — which is what binds families 11 and 9 to the same run. The
    harness's two new step kinds carry their own typed `expect`, and a
    fixture whose expectation does not match reds on the OUTCOME lane
    rather than on a later state read. THE HANDLERS' RETURNED OUTPUT IS
    ASSERTED HERE and not only their committed effect, because Q1 fixes
    that both handlers return `Committed(version, post_commit_output(…))`
    and no other family reaches the return value ON THESE LEGS: each leg
    asserts the returned version AND the `post_commit_output` payload
    whole, AS THE LEG ACTUALLY PRODUCES IT — Leg A's decision handler
    returns NONE (it routes to a bare wait) and its resume handler
    returns NONE (terminal); Leg B's decision handler returns a
    `DispatchIntent` whose handoff is the submitted payload. **NEITHER
    LEG RE-PARKS, so this family does NOT carry the re-park's returned
    Ask** — an earlier form of this clause claimed it and had no
    inhabitant in either fixture. That cell is family 14's, which is
    where the re-park is staged. MEMBERSHIP: the two legs ×
    {committed sequence, final state, returned output}, owner C25.
  - **16. Diagnostic-classification family** — drives Q18. Discipline: a
    STALE operator intent emits `stale` carrying `currentVersion` from
    the OPENED wrapper, and a CAS-restarted one emits `cas_restart` PER
    RESTART from its own handler's loop — the two are driven separately
    because they are produced by different mechanisms, and a build that
    tried to source `cas_restart` from the wrapper emits nothing, which
    is what this split lane catches. Both are asserted on the recorded
    event's FIELDS, never by message containment. EVERY RIDER of the
    shared wrapper is asserted UNMOVED — its emitted event set
    byte-identical before and after. MEMBERSHIP: the two arms × their two
    producing mechanisms, plus the wrapper's FULL rider set as the
    no-move control — enumerated from its call sites at build, never from
    a count in this packet, owner Q18.
  - **17. Class-separation family** — drives Q9's invariant home and
    →[nominal-intent-key]. Discipline: the disposition is TYPE/SCHEMA, so
    the lane is a COMPILE-NEGATIVE — an `EventEnvelope` value handed to
    either operator intent's KERNEL-SIDE input type must FAIL to
    typecheck. ITS SENSITIVITY IS STATED AT THE GRAIN IT ACTUALLY
    REACHES: removing the member, or making it optional, makes the
    negative PASS and reds the lane; widening it from a literal to a
    plain `string` does NOT, because an envelope carries no `intent` key
    at any type. That widening is covered by its own cell — a
    WRONG-LITERAL intent value must also fail — so the two cells together
    cover removal, optionality and widening. MEMBERSHIP: the two intent
    types × {envelope value, wrong-literal value, well-formed intent},
    owner C15 through Q9.
- Drift tests green (standing, unconditional — PI-3)
- Standing review rules in force: **REV-A1-TXN** (each handler's row
  append and its CAS commit under ONE transaction boundary — the same
  boundary the arrival's effect rides), **REV-C-PROJECTIONS-READONLY**
  (the floor and the bundle read the two new classes and write nothing),
  **REV-E-NO-ADAPTER-BRANCH** (nothing branches on a concrete adapter
  type, and Q10's uniform omission is what keeps the bundle from
  branching on a policy's identity), **REV-DIAG-FAILOPEN** (every emit stays
  BARE; the wiring itself is Q18's, because "ride the existing
  classification" is exactly what these two handlers cannot do), and
  **REV-SYNC-LADDER** — the carrier for flag 6's ratified
  constraint, which otherwise had none: `admitLoaded` stays SYNCHRONOUS
  and its arity stays TWO, so no rung may `await` and no third parameter
  may join. A review rule is not its only guard — the build binds
  `admitLoaded(...)`'s result to a variable typed as the synchronous
  outcome union, which stops typechecking the moment the ladder goes
  async. THE ARITY HALF NEEDS ITS OWN PIN, and Q3 carries
  which one, and why neither obvious candidate suffices: A13's `.length`
  lane catches a bare optional third parameter but not a DEFAULTED one,
  and a `const` of the two-parameter function type catches neither. What this rule adds is that the pin is an
  OBLIGATION a reviewer checks, not a sentence in a row. And
  **REV-NO-KEY-MEANING** — the carrier this packet MINTS, because the
  `decisions-carry-no-lifecycle-meaning` invariant's disposition is
  REVIEW and a review disposition with no named rule in this list is a
  mood rather than an obligation. Its subject, from Q1: no branch
  anywhere downstream of the ChoicePoint selection reads the DECISION
  KEY or the EVENT TYPE to decide what happens — every branch is
  selected by the TARGET's class. Family 1's cross-path lanes are the
  evidence a reviewer checks it against. **BOTH NEW RULES ARE PACKET-BORN AND PACKET-LOCAL, NOT REGISTRY
  ADDITIONS, and the distinction is stated because the wrong one of the
  two would owe an edit this boundary does not carry.** The `REV-*`
  REGISTRY lives in `task-packet-template.md` §3, which holds FIVE
  standing rules — the four in force above plus
  `REV-B-LOCAL-NOT-AUTHORITY`, and NEITHER of the two minted here — and
  is NOT in this packet's mutation boundary; a rule
  declared *standing* in the registry sense would therefore be a rule
  the build cannot register. The live precedent is
  `REV-BUNDLE-DEFAULT-POLICY`, born in `ch6-p3` as "born here, enforced
  at the P4 review", named in FOUR later packets (`ch6-p4a`, `ch6-p4b`
  — where its Standing-review line records it CLOSED — `ch7-p3` and
  `ch7-p4`), and never entered into §3. These two follow it exactly: BORN HERE,
  ENFORCED FORWARD AT ch14-P3, and CLOSED there — RE-DECIDED at
  `ch14-p3a`'s flag 3 when `ch14-P3` was split: ENFORCED at each part
  and CLOSED at `ch14-p3b`, the chapter's last packet, whose W1
  discharges both. The re-decision is recorded here, where the forward
  obligation lives, and it moves nothing else in this block (carried by
  ch14-p3b's build, bookkeeping-only). The two go forward with DIFFERENT reasons
  for the same point, stated apart because one rationale does not cover
  both. `REV-NO-KEY-MEANING` goes to P3 because P3 adds the two operator
  CLI verbs and the shipped template wiring, which is the most likely
  place a downstream branch reads a decision key. `REV-SYNC-LADDER` has
  no such site at P3 — its subject is `admitLoaded`'s signature, which
  P3 does not touch — and it rides there as BELT-AND-BRACES over two
  MECHANICAL guards that carry it in the meantime: the typed binding
  that reds on an async ladder and the type-level arity pin. Its P3
  closure is a confirmation that neither guard was removed, not the
  guard itself. THE LETTER IS DROPPED ON
  PURPOSE: every letter-bearing `REV-*` id names the IC item it
  supplements (`A1`, `B`, `C`, `E`), `IC-N` is the ADR gate and has
  nothing to do with either rule, and the two existing rules with no IC
  anchor — `REV-DIAG-FAILOPEN` and `REV-BUNDLE-DEFAULT-POLICY` — both
  drop the letter too.

## Build record

<Filled at build close. The gate-1 record below is written at the gate,
not at close, so it survives a lost session — the loop's own
`memory-may-accelerate-never-carry` rule applied to itself.>

**ARM GATE 1 — the pre-build external arm on the approve-ready bytes
(README §5.5, mandatory; no waiver). CLOSED `approve`.**

Transport: the `gptsol` agent, the arm-pin's CURRENT primary (ch13
boundary row); `arm_run.sh` not needed. TIER, recorded under the ch13
tier-record rule rather than asserted: the pin REQUESTS
`gpt-5.6-sol / high`, and each run's own header reported exactly that —
but this transport self-reports rather than presenting a runner-validated
header, so requested-vs-actual is not machine-confirmed here. Byte guard
reproduced BY HAND on this transport (HEAD, target sha256, porcelain,
`git diff --binary HEAD`, untracked path+content) before and after every
run: CLEAN on all three, no divergence in any measurement.

Three runs, each citing the basis it verified:

1. `a871c4c3…` → REFINE, two findings, both folded. **P0:** the
   drift-suite clause still said "a packet adding three files" after the
   creations count moved to four — a stale neighbour the authoring loop's
   own round-7 sweep missed. **P1:** family 10's structural lane required
   asserting that "BOTH wire modules" reference the shared numeric-refusal
   helper, but there is ONE ingress production module: `parseEnvelope` and
   `submitIntent` both live in `v3/src/ingress/ingress.ts`, and
   `ingress/index.ts` is a barrel. The lane was unauthorable as written;
   it now identifies two CALL SITES inside one file.
2. `beb15982…` → both LANDED; one NEW P2, folded: the same lane cited
   "the idiom family 17 already uses", but THIS packet's family 17 is the
   compile-negative class-separation family and scans nothing — the live
   corpus scanner is `v3/src/drift/intentNarrow.test.ts`, which names
   itself packet ch14-p2a's family 15.
3. `2abca767…` → LANDED, NO new findings, **`approve`**.

THE CITED HASH IS OF THE SPEC SURFACE, NOT OF THIS FILE, and saying so is
not pedantry: writing this record into the Build record necessarily moved
the file's hash away from the one the record cites, so a later reader who
hashes the packet and compares will find a mismatch and cannot tell
whether the SPEC moved. It did not. `2abca767…` is the sha256 of
everything above `## Build record` plus that heading and its original
`<Filled at build close.>` placeholder — reproducible, and reproduced at
build close before the build's bytes were accepted. The build agent hit
this same wall from the other side and reconstructed it independently.

---

**EXECUTION CONTEXT — named because §4 says the choice is never silent.**
FRESH-CONTEXT DELEGATED BUILD, the §4 default. The subagent executed
steps 1–3 (read the spec, TDD, implement) against the packet alone; this
context retained orchestration, the full verification chain, both §5.5
arm gates, and the one-packet-one-commit boundary. THE AUTHOR/GATE
CONTEXT HAD STARTED BUILDING AND ITS BYTES WERE REVERTED before
delegation — about 156 lines of domain and port work, correct as far as
it went — because §4's decorrelation ground says the context that
authored and gated a packet does not build its own bytes, and because a
clean fresh build is the live test of the packet's self-containment
claim. Contaminating that test to save twenty minutes would have spent
the thing the delegation exists to measure.

GUIDANCE NOTES HANDED OVER, four, all recorded here: (1) the compiler's
own work list, with the measured 13-literal / 7-file / one-union-site
census and the warning to re-derive it by RUNNING the change; (2) a
build order; (3) Q3's realization note restated, with the trap that
collapsing the authority group's two absences turns HANDLE's
`missing_role` into an `accepted`; (4) the loader duty's two refusals —
no export from `kernel.ts` (import cycle), no third copy. The
DELEGATION-PROMPT RULE was applied in full: the seventeen family
disciplines went over VERBATIM, with the instruction to RAISE the
existing tests to the declared level, and with the nine families that
bear on already-existing tests named — preserve-don't-weaken is
insufficient exactly where a packet's point is stronger proof.

**THE SELF-CONTAINMENT CLAIM HELD.** The build ran from the packet with
no access to this session's reasoning, and its two independent
measurements reproduced the packet's predictions exactly: the census
(13 literals across the 7 named files, one of them the
`Pick<StorePort, …>` helper, plus the single union site at the debug
bundle's row projection) and the four declared creations. Nothing was
un-buildable.

**TWO JUDGEMENT CALLS THE BUILD COULD NOT MAKE ALONE, ruled here.**

*The harness seam is OPTIONAL, not required.* Q13 decided WHICH seam —
the ingress's `submitIntent`, not the kernel handlers — and left its
realized shape open. A REQUIRED seam would have forced five files
outside the ratified 48-file boundary (four existing traces and the dev
CLI). RULED: optional, on the tree's own `resolveEvidence?` precedent,
with a loud throw when a fixture drives an operator step without wiring
it. Q13's GROUND survives intact, which is the test that matters: the
`l3` trace still drives through the ingress, so the chapter's one
end-to-end proof still exercises the wire keysets. A ratified boundary
outranks an unstated preference for a required field.

*Family 17's home is INTO the existing scanner, not beside it.* The
test-homes list reads "joins the drift directory beside the existing
intent-narrow scanner", which admits a new file — but the boundary
declares five drift entries, all existing, and the creation count is
four with no drift file among them. Only the INTO reading keeps the
packet's own machine block true, and the build took it. RULED CORRECT,
with one correction made here rather than left: `intentNarrow.test.ts`'s
header named only p2a's family 15 while the file had gained p2b's
family 17 compile-negatives and family 10's shared-call-site lane. That
is the same defect class this packet makes a NAMED DUTY for
`admission.ts` — a comment describing an absent thing is how the next
reader concludes it is still absent — so the header now names all three.

**THREE REALIZATION DELTAS the build reports and this record keeps.**
The store's `opLess` predicate SPLIT in two (`opLess` for the op-id
partition, `bodyBearing` for `entry_body`) exactly as Q2 requires, since
after this packet those are different partitions. The ladder's
reject-name union became GENERIC — the compiler refused a flat union
because each path's outcome carries only its own rungs' names — with
`unknown_instance` riding `admitInput`'s own result; Q3 explicitly left
that five-or-six shape to the build. And `lifecycle.ts`'s byte-identical
loader copy was NOT consolidated: the file is outside the boundary, so
the shared module plus the pre-existing copy leaves two, as before, and
the consolidation stays available to whichever packet owns that file.

**VERIFICATION, re-run in this context rather than taken from the
build's report.** `v3:typecheck`, `v3:lint`, `v3:packet-lint`,
`v3:deferred`, `v3:adr-check`, `v3:realized-map`, `v3:check-docs` all
green; `v3:coverage` green in its STRICT mode now that the six unit-map
rows are flipped. 81 test files / 2982 tests, from 79 / 2847. Boundary
discipline measured: 41 files touched, ZERO outside the declared 48,
exactly the four declared creations present. All three
`DEFERRED(ch14-p2b)` markers removed; `SCHEMA_VERSION` byte-unchanged at
`"6"`; the rejection registry still 54 names.

**EXISTING TESTS RAISED TO THE DECLARED LEVEL**, the delegation rule's
whole point, named one by one: `admission.test.ts` (helper and all
eighteen lanes rewritten to the opened expectation shape with every
outcome asserted byte-unmoved — family 2's no-move control now MEASURED
outcome by outcome rather than resting on the old "HANDLE passes
neither" claim; the A13 lane re-titled because its stated reason went
false, and given a second type-level arity lane); `admission.ts`'s
correlate doc-comment corrected, which was Q3's named duty and the
test-side twin of that re-title; `domainRegistry.test.ts` and
`unitMap.test.ts` (the "stay pending" lanes REPLACED by flip assertions
plus a no-row-left-pending sweep, not merely extended); and
`storeCheckers.test.ts`, `gateProjection.test.ts`, `sqliteStore.test.ts`,
`deliveryLoop.test.ts`, `debugBundle.test.ts`, `cli.test.ts`,
`ingress.test.ts` and `diagEmission.test.ts`, each gaining its family's
lanes at the declared strength.

Two guards caught the build mid-flight and were FIXED rather than
weakened, which is the behaviour the delegation rule exists to produce:
the drift corpus scanner rejected a bare `as HumanDecisionRequest` cast
in the trace (narrowed on a discriminating field instead), and family
16's rider enumeration initially mis-parsed parameter lines as
declarations.

---

**ARM GATE 2 — the build-close implementation review with its MANDATORY
SENSITIVITY PASS (README §5.5, mandatory; no waiver). CLOSED.**

Transport and tier as at gate 1: the `gptsol` agent on the pin's current
primary, header reporting `gpt-5.6-sol / high`, recorded as the
transport's self-report rather than a runner-validated header. Byte guard
by hand before and after: clean, no divergence.

VERDICT `refine`, citing commit `5a11e433`, with EIGHT findings — every
one of them the same class the sensitivity pass exists to find: a lane
GREEN BUT BLIND under a correct-looking packet lane text.

**THE PROBE PROTOCOL IS WHY ONLY THREE OF THE EIGHT WERE FOLDED.** §6
requires that any lane the arm flags "plausibly blind" gets an EXECUTED
mutate-run-restore verification BEFORE its fold is recorded — "plausibly
red" becomes "observed red" exactly where the arm's reasoning could err.
Nine probes ran through `tools/v3-plan/probe_runner.py`, every one with a
green baseline and a byte-verified restore. The result vindicates the
requirement: **three confirmed, five refuted.**

CONFIRMED BLIND (the mutation was applied, the full suite ran, and it
STAYED GREEN): the `unknown_instance` load cell on both operator paths;
the per-class column iff, where deleting the `gate_decisions` check from
the mapper's operator branch changed nothing; and the shared diagnostic
wrapper's rider set, where a spurious `stale` emit on `kickoff` slipped
through untouched.

REFUTED (the suite went RED — the lane already drives it): the committed
verdict's readback, the compare-kind domain (tested at the arm's own
NARROW shape as well as a broader one), the wire's far-end kernel name,
and Leg B's returned dispatch. A fifth, the `hasPayload` bit under a
second redaction policy, was refuted on STRUCTURAL grounds rather than by
probe: the bit is computed from the entry before any policy is in scope,
so the divergence the arm described is not authorable at all.

Had the findings been folded on the arm's reasoning, five lanes would
have been rewritten to close holes that were not open, and the suite
would have grown without a single real gap closing.

**AN INSTRUMENT NOTE WORTH KEEPING:** the first probe run used a wrong
test command and the runner's GREEN-BASELINE GATE stopped it BEFORE any
mutation, recording `baseline: RED — instrument broken, receipt would be
vacuous`. That gate was minted after eleven probes in an earlier chapter
all ran against an already-red baseline and produced eleven vacuous
receipts. It earned itself again here.

**THE FOLD, tests only — no production byte changed.** The three measured
lanes were closed, and three MEMBERSHIPS the arm showed to be sampled
rather than enumerated were filled: family 1's twelve `target class ×
entry path` cells (with the packet's own carve-out kept — the two cells
that cannot discriminate `issuedAgentConfig` carry no config assertion),
family 3's compare-kind grid over both operator paths plus the actor
reciprocal for BOTH new classes, and Leg B's returned output asserted
whole to match Leg A's. Under-enumeration is not blindness and a probe
cannot decide it; the membership clause is the packet's ratified test
surface, and reading the built bodies against it is the only instrument
there is.

**RE-VERIFIED BY RE-RUNNING THE THREE PROBES**, which is the only proof
that matters here: each mutation that previously left the suite GREEN now
makes it RED. The findings are closed by measurement, not by assertion.

**THE RIDER COUNT CORRECTED ITSELF, and the correction is the argument
for the rule that produced it.** The arm said seven riders; the tree says
NINE, because this packet's own two handlers now ride the wrapper too.
The aftermath enumerated them from the `lifecycleOp(` call sites rather
than from any document — which is exactly why Q18 and family 16 were
rewritten during review to forbid a count in this packet and to require
enumeration from the call sites. A number written down here would have
been stale before the build finished.

Final: 81 test files / 3045 tests (from 2982); typecheck, lint, coverage,
packet-lint, deferred, adr-check, realized-map and check-docs all green.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": {
      "predicted": "projection",
      "reasoning": "inherited from plan §14.4's ch14-P2 row through the split; basis the ratified ch14-human-decision contract",
      "discovered": "projection"
    },
    "provenance": {
      "anchored": 6,
      "derived": 6,
      "new_decision": 7
    },
    "rounds": {
      "review": 8,
      "doc_refinement": 0,
      "implementation": 2
    },
    "stops": [
      {
        "type": "4:flagged-approve",
        "what": "nine pre-approval flags, seven approve-ratified, resolved one at a time",
        "resolution": "approved, with flag 2 AMENDED by the ratifier: the idempotency compare's kind parameter became Exclude<TranscriptEntry[\"entryKind\"], \"transition\"> — the auto-extension the bare discriminant was chosen for, kept, with the dangerous value made unrepresentable instead of guarded by one lane"
      }
    ],
    "detector_misses": [
      {
        "found_at": "arm-approve",
        "what": "family 10's structural lane required proving that BOTH wire modules call a shared helper, but both wire paths live in one module (ingress.ts holds parseEnvelope and submitIntent; ingress/index.ts is a barrel) — the lane was unauthorable as written",
        "why_missed": "seven internal panel rounds and a reconciliation pass all checked the packet against ITSELF; a packet can be perfectly consistent about a module it invented"
      },
      {
        "found_at": "arm-approve",
        "what": "the same lane cited 'the idiom family 17 already uses' for a corpus scan, but this packet's family 17 is the compile-negative family and scans nothing — the live scanner names itself ch14-p2a's family 15",
        "why_missed": "a plausible name reads as a verified one; the number and the family both existed, only the pairing was invented"
      },
      {
        "found_at": "implementation",
        "what": "the packet_metrics block was absent at build close and the build commit landed without it — caught only by the post-build audit's own check, after the build and its aftermath had both been committed",
        "why_missed": "the close sequence ran the full gate chain but not the post-build audit, which is a SEPARATE invocation taking a commit sha; the block is the one obligation that cannot be satisfied before the commit it must appear in"
      }
    ],
    "learned": "a command that measures something adjacent to the claim reads as verification and survives review far longer than an ordinary error — ten instances in this packet's rounds, from a test count carried out of a summary to a runtime property asserted from a typechecker run",
    "main_thread_model": "claude-opus-5[1m]"
  }
}
```


Evidence gaps: none. `v3:typecheck`, `v3:lint`, `v3:test` (79 files /
2847 tests), `v3:packet-lint` and `v3:deferred` all completed in the
arm's environment. `v3:coverage`'s STRICT mode fails on a pre-build tree
by design — the six packet-owned unit-map rows are `pending` until the
build flips them — and the correct pre-build gate point,
`check_coverage.py --fold-time`, passed; the arm verified this itself
rather than taking it from the prompt.

WHAT THE GATE BOUGHT, recorded because it is the argument for its cost:
three findings that seven internal panel rounds and a reconciliation pass
did not reach, and all three of the same kind — claims about the SHAPE OF
THE TREE rather than about the packet's internal coherence. The internal
lenses were checking whether the packet agreed with itself; the arm
checked whether it agreed with the repository. Two of the three named a
structure that does not exist (two wire modules; a corpus-scanning family
17), which is the failure mode that survives internal review most easily
because a plausible name reads as a verified one.
