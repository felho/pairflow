---
name: CreatePairflowSpec
description: Create or refine Pairflow PRD/Plan/Task documents with L0-L1-L2 contracts. USE WHEN create task file OR write task spec OR create plan OR create PRD OR refine spec OR convert notes to implementable task OR fix review loop in docs. Context-first and gap-only interview.
---

# CreatePairflowSpec

Create and refine Pairflow specification artifacts that are implementable by LLMs without infinite review loops.

## Artifact Responsibilities

Use each artifact for a different job. Do not force one artifact to act like another.

1. `PRD`
   - product intent, business invariant, control model, and user-visible behavior
   - no task-local closure math
2. `Plan`
   - coverage/dependency artifact
   - objective, done definition, current/open/deferred work, ordering, and gap-to-task coverage
   - only the minimum control-model and sequencing notes needed so downstream tasks inherit the same rules
   - do not use the plan as a duplicate task-spec repository
3. `Task`
   - bounded implementation slice
   - must prove its scope using `target_files`, touched entrypoints, mutation boundaries, and bounded-task shape
   - owns the detailed closure/branch reasoning needed for implementation
4. `ReviewSpec`
   - `plan-mode`: coverage, dependency, sequencing, remaining-task viability
   - `task-mode`: artifact review plus target-file reality check
   - boundary validation only, not bug review

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreatePRD** | "create prd", "new prd", "draft prd", "write product doc" | `Workflows/CreatePRD.md` |
| **CreatePlan** | "create plan", "new implementation plan", "phase plan" | `Workflows/CreatePlan.md` |
| **CreateTask** | "create task", "task file", "task spec", "l0 l1 l2" | `Workflows/CreateTask.md` |
| **ReviewSpec** | "review plan", "review task", "review spec", "remaining tasks still valid", "route back to plan" | `Workflows/ReviewSpec.md` |

## Mandatory Work-Type Triage

Before choosing the workflow output shape, classify the request:

| Work Type | Minimum Artifacts | Policy |
|-----------|-------------------|--------|
| bugfix | Task only allowed | `prd_ref: null`, `plan_ref: null` is acceptable. |
| docs-only | Task only allowed | `prd_ref: null`, `plan_ref: null` is acceptable. |
| small feature | Task only by default | Plan is required if contract-boundary override is triggered. |
| large feature | PRD -> Plan -> Task | Task should reference both PRD and Plan. |
| new app / greenfield | PRD -> Plan -> Task(s) | Start from PRD, then Plan, then Task split. |

## Contract-Boundary Override (Mandatory)

If any of the following is true, apply contract-boundary override:
1. DB schema contract changes (new table/column/index/constraint, migration).
2. Public API/interface contract changes (request/response, status semantics).
3. Event/message payload contract changes.
4. Auth/permission model changes.
5. Config/env contract changes required for runtime behavior.

Override policy:
1. Minimum artifact chain becomes `Plan -> Task` (task-only is not allowed).
2. `plan_ref` must not be `null`.
3. L1 must explicitly capture the changed interface contract and test coverage.

## Control-Model Readiness Gate (Mandatory)

Before drafting or refining a PRD, Plan, or Task for implementation-oriented work, run the `Control-Model Readiness Gate`.

Use `references/Control-Model-Readiness-Gate.md`.

This gate is especially important when:
1. a user-visible surface depends on multiple underlying sources,
2. a canonical source-of-truth is introduced, clarified, or cut over,
3. missing data could tempt heuristic fallback,
4. state/control truth and document/resource truth are different things.

Artifact-specific minimums:
1. `PRD`
   - `business_invariant`
   - `control_model`
   - `missing_data_rule`
   - plus `read_path_rule` / `forbidden_fallback` / `allowed_resolution_path` when user-visible read-path correctness depends on them
2. `Plan`
   - `business_invariant`
   - `control_model`
   - `read_path_rule`
   - `forbidden_fallback`
   - `allowed_resolution_path` when deterministic same-authority resolution matters
   - `missing_data_rule`
   - only a lightweight sequencing note when producer-first or multi-consumer ordering matters
3. `Task` and `ReviewSpec task-mode`
   - all task-relevant control-model clauses above
   - plus the task-local ownership/scope details needed to implement or validate the bounded slice

Policy:
1. If the gate is `NOT_READY`, do not silently continue to an implementable Plan or Task.
2. Ask focused blocker questions if the missing control-model decision is not clearly recoverable from the available context.
3. Rewrite the higher-level artifact first only when the required control-model information is already clearly recoverable from existing references, code, or explicit prior decisions, but is not yet written down in the artifact.
4. Never invent a control model, fallback rule, or missing-data behavior just to make the artifact look implementable.
5. Do not convert missing control-model decisions into clever technical seams or fallback heuristics.
6. For authority/read-model/multi-consumer work, the control model must be explicit before payload/UI/runtime sequencing is finalized.
7. If the current code contains a known canonicalization, finalize, or reconciliation path that the new work depends on, record whether it is:
   - preserved baseline behavior,
   - intentionally replaced behavior,
   - or explicitly forbidden behavior.
8. Do not let "forbidden fallback" wording accidentally ban a deterministic same-authority resolution path unless the artifact says so explicitly.
9. Do not force full `phase_boundary` ownership into plans by default; keep that detail in tasks unless plan sequencing itself depends on it.

## Target-File Reality Check (Mandatory for Task Drafting and Task Review)

When `target_files` are known and the files exist, inspect them and, when needed, adjacent entrypoints/call-sites.

Purpose:
1. stop the task label from overriding the real scope
2. force bounded-slice classification from touched code reality
3. catch hidden producer, fail-closed, coordination, and mutation-boundary scope before implementation

Minimum checks:
1. whether any target file is a mutation entrypoint
2. whether producer behavior is actually touched
3. whether rollback/retry/cleanup/shared-state preservation is in scope
4. whether coordination/idempotency/serialization is in scope
5. whether precondition-before-side-effect ordering changes
6. whether the real scope still matches the claimed bounded-task shape

Policy:
1. `target_files` and actual touched scope override the task label when they disagree.
2. A task that cannot prove its real bounded slice is not ready.
3. `ReviewSpec task-mode` must use this check; "implementation review is forbidden" is not a valid reason to skip scope-reality validation.

## Authority Fan-out Scan (Mandatory)

Before drafting implementation-oriented artifacts or reviewing task boundaries, run an `Authority Fan-out Scan` when any of the following is true:
1. `authority_risk >= 1`
2. `identity_join_risk >= 1`
3. a shared interface/result shape is changing
4. a canonical authority is consumed by multiple surfaces or roles

The scan must explicitly inventory the relevant generic authority buckets, either with these names or with an explicitly mapped project-local equivalent:
1. `authority_producer`
2. `persisted_authority`
3. `internal_execution_consumers`
4. `workflow_orchestration_consumers`
5. `read_model_consumers`
6. `cleanup_recovery_consumers`

Bucket intent:
1. `internal_execution_consumers`: runtime/execution paths that act on the authority.
2. `workflow_orchestration_consumers`: orchestration, state-machine, routing, or decision-flow consumers.
3. `read_model_consumers`: projections, reports, UI/API reads, or other consumer-facing views.
4. `cleanup_recovery_consumers`: teardown, rollback, migration, cleanup, or recovery paths.

Policy:
1. Do not treat the scope as a single entrypoint-specific or feature task when the same authority fans out into multiple consume families.
2. Use the scan to decide whether the split must be:
   - `producer`
   - `consumer family alignment`
   - `activation`
   - `read-model`
   - `cleanup`
   instead of the simpler `foundation -> delivery -> activation`.
3. Treat these closure types as an analysis checklist, not as an automatic 6-phase template.
4. Prefer the smallest safe split:
   - collapse adjacent closures when they are owned by the same code path, touch the same consumers, and do not introduce a distinct compatibility/read-model risk,
   - keep closures separate only when they cross a real boundary.
5. If the scan reveals three or more consume families, producer-first sequencing is mandatory, but not necessarily six separate phases.
6. The output artifact may rename these buckets into domain-specific terms, but the generic-to-local mapping must remain explicit and auditable.
7. In plans, use the scan only to justify decomposition and lightweight sequencing notes.
8. In tasks and task reviews, use the scan to prove actual scope ownership.

## Closure-Budget Gate (Mandatory)

Before drafting implementation-oriented artifacts or reviewing task boundaries, run a `Closure-Budget Gate` whenever the scope touches authority/runtime/read-model/shared-contract work.

Count how many of these closure buckets are materially changing in the same bounded artifact:
1. `authority_producer`
2. `shared_contract`
3. `internal_execution_consumers`
4. `workflow_orchestration_consumers`
5. `read_model_consumers`
6. `persisted_authority_or_schema`
7. `cleanup_recovery_consumers`

Policy:
1. If `authority_producer` + `shared_contract` + any two consumer buckets appear together, do not keep the scope as one bounded task by default.
2. If `persisted_authority_or_schema` changes in the same bounded artifact as `shared_contract` and two or more consumer buckets, route to `Plan -> Task` even if the work initially looked task-sized.
3. If the artifact would simultaneously close producer boundary, shared contract alignment, and read-model/status/CLI fallout, treat that as a sequencing failure candidate and split before drafting implementation-ready output.
4. A task may own adjacent closures only when the artifact explicitly proves:
   - the same bounded code path closes them,
   - the same consumer family owns the fallout,
   - and no separate compatibility or diagnostics risk is introduced.
5. Do not let a task stay broad merely because each individual sub-area looks understandable in isolation.
6. The output artifact must name the collapsed vs deferred closures explicitly whenever more than two closure buckets are in scope.
7. In plans, use this gate to decide split/no-split, not to dump full intermediate closure accounting into the plan text.
8. In tasks, this gate is part of the bounded-slice proof and must remain explicit.

## Bounded-Task-Shape Gate (Mandatory)

Before drafting implementation-oriented Plan or Task artifacts for mutable/runtime flows, classify the bounded slice by its primary task shape.

Available shapes:
1. `contract_or_persisted_authority_foundation`
2. `authority_producer`
3. `consumer_family_alignment`
4. `fail_closed_hardening`
5. `coordination_concurrency_hardening`
6. `activation_or_read_model`

Shape intent:
1. `contract_or_persisted_authority_foundation`: shared contract/schema/config/artifact foundation without downstream activation.
2. `authority_producer`: the bounded slice writes or produces canonical authority.
3. `consumer_family_alignment`: existing authority is consumed/aligned by one consumer family.
4. `fail_closed_hardening`: rollback, retry, cleanup, namespace removal, partial-write handling, or shared-state preservation.
5. `coordination_concurrency_hardening`: lock/mutex/lease/idempotency/serialization/race-prevention behavior.
6. `activation_or_read_model`: surfacing, activation, status/list/detail/read-model/UI/API behavior.

Policy:
1. Default to one primary task shape per bounded task.
2. A second adjacent shape is allowed only when the artifact explicitly proves:
   - the same bounded code path closes both,
   - they preserve the same invariants,
   - and no separate side-effect ordering, recovery, or coordination risk is introduced.
3. If a slice introduces a new lock/mutex/lease/idempotency/serialization rule, `coordination_concurrency_hardening` is in scope even if the motivating feature sounds like pure delivery.
4. If a slice introduces rollback/retry/cleanup/shared-state-preservation work, `fail_closed_hardening` is in scope even if the motivating feature sounds like pure write-path delivery.
5. If a slice changes precondition ordering relative to side effects, record it explicitly and treat it as a split trigger when mixed with producer or shared-contract work.
6. If a slice mixes `authority_producer` with `fail_closed_hardening` or `coordination_concurrency_hardening`, treat it as a sequencing failure candidate and split by default.
7. If the author cannot clearly classify the bounded slice, the artifact is not ready for implementable output yet.
8. Plans may mention sequencing implications of task shape, but should not carry full per-phase shape math by default.

## Complexity-Risk Gate (Mandatory)

Before drafting implementation-oriented Plan or Task artifacts, run the `Complexity Risk Gate`.

Use `references/Complexity-Risk-Gate.md` and score these axes:
1. `authority_risk`
2. `surface_spread`
3. `identity_join_risk`
4. `activation_coupling`
5. `prerequisite_risk`
6. `acceptance_multiplicity`

Policy:
1. Use the score primarily for task sizing and bounded-slice decisions.
2. `0-4`: single task is generally acceptable.
3. `5-7`: split is strongly recommended; prefer `Plan -> Task`.
4. `8-12`: refactor-first split is mandatory; do not keep the scope as one feature-delivery task.
4. If a hard-stop rule from the reference applies, split regardless of total score.
5. If the task introduces a canonical source-of-truth and also activates runtime behavior, default to `foundation -> delivery -> activation`.
6. If future milestone-gated behavior is involved, document the contract now but keep activation in a later task.
7. If the task changes a public contract or UI consume while correct behavior depends on fragile identity matching across seams, default to split even below the top score band.
8. If the same authority touches three or more consume families, default split vocabulary is:
   - `persisted authority` (if needed)
   - `authority producer`
   - `consumer-family alignment`
   - `activation`
   - `read-model`
   - `cleanup/rollout`
9. The vocabulary above is not a mandatory phase count. Collapse phases/tasks when:
   - `persisted authority` and `authority producer` are closed by the same bounded change,
   - `activation` and `read-model` do not carry separate read-model or compatibility risk,
   - `cleanup/rollout` does not touch shared consumer contracts.
10. But do not collapse producer closure, shared-contract migration, and multi-family consumer fallout into one task merely because the code is nearby; this is a planning error, not an implementation optimization.
11. Do not persist per-task numeric risk scoring in plans by default; plans should capture decomposition, not stale task math.

## Core Principles

1. Context-first: load known context before asking questions.
2. Gap-only interview: ask only for blocker missing fields.
3. L0 -> L1 -> L2 strict order.
4. L1 is the implementation contract; L2 is optional hardening.
5. Blocker severity is evidence-based (`P0/P1` only with concrete proof).
6. Avoid review-loop inflation: prioritize `required-now` vs `later-hardening` tagging.
7. Identifier discipline first: cross-reference IDs must be canonical, exact-match, and auditable.
8. Split before implementation when boundary risk is high; do not use a single task to carry foundation, delivery, and activation together.
9. New canonical authority boundaries should be specified before new behavior is attached to them.
10. Control model before seam design: settle what controls the decision before designing selectors, route bridges, or UI consume.
11. Missing-data behavior must be explicit: decide fail-closed vs unavailable vs hard error before surfacing or activation work.
12. Forbidden fallbacks should be named, not implied.
13. If a spec says what the product wants but not what controls it, the artifact is not ready.
14. Authority producer before consumer alignment: use this as decomposition/sequencing logic, not as a reason to duplicate task internals in the plan.
15. Shared contract changes require explicit consumer inventory and additive-vs-breaking classification before task scope is finalized.
16. Use minimum viable sequencing: separate closures by real boundary, not by template zeal.
17. Baseline-preservation before cleanup: when a task refines an existing runtime path, explicitly record which current behaviors must survive unchanged unless the task authorizes a replacement.
18. If a task forbids a heuristic, also state the allowed deterministic resolution paths so reviewers do not "tighten" the code into a regression.
19. Closure-width matters as much as risk score: if producer boundary, shared contract, persistence/schema, and multiple consumer families move together, split before drafting implementation-ready scope.
20. Do not use a single task to carry producer closure, shared-contract migration, consumer rollout, and diagnostics fallout together unless the user explicitly requests a knowingly high-risk bundle.
21. For mutable existing flows, tasks must make the precondition-before-side-effect boundary explicit; invalid input should not silently create early artifacts, locks, or namespaces unless the artifact explicitly authorizes that behavior.
22. Locking/concurrency work is not "free hardening" inside a producer task by default; treat it as its own closure unless the artifact proves otherwise.
23. Plan slimness is a feature: keep plans focused on coverage, dependency, and sequencing.
24. Task reality beats task label: bounded-slice claims must be derived from target-file and entrypoint reality.
25. Review must be mode-specific: `plan-mode` validates coverage/dependency/viability, `task-mode` validates artifact plus scope reality.

## Minimum Contract Rules

1. Every Task output must include frontmatter with `artifact_type`, `artifact_id`, `status`, `phase`, `target_files`, `prd_ref`, `plan_ref`, `system_context_ref`.
2. `target_files` must not contradict L1 call-site matrix.
3. Every L1 section must be either filled or explicitly marked `N/A`.
4. Do not force all L1 items to `P1`; assign severity based on evidence.
5. Every refined Task output must include a standard `Hardening Backlog` section for non-blocking (`later-hardening`) items.
6. If contract-boundary override is triggered, `plan_ref` is mandatory and L1 contract rows for impacted boundaries are mandatory.
7. L1 must explicitly include: required vs optional fields, exact entry signatures, pure-by-default side-effect rule, and dependency-failure fallback where applicable.
8. Cross-reference integrity is mandatory:
   - every referenced ID (`AC*`, `T*`, `CS*`, `SL*`, `RC*`, token IDs like `REQ_*`/`FORBID_*`) must exist exactly once in the same document scope,
   - no shorthand aliases are allowed in lock/mapping rows when canonical token IDs exist.
9. Test matrix rows must be self-contained for required-now assertions:
   - no hidden dependency on another test row unless explicitly declared as a normative dependency note.
10. If one row depends on another row for shared invariants, the dependency must be explicit and machine-auditable (for example: `depends_on: T2d for REQ_C/REQ_D`).
11. Implementation-oriented Task outputs must record complexity-risk triage explicitly:
   - `risk_score`,
   - split decision,
   - `identity_join_risk` when applicable,
   - authority/source-of-truth note when applicable.
12. High-risk scopes (`4+`) should prefer an explicit Plan even if work type would otherwise allow task-only.
13. Very high-risk scopes (`8+` or hard-stop) must not be emitted as direct feature-delivery tasks without an explicit foundation phase.
14. When authority/read-model/multi-consumer work is in scope, the artifact must record an `Authority Fan-out Scan` or an equivalent explicit inventory.
15. When `target_files` are known, every Task and every `ReviewSpec task-mode` output must include a scope-reality proof that names the inspected entrypoints and resolves label-vs-reality conflicts in favor of reality.
16. Plans should not carry per-task numeric risk scores, full phase ownership grids, or full mutation/precondition boundary sections by default.
17. When a shared interface/result shape changes, the artifact must record:
   - current consumers,
   - additive vs breaking decision,
   - whether alignment happens now or in a successor task.
18. For Plans with authority/read-model/multi-consumer relevance, a control-model section is mandatory. It must explicitly state:
   - business invariant,
   - control model,
   - read-path rule,
   - forbidden fallback,
   - allowed resolution path when deterministic same-authority resolution matters,
   - missing-data rule.
19. For Tasks with authority/read-model/multi-consumer relevance, the task must either inherit or restate those same control-model clauses explicitly enough for implementation.
20. Tasks with authority/read-model/multi-consumer relevance should include an `Authority Boundary Map` capturing:
   - authority producer,
   - stored authority,
   - in-scope consumers,
   - explicit out-of-scope consumers,
   - whether export surfaces are closed in this phase.
21. If any of those control-model clauses are missing and materially affect correctness, the artifact must remain blocked until clarified.
22. Tasks that refine or replace an existing canonicalization/resolution path must include a `Baseline Preservation` section with:
   - `must_preserve_behaviors`,
   - `allowed_resolution_paths`,
   - `forbidden_regression_interpretations`,
   - `replacement_proof_required_if_removed`.
23. If a current behavior is being removed, the artifact must identify the exact replacement path and the equivalence or intentional-difference proof expected from validation.
24. Tasks must record closure-budget triage explicitly when authority/runtime/read-model/shared-contract work is in scope:
   - closure buckets touched,
   - which closures are intentionally collapsed,
   - why that collapse is safe,
   - which closures are explicitly deferred.
25. Tasks for mutable/runtime flows must record bounded-task-shape classification explicitly:
   - primary shape,
   - secondary shape (if any),
   - why that mix is safe when present.
26. Tasks that modify an existing mutation flow must include a `Precondition and Side-Effect Boundary` section capturing:
   - validations that must pass before side effects,
   - side effects forbidden before those validations pass,
   - invalid/precondition-failure behavior,
   - coordination primitives in scope or explicitly deferred.
27. If a task changes mutation ordering or introduces coordination primitives, the test matrix must include at least one required-now invalid/precondition-failure scenario proving the expected zero-side-effect or bounded-side-effect behavior.
28. `ReviewSpec plan-mode` is planning-only:
   - check coverage, dependency, sequencing, and downstream viability,
   - do not turn it into implementation or code-review workflow.
29. `ReviewSpec task-mode` must load the parent plan when `plan_ref` exists and treat parent-plan fit as mandatory review context, not optional background.
30. `ReviewSpec task-mode` must inspect `target_files` when available and use the real touched scope to validate the bounded slice.
31. Plan/task review must include a remaining-task viability check:
   - whether downstream open tasks remain valid as written,
   - whether a plan/task refinement is needed,
   - whether a new split task is required,
   - whether a downstream task became obsolete,
   - whether phase ordering is invalidated.

## Templates and References

- Task template: `Templates/task-template.md`
- Plan template: `Templates/plan-template.md`
- PRD template: `Templates/prd-template.md`
- Control-model readiness gate: `references/Control-Model-Readiness-Gate.md`
- L1 boundaries checklist: `references/L1-Contract-Boundaries.md`
- Reviewer tags snippet: `references/Reviewer-Guidelines.md`
- Complexity risk gate: `references/Complexity-Risk-Gate.md`
- Bounded-task-shape gate: `references/Bounded-Task-Shape-Gate.md`
- Remaining-task viability check: `references/Remaining-Task-Viability-Check.md`

## Examples

**Example 1: Create task from rich context**
```
User: "Create a task for runtime-check bypass phase1, refs are in docs/... and plans/..."
-> Invokes CreateTask
-> Loads provided refs
-> Drafts full task directly
-> Asks only missing blocker question(s) if needed
```

**Example 2: Convert rough notes into plan**
```
User: "Here are notes, make a phase plan"
-> Invokes CreatePlan
-> Builds objective, done definition, open task list, coverage map, and sequencing notes
-> Asks for missing ownership/dependency only if blocking
```

**Example 3: Tighten an existing task**
```
User: "Refine this task to L0/L1/L2"
-> Invokes CreateTask
-> Reads existing file
-> Preserves intent, upgrades structure, adds missing contracts
-> Marks optional items as later-hardening
```

**Example 4: Review a task against its plan**
```
User: "Review this task and tell me whether the remaining tasks are still valid"
-> Invokes ReviewSpec
-> Loads the task
-> Loads parent plan when `plan_ref` exists
-> Runs task-mode with target-file reality check
-> Checks bounded-task shape, parent-plan fit, and downstream open tasks
-> Returns approve/refine/route-back decision plus remaining-task impact
```
