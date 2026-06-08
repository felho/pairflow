---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_external_release_setup_v1
task_family_id: external-release-setup
sequence_key: "7f"
task_id: 7f-external-release-setup
title: "External Release Activation Setup"
status: archived
phase: phase7
target_files:
  - "plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7f-external-release-setup.md"
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

# Task: External Release Activation Setup

## L0 - Policy

### Goal

Turn the `7e-release-go-no-go` external prerequisite blockers into an explicit
operator setup and verification checklist so the first release can move from
`release_no_go` to verified external setup readiness without hiding GitHub/npm
authority outside the plan.

### Domain / Control Model Summary

1. Business invariant: Pairflow must not open public npm publish automation or
   claim public docs availability until GitHub release automation, npm publish
   credentials, publish guard state, protected publish environment, GitHub
   Pages, and npm account/package access are explicitly configured and
   verified.
2. Control model: GitHub owns repository secrets, variables, environments,
   Pages settings, and workflow execution. npm owns account authentication,
   token creation, organization/package access, and package publication. The
   repo owns only the workflow/config expectations and the evidence record.
3. Read-path rule: this task records setup status from fresh GitHub/npm UI or
   CLI evidence. Secret/token values must never be recorded; only
   `present|missing|unknown` status and non-sensitive command outcomes may be
   recorded.
4. Forbidden fallback: do not treat workflow YAML references to secret names as
   proof that secrets exist. Do not infer npm publish access from unauthenticated
   `npm view`. Do not set `PAIRFLOW_NPM_PUBLISH_ENABLED=true` until this task
   has verified every required external prerequisite and the operator explicitly
   chooses to open the guard. Do not publish to npm or create a GitHub release
   in this task.
5. Allowed resolution path: the operator may create or verify the required
   external GitHub/npm resources outside the repository and this task may record
   the resulting statuses. If every external prerequisite is present, this task
   records external setup readiness and the handoff to actual release/publish
   execution. The post-publish registry install proof remains `7g`.
6. Missing-data rule: any unknown or missing prerequisite remains a blocker and
   must be named in the evidence. A partially configured external setup does not
   unlock the registry install smoke.
7. Phase boundary: this task owns external setup guidance and evidence capture
   only. It must not edit CLI/runtime/docs source, workflow YAML, package
   metadata, release config, or generated artifacts.

### Plan Linkage

1. Parent plan gap closed: missing remediation path after `7e` classifies
   external GitHub/npm prerequisites as NO-GO.
2. Depends on: `7e-release-go-no-go` producing a blocker list or a decision
   that explicitly requires external setup before public publish activation.
3. Unlocks / impacts successors:
   - If every external prerequisite is verified and the publish guard is opened
     deliberately by the operator, the operator may run the actual
     release/publish flow.
   - Only after actual release and successful publish may
     `7g-registry-install-smoke` run.
4. Task-list impact: this task prevents the plan from jumping directly from
   diagnosis to public registry smoke without a documented setup step.
5. Exit expectation: record which external prerequisites were created or
   verified, which remain missing or unknown, whether the publish guard is still
   closed or intentionally opened, and whether the next action is actual
   release/publish execution or continued external setup.

### Canonical Contract Anchors

1. Decision/prerequisite evidence:
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md`
2. Release/publish/docs workflow surfaces:
   - `.github/workflows/release.yml`
   - `.github/workflows/npm-publish.yml`
   - `.github/workflows/docs-pages.yml`
3. External setup surfaces:
   - GitHub Actions secrets: `RELEASE_PLEASE_TOKEN`, `NPM_TOKEN`
   - GitHub Actions variable: `PAIRFLOW_NPM_PUBLISH_ENABLED`
   - GitHub environments: `npm-publish`, `github-pages`
   - GitHub Pages settings and public Pages URL
   - npm login, npm token, and `@pairflow/cli` package/org access

### Scope Reality / Shape Proof

1. Earlier `7a` evidence found publish activation NO-GO because GitHub Actions
   secrets/variables, the `npm-publish` environment, and authenticated npm
   access were missing or unknown.
2. Earlier `7b` evidence found public docs availability NO-GO because GitHub
   Pages was disabled, the `github-pages` environment was missing, and no
   public Pages URL existed.
3. `7e` aggregates those facts, but does not itself provide a remediation path.
4. This task fills that operational gap without moving actual publish or
   registry install proof into setup.

### Risk Classification

```yaml
risk_score: 7
factors:
  external_activation: 2
  publish_safety: 2
  secret_handling: 2
  docs_pages_activation: 1
  source_mutation: 0
split_required: no
split_reason: >
  The setup checklist must see release-token, npm-token, publish guard,
  protected environment, Pages, and npm access together because these resources
  jointly determine whether external setup is ready for actual release/publish.
  Actual publish and post-publish install proof remain successor work.
```

### Bounded Task Shape

1. Primary shape: `external_setup_checklist`, limited to operator-owned
   GitHub/npm configuration and evidence capture.
2. Secondary shape: none. If workflow YAML or source code must change, stop and
   create a separate implementation task.
3. No-split rationale: the missing prerequisites are one release activation
   boundary; splitting by secret/environment/Page would make setup readiness
   harder to reason about.
4. Split trigger: any need to modify repository workflows, package metadata,
   docs source, runtime source, or perform an actual publish.

### Capability Closure

| Capability Claim | Closure Classification | Activation Path | External Authority | Current Task Proof | Pass Condition | Failure/NO-GO Condition |
|---|---|---|---|---|---|---|
| Release Please can create releases that trigger publish automation | externally_activated | GitHub Actions uses `RELEASE_PLEASE_TOKEN` | GitHub token/secrets | secret presence and non-secret setup note | `RELEASE_PLEASE_TOKEN` present | missing/unknown token |
| npm publish job can authenticate | externally_activated | GitHub Actions uses `NPM_TOKEN` | npm token, GitHub secret | secret presence plus npm account/token proof | `NPM_TOKEN` present and npm access verified | missing/unknown token or npm access |
| publish remains fail-closed until setup readiness | externally_activated | `PAIRFLOW_NPM_PUBLISH_ENABLED` variable | GitHub repository variables | observed variable state | `false` or missing until all prerequisites are verified; `true` only after explicit operator action | `true` before setup verification or unknown when deciding |
| publish job has protected environment | externally_activated | `environment: npm-publish` | GitHub environments | environment presence and policy note | `npm-publish` present | missing/unknown environment |
| docs can deploy publicly | externally_activated | GitHub Pages workflow | GitHub Pages and environment | Pages source/status, environment, public URL | Pages enabled, `github-pages` present, URL present | missing/unknown Pages setup |
| public registry install proof | externally_activated | npm install from registry | npm registry | handoff only | deferred to `7g` after actual publish | always deferred here |

## L1 - Branch Inventory

### Allowed Edits

1. `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7f-external-release-setup.md`
2. `plans/archive/plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md`

### Forbidden Edits / Actions

1. Editing workflow YAML, package metadata, release config, docs source,
   runtime source, generated docs, or generated package artifacts.
2. Recording secret or token values in any file.
3. Setting `PAIRFLOW_NPM_PUBLISH_ENABLED=true` before this task verifies every
   external prerequisite and the operator explicitly chooses to open the guard.
4. Running `npm publish`, creating a GitHub release, creating a release tag, or
   dispatching a real publish workflow.
5. Claiming `7g-registry-install-smoke` passed before an actual public publish.

### Evidence Contract

```yaml
external_release_setup:
  evidence_status: "pending|completed"
  executed_at: "<ISO-8601 timestamp>"
  source_decision:
    task_id: "7e-release-go-no-go"
    decision: "release_no_go|unknown"
    blockers_consumed: []
  github_actions:
    release_please_token: "present|missing|unknown"
    npm_token: "present|missing|unknown"
    pairflow_npm_publish_enabled_observed: "false|true|missing|unknown"
    publish_guard_authorization: "not_authorized|operator_may_open_after_setup_verified|operator_opened_after_setup_verified|unexpected_open_blocker"
  github_environments:
    npm_publish_environment: "present|missing|unknown"
    npm_publish_environment_policy: "recorded|missing|unknown"
    github_pages_environment: "present|missing|unknown"
  github_pages:
    enabled: "present|missing|unknown"
    source: "github_actions|branch|missing|unknown"
    public_url: "present|missing|unknown"
  npm:
    whoami: "passed|failed|not_run"
    account_or_org_access: "present|missing|unknown"
    package_access: "present|missing|unknown"
  decision:
    setup_status: "external_setup_verified|external_setup_incomplete"
    next_task: "actual_release_publish_required|external_setup_required"
  blockers: []
  notes: []
```

### Acceptance Criteria

1. Task artifact exists at
   `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7f-external-release-setup.md`
   with metadata matching the parent plan tracker.
2. Parent plan orders `7f-external-release-setup` after
   `7e-release-go-no-go` and before `7g-registry-install-smoke`.
3. `7e-release-go-no-go` successor wording routes NO-GO blockers to this task
   instead of directly to registry install smoke.
4. Required GitHub/npm resources are each classified
   `present|missing|unknown` without recording secret values.
5. `PAIRFLOW_NPM_PUBLISH_ENABLED=true` is authorized only after this task has
   verified every required external prerequisite and the operator explicitly
   chooses to open the guard.
6. The task records whether the next action is actual release/publish execution
   or continued external setup. `7g-registry-install-smoke` remains unavailable
   until actual release and successful npm publish have completed.

## L2 - Execution Plan

### Operator Setup Checklist

1. Confirm the current `7e` decision or blocker state:
   ```bash
   rg -n "decision:|blockers:|release_go_no_go:" \
     plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7e-release-go-no-go.md
   ```
2. Operator action: in GitHub repository settings, create or verify Actions
   secrets:
   - `RELEASE_PLEASE_TOKEN`
   - `NPM_TOKEN`
   Record only whether each secret is present.
3. Operator action: in GitHub repository settings, create or verify the Actions
   variable:
   - `PAIRFLOW_NPM_PUBLISH_ENABLED`
   Keep it `false` or missing until this task verifies every external
   prerequisite and the operator explicitly chooses to open the guard.
4. Operator action: in GitHub repository settings, create or verify
   environments:
   - `npm-publish`
   - `github-pages`
   Record the intended protection/approval policy for `npm-publish` without
   changing workflow YAML.
5. Operator action: in GitHub Pages settings, enable or verify Pages for
   GitHub Actions deployment and record the public Pages URL when available.
6. Operator action: in npm, authenticate and verify account/package access:
   ```bash
   npm whoami
   npm view @pairflow/cli version
   ```
   Record unauthenticated or not-found outputs as status evidence, not as GO by
   themselves.
7. Decide setup status:
   - If every external prerequisite is present and the publish guard is still
     closed, set `setup_status:
     external_setup_verified`. If the operator opens the publish guard in the
     same setup pass, record the guard as intentionally opened and set
     `next_task: actual_release_publish_required`.
   - If anything is missing or unknown, set `setup_status:
     external_setup_incomplete`, name blockers, and keep the guard closed.

### Evidence To Record

Use this section after execution.

```yaml
external_release_setup:
  evidence_status: completed
  executed_at: "2026-06-08T11:52:31+02:00"
  source_decision:
    task_id: "7e-release-go-no-go"
    decision: release_no_go
    blockers_consumed:
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
  github_actions:
    release_please_token: present
    npm_token: present
    pairflow_npm_publish_enabled_observed: "false"
    publish_guard_authorization: operator_may_open_after_setup_verified
  github_environments:
    npm_publish_environment: present
    npm_publish_environment_policy: recorded
    github_pages_environment: present
  github_pages:
    enabled: present
    source: github_actions
    public_url: present
  npm:
    whoami: passed
    account_or_org_access: present
    package_access: present
  decision:
    setup_status: external_setup_verified
    next_task: actual_release_publish_required
  blockers: []
  notes:
    - "GitHub repository secrets observed by name only: NPM_TOKEN and RELEASE_PLEASE_TOKEN."
    - "Repository variable PAIRFLOW_NPM_PUBLISH_ENABLED observed as false; publish guard intentionally remains closed until the operator opens it for actual release/publish."
    - "npm-publish environment observed with required reviewer felho and prevent_self_review=false."
    - "github-pages environment observed present; Pages API reported build_type=workflow, public=true, https_enforced=true, and html_url=https://felho.github.io/pairflow/."
    - "npm whoami returned felho; npm org ls pairflow reported felho as owner."
    - "npm access get status @pairflow/cli returned private before first public publish; the real publish workflow must still publish with --access public."
    - "No npm publish, GitHub release creation, release tag creation, workflow dispatch, or repository workflow/source edits were performed in this task."
```
