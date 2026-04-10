---
artifact_type: task
artifact_id: task_meta_review_recover_runtime_removal_phase1_v1
title: "Meta-Review Recover Runtime Removal (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/shared/metaReview/metaReviewCommandContract.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoRework.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoReworkCounter.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoReworkState.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryContext.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryContextHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryHumanRouteInput.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryRunResolution.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/application/converged/convergedDefaultDependencies.ts
  - src/v11/application/converged/convergedExecution.ts
  - src/v11/application/converged/convergedFlowInvocationBuilders.ts
  - src/v11/application/converged/runConvergedFlow.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/shared/converged/convergedCommandTypes.ts
  - src/v11/application/watchdog/watchdogCommandApi.ts
  - src/v11/application/watchdog/watchdogCommandContract.ts
  - src/v11/application/watchdog/watchdogCommandFlow.ts
  - src/v11/application/watchdog/watchdogCommandRouting.ts
  - src/v11/application/watchdog/watchdogMetaReviewRouting.ts
  - src/v11/application/reconcile/finishIncompleteActorResult.ts
  - src/v11/application/reconcile/finishIncompleteActorResultTypes.ts
  - src/v11/shared/reconcile/finishIncompleteActorResultPort.ts
  - tests/core/agent/converged.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/human/approval.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
  - tests/v11/application/converged/convergedFlowInvocationBuilders.test.ts
  - tests/v11/application/reconcile/finishIncompleteActorResult.test.ts
prd_ref: null
plan_ref: plans/meta-review-recover-and-reconcile-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recover Runtime Removal (Phase 1)

## Current Codebase Check (2026-04-10)

1. A jelenlegi submit path a `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts` fajlban dinamikusan betolti a `metaReviewGateRecovery.ts` modult, majd a canonical submit eredmenyt snapshot-route replayen keresztul finalize-olja.
2. Az `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` tovabbra is wiringolja a `finishIncompleteActorResult` generic kernelt, es `recoverMetaReviewGateFromSnapshotV11(...)` neven retained recover facadet exportal.
3. A recover dependency nem csak submitban el: a converged es watchdog flowk szerzodes-szinten is tovabbviszik a seamet (`convergedDefaultDependencies.ts`, `convergedExecution.ts`, `convergedFlowInvocationBuilders.ts`, `runConvergedFlow.ts`, `runConvergedFlowContract.ts`, `convergedCommandTypes.ts`, illetve a watchdog contract/api/flow/routing reteg).
4. A public/operator `recover` CLI surface meg letezik, de ez tovabbra is Phase 2 ownership. Phase 1 nem formalizalhat retained public/operator `recover` shellt legitim koztes allapotkent; ha sequencing miatt atmeneti fajl-level overlap marad, annak nem-public, nem-tamogatott belso reziduumnak kell lennie.
5. A task eredeti `target_files` listaja nem fedte le a mai runtime-graf tenyleges touchpointjait, ezert a scope-ot a fenti aktiv import- es dependency-surface alapjan ki kellett szelesiteni.

### Implementation Target Decision

1. `implementable_now`: `yes`
2. A chosen seam ebben a taskban: a snapshot-driven recover runtime es a generic incomplete-emit reconcile kernel teljes eltavolitasa a belso futasidobol.
3. A submit finalization authority a canonical current-run eredmenyhez es az explicit gate/finalize pathhoz kerul; Phase 1 utan nem maradhat dinamikus import vagy DI seam, amely a `metaReviewGateRecovery.ts`-re tamaszkodik.
4. Ha sequencing miatt valamely overlap-fajl a recover nevkorbol ideiglenesen megmarad, az nem-public, nem-tamogatott belso reziduum lehet csak:
   - nem importalhatja a `metaReviewGateRecovery.ts`-t,
   - nem hivhatja a `finishIncompleteActorResult` kernelt,
   - nem route-olhat persisted snapshotbol,
   - nem emitalhat gate envelope-ot,
   - nem maradhat ervenyes vagy dokumentalt operator/public contract.
5. A public CLI/parser/help/docs torlese tovabbra is Phase 2 ownership; ez a task a belso runtime-grafot zarja le ugy, hogy a Phase 2 mar pusztan felulet- es guidance-cleanup legyen.

## L0 - Policy

### Goal

Szuntesse meg a meta-review snapshot-driven recover/reconcile runtime kepesseget es a generic incomplete-emit kernelt ugy, hogy a submit/watchdog/converged flowk tobbe ne epitsenek route-replay logikara.

### In Scope

1. `finishIncompleteActorResult` es a hozza tartozo retained generic reconcile contractok eltavolitasa.
2. A meta-review submit happy path atallitasa retained recovery helper helyett kozvetlen finalize / explicit fail-closed logikara.
3. A watchdog es converged dependency contractokbol a recover seam eltavolitasa.
4. A `recoverMetaReviewGateFromSnapshot(...)` belso runtime szerepenek megszuntetese.
5. Az overlap-fajlok sequencing-boundaryjenek rogzitese ugy, hogy nem maradhat meaningful retained public/operator `recover` feature a fazisok kozott.
6. A runtime removalhoz tartozo regression es code-search evidence rogzitese.

### Out of Scope

1. Public `pairflow bubble meta-review recover` CLI/help/docs cleanup.
2. Operator runbook vagy PRD wording update.
3. Uj automatic recovery capability bevezetese `restart` helyett.
4. Uj remediation command vagy restart-szemantika redesign.

### Safety Defaults

1. A belso runtime nem route-olhat ujra persisted snapshotbol recovery helperrel.
2. Ha a gate finalize a current-run eredmenybol nem vezetheto le biztonsagosan, a viselkedes explicit fail-closed legyen, ne silent replay.
3. A normal meta-review submit flow nem fugghet retained recovery fogalomtol, lazy importtol vagy wrappertol.
4. Atmeneti overlap-allapotban sem maradhat meaningful retained public/operator `recover` feature; barmely megmarado recover-nevkoru reziduum csak nem-public, fail-closed belso maradek lehet.
5. Watchdog/converged nem teheti ugy, mintha recover tovabbra is tamogatott escalation path lenne.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - internal meta-review submit finalization contract,
   - internal meta-review gate runtime boundary,
   - watchdog/converged dependency injection contract,
   - overlap-boundary contract az atfedo facade fajlok sequencingere, retained public/operator recover surface nelkul.

### Phase Boundary Ledger

| Decision Surface | Owner Artifact | This Task's Requirement | Forbidden Overreach |
|---|---|---|---|
| belso submit/watchdog/converged runtime removal | ez a task | nincs replay-kepes recover runtime vagy generic reconcile kernel a belso grafban | public CLI/help/docs torles Phase 2 elott |
| atfedo recover facade fajlok sequencingje | ez a task | ha fajlszinten atmeneti reziduum marad, az csak nem-public, fail-closed belso maradek lehet | meaningful retained public/operator recover feature meghagyasa |
| `pairflow bubble meta-review recover` parser/help/dispatcher/docs/operator surface eltavolitasa | `plans/tasks/meta-review-gate/meta-review-recover-surface-removal-phase2.md` | a public surface teljes megszuntetese es wording sync | ennek visszahuzasa Phase 1-be teljes CLI cleanupkent |
| tamogatott remediation wording (`restart` / uj meta-review futtatas) | Phase 2 | public guidance explicit lesz | restart workflow redesign idehuzasa |

### Phase 1 -> Phase 2 Transition Gate

Phase 2 csak akkor indulhat, ha a kovetkezo allitasok mar teljesulnek:

1. A belso runtime-grafbol eltunt a replay-kepes `recover` execution path es a `finishIncompleteActorResult` reconcile kernel.
2. A Phase 1 utan nincs accepted retained public/operator recover koztes allapot; ha file-level overlap marad, az mar nem-public, nem-tamogatott belso reziduumkent van dokumentalva.
3. A Phase 2-ben atfedo fajloknal a Phase 1 ownership kizárólag runtime-removal / fail-closed boundaryig terjed; parser/help/docs/operator cleanup nem tortenik meg itt.

### Cross-Phase Overlap Ledger

| File | Phase 1 ownership | Phase 2 ownership |
|---|---|---|
| `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` | replay-kepes runtime eltavolitasa; esetleges maradek recover nevkor csak nem-public belso reziduum lehet | lingeringo recover public-surface maradek teljes torlese |
| `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts` | belso replay/runtime export surface recover-mentesitese vagy nem-public reziduumra szukitese | lingeringo public/shared recover export teljes torlese |
| `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts` | recovery runtime exportek belso grafbol valo lekapcsolasa | lingeringo public/shared recover runtime export teljes torlese |

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `9`
8. `single-task allowed`: `no`
9. required split:
   - `foundation/refactor`
   - `delivery`
10. Identity/join note:
   - canonical identity path: active bubble state + current meta-review submit result
   - forbidden fallback identity: persisted snapshot-route replay vagy retained recover executor
11. Authority/source-of-truth note:
   - canonical source: current-run submit/finalize path es explicit runtime state mutation
   - forbidden secondary sources: snapshot-driven route replay, generic incomplete-emit reconcile helper

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts`, `src/v11/shared/metaReview/metaReviewCommandContract.ts` | submit finalize seam | `recoverMetaReviewSubmitRoute(input:{ resolved: ResolvedBubble; repoPath: string; now: Date; canonicalRunResult: MetaReviewResult; dependencies: MetaReviewCommandDependencies; }) -> Promise<MetaReviewGateResult>`; `finalizeMetaReviewSubmitResult(input:{ resolved: ResolvedBubble; routed: MetaReviewGateResult; dependencies: MetaReviewCommandDependencies; canonicalRunResult: MetaReviewResult; canonicalReportJson: Record<string, unknown>; }) -> Promise<MetaReviewSubmitResult>`; `MetaReviewCommandDependencies` without `recoverMetaReviewGateFromSnapshot` | submit routing/finalize helpers | a submit path nem importalhat vagy kerhet recover executort; a finalize kozvetlen current-run authority alapjan tortenik, replay nelkul | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/metaReview/emitMetaReviewV11.ts` | retained submit facade defaults | `submitMetaReviewResultV11(...) -> Promise<...>` | dependency default wiring | a facade-bol eltunik a recover dependency wiring; submit-only dependency set marad | P1 | required-now | T2 |
| CS3 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts` | overlapping recover facade boundary | `recoverMetaReviewGateFromSnapshotV11(...) -> Promise<MetaReviewGateResult>` es shared export surface | V11/shared gate facade | a replay-kepes runtime megszunik; ha fajlszintu overlap marad, az nem-public, nem-tamogatott belso reziduum lehet csak, envelope emit es reconcile wiring nelkul | P1 | required-now | T3, T6 |
| CS4 | `src/v11/application/converged/convergedDefaultDependencies.ts`, `src/v11/application/converged/convergedExecution.ts`, `src/v11/application/converged/convergedFlowInvocationBuilders.ts`, `src/v11/application/converged/runConvergedFlow.ts`, `src/v11/application/converged/runConvergedFlowContract.ts`, `src/v11/shared/converged/convergedCommandTypes.ts` | converged dependency surface | existing converged dependency contracts/builders | dependency resolution + invocation building | converged flow nem expose-olhat vagy fogadhat recover dependency-t; nincs implicit replay fallback | P1 | required-now | T4 |
| CS5 | `src/v11/application/watchdog/watchdogCommandApi.ts`, `src/v11/application/watchdog/watchdogCommandContract.ts`, `src/v11/application/watchdog/watchdogCommandFlow.ts`, `src/v11/application/watchdog/watchdogCommandRouting.ts`, `src/v11/application/watchdog/watchdogMetaReviewRouting.ts` | watchdog meta-review route ownership | existing watchdog routing contracts and helpers | meta-review watchdog route | watchdog nem hivhat snapshot-recover route replayt; fail-closed escalation-friendly eredmeny marad envelope replay nelkul | P1 | required-now | T5 |
| CS6 | `src/v11/application/reconcile/finishIncompleteActorResult.ts`, `src/v11/application/reconcile/finishIncompleteActorResultTypes.ts`, `src/v11/shared/reconcile/finishIncompleteActorResultPort.ts` | generic reconcile kernel | exported files/modules | full module surface | a generic reconcile kernel torlendo; compatibility alias vagy thin wrapper nem maradhat | P1 | required-now | T6 |
| CS7 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoRework.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoReworkCounter.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoReworkState.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryContext.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryContextHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryHumanRouteInput.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryRunResolution.ts`, `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | runtime recovery implementation/types | existing recovery entry + dependency types | internal recovery implementation | snapshot-driven recovery runtime es hozza tartozo typed dependency surface megszunik; Phase 2-nek nem marad replay-kepes belso dependencyje | P1 | required-now | T3, T5, T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Submit finalize dependency | recover executor + routed snapshot result | direct finalize path current-run authorityval | canonical run result, explicit finalize/apply inputs | diagnostics | internal breaking-by-plan | P1 | required-now |
| Overlapping recover facade files | replay-kepes runtime executor | removed, vagy legfeljebb nem-public belso reziduum sequencing miatt | bubble identity + repo/cwd diagnostics, ha residual path technikailag meg letezik | human-readable remediation hint internal fail-closed pathhoz | breaking-by-plan | P1 | required-now |
| Watchdog/converged dependency contract | optional `recoverMetaReviewGateFromSnapshot` seam | recover-free routing/input contract | normal routing inputs only | existing diagnostics | internal breaking-by-plan | P1 | required-now |
| Reconcile kernel exports | retained generic helper modules | deleted | N/A | N/A | internal breaking-by-plan | P1 | required-now |

Normative rules:

1. Phase 1 utan a belso runtime-graf nem importalhatja a `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` modult.
2. Phase 1 utan a `MetaReviewCommandDependencies`, `RunConvergedFlowDependencies`, watchdog dependency contractok es a hozzajuk tartozo invocation builder outputok nem tartalmazhatnak `recoverMetaReviewGateFromSnapshot` mezot.
3. Ha valamely recover-nevkoru facade fajlszinten atmenetileg megmarad, annak nincs tamogatott public/operator jelentese: nem tartalmazhat replayelt route-ot, nem vegezhet state transitiont, nem emitálhat uj gate envelope-ot, es csak fail-closed belso reziduumkent maradhat fenn.
4. A Phase 1 nem valtoztathatja meg a `status` / `last-report` projection surface-et; csak a replay-kepes runtime-ot szedi ki mogule.

### 2.1) Ownership and Handoff Matrix

| Surface | Upstream Authority | This Task Locks | Downstream Consumer |
|---|---|---|---|
| meta-review submit canonical current-run result | existing submit persistence/parity path | a finalize kizarolag ebbol vezetheto le; nincs snapshot replay authority | Phase 2 public cleanup csak surface-et tavolit el |
| recover-nevkoru overlap fajlok | Phase 1 sequencing boundary | legfeljebb nem-public, fail-closed belso reziduum maradhat | Phase 2 torli a megmarado public/export residue-ot |
| watchdog/converged escalation semantics | existing runtime contracts | recover nelkul is explicit, replay-mentes fail-closed viselkedes | kesobbi operator wording cleanup |
| generic incomplete-emit reconcile ownership | ez a task | consumer nelkuli kernel teljes eltavolitasa | nincs downstream retained consumer |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Submit finalization | direct canonical finalize/apply path current-run authorityval | snapshot-route replay, dynamic recover import | no hidden recovery path | P1 | required-now |
| Watchdog/converged | explicit fail-closed / escalation-friendly result | automatic replay, routed envelope emit recover helyett | restart marad operator remediation | P1 | required-now |
| Overlap-fajlok residualis recover nevkore | explicit unsupported/fail-closed belso reziduum | lifecycle mutation, route replay, envelope emission, supported public/operator contract | sequencing residue only | P1 | required-now |
| Filesystem/module graph | deletion of now-unused reconcile/recovery modules | retained dead compatibility wrapper | Phase 2 ne runtime cleanup legyen | P1 | required-now |

Constraint:

1. Nem maradhat retained runtime branch, amely a canonical meta-review outcome-bol utolagos recover-reconcile route replayt vegez.
2. Ha sequencing miatt barmely recover-nevkoru reziduum megmarad, az nem lehet meaningful retained public/operator feature vagy canonical operator path.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| submit finalize korabban recover replayt hasznalt volna | submit runtime | result | explicit fail-closed meta-review gate failure; nincs replay es nincs synthetic routed envelope | `META_REVIEW_GATE_RUN_FAILED` vagy ugyanazon failure family explicit replacementje | error | P1 | required-now |
| watchdog/converged olyan allapotot er el, ahol korabban recover futott volna | watchdog/converged runtime | result | explicit non-replay escalation/no-op result restart-friendly diagnosztikaval | existing watchdog/converged result reason family, replay nelkul | warn/error | P1 | required-now |
| sequencing residue-kent megmaradt recover nevkor public/operator pathrol elerhetove valna | overlap boundary | result | explicit invalid state / fail-closed outcome; ez Phase 1 incomplete allapotnak minosul | `META_REVIEW_GATE_TRANSITION_INVALID` vagy azzal egyenerteku explicit unsupported family | warn/error | P1 | required-now |
| deleted reconcile helper meg importalva marad barhol | module graph | throw/test failure | nincs compatibility alias | build/test regression evidence | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing meta-review submit/gate/watchdog/converged regression suites | P1 | required-now |
| must-use | direct code search proving `finishIncompleteActorResult`, `metaReviewGateRecovery`, es `recoverMetaReviewGateFromSnapshot` runtime dependency removal a Phase 1 boundary szerint | P1 | required-now |
| must-use | explicit call-site cleanup a converged/watchdog/shared contract fajlokban, nem csak facade szinten | P1 | required-now |
| must-not-use | retained thin wrapper around deleted reconcile kernel | P1 | required-now |
| must-not-use | snapshot-driven route replay as hidden fallback | P1 | required-now |
| must-not-use | retained public/operator recover shell mint legitim koztes contract vagy target state | P1 | required-now |
| must-not-use | public CLI/help/docs cleanup scope visszahuzasa ide | P1 | required-now |
| must-not-use | recovery sibling modulek implicit "dead code"-kent scope-on kivul hagyasa target file annotation nelkul | P1 | required-now |

### 6) Validation / Evidence Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | submit happy path no longer depends on recover runtime | valid canonical meta-review submit fixture | submit flow runs | route/finalize kozvetlen current-run authoritybol tortenik, recover executor wiring nelkul | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T2 | submit facade/contracts no longer expose recover seam | facade fixture + dependency inspection | `submitMetaReviewResultV11(...)` resolves deps | `MetaReviewCommandDependencies` es facade defaults recover-mentesek | P1 | required-now | `tests/core/bubble/metaReview.test.ts`, code search |
| T3 | overlapping recover facade files do not define supported public behavior | direct recover facade invocation/export fixture | residual facade path is inspected or called | explicit fail-closed invalid result vagy removed export; nincs `metaReviewGateRecovery.ts` import, nincs envelope replay, es nincs tamogatott public/operator contract | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts`, `tests/core/human/approval.test.ts`, code search |
| T4 | converged path no longer exposes recover dependency | converged fixture | dependency resolution/building runs | invocation/defaults/contracts nem tartalmaznak recover seamet | P1 | required-now | `tests/core/agent/converged.test.ts`, `tests/v11/application/converged/convergedFlowInvocationBuilders.test.ts`, code search |
| T5 | watchdog meta-review path fails closed without replay | watchdog fixture that previously recovered | watchdog flow runs | explicit fail-closed/escalation-friendly path, no recover invocation, no replay envelope | P1 | required-now | `tests/core/bubble/watchdogBubble.test.ts`, `tests/contracts/v11/watchdog.contract.runner.ts` |
| T6 | generic reconcile kernel and recovery runtime are removable | code search + compile fixture | build/tests run after deletion/shim replacement | no import/type/runtime dependency remains on reconcile kernel or recovery runtime internals | P1 | required-now | `tests/contracts/v11/metaReviewGate.contract.runner.ts`, `tests/v11/application/reconcile/finishIncompleteActorResult.test.ts`, code search |

Recommended command evidence bundle:

1. targeted tests for `metaReview`, `metaReviewGate`, `watchdogBubble`, converged invocation builders, and the v11 watchdog/meta-review gate contract runners,
2. code search over `src/v11/**` and `tests/**` for `finishIncompleteActorResult`, `metaReviewGateRecovery`, `recoverMetaReviewGateFromSnapshot`,
3. if sequencing leaves any recover-named residue in overlapping files, one explicit test proving it is fail-closed, non-public in effect, and does not emit a gate envelope.

## Acceptance Criteria

1. AC1: A task explicitten kijeloli, hogy a submit finalization authority a current-run canonical eredmenyhez kerul, es nem marad dinamikus recover import vagy DI seam.
2. AC2: A converged es watchdog dependency surface-ekbol teljesen kikerul a `recoverMetaReviewGateFromSnapshot` seam.
3. AC3: A generic `finishIncompleteActorResult` kernel es a hozza tartozo retained port/type surface torolheto, compatibility wrapper nelkul.
4. AC4: Ha sequencing miatt barmely recover-nevkoru overlap-fajl megmarad, az nem-public, fail-closed belso reziduum lehet csak, replay es envelope emit nelkul.
5. AC5: A task explicit Phase 1 -> Phase 2 transition gate-et es overlap-ledgert ad az atfedo recover/public facade fajlokhoz.
6. AC6: A validation matrix pontosan bizonyitja a runtime-graf megszuneset, nem csak a facade-nevek atirasat.
7. AC7: A Phase 1 `target_files` lista tartalmazza a recovery runtime removalhoz szukseges sibling module csaladot is, nem csak a top-level entrypointokat.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests / Evidence |
|---|---|---|
| AC1 | CS1, CS2 | T1, T2 |
| AC2 | CS4, CS5 | T4, T5 |
| AC3 | CS6, CS7 | T6 |
| AC4 | CS3 | T3 |
| AC5 | `Phase 1 -> Phase 2 Transition Gate`, `Cross-Phase Overlap Ledger` | document review |
| AC6 | `Validation / Evidence Matrix` | T1-T6 |
| AC7 | `target_files`, CS3, CS7 | document review + T6 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha egy atmeneti belso fail-closed residualis path kulon typed result shape-et igenyel, erdemes azt egyetlen shared helperbe zarni a vegso torlesig.
2. [later-hardening] Ha a watchdog es converged fail-closed reason wording szetszorodik, kulon cleanup taskban lehet egysegesiteni az operator-facing diagnosztikat.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | unify fail-closed remediation wording | L2 | P2 | later-hardening | review follow-up | kozos restart/new-run guidance helper, ha Phase 2 utan is marad tobb belso emitter |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. A review fo kerdese: a runtime recovery valoban eltunt-e a belso grafbol, vagy csak mas neven maradt retained seam.

## Spec Lock

Ez a task artifact `IMPLEMENTABLE`, mert:

1. a mai kodgraf alapjan a tenyleges call-site ownership explicitten le van zarva,
2. a Phase 1 / Phase 2 boundary kimondja, hogy a public surface cleanup kulon marad, de replay-kepes runtime nem maradhat mogotte,
3. a fail-closed behavior konkretan rogzitve van a residualis overlap-path es a watchdog/converged viselkedesere,
4. a validation evidence nemcsak tesztfutast, hanem kodgraf-bizonyitast is megkovetel.
