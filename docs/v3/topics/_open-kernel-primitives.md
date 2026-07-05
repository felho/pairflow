# Open Topic — Kernel Primitives (dissolving additive complexity)

Date: 2026-07-05
Status: **DECIDED — the primitive set and the review decisions are final; the
rebaseline is BLOCKED on the L5 paper test (§4),** which is a mandatory
acceptance check, not an open design question. Joint reading result: the
core-model pseudocode (L0a–L4 complete) was re-read independently by the user and
by the assistant; both readings converged on the same two structural observations.
This memo names the primitives, maps every current kernel unit onto them, and
defines the acceptance tests. The review questions are resolved — decisions in
§6, final naming in §7. The model itself changes only in the upcoming in-place
rebaseline, gated by the L5 paper test (§4). Review round 2 (same day) folded
in: the ③a row split into two chained errands + the errand-composition rule
(§2 P1), the LC renumbering amendment (§6.2), the rung-order reconciliation
checksum (§6.4), the deferred-gate de-bias instance (§4), the three
selector-authority values + the EmitAffordance cross-ref (§2 P2), and the
Admission first-use contrast + alias table (§7). Review round 3 (an external
reviewer, on the round-1 text) folded in: the status precision above, the P1
form taxonomy, the Warrant field-class split, the P3 schematic-ladder
demotion, and the criteria-first naming record.

Relation to other documents:

- [`../convergence/core-model.html`](../convergence/core-model.html) — the model this memo re-reads.
- [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md) — Parts A/B/D/E already
  contain per-part fragments of these primitives (noted inline below); this memo names the
  common shapes across them.
- `../convergence/model-src/` + `tools/v3-model/` — the unit-delta storage that makes the
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
completion event(s), correlation rule, on_ok / on_fail routing, and whether
the marker is durable (crash-recoverable) or in-handler (inline).

The diagram shows the FULL form; the table below contains four declared
forms, and an implementation must not force them onto one mechanism:

- **full** — durable marker + outbound directive + async correlated
  completion (provision, release, auto action, spawn, human decision, the
  ③a ask);
- **inline** — durable marker claimed, then the work AND the completion run
  in the same handler invocation, bracketed by two CAS commits (the ③a run;
  a crash between them leaves the durable marker for L9);
- **marker-less inline** — no durable marker at all, synchronous invocation
  (the process gate; its deferred variant is the same errand upgraded to the
  full form — §4);
- **open-door** — marker only, no outbound directive: the kernel waits for
  the world to come to it (bare wait, kickoff, child await).

| Instance | Claim marker | Intent (addressee) | Completion | Correlation | Failure shape | Irreducible logic |
|---|---|---|---|---|---|---|
| provision (L0e) | `requested(req)` | `provider.provision` | `RUNTIME_CONTEXT_READY` | request_id | kernel `FAIL` (L0d) | kind-boundary check |
| release (②) | `releasing(req, ref)` | `provider.release` | `RUNTIME_CONTEXT_RELEASED` | request_id + CAS | `release_failed(ref)` — obligation retained | release_safe precondition (① INV-5); partial failure is a handle, not a runtime |
| auto action (③b) | `action_running(req, episode)` | `ActionIntent` (runner) | `ACTION_RESULT` | request_id | re-park / unhandled parked | episode-anchored retry budget |
| operator action — ask (③a) | `WAITING(action_pending)` | `ActionRequest` (operator) | `RUN_ACTION` | `action_key ∈ resume_events` + expected_version | no timeout (L9); a failure outcome re-parks = a fresh ask | trigger-validation (payload) runs before any claim |
| operator action — run (③a) | `action_running(op_id, req)` — claimed inside `RUN_ACTION` | — (the runner runs inline, post-claim) | inline phase-3 commit | `REQUIRE request_id` | re-park `action_pending` (opens the next ask-errand); a crash in the window leaves the durable marker → L9 | workspace-reality (outcome) vs trigger split |
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
- **The process gate is the one errand without a durable marker** — by
  design (inline under timeout; the A2 test says its result is not
  re-derivable but the transition simply blocks). The table makes this an
  explicit, named exception instead of an invisible one.
- The "competes with what?" question (user's (c)) becomes systematic: every
  single-winner race in the model is a race *within one errand* (two
  RUN_ACTIONs on one claim; a late RELEASED vs the dispatch-error follow-up;
  SPAWNED vs SPAWN_FAILED on one attempt).
- core-model-todo cross-refs: A2 (derived vs durable marker) is the rule for
  the marker column; B2 (in-band `request_id` correlation) is the correlation
  column; D1–D4 is the spawn/child-await pair's contract.
- **Errands compose without a sixth primitive.** The ③a step is two chained
  errands — the ask-errand's completion (`RUN_ACTION`) opens the run-errand in
  the same handler; a failure outcome that re-parks opens a fresh ask-errand;
  the ④ delete chain is an errand sequence behind one operator intent; L5's
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

The selector-authority dimension already has three values in today's model —
naming them now gives L9 its slot ready-made:

- **principal-committed** — an authorized principal picks, and the commit is
  theirs (an actor's emit, an operator's decision);
- **kernel-classified** — no accountable selector: the kernel classifies a
  result into a key and commits (a runner's classified outcome, a child's
  terminal disposition, a resume event's type);
- **proposed** — the selector may only propose, never commit (the L9 fuzzy
  matcher's `MatchProposal`; §4).

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
(todo Parts A/E) deliberately keeps them apart because a DIFFERENT admission
rung consumes each:

- **operation identity** — `op_id`: idempotency (todo A1); consumed by the
  idempotency rung and the ledger, never by an authority check;
- **context authority** — `expected_version`, `expected_role`, …: freshness
  and role — what the sender was entitled to act *from* (todo E1's universal
  vs shape-derived split lives here);
- **errand correlation** — `request_ref`, `episode_ref`: WHICH open errand
  this input answers; consumed by the correlation rung.

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
| RESUME_WAIT | admission + selection | P3 + P2(on_resume) |
| RUN_ACTION | admission + claim + inline errand + selection | P3 + P1(operator action) + P2(outcomes) |
| KICKOFF | admission + specialized resume | P3 + P1(kickoff) + task supply |
| RUNTIME_CONTEXT_READY / RELEASED | errand completions | P1(provision) / P1(release) |
| ACTION_RESULT | errand completion + selection | P1(auto action) + P2(outcomes) + retry budget |
| CHILD_SPAWNED / SPAWN_FAILED / LIFECYCLE | errand completions (+ selection) | P1(spawn) / P1(child await) + P2(wait_for) |
| CREATE / START / CANCEL / FAIL / DELETE_REQUESTED | lifecycle intents | stay: macro-axis moves + load-time validators + the ④ chain |
| dispatch_intent / *_request / *_intent builders | outbound projections | P5 instances |
| resolvers / validators / providers / predicates | unchanged layers | P3/P1 consume them; not dissolved |

Genuinely irreducible logic (the residue that stays bespoke — this list is
the point, it is short): the override rule; the episode retry budget; the
trigger-payload vs workspace-reality split; release_safe + the
release_failed handle semantics; the kind-boundary check; the child link
self-heal; round semantics; the gate pipeline placement.

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
  wrong.

## 5. Guardrails

- **Unification must not erase deliberate distinctions.** The decision-wait /
  bare-wait split, the ③a/③b boundary, operator-intent vs actor-envelope as
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
   at L1, P1 at ②, P2+P5 at L3), and every later level is re-expressed on the
   primitives — the ramp itself demonstrates the dissolution, and L0a–L2b
   barely move. Rationale: the new-reader and implementation-foundation
   priorities outweigh historical fidelity (git is the archive; the
   2026-06-15 conceptual-order rebaseline is the precedent). The
   second-instance rule stays the FORWARD-going principle: a future primitive
   is named at its own second instance.
   - **Renumbering rides the same effort, as a mechanical, grep-verified
     rename-pass BEFORE the semantic work.** AMENDED in review round 2: the
     first cut (① → L3a … ④ → L3e) hid a false-containment trap — the L2a/L2b
     precedent works because those ARE L2-family, whereas ① is a cross-cutting
     storage invariant, ② is explicitly L0e's release mirror, and ④ is ops;
     "L3b" would wrongly claim L3 membership and clash with the future-topic
     owning-level idiom. Final scheme: **LC (lifecycle-close) slices** —
     ① → LC1, ② → LC2, ③a → LC3a, ③b → LC3b, ④ → LC4. The internal ③a/③b
     pairing survives, and "lifecycle-close" is existing corpus vocabulary.
     The rename-pass header must state: LC names a BUILD-ORDER strand (landed
     between L3 and L4 in the ramp); ownership stays with the owning level
     (LC2 completes L0e, etc.). The L0f+ display name is fixed in the same
     pass. Full corpus renumbering (L4 → L8 …) stays rejected. Until the
     rename-pass lands, this memo keeps the current notation.
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
