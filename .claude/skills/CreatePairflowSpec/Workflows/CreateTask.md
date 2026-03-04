# CreateTask Workflow

Create or refine a Pairflow task file using `L0 -> L1 -> L2`.

## Input

- `USER_REQUEST`: user goal and available context
- `TARGET_PATH`: optional task file path to refine
- `REFERENCES`: optional refs (`prd_ref`, `plan_ref`, context docs)

## Workflow

### 1) Gather context first

1. Read any explicit references from the user.
2. If `TARGET_PATH` exists, read and treat as baseline.
3. Extract known values before asking questions:
   - title, scope, refs, likely target files, constraints.

### 2) Build draft immediately

1. Generate a draft using `Templates/task-template.md`.
2. Fill as much as possible from known context.
3. Mark unknown required fields as `TODO_BLOCKER`.

### 3) Run blocker gap check

Required blockers for Task output:
1. `artifact_id`, `phase`, `target_files`
2. `L0`: goal, in-scope, out-of-scope, safety default
3. `L1`: call-site/entry points, data/interface contract, error/fallback, test matrix

If blockers exist, ask only focused questions for those blockers.

### 4) L0 pass

1. Confirm explicit in-scope and out-of-scope boundaries.
2. Confirm safety default behavior.
3. Keep this section short and policy-level.

### 5) L1 pass

Fill each section or mark `N/A`:
1. Call-site matrix
2. Data and interface contract
3. Side effects contract
4. Error and fallback contract
5. Dependency constraints
6. Test matrix (at least one golden path and one invalid case)

Rules:
1. `target_files` must align with call-site matrix.
2. Do not force all rows to `P1`.
3. `P0/P1` requires evidence (repro/failing output/code-path proof).

### 6) L2 pass

1. Capture optional implementation ideas only.
2. Tag as `later-hardening` by default.
3. Do not let L2 block implementability.

### 7) Finalize output

1. Emit final markdown document.
2. Include a short "Assumptions" block for inferred values.
3. Include a short "Open Questions" block only if non-blocking.

## Output

1. Final task markdown (save to `TARGET_PATH` or proposed path).
2. Short summary:
   - what was inferred,
   - what was asked,
   - what remains `later-hardening`.
