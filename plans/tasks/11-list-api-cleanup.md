---
artifact_type: task
artifact_id: task_list_api_cleanup_v1
task_family_id: list-api-cleanup
sequence_key: "11"
task_id: 11-list-api-cleanup
title: "List API Cleanup"
status: approved
phase: phase4
target_files:
  - src/v11/application/list/listCommandApi.ts
  - src/v11/application/list/listCommandContract.ts
  - src/v11/application/list/listCommandDefaults.ts
  - src/v11/application/list/emitListV11.ts
  - src/v11/application/list/listCliCommand.ts
  - src/cli/commands/bubble/list.ts
  - src/index.ts
  - src/v11/defaults/list/listCommandDefaults.ts
  - src/v11/shared/read-model/list/listReadModelDefaults.ts
  - src/v11/shared/status/statusCommandDependencyDefaults.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - tests/v11/application/list/listCommandApiError.test.ts
  - tests/cli/bubbleListCommand.test.ts
  - tests/core/bubble/listBubbles.test.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/8-list-inventory.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/9-list-readmodel-introduce.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/10-list-runtime-cutover.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 11-list-api-cleanup-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: List API Cleanup

## L0 - Policy

### Goal

Remove the command-shaped application compatibility re-export modules and stale
list API aliases left after the list read-model producer moved to
`src/v11/shared/read-model/list/**` and runtime consumers stopped importing
`src/v11/shared/list/**`. Keep only first-principle command-owned list code in
`src/v11/application/list/**`: CLI option parsing, help text, text rendering,
and command execution wiring. Do not broaden into task 12 fixture, contract
transit, or fitness cleanup except for direct compile/typecheck blockers caused
by removing the application compatibility aliases.

### Domain / Control Model Summary

1. Business invariant: list read-model producer truth must be exposed from the
   command-neutral shared read-model boundary, not through command-shaped
   application compatibility re-exports.
2. Control model:
   - `src/v11/shared/read-model/list/**` owns `listBubbles`,
     `BubbleListError`, `BubbleList*` DTOs, defaults bridge, projection,
     fallback, and read-model semantics.
   - `src/v11/application/list/**` owns command-facing CLI parsing,
     help/rendering, and command invocation only.
   - `src/v11/defaults/list/**` owns the concrete default dependency bundle
     used by the read model until a separate defaults rename is explicitly
     planned.
3. Read-path rule: production callers that need list read-model behavior should
   import the command-neutral read-model API directly or through a stable public
   root export, not through `application/list/listCommandApi`,
   `application/list/listCommandContract`, or
   `application/list/listCommandDefaults`.
4. Forbidden fallback: do not keep application/list `listCommand*` re-export
   files only to avoid import churn, preserve stale test names, or maintain a
   second compatibility facade after task 10 proved runtime cutover.
5. Allowed resolution path: mechanically update active source and focused tests
   from the command-shaped application facades to the canonical read-model
   modules, while preserving CLI parsing/rendering behavior and public root
   exports where they are still part of the package surface.
6. Missing-data rule: if a `listCommand*` hit is a fixture/governance example
   rather than an active source import, leave it to task 12 unless compile,
   typecheck, or `pnpm fitness:check:ci` proves it is a direct blocker caused
   by this task's alias removal.
7. Phase boundary:
   - contract closure: preserve the task 9 read-model contract.
   - producer closure: already closed by tasks 9 and 10.
   - internal execution closure: owned here for active application facade alias
     removal and import rewiring.
   - read-model closure: preserve, do not redesign.
   - activation closure: N/A.
   - cleanup/recovery closure: task 12 owns fixture/fitness wording cleanup.

### Plan Linkage

1. Parent plan gap closed: public/application-facing list compatibility
   leftovers must not survive as a terminal state after runtime cutover.
2. Depends on: `10-list-runtime-cutover`.
3. Unlocks / impacts successors:
   - `12-list-fitness-closeout` can update contract transit, fitness fixtures,
     and source assertions after active source no longer needs stale
     `listCommand*` application API aliases.
   - `13-shared-command-fitness` can harden governance after source and tests no
     longer encode the old active shape.
4. Task-list impact: creates planned task `11-list-api-cleanup`; it does not
   replace or supersede another task id.
5. Inherited validation / exit expectation: active source imports should no
   longer require command-shaped application API re-export modules after this
   task, while CLI list behavior remains equivalent.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/read-model/list/listReadModelApi.ts`
   - `src/v11/shared/read-model/list/listReadModelContract.ts`
   - `src/v11/shared/read-model/list/listReadModelDefaults.ts`
   - `src/v11/application/list/listCliCommand.ts`
   - `src/v11/application/list/emitListV11.ts`
   - `src/index.ts`
   - `src/cli/commands/bubble/list.ts`
   - `src/v11/defaults/list/listCommandDefaults.ts`
   - `src/v11/shared/status/statusCommandDependencyDefaults.ts`
2. Canonical elements:
   - `listBubbles`, `asBubbleListError`, `BubbleListError`,
     `BubbleListInput`, `BubbleListEntry`, `BubbleListStateCounts`, and
     `BubbleListView` keep their task 9/10 meanings from
     `shared/read-model/list`.
   - CLI parse/render/run behavior remains command-owned and behavior
     equivalent.
3. Guard elements:
   - `src/v11/defaults/list/listCommandDefaults.ts` and
     `src/v11/shared/status/statusCommandDependencyDefaults.ts` are defaults
     dependency wiring, not application API facade proof.
   - root package exports in `src/index.ts` may preserve public names such as
     `listBubbles` and `BubbleListView`; this task targets stale internal
     command-shaped compatibility aliases, not user-facing API semantics.
4. Compat-only elements to remove or collapse:
   - `src/v11/application/list/listCommandApi.ts`
   - `src/v11/application/list/listCommandContract.ts`
   - `src/v11/application/list/listCommandDefaults.ts`
   - stale V11/listCommand alias exports in `emitListV11.ts` when they only
     bridge through those compatibility files.
5. Forbidden reinterpretations:
   - do not change list output fields, count semantics, remote refresh/cache
     fallback behavior, attention/review policy/meta-review semantics, error
     taxonomy, CLI option parsing, or text output formatting.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/list/listCommandApi.ts`
   - `src/v11/application/list/listCommandContract.ts`
   - `src/v11/application/list/listCommandDefaults.ts`
   - `src/v11/application/list/listCliCommand.ts`
   - `src/v11/application/list/emitListV11.ts`
   - `src/cli/commands/bubble/list.ts`
   - `src/index.ts`
   - `src/v11/shared/read-model/list/**`
   - `src/v11/defaults/list/listCommandDefaults.ts`
   - `src/v11/shared/status/statusCommandDependencyDefaults.ts`
   - `tests/v11/application/list/*.test.ts`
   - `tests/cli/bubbleListCommand.test.ts`
   - `tests/core/bubble/listBubbles.test.ts`
2. Actual touched scope: active source import rewiring plus deletion or collapse
   of compatibility-only application re-export files.
3. Mutation entrypoints in scope: N/A; this task changes module boundaries and
   imports only.
4. Hidden scope ruled out:
   - no DTO/result redesign.
   - no CLI output or parser redesign.
   - no remote refresh/cache behavior changes.
   - no broad contract transit or fitness fixture cleanup.
   - no governance rule tightening.
5. Branch inventory note: preserve existing local, remote, refresh-fallback,
   dependency-error, stale-runtime-count, attention, review policy, and
   meta-review branches by import-path-only changes.
6. Why the declared task shape matches reality: task 10 already removed
   `src/v11/shared/list/**`; the remaining active application command-shaped
   modules are compatibility re-exports or CLI-owned command files. This task
   removes only the compatibility layer and keeps first-principle CLI ownership.

### Authority Boundary Map

1. Authority producer: `src/v11/shared/read-model/list/**`.
2. Command owner: `src/v11/application/list/listCliCommand.ts` for CLI parsing,
   help, rendering, and command execution wrapper.
3. Public package surface: `src/index.ts` may continue exporting stable public
   names backed directly by the canonical read-model or CLI command module.
4. Explicit out-of-scope consumers: contract transit source fixtures, fitness
   fixture path strings, archived task/plan prose, and governance hardening.
5. Export surfaces closed in this phase: command-shaped
   `application/list/listCommandApi`, `listCommandContract`, and
   `listCommandDefaults` should no longer exist as active compatibility
   modules after successful cleanup, unless a direct compile blocker requires a
   narrower retained shim and that blocker is escalated.

### In Scope

1. Remove or collapse `src/v11/application/list/listCommandApi.ts`,
   `src/v11/application/list/listCommandContract.ts`, and
   `src/v11/application/list/listCommandDefaults.ts` as compatibility-only
   re-export modules.
2. Update `src/v11/application/list/listCliCommand.ts` to import list read-model
   API, error, and type surfaces directly from `src/v11/shared/read-model/list/**`.
3. Update `src/v11/application/list/emitListV11.ts` and `src/index.ts` so
   stable public list exports remain available without depending on deleted
   command-shaped application API aliases.
4. Update `src/cli/commands/bubble/list.ts` only as needed to keep the CLI
   command barrel pointing at first-principle CLI command code.
5. Update focused tests that import deleted application compatibility modules so
   they prove canonical read-model behavior, public root exports, or CLI command
   behavior instead.
6. Keep `src/v11/defaults/list/listCommandDefaults.ts` and
   `src/v11/shared/status/statusCommandDependencyDefaults.ts` unchanged unless
   compile/typecheck proves a direct import maintenance need.
7. Preserve list behavior and error/result semantics.

### Out of Scope

1. Broad contract transit source fixture cleanup in
   `tests/contracts/uiContractTransitSource.test.ts`.
2. Broad fitness fixture/path cleanup in `tests/tools/fitness/**`.
3. Governance hardening or new command-named shared directory checks.
4. Renaming the concrete defaults bundle under `src/v11/defaults/list/**`
   unless directly required by compile/typecheck after facade removal.
5. Changing root public API names or CLI command names unless a documented
   compatibility decision already authorizes it.
6. Changing remote execution refresh/cache behavior or list read-model DTO
   fields.

### Safety Defaults

1. If an import can be updated mechanically to the canonical read-model module,
   update it rather than recreating a compatibility alias.
2. If a remaining `listCommand*` hit is CLI parsing/rendering ownership, keep it
   only when the file/function is first-principle command-owned.
3. If a remaining `listCommand*` hit is a fixture/governance old-path string,
   leave it to task 12 unless it is a direct compile/typecheck/fitness blocker.
4. If removing an application compatibility file would require changing runtime
   semantics, stop and route to replanning instead of preserving a hidden alias
   layer.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - internal TypeScript module/import contract for list application and public
     package exports.
   - no DB, auth, config, event payload, or user-facing CLI behavior changes.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. Required split: N/A.
10. Identity/join note:
    - canonical identity path: read-model behavior imports from
      `shared/read-model/list/**`.
    - competing identifiers or fallback identities: application/list
      `listCommand*` re-export files are transition-only and must not remain
      API truth.
11. Authority/source-of-truth note:
    - canonical source: task 9 producer boundary and task 10 runtime cutover.
    - forbidden secondary sources: application compatibility wrappers and old
      path fixture strings.
12. Closure-budget triage:
    - closure buckets touched: `application_api_facade_cleanup`,
      `public_export_rewire`, `focused_test_import_rewire`.
    - intentionally collapsed closures: facade deletion plus active import
      rewiring, because the facade has no independent behavior.
    - explicitly deferred closures: contract transit, fitness fixture cleanup,
      governance hardening, and defaults-bundle rename.
13. Bounded-task-shape decision:
    - primary shape: `consumer_family_alignment`.
    - secondary shape: `contract_boundary_cleanup`.
    - why this bounded mix is safe: only module import paths and
      compatibility-only re-exports are affected; list behavior remains owned
      by the existing read-model producer.
14. Contract-dense decision:
    - gate triggered: `yes`
    - trigger reasons: `internal API/import surface`, `downstream consumers`,
      `mirrored surfaces`
    - canonical matrix source: L1 `Canonical Contract Matrix`
    - mirrored surfaces: L0 canonical anchors, L1 compatibility table, test
      matrix, acceptance criteria.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Active list API imports must use command-neutral read-model ownership, not command-shaped application re-export wrappers. | Delete or collapse compatibility-only `application/list/listCommand*` facade modules. | P1 | required-now |
| Control model | `shared/read-model/list` owns producer/DTO/error/default bridge semantics; `application/list` owns CLI parsing/rendering. | Import canonical behavior directly into CLI command code and public emit/root surfaces. | P1 | required-now |
| Read-path rule | Runtime and API consumers read from canonical read-model exports or stable root package exports. | No active source should import `application/list/listCommandApi`, `listCommandContract`, or `listCommandDefaults` after cleanup. | P1 | required-now |
| CLI ownership rule | CLI parse/help/render/run code may remain in `application/list`. | Keep `listCliCommand.ts` if it contains first-principle command behavior. | P1 | required-now |
| Fixture boundary | Contract transit and fitness old-path strings are successor-owned evidence. | Do not edit broad fixture/governance tests unless directly blocking compile/typecheck/fitness after this task's source changes. | P1 | required-now |
| Forbidden fallback | Do not keep wrappers because stale tests import them. | Update focused tests to canonical read-model/root/CLI surfaces instead. | P1 | required-now |
| Missing-data rule | Ambiguous non-source or governance hits route to task 12. | Do not absorb task 12 cleanup. | P1 | required-now |
| Phase boundary | API facade cleanup now; fixture/fitness cleanup later. | Keep task 12 scope intact. | P1 | required-now |

### 1) Canonical Contract Matrix

| Matrix ID | Current Surface | Target Surface | Owned Now | Deferred | Compatibility Rule |
|---|---|---|---|---|---|
| LAC-API | `src/v11/application/list/listCommandApi.ts` | `src/v11/shared/read-model/list/listReadModelApi.ts` or stable root export | yes | none | behavior and error normalization must be identical |
| LAC-CONTRACT | `src/v11/application/list/listCommandContract.ts` | `src/v11/shared/read-model/list/listReadModelContract.ts` or stable root type export | yes | none | DTO field meanings unchanged |
| LAC-DEFAULTS-FACADE | `src/v11/application/list/listCommandDefaults.ts` | no application facade; canonical defaults bridge remains under read-model/defaults ownership | yes | optional future defaults rename | no hidden replacement alias |
| LAC-CLI | `src/v11/application/list/listCliCommand.ts` | same file, direct read-model imports | yes | none | CLI parse/render/run unchanged |
| LAC-ROOT-EXPORT | `src/v11/application/list/emitListV11.ts` and `src/index.ts` | root exports backed directly by canonical read-model/CLI modules | yes | none | public export names remain stable unless already authorized otherwise |
| LAC-FIXTURE | contract/fitness old path or `listCommand*` strings | successor-owned fixture/governance wording | no | task 12 | may remain as non-runtime fixture evidence |

### 2) Data and Interface Contract

| Interface / Function | Current Contract | Target Contract | Side Effects | Priority | Timing |
|---|---|---|---|---|---|
| `listBubbles` | Exposed through application facade and root alias, implemented by read-model API. | Implemented and imported from read-model API; root export remains stable. | Existing reads/cache refresh only. | P1 | required-now |
| `asBubbleListError` | Exposed through application facade/root alias. | Imported/exported from read-model API directly. | N/A. | P1 | required-now |
| `BubbleListError` | Exposed through application facade/root alias. | Imported/exported from read-model API directly. | N/A. | P1 | required-now |
| `BubbleListInput` / `Entry` / `StateCounts` / `View` | Exposed through application contract facade/root aliases. | Imported/exported from read-model contract directly. | N/A. | P1 | required-now |
| CLI parse/help/render/run functions | Owned by application CLI command file. | Same external behavior with direct read-model imports. | N/A. | P1 | required-now |
| `listCommandDefaults` dependency bundle | Concrete defaults implementation. | Preserve current behavior; do not make it an application facade. | Existing dependency reads/writes only. | P2 | required-now |

### 3) Error and Fallback Contract

| Case | Required Behavior | Forbidden Behavior | Test Expectation |
|---|---|---|---|
| Active source imports deleted application facade | Compile fails and task must update the import to canonical read-model/root/CLI surface. | Restore a hidden application facade wrapper. | typecheck |
| Focused application API tests import deleted facade | Update tests to canonical read-model or root public export while preserving behavior assertions. | Keep stale test imports only to justify facade retention. | focused tests |
| CLI command imports deleted facade | Update `listCliCommand.ts` to import from canonical read-model modules. | Change CLI parsing/rendering behavior. | CLI tests |
| Root export bridge depends on stale aliases | Rewire `emitListV11.ts` or `src/index.ts` to read-model exports while preserving public names. | Remove public exports as an incidental cleanup. | typecheck/core tests |
| Fixture old path remains | Leave as task 12 evidence. | Broadly rewrite contract/fitness fixtures in task 11. | task 12 owns fixture cleanup |
| Compile/typecheck/fitness fails because this task removed an active source alias | Apply the smallest import/source assertion update needed. | Broaden into governance or fixture cleanup. | typecheck/fitness |
| Remote refresh fallback | Existing cached/unavailable semantics remain. | Treat remote failures differently because import path changed. | list behavior tests |

### 4) Dependency Constraints

1. Use existing ESM `.js` relative import style.
2. Do not add runtime dependencies.
3. Do not introduce a new shared boundary name.
4. Do not recreate command-shaped list compatibility barrels under another path.
5. Do not promote CLI rendering/parsing code into `shared`.

### 5) Test Matrix

| Test / Check | Purpose | Priority | Timing |
|---|---|---|---|
| `pnpm vitest run tests/v11/application/list/listCommandApi.test.ts tests/v11/application/list/listCommandApiError.test.ts` | preserve list API/error behavior after test imports are rewired | P1 | required-now |
| `pnpm vitest run tests/cli/bubbleListCommand.test.ts` | preserve CLI parse/render/run behavior | P1 | required-now |
| `pnpm vitest run tests/core/bubble/listBubbles.test.ts` | preserve core list behavior and root/public export path | P1 | required-now |
| `pnpm typecheck` | import contract integrity after facade deletion | P1 | required-now |
| `pnpm lint` | source style/import hygiene | P1 | required-now |
| `pnpm fitness:check:ci` | boundary regression evidence; catch direct blockers only | P1 | required-now |
| `pnpm test` | broad regression before completion | P1 | required-now |
| `pnpm build` | runtime artifact freshness after source/CLI changes | P1 | required-now |

### 6) Ownership and Deferred Semantics

1. This task owns application/list command-shaped API facade cleanup and active
   import rewiring.
2. This task owns preserving first-principle CLI command parsing/rendering under
   `application/list`.
3. Task 12 owns contract transit, fitness fixture, and source assertion wording
   that still encodes old `shared/list/listCommand*` or stale command-shaped
   fixture examples.
4. A passing task 11 must not be interpreted as permission to keep
   `src/v11/application/list/listCommandApi.ts`,
   `src/v11/application/list/listCommandContract.ts`, or
   `src/v11/application/list/listCommandDefaults.ts` as source boundaries.
5. A passing task 11 also must not force immediate renaming of
   `src/v11/defaults/list/listCommandDefaults.ts`; that file is dependency
   wiring and should be handled only by a separate planned defaults cleanup or
   direct compile-driven maintenance.

## L2 - Implementation Notes

1. Start with source import evidence, not broad string cleanup:
   `rg -n "application/list/listCommand|listCommandApi|listCommandContract|listCommandDefaults|listBubblesV11|BubbleListV11|shared/list|shared/read-model/list" src tests ui tools`.
2. Classify each hit before editing:
   - active source import from `application/list/listCommandApi` or
     `application/list/listCommandContract`: update to
     `shared/read-model/list/listReadModelApi` or
     `shared/read-model/list/listReadModelContract`.
   - `src/v11/application/list/listCliCommand.ts`: keep the file; update its
     API/type imports directly to the read-model boundary.
   - `src/v11/application/list/emitListV11.ts`: preserve needed root/public
     export names, but source them directly from read-model modules instead of
     deleted application facades.
   - `src/cli/commands/bubble/list.ts`: keep it as the CLI command barrel if it
     points at `listCliCommand.ts`.
   - `src/v11/defaults/list/listCommandDefaults.ts`,
     `src/v11/shared/read-model/list/listReadModelDefaults.ts`, and
     `src/v11/shared/status/statusCommandDependencyDefaults.ts`: leave unchanged
     unless compile/typecheck proves direct import maintenance is required.
   - contract/fitness/source-fixture strings: leave to task 12 unless a
     compile/typecheck or `pnpm fitness:check:ci` failure proves the specific
     reference is an active blocker caused by this task.
   - archived plans/tasks: ignore as historical evidence.
3. Remove the compatibility-only files once imports are rewired:
   - `src/v11/application/list/listCommandApi.ts`
   - `src/v11/application/list/listCommandContract.ts`
   - `src/v11/application/list/listCommandDefaults.ts`
4. Re-run the search after deletion. Acceptable remaining `listCommand` hits
   are first-principle CLI command names/functions, defaults dependency bundles
   explicitly listed in this task, task-12 fixture/governance evidence, and
   archived documentation. Any active source import from the deleted application
   facade files is a blocker.
5. Update focused tests:
   - API behavior tests should import from the canonical read-model API or root
     public export, not from deleted application facade files.
   - CLI tests should continue to import and validate CLI parse/render/run
     functions through the CLI command surface.
   - core list tests should keep proving root/public export behavior where that
     is the intended public package path.
6. Apply the compile/typecheck/fitness unblocker decision rule:
   - if the failing reference is a narrow stale import or assertion to a deleted
     application facade, update only that reference.
   - if the failure asks for broad fixture wording, governance tightening, or
     task-12 source assertion cleanup, stop and ask for replanning or a human
     decision.
7. Run focused list/API/CLI tests before broad verification.

## Acceptance Criteria

1. `src/v11/application/list/listCommandApi.ts`,
   `src/v11/application/list/listCommandContract.ts`, and
   `src/v11/application/list/listCommandDefaults.ts` no longer exist as active
   compatibility re-export modules, unless a direct compile blocker is
   escalated with a retained-shim rationale.
2. No active source file imports the deleted application/list compatibility
   modules after implementation.
3. `src/v11/application/list/listCliCommand.ts` remains first-principle
   command-owned CLI code and imports list read-model API/types directly from
   the canonical read-model boundary.
4. Stable root/public list exports continue to work without depending on stale
   command-shaped application facade aliases.
5. `src/v11/shared/read-model/list/**` preserves the task 9/10 behavior and DTO
   contract; no list output, fallback, count, remote execution, attention,
   review policy, or meta-review semantics change.
6. `src/v11/defaults/list/listCommandDefaults.ts` and status dependency
   defaults are not renamed or semantically moved unless a direct compile
   blocker requires a narrow maintenance edit.
7. Contract transit and fitness old-path strings remain untouched unless they
   are direct compile/typecheck/fitness blockers caused by this task; broad
   cleanup remains task 12.
8. The focused tests in the L1 test matrix pass, followed by the
   repository-required verification for source changes.

## Assumptions

1. Task 9 already introduced the command-neutral read-model producer and
   preserved behavior.
2. Task 10 already removed `src/v11/shared/list/**` runtime transition wrappers.
3. Current root/public list exports are still intended to remain stable; this
   task removes stale internal command-shaped compatibility aliases, not user
   CLI command names.

## Open Questions

1. Should `src/v11/defaults/list/listCommandDefaults.ts` be renamed in a later
   explicitly planned defaults-cleanup task, or is the defaults bundle name
   acceptable as non-application dependency wiring? This task treats it as
   deferred unless compile/typecheck requires direct maintenance.
