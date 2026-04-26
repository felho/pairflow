---
artifact_type: task
artifact_id: task_review_policy_reviewer_blocking_threshold_reviewer_routing_phase2_v1
title: "Review Policy Reviewer Blocking Threshold Reviewer Routing + Guidance (Phase 2)"
status: draft
phase: phase2
target_files:
  - src/v11/domain/pass/reviewerDecision.ts
  - src/v11/domain/convergence/policyReviewerAggregate.ts
  - src/v11/application/pass/reviewerPassPreparation.ts
  - src/v11/application/pass/passRoutingPreparation.ts
  - src/v11/application/pass/passRoutingPreparationTypes.ts
  - src/v11/application/pass/passRoutingInvocationBuilders.ts
  - src/v11/application/actorProtocol/roleDescriptorRegistry.ts
  - src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts
  - src/v11/shared/reviewer/reviewerCommandGateGuidance.ts
  - src/v11/shared/reviewer/reviewerSeverityOntology.ts
  - src/v11/shared/reviewer/reviewerSeverityOntology.generated.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - docs/reviewer-severity-ontology.md
  - docs/pairflow-initial-design.md
  - README.md
  - tests/core/agent/pass.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/reviewerCommandGateGuidance.test.ts
  - tests/core/runtime/reviewerSeverityOntology.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/v11/domain/pass/reviewerDecision.test.ts
  - tests/v11/domain/convergence/policy.test.ts
  - tests/v11/application/pass/reviewerPassPreparation.test.ts
  - tests/v11/application/pass/passRoutingPreparation.test.ts
  - tests/v11/application/pass/passRoutingInvocationBuilders.test.ts
  - tests/v11/application/pass/emitPassContextBuilder.test.ts
prd_ref: null
plan_ref: plans/review-policy-reviewer-blocking-threshold-and-shared-ui-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Review Policy Reviewer Blocking Threshold Reviewer Routing + Guidance (Phase 2)

## Current Codebase Check (2026-04-26)

1. A reviewer post-gate decision ma fix matrixbol dolgozik:
   - blocker marad -> `pass`
   - non-blocking-only -> `convergence`
2. A blocker fogalom reviewer oldalon ma nem configurable thresholdbol jon, hanem hard-coded aggregate logicabol.
3. A reviewer guidance/prompt tobb helyen explicit `P2/P3 advisory-only` szabalyokat tanit.
4. A canonical reviewer ontology `Decision Mapping` szakasza es az abbol generalt runtime reminder meg mindig fix `P0/P1` blocker vs `P2/P3` advisory nyelvet hordoz a post-gate reviewer lane-ben.
5. A `severity_gate_round` gate megkulonbozteti a pre-gate es post-gate koroket; ezt a task nem torolheti el.
6. A document-scope blocker authority ma mar scope-policy normalizalt aggregate-on keresztul fut:
   unqualified `P0/P1` finding strict qualifier nelkul non-blockingga downgrade-olodik, ezt a semantics-et a threshold compare nem veszitheti el.

## L0 - Policy

### Goal

Kossuk at a reviewer post-gate blocking dontest az uj canonical reviewer thresholdra ugy, hogy:
1. pre-gate korokben a reviewer findings pass/fix-request baseline valtozatlan maradjon,
2. post-gate korokben a `reviewer_blocking_min_severity` dontse el, hogy egy finding set meg mindig implementer-fele blocking-e,
3. clean post-gate path tovabbra is canonical convergence maradjon,
4. a reviewer guidance/prompt/docs ugyanazt a threshold-driven szemantikat tanitsak,
5. a default reviewer threshold `P3` tudatos viselkedesvaltozaskent legyen dokumentalva.

### Domain / Control Model Summary

1. Business invariant:
   reviewer oldalon post-gate blocking authority nem fix severity lista, hanem a canonical `review_policy.reviewer_blocking_min_severity`.
2. Control model:
   a reviewer decision a normalized review-policy-bol es a structured findings aggregate-bol egyutt jon; minden startup/resume/runtime prompt csak ennek leirasat tukrozi.
3. Read-path rule:
   reviewer gating thresholdot csak normalized review-policy helper vagy explicit atadott normalized field szolgaltathat.
4. Forbidden fallback:
   hard-coded `P0/P1` reviewer blocker rule, `P2/P3 advisory-only` prompt matrix, vagy summary-only severity kovetkeztetes nem maradhat canonical decision source.
5. Allowed resolution path:
   round >= `severity_gate_round` -> scope-policy normalized structured findings aggregate -> highest effective open severity -> compare with normalized `reviewer_blocking_min_severity`.
6. Missing-data rule:
   reviewer threshold hianya a normalized producer miatt `P3`-ra oldodik.
7. Phase boundary:
   - contract closure: inherited from phase1
   - producer closure: predecessor-owned
   - internal execution closure: owned here
   - workflow/orchestration closure: owned here
   - read-model closure: owned here, de csak reviewer-facing guidance/docs/runtime reminder szintjen
   - activation closure: none
   - cleanup/recovery closure: none

### Plan Linkage

1. Parent plan gap closed:
   reviewer workflow consume alignment az explicit dual-threshold policyre.
2. Depends on:
   [review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md](/Users/felho/dev/pairflow/plans/tasks/review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md)
3. Unlocks / impacts successors:
   kulon successor nem kotelezo; ez a reviewer lane closure.
4. Task-list impact:
   a plan jelenlegi nyitott tasklistajat nem spliteli tovabb, de explicit ownership ala vonja a reviewer ontology/runtime reminder parityt is.
5. Inherited validation / exit expectation:
   a phase2 csak akkor zarhato le, ha a runtime routing, a reviewer pane guidance es a canonical reviewer ontology ugyanazt a threshold-driven post-gate jelentest hordozza.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/v11/domain/pass/reviewerDecision.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/reviewerDecision.ts)
   - [src/v11/domain/convergence/policyReviewerAggregate.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyReviewerAggregate.ts)
   - [src/v11/application/pass/reviewerPassPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/pass/reviewerPassPreparation.ts)
   - [src/v11/application/pass/passRoutingPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passRoutingPreparation.ts)
   - [src/v11/shared/reviewer/reviewerCommandGateGuidance.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerCommandGateGuidance.ts)
   - [src/v11/shared/reviewer/reviewerSeverityOntology.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerSeverityOntology.ts)
   - [src/v11/application/pass/passRoutingInvocationBuilders.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passRoutingInvocationBuilders.ts)
   - [src/v11/application/actorProtocol/roleDescriptorRegistry.ts](/Users/felho/dev/pairflow/src/v11/application/actorProtocol/roleDescriptorRegistry.ts)
   - [src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts)
   - [docs/reviewer-severity-ontology.md](/Users/felho/dev/pairflow/docs/reviewer-severity-ontology.md)
   - [scripts/generate-reviewer-severity-ontology.mjs](/Users/felho/dev/pairflow/scripts/generate-reviewer-severity-ontology.mjs)
   - [package.json](/Users/felho/dev/pairflow/package.json)
   - [docs/pairflow-initial-design.md](/Users/felho/dev/pairflow/docs/pairflow-initial-design.md)
2. Canonical elements:
   - `severity_gate_round` tovabbra is post-gate switch
   - `review_policy.reviewer_blocking_min_severity` a post-gate blocker threshold
   - clean reviewer path post-gate tovabbra is convergence
3. Guard elements:
   - document scope qualifier semantics (`timing=required-now`, `layer=L1`) preserved
   - document-scope `P0/P1` strict-qualifier downgrade tovabbra is threshold compare elotti aggregate-normalization marad
   - malformed findings payload hard reject preserved
4. Compat elements:
   - round 1 reviewer emit semantics
   - implementer pass semantics
5. Forbidden reinterpretations:
   - az uj reviewer threshold nem jelentheti azt, hogy pre-gate korokben advisory findingot nem lehet fix-requesttel visszakuldeni
   - a clean post-gate path nem valhat ujra reviewer `pass --no-findings` authorityva
   - a threshold compare nem epulhet raw declared severityre ott, ahol a canonical scope-policy aggregate mar effective/non-blocking normalizalast vegez

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `validateReviewerPassGate`, `evaluateReviewerFindingsAggregate`, `prepareReviewerPass`, `buildPassRoutingInput`, `preparePassRouting`, `buildReviewerCanonicalCommandGateLines`, `buildReviewerRoundCommandGateProjection`, `buildReviewerSeverityOntologyReminder`, reviewer startup concern registry, reviewer resume kickoff builder, tmux reviewer delivery path, valamint az ontology/runtime reminder parity tesztek.
2. Actual touched scope:
   `internal_execution + workflow/orchestration + reviewer read-model/runtime-guidance consumer alignment`.
3. Mutation entrypoints in scope:
   nincs uj persisted config mutation; csak command validation/routing authority valtozik.
4. Hidden scope ruled out:
   config parser/render, UI mutate API, remote review-policy write path, meta-review gate routing, kulon cleanup/recovery flow; reviewer startup/resume prompt consumerok nem ruled-out, hanem explicit in-scope consumerok.
5. Branch inventory note:
   pre-gate vs post-gate, clean vs findings, threshold-meet vs threshold-alatti, document-scope qualifier-preserved utak explicit L1 ownershipben maradnak; nincs uj retry/rollback branch.
6. Why the declared task shape matches reality:
   a producer closure mar lezarult az elso taskban; itt a reviewer consume-family alignment mellett ugyanennek a lane-nek a canonical docs/runtime reminder parityja zarodik le, producer vagy mutation ownership visszahuzasa nelkul.

### Authority Boundary Map

1. Authority producer:
   phase1-ben normalizalt `review_policy.reviewer_blocking_min_severity`.
2. Persisted authority:
   `.pairflow/bubbles/<id>/bubble.toml` `review_policy` blokk, predecessor ownershiptal.
3. In-scope consumers:
   reviewer pass validation, pass-routing input builder, reviewer pass routing prep, reviewer startup concern registry, reviewer resume kickoff message, reviewer command guidance, tmux reviewer delivery message, reviewer severity ontology es a belole generalt runtime reminder.
4. Explicit out-of-scope consumers:
   review-policy mutation surfaces, status/list/detail operator projections, meta-review auto-rework consume, cleanup/recovery flows.
5. Export surfaces closed in this phase:
   igen; reviewer-facing command guidance/doc/runtime reminder surfaces ezen a phase-en belul zarodnak.

### Complexity Risk Triage

1. `risk_score`: `5`
2. Axis breakdown:
   - `authority_risk = 1`
   - `surface_spread = 2`
   - `identity_join_risk = 0`
   - `activation_coupling = 1`
   - `prerequisite_risk = 1`
   - `acceptance_multiplicity = 0`
3. Split decision:
   marad kulon Phase 2 consumer-alignment task; a reviewer lane consume es docs/runtime parity meg mindig nem huzhato vissza Phase 1 producer ownershipbe.
4. Authority/source-of-truth note:
   a canonical authority mar letezik Phase 1 utan; ez a task csak consume es parity alignmentet zarhat, uj authority producer nelkul.

### Closure-Budget Triage

1. Touched closures:
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `read_model_consumers`
2. Intentionally collapsed closures:
   - `internal_execution_consumers` + `workflow_orchestration_consumers`
   - `read_model_consumers` + canonical reviewer docs/runtime reminder parity
3. Why this collapse is safe:
   ugyanaz a reviewer lane consume surface ownershipolja a post-gate routing decisiont, a threshold threading seamet, a reviewer command guidance-ot, a startup/resume prompt projectiont es az ontologybol epitett runtime reminder szoveget; nincs kulon persisted schema vagy activation cutover.
4. Explicitly deferred closures:
   - `authority_producer`
   - `persisted_authority_or_schema`
   - `cleanup_recovery_consumers`
5. No-split proof:
   a task blast radiusa csak a reviewer consume-family es ugyanennek a lane-nek a canonical messaging/doc parityja; nem kever producer, mutation vagy mas consume-family activation closure-rel.

### Bounded-Task-Shape Classification

1. Primary shape:
   `consumer_family_alignment`
2. Secondary shape:
   `activation_or_read_model`
3. Why the mix is safe:
   a secondary shape csak reviewer-facing guidance/docs/runtime reminder projectionre terjed ki ugyanazon canonical threshold consume menten; nincs uj side-effect ordering, lock vagy cleanup ownership.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Entry | Contract Delta | Required Behavior | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/domain/convergence/policyReviewerAggregate.ts` | `evaluateReviewerFindingsAggregate(...)` | scope-policy normalized effective severity | document scope qualifier downgrade a threshold compare elott tortenjen; a reviewer threshold normalized effective severityt fogyasszon, ne raw declared severityt | P1 | T1,T2,T3,T4,T5 |
| CS2 | `src/v11/domain/pass/reviewerDecision.ts` | `validateReviewerPassGate(...)` | post-gate blocker authority configurable | highest effective open severity under scope policy meet-or-exceed reviewer threshold eseten reviewer `pass/fix_request` maradjon engedett; threshold alatt convergence kotelezo | P1 | T1,T2,T3,T4,T5 |
| CS3 | `src/v11/application/pass/reviewerPassPreparation.ts` | reviewer gate prep | normalized reviewer threshold receive/use | reviewer validation ne hard-coded blocker definiciot hasznaljon | P1 | T1,T2,T3,T4,T5 |
| CS4 | `src/v11/application/pass/passRoutingPreparation.ts` + types | routing input threading | threshold authority atadasa | review-policy consume explicit legyen, ne implicit import side-channel | P1 | T6 |
| CS5 | `src/v11/application/pass/passRoutingInvocationBuilders.ts` | `buildPassRoutingInput(...)` | threshold seam completion | a reviewer threshold a minimalis routing input seamen is explicit legyen; a builder nem maradhat phase1 elotti bubbleConfig-reszhalmazon | P1 | T6 |
| CS6 | `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts` | guidance matrix | threshold-driven reviewer text | `P2/P3 advisory-only` fix szoveg helyett configured threshold semantics | P1 | T7 |
| CS7 | `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`, `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | startup/resume/runtime prompt projection | reviewer-facing prompt parity | a startup concern registry, a resume kickoff es a tmux reviewer pane ugyanazt a threshold policy-t vigye | P1 | T8 |
| CS8 | `src/v11/shared/reviewer/reviewerSeverityOntology.ts`, `src/v11/shared/reviewer/reviewerSeverityOntology.generated.ts`, `docs/reviewer-severity-ontology.md`, `scripts/generate-reviewer-severity-ontology.mjs`, `package.json` | ontology + generated reminder | canonical ontology/runtime reminder parity | a `Decision Mapping` es a runtime reminder embed ugyanazt a threshold-driven reviewer post-gate semantics-et hordozza, mikozben a severity definiciok closed jelentese nem lazul el | P1 | T9,T10 |
| CS9 | `docs/pairflow-initial-design.md`, `README.md` | spec/operator docs | protocol parity | a reviewer convergence szabaly explicit threshold-driven legyen | P2 | T11 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Reviewer post-gate blocker rule | fix `P0/P1` | configurable reviewer threshold | normalized reviewer threshold | none | intentional behavior change |
| Pass routing input seam | partial bubbleConfig subset | explicit reviewer threshold threading | `reviewer_blocking_min_severity` consume seam | none | intentional internal contract tightening |
| Reviewer guidance | `P2/P3 advisory-only` text | threshold-driven text | threshold semantics + clean path | examples by threshold | intentional text update |
| Reviewer ontology/runtime reminder | fix blocker/advisory decision mapping | threshold-driven decision mapping, preserved severity definitions | canonical reviewer ontology parity + regenerated runtime embed | extra examples | intentional docs/codegen update |

Normative rules:
1. Pre-gate (`round < severity_gate_round`) reviewer findings path unchanged:
   findingskel tovabbra is `pass/fix_request`.
2. Post-gate clean path unchanged:
   clean review -> canonical convergence.
3. Post-gate findings path:
   - if highest effective open severity under scope policy meets/exceeds `reviewer_blocking_min_severity` -> reviewer `pass/fix_request` engedett
   - if highest effective open severity under scope policy threshold alatt marad -> reviewer `pass` tiltott, convergence required
4. Document scope qualifier semantics preserved:
   unqualified document `P0/P1` finding tovabbra sem valik automatikus blockerre; elobb canonical non-blocking effective severityre downgrade-olodik, es csak ezutan ertekelheto threshold ellen.
5. Codegen refresh contract preserved:
   ha a canonical reviewer ontology markdown valtozik, a generated runtime reminder kotelezoen ugyanebbol a source-bol frissul.

### 3) Error Contract

| Trigger | Behavior | Reason Code / Surface | Priority |
|---|---|---|---|
| post-gate pass on threshold alatti findings | reject | existing reviewer post-gate invalid path, de threshold-aware message-gel | P1 |
| post-gate `--no-findings` reviewer pass | reject | existing clean-post-gate reject surface preserved | P1 |
| malformed findings payload | reject | existing `FINDINGS_PAYLOAD_INVALID` preserved | P1 |

### 4) Baseline Preservation

1. `must_preserve_behaviors`:
   - pre-gate reviewer findingskel tovabbra is canonical `pass/fix_request` flowban marad
   - clean post-gate reviewer path tovabbra is canonical convergence
   - document-scope strict qualifier semantics (`timing=required-now` + `layer=L1`) preserved marad
   - reviewer severity ontology `P0/P1/P2/P3` definicioi nem irhatok at pusztan a routing threshold valtozasa miatt
   - reviewer startup/resume/tmux prompt consumerok ugyanannak a canonical routing igazsagnak a projectionjei maradnak
2. `allowed_resolution_paths`:
   - normalized reviewer threshold -> scope-policy normalized reviewer aggregate -> threshold compare -> pass vagy convergence routing
   - canonical reviewer ontology markdown -> generated runtime reminder -> tmux reviewer delivery message
3. `forbidden_regression_interpretations`:
   - a reviewer threshold-driven routing nem downgrade-olhatja a clean post-gate convergence authorityt
   - a docs/guidance nem tanithat tovabb fix `P2/P3 advisory-only` szabalyokat, ha a runtime threshold ettol elter
   - a severity ontology frissites nem irhatja at hallgatolag a `P3` severity kategoriat blocker-level jelentesevre
4. `replacement_proof_required_if_removed`:
   ha a generated runtime reminder embed vagy a tmux reviewer delivery reminder path atalakul, explicit parity proof kell arra, hogy ugyanazt a canonical ontologybol szarmazo threshold-driven uzenetet kapja a reviewer.

### 5) Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - a reviewer round/post-gate allapot helyesen resolved legyen
   - a structured findings aggregate valid es scope-policy normalized legyen
   - a normalized reviewer threshold elerheto legyen a routing prep inputban
2. Side effects forbidden before those validations pass:
   - nincs reviewer `pass` acceptance threshold-alatti post-gate finding setre
   - nincs clean/non-blocking post-gate guidance, amely a canonical convergence helyett `pass`-t sugall
   - nincs startup/resume/runtime prompt projection, amely a canonical reviewer thresholdtol eltero legacy fix blocker matrixot tanit
3. Invalid/precondition-failure behavior:
   - invalid findings payload vagy tiltott reviewer post-gate path -> explicit reject, state mutation nelkul
4. Coordination primitives in scope:
   - `N/A`; nincs uj lock/idempotency/serialization ownership.
5. Pure-by-default side-effect rule:
   reviewer decision, routing prep es guidance builder logika pure marad; csak a command acceptance surface dobhat hibat.
6. Dependency-failure fallback:
   hianyzo explicit threshold threading nem valthat ki implicit hard-coded `P0/P1` fallbackot; fail-closed refinement kell.

### 6) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | reviewer threshold `P3` blocks P3-only findings post-gate | round >= gate, reviewer threshold=`P3`, only `P3` findings | reviewer pass validation fut | `pass/fix_request` engedett, convergence nem kotelezo |
| T2 | reviewer threshold `P2` converges P3-only findings | round >= gate, threshold=`P2`, only `P3` findings | reviewer pass validation fut | reviewer `pass` tiltott, convergence required |
| T3 | reviewer threshold `P2` still blocks P2 findings | round >= gate, threshold=`P2`, highest=`P2` | validation fut | reviewer `pass/fix_request` engedett |
| T4 | pre-gate advisory findings unchanged | round < gate, threshold akarmi | reviewer findings pass fut | legacy pre-gate fix-request behavior marad |
| T5 | document-scope qualifier downgrade preserved before threshold compare | round >= gate, review artifact=`document`, declared `P0/P1` finding strict qualifier nelkul | reviewer aggregate + pass validation fut | a finding non-blocking effective severityre downgrade-olodik; routing ezt a normalized erteket fogyasztja |
| T6 | threshold explicit routing seamre threadelve | updated review policy runtime view | `buildPassRoutingInput` + `preparePassRouting` fut | a reviewer threshold explicit inputkent eljut a reviewer pass validationig |
| T7 | reviewer command guidance text threshold-driven | threshold-aware runtime context | command gate guidance build fut | nincs fix `P2/P3 advisory-only` authority; threshold policy explicit |
| T8 | startup/resume/tmux prompt parity | reviewer active startup vagy resume context | role descriptor registry, resume kickoff es tmux delivery build fut | minden reviewer-facing prompt ugyanazt a threshold-driven routing igazsagot projekttalja |
| T9 | reviewer ontology decision mapping parity | canonical reviewer ontology updated | codegen/runtime reminder refresh fut | a canonical `Decision Mapping` threshold-driven, de a severity definiciok valtozatlanok |
| T10 | generated runtime reminder parity | updated ontology markdown | `buildReviewerSeverityOntologyReminder` fut | a beagyazott reminder ugyanarra a canonical ontology source-ra mutat es nem stale |
| T11 | docs/spec parity | implementation merged | docs review | initial design, README es reviewer ontology ugyanazt a threshold-driven reviewer semantics-et irja le |

### 7) Review Control

Reviewer akkor adhat `IMPLEMENTABLE` allapotot, ha:
1. a post-gate reviewer blocker authority egyertelmuen a canonical reviewer thresholdhoz kotott,
2. a task nem nyitja ujra a dual-threshold producer/mutation/read-model foundationt,
3. a pre-gate es clean-path baseline preserved behavior explicit marad,
4. a docs/guidance/ontology ugyanazt a semantics-et tukrozik, mint a runtime,
5. a threshold routing seam a pass-routing input buildertol a reviewer-facing prompt consumerokig explicit.
6. a document-scope strict qualifier downgrade es a threshold compare kapcsolata explicit source anchorral zarva van.

## L2 - Implementation Notes (Optional)

1. A threshold compare helper erdemes a meta-review severity orderinggel konzisztens maradjon, de anelkul, hogy a reviewer runtime a meta-review gate resolverre dependalna.
2. A guidanceben erdemes peldamondattal illusztralni:
   `configured reviewer_blocking_min_severity = P2` eseten `P3` mar advisory-only.
3. Ha a canonical reviewer ontology markdown valtozik, futtatni kell a reviewer severity ontology codegen refresh-t is, hogy a generated embed ne stale allapotban maradjon.
4. A resume/startup prompt consumerok frissitese ugyanazt a reviewer command gate tokenkeszletet kell hasznalja, mint a tmux delivery guidance.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a post-gate reviewer semantics teljesen threshold-driven,
2. T1-T11 teljesen lefedik a viselkedesvaltozast, a scope-policy normalized threshold compare-t, a threshold threading seamet es a docs/runtime reminder parityt,
3. nincs hard-coded `P2/P3 advisory-only` authority maradek a reviewer lane-ben.

## Assumptions

1. A reviewer threshold compare ugyanazzal a severity orderinggel mukodik, mint a tobbi review-policy threshold logika.
2. A required-now docs parity minimuma:
   `docs/reviewer-severity-ontology.md`, `docs/pairflow-initial-design.md`, `README.md`; kulon rollout doc most nem kell.

## Hardening Backlog

1. `later-hardening`: threshold-specifikus reviewer guidance peldatar bovitese csak akkor kell, ha a default `P3` utan kulon operator onboarding gap marad.
2. `later-hardening`: tovabbi dedicated diagnostics arra, hogy a reviewer pane-ben mely threshold miatt lett `pass` vs `convergence`, kulon taskban johet.
