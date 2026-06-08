---
artifact_type: plan
artifact_id: plan_npm_release_dx_onboarding_v1
plan_id: npm-release-dx-onboarding
created_on: "2026-05-31"
title: "NPM Release, CLI DX, and Onboarding Plan"
status: done
plan_status: done
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
  - 7a-package-release-proof
  - 7b-docs-readiness-proof
  - 7c-skill-install-proof
  - 7d-ui-lifecycle-proof
  - 7e-release-go-no-go
  - 7f-external-release-setup
  - 7g-registry-install-smoke
active_task_id: null
last_completed_task_id: 7g-registry-install-smoke
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
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/4-docs-site-pages.md
    status: archived
  - task_id: 5-skills-install
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/5-skills-install.md
    status: archived
  - task_id: 6-ui-service-lifecycle
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/6-ui-service-lifecycle.md
    status: archived
  - task_id: 7a-package-release-proof
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7a-package-release-proof.md
    status: archived
  - task_id: 7b-docs-readiness-proof
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7b-docs-readiness-proof.md
    status: archived
  - task_id: 7c-skill-install-proof
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7c-skill-install-proof.md
    status: archived
  - task_id: 7d-ui-lifecycle-proof
    task_path: plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7d-ui-lifecycle-proof.md
    status: archived
  - task_id: 7e-release-go-no-go
    task_path: plans/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md
    status: done
  - task_id: 7f-external-release-setup
    task_path: plans/tasks/2026-05-31-npm-release-dx-onboarding/7f-external-release-setup.md
    status: done
  - task_id: 7g-registry-install-smoke
    task_path: plans/tasks/2026-05-31-npm-release-dx-onboarding/7g-registry-install-smoke.md
    status: done
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
11. The first release is proven with local package inspection, release-pilot
    validation, explicit GO/NO-GO guard opening, and a post-publish registry
    install smoke before public npm install readiness is treated as complete.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Install Pairflow as a CLI through npm | externally_activated | `npm install -g @pairflow/cli@<version>` then `pairflow --version` | npm package metadata, build output, bin entries, package contents, release workflow | npm account/org, `NPM_TOKEN`, package name availability, GitHub repository settings | Local tarball proof planned in `7a-package-release-proof`; missing external setup is diagnosed by `7e-release-go-no-go` and remediated/verified by `7f-external-release-setup`; post-publish registry install smoke planned in `7g-registry-install-smoke` |
| Generate changelog and releases from conventional commits | externally_activated | Merge conventional commits, release automation opens/lands release PR or publishes from tag/release event | release configuration, CI workflow, changelog policy docs | GitHub Actions enabled, repository permissions, conventional commit discipline | Commit policy planned across `2a-commit-policy`, `2b-commit-policy`, and `2c-commit-policy`; release automation planned in `3-release-automation`; publish blockers diagnosed by `7e-release-go-no-go`; missing external setup closed in `7f-external-release-setup`; published artifact install proven in `7g-registry-install-smoke` |
| Publish static documentation through GitHub Pages | externally_activated | GitHub Pages workflow builds and deploys docs on pushes to `main` and on GitHub release `published` events | docs site source, build config, generated docs artifact, Pages artifact upload, and Pages deploy workflow config | GitHub Pages settings/domain, repository permissions, public Pages URL activation | Source/build/workflow surfaces implemented in `4-docs-site-pages`; local generated-artifact readiness proof planned in `7b-docs-readiness-proof`; external Pages activation status consumed by `7e-release-go-no-go` |
| Install Pairflow skills from the CLI | end_to_end | `pairflow skills install --skills ... --target-dir ...` | CLI command, validation, copy/symlink implementation, dry-run/json reporting | user filesystem permissions for `~/.claude` / `~/.codex` | CLI/source-checkout implementation completed in `5-skills-install`; installed-package proof planned in `7c-skill-install-proof` |
| Manage Pairflow UI as a background local service | end_to_end | `pairflow ui start|stop|status|restart` | CLI commands, PID/state persistence, stale process handling, foreground `pairflow ui` compatibility | local Node process permissions and an available port | CLI/source-checkout implementation completed in `6-ui-service-lifecycle`; source and installed-package lifecycle proof completed in `7d-ui-lifecycle-proof` |

## Guiding Principles

1. Business invariant: installation and onboarding must become easier without making Pairflow lifecycle operations less explicit, less observable, or less safe.
2. Control model: `package.json` is the package version and npm packaging authority; release automation owns changelog/version/tag/publish orchestration; GitHub Actions owns CI execution; npm owns package distribution; Pairflow CLI owns local runtime behavior; Pairflow skills remain sourced from repo-local `.claude/skills/**`, not global installed copies.
3. Read-path rule: runtime `--version` must read from package metadata embedded in or shipped with the npm package. Release notes must be generated from newly created release-relevant conventional commits, without treating old generic lifecycle messages as release authority. Commit-message guidance must be read from the dedicated repo-local guidance file when commit preparation is in scope, not inlined into every agent session through `AGENTS.md`. Skill install must read source skills from the installed package or repo-local source root, then write only to explicit global target directories.
4. Forbidden fallback: do not infer the installed version from git state, dist timestamps, npm registry lookups, or hardcoded duplicated constants. Do not generate changelog entries from arbitrary prose outside commit metadata. Do not let default Pairflow lifecycle messages such as `bubble(<id>): finalize` or default merge messages become accidental semver authority. Do not manually edit `~/.claude/skills` or `~/.codex/skills` as Pairflow source. Do not kill UI processes only by port when a Pairflow-owned PID/state record is available.
5. Allowed resolution path: deterministic same-authority reconciliation is allowed for stale UI PID cleanup, package-content tarball inspection, and release workflow idempotency checks. Skill install may support both source-tree and installed-package source roots if the selected source root is explicit and verified.
6. Missing-data rule: if npm credentials, package-name ownership, GitHub Pages configuration, or repository release permissions are missing, the implementation must fail closed with clear operator guidance and keep local package/build validation available. Before the split `7*` release-pilot proof chain proves readiness, npm publish automation must remain disabled, validation-only, or protected by a manual GitHub environment approval.
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
7. The first release has not been proven through isolated local package install, installed-package version check, packaged UI asset check, release automation validation, docs build proof, skill-install proof, protected publish approval, GO/NO-GO guard opening, or post-publish registry install smoke.

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
| `4-docs-site-pages` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/4-docs-site-pages.md` | Add static documentation source/build/publish workflow covering install, upgrade, version pinning, CLI basics, UI, skills, and release semantics. | `1-package-version`, `2c-commit-policy`, `3-release-automation` | Missing public onboarding/docs surface. | archived |
| `5-skills-install` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/5-skills-install.md` | Add `pairflow skills install` CLI support around the existing repo-local skill install policy, including target validation, dry-run/json output, and safe symlink/copy behavior. | `1-package-version` | Missing supported CLI path for skill installation. | archived |
| `6-ui-service-lifecycle` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/6-ui-service-lifecycle.md` | Add `pairflow ui start|stop|status|restart` with PID/state files, stale-PID cleanup, URL/status reporting, and foreground `pairflow ui` compatibility. | `1-package-version` | Missing durable local UI server lifecycle management. | archived |
| `7a-package-release-proof` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7a-package-release-proof.md` | Prove package contents, isolated packed install, version output, release workflow guard behavior, and publish prerequisite status. | `3-release-automation`, `6-ui-service-lifecycle` | Local tarball package proof completed; public publish readiness remains NO-GO until `7e` diagnoses and `7f` verifies external GitHub/npm prerequisites. | archived |
| `7b-docs-readiness-proof` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7b-docs-readiness-proof.md` | Prove docs build/readiness with the concrete docs build command and generated install, UI, skills, and release pages. | `4-docs-site-pages`, `7a-package-release-proof` | Local docs validation, generated route/content coverage, and Pages workflow proof completed; public Pages availability remains NO-GO until `7e` diagnoses and `7f` verifies external GitHub Pages settings/environment/public URL. | archived |
| `7c-skill-install-proof` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7c-skill-install-proof.md` | Prove `pairflow skills install` from dry-run/json and isolated installed-package target behavior without treating global skill copies as source. | `5-skills-install`, `7a-package-release-proof` | Installed-package skill install proof completed; real global skill directories were not used as source or mutated. | archived |
| `7d-ui-lifecycle-proof` | `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7d-ui-lifecycle-proof.md` | Prove `pairflow ui start|status|restart|stop` from source and packed/installed context; repo-owned packed UI gaps block plan closure. | `6-ui-service-lifecycle`, `7a-package-release-proof` | Source and installed-package UI lifecycle proof completed; a macOS `/var` versus `/private/var` false negative was resolved with realpath-based state-path auditing. | archived |
| `7e-release-go-no-go` | `plans/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md` | Aggregate release-pilot evidence, diagnose missing external prerequisites, and produce the GO/NO-GO readiness record without resolving setup or opening publish guards. | `7a-package-release-proof`, `7b-docs-readiness-proof`, `7c-skill-install-proof`, `7d-ui-lifecycle-proof` | Release-pilot GO/NO-GO decision recorded `release_no_go`; local proof passed, external GitHub/npm/Pages prerequisites route to `7f-external-release-setup`. | done |
| `7f-external-release-setup` | `plans/tasks/2026-05-31-npm-release-dx-onboarding/7f-external-release-setup.md` | Verify and record operator-created external GitHub/npm release activation prerequisites named by `7e`; no agent-created secrets/tokens/environments/Pages/npm access, source/workflow edits, or real release/publish. | `7e-release-go-no-go` | External GitHub/npm/Pages setup verified: release and npm secrets present, publish guard variable present and false, protected npm publish environment present, Pages workflow source/public URL present, and npm user/org/package access confirmed before first public publish. | done |
| `7g-registry-install-smoke` | `plans/tasks/2026-05-31-npm-release-dx-onboarding/7g-registry-install-smoke.md` | After `7f` verifies external setup readiness and after the operator completes actual release plus successful npm publish workflow, prove registry install for `@pairflow/cli@latest` and the exact published version without relying on the local tarball or source checkout. | `7f-external-release-setup` | Missing post-publish npm registry install proof for the user-facing install claim. | approved |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| The package manifest and public index exports exposed a removed legacy alias as public surfaces. | `0-remove-orchestra-bin` | Removed the bin/export surfaces and dead entrypoint/test surfaces while preserving the supported `pairflow` CLI path. |
| Public npm publish was blocked by package metadata, unapplied package identity, and package contents uncertainty. | `1-package-version` | Applied `@pairflow/cli`, removed `private: true`, and established the package manifest/content boundary; public publish execution remains deferred to release automation and pilot work. |
| Users could not inspect installed Pairflow version through the CLI. | `1-package-version` | Added top-level `--version` / `-v` handling before command dispatch from package metadata. |
| Release versions and changelog are manual. | `3-release-automation` | Prefer standard conventional commits and release tags/releases over a custom commit-message tag trigger. |
| LLM-authored commit messages have no lightweight guidance or enforcement path. | `2a-commit-policy`, `2b-commit-policy` | Put detailed guidance in a separate repo-local file; keep `AGENTS.md` to a short "read this when preparing commits" pointer; enforce with `commit-msg` hook and CI after the authority foundation is approved. |
| Pairflow bubble commit/merge messages can conflict with conventional-commit enforcement. | `2a-commit-policy`, `2b-commit-policy`, `2c-commit-policy` | `2a` defines the authority taxonomy, `2b` enforces it locally for validators/hooks/safe ranges, and `2c` aligns Pairflow commit producers and merge/revert compatibility. Full-history conventional commit selection remains preferred over first-parent-only semantic interpretation; historical finalize commits remain non-release noise without cutoff or legacy compatibility modes. |
| npm publish is not automated. | `3-release-automation`, `7e-release-go-no-go`, `7f-external-release-setup`, `7g-registry-install-smoke` | Requires `NPM_TOKEN` and publish workflow guarded by release/tag event plus validation/manual environment approval until `7e` diagnoses missing setup and `7f` records operator-owned setup verification; any guard opening is an explicit operator action after verified setup, and the public install claim closes only after registry install smoke. |
| Public docs and onboarding path are missing. | `4-docs-site-pages` | Keep initial docs small and operational: install, quickstart, CLI, UI, skills, release process. |
| Skill install is documented but not CLI-supported. | `5-skills-install` | Must preserve repo-local source-of-truth and derived global copy rules. |
| UI background operation lacks process ownership. | `6-ui-service-lifecycle` | PID/state file must own process identity; port-only kill is not sufficient. |
| End-to-end release confidence is missing. | `7a-package-release-proof`, `7b-docs-readiness-proof`, `7c-skill-install-proof`, `7d-ui-lifecycle-proof`, `7e-release-go-no-go`, `7f-external-release-setup`, `7g-registry-install-smoke` | Split release-pilot proof by ownership family, aggregate GO/NO-GO evidence before opening publish, explicitly remediate external setup blockers, then prove the published npm registry artifact installs. |

## Dependencies and Order

1. `0-remove-orchestra-bin` must run first because the intended public CLI surface should be cleaned before package-readiness work finalizes npm manifest fields.
2. `1-package-version` must run after the legacy bin cleanup because every release, docs, and install claim depends on a publishable package and a trustworthy version source.
3. `2a-commit-policy` must run before local enforcement because the validator and hooks need an approved taxonomy rather than duplicating policy prose.
4. `2b-commit-policy` must run before Pairflow lifecycle alignment because `bubble commit` and related producers must align to the same machine validation contract.
5. `2c-commit-policy` must run before release automation because the release tool must know which commits count as semver/changelog authority and which Pairflow lifecycle or adjacent producer messages are ignored, allowed, or rejected.
6. `3-release-automation` must run after package readiness and all commit-policy split tasks because release automation should validate and publish the same package shape users install, using the same commit semantics that Pairflow lifecycle commands support.
7. `4-docs-site-pages` can start after package/version decisions and release semantics are stable, because docs must name the real package and install/release commands.
8. `5-skills-install` can run after package source-root packaging is understood, because an installed npm package may need a package-relative skill source root.
9. `6-ui-service-lifecycle` can run after package asset inclusion is understood, because its source-checkout lifecycle implementation must preserve package-relative asset resolution without proving installed-package execution in this task.
10. The `7*` release-pilot proof tasks must run last because they are the integrated proof across package, release, docs, skills, UI lifecycle, guarded public publish readiness, external activation setup, and published registry install behavior. Start with `7a-package-release-proof`, then run independent docs/skills/UI proof tasks as dependencies allow, use `7e-release-go-no-go` to diagnose missing publish/docs prerequisites, use `7f-external-release-setup` to remediate and verify those prerequisites, and finish plan closure only after `7g-registry-install-smoke` proves the published npm artifact installs.

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
4. 2026-06-01: Document bubble `4-docs-site-pages-doc` refined the approved
   `4-docs-site-pages` task contract for later implementation, clarifying the
   docs-only source-code guard, deterministic static docs build/output
   contract, GitHub Pages external activation boundary, and current-vs-future
   wording for skills and UI onboarding.
5. 2026-06-02: Document bubble `5-skills-install-doc` refined the approved
   `5-skills-install` task contract for later implementation, clarifying the
   docs-only source-code guard, per-skill sync/link and `--force` semantics,
   status output meanings, and the boundary between package-content inspection
   and successor-owned installed-package execution proof.
6. 2026-06-02: Document bubble `6-ui-service-lifecycle-doc` refined the
   approved `6-ui-service-lifecycle` task contract for later implementation,
   clarifying the docs-only source-code guard, source-checkout versus
   installed-package proof boundary, helper-script preservation, and
   Pairflow-owned UI service lifecycle authority.
7. 2026-06-02: Task-admin review for the planned `7-release-pilot` task found
   the integrated release pilot too wide for one implementation bubble. The
   task was split in the plan into `7a-package-release-proof`,
   `7b-docs-readiness-proof`, `7c-skill-install-proof`,
   `7d-ui-lifecycle-proof`, and `7e-release-go-no-go` so each proof family can
   be reviewed and executed with bounded ownership before the final release
   readiness decision.
8. 2026-06-07: ReviewSpec task-mode for `7a-package-release-proof` found that
   the parent plan still claimed npm registry install readiness without an
   explicit post-publish proof task. Added a registry install smoke task after
   `7e-release-go-no-go` so local tarball proof, guard-opening decision, and
   public registry install proof remain separate closures; later plan
   refinement moved this successor to `7g-registry-install-smoke`.
9. 2026-06-07: Completed and archived `7a-package-release-proof`. Evidence
   recorded `pnpm release:validate`, `pnpm build`, `npm pack --json`, tarball
   content inspection, isolated temp-prefix install, and installed
   `pairflow --version` / `pairflow -v` matching `0.1.0`. Publish activation
   remains NO-GO for `7e` because GitHub Actions secrets/variables and the
   `npm-publish` environment are missing, and npm org/package access was
   unknown due to unauthenticated local npm CLI.
10. 2026-06-07: Created draft task `7b-docs-readiness-proof` as the next
    proof-only release-pilot task. It verifies local docs validation, generated
    docs route/content coverage, Pages workflow configuration, and external
    GitHub Pages prerequisite status without editing docs source or mutating
    GitHub Pages settings.
11. 2026-06-07: Completed and archived `7b-docs-readiness-proof`. Evidence
    recorded `pnpm docs:validate`, required generated page coverage,
    generated-content boundary checks, and `.github/workflows/docs-pages.yml`
    inspection. Public docs availability remains NO-GO for `7e` because GitHub
    Pages is disabled, the `github-pages` environment is missing, and no public
    Pages URL exists, while repository Actions permissions are present.
12. 2026-06-07: Created draft task `7c-skill-install-proof` as the next
    proof-only release-pilot task. It verifies installed-package
    `pairflow skills install` dry-run JSON, isolated target writes,
    `--link-other` symlinks, package-local skill source resolution, and real
    global skill directory non-mutation without editing runtime/source files.
13. 2026-06-07: ReviewSpec task-mode approved `7c-skill-install-proof` after
    full-lane review and targeted scope/contract/capability reruns. Refinement
    tightened the retained-versus-fresh tarball branch, checkout build-artifact
    boundary, real install status expectation, Node stdin snippets, and real
    global skill directory pre/post audit.
14. 2026-06-07: Completed `7c-skill-install-proof`. Evidence recorded
    `pnpm build`, `npm pack --json`, isolated temp-prefix install, installed
    `pairflow --version` output `0.1.0`, installed-package
    `pairflow skills install --dry-run --json`, isolated real install with
    `--link-other`, required skill `SKILL.md` and symlink audits, real global
    skill directory pre/post non-mutation, and cleanup. The first source-root
    audit hit a macOS `/var` versus `/private/var` path-alias false negative;
    a realpath rerun proved package-local source resolution.
15. 2026-06-08: Archived `7c-skill-install-proof` after evidence completion and
    advanced the active release-pilot task to `7d-ui-lifecycle-proof`.
16. 2026-06-08: Created draft `7d-ui-lifecycle-proof` to prove source-checkout
    and isolated installed-package `pairflow ui start|status|restart|stop`
    lifecycle behavior before release-pilot readiness aggregation.
17. 2026-06-08: ReviewSpec task-mode approved `7d-ui-lifecycle-proof` after
    refinement tightened fail-closed lifecycle assertions, exact state-path
    checks, installed package asset proof, and fail-safe cleanup in one shell
    block.
18. 2026-06-08: Completed `7d-ui-lifecycle-proof`. Evidence recorded
    `pnpm build`, fresh `npm pack`, source-checkout `pairflow ui`
    `start|status|restart|stop`, isolated installed-package UI lifecycle
    without repo-local `--assets-dir`, packaged `ui/dist/index.html` serving,
    exact state-path realpath boundaries, stop cleanup, and removed temp proof
    directory. The first source audit hit a macOS `/var` versus `/private/var`
    path-alias false negative; a diagnostic confirmed realpath equality and the
    checklist now uses realpath-based exact state-path comparison.
19. 2026-06-08: Archived `7d-ui-lifecycle-proof` after evidence completion and
    advanced the active release-pilot task to `7e-release-go-no-go`.
20. 2026-06-08: Created draft `7e-release-go-no-go` to aggregate completed
    release-pilot proof evidence, verify current release/publish/docs guard
    state, classify external GitHub/npm prerequisites, and record an explicit
    first-release GO/NO-GO decision before any public publish activation.
21. 2026-06-08: ReviewSpec task-mode approved `7e-release-go-no-go` after
    targeted contract/capability refinement made `7a`/`7b` evidence consumption
    schema-specific, made missing Pages prerequisites force release NO-GO,
    separated observed publish variable state from post-GO authorization, and
    preserved the post-publish registry smoke as a separate successor boundary.
22. 2026-06-08: Plan refinement found a sequencing gap after
    `7e-release-go-no-go`: the plan could diagnose missing external GitHub/npm
    prerequisites but had no task to remediate them before registry smoke.
    Added draft `7f-external-release-setup` for operator-owned external setup
    evidence and moved the post-publish registry install smoke to
    `7g-registry-install-smoke`. The intended simplified flow is `7e`
    diagnoses missing external prerequisites, `7f` resolves and verifies them
    in one task, and `7g` proves the registry artifact only after actual
    release/publish.
23. 2026-06-08: Completed `7e-release-go-no-go`. Evidence consumed archived
    `7a`-`7d` proof, reran `pnpm release:validate` and `pnpm docs:validate`,
    inspected workflow guards, and used GitHub CLI read-only checks for
    `felho/pairflow`. Local proof passed, but release remained `release_no_go`
    because Actions secrets/variables, environments, GitHub Pages/public URL,
    npm authentication, and npm package/org access are missing or unknown.
    Advanced active work to `7f-external-release-setup`.
24. 2026-06-08: Completed `7f-external-release-setup`. Evidence recorded
    operator-created GitHub secrets `NPM_TOKEN` and `RELEASE_PLEASE_TOKEN`,
    repository variable `PAIRFLOW_NPM_PUBLISH_ENABLED=false`, environments
    `npm-publish` and `github-pages`, GitHub Pages `build_type=workflow` with
    public URL `https://felho.github.io/pairflow/`, npm CLI login `felho`, and
    npm `pairflow` org ownership. Publish guard remains intentionally closed;
    the next checkpoint is actual release/publish execution, and
    `7g-registry-install-smoke` remains unavailable until a public npm publish
    succeeds.
25. 2026-06-08: Created draft `7g-registry-install-smoke` to prove the
    published npm registry artifact installs from `@pairflow/cli@latest` and
    the exact published version after actual release plus successful npm
    publish. The task is post-publish proof-only: it forbids release creation,
    publish execution, GitHub/npm mutation, local tarball substitution, and
    source/workflow fixes.
26. 2026-06-08: ReviewSpec task-mode approved `7g-registry-install-smoke`
    after first-pass metadata/scope/contract/capability lanes and targeted
    scope/contract reruns. Refinement added separate latest/exact install
    prefixes, explicit release tag/workflow run/version binding evidence,
    guard-closed blocker vocabulary, and executable environment-variable wiring
    for installed binary audits.
27. 2026-06-08: Ran the initial `7g-registry-install-smoke` precondition
    checks. The worktree was clean and local package version was `0.1.0`, but
    no GitHub releases were listed, the remote default branch did not expose
    `npm-publish.yml` workflow runs, `PAIRFLOW_NPM_PUBLISH_ENABLED=false`, and
    npm registry lookups for `@pairflow/cli`, `@pairflow/cli@0.1.0`, and
    dist-tags returned E404. Evidence was recorded as
    `registry_install_smoke_blocked`; public install readiness remains
    `not_ready` until actual release and successful npm publish complete.
28. 2026-06-08: Completed `7g-registry-install-smoke` after Release Please
    published GitHub release `v0.2.0` and the guarded npm publish workflow run
    `27165905076` completed successfully. npm registry metadata confirmed
    `@pairflow/cli@latest` and `@pairflow/cli@0.2.0` resolve to `0.2.0`; an
    isolated registry install smoke installed both `latest` and exact `0.2.0`
    package specs with isolated HOME/cache, and all installed version command
    checks returned `0.2.0`. Public npm install readiness is now complete for
    the first published release.

## Risks and Assumptions

1. Assumption: the project will publish as public package `@pairflow/cli` under the npm `@pairflow` organization scope; release automation must still confirm org/package access before public publish is treated as complete.
2. Assumption: npm global install is the primary DX path; source checkout install remains available for contributors.
3. Assumption: the initial release model uses full-history conventional commit selection so release-relevant bubble branch commits can be semver/changelog authority while merge commits are ignored as integration artifacts; the `2a`/`2b`/`2c` commit-policy split must encode that first-parent-only semantic interpretation is forbidden for this model.
4. Risk: publishing root source files or local artifacts unintentionally. Mitigation: define `files` explicitly and require `npm pack --json` evidence.
5. Risk: release automation bumps versions unexpectedly while older commit history is not fully conventional. Mitigation: enforce conventional messages for newly created commits, do not rewrite history, and make release automation ignore old generic lifecycle messages as release authority.
6. Risk: commit-message validation blocks valid Pairflow close/recovery history or preserves generic finalize compatibility too broadly. Mitigation: split tasks `2a-commit-policy`, `2b-commit-policy`, and `2c-commit-policy` must explicitly cover merge commits, revert commits, historical finalize noise, new finalize rejection, release-relevant bubble implementation commits, adjacent commit producers, and deterministic new-commit range validation without historical compatibility modes.
7. Risk: inlining commit-message rules in `AGENTS.md` increases irrelevant session context. Mitigation: keep `AGENTS.md` as a pointer only and store the detailed policy in a separate guidance file.
8. Risk: CLI version reporting drifts from npm package version. Mitigation: use package metadata as the only version source.
9. Risk: UI assets are missing after npm install. Mitigation: package `ui/dist/**` and test `pairflow ui` from a packed local install.
10. Risk: skill install overwrites user-customized global skills. Mitigation: support dry-run, validate managed targets, and require explicit force for unsafe replacement.
11. Risk: background UI stop kills an unrelated process. Mitigation: prefer Pairflow-owned PID/state records and verify process identity before termination.
12. Risk: GitHub Pages or npm publish needs repository/account settings not present in code. Mitigation: classify these as external prerequisites and surface clear setup instructions.
13. Risk: npm publish automation fires before release readiness is proven. Mitigation: `3-release-automation` must ship the publish workflow behind validation/manual approval/disabled-public-publish guard until the split `7*` release-pilot proof chain proves and explicitly opens it.
14. Risk: a removed legacy CLI alias becomes part of the public npm API by accident. Mitigation: complete the legacy public CLI cleanup before package-readiness work, because there are no current external users requiring compatibility.

## Validation Strategy

1. Run the default repo verification for direct source changes: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant focused tests, broader affected tests, `pnpm test`, and `pnpm build` unless a task narrows or justifies a skip.
2. For package readiness, run `pnpm build`, `pnpm --dir ui build`, and `npm pack --json`; inspect package contents for CLI entrypoints, types, UI assets, docs, and absence of local/private artifacts.
3. For CLI version support, test `pairflow --version`, `pairflow -v`, and normal command dispatch from built `dist`.
4. For commit policy, test conventional-commit parsing inputs, validate the `commit-msg` hook against valid/invalid commit messages, verify the CI commit-message check, verify Pairflow bubble commit/merge/revert message compatibility, and prove the selected release-history strategy.
5. For release automation, test changelog/version generation in dry-run mode where supported by the release tool, validate workflow YAML syntax/configuration, record history-selection proof for the chosen release tool/config, and verify npm publish remains validation/manual-approval/disabled until the release pilot opens the guard.
6. For docs, run the docs build locally and verify generated output is publishable by GitHub Pages.
7. For skill install, test dry-run/json output, selected-skill validation, `.claude` and `.codex` target handling, symlink behavior, and force/stale-target failure cases using temporary HOME directories.
8. For UI lifecycle, test foreground `pairflow ui` remains compatible, then test `ui start`, `ui status`, `ui stop`, `ui restart`, stale PID cleanup, unavailable port behavior, and URL/status output.
9. For the release pilot, install from the generated tarball into an isolated prefix, run `pairflow --version`, run a minimal `pairflow ui` startup against packaged UI assets, run skill-install dry-run, prove guarded publish behavior, record the exact evidence before public publish, remediate and verify missing GitHub/npm external prerequisites through `7f-external-release-setup`, then after actual release and successful publish, run `7g-registry-install-smoke` against the public npm registry artifact.
