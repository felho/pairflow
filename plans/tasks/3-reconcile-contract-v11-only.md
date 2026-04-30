---
artifact_type: task
artifact_id: task_reconcile_contract_v11_only_v1
task_family_id: reconcile-contract-v11-only
sequence_key: "3"
task_id: 3-reconcile-contract-v11-only
title: "Reconcile Contract V11 Only"
status: approved
phase: phase1
target_files:
  - tests/contracts/v11/reconcile.contract.runner.ts
  - tests/contracts/v11/reconcile.contract.test.ts
  - tests/contracts/v11/cases/reconcile/*.case.json
  - tests/contracts/v11/corpus/manifest.json
  - tests/contracts/v11/corpus/build-corpus.ts
  - src/v11/application/reconcile/reconcileCommandApi.ts
  - src/v11/application/reconcile/emitReconcileV11.ts
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
---

# Task: Reconcile Contract V11 Only

## L0 - Policy

### Goal

Remove the reconcile contract `baseline` and `parity` modes where they compare
aliases of the same v11 implementation, while preserving the behavior cases as
current v11 contract coverage.

### Domain / Control Model Summary

1. Business invariant: reconcile contract coverage must still prove supported
   runtime-session cleanup behavior, stale-session reason classification, and
   dry-run versus mutating behavior.
2. Control model: `src/v11/application/reconcile/reconcileCommandApi.ts` is the
   current implementation authority; `emitReconcileV11.ts` is a compatibility
   export alias to the same implementation, not an independent baseline.
3. Read-path rule: cleanup decisions must be anchored to current reconcile
   runner/case/corpus inputs under `tests/contracts/v11/**` and the v11
   reconcile API exports above.
4. Forbidden fallback: do not keep a `baseline` or `parity` reconcile case solely
   because the shared contract schema still permits those modes for other
   command families.
5. Allowed resolution path: keep one v11 behavior case per meaningful reconcile
   scenario, update the reconcile runner/test/corpus manifest to consume only
   those v11 cases, and remove tautological duplicate case files.
6. Missing-data rule: if a reconcile case cannot be proven redundant with a v11
   behavior case, keep the behavior coverage and first rename or reclassify it
   as v11 rather than deleting it.
7. Phase boundary:
   - contract closure: owned here for reconcile contract corpus and runner
     vocabulary.
   - producer closure: N/A; reconcile runtime behavior is not changed.
   - internal execution closure: N/A.
   - workflow/orchestration closure: N/A.
   - read-model closure: owned only for case names, descriptions, and corpus
     manifest entries.
   - activation closure: owned if active test commands or generated corpus
     checks reference removed case files.
   - cleanup/recovery closure: N/A.

### Plan Linkage

1. Parent plan gap closed: reconcile contract harness still carries
   tautological legacy comparison modes.
2. Depends on: `1-facade-migration-map-cleanup`.
3. Sequencing note: may run after Task 2; Task 4 should inherit the case
   reclassification pattern but must not delete runtime/domain meta-review
   parity concepts by name.
4. Inherited validation / exit expectation:
   - `pnpm exec vitest run tests/contracts/v11/reconcile.contract.test.ts`
   - corpus manifest build/check
   - `pnpm typecheck`
   - `pnpm lint`
5. Approval provenance: `CreatePairflowSpec ReviewSpec` task-mode approved this
   artifact during the `ExecutePairflowPlan` route on 2026-05-01 after checking
   metadata, target-file reality, parent-plan fit, and closed-contract drift.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `tests/contracts/v11/reconcile.contract.runner.ts`
   - `tests/contracts/v11/reconcile.contract.test.ts`
   - `tests/contracts/v11/cases/reconcile/*.case.json`
   - `tests/contracts/v11/corpus/manifest.json`
   - `src/v11/application/reconcile/reconcileCommandApi.ts`
   - `src/v11/application/reconcile/emitReconcileV11.ts`
2. Canonical elements: v11 reconcile behavior cases and expected output subset
   assertions remain the contract authority for this task.
3. Guard elements: corpus manifest entries must continue to enumerate every
   retained reconcile behavior case.
4. Compat elements: the global `ContractCase.mode` union may still include
   `baseline` and `parity` for command families outside this task.
5. Forbidden reinterpretations: do not remove runtime/domain `parity` fields or
   non-reconcile contract cases because of this task.

### Scope Reality / Shape Proof

1. Current runner imports both `reconcileRuntimeSessions` and
   `reconcileRuntimeSessionsV11`, but `emitReconcileV11.ts` re-exports the same
   `reconcileRuntimeSessions` implementation under a v11 alias.
2. Current reconcile corpus includes triplets for:
   - basic dry-run cleanup,
   - mutating stale-session cleanup,
   - mutating no-stale-session behavior,
   - stale reason from final state,
   - stale reason from non-runtime state.
3. The actual touched scope is contract-runner/case/corpus cleanup; reconcile
   production behavior is read-only unless a test-only import update requires a
   narrower helper signature.
4. Hidden scope ruled out: global contract schema mode support remains because
   other contract suites still use migration-era modes.
5. Why the declared task shape matches reality: the runner duplication is
   tautological for reconcile only, and the plan explicitly preserves runtime
   parity terminology outside this task.

### Authority Boundary Map

1. Authority producer: v11 reconcile command API behavior and fixture seeding.
2. Stored authority: retained v11 reconcile case files and corpus manifest rows.
3. In-scope consumers: reconcile contract runner/test and corpus build output.
4. Explicit out-of-scope consumers: global contract schema, non-reconcile
   contract suites, meta-review-gate parity cases, runtime meta-review parity
   logic, and public CLI behavior.
5. Export surfaces closed in this phase: yes for reconcile case mode naming; no
   public runtime export surface changes are required.

### Baseline Preservation

1. Must-preserve behaviors:
   - dry-run output does not remove sessions,
   - mutating cleanup removes stale runtime sessions,
   - no-stale mutation leaves sessions unchanged,
   - final-state stale reason remains `final_state`,
   - non-runtime stale reason remains `non_runtime_state`,
   - corpus manifest includes exactly the retained reconcile v11 case set.
2. Allowed resolution paths:
   - delete redundant reconcile `baseline`/`parity` case files when the matching
     v11 case already proves the same fixture scenario,
   - simplify reconcile runner output to v11-only for reconcile cases,
   - rename reconcile test text away from baseline/parity vocabulary.
3. Forbidden regression interpretations:
   - do not weaken scenario-specific assertions to only `status=ok`,
   - do not delete mutating cases because they are slower than dry-run cases,
   - do not remove corpus manifest coverage for a retained scenario.
4. Replacement proof required if removed:
   - targeted search shows no reconcile `baseline`/`parity` case files or active
     reconcile manifest/test references remain,
   - retained v11 cases cover each scenario listed above,
   - reconcile contract test and corpus build/check pass.

## L1 - Implementation Contract

### Acceptance Criteria

1. `tests/contracts/v11/reconcile.contract.test.ts` lists only v11 reconcile
   case sources and its descriptions no longer claim baseline/parity comparison
   for reconcile.
2. `tests/contracts/v11/reconcile.contract.runner.ts` executes the retained
   reconcile cases through the v11 reconcile implementation only; baseline and
   parity result branches are removed from reconcile-specific output and
   assertions.
3. Redundant reconcile case files with `mode: "baseline"` or `mode: "parity"`
   are removed or reclassified only when their scenario is preserved by a v11
   case.
4. `tests/contracts/v11/corpus/manifest.json` contains only retained v11
   reconcile entries for the five meaningful reconcile scenarios.
5. The global `tests/contracts/v11/schema.ts` mode union is not narrowed in this
   task unless a targeted search proves no other command family still consumes
   `baseline` or `parity`.
6. Runtime/domain parity concepts outside reconcile contract cases are untouched.

### Target File Notes

1. `reconcile.contract.runner.ts` is a test harness, not a mutation entrypoint;
   its fixture execution intentionally creates temporary repos and runtime
   sessions for contract proof only.
2. `reconcile.contract.test.ts` owns the reconcile source inventory and manifest
   equality expectation.
3. `tests/contracts/v11/corpus/manifest.json` is an active checked-in consumer
   of the retained case list.
4. `src/v11/application/reconcile/**` files are read anchors; implementation
   edits are out of scope unless needed to remove a reconcile test-only alias
   import without changing runtime behavior.

### Test Plan

1. Run `pnpm exec vitest run tests/contracts/v11/reconcile.contract.test.ts`.
2. Run the corpus build/check path exercised by the reconcile test, and inspect
   `.pairflow/evidence/contracts-v11-corpus-manifest.json` only as generated
   evidence, not as a checked-in source unless the repo already tracks it.
3. Run `pnpm typecheck`.
4. Run `pnpm lint`.
5. Run a targeted stale-reference search for reconcile `baseline`/`parity`
   case files and descriptions:
   - `rg -n "reconcile.*(baseline|parity)|baseline.*reconcile|parity.*reconcile" tests/contracts/v11`.

## L2 - Work Breakdown

1. Inventory current reconcile case triplets and map each baseline/parity file
   to its retained v11 scenario.
2. Update the reconcile runner type/output contract to v11-only and remove the
   dual-executor parity assertion path for reconcile.
3. Update the reconcile contract test source list, descriptions, and assertions
   to expect v11-only behavior cases.
4. Remove redundant reconcile baseline/parity case files and update the corpus
   manifest to match the retained v11 case set.
5. Run targeted validation and stale-reference search.
6. If validation exposes a behavior scenario that exists only in a removed
   baseline/parity file, restore that scenario as a v11 case before completing
   the task.
