---
artifact_type: task
artifact_id: task_actor_runtime_incomplete_emit_foundation_generic_reconcile_kernel_phaseE_v1
title: "Actor Runtime Generic Reconcile Kernel Foundation (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/v11/application/reconcile/finishIncompleteActorResult.ts
  - src/v11/application/reconcile/finishIncompleteActorResultTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/v11/application/reconcile/finishIncompleteActorResult.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Generic Reconcile Kernel Foundation (Phase E)

## Current Codebase Check (2026-04-10)

1. A live codeban jelenleg nincs actor-agnosztikus finish-incomplete-emit kernel; a canonical meta-review finalization today retained recovery helpersen keresztul el.
2. A tenyleges Phase 1 insertion seam ezert a retained recovery adapter hataran van:
   - `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
3. Az uj `src/v11/application/reconcile/**` co-tenant marad a meglevo command flow mellett. Ebben a taskban ez foundation-layer bevezetes, nem a normal submit happy path cutoverja.
4. A normal `submitMetaReviewResult(...) -> recoverMetaReviewSubmitRoute(...) -> recoverMetaReviewGateFromSnapshot({ runResult: canonicalRunResult, ... })` happy path explicit `runResult` caller-uta tovabbra is kulon Phase 2 scope marad a `plans/tasks/actor-runtime-incomplete-emit/meta-review-submit-cutover-phaseE.md` taskban.
5. A retained recovery seam current-stateben ket kulon responsibilities-t hordoz:
   - kickoff-replay az aktiv execution window alatt canonical submit nelkul,
   - persisted snapshotbol visszaolvasott canonical run-result route/apply/finalization explicit submit-side `runResult` injection nelkul.
6. A foundation feladat csak a masodik reszt huzza le generic kernelre; a kickoff-replay retained adapter-local branch marad, es a submit altal atadott explicit `runResult` ut kifejezetten Phase 2 consumer-scope.

### Implementation Target Decision

1. `implementable_now`: `yes`
2. A foundation target egy uj internal kernel `src/v11/application/reconcile/**` alatt, amely csak:
   - persisted canonical actor outputtal,
   - explicit `BubbleExecutionContext` authorityval,
   - es explicit route-policy / mutation dependencykkel dolgozik.
3. A `recoverMetaReviewGateFromSnapshot(...)` Phase 1-ben adapter marad:
   - a "nincs meg canonical submit, de meg aktiv az execution window" kickoff-replay branch retained es adapter-local marad,
   - minden olyan branch, ahol mar van canonical run result, a generic kernel fele delegal.
4. A normal submit path Phase 1-ben nem kotelezo consumer. A foundation task csak a reusable belso kernel es a retained recovery adapter boundaryjet zarja le a snapshot-driven recovery-agon.
5. Public `recover` command removal, watchdog/startup/converged caller cutover, valamint submit/actor-protocol wrapper cutover nem resze ennek a tasknak.

### Recommended Sequencing

1. Eloszor a generic input/output/dependency contract alljon ossze a new `reconcile` layerben.
2. Utana a retained recovery seam alljon at a generic kernelre ott, ahol a canonical run result a persisted snapshotbol all elo, explicit submit-side `runResult` injection nelkul.
3. A normal submit happy path cutover maradjon a kulon Phase 2 taskban.

## L0 - Policy

### Goal

Vezessen be egy actor-agnosztikus belso reconcile / finish-incomplete-emit kernelt, amely persisted canonical outputbol es explicit execution contextbol dolgozik, es amelyet a jelenlegi retained meta-review recovery/finalization path foundation szinten mar hasznalni tud.

### In Scope

1. Generic belso reconcile kernel contract es tipusok bevezetese a `src/v11/application/reconcile/**` retegen.
2. A retained meta-review recovery/finalization shared logic foundation-level atkeretezese a generic kernel fele.
3. A retained recovery seam Phase 1 adapterre szukitese ugy, hogy a snapshot-driven canonical run-result branch-ek mar a generic kernelre delegaljanak.
4. Egy explicit, idempotens finish result shape rogzitese.
5. Core foundation tesztek a generic kernelre, plusz retained recovery parity regresszio coverage.

### Out of Scope

1. A normal meta-review happy path Phase 2 cutoverja a generic kernelre, beleertve a submit altal atadott explicit `runResult` caller-utat.
2. Public `pairflow bubble meta-review recover` command removal.
3. Watchdog/converged/startup internal caller cutover.
4. Actor-protocol public wrapper API redesign.
5. Docs/CLI wording cleanup.
6. Olyan retained thin-wrapper vegallapot legitimacioja, amely a Phase 3 removal celjat gyengiti.

### Safety Defaults

1. A generic kernel boundary kotelezo inputja explicit `executionContext: BubbleExecutionContext`; a kernel nem olvashat authorityt snapshotbol, tmux-bol, cwd-bol vagy operator path-bol.
2. A generic kernel kotelezo inputja canonical persisted actor result (`runResult` vagy equivalent canonical payload); a kickoff-replay retained branch nem kernel-feladat.
3. Nincs operator-origin fallback es nincs pane/tmux-derived authority.
4. A retained recovery facade csak projection/adaptation szerepet tarthat meg; nem maradhat masodik canonical finalization engine.
5. A foundation task nem nyithatja ujra a Phase 2 normal submit cutover kotelezettseget a sajat acceptance szerzodeseben, es nem vallalhatja at a submit altal hasznalt explicit `runResult` caller-utat sem.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - internal reconcile/finalization authority contract,
   - retained recovery facade internal dependency contract,
   - retained v11 recovery facade parity contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: persisted canonical actor output + explicit execution context
   - forbidden secondary sources: tmux pane state, operator command path, historical meta-review-specific recovery identity

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/reconcile/finishIncompleteActorResultTypes.ts` | generic reconcile contract types | `FinishIncompleteActorResultInput`, `FinishIncompleteActorResultDependencies`, `FinishIncompleteActorResultOutput`, `FinishIncompleteActorRoutePolicy` type exports | new file | a canonical generic input/output/policy contractot adja a retained meta-review naming nelkul | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/reconcile/finishIncompleteActorResult.ts` | generic finalize engine | `finishIncompleteActorResult(input: FinishIncompleteActorResultInput, dependencies?: FinishIncompleteActorResultDependencies) -> Promise<FinishIncompleteActorResultOutput>` | new file | explicit execution context + canonical run result alapjan route-ol, mutal es finalizal; nincs meta-review-specifikus authority inference | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | retained recovery dependency contract | `RecoverMetaReviewGateFromSnapshotDependencies["finishIncompleteActorResult"]?: typeof finishIncompleteActorResult` | shared recovery contract | a retained recovery adapter explicit generic-kernel dependencyt kapjon ahelyett, hogy sajat canonical engine maradna | P1 | required-now | T3, T4 |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | retained recovery seam | `recoverMetaReviewGateFromSnapshot(input: RecoverMetaReviewGateFromSnapshotInput, dependencies?: RecoverMetaReviewGateFromSnapshotDependencies) -> Promise<MetaReviewGateResult>` | recovery implementation | a kickoff-replay branch adapter-local marad; a snapshot-driven canonical run-result branch generic kernelre delegál es `MetaReviewGateResult`-ra vetitodik vissza; a submit-side explicit `runResult` ut nem resze ennek a tasknak | P1 | required-now | T3, T4 |
| CS5 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` | retained recovery facade | `recoverMetaReviewGateFromSnapshotV11(input: RecoverMetaReviewGateFromSnapshotInput, dependencies?: RecoverMetaReviewGateFromSnapshotDependencies) -> Promise<MetaReviewGateResult>` | facade layer | public v11 recovery semantics valtozatlan maradjon, mikozben a shared recovery seam adapter-only marad | P2 | required-now | T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Generic kernel input | meta-review-specifikus recovery input + implicit snapshot-derived authority | actor-agnosztikus internal input | `bubbleId`, `repoPath`, `cwd`, `now`, `executionContext`, `runResult`, `routePolicy` | `summary`, `refs`, `callerTag`, `snapshotState` | internal breaking-by-plan | P1 | required-now |
| Generic kernel output | `MetaReviewGateResult`-shape retained shared recovery outputkent | generic finish result | `bubbleId`, `appliedRoute`, `routeSequence`, `routeEnvelope`, `state`, `canonicalRun`, `mutationKind` | `warnings`, `diagnostics` | internal tightening | P1 | required-now |
| Recovery adapter contract | direct meta-review recovery engine | thin meta-review adapter a generic kernel felett | same retained facade inputok + generic kernel injection | kickoff replay retained branch metadata, snapshot-derived run-result materialization | compatibility-preserving temporary adapter | P1 | required-now |

Implementation note:
1. A generic `reconcile` layer nem vehet at `ResolvedBubble` vagy mas recovery-local alias tipust kozvetlenul; a recovery seam sajat adaptere csomagolja a neutral kernel inputot.
2. A normal submit path consumer boundary kulon Phase 2 taskban marad; foundation-level acceptance erre nem hivatkozhat kotelezo call-sitekent.
3. A `RecoverMetaReviewGateFromSnapshotInput.runResult` explicit caller-injection surface Phase 1-ben csak compatibility surface; a foundation cutover nem kovetelheti meg, hogy ez a submit-owned ut mar a generic kernelre legyen atkotve.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Generic reconcile kernel | state snapshot CAS, transcript append, route apply, pane/session follow-up explicit dependenciesen keresztul | implicit authority reconstruction, tmux/pane probing mint authority source | a kernel mutation ownership explicit dependencykkel tortenik | P1 | required-now |
| Recovery adapter | kickoff replay retained branch local kezelese + generic kernel delegalas snapshot-driven canonical run-result eseten | uj meta-review-specifikus canonical finalization branch bevezetese | csak adapter/projection szerep maradhat | P1 | required-now |

Constraint: ebben a taskban nincs public CLI side effect, nincs actor-protocol wrapper signatura-atiras, nincs normal submit happy-path cutover, es nincs submit-owned explicit `runResult` caller-ut cutover.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing explicit execution context a generic kernel boundaryn | state/execution context | throw | nincs fallback | `ACTOR_RECONCILE_CONTEXT_INVALID` | error | P1 | required-now |
| canonical run result hianyzik vagy invalid a generic kernel boundaryn | canonical output artifact/state | throw | nincs hidden rerun | `ACTOR_RECONCILE_INPUT_INVALID` | error | P1 | required-now |
| retained recovery hivasa, de nincs canonical submit es meg aktiv a deadline | recovery adapter | result | kickoff-replay retained branch adapter-local, generic kernel nelkul | existing `meta_review_running` recovery surface | info | P1 | required-now |
| retained recovery hivasa explicit `runResult` inputtal submit-owned callerbol | recovery adapter / submit seam boundary | result | compatibility surface retained, de a generic-kernel consumer cutover kulon Phase 2 feladat marad | N/A | info | P1 | required-now |
| canonical route/apply parity vagy dispatch hiba | transcript/state mutation | throw | existing typed failure surface retained marad | existing meta-review gate reason code surface | error | P1 | required-now |
| caller tovabbra is retained meta-review facade-t hasznal | facade layer | result | compatibility retained in this task only | N/A | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`, `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` explicit authority es fail-closed source-of-truth miatt | P1 | required-now |
| must-use | existing parity/human-route persistence helpers a retained recovery adapter alatt | P1 | required-now |
| must-use | `tests/v11/application/reconcile/finishIncompleteActorResult.test.ts` mint a generic kernel primary regression surface | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-incomplete-emit/meta-review-submit-cutover-phaseE.md` mint a normal happy-path consumer es explicit submit-side `runResult` caller-ut kulon Phase 2 szerzodese | P1 | required-now |
| must-use | retained recovery parity coverage (`tests/core/bubble/metaReviewGate.test.ts`) | P1 | required-now |
| must-not-use | normal submit happy-path cutover, submit-owned explicit `runResult` caller-ut cutover, public `recover` removal, operator-surface redesign, actor-protocol API rewrite, watchdog/startup/converged caller cutover | P1 | required-now |
| must-not-use | tmux-derived authority, cwd-derived authority, historical meta-review identity mint generic kernel input | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | generic kernel routes canonical finish from explicit authority | valid persisted canonical run result + explicit `BubbleExecutionContext` + deterministic route policy fixture | `finishIncompleteActorResult(...)` fut | deterministic generic output jon (`appliedRoute`, `routeSequence`, `routeEnvelope`, `state`, `canonicalRun`, `mutationKind`) | P1 | required-now | automated test |
| T2 | generic kernel fail-closed authority/input validation | hianyzo `executionContext` vagy invalid/missing canonical run result | `finishIncompleteActorResult(...)` fut | explicit typed hiba jon, nincs hidden snapshot-derived fallback | P1 | required-now | automated test |
| T3 | retained recovery adapter keeps kickoff replay local | nincs canonical submit az aktiv execution windowben, de kickoff envelope letezik | `recoverMetaReviewGateFromSnapshot(...)` fut | `meta_review_running` retained replay branch generic kernel hivas nelkul marad | P1 | required-now | automated test |
| T4 | retained recovery adapter delegates snapshot-driven canonical run-result path | canonical submit snapshot mar letezik, `input.runResult` nincs explicit callerkent beadva | `recoverMetaReviewGateFromSnapshot(...)` fut | a retained recovery facade generic kernel eredmenyt vetit vissza `MetaReviewGateResult`-ra regresszio nelkul | P1 | required-now | automated test |
| T5 | retained v11 recovery facade parity | current v11 recovery fixture | `recoverMetaReviewGateFromSnapshotV11(...)` fut | current external behavior nem torik, a returned route/state surface valtozatlan marad | P2 | required-now | automated test |

## Acceptance Criteria

1. AC1: A generic finish-incomplete-emit kernel exact input/output/dependency contractja explicit es retained meta-review naming nelkul le van zarva.
2. AC2: A retained recovery seam Phase 1 adapterre szukult: kickoff replay retained branch local, canonical run-result branch generic kernel delegate.
3. AC3: A retained v11 recovery facade public semantics valtozatlan marad.
4. AC4: Az authority source-of-truth tovabbra is csak persisted canonical output + explicit execution context; nincs implicit runtime/pane/operator authority.
5. AC5: A foundation task explicitten nem vallalja at a normal submit happy path cutovert vagy a submit-owned explicit `runResult` caller-utat; ez kulon Phase 2 contractkent marad jelolve.
6. AC6: A testmatrix explicitten fedi a generic kernel core-t es a retained recovery adapter parityt.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2 | T1, T2 |
| AC2 | CS3, CS4 | T3, T4 |
| AC3 | CS4, CS5 | T4, T5 |
| AC4 | CS1, CS2, CS3, CS4 | T1, T2, T3, T4 |
| AC5 | document scope gate: `Current Codebase Check` item 4, `Out of Scope` item 1, `Safety Defaults` item 5, `must-use` Phase 2 dependency, `must-not-use` submit-owned explicit `runResult` cutover | N/A (docs-only scope exclusion contract) |
| AC6 | CS1, CS2, CS4, CS5 | T1, T2, T3, T4, T5 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Phase 2-ben a normal submit happy path es a submit-owned explicit `runResult` caller-ut atallhat ugyanarra a generic kernelre, de ez a foundation task acceptance kriteriumaiban nem elovarhato.
2. [later-hardening] Ha kesobb a generic output tobbi actorra is kiterjed, erdemes a `MetaReviewGateResult` projectiont kulon mapperbe kiszervezni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Generic kernel result shape tovabbi egyszerusitese | L2 | P2 | later-hardening | Phase 1 analysis | Phase 4 cleanupban csokkenteni a retained route-envelope projection couplinget |
| H2 | Normal submit happy-path es explicit `runResult` caller-ut cutover | L1 | P1 | later-hardening | Phase 2 plan | a kulon `meta-review-submit-cutover-phaseE` task vegye at a submit runtime/facade/wrapper consumer cutovert |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.

## Spec Lock

Ebben a task-artifact konvencioban a `status: implementable` azt jelenti, hogy a spec deterministic es implementation-ready, nem azt, hogy a runtime kod mar leszallitott.

Ez a task artifact `IMPLEMENTABLE`, mert:

1. a current-codebase-aligned write set explicit es a Phase 1 foundation scope-ra van visszahuzva,
2. a generic kernel vs retained recovery adapter boundary pontosan le van zarva,
3. a normal submit happy path kulon Phase 2 szerzodeskent marad, igy nincs duplikalt vagy ellentmondo cutover-kovetelmeny,
4. nincs nyitott `P0/P1 + required-now` homaly az authority source, a call-site ownership vagy a scope-hatar korul.
