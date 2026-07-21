# Task Packet: ch11-P2a — the gate admission foundation (`ports/gate.ts` reconciliation · the `src/gates/` module with the two inline evaluators · `admit_definition` as the single admission authority · the domain gate values)

Plan step: plan.md §11.4 P2 row's FOUNDATION share under the ch11-P2
in-chapter sizing split (executed at this packet's authoring — sizing,
not scope; parts: P2a/P2b/P2c, the `## Sizing/risk` record below).
Realizes §11.1 item 2's admission/registration half and item 5's
`ports/gate.ts` reconciliation clause; §11.2's l2 coverage share
(3 of the 6 l2 unit ids). Draft anchors (= the manifest's C-row ref
union): `contract:ch11-gate-format` rows C1/C2/C3/C5/C7/C8/C9/C10/
C11/C19/C20/C21/C23/C24/C28/C29/C30 + ADR-013 (the module home,
`accepted` at the draft ratification); C22 appears as background
standing rule only (note 2), never as a row anchor. Plan alignment
(R-ALIGNED-UP, propagation-class): the §11.4 Packets-and-flow-mode
table's P2 row is REPARTITIONED into the P2a/P2b/P2c rows; the Order
line, §11.2's checker-owner token "(P2)" → "(P2c)", and the §11.4
process note's P2 references follow (the draft-anchor sentence
re-anchors to P2a — module home + `ports/gate.ts` reconciliation —
and the sizing-split-candidate sentence gains its "split executed at
ch11-p2a authoring" record); the §2.2 ports-row terminology
propagates with the R5 reconciliation (`GateRunner` → the ledger
shapes `GateRegistration`/`GateCatalog` in the module table's ports
cell — arm-gate-1 F10: a stale present-tense architecture mirror
after the replacement) — all marked "aligned at ch11-p2a
pre-approval"; the prepared plan edit lands in the SAME commit as
this packet (the boundary carries `plan.md`).
Autonomy stage: measurement — inherited from the ch11-P2 row through
the split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the module-introduction +
port-reconciliation class has precedent (ch8-P1 introduced
`definition/` under ADR-011 on the same pattern; ADR-013 mirrors it).
Classification: **projection** — manifest tally: 22 anchored /
11 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the l2 unit texts, ledger §2/§3/§4, the
08-l2 section blocks, ratified draft rows, ADR-013, or ratified plan
text, or derives from them with an in-row note.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l2-pseudocode/CREATE_INSTANCE", "disposition": "alias/inherited" },
      { "id": "l2-pseudocode/GateRegistration", "disposition": "implement" },
      { "id": "l2-pseudocode/admit_definition", "disposition": "implement" }
    ],
    "rejections": [],
    "invariants": [
      { "id": "l2/inline-declarative-packaged-only-in-l2-core", "disposition": "type/schema" }
    ],
    "traces": [],
    "shared_ownership": []
  }
}
```

The split's coverage union (guarded mechanically at the chapter
close): P2a owns the three unit ids above plus the
`l2/inline-declarative-packaged-only-in-l2-core` invariant
(type/schema); P2b owns
`l2-pseudocode/HANDLE`, `l2-pseudocode/gate_projection`,
`l2-pseudocode/activate`, the three l2 rejections, the
`l2/gate-before-commit` + `l2/ordered-first-block-wins` (test) and
`l2/gate-is-read-only-stateless` (review) invariants, and the
`l2-pseudocode` trace; P2c owns
`l2/round-is-canonical-reconstructable` (checker). Union = the full
§11.2 l2 share; no overlap, so `shared_ownership` is empty on every
part.

Partial-realization dispositions (projection-time disposition calls,
not scope changes):

- `l2-pseudocode/CREATE_INSTANCE` is `alias/inherited`: the l2 delta
  ("a pinned ADMITTED definition ... the raw/authored form is
  admission's input and never reaches CREATE") is realized by the
  store-contract flip (matrix A6) — the realized function stays the
  ch-4 `startInstance` composite. The unit's `activation_mode`,
  `run_overrides`, and the distinct `round: 0` CREATED state are
  L0c/L0f-inherited branches, unrealized (the realized start is the
  CREATE+START composite; no separate CREATE surface exists).
- `l2-pseudocode/GateRegistration` is `implement`: the descriptor
  contract, the two Block A inline registrations (validate +
  evaluate bodies), and the static registry realize here. The
  PROCESS registration member (`external.process`, the
  `validate_gate_config` body) is P3's by the ratified plan cut
  (plan §11.4 P3 row) — matrix G2 states the staging.
- `l2-pseudocode/admit_definition` is `implement`: registration
  resolution + per-registration config validation +
  effective-config materialization + accumulation + all-or-nothing
  realize here; the unit's STRUCTURE rung is satisfied BY the ch8
  validate stage on the FILE path (A1's realization —
  `admitTemplate` does not re-implement structural validation),
  and on the DIRECT path structural well-formedness is the
  CALLER's stated precondition (the testkit hands well-formed
  values; the model's universal structure REQUIRE completes for
  that path when a consumer beyond the kit arrives or at P4's
  format-walk restructuring — a declared partial realization, the
  round-4 lens-2 correction). The `requires_runtime_context` cross-rule BRANCH and
  the level-declared-validator hook for `validate_gate_config` are
  P3's (matrix A7 rules them out explicitly — the A13/R-EXECUTION
  pattern, no dead code).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §11.4, recorded at the ch11 ratification for
the parent P2 row, inherited by the split parts): **projection**
(basis: l2-pseudocode + ledger §2/§3/§4 + [module home,
`ports/gate.ts` reconciliation] draft rows). Discovered at authoring:
**projection** — prediction and discovery agree.

**The parent ch11-P2 assessment (the split's justification).** The
ratified P2 row bundles: the admission authority cutover (C20), the
HANDLE gate rung + three behavioral rejections, the `gate_decisions`
persisted schema bump + its C27 read surface, the two evaluators, the
round alignment (declared `advances_round` + checker), and the l2
golden trace. Six-axis outcome: **authority movement** YES (the
definition store's output contract flips to admitted-only — semantic
validation authority consolidates into `admit_definition`; round
truth moves from a kernel heuristic to declared template semantics);
**surface spread** — one concept across domain / ports / definition /
gates / kernel / store schema / floor read surface / testkit
contract; **foundation+activation coupling** YES (admission
foundation + rung turn-on); **acceptance multiplicity** — admission
channel / kernel behavior / schema / read projection / trace.
HARD STOPS 1 AND 2 TRIP, plus the 4+-surfaces × 3+-success-classes
escalation combo. Single-packet closure proof FAILS: the admission
cutover, the rung+decisions activation, and the round alignment are
separately sequenceable buckets with distinct proof surfaces — and
the round alignment carries a format-surface question with NO
ratified draft row (the model's "advances_round is declared
transition semantics ... never inferred from target equality" vs the
realized `target === template.start` heuristic; the round authoring
key is absent from the ratified `ch11-gate-format` rows). **Split
verdict (autonomous, in-chapter, depth 1, coverage union preserved —
README §5.5):** `foundation → activation → alignment`:

- **ch11-P2a (this packet)** — the admission + registration
  foundation; zero runtime-behavior change on shipped surfaces.
- **ch11-P2b** — the gate rung + `gate_projection` + the
  `gate_decisions` fenced schema bump + the C27 read surface + the
  l2 golden trace (round machinery UNTOUCHED — the rung reads
  `instance.round` as the existing kernel maintains it; the model's
  own trace is reproducible on the current heuristic, which is
  behavior-equivalent to the model's exhibited `round:
  { advance_on_arrival_at: [implement] }` declaration for the
  realized template set).
- **ch11-P2c** — the round alignment (the declared `advances_round`
  predicate, the `round-is-canonical-reconstructable` storeChecker,
  the projection-time heuristic assessment recorded). Its
  format-surface half (the round declaration key + absent-key
  semantics) has no ratified draft row → the draft-routing decision
  is an EXPECTED human decision point at P2c's authoring, quarantined
  there so P2a/P2b flow.

Parts inherit mode (measurement), predicted class (projection), and
watchpoints; each part gets a fresh watchdog budget. The plan
repartition edit is prepared (header) and rides this packet's commit.

**This packet's own six axes:**

- **authority movement:** YES — the C20 cutover happens HERE: the
  `DefinitionStore` port's only output becomes the admitted form
  (`AdmittedTemplate`), semantic gate validation consolidates into
  `admit_definition`, and the testkit builds through the same
  admission. This is the split's deliberate foundation half.
- **new runtime behavior turned on:** NO in substance — hard stop 1
  assessed NOT tripped: no rung, no schema change, no new rejection
  lane on any shipped surface. Admission joins the live load path as
  a rung NO loadable input can trigger (a `gates` key in YAML stays
  the ch8 V8 unknown-key rejection until P4 — matrix A8's regression
  claim pins byte-identical load behavior for every gate-free
  template). The behavior half of the parent's stop-1 trip is
  exactly what P2b carries.
- **surface spread:** TRIPPED — hard stop 2. One concept (the
  admission/registration contract) touches: ports (`gate.ts`
  reconciled, `definition.ts` return type), domain (gate values +
  the brand), definition (the admission rung + channel), the NEW
  `gates/` module, the CLI composition roots (catalog wiring), and
  the testkit CONTRACT (`fixtureDefinitionStore` narrows to the
  admitted type; the ch-3 scripted players retire) — a kit contract
  change that counts under the surface rule.
- **identity/join fragility:** NO — no cross-seam identity; `uses`
  resolution is a single injected lookup at one point.
- **foundation + activation coupling:** NO — the activation (rung)
  is P2b's by the split; nothing turns on here.
- **prerequisite coupling:** NO — P0 built (012d992c), P1 built
  (109221b1 + aftermath), the draft ratified 2026-07-12 (1748443f
  block); no unfinished sibling. P2b/P2c/P3 depend on THIS packet,
  not the reverse.
- **acceptance multiplicity:** ONE family in substance — the
  admission/evaluator contract suites plus the full existing suite
  green (the A8 confinement proof); no schema, read-projection, or
  CLI-behavior class.

**Hard stops 6/7 (letter-tripped, closure-proven):** the authority
touches 3 changed consume families (producer=definition,
external/integration=CLI composition, testkit), and the shared
`DefinitionStore` contract shape changes with them — hard stops 6
and 7 trip BY LETTER. **Closure proof (single-packet allowed:
yes):** the trips share ONE cause — the compile-enforced brand
cutover. One bounded build closes every touched surface (the
`AdmittedTemplate` return type forces every consumer in the same
commit; the type system proves the cutover's completeness — an
un-updated consumer does not compile); no separate sequencing exists
(admission without the store flip would leave two authorities — the
C22 circularity the model fix retired; the flip without admission is
vacuous); ONE proof surface validates it (`pnpm v3:test`: the new
admission/gates suites + the untouched full suite proving A8); the
same in-repo consumers own all fallout (no external consumers, no
per-family review loop); no compatibility / migration / persistence
/ read-projection / recovery / ordering risk (no persisted byte
changes at all). The consumer-family "alignment" is one mechanical
type ripple with three sanctioned change classes (matrix T3), zero
lane-meaning changes.

**Consume-family scan** (run because stop 2 tripped; measured from
the tree, 2026-07-12 — receipts in Embedding gates): producer =
definition/ (changed: the admission rung); validator/gate =
gates/ (new) + definition/validate.ts (present, UNCHANGED — the ch8
structural lanes stand byte-identical, matrix A8);
persistence/replay = store (present, NO change — no schema or row
change in this part; the chapter's fenced bump is P2b's);
execution consumer = kernel (present, TYPE-ONLY change — the
admitted-type narrowing; zero behavior); read/presentation = floor +
operator CLI read verbs (present, NO change — no read surface
consumes template gate shapes; `floor/debugBundle.ts` is NOT a
`DefinitionStore` consumer, measured — the P1 hand-projection lesson
applied: the scan cites the consumer list, not the module family);
recovery/cleanup = absent; external/integration = the CLI
composition roots (changed: `cli/main.ts` + `cli/dev/main.ts` wire
the injected catalog into the definition store construction — no
verb, flag, or output change, C28); testkit = changed (contract:
`fixtureDefinitionStore` narrows, the scripted players retire).

Other hard stops: none trip (no competing authority paths — the
single authority is the point; no contract+consumer cutover with a
fragile join — the join is the compiler; no persisted schema change;
no rollback/lock/ordering semantics; success proof stays where it
is; no reused proof contract — new suites plus the regression
corpus). Conditional annexes: **closure-budget triage** N/A — no
read-projection or shared-persisted-contract bucket in scope;
**proof-boundary triage** N/A — no proof source moves;
**mutable-flow record** N/A — admission is synchronous and pure over
resolved values (matrix A10); no coordination primitive enters.

## Claim + dimensions (enumerated BEFORE deriving test rows)

**Claim (wide):**

1. **Single admission authority, or nothing:** from this packet on,
   NO workflow definition reaches the kernel, the start path, or any
   template consumer behind the `DefinitionStore` port unadmitted —
   the port's ONLY output is the admitted form carrying EFFECTIVE
   configs, the testkit builds templates THROUGH the same admission,
   and the raw/authored form never travels downstream of it.
2. **All-or-nothing with the full finding set:** admission reports
   ACCUMULATED findings (never first-error-only; a broken container
   suppresses only its own dependent lanes), and no admitted value
   exists on ANY finding.
3. **Registration-owned config schemas, materialized once:** every
   gate config is validated and normalized by ITS registration
   exactly once, at admission; defaults materialize there
   (absent `previous_reviewer_verdict` config ⇒ `{required: true}`)
   and downstream reads ONLY the effective form.
4. **Static, injected composition:** the registry is static
   composition resolved through an INJECTED catalog — admission
   resolves every `uses` at definition load; an unknown id is the
   `gate_evaluator_unavailable` DEFINITION ISSUE, never a registry
   rejection; neither `definition/` nor `kernel/` imports `gates/`.
5. **The ledger shapes only:** `ports/gate.ts` carries the ledger's
   registration/catalog contract and nothing else — the ch-3
   placeholder shapes and their scripted players are gone (zero
   references), and the realized registration types make non-inline
   execution UNREPRESENTABLE in L2 core (the type/schema invariant).
6. **Confinement:** nothing else changes — zero kernel/ingress/store
   /floor/diag behavior change, no schema bump, no new registry
   rejection, no CLI verb/flag/output change, and the load channel's
   accept/reject behavior for every gate-free template (every
   loadable YAML today) is byte-identical.

Dimensions:

1. **Admission lane grid** (each lane driven and ABLE TO FAIL,
   R-LANE-SENSITIVITY): unknown `uses` (coded); dead event-type key
   (gates key ∉ transitions); empty gate list; `config` missing
   where required; threshold config lanes (non-map, missing member ×3,
   unknown key, non-allowlisted metric/op, invalid value); 
   `previous_reviewer_verdict` config lanes (non-map, unknown key,
   `required` ≠ `true` — the reserved-toggle lane); container-shape
   lanes (a non-list gate entry, a non-map gate map) with dependent
   suppression.
2. **Accumulation/all-or-nothing:** a multi-gate, multi-issue
   template yields the FULL finding set in one admission; any single
   finding yields no admitted value.
3. **Effective-config materialization:** absent
   `previous_reviewer_verdict` config ⇒ effective `{required: true}`
   on the ADMITTED value; explicit `{required: true}` preserved;
   threshold effective = validated identity. Materialized-once:
   the admitted binding carries the effective form in its `config`
   field, its single config surface (A5's arm-re-check resolution).
4. **Evaluator semantics grid** (pure, unit level): threshold —
   `round < value` → block(`round_below_min`), `round === value` →
   allow (the boundary row), `round > value` → allow, never warn;
   previous_reviewer_verdict — empty history → block
   (`no_previous_verdict`), a prior committed transition from the
   CURRENT step → allow, prior transitions from OTHER steps only →
   block.
5. **Hostile config shapes** (R-NUMERIC-LADDER assessed on the
   threshold `value` — a NEW validator over a numeric domain):
   value shapes (non-number, string `"2"`, NaN, Infinity, `1.5`,
   `0`, `-1`, unsafe integer) — `-0` is subsumed by the `≥ 1` domain
   (`-0 < 1`, no `Object.is` guard needed: the numeric-identity rung
   is satisfied by the range check, stated not skipped); descriptor/
   prototype rungs ride matrix G8's DRIVEN own-property lanes
   (`__proto__` pairs, inherited-key phantoms never read); symbol +
   non-enumerable key handling is G8's stated build freedom, not a
   driven lane.
6. **Finding addresses:** findings land at C7-grammar paths with
   list-index segments (`steps.<stepId>.gates.<eventType>[<i>]`,
   `…[<i>].config.<key>`), for directly-constructed templates too.
7. **Load-channel confinement (regression):** the canonical template
   and the ch8 corpus load byte-identically through the new path
   (same accept/reject sets, same finding bytes, stage vocabulary
   unchanged); the full existing suite green after the mechanical
   updates.
8. **Brand/type confinement:** `fixtureDefinitionStore`, kernel
   deps, and the start path COMPILE only against `AdmittedTemplate`;
   the admit-wrapped suites run green (the type-level half is proven
   by compilation, the R-EXECUTION half by the suites).
9. **Boundary probes:** gates/ ↔ rest import boundary — value-red /
   type-green / dynamic-red probes BOTH directions (ADR-013's
   verification bullet), executed at build.

## Operative material (full text — projection, not invention)

### `l2-pseudocode/admit_definition` (verbatim)

```
# ─── DEFINITION ADMISSION (L2) — the single semantic authority over a workflow definition ───
# Runs at DEFINITION LOAD — wherever a definition enters the system (a file loaded, a directly
# constructed template): the definition store issues ONLY admitted definitions, and CREATE_INSTANCE
# consumes admitted definitions by that store contract — instance inputs (task, binding) stay
# CREATE's own admission. Failures are DEFINITION ISSUES ({path, code, message} — the definition
# channel), never instance rejections: no instance exists yet to reject into.
admit_definition(definition_source, gateRegistry) → AdmittedDefinition | issues
  issues ← []                                                        # accumulated — admission reports the FULL finding set, never first-error-only
  REQUIRE structural well-formedness                                 # steps / roles / transitions / terminal — structure issues accumulate on the same channel
  FOR gate IN all_gate_bindings(definition_source):                  # every (step, event_type) gate
    registration ← gateRegistry.resolve(gate.uses)
    IF registration is none
       THEN issues.add(gate_evaluator_unavailable); CONTINUE         # nothing below may dereference an unresolved registration; HANDLE keeps the registry-drift runtime backstop
    IF registration.requires_runtime_context AND definition_source.runtime_context = none
       THEN issues.add(runtime_context_required_for_process_gate)    # compile twin — HANDLE's ready(∅) lane stays the runtime backstop
    result ← registration.validate_and_normalize_config(gate.config) # registration-owned schema over the AUTHORED (raw) config
    IF result is issues THEN issues.add(result.issues)
    ELSE gate.effective_config ← result.effective                    # defaults materialize ONCE — the one downstream form
  REQUIRE every level-declared definition-static validator           # the validate_* family — each level's section declares its member; their issues accumulate here
  IF issues is nonempty THEN RETURN issues                           # ALL-OR-NOTHING: no AdmittedDefinition exists on ANY issue
  RETURN AdmittedDefinition(definition with effective configs)       # downstream — CREATE, HANDLE, dispatch, the process wire — consumes ONLY this
```

### `l2-pseudocode/GateRegistration` (verbatim)

```
# GateRegistration — the registry's per-evaluator descriptor: the gate system's EXTENSION contract.
# The registry maps a gate's `uses` id to its registration; composition is static (dynamic loading is Absent).
INTERFACE GateRegistration:
  implementation: declarative | packaged | process      # orthogonal axes: L2 core realizes declarative + packaged; process ⇒ L2a
  execution:      inline | deferred                      # L2 core runs inline evaluators; deferred ⇒ a later lifecycle slice (gate_pending + GATE_RESULT)
  requires_runtime_context: yes | no                     # read by ADMISSION (admit_definition): a requiring gate in a context-free definition is a definition issue
  validate_and_normalize_config(raw) → effective | issues   # the registration OWNS its config schema; defaults materialize HERE, once — downstream reads only the EFFECTIVE form
INTERFACE InlineGateEvaluator extends GateRegistration:  # the declarative | packaged members
  evaluate(effective_config, projection) → GateDecision   # GateDecision = { verdict: allow | warn | block, reason?, message?, evidence_refs? }
# a process registration carries NO evaluate — its execution path is run_process_gate (L2a)
```

### `l2-pseudocode/CREATE_INSTANCE` (verbatim)

```
# Convenience operator API, not a kernel primitive: a single "start workflow" command may
# compose CREATE_INSTANCE(...) then START(instance). activation_mode controls what happens
# after RUNTIME_CONTEXT_READY (activate vs WAITING(kickoff_pending)) — not whether CREATE dispatches.
CREATE_INSTANCE(template_ref, activation_mode, task, binding, run_overrides) → Created   # operator_intent; template + binding resolved on the start path (formalized by L0f)
  template ← definitionStore.load(template_ref)                # a pinned ADMITTED definition (admit_definition, L2) — plain or L0f-resolved, always carrying EFFECTIVE configs; the raw/authored form is admission's input and never reaches CREATE
  IF activation_mode = immediate AND task is absent THEN RETURN Rejected(task_required)
  REQUIRE binding covers every role reachable in template      # binding resolved pre-kernel; the kernel only validates coverage (fail at create, not mid-run)
  instance ← create { template_ref, task, binding, activation_mode,
                      kernel_status: CREATED, current_step: none, round: 0,   # round 0 = prepared, no work cycle begun yet (position none until ACTIVE)
                      runtime_context: none, run_overrides: snapshot(run_overrides), version: 1 }
  COMMIT instance creation
  RETURN Created(instance.version)                             # no dispatch yet — not active

```

### The evaluator semantics (the golden-trace Config view — the model's exhibited parameterization)

```yaml
gates:                    # ordered inline pipeline; first block stops, round not burned
  - uses: declarative.threshold              # declarative DSL: path / op / value over allowed gate_projection fields
    config: { metric: round, op: ">=", value: 2 }
  - uses: pairflow.previous_reviewer_verdict # packaged pure pairflow policy
    config: { required: true }
```

The 08-l2 section's own note: the declarative DSL "is deliberately
tiny: a metric (an allowlisted gate_projection path, here round), an
op, and a value — not a general expression language" (the
`broad-declarative-dsl` ledger Absent is that general language,
untouched here). Draft C10/C11 fix the Block A semantics this packet
realizes at the evaluator level (matrix G); the RUNG that runs them
end-to-end is P2b's.

### Exact rejection strings (ledger §3 — the slice)

None — this packet's slice declares ZERO behavioral registry
rejections (the three l2 names ride P2b's slice). The admission issue
CODE `gate_evaluator_unavailable` REUSES the registry token on the
DEFINITION channel per C20 ("the named codes REUSE the former
rejection tokens") — a `{path, message, code}` finding, never an
`Outcome`; the 54-name registry, its drift locks, and
`domain/rejections.ts` are untouched.

### Trace

None — the l2 golden trace is P2b's executable expectation (it needs
the rung). This packet's executable floor is the admission/evaluator
suites plus the A8 regression corpus.

## Canonical registration/ports matrix (R)

| Id | Rule |
|---|---|
| R1 | `GateRegistration` is realized as the ledger descriptor: `implementation` ∈ {`declarative`, `packaged`, `process`}, `execution` — the axis FIELD carried with its realized domain pinned to the singleton `"inline"` (deferred is the model's named Absent: "a later lifecycle slice"; the realized type makes it UNREPRESENTABLE — the `l2/inline-declarative-packaged-only-in-l2-core` invariant's type/schema disposition, with P2b's rung lane for the process axis and the deferred lane structurally ruled out until the deferred slice widens the union), `requiresRuntimeContext: boolean`, and `validateAndNormalizeConfig(raw) → effective \| findings` (anchored: prose:l2-pseudocode/GateRegistration, contract:ch11-gate-format#C9, prose:ledger §2 l2) |
| R2 | The inline variant (`implementation` ∈ {`declarative`, `packaged`}) additionally carries `evaluate(effectiveConfig, projection) → GateDecision`; a process-implementation registration carries NO `evaluate` (type-discriminated union — its execution path is `run_process_gate`, P3) (anchored: prose:l2-pseudocode/GateRegistration, contract:ch11-gate-format#C9) |
| R3 | The catalog/registry port: `GateCatalog { resolve(uses: string): GateRegistration \| null }` — resolution input is the binding's `uses` VALUE; `null` = unknown, which ADMISSION maps to the `gate_evaluator_unavailable` issue (A3); HANDLE's same-named runtime backstop (C35) is P2b's (anchored: contract:ch11-gate-format#C8, prose:l2-pseudocode/admit_definition) |
| R4 | `validateAndNormalizeConfig`'s realized result is a TWO-ARM discriminated form — the effective config XOR a nonempty finding set (the unit's `effective \| issues`); the OBSERVABLE contract is that admission surfaces every config finding at the binding's C7 address (A5). The exact TS result container and HOW the address is composed (a location-blind registration emitting config-relative paths that admission prefixes, vs an address handed in) are BUILD FREEDOM within the two-arm form — the packet prescribes the semantics, never the container (the ch11-P1 C4 pattern; narrowed at arm gate 1: both composition routes conform to the anchors, so neither is prescribed). DERIVATION: the unit's two-arm return + C20's one-channel rule + C7's path grammar entail exactly the observable half (derived: prose:l2-pseudocode/GateRegistration, contract:ch11-gate-format#C7, prose:v3/src/definition/errors.ts) |
| R5 | The ch-3 placeholder shapes (`GateSpec`, `ProcessSpec`, `GateVerdict`, `GateRunner`, `ProcessRunner`, `ProcessResult`) and their testkit scripted players (`createScriptedGateRunner`, `createScriptedProcessRunner` + types) are DELETED — zero live consumers (measured: the players' only references are `fixtures.ts` / `fixtures.test.ts` / `index.ts`; the port types' only non-self references are those same testkit files + `ports/index.ts` — the baseline sweep's `drift/domainRegistry.ts` hits are quoted ledger KEY STRINGS (`"l2a/ProcessGateRunner"`, `"l2a/ProcessResult"`), not type imports: the file imports from `domain/index.js` only, and it is edited in this packet for its l2 row flips, an unrelated reason). The ledger-shaped RUNNER surface (`ProcessGateRunner`, C34's `ProcessResult` kinds, `GateInvocation`) lands at P3 WITH its six-outcome drive — C29's replacement realized across P2a (the registration/catalog half) + P3 (the runner half); in the interim NO gate-runner fixture exists and nothing consumes one. DERIVATION: C29 names both halves and assigns the six-outcome re-shape to P3; carrying dead placeholder-shaped players against types that no longer exist would be the parallel seam C29 bans (derived: contract:ch11-gate-format#C29, prose:plan §11.1 item 3, prose:v3/src/testkit/fixtures.ts) |

## Canonical gates-module matrix (G)

| Id | Rule |
|---|---|
| G1 | `src/gates/` is the new module home (ADR-013, `accepted`): the builtin inline evaluators + the static registry; imports `domain/` + `ports/` + stdlib at most; lint-enforced BOTH directions — new eslint entries: `gates/` restricted to domain/ports (static + dynamic forms), and every other production module EXCEPT the CLI composition roots banned from importing `gates/` (testkit included — its imports stop at ports/domain/emit); probes value-red / type-green / dynamic-red both directions at build (anchored: ADR-013, contract:ch11-gate-format#C29) |
| G2 | `createGateRegistry()` — the static Block A composition. THIS packet ships exactly `declarative.threshold` + `pairflow.previous_reviewer_verdict`; `external.process` JOINS at P3 (the plan's own cut: §11.4 P3 row owns the process registration and its validator body). C8's "EXACTLY three" is the CHAPTER-END composition — the composition test asserts the exact CURRENT member set and extends at P3. DERIVATION: C8 fixes the Block A end state; plan §11.4 sequences the process member to P3; the interim exact-set assert keeps the composition claim able to fail in both directions (derived: contract:ch11-gate-format#C8, prose:plan §11.4 P3 row) |
| G3 | `declarative.threshold` registration — config REQUIRED (C5); exact own-key set {`metric`, `op`, `value`}, all three required; allowlists `metric` ∈ {`round`}, `op` ∈ {`">="`} (a string value); `value` a safe integer ≥ 1 (the C12 VALUE half — the raw-source-text half of C12 is P4's format lane, proof boundary stated); every violation an UNCODED admission finding at the config's C7 path (C21 assigns this lane no code) (anchored: contract:ch11-gate-format#C10, contract:ch11-gate-format#C5, contract:ch11-gate-format#C21) |
| G4 | `declarative.threshold` evaluate — block with the FIXED reason `round_below_min` iff `projection.round < value`; allow otherwise (no `reason`, `message`, or `evidenceRefs` on allow); never warn; reads ONLY `projection.round` (anchored: contract:ch11-gate-format#C10) |
| G5 | `pairflow.previous_reviewer_verdict` registration — config OPTIONAL (C5/C11); when present: exact own-key set {`required`}, sole legal value `true`; `required: false` (the reserved future toggle) and every other violation reject as UNCODED admission findings (message content is unconstrained diagnostic text — no deterministic message obligation; narrowed at arm gate 1: the anchors fix the lane and its codelessness, never the wording); ABSENT config ⇒ effective `{required: true}` MATERIALIZED at admission (behavior-preserving default, stable per C30). DERIVATION for the uncoded form: C21's lane list assigns issue CODES explicitly and puts none on the `previous_reviewer_verdict` lanes — C11's "the fail_instance pattern" names the reserved-toggle NATURE (fail-closed on a reserved value), not a code assignment (derived: contract:ch11-gate-format#C11, contract:ch11-gate-format#C21, contract:ch11-gate-format#C30) |
| G6 | `pairflow.previous_reviewer_verdict` evaluate — allow iff `projection.history` carries at least one entry whose `stepId` equals `projection.currentStep` (the prior committed transition FROM the same review step — the l2 trace's "prior reviewer verdict"); otherwise block with the FIXED reason `no_previous_verdict`; reads only `history` + `currentStep` (anchored: contract:ch11-gate-format#C11) |
| G7 | Both registrations: `requiresRuntimeContext: false`; `implementation` `declarative` / `packaged` respectively; `execution` `"inline"`; the evaluators are read-only and stateless — pure over their two inputs, no captured mutable state, no I/O (the `l2/gate-is-read-only-stateless` invariant's evaluator half; its REVIEW disposition binds at P2b's rung) (anchored: prose:l2-pseudocode/GateRegistration, prose:ledger §2 l2, prose:model-src/sections/08-l2 Domain block) |
| G8 | Config validators treat raw input under the OWN-PROPERTY discipline: member reads are own-property only, inherited/`__proto__` members are never read as members, unknown-key detection runs over the value's OWN keys, and non-map shapes reject as ONE container finding suppressing that config's dependent lanes (C21's container-precondition rule at the config grain). The DRIVEN hostile lanes are the anchored set: `__proto__` pairs and inherited-key phantoms (the ch11-P1 arm-gate-2 lesson, adopted). Whether the own-key scan additionally covers SYMBOL and non-enumerable keys is BUILD FREEDOM following the ch4-P3 ingress idiom (narrowed at arm gate 1: no ratified row decides symbol-key semantics for directly-constructed config values — an enumerable-string-own-key validator conforms equally; if the build stages such lanes, note 7's channel discipline applies). DERIVATION: the ch11-P1 arm-gate-2 own-property lesson (the kernel-side `capability()` fix) applied at WRITE time to every new record scan; the ch4-P3 ingress idiom cited as precedent, not obligation (derived: prose:packet ch11-p1 build record, prose:packet ch4-P3, contract:ch11-gate-format#C21) |

## Canonical admission matrix (A)

| Id | Rule |
|---|---|
| A1 | `admitTemplate(template, catalog)` in `definition/` is THE single semantic validation + normalization point for gate semantics (C20 realized): the FILE pipeline runs it as the validate stage's SECOND rung, and admission findings ride the SAME load channel under stage `"validate"` (no new `LoadStage` member); directly-constructed templates enter through the SAME function — the testkit path. ACCUMULATION SCOPE (precised at arm gate 1; premise corrected at the round-4 lens-2 pass): on THIS packet's realizable inputs the two finding sources never co-occur — a file template cannot carry gates until P4 (A8), and on the DIRECT path `admitTemplate` runs NO ch8 structure lanes at all (structural well-formedness of a directly-constructed input is the CALLER's stated precondition — the partial-realization list carries the declaration; the TS type does NOT guarantee it: dangling targets, start/terminal breaks, and cycles are not type-expressible) — so the ch8-rung-first ordering is observationally vacuous here; the MODEL's one-channel rule (structure + gate findings ACCUMULATE across independently-traversable lanes, container suppression LOCAL only) becomes observable when the format key lands, and realizing it in the format walk is the P4 packet's INHERITED pipeline obligation, stated here so the P2a pipeline shape never licenses a permanent cross-source short-circuit (anchored: contract:ch11-gate-format#C20, prose:l2-pseudocode/admit_definition, contract:ch11-gate-format#C21) |
| A2 | Issue ACCUMULATION with the all-or-nothing return: admission reports the FULL finding set across ALL bindings — suppression is LOCAL (a broken container suppresses only ITS OWN dependent lanes; every OTHER binding's lanes still report — driven by a cross-binding fixture staging a broken container on one binding AND an independent violation on another, asserting BOTH findings); ANY finding ⇒ no admitted value exists (anchored: prose:l2-pseudocode/admit_definition, contract:ch11-gate-format#C20, contract:ch11-gate-format#C21) |
| A3 | Registration resolution: every binding's `uses` is resolved against the INJECTED catalog at admission; unresolved ⇒ a finding WITH code `gate_evaluator_unavailable` at the binding's C7 path, and nothing below dereferences the missing registration (the unit's CONTINUE) (anchored: prose:l2-pseudocode/admit_definition, contract:ch11-gate-format#C8) |
| A4 | Binding-grain semantic lanes (admission-owned — the TS type cannot express them): a `gates` event-type key ∉ `keys(step.transitions)` ⇒ the dead-config finding (C2); an EMPTY gate list ⇒ a finding (C3 — admission-owned by the draft's own rule); `config` MISSING where the registration requires it ⇒ a finding (C5) (anchored: contract:ch11-gate-format#C2, contract:ch11-gate-format#C3, contract:ch11-gate-format#C5) |
| A5 | Per-registration `validateAndNormalizeConfig` runs on each resolved binding's raw config; findings surface at the binding's C7-grammar address (`steps.<stepId>.gates.<eventType>[<i>]…`, 0-based list-index segments — the grammar's first realized use); defaults materialize ONCE — the ADMITTED value carries the EFFECTIVE config as its SINGLE reachable config surface, in the binding's `config` FIELD, and the raw/authored form is NOT carried downstream of admission. (Placement resolved at the arm re-check: D6's branded-intersection type `WorkflowTemplate & brand` retains the ledger field list — `GateBinding {uses, config?}` — and declares no separate effective field, so the config field IS the one surface; a differently-named field would need a different admitted shape D6 does not carry. Entailed by D6 + the ledger field list, not a fresh pick.) DERIVATION: C23 pins the authored form to the source YAML ("never on the wire"/downstream); the model's `gate.effective_config ←` assignment writes into the admitted definition; carrying BOTH forms downstream would re-open the raw-form channel C20 closed (derived: prose:l2-pseudocode/admit_definition, contract:ch11-gate-format#C7, contract:ch11-gate-format#C23) |
| A6 | `AdmittedTemplate` — the branded admitted type (the ledger's `AdmittedDefinition`, realized under the codebase's template naming; domain-declared unique-symbol brand, `definition/` the only sanctioned producer): `DefinitionStore.load` returns `AdmittedTemplate \| null`; kernel deps, the start path, and `fixtureDefinitionStore` narrow to it. The TRUST lives in the store PORT CONTRACT — the brand is its API expression, not a runtime mechanism — and the producer monopoly gets a MECHANIZED OWNER GUARD (added at arm gate 1): a lint rule bans the `as AdmittedTemplate` assertion form outside `definition/admit.ts` (static + the threat model is agent drift, so the lint IS the right defense layer; a deliberate runtime bypass stays a contract violation, not a defended attack). Behavioral sensitivity of the FILE path to a skipped admission call arrives with the first gate-carrying loadable file (P4) — until then the guard set is the lint + the brand confinement, stated honestly (anchored: contract:ch11-gate-format#C20, prose:ledger §4 l2 AdmittedDefinition) |
| A7 | The `requires_runtime_context` cross-rule BRANCH is NOT realized here: the rule's SECOND operand — the template-side runtime-context representation — does not exist until P3 (plan §11.1 item 4 assigns the minimal representation there, and C19's admission lane with it), so the rule cannot be evaluated against any realized template; the descriptor FIELD ships (R1), the branch + the `runtime_context_required_for_process_gate` code land at P3 with the representation. Explicitly ruled out, not silently gapped — the ch11-P1 A13 / R-EXECUTION stance: no dead code ships for a rule whose operand has no source (a test-composed requiring registration could reach the branch, but the template side it must read is P3's — realizing the branch now would fix its absent-operand semantics ahead of the representation). Same rule, same packet, for the `validate_*` level-validator hook: `validate_gate_config` is P3's body (derived: prose:plan §11.1 items 3–4, prose:plan §11.4 P3 row, contract:ch11-gate-format#C19) |
| A8 | Load-channel confinement: for gate-FREE templates — every loadable YAML today, since a `gates` key stays the ch8 V8 unknown-key rejection until P4 — the accept/reject behavior and the finding bytes are UNCHANGED through the new path (the ch8 validate lanes stand byte-identical; admission's gate scan is vacuous over zero bindings and its brand is type-level). Driven by the regression corpus + the canonical-template load lane. DERIVATION: measured — the ch8 validator's fixed step keyset (V8) rejects `gates`; P4 ratifies the format key (plan §11.4 P4 row); therefore no file input can reach the new lanes (derived: prose:packet ch8-p1 V8, prose:plan §11.4 P4 row, prose:v3/src/definition/validate.ts) |
| A9 | `ValidationFinding` gains OPTIONAL `code` — the C21 named-lane carrier on ch8-C21's `{path, message}` form: present on exactly the NAMED admission lanes (in this packet: `gate_evaluator_unavailable`; the P3/P4 codes join with their lanes); every ch8 lane stays code-less; the CLI's `{stage, findings}` machine shape is unchanged in kind (C28) — an additive optional field, zero CLI code change (anchored: contract:ch11-gate-format#C21, contract:ch11-gate-format#C28) |
| A10 | Admission performs NO fallible awaited work: `admitTemplate` is synchronous and pure over the resolved template value + the catalog (registration `validateAndNormalizeConfig`/`resolve` calls are synchronous by type). The site × shape × phase DELTA is EMPTY — no new awaited site, no new phase, no new failure shape on any observer path; the file path's awaited sites (`readdir`/`readFile`) keep their ch8 lanes untouched. DERIVATION: design assertion made checkable — the realized signatures carry no Promise; the C22-belt catch in `load.ts` keeps mapping any unexpected throw to the validate stage (derived: prose:v3/src/definition/load.ts, prose:l2-pseudocode/admit_definition) |

## Canonical domain-values matrix (D)

| Id | Rule |
|---|---|
| D1 | The template aggregate gains the gate pipeline at the (step, event-type) grain: `Step` gains an OPTIONAL gate lookup realizing the model's `gates_for(step, event_type)` — ABSENT = ungated (C1's absent semantics at the domain mirror); the CONTAINER SHAPE is BUILD FREEDOM within this grain (the ch11-P1 C4 lesson: the packet prescribes the SEMANTICS — per-(step, event-type) ordered lists, absent-means-ungated — never the TS container; the realized form is expected as a per-step `Readonly<Record<EventType, readonly GateBinding[]>>` but an equivalent keyed form is equally legal) (anchored: prose:ledger §4 l2 GateBinding/GatePipeline, contract:ch11-gate-format#C1, contract:ch11-gate-format#C2) |
| D2 | `GateBinding { uses: string; config?: unknown }` — the ledger's field list (`where` lives in the containing keys: step + event type); the ADMITTED binding carries the EFFECTIVE config in its `config` field, its single config surface per A5's rule (the D6 intersection keeps the ledger field list — the arm re-check resolution) (anchored: prose:ledger §4 l2 GateBinding, prose:model-src/sections/08-l2 Domain block) |
| D3 | `GatePipeline` — the ordered NONEMPTY list of bindings at one (step, event) point; authored order IS pipeline order (P2b's rung consumes it first-block-wins); realized as the exported ordered-list type; nonemptiness is A4's admission lane, never a type claim (anchored: prose:ledger §4 l2 GatePipeline, contract:ch11-gate-format#C3) |
| D4 | `GateDecision { verdict: "allow" \| "warn" \| "block"; reason?: string; message?: string; evidenceRefs?: readonly string[] }` — the ledger value verbatim, camelCase realization; `route` is NOT in the verdict union (the routing slice's Absent); the snake_case WIRE form is P3's C25 surface (anchored: prose:ledger §4 l2 GateDecision, prose:l2-pseudocode/GateRegistration) |
| D5 | `GateProjection { round: number; currentStep: StepId; eventType: EventType; history: readonly GateProjectionEntry[] }` with `GateProjectionEntry { stepId: StepId; eventType: EventType; role: RoleName }` — C24's Block A field list as the `evaluate` signature's second input; the DERIVATION (`derive_policy_view`, the kernel read) is P2b's unit (anchored: contract:ch11-gate-format#C24) |
| D6 | `AdmittedTemplate = WorkflowTemplate & { readonly [brand]: true }` — the domain-declared unique-symbol brand type (the symbol VALUE never exported; `definition/` the only sanctioned producer, A6); realized-name note: the ledger entity is `AdmittedDefinition`, the realized name follows the codebase's `WorkflowTemplate` naming — the domainRegistry witness binds the row (anchored: contract:ch11-gate-format#C20, prose:ledger §4 l2 AdmittedDefinition) |

## Canonical testkit/consumer matrix (T)

| Id | Rule |
|---|---|
| T1 | `fixtureDefinitionStore` narrows to `AdmittedTemplate` (C20's "harness types narrow to the admitted type", verbatim); the kit itself STILL never imports `definition/` (ADR-005/ch8-C32 untouched) — TESTS import the compiler (`admitTemplate`) and a catalog to brand fixtures; `fixtureTemplate()` keeps returning the RAW authored-shape value. The `templateFixture.test.ts` equality pin (fixture == the canonical file's parsed form) HOLDS: the canonical template carries no gates, the brand is type-level, and admission materializes nothing on a gate-free value — the compared structures are byte-equal (anchored: contract:ch11-gate-format#C20, prose:v3/src/testkit/templateFixture.ts) |
| T2 | The scripted gate/process players leave the kit with their placeholder types (R5); NO kit surface replaces them in this packet — P3 ships the ledger-shaped six-outcome drive (C29). Kit exports (`testkit/index.ts`) and `ports/index.ts` updated in the same sweep (anchored: contract:ch11-gate-format#C29, prose:plan §11.1 item 3) |
| T3 | The measured consumer set updates MECHANICALLY under three sanctioned change classes — admit-wrapping (a raw fixture passed through `admitTemplate` + a catalog), type narrowing (inline `DefinitionStore` literals in tests return admitted values), and import updates (deleted player references) — zero lane-meaning changes. The set: the 11 `fixtureDefinitionStore` call-site files (Embedding gates sweep), the NINE template-returning inline-literal sites across three files — `kernel/kernel.test.ts` 34/438/487, `floor/floor.test.ts` 43, `kernel/diagEmission.test.ts` 36 (annotated) + 414/479/515/698 (un-annotated `definitions: { load: … }` literals typed by the RECEIVING parameter — the round-2 lens-1 catch: the inventory rule is the receiving type, never the annotation; the two-channel sweep in Embedding gates is the covering measurement, `v3:typecheck` the closing backstop) — while the five reject/null/annotation literals (diagEmission 338/444/461/351/540) are brand-compatible and unchanged, and `fixtures.test.ts` (player tests removed). DERIVATION: the ch11-P1 build's sanctioned-change-class pattern applied to this packet's compile-enforced ripple (derived: prose:packet ch11-p1 build record, prose:v3/src/kernel/kernel.test.ts) |
| T4 | The dev CLI's replay staging (`cli/dev/main.ts`, the one production-graph `fixtureDefinitionStore` call site — legal on the ADR-009 dev boundary) admit-wraps the SAME way, with the catalog it already composes for `validate`; the operator CLI (`cli/main.ts`) wires `createGateRegistry()` into `createFileDefinitionStore` construction — composition-root wiring only, NO verb/flag/output change (C28). DERIVATION: the composition roots are the ADR-013 injection points; the dev replay path must keep staging templates the kernel will accept, which now means admitted ones (derived: ADR-013, contract:ch11-gate-format#C28, prose:v3/src/cli/dev/main.ts) |

## Site × shape × phase grid (template §2 write-time discipline)

Trigger check: the packet declares failure lanes over the definition
LOAD seam. The delta is EMPTY by design (A10): admission adds NO
awaited site, NO phase, and NO new failure shape on any observer
path — it is a synchronous pure rung between the ch8 validate stage
and the store's ref check. The inherited awaited-site inventory
(ch8-P1's: `readdir`, `readFile` — each with its OS-half lanes) and
the stage short-circuit order (read → parse → resolve → validate
[structure rung → admission rung] → store ref check) stand; the C22
every-stage belt in `load.ts` keeps catching any unexpected throw
into the validate stage's mapped finding. One delta row for the
record:

| Site | Phase | Failure shape | Channel | Driven by / ruled out |
|---|---|---|---|---|
| `admitTemplate` (pure, synchronous) | validate stage, post-structure | findings only — no throw path on any known input; unexpected throw maps via the C22 belt | `{stage: "validate", findings}` with A9's optional `code` | DRIVEN: dimensions 1–3, 6; the belt lane inherited from ch8-P1 (its existing test stands) |
| `readdir` / `readFile` (file path) | read stage | unchanged (OS half) | unchanged | RULED OUT as new lanes: no change; ch8 lanes stand |

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical | Mirrors |
|---|---|---|
| single admission authority + the brand cutover | A1 + A6 | Claim 1 · D6 · T1 · dimension 8 · the Sizing closure proof · in-context note 2 |
| all-or-nothing accumulation | A2 | Claim 2 · dimension 2 |
| one effective-config surface, defaults once | A5 | Claim 3 · D2's admitted-value clause · G5's absent-default · dimension 3 |
| injected static composition + issue-code resolution | A3 + G2 + R3 | Claim 4 · dimension 1's unknown-uses lane · the rejection-strings section · acceptance registry bullet |
| the staged remainder (process member P3 · runner half P3 · cross-rule P3 · format key P4) | G2 + R5 + A7 + A8 | Claim 6's boundary clauses · the slice's partial-realization list · the Sizing prerequisite row · acceptance staging bullet |
| placeholder retirement (zero refs) | R5 | Claim 5 · T2 · acceptance sweep bullet |
| the gates/ import boundary (both directions) | G1 | Claim 4's import clause · dimension 9 · acceptance boundary-probes bullet · T1's kit-imports clause |
| inline-only unrepresentability | R1 | Claim 5 · the slice's invariant row · G7's execution cell |
| load-channel confinement | A8 | Claim 6 · dimension 7 · the Sizing stop-1 assessment · in-context note 6 |
| coded vs uncoded lanes | A9 | A3 · G3/G5's uncoded clauses · dimension 1 |
| own-property discipline | G8 | dimension 5's descriptor/prototype rungs · in-context note 4 |
| one channel, one stage | A1's stage clause | in-context note 1 · the grid's channel column |

The Pre-approval flags ledger stays out of the live mirror set (the
ch11-P1 precedent): entries are dated decision snapshots.

## In-context notes (the scarce budget)

1. **One semantic channel, one stage:** admission findings ride the
   load channel's `"validate"` stage — do NOT mint a new `LoadStage`
   member (the stage enum is a declared ch8 CLI surface; C20 makes
   admission PART of semantic validation, not a stage after it).
2. **The brand is produced in one place and never re-checked:** do
   not export the brand symbol's value; do not re-validate admitted
   values downstream — testing an invalid config means asserting the
   COMPILER's finding list, never handing a bad template to the
   kernel (C22's standing rule).
3. **Container findings never cascade:** a non-map config, a
   non-list gate entry — ONE finding at the container's path,
   dependent lanes suppressed (C21's rule); resist per-key error
   loops over a broken container.
4. **Own-property discipline on every raw scan:** own-key
   unknown-key detection and own-property member reads — the
   ch11-P1 `__proto__` lesson applies to every NEW record lookup
   this packet writes, not just the one a finding names (whether
   the own-key scan includes symbol/non-enumerable keys is G8's
   stated build freedom).
5. **The registry is composition, not a mutable lookup:** no
   registration/mutation API on the catalog — Block A composes at
   module scope in `gates/`; tests compose their OWN catalogs
   (including hostile ones) rather than mutating the shipped one.
6. **Do not touch the ch8 validate lanes:** admission is a second
   rung BEHIND them, not a rewrite — the regression corpus pins the
   existing finding bytes (A8); a "cleanup" of validate.ts is out of
   boundary.
7. **Hostile config fixtures are HAND-BUILT** (R-RAW-FIXTURES, watch
   status): `__proto__` pairs, inherited-key phantoms, and the
   numeric-shape rows survive NO JSON round-trip — construct them
   as object literals with literal `__proto__` syntax /
   `Object.create`; a stringify-built hostile fixture silently
   no-ops the G8 lanes (dimension 5's channel discipline). The same
   rule binds any OPTIONAL symbol / non-enumerable lanes the build
   chooses to stage (G8's build-freedom half — computed symbol
   keys, `Object.defineProperty`).

## Embedding gates (v1-inherited)

- **New:** `v3/src/domain/gate.ts` (D2–D5),
  `v3/src/gates/registry.ts` (G2), `v3/src/gates/threshold.ts`
  (G3/G4), `v3/src/gates/previousReviewerVerdict.ts` (G5/G6),
  `v3/src/gates/index.ts`, `v3/src/definition/admit.ts` (A1–A7),
  `v3/src/gates/registry.test.ts`, `v3/src/gates/threshold.test.ts`,
  `v3/src/gates/previousReviewerVerdict.test.ts`,
  `v3/src/definition/admit.test.ts`.
- **Edited (production):** `v3/src/ports/gate.ts` (R1–R5 — full
  reconciliation), `v3/src/ports/index.ts` (exports),
  `v3/src/ports/definition.ts` (A6 — the return-type flip),
  `v3/src/domain/template.ts` (D1 + D6),
  `v3/src/domain/index.ts` (exports),
  `v3/src/definition/load.ts` (A1 — the admission rung + the
  catalog parameter), `v3/src/definition/fileDefinitionStore.ts`
  (catalog parameter), `v3/src/definition/errors.ts` (A9 —
  `ValidationFinding.code?`), `v3/src/definition/index.ts`
  (exports), `v3/src/kernel/kernel.ts` + `v3/src/kernel/start.ts`
  (type narrowing only — `loadTemplate`'s return + deps),
  `v3/src/cli/main.ts` + `v3/src/cli/dev/main.ts` (T4 —
  composition-root catalog wiring; dev replay admit-wrap),
  `v3/src/testkit/templateFixture.ts` (T1),
  `v3/src/testkit/fixtures.ts` (T2 — players removed),
  `v3/src/testkit/index.ts` (exports),
  `v3/eslint.config.mjs` (G1 — the gates/ boundary entries, static +
  dynamic forms both directions; PLUS A6's owner guard: the
  `as AdmittedTemplate` assertion form banned outside
  `definition/admit.ts`),
  `v3/src/drift/unitMap.json` (the three l2 ids flip realized with
  codeRefs), `v3/src/drift/domainRegistry.ts` (five l2 type rows
  flip realized with witnesses: `l2/GateBinding`, `l2/GatePipeline`,
  `l2/GateRegistration` — witnessed via a NEW `import type` from
  `ports/gate.js` (ADR-007-conform: drift manifests are
  type-import-only, the source module is unrestricted; the file
  currently imports from `domain/index.js` only) —,
  `l2/GateDecision`,
  `l2/AdmittedDefinition` → `AdmittedTemplate`;
  `l2/WorkflowInstance` and `l2/gate_projection` stay pending for
  P2b/P2c; the three `l2/Rejected(...)` rows are already realized at
  name level — untouched),
  `docs/v3/implementation/plan.md` (the aligned §11.4 repartition —
  table rows + Order line + process-note re-anchoring — plus the
  §11.2 checker-owner token and the §2.2 ports-row terminology
  propagation; the header paragraph enumerates the full edit; same
  commit).
- **Edited (tests — the type-ripple set; every file below updates
  under T3's three sanctioned change classes):**
  `definition/load.test.ts`, `definition/fileDefinitionStore.test.ts`,
  `definition/validate.test.ts` (defensive — included in case its
  fixtures ride `loadTemplate`'s signature),
  `testkit/templateFixture.test.ts` (T1's pin),
  `testkit/fixtures.test.ts` (player tests removed),
  `kernel/kernel.test.ts` (3 inline `DefinitionStore` literals,
  measured), `kernel/diagEmission.test.ts` (5 template-returning
  inline literals — 36 annotated, 414/479/515/698 un-annotated
  receiving-typed; its reject/null/annotation literals at
  338/444/461/351/540 are brand-compatible), `floor/floor.test.ts`
  (1 template-returning inline literal at line 43),
  `kernel/start.test.ts`,
  `diag/sqliteDiagStore.test.ts`, `emitLoop.test.ts`,
  `twoWorker.test.ts`, `l0aTrace.test.ts`, `l0bTrace.test.ts`,
  `l1Trace.test.ts`, `floor/tail.test.ts`, `floor/diagTail.test.ts`,
  `floor/debugBundle.test.ts`,
  `cli/cli.test.ts` + `cli/journey.test.ts` (defensive — the CLI
  drives the real store through `runCli`; expected no-op beyond
  possible import/wiring echoes),
  `drift/unitMap.test.ts` + `drift/domainRegistry.test.ts`
  (defensive — generic asserts, expected no-op).
- **Untouched, explicitly:** `v3/src/definition/validate.ts` (note
  6 — the ch8 lanes are pinned bytes), `v3/src/store/**` (no schema
  or row change — the chapter's bump is P2b's),
  `v3/src/ingress/**`, `v3/src/emit/**`, `v3/src/diag/*.ts`
  (production), `v3/src/floor/*.ts` (production — no read surface
  consumes gate shapes; `debugBundle.ts` is not a DefinitionStore
  consumer, measured), `v3/src/domain/rejections.ts` (the registry
  stays 54 — the issue code is a finding field, not a name),
  `v3/src/kernel/admission.ts` / `capability.ts` /
  `dispatchIntent.ts` (the actor-envelope ladder is untouched; the
  gate rung is P2b's), `v3/src/testkit/traceHarness.ts` +
  `storeCheckers.ts` + `scriptedActor.ts` (no kit behavior change
  beyond T1/T2), `v3/templates/local-pair-v0@1.yaml` (no format
  change until P4), `v3/adr/ADR-013-gates-module-and-registry.md`
  (already `accepted` at the draft ratification — no ADR edit; the
  packet EXECUTES its verification bullet).
- **Sweeps (measured 2026-07-12, current tree; untruncated):**
  `grep -rln "fixtureDefinitionStore" v3/src --include="*.ts"` → 13
  files: `cli/dev/main.ts`, `diag/sqliteDiagStore.test.ts`,
  `emitLoop.test.ts`, `floor/debugBundle.test.ts`,
  `floor/diagTail.test.ts`, `floor/tail.test.ts`,
  `kernel/start.test.ts`, `l0aTrace.test.ts`, `l0bTrace.test.ts`,
  `l1Trace.test.ts`, `testkit/index.ts`,
  `testkit/templateFixture.ts`, `twoWorker.test.ts` — all carried
  in the boundary;
  `grep -rln "ports/gate\|GateRunner\|GateSpec\|GateVerdict\|ProcessRunner" v3/src --include="*.ts"`
  → 6 files: `drift/domainRegistry.ts`, `ports/gate.ts`,
  `ports/index.ts`, `testkit/fixtures.test.ts`,
  `testkit/fixtures.ts`, `testkit/index.ts` — the R5 zero-refs
  sweep's baseline, all carried;
  `grep -rln "DefinitionStore" v3/src --include="*.ts" | grep -v test`
  → 8 files: `cli/dev/main.ts`, `cli/main.ts`,
  `definition/fileDefinitionStore.ts`, `definition/index.ts`,
  `kernel/kernel.ts`, `kernel/start.ts`, `ports/definition.ts`,
  `ports/index.ts` — every member addressed above;
  inline test `DefinitionStore` literals — the COVERING sweep,
  defined by the RECEIVING-TYPE rule (any expression a
  `DefinitionStore`-typed parameter/field receives is in the
  inventory, annotated or not — deepened TWICE: round-1 lens 1
  caught the kernel.test.ts-only framing, round-2 lens 1 caught the
  annotation-only channel; a third construction channel discovery
  re-derives the WHOLE inventory again, and `v3:typecheck` is the
  closing backstop the sweep never replaces):
  `grep -rnE ": DefinitionStore\b|definitions: *\{ *load:" v3/src --include="*.test.ts"`
  → 14 hits (re-measured, untruncated): NINE template-returning
  construction sites needing the T3 admit-wrap —
  `kernel/kernel.test.ts` 34/438/487, `floor/floor.test.ts` 43,
  `kernel/diagEmission.test.ts` 36/414/479/515/698 — and FIVE
  brand-compatible (diagEmission 338/444 reject, 351/461 null, 540
  type annotation); all three files carried in the boundary; the
  build re-runs each sweep and treats a grown set as a boundary
  question, not a silent extension.
- **Type-ripple targets:** `DefinitionStore.load` →
  `AdmittedTemplate` ripples every store literal and
  `fixtureDefinitionStore` call (carried above); `Step.gates?` and
  `WorkflowTemplate` brand-intersection are additive — no compile
  ripple beyond the deliberate ones; deleting the placeholder types
  ripples exactly the FIVE files that actually reference the
  placeholder types (`ports/gate.ts`, `ports/index.ts`,
  `testkit/fixtures.ts`, `fixtures.test.ts`, `testkit/index.ts` —
  the baseline sweep's sixth file, `drift/domainRegistry.ts`, is a
  key-string false positive per R5 and changes for its own l2-row
  reason).

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/domain/gate.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/index.ts",
      "v3/src/ports/gate.ts",
      "v3/src/ports/index.ts",
      "v3/src/ports/definition.ts",
      "v3/src/gates/registry.ts",
      "v3/src/gates/threshold.ts",
      "v3/src/gates/previousReviewerVerdict.ts",
      "v3/src/gates/index.ts",
      "v3/src/gates/registry.test.ts",
      "v3/src/gates/threshold.test.ts",
      "v3/src/gates/previousReviewerVerdict.test.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/load.ts",
      "v3/src/definition/load.test.ts",
      "v3/src/definition/fileDefinitionStore.ts",
      "v3/src/definition/fileDefinitionStore.test.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/definition/errors.ts",
      "v3/src/definition/index.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/start.ts",
      "v3/src/kernel/start.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/testkit/templateFixture.ts",
      "v3/src/testkit/templateFixture.test.ts",
      "v3/src/testkit/fixtures.ts",
      "v3/src/testkit/fixtures.test.ts",
      "v3/src/testkit/index.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/eslint.config.mjs",
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
      { "id": "R1", "class": "anchored", "refs": ["prose:l2-pseudocode/GateRegistration", "contract:ch11-gate-format#C9", "prose:ledger §2 l2"] },
      { "id": "R2", "class": "anchored", "refs": ["prose:l2-pseudocode/GateRegistration", "contract:ch11-gate-format#C9"] },
      { "id": "R3", "class": "anchored", "refs": ["contract:ch11-gate-format#C8", "prose:l2-pseudocode/admit_definition"] },
      { "id": "R4", "class": "derived", "refs": ["prose:l2-pseudocode/GateRegistration", "contract:ch11-gate-format#C7", "prose:v3/src/definition/errors.ts"] },
      { "id": "R5", "class": "derived", "refs": ["contract:ch11-gate-format#C29", "prose:plan §11.1 item 3", "prose:v3/src/testkit/fixtures.ts"] },
      { "id": "G1", "class": "anchored", "refs": ["ADR-013", "contract:ch11-gate-format#C29"] },
      { "id": "G2", "class": "derived", "refs": ["contract:ch11-gate-format#C8", "prose:plan §11.4 P3 row"] },
      { "id": "G3", "class": "anchored", "refs": ["contract:ch11-gate-format#C10", "contract:ch11-gate-format#C5", "contract:ch11-gate-format#C21"] },
      { "id": "G4", "class": "anchored", "refs": ["contract:ch11-gate-format#C10"] },
      { "id": "G5", "class": "derived", "refs": ["contract:ch11-gate-format#C11", "contract:ch11-gate-format#C21", "contract:ch11-gate-format#C30"] },
      { "id": "G6", "class": "anchored", "refs": ["contract:ch11-gate-format#C11"] },
      { "id": "G7", "class": "anchored", "refs": ["prose:l2-pseudocode/GateRegistration", "prose:ledger §2 l2", "prose:model-src/sections/08-l2"] },
      { "id": "G8", "class": "derived", "refs": ["prose:packet ch4-P3", "prose:packet ch11-p1", "contract:ch11-gate-format#C21"] },
      { "id": "A1", "class": "anchored", "refs": ["contract:ch11-gate-format#C20", "prose:l2-pseudocode/admit_definition"] },
      { "id": "A2", "class": "anchored", "refs": ["prose:l2-pseudocode/admit_definition", "contract:ch11-gate-format#C20"] },
      { "id": "A3", "class": "anchored", "refs": ["prose:l2-pseudocode/admit_definition", "contract:ch11-gate-format#C8"] },
      { "id": "A4", "class": "anchored", "refs": ["contract:ch11-gate-format#C2", "contract:ch11-gate-format#C3", "contract:ch11-gate-format#C5"] },
      { "id": "A5", "class": "derived", "refs": ["prose:l2-pseudocode/admit_definition", "contract:ch11-gate-format#C7", "contract:ch11-gate-format#C23"] },
      { "id": "A6", "class": "anchored", "refs": ["contract:ch11-gate-format#C20", "prose:ledger §4 l2"] },
      { "id": "A7", "class": "derived", "refs": ["prose:plan §11.1 items 3-4", "prose:plan §11.4 P3 row", "contract:ch11-gate-format#C19"] },
      { "id": "A8", "class": "derived", "refs": ["prose:packet ch8-p1", "prose:plan §11.4 P4 row", "prose:v3/src/definition/validate.ts"] },
      { "id": "A9", "class": "anchored", "refs": ["contract:ch11-gate-format#C21", "contract:ch11-gate-format#C28"] },
      { "id": "A10", "class": "derived", "refs": ["prose:v3/src/definition/load.ts", "prose:l2-pseudocode/admit_definition"] },
      { "id": "D1", "class": "anchored", "refs": ["prose:ledger §4 l2", "contract:ch11-gate-format#C1", "contract:ch11-gate-format#C2"] },
      { "id": "D2", "class": "anchored", "refs": ["prose:ledger §4 l2", "prose:model-src/sections/08-l2"] },
      { "id": "D3", "class": "anchored", "refs": ["prose:ledger §4 l2", "contract:ch11-gate-format#C3"] },
      { "id": "D4", "class": "anchored", "refs": ["prose:ledger §4 l2", "prose:l2-pseudocode/GateRegistration"] },
      { "id": "D5", "class": "anchored", "refs": ["contract:ch11-gate-format#C24"] },
      { "id": "D6", "class": "anchored", "refs": ["contract:ch11-gate-format#C20", "prose:ledger §4 l2"] },
      { "id": "T1", "class": "anchored", "refs": ["contract:ch11-gate-format#C20", "prose:v3/src/testkit/templateFixture.ts"] },
      { "id": "T2", "class": "anchored", "refs": ["contract:ch11-gate-format#C29", "prose:plan §11.1 item 3"] },
      { "id": "T3", "class": "derived", "refs": ["prose:packet ch11-p1", "prose:v3/src/kernel/kernel.test.ts"] },
      { "id": "T4", "class": "derived", "refs": ["ADR-013", "contract:ch11-gate-format#C28", "prose:v3/src/cli/dev/main.ts"] }
    ]
  }
}
```

## Pre-approval flags

None. No new-decision manifest row exists (tally: 22 anchored /
11 derived / 0 new-decision); no narrowing or open decision point
rides outside the ratified sources: the in-chapter split is the
loop's own act under README §5.5's autonomous row (recorded in
`## Sizing/risk` with its visible report, and carried into the plan
by the prepared repartition edit — propagation-class, not
meaning-changing); the staged remainder (the process member, the
runner half, the cross-rule, the format key) is the ratified plan's
own packet cut, stated as proof boundaries, not decided here; no
contested substrate premise exists (no matrix cell rests on
driver/OS/filesystem behavior — the packet's only substrate-adjacent
claim, A8's V8 rejection of a `gates` key, is a measured code fact
over `validate.ts`). The P2c round-format question is OUTSIDE this
packet's rows (quarantined by the split; it fires at P2c's
authoring, not at this approve).

## Acceptance

- **Dimensions 1–9 test-driven; every declared lane driven by name
  and ABLE TO FAIL (R-LANE-SENSITIVITY):**
  - `definition/admit.test.ts` — the dimension-1 admission lane
    grid over directly-constructed templates (each lane staged with
    an otherwise-valid template so ONLY the target lane fires);
    dimension 2 (a two-gate, three-issue fixture asserting the FULL
    finding set by path+code, and the all-or-nothing arm);
    dimension 3 (the admitted value's effective configs asserted by
    VALUE — the absent-config default materialized, the explicit
    form preserved); dimension 6 (finding paths asserted as exact
    strings including the `[<i>]` segment); the A3 coded lane
    asserted on BOTH fields (path AND `code: "gate_evaluator_unavailable"` —
    a keyset-only assert is the R-LANE-SENSITIVITY blind class);
    LANE-CODE FIDELITY on every driven admission lane (arm-gate-1
    F9): each lane asserts the FULL finding object — exact path,
    message PRESENT, and `code` present XOR ABSENT per its lane's
    C21 assignment (a build stamping codes on the uncoded lanes, or
    dropping the coded lane's code, fails); A2's suppression (a
    non-map config yields ONE finding, not a key cascade) AND A2's
    cross-binding accumulation lane (a broken container on one
    binding + an unknown `uses` on another → BOTH findings
    reported).
  - `gates/threshold.test.ts` — G3's config lanes (including
    dimension 5's hostile shapes and the numeric ladder rows) +
    G4's semantics grid (below/at/above the boundary; the at-boundary
    allow is the reorder catch — an off-by-one `<=` fails it).
  - `gates/previousReviewerVerdict.test.ts` — G5's config lanes
    (reserved-toggle `required: false`, unknown key, non-map) +
    G6's semantics grid (empty history / same-step prior / 
    other-step-only history — the third lane is the sensitivity
    catch: a naive nonempty-history check passes it wrongly).
  - **G7 purity lanes (arm-gate-1 F8, both evaluators):**
    mutation-negative — every semantics-grid lane runs its inputs
    RECURSIVELY deep-frozen: a verified `deepFreeze` covering
    EVERY reachable mutable object — the config, the projection,
    the `history` ARRAY ITSELF, and each history entry (the arm
    re-check's catch: entry-only freezing leaves
    `projection.history.push(...)` uncaught — array mutation is a
    named sensitivity example; a mutating evaluator throws in
    strict mode and fails the lane) — and repeated-call
    determinism (the same evaluator instance called twice on
    identical inputs returns deep-equal decisions; captured
    mutable state fails it).
  - `gates/registry.test.ts` — G2: the exact CURRENT member set
    (both directions: contains both, contains nothing else),
    resolution returns the registered descriptor, unknown id
    resolves null; G7's descriptor fields asserted per member;
    **compile-negative type probes (arm-gate-1 F7):**
    `@ts-expect-error` lanes proving the R1/R2 unrepresentability
    claims — a registration with `execution: "deferred"`, a
    process-implementation registration carrying `evaluate`, and
    an inline registration MISSING `evaluate` each fail to
    compile (a widened union turns these lanes red at
    `v3:typecheck` via TS2578 unused-directive). ISOLATION
    discipline (the runtime lanes' otherwise-valid rule applied at
    the type level): each probe object is OTHERWISE WELL-TYPED so
    its ONLY type error is the target field — `@ts-expect-error`
    suppresses ANY error on its line, and an incomplete probe
    would satisfy the directive through an unrelated error,
    silently defeating the widening guard.
  - `definition/load.test.ts` + `fileDefinitionStore.test.ts` —
    A8's confinement: the ch8 corpus lanes re-run byte-identical
    through the new signature, and the confinement lane asserts
    FINDING BYTES (path + message equality on at least one
    representative failing lane per stage), never keysets alone —
    an inherited keyset-only corpus assert would pass a changed
    message (the R-LANE-SENSITIVITY blind class); the canonical
    template loads and is ADMITTED (the store returns the branded
    type — compile-level) with structure equal to
    `fixtureTemplate()` (T1's pin holds in
    `templateFixture.test.ts`).
  - **Boundary probes (dimension 9, the ADR-013 verification
    bullet):** value-red / type-green / dynamic-red probes both
    directions on the `gates/` boundary, executed at build (the
    ch8-opening sweep's probe pattern; receipts in the build
    record); PLUS the A6 owner-guard probe (arm-gate-1 F6): an
    `as AdmittedTemplate` assertion staged OUTSIDE
    `definition/admit.ts` trips the lint (value-red), the
    compiler's own use stays green.
  - **The R5 zero-refs sweep** (pattern = R5's FULL deletion list —
    the round-1 lens-3 catch closed the `ProcessSpec`/`GateRunner`/
    `ProcessRunner` gap): at build close,
    `grep -rnE "\b(GateSpec|ProcessSpec|GateVerdict|GateRunner|ProcessRunner|ProcessResult|ScriptedGateRunner|ScriptedProcessRunner|createScriptedGateRunner|createScriptedProcessRunner)\b" v3/src`
    returns ZERO hits, with ONE stated carve-out: the drift
    registry's pending l2a row KEYS (exactly ONE such hit:
    `"l2a/ProcessResult"` in
    `domainRegistry.ts`) are quoted ledger names, the only legal
    hits — every other hit is a live reference and a failure
    (`\bGateRunner\b` does not match inside `ProcessGateRunner`:
    the word boundary excludes it, verified reasoning stated so the
    build does not "fix" the pattern) — untruncated output rides
    the build record (R-UNTRUNCATED-SWEEP).
- **Behavior-change honesty:** ZERO behavior changes on shipped
  surfaces are claimed (Claim 6/A8) — the proof is the FULL existing
  suite green after T3's mechanical updates plus the byte-identical
  corpus lanes; the only new observable behavior lives on inputs no
  shipped surface can produce yet (gate-carrying constructed
  templates).
- Drift tests green (standing, unconditional — PI-3): rejection
  registry untouched (54); `unitMap.json` +3 l2 entries
  (realized, with codeRefs); `domainRegistry.ts` 5 l2 type rows
  flipped with witnesses.
- Coverage validation green: units 14/159 owned, invariants 12/116,
  traces 3/20 (unchanged — the l2 trace is P2b's).
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint`, `v3:adr-check` (ADR-013 already
  `accepted`; no new ADR — the module home rides the existing one).
- Standing review rules in force: **REV-E-NO-ADAPTER-BRANCH** (no
  code branches on a concrete registration/adapter type beyond the
  ledger's own discriminant — the catalog arrives injected);
  **REV-B-LOCAL-NOT-AUTHORITY** (the static registry is
  composition, not a cache — note 5; the file store's fresh-listing
  rule untouched); **REV-A1-TXN** n/a (no commit-path change);
  **REV-C-PROJECTIONS-READONLY** n/a (no projection surface);
  **REV-DIAG-FAILOPEN** n/a (no diag emit site changes).

## Build record

Approved 2026-07-12 on the AUTONOMOUS flag-free path (README §5.5) —
zero new-decision manifest rows, zero flags, every approve-time
tier-0 gate green, a clean close, and arm gate 1 clean on the same
final hash. The hash chronicle: R1 FULL bound `465d179b…` (five
lenses; boundary + sweep + mirror folds); the fold produced
`f1872b0b…`; R2 TARGETED (lenses 1/3/5 + reconciliation) deepened
the inline-literal covering sweep to the RECEIVING-TYPE rule (the
"fix scoped to the finding" class caught recurring: round 1 fixed
the kernel.test-only framing, round 2 found the annotation-only
channel still uncovering — 9 admit-wrap sites, not 5) and corrected
the domainRegistry claims, folding to `1b51aee3…`; R3 TARGETED ran
CLEAN and the first close ran CLEAN on it. ARM GATE 1
(agent-invoked `codex exec`, pin-conform gpt-5.6-sol/high/never,
byte guard clean before+after) returned `refine` citing `1b51aee3…`
with TEN findings — four derived-row entailment attacks resolved by
NARROWING to anchor-entailed semantics + declared build freedom
(R4 address composition, G5 message wording, G8 symbol-key
semantics, A5 field placement — the arm's own offered route; none
reclassified new-decision), the A1/A2 accumulation-scope precision
(+ the P4-inherited cross-source obligation), the A6 mechanized
owner guard, G7 purity lanes, compile-negative type probes,
lane-code fidelity asserts, and the plan §2.2 stale ports-row
mirror. R4 TARGETED (lenses 2/3 + reconciliation) verified the
folds and corrected the A1 "TYPE-guaranteed" premise to the
caller-precondition reading (a declared partial realization);
reconciliation CLEAN on `59a024bd…`, the second close CLEAN on it.
The arm's RE-CHECK returned `refine` (2): the A5 placement freedom
CONTRADICTED D6's already-pinned intersection type (a
narrowing-minted inconsistency — resolved: the `config` field is
D6-entailed), and the G7 freeze recipe left the history ARRAY
mutable (resolved: verified recursive deepFreeze). Reconciliation
CLEAN on `178a09a2…`; the arm's SECOND re-check returned CLEAN
citing it (both dispositions accepted); the FINAL close ran CLEAN
citing the same hash. 4 counted panel rounds of the 8-round
watchdog; reconciliations, closes, and arm passes uncounted. All
internal passes Opus-class.

Built the same day (delegated build round, the packet as the
binding contract @ `178a09a2…`). **622 → 668 tests** (−4 retired
scripted-player tests with `fixtures.ts`/`fixtures.test.ts`
removed, +50 new: threshold / previousReviewerVerdict / registry /
admit suites). Bridges at close (orchestrator-rerun, not
builder-claimed): `v3:typecheck` 0 errors · `v3:lint` clean ·
`v3:test` 668/668 · `v3:coverage` OK (units 14/159, invariants
12/116, traces 3/20 — exactly the acceptance numbers) ·
`v3:packet-lint` 0 errors (0 reopened) · `v3:adr-check` OK
(ADR-013 `accepted`, no new ADR). Sweep receipts: the R5 zero-refs
sweep returns EXACTLY the one stated carve-out hit
(`domainRegistry.ts` `"l2a/ProcessResult"` pending key); all 9
template-returning inline literals + all 11 `fixtureDefinitionStore`
call sites admit-wrapped, the 5 brand-compatible literals untouched.
Probe receipts (executed then removed): the A6 owner guard value-red
outside / green inside `admit.ts`; the gates/ boundary value-red /
type-green / dynamic-red BOTH directions; the three compile-negative
probes live as isolated `@ts-expect-error` lanes. Build notes:
`kernel/kernel.ts` + `kernel/start.ts` needed ZERO edits (the brand
is a subtype — boundary over-inclusion, not a miss);
`TemplateLoadResult`'s ok arm carries `AdmittedTemplate` (threads
the brand without a second assertion — the producer monopoly holds);
`loadTemplate`'s catalog parameter defaults to an empty catalog
(A8-vacuous over gate-free files; keeps the out-of-boundary
`dev.test.ts` bare call intact); `admitTemplate` rebuilds bindings
with own-key writes so hostile `__proto__` step keys survive
admission as own keys (caught in-build against the ch8
`validate.test.ts` pin).

**Aftermath (2026-07-12, ARM GATE 2 — the build-close implementation
review; pin-conform gpt-5.6-sol/high, verdict `refine` citing the
build sha `a76b0382`, byte guard clean):** four findings, folded in
ONE `fix(v3)` round: (1) **the empty-failure-arm hole (product):**
`GateConfigResult`'s failure arm typed a possibly-EMPTY findings
list — a registration returning `{ok: false, findings: []}` admitted
a branded template with `config: undefined` while all 668 tests
stayed green; fix: the failure arm is now the statically NONEMPTY
tuple `readonly [GateConfigFinding, ...GateConfigFinding[]]`, both
builtin validators return through a nonempty-by-construction
destructure, and admission carries a runtime belt (a cast-forged
empty failure yields a synthesized uncoded finding at the config
path — driven by the new hostile-catalog lane). (2) **the
approve-basis reproducibility gap (packet-docs):** the approve-ready
bytes (`178a09a2…`) are not a reachable git object — the Build
record is written between the approve and the commit BY the
process's own design (template §1: `packet_metrics` at build close;
the ch11-P1 commit has the same shape), so the committed packet
hashes differently; DISPOSITION: recorded here (the approve-ready
bytes = this file with the `## Build record` section restored to its
pre-build placeholder + zeroed-metrics form; the hash chronicle's
verification trail lives in the panel/arm transcripts), and the
process question — should the approve-ready bytes be preserved as a
git object — routes to the ch11 boundary review (process-log line).
(3) **G7 freeze under-coverage (test-evidence):** only the dedicated
purity lanes ran frozen; now EVERY G4/G6 semantics lane runs
recursively deep-frozen with per-branch repeated-call determinism
(the standalone purity lanes merged into the grids). (4) **the
missing own-`__proto__` lane on `pairflow.previous_reviewer_verdict`
(test-evidence):** the hostile computed-`__proto__` config lane
existed on the threshold validator only — the "fix scoped to the
finding" class AGAIN, cross-validator this time; the twin lane
added. 668 tests before and after (two standalone purity lanes
merged, two new lanes added); full bridges re-verified green; the
aftermath commit's post-build audit run against the packet.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "inherited from the ch11-P2 row through the sizing split (plan §11.4, recorded at the ch11 ratification): pure projection from l2-pseudocode + ledger + the ratified draft's module-home and admission rows", "discovered": "projection" },
    "provenance": { "anchored": 22, "derived": 11, "new_decision": 0 },
    "rounds": { "review": 4, "doc_refinement": 0, "implementation": 2 },
    "stops": [],
    "detector_misses": [
      {
        "found_at": "approve",
        "what": "arm gate 1 found ten items three internal panel rounds had accepted: four derived rows whose obligations exceeded their anchors (address composition, message wording, symbol-key semantics, config-field placement — all resolved by narrowing to entailed semantics + build freedom), the structural-short-circuit accumulation scope, and five missing sensitivity/enforcement lanes (owner guard, evaluator purity, compile-negative type probes, lane-code fidelity, the plan §2.2 stale mirror)",
        "why_missed": "the internal entailment attack ran INWARD (is the row's pick supported?) but not OUTWARD (does the row oblige MORE than the anchors force?); and the lens-3 sensitivity probe asked what a wrong build keeps green at the runtime level but not at the type/purity/lint level"
      },
      {
        "found_at": "approve",
        "what": "the arm's re-check caught the fold itself minting an inconsistency: the A5 placement freedom contradicted D6's already-pinned branded-intersection type, and the G7 freeze recipe left the history array mutable",
        "why_missed": "a narrowing that GRANTS freedom was not re-checked against the sibling row that already forecloses it — the propagation pass verified the narrowing's mirrors, not its type-level consistency with unchanged rows"
      },
      {
        "found_at": "arm-build-close",
        "what": "the GateConfigResult failure arm admitted an empty findings list (a forged empty failure branded a template with config undefined, all tests green); the G7 freeze discipline ran only on the dedicated purity lanes, not every semantics lane as the acceptance stated; the previous_reviewer_verdict validator lacked the own-__proto__ lane its threshold twin carried; and the approve-basis hash is not reproducible from the build commit (the build record lands between approve and commit by process design)",
        "why_missed": "the R4 'nonempty finding set' was prose-asserted but never TYPE-carried, and no internal lens asked whether the type permitted what the row forbade; the acceptance's 'every semantics-grid lane frozen' was folded as a bullet edit without re-deriving the lane list it bound; the own-property lane inventory was per-validator, not per-rule — the fix-scoped-to-the-finding class across validators; the basis-reproducibility gap is a process-shape question no packet lens owns"
      }
    ],
    "learned": "an adversarial arm attacks entailments in BOTH directions — under-anchored picks AND over-obliging rows; a granted build freedom needs a consistency check against the rows that already pin the shape; and a prose-asserted 'nonempty' that the TYPE permits to be empty is a standing blind class"
  }
}
```
