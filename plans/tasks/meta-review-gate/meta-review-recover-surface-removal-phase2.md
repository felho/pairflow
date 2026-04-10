---
artifact_type: task
artifact_id: task_meta_review_recover_surface_removal_phase2_v1
title: "Meta-Review Recover Surface Removal (Phase 2)"
status: draft
phase: phase2
target_files:
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts
  - src/cli/index.ts
  - docs/meta-review-gate-prd.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/meta-review-gate-e2e-validation.md
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/cli/index.test.ts
  - tests/core/runtime/metaReviewSubmitGuidance.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts
prd_ref: null
plan_ref: plans/meta-review-recover-and-reconcile-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recover Surface Removal (Phase 2)

## Current Codebase Check (2026-04-10)

1. A public/operator `recover` surface jelenleg nem csak a dispatcher/help/CLI entryben el, hanem a parser/type layerben es tobb CLI/help parity tesztben is.
2. A jelenlegi public route az `emitMetaReviewGateV11.ts` recover facade-jere tamaszkodik; a Phase 1 utan ez legfeljebb nem-public residualis overlap-allapot lehet, amit itt teljesen el kell tavolitani.
3. A docs meg aktiv supported remediationkent irjak le a snapshot-route replayt, ezert Phase 2-nek a help/parser/docs/tests teljes operator surface-et szinkronban kell takaritania.

## L0 - Policy

### Goal

Tavolitsa el a public/operator `pairflow bubble meta-review recover` surface-t, es minden docs/help/test helyen tegye explicitte, hogy a tamogatott remediation `restart` vagy uj meta-review futtatas.

### In Scope

1. `recover` CLI parser/dispatcher/help surface torlese.
2. A recover-nevkoru lingering export/residual overlap teljes torlese a V11/shared facade surface-rol.
3. PRD/runbook/e2e/docs allitasok frissitese.
4. CLI es contract tesztek igazitasa az uj, recover-mentes public surface-hez.

### Out of Scope

1. Internal runtime finalize logic tovabbi valtoztatasa.
2. Uj operator command bevezetese `recover` helyett.
3. Restart command szemantika ujratervezese.

### Safety Defaults

1. Nem maradhat hidden alias, no-op vagy retained wrapper a `recover` command helyen.
2. A docs nem allithatjak, hogy snapshot-route replay tamogatott remediation.
3. A user-visible guidance explicit legyen: `restart` vagy uj meta-review futtatas.
4. Ha Phase 1 utan recover-nevkoru residualis overlap marad a fajlokban, azt Phase 2-ben teljesen el kell tavolitani; nem maradhat unsupported, de meg letezo public recover surface.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI grammar/help contract,
   - operator documentation contract,
   - contract/e2e expectation surface,
   - residualis overlap/export cleanup a public surface vegleges torlesehez.

### Phase Boundary Ledger

| Decision Surface | Owner Artifact | This Task's Requirement | Forbidden Overreach |
|---|---|---|---|
| belso replay runtime eltavolitasa | Phase 1 | Phase 2 ezt mar kesz baseline-kent feltetelezi | belso runtime redesign visszahuzasa ide |
| public `bubble meta-review recover` parser/help/dispatcher/CLI grammar | ez a task | `recover` teljes megszuntetese a public surface-rol | hidden alias vagy unsupported public stub meghagyasa |
| docs/operator remediation wording | ez a task | `restart` vagy uj meta-review futtatas marad egyeduli tamogatott guidance | uj operator workflow tervezese |
| Phase 1 utan megmaradt recover-nevkoru residualis overlap | ez a task | teljes torles a facade/shared export surface-rol | barmilyen public recover maradek megtartasa |

### Phase Entry Gate

Phase 2 nem kezdodhet meg, es a task nem tekintheto nyitottnak, amig az alabbi allitasok mindegyike nem igaz:

1. a Phase 1 mar explicitten kijelolte a public/shared overlap fajlokat es azok Phase 1 runtime-only ownershipet,
2. a Phase 1 mar explicitten kimondja, hogy nincs accepted retained public/operator recover koztes allapot; legfeljebb nem-public residualis overlap maradhat fajlszinten,
3. a Phase 1 validation/evidence contract mar kimondja, hogy a replay-kepes recover runtime es a reconcile kernel eltunt a belso grafbol,
4. a Phase 2 ebbol a baseline-bol indulva kizarolag a parser/help/docs/export teljes public/operator torleset vegzi el.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: public CLI subtree `bubble meta-review`
   - competing identifiers or fallback identities: hidden alias vagy residualis recover export
10. Authority/source-of-truth note:
   - canonical source: actual supported operator commands after Phase 1
   - forbidden secondary sources: stale docs/help/examples claiming `recover`

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts`, `src/v11/application/metaReview/metaReviewCliOptionTypes.ts`, `src/v11/application/metaReview/metaReviewCliTypes.ts` | CLI parser/dispatcher routing | `dispatchMetaReviewCommand(...) -> Promise<...>` + meta-review option/type unions | command branch table + parser/type surface | nincs `recover` dispatch branch vagy `command: "recover"` public union | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/metaReview/metaReviewCliOptions.ts`, `src/cli/index.ts` | help text + top-level CLI handling | `getBubbleMetaReviewHelpText() -> string`, existing top-level CLI entry | help/operator surface | a helpbol eltunik a `recover`; a top-level CLI unknown/unsupported subcommandkent kezeli | P1 | required-now | T1, T2 |
| CS3 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts` | lingering recover export cleanup | `recoverMetaReviewGateFromSnapshotV11(...)` es shared export surface | V11/shared facade layer | barmely residualis recover export is megszunik; a public/operator surface mogott sem marad recover export | P1 | required-now | T2 |
| CS4 | `docs/meta-review-gate-prd.md`, `docs/meta-review-gate-rollout-runbook.md`, `docs/meta-review-gate-e2e-validation.md` | docs surface | docs text | operator docs | nincs snapshot-route recovery claim; restart/new-run guidance marad | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Public CLI grammar | `status | last-report | recover` | `status | last-report` | existing status/report flags | none | breaking-by-design | P1 | required-now |
| Public shared/V11 recover export | residualis overlap/export vagy replay-kepes facade | removed | N/A | N/A | breaking-by-design | P1 | required-now |
| Operator remediation docs | recover/replay mentioned | restart/new-run only | concrete command guidance | rationale | user-visible clarification | P1 | required-now |

Normative rules:

1. Phase 2 utan sem a parser/type layer, sem a dispatcher/help, sem a V11/shared facade nem tartalmazhat `recover` subcommandot vagy exportot.
2. A public `recover` eltavolitasa teljes torles legyen, ne unsupported-but-documented vagy hidden alias.
3. A `status` es `last-report` projection surface valtozatlanul megmarad.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI/help | command removal and explicit unknown/unsupported behavior | hidden alias or compatibility wrapper | required-now | P1 | required-now |
| facade/shared exports | residualis recover export torlese | retained `recoverMetaReviewGateFromSnapshotV11(...)` public export | required-now | P1 | required-now |
| Docs | final-state sync to supported remediation | stale recover examples | required-now | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| user invokes removed `recover` command | CLI | result | explicit unsupported/unknown command guidance; no reroute | existing CLI invalid-command surface or explicit replacement | warn | P1 | required-now |
| residualis recover export still exported after Phase 2 | module graph | throw/test failure | remove export; no fallback alias | build/test parity failure | error | P1 | required-now |
| docs/test still reference recover as supported | N/A | review/test failure | update to restart/new-run guidance | docs parity failure | warn/error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 runtime removal baseline | P1 | required-now |
| must-use | docs/help/code search proving `bubble meta-review recover` public removal and V11/shared recover export deletion | P1 | required-now |
| must-not-use | retained alias, hidden reroute, deprecated-but-still-working recover branch | P1 | required-now |

### 6) Validation / Evidence Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | CLI help/parser/dispatcher no longer expose recover | meta-review CLI fixture | help/parse/dispatch runs | no recover branch, help row, or command union remains | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts` |
| T2 | removed command fails closed at the public boundary | CLI invocation for `bubble meta-review recover` + facade/export parity | command runs / type graph checked | non-success invalid/unsupported behavior, no hidden fallback, and no retained recover export remains | P1 | required-now | `tests/cli/index.test.ts`, `tests/contracts/v11/metaReviewGate.contract.runner.ts`, code search |
| T3 | docs describe restart/new-run only | docs diff/code search | review runs | no supported recover claim remains | P1 | required-now | `tests/core/runtime/metaReviewSubmitGuidance.test.ts`, doc review + code search |

## Acceptance Criteria

1. AC1: A public parser/type/dispatcher/help surface teljesen eltavolitja a `recover` subcommandot.
2. AC2: A Phase 1 utan esetleg megmaradt recover-nevkoru residualis overlap/export is torlodik a V11/shared facade surface-rol.
3. AC3: A docs csak `restart` vagy uj meta-review futtatas remediationt allitanak tamogatottnak.
4. AC4: A task nem huzza vissza magahoz a Phase 1 belso runtime redesignjat; csak a public/operator surface cleanupot zarja le.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests / Evidence |
|---|---|---|
| AC1 | CS1, CS2 | T1, T2 |
| AC2 | CS3 | T2 |
| AC3 | CS4 | T3 |
| AC4 | `Phase Boundary Ledger`, `Phase Entry Gate` | document review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az unsupported-command wording szetszorodik, erdemes lehet central CLI helperbe emelni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | unify operator remediation examples | L2 | P2 | later-hardening | doc follow-up | normalize restart/new-run examples across wider docs set |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
