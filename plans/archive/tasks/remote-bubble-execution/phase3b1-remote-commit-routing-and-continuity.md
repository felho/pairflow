---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3b1_remote_commit_routing_and_continuity_v1
title: "Remote Bubble Execution Remote Commit Routing And Continuity (Phase 3B1)"
status: implementable
phase: phase3b1-remote-commit-routing-and-continuity
target_files:
  - src/v11/application/commit/commitCliCommand.ts
  - src/v11/application/commit/commitCommandApi.ts
  - src/v11/application/commit/commitCommandApiContract.ts
  - src/v11/application/commit/commitCommandContract.ts
  - src/v11/application/commit/commitCommandDefaults.ts
  - src/v11/application/commit/commitCommandFinalization.ts
  - src/v11/application/commit/commitCommandGitStep.ts
  - src/v11/application/commit/commitCommandRuntime.ts
  - src/v11/application/commit/commitDonePackage.ts
  - src/v11/application/commit/emitCommitV11.ts
  - src/v11/shared/commit/commitCommandErrorNormalization.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerHttpErrors.ts
  - tests/cli/bubbleCommitCommand.test.ts
  - tests/core/bubble/commitBubble.test.ts
  - tests/core/ui/router.test.ts
  - tests/v11/application/commit/commitCliEntrypointParity.test.ts
  - tests/v11/application/commit/commitCommandApi.test.ts
  - tests/v11/application/commit/commitCommandErrorNormalization.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Commit Routing And Continuity (Phase 3B1)

## Feynman Summary / One-Screen Model

1. A `Phase 3A` mar lezarta a started remote pointer authorityra ulo human mutation routingot.
2. A `Phase 3B1` ezt nem a teljes cleanup familyre terjeszti ki, hanem csak a `commit` commandra.
3. A bounded szelet:
   - remote started bubble commit nem a laptop local git worktree-ben fut,
   - hanem a remote clone canonical Pairflow commit pathjan,
   - majd a local control-plane bubble minimal mutable artifact continuityt visszakapja.
4. A retained local `CommitBubbleResult` contract miatt a task itt explicit dontest hoz:
   - nincs "valassz implementacio kozben" ket-agas reconcile,
   - remote commit success utan bounded sync-back kotelezo.
5. Merge, delete, recovery nem ebben a taskban zarul:
   - `Phase 3B2`: remote merge routing and publication closure
   - `Phase 3B3`: remote delete cleanup and archive closure
   - `Phase 3C`: recovery/docs/rollout

## Current Codebase Check / Current-Tree Reality Check (2026-04-18)

1. A commit path ma local git mutation boundary:
   - [commitCommandApi.ts](/Users/felho/dev/pairflow/src/v11/application/commit/commitCommandApi.ts:98)
   - a `runCommitGitStep(...)` local repo/worktree staging + commit pathra ul.
2. A commit result retained local continuityt feltetelez:
   - `CommitBubbleResult.donePackagePath` local file path contract [commitCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/commit/commitCommandContract.ts:14)
   - a CLI is erre ulo retained surface-t ad [index.ts](/Users/felho/dev/pairflow/src/cli/index.ts:703).
3. A jelenlegi commit orchestration local-only finalization shape-ra ul:
   - [commitCommandApi.ts](/Users/felho/dev/pairflow/src/v11/application/commit/commitCommandApi.ts:27) a `prepareCommitRuntimeContext(...)` belepesi pontja, es [commitCommandApi.ts](/Users/felho/dev/pairflow/src/v11/application/commit/commitCommandApi.ts:56) oldja a local `donePackagePath`-ot es hivja a `readOrCreateDonePackage(...)`-et,
   - a retained local finalize lepesek (`appendDonePackageEnvelope(...)`, `persistCommittedThenDoneState(...)`, `emitCommitLifecycleEvent(...)`) ma uj local canonical mutationt allitanak elo.
4. A remote started pointer authority precedent mar letezik:
   - approval/rework family remote helperrel route-ol a `Phase 3A` ota.
5. Target-file reality:
   - ez egy mutation entrypoint + fail-closed continuity task,
   - nem merge/delete/recovery task,
   - nem generic remote command foundation.

## Parent Plan Fit / Stable Sequencing

1. A parent plan most mar a `Phase 3B1 -> Phase 3B2 -> Phase 3B3 -> Phase 3C` sorrendet varja el.
2. Ez a task a cleanup routing split elso bounded szelete:
   - remote commit route,
   - bounded mutable control-artifact sync-back,
   - CLI/UI typed consume parity.
3. Ez a task nem vallalja:
   - remote merge publication policy,
   - remote delete confirmation/archive closure,
   - recovery/runbook/docs.

## Source-Anchor Consistency

1. Source anchors:
   - [remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md:150)
   - [phase3a-remote-approval-and-rework-routing.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase3a-remote-approval-and-rework-routing.md:136)
   - [phase1e-local-clone-lifecycle-cleanup-alignment.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase1e-local-clone-lifecycle-cleanup-alignment.md:241)
2. Canonical elements:
   - `remote.json(kind="started")` a remote commit target authorityja.
   - local `state.json` / `transcript.ndjson` / `artifacts/done-package.md` remote bubble eseten continuity artifact, nem kulon mutation truth.
   - `CommitBubbleResult.donePackagePath` retained local consume contract.
3. Forbidden reinterpretations:
   - remote commit nem jelent local git commitot utolagos remote sync-cel,
   - a retained commit result nem downgrade-olhato remote-only file hintte,
   - a sync-back nem nevezheto opcionlis later-hardeningnek, ha a retained local result contract ettol fugg.
4. `drift_status`: `closed_contract_preserved`

## L0 - Policy

### Goal

Lezarni a remote started bubble `commit` routingot ugy, hogy:
1. a commit mutation authorityja explicit remote canonical command legyen,
2. nincs local git fallback remote started bubble eseten,
3. retained local `CommitBubbleResult` consume continuity bounded sync-backkal zaruljon,
4. merge/delete/recovery scope ne nyiljon meg.

### Domain / Control Model Summary

1. Business invariant:
   - started remote bubble commit truthja a remote clone-ban elo canonical Pairflow commit flow.
2. Control model:
   - local bubble -> retained local commit flow,
   - remote created/missing pointer -> explicit start-first fail-closed,
   - remote started pointer -> remote commit helper -> remote canonical commit -> bounded local continuity sync-back -> retained result.
3. Read-path / mutation-path rule:
   - a remote mutation success contract nem emberi stdout parse-bol all,
   - a local caller a typed remote resultet consume-olja,
   - majd a synced local control artifacts-on adja vissza a retained result shape-et.
4. Allowed resolution path:
   - resolve started remote target
   - execute bounded remote commit command
   - sync back `state.json`, `transcript.ndjson`, `artifacts/done-package.md`
   - only then map to retained `CommitBubbleResult`
5. Forbidden fallback:
   - remote started bubble eseten local `runCommitGitStep(...)`,
   - partial local finalization sync-back elott,
   - remote-only `donePackagePath` surfacing retained local path helyett.
6. Missing-data rule:
   - missing/created pointer -> start-first hiba,
   - invalid remote target -> explicit invalid-target hiba,
   - transport/payload/sync-back hiba -> nincs local commit success es nincs local partial finalize.

### Authority Boundary Map

1. `authority_producer`
   - retained started remote pointer
   - remote canonical commit command
2. `persisted_authority`
   - remote `state.json`
   - remote `transcript.ndjson`
   - remote `artifacts/done-package.md`
   - local synced continuity copies ugyanebbol a canonical forrasbol
3. `workflow_orchestration_consumers` in scope
   - CLI commit entry
   - application commit API
   - UI commit action
4. `cleanup_recovery_consumers` in scope
   - bounded sync-back continuity
5. Explicit out-of-scope consumers
   - merge
   - delete
   - status/list/attach
   - recovery/docs/runbook

### Baseline Preservation

1. Must-preserve behaviors:
   - local commit behavior valtozatlan,
   - local `CommitBubbleResult` shape retained,
   - `donePackagePath` local path consume retained.
2. Allowed resolution paths:
   - local bubble: retained local commit path,
   - remote started bubble: remote commit + bounded sync-back + retained local result mapping.
3. Forbidden regression interpretations:
   - sync-back nem generic mirroring platform,
   - sync-back nem status/list cache rewrite,
   - remote commit helper nem generic cleanup-family router.
4. Replacement proof required if removed:
   - ha a local `donePackagePath` contract megszunne, explicit additive replacement contractot kell bizonyitani; ez ebben a taskban nem engedelyezett.

### In Scope

1. Started remote bubble commit routing.
2. Bounded remote commit helper.
3. Bounded mutable control-artifact sync-back a retained local commit continuityhoz.
4. Commit error taxonomy parity CLI/UI consume iranyba.

### Out of Scope

1. Remote merge routing
2. Remote delete cleanup
3. Recovery/runbook/docs
4. Generic artifact mirroring service

### Target File Precision

1. A scope a front matterben felsorolt commit-centric file-kre szukul.
2. A helper placement lehet equivalent narrow file, de csak commit family boundaryn belul.
3. Ha a feladat merge/delete production file-t igenyelne, az scope blocker.

### Closure-Budget Triage

1. Touched closures:
   - `shared_contract`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
2. Intentionally collapsed closures:
   - commit route selection + bounded sync-back continuity
3. Why collapse is safe:
   - ugyanazon commit-family code path ownershipe alatt marad,
   - nincs merge/delete consumer fallout ugyanebben a taskban.
4. Explicitly deferred closures:
   - remote merge publication closure
   - remote delete archive/destructive cleanup closure
   - recovery rollout

### Bounded Task Shape

1. Primary shape: `consumer_family_alignment`
2. Secondary shape: `fail_closed_hardening`
3. Why the mix is safe:
   - ugyanazon commit mutation pathon belul jelenik meg,
   - a fail-closed resz kizarolag a retained commit continuity proofhoz kell,
   - nem vezet be kulon merge/delete/recovery side-effect orderinget.

### Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - remote pointer started es valid targetre oldhato,
   - remote command typed success payloadot ad,
   - sync-back a canonical mutable control artifacts-ra sikerul.
2. Side effects forbidden before these validations pass:
   - local commit success return,
   - local retained finalization result mapping,
   - barmilyen partial local continuity write successkent kezelve.
3. Invalid/precondition-failure behavior:
   - explicit fail-closed hiba,
   - nincs local git fallback,
   - nincs partial local commit success.
4. Coordination primitives:
   - `N/A` ebben a taskban; explicit deferred.

### Safety Defaults

1. Started remote pointer nelkul nincs remote commit route.
2. Sync-back nelkul nincs retained commit success.
3. Typed remote payload nelkul nincs result mapping.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - `CommitBubbleResult`
   - commit error surface
   - UI commit action consume

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | Remote started bubble commit truthja a remote clone canonical commit flow. | Local git path remote started bubble eseten nem futhat. | P1 | required-now |
| Control model | Retained local result continuity synced local artifacts-bol jon, nem remote-only path hintbol. | Sync-back kotelezo a result mapping elott. | P1 | required-now |
| Read/mutation path rule | Started pointer -> remote helper -> typed result -> sync-back -> retained local result. | Nincs menu-alapu implementer-valasztas a reconcile modellrol. | P1 | required-now |
| Forbidden fallback | No local git fallback, no partial finalize, no remote-only `donePackagePath`. | Explicit guards kellenek. | P1 | required-now |
| Missing-data rule | Created/missing/invalid pointer vagy sync-back hiba fail-closed. | Nincs commit success local continuity proof nelkul. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `CommitBubbleResult` | CLI commit output, UI commit action, tests | preserve | retained shape valtozatlan marad; local `donePackagePath` synced continuity artifactra mutat | generic remote-safe additive result redesign nincs ebben a taskban |
| Commit error surface | CLI, UI router, tests | additive | typed remote commit reasonCode megmarad | merge/delete error family kesobb |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| local commit local git mutation | preserve | existing local commit tests zoldben maradnak | P1 | required-now |
| remote started bubble local git fallback | forbid | explicit no-local-git remote test | P1 | required-now |
| retained local done-package path contract | preserve | synced local done-package proof | P1 | required-now |
| remote route local re-finalization/re-synthesis a canonical sync-back helyett | forbid | explicit proof, hogy remote success utan a local oldal nem gyart uj commit envelope/state truthot | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/v11/application/commit/commitCliCommand.ts` | `runBubbleCommitCommand(...)` | existing export | CLI commit entry | remote started bubble eseten same command surface remote route-ot consume-ol | P1 | required-now | T1, T3, T6 |
| CS2 | `src/v11/application/commit/commitCommandApi.ts`, `commitCommandApiContract.ts`, `commitCommandContract.ts`, `commitCommandDefaults.ts`, `commitCommandFinalization.ts`, `commitCommandGitStep.ts`, `commitCommandRuntime.ts`, `commitDonePackage.ts` | `commitBubble(...)` + retained finalization helpers | existing export + narrow internal refactor | commit orchestration seam | started remote pointer eseten a remote preconditions/mutation es a local continuity mapping kulonul el; local bubble eseten retained local path marad | P1 | required-now | T1, T3, T5, T7 |
| CS3 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | new bounded helper | new typed helper | remote commit execution seam | remote command + typed result bundle; local continuity iras a caller ownershipe marad | P1 | required-now | T3, T4, T5, T7 |
| CS4 | `src/v11/infrastructure/ui/routerActions.ts`, `routerHttpErrors.ts` | router error mapping | existing exports | first-party UI action consume | typed remote commit errors actionable formaban jutnak el a UI-ba | P1 | required-now | T6 |

### 2) Remote Commit Helper Contract

1. Input:
   - bubble id
   - repo path
   - refs/message/auto flags
   - resolved bubble context
   - started remote target
2. Output:
   - typed remote commit result bundle, ami eleg a retained local `CommitBubbleResult` reconstructiojahoz es a local continuity sync-backhoz
3. Must include:
   - commit SHA
   - commit message
   - staged files
   - remote post-commit `state.json` snapshot
   - remote transcript delta vagy explicit appended envelope payload, ami alapjan a local continuity ugyanarra a canonical transcript truthra all
   - remote `artifacts/done-package.md` payload
4. Must not include:
   - local filesystem write ownership vagy local sync-back side effect,
   - generic merge/delete command routing,
   - human stdout parse mint egyeduli caller contract.

### 3) Local Continuity Sync-Back Contract

1. Required synced artifacts:
   - `state.json`
   - `transcript.ndjson`
   - `artifacts/done-package.md`
2. Local sync-back owner:
   - a local application commit orchestration irja a retained local continuity copykat a typed remote payload validalasa utan.
3. Success rule:
   - retained local `CommitBubbleResult` csak akkor adhato vissza, ha ezek local continuity szinten mar rendelkezesre allnak.
4. Failure rule:
   - sync-back hiba eseten explicit fail-closed error,
   - nincs local `DONE` success mapping,
   - nincs local lifecycle success emit,
   - nincs local partial success.
5. Canonicality rule:
   - remote started bubble eseten a local oldal nem szintetizalhat uj commit envelope/state/done-package truthot a remote canonical commit utan; a local oldal copy+map szerepben marad.

### 4) Error Taxonomy Contract

1. Minimum preserved classes:
   - start-required / pointer-invalid
   - invalid remote target
   - transport failure
   - payload invalid
   - sync-back failure
2. `reasonCode` preservation required:
   - CLI normalize path
   - UI router mapping

### 5) Test Matrix

| ID | Scenario | Setup | Assert | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| T1 | local commit retained | local APPROVED_FOR_COMMIT bubble | same local git path + same result contract | P1 | required-now |
| T2 | remote created/missing pointer fail-closed | remote executor + created/null pointer | explicit start-first hiba, nincs local git side effect | P1 | required-now |
| T3 | remote started commit routed | started remote pointer + APPROVED_FOR_COMMIT | remote helper invoked; no local git fallback | P1 | required-now |
| T4 | remote typed payload invalid | started remote pointer | explicit fail-closed hiba; nincs local success mapping | P1 | required-now |
| T5 | remote sync-back fail-closed | remote commit success, local sync-back fails | nincs returned commit success, nincs partial continuity write successkent kezelve | P1 | required-now |
| T6 | CLI/UI consume parity | CLI commit + UI action path | typed remote commit error/result parity megmarad | P1 | required-now |
| T7 | remote success returns retained local continuity | started remote pointer + typed remote success + local sync-back success | `donePackagePath` local artifact pathra mutat; a local `state.json` / `transcript.ndjson` / `artifacts/done-package.md` a remote canonical commit eredmenyet tukrozi, nem egy uj local re-finalizationt | P1 | required-now |

## L2 - Implementation Notes

1. A tasknak explicitten a sync-back utat kell valasztania; a korabbi "vagy sync-back, vagy uj additive result contract" ketutassag itt mar nem megengedett.
2. A helper lehet kesobb altalanosabb seam alapja, de ebben a taskban commit-familyre bounded maradjon.
3. A sync-back nem nyithat generic mirror policyt; csak a retained local commit continuity minimumet zarja.
4. Remote started bubble eseten a jelenlegi local-only pipeline (`prepareCommitRuntimeContext(...) -> runCommitGitStep(...) -> appendDonePackageEnvelope(...) -> persistCommittedThenDoneState(...) -> emitCommitLifecycleEvent(...)`) nem maradhat valtozatlanul authority truth; a route szetvalasztasa/refaktorja ebben a taskban in-scope, ha commit-family boundaryn belul marad.
5. A remote route nem pre-create-olhat vagy re-finalize-olhat local continuity artifactot remote success + sync-back proof elott.
6. A `CommitBubbleResult.donePackagePath` explicit local artifact path marad; remote abszolut file path nem lephet ki ezen a contract boundaryn.

## Review Focus (Reviewer Focus)

1. A remote commit authority jo helyre kerult-e.
2. A retained local commit result continuity valos-e, es nem local re-synthesisbol jon-e.
3. A remote route tiltja-e a pre-sync local finalizationt.
4. A task nem nyitotta-e meg a merge/delete/recovery scope-ot.

## Reviewer Guardrails

1. Required-now blocker csak akkor, ha az implementation:
   - remote started bubble eseten local git fallbackot hagy bent,
   - a retained local `CommitBubbleResult` continuity sync-back proof nelkul successkent kezeli,
   - vagy a remote canonical commit utan localban uj commit/state/done-package truthot general ahelyett, hogy a remote canonical artifactokat sync-backelne,
   - vagy merge/delete scope-ot nyit.
2. Nem blocker onmagaban:
   - a helper pontos filename-je, ha commit-family boundaryn belul marad,
   - a sync-back transport pontos belso implementacios modja, ha a bounded contract es a typed error surface megmarad.

## Hardening Backlog

1. [later-hardening] Ha a commit sync-back kesobb reusable family-scoped artifact transport helperre extractalhato, azt a merge/delete successor taskok utan erdemes ujraertekelni.
2. [later-hardening] A remote commit helper telemetry surface kesobb bovitheto explicit bytes/file-count metadata-val, ha a rollout diagnostics ezt igenyli.

## Successor Notes

1. `Phase 3B2` ownership:
   - remote merge routing and publication closure
2. `Phase 3B3` ownership:
   - remote delete cleanup and archive closure
3. `Phase 3C` ownership:
   - recovery/docs/rollout
