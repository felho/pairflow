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

### 1a) Run the Control-Model Readiness Gate

Use `references/Control-Model-Readiness-Gate.md` whenever the PRD affects:
- user-visible reads,
- multiple truth sources,
- authority/source-of-truth changes,
- or missing-data behavior.

At minimum, try to extract:
1. `business_invariant`
2. `control_model`
3. `missing_data_rule`

If applicable, also extract:
4. `read_path_rule`
5. `forbidden_fallback`

If these are materially needed for the PRD but not recoverable from context, ask focused blocker questions before drafting implementation-oriented downstream structure.

### 2) Draft from template

1. Use `Templates/prd-template.md`.
2. Fill context, goal, scope, business invariants/control model when applicable, requirements, and acceptance criteria.

### 3) Gap-only questions

Ask only for blocker missing fields:
1. measurable goal or acceptance criteria
2. out-of-scope boundaries
3. rollout constraints
4. control-model ownership if the feature depends on multiple truths or read paths
5. missing-data behavior if it materially changes product behavior

### 4) Validate PRD quality

1. No contradiction between scope and acceptance criteria.
2. Requirements map to acceptance criteria.
3. Risks and rollout are explicit.
4. If authority/read-model/user-visible behavior is in scope, the PRD must not leave the control model ambiguous.
5. If missing-data handling matters, the PRD must not leave fail-closed vs fallback behavior implicit.

### 5) Finalize

1. Emit final markdown.
2. Keep wording concrete and testable.

## Output

Final PRD markdown and a short assumptions summary.
