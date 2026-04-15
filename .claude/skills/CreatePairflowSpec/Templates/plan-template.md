---
artifact_type: plan
artifact_id: plan_<feature>_v1
title: "<Feature Plan>"
status: draft
prd_ref: docs/prd/<feature>-prd.md
owners:
  - "<owner>"
---

# Plan: <Feature Name>

## Objective

<What this plan delivers and what success means.>

## Guiding Principles

1. Business invariant: <What must remain true from the business/domain perspective.>
2. Control model: <Which source decides whether something should exist, happen, or be shown.>
3. Read-path rule: <Where the system may read the thing from. If N/A, say N/A.>
4. Forbidden fallback: <Which tempting alternative sources must not be used. If N/A, say N/A.>
5. Allowed resolution path: <Which deterministic same-authority resolution/reconciliation paths are allowed. If N/A, say N/A.>
6. Missing-data rule: <What happens if the thing is expected but missing.>
7. Phase boundary note:
   - contract closure: <phase>
   - producer closure: <phase>
   - internal execution closure: <phase>
   - workflow/orchestration closure: <phase>
   - read-model closure: <phase>
   - activation closure: <phase>
   - cleanup/recovery closure: <phase>

## Baseline Preservation Notes

Include this section when the plan refines or replaces an existing canonicalization, finalize, or reconciliation path. Otherwise say `N/A`.

1. Preserved baseline behaviors: <List or `N/A`.>
2. Intentionally replaced behaviors: <List or `N/A`.>
3. Replacement proof expected from downstream tasks/evidence: <List or `N/A`.>

## Authority Fan-out Scan

1. Authority producer: <What produces canonical authority. If N/A, say N/A.>
2. Persisted authority: <What persists authority. If N/A, say N/A.>
3. Internal execution consumers: <List or N/A.>
4. Workflow/orchestration consumers: <List or N/A.>
5. Read-model consumers: <List or N/A.>
6. Cleanup/recovery consumers: <List or N/A.>
7. Collapse notes: <Which adjacent closures are intentionally merged, and why that is safe. If N/A, say N/A.>

## Mutation / Precondition Boundaries

Include this section when the plan touches an existing mutation flow or introduces coordination primitives. Otherwise say `N/A`.

1. Precondition-before-side-effect rule: <What must be validated before any artifact write, lock creation, namespace creation, network call, or other mutation.>
2. Invalid/precondition-failure side-effect expectation: <Usually zero side effects; if not, state the bounded allowed side effects explicitly.>
3. Coordination primitives by phase: <Which phase owns locks/mutexes/leases/idempotency/serialization, or `N/A`.>
4. Fail-closed hardening by phase: <Which phase owns rollback/retry/cleanup/shared-state-preservation, or `N/A`.>

## Complexity / Split Rationale

1. `risk_score`: `<0-12>`
2. Why a plan is needed:
   - `<boundary risk / contract override / prerequisite / phase split>`
3. Split decision:
   - `<minimum viable split for this scope; may be 3, 4, 5, or more phases/tasks>`
4. Milestone-gated behavior to defer:
   - `<text or N/A>`
5. Closure-budget triage:
   - closure buckets touched: `<list or N/A>`
   - intentionally collapsed closures: `<list + why safe, or N/A>`
   - explicitly deferred closures: `<list or N/A>`

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | <text> | <text> | <text> | <text> |

## Phase Ownership Grid

| Phase | Dominant Boundary | Primary Task Shape | Produced Authority | Consuming Surfaces | Forbidden Co-mingling |
|---|---|---|---|---|---|
| Phase 1 | <producer|consumer|activation|cleanup> | <one primary shape from the bounded-task-shape gate> | <text or N/A> | <text> | <what must not be mixed here> |

## Task List

1. `plans/tasks/<feature>/phase1-<slug>.md`
2. `plans/tasks/<feature>/phase2-<slug>.md`

## Dependencies

1. <dependency>

## Risks and Mitigations

1. <risk> - <mitigation>

## Validation Strategy

1. <tests/checks/evidence strategy>
