---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_package_version_v1
task_family_id: package-version
sequence_key: "1"
task_id: 1-package-version
title: "Package Readiness and CLI Version Surface"
status: approved
phase: phase1
target_files:
  - "package.json"
  - "src/cli/index.ts"
  - "src/cli/packageMetadata.ts"
  - "src/v11/infrastructure/ui/uiServerAssets.ts"
  - "tests/cli/index.test.ts"
  - "tests/cli/packageMetadata.test.ts"
  - "tests/cli/uiServerCommand.test.ts"
  - "ui/package.json"
  - "ui/vite.config.ts"
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

# Task: Package Readiness and CLI Version Surface

## L0 - Policy

### Goal

Make Pairflow package-ready as an npm-distributed CLI package without publishing it yet. The package identity decision is already made: publish under the npm organization scope as `@pairflow/cli`, with the installed command remaining `pairflow`. This task owns applying that recorded package identity, package manifest fields, package contents allowlist, package metadata/version source, built UI asset inclusion, and top-level `pairflow --version` / `pairflow -v` behavior.

### Domain / Control Model Summary

1. Business invariant: Pairflow must become package-ready for npm without shipping unintended private/local artifacts or breaking source-checkout CLI workflows.
2. Control model: root `package.json` owns npm package identity, package version, public `bin`, exports, publish config, and package file manifest; the CLI owns local command dispatch and version output; UI asset resolution owns locating packaged and source-tree UI bundles.
3. Read-path rule: `pairflow --version` and `pairflow -v` must read the installed package version from package metadata shipped with the package or from a generated build-time package metadata module derived from root `package.json`.
4. Forbidden fallback: do not infer version from git state, npm registry lookup, dist timestamps, hardcoded duplicated constants, the current working directory's unrelated package metadata, or network access.
5. Allowed resolution path: deterministic package-relative metadata lookup or generated metadata derived from root `package.json` is allowed if it is stable in source checkout, built `dist`, and packed npm layouts.
6. Missing-data rule: missing package metadata or packaged UI assets must be visible as package-readiness failure, not silent success. Version output must fail with an actionable packaging/configuration error if its metadata source is unavailable.
7. Phase boundary:
   - contract closure: owned here for package name/scoped policy, package file manifest, version read path, public `bin`, and `--version` CLI behavior
   - producer closure: owned here for build/package metadata and UI asset inclusion
   - internal execution closure: owned here only for top-level version dispatch and package asset lookup
   - workflow/orchestration closure: successor tasks for commit policy and release automation
   - read-model closure: owned here for CLI version output and `npm pack --dry-run` package-content evidence
   - activation closure: deferred to `7-release-pilot` for isolated tarball install proof and public publish readiness

### Plan Linkage

1. Parent plan gap closed: missing package-name authority, npm package publish readiness, package contents boundary, and visible installed version.
2. Depends on: `0-remove-orchestra-bin`.
3. Unlocks / impacts successors: unlocks `2-commit-policy`, `3-release-automation`, `4-docs-site-pages`, `5-skills-install`, `6-ui-service-lifecycle`, and `7-release-pilot` by stabilizing package identity, package layout, and version source assumptions.
4. Task-list impact: creates the first package-readiness implementation slice after public CLI surface cleanup.
5. Inherited validation / exit expectation: run build/package/package-content checks and prove version output from built artifacts; public publish remains out of scope.

### Pre-Implementation Decision

1. npm organization scope: `@pairflow`.
2. Package name: `@pairflow/cli`.
3. Package visibility: public npm package.
4. Installed CLI bin: `pairflow`.
5. Successor install command: `npm install -g @pairflow/cli`.
6. This task must apply and validate the recorded package identity; it must not re-decide the scoped/unscoped policy during implementation.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `package.json`
   - `src/cli/index.ts`
   - `src/v11/infrastructure/ui/uiServerAssets.ts`
   - `ui/package.json`
   - `ui/vite.config.ts`
2. Canonical elements:
   - `package.json.version` is the single semver source for npm and starts from `0.1.0`.
   - `package.json.name` must become `@pairflow/cli`.
   - Scoped package policy: Pairflow publishes under the npm `@pairflow` organization scope; packages are public.
   - `bin.pairflow` is the supported public CLI entrypoint.
   - `pairflow ui` must be able to locate built UI assets from source checkout and npm package layouts.
3. Guard elements:
   - npm registry/name availability checks are guards for publish readiness, not runtime version source.
   - `npm pack --dry-run` output is evidence, not package metadata authority.
4. Compat-only elements:
   - `scripts/install.sh` remains a contributor/source-checkout install helper and must not become the npm package identity source.
5. Forbidden reinterpretations:
   - Do not treat local git branch state as version authority.
   - Do not treat missing UI assets as successful packaged UI readiness.
   - Do not silently rename the package away from `@pairflow/cli` or change the scoped-package policy without task refinement.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `package.json`: currently declares `name: pairflow`, `version: 0.1.0`, `private: true`, `main`, `types`, `exports`, and only `bin.pairflow`.
   - `src/cli/index.ts`: top-level CLI dispatch has no `--version` / `-v` pre-dispatch handling.
   - `src/cli/packageMetadata.ts`: allowed new metadata reader/generated metadata boundary if implementation needs one.
   - `src/v11/infrastructure/ui/uiServerAssets.ts`: source-tree/package-relative UI asset lookup.
   - `tests/cli/index.test.ts`, `tests/cli/packageMetadata.test.ts`, and `tests/cli/uiServerCommand.test.ts`: expected focused test surfaces; new files are allowed when they do not already exist.
   - `ui/package.json` and `ui/vite.config.ts`: UI build output assumptions.
2. Actual touched scope: mixed `contract_or_persisted_authority_foundation` plus narrow `activation_or_read_model` for version output.
3. Mutation entrypoints in scope: `src/cli/index.ts` top-level dispatch may change; no bubble lifecycle mutation commands are in scope.
4. Hidden scope ruled out: release automation, commit-message enforcement, docs site generation, skill installation command, UI daemon lifecycle, and public publish are successor tasks.
5. Branch inventory note:
   - source checkout vs built `dist` vs packed npm layout
   - recorded package name applied vs unapplied/mismatched
   - UI assets built vs missing
   - `--version`/`-v` vs normal command dispatch
   - explicit package metadata available vs missing/corrupt
   - `private: true` removed after allowlist/no-publish guard exists
6. Why the declared task shape matches reality: this task establishes package/version authority and a small CLI read surface; it does not own release automation or public publishing.

### Refactor Classification

1. Classification: `N/A`.
2. Classification triggers: the task changes package metadata and CLI dispatch behavior; it is feature/package-contract work, not a refactor.
3. Preparatory modifier: `no`.

### Authority Boundary Map

1. Authority producer: root `package.json` produces package identity, public bin surface, package version, and package contents policy; any generated package metadata module must be derived from it.
2. Stored authority: package metadata in `package.json` and packed npm tarball contents.
3. In-scope consumers: top-level CLI version dispatch, npm package manifest, package content verification, UI asset lookup from packaged layout.
4. Explicit out-of-scope consumers: release-please/semantic release automation, GitHub Actions publish, docs site, skill install command behavior, UI background service lifecycle.
5. Export surfaces closed in this phase: yes for package manifest/bin/exports/files and CLI version output; no for release workflow or docs site.

### Baseline Preservation

1. Must-preserve behaviors:
   - Existing `pairflow` CLI command routing must continue to work for all current commands.
   - Existing `pairflow ui` foreground server must continue to print the listening URL after startup.
   - Source-checkout UI asset lookup must remain valid.
2. Allowed resolution paths:
   - Package-relative metadata lookup.
   - Build-time generated package metadata derived from `package.json`.
   - Source-checkout UI asset lookup before package-relative fallback when running from repo source.
3. Forbidden regression interpretations:
   - Do not make `--version` require a built UI bundle.
   - Do not make normal command dispatch depend on npm registry/network access.
   - Do not remove source-checkout install support.
4. Replacement proof required if changed: any change to current UI asset lookup or CLI entrypoint behavior must include equivalent source-checkout and built-package proof.

### Success / Completion Proof Boundary

1. Current canonical success proof source: root `pnpm build` and local command execution from source checkout.
2. Target canonical success proof source: built artifacts plus `npm pack --dry-run` contents and `pairflow --version` / `pairflow -v` output from built `dist`; isolated tarball install proof remains deferred to `7-release-pilot`.
3. Current canonical completion proof source: no package-readiness completion proof exists.
4. Target canonical completion proof source: task verification evidence showing package manifest readiness, package content boundary, UI asset inclusion, absence of `private: true` publish blocker, and version output behavior.
5. Reused proof contract: `N/A`.
6. Proof-parity rule: `no_reuse`.
7. Final truth surfaces affected: CLI stdout for version output, npm package manifest fields, package tarball contents.
8. Mixed-truth surfaces allowed: none; package version has one authority.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `activation_or_read_model` for top-level version output; safe because it is a read-only CLI surface over package metadata.
3. Preconditions that must pass before side effects: package identity is fixed as `@pairflow/cli`; package contents allowlist must be recorded before removing `private: true`.
4. Side effects forbidden before preconditions pass: no public npm publish, no GitHub release/tag creation, no modification of global npm/user config.
5. Invalid/precondition-failure behavior: package-content uncertainty must block package-readiness completion and produce actionable notes; local build/version checks may still run. Changing package identity away from `@pairflow/cli` requires task refinement.
6. Coordination primitives in scope: `N/A`.

### In Scope

1. Apply the recorded package identity decision: set root `package.json.name` to `@pairflow/cli`.
2. Preserve the public command name as `pairflow` via `package.json.bin.pairflow`; the package scope must not change the installed CLI command.
3. Record validation evidence that install docs/successor tasks should use `npm install -g @pairflow/cli` while users invoke `pairflow`.
4. Add package manifest fields needed for npm distribution, including explicit package contents allowlist and publish-related metadata that does not require release automation.
5. Remove `private: true` from root `package.json` by the end of this task after package manifest allowlist and no-public-publish guard boundaries are explicit. If implementation cannot safely remove it, the task must be refined before package-readiness can be declared complete.
6. Ensure the package includes root `dist/**`, type declarations, chosen CLI bin files, and built UI assets needed by `pairflow ui`.
7. Record whether skill source files are included now or explicitly deferred to `5-skills-install`; do not accidentally exclude future skill-install packaging requirements without a note.
8. Add `pairflow --version` and `pairflow -v` behavior at the top-level CLI dispatch.
9. Ensure version output uses package metadata as the only version authority.
10. Add focused tests or equivalent verification for version dispatch and package metadata read failure behavior.
11. Add package-content validation evidence using `npm pack --dry-run`.
12. Preserve current source-checkout install and `pairflow ui` foreground behavior.

### Out of Scope

1. Conventional commit policy, commitlint, commit hooks, release-history strategy, and bubble commit/merge message reconciliation.
2. Release-please/semantic-release configuration, changelog generation, GitHub Release creation, and npm publish workflow.
3. Public npm publish or creation of npm tokens/secrets.
4. Static docs site and GitHub Pages workflow.
5. `pairflow skills install` command behavior.
6. `pairflow ui start|stop|status|restart` background service lifecycle.
7. Historical commit message rewrite.

### Safety Defaults

1. Prefer package-content allowlists over broad npm package inclusion.
2. Prefer fail-closed package metadata errors over invented version output.
3. Prefer preserving existing source-checkout command behavior over npm-only assumptions.
4. Do not enable public publish unless package content and version behavior are proven and successor release guard has been opened.
5. Do not use network/npm registry lookups as runtime behavior.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Final `private` state: `private: true` must be removed by this task once the package file allowlist and no-publish guard boundary are in place. If an implementation cannot safely remove it, the task must be refined before approval rather than declaring package-readiness complete.
3. Impacted contracts:
   - npm package manifest/package contents
   - public CLI `--version` / `-v` output contract
   - public npm `bin` surface (`pairflow` only)
   - package-relative UI asset availability
4. Non-impacted contracts:
   - release automation
   - docs site
   - skill install command behavior
   - UI background lifecycle

## L1 - Change Contract

### 0) Canonical Contract Matrix

| Surface | Current State | Target State | Owner | Validation |
|---|---|---|---|---|
| package identity | `package.json.name` is `pairflow` | `package.json.name` is `@pairflow/cli`; package is public under the npm `@pairflow` org scope | `package.json` | manifest inspection and task evidence |
| package version | `package.json.version` is `0.1.0` | unchanged source of truth for CLI and npm | `package.json` | version tests |
| private publish blocker | root `package.json` has `private: true` | removed after package allowlist/no-publish guard is explicit | `package.json` | manifest inspection and `npm pack --dry-run` |
| public bin | `bin.pairflow` present | installed command remains `pairflow` even though package name is `@pairflow/cli` | `package.json` | manifest inspection |
| package contents | no explicit release-grade allowlist | explicit allowlist includes built CLI/runtime/types and UI assets needed by `pairflow ui`; excludes local/private artifacts | `package.json` | `npm pack --dry-run` |
| version CLI | no top-level `--version` / `-v` dispatch | prints package version and exits 0 before normal command routing | `src/cli/index.ts` + metadata source | focused tests and built CLI execution |
| version authority | no CLI read surface | package metadata only | package metadata boundary | no git/npm/network/timestamp fallback |
| UI asset packaged layout | resolver checks source and package-relative candidates | package contents/resolver support packaged `ui/dist` | `uiServerAssets.ts` and manifest | UI focused test plus pack dry-run |
| skill source packaging | not decided for installed package | included now or explicitly deferred to `5-skills-install` with no accidental exclusion | package allowlist/task evidence | manifest note/pack inspection |

### 1) Required Changes

1. Set root `package.json.name` to `@pairflow/cli`.
2. Keep `bin.pairflow` pointing at the built CLI entrypoint so the installed command remains `pairflow`.
3. Add release-package manifest metadata needed before publish automation, such as explicit `files`, package description/license/repository fields if absent and appropriate, without adding publish workflows.
4. Remove root `private: true` after the package allowlist/no-publish guard is explicit.
5. Add or generate a package metadata read boundary for CLI version output.
6. Add top-level `pairflow --version` and `pairflow -v` handling before command dispatch.
7. Ensure package contents include the built UI bundle expected by `pairflow ui` from an installed package layout.
8. Add or update focused tests for version output, metadata failure behavior, package bin surface, and UI asset/package layout assumptions.
9. Run and record `npm pack --dry-run` evidence after building root and UI artifacts.

### 2) Acceptance Criteria

1. Root `package.json` has `name: @pairflow/cli`, `version: 0.1.0`, no `private: true`, and a public bin named `pairflow`.
2. Package manifest has an explicit contents allowlist that does not include broad local/private artifacts and does include runtime files required by the CLI.
3. Built UI assets are included in package contents or the task records a concrete package-layout adjustment needed to include them.
4. `pairflow --version` and `pairflow -v` print exactly the package version plus a trailing newline and return exit code 0.
5. Normal command dispatch still works after version pre-dispatch handling.
6. Version output reads package metadata or generated metadata derived from root `package.json`; it does not use git/npm/network/timestamps/current working directory fallback.
7. Missing metadata failure behavior is actionable and tested at the metadata boundary.
8. `npm pack --dry-run` evidence shows intended CLI/runtime/types/UI contents and no unintended local artifacts.
9. Public publish is still not automated or executed by this task.
10. Successor tasks have enough stable package identity/layout information to implement commit policy, release automation, docs, skill install, UI lifecycle, and release pilot.
11. Successor docs/release tasks can state the install command as `npm install -g @pairflow/cli`.

### 3) Validation Strategy

1. Pre-edit/reference checks:
   - inspect `package.json` for `name`, `version`, `private`, `bin`, `exports`, and `files`
   - inspect `src/cli/index.ts` dispatch order
   - inspect `src/v11/infrastructure/ui/uiServerAssets.ts` package-relative candidates
2. Focused tests:
   - `pnpm exec vitest run tests/cli/index.test.ts tests/cli/packageMetadata.test.ts tests/cli/uiServerCommand.test.ts`
   - equivalent focused test paths are allowed if implementation places tests differently but covers the same contracts
3. Build/package proof:
   - `pnpm build`
   - `pnpm --dir ui build`
   - `npm pack --dry-run`
   - run built CLI version checks from `dist`, for example `node dist/cli/index.js --version` and `node dist/cli/index.js -v`
4. Full direct-source verification before declaring complete:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - `pnpm test`
   - `pnpm build`
5. If any default verification step is skipped, record why in final evidence.

### 4) Review Notes

1. Reject the implementation if `private: true` remains in root `package.json` without task refinement.
2. Reject the implementation if version output can drift from `package.json.version`.
3. Reject the implementation if `npm pack --dry-run` includes broad local artifacts or omits required CLI/UI runtime assets.
4. Reject the implementation if release automation, npm publish, docs site, skill install command behavior, or UI background lifecycle are added in this task.
5. Reject implementation that changes package identity away from `@pairflow/cli` without task refinement.
