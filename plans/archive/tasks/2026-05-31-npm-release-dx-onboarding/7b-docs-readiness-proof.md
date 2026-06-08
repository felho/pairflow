---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_docs_readiness_proof_v1
task_family_id: docs-readiness-proof
sequence_key: "7b"
task_id: 7b-docs-readiness-proof
title: "Docs Readiness Proof"
status: archived
phase: phase7
target_files:
  - "plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7b-docs-readiness-proof.md"
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

# Task: Docs Readiness Proof

## L0 - Policy

### Goal

Prove that the repo-provided public docs site can be built, validated, and
inspected as a release-pilot onboarding surface covering install, upgrade,
version pinning, CLI basics, UI usage, skills, release semantics, and GitHub
Pages activation boundaries.

### Domain / Control Model Summary

1. Business invariant: release onboarding must be based on generated docs
   evidence and source-authority-aligned content, not on source-checkout
   assumptions or task prose.
2. Control model: `docs/site/**` owns source page content; `tools/docs/**` and
   package scripts own local docs generation/validation; `docs/site-dist/**`
   owns generated static output; `.github/workflows/docs-pages.yml` owns the
   GitHub Pages build/deploy orchestration; GitHub repository Pages settings
   and public URL activation remain external prerequisites.
3. Read-path rule: docs readiness proof must read package identity, release
   semantics, skill source-of-truth, and UI behavior from the existing repo
   anchors, then inspect generated docs output to prove the public read model
   mirrors those authorities.
4. Forbidden fallback: do not infer docs readiness from source markdown alone,
   workflow names alone, task text, npm registry state, or a public URL lookup.
   Do not mutate GitHub Pages settings or publish anything in this task.
5. Allowed resolution path: local `pnpm docs:validate` and generated
   `docs/site-dist/**` output may stand in for Pages artifact readiness; missing
   GitHub Pages settings or public URL proof must be recorded as external
   prerequisite status.
6. Missing-data rule: if GitHub Pages settings, Pages environment activation,
   repository permissions, or public URL proof cannot be verified locally,
   record `present|missing|unknown|deferred` status. Missing or unknown Pages
   activation does not invalidate local docs build/readiness proof, but it
   remains a NO-GO input for claiming public availability.
7. Phase boundary: this task owns docs readiness proof only. It must not edit
   docs source, docs build tooling, workflows, runtime code, package metadata,
   GitHub repository settings, or release/publish guards. If proof discovers a
   docs source/build/workflow defect, stop and route to a follow-up
   implementation task.

### Plan Linkage

1. Parent plan gap closed: missing docs build/readiness proof for release
   onboarding.
2. Depends on: `4-docs-site-pages` and `7a-package-release-proof`.
3. Unlocks / impacts successors:
   - `7e-release-go-no-go` consumes docs readiness and Pages prerequisite
     evidence.
   - `7f-registry-install-smoke` remains separate and must not be implied by
     docs readiness.
4. Task-list impact: after this task is proven and archived, the parent plan can
   proceed to installed-package skill and UI proof tasks before the final
   release GO/NO-GO aggregation.
5. Exit expectation: record exact commands, tool versions, generated output
   paths, route/page coverage, workflow guard/deploy configuration, content
   overclaim checks, external Pages prerequisite status, and successor handoff
   notes in this task or the parent plan.

### Canonical Contract Anchors

1. Docs source/build surfaces:
   - `package.json` `docs:build` and `docs:validate`
   - `tools/docs/buildDocsSite.ts`
   - `tools/docs/validateDocsSite.ts`
   - `docs/site/**`
   - `docs/site-dist/**`
   - `docs/README.md`
   - `README.md`
2. Docs workflow surfaces:
   - `.github/workflows/docs-pages.yml`
3. Mirrored authority surfaces:
   - `package.json`
   - `docs/commit-and-release-history-authority.md`
   - `docs/commit-message-guidance.md`
   - `.claude/skills/INSTALL.md`
   - `.claude/skills/UsePairflow/**`
   - `.claude/skills/CreatePairflowSpec/**`
   - `.claude/skills/ExecutePairflowPlan/**`
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7a-package-release-proof.md`

### Scope Reality / Shape Proof

1. Prior tasks already established the static docs source/build path,
   generated docs output, and GitHub Pages workflow.
2. This task converts those source-checkout claims into release-pilot evidence:
   local docs validation, generated output inspection, workflow configuration
   inspection, and external Pages prerequisite status.
3. This task is proof-only. It may inspect docs source/output/workflow anchors
   but may edit only task/plan evidence surfaces.
4. GitHub Pages public URL proof is intentionally external/deferred. The task
   proves local artifact readiness and records whether external activation is
   known.
5. If generated docs overclaim npm publish readiness, `pairflow skills install`,
   `pairflow ui start|stop|status|restart`, or public Pages activation, this
   task must stop and route to a docs implementation fix.

### Refactor Classification

1. Classification: release proof / operational validation.
2. Classification triggers: no planned architecture refactor and no
   implementation source edits in this task.
3. Architecture checks: N/A for the proof-only task.
4. Public helper surface action: no helper API surface is expected or allowed.

### Complexity Risk and Split Decision

1. `risk_score`: 4 after proof-only narrowing.
2. Axis scores:
   - `authority_risk`: 0. The task does not change docs/source/workflow
     authority; it verifies existing authorities.
   - `surface_spread`: 1. The proof reads docs source/output/workflow surfaces,
     but editable surfaces are limited to task/plan evidence.
   - `identity_join_risk`: 0. Package identity is read-only and already proven
     by `7a`.
   - `activation_coupling`: 1. GitHub Pages activation is inspected as external
     status, not mutated.
   - `prerequisite_risk`: 1. Pages settings and public URL proof may be
     unknown and must be recorded.
   - `acceptance_multiplicity`: 1. The task proves local docs validation,
     route coverage, workflow configuration, and external status in one
     evidence block.
3. `split_decision`: `single_task_allowed: yes` because all closures are
   proof-only and no source/workflow fixes are allowed.
4. `split_required_if`: any failure requires docs source/build/workflow changes,
   GitHub Pages settings mutation, or public URL/deploy proof. In that case,
   stop this task and create or route to a follow-up task.

### Authority Fan-out Scan

| Bucket | Status | Boundary | Evidence |
|---|---|---|---|
| producer | present | read-only | `docs/site/**`, `tools/docs/**`, package scripts, and workflow produce docs authority/artifacts; this task does not edit them. |
| validator/gate | present | read-only | `pnpm docs:validate`, generated output inspection, and workflow inspection validate readiness. |
| persistence/replay | present | evidence-only | Evidence block stores commands, generated output facts, and external status for later review. |
| execution consumers | absent | N/A | CLI/runtime execution does not consume docs site internals. |
| workflow/orchestration | present | read-only | Pages workflow is inspected, not changed or triggered. |
| read/presentation | present | evidence-only | Generated docs output presents onboarding readiness. |
| recovery/cleanup | present | bounded | Generated docs output may be refreshed by validation; cleanup is limited to any temporary inspection artifacts. |
| external/integration | present | external | GitHub Pages settings, environment, repository permissions, and public URL proof are external statuses. |

### Closure-Budget Gate

| Closure Bucket | Status | Boundary | Evidence / Decision |
|---|---|---|---|
| authority_producer | absent | N/A | No docs source, tooling, workflow, or package authority is changed. |
| shared_contract | present | current-task evidence contract | The evidence schema and external Pages status vocabulary are current-task contracts. |
| internal_execution_consumers | absent | N/A | Runtime and CLI behavior are not in scope. |
| workflow_orchestration_consumers | present | read-only | Pages workflow is inspected; no deploy is triggered. |
| read_model_consumers | present | evidence-only | Generated `docs/site-dist/**` is inspected for required onboarding routes and overclaim boundaries. |
| persisted_authority_or_schema | absent | N/A | No persisted runtime schema or source authority changes. |
| cleanup_recovery_consumers | present | bounded | Any temporary proof files are cleanup-only; generated docs output remains repo-owned build output. |

1. `split_required`: no after proof-only narrowing.
2. Intentionally collapsed closures: docs build validation, generated output
   inspection, and Pages workflow inspection are collapsed because one docs
   artifact readiness proof feeds `7e`.
3. Explicitly deferred closures: docs/source fixes, workflow fixes, GitHub
   Pages external setup, public URL proof, npm publish proof, installed skill
   execution, and installed UI lifecycle execution.
4. Unknown buckets: none. Any newly discovered source mutation need converts
   this task to blocked and requires a follow-up task.

### Bounded-Task-Shape Gate

1. Primary shape: `activation_or_read_model`, limited to docs readiness
   evidence production.
2. Secondary shape: none. Docs source/build/workflow authorities are inspected,
   not changed.
3. Decomposed closures:
   - local docs validation proof,
   - generated route/page coverage proof,
   - content overclaim proof,
   - Pages workflow configuration proof,
   - external Pages prerequisite status,
   - successor handoff evidence.
4. Adjacent call-site / consumer-family scan result:
   - package metadata and release semantics consumers: inspected through docs
     content and generated output; no source mutation owned here.
   - skill install consumer: known and deferred to `7c-skill-install-proof`;
     docs must not claim installed-package skill execution readiness.
   - UI lifecycle consumer: known and deferred to `7d-ui-lifecycle-proof`;
     docs must not claim installed-package UI lifecycle proof.
   - release-pilot decision consumer: known and deferred to
     `7e-release-go-no-go`; current task only records evidence.
   - public Pages URL consumer: known external activation boundary; current
     task records status only.
5. Adjacent scan unknowns: none for this proof-only scope.
6. Shape mix safety: all closures are validation/evidence production, share the
   same generated docs output and workflow surface, and do not mutate source
   contracts.
7. Split trigger: any repo-owned docs/build/workflow fix, public deployment
   activation, or runtime/source mutation discovered during proof.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger | Entrypoint | Configuration Owner | Operator/User Path | Repo-Provided Parts | External Prerequisites | Success Output Contract | Failure Output Contract | Last-Mile Proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Validate docs site locally | end_to_end | `pnpm docs:validate` | package script | repo docs tooling and source docs | local release-pilot proof command | docs source, build tool, generated output, validator | local Node/pnpm toolchain | validation exits 0 and generated output exists | non-zero command failure or explicit missing route/content finding | saved command output and generated output inspection |
| Prove required onboarding coverage | end_to_end | inspect `docs/site-dist/**` after validation | generated HTML output | docs source/build tooling | route/page audit | install, upgrade, version pinning, CLI, UI, skills, release, Pages/deploy pages | none beyond generated output | required pages/routes present and readable | missing route/page list | generated output route/content evidence |
| Preserve release and feature boundaries | end_to_end | inspect generated output text | generated HTML output | docs source/build tooling | content overclaim audit | guarded publish wording, skill/UI successor boundaries, package identity | none beyond generated output | forbidden overclaims absent | explicit overclaim list | content search evidence |
| Keep Pages deployment externally activated | externally_activated | inspect workflow and optional GitHub settings | `.github/workflows/docs-pages.yml` | workflow config plus operator GitHub settings | workflow config inspection plus prerequisite checklist | workflow triggers, permissions, artifact upload, Pages deploy job | GitHub Pages settings/environment/repository permissions/public URL | local workflow configuration recorded; external status recorded | missing/unknown external values recorded as NO-GO for public URL claim | local workflow proof plus operator prerequisite checklist |

### In Scope

1. Run docs validation from the current checkout.
2. Inspect generated docs output for required onboarding routes/pages.
3. Inspect generated docs output for forbidden overclaims.
4. Verify `.github/workflows/docs-pages.yml` uses the repo-local docs validation
   path, uploads `docs/site-dist`, and deploys through GitHub Pages.
5. Record GitHub Pages external prerequisite statuses using the L1 status
   contract.
6. Record a blocker/follow-up requirement when docs source/build/workflow
   defects are discovered. Do not fix those defects in this task.

### Out of Scope

1. Editing docs source pages, docs build tooling, package scripts, or workflow
   YAML.
2. Publishing GitHub Pages or mutating GitHub repository settings.
3. Proving a public Pages URL.
4. Real public `npm publish` or public npm install proof.
5. Proving `pairflow skills install` behavior from the installed package; owned
   by `7c`.
6. Proving `pairflow ui start|status|restart|stop` from the installed package;
   owned by `7d`.
7. Changing release-history taxonomy, package metadata, or commit-message
   policy.
8. Treating local source markdown alone as a substitute for generated docs
   output evidence.

### Safety Defaults

1. Use local docs validation/build commands only.
2. Do not trigger Pages deployment unless explicitly routed to an external
   activation task.
3. Do not write to global npm, global skill, global UI service, or GitHub
   settings locations.
4. Stop immediately if a command path would publish docs externally or mutate
   GitHub repository settings.
5. If proof creates temporary inspection files, clean them before task closure
   and record cleanup evidence.

## L1 - Contract

### 0a) Canonical Contract Preservation

| Surface | Preserved Contract | Required Behavior | Priority | Status |
|---|---|---|---|---|
| Docs build script | `package.json` exposes `docs:build` / `docs:validate` | Validation must use the repo-local docs tooling and generated output path | P1 | required-now |
| Generated docs output | `docs/site-dist/**` is the public read model candidate | Required onboarding routes/pages must exist after validation | P1 | required-now |
| Package install docs | Public package identity is `@pairflow/cli`; command is `pairflow` | Generated install/upgrade/version pages must mirror package authority | P1 | required-now |
| Release docs | Public publish remains guarded until release-pilot GO | Generated release page must not claim public publish readiness | P1 | required-now |
| Skill docs | Repo-local `.claude/skills/**` is source; global copies are derived | Generated skill page must not claim installed-package skill execution proof | P1 | required-now |
| UI docs | Current/future UI lifecycle boundaries remain explicit | Generated UI page must not claim installed-package lifecycle proof owned by `7d` | P1 | required-now |
| Pages deploy docs | Public Pages URL is externally activated | Workflow proof must not claim public URL availability | P1 | required-now |

### 0b) Branch Inventory

| Branch | Expected Behavior | Risk If Wrong | Test / Proof |
|---|---|---|---|
| Docs validation | `pnpm docs:validate` exits 0 | Generated docs are stale or invalid | saved command output |
| Required pages present | Generated output includes install, upgrade, version, CLI, UI, skills, release, Pages/deploy coverage | Public onboarding surface incomplete | generated output route audit |
| Forbidden overclaims absent | Generated output avoids premature public publish, public URL, installed skill/UI proof claims | False release readiness claim | generated output content audit |
| Workflow build path | Workflow runs same local docs validation command | Local proof does not match CI/Pages path | workflow inspection |
| Artifact upload path | Workflow uploads `docs/site-dist` | Pages deploy consumes wrong artifact | workflow inspection |
| Pages deploy path | Workflow uses GitHub Pages deploy action/environment | Repo lacks publication path | workflow inspection |
| External Pages setup | Operator records Pages settings/environment/public URL status | False public URL readiness | prerequisite table |
| Successor handoff | `7e` can consume docs proof and external status | GO/NO-GO decision lacks docs evidence | evidence block |

### 0c) Precondition And Side-Effect Boundary

| Precondition | Side Effect Allowed Only After | Failure Behavior |
|---|---|---|
| Clean or understood worktree | Docs validation proof starts | Stop and record unrelated changes or align scope |
| Dependencies installed | Docs validation command | Fail with exact missing dependency command |
| `pnpm docs:validate` passes | Treat generated output as proof candidate | Record blocker/follow-up when repo-owned drift requires source edits |
| Generated output exists | Route/content inspection | Do not inspect stale or source-only docs as release proof |
| Workflow inspected locally | External prerequisite readiness recorded | Do not trigger deploy or mutate GitHub settings |

If any precondition failure requires a source edit to resolve, the current task
records the blocker and stops. It must not perform the source edit under this
proof-only scope.

### 0d) Canonical Contract Matrix

| Contract Element | Classification | Owner | Required Behavior | Success / Exit Contract | Side Effects | Required Tests |
|---|---|---|---|---|---|---|
| Docs validation command | canonical | `package.json`, `tools/docs/**` | `pnpm docs:validate` builds and validates generated docs output | Evidence records command result and generated output path | writes generated `docs/site-dist/**` only as docs build output | `pnpm docs:validate` |
| Generated route coverage | proof artifact | `docs/site-dist/**` | Contains required onboarding pages/routes | Evidence records present/missing route list | none beyond generated output refresh | route audit |
| Generated content boundaries | proof artifact | `docs/site-dist/**` | Avoids false claims for public publish, public Pages URL, installed skill execution, and installed UI lifecycle proof | Evidence records forbidden-overclaim search result | none beyond generated output refresh | content audit |
| Pages workflow | guard contract | `.github/workflows/docs-pages.yml` | Uses `pnpm docs:validate`, uploads `docs/site-dist`, deploys with GitHub Pages action, and triggers on `main`, release `published`, and manual dispatch | Evidence records workflow inspection result | none | workflow inspection |
| External Pages prerequisites | external contract | operator/GitHub | Pages settings, environment, repository permissions, and public URL proof use the L1 status contract | Missing/unknown keeps public URL readiness NO-GO | none; no local mutation | operator prerequisite checklist |
| Successor handoff | deferred contract | this task evidence | `7e` can consume docs readiness and Pages external status | Evidence states whether docs proof is usable for `7e` | none | evidence review |

### 0e) Data / Evidence Contract

The implementation must record an evidence block with these fields in this task
file before closure or in the parent plan evidence/progress section listed in
`target_files`. Do not create a separate progress note unless that path is first
added to `target_files` by task refinement.

```yaml
docs_readiness_proof:
  checked_at: "<ISO-8601 timestamp>"
  node_version: "<node --version>"
  pnpm_version: "<pnpm --version>"
  npm_version: "<npm --version>"
  package_name: "@pairflow/cli"
  package_version: "<package.json version>"
  docs_validate_command: "pnpm docs:validate"
  docs_validate_result: "passed|failed"
  docs_build_command: "pnpm docs:build"
  generated_output_path: "docs/site-dist"
  generated_pages:
    required_present: true
    required_pages_present:
      - "docs/site-dist/index.html"
      - "docs/site-dist/install.html"
      - "docs/site-dist/upgrade.html"
      - "docs/site-dist/cli-basics.html"
      - "docs/site-dist/ui.html"
      - "docs/site-dist/skills.html"
      - "docs/site-dist/release.html"
      - "docs/site-dist/pages.html"
    missing_pages: []
  content_boundaries:
    package_identity_present: true
    guarded_publish_boundary_present: true
    manual_skill_source_boundary_present: true
    ui_lifecycle_boundary_present: true
    public_pages_url_claim_absent: true
    npm_publish_ready_claim_absent: true
    installed_skill_execution_claim_absent: true
    installed_ui_lifecycle_claim_absent: true
    overclaim_findings: []
  workflow:
    workflow_file: ".github/workflows/docs-pages.yml"
    triggers_main_push: true
    triggers_release_published: true
    triggers_workflow_dispatch: true
    uses_docs_validate: true
    uploads_site_dist: true
    uses_deploy_pages: true
    pages_permissions_present: true
    environment_name: "github-pages"
  github_pages_prerequisites:
    pages_settings_status: "present|missing|unknown|deferred"
    github_pages_environment_status: "present|missing|unknown|deferred"
    repository_permissions_status: "present|missing|unknown|deferred"
    public_url_status: "present|missing|unknown|deferred"
    public_availability_decision: "ready|external_no_go|unknown_no_go|deferred_to_7e"
    blocking_reason: "<required unless ready>"
    handoff_to_7e: "<Pages readiness input or NO-GO reason>"
  successor_handoff:
    usable_for_7e: true
    docs_regeneration_command: "pnpm docs:validate"
  cleanup:
    temporary_files_created: []
    cleanup_result: "not_needed|removed|left_in_place_with_reason"
```

### 0f) Required Generated Pages

The generated docs output must include at least:

1. `docs/site-dist/index.html`
2. `docs/site-dist/install.html`
3. `docs/site-dist/upgrade.html`
4. `docs/site-dist/cli-basics.html`
5. `docs/site-dist/ui.html`
6. `docs/site-dist/skills.html`
7. `docs/site-dist/release.html`
8. `docs/site-dist/pages.html`

### 0g) Forbidden Overclaim Classes

Generated docs must not claim:

1. public npm publish is already complete,
2. public npm install from the registry is already proven,
3. a public GitHub Pages URL is already live unless externally verified,
4. `pairflow skills install` installed-package behavior is already proven by
   this task,
5. `pairflow ui start|stop|status|restart` installed-package behavior is
   already proven by this task,
6. global skill copies are source of truth,
7. source-checkout docs or helper scripts are substitutes for generated docs
   readiness evidence.

### 0h) External GitHub Pages Status Contract

| Prerequisite | Owner | Required For | Allowed Status Values | Missing/Unknown Handling |
|---|---|---|---|---|
| GitHub Pages settings enabled for repository | operator/GitHub | public Pages availability | `present`, `missing`, `unknown`, `deferred` | public URL readiness remains NO-GO |
| `github-pages` environment | operator/GitHub | Pages deployment | `present`, `missing`, `unknown`, `deferred` | deploy activation not fully proven |
| repository Actions/Pages permissions | operator/GitHub | Pages workflow deploy | `present`, `missing`, `unknown`, `deferred` | public URL readiness remains NO-GO |
| public Pages URL proof | operator/GitHub | public docs availability claim | `present`, `missing`, `unknown`, `deferred` | public availability claim remains blocked |

### 0i) Mirrored Surface Checklist

| Canonical Contract Row | Mirrored Surfaces That Must Stay Aligned |
|---|---|
| Docs validation command | L0 control model, branch inventory, evidence command fields, acceptance criteria 1 |
| Generated route coverage | capability closure, evidence generated pages, required generated pages, acceptance criteria 2 |
| Generated content boundaries | forbidden overclaim classes, content-boundary evidence, acceptance criteria 3 and 4 |
| Pages workflow | workflow evidence, external prerequisite status contract, acceptance criteria 5 |
| External Pages prerequisites | L0 missing-data rule, evidence GitHub Pages prerequisite fields, external status contract, `7e` handoff |
| Successor handoff | plan linkage, evidence successor handoff fields, acceptance criterion 7, exit notes |

### 0j) Scoped Invariants

| Invariant | Applies To | Does Not Apply To | Proof Surface | Deferred / External Surfaces | Reviewer Non-goals |
|---|---|---|---|---|---|
| Docs readiness must use generated output evidence, not source-only success | `pnpm docs:validate`, `docs/site-dist/**` route/content inspection | public Pages URL proof | evidence block and generated output audit | GitHub Pages activation, public URL | do not require Pages deployment in this task |
| Public availability must remain externally bounded | workflow inspection and prerequisite status recording | enabling Pages settings or proving public URL | workflow evidence and prerequisite table | GitHub repository settings | do not ask this task to mutate GitHub state |
| Docs must not overclaim successor proof | generated docs content | installed-package skill/UI execution | content overclaim audit | `7c` and `7d` | do not widen current acceptance to successor execution |
| Proof must not mutate global operator state | local docs validation and temporary inspection files | GitHub settings, npm registry, global skill dirs, long-lived UI service state | command transcript and cleanup notes | external setup | do not use external deploy as local proof |

### 0k) Review Scope Fence

| Edge-case Family | Why Not Required Now | Current Safe Behavior | If Discovered During Review | Route |
|---|---|---|---|---|
| GitHub Pages public URL proof | externally activated repository setting | record status only | missing/unknown remains NO-GO input | `7e-release-go-no-go` or external setup |
| Docs content/build defects | proof-only task cannot edit source | record blocker and stop | create follow-up docs implementation task | same plan scope follow-up |
| Full CLI reference generation | broader than release onboarding proof | current onboarding pages are enough if required routes exist | follow-up if onboarding blocked | follow_up |
| Docs search/versioned docs/custom domain | hardening beyond first release pilot | not required for readiness proof | record as hardening only | follow_up |
| Installed-package skill execution | successor task owns behavior proof | generated docs may describe current/manual boundaries only | execution failure belongs to successor proof | `7c-skill-install-proof` |
| Installed-package UI lifecycle execution | successor task owns behavior proof | generated docs may describe current UI boundaries only | execution failure belongs to successor proof | `7d-ui-lifecycle-proof` |

## L2 - Acceptance

### Required Checks

1. Run:

   ```bash
   pnpm docs:validate
   ```

2. Record Node, pnpm, npm, package name, and package version.
3. Inspect `docs/site-dist/**` for required generated pages.
4. Inspect generated docs output for required boundary signals and forbidden
   overclaims.
5. Verify `.github/workflows/docs-pages.yml`:
   - triggers on pushes to `main`,
   - triggers on GitHub release `published`,
   - supports `workflow_dispatch`,
   - runs `pnpm docs:validate`,
   - uploads `docs/site-dist`,
   - deploys through `actions/deploy-pages`,
   - declares Pages permissions,
   - uses the `github-pages` environment.
6. Record external GitHub Pages prerequisite statuses using the L1 status
   contract.
7. Record successor handoff evidence for `7e`.

### Suggested Local Proof Script Shape

The implementation may use an equivalent script or manual commands, but the
proof must preserve these safety properties:

```bash
set -euo pipefail

node --version
pnpm --version
npm --version
node -p "require('./package.json').name + ' ' + require('./package.json').version"

pnpm docs:validate

node - <<'NODE'
const fs = require("fs");
const required = [
  "docs/site-dist/index.html",
  "docs/site-dist/install.html",
  "docs/site-dist/upgrade.html",
  "docs/site-dist/cli-basics.html",
  "docs/site-dist/ui.html",
  "docs/site-dist/skills.html",
  "docs/site-dist/release.html",
  "docs/site-dist/pages.html",
];
const missing = required.filter((path) => !fs.existsSync(path));
console.log(JSON.stringify({ required, missing }, null, 2));
NODE
```

### Acceptance Criteria

1. `pnpm docs:validate` passes.
2. Required generated pages are present under `docs/site-dist/**`.
3. Generated docs output includes package identity, guarded release/publish
   boundary, manual/repo-local skill source boundary, UI boundary, and Pages
   external activation boundary.
4. Generated docs output does not claim public npm publish, public registry
   install proof, public Pages URL proof, installed-package skill execution
   proof, or installed-package UI lifecycle proof as complete in this task.
5. Pages workflow configuration matches the repo-local docs validation path and
   GitHub Pages artifact/deploy path.
6. Missing or unknown GitHub Pages external prerequisites are recorded as NO-GO
   or deferred values, not silently bypassed.
7. Evidence is sufficient for `7e` to consume docs readiness and Pages external
   activation status.

### Review Checklist

1. Does the task prove generated docs output rather than source-only docs?
2. Are route/page findings based on actual `docs/site-dist/**` contents?
3. Does content review distinguish current availability from successor-owned
   skill/UI/release proof?
4. Does the evidence avoid triggering Pages deploy or mutating GitHub settings?
5. Are external Pages prerequisites separated from repo-provided proof?
6. Does any discovered docs/source/workflow gap require a follow-up task before
   `7e` consumes docs readiness?
7. Does final evidence clearly state whether `7e` can consume the docs proof?

### Hardening Backlog

| Item | Priority | Timing | Notes |
|---|---|---|---|
| Public URL smoke | P1 | successor/external | Public Pages URL proof belongs after repository Pages activation, not this local proof task. |
| Docs search/versioned docs | P3 | later-hardening | Not required for first release readiness proof. |
| Reusable docs proof script | P2 | later-hardening | If repeated often, extract the route/content/workflow audit into a tool after this pilot proves the command shape. |

### Evidence

```yaml
docs_readiness_proof:
  checked_at: "2026-06-07T23:31:12+02:00"
  node_version: "v26.0.0"
  pnpm_version: "10.8.1"
  npm_version: "11.12.1"
  package_name: "@pairflow/cli"
  package_version: "0.1.0"

  docs_validate_command: "pnpm docs:validate"
  docs_validate_result: "passed"
  docs_build_command: "pnpm docs:build"
  generated_output_path: "docs/site-dist"
  docs_validate_notes:
    - "Built docs site in docs/site-dist: index.html, install.html, upgrade.html, cli-basics.html, ui.html, skills.html, release.html, pages.html."
    - "Docs site validation passed."
    - "Node emitted DEP0205 deprecation warnings for module.register(); non-blocking."

  generated_pages:
    required_present: true
    required_pages_present:
      - "docs/site-dist/index.html"
      - "docs/site-dist/install.html"
      - "docs/site-dist/upgrade.html"
      - "docs/site-dist/cli-basics.html"
      - "docs/site-dist/ui.html"
      - "docs/site-dist/skills.html"
      - "docs/site-dist/release.html"
      - "docs/site-dist/pages.html"
    missing_pages: []

  content_boundaries:
    html_files:
      - "docs/site-dist/cli-basics.html"
      - "docs/site-dist/index.html"
      - "docs/site-dist/install.html"
      - "docs/site-dist/pages.html"
      - "docs/site-dist/release.html"
      - "docs/site-dist/skills.html"
      - "docs/site-dist/ui.html"
      - "docs/site-dist/upgrade.html"
    package_identity_present: true
    guarded_publish_boundary_present: true
    manual_skill_source_boundary_present: true
    ui_lifecycle_boundary_present: true
    pages_external_activation_boundary_present: true
    public_pages_url_claim_absent: true
    npm_publish_ready_claim_absent: true
    public_registry_install_proven_claim_absent: true
    installed_skill_execution_claim_absent: true
    installed_ui_lifecycle_claim_absent: true
    global_skill_copies_source_claim_absent: true
    overclaim_findings: []

  workflow:
    workflow_file: ".github/workflows/docs-pages.yml"
    triggers_main_push: true
    triggers_release_published: true
    triggers_workflow_dispatch: true
    uses_docs_validate: true
    uploads_site_dist: true
    uses_upload_pages_artifact: true
    uses_deploy_pages: true
    pages_permissions_present: true
    environment_name: "github-pages"

  github_pages_prerequisites:
    pages_settings_status: "missing"
    github_pages_environment_status: "missing"
    repository_permissions_status: "present"
    public_url_status: "missing"
    public_availability_decision: "external_no_go"
    blocking_reason: "GitHub Pages is disabled, the github-pages environment is missing, and no public Pages URL exists. Repository Actions are enabled and the workflow requests Pages deploy permissions."
    handoff_to_7e: "7e must verify or enable GitHub Pages settings, github-pages environment/deploy activation, repository permissions, and public URL proof before claiming public docs availability."

  successor_handoff:
    usable_for_7e: true
    docs_regeneration_command: "pnpm docs:validate"

  cleanup:
    temporary_files_created: []
    cleanup_result: "not_needed"
```

### Exit Notes

1. If local docs readiness passes but Pages prerequisites are unknown or
   missing, this task may still close as docs-proof complete while public docs
   availability remains NO-GO until `7e` or external setup.
2. If docs validation or generated output proof fails, do not advance docs
   readiness to `7e`; record the repo-owned docs/build/workflow gap and route
   to a follow-up task.
3. If workflow inspection shows deploy can run from a different path than local
   docs validation, stop and route to a workflow-alignment follow-up.
