---
artifact_type: task
artifact_id: task_review_policy_reviewer_blocking_threshold_reviewer_facing_parity_phase2b_v1
title: "Review Policy Reviewer Blocking Threshold Reviewer-Facing Parity (Phase 2B)"
status: draft
phase: phase2b
target_files:
  - src/v11/shared/reviewer/reviewerCommandGateGuidance.ts
  - src/v11/shared/reviewer/reviewerSeverityOntology.ts
  - src/v11/shared/reviewer/reviewerSeverityOntology.generated.ts
  - src/v11/application/actorProtocol/roleDescriptorRegistry.ts
  - src/v11/application/start/startCommandContext.ts
  - src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - docs/reviewer-severity-ontology.md
  - docs/pairflow-initial-design.md
  - README.md
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/reviewerCommandGateGuidance.test.ts
  - tests/core/runtime/reviewerSeverityOntology.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/v11/application/start/startCommandResumeKickoffMessageBuilders.test.ts
prd_ref: null
plan_ref: plans/review-policy-reviewer-blocking-threshold-and-shared-ui-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Review Policy Reviewer Blocking Threshold Reviewer-Facing Parity (Phase 2B)

## Current Codebase Check (2026-04-26)

1. A reviewer guidance/prompt tobb helyen explicit `P2/P3 advisory-only` szabalyokat tanit.
2. A canonical reviewer ontology `Decision Mapping` szakasza es az abbol generalt runtime reminder meg mindig fix `P0/P1` blocker vs `P2/P3` advisory nyelvet hordoz a post-gate reviewer lane-ben.
3. A reviewer startup/resume/tmux prompt surfaces ugyanabból a reviewer-facing guidance csaladbol projekttalnak, ezert mixed-truth kockazat keletkezik, ha csak egy reszuk frissul.
4. A Phase 2A utan a routing authority mar explicit threshold consume truthkent rendelkezesre all; ebben a phase-ben ennek reviewer-facing projection/parity alignmentje zarodik.

## L0 - Policy

### Goal

Vigyük at a mar lezart reviewer threshold authorityt minden reviewer-facing projection surface-re ugy, hogy:
1. a reviewer guidance/prompt/docs ugyanazt a threshold-driven szemantikat tanitsak, mint a runtime routing authority,
2. a canonical reviewer severity ontology `P0/P1/P2/P3` jelentese ne drifteljen,
3. a generated runtime reminder a canonical markdown source-szal paritasban maradjon,
4. a startup/resume/tmux/doc surfaces ugyanazt a closed jelentest hordozzak,
5. a default reviewer threshold `P3` explicit baseline policy-beallitaskent legyen dokumentalva: a default alatt a `P3`-only post-gate findings maradhatnak reviewer-blockingek, de ez nem irhatja at a `P3` severity ontology-jelenteset.

### Domain / Control Model Summary

1. Business invariant:
   reviewer oldalon a reviewer-facing projection surfaces csak a mar lezart canonical `review_policy.reviewer_blocking_min_severity` authorityt projekttalhatjak; nem hozhatnak letre sajat routing truth-ot.
2. Control model:
   a Phase 2A altal lezart reviewer consume authority a canonical truth; a startup/resume/runtime prompts, ontology reminder es operator docs csak ennek projectionjei.
3. Read-path rule:
   reviewer-facing szoveg csak explicit source-anchorolt authoritybol projekttalhat; embedded reminder, prompt copy vagy docs parafrazis nem lehet uj canonical truth.
4. Forbidden fallback:
   fix `P2/P3 advisory-only` prompt matrix, fix `P0/P1` blocker/advisory decision mapping, vagy stale generated reminder nem maradhat reviewer-facing authoritykent.
5. Allowed resolution path:
   - Phase 2A threshold-driven routing truth -> reviewer command guidance -> startup/resume/tmux/docs projection
   - canonical reviewer ontology markdown -> generated runtime reminder -> policy snapshot / delivery projection
6. Missing-data rule:
   ha a reviewer-facing projection nem tudja egyertelmuen a Phase 2A authorityt projekttalni, nem talalhat ki sajat fallback routing matrixot; a task ilyenkor refinementre szorul.
7. Default-baseline rule:
   reviewer-facing parity szovegben a default `reviewer_blocking_min_severity = P3` csak a jelenlegi baseline konfiguraciot magyarazza; ugyanaz a `P3` findinghalmaz `P2` threshold mellett advisory-only lehet, anelkul hogy a severity ontology jelentese valtozna.
8. Phase boundary:
   - contract closure: inherited from phase1/phase2a
   - producer closure: predecessor-owned
   - internal execution closure: none
   - workflow/orchestration closure: projection-only scopeban owned here
   - read-model closure: owned here
   - activation closure: none
   - cleanup/recovery closure: none

### Plan Linkage

1. Parent plan gap closed:
   reviewer prompt/guidance/doc parity + canonical reviewer ontology/runtime reminder parity.
2. Depends on:
   [review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md](/Users/felho/dev/pairflow/plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md)
3. Unlocks / impacts successors:
   kulon successor nem kotelezo; ez a reviewer-facing parity closure.
4. Task-list impact:
   ez a task nem irja ujra a routing authorityt; a Phase 2A truth-ot reviewer-facing surfacesre projekttalja es dokumentalja.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/v11/shared/reviewer/reviewerCommandGateGuidance.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerCommandGateGuidance.ts)
   - [src/v11/shared/reviewer/reviewerSeverityOntology.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerSeverityOntology.ts)
   - [src/v11/shared/reviewer/reviewerSeverityOntology.generated.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerSeverityOntology.generated.ts)
   - [src/v11/application/actorProtocol/roleDescriptorRegistry.ts](/Users/felho/dev/pairflow/src/v11/application/actorProtocol/roleDescriptorRegistry.ts)
   - [src/v11/application/start/startCommandContext.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandContext.ts)
   - [src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts)
   - [src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts)
   - [docs/reviewer-severity-ontology.md](/Users/felho/dev/pairflow/docs/reviewer-severity-ontology.md)
   - [docs/pairflow-initial-design.md](/Users/felho/dev/pairflow/docs/pairflow-initial-design.md)
   - [README.md](/Users/felho/dev/pairflow/README.md)
2. Canonical elements:
   - a reviewer threshold-driven post-gate routing authorityt a Phase 2A zarta le
   - clean reviewer path post-gate tovabbra is convergence
   - a reviewer severity ontology `P0/P1/P2/P3` jelentese explicit marad
3. Guard elements:
   - document scope qualifier semantics preserved
   - generated reminder/doc parity staleness test preserved
   - source-doc reference explicit marad
4. Compat elements:
   - round 1 reviewer emit semantics
   - implementer pass semantics
5. Forbidden reinterpretations:
   - a projection surfaces nem allithatjak, hogy `P2/P3` fixen advisory-only, ha a canonical reviewer threshold ettol elterhet
   - a default `P3` baseline dokumentalasa nem fordithato le ugy, mintha a `P3` severity onmagaban blocker-level jelentest vagy fix advisory-only szerepet hordozna
   - a generated runtime reminder es a docs nem irhatjak at hallgatolag a `P3` severity kategoriat blocker-level jelentesevre
   - a reviewer-facing copy nem valthat vissza fix `P0/P1` blocker vs `P2/P3` advisory decision mappingra

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `buildReviewerCanonicalCommandGateLines`, `buildReviewerSeverityOntologyReminder`, reviewer startup concern registry, reviewer policy snapshot creation, reviewer resume kickoff builder, tmux reviewer delivery path.
2. Actual touched scope:
   `reviewer-facing prompt/guidance/doc/runtime-reminder projection parity`.
3. Mutation entrypoints in scope:
   nincs uj persisted config mutation; csak reviewer-facing text/projection es generated reminder parity valtozik.
4. Hidden scope ruled out:
   reviewer decision path, scope-policy aggregate, pass-routing seam, UI mutate API, meta-review gate routing, cleanup/recovery flows.
5. Why the declared task shape matches reality:
   ugyanaz a reviewer-facing projection csalad ownershipolja a command guidance-ot, a startup/resume/tmux promptokat, a policy snapshot artifactot es a canonical ontology/doc parityt; routing authorityt mar nem ez a task zarja le.

### Authority Boundary Map

1. Authority producer:
   Phase 2A altal lezart reviewer threshold consume authority.
2. Persisted authority:
   `.pairflow/bubbles/<id>/bubble.toml` `review_policy` blokk, predecessor ownershiptal.
3. In-scope consumers:
   reviewer command guidance, reviewer startup concern registry, reviewer policy snapshot artifact, reviewer resume kickoff message, tmux reviewer delivery message, reviewer severity ontology es a belole generalt runtime reminder, operator docs.
4. Explicit out-of-scope consumers:
   reviewer pass validation, pass-routing input builder, scope-policy aggregate, meta-review auto-rework consume, cleanup/recovery flows.
5. Export surfaces closed in this phase:
   igen; reviewer-facing command guidance/doc/runtime reminder surfaces ezen a phase-en belul zarodnak.

### Complexity Risk Triage

1. `risk_score`: `4`
2. Axis breakdown:
   - `authority_risk = 1`
   - `surface_spread = 2`
   - `identity_join_risk = 0`
   - `activation_coupling = 1`
   - `prerequisite_risk = 0`
   - `acceptance_multiplicity = 0`
3. Split decision:
   a reviewer-facing parity closure kulon bounded slice maradhat, mert nem keveredik producer vagy routing consume authority ownershipgel.
4. Authority/source-of-truth note:
   a canonical authority mar letezik Phase 2A utan; ez a task csak projection/parity alignmentet zarhat.

### Closure-Budget Triage

1. Touched closures:
   - `shared_contract`
   - `workflow_orchestration_consumers`
   - `read_model_consumers`
2. Intentionally collapsed closures:
   - `workflow_orchestration_consumers` + `read_model_consumers`
3. Why this collapse is safe:
   ugyanaz a reviewer-facing prompt/guidance family ownershipolja a startup/resume/tmux projectiont, a policy snapshotot es az ontology/doc parityt; nincs kulon persisted schema vagy cleanup kockazat.
4. Explicitly deferred closures:
   - `authority_producer`
   - `persisted_authority_or_schema`
   - `internal_execution_consumers`
   - `cleanup_recovery_consumers`

### Bounded-Task-Shape Classification

1. Primary shape:
   `activation_or_read_model`
2. Secondary shape:
   `consumer_family_alignment`
3. Why the mix is safe:
   a secondary shape ugyanazon reviewer-facing projection csaladon belul marad; nincs uj side-effect ordering, recovery vagy coordination ownership.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Entry | Contract Delta | Required Behavior | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts` | guidance builders | threshold-driven reviewer text | fix `P2/P3 advisory-only` routing matrix helyett a Phase 2A authorityt projekttalo threshold-driven semantics jelenjen meg, es a default `P3` baseline konfiguracios thresholdkent legyen kimondva, ne severity-jelenteskent | P1 | T1,T3,T7 |
| CS2 | `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`, `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | startup/resume/runtime prompt projection | reviewer-facing prompt parity | a startup concern registry, a resume kickoff es a tmux reviewer pane ugyanazt a threshold policy-t vigye | P1 | T3,T7 |
| CS3 | `src/v11/application/start/startCommandContext.ts` | reviewer policy snapshot artifact | canonical snapshot parity | a reviewer policy snapshot ne stale ontology truthot tartalmazzon; a generated canonical reviewer policy snapshot a friss source-hoz igazodjon, es default `P3` baseline eseten is konfiguracios threshold-nyelvet vigyen tovabb | P1 | T4,T7 |
| CS4 | `src/v11/shared/reviewer/reviewerSeverityOntology.ts`, `src/v11/shared/reviewer/reviewerSeverityOntology.generated.ts`, `docs/reviewer-severity-ontology.md` | ontology + generated reminder | canonical ontology/runtime reminder parity | a `Decision Mapping` es a runtime reminder embed ugyanazt a threshold-driven reviewer post-gate semantics-et hordozza, mikozben a severity definiciok closed jelentese nem lazul el | P1 | T2,T4,T5,T7 |
| CS5 | `docs/pairflow-initial-design.md`, `README.md` | spec/operator docs | protocol parity | a reviewer convergence szabaly explicit threshold-driven legyen, es ne hagyjon mixed-truth parafrazist | P2 | T6,T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Reviewer guidance | `P2/P3 advisory-only` text | threshold-driven text that names the configured threshold as the routing cause | threshold semantics + clean path + explicit default-`P3` baseline wording | examples by threshold | intentional text update |
| Reviewer ontology/runtime reminder | fix blocker/advisory decision mapping | threshold-driven decision mapping with preserved severity definitions | canonical reviewer ontology parity + regenerated runtime embed + explicit separation of threshold-vs-severity meaning | extra examples | intentional docs/codegen update |
| Reviewer-facing prompt projection | mixed reviewer surfaces with possible stale legacy truth | unified threshold-driven projection across startup/resume/tmux/snapshot | same source-authorized truth on every reviewer-facing surface | formatting polish | intentional projection alignment |

Normative rules:
1. A reviewer-facing projection surfaces nem hozhatnak letre sajat routing authorityt; csak a Phase 2A altal lezart truth-ot projekttalhatjak.
2. A clean post-gate reviewer path reviewer-facing kommunikacioja tovabbra is canonical convergence.
3. A threshold-driven routing only a routing authorityt irja at, nem a severity ontology `P2/P3` definiciojat es nem a document-scope qualifier policyt.
4. Default-baseline wording rule:
   ha reviewer-facing szoveg a default `reviewer_blocking_min_severity = P3` baseline-t emliti, explicitten ki kell mondania, hogy ez konfiguracios baseline, nem severity-jelentes; ugyanennek a szovegnek kompatibilisnek kell maradnia a `P2` vagy `P1` threshold-esetekkel is.
5. Runtime reminder/codegen parity:
   ha a routing semantics vagy a blocker/advisory explainer szoveg valtozik, a canonical markdown runtime-reminder blokk es a generated TypeScript artifact ugyanabban a lane-ben frissul.
6. Equality-proof requirement:
   a reviewer-facing parity nem elegedhet meg laza tematikus restatementtel; explicit ugyanazt-az-allitast jellegu proof kell a command guidance, snapshot, startup/resume/tmux projection, generated reminder es docs kozott.

### 3) Error Contract

| Trigger | Behavior | Reason Code / Surface | Priority |
|---|---|---|---|
| stale generated ontology reminder | parity test fail | existing test/codegen drift surface | P1 |
| mixed reviewer-facing routing claim | reject at review/spec level | inconsistent prompt/docs parity | P1 |

### 4) Baseline Preservation

1. `must_preserve_behaviors`:
   - reviewer severity ontology `P0/P1/P2/P3` definicioi nem irhatok at pusztan a routing threshold valtozasa miatt
   - reviewer startup/resume/tmux prompt consumerok ugyanannak a canonical routing igazsagnak a projectionjei maradnak
   - reviewer policy snapshot artifact canonical docs source-ra mutat tovabbra is
2. `allowed_resolution_paths`:
   - Phase 2A threshold-driven routing truth -> command guidance -> startup/resume/tmux/docs projection
   - canonical reviewer ontology markdown -> generated runtime reminder -> policy snapshot / delivery projection
3. `forbidden_regression_interpretations`:
   - a docs/guidance nem tanithat tovabb fix `P2/P3 advisory-only` szabalyokat, ha a runtime threshold ettol elter
   - a severity ontology frissites nem irhatja at hallgatolag a `P3` severity kategoriat blocker-level jelentesevre
4. `replacement_proof_required_if_removed`:
   ha a generated runtime reminder embed, a reviewer policy snapshot vagy a tmux reviewer delivery reminder path atalakul, explicit parity proof kell arra, hogy ugyanazt a canonical ontologybol szarmazo threshold-driven uzenetet kapja a reviewer.

### 5) Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - a Phase 2A authority truth explicit es stabil legyen
   - a canonical reviewer ontology source markdown es a generated reminder kozt parity proof letezzen
2. Side effects forbidden before those validations pass:
   - nincs reviewer-facing prompt projection, amely a Phase 2A truth-tol eltero legacy fix blocker matrixot tanit
   - nincs stale policy snapshot vagy tmux reminder, amely mixed-truth allapotot okoz
3. Invalid/precondition-failure behavior:
   - parity drift -> explicit test/spec failure, release/approval proof nelkul
4. Coordination primitives in scope:
   - `N/A`; nincs uj lock/idempotency/serialization ownership.
5. Pure-by-default side-effect rule:
   guidance builder, ontology reminder builder es prompt projection logika pure marad; a generated artifact refresh a designated codegen lane-en keresztul tortenik.
6. Dependency-failure fallback:
   hianyzo parity vagy stale generated reminder nem valthat ki local prose fallbackot; fail-closed refinement kell.

### 6) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | reviewer command guidance text threshold-driven | threshold-aware runtime context | command gate guidance build fut | nincs fix `P2/P3 advisory-only` authority; threshold policy explicit |
| T2 | reviewer ontology decision mapping parity | canonical reviewer ontology updated | codegen/runtime reminder refresh fut | a canonical `Decision Mapping` threshold-driven, de a severity definiciok valtozatlanok |
| T3 | startup/resume/tmux prompt parity | reviewer active startup vagy resume context | role descriptor registry, resume kickoff es tmux delivery build fut | minden reviewer-facing prompt ugyanazt a threshold-driven routing igazsagot projekttalja |
| T4 | reviewer policy snapshot parity | bubble start reviewer snapshot build | `startCommandContext` + start bubble flow fut | a snapshot a friss canonical reviewer ontology source-bol szarmazo truth-ot tartalmazza |
| T5 | generated runtime reminder parity | updated ontology markdown | `buildReviewerSeverityOntologyReminder` fut | a beagyazott reminder ugyanarra a canonical ontology source-ra mutat es nem stale |
| T6 | docs/spec parity | implementation merged | docs review | initial design, README es reviewer ontology ugyanazt a threshold-driven reviewer semantics-et irja le, es a default `P3` baseline-t konfiguracios policykent nevezik meg, nem severity-ujraertelmezeskent |
| T7 | non-doc reviewer-facing default-baseline wording uniformity | default `reviewer_blocking_min_severity = P3` legalabb egy nem-doc reviewer-facing projection surface-en megjelenik | guidance, snapshot, startup/resume/tmux prompt es runtime reminder parity review fut | minden default-`P3`-at megjelenito nem-doc reviewer-facing surface ugyanazzal a "configured threshold, not ontology meaning" allitassal nevezi meg a defaultot; nincs olyan surface, amely csak `P3`-hoz kotott specialis ontology-jelentest sugall |

### 7) Review Control

Reviewer akkor adhat `IMPLEMENTABLE` allapotot, ha:
1. a reviewer-facing guidance/prompt/docs ugyanazt a semantics-et tukrozik, mint a Phase 2A authority,
2. a canonical ontology markdown, a generated runtime reminder es a reviewer policy snapshot explicit parity ownershipot kap,
3. a startup/resume/tmux projection ugyanazt a threshold-driven command-gate truth-ot viszi,
4. a severity ontology es a document-scope qualifier semantics nem kap hallgatolagos uj jelentest,
5. a default `P3` baseline minden reviewer-facing feluleten konfiguracios policykent van leirva, nem severity-atdefinialaskent.

## L2 - Implementation Notes (Optional)

1. Peldaszovegek command guidance / startup-resume / tmux feluletekre:
   - `Default reviewer threshold: P3. Post-gate P3-only findings may remain reviewer-blocking because the configured threshold allows them.`
   - `Configured reviewer threshold: P2. The same P3-only findings are advisory-only because they fall below the configured threshold, not because P3 changed meaning.`
   - `Configured reviewer threshold: P1. The message still names the threshold as the reason, and does not restate P2/P3 as ontology-level advisory severities.`
2. Ha a canonical reviewer ontology markdown valtozik, futtatni kell a reviewer severity ontology codegen refresh-t is, hogy a generated embed ne stale allapotban maradjon.
3. A resume/startup prompt consumerok frissitese ugyanazt a reviewer command gate tokenkeszletet kell hasznalja, mint a tmux delivery guidance.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a reviewer-facing parity teljesen threshold-driven,
2. T1-T7 teljesen lefedik a reviewer guidance, snapshot, startup/resume/tmux projection, ontology/runtime reminder es docs parity closure-t,
3. nincs fix `P2/P3 advisory-only` vagy fix `P0/P1` blocker/advisory truth maradek a reviewer-facing surfacesen, es egyetlen surface sem sugall default `P3` mellett specialis severity-jelentest,
4. a default `P3` baseline mindenhol ugyanazzal a "configured threshold, not ontology meaning" nyelvvel jelenik meg.

## Assumptions

1. A required-now docs parity minimuma:
   `docs/reviewer-severity-ontology.md`, `docs/pairflow-initial-design.md`, `README.md`; kulon rollout doc most nem kell.
2. A routing authority consume truth-ot a Phase 2A mar explicit es implementalhato formaban lezarta.

## Hardening Backlog

1. `later-hardening`: threshold-specifikus reviewer guidance peldatar bovitese csak akkor kell, ha a default `P3` utan kulon operator onboarding gap marad.
2. `later-hardening`: tovabbi dedicated diagnostics arra, hogy a reviewer pane-ben mely threshold miatt lett `pass` vs `convergence`, kulon taskban johet.
