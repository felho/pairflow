---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3g1a_remote_merge_handoff_and_local_success_boundary_v1
title: "Remote Bubble Execution Remote Merge Handoff and Local Success Boundary (Phase 3G1A)"
status: implementable
phase: phase3g1a-remote-merge-handoff-and-local-success-boundary
target_files:
  - src/v11/application/merge/mergeCommandContract.ts
  - src/v11/application/merge/mergeFlowContext.ts
  - src/v11/application/merge/runMergeFlow.ts
  - src/v11/application/merge/mergeFlowFinalization.ts
  - src/v11/application/merge/mergeResultMapping.ts
  - src/v11/application/merge/mergeCommandDependencyResolution.ts
  - src/v11/defaults/merge/mergeCommandDefaults.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts
  - tests/core/bubble/mergeBubble.test.ts
  - tests/contracts/v11/merge.contract.runner.ts
  - tests/v11/application/merge/mergeCommandDependencyResolution.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.test.ts
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
  - docs/remote-bubble-execution.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Merge Handoff and Local Success Boundary (Phase 3G1A)

## Feynman Summary / One-Screen Model

1. A started remote merge most egyetlen remote success payloadra ul, amely keveri a publication/success truthot es a cleanup truthot.
2. Ennek a tasknak a szukitett celja:
   - a remote helper mar ne vegleges merge-success truthot adjon,
   - hanem tipizalt pre-cleanup handoff payloadot,
   - a durable success proof forrasa a local hidden-ref import + local merge + local state persist legyen.
3. Ez a task nem ownershipolja a post-success remote cleanup proof closure-t.
4. Ez a task nem ownershipolja a retained vegleges cleanup booleans es lifecycle-truth alignmentet sem.
5. Ezek a `Phase 3G1B` successor ownershipjaban zarulnak.

## Current Codebase Check / Current-Tree Reality Check (2026-04-21)

1. A current tree-ben a remote route ma egyetlen remote helper eredmenyere ul:
   - [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:161)
2. A remote helper ma meg mindig `pushedBaseBranch === true` publication proofot kovetel, es ugyanabban a payloadban cleanup-shape booleans-t is visszaad:
   - [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts:209)
3. A remote route local finalizationja jelenleg reconcile-only, nem kuloniti el a local durable success boundaryt a cleanup completiontol:
   - [src/v11/application/merge/mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts:41)
4. A retained remote-route result shape kulon file-ban epul, ezert az atmeneti compat mapping ownershipja itt csak akkor auditalhato, ha ez a file is explicit target:
   - [src/v11/application/merge/mergeResultMapping.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeResultMapping.ts:1)
5. Target-file reality:
   - ez elsodlegesen shared merge-contract es success-proof boundary cutover task,
   - nem cleanup-proof parity task,
   - nem operator/read-model alignment task.

## Parent Plan Fit / Stable Sequencing

1. Ez a task a parent plan `Phase 3G` cleanup-routing residualjanak elso bounded closure-ja.
2. Primer ownership:
   - remote merge pre-cleanup handoff payload,
   - local hidden-ref import authority,
   - local hidden-ref import + local merge + local state persist mint canonical durable success boundary.
3. Ez a task nem vallalja:
   - post-success remote cleanup proof parity,
   - retained vegleges cleanup/result/event truth alignment,
   - public CLI/help/skill/docs wording alignment.

## Plan Linkage

1. Parent plan gap closed:
   - a started remote merge canonical success proofje mar nem a remote helper vegleges success payloadja lesz, hanem a lokalis durable integration boundary.
2. Depends on:
   - `plans/archive/tasks/remote-bubble-execution/phase3e-verified-remote-clone-local-request-rework.md`
3. Unlocks / impacts successors:
   - `plans/tasks/remote-bubble-execution/phase3g1b-remote-merge-cleanup-proof-and-result-alignment.md`
   - a parent planban deferred operator-alignment successor (`Phase 3G2`) csak a `Phase 3G1B` utan justified.
4. Task-list impact:
   - a korabbi egyetlen `Phase 3G1` taskot szetvagja `Phase 3G1A` + `Phase 3G1B` successor parra.
5. Inherited validation / exit expectation:
   - remote merge helper mar csak pre-cleanup handoff authorityt ad,
   - local hidden-ref import + local merge + local state persist explicit canonical success proof lesz.

## Task Execution Lock

1. Primary artifact ownership:
   - ennek a bubble-nek az elsodleges outputja ennek a taskfajlnak az in-place refinementje es implementacios lockja.
2. Parent-plan edit policy:
   - a parent plan csak akkor modosithato, ha a `Phase 3G1A` -> `Phase 3G1B` -> a mar deferred operator-alignment successor sorrenddel vagy authority-allitasaival tenyleges drift bizonyithato.
   - drift-bizonyitek alatt itt csak ilyen konkret eltérés ertheto:
   - a parent plan mas predecessor/successor sorrendet allit ehhez a taskhoz,
   - vagy a parent plan authority-forrasa ellentmond a task local durable success boundary contractjanak.
   - jelen task-spec a `2026-04-21 post-ReviewSpec split` parent-plan bejegyzessel egyutt canonical; ugyanezt az anchor-t rogzitjuk lejjebb a `## Source-Anchor Consistency` nyito pontjaban is.
3. Bounded implementation lock:
   - az implementacios ownership a merge-family internal contract cutovert, a dispatch-elotti lokalis prerequisite gate-et, es a local durable success boundary explicit sequencingjet fedi le.
4. Explicit non-ownership lock:
   - ugyanazt a non-goal hatart rogziti, mint a fenti `Parent Plan Fit / Stable Sequencing` es a lenti `### Non-Goals`.
   - explicit post-success cleanup proof,
   - retained vegleges cleanup/result/event truth alignment,
   - public CLI/help/skill/docs alignment nem hozhato be ide "kis konzisztencia-javitas" cimke alatt sem.
5. Successor gate:
   - ha a valtoztatas indoklasa cleanup-complete truthot vagy vegleges booleant igenyel, az mar nem `Phase 3G1A`, hanem `Phase 3G1B`.
   - ha operator wordinget vagy docs/help/read-model surface-at igenyel, az mar a parent planban kulon deferred operator-alignment successorhoz tartozik.

## Source-Anchor Consistency

1. A `Phase 3G1A` primary bounded authorityja ez a taskfajl + a parent plan `2026-04-21 post-ReviewSpec split` bejegyzese:
   - [plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md:268)
   - ez ugyanaz a parent-plan anchor, amelyre a fenti `## Task Execution Lock` parent-plan edit policy is hivatkozik.
2. Repo-local implementation anchors ehhez a closure-hoz:
   - [src/v11/application/merge/mergeCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeCommandContract.ts)
   - [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts)
   - [src/v11/application/merge/mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts)
   - [src/v11/application/merge/mergeResultMapping.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeResultMapping.ts)
   - [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts)
   - [src/v11/shared/metrics/bubbleEvents.ts](/Users/felho/dev/pairflow/src/v11/shared/metrics/bubbleEvents.ts)
   - [src/v11/shared/ports/uiRouter.ts](/Users/felho/dev/pairflow/src/v11/shared/ports/uiRouter.ts)
   - [src/cli/index.ts](/Users/felho/dev/pairflow/src/cli/index.ts)
3. A [docs/remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md) itt csak retained baselinekent hasznalhato:
   - megorzi a remote clone execution-host es laptop control-plane alapelveit,
   - de nem feluliro authority a `Phase 3G` residual merge-success semanticsara.
4. Design-doc conflict marker ehhez a szelethez:
   - a doc `Post-completion sync` szakasza tovabbra is az archived `Phase 3B2` remote-merge + push-to-origin baseline-t irja le,
   - ez a `Phase 3G1A` taskban historical baseline, nem canonical success-proof source,
   - ha a design doc remote push/publication wordingje ellentmond a task local durable success boundary contractjanak, akkor ez a task + parent plan az authority.
5. Closed canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - started remote bubble execution tovabbra is a remote clone-ban fut,
   - a laptop tovabbra is control plane,
   - a remote cleanup tovabbra sem publication gate.
6. Uj explicit clarification, amelyet ez a task zar le:
   - a canonical merge success proof source a lokalis durable integration boundaryre all at.
7. Explicitly deferred clarification:
   - cleanup completion proof,
   - retained vegleges result/status/event truth alignment.
8. `drift_status`: `closed_contract_revised_explicitly`

## Authority Boundary Map

1. `authority_producer`
   - nincs uj producer; a remote helper output contractja szukul pre-cleanup handoff authorityra.
2. `persisted_authority`
   - in scope:
   - local hidden ref,
   - local canonical base-branch merge,
   - local state persist a durable success proof reszekent.
3. `internal_execution_consumers`
   - in scope:
   - remote helper payload mapping,
   - local import/handoff helper,
   - remote merge orchestration.
4. `workflow_orchestration_consumers`
   - in scope:
   - remote route success proof orderingje.
5. `cleanup_recovery_consumers`
   - explicit deferred:
   - post-success cleanup proof closure,
   - cleanup-phase success/failure truth.
6. `read_model_consumers`
   - in scope mint retained compat consumer inventory:
   - merge CLI text/json surface,
   - UI router `UiMergeBubbleResult` typing,
   - package-exported `MergeBubbleResult` typing,
   - publikus merge contract validation surface (`tests/contracts/v11/merge.contract.runner.ts`)
   - explicit deferred:
   - CLI/help/docs/operator wording alignment,
   - consumer-facing semantic rename vagy wording cleanup.

## Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:161) remote route dispatch + returned-result mapping
   - [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts:238) helper payload parse/validation
   - [src/v11/application/merge/mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts:41) remote reconcile/state persist/lifecycle event emit
   - [src/v11/application/merge/mergeResultMapping.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeResultMapping.ts:1) retained `MergeBubbleResult` compat surface centralized builder
   - [src/v11/application/merge/mergeFlowContext.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowContext.ts:50) remote/local route preflight eligibility
   - [tests/v11/application/merge/mergeCommandDependencyResolution.test.ts](/Users/felho/dev/pairflow/tests/v11/application/merge/mergeCommandDependencyResolution.test.ts:13) typed helper-result consumer mock
   - kapcsolodo merge tests
2. Mutation entrypoints in scope:
   - remote merge dispatch a `runMergeFlow` remote agaban
   - local state persist es `bubble_merged` lifecycle event emit a remote route finalizationjaban
3. Hidden scope ruled out:
   - explicit post-success remote cleanup invocation nincs ebben a taskban,
   - retained vegleges cleanup/result truth mapping nincs ebben a taskban,
   - uj generic cleanup framework vagy coordination primitive nincs scope-ban.
4. Branch inventory note:
   - remote dispatch success + local durable success proof
   - dispatch-elotti lokalis precondition fail -> zero remote side effect
   - payload-invalid / import-source ambiguity -> fail-closed
   - local fetch/import failure -> fail-closed
   - local persist failure -> fail-closed
   - cleanup-phase failure branch explicit deferred `Phase 3G1B`
5. A task nem ownershipolja a retained vegleges `MergeBubbleResult` cleanup-boolean alignmentet.
6. A task viszont ownershipolja a returned remote-route `MergeBubbleResult` atmeneti compat mappingjet addig a pontig, amig a `Phase 3G1B` le nem zarja a vegleges cleanup/result truth alignmentet.
7. Ennek a bounded ownershipnak a current-tree target-file megfeleloje a `mergeResultMapping.ts`, nem csak a `runMergeFlow` inline return pathja.
8. A retained result-shape mar most kulso compat consumerekhez is kifut:
   - CLI merge output,
   - UI router result typing,
   - package export typing,
   - publikus merge contract runner normalization/invariant surface.
   Ezek itt csak stable-shape inventorykent in-scope-ok; a consumer wording/truth-surface vegleges alignment successor-owned.
9. Ha uj helper/export kell, a legszukebb merge-family targetban szulethet meg:
   - ne nyisson uj generic cleanup frameworkot.
10. Actual touched scope:
   - primary `contract_or_persisted_authority_foundation`
   - secondary `fail_closed_hardening`
11. Why the declared task shape matches reality:
   - a task ugyanabban a remote merge command pathban zarja le a helper contract cutovert, a dispatch-elotti lokalis zero-side-effect gate-et, es a local durable success boundary fail-closed suppressziojat,
   - a retained read-model consumer hatas itt csak konzervativ compat inventory, nem kulon operator/read-model alignment closure,
   - de nem ownershipolja a kulon cleanup dispatch/proof closure-t, rollback/retry closure-t, vagy retained vegleges cleanup truth surface-t.

## Closure Budget / Task-Shape Triage

1. `closure_buckets_touched`
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `persisted_authority_or_schema`
   - `read_model_consumers`
2. `collapsed_closures`
   - remote handoff payload contract
   - local hidden-ref durable import boundary
   - local merge + state persist success proof cutover
   - dispatch-elotti lokalis prerequisite gate
   - success-result fail-closed suppresszio a local durable boundary hianyaban
   - retained result/event compat consumer inventory
3. `why_collapse_is_safe`
   - ugyanaz a merge-family remote mutation path ownershipolja oket (`mergeFlowContext` -> `runMergeFlow` -> remote finalization),
   - a hardening csak zero-side-effect pre-dispatch gate-re es success-suppressziora terjed ki,
   - a read-model consume itt nem uj surface vagy wording ownership, csak a retained shape konzervativ compat inventoryja,
   - nem vallal cleanup dispatch/proof parityt vagy final cleanup-truth mappinget.
4. `explicitly_deferred_closures`
   - `cleanup_recovery_consumers`
   - retained vegleges result/status/event cleanup truth
   - operator/public CLI/help/skill/docs alignment
5. `primary_task_shape`
   - `contract_or_persisted_authority_foundation`
6. `secondary_task_shape`
   - `fail_closed_hardening`
7. `why_secondary_shape_is_safe`
   - a hardening ugyanabban a bounded command pathban csak azt bizonyitja, hogy invalid dispatch-elotti allapot es local durable proof-hiany mellett nincs remote side effect vagy vegleges success report,
   - nem vezet be kulon cleanup-phase recovery vagy coordination ownershipot.

## Complexity-Risk Triage

1. `risk_score`
   - `5`
2. `split_decision`
   - `single_task_acceptable_after_phase3g1_split_with_explicit_scope_proof`
3. `authority_risk`
   - `2`
4. `surface_spread`
   - `1`
5. `identity_join_risk`
   - `1`
6. `activation_coupling`
   - `0`
7. `prerequisite_risk`
   - `1`
8. `acceptance_multiplicity`
   - `1`

## Baseline Preservation

1. `must_preserve_behaviors`
   - local bubble merge retained baseline valtozatlan marad,
   - remote bubble tovabbra is local operator control plane-rol zarodik,
   - remote cleanup nem futhat local durable success proof elott.
2. `allowed_resolution_paths`
   - remote helper -> pre-cleanup handoff payload
   - local direct fetch hidden ref ala
   - local merge a canonical base branchbe
   - local state persist
   - lifecycle/metrics projection csak a proof boundary utan
3. `forbidden_regression_interpretations`
   - a remote helper payload nem allithat vegleges success/completion truthot,
   - a lokalis durable merge proof nem irhato felul remote publication shorthanddal.
4. `replacement_proof_required_if_removed`
   - a mostani remote helper success contract csak akkor bonthato meg, ha az uj pre-cleanup handoff contract tesztben fedett.

## Success / Completion Proof Boundary

1. Current canonical success proof source:
   - remote helper veglegesnek kezelt success payloadja.
2. Target canonical success proof source:
   - local hidden-ref import + local merge + local state persist.
3. Current canonical completion proof source:
   - nincs explicit kulonvalasztva a success payloadtol.
4. Target canonical completion proof source:
   - successor-owned; `Phase 3G1B`.
5. Reused proof contract:
   - `no_reuse`
6. Proof-parity rule:
   - `no_reuse`
7. Final truth surfaces affected:
   - internal remote merge handoff contract,
   - merge-orchestration success proof ordering,
   - returned `MergeBubbleResult` remote-route compat surface,
   - started remote merge remote-route `bubble_merged` lifecycle event metadata compat surface, de csak projection/reconcile concernkent.
8. Mixed-truth surfaces allowed:
   - returned remote-route result compat inventory:
   - `pushedBaseBranch`
   - `deletedRemoteBranch`
   - `runtimeSessionRemoved`
   - `removedWorktree`
   - `removedBubbleBranch`
   - lifecycle-event metadata oldalon ennek csak a started remote merge remote-route tenyleges snake_case lifecycle-neveknek megfelelo resze jelenhet meg:
   - `pushed_base_branch`
   - `deleted_remote_branch`
   - a `runtimeSessionRemoved`, `removedWorktree` es `removedBubbleBranch` mezok retained result/cleanup-family concernok maradnak, nem kotelezo lifecycle metadata-nevek.
   Ezek a `Phase 3G1A` fazisban csak konzervativ compat inventoryt jelolnek; egyik sem allithat vegleges cleanup/publication truthot.
9. Cross-surface reconciliation note:
   - a returned-result camelCase inventory es a lifecycle-event snake_case inventory nem ugyanannak az egyetlen feluletnek ket naming-variansa,
   - hanem ket kulon retained surface kulon, szandekosan aszimmetrikus inventoryja, es a lifecycle-oldali szukites itt csak a started remote merge remote-route surface-re ervenyes,
   - ezert a lifecycle-event felsorolasban a `runtimeSessionRemoved`, `removedWorktree` es `removedBubbleBranch` omissionje nem ellentmondas, hanem explicit surface-szukites.

## Precondition and Side-Effect Boundary

1. Preconditions, amelyeknek a remote merge dispatch elott at kell menniuk:
   - a lokalis source repo canonical merge targetje feloldhato legyen,
   - a canonical base branch es bubble branch identity feloldhato legyen,
   - ne legyen olyan lokalis prerequisite hiba, amely a kesobbi durable import/merge boundaryt eleve lehetetlenne teszi.
2. Ha ezek a dispatch elotti lokalis preconditionok nem bizonyithatok:
   - nincs remote merge side effect,
   - a flow fail-closed megall.
3. Preconditions, amelyeknek a durable success proof elott at kell menniuk:
   - typed import source proof a helper payloadban,
   - local fetch hidden ref ala,
   - local merge a canonical base branchbe,
   - local state persist.
4. Side effects, amelyek a dispatch elotti lokalis preconditionok vagy a durable success proof elott tiltottak:
   - remote merge dispatch olyan allapotban, ahol a lokalis durable target nem bizonyithato,
   - remote cleanup-complete truth claim,
   - vegleges merge success mapping,
   - optimistic returned-result truth mapping olyan mezokre, amelyeknek a proof source-a a `Phase 3G1B` ownershipja,
   - optimistic lifecycle-event metadata truth mapping ugyanilyen mezokre.
5. Invalid/precondition-failure behavior:
   - merge fail-closed,
   - remote cleanup successor-owned es itt nem indulhat.
6. Lifecycle event temporary rule:
   - a `bubble_merged` event metadata ebben a fazisban csak a local durable success boundary utan kovetkezo projection/reconcile concern lehet,
   - a cleanup/publication mezok itt is csak konzervativ compat erteken maradhatnak, amig a `Phase 3G1B` le nem zarja a vegleges truth alignmentet.
7. Coordination primitives:
   - explicit lock/serialization nincs scope-ban.

## L0 - Policy

### Goal

1. A started remote merge remote helperje pre-cleanup handoff payloadra szukuljon.
2. A canonical durable success proof a lokalis repo-ban zaruljon.
3. A task vegere ne maradjon olyan code path, amely a remote helper payloadjat vegleges success proofkent kezeli.
4. A lifecycle/metrics emit ebben a fazisban csak a siker utan kovetkezo projection/reconcile concern lehet.

### Non-Goals

1. Nincs post-success cleanup proof closure ebben a taskban.
2. Nincs retained vegleges cleanup booleans/result alignment ebben a taskban; csak atmeneti, konzervativ compat mapping ownership van a returned remote-route `MergeBubbleResult` surface-en.
3. Nincs public CLI/help/skill/docs alignment ebben a taskban.

### Business / Control Model

1. Business invariant:
   - a merge csak akkor sikeres, ha a bubble commit a lokalis repo-ban tartosan jelen van.
2. Control model:
   - started remote merge execute hostja remote clone,
   - durable success authorityja a lokalis repo.
3. Read-path rule:
   - remote merge success nem remote helper vegleges payloadjabol all.
4. Forbidden fallback:
   - `pushedBaseBranch === true` publication proof success boundarykent remote route-on.
5. Missing-data rule:
   - ha az import source nem tipizalhato vagy a local import/merge/state persist nem bizonyithato, a merge fail-closed.

## L1 - Command Contract and Sequencing

### Public Contract Clarification

1. A started remote bubble merge internal sequencingje ket closure-ra valik:
   - `Phase 3G1A`: pre-cleanup handoff + local durable success boundary
   - `Phase 3G1B`: post-success cleanup proof + final truth alignment
2. A task ebben a fazisban nem valtoztatja a public CLI help contractot.

### Sequencing Lock

1. Ez a szakasz nem uj orderinget vezet be, hanem a mar fentebb rogzitett sorrendet zarja lock ala:
   - explicit ordering-source szakasz:
   - `## Precondition and Side-Effect Boundary`
   - orderinget is hordozo, de emellett prerequisite-gate es fail-closed szabalyokat is tartalmazo boundary szakasz:
   - `### Local Durable Integration Boundary`
   - consequence/compat constraint szakaszok:
   - `### Returned Result Compat Surface (Temporary Rule)`
   - `### Lifecycle Event Compat Surface (Temporary Rule)`
2. A `Phase 3G1A` canonical sorrendje tomoritve:
   - dispatch-elotti lokalis prerequisite gate
   - remote pre-cleanup handoff payload
   - local hidden-ref import
   - local merge a canonical base branchbe
   - local state persist
   - lifecycle/metrics projection es temporary compat result/event projection
3. Ebben a fazisban nincs megengedett alternativ sorrend, ahol:
   - a remote helper vegleges success truthot allit,
   - a cleanup booleans korabban zarulnak le, mint a local durable boundary,
   - vagy a returned result / lifecycle event optimistic helper-truthot tukroz.
4. A `temporary compat result/event projection` csak kovetkezmeny lehet:
   - nem lehet success gate,
   - nem lehet cleanup-complete proof,
   - nem lehet operator-facing semantics closure.
5. Ezt az orderinget a task exit szintjen is hordozni kell:
   - ordering-proof szerepben az `## Acceptance Criteria` 2. pontja a dispatch-elotti prerequisite gate-et,
   - ordering-proof szerepben a 3. pontja a canonical success pathot (`local hidden-ref import + local merge + local state persist`) rogzíti,
   - ordering-proof szerepben a 4. pontja a proof/projection szetvalasztast rogzíti,
   - boundary-condition proof szerepben a 7. pontja a returned-result compat truth rule-t hordozza,
   - boundary-condition proof szerepben a 9. pontja a lifecycle-event compat truth rule-t hordozza,
   - exit-closure szerepben a `## Done Definition` 1. es 2. pontja csak akkor teljesul, ha ez a sorrend explicit task-kimenet marad.

### Internal Merge-Family Contract Compatibility

1. Az `executeRemoteBubbleMergeCommand` returned shape itt internal merge-family contract:
   - current in-scope consumers:
   - `runMergeFlow` remote route
   - `mergeCommandDependencyResolution` explicit helper-override typing
   - `sshBubbleMergeCommand` tests
2. Ennek a helper-result contractnak a valtozasa ebben a taskban `breaking`, de bounded merge-family/test blast radiusu:
   - a retained public `MergeBubbleResult` surface nem torik,
   - nincs kulso CLI/UI/API consumer, amely az `executeRemoteBubbleMergeCommand` helper-result shape-et kozvetlenul olvasna,
   - minden ismert direct consumer explicit a `target_files` listaban van.
3. A retained `MergeBubbleResult` shape nem torik ebben a fazisban:
   - a surface megmarad,
   - de a cleanup/publication-family mezok atmeneti compat truth surface-kent maradnak a `Phase 3G1B` closeoutig.

### Hidden Ref Policy

1. A local import target hidden ref.
2. Preferalt naming:
   - `refs/pairflow/import/<bubble-id>`
3. A hidden-ref semantics public/operator expose-olasa tovabbra is out of scope.

### Remote Merge Transport Contract

1. A helper output exact required fields-ei ebben a fazisban:
   - `bubbleId`
   - `baseBranch`
   - `bubbleBranch`
   - `mergeCommitSha`
   - `importSource`
   - `cleanupPending`
2. Az `importSource` exact required subfields-ei:
   - `kind`
   - `ref`
   - `commitSha`
3. `remoteCommitSha` nem része a `Phase 3G1A` normativ helper contractnak:
   - a current task-contract mar elegendo durable fetch authorityt kap az `importSource.commitSha` alatt,
   - es ez a task nem zar le olyan downstream authority-consumert, amelyhez a `remoteCommitSha` kotelezo lenne.
   - ezert ezt a mezot el kell hagyni az exact helper shape-bol.
   - ha a current tree valamelyik internal helperben vagy fixture-ben meg atmenetileg jelen van, az nem jelent masodik elfogadhato helper shape-et:
   - a 3G1A validatoroknak es direct consumereknek ezt figyelmen kivul kell hagyniuk,
   - es erre a mezore sem success-proof, sem compat-truth, sem downstream authority nem epulhet.
4. Optional helper fields csak transport/context metadata lehetnek:
   - `tmuxSessionName`
   - `tmuxSessionExisted`
5. A helper-result contractbol ki kell keruljon mint canonical vagy compat success/completion proof:
   - `pushedBaseBranch`
   - `deletedRemoteBranch`
   - `runtimeSessionRemoved`
   - `removedWorktree`
   - `removedBubbleBranch`
6. A `cleanupPending` ebben a fazisban explicit `true` proof:
   - destructive cleanup meg nem tortent meg,
   - a helper pre-cleanup handoff boundaryt adott vissza, nem vegleges completion truthot.
7. A helpernek el kell hagynia a `pushedBaseBranch === true` publication proofot mint canonical success gate-et.
8. A helper nem adhat vegleges cleanup-complete booleans-t.
9. Compatibility classification:
   - helper-result contract: `breaking`, taskon belul teljes consumer-frissitessel
   - returned `MergeBubbleResult`: `non-breaking compat surface`

### Remote Handoff Authority Contract

1. A payload eleg informaciot kell adjon a lokalis repo durable importjahoz ujrafelfedezes nelkul.
2. A kulso orchestration nem fugghet implicit shell-string parsingtol vagy nem-tipizalt stdout kovetkeztetestol.
3. Ha az import source nem bizonyithato:
   - payload-invalid / fail-closed,
   - nincs local durable success proof.

### Local Durable Integration Boundary

1. A canonical success boundary ebben a taskban:
   - local fetch hidden ref ala
   - local merge a canonical base branchbe
   - local state persist
2. A `bubble_merged` lifecycle event emission ebben a fazisban nem resze a canonical success proofnak:
   - a current tree-ben ez `emitBubbleLifecycleEventBestEffort` uton fut,
   - ezert itt metrics/lifecycle projectionnek szamit, nem proof-critical durable boundary-lepesnek.
3. A remote route nem reportolhat tiszta success allapotot a fenti fetch + merge + state persist boundary nelkul.
4. Ha a merge mar megtortent, de a local persist elhasal:
   - a command nem adhat vegleges success resultot.
5. Ha a local state persist mar lezart, a kesobbi lifecycle/metrics emit legfeljebb projection/reconcile concern:
   - nem irhatja at visszafele a canonical success proof forrasat,
   - es nem teheto implicit proof-critical lepesse ebben a taskban.
6. A remote merge dispatch nem indulhat el olyan lokalis allapotbol, ahol a canonical merge target vagy a lokalis durable import/merge boundary prerequisite-jei mar a dispatch pillanataban invalidak.
7. A dispatch-elotti lokalis prerequisite gate exact ownershipja:
   - canonical base branch identity resolve
   - bubble branch identity resolve
   - local import target es hidden-ref target kiszamithatosaga
   - barmelyik hianya eseten nincs remote merge dispatch
8. Ez a task nem vallal rollback/retry semanticsat:
   - fail-closed dispatch-stop vagy success-suppresszio a megengedett bounded behavior.

### Returned Result Compat Surface (Temporary Rule)

1. A remote route a retained `MergeBubbleResult` shape-et ebben a fazisban is visszaadja.
2. A returned result surface itt nem vegleges cleanup/completion truth, hanem atmeneti compat surface.
3. A retained shape mar most kifut ilyen consumer csaladokra:
   - CLI merge text/json output,
   - UI router result typing,
   - package-exported merge result typing.
   Ezek ebben a fazisban stable-shape consumerek, nem vegleges wording- vagy operator-truth closurek.
4. Explicit mező-authority híd a szukitett helper contract es a retained public result kozott:
   - helper-pass-through transport metadata:
   - `tmuxSessionName`
   - `tmuxSessionExisted`
   - retained public compat mezok, de nem helper-authority:
   - `pushedBaseBranch`
   - `deletedRemoteBranch`
   - `runtimeSessionRemoved`
   - `removedWorktree`
   - `removedBubbleBranch`
   - successor-owned vegleges truth closure:
   - a cleanup/publication-family booleans vegleges authorityja tovabbra is `Phase 3G1B`.
5. A `Phase 3G1B` closeoutig az olyan mezok, amelyeknek a proof source-a nem a local durable success boundary:
   - `pushedBaseBranch`
   - `deletedRemoteBranch`
   - `runtimeSessionRemoved`
   - `removedWorktree`
   - `removedBubbleBranch`
   nem epulhetnek a pre-cleanup helper payload vegleges truthjakent.
6. Ha ezekre a mezokre a `Phase 3G1A` nem tud local-boundary vagy explicit retained cleanup-authority proofot adni, a returned remote-route resultben konzervativ compat erteken kell maradniuk:
   - tipikusan `false`
7. `tmuxSessionName` es `tmuxSessionExisted` ebben a fazisban legfeljebb transport/context metadata lehet:
   - nem ertelmezheto cleanup-complete proofkent.
8. A publikus merge-result / contract validation surface ebben a taskban explicit audit/update scope:
   - a retained public `MergeBubbleResult` shape-re epulo contract normalization vagy cleanup-invariant nem maradhat implicit,
   - a `tests/contracts/v11/merge.contract.runner.ts` surface-et ehhez a temporary compat rule-hoz auditálni kell,
   - es ha a current public contract suite ma meg cleanup-complete success truthot var el, azt a `Phase 3G1A` preserved compat contractjahoz kell igazítani, nem szabad rejtett ellentmondásként bent hagyni.

### Lifecycle Event Compat Surface (Temporary Rule)

1. Ez a temporary compat szabaly kifejezetten a started remote merge remote-route `bubble_merged` lifecycle-event surface-ere vonatkozik.
2. Nem altalanos merge-route metadata-szukites:
   - a local merge route existing lifecycle metadata inventoryja ebben a taskban nem ujraertelmezett scope,
   - ez a task itt csak azt rogziti, hogy a started remote merge remote-route milyen metadata-truthot allithat konzervativan a `Phase 3G1A` alatt.
3. A started remote merge remote-route `bubble_merged` lifecycle event metadata ebben a fazisban nem lehet vegleges cleanup/completion truth surface, es nem resze a canonical success boundarynak.
4. A current tree lifecycle-event metadata surface-e itt szukebb, mint a retained public merge result:
   - `pushed_base_branch`
   - `deleted_remote_branch`
   - barmely jovo beli cleanup-complete metadata ugyanebben a csaladban.
5. A `Phase 3G1B` closeoutig ezek nem epulhetnek optimistic helper-payload truthra.
6. Ha a `Phase 3G1A` ezekre nem ad local-boundary proofot, a metadata csak konzervativ compat erteket vagy explicit omissiont hasznalhat.
7. Az itteni metadata-enumeration szandekosan szukebb, mint a helper transport contract es a retained public merge result:
   - a `tmuxSessionName` es `tmuxSessionExisted` transport/context metadata marad,
   - ezert nem kell oket a cleanup-truthot allito lifecycle metadata csaladba emelni.
   - a retained public resultben kotelezo `runtimeSessionRemoved`, `removedWorktree` es `removedBubbleBranch` mezok itt szandekosan nincsenek lifecycle-event metadata csaladkent felsorolva:
   - ezek ebben a fazisban retained result/cleanup-family concernok, nem a mostani `bubble_merged` event kotelezo metadata-csaladjanak nevei,
   - ezert a lifecycle-event szabaly itt csak azokra a metadata-nevekre beszel explicitten, amelyeket ez a fazis mar most is lifecycle-truth surface-kent kockazatosnak tekinthet,
   - es ez visszakot a fenti `Cross-surface reconciliation note`hoz: a returned-result inventory es a lifecycle inventory nem 1:1 mezo-nevparitasra epul.

### Deferred Cleanup Successor Boundary

1. A post-success remote cleanup proof closure nem itt zarul.
2. Ez a task legfeljebb az ehhez szukseges internal seamet keszitheti elo.
3. A retained vegleges cleanup/result/event truth mapping a `Phase 3G1B` ownershipja.
4. A `Phase 3G1B` mar stabil inputkent orokolje:
   - a pre-cleanup helper-result contractot
   - a local durable success boundary explicit truthjat
   - a temporary compat mapping conservative szabalyait

### Successor Rejection Matrix

1. `Phase 3G1B`-re kell deferalni minden olyan igenyt, amely:
   - explicit remote cleanup dispatch outcome-ot,
   - cleanup success/failure taxonomy-t,
   - retained vegleges cleanup/result/event boolean truth alignmentet ker.
2. A parent planban mar deferred operator-alignment successorra (`Phase 3G2`) kell deferalni minden olyan igenyt, amely:
   - CLI/help/skill/docs wordinget,
   - operator-facing merge completion narrativat,
   - vagy read-model semantics magyarazatot akar ebben a taskban atirni.
   - ez a task ugyanarra a deferred operator-alignment successorra hivatkozik, amelyet a `## Plan Linkage` is `Phase 3G2` neven azonosit.
3. Ha egy valtoztatas egyszerre igenyelne `Phase 3G1A` success-boundary cutovert es `Phase 3G1B` cleanup proof closure-t:
   - ezt a task-spec szerint szet kell tartani,
   - az `3G1A` legfeljebb a successor seam prerequisite-jeit keszitheti elo.

## Docs-Only Review Readiness Note

1. Ez a szakasz nem uj implementacios readiness allitast vezet be a frontmatter `status: implementable` fole.
2. A docs-only refinement ebben a korben csak azt bizonyitja, hogy:
   - a bounded ownership explicit,
   - a predecessor (`plans/archive/tasks/remote-bubble-execution/phase3e-verified-remote-clone-local-request-rework.md`) es a kotelezo successor (`plans/tasks/remote-bubble-execution/phase3g1b-remote-merge-cleanup-proof-and-result-alignment.md`) linkje rögzitett,
   - a local durable success boundary es a temporary compat szabalyok mar nem implicit reviewer-inference-kent szerepelnek.
3. A parent plan valtozatlansaga itt csak scope-containment allitas:
   - a plan-linkage drift jelen dokumentumban nem bizonyitott, ezert a task a meglévő `post-ReviewSpec split` bejegyzesre marad visszakotve.
4. Docs-only validation target ebben a korben:
   - a taskbol egyertelmuen kiolvashato legyen, mit kell `Phase 3G1A`-ban megcsinalni,
   - es mi az, amihez mar successor task kell.

## L2 - Implementation Notes

1. Vezess be kulon named seamet a local fetch handoffhoz.
2. A `runMergeFlow` remote route-ja ne egyetlen remote helper eredmenyere epitse a full success allapotot.
3. A remote route belsoen kulonitse el:
   - pre-cleanup handoff payload
   - local hidden-ref import + local merge + local state persist proof
4. Ha uj intermediate typed outcome kell a successor cleanup phase-hez, az internal merge-family contractkent itt bevezethet.
5. A returned remote-route `MergeBubbleResult` kapjon explicit ideiglenes compat mapping szabalyokat, hogy a helper payload kivaltasa mellett se maradjon implicit vagy optimistic final-truth surface.
6. A retained vegleges cleanup boolean mapping ne zaruljon le ebben a taskban.
7. Az `sshBubbleMergeCommand` parsere ne publication-required gate-kent kezelje a helper payloadot, hanem typed pre-cleanup handoff contract validator-kent.
8. A dispatch-elotti lokalis prerequisite gate a remote route entrypoint kozeleben maradjon; ne csusszon at a successor cleanup phase-be.

## Acceptance Criteria

1. A remote helper pre-cleanup handoff payloadot ad, amely egyertelmuen bizonyitja az import source-ot.
2. A remote merge dispatch csak akkor indulhat el, ha a lokalis canonical merge target es a durable import/merge boundary dispatch-elotti prerequisite-jei mar bizonyithatok.
3. A remote route canonical success proofje a local hidden-ref import + local merge + local state persist boundaryre all at, es ez a sorrend a dispatch-elotti prerequisite gate utan explicit task-szintu orderingkent marad rogzítve.
4. A lifecycle/metrics emission ebben a fazisban projection vagy kovetkezmeny marad:
   - nem resze a canonical success proofnak,
   - es nem teheto implicit proof-critical lepesse.
5. A remote helper nem allithat publication/cleanup shorthandot vegleges success proofkent.
6. Ha az import source, local fetch, local merge vagy local persist barmelyike elhasal:
   - a merge fail-closed marad.
7. A returned remote-route `MergeBubbleResult` surface-re explicit atmeneti compat szabaly vonatkozik:
   - a cleanup/publication vegtruth-mezok (`pushedBaseBranch`, `deletedRemoteBranch`, `runtimeSessionRemoved`, `removedWorktree`, `removedBubbleBranch`) nem epulhetnek optimistic helper-payload truthra,
   - es ha a `Phase 3G1A` nem bizonyitja oket local-boundary alapon, konzervativ erteken maradnak.
8. A helper/result bridge explicit marad:
   - `tmuxSessionName` es `tmuxSessionExisted` helper-pass-through transport metadata,
   - a retained public cleanup/publication mezok vegleges authorityja tovabbra is successor-owned vagy konzervativ compat projection.
9. A started remote merge remote-route `bubble_merged` lifecycle event metadata ugyanilyen atmeneti compat szabaly alatt marad:
   - cleanup/publication truth csak local-boundary proof alapjan allithato,
   - egyebkent konzervativ compat vagy explicit omission marad.
10. A publikus `MergeBubbleResult` / contract validation surface explicit audit/update scope marad ebben a taskban:
   - a retained public compat contractot es a hozza tartozo contract runner surface-et a 3G1A temporary compat szabalyhoz kell igazitani,
   - vagy explicit preserved contractkent kell leirni, de rejtett cleanup-invariant ellentmondas nem maradhat.
11. A task explicit successor-boundaryt hagy a cleanup proof/result alignment closure-nek.
12. A `remoteCommitSha` nem resze a 3G1A normativ helper contractnak:
   - az exact helper shape-bol hianyzik,
   - egy esetleges legacy belso jelenlet nem hoz letre masodik elfogadhato helper shape-et,
   - es a 3G1A validatorok vagy direct consumerek nem epulhetnek ra.
13. A docs-only primary output ebben a korben maga ez a taskfajl:
   - a docs-only primary outputnak in-place task refinementkent ki kell mondania a bounded ownershipot, a sequencing lockot es a successor defer boundaryt anelkul, hogy uj standalone synthesis artifactot vezetne be.

## Validation / Evidence

1. Unit:
   - remote helper payload mapping exact required/optional mezokkel pre-cleanup handoffra
   - `remoteCommitSha` nincs benne a 3G1A normativ helper-contractban; egy esetleges legacy belso jelenlet sem hoz letre masodik elfogadhato helper shape-et, es sem validator, sem direct consumer nem epulhet ra
   - helper-result direct consumer update (`mergeCommandDependencyResolution` typed override mock)
   - dispatch-elotti lokalis prerequisite gate fail-closed
   - payload-invalid fail-closed import-source ambiguity mellett
   - local durable import boundary wiring
   - started remote merge remote-route lifecycle-event emit best-effort projection marad, nem canonical success proof boundary
   - started remote merge remote-route lifecycle-event compat metadata mapping a `Phase 3G1B` elotti atmeneti allapotban
   - publikus merge contract validation surface audit/update (`tests/contracts/v11/merge.contract.runner.ts`) a 3G1A temporary compat szabalyhoz igazitva
2. Integration:
   - started remote merge pre-cleanup handoff + local durable merge proof
   - dispatch-elotti prerequisite gate -> local durable success boundary -> lifecycle/compat projection ordering explicit task-szintu bizonyitasa
   - dispatch-elotti lokalis prerequisite hiba eseten nincs remote merge dispatch
   - fetch/import failure fail-closed
   - local persist failure fail-closed
   - helper-pass-through metadata es retained public compat mezok authority-hidja explicitten bizonyitott
   - publikus `MergeBubbleResult` / contract runner surface preserved compat vagy auditált update alakban explicitten rendezett
   - conservative returned-result compat mapping remote route-on a `Phase 3G1B` elotti atmeneti allapotban
   - conservative lifecycle-event metadata mapping csak a started remote merge remote-route surface-en a `Phase 3G1B` elotti atmeneti allapotban
3. Regression:
   - a remote helper output tobbe nem hasznalhato onmagaban vegleges merge success proofkent
   - a lifecycle-event emit nem valhat implicit proof-critical success boundary-ve.
   - a remote helper output es a local reconcile nem hasznalhato cleanup-complete lifecycle-event truthkent.
   - a helper payload field-set drift (`pushedBaseBranch` publication gate vagy cleanup booleans) azonnal payload-invalid / contract-failure kategoriaba esik.
   - a retained `MergeBubbleResult` shape tovabbra is stabil marad a CLI/UI/export consume szamara, de a cleanup/publication mezok csak konzervativ compat truthot allithatnak.
   - a `Phase 3G1A` explicit successor-boundarya retained marad: a cleanup proof/result alignment closure tovabbra is `Phase 3G1B` ownership.

## Done Definition

1. A started remote merge internal contractja mar pre-cleanup handoff authorityra ul.
2. A local hidden-ref import + merge + state persist explicit canonical success proof lesz; a lifecycle/metrics emit csak utobbi projection marad.
3. A retained public result es lifecycle metadata Phase 3G1A alatti authorityja explicitten le van irva:
   - helper-pass-through transport metadata,
   - konzervativ compat projection,
   - es successor-owned cleanup truth kulon van tartva.
4. A post-success cleanup proof es final truth alignment kulon successor taskkent marad.
5. A docs-only closeoutban az elsodleges kimenet ennek a taskfajlnak az in-place refinementje:
   - a taskfile explicit bounded ownershipot, sequencing lockot es successor defer boundaryt tartalmaz,
   - es a docs-only primary output ugyanennek a taskfajlnak az in-place refinementje marad, nem helyettesitodik uj kulon review/synthesis dokumentummal.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | A `Phase 3G1B` closeout utan vizsgaljuk felul, hogy a helper-result transport metadata (`tmuxSessionName`, `tmuxSessionExisted`) bent maradjon-e, vagy teljesen a remote pointer/context familybe keruljon vissza. | L2 | P2 | later-hardening | ReviewSpec 2026-04-21 | Döntsük el a cleanup/result alignment lezárása után, szükség van-e további contract-szűkítésre. |
