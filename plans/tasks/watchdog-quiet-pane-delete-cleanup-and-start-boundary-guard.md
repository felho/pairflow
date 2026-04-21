---
artifact_type: task
artifact_id: task_watchdog_quiet_pane_delete_cleanup_and_start_boundary_guard_v1
title: "Watchdog Quiet-Pane Delete Cleanup and Start-Boundary Guard"
status: implementable
phase: phase1
target_files:
  - src/v11/application/delete/deleteBubble.ts
  - src/v11/application/delete/deleteBubbleSupport.ts
  - src/v11/application/delete/deleteBubbleRemoteMissingTargetFallback.ts
  - src/v11/defaults/delete/deleteBubbleDefaults.ts
  - src/v11/shared/status/bubbleAttention.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - tests/core/bubble/deleteBubble.test.ts
  - tests/v11/shared/status/bubbleAttention.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/core/ui/router.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/v1.1-boundary-simplification/task-m5-01-watchdog-timeout-pane-quiet-window.md
owners:
  - "felho"
---

# Task: Watchdog Quiet-Pane Delete Cleanup and Start-Boundary Guard

## Feynman Summary / One-Screen Model

1. A quiet-pane warning ma a `.pairflow/runtime/watchdog-health/<bubbleId>.json` artifactbol olvassa a legutobbi `last_changed_at` es `sampled_at` ertekeket.
2. Ez az artifact bubble ID-ra van kulcsolva, nem bubble-directory lifecycle-re.
3. Emiatt ha egy bubble torlodik, majd ugyanazzal az ID-val ujra letrejon, a stale health record rovid ideig az uj runra is rahuzodhat.
4. A primary fix: sikeres `delete` utan a local `watchdog-health/<bubbleId>.json` torlodjon.
5. A secondary hardening: quiet-pane warning csak akkor jelenhet meg, ha a mintabol szarmazo `sampled_at` legalabb az aktualis bubble start idejenel ujabb.
6. A `watchdog-history/<bubbleId>.ndjson` retained diagnosztikai artifact marad; ezt ez a task nem torli.

## Current Codebase Check / Current-Tree Reality Check (2026-04-21)

1. A pane-activity canonical runtime record path bubble ID-ra kulcsolt:
   - [src/v11/shared/watchdog/watchdogPaneActivityStore.ts](/Users/felho/dev/pairflow/src/v11/shared/watchdog/watchdogPaneActivityStore.ts:38)
2. A delete flow ma runtime sessiont, tmux sessiont, worktree-t, branch-et es bubble directoryt takarit, de explicit `watchdog-health` cleanup nincs:
   - [src/v11/application/delete/deleteBubble.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubble.ts:312)
   - [src/v11/application/delete/deleteBubbleFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubbleFinalization.ts:195)
3. A quiet-pane warning jelenleg csak a `last_changed_at` es az aktualis ido kulonbsegebol el, es nem ellenorzi, hogy a minta az aktualis bubble runhoz tartozik-e:
   - [src/v11/shared/status/bubbleAttention.ts](/Users/felho/dev/pairflow/src/v11/shared/status/bubbleAttention.ts:167)
4. A local status surface mar tud bubble-start lower boundot adni a `bubble_instance_id` alapjan:
   - [src/v11/shared/status/statusCommandViewBuilder.ts](/Users/felho/dev/pairflow/src/v11/shared/status/statusCommandViewBuilder.ts:122)
5. A delete dependency shape ma a support-contractban el, nem pusztan a defaults objectben:
   - [src/v11/application/delete/deleteBubbleSupport.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubbleSupport.ts:61)
6. A remote delete sikeres local finalization familyje tartalmaz egy `missing-target` fallback success agat is:
   - [src/v11/application/delete/deleteBubbleRemoteMissingTargetFallback.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubbleRemoteMissingTargetFallback.ts:1)
7. A list es a detail presenter ugyanazt a shared `resolveBubbleAttention(...)` logikat hasznalja, tehat a stale quiet-pane warning tobb consume surface-en is ugyanonnan ered:
   - [src/v11/shared/list/listCommandEntryProjection.ts](/Users/felho/dev/pairflow/src/v11/shared/list/listCommandEntryProjection.ts:132)
   - [src/v11/infrastructure/ui/presenters/bubblePresenter.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/ui/presenters/bubblePresenter.ts:118)
8. A detail consume-hoz van direct presenter proof surface is:
   - [tests/core/ui/bubblePresenter.test.ts](/Users/felho/dev/pairflow/tests/core/ui/bubblePresenter.test.ts:1)
9. A remote refreshed list path is ugyanazt a shared attention resolver-t consume-olja, es mar kap `bubbleStartedAt` mezot a remote status snapshotbol:
   - [src/v11/shared/list/listCommandEntryProjection.ts](/Users/felho/dev/pairflow/src/v11/shared/list/listCommandEntryProjection.ts:387)
   - [src/v11/shared/status/remoteBubbleStatusContract.ts](/Users/felho/dev/pairflow/src/v11/shared/status/remoteBubbleStatusContract.ts:25)
10. Target-file reality:
   - ez nem altalanos watchdog taxonomy task,
   - ez egy bounded cleanup + read-model hardening task,
   - a shared warning logicot csak annyiban erinti, amennyiben a stale previous-run artifactot ki kell zarni.

## Source-Anchor Consistency

1. Canonical source anchors:
   - [src/v11/shared/watchdog/watchdogPaneActivityStore.ts](/Users/felho/dev/pairflow/src/v11/shared/watchdog/watchdogPaneActivityStore.ts)
   - [src/v11/application/delete/deleteBubble.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubble.ts)
   - [src/v11/application/delete/deleteBubbleSupport.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubbleSupport.ts)
   - [src/v11/application/delete/deleteBubbleRemoteMissingTargetFallback.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubbleRemoteMissingTargetFallback.ts)
   - [src/v11/shared/status/bubbleAttention.ts](/Users/felho/dev/pairflow/src/v11/shared/status/bubbleAttention.ts)
   - [src/v11/shared/status/statusCommandViewBuilder.ts](/Users/felho/dev/pairflow/src/v11/shared/status/statusCommandViewBuilder.ts)
   - [src/v11/shared/status/remoteBubbleStatusContract.ts](/Users/felho/dev/pairflow/src/v11/shared/status/remoteBubbleStatusContract.ts)
   - [tests/core/ui/bubblePresenter.test.ts](/Users/felho/dev/pairflow/tests/core/ui/bubblePresenter.test.ts)
   - [docs/v1.1-boundary-simplification/task-m5-01-watchdog-timeout-pane-quiet-window.md](/Users/felho/dev/pairflow/docs/v1.1-boundary-simplification/task-m5-01-watchdog-timeout-pane-quiet-window.md)
2. Closed canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - a pane-activity runtime artifact tovabbra is `.pairflow/runtime/watchdog-health/<bubbleId>.json`,
   - a quiet-pane warning tovabbra is sampled pane activitybol szarmazik,
   - a `watchdog-history` retained diagnosztikai artifact marad.
3. Uj explicit clarification, amelyet ez a task zar le:
   - a quiet-pane warning csak az aktualis bubble run mintajara epulhet,
   - sikeres delete utan a stale local health snapshot nem maradhat vissza ugyanarra a bubble ID-ra.
   - a `bubbleStartedAt` lower bound existing canonical derivationbol vagy mar meglevo remote snapshot fieldbol jon; a task nem vezethet be ettol fuggetlen uj start-ido heurisztikat.
4. `drift_status`:
   - `closed_contract_revised_explicitly`

## Authority Boundary Map

1. `authority_producer`
   - `deleteBubble(...)` local finalization a stale `watchdog-health` artifact lifecycle producerje ebben a taskban.
2. `persisted_authority`
   - in scope:
   - `.pairflow/runtime/watchdog-health/<bubbleId>.json`
   - a bubble start lower-bound timestamp consume-ja a quiet-pane decisionhoz
3. `internal_execution_consumers`
   - in scope:
   - delete success finalization
4. `workflow_orchestration_consumers`
   - in scope:
   - local es remote force-delete local finalization path
5. `read_model_consumers`
   - in scope:
   - list attention
   - detail/status attention
6. `cleanup_recovery_consumers`
   - in scope:
   - delete destructive closure
7. `explicitly_out_of_scope`
   - `watchdog-history` archival policy
   - altalanos pane-activity retention redesign
   - bubble ID helyetti instance-scoped runtime path bevezetese

## Scope Reality / Shape Proof

1. Actual touched scope:
   - successful delete utani local runtime artifact cleanup
   - quiet-pane warning fail-closed lower-bound guard
2. A task nem ownershipolja:
   - watchdog sampling cadence vagy sampler semantics valtoztatasat,
   - status payload shape boviteset,
   - bubble identity schema valtoztatasat.
3. Hidden-scope kizárás:
   - a delete cleanup dependency seam valos owner boundaryja a `deleteBubbleSupport.ts` contract,
   - a remote delete success familyhez a `missing-target` fallback local finalization is hozzatartozik,
   - a local start-boundary derivacio valos source anchorja a `statusCommandViewBuilder.ts`,
   - a detail consume proof surfacehez direct presenter test coverage is kell.
4. `primary_task_shape`
   - `fail_closed_hardening`
5. `secondary_task_shape`
   - `consumer_family_alignment`
6. `why_secondary_shape_is_safe`
   - ugyanaz a stale pane-activity artifact okozza a delete utani es a read-model warning problemat,
   - a read-model oldali guard csak a delete cleanup residual kockazatat zarja le, nem kulon consume-family redesign.

## Closure Budget / Task-Shape Triage

1. `closure_buckets_touched`
   - `internal_execution_consumers`
   - `read_model_consumers`
   - `cleanup_recovery_consumers`
2. `collapsed_closures`
   - delete success cleanup
   - quiet-pane previous-run guard
3. `why_collapse_is_safe`
   - ugyanazt a previous-run stale record kockazatot zarjak,
   - nincs uj shared payload contract,
   - nincs producer/read-model truth cutover, csak stale source kizaras.

## Complexity-Risk Triage

1. `risk_score`
   - `3`
2. `split_decision`
   - `single_task_acceptable`
3. `authority_risk`
   - `1`
4. `surface_spread`
   - `1`
5. `identity_join_risk`
   - `1`
6. `activation_coupling`
   - `0`
7. `prerequisite_risk`
   - `0`
8. `acceptance_multiplicity`
   - `1`

## Baseline Preservation

1. `must_preserve_behaviors`
   - quiet-pane warning tovabbra is megjelenik valodi inactivity eseten,
   - `watchdog-history` retained artifact erintetlen marad,
   - delete confirmation path nem mutalhat runtime health artifactot.
2. `allowed_resolution_paths`
   - successful local delete -> local `watchdog-health` cleanup
   - successful remote force-delete local finalization -> local `watchdog-health` cleanup
   - successful remote missing-target fallback finalization -> local `watchdog-health` cleanup
   - quiet-pane warning only if `sampled_at >= bubbleStartedAt`, amikor a start boundary elerheto
   - local consume pathon a `bubbleStartedAt` existing canonical derivaciobol jon
   - remote refreshed consume pathon a `bubbleStartedAt` a retained remote status snapshot fieldbol jon
3. `forbidden_regression_interpretations`
   - nem eleg a stale warningot csak UI oldalon elrejteni a persisted stale record megtartasa mellett,
   - nem szabad a secondary guard cimen a valodi quiet-pane warningokat elhallgattatni,
   - nem szabad `watchdog-history` retained diagnosztikat csendben torolni.

## Success / Completion Proof Boundary

1. Current canonical completion proof source:
   - successful delete result + retained cleanup booleans, de a `watchdog-health` artifactra nincs explicit parity.
2. Target canonical completion proof source:
   - successful delete local finalization explicit `watchdog-health` cleanup-paritassal.
3. Reused proof contract:
   - delete only-successful-finalization mutalhat retained local runtime artifacts.
4. Final truth surfaces affected:
   - list attention
   - detail/status attention
   - delete local cleanup residual state
5. Mixed-truth surfaces allowed:
   - `none`

## Precondition and Side-Effect Boundary

1. Preconditions a local `watchdog-health` cleanup elott:
   - a delete mar success pathra jutott,
   - archive continuity es destructive cleanup contract mar ervenyesult az adott route szerint.
2. Side effects, amelyek confirmation vagy failed pathon tiltottak:
   - `watchdog-health` torles
3. Quiet-pane guard precondition:
   - csak `last_sample_status=sampled` warning lehet candidate,
   - es a sample only akkor szamolhato az aktualis runhoz, ha `sampled_at >= bubbleStartedAt`.
4. Missing start-boundary behavior:
   - ha `bubbleStartedAt` nem all rendelkezesre, preserve current warning behavior; a primary stale-source fix tovabbra is a delete cleanup.

## L0 - Policy

### Goal

1. Sikeres bubble delete utan ugyanarra a bubble ID-ra ne maradjon vissza stale `watchdog-health` runtime snapshot.
2. A quiet-pane warning csak az aktualis bubble run mintajara epulhessen.
3. A javitas bounded maradjon:
   - `watchdog-health`: toroljuk,
   - `watchdog-history`: megtartjuk.

### Context

Observed failure class:
1. egy bubble torlodik,
2. ugyanazzal az ID-val rovid idon belul uj bubble indul,
3. az uj watchdog sample megerkezese elott a shared attention logika meg a korabbi run `last_changed_at` / `sampled_at` snapshotjat latja,
4. ez hamis quiet-pane warningot villanthat fel.

Why this matters:
1. a warning nem a bubble directorybol jon, hanem persisted runtime health artifactbol,
2. emiatt a bubble directory torlese onmagaban nem zarja le a stale warning kockazatat,
3. a problema ugyanazt a stale sourceot erinti delete es read-model oldalon, ezert a ket fix egy taskban zarhato.

### In Scope

1. Local successful delete utan a `watchdog-health/<bubbleId>.json` torlese.
2. Remote force-delete successful local finalization utan ugyanennek a local artifactnak a torlese.
3. Remote `missing-target` fallback successful local finalization utan ugyanennek a local artifactnak a torlese.
4. Quiet-pane warning lower-bound guard:
   - `sampled_at >= bubbleStartedAt`.
5. A megfelelo automated coverage:
   - delete branch proof,
   - list proof,
   - status/detail proof.

### Out of Scope

1. `watchdog-history/<bubbleId>.ndjson` torlese.
2. Instance-scoped watchdog-health path redesign.
3. Sampling cadence, hash strategy, vagy pane unreadable/no session semantics modositas.
4. Uj public API/status payload mezo bevezetese.
5. Uj vagy duplikalt bubble-start timestamp heuristic bevezetese ott, ahol mar letezik canonical derivacio vagy remote snapshot field.

### Safety Defaults

1. Delete confirmation path nem torolhet runtime health artifactot.
2. Failed delete path nem torolhet runtime health artifactot.
3. Quiet-pane warningot csak akkor nyomjuk el start-boundary alapon, ha a boundary explicit elerheto.
4. Ha a bubble start ido nem elerheto, a rendszer preserve-olja a jelenlegi warning semanticsot.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/delete/deleteBubble.ts` | `deleteBubble(...)` | existing delete entrypoint | successful local delete finalization es successful remote force-delete local finalization utan | Torolje a local `.pairflow/runtime/watchdog-health/<bubbleId>.json` artifactot best-effort-nel szigorubb, de `ENOENT` tolerant modon; confirmation/failed path nem torolhet | P1 | required-now | current delete success path leaves stale health record |
| CS2 | `src/v11/application/delete/deleteBubbleSupport.ts` | `DeleteBubbleDependencies` / `resolveDeleteDependencies(...)` | existing delete dependency contract | delete cleanup seam definition | Az explicit health-cleanup file-removal seamet a tenyleges dependency contract boundary ownershipolja; ne csak a defaults objectben jelenjen meg | P1 | required-now | actual delete dependency shape lives here |
| CS3 | `src/v11/application/delete/deleteBubbleRemoteMissingTargetFallback.ts` | `maybeFinalizeRemoteDeleteMissingTargetFallback(...)` | existing remote fallback finalization seam | success fallback local finalization | A `missing-target` recovery-success utvonal ugyanabba a local health-cleanup paritybe essen, mint a tobbi successful delete finalization | P1 | required-now | hidden delete-success boundary today |
| CS4 | `src/v11/defaults/delete/deleteBubbleDefaults.ts` | delete dependency defaults | existing defaults object | dependency implementation backing | A support-contract altal igenyelt health-cleanup default dependency itt kapjon konkret default wiringot | P1 | required-now | keep delete cleanup unit-testable |
| CS5 | `src/v11/shared/status/bubbleAttention.ts` | `resolveQuietPaneAttention(...)` / `resolveBubbleAttention(...)` | existing shared attention resolver | quiet-pane warning gate | Quiet warning csak akkor jelenhet meg, ha a pane sample az aktualis bubble runhoz tartozik; `sampled_at < bubbleStartedAt` eseten a warning suppressed | P1 | required-now | stale previous-run sample should not count |
| CS6 | `src/v11/shared/status/statusCommandViewBuilder.ts` | existing local status view build path | existing status builder internals | canonical start-boundary source reuse | A local consume path a mar letezo `bubbleStartedAt` canonical derivaciot reuse-olja vagy kozos helperbe emeli; ne vezessen be kulon dedukalt start-idot a list/detail guardhoz | P1 | required-now | avoid duplicated timestamp heuristics |
| CS7 | `src/v11/shared/list/listCommandEntryProjection.ts` | `buildLocalBubbleListEntry(...)` es `buildRefreshedRemoteBubbleListEntry(...)` | existing list attention call-sites | start-boundary atadasa a shared attention resolvernek | A local list a canonical local start-boundaryt, a remote refreshed list pedig a remote snapshot `bubbleStartedAt` mezot adja at ugyanahhoz a guardhoz | P1 | required-now | shared attention parity across local + remote refresh |
| CS8 | `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` | `presentBubbleDetail(...)` | existing detail presenter | start-boundary atadasa a shared attention resolvernek | A bubble detail/status felulet se villanthasson stale quiet-pane warningot elozo run alapjan, es ugyanazt a lower-bound policy-t consume-olja, mint a list/status surfaces | P1 | required-now | screenshot-level observed symptom |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Delete cleanup parity | runtime session/tmux/worktree/branch cleanup explicit, `watchdog-health` implicit retained residue | successful delete explicit local `watchdog-health` cleanup | `bubbleId`, runtime dir/path, success-path proof point | file-removal dependency seam | internal behavior extension | P1 | required-now |
| Quiet-pane warning eligibility | `last_sample_status=sampled` + `quietSeconds>=threshold` | plus current-run lower bound | `sampled_at`, `bubbleStartedAt` when available | absent-start fallback preserve-current | internal behavior hardening | P1 | required-now |
| History retention | unspecified in delete task | preserved baseline | none | none | preserve baseline | P1 | required-now |

Field-role classification:
1. canonical:
   - `paneActivityRead.record.sampled_at`
   - `bubbleStartedAt`
   - local pathon az existing `bubble_instance_id -> bubbleStartedAt` derivacio
   - remote refreshed pathon a retained `remoteStatusSnapshot.bubbleStartedAt`
2. guard:
   - `sampled_at >= bubbleStartedAt`
3. compat/preserve-current:
   - `bubbleStartedAt === null` -> existing quiet-pane evaluation marad

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Delete success cleanup | local `watchdog-health` artifact torlese | `watchdog-history` torlese | only success path | P1 | required-now |
| Delete confirmation / failed path | none | artifact torles | no speculative cleanup | P1 | required-now |
| Quiet-pane warning | warning suppression when sample predates bubble start | broad warning disable | guard only previous-run stale sample ellen | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| successful delete path, health file missing | local FS | fallback | treat as already clean, continue success | n/a | none | P1 | required-now |
| successful delete path, health cleanup hard failure | local FS | throw | fail closed rather than silently claiming full cleanup while stale health remains | DELETE_RUNTIME_HEALTH_CLEANUP_FAILED or equivalent task-local error mapping | error | P1 | required-now |
| quiet-pane evaluation with missing `bubbleStartedAt` | attention input | fallback | preserve current warning logic | none | none | P1 | required-now |
| quiet-pane evaluation with invalid/earlier sample than bubble start | attention input | result | return `null` for quiet-pane warning | none | none | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing `.pairflow/runtime/watchdog-health/<bubbleId>.json` path authority | P1 | required-now |
| must-use | shared `resolveBubbleAttention(...)` parity across list + detail | P1 | required-now |
| must-use | existing `bubbleStartedAt` canonical derivation / retained remote snapshot field reuse | P1 | required-now |
| must-not-use | `watchdog-history` implicit cleanup | P1 | required-now |
| must-not-use | start-boundary heuristic from `activeSince` vagy mas run-local mutable timestamp | P1 | required-now |
| must-not-use | local list/detail sajat, a status-viewtol fuggetlen bubble-start timestamp ujraderivalasa | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | local successful delete removes health snapshot | bubble-hoz letezik `watchdog-health/<bubbleId>.json` | local `deleteBubble(..., force:true)` success path lefut | a health file torlodik; delete result success marad | P1 | required-now | primary fix |
| T2 | remote force-delete local finalization removes health snapshot | started remote bubble + local health file jelen van | remote force-delete success local finalization lefut | a local health file torlodik | P1 | required-now | parity with remote delete closure |
| T3 | remote missing-target fallback finalization removes health snapshot | remote delete transport/fallback success pathra all, local health file jelen van | `missing-target` fallback successful finalization lefut | a local health file torlodik | P1 | required-now | hidden success branch parity |
| T4 | confirmation path preserves health snapshot | artifacts miatt delete confirmation kell | delete confirmation path fut | a health file megmarad | P1 | required-now | no speculative cleanup |
| T5 | health history retained | bubble-hoz `watchdog-history/<bubbleId>.ndjson` jelen van | successful delete lefut | history file erintetlen | P1 | required-now | preserved diagnostics baseline |
| T6 | quiet-pane suppressed for previous-run sample | `sampled_at` korabbi, mint `bubbleStartedAt`; threshold egyebkent teljesulne | attention resolver fut | `quiet_pane` warning nincs | P1 | required-now | observed stale-banner class |
| T7 | quiet-pane still appears for current-run inactivity | `sampled_at >= bubbleStartedAt` es `last_changed_at` thresholden tul van | attention resolver fut | `quiet_pane` warning megjelenik | P1 | required-now | preserve baseline |
| T8 | missing start boundary preserves current behavior | `bubbleStartedAt=null`, sample egyebkent quiet | attention resolver fut | current quiet-pane result marad | P1 | required-now | compat guard |
| T9 | local list reuses canonical start boundary | local bubble with existing `bubble_instance_id`-derived start lower bound | list build path fut | a guard ugyanazt a canonical `bubbleStartedAt` forrast hasznalja, nem uj local heuristicet | P1 | required-now | source-anchor parity |
| T10 | detail/status consume path obeys the same guard | status/detail surface `bubbleStartedAt`-tal es stale previous-run sample-lel | UI/detail presentation fut | stale quiet-pane warning nem jelenik meg a detail/status consume surface-en sem | P1 | required-now | proof surface for presenter path |
| T11 | direct presenter proof surface covers the same policy | presenter-level fixture stale previous-run sample-lel | `presentBubbleDetail(...)` fut | ugyanaz a lower-bound suppression ervenyesul direct presenter proofon is | P1 | required-now | direct proof, not only indirect router/status proof |

## Acceptance Criteria

1. AC1: Sikeres delete utan nem marad vissza local `.pairflow/runtime/watchdog-health/<bubbleId>.json` artifact sem local, sem remote force-delete successful finalization, sem remote `missing-target` fallback successful finalization pathon.
2. AC2: `watchdog-history/<bubbleId>.ndjson` retained marad.
3. AC3: A shared quiet-pane warning nem jelenik meg olyan sample alapjan, amelynek `sampled_at` idobelyege az aktualis `bubbleStartedAt` elott van.
4. AC4: Ha a `bubbleStartedAt` nem elerheto, a quiet-pane warning jelenlegi viselkedese preserve-olodik.
5. AC5: A list es a detail/status consume surface ugyanazt a lower-bound guardot hasznalja.

## L2 - Implementation Notes (Optional)

1. [cleanup-seam] A `watchdog-health` cleanupot erdemes explicit helper/dependency seam moge tenni, hogy a delete unit tesztekben kulon provable legyen a success/confirmation/failure branch.
2. [guard-source] A start-boundary forras explicit `bubbleStartedAt` legyen; ne `activeSince`, mert az round/role atadasnal vagy resume pathon mas jelentest hordozhat.
3. [future-hardening] Ha kesobb tovabbi stale-source osztaly marad, jo kovetkezo lepes lehet a pane-activity record instance-aware kulcsolasa, de ez jelen taskon kivul van.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | instance-scoped pane-activity storage | L2 | P2 | later | bubble ID reuse still fundamentally possible outside delete | future redesign if delete cleanup + start guard is not sufficient |
| H2 | remote target-side cleanup parity | L2 | P2 | later | current task only local stale recordot zar | only needed if remote-side UI/watchdog surfaces expose the same reuse artifact |

## Review Control

1. Ez implementalhato bounded task.
2. A taskot nem kell tovabbi plan-szintu splitre bontani.
3. A review soran a fo kerdes:
   - eleg szuk marad-e a scope a `watchdog-health` cleanup + start-boundary guard ket closurejara.

## Assumptions

1. A hamis quiet-pane banner fo observed oka a stale local `watchdog-health` artifact, nem a bubble directory.
2. A `bubbleStartedAt` eleg jo current-run lower bound a previous-run sample kizarasahoz, ha elerheto.

## Open Questions

1. A delete oldali health-cleanup hard failuret milyen meglvo error taxonomy ala erdemes bekotni, ha nincs ma pontos delete-specific reason code erre?
