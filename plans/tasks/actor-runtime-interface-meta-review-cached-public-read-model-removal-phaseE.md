---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_public_read_model_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Public Read-Model Removal (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/cli/index.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionParser.ts
  - src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliOptionValueReader.ts
  - src/v11/application/metaReview/metaReviewCliValueParsers.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/metaReviewCommandContract.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/defaults/metaReview/metaReviewApi.ts
  - src/v11/shared/metaReview/metaReviewCommandApi.ts
  - src/v11/shared/metaReview/metaReviewCommandContract.ts
  - src/v11/shared/metaReview/metaReviewCommandReadArtifacts.ts
  - src/v11/shared/metaReview/metaReviewCommandReadFreshness.ts
  - src/v11/shared/metaReview/metaReviewCommandReadProjection.ts
  - src/v11/shared/metaReview/metaReviewCommandReadRuntime.ts
  - src/v11/shared/metaReview/metaReviewCommandRuntime.ts
  - src/v11/shared/metaReview/metaReviewSubmitGuidance.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunContract.ts
  - src/v11/shared/metaReview/metaReviewTypes.ts
  - tests/cli/index.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/human/approval.test.ts
  - tests/core/runtime/metaReviewSubmitGuidance.test.ts
  - tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts
  - tests/v11/shared/metaReview/metaReviewCommandReadArtifacts.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Public Read-Model Removal (Phase E)

## L0 - Policy

### Goal

Torolje a public `pairflow bubble meta-review` cached read-model surface-et es a hozza tartozo retained read/export stackot ugy, hogy a canonical `pairflow agent emit --kind meta_review_result` submit path kozben erintetlen maradjon.

### Domain / Control Model Summary

1. Business invariant: a publikus operator surface csak a megmarado canonical runtime contractot surfacelheti; removed cached read-model nem maradhat tovabb invokalhato vagy exportalhato allapotban.
2. Control model: a public meta-review operator surface letezeset a CLI contract donti el; a Phase E vegallapotban nincs canonical `bubble meta-review` subtree.
3. Read-path rule: meta-review result submithez csak a canonical `agent emit` path es a shared submit guidance olvashato; dedikalt cached `status|last-report` operator read path nem maradhat.
4. Forbidden fallback: nincs removal shim, nincs dedicated removed-command help, nincs retained wrapper a removed read/export surface felett.
5. Missing-data rule: a torolt public path generic unknown-command viselkedessel zarul; a rendszer nem ajanl legacy cached read alternativat.
6. Phase boundary:
   - contract closure: owned here
   - producer closure: archived prereq
   - internal execution closure: successor task
   - workflow/orchestration closure: archived prereq
   - read_model_closure: owned here
   - activation closure: N/A
   - cleanup/recovery closure: successor task

### Authority Boundary Map

1. Authority producer: a live meta-review authority producer cutover mar archived prereqben le van zarva.
2. Stored authority: a persisted `state.meta_review.last_autonomous_*` shape ideiglenesen meg letezhet, de ez a task nem owns-olja a fizikai torleset.
3. In-scope consumers: public CLI routing/help, retained application/shared read-model exports, direct read-model tests.
4. Explicit out-of-scope consumers: persisted authority shape, cleanup/recovery helpers, repo-local workflow/docs/UI prompt surfaces.
5. Export surfaces closed in this phase: yes; a public cached read-model export surfaces teljesen bezarandoak.

### In Scope

1. A `bubble meta-review` CLI namespace teljes eltavolitasa a public parser/help/dispatcher/export surface-rol.
2. A cached `status|last-report` application/shared read stack es retained export surfaces torlese vagy detachmentje.
3. A shared submit guidance megtartasa ugy, hogy a `meta_review_result` actor emit parse/submit path ne torjon el.
4. A kapcsolodo build/import/test cleanup.

### Out of Scope

1. Persisted `last_autonomous_*` field-ek fizikai torlese.
2. Cleanup/recovery es inspectable normalization cleanup.
3. Repo-local workflow, README, plan vagy UI copied prompt wording cleanup.
4. Approval/status/list/UI source-of-truth cutover, amely mar archived prereqben lezart.

### Safety Defaults

1. A torolt public namespace helyen csak generic unknown-command viselkedes maradhat.
2. A canonical submit guidance maradjon shared source-of-truth; a cleanup nem torheti el a `pairflow agent emit --kind meta_review_result` pathot.
3. Retained compatibility branch vagy "use cached mode instead" wording nem maradhat.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI/interface contract
   - shared read-model/export contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - N/A
10. Identity/join note:
   - canonical identity path: `pairflow agent emit --kind meta_review_result`
   - competing identifiers or fallback identities: removed `bubble meta-review` route es a hozza kapcsolt retained read exports
11. Authority/source-of-truth note:
   - canonical source: shared submit guidance + canonical actor emit submit path
   - forbidden secondary sources: cached operator read surface vagy retained read export wrapper

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | A public operator surface nem reklamozhat removed cached meta-review capabilityt. | A `bubble meta-review` namespace teljesen tunjon el. | P1 | required-now |
| Control model | A surviving public contract a canonical actor emit submit path. | Read-stack cleanup nem torheti el a shared submit seamet. | P1 | required-now |
| Read-path rule | Meta-review submit guidance csak a shared `agent emit` contractot surfacelheti. | No retained `status|last-report` path or wrapper. | P1 | required-now |
| Forbidden fallback | Nincs removal shim, dedicated compatibility help vagy retained read export. | Generic unknown-command marad. | P1 | required-now |
| Missing-data rule | Removed path invokalasa generic unknown-command eredmenyt ad. | Nincs legacy read alternative. | P2 | required-now |
| Phase boundary | Ez a task a public read-model closure task; nem owns-olja a persisted authority shape-et vagy cleanup/recovery familyt. | A field-removal es repo-surface cleanup kulon taskban marad. | P1 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `bubble meta-review` public CLI subtree | `src/cli/**`, `src/v11/application/metaReview/**`, CLI tests | breaking | remove route/help/parser/read dispatch | N/A |
| Shared submit-parser seam (`metaReviewCliOptionValueReader.ts`, `metaReviewCliValueParsers.ts`) | canonical actor emit parse path, submit coverage tests | breaking to removed public path, retained for canonical submit | detach removed read-model use while preserving submit behavior | N/A |
| Retained read exports (`MetaReviewStatusView`, `MetaReviewLastReportView`, read APIs) | defaults facade, live-run facade, read-model tests, direct core test consumers | breaking | remove exports and update direct consumers in-scope | N/A |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/index.ts`, `src/cli/commands/bubble/metaReview.ts` | top-level CLI routing/export | CLI args -> exit code | public CLI entrypoint | A `bubble meta-review` namespace teljesen tunjon el a public CLI-bol. | P1 | required-now | CLI diff + tests |
| CS2 | `src/v11/application/metaReview/metaReviewCliOptions.ts`, `metaReviewCliDispatcher.ts`, `metaReviewCliTypes.ts`, `metaReviewCliRenderers*.ts`, `metaReviewCliOptionParser*.ts`, `metaReviewCliCommand.ts` | application cached read CLI stack | parser/help/render/dispatch helpers -> no public cached read flow | application meta-review read stack | A cached read branches torlodjenek; a shared submit parser helpers retained role-ban maradjanak. | P1 | required-now | build + tests |
| CS3 | `src/v11/application/metaReview/metaReviewCommandContract.ts`, `src/v11/application/metaReview/emitMetaReviewV11.ts`, `src/v11/defaults/metaReview/metaReviewApi.ts`, `src/v11/shared/metaReview/metaReviewCommand*.ts`, `src/v11/shared/metaReview/liveRun/metaReviewLiveRunContract.ts`, `src/v11/shared/metaReview/metaReviewTypes.ts` | retained read export surfaces | read APIs/types -> detached or removed | shared/defaults export seam | Retained `getMetaReviewStatus|getMetaReviewLastReport` es view type export ne maradjon aktiv boundary. | P1 | required-now | import diff + tests |
| CS4 | `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts`, `tests/cli/agentEmitCommand.test.ts`, `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`, `tests/core/runtime/metaReviewSubmitGuidance.test.ts` | canonical submit guidance + actor emit path | shared guidance/parser -> preserved canonical submit path | submit seam | A cleanup nem regresszalhatja a `pairflow agent emit --kind meta_review_result` parse/submit viselkedest. | P1 | required-now | tests |
| CS5 | `tests/cli/index.test.ts`, `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/core/human/approval.test.ts`, `tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts`, `tests/v11/shared/metaReview/metaReviewCommandReadArtifacts.test.ts` | regression coverage | tests -> tests | public read-model regression surface | A removed public namespace, generic unknown-command viselkedes, retained export closure es a direct core read-consumer cleanup explicit coverage alatt alljon. | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Public CLI namespace | `pairflow bubble meta-review status|last-report` | nincs public subtree | none | none | breaking interface removal | P1 | required-now |
| Shared submit-parser seam | removed public path es canonical submit ugyanazt a parser helper csaladot hasznalja | canonical submit retained, public read path removed | `--kind meta_review_result` required fields | `--ref` | non-breaking for retained path | P1 | required-now |
| Shared/defaults read exports | retained read APIs es view type-ok tovabb exportalodnak | removed | none | none | breaking internal export removal | P1 | required-now |
| Removed-path behavior | custom removal help es compatibility wording meg letezhet | generic unknown-command only | none | none | intentional simplification | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI/application/shared read code | route/export/import torles, detachment | retained compatibility branch, placeholder help | history maradjon gitben | P1 | required-now |
| Shared submit guidance | retained canonical usage line | public cached read alternative felsorolasa | canonical submit path vedelme kotelezo | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| User invokes removed `bubble meta-review` path | CLI parser | result | generic unknown-command | N/A | info | P2 | required-now |
| Removed read export mar importalva marad | TypeScript build | throw | dangling import torlendo merge elott | N/A | error | P1 | required-now |
| Shared submit parser cleanup regresszalja a canonical actor emit pathot | parser + submit coverage | throw | rollback broken detach, preserve canonical path | existing schema/submit failure codes | error | P1 | required-now |
| Dependency failure | build/test tooling | fallback | task nem zarhato le passing build/test nelkul | DEPENDENCY_FAIL | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | archived reviewer-parity authority/runtime producer cutover as prereq context | P1 | required-now |
| must-use | archived approval/projection consumer cutover as prereq context | P1 | required-now |
| must-use | shared submit guidance + canonical `meta_review_result` path parity | P1 | required-now |
| must-not-use | removed-command shim vagy dedicated compatibility help | P1 | required-now |
| must-not-use | retained read exports/types wrappers | P1 | required-now |
| must-not-use | cleanup, amely eltori a canonical actor emit submit seamet | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Public CLI no longer has cached subtree | current tree still exports `bubble meta-review` | top-level CLI help/dispatch fut | nincs public `bubble meta-review` route | P1 | required-now | automated test |
| T2 | Removed namespace has no compatibility message | removed path invoked | parser result buildel | generic unknown-command, no custom removal guidance | P2 | required-now | automated test |
| T3 | Shared submit-parser seam remains intact | canonical `meta_review_result` submit path still in use | submit parse/contract coverage fut | required fields tovabbra is helyesen parse-olodnak | P1 | required-now | automated test |
| T4 | Retained read exports are gone | direct read exports ma meg elerhetok | build es import cleanup lefut | read APIs/view types nem maradnak aktiv export boundaryk | P1 | required-now | automated test |
| T5 | CLI read-stack tests updated to removed surface | current CLI read tests retained surface-re epulnek | new test matrix fut | read-stack coverage removed surface-re vagy detached seamre all at | P1 | required-now | automated test |
| T6 | Actor emit path remains healthy after read-stack removal | CLI/application cleanup megtortent | `tests/cli/agentEmitCommand.test.ts` fut | canonical actor emit submit path tovabbra is zold | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a meta-review application folderben residual empty file group marad, kulon hygiene cleanup nyithato.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | residual folder hygiene a public read-model removal utan | L2 | P2 | later-hardening | task authoring | kulon hygiene follow-up, csak a primary removal utan |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.
6. If a shared contract changes, current-consumer inventory and additive-vs-breaking classification are mandatory.
7. If an authority fan-out exists, the authority boundary map must stay consistent with the bounded task scope.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, a public `bubble meta-review` subtree mar nem letezik, es a canonical `pairflow agent emit --kind meta_review_result` path valtozatlanul passing.
