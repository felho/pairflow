---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_registry_install_smoke_v1
task_family_id: registry-install-smoke
sequence_key: "7g"
task_id: 7g-registry-install-smoke
title: "Registry Install Smoke"
status: done
phase: phase7
target_files:
  - "plans/tasks/2026-05-31-npm-release-dx-onboarding/7g-registry-install-smoke.md"
  - "plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md"
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

# Task: Registry Install Smoke

## L0 - Policy

### Goal

Prove that the publicly published npm registry artifact for `@pairflow/cli`
installs and runs as the user-facing Pairflow CLI, without relying on the local
source checkout, a retained tarball, or unpublished GitHub/npm state.

### Domain / Control Model Summary

1. Business invariant: Pairflow public install readiness is complete only after
   the exact published npm registry package can be installed in isolation and
   the installed `pairflow` command reports the expected published version.
2. Control model: npm owns public registry package availability and dist-tags;
   GitHub Actions owns the release/publish workflow result; `package.json`
   owns the expected local version at the release commit; the isolated install
   prefix owns the smoke-test runtime. The repo owns only the task evidence and
   plan status record.
3. Read-path rule: version proof must come from the installed registry package
   by running the installed `pairflow --version` and `pairflow -v` binaries.
   Registry metadata proof must come from authenticated or public npm registry
   reads such as `npm view @pairflow/cli version` and
   `npm view @pairflow/cli@<version> version`.
4. Forbidden fallback: do not treat local tarball proof, source-checkout
   commands, workflow YAML, package metadata alone, a GitHub release page alone,
   or a stale npm cache hit as public install proof. Do not run `npm publish`,
   create a GitHub release, create a release tag, dispatch a publish workflow,
   mutate GitHub secrets/variables/environments, or fix source/workflow
   defects in this task.
5. Allowed resolution path: after actual release and successful npm publish
   have completed, install `@pairflow/cli@latest` and the exact published
   version into an isolated temp prefix with an isolated HOME/cache; run
   version and minimal command smoke checks; record exact npm registry outputs,
   installed CLI outputs, temp locations, and cleanup status.
6. Missing-data rule: if actual publish completion, npm registry lookup,
   version matching, isolated install, installed CLI execution, or cleanup proof
   is missing, unknown, or failed, the task remains blocked/incomplete and must
   name the blocker. Do not mark the parent plan complete while this task is
   blocked.
7. Phase boundary: this task owns post-publish registry install proof only. It
   does not own release execution, publish approval, publish workflow repair,
   package/runtime fixes, docs deploy fixes, or new distribution channels.

### Plan Linkage

1. Parent plan gap closed: missing last-mile public npm registry install proof
   for the user-facing install claim.
2. Depends on:
   - `7f-external-release-setup` completing external setup verification.
   - The operator completing actual release/publish execution outside this
     task.
   - The guarded `npm-publish` workflow completing a successful real publish.
3. Unlocks / impacts successors:
   - If the registry smoke passes, the plan may record public npm install
     readiness for the published version.
   - If the smoke fails due to repo-owned packaging/runtime/workflow defects,
     route to a follow-up implementation task before plan completion.
4. Task-list impact: this is the final phase-7 proof task. It must not run
   before an actual public npm publish has completed.
5. Exit expectation: record the exact published version, `latest` dist-tag
   version, installed CLI version outputs, minimal installed command smoke
   results, cleanup evidence, final decision, and any follow-up blockers.

### Canonical Contract Anchors

1. Completed setup and readiness evidence:
   - `plans/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md`
   - `plans/tasks/2026-05-31-npm-release-dx-onboarding/7f-external-release-setup.md`
2. Release/publish workflow surfaces:
   - `.github/workflows/release.yml`
   - `.github/workflows/npm-publish.yml`
   - `release-please-config.json`
   - `.release-please-manifest.json`
   - `CHANGELOG.md`
   - `package.json`
3. Public registry/install surfaces:
   - npm registry package `@pairflow/cli`
   - npm dist-tag `latest`
   - installed package binary `pairflow`
   - installed package metadata visible through `pairflow --version` and
     `pairflow -v`

### Scope Reality / Shape Proof

1. `7a` proved local package build, pack, package contents, and isolated
   tarball install.
2. `7c` proved installed-package skill install behavior from a packed package.
3. `7d` proved installed-package UI lifecycle behavior from a packed package.
4. `7e` recorded the first release as NO-GO while external setup was missing.
5. `7f` verified external setup but intentionally left
   `PAIRFLOW_NPM_PUBLISH_ENABLED=false` until the operator opens the guard for
   actual release/publish.
6. This task starts only after actual release/publish has happened. It repeats
   only the minimum public-registry install proof needed to close the install
   claim, not the full local package, skill, UI, docs, or release-validation
   proof suite.

### Risk Classification

```yaml
risk_score: 5
factors:
  public_registry_dependency: 2
  install_claim_finality: 2
  local_side_effects: 1
  source_mutation: 0
split_required: no
split_reason: >
  The task is a single post-publish proof boundary: registry metadata lookup,
  isolated install, installed CLI smoke, and cleanup evidence all determine the
  same public install readiness claim. Any source/workflow fix, failed publish
  recovery, or alternate distribution channel must split to follow-up work.
```

### Bounded Task Shape

1. Primary shape: `post_publish_registry_smoke`, limited to read-only npm
   registry lookup plus isolated local install proof.
2. Secondary shape: none. If a repo-owned defect is found, stop and route to a
   follow-up implementation task.
3. No-split rationale: the proof elements are one last-mile capability closure
   for `npm install -g @pairflow/cli@latest`.
4. Split trigger: any need to edit source, workflow YAML, release config,
   package metadata, docs, GitHub settings, npm settings, or to perform/retry
   publish execution.

### Capability Closure

| Capability Claim | Closure Classification | Activation Path | External Authority | Current Task Proof | Pass Condition | Failure/Blocked Condition |
|---|---|---|---|---|---|---|
| `@pairflow/cli@latest` installs from npm | externally_activated | `npm install --prefix <tmp> @pairflow/cli@latest` | npm registry and dist-tags | isolated install transcript | install exits 0 and installed `pairflow` exists | install fails, resolves wrong package, or uses local tarball/source |
| Exact published version installs from npm | externally_activated | `npm install --prefix <tmp> @pairflow/cli@<version>` | npm registry package version | exact-version install transcript | exact version install exits 0 | exact version missing or install fails |
| Installed CLI reports published version | end_to_end | installed `pairflow --version` and `pairflow -v` | installed package metadata/runtime | command outputs | both outputs equal expected published version | mismatch, non-zero exit, or source-checkout binary used |
| Public install claim can close | externally_activated | passed registry lookup and isolated install smoke | npm registry plus repo evidence record | final evidence block | `registry_install_smoke_passed` | any missing/unknown/failed prerequisite |

## L1 - Branch Inventory

### Allowed Edits

1. `plans/tasks/2026-05-31-npm-release-dx-onboarding/7g-registry-install-smoke.md`
2. `plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md`

### Forbidden Edits / Actions

1. Editing `package.json`, release config, workflow YAML, docs source, source
   code, generated docs, or generated package artifacts.
2. Running `npm publish`, creating a GitHub release, creating a release tag,
   dispatching a real publish workflow, or approving a GitHub deployment.
3. Creating/editing GitHub secrets, variables, environments, Pages settings,
   npm tokens, npm org settings, npm package settings, or npm dist-tags.
4. Installing from a local tarball, source checkout, Git URL, or filesystem
   path as a substitute for registry install proof.
5. Using the real global npm prefix for the smoke install.
6. Claiming public install readiness while the publish workflow is failed,
   missing, unknown, or only dry-run/guard-closed.

### Evidence Contract

```yaml
registry_install_smoke:
  evidence_status: "pending|completed"
  executed_at: "<ISO-8601 timestamp>"
  prerequisites:
    external_setup_task: "7f-external-release-setup"
    external_setup_status: "external_setup_verified|missing|unknown"
    actual_release_published: "present|missing|unknown"
    release_tag: "<vSEMVER|null>"
    release_version: "<semver|null>"
    release_url: "<url|null>"
    publish_workflow_run_id: "<id|null>"
    publish_workflow_conclusion: "success|failure|cancelled|timed_out|missing|unknown"
    npm_publish_workflow: "succeeded|failed|missing|unknown"
    publish_guard_state_at_publish: "guard_open_authorized|guard_closed_blocker|unknown"
    release_publish_version_binding: "matched|mismatched|unknown"
  registry:
    package_name: "@pairflow/cli"
    expected_version: "<semver|null>"
    latest_version: "<semver|null>"
    exact_version_available: "present|missing|unknown"
    latest_matches_expected: "true|false|unknown"
  isolated_install:
    tmp_root: "<path|null>"
    latest_prefix: "<path|null>"
    exact_prefix: "<path|null>"
    home: "<path|null>"
    npm_cache: "<path|null>"
    install_latest: "passed|failed|not_run"
    install_exact_version: "passed|failed|not_run"
    installed_binary: "present|missing|unknown"
  cli_smoke:
    version_long: "<output|null>"
    version_short: "<output|null>"
    version_outputs_match_expected: "true|false|unknown"
  cleanup:
    temp_artifacts_removed: "passed|failed|not_run"
  decision:
    registry_install_smoke: "registry_install_smoke_passed|registry_install_smoke_blocked"
    public_install_claim: "ready|not_ready"
    next_task: "plan_completion_admin|required_follow_up"
  blockers: []
  notes: []
```

### Acceptance Criteria

1. Task artifact exists at
   `plans/tasks/2026-05-31-npm-release-dx-onboarding/7g-registry-install-smoke.md`
   with metadata matching the parent plan tracker and `task_id`.
2. Parent plan tracker points `7g-registry-install-smoke` at the live task path
   and orders it after `7f-external-release-setup`.
3. The task cannot execute successfully unless actual release and successful
   npm publish workflow completion are recorded first, including release tag,
   release URL, publish workflow run id/conclusion, and tag/version binding.
4. Registry metadata confirms `@pairflow/cli@latest` and the exact published
   version expected by the release.
5. Isolated install uses registry package specifiers only, with isolated
   prefix, HOME, and npm cache.
6. Installed `pairflow --version` and `pairflow -v` both match the expected
   published semver.
7. Temporary proof artifacts are removed or explicitly recorded as retained
   with a cleanup blocker.
8. Any failed/missing/unknown registry, install, CLI, workflow, or cleanup proof
   leaves `public_install_claim: not_ready`.

### ReviewSpec Gate Coverage

| Gate | Required Review Question |
|---|---|
| Metadata | Does frontmatter match `7g-registry-install-smoke`, parent tracker, task order, archive group, and review status? |
| Scope | Is the task post-publish proof-only with no publish execution, source/workflow edits, or GitHub/npm mutation? |
| Contract | Are prerequisite, registry, isolated-install, CLI-smoke, cleanup, decision, and blocker states concrete enough to execute? |
| Capability | Does the task close only public npm registry install readiness and avoid overclaiming release execution, docs, skills, or UI proof? |
| Split policy | Is this safely one post-publish smoke task, with source fixes/publish recovery routed out? |

## L2 - Execution Plan

### Operator Proof Checklist

1. Confirm clean checkout:
   ```bash
   git status --short
   ```
2. Confirm actual release/publish prerequisites have happened:
   ```bash
   gh release list --repo felho/pairflow --limit 5
   gh run list --repo felho/pairflow --workflow npm-publish.yml --limit 5
   gh variable list --repo felho/pairflow
   ```
   Record missing, failed, or guard-closed publish evidence as a blocker. Do
   not dispatch or approve workflows from this task. The selected release and
   selected publish workflow run must correspond to the same semver version:
   record the release tag, release URL, publish workflow run id, run conclusion,
   and whether the tag `v<expected_version>` matches the package version.
3. Record expected version from the release context:
   ```bash
   node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version"
   ```
   If the release workflow updated the version, use the checked-out release
   commit or tag corresponding to the published package. Do not infer a version
   from a stale local checkout.
4. Verify registry metadata:
   ```bash
   npm view @pairflow/cli version
   npm view @pairflow/cli@<expected_version> version
   npm view @pairflow/cli dist-tags --json
   ```
5. Create isolated proof paths:
   ```bash
   tmp_root="$(mktemp -d)"
   latest_prefix="$tmp_root/prefix-latest"
   exact_prefix="$tmp_root/prefix-exact"
   isolated_home="$tmp_root/home"
   isolated_npm_cache="$tmp_root/npm-cache"
   mkdir -p \
     "$latest_prefix" \
     "$exact_prefix" \
     "$isolated_home" \
     "$isolated_npm_cache"
   ```
6. Install from the public registry only:
   ```bash
   HOME="$isolated_home" npm_config_cache="$isolated_npm_cache" \
     npm install --prefix "$latest_prefix" @pairflow/cli@latest

   HOME="$isolated_home" npm_config_cache="$isolated_npm_cache" \
     npm install --prefix "$exact_prefix" @pairflow/cli@<expected_version>
   ```
7. Run installed CLI version smoke:
   ```bash
   "$latest_prefix/node_modules/.bin/pairflow" --version
   "$latest_prefix/node_modules/.bin/pairflow" -v
   "$exact_prefix/node_modules/.bin/pairflow" --version
   "$exact_prefix/node_modules/.bin/pairflow" -v
   ```
8. Verify the installed binary came from the isolated prefix:
   ```bash
   LATEST_PREFIX="$latest_prefix" EXACT_PREFIX="$exact_prefix" node - <<'NODE'
   const fs = require("fs");
   const path = require("path");
   const latestPrefix = process.env.LATEST_PREFIX;
   const exactPrefix = process.env.EXACT_PREFIX;
   for (const candidate of [latestPrefix, exactPrefix]) {
     if (!candidate) {
       throw new Error("missing install-prefix environment variable");
     }
     const bin = path.join(candidate, "node_modules", ".bin", "pairflow");
     if (!fs.existsSync(bin)) {
       throw new Error(`missing installed pairflow binary at ${bin}`);
     }
     console.log(bin);
   }
   NODE
   ```
9. Clean up temporary proof paths:
   ```bash
   rm -rf "$tmp_root"
   ```
10. Record the evidence block in this task and update the parent plan. If
    anything fails, record blockers and stop without source/workflow fixes.

### Evidence To Record

Use this section after execution.

```yaml
registry_install_smoke:
  evidence_status: completed
  executed_at: "2026-06-08T23:02:17+02:00"
  prerequisites:
    external_setup_task: "7f-external-release-setup"
    external_setup_status: external_setup_verified
    actual_release_published: present
    release_tag: "v0.2.0"
    release_version: "0.2.0"
    release_url: "https://github.com/felho/pairflow/releases/tag/v0.2.0"
    publish_workflow_run_id: "27165905076"
    publish_workflow_conclusion: success
    npm_publish_workflow: succeeded
    publish_guard_state_at_publish: guard_open_authorized
    release_publish_version_binding: matched
  registry:
    package_name: "@pairflow/cli"
    expected_version: "0.2.0"
    latest_version: "0.2.0"
    exact_version_available: present
    latest_matches_expected: true
  isolated_install:
    tmp_root: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.E0mFq1oRMC"
    latest_prefix: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.E0mFq1oRMC/prefix-latest"
    exact_prefix: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.E0mFq1oRMC/prefix-exact"
    home: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.E0mFq1oRMC/home"
    npm_cache: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.E0mFq1oRMC/npm-cache"
    install_latest: passed
    install_exact_version: passed
    installed_binary: present
  cli_smoke:
    version_long: "0.2.0"
    version_short: "0.2.0"
    version_outputs_match_expected: true
  cleanup:
    temp_artifacts_removed: passed
  decision:
    registry_install_smoke: registry_install_smoke_passed
    public_install_claim: ready
    next_task: plan_completion_admin
  blockers: []
  notes:
    - "gh release list observed v0.2.0 as the latest release, published on 2026-06-08T20:46:10Z."
    - "Guarded npm publish run 27165905076 completed successfully: https://github.com/felho/pairflow/actions/runs/27165905076."
    - "Publish package log reported '+ @pairflow/cli@0.2.0'."
    - "npm registry metadata initially propagated after the publish workflow completed; final npm view checks returned @pairflow/cli latest=0.2.0 and @pairflow/cli@0.2.0 version=0.2.0."
    - "npm view @pairflow/cli dist-tags --json returned { latest: '0.2.0' }."
    - "Installed @pairflow/cli@latest into the isolated latest prefix and @pairflow/cli@0.2.0 into the isolated exact prefix using isolated HOME and npm cache."
    - "Latest install pairflow --version and pairflow -v both returned 0.2.0."
    - "Exact install pairflow --version and pairflow -v both returned 0.2.0."
    - "Installed binary audit found pairflow under both isolated prefixes before cleanup."
    - "Temporary proof root was removed after the smoke run."
```
