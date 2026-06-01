---
artifact_type: plan
artifact_id: plan_npm_release_dx_onboarding_v1
plan_id: npm-release-dx-onboarding
created_on: "2026-05-31"
title: "NPM Release, CLI DX, and Onboarding Plan"
status: in_progress
plan_status: in_progress
prd_ref: null
owners:
  - "felho"
task_order:
  - 0-remove-orchestra-bin
  - 1-package-version
  - 2a-commit-policy
  - 2b-commit-policy
  - 2c-commit-policy
  - 3-release-automation
  - 4-docs-site-pages
  - 5-skills-install
  - 6-ui-service-lifecycle
  - 7-release-pilot
active_task_id: 4-docs-site-pages
last_completed_task_id: 3-release-automation
archive_group: 2026-05-31-npm-release-dx-onboarding
task_tracker:
  - task_id: 0-remove-orchestra-bin
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/0-remove-orchestra-bin.md
    status: archived
  - task_id: 1-package-version
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/1-package-version.md
    status: archived
  - task_id: 2a-commit-policy
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/2a-commit-policy.md
    status: archived
  - task_id: 2b-commit-policy
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/2b-commit-policy.md
    status: archived
  - task_id: 2c-commit-policy
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/2c-commit-policy.md
    status: archived
  - task_id: 3-release-automation
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/3-release-automation.md
    status: archived
  - task_id: 4-docs-site-pages
    task_path: null
    status: not_created
  - task_id: 5-skills-install
    task_path: null
    status: not_created
  - task_id: 6-ui-service-lifecycle
    task_path: null
    status: not_created
  - task_id: 7-release-pilot
    task_path: null
    status: not_created
---

# Plan: NPM Release, CLI DX, and Onboarding

## Objective

Make Pairflow installable and upgradeable as a normal npm-distributed CLI, with a trustworthy release process, visible version reporting, generated changelog, basic public documentation, skill installation support, and a more operator-friendly UI server lifecycle.

This plan turns the current local-development install story into a release-quality distribution path. It also keeps runtime behavior and lifecycle authority unchanged: publishing, docs, and onboarding should make Pairflow easier to install and operate without weakening bubble workflow safety, review gates, or state ownership.

## Done Definition

1. Pairflow can be packaged as a public npm package with the `pairflow` binary and all runtime assets needed by the CLI, including the built UI assets used by `pairflow ui`.
2. Users can install or upgrade the latest release and a specific version through npm, for example `npm install -g @pairflow/cli@latest` and `npm install -g @pairflow/cli@0.1.0`; the installed CLI command remains `pairflow`.
3. `pairflow --version` and `pairflow -v` print the installed package version from the same version source used for npm publishing.
4. Releases follow semantic versioning from the current `0.1.0` baseline, with conventional commits driving changelog and version bumps.
5. Commit-message policy is documented as a separate, on-demand guidance file at `docs/commit-message-guidance.md`; `AGENTS.md` only points agents to that file when they are preparing a commit.
6. Pairflow bubble lifecycle commits are reconciled with the release model: release-relevant bubble commits use conventional commit messages, merge commits are tolerated integration artifacts only through the exact configured merge header exception forms, revert commits remain recovery-compatible, and historical lifecycle-finalize commits are treated as non-release noise without accepting or generating new finalize messages. Validation applies to new commits after the policy lands, without rewriting or revalidating old history.
7. GitHub automation builds, validates, tags/releases, and publishes npm packages without manual local publish steps after the first-release publish guard is deliberately opened by the release pilot.
8. Operator-facing documentation explains install, upgrade, version pinning, release semantics, CLI basics, UI usage, and skill installation.
9. The CLI exposes a supported skill installation command that wraps the repo-local Pairflow skill install policy without treating global skill copies as source.
10. The UI server lifecycle has a supported start/stop/status/restart path with durable PID/state files, stale-PID handling, and printed URL/status information.
11. The first release is proven with a dry-run package inspection and a release-pilot validation path before public publish is enabled or treated as complete.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Install Pairflow as a CLI through npm | externally_activated | `npm install -g @pairflow/cli@<version>` then `pairflow --version` | npm package metadata, build output, bin entries, package contents, release workflow | npm account/org, `NPM_TOKEN`, package name availability, GitHub repository settings | Planned in `7-release-pilot` |
| Generate changelog and releases from conventional commits | externally_activated | Merge conventional commits, release automation opens/lands release PR or publishes from tag/release event | release configuration, CI workflow, changelog policy docs | GitHub Actions enabled, repository permissions, conventional commit discipline | Commit policy planned across `2a-commit-policy`, `2b-commit-policy`, and `2c-commit-policy`; release automation planned in `3-release-automation`; public publish proven in `7-release-pilot` |
| Publish static documentation through GitHub Pages | externally_activated | GitHub Pages workflow builds docs site on release/main | docs site source and build config | GitHub Pages settings/domain, repository permissions | Planned in `4-docs-site-pages` |
| Install Pairflow skills from the CLI | end_to_end | `pairflow skills install --skills ... --target-dir ...` | CLI command, validation, copy/symlink implementation, dry-run/json reporting | user filesystem permissions for `~/.claude` / `~/.codex` | Planned in `5-skills-install` |
| Manage Pairflow UI as a background local service | end_to_end | `pairflow ui start|stop|status|restart` | CLI commands, PID/state persistence, stale process handling, foreground `pairflow ui` compatibility | local Node process permissions and an available port | Planned in `6-ui-service-lifecycle` |

## Guiding Principles

1. Business invariant: installation and onboarding must become easier without making Pairflow lifecycle operations less explicit, less observable, or less safe.
2. Control model: `package.json` is the package version and npm packaging authority; release automation owns changelog/version/tag/publish orchestration; GitHub Actions owns CI execution; npm owns package distribution; Pairflow CLI owns local runtime behavior; Pairflow skills remain sourced from repo-local `.claude/skills/**`, not global installed copies.
3. Read-path rule: runtime `--version` must read from package metadata embedded in or shipped with the npm package. Release notes must be generated from newly created release-relevant conventional commits, without treating old generic lifecycle messages as release authority. Commit-message guidance must be read from the dedicated repo-local guidance file when commit preparation is in scope, not inlined into every agent session through `AGENTS.md`. Skill install must read source skills from the installed package or repo-local source root, then write only to explicit global target directories.
4. Forbidden fallback: do not infer the installed version from git state, dist timestamps, npm registry lookups, or hardcoded duplicated constants. Do not generate changelog entries from arbitrary prose outside commit metadata. Do not let default Pairflow lifecycle messages such as `bubble(<id>): finalize` or default merge messages become accidental semver authority. Do not manually edit `~/.claude/skills` or `~/.codex/skills` as Pairflow source. Do not kill UI processes only by port when a Pairflow-owned PID/state record is available.
5. Allowed resolution path: deterministic same-authority reconciliation is allowed for stale UI PID cleanup, package-content dry-run inspection, and release workflow idempotency checks. Skill install may support both source-tree and installed-package source roots if the selected source root is explicit and verified.
6. Missing-data rule: if npm credentials, package-name ownership, GitHub Pages configuration, or repository release permissions are missing, the implementation must fail closed with clear operator guidance and keep local package/build validation available. Before `7-release-pilot` proves readiness, npm publish automation must remain disabled, dry-run-only, or protected by a manual GitHub environment approval.
7. Sequencing / boundary note:
   - producer-first rule: package/version surfaces must land before release automation, because automation depends on package metadata and build outputs.
   - downstream consume families that remain separate: package metadata, release automation, docs site, skill install CLI, and UI service lifecycle are separate ownership families and should not be merged into one broad implementation task.
   - cleanup/recovery timing: stale PID recovery is included in UI lifecycle work; historical commit-message rewriting is deferred.

## Canonical Contract Anchors

1. Existing source-of-truth anchors:
   - `package.json`
   - `src/index.ts`
   - `src/cli/index.ts`
   - `src/cli/commands/ui/server.ts`
   - `src/v11/infrastructure/ui/server.ts`
   - `src/v11/infrastructure/ui/uiServerAssets.ts`
   - `.claude/skills/INSTALL.md`
   - `AGENTS.md`
   - `scripts/install.sh`
   - `docs/remote-bubble-execution.md`
   - `docs/pairflow-ui-prd.md`
2. Planned source-of-truth anchors:
   - `docs/commit-and-release-history-authority.md`
   - `docs/commit-message-guidance.md`
   - `<release automation config/workflows, paths to be created by 3-release-automation>`
3. Closed canonical elements / terms:
   - `package.json.version` starts at `0.1.0` and is the semver source for npm.
   - `bin.pairflow` remains the primary CLI entrypoint.
   - `pairflow ui` foreground behavior remains supported and already prints the listening URL.
   - Repo-local `.claude/skills/**` remains the source of truth for Pairflow skill content.
   - Global `~/.claude/skills` and `~/.codex/skills` copies are derived install targets.
   - `AGENTS.md` remains lightweight: it may point to detailed commit-message guidance, but it must not inline the full conventional-commit policy.
   - Release-relevant bubble branch commits are the preferred conventional-commit source of truth.
   - Default git merge commits created by `pairflow bubble merge` are not semver authority in the initial release model.
4. Explicitly authorized reinterpretation:
   - Existing local `scripts/install.sh` remains useful for source checkouts, but npm install becomes the primary user-facing install story.
   - Release triggering should use standard git tags/releases such as `v0.2.0`; commit-message text such as `@v.0.2.0` is treated as an idea to map into standard release automation, not as a required custom trigger format.
5. Downstream task impact: every task inherits the version-source, derived-skill-copy, and UI lifecycle ownership rules above. Tasks must not silently introduce a second version authority, a second skill source of truth, or port-only UI process ownership.

## Current Status

### Completed Work

1. `package.json` now declares the npm package identity `name: @pairflow/cli`, `version: 0.1.0`, `type: module`, `main`, `types`, `bin.pairflow`, an explicit package `files` allowlist, and `publishConfig.access: public`; `private: true` has been removed.
2. The root package already has `build`, `typecheck`, `lint`, and `test` scripts.
3. `pairflow ui` already accepts `--port`, `--host`, `--repo`, and `--assets-dir`.
4. `pairflow ui` already prints the URL after startup: `Pairflow UI server listening on <url>`.
5. UI asset discovery already checks `ui/dist` from the current checkout and package-relative candidates.
6. Pairflow skill installation policy already exists as `.claude/skills/INSTALL.md`.
7. npm registry checks on 2026-05-30 returned `404 Not Found` for both `pairflow` and `@pairflow/cli`; the package identity decision is now `@pairflow/cli` under the npm `@pairflow` organization scope, with release-time access still needing confirmation in the publishing account/org context.
8. `0-remove-orchestra-bin` removed the legacy public CLI alias, deleted the legacy shim entrypoint/test, and removed the public helper exports from `src/index.ts`.
9. `1-package-version` applied the package identity, package-content boundary, public-ready manifest fields, and top-level `pairflow --version` / `pairflow -v` support from package metadata.

### Open Work

1. Changelog generation, conventional-commit policy, release tagging, and npm publish automation are not yet configured.
2. Commit-message guidance, hook/CI enforcement, and Pairflow lifecycle compatibility are split into `2a-commit-policy`, `2b-commit-policy`, and `2c-commit-policy` after task review found the original single task over-wide.
3. The existing `pairflow bubble commit` default message (`bubble(<bubbleId>): finalize`), `pairflow bubble merge` default merge messages, and adjacent commit producers are not yet reconciled with repo-local commit-message enforcement or release automation.
4. There is no generated/static docs site or GitHub Pages workflow.
5. Pairflow skill installation is documented but not available as a supported CLI command.
6. UI background lifecycle commands and PID/state files do not yet exist.
7. The first release has not been proven through isolated local package install, installed-package version check, packaged UI asset check, release automation dry run, docs build proof, skill-install proof, protected publish dry run/manual approval, or publish pilot.

### Deferred / Future Work

1. Rewriting historical commit messages into conventional commit format through a large rebase.
2. Multi-channel release trains such as `next`, `beta`, or nightly builds.
3. Signed provenance/attestations beyond standard GitHub/npm release metadata.
4. Full hosted product docs beyond install, quickstart, CLI reference, UI, release, and skill-install pages.
5. Automatic online update checks in the CLI.
6. Package-manager-specific installers beyond npm-compatible install paths.

## Progress / Phase Summary

1. Phase 1: package/version surfaces and publish-ready artifact boundaries.
2. Phase 2: commit-message authority foundation, repo-local validation enforcement, and Pairflow lifecycle producer compatibility.
3. Phase 3: changelog, semantic versioning, release automation, and guarded npm publish workflow.
4. Phase 4: documentation site and GitHub Pages.
5. Phase 5: onboarding CLI improvements for skill installation.
6. Phase 6: local UI service lifecycle with PID/state ownership.
7. Phase 7: release pilot and operational hardening.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `0-remove-orchestra-bin` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/0-remove-orchestra-bin.md` | Remove the legacy public CLI/bin and package export surfaces before npm package-readiness work proceeds. | `N/A` | Legacy public alias exposure was removed before package-readiness work. | archived |
| `1-package-version` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/1-package-version.md` | Apply the recorded `@pairflow/cli` package identity, make the package publish-ready, define package contents, preserve UI asset inclusion, and add top-level CLI version reporting from package metadata. | `0-remove-orchestra-bin` | Package identity, package-readiness boundary, and visible installed-version surface were established. | archived |
| `2a-commit-policy` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/2a-commit-policy.md` | Establish the commit/release-history authority document, operator guidance document, `AGENTS.md` pointer, canonical first-line taxonomy, and release-history handoff boundary without hook/runtime activation. | `1-package-version` | Missing commit-message authority foundation and release-history classification contract. | archived |
| `2b-commit-policy` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/2b-commit-policy.md` | Implement local validation/gate alignment for the approved taxonomy: validator module/CLI, package script, commit-msg hook, hook installer update, safe-range validator behavior, and focused validator/hook tests. | `2a-commit-policy` | Missing repo-local commit-message enforcement for newly created commits and deterministic safe ranges. | archived |
| `2c-commit-policy` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/2c-commit-policy.md` | Align Pairflow commit producers and lifecycle consumers with the approved taxonomy: local/remote `bubble commit`, merge/revert compatibility, and deterministic accepted default handling for `bubble extract --commit`. | `2b-commit-policy` | Pairflow bubble lifecycle message compatibility and adjacent commit-producer alignment. | archived |
| `3-release-automation` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/3-release-automation.md` | Add conventional-commit release configuration, changelog/version automation, release tagging/release workflow, and guarded npm publish GitHub Actions. | `1-package-version`, `2a-commit-policy`, `2b-commit-policy`, `2c-commit-policy` | Missing automated semver, changelog, release, and guarded npm publish path. | archived |
| `4-docs-site-pages` | `null` | Add static documentation source/build/publish workflow covering install, upgrade, version pinning, CLI basics, UI, skills, and release semantics. | `1-package-version`, `2c-commit-policy`, `3-release-automation` | Missing public onboarding/docs surface. | not_created |
| `5-skills-install` | `null` | Add `pairflow skills install` CLI support around the existing repo-local skill install policy, including target validation, dry-run/json output, and safe symlink/copy behavior. | `1-package-version` | Missing supported CLI path for skill installation. | not_created |
| `6-ui-service-lifecycle` | `null` | Add `pairflow ui start|stop|status|restart` with PID/state files, stale-PID cleanup, URL/status reporting, and foreground `pairflow ui` compatibility. | `1-package-version` | Missing durable local UI server lifecycle management. | not_created |
| `7-release-pilot` | `null` | Prove package contents, local install, version output, UI asset availability, release workflow behavior, docs build, skill install behavior, guarded publish behavior, and first public publish readiness. | `3-release-automation`, `4-docs-site-pages`, `5-skills-install`, `6-ui-service-lifecycle` | Missing last-mile proof that the install/release/onboarding flow works end-to-end. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| The package manifest and public index exports exposed a removed legacy alias as public surfaces. | `0-remove-orchestra-bin` | Removed the bin/export surfaces and dead entrypoint/test surfaces while preserving the supported `pairflow` CLI path. |
| Public npm publish was blocked by package metadata, unapplied package identity, and package contents uncertainty. | `1-package-version` | Applied `@pairflow/cli`, removed `private: true`, and established the package manifest/content boundary; public publish execution remains deferred to release automation and pilot work. |
| Users could not inspect installed Pairflow version through the CLI. | `1-package-version` | Added top-level `--version` / `-v` handling before command dispatch from package metadata. |
| Release versions and changelog are manual. | `3-release-automation` | Prefer standard conventional commits and release tags/releases over a custom commit-message tag trigger. |
| LLM-authored commit messages have no lightweight guidance or enforcement path. | `2a-commit-policy`, `2b-commit-policy` | Put detailed guidance in a separate repo-local file; keep `AGENTS.md` to a short "read this when preparing commits" pointer; enforce with `commit-msg` hook and CI after the authority foundation is approved. |
| Pairflow bubble commit/merge messages can conflict with conventional-commit enforcement. | `2a-commit-policy`, `2b-commit-policy`, `2c-commit-policy` | `2a` defines the authority taxonomy, `2b` enforces it locally for validators/hooks/safe ranges, and `2c` aligns Pairflow commit producers and merge/revert compatibility. Full-history conventional commit selection remains preferred over first-parent-only semantic interpretation; historical finalize commits remain non-release noise without cutoff or legacy compatibility modes. |
| npm publish is not automated. | `3-release-automation` | Requires `NPM_TOKEN` and publish workflow guarded by release/tag event plus dry-run/manual environment approval until `7-release-pilot` opens the guard. |
| Public docs and onboarding path are missing. | `4-docs-site-pages` | Keep initial docs small and operational: install, quickstart, CLI, UI, skills, release process. |
| Skill install is documented but not CLI-supported. | `5-skills-install` | Must preserve repo-local source-of-truth and derived global copy rules. |
| UI background operation lacks process ownership. | `6-ui-service-lifecycle` | PID/state file must own process identity; port-only kill is not sufficient. |
| End-to-end release confidence is missing. | `7-release-pilot` | Prove package contents, local install, version check, UI, docs, skill install, automation, and guarded publish behavior before declaring release readiness. |

## Dependencies and Order

1. `0-remove-orchestra-bin` must run first because the intended public CLI surface should be cleaned before package-readiness work finalizes npm manifest fields.
2. `1-package-version` must run after the legacy bin cleanup because every release, docs, and install claim depends on a publishable package and a trustworthy version source.
3. `2a-commit-policy` must run before local enforcement because the validator and hooks need an approved taxonomy rather than duplicating policy prose.
4. `2b-commit-policy` must run before Pairflow lifecycle alignment because `bubble commit` and related producers must align to the same machine validation contract.
5. `2c-commit-policy` must run before release automation because the release tool must know which commits count as semver/changelog authority and which Pairflow lifecycle or adjacent producer messages are ignored, allowed, or rejected.
6. `3-release-automation` must run after package readiness and all commit-policy split tasks because release automation should validate and publish the same package shape users install, using the same commit semantics that Pairflow lifecycle commands support.
7. `4-docs-site-pages` can start after package/version decisions and release semantics are stable, because docs must name the real package and install/release commands.
8. `5-skills-install` can run after package source-root packaging is understood, because an installed npm package may need a package-relative skill source root.
9. `6-ui-service-lifecycle` can run after package asset inclusion is understood, because background UI startup must work from both source checkout and installed package layouts.
10. `7-release-pilot` must run last because it is the integrated proof across package, release, docs, skills, UI lifecycle, and guarded public publish readiness.

## Progress Updates

1. 2026-06-01: Document bubble `2b-commit-policy-doc` linked the approved
   `2b-commit-policy` task and the close workflow advanced the task and parent
   tracker/table status to `implementable` in the bubble worktree before
   lifecycle commit rather than repairing metadata after merge.
2. 2026-06-01: Document bubble `2c-commit-policy-doc` refined the approved
   `2c-commit-policy` task contract for later implementation, clarifying
   explicit lifecycle commit messages, extract commit default behavior, remote
   dispatch side-effect ordering, and docs-only source-code guardrails.
3. 2026-06-01: Document bubble `3-release-automation-doc` refined the approved
   `3-release-automation` task contract for later implementation, clarifying
   full-reachable-history release tool proof, first-release baseline handling,
   guard-closed versus guard-open publish paths, and docs-only source-code
   guardrails.

## Risks and Assumptions

1. Assumption: the project will publish as public package `@pairflow/cli` under the npm `@pairflow` organization scope; release automation must still confirm org/package access before public publish is treated as complete.
2. Assumption: npm global install is the primary DX path; source checkout install remains available for contributors.
3. Assumption: the initial release model uses full-history conventional commit selection so release-relevant bubble branch commits can be semver/changelog authority while merge commits are ignored as integration artifacts; the `2a`/`2b`/`2c` commit-policy split must encode that first-parent-only semantic interpretation is forbidden for this model.
4. Risk: publishing root source files or local artifacts unintentionally. Mitigation: define `files` explicitly and require `npm pack --dry-run` evidence.
5. Risk: release automation bumps versions unexpectedly while older commit history is not fully conventional. Mitigation: enforce conventional messages for newly created commits, do not rewrite history, and make release automation ignore old generic lifecycle messages as release authority.
6. Risk: commit-message validation blocks valid Pairflow close/recovery history or preserves generic finalize compatibility too broadly. Mitigation: split tasks `2a-commit-policy`, `2b-commit-policy`, and `2c-commit-policy` must explicitly cover merge commits, revert commits, historical finalize noise, new finalize rejection, release-relevant bubble implementation commits, adjacent commit producers, and deterministic new-commit range validation without historical compatibility modes.
7. Risk: inlining commit-message rules in `AGENTS.md` increases irrelevant session context. Mitigation: keep `AGENTS.md` as a pointer only and store the detailed policy in a separate guidance file.
8. Risk: CLI version reporting drifts from npm package version. Mitigation: use package metadata as the only version source.
9. Risk: UI assets are missing after npm install. Mitigation: package `ui/dist/**` and test `pairflow ui` from a packed local install.
10. Risk: skill install overwrites user-customized global skills. Mitigation: support dry-run, validate managed targets, and require explicit force for unsafe replacement.
11. Risk: background UI stop kills an unrelated process. Mitigation: prefer Pairflow-owned PID/state records and verify process identity before termination.
12. Risk: GitHub Pages or npm publish needs repository/account settings not present in code. Mitigation: classify these as external prerequisites and surface clear setup instructions.
13. Risk: npm publish automation fires before release readiness is proven. Mitigation: `3-release-automation` must ship the publish workflow behind dry-run/manual approval/disabled-public-publish guard until `7-release-pilot` proves and explicitly opens it.
14. Risk: a removed legacy CLI alias becomes part of the public npm API by accident. Mitigation: complete the legacy public CLI cleanup before package-readiness work, because there are no current external users requiring compatibility.

## Validation Strategy

1. Run the default repo verification for direct source changes: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant focused tests, broader affected tests, `pnpm test`, and `pnpm build` unless a task narrows or justifies a skip.
2. For package readiness, run `pnpm build`, `pnpm --dir ui build`, and `npm pack --dry-run`; inspect package contents for CLI entrypoints, types, UI assets, docs, and absence of local/private artifacts.
3. For CLI version support, test `pairflow --version`, `pairflow -v`, and normal command dispatch from built `dist`.
4. For commit policy, test conventional-commit parsing inputs, validate the `commit-msg` hook against valid/invalid commit messages, verify the CI commit-message check, verify Pairflow bubble commit/merge/revert message compatibility, and prove the selected release-history strategy.
5. For release automation, test changelog/version generation in dry-run mode where possible, validate workflow YAML syntax/configuration, record history-selection proof for the chosen release tool/config, and verify npm publish remains dry-run/manual-approval/disabled until the release pilot opens the guard.
6. For docs, run the docs build locally and verify generated output is publishable by GitHub Pages.
7. For skill install, test dry-run/json output, selected-skill validation, `.claude` and `.codex` target handling, symlink behavior, and force/stale-target failure cases using temporary HOME directories.
8. For UI lifecycle, test foreground `pairflow ui` remains compatible, then test `ui start`, `ui status`, `ui stop`, `ui restart`, stale PID cleanup, unavailable port behavior, and URL/status output.
9. For the release pilot, install from the generated tarball into an isolated prefix, run `pairflow --version`, run a minimal `pairflow ui` startup against packaged UI assets, run skill-install dry-run, prove guarded publish behavior, and record the exact evidence before public publish.
