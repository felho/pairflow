---
artifact_type: task
artifact_id: task_meta_review_gate_case_rename_v1
task_family_id: meta-review-gate-case-rename
sequence_key: "4"
task_id: 4-meta-review-gate-case-rename
title: "Meta Review Gate Case Rename"
status: approved
phase: phase1
target_files:
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/cases/meta-review-gate/*.case.json
  - tests/contracts/v11/corpus/manifest.json
  - tests/contracts/v11/corpus/build-corpus.ts
prd_ref: null
plan_ref: plans/parity-test-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 4-meta-review-gate-case-rename-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-30-parity-test-retirement-plan-v1
---

# Task: Meta Review Gate Case Rename

## L0 - Policy

### Goal

Rename and reclassify meta-review-gate contract cases that still use
migration-era `parity` naming even though the runner executes current v11
behavior. Preserve useful behavior coverage and the gate alias case.

### Domain / Control Model Summary

1. Business invariant: meta-review gate contract coverage must still prove the
   supported v11 apply behavior for launching meta-review, handling already
   running meta-review state, delivery-observation persistence, sticky human
   gate bypass, and the `gate` alias.
2. Control model: `applyMetaReviewGateOnConvergenceV11` and the shared
   meta-review-gate modules under `src/v11/shared/metaReviewGate/**` are the
   behavior authority; contract cases are stored behavior examples, not an
   independent legacy baseline.
3. Read-path rule: implementation decisions must read from
   `tests/contracts/v11/metaReviewGate.contract.test.ts`,
   `tests/contracts/v11/metaReviewGate.contract.runner.ts`,
   `tests/contracts/v11/cases/meta-review-gate/*.case.json`, and
   `tests/contracts/v11/corpus/manifest.json`.
4. Forbidden fallback: do not keep `mode: "parity"`, `*-parity.case.json`, or
   parity wording for meta-review-gate cases solely because historical case IDs
   used migration terminology.
5. Allowed resolution path: rename/reclassify retained behavior cases to v11
   case IDs, filenames, mode values, tags, descriptions, test source lists, and
   manifest rows when the payload remains the same behavior scenario.
6. Missing-data rule: if a parity-named meta-review-gate case cannot be mapped
   to a concrete v11 behavior scenario, preserve the behavior first by creating
   or retaining a clearly named v11 case before deleting the old case.
7. Phase boundary:
   - contract closure: owned here for meta-review-gate case identity and corpus rows.
   - producer closure: not owned; runtime meta-review-gate behavior is read-only.
   - internal execution closure: not owned.
   - workflow/orchestration closure: not owned.
   - read-model closure: owned only for contract case names, descriptions,
     tags, and manifest entries.
   - activation closure: owned for tests/corpus checks that reference renamed cases.
   - cleanup/recovery closure: not owned.

### Plan Linkage

1. Parent plan gap closed: useful meta-review-gate behavior cases still look
   like migration parity cases.
2. Depends on: `3-reconcile-contract-v11-only`, archived before this task.
3. Unlocks / impacts successors: this is the final planned task before plan
   close validation.
4. Task-list impact: creates the planned
   `4-meta-review-gate-case-rename` task without replacing or superseding any
   prior task.
5. Inherited validation / exit expectation:
   - `pnpm exec vitest run tests/contracts/v11/metaReviewGate.contract.test.ts`
   - corpus manifest build/check
   - `pnpm typecheck`
   - `pnpm lint`
6. Approval provenance: `CreatePairflowSpec ReviewSpec` task-mode approved this
   artifact during the `ExecutePairflowPlan` route on 2026-05-01 after checking
   execution metadata, parent-plan fit, target-file reality, closed-contract
   drift, and remaining-task viability.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `tests/contracts/v11/metaReviewGate.contract.test.ts`
   - `tests/contracts/v11/metaReviewGate.contract.runner.ts`
   - `tests/contracts/v11/cases/meta-review-gate/*.case.json`
   - `tests/contracts/v11/corpus/manifest.json`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/shared/metaReviewGate/**`
2. Canonical elements: v11 meta-review-gate apply behavior, the `gate` alias
   behavior case, expected `gateRoute`, expected state subset, envelope payload
   subset assertions, and delivery status expectations.
3. Guard elements: corpus manifest rows and test source lists enumerate retained
   cases but do not create behavior semantics beyond the case payloads.
4. Compat-only elements: global contract schema support for `mode: "parity"`
   remains compat for other suites unless a separate task removes it.
5. Forbidden reinterpretations: runtime/domain parity modules under
   `src/v11/shared/metaReviewGate/*Parity*` and structured findings parity
   concepts must not be renamed or deleted by this task.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `tests/contracts/v11/metaReviewGate.contract.test.ts`
   - `tests/contracts/v11/metaReviewGate.contract.runner.ts`
   - `tests/contracts/v11/cases/meta-review-gate/*.case.json`
   - `tests/contracts/v11/corpus/manifest.json`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
2. Actual touched scope: contract/read-model case inventory cleanup.
3. Mutation entrypoints in scope: N/A; this task is test/corpus data cleanup,
   not runtime mutation behavior.
4. Hidden scope ruled out: the runner already executes
   `applyMetaReviewGateOnConvergenceV11`; no independent baseline executor is
   present for meta-review-gate cases.
5. Branch inventory note: preserve these behavior branches:
   basic apply, `gate` alias basic apply, already-running meta-review apply,
   failed delivery observation normalized to confirmed runtime delivery,
   uncertain delivery observation normalized to confirmed runtime delivery, and
   sticky human gate bypass.
6. Why the declared task shape matches reality: the active parity vocabulary is
   in case identity, mode, tags, descriptions, test lists, and manifest rows;
   the v11 runner path is already the behavior authority.

### Current Case Disposition

1. Retain and reclassify the `gate` alias behavior case:
   - from `tests/contracts/v11/cases/meta-review-gate/gate-apply-basic-parity.case.json`
   - to a v11-named alias case such as
     `tests/contracts/v11/cases/meta-review-gate/gate-apply-basic-v11.case.json`.
2. Retain the existing v11 basic meta-review-gate case path:
   - `tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-basic-v11.case.json`.
3. Reclassify the remaining useful behavior cases from parity-named files to
   v11-named files:
   - `meta-review-gate-apply-running-parity.case.json`
   - `meta-review-gate-apply-running-failed-delivery-parity.case.json`
   - `meta-review-gate-apply-running-uncertain-delivery-parity.case.json`
   - `meta-review-gate-apply-sticky-bypass-parity.case.json`.
4. Remove the redundant
   `meta-review-gate-apply-basic-parity.case.json` only after confirming its
   behavior-relevant `input` and `expected` payload are covered by
   `meta-review-gate-apply-basic-v11.case.json`.
5. The final retained set should contain no meta-review-gate `mode: "parity"`
   files, no meta-review-gate `*-parity.case.json` filenames, and no
   meta-review-gate manifest IDs ending in `-parity`.
6. Descriptions and tags should use v11 behavior wording. Runtime/domain
   `parity` terminology outside contract case identity remains out of scope.

### Authority Boundary Map

1. Authority producer: v11 meta-review-gate application behavior.
2. Stored authority: retained v11 case JSON files and corpus manifest rows.
3. In-scope consumers: metaReviewGate contract test source lists, manifest
   source checks, and generated corpus manifest checks.
4. Explicit out-of-scope consumers: runtime meta-review-gate modules,
   findings-parity helpers, global contract schema mode support, non
   meta-review-gate contract suites, and public CLI behavior.
5. Export surfaces closed in this phase: no public runtime export changes are
   required.

### Baseline Preservation

1. Must-preserve behaviors:
   - basic `metaReviewGate` apply routes to `meta_review_running`,
   - `gate` alias apply routes to `meta_review_running`,
   - already-running apply persists confirmed runtime delivery,
   - failed notify delivery is normalized by current launch prompt delivery,
   - uncertain notify delivery is normalized by current launch prompt delivery,
   - sticky human gate bypass routes through the current v11 behavior case.
2. Allowed resolution paths:
   - rename parity-named behavior files to v11-named files,
   - set retained meta-review-gate case `mode` values to `v11`,
   - update manifest IDs/source paths and test expected source lists,
   - delete the redundant basic parity duplicate when payload equivalence is
     proven against the retained v11 basic case.
3. Forbidden regression interpretations:
   - do not remove the `gate` alias case because its old filename says parity,
   - do not weaken case assertions to only `status=ok`,
   - do not delete delivery-observation cases because the descriptions mention
     obsolete notify delivery,
   - do not remove runtime findings parity helpers by name search.
4. Replacement proof required if removed:
   - every removed parity-named case must have a retained v11 behavior case with
     the same behavior-relevant `input`, `expected`, fixture-driving fields, or
     an explicitly preserved behavior-specific replacement.

### Success / Completion Proof Boundary

N/A. This task does not change runtime success or completion semantics.

### Precondition and Side-Effect Boundary

N/A. This task does not modify a runtime mutation flow.

### In Scope

1. Rename or reclassify meta-review-gate contract case files and IDs away from
   parity naming.
2. Update `metaReviewGate.contract.test.ts` source lists and expectations.
3. Update `tests/contracts/v11/corpus/manifest.json`.
4. Preserve the `gate` alias behavior case under v11 naming.
5. Keep generated corpus manifest verification aligned with checked-in manifest rows.

### Out of Scope

1. Runtime behavior changes under `src/v11/application/metaReviewGate/**` or
   `src/v11/shared/metaReviewGate/**`.
2. Global `ContractCase.mode` schema cleanup.
3. Non-meta-review-gate contract case renames.
4. Runtime/domain findings parity terminology cleanup.
5. Public CLI alias behavior changes.

### Safety Defaults

1. Preserve behavior coverage when in doubt, and rename/reclassify before
   deleting.
2. Treat any behavior-relevant input or expected-output mismatch as a blocker to
   duplicate deletion.
3. Keep non-meta-review-gate manifest rows unchanged and in the same relative order.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Impact is limited to test/corpus contract data and test inventory.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Required split: N/A
10. Identity/join note:
    - canonical identity path: retained case source path, case `id`, manifest
      `source`, and test source list must agree.
    - competing identifiers or fallback identities: old `*-parity` filenames,
      old `mode: "parity"`, and old manifest IDs are migration labels only.
11. Authority/source-of-truth note:
    - canonical source: v11 meta-review-gate runner behavior and retained case payloads.
    - forbidden secondary sources: historical parity labels and filename suffixes.
12. Closure-budget triage:
    - closure buckets touched: stored contract cases, test read-model, manifest activation.
    - intentionally collapsed closures: case rename plus test/manifest alignment
      share the same bounded contract corpus.
    - explicitly deferred closures: runtime parity terminology and global schema mode cleanup.
13. Bounded-task-shape decision:
    - primary shape: activation_or_read_model
    - secondary shape: contract_or_persisted_authority_foundation
    - why this bounded mix is safe: the persisted authority is test corpus data,
      and all consumers are the same contract test/corpus manifest family.

## L1 - Change Contract

### Acceptance Criteria

1. `tests/contracts/v11/metaReviewGate.contract.test.ts` lists only retained
   v11-named meta-review-gate case sources; no source path in that list ends in
   `-parity.case.json`.
2. The retained meta-review-gate case files all use `mode: "v11"` and behavior
   descriptions/tags that do not describe their purpose as parity or baseline
   comparison.
3. The `gate` alias behavior case remains present and is renamed/reclassified
   to v11 naming while preserving command `gate`, route `apply`, and expected
   `gateRoute: "meta_review_running"`.
4. The basic meta-review-gate duplicate parity file is deleted only if the
   retained basic v11 case proves the same behavior-relevant `input` and
   `expected` payload.
5. Already-running, failed-delivery, uncertain-delivery, and sticky-bypass
   behavior cases remain covered by retained v11-named case files.
6. `tests/contracts/v11/corpus/manifest.json` contains the retained
   metaReviewGate and gate alias entries with v11 IDs/source paths and no
   meta-review-gate IDs ending in `-parity`.
7. Non-meta-review-gate manifest entries remain unchanged and in the same
   relative order.
8. `tests/contracts/v11/metaReviewGate.contract.runner.ts` continues to execute
   retained cases through `applyMetaReviewGateOnConvergenceV11`; no independent
   baseline/parity executor is added.
9. Runtime/domain parity concepts under `src/v11/shared/metaReviewGate/**` are
   not renamed or deleted by this task.
10. The generated corpus manifest check and checked-in manifest source list
    agree after the rename.

### Test Plan

1. Run `pnpm exec vitest run tests/contracts/v11/metaReviewGate.contract.test.ts`.
2. Run the corpus manifest build/check used by the contract test:
   `pnpm exec tsx ./tests/contracts/v11/corpus/build-corpus.ts`.
3. Run `pnpm typecheck`.
4. Run `pnpm lint`.
5. Search proof:
   - no meta-review-gate case source remains under
     `tests/contracts/v11/cases/meta-review-gate/*-parity.case.json`,
   - no retained meta-review-gate case JSON has `mode: "parity"`,
   - runtime/domain parity helper names outside the contract case corpus remain untouched.

## L2 - Implementation Notes

1. First compare `meta-review-gate-apply-basic-parity.case.json` against
   `meta-review-gate-apply-basic-v11.case.json` for behavior-relevant payload
   equivalence before deleting the duplicate.
2. Prefer `git mv` for renamed case files so the rename is reviewable.
3. Keep the final test source declaration order stable and intentional:
   basic gate alias, basic metaReviewGate, running metaReviewGate,
   failed-delivery running metaReviewGate, uncertain-delivery running
   metaReviewGate, sticky-bypass metaReviewGate.
4. Update manifest rows in-place within the current meta-review-gate block.
5. Do not edit `tests/contracts/v11/schema.ts` unless validation proves the
   schema itself blocks retained v11 case execution.
6. If validation exposes a behavior case with unique expected output not covered
   by a retained v11 case, add or keep a v11-named replacement rather than
   deleting the behavior.

## Review Checklist

1. Every retained meta-review-gate behavior scenario from `Current Case Disposition`
   has one retained v11-named case.
2. The `gate` alias case is still present.
3. No meta-review-gate contract case depends on `mode: "parity"`.
4. Manifest and generated corpus checks use the same retained source set.
5. Runtime meta-review parity helpers were not changed by name-only cleanup.
