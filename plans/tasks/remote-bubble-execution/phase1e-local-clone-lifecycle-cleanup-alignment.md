---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase1e_local_clone_lifecycle_cleanup_alignment_v1
title: "Remote Bubble Execution Local Clone Lifecycle Cleanup Alignment (Phase 1E)"
status: implementable
phase: phase1e-local-clone-lifecycle-cleanup-alignment
target_files:
  - src/v11/application/commit/commitCommandApi.ts
  - src/v11/application/commit/commitCommandGitStep.ts
  - src/v11/application/merge/mergeFlowContext.ts
  - src/v11/application/merge/mergeFlowFinalization.ts
  - src/v11/application/delete/deleteBubbleFinalization.ts
  - src/v11/infrastructure/workspace/worktreeManager.ts
  - tests/core/bubble/commitBubble.test.ts
  - tests/core/bubble/mergeBubble.test.ts
  - tests/core/bubble/deleteBubble.test.ts
  - tests/core/workspace/worktreeManager.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Local Clone Lifecycle Cleanup Alignment (Phase 1E)

## Current Codebase Check (2026-04-13)

1. A Phase 1B1-1D lezarta a workspace authority contractot, a producer seamet, a start/tmux launch consume-ot, a runtime delivery/reviewer-context consume-ot es a bubble-loop authoritative wrapper consume-ot.
2. A local lifecycle family ugyanakkor tovabbra is worktree-topology baseline-re epul:
   - `src/v11/application/commit/commitCommandGitStep.ts` csak a bubble worktree-ben commitol, es nincs explicit source-repo branch sync contractja clone topologyra,
   - `src/v11/application/merge/mergeFlowContext.ts` a source repo-beli `bubble_branch` letezeset tekinti merge-preconditionnek,
   - `src/v11/infrastructure/workspace/worktreeManager.ts` cleanup pathja worktree-registered topologyra van optimalizalva, es a branch-delete path ownership rule-ja nincs clone topologyra nevesitve,
   - `src/v11/application/delete/deleteBubbleFinalization.ts` ugyanarra a cleanup portora tamaszkodik.
3. A `docs/remote-bubble-execution.md` flat clone-per-bubble topologiat mond ki:
   - a clone workspace fuggetlen git clone,
   - a bubble branch lesz a merge altal kesobb felhasznalt branch,
   - a cleanup vegul clone directory + branch/tmux/runtime artifact csaladot zar.
4. Emiatt a local clone-topology activation nem zarhato le csak a start/runtime consume csalad alapjan:
   - ha a clone bubble-t sikeresen el lehet inditani, akkor a lifecycle vegigvitelehez a local `commit` / `merge` / `delete` familynek is ugyanarra a topology-truthra kell epulnie,
   - kulonben a rendszer vagy rejtett local-only commitot hagy maga utan, vagy ownership nelkul torolhet source-repo branch-et.
5. A mostani review-loop ezt konkretan ket correctness-riskke formalta:
   - clone commitnel a source-repo bubble branch sync explicit contractja hianyzik,
   - clone cleanupnal a source branch delete ownershipa nincs ugyanarra a topology-modelre zarva, mint a clone workspace cleanup.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis nem activation task: nem nyit successful clone start pathot, es nem mozdit remote SSH, operator read-model vagy remote mutation routing surfaces-eket.
3. A feladat a local lifecycle cleanup family topology-closure-ja:
   - clone bubble commitnel a local clone HEAD es a source-repo bubble branch kapcsolata explicit szerzodest kap,
   - clone bubble merge/delete/cleanup csak explicit ownership-proof mellett torol source-repo bubble branch-et,
   - clone workspace directory cleanup explicit clone-topology pathkent is lezarodik, nem csak registered worktree pathkent.
4. A feladatnak fail-closed maradnia kell ott, ahol a topology ownership nem bizonyithato:
   - ownership nelkul nincs branch delete,
   - source sync nelkul nincs clone commit finalization,
   - merge tovabbra is a source repo bubble branchre epit.
5. A fazis siker-kriteriuma nem az, hogy a clone bubble elinduljon, hanem az, hogy ha a successor activation task ezt kesobb megnyitja, akkor a local lifecycle family mar ne worktree-only feltetelezesekre tamaszkodjon.
6. A task nem vallalja:
   - clone bootstrap/start activationt,
   - remote bubble create/start/status/list/attach consume-ot,
   - remote approval/rework routingot,
   - a kesoi remote cleanup routingot.

## L0 - Policy

### Goal

Lezarni a local clone lifecycle cleanup familyt ugy, hogy egy kesobb aktivalt local clone bubble:
1. ne tudjon local-only committed allapotban beragadni explicit source-repo branch sync contract nelkul,
2. ne torolhessen ownership nelkul source-repo bubble branch-et,
3. ugyanazon topology-modelre tamaszkodjon commit, merge, delete es workspace cleanup soran,
4. mikozben a worktree-mode baseline valtozatlan marad.

### Domain / Control Model Summary

1. Business invariant: ha egy bubble local clone topologyban fut, akkor a lifecycle-vege (`commit` / `merge` / `delete`) nem szakadhat szet ket kulon truthra:
   - a clone workspace local HEAD-jere,
   - es egy ownership nelkul kezelt source-repo bubble branchre.
2. Control model: a local lifecycle family topology-donteseit nem a registered worktree jelenlete vagy egy azonos nevu branch puszta letezese, hanem explicit topology ownership bizonyitek donti el.
3. Read-path rule:
   - clone commit explicit local clone HEAD + source-repo bubble branch sync seamen zarul,
   - merge a source repo bubble branchen dolgozik,
   - delete/cleanup csak explicit ownership-proof mellett torol source branch-et,
   - clone workspace directory cleanup explicit clone git workspacekent kezelheto, nem csak registered worktreekent.
4. Forbidden fallback:
   - clone bubble `DONE` transition source sync nelkul,
   - source-repo bubble branch implicit force/update mozgatasa explicit safe-to-move bizonyitek nelkul,
   - source-repo bubble branch torlese pusztan attol, hogy a nev letezik,
   - clone workspace registered worktreekent valo implicit kezelese,
   - rejtett retry workaround, amely uj local commitot var el akkor is, ha a bubble mar local clone HEAD-en committed, de meg nincs source branch sync,
   - partial finalize side effect source-sync hiba utan (peldaul `DONE_PACKAGE` append, committed/done state write, vagy vele ekvivalens lifecycle artifact).
5. Allowed resolution path:
   - clone commit: local clone HEAD -> explicit source-repo branch sync -> csak ezutan finalization,
   - a clone commit source-branch sync csak explicit safe-to-move branch updatekent engedelyezett: a source repo `bubble_branch` csak akkor mozgathato a clone HEAD-re, ha a sync seam bizonyitani tudja, hogy a branch vart/current allapota ehhez kompatibilis; implicit force-push, vak overwrite vagy diverged branch update nem megengedett,
   - clone merge: source repo bubble branch -> base branch merge -> topology-aware cleanup,
   - clone delete: clone workspace ownership + explicit branch ownership proof -> safe cleanup,
   - worktree mode retained baseline.
6. Missing-data rule:
   - ha clone source-branch ownership nem bizonyithato, branch delete nincs,
   - ha clone source sync nem sikerul, vagy nem bizonyithato safe-to-move source branch update, commit finalization nincs,
   - ha merge source bubble branch hianyzik, a jelenlegi merge fail-closed behavior retained marad.
7. Phase boundary:
   - contract closure: predecessor-owned, Phase 1B1-1B2 mar lezarta a workspace authority familyt
   - runtime consume closure: predecessor-owned, Phase 1C1-1D mar lezarta a start/runtime/bubble-loop consume csaladot
   - local cleanup closure: owned here a local `commit` / `merge` / `delete` / workspace-cleanup familyben
   - activation closure: successor-only, Phase 2A
   - operator write/read closure: successor-only
   - remote cleanup/routing closure: successor-only, Phase 3B

### Authority Boundary Map

1. `authority_producer`
   - retained bubble config topology (`work_mode`, `bubble_branch`, `worktreePath`)
   - clone workspace local git HEAD
   - source-repo bubble branch HEAD, amikor a lifecycle family ezt explicit ownership-proofkent hasznalja
2. `persisted_authority`
   - `bubbleConfig.work_mode`
   - `bubbleConfig.bubble_branch`
   - `bubblePaths.worktreePath`
3. `cleanup_recovery_consumers` in scope
   - `src/v11/application/commit/commitCommandApi.ts`
   - `src/v11/application/commit/commitCommandGitStep.ts`
   - `src/v11/application/merge/mergeFlowContext.ts`
   - `src/v11/application/merge/mergeFlowFinalization.ts`
   - `src/v11/application/delete/deleteBubbleFinalization.ts`
   - `src/v11/infrastructure/workspace/worktreeManager.ts`
4. Explicit out-of-scope consumers
   - `src/v11/application/start/**`
   - `src/v11/infrastructure/channel/tmux/**`
   - `src/v11/application/pass/**`, `converged/**`, `askHuman/**`
   - operator read-model (`status`, `list`, `attach`)
   - remote mutation routing
5. Export surfaces closed in this phase:
   - `yes`, de csak a local lifecycle cleanup familyben
   - remote cleanup/routing tovabbra is successor ownership

### Baseline Preservation

1. Must-preserve behaviors:
   - worktree-mode `commit` / `merge` / `delete` viselkedes valtozatlan maradjon,
   - merge state gate es branch eligibility baseline retained maradjon,
   - delete archive/index creation baseline retained maradjon,
   - remote routing surfaces ne mozduljanak.
2. Allowed resolution paths:
   - worktree mode: retained registered-worktree + source branch cleanup baseline,
   - clone mode commit: local clone HEAD explicit source branch sync utan finalizable,
   - clone mode cleanup: explicit ownership-proof mellett branch delete, ownership-hianyban branch-retain fail-closed.
3. Forbidden regression interpretations:
   - a local cleanup closure nem jelent clone start activationt,
   - a local cleanup closure nem jelent remote cleanup routing cutovert,
   - a clone branch ownership proof nem helyettesitheto puszta branch-nev letezessel.
4. Replacement proof required if removed:
   - ha a registered-worktree baseline barmelyik touched surface-en megszunik, explicit bizonyitani kell, hogy a worktree-mode lifecycle valtozatlanul vegigviheto.

### In Scope

1. Clone topology explicit source-repo branch sync contractja a local commit familyben.
2. Determinisztikus, retryable clone commit behavior akkor is, ha a local clone HEAD mar committed, de a source-repo branch sync elmaradt.
3. Clone merge local source-branch consume es cleanup ownership explicit closure-ja.
4. Clone delete/workspace cleanup topology-aware workspace-remove + source-branch-delete szabalyai.
5. A fenti local lifecycle family explicit tesztproofja.

### Out of Scope

1. Clone start/bootstrap activation
2. Remote create/start orchestration
3. Remote status/list/attach read-model
4. Remote approval/rework routing
5. Remote command-router cleanup

### Target File Precision

1. A primer implementation surface a front matterben felsorolt production + test file-kre szukul; ezek fedik a Phase 1E local lifecycle cleanup contract tenyleges entrypointjait.
2. Nincs elore-jovahagyott incidental production vagy test file escape hatch a front matterben felsorolt `target_files` listan kivul.
3. Ha a typed boundary zarasa a felsorolt `target_files`-on kivuli filet igenyelne, azt scope blockernek kell tekinteni, es a taskot kell elobb pontositani; nem elfogadhato csendes par-file bovitesre hagyatkozni.
4. A `target_files` listan kivuli consume-feluletek tovabbra is tiltottak, az Authority Boundary Map explicit out-of-scope consumers listajaval osszhangban:
   - `src/v11/application/start/**`
   - `src/v11/infrastructure/channel/tmux/**`
   - `src/v11/application/pass/**`, `converged/**`, `askHuman/**`
   - operator read-model (`status`, `list`, `attach`)
   - remote mutation routing

### Safety Defaults

1. Ownership nelkul nincs source-branch delete.
2. Source sync nelkul nincs clone commit finalization.
3. Worktree mode nem regresszalodhat a clone topology closure miatt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - local `commit` clone finalization contract
   - local `merge` clone branch ownership/cleanup contract
   - local `delete` / workspace cleanup clone ownership contract
3. Fan-out note:
   - ugyanaz a topology decision tobb local lifecycle consumerben jelenik meg,
   - de operator read-model es remote routing tovabbra is kulon phase marad.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
   - `N/A`
   - `N/A`
10. Identity/join note:
   - canonical identity path: clone workspace HEAD -> explicit source branch sync / merge / cleanup ownership proof
   - competing identifiers or fallback identities: registered worktree presence, same-named source branch puszta letezese
11. Authority/source-of-truth note:
   - canonical source clone lifecycleben a topology-aware git ownership proof
   - forbidden secondary source a heuristic branch-delete pusztan name-match alapjan

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | Local clone bubble lifecycle-vege nem hagyhat local-only commit truthot vagy ownership-nelkul kezelt source branch-et. | A clone commit/merge/delete family topology-aware explicit contractot kap. | P1 | required-now |
| Control model | A touched lifecycle commands explicit topology ownership proof alapjan dontenek. | Registered worktree es same-named branch letezese onmagaban nem eleg. | P1 | required-now |
| Read-path rule | Clone commit local HEAD-et es source branch syncet, clone cleanup explicit ownership-proofot olvas. | A lifecycle surfaces nem maradhatnak worktree-only feltetelezeseken. | P1 | required-now |
| Forbidden fallback | Heuristic branch delete, implicit force/update branch move, es local-only/partial commit finalization tiltott. | Sync failure vagy ownership-hiany fail-closed marad. | P1 | required-now |
| Allowed resolution path | Local clone HEAD -> authorized source branch sync -> finalization; merge source branchrol; delete explicit proof mellett. | A worktree-mode baseline retained marad. | P1 | required-now |
| Missing-data rule | Sync/ownership hianyaban nincs destructive lifecycle lepés vagy partial finalization. | `DONE` transition, finalize side effect, vagy branch delete helyett explicit fail-closed / retain behavior. | P1 | required-now |
| Phase boundary | Ez local lifecycle cleanup closure. | Activation, operator read-model es remote routing successor-only. | P2 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `cleanupWorktreeWorkspace(...)` topology contract | merge finalization, delete finalization, direct workspace tests | additive / narrowing | clone topology explicit workspace-remove es branch-delete ownership rule-jat lezarja, mikozben a worktree baseline retained marad | remote cleanup routing Phase 3B |
| local commit finalization contract | `commitBubbleV11`, commit tests, caller-visible error family | additive / breaking | clone mode-ban explicit source-branch sync kotelezo a finalization elott; csak authorized safe-to-move branch update engedelyezett, sync-failure utan pedig explicit error family + retry path marad partial finalization nelkul | remote commit routing Phase 3B |
| local merge branch eligibility + cleanup contract | `mergeBubbleV11`, merge tests | additive | clone merge tovabbra is source repo bubble branchrol dolgozik, de a topology-aware cleanup explicit proofot kap | remote merge routing Phase 3B |

### 0b) Baseline Preservation (if applicable)

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| worktree-mode local commit/merge/delete | preserve | a meglevo worktree-mode tests valtozatlanul zoldben maradnak | P1 | required-now |
| worktree-mode registered cleanup path + source branch delete | preserve and extend | clone topology explicit branch ownership mellett uj proof, worktree-mode registered cleanup retained proof | P1 | required-now |
| clone commit source sync nelkul vagy unsafe branch move-val lokalisan tovabbmenne | forbid | explicit clone sync-failure, safe-to-move failure es retry-proof partial finalization tiltassal | P1 | required-now |
| source branch delete puszta branch-letezessel | forbid | explicit branch-mismatch/no-ownership cleanup test | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/v11/application/commit/commitCommandApi.ts`, `commitCommandGitStep.ts` | `commitBubble(...)`, `runCommitGitStep(...)` | existing exports | local clone commit seam | clone mode-ban a source-repo bubble branch sync a finalization elott kotelezo; csak authorized safe-to-move branch update engedelyezett, sync-failure utan nincs `DONE` transition vagy partial finalization, es explicit retry path marad | P1 | required-now | T1, T2, T3, T9 |
| CS2 | `src/v11/application/merge/mergeFlowContext.ts` | `initializeMergeFlowExecutionContext(...)` | existing export | local merge precondition seam | clone topologyban is explicit source repo bubble branchrol dolgozik; a merge tovabbra sem feltetelezhet local-only clone branch truthot | P1 | required-now | T4, T7, T8 |
| CS3 | `src/v11/application/merge/mergeFlowFinalization.ts` | `finalizeMergeFlow(...)` | existing export | local merge cleanup seam | clone merge utan a workspace cleanup ugyanarra a topology ownership rule-ra ul, mint a delete family | P1 | required-now | T4, T5, T7 |
| CS4 | `src/v11/application/delete/deleteBubbleFinalization.ts` | `cleanupDeleteWorkspace(...)` | existing export | local delete cleanup seam | clone workspace remove kulon topology-pathkent zarul; source branch csak ownership-proof mellett torolheto | P1 | required-now | T5, T6 |
| CS5 | `src/v11/infrastructure/workspace/worktreeManager.ts` | `cleanupWorktreeWorkspace(...)` | existing export | topology-aware workspace cleanup seam | registered worktree es clone git workspace kulon, explicit cleanup rule-t kap; branch delete ownership nelkul fail-closed retain | P1 | required-now | T5, T6, T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| clone commit finalization | local git commit eleg a lifecycle tovabblepeshez | clone mode-ban explicit source-repo branch sync kotelezo a finalization elott, es csak authorized safe-to-move branch update engedelyezett | `bubbleId`, `bubble_branch`, local clone HEAD, source branch current/expected update proof | existing optional refs/message/auto flags | behaviorally breaking clone-mode path; worktree-mode retained | P1 | required-now |
| clone cleanup ownership | branch letezes eleg a delete pathnak | source branch delete csak explicit ownership-proof mellett | `bubble_branch`, workspace topology, git HEAD proof amikor elerheto | branch retain fail-closed outcome | additive safety tightening | P1 | required-now |
| clone merge local precondition | source repo bubble branch kell a merge-hez | retained, de Phase 1E explicitten erre epit a clone lifecycle familyben | `baseBranch`, `bubbleBranch` | `push`, `deleteRemote` | retained behavior, explicit closure | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| local clone commit | local commit + authorized explicit source branch sync | `DONE` transition source sync nelkul vagy implicit unsafe branch move-val | worktree-mode retained; a source branch update nem lehet vak overwrite vagy implicit force | P1 | required-now |
| clone commit retry | source sync ujraprobalasa mar letezo local HEAD-re epitve | uj local commit vagy uj valtozas megkovetelese pusztan a retryhoz | retry determinisztikus; a retained local commitot kell source branchre syncelni | P1 | required-now |
| clone commit sync failure post-state | nincs finalize side effect; bubble `APPROVED_FOR_COMMIT` allapotban retryolhato marad | committed/done state write, `DONE_PACKAGE` append, vagy barmely partial finalization artifact source-sync hiba utan | a sync-hiba nem hagyhat maga utan felig-finalizalt lifecycle allapotot | P1 | required-now |
| local merge/delete cleanup | topology-aware workspace remove + explicit branch delete | heuristic branch delete name-match alapjan | clone topology fail-closed ha ownership unclear | P1 | required-now |
| clone workspace cleanup topology | explicit clone git workspace cleanup rule | clone workspace implicit registered worktreekent kezelese | a clone workspace remove nem tamaszkodhat pusztan worktree registry jelenletre | P1 | required-now |
| remote surfaces | none | remote SSH / status / attach / approval routing | successor-only | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| clone commit source sync succeeds | local git + source repo sync | result | normal finalization | existing success path | info | P1 | required-now |
| clone commit source sync fails | local git + source repo sync | throw | nincs `DONE` transition, nincs partial finalization artifact/state write; explicit retry path retained marad `APPROVED_FOR_COMMIT` allapotbol | `COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED` | error | P1 | required-now |
| clone commit source branch diverged vagy safe-to-move proof hianyzik | local git + source repo branch state proof | throw | nincs branch move, nincs `DONE` transition, nincs partial finalization artifact/state write; bubble retryolhato marad ugyanarra a local HEAD-re epitve | explicit `COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED` sync-failure family | error | P1 | required-now |
| clone delete cleanup source ownership unclear | topology-aware cleanup | fallback | workspace remove mehet, source branch retain | existing delete success path `removedBranch=false` retained | warning | P1 | required-now |
| clone merge source bubble branch missing | merge branch eligibility | throw | retained merge fail-closed | existing merge branch eligibility family | error | P1 | required-now |
| worktree-mode lifecycle | existing deps | result | existing baseline | existing families retained | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
| --- | --- | --- | --- |
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | `docs/remote-bubble-execution.md` flat clone topology rules | P1 | required-now |
| must-use | `src/v11/infrastructure/workspace/worktreeManager.ts` as shared local cleanup port | P1 | required-now |
| must-not-use | start/runtime consume files as implementation target | P1 | required-now |
| must-not-use | remote router / status / attach surfaces | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | clone commit syncs source repo branch before finalization | clone bubble allapota `APPROVED_FOR_COMMIT`, es a valtozas a clone workspace-ben staged | `commitBubble(...)` lefut | a source repo `bubble_branch` a clone HEAD-re mutat, es csak ezutan tortenhet meg a finalization / `DONE` transition | P1 | required-now | `tests/core/bubble/commitBubble.test.ts` |
| T2 | clone commit sync failure does not finalize | clone bubble allapota `APPROVED_FOR_COMMIT`, a local commit letrehozhato, de a source sync forced dependencyvel, git collisionnel vagy unsafe branch-update allapottal hibazik | `commitBubble(...)` fut | explicit `COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED` sync-failure hiba jon vissza, nincs `DONE` transition, nincs `DONE_PACKAGE` append vagy vele ekvivalens partial finalization artifact/state write, es a bubble nem latszhat sikeresen finalizaltnak csak a local commit miatt | P1 | required-now | `tests/core/bubble/commitBubble.test.ts` |
| T3 | clone commit retry path explicit marad local committed HEAD utan is | clone bubble allapota `APPROVED_FOR_COMMIT`, a local HEAD mar a kivant commitot hordozza, de a source branch meg nincs erre a SHA-ra syncelve vagy safe-to-move updatekent nem bizonyithato | `commitBubble(...)` ujra fut | nem kell uj local valtozast vagy uj commitot gyartani csak a source sync ujraprobalasahoz; a retry determinisztikus, ugyanarra a topology contractra epul, nincs partial finalization maradvany az elozo sikertelen korbol, es sikeres retry utan a source repo `bubble_branch` a clone HEAD-re mutat | P1 | required-now | `tests/core/bubble/commitBubble.test.ts` |
| T4 | clone merge local source branchrol dolgozik es cleanupot zar | clone bubble allapota `DONE`, a source repo `bubble_branch` elerheto merge inputkent, es a merge-state eligibility retained baseline teljesul | `mergeBubble(...)` lefut | merge a source repo branchrol tortenik, nem local-only clone branch truthrol, es a topology-aware cleanup ugyanarra az ownership rule-ra ul, mint a delete family | P1 | required-now | `tests/core/bubble/mergeBubble.test.ts` |
| T5 | clone delete/workspace cleanup only removes owned source branch | clone workspace es source branch ownership explicit proofja adott | `deleteBubble(...)` vagy `cleanupWorktreeWorkspace(...)` fut | clone workspace torlodik, es a source branch csak ownership-proof mellett torlodik | P1 | required-now | `tests/core/bubble/deleteBubble.test.ts`, `tests/core/workspace/worktreeManager.test.ts` |
| T6 | clone delete keeps source branch when ownership unclear | clone workspace letezik, de a source branch ownership nem bizonyithato ugyanazon topology modellel | cleanup fut | workspace cleanup lefut, de `removedBranch=false` marad, es a retained branch nem minosul sikeres ownership-derived torlesnek | P1 | required-now | `tests/core/bubble/deleteBubble.test.ts`, `tests/core/workspace/worktreeManager.test.ts` |
| T7 | worktree-mode cleanup baseline retained | registered worktree bubble | cleanup/merge/delete lefut | a meglevo worktree-mode removedWorktree/removedBranch baseline nem regresszal | P1 | required-now | `tests/core/workspace/worktreeManager.test.ts`, `tests/core/bubble/mergeBubble.test.ts`, `tests/core/bubble/deleteBubble.test.ts` |
| T8 | clone merge fail-closed marad, ha a source repo bubble branch hianyzik | clone bubble allapota `DONE`, de a source repo `bubble_branch` nem erheto el merge inputkent | `mergeBubble(...)` fut | a retained merge branch eligibility failure ervenyesul, es nincs merge vagy cleanup side effect a hianyzo source branch mellett | P1 | required-now | `tests/core/bubble/mergeBubble.test.ts` |
| T9 | clone commit fail-closed marad diverged vagy unsafe source branch update eseten | clone bubble allapota `APPROVED_FOR_COMMIT`, a local HEAD commit kesz, de a source repo `bubble_branch` current state-je diverged vagy nem bizonyithato safe-to-move updatekent | `commitBubble(...)` fut | a branch update nem tortenik meg implicit force/overwrite modon, explicit `COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED` sync-failure family jon vissza, nincs `DONE` transition, nincs `DONE_PACKAGE` append vagy vele ekvivalens partial finalization artifact/state write, es a bubble ugyanarra a local HEAD-re epitve retryolhato marad | P1 | required-now | `tests/core/bubble/commitBubble.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a clone commit retry proof tul sok implicit allapotot erint, erdemes kulon helperrel szetvalasztani a "create local commit" es a "sync source branch" lepest.
2. [later-hardening] A remote Phase 3B routing taskban ugyanennek a local topology ownership modelnek a remote command-wrapper megfelelojet kell hasznalni, nem uj delete heurisztikat.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | clone lifecycle ownership proof manual git recovery runbook | L2 | P2 | later-hardening | Phase 1E successor boundary | lezarni Phase 3C recovery taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Ha a clone lifecycle source-branch ownership proof nem explicit, a review defaultja `rework`.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
