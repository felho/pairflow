# Refactoring Guidance Pilot: Meta-Review Submit Pipeline

Status: pilot
Date: 2026-05-10
Guidance: `docs/architecture/refactoring-guidance.md`
Candidate task: `plans/archive/tasks/refactoring/meta-review-submit-command-local-pipeline.md`

## Purpose

Dogfood the Refactoring Guidance before changing `CreatePairflowSpec`.

This pilot manually applies the Module Depth Check to a real
Boundary/Architecture refactor candidate and records whether the checklist
produces useful task-shaping decisions.

## Source Note

The candidate task is archived under the refactoring task archive. This pilot
uses that archived task as the concrete Boundary/Architecture refactor
candidate:

- introduce `application/metaReview/internal/submit/**`,
- move production submit sequencing behind one runtime-facing command-local
  interface,
- remove submit-specific `shared/metaReview/metaReviewCommandSubmit*.ts`
  wrapper files,
- preserve current execution authority, validation, parity, canonicalization,
  persistence, route recovery, and finalization behavior,
- shift production behavior coverage toward the new command-local pipeline
  interface.

If the archived task changes before implementation, refresh this pilot against
that updated archive entry.

## Classification

Class: Boundary/Architecture Refactor.

Triggered by:

- changes command orchestration and pipeline sequencing,
- changes state persistence and route-finalization ordering ownership,
- changes authority, validation, and canonicalization flow placement,
- removes or reshapes public submit helper exports,
- introduces a new command-local module root,
- changes expected test shape from helper-level sequencing toward pipeline-level
  coverage.

This is not Mechanical or Local Cleanup. The task changes which module owns the
submit workflow and what callers must know to execute it correctly.

## Module Depth Check

### 1. Deletion Test

If the new submit pipeline were deleted, `submitMetaReviewResult` and nearby
callers would again need to know the production ordering:

- resolve bubble and load state,
- validate meta-review submitter authority,
- validate stale guards and round/fingerprint guards,
- validate payload shape,
- resolve canonical run id and report JSON,
- enforce reviewer parity and approve-threshold policy,
- write canonical submit state safely,
- build the route-ready canonical run result,
- validate rework findings artifact parity,
- recover the meta-review gate route,
- construct the final submit result.

Deleting the pipeline would force caller-side orchestration to reconstruct this
ordering and its invariants. That means the module earns its keep if it hides
that ordering behind one runtime-facing interface.

### 2. Caller Knowledge Removed

The runtime caller should stop knowing the production submit order. It should
own only:

- input handoff,
- dependency handoff,
- receiving the final submit result.

It should not manually sequence authority checks, validation, canonicalization,
persistence, artifact parity, route recovery, or route-ready run-result
construction.

### 3. Public Interface

Target interface shape:

```ts
const result = await runMetaReviewSubmitPipeline(input, dependencies);
```

The exact function name may differ, but the runtime-facing interface should
return the final command result or equivalent command-level result. It should not
return a broad prepared-submit DTO for the runtime caller to interpret step by
step.

### 4. Behavior Moved Behind The Module

The command-local pipeline should own:

- execution authority and stale guard checks,
- submit payload validation,
- summary/report/recommendation parity,
- canonical run id and canonical report JSON resolution,
- approve-threshold policy coordination,
- canonical submit state write,
- conflict refresh and stale guard recheck,
- canonical run-result construction,
- rework findings artifact parity,
- route recovery,
- final submit result construction.

Lower-level helpers may remain only when they own independent shared policy.
Helpers used only by the production submit workflow should move under
`application/metaReview/internal/submit/**`.

### 5. Test Shape

Desired test shape:

- production submit behavior is covered through the command-local pipeline,
- helper tests remain only for independent policy such as canonical run-id
  resolution or payload invariant logic,
- tests do not replace removed wrapper imports with direct imports into
  `shared/metaReview/internal/submit/**`,
- import scans verify no production/test consumers target removed
  `shared/metaReview/metaReviewCommandSubmit*.ts` wrappers.

If tests still need to reconstruct the production submit order by calling the
same helper sequence, the refactor remains shallow.

### 6. Public Helpers Or Wrappers

Submit-specific public wrapper files should be removed rather than retained as
transitional public surface:

- `shared/metaReview/metaReviewCommandSubmitAuthority.ts`,
- `shared/metaReview/metaReviewCommandSubmitValidation.ts`,
- `shared/metaReview/metaReviewCommandSubmitParity.ts`,
- `shared/metaReview/metaReviewCommandSubmitLink.ts`.

If any low-level submit helper truly remains shared, it needs a deliberate
non-wrapper public policy surface with stable contract meaning. Otherwise it
should become command-local implementation.

## Guidance Findings

What the check clarified:

- A preparation-only function is not deep enough if the runtime still sequences
  persistence, canonical run-result construction, artifact parity, routing, and
  finalization.
- A broad prepared-submit object can leak implementation if the runtime caller
  still interprets it step by step.
- Wrapper removal must be paired with import-scan evidence; otherwise callers may
  migrate to direct `internal/**` imports.
- Test shape is the strongest objective canary: pipeline-level coverage should
  replace production-order reconstruction through helpers.
- `ReviewSpec` enforcement should lag behind `CreateTask` dogfooding because it
  can affect already-authored tasks.

Guidance updates suggested by this pilot:

- Keep the Module Depth Check's test-shape question mandatory for
  Boundary/Architecture refactors.
- In `CreatePairflowSpec`, add the Module Depth Check during `CreateTask`
  before adding stricter `ReviewSpec` verification.
- Keep the AGENTS trigger fast-path small, but include public exports,
  cross-layer placement, command/state/persistence ordering, and
  authority/validation/canonicalization flow as fast-path blockers.

## Pilot Result

The checklist is usable for this candidate. It catches the main shallow-refactor
failure modes before implementation:

- moving files without reducing runtime caller knowledge,
- stopping at a preparation helper instead of a production submit pipeline,
- retaining wrapper files over internal helpers,
- keeping tests coupled to helper sequencing instead of the caller-facing
  interface.

The next action should be to use this pilot when drafting the durable
`CreatePairflowSpec` changes for refactor task creation.

## A5b CreateTask Gate Dogfood

This section dogfoods the drafted `CreatePairflowSpec` `CreateTask` changes
against the same candidate after the new `Refactoring-Guidance-Gate` and
task-template placeholders were added.

### Gate Trigger

The new gate would fire for this candidate from both routes:

- requested work is a refactor,
- target-file reality touches command orchestration, state/persistence ordering,
  authority and validation flow, canonicalization order, public helper exports,
  a new command-local module root, and test import shape.

### L0 Refactor Classification Fit

The shortened L0 `Refactor Classification` section is enough:

1. Classification: `boundary_architecture`.
2. Classification triggers:
   - command orchestration and pipeline sequencing,
   - state/persistence and route-finalization ordering ownership,
   - authority, validation, and canonicalization flow placement,
   - public submit-helper export removal,
   - new command-local module root,
   - test-shape shift from helper sequencing to pipeline coverage.
3. Preparatory modifier: `no`; this task is not only preparing a later
   refactor. It directly moves the production submit order behind the
   command-local pipeline.

This confirms the template split is right: L0 records the classification
decision, while L1 carries the full depth proof.

### L1 Module Depth Fit

The new L1 `0d) Refactor Classification and Module Depth Check` table can be
filled from the pilot without inventing extra decisions:

| Item | Dogfood Answer |
|---|---|
| Refactor classification | `boundary_architecture` |
| Trigger reasons / fast path | Same triggers as L0; no mechanical fast path. |
| Deletion test: no caller-knowledge increase | `N/A`; deleting the pipeline would increase caller knowledge. |
| Deletion test: caller-knowledge returns | The caller would need to reconstruct authority checks, stale guards, payload validation, canonical run/report identity, parity checks, persistence, route recovery, and final result construction. |
| Caller knowledge removed | Runtime caller stops knowing production submit order and only hands input/dependencies to one pipeline. |
| Public interface change | Runtime-facing interface becomes one command-local pipeline result instead of a broad preparation/helper sequence. |
| Behavior hidden behind module | Authority, validation, canonicalization, persistence ordering, artifact parity, route recovery, and finalization sequencing. |
| Test shape | Production submit behavior should be covered through the command-local pipeline; helper tests remain only for independent policy. |
| Public helpers/wrappers | Submit-specific `shared/metaReview/metaReviewCommandSubmit*.ts` wrappers are removed; retained shared helpers require deliberate non-wrapper policy surface. |

### Dogfood Finding

The A5b wording is usable for this candidate. It avoids the earlier duplicate
L0/L1 classification problem:

- L0 is a small classification summary,
- L1 is the evidence-bearing Module Depth Check,
- target-file reality remains the input for classification,
- no `ReviewSpec` enforcement is needed yet to produce a better task shape.

The next workflow change can be A5c, but it should be scoped to verification of
the same fields rather than re-specifying the policy.
