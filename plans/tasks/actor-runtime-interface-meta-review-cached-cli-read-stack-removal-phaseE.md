---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_cli_read_stack_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached CLI and Read-Stack Removal (Phase E)"
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
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/shared/metaReview/metaReviewCommandApi.ts
  - src/v11/shared/metaReview/metaReviewCommandReadArtifacts.ts
  - src/v11/shared/metaReview/metaReviewCommandReadFreshness.ts
  - src/v11/shared/metaReview/metaReviewCommandReadProjection.ts
  - src/v11/shared/metaReview/metaReviewCommandReadRuntime.ts
  - src/v11/shared/metaReview/metaReviewTypes.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts
  - tests/v11/shared/metaReview/metaReviewCommandReadArtifacts.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached CLI and Read-Stack Removal (Phase E)

## Current Codebase Check (2026-04-11)

1. A public `pairflow bubble meta-review` subtree ma meg retained operator surface-kent exportalodik.
2. A cached `status` / `last-report` kepesseghez meg dedikalt parser/dispatcher/read-runtime/types stack tartozik.
3. A foundation taskok utan ennek a retained read/operator pathnak mar nem kell canonical control-pathot vagy source-of-truthot kiszolgalnia.

## L0 - Policy

### Goal

Torolje a cached meta-review public CLI namespace-et es a hozza tartozo cached read-model/application/shared runtime stackot ugy, hogy ne maradjon parser, export, placeholder vagy dangling import a kodbazisban.

### In Scope

1. A `bubble meta-review` CLI subtree eltavolitasa a parser/help/dispatcher/export surface-rol.
2. A cached `status` / `last-report` read stack fajljainak es tipusainak torlese vagy detachelasa.
3. A kapcsolodo build/import/test cleanup ebben a runtime szeletben.

### Out of Scope

1. Repo-local workflow/skill docs cleanup.
2. UI copied prompt cleanup.
3. README/plan/task docs cleanup.
4. A canonical `pairflow agent emit --kind meta_review_result` write path valtoztatasa.

### Safety Defaults

1. A torolt namespace helyen csak generic unknown-command behavior maradhat; nincs dedicated removal help.
2. A dead read-stack kodot torolni kell; nem maradhat "historical compatibility" branchkent.
3. Ha build/import hiba marad a torles utan, az blokkolja a task lezarasat.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI/interface contract,
   - internal application/shared meta-review read contract.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `2`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Split note:
   - Ez mar a superseded umbrella task egyik bounded replacement delivery szelete; tovabbi split nem kotelezo.
10. Identity/join note:
   - canonical identity path: `CLI -> no meta-review subtree`
   - competing identifiers or fallback identities: `bubble meta-review status`, `bubble meta-review last-report`
11. Authority/source-of-truth note:
   - canonical source: a fennmarado live submit/gate command surface
   - forbidden secondary sources: retained cached read-model export vagy placeholder CLI branch

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/index.ts`, `src/cli/commands/bubble/metaReview.ts` | bubble CLI routing/export | top-level CLI dispatch -> no meta-review subtree | CLI entrypoint | A `bubble meta-review` namespace teljesen tunjon el a public CLI-bol. | P1 | required-now | CLI diff |
| CS2 | `src/v11/application/metaReview/*`, `src/v11/shared/metaReview/metaReviewCommandApi.ts`, `src/v11/shared/metaReview/metaReviewCommandRead*.ts`, `src/v11/shared/metaReview/metaReviewTypes.ts` | cached read stack | parser/dispatcher/read runtime/types -> deleted or detached | meta-review read runtime | A cached `status` / `last-report` read stack torlodjon; a marado meta-review code ne importalja a read stackot. | P1 | required-now | build + import cleanup |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Public CLI namespace | `pairflow bubble meta-review status|last-report` | no public `bubble meta-review` subtree | none | none | breaking interface removal | P1 | required-now |
| Meta-review read-model types | retained `MetaReviewStatusView`, `MetaReviewLastReportView` read API | removed | none | none | breaking internal API removal | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI/application/shared code | delete routes, exports, runtime files, and imports | deprecated alias branch, placeholder help, or retained dead types | history belongs in git | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| User invokes removed `bubble meta-review` path after removal | CLI parser | result | generic unknown-command behavior only | N/A | info | P2 | required-now |
| Deleted read-stack file is still imported | TS build | throw | remove dangling imports before merge | N/A | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-meta-review-cached-state-shape-and-persistence-decoupling-phaseE.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-meta-review-cached-approval-and-projection-consumer-cutover-phaseE.md` | P1 | required-now |
| must-not-use | `pairflow bubble meta-review` placeholder help text | P1 | required-now |
| must-not-use | retained cached read-model exports/types after route removal | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Public CLI no longer has meta-review subtree | built CLI sources | help/dispatch paths are exercised | no `bubble meta-review` route is present in parser/dispatcher/help | P1 | required-now | automated test |
| T2 | Cached read stack is removed cleanly | application/shared meta-review modules | build/test runs | no dangling imports or retained read path remain | P1 | required-now | build + automated test |
| T3 | Removed namespace has no compatibility message | removed surface exercised | CLI parses command | generic unknown-command behavior only | P2 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a `src/v11/application/metaReview/**` directory a removal utan tulemptied vagy ownership-szempontbol zavaro marad, kulon cleanup johet.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | residual directory hygiene a meta-review application folderben | L2 | P2 | later-hardening | task authoring | csak a primary removal slice utan ertekelni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
