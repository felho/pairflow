# Plan-Task Metadata Contract

## Purpose

This document defines the minimum trustworthy metadata contract for `ExecutePairflowPlan` V1.

It closes only the metadata foundation:

1. plan sequencing metadata
2. task identity and lineage metadata
3. bubble linkage metadata
4. archive mapping metadata
5. deterministic precedence vs fail-closed disagreement handling

It does not define top-level orchestrator routing or bubble lifecycle behavior.

## Authority Split

| Surface | Canonical Authority | What It Owns | What It Must Not Own |
|---|---|---|---|
| Plan metadata | plan artifact | sequencing, next executable task order, minimal tracker summary, archive group | detailed task-local execution truth, bubble lifecycle truth |
| Task metadata | task artifact | task identity, local status, lineage, bubble linkage refs | plan-level sequencing truth, bubble lifecycle truth |
| Pairflow status | Pairflow | live bubble lifecycle state | plan/task sequencing or lineage truth |

Working rules:

1. `Plan = sequencing authority`
2. `Task = detailed local execution authority`
3. `Pairflow = bubble lifecycle authority`

## Representation Default

All fields used for machine routing, identity derivation, disagreement resolution, or archive mapping must live in frontmatter.

Body prose may:

1. explain the frontmatter
2. provide human notes
3. show worked examples

Body prose must not:

1. replace a missing required frontmatter key
2. redefine the meaning of a required frontmatter key
3. act as alternate routing truth when frontmatter is absent or conflicting

Non-authoritative future hints such as `next_action_hint` or `execution_notes` are optional extensions only. Their absence must not make an otherwise compliant artifact non-executable.

## Plan Metadata

### Required Plan Frontmatter

| Key | Type | Rule |
|---|---|---|
| `plan_id` | string | Stable canonical plan slug. Fresh plans should set this explicitly; legacy repair may derive it from the plan filename stem. |
| `plan_status` | string | High-level plan status only. Allowed values: `draft`, `under_review`, `approved`, `in_progress`, `done`. |
| `task_order` | string[] | Ordered list of canonical `task_id` values. This is the canonical sequencing list. |
| `task_tracker` | object[] | Minimal tracker summary keyed by canonical `task_id`. Each entry must follow the tracker contract below. |
| `active_task_id` | string or null | Canonical `task_id` currently active for execution. Must be non-null while open work remains. May be `null` only when `plan_status=done`. |
| `archive_group` | string | Canonical plan-group archive root name in the form `YYYY-MM-DD-<plan_id>`. |

### Optional Plan Frontmatter

| Key | Type | Rule |
|---|---|---|
| `last_completed_task_id` | string or null | Optional summary pointer for reporting convenience. |
| `notes` | string | Optional human note. Never routing authority. |

### Plan Tracker Entry Contract

Each `task_tracker` entry must contain the required keys below and may contain the optional `notes` field:

| Key | Type | Rule |
|---|---|---|
| `task_id` | string | Must exist in `task_order`. |
| `task_path` | string or null | Canonical task path when created, else `null` for `not_created`. |
| `status` | string | Allowed values: `not_created`, `draft`, `under_review`, `approved`, `in_progress`, `done`, `superseded`, `archived`. |
| `notes` | string | Optional short summary only. Never canonical authority over task-local state. |

Plan tracker interpretation rules:

1. `task_tracker` is a high-level summary, not a duplicate of task-local detailed state.
2. `not_created` is valid only in the plan tracker. It is forbidden in task metadata.
3. `task_order` and `active_task_id` are the canonical sequencing surfaces.
4. `task_tracker` may lag task-local detail, but it must not contradict plan sequencing once reconciled.
5. `blocked` is not part of the V1 plan-tracker status domain in this foundation slice.
6. If a legacy plan or external note implies a blocked state, `FixPlanMetadata` must fail closed to a human checkpoint instead of widening the tracker contract.

## Task Metadata

### Required Task Frontmatter

| Key | Type | Rule |
|---|---|---|
| `artifact_id` | string | Canonical artifact identifier for the task document. |
| `task_family_id` | string | Stable family slug for the logical slice. Shared by split siblings when appropriate. |
| `sequence_key` | string | Short sequencing label such as `1`, `1a`, `1b`, `2`. |
| `task_id` | string | Canonical executable task id derived as `<sequence_key>-<task_family_id>`. |
| `status` | string | Task-local status only. Allowed values: `draft`, `under_review`, `approved`, `in_progress`, `done`, `superseded`, `archived`. |
| `plan_ref` | string | Canonical path to the parent plan. |
| `doc_bubble_id` | string or null | Linkage only. Use the canonical derived id for fresh V1 runs, or persist the concrete compat id of a pre-contract bubble. |
| `impl_bubble_id` | string or null | Linkage only. Use the canonical derived id for fresh V1 runs, or persist the concrete compat id of a pre-contract bubble. |
| `supersedes` | string[] | Canonical task ids directly superseded by this task. Use `[]` when none. |
| `superseded_by` | string or null | Canonical successor task id when this task has been replaced. |

### Optional Task Frontmatter

| Key | Type | Rule |
|---|---|---|
| `archive_group` | string | Copy of the canonical plan archive group when needed for archive moves. |
| `archive_path` | string | Canonical archive destination after archive mapping is known. |
| `closed_at` | string | Optional terminal timestamp. Not routing authority. |

### Task Status Domain Rules

1. `status` in task metadata must never be `not_created`.
2. `status` in task metadata must never mirror Pairflow lifecycle states such as `CREATED`, `RUNNING`, `WAITING_HUMAN`, or `READY_FOR_HUMAN_APPROVAL`.
3. Bubble state remains external authority in Pairflow; task metadata stores only bubble linkage refs.
4. `superseded` means executable identity was replaced.
5. Repeated refinement alone does not cause `superseded`.
6. `archived` means the task file has moved to its canonical archive path.
7. `blocked` is intentionally out of scope for this V1 metadata foundation slice.
8. If a future workflow needs explicit blocked-state semantics, that must come from an upstream task/plan contract refinement rather than silent widening here.

## Identity Derivation

### Canonical Derivation Rules

1. `task_family_id` identifies the logical slice.
2. `sequence_key` identifies the concrete ordering or split branch.
3. `task_id` is derived mechanically as `<sequence_key>-<task_family_id>`.
4. Task filename is derived mechanically as `<task_id>.md`.
5. Document bubble id is derived mechanically as `<task_id>-doc`.
6. Implementation bubble id is derived mechanically as `<task_id>-impl`.
7. If a legacy bubble already exists with a different id, persist the real id as a compat linkage value, but treat the derived form as the forward-looking naming contract.

### Determinism Rules

1. `task_id` must be derivable without chat-history or operator-memory fallback.
2. If `task_family_id` or `sequence_key` is missing or ambiguous, the task is not execution-ready.
3. If two tasks would derive the same `task_id`, the conflict must be resolved by task/plan refinement before execution.
4. Filename-only identity is forbidden. The filename must follow from canonical metadata, not replace it.

### Planned-But-Not-Created Tasks

For a task that appears in plan sequencing but does not yet have a task file:

1. the canonical `task_id` must already be present explicitly in `task_order` or an existing tracker row
2. `task_path` must be `null`
3. tracker `status` may be only `not_created`
4. only the approved tracker domain may be used for a task that does not yet have a task file

Bootstrap compatibility rule:

1. `FixPlanMetadata` may preserve a planned-but-not-created task only when the plan already carries an explicit canonical `task_id`
2. if the plan body names only a human title, description, or non-canonical placeholder for that future task, bootstrap must fail closed instead of inventing a `task_id`

### Example

```yaml
task_family_id: billing-webhook
sequence_key: 1a
task_id: 1a-billing-webhook
doc_bubble_id: 1a-billing-webhook-doc
impl_bubble_id: 1a-billing-webhook-impl
```

Canonical task filename:

```text
1a-billing-webhook.md
```

## Archive and Lineage Rules

### Archive Group

1. The plan owns canonical `archive_group`.
2. `archive_group` format is `YYYY-MM-DD-<plan_id>`.
3. The date is the archive-group creation date, not the task creation date.

### Archive Path

Canonical archive shape:

```text
plans/archive/tasks/<archive_group>/<task_id>.md
```

Rules:

1. Completed tasks and superseded tasks use the same archive-group root.
2. `archive_path`, when persisted, must equal the canonical path above.
3. The task filename remains `<task_id>.md` after archive.
4. `archive_group` may be copied into task metadata, but the plan remains canonical for the group root.

### Lineage Rules

1. `supersedes` records the task ids that the current task replaces.
2. `superseded_by` records the direct successor task id when this task has been replaced.
3. A task becomes `superseded` only when its executable identity changes.
4. A task that is merely revised in place keeps the same `task_id` and is not `superseded`.
5. A superseded task may later become `archived`; the statuses are sequential, not simultaneous.

## Disagreement Handling

### Deterministic Precedence

Use deterministic precedence only when the conflict stays inside the declared authority split:

| Conflict | Canonical Winner | Action |
|---|---|---|
| plan sequencing fields vs task-local detail | plan for sequencing, task for detail | continue with the authoritative side; reconcile the lagging summary later |
| task-local status vs plan tracker summary for the same task | task | treat plan tracker as stale summary |
| bubble lifecycle inferred from task metadata vs Pairflow status | Pairflow | ignore mirrored lifecycle interpretation in task/plan metadata |
| missing optional task archive fields when `archive_group` + `task_id` already determine path | deterministic derivation | compute the canonical archive path mechanically |
| legacy material implies blocked state not represented in the approved V1 domains | fail-closed checkpoint | require explicit contract refinement instead of widening tracker or task status domains |

### Fail-Closed Cases

Stop at a human checkpoint when any of the following is true:

1. resolving the disagreement would change plan sequencing truth without a declared plan-side rule
2. task metadata implies a different next executable task than the plan declares
3. `task_id`, filename, or archive mapping cannot be derived deterministically
4. multiple plausible task identities or tracker orderings exist
5. a task attempts to store bubble lifecycle state as competing authority rather than linkage
6. a planned-but-not-created task has no explicit canonical `task_id`
7. a plan or task requires explicit blocked-state semantics not present in the approved V1 domains

Recommended reason codes:

1. `AUTHORITY_PRECEDENCE_APPLIED`
2. `CROSS_AUTHORITY_METADATA_CONFLICT`
3. `NON_DETERMINISTIC_TASK_IDENTITY`
4. `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`
5. `BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT`

## Minimum Trustworthy Examples

### Compliant Plan Snippet

```yaml
plan_id: execute-pairflow-plan
plan_status: in_progress
task_order:
  - 1-executeplan-metadata-foundation
  - 2-executeplan-orchestrator-skeleton
active_task_id: 1-executeplan-metadata-foundation
archive_group: 2026-04-28-execute-pairflow-plan
task_tracker:
  - task_id: 1-executeplan-metadata-foundation
    task_path: plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md
    status: in_progress
  - task_id: 2-executeplan-orchestrator-skeleton
    task_path: null
    status: not_created
```

### Compliant Task Snippet

```yaml
artifact_id: task_execute_pairflow_plan_metadata_foundation_v1
task_family_id: executeplan-metadata-foundation
sequence_key: "1"
task_id: 1-executeplan-metadata-foundation
status: in_progress
plan_ref: plans/execute-pairflow-plan-plan-v1.md
doc_bubble_id: null
impl_bubble_id: 1-executeplan-metadata-foundation-impl
supersedes: []
superseded_by: null
archive_group: 2026-04-28-execute-pairflow-plan
```
