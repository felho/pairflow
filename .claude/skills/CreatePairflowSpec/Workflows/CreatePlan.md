# CreatePlan Workflow

Create or refine a Pairflow plan document from known context with minimal follow-up questions.

The plan is a coverage and dependency artifact, not a duplicate task-spec repository.

## Input

- `USER_REQUEST`
- `TARGET_PATH` (optional)
- `PRD_REF` (optional)

## Workflow

### 1) Context-first load

1. Read explicit refs from the user.
2. If `TARGET_PATH` exists, use it as baseline.
3. Extract:
   - overarching objective,
   - done definition,
   - current completed work,
   - current open work,
   - sequencing/dependency constraints,
   - validation needs that matter at plan level,
   - and any plan-level control-model clauses that all downstream tasks must inherit.
4. If authority/read-model/runtime work is involved, extract only the minimum plan-level control model needed to keep downstream tasks aligned:
   - `business_invariant`
   - `control_model`
   - `read_path_rule`
   - `forbidden_fallback`
   - `allowed_resolution_path`
   - `missing_data_rule`
5. Add a lightweight sequencing note only when task ordering depends on it:
   - producer-first boundary,
   - which downstream consume families remain,
   - whether cleanup/recovery is included now or deferred.
6. Do not duplicate task-internal bounded-slice reasoning in the plan unless remaining-task viability or ordering depends on it.

### 1a) Run the Plan-Level Control-Model Check

Use `references/Control-Model-Readiness-Gate.md` whenever the plan is implementation-oriented and any of these are true:
- a user-visible surface depends on multiple underlying sources,
- state/control truth differs from document/resource truth,
- missing data could create fallback ambiguity,
- authority/read-model cutover is in scope.

Policy:
1. The plan must be explicit enough that downstream tasks inherit the same business invariant, forbidden fallback, and missing-data behavior.
2. The plan should keep `allowed_resolution_path` when deterministic same-authority resolution matters.
3. The plan does not need full per-phase closure ownership, per-task shape math, or per-task numeric risk scoring.
4. If the control model is not stable enough to sequence tasks, stop and ask focused blocker questions before finalizing an implementation-ready plan.

### 1b) Build the Decomposition

1. Identify the remaining plan-level gaps that must be closed to reach the objective.
2. Create or refine the open task list so each task has:
   - one clear purpose,
   - a clear predecessor/dependency position,
   - and a clear plan-level gap it closes.
3. Keep the plan minimal:
   - record what each task is for,
   - record ordering/dependencies,
   - record progress/status,
   - record successor/deferred work,
   - and do not mirror each task's internal risk triage, mutation branches, closure-budget math, or bounded-task shape.
4. Use authority fan-out, complexity, and closure-budget reasoning as decomposition aids, but do not dump their full intermediate analysis into the plan.
5. If multiple tasks overlap the same plan-level gap, make the sequencing explicit or simplify the task list so ownership is unambiguous.

### 1c) Validate Plan Sufficiency

The plan is valid only if all are true:
1. If the listed open tasks are delivered, the plan objective is actually reached.
2. No required gap is unowned.
3. No open task is redundant without explanation.
4. Dependency/order is explicit where it materially affects correctness.
5. Completed work, open work, and deferred work are distinguishable.
6. When a task split or replacement happened, the plan reflects the new task list instead of relying on historical wording.

### 2) Draft from template

1. Use `Templates/plan-template.md`.
2. Fill:
   - objective,
   - done definition,
   - current status,
   - guiding principles,
   - optional sequencing note,
   - optional phase/progress summary,
   - open task list,
   - coverage map,
   - dependencies/order,
   - risks/assumptions,
   - validation strategy.
3. Use phase language only when it helps track progress or ordering.
4. Do not include per-task numeric risk scores in the plan.
5. Do not include a phase ownership grid, full authority fan-out inventory, or mutation/precondition boundary section unless the user explicitly asks for that style.

### 3) Gap-only questions

Ask only if blocker data is missing:
1. objective or done definition
2. open task list ownership
3. dependency/order that changes plan correctness
4. plan-level control-model clauses that all downstream tasks depend on
5. whether a current task replacement/split should obsolete an old task

### 4) Final Validation

1. `prd_ref` present when a PRD exists.
2. The plan clearly separates:
   - completed work,
   - open work,
   - deferred/future work.
3. The open task list is actionable.
4. The coverage map reaches the done definition.
5. The plan does not jump to route/UI/runtime tasks before the control model is explicit.
6. Missing-data behavior is explicit before surfacing/cutover tasks are treated as implementation-ready.
7. If multi-consumer authority sequencing matters, the plan records that boundary in a lightweight sequencing note rather than hiding it in task-local detail.
8. Remaining-task viability is preserved:
   - no dangling predecessor assumptions,
   - no obsolete task left active without note,
   - no missing successor created by a recent split.

### 5) Finalize

1. Emit final markdown.
2. Add assumptions if values were inferred.
3. If the plan was intentionally slimmed to avoid task-overlap, say so briefly in the summary.
4. If the control-model gate forced clarification, say so in the summary instead of pretending the plan was fully derivable.

## Output

Final plan markdown and a brief change summary.
