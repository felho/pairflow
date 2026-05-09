---
artifact_type: task
artifact_id: task_meta_review_submit_command_local_pipeline_v1
title: "Meta-Review Submit Command-Local Pipeline"
status: draft
phase: phase1
target_files:
  - src/v11/application/metaReview/metaReviewCommandSubmitRuntime.ts
  - src/v11/application/metaReview/metaReviewCommandSubmitPreparation.ts
  - src/v11/application/metaReview/metaReviewCommandSubmitPersistence.ts
  - src/v11/application/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/application/metaReview/internal/submit/**
  - src/v11/shared/metaReview/internal/submit/**
  - src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitValidation.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitParity.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitLink.ts
  - tests/v11/application/metaReview/**
  - tests/v11/shared/metaReview/**
  - tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - docs/actor-runtime-interface/execution-authority-contract-note-v1.md
  - docs/modularity-review/2026-05-09-modularity-review-deepening-candidates.md
owners:
  - "felho"
---

# Task: Meta-Review Submit Command-Local Pipeline

## Current Codebase Check (2026-05-09)

1. `src/v11/application/metaReview/metaReviewCommandSubmitRuntime.ts` is the current submit runtime entrypoint.
2. `src/v11/application/metaReview/metaReviewCommandSubmitPreparation.ts` currently owns bubble resolution, state read, authority checks, submit validation, canonical run/report handling, reviewer snapshot parity, and approve-threshold policy checks in one broad preparation flow.
3. `src/v11/shared/metaReview/internal/submit/**` already contains lower-level submit helpers, but the top-level shared re-export files still expose many implementation details as public callable pieces.
4. The desired direction is not to move the whole submit workflow into `shared/metaReview`; the full submit workflow is command-local orchestration and belongs under `src/v11/application/metaReview/**`.
5. Future dry-run, UI preview, or diagnostics use cases are valid but not required now. The implementation should keep an internal reusable validation/canonicalization core so those interfaces can be added later without redesigning the production submit path.
6. The desired runtime shape is a full command-local production submit pipeline, not only a preparation helper that still leaves persistence, canonical run-result construction, artifact parity, routing, and finalization sequencing in the caller.

## L0 - Policy

### Goal

Deepen the `metaReview submit` workflow by introducing a command-local submit pipeline module that hides the production submit call order behind one small runtime-facing interface.

The business question this task should make explicit is:

> Is this meta-review submit canonical, authorized, and ready to be persisted and routed?

The caller should no longer need to manually orchestrate every authority, stale-guard, payload, parity, run-id, canonical-report, approve-threshold, state-persistence, rework-artifact parity, route recovery, and finalization step as separate workflow calls.

### Context

`metaReview submit` is a critical quality-gate workflow. It is where the meta-reviewer result becomes an accepted Pairflow runtime fact and determines whether a bubble routes to rework, another meta-review run, or human approval.

The current implementation is functionally valid, but the module interface is shallow: correctness depends on the caller knowing the internal ordering of many checks. This creates coordination risk when future changes touch meta-review authority, report shape, findings parity, or approve-threshold behavior.

### Chosen Architecture Direction

Use the Option 3 direction from the architecture discussion:

1. Create a command-local pipeline under `src/v11/application/metaReview/internal/submit/**`.
2. Keep production submit orchestration in `application/metaReview`.
3. Keep only genuinely shared vocabulary/policy helpers in `shared/metaReview`.
4. Internally structure validation/canonicalization so future dry-run, UI preview, or diagnostics interfaces can be added later.
5. Do not publish a two-phase dry-run/preview interface in this task unless a concrete caller is added in the same task.
6. The production runtime entrypoint should delegate to one command-local pipeline function such as `runMetaReviewSubmitPipeline(...)`; preparation-only names such as `prepareMetaReviewSubmitForPersistence(...)` are acceptable only for internal pipeline steps, not as the primary runtime-facing interface.

### In Scope

1. Introduce a command-local `internal/submit` module for the production meta-review submit pipeline.
2. Replace broad caller-side sequencing with one narrow runtime-facing command-local interface such as `runMetaReviewSubmitPipeline(...)`.
3. Preserve the existing authority model:
   - canonical `execution_context`,
   - `handoff_id`,
   - `execution_id`,
   - role/round/state-fingerprint guards.
4. Preserve existing submit semantics:
   - status is success-only for submit,
   - recommendation carries routed outcome semantics,
   - `rework` requires a non-empty rework target message,
   - approve summary/report parity remains enforced,
   - open-findings approve threshold policy remains enforced.
5. Keep internal validation/canonicalization reusable enough for future preview/dry-run work, without exposing that interface now.
6. Move the sequencing of `writeCanonicalSubmitState`, canonical run-result construction, rework artifact parity validation, route recovery, and final result construction behind the command-local pipeline interface.
7. Remove the submit-specific shared public re-export bridges as part of this task. Do not retain `shared/metaReview/metaReviewCommandSubmit*.ts` wrappers as transitional public surface.
8. Update tests so the production submit pipeline is covered through the new command-local interface.

### Out of Scope

1. Adding a new UI preview, dry-run, or diagnostics command.
2. Changing the meta-review result payload contract.
3. Changing the execution-authority contract.
4. Changing meta-review gate routing semantics.
5. Moving command orchestration into `shared/metaReview`.
6. Broad cleanup of unrelated `shared/metaReview` public re-export bridge files outside the submit-specific `metaReviewCommandSubmit*.ts` surface.

### Safety Defaults

1. No authority downgrade: `execution_id` remains canonical authority, not an optional guard or derived value.
2. No heuristic fallback: submit acceptance must continue to be based on canonical state, explicit guards, validated payloads, and same-authority deterministic checks.
3. No state write before submit preparation succeeds.
4. No preview/dry-run public surface should be introduced until there is a real caller; keep only the internal reusable core.
5. Any command-local module must use typed dependencies/ports and must not import infrastructure directly.
6. The runtime caller must not keep manual submit-order knowledge after the refactor; that knowledge belongs in `application/metaReview/internal/submit/**`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Rationale: this task changes command-local internal structure and test seams, not the public CLI/API payload contract.
3. No public contract boundary changes are allowed: CLI/API input, protocol payload shape, and meta-review result payload meaning must remain compatible.
4. Closed-contract drift check is mandatory because the task touches execution authority and canonical submit-result meaning. The task must preserve the execution-authority contract from `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`.

## L1 - Change Contract

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReview/metaReviewCommandSubmitRuntime.ts` | `submitMetaReviewResult` | Delegate to one command-local submit pipeline call and avoid manual sequencing of preparation, persistence, artifact parity, routing, and finalization | P1 | required-now | T1,T2,T3,T9 |
| CS2 | `src/v11/application/metaReview/internal/submit/**` | new submit pipeline | Own production submit call order: context load, authority validation, stale guard, shape validation, canonicalization, reviewer parity, approve threshold, state write, canonical run-result construction, rework artifact parity, route recovery, and finalization handoff | P1 | required-now | T1-T9 |
| CS3 | `src/v11/application/metaReview/metaReviewCommandSubmitPreparation.ts` | current preparation flow | Move into the new internal module or become an internal implementation detail; it must not remain the broad public owner of submit call order | P1 | required-now | T1,T4,T9 |
| CS4 | `src/v11/application/metaReview/metaReviewCommandSubmitPersistence.ts` | `writeCanonicalSubmitState`, `buildCanonicalSubmitRunResult` | Become an internal pipeline step or consume only domain-tagged internal pipeline contracts; conflict refresh must preserve stale-guard checks | P1 | required-now | T5,T6 |
| CS5 | `src/v11/shared/metaReview/internal/submit/**` | low-level submit policy helpers | Either move into `application/metaReview/internal/submit/**`, or remain private to the `shared/metaReview` module behind a deliberate non-wrapper public surface. External production/test callers must not import `shared/metaReview/internal/submit/**` directly. | P1 | required-now | T7,T9 |
| CS6 | tests under `tests/v11/application/metaReview/**` and `tests/v11/shared/metaReview/**` | submit pipeline tests | Shift key behavior coverage to the new command-local interface; keep lower-level helper tests only when they protect independent policy | P1 | required-now | T1-T9 |

### 2) Canonical Contract Matrix

| Concern | Current Source | Target Owner | Required Behavior | Forbidden Behavior | Priority |
|---|---|---|---|---|---|
| production submit call order | `metaReviewCommandSubmitRuntime.ts`, `metaReviewCommandSubmitPreparation.ts`, persistence, and routing helpers | `application/metaReview/internal/submit/**` | One command-local pipeline owns production preparation, mutation, artifact parity, routing, and finalization sequencing | caller manually reconstructs authority/payload/parity/canonicalization/persistence/routing order | P1 |
| execution authority | `shared/metaReview/internal/submit/metaReviewCommandSubmitAuthority.ts` and execution-authority note | preserved source helpers, consumed by command-local pipeline | `handoff_id` + `execution_id` remain canonical; guards remain fail-closed checks | treating `execution_id` as optional/derived/compat | P1 |
| submit payload validation | `shared/metaReview/internal/submit/metaReviewCommandSubmitValidation.ts` | preserved helper or internal core | success-only status; non-empty summary; `rework` requires target message | widening accepted status or weakening rework message rule | P1 |
| canonical run/report identity | `metaReviewCommandSubmitLink.ts`, canonicalization helpers | command-local pipeline coordinates; shared helper may compute | run id and canonical report JSON are resolved once and passed forward | persistence/routing recomputes divergent canonical meaning | P1 |
| approve reviewer parity and threshold policy | application/domain existing helpers | command-local pipeline coordinates | approve remains blocked when parity or threshold authority rejects it | route/persist before parity and threshold checks | P1 |
| route-ready accepted submit | runtime currently builds run result after preparation | `application/metaReview/internal/submit/**` | canonical run result is constructed behind the pipeline from accepted canonical meaning | runtime caller builds route-ready result by reinterpreting raw submit pieces | P1 |
| future preview/dry-run core | none public | internal reusable core only | validation/canonicalization logic remains separable from state write | public preview surface without a real caller or tests | P2 |
| submit-specific public wrappers | `shared/metaReview/metaReviewCommandSubmit*.ts` top-level bridges | removed | delete wrapper files and update all consumers to use the new command-local pipeline, command-local tests, or a deliberate non-wrapper shared public surface when the helper truly remains shared | retaining wrappers as transitional public surface or replacing them with external imports into `shared/metaReview/internal/submit/**` | P1 |
| low-level submit helpers | currently under `shared/metaReview/internal/submit/**` | explicit owner | helpers used only by the production submit pipeline should move command-local; helpers that remain shared must be exposed through a stable non-wrapper shared module and tested as shared policy | external callers import `shared/metaReview/internal/submit/**` directly | P1 |

### 3) Data and Interface Contract

The new runtime-facing command-local interface should return the final `MetaReviewSubmitResult` or an equivalent command result, not a broad bag of preparation fields for the runtime caller to interpret.

Inside `application/metaReview/internal/submit/**`, internal pipeline steps may pass a structured contract. If such a contract exists, it must be domain-tagged rather than a flat implementation DTO:

1. `acceptedSubmit`
   - canonical run result,
   - canonical report JSON,
   - accepted recommendation/status/summary/rework target,
   - canonical run identity.
2. `mutationContext`
   - state path,
   - loaded state fingerprint,
   - active execution context,
   - write/read ports needed for conflict-safe persistence.
3. `routingContext`
   - resolved bubble,
   - repo path,
   - refs,
   - capabilities required by gate routing and delivery.
4. `validationEvidence`
   - reviewer snapshot/parity evidence,
   - threshold-policy evidence,
   - diagnostics needed by tests or errors only.

The runtime caller must not receive this internal structure and then manually sequence persistence, parity, routing, or finalization. The internal structure exists to keep pipeline steps explicit without leaking submit-order knowledge outside the command-local module.

### 4) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority |
|---|---|---|---|---|
| submit preparation | read bubble metadata, read state, read runtime sessions, read artifacts needed for validation | state writes, transcript appends, gate finalization | preparation must complete before mutation | P1 |
| state persistence | write canonical submit state through existing state snapshot port | recompute authority or payload semantics inconsistently | conflict refresh may re-run stale guard against latest state | P1 |
| route/finalization | use canonical run result from accepted submit | route from raw report/input when canonical form differs | routing must consume accepted canonical meaning | P1 |
| runtime caller | call one command-local submit pipeline function | manually order preparation, persistence, artifact parity, routing, and finalization | caller should own input/dependency handoff only | P1 |
| future preview | keep reusable pure/internal core | publish CLI/UI/API preview behavior now | defer public surface until needed | P2 |

### 5) Error and Fallback Contract

| Trigger | Behavior | Required Error Semantics | Priority |
|---|---|---|---|
| invalid or missing active execution context | throw typed `MetaReviewError` | preserve existing `META_REVIEW_STATE_INVALID` behavior | P1 |
| stale guard mismatch | throw typed `MetaReviewError` | preserve current mismatch reason semantics | P1 |
| round mismatch | throw typed `MetaReviewError` | preserve `META_REVIEW_ROUND_MISMATCH` | P1 |
| invalid recommendation/report/summary | throw typed `MetaReviewError` | preserve schema invalid reason behavior | P1 |
| `rework` without target message | throw typed `MetaReviewError` | preserve `META_REVIEW_REWORK_MESSAGE_INVALID` | P1 |
| approve parity/threshold rejection | throw typed `MetaReviewError` | preserve existing parity and threshold reason codes | P1 |
| state write conflict after successful preparation | refresh latest state and re-run stale guard before conflict error mapping | no blind retry and no silent acceptance | P1 |

### 6) Dependency Constraints

| Type | Items | Priority |
|---|---|---|
| must-use | `src/v11/application/metaReview/internal/submit/**` for command-local submit pipeline ownership | P1 |
| must-use | existing typed dependency object / ports for state, transcript, runtime sessions, bubble lookup, artifact read | P1 |
| must-use | execution-authority contract note as closed authority source | P1 |
| must-not-use | direct infrastructure imports from application internals | P1 |
| must-not-use | moving full command orchestration into `shared/metaReview` | P1 |
| must-not-use | runtime caller sequencing broad submit helper calls after the refactor | P1 |
| must-not-use | public dry-run/preview API without a concrete caller and tests | P2 |

### 7) Test Matrix

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|
| T1 | valid approve submit | active meta-review execution context, valid report, parity accepted | new command-local submit pipeline runs | returns final submit result with canonical run/report identity and expected route behavior | P1 |
| T2 | valid rework submit | valid report and non-empty rework target | pipeline runs | returns final submit result preserving rework target and canonical report | P1 |
| T3 | rework missing target | recommendation is `rework`, target missing/empty | pipeline runs | throws existing `META_REVIEW_REWORK_MESSAGE_INVALID` behavior before state write | P1 |
| T4 | stale guard mismatch | expected handoff/execution/round/fingerprint does not match active authority | pipeline runs | throws fail-closed stale-guard error before state write | P1 |
| T5 | persistence consumes accepted submit meaning | accepted submit exists inside pipeline | state persistence runs | no canonical meaning is recomputed differently in persistence | P1 |
| T6 | state conflict refresh | state write conflicts after preparation | persistence conflict handling refreshes state | stale guard is rechecked against latest state before conflict mapping | P1 |
| T7 | shared helper locality | low-level submit helpers still have focused tests | tests run | helper tests either move to command-local pipeline coverage, or target an explicitly retained non-wrapper shared public policy surface; no external test imports `shared/metaReview/internal/submit/**` directly | P1 |
| T8 | no public preview surface | implementation complete | API/export scan or targeted test checks exports | no new CLI/UI/API dry-run or preview entrypoint exists | P2 |
| T9 | public submit helper surface removed | implementation complete | import scan runs | no `shared/metaReview/metaReviewCommandSubmit*.ts` wrapper files remain, no imports target them, and no external production/test caller imports `shared/metaReview/internal/submit/**` directly | P1 |

## Acceptance Criteria

1. AC1: `submitMetaReviewResult` delegates the production submit workflow to one narrow command-local submit pipeline interface.
2. AC2: The submit call order is owned by `application/metaReview/internal/submit/**`, not reconstructed from many shared top-level helper calls in the runtime caller.
3. AC3: Existing execution-authority semantics are preserved exactly; `execution_id` is not downgraded to optional guard or derived value.
4. AC4: Existing validation, parity, canonical run/report, and approve-threshold behavior remains covered by tests through the new command-local interface.
5. AC5: No public dry-run, UI preview, or diagnostics interface is introduced in this task.
6. AC6: The internal design keeps validation/canonicalization separable enough that a later preview/dry-run interface can be added without rewriting the production submit path.
7. AC7: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant meta-review submit tests, broader affected tests, `pnpm test`, and `pnpm build` pass or are explicitly reported with exact failures.
8. AC8: `submitMetaReviewResult` must not manually sequence authority, payload validation, canonical run/report construction, rework artifact parity, route recovery, and route-ready run-result construction. Those steps must be owned by `application/metaReview/internal/submit/**` behind one command-local interface.
9. AC9: Submit-specific shared wrapper files `src/v11/shared/metaReview/metaReviewCommandSubmit*.ts` must be removed. Production consumers must use the new command-local pipeline interface or command-local internals only within `application/metaReview`. Tests must either cover the command-local pipeline or an explicitly retained non-wrapper shared public policy surface. No production or test consumer may replace the wrappers with direct imports into `src/v11/shared/metaReview/internal/submit/**`. If removal is impossible, implementation must stop and return for task refinement instead of retaining a wrapper or adding external internal imports.
10. AC10: No production `application/metaReview` caller imports `shared/metaReview/metaReviewCommandSubmit*.ts` directly after the refactor.

## L2 - Implementation Notes

1. Prefer naming the command-local directory `src/v11/application/metaReview/internal/submit/`.
2. A likely runtime-facing interface name is `runMetaReviewSubmitPipeline`, but the implementation may choose a clearer name if it returns the final submit result.
3. Avoid a broad class or service abstraction. A small typed function plus internal domain-tagged pipeline state is likely enough.
4. Keep pure validation/canonicalization functions small and internal. They can become a later public preview/dry-run interface only when there is a real product caller.
5. Do not expose a flat prepared-submit DTO to the runtime caller. If internal pipeline state is needed, prefer `acceptedSubmit`, `mutationContext`, `routingContext`, and `validationEvidence`.
6. After the refactor, remove the broad `shared/metaReview/metaReviewCommandSubmit*.ts` helper bridges. Do not retain exceptions in this task, and do not replace them with external imports to `shared/metaReview/internal/submit/**`.
7. Known current consumers include `tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts`; keep this target in scope when cleaning wrapper imports.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | preview/dry-run submit interface | L2 | P2 | later-hardening | possible UI/diagnostics need | add read-only command-local interface only when a concrete caller exists |
| H2 | unrelated meta-review public surface cleanup | L2 | P2 | later-hardening | shallow top-level shared re-export bridges outside the submit-specific surface | narrow or remove non-submit public bridges after the command-local pipeline lands |
| H3 | richer submit diagnostics taxonomy | L2 | P3 | later-hardening | fail-closed supportability | expose diagnostics through explicit command/UI surface, not through production submit side effects |

## Review Control

1. Review must check placement first: full workflow orchestration belongs in `application/metaReview`, not `shared/metaReview`.
2. Review must run closed-contract drift review for execution authority and canonical submit-result meaning against `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`.
3. Review must reject implementations that only move files without reducing caller knowledge of the submit call order.
4. Review must reject implementations that add public dry-run/preview surfaces without a concrete caller and tests.
5. Review must verify caller knowledge reduction with an import/call-site scan, not only by reading the new file layout.

## Assumptions

1. The production submit behavior is correct today and should be preserved unless an existing test proves otherwise.
2. The immediate architecture goal is depth and locality, not new product behavior.
3. Future preview/dry-run use cases are plausible but not current requirements.

## Open Questions

1. Should internal pipeline state carry `refs` under `routingContext`, or should refs remain raw runtime input passed only to routing?
2. Should `buildCanonicalSubmitRunResult` move into the new internal submit module, or remain in persistence as long as the runtime caller does not invoke it directly?
3. If deleting a `shared/metaReview/metaReviewCommandSubmit*.ts` wrapper appears impossible, which consumer creates the blocker, and should this task be refined before implementation continues?

## Spec Lock

This task is implementable after normal review. The implementation must preserve current runtime behavior and should be treated as a refactor unless tests reveal a pre-existing bug.
