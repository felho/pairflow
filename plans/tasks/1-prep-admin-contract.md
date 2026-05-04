---
artifact_type: task
artifact_id: task_prep_admin_contract_v1
task_family_id: prep-admin-contract
sequence_key: "1"
task_id: 1-prep-admin-contract
title: "Pre-Kickoff Admin Contract"
status: approved
phase: phase1
target_files:
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/CreateBubble.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md
prd_ref: null
plan_ref: plans/pre-kickoff-admin-phase-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/pre-kickoff-admin-phase-plan-v1.md
  - .claude/skills/INSTALL.md
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-pre-kickoff-admin-phase-plan-v1
---

# Task: Pre-Kickoff Admin Contract

## L0 - Policy

### Goal

Document the optional pre-kickoff admin pattern for ideation-created bubbles
without changing default runtime behavior or making any `ExecutePairflowPlan`
route depend on the new pattern yet.

This task must leave the skills operational after it lands: existing
create/start/kickoff behavior continues to work, and the new pattern is only a
documented operator/workflow contract for successor tasks to implement.

### Domain / Control Model Summary

1. Business invariant: long admin preparation may happen outside `main`, but
   kickoff for a route that requires admin publish must not start until the
   bounded admin commit is published to `main` and refreshed metadata proves
   the intended postconditions.
2. Control model: ideation-mode bubble state owns the pre-kickoff hold,
   Pairflow lifecycle owns create/start/kickoff truth, task metadata owns
   linkage/status values, and the future admin publish result owns only the
   bounded admin changes it names.
3. Read-path rule: existing route behavior remains the default. The documented
   optional pattern says successor workflows may use the bubble worktree for
   bounded admin, then publish and re-read `main` before kickoff.
4. Forbidden fallback: do not treat an unmerged bubble-worktree admin commit,
   transcript prose, or operator memory as proof that `main` captured the
   lifecycle-relevant state.
5. Allowed resolution path: document the future route sequence as
   `create --ideation -> start -> bounded admin in bubble worktree -> commit ->
   publish to main -> verify -> kickoff`.
6. Missing-data rule: if any proof of admin scope, commit, publish, or refreshed
   postcondition is absent in successor tasks, the workflow must stop before
   kickoff.
7. Phase boundary: this task is docs/skill-contract only. It must not add a new
   command, change kickoff behavior, change route selection, or edit runtime
   source code.

### Plan Linkage

1. Parent plan gap closed: pre-kickoff admin is not formally allowed or bounded.
2. Depends on: no predecessor task.
3. Unlocks / impacts successors:
   - `2-prep-admin-publish` can implement a manual workflow against the
     documented contract.
   - `3-doc-bubble-start-integration` can route document-bubble start through
     the manual workflow once it exists.
   - `4-impl-bubble-start-integration` can route implementation-bubble start
     through the same workflow.
4. Task-list impact: introduces the first task in a new plan and does not
   supersede any existing task.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/CreateBubble.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
2. Canonical elements:
   - `RUNNING round=0` ideation state is a valid hold.
   - `ideation.task_pending=true` means kickoff is still pending.
   - `doc_bubble_id` and `impl_bubble_id` are linkage-only metadata.
   - `status=approved`, `status=implementable`, and `status=in_progress`
     retain their existing metadata meanings.
3. Guard elements:
   - pre-kickoff admin is optional after this task.
   - allowed admin scope is bounded to plan/task/progress metadata and directly
     related docs/admin notes.
4. Forbidden reinterpretations:
   - Do not rename or replace ideation mode.
   - Do not make pre-kickoff admin mandatory in this task.
   - Do not allow product/source implementation during pre-kickoff admin.
   - Do not treat admin documentation as an implemented publish workflow.

### Scope Reality / Shape Proof

1. Inspected entrypoints / workflow surfaces:
   - `UsePairflow` create/start/kickoff routing rules.
   - `CreateBubble` round-0 hold rules.
   - `ExecutePairflowPlan` route and delegation contract.
   - document and implementation bubble handler metadata postconditions.
2. Actual touched scope: skill documentation and workflow contract wording only.
3. Mutation entrypoints in scope: repo-local skill markdown files only.
4. Hidden scope ruled out: TypeScript command implementation, lifecycle state
   machine changes, new CLI commands, route behavior switches, and tests beyond
   docs validation.
5. Dependency reality: successor tasks need this contract before implementing
   manual publish or route integration.
6. Why the declared task shape matches reality: the task changes only the
   written workflow contract and keeps all behavior changes deferred.

### Authority Boundary Map

1. Authority producer: this task produces the documented pre-kickoff admin
   contract.
2. Stored authority: repo-local skill files under `.claude/skills/**`.
3. In-scope consumers: future `UsePairflow` manual publish workflow and future
   `ExecutePairflowPlan` route integrations.
4. Explicit out-of-scope consumers: Pairflow runtime commands, remote routing,
   close aftermath implementation, and product/source code.
5. Export surfaces closed in this phase: documentation-only contract language.
6. Skill distribution boundary: repo-local `.claude/skills/**` files remain the
   editable source of truth. Installed global skill copies are derived
   artifacts; this task must document the required sync handoff when it touches
   `UsePairflow`, but it must not manually edit installed global copies.

### Baseline Preservation

1. Must-preserve behaviors:
   - `CreateBubble` still creates and starts ideation bubbles without auto
     kickoff.
   - Existing non-admin kickoff flows remain valid.
   - Existing document and implementation bubble route contracts remain
     executable.
2. Allowed resolution paths:
   - Add optional contract notes and successor-task handoff language.
   - Add explicit allowed/forbidden admin scope.
   - Add continuity rule: every successor task must leave the skill usable.
3. Forbidden regression interpretations:
   - Do not require pre-kickoff admin publish before all kickoffs.
   - Do not introduce a required state field that no current command can write.
   - Do not make `ExecutePairflowPlan` depend on a future workflow.
4. Replacement proof required if removed: if any existing CreateBubble or
   ExecutePairflowPlan wording is replaced, the new wording must still state
   the old route remains valid until a successor task changes that route.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_documentation`.
2. Secondary adjacent shape: `workflow_orchestration_contract`, limited to
   optional future behavior.
3. Preconditions for implementation: no runtime precondition changes.
4. Side effects forbidden: CLI behavior changes, lifecycle mutation changes,
   route selection changes, direct manual edits to global installed skill
   copies, and product/source code edits.
5. Invalid/path-failure behavior: N/A for this docs-only task.
6. Coordination primitives in scope: N/A.

### Closure / Risk Triage

1. Complexity risk: `risk_score=4`.
2. Risk basis: cross-skill lifecycle wording, future route dependency, and
   metadata authority semantics.
3. Split decision: keep as one docs-only task because behavior changes are
   explicitly deferred.
4. Identity join risk: low; no runtime identity changes are introduced.
5. Authority/source-of-truth note: skill documentation becomes the source for
   successor task behavior, but does not supersede Pairflow runtime state.
6. Closure buckets touched: `workflow_orchestration_consumers` and
   `shared_contract`.
7. Collapsed closures: optional contract and successor sequencing note.
8. Deferred closures: manual publish workflow, document route integration,
   implementation route integration, and close verifier.

### In Scope

1. Update repo-local `UsePairflow` skill docs to describe optional bounded
   pre-kickoff admin for ideation-created bubbles.
2. Update `CreateBubble` workflow docs to preserve round-0 hold while naming
   pre-kickoff admin as a separate optional follow-up.
3. Update repo-local `ExecutePairflowPlan` docs to mention that future route
   integrations may use the pre-kickoff admin pattern, but existing routes
   remain valid after this task.
4. Update document and implementation bubble handler docs with future-facing
   notes about admin publish postconditions, without changing their current
   route requirements.
5. State allowed and forbidden admin scope.
6. State the after-each-task operability rule.
7. State the repo-required skill source-of-truth and sync handoff for
   `UsePairflow` changes: repo-local source first, repo-local commit first,
   then documented installer/sync to `~/.claude/skills`, with the synced global
   skill changes committed separately.

### Out of Scope

1. Adding `pairflow bubble publish-admin` or any equivalent command.
2. Implementing a new `UsePairflow` workflow body for admin publish.
3. Changing `ExecutePairflowPlan` route selection.
4. Changing `bubble kickoff`, `bubble merge`, or runtime lifecycle state.
5. Directly editing installed global skills under `$HOME` as source files.
6. Product/source implementation.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Optional pattern | Pre-kickoff admin is documented but not required. | Existing flows remain valid after this task. | P1 | required-now |
| Allowed scope | Admin scope is plan/task/progress metadata and directly related docs/admin notes. | Product/source code remains forbidden during pre-kickoff admin. | P1 | required-now |
| Publish proof | Future kickoff gating must rely on published `main` state, not unmerged worktree state. | Document the proof requirement without implementing it yet. | P1 | required-now |
| Continuity | Every successor task must leave the skill usable. | Avoid future-state dependencies in this task. | P1 | required-now |
| Skill sync handoff | `UsePairflow` source changes require repo-local source edits first and documented install/sync after the repo-local commit. | The task must update acceptance/validation wording so installed global copies are treated as derived artifacts, not source. | P1 | required-now |
| Ideation naming | Keep `ideation` as the technical mode name. | Do not rename flags or metadata. | P2 | required-now |

### 0a) Canonical Contract Matrix

| ID | Case | Owner | Result | Reason Code | Side Effects | Test |
|---|---|---|---|---|---|---|
| PCM1 | Existing ideation create/start flow | current task | documented as preserved | N/A | docs only | T1 |
| PCM2 | Optional pre-kickoff admin described | current task | allowed as future/manual pattern | N/A | docs only | T2 |
| PCM3 | Product/source code during admin phase | current task | documented forbidden | N/A | docs only | T3 |
| PCM4 | Kickoff after failed admin publish | successor task | documented forbidden | N/A | none in this task | T4 |
| PCM5 | Route integration before manual workflow exists | current task | documented deferred | N/A | docs only | T5 |
| PCM6 | `UsePairflow` repo-local source changes | current task | sync handoff documented | N/A | docs only | T6 |

### 0b) Ownership and Deferred Semantics

| Surface / Decision | Owned Here | Emits / Records Only | Deferred Owner | Forbidden Interpretation | Priority |
|---|---|---|---|---|---|
| Optional pre-kickoff admin contract | yes | yes | N/A | Documentation does not implement publish. | P1 |
| Manual admin publish workflow | no | yes | `2-prep-admin-publish` | Do not route through a missing workflow. | P1 |
| Document route integration | no | yes | `3-doc-bubble-start-integration` | Do not change `CreateDocumentBubble` yet. | P1 |
| Implementation route integration | no | yes | `4-impl-bubble-start-integration` | Do not change `CreateImplementationBubble` yet. | P1 |
| Close verifier | no | yes | `5-close-admin-verifier` | Do not alter post-close behavior here. | P2 |
| Installed global skill copies | no | yes | documented skill install/sync workflow | Do not edit `$HOME` skill copies as source. | P1 |

### 0c) Mirrored Surface Checklist

1. `UsePairflow/SKILL.md` core principles and execution-mode notes.
2. `UsePairflow/Workflows/CreateBubble.md` post-start hold and follow-up
   language.
3. `ExecutePairflowPlan/SKILL.md` route/delegation commentary.
4. `HandleDocumentBubble.md` create route future admin postcondition note.
5. `HandleImplementationBubble.md` create route future admin postcondition note.
6. `.claude/skills/INSTALL.md` skill sync handoff wording.

### L1 Acceptance

1. The new wording explicitly says the pattern is optional after this task.
2. The new wording says successor tasks may make specific routes use the
   pattern later.
3. The new wording preserves existing create/start/kickoff behavior.
4. Allowed/forbidden admin scope is explicit.
5. Kickoff-after-failed-publish is documented as forbidden for future
   integrated routes.
6. No runtime source files are modified.
7. The task updates repo-local skill wording so `UsePairflow` changes carry the
   required post-commit install/sync handoff and do not treat installed global
   skill copies as editable source.

## L2 - Implementation Notes

### Suggested Edits

1. In `UsePairflow/SKILL.md`, add a short section describing bounded
   pre-kickoff administration for ideation-created bubbles:
   - valid only while task payload is pending,
   - allowed edits are metadata/progress/docs admin,
   - product/source implementation remains forbidden,
   - successor workflow must publish and verify before kickoff when a route
     requires admin.
2. In `CreateBubble.md`, extend the post-start note:
   - default remains round-0 hold,
   - pre-kickoff admin prep is a separate optional follow-up,
   - CreateBubble itself must not perform admin or kickoff.
3. In `ExecutePairflowPlan/SKILL.md`, add the continuity rule:
   - current routes remain valid until a specific integration task changes
     them,
   - route-caused adoption must happen one route at a time.
4. In document and implementation bubble handler docs, add a future-facing note
   that their create routes may later be backed by pre-kickoff admin publish,
   but current postconditions remain unchanged in this task.
5. Add a concise source-of-truth/sync note wherever the task introduces
   `UsePairflow` changes:
   - repo-local `.claude/skills/UsePairflow/**` is source,
   - installed global skill copies are derived,
   - after the repo-local skill commit, run the documented installer/sync
     workflow to `~/.claude/skills`,
   - commit the synced global-skill change separately.

### Validation

1. Review the changed skill markdown for contradictions:
   - no mandatory state field introduced,
   - no route made dependent on task 2,
   - no behavior switch implied,
   - no installed global skill path treated as editable source.
2. Run a narrow text search:
   - `rg "pre-kickoff|admin publish|task_pending" .claude/skills`
3. If `UsePairflow` repo-local source wording changed, verify the task output
   names the follow-up installer/sync requirement from `.claude/skills/INSTALL.md`.
4. Because this task is docs-only, full `pnpm test` is not required unless the
   implementer touches runtime/source files.

### Done Signal

This task is complete when the repo-local skill docs describe the optional
pattern clearly enough for task 2 to implement a manual workflow, while the old
Pairflow and ExecutePairflowPlan routes remain usable without any new command.
