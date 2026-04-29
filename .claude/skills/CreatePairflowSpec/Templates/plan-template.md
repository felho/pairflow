---
artifact_type: plan
artifact_id: plan_<feature>_v1
plan_id: <stable-plan-slug>
created_on: "<YYYY-MM-DD>"
title: "<Feature Plan>"
status: draft
plan_status: draft
prd_ref: docs/prd/<feature>-prd.md
owners:
  - "<owner>"
task_order:
  - <task-id>
active_task_id: <task-id-or-null>
archive_group: <created_on>-<plan_id>
task_tracker:
  - task_id: <task-id>
    task_path: null
    status: not_created
---

# Plan: <Feature Name>

## Objective

<What this plan delivers and what success means.>

## Done Definition

1. <What must be true when the plan is complete.>
2. <What evidence or behavior proves completion.>

## Guiding Principles

1. Business invariant: <What must remain true from the business/domain perspective.>
2. Control model: <Which source decides whether something should exist, happen, or be shown.>
3. Read-path rule: <Where the system may read the thing from. If N/A, say N/A.>
4. Forbidden fallback: <Which tempting alternative sources must not be used. If N/A, say N/A.>
5. Allowed resolution path: <Which deterministic same-authority resolution/reconciliation paths are allowed. If N/A, say N/A.>
6. Missing-data rule: <What happens if the thing is expected but missing.>
7. Sequencing / boundary note:
   - producer-first rule: <text or `N/A`>
   - downstream consume families that remain separate: <text or `N/A`>
   - cleanup/recovery timing: <included now | deferred | `N/A`>

## Canonical Contract Anchors (Optional)

Use this section when the plan refines wording for an already-closed authority/shared/read-model contract. Otherwise say `N/A`.

1. Source-of-truth anchors: <repo-local docs/code/tests or `N/A`>
2. Closed canonical elements / terms: <list or `N/A`>
3. Explicitly authorized reinterpretation (if any): <text or `N/A`>
4. Downstream task impact: <which tasks inherit this wording and whether they need refinement, or `N/A`>

## Current Status

### Completed Work

1. <completed item or `N/A`>

### Open Work

1. <open gap or `N/A`>

### Deferred / Future Work

1. <deferred item or `N/A`>

## Progress / Phase Summary (Optional)

Use only when progress tracking benefits from phase grouping. Otherwise say `N/A`.

1. <phase or progress note>

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `<task-id>` | `null` or `plans/tasks/<feature>/<task-id>.md` | <why this task exists> | <task/ref or `N/A`> | <plan-level gap> | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| <gap> | <task(s)> | <notes or `N/A`> |

## Dependencies and Order

1. <dependency/order rule>

## Risks and Assumptions

1. <risk or assumption>

## Validation Strategy

1. <tests/checks/evidence strategy>
