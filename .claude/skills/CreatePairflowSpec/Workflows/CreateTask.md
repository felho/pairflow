# CreateTask Workflow

Create or refine a Pairflow task file using `L0 -> L1 -> L2`.

## Input

- `USER_REQUEST`: user goal and available context
- `TARGET_PATH`: optional task file path to refine
- `REFERENCES`: optional refs (`prd_ref`, `plan_ref`, context docs)

## Workflow

### 0) Classify work type and artifact policy

1. Classify request as one of:
   - `bugfix`
   - `docs-only`
   - `small feature`
   - `large feature`
   - `new app / greenfield`
2. Check contract-boundary override triggers:
   - DB schema contract changes (migration/new table/column/index/constraint)
   - API/interface contract changes
   - event payload contract changes
   - auth/permission contract changes
   - config/env contract changes
3. Determine minimum artifact chain:
   - `bugfix|docs-only|small feature` without contract-boundary override: task-only valid, `prd_ref`/`plan_ref` may be `null`.
   - any work type with contract-boundary override: require `Plan -> Task` (`plan_ref` mandatory).
   - `large feature|new app`: require `PRD -> Plan -> Task`.
4. If required refs are missing:
   - ask a focused blocker question for missing refs, or
   - route to `CreatePRD`/`CreatePlan` first.

### 1) Gather context first

1. Read any explicit references from the user.
2. If `TARGET_PATH` exists, read and treat as baseline.
3. Extract known values before asking questions:
   - title, scope, refs, likely target files, constraints.
4. Extract likely:
   - canonical source-of-truth candidates,
   - business invariant and control model,
   - allowed read-path and missing-data rule,
   - allowed deterministic resolution paths inside the same authority chain,
   - forbidden fallback sources,
   - existing baseline canonicalization/finalize/reconciliation paths that may need preservation,
   - affected surfaces,
   - authority producer and consumer families,
   - shared contract consumers and compatibility risk,
   - prerequisite milestones,
   - distinct acceptance goals.

### 1a) Run the Control-Model Readiness Gate

Use `references/Control-Model-Readiness-Gate.md`.

This gate is mandatory whenever the task touches:
1. authority/source-of-truth,
2. read-model selection,
3. public payload surfacing,
4. UI/API consume correctness,
5. missing-data behavior,
6. or user-visible `unavailable` vs fallback rules.

Evaluate the gate only after the context load above, using the actual references, existing task content, and known code/context that were gathered.

Extract or confirm:
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

Policy:
1. If these are materially needed but missing, do not draft an implementable task yet.
2. Ask focused blocker questions if the missing control-model decision is not clearly recoverable from the available context.
3. Route back to plan refinement first only when the needed control-model information is already clearly recoverable from existing references, code, or explicit prior decisions, but is not yet written down in the higher-level artifact.
4. Never invent a control model, fallback rule, or missing-data behavior just to make the task look implementable.
5. Do not transform missing control-model decisions into selector ladders, route-local heuristics, or UI fallbacks.
6. If the task refines an existing runtime authority/resolution path, explicitly classify the current behavior as:
   - preserved baseline behavior,
   - intentionally replaced behavior,
   - or explicitly forbidden behavior.
7. Do not let `forbidden_fallback` wording accidentally ban deterministic same-authority resolution paths unless the referenced artifact or task says so explicitly.

### 1b) Run the Authority Fan-out Scan

Run this scan whenever:
1. `authority_risk >= 1`
2. `identity_join_risk >= 1`
3. a shared interface/result shape is changing
4. a canonical authority is consumed by multiple surfaces or roles

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
1. If three or more consume families are affected, do not keep producer closure and consumer-family closure inside one task unless the user explicitly requests a knowingly high-risk bundle.
2. Use the scan to decide whether this task is:
   - a producer task,
   - a consumer-family alignment task,
   - an activation task,
   - a read-model task,
   - or a cleanup task.
3. If the task cannot be cleanly classified after the scan, route back to plan refinement before finalizing L1.
4. These labels are classification aids, not mandatory one-label-per-task output. A bounded task may own multiple adjacent closures when they share the same code path and risk profile.
5. Prefer the smallest safe task count; split only where the ownership, compatibility, or consume-family boundary is real.
6. The final task may rename these buckets into domain-local terminology, but the mapping back to the generic categories must stay explicit.

### 1c) Run the Shared Contract Compatibility Gate

Run this gate when a shared interface/result shape, shared port, or shared artifact contract is changing.

Required output:
1. current consumers inventory
2. additive vs breaking decision
3. whether alignment happens in this task or in a successor task

Policy:
1. Do not silently change a shared contract shape inside a bounded task without recording current consumers.
2. If the change is breaking and current consumers are outside the bounded task scope, either:
   - split out a dedicated alignment/migration task, or
   - route back to plan refinement.
3. Do not let a foundation task smuggle in downstream consumer alignment just because the changed contract is shared.

### 1d) Run the Complexity-Risk Gate

Use `references/Complexity-Risk-Gate.md`.

1. Score:
   - `authority_risk`
   - `surface_spread`
   - `identity_join_risk`
   - `activation_coupling`
   - `prerequisite_risk`
   - `acceptance_multiplicity`
2. Compute `risk_score`.
3. Check hard-stop rules from the reference.
4. Decide whether single-task output is still allowed.

Policy:
1. `0-4`: task may stay single if artifact-chain rules also allow it.
2. `5-7`: strongly prefer `Plan -> Task`, especially if the task would otherwise mix foundation and delivery.
3. `8-12`: do not draft as a single direct feature-delivery task; split into at least:
   - `foundation/refactor`
   - `delivery`
   - optional `activation/rollout`
4. If user explicitly asked for one task despite high risk, keep the request intent, but document the split risk and propose a safer decomposition.
5. If a future milestone-gated behavior is involved:
   - specify the contract now,
   - keep activation in a later task,
   - keep current runtime behavior fail-closed.
6. If public consume correctness depends on multi-seam identity matching, prefer splitting `authority/read-model parity` from `payload/UI consume cutover`.
7. If the authority fan-out scan reveals three or more consume families, producer closure and consumer-family closure should not remain in the same bounded task by default.
8. But do not split adjacent closures into separate tasks just to mirror the vocabulary; merge them when they are genuinely one bounded change with the same consumers and no separate compatibility/read-model risk.

### 2) Build draft immediately

1. Generate a draft using `Templates/task-template.md`.
2. Fill as much as possible from known context.
3. Mark unknown required fields as `TODO_BLOCKER`.
4. If risk gate requires split:
   - draft only the bounded task you are currently creating,
   - state the split decision explicitly,
   - do not silently keep the full original scope inside one task.

### 3) Run blocker gap check

Required blockers for Task output:
1. `artifact_id`, `phase`, `target_files`
2. Artifact references consistent with work type:
   - task-only flows: `prd_ref`/`plan_ref` may be `null`
   - contract-boundary override flows: `plan_ref` required
   - large/new-app flows: both refs required
3. `L0`: goal, in-scope, out-of-scope, safety default
4. `L1`: call-site/entry points, data/interface contract, error/fallback, test matrix
5. If contract-boundary override is active:
   - L1 `Data and Interface Contract` must have impacted contract rows
   - L1 test matrix must include at least one compatibility or migration scenario
6. L1 contract details must be explicit:
   - required vs optional fields for impacted schemas/types
   - exact function signature for changed public entry points
   - if no allowed side effects are listed, mark pure behavior
   - if dependency exists, include dependency-failure fallback row
7. Cross-reference and token integrity must be explicit:
   - referenced IDs must resolve to existing rows/clauses/tokens,
   - canonical token names must be used consistently (no shorthand aliases).
8. Complexity-risk blockers must be explicit:
   - if `risk_score >= 4`, split decision must be recorded,
   - if `identity_join_risk >= 1`, the task must state the matching seam and forbidden fallback identities,
   - if `risk_score >= 8` or hard-stop applies, task must not pretend to be direct one-shot delivery,
   - authority/source-of-truth note is mandatory when authority risk is non-zero.
9. Control-model blockers must be explicit whenever applicable:
   - `business_invariant`
   - `control_model`
   - `read_path_rule`
   - `forbidden_fallback`
   - `allowed_resolution_path`
   - `missing_data_rule`
   - `phase_boundary`
10. If any control-model blocker is missing and correctness depends on it, the task is not ready. Ask focused blocker questions instead of drafting around the gap.
11. If a shared contract is changing, blockers also include:
   - current consumers inventory,
   - additive vs breaking decision,
   - explicit alignment ownership.
12. If the task refines or replaces an existing canonicalization/resolution path, blockers also include:
   - `must_preserve_behaviors`,
   - `allowed_resolution_paths`,
   - `forbidden_regression_interpretations`,
   - `replacement_proof_required_if_removed`.

If blockers exist, ask only focused questions for those blockers.

### 4) L0 pass

1. Confirm explicit in-scope and out-of-scope boundaries.
2. Confirm safety default behavior.
3. Keep this section short and policy-level.
4. Include complexity-risk outcome and split decision.
5. If applicable, keep the L0 control-model summary short, then restate it concretely in a dedicated L1 domain/control contract section.
6. If applicable, include an `Authority Boundary Map` and use it to say what this task intentionally does not close.
7. If the task touches an existing runtime authority/resolution path, include a `Baseline Preservation` section and say explicitly what is preserved vs intentionally replaced.

### 5) L1 pass

Fill each section or mark `N/A`:
1. Domain/control contract
2. Call-site matrix
3. Data and interface contract
4. Side effects contract
5. Error and fallback contract
6. Dependency constraints
7. Test matrix (at least one golden path and one invalid case)
8. Shared contract compatibility (required when a shared interface/result shape changes; otherwise `N/A`)
9. Baseline preservation (required when an existing canonicalization/resolution path is refined or replaced; otherwise `N/A`)

Rules:
1. `target_files` must align with call-site matrix.
2. Do not force all rows to `P1`.
3. `P0/P1` requires evidence (repro/failing output/code-path proof).
4. If side effects are empty, mark implementation as pure.
5. If dependency is present, dependency-failure fallback is mandatory (otherwise `N/A`).
6. Required-now test rows should be self-contained; if a row depends on another row for shared invariants, add explicit normative dependency notation.
7. If the risk gate forced a split, L1 must only describe the bounded phase, not the whole original umbrella feature.
8. If the control-model gate applied, L1 must make the allowed read-path, forbidden fallbacks, and missing-data behavior concrete enough for implementation.
9. If the authority fan-out scan applied, L1 must keep producer closure and consumer-family closure separated unless the artifact explicitly documents why they are inseparable.
10. If the shared contract compatibility gate applied, L1 must make additive vs breaking behavior explicit and name any out-of-scope consumers.
11. If baseline-preservation applies, L1 must distinguish:
   - forbidden heuristic fallbacks,
   - allowed deterministic same-authority resolution paths,
   - and any exact replacement path that justifies removing a current behavior.

### 5a) Consistency Gate (mandatory before L2)

Run a document-level consistency gate:
1. Build an identifier registry from declared IDs/tokens (`AC*`, `T*`, `CS*`, `SL*`, `RC*`, `REQ_*`, `FORBID_*`).
2. Verify every cross-reference in mappings/spec-lock/test/evidence tables resolves exactly.
3. Reject shorthand alias use where canonical token IDs exist.
4. Detect implicit test dependency:
   - if a required-now test row is only valid because another row carries core invariants,
   - require explicit `depends_on` style normative note in that row.
5. If any gate item fails, fix the document before proceeding.
6. Re-check that complexity-risk decision, target files, and L1 scope all agree:
   - no hidden delivery behavior inside a foundation task,
   - no hidden activation inside a contract-only task,
   - no mixed authority-refactor + runtime-activation scope when split was required.
7. Re-check that the control model and the implementation seam still align:
   - business invariant is not contradicted by the proposed read-path,
   - forbidden fallback sources do not reappear in L1,
   - missing-data behavior is explicit and matches the safety default,
   - the task is not solving route/UI/runtime work before the control model is closed.
8. Re-check shared contract compatibility:
   - every changed shared interface/result shape has a current-consumers inventory,
   - additive vs breaking decision is explicit,
   - any out-of-scope consumers are named,
   - no hidden downstream alignment has leaked into a bounded producer task.
9. Re-check authority fan-out fit:
   - the task’s in-scope consumers match the declared authority boundary map,
   - export surfaces claimed as “closed in this phase” are truly in scope,
   - read-model and cleanup consume have not been pulled into a producer task by accident.

### 6) L2 pass

1. Capture optional implementation ideas only.
2. Tag as `later-hardening` by default.
3. Do not let L2 block implementability.

### 7) Finalize output

1. Emit final markdown document.
2. Include a short "Assumptions" block for inferred values.
3. Include a short "Open Questions" block only if non-blocking.
4. Include a standard "Hardening Backlog" block for `later-hardening` items.
   - If none exist, emit `No open later-hardening items.`
5. Include explicit complexity-risk summary:
   - `risk_score`
   - split decision
   - authority/source-of-truth note when applicable
   - authority fan-out note when applicable
6. If the control-model gate applied, include a short note explaining whether the control model was inherited cleanly or had to be clarified during drafting.

## Output

1. Final task markdown (save to `TARGET_PATH` or proposed path).
2. Hardening Backlog block format:
   - columns: `ID | Item | Layer | Priority | Timing | Source | Proposed Action`
   - include only `later-hardening` items
3. Short summary:
   - contract-boundary override decision (`yes|no`) and reason,
   - complexity-risk decision and score,
   - what was inferred,
   - what was asked,
   - what remains `later-hardening`.
