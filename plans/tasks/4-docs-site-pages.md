---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_docs_site_pages_v1
task_family_id: docs-site-pages
sequence_key: "4"
task_id: 4-docs-site-pages
title: "Static Documentation Site and GitHub Pages Publish"
status: approved
phase: phase4
target_files:
  - "package.json"
  - ".github/workflows/docs-pages.yml"
  - "tools/docs/buildDocsSite.ts"
  - "docs/site/**"
  - "docs/README.md"
  - "README.md"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 4-docs-site-pages-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Static Documentation Site and GitHub Pages Publish

## L0 - Policy

### Goal

Add a small static documentation site and GitHub Pages publish workflow for
Pairflow's npm install and onboarding path.

### Domain / Control Model Summary

1. Business invariant: users should be able to understand install, upgrade,
   version pinning, CLI basics, UI usage, skill installation, and release
   semantics from a public docs surface without weakening Pairflow lifecycle
   safety.
2. Control model: repo docs and package metadata own documented behavior;
   GitHub Actions owns Pages publication; GitHub repository settings own actual
   Pages activation.
3. Read-path rule: docs content must read install/package identity from the
   repo's accepted package and release authority surfaces, especially
   `package.json`, `README.md`, and
   `docs/commit-and-release-history-authority.md`.
4. Forbidden fallback: do not document unpublished commands or future
   capabilities as available; do not infer release or publish readiness from
   task prose, branch names, or local operator intent.
5. Allowed resolution path: when a documented surface is externally activated,
   state the repo-provided boundary and the external prerequisite instead of
   claiming end-to-end completion.
6. Missing-data rule: if GitHub Pages settings, repository permissions, or a
   final public URL are not known locally, the workflow must remain buildable
   and the docs must name the missing external setup plainly.
7. Phase boundary:
   - contract closure: consumes package/release/commit authority from previous tasks
   - producer closure: owns static docs source and build script
   - internal execution closure: owns local docs build command
   - workflow/orchestration closure: owns GitHub Pages workflow
   - read-model closure: owns generated static docs output shape
   - activation closure: externally activated by GitHub Pages settings
   - cleanup/recovery closure: limited to rerunnable build/publish failure guidance

### Plan Linkage

1. Parent plan gap closed: missing public onboarding/docs surface.
2. Depends on: `1-package-version`, `2c-commit-policy`, and
   `3-release-automation`.
3. Unlocks / impacts successors: informs `7-release-pilot` docs build and
   release-flow proof; must not implement `5-skills-install` or
   `6-ui-service-lifecycle`.
4. Task-list impact: creates the planned `4-docs-site-pages` task artifact.
5. Inherited validation / exit expectation: implementation should run the docs
   build/validation path, relevant focused checks for docs workflow shape, and
   the default repo validation needed for touched scripts/config.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `package.json`
   - `README.md`
   - `docs/README.md`
   - `docs/commit-and-release-history-authority.md`
   - `docs/commit-message-guidance.md`
   - `.claude/skills/INSTALL.md`
2. Canonical elements: package name `@pairflow/cli`, binary name `pairflow`,
   `package.json.version`, standard `v<semver>` release tags, guarded npm
   publish semantics, and repo-local Pairflow skill source-of-truth rules.
3. Guard elements: GitHub Pages workflow permissions, Pages environment,
   build artifact upload, and external repository settings.
4. Compat-only elements: source checkout install via `scripts/install.sh` may
   remain documented for contributors, but npm install is the public user path.
5. Forbidden reinterpretations: do not present real npm publish as already
   proven before `7-release-pilot`; do not treat global skill copies as source;
   do not document UI service lifecycle commands before `6-ui-service-lifecycle`.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `package.json` scripts and package metadata
   - existing `README.md` onboarding content
   - existing `docs/README.md` / docs tree
   - release authority docs from `3-release-automation`
2. Actual touched scope: activation/read-model plus workflow orchestration.
3. Mutation entrypoints in scope: package scripts, docs build script, static
   docs source files, and a GitHub Pages workflow.
4. Hidden scope ruled out: CLI runtime commands, skill install command
   implementation, UI lifecycle service commands, real npm publish, and GitHub
   repository setting changes remain successor or external work.
5. Branch inventory note: local docs build success/failure, Pages workflow
   configured/unconfigured, npm install command current/future, and guard-open/
   guard-closed release semantics must be represented.
6. Why the declared task shape matches reality: the task creates a public docs
   read model and publish workflow without changing Pairflow runtime behavior.

### Refactor Classification

1. Classification: N/A.
2. Classification triggers: this task adds docs/build/workflow surfaces rather
   than refactoring runtime architecture.
3. Preparatory modifier: no.
4. Test shape expectation: focused docs build/workflow checks plus repo
   validation appropriate for new tooling.
5. Public helper surface action: no runtime helper surface.

### Authority Boundary Map

1. Authority producer: existing package/release/skill docs produce truth; this
   task produces a docs read model from that truth.
2. Stored authority: source docs and package metadata remain canonical; built
   Pages output is generated/read-model content.
3. In-scope consumers: human/operator docs readers and GitHub Pages workflow.
4. Explicit out-of-scope consumers: CLI runtime, npm publish activation, skill
   install command implementation, UI service lifecycle implementation.
5. Export surfaces closed in this phase: yes, static public docs source and
   Pages publish workflow configuration.

### Baseline Preservation

1. Must-preserve behaviors: source checkout install docs remain available for
   contributors; existing CLI/UI/bubble lifecycle documentation remains
   truthful; release guard semantics from `3-release-automation` remain
   guarded.
2. Allowed resolution paths: docs may summarize existing repo authority and may
   link to deeper local docs for details.
3. Forbidden regression interpretations: do not replace detailed operator docs
   with public-site summaries; the site is an onboarding surface, not the sole
   authority.
4. Replacement proof required if removed: any removal of existing README/docs
   guidance must show equivalent or clearer coverage in the new docs surface.

### Success / Completion Proof Boundary

1. Current canonical success proof source: N/A; no docs site exists.
2. Target canonical success proof source: local docs build output plus GitHub
   Pages workflow configuration committed in the repo.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: docs build command passes and
   workflow YAML is syntactically valid/configured for Pages artifact upload.
5. Reused proof contract: release/publish guard wording inherited from
   `docs/commit-and-release-history-authority.md`.
6. Proof-parity rule: narrowed_here_with_proof.
7. Final truth surfaces affected: docs site pages and GitHub Pages workflow
   run output.
8. Mixed-truth surfaces allowed: external Pages URL/settings may remain
   external prerequisites.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: activation_or_read_model.
2. Secondary shape: consumer_family_alignment, limited to package scripts and
   workflow consume of the docs source.
3. Preconditions that must pass before side effects: docs build source exists,
   package script resolves, workflow uses repo-local build command, and Pages
   upload path is generated rather than manually committed.
4. Side effects forbidden before preconditions pass: no real npm publish, no
   GitHub settings mutation, no runtime command implementation.
5. Invalid/precondition-failure behavior: fail the local build or workflow job
   with a clear error.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add a static docs source structure for public onboarding pages.
2. Add a deterministic local docs build command and generated output directory.
3. Add GitHub Pages workflow configuration for build and artifact upload.
4. Cover install, upgrade, version pinning, CLI basics, UI usage, skills, and
   release semantics at onboarding depth.
5. Update `README.md` and/or `docs/README.md` only as needed to point to the
   docs site source/build path.

### Out of Scope

1. Implementing `pairflow skills install`.
2. Implementing `pairflow ui start|stop|status|restart`.
3. Opening real npm publish or proving first public publish.
4. Changing Pairflow bubble lifecycle behavior.
5. Adding a full docs framework unless the implementation proves it is the
   smallest maintainable path for the current package.

### Safety Defaults

1. Prefer static generated assets over runtime docs services.
2. Keep public docs accurate about deferred/external activation boundaries.
3. Fail closed when a docs build input or publish setting is missing.
4. Do not commit generated Pages output unless the implementation explicitly
   justifies it as source-controlled.

### Scoped Invariants

| Invariant | Applies To | Does Not Apply To | Proof Surface | Deferred / External Surfaces | Reviewer Non-Goals |
|---|---|---|---|---|---|
| Public docs must not overclaim release readiness | install/release/publish docs pages | actual npm publish pilot | docs content review, release authority anchor | `7-release-pilot`, npm/GitHub settings | judging npm org access |
| Docs build must be deterministic locally | package script, docs build tool, workflow build step | GitHub Pages domain availability | local build command and workflow YAML | repository Pages settings | visual design polish beyond onboarding usability |
| Skill source-of-truth must remain repo-local | skills docs page | future skill CLI implementation | `.claude/skills/INSTALL.md` coverage | `5-skills-install` | implementing skill install command |

### Review Scope Fence

| Edge-Case Family | Why Not Required Now | Safe Current Behavior | If Discovered During Review | Route |
|---|---|---|---|---|
| Custom domain / Pages settings | external repository configuration | workflow can build/upload artifact without claiming URL proof | document as external prerequisite | external |
| Full CLI reference generation | broader docs/read-model work than onboarding pages | link to existing README/CLI docs where needed | follow-up if onboarding is blocked | follow_up |
| Docs search/versioned docs | not required for first public onboarding surface | static pages remain readable | follow-up hardening | follow_up |
| UI service lifecycle commands | successor task owns implementation | document only current supported foreground UI behavior | route back if docs need future commands | route_back_to_plan |

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: no.
2. Impacted contracts: no runtime/API/config contract changes are introduced,
   but the docs site mirrors existing package, release, skill-source, UI, and
   Pages activation contracts. Those mirrored contracts are governed by the
   compact matrix below.

### Canonical Documentation Contract Matrix

| Contract | Source Anchor | Docs-Site Required Statement | Forbidden Statement | Successor / External Owner |
|---|---|---|---|---|
| Package install | `package.json`, parent plan | Public package is `@pairflow/cli`; command is `pairflow`; npm install is the intended user-facing path once released | Any legacy CLI alias, registry-state inference, or duplicate version authority | `7-release-pilot` proves public install |
| Release and npm publish | `docs/commit-and-release-history-authority.md`, `CHANGELOG.md` | Release automation and publish workflow are guarded; real publish remains deferred until the pilot opens it | Claiming public publish readiness or a published version before pilot proof | GitHub/npm settings and `7-release-pilot` |
| Skill installation | `.claude/skills/INSTALL.md` | Current supported path is the repo-local install workflow; repo-local `.claude/skills/**` is source of truth and global copies are derived | Claiming `pairflow skills install` exists before successor implementation | `5-skills-install` |
| UI usage | `README.md`, `src/cli/commands/ui/server.ts` | Current supported UI path is foreground `pairflow ui` and existing repo helper scripts; background lifecycle CLI is future work | Recasting pnpm helper scripts as the future Pairflow-owned lifecycle CLI, or documenting `pairflow ui start|stop|status|restart` as available | `6-ui-service-lifecycle` |
| GitHub Pages | task workflow output | Repo provides build/publish workflow and generated artifact; repository Pages settings/domain remain external activation | Claiming a public URL is proven by local build alone | GitHub repository settings |

### Mirrored Surface Checklist

1. Install, upgrade, and version-pinning pages must mirror the package install
   row and avoid legacy alias or registry-state claims.
2. Release semantics page must mirror the guarded publish row and explicitly
   defer public publish proof to `7-release-pilot`.
3. Skill page must mirror the current manual install policy and label
   `pairflow skills install` as successor-owned future work.
4. UI page must mirror current foreground `pairflow ui` behavior and preserve
   existing README/operator detail; it must not describe future service
   lifecycle commands as available.
5. Pages/deploy docs must mirror the external-activation row by separating
   local build/workflow proof from repository Pages settings and public URL
   proof.
6. README/docs index updates must point to the site source/build path without
   deleting detailed operator guidance unless equivalent coverage remains.

### Gate Detail Budget

| Gate | Detail Level | Evidence / Reason |
|---|---|---|
| Control-Model Readiness Gate | triggered_low_risk | Docs must distinguish repo-provided docs/build truth from external Pages activation. |
| Closed-Contract Drift Check | triggered_low_risk | Public docs summarize package/release/skill authority without changing it. |
| Capability Closure Gate | triggered_split_or_contract_risk | GitHub Pages is externally activated; claims must not imply local proof of public URL. |
| Target-File Reality Check | triggered_low_risk | Existing repo has README/docs but no docs site config. |
| Authority Fan-out Scan | triggered_low_risk | Docs read model consumes package/release/skill authority. |
| Closure-Budget Gate | triggered_low_risk | Read-model/workflow orchestration are adjacent and share one proof surface. |
| Bounded-Task-Shape Gate | triggered_low_risk | Primary shape is activation/read-model. |
| Scoped Invariant Gate | triggered_low_risk | Overclaim and deterministic-build invariants are scoped above. |
| Complexity-Risk Gate | triggered_low_risk | Medium external activation risk, bounded implementation scope. |
| Refactoring Guidance Gate | not_triggered | No refactor requested or implied. |
| Contract-Dense Task Gate | triggered_low_risk | Docs mirror several existing contracts; compact matrix and mirrored checklist above bound the drift risk without changing runtime semantics. |

### Complexity Risk Gate

1. `authority_risk`: 1
2. `surface_spread`: 1
3. `identity_join_risk`: 0
4. `activation_coupling`: 2
5. `prerequisite_risk`: 1
6. `acceptance_multiplicity`: 1
7. `risk_score`: 6
8. `single-task allowed`: yes
9. If `no`, required split: N/A
10. Identity/join note:
   - canonical identity path: package docs name `@pairflow/cli` and binary
     `pairflow` from `package.json`
   - competing identifiers or fallback identities: legacy public aliases are
     not documented
11. Authority/source-of-truth note:
   - canonical source: package metadata plus release/skill authority docs
   - forbidden secondary sources: task prose, generated Pages output, global
     skill copies, npm registry lookups
12. Closure-budget triage:
   - closure buckets touched: read_model_consumers, workflow_orchestration_consumers
   - intentionally collapsed closures: docs source/build and Pages workflow,
     because one static build artifact validates both
   - explicitly deferred closures: public URL proof, real release pilot,
     skill-install command, UI service lifecycle command docs
13. Bounded-task-shape decision:
   - primary shape: activation_or_read_model
   - secondary shape: consumer_family_alignment
   - decomposed closures: static docs content, local docs build, Pages workflow
   - adjacent call-site/consumer-family scan: CLI/runtime consumers absent by
     scope; GitHub Pages workflow present; package script consumer present
   - why this bounded mix is safe: it adds a generated static read model and
     its publish workflow without changing runtime behavior
14. Scoped-invariant decision:
   - gate triggered: yes
   - scoped invariant records: `Scoped Invariants`
   - unbounded invariant route-back: no
15. Review-scope-fence decision:
   - fence needed: yes
   - fenced families: custom domain, full CLI reference generation, search,
     UI lifecycle future commands
   - invalid fence route-back: no
16. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: downstream consumers and mirrored surfaces for existing
     package/release/skill/UI/Pages contracts
   - canonical matrix source: `Canonical Documentation Contract Matrix`
   - mirrored surfaces: install/upgrade/version pages, release semantics page,
     skills page, UI page, Pages/deploy docs, README/docs index pointers

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Public docs improve onboarding without weakening safety claims | Docs must preserve explicit lifecycle gates and guarded release language | P1 | required-now |
| Control model | Repo source docs/package metadata decide documented truth; GitHub owns Pages activation | Build from repo content and state external setup separately | P1 | required-now |
| Read-path rule | Read package identity/version semantics from package/release authority docs | Do not duplicate conflicting package names or release state | P1 | required-now |
| Forbidden fallback | Do not infer future commands, publish readiness, or public URL proof from task prose | Keep deferred/external capabilities labeled | P1 | required-now |
| Allowed resolution path | Link to deeper docs when onboarding pages need detail | Avoid copying large policy sections into every page | P2 | required-now |
| Missing-data rule | Missing Pages settings or URL is an external prerequisite, not a local success failure | Workflow can still build/upload artifact; docs name setup need | P1 | required-now |
| Phase boundary | This task owns docs site and Pages workflow only | Successor tasks own skill CLI, UI lifecycle, and release pilot proof | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Package identity | `package.json` | Public package is `@pairflow/cli`, command is `pairflow` | Preserve in docs | P1 | required-now |
| Release guard | `docs/commit-and-release-history-authority.md` | Real npm publish remains guarded until pilot opens it | Preserve in docs | P1 | required-now |
| Skill source | `.claude/skills/INSTALL.md` | Repo-local skills are source; global copies are derived; current install path is the manual install workflow | Preserve in docs and mark `pairflow skills install` as successor-owned future work | P1 | required-now |
| UI lifecycle | `README.md`, `src/cli/commands/ui/server.ts` | Current supported UI behavior is foreground `pairflow ui`; repo helper scripts are not the future Pairflow-owned lifecycle CLI | Preserve current UI docs and do not document future service commands as available | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Existing README/docs and package scripts define current docs surface | Implementation should add, not replace, detailed docs unless equivalent | P1 | required-now |
| Actual touched scope | Static docs read-model plus Pages workflow | No runtime behavior changes required | P1 | required-now |
| Mutation entrypoints in scope | `package.json` scripts and `.github/workflows/docs-pages.yml` | Validate scripts/workflow shape | P1 | required-now |
| Hidden scope ruled out | Skill CLI, UI lifecycle, npm publish pilot are successor-owned | Review should not widen task to implement them | P1 | required-now |
| Branch inventory note | local build pass/fail, workflow activation configured/unconfigured | Acceptance must check both local build and workflow config | P1 | required-now |
| Shape proof | One generated static artifact validates source and workflow consume path | Single implementation bubble is bounded | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Missing public onboarding/docs surface | Add initial docs site pages and publish workflow | P1 | required-now |
| Depends on | `1-package-version`, `2c-commit-policy`, `3-release-automation` | Use established package and release semantics | P1 | required-now |
| Unlocks / impacts successors | `7-release-pilot` consumes docs build proof | Record validation evidence for pilot | P2 | required-now |
| Task-list impact | Creates planned task `4-docs-site-pages` | Plan tracker must point to this artifact | P1 | required-now |
| Inherited validation / exit expectation | Docs build and relevant repo validation | Include exact commands in implementation evidence | P1 | required-now |

### 1) Required Behavior

| Requirement | Rule | Priority | Timing |
|---|---|---|---|
| Static docs source | Add public docs pages covering install, upgrade, version pinning, CLI basics, current UI usage, current manual skill installation, and release semantics | P1 | required-now |
| Local build | Add a deterministic package script that builds the docs site into a generated output directory | P1 | required-now |
| Pages workflow | Add a GitHub Pages workflow that builds the site and uploads/deploys the generated artifact | P1 | required-now |
| Accurate activation claims | Mark GitHub Pages settings/domain and real npm publish as external/deferred where applicable | P1 | required-now |
| Existing docs continuity | Keep README/docs pointers coherent and avoid deleting detailed operator docs without replacement | P2 | required-now |
| Generated output policy | Do not commit generated site output unless explicitly justified | P2 | required-now |

### 2) Acceptance Checks

1. `pnpm docs:build` or the chosen docs build command succeeds locally.
2. The generated docs output contains pages or routes for install, upgrade,
   version pinning, CLI basics, current foreground UI usage, current manual
   skill installation policy, and guarded release semantics.
3. The Pages workflow uses the same local build command and deploys the
   generated output artifact.
4. Docs text does not claim real npm publish or public Pages URL proof before
   external activation.
5. Docs text does not claim `pairflow skills install` or
   `pairflow ui start|stop|status|restart` are available before their successor
   tasks implement them.
6. README and/or docs index points operators to the docs site source/build
   without obscuring existing detailed docs or recasting existing pnpm helper
   scripts as future Pairflow-owned UI lifecycle commands.
7. Run `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, focused docs
   workflow/build validation, `pnpm test`, and `pnpm build`, unless the
   implementation bubble records a precise skipped-step reason.

## L2 - Notes

1. A static generated site is preferred for the first docs surface because it
   minimizes new runtime dependencies and keeps publication owned by GitHub
   Pages.
2. If the implementation chooses a docs framework, it must justify the added
   dependency and prove package/build boundaries still stay narrow.
3. The initial site may be plain and operational; visual polish, search,
   versioned docs, and custom domains are later hardening.
