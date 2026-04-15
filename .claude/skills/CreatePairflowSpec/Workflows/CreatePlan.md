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
4. Extract likely authority producers, persisted authority artifacts, and consumer families when the scope touches authority/read-model/runtime work.
5. Extract any current baseline runtime/canonicalization behaviors that downstream tasks may accidentally remove unless the plan makes preservation or replacement explicit.

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
5. `allowed_resolution_path`
6. `missing_data_rule`
7. `phase_boundary`:
   - `contract_closure`
   - `producer_closure`
   - `internal_execution_closure`
   - `workflow_orchestration_closure`
   - `read_model_closure`
   - `activation_closure`
   - `cleanup_recovery_closure`

If these are not stable enough yet, stop and ask focused blocker questions before finalizing an implementation-ready phase split.
If the plan refines an existing runtime path, also classify whether the baseline behavior is preserved, intentionally replaced, or explicitly forbidden.

### 1b) Run the Authority Fan-out Scan

Run this scan whenever:
- `authority_risk >= 1`
- `identity_join_risk >= 1`
- a shared interface/result shape is changing
- a canonical authority is consumed by multiple surfaces or roles

Inventory the relevant generic authority buckets, either with these names or with an explicitly mapped project-local equivalent:
1. `authority_producer`
2. `persisted_authority`
3. `internal_execution_consumers`
4. `workflow_orchestration_consumers`
5. `read_model_consumers`
6. `cleanup_recovery_consumers`

Bucket intent:
1. `internal_execution_consumers`: runtime/execution paths.
2. `workflow_orchestration_consumers`: orchestration, routing, state-machine, or decision-flow paths.
3. `read_model_consumers`: projections, reports, UI/API reads, or other consumer-facing views.
4. `cleanup_recovery_consumers`: cleanup, rollback, migration, teardown, or recovery paths.

Policy:
1. If three or more consume families appear, producer-first sequencing is mandatory.
2. In that case, do not stop at `foundation/refactor -> delivery -> activation` if it still mixes producer and consumer-family closure.
3. Prefer a phase split that reflects the actual authority path:
   - persisted authority (if needed)
   - producer
   - consumer-family alignment
   - activation
   - read-model
   - cleanup/rollout
4. Treat the list above as split vocabulary, not a mandatory phase count.
5. Collapse adjacent closures when they are owned by the same bounded change and do not introduce a distinct compatibility/read-model risk.
6. Prefer the smallest safe phase count that still keeps producer closure separate from the consumer-family closures that actually need separation.
7. The final plan may rename these buckets into domain-local terminology, but the mapping back to the generic categories must stay explicit.

### 1c) Run the Complexity-Risk Gate

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
7. If the authority fan-out scan reveals three or more consume families, the plan should include an explicit `Phase Ownership Grid` and separate producer closure from consumer-family closure where that boundary is real.
8. The plan should avoid generating extra phases just to mirror the fan-out vocabulary; merged phases are acceptable when the ownership and compatibility boundary is genuinely shared.

### 1d) Run the Closure-Budget Gate

Run this gate when the plan touches authority/runtime/read-model/shared-contract work.

Count whether the plan would otherwise keep these in one bounded phase/task:
1. `authority_producer`
2. `shared_contract`
3. `internal_execution_consumers`
4. `workflow_orchestration_consumers`
5. `read_model_consumers`
6. `persisted_authority_or_schema`
7. `cleanup_recovery_consumers`

Policy:
1. If `authority_producer` + `shared_contract` + any two consumer buckets appear together, the plan must not collapse them into one bounded implementation slice by default.
2. If `persisted_authority_or_schema` changes in the same slice as `shared_contract` and two or more consumer buckets, the plan must split producer closure from downstream fallout.
3. If the same slice would close producer boundary, shared contract alignment, and status/CLI/read-model fallout together, treat that as a sequencing failure candidate and re-sequence before finalizing the plan.
4. Collapsing adjacent closures is allowed only when the plan states why the ownership, compatibility risk, and diagnostics fallout are genuinely shared.
5. If that proof is weak or implicit, prefer a safer split now rather than relying on later task refinement.

### 1e) Run the Bounded-Task-Shape Gate

Use `references/Bounded-Task-Shape-Gate.md`.

For each candidate phase, classify the primary task shape:
1. `contract_or_persisted_authority_foundation`
2. `authority_producer`
3. `consumer_family_alignment`
4. `fail_closed_hardening`
5. `coordination_concurrency_hardening`
6. `activation_or_read_model`

Policy:
1. Default each phase to one primary shape.
2. If a phase mixes `authority_producer` with `fail_closed_hardening` or `coordination_concurrency_hardening`, split by default unless the same bounded change truly closes them with the same invariants and no separate risk.
3. If a phase adds lock/mutex/lease/idempotency/serialization behavior, treat that as coordination scope even when the feature request is phrased as write-path work.
4. If a phase adds rollback/retry/cleanup/shared-state-preservation behavior, treat that as fail-closed hardening scope even when the feature request is phrased as write-path work.
5. If a phase changes precondition ordering relative to side effects, record that explicitly in the plan and do not hide it inside a generic delivery phase.
6. If the phase shape is ambiguous, stop and re-sequence before finalizing the plan.

### 2) Draft from template

1. Use `Templates/plan-template.md`.
2. Fill objective, guiding principles/control model, phase breakdown, and task list from known data.
3. Reflect split rationale from the complexity-risk gate and the authority fan-out scan.
4. Include a `Phase Ownership Grid` when authority/read-model/multi-consumer work is in scope.
5. Include `Baseline Preservation Notes` when the plan touches an existing canonicalization, finalize, or reconciliation path that later tasks might otherwise "tighten" into a regression.
6. Include closure-budget rationale when the scope would otherwise risk collapsing producer, contract, and multi-family consumer fallout into one slice.
7. Include `Mutation / Precondition Boundaries` when the plan touches an existing mutation flow or introduces coordination primitives.
8. Record the primary task shape per phase in the `Phase Ownership Grid`.

### 3) Gap-only questions

Ask only if blocker data is missing:
1. `artifact_id` and title
2. phase exit criteria
3. critical dependencies
4. split rationale only if it is genuinely ambiguous and changes the phase structure
5. control model / read-path / missing-data behavior if downstream tasks would otherwise be under-specified
6. authority producer / consume-family ownership if the phase structure depends on it

### 4) Validate plan contract

1. `prd_ref` present when PRD exists.
2. Every phase has outputs and exit criteria.
3. Task list is actionable.
4. If the complexity-risk gate required split, the phase/task structure must reflect that split.
5. Foundation/refactor and runtime activation should not be merged into one phase when a hard-stop rule applies.
6. If authority/read-model/multi-consumer work is in scope, the plan must include explicit guiding principles or equivalent control-model language.
7. The plan must not jump to route/UI/runtime tasks before the control model is explicit.
8. Missing-data behavior must be explicit before surfacing/cutover phases are marked implementation-ready.
9. If authority/read-model/multi-consumer work is in scope, the plan must include an explicit authority fan-out inventory or equivalent.
10. If a shared contract is changing, the plan must say whether compatibility is additive or whether a dedicated alignment task is required.
11. If three or more consume families are affected by the same authority, the plan must not collapse them into a single producer task unless there is explicit evidence that the consume surfaces are truly inseparable.
12. The plan must also not explode them into separate phases without evidence; if two closures share ownership and risk profile, the plan should merge them.
13. If the scope refines an existing runtime/canonicalization path, the plan must say whether baseline behavior is preserved, intentionally replaced, or explicitly forbidden.
14. If baseline behavior is removed, the plan must identify the replacement mechanism and the proof expected from downstream validation.
15. If authority/runtime/read-model/shared-contract work is in scope, the plan must record closure-budget triage:
   - closure buckets touched,
   - which closures are intentionally collapsed,
   - why that collapse is safe,
   - which closures are deferred into later phases/tasks.
16. If the plan touches an existing mutation flow, it must record the precondition-before-side-effect rule and the invalid-input side-effect expectation.
17. If the plan introduces coordination primitives, rollback/retry, or shared-state-preservation work, the phase split must make that ownership explicit rather than hiding it in a generic delivery phase.

### 5) Finalize

1. Emit final markdown.
2. Add assumptions if values were inferred.
3. Include the complexity-risk/split rationale when it materially affects phase structure.
4. If the control-model gate forced clarification, say so in the summary instead of pretending the plan was fully derivable.
5. If the authority fan-out scan changed the sequencing shape, say so explicitly in the summary.

## Output

Final plan markdown and a brief change summary.
