# Open Topic — Kernel Primitives (dissolving additive complexity)

Date: 2026-07-05
Status: **OPEN — first draft for review.** Joint reading result: the core-model
pseudocode (L0a–L4 complete) was re-read independently by the user and by the
assistant; both readings converged on the same two structural observations.
This memo names the candidate primitives, maps every current kernel unit onto
them, and defines the acceptance tests. Nothing here changes the model yet.

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

### P1 — Exchange (async request/reply with a claimed marker)

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

| Instance | Claim marker | Intent (addressee) | Completion | Correlation | Failure shape | Irreducible logic |
|---|---|---|---|---|---|---|
| provision (L0e) | `requested(req)` | `provider.provision` | `RUNTIME_CONTEXT_READY` | request_id | kernel `FAIL` (L0d) | kind-boundary check |
| release (②) | `releasing(req, ref)` | `provider.release` | `RUNTIME_CONTEXT_RELEASED` | request_id + CAS | `release_failed(ref)` — obligation retained | release_safe precondition (① INV-5); partial failure is a handle, not a runtime |
| auto action (③b) | `action_running(req, episode)` | `ActionIntent` (runner) | `ACTION_RESULT` | request_id | re-park / unhandled parked | episode-anchored retry budget |
| operator action (③a) | `action_running(op_id, req)` | — (operator drives the handler inline) | inline phase-3 commit | `REQUIRE request_id` | re-park `action_pending` | trigger-validation (payload) vs workspace-reality (outcome) split |
| spawn (L4) | link `spawning` (request_id) | `SpawnIntent` (kernel CREATE_INSTANCE) | `CHILD_SPAWNED` / `CHILD_SPAWN_FAILED` | link_id + request_id | `failed` route (guaranteed at load) | contradictory-completion reject |
| child await (L4) | link `active` + `WAITING(child_event)` | — (child already running) | `CHILD_LIFECYCLE` | link_id + child_id | L9 reconciliation edge | lost-CHILD_SPAWNED self-heal bind |
| human decision (L3) | `DECISION_REQUEST` + `WAITING(human_decision)` | `HumanDecisionRequest` (operator) | `SUBMIT_DECISION` | request_ref | no timeout (L9) | override iff chosen ≠ recommendation |
| kickoff (L0d) | `WAITING(kickoff_pending)` | — (implicit ask) | `KICKOFF` | wait.kind | — | task supply |
| bare wait (L3) | `WAITING(kind)` | — | `RESUME_WAIT(event)` | resume_events class | — | — |
| process gate (L2a) | — (inline, no durable marker) | `GateInvocation` (runner) | `ProcessResult` (synchronous) | in-handler | runner_error / timeout → block | verdict-source explicitness |

What the table itself surfaces (this is the payoff of naming the primitive):

- **Completions arrive over two transports today**: kernel events for
  machines, operator intents for humans. The input source classes are
  *transport*; the exchange is the concept. `SUBMIT_DECISION` is not a
  different kind of thing from `ACTION_RESULT` — it is the human-addressed
  exchange's completion.
- **The process gate is the one exchange without a durable marker** — by
  design (inline under timeout; the A2 test says its result is not
  re-derivable but the transition simply blocks). The table makes this an
  explicit, named exception instead of an invisible one.
- The "competes with what?" question (user's (c)) becomes systematic: every
  single-winner race in the model is a race *within one exchange* (two
  RUN_ACTIONs on one claim; a late RELEASED vs the dispatch-error follow-up;
  SPAWNED vs SPAWN_FAILED on one attempt).
- core-model-todo cross-refs: A2 (derived vs durable marker) is the rule for
  the marker column; B2 (in-band `request_id` correlation) is the correlation
  column; D1–D4 is the spawn/child-await pair's contract.

### P2 — Guarded Keyed Selection (the "switch")

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
configured by {who selects, what claim/exchange precedes the selection, what
payload contract applies, what outbound surface is derived}. The kernel
already knows no key *names* (de-vocabularized per map); P2 is the same move
one level up — de-vocabularizing the *map kinds* themselves.

### P3 — Admission ladder (one guard protocol, parameterized)

Every entry path runs the same ordered ladder with per-input-class
parameters; today it exists only as repeated code order plus prose:

```text
load instance → idempotency (op_id → Duplicate) → state guard (ACTIVE / wait.kind)
  → correlation (request_ref / request_id / resume class) → CAS precheck (expected_version)
    → authority (role / operator binding) → payload contract (required fields / emit schema)
```

Canonical rules the ladder pins once: idempotency-before-stale (todo A1),
lifecycle-guard-after-idempotency (L0d), authority-on-this-path-not-L1 (L3).
todo Part E2's check order is this ladder's actor-envelope instantiation.

### P4 — Authority binding (the acting-from snapshot)

`expected_version`, `expected_role`, `request_ref`, `episode_ref`, `op_id` —
one family: what the sender was entitled to act *from*. Universal vs
shape-derived fields; already named as todo Part E1. P3 consumes P4.

### P5 — The Ask/Intent family (outbound surfaces)

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
| SUBMIT_DECISION | admission + exchange completion + selection | P3 + P1(human) + P2(decisions) + override rule |
| RESUME_WAIT | admission + selection | P3 + P2(on_resume) |
| RUN_ACTION | admission + claim + inline exchange + selection | P3 + P1(operator action) + P2(outcomes) |
| KICKOFF | admission + specialized resume | P3 + P1(kickoff) + task supply |
| RUNTIME_CONTEXT_READY / RELEASED | exchange completions | P1(provision) / P1(release) |
| ACTION_RESULT | exchange completion + selection | P1(auto action) + P2(outcomes) + retry budget |
| CHILD_SPAWNED / SPAWN_FAILED / LIFECYCLE | exchange completions (+ selection) | P1(spawn) / P1(child await) + P2(wait_for) |
| CREATE / START / CANCEL / FAIL / DELETE_REQUESTED | lifecycle intents | stay: macro-axis moves + load-time validators + the ④ chain |
| dispatch_intent / *_request / *_intent builders | outbound projections | P5 instances |
| resolvers / validators / providers / predicates | unchanged layers | P3/P1 consume them; not dissolved |

Genuinely irreducible logic (the residue that stays bespoke — this list is
the point, it is short): the override rule; the episode retry budget; the
trigger-payload vs workspace-reality split; release_safe + the
release_failed handle semantics; the kind-boundary check; the child link
self-heal; round semantics; the gate pipeline placement.

## 4. De-bias tests (does a non-anchor case fit?)

- **L6 timer**: exchange {marker: durable timer row, intent: scheduler wake,
  completion: TIMER_FIRED, correlation: timer id, on_fire: reload-and-discard
  if stale} — fits P1 exactly (and the future-topic L6 §1–2 text already
  describes it in these terms without the name).
- **L9 fuzzy external correlation**: a selection whose selector may only
  *propose* (MatchProposal), not commit — fits P2 with one new authority
  dimension (propose vs commit), which is precisely the L9 design question.
- **L7 CapabilityIntent, L11 RememberIntent**: named P5 members already.
- **L5 help subflow (the paper test — MUST pass before any refactor)**: a
  help-ask parks a wait and asks the operator (P1, human-addressed), but the
  reply resumes the SAME position with appended context — a selection whose
  route is "stay + enrich handoff". Either P2 grows a declared
  stay-continuation, or help is a bare wait whose on_resume routes to the
  same step. If L5 cannot be expressed as a few declarations over P1/P2/P5,
  the primitives are wrong.

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

## 6. Open questions (the review agenda)

1. **How deep does the pseudocode change?** Three options: (a) descriptive
   only — the tables above enter the doc, pseudocode unchanged; (b) the
   kernel pseudocode gains the primitives as named contracts and the handlers
   become their instances (recommended aim); (c) a fully generic engine where
   handlers disappear into declarations (too far — traces and evidence lose
   their concreteness).
2. **Naming.** Exchange / Selection / Admission / Authority / Ask are working
   names; the doc's existing vocabulary (produce-not-perform, marker-first,
   arrive) should survive inside them.
3. **Where do primitives live in the ramp?** A new early "primitives" lens is
   premature; more likely: each primitive is *named at the level where its
   second instance appears* (the point where the model historically earned
   generalizations), and a consolidated primitives section lands near the end.
4. **Does P1 unify the two completion transports** (kernel event vs operator
   intent) in the model text, or stay a documented observation?
