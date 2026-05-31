---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_remove_orchestra_bin_v1
task_family_id: remove-orchestra-bin
sequence_key: "0"
task_id: 0-remove-orchestra-bin
title: "Remove Legacy Orchestra CLI Bin"
status: done
phase: phase0
target_files:
  - "package.json"
  - "src/index.ts"
  - "src/cli/orchestra.ts"
  - "tests/cli/orchestra.test.ts"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Remove Legacy Orchestra CLI Bin

## L0 - Policy

### Goal

Remove the legacy `orchestra` public CLI/bin and package export surfaces before npm package-readiness work finalizes the public package manifest. There are no current external users to preserve, so backward-compatible exposure of the removed alias is not required.

### Domain / Control Model Summary

1. Business invariant: the future npm package should expose only supported public CLI entrypoints and package exports.
2. Control model: `package.json.bin` is the public npm-installed command surface; `src/index.ts` is the package export barrel; `pairflow` is the supported primary CLI command; the legacy `orchestra` alias is not part of the intended public surface.
3. Read-path rule: consumers and package-readiness checks must read public CLI commands from `package.json.bin` and package exports from `src/index.ts`.
4. Forbidden fallback: do not keep `orchestra` public only as a removal/help shim, because there are no existing users requiring compatibility.
5. Allowed resolution path: remove the `orchestra` bin entry, remove `src/index.ts` exports for `getOrchestraHelpText` / `runOrchestraCli`, and remove the dedicated `src/cli/orchestra.ts` entrypoint if it has no remaining internal non-public caller.
6. Missing-data rule: if code search finds an internal dependency on `src/cli/orchestra.ts` or the `src/index.ts` re-exported helpers beyond legacy shim tests, the implementation must either remove that dependency or refine this task before deleting the file.
7. Phase boundary:
   - contract closure: owned here for removing `bin.orchestra` from the public npm CLI surface and removing the legacy helper exports from the package barrel
   - producer closure: owned here for deleting or de-publicizing the legacy entrypoint
   - read-model closure: owned here for package manifest/bin inspection
   - workflow/release/package activation closure: successor tasks

### Plan Linkage

1. Parent plan gap closed: the package manifest and package barrel expose `orchestra`, a removed legacy alias, as public surfaces.
2. Depends on: `N/A`.
3. Unlocks / impacts successors: `1-package-version` can define package-readiness and final package contents without carrying a legacy public bin decision.
4. Task-list impact: inserted as sequence `0` before package/version work; the prior `1-package-version` task artifact must be regenerated after this cleanup.
5. Inherited validation / exit expectation: focused package/CLI checks only; npm publish and release automation remain out of scope.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `package.json`
   - `src/index.ts`
   - `src/cli/orchestra.ts`
2. Canonical elements:
   - `bin.pairflow` remains the supported public CLI entrypoint.
   - `bin.orchestra` is a legacy removed alias and should not be exposed by the npm package.
   - `getOrchestraHelpText` and `runOrchestraCli` are legacy shim helpers and should not be exported from `src/index.ts`.
3. Guard elements:
   - `src/cli/orchestra.ts` currently exists as a removal/help shim. It is not evidence of a supported command.
   - `src/index.ts` currently re-exports the shim helpers. That export is not evidence of a supported public API.
4. Compat-only elements:
   - `orchestra --help` currently provides migration text to `pairflow agent emit ...`; this can be removed because there are no current external users.
5. Forbidden reinterpretations:
   - Do not reclassify `orchestra` as a supported alias.
   - Do not retain `orchestra` in `package.json.bin` as part of package-readiness.
   - Do not retain `getOrchestraHelpText` / `runOrchestraCli` as public package exports when the backing shim is deleted.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `package.json`: currently declares `bin.orchestra`.
   - `src/index.ts`: currently re-exports `getOrchestraHelpText` and `runOrchestraCli` from the legacy shim.
   - `src/cli/orchestra.ts`: legacy removed-alias shim that only prints help or throws a removed-command error.
   - `tests/cli/orchestra.test.ts`: expected test surface if an existing test covers the shim; new or removed tests should match the implementation reality.
2. Actual touched scope: narrow public package/CLI surface cleanup.
3. Mutation entrypoints in scope: package manifest `bin` field, package export barrel, and dead legacy CLI entrypoint file/tests.
4. Hidden scope ruled out: package name/scoped policy, `private: true`, package files allowlist, version reporting, release automation, changelog, docs site, skill install, UI service lifecycle.
5. Branch inventory note:
   - `orchestra` has no remaining internal references
   - `orchestra` has remaining internal references
   - `src/index.ts` helper exports have no remaining consumers
   - `src/index.ts` helper exports have remaining consumers
   - remaining `orchestra` mentions are historical/migration notes only
   - remaining `orchestra` mentions imply a still-public bin/export/entrypoint surface
   - tests exist for removed shim
   - tests do not exist for removed shim
6. Why the declared task shape matches reality: this is a small cleanup before public npm packaging; it changes the public bin surface but does not define the rest of the package.

### Refactor Classification

1. Classification: mechanical/local cleanup with public package-surface impact.
2. Classification triggers: removing a legacy entrypoint and corresponding manifest exposure.
3. Caller knowledge reduced: users and package consumers no longer see or reason about a removed alias or its helper exports.
4. Boundary note: because `package.json.bin` and `src/index.ts` are public package surfaces, validation must include package manifest/bin and export inspection even though the code cleanup itself is narrow.

### Authority Boundary Map

1. Authority producer: `package.json.bin` produces the npm-installed public commands; `src/index.ts` produces the package-level exported API.
2. Stored authority: package manifest and source files.
3. In-scope consumers: npm package command surface, public package export surface, local CLI build/test surfaces that reference `orchestra`.
4. Explicit out-of-scope consumers: release tooling, docs site, public npm publish, skill install, UI lifecycle.
5. Export surfaces closed in this phase: yes for removing `orchestra` from public bin and package exports; no for broader package contents.

### Baseline Preservation

1. Must-preserve behaviors:
   - `pairflow` remains in `package.json.bin`.
   - Existing `pairflow` command routing remains unchanged.
2. Allowed removals:
   - `bin.orchestra`
   - `getOrchestraHelpText` / `runOrchestraCli` exports from `src/index.ts`
   - `src/cli/orchestra.ts` when unused
   - tests that only assert the removed legacy shim behavior
3. Forbidden regression interpretations:
   - Do not remove or rename `bin.pairflow`.
   - Do not change `pairflow agent emit ...` behavior.
   - Do not add a replacement alias for `orchestra`.
4. Replacement proof required if removed: prove there are no remaining source/test references requiring the removed entrypoint or removed public helper exports.

### Allowed Remaining References

1. Allowed historical/migration references:
   - `src/cli/commands/agent/emit.ts` may continue to mention that the old `orchestra` actor alias was removed, as user-facing migration context for `pairflow agent emit`.
   - `src/cli/commands/agent/legacyActorCommandRemoval.ts` may retain `orchestra` only as part of the removed-actor-alias error taxonomy if it remains coupled to the existing removed-alias messaging for `pass`, `ask-human`, and `converged`.
2. Forbidden remaining references:
   - `package.json` must not expose `orchestra` in `bin`.
   - `src/index.ts` must not export `getOrchestraHelpText`, `runOrchestraCli`, or a replacement `orchestra` helper.
   - Source or tests must not import from `src/cli/orchestra.ts` / `./cli/orchestra.js` after the entrypoint is deleted.
   - No new `orchestra` executable, alias, or replacement public entrypoint may be added.
3. Review rule: remaining plain-text `orchestra` mentions must be classified as historical/migration notes, not silently accepted as public surface.

### Success / Completion Proof Boundary

1. Current canonical success proof source: `package.json.bin` currently exposes both `pairflow` and `orchestra`.
2. Target canonical success proof source: `package.json.bin` exposes `pairflow` and does not expose `orchestra`; `src/index.ts` no longer exports legacy orchestra helpers.
3. Current canonical completion proof source: none.
4. Target canonical completion proof source: focused validation evidence showing the removed bin surface, no stale references, and preserved `pairflow` build/test behavior.
5. Reused proof contract: `N/A`.
6. Proof-parity rule: `no_reuse`.
7. Final truth surfaces affected: npm public bin manifest, package export barrel, and any dedicated legacy CLI entrypoint file/tests.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: mechanical dead-code removal.
3. Preconditions that must pass before side effects: repo search must confirm whether `src/cli/orchestra.ts` or the `src/index.ts` helper exports have remaining imports/references beyond package bin/tests.
4. Side effects forbidden before preconditions pass: no public npm publish, no release/tag creation, no unrelated package metadata changes.
5. Invalid/precondition-failure behavior: if a non-test internal caller requires `src/cli/orchestra.ts` or the re-exported helpers, stop and refine the task rather than deleting them blindly.
6. Coordination primitives in scope: `N/A`.

### In Scope

1. Remove `orchestra` from `package.json.bin`.
2. Remove `getOrchestraHelpText` and `runOrchestraCli` from `src/index.ts` public exports.
3. Search for all `orchestra` CLI entrypoint and helper export references.
4. Remove `src/cli/orchestra.ts` if it is only used by the removed bin/export/test surface.
5. Remove or update tests that only validate the removed `orchestra` shim.
6. Preserve `bin.pairflow` and the normal `pairflow` CLI path.
7. Record validation evidence that `orchestra` is no longer a package binary or package export.
8. Record any remaining `orchestra` mentions as allowed historical/migration references or remove them if they imply public surface.

### Out of Scope

1. Adding or changing `pairflow --version` / `pairflow -v`.
2. Removing `private: true`.
3. Defining package `files`, package name/scoped policy, npm publish metadata, or UI asset inclusion.
4. Release-please, changelog, commitlint, hooks, GitHub Actions, npm publish, and tags/releases.
5. Docs site generation.
6. Skill install CLI.
7. UI background service lifecycle.
8. Rewriting historical commit messages.

### Safety Defaults

1. Prefer removing unsupported public surface before package publication.
2. Prefer failing the task if unexpected internal references exist rather than leaving a half-removed entrypoint.
3. Keep the implementation narrow: no broader package-readiness edits in this task.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - public npm `bin` surface
   - public package export barrel
   - legacy `orchestra` CLI entrypoint file/test surface
3. Non-impacted contracts:
   - `pairflow` CLI command dispatch
   - package version source
   - release automation
   - UI server behavior

## L1 - Change Contract

### 0) Canonical Contract Matrix

| Surface | Current State | Target State | Owner | Validation |
|---|---|---|---|---|
| `package.json.bin.pairflow` | present | present unchanged | `package.json` | manifest inspection |
| `package.json.bin.orchestra` | present | absent | `package.json` | manifest inspection and `rg` |
| `src/index.ts` orchestra helper exports | `getOrchestraHelpText` and `runOrchestraCli` are re-exported | absent | `src/index.ts` | export inspection and `rg` |
| `src/cli/orchestra.ts` | legacy removed-alias shim | deleted if unused by non-test internals | source tree | `rg` and build/tests |
| Historical/migration `orchestra` mentions | present in adjacent removed-alias messaging | allowed only when not a bin/export/entrypoint/import | adjacent CLI help/error files | classified `rg` audit |
| `pairflow agent emit ...` | canonical replacement named by shim text | unchanged | existing CLI | no source changes here |

### 1) Required Changes

1. Update `package.json` so only supported public binaries remain; specifically remove the `orchestra` entry from `bin`.
2. Remove `getOrchestraHelpText` and `runOrchestraCli` from the `src/index.ts` package export barrel.
3. Run a source search for `orchestra` entrypoint/helper references before deleting `src/cli/orchestra.ts`.
4. Delete `src/cli/orchestra.ts` when references are limited to the package bin, package barrel, and shim-specific tests.
5. Remove or update any shim-specific tests that now assert deleted behavior.
6. Keep all `pairflow` CLI behavior unchanged.

### 2) Acceptance Criteria

1. `package.json.bin` contains `pairflow` and does not contain `orchestra`.
2. `src/index.ts` does not export `getOrchestraHelpText`, `runOrchestraCli`, or any replacement `orchestra` helper.
3. Forbidden-reference check finds no stale public-bin, public-export, or entrypoint imports:
   `rg "bin\\.orchestra|cli/orchestra|getOrchestraHelpText|runOrchestraCli|from [\\\"'][^\\\"']*(^|/)orchestra(\\.js)?[\\\"']" package.json src tests`
4. Remaining-reference audit is run and classified:
   `rg -n "\\borchestra\\b" package.json src tests`
5. Any remaining `orchestra` findings are either removed or explicitly classified as allowed historical/migration references under this task's allowed-reference rules.
6. The project builds after removing the legacy entrypoint.
7. Focused CLI tests pass, or the task records why no focused test remains for the deleted shim.
8. No release automation, publish config, docs site, skill install, UI lifecycle, or package-version behavior is changed.

### 3) Validation Strategy

1. Forbidden-reference check: `rg "bin\\.orchestra|cli/orchestra|getOrchestraHelpText|runOrchestraCli|from [\\\"'][^\\\"']*(^|/)orchestra(\\.js)?[\\\"']" package.json src tests`
2. Remaining-reference audit: `rg -n "\\borchestra\\b" package.json src tests`
3. `pnpm build`
4. Run the narrowest relevant CLI test suite if one exists for bin/entrypoint behavior.
5. Run broader verification only if implementation touches shared CLI dispatch or other non-target source files.

### 4) Review Notes

1. Review should reject the implementation if `orchestra` remains in `package.json.bin`.
2. Review should reject the implementation if `getOrchestraHelpText` or `runOrchestraCli` remains exported from `src/index.ts`.
3. Review should reject any remaining `orchestra` import/entrypoint/bin/export reference.
4. Review should allow adjacent historical/migration mentions only when they do not create a command alias, public export, or executable entrypoint.
5. Review should reject unrelated package-readiness edits such as `private: true` removal, package `files`, or `--version` behavior changes in this task.
6. Review should verify that removing the shim does not alter `pairflow agent emit ...`.
