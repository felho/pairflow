# CreatePRD Workflow

Create or refine a PRD with clear scope boundaries and measurable acceptance criteria.

## Input

- `USER_REQUEST`
- `TARGET_PATH` (optional)
- optional context docs

## Workflow

### 1) Context-first load

1. Read all provided references.
2. If `TARGET_PATH` exists, preserve good existing content.
3. Extract goal, constraints, and domain context.

### 2) Draft from template

1. Use `Templates/prd-template.md`.
2. Fill context, goal, scope, requirements, and acceptance criteria.

### 3) Gap-only questions

Ask only for blocker missing fields:
1. measurable goal or acceptance criteria
2. out-of-scope boundaries
3. rollout constraints

### 4) Validate PRD quality

1. No contradiction between scope and acceptance criteria.
2. Requirements map to acceptance criteria.
3. Risks and rollout are explicit.

### 5) Finalize

1. Emit final markdown.
2. Keep wording concrete and testable.

## Output

Final PRD markdown and a short assumptions summary.
