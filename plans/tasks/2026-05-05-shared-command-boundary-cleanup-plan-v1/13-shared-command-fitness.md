---
artifact_type: task
artifact_id: task_shared_command_fitness_v1
task_family_id: shared-command-fitness
sequence_key: "13"
task_id: 13-shared-command-fitness
title: "Shared Command Fitness"
status: implementable
phase: phase5
target_files:
  - tools/fitness/checks/dependency.ts
  - tests/tools/fitness/dependency.test.ts
  - docs/architecture/v11-placement-and-extraction-governance.md
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 13-shared-command-fitness-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: Shared Command Fitness

## L0 - Policy

### Goal

Update the shared-command governance guardrails now that the planned cleanup
has removed the residual command-named shared boundaries. Keep this as a narrow
fitness/governance slice: preserve the current placement model, keep true
command-neutral shared directories valid, and tighten only the warning or test
coverage needed to prevent a return of command-local parking-lot directories
under `src/v11/shared/<command>/**`.

### Domain / Control Model Summary

1. Business invariant: `src/v11/shared/**` must communicate command-neutral
   multi-consumer ownership, not hide command-local helper code under a shared
   path.
2. Control model:
   - `docs/architecture/v11-placement-and-extraction-governance.md` owns the
     normative placement rule.
   - `tools/fitness/checks/dependency.ts` owns executable dependency and shared
     promotion warnings.
   - `tests/tools/fitness/dependency.test.ts` owns regression coverage for
     dependency fitness behavior.
3. Read-path rule: command-local helper logic should be read from
   `src/v11/application/<command>/**`; shared imports should use
   command-neutral shared directories such as `shared/read-model`,
   `shared/remote`, `shared/ports`, or other multi-lane contracts.
4. Forbidden fallback: do not keep or newly bless `shared/<command>` just
   because it is convenient, may be reused later, or avoids import churn.
5. Allowed resolution path: update the existing
   `shared_promotion_single_lane` warning and its fixtures or governance text
   so command-local shared parking lots remain visible without rewriting the
   architecture fitness framework.
6. Missing-data rule: if a remaining shared directory is not clearly
   command-local from current consumers and source semantics, do not hard-fail
   it in this task; leave it as a report-only warning or document the explicit
   deferral.
7. Phase boundary:
   - contract closure: preserve the placement governance rule.
   - producer closure: N/A.
   - internal execution closure: fitness rule/test coverage only.
   - workflow/orchestration closure: N/A.
   - read-model closure: do not rename or redesign read-model producers.
   - activation closure: the active path is `pnpm fitness:check:ci`.
   - cleanup/recovery closure: remove stale transitional allowances only when
     backed by current source shape.

### Plan Linkage

1. Parent plan gap closed: regression guardrails should reflect the
   post-cleanup boundary.
2. Depends on: `12-list-fitness-closeout`.
3. Unlocks / impacts successors: this is the final planned task for
   `shared-command-boundary-cleanup-plan-v1`.
4. Task-list impact: tracks planned task `13-shared-command-fitness`; it does
   not replace or supersede another task id.
5. Inherited validation / exit expectation: the shared promotion warning must
   remain active, and any tightened examples must describe the current
   command-neutral tree rather than the old transitional directories.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/v11-placement-and-extraction-governance.md`
   - `tools/fitness/checks/dependency.ts`
   - `tests/tools/fitness/dependency.test.ts`
   - current directories under `src/v11/shared/**`
2. Canonical elements:
   - `src/v11/shared/**` is for command-neutral contracts, read models,
     primitives, policies, ports, and other multi-consumer shared code.
   - `shared_promotion_single_lane` remains the current warning surface for
     single-lane shared promotion risk.
   - `pnpm fitness:check:ci` is the operator-visible activation path.
3. Guard elements:
   - command-neutral directories with one current consumer are not automatically
     wrong when their semantics are clearly shared/foundation-oriented.
   - historical plan/task/archive prose may continue to mention old command
     paths.
4. Compat-only elements to update or remove:
   - stale dependency-fitness fixtures or assertions that still imply old
     command-named shared directories are acceptable terminal shapes.
   - governance wording that treats report-only warnings as a substitute for
     explicit ownership proof.
5. Forbidden reinterpretations:
   - do not turn this task into broad source relocation.
   - do not hard-fail every single-lane shared directory unless the current
     source shape proves the rule is safe now.
   - do not rename command-neutral shared directories or runtime contracts.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `tools/fitness/checks/dependency.ts`
   - `tests/tools/fitness/dependency.test.ts`
   - `docs/architecture/v11-placement-and-extraction-governance.md`
   - `src/v11/shared/**`
2. Actual touched scope: dependency-fitness rule text/allowance behavior,
   regression fixtures, and placement governance text only as needed.
3. Mutation entrypoints in scope: N/A; the task changes governance/test
   evidence, not product behavior.
4. Hidden scope ruled out:
   - no runtime command implementation moves.
   - no UI/router/API behavior changes.
   - no broad modularity redesign.
   - no archived artifact cleanup.
5. Branch inventory note: the current residual old-plan directories
   `shared/attach`, `shared/commit`, `shared/inbox`, `shared/list`, and
   `shared/merge` should not exist as terminal shared boundaries; the current
   tree may still include command-neutral replacements such as
   `shared/bubbleAttachment`, `shared/bubbleInbox`, `shared/read-model/list`,
   and `shared/remote`.
6. Why the declared task shape matches reality: prior tasks completed source
   cleanup first; this slice can now update guardrails without working around
   transitional source paths.
7. Document-bubble inventory refinement: if the focused old-path search finds
   active test strings such as `src/v11/shared/inbox` or
   `../../shared/inbox/inboxCommandApi`, classify whether they are negative
   assertions that forbid the old boundary or positive fixtures that still
   accept it. Negative assertions are closure evidence and should remain unless
   their surrounding contract changes; positive fixtures or governance prose
   that treats the old paths as valid terminal shapes must be updated.

### Authority Boundary Map

1. Governance authority: `docs/architecture/v11-placement-and-extraction-governance.md`.
2. Executable fitness authority: `tools/fitness/checks/dependency.ts`.
3. Regression evidence owner: `tests/tools/fitness/dependency.test.ts`.
4. Explicit out-of-scope consumers: runtime source lanes, UI router behavior,
   archived plan/task prose, and future unrelated modularity review follow-ups.
5. Export surfaces closed in this phase: active governance/test acceptance of
   command-local shared parking-lot shapes as a terminal state.

### In Scope

1. Review the current `src/v11/shared/**` tree and dependency-fitness output
   after tasks 1 through 12.
2. Update `shared_promotion_single_lane` wording, classification, or narrow
   command-shaped directory handling only when the current tree proves it is
   safe.
3. Add or update dependency-fitness tests so a command-local helper parked in
   `src/v11/shared/<command>/**` remains visible as a warning.
4. Update placement governance text if it still describes transitional
   command-shaped shared directories imprecisely.
5. Preserve report-only behavior unless the source shape and parent plan
   explicitly justify a hard failure.
6. Verify stale references in active fitness tests no longer bless
   `shared/attach`, `shared/commit`, `shared/inbox`, `shared/list`, or
   `shared/merge` as accepted terminal boundaries.

### Out of Scope

1. Moving or renaming runtime source files.
2. Renaming command-neutral shared directories.
3. Removing historical references from archived artifacts.
4. Changing UI/router/API contracts or runtime list/read-model behavior.
5. Broadening architecture fitness beyond the shared-command promotion rule.
6. Turning report-only warnings into hard failures without source-backed proof.

### Safety Defaults

1. Prefer fixture and assertion updates over rule rewrites.
2. Preserve the existing dependency fitness report shape unless a named
   assertion must change to reflect the current boundary.
3. Keep command-neutral shared directories valid even if their current consumer
   count is small.
4. Treat unclear ownership as report-only or deferred, not as a source move.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - architecture governance wording.
   - dependency-fitness warning/test contract.
   - no runtime API/interface, DB, auth, config, or event payload contract
     changes.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `coordination_state`: `0`
6. `runtime_variability`: `0`
7. `public_contract_pressure`: `1`
8. Decision: bounded task. The work touches governance and fitness tests, but
   it should not change runtime behavior.

## L1 - Contract

| Requirement | Contract | Priority | Status |
|---|---|---:|---|
| Current-tree inventory | The task verifies whether old command-named shared directories remain and records any explicit deferral if they do. | P1 | required-now |
| Warning preservation | `shared_promotion_single_lane` remains active and visible for command-local shared parking-lot fixtures. | P1 | required-now |
| Stale terminal-shape closure | Active dependency-fitness tests/governance do not bless `shared/attach`, `shared/commit`, `shared/inbox`, `shared/list`, or `shared/merge` as acceptable terminal boundaries. | P1 | required-now |
| Negative assertion evidence | Any active old-path hit retained because it is a negative assertion must be recorded in the implementation handoff as closure evidence, including the file path and why it rejects rather than accepts the old boundary. | P1 | required-now |
| Command-neutral protection | Command-neutral shared replacements remain valid; the task does not hard-fail them solely for current single-lane consumption. | P1 | required-now |
| Runtime non-goal | Runtime source behavior and public API contracts are unchanged. | P1 | required-now |

### Data / Interface Contract

| Surface | Current Meaning | Required Task Behavior | Deferred / Out of Scope |
|---|---|---|---|
| `shared_promotion_single_lane` | Report-only warning for likely shared parking-lot promotion. | Preserve and update expected details/fixtures as needed. | Hard-fail policy only if explicitly source-backed and safe. |
| `src/v11/shared/**` directory names | Placement signal for shared ownership. | Verify old residual command-shaped directories are gone or explicitly deferred. | Runtime relocation. |
| Placement governance doc | Normative shared/application placement rule. | Align wording with post-cleanup rule and current warning behavior. | Broad governance rewrite. |
| Dependency fitness tests | Regression evidence for architecture checks. | Add/update focused cases for command-local shared parking-lot warnings. | Unrelated fitness suites. |

## L2 - Implementation Plan

1. Re-run focused inventory:
   `find src/v11/shared -maxdepth 2 -type d | sort` and
   `rg -n "shared/(attach|commit|inbox|list|merge)|shared_promotion_single_lane" tests tools docs src/v11`.
2. Classify hits:
   - active fitness/governance references: update in this task.
   - active negative contract assertions that reject old command-shaped shared
     paths: leave unchanged and record them as closure evidence.
   - command-neutral current runtime/source names: leave unchanged.
   - historical archived prose: leave unchanged.
   - unrelated attach/list command terminology outside shared-boundary naming:
     leave unchanged.
3. Update dependency-fitness tests to assert the warning remains visible for a
   command-local helper under `src/v11/shared/<command>/**`.
4. Update `tools/fitness/checks/dependency.ts` only if the warning message or
   classification needs to reflect the post-cleanup boundary more clearly.
5. Update placement governance text only if it still permits ambiguous terminal
   command-shaped shared parking lots.
6. Re-run focused search and confirm remaining old-path hits are historical,
   unrelated command terminology, explicitly allowed command-neutral names, or
   negative assertions that reject the old terminal boundary.
7. Record any retained active negative old-path assertions in the handoff or
   final implementation evidence, with file path and rejection rationale. This
   recording step is required even when no source/test change is needed for the
   negative assertion itself.
8. Run focused validation:
   - `pnpm vitest run tests/tools/fitness/dependency.test.ts`
   - `pnpm fitness:check:ci`
9. Run repository-required verification for direct source/test changes before
   completion:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - focused tests above
   - broader affected fitness suite if needed: `pnpm vitest run tests/tools/fitness`
   - `pnpm test`
   - `pnpm build` if `tools/fitness/checks/dependency.ts` or other
     CLI/runtime-affecting source changes.

### Acceptance Criteria

1. Current-tree inventory confirms no active terminal
   `src/v11/shared/{attach,commit,inbox,list,merge}` boundary remains, or records
   a source-anchored deferral.
2. `shared_promotion_single_lane` warning coverage remains present.
3. Dependency-fitness tests include a focused command-local shared parking-lot
   fixture and do not depend on the old transitional list boundary.
4. Any governance wording updated by this task distinguishes command-neutral
   shared ownership from command-local helper parking lots.
5. Command-neutral shared directories and read-model/remote replacements remain
   valid.
6. Any retained active negative old-path assertion is explicitly recorded as
   closure evidence with its path and rejection rationale.
7. No runtime source relocation, API behavior, DTO shape, or UI behavior change
   is introduced.

### Validation

1. `pnpm vitest run tests/tools/fitness/dependency.test.ts`
2. `pnpm fitness:check:ci`
3. Focused old-path search evidence showing each remaining active hit is
   historical, unrelated, command-neutral, or a recorded negative assertion.
4. `pnpm typecheck`
5. `pnpm lint`
6. `pnpm test`
7. `pnpm build` if `tools/fitness/checks/dependency.ts` or other runtime/tool
   source changes.

### Non-Goals

1. Move runtime files.
2. Rename command-neutral shared directories.
3. Delete archived historical references.
4. Redesign the dependency fitness framework.
5. Change runtime behavior.
