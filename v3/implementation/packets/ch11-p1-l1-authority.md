# Task Packet: ch11-P1 — the L1 authority slice (warrant `expected_role` · admission consolidation with the live state rung · capability gate · the l1 golden trace · dev `inject` + operator `submit` extension)

Plan step: plan.md §11.4 P1 row (realizes §11.1 item 1; §11.2's l1
coverage share). The chapter's draft
(`contracts/ch11-gate-format-contract.md`, ratified 2026-07-12) is
NOT anchored by this packet — P1's content is a pure ledger
projection with no format surface (plan §11.4 process note); no
draft row is touched or disposed here. Plan alignment (R-ALIGNED-UP,
propagation-class): the §11.4 P1 row's content list gains the
operator `submit` role flag — the mandatory role's transport closure
on the shipped write surface (matrix O) — marked "aligned at ch11-p1
pre-approval"; the prepared plan edit lands in the SAME commit as
this packet (the boundary carries `plan.md`).
Autonomy stage: measurement — FLAG-BEARING approve: the O1
new-decision row rides as pre-approval flag 1, so the approve is
the HUMAN's (STOP `4:flagged-approve`, README §5.5; the arm's gate-1
review minted the reclassification — the autonomous path demoted
per AuthorPacket step 9.5). Not first-of-a-kind: the
kernel-admission/HANDLE-extension class has precedent (ch4-P3
realized the L0b ladder on the same seam).
Classification: **projection with ONE new-decision row** — manifest
tally: 25 anchored / 18 derived / 1 new-decision (machine-counted
from the `packet_rows` block). The new-decision row: O1 — the
operator `submit` role flag's required-at-parse form (arm gate 1,
2026-07-12, reclassified from derived: required vs optional
pass-through are BOTH conform to the anchors, so the pick is a
decision, not an entailment). Below the Case-B triggers (one row;
a CLI-surface ergonomics choice — no authority / separation /
availability-class semantics); it rides as flag 1 to a HUMAN
approve (the ch8-P1 E6 precedent). Every other row anchors to the
l1 unit texts, ledger §2/§3/§4, the 07-l1 section, ratified plan
text, or derives from them with an in-row note.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l1-pseudocode/HANDLE", "disposition": "implement" },
      { "id": "l1-pseudocode/RECEIVE", "disposition": "alias/inherited" },
      { "id": "l1-pseudocode/admit_loaded", "disposition": "implement" },
      { "id": "l1-pseudocode/capability", "disposition": "implement" },
      { "id": "l1-pseudocode/dispatch_intent", "disposition": "implement" },
      { "id": "l1-pseudocode/warrant", "disposition": "type/schema" }
    ],
    "rejections": ["missing_role", "not_active", "not_authorized", "role_not_authorized"],
    "invariants": [
      { "id": "l1/expected-role-mandatory", "disposition": "test" },
      { "id": "l1/authorization-before-commit", "disposition": "test" },
      { "id": "l1/capability-default-derived", "disposition": "test" }
    ],
    "traces": ["l1-pseudocode"],
    "shared_ownership": []
  }
}
```

Partial-realization dispositions (plan §11.2 — a projection-time
disposition call, not a scope change):

- `l1-pseudocode/RECEIVE` is `alias/inherited`: only the
  `actor_envelope → HANDLE` branch is live (the wired ingress); the
  operator-intent and kernel-event dispatch branches are
  L0d/L0e-inherited reprints whose targets are not yet realized.
- `l1-pseudocode/dispatch_intent`: the l1 delta (the `role` field
  handed out for echo) is realized; the L0c branch
  (`effective_agent_config`) and the L0e branch (`runtime_context`
  projection) stay unrealized — the realized function remains the
  ch-4 `deriveDispatchIntent`, extended with `role`.
- `l1-pseudocode/HANDLE`: the l1 delta (the consolidated admission
  call with the authority rung, the live state rung, the capability
  gate) is realized; the L0c-inherited `issued_config` /
  `issued_agent_config` transcript line stays unrealized (the ch-4
  baseline transcript shape is unchanged).
- `l1-pseudocode/admit_loaded`: the realized ladder omits the
  correlate rung's PARAMETER entirely (no realized caller can pass
  one — matrix row A13 carries the rule and its derivation); the
  rung arrives with kernel events (L0e+).
- `not_active` is l0d-born and driven HERE as the scoped-extension
  rule (plan §11.2); no l0d unit enters this slice — the name's
  behavioral realization rides the state rung (matrix row A4).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §11.4, recorded at the ch11 ratification):
**projection** (source: l1-pseudocode + ledger §2/§3). Discovered at
authoring: **projection** — prediction and discovery agree.

Six axes:

- **authority movement:** NO — no canonical source of truth moves.
  The admission rungs consolidate from inline `kernel.ts` checks into
  a named `admitLoaded` in the SAME module; the model ledger stays
  the semantic authority. New runtime behavior (the role/state/
  capability rungs) turns on, but nothing that was authority moves.
- **surface spread:** TRIPPED — hard stop 2. ONE concept (the
  warrant's role dimension + the live state rung) touches: kernel
  logic (`kernel/`), the ingress admission schema (`ingress.ts` —
  new known key + gate), the diag store's validation matrix
  (`sqliteDiagStore.ts` — reason/token allowlists), the dev CLI
  staging schema (`cli/dev/main.ts` inject), the operator CLI's
  `submit` WRITE surface (`cli/main.ts` — the shipped envelope
  builder gains the role flag, matrix O), and the testkit
  CONTRACT (`traceHarness.ts` — the `TraceStep`/lift extension, a
  kit contract change that counts under the surface rule).
  **Closure proof (single-packet allowed: yes):** one bounded build
  closes all six — every surface change is the SAME additive field
  and the SAME four rejection names propagating through declared
  allowlists; no separate sequencing exists (nothing works until all
  land — the ladder and its transport/validation surfaces are one
  cutover); ONE proof surface validates it (the l1 golden trace +
  the kernel/ingress/diag lane suites in one `pnpm v3:test` run);
  the same in-repo consumers own all fallout (no external
  consumers); no per-consumer-family review loop; no compatibility /
  migration / persistence risk — `expectedRole` rides the transcript
  envelope's JSON verbatim (additive optional field; NO store schema
  bump — the chapter's fenced bump is P2's `gate_decisions`).
  The chapter ratification pre-cut P1 exactly this way: P2 is the
  chapter's declared split candidate, P1 is not (plan §11.4).
- **identity/join fragility:** NO — no new cross-seam identity; the
  role claim is compared against the pinned template's own step
  field, in one place.
- **foundation + activation coupling:** the rung lands and turns on
  in one packet — the standard model-ladder shape every kernel
  packet has (the ch4-P3 precedent), not the ch8/MD-1
  migrate-and-activate shape: there is no separately-built
  foundation being switched on; the behavior IS the packet.
- **prerequisite coupling:** NO — P0 closed (built @ 012d992c), the
  draft is ratified (P1 anchors none of it), no unfinished sibling.
- **acceptance multiplicity:** ONE family — the kernel contract
  suite + trace (schema-gate lanes on ingress/dev/diag are the same
  field's transport checks, proven in the same run).

Consume-family scan (run because hard stop 2 tripped; measured from
the tree, 2026-07-12 — the `createKernel`/`ingress.submit` test-driver
grep and the `expectedVersion` carrier grep in Embedding gates):
producer = kernel (changed); validator/gate = ingress (changed);
persistence/replay = store (present — envelope rides row JSON
verbatim, `sqliteStore.ts` lines 275/105 measured, no change);
execution consumer = emit-loop/scripted actors (present — test-side
echo of `packet.role`; the production spawned actor is ch-9,
absent); read/presentation = floor + operator CLI (present —
envelope pass-through on the READ surfaces EXCEPT the debug
bundle, which is a HAND-PROJECTION (its envelope meta names its
fields explicitly — corrected at arm gate 2: `expectedRole` joins
the projection and the boundary gains `floor/debugBundle.ts`); no
other projection
change — but the operator CLI's `submit` verb is a WRITE surface
(`main.ts` labels it so) and CHANGES: it builds actor envelopes and
gains the role flag, matrix O); recovery/cleanup = absent;
external/integration = dev CLI inject + operator `submit` (both
changed); testkit = present (contract change — counted above).

Other hard stops: none trip (no authority movement; no unfinished
prerequisite; no competing authority paths; no contract+consumer
cutover with fragile join; ≤2 fallout families beside the producer;
no persisted schema change; no rollback/lock/ordering semantics
change; success proof stays where it is; no reused proof contract).
Escalation combos below hard-stop: none beyond the stop-2 trip
handled above. Conditional annexes: **closure-budget triage** N/A —
no read-projection / shared-contract bucket beyond the pass-through
statements above; **proof-boundary triage** N/A — no proof source
moves; **mutable-flow record** N/A — precondition failures produce
zero side effects BY THE PACKET'S OWN CLAIM (A11 is driven by
explicit pre/post equality assertions, checkers as belt),
and no rollback/retry/coordination primitive is introduced.

## Claim + dimensions (enumerated BEFORE deriving test rows)

**Claim (wide):**

1. **Full authority snapshot or no commit:** from this packet on, NO
   actor envelope can commit a transition without carrying and
   matching the position's full context-authority pair — version AND
   role. An emit claiming no role, a foreign role, or an action its
   role may not take is rejected BEFORE any state change: no
   transcript append, no version bump, no dispatch — ever.
2. **One consolidated, ordered admission ladder:** idempotency →
   lifecycle/state → version-presence → staleness →
   authority-presence → authority-match, as ONE named mechanism
   (`admit_loaded` realized); the rung ORDER is behaviorally pinned —
   every adjacent-rung combination answers with the earlier rung's
   outcome (matrix A, driven by combination lanes).
3. **Actors emit only into actor-routable running execution:** any
   non-RUNNING instance (CREATED or DONE) answers `not_active` to an
   actor emit — regardless of what else is wrong with the envelope —
   at the state rung's slot (after idempotency, before everything
   else). The post-terminal answer CHANGES from `no_transition` to
   `not_active` (the l0d rung arriving live).
4. **Capability is default-derived:** with no explicit profile the
   pair workflow needs ZERO authorization config, yet only the
   position's active role can drive it; an explicit profile
   (type-level value, never a format key) narrows, making
   `not_authorized` behavioral (plan §11.2's "7 behavioral" count).
5. **Coherent transport:** every surface that stages, transports,
   validates, or records envelopes handles `expectedRole` coherently
   — ingress admits well-formed presence AND absence (absence is the
   kernel's to reject), the store round-trips it verbatim, the diag
   channel records all four new rejection classes (allowlists
   extended — without which the store sink would silently DROP
   them), the dev CLI stages it, the operator `submit` verb carries
   it (required at parse — matrix O), the debug bundle's
   hand-projected envelope meta carries it (the arm-gate-2
   aftermath correction), the trace harness lifts sub-L1 traces.
6. **Confinement:** nothing else changes — commit mechanics, digest
   identity, outcome vocabulary, diag event keysets, the 54-name
   registry (all four names pre-exist in it), and the store schema
   are untouched.

Dimensions:

1. **Ladder-order combination lanes** (the combination-lane
   heuristic — isolated lanes cannot falsify a reordered ladder):
   each adjacent/competing rung pair staged with BOTH conditions
   true: duplicate op_id on a DONE instance → `duplicate`; collision
   digest on DONE → `op_id_collision`; DONE + missing version →
   `not_active`; DONE + wrong role → `not_active`; stale version +
   wrong role → `stale`; missing version + missing role →
   `missing_version`; stale + missing role → `stale`; wrong role +
   nonexistent event type → `role_not_authorized`; right role +
   nonexistent type → `no_transition`; right role + existing type
   forbidden by an explicit profile → `not_authorized`; wrong role +
   explicit profile present → `role_not_authorized`.
2. **State-rung values:** CREATED (store-staged fixture — no kernel
   path commits it) and DONE (reached through a real terminal
   commit) both → `not_active`; RUNNING passes the rung.
3. **Role value shapes:** absent field (kernel `missing_role`);
   empty string / non-string (ingress `invalid_shape` +
   `invalid_expected_role` token); wrong-role string; correct role.
   Numeric-domain ladder: N/A — no new numeric domain enters
   (`expectedVersion` lanes unchanged); R-NUMERIC-LADDER does not
   fire.
4. **Capability grid:** profile present/absent × claim role
   own/other × allowed set contains/lacks/empty — including the
   explicit-empty-allow row (C6: an explicit `[]` blocks everything
   for that (role, step)).
5. **No-state-change negatives:** after EVERY new rejection lane an
   EXPLICIT pre/post equality assertion set runs — the FULL
   `WorkflowInstance` value (all fields, `round` included) plus the
   transcript row set unchanged, no intent — with `runAllCheckers`
   as the additional consistency belt (A11; the
   authorization-before-commit invariant as execution, not
   narration).
6. **CAS-restart × state:** a restart that lands on a
   concurrently-terminal instance answers `not_active` (the full
   ladder re-runs on fresh state — the unit's restart comment).
7. **Diag lanes:** each of the four new kernel rejections emits ONE
   `kernel`/`rejected` event with `payloadDigest` present
   (post-digest lanes) and is ACCEPTED by the store sink (D1
   extension); the ingress `invalid_expected_role` event persists
   with its token (D2); committed outcomes still emit nothing.
8. **Traces:** the l1 golden trace at-level (explicit
   `expectedRole`); the l0a and l0b traces LIFT (the harness
   supplies the current step's role per emit) with their
   committed-row sequences byte-identical to before.
9. **Dev inject:** schema lanes (unknown key, empty/non-string
   `expectedRole`), passthrough presence/absence, and the
   staging-a-`missing_role`-probe row (rejection rows are data,
   exit 0).
10. **Operator submit:** the required-flag usage lane (`submit`
    without `--expected-role` → usage error naming the quartet),
    the role pass-through commit lane, and the wrong-role lane
    (`role_not_authorized` as an outcome data row, exit per the
    ch6-P4a outcome matrix).

## Operative material (full text — projection, not invention)

### `l1-pseudocode/HANDLE` (verbatim)

```
HANDLE envelope → Outcome
  IF not valid_shape(envelope)            THEN RETURN Rejected(invalid_shape)

  instance ← instanceStore.load(envelope.instance_id)
  IF instance is none                     THEN RETURN Rejected(unknown_instance)
  template ← definitionStore.load(instance.template_ref)   # separate store; pinned immutable version
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

  issued_config ← resolve_agent_config(template, step, instance)   # resolved only now — not for a rejected envelope

  # one atomic commit, CAS on instance.version
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(envelope, issued_agent_config: issued_config)   # provenance: issued, not proven runtime
    instance.current_step ← target
    IF target is terminal THEN COMPLETE(instance)                  # kernel-internal completion path → TERMINAL(done)
    instance.version ← instance.version + 1
  # on CAS conflict: restart HANDLE from load —
  #   re-check idempotency and re-resolve the transition;
  #   never re-commit a target computed from stale state

  intent ← (instance.kernel_status = TERMINAL) ? none : dispatch_intent(instance, template, instance.current_step)  # derive after commit
  RETURN Committed(instance.version, intent)
```

### `l1-pseudocode/admit_loaded` (verbatim)

```
# ─── ADMISSION grows its authority rung (L1) — the same ladder, one more rung at its declared slot ───
# The L0d contract reserved the position: … → staleness → authority (L1/L3). The rung verifies the
# warrant's context-authority pair — what the sender claims to act as (claim) against what this
# position grants (granted); granted is read only at this rung, never earlier. Reject names still
# ride the expectation (the ladder knows no vocabulary): both role literals stay at the call sites.
admit_loaded(instance, expect, input?) → Accepted | Duplicate | Stale | Rejected
  IF expect.op_id     is present AND instance.transcript.has(expect.op_id)  THEN RETURN Duplicate               # idempotency rung — key scope (instance_id, op_id)
  IF expect.state     is present AND NOT expect.state.holds(instance)       THEN RETURN expect.state.reject     # lifecycle/state rung; an unnamed reject ⇒ bare-REQUIRE semantics
  IF expect.correlate is present AND NOT expect.correlate.holds(instance)   THEN RETURN expect.correlate.reject # correlation rung (request_id here; request_ref / link_id arrive with their errands)
  # version-presence is the staleness rung's ENTRY GUARD (an input carrying no version cannot be judged
  # stale) — it is not a separate rung and not a payload check
  IF expect.version   is expected AND expect.version is missing             THEN RETURN Rejected(missing_version)
  IF expect.version   is expected AND expect.version ≠ instance.version     THEN RETURN Stale(instance.version)
  # authority rung (arrives here, L1) — presence then match, the same two-step shape as staleness
  IF expect.authority is present AND expect.authority.claim is missing      THEN RETURN expect.authority.missing
  IF expect.authority is present AND expect.authority.claim ≠ expect.authority.granted
                                                                            THEN RETURN expect.authority.mismatch
  RETURN Accepted
```

### `l1-pseudocode/capability` (verbatim)

```
capability(template, role, step_id) → action set                       # role × step → allowed actions
  step    ← template.step(step_id)
  profile ← template.capability_profile.get((role, step_id))
  IF profile is not none THEN RETURN profile.allowed                    # explicit restriction (none in the baseline)
  IF role = step.role THEN RETURN event_types_of(step.transitions)      # default-derived: own role may emit the step's transitions
  RETURN empty_set                                                      # any other role may emit nothing here
```

### `l1-pseudocode/dispatch_intent` (verbatim)

```
dispatch_intent(instance, template, step_id) → DispatchIntent
  step  ← template.step(step_id)
  actor ← instance.binding[step.role]                  # guaranteed present by the start invariant
  requirement ← template.runtime_context
  IF instance.runtime_context = ready(∅) THEN                                       # the workflow declared no runtime context
    runtime_view ← none                                                            # explicit: the actor assumes no workspace
  ELSE
    REQUIRE requirement = required(spec)                                            # provisioned path ⇒ a context is required (made explicit)
    provider ← providerRegistry.resolve(spec.provider)                             # the same pinned-template provider that issued the request
    REQUIRE provider is not none                       # kernel/config invariant (not a business rejection): registry stable for an active run
    runtime_view ← provider.project_for_actor(instance.runtime_context.ready_ref)  # actor-facing projection (L0e); raw ref stays kernel-side
  packet ← ContextPacket {
    instance_id, expected_version: instance.version, task: instance.task,
    role:          step.role,                                      # dispatched-as role → echoed back as expected_role
    instruction:   step.instruction,
    handoff:       payload_of_transition_into(instance, step_id),  # the envelope that brought us here; absent at start
    available_ops: event_types_of(step.transitions),              # navigation affordances; L1 enforces capability in HANDLE
    effective_agent_config: resolve_agent_config(template, step, instance),   # resolved portable run intent (was raw agent_config at L0b)
    runtime_context: runtime_view }                              # the projection, or none for a context-free workflow
  RETURN DispatchIntent { actor, packet }            # a local/manual driver delivers; durable channel is L8
```

### `l1-pseudocode/RECEIVE` (verbatim)

```
RECEIVE(input) → Outcome                                               # one kernel entry; route by input source class
  MATCH input.source:
    operator_intent → dispatch to CREATE_INSTANCE / START / KICKOFF / CANCEL   # lifecycle intents
    kernel_event    → dispatch to RUNTIME_CONTEXT_READY / FAIL               # internal events (done is internal-only, below)
    actor_envelope  → HANDLE(input)                                           # the L0a–L1 actor handler, now lifecycle-guarded
```

### `l1-pseudocode/warrant` (verbatim)

```
# ─── WARRANT (P4) — the act-from bundle an inbound input carries; admission verifies it rung by rung ───
# Born at L1: a second context-authority field arrives (expected_role joins expected_version), so the
# act-from data stops being one field and becomes a named contract. Its field classes stay apart —
# different rungs consume them (todo A1/E1) — and each class grows along the ramp. At L1 it holds:
Warrant — assembled by the sender, projected into the input; the kernel verifies it, never invents it
  operation identity    op_id                              # → the idempotency rung (todo A1)
  context authority     expected_version, expected_role    # → the staleness + authority rungs (todo E1: universal vs shape-derived)
  request correlation   request_id                         # → the correlation rung (kernel events, L0e): WHICH open request
                                                           #   this input answers; request_ref (L3) and link_id / child_id (L4)
                                                           #   join the class at their levels
# NOT in the bundle (deliberate): attempt/retry-episode identity (episode_ref, → LC3b) is kernel-side
# wait state — what the kernel remembers, not what the sender acts FROM.
```

### Exact rejection strings (ledger §3 — the slice)

`missing_role` · `not_active` · `not_authorized` · `role_not_authorized`

(All four pre-exist in the realized 54-name registry
(`domain/rejections.ts`) — this packet makes them BEHAVE; no registry
edit, no drift-lock change on names.)

### The l1 golden trace (executable expectation — the committed-row sequence the test must reproduce)

Fixture: `local-pair-v0` (the testkit `fixtureTemplate()` — implement
⇄ review, PASS/CONVERGED, implementer→codex, reviewer→claude).
Start: `version 1`, `currentStep implement`, `status RUNNING`.

| # | Input | Expected outcome | State after |
|---|---|---|---|
| 1 | codex emits `PASS` on implement — `{ expectedVersion: 1, expectedRole: "implementer" }` | `committed`, version 2 (role = implement.role ✓ · PASS is a transition ✓ · capability(implementer, implement) = {PASS} allows ✓) | currentStep review, version 2, RUNNING |
| 2 | a stray emit on review claims `expectedRole: "implementer"` (`expectedVersion: 2`) | `rejected` `role_not_authorized` (review.role is reviewer) — NO transcript append, version stays 2 (full-state equality asserted; checkers as belt) | unchanged |
| 3 | claude emits `CONVERGED` on review — `{ expectedVersion: 2, expectedRole: "reviewer" }` | `committed`, version 3; terminal — intent is `null` (no dispatch) | currentStep done, round 1, DONE, version 3 |

Final transcript (full-sequence equality): `[[1, <op-1>], [2, <op-3>]]`.
Final state: `{ currentStep: "done", round: 1, status: "DONE", version: 3 }`.
This trace is AT-LEVEL: `expectedRole` explicit on every emit, no
lift. `runAllCheckers` green at the end (the consistency belt — the
transcript/final-state equalities above are the proof, T4).

## Canonical admission-ladder matrix (A)

| Id | Rule |
|---|---|
| A1 | Pre-ladder: an unknown instance → `Rejected(unknown_instance)` — the only PRE-DIGEST kernel rejection (unchanged from ch4-P3; the diag lane keyset carries no `payloadDigest` there) (anchored: prose:l1-pseudocode/HANDLE) |
| A2 | The step read is HOISTED above the ladder as a positional read that can never reject. On this realization a TERMINAL current-step id resolves NO `Step` (terminal ids live in `template.terminal`, outside `steps`), so the hoisted read must TOLERATE `undefined`; its `step.role` consumer is the authority rung, which the state rung guards — `status === "RUNNING"` ⇒ `currentStep ∈ steps` by construction (terminal commits set DONE). DERIVATION: the unit marks the read "infallible over committed state" via load-time validation of REACHABLE steps; terminal ids are not steps in the realized shape, so tolerance-until-consumed is the only reading consistent with both the unit's no-reject rule and the realized template shape (derived: prose:l1-pseudocode/HANDLE, prose:v3/src/domain/template.ts) |
| A3 | Idempotency rung, digest-aware (the ch5-P4 realized extension of the unit's op_id rung): a committed row under the same `(instanceId, opId)` with the SAME digest → `duplicate`; a DIFFERENT digest → `Rejected(op_id_collision)`. The rung is FIRST and wins over every later rung — state included (anchored: prose:l1-pseudocode/admit_loaded, prose:packet ch5-P4) |
| A4 | State rung — LIVE here (the l0d slot, the scoped extension): `status !== "RUNNING"` → `Rejected(not_active)`. RUNNING is the realized projection of "actor-routable ACTIVE execution"; CREATED and DONE both reject. The post-terminal actor emit's answer CHANGES from `no_transition` to `not_active` — the named existing lanes are UPDATED, never duplicated (anchored: prose:l1-pseudocode/HANDLE state expectation, prose:ledger §3 not_active, prose:plan §11.1 item 1) |
| A5 | Version-presence entry guard (not a separate rung): `expectedVersion` absent → `Rejected(missing_version)` — unchanged behavior, new SLOT (now after the state rung: DONE + missing version → `not_active`) (anchored: prose:l1-pseudocode/admit_loaded) |
| A6 | Staleness: `expectedVersion !== instance.version` → `stale` with `currentVersion` — unchanged behavior; precedes the authority rungs (stale + wrong/missing role → `stale`) (anchored: prose:l1-pseudocode/admit_loaded) |
| A7 | Authority presence: `expectedRole` absent → `Rejected(missing_role)` — the KERNEL's rejection, never the ingress's (the `missing_version` pattern, W4); fires only after version rungs pass (anchored: prose:l1-pseudocode/admit_loaded, prose:ledger §3 missing_role) |
| A8 | Authority match: `expectedRole !== step.role` → `Rejected(role_not_authorized)`; `granted` (= `step.role`) is read ONLY at this rung, never earlier (anchored: prose:l1-pseudocode/admit_loaded, prose:ledger §3 role_not_authorized) |
| A9 | Post-admission navigation: no transition for `envelope.type` from the current step → `Rejected(no_transition)` — unchanged; authority precedes navigation (wrong role + unknown type → `role_not_authorized`) (anchored: prose:l1-pseudocode/HANDLE) |
| A10 | Capability gate: `envelope.type ∉ capability(template, step.role, currentStep)` → `Rejected(not_authorized)` — post-navigation, pre-commit; the action EXISTS as a transition but the profile forbids it (anchored: prose:l1-pseudocode/HANDLE, prose:ledger §3 not_authorized) |
| A11 | Every non-committed outcome (duplicate / stale / all rejections) commits NOTHING: no transcript append, no version bump, no status change, no dispatch — driven by EXPLICIT PRE/POST STATE-EQUALITY assertions per rejection lane — the FULL `WorkflowInstance` value equal before vs after (every field, `round` included: a commit mutates currentStep, version, status, round, and the transcript, and the round rung has no checker to pin it) plus the transcript ROW SET equal and no intent returned, with the store checkers running IN ADDITION as the consistency belt — checkers alone are NOT the proof: they assert internal consistency, and a wrongly-committed VALID transition followed by a rejection answer would stay checker-green (the arm-gate-1 sensitivity catch) (anchored: prose:ledger §2 l1/authorization-before-commit) |
| A12 | On a CAS conflict the WHOLE handle restarts from load and re-runs the FULL ladder on fresh state — a concurrent terminal commit lands `not_active` on the restart (dimension 6's lane) (anchored: prose:l1-pseudocode/HANDLE CAS comment) |
| A13 | The correlate rung is NOT realized: no realized caller passes a correlation expectation (`request_id` consumers arrive with kernel events, L0e+). Explicitly ruled out — not a silent gap; the realized `admitLoaded` surface omits the parameter entirely rather than carrying dead code (R-EXECUTION: an obligation counts when it runs). DERIVATION: the unit guards every rung with "is present"; a rung no caller can reach is undrivable dead code — the ch8-P1 V17 precedent (derived: prose:l1-pseudocode/admit_loaded) |

## Canonical warrant/envelope-surface matrix (W)

| Id | Rule |
|---|---|
| W1 | `EventEnvelope` gains `expectedRole?: string` — OPTIONAL in the type so the `missing_role` branch stays representable (the `expectedVersion` precedent, stated in the type's own comment); semantically MANDATORY for actor envelopes from L1 on — A7 enforces (anchored: prose:ledger §4 l1, prose:model-src/sections/07-l1 Domain block) |
| W2 | Ingress `KNOWN_KEYS` gains `expectedRole`; the strict unknown-key rejection (string AND symbol keys, non-enumerable included) is UNCHANGED in kind. DERIVATION: entailed by the ch4-P3 strict-shape claim — a new typed-envelope field is by definition a known key; without it every role-carrying envelope rejects `unknown_key` (derived: prose:packet ch4-P3 ingress claim) |
| W3 | Ingress gate: `expectedRole` PRESENT ⇒ non-empty string, else `invalid_shape` with the NEW detail token `invalid_expected_role`. The one-token-per-admission-gate-block claim (ch7-P1) grows by EXACTLY this member; the token is test-driven on both the outcome and the diag event. DERIVATION: the field's gate block is new, and the declared-claim token list must name it — the `invalid_expected_version`/`invalid_event_id` per-field precedent decides the shape; the token NAME is packet work (derived: prose:packet ch7-P1 token-list claim, prose:v3/src/ingress/ingress.ts) |
| W4 | ABSENCE of `expectedRole` passes ingress untouched — mandatory-ness is the KERNEL's (A7), exactly the `missing_version` pattern: ingress validates form-when-present, admission validates presence (anchored: prose:l1-pseudocode/admit_loaded presence rung, prose:packet ch4-P3) |
| W5 | Diag event keysets are NOT extended: no `expectedRole` field joins `DiagnosticEventBody` or the attribution set — the rejection NAME carries the class; the ch7-P1 declared keysets stand byte-identical. DERIVATION: no L1 claim needs the value in the diag row, and the keyset claims are ch7-P1 canonical rows — not extending is the no-op reading; extending would be the decision (derived: prose:packet ch7-P1 keyset claims) |
| W6 | Envelope persistence: `expectedRole` rides the transcript row's JSON envelope VERBATIM (`JSON.stringify(input.envelope)` at write, `JSON.parse` at read — measured, `sqliteStore.ts`); additive, no store schema change, no fenced wipe (the chapter's schema bump is P2's `gate_decisions`). Driven by a store round-trip lane. DERIVATION: measured pass-through — the store has no per-field envelope projection (derived: prose:v3/src/store/sqliteStore.ts lines 275/105) |
| W7 | The Warrant's field classes, realized state: operation identity = `opId` (idempotency rung); context authority = `expectedVersion` + `expectedRole` (staleness + authority rungs); request correlation = NOT realized (A13). The kernel VERIFIES the warrant, never invents it — no kernel path writes or defaults these fields (anchored: prose:l1-pseudocode/warrant) |

## Canonical capability matrix (C)

| Id | Rule |
|---|---|
| C1 | `capability(template, role, stepId)`: an explicit profile entry for `(role, stepId)` → its `allow` list, returned UNCONDITIONALLY (an explicit restriction is the authority when present) (anchored: prose:l1-pseudocode/capability) |
| C2 | No profile entry AND `role === step.role` → the step's transition event types (default-derived: own role may emit the step's transitions) (anchored: prose:l1-pseudocode/capability) |
| C3 | No profile entry AND `role !== step.role` → the empty set (any other role may emit nothing here) (anchored: prose:l1-pseudocode/capability) |
| C4 | `CapabilityProfile` is realized TYPE-LEVEL: `WorkflowTemplate` gains an OPTIONAL `capabilityProfile` lookup surface realizing the ledger's `(role × step_id) → allowed action set` value; the CONTAINER SHAPE is BUILD FREEDOM within the boundary (the model's Config example is entry-list form, a keyed record is equally legal — the packet prescribes the SEMANTICS, C1–C3/C6, never the TS container; the arm-gate-1 correction: prescribing one shape would be an unanchored decision). The YAML format does NOT gain a key (authored restrictions are Absent → later; the ch8 validator's fixed keyset stands — a `capabilityProfile` key in a template FILE stays a V8 unknown-key rejection). PROOF BOUNDARY: explicit profiles are drivable only via directly-constructed `WorkflowTemplate` values (testkit/domain), never via the authoring format — stated, not hidden; `not_authorized` is behavioral through this channel (plan §11.2's count). DERIVATION: the unit's lookup REQUIRES a template-side profile surface; the ledger names the value type; the TS record shape and the type-level-only landing are the projection of "explicit restrictions enter the same profile later" + the Absent row (derived: prose:ledger §4 l1 CapabilityProfile, prose:model-src/sections/07-l1 Config block, prose:plan §11.2) |
| C5 | `not_authorized` fires ONLY when the type exists as a transition AND capability forbids it (A9 precedes A10); under a profile-less template it is DORMANT by construction (C2 returns exactly the transition set) — the dormancy is STATED and the behavioral drive rides C4's explicit-profile channel (anchored: prose:model-src/sections/07-l1 Runtime note, prose:l1-pseudocode/HANDLE) |
| C6 | An explicit EMPTY `allow` list (`[]`) for `(role, stepId)` blocks every action for that pair — C1 returns it unconditionally; no fall-through to default derivation (anchored: prose:l1-pseudocode/capability — `IF profile is not none THEN RETURN profile.allowed`) |

## Canonical dispatch-packet matrix (K)

| Id | Rule |
|---|---|
| K1 | `ContextPacket` gains `role: RoleName` — REQUIRED: every dispatch names the dispatched-as role (= the target step's role), the echo target for `expectedRole` (anchored: prose:l1-pseudocode/dispatch_intent, prose:ledger §4 l1) |
| K2 | Both intent producers carry it — `startInstance`'s start intent and `handle`'s post-commit intent share `deriveDispatchIntent` (anchored: prose:packet ch4-P4 shared-derivation note, prose:l1-pseudocode/dispatch_intent) |
| K3 | The echo convention — the actor sends `expectedRole = packet.role` back — is realized TEST-SIDE (trace harness, emit-loop, journey fixtures); the PRODUCTION actor is a ch-9 spawned command (proof boundary stated). DERIVATION: the unit's comment ("dispatched-as role → echoed back as expected_role") names the convention; no production actor surface exists yet to carry it (derived: prose:l1-pseudocode/dispatch_intent) |

## Canonical diag-surface-extension matrix (D)

| Id | Rule |
|---|---|
| D1 | The diag store's kernel handle-lane reason allowlist (`KERNEL_REJECTED_REASONS`) grows by EXACTLY `{missing_role, not_active, not_authorized, role_not_authorized}` — all four are POST-DIGEST lanes (`payloadDigest` REQUIRED on their rows; the existing post-digest branch binds them; `unknown_instance` stays the only pre-digest member). DERIVATION: the ch7-P2 validation matrix is a declared claim that grows additively in the realizing chapter — the four new kernel rejection classes ARE the growth; digest-point placement follows from the ladder position (every new rung sits after the digest computation) (derived: prose:packet ch7-P2 validation matrix, prose:v3/src/diag/sqliteDiagStore.ts) |
| D2 | The diag store's ingress `DETAIL_TOKENS` allowlist grows by EXACTLY `invalid_expected_role` (W3's token), and the port's `IngressDetailToken` union gains the same member. DERIVATION: same additive-growth rule as D1, on the token axis (derived: prose:packet ch7-P2 validation matrix) |
| D3 | The emission contract is unchanged IN KIND: one classified event per non-success final outcome, nothing on committed, bare `diag.emit` calls (REV-DIAG-FAILOPEN), digest THREADED never recomputed — the new reasons ride the EXISTING kernel `rejected` keyset (anchored: prose:packet ch7-P1 emission contract) |
| D4 | Without D1 the store-backed sink DROPS the new rejection rows silently (validation failure → the fail-open fence swallows) — the extension is LOAD-BEARING and driven store-side: one accepted-row lane per new reason, plus the sink's own validation lanes updated. DERIVATION: measured consequence of `sqliteDiagStore.ts` line 259's closed-set check + the port's swallow contract (derived: prose:v3/src/diag/sqliteDiagStore.ts, prose:packet ch7-P2) |

## Canonical trace/harness matrix (T)

| Id | Rule |
|---|---|
| T1 | The l1 golden trace (operative material) is reproduced by a NEW at-level trace test through the wired ingress+kernel+store — committed-row full-sequence equality + final state + the `role_not_authorized` step's no-state-change assertion (anchored: prose:model-src/sections/07-l1 Runtime trace) |
| T2 | The trace harness gains a SECOND lift axis: `lift.expectedRole: "supply-current-step-role"` — the harness reads the instance's current step from the store before each emit and stamps that step's role (the dispatched-as role) onto envelopes that carry none. The l0a trace lifts on BOTH axes, the l0b trace lifts on the role axis only; their committed-row sequences and final states are BYTE-IDENTICAL to their pre-L1 runs (level-lifting: lower-level traces stay green above their level). DERIVATION: the ch5-P3 level-lifting convention applied to the second context-authority field — `expectedVersion`'s `"track-running-version"` is the exact precedent (derived: prose:packet ch5-P3 level-lifting, prose:v3/src/testkit/traceHarness.ts) |
| T3 | `TraceStep`'s emit variant gains OPTIONAL `expectedRole` (explicit per-step value wins over the lift — the `expectedVersion` explicit-or-lift precedent); `ExpectedOutcome` is unchanged (the four new rejections ride the existing `rejected`+`reason` form). DERIVATION: mechanical type extension entailed by T1/T2 (derived: prose:v3/src/testkit/traceHarness.ts) |
| T4 | After every rejected trace step the harness asserts PRE/POST equality of the FULL instance state (the A11 field set, `round` included — the step's expected outcome pins the version, the full-state read pins the rest) and the FINAL full-sequence transcript equality pins that no rejected step appended a row; `runAllCheckers` green at the end is the consistency belt, never the equality proof (A11 as trace-level execution) (anchored: prose:ledger §2 l1/authorization-before-commit, prose:packet ch5-P3) |

## Canonical dev-inject-extension matrix (X)

| Id | Rule |
|---|---|
| X1 | The dev `inject` step schema gains OPTIONAL `expectedRole` (plan §11.4 P1 row: "the dev `inject` schema extension") (anchored: prose:plan §11.4 P1 row) |
| X2 | `INJECT_STEP_KEYS` gains `expectedRole`; the unknown-field rejection and fail-closed full-file validation are unchanged in kind; when present the value must be a non-empty string (`InvalidInjectStep` usage error otherwise — the `actorId`/`opId` string-form precedent). DERIVATION: the ch6-P4b canonical inject schema's per-field pattern applied to the new field (derived: prose:packet ch6-P4b inject schema) |
| X3 | Passthrough: `expectedRole` enters the staged envelope IFF present; ABSENCE stages a `missing_role` probe — the ingress/kernel answer is the step's outcome row, exit stays 0 (a staging tool's rejection is often the intended state — the ch6-P4b claim, unchanged). Neither the derived-op_id path nor the override path REQUIRES it. DERIVATION: the staging tool must be able to stage BOTH the happy path and the hostile absence — requiring the field would erase the `missing_role` staging lane (derived: prose:packet ch6-P4b staging claim) |
| X4 | Emit identity is UNTOUCHED: `deriveActorEmitOpId`'s field set (`instanceId`, `contextPacketId`, `opType`, `payload`) does not gain the role — `expectedRole` is context authority, not operation identity (the warrant's field classes stay apart, W7). DERIVATION: the emit-lib contract's identity fields are a ratified surface (ADR-004/ch5-P4); the warrant unit's class separation decides non-membership (derived: prose:l1-pseudocode/warrant, prose:packet ch5-P4) |
| X5 | The dev `replay` fixture schema is the SAME staging surface's second face and extends WITH the harness: the emit-step allowed-key list gains `expectedRole` (non-empty string when present) and the `lift` keyset validation gains the `expectedRole: "supply-current-step-role"` axis — T2/T3 mirrored into the hand-rolled replay validator, which the TYPE SYSTEM does not ripple (the fixture parse ends in a cast, `cli/dev/main.ts`), so the extension is EXPLICIT packet contract, driven by replay accept/reject-unknown/lift lanes PLUS the WRONG-ROLE replay lane: a fixture whose explicit `expectedRole` differs from the current step's role must replay to `role_not_authorized` — a validator that silently DROPPED the field would let the lift backfill the CORRECT role and commit, failing this lane (the silent-drop discriminator; a correct-role fixture cannot distinguish explicit-carry from drop-plus-backfill). Caught at arm gate 1 (2026-07-12): T2/T3 alone left the replay schema silently rejecting role-carrying fixtures (derived: prose:v3/src/cli/dev/main.ts, prose:packet ch6-P4b) |

## Canonical operator-submit-extension matrix (O)

| Id | Rule |
|---|---|
| O1 | The operator `submit` verb gains `--expected-role`, REQUIRED at the parse layer alongside `--instance`/`--type`/`--expected-version` (the `MissingSubmitFlags` usage error names the quartet; the flag table gains the entry). NEW-DECISION (flag 1): required-at-parse vs optional-pass-through (kernel `missing_role` as the outcome row) are BOTH conform to the anchors — the pick is a genuine CLI-semantics decision, made HERE: REQUIRED, on ch6-P4a version-flag parity (the warrant's context-authority pair gets ONE parse-layer treatment) + operator fail-fast ergonomics on a production write surface (the hostile-staging channel stays the dev CLI's, X3). Reclassified from derived at arm gate 1 (2026-07-12) — the entailment claim did not survive the external attack. Below Case-B; rides as pre-approval flag 1, route approve-ratified |
| O2 | Pass-through: the flag's non-empty string value enters the envelope as `expectedRole` verbatim; the KERNEL stays the semantic authority — a wrong role rides stdout as a `role_not_authorized` outcome data row, classified by the ch6-P4a outcome→exit matrix (unchanged); the CLI performs NO role validation beyond the parse layer's non-empty-string form (derived: prose:packet ch6-P4a) |

## Site × shape × phase grid (template §2 write-time discipline)

Trigger check: the packet declares failure lanes over the `handle`
seam, whose execution has PHASES (per-attempt pre-digest vs
post-digest; the CAS-restart loop). The AWAITED-SITE inventory is
UNCHANGED from ch7-P1's grid — this packet adds NO awaited site, no
new phase, and no new fallible work on any observer path: every new
rung is a SYNCHRONOUS pure check over already-loaded state
(`instance.status`, `envelope.expectedRole`, `step.role`,
`template.capabilityProfile`). The delta rows:

| Site | Phase | Failure shape | Event keyset / provenance | Driven by / ruled out |
|---|---|---|---|---|
| state rung (`instance.status` read) | post-digest, pre-commit | pure comparison — no throw | `rejected`/`not_active`, `payloadDigest` present (already in hand from the attempt) | DRIVEN: dimension-2 lanes (CREATED staged, DONE committed) |
| authority rungs (`expectedRole` vs `step.role`) | post-digest, pre-commit | pure comparison — no throw; `step` is defined here (A2: the state rung guards) | `rejected`/`missing_role` or `role_not_authorized`, `payloadDigest` present | DRIVEN: dimension-1/3 lanes |
| capability gate (profile lookup + set membership) | post-digest, pre-commit | pure over template data — no throw (the profile is a plain record; no method dispatch) | `rejected`/`not_authorized`, `payloadDigest` present | DRIVEN: dimension-4 lanes |
| awaited ports (`loadInstance`, `definitions.load`, `findOp`, `commitTransition`) | unchanged | unchanged — rejections propagate to the `internal_failure` belt (ch7-P1 inventory) | unchanged keysets (W5) | RULED OUT as new lanes: no site added, no phase added; the ch7-P1 grid stands (its lanes remain driven by the existing diagEmission suite) |
| digest computation | unchanged (per-attempt reset) | cannot throw on an admitted envelope (ch-4 aftermath; ingress admission == canonicalizable) | threaded per the digest-point contract | RULED OUT: unchanged; existing regression lanes stand |

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical | Mirrors |
|---|---|---|
| ladder rung order + adjacent-rung outcomes | A3–A8 | Claim 2 · dimension 1 · the trace's step-2 rationale · in-context note 3 |
| post-terminal answer change (`no_transition` → `not_active`) | A4 | Claim 3 · dimension 2 · in-context note 4 · the acceptance's updated-lanes bullet |
| role mandatory at kernel, form-gated at ingress | A7 + W4 | Claim 1/5 · W1's "semantically mandatory" clause · dimension 3 · in-context note 2 |
| hoisted step read tolerance | A2 | in-context note 1 · the grid's authority-rung row |
| no state change on any non-commit | A11 | Claim 1 · dimension 5 · T4 · the trace's step-2 expectation |
| capability default derivation + dormancy + explicit-profile drive | C1–C5 | Claim 4 · dimension 4 · the trace's step-1 rationale · in-context note 5 (format non-extension) |
| diag allowlist growth (load-bearing) | D1/D2 | Claim 5 · dimension 7 · D4's failure-mode statement · the acceptance diag bullet · the grid delta rows' `payloadDigest present` cells |
| envelope JSON pass-through (no schema change) | W6 | Claim 6 · the Sizing/risk closure proof's persistence clause · the consume-family scan's store row |
| lift second axis (sub-L1 traces stay green) | T2 | Claim 5 · dimension 8 · the acceptance trace bullet · X5's replay-validator echo |
| emit identity untouched | X4 | Claim 6 · W7's field-class separation · the acceptance emit-loop bullet |
| correlate rung not realized | A13 | W7's request-correlation clause · the partial-realization list's admit_loaded bullet |
| operator submit role flag (required parse + kernel authority) | O1/O2 | Claim 5 · dimension 10 · the Sizing surface-spread clause · the Sizing consume-family scan's operator-CLI clause · the acceptance CLI bullet · the behavior-change-honesty bullet |

The Pre-approval flags ledger stays out of the live mirror set (the
P1–P4 precedent): entries are dated decision snapshots.

## In-context notes (the scarce budget)

1. **The hoist tolerates `undefined`:** a DONE instance's
   `currentStep` is a terminal id with NO `Step` entry — read
   `template.steps[currentStep]` before the ladder, but consume
   `step.role` only at the authority rung; the state rung guarantees
   definedness there (RUNNING ⇒ non-terminal current step). Never
   reject from the hoist; never re-order the state rung after the
   authority rung "to simplify the types".
2. **Do not "helpfully" reject absence at ingress:** a role-less
   envelope is WELL-FORMED at ingress and rejected by the KERNEL
   (`missing_role`) — exactly like `missing_version`. Ingress gates
   only form-when-present.
3. **Keep collision precedence through the consolidation:** the
   digest-aware idempotency rung (same digest → duplicate, different
   → `op_id_collision`) is the ch5-P4 realized extension of the
   unit's op_id rung — it stays FIRST and its two outcomes stay
   intact; the commit-time transactional re-check remains the
   correctness mechanism (REV-A1-TXN: the ladder pre-checks are the
   fast path).
4. **Update, never duplicate, the post-terminal lanes:** existing
   named lanes asserting `no_transition` on a DONE instance (kernel
   suite; any CLI/diag mirror staging post-terminal emits) get their
   expectation CHANGED to `not_active` — keeping both expectations
   alive would fork the contract.
5. **No format extension:** `capabilityProfile` is a domain-type
   field only. Do not touch the ch8 validator, the YAML keysets, or
   the canonical template file — a `capabilityProfile` key in a
   template FILE remains an unknown-key rejection (V8), and that is
   correct until an "authored restrictions" chapter ratifies a key.
6. **`resolve_agent_config` stays out:** the unit's `issued_config`
   line is the L0c-inherited branch — the transcript append keeps
   its current shape; do not add an `issued_agent_config` column or
   field anywhere.

## Embedding gates (v1-inherited)

- **New:** `v3/src/kernel/admission.ts` (the consolidated ladder —
  A3–A8, A13's omitted-parameter surface),
  `v3/src/kernel/capability.ts` (C1–C6),
  `v3/src/kernel/admission.test.ts`, `v3/src/kernel/capability.test.ts`,
  `v3/src/l1Trace.test.ts` (T1/T4).
- **Edited (production):** `v3/src/domain/envelope.ts` (W1),
  `v3/src/domain/dispatch.ts` (K1), `v3/src/domain/template.ts` (C4),
  `v3/src/domain/index.ts` (exports), `v3/src/kernel/kernel.ts`
  (HANDLE consolidation: ladder call, capability gate, A2 hoist),
  `v3/src/kernel/dispatchIntent.ts` (K1/K2),
  `v3/src/kernel/index.ts` (exports as needed),
  `v3/src/ingress/ingress.ts` (W2/W3/W4),
  `v3/src/ports/diagnostics.ts` (D2's union member),
  `v3/src/diag/sqliteDiagStore.ts` (D1/D2),
  `v3/src/testkit/traceHarness.ts` (T2/T3),
  `v3/src/cli/dev/main.ts` (X1–X3, X5),
  `v3/src/cli/main.ts` (O1/O2 — the `submit` verb only; read verbs
  untouched),
  `v3/src/drift/unitMap.json` (the six l1 ids flip realized with
  codeRefs), `v3/src/drift/domainRegistry.ts` (the three PENDING l1 type rows
  flip realized with codeRefs: `l1/EventEnvelope`, `l1/ContextPacket`,
  `l1/CapabilityProfile`; the three `l1/Rejected(...)` rows are
  ALREADY realized at name level since ch-4 — unchanged here, their
  behavioral drive is A4/A7/A8/A10's),
  `docs/v3/implementation/plan.md` (the aligned §11.4 P1 row edit —
  the header's R-ALIGNED-UP paragraph; same commit),
  `v3/src/floor/debugBundle.ts` (arm-gate-2 aftermath extension:
  the envelope meta + row projection gain `expectedRole` — the
  bundle is a hand-projection surface the original consume-family
  scan misread as pass-through).
- **Edited (tests — the type-ripple + behavior-change set; every
  file below drives the real kernel/ingress and must stage
  `expectedRole` or asserts a changed lane):**
  `kernel/kernel.test.ts` (incl. the DONE-instance lane flip, A4),
  `kernel/start.test.ts` (packet shape gains `role`),
  `kernel/diagEmission.test.ts` (dimension-7 keyset lanes),
  `ingress/ingress.test.ts` (W2/W3/W4 lanes),
  `diag/sqliteDiagStore.test.ts` (D1/D2/D4 lanes),
  `testkit/traceHarness.test.ts` (T2/T3),
  `l0aTrace.test.ts` + `l0bTrace.test.ts` (T2 lifts),
  `emitLoop.test.ts`, `twoWorker.test.ts` (K3 echo),
  `cli/cli.test.ts`, `cli/dev/dev.test.ts`, `cli/journey.test.ts`
  (X lanes + staged envelopes),
  `floor/floor.test.ts`, `floor/tail.test.ts`,
  `floor/diagTail.test.ts`, `floor/debugBundle.test.ts`
  (kernel-driven staging gains roles),
  `store/sqliteStore.test.ts` (W6 round-trip lane),
  `drift/unitMap.test.ts`, `drift/domainRegistry.test.ts` (only if
  their generic assertions need the new entries named — expected
  no-op).
- **Untouched, explicitly:** `store/sqliteStore.ts` (W6 — no schema
  change), `definition/` (note 5), `emit/` (X4), the `floor/*.ts`
  production files OTHER than `debugBundle.ts` (pass-through; the
  bundle's hand-projection was corrected at arm gate 2 — see the
  Edited list), `domain/rejections.ts` (names
  pre-exist), `testkit/templateFixture.ts` (no profile in the
  fixture — C4's channel is per-test values),
  `testkit/scriptedActor.ts` (opaque by design), `v3/templates/`
  (note 5), the operator CLI READ verbs (status/show/tail/bundle —
  envelope pass-through; `cli/contract.ts`, `cli/common.ts`,
  `cli/runtime.ts` untouched), `ports/store.ts` (carries
  `expectedVersion` in the commit input type only — the envelope
  itself rides as JSON per W6; no role field is owed).
- **Sweeps (measured 2026-07-12, current tree):**
  `grep -rln "createKernel\|kernel.handle\|ingress.submit\|createIngress" v3/src --include="*.test.ts"`
  → exactly the 15 test files listed above (all carried in the
  boundary); `grep -rln "expectedVersion" v3/src --include="*.ts"`
  → 29 files (13 production + 16 test), every production member
  addressed above (`ports/store.ts` dispositioned in the untouched
  list);
  `grep -n "not_active" v3/src` (non-registry) → only
  `drift/domainRegistry.ts` (the l0d row, `realized` at name level —
  untouched; its BEHAVIORAL drive lands here per A4, and the l1
  rejection rows are separate entries) and comments;
  `KERNEL_REJECTED_REASONS` and `DETAIL_TOKENS` each have ONE
  definition site (`sqliteDiagStore.ts`) and ONE consumer each
  (lines 259/190); unitMap realized entries today: 5 (the four
  ch4/ch5 kernel units + the emit digest) — grows to 11.
- **Type-ripple targets:** `ContextPacket.role` REQUIRED ripples
  every packet-shape assertion (start/kernel/emitLoop/twoWorker/
  traceHarness tests — carried above); `EventEnvelope.expectedRole`
  optional — no compile ripple, behavior ripple only (missing_role);
  `WorkflowTemplate.capabilityProfile` optional — no ripple.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/domain/envelope.ts",
      "v3/src/domain/dispatch.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/index.ts",
      "v3/src/kernel/admission.ts",
      "v3/src/kernel/admission.test.ts",
      "v3/src/kernel/capability.ts",
      "v3/src/kernel/capability.test.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/dispatchIntent.ts",
      "v3/src/kernel/index.ts",
      "v3/src/kernel/start.test.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/ingress/ingress.ts",
      "v3/src/ingress/ingress.test.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/diag/sqliteDiagStore.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/floor/debugBundle.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/store/sqliteStore.test.ts",
      "docs/v3/implementation/plan.md"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "A1", "class": "anchored", "refs": ["prose:l1-pseudocode/HANDLE"] },
      { "id": "A2", "class": "derived", "refs": ["prose:l1-pseudocode/HANDLE", "prose:v3/src/domain/template.ts"] },
      { "id": "A3", "class": "anchored", "refs": ["prose:l1-pseudocode/admit_loaded", "prose:packet ch5-P4"] },
      { "id": "A4", "class": "anchored", "refs": ["prose:l1-pseudocode/HANDLE", "prose:ledger §3 not_active", "prose:plan §11.1 item 1"] },
      { "id": "A5", "class": "anchored", "refs": ["prose:l1-pseudocode/admit_loaded"] },
      { "id": "A6", "class": "anchored", "refs": ["prose:l1-pseudocode/admit_loaded"] },
      { "id": "A7", "class": "anchored", "refs": ["prose:l1-pseudocode/admit_loaded", "prose:ledger §3 missing_role"] },
      { "id": "A8", "class": "anchored", "refs": ["prose:l1-pseudocode/admit_loaded", "prose:ledger §3 role_not_authorized"] },
      { "id": "A9", "class": "anchored", "refs": ["prose:l1-pseudocode/HANDLE"] },
      { "id": "A10", "class": "anchored", "refs": ["prose:l1-pseudocode/HANDLE", "prose:ledger §3 not_authorized"] },
      { "id": "A11", "class": "anchored", "refs": ["prose:ledger §2 l1/authorization-before-commit"] },
      { "id": "A12", "class": "anchored", "refs": ["prose:l1-pseudocode/HANDLE"] },
      { "id": "A13", "class": "derived", "refs": ["prose:l1-pseudocode/admit_loaded"] },
      { "id": "W1", "class": "anchored", "refs": ["prose:ledger §4 l1", "prose:model-src/sections/07-l1"] },
      { "id": "W2", "class": "derived", "refs": ["prose:packet ch4-P3"] },
      { "id": "W3", "class": "derived", "refs": ["prose:packet ch7-P1", "prose:v3/src/ingress/ingress.ts"] },
      { "id": "W4", "class": "anchored", "refs": ["prose:l1-pseudocode/admit_loaded", "prose:packet ch4-P3"] },
      { "id": "W5", "class": "derived", "refs": ["prose:packet ch7-P1"] },
      { "id": "W6", "class": "derived", "refs": ["prose:v3/src/store/sqliteStore.ts"] },
      { "id": "W7", "class": "anchored", "refs": ["prose:l1-pseudocode/warrant"] },
      { "id": "C1", "class": "anchored", "refs": ["prose:l1-pseudocode/capability"] },
      { "id": "C2", "class": "anchored", "refs": ["prose:l1-pseudocode/capability"] },
      { "id": "C3", "class": "anchored", "refs": ["prose:l1-pseudocode/capability"] },
      { "id": "C4", "class": "derived", "refs": ["prose:ledger §4 l1", "prose:model-src/sections/07-l1", "prose:plan §11.2"] },
      { "id": "C5", "class": "anchored", "refs": ["prose:model-src/sections/07-l1", "prose:l1-pseudocode/HANDLE"] },
      { "id": "C6", "class": "anchored", "refs": ["prose:l1-pseudocode/capability"] },
      { "id": "K1", "class": "anchored", "refs": ["prose:l1-pseudocode/dispatch_intent", "prose:ledger §4 l1"] },
      { "id": "K2", "class": "anchored", "refs": ["prose:packet ch4-P4", "prose:l1-pseudocode/dispatch_intent"] },
      { "id": "K3", "class": "derived", "refs": ["prose:l1-pseudocode/dispatch_intent"] },
      { "id": "D1", "class": "derived", "refs": ["prose:packet ch7-P2", "prose:v3/src/diag/sqliteDiagStore.ts"] },
      { "id": "D2", "class": "derived", "refs": ["prose:packet ch7-P2"] },
      { "id": "D3", "class": "anchored", "refs": ["prose:packet ch7-P1"] },
      { "id": "D4", "class": "derived", "refs": ["prose:v3/src/diag/sqliteDiagStore.ts", "prose:packet ch7-P2"] },
      { "id": "T1", "class": "anchored", "refs": ["prose:model-src/sections/07-l1"] },
      { "id": "T2", "class": "derived", "refs": ["prose:packet ch5-P3", "prose:v3/src/testkit/traceHarness.ts"] },
      { "id": "T3", "class": "derived", "refs": ["prose:v3/src/testkit/traceHarness.ts"] },
      { "id": "T4", "class": "anchored", "refs": ["prose:ledger §2 l1/authorization-before-commit", "prose:packet ch5-P3"] },
      { "id": "X1", "class": "anchored", "refs": ["prose:plan §11.4 P1 row"] },
      { "id": "X2", "class": "derived", "refs": ["prose:packet ch6-P4b"] },
      { "id": "X3", "class": "derived", "refs": ["prose:packet ch6-P4b"] },
      { "id": "X4", "class": "derived", "refs": ["prose:l1-pseudocode/warrant", "prose:packet ch5-P4"] },
      { "id": "X5", "class": "derived", "refs": ["prose:v3/src/cli/dev/main.ts", "prose:packet ch6-P4b"] },
      { "id": "O1", "class": "new-decision", "refs": [] },
      { "id": "O2", "class": "derived", "refs": ["prose:packet ch6-P4a"] }
    ]
  }
}
```

## Pre-approval flags

1. **O1 is a NEW-DECISION row — the operator `submit` role flag's
   required-at-parse form.** Two conform alternatives exist:
   REQUIRED at parse (usage error naming the quartet — fail-fast on
   the production write surface, ch6-P4a version-flag parity) vs
   OPTIONAL pass-through (a role-less submit reaches the kernel and
   returns the `missing_role` outcome row). The pick: REQUIRED,
   grounds in the O1 row. Minted at arm gate 1 (2026-07-12): the
   external arm refuted the derived classification — the parity
   argument is a design preference, not a model entailment; the
   internal panel's lens-5 watchpoint had named this the packet's
   closest call. Below the Case-B triggers (one row; CLI-surface
   ergonomics — no authority / separation / availability-class
   semantics). Route: approve-ratified — the human approve act
   ratifies the pick (the ch8-P1 E6 / ch7-P4 F2 precedent). The
   aligned plan edit (§11.4 P1 row) carries the same surface; its
   propagation-class status is unchanged (the SURFACE's existence
   is entailed transport closure — only the required-vs-optional
   FORM is the decision).

No other flag, narrowing, or open decision point rides: no
prediction/discovery mismatch beyond the one-row classification
(recorded in the header), no contested substrate premise (no cell
of any matrix rests on driver/OS/filesystem behavior — W6's
pass-through is a measured code fact, not a substrate claim).

## Acceptance

- **Dimensions 1–10 test-driven; every declared lane driven by name
  and ABLE TO FAIL (R-LANE-SENSITIVITY):**
  - `kernel/admission.test.ts` — the ladder in isolation: every rung
    outcome (A3–A8) + the LADDER-INTERNAL dimension-1 combinations
    (the first seven: idempotency/state/version/staleness/authority
    pairs — each lane stages BOTH conditions; a reordered ladder
    fails them); A13's omitted-parameter surface asserted
    structurally (no correlate parameter exists). The CROSS-BOUNDARY
    combinations (8, 9, 10, 11 — authority vs navigation vs
    capability) CANNOT run here (admit_loaded never sees
    `envelope.type` or capability): their home is the kernel bullet
    below.
  - `kernel/capability.test.ts` — the dimension-4 grid: default
    derivation (own role = transition set, other role = ∅), explicit
    profile hit (allow honored), explicit empty allow (C6), profile
    precedence over derivation.
  - `kernel/kernel.test.ts` — HANDLE end-to-end: the four new
    rejection lanes through the real seam; the DONE-instance lane's
    expectation FLIPPED to `not_active` (A4 — the old
    `no_transition` expectation removed, not duplicated); the
    CREATED store-staged lane; the CAS-restart × terminal lane
    (dimension 6); explicit pre/post FULL-instance equality assertions
    (every `WorkflowInstance` field, `round` included, + transcript
    row set) after every rejection lane, checkers as the belt
    (dimension 5, A11); `not_authorized` via an explicit-profile template
    value; the dimension-1 CROSS-BOUNDARY ordering combinations,
    both conditions staged end-to-end: #8 wrong role + nonexistent
    type → `role_not_authorized` (the canonical reorder catch:
    navigation hoisted above authority would answer `no_transition`),
    #9 right role + nonexistent type → `no_transition`, and #11
    wrong role + explicit profile → `role_not_authorized` (authority
    precedes capability; the staged profile FORBIDS the granted
    role's type — #10's forbidding entry reused — so a
    capability-first reorder would answer `not_authorized` and the
    lane stays able to fail). The A4 answer-flip binds EVERY existing post-terminal
    `no_transition` lane BY NAME: `kernel/kernel.test.ts` (the DONE
    lane) and `floor/diagTail.test.ts` (the post-terminal kernel
    drive in the tail suite) — each expectation CHANGED to
    `not_active`, none duplicated.
  - `ingress/ingress.test.ts` — W2 (role-carrying envelope passes),
    W3 (empty/non-string → `invalid_shape` + the
    `invalid_expected_role` diag token), W4 (absence passes ingress
    and yields KERNEL `missing_role` end-to-end).
  - `kernel/diagEmission.test.ts` — dimension 7: one
    `kernel`/`rejected` event per new reason with `payloadDigest`
    present; committed still emits nothing.
  - `diag/sqliteDiagStore.test.ts` — D1/D2 acceptance lanes (each
    new reason/token row persists) + the validation negatives
    updated; D4's sensitivity: before the extension these rows were
    dropped — the acceptance lane fails on the un-extended set.
  - `l1Trace.test.ts` — T1/T4 (the golden trace, full-sequence
    transcript equality, checkers green).
  - `l0aTrace.test.ts` / `l0bTrace.test.ts` — T2: lifts applied,
    committed-row sequences and final states unchanged.
  - `testkit/traceHarness.test.ts` — T2/T3 kit self-tests (explicit
    `expectedRole` wins over the lift; the lift stamps the current
    step's role).
  - `cli/dev/dev.test.ts` — X1–X3 schema lanes + passthrough + the
    missing-role staging row; the X5 replay lanes (a role-carrying
    fixture accepted + replayed, an unknown emit-step key still
    rejected, the role-lift axis round-trip, and the WRONG-ROLE
    fixture replaying to `role_not_authorized` — the silent-drop
    discriminator); `cli/cli.test.ts` — the O lanes
    (dimension 10: the required-quartet usage error, the role-carrying
    commit, the wrong-role outcome data row) and every existing
    `submit` invocation gaining `--expected-role`;
    `cli/journey.test.ts` — the journey's
    inject steps and submit calls carry roles (the shipped-entrypoint smoke stays
    green; no NEW entrypoint is wired, so no new journey is minted —
    the existing one is the activation-journey rule's carrier).
  - `store/sqliteStore.test.ts` — W6 round-trip (a role-carrying
    envelope survives the transcript read byte-equal).
  - `emitLoop.test.ts` / `twoWorker.test.ts` — K3: workers echo
    `packet.role`; X4: derived op_ids unchanged by role presence.
- **Behavior-change honesty:** the changed answers on
  previously-green surfaces are the A4 lanes (post-terminal /
  non-RUNNING emits — every such lane named in the kernel bullet),
  the new mandatory-role rejections on role-less envelopes, and the
  operator `submit` parse contract's new required flag (O1 — a
  usage-layer change on the shipped write surface); every other
  suite change is staging
  (`expectedRole` added) or shape (packet `role` field) — asserted
  by the full existing suite running green after the mechanical
  updates.
- Drift tests green (standing, unconditional — PI-3): rejection-name
  registry untouched; `unitMap.json` +6 l1 entries (realized, with
  codeRefs); `domainRegistry.ts`: the three pending l1 TYPE rows
  flipped realized (the `Rejected(...)` rows already are — name
  level, unchanged).
- Coverage validation green: units 11/159 owned (the script's own
  denominator — the fold-time run's output, re-verified at close),
  invariants 11/116, traces 3/20 (the l1 trace joins l0a/l0b).
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint`, `v3:adr-check` (no new ADR
  trigger: no new module home — `admission.ts`/`capability.ts` live
  in the existing `kernel/`; the chapter's module-home ADR is P2's).
- Standing review rules in force: **REV-A1-TXN** (the ladder
  pre-checks stay fast path; the commit txn remains the correctness
  mechanism — note 3); **REV-B-LOCAL-NOT-AUTHORITY** (no
  process-local cache enters; every rung reads loaded committed
  state); **REV-E-NO-ADAPTER-BRANCH** (no adapter-type branch;
  capability reads the injected template value);
  **REV-DIAG-FAILOPEN** (all new emit sites are BARE `diag.emit`
  calls; D4's extension keeps the channel honest);
  **REV-C-PROJECTIONS-READONLY** — n/a (no projection surface
  changes).

## Build record

Approved 2026-07-12 — the user's explicit approve on the approve-ready
basis sha256 `abae0838…89fa26`, ratifying flag 1 (the O1
REQUIRED-at-parse form) — STOP `4:flagged-approve` resolved. The hash
chronicle: R1 FULL bound `f3e71ffc…`; the O-fold produced
`ccdec233…`; R2 FULL (escalated: new lane family) folded to
`33a3a288…`; the R3 reconciliation-verified fold bound `9001a58c…`
and the FIRST close ran CLEAN on it; ARM GATE 1 (agent-invoked
`codex exec`, pin-conform gpt-5.6-sol/high/never, byte guard clean
before+after) returned `refine` citing `9001a58c…` with FOUR
findings — the O1 derived→new-decision reclassification (flag-bearing
→ the autonomous path DEMOTED to the human approve), the C4
container-shape dissolution, the missed dev-`replay` schema surface
(X5), and the checkers-are-not-equality-proofs re-base (A11/T4);
R4 FULL (escalated: manifest-class change) added the `round` field to
the equality set and the X5 wrong-role discriminator (lens 3) plus
two propagation fixes (lens 4); R5 targeted + reconciliation ran
clean on `abae0838…` and the SECOND close ran CLEAN on it. All
internal panel passes Opus-class. 5 counted panel rounds of the
8-round watchdog; reconciliations and the two closes uncounted.

Built the same day. **560 → 619 tests (+59**: the three new files —
admission 17, capability 7, l1 trace 1 — plus 34 appended lanes
across kernel/ingress/diagEmission/sqliteDiagStore/cli/dev/store/
emitLoop**)**. ONE build round: the production slice landed, a
dedicated repair pass updated the 15 kernel-driving suites within the
three sanctioned change classes (role staging, the packet `role`
field, the `not_active` post-terminal flips — zero lane-meaning
changes beyond them), and every NEW lane ran green on first
execution except one test-side seeding typo (`seeded()` in the W6
lane — fixed to the file's own idiom) and six mechanical lint items
(two unnecessary assertions, four unused destructure names). The l1
golden trace ran green on its FIRST execution. Bridges at close:
`pnpm ci:local` FULL gate green (quality + fitness + smoke);
coverage validation green — units 11/159, invariants 11/116, traces
3/20 owned; drift suite green (unitMap +6 l1 realized,
domainRegistry 3 type rows flipped, rejection registry untouched).
The aligned plan edit (§11.4 P1 row) rides THIS commit (R-ALIGNED-UP).

**Aftermath (2026-07-12, ARM GATE 2 — the build-close implementation
review; pin-conform gpt-5.6-sol/high, verdict `refine` citing the
build sha `109221b1`, byte guard clean):** three findings, all
reproduced by the arm's own probes, folded in ONE `fix(v3)` round:
(1) **the capability prototype hazard (product):** the record lookups
read INHERITED members — a `__proto__` role/step pair returned the
prototype object (then the kernel's `.includes` threw into the
internal-failure belt) and an inherited profile entry could act as a
phantom explicit restriction; the validated format legally admits
such ids (the ch8-P1 lesson's kernel-side face). Fix: every
`capability()` lookup is own-property-guarded; driven by the hostile
`__proto__` lane and the inherited-key (`constructor`/`toString`)
phantom-entry lanes. (2) **the debug bundle dropped `expectedRole`
(product):** `BundleEnvelopeMeta`/`toBundleRow` is a HAND-PROJECTION,
not a pass-through — the consume-family scan misread it; fix: the
field joins the meta + projection + the declared envelope keyset, the
boundary gains `floor/debugBundle.ts`, and the fidelity lane drives
it. (3) **A11 under-drive (test-evidence):** the #8/#9/#11
cross-boundary lanes asserted outcomes without the full-state helper
— wrapped in `expectNoStateChange`. 619 → 622 tests; full gates
re-verified green; the delta-scoped reconciliation ran before the
aftermath commit.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "recorded at the ch11 ratification (plan §11.4): pure ledger projection from l1-pseudocode + ledger §2/§3, no format surface", "discovered": "projection" },
    "provenance": { "anchored": 25, "derived": 18, "new_decision": 1 },
    "rounds": { "review": 5, "doc_refinement": 0, "implementation": 1 },
    "stops": [
      {
        "type": "4:flagged-approve",
        "what": "O1 (the operator submit --expected-role REQUIRED-at-parse form) reclassified derived -> new-decision by arm gate 1; the flag-bearing item demoted the flag-free autonomous approve to the human path",
        "resolution": "the user's explicit approve (2026-07-12) on basis abae0838 ratified flag 1 (route approve-ratified) and authorized the build"
      }
    ],
    "detector_misses": [
      {
        "found_at": "approve",
        "what": "arm gate 1 refuted four packet claims twelve internal Opus passes had accepted: O1's derived classification (parity-argument-as-entailment), C4's prescribed TS container shape, the dev replay validator as a missed envelope-staging surface (no type ripple through the parse-tail cast), and runAllCheckers as a no-state-change proof (consistency, not pre/post equality)",
        "why_missed": "the internal lenses judged O1's parity derivation on its own terms instead of asking whether the ALTERNATIVE was equally conform (the lens-5 watchpoint had named the risk without acting on it); the replay surface hid behind the type system's silence; the checker gap needed the arm's what-would-stay-green-on-a-wrong-commit probe. All four folded PRE-build — zero code impact"
      }
      ,{
        "found_at": "arm-build-close",
        "what": "the capability lookups read inherited prototype members (a __proto__ role/step returned the prototype object and threw downstream; an inherited profile key acted as a phantom restriction), the debug bundle's hand-projected envelope meta silently dropped expectedRole, and the #8/#9/#11 lanes lacked the full-state equality the acceptance claimed per rejection lane",
        "why_missed": "the panel's own-property vigilance lived in the ch8 definition layer and never crossed to the kernel-side record lookups; the consume-family scan classified the whole floor as pass-through without opening the bundle's projection; and the R4 equality fold was applied to the lanes the finding named, not re-derived over every rejection lane (the fix-scoped-to-the-finding class, again)"
      }
    ],
    "learned": "the discovered classification arrived in TWO steps: the panel found the missed WRITE SURFACE (round 1), the external arm found the missed DECISION on it (gate 1) — a fresh finder attacks the inventory, an adversarial arm attacks the entailments; the prediction convention should expect classification drift from BOTH directions"
  }
}
```
