---
artifact_type: task
artifact_id: task_doc_bubble_start_integration_v1
task_family_id: doc-bubble-start-integration
sequence_key: "3"
task_id: 3-doc-bubble-start-integration
title: "Document Bubble Start Admin Publish Integration"
status: approved
phase: phase3
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md
  - .claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md
prd_ref: null
plan_ref: plans/pre-kickoff-admin-phase-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/pre-kickoff-admin-phase-plan-v1.md
  - plans/archive/tasks/2026-05-04-pre-kickoff-admin-phase-plan-v1/2-prep-admin-publish.md
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/CreateBubble.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md
  - .claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md
  - .claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md
owners:
  - "felho"
doc_bubble_id: 3-doc-bubble-start-integration-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-pre-kickoff-admin-phase-plan-v1
---

# Task: Document Bubble Start Admin Publish Integration

## L0 - Policy

### Goal

Integrate only the `CreateDocumentBubble` route with the pre-kickoff admin
publish pattern so document-bubble start can create an ideation carrier, publish
bounded route-admin changes to clean `main`, verify refreshed postconditions,
and kickoff only after that proof is present.

### Domain / Control Model Summary

1. Business invariant: `main` must contain document-bubble linkage/admin
   metadata before a document task payload is kicked off when this route adopts
   the pre-kickoff admin pattern.
2. Control model: `ExecutePairflowPlan` selects the document route pattern,
   `UsePairflow` owns ideation create/start/kickoff lifecycle, Git owns publish
   proof, and task metadata owns `doc_bubble_id` linkage.
3. Read-path rule: kickoff decisions may read only the structured
   `PublishPreKickoffAdmin` success result plus refreshed `main` task/plan
   metadata and Pairflow ideation hold status.
4. Forbidden fallback: do not infer publish success from bubble worktree files,
   transcript prose, operator memory, stale pre-publish metadata, or an unmerged
   admin commit.
5. Allowed resolution path: create/start an ideation document bubble, persist
   bounded admin in its worktree, publish selected admin paths through
   `PublishPreKickoffAdmin`, re-read `main`, then kickoff that same bubble.
6. Missing-data rule: missing bubble id, worktree, admin commit, publish result,
   refreshed metadata postcondition, or ideation hold proof stops before kickoff.
7. Phase boundary:
   - contract closure: owned here for the document route only
   - producer closure: owned here for document-route publish proof consumption
   - internal execution closure: successor task 4 for implementation route
   - workflow/orchestration closure: owned here for `CreateDocumentBubble`
   - read-model closure: N/A
   - activation closure: owned here for local document route execution
   - cleanup/recovery closure: fail-closed checkpoint only

### Plan Linkage

1. Parent plan gap closed: document-bubble start still uses old admin timing.
2. Depends on: `2-prep-admin-publish`.
3. Unlocks / impacts successors: enables `4-impl-bubble-start-integration` to
   reuse the proven pattern for implementation-bubble creation.
4. Task-list impact: creates planned task `3-doc-bubble-start-integration`;
   it does not supersede existing tasks.
5. Inherited validation / exit expectation: prove that the document-bubble
   route can publish admin and then kickoff, while implementation-bubble
   creation remains functional under the previous path.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/CreateBubble.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
2. Canonical elements: `--ideation`, `ideation.task_pending=true`,
   `doc_bubble_id` as linkage only, `status=approved` during document work,
   and `status=implementable` only after document close.
3. Guard elements: clean main, selected admin scope, admin commit id,
   refreshed metadata postconditions, and refreshed ideation hold proof.
4. Compat-only elements: pre-contract bubble ids may be persisted as concrete
   linkage values, but this task should use the planned document bubble id.
5. Forbidden reinterpretations: do not move lifecycle ownership into
   `ExecutePairflowPlan`, do not modify `UsePairflow`, and do not change
   implementation-bubble routing in this task.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `HandleDocumentBubble`,
   `PublishPreKickoffAdmin`, `ExecutePairflowPlan/SKILL.md`, and delegation
   gate docs.
2. Actual touched scope: workflow/orchestration integration plus fail-closed
   pre-kickoff guard consumption for document-bubble create/start.
3. Mutation entrypoints in scope: document-route task metadata linkage
   persistence for `doc_bubble_id`, bounded admin staging/publish via the
   existing manual workflow, and kickoff after publish proof.
4. Hidden scope ruled out: implementation-bubble route adoption, close aftermath
   verifier-first behavior, `UsePairflow` lifecycle changes, product/source
   implementation, and remote support.
5. Branch inventory note: ideation create/start success, admin publish success,
   dirty-main/admin-scope/publish/postcondition failures, kickoff success, and
   kickoff-not-run fail-closed cases must be represented.
6. Why the declared task shape matches reality: the task consumes the existing
   manual publish workflow from one route only and leaves the implementation
   route on the old path.

### Authority Boundary Map

1. Authority producer: `PublishPreKickoffAdmin` produces structured publish
   proof; Pairflow produces lifecycle status.
2. Stored authority: Git main ref plus refreshed task metadata with
   `doc_bubble_id`.
3. In-scope consumers: `HandleDocumentBubble` create/start flow and top-level
   `CreateDocumentBubble` route reporting.
4. Explicit out-of-scope consumers: implementation-bubble route, close
   aftermath, UI/read models, remote execution, and generic `UsePairflow`.
5. Export surfaces closed in this phase: yes, document route create/start
   becomes proof-gated by the pre-kickoff admin publish result.

### Baseline Preservation

1. Must-preserve behaviors: existing document close/review handling, existing
   implementation-bubble create route, and `UsePairflow` ideation semantics.
2. Allowed resolution paths: fail closed before kickoff when publish proof is
   missing; continue old implementation route behavior unchanged.
3. Forbidden regression interpretations: do not treat the new workflow as
   mandatory for implementation routes, and do not kickoff from unmerged
   worktree state.
4. Replacement proof required if removed: any replacement must prove the same
   clean-main, selected-scope, admin-commit, publish, refreshed-metadata, and
   ideation-hold properties before kickoff.

### Success / Completion Proof Boundary

1. Current canonical success proof source: document bubble create/start can
   persist `doc_bubble_id` around the main route without a pre-kickoff admin
   publish proof.
2. Target canonical success proof source: `PublishPreKickoffAdmin` success plus
   refreshed `main` metadata proving the selected document-route postconditions.
3. Current canonical completion proof source: kickoff/start status plus persisted
   linkage.
4. Target canonical completion proof source: kickoff of the same ideation bubble
   only after publish proof and refreshed linkage are present.
5. Reused proof contract: `PublishPreKickoffAdmin` structured success result.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: document handler local action result and task
   metadata linkage.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`.
2. Secondary shape: `fail_closed_hardening`, because kickoff must stop when
   publish proof is absent.
3. Preconditions that must pass before side effects: approved task,
   no existing `doc_bubble_id`, ideation bubble hold, explicit selected admin
   scope, clean main, admin publish success, refreshed postconditions.
4. Side effects forbidden before preconditions pass: kickoff, reporting a
   settled create boundary, or persisting final linkage from stale state.
5. Invalid/precondition-failure behavior: stop at human checkpoint or settled
   hold with no kickoff.
6. Coordination primitives in scope: no new locks; clean main and selected-scope
   checks remain the coordination guards.

### In Scope

1. Update document-bubble create/start handling to call or require
   `PublishPreKickoffAdmin` before kickoff.
2. Define the document-route postconditions consumed from the publish result.
3. Preserve document-review and document-close behavior.
4. Add targeted validation guidance for document-route success and fail-closed
   no-kickoff cases.

### Out of Scope

1. Implementation-bubble route adoption.
2. Close aftermath verifier-first behavior.
3. `UsePairflow` lifecycle changes.
4. Product/source implementation during pre-kickoff admin.
5. Remote publish support or automatic conflict recovery.

### Safety Defaults

1. If publish proof or refreshed postcondition evidence is missing, stop before
   kickoff and do not report the document-bubble create route as settled.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: yes.
2. Impacted contracts: internal workflow route/result semantics for
   `CreateDocumentBubble` under `ExecutePairflowPlan`.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `10`
8. `single-task allowed`: yes
9. If `no`, required split: N/A
10. Identity/join note:
   - canonical identity path: active task id -> derived `doc_bubble_id` ->
     Pairflow status bubble id -> publish result bubble id
   - competing identifiers or fallback identities: branch names, transcript
     prose, stale task metadata, and unmerged worktree commits
11. Authority/source-of-truth note:
   - canonical source: Pairflow status, publish result, Git main ref, refreshed
     task metadata
   - forbidden secondary sources: operator memory, stale pre-publish reads,
     raw globs, transcript prose
12. Closure-budget triage:
   - closure buckets touched: authority producer, workflow orchestration
     consumer, activation, fail-closed handling
   - intentionally collapsed closures: document route proof consumption and
     kickoff activation, because they are one bounded route path
   - explicitly deferred closures: implementation route and close aftermath
13. Bounded-task-shape decision:
   - primary shape: activation/read-model
   - secondary shape: fail-closed hardening
   - why this bounded mix is safe: the same document route owns both kickoff
     activation and no-kickoff failure behavior.
14. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: status/result taxonomy, structured publish proof,
     fallback/precedence, split ownership, downstream successor inheritance
   - canonical matrix source: L1 Canonical Contract Matrix
   - mirrored surfaces: L0 policy, L1 domain contract, L1 structured rules,
     L1 test matrix

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Document-only adoption | Only `CreateDocumentBubble` adopts pre-kickoff admin publish. | Do not change implementation-bubble create/start routing. | P1 | required-now |
| Publish before kickoff | Kickoff requires successful publish proof and refreshed postconditions. | No kickoff from unmerged bubble worktree or stale metadata. | P1 | required-now |
| Linkage authority | `doc_bubble_id` remains linkage only. | Do not treat it as document completion or approval proof. | P1 | required-now |
| Fail closed | Missing publish proof, missing refreshed linkage, or failed kickoff stops the route. | Return checkpoint/hold; do not report settled create. | P1 | required-now |
| Lifecycle ownership | `UsePairflow` owns create/start/kickoff. | Use existing lifecycle commands and round-0 hold semantics. | P1 | required-now |

### 0a) Canonical Contract Matrix

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| DCM1 | Approved task has no `doc_bubble_id` | HandleDocumentBubble | create ideation document bubble | `DOC_BUBBLE_CREATE_REQUIRED` | retain bubble id/worktree | create/start only | T1 |
| DCM2 | Ideation bubble not in round-0 hold before publish/kickoff | HandleDocumentBubble | human checkpoint | `PRE_KICKOFF_HOLD_NOT_PROVEN` | retain diagnostics | no kickoff | T2 |
| DCM3 | Admin publish fails or lacks proof | PublishPreKickoffAdmin/HandleDocumentBubble | human checkpoint | publish workflow reason code | retain publish diagnostics | no kickoff | T3 |
| DCM4 | Publish succeeds but refreshed metadata lacks `doc_bubble_id` linkage | HandleDocumentBubble | human checkpoint | `DOC_BUBBLE_ADMIN_POSTCONDITION_MISSING` | retain refreshed mismatch | no kickoff | T4 |
| DCM5 | Publish succeeds and refreshed linkage/hold proof match | HandleDocumentBubble | kickoff same bubble and settled create boundary | `DOC_BUBBLE_CREATE_REQUIRED` | return publish proof summary | kickoff allowed | T5 |

### 0b) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Document route publish consumption | yes | publish proof summary in handler result | N/A | do not infer from transcript or worktree | P1 | required-now |
| Implementation route adoption | no | unchanged old path | task 4 | do not require pre-kickoff publish there yet | P1 | required-now |
| Document close | no | unchanged linked bubble follow-up | existing close handler | `doc_bubble_id` is not completion proof | P1 | required-now |

### 0c) Structured Contract Rules

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed / Duplicate Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| Publish result consumed by document route | `workflow`, `publish_result=success`, `bubble_id`, `selected_admin_paths`, `admin_commit`, `published_main_ref`, `postcondition_evidence`, `refreshed_hold_evidence`, `authorization_evidence` | diagnostics | existing `PublishPreKickoffAdmin` success shape | malformed or partial result stops before kickoff | retain diagnostics in checkpoint | human checkpoint / publish reason code | P1 | required-now |
| Document handler local action result | `action_surface=CreateDocumentBubble`, `metadata_postcondition=doc_bubble_id_persisted`, kickoff/publish proof summary | boundary report | handler-local result only, not normalized continuation route | malformed result is not settled | retain local diagnostics | `NO_TRUSTWORTHY_ROUTE` | P1 | required-now |

### 0d) Mirrored Surface Checklist

| Canonical Matrix Row | Mirrored Surfaces | Required Alignment Rule | Summary-Only Surface? | Verification |
|---|---|---|---|---|
| DCM1-DCM5 | L0 policy, handler workflow, structured rules, tests | route adoption must stay document-only | no | T1-T5 |

### 1) Call-Site Matrix

| File | Entry Point / Section | Required Change | Priority | Timing |
|---|---|---|---|---|
| `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md` | create document bubble decision | replace future note with active pre-kickoff admin publish route steps | P1 | required-now |
| `.claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md` | input/output contract | ensure document route names selected postconditions and consumes success proof without redefining publish workflow | P1 | required-now |
| `.claude/skills/ExecutePairflowPlan/SKILL.md` | route/backing workflow contract | document that only document route has adopted the pattern in this slice | P2 | required-now |
| `.claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md` | mutation authorization gate | ensure document route admin side effects remain covered by publish authorization | P2 | required-now |

### 2) Side Effects Contract

| Side Effect | Allowed When | Forbidden When | Priority | Timing |
|---|---|---|---|---|
| create/start ideation document bubble | task approved and `doc_bubble_id=null` | task not approved or linkage exists | P1 | required-now |
| publish selected admin paths to `main` | `PublishPreKickoffAdmin` authorization record exists | scope invalid, main dirty, hold missing | P1 | required-now |
| kickoff document task payload | publish success and refreshed linkage/hold proof are present | publish failed or ambiguous | P1 | required-now |
| report settled create boundary | kickoff succeeded and `doc_bubble_id` persisted | stale or missing metadata | P1 | required-now |

### 3) Error and Fallback Contract

| Case | Required Result | Forbidden Fallback | Priority | Timing |
|---|---|---|---|---|
| Publish fails | human checkpoint before kickoff | kickoff from worktree state | P1 | required-now |
| Refreshed metadata missing linkage | human checkpoint | reuse stale pre-publish task read | P1 | required-now |
| Existing `doc_bubble_id` present | linked-bubble continuation path | create second bubble | P1 | required-now |
| Implementation route reaches create path | old implementation route still works | force pre-kickoff publish in task 3 | P1 | required-now |

### 4) Test Matrix

| Test ID | Scenario | Expected Result | Priority | Timing |
|---|---|---|---|---|
| T1 | Approved task without `doc_bubble_id` enters document create | ideation document bubble is created/started and publish workflow is invoked before kickoff | P1 | required-now |
| T2 | Ideation hold cannot be proven | no kickoff; checkpoint names hold proof failure | P1 | required-now |
| T3 | Publish workflow returns checkpoint | no kickoff; document create route does not settle | P1 | required-now |
| T4 | Publish succeeds but refreshed task lacks expected `doc_bubble_id` | no kickoff; checkpoint names missing postcondition | P1 | required-now |
| T5 | Publish succeeds and refreshed postconditions match | same bubble is kicked off and handler reports settled create boundary | P1 | required-now |
| T6 | Implementation-bubble create route still runs old path | no new pre-kickoff publish requirement for implementation route | P1 | required-now |

### 5) Validation Notes

1. Use docs/skill workflow review plus targeted route-contract checks; this
   task is expected to touch workflow docs rather than TypeScript runtime unless
   implementation proves otherwise.
2. If repo-local skill files change, follow `.claude/skills/INSTALL.md` and the
   repository skill sync policy after the repo-local commit.
3. If direct source/runtime files are touched despite the intended scope, follow
   the repository full verification order and run `pnpm build` before further
   lifecycle commands.

## L2 - Implementation Notes

1. Prefer expressing the adopted route as explicit steps in
   `HandleDocumentBubble.md` rather than adding a new top-level route surface.
2. Keep `PublishPreKickoffAdmin` as a backing workflow; do not make it a
   `target_workflow_surface` returned by `ResolvePlanState`.
3. Later hardening can add a compact example result packet for document-route
   success if review finds ambiguity.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Add an example document-route success packet | L2 | P3 | later-hardening | implementation note | Add only if reviewers find the structured rules too abstract. |

## Assumptions

1. Task 2's `PublishPreKickoffAdmin` workflow is the reusable publish proof
   producer for this document route.
2. No `UsePairflow` source change is required because existing ideation
   create/start/kickoff primitives are sufficient.

## Open Questions

1. None blocking.

## Review Provenance

1. `ReviewSpec task-mode` decision: `approve_task`.
2. Reviewed artifact: `plans/tasks/3-doc-bubble-start-integration.md`.
3. Parent plan context: `plans/pre-kickoff-admin-phase-plan-v1.md`.
4. Result summary: execution metadata, parent-plan fit, document-only route
   boundary, contract-dense matrix, and successor deferral are consistent for
   document-bubble routing.
