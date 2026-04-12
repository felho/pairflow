---
name: CreatePairflowSpec
description: Create or refine Pairflow PRD/Plan/Task documents with L0-L1-L2 contracts. USE WHEN create task file OR write task spec OR create plan OR create PRD OR refine spec OR convert notes to implementable task OR fix review loop in docs. Context-first and gap-only interview.
---

# CreatePairflowSpec

Create and refine Pairflow specification artifacts that are implementable by LLMs without infinite review loops.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreatePRD** | "create prd", "new prd", "draft prd", "write product doc" | `Workflows/CreatePRD.md` |
| **CreatePlan** | "create plan", "new implementation plan", "phase plan" | `Workflows/CreatePlan.md` |
| **CreateTask** | "create task", "task file", "task spec", "l0 l1 l2" | `Workflows/CreateTask.md` |

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

Minimum required answers when applicable:
1. `business_invariant` (what domain rule must remain true throughout)
2. `control_model` (which source decides whether something should exist / happen / be shown)
3. `read_path_rule` (where the system is allowed to load or show the thing from)
4. `forbidden_fallback` (which alternative sources must not be used as fallback truth)
5. `allowed_resolution_path` (which resolution or reconciliation paths are explicitly allowed inside the same authority chain)
6. `missing_data_rule` (what happens if the thing is expected but the allowed read path has no data)
7. `phase_boundary`:
   - `contract_closure`
   - `producer_closure`
   - `internal_execution_closure`
   - `workflow_orchestration_closure`
   - `read_model_closure`
   - `activation_closure`
   - `cleanup_recovery_closure`

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

## Authority Fan-out Scan (Mandatory)

Before drafting implementation-oriented Plan or Task artifacts, run an `Authority Fan-out Scan` when any of the following is true:
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
1. `0-4`: single task is generally acceptable.
2. `5-7`: split is strongly recommended; prefer `Plan -> Task`.
3. `8-12`: refactor-first split is mandatory; do not keep the scope as one feature-delivery task.
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
14. Authority producer before consumer alignment: the phase that creates canonical authority should be separated from the phases that consume it when fan-out exists.
15. Shared contract changes require explicit consumer inventory and additive-vs-breaking classification before task scope is finalized.
16. Use minimum viable sequencing: separate closures by real boundary, not by template zeal.
17. Baseline-preservation before cleanup: when a task refines an existing runtime path, explicitly record which current behaviors must survive unchanged unless the task authorizes a replacement.
18. If a task forbids a heuristic, also state the allowed deterministic resolution paths so reviewers do not "tighten" the code into a regression.

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
15. When a shared interface/result shape changes, the artifact must record:
   - current consumers,
   - additive vs breaking decision,
   - whether alignment happens now or in a successor task.
16. Plans with authority/read-model/multi-consumer relevance must include a `Phase Ownership Grid` capturing:
   - dominant boundary,
   - produced authority,
   - consuming surfaces,
   - forbidden co-mingling.
17. For Plans with authority/read-model/multi-consumer relevance, a control-model section is mandatory. It must explicitly state:
   - business invariant,
   - control model,
   - read-path rule,
   - forbidden fallback,
   - missing-data rule.
18. For Tasks with authority/read-model/multi-consumer relevance, the task must either inherit or restate those same control-model clauses explicitly enough for implementation.
19. Tasks with authority/read-model/multi-consumer relevance should include an `Authority Boundary Map` capturing:
   - authority producer,
   - stored authority,
   - in-scope consumers,
   - explicit out-of-scope consumers,
   - whether export surfaces are closed in this phase.
20. If any of those control-model clauses are missing and materially affect correctness, the artifact must remain blocked until clarified.
21. Tasks that refine or replace an existing canonicalization/resolution path must include a `Baseline Preservation` section with:
   - `must_preserve_behaviors`,
   - `allowed_resolution_paths`,
   - `forbidden_regression_interpretations`,
   - `replacement_proof_required_if_removed`.
22. If a current behavior is being removed, the artifact must identify the exact replacement path and the equivalence or intentional-difference proof expected from validation.

## Templates and References

- Task template: `Templates/task-template.md`
- Plan template: `Templates/plan-template.md`
- PRD template: `Templates/prd-template.md`
- Control-model readiness gate: `references/Control-Model-Readiness-Gate.md`
- L1 boundaries checklist: `references/L1-Contract-Boundaries.md`
- Reviewer tags snippet: `references/Reviewer-Guidelines.md`
- Complexity risk gate: `references/Complexity-Risk-Gate.md`

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
-> Builds phase breakdown and task list
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
