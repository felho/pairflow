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

### 1a) Run the Complexity-Risk Gate

Use `references/Complexity-Risk-Gate.md` when the plan is implementation-oriented.

1. Score:
   - `authority_risk`
   - `surface_spread`
   - `identity_join_risk`
   - `activation_coupling`
   - `prerequisite_risk`
   - `acceptance_multiplicity`
2. If the score is `5+`, the plan should prefer explicit phase split over a single broad implementation slice.
3. If the score is `8+` or a hard-stop applies, the plan should explicitly separate:
   - `foundation/refactor`
   - `delivery`
   - `activation/rollout`
4. If future milestone-gated behavior is involved, the plan may capture contract/design now, but activation should remain in a later phase.
5. If `identity_join_risk >= 1`, the plan should isolate the authority/read-model seam before UI or payload cutover whenever feasible.

### 2) Draft from template

1. Use `Templates/plan-template.md`.
2. Fill objective, phase breakdown, and task list from known data.
3. Reflect split rationale from the complexity-risk gate.

### 3) Gap-only questions

Ask only if blocker data is missing:
1. `artifact_id` and title
2. phase exit criteria
3. critical dependencies
4. split rationale only if it is genuinely ambiguous and changes the phase structure

### 4) Validate plan contract

1. `prd_ref` present when PRD exists.
2. Every phase has outputs and exit criteria.
3. Task list is actionable.
4. If the complexity-risk gate required split, the phase/task structure must reflect that split.
5. Foundation/refactor and runtime activation should not be merged into one phase when a hard-stop rule applies.

### 5) Finalize

1. Emit final markdown.
2. Add assumptions if values were inferred.
3. Include the complexity-risk/split rationale when it materially affects phase structure.

## Output

Final plan markdown and a brief change summary.
