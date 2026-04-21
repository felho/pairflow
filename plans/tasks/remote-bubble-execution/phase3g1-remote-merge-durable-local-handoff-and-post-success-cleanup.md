---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3g1_remote_merge_durable_local_handoff_and_post_success_cleanup_v1
title: "Remote Bubble Execution Remote Merge Durable Local Handoff and Post-Success Cleanup (Phase 3G1)"
status: implementable
phase: phase3g1-remote-merge-durable-local-handoff-and-post-success-cleanup
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

# Task: Remote Bubble Execution Remote Merge Durable Local Handoff and Post-Success Cleanup (Phase 3G1)

## Feynman Summary / One-Screen Model

1. Started remote bubble merge ma adatveszteses lehet, mert a remote clone cleanup tul koran futhat.
2. Ennek a tasknak a szukitett celja:
   - a remote bubble commit tartosan bekeruljon a lokalis repo-ba direct `git fetch` handoffal,
   - a lokalis merge legyen a durable integration boundary,
   - a remote cleanup kulon, explicit post-success fazis legyen.
3. Ez a task nem ownershipolja a public CLI/help/skill/docs wording alignmentet.
4. Az operatori `--push` / `--delete-remote` route-aware policy kulon successor-owned slice.

## Current Codebase Check / Current-Tree Reality Check (2026-04-21)

1. A started remote merge outer path ma SSH-val belep a remote clone-ba, es ott futtat egy belso `pairflow bubble merge`-et:
   - [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts:126)
2. A belso merge clone workspace eseten merge utan fizikai cleanupot csinal:
   - [src/v11/application/merge/mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts:136)
3. A remote merge success ma `pushedBaseBranch === true` publication proofhoz van kotve:
   - [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts:280)
4. A jelenlegi bridge egyfazisu:
   - remote merge execute,
   - payload parse,
   - outer local reconcile.
   Emiatt nincs explicit post-local-success remote cleanup seam.
5. A current tree-ben nincs kulon `sshBubbleMergeCleanupCommand.ts` seam:
   - a real bounded slice a meglevo `sshBubbleMergeCommand.ts` transport/payload contract,
   - plusz a `runMergeFlow` / dependency-resolution orchestration fokozatos atalakitasan ul.
6. A review-bol kovetkezo bounded-slice korrekcio:
   - eloszor a core durable handoff + cleanup-order closure kell a meglevo merge bridge-en belul,
   - a public/operator contract alignment csak utana jo kulon taskban.

## Parent Plan Fit / Stable Sequencing

1. Ez a task a parent planben explicit `Phase 3G1` cleanup-routing residual successor.
2. A task primer ownershipa:
   - remote merge durable handoff
   - explicit post-success remote cleanup seam
3. A task nem ownershipolja:
   - CLI/help wording,
   - `UsePairflow` CloseBubble wording,
   - README/docs operator contract alignment.
4. Ezek kulon deferred successorban zarulnak.

## Plan Linkage

1. Ez a task a lezartnak hitt archived `Phase 3B2` cleanup-order semanticsat korrigalja, nem uj remote merge route familyt vezet be:
   - [remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md:250)
2. A task explicit successor-impactje:
   - kozvetlenul csak a `Phase 3G2` operator contract alignmentet unlockolja,
   - a korabban archivalt `Phase 3F` open-surface snapshotot nem nyitja ujra:
     [remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md:257)
3. A `Phase 3G2` task-file tovabbra sem justified addig, amig a `Phase 3G1` exit criteria es regresszios ordering proof nincs teljesitve.

## Source-Anchor Consistency

1. Canonical source anchors:
   - [docs/remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md)
   - [src/v11/application/merge/mergeCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeCommandContract.ts)
   - [src/v11/application/merge/mergeCommandDependencyResolution.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeCommandDependencyResolution.ts)
   - [src/v11/application/merge/mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts)
   - [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts)
   - [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts)
2. Closed canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - started remote bubble execution tovabbra is remote clone-ban fut,
   - a laptop tovabbra is control plane,
   - `delete` tovabbra sem publication gate.
3. Uj explicit clarification, amelyet ez a task zar le:
   - started remote bubble merge durable integration authorityja a lokalis repo,
   - remote destructive cleanup csak explicit post-local-success fazisban futhat.
4. `drift_status`: `closed_contract_revised_explicitly`

## Authority Boundary Map

1. `authority_producer`
   - nincs uj authority producer.
2. `persisted_authority`
   - in scope:
   - a lokalis repo hidden refje es a lokalis canonical base branch merge lesz a durable integration authority.
3. `internal_execution_consumers`
   - in scope:
   - remote merge transport/helper,
   - local import/handoff,
   - delayed remote cleanup invocation ugyanabban a merge bridge familyben.
4. `workflow_orchestration_consumers`
   - in scope:
   - remote merge ketfazisu sorrendje:
     - import + local merge
     - post-success cleanup
5. `read_model_consumers`
   - explicit out of scope:
   - CLI/help/docs wording alignment.
6. `cleanup_recovery_consumers`
   - explicit in scope:
   - destructive remote cleanup feltetelrendszere.

## Scope Reality / Shape Proof

1. A current tree-ben a bounded megvalositas a meglevo merge familyn belul marad:
   - remote SSH merge transport,
   - merge application orchestration,
   - merge finalization/result mapping,
   - a kapcsolodo merge tests.
2. A task nem igenyel uj generic remote execution foundationt vagy kulon shared authority-producer layert.
3. Ha uj helper/export kell, annak a legszukebb merge-family targeton kell megszuletnie:
   - ne nyisson uj generic `shared` vagy altalanos remote cleanup frameworkot.
4. A compat consume surface retained marad:
   - a CLI/UI user-facing contract wording es surface ownership explicit out of scope marad,
   - ebben a taskban legfeljebb a merge-family internal result-mapping truth-timingja pontosithato a retained compat shape alatt.

## Closure Budget / Task-Shape Triage

1. `closure_buckets_touched`
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
   - `persisted_authority_or_schema`
2. `collapsed_closures`
   - a meglevo remote merge helper payload contract atalakitasa
   - durable local handoff
   - local merge cutover
   - post-success remote cleanup invocation
3. `why_collapse_is_safe`
   - ugyanaz a bounded merge correctness boundary ownershipolja oket;
   - a current tree-ben ugyanaz a merge route es ugyanaz a SSH helper family zarja oket;
   - mind ugyanahhoz az invarianshoz kell:
     - a bubble commit nem veszhet el remote cleanup miatt.
4. `explicitly_deferred_closures`
   - operator/CLI/help/docs contract alignment
   - route-aware `--push` / `--delete-remote` operator surface policy
5. `primary_task_shape`
   - `fail_closed_hardening`
6. `secondary_task_shape`
   - `consumer_family_alignment`
7. `why_secondary_shape_is_safe`
   - a route/orchestration valtozas csak a fail-closed merge ordering ownershipjat szolgalja;
   - nincs kulon operator read-model vagy docs fallout ugyanebben a taskban.

## Complexity-Risk Triage

1. `risk_score`
   - `5`
2. `split_decision`
   - `single_task_acceptable`
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
   - `0`

## Baseline Preservation

1. `must_preserve_behaviors`
   - lokalis bubble merge retained baseline valtozatlan marad,
   - remote bubble tovabbra is local operator control plane-rol zarodik,
   - delete archive continuity retained baseline marad.
2. `allowed_resolution_paths`
   - remote commit
   - local direct fetch hidden ref ala
   - local merge a lokalis canonical base branchbe
   - explicit post-success remote cleanup
3. `forbidden_regression_interpretations`
   - remote merge nem torolheti el a clone-t a local import/merge elott,
   - remote merge nem hagyhat success allapotot lokalis durable integration nelkul.
4. `replacement_proof_required_if_removed`
   - a mai egyfazisu remote merge bridge csak akkor bonthato meg, ha az uj, meglevo-seamre epulo ketfazisu ordering proof tesztben fedett.

## Precondition and Side-Effect Boundary

1. Validations, amelyeknek remote destructive cleanup elott at kell menniuk:
   - remote mergeable source bizonyitasa
   - local fetch hidden ref ala
   - local merge a lokalis canonical base branchbe
   - local state/lifecycle persist
2. Side effects, amelyek ezek elott tiltottak:
   - remote clone fizikai cleanup
   - remote branch cleanup
   - remote runtime cleanupot success completionnek allito payload
3. Invalid/precondition-failure behavior:
   - merge fail-closed
   - remote cleanup nem fut le
4. Coordination primitives:
   - explicit lock/serialization uj mechanizmus nincs scope-ban;
   - a sorrendi ownershipot a command orchestration es a ketfazisu helper boundary zarja le.

## L0 - Policy

### Goal

1. Started remote bubble merge ne tudjon adatvesztessel vegzodni.
2. A bubble commit keruljon at tartosan a lokalis repo-ba direct `git fetch` handoffal.
3. A remote cleanup csak a sikeres lokalis merge utan futhasson.

### Non-Goals

1. Nincs `git bundle` vagy patch-alapu handoff.
2. Nincs public CLI/help/docs/skill contract alignment ebben a taskban.
3. Nincs operator-facing `--push` / `--delete-remote` semantics rewrite ebben a taskban.

### Business / Control Model

1. Business invariant:
   - remote bubble merge utan a valtozasnak a lokalis repo-ban tartosan jelen kell lennie, kulonben a merge nem sikeres.
2. Control model:
   - started remote bubble execution hostja remote clone,
   - started remote bubble merge durable integration authorityja a lokalis repo,
   - remote clone csak explicit post-success cleanup fazisban takarithato el.
3. Read-path rule:
   - merge success csak bizonyitott local import + local merge utan allithato.
4. Forbidden fallback:
   - cleanup publication/import/merge proof elott,
   - remote clone canonical base branch-et tartos merge targetnek tekinteni.
5. Missing-data rule:
   - ha a remote commit/import proof nem szerezheto meg, a merge fail-closed marad.

## L1 - Command Contract and Sequencing

### Public Contract Clarification

1. Started remote bubble merge ketfazisu core ownershipra valt:
   - remote pre-cleanup handoff payload
   - local import + local merge + local persist
   - post-success remote cleanup
2. A task ebben a fazisban nem valtoztatja a public CLI help contractot; csak a core merge boundaryt zarja le.

### Hidden Ref Policy

1. A local import target hidden ref.
2. Preferalt naming:
   - `refs/pairflow/import/<bubble-id>`
3. A task nem ownershipolja a hidden-ref naming public dokumentalasat vagy operatori expose-olasat; ez belso orchestration detail marad.
4. Ha kesobb megis kell public/operator alignment a hidden-ref semantics korul, az a `Phase 3G2` vagy mas kulon successor ownershipja.

### Remote Merge Transport Contract

1. A remote merge helper current-state merge-success payloadja nem canonical success.
2. A helper outputnak explicitte kell tennie:
   - `remote_commit_sha`
   - importalhato remote ref/commit source
   - hogy destructive cleanup meg nem tortent meg
3. A helpernek el kell hagynia a `pushedBaseBranch === true` publication proofot, mint remote success gate-et.
4. A helper nem adhat olyan success payloadot, amely `removedWorktree` / `removedBubbleBranch` / `runtimeSessionRemoved` vegleges truthkent mar beallitott, mikozben a local merge meg nem tortent meg.
5. Ez a contract valtozas a meglevo `sshBubbleMergeCommand.ts` module-on belul vagy ugyanennek a familynek egy valos sibling exportjan keresztul zarul; kulon cleanup-file nem required-now.

### Remote Handoff Authority Contract

Target-file anchors:
- [src/v11/application/merge/mergeCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeCommandContract.ts:31)
- [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:161)
- [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts:209)

1. A helper payloadnak eleg informaciot kell adnia ahhoz, hogy a laptop lokalis repo-ja ujrafelfedezes nelkul vegrehajthassa a durable importot:
   - vagy kozvetlen fetchable source-specet,
   - vagy annak a megbizhato, tipizalt osszetevoit.
2. A task nem ir elo egyetlen konkret transport-shape-et sem, de a kulso orchestration nem fugghet implicit shell-string parsingtol vagy nem-tipizalt stdout kovetkeztetestol.
3. Ha a payload nem tudja egyertelmuen bizonyitani, honnan es mit kell a lokalis repo-ba importalni:
   - a merge payload-invalid / fail-closed marad,
   - remote cleanup nem indulhat el.

### Local Durable Integration Boundary

1. A canonical success boundary ebben a taskban:
   - local fetch hidden ref ala
   - local merge a lokalis canonical base branchbe (jelenlegi retained baselineben tipikusan `main`)
   - local state/lifecycle persist
2. A remote cleanup dispatch csak ezen boundary utan futhat.
3. Ha a lokalis merge mar megtortent, de a local reconcile/persist fazis elhasal:
   - a command nem reportolhat clean success allapotot,
   - remote cleanup nem futhat le,
   - a durable local integration truth nem veszhet el es nem irhato felul hamis cleanup-success shape-pel.

### Post-Success Cleanup Seam

1. Vezess be kulon explicit remote cleanup seamet:
   - a meglevo merge dependency contractban es default-resolutionben
   - a konkret implementacio lehet a meglevo `sshBubbleMergeCommand.ts` sibling exportja vagy equivalent valos target-file seam
2. Ez a seam csak akkor hivhato, ha:
   - local fetch sikeres,
   - local merge sikeres,
   - local state/lifecycle persist sikeres.
3. Ha ez a fazis elhasal:
   - a merge result nem veszitheti el a lokalis durable integration truthot,
   - a failure cleanup-phase hibakent jelentkezzen.

## L2 - Implementation Notes

1. Vezess be kulon named seamet a local fetch handoffhoz:
   - peldaul `fetchRemoteBubbleCommitIntoLocalRef(...)`
   - ez lehet internal helper a merge application layeren belul; kulon port-file nem required-now
2. Vezess be kulon named seamet a remote post-success cleanup invocationhoz a meglevo merge dependency/default familyben.
3. A `runMergeFlow` remote route-ja ne egyetlen remote helper eredmenyere epitse a full success allapotot, hanem:
   - pre-cleanup remote handoff payload
   - local fetch/import
   - local merge es local finalization
   - csak ezutan remote cleanup invocation
4. A `mergeResultMapping` csak a lokalisan bizonyitott integration utan es a cleanup fazis ismert kimenetevel epitse fel a vegleges remote merge success shape-et.
5. A retained result booleans idozitese explicit legyen:
   - osszhangban a `Remote Merge Transport Contract` szaballyal, a pre-cleanup remote helper tobbe nem kezelheti a `pushedBaseBranch === true` allapotot publication gate-kent vagy success proofkent,
   - ebben a taskban a vegleges retained resultben a `pushedBaseBranch` remote route-on compat-only mezokent marad, es nem allithat publication proofot vagy local `origin` push truthot; ha nem tortent kulon, bizonyitott post-success mapping, maradjon `false`,
   - `removedWorktree` / `removedBubbleBranch` / `runtimeSessionRemoved` sem helper payloadban, sem vegleges success mappingben nem allithato cleanup-complete truthkent a tenyleges post-success cleanup fazis lefutasa elott.

## Acceptance Criteria

1. Started remote bubble merge sikeres, ha:
   - a remote helper pre-cleanup handoff payloadot ad,
   - a payload egyertelmuen bizonyitja, honnan es mit kell a lokalis repo-ba importalni ujrafelfedezes nelkul,
   - a remote bubble commit lokalis hidden ref ala bekerul,
   - a lokalis canonical base branch merge es local persist sikeres,
   - csak ezutan tortenik meg a remote cleanup.
2. Ha a local fetch/import elhasal:
   - a merge fail-closed,
   - remote cleanup nem fut le.
3. Ha a remote helper payload nem bizonyitja egyertelmuen az import source-ot:
   - a merge payload-invalid / fail-closed,
   - remote cleanup nem fut le.
4. Ha a lokalis merge elhasal:
   - a merge fail-closed,
   - remote cleanup nem fut le.
5. Ha a post-success remote cleanup dispatch mar megtortent, de maga a cleanup fazis elhasal:
   - a lokalis durable merge eredmeny megmarad,
   - a hiba kulon cleanup-phase failurekent latszik.
6. Ha a local fetch/import es a lokalis merge mar sikeres, de a local state/lifecycle persist vagy mas local reconcile lepest meg a remote cleanup dispatch elott hiba er:
   - a command nem adhat clean success resultot,
   - remote cleanup nem fut le,
   - a hiba reconcile-phase failurekent latszik ugy, hogy a lokalis durable merge truth megmarad.
7. A regresszios teszt explicit bizonyitja:
   - a mai “cleanup publication proof elott” bug nem tortenhet meg.

## Validation / Evidence

1. Unit:
   - remote merge helper contract mapping a pre-cleanup payloadra
   - payload-invalid fail-closed, ha az import source nincs egyertelmuen tipizalva
   - hidden-ref import orchestration
   - post-success remote cleanup invocation contract
   - retained result boolean truth-timing remote route-on
2. Integration:
   - started remote merge success path local durable importtal
   - fetch failure fail-closed
   - payload-invalid fail-closed import-source ambiguity mellett
   - local merge failure fail-closed
   - local reconcile/persist failure cleanup dispatch nelkul, mikozben a lokalis durable truth megmarad
   - post-success cleanup failure without local data loss
   - regresszios ordering proof arra, hogy cleanup publication/import/merge proof elott nem futhat le

## Done Definition

1. A started remote bubble merge durable local handoffja direct `git fetch` alapu hidden ref importtal mukodik.
2. A destructive remote cleanup explicit post-success fazisba kerul a meglevo merge bridge familyben.
3. A remote merge cleanup sorrendje mar nem enged adatvesztest.
4. A tesztek lefedik a siker-, payload-invalid-, reconcile-failure-, cleanup-failure- es egyeb fail-closed sorrendi eseteket.
