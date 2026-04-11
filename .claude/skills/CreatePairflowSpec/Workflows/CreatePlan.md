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

### 1a) Run the Control-Model Readiness Gate

Use `references/Control-Model-Readiness-Gate.md` whenever the plan is implementation-oriented and any of these are true:
- a user-visible surface depends on multiple underlying sources,
- state/control truth differs from document/resource truth,
- missing data could create fallback ambiguity,
- authority/read-model cutover is in scope.

Try to extract:
1. `business_invariant`
2. `control_model`
3. `read_path_rule`
4. `forbidden_fallback`
5. `missing_data_rule`
6. `phase_boundary`

If these are not stable enough yet, stop and ask focused blocker questions before finalizing an implementation-ready phase split.

### 1b) Run the Complexity-Risk Gate

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
6. If the control-model gate revealed ambiguity, the first relevant phase should close the control model before route/UI/runtime delivery.

### 2) Draft from template

1. Use `Templates/plan-template.md`.
2. Fill objective, guiding principles/control model, phase breakdown, and task list from known data.
3. Reflect split rationale from the complexity-risk gate.

### 3) Gap-only questions

Ask only if blocker data is missing:
1. `artifact_id` and title
2. phase exit criteria
3. critical dependencies
4. split rationale only if it is genuinely ambiguous and changes the phase structure
5. control model / read-path / missing-data behavior if downstream tasks would otherwise be under-specified

### 4) Validate plan contract

1. `prd_ref` present when PRD exists.
2. Every phase has outputs and exit criteria.
3. Task list is actionable.
4. If the complexity-risk gate required split, the phase/task structure must reflect that split.
5. Foundation/refactor and runtime activation should not be merged into one phase when a hard-stop rule applies.
6. If authority/read-model/public-consume work is in scope, the plan must include explicit guiding principles or equivalent control-model language.
7. The plan must not jump to route/UI/runtime tasks before the control model is explicit.
8. Missing-data behavior must be explicit before surfacing/cutover phases are marked implementation-ready.

### 5) Finalize

1. Emit final markdown.
2. Add assumptions if values were inferred.
3. Include the complexity-risk/split rationale when it materially affects phase structure.
4. If the control-model gate forced clarification, say so in the summary instead of pretending the plan was fully derivable.

## Output

Final plan markdown and a brief change summary.
