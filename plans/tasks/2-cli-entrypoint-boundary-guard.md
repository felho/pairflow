---
artifact_type: task
artifact_id: task_cli_entrypoint_boundary_guard_v1
task_family_id: cli-entrypoint-boundary-guard
sequence_key: "2"
task_id: 2-cli-entrypoint-boundary-guard
title: "CLI Entrypoint Boundary Guard"
status: approved
phase: phase1
target_files:
  - tests/contracts/v11/cli-entrypoint-parity-coverage.test.ts
  - tests/v11/application/attach/attachCliEntrypointParity.test.ts
  - tests/v11/application/commit/commitCliEntrypointParity.test.ts
  - tests/v11/application/create/createCliEntrypointParity.test.ts
  - tests/v11/application/delete/deleteCliEntrypointParity.test.ts
  - tests/v11/application/inbox/inboxCliEntrypointParity.test.ts
  - tests/v11/application/kickoff/kickoffCliEntrypointParity.test.ts
  - tests/v11/application/list/listCliEntrypointParity.test.ts
  - tests/v11/application/open/openCliEntrypointParity.test.ts
  - tests/v11/application/reconcile/reconcileCliEntrypointParity.test.ts
  - tests/v11/application/restart/restartCliEntrypointParity.test.ts
  - tests/v11/application/start/startCliEntrypointParity.test.ts
  - tests/v11/application/status/statusCliEntrypointParity.test.ts
  - src/cli/commands/bubble
prd_ref: null
plan_ref: plans/parity-test-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-30-parity-test-retirement-plan-v1
context_mode_selector:
  implementation_context: "implementation pass for AC1-AC5"
  docs_only_context: "document-refinement pass with canonical PASS summary marker"
---

# Task: CLI Entrypoint Boundary Guard

## L0 - Policy

### Goal

Replace per-command CLI entrypoint parity identity tests with one current-purpose
CLI boundary/inventory guard that protects wrapper routing without preserving
migration-era parity vocabulary.

### Domain / Control Model Summary

1. Business invariant: supported `pairflow bubble ...` CLI entrypoints must keep
   routing to the intended v11 application command surface, and unsupported or
   non-shim wrappers must not be silently reclassified as parity coverage.
2. Control model: `src/cli/commands/bubble/**` is the public CLI wrapper
   boundary; `src/v11/application/**` remains the current implementation
   authority for migrated command behavior.
3. Read-path rule: implementation may classify wrapper shape from current
   wrapper imports/exports and current v11 `*CliCommand.ts` modules only.
4. Forbidden fallback: do not preserve per-command parity identity tests solely
   because they historically proved legacy-vs-v11 migration routing.
5. Allowed resolution path: replace identity sentinels with a central
   inventory/boundary contract that verifies the direct shim list and rejects
   unexpected imports outside `node:` and `src/v11/application/**`.
6. Missing-data rule: if a wrapper cannot be confidently classified as a direct
   v11 shim or an intentional non-shim wrapper, keep behavior coverage and fail
   the boundary guard rather than deleting protection.
7. Phase boundary:
   - contract closure: owned here for CLI entrypoint boundary coverage.
   - producer closure: N/A; command runtime behavior is not changed.
   - internal execution closure: N/A.
   - workflow/orchestration closure: N/A.
   - read-model closure: owned only for test names and coverage inventory.
   - activation closure: owned only if a test command or manifest references a
     renamed/deleted test.
   - cleanup/recovery closure: N/A.

### Docs-Only Context Definition

Context mode selector:

1. `docs_only_context` is selected by the bubble/task instruction before edits
   when the pass is a document-refinement pass and its intended edit set is
   limited to this task document plus explicitly allowed parent-plan alignment
   fields.
2. `implementation_context` is selected when the pass attempts AC1-AC5, changes
   product/app/runtime code, changes tests/scripts/package files/generated
   artifacts, or changes implementation-context CLI boundary cleanup work.
3. Precedence rule: if any implementation-context signal and any
   `docs_only_context` signal conflict, `implementation_context` wins and the
   pass must not claim `docs_only_context`.
4. Bootstrap/mixed-mode rule: a document pass that introduces or refines this
   selector still uses `docs_only_context` when its actual edits remain within
   the allowed docs-only edit set.
5. Handoff rule: after `docs_only_context` is selected, the canonical PASS
   summary must include `Context mode: docs_only_context` as evidence of the
   selected mode; the marker reports the mode, it does not select it.

`docs_only_context` means a document-refinement bubble or review pass whose
allowed edits are limited to the task document and explicitly allowed
parent-plan alignment fields, with product/app/runtime code, tests, scripts,
package files, generated artifacts, and implementation-context CLI boundary
cleanup work out of scope.

Implementation-context CLI boundary cleanup work means AC1-AC5 work that renames
or rewrites active tests, deletes per-command sentinels, updates active
scripts/manifests/docs references, or otherwise changes the actual CLI boundary
coverage implementation.

Explicitly allowed parent-plan alignment fields means only:

1. `2-cli-entrypoint-boundary-guard` task path/status fields in the parent plan
   frontmatter `task_tracker` and Open Task List row when those fields are stale
   against this task artifact.
2. The Task 2 Validation Strategy docs-only pointer that references this task's
   authoritative `docs_only_context` contract without redefining it.

In `docs_only_context`, implementation validation matrix checks are not run, not
satisfied, and not claimed; the canonical PASS summary attaches no runtime
validation log refs and states `runtime checks were intentionally not executed`.

### Plan Linkage

1. Parent plan gap closed: CLI parity tests duplicate one-line shims but still
   contain useful boundary intent.
2. Depends on: `1-facade-migration-map-cleanup`.
3. Unlocks / impacts successors: task 3 and task 4 must not rely on
   per-command CLI parity sentinel files.
4. Task-list impact: refines `2-cli-entrypoint-boundary-guard`.
5. Inherited validation / exit expectation: in implementation context, targeted
   CLI boundary coverage test, relevant CLI command tests, `pnpm typecheck`,
   and `pnpm lint`; in `docs_only_context`, runtime checks are not run, not
   satisfied, and not claimed, no runtime validation log refs are attached, and
   the canonical PASS summary includes `Context mode: docs_only_context` plus
   `runtime checks were intentionally not executed`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `tests/contracts/v11/cli-entrypoint-parity-coverage.test.ts`
   - `tests/v11/application/*/*CliEntrypointParity.test.ts`
   - `src/cli/commands/bubble/**`
   - `src/v11/application/**`
   - `docs/architecture/v11-placement-and-extraction-governance.md`
2. Canonical elements: v11 application command modules are current behavior
   authority; CLI wrappers are boundary surfaces.
3. Guard elements: the direct shim inventory is a boundary guard, not an
   independent legacy baseline.
4. Compat-only elements: migration-era `parity` test names are historical and
   should not remain active naming when no independent baseline is compared.
5. Forbidden reinterpretations: do not delete non-shim wrapper behavior tests,
   removed-alias tests, or runtime/domain `parity` modules by name search.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `tests/contracts/v11/cli-entrypoint-parity-coverage.test.ts`
   - `tests/v11/application/start/startCliEntrypointParity.test.ts`
   - `src/cli/commands/bubble/start.ts`
   - `src/cli/commands/bubble/reply.ts`
   - `src/cli/commands/bubble/**` inventory
2. Actual touched scope: contract-test inventory plus test naming cleanup.
3. Mutation entrypoints in scope: N/A; CLI command runtime functions are read
   for classification only.
4. Hidden scope ruled out: direct wrappers are one-line exports to
   `src/v11/application/**`; non-shim wrappers such as `reply.ts` keep their
   existing command tests and are not converted into direct-shim parity cases.
5. Branch inventory note: direct-shim wrappers and intentional non-shim wrappers
   must both be represented in the central boundary guard.
6. Why the declared task shape matches reality: all changes collapse duplicated
   identity sentinels into one boundary/inventory test without touching command
   behavior.

### Authority Boundary Map

1. Authority producer: existing v11 application command modules and current CLI
   wrapper files.
2. Stored authority: the central CLI boundary/inventory contract test.
3. In-scope consumers: contract test inventory and targeted validation commands.
4. Explicit out-of-scope consumers: command runtime behavior, removed alias
   coverage for `pass`, `ask-human`, and `converged`, reconcile contract modes,
   and meta-review-gate case naming.
5. Export surfaces closed in this phase: yes, the active test surface no longer
   exposes per-command parity identity sentinels.

### Baseline Preservation

1. Must-preserve behaviors: public bubble CLI wrappers continue routing only to
   allowed `node:` or v11 application boundaries; intentional non-shim wrappers
   keep their behavior tests.
2. Allowed resolution paths: rename the central contract test to boundary
   vocabulary, delete per-command identity tests, and update stale references.
3. Forbidden regression interpretations: do not weaken the import-boundary guard
   to a pure file-existence check.
4. Replacement proof required if removed: targeted search must show no active
   `*CliEntrypointParity.test.ts` references remain, and the central boundary
   guard must pass.

### Success / Completion Proof Boundary

N/A; this task does not change runtime completion semantics.

### Precondition and Side-Effect Boundary

N/A; this task does not modify a mutation flow.

### In Scope

Implementation context:

1. Rename or rewrite `tests/contracts/v11/cli-entrypoint-parity-coverage.test.ts`
   into a current-purpose CLI boundary/inventory guard.
2. Delete the 12 per-command `*CliEntrypointParity.test.ts` identity tests after
   their useful boundary intent is represented centrally.
3. Update any active package, README, or manifest references to renamed/deleted
   CLI parity test files.
4. Preserve existing behavior tests for non-shim wrappers and removed aliases.
5. Run targeted stale-reference search for `CliEntrypointParity` and
   `cli-entrypoint-parity`.

`docs_only_context`:

6. Refine this task document for implementation readiness.
7. Update explicitly allowed parent-plan alignment fields only when stale or
   needed to point at this task's authoritative `docs_only_context` contract.

### Out of Scope

Implementation context:

1. Changing CLI command runtime behavior.
2. Removing non-shim wrapper tests.
3. Reconcile contract `baseline` / `parity` mode cleanup.
4. Meta-review-gate parity-named case cleanup.
5. Runtime/domain parity modules under `src/v11/shared/metaReview*`.

`docs_only_context`:

6. Product/app/runtime code, tests, scripts, package files, generated artifacts,
   and implementation-context CLI boundary cleanup work.

### Safety Defaults

1. Keep coverage if the central boundary guard cannot prove equivalent boundary
   protection.
2. Prefer boundary/inventory naming over migration vocabulary.
3. Fail closed on unclassified wrapper shapes.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: no.
2. Impacted contracts: active test coverage inventory only.

### Complexity Risk Gate

1. `authority_risk`: 1
2. `surface_spread`: 1
3. `identity_join_risk`: 1
4. `activation_coupling`: 1
5. `prerequisite_risk`: 0
6. `acceptance_multiplicity`: 1
7. `risk_score`: 5
8. `single-task allowed`: yes
9. If `no`, required split: N/A.
10. Identity/join note:
    - canonical identity path: wrapper filename, direct v11 module export, and
      central inventory entry.
    - competing identifiers or fallback identities: historical parity test
      filenames are not authority.
11. Authority/source-of-truth note:
    - canonical source: current CLI wrapper imports/exports plus v11 command
      modules.
    - forbidden secondary sources: per-command parity test naming.
12. Closure-budget triage:
    - closure buckets touched: contract-test inventory and activation references.
    - intentionally collapsed closures: test rename/deletion plus stale
      reference cleanup, because they are one coverage surface.
    - explicitly deferred closures: reconcile and meta-review-gate contract
      naming cleanup.
13. Bounded-task-shape decision:
    - primary shape: activation_or_read_model.
    - secondary shape: contract inventory cleanup.
    - why this bounded mix is safe: the same central test replaces duplicated
      identity sentinels and remains read-only against runtime behavior.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | CLI wrapper routing coverage must not weaken. | Central guard must prove direct shims and allowed module boundaries. | P1 | required-now |
| Control model | Wrapper files define public CLI boundary; v11 modules define behavior authority. | Tests classify current files, not historical migration stages. | P1 | required-now |
| Read-path rule | Read current wrapper imports/exports and v11 `*CliCommand.ts` modules. | Avoid hard-coding deleted parity test file lists as authority. | P1 | required-now |
| Forbidden fallback | Per-command parity naming is not proof of current coverage need. | Delete identity sentinels only after central guard covers their boundary intent. | P1 | required-now |
| Allowed resolution path | Use a central boundary/inventory contract. | Rename/rewrite the contract test and update references. | P1 | required-now |
| Missing-data rule | Unclassified wrapper shape fails closed. | Keep or add coverage before deleting any ambiguous sentinel. | P1 | required-now |
| Phase boundary | Test inventory cleanup only. | Do not change CLI runtime behavior. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Direct bubble CLI shims | `src/cli/commands/bubble/*.ts` | Boundary wrappers that may re-export v11 commands. | Preserve via central inventory guard. | P1 | required-now |
| v11 CLI commands | `src/v11/application/**/*CliCommand.ts` | Current implementation authority. | Preserve. | P1 | required-now |
| Per-command parity tests | `tests/v11/application/*/*CliEntrypointParity.test.ts` | Migration-era identity sentinels. | Remove after replacement proof. | P1 | required-now |
| Non-shim wrappers | `src/cli/commands/bubble/reply.ts` and similar | Intentional wrapper implementations, not direct shim parity cases. | Preserve behavior coverage. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Inspect central test, a representative parity test, direct shim, non-shim wrapper, and wrapper inventory. | Replacement must reflect actual wrapper shapes. | P1 | required-now |
| Actual touched scope | Contract-test inventory cleanup. | Runtime command code is out of scope unless a wrapper import path must be read. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No lifecycle command handler behavior changes. | P1 | required-now |
| Hidden scope ruled out | Search for active `CliEntrypointParity` and `cli-entrypoint-parity` references. | Stale references must be removed or classified historical. | P1 | required-now |
| Branch inventory note | Direct shims and non-shim wrappers are separate classes. | Central guard must not assume every wrapper is a one-line shim. | P1 | required-now |
| Shape proof | One central guard can cover all wrapper boundary intent. | Delete duplicated identity sentinels only when the guard passes. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Per-command CLI parity sentinels remain active. | Replace with boundary guard and delete sentinels. | P1 | required-now |
| Depends on | `1-facade-migration-map-cleanup` | No migration-map dependency may be reintroduced. | P1 | required-now |
| Unlocks / impacts successors | Tasks 3 and 4 | Later contract cleanup should not see CLI parity sentinels as active pattern. | P1 | required-now |
| Task-list impact | Refines `2-cli-entrypoint-boundary-guard`. | No new task identity. | P1 | required-now |
| Inherited validation / exit expectation - implementation context | Targeted boundary/CLI tests plus typecheck/lint. | Evidence summary must name any skipped broader tests. | P1 | required-now |
| Inherited validation / exit expectation - `docs_only_context` | Implementation validation is out of scope. | Document-scope PASS must include `Context mode: docs_only_context`, attach no runtime validation log refs, and state `runtime checks were intentionally not executed`. | P2 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| CLI command runtime APIs | CLI wrappers and command tests | N/A | Preserve; no runtime API change. | N/A |
| Contract test inventory | Developer validation scripts and `pnpm test` | breaking test-file rename/delete only | Update stale references and keep passing test selection. | N/A |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Direct shim routing to v11 modules | Preserve | Central boundary test passes. | P1 | required-now |
| Non-shim wrapper behavior | Preserve | Existing CLI command tests still pass or remain untouched. | P1 | required-now |
| Per-command identity parity sentinels | Replace | Stale-reference search and central guard pass. | P1 | required-now |
| Runtime/domain parity | Forbid touching | No `src/v11/shared/metaReview*` edits. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

N/A.

### 0g) Precondition and Side-Effect Boundary

N/A.

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `tests/contracts/v11/cli-entrypoint-parity-coverage.test.ts` | central contract suite | Renamed/reworded to boundary/inventory coverage while preserving direct shim and import-boundary checks. | P1 | required-now | T1,T2 |
| CS2 | `tests/v11/application/*/*CliEntrypointParity.test.ts` | per-command identity suites | Deleted after replacement proof. | P1 | required-now | T1,T2 |
| CS3 | `src/cli/commands/bubble/*.ts` | wrapper import/export surface | Reads only allowed `node:` or v11 application boundaries unless intentionally classified. | P1 | required-now | T2,T3 |
| CS4 | `package.json` / README / manifests | active test references | No stale references to renamed/deleted parity tests. | P1 | required-now | T1,T4 |

### 2) Data and Interface Contract

1. No runtime data contract changes are allowed.
2. No CLI option, help text, or result payload changes are allowed unless needed
   only to fix a stale test import, in which case stop and route back before
   implementation.
3. The central boundary guard must encode direct-shim inventory and allowed
   import prefixes.
4. Active validation references must point to existing test files.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Contract tests | Rename/rewrite central boundary guard; delete duplicated identity tests. | Deleting behavior tests for non-shim wrappers. | Keep replacement proof explicit. | P1 | required-now |
| Runtime source | Read wrapper files for classification. | Changing command behavior. | Runtime edits require replan. | P1 | required-now |
| Docs/scripts | Update stale active references. | Rewriting historical docs for unrelated parity mentions. | Historical context may remain. | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Action | Reason Code | Priority | Timing |
|---|---|---|---|---|---|
| Ambiguous wrapper shape | Fail closed. | Keep coverage and report classification blocker. | `UNCLASSIFIED_CLI_WRAPPER` | P1 | required-now |
| Central guard cannot cover removed sentinel intent | Do not delete sentinel files. | Refine boundary guard or task. | `BOUNDARY_GUARD_NOT_EQUIVALENT` | P1 | required-now |
| Stale test reference remains | Fail validation. | Update reference or classify as historical. | `STALE_CLI_PARITY_REFERENCE` | P1 | required-now |
| Runtime behavior change appears necessary | Stop. | Route back to plan/task refinement. | `RUNTIME_CHANGE_OUT_OF_SCOPE` | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|
| must-use | current wrapper inventory under `src/cli/commands/bubble` | P1 | required-now |
| must-use | current v11 CLI command module inventory | P1 | required-now |
| must-not-use | historical parity test filename as authority | P1 | required-now |
| must-not-use | runtime/domain parity name search as deletion rule | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|
| T1 | Stale-reference search | Cleanup is complete. | Search `CliEntrypointParity` and `cli-entrypoint-parity`. | No active references remain except intentional historical plan/task/archive docs. | P1 | required-now |
| T2 | Central boundary guard | Per-command identity tests are removed. | Run the renamed/current central CLI boundary contract test. | Direct shim inventory and allowed import boundaries pass. | P1 | required-now |
| T3 | Relevant CLI command tests | Non-shim wrappers remain in place. | Run affected `tests/cli/bubble*Command.test.ts` selection or justified subset. | Existing wrapper behavior still passes. | P1 | required-now |
| T4 | Type/lint health | Test files are renamed/deleted. | Run `pnpm typecheck` and `pnpm lint`. | No unresolved imports or lint failures. | P1 | required-now |
| T5 | Docs-only selector | Bubble/task instruction selects document refinement and intended edits are docs-only. | Review the actual diff and handoff. | No implementation-context signal is present, and the canonical PASS summary includes `Context mode: docs_only_context`. | P2 | required-now |
| T6 | Docs-only edit scope | `docs_only_context` is selected. | Review changed files. | Edits are limited to the task document and explicitly allowed parent-plan alignment fields. | P2 | required-now |
| T7 | Docs-only validation claim | `docs_only_context` is selected. | Emit the handoff. | No runtime validation log refs are attached and the canonical PASS summary states `runtime checks were intentionally not executed`. | P2 | required-now |

T1-T4 apply to implementation passes only. T5-T7 apply to `docs_only_context`.

## Acceptance Criteria

Implementation context:

1. Per-command `*CliEntrypointParity.test.ts` identity tests are removed.
2. The central CLI entrypoint contract no longer uses migration-era parity naming
   and preserves direct-shim inventory plus import-boundary protection.
3. Active scripts/manifests/docs no longer reference deleted CLI parity tests.
4. CLI runtime behavior and runtime/domain parity modules are untouched.
5. Validation reports stale-reference search, the central boundary test,
   relevant CLI command tests or a justified subset, `pnpm typecheck`, and
   `pnpm lint`.

`docs_only_context`:

6. Implementation-context AC1-AC5 are not satisfied or claimed.
7. Edits are limited to the task document and explicitly allowed parent-plan
   alignment fields.
8. Product/app/runtime code, tests, scripts, package files, generated artifacts,
   and implementation-context CLI boundary cleanup work remain out of scope.
9. The canonical PASS summary attaches no runtime validation log refs and
   includes `Context mode: docs_only_context`.
10. The canonical PASS summary affirmatively states
    `runtime checks were intentionally not executed`.

Docs-only AC6-AC10 are P2 required-now document-scope requirements.

## L2 - Implementation Notes

Implementation pass:

1. Start with an inventory of `src/cli/commands/bubble/*.ts`, v11
   `*CliCommand.ts` modules, and current per-command parity tests.
2. Rename or replace `tests/contracts/v11/cli-entrypoint-parity-coverage.test.ts`
   with boundary terminology before deleting per-command sentinels.
3. Keep the central guard strict enough to catch unexpected wrapper imports.
4. Delete the 12 per-command `*CliEntrypointParity.test.ts` files only after the
   central guard represents their useful protection.
5. Run stale-reference search before typecheck/lint.

Document-only refinement pass:

1. Use this mode only in `docs_only_context`.
2. Edit only the task document and explicitly allowed parent-plan alignment
   fields.
3. T1-T4 are not run, not satisfied, and not claimed; T5-T7 are the applicable
   docs-only checks.
4. Attach no runtime validation log refs.
5. Hand off in the canonical PASS summary with `Context mode: docs_only_context`
   and the affirmative statement
   `runtime checks were intentionally not executed`.
