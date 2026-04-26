---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_operator_projection_cleanup_phaseE_v1
title: "Actor Runtime Interface Meta-Review Operator Projection Cleanup (Phase E, Superseded Parent)"
status: superseded
phase: phaseE
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/v11/application/metaReview/metaReviewFacadeParity.test.ts
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Operator Projection Cleanup (Phase E)

## Direction Change Note (2026-04-05)

1. Ez a task historical parent artifactkent marad meg, de a 2026-04-05-i iranyvaltas utan nem ez a javasolt aktiv implementation target.
2. A retained `bubble meta-review` namespace egyben kezelt cleanupja a gyakorlatban nem bizonyult eleg boundednek.
3. A jelenlegi szetvalasztott kovetkezo lepesek:
   - [actor-runtime-interface-meta-review-run-removal-phaseE.md](/Users/felho/dev/pairflow/plans/archive/tasks/actor-runtime-interface-meta-review-run-removal-phaseE.md): kulon bounded task a public `meta-review run` kivezetesere
   - [actor-runtime-interface-meta-review-recovery-reconcile-refactor-draft.md](/Users/felho/dev/pairflow/plans/tasks/actor-runtime-interface-meta-review-recovery-reconcile-refactor-draft.md): draft a `recover` recovery/reconcile iranyanak ujrakeretezesehez
4. A `status` es `last-report` retained olvaso/operator surface most tudatosan befagyasztva marad; erre addig nem nyilik uj implementation slice, amig a `run` removal es a `recover` refaktor le nem zarul.
5. A ket fenti lepes utan explicit decision checkpoint kell: kulon el kell donteni, maradt-e tenyleges additional work a `status` / `last-report` korul, vagy nincs tovabbi teendo.
6. Ez a file torles helyett azert marad meg, hogy megorizze a korabbi contract- es review-historyt, de a maradek munkat mar ne egyben tartott parent cleanup framing alatt kezeljuk.

## Executive Summary

1. Ez a Phase E task eredetileg egyben kezelte a retained `bubble meta-review run|status|last-report|recover` operator lane maradek cleanupjat.
2. A 2026-04-05-i direction change utan ez a framing superseded lett: a `run` kulon removal taskot kap, a `recover` kulon recovery/reconcile refaktor draftot kap, a `status` es `last-report` pedig most befagyasztott retained surface, amelyrol a ket lepes utan kulon dontes szuletik.
3. A historical contract lenyege tovabbra is fontos: a canonical actor submit authority kulon maradjon (`pairflow agent emit --kind meta_review_result`), es a retained operator surface ne nyisson ujra actor-facing special-case write pathot.
4. `README.md` es `docs/pairflow-initial-design.md` tovabbra is csak felteteles target marad, de ez a parent artifact mar nem hordoz aktiv implementation ownershipot.

## Tracking Snapshot (2026-04-05)

### Commit Basis

1. A status-tracking snapshot az elozo Phase E es kapcsolodo operator-projection munkak utolso relevans commitjaira epul, kulonosen:
   - `29f5acd` `bubble(ari-phasee-implementer-pilot): finalize`
   - `345d54f` `bubble(ari-phasee-reviewer-cutover): finalize`
   - `f01e0d6` `bubble(ari-meta-reviewer-cutover): finalize`
   - `12f61ce` `Merge branch 'bubble/ari-meta-review-op-cleanup'`
   - `413e532` `Merge branch 'bubble/imp-meta-review-ops-phasee'`
2. Ez a blokk task-scope trackingot ad; nem override-olja az alatti L0/L1/L2 contractot, csak explicitte teszi, hogy mely szeletek tekinthetok lezartnak, reszben lezartnak vagy nyitottnak.

### Upstream Phase E Preconditions

| Scope | Status | Evidence | Notes |
|---|---|---|---|
| `implementer` pilot cutover | done | `29f5acd` | Phase E actor-first pilot lezart; ez mar nem resze ennek a tasknak. |
| `reviewer` cutover | done | `345d54f` | Reviewer actor-runtime cutover lezart; ez a task mar a retained operator cleanup lane. |
| `meta-reviewer` cutover | done | `f01e0d6` | A canonical meta-review submit authority kulonallasa mar le van zarva; ez a task ennek retained operator cleanup folytatasa. |

### Task Slice Status

| Slice | Contract Rows / Tests | Status | Evidence | Tracking Note |
|---|---|---|---|---|
| 1. `status` + `last-report` projection-only closure | `CS1(status|last-report)` + `CS2` + `T1-T3` | partial | `12f61ce` | Initial operator cleanup mar landed a read/projection surface-en, de task-level closure meg mindig kell a current-round freshness/parity + renderer/provenance oldalon. |
| 2. `recover` snapshot-route replay closure | `CS1(recover)` + `CS3` + `T4-T6` | done | `12f61ce`, `413e532` | A recovery retained operator path explicit snapshot-route replay marad; a follow-up commit canonical top-level `execution_context` authorityra szukitette a recovery source-of-truth-t. |
| 3. `run` non-regression + renderer boundary stabilization | `CS1(run guard)` + `CS4` + `T7` | pending | none beyond indirect prior coverage | Ez marad a kovetkezo kotelezo implementation slice, egyutt a retained `run|status|last-report|recover` namespace boundary explicit regresszioorzesével. |
| 4. Docs decision gate | `CS6` + `CS7` + `T8/T9` | pending | none | Csak a fenti kotelezo szeletek utan zarhato le; ha nincs bizonyitott user-visible semantics delta, akkor `T9` docs-omission closure kell. |

### Remaining Closure Target

1. A kovetkezo bounded implementation lepes ennek a tasknak a maradekaban:
   - `status` / `last-report` projection-only semantics explicit task-level lezárása,
   - current-round freshness/parity es renderer/provenance boundary tisztitasa,
   - retained `run` non-regression guard + `T7` evidence,
   - vegul `T8` vagy `T9` docs decision closure.
2. Amig a fenti blokk nincs explicitten lezárva, addig ez a task nem tekintheto teljesen kesznek, akkor sem, ha a `recover` szelet mar lezart.

## L0 - Policy

### Goal

A Phase E kovetkezo bounded cleanup-szelete a retained `bubble meta-review` operator projection/recovery surface tisztitasa legyen ugy, hogy a `status|last-report|recover` subtree olvashatoan projection-only vagy snapshot-route-replay reteg maradjon, mikozben a canonical actor submit authority tovabbra is kizarolag a `pairflow agent emit --kind meta_review_result` current-execution pathon marad, es a cleanup ne novekedjen uj operator UX-, uj actor API- vagy uj lifecycle-szelette.

Ez a task akkor sikeres, ha:
1. a `status` es `last-report` path explicitten read-only, non-generative projection marad,
2. a `recover` path explicitten persisted snapshot + active execution context alapjan route-ol, es nem uj review-futas vagy operator-origin authority shortcut,
3. a CLI/rendering surface nem sugallja, hogy az operator commandok canonical actor authorityt vagy current-round acceptance forrast hordoznanak,
4. a retained operator subtree tovabbra sem nyitja ujra a removed `bubble meta-review submit` vagy barmely mas actor-facing special-case write pathot,
5. a scope nem dagad teljes meta-review UX-redesignna vagy uj lifecycle/API cleanup-csomagga.

### Context

1. A Phase D migration spine szerint a reviewer es meta-reviewer cutover utan a kovetkezo termeszetes lepes a retained adapterek cleanupja ott, ahol a cleanup trigger mar teljesult.
2. A Phase 4 es Phase 5 mar rogzitette, hogy a canonical actor-facing meta-review submit path a `pairflow agent emit --kind meta_review_result`, mig a `bubble meta-review` namespace retained operator surface marad.
3. A most lezart meta-reviewer cutover mar explicitte tette, hogy a canonical submit authority nem jonhet vissza a `bubble meta-review` subtree-bol.
4. Ettol fuggetlenul a `status|last-report|recover` operator surface tovabbra is kozel ul a canonical snapshot/state adatokhoz, ezert erdemes kulon bounded taskban tovabb tisztitani a projection-vs-authority hatart.
5. A korabbi meta-review gate taskok es PRD mar kulon is kimondtak, hogy a `status` es `last-report` cheap, non-generative retrieval, a `recover` pedig deterministic snapshot-route replay; ez a task ezt a boundaryt erositi meg az actor-runtime migration utan.

### In Scope

1. A retained `bubble meta-review status|last-report|recover` operator surface bounded cleanupja.
2. A `status` es `last-report` read-path explicit projection-only kontraktjanak megerositese.
3. A `recover` snapshot-route-replay kontrakt explicit megerositese live rerun vagy operator-authority shortcut nelkul.
4. A CLI text/rendering pontositasa csak ott, ahol a surface ma implicit authorityt vagy current-round "truth" erzest sugallhat.
5. A touched read/recovery pathok kotelezo regresszios tesztjei a `T1`-`T7` matrix szerint.
6. A docs-diff vagy docs-omission ut explicit doc-review gate-t kap: semantics delta eseten `T8`, semantics delta hianya eseten `T9`.

### Out of Scope

1. Uj actor primitive vagy uj output family bevezetese.
2. A `pairflow agent emit --kind meta_review_result` canonical actor path ujranyitasa vagy redesignja.
3. A `bubble meta-review run` command UX- vagy orchestration-redesignja.
4. Teljes meta-review gate vagy recovery subsystem rewrite.
5. Topology-csere vagy tmux/operator surface eltavolitasa.
6. Reviewer vagy implementer pathok opportunistic ujranyitasa.

### Safety Defaults

1. A `status` es `last-report` read-only marad; hidden write, hidden rerun vagy hidden authority-refresh nem megengedett.
2. A `recover` csak persisted snapshot + active meta-review execution context alapjan route-olhat; pane activity, `cwd`, prompt allapot vagy operatori invokacio nem lehet canonical authority-forras.
3. A retained operator subtree nem nyithatja ujra a removed `bubble meta-review submit` write pathot.
4. A stale vagy hianyos diagnostics surface lehet degraded, de ettol a canonical actor authority nem serulhet.
5. Ha a current-round snapshot hianyzik vagy stale, a surface deterministic pending/stale/projection diagnosticsot ad, nem implicit sikeres current-round allapotot.
6. A task cleanup-szelet, nem UX-scope expanzio: csak a projection/recovery boundary tisztithato.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - operator CLI retrieval/recovery contract,
   - cached snapshot projection contract,
   - snapshot-route replay / recovery contract,
   - canonical operator-vs-actor boundary contract,
   - meta-review diagnostics text/output stability contract.

### Normative Reference Policy

1. `plan_ref`: `plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Phase E cleanup iranyahoz a teljes migration programban.
2. Binding migration input:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogzitette, hogy a retained adapterek cleanupja a cutoverek utan kovetkezik, es hogy a meta-review operator surface observability/projection reteg marad.
3. Binding target contract:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - Ez az authoritative role-neutral boundary; az operator surface nem lephet be actor authority domainbe.
4. Binding scenario/parity input:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - Kotelezoen iranyado a duplicate/ack/observability kerdesekhez.
5. Binding current-state grounding:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez mutatja, hogy a `bubble meta-review` operator surface ma operator-only retained adapter, mig a canonical submit kulon actor-facing path.
6. Binding historical boundary:
   - `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md`
   - `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md`
   - Ezek rogzitettek, hogy a `bubble meta-review submit` removed marad, es az operator namespace csak `run|status|last-report|recover` surface lehet.
7. Informational grounding:
   - `docs/meta-review-gate-prd.md`
   - Ez a cheap retrieval es snapshot-route recovery user-facing szemantikajat rogzitette.
8. Precedence rule:
   - target boundaryhoz a Phase B authoritative,
   - cleanup sorrendhez es retained ownershiphoz a Phase D authoritative,
   - operator-vs-actor splithez a Phase 4/5 authoritative,
   - parity coverage-hez a Phase C authoritative,
   - a kodbeli jelen allapot csak grounding evidence.

### Terminology Lock

1. `operator projection surface` = a `bubble meta-review status|last-report|recover` retained operator namespace, amely canonical actor authority helyett projection/replay szerepet tart.
2. `projection-only read path` = olyan command-path, amely csak persisted state/artifact adatot olvas, es nem indit uj review-t, nem mutal lifecycle state-et.
3. `snapshot-route replay` = olyan recovery path, amely a persisted canonical meta-review snapshot alapjan route-ol, nem uj live review futassal.
4. `canonical actor submit path` = a `pairflow agent emit --kind meta_review_result` current-execution authorityhoz kotott path.
5. `operator-vs-actor boundary` = az a szerzodes, amely elvalasztja a human/operator command surface-t a canonical actor emission authoritytol.
6. `current-round freshness` = annak explicit megkulonboztetese, hogy a megjelenitett snapshot a jelenlegi roundhoz kotott-e, vagy csak cached historical projection.

### Deliverable Shape Lock

1. A kotelezo deliverable a retained `status|last-report|recover` surface explicit projection/replay boundary melletti kodszintu megerositese, nem uj operator command family vagy uj actor-facing surface.
2. A kotelezo bizonyitas az automated contract/regression evidence a `T1`-`T7` matrix szerint; a task nem zarhato le puszta szovegfinomitassal vagy narrativ "operator-only" allitassal.
3. `README.md` es `docs/pairflow-initial-design.md` csak akkor kotelezoen touched, ha a user-visible operator szemantika tenylegesen pontosodik, es ezt a diff kozvetlenul a retained operator projection/recovery szerephez koti.
4. Nem kotelezo minden `target_files` elemet modositani; a lista implementation surface-budget, nem line-by-line mandatory touch lista.
5. Ha a cleanup user-visible semantics valtozas nelkul valosul meg, a docs diff elhagyhato, de ezt az alabb deklaralt completion-summary contract szerint explicitten ki kell mondani, es a `T9` scope-containment/doc-omission gate-nek teljesulnie kell.

### Review-Stability Gates

1. A task reviewje fail, ha barmely diff azt sugallja, hogy `status` vagy `last-report` write side effectet, hidden rerunt vagy authority-refresh-t vegez.
2. A task reviewje fail, ha a `recover` barmely runtime jelbol (`cwd`, pane activity, prompt state, operator invokacio) canonical authorityt synthesize-al.
3. A task reviewje fail, ha a renderer vagy CLI text cached/stale projectionbol current-round acceptance-t vagy actor authorityt sugall.
4. A task reviewje fail, ha a cleanup uj namespace-et, uj core primitive-et vagy uj actor-facing submit/recovery shortcutot vezet be.
5. A task reviewje fail, ha docs diff keszul anelkul, hogy a retained operator surface user-visible szemantikaja tenylegesen pontosodna, vagy ha bizonyitott user-visible semantics delta marad dokumentalatlan.
6. A task reviewje fail, ha a `run` retained trigger surface a cleanup kozben hallgatolagosan atdefinialodik, ahelyett hogy explicit non-regression guard alatt maradna.
7. A task reviewje fail, ha a docs-omission ut nem ad explicit summary-szintu scope-containment bizonyitekot, vagy extra file-csalad csuszik be a megengedett surface-en kivul.

## L1 - Change Contract

### Timing Vocabulary

1. `required-now` = ugyanebben a cleanup-szeletben kotelezoen leszallitando contract delta.
2. `conditional-now` = csak akkor kotelezo most, ha a diff tenylegesen user-visible semantics pontositast igenyel.
3. `later-hardening` = szandekosan kulon utokovetes; ebben a taskban nem nyithato ujra.

### Target File Alignment

1. Required-now implementation/test surface:
   - `src/v11/application/metaReview/metaReviewCliDispatcher.ts`
   - `src/core/bubble/metaReview.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts`
   - `src/v11/application/metaReview/metaReviewCliRenderers.ts`
   - `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts`
   - `tests/cli/bubbleMetaReviewCommand.test.ts`
   - `tests/core/bubble/metaReview.test.ts`
   - `tests/contracts/v11/metaReviewGate.contract.test.ts`
   - `tests/v11/application/metaReview/metaReviewFacadeParity.test.ts`
2. Conditional-now docs surface:
   - `README.md`
   - `docs/pairflow-initial-design.md`
3. Declared completion-summary surface:
   - a primary artifact completion-summary contractja ebben a task file-ban
   - a Pairflow done-package / equivalent completion artifact, amely ezt a contractot teljesiti
   - Ez nem szamit uj product/docs file-csaladnak; a summary evidence primary-source ownershipja ebben a taskban marad.
4. A task nem igenyel uj file-csaladot a fenti surface-eken kivul. Ha mas path erintese latszik szuksegesnek, azt elobb scope-breakkent kell kezelni, nem csendes kiterjeszteskent.

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | `dispatchMetaReviewCommand` + `runMetaReviewStatusProjectionCommand` + `runMetaReviewLastReportProjectionCommand` + `runMetaReviewRecoverSnapshotReplayCommand` | `dispatchMetaReviewCommand(input: { options: BubbleMetaReviewExecutableCommandOptions; cwd: string }) -> Promise<BubbleMetaReviewCommandResult>`; projection subcommands: `{ options: Extract<..., { command: "status" | "last-report" | "recover" }>; cwd: string } -> Promise<BubbleMetaReviewCommandResult>` | A `status|last-report|recover` dispatch explicit operator surface maradjon: `status`/`last-report` csak read APIs-t hivhat, `recover` csak snapshot-route replay-t; egyik sem route-olhat canonical actor submit pathra vagy live rerunra. A szomszedos `run` retained live-review trigger surface nem redesign-cel, csak explicit non-regression guard alatt all ebben a taskban. | P1 | required-now | T1, T2, T4, T7 |
| CS2 | `src/core/bubble/metaReview.ts` | `getMetaReviewStatus`, `getMetaReviewLastReport` | `getMetaReviewStatus(input: MetaReviewReadInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewStatusView>`; `getMetaReviewLastReport(input: MetaReviewReadInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewLastReportView>` | A read path current-round/cached projection szerzodese explicit maradjon; hidden write, hidden rerun, hidden authority-refresh nem megengedett | P1 | required-now | T1, T2, T3 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | `recoverMetaReviewGateFromSnapshot` | `recoverMetaReviewGateFromSnapshot(input: RecoverMetaReviewGateFromSnapshotInput, dependencies?: RecoverMetaReviewGateFromSnapshotDependencies) -> Promise<MetaReviewGateResult>` | A recovery path persisted snapshot + active execution context alapjan route-oljon; pane/operator helyzet nem lehet substitute authority, es nem indulhat uj review-run | P1 | required-now | T4, T5, T6 |
| CS4 | `src/v11/application/metaReview/metaReviewCliRenderers.ts`, `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts` | `renderMetaReviewStatusText`, `renderMetaReviewLastReportText`, `renderMetaReviewRecoverText` | `renderMetaReviewStatusText(view: MetaReviewStatusView, verbose: boolean) -> string`; `renderMetaReviewLastReportText(view: MetaReviewLastReportView, verbose: boolean) -> string`; `renderMetaReviewRecoverText(result: MetaReviewGateResult) -> string` | A rendering projection/provenance szintet mutasson, ne canonical actor authorityt; stale/hianyos snapshot esetet deterministicen jelolje; a text ne tanitson acceptance- vagy co-canonical semantics-et | P2 | required-now | T3, T7 |
| CS5 | `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/contracts/v11/metaReviewGate.contract.test.ts`, `tests/v11/application/metaReview/metaReviewFacadeParity.test.ts` | retained operator regression surface | `vitest` coverage on command dispatch + projection read paths + recovery replay invariants | Kotelezo coverage kell a read-only retrievalre, snapshot-route replayre, stale/current-round projectionre, es az operator-only boundary regresszioorzesere | P1 | required-now | T1-T7 |
| CS6 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing semantics | conditional docs delta only; no new runtime/API signature introduced in this slice | Csak akkor frissitendo, ha a retained operator surface user-visible semanticsa pontosodik; a task nem dokumentalhat uj actor-facing submit utat vagy uj operator UX-ot | P2 | conditional-now | T8 |
| CS7 | `plans/archive/tasks/actor-runtime-interface-meta-review-operator-projection-cleanup-phaseE.md` + Pairflow done-package / completion artifact | docs-omission / completion summary contract | task artifact contract + completion artifact assertions -> review evidence | Ha nincs bizonyitott user-visible semantics delta, akkor a docs diff elhagyasanak oka, a scope-containment, es a conditional docs budgeten belul maradas explicitten a primary artifact altal deklaralt completion-summary contract szerint rogzitendo; a Pairflow done-package / completion artifact ennek default review-evidence hordozoja, de ezzel ekvivalens completion artifact is elfogadhato. | P2 | conditional-now | T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Status read input | `bubbleId` + optional `repoPath`/`cwd` read path | ugyanaz a command-input marad, de a semantics explicit projection-only | `bubbleId` | `repoPath`, `cwd`, `verbose` | non-breaking clarification | P1 | required-now |
| Status view output | cached/current-round adatok + parity diagnostics ma is latszanak, de a projection-vs-authority hatar implicit lehet | a view explicit projection marad; current-round freshness, parity es stale diagnostics lathato, de semmilyen acceptance vagy actor authority nem kovetkeztetheto belole | `has_run`, `bubbleId`, current snapshot-derived status mezok | verbose diagnostics, parity details | non-breaking tightening | P1 | required-now |
| Last-report read input/output | cached report read ma is kulon surface | a command tovabbra is olvasott artifact/state projection; nincs live rerun vagy hidden write | `bubbleId`, `has_report`/report pointer | verbose diagnostics, parity details | non-breaking tightening | P1 | required-now |
| Recover input/output | persisted snapshot + state alapjan route replay | a recover tovabbra sem uj review-futas, hanem snapshot-route replay; output route/state summary marad operator projection | `bubbleId`, eligible lifecycle/execution context | `repoPath`, `cwd`, debug diagnostics | non-breaking tightening | P1 | required-now |
| Operator-vs-actor CLI boundary | Phase 4/5 ota elvalasztott, de retained subtree meg kozel ul a canonical adatokhoz | a `bubble meta-review` namespace csak `run|status|last-report|recover` operator surface marad; a canonical actor submit path nem nyilik ujra es nem is implikalodik a renderer/dispatcher segitsegevel | operator subcommand name, bubble id | verbose/json output flags | must remain split | P1 | required-now |

Normative rules:

1. A `status` es `last-report` command nem indithat uj review-t, nem irhat state-et, es nem frissitheti a canonical snapshotot.
2. A `recover` command nem synthesize-alhat authorityt pane activitybol, `cwd`-bol, prompt allapotbol vagy operator invokaciobol; csak persisted snapshot + active execution context alapjan route-olhat.
3. A task nem nyithatja ujra a removed `bubble meta-review submit` pathot, sem explicit commandkent, sem implicit recovery/compat shortcutkent.
4. A `status`/`last-report` output nem allithat vagy sugallhat current-round canonical acceptance-t olyan esetben, amikor csak stale vagy historical cached adat all rendelkezésre.
5. Az operator surface lehet reszletes projection/debug reteg, de nem vezethet be uj acceptance-, authority- vagy state-transition szemantikat a canonical kernel boundary mellett.
6. A `run` retained operator trigger surface a cleanup soran legfeljebb regresszio-orzott szomszedsagi boundary lehet; a task nem irhatja at a live-review trigger szemantikajat.

### 2.5) Traceability Lock

| Source | This task must realize | Why this is binding here | Evidence |
|---|---|---|---|
| Phase B `Decision Baseline` + `Core Capability Invariants` | nincs special-case meta-review actor API, es nincs implicit actor-write authority | ez fogja vissza, hogy a cleanup ne csusszon vissza mixed actor/operator boundaryba | T4, T6, T7 |
| Phase D `S6_REVIEWER_META_AND_CLEANUP` | retained meta-review operator surface cleanupja a cutoverek utan | ez a task mar nem uj actor slice, hanem a Phase E cleanup backlog resze | T1, T4, T7 |
| Phase D `Retained Adapter Ownership and Cleanup` meta-review row | a `status / recover diagnostics` operator-owned maradjon, ne canonical authority | a cleanup celja e hatar tovabbi tisztitasa, nem a path ujranyitasa | T1, T4, T6 |
| Phase 4 operator-vs-actor split | a `bubble meta-review` surface operator namespace maradjon, a `submit` removed maradjon | ez akadalyozza meg az actor-facing special-case path visszatereset | T7 |
| Phase 5 state-neutral operator surface | a retained operator surface ne koveteljen legacy actor-write authorityt | ettol marad a subtree projection/recovery reteg, nem kulon canonical control bus | T1, T2, T4 |
| Meta-review gate PRD read/recover contract | `status`/`last-report` cheap non-generative retrieval, `recover` deterministic snapshot-route replay | ez a task ugyanennek a mar rogzitett kontraktnak a migration utani cleanup-megerositese | T1, T2, T4, T5 |
| Phase A `ACT-ENTRY-METAREVIEW-OPS`, `ACT-BEH-METAREVIEW-SUBMIT` | operator path es canonical actor submit kulon ownershipa maradjon | a grounding inventory mutatja, hogy a retained operator es a canonical actor path mar ma is kulon sor | T7 |

Normative rules:

1. Ha tobb cleanup-ut is vedheto, azt a valtozatot kell valasztani, amelyik a `status|last-report|recover` surface-et kozelebb viszi az explicit projection/replay boundaryhoz uj namespace, uj command family vagy uj core primitive nelkul.
2. A task review-stabil csak akkor, ha a completion summary explicitten vissza tud mutatni arra, hogy a retained operator subtree tovabbra sem lett actor authority vagy canonical submit path.
3. A `recover` traceability minimuma explicitten le kell fedje: nincs live rerun, nincs pane-derived authority, es a route persisted snapshotbol reprodukalhato.
4. Ha docs-omission ut aktiv, a completion-summary ownership nem maradhat implicit: a primary artifactnak explicitten deklaralnia kell, mit kell a Pairflow done-package / completion artifactnak allitania a scope-containmentrol.
5. A bubble-szintu implementer handoff default completion artefaktja a Pairflow done-package / completion artifact; ezzel ekvivalens completion artifact is elfogadhato, ha ugyanilyen auditálhatóan hordozza a docs-decision es scope-containment allitasokat.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| `status` read path | state/artifact olvasas, diagnostics projection | state write, live review trigger, authority refresh | read-only contract | P1 | required-now |
| `last-report` read path | persisted report/state olvasas, parity diagnostics | hidden write, hidden rerun, actor submit trigger | read-only contract | P1 | required-now |
| `recover` route replay | deterministic route replay persisted snapshot + eligible execution context alapjan | uj live review-futas, canonical actor submit helyettesitese, pane/prompt-derived authority | mutation csak explicit snapshot-route replay formaban engedett | P1 | required-now |
| Text/rendering | projection/provenance diagnostics pontositasa | olyan szoveg, amely canonical actor authorityt vagy acceptance-t sugall, ahol csak cached projection van | output-shape stabilization | P2 | required-now |
| Docs | operator-facing semantics pontositasa, ha kell | teljes meta-review UX-redesign vagy actor-facing CLI redesign dokumentalasa | csak cleanup-szintu delta | P2 | conditional-now |

Pure-by-default rule:

1. A `status` es `last-report` implementacio tisztan olvaso jellegu; ha a cleanup soran barmelyik pathnak write side effectje maradna, azt explicit blockernek kell tekinteni.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| current-round snapshot nincs vagy stale a `status`/`last-report` olvasaskor | persisted state/artifact | result | deterministic pending/stale projection diagnostics; nincs rerun | existing freshness/parity diagnostics family vagy equivalent | info/warn | P1 | required-now |
| report artifact hianyzik, olvashatatlan vagy schema-invalid | persisted artifact | result | command nem crash-el; deterministic missing/invalid diagnosticsot ad | existing artifact/parity diagnostics family | warn | P1 | required-now |
| `recover` olyan allapotban fut, ahol nincs recoverable active meta-review context | lifecycle state + execution context | throw | fail-closed; nincs operator-origin fallback submit vagy route | existing `META_REVIEW_GATE_TRANSITION_INVALID` family | error | P1 | required-now |
| `recover` before-deadline fut, de kickoff envelope nem talalhato es nincs canonical submit | transcript + execution context | throw | explicit transition invalid; nincs uj run | existing `META_REVIEW_GATE_TRANSITION_INVALID` family | error | P1 | required-now |
| operator surface stale vagy hianyos diagnostics mellett fut | retained operator subtree | result | projection lehet hianyos, de canonical actor authority ettol nem serul | existing diagnostics warning family | info/warn | P2 | required-now |

Normative rules:

1. A read-path fallback soha nem lehet hidden rerun.
2. A recovery fallback soha nem lehet hidden canonical actor submit.
3. A reason code literal naming implementacios reszlet maradhat, de szemantikailag read-only projection failure vagy recovery-transition-invalid osztalyba kell essen.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md` cleanup sorrendje es retained ownershipa | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB-draft.md` explicit actor authority es role-neutral boundary szerzodese | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md` operator-vs-actor splitje | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md` removed submit + state-neutral operator surface kontraktja | P1 | required-now |
| must-use | `docs/meta-review-gate-prd.md` cached retrieval + snapshot-route recovery szerzodese | P2 | required-now |
| must-use | meglovo `getMetaReviewStatus`, `getMetaReviewLastReport`, `recoverMetaReviewGateFromSnapshot` service boundaries | P1 | required-now |
| must-not-use | removed `bubble meta-review submit` path ujranyitasa | P1 | required-now |
| must-not-use | hidden write vagy hidden rerun a `status`/`last-report` pathokban | P1 | required-now |
| must-not-use | pane activity, `cwd`, prompt allapot vagy operator invokacio authority-forrassa emelese | P1 | required-now |
| must-not-use | uj operator namespace, uj actor-facing submit shortcut, vagy uj lifecycle/API cleanup-szelet becsempeszese ugyanebbe a taskba | P1 | required-now |
| must-not-use | reviewer/implementer/meta-reviewer actor emit pathok opportunistic ujranyitasa ebben a taskban | P2 | required-now |

### 5.5) Implementation Slice Lock

1. Elso kotelezo szelet: `CS1(status|last-report dispatch sub-slice)` + `CS2` + `CS5(T1-T3 evidence slice)`
   - Elvart eredmeny: a retrieval pathok explicit projection-only contractja fail-closed es review-stabil.
2. Masodik kotelezo szelet: `CS1(recover dispatch sub-slice)` + `CS3` + `CS5(T4-T6 evidence slice)`
   - Elvart eredmeny: a `recover` kizarolag persisted snapshot + active execution context alapjan route-ol, live rerun es operator-origin authority nelkul.
3. Harmadik kotelezo szelet: `CS1(run non-regression guard)` + `CS4` + `CS5(T7 evidence slice)`
   - Elvart eredmeny: a renderer plusz regression-evidence surface ugyanazt az operator-only boundaryt tanitja es bizonyitja, mikozben a `run` retained trigger semantics nem csuszik at retrieval/recovery szerepbe.
4. Felteteles docs szelet: `CS6` + `CS7` + `T8` + `T9`
   - Csak akkor nyithato meg, ha a fenti harom kotelezo szelet utan marad tenyleges user-visible semantics delta, vagy explicitten rogzitendo a docs-omission/scope-containment indoklas a primary artifact completion-summary contractja szerint.

### 5.6) Completion Summary Contract

1. Ha `CS6` nem triggerel docs diffet, a Pairflow done-package / completion artifactnak explicitten tartalmaznia kell:
   - hogy `README.md` es `docs/pairflow-initial-design.md` miert maradt untouched,
   - hogy a scope a primary artifact + conditional docs budgeten belul maradt,
   - hogy a docs-omission nem jelent user-visible semantics delta elhagyast.
2. Ha `CS6` triggerel docs diffet, a Pairflow done-package / completion artifactnak explicitten azt kell mondania, mely user-visible operator semantics pontosodott, es mely conditional-now docs surface lett touched.
3. Ez a contract a primary artifact review-surface-e; a bubble artifactok vagy egyeb protocol-owned file-ok csak masodlagos handoff segedletek lehetnek, nem canonical source-of-truth a `T9` ownershiphoz.
4. A Pairflow done-package / completion artifact ebben a bubble-ben a default `T9` closure surface; ettol kulon allo PASS summary vagy mas handoff-uzenet csak konzisztens masodlagos kiserotext lehet, es nem mondhat ellent a completion artifactnak vagy a primary artifact docs-decisionjainak.

### 5.7) Docs Decision Gate

1. `T8` akkor aktiv, ha a diff bizonyithatoan user-visible retained operator semantics pontositast vagy valtozast hoz ebben a slice-ban, fuggetlenul attol, hogy ez code/renderer/recovery vagy dokumentacios feluleten jelentkezik eloszor.
2. Ha az 1. pont szerinti user-visible semantics delta fennall, akkor a `README.md` vagy a `docs/pairflow-initial-design.md` megfelelo retained operator leirasa kotelezo docs closure surface lesz; ilyen esetben `T9` nem hasznalhato.
3. Puszta belso kontraktusszigoritas, traceability-javitas vagy review-stability hardening onmagaban nem eleg `T8` triggerhez, ha a user-visible retained operator semantics valtozatlan marad.
4. Ha `T8` nem aktiv, akkor `T9` kotelezo, es a Pairflow done-package / completion artifactnak explicitten allitania kell:
   - hogy nincs bizonyitott user-visible operator semantics delta,
   - hogy a `README.md` es a `docs/pairflow-initial-design.md` erintetlen maradt,
   - hogy a scope a primary artifact + conditional docs budgeten belul maradt.
5. `T8` es `T9` ugyanabban a zaro allapotban kolcsonosen kizarjak egymast; a review nem fogadhat el olyan handoffot, amely mindkettot implicitten, reszben vagy egyszerre teljesultkent allitja.

### 5.8) Evidence Mapping Lock

| Contract Row | Must Be Closed By | Minimum Review Claim |
|---|---|---|
| `CS1` | `T1`, `T2`, `T4`, `T7` | a dispatcher szetvalasztva tartja a projection-only read pathokat, a snapshot-route replayt, es a retained `run` non-regression boundaryt |
| `CS2` | `T1`, `T2`, `T3` | a read surface read-only marad, es a freshness/parity projection nem csuszik authorityallitasba |
| `CS3` | `T4`, `T5`, `T6` | a `recover` csak persisted snapshot + active execution context alapjan route-ol, live rerun es authority-synthesis nelkul |
| `CS4` | `T3`, `T7` | a renderer/provenance layer projection-only diagnosticsot tanit, nem canonical actor authorityt |
| `CS5` | `T1`-`T7` | a retained operator subtree teljes regression csomagja le van fedve, beleertve a `run|status|last-report|recover` boundary-egyuttallast |
| `CS6` | `T8` | csak valos user-visible operator semantics delta kerul docs diffbe |
| `CS7` | `T9` | docs-omission es scope-containment explicit a primary artifact plusz Pairflow done-package / equivalent completion artifact parban; kulon PASS summary csak konzisztens masodlagos kiserotext lehet |

Normative rules:

1. P1 `required-now` contract row nem zarhato le kizárólag P2 docs evidence-szel.
2. Ha egy review finding `CS6` vagy `CS7` closure-jat tamadja, explicitten meg kell neveznie, hogy `T8` vagy `T9` miert hianyzik vagy miert aktiv helytelenul; altalanos "docs maybe needed" megjegyzes nem elegendo.
3. Ha a completion artifact mellett kulon PASS summary vagy mas handoff-uzenet is jelen van, annak docs-decision allitasa szo szerint nem kell azonos legyen, de szemantikailag nem mondhat ellent a completion artifactnak, es nem helyezheti at a `T9` closure ownershipot sajat magara.

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | `status` read-only marad | bubble rendelkezik vagy nem rendelkezik canonical meta-review snapshot-tal | `pairflow bubble meta-review status --id <id>` fut | nincs hidden mutation, nincs live rerun, a view projection-only | P1 | required-now | automated test |
| T2 | `last-report` read-only marad | report ref elerheto vagy hianyzik | `pairflow bubble meta-review last-report --id <id>` fut | nincs hidden mutation/rerun, deterministic report/missing diagnostics jon | P1 | required-now | automated test |
| T3 | current-round freshness es parity explicit | stale vagy current-round snapshot, illetve parity metadata adott | `status`/`last-report` text view renderelodik | a renderer explicitten projection/freshness/parity diagnosticsot mutat, nem acceptance-allitast | P1 | required-now | automated test |
| T4 | `recover` snapshot-route replay marad | canonical submit snapshot mar persisted, route replay szukseges | `pairflow bubble meta-review recover --id <id>` fut | deterministic route/state replay tortenik uj review-futas nelkul | P1 | required-now | automated test |
| T5 | `recover` before-deadline kickoff replay csak persisted contextbol dolgozik | active meta-review authority van, canonical submit meg nincs, kickoff transcript elerheto | `recover` fut | a route deterministicen persisted kickoff-envelope alapju running-state replayt ad; nincs live rerun es nincs authority synthesis | P1 | required-now | automated test |
| T6 | `recover` fail-closed ineligible contextnel | nincs recoverable state, vagy kickoff/snapshot ellentmondasos | `recover` fut | explicit error/transition invalid jon; nincs hidden fallback submit vagy rerun | P1 | required-now | automated test |
| T7 | retained operator subtree boundaryje stabil marad | retained `bubble meta-review` namespace aktiv | parser/dispatch coverage a `run|status|last-report|recover` subtree-t es a canonical actor submit boundaryt egyutt vizsgalja | a `run` retained live-review trigger marad, a `status|last-report` read-only projection marad, a `recover` snapshot-route replay marad, es a namespace nem nyitja ujra a removed `submit` pathot | P1 | required-now | automated test |
| T8 | docs csak cleanup-szintu semanticsot pontositanak | user-visible operator semantics tenylegesen valtozik vagy pontosodik | docs diff keszul | a dokumentacio csak a retained operator projection/recovery szerepet irja le, actor submit redesign vagy uj operator UX nelkul | P2 | conditional-now | doc diff |
| T9 | docs-omission es scope containment explicit marad | nincs bizonyitott user-visible operator semantics delta | a task docs diff nelkul zarul | a primary artifact `Completion Summary Contract` szekcioja explicitten megkoveteli, hogy a Pairflow done-package / equivalent completion artifact kimondja a docs diff elhagyasanak okat, es a scope a primary artifact + conditional docs budgeten belul marad | P2 | conditional-now | task contract review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a `status` es `last-report` projection path nagy reszben ugyanazt a freshness/parity helper-lancot hasznalja, kesobb kulon shared helper extraction task nyithato.
2. [later-hardening] Ha a `recover` text/provenance projection es a JSON/text output shape kozt felesleges drift marad, kulon renderer cleanup task nyithato.
3. [later-hardening] Ha a retained operator namespace mas commandjai is hasonlo projection-vs-authority tisztitast igenyelnek, kulon operator-surface harmonization note keszulhet.

## Assumptions

1. A canonical actor submit path tovabbra is `pairflow agent emit --kind meta_review_result`.
2. A `bubble meta-review run` retained operator trigger surface ebben a taskban nem redesign-cel, csak boundary-kornyezet.
3. A retained `status|last-report|recover` subtree jelenleg is operator surface, de a cleanup celja ennek tovabbi kodszintu egyertelmusitese.

## Open Questions (Non-Blocking)

1. Nincs.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Shared freshness/parity projection helper | L2 | P2 | later-hardening | operator projection cleanup | csak akkor nyitando, ha a cleanup soran tenyleges duplikacio marad |
| H2 | Recover text/json provenance alignment | L2 | P3 | later-hardening | operator projection cleanup | kulon renderer-hardening task, ha a semantic cleanup utan meg mindig drift latszik |
| H3 | Cross-command operator diagnostics harmonization | L2 | P3 | later-hardening | retained operator layer | kulon note vagy task, ha mas operator commandok is hasonlo projection-tisztitast igenyelnek |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Because `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with the L1 contract rows.
6. `CS6`/`T8` es `CS7`/`T9` review closure kolcsonosen kizaro docs-decision par; a reviewer nem hagyhatja nyitva, nem allithatja teljesultnek, es nem kezelheti reszben aktivnak egyszerre mindkettot.

## Spec Lock

Task akkor `IMPLEMENTABLE`, ha:
1. a `status` es `last-report` path explicitten read-only projection marad,
2. a `recover` path explicit snapshot-route replay marad live rerun vagy hidden authority shortcut nelkul,
3. a retained operator namespace nem nyitja ujra a removed `bubble meta-review submit` pathot,
4. a renderer/output surface projection/freshness diagnosticsot mutat authorityallitas helyett,
5. a `T1`-`T7` contract/regression evidence teljesul,
6. a docs delta csak conditionalis es cleanup-szintu user-visible semanticsra korlatozodik,
7. docs-omission eseten a `CS7` altal owned `T9` scope-containment gate is teljesul a primary artifact completion-summary contractja szerint.

## Appendix A - 2026-04-05 Bubble Retrospective and Re-slicing Note

### Purpose

1. Ez az appendix annak rogzitesere szolgál, hogy a jelen Phase E retained meta-review operator cleanup lane miert akadt el tobb egymas utani P1 regresszioban, es milyen iranyban erdemes a fennmarado munkat ujraszeletelni.
2. Az appendix nem override-olja az L0-L1-L2 contractot, hanem implementation retrospektivakent rogzit egy fontos tanulsagot: a jelen task gyakorlati blast radiusa nagyobbnek bizonyult, mint amit a bounded read-surface cleanup framing sugallt.

### Bubble-Level Evidence Snapshot

1. A `ari-meta-read-surface-phasee-imp` bubble-ben a bubble indulasa ota egyetlen nagy, uncommitted diff gyult ossze a bubble worktree-ben, koztes stabilizalt implementacios checkpoint nelkul.
2. A bubble diff nagysagrendje:
   - `22` modositott file
   - kb. `2031` insert, `262` delete
3. A jelen parent task deklaralt implementation surface-ehez kepest a bubble diff szignifikans scope-spillover-t mutatott:
   - a deklaralt `target_files` a meta-review dispatcher/read/render/test surface-re koncentralt,
   - a tenyleges diff viszont approval, inbox, list, status, pending approval synthesis es state-schema file-okat is erintett.
4. Ez eros jel arra, hogy a feladat nem egyszeruen "nehez", hanem rosszul szeletelt: a retained operator read-surface cleanup implementation kozben policy- es consumer-migration karaktert kapott.

### Root Cause Analysis

#### A) A task framing es a tenyleges kodhatas nem egyezik

1. A task deklaralt celja bounded retained operator cleanup:
   - `status`
   - `last-report`
   - renderer/provenance
   - retained `run` non-regression
2. A bubble implementacio kozben a read-surface projection logika belső domain-inputta valt a kovetkezo fogyasztoknal:
   - approval dontesi logika
   - bubble status summary
   - bubble inbox pending approval synthesis
   - bubble list meta-review summary
3. Ettol a ponttol a task mar nem puszta operator surface cleanup, hanem belso policy-consumer migration is lett, anelkul hogy ezt a task explicitten vallalta volna.

#### B) Hianyzik a kulon seam az operator projection es a belso domain projection kozott

1. A kodbazis jelenlegi retained meta-review read surface-e eredetileg manual operator CLI feluletkent lett kialakitva.
2. A bubble-ben megjelent regressziok tipikus mintaja az volt, hogy az operator-facing fail-closed projection policy atszivargott belso rendszerallapot- vagy approval-dontesi policyva.
3. Emiatt minden "read-surface hardening" valtozas valojaban tobb downstream viselkedest is ujradefiniált:
   - mit lathat a human/operator,
   - mit tekint ervenyes recommendation source-nak az approval,
   - mikor jelenjen meg pending approval,
   - mikor nullazodjon ki egy summary.

#### C) Nincs egyetlen egyertelmu compatibility contract a `report_ref` korul

1. A bubble egyik legfontosabb blocker regresszioja a safe non-canonical `artifacts/*` `report_ref` kezelesebol jott elo.
2. A bubble altal feltart regresszio azt mutatta, hogy ket kulon szerzodes egyszerre igaz a kodbazis kulonbozo retegeiben:
   - a schema es recover/hydration logika safe `artifacts/*` refeket tovabbra is kompatibilisnek kezelt,
   - az uj projection olvaso reteg viszont fail-closed modon csak a canonical `artifacts/meta-review-last.json` refet akarta ervenyesnek tekinteni.
3. Ez nem lokalis bug, hanem nem-eldontott retained-compatibility policy. Amig ez a policy nincs expliciten kivezetve vagy megorizve, addig a retained operator cleanup korok ujra es ujra policy/regression korbe futnak.

#### D) A `bubble meta-review` namespace valojaban heterogen retained surface

1. A retained subcommandok nem azonos termeszetuek:
   - `run` = manual operator trigger
   - `status` = cached projection read
   - `last-report` = cached artifact read
   - `recover` = operational route replay
2. Ezeket egyetlen bounded cleanup taskban egyszerre stabilizalni nagy valoszinuseggel ujabb scope-csuszashoz vezet, mert kulonbozo authority- es compatibility-kockazatokat hordoznak.

#### E) Koztes commitolt stabil checkpoint hianya

1. A bubble-ben nem alakult ki olyan implementacios ritmus, amelyben a retained read-surface vagy renderer boundary kulon, zart szeletkent landed volna.
2. Emiatt minden tovabbi hardening valtozas mar egyszerre mozgatta:
   - a pure read feluletet,
   - a manual operator UX-et,
   - a belso approval/status fogyasztokat,
   - a compatibility expectationt.

### Usage Audit - Erdemes-e egyaltalan megtartani a `bubble meta-review` retained commandokat?

#### Observed current usage in the codebase

1. A `bubble meta-review` parancscsalad tovabbra is teljes CLI exposure-kent jelen van:
   - `src/cli/index.ts`
   - `src/v11/application/metaReview/metaReviewCliCommand.ts`
   - `src/v11/application/metaReview/metaReviewCliDispatcher.ts`
2. Dokumentacio szinten is first-class feluletkent szerepel:
   - `README.md`
   - `docs/meta-review-gate-prd.md`
   - `docs/meta-review-gate-rollout-runbook.md`
   - `docs/meta-review-gate-e2e-validation.md`
3. Teszt coverage is jelentos mennyisegben van korulotte:
   - parser/CLI tests
   - core meta-review tests
   - parity/contract tests

#### What was not observed

1. Nem latszik olyan belso runtime/orchestration call path, amely a retained `bubble meta-review status|last-report|run|recover` parancsokat a normal bubble lifecycle reszekent automatikusan hivna.
2. A main kodban a read APIs (`getMetaReviewStatus`, `getMetaReviewLastReport`) elsodleges explicit hivoja a meta-review CLI dispatcher.
3. A retained parancsok jelenleg sokkal inkabb manual operator surface-kent latszanak, mint a napi canonical Pairflow flow szerves reszekent.

#### Practical interpretation

1. A retained meta-review operator surface letezik, dokumentalt, es tesztelt.
2. Ugyanakkor a kodbazis alapjan ez nem tunik first-class, mindennapi runtime dependency-nek.
3. Ha a rendszer valos hasznalata soran ezek a parancsok nincsenek tenylegesen operatori workflow-ban hasznalva, akkor a retained surface tovabbi hardeningje valoszinuleg gyengebb ROI-t ad, mint a kivezetese.

### Re-slicing Recommendation

#### Recommendation summary

1. A jelen parent taskot nem erdemes tovabb egyben, "minden retained meta-review operator boundaryt zarjunk le" framinggel vegigvinni.
2. Ket realis irany van:
   - `retain-and-refactor`
   - `deprecate-and-remove`
3. A bubble-level tanulsagok es a valos hasznalatrol adott operatori jelzes alapjan az elso preferalt irany a `deprecate-and-remove`.

### Option 1 - Retain and Refactor

#### When this option makes sense

1. Akkor vedheto, ha a `bubble meta-review` retained operator surface-nek tenyleges operatori erteke van, amelyet a csapat tudatosan meg akar tartani.

#### Required precondition

1. Elobb explicit separation seam kell a kovetkezo ket reteg koze:
   - operator CLI projection/recovery surface
   - belso domain-facing summary/policy projection

#### Suggested sub-slices

1. `Slice R1`: pure internal projection helper extraction
   - egyetlen feladat: snapshot/artifact -> internal projection shape
   - explicit compatibility policy a safe non-canonical refekrol
2. `Slice R2`: operator CLI adapter stabilization
   - csak help/parser/renderer/CLI read behavior
   - nincs approval/status/inbox/list consumer migration
3. `Slice R3`: internal consumer migration
   - approval/status/inbox/list kulon internal adaptert kap
   - explicit dontes, hogy operator CLI fail-closed semantics atveheto-e vagy sem
4. `Slice R4`: retained namespace decision
   - `run|status|last-report|recover` tovabbi eletciklusa
5. `Slice R5`: docs decision / deprecation wording

#### Why this is safer than the current task

1. Eloszor szetvalasztja a retained operator UX-et a belso policy-dependens retegtol.
2. Megelozi, hogy egy renderer/read hardening valtozas approval-regressionne valjon.

### Option 2 - Deprecate and Remove

#### Why this currently looks stronger

1. A bubble retrospektiva azt mutatja, hogy a retained meta-review operator surface tul nagy compatibility-terhet hordoz a valos napi runtime-ertekehez kepest.
2. A bubble-ben feltart regressziok nagy resze nem a canonical actor pathban volt, hanem a retained operator diagnostics/projection surface es a belso fogyasztok osszekeveresebol jott.
3. Ha a retained parancsok nem reszei a tenyleges operatori workflow-nak, akkor a kivezetes egyszerubb, tisztabb es olcsobb, mint a tovabbi hardening.

#### Recommended removal order

1. `D1_USAGE_AUDIT`
   - explicit repo-level note: a `bubble meta-review` retained parancsok jelenleg manual surface-ek, nem canonical runtime dependencies
2. `D2_REMOVE_READ_COMMANDS`
   - `status`
   - `last-report`
   - CLI exposure, help, README, runbook, tests
3. `D3_DECIDE_RUN_AND_RECOVER`
   - kulon dontes a `run` es `recover` retained sorsarol
   - ezek operationalisan mas termeszetuek, mint a read parancsok
4. `D4_REMOVE_RUN`
   - ha a canonical actor emit path mellett a retained manual trigger sem kell
5. `D5_REMOVE_RECOVER`
   - csak ha mar van elegendo mas recovery/operator ut, es a retained replay surface sem kell

#### Guardrails for a deprecate/remove path

1. A canonical actor path (`pairflow agent emit --kind meta_review_result`) nem serulhet.
2. A bubble status top-level summary, approval routing, es human approval visibility nem epulhet retained CLI subcommandokra.
3. Ha barmelyik belso consumer ma retained projection logikara epul, azt elobb expliciten internal seamre kell tenni, nem pedig a retained CLI surface-hez hagyni kotve.

### Explicit note for follow-up planning

1. A jelen appendix alapjan eros default ajanlas:
   - ne a jelen task tovabbi incremental hardeningje legyen a kovetkezo lepes,
   - hanem kulon planning / task-slicing dontes a retained meta-review operator surface jovojet illetoen.
2. Ha a product/operatori dontes a retained surface kivezetese fele megy, akkor ezt a parent taskot nem tovabbi implementation patch-ekkel, hanem explicit deprecation/removal utvonalra bontott follow-up taskokkal erdemes folytatni.
3. Ha a retained surface megis marad, akkor a jelen parent taskot kisebb, file- es contract-disjoint refactor szeletekre kell ujrairni; a mostani egyben tartott "projection cleanup" framing a bubble evidence alapjan nem eleg stabil.
