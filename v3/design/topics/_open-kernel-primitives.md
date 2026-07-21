# Open Topic — Kernel Primitives (dissolving additive complexity)

Date: 2026-07-05
Status: **COMPLETE (2026-07-06) — the gate chain is closed: the §6.4
acceptance gate ran as the L5 paper test (§8, PASS), was reviewed and
ratified, and the rebaseline executed as waves 1–5 (all ratified, §9): the
five primitives are named contracts in the corpus at their earned birth
points, with instance/phase labels corpus-wide. Kernel-primitives rebaseline
complete. The named debt — the dedicated F-W1-2 ingress/idempotency
hardening touch (operator op_id + the F-W4-1 guards + the RUN_ACTION
reject-name decision) — was DISCHARGED by the ingress touch and its delta
list RATIFIED (2026-07-06, §9 last section). The strand is fully closed.** Joint reading result: the
core-model pseudocode (L0a–L4 complete) was re-read independently by the user and
by the assistant; both readings converged on the same two structural observations.
This memo names the primitives, maps every current kernel unit onto them, and
defines the acceptance tests. The review questions are resolved — decisions in
§6, final naming in §7. The model itself changes only in the upcoming in-place
rebaseline, gated by the L5 paper test (§4). Review round 2 (same day) folded
in: the LC3a row split into two chained errands + the errand-composition rule
(§2 P1), the LC renumbering amendment (§6.2), the rung-order reconciliation
checksum (§6.4), the deferred-gate de-bias instance (§4), the three
selector-authority values + the EmitAffordance cross-ref (§2 P2), and the
Admission first-use contrast + alias table (§7). Review round 3 (an external
reviewer, on the round-1 text) folded in: the status precision above, the P1
form taxonomy, the Warrant field-class split, the P3 schematic-ladder
demotion, and the criteria-first naming record. Review round 4 (two parallel
reviews) folded in: the selector-authority recount (two values today, one
reserved for L9), the correlation field-class correction (`request_id` /
`request_ref` / `link_id` / `child_id`; `episode_ref` is attempt identity,
not correlation), the P4 rung-count fix, the stale "exception" bullet
aligned with the form taxonomy, and two §3 label fixes; the LC3a ask-row
correlation cell was verified against the pseudocode source and is accurate
as written (`resume_events: [step.action.key]` is the actual field). Two
micro-refinements followed: the kernel-classified bullet names the
event-keyed resumes precisely (validated-and-routed, not classified), and
the P1 dimension list points at the four forms instead of the superseded
binary marker distinction. The L5 paper test was then pulled FORWARD of the
rename-pass (fail-fast: the two are independent, and the gate should fail
before any further machinery) and executed as §8.

Relation to other documents:

- [`../../model/core-model.html`](../../model/core-model.html) — the model this memo re-reads.
- [`../../model/core-model-todo.md`](../../model/core-model-todo.md) — Parts A/B/D/E already
  contain per-part fragments of these primitives (noted inline below); this memo names the
  common shapes across them.
- `../../model/` + `tools/v3-model/` — the unit-delta storage that makes the
  eventual refactor cheap (blast radius per unit is a filesystem query).

## 1. The question

The kernel grew level by level, always by addition. The complexity is not
accidental — every guard and marker earns its place — but the *presentation*
of that complexity is additive too: ~16 top-level handlers, 6 wait kinds,
5 intent types, 6 correlated kernel events, 5 keyed routing maps, 6 step
types. The hunch (user): better base primitives might make much of this
complexity *dissolve* — not hidden, but revealed as instances of fewer laws.

The two independent readings:

- **User:** (a) there seem to be several different "loops" running with
  different intents, hard to grasp; (b) the pseudocode is flowing text, no
  articulation of sub-concerns; (c) the CAPITAL_NAME → Outcome handlers'
  mutual relationships are unclear (entry point? competitor?); (d) much of it
  feels like it is really a "switch" structure.
- **Assistant:** (1) one five-phase async exchange shape recurs everywhere;
  (2) the file is ordered historically, not by conceptual layer; (3) the
  handlers fall into three classes; (4) five keyed routing maps share one
  "guarded keyed selection" structure.

(a)+(1), (c)+(3), (d)+(4) are the same findings from two directions. The
model's own history supports the move: `apply_target_entry_effects` and the
decisions/outcomes de-vocabularization were exactly such dissolving steps,
taken once enough concrete cases existed. All motivating cases now exist.
External reference: Temporal's CHASM (the synthesis's "component-registry
generalization" adoption) is a general state-machine kernel with pluggable
components — the same direction, shipped.

## 2. Candidate primitives

### P1 — Errand (async request/reply with a claimed marker)

```text
durable claim/marker committed (carries request_id)
  → intent produced POST-COMMIT (produce-not-perform)
    → external work happens (provider / runner / human / child kernel-path)
      → correlated completion arrives (guards: our request? still current?)
        → keyed routing / state advance, one CAS commit
```

Declared dimensions: marker slot & its home, intent + addressee class,
completion event(s), correlation rule, on_ok / on_fail routing, and which of
the four forms below the errand takes.

The diagram shows the FULL form; the table below contains four declared
forms, and an implementation must not force them onto one mechanism:

- **full** — durable marker + outbound directive + async correlated
  completion (provision, release, auto action, spawn, human decision, the
  LC3a ask);
- **inline** — durable marker claimed, then the work AND the completion run
  in the same handler invocation, bracketed by two CAS commits (the LC3a run;
  a crash between them leaves the durable marker for L9);
- **marker-less inline** — no durable marker at all, synchronous invocation
  (the process gate; its deferred variant is the same errand upgraded to the
  full form — §4);
- **open-door** — marker only, no outbound directive: the kernel waits for
  the world to come to it (bare wait, kickoff, child await).

| Instance | Claim marker | Intent (addressee) | Completion | Correlation | Failure shape | Irreducible logic |
|---|---|---|---|---|---|---|
| provision (L0e) | `requested(req)` | `provider.provision` | `RUNTIME_CONTEXT_READY` | request_id | kernel `FAIL` (L0d) | kind-boundary check |
| release (LC2) | `releasing(req, ref)` | `provider.release` | `RUNTIME_CONTEXT_RELEASED` | request_id + CAS | `release_failed(ref)` — obligation retained | release_safe precondition (LC1 INV-5); partial failure is a handle, not a runtime |
| auto action (LC3b) | `action_running(req, episode)` | `ActionIntent` (runner) | `ACTION_RESULT` | request_id | re-park / unhandled parked | episode-anchored retry budget |
| operator action — ask (LC3a) | `WAITING(action_pending)` | `ActionRequest` (operator) | `RUN_ACTION` | `action_key ∈ resume_events` + expected_version | no timeout (L9); a failure outcome re-parks = a fresh ask | trigger-validation (payload) runs before any claim |
| operator action — run (LC3a) | `action_running(op_id, req)` — claimed inside `RUN_ACTION` | — (the runner runs inline, post-claim) | inline phase-3 commit | `REQUIRE request_id` | re-park `action_pending` (opens the next ask-errand); a crash in the window leaves the durable marker → L9 | workspace-reality (outcome) vs trigger split |
| spawn (L4) | link `spawning` (request_id) | `SpawnIntent` (kernel CREATE_INSTANCE) | `CHILD_SPAWNED` / `CHILD_SPAWN_FAILED` | link_id + request_id | `failed` route (guaranteed at load) | contradictory-completion reject |
| child await (L4) | link `active` + `WAITING(child_event)` | — (child already running) | `CHILD_LIFECYCLE` | link_id + child_id | L9 reconciliation edge | lost-CHILD_SPAWNED self-heal bind |
| human decision (L3) | `DECISION_REQUEST` + `WAITING(human_decision)` | `HumanDecisionRequest` (operator) | `SUBMIT_DECISION` | request_ref | no timeout (L9) | override iff chosen ≠ recommendation |
| kickoff (L0d) | `WAITING(kickoff_pending)` | — (implicit ask) | `KICKOFF` | wait.kind | — | task supply |
| bare wait (L3) | `WAITING(kind)` | — | `RESUME_WAIT(event)` | resume_events class | — | — |
| process gate (L2a) | — (inline, no durable marker) | `GateInvocation` (runner) | `ProcessResult` (synchronous) | in-handler | runner_error / timeout → block | verdict-source explicitness |

What the table itself surfaces (this is the payoff of naming the primitive):

- **Completions arrive over two transports today**: kernel events for
  machines, operator intents for humans. The input source classes are
  *transport*; the errand is the concept. `SUBMIT_DECISION` is not a
  different kind of thing from `ACTION_RESULT` — it is the human-addressed
  errand's completion.
- **The process gate is the only marker-less errand** — by design (inline
  under timeout; the A2 test says its result is not re-derivable but the
  transition simply blocks). Under the form taxonomy above this is a named
  FORM (marker-less inline), not an exception — and its deferred variant
  (§4) upgrades the same errand to the full form: a gradation, not an
  anomaly.
- The "competes with what?" question (user's (c)) becomes systematic: every
  single-winner race in the model is a race *within one errand* (two
  RUN_ACTIONs on one claim; a late RELEASED vs the dispatch-error follow-up;
  SPAWNED vs SPAWN_FAILED on one attempt).
- core-model-todo cross-refs: A2 (derived vs durable marker) is the rule for
  the marker column; B2 (in-band `request_id` correlation) is the correlation
  column; D1 (+ the N-child fan-in contract, since 2026-07-06 in
  `core-model-future-topic.md` L4 #7–#10) is the spawn/child-await pair's
  contract.
- **Errands compose without a sixth primitive.** The LC3a step is two chained
  errands — the ask-errand's completion (`RUN_ACTION`) opens the run-errand in
  the same handler; a failure outcome that re-parks opens a fresh ask-errand;
  the LC4 delete chain is an errand sequence behind one operator intent; L5's
  help-ask will complete back onto the same position (§4). Composition is
  ordinary committed state: inter-step chains route through ChoicePoints,
  intra-step chains are a completion opening the next errand — never a hidden
  orchestration layer.

### P2 — ChoicePoint (guarded keyed selection — the "switch")

One structure behind all five routing maps: *a position offers a declared key
set; an authorized selector picks one key; guards validate; the commit routes
by the key through the shared arrival.*

| Map | Offered at | Selector authority | Payload contract | Irreducible rule |
|---|---|---|---|---|
| `transitions` | agent step | the bound actor (expected_role) | emit contract (todo Part E) | gate pipeline runs before commit |
| `decisions` | human_gate | the bound operator | per-decision required fields | override iff ≠ recommendation |
| `outcomes` | action step | the runner's classified result | trigger payload (operator) / template-fixed spec (auto) | business-vs-infra split; retry is a per-outcome closed union |
| `wait_for` | child_workflow step | the child's terminal commit | — | fail-closed subscription; every terminal disposition routed |
| `on_resume` | wait step | the resume event's type | result payloads later | — |

The step-type zoo then stops being six kinds of step: a step is one concept
configured by {who selects, what claim/errand precedes the selection, what
payload contract applies, what outbound surface is derived}. The kernel
already knows no key *names* (de-vocabularized per map); P2 is the same move
one level up — de-vocabularizing the *map kinds* themselves.

The selector-authority dimension has two values in today's model, plus a
third that the L9 design question reserves — naming all three now gives L9
its slot ready-made:

- **principal-committed** — an authorized principal picks, and the commit is
  theirs (an actor's emit, an operator's decision);
- **kernel-classified** — no accountable selector: the kernel derives the
  key and commits — by classifying a result (a runner's outcome, a child's
  terminal disposition) or, in the event-keyed resumes, by validating and
  routing the incoming event's type as the key (validated, not classified);
- **proposed** (reserved — L9, not instantiated today) — the selector may
  only propose, never commit (the L9 fuzzy matcher's `MatchProposal`; §4).

Packet-side projection (cross-ref): the structured emit-affordance surface
(future-topic L0b #4; the EmitAffordance direction in
[`v3-gate-policy-config-design-synthesis.md`](v3-gate-policy-config-design-synthesis.md))
is exactly the ChoicePoint's offered key set projected to the actor — P2 is
not only kernel structure but the source of the L0b/L2b guidance surface.

### P3 — Admission (one ordered guard ladder, parameterized; a step is a *rung*)

Every entry path runs the same ordered ladder with per-input-class
parameters; today it exists only as repeated code order plus prose:

```text
load instance → idempotency (op_id → Duplicate) → state guard (ACTIVE / wait.kind)
  → correlation (request_ref / request_id / resume class) → CAS precheck (expected_version)
    → authority (role / operator binding) → payload contract (required fields / emit schema)
```

Canonical rules the ladder pins once: idempotency-before-stale (todo A1),
lifecycle-guard-after-idempotency (L0d), authority-on-this-path-not-L1 (L3).

This ladder is **schematic, not a third normative source**: todo Part E2
fixes the precise actor-envelope order (basic `valid_shape` → load → op_id
ledger incl. `op_id_collision` → kernel authority → transition/capability →
`validate_emit_contract` → gates → commit), including cases the schematic
above omits (the basic-shape vs per-op-schema split, `op_id_collision`, the
transition/capability check, the gate pipeline's position). The norms are E2
plus each handler's current code order; the §6.4 reconciliation checksum
checks every path instantiation against THEM, not against this sketch.

### P4 — Warrant (the acting-from authority snapshot)

The warrant is the INBOUND act-from bundle — one name for what an input
carries, but internally it is three distinct field classes, and the model
(todo Parts A/E) deliberately keeps them apart because different admission
rungs consume them — operation identity and errand correlation one rung
each, context authority two (the CAS precheck and the authority rung):

- **operation identity** — `op_id`: idempotency (todo A1); consumed by the
  idempotency rung and the ledger, never by an authority check;
- **context authority** — `expected_version`, `expected_role`, …: freshness
  and role — what the sender was entitled to act *from* (todo E1's universal
  vs shape-derived split lives here);
- **errand correlation** — `request_id` / `request_ref` / `link_id` /
  `child_id`: WHICH open errand this input answers; consumed by the
  correlation rung.

`episode_ref` is deliberately NOT in the correlation class: it is
attempt/retry-episode identity — kernel-side wait state feeding the LC3b retry
budget — and it stays with that irreducible logic, not in the warrant.

The bundle-level name is still useful (one thing the sender assembles and
the packet projects), but the rebaseline must keep the three classes named —
collapsing them would undo exactly the A1/E1 separation.

### P5 — Directive (the outbound ask family)

`DispatchIntent`, `HumanDecisionRequest`, `ActionRequest`, `ActionIntent`,
`SpawnIntent` = one concept — *the kernel asks someone to do something* —
with an addressee class (actor / operator / runner / kernel) and a projected
payload. The future topics already anticipate more members
(`CapabilityIntent` L7, `RememberIntent`/`LinkIntent` L11): the family exists
implicitly. L8 (durable delivery) then generalizes ONE family's transport,
not five unrelated objects.

## 3. Handler reclassification (what dissolves, what remains)

| Handler | Class | Becomes |
|---|---|---|
| HANDLE | admission + selection | P3 + P2(transitions) + gate pipeline |
| SUBMIT_DECISION | admission + errand completion + selection | P3 + P1(human) + P2(decisions) + override rule |
| RESUME_WAIT | admission + errand completion + selection | P3 + P1(bare wait) + P2(on_resume) |
| RUN_ACTION | admission + claim + inline errand + selection | P3 + P1(LC3a ask completion → run errand) + P2(outcomes) |
| KICKOFF | admission + specialized resume | P3 + P1(kickoff) + task supply |
| RUNTIME_CONTEXT_READY / RELEASED | errand completions | P1(provision) / P1(release) |
| ACTION_RESULT | errand completion + selection | P1(auto action) + P2(outcomes) + retry budget |
| CHILD_SPAWNED / SPAWN_FAILED / LIFECYCLE | errand completions (+ selection) | P1(spawn) / P1(child await) + P2(wait_for) |
| CREATE / START / CANCEL / FAIL / DELETE_REQUESTED | lifecycle intents | stay: macro-axis moves + load-time validators + the LC4 chain |
| dispatch_intent / *_request / *_intent builders | outbound projections | P5 instances |
| resolvers / validators / providers / predicates | unchanged layers | P3/P1 consume them; not dissolved |

Genuinely irreducible logic (the residue that stays bespoke — this list is
the point, it is short): the override rule; the episode retry budget; the
trigger-payload vs workspace-reality split; release_safe + the
release_failed handle semantics; the kind-boundary check; the child link
self-heal; round semantics; the gate pipeline placement.

**REALIZED (waves 1–5, 2026-07-06):** this table's classifications now
appear as in-code contracts and labels in the corpus — the declarations at
their birth points (L0d/L1/LC2/L3) and phase/instance labels at each
handler; the irreducible-residue list above is exactly what stayed bespoke
and is labeled as such at its sites. See §9 for the per-wave record.

## 4. De-bias tests (does a non-anchor case fit?)

- **L6 timer**: an errand {marker: durable timer row, intent: scheduler wake,
  completion: TIMER_FIRED, correlation: timer id, on_fire: reload-and-discard
  if stale} — fits P1 exactly (and the future-topic L6 §1–2 text already
  describes it in these terms without the name).
- **L9 fuzzy external correlation**: a selection whose selector may only
  *propose* (MatchProposal), not commit — fits P2 with one new authority
  dimension (propose vs commit), which is precisely the L9 design question.
- **Deferred process gate** (the corpus's "named but not numbered" slice:
  `WAITING(gate_pending)` + `GATE_RESULT`): a regular durable-marker errand —
  showing that the inline process gate's missing marker is a *gradation*
  (inline = the marker-less form), not an anomaly. Strengthens P1.
- **L7 CapabilityIntent, L11 RememberIntent**: named P5 members already.
- **L5 help subflow (the paper test — MUST pass before any refactor)**: a
  help-ask parks a wait and asks the operator (P1, human-addressed), but the
  reply resumes the SAME position with appended context — a selection whose
  route is "stay + enrich handoff". Either P2 grows a declared
  stay-continuation, or help is a bare wait whose on_resume routes to the
  same step — and it is an instance of errand composition (§2 P1). If L5
  cannot be expressed as a few declarations over P1/P2/P5, the primitives are
  wrong. **Executed → §8: PASS, three findings.**

## 5. Guardrails

- **Unification must not erase deliberate distinctions.** The decision-wait /
  bare-wait split, the LC3a/LC3b boundary, operator-intent vs actor-envelope as
  separate input classes — these stay as *declared dimensions* of the
  primitives, never collapsed away.
- **The acceptance test is the next consumer, not elegance.** L5 and todo
  Parts A/E/F must become *easier* to express. If they need force, stop.
- **The ramp stays pedagogical.** Levels keep introducing concrete instances;
  the primitives are the vocabulary the later levels get to reuse, not a
  framework chapter forced before L0a.
- **No hiding.** A primitive is a named, one-place-defined contract; the
  guard order and the CAS points must remain visible in it — the point is to
  reveal structure, not to abstract it out of sight.

## 6. Decisions (review closed, 2026-07-05)

1. **Depth — primitives as named contracts in the pseudocode.** P1–P5 are
   defined once as contracts; the handlers become their instances
   (parameterization + their short irreducible logic, §3). The guard order and
   the CAS points stay visible inside the contract definitions — reveal, not
   hide. The fully generic engine (handlers dissolve into declarations) is
   rejected: traces and evidence would lose their concreteness.
2. **Placement — in-place rebaseline at the earned points.** Each primitive is
   introduced where its second instance historically appeared (P3 at L0d, P4
   at L1, P1 at LC2, P2+P5 at L3), and every later level is re-expressed on the
   primitives — the ramp itself demonstrates the dissolution, and L0a–L2b
   barely move. Rationale: the new-reader and implementation-foundation
   priorities outweigh historical fidelity (git is the archive; the
   2026-06-15 conceptual-order rebaseline is the precedent). The
   second-instance rule stays the FORWARD-going principle: a future primitive
   is named at its own second instance.
   - **Renumbering rides the same effort, as a mechanical, grep-verified
     rename-pass BEFORE the semantic work.** AMENDED in review round 2: the
     first cut (① → L3a … ④ → L3e) hid a false-containment trap — the L2a/L2b
     precedent works because those ARE L2-family, whereas LC1 is a cross-cutting
     storage invariant, LC2 is explicitly L0e's release mirror, and LC4 is ops;
     "L3b" would wrongly claim L3 membership and clash with the future-topic
     owning-level idiom. Final scheme: **LC (lifecycle-close) slices** —
     ① → LC1, ② → LC2, ③a → LC3a, ③b → LC3b, ④ → LC4. The internal ③a/③b
     pairing survives, and "lifecycle-close" is existing corpus vocabulary.
     The rename-pass header must state: LC names a BUILD-ORDER strand (landed
     between L3 and L4 in the ramp); ownership stays with the owning level
     (LC2 completes L0e, etc.). The L0f+ display name became **L0g** in the same pass — the natural
     continuation of the L0a–L0f letter pattern (run-scoped variant
     resolution is one coherent capability); internal ids (`l0f-mode`) stay
     as frozen slugs. Full corpus renumbering (L4 → L8 …) stays rejected. The rename-pass
     has landed; this memo now uses the LC notation (the mapping above is
     the historical record).
3. **Transports — unified at the primitive level.** The three input classes
   (actor / operator / kernel event) stay, with their distinct guards; the
   errand-completion contract is one, with a declared transport + authority
   dimension. Collapsing the input classes themselves is rejected.
4. **Safety rails for the rebaseline** (a deliberate one-time effort): the L5
   paper test gates the start; per-level commits; the derived registries (the
   78 rejection reasons, the 104 invariants, the deferral ledger) serve as
   semantic checksums diffed at every step — the sets must survive
   re-expression; the runtime traces serve as behavior fixtures. One more
   named checksum: the Admission rung ORDER per path — §2 P3's canonical
   order must be reconciled against the existing normative orders (todo
   A1/C2/E2 and each handler's current code order, which do NOT read
   identically today); any divergence found during the rebaseline is a
   FINDING to resolve in review, never a silent normalization.

## 7. Naming (decided via a six-lens brainstorm)

The durable selection criteria — any future rename must satisfy the same
list: (a) greppable and TypeScript-clean (no ecosystem collisions, no
substring traps); (b) no false friend — a confident cold guess must not be
wrong on a load-bearing property; (c) the five names mutually non-confusable
(letters, shapes, registers), with adjacent pairs disambiguated by a stated
contrast (inbound-carried Warrant vs outbound-issued Directive); (d)
first-reader clarity — the name predicts the meaning; (e) native to the
document's idiom, so the existing vocabulary (produce-not-perform,
marker-first, arrive, park) keeps living inside them.

Method (provenance): six parallel brainstorm agents, each with a distinct lens
(distributed-systems literature · plain-English domain · the document's own
idiom · metaphor systems · TypeScript API surface · first-time-reader
pedagogy), all anti-anchored: none saw the working names. The final set was
chosen where lenses converged; a working name survived only where it was
re-derived independently.

| Primitive | Final name | Was | Evidence |
|---|---|---|---|
| P1 | **Errand** | Exchange | Exchange demoted by two lenses (AMQP/finance noise; weakest API inflection). Roundtrip won three lenses but carries a synchronous-RPC false friend for exactly this document's audience. Errand is idiom-native (the park/claim/bubble register), inherently asynchronous, and nobody reads it synchronous. |
| P2 | **ChoicePoint** | Guarded Keyed Selection | Three-lens convergence; the working name was a description, not a name; near-exact cold-guess result ("a place where one of several predeclared options gets picked"). |
| P3 | **Admission** (a step is a **rung**) | Admission Ladder | Confirmed by 5/6 lenses — the strongest validation of a working name. "Rung" adopted for the steps ("stops at the idempotency rung"); the ladder image is the only one that carries the load-bearing ORDER in the name itself. |
| P4 | **Warrant** | Authority Binding | All six lenses landed in the legal register (Warrant 4×, Standing 2×). Verbs cleanly (verify the warrant), composes with P3 ("the authority rung checks the warrant"), and its scoped/expiring connotation pre-explains staleness. |
| P5 | **Directive** | Ask/Intent | Three-lens convergence. "Ask" as a code identifier is un-greppable (`ask` ⊂ `task`) — it survives in prose only. The existing `DispatchIntent` / `ActionIntent` / `SpawnIntent` (+ `HumanDecisionRequest`, `ActionRequest`) become the family's members; no rename of the members is required. |

The sentence test — the kernel's whole path in the final vocabulary:

> An **errand** opens marker-first: the durable claim commits, and only then
> is its **directive** produced — produced, not performed — and handed to its
> addressee. When the answer returns, it climbs the **admission** ladder rung
> by rung; its **warrant** is checked — is this our errand, did the sender act
> from current state, in the right role? If it holds, the answer turns its key
> at the **choice point**: one atomic commit settles the errand, routes the
> workflow, and derives the next directives.

Confusability: first letters E·C·A·W·D all distinct; five different registers
(errand/branching/climbing/law/command). The one adjacent pair — Warrant and
Directive are both official-document words — is disambiguated by direction: a
warrant is what an inbound sender *carries*, a directive is what the kernel
*issues* outbound; state this contrast once at first use. A second first-use
contrast: **Admission is validity screening of one input, not load-based
admission control** — the distributed-systems sense (backpressure / load
shedding) is nearby and must be fenced off in the sentence that introduces
the ladder.

Clarifications recorded during review:

- **An errand is not a "job."** A job names the work; an errand names the
  round — the kernel's open, correlated expectation. An errand's completion is
  not a terminal state but an input that routes a parked position; and the
  kernel never executes (produce-not-perform) — job vocabulary belongs to the
  addressee's side (a runner may fulfil an errand by running a job). A `Job`
  type would also collide with the model's `task` and drown in cron/CI/k8s
  grep noise.
- **The bare wait is a degenerate errand** — a marker with no outbound
  directive ("an errand without the errand-boy"). Accepted name cost: the
  fully general concept is "open correlated expectation," and errand names the
  majority shape.

Alias reconciliation — the rebaseline either renames these or records the
alias explicitly; the corpus must not end up with two names for one thing:

| Final name | Existing corpus aliases |
|---|---|
| Errand | "exchange" (this memo's draft); the future-topic L6 §1–2 timer text (describes the shape without naming it) |
| ChoicePoint | "keyed routing map(s)"; the transitions / decisions / outcomes / wait_for / on_resume map family |
| Admission | "guard ladder" / "admission ladder"; the todo E2 "check order" |
| Warrant | todo E1 "authority binding"; the corpus's "authority snapshot" / "emit authority" |
| Directive | the "Ask/Intent family"; the "produce-not-perform outputs" |

Poisoned words (collected across the six lenses — do NOT use in this model or
its codebase): `Conversation` (reads as LLM chat), `Saga` (implies
compensation semantics), `Token` (doubly poisoned: auth + LLM), `Lease`
(implies TTL + renewal; the model has none), `Pick` (TypeScript built-in
`Pick<T, K>`), `Turnout` + `Turnstile` together (visual near-collision), bare
`Ask` in code (`ask` ⊂ `task`), bare `Intent` as a standalone type (drowns
among the `*Intent` members), `Attestation` / `Credential` for P4
(over-promise crypto / authn), `Ingress` (K8s L7 routing), any `Gate*` wording
near Admission (the Gate nouns are a different concept — rungs, not gates),
and 2PC-flavored `Prepare`/`Commit` naming pairs (the model is single-commit
CAS, not distributed commit).

## 8. The L5 paper test — executed (PASS, three findings)

The slice under test (approach.md L5 block + the L3 Absent items): the
agent-initiated Ask — an ACTIVE actor asks for help mid-step; `Subflow`
blocking / non-blocking; `HELP_PENDING`; local delivery; v1 grounding =
`WAITING_HUMAN` (active agent asks, round ≥ 1, same-context resume, no
routing). The deferred request-rework composite (`pending_rework_intent` +
watchdog) is explicitly owned by the watchdog slice (L6/L9), not L5-core.

### The declarations (the whole L5-core, expressed on the primitives)

| # | Declaration | Primitive | Notes |
|---|---|---|---|
| 1 | op `HELP_REQUEST` — declared per step/role, payload schema (question + refs) | P2 key + P3 payload rung (+ an L1 capability entry) | admitted through HANDLE's existing ladder; its commit parks instead of routing |
| 2 | wait kind `help_pending` + durable `HELP_REQUEST` transcript entry (fresh `request_ref`) | P1 marker (full form) | one more value on the L0d WAITING axis — the precedented extension point |
| 3 | `HelpRequest` (operator-addressed, free-form reply — not a decisions map) | P5 member | derived post-commit from `wait.kind = help_pending` |
| 4 | completion `HELP_REPLY` (operator intent) | P1 human-transport completion + P3 rungs | rungs: op_id · wait-kind · `request_ref` · CAS · `binding[operator]` · reply required — the same contract family as `SUBMIT_DECISION`, different parameters |
| 5 | selection: **stay** — same `current_step`, `advances_round = false`, next dispatch's handoff = original ⊕ reply | P2 (degenerate, single-key) | "same-context resume" at the kernel = same position + enriched handoff; SESSION continuity is adapter-side (L0c/executor), not kernel |
| 6 | variant: blocking (marker homed in the wait slot) vs non-blocking (marker homed in a help-link record collection — the `ChildWorkflowLink` precedent) | P1 "marker home" dimension | dimension values, no new machinery; the non-blocking form can be deferred without touching the shape |

Zero new mechanisms: one new operator-intent entry point (`HELP_REPLY`),
which is itself an instance of the existing human-transport completion
contract. Corroboration from the roadmap itself: approach.md's L8 block
already speaks of "the **general Ask** … the broadest form the **L3/L5
primitive** matures into" — singular; the Directive family IS that maturation
path (`HumanDecisionRequest` L3 → `HelpRequest` L5 → external-token asks L8).

### Findings (feed the rebaseline)

- **F1 — P1 gains a declared *opener* dimension**: arrival-opened (the kernel
  opens the errand on entering a step — every instance so far) vs
  emit-opened (an actor opens it mid-step — `HELP_REQUEST`). A dimension on
  the existing admission+commit machinery, not new machinery.
- **F2 — P2's *stay* route is confirmed needed** and now concrete: stay =
  same position + no round advance + handoff enrichment. (Anticipated by the
  composition rule; L5 is its first load-bearing instance.)
- **F3 — the marker-home dimension carries blocking vs non-blocking**:
  wait-slot home = blocking subflow; record-collection home = non-blocking
  (child links are the existing precedent for collection-homed errand
  markers). The "≤ 1 open wait" shape is a property of wait-slot-homed
  errands only, not of errands per se.

Out of scope, compatible: the deferred-rework stash is one more marker with a
declared apply-on-completion rule — watchdog-slice work; the primitives do
not obstruct it.

**Verdict: PASS.** L5-core reduces to six declarations over P1/P2/P3/P5 with
no new handlers beyond a parameterized completion entry. The acceptance gate
of §6.4 is satisfied — this section was reviewed and ratified on 2026-07-06
(the "ratify the L5 paper test" commit), and the wave-5 review re-read it
and re-affirmed the verdict, closing the gate chain explicitly.

## 9. Rebaseline findings log

Per §6.4, divergences found during the waves are recorded here as findings
with proposed dispositions — never silently normalized. Each disposition is
ratified in the wave's review.

### Wave 1 (L0d — Admission born) — wave reviewed, both dispositions RATIFIED (2026-07-06)

- **F-W1-1 · rung-order wording divergence (todo C2 vs the code).** The
  `SUBMIT_DECISION` code (and todo A1) put idempotency BEFORE the
  wait-kind/state and correlation checks; todo Part C2's prose enumeration
  begins with "wait kind, request correlation, idempotency, …", though it
  also says "keep idempotency before stale, as in A1". Proposed disposition:
  the CODE order is normative (idempotency first after load — that is what
  makes a replayed duplicate a no-op regardless of the instance's current
  wait); C2's enumeration is a listing, not a sequence, and should be
  reworded to match when the todo is next touched. No behavior change.
  *(Disposition APPLIED 2026-07-06: C2 reworded to the normative order in
  the todo review round.)*
- **F-W1-2 · operator intents at L0d carry no operation identity.**
  `KICKOFF` / `START` / `CANCEL` have no `op_id` — their idempotency rests on
  single-shot state preconditions. Wave 1 makes this VISIBLE (their
  `admit_loaded` expects omit the op_id rung, with a pointer here) but does
  not fix it. Expected resolution — recorded now so the explicit gap does not
  normalize into an accepted state: todo A1/A3 expect stable operation
  identity on this input class too (C2 is explicit for `SUBMIT_DECISION`);
  operator intents gain `op_id` when their paths are next rebased (wave 4
  for the L3-born ops; a dedicated ingress-idempotency touch for
  `KICKOFF`/`START`/`CANCEL`). *(RESOLVED by the ingress touch — the last
  §9 section.)*

### Wave 2 (L1 — Warrant born) — wave reviewed, both dispositions RATIFIED (2026-07-06)

- **F-W2-1 · todo E2's rung enumeration needs reconciliation wording, not a
  code change.** E2's actor-envelope order reads "basic `valid_shape` → load
  → op_id ledger → kernel authority → transition/capability → …" with no
  lifecycle/state or staleness entry between the ledger and the authority
  check, while the code order (normative, per F-W1-1's principle) is
  idempotency → lifecycle/state → staleness → authority →
  transition/capability → payload/gates. This is almost certainly
  prose granularity, not a semantic divergence: E2's "kernel authority
  checks (E1)" item compresses the whole context-authority family — E1
  itself counts `expected_version` among its fields — so state + staleness +
  role travel inside that one bullet. Proposed disposition: when todo E2 is
  next touched, add a clarifying parenthetical unpacking the compressed item
  to the full ladder order; no code or rung-order change. *(Disposition
  APPLIED 2026-07-06: the E2 check-order line carries the parenthetical,
  from the todo review round.)*
- **Wave record (not a finding).** The `step ← template.step(...)` lookup
  hoisted above the ladder at the four HANDLE heads because the authority
  rung consumes `step.role`. The hoist is order-neutral ONLY because the
  lookup is infallible over committed state (load-time validation: binding
  coverage + graph validation guarantee every reachable step id resolves in
  the pinned template) — it cannot reject, so it cannot mask a
  Duplicate/state/Stale outcome. If a reject/assert branch ever grows on
  that lookup, that is a new finding, not a silent property. Checksum note:
  the per-block `Rejected(...)` multiset check flagged exactly one delta —
  `missing_version` +1 in the rendered L1 block — which is the ladder
  re-print itself (the staleness rung's vocabulary lives in the ladder,
  Wave 1 decision), not a moved role literal; `missing_role` /
  `role_not_authorized` counts are unchanged in every rendered block.
- **Forward cross-ref (review note, not a finding).** The Warrant's
  "operation identity: op_id" class is universal per todo E1, while F-W1-2
  records that operator intents carry no op_id today. No contradiction —
  the Warrant is born on the L1 actor-envelope path, where op_id exists —
  but the coupling is deliberate: when F-W1-2 resolves (wave 4 for the
  L3-born ops + the dedicated ingress-idempotency touch for
  `KICKOFF`/`START`/`CANCEL`), the operator intents' warrant grows into a
  slot the contract already holds open; one cross-ref line at resolution
  time suffices.

### Wave 3 (LC2 — Errand born) — wave reviewed, both dispositions RATIFIED (2026-07-06)

- **F-W3-1 · §6.2's "second instance" claim for P1 holds only in the
  provider-addressed reading.** The memo's placement rationale ("introduced
  where its second instance historically appeared") is arithmetically loose
  for P1: the human decision (L3) is also a full-form errand and precedes
  LC2 in both document order and build order. Release is the second
  *provider-addressed* full instance — the literal mirror of provision
  (LC2 completes L0e), which is why the placement itself stands (ratified
  §6.2; L3 is already the P2+P5 birth site and a third birth would crowd
  it). Same prose-granularity class as F-W1-1/F-W2-1. Disposition applied
  in this wave: the birth texts (errand.txt, the §13 note) use the
  qualified "second provider-addressed full instance" framing and the
  mirror-repeat rationale; the §6.2 wording gains the same qualifier when
  the memo section is next touched.
- **Wave record (not a finding).** (a) The schematic's fifth phase (keyed
  routing) is deliberately UNLABELED in this wave — P2's name does not
  exist in the corpus yet. P2 is born at L3 (wave 4), which sits *earlier*
  in document order than LC2, so the completion handlers' routing labels
  become cheap backward references when wave 4 lands — a small retro-touch
  of the wave-3 labels is expected then, not a defect now. (b) `hard_purge`
  is deliberately NOT labeled an errand: it is a preconditioned storage
  re-drive (no request/reply, no completion event); only the forced release
  inside the delete chain is one. (c) Errand phases open at the claim
  commit: release_safe / provider resolution / trigger-validation are
  pre-open guards — the labels encode this boundary explicitly. (d)
  Checksums: ledger diff EMPTY; the per-block `Rejected(...)` multiset was
  STRICTLY unchanged this wave (declaration + comment labels only, no
  ladder re-print).

### Wave 4 (L3 — ChoicePoint + Directive born) — wave reviewed, all three dispositions RATIFIED (2026-07-06)

- **F-W4-1 · RUN_ACTION (and DELETE_REQUESTED) cannot fold into
  `admit_input` without behavior change — kept conservative.** Two
  asymmetries on `RUN_ACTION`: (1) it loads with NO `unknown_instance`
  guard — folding would add a rejection path where today the pseudocode has
  a gap; (2) its authority guard is a literal-less
  `REQUIRE trigger.by = instance.binding[step.role]` — folding would force
  inventing a reject name, a new literal and a behavior change.
  `DELETE_REQUESTED` shares the missing-guard problem in a DIFFERENT shape:
  as written, `run_index.status(instance.id)` dereferences a possibly-none
  instance before the tombstone check can answer — the gap lives there too,
  but its resolution must respect the tombstone-before-authority order, so
  it is NOT the same disposition. Proposed disposition: both ops keep their
  own heads this wave; the guards (and the RUN_ACTION reject-name decision)
  land in a later, separately ratified touch — candidates: the wave-5
  sweep if ratified as in-scope, else the dedicated ingress-idempotency
  touch that F-W1-2 already owns for KICKOFF/START/CANCEL. *(Scoped to the
  dedicated touch by the wave-4 ratification; RESOLVED by the ingress
  touch — the last §9 section.)*
- **F-W4-2 · the operator paths gain the ladder's `missing_version` entry
  guard — a deliberate, ratify-me behavior delta.** Today a malformed
  SUBMIT_DECISION / RESUME_WAIT with NO `expected_version` field falls
  through the `≠ instance.version` comparison and reports
  `Stale(instance.version)`. Folded into the ladder, the version rung's
  entry guard answers `Rejected(missing_version)` instead. This is the
  correct canonicalization (the intent envelope declares the field as
  mandatory; an absent field is a malformed input, not a stale one) and is
  NOT dodged with a compare-only trick — but it is a behavior change on a
  degenerate input, so it is recorded as a finding for explicit
  ratification, not smuggled. The multiset cannot see it (the literal lives
  in the ladder).
- **Wave record (not a finding).** (a) The `unknown_instance` consolidation
  arithmetic, stated up front and verified after: the literal moved from
  two call sites into `admit_input`'s definition (printed at L3 only, the
  declaration-at-birth convention) — per-block deltas exactly l3 3→2 and
  release/action/auto-action/complete/l4 3→1, nothing else moved; the
  ledger (78 distinct, first_seen at l0a-family) is untouched. (b) The
  lazy-expectation rule is stated in `admit_input`: rung-local evaluation,
  infallible side-effect-free reads only (pinned template loads included);
  a future reject branch on such a read is a finding. (c) RESUME_WAIT folds
  WITHOUT an authority rung — the resume is kernel-classified; no hidden
  authority check was introduced; `not_bare_wait` stays outside as a
  wait-shape guard (the `no_transition` precedent). (d) The wave-3
  retro-touch predicted by the wave-3 record is done: the errand schematic's
  fifth phase now reads "(the keyed route is a ChoicePoint)" and the
  completion handlers' route lines carry their ChoicePoint labels. (e) The
  Directive/provider boundary is drawn in `directive.txt`: the family is
  the projected, deliverable ask objects (L8 generalizes their transport);
  a `TRY provider.*` call is a transport-direct effect — an errand
  directive-phase realization, not a P5 member. (f) HANDLE deliberately
  keeps its inline load (lineage from L0a; folding only the L3 copy would
  fork it) — stated in `admit_input`'s header so the asymmetry reads as
  chosen. The L0d announcement comment is untouched and simply became true.
- **F-W4-3 · the folded SUBMIT_DECISION authority expectation leaves the
  missing branch undeclared (found in the wave-4 review).** The expect
  declares only `mismatch → Rejected(operator_not_authorized)`; the ladder's
  authority rung also has a missing branch (`claim is missing → RETURN
  expect.authority.missing`), so a `by`-less malformed decision now returns
  an UNDECLARED reject name — undefined behavior — where the pre-fold `≠`
  comparison answered `operator_not_authorized`. Same class as F-W4-2, but
  unbooked, which the rail forbids; and F-W4-2's own argument (malformed
  input gets a DEFINED answer) requires this branch to be defined too.
  RATIFIED disposition: the one-line behavior-preserving fix — declare
  `missing → Rejected(operator_not_authorized)` in the expect (the house
  style: the L1 HANDLE declares both mappings) — lands in wave 5 with a
  pre-declared multiset delta (+1 `operator_not_authorized` in the l3 fold
  and its inheritors). Extending the state rung's "unnamed reject ⇒
  bare-REQUIRE" convention to the authority rung instead was considered and
  REJECTED: it would change behavior (named reject → bare). RESUME_WAIT is
  unaffected (no authority expectation at all — the rung is skipped).
- **Ratification records (2026-07-06).** F-W4-1's scoping decision:
  the missing guards + the RUN_ACTION reject-name decision go to the
  DEDICATED F-W1-2 ingress-idempotency touch, NOT the wave-5 sweep —
  (1) the rebaseline's audit property ("behavior-neutral except explicitly
  ratified deltas") stays undiluted, (2) the work family is F-W1-2's
  (operator/lifecycle ingress hardening on one coherent review surface),
  (3) DELETE_REQUESTED's tombstone-before-authority order needs design
  attention, not sweep mode. F-W4-2 ratified explicitly (the old
  `Stale(instance.version)` answer even leaked the current version to a
  malformed request). Measurement note from review: the raw `Rejected(`
  substring count moved 538→539 via a `Rejected(…)` ellipsis comment in the
  rendered blocks — the `…` does not match the registry regex
  (`[a-z_]`-anchored), so the ledger is untouched; informal greps should
  exclude the placeholder.

### Wave 5 (closing sweep) — record reviewed, RATIFIED (2026-07-06); the rebaseline pass is closed

No new births. The wave's items and their outcomes:

- **F-W4-3 fix landed** (ratified disposition): the SUBMIT_DECISION
  authority expectation now declares BOTH branches
  (`missing → Rejected(operator_not_authorized)` beside mismatch, the L1
  house style). Multiset delta exactly as pre-declared: +1
  `operator_not_authorized` in the l3 fold and its five inheritors
  (release/action/auto-action/complete/l4); nothing else moved; the ledger
  is untouched.
- **§8 F1 (opener dimension) — realized at wave 3, booked now**: the
  errand.txt opener text realizes F1 in FINER grain than the finding's two
  values (three concrete openers — step arrival, lifecycle move, completion
  opening the next — plus the reserved agent-emit opener the L5 help-ask
  claims).
- **§8 F2 (stay route) folded**: choice_point.txt names *stay* as a
  reserved route value (→ L5, first load-bearing instance) and draws the
  boundary against the already-live SELF-TARGET: a self-target genuinely
  re-arrives through the shared arrival (arrival effects run — the LC3a
  re-park), while stay does not re-arrive (no arrival effects, no round
  advance; the enriched handoff belongs to the next dispatch). Stay is a
  route value, not a selector authority, and has no live instance today.
- **§8 F3 (marker-home carries blocking) folded** with the review's
  precision: a wait-slot home is NECESSARILY blocking (the "≤ 1 open wait"
  shape is a property of wait-slot-homed errands, not of errands per se); a
  record-collection home PERMITS a non-blocking form — the child links are
  the precedent for collection-homed markers, NOT proof of non-blocking
  (the L4 parent still parks).
- **Instance-form sweep**: method — every multi-copy unit was checked for
  tagged-then-untagged override chains; exactly two chains surfaced
  (apply_target_entry_effects and post_commit_output, each in the
  action/auto-action/l4 overrides) and both now carry the L3 definition's
  tags. Pre-birth sections deliberately carry NO retro errand labels — the
  LC2 birth unit's retrospective instance list covers them (a label in an
  earlier section would forward-reference a concept born later on the
  ramp).
- **Scope exclusion honored** (ratified F-W4-1 decision): no ingress
  guards in this wave — they remain with the dedicated F-W1-2
  ingress/idempotency hardening touch, together with the RUN_ACTION
  reject-name decision.
- **Gate chain closed**: the memo status header now records §6.4 → §8
  (PASS, ratified, re-affirmed in this wave's review) → waves 1–5 executed;
  the §3 reclassification table is marked REALIZED; the stale "pending
  review" clause on the §8 verdict is resolved.

### F-W1-2 ingress/idempotency hardening touch — reviewed, delta list RATIFIED (2026-07-06); the strand's debt is discharged

The inverted rails applied: behavior changes are the POINT here, so every
delta was pre-declared in the touch's small-spec and is listed for
ratification. The deltas:

1. **Operator op_id on the lifecycle intents** (KICKOFF / START / CANCEL —
   resolves F-W1-2): the intents carry `op_id`; the heads switch from the
   `REQUIRE admit_loaded(...)` wrapper to the outcome-propagating form
   (Duplicate must flow out; the state expectations stay unnamed =
   bare-REQUIRE semantics per the ladder's rule); each op records its fact
   entry (`STARTED` / `CANCELLED` / `TASK_SUPPLIED { op_id }`) in the SAME
   atomic move as its lifecycle effect — a rejected attempt never consumes
   the op_id (the L0e provider-unavailable reject is pre-commit and
   explicitly does not). Deliberately NO `by` field: operator authority
   remains L0d's declared absence (L7/L10). A same-op replay is now
   `Duplicate`; a fresh retry still hits the single-shot state guard.
   Rejected-multiset delta: none (Duplicate and appends are not literals).
2. **RUN_ACTION folds into admit_input** (resolves F-W4-1's first half):
   the load gains its `unknown_instance` guard (the literal lives in the
   admit_input definition, printed at L3 only); the authority REQUIRE gains
   its name — `operator_not_authorized`, BOTH branches declared (the
   F-W4-3 house style; the trigger declares `by` mandatory, so an
   undeclared missing branch would have reproduced F-W4-3). Payload
   trigger-validation stays outside (pre-open, key-scoped); the phase-1
   CAS claim and all LC3a labels untouched.
3. **DELETE_REQUESTED gains its none-instance path** (resolves F-W4-1's
   second half): load → if none: tombstone lookup keyed by the INTENT's
   id → `already_purged`, else `unknown_instance`. Tombstone-before-
   authority now holds STRUCTURALLY (on the none path there is no record
   to authorize against). The existing-instance path keeps
   duplicate → authority → purge_pending → confirmation — authority stays
   BEFORE the purge_pending no-op (load-bearing: an unauthorized re-delete
   gets the authority rejection, not a Committed no-op). Structural note,
   stated not silent: the old tombstone re-check drops from the
   existing-instance path as UNREACHABLE (purged ⇒ the T1 record is gone ⇒
   load returns none).

Checksums, verified: ledger untouched (78 distinct, first_seen intact);
per-block multiset deltas exactly the pre-declared table —
`operator_not_authorized` +2 in action/auto-action/complete/l4 (the folded
RUN_ACTION renders in all four), `unknown_instance` +1 in complete
(DELETE_REQUESTED renders only there); the lifecycle-op blocks show zero
literal deltas. Prose: the 04-l0d single-shot sentence updated (replay =
Duplicate, fresh retry = guard rejection); Hardening lis at L0d / LC3a /
LC4 evidence. With this touch, **F-W1-2 and F-W4-1 are RESOLVED** — the
rebaseline's named debt is discharged.

Review note (ratification round, not a finding): the KICKOFF/CANCEL fact
entries ride the ops' implicit commits (activate / the terminal flip) with
no explicit COMMIT block — consistent with the L0d-era convention; the
in-code comments carry the atomicity claim, and if the early blocks ever
switch to the explicit COMMIT form, the appends move with them.

### L5 landing — the §8 paper test cashed in; reviewed, findings fixed, record RATIFIED (2026-07-06)

The first NEW level built on the five primitives. Six declarations
promised (§8), six landed: (1) the `HELP_REQUEST` op — a separate HANDLE
branch behind the ordinary Admission ladder, whose commit parks and never
routes; (2) `help_pending` + the durable `HELP_REQUEST` fact (op_id +
request_ref — one emit, ONE entry); (3) the `HelpRequest` Directive member
(operator-addressed, free-form); (4) the `HELP_REPLY` completion on the
hardened ingress via `admit_input`, both authority branches declared;
(5) the STAY route's first live instance (no re-arrival —
`apply_target_entry_effects` deliberately not called; the handoff
enrichment is transcript-derived via `help_exchange_for`); (6) the
blocking/non-blocking variant — blocking shipped (wait-slot home),
non-blocking declared + Absent. Checksums: EXACTLY the pre-declared growth
(absent 128→134, invariants 104→110, rejections 78→81 — the three new
names: `help_not_declared`, `not_awaiting_help`, `help_request_mismatch`;
the reply's required field deliberately reuses `missing_required_field`);
the mirror check is clean — every pre-L5 block's multiset is unchanged,
the ledger diff is additions-only.

- **F-L5-1 · scope choice: help emits are NOT gated at L5.** One wave-spec
  reviewer suggested help ops should be gateable like other actor emits.
  The landed choice: the L2 pipeline filters state-moving transitions; a
  help-ask moves no workflow state beyond parking, so it bypasses the
  pipeline, and "policy filters on asks" is an explicit Absent deferral
  (help-emit-gating → later). Recorded for ratification, not silently
  decided.
- **F-L5-2 · §8 declaration-1's "P2 key" cell is loose against the landed
  form.** The paper test's table classified the HELP_REQUEST op as "P2 key
  + P3 payload rung (+ an L1 capability entry)"; the landed form is an
  op-family BRANCH (P3 payload rung + L1 capability entry), deliberately
  NOT a transitions/ChoicePoint key — a key would have implied routing and
  blurred the stay/self-target boundary. The offered-affordance side
  survives (dispatch_intent projects HELP_REQUEST into available_ops), but
  selection it is not. Same prose-granularity class as F-W1-1/F-W2-1/
  F-W3-1; disposition: the §8 cell gains a clarifying parenthetical when
  next touched; no code change.
- **Wave-record-style notes.** (a) The three declaration-unit
  retro-touches landed with the level (the errand opener + instance list +
  F3 tag; the choice_point stay line resolved from "reserved / no live
  instance" to live-at-L5; the directive member list gained HelpRequest
  with the §8 maturation path) — the reserved-slot pattern paid out
  exactly as designed. (b) The viewer's highlight vocabularies gained the
  L5 + ingress-touch tokens (HELP_REQUEST / HELP_REPLIED / HELP_REPLY /
  HelpRequest / STARTED / CANCELLED / TASK_SUPPLIED) — render-side only.

Review round on the L5 landing (2026-07-06) — two findings, both FIXED in
the follow-up commit before ratification:

- **F-L5-3 (blocker, caught in review) · the capability check was
  unsatisfiable.** `handle_help_request` required
  `HELP_REQUEST ∈ capability(...)`, but the L1 `capability` definition
  (inherited, no L5 override) returns only the step's transition keys — so
  every help emit would have died on `not_authorized`, contradicting the
  trace and the domain text. Fix: an L5 `capability` override — the
  default-derived set gains `{ HELP_REQUEST }` when `step.help` is
  declared (the same condition `dispatch_intent` uses for `available_ops`,
  so the offer and the gate agree); an EXPLICIT authored profile is not
  overridden — it must list HELP_REQUEST itself to allow the ask. Zero
  literal movement (the reject name was already at the call site).
- **F-L5-4 (medium, caught in review) · the exchange filter read fields
  the facts did not carry.** `help_exchange_for` filtered by step and
  round, but the `HELP_REQUEST` fact carried neither — the filter would
  have leaned on an implicit projection, against the level's own
  "record, not wait-state memory" invariant. Fix: the fact gains
  `step_id` + `round`; the reply pair needs no copy of its own
  (request_ref joins them), and the filter now names the request fact's
  own fields.

Ratification round (2026-07-06): F-L5-1/2 and the record ratified; the
F-L5-3/4 fixes verified independently (zero multiset delta, ledger
unchanged, the offer-condition and the gate-condition compared
expression-for-expression). Two closing touches from the round:
(a) the "offer and gate agree" claim was NARROWED — it holds on the
default-derived capability path (same condition on both sides); under an
explicit authored profile the offer does not yet consult the profile, so
the packet could offer what the gate rejects — profile-filtered
affordances are a named later seam, stated in both units' comments;
(b) the L5 section's Domain field list caught up with the F-L5-4 fields
(step_id + round on the ask fact). And the class lesson the review earned,
booked where it belongs: **introducing a new op-family means the
capability DEFINITION is part of the change inventory, not just its
check** — the L5 spec listed the guard but not the override behind it,
and only the second reviewer's pull-through of the inherited definition
caught the contradiction. Future op-family small-specs must enumerate the
definition sites (capability, available_ops, validators) alongside the
handler.
