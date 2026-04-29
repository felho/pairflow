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
3. If the task is plan-linked or intended for `ExecutePairflowPlan`, read
   `../ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md` and treat
   it as the canonical metadata authority for plan/task identity, linkage,
   lineage, status domain, and archive mapping.
4. If `plan_ref` exists, read it to extract only the task-relevant parent context:
   - overarching objective,
   - the plan gap this task is supposed to close,
   - predecessor/successor expectations,
   - any plan-level validation or exit expectations this task contributes to,
   - whether a split/replacement would obsolete or refine an existing open task.
5. Extract known values before asking questions:
   - title, scope, refs, likely target files, constraints.
6. Extract likely:
   - canonical source-of-truth candidates,
   - repo-local source anchors for any already-closed contract being refined,
   - business invariant and control model,
   - allowed read-path and missing-data rule,
   - allowed deterministic resolution paths inside the same authority chain,
   - forbidden fallback sources,
   - canonical vs guard vs compat field-role candidates when an existing contract is being clarified,
   - closed terminology that successor tasks may inherit,
   - existing baseline canonicalization/finalize/reconciliation paths that may need preservation,
   - current success/completion proof source for any mutable flow being refined,
   - target success/completion proof source after this task,
   - final result/status/event surfaces that would reflect the changed proof,
   - any reused cleanup/delete/reconcile proof contract and whether parity with that contract is expected,
   - affected surfaces,
   - authority producer and consumer families,
   - shared contract consumers and compatibility risk,
   - prerequisite milestones,
   - distinct acceptance goals.

### 1.0a) Establish execution metadata

For plan-linked or `ExecutePairflowPlan`-routed tasks, establish identity before
drafting the body:

1. Resolve the canonical `task_id` from the parent plan's `task_order` /
   `task_tracker` when the task is already planned.
2. Resolve `sequence_key` and `task_family_id` so `task_id` equals
   `<sequence_key>-<task_family_id>`.
3. Use a short `sequence_key` such as `1`, `1a`, or `2`; do not use display
   labels like `task-01`.
4. Set the task filename to `<task_id>.md`.
5. Set `doc_bubble_id: null`, `impl_bubble_id: null`, `supersedes: []`, and
   `superseded_by: null` for fresh tasks unless the workflow is explicitly
   creating a replacement/supersession task.
6. Copy `archive_group` from the parent plan when present; otherwise derive it
   only from trustworthy `created_on` and `plan_id`.
7. If the parent plan names a non-compliant or ambiguous planned task id, stop
   and route to plan refinement instead of silently creating a task under a
   different identity.
8. If refining an existing task, preserve the existing canonical identity unless
   the artifact is explicitly being superseded; repeated refinement alone must
   not change `task_id`.

Status rule:

1. Default new task output to `status: draft` or `status: under_review`.
2. Do not set `status: approved` from CreateTask alone.
3. `status: approved` is allowed only when this workflow is applying a concrete
   same-artifact `ReviewSpec task-mode` result with `decision=approve_task`, or
   when the caller supplies an explicit delegated task-creation contract that
   says the task is already approved.
4. When `status: approved` is set, state the approval provenance in the summary.

### 1a) Run the Target-File Reality Check

Run this check whenever `target_files` are known and the files exist.

Inspect the declared `target_files` and, when needed, their adjacent call-sites/entrypoints to derive the actual bounded slice.

Minimum checks:
1. Is any target file a mutation entrypoint (`route.ts`, write path, command handler, mutation service)?
2. Does the touched scope change any of:
   - write/producer behavior,
   - shared response or status semantics,
   - rollback/retry/cleanup/shared-state preservation,
   - lock/idempotency/serialization behavior,
   - precondition ordering relative to side effects?
3. Are there fresh-vs-reused, success-vs-failure, retry-vs-no-retry, or precondition-pass-vs-fail branches that must be explicitly inventoried?
4. Which branches construct final success/status/result truth, and from which phase does each truth come?
5. Does the actual touched scope still match the claimed task label and bounded-task shape?

Policy:
1. Do not trust the task title, phase label, or requested task shape alone.
2. `target_files` and actual touched scope override the task label when they disagree.
3. If the touched scope implies producer, fail-closed, or coordination/concurrency work, the task must say so explicitly.
4. If the touched scope changes a mutation boundary, the task must record precondition-before-side-effect behavior explicitly.
5. If the actual scope mixes multiple correctness closures and the artifact cannot prove the mix is safe, split before drafting L1.
6. If the touched scope changes where success/completion is proven, and also changes cleanup/recovery behavior or final result/status/event surfaces, split unless the artifact can prove a single bounded closure with no mixed-truth ambiguity.

### 1b) Run the Control-Model Readiness Gate

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
8. If the task changes where success/completion is proven, it must make that proof boundary explicit instead of leaving it implicit inside call-site or cleanup wording.

### 1b.1) Run the Closed-Contract Drift Check

Use `references/Closed-Contract-Drift-Check.md`.

Run this check whenever any of the following is true:
1. the task refines an existing implementation-oriented artifact,
2. authority/shared-contract/read-model wording is being tightened or clarified,
3. the task introduces new terminology for an existing runtime contract,
4. successor tasks inherit wording from this task.

Required output when applicable:
1. `source_anchors`
2. `canonical_elements`
3. `guard_elements`
4. `compat_elements`
5. `closed_terms`
6. `forbidden_reinterpretations`
7. `drift_status`

Policy:
1. Do not finalize an implementable task if the refined wording is only locally coherent but no longer matches repo-local source anchors.
2. Do not silently downgrade canonical fields into vague "guard" or "compat" language.
3. New terminology for an existing contract is allowed only if the artifact anchors it to explicit source refs and field roles.
4. If `drift_status` is `ambiguous_drift` or `unauthorized_reinterpretation`, stop and refine the artifact or route back to plan instead of drafting implementation-ready L1.

### 1c) Run the Authority Fan-out Scan

Run this scan whenever:
1. `authority_risk >= 1`
2. `identity_join_risk >= 1`
3. a shared interface/result shape is changing
4. a canonical authority is consumed by multiple surfaces or roles
5. success/completion truth is surfaced through multiple result/status/event consumers

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
7. If three or more consume families are implicated, the task must explicitly state:
   - which closure this task owns now,
   - which producer or predecessor closure it depends on,
   - and which downstream consumer/read-model/cleanup closures remain for successor tasks.
8. If success/completion proof cutover changes what multiple surfaces report as final truth, treat those surfaces as consume families for split analysis even when they share one command entrypoint.

### 1d) Run the Shared Contract Compatibility Gate

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

### 1d.1) Run the Closure-Budget Gate

Run this gate when the task touches authority/runtime/read-model/shared-contract work.

Count whether the bounded task materially changes:
1. `authority_producer`
2. `shared_contract`
3. `internal_execution_consumers`
4. `workflow_orchestration_consumers`
5. `read_model_consumers`
6. `persisted_authority_or_schema`
7. `cleanup_recovery_consumers`

Policy:
1. If `authority_producer` + `shared_contract` + any two consumer buckets appear together, do not finalize as one bounded task by default.
2. If `persisted_authority_or_schema` changes in the same task as `shared_contract` and two or more consumer buckets, route back to plan refinement.
3. If the task would close producer boundary, shared contract alignment, and status/CLI/read-model fallout together, treat that as a sequencing failure candidate and split before drafting L1.
4. A bounded task may still own adjacent closures only if the artifact can explicitly prove:
   - the same bounded code path closes them,
   - the same consumer family owns the fallout,
   - and no separate compatibility or diagnostics risk exists.
5. If that proof is not available from the loaded context, do not guess; route back to `CreatePlan`.
6. If the task changes canonical success/completion proof source and also changes cleanup/recovery or final result/status/event semantics, do not finalize as one bounded task unless the artifact includes an explicit proof-boundary mapping and mixed-truth justification.

### 1d.2) Run the Bounded-Task-Shape Gate

Use `references/Bounded-Task-Shape-Gate.md`.

Classify the bounded task by primary shape:
1. `contract_or_persisted_authority_foundation`
2. `authority_producer`
3. `consumer_family_alignment`
4. `fail_closed_hardening`
5. `coordination_concurrency_hardening`
6. `activation_or_read_model`

Policy:
1. Default to one primary shape per bounded task.
2. A secondary shape is allowed only when the artifact can explicitly prove that the same bounded change closes both without adding separate recovery, coordination, or side-effect ordering risk.
3. If the task introduces a new lock/mutex/lease/idempotency/serialization rule, `coordination_concurrency_hardening` is in scope and must be recorded explicitly.
4. If the task introduces rollback/retry/cleanup/shared-state-preservation or failure-envelope tightening, `fail_closed_hardening` is in scope and must be recorded explicitly.
5. If the task changes precondition ordering relative to side effects, record that explicitly and treat it as a split trigger when mixed with producer or shared-contract work.
6. If the task mixes `authority_producer` with `fail_closed_hardening` or `coordination_concurrency_hardening` without an explicit bounded proof, route back to `CreatePlan`.
7. If the task changes success/completion proof boundary and also changes compat result/status/event semantics, treat that as mixed-shape by default and route back to `CreatePlan` unless an explicit bounded proof says otherwise.

### 1e) Run the Complexity-Risk Gate

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
9. If the Closure-Budget Gate says the task is too wide, the task must not be written as direct feature-delivery even if the risk score alone looks borderline acceptable.
10. If the task changes canonical success/completion proof source and also touches cleanup or final result/status/event semantics, default `single-task allowed: no` unless proof-boundary mapping shows one non-ambiguous bounded closure.

### 2) Build draft immediately

1. Generate a draft using `Templates/task-template.md`.
2. Fill as much as possible from known context.
3. Fill required execution metadata before body sections for plan-linked tasks:
   `task_family_id`, `sequence_key`, `task_id`, `doc_bubble_id`,
   `impl_bubble_id`, `supersedes`, `superseded_by`, and `archive_group`.
4. Mark unknown required fields as `TODO_BLOCKER`.
5. When the Closed-Contract Drift Check applies, populate canonical contract anchors and field-role classifications explicitly instead of summarizing them vaguely.
6. If risk gate requires split:
   - draft only the bounded task you are currently creating,
   - state the split decision explicitly,
   - do not silently keep the full original scope inside one task.
7. If `plan_ref` exists:
   - include a `Plan Linkage` section,
   - state the parent gap this task closes,
   - state predecessor/successor expectations,
   - state whether the current draft refines, replaces, or obsoletes any existing open task,
   - and record any plan-level validation or exit expectation this task contributes to.

### 3) Run blocker gap check

Required blockers for Task output:
1. `artifact_id`, `phase`, `target_files`
2. Artifact references consistent with work type:
   - task-only flows: `prd_ref`/`plan_ref` may be `null`
   - contract-boundary override flows: `plan_ref` required
   - large/new-app flows: both refs required
3. For plan-linked or `ExecutePairflowPlan`-routed tasks, execution metadata is mandatory:
   - `task_family_id`, `sequence_key`, and `task_id`
   - `task_id` exactly equals `<sequence_key>-<task_family_id>`
   - task filename exactly equals `<task_id>.md`
   - `doc_bubble_id`, `impl_bubble_id`, `supersedes`, and `superseded_by`
   - `archive_group` when parent plan has one
   - parent plan `task_order` / `task_tracker` agrees with the task identity
4. If `status: approved`, approval provenance is mandatory:
   - same-artifact `ReviewSpec task-mode` `approve_task` result, or
   - explicit delegated task-creation contract that says already approved
5. If `plan_ref` exists, `Plan Linkage` is mandatory:
   - parent plan gap closed,
   - predecessor dependency or `N/A`,
   - successor tasks unlocked or impacted,
   - obsolete/refined task IDs if the current split/replacement changes the task list,
   - plan-level validation or exit expectation inherited by this task.
6. Target-file reality proof is mandatory when `target_files` are known:
   - actual mutation entrypoints reviewed,
   - touched producer/fail-closed/coordination scope explicitly stated,
   - precondition-before-side-effect changes called out when present,
   - and any mismatch between requested label and actual scope is resolved in favor of actual scope.
7. `L0`: goal, in-scope, out-of-scope, safety default
8. `L1`: call-site/entry points, data/interface contract, error/fallback, test matrix
9. If contract-boundary override is active:
   - L1 `Data and Interface Contract` must have impacted contract rows
   - L1 test matrix must include at least one compatibility or migration scenario
10. L1 contract details must be explicit:
   - required vs optional fields for impacted schemas/types
   - exact function signature for changed public entry points
   - if no allowed side effects are listed, mark pure behavior
   - if dependency exists, include dependency-failure fallback row
11. Cross-reference and token integrity must be explicit:
   - referenced IDs must resolve to existing rows/clauses/tokens,
   - canonical token names must be used consistently (no shorthand aliases).
12. Complexity-risk blockers must be explicit:
   - if `risk_score >= 4`, split decision must be recorded,
   - if `identity_join_risk >= 1`, the task must state the matching seam and forbidden fallback identities,
   - if `risk_score >= 8` or hard-stop applies, task must not pretend to be direct one-shot delivery,
   - authority/source-of-truth note is mandatory when authority risk is non-zero.
13. Control-model blockers must be explicit whenever applicable:
   - `business_invariant`
   - `control_model`
   - `read_path_rule`
   - `forbidden_fallback`
   - `allowed_resolution_path`
   - `missing_data_rule`
   - `phase_boundary`
14. If any control-model blocker is missing and correctness depends on it, the task is not ready. Ask focused blocker questions instead of drafting around the gap.
15. If a shared contract is changing, blockers also include:
   - current consumers inventory,
   - additive vs breaking decision,
   - explicit alignment ownership.
16. If the task refines or replaces an existing canonicalization/resolution path, blockers also include:
   - `must_preserve_behaviors`,
   - `allowed_resolution_paths`,
   - `forbidden_regression_interpretations`,
   - `replacement_proof_required_if_removed`.
17. If authority/runtime/read-model/shared-contract work is in scope, blockers also include closure-budget triage:
   - closure buckets touched,
   - collapsed closures,
   - deferred closures,
   - why the remaining bounded task is safe.
18. If the task modifies an existing mutation flow, blockers also include a `Precondition and Side-Effect Boundary`:
   - validations that must pass before mutations,
   - side effects forbidden before those validations pass,
   - invalid/precondition-failure behavior,
   - coordination primitives in scope or explicitly deferred.
19. If three or more consume families are implicated, blockers also include explicit sequencing ownership:
   - whether this task is producer, consumer-family alignment, activation, read-model, or cleanup,
   - what producer/predecessor closure it depends on,
   - and which downstream closures remain for successor tasks.
20. If the task cannot name a primary bounded-task shape, or mixes producer with fail-closed/coordination work without an explicit bounded proof, the task is not ready.
21. If the Closed-Contract Drift Check applies, blockers also include:
   - repo-local source anchors,
   - canonical vs guard vs compat classification,
   - forbidden reinterpretations,
   - drift status proving there is no unauthorized semantic change.
22. If the task changes an existing mutable flow's success/completion semantics, blockers also include:
   - current canonical success/completion proof source,
   - target canonical success/completion proof source,
   - final result/status/event truth-surface mapping,
   - explicit note whether any surface is mixed-truth across phases,
   - reused proof-contract parity rule (`inherit_full_parity | narrowed_here_with_proof | no_reuse`).

If blockers exist, ask only focused questions for those blockers.

### 4) L0 pass

1. Confirm explicit in-scope and out-of-scope boundaries.
2. Confirm safety default behavior.
3. Keep this section short and policy-level.
4. Include complexity-risk outcome and split decision.
5. Include closure-budget outcome when applicable.
6. If applicable, keep the L0 control-model summary short, then restate it concretely in a dedicated L1 domain/control contract section.
7. Include a `Scope Reality / Shape Proof` section when `target_files` are known and use it to record:
   - which entrypoints/call-sites were inspected,
   - whether producer/fail-closed/coordination scope is actually touched,
   - whether mutation boundary changes exist,
   - and why the declared task shape matches the real scope.
8. If applicable, include an `Authority Boundary Map` and use it to say what this task intentionally does not close.
9. If the task touches an existing runtime authority/resolution path, include a `Baseline Preservation` section and say explicitly what is preserved vs intentionally replaced.
10. If the task touches an existing mutation flow, include a `Precondition and Side-Effect Boundary` section.
11. If `plan_ref` exists, include a `Plan Linkage` section and keep it task-local:
   - closes gap,
   - depends on,
   - unlocks or impacts successors,
   - refines/replaces/obsoletes any prior open task,
   - inherits which plan-level validation/exit expectation.
12. Record primary bounded-task shape explicitly, and secondary shape only when justified.
13. If the Closed-Contract Drift Check applies, include canonical contract anchors and say explicitly which meanings are preserved rather than silently rephrased.
14. If the task changes success/completion semantics of an existing mutable flow, include a `Success / Completion Proof Boundary` section.

### 5) L1 pass

Fill each section or mark `N/A`:
1. Domain/control contract
2. Canonical contract preservation (required when the Closed-Contract Drift Check applies; otherwise `N/A`)
3. Scope reality and shape proof (required when `target_files` are known; otherwise `N/A`)
4. Plan linkage and successor impact (required when `plan_ref` exists; otherwise `N/A`)
5. Call-site matrix
6. Data and interface contract
7. Side effects contract
8. Error and fallback contract
9. Dependency constraints
10. Test matrix (at least one golden path and one invalid case)
11. Shared contract compatibility (required when a shared interface/result shape changes; otherwise `N/A`)
12. Baseline preservation (required when an existing canonicalization/resolution path is refined or replaced; otherwise `N/A`)
13. Closure-budget summary (required when authority/runtime/read-model/shared-contract work is in scope; otherwise `N/A`)
14. Precondition and side-effect boundary (required when an existing mutation flow is modified or coordination primitives are introduced; otherwise `N/A`)
15. Success / completion proof boundary (required when an existing mutable flow's completion semantics or final truth surfaces change; otherwise `N/A`)

Rules:
1. `target_files` must align with call-site matrix.
2. Do not force all rows to `P1`.
3. `P0/P1` requires evidence (repro/failing output/code-path proof).
4. If side effects are empty, mark implementation as pure.
5. If dependency is present, dependency-failure fallback is mandatory (otherwise `N/A`).
6. Required-now test rows should be self-contained; if a row depends on another row for shared invariants, add explicit normative dependency notation.
7. If the risk gate forced a split, L1 must only describe the bounded phase, not the whole original umbrella feature.
8. If the control-model gate applied, L1 must make the allowed read-path, forbidden fallbacks, and missing-data behavior concrete enough for implementation.
9. If `target_files` are known, L1 must name the inspected mutation/call-site reality and must resolve any mismatch between requested label and actual scope in favor of actual scope.
10. If the authority fan-out scan applied, L1 must keep producer closure and consumer-family closure separated unless the artifact explicitly documents why they are inseparable.
11. If the shared contract compatibility gate applied, L1 must make additive vs breaking behavior explicit and name any out-of-scope consumers.
12. If baseline-preservation applies, L1 must distinguish:
   - forbidden heuristic fallbacks,
   - allowed deterministic same-authority resolution paths,
   - and any exact replacement path that justifies removing a current behavior.
13. If the task touches a mutable flow, L1 must make explicit which validations occur before any side effect and what invalid/precondition-failure path proves zero-side-effect or bounded-side-effect behavior.
14. If `plan_ref` exists, L1 must name the exact parent gap this task closes and what successor work remains or is invalidated.
15. If the task inherits a plan-level exit expectation, the test matrix or a validation note must make that inheritance concrete enough to review.
16. If the Closed-Contract Drift Check applies, L1 must make canonical vs guard vs compat roles concrete enough that a reviewer can detect semantic drift, not just wording polish.
17. If success/completion proof boundary changes, L1 must make explicit:
   - what proves success now,
   - what proves completion now,
   - which final result/status/event surfaces use which proof,
   - and whether any compat surface intentionally remains mixed-truth or must stay single-truth.

### 5a) Consistency Gate (mandatory before L2)

Run a document-level consistency gate:
1. Verify execution metadata determinism for plan-linked tasks:
   - `task_id` equals `<sequence_key>-<task_family_id>`
   - filename equals `<task_id>.md`
   - parent plan tracker row points at the same path and task id
   - `doc_bubble_id` / `impl_bubble_id` are linkage-only values
   - lineage fields are present and consistent
2. Build an identifier registry from declared IDs/tokens (`AC*`, `T*`, `CS*`, `SL*`, `RC*`, `REQ_*`, `FORBID_*`).
3. Verify every cross-reference in mappings/spec-lock/test/evidence tables resolves exactly.
4. Reject shorthand alias use where canonical token IDs exist.
5. Detect implicit test dependency:
   - if a required-now test row is only valid because another row carries core invariants,
   - require explicit `depends_on` style normative note in that row.
6. If any gate item fails, fix the document before proceeding.
7. Re-check that complexity-risk decision, target files, and L1 scope all agree:
   - no hidden delivery behavior inside a foundation task,
   - no hidden activation inside a contract-only task,
   - no mixed authority-refactor + runtime-activation scope when split was required.
8. Re-check that the control model and the implementation seam still align:
   - business invariant is not contradicted by the proposed read-path,
   - forbidden fallback sources do not reappear in L1,
   - missing-data behavior is explicit and matches the safety default,
   - the task is not solving route/UI/runtime work before the control model is closed.
9. Re-check shared contract compatibility:
   - every changed shared interface/result shape has a current-consumers inventory,
   - additive vs breaking decision is explicit,
   - any out-of-scope consumers are named,
   - no hidden downstream alignment has leaked into a bounded producer task.
10. Re-check target-file reality fit:
   - the declared task label and primary shape still match the touched scope,
   - hidden producer work has not been left under consumer-only wording,
   - rollback/retry/cleanup/shared-state preservation is not hiding outside the declared shape,
   - coordination primitives are not hiding outside the declared shape,
   - and mutation boundary changes are reflected in the precondition/side-effect section.
11. Re-check authority fan-out fit:
   - the task’s in-scope consumers match the declared authority boundary map,
   - export surfaces claimed as “closed in this phase” are truly in scope,
   - read-model and cleanup consume have not been pulled into a producer task by accident.
12. Re-check bounded-task shape fit:
   - the declared primary shape matches the actual L1 contract,
   - producer work has not silently absorbed fail-closed hardening or coordination work,
   - any secondary shape is explicitly justified.
13. Re-check precondition and side-effect ordering:
   - invalid/precondition-failure behavior is explicit,
   - forbidden early side effects do not reappear elsewhere in L1,
   - any new lock/mutex/serialization primitive is reflected in the bounded task shape and test matrix.
14. Re-check success/completion proof fit:
   - current vs target proof boundary is explicit,
   - final result/status/event surfaces are mapped,
   - no field is silently populated from a different proof phase than its surrounding surface implies,
   - reused proof contracts keep full parity unless explicit narrowing is proven.
15. Re-check plan linkage fit when `plan_ref` exists:
   - the declared parent gap matches the actual bounded task,
   - predecessor/successor expectations are still coherent after any local split,
   - obsolete/refined tasks are named explicitly,
   - and inherited plan-level validation expectations are reflected in L1.
16. Re-check closed-contract drift when applicable:
   - source anchors are cited,
   - canonical elements have not been downgraded to guard/compat language,
   - new terminology is explicitly mapped,
   - and downstream inheritance notes do not silently change meaning.

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
