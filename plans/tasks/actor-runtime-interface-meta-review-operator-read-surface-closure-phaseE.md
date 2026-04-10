---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_operator_read_surface_closure_phaseE_v1
title: "Actor Runtime Interface Meta-Review Operator Read Surface Closure (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/v11/application/metaReview/metaReviewFacadeParity.test.ts
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Operator Read Surface Closure (Phase E)

## Current Codebase Check (2026-04-10)

1. A retained operator read surface ma tenylegesen `src/v11/application/metaReview/**` alatt el, de a `target_files` listaban meg stale `src/core/**` es egy mar nem letezo parity test path is szerepel.
2. A task tartalmi iranya tovabbra is relevans lehet, de a file-level scope nem pontos.
3. Emiatt a task statusza visszakerul `draft` allapotba, amig a mai canonical file listat ra nem vezetjuk.

## Executive Summary

1. Ez a task a `plans/archive/tasks/actor-runtime-interface-meta-review-operator-projection-cleanup-phaseE.md` parent task megmaradt, meg nem zart read-surface szeletet kuloniti el bounded implementation taskkent.
2. A `recover` snapshot-route replay closure mar lezart upstream scope; ebben a taskban a retained `status` es `last-report` projection-only semantics, a renderer freshness/parity boundary, valamint a retained `run` non-regression guard explicit lezárasa a cel.
3. A task csak akkor sikeres, ha a read surface se kodban, se CLI szovegben nem sugall canonical actor authorityt vagy current-round acceptance-t stale/historical projectionbol.
4. `README.md` es `docs/pairflow-initial-design.md` csak akkor touched, ha bizonyithato user-visible operator semantics delta tortenik; ellenkezo esetben explicit `T9` docs-omission closure kell a primary artifact + completion artifact paron.

## Tracking Snapshot (2026-04-05)

### Commit Basis

1. Ez a child task a Phase E retained operator cleanup lane kovetkezo bounded implementation lepeset irja le a kovetkezo commitokra tamaszkodva:
   - `12f61ce` `Merge branch 'bubble/ari-meta-review-op-cleanup'`
   - `413e532` `Merge branch 'bubble/imp-meta-review-ops-phasee'`
   - `19c4ab6` `docs(task): add phase E operator cleanup tracking snapshot`
   - `ef1d965` `pairflow: commit task file for bubble start`
2. `12f61ce` azt bizonyitja, hogy a retained operator cleanup initial `status`/`last-report` projection hardening es a recovery lane elso closure-lepese mar landed.
3. `413e532` a recovery lane canonical `execution_context` authority-szukiteset es a recovery closure task-szintu done allapotat erositi meg; emiatt a jelen tasknak nem szabad a `recover` semanticsot ujranyitnia.
4. `19c4ab6` explicit tracking snapshotot adott a parent taskhoz; ez a child task ennek a snapshotnak a maradek-szeleteit konkret implementation contractta bontja.
5. `ef1d965` a bubble start elotti task-bootstrap evidence: bizonyitja, hogy a jelen file mar dedikalt read-surface closure artifactkent lett kiveve a parent scope-bol.

### Task Slice Status

| Slice | Contract Rows / Tests | Status | Evidence | Tracking Note |
|---|---|---|---|---|
| 1. `status` + `last-report` projection-only closure | `CS1(status|last-report)` + `CS2` + `T1-T2` | partial | `12f61ce` | A read-path hardening mar elkezdodott, de a task-level closurehez meg kell erositeni a projection-only retrieval fail-closed hatarat. |
| 2. Renderer freshness/parity boundary stabilization | `CS3` + `T3` | pending | indirect only via `12f61ce` | A wording boundary meg nincs kulon traceability/evidence lock ala teve, kulon szeletkent kell zarni a read-path closure utan. |
| 3. Retained `run` non-regression + namespace boundary | `CS4` + `CS5` + `T4-T5` | pending | none beyond indirect prior coverage | Explicit coverage kell arra, hogy a `run|status|last-report|recover` subtree nem mosodik ossze es a removed `submit` path zart marad. |
| 4. Docs decision gate | `CS6` + `CS7` + `T8/T9` | pending | `19c4ab6`, `ef1d965` | A child tasknak mar most deklaralnia kell, hogyan zarul a docs diff vs docs-omission dontes es ezt a Pairflow done-package / equivalent completion artifact hogyan viszi at handoffba. |

### Remaining Closure Target

1. A kovetkezo bounded implementation lepes ennek a tasknak a maradekaban:
   - `status` / `last-report` projection-only semantics explicit task-level lezárása,
   - current-round freshness/parity es renderer/provenance boundary tisztitasa,
   - retained `run` non-regression guard + retained namespace boundary explicit evidence-e,
   - vegul `T8` vagy `T9` docs decision closure a completion-summary contracttal egyutt.
2. Ez a task nem uj Phase E lane es nem teljes meta-review operator redesign; kizarolag a parent maradek-scope-jat viszi implementation-ready allapotba.

## L0 - Policy

### Goal

A retained `bubble meta-review status|last-report` operator read surface es a kapcsolodo renderer boundary explicit closure-ja ugy, hogy:
1. a `status` es `last-report` path egyertelmuen projection-only, read-only marad,
2. a current-round freshness/parity diagnostics explicit marad,
3. a retained `run` subcommand nem csuszik at sem retrieval-, sem recovery-semantikaba,
4. a surface sehol nem sugall operator-origin submit authorityt vagy stale snapshotbol current-round acceptance-t.

Ez a task akkor sikeres, ha:
1. a `status` es `last-report` path nem ir state-et, nem triggerel run-t, es nem frissit canonical snapshotot,
2. a renderer/provenance szoveg explicitten projection/freshness/parity nyelvet hasznal,
3. a retained `run|status|last-report|recover` namespace boundaryje regressziotesztekkel vedett marad,
4. a docs decision gate `T8` vagy `T9` egyertelmuen zarul,
5. a `T9` ownership explicit marad a primary artifact completion-summary contractja es a Pairflow done-package / equivalent completion artifact kozott.

### Context

1. A canonical meta-review submit authority Phase E-ben mar kulonall a `pairflow agent emit --kind meta_review_result` pathon.
2. A `recover` retained operator path mar explicit snapshot-route replay retained surface, es a canonical top-level `execution_context` authorityra lett szukitve.
3. A megmaradt bizonytalansag a read-path es renderer feluleten van: a projection-only semantics mar reszben kodba kerult, de a task-level closure a freshness/parity es a retained `run` boundary explicit auditjaval egyutt meg nyitott.
4. A parent task 2026-04-05 tracking snapshotja mar kimondta, hogy a kovetkezo kotelezo implementation szelet a read surface explicit closure-ja; ez a child task ezt teszi review-stabilla.

### In Scope

1. `status` projection-only semantics explicit lezárasa.
2. `last-report` projection-only semantics explicit lezárasa.
3. Current-round freshness/parity CLI renderer boundary tisztitasa.
4. Retained `run` non-regression guard a namespace szintjen.
5. A hozzatartozo `T1-T5` automated evidence szerzodes felbontasa.
6. `T8` vagy `T9` docs decision closure, beleertve a completion-summary/completion-artifact contractot.

### Out of Scope

1. `recover` tovabbi semantics rewrite vagy recovery lane ujranyitasa.
2. Uj actor primitive vagy uj submit path.
3. `bubble meta-review run` redesign vagy orchestration-atiras.
4. Operator namespace harmonization a `meta-review` subtree-n tul.
5. Implementer / reviewer / meta-reviewer actor cutover munka.
6. Shared done-package / completion-artifact protocol-template bovites, standardizalas vagy cross-bubble rollout.

### Safety Defaults

1. A `status` es `last-report` path hidden write, hidden rerun es hidden authority-refresh nelkul marad.
2. A renderer stale vagy hianyos projection esetben sem sugallhat acceptance-t vagy canonical actor authorityt.
3. A `run` retained trigger surface csak non-regression szomszedsagi boundary; a task nem irhatja at a `run` semanticsat.
4. Ha nincs user-visible semantics delta, docs diff nem keszulhet pusztan belso hardening vagy traceability-javitas miatt.
5. A Pairflow done-package / equivalent completion artifact nem valthatja ki a primary artifactot; csak a `T9` closure masodlagos hordozja lehet a primary artifact altal deklaralt contract szerint.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - operator CLI retrieval contract,
   - projection freshness/parity diagnostics contract,
   - retained operator-vs-actor namespace boundary,
   - docs decision closure contract,
   - completion-summary/completion-artifact ownership contract.

### Normative Reference Policy

1. Canonical plan:
   - `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
2. Parent cleanup contract:
   - `plans/archive/tasks/actor-runtime-interface-meta-review-operator-projection-cleanup-phaseE.md`
3. Binding migration/context refs:
   - `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
4. Historical boundary refs:
   - `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md`
   - `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md`
5. Informational grounding:
   - `docs/meta-review-gate-prd.md`
6. Tracking evidence refs:
   - `12f61ce`
   - `413e532`
   - `19c4ab6`
   - `ef1d965`

## L1 - Change Contract

### Timing Vocabulary

1. `required-now` = ebben a taskban kotelezo.
2. `conditional-now` = csak bizonyitott user-visible semantics delta eseten kotelezo.
3. `later-hardening` = kulon follow-up, itt nem nyithato ujra.

### Target File Alignment

1. Required-now implementation/test surface:
   - `src/core/bubble/metaReview.ts`
   - `src/v11/application/metaReview/metaReviewCliDispatcher.ts`
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
| CS1 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | `dispatchMetaReviewCommand` + `runMetaReviewStatusProjectionCommand` + `runMetaReviewLastReportProjectionCommand` | `dispatchMetaReviewCommand(input: { options: BubbleMetaReviewExecutableCommandOptions; cwd: string }) -> Promise<BubbleMetaReviewCommandResult>`; projection subcommands: `{ options: Extract<..., { command: "status" | "last-report" }>; cwd: string } -> Promise<BubbleMetaReviewCommandResult>` | A dispatcher explicitten projection-only subcommandkent tartsa a `status` es `last-report` pathot; semmilyen hidden run/recover/submit route ne legyen elerheto ezen az agon. | P1 | required-now | T1, T2 |
| CS2 | `src/core/bubble/metaReview.ts` | `getMetaReviewStatus`, `getMetaReviewLastReport` | `getMetaReviewStatus(input: MetaReviewReadInput, dependencies?: MetaReviewDependencies /* optional dependency bag */) -> Promise<MetaReviewStatusView>`; `getMetaReviewLastReport(input: MetaReviewReadInput, dependencies?: MetaReviewDependencies /* optional dependency bag */) -> Promise<MetaReviewLastReportView>` | A read surface current-round freshness/parity projectionje explicit es fail-closed maradjon; stale vagy missing artifact nem valhat acceptance-allitassa. | P1 | required-now | T1, T2, T3 |
| CS3 | `src/v11/application/metaReview/metaReviewCliRenderers.ts`, `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts` | `renderMetaReviewStatusText`, `renderMetaReviewLastReportText`, helper formatting | `renderMetaReviewStatusText(view: MetaReviewStatusView, verbose: boolean) -> string`; `renderMetaReviewLastReportText(view: MetaReviewLastReportView, verbose: boolean) -> string` | A text explicitten projection/freshness/parity/provenance nyelvet hasznaljon; reviewer-heurisztikakent stale vagy historical snapshotnal csak `current-round projection`, `cached last autonomous report`, `projection freshness: stale`, `stale snapshot` jellegu wording elfogadhato, mig a `approved`, `current truth`, `meta-reviewer says` jellegu allitas nem jelenhet meg. | P1 | required-now | T3 |
| CS4 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` + test surface | retained `run` namespace neighbor | existing `run` dispatch branch | A `run` retained trigger semantics explicit non-regression guard alatt maradjon; a task nem terjeszkedhet run redesignba, de bizonyitania kell, hogy a namespace boundary stabil. | P1 | required-now | T4, T5 |
| CS5 | `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/contracts/v11/metaReviewGate.contract.test.ts`, `tests/v11/application/metaReview/metaReviewFacadeParity.test.ts` | regression surface | `vitest` coverage | Kotelezo evidence kell a read-only retrievalre, freshness/parity textre, es a retained `run|status|last-report|recover` namespace boundaryre. | P1 | required-now | T1-T5 |
| CS6 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing semantics | docs-only | Csak valos user-visible semantics delta eseten frissitendo. | P2 | conditional-now | T8 |
| CS7 | primary artifact + Pairflow done-package / equivalent completion artifact | docs-omission / completion summary contract | task artifact contract + completion artifact assertions -> review evidence | Ha nincs bizonyitott user-visible semantics delta, akkor a docs diff elhagyasanak oka, a scope-containment, es a conditional docs budgeten belul maradas explicitten a primary artifact altal deklaralt completion-summary contract szerint rogzitendo; a Pairflow done-package / equivalent completion artifact ennek default review-evidence hordozoja. | P2 | conditional-now | T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Status read input | bubble id + optional repo/cwd | valtozatlan input, explicit projection-only semantics | `bubbleId` | `repoPath`, `cwd` | non-breaking | P1 | required-now |
| Status view output | cached/current-round snapshot projection | explicit freshness/parity projection without authority implication | `has_run`, `projection_freshness`, `bubbleId` | parity diagnostics, verbose fields | non-breaking tightening | P1 | required-now |
| Last-report read output | report/state projection | explicit projection-only report view without acceptance implication | `has_report`, `projection_freshness`, `bubbleId` | parity diagnostics, report payload details | non-breaking tightening | P1 | required-now |
| Renderer wording | projection-only language mar reszben letezik | review-stabil wording every branchen | freshness/provenance lines | verbose details | non-breaking tightening | P1 | required-now |
| Operator namespace boundary | `run|status|last-report|recover` retained subtree | explicit split preserved | subcommand name | verbose/json flags | must remain split | P1 | required-now |

Normative rules:

1. A `status` es `last-report` command nem indithat uj review-t es nem mutalhat state-et.
2. A stale/current-round distinction explicit kell maradjon a rendererben is, nem csak a data shape-ben.
3. A `has_run=true` vagy `has_report=true` nem jelenthet acceptance-allitast; csak projection availabilityt jelenthet.
4. A task nem nyithatja ujra a removed `bubble meta-review submit` pathot sem explicit, sem implicit formaban.
5. A `run` retained trigger semantics ebben a taskban csak non-regression evidence-t kap; nincs UX- vagy orchestration-semantics delta.
6. A `dependencies` parameter optionalitasa a CS2-ben interface-contract szintu allitas; a default dependency-resolution mechanika implementacios reszlet marad.

### 2.5) Traceability Lock

| Source | This task must realize | Why this is binding here | Evidence |
|---|---|---|---|
| `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` Phase B `Decision Baseline` + `Core Capability Invariants` | nincs special-case meta-review actor API, es nincs implicit actor-write authority | ez fogja vissza, hogy a cleanup ne csusszon vissza mixed actor/operator boundaryba | T4, T5 |
| `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` Phase D `S6_REVIEWER_META_AND_CLEANUP` | retained meta-review operator surface cleanupja a cutoverek utan | ez a task mar nem uj actor slice, hanem a Phase E cleanup backlog resze | T1, T4, T5 |
| `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` Phase D `Retained Adapter Ownership and Cleanup` meta-review row | a `status` diagnostics operator-owned maradjon, ne canonical authority | a cleanup celja e hatar tovabbi tisztitasa, nem a path ujranyitasa | T1, T3, T5 |
| `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md` Phase 4 operator-vs-actor split | a `bubble meta-review` surface operator namespace maradjon, a `submit` removed maradjon | ez akadalyozza meg az actor-facing special-case path visszatereset | T4, T5 |
| `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md` Phase 5 state-neutral operator surface | a retained operator surface ne koveteljen legacy actor-write authorityt | ettol marad a subtree projection reteg, nem kulon canonical control bus | T1, T2, T5 |
| `docs/meta-review-gate-prd.md` Meta-review gate read contract | `status`/`last-report` cheap non-generative retrieval | ez a task ugyanennek a mar rogzitett kontraktnak a migration utani cleanup-megerositese | T1, T2, T3 |
| `plans/archive/tasks/actor-runtime-interface-meta-review-operator-projection-cleanup-phaseE.md` + `19c4ab6` parent tracking snapshot | a maradek scope read-surface closure-ra szukuljon | ez ved a recovery lane vagy teljes operator redesign visszanyitasatol | T4, T5, T9 |
| `ef1d965` bubble kickoff task extraction evidence | a child task explicit completion contracttal zarjon | ez keri szamon, hogy a primary artifact ne csak problemaleiras, hanem handoff-kompatibilis closure contract is legyen | T9 |

Normative rules:

1. Ha tobb cleanup-ut is vedheto, azt a valtozatot kell valasztani, amelyik a `status|last-report` surface-et kozelebb viszi az explicit projection boundaryhoz uj namespace, uj command family vagy uj core primitive nelkul.
2. A task review-stabil csak akkor, ha a completion summary explicitten vissza tud mutatni arra, hogy a retained operator subtree tovabbra sem lett actor authority vagy canonical submit path.
3. A `run` traceability minimuma explicitten le kell fedje: retained trigger marad, de nem olvad bele a retrieval surface-be.
4. Ha docs-omission ut aktiv, a completion-summary ownership nem maradhat implicit: a primary artifactnak explicitten deklaralnia kell, mit kell a Pairflow done-package / equivalent completion artifactnak allitania a scope-containmentrol.
5. A bubble-szintu implementer handoff default completion artefaktja a Pairflow done-package / equivalent completion artifact; ettol fuggetlen PASS summary csak konzisztens masodlagos kiserotext lehet.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| `status` / `last-report` read path | state/artifact olvasas, projection diagnostics | write side effect, live rerun, authority refresh | pure-by-default read path | P1 | required-now |
| Renderer text | wording clarification, provenance visibility | acceptance-t vagy authorityt sugallo szoveg stale projection mellett | review-stability slice | P1 | required-now |
| `run` branch | regression test guard | live-review trigger semantics atdefinialasa | neighbor-surface only | P1 | required-now |
| Docs | semantics delta dokumentalasa, ha valoban van | docs drift semantics delta nelkul | `T8/T9` gate | P2 | conditional-now |
| Completion artifact | scope-containment es docs-decision allitasok rogzitese | primary artifact ownership felulirasa vagy scope-expanzio | `T9` masodlagos hordozja | P2 | conditional-now |

Pure-by-default rule:

1. Ha a cleanuphoz helper-atiras kell, annak is meg kell tartania a read-path purityt; a convenience refactor nem igazol write side effectet.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing snapshot a `status`/`last-report` pathon | state/artifact | deterministic projection result | `no_snapshot` / `has_report=no` jelzes, nincs rerun | existing freshness diagnostics family or equivalent | info | P1 | required-now |
| stale round-local snapshot | parity artifact + round data | deterministic stale projection result | stale freshness + cleared live implication | existing freshness diagnostics family or equivalent | info/warn | P1 | required-now |
| invalid/missing report artifact | report file | deterministic degraded projection | projection-only degraded view, nincs hidden rerun | existing artifact diagnostics family or equivalent | warn | P1 | required-now |
| unexpected namespace regression | dispatcher/test surface | test failure | nincs silent command remap | test-level regression evidence | error | P1 | required-now |
| docs-omission without explicit summary contract | primary artifact + completion artifact | review fail | explicit `T9` closure kovetelt | task contract review evidence | error | P2 | conditional-now |

Normative rules:

1. Read-path fallback soha nem lehet hidden rerun.
2. Degraded projection sem allithat acceptance-t vagy authorityt.
3. A `run` branch regressziojat tesztnek kell megfognia; nem eleg narrativ allitas.
4. A docs-omission fallback soha nem lehet implicit "nem nyultunk docs-hoz" megjegyzes explicit scope-containment allitas nelkul.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | parent task tracking snapshot a mar lezart `recover` szelethez | P1 | required-now |
| must-use | meglevo `getMetaReviewStatus` / `getMetaReviewLastReport` / CLI renderer boundaries | P1 | required-now |
| must-use | `12f61ce`, `413e532`, `19c4ab6`, `ef1d965` commit-evidence szerepkore | P1 | required-now |
| must-not-use | `recover` semantics ujranyitasa ugyanebben a taskban | P1 | required-now |
| must-not-use | hidden write vagy hidden rerun a read pathokban | P1 | required-now |
| must-not-use | `run` redesign vagy uj operator namespace | P1 | required-now |
| must-not-use | actor-facing submit path erintese | P1 | required-now |
| must-not-use | completion artifact canonical source-of-truth-kent valo beallitasa a primary artifact helyett | P2 | required-now |

### 5.5) Implementation Slice Lock

1. Elso kotelezo szelet: `CS1(status|last-report dispatch sub-slice)` + `CS2(read-API slice)` + `CS5(T1-T2 evidence slice)`
   - Elvart eredmeny: a retrieval pathok explicit projection-only contractja fail-closed es review-stabil maradjon a dispatcher/read-API retegen. A `T3` renderer/provenance closure szandekosan nem ennek a szeletnek a resze.
2. Masodik kotelezo szelet: `CS3(renderer/provenance slice)` + `CS5(T3 evidence slice)`
   - Elvart eredmeny: a text ugyanazt a freshness/parity/provenance boundaryt tanitja, amit a read APIs mar allitanak, authorityszeru kovetkeztetes nelkul; reviewer-szinten elfogadhato pelda a `current-round projection` vagy `stale snapshot`, mig nem elfogadhato az `approved` vagy `current truth` jellegu stale wording.
3. Harmadik kotelezo szelet: `CS4(run non-regression guard)` + `CS5(T4-T5 evidence slice)`
   - Elvart eredmeny: a retained `run` trigger semantics nem csuszik at retrieval/recovery szerepbe, es a subtree nem nyitja ujra a removed `submit` pathot.
4. Felteteles docs szelet: `CS6` + `CS7` + (`T8` xor `T9`)
   - Csak akkor nyithato meg, ha a fenti harom kotelezo szelet utan marad tenyleges user-visible semantics delta, vagy explicitten rogzitendo a docs-omission/scope-containment indoklas a primary artifact completion-summary contractja szerint.

### 5.6) Completion Summary Contract

1. Ha `CS6` nem triggerel docs diffet, a Pairflow done-package / equivalent completion artifactnak explicitten ki kell mondania, hogy `README.md` es `docs/pairflow-initial-design.md` miert maradt untouched, a scope a primary artifact + conditional docs budgeten belul maradt, es a docs-omission nem fed el user-visible semantics delta-t.
2. Ha `CS6` triggerel docs diffet, a completion artifactnak explicitten meg kell neveznie, mely user-visible retained operator semantics pontosodott, es mely conditional-now docs surface lett touched.
3. A primary artifact marad a source-of-truth; a completion artifact ennek masodlagos review-evidence hordozja, es kulon PASS summary vagy mas handoff-uzenet sem mondhat ennek ellent.

### 5.7) Docs Decision Gate

1. `T8` csak akkor aktiv, ha a diff bizonyithatoan user-visible retained operator semantics pontositast vagy valtozast hoz ebben a slice-ban; puszta belso kontraktusszigoritas, traceability-javitas vagy review-stability hardening ehhez nem eleg.
2. Ha ilyen user-visible semantics delta fennall, akkor a `README.md` vagy a `docs/pairflow-initial-design.md` megfelelo retained operator leirasa kotelezo docs closure surface lesz, es `T9` nem hasznalhato.
3. Ha `T8` nem aktiv, akkor `T9` kotelezo, es a Pairflow done-package / equivalent completion artifactnak explicitten allitania kell, hogy nincs bizonyitott user-visible operator semantics delta, a docs surface untouched maradt, es a scope a primary artifact + conditional docs budgeten belul maradt.
4. `T8` es `T9` kolcsonosen kizárják egymast, a `T9` route pedig nem nyithat kulon protocol-scope-ot vagy shared template-bovitest.

### 5.8) Evidence Mapping Lock

| Contract Row | Must Be Closed By | Minimum Review Claim |
|---|---|---|
| `CS1` | `T1`, `T2` | a dispatcher szetvalasztva tartja a projection-only read pathokat, hidden run/recover/submit atlepes nelkul |
| `CS2` | `T1`, `T2`, `T3` | a read surface read-only marad, es a freshness/parity projection nem csuszik authorityallitasba |
| `CS3` | `T3` | a renderer/provenance layer projection-only diagnosticsot tanit, nem canonical actor authorityt |
| `CS4` | `T4`, `T5` | a retained namespace megtartja a `run|status|last-report|recover` boundaryt es nem nyitja ujra a removed `submit` pathot |
| `CS5` | `T1`-`T5` | a retained operator subtree teljes regression csomagja le van fedve, beleertve a `run|status|last-report|recover` boundary-egyuttallast |
| `CS6` | `T8` | csak valos user-visible operator semantics delta kerul docs diffbe |
| `CS7` | `T9` | docs-omission es scope-containment explicit a primary artifact plusz Pairflow done-package / equivalent completion artifact parban; kulon PASS summary csak konzisztens masodlagos kiserotext lehet |

Normative rules:

1. P1 `required-now` contract row nem zarhato le kizarolag P2 docs evidence-szel.
2. Ha egy review finding `CS6` vagy `CS7` closure-jat tamadja, explicitten meg kell neveznie, hogy `T8` vagy `T9` miert hianyzik vagy miert aktiv helytelenul; altalanos "docs maybe needed" megjegyzes nem elegendo.
3. Ha a completion artifact mellett kulon PASS summary vagy mas handoff-uzenet is jelen van, annak docs-decision allitasa nem mondhat ellent a primary artifactnak vagy a completion artifactnak.

### 6) Test Matrix

Numbering note:

1. `T6-T7` szandekosan nincs ujrahasznalva ebben a child taskban, mert a parent taskban ezek a recover lane-hez kotott test-ID-k; a child task megtartja a `T8/T9` docs-decision jeloleseket a parent traceability folytonossaga miatt.

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | `status` projection-only marad | bubble rendelkezik vagy nem rendelkezik snapshot-tal | `pairflow bubble meta-review status --id <id>` fut | nincs hidden mutation, nincs hidden rerun, a projection-only shape stabil | P1 | required-now | automated test |
| T2 | `last-report` projection-only marad | report ref van, hianyzik vagy stale | `pairflow bubble meta-review last-report --id <id>` fut | deterministic projection jon, nincs authority/acceptance implication | P1 | required-now | automated test |
| T3 | freshness/parity renderer explicit marad | current-round vagy stale snapshot, parity metadata adott | status/last-report text renderelodik | a text explicit `current-round projection`, `projection freshness: stale`, `stale snapshot` vagy `cached report` nyelvet hasznal; nem allit `approved`, `current truth`, `meta-reviewer says` vagy equivalent canonical allapotot stale/historical projectionbol | P1 | required-now | automated test |
| T4 | retained `run` branch non-regression guard | `run|status|last-report|recover` namespace aktiv | parser/dispatch coverage fut | `run` retained trigger marad, a read pathok projection-only maradnak, nincs command drift | P1 | required-now | automated test |
| T5 | full retained namespace boundary stabil | operator subtree egyben vizsgalva | parity/facade/contract tests futnak | a namespace nem nyitja ujra a removed `submit` pathot es nem mossa ossze a read/recover/run szerepeket | P1 | required-now | automated test |
| T8 | docs csak valos semantics delta eseten touched | bizonyitott user-visible operator semantics delta van | docs diff keszul | csak cleanup-szintu retained operator semantics pontosodik, actor-submit redesign nelkul | P2 | conditional-now | doc diff |
| T9 | docs-omission closure explicit | nincs bizonyitott user-visible operator semantics delta | a task docs diff nelkul zarul | a primary artifact `Completion Summary Contract` szekcioja explicitten megkoveteli, hogy a Pairflow done-package / equivalent completion artifact kimondja a docs diff elhagyasanak okat, es a scope a primary artifact + conditional docs budgeten belul marad | P2 | conditional-now | task/doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a status es last-report renderer ugyanazt a provenance/freshness logikat tobb helyen duplikalja, kesobb kulon helper-harmonization task nyithato.
2. [later-hardening] Ha a retained operator namespace mas commandjai is hasonlo wording driftet mutatnak, kulon operator-text harmonization task nyithato.
3. [later-hardening] Ha a completion artifact `T9` closure szovege tobb bubble-ben ugyanazt a mintat koveti, kulon Pairflow protocol template-hardening task nyithato.

## Assumptions

1. A canonical actor submit path tovabbra is `pairflow agent emit --kind meta_review_result`.
2. A `bubble meta-review run` retained operator trigger surface ebben a taskban nem redesign-cel, csak boundary-kornyezet.
3. A `recover` lane a `413e532` utani allapotban mar nem resze ennek a child tasknak.

## Open Questions (Non-Blocking)

1. Nincs.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Shared freshness/parity projection helper | L2 | P2 | later-hardening | operator read-surface closure | csak akkor nyitando, ha a cleanup soran tenyleges duplikacio marad |
| H2 | Cross-command operator diagnostics harmonization | L2 | P3 | later-hardening | retained operator layer | kulon note vagy task, ha mas operator commandok is hasonlo projection-tisztitast igenyelnek |
| H3 | Completion artifact docs-omission template hardening | protocol | P3 | later-hardening | bubble handoff contract | kulon protocol task, ha tobb docs-only bubble ugyanazt a summary pattern-t igenyli |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. Uj `required-now` csak evidence-backed `P0/P1` eseten adhato a masodik kor utan.
4. A `recover` vagy actor-submit lane-re mutato findingokat csak akkor szabad ide visszahozni, ha a read-surface closure-t kozvetlenul blokkoljak.
5. `CS6`/`T8` es `CS7`/`T9` review closure kolcsonosen kizaro docs-decision par; a reviewer nem hagyhatja nyitva, nem allithatja teljesultnek, es nem kezelheti reszben aktivnak egyszerre mindkettot.
6. A Pairflow done-package / equivalent completion artifact nem mondhat ellent a primary artifact docs-decisionjenek vagy scope-hatarainak.

## Spec Lock

Task akkor `IMPLEMENTABLE`, ha:
1. a `status` es `last-report` path explicitten projection-only read surface marad,
2. a renderer freshness/parity/provenance semantics authorityallitas nelkul marad,
3. a retained `run|status|last-report|recover` namespace boundary regresszioorzes alatt marad,
4. a `T1-T5` automated evidence teljesul,
5. a docs decision gate `T8` vagy `T9` explicitten zarul,
6. docs-omission eseten a `CS7` altal owned `T9` scope-containment gate is teljesul a primary artifact completion-summary contractja szerint.
