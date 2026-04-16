# Control-Model Readiness Gate

Use this gate before drafting or refining a PRD, Plan, or Task when any of the following is true:

1. A user-visible surface depends on one or more underlying data/control sources.
2. A canonical source-of-truth is introduced, clarified, moved, or cut over.
3. Correct behavior depends on choosing between:
   - state/control truth,
   - document/resource truth,
   - operational/recovery truth,
   - live upstream payloads,
   - local projections.
4. Missing or delayed data could lead to:
   - user-visible confusion,
   - heuristic fallback temptation,
   - false-success behavior,
   - hidden ambiguity about whether the system should decide, wait, or fail closed.

This gate exists to prevent a common failure mode:
- the business goal sounds clear,
- but the control model is not explicit,
- so the spec drifts into technical seam-solving before the read-path and fail-closed rules are settled.

## Core Questions

For affected scopes, the artifact author must explicitly answer these questions.

1. `business_invariant` (what domain rule must remain true throughout)
   - What must remain true from the business/domain perspective?
   - Example forms:
     - "The billing page state is controlled by settlement truth."
     - "At most one active checkout can be authoritative."
     - "The customer must never see a Stripe invoice link."

2. `control_model` (which source decides whether something should exist / happen / be shown)
   - Which source decides whether something should exist, happen, or be shown?
   - This is the state/control owner, not necessarily the data payload owner.

3. `read_path_rule` (where the system is allowed to load or show the thing from)
   - If the system needs to show or load the thing, where may it read it from?
   - This must be concrete enough to constrain implementation.

4. `forbidden_fallback` (which alternative sources must not be used as fallback truth)
   - Which tempting alternative sources must not be used as fallback truth?
   - This should forbid the "smart but wrong" read-paths.

5. `allowed_resolution_path` (which deterministic resolution or reconciliation paths are allowed inside the same authority chain)
   - Which resolution paths are explicitly allowed when the primary read path is not yet materialized but authority is still known?
   - This should prevent reviewers from treating every fallback as forbidden when some same-authority path is intentionally valid.

6. `missing_data_rule` (what happens if the thing is expected but the allowed read path has no data)
   - If the thing is expected but the read-path source has no data, what happens?
   - Required choices:
     - fail closed,
     - explicit neutral unavailable state,
     - hard error,
     - or another clearly bounded behavior.

7. `sequencing_boundary` (which boundary matters for task ordering and ownership)
   - Which boundary must be explicit so downstream tasks do not drift?
   - Use the lightest form that preserves correctness:
     - lightweight plan sequencing note,
     - or detailed task-local ownership when the bounded slice needs it.

## Applicability Rules

### For PRD

At minimum, capture:
1. `business_invariant`
2. `control_model`
3. `missing_data_rule`

If the feature affects user-visible reads or documents/resources, also capture:
4. `read_path_rule`
5. `forbidden_fallback`
6. `allowed_resolution_path` when deterministic same-authority resolution matters

### For Plan

For implementation-oriented plans, this gate is mandatory whenever authority/read-model risk exists.

The plan should include an explicit section such as:
- `Guiding Principles`
- `Control Model`
- or equivalent

That section must capture:
1. business invariant
2. control model
3. read-path rule
4. forbidden fallback
5. allowed resolution path
6. missing-data rule
7. a lightweight sequencing note only when ordering depends on it:
   - producer-first boundary,
   - which downstream consume families remain,
   - whether cleanup/recovery is included now or deferred

If these are not stable enough yet, the plan should stop and request clarification instead of pretending that the phase split is implementation-ready.

### For Task

If the task touches:
- authority/source-of-truth,
- public payload contract,
- read-model selection,
- user-visible unavailable behavior,
- or missing-data handling,

then the task must inherit or restate the relevant control-model clauses explicitly.

Do not rely on vague references like:
- "consume the existing authority"
- "follow the current model"
- "use canonical source"

unless the concrete rule is already written in a referenced artifact and is directly usable.

When authority/read-model/runtime sequencing is involved, the task should also say whether it is:
1. producing authority,
2. aligning internal execution consumers,
3. aligning workflow/orchestration consumers,
4. aligning read-model consumers,
5. activating behavior,
6. or closing cleanup/recovery.
7. preserving an existing deterministic resolution path,
8. intentionally replacing it,
9. or explicitly forbidding it.

## Readiness Decision

Use this outcome:

### `READY`

All of the following are true:
1. The business invariant is explicit.
2. The control model is explicit.
3. The allowed read-path is explicit.
4. Forbidden fallback sources are explicit.
5. Allowed resolution paths are explicit when needed.
6. Missing-data behavior is explicit.
7. The artifact records ownership/sequencing boundaries at the right level:
   - plan: lightweight sequencing note when ordering depends on it,
   - task: detailed bounded-slice ownership where implementation needs it.

### `NOT_READY`

If any of the following is true:
1. The artifact says what the product wants, but not what controls the decision.
2. The artifact names multiple candidate sources, but does not say which one is authoritative for state vs read.
3. Missing-data handling is ambiguous.
4. The spec leaves room for heuristic fallback without naming it as forbidden.
5. The spec forbids a fallback class but does not say which deterministic same-authority resolution paths remain allowed.
6. A phase/task is trying to solve route/UI/runtime questions before control-model ownership is settled.
7. A phase/task is trying to solve producer closure and multiple consumer-family closures in one step without saying so explicitly.

## Mandatory Escalation Behavior

If the gate is `NOT_READY`:
1. Do not emit an `implementable` task as if the contract were complete.
2. Ask focused blocker questions if the missing control-model decision is not clearly recoverable from the available context.
3. Rewrite the artifact to add the missing control-model section first only when the required control-model information is already clearly recoverable from existing references, code, or explicit prior decisions, but is not yet written down.
4. Never invent a control model, fallback rule, or missing-data behavior just to make the artifact look implementable.
5. Never compress sequencing-critical ownership into a vague sentence when producer vs consumer-family closure materially affects ordering.
6. Never treat a preserved deterministic same-authority resolution path as a forbidden fallback unless the artifact says so explicitly.

The skill must be proactive here:
- do not silently continue just because enough technical detail exists to draft something,
- and do not convert control-model gaps into implementation heuristics.

## Focused Blocker Question Patterns

When asking questions, prefer forms like:

1. "Which source decides whether X should exist or be shown?"
2. "If X is expected but missing from Y, should the system fail closed, show unavailable, or try another source?"
3. "Which sources are explicitly forbidden as fallback for X?"
4. "Is this phase only closing the control model, or also surfacing/consume/activation?"
5. "If the primary path is not yet materialized, which deterministic same-authority resolution path is still allowed?"

Keep the questions minimal, but do not skip them when the gate is not ready.
