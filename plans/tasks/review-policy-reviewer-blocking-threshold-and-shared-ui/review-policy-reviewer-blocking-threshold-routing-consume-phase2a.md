---
artifact_type: task
artifact_id: task_review_policy_reviewer_blocking_threshold_routing_consume_phase2a_v1
title: "Review Policy Reviewer Blocking Threshold Routing Consume (Phase 2A)"
status: draft
phase: phase2a
target_files:
  - src/v11/domain/pass/reviewerDecision.ts
  - src/v11/domain/convergence/policyReviewerAggregate.ts
  - src/v11/application/pass/reviewerPassPreparation.ts
  - src/v11/application/pass/passRoutingPreparation.ts
  - src/v11/application/pass/passRoutingPreparationTypes.ts
  - src/v11/application/pass/passRoutingInvocationBuilders.ts
  - src/v11/application/pass/emitPassContextBuilder.ts
  - tests/core/agent/pass.test.ts
  - tests/v11/domain/convergence/policy.test.ts
  - tests/v11/domain/pass/reviewerDecision.test.ts
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

# Task: Review Policy Reviewer Blocking Threshold Routing Consume (Phase 2A)

## Current Codebase Check (2026-04-26)

1. A reviewer post-gate decision ma fix matrixbol dolgozik:
   - blocker marad -> `pass`
   - non-blocking-only -> `convergence`
2. A blocker fogalom reviewer oldalon ma nem configurable thresholdbol jon, hanem hard-coded aggregate logicabol.
3. A document-scope blocker authority ma mar scope-policy normalizalt aggregate-on keresztul fut:
   unqualified `P0/P1` finding strict qualifier nelkul non-blockingga downgrade-olodik, ezt a semantics-et a threshold compare nem veszitheti el.
4. A pass-routing seam ma nem ownershipolja eleg expliciten a reviewer threshold threadeleset a minimalis routing inputtol a reviewer validationig.
5. A `severity_gate_round` gate megkulonbozteti a pre-gate es post-gate koroket; ezt a task nem torolheti el.
6. Az emit-pass orchestration caller ma a teljes `resolved.bubbleConfig` objektumot adja at a routing input buildernek, de a specnek explicit ownershiptel kell rogzitenie, hogy a threshold-threading upstream caller-seamje is ehhez a phase-hez tartozik.

## L0 - Policy

### Goal

Kossuk at a reviewer post-gate routing authorityt az uj canonical reviewer thresholdra ugy, hogy:
1. pre-gate korokben a reviewer findings pass/fix-request baseline valtozatlan maradjon,
2. post-gate korokben a `reviewer_blocking_min_severity` dontse el, hogy egy finding set meg mindig implementer-fele blocking-e,
3. clean post-gate path tovabbra is canonical convergence maradjon,
4. a document-scope qualifier-normalized aggregate maradjon a threshold compare egyetlen inputja,
5. a threshold explicit routing inputkent jusson el a reviewer validationig side-channel nelkul.

### Domain / Control Model Summary

1. Business invariant:
   reviewer oldalon post-gate blocking authority nem fix severity lista, hanem a canonical `review_policy.reviewer_blocking_min_severity`.
2. Control model:
   a reviewer decision a normalized review-policy-bol es a structured findings aggregate-bol egyutt jon; ebben a phase-ben maga a consume authority zarodik, nem a reviewer-facing projection.
3. Read-path rule:
   reviewer gating thresholdot csak normalized review-policy helper vagy explicit atadott normalized field szolgaltathat.
4. Forbidden fallback:
   hard-coded `P0/P1` reviewer blocker rule, implicit `bubbleConfig` reszhalmazbol visszafejtett threshold truth, vagy raw declared severity compare nem maradhat canonical decision source.
5. Allowed resolution path:
   round >= `severity_gate_round` -> scope-policy normalized structured findings aggregate -> highest effective open severity -> compare with normalized `reviewer_blocking_min_severity`.
6. Missing-data rule:
   reviewer threshold hianya a normalized producer miatt `P3`-ra oldodik.
7. Phase boundary:
   - contract closure: inherited from phase1
   - producer closure: predecessor-owned
   - internal execution closure: owned here
   - workflow/orchestration closure: owned here
   - read-model closure: none
   - activation closure: none
   - cleanup/recovery closure: none

### Plan Linkage

1. Parent plan gap closed:
   reviewer threshold consume semantics + routing input/threading seam completeness.
2. Depends on:
   [review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md](/Users/felho/dev/pairflow/plans/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md)
3. Unlocks / impacts successors:
   [review-policy-reviewer-blocking-threshold-reviewer-facing-parity-phase2b.md](/Users/felho/dev/pairflow/plans/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-reviewer-facing-parity-phase2b.md)
4. Task-list impact:
   ez a task nem ownershipolja a reviewer-facing guidance, ontology, runtime reminder vagy docs parity feluleteit; azokat a Phase 2B successor zarja le.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/v11/domain/pass/reviewerDecision.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/reviewerDecision.ts)
   - [src/v11/domain/convergence/policyReviewerAggregate.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyReviewerAggregate.ts)
   - [src/v11/application/pass/reviewerPassPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/pass/reviewerPassPreparation.ts)
   - [src/v11/application/pass/passRoutingPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passRoutingPreparation.ts)
   - [src/v11/application/pass/passRoutingPreparationTypes.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passRoutingPreparationTypes.ts)
   - [src/v11/application/pass/passRoutingInvocationBuilders.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passRoutingInvocationBuilders.ts)
   - [src/v11/application/pass/emitPassContextBuilder.ts](/Users/felho/dev/pairflow/src/v11/application/pass/emitPassContextBuilder.ts)
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
   `validateReviewerPassGate`, `evaluateReviewerFindingsAggregate`, `prepareReviewerPass`, `buildPassRoutingInput`, `preparePassRouting`, `buildEmitPassContext`.
2. Actual touched scope:
   `internal_execution + workflow_orchestration consumer alignment`.
3. Mutation entrypoints in scope:
   nincs uj persisted config mutation; csak command validation/routing authority es explicit input-threading valtozik.
4. Hidden scope ruled out:
   reviewer-facing prompt/guidance surfaces, canonical ontology markdown, generated runtime reminder, operator docs, UI mutate API, meta-review gate routing.
5. Why the declared task shape matches reality:
   a bounded slice ugyanannak a routing authority lancnak a consume oldalat zarja le a normalized review-policy outputtol a reviewer validationig, reviewer-facing projection ownership nelkul.

### Authority Boundary Map

1. Authority producer:
   phase1-ben normalizalt `review_policy.reviewer_blocking_min_severity`.
2. Persisted authority:
   `.pairflow/bubbles/<id>/bubble.toml` `review_policy` blokk, predecessor ownershiptal.
3. In-scope consumers:
   reviewer pass validation, scope-policy aggregate, pass-routing input builder, emit-pass upstream routing caller, reviewer pass routing prep.
4. Explicit out-of-scope consumers:
   reviewer command guidance, startup/resume/tmux prompt projection, reviewer ontology/runtime reminder, docs/spec parity, meta-review auto-rework consume, cleanup/recovery flows.
5. Export surfaces closed in this phase:
   nem; a reviewer-facing projection/parity surfaces tudatosan Phase 2B ownershipben maradnak.

### Complexity Risk Triage

1. `risk_score`: `4`
2. Axis breakdown:
   - `authority_risk = 1`
   - `surface_spread = 1`
   - `identity_join_risk = 0`
   - `activation_coupling = 1`
   - `prerequisite_risk = 1`
   - `acceptance_multiplicity = 0`
3. Split decision:
   ez a bounded slice a Phase 2 consume-authority felere szukitheto; a reviewer-facing parity kulon successor ownership.
4. Authority/source-of-truth note:
   a canonical authority mar letezik Phase 1 utan; ez a task csak consume authority alignmentet zar, uj authority producer nelkul.

### Closure-Budget Triage

1. Touched closures:
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
2. Intentionally collapsed closures:
   - `internal_execution_consumers` + `workflow_orchestration_consumers`
3. Why this collapse is safe:
   ugyanaz a bounded routing codepath ownershipolja az aggregate consume-ot, a reviewer validationt es az explicit threshold-threading seamet.
4. Explicitly deferred closures:
   - `authority_producer`
   - `persisted_authority_or_schema`
   - `read_model_consumers`
   - `cleanup_recovery_consumers`

### Bounded-Task-Shape Classification

1. Primary shape:
   `consumer_family_alignment`
2. Secondary shape:
   `N/A`

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Entry | Contract Delta | Required Behavior | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/domain/convergence/policyReviewerAggregate.ts` | `evaluateReviewerFindingsAggregate(...)` | scope-policy normalized effective severity | document scope qualifier downgrade a threshold compare elott tortenjen; a reviewer threshold normalized effective severityt fogyasszon, ne raw declared severityt | P1 | T1,T2,T3,T5 |
| CS2 | `src/v11/domain/pass/reviewerDecision.ts` | `validateReviewerPassGate(...)` | post-gate blocker authority configurable | highest effective open severity under scope policy meet-or-exceed reviewer threshold eseten reviewer `pass/fix_request` maradjon engedett; threshold alatt convergence kotelezo; clean post-gate path convergence maradjon | P1 | T1,T2,T3,T5,T7 |
| CS3 | `src/v11/application/pass/reviewerPassPreparation.ts` | reviewer gate prep | normalized reviewer threshold receive/use | reviewer validation ne hard-coded blocker definiciot hasznaljon | P1 | T1,T2,T3,T4,T6 |
| CS4 | `src/v11/application/pass/passRoutingInvocationBuilders.ts` | `buildPassRoutingInput(...)` | threshold seam completion | a reviewer threshold a minimalis routing input seamen is explicit legyen; a builder nem maradhat phase1 elotti bubbleConfig-reszhalmazon | P1 | T6 |
| CS5 | `src/v11/application/pass/passRoutingPreparation.ts` + `passRoutingPreparationTypes.ts` | routing input threading | threshold authority atadasa | review-policy consume explicit legyen, ne implicit import side-channel | P1 | T6 |
| CS6 | `src/v11/application/pass/emitPassContextBuilder.ts` | `buildEmitPassContext(...)` | upstream caller seam parity | az emit-pass orchestration caller a normalized bubbleConfigbol ugyanazt az explicit reviewer thresholdot adja tovabb a routing input buildernek; a seam nem maradhat csak teszt-szintu implicitseg | P1 | T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Reviewer post-gate blocker rule | fix `P0/P1` | configurable reviewer threshold | normalized reviewer threshold | none | intentional behavior change |
| Pass routing input seam | partial bubbleConfig subset | explicit reviewer threshold threading | `reviewer_blocking_min_severity` consume seam | none | intentional internal contract tightening |

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
5. Threshold threading explicit:
   a reviewer threshold a routing input seamen es a reviewer prep call chainen is explicit adatkent jelenik meg; implicit side-channel truth nem maradhat.

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
2. `allowed_resolution_paths`:
   - normalized reviewer threshold -> scope-policy normalized reviewer aggregate -> threshold compare -> pass vagy convergence routing
3. `forbidden_regression_interpretations`:
   - a reviewer threshold-driven routing nem downgrade-olhatja a clean post-gate convergence authorityt
   - a threshold compare nem valthat vissza raw severity vagy fix `P0/P1` authorityra
4. `replacement_proof_required_if_removed`:
   ha a routing input seam vagy a threshold-atadas barmely explicit pontja kikerul, parity proof kell arra, hogy az uj ut tovabbra is ugyanazt a canonical authorityt fogyasztja.

### 5) Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - a reviewer round/post-gate allapot helyesen resolved legyen
   - a structured findings aggregate valid es scope-policy normalized legyen
   - a normalized reviewer threshold elerheto legyen a routing prep inputban
2. Side effects forbidden before those validations pass:
   - nincs reviewer `pass` acceptance threshold-alatti post-gate finding setre
   - nincs implicit legacy blocker policy consume threshold hianyaban
3. Invalid/precondition-failure behavior:
   - invalid findings payload vagy tiltott reviewer post-gate path -> explicit reject, state mutation nelkul
4. Coordination primitives in scope:
   - `N/A`; nincs uj lock/idempotency/serialization ownership.
5. Pure-by-default side-effect rule:
   reviewer decision, routing prep es aggregate consume logika pure marad; csak a command acceptance surface dobhat hibat.
6. Dependency-failure fallback:
   hianyzo explicit threshold threading nem valthat ki implicit hard-coded `P0/P1` fallbackot; fail-closed refinement kell.

### 6) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | reviewer threshold `P3` keeps P3-only findings on reviewer pass path post-gate | round >= gate, reviewer threshold=`P3`, only `P3` findings | reviewer pass validation fut | `pass/fix_request` engedett, convergence nem kotelezo |
| T2 | reviewer threshold `P2` converges P3-only findings | round >= gate, threshold=`P2`, only `P3` findings | reviewer pass validation fut | reviewer `pass` tiltott, convergence required |
| T3 | reviewer threshold `P2` still blocks P2 findings | round >= gate, threshold=`P2`, highest=`P2` | validation fut | reviewer `pass/fix_request` engedett |
| T4 | pre-gate advisory findings unchanged | round < gate, threshold akarmi | reviewer findings pass fut | legacy pre-gate fix-request behavior marad |
| T5 | document-scope qualifier downgrade preserved before threshold compare | round >= gate, review artifact=`document`, declared `P0/P1` finding strict qualifier nelkul | reviewer aggregate + pass validation fut | a finding non-blocking effective severityre downgrade-olodik; routing ezt a normalized erteket fogyasztja |
| T6 | threshold explicit routing seamre threadelve | updated review policy runtime view | `buildEmitPassContext` + `buildPassRoutingInput` + `preparePassRouting` + reviewer prep fut | a reviewer threshold explicit inputkent eljut a reviewer pass validationig |
| T7 | clean post-gate path remains convergence | round >= gate, threshold akarmi, nincs finding | reviewer post-gate command validation/routing fut | reviewer `pass --no-findings` tiltott marad, es a canonical clean path explicit convergence |

### 7) Review Control

Reviewer akkor adhat `IMPLEMENTABLE` allapotot, ha:
1. a post-gate reviewer blocker authority egyertelmuen a canonical reviewer thresholdhoz kotott,
2. a task nem nyitja ujra a dual-threshold producer/mutation/read-model foundationt,
3. a pre-gate es clean-path baseline preserved behavior explicit marad,
4. a threshold routing seam a minimalis routing input buildertol a reviewer validationig explicit,
5. a document-scope strict qualifier downgrade es a threshold compare kapcsolata explicit source anchorral zarva van.

## L2 - Implementation Notes (Optional)

1. A threshold compare helper erdemes a meta-review severity orderinggel konzisztens maradjon, de anelkul, hogy a reviewer runtime a meta-review gate resolverre dependalna.
2. A routing input threadelest erdemes a legkisebb stabil input seamre lehorgonyozni, ne kesobbi projection surface-re.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a post-gate reviewer semantics teljesen threshold-driven,
2. T1-T7 teljesen lefedik a viselkedesvaltozast, a scope-policy normalized threshold compare-t es a threshold threading seamet,
3. nincs hard-coded `P0/P1` authority maradek a reviewer routing consume lane-ben.

## Assumptions

1. A reviewer threshold compare ugyanazzal a severity orderinggel mukodik, mint a tobbi review-policy threshold logika.
2. A reviewer-facing guidance, ontology es docs parity minimuma kulon successor ownershipben marad.

## Hardening Backlog

1. `later-hardening`: tovabbi diagnostics arra, hogy a reviewer threshold miatt lett `pass` vs `convergence`, kulon taskban johet.
2. `later-hardening`: reviewer-facing threshold peldatar es operator onboarding copy a Phase 2B vagy kesobbi hardening lane resze.
