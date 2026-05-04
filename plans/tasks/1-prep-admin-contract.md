---
artifact_type: task
artifact_id: task_prep_admin_contract_v1
task_family_id: prep-admin-contract
sequence_key: "1"
task_id: 1-prep-admin-contract
title: "Pre-Kickoff Admin Contract"
status: done
phase: phase1
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md
prd_ref: null
plan_ref: plans/pre-kickoff-admin-phase-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/pre-kickoff-admin-phase-plan-v1.md
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/CreateBubble.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md
owners:
  - "felho"
doc_bubble_id: 1-prep-admin-contract-doc
impl_bubble_id: 1-prep-admin-contract-doc
supersedes: []
superseded_by: null
archive_group: 2026-05-04-pre-kickoff-admin-phase-plan-v1
---

# Task: Pre-Kickoff Admin Contract

## L0 - Policy

### Goal

Document, inside `ExecutePairflowPlan`, the optional pre-kickoff admin-container
route pattern for ideation-created bubbles without changing default runtime
behavior and without modifying `UsePairflow`.

This task must leave the skills operational after it lands: existing
create/start/kickoff behavior continues to work, and the new pattern is only a
documented route-selection contract for successor tasks to implement.

### Domain / Control Model Summary

1. Business invariant: long admin preparation may happen outside `main`, but
   kickoff for a route that requires admin publish must not start until the
   bounded admin commit is published to `main` and refreshed metadata proves
   the intended postconditions.
2. Control model: existing `UsePairflow` lifecycle state owns create/start and
   round-0 hold truth, `ExecutePairflowPlan` owns route selection, task metadata
   owns linkage/status values, and a future admin publish result owns only the
   bounded admin changes it names.
3. Read-path rule: existing route behavior remains the default. The documented
   optional pattern says successor `ExecutePairflowPlan` workflows may use the
   bubble worktree for bounded admin, then publish and re-read `main` before
   kickoff.
4. Forbidden fallback: do not treat an unmerged bubble-worktree admin commit,
   transcript prose, or operator memory as proof that `main` captured the
   lifecycle-relevant state.
5. Allowed resolution path: document the future route sequence as
   `create --ideation -> start/round-0 hold -> bounded admin in bubble worktree
   -> commit -> publish to main -> verify -> kickoff`.
6. Missing-data rule: if any proof of admin scope, commit, publish, or refreshed
   postcondition is absent in successor tasks, the workflow must stop before
   kickoff.
7. Phase boundary: this task is docs/skill-contract only. It must not add a new
   command, change kickoff behavior, change route selection, edit runtime
   source code, or edit `UsePairflow`.

### Plan Linkage

1. Parent plan gap closed: `ExecutePairflowPlan` has no explicit contract for
   bounded admin before kickoff.
2. Depends on: no predecessor task.
3. Unlocks / impacts successors:
   - `2-prep-admin-publish` can document or implement a manual publish workflow
     against the `ExecutePairflowPlan` route contract.
   - `3-doc-bubble-start-integration` can route document-bubble start through
     the manual workflow once it exists.
   - `4-impl-bubble-start-integration` can route implementation-bubble start
     through the same workflow.
4. Task-list impact: updates the first task in the plan and does not supersede
   any existing task.

### Canonical Contract Anchors

1. Source-of-truth anchors for this task:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
2. Baseline anchors, not target files:
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/CreateBubble.md`
3. Canonical elements:
   - `RUNNING round=0` ideation state is a valid existing hold.
   - `ideation.task_pending=true` means kickoff is still pending.
   - `doc_bubble_id` and `impl_bubble_id` are linkage-only metadata.
   - `status=approved`, `status=implementable`, and `status=in_progress`
     retain their existing metadata meanings.
4. Guard elements:
   - pre-kickoff admin is optional after this task.
   - allowed admin scope is bounded to plan/task/progress metadata and directly
     related docs/admin notes.
   - `UsePairflow` is referenced only to preserve and rely on existing
     round-0 hold/kickoff semantics.
5. Forbidden reinterpretations:
   - Do not rename or replace ideation mode.
   - Do not make pre-kickoff admin mandatory in this task.
   - Do not allow product/source implementation during pre-kickoff admin.
   - Do not treat admin documentation as an implemented publish workflow.
   - Do not move ownership of this route pattern into `UsePairflow`.

### Scope Reality / Shape Proof

1. Inspected entrypoints / workflow surfaces:
   - `UsePairflow` create/start/kickoff routing rules as baseline semantics.
   - `CreateBubble` round-0 hold rules as baseline semantics.
   - `ExecutePairflowPlan` route and delegation contract.
   - document and implementation bubble handler metadata postconditions.
2. Actual touched scope: `ExecutePairflowPlan` skill documentation and workflow
   contract wording only.
3. Mutation entrypoints in scope: repo-local `ExecutePairflowPlan` markdown
   files only.
4. Hidden scope ruled out: `UsePairflow` edits, TypeScript command
   implementation, lifecycle state machine changes, new CLI commands, route
   behavior switches, and tests beyond docs validation.
5. Dependency reality: successor tasks need this contract before implementing
   manual publish or route integration.
6. Why the declared task shape matches reality: the task changes only the
   written `ExecutePairflowPlan` route contract and keeps all behavior changes
   deferred.

### Authority Boundary Map

1. Authority producer: this task produces the documented
   `ExecutePairflowPlan` pre-kickoff admin-container route contract.
2. Stored authority: repo-local `ExecutePairflowPlan` skill files under
   `.claude/skills/ExecutePairflowPlan/**`.
3. In-scope consumers: future `ExecutePairflowPlan` manual publish workflow and
   future `ExecutePairflowPlan` route integrations.
4. Explicit out-of-scope consumers: `UsePairflow` lifecycle docs, Pairflow
   runtime commands, remote routing, close aftermath implementation, and
   product/source code.
5. Export surfaces closed in this phase: documentation-only contract language.
6. Skill distribution boundary: repo-local `.claude/skills/**` files remain the
   editable source of truth. Installed global skill copies are derived
   artifacts and must not be edited as source.

### Baseline Preservation

1. Must-preserve behaviors:
   - `UsePairflow` still creates and starts ideation bubbles without auto
     kickoff.
   - Existing non-admin kickoff flows remain valid.
   - Existing document and implementation bubble route contracts remain
     executable.
2. Allowed resolution paths:
   - Add optional `ExecutePairflowPlan` route-contract notes and successor-task
     handoff language.
   - Add explicit allowed/forbidden admin scope.
   - Add continuity rule: every successor task must leave the skill usable.
3. Forbidden regression interpretations:
   - Do not require pre-kickoff admin publish before all kickoffs.
   - Do not introduce a required state field that no current command can write.
   - Do not make `ExecutePairflowPlan` depend on a future workflow.
   - Do not imply that `UsePairflow` owns the route decision.
4. Replacement proof required if removed: if any existing `ExecutePairflowPlan`
   wording is replaced, the new wording must still state the old route remains
   valid until a successor task changes that route.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary adjacent shape: N/A.
3. Shape rationale: this is a docs-only shared route contract foundation for
   `ExecutePairflowPlan`; runtime activation and route behavior changes are
   explicitly deferred to successor tasks.
4. Preconditions for implementation: no runtime precondition changes.
5. Side effects forbidden: CLI behavior changes, lifecycle mutation changes,
   route selection changes, `UsePairflow` edits, direct manual edits to global
   installed skill copies, and product/source code edits.
6. Invalid/path-failure behavior: N/A for this docs-only task.
7. Coordination primitives in scope: N/A.

### Closure / Risk Triage

1. Complexity risk: `risk_score=4`.
2. Risk basis: cross-skill baseline dependency, future route dependency, and
   metadata authority semantics.
3. Split decision: keep as one docs-only task because behavior changes are
   explicitly deferred and `UsePairflow` edits are out of scope.
4. Identity join risk: low; no runtime identity changes are introduced.
5. Authority/source-of-truth note: `ExecutePairflowPlan` documentation becomes
   the source for successor route behavior, but does not supersede Pairflow
   runtime state.
6. Closure buckets touched: `workflow_orchestration_consumers` and
   `shared_contract`.
7. Collapsed closures: optional contract and successor sequencing note.
8. Deferred closures: manual publish workflow, document route integration,
   implementation route integration, and close verifier.

### In Scope

1. Update repo-local `ExecutePairflowPlan` docs to describe the optional
   bounded pre-kickoff admin-container route pattern.
2. State that `ExecutePairflowPlan` may choose this pattern for selected future
   routes while existing routes remain valid after this task.
3. Update document and implementation bubble handler docs with future-facing
   notes about admin publish postconditions, without changing their current
   route requirements.
4. State allowed and forbidden admin scope.
5. State the after-each-task operability rule.
6. State that `UsePairflow` provides the existing round-0 hold/kickoff
   primitive baseline and is not modified by this task.

### Out of Scope

1. Adding `pairflow bubble publish-admin` or any equivalent command.
2. Implementing a new manual admin publish workflow body.
3. Changing `ExecutePairflowPlan` route selection.
4. Changing `bubble kickoff`, `bubble merge`, or runtime lifecycle state.
5. Editing `UsePairflow` docs or workflows.
6. Directly editing installed global skills under `$HOME` as source files.
7. Product/source implementation.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Optional pattern | Pre-kickoff admin is documented but not required. | Existing flows remain valid after this task. | P1 | required-now |
| ExecutePairflowPlan ownership | `ExecutePairflowPlan` owns when selected routes may use an ideation bubble as an admin container. | Add route-contract wording only in `ExecutePairflowPlan`. | P1 | required-now |
| UsePairflow baseline | `UsePairflow` remains the provider of existing round-0 hold/kickoff primitives. | Cite it as a baseline anchor, but do not edit it. | P1 | required-now |
| Allowed scope | Admin scope is plan/task/progress metadata and directly related docs/admin notes. | Product/source code remains forbidden during pre-kickoff admin. | P1 | required-now |
| Publish proof | Future kickoff gating must rely on published `main` state, not unmerged worktree state. | Document the proof requirement without implementing it yet. | P1 | required-now |
| Continuity | Every successor task must leave the skill usable. | Avoid future-state dependencies in this task. | P1 | required-now |
| Ideation naming | Keep `ideation` as the technical mode name. | Do not rename flags or metadata. | P2 | required-now |

### 0a) Canonical Contract Matrix

| ID | Case | Owner | Result | Reason Code | Side Effects | Test |
|---|---|---|---|---|---|---|
| PCM1 | Existing ideation create/start flow | current task | documented as preserved baseline | N/A | docs only | T1 |
| PCM2 | Optional pre-kickoff admin described | current task | allowed as future `ExecutePairflowPlan` route pattern | N/A | docs only | T2 |
| PCM3 | Product/source code during admin phase | current task | documented forbidden | N/A | docs only | T3 |
| PCM4 | Kickoff after failed admin publish | successor task | documented forbidden | N/A | none in this task | T4 |
| PCM5 | Route integration before manual workflow exists | current task | documented deferred | N/A | docs only | T5 |
| PCM6 | `UsePairflow` ownership | current task | documented as baseline-only, not touched | N/A | docs only | T6 |

### 0b) Validation Matrix

| ID | Validates | Required Evidence | Priority |
|---|---|---|---|
| T1 | Preserved ideation baseline wording | Changed `ExecutePairflowPlan` wording cites existing `UsePairflow` round-0 hold/kickoff behavior as baseline and does not redefine it. | P1 |
| T2 | Optional pattern wording | Changed `ExecutePairflowPlan` wording says pre-kickoff admin containers are optional until successor route tasks adopt them. | P1 |
| T3 | Product/source admin prohibition | Changed wording explicitly forbids product/source implementation during pre-kickoff admin. | P1 |
| T4 | Failed publish no-kickoff future rule | Changed wording states future integrated routes must not kickoff after failed or ambiguous admin publish. | P1 |
| T5 | Route integration deferred | Changed wording keeps current document and implementation routes valid and defers route adoption to successor tasks. | P1 |
| T6 | `UsePairflow` baseline-only/no-edit proof | Diff shows no `UsePairflow` files modified, and task wording describes `UsePairflow` only as an existing primitive provider. | P1 |

### 0c) Ownership and Deferred Semantics

| Surface / Decision | Owned Here | Emits / Records Only | Deferred Owner | Forbidden Interpretation | Priority |
|---|---|---|---|---|---|
| Optional pre-kickoff admin route contract | yes | yes | N/A | Documentation does not implement publish. | P1 |
| Manual admin publish workflow | no | yes | `2-prep-admin-publish` | Do not route through a missing workflow. | P1 |
| Document route integration | no | yes | `3-doc-bubble-start-integration` | Do not change `CreateDocumentBubble` yet. | P1 |
| Implementation route integration | no | yes | `4-impl-bubble-start-integration` | Do not change `CreateImplementationBubble` yet. | P1 |
| Close verifier | no | yes | `5-close-admin-verifier` | Do not alter post-close behavior here. | P2 |
| `UsePairflow` lifecycle surface | no | yes | successor task only if existing primitives prove insufficient | Do not make `UsePairflow` the owner of this route pattern. | P1 |

### 0d) Mirrored Surface Checklist

1. `ExecutePairflowPlan/SKILL.md` route/delegation commentary.
2. `HandleDocumentBubble.md` create route future admin postcondition note.
3. `HandleImplementationBubble.md` create route future admin postcondition note.

### L1 Acceptance

1. The new wording explicitly says the pattern is optional after this task.
2. The new wording says successor tasks may make specific `ExecutePairflowPlan`
   routes use the pattern later.
3. The new wording preserves existing create/start/kickoff behavior.
4. Allowed/forbidden admin scope is explicit.
5. Kickoff-after-failed-publish is documented as forbidden for future
   integrated routes.
6. No runtime source files are modified.
7. No `UsePairflow` files are modified.

## L2 - Implementation Notes

### Suggested Edits

1. In `ExecutePairflowPlan/SKILL.md`, add the continuity and ownership rule:
   - current routes remain valid until a specific integration task changes
     them,
   - route-caused adoption must happen one route at a time,
   - the route pattern relies on existing `UsePairflow` round-0 hold/kickoff
     primitives but does not redefine them.
2. In `HandleDocumentBubble.md`, add a future-facing note that its create route
   may later be backed by pre-kickoff admin publish, but current postconditions
   remain unchanged in this task.
3. In `HandleImplementationBubble.md`, add a future-facing note that its create
   route may later be backed by pre-kickoff admin publish, but current
   postconditions remain unchanged in this task.

### Validation

1. Review the changed skill markdown for contradictions:
   - no mandatory state field introduced,
   - no route made dependent on task 2,
   - no behavior switch implied,
   - no `UsePairflow` ownership or edit implied.
2. Run a narrow text search:
   - `rg "pre-kickoff|admin publish|task_pending|UsePairflow" .claude/skills/ExecutePairflowPlan`
3. Because this task is docs-only, full `pnpm test` is not required unless the
   implementer touches runtime/source files.

### Done Signal

This task is complete when repo-local `ExecutePairflowPlan` skill docs describe
the optional pattern clearly enough for task 2 to implement a manual workflow,
while the old Pairflow and `ExecutePairflowPlan` routes remain usable without
any new command.
