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
3. If the plan is intended for `ExecutePairflowPlan` execution, read
   `../ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md` and apply
   its required plan frontmatter contract.
4. Extract:
   - overarching objective,
   - done definition,
   - current completed work,
   - current open work,
   - sequencing/dependency constraints,
   - validation needs that matter at plan level,
   - and any plan-level control-model clauses that all downstream tasks must inherit.
5. If authority/read-model/runtime work is involved, extract only the minimum plan-level control model needed to keep downstream tasks aligned:
   - `business_invariant`
   - `control_model`
   - `read_path_rule`
   - `forbidden_fallback`
   - `allowed_resolution_path`
   - `missing_data_rule`
   - repo-local source anchors for any already-closed contract being refined
6. Add a lightweight sequencing note only when task ordering depends on it:
   - producer-first boundary,
   - which downstream consume families remain,
   - whether cleanup/recovery is included now or deferred,
   - whether success/completion proof cutover is included now or deferred.
7. If the objective, Done Definition, or validation strategy claims a usable
   capability, extract the minimum capability-closure context:
   - capability claim,
   - activation path,
   - repo-provided vs external boundary,
   - last-mile proof status,
   - whether any open task owns missing activation.
8. Do not duplicate task-internal bounded-slice reasoning in the plan unless remaining-task viability or ordering depends on it.

### 1a.0) Establish execution metadata

For `ExecutePairflowPlan`-routed plans:

1. Set `plan_id` to the stable plan slug, normally the live filename stem without
   `.md`.
2. Set `created_on` from explicit creation metadata or trustworthy committed
   history when refining an existing plan. For new plans, use the actual creation
   date.
3. Set `archive_group` to `<created_on>-<plan_id>`.
4. Use `plan_status` for routing status. Keep legacy `status` aligned when present,
   but do not let `status` replace `plan_status`.
5. Create `task_order` from explicit canonical task ids only.
6. Create `task_tracker` rows keyed by those same canonical task ids.
7. For planned-but-not-created tasks, set `task_path: null` and `status:
   not_created`.
8. Set `active_task_id` to the first non-terminal canonical task id, or `null`
   only when `plan_status=done`.

Do not use human-readable titles, table row labels, or filenames as hidden task
identity. If a planned task lacks a canonical `task_id`, stop and ask for or
record an explicit compliant `sequence_key` plus `task_family_id` before
finalizing the plan.

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

### 1a.1) Run the Closed-Contract Drift Check

Use `references/Closed-Contract-Drift-Check.md`.

Run this when the plan:
1. refines an existing implementation-oriented plan,
2. tightens wording around an already-closed authority/shared contract,
3. introduces new terminology for an existing canonical contract,
4. changes wording that downstream tasks inherit.

Required output when applicable:
1. source anchors
2. canonical elements / closed terms that must remain fixed
3. any explicitly authorized reinterpretation
4. drift status
5. downstream task impact

Policy:
1. Keep this lightweight in the plan, but do not skip it.
2. A refined plan must not silently reinterpret a closed canonical contract just because the new wording sounds cleaner.
3. If drift is ambiguous or unauthorized, stop and refine the plan before treating its open tasks as implementation-ready.

### 1a.2) Run the Capability Closure Gate

Use `references/Capability-Closure-Gate.md`.

Run this when the plan objective, Done Definition, validation strategy, or open
task list claims that a user, operator, system, agent, scheduler, webhook, CLI,
UI, CI/CD step, notification, import/export path, background job, config-driven
behavior, or integration path is usable, automated, wired, configured,
supported, available, or complete.

Required plan-level output:
1. `capability_claim`
2. `closure_classification`:
   - `end_to_end`
   - `externally_activated`
   - `hook_only`
   - `foundation_only`
   - `deferred_activation`
3. activation path:
   - trigger and entrypoint at plan-level granularity
4. repo-provided vs external boundary:
   - what this repo/product ships
   - what an operator, deployment, external service, installed tool, or later
     task must supply
5. last-mile proof status:
   - already proven,
   - planned in a named open task,
   - explicitly external,
   - or out of scope because the plan is hook/foundation/deferred only

Policy:
1. Keep this section lightweight in the plan; detailed activation contracts
   belong in the task that owns activation.
2. The Done Definition must not claim `end_to_end` usability when the plan is
   only `hook_only`, `foundation_only`, or `deferred_activation`.
3. If the plan is `externally_activated`, name the external prerequisite and
   owner explicitly.
4. If the plan claims `end_to_end`, the validation strategy must include a
   last-mile proof, or an open task must clearly own producing that proof.
5. Ambiguous words such as `configured`, `wired`, `integrated`, `available`,
   `supported`, `ready`, or `automation` must be resolved into owner/boundary
   language before finalizing.

### 1b) Build the Decomposition

1. Identify the remaining plan-level gaps that must be closed to reach the objective.
2. Create or refine the open task list so each task has:
   - a canonical `task_id` that is valid under the execution metadata contract,
   - one clear purpose,
   - a clear predecessor/dependency position,
   - and a clear plan-level gap it closes.
3. If a capability closure gap exists, ensure an open task owns the missing
   activation path or explicitly classify that capability as external, hook-only,
   foundation-only, or deferred.
4. Keep the plan minimal:
   - record what each task is for,
   - record ordering/dependencies,
   - record progress/status,
   - record successor/deferred work,
   - and do not mirror each task's internal risk triage, mutation branches, closure-budget math, or bounded-task shape.
5. Use authority fan-out, complexity, closure-budget, and capability-closure
   reasoning as decomposition aids, but do not dump their full intermediate
   analysis into the plan.
6. If multiple tasks overlap the same plan-level gap, make the sequencing explicit or simplify the task list so ownership is unambiguous.
7. If an open gap would simultaneously:
   - move the canonical success/completion proof boundary,
   - add or tighten post-success cleanup/recovery semantics,
   - and align final result/status/event semantics,
   split that gap before finalizing the plan unless one bounded code path truly owns all three with no mixed-truth compat surface.

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
   - required execution metadata frontmatter when the plan is execution-routed,
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
2. For execution-routed plans, required metadata is present and deterministic:
   - `plan_id`, `created_on`, `plan_status`, `task_order`, `task_tracker`,
     `active_task_id`, and `archive_group`
   - every tracker `task_id` appears in `task_order`
   - every planned task has an explicit canonical `task_id`
   - `archive_group` equals `<created_on>-<plan_id>`
3. The plan clearly separates:
   - completed work,
   - open work,
   - deferred/future work.
4. The open task list is actionable.
5. The coverage map reaches the done definition.
6. The plan does not jump to route/UI/runtime tasks before the control model is explicit.
7. Missing-data behavior is explicit before surfacing/cutover tasks are treated as implementation-ready.
8. If multi-consumer authority sequencing matters, the plan records that boundary in a lightweight sequencing note rather than hiding it in task-local detail.
9. If success/completion proof cutover and cleanup/result alignment are both needed, the plan must say whether they remain in one bounded task or are split, and why.
10. Remaining-task viability is preserved:
   - no dangling predecessor assumptions,
   - no obsolete task left active without note,
   - no missing successor created by a recent split.
11. If the plan refines an already-closed canonical contract, the wording must still match repo-local source anchors or explicitly cite an authorized reinterpretation.
12. Capability claims are aligned with their closure classification:
   - no `end_to_end` Done Definition without last-mile proof or a named open
     task that owns it,
   - no hook/foundation/deferred work worded as fully usable automation,
   - no ambiguous configured/wired/integrated language without owner and
     shipped/external boundary.

### 5) Finalize

1. Emit final markdown.
2. Add assumptions if values were inferred.
3. If the plan was intentionally slimmed to avoid task-overlap, say so briefly in the summary.
4. If the control-model gate forced clarification, say so in the summary instead of pretending the plan was fully derivable.

## Output

Final plan markdown and a brief change summary.
