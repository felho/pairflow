---
description: Bootstrap or repair minimum trustworthy plan metadata before normal ExecutePairflowPlan orchestration begins
argument-hint: <plan-path>
allowed-tools: Read, Edit, Bash
---

# Fix Plan Metadata

## Purpose

Repair a legacy or incomplete plan so `ExecutePairflowPlan` can safely start from explicit metadata instead of hidden operator state.

This workflow owns only:

1. bootstrap trigger detection
2. mechanical metadata repair to the minimum trustworthy plan shape
3. fail-closed exit when trustworthy repair is not possible

This workflow does not own:

1. normal next-workflow routing
2. bubble creation or lifecycle handling
3. task review or task execution

## Variables

PLAN_PATH: required path to the plan artifact
PLAN_DOC: contents of `PLAN_PATH`
TASK_REFERENCES: task paths or task ids referenced by the plan, when present

## Entry Conditions

Run this workflow before any normal execution routing when one or more required plan metadata fields are missing, malformed, or non-trustworthy:

1. `plan_id`
2. `plan_status`
3. `task_order`
4. `task_tracker`
5. `active_task_id`
6. `archive_group`

Also enter this workflow when:

1. `task_order` references non-canonical or duplicate task ids
2. tracker rows cannot be matched to canonical task ids
3. routing-relevant values appear only in body prose and not in frontmatter
4. legacy material requires explicit blocked-state semantics that are not part of the approved V1 metadata domains

If the plan already satisfies the contract, stop immediately and return it unchanged.

## Repair Rules

### 1. Load authoritative context

1. Read `PLAN_PATH`.
2. Read the metadata contract in `references/Plan-Task-Metadata-Contract.md`.
3. Inspect plan task tables, explicit task paths, and referenced task files only as needed to reconstruct required plan metadata.
4. Do not infer sequencing primarily from chat history, filename order without plan support, or operator memory.

### 2. Derive the minimum required fields mechanically

Apply the first trustworthy source in this order:

#### `plan_id`

1. existing valid frontmatter value
2. deterministic slug from the plan filename stem

#### `task_order`

1. existing valid frontmatter list of canonical `task_id` values
2. existing valid tracker rows that already carry canonical `task_id` values, preserving tracker order
3. ordered task list explicitly present in the plan body, but only when each entry already contains an explicit canonical `task_id`
4. ordered task paths explicitly referenced by the plan, converted through each task's frontmatter

If canonical task ids cannot be reconstructed uniquely, fail closed.

For planned-but-not-created tasks:

1. bootstrap may preserve them only when the plan already carries an explicit canonical `task_id`
2. if such a task has no file yet, keep `task_path: null` and force tracker `status: not_created`
3. never invent `task_id` from a human-readable title, prose-only description, or implicit filename guess
4. if the plan lists a future task without an explicit canonical `task_id`, fail closed with `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`

#### `task_tracker`

Create one tracker entry per `task_id` in `task_order` with:

1. `task_id`
2. `task_path` when known, else `null`
3. high-level status in the allowed tracker domain
4. optional short `notes`

Status derivation order:

1. existing trustworthy tracker value
2. referenced task file frontmatter when it exists
3. explicit plan-body state that maps cleanly into the tracker status domain
4. default `not_created` only when the task file does not exist yet

Blocked-state rule:

1. `blocked` is not part of the approved V1 plan-tracker status domain for this foundation slice
2. do not normalize, preserve, or invent a `blocked` tracker row during bootstrap
3. if legacy material claims a blocked task or blocked plan state, fail closed with a human checkpoint instead of widening the metadata contract

#### `active_task_id`

1. existing trustworthy frontmatter value when it matches `task_order` and current tracker state
2. otherwise the first task in `task_order` whose tracker status is not terminal (`done`, `superseded`, `archived`)
3. `null` only when every tracker entry is terminal and `plan_status=done`

#### `archive_group`

1. existing valid frontmatter value
2. bootstrap-created value `YYYY-MM-DD-<plan_id>` using the date on which the archive group is first established

#### `plan_status`

1. existing valid frontmatter value when it does not contradict the repaired tracker
2. `done` when every tracker entry is terminal
3. `in_progress` when any tracker entry is `in_progress`, `done`, `superseded`, or `archived` and open work still remains
4. `approved` when the plan is execution-ready and the next task exists but no execution has started yet
5. `under_review` or `draft` only when the plan artifact itself clearly remains in that phase

### 3. Enforce frontmatter-first output

After repair:

1. every required routing key must exist in frontmatter
2. body prose may explain the repair but may not be the only source of required values
3. optional hints such as `next_action_hint` remain non-authoritative and are not required for readiness

## Minimum Repaired Output Shape

The repaired plan must contain, at minimum:

```yaml
plan_id: <canonical-plan-slug>
plan_status: <draft|under_review|approved|in_progress|done>
task_order:
  - <task-id>
active_task_id: <task-id-or-null>
archive_group: <YYYY-MM-DD-plan-id>
task_tracker:
  - task_id: <task-id>
    task_path: <path-or-null>
    status: <not_created|draft|under_review|approved|in_progress|done|superseded|archived>
```

Example bootstrap result:

```yaml
plan_id: execute-pairflow-plan
plan_status: approved
task_order:
  - 1-executeplan-metadata-foundation
  - 2-executeplan-orchestrator-skeleton
active_task_id: 1-executeplan-metadata-foundation
archive_group: 2026-04-28-execute-pairflow-plan
task_tracker:
  - task_id: 1-executeplan-metadata-foundation
    task_path: plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md
    status: approved
  - task_id: 2-executeplan-orchestrator-skeleton
    task_path: null
    status: not_created
```

## Fail-Closed Exit

Stop and route to a human checkpoint instead of inventing metadata when any of the following is true:

1. the plan does not contain a trustworthy ordered task list
2. referenced tasks do not yield unique canonical `task_id` values
3. `active_task_id` remains ambiguous after tracker repair
4. the plan body and task artifacts imply conflicting sequencing truths
5. archive group or task identity would require non-deterministic naming
6. required source anchors are missing from the repo
7. a planned-but-not-created task lacks an explicit canonical `task_id`
8. legacy material requires explicit blocked-state semantics outside the approved V1 domains

Recommended reason codes:

1. `PLAN_METADATA_BOOTSTRAP_REQUIRED`
2. `CROSS_AUTHORITY_METADATA_CONFLICT`
3. `NON_DETERMINISTIC_TASK_IDENTITY`
4. `CONTEXT_SOURCE_MISSING`
5. `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`
6. `BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT`

## Output Contract

Return exactly one of:

1. repaired plan metadata that now satisfies the minimum contract
2. a fail-closed human checkpoint explaining why trustworthy repair was not possible

Do not continue into normal orchestration from this workflow. That decision belongs to the caller after repaired metadata is available.
