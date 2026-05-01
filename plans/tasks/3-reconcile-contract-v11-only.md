---
artifact_type: task
artifact_id: task_reconcile_contract_v11_only_v1
task_family_id: reconcile-contract-v11-only
sequence_key: "3"
task_id: 3-reconcile-contract-v11-only
title: "Reconcile Contract V11 Only"
status: in_progress
phase: phase1
target_files:
  - tests/contracts/v11/reconcile.contract.runner.ts
  - tests/contracts/v11/reconcile.contract.test.ts
  - tests/contracts/v11/cases/reconcile/*.case.json
  - tests/contracts/v11/corpus/manifest.json
  - tests/contracts/v11/corpus/build-corpus.ts
  - src/v11/application/reconcile/reconcileCommandApi.ts
  - src/v11/application/reconcile/reconcileCommandContract.ts
  - src/v11/application/reconcile/emitReconcileV11.ts
prd_ref: null
plan_ref: plans/parity-test-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 3-reconcile-contract-v11-only-doc
impl_bubble_id: 3-reconcile-contract-v11-only-impl
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
   export surface over the same implementation and related typed/error exports,
   not an independent baseline.
3. Read-path rule: cleanup decisions must be anchored to current reconcile
   runner/case/corpus inputs under `tests/contracts/v11/**` and the v11
   reconcile API exports above.
4. Case-order rule: case inventory order in `reconcile.contract.test.ts` should
   follow the same scenario order as `Current Case Disposition`; sorted
   comparisons are allowed only when checking equality against manifest output
   so declaration order cannot affect test pass/fail.
5. Forbidden fallback: do not keep a `baseline` or `parity` reconcile case solely
   because the shared contract schema still permits those modes for other
   command families.
6. Allowed resolution path: keep one v11 behavior case per meaningful reconcile
   scenario, update the reconcile runner/test/corpus manifest to consume only
   those v11 cases, and remove tautological duplicate case files only through
   the triplet-equivalence gate in `Current Case Disposition` item 2 and L1 AC3.
7. Missing-data rule: if a reconcile case cannot be proven redundant with a v11
   behavior case, keep the behavior coverage and first reclassify or add it as
   v11 rather than deleting it. Do not rename the retained v11 case files; their
   source paths are fixed by `Current Case Disposition` item 1.
8. Phase boundary:
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
2. Depends on: `1-facade-migration-map-cleanup`, which is archived before this
   task starts.
3. Sequencing note: no dependency on Task 2; Task 2 is already archived, and
   this task depends only on archived Task 1. Task 4 should inherit the case
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
   - `tests/contracts/v11/corpus/build-corpus.ts`
   - `src/v11/application/reconcile/reconcileCommandApi.ts`
   - `src/v11/application/reconcile/reconcileCommandContract.ts`
   - `src/v11/application/reconcile/emitReconcileV11.ts`
2. Canonical elements: v11 reconcile behavior cases and expected output subset
   assertions remain the contract authority for this task.
3. Guard elements: corpus manifest entries must continue to enumerate every
   retained reconcile behavior case.
4. Compat elements: the global `ContractCase.mode` union may still include
   `baseline` and `parity` for command families outside this task; its
   `CommandMigrationState` alias in `tests/contracts/v11/schema.ts` is a compat
   schema surface and remains unchanged here.
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
3. `tests/contracts/v11/corpus/manifest.json` currently mirrors those triplets
   as 15 reconcile entries: five baseline case files, five v11 case files, and
   five parity case files.
4. The actual touched scope is contract-runner/case/corpus cleanup; reconcile
   production behavior is read-only unless a test-only import update requires a
   narrower helper signature.
5. `emitReconcileV11.ts` also re-exports v11-named reconcile contract types and
   startup reconciler error helpers; this task must preserve that compatibility
   export surface even if the reconcile contract runner stops importing the v11
   function alias.
6. Hidden scope ruled out: global contract schema mode support remains because
   other contract suites still use migration-era modes.
7. Why the declared task shape matches reality: the runner duplication is
   tautological for reconcile only, and the plan explicitly preserves runtime
   parity terminology outside this task.
8. Current non-reconcile manifest inventory includes the
   `gate-apply-basic-parity` and `meta-review-gate-apply-basic-parity` entries;
   both are out of scope for this reconcile cleanup and must remain untouched.

### Current Case Disposition

1. Keep exactly these five reconcile behavior cases in this canonical retained
   reconcile source order. This is the only normative source-order list in this
   task; AC7, L2, and Test Plan checks must reference this item rather than
   copying a separate ordered list. If a validator must copy the list, it must
   copy these full relative paths byte-for-byte:
   - `tests/contracts/v11/cases/reconcile/reconcile-basic-v11.case.json`,
   - `tests/contracts/v11/cases/reconcile/reconcile-mutate-stale-session-v11.case.json`,
   - `tests/contracts/v11/cases/reconcile/reconcile-mutate-no-stale-session-v11.case.json`,
   - `tests/contracts/v11/cases/reconcile/reconcile-stale-reason-final-state-v11.case.json`,
   - `tests/contracts/v11/cases/reconcile/reconcile-stale-reason-non-runtime-state-v11.case.json`.
2. Remove the matching baseline/parity files only after confirming payload
   equivalence across the full triplet: baseline, parity, and retained v11 files
   must have the same behavior-relevant `input`, `expected`, fixture, and
   metadata payloads. No file in the triplet may contain a scenario, fixture
   field, expected field, or tag carrying behavior meaning that is absent from
   either of the other two files:
   - `reconcile-basic.case.json` and `reconcile-basic-parity.case.json` are
     replaced by `reconcile-basic-v11.case.json`,
   - `reconcile-mutate-stale-session.case.json` and
     `reconcile-mutate-stale-session-parity.case.json` are replaced by
     `reconcile-mutate-stale-session-v11.case.json`,
   - `reconcile-mutate-no-stale-session.case.json` and
     `reconcile-mutate-no-stale-session-parity.case.json` are replaced by
     `reconcile-mutate-no-stale-session-v11.case.json`,
   - `reconcile-stale-reason-final-state.case.json` and
     `reconcile-stale-reason-final-state-parity.case.json` are replaced by
     `reconcile-stale-reason-final-state-v11.case.json`,
   - `reconcile-stale-reason-non-runtime-state.case.json` and
     `reconcile-stale-reason-non-runtime-state-parity.case.json` are replaced by
     `reconcile-stale-reason-non-runtime-state-v11.case.json`.
3. The retained `reconcile-basic-v11.case.json` description text must be
   rewritten away from "parity"; it is the dry-run runtime-session cleanup
   behavior case. This is a description-only edit and must not rename the case
   file.
4. Do not add replacement case files unless validation proves one of the five
   preserved scenarios is missing from the retained v11 set.
5. The checked-in manifest source must move from the current 15 reconcile
   triplet entries to exactly the five retained v11 entries above; generated
   evidence manifests are verification outputs only.
6. The manifest rewrite is reconcile-scoped: retain all non-reconcile manifest
   entries and their relative order unless a separate task explicitly owns them.
7. Behavior-relevant fields for triplet-equivalence are `input`, `expected`, and
   any fixture/scenario-driving fields under those objects. In the current
   reconcile triplets, scenario identity is carried by fixture/setup values,
   expected stale-session output, and these five scenario labels: dry-run
   cleanup, mutating stale cleanup, mutating no-stale behavior, final-state
   stale reason, and non-runtime stale reason. The tag audit is exhaustive:
   `mutation-path` and `stale-reason` are behavior-relevant tags; `seed`, `m0`,
   `reconcile`, `parity`, and `v11` are known classification/migration tags that
   are not behavior-preserving by themselves; any other tag is treated as
   behavior-relevant and blocks deletion until the task is updated to classify
   it explicitly. Descriptions are behavior-relevant only if they are the sole
   place a scenario or validation intent is stated; for this task their
   migration wording must be rewritten to behavior wording without changing the
   fixture or expected-output contract.

### Authority Boundary Map

1. Authority producer: v11 reconcile command API behavior and fixture seeding.
2. Stored authority: retained v11 reconcile case files and corpus manifest rows.
3. In-scope consumers: reconcile contract runner/test and corpus build output.
4. Compatibility surface to preserve, not a behavior producer:
   `emitReconcileV11.ts`.
5. Explicit out-of-scope consumers: global contract schema, non-reconcile
   contract suites, meta-review-gate parity cases, runtime meta-review parity
   logic, and public CLI behavior.
6. Export surfaces closed in this phase: yes for reconcile case mode naming; no
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
   - rewrite reconcile test text away from baseline/parity vocabulary.
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
   assertions. The runner may narrow its result/type contract and executor
   signature to the v11-only reconcile implementation as part of removing the
   dual-executor path. That narrowing is limited to the reconcile contract
   runner/test harness and must not change `emitReconcileV11.ts` or
   `tests/contracts/v11/schema.ts`.
3. Redundant reconcile case files with `mode: "baseline"` or `mode: "parity"`
   are removed or reclassified only when their scenario is preserved by a v11
   case and bidirectional payload-equivalence has been verified across the
   baseline/parity/v11 triplet. If any file in the triplet contains
   behavior-relevant input, expected output, fixture metadata, or tags absent
   from another file in that triplet, preserve that behavior by reclassifying or
   adding a v11 case before deleting any legacy file.
4. `tests/contracts/v11/corpus/manifest.json` contains exactly the five retained
   v11 reconcile entries named in `Current Case Disposition`, and no reconcile
   baseline/parity entries. Those five reconcile entries appear in the same
   order as `Current Case Disposition` item 1, replacing the current reconcile
   triplet block without moving non-reconcile entries. Non-reconcile manifest
   entries remain unchanged and in the same relative order, including
   parity-named meta-review-gate entries such as `gate-apply-basic-parity`.
5. `tests/contracts/v11/schema.ts` remains unchanged in this task, including the
   `CommandMigrationState` mode union, because non-reconcile command families
   still consume `baseline` or `parity` modes through that schema.
6. Runtime/domain parity concepts outside reconcile contract cases are untouched.
7. The checked-in case source list in `reconcile.contract.test.ts` and the
   manifest-derived source lists use the same five retained reconcile source
   paths. This applies separately to the checked-in source manifest and to the
   generated evidence manifest produced by the corpus build. The source list
   declaration order must match the scenario order in `Current Case
   Disposition`; manifest comparison may sort both source lists only inside the
   equality assertion. The canonical declaration order is not alphabetical and
   must not be inferred from the sorted comparison. This acceptance criterion
   implements the L0 read-path rule (item 3) and case-order rule (item 4), and
   must be performed in L2 alongside the test source inventory and manifest
   update. The order rule must be auditable by a test assertion that checks the
   declared source list against `Current Case Disposition` item 1 before any
   sorted manifest comparison. If an implementation copies that list into a
   local test constant or helper script, the copied values must be byte-for-byte
   synchronized with item 1 in the same edit.
8. Retained reconcile case JSON descriptions no longer describe reconcile
   coverage as parity; all five retained v11 reconcile case descriptions use
   behavior wording, and `reconcile-basic-v11.case.json` specifically describes
   dry-run runtime-session cleanup behavior without using "parity". Required
   description text is exact per retained case: `Dry-run runtime-session cleanup
   behavior.`, `Mutating stale runtime-session cleanup behavior.`, `Mutating
   no-stale runtime-session behavior.`, `Final state stale reason behavior.`,
   and `Non-runtime state stale reason behavior.`.
9. `emitReconcileV11.ts` keeps its v11-named compatibility exports for reconcile
   contract types, startup reconciler error helpers, and the
   `reconcileRuntimeSessionsV11` function alias unless an explicit successor task
   owns public export-surface removal. The required compatibility symbol set is:
   `ReconcileRuntimeSessionsActionV11`,
   `ReconcileRuntimeSessionsDependenciesV11`,
   `ReconcileRuntimeSessionsInputV11`,
   `ReconcileRuntimeSessionsReportV11`,
   `RuntimeSessionStaleReasonV11`,
   `TmuxSessionLivenessProbeV11`,
   `StartupReconcilerErrorV11`,
   `asStartupReconcilerErrorV11`, and `reconcileRuntimeSessionsV11`.
10. `tests/contracts/v11/reconcile.contract.runner.ts` and
    `tests/contracts/v11/reconcile.contract.test.ts` no longer import or
    reference `reconcileRuntimeSessionsV11` or `emitReconcileV11.ts` after the
    dual-executor reconcile path is removed.

### Target File Notes

1. `reconcile.contract.runner.ts` is a test harness, not a mutation entrypoint;
   its fixture execution intentionally creates temporary repos and runtime
   sessions for contract proof only.
2. `reconcile.contract.test.ts` owns the reconcile source inventory and manifest
   equality expectation.
3. `tests/contracts/v11/corpus/manifest.json` is an active checked-in consumer
   of the retained case list.
4. `tests/contracts/v11/corpus/build-corpus.ts` is a read anchor for generated
   corpus evidence behavior; edit it only if the build path cannot consume the
   updated checked-in manifest and retained case set.
5. Frontmatter `target_files` includes implementation reference anchors because
   the contract runner may need canonical imports from them, but the normal edit
   surface is the reconcile contract harness, case files, and manifest.
6. `src/v11/application/reconcile/reconcileCommandApi.ts` and
   `src/v11/application/reconcile/reconcileCommandContract.ts` are canonical
   import targets for the current reconcile implementation authority and typed
   contract surface; edit them only if an implementation uncovers a compile-time
   boundary mismatch that cannot be solved inside the test harness.
7. `src/v11/application/reconcile/emitReconcileV11.ts` is a read anchor with
   explicit AC9 coverage for its compatibility export surface. It should not be
   edited in the normal path. Narrow test-facing import/type adjustments belong
   in `tests/contracts/v11/reconcile.contract.runner.ts` or
   `tests/contracts/v11/reconcile.contract.test.ts`, not in
   `emitReconcileV11.ts`, and must not change runtime behavior or the
   compatibility exports. If the runner still needs reconcile types, errors, or
   the non-v11 `reconcileRuntimeSessions` implementation after dropping the
   compatibility alias, import them from canonical reconcile modules such as
   `src/v11/application/reconcile/reconcileCommandApi.ts` or
   `src/v11/application/reconcile/reconcileCommandContract.ts`, not from
   `emitReconcileV11.ts`.

### Test Plan

1. Run `pnpm exec vitest run tests/contracts/v11/reconcile.contract.test.ts`.
2. Update the checked-in source manifest at
   `tests/contracts/v11/corpus/manifest.json`, remove any existing
   `.pairflow/evidence/contracts-v11-corpus-manifest.json`, then run
   `pnpm exec vitest run tests/contracts/v11/reconcile.contract.test.ts` as the
   corpus build/check driver for this task. After that command, verify the
   evidence manifest file exists again in the current working tree. The
   generated evidence manifest is verification output, not the source artifact
   to edit.
3. Run `pnpm typecheck`.
4. Run `pnpm lint`.
5. Before deleting legacy reconcile case files, run and summarize a
   triplet-equivalence JSON audit: each removed baseline/parity file must be
   mapped to its retained v11 file and confirmed to have no behavior-relevant
   `input`, `expected`, fixture, or metadata field absent from either sibling
   file. The PASS summary is the location of record for this audit.
6. Ensure `reconcile.contract.test.ts` has an ordered-source assertion that
   checks the declared source list against `Current Case Disposition` item 1
   before any sorted manifest comparison. If a local expected-source constant is
   introduced for that assertion, it must use the same path order as item 1 and
   become the single in-test source reused by manifest comparisons.
7. Verify the checked-in manifest diff is reconcile-scoped: only reconcile
   baseline/parity entries are removed or replaced, all non-reconcile entries
   remain in the same relative order, and the existing
   `gate-apply-basic-parity` entry in `tests/contracts/v11/corpus/manifest.json`
   remains untouched. The manifest schema contract for this task is a JSON
   object with an `entries` array; each entry inspected here must expose string
   `id`, `command`, `source`, and `kind` fields. Use this manifest inventory
   check:
   ```bash
   node --input-type=module <<'NODE'
   import { execFileSync } from "node:child_process";
   import { readFileSync } from "node:fs";

   const path = "tests/contracts/v11/corpus/manifest.json";
   // Copied byte-for-byte from Current Case Disposition item 1.
   const expected = [
     "tests/contracts/v11/cases/reconcile/reconcile-basic-v11.case.json",
     "tests/contracts/v11/cases/reconcile/reconcile-mutate-stale-session-v11.case.json",
     "tests/contracts/v11/cases/reconcile/reconcile-mutate-no-stale-session-v11.case.json",
     "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-final-state-v11.case.json",
     "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-non-runtime-state-v11.case.json"
   ];
   const readEntries = (label, text) => {
     const parsed = JSON.parse(text);
     if (!parsed || !Array.isArray(parsed.entries)) {
       throw new Error(`${label} must be a JSON object with an entries array.`);
     }
     for (const [index, entry] of parsed.entries.entries()) {
       for (const key of ["id", "command", "source", "kind"]) {
         if (typeof entry?.[key] !== "string") {
           throw new Error(`${label} entries[${index}].${key} must be a string.`);
         }
       }
     }
     return parsed.entries;
   };
   const current = readEntries(path, readFileSync(path, "utf8"));
   const base = readEntries(`HEAD:${path}`, execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" }));
   const currentReconcile = current.filter((entry) => entry.command === "reconcile").map((entry) => entry.source);
   if (JSON.stringify(currentReconcile) !== JSON.stringify(expected)) {
     throw new Error(`Unexpected reconcile manifest sources: ${JSON.stringify(currentReconcile)}`);
   }
   const stripReconcile = (entries) => entries.filter((entry) => entry.command !== "reconcile").map((entry) => `${entry.command}:${entry.id}:${entry.source}`);
   if (JSON.stringify(stripReconcile(current)) !== JSON.stringify(stripReconcile(base))) {
     throw new Error("Non-reconcile manifest entries changed or moved.");
   }
   if (!current.some((entry) => entry.id === "gate-apply-basic-parity")) {
     throw new Error("Expected non-reconcile gate-apply-basic-parity entry to remain.");
   }
   NODE
   ```
8. In the commands below, `! rg ...` means the command must return no matches;
   any match is a validation failure unless the step explicitly says to classify
   broader out-of-scope hits.
9. Run targeted stale-reference searches for reconcile-local removed modes,
   removed filenames, and stale descriptions:
   - `! rg -n "\\b(baseline|parity)\\b" tests/contracts/v11/cases/reconcile`
   - `! rg -n "mode\\s*(===|==|:)\\s*[\"'](baseline|parity)[\"']|\\b(baseline|parity)\\b" tests/contracts/v11/reconcile.contract.test.ts tests/contracts/v11/reconcile.contract.runner.ts`
   - `! rg -n "(reconcile-basic|reconcile-basic-parity|reconcile-mutate-stale-session|reconcile-mutate-stale-session-parity|reconcile-mutate-no-stale-session|reconcile-mutate-no-stale-session-parity|reconcile-stale-reason-final-state|reconcile-stale-reason-final-state-parity|reconcile-stale-reason-non-runtime-state|reconcile-stale-reason-non-runtime-state-parity)\\.case\\.json" tests/contracts/v11/corpus/manifest.json tests/contracts/v11/reconcile.contract.test.ts`
   - `! rg -n "\\b(baseline|parity)\\b" tests/contracts/v11/cases/reconcile/*.case.json`
10. Verify retained description behavior wording with a positive JSON check, not
    only by absence of migration labels. The check must assert exact AC8
    descriptions and contain neither `baseline` nor `parity`:
    ```bash
    node --input-type=module <<'NODE'
    import { readFileSync } from "node:fs";

    const expected = new Map([
      ["tests/contracts/v11/cases/reconcile/reconcile-basic-v11.case.json", "Dry-run runtime-session cleanup behavior."],
      ["tests/contracts/v11/cases/reconcile/reconcile-mutate-stale-session-v11.case.json", "Mutating stale runtime-session cleanup behavior."],
      ["tests/contracts/v11/cases/reconcile/reconcile-mutate-no-stale-session-v11.case.json", "Mutating no-stale runtime-session behavior."],
      ["tests/contracts/v11/cases/reconcile/reconcile-stale-reason-final-state-v11.case.json", "Final state stale reason behavior."],
      ["tests/contracts/v11/cases/reconcile/reconcile-stale-reason-non-runtime-state-v11.case.json", "Non-runtime state stale reason behavior."]
    ]);
    for (const [path, expectedDescription] of expected) {
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      const description = String(parsed.description ?? "");
      if (description !== expectedDescription) {
        throw new Error(`${path} description must equal "${expectedDescription}".`);
      }
      if (/\b(baseline|parity)\b/i.test(description)) {
        throw new Error(`${path} description still uses migration vocabulary.`);
      }
    }
    NODE
    ```
11. Verify the `emitReconcileV11.ts` compatibility export surface remains by
   checking every required symbol independently, not by one broad alternation:
   - `for symbol in ReconcileRuntimeSessionsActionV11 ReconcileRuntimeSessionsDependenciesV11 ReconcileRuntimeSessionsInputV11 ReconcileRuntimeSessionsReportV11 RuntimeSessionStaleReasonV11 TmuxSessionLivenessProbeV11 StartupReconcilerErrorV11 asStartupReconcilerErrorV11 reconcileRuntimeSessionsV11; do rg -q "\\b${symbol}\\b" src/v11/application/reconcile/emitReconcileV11.ts || exit 1; done`.
12. Verify the reconcile runner and test no longer import or reference the v11
   compatibility alias:
   - `! rg -n "reconcileRuntimeSessionsV11|emitReconcileV11" tests/contracts/v11/reconcile.contract.runner.ts tests/contracts/v11/reconcile.contract.test.ts`.
13. Verify `tests/contracts/v11/schema.ts` is unchanged by this task in both
   unstaged and staged state:
   - `git diff --exit-code -- tests/contracts/v11/schema.ts`
   - `git diff --cached --exit-code -- tests/contracts/v11/schema.ts`.
## L2 - Work Breakdown

1. Inventory current reconcile case triplets and map each baseline/parity file
   to its retained v11 scenario, including a bidirectional comparison of
   behavior-relevant `input`, `expected`, fixture, and metadata fields before
   any legacy file is removed.
2. If a baseline/parity file is not payload-equivalent with the retained v11
   case in its triplet, reclassify or add the missing behavior as a v11 case
   before any delete step.
3. Update the reconcile runner type/output contract to v11-only and remove the
   dual-executor parity assertion path for reconcile.
4. Update the reconcile contract test source list, descriptions, and assertions
   to expect v11-only behavior cases. Keep the declared source list in the
   canonical retained reconcile source order from `Current Case Disposition`
   item 1; only the manifest equality assertion may sort both lists for
   comparison. Add an explicit ordered-source assertion before the sorted
   manifest comparison, reusing a single in-test expected-source constant if one
   is needed.
5. Remove redundant reconcile baseline/parity case files and update the
   checked-in corpus manifest to match the retained v11 case set while
   preserving all non-reconcile manifest entries.
6. Rewrite retained reconcile case description text away from parity vocabulary,
   including `reconcile-basic-v11.case.json` and any other retained v11
   reconcile case description that still uses migration parity wording. This is
   not a case-file rename step.
7. Verify `emitReconcileV11.ts` still exports the v11-named compatibility types,
   startup reconciler error helpers, and `reconcileRuntimeSessionsV11` alias.
8. Verify `tests/contracts/v11/corpus/build-corpus.ts` still emits corpus
   manifest entries from the checked-in case/source inventory and does not need
   reconcile-specific edits beyond consuming the updated checked-in manifest and
   retained case set.
9. Run targeted validation and stale-reference search.
10. Verify `tests/contracts/v11/schema.ts` has no diff.
11. If validation exposes a behavior scenario that exists only in a removed
   baseline/parity file, restore that scenario as a v11 case before completing
   the task.
