---
artifact_type: task
artifact_id: task_<feature>_<phase>_<slug>_v1
task_family_id: <stable-task-family-slug>
sequence_key: "<short-sequence-key>"
task_id: <sequence_key>-<task_family_id>
title: "<Task Title>"
status: draft
phase: phase1
target_files:
  - "src/..."
prd_ref: docs/prd/<feature>-prd.md
plan_ref: plans/<feature>-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "<owner>"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: <created_on>-<plan_id-or-null>
---

# Task: <Task Title>

## L0 - Policy

### Goal

<1-3 lines>

### Domain / Control Model Summary

1. Business invariant: <What must remain true from the business/domain perspective. If N/A, say N/A.>
2. Control model: <Which source decides whether something should exist, happen, or be shown. If N/A, say N/A.>
3. Read-path rule: <Where the implementation may read the thing from. If N/A, say N/A.>
4. Forbidden fallback: <Which sources must not be used as fallback truth. If N/A, say N/A.>
5. Allowed resolution path: <Which deterministic resolution/reconciliation paths are allowed inside the same authority chain. If N/A, say N/A.>
6. Missing-data rule: <What happens if the thing is expected but missing. If N/A, say N/A.>
7. Phase boundary:
   - contract closure: <owned here or successor>
   - producer closure: <owned here or successor>
   - internal execution closure: <owned here or successor>
   - workflow/orchestration closure: <owned here or successor>
   - read-model closure: <owned here or successor>
   - activation closure: <owned here or successor>
   - cleanup/recovery closure: <owned here or successor>

### Plan Linkage

Include this section when `plan_ref` is non-null. Otherwise say `N/A`.

1. Parent plan gap closed: <What plan-level gap this task closes, or `N/A`.>
2. Depends on: <Predecessor task/ref or `N/A`.>
3. Unlocks / impacts successors: <Successor task(s), delayed consumers, or `N/A`.>
4. Task-list impact: <refines|replaces|obsoletes `task_id` list, or `N/A`.>
5. Inherited validation / exit expectation: <What plan-level evidence or exit expectation this task contributes to, or `N/A`.>

### Canonical Contract Anchors

Include this section when the task refines an already-closed authority/shared/read-model contract. Otherwise say `N/A`.

1. Source-of-truth anchors: <List repo-local docs/code/tests that define the current contract, or `N/A`.>
2. Canonical elements: <Fields/terms that remain canonical, or `N/A`.>
3. Guard elements: <Validation/correlation guards that must not be promoted to canonical truth, or `N/A`.>
4. Compat-only elements: <Rehydration/mirror/compat inputs that must stay secondary, or `N/A`.>
5. Forbidden reinterpretations: <Meaning changes that are not allowed in this task, or `N/A`.>

### Scope Reality / Shape Proof

Include this section when `target_files` are known. Otherwise say `N/A`.

1. Inspected entrypoints / call-sites: <Which target files and adjacent entrypoints were actually inspected, or `N/A`.>
2. Actual touched scope: <producer | consumer-family alignment | activation/read-model | fail-closed | coordination | mixed + note>
3. Mutation entrypoints in scope: <List concrete write paths / route handlers / command handlers, or `N/A`.>
4. Hidden scope ruled out: <What was checked to rule out hidden producer/fail-closed/coordination scope, or `N/A`.>
5. Branch inventory note: <fresh/reused, success/failure, retry/no-retry, precondition-pass/fail, or `N/A`.>
6. Why the declared task shape matches reality: <Short scope-proof, or `TODO_BLOCKER`.>

### Authority Boundary Map

1. Authority producer: <What produces canonical authority in or before this task. If N/A, say N/A.>
2. Stored authority: <What persists the authority. If N/A, say N/A.>
3. In-scope consumers: <Which consume families this task is allowed to align. If N/A, say N/A.>
4. Explicit out-of-scope consumers: <Which consume families must not be pulled in. If N/A, say N/A.>
5. Export surfaces closed in this phase: <yes|no + what exactly. If N/A, say N/A.>

### Baseline Preservation

Include this section when the task refines or replaces an existing canonicalization, finalize, or reconciliation path. Otherwise say `N/A`.

1. Must-preserve behaviors: <List concrete current behaviors that must survive unchanged, or `N/A`.>
2. Allowed resolution paths: <List deterministic same-authority paths that are allowed, or `N/A`.>
3. Forbidden regression interpretations: <What reviewers/implementers must not "tighten" away, or `N/A`.>
4. Replacement proof required if removed: <What exact replacement/equivalence evidence is required, or `N/A`.>

### Success / Completion Proof Boundary

Include this section when the task changes an existing mutable flow's completion semantics or final truth surfaces. Otherwise say `N/A`.

1. Current canonical success proof source: <What currently proves success, or `N/A`.>
2. Target canonical success proof source: <What proves success after this task, or `N/A`.>
3. Current canonical completion proof source: <What currently proves completion/finalization, or `N/A`.>
4. Target canonical completion proof source: <What proves completion/finalization after this task, or `N/A`.>
5. Reused proof contract: <cleanup/delete/reconcile contract reused here, or `N/A`.>
6. Proof-parity rule: <`inherit_full_parity | narrowed_here_with_proof | no_reuse`>
7. Final truth surfaces affected: <result fields / status fields / lifecycle events + note, or `N/A`.>
8. Mixed-truth surfaces allowed: <none | explicit compat-only list + why safe>

### Precondition and Side-Effect Boundary

Include this section when the task modifies an existing mutation flow or introduces coordination primitives. Otherwise say `N/A`.

1. Primary bounded task shape: <one of `contract_or_persisted_authority_foundation|authority_producer|consumer_family_alignment|fail_closed_hardening|coordination_concurrency_hardening|activation_or_read_model`>
2. Secondary shape (if any): <one optional adjacent shape + bounded-proof note, or `N/A`.>
3. Preconditions that must pass before side effects: <List or `N/A`.>
4. Side effects forbidden before preconditions pass: <List concrete forbidden early mutations, or `N/A`.>
5. Invalid/precondition-failure behavior: <zero side effects | bounded side effects + exact rule | `N/A`.>
6. Coordination primitives in scope: <locks/mutexes/leases/idempotency/serialization or `N/A`.>

### In Scope

1. <item>

### Out of Scope

1. <item>

### Safety Defaults

1. <default-safe behavior>

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes|no`
2. If `yes`, list impacted contracts (DB/API/event/auth/config) and keep `plan_ref` non-null.

### Complexity Risk Gate

1. `authority_risk`: `0|1|2`
2. `surface_spread`: `0|1|2`
3. `identity_join_risk`: `0|1|2`
4. `activation_coupling`: `0|1|2`
5. `prerequisite_risk`: `0|1|2`
6. `acceptance_multiplicity`: `0|1|2`
7. `risk_score`: `<0-12>`
8. `single-task allowed`: `yes|no`
9. If `no`, required split:
   - `foundation/refactor`
   - `delivery`
   - `activation/rollout` (optional)
10. Identity/join note:
   - canonical identity path: `<text>`
   - competing identifiers or fallback identities: `<text>`
11. Authority/source-of-truth note:
   - canonical source: `<text>`
   - forbidden secondary sources: `<text>`
12. Closure-budget triage:
   - closure buckets touched: `<list or N/A>`
   - intentionally collapsed closures: `<list + why safe, or N/A>`
   - explicitly deferred closures: `<list or N/A>`
13. Bounded-task-shape decision:
   - primary shape: `<text>`
   - secondary shape: `<text or N/A>`
   - why this bounded mix is safe: `<text or N/A>`
14. Contract-dense decision:
   - gate triggered: `<yes|no>`
   - trigger reasons: `<API/result shape|status taxonomy|structured payload|fallback/precedence|split ownership|downstream consumers|mirrored surfaces|N/A>`
   - canonical matrix source: `<section/ref or N/A>`
   - mirrored surfaces: `<list or N/A>`

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | <explicit rule or `N/A`> | <what implementation must preserve> | P1 | required-now |
| Control model | <explicit rule or `N/A`> | <what is allowed to decide existence/state/visibility> | P1 | required-now |
| Read-path rule | <explicit rule or `N/A`> | <where implementation may read from> | P1 | required-now |
| Forbidden fallback | <explicit rule or `N/A`> | <what must not be used as fallback truth> | P1 | required-now |
| Allowed resolution path | <explicit rule or `N/A`> | <which deterministic same-authority paths remain valid> | P1 | required-now |
| Missing-data rule | <explicit rule or `N/A`> | <fail-closed/unavailable/error behavior> | P1 | required-now |
| Phase boundary | <explicit rule or `N/A`> | <what this task owns vs successor tasks across contract/producer/consume/activation/cleanup> | P2 | required-now |

### 0a) Canonical Contract Preservation (if applicable)

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| <canonical/guard/compat term or `N/A`> | <ref or `N/A`> | <meaning that must stay fixed> | <preserve|authorized_reinterpretation|N/A> | P1 | required-now |

### 0b) Scope Reality and Shape Proof (if applicable)

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | <explicit rule or `N/A`> | <what concrete files/entrypoints define the real scope> | P1 | required-now |
| Actual touched scope | <explicit rule or `N/A`> | <which correctness closure is actually touched> | P1 | required-now |
| Mutation entrypoints in scope | <explicit rule or `N/A`> | <which write paths must be treated as mutation scope> | P1 | required-now |
| Hidden scope ruled out | <explicit rule or `N/A`> | <what was checked to rule out hidden producer/fail-closed/coordination work> | P1 | required-now |
| Branch inventory note | <explicit rule or `N/A`> | <which branch families must be represented in L1/tests> | P1 | required-now |
| Shape proof | <explicit rule or `N/A`> | <why the declared bounded-task shape is still true> | P1 | required-now |

### 0c) Plan Linkage and Successor Impact (if applicable)

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | <explicit rule or `N/A`> | <what plan-level gap this task resolves> | P1 | required-now |
| Depends on | <task/ref or `N/A`> | <what predecessor must already hold> | P1 | required-now |
| Unlocks / impacts successors | <task/ref list or `N/A`> | <what later work remains or changes> | P1 | required-now |
| Task-list impact | <refines|replaces|obsoletes|`N/A`> | <what existing open task is affected> | P1 | required-now |
| Inherited validation / exit expectation | <explicit rule or `N/A`> | <what evidence or exit expectation this task must satisfy> | P1 | required-now |

### 0d) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| <path/interface/result-shape> | <list or `N/A`> | <type> | <what this task does> | <successor task or `N/A`> |

### 0e) Baseline Preservation (if applicable)

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| <current deterministic path or `N/A`> | <preserve|replace|forbid> | <equivalence/replacement evidence or `N/A`> | P1 | required-now |

### 0f) Success / Completion Proof Boundary (if applicable)

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| <result/status/event surface or `N/A`> | <text> | <text> | <canonical|compat|guard> | <no|yes + why> | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary (if applicable)

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| invalid input / unmet precondition | <validation or `N/A`> | <forbidden mutation(s) or `N/A`> | <zero-side-effect or bounded failure rule> | P1 | required-now |

### 0h) Canonical Contract Matrix (if Contract-Dense Task Gate applies)

Use this as the source of truth for dense contracts. Other sections may
summarize or reference these rows, but must not define conflicting behavior.

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| CCM1 | <condition or `N/A`> | <current task|successor|consumer|N/A> | <status/result> | <code or `N/A`> | <fields retained/dropped> | <allowed/forbidden> | <T* or `N/A`> |

### 0i) Ownership and Deferred Semantics (if Contract-Dense Task Gate applies)

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| <contract surface or `N/A`> | <yes/no + rule> | <data emitted but not interpreted> | <successor/consumer or `N/A`> | <forbidden inference> | P1 | required-now |

### 0j) Structured Contract Rules (if applicable)

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed / Duplicate Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| <schema/payload/result or `N/A`> | <fields> | <fields> | <allowlist> | <behavior> | <retained/dropped> | <status/code> | P1 | required-now |

### 0k) Mirrored Surface Checklist (if Contract-Dense Task Gate applies)

| Canonical Matrix Row | Mirrored Surfaces | Required Alignment Rule | Summary-Only Surface? | Verification |
|---|---|---|---|---|
| <CCM*> | <L0/branch inventory/§2/§4/§4a/§6/parent plan/etc.> | <what must stay aligned> | <yes/no + source row> | <how checked> |

### 0l) Capability Closure (if applicable)

| Capability Claim | Activation Trigger | Entrypoint | Config Owner | Repo-Provided Parts | External Prerequisites | Success Output | Failure Output | Operator/User/System Path | Last-Mile Proof | Closure Classification |
|---|---|---|---|---|---|---|---|---|---|---|
| <claim or `N/A`> | <trigger or `N/A`> | <entrypoint or `N/A`> | <repo|operator|deployment|external service|N/A> | <repo/product-shipped parts> | <prereqs or `N/A`> | <observable success contract> | <fail-closed/error/unavailable contract> | <documented path> | <test/pilot/evidence or successor task> | <end_to_end|externally_activated|hook_only|foundation_only|deferred_activation|`N/A`> |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | <path> | <name> | <sig> | <point> | <behavior> | P1 | required-now | <proof> |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Input type/schema | <text> | <text> | <fields> | <fields> | non-breaking | P1 | required-now |
| Output type/schema | <text> | <text> | <fields> | <fields> | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| DB/Event/FS/Network | <text> | <text> | <text> | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| <condition> | <dep-or-N/A> | <behavior> | <fallback> | <code> | <level> | P1 | required-now |
| dependency failure | <service/db/api> | fallback | <safe default> | DEPENDENCY_FAIL | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | <list> | P2 | required-now |
| must-not-use | <list> | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | golden path | <state> | <action> | <expected> | P1 | required-now | <proof> |
| T2 | invalid input | <state> | <action> | <expected> | P1 | required-now | <proof> |
| T3 | precondition failure side-effect boundary | <state> | <action> | <no side effects or bounded side effects proven> | P1 | required-now | <proof or `N/A` if section above is N/A> |

## L2 - Implementation Notes (Optional)

1. [later-hardening] <non-blocking detail>
2. [later-hardening] <non-blocking detail>

## Hardening Backlog (Optional)

Use this section to track non-blocking review items (`later-hardening`) that should not prevent implementation.

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | <item> | L2 | P2 | later-hardening | <review round/ref> | <drop or open follow-up task> |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.
6. If a shared contract changes, current-consumer inventory and additive-vs-breaking classification are mandatory.
7. If an authority fan-out exists, the authority boundary map must stay consistent with the bounded task scope.
8. If baseline behavior is removed or replaced, the task must name the exact replacement path and the proof expected from validation.
9. If `plan_ref` is non-null, `Plan Linkage` and the inherited validation/exit expectation are mandatory and must stay consistent with successor impact notes.
10. If a capability claim is in scope, `Capability Closure` must align with
   Done Definition / acceptance wording and the test matrix. End-to-end claims
   require last-mile proof; hook/foundation/deferred work must not assert fully
   usable automation.
11. If `target_files` are known, `Scope Reality / Shape Proof` is mandatory and the declared task shape must match the inspected touched scope.
12. If the task refines an already-closed authority/shared contract, `Canonical Contract Anchors` and `Canonical Contract Preservation` are mandatory.
13. New terminology for an existing contract must map back to source anchors and field roles explicitly before it can become `required-now`.
14. If the Contract-Dense Task Gate triggers, `Canonical Contract Matrix`,
   `Ownership and Deferred Semantics`, and `Mirrored Surface Checklist` are
   mandatory.
15. If structured input/output is part of a dense contract, `Structured Contract
   Rules` is mandatory and must use allowlist/rejection behavior instead of
   prose-only validity language.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
