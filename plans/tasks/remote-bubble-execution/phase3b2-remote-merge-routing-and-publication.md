---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3b2_remote_merge_routing_and_publication_v1
title: "Remote Bubble Execution Remote Merge Routing And Publication (Phase 3B2)"
status: implementable
phase: phase3b2-remote-merge-routing-and-publication
target_files:
  - src/cli/commands/bubble/merge.ts
  - src/cli/index.ts
  - src/v11/application/merge/emitMergeV11.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - src/v11/application/merge/mergeCommandContract.ts
  - src/v11/application/merge/mergeCommandDefaults.ts
  - src/v11/application/merge/mergeCommandDependencyResolution.ts
  - src/v11/application/merge/mergeCommandErrorClassification.ts
  - src/v11/application/merge/mergeCommandOrchestration.ts
  - src/v11/application/merge/mergeFlowContext.ts
  - src/v11/application/merge/mergeFlowFinalization.ts
  - src/v11/application/merge/mergeFlowTypes.ts
  - src/v11/application/merge/mergeResultMapping.ts
  - src/v11/application/merge/runMergeFlow.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/shared/merge/mergeCommandErrorNormalization.ts
  - src/v11/shared/merge/mergeRoutingEligibility.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts
  - tests/cli/bubbleMergeCommand.test.ts
  - tests/contracts/v11/merge.contract.runner.ts
  - tests/core/bubble/mergeBubble.test.ts
  - tests/core/ui/router.test.ts
  - tests/v11/application/merge/mergeCommandErrorClassification.test.ts
  - tests/v11/application/merge/mergeCommandErrorNormalization.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Merge Routing And Publication (Phase 3B2)

## Feynman Summary / One-Screen Model

1. A `Phase 3B1` lezarta a remote started bubble `commit` routingot es a retained local commit continuityt.
2. A `Phase 3B2` ugyanezt a cleanup family kovetkezo szeletara terjeszti ki, de csak a `merge` commandra.
3. A bounded szelet:
   - remote started bubble merge nem a laptop local repo merge-preflightjara es local git merge-jere ul,
   - hanem a remote clone canonical Pairflow merge pathjan fut,
   - a merge successhez explicit durable publication tartozik,
   - majd a local control-plane retained `MergeBubbleResult` continuityt kap bounded local reconcile-lel.
4. A task itt nem nyitja meg a teljes bubble delete/archive/recovery familyt:
   - `Phase 3B3`: remote delete cleanup and archive closure
   - `Phase 3C`: recovery/docs/rollout

## Current Codebase Check / Current-Tree Reality Check (2026-04-18)

1. A merge path ma local repo authorityra ul:
   - [mergeFlowContext.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowContext.ts:20)
   - [runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:20)
   - a preflight a local repo cleanlinesset es a local `bubble_branch` letezeset ellenorzi, majd ugyanott futtat `git merge`-t.
2. A publication semantics ma implicit local repo/origin surface:
   - [runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:61)
   - `push` es `deleteRemote` a laptop local repo `origin` remote-javal dolgozik.
3. A finalize shape ma local cleanupra ul:
   - [mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts:18)
   - tmux/runtime/workspace cleanup a local dependencies-en fut, majd local `state.json` update tortenik.
4. A retained result shape mar letezik:
   - [mergeCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeCommandContract.ts:29)
   - a CLI summary is erre ul [index.ts](/Users/felho/dev/pairflow/src/cli/index.ts:724).
5. A merge UI consumer surface mar most is el:
   - [uiRouter.ts](/Users/felho/dev/pairflow/src/v11/shared/ports/uiRouter.ts:140)
   - [routerDefaults.ts](/Users/felho/dev/pairflow/src/v11/defaults/ui/routerDefaults.ts:19)
   - [routerActionDispatch.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/ui/routerActionDispatch.ts:142)
   - ez ugyan retained result consumer, de nem hagyhato ki a bounded slice bizonyitasabol.
6. Target-file reality:
   - ez mutation entrypoint + publication semantics + cleanup/fail-closed task,
   - nem read-model task,
   - nem delete/archive task,
   - nem generic SSH executor foundation.

## Parent Plan Fit / Stable Sequencing

1. A parent plan a `Phase 3B1 -> Phase 3B2 -> Phase 3B3 -> Phase 3C` sorrendet varja el.
2. Ez a task a cleanup routing split masodik bounded szelete:
   - remote merge route,
   - durable publication policy,
   - bounded merge-completion reconcile a retained local merge/publication continuityhoz.
3. Ez a task nem vallalja:
   - remote delete confirmation es archive closure,
   - bubble metadata archive/delete semantics,
   - recovery runbook vagy rollout docs.

## Plan Linkage

1. Parent plan gap closed:
   - a `Phase 3B2` plan-gap, ahol a remote merge mar nem local laptop repo authorityra ul, es a publication semantics explicitte valik.
2. Depends on:
   - `plans/archive/tasks/remote-bubble-execution/phase3b1-remote-commit-routing-and-continuity.md`
3. Unlocks / impacts successors:
   - `plans/tasks/remote-bubble-execution/phase3b3-remote-delete-cleanup-and-archive-closure.md`
   - `plans/tasks/remote-bubble-execution/phase3c-recovery-diagnostics-and-rollout.md`
4. Task-list impact:
   - refine-only a parent plan jelenlegi `Phase 3B2` placeholderjat materializalja.
5. Inherited validation / exit expectation:
   - remote merge routing + durable publication policy tests,
   - retained merge result continuity proof local repo merge/push fallback nelkul.

## Source-Anchor Consistency

1. Source anchors:
   - [remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md:151)
   - [phase3b1-remote-commit-routing-and-continuity.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase3b1-remote-commit-routing-and-continuity.md:394)
   - [phase1e-local-clone-lifecycle-cleanup-alignment.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase1e-local-clone-lifecycle-cleanup-alignment.md:269)
   - [remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md:467)
2. Canonical elements:
   - `remote.json(kind="started")` a remote merge outer-route authorityja.
   - remote started bubble merge truthja a remote canonical merge flow + durable publication.
   - a laptop local checkout merge utan sem modositodik automatikusan.
   - `MergeBubbleResult` retained caller contract marad.
3. Guard elements:
   - local repo cleanliness,
   - local `bubble_branch` letezese,
   - local `origin` remote elerhetosege
   ezek remote started bubble eseten nem maradhatnak canonical merge/publication truthkent.
4. Compat-only elements:
   - retained local `MergeBubbleResult` shape,
   - CLI/UI consume booleans (`pushedBaseBranch`, `deletedRemoteBranch`, `removedWorktree`, `removedBubbleBranch`).
5. Forbidden reinterpretations:
   - remote merge nem jelent local laptop repo `git merge`-t utolagos sync magyarazattal,
   - remote merge success nem jelenthet csak "remote clone-ban merged, de nem durable-on published" allapotot,
   - `deletedRemoteBranch` nem reinterpretalhato a remote clone branch cleanup-jakent, ha a field tovabbra is origin remote branch torlest jelent.
6. `drift_status`: `closed_contract_preserved`

## Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - [mergeFlowContext.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowContext.ts:20)
   - [runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:20)
   - [mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts:18)
   - [worktreeManager.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/workspace/worktreeManager.ts:321)
   - [merge.ts](/Users/felho/dev/pairflow/src/cli/commands/bubble/merge.ts:88)
   - [uiRouter.ts](/Users/felho/dev/pairflow/src/v11/shared/ports/uiRouter.ts:140)
   - [routerDefaults.ts](/Users/felho/dev/pairflow/src/v11/defaults/ui/routerDefaults.ts:19)
   - [routerActionDispatch.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/ui/routerActionDispatch.ts:142)
2. Actual touched scope:
   - `consumer_family_alignment` + bounded `fail_closed_hardening`
3. Mutation entrypoints in scope:
   - `mergeBubbleCommandOrchestration(...)`
   - `runMergeFlow(...)`
   - remote merge helper seam
   - merge finalization/result mapping
   - UI merge action dispatch ugyanazon retained result contract consume-javal
4. Hidden scope ruled out:
   - a UI merge surface passive retained-result consume, nem kulon read-model vagy activation family,
   - status/list/attach read-model nincs a touched merge filesban,
   - delete/archive bubble metadata closure nincs a merge familyben,
   - remote create/start activation nincs a merge familyben.
5. Branch inventory note:
   - local bubble retained,
   - remote started bubble success,
   - remote started bubble merge-conflict,
   - remote started bubble publication failure,
   - remote started bubble payload/reconcile failure.
6. Why the declared task shape matches reality:
   - ugyanazon merge-family mutation path dont a route-rol, publicationrol, es retained result continuityrol; delete/archive/recovery consumer family nincs ugyanebben a bounded sliceban.

## L0 - Policy

### Goal

Lezarni a remote started bubble `merge` routingot ugy, hogy:
1. a merge mutation authorityja explicit remote canonical merge command legyen,
2. a merge successhez explicit durable publication tartozzon,
3. retained local `MergeBubbleResult` continuity bounded local reconcile-lel zaruljon,
4. delete/archive/recovery scope ne nyiljon meg.

### Domain / Control Model Summary

1. Business invariant:
   - started remote bubble merge truthja a remote clone canonical merge flow, nem a laptop local checkout.
2. Control model:
   - local bubble -> retained local merge flow,
   - remote created/missing pointer -> explicit start-first fail-closed,
   - remote started pointer -> remote merge helper -> remote canonical merge + durable publication -> bounded local reconcile -> retained local result.
3. Read-path / mutation-path rule:
   - remote merge success contract nem local branch-letezesbol vagy local git statusbol all,
   - a local caller typed remote merge resultet consume-ol,
   - a local laptop checkout merge utan sem lesz implicit mutation target.
4. Allowed resolution path:
   - resolve started remote target
   - execute bounded remote merge command a remote clone canonical contextjaban
   - require durable publication proof a merge successhez
   - bounded local reconcile a retained `MergeBubbleResult` es a local control-plane continuity iranyaba
5. Forbidden fallback:
   - remote started bubble eseten local repo merge preflight + local `git merge`,
   - remote merge success publication nelkul,
   - local checkout auto-update / auto-pull merge continuity cimke alatt.
6. Missing-data rule:
   - missing/created pointer -> start-first hiba,
   - invalid remote target -> explicit invalid-target hiba,
   - transport/payload/publication/reconcile hiba -> nincs local merge success mapping,
   - partial remote merge/publication failure recoveryje explicit later phase vagy manual guidance, nem csendes local success.

### Authority Boundary Map

1. `authority_producer`
   - retained started remote pointer
   - remote canonical merge command
   - remote publication step ugyanabban az authority chainben
2. `persisted_authority`
   - remote clone/base-branch git truth
   - durable origin publication a success proof reszekent
   - local `state.json` merge utan csak continuity metadata, nem canonical merge truth
3. `workflow_orchestration_consumers` in scope
   - CLI merge entry
   - application merge orchestration
   - UI merge action dispatch + retained `UiMergeBubbleResult` consume surface
   - contract runner / tests
4. `cleanup_recovery_consumers` in scope
   - merge finalization
   - cleanup/result mapping
   - publication failure taxonomy
5. Explicit out-of-scope consumers
   - delete command
   - archive cleanup
   - status/list/attach
   - recovery docs/runbook

### Baseline Preservation

1. Must-preserve behaviors:
   - local merge behavior valtozatlan,
   - local `MergeBubbleResult` shape retained,
   - a laptop local checkout merge utan sem modositodik automatikusan remote bubble eseten.
2. Allowed resolution paths:
   - local bubble: retained local merge path,
   - remote started bubble: remote merge + durable publication + bounded local reconcile + retained result mapping.
3. Forbidden regression interpretations:
   - a remote route nem generic delete/archive router,
   - `pushedBaseBranch` remote started bubble eseten a canonical remote publication eredmenyet jelenti, nem local laptop push side effectet,
   - `removedBubbleBranch` remote started bubble eseten a canonical remote cleanup eredmenyet jelentheti; ez nem moshato ossze `deletedRemoteBranch` origin-semantikajaval.
4. Replacement proof required if removed:
   - ha a retained `MergeBubbleResult` shape vagy a local checkout untouched policy megszunne, explicit replacement contract kell; ez ebben a taskban nem engedelyezett.

### In Scope

1. Started remote bubble merge routing.
2. Bounded remote merge helper.
3. Explicit durable publication policy a remote started merge successhez.
4. Bounded local merge-completion reconcile a retained `MergeBubbleResult` continuityhoz.
5. Merge error/publication taxonomy parity CLI consume iranyba.

### Out of Scope

1. Remote delete cleanup and archive closure
2. Bubble metadata archival/deletion
3. Recovery/runbook/docs
4. Generic multi-command SSH cleanup router

### Target File Precision

1. A scope a front matterben felsorolt merge-centric file-kre szukul.
2. A helper placement lehet equivalent narrow file, de csak merge family boundaryn belul.
3. Ha a task status/list/attach/delete/archive production file-t igenyelne, az scope blocker.

### Closure-Budget Triage

1. Touched closures:
   - `shared_contract`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
2. Intentionally collapsed closures:
   - merge route selection + publication success policy + bounded local reconcile
3. Why collapse is safe:
   - ugyanazon merge-family command pathban jelennek meg,
   - ugyanaz a retained result contract fogja ossze oket,
   - nincs kulon read-model vagy delete/archive consumer fallout ugyanebben a taskban.
4. Explicitly deferred closures:
   - remote delete cleanup/archive closure
   - recovery guidance
   - rollout docs

### Bounded Task Shape

1. Primary shape: `consumer_family_alignment`
2. Secondary shape: `fail_closed_hardening`
3. Why the mix is safe:
   - publication es reconcile failurek ugyanazon merge mutation path correctness-szabalyai,
   - nem vezetnek kulon coordination primitive vagy kulon delete/archive ownership taskhoz.

### Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - remote pointer started es valid targetre oldhato,
   - remote merge typed success payloadot ad,
   - durable publication policy teljesul,
   - bounded local reconcile a retained resulthez sikerul.
2. Side effects forbidden before these validations pass:
   - local merge success return,
   - local retained result success mapping,
   - local checkout barmilyen implicit update-je.
3. Invalid/precondition-failure behavior:
   - explicit fail-closed hiba,
   - nincs local repo merge fallback,
   - nincs local success mapping publication vagy reconcile proof nelkul.
4. Coordination primitives:
   - `N/A` ebben a taskban; explicit deferred.

### Safety Defaults

1. Started remote pointer nelkul nincs remote merge route.
2. Durable publication proof nelkul nincs remote merge success.
3. Bounded local reconcile nelkul nincs retained local merge success.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - `MergeBubbleResult`
   - merge CLI success semantics
   - merge error surface

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: started remote pointer -> remote clone merge -> remote publication -> retained local result mapping
   - competing identifiers or fallback identities: local repo branch existence, local repo cleanliness, local origin push path
10. Authority/source-of-truth note:
   - canonical source: remote canonical merge + publication chain
   - forbidden secondary sources: laptop local repo merge/push path remote started bubble eseten
11. Single-task exception proof:
   - a `risk_score=7` default szerint split eros jelolt lenne, de itt nincs uj authority producer closure, nincs persisted schema/contract migration, es az extra UI surface ugyanannak a retained merge result contractnak a passziv consume-ja,
   - emiatt a publication policy + result-shape consume nem kulon read-model vagy activation task, hanem ugyanazon merge-family consumer alignment boundary resze.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | Remote started bubble merge truthja a remote canonical merge+publication flow. | Local laptop repo merge path remote started bubble eseten nem futhat. | P1 | required-now |
| Control model | Retained local merge result continuity typed remote eredmenybol jon. | Result mapping nem epulhet local git preflight truthra. | P1 | required-now |
| Read/mutation path rule | Started pointer -> remote merge helper -> durable publication -> bounded local reconcile -> retained `MergeBubbleResult`. | Nincs "merged somewhere but not durably published" success. | P1 | required-now |
| Forbidden fallback | No local merge fallback, no implicit local checkout mutation, no publication-nelkul success. | Explicit guards es reasonCode-ok kellenek. | P1 | required-now |
| Missing-data rule | Created/missing/invalid pointer, transport/payload/publication/reconcile hiba fail-closed. | Nincs local success mapping. | P1 | required-now |
| Phase boundary | Ez merge/publication cleanup-routing closure. | Delete/archive/recovery successor ownership marad. | P2 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `MergeBubbleResult` | CLI merge output, UI merge action, contract tests | preserve + narrowing | retained shape valtozatlan; remote started successben a fields a canonical remote merge/publication eredmenyet tukrozik | generic remote-safe additive result redesign nincs ebben a taskban |
| `UiMergeBubbleResult` / `UiRouterDependencies.mergeBubble` | UI router defaults, UI action dispatch, UI tests | preserve + narrowing | a UI retained result surface explicit current consumerkent scope-ban marad; a merge semantics nem csuszhat el local-only vagy remote-clone-cleanup jelentessel | kulon UI read-model task nincs, mert ez nem read-model valtas |
| Merge CLI success semantics | `pairflow bubble merge`, CLI text, tests | additive / narrowing | remote started bubble eseten success explicit durable publicationhoz kotodik; local path valtozatlan | docs/runbook wording Phase 3C |
| Merge error surface | CLI, tests, caller normalization | additive | remote route/publication/reconcile reasonCode taxonomy preserved + bovulhet | delete/archive error family kesobb |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| local bubble merge local repo merge + optional push/delete-remote | preserve | existing local merge tests zoldben maradnak | P1 | required-now |
| remote started bubble local repo merge preflight + local `git merge` | forbid | explicit no-local-merge remote test | P1 | required-now |
| laptop local checkout untouched remote merge utan | preserve | explicit remote success proof, hogy local checkout nem modositodik | P1 | required-now |
| remote merged-but-unpublished success | forbid | explicit publication-required remote test | P1 | required-now |

### 0c) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Inspected entrypoints / call-sites | `mergeFlowContext.ts`, `runMergeFlow.ts`, `mergeFlowFinalization.ts`, CLI merge entry, workspace cleanup | A valos bounded slice a merge orchestration + publication + finalization seam | P1 | required-now |
| Actual touched scope | merge consumer-family alignment + fail-closed publication hardening | A task nem csuszhat read-model vagy delete/archive scope-ba | P1 | required-now |
| Mutation entrypoints in scope | `mergeBubbleCommandOrchestration(...)`, `runMergeFlow(...)`, remote merge helper, UI merge action dispatch retained consume-ja | L1-nek ezeket kell lefednie | P1 | required-now |
| Hidden scope ruled out | status/list/attach es delete/archive nem touched merge family path; a UI merge surface passive consume marad | review-loop nem nyithat uj successor-owned scope-ot | P1 | required-now |
| Branch inventory note | local, remote success, remote merge conflict, remote publication fail, remote reconcile fail | a test matrixnek ezeket explicit le kell fednie | P1 | required-now |
| Shape proof | ugyanazon merge-family path dont route-rol, publicationrol, retained resultrol | bounded task shape tovabbra is igaz | P1 | required-now |

### 0d) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Parent gap closed | remote merge routing + publication closure | a plan `Phase 3B2` gapja lezarul | P1 | required-now |
| Depends on | `Phase 3B1` remote commit closure | started remote pointer + inner remote execution precedent mar feltetelezheto | P1 | required-now |
| Unlocks / impacts successors | `Phase 3B3`, `Phase 3C` | delete/archive es recovery kesobb, kulon boundaryvel jon | P1 | required-now |
| Task-list impact | materializalja a jelenlegi open `Phase 3B2` taskot | nincs uj split vagy obsolete task most | P1 | required-now |
| Inherited validation / exit expectation | remote merge routing + durable publication proof | testsnek publication fail es success branch-et is fedniuk kell | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/cli/commands/bubble/merge.ts`, `src/cli/index.ts` | `runBubbleMergeCommand(...)`, CLI merge summary | existing exports | CLI merge entry + output surface | remote started bubble eseten a same command surface remote route-ot consume-ol, es success csak durable publication mellett ad vissza resultet | P1 | required-now | T1, T3, T6 |
| CS2 | `src/v11/application/merge/mergeCommandOrchestration.ts`, `mergeFlowContext.ts`, `runMergeFlow.ts`, `mergeCommandDependencyResolution.ts`, `mergeCommandDefaults.ts`, `mergeCommandContract.ts` | merge orchestration + context + deps | existing export + narrow refactor | merge orchestration seam | started remote pointer eseten a local preflight/merge/push path remote route-ra valt; local bubble eseten retained local path marad | P1 | required-now | T1, T3, T4, T7 |
| CS3 | `src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts` | new bounded helper | new typed helper | remote merge execution seam | remote merge + publication + cleanup result bundle; local reconcile write ownership a caller oldalan marad | P1 | required-now | T3, T4, T5, T7 |
| CS4 | `src/v11/application/merge/mergeFlowFinalization.ts`, `mergeResultMapping.ts` | local completion reconcile + result mapping | existing export + narrow refactor | retained merge continuity seam | remote started bubble eseten a result fields a typed remote merge/publication resultet tukrozik; a local side nem merge-el/pushol ujra | P1 | required-now | T5, T7 |
| CS5 | `src/v11/shared/ports/uiRouter.ts`, `src/v11/defaults/ui/routerDefaults.ts`, `src/v11/infrastructure/ui/routerActionDispatch.ts` | `UiMergeBubbleResult`, `UiRouterDependencies.mergeBubble`, `handleMergeAction(...)` | existing types/exports | UI merge consumer seam | a UI retained merge surface ugyanazt a typed remote/publication semantics-et consume-olja, kulon local-only interpretacio nelkul | P1 | required-now | T6, T7 |

### 2) Remote Merge Helper and Publication Contract

1. Input:
   - bubble id
   - remote clone path
   - resolved started remote target
   - `deleteRemote` flag compatibility input
2. Output:
   - typed remote merge result bundle, ami eleg a retained local `MergeBubbleResult` reconstructiojahoz es a bounded local reconcile-hez
3. Must include:
   - merge commit SHA
   - base branch
   - bubble branch
   - publication outcome (`pushedBaseBranch`)
   - origin remote delete outcome, ha ertelmezett (`deletedRemoteBranch`)
   - tmux/runtime/workspace/bubble branch cleanup outcomes
4. Must not include:
   - local laptop repo merge/push ownership,
   - local checkout update,
   - generic delete/archive routing.
5. Publication rule:
   - remote started bubble merge success csak durable publication proof mellett allhat elo,
   - a remote merge helpernek a merge mutation authorityval ugyanabban az authority chainben kell a publicationt bizonyitania,
   - "merged on remote clone only" nem eleg success contract.

### 3) Local Merge-Completion Reconcile Contract

1. Required local continuity actions:
   - retained local `MergeBubbleResult` mapping a typed remote payloadbol
   - local `state.json` bounded merge-completion updateje a jelenlegi merge-state contracttal kompatibilisen
   - local control-plane cleanup csak ott, ahol ez nem jelent local checkout merge/push side effectet
2. Local reconcile owner:
   - a local application merge orchestration irja a retained local continuity metadata-t a typed remote payload validalasa utan.
3. Success rule:
   - retained local `MergeBubbleResult` csak akkor adhato vissza, ha a publication proof es a bounded local reconcile is sikerult.
4. Failure rule:
   - reconcile hiba eseten explicit fail-closed error,
   - nincs local success mapping,
   - nincs local "already merged" reinterpretacio remote partial success utan.
5. Canonicality rule:
   - remote started bubble eseten a local oldal nem futtathat uj local merge/push route-ot a remote canonical merge utan; a local oldal map+reconcile szerepben marad.

### 4) Error and Publication Taxonomy Contract

1. Minimum preserved classes:
   - start-required / pointer-invalid
   - invalid remote target
   - merge conflict requires manual resolution
   - transport failure
   - payload invalid
   - publication failed
   - local reconcile failed
2. `reasonCode` preservation required:
   - CLI normalize path
   - contract tests
3. Partial-success rule:
   - remote merge sikeres, de publication hiba eseten nincs clean success result; explicit error + recovery-needed semantics marad.

### 5) Test Matrix

| ID | Scenario | Setup | Assert | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| T1 | local merge retained | local DONE bubble | same local merge path + same optional push/delete-remote semantics | P1 | required-now |
| T2 | remote created/missing pointer fail-closed | remote executor + created/null pointer | explicit start-first hiba, nincs local merge/push fallback | P1 | required-now |
| T3 | remote started merge routed | started remote pointer + DONE state | remote helper invoked; no local repo merge preflight or local git merge fallback | P1 | required-now |
| T4 | remote publication required | started remote pointer + remote merge without durable publication proof | explicit fail-closed publication error; nincs success result | P1 | required-now |
| T5 | remote typed payload/reconcile failure | started remote pointer + remote merge success + invalid payload vagy local reconcile fail | nincs returned merge success, nincs local fake-success continuity | P1 | required-now |
| T6 | CLI/UI/result parity | CLI merge path + UI merge action path + contract runner | retained `MergeBubbleResult` / `UiMergeBubbleResult` shape megmarad; remote success semantics publication-policyval osszhangban jelenik meg | P1 | required-now |
| T7 | remote success returns retained continuity | started remote pointer + typed remote merge/publication success | `MergeBubbleResult` fields a canonical remote merge/publication/cleanup eredmenyt tukrozik; local checkout valtozatlan marad | P1 | required-now |
| T8 | remote merge conflict | started remote pointer + remote canonical merge conflict | explicit merge-conflict reasonCode; nincs local fallback merge | P1 | required-now |

## L2 - Implementation Notes

1. A tasknak explicitten a remote merge + durable publication modellt kell valasztania; a "majd kesobb dontjuk el, hogy publication kotelezo-e" ketutassag itt nem megengedett.
2. A remote started bubble merge path nem futtathatja a jelenlegi local-only sorrendet valtozatlanul:
   - local cleanliness preflight,
   - local branch existence gate,
   - local `git merge`,
   - local `git push`.
3. A helper lehet kesobb family-scoped cleanup router alapja, de ebben a taskban merge-familyre bounded maradjon.
4. A retained `MergeBubbleResult` shape maradjon stabil; ha egy remote-only metadata hasznos lenne, az legfeljebb additive, explicit utovizsgalati hardening lehet.
5. A laptop local checkout untouched policy explicit contract marad remote merge utan; a CLI legfeljebb kulon operator guidanceot adhat `git pull`-ra.
6. A `deleteRemote` compatibility-t a tasknak explicitten kell kezelnie:
   - vagy retained origin-delete semantics-szel,
   - vagy explicit non-applicable/no-op semantics-szel,
   - de nem maradhat hallgatolagos, mezon beluli jelentescsuszaskent.

## Review Focus (Reviewer Focus)

1. A remote merge authority jo helyre kerult-e.
2. A publication success tenyleg explicit es durable-e.
3. A retained local merge result continuity valos-e, es nem local merge/push re-runbol jon-e.
4. A task nem nyitotta-e meg a delete/archive/recovery scope-ot.

## Reviewer Guardrails

1. Required-now blocker csak akkor, ha az implementation:
   - remote started bubble eseten local repo merge/push fallbackot hagy bent,
   - publication proof nelkul successkent kezel remote merge-et,
   - a local checkoutot implicit mutate-olja,
   - vagy delete/archive scope-ot nyit.
2. Nem blocker onmagaban:
   - a helper pontos filename-je, ha merge-family boundaryn belul marad,
   - a publication proof pontos transport-formatja, ha a typed success/error boundary tiszta marad,
   - az, hogy a CLI summary szovege pontosan hogyan fogalmaz, ha a canonical semantics stimmel.

## Hardening Backlog

1. [later-hardening] Ha a merge/publication typed result kesobb reusable cleanup-family helperre extractalhato, azt a `Phase 3B3` utan erdemes ujraertekelni.
2. [later-hardening] Keszobbi rollouthoz erdemes lehet explicit operator-facing success guidanceot adni a local `git pull` lepesrol.

## Successor Notes

1. `Phase 3B3` ownership:
   - remote delete cleanup and archive closure
2. `Phase 3C` ownership:
   - recovery/docs/rollout
