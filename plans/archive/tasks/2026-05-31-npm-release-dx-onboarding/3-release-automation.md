---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_release_automation_v1
task_family_id: release-automation
sequence_key: "3"
task_id: 3-release-automation
title: "Release Automation and Guarded NPM Publish"
status: archived
phase: phase3
target_files:
  - "package.json"
  - "pnpm-lock.yaml"
  - ".github/workflows/release.yml"
  - ".github/workflows/npm-publish.yml"
  - "release-please-config.json"
  - ".release-please-manifest.json"
  - "CHANGELOG.md"
  - "docs/commit-and-release-history-authority.md"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 3-release-automation-doc
impl_bubble_id: 3-release-automation-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Release Automation and Guarded NPM Publish

## L0 - Policy

### Goal

Add conventional-commit release automation for Pairflow, including changelog and
version update flow, GitHub release/tag creation, and a guarded npm publish path
that remains dry-run or manually protected until the release pilot deliberately
opens public publish.

### Domain / Control Model Summary

1. Business invariant: release automation must make package releases repeatable
   without allowing accidental npm publication before first-release readiness is
   proven.
2. Control model: `package.json.version` remains the package version authority;
   conventional commits accepted by the `2a`/`2b`/`2c` policy are the release
   history input; GitHub Actions owns CI/release execution; npm owns package
   publication; the release pilot owns first public publish activation.
3. Read-path rule: release tooling reads commit history and package metadata,
   not task prose, branch names, bubble transcript text, or npm registry state.
4. Forbidden fallback: do not publish from local operator machines; do not make
   default lifecycle finalize messages semver authority; do not bypass
   commit-message validation to force a release; do not silently publish when
   `NPM_TOKEN`, npm org access, or GitHub environment approval is missing.
5. Allowed resolution path: release automation may create a release PR that
   updates `package.json`, lockfile metadata when needed, `CHANGELOG.md`, tags,
   and GitHub releases from conventional commits. npm publish may run only on a
   verified release event and must be dry-run/disabled unless the explicit
   first-release guard is open.
6. Missing-data rule: absent GitHub permissions, npm token, package ownership,
   or publish guard configuration must fail closed with operator-facing guidance
   while preserving local validation and package dry-run evidence.
7. Phase boundary:
   - contract closure: inherited from `2a`, `2b`, and `2c`
   - producer closure: out of scope except consuming existing commit policy
   - internal execution closure: release workflow commands and package scripts
   - workflow orchestration closure: GitHub Actions release/publish jobs
   - read-model closure: generated changelog and GitHub release notes
   - activation closure: guarded, deferred to `7-release-pilot`
   - cleanup/recovery closure: rerunnable failed workflow guidance only

### Plan Linkage

1. Parent plan gap closed: missing automated semver, changelog, release, and
   guarded npm publish path.
2. Depends on: `1-package-version`, `2a-commit-policy`, `2b-commit-policy`,
   and `2c-commit-policy`.
3. Unlocks / impacts successors: unlocks `4-docs-site-pages` release semantics
   docs and `7-release-pilot`; informs install/upgrade examples used by later
   onboarding tasks.
4. Task-list impact: refines the already-approved `3-release-automation`
   document contract so the later implementation bubble can proceed from an
   implementable release automation scope.
5. Inherited validation / exit expectation: implementation must run
   `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, focused release
   workflow/config validation or dry-run checks, `pnpm test`, and `pnpm build`,
   unless a later bubble result records a precise skipped-step reason.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `package.json`
   - `pnpm-lock.yaml`
   - `docs/commit-and-release-history-authority.md`
   - `docs/commit-message-guidance.md`
   - `tools/commit-policy/commitMessagePolicy.ts`
   - `tools/commit-policy/validateCommitRange.ts`
2. New release automation anchors to create:
   - Release Please config/manifest files (`release-please-config.json` and
     `.release-please-manifest.json`) when Release Please satisfies the
     history-selection contract, or equivalent chosen-tool configuration and
     baseline manifest when replanning selects another standard tool.
   - `.github/workflows/release.yml` or an equivalently named release PR/tag
     workflow.
   - `.github/workflows/npm-publish.yml`
   - `CHANGELOG.md`
3. Canonical elements: `@pairflow/cli`, `package.json.version`, standard
   `v<semver>` tags, generated changelog entries from accepted conventional
   commits, guarded npm publish workflow, and first-release publish guard.
4. Guard elements: GitHub Actions permissions, Node/pnpm setup, `NPM_TOKEN`,
   package dry-run inspection, commit range validation, manual environment or
   repository variable gate for real publish.
5. Compat-only elements: historical non-conventional lifecycle commits may
   remain historical noise, but they must not be newly generated or treated as
   release input beyond the policy already established by `2a`/`2b`/`2c`.
6. Forbidden reinterpretations: do not switch to first-parent-only release
   semantics, custom `@v.0.2.0` trigger messages, local publish steps as the
   release source, or a second version authority outside `package.json`.
7. Tool-selection constraint: using Release Please is preferred only if the
   implementation can prove it preserves the selected full-reachable-history
   release strategy or can be configured/wrapped to do so without duplicating
   commit taxonomy. If discovery shows the chosen tool only observes
   first-parent merge history for this repository shape, the implementation
   must stop and request replanning instead of weakening the history contract.

### Scope Reality / Shape Proof

1. Inspected baseline:
   - root `package.json` already has `name: @pairflow/cli`, `version: 0.1.0`,
     `bin.pairflow`, package `files`, and validation/build scripts.
   - no `.github/workflows/**`, `CHANGELOG.md`, or release automation config is
     present in the current baseline.
   - commit-message policy docs and validator scripts already exist from prior
     tasks.
2. Actual touched scope: release configuration plus CI workflow orchestration.
3. Mutation entrypoints in scope:
   - GitHub release PR workflow
   - GitHub/npm publish workflow
   - package metadata/lockfile updates needed by the chosen release tool
4. Hidden scope ruled out:
   - docs site, skill install command, UI lifecycle commands, first public
     publish execution, npm organization setup, package provenance beyond
     standard GitHub/npm metadata, and historical commit rewriting.
5. Why the declared task shape matches reality: release automation is a single
   orchestration boundary that consumes package metadata and commit policy
   authority but does not change CLI runtime behavior.
6. Document bubble source-code guard:
   - this document-refinement bubble may edit only task/spec/plan/progress/docs
     artifacts.
   - implementation of workflows, package metadata, release configs, tests, or
     source files belongs to the later implementation bubble.
   - L1 implementation sketches, L2 acceptance checks, target file lists, and
     workflow names in this task are planning context only while
     `review_artifact_type=document` is active; they do not authorize this
     document bubble to create release configs, workflows, generated changelog
     output, package scripts, or runtime/build artefacts.

### Refactor Classification

1. Classification: N/A.
2. Classification triggers: this task creates release automation/configuration
   surfaces rather than refactoring existing runtime architecture.
3. Preparatory modifier: no.
4. Test shape expectation: implementation tests should validate configuration
   shape and dry-run behavior rather than importing private runtime helpers.
5. Public helper surface action: no new runtime helper surface expected.

### Authority Fan-out Scan

| Bucket | Status | Evidence / Boundary |
|---|---|---|
| `authority_producer` | present, consumed | `package.json.version` and accepted conventional commits produce release truth. |
| `persisted_authority` | present | Release tool config/baseline manifest, `CHANGELOG.md`, and workflow files persist release configuration/output. |
| `internal_execution_consumers` | absent | Pairflow runtime code should not consume release workflow internals. |
| `workflow_orchestration_consumers` | present | GitHub Actions consumes release config, package scripts, and npm token/guard settings. |
| `validator_gate_consumers` | present | CI/release workflow must reuse the existing commit-policy range validation before release publication when feasible. |
| `external_integration_consumers` | present | GitHub releases and npm publish consume the automation output. |
| `read_model_consumers` | present | Changelog and GitHub release notes are generated read models. |
| `cleanup_recovery_consumers` | present | Failed publish/release reruns need clear fail-closed guidance and idempotent workflow behavior. |

### Canonical Contract Matrix

| Scenario | Trigger / Inputs | Required Guard | Side Effects Allowed | Success Output | Failure Output |
|---|---|---|---|---|---|
| Release PR generation | Push or dispatch on `main` with accepted conventional commits after the previous release baseline | Existing validation/build gates pass; release tooling reads full reachable accepted conventional commit history, not first-parent-only or lifecycle transcript prose | Open/update release PR with package version, changelog, and release metadata changes | Release PR with generated version/changelog changes and no npm publish | CI failure or no-op release result with clear reason |
| Tag and GitHub release creation | Release PR merge or release-tool controlled event | Release config matches package identity and generated files; GitHub permissions are present | Create standard `v<semver>` tag and GitHub release | GitHub release/tag matching `package.json.version` | Workflow failure before publish; no local publish fallback |
| npm publish with guard closed | Release/tag event while first-release guard is closed | Guard check proves real publish disabled; package build/pack succeeds when dry-run path is selected | `npm publish --dry-run` only, or intentional disabled stop | Observable dry-run result or explicit disabled-publish message | Fail closed if dry-run/build cannot prove package contents |
| npm publish with guard open | Release/tag event after `7-release-pilot` deliberately opens the guard | Protected environment/repository variable is open, `NPM_TOKEN` exists, package build/pack succeeds, release version matches package version | Real `npm publish --access public` from CI only | Published `@pairflow/cli@<version>` or npm-side success log | Fail closed with no local/operator publish fallback |
| Missing `NPM_TOKEN` | Publish workflow starts without token | Token presence check before real publish | None beyond validation/dry-run steps that do not require token | Not applicable | Clear fail-closed message naming missing `NPM_TOKEN` |
| Missing npm org/package permission | Publish dry-run or real publish reaches npm permission boundary | Package build/pack evidence is already collected | No workaround publication path | Not applicable | npm permission failure reported with operator setup guidance |
| Release config mismatch | Release workflow config does not match package identity, version source, or changelog surface | Config validation before release/tag/publish | None | Not applicable | CI failure before release PR/tag/publish |
| Changelog/version drift | Generated changelog/version differs from checked-in state | Release tool owns generated correction | Release PR update only | PR carries correction | CI/release-tool failure; no manual generated-output rewrite outside contract |
| Invalid or ambiguous commit range | Release workflow cannot identify accepted conventional commits under the existing policy | Repo-local validator is used when range validation is wired in; workflow YAML must not duplicate taxonomy regexes | None | Not applicable | Fail closed with validator/config reason |

History-selection proof: the implementation must record how the selected
release tool determines the commit range and traversal shape. The proof may be
a focused local config/dry-run inspection, a documented tool command/output, or
a small repository-history fixture if the tool supports one. It must explicitly
show that release-relevant conventional commits reachable through bubble branch
history are not hidden by first-parent-only interpretation.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger | Entrypoint | Configuration Owner | Repo-Provided Parts | External Prerequisites | Success Output Contract | Failure Output Contract | Operator / User Path | Last-Mile Proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Generate changelog, release PR, tags, and GitHub releases from accepted conventional commits | externally_activated | GitHub Actions event on `main` or release-tool controlled release PR merge | Release PR/tag workflow plus chosen release-tool config | Repo workflow/config files; GitHub repository settings externally activate execution | release config, baseline manifest, workflow, changelog baseline, validation commands | GitHub Actions enabled, repository permissions, accepted conventional commit history | Release PR or `v<semver>` tag/GitHub release matching `package.json.version` | CI/config failure or no-op release result with clear reason | Merge accepted conventional commits; let workflow open/land release PR | Release workflow dry-run/config validation locally plus GitHub run proof later |
| Guarded npm publish for `@pairflow/cli` | deferred_activation | GitHub release/tag event after first-release guard opens | `.github/workflows/npm-publish.yml` | Repo workflow defines guard; `7-release-pilot` owns opening the guard | publish workflow, package build/pack steps, dry-run/disabled guard path | `NPM_TOKEN`, npm org/package permission, protected environment or repository variable, GitHub release event | Dry-run/disabled proof before pilot; real npm publish success only after guard opens | Missing token/permission/guard failure with no local publish fallback | Operator configures secrets/environment, then release pilot opens guard deliberately | Package pack/dry-run proof now; public publish proof in `7-release-pilot` |

### Ownership and Deferred Semantics

1. The canonical matrix above is the source for release workflow behavior,
   publish guard behavior, failure behavior, L2 acceptance, and validation
   evidence. Mirrored sections must stay subordinate to it.
2. Repo-provided closure ends at workflow/config/changelog/package evidence.
   GitHub repository settings, Actions permissions, npm org/package access,
   `NPM_TOKEN`, and protected environment or repository variable setup are
   external/operator-owned.
3. Real npm publish remains deferred until `7-release-pilot`; this task may
   prove dry-run or intentional-disabled publish behavior, but it must not claim
   first public publish readiness.
4. Release selection must preserve the closed history contract from prior tasks:
   full reachable accepted conventional commits are release input; historical
   lifecycle noise is not newly accepted; first-parent-only semantics and custom
   `@v.0.2.0` trigger messages remain forbidden.

### Mirrored Surface Checklist

1. L0 policy mirrors the matrix by preserving package version authority,
   accepted conventional commit input, guarded publish, and fail-closed missing
   external prerequisites.
2. L1 release workflow contract mirrors the matrix by limiting ordinary `main`
   pushes to validation and release PR/tag/release generation, not npm publish.
3. L1 publish guard contract mirrors the matrix by requiring a checked guard,
   token presence, CI-only publish, and dry-run or disabled proof while closed.
4. L1 failure behavior mirrors the matrix by surfacing missing token,
   permissions, config mismatch, changelog/version drift, and commit-range
   ambiguity as stop conditions.
5. L2 acceptance mirrors the matrix by requiring concrete workflow/config
   validation, package build/pack inspection, dry-run or disabled guard proof,
   and no local publish fallback.

### Complexity Risk Gate

| Field | Assessment |
|---|---|
| `risk_score` | medium |
| `authority_risk` | medium: release truth combines commits, package version, and external workflow state. |
| `authority_fanout` | present: release truth feeds GitHub Actions, changelog/release notes, npm publish, and successor docs/pilot tasks through explicit workflow/config surfaces. |
| `surface_spread` | medium: package metadata, workflow YAML, changelog, and docs authority are touched. |
| `identity_join_risk` | low: package identity is already fixed as `@pairflow/cli`. |
| `activation_coupling` | high: real npm publication depends on external GitHub/npm credentials and explicit pilot approval. |
| `prerequisite_risk` | medium: relies on the completed commit-policy split tasks and npm org/package access. |
| `acceptance_multiplicity` | medium: release PR, changelog/tag, and guarded publish dry-run/disabled proof are distinct acceptance surfaces under one release automation closure. |
| `split_decision` | no split required for this task; split downstream activation and docs remain in planned successor tasks. |
| `single_task_allowed` | yes |
| `implementation_closure_proof` | implementation can close by adding config/workflows/changelog plus local validation/dry-run evidence without proving public npm publish. |

Split/no-split decision: keep as one task because the workflow config, changelog
config, and publish guard form one release automation closure. Public docs,
first publish execution, and broader onboarding stay in successor tasks.

### Closure-Budget Gate

| Bucket | Presence | Status | Evidence / Decision |
|---|---|---|
| `contract_closure` | present | closed_by_predecessors | Commit/release-history authority and validator taxonomy come from `2a`, `2b`, and `2c`; this task consumes them. |
| `producer_closure` | absent | out_of_scope | Pairflow commit producers were handled by `2c`; this task must not change lifecycle message producers. |
| `internal_execution_closure` | present | in_scope | Release config, changelog baseline, package metadata touchups, and package build/pack checks are implementation-owned here. |
| `workflow_orchestration_closure` | present | in_scope | GitHub release PR and guarded publish workflows are the main closure. |
| `read_model_closure` | present | in_scope | `CHANGELOG.md` and GitHub release notes are generated read models owned by the release workflow. |
| `activation_closure` | present | deferred | Real npm publication is deliberately deferred to `7-release-pilot`; this task proves guard-closed behavior. |
| `cleanup_recovery_closure` | present | limited | Failed workflow rerun and fail-closed operator messages are in scope; rollback/recovery tooling is not. |
| `absent_or_unknown_evidence` | absent | none_unresolved | Baseline absence of workflows/changelog is inspected; external npm/GitHub credentials are known external prerequisites, not unknown repo facts. |
| `collapsed_closures` | present | release_config_and_guarded_publish | Kept together because publish guard correctness depends on the same release event, package version, and package artifact boundary. |
| `deferred_closures` | present | public_publish_activation, docs_site, skill_install, ui_lifecycle, release_pilot | These remain planned successor tasks and must not be pulled into this implementation. |
| `split_required` | present | no | No unresolved bucket requires a separate task before implementation can start. |

Final split/no-split decision: one implementation task is valid because all
in-scope closures share the release automation control point, and deferred
activation has an explicit guard plus successor owner.

### Bounded-Task-Shape Gate

| Field | Decision |
|---|---|
| `primary_shape` | release workflow/configuration orchestration |
| `secondary_shape` | generated changelog/read-model baseline and guarded publish dry-run/disabled proof |
| `decomposed_closures` | release PR generation, changelog/version manifest configuration, tag/GitHub release creation, guarded npm publish workflow, package build/pack validation |
| `adjacent_consumer_family_scan` | docs site consumes release semantics later; release pilot consumes guard and publish proof later; skill install/UI lifecycle do not consume this task's internals. No unresolved adjacent consumer family is required now. |
| `why_shape_mix_is_safe` | the secondary surfaces are subordinate outputs of the same release automation boundary and are governed by the Canonical Contract Matrix. |
| `split_trigger_disposition` | external activation and public publish are split to `7-release-pilot`; public docs are split to `4-docs-site-pages`; no in-scope trigger remains unresolved. |

Bounded shape result: implementation should stop at repo-provided automation,
guarded publish proof, and local validation evidence. It must not perform first
public publish or docs-site work.

## L1 - Implementation Plan

### Intended Changes

1. Add release automation configuration using a standard conventional-commit
   release tool, preferably Release Please for npm packages unless implementation
   discovery finds a repo-specific blocker. The blocker threshold is not whether
   another tool is easier; it is whether the tool can satisfy the canonical
   history-selection, package-version, changelog, tag/release, and guarded
   publish contracts without adding a competing release authority.
2. Add or update `CHANGELOG.md` with an initial `0.1.0` baseline entry and make
   future entries generated by release automation.
3. Add a GitHub workflow that validates the repo and opens/updates a release PR
   from accepted conventional commits.
4. Add a separate guarded npm publish workflow that runs from an explicit GitHub
   release/tag event and stays disabled, dry-run, or manual-environment
   protected until `7-release-pilot` opens the guard.
5. Add package scripts only if needed for local release dry-run/config
   validation, keeping `package.json.version` the single version authority.
6. Update `docs/commit-and-release-history-authority.md` only to document the
   concrete automation boundary, guard conditions, and failure behavior if the
   existing doc lacks those operational details.
7. Do not implement a custom release engine when configuration of a standard
   tool is sufficient. If custom glue is required, keep it limited to validation
   or guard checks and make it call existing repo policy entrypoints rather than
   re-encoding commit taxonomy.

### Release Workflow Contract

1. The release PR workflow must run the existing local quality gates before
   treating a release as candidate-ready:
   - `pnpm install --frozen-lockfile`
   - `pnpm --dir ui install --frozen-lockfile`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - `pnpm test`
   - `pnpm build`
2. The workflow must not publish to npm directly from ordinary `main` pushes.
3. The workflow must create standard semver tags/releases such as `v0.2.0`.
4. The workflow must ignore or reject non-release historical noise according to
   the already-approved commit-message policy rather than redefining taxonomy in
   workflow YAML.
5. If commit range validation is wired into release/publish automation, it must
   call the repo-local validator instead of duplicating regexes.
6. The workflow/config evidence must name the selected last-release baseline
   source for the first automated release. The expected initial baseline is
   package version `0.1.0` and standard tag shape `v0.1.0`/`v<semver>`; if no
   historical tag exists yet, implementation must either configure the manifest
   baseline explicitly or fail closed with first-release setup guidance.
7. Release PR generation must not depend on branch names, Pairflow transcript
   text, task IDs, default lifecycle finalize messages, or manual changelog
   edits as release input.

### Publish Guard Contract

1. npm publish must require `NPM_TOKEN`.
2. Real publish must require an explicit guard such as a protected GitHub
   environment and/or repository variable checked by the workflow.
3. Before the guard is open, the workflow must positively prove real publish
   cannot execute, then either:
   - run `npm publish --dry-run`, or
   - stop with a clear message that public publish is intentionally disabled.
4. The guard opening itself is not part of this task; `7-release-pilot` owns
   proving readiness and deliberately opening it.
5. Publish commands must use the built package contents and must not rely on
   local operator state.
6. Missing `NPM_TOKEN` must fail before real publish. A closed guard may still
   run package build/pack and disabled-path proof without requiring npm
   credentials.
7. The guard check must run before any command capable of real publication.
   Token checks may be skipped only on the explicitly disabled/dry-run path;
   once the guard is open or a real-publish branch is selected, missing
   `NPM_TOKEN` is a hard failure.
8. Guard state must be readable from GitHub-controlled configuration, such as a
   protected environment approval and/or repository variable. It must not be
   inferred from local files, package version, branch names, actor identity, or
   npm registry state.

### Failure Behavior

1. Missing `NPM_TOKEN`: fail closed with a clear operator message; do not
   attempt anonymous or local publish fallback.
2. Missing package/org permission: fail closed after package dry-run evidence.
3. Release config mismatch: fail CI before release PR/tag/publish.
4. Changelog/version drift: fail or let the release PR carry the generated
   correction; do not silently hand-edit generated output outside the release
   tool contract.
5. Tool/history mismatch: fail closed and request replanning if the selected
   release tool cannot satisfy the full-reachable-history contract for Pairflow
   bubble branch commits.
6. Missing first-release baseline/tag/setup: fail closed with first-release setup
   guidance; do not invent a version from commit text or npm registry state.

## L2 - Acceptance Checks

1. The chosen release-tool config and baseline manifest exist and target the root
   npm package `@pairflow/cli` starting from `0.1.0`. If Release Please is the
   selected tool, those files are `release-please-config.json` and
   `.release-please-manifest.json`; if another standard tool is selected through
   the documented blocker/replanning path, the implementation must name the
   equivalent config and baseline files in its evidence.
2. `CHANGELOG.md` exists with an initial baseline and is configured as the
   generated changelog surface.
3. The release PR workflow is present under `.github/workflows/**`, has minimal
   required permissions, installs with pnpm, runs the repo validation/build
   gates, and invokes the chosen release automation tool.
4. The npm publish workflow is present under `.github/workflows/**`, triggers
   only from release/tag-controlled events, builds the package, checks the
   explicit publish guard, and defaults to dry-run/disabled before the release
   pilot opens the guard.
5. Guard-closed proof is positive and observable: the workflow checks the guard
   condition before real publish, either runs `npm publish --dry-run` or emits a
   deliberate disabled-publish message, fails closed when `NPM_TOKEN` is missing
   on a real-publish path, and provides no local/operator publish fallback.
6. No source/runtime CLI behavior changes are introduced by this task except
   package scripts or config necessary for release automation.
7. The existing commit-message validator remains the policy authority; workflow
   YAML does not duplicate the taxonomy regex or accept new lifecycle finalize
   messages.
8. Local validation evidence includes:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - focused release workflow/config syntax or config validation
   - release automation dry-run or config inspection when supported by the
     chosen tool
   - package build/pack inspection
   - `npm publish --dry-run` or explicit disabled-guard proof
   - `pnpm test`
   - `pnpm build`
9. The implementation bubble records any skipped external publish proof as a
   deliberate guard, not as a validation failure.
10. The implementation bubble records history-selection evidence for the chosen
    release tool/config, including the first-release baseline and why
    first-parent-only semantic interpretation is not being introduced.
11. The publish workflow has two visibly separate paths: guard-closed
    dry-run/disabled proof and guard-open real publish. Reviewers can determine
    from workflow structure that real publish is unreachable while the guard is
    closed.
12. If implementation updates
    `docs/commit-and-release-history-authority.md`, the update is limited to
    concrete automation behavior that actually landed in the same implementation
    bubble; it must not pre-document unimplemented external activation or public
    publish readiness.
