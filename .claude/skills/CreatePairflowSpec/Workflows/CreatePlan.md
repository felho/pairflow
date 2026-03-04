# CreatePlan Workflow

Create or refine a Pairflow plan document from known context with minimal follow-up questions.

## Input

- `USER_REQUEST`
- `TARGET_PATH` (optional)
- `PRD_REF` (optional)

## Workflow

### 1) Context-first load

1. Read explicit refs from user.
2. If `TARGET_PATH` exists, use it as baseline.
3. Extract known phases, dependencies, validation needs.

### 2) Draft from template

1. Use `Templates/plan-template.md`.
2. Fill objective, phase breakdown, and task list from known data.

### 3) Gap-only questions

Ask only if blocker data is missing:
1. `artifact_id` and title
2. phase exit criteria
3. critical dependencies

### 4) Validate plan contract

1. `prd_ref` present when PRD exists.
2. Every phase has outputs and exit criteria.
3. Task list is actionable.

### 5) Finalize

1. Emit final markdown.
2. Add assumptions if values were inferred.

## Output

Final plan markdown and a brief change summary.
