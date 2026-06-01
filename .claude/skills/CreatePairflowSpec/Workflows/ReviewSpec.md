# ReviewSpec Workflow

Review a spec artifact for planning correctness.

This workflow has two distinct modes:
1. `plan-mode`: coverage, dependency, sequencing, and remaining-task viability review
2. `task-mode`: task-boundary review using the task artifact plus target-file scope reality checks

This workflow exists to catch:
- over-wide plans before task creation,
- over-wide tasks before implementation,
- plan/task drift after refinement,
- capability claims that outpace their activation path or proof,
- missing mandatory gate-output records that make a task look locally coherent
  while hiding split/no-split risk,
- and cases where the remaining open tasks are no longer viable if the current artifact is accepted unchanged.

## Input

- `USER_REQUEST`
- `TARGET_PATH` or explicit artifact ref
- optional `ARTIFACT_TYPE` (`plan|task`)
- optional context refs

## Scope

Planning/spec review only, but not artifact-only.

Allowed:
1. plan/task boundary review
2. phase/task shape review
3. parent-plan fit review
4. remaining-task viability review
5. route-back-to-plan decisions
6. task target-file reality checks that verify bounded-slice claims
7. minimal code-path/entrypoint inspection needed to decide actual scope ownership
8. repo-local source-anchor comparison when a refined artifact touches a closed authority/shared contract
9. capability-closure review that compares Done Definition / acceptance claims
   against activation path, ownership boundary, and last-mile proof

Forbidden:
1. implementation/code review for bugs, correctness defects, or quality grading
2. bubble/process review
3. runtime validation demands that are unrelated to the spec boundary itself

Clarification:
1. `task-mode` may inspect target files and adjacent entrypoints to verify whether the task's claimed scope is true.
2. That is not the same as implementation review. The purpose is boundary validation, not bug-finding.

## Workflow

### 0) Resolve artifact type

1. Detect whether the target artifact is a `plan` or `task`.
2. If ambiguous, infer from frontmatter or ask one focused blocker question.
3. Set review mode explicitly:
   - `plan-mode` for `plan`
   - `task-mode` for `task`
4. If `task`, load `plan_ref` when present.
5. If `plan`, load referenced task files when they are explicitly listed and available.

### 1) Context-first load

Read, in this order:
1. target artifact
2. referenced parent artifact(s)
3. directly referenced sibling/downstream task artifacts when needed for viability review
4. repo-local source-of-truth anchors when canonical contract meaning may have been refined
5. `../ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md` when
   the artifact is plan-linked or intended for `ExecutePairflowPlan`
6. only the minimum extra references needed to judge boundary correctness

Additional mode-specific load:
1. In `plan-mode`, load only the minimum downstream task refs needed to judge coverage, dependency, and remaining-task viability.
2. In `task-mode`, inspect the declared `target_files` when they exist, and inspect adjacent call-sites/entrypoints when needed to verify the real bounded slice.

For `task` review, parent plan context is mandatory when `plan_ref` exists.

### 1a) Execution metadata gate

Apply this gate before content-level approval when the artifact is plan-linked or
intended for `ExecutePairflowPlan`.

For plans, verify:

1. required plan frontmatter exists:
   `plan_id`, `created_on`, `plan_status`, `task_order`, `task_tracker`,
   `active_task_id`, and `archive_group`
2. `archive_group` equals `<created_on>-<plan_id>`
3. every tracker `task_id` appears exactly once in `task_order`
4. planned-but-not-created tracker rows use `task_path: null` and
   `status: not_created`
5. no future task identity is prose-only or filename-only

For tasks, verify:

1. required task frontmatter exists:
   `task_family_id`, `sequence_key`, `task_id`, `doc_bubble_id`,
   `impl_bubble_id`, `supersedes`, and `superseded_by`
2. `sequence_key` is a short ordering key such as `1`, `1a`, or `2`, not a
   display label such as `task-01`
3. `task_id` equals `<sequence_key>-<task_family_id>`
4. the task filename equals `<task_id>.md`
5. the task identity satisfies the derived bubble-id length budget:
   - `sequence_key` is 1-5 characters, allowing future split keys such as
     `100`, `100a`, and `100a1`
   - fresh `task_family_id` is at most 29 characters
   - `task_id` is at most 35 characters
   - derived `<task_id>-doc` and `<task_id>-impl` are each at most 40 characters
6. parent plan `task_order` / `task_tracker` agrees with the task identity and
   path when `plan_ref` exists
7. lineage fields are present and consistent
8. bubble ids are linkage-only values and do not encode lifecycle state
9. task review may approve a task for document-bubble routing, but it must not
   set `status: implementable`; that status is owned by ExecutePairflowPlan
   document-bubble close after approval/merge

Outcome:

1. If the execution metadata is missing, malformed, or non-deterministic, return
   `refine_plan` / `refine_task` unless the artifact cannot safely be repaired
   locally.
2. If repairing the task identity would require changing the parent plan's
   canonical task order/tracker, return `route_back_to_plan`.
3. Do not return `approve_plan` or `approve_task` while this gate fails.

### 2) Apply Review Gates by Mode

For `plan-mode`, apply:
1. Execution metadata gate when applicable
2. `Control-Model Readiness Gate`
3. `Closed-Contract Drift Check` when applicable
4. `Capability Closure Gate` when applicable
5. `Remaining-Task Viability Check`

For `task-mode`, apply:
1. Execution metadata gate when applicable
2. `Target-File Reality Check`
3. `Refactoring Guidance Gate` when applicable
4. `Control-Model Readiness Gate`
5. `Closed-Contract Drift Check` when applicable
6. `Authority Fan-out Scan`
7. `Closure-Budget Gate`
8. `Bounded-Task-Shape Gate`
9. `Scoped Invariant Gate` when applicable
10. `Complexity-Risk Gate`
11. `Contract-Dense Task Gate` when applicable
12. `Capability Closure Gate` when applicable
13. `Remaining-Task Viability Check`

Policy:
1. Review whether the artifact still fits the planning shape it claims.
2. Do not approve a task just because it is internally coherent if it no longer fits the parent plan.
3. Do not approve a plan just because its current phase text reads well if downstream listed tasks are no longer viable under it.
4. In `task-mode`, if the target-file reality check disagrees with the task label, trust the reality check.
5. Do not hide a widened scope behind the phrase "implementation review is forbidden." Scope-reality validation is mandatory in `task-mode`.
6. Do not approve a refined artifact just because the wording reads cleaner if it silently reinterprets a closed contract.
7. Do not approve a refactor task when the Refactoring Guidance Gate concludes
   Boundary/Architecture but the task omits refactor classification or Module
   Depth evidence.
8. Do not approve a contract-dense task just because each section is locally
   plausible; review the canonical matrix first, then verify all mirrored
   surfaces remain subordinate to it.
9. Do not approve an artifact whose Done Definition, acceptance criteria, or
   validation strategy claims a stronger capability than its activation path and
   proof support.
10. Do not approve a task when an applicable mandatory gate is only implicitly
    satisfied by nearby prose. Required gate-output fields must be present and
    auditable in the task artifact, or the decision is `refine_task` /
    `route_back_to_plan`.
11. If a task is detailed but lacks the mandatory split/no-split record for a
    triggered gate, treat that as a planning failure, not as a documentation
    style issue.

### 2a) Mandatory Gate-Output Audit (`task-mode`)

Before `approve_task`, audit whether every triggered mandatory task gate has a
materialized output record in the task artifact. This audit is separate from
checking whether the prose is locally coherent.

Apply the Gate Detail Budget while auditing:
1. `not_triggered`: accept one-line `N/A` plus evidence.
2. `triggered_low_risk`: accept a compact decision record with conclusion,
   evidence anchor, and no-escalation reason.
3. `triggered_split_or_contract_risk`: require the full fields/tables/matrices
   named below or by the gate reference.

Do not turn template availability into a detail requirement. If requesting more
detail, name the concrete risk trigger that escalates the gate from compact
output to full output.

Required checks:
1. Identify which mandatory gates triggered from the task content, parent plan,
   and target-file reality.
2. For each triggered gate, verify that the task includes the required output
   fields named by the gate reference or `SKILL.md` minimum contract rules at
   the required detail level.
3. If a triggered gate's output is missing, generic, or only implied by prose,
   record a finding with:
   - gate name,
   - missing required fields,
   - why the absence can hide split/no-split or required-now/later-hardening
     risk,
   - local `refine_task` vs `route_back_to_plan` action.
4. Do not substitute adjacent sections for a gate output unless they contain
   the exact decision fields required by the gate and can be audited without
   inference.
5. Do not fail a task merely because a non-triggered or low-risk gate is
   compact. Fail only if the compact record lacks evidence, hides a trigger, or
   makes the split/no-split decision unauditable.

Complexity Risk Gate output is mandatory whenever implementation-oriented
authority/runtime/read-model/shared-contract work is in scope. The task must
include at minimum:
1. `risk_score`
2. `authority_risk`
3. `surface_spread`
4. `identity_join_risk`
5. `activation_coupling`
6. `prerequisite_risk`
7. `acceptance_multiplicity`
8. `split_decision`
9. `authority_fanout` when authority fan-out is relevant
10. explicit `single_task_allowed: yes|no` or equivalent split/no-split
    conclusion
11. if `single_task_allowed: yes`, implementation-closure proof explaining why
    no split is needed
12. if `single_task_allowed: no`, the proposed split shape or route-back action

Closure-Budget Gate output is mandatory whenever authority/runtime/read-model/
shared-contract work is in scope. The task must name:
1. each closure bucket with `present`, `absent`, or `unknown`,
2. evidence for every `absent` bucket,
3. why every plausible `unknown` bucket is resolved before approval, or the
   split/refinement action that keeps it out of the current task,
4. intentionally collapsed closures,
5. why each collapse is safe,
6. explicitly deferred closures,
7. whether `split_required` was triggered, and the final split/no-split
   decision.

If `authority_producer` + `shared_contract` + any two consumer buckets are
`present`, the default closure-budget decision is `split_required`. A high-risk
split-trigger combination defaults to `split_task_within_same_plan_scope`, not
single-task approval. A single task may continue only with implementation-
closure proof that one implementation bubble can close the whole task without
separate sequencing, the same bounded code path closes the buckets, the same
consumer family owns the fallout, the same proof surface validates the buckets,
no separate reviewer feedback loop is expected per consumer bucket, and no
separate compatibility, diagnostics, read-model, recovery, or
side-effect-ordering risk is introduced.

Bounded-Task-Shape Gate output is mandatory for mutable/runtime flows. The task
must name:
1. primary shape,
2. secondary shape if any,
3. decomposed closures under each declared shape,
4. adjacent call-site/consumer-family scan result for the changed authority or
   contract, including any `unknown`,
5. why the shape mix is safe,
6. split trigger if more than the allowed adjacent shape is needed.

A declared shape that decomposes into multiple independent closures is not one
adjacent shape by default. Unknown plausible adjacent consumers block
`approve_task` until refined, routed back, or explicitly accepted by human
high-risk override.

Authority Fan-out Scan output is mandatory when a canonical authority is
consumed by multiple surfaces or roles. The task must inventory the relevant
consumer families through discovery, not by restating declared consumers from
the task. For each lifecycle role, record `present`, `absent`, or `unknown`:
1. producer
2. validator/gate
3. persistence/replay
4. execution consumers
5. workflow/orchestration
6. read/presentation
7. recovery/cleanup
8. external/integration

`unknown` means the role plausibly exists but was not inspected. Unknown
plausible roles block `approve_task`. If three or more consumer families are
confirmed, the default decision is `refine_task` with
`split_task_within_same_plan_scope` unless the task proves implementation
closure.
The task must state whether the split is producer, consumer-family alignment,
activation, read-model, or cleanup/rollout.

Scoped Invariant Gate output is mandatory when broad task-level invariant
language is present in acceptance, Done Definition, safety defaults, or L1. For
each broad invariant, the task must name:
1. invariant text or token,
2. `applies_to`,
3. `does_not_apply_to`,
4. `proof_surface`,
5. `deferred_or_external_surfaces`,
6. reviewer non-goals,
7. split or route-back decision when the invariant cannot be bounded locally.

Do not approve a task where universal-sounding phrases such as `compatible`,
`deterministic`, `normal flow`, `must not block`, `always`, or `never` can be
read to include adjacent consumer families that the task has not scoped.

When plausible adjacent edge-case families are known, the task must include a
`Review Scope Fence` naming:
1. edge-case family,
2. why it is not required-now,
3. safe current behavior,
4. handling if discovered during review,
5. route: `follow_up`, `route_back_to_plan`, `accepted_limitation`, or
   `external`.

The fence is invalid if the item is required for the current task contract to
be true. In that case, return `refine_task` or `route_back_to_plan` instead of
approving a fence that hides required work.

Outcome:
1. If Complexity Risk Gate output is missing for an implementation-oriented
   task where it applies, return `refine_task`; return `route_back_to_plan` when
   the missing split decision may invalidate parent-plan sequencing.
2. If a gate output is present but contradicts target-file reality, return
   `route_back_to_plan` when the task cannot be safely narrowed locally.
3. If the output exists but omits specific required fields, return
   `refine_task` and list the missing fields.

Optional top-level parallel review lanes:
1. For large task reviews, the top-level orchestrator/caller may split
   ReviewSpec task-mode into independent sub-agent lanes, then combine the
   results into one final ReviewSpec decision. Do not ask a ReviewSpec subagent
   to spawn its own subagents when the runtime does not support nested
   subagents.
   - `metadata_lane`: execution metadata, parent-plan linkage, remaining-task
     viability
   - `scope_lane`: target-file reality, authority fan-out, closure budget,
     bounded-task shape
   - `contract_lane`: control model, closed-contract drift, contract-dense
     matrix, mirrored surfaces
   - `capability_lane`: capability closure, activation boundary, proof strength
2. Lane outputs are advisory inputs. The final ReviewSpec decision must still
   be a single decision over the refreshed artifact.
3. A lane may not approve the whole artifact. It can only report pass/fail for
   its assigned gate family and required refinements.
4. If lane orchestration is unavailable, the single ReviewSpec pass must still
   run the same gate-output audit and fan-out discovery itself; lane absence is
   not a reason to skip scope discovery.

Lane coverage reconciliation:
1. When any parallel review lane is used, the top-level ReviewSpec result must
   include a `Gate Coverage Matrix` before returning `approve_task`.
2. The matrix must list every task-mode gate and mark one of:
   - `covered_by_lane:<lane_name>`
   - `covered_by_top_level`
   - `not_triggered`
   - `missing`
3. Required matrix rows:
   - execution metadata
   - target-file reality
   - refactoring guidance
   - control-model readiness
   - closed-contract drift
   - authority fan-out
   - closure-budget
   - bounded-task-shape
   - scoped invariant / review scope fence
   - complexity-risk
   - contract-dense task gate
   - capability closure
   - remaining-task viability
   - mandatory gate-output audit
   - final split/no-split consistency
4. `missing` blocks `approve_task`.
5. A lane `pass` is not enough when the lane did not explicitly cover a
   triggered gate in its assigned family. The top-level reviewer must either
   cover the gap directly or return `refine_task` / `route_back_to_plan`.
6. The top-level reviewer owns final split/no-split consistency even when
   scope, contract, and capability lanes all pass independently. In particular,
   high-risk combinations such as `risk_score >= 7`, `split_required`, or
   authority fan-out across three or more consumer families must be reconciled
   explicitly before approval.

High-risk autonomous split rule:
1. If `risk_score >= 7`, authority fan-out reaches three or more consumer
   families, Closure-Budget says `split_required`, and
   `authority_producer` + `shared_contract` + any two consumer buckets are
   `present`, the default decision is not `approve_task`; it is
   `refine_task` with `split_task_within_same_plan_scope`.
2. Keep the parent plan scope intact unless the split changes dependencies,
   sequencing, or coverage.
3. The review result must propose the split shape using closure-family terms
   such as authority foundation, local validation/gate alignment,
   consumer-family alignment, activation/read-model, or cleanup/recovery.
4. A single-task exception requires implementation-closure proof. Shared
   invariant coherence alone is not enough.
5. If the task only provides invariant-level safe-collapse reasoning, return
   `refine_task` and require split refinement.

### 2b) Closed-Contract Drift Check (`plan-mode|task-mode` when applicable)

Use `references/Closed-Contract-Drift-Check.md`.

Run this when:
1. the reviewed artifact refines an existing authority/shared-contract/read-model artifact,
2. canonical terminology or field roles may have shifted,
3. a docs-only refinement still changes implementation-significant wording.

Required checks:
1. identify repo-local source anchors,
2. identify canonical vs guard vs compat elements when relevant,
3. identify closed terms that must not be silently reinterpreted,
4. classify drift status.

Outcome:
1. If the result is `ambiguous_drift`, require refinement or route back to plan.
2. If the result is `unauthorized_reinterpretation`, do not approve.
3. A locally coherent artifact that contradicts repo-local source anchors is not approvable.

### 2c) Target-File Reality Check (`task-mode`)

When `target_files` are known and the files exist, inspect them and, when needed, their adjacent entrypoints.

Minimum checks:
1. Is any target file a mutation entrypoint (`route.ts`, write path, command handler, mutation service)?
2. Does the touched scope include producer behavior, fail-closed behavior, or coordination/concurrency behavior?
3. Does the touched scope change precondition-before-side-effect ordering?
4. Are rollback/retry/cleanup/shared-state preservation branches present?
5. Does the touched scope change where success/completion is proven?
6. Do any final result/status/event surfaces become mixed-truth across phases?
7. Does the actual scope still match the task's claimed bounded-task shape?

Outcome:
1. Record whether the task is still correctly classified.
2. If not, require `refine_task` or `route_back_to_plan`.

### 2d) Refactoring Guidance Gate (`task-mode` when applicable)

Use `references/Refactoring-Guidance-Gate.md`.

Run this when the reviewed task is a refactor, is labeled as a refactor, or the
target-file reality check shows refactor behavior.

Required checks:
1. The task includes `Refactor Classification` when refactor behavior is in
   scope.
2. The recorded classification matches target-file reality:
   - mechanical/local cleanup must not add public helper surface,
   - Boundary/Architecture triggers must not be hidden behind cleanup wording.
3. If classification is `boundary_architecture`, the task includes usable
   Module Depth Check evidence:
   - deletion test,
   - caller knowledge removed,
   - public interface change,
   - behavior hidden behind the module,
   - test shape,
   - public helper/wrapper action.
4. The task's test matrix and dependency constraints do not preserve shallow
   production-order reconstruction through internal helper imports unless the
   helper owns independent policy.
5. The refactor's actual scope fits within the parent plan's decomposition. If
   Boundary/Architecture work reveals wider scope than the parent task can
   locally own, treat that as a route-back signal, not local wording cleanup.

Outcome:
1. If classification is missing or disagrees with target-file reality, require
   `refine_task`.
2. If the refactor changes the parent plan's decomposition or creates a wider
   boundary than the task can locally own, return `route_back_to_plan`.
3. If only Module Depth evidence is missing or thin, require local
   `refine_task` and cite the missing evidence field.

### 2e) Contract-Dense Task Gate (`task-mode` when applicable)

Use `references/Contract-Dense-Task-Gate.md`.

Run this when two or more of these are true in the reviewed task:
1. API/interface/result shape change,
2. status/result taxonomy change,
3. structured input/output parsing or schema acceptance change,
4. error/fallback/timeout/cancellation/precedence/reason-code behavior change,
5. split ownership between current task and downstream interpretation/lifecycle
   consumers,
6. multiple downstream consumers or successor tasks inherit the contract,
7. one contract appears in multiple mirrored task sections.

Required checks:
1. The task has one `Canonical Contract Matrix` for the dense contract.
2. L0 prose, branch inventory, data/interface rows, fallback/status rows, and
   test matrix rows do not create independent conflicting sources of truth.
3. Ownership/deferred semantics prevent successor-owned behavior from becoming
   current-task acceptance criteria.
4. Structured input/output rules use explicit schema/allowlist, unknown-field,
   malformed/partial/duplicate/multi-candidate, and retention/drop behavior when
   those cases are implementation-significant.
5. A `Mirrored Surface Checklist` names every section that must be updated when
   a canonical matrix row changes.

Outcome:
1. If the canonical matrix is missing or ambiguous, require `refine_task`.
2. If ownership is actually split wrong across plan tasks, return
   `route_back_to_plan`.
3. If only a mirrored surface is stale while the matrix is clear, require local
   `refine_task` and cite the stale surface.

### 2f) Capability Closure Gate (`plan-mode|task-mode` when applicable)

Use `references/Capability-Closure-Gate.md`.

Run this when the reviewed artifact claims that a user, operator, system, agent,
scheduler, webhook, CLI, UI, CI/CD step, notification, import/export path,
background job, config-driven behavior, or integration path is usable,
automated, wired, configured, supported, available, or complete.

Required checks:
1. Identify each capability claim in objective, Done Definition, acceptance
   criteria, validation strategy, L0/L1, or task linkage.
2. Verify the closure classification is explicit:
   - `end_to_end`
   - `externally_activated`
   - `hook_only`
   - `foundation_only`
   - `deferred_activation`
3. Verify the activation trigger and entrypoint are named when runtime behavior
   is claimed.
4. Verify configuration owner and repo-provided vs external boundary are named
   when config, env, external services, installed tools, credentials, local
   executables, operator setup, feature flags, or deployment state are required.
5. Verify success and failure output contracts exist when the task owns
   activation or an end-to-end claim.
6. Verify the last-mile proof uses the same documented path a real user,
   operator, system, or agent would use.
7. Verify hook/foundation/deferred artifacts do not use completion wording that
   implies full usable automation.

Outcome:
1. In `plan-mode`, return `refine_plan` when the Done Definition is stronger
   than the closure classification.
2. In `plan-mode`, return `split_plan` or `refine_plan` when a missing activation
   path needs a new open task.
3. In `task-mode`, return `refine_task` when the task can locally align claim,
   activation boundary, and proof.
4. In `task-mode`, return `route_back_to_plan` when the task cannot satisfy the
   parent plan's capability claim without changing plan sequencing or adding a
   new task.

### 3) Review in `plan-mode`

When reviewing a `plan`, check:
1. whether the objective and done definition are explicit enough
2. whether the open task list still covers every required plan-level gap
3. whether dependency/order is explicit where correctness depends on it
4. whether the plan-level control model is explicit enough for downstream tasks
5. whether any lightweight sequencing note is sufficient where multi-consumer authority ordering matters
6. whether the plan silently reinterprets any already-closed canonical contract
7. whether capability claims are aligned with activation path, closure
   classification, repo/external boundary, and last-mile proof
8. whether downstream open tasks remain viable if this plan is accepted as written

Decision outcomes:
1. `approve_plan`
2. `refine_plan`
3. `split_plan`
4. `block_not_ready`

Refinement loop rule:

1. If this workflow returns `refine_plan` and the plan artifact is modified, the caller must run `ReviewSpec` again in `plan-mode` from a fresh context over the refreshed plan artifact.
2. The plan is not approved merely because the requested refinement was applied; approval requires a later `approve_plan` result from the repeated review pass.
3. If fresh sub-agent context is unavailable, the caller must still create a distinct review step that rereads the refreshed artifact and returns a new explicit decision.

### 4) Review in `task-mode`

When reviewing a `task`, check:
1. whether the target-file reality check supports the claimed bounded slice
2. whether refactor classification matches target-file reality, and whether
   Boundary/Architecture tasks include usable Module Depth evidence
3. whether the bounded task shape is explicit and still true
4. whether producer work has absorbed fail-closed or coordination scope
5. whether precondition-before-side-effect rules are explicit when needed
6. whether the task still fits its parent gap and parent plan boundary
7. whether the task silently reinterprets any already-closed canonical contract
8. whether the task changes success/completion proof boundary and, if so, whether that cutover is isolated cleanly enough
9. whether reused cleanup/delete/reconcile proof contracts retain validation parity or prove an explicit narrowed contract
10. whether downstream open tasks remain viable if this task is accepted as written
11. whether contract-dense tasks have one canonical matrix and a complete
    mirrored-surface checklist
12. whether capability closure claims inherited from the parent plan or created
    by this task are aligned with activation path, output contracts, and
    last-mile proof

Decision outcomes:
1. `approve_task`
2. `refine_task`
3. `route_back_to_plan`
4. `block_not_ready`

Refinement loop rule:

1. If this workflow returns `refine_task` and the task artifact is modified, the caller must run `ReviewSpec` again in `task-mode` from a fresh context over the refreshed task artifact and parent plan.
2. The task is not approved merely because the requested refinement was applied; approval requires a later `approve_task` result from the repeated review pass.
3. If the repeated pass finds another issue and modifies the artifact again, repeat the same fresh-context review loop until the result is `approve_task`, `route_back_to_plan`, `block_not_ready`, or a real blocker.
4. If fresh sub-agent context is unavailable, the caller must still create a distinct review step that rereads the refreshed task and parent plan and returns a new explicit decision.

### 5) Run the Remaining-Task Viability Check

Use `references/Remaining-Task-Viability-Check.md`.

For the remaining open tasks, decide whether each is:
1. `valid_as_is`
2. `needs_refinement`
3. `must_split`
4. `obsolete`
5. `phase_order_invalid`

Artifact-level impact must be summarized as one of:
1. `unchanged`
2. `needs_task_refinement`
3. `needs_plan_refinement`
4. `split_new_task_required`
5. `obsolete_task_detected`
6. `phase_order_invalidated`

Policy:
1. A local artifact approval is not enough when downstream tasks are no longer viable.
2. If the current artifact invalidates downstream task assumptions, the review must say so explicitly.
3. If a task review discovers a parent-plan mismatch, prefer `route_back_to_plan` over pretending the task can be patched locally.
4. If a task review discovers that the actual touched scope is wider than the artifact claims, prefer `refine_task` for local bounded-slice fixes and `route_back_to_plan` when the sequence itself is now wrong.

### 6) Build the review result

Always include:
1. artifact reviewed
2. artifact type
3. review mode used (`plan-mode|task-mode`)
4. parent-plan context used or not used
5. planning gates applied
6. whether target-file reality check was used
7. findings
8. decision
9. remaining-task impact summary
10. downstream task statuses when applicable
11. execution metadata gate result when applicable
12. when the decision is `refine_plan` or `refine_task`, whether a repeated fresh-context ReviewSpec pass is required before approval or downstream execution
13. when the Refactoring Guidance Gate applies, the refactor classification
    status and Module Depth evidence status
14. when the Contract-Dense Task Gate applies, the canonical matrix status and
    mirrored-surface checklist status
15. when the Capability Closure Gate applies, the closure classification,
    activation boundary status, and last-mile proof status
16. in `task-mode`, the Mandatory Gate-Output Audit result, including triggered
    gates, missing output fields, and split/no-split decision status
17. when the Scoped Invariant Gate applies, each broad invariant's scope
    boundary and proof-surface status
18. when a Review Scope Fence is present or needed, whether fenced edge-case
    families have valid route handling and are not required for the current
    contract
19. in `task-mode`, the Gate Detail Budget result: which gates were
    `not_triggered`, `triggered_low_risk`, or `triggered_split_or_contract_risk`,
    and whether any requested detail escalation is justified by a concrete
    trigger

### 7) Output rules

Findings should be planning-language, not code-review shorthand.

For each material finding, explain:
1. what boundary or assumption is wrong
2. why that matters for later implementation
3. whether the fix is local artifact refinement or plan-level re-sequencing

Additional task-mode rule:
1. If the task label and target-file reality disagree, say that explicitly.
2. Phrase the issue as bounded-slice drift, hidden scope, or parent-plan mismatch, not as a code bug.
3. If the issue is contract-meaning drift, phrase it as unauthorized reinterpretation, ambiguous drift, or source-anchor mismatch rather than as a style nit.
4. If the issue is a success/completion proof cutover mixed with cleanup or final truth-surface alignment, phrase it as a split-trigger or sequencing problem, not as an implementation detail.
5. If the issue is execution metadata drift, phrase it as non-deterministic
   plan/task identity or parent-plan mismatch, not as a naming nit.
6. If the issue is refactor-classification drift, phrase it as missing
   classification, target-file reality mismatch, shallow Module Depth evidence,
   or leaked caller knowledge, not as a style nit.
7. If the issue is contract-dense drift, phrase it as missing canonical matrix,
   stale mirrored surface, or leaked successor-owned semantics, not as generic
   wording polish.
8. If the issue is capability-closure drift, phrase it as claim/proof mismatch,
   ambiguous activation owner, missing shipped/external boundary, or missing
   last-mile proof, not as a style nit.

## Output

Produce:
1. a review summary
2. a decision:
   - `approve_plan|refine_plan|split_plan|approve_task|refine_task|route_back_to_plan|block_not_ready`
3. a `Remaining Task Impact` section
4. when applicable, a downstream task table:
   - `Task | Status | Why | Required Action`
