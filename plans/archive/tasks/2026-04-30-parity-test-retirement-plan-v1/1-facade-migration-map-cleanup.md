---
artifact_type: task
artifact_id: task_facade_migration_map_cleanup_v1
task_family_id: facade-migration-map-cleanup
sequence_key: "1"
task_id: 1-facade-migration-map-cleanup
title: "Facade Migration Map Cleanup"
status: archived
phase: phase1
target_files:
  - package.json
  - README.md
  - tests/contracts/v11/facade-parity-coverage.test.ts
  - tests/contracts/v11/migration-map.ts
  - tests/contracts/v11/migration-map.test.ts
prd_ref: null
plan_ref: plans/archive/plans/2026-04-30-parity-test-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 1-facade-migration-map-cleanup-doc
impl_bubble_id: 1-facade-migration-map-cleanup-impl
supersedes: []
superseded_by: null
archive_group: 2026-04-30-parity-test-retirement-plan-v1
---

# Task: Facade Migration Map Cleanup

## L0 - Policy

### Goal

Remove the exhausted facade parity coverage layer, the all-v11 migration map,
and script/documentation references that keep that migration-era layer active.

### Domain / Control Model Summary

1. Business invariant: removing migration scaffolding must not reduce coverage
   for supported Pairflow behavior or supported public CLI entrypoints.
2. Control model: current `src/v11/**` implementation and current contract
   tests are authoritative; a historical command migration map is no longer an
   active source of truth.
3. Read-path rule: cleanup decisions may read only current code paths, current
   tests, and active script/documentation references.
4. Forbidden fallback: do not preserve a parity artifact solely because its
   filename or notes contain migration-era terms such as `legacy`, `parity`, or
   `migration`.
5. Allowed resolution path: a parity-named artifact may remain only if it is
   reclassified as a current boundary/inventory guard, a current v11 behavior
   contract, runtime/domain findings-parity logic, or explicit removed-alias
   fail-closed coverage.
6. Missing-data rule: if an artifact cannot be classified confidently, keep the
   behavior coverage and rename or narrow it before deletion.
7. Phase boundary:
   - contract closure: owned here for facade parity and migration-map removal.
   - producer closure: N/A; no runtime producer behavior is changed.
   - internal execution closure: N/A.
   - workflow/orchestration closure: N/A.
   - read-model closure: owned here only for script/readme references to the
     removed facade migration-map layer.
   - activation closure: owned here through package script cleanup.
   - cleanup/recovery closure: N/A.

### Plan Linkage

1. Parent plan gap closed: exhausted facade parity and migration-map
   scaffolding remain active.
2. Depends on: N/A.
3. Unlocks / impacts successors: task 2 must not rely on the removed migration
   map; tasks 3 and 4 keep their own contract-runner/corpus scopes.
4. Task-list impact: refines `1-facade-migration-map-cleanup`.
5. Inherited validation / exit expectation for the implementation pass:
   targeted stale-reference search, targeted current contract-test selection,
   `pnpm typecheck`, and `pnpm lint`; broader plan validation remains for later
   tasks and final closure.
6. `docs_only_context` means a Pairflow bubble pass with
   `review_artifact_type=document` where the only edited artifact is this task
   document. In `docs_only_context`, T1-T4 are not run, not satisfied, and not
   claimed; agents must attach no runtime validation log refs and must
   affirmatively state `runtime checks were intentionally not executed`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `tests/contracts/v11/facade-parity-coverage.test.ts`
   - `tests/contracts/v11/migration-map.ts`
   - `tests/contracts/v11/migration-map.test.ts`
   - `package.json`
   - `README.md`
   - `docs/architecture/v11-placement-and-extraction-governance.md`
2. Canonical elements: `v11` is the current implementation authority for the
   migrated commands; active contract tests should describe current behavior or
   current boundary guards.
3. Guard elements: package scripts and README commands may guard current test
   execution, but must not keep retired migration categories alive.
4. Compat-only elements: historical roadmap mentions under `docs/v1.1-*` may
   remain historical context unless they are active execution instructions.
5. Forbidden reinterpretations: do not reinterpret runtime/domain
   `parity` terminology in meta-review findings as legacy-vs-v11 migration
   comparison; do not remove CLI wrapper boundary coverage owned by task 2.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `package.json`, `README.md`,
   `tests/contracts/v11/facade-parity-coverage.test.ts`,
   `tests/contracts/v11/migration-map.ts`,
   `tests/contracts/v11/migration-map.test.ts`, and repository-wide references
   to `commandMigrationMap`, `getCommandMigrationState`, `migration-map`, and
   `test:v11:facades`.
2. Actual touched scope: activation/read-model cleanup for test scripts and
   contract-test inventory; no runtime mutation path is in scope.
3. Mutation entrypoints in scope: N/A.
4. Hidden scope ruled out: current search showed `commandMigrationMap` is only
   consumed by the facade parity coverage test and migration-map test; no
   `src/**` runtime code imports it.
5. Branch inventory note: current branch is a single all-v11 branch; there is no
   independent baseline/parity execution branch in the migration map.
6. Why the declared task shape matches reality: the target files are limited to
   obsolete contract-test metadata, its test script/readme entrypoints, and no
   runtime source files.

### Authority Boundary Map

1. Authority producer: current v11 implementation and retained current-purpose
   contract tests.
2. Stored authority: active test files and package scripts after cleanup.
3. In-scope consumers: local developer scripts and README command guidance.
4. Explicit out-of-scope consumers: CLI entrypoint parity sentinel replacement,
   reconcile contract mode cleanup, meta-review-gate case rename, and runtime
   meta-review findings parity modules.
5. Export surfaces closed in this phase: yes, only the retired migration-map
   test export surface.

### Baseline Preservation

1. Must-preserve behaviors: current v11 behavior contract tests, CLI wrapper
   boundary protection covered by task 2, removed-alias fail-closed coverage,
   and runtime/domain findings-parity behavior.
2. Allowed resolution paths: delete obsolete facade/migration-map files when no
   current consumer remains; replace `test:v11:facades` with current script
   coverage only if a non-obsolete target remains.
3. Forbidden regression interpretations: do not delete by filename alone; do
   not treat every `parity` token as migration scaffolding.
4. Replacement proof required if removed: repository search must show removed
   map exports have no remaining imports, and validation must prove script/test
   references no longer point at deleted files.

### Success / Completion Proof Boundary

N/A; this task does not change runtime success or completion semantics.

### Precondition and Side-Effect Boundary

N/A; this task does not modify a mutation flow.

### In Scope

1. Delete `tests/contracts/v11/facade-parity-coverage.test.ts` when it remains an
   empty all-exempt parity mapping.
2. Delete `tests/contracts/v11/migration-map.ts` and
   `tests/contracts/v11/migration-map.test.ts` when no active consumer remains.
3. Remove or replace the `test:v11:facades` script and update aggregate scripts
   that invoke it.
4. Update active README guidance that names the retired facade parity script.
5. Run targeted repository search to prove no stale references remain.

### Out of Scope

1. Per-command `*CliEntrypointParity.test.ts` cleanup; task 2 owns the boundary
   guard replacement.
2. Reconcile contract `baseline` / `parity` mode removal; task 3 owns it.
3. Meta-review-gate parity-named behavior case rename; task 4 owns it.
4. Runtime/domain parity modules under `src/v11/shared/metaReview*`.
5. Historical docs cleanup unless a doc is active execution guidance.
6. In `docs_only_context`, edits to `package.json`, `README.md`, and
   `tests/**` are out of scope; only this task document may be refined.

### Safety Defaults

1. Preserve behavior coverage unless the artifact is proven to be migration-only
   scaffolding.
2. Prefer deleting the obsolete map and script over replacing them with another
   migration vocabulary layer.
3. Keep unrelated `schema.ts` contract mode definitions for successor tasks.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: no.
2. Impacted contracts: active developer test-script surface and contract-test
   inventory only.

### Complexity Risk Gate

1. `authority_risk`: 1
2. `surface_spread`: 1
3. `identity_join_risk`: 0
4. `activation_coupling`: 1
5. `prerequisite_risk`: 0
6. `acceptance_multiplicity`: 1
7. `risk_score`: 4
8. `single-task allowed`: yes
9. If `no`, required split: N/A.
10. Identity/join note:
    - canonical identity path: current file imports and package script names.
    - competing identifiers or fallback identities: historical migration command
      names are not routing authority.
11. Authority/source-of-truth note:
    - canonical source: current v11 code and retained current-purpose tests.
    - forbidden secondary sources: exhausted all-v11 migration map.
12. Closure-budget triage:
    - closure buckets touched: contract-test inventory, script/readme consume.
    - intentionally collapsed closures: script/readme cleanup with deleted tests,
      because they are direct stale references to the same retired layer.
    - explicitly deferred closures: CLI boundary guard, reconcile modes,
      meta-review-gate case names.
13. Bounded-task-shape decision:
    - primary shape: activation_or_read_model cleanup.
    - secondary shape: contract inventory cleanup.
    - why this bounded mix is safe: all changes remove the same exhausted
      facade migration-map layer and do not touch runtime behavior.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Supported behavior coverage must not weaken. | Delete only migration-only coverage; preserve current behavior/boundary tests. | P1 | required-now |
| Control model | Current v11 implementation and current-purpose tests are authoritative. | Do not use the migration map as active truth after this task. | P1 | required-now |
| Read-path rule | Use current imports, package scripts, README command guidance, and repo search. | Remove stale references and verify no unresolved imports remain. | P1 | required-now |
| Forbidden fallback | Historical migration vocabulary is not sufficient reason to keep an artifact. | Classify each target by current behavior before deleting. | P1 | required-now |
| Allowed resolution path | Delete the retired layer when consumers are limited to its own sentinel tests. | Keep successor-owned coverage untouched. | P1 | required-now |
| Missing-data rule | If a current boundary cannot be proven obsolete, keep or rename coverage. | Fail closed against accidental coverage loss. | P1 | required-now |
| Phase boundary | This task removes facade migration-map scaffolding only. | Later parity cleanup tasks remain separate. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `v11` implementation authority | `docs/architecture/v11-placement-and-extraction-governance.md` | Current implementation authority, not migration stage. | Preserve. | P1 | required-now |
| `commandMigrationMap` | `tests/contracts/v11/migration-map.ts` | Exhausted migration metadata; all entries are already `v11`. | Remove if no active consumer remains. | P1 | required-now |
| `test:v11:facades` | `package.json`, `README.md` | Obsolete facade parity script when only retired tests remain. | Remove or replace with current-purpose checks. | P1 | required-now |
| Runtime/domain `parity` | `src/v11/shared/metaReview*` by plan constraint | Findings consistency terminology, not migration comparison. | Leave untouched. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Search `commandMigrationMap`, `getCommandMigrationState`, `migration-map`, `facade-parity`, and `test:v11:facades`. | All stale consumers must be removed or intentionally retained with reason. | P1 | required-now |
| Actual touched scope | Contract-test inventory plus script/readme activation. | No runtime source edits are authorized. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | Do not edit lifecycle command handlers. | P1 | required-now |
| Hidden scope ruled out | Prove no `src/**` import of the migration map exists. | Deletion is safe only with this proof. | P1 | required-now |
| Branch inventory note | Migration map has no mixed states; all entries are `v11`. | The map is not protecting independent baseline/parity behavior. | P1 | required-now |
| Shape proof | Target files are direct producers/consumers of the retired layer. | Keep task single-slice. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Exhausted facade parity and migration map remain active. | Remove that layer and stale references. | P1 | required-now |
| Depends on | N/A. | This is the producer-first cleanup task. | P1 | required-now |
| Unlocks / impacts successors | Tasks 2, 3, and 4 must not depend on the removed migration map. | Keep their scopes separate. | P1 | required-now |
| Task-list impact | Refines existing planned task 1. | No new task identity. | P1 | required-now |
| Inherited validation / exit expectation | Implementation pass requires targeted search, targeted current contract tests, typecheck, and lint. | In `docs_only_context`, only this task document may be edited; T1-T4 are not run, not satisfied, and not claimed; no runtime validation log refs are attached; and the handoff must state `runtime checks were intentionally not executed`. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `tests/contracts/v11/schema.ts` contract modes | Contract runners and cases. | N/A in this task. | Leave unchanged. | Task 3 owns reconcile mode cleanup. |
| CLI entrypoint parity sentinel files | Per-command CLI wrapper tests. | N/A in this task. | Leave unchanged. | Task 2 owns replacement guard. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| v11 behavior contract coverage | Preserve. | Existing contract tests still run. | P1 | required-now |
| CLI wrapper boundary coverage | Preserve for task 2. | No per-command CLI parity test deletion here. | P1 | required-now |
| Runtime findings parity | Preserve. | No `src/v11/shared/metaReview*` cleanup here. | P1 | required-now |
| Removed alias fail-closed tests | Preserve. | No alias-removal tests touched here. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

N/A.

### 0g) Precondition and Side-Effect Boundary

N/A.

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `tests/contracts/v11/facade-parity-coverage.test.ts` | facade parity coverage suite | Removed when it only validates an empty all-exempt parity mapping. | P1 | required-now | T1,T2 |
| CS2 | `tests/contracts/v11/migration-map.ts` | `commandMigrationMap`, `getCommandMigrationState` | Removed when no active consumer remains. | P1 | required-now | T1,T2,T3 |
| CS3 | `tests/contracts/v11/migration-map.test.ts` | migration map suite | Removed with the retired map. | P1 | required-now | T1,T2 |
| CS4 | `package.json` | `test:v11:facades`, aggregate scripts | Stale script references removed or replaced by current test targets. | P1 | required-now | T2,T4 |
| CS5 | `README.md` | test command guidance | No longer names retired facade parity script. | P2 | required-now | T2 |

### 2) Data and Interface Contract

1. No runtime data contract changes are allowed.
2. No `ContractCase.mode` schema changes are allowed in this task.
3. Package script names after cleanup must point only to existing tests.
4. README test guidance must match `package.json`.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Contract tests | Delete obsolete migration-only map/sentinel files. | Deleting current behavior contracts. | Preserve successor-owned contract files. | P1 | required-now |
| Package scripts | Remove stale facade script or aggregate invocation. | Leaving scripts that reference deleted files. | Prefer no replacement if no current-purpose facade check remains. | P1 | required-now |
| Docs | Update active README guidance. | Rewriting historical roadmap context as part of this task. | Historical docs can remain if not active instructions. | P2 | required-now |
| Runtime source | N/A. | Editing runtime `src/**` parity/domain code. | Runtime behavior is out of scope. | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Action | Reason Code | Priority | Timing |
|---|---|---|---|---|---|
| Migration map still has active imports | Do not delete until consumers are reclassified or updated. | Refine implementation scope or task if consumer is successor-owned. | `MIGRATION_MAP_CONSUMER_REMAINS` | P1 | required-now |
| Script references deleted files | Fail validation. | Update script before completion. | `STALE_SCRIPT_REFERENCE` | P1 | required-now |
| README references deleted script | Update active guidance. | Leave only if explicitly historical. | `STALE_README_REFERENCE` | P2 | required-now |
| Unclassified parity artifact found | Keep coverage and report boundary. | Rename/narrow only with proof. | `UNCLASSIFIED_PARITY_ARTIFACT` | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | current repository search for imports/references | P1 | required-now |
| must-use | existing package script conventions | P1 | required-now |
| must-not-use | ad hoc deletion by filename alone | P1 | required-now |
| must-not-use | runtime parity terminology cleanup | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|
| T1 | Targeted stale reference search | Cleanup is complete. | Search for `facade-parity-coverage`, `commandMigrationMap`, `getCommandMigrationState`, and `test:v11:facades`. | No active stale references remain except intentional historical notes. | P1 | required-now |
| T2 | TypeScript import health | Migration map files are removed. | Run `pnpm typecheck`. | No unresolved imports or type errors. | P1 | required-now |
| T3 | Contract test inventory | Retired tests are gone. | Run targeted current contract tests or an equivalent vitest selection that excludes deleted files. | Current contract tests still pass. | P1 | required-now |
| T4 | Lint/script health | Package scripts changed. | Run `pnpm lint`. | Lint passes and scripts do not point to missing files. | P1 | required-now |

T1-T4 apply to implementation passes only. In `docs_only_context`, T1-T4 are not
run, not satisfied, and not claimed.

## Acceptance Criteria

1. The exhausted facade parity coverage test and all-v11 migration map layer are
   removed or replaced with current-purpose checks.
2. `package.json` no longer exposes or invokes an obsolete
   `test:v11:facades` target.
3. Active README guidance no longer recommends the retired facade parity script.
4. No runtime/domain parity files are touched.
5. Implementation validation reports the targeted stale-reference search result
   and targeted current contract-test result in the canonical handoff summary,
   and attaches canonical actor emit `--ref` log paths for every executed
   `pnpm` validation command, including at minimum the targeted current
   contract-test command, `pnpm typecheck`, and `pnpm lint`. Any skipped broader
   test is explicit.
6. In `docs_only_context`, T1-T4 are not run, not satisfied, and not claimed;
   handoffs attach no runtime validation log refs and affirmatively state
   `runtime checks were intentionally not executed`.

## L2 - Implementation Notes

Implementation pass:

1. Start with a search for all migration-map exports and script references.
2. Delete the retired map and sentinel test files only after consumers are
   understood.
3. Update `package.json` aggregate scripts before running validation.
4. Update README command guidance to match the new script surface.
5. Run targeted stale-reference search before typecheck/lint.

Document-only refinement pass:

1. Use this mode only in `docs_only_context`.
2. Edit only this task document.
3. T1-T4 are not run, not satisfied, and not claimed.
4. Attach no runtime validation log refs.
5. Hand off with the affirmative statement
   `runtime checks were intentionally not executed`.
