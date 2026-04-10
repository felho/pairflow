---
artifact_type: task
artifact_id: task_actor_runtime_incomplete_emit_internal_caller_cutover_and_public_recover_removal_phaseE_v1
title: "Actor Runtime Internal Caller Cutover And Public Recover Removal (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/v11/application/watchdog/watchdogMetaReviewRouting.ts
  - src/v11/application/watchdog/watchdogCommandApi.ts
  - src/v11/application/converged/convergedExecution.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/converged/convergedDefaultDependencies.ts
  - src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionParser.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/cli/index.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/cli/index.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/agent/converged.test.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
prd_ref: null
plan_ref: plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Internal Caller Cutover And Public Recover Removal (Phase E)

## L0 - Policy

### Goal

Vigye at a megmarado internal callereket a generic reconcile kernelre, majd vezesse ki teljesen a public `pairflow bubble meta-review recover` commandot hidden alias vagy retained wrapper nelkul.

### In Scope

1. Watchdog/converged internal caller cutover.
2. Public `recover` CLI grammar/help/dispatcher removal.
3. Fail-closed removal guidance a removed public command helyen.

### Out of Scope

1. Remaining internal naming cleanup.
2. Generic kernel contract redesign.
3. Meta-review docs/history cleanup beyond command removal.

### Safety Defaults

1. A public `recover` helyen ne legyen alias, no-op vagy hidden reroute.
2. A belso caller cutover utan is legyen deterministic incomplete-emit finalization path.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - watchdog/converged internal finalize contract,
   - public operator CLI contract,
   - command help/error semantics.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `2`
6. `risk_score`: `7`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: generic internal reconcile kernel
   - forbidden secondary sources: retained public recover command, hidden CLI alias

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/watchdog/watchdogMetaReviewRouting.ts` | meta-review routing seam | existing watchdog route helpers | internal routing | generic kernel callerre all at | P1 | required-now | T1 |
| CS2 | `src/v11/application/converged/convergedExecution.ts` | converged execution deps | existing dependency surface | internal finalize caller | meta-review-specific recover dependency megszunik | P1 | required-now | T2 |
| CS3 | `src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts` | removed command handling | parser helper fns | CLI parse | `recover` explicit removed command lesz | P1 | required-now | T3 |
| CS4 | `src/v11/application/metaReview/metaReviewCliOptions.ts` | help text | `getBubbleMetaReviewHelpText() -> string` | help surface | a public helpbol eltunik a `recover` | P1 | required-now | T3 |
| CS5 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | command routing | `dispatchMetaReviewCommand(...) -> Promise<...>` | dispatch | nincs `recover` branch | P1 | required-now | T3 |
| CS6 | `src/cli/index.ts` | top-level CLI rendering | `handleBubbleMetaReviewCommand(args: string[]) -> Promise<number>` | top-level CLI | removed command fail-closed hibat ad | P1 | required-now | T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Internal caller dependency | meta-review-specific recover function | generic reconcile/finalize dependency | execution context, persisted output, policy hook | diagnostics | internal breaking-by-plan | P1 | required-now |
| Public CLI grammar | `status | last-report | recover` | `status | last-report` only a retained operator subtreeben | `status`, `last-report`, help/json/verbose flags | none | breaking-by-design | P1 | required-now |
| Removed command behavior | recover executes route replay | explicit removed-command failure | reason code, removal guidance | none | breaking-by-design | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Internal callers | generic kernelre atallitas | legacy recover fallback retained path | required-now | P1 | required-now |
| Public CLI | explicit removal | hidden alias / no-op | required-now | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| user invokes removed `recover` command | CLI | throw | explicit removal guidance | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| internal caller still wired to old recover seam | code path | test failure | no silent compatibility layer | implementation regression evidence | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phases 1-2 generic kernel + meta-review cutover | P1 | required-now |
| must-not-use | retained thin wrapper public recover, hidden alias, docs-only defer | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | watchdog path uses generic reconcile caller | meta-review watchdog fixture | watchdog route fut | no old recover dependency | P1 | required-now | automated test |
| T2 | converged path no longer depends on meta-review-specific recover function | converged fixture | converged flow fut | generic caller surface marad | P1 | required-now | automated test |
| T3 | `recover` removed from parser/help/dispatcher | CLI parse/help fixture | command/help fut | explicit removed-command behavior | P1 | required-now | automated test |
| T4 | top-level CLI fail-closed for removed recover | CLI invocation | `pairflow bubble meta-review recover ...` fut | non-zero exit + typed guidance | P1 | required-now | automated test |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
