---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_release_go_no_go_v1
task_family_id: release-go-no-go
sequence_key: "7e"
task_id: 7e-release-go-no-go
title: "Release GO/NO-GO"
status: archived
phase: phase7
target_files:
  - "plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md"
  - "plans/archive/plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md"
prd_ref: null
plan_ref: plans/archive/plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Release GO/NO-GO

## L0 - Policy

### Goal

Aggregate the completed release-pilot evidence from `7a` through `7d`, verify
current release/publish/docs guard state, and record an explicit first-release
`release_go` or `release_no_go` decision before any public publish activation is
treated as allowed.

### Domain / Control Model Summary

1. Business invariant: Pairflow must not claim public release readiness or open
   the npm publish guard until local package, docs, skills, UI lifecycle, npm
   account, GitHub release-token, publish-token, publish environment, publish
   variable, and Pages/public-docs prerequisites are explicitly proven or
   deliberately classified as blocking.
2. Control model: repo-local files own package/release workflow configuration
   and archived proof evidence; GitHub owns Actions secrets, repository
   variables, environments, Pages settings, and workflow execution; npm owns
   org/package access and public registry publication; the operator owns the
   final GO/NO-GO decision record.
3. Read-path rule: consume archived task evidence from `7a`, `7b`, `7c`, and
   `7d`; rerun local release/docs validation; inspect workflow guards; record
   external prerequisite statuses from GitHub/npm screens or CLI commands.
   Treat missing/unknown external values as NO-GO and route them to
   `7f-external-release-setup`; this task records already-present
   prerequisites only as diagnostic evidence and does not resolve missing
   setup.
4. Forbidden fallback: do not infer readiness from local tarball proof alone,
   from workflow YAML existing, from a token name appearing in YAML, from a
   successful unauthenticated npm registry lookup, from public docs source, or
   from user memory without fresh evidence. Do not trigger a GitHub release,
   run real `npm publish`, create a release tag, or claim the post-publish
   registry install smoke has passed.
5. Allowed resolution path: if every prerequisite is already verified present,
   this task may record a GO diagnostic handoff to
   `actual_release_publish_required` without running the release, publishing,
   resolving external setup, or opening the publish guard. If any required
   prerequisite is missing or unknown, record NO-GO, keep publish guard closed,
   and route setup to `7f-external-release-setup`.
6. Missing-data rule: any missing or unknown external prerequisite, failed local
   validation, stale/missing archived proof decision, or ambiguous guard state
   forces `release_no_go`. The task must name the blocker and route to
   `7f-external-release-setup` or a follow-up before
   `7g-registry-install-smoke`.
7. Phase boundary: this task owns readiness aggregation and guard decision
   evidence only. It must not edit CLI/runtime/docs source, workflow YAML,
   package metadata, release config, GitHub settings, npm account settings, or
   publish to npm.

### Plan Linkage

1. Parent plan gap closed: missing first-release publish activation decision
   after local package/docs/skills/UI proof.
2. Depends on: `7a-package-release-proof`, `7b-docs-readiness-proof`,
   `7c-skill-install-proof`, and `7d-ui-lifecycle-proof`.
3. Unlocks / impacts successors:
   - If decision is `release_go`, the operator may trigger/allow the guarded
     release/publish flow through `actual_release_publish_required`.
   - If decision is `release_no_go`, `7f-external-release-setup` owns resolving
     and verifying the missing external prerequisites; after `7f` verifies
     setup, the next handoff is actual release/publish execution, then
     `7g-registry-install-smoke`.
4. Task-list impact: after this task is proven and archived, the parent plan
   can proceed only according to the recorded decision.
5. Exit expectation: record evidence decisions consumed from `7a` through `7d`,
   current local validation outputs, external GitHub/npm prerequisite statuses,
   final `release_go` or `release_no_go`, guard state, and the next handoff to
   either `7f-external-release-setup` or `actual_release_publish_required`.
   `7g-registry-install-smoke` is eligible only after actual publish succeeds.

### Canonical Contract Anchors

1. Completed proof evidence:
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7a-package-release-proof.md`
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7b-docs-readiness-proof.md`
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7c-skill-install-proof.md`
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7d-ui-lifecycle-proof.md`
2. Release/publish/docs workflow surfaces:
   - `.github/workflows/release.yml`
   - `.github/workflows/npm-publish.yml`
   - `.github/workflows/docs-pages.yml`
   - `release-please-config.json`
   - `.release-please-manifest.json`
   - `tools/release/validateReleaseAutomation.ts`
   - `package.json`
   - `CHANGELOG.md`
3. External setup surfaces:
   - GitHub Actions secrets: `RELEASE_PLEASE_TOKEN`, `NPM_TOKEN`
   - GitHub Actions variable: `PAIRFLOW_NPM_PUBLISH_ENABLED`
   - GitHub environment: `npm-publish`
   - GitHub Pages settings, `github-pages` environment, public Pages URL
   - npm login/org/package access for `@pairflow/cli`

### Scope Reality / Shape Proof

1. `7a` completed local package/release proof and recorded publish readiness as
   NO-GO because GitHub Actions secrets/variables and the `npm-publish`
   environment were missing, and npm org/package access was unauthenticated.
2. `7b` completed local docs readiness proof and recorded public docs
   availability as NO-GO because GitHub Pages was disabled, the `github-pages`
   environment was missing, and no public Pages URL existed.
3. `7c` completed installed-package skill install proof.
4. `7d` completed source and installed-package UI lifecycle proof.
5. This task aggregates those already completed proof families. It does not
   repeat tarball install, docs content, skill install, or UI lifecycle proof
   unless a freshness check fails.
6. The expected current outcome is `release_no_go` unless the operator has
   created and freshly verified the missing GitHub/npm external prerequisites.
7. Any real publish, release trigger, or public registry install check belongs
   after a GO decision and is outside this task.

### Risk Classification

```yaml
risk_score: 6
factors:
  external_activation: 2
  publish_safety: 2
  evidence_aggregation: 1
  docs_pages_activation: 1
  source_mutation: 0
split_required: no
split_reason: >
  The task is evidence aggregation and decision recording only. It does not
  mutate publish workflows, source code, GitHub/npm settings, or trigger a
  release. If external setup must be performed, that setup remains operator
  work and the task records missing/present status rather than implementing it.
```

### Closure-Budget Table

| Closure Bucket | Present? | Budget | Notes |
|---|---:|---|---|
| package proof consumer | yes | evidence-only | Consumes `7a` decision and current `release:validate`. |
| docs proof consumer | yes | evidence-only | Consumes `7b` decision and current `docs:validate`. |
| skills proof consumer | yes | evidence-only | Consumes `7c` decision. |
| UI proof consumer | yes | evidence-only | Consumes `7d` decision. |
| workflow guard consumer | yes | read-only | Inspects release/npm-publish/docs workflow guard shape. |
| external prerequisite consumer | yes | read-only | Records GitHub/npm status from operator evidence. |
| authority producer | absent | N/A | No source, workflow, GitHub, npm, or package authority is changed. |
| public publish producer | absent | N/A | No release or npm publish is triggered. |

### Bounded Task Shape

1. Primary shape: `activation_or_read_model`, limited to release readiness
   aggregation and guard decision evidence.
2. Secondary shape: none. Any GitHub/npm setup, workflow change, docs change,
   or source/runtime fix must be routed to an external operator action or a
   follow-up task.
3. No-split rationale: the decision matrix must see all prerequisite families
   together; splitting the aggregator would make GO/NO-GO less reliable.
4. Split trigger: if this task needs to edit workflow YAML, package metadata,
   docs source, source code, or GitHub/npm settings, stop and split.

### Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo Boundary | External Prerequisites | Current Task Proof | Pass Condition | Failure/NO-GO Condition |
|---|---|---|---|---|---|---|---|
| First-release local package readiness | end_to_end | consume `7a` evidence and rerun `pnpm release:validate` | package/release config/workflows | none beyond local checkout | archived `7a` decision plus current validation | `package_release_proof_passed` and validation passes | missing/stale evidence or validation failure |
| Public npm publish activation | externally_activated | guarded release event and `PAIRFLOW_NPM_PUBLISH_ENABLED=true` | `npm-publish.yml`, release workflow | npm org/package access, `NPM_TOKEN`, `RELEASE_PLEASE_TOKEN`, `npm-publish` environment, explicit GO | prerequisite table plus workflow guard inspection | all prerequisites present, guard intentionally open or ready to open, no real publish triggered here | any missing/unknown prerequisite or unexpected open guard |
| Public docs availability | externally_activated | GitHub Pages workflow and public URL | docs build/workflow | Pages enabled, `github-pages` environment, public URL proof | archived `7b` decision plus external Pages status | local docs ready and external Pages present | missing/unknown Pages setup or no public URL |
| Installed skill readiness | end_to_end | consume `7c` evidence | installed package skill sources/CLI | none beyond local proof | archived `7c` decision | `skill_install_proof_passed` | missing/stale evidence |
| Installed UI lifecycle readiness | end_to_end | consume `7d` evidence | UI lifecycle CLI/package assets | available local port/process permissions | archived `7d` decision | `ui_lifecycle_proof_passed` | missing/stale evidence |
| External release activation setup | externally_activated | GitHub/npm operator setup after NO-GO blockers are named | GitHub/npm settings | operator-owned setup | handoff only | routed to `7f-external-release-setup` when prerequisites are missing | missing setup keeps release NO-GO |
| Published registry install readiness | externally_activated | `npm install -g @pairflow/cli@latest` after actual publish | npm package metadata | actual public publish completed | handoff only | not closed in this task | always deferred to `7g` after setup, GO, and actual publish |

### Decision Matrix

| Input | Required GO State | If Missing / Unknown |
|---|---|---|
| `7a` package proof | `package_release_proof_passed` | `release_no_go` |
| `7b` docs proof | `docs_readiness_proof_passed` locally and external Pages ready for release GO | `release_no_go` |
| `7c` skill proof | `skill_install_proof_passed` | `release_no_go` |
| `7d` UI proof | `ui_lifecycle_proof_passed` | `release_no_go` |
| `pnpm release:validate` | passes | `release_no_go` |
| `pnpm docs:validate` | passes | `release_no_go` |
| `RELEASE_PLEASE_TOKEN` | present | release automation NO-GO |
| `NPM_TOKEN` | present | npm publish NO-GO |
| npm `@pairflow` org/package access | present | npm publish NO-GO |
| `npm-publish` environment | present with intended approval policy | npm publish NO-GO |
| `PAIRFLOW_NPM_PUBLISH_ENABLED` | observed `false/missing` before GO; operator may open only after recorded GO | observed `true` before recorded GO is `unexpected_open_blocker` and `release_no_go` |
| GitHub Pages enabled/environment/public URL | present for release GO | `release_no_go` |
| External setup blockers | none missing for GO | route to `7f-external-release-setup` |
| Actual npm publish | not required here | `7g` remains pending |

`release_go` requires `docs_public_state: public_docs_ready`. If
`github_pages_enabled`, `github_pages_environment`, or
`github_pages_public_url` is `missing` or `unknown`, the final decision must be
`release_no_go`.

## L1 - Branch Inventory

### Allowed Edits

1. `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md`
2. `plans/archive/plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md`

### Forbidden Edits / Actions

1. Editing `package.json`, release config, workflow YAML, docs source, source
   code, generated docs, or generated package artifacts.
2. Running `npm publish`, creating a GitHub release, creating a release tag, or
   dispatching a real publish workflow.
3. Creating/editing GitHub secrets, variables, environments, or Pages settings
   from this task. If the operator performs external setup separately, this
   task may record fresh verification evidence.
4. Claiming public npm install readiness before `7g-registry-install-smoke`.
5. Treating local tarball install proof as public registry proof.

### Evidence Contract

```yaml
release_go_no_go:
  evidence_status: "pending|completed"
  executed_at: "<ISO-8601 timestamp>"
  consumed_evidence:
    package_release_proof: "package_release_proof_passed|missing|blocked"
    package_release_proof_source: "derived_structured_fields|literal_decision"
    docs_readiness_proof: "docs_readiness_proof_passed|missing|blocked"
    docs_readiness_proof_source: "derived_structured_fields|literal_decision"
    skill_install_proof: "skill_install_proof_passed|missing|blocked"
    ui_lifecycle_proof: "ui_lifecycle_proof_passed|missing|blocked"
  current_local_validation:
    release_validate: "passed|failed|not_run"
    docs_validate: "passed|failed|not_run"
    workflow_guard_inspection: "passed|failed|not_run"
  external_prerequisites:
    release_please_token: "present|missing|unknown"
    npm_token: "present|missing|unknown"
    npm_org_package_access: "present|missing|unknown"
    npm_publish_environment: "present|missing|unknown"
    pairflow_npm_publish_enabled_observed: "false|true|missing|unknown"
    publish_guard_authorization: "not_authorized|operator_may_open_after_go|unexpected_open_blocker"
    github_pages_enabled: "present|missing|unknown"
    github_pages_environment: "present|missing|unknown"
    github_pages_public_url: "present|missing|unknown"
  decision: "release_go|release_no_go"
  publish_guard_state: "guard_closed|guard_open_authorized|unexpected_open_blocker"
  docs_public_state: "public_docs_ready|public_docs_no_go"
  publish_execution_handoff:
    actual_publish_completed: false
    required_before_7g: "GitHub release published and npm publish workflow completed successfully"
    registry_install_proof_status: "deferred_to_7g"
  next_task: "7f-external-release-setup|actual_release_publish_required|follow_up_task_required"
  blockers: []
  notes: []
```

### External Prerequisite Status Contract

| Prerequisite | Authority | Evidence Source | GO Meaning | Missing/Unknown Meaning |
|---|---|---|---|---|
| `RELEASE_PLEASE_TOKEN` secret | GitHub | Actions secrets UI/API | Release Please-created releases can trigger guarded publish workflows | release automation activation NO-GO |
| `NPM_TOKEN` secret | GitHub/npm | Actions secrets UI plus npm token/account proof | real publish job can authenticate | npm publish NO-GO |
| npm `@pairflow` org/package access | npm | `npm whoami`, npm org/package access screen, or authenticated CLI proof | operator can publish `@pairflow/cli` | npm publish NO-GO |
| `npm-publish` environment | GitHub | repository Environments UI/API | real publish job has protected environment | npm publish NO-GO |
| `PAIRFLOW_NPM_PUBLISH_ENABLED` | GitHub | Actions variables UI/API | observed `false` or `missing` before GO; operator may open only after recorded GO | observed `true` before recorded GO is `unexpected_open_blocker` and release NO-GO |
| GitHub Pages enabled | GitHub | Pages settings UI/API | docs workflow can publish | release NO-GO |
| `github-pages` environment | GitHub | repository Environments UI/API | Pages deploy environment exists | release NO-GO |
| public Pages URL | GitHub/web | Pages settings, deployment output, or browser/curl | public docs availability proven | release NO-GO |

### Acceptance Criteria

1. Task artifact exists at
   `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md`
   with `status: approved` only after ReviewSpec task-mode approval.
2. Parent plan tracker points `7e-release-go-no-go` at the live task path
   before execution.
3. Archived `7a`, `7b`, `7c`, and `7d` evidence decisions are consumed and
   recorded without reopening their proof scope. `7a` and `7b` may be consumed
   through derived structured fields rather than literal `decision:` tokens,
   and their external NO-GO sub-decisions must remain blockers rather than
   being reinterpreted as public publish or public docs readiness.
4. Current `pnpm release:validate` and `pnpm docs:validate` status is recorded.
5. Publish workflow guard shape and docs Pages workflow shape are inspected or
   validation failure is recorded.
6. Every external GitHub/npm prerequisite is classified `present`, `missing`,
   or `unknown`; no missing/unknown publish prerequisite can produce GO.
7. If `PAIRFLOW_NPM_PUBLISH_ENABLED=true` is observed before all GO
   prerequisites are present and explicit GO is recorded, the decision is
   `release_no_go` with `unexpected_open_blocker`.
8. `release_go` does not claim public registry install proof; it only unlocks
   actual publish and successor `7g-registry-install-smoke`.
9. `release_no_go` names exact blockers and leaves publish guard closed.

### ReviewSpec Gate Coverage

| Gate | Required Review Question |
|---|---|
| Metadata | Does frontmatter match `7e-release-go-no-go`, parent tracker, task order, archive group, and review status? |
| Scope | Is the task aggregation/decision-only with no source/workflow/GitHub/npm mutation or real publish? |
| Contract | Are GO/NO-GO inputs, external status vocabulary, guard states, and successor handoff concrete enough to execute? |
| Capability | Does the task avoid overclaiming public npm registry install, public docs URL, or release execution before external proof exists? |
| Split policy | Is the aggregation safely one task, and are setup/publish/registry-smoke responsibilities routed out? |

## L2 - Execution Plan

### Operator Proof Checklist

1. Confirm clean checkout:
   ```bash
   git status --short
   ```
2. Record tool/package versions:
   ```bash
   node --version
   pnpm --version
   npm --version
   node -p "require('./package.json').name + ' ' + require('./package.json').version"
   ```
3. Verify archived proof decisions:
   ```bash
   node - <<'NODE'
   const fs = require("node:fs");
   const files = {
     package: "plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7a-package-release-proof.md",
     docs: "plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7b-docs-readiness-proof.md",
     skills: "plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7c-skill-install-proof.md",
     ui: "plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7d-ui-lifecycle-proof.md"
   };
   const text = Object.fromEntries(
     Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")])
   );
   const proof = {
     package_release_proof_passed:
       text.package.includes('release_validate_result: "passed"') &&
       text.package.includes('build_result: "passed"') &&
       text.package.includes('isolated_install_result: "passed"') &&
       text.package.includes("version_match: true") &&
       text.package.includes("required_present: true") &&
       text.package.includes("forbidden_absent: true"),
     package_publish_external_no_go_preserved:
       text.package.includes('publish_enabled_guard_decision: "unknown_no_go"') &&
       text.package.includes('npm_token_status: "missing"') &&
       text.package.includes('release_please_token_status: "missing"'),
     docs_readiness_proof_passed:
       text.docs.includes('docs_validate_result: "passed"') &&
       text.docs.includes("required_present: true") &&
       text.docs.includes("overclaim_findings: []") &&
       text.docs.includes("uses_docs_validate: true") &&
       text.docs.includes("uses_deploy_pages: true"),
     docs_external_no_go_preserved:
       text.docs.includes('public_availability_decision: "external_no_go"') &&
       text.docs.includes('pages_settings_status: "missing"') &&
       text.docs.includes('public_url_status: "missing"'),
     skill_install_proof_passed:
       text.skills.includes('decision: "skill_install_proof_passed"'),
     ui_lifecycle_proof_passed:
       text.ui.includes('decision: "ui_lifecycle_proof_passed"')
   };
   console.log(JSON.stringify(proof, null, 2));
   if (Object.values(proof).some((value) => value !== true)) {
     process.exitCode = 1;
   }
   NODE
   ```
4. Run current local validation:
   ```bash
   pnpm release:validate
   pnpm docs:validate
   ```
5. Inspect workflow guard state without mutating GitHub:
   ```bash
   node - <<'NODE'
   const fs = require("node:fs");
   const release = fs.readFileSync(".github/workflows/release.yml", "utf8");
   const publish = fs.readFileSync(".github/workflows/npm-publish.yml", "utf8");
   const pages = fs.readFileSync(".github/workflows/docs-pages.yml", "utf8");
   const proof = {
     release_requires_release_please_token:
       release.includes("secrets.RELEASE_PLEASE_TOKEN") &&
       release.includes("RELEASE_PLEASE_TOKEN is required"),
     publish_has_guard_closed_dry_run:
       publish.includes("vars.PAIRFLOW_NPM_PUBLISH_ENABLED != 'true'") &&
       publish.includes("npm publish --dry-run"),
     publish_real_path_requires_release_and_enabled_var:
       publish.includes("github.event_name == 'release'") &&
       publish.includes("vars.PAIRFLOW_NPM_PUBLISH_ENABLED == 'true'"),
     publish_real_path_requires_npm_token:
       publish.includes("secrets.NPM_TOKEN") &&
       publish.includes("NPM_TOKEN is required"),
     publish_real_path_uses_environment:
       publish.includes("environment: npm-publish"),
     publish_duplicate_preflight_present:
       publish.includes('npm view "@pairflow/cli@$version" version') &&
       publish.includes("refusing duplicate publish"),
     pages_workflow_uses_docs_validate:
       pages.includes("pnpm docs:validate"),
     pages_workflow_uses_github_pages_environment:
       pages.includes("environment:") &&
       pages.includes("name: github-pages"),
     pages_workflow_uploads_site_dist:
       pages.includes("actions/upload-pages-artifact") &&
       pages.includes("path: docs/site-dist")
   };
   console.log(JSON.stringify(proof, null, 2));
   if (Object.values(proof).some((value) => value !== true)) {
     process.exitCode = 1;
   }
   NODE
   ```
6. Record external GitHub/npm prerequisites from fresh operator evidence:
   - GitHub repository `Settings -> Secrets and variables -> Actions`:
     `RELEASE_PLEASE_TOKEN`, `NPM_TOKEN`, and
     `PAIRFLOW_NPM_PUBLISH_ENABLED`.
   - GitHub repository `Settings -> Environments`: `npm-publish` and
     `github-pages`.
   - GitHub repository `Settings -> Pages`: Pages enabled/source status and
     public Pages URL.
   - npm authentication and package access:
     ```bash
     npm whoami
     npm view @pairflow/cli version
     ```
     Record unauthenticated errors or package lookup errors as evidence, not as
     automatic GO.
7. Decide:
   - Record `release_go` only if all publish prerequisites are present, local
     validation passed, archived proof decisions passed, public Pages
     prerequisites are present, workflow guards are intact,
     `PAIRFLOW_NPM_PUBLISH_ENABLED` is currently `false` or `missing`, and the
     operator explicitly wants the publish guard opened after this decision.
   - Otherwise record `release_no_go`, keep publish guard closed, name the
     exact missing/unknown blockers, and route next work to
     `7f-external-release-setup`.
8. Confirm checkout remains limited to evidence edits:
   ```bash
   git status --short
   ```

### Evidence To Record

Use this section after execution.

```yaml
release_go_no_go:
  evidence_status: completed
  executed_at: "2026-06-08T11:05:38+02:00"
  consumed_evidence:
    package_release_proof: package_release_proof_passed
    package_release_proof_source: derived_structured_fields
    docs_readiness_proof: docs_readiness_proof_passed
    docs_readiness_proof_source: derived_structured_fields
    skill_install_proof: skill_install_proof_passed
    ui_lifecycle_proof: ui_lifecycle_proof_passed
  current_local_validation:
    release_validate: passed
    docs_validate: passed
    workflow_guard_inspection: passed
  external_prerequisites:
    release_please_token: missing
    npm_token: missing
    npm_org_package_access: unknown
    npm_publish_environment: missing
    pairflow_npm_publish_enabled_observed: missing
    publish_guard_authorization: not_authorized
    github_pages_enabled: missing
    github_pages_environment: missing
    github_pages_public_url: missing
  decision: release_no_go
  publish_guard_state: guard_closed
  docs_public_state: public_docs_no_go
  publish_execution_handoff:
    actual_publish_completed: false
    required_before_7g: "GitHub release published and npm publish workflow completed successfully"
    registry_install_proof_status: "deferred_to_7g"
  next_task: 7f-external-release-setup
  blockers:
    - release_please_token_missing
    - npm_token_missing
    - npm_org_package_access_unknown
    - npm_publish_environment_missing
    - pairflow_npm_publish_enabled_missing
    - github_pages_disabled_or_missing
    - github_pages_environment_missing
    - github_pages_public_url_missing
    - npm_cli_unauthenticated
    - npm_registry_package_lookup_404
  notes:
    - "Initial checkout was clean before evidence execution."
    - "Tool versions: node v26.0.0, pnpm 10.8.1, npm 11.12.1, package @pairflow/cli 0.1.0."
    - "Archived 7a-7d proof consumption returned all expected booleans true."
    - "pnpm release:validate passed; pnpm docs:validate passed; both emitted DEP0205 module.register deprecation warnings only."
    - "Workflow guard inspection passed for release token requirement, guard-closed dry-run, real publish gates, npm token requirement, npm-publish environment, duplicate publish preflight, docs validate, github-pages environment, and Pages artifact upload."
    - "GitHub CLI read-only checks for felho/pairflow returned empty Actions secrets, empty Actions variables, and no environments."
    - "GitHub Pages API returned HTTP 404, recorded as Pages missing/not enabled."
    - "npm whoami failed with ENEEDAUTH; npm view @pairflow/cli version failed with E404."
```
