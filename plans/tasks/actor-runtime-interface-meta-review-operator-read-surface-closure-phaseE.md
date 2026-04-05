---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_operator_read_surface_closure_phaseE_v1
title: "Actor Runtime Interface Meta-Review Operator Read Surface Closure (Phase E)"
status: implementable
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

## Executive Summary

1. Ez a task a [parent Phase E operator projection cleanup task](/Users/felho/dev/pairflow/plans/tasks/actor-runtime-interface-meta-review-operator-projection-cleanup-phaseE.md) megmaradt, meg nem zart szeletet kuloniti el bounded implementation taskkent.
2. A `recover` snapshot-route replay closure mar lezart; ebben a taskban a retained `status` es `last-report` projection-only semantics, a renderer freshness/parity boundary es a retained `run` non-regression guard explicit lezárasa a cel.
3. A task csak akkor sikeres, ha a read surface se kodban, se CLI szovegben nem sugall canonical actor authorityt vagy current-round acceptance-t stale/historical projectionbol.
4. `README.md` es `docs/pairflow-initial-design.md` csak akkor touched, ha bizonyithato user-visible operator semantics delta tortenik; ellenkezo esetben explicit `T9` docs-omission closure kell.

## Scope Tracking Basis

1. Ez a task a parent task 2026-04-05 tracking snapshotjabol kovetkezik.
2. Relevans commitbasis:
   - `12f61ce` `Merge branch 'bubble/ari-meta-review-op-cleanup'`
   - `413e532` `Merge branch 'bubble/imp-meta-review-ops-phasee'`
3. A parent task tracking szerint:
   - `recover` closure: `done`
   - `status` + `last-report` closure: `partial`
   - `run` non-regression + renderer boundary: `pending`
   - docs decision gate: `pending`
4. Ez a task ezeket a megmaradt elemeket viszi le; nem uj Phase E lane es nem teljes meta-review operator redesign.

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
4. a docs decision gate `T8` vagy `T9` egyertelmuen zarul.

### Context

1. A canonical meta-review submit authority Phase E-ben mar kulonall a `pairflow agent emit --kind meta_review_result` pathon.
2. A `recover` retained operator path mar explicit snapshot-route replay retained surface, es a canonical top-level `execution_context` authorityra lett szukitve.
3. A megmaradt bizonytalansag a read-path es renderer feluleten van: a projection-only semantics mar reszben kodba kerult, de a task-level closure a freshness/parity es a retained `run` boundary explicit auditjaval egyutt meg nyitott.
4. A parent taskban ez a maradek scope mar nem erdemes egyben maradjon a recovery closure-rel, mert a kovetkezo implementation lepes sokkal szukebb es jobban review-olhato.

### In Scope

1. `status` projection-only semantics explicit lezárasa.
2. `last-report` projection-only semantics explicit lezárasa.
3. Current-round freshness/parity CLI renderer boundary tisztitasa.
4. Retained `run` non-regression guard a namespace szintjen.
5. A hozzatartozo `T1-T5` automated evidence.
6. `T8` vagy `T9` docs decision closure.

### Out of Scope

1. `recover` tovabbi semantics rewrite.
2. Uj actor primitive vagy uj submit path.
3. `bubble meta-review run` redesign vagy orchestration-atiras.
4. Operator namespace harmonization a `meta-review` subtree-n tul.
5. Implementer / reviewer / meta-reviewer actor cutover munka.

### Safety Defaults

1. A `status` es `last-report` path hidden write, hidden rerun es hidden authority-refresh nelkul marad.
2. A renderer stale vagy hianyos projection esetben sem sugallhat acceptance-t vagy canonical actor authorityt.
3. A `run` retained trigger surface csak non-regression szomszedsagi boundary; a task nem irhatja at a `run` semanticsat.
4. Ha nincs user-visible semantics delta, docs diff nem keszulhet pusztan belso hardening miatt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - operator CLI retrieval contract,
   - projection freshness/parity diagnostics contract,
   - retained operator-vs-actor namespace boundary,
   - docs decision closure contract.

### Normative Reference Policy

1. Canonical plan:
   - `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
2. Parent cleanup contract:
   - `plans/tasks/actor-runtime-interface-meta-review-operator-projection-cleanup-phaseE.md`
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

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | `dispatchMetaReviewCommand` + `runMetaReviewStatusProjectionCommand` + `runMetaReviewLastReportProjectionCommand` | `dispatchMetaReviewCommand(input: { options: BubbleMetaReviewExecutableCommandOptions; cwd: string }) -> Promise<BubbleMetaReviewCommandResult>`; projection subcommands: `{ options: Extract<..., { command: "status" | "last-report" }>; cwd: string } -> Promise<BubbleMetaReviewCommandResult>` | A dispatcher explicitten projection-only subcommandkent tartsa a `status` es `last-report` pathot; semmilyen hidden run/recover/submit route ne legyen elerheto ezen az agon. | P1 | required-now | T1, T2 |
| CS2 | `src/core/bubble/metaReview.ts` | `getMetaReviewStatus`, `getMetaReviewLastReport` | `getMetaReviewStatus(input: MetaReviewReadInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewStatusView>`; `getMetaReviewLastReport(input: MetaReviewReadInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewLastReportView>` | A read surface current-round freshness/parity projectionje explicit es fail-closed maradjon; stale vagy missing artifact nem valhat acceptance-allitassa. | P1 | required-now | T1, T2, T3 |
| CS3 | `src/v11/application/metaReview/metaReviewCliRenderers.ts`, `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts` | `renderMetaReviewStatusText`, `renderMetaReviewLastReportText`, helper formatting | `renderMetaReviewStatusText(view: MetaReviewStatusView, verbose: boolean) -> string`; `renderMetaReviewLastReportText(view: MetaReviewLastReportView, verbose: boolean) -> string` | A text explicitten projection/freshness/parity/provenance nyelvet hasznaljon; stale vagy historical snapshotbol ne tanitson current-round truth semanticsat. | P1 | required-now | T3 |
| CS4 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` + test surface | retained `run` namespace neighbor | existing `run` dispatch branch | A `run` retained trigger semantics explicit non-regression guard alatt maradjon; a task nem terjeszkedhet run redesignba, de bizonyitania kell, hogy a namespace boundary stabil. | P1 | required-now | T4 |
| CS5 | `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/contracts/v11/metaReviewGate.contract.test.ts`, `tests/v11/application/metaReview/metaReviewFacadeParity.test.ts` | regression surface | `vitest` coverage | Kotelezo evidence kell a read-only retrievalre, freshness/parity textre, es a retained `run|status|last-report|recover` namespace boundaryre. | P1 | required-now | T1-T5 |
| CS6 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing semantics | docs-only | Csak valos user-visible semantics delta eseten frissitendo. | P2 | conditional-now | T8 |

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

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| `status` / `last-report` read path | state/artifact olvasas, projection diagnostics | write side effect, live rerun, authority refresh | pure-by-default read path | P1 | required-now |
| Renderer text | wording clarification, provenance visibility | acceptance-t vagy authorityt sugallo szoveg stale projection mellett | review-stability slice | P1 | required-now |
| `run` branch | regression test guard | live-review trigger semantics atdefinialasa | neighbor-surface only | P1 | required-now |
| Docs | semantics delta dokumentalasa, ha valoban van | docs drift semantics delta nelkul | `T8/T9` gate | P2 | conditional-now |

Pure-by-default rule:

1. Ha a cleanuphoz helper-atiras kell, annak is meg kell tartania a read-path purityt; a convenience refactor nem igazol write side effectet.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing snapshot a `status`/`last-report` pathon | state/artifact | deterministic projection result | `no_snapshot` / `has_report=no` jelzes, nincs rerun | existing freshness diagnostics family or equivalent | info | P1 | required-now |
| stale round-local snapshot | parity artifact + round data | deterministic stale projection result | stale freshness + cleared live implication | existing freshness diagnostics family or equivalent | info/warn | P1 | required-now |
| invalid/missing report artifact | report file | deterministic degraded projection | projection-only degraded view, nincs hidden rerun | existing artifact diagnostics family or equivalent | warn | P1 | required-now |
| unexpected namespace regression | dispatcher/test surface | test failure | nincs silent command remap | test-level regression evidence | error | P1 | required-now |

Normative rules:

1. Read-path fallback soha nem lehet hidden rerun.
2. Degraded projection sem allithat acceptance-t vagy authorityt.
3. A `run` branch regressziojat tesztnek kell megfognia; nem eleg narrativ allitas.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | parent task tracking snapshot a mar lezart `recover` szelethez | P1 | required-now |
| must-use | meglevo `getMetaReviewStatus` / `getMetaReviewLastReport` / CLI renderer boundaries | P1 | required-now |
| must-not-use | `recover` semantics ujranyitasa ugyanebben a taskban | P1 | required-now |
| must-not-use | hidden write vagy hidden rerun a read pathokban | P1 | required-now |
| must-not-use | `run` redesign vagy uj operator namespace | P1 | required-now |
| must-not-use | actor-facing submit path erintese | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | `status` projection-only marad | bubble rendelkezik vagy nem rendelkezik snapshot-tal | `pairflow bubble meta-review status --id <id>` fut | nincs hidden mutation, nincs hidden rerun, a projection-only shape stabil | P1 | required-now | automated test |
| T2 | `last-report` projection-only marad | report ref van, hianyzik vagy stale | `pairflow bubble meta-review last-report --id <id>` fut | deterministic projection jon, nincs authority/acceptance implication | P1 | required-now | automated test |
| T3 | freshness/parity renderer explicit marad | current-round vagy stale snapshot, parity metadata adott | status/last-report text renderelodik | a text freshness/provenance/parity nyelvet hasznal, nem canonical truth nyelvet | P1 | required-now | automated test |
| T4 | retained `run` branch non-regression guard | `run|status|last-report|recover` namespace aktiv | parser/dispatch coverage fut | `run` retained trigger marad, a read pathok projection-only maradnak, nincs command drift | P1 | required-now | automated test |
| T5 | full retained namespace boundary stabil | operator subtree egyben vizsgalva | parity/facade/contract tests futnak | a namespace nem nyitja ujra a removed `submit` pathot es nem mossa ossze a read/recover/run szerepeket | P1 | required-now | automated test |
| T8 | docs csak valos semantics delta eseten touched | bizonyitott user-visible operator semantics delta van | docs diff keszul | csak cleanup-szintu retained operator semantics pontosodik, actor-submit redesign nelkul | P2 | conditional-now | doc diff |
| T9 | docs-omission closure explicit | nincs bizonyitott user-visible semantics delta | a task docs diff nelkul zarul | a completion summary explicitten kimondja a docs diff elhagyasanak okat es a scope containmentet | P2 | conditional-now | task/doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a status es last-report renderer ugyanazt a provenance/freshness logikat tobb helyen duplikalja, kesobb kulon helper-harmonization task nyithato.
2. [later-hardening] Ha a retained operator namespace mas commandjai is hasonlo wording driftet mutatnak, kulon operator-text harmonization task nyithato.

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. Uj `required-now` csak evidence-backed `P0/P1` eseten adhato a masodik kor utan.
4. A `recover` vagy actor-submit lane-re mutato findingokat csak akkor szabad ide visszahozni, ha a read-surface closure-t kozvetlenul blokkoljak.

## Spec Lock

Task akkor `IMPLEMENTABLE`, ha:
1. a `status` es `last-report` path explicitten projection-only read surface marad,
2. a renderer freshness/parity/provenance semantics authorityallitas nelkul marad,
3. a retained `run|status|last-report|recover` namespace boundary regresszioorzes alatt marad,
4. a `T1-T5` automated evidence teljesul,
5. a docs decision gate `T8` vagy `T9` explicitten zarul.
