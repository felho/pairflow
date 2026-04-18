---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3b3_remote_delete_cleanup_and_archive_closure_v1
title: "Remote Bubble Execution Remote Delete Cleanup And Archive Closure (Phase 3B3)"
status: implementable
phase: phase3b3-remote-delete-cleanup-and-archive-closure
target_files:
  - src/cli/commands/bubble/delete.ts
  - src/cli/index.ts
  - src/contracts/deleteBubble.ts
  - src/v11/application/delete/deleteCliCommand.ts
  - src/v11/application/delete/deleteBubble.ts
  - src/v11/application/delete/deleteBubbleSupport.ts
  - src/v11/application/delete/deleteBubbleFinalization.ts
  - src/v11/defaults/delete/deleteBubbleDefaults.ts
  - src/v11/infrastructure/artifact/archive/archiveSnapshot.ts
  - src/v11/infrastructure/workspace/worktreeManager.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleDeleteCommand.ts
  - tests/cli/bubbleDeleteCommand.test.ts
  - tests/cli/bubbleDeleteExitCode.integration.test.ts
  - tests/core/bubble/deleteBubble.test.ts
  - tests/core/bubble/deleteBubble.removeBubbleDirectory.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleDeleteCommand.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Delete Cleanup And Archive Closure (Phase 3B3)

## Feynman Summary / One-Screen Model

1. A `Phase 3B1` lezarta a remote started bubble `commit` routingot es a retained local commit continuityt.
2. A `Phase 3B2` lezarta a remote started bubble `merge` routingot es az explicit durable publication policy-t.
3. A `Phase 3B3` a cleanup family utolso bounded szelete, de csak a `delete` commandra:
   - remote started bubble eseten a delete confirmation/force truth nem a laptop local artifact inventoryja,
   - hanem a started remote pointer authorityjara ulo remote canonical delete inventory es delete route,
   - a remote destructive cleanup success nem hagyhat orphan remote clone/tmux/runtime artifactot,
   - a local archive/delete contract retained marad explicit archive continuity sync-backkal.
4. A task itt nem nyitja meg a recovery/docs/rollout familyt:
   - `Phase 3C`: recovery diagnostics, docs, rollout, manual smoke evidence.
5. A bounded local closure ebben a taskban:
   - retained `DeleteBubbleResult`,
   - local archive continuity ugyanabbol a canonical remote bubble truthbol,
   - local active bubble control-plane torles csak az archive continuity utan.

## Current Codebase Check / Current-Tree Reality Check (2026-04-18)

1. A delete path ma local artifact inventoryra ul:
   - `src/v11/application/delete/deleteBubble.ts`
   - a `resolveDeleteArtifacts(...)` local worktree pathot, local branch existence-t, local runtime registryt es local tmux session truthot olvas.
2. A confirmation gate ma local-only inventoryval dolgozik:
   - `src/v11/application/delete/deleteBubbleSupport.ts`
   - a `requiresDeleteConfirmation(...)` csak a local worktree/tmux/branch artifactokra nez.
3. A delete finalization ma local archive + local workspace cleanup sorrendre ul:
   - `src/v11/application/delete/deleteBubbleFinalization.ts`
   - elobb local archive snapshot + archive index update, aztan local workspace cleanup, vegul local bubble dir torles.
4. A workspace cleanup port mar topology-aware local baseline-t ad:
   - `src/v11/infrastructure/workspace/worktreeManager.ts`
   - clone vs registered-worktree ownership mar explicit, de remote started bubble destructive cleanup nincs benne.
5. Az archive snapshot ma local bubble dir forrasra ul:
   - `src/v11/infrastructure/artifact/archive/archiveSnapshot.ts`
   - a canonical archive input jelenleg `bubbleDir`, ami remote started bubble eseten nem tekintheto automatikusan canonical truthnak.
6. A retained caller-visible contract mar letezik:
   - `src/contracts/deleteBubble.ts`
   - a CLI es a UI erre a shape-re ul, ezert a task nem rughatja ki csendben a `DeleteBubbleResult` continuityt.
7. Target-file reality:
   - ez mutation entrypoint + cleanup/archive continuity + fail-closed destructive task,
   - nem merge/publication task,
   - nem generic remote lifecycle framework task,
   - nem recovery/runbook task.

## Parent Plan Fit / Stable Sequencing

1. A parent plan a `Phase 3B1 -> Phase 3B2 -> Phase 3B3 -> Phase 3C` sorrendet varja el.
2. Ez a task a cleanup routing split harmadik es utolso bounded szelete:
   - remote delete confirmation/force routing,
   - archive continuity sync-back,
   - remote destructive cleanup closure.
3. Ez a task nem vallalja:
   - recovery diagnostics vagy reboot guidance,
   - rollout docs vagy smoke evidence,
   - altalanos remote garbage collection keretrendszer.

## Plan Linkage

1. Parent plan gap closed:
   - a `Phase 3B3` gap, ahol a remote started bubble delete mar nem local-only cleanup es archive truthra ul.
2. Depends on:
   - `plans/archive/tasks/remote-bubble-execution/phase3b1-remote-commit-routing-and-continuity.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3b2-remote-merge-routing-and-publication.md`
3. Unlocks / impacts successors:
   - `plans/tasks/remote-bubble-execution/phase3c-recovery-diagnostics-and-rollout.md`
4. Task-list impact:
   - materializalja a parent plan jelenlegi `Phase 3B3` placeholderjat.
5. Inherited validation / exit expectation:
   - remote delete confirmation/force route proof,
   - archive continuity proof retained local contracttal,
   - remote orphan cleanup tiltas success-pathon.

## Source-Anchor Consistency

1. Source anchors:
   - `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3b2-remote-merge-routing-and-publication.md`
   - `plans/archive/tasks/remote-bubble-execution/phase1e-local-clone-lifecycle-cleanup-alignment.md`
   - `docs/remote-bubble-execution.md`
2. Canonical elements:
   - `remote.json(kind="started")` a remote delete outer-route authorityja.
   - remote started bubble delete truthja a remote canonical artifact inventory + archive/delete cleanup chain.
   - retained local `DeleteBubbleResult` contract marad.
   - local archive continuitynek ugyanabbbol a canonical bubble truthbol kell szarmaznia, mint amibol a remote delete success is.
3. Guard elements:
   - local worktree path letezese,
   - local branch existence,
   - local tmux lookup,
   - local bubbleDir tartalma
   ezek remote started bubble eseten nem maradhatnak onmagukban canonical delete/archive truthkent.
4. Compat-only elements:
   - `DeleteBubbleArtifacts` shape,
   - `DeleteBubbleResult.deleted`,
   - `requiresConfirmation`,
   - `tmuxSessionTerminated`,
   - `runtimeSessionRemoved`,
   - `removedWorktree`,
   - `removedBubbleBranch`.
5. Forbidden reinterpretations:
   - remote started bubble delete nem jelenthet local archive success-t remote archive continuity nelkul,
   - remote delete success nem jelenthet "a local bubble definition torolve lett, de a remote clone/runtime ott maradt",
   - remote started bubble eseten a local artifact inventory nem nevezheto canonical delete authoritynak utolagos "best effort remote cleanup" cimkevel.
6. `drift_status`: `closed_contract_preserved`

## Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/delete/deleteBubble.ts`
   - `src/v11/application/delete/deleteBubbleFinalization.ts`
   - `src/v11/application/delete/deleteCliCommand.ts`
   - `src/v11/application/delete/deleteBubbleSupport.ts`
   - `src/v11/infrastructure/workspace/worktreeManager.ts`
   - `src/v11/infrastructure/artifact/archive/archiveSnapshot.ts`
   - `src/cli/index.ts`
2. Actual touched scope:
   - delete consumer-family alignment + archive continuity + fail-closed destructive hardening.
3. Mutation entrypoints in scope:
   - `deleteBubble(...)`
   - delete CLI entry
   - remote delete helper seam
   - archive finalization / workspace cleanup seam
4. Hidden scope ruled out:
   - merge/publication mar lezart predecessor scope,
   - status/list/attach read-model nincs a touched delete familyben,
   - recovery/runbook csak a `Phase 3C`-ben jon.
5. Branch inventory note:
   - local delete retained,
   - remote confirmation required,
   - remote forced delete success,
   - remote archive continuity failure,
   - remote destructive cleanup failure,
   - remote payload/transport failure.
6. Why the declared task shape matches reality:
   - ugyanazon delete-family mutation path dont confirmationrol, archive continuityrol es destructive cleanup closure-rol; ez cleanup task, nem read-model vagy activation task.

## L0 - Policy

### Goal

Lezarni a remote started bubble `delete` routingot ugy, hogy:
1. a delete confirmation/force authorityja explicit remote canonical artifact inventory legyen,
2. a remote destructive cleanup success ne hagyjon orphan remote clone/tmux/runtime artifactot,
3. a retained local archive/delete contract explicit archive continuity sync-backkal zaruljon,
4. a retained `DeleteBubbleResult` shape megmaradjon,
5. recovery/docs/rollout scope ne nyiljon meg.

### Domain / Control Model Summary

1. Business invariant:
   - started remote bubble delete truthja a remote canonical delete path, nem a laptop local artifact inventory.
2. Control model:
   - local bubble -> retained local delete flow,
   - remote created/missing pointer -> explicit start-first fail-closed,
   - remote started pointer -> remote delete helper -> remote canonical inventory/confirmation -> archive continuity sync-back -> remote destructive cleanup closure -> retained local delete result.
3. Read-path / mutation-path rule:
   - remote started bubble confirmation nem local tmux/worktree/branch lookupbol all,
   - a local caller typed remote delete inventoryt es typed remote delete outcome-ot consume-ol,
   - local archive/delete continuity csak ennek validalasa utan zarhato le.
4. Allowed resolution path:
   - resolve started remote target
   - execute bounded remote delete inventory / confirmation query
   - force eseten execute remote canonical delete command
   - materialize local archive continuity a canonical remote bubble truth alapjan
   - delete local active bubble control-plane only after archive continuity succeeded
   - return retained `DeleteBubbleResult`
5. Forbidden fallback:
   - remote started bubble eseten local-only confirmation truth,
   - remote started bubble eseten local-only archive snapshot canonical successkent,
   - remote delete success remote destructive cleanup vagy local archive continuity proof nelkul.
6. Missing-data rule:
   - missing/created pointer -> start-first hiba,
   - invalid remote target -> explicit invalid-target hiba,
   - transport/payload/archive sync-back/destructive cleanup hiba -> nincs delete success mapping,
   - remote partial cleanup utan nincs csendes local success.

### Authority Boundary Map

1. `authority_producer`
   - retained started remote pointer
   - remote canonical delete inventory
   - remote canonical delete command
2. `persisted_authority`
   - remote bubble control-plane dir es runtime artifacts
   - remote clone / branch / tmux / runtime cleanup truth
   - local archive snapshot/index csak continuity surface remote canonical input alapjan
3. `workflow_orchestration_consumers` in scope
   - CLI delete entry
   - application delete orchestration
   - retained caller-visible delete result
4. `cleanup_recovery_consumers` in scope
   - archive snapshot continuity
   - archive index continuity
   - workspace/runtime destructive cleanup
5. Explicit out-of-scope consumers
   - recovery docs
   - reboot/manual remediation runbook
   - rollout evidence
6. Current passive retained consumers, amelyekre a tasknak figyelnie kell, de nem nyitnak kulon alignment scope-ot
   - UI router delete action `requiresConfirmation && !deleted -> HTTP 202`
   - UI tests, amelyek ezt a retained delete-result branch-et ellenorzik

### Baseline Preservation

1. Must-preserve behaviors:
   - local delete behavior valtozatlan,
   - retained `DeleteBubbleResult` shape megmarad,
   - local archive index es local archive snapshot retained surface marad.
2. Allowed resolution paths:
   - local bubble: retained local delete path,
   - remote started bubble: remote inventory/confirmation + archive continuity sync-back + remote destructive cleanup + retained local result mapping.
3. Forbidden regression interpretations:
   - archive continuity sync-back nem generic bi-directional mirror platform,
   - remote delete helper nem merge/recovery router,
   - local bubble dir torles nem elozheti meg az archive continuity proofot.
4. Replacement proof required if removed:
   - ha a local archive snapshot/index retained contractja megszunne, explicit replacement contract kell; ez ebben a taskban nem engedelyezett.

### In Scope

1. Started remote bubble delete confirmation routing.
2. Bounded remote delete helper.
3. Archive continuity sync-back a retained local archive/delete contracthoz.
4. Remote destructive cleanup closure a success-pathon.
5. Delete fail-closed error branch parity CLI consume iranyba.

### Out of Scope

1. Merge/publication routing
2. Recovery diagnostics es reboot guidance
3. Docs/rollout/manual smoke
4. Generic remote janitor framework

### Target File Precision

1. A scope a front matterben felsorolt delete-centric file-kre szukul.
2. A remote helper placement lehet equivalent narrow file, de csak delete family boundaryn belul.
3. Ha a task status/list/attach/merge production file-t igenyelne, az scope blocker.

### Closure-Budget Triage

1. Touched closures:
   - `shared_contract`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
2. Intentionally collapsed closures:
   - delete route selection + archive continuity + destructive cleanup closure
3. Why collapse is safe:
   - ugyanazon delete-family command pathban jelennek meg,
   - a retained `DeleteBubbleResult` fogja ossze oket,
   - nincs kulon read-model vagy activation fallout ugyanebben a taskban.
4. Explicitly deferred closures:
   - recovery guidance
   - docs/rollout
   - altalanos manual remediation policy

### Bounded Task Shape

1. Primary shape: `consumer_family_alignment`
2. Secondary shape: `fail_closed_hardening`
3. Why the mix is safe:
   - a bounded slice a retained delete consumer-familyt igazítja a remote canonical inventory/cleanup authorityhoz,
   - archive continuity es destructive cleanup ugyanazon delete mutation path fail-closed correctness-szabalyai,
   - nem nyitnak kulon read-model vagy activation boundaryt.

### Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - remote pointer started es valid targetre oldhato,
   - remote delete inventory typed payloadot ad,
   - confirmation-required path explicit es retained contracttal ter vissza,
   - force eseten archive continuity es destructive cleanup proof rendelkezesre all.
2. Side effects forbidden before these validations pass:
   - local delete success return,
   - local archive index success write canonical remote input nelkul,
   - local active bubble dir remove archive continuity elott.
3. Invalid/precondition-failure behavior:
   - explicit fail-closed hiba,
   - nincs local-only delete fallback remote started bubble eseten,
   - nincs partial local success mapping.
4. Coordination primitives:
   - `N/A` ebben a taskban; retry/recovery guidance successor-owned.

### Safety Defaults

1. Started remote pointer nelkul nincs remote delete route.
2. Archive continuity nelkul nincs retained local delete success.
3. Remote destructive cleanup proof nelkul nincs remote delete success.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - `DeleteBubbleResult`
   - CLI delete confirmation/success semantics
   - archive snapshot/index continuity

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
   - canonical identity path: started remote pointer -> remote canonical delete inventory -> archive continuity -> remote destructive cleanup -> retained local result mapping
   - competing fallback identities: local worktree existence, local branch existence, local bubbleDir contents
10. Single-task exception proof:
   - a `risk_score=7` ellenere nincs uj read-model consumer csalad, nincs activation coupling, es a retained contract ugyanazon delete familyben marad; emiatt a cleanup closure itt egy taskban tarthato.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | Remote started bubble delete truthja a remote canonical delete inventory + cleanup chain. | Local-only inventory remote started bubble eseten nem eleg. | P1 | required-now |
| Control model | Started pointer -> remote helper -> archive continuity -> remote destructive cleanup -> retained local `DeleteBubbleResult`. | A local delete orchestration nem epulhet local worktree/branch/tmux truthra remote started bubble eseten. | P1 | required-now |
| Read/mutation path rule | Confirmation, force es success ugyanabbol a typed remote authority chainbol jon. | Nincs kulon local confirmation truth es kulon remote cleanup truth. | P1 | required-now |
| Forbidden fallback | No local-only confirmation, no local-only archive success, no remote orphan success. | Explicit fail-closed guards es retained error-branch behavior kell. | P1 | required-now |
| Missing-data rule | Created/missing/invalid pointer, transport/payload/archive/destructive cleanup hiba fail-closed. | Nincs delete success mapping. | P1 | required-now |
| Phase boundary | Ez delete/archive cleanup-routing closure. | Recovery/docs/runbook successor ownership marad. | P2 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `DeleteBubbleResult` | CLI delete output, UI delete mutation contract, UI mirror type, delete tests | preserve + narrowing | retained shape valtozatlan; remote started successben a fields a canonical remote delete inventory/outcome-ot tukrozik | generic remote-safe delete result redesign nincs ebben a taskban |
| `DeleteBubbleArtifacts` confirmation surface | CLI confirmation text, UI router `202` confirmation branch, tests | preserve + narrowing | retained shape marad; remote started bubble eseten az artifact inventory a canonical remote delete targetet irja le, mikozben a `requiresConfirmation && !deleted -> HTTP 202` retained consumer-semantika megmarad | kulon UI/read-model wording Phase 3C |
| local archive snapshot/index contract | archive snapshot/index writers, delete tests | additive / narrowing | local archive retained marad, de canonical input remote truthra valt remote started bubble eseten | altalanos archive replication service nincs ebben a taskban |
| delete CLI success semantics | `pairflow bubble delete`, exit code tests | additive | remote started bubble eseten success explicit archive continuity + destructive cleanuphoz kotodik; local path retained | docs/runbook wording Phase 3C |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| local bubble delete local archive + local cleanup | preserve | existing local delete tests zoldben maradnak | P1 | required-now |
| remote started bubble local-only confirmation truth | forbid | explicit remote confirmation inventory test | P1 | required-now |
| local archive snapshot canonical bubbleDir truthkent remote started bubble eseten | replace | explicit archive continuity proof remote canonical inputtal | P1 | required-now |
| remote delete success orphan remote clone/runtime mellett | forbid | explicit success-path cleanup proof | P1 | required-now |

### 0c) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Inspected entrypoints / call-sites | `deleteBubble.ts`, `deleteBubbleFinalization.ts`, `deleteCliCommand.ts`, archive snapshot, workspace cleanup, CLI delete text | A valos bounded slice a delete orchestration + archive continuity + cleanup seam | P1 | required-now |
| Actual touched scope | delete cleanup alignment + fail-closed destructive hardening | A task nem csuszhat merge/recovery scope-ba | P1 | required-now |
| Mutation entrypoints in scope | `deleteBubble(...)`, remote delete helper, archive finalization, CLI consume surface | L1-nek ezeket kell lefednie | P1 | required-now |
| Hidden scope ruled out | a UI router delete confirmation consume retained current consumer, de nem kulon alignment task; merge/publication mar lezart predecessor, recovery/runbook successor-owned | review-loop nem nyithat uj taskot itt | P1 | required-now |
| Branch inventory note | local retained, remote confirmation, remote forced success, remote archive fail, remote cleanup fail | a test matrixnek ezeket explicit le kell fednie | P1 | required-now |
| Shape proof | ugyanazon delete-family path dont inventoryrol, archive continuityrol es destructive cleanuprol | bounded task shape tovabbra is igaz | P1 | required-now |

### 0d) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Parent gap closed | remote delete cleanup and archive closure | a plan `Phase 3B3` gapja lezarul | P1 | required-now |
| Depends on | `Phase 3B2` remote merge/publication closure | started remote pointer es inner-remote precedent mar feltetelezheto | P1 | required-now |
| Unlocks / impacts successors | `Phase 3C` | recovery/docs mar explicit kovetkezo fazis marad | P1 | required-now |
| Task-list impact | materializalja a jelenlegi open `Phase 3B3` taskot | nincs tovabbi split most | P1 | required-now |
| Inherited validation / exit expectation | remote confirmation, archive continuity, no orphan cleanup proof | testsnek confirm es force branch-et is fedniuk kell, es a retained UI `202` confirmation consume sem torhet el | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/cli/commands/bubble/delete.ts`, `src/cli/index.ts` | `runBubbleDeleteCommand(...)`, CLI delete summary | existing exports | CLI delete entry + output surface | remote started bubble eseten ugyanaz a command surface remote canonical confirmation/success semantics-et consume-olja; exit-code contract retained marad | P1 | required-now | T1, T2, T7 |
| CS2 | `src/v11/application/delete/deleteBubble.ts`, `deleteBubbleSupport.ts`, `deleteCliCommand.ts` | delete orchestration + dependency resolution + confirmation gate | existing exports + narrow refactor | delete orchestration seam | started remote pointer eseten a local inventory/cleanup helyett remote route-ra valt; local bubble eseten retained local path marad | P1 | required-now | T1, T2, T3, T4 |
| CS3 | `src/v11/infrastructure/executor/ssh/sshBubbleDeleteCommand.ts` | new bounded helper | new typed helper | remote delete execution seam | remote canonical inventory + force delete + archive continuity payload; local destructive fallback nelkul | P1 | required-now | T2, T3, T4, T5 |
| CS4 | `src/v11/application/delete/deleteBubbleFinalization.ts`, `src/v11/infrastructure/artifact/archive/archiveSnapshot.ts` | archive creation + active bubble dir removal | existing exports + narrow refactor | retained local archive continuity seam | remote started bubble eseten a local archive canonical remote truthbol materializalodik, es a local active bubble dir csak ezutan torlodik | P1 | required-now | T4, T5, T6 |
| CS5 | `src/v11/infrastructure/workspace/worktreeManager.ts` | `cleanupWorktreeWorkspace(...)` | existing export | local cleanup baseline seam | local topology-aware cleanup retained marad; remote destructive cleanup nem moshato ossze ezzel a local porttal | P1 | required-now | T1, T4 |

### 2) Remote Delete Helper and Inventory Contract

1. Input:
   - bubble id
   - resolved started remote target
   - `force` flag
2. Output:
   - typed remote delete inventory/result bundle, ami eleg a retained local `DeleteBubbleResult` es a local archive continuity reconstructiojahoz
3. Must include:
   - remote artifact inventory a confirmation gate-hez
   - remote runtime cleanup outcomes
   - remote workspace/branch cleanup outcomes
   - archive continuityhoz szukseges canonical metadata es/vagy content reference
4. Must not include:
   - local laptop repo cleanup ownership,
   - merge/publication semantics,
   - generic multi-command janitor routing.
5. Confirmation rule:
   - remote started bubble eseten a confirmation-required dontes a canonical remote inventoryra ul,
   - a retained `DeleteBubbleArtifacts` shape marad, de a values a canonical remote targetet irjak le.
6. Success rule:
   - remote started bubble delete success csak akkor allhat elo, ha a helper success payloadja archive continuityre es remote destructive cleanupra is eleg bizonyitekot ad.

### 3) Archive Continuity Sync-back Contract

1. Required local continuity actions:
   - local archive snapshot materializalasa ugyanabbol a canonical remote bubble truthbol, amelyet a remote delete helper validalt
   - local archive index update retained contracttal
   - local active bubble dir torlese csak ezutan
2. Canonicality rule:
   - remote started bubble eseten a local archive snapshot nem epulhet csak a meglevo local bubbleDir-ra, ha az nem a canonical remote truth.
3. Success rule:
   - retained local `DeleteBubbleResult.deleted=true` csak akkor adhato vissza, ha a local archive continuity es a remote destructive cleanup is sikerult.
4. Failure rule:
   - archive continuity hiba eseten explicit fail-closed error,
   - nincs local archive index success,
   - nincs local active bubble dir torles successkent kezelve.
5. Scope non-expansion rule:
   - az archive continuity sync-back nem vezethet be altalanos archive replication service-t vagy recovery queue-t; csak a retained local delete contracthoz szukseges minimal bounded closure engedelyezett.

### 4) Remote Destructive Cleanup Closure Contract

1. Success-path obligations:
   - remote tmux/runtime session cleanup lezarul
   - remote clone/workspace cleanup lezarul
   - remote bubble branch cleanup retained contracttal osszhangban lezarul, ha ez a canonical delete success resze
2. Partial-success rule:
   - ha a remote archive continuityhez eleg adat van, de a destructive cleanup nem zart le, nincs clean success result; explicit fail-closed error marad.
3. Local/remote separation rule:
   - a local `cleanupWorktreeWorkspace(...)` baseline retained marad local bubblekre,
   - remote started bubble eseten a remote destructive cleanup nem szimulalhato local removed flags-szel valodi remote proof nelkul.
4. No-orphan rule:
   - success-pathon nem maradhat orphan remote clone vagy runtime artifact.

### 5) Error and Fail-Closed Contract

1. Minimum preserved classes:
   - start-required / pointer-invalid
   - invalid remote target
   - transport failure
   - payload invalid
   - archive continuity failed
   - remote destructive cleanup failed
2. Delete-specific `reasonCode` taxonomy:
   - `N/A` required-now source-anchor szinten
   - ez a task fail-closed delete error familyt es retained confirmation branch-et kovetel, de nem zar le uj delete-specific reason-code taxonomy-t kulon source-anchor nelkul
3. Confirmation rule:
   - confirmation-required path nem hiba, hanem retained result branch; de remote started bubble eseten is ugyanazon typed authority chainbol jon.

### 6) Test Matrix

| ID | Scenario | Setup | Assert | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| T1 | local delete retained | local bubble | same local confirmation/archive/delete semantics | P1 | required-now |
| T2 | remote created/missing pointer fail-closed | remote executor + created/null pointer | explicit start-first hiba, nincs local delete fallback | P1 | required-now |
| T3 | remote confirmation inventory routed | started remote pointer + `force=false` + remote artifacts present | confirmation-required result a canonical remote inventoryt tukrozi; nincs local-only inventory truth | P1 | required-now |
| T4 | remote forced delete routed | started remote pointer + `force=true` | remote helper invoked; archive continuity + remote destructive cleanup success nelkul nincs success result | P1 | required-now |
| T5 | remote archive continuity failure | started remote pointer + remote delete payload, de local archive continuity fail | nincs returned delete success, nincs local bubble dir success remove | P1 | required-now |
| T6 | remote cleanup failure | started remote pointer + archive continuity okay, de remote destructive cleanup fail | nincs clean success, explicit fail-closed delete error branch marad | P1 | required-now |
| T7 | CLI/UI confirmation/success parity | CLI delete path + exit code tests + retained UI router confirmation consume | retained help/confirmation/success contract megmarad; remote started branch ugyanebbe a surface-be illeszkedik, es a `requiresConfirmation && !deleted -> HTTP 202` consumer-semantika retained marad | P1 | required-now |
| T8 | remote success retained continuity | started remote pointer + typed remote success | `DeleteBubbleResult` fields a canonical remote inventory/outcome-ot tukrozik; local archive snapshot/index retained, es nincs orphan remote artifact | P1 | required-now |

## L2 - Implementation Notes

1. A tasknak explicitten a remote canonical delete inventory modellt kell valasztania; a "majd ha nincs remote info, visszaesunk local confirmation truthra" ketutassag nem megengedett.
2. A remote started bubble delete path nem futtathatja a jelenlegi local-only sorrendet valtozatlanul:
   - local inventory resolve,
   - local archive snapshot canonical truthkent,
   - local workspace cleanup,
   - local bubble dir remove.
3. A helper lehet kesobb family-scoped destructive cleanup precedent, de ebben a taskban delete-familyre bounded maradjon.
4. A retained `DeleteBubbleResult` shape maradjon stabil; ha remote-only metadata hasznos lenne, az legfeljebb additive utovizsgalati hardening lehet.
5. A local archive continuitynek explicitten meg kell neveznie, mi a canonical input:
   - remote-synced bubble control-plane content,
   - vagy remote-produced archive payload,
   - vagy mas, ugyanabbol az authority chainbol jovo bounded forma,
   de a spec ezt nem hagyhatja implicit local bubbleDir feltetelezesen.
6. A `force` semantics-et a tasknak explicitten remote started bubble-re is le kell zarni:
   - confirmation required path retained,
   - force eseten remote destructive cleanup kotelezo,
   - de a force nem jelentheti az archive continuity atlepeset.
7. Ha a retained `DeleteBubbleArtifacts` remote started bubble eseten remote pathot hordoz, azt explicit compat-narrowingkent kell leirni:
   - a shape marad,
   - a canonical inventory authority viszont remote.

## Review Focus (Reviewer Focus)

1. A remote delete authority jo helyre kerult-e.
2. Az archive continuity valoban canonical remote truthra ul-e.
3. A success-path tenyleg nem hagy-e orphan remote clone/runtime artifactot.
4. A retained local `DeleteBubbleResult` continuity valos-e.
5. A task nem nyitotta-e meg a recovery/docs/rollout scope-ot.

## Spec Lock

1. A `Phase 3B3` task implementacio kozben nem nevezheti a local bubbleDir-t canonical archive truthnak remote started bubble eseten kulon bizonyitas nelkul.
2. A `Phase 3C` nem tolhat vissza ide recovery/runbook/doc closure-t; az itt maradjon successor-owned.
3. Ha implementation kozben kiderul, hogy a retained local archive contract csak breaking contract-cserével tarthato fenn, a taskot vissza kell routolni plan refinementre, nem szabad csendben scope-ot novelni.

## Hardening Backlog

1. [later-hardening] Ha a delete familynek kesobb explicit remote error-normalization/reason-code taxonomy kell, azt kulon source-anchoros refinementben erdemes materializalni, nem ebben a cleanup-routing taskban.
2. [later-hardening] Ha a remote archive continuity payload kesobb reusable archive-helper seamre extractalhato, azt a `Phase 3C` elott kulon erdemes ujraertekelni.
