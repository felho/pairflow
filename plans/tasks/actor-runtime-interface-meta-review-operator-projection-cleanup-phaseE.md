---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_operator_projection_cleanup_phaseE_v1
title: "Actor Runtime Interface Meta-Review Operator Projection Cleanup (Phase E)"
status: implementable
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
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Operator Projection Cleanup (Phase E)

## Executive Summary

1. Ez a Phase E task nem uj meta-review alrendszert tervez, hanem a mar retained `bubble meta-review status|last-report|recover` operator surface bounded cleanupjat zarja le.
2. A kotelezo eredmeny az, hogy a retrieval pathok explicit projection-only olvaso surface-k maradjanak, a `recover` pedig explicit snapshot-route replay maradjon live rerun vagy operator-origin authority nelkul.
3. A task review-stabil csak akkor, ha a diff vegig megtartja a canonical actor submit authority kulonallasat: `pairflow agent emit --kind meta_review_result` marad az egyetlen canonical actor write path.
4. `README.md` es `docs/pairflow-initial-design.md` csak felteteles target: kizarolag akkor touched, ha a retained operator surface user-visible szemantikaja tenylegesen pontosodik.

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

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Phase E cleanup iranyahoz a teljes migration programban.
2. Binding migration input:
   - `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogzitette, hogy a retained adapterek cleanupja a cutoverek utan kovetkezik, es hogy a meta-review operator surface observability/projection reteg marad.
3. Binding target contract:
   - `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - Ez az authoritative role-neutral boundary; az operator surface nem lephet be actor authority domainbe.
4. Binding scenario/parity input:
   - `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - Kotelezoen iranyado a duplicate/ack/observability kerdesekhez.
5. Binding current-state grounding:
   - `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
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
   - a canonical PASS summary, amely ezt a contractot teljesiti
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
| CS7 | `plans/tasks/actor-runtime-interface-meta-review-operator-projection-cleanup-phaseE.md` + canonical PASS summary | docs-omission / completion summary contract | task artifact contract + PASS summary assertions -> review evidence | Ha nincs bizonyitott user-visible semantics delta, akkor a docs diff elhagyasanak oka, a scope-containment, es a conditional docs budgeten belul maradas explicitten a primary artifact altal deklaralt completion-summary contract szerint rogzitendo; a PASS summary ennek runtime bizonyiteka. | P2 | conditional-now | T9 |

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
4. Ha docs-omission ut aktiv, a completion-summary ownership nem maradhat implicit: a primary artifactnak explicitten deklaralnia kell, mit kell a canonical PASS summarynek allitania a scope-containmentrol.

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
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` cleanup sorrendje es retained ownershipa | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` explicit actor authority es role-neutral boundary szerzodese | P1 | required-now |
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

1. Ha `CS6` nem triggerel docs diffet, a canonical PASS summarynek explicitten tartalmaznia kell:
   - hogy `README.md` es `docs/pairflow-initial-design.md` miert maradt untouched,
   - hogy a scope a primary artifact + conditional docs budgeten belul maradt,
   - hogy a docs-omission nem jelent user-visible semantics delta elhagyast.
2. Ha `CS6` triggerel docs diffet, a canonical PASS summarynek explicitten azt kell mondania, mely user-visible operator semantics pontosodott, es mely conditional-now docs surface lett touched.
3. Ez a contract a primary artifact review-surface-e; a bubble artifactok vagy egyeb protocol-owned file-ok csak masodlagos handoff segedletek lehetnek, nem canonical source-of-truth a `T9` ownershiphoz.

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
| T9 | docs-omission es scope containment explicit marad | nincs bizonyitott user-visible operator semantics delta | a task docs diff nelkul zarul | a primary artifact `Completion Summary Contract` szekcioja explicitten megkoveteli, hogy a canonical PASS summary kimondja a docs diff elhagyasanak okat, es a scope a primary artifact + conditional docs budgeten belul marad | P2 | conditional-now | task contract review |

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

## Spec Lock

Task akkor `IMPLEMENTABLE`, ha:
1. a `status` es `last-report` path explicitten read-only projection marad,
2. a `recover` path explicit snapshot-route replay marad live rerun vagy hidden authority shortcut nelkul,
3. a retained operator namespace nem nyitja ujra a removed `bubble meta-review submit` pathot,
4. a renderer/output surface projection/freshness diagnosticsot mutat authorityallitas helyett,
5. a `T1`-`T7` contract/regression evidence teljesul,
6. a docs delta csak conditionalis es cleanup-szintu user-visible semanticsra korlatozodik,
7. docs-omission eseten a `CS7` altal owned `T9` scope-containment gate is teljesul a primary artifact completion-summary contractja szerint.
