---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_live_run_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Live-Run Removal (Phase E)"
status: completed
phase: phaseE
target_files:
  - src/v11/defaults/metaReview/metaReviewApi.ts
  - src/v11/shared/metaReview/metaReviewDependencyDefaults.ts
  - src/v11/shared/metaReview/metaReviewTypes.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunContract.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunPorts.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunErrors.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunExecution.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunRuntime.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunApprovalRefresh.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunApprovalRollback.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunParity.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunReviewerSnapshot.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunner.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunnerConfig.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunnerParsing.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunnerPrompt.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunnerReport.ts
  - src/v11/infrastructure/channel/tmux/metaReviewLiveRunnerPane.ts
  - src/v11/infrastructure/executor/command/metaReviewLiveRunnerCommand.ts
  - src/v11/infrastructure/executor/sessionRuntime/metaReviewLiveRunnerRuntime.ts
  - tests/core/bubble/metaReview.test.ts
prd_ref: null
plan_ref: plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Live-Run Removal (Phase E)

Target file interpretation:
1. A `target_files` lista a primer ownership seam-eket rogziti.
2. A task explicit elvarasa, hogy a primer file-okhoz kotott helper, fallback, test es export ballast is torlodjon ugyanebben a szeletben; a `target_files` lista nem mentesit a secondary file cleanup alol.

## Current Codebase Check (2026-04-17)

1. A `src/v11/shared/metaReview/liveRun/**` subtree mar nincs jelen a current tree-ben, es a korabbi live-run-owned infra seam-ek (`metaReviewLiveRunnerRuntime`, `metaReviewLiveRunnerCommand`, `metaReviewLiveRunnerPane`) sem leteznek kulon subsystemkent.
2. A surviving meta-review authority modell a current tree-ben a gate + `meta_review.execution_context` + canonical `meta_review_result` submit lanchoz kotott; kulon `runMetaReview(...)` produkcios runtime nem maradt aktiv boundary.
3. A `src/v11/shared/metaReview/**` es `src/v11/defaults/metaReview/**` jelenlegi felulete mar a canonical submit/runtime parity lane-re szukult, nem tart fenn prompt/parser/env-mode/child-process/tmux-scrollback alapu central live-run control pathot.
4. Emiatt ez a task mar nem elo removal target, hanem historical bounded removal spec: a current tree-ben a live-run subsystem closure tenyszeruen lezart allapotban van.
5. A parent plan current-state olvasata szerint a kulon internal meta-review live-run runtime stack mar nem aktiv current-tree blocker; ez a task ezt a historical closuret dokumentalja, nem uj implementacios lane-t nyit.

## L0 - Policy

### Goal

Torolje ki teljesen a meta-review live-run subsystemet a kodbazisbol ugy, hogy:
1. ne maradjon kulon `runMetaReview(...)` runtime, runner, parser, prompt, marker, env-mode vagy tmux-scrollback control path,
2. ne maradjon hozza tartozo helper, fallback, compatibility export vagy test ballast,
3. a surviving canonical meta-review behavior kizárólag a mar meglevo authority handoff + `pairflow agent emit --kind meta_review_result` submit modellen maradjon,
4. a vegso acceptance egyik kotelezo bizonyiteka `rg=0` legyen a `src` es `tests` alatt a live-runhoz kotott nevek/stringekre.

### Domain / Control Model Summary

1. Business invariant: a meta-review eredmeny egyetlen canonical authority chainen johet letre es irhat bubble allapotot; a rendszer nem tarthat fenn ezzel parhuzamos kulon self-run meta-review runtimet.
2. Control model: a meta-review authorityt a `RUNNING` allapotban aktiv `meta_review.execution_context` es a gate kickoff/transcript hatarozza meg; az eredmeny elfogadott visszairasi utja a canonical `meta_review_result` submit.
3. Read-path rule: a rendszer a meta-review folyamat allasat csak a gate/state/transcript/submit authorityn keresztul ertelmezheti; nincs kulon live-runner output-path vagy marker-parser control truth.
4. Forbidden fallback:
   - nincs `runMetaReview(...)` facade,
   - nincs `PAIRFLOW_META_REVIEW_*` env fallback,
   - nincs `codex exec`/pane parser fallback meta-review eredmeny eloallitasra,
   - nincs compatibility export vagy pass-through type alias a torolt live-run layerhez.
5. Missing-data rule: ha a meta-reviewer runtime delivery nem tortenik meg vagy nem jon submit, a meglevo gate/watchdog/human-path kezeli a helyzetet; a rendszer nem indulhat el central live-run fallbackkent.
6. Phase boundary:
   - contract closure: owned here
   - producer closure: N/A, removal task
   - internal execution closure: owned here
   - workflow/orchestration closure: only insofar as live-run entrypoints are detached; gate/submit authority baseline preserved
   - read_model_closure: N/A
   - activation_closure: N/A
   - cleanup_recovery_closure: only live-run-specific cleanup owned here; surviving authority-window recovery remains baseline

### Baseline Preservation

1. Must preserve behaviors:
   - meta-review authority staging a gate-ben,
   - canonical `meta_review_result` actor emit + submit,
   - watchdog/recovery megfigyelese a `meta_review.execution_context` authority-windowre,
   - `runtime_delivery` mint delivery observation metadata, ha a surviving gate still uses it.
2. Allowed resolution paths:
   - convergence -> meta-review gate -> authority handoff -> `meta_review_result` submit
   - restart/resume -> active meta-review authority -> submit folytatas
   - watchdog/human fallback, ha authority window kifut vagy delivery bizonytalan
3. Forbidden regression interpretations:
   - a live-run removal nem nyithat uj replacement adaptert,
   - a live-run removal nem hozhat vissza read/marker/parser kontrollbuszt mas neven,
   - a live-run removal nem torheti el a canonical `meta_review_result` pathot.
4. Replacement proof required if removed:
   - itt nincs uj replacement. A task csak azt bizonyitja, hogy a surviving authority-submit baseline mar most is eleg a live-run stack nelkul.

### In Scope

1. A `runMetaReview(...)` facade es a hozza tartozo exported type/helper surface teljes torlese.
2. A `src/v11/shared/metaReview/liveRun/**` subsystem teljes torlese.
3. A live-runner prompt/schema/parser/report/env-mode/marker logic teljes torlese.
4. A live-runner infra (`codex exec`, tmux pane output polling, child-process runner) teljes torlese.
5. A live-runhoz kotott tests, fixtures, parser assertions es marker-string coverage teljes torlese.
6. A live-run specifikus maradek type/export ballast torlese, ha a removalt kovetoen orphanne valik.

### Out of Scope

1. A surviving meta-review gate authority modell redesignja.
2. A `meta_review_result` submit contract redesignja.
3. A meta-reviewer pane-binding teljes eltavolitasa, ha az tovabbra is a gate delivery / authority handoff baseline resze.
4. README/skill/plan repo-surface wording cleanup.
5. Altalanos meta-review domain egyszerusites a live-runon tul.

### Safety Defaults

1. Nem atnevezes a cel, hanem torles.
2. Nem replacement layer a cel, hanem a live-run subsystem teljes kivezetese.
3. Nincs backward compatibility budget.
4. Ha egy export, helper vagy test csak a live-run miatt maradna bent, azt ugyanebben a taskban torolni kell.
5. A task addig nem zárható le, amig az explicit `rg` acceptance 0 találatot nem ad a `src` es `tests` alatt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - internal meta-review runtime/export contract
   - internal prompt/parser/runner contract
   - internal test contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - surviving canonical identity path: `meta_review.execution_context` + `meta_review_result`
   - torlendo competing path: central live-run runner output
10. Authority/source-of-truth note:
   - canonical source: gate authority + structured submit
   - forbidden secondary source: live-runner prompt/marker/output path

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Nincs parhuzamos central live-run meta-review authority. | A `runMetaReview(...)` es minden alatta levo runner layer torlodjon. | P1 | required-now |
| Control model | A meta-review authority marad a gate + execution_context + submit chainen. | A task nem epitheti uj replacement pathra a removalt runtimeot. | P1 | required-now |
| Read-path rule | Marker/parser/prompt output nem lehet control truth. | Minden `PAIRFLOW_META_REVIEW_*` marker/env es parser layer torlodjon. | P1 | required-now |
| Forbidden fallback | Nincs shim, alias, pass-through export vagy compatibility helper. | A dangling export/type/test ballastot is ugyanebben a taskban ki kell venni. | P1 | required-now |
| Missing-data rule | Delivery failuret a surviving gate/watchdog kezeli. | Nincs central fallback live-run. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| internal live-run facade (`runMetaReview`, types, parsing exports) | defaults facade, tests | breaking internal removal | remove entirely | N/A |
| canonical meta-review submit path | actor protocol, submit runtime, gate authority, resume messaging | preserved baseline | keep untouched except import fallout cleanup | N/A |
| meta-review gate/runtime delivery observation | gate, watchdog, status/list inspection | preserved baseline | preserve unless a field/helper is provably live-run-only | deferred only if separate cleanup is needed |

### 0b) Sequencing / Closure Order

| Step | Why this order is mandatory | Owned here | Must stay deferred |
|---|---|---|---|
| 1. Facade and direct exports removal | Eloszor a publicly reachable internal facade tunjon el. | `metaReviewApi.ts`, live-run type/parser exports | gate authority redesign |
| 2. Live-run shared subsystem removal | Ez viszi ki a runner-specific core logicat. | `src/v11/shared/metaReview/liveRun/**` | surviving submit path |
| 3. Runner infrastructure removal | Ez szedi ki a prompt/parser/process/tmux polling infrastrukturat. | infra runner files | generic meta-review pane delivery |
| 4. Test and ballast cleanup | A torles utan nem maradhat dead test or export. | `tests/core/bubble/metaReview.test.ts` es minden kapcsolodo fallout | repo-surface docs cleanup |
| 5. `rg=0` proof | Ez zarja le, hogy nincs rejtett maradek. | explicit grep acceptance | docs/plan references |

Normative sequencing rules:

1. Nem eleg a facade-ot kivenni; a runner stack es a kapcsolodo tests is ugyanebben a taskban torlendo.
2. Nem maradhat olyan type/export, amely csak azert el, mert korabban a live-run hasznalta.
3. Nem szabad a live-run removal utan uj `metaReviewRuntime` vagy hasonlo adapterrel visszacsempeszni ugyanazt a capabilityt.
4. Az explicit `rg=0` proof szukseges, de nem elegseges; a named owned file/folder seam-eknek torlesi diffben is el kell tunniuk.

### 0c) Traceability Lock

| Source | Binding requirement for this task | Why it matters |
|---|---|---|
| `plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` Decision Baseline | A meta-review nem special-case subsystem, hanem role projection ugyanazon canonical actor modellben. | Ez tiltja a kulon central live-run subsystem fenntartasat. |
| `plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` Phase E lane-guard note | Ez a task csak internal live-run removal lane lehet; nem nyithatja ujra a public cached read-model, a persisted authority + cleanup/recovery, vagy a repo-surface cleanup tracket. | Megakadalyozza a Phase E closurek visszakevereset. |
| `src/v11/shared/metaReview/metaReviewExecutionContext.ts` | A surviving authority modell a `meta_review_result` awaited outputon marad. | Ez a removal baseline-je. |
| `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | A canonical submit ut nem serulhet. | Ez a must-preserve path. |
| `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts` | A resume flow mar most is submit-alapu. | Bizonyitja, hogy nincs uj replacementre szukseg. |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/defaults/metaReview/metaReviewApi.ts` | `runMetaReview` + live-run export surface | `runMetaReview(input: MetaReviewRunInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewResult>` | A facade teljesen megszunik; a live-runhoz kotott type/parser exportok torlodnek. | P1 | required-now | T1, T5 |
| CS2 | `src/v11/shared/metaReview/liveRun/**` | complete shared live-run subsystem | module exports -> removed | A teljes folder torlodik, nincs retained alias vagy stub. | P1 | required-now | T1, T5 |
| CS3 | `src/v11/infrastructure/executor/sessionRuntime/metaReviewLiveRunnerRuntime.ts`, `src/v11/infrastructure/executor/command/metaReviewLiveRunnerCommand.ts`, `src/v11/infrastructure/channel/tmux/metaReviewLiveRunnerPane.ts` | runner infrastructure | runtime helpers -> removed | `codex exec`, prompt schema, pane capture polling, marker parsing infrastrukturaja torlodik. | P1 | required-now | T1, T5 |
| CS4 | `src/v11/shared/metaReview/metaReviewDependencyDefaults.ts`, `src/v11/shared/metaReview/metaReviewTypes.ts` | residual defaults/type ballast | exports/types -> cleaned | `metaReviewLiveRunDefaults`, live-run-only types/aliases ne maradjanak bent. | P1 | required-now | T2, T5 |
| CS5 | `tests/core/bubble/metaReview.test.ts` | mixed live-run + submit coverage | tests -> tests | A live-run specifikus coverage torlodik; a canonical submit/gate authority coverage retained marad. | P1 | required-now | T3, T4, T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| live-run API | internal `runMetaReview(...)` + live-run types | removed | none | none | breaking internal removal | P1 | required-now |
| live-run parser/schema/report helpers | dedicated exported helpers | removed | none | none | breaking internal removal | P1 | required-now |
| canonical submit API | `meta_review_result` actor emit -> submit | unchanged baseline | existing required submit fields | existing optional refs/rework fields | preserved | P1 | required-now |
| runtime delivery observation | gate delivery metadata | unchanged unless provably live-run-only | existing fields if retained | existing optional diagnostics | preserved baseline | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| live-run subsystem | full deletion | rename, shim, wrapper, alias | total removal task | P1 | required-now |
| surviving gate/submit path | import fallout cleanup only | semantic redesign | preserve baseline | P1 | required-now |
| tests | delete or rewrite live-run-specific tests | keeping dead parser/marker coverage "just in case" | no ballast budget | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| any caller still expects `runMetaReview` | TypeScript/build | throw | update caller or remove dead caller in same task | N/A | error | P1 | required-now |
| any test still imports live-run parser/helper | TypeScript/test | throw | delete or rewrite test in same task | N/A | error | P1 | required-now |
| delivery/runtime failure after removal | surviving gate/watchdog | preserved baseline | no central live-run fallback | existing gate/watchdog codes | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | canonical `meta_review_result` actor emit baseline | P1 | required-now |
| must-use | existing gate/execution_context authority model | P1 | required-now |
| must-not-use | any new live-run replacement layer | P1 | required-now |
| must-not-use | any compatibility export, alias, shim, or hidden fallback | P1 | required-now |
| must-not-use | test-only retained parser/marker helpers | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | live-run production files are gone | current tree still contains live-run folder and infra files | implementation completes | live-run files/import surfaces are removed from `src` | P1 | required-now | build + diff |
| T2 | live-run-only defaults/types are gone | current tree still exports live-run defaults/types | typecheck runs | no dangling live-run defaults/type ballast remains | P1 | required-now | typecheck |
| T3 | canonical submit path still works | surviving meta-review authority + submit flow exists | targeted meta-review tests run | submit/gate authority behavior remains green without live-run tests | P1 | required-now | automated test |
| T4 | live-run-specific test coverage is removed | `tests/core/bubble/metaReview.test.ts` still contains run/parser marker tests | tests are updated | only surviving authority/submit behavior remains covered | P1 | required-now | automated test |
| T5 | explicit `rg=0` proof | live-run names/string tokens still exist before implementation | run explicit grep after cleanup | command returns zero hits under `src` and `tests` | P1 | required-now | exact command output |

Normative `rg` acceptance command:

```bash
rg -n "runMetaReview\\b|MetaReviewRunInput\\b|MetaReviewDependencies\\b|MetaReviewLiveRunnerInput\\b|MetaReviewLiveRunnerOutput\\b|extractMetaReviewDelimitedBlock\\b|parseMetaReviewRunnerOutput\\b|runCodexAgentLiveReview\\b|runCodexPaneLiveReview\\b|resolveMetaReviewRunnerMode\\b|metaReviewLiveRun|metaReviewLiveRunner|PAIRFLOW_META_REVIEW_" src tests
```

Pass condition:
1. Exit code `1` / zero matches.
2. Nincs kivetel vagy allowlist.
3. Nincs "temporary" renamed symbol, amely nyilvanvalo live-run ballastot hordoz tovabb.
4. A `T1-T3` szerinti production diffben a named live-run file/folder seam-ek tenylegesen torlodnek, es a `T4` szerinti test diff kivezeti a live-run-specifikus coverage-et; az `rg=0` eredmeny nem legitimal retained stubot vagy compatibility tombstone-t.

## L2 - Implementation Notes (Optional)

1. [implementation note] Ha a live-run torles utan a `MetaReviewDepth` type vagy kapcsolodo shared alias teljesen orphanne valik, azt ugyanebben a taskban torolni kell.
2. [implementation note] Ha a `tests/core/bubble/metaReview.test.ts` tul nagy marad a mixed coverage miatt, a surviving canonical submit/gate coverage atmozgathato kisebb testfile-okba, de a live-run specifikus coverage nem maradhat retention okbol.

## Assumptions

1. A surviving meta-review gate authority + submit path mar most is eleg a live-run subsystem nelkul.
2. A `runMetaReview(...)` ma nem a canonical production orchestration kritikus hivaslancon ul, hanem belso/export/test ballast.

## Open Questions

1. Ha a live-run removal utan a `runtime_delivery` vagy `metaReviewerPane` mezokrol kiderul, hogy tovabbi egyszerusites is vedheto, az kulon follow-up task legyen; ez a task csak a live-run subsystem teljes torleset owns-olja.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | surviving meta-review gate/runtime delivery simplification a live-run removal utan | L2 | P2 | later-hardening | codebase follow-up | kulon task, ha a live-run removal utan tovabbi dead code bizonyithato |

## Review Control

1. Minden findingnek explicit bizonyitania kell, hogy runtime/control-path ballast maradt bent, nem eleg naming-level preferenciat mondani.
2. Max 2 L1 hardening round.
