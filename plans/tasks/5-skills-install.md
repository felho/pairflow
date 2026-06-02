---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_skills_install_v1
task_family_id: skills-install
sequence_key: "5"
task_id: 5-skills-install
title: "Pairflow Skills Install CLI"
status: in_progress
phase: phase5
target_files:
  - "package.json"
  - "src/cli/index.ts"
  - "src/cli/commands/skills/**"
  - "src/v11/application/skills/**"
  - "src/v11/infrastructure/skills/**"
  - "tests/cli/skillsInstallCommand.test.ts"
  - "tests/cli/index.test.ts"
  - "tests/core/skills/**"
  - ".claude/skills/INSTALL.md"
  - "README.md"
  - "docs/site/pages/skills.md"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 5-skills-install-doc
impl_bubble_id: 5-skills-install-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Pairflow Skills Install CLI

## L0 - Policy

### Goal

Add a supported `pairflow skills install` CLI command that installs Pairflow's
repo-local skills into explicit global agent skill directories, with dry-run and
JSON output, while preserving repo-local `.claude/skills/**` as the only source
of truth.

### Domain / Control Model Summary

1. Business invariant: operators should be able to install or refresh Pairflow
   skills from the CLI without treating global installed copies as source.
2. Control model: the selected source root owns skill content; the CLI owns
   option parsing, validation, filesystem side effects, and reporting; the
   user's filesystem owns whether target directories are writable.
3. Read-path rule: source skills are read from the installed package when
   available, or from the repo-local `.claude/skills/**` tree when running from
   a source checkout. The selected source root must be explicit in the command
   result.
4. Forbidden fallback: do not copy from `~/.claude/skills` or
   `~/.codex/skills` as source, do not infer source from the current working
   directory when a package-relative source root is available, and do not create
   broad writes outside the selected target root.
5. Allowed resolution path: source checkout and installed-package execution may
   use different verified source-root candidates, but both must end at the same
   source skill directory shape and supported skill allowlist.
6. Missing-data rule: if the package does not include the skill source files,
   or if the target directory cannot be written, the command must fail closed
   with clear operator guidance and no partial success claim.
7. Phase boundary: this task owns skill-install CLI behavior only. It must not
   implement UI service lifecycle commands, release pilot publication, or change
   Pairflow bubble lifecycle semantics.
8. Document-refinement boundary: this document bubble may refine only task,
   plan, progress, and directly related docs artifacts. L2 implementation
   sketches, target files, acceptance checks, and reviewer code findings in
   this artifact are planning context for a later implementation bubble; they
   do not authorize product/runtime/source edits during a
   `review_artifact_type=document` pass.

### Plan Linkage

1. Parent plan gap closed: supported CLI path for skill installation.
2. Depends on: `1-package-version`.
3. Unlocks / impacts successors: `7-release-pilot` must prove installed-package
   skill source availability, dry-run behavior, and at least one real install
   into an isolated target.
4. Task-list impact: after this task is implemented and archived, the parent
   plan should advance to `6-ui-service-lifecycle`.
5. Inherited validation / exit expectation: run default repo validation for CLI
   source changes plus focused skill-install unit/integration tests and package
   content inspection when package file allowlists change.
6. Document-refinement impact: this pass tightens the approved task contract for
   later implementation without changing product/runtime/source behavior.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/INSTALL.md`
   - `.claude/skills/UsePairflow/**`
   - `.claude/skills/CreatePairflowSpec/**`
   - `.claude/skills/ExecutePairflowPlan/**`
   - `package.json`
   - `src/cli/index.ts`
2. Command surface to create:
   - `pairflow skills install`
   - `--skills all|UsePairflow|CreatePairflowSpec|ExecutePairflowPlan[,<name>...]`
   - `--target-dir .claude|.codex`
   - `--link-other`
   - `--force`
   - `--dry-run`
   - `--json`
   - `--help`
3. Canonical supported skills: `UsePairflow`, `CreatePairflowSpec`,
   `ExecutePairflowPlan`.
4. Canonical default target: `.claude`, matching the repo-local install policy.
5. Canonical target root: `$HOME/<target-dir>/skills`.
6. Canonical source rule: repo-local skill files are source in a checkout;
   packaged skill files are source in an installed npm package; global skill
   directories are derived targets only.
7. Packaging rule: if the command can run from the npm package, the package
   contents must include the selected source skills and any required install
   support files.

### Scope Reality / Shape Proof

1. Existing CLI dispatch is centralized in `src/cli/index.ts` with command
   groups such as `bubble`, `repo`, `metrics`, and `plan`.
2. Existing install policy is documentation-only in `.claude/skills/INSTALL.md`
   and uses a shell workflow around `rsync -a --delete`.
3. Existing package `files` allowlist includes `dist/**`, `ui/dist/**`, and
   `README.md`; this task may need to package skill source files explicitly.
4. Mutation entrypoints in scope: CLI command parser/dispatcher, skill install
   application/infrastructure helpers, package file allowlist, focused tests,
   and onboarding docs that currently say the CLI command is future work.
5. Hidden scope ruled out: modifying skill source content, changing global
   source-of-truth policy, implementing release publish, adding UI lifecycle
   commands, or editing global installed skill directories during tests.

### Refactor Classification

1. Classification: feature with bounded CLI/filesystem side effects.
2. Classification triggers: new public CLI command group, package content
   boundary, filesystem copy/symlink behavior, and JSON/text result contracts.
3. Architecture checks: use typed application/infrastructure boundaries for
   source discovery, option parsing, filesystem operations, and rendering.
4. Public helper surface action: allowed only for the narrow command behavior;
   avoid promoting helpers into `shared` unless multiple existing lanes consume
   them.

### Authority Boundary Map

1. Authority producer: repo-local or package-local skill source root.
2. Stored authority: `.claude/skills/**` source files in the repo/package.
3. In-scope consumers: `pairflow skills install`, operator docs, release pilot.
4. Explicit out-of-scope consumers: bubble lifecycle, document/task spec
   workflows, UI server lifecycle, npm publish activation.
5. Export surfaces closed in this phase: CLI command output and package skill
   source availability for installation.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger | Repo-Provided Parts | External Prerequisites | Success Output Contract | Failure Output Contract | Last-Mile Proof |
|---|---|---|---|---|---|---|---|
| Install all Pairflow skills into an explicit agent dir | end_to_end | `pairflow skills install --skills all --target-dir .claude` | CLI command, source discovery, allowlist validation, copy/sync implementation | write permission to target root | text summary names source root, target root, installed skills, link setting, dry-run false | non-zero exit and clear missing-source/permission/invalid-option reason | focused install test with isolated HOME |
| Preview installation without writes | end_to_end | `pairflow skills install --dry-run --json` | dry-run planner and JSON renderer | none beyond readable source root | JSON reports planned source/target/link operations with no filesystem writes | non-zero JSON/text error for invalid args or missing source | focused dry-run test proves target untouched |
| Link the other agent directory | end_to_end | `pairflow skills install --target-dir .claude --link-other` | symlink planning, preflight validation, and replacement behavior | target and other target root writable | summary reports other root and symlink targets | fail closed before partial success when any selected destination or opposite-agent link path is unsafe and cannot be replaced according to policy | isolated HOME test verifies symlink target |
| Run from installed package | externally_activated | npm-installed `pairflow skills install` | package includes skill source files and command logic | package installed from npm or packed tarball | source root resolves package-local skills | clear missing packaged skills guidance | `7-release-pilot` package install proof |

### In Scope

1. Add `pairflow skills install` command routing and help.
2. Implement typed parsing for `--skills`, `--target-dir`, `--link-other`,
   `--dry-run`, and `--json`.
3. Validate skill names against the canonical allowlist.
4. Resolve source root from package/source-checkout candidates without using
   global installed copies as source.
5. Sync selected skill directories to `$HOME/.claude/skills` or
   `$HOME/.codex/skills`, preserving deletion semantics equivalent to
   `rsync -a --delete`.
6. Optionally replace the opposite agent directory skill path with a symlink to
   the selected target when `--link-other` is set.
7. Provide deterministic text and JSON output.
8. Add focused tests using isolated temp HOME/target roots.
9. Update docs that currently describe the command as future work.
10. Update package contents if needed so installed packages contain skill source
    files for the command.

### Out of Scope

1. Editing the actual skill contents beyond docs needed to describe the CLI.
2. Treating `~/.claude/skills` or `~/.codex/skills` as source.
3. Installing arbitrary third-party skills.
4. Implementing plugin marketplace behavior.
5. Implementing `pairflow ui start|stop|status|restart`.
6. Proving public npm publish or package install end-to-end; successor
   `7-release-pilot` owns public release proof.

### Safety Defaults

1. Default to `.claude` target and `--link-other=false`.
2. `--dry-run` must not create target directories, remove paths, copy files, or
   write symlinks.
3. Real install must fail before destructive replacement when an existing path
   cannot be safely replaced according to the documented policy, unless
   `--force` is explicitly present for the unsafe replacement branch.
4. JSON output must be machine-readable and must not mix human prose on stdout
   for success results.
5. Text output should match the summary shape in `.claude/skills/INSTALL.md`.

## L1 - Contract

### 0a) Canonical Contract Preservation

| Surface | Preserved Contract | Required Behavior | Priority | Status |
|---|---|---|---|---|
| Skill source-of-truth | Repo-local `.claude/skills/**` remains source in checkout; global copies are derived | Source discovery must never choose global targets | P1 | required-now |
| Supported skills | `UsePairflow`, `CreatePairflowSpec`, `ExecutePairflowPlan` | Unknown names rejected before writes | P1 | required-now |
| Target dirs | `.claude` and `.codex` only | Other values rejected before writes | P1 | required-now |
| Package install story | npm-installed CLI can install packaged skills | Package allowlist includes required skill files or command fails closed | P1 | required-now |
| Existing manual policy | `.claude/skills/INSTALL.md` summary and semantics | CLI mirrors or explicitly narrows documented behavior | P1 | required-now |
| Document bubble guard | `review_artifact_type=document` is docs-only | Document refinement cannot implement CLI/source/runtime changes | P1 | required-now |

### 0b) Branch Inventory

| Branch | Expected Behavior | Risk If Wrong | Test / Proof |
|---|---|---|---|
| `--skills all` | Installs all supported skills in stable order | Missing skill content | unit/integration test with isolated source |
| Comma skill list | Trims and validates each name | Silent partial install | parser tests |
| Invalid skill | Non-zero before writes | Unexpected writes | dry-run/write guard test |
| Invalid target | Non-zero before writes | Writes outside policy | parser test |
| Dry run text | Reports planned operations without writes | Misleading preview | dry-run integration test |
| Dry run JSON | Structured success object only on stdout | Broken automation | JSON parse test |
| Real copy | Destination mirrors source including deletion | Stale global skill files | isolated HOME sync test |
| Link other | Other agent skill path becomes symlink to selected target | Broken derived copy policy | symlink test |
| Existing non-symlink other path | Replacement follows documented policy, reports `replaced_existing` when forced, or fails clearly | Data loss ambiguity | isolated temp test |
| Missing package source | Non-zero with clear guidance | False install success | source resolver test |
| Existing selected target skill directory | Refreshes selected skill path only | Stale or over-broad writes | isolated HOME sync/update test |
| Unsafe existing selected target path without `--force` | Non-zero before replacing a non-directory or otherwise unsafe managed path | Accidental data loss | stale-target failure test |
| Unsafe existing selected target path with `--force` | Replaces only selected managed skill paths and reports `replaced_existing` | Unbounded destructive write | force-scoped replacement test |

### 0c) Precondition And Side-Effect Boundary

| Precondition | Side Effect Allowed Only After | Failure Behavior |
|---|---|---|
| Args parse and validate | Any filesystem write | Print/return validation error, exit non-zero |
| Source root exists and contains every selected skill | Target directory creation/copy | Print/return missing source error, exit non-zero |
| Target dir is `.claude` or `.codex` | Target root write | Reject before writes |
| Dry-run is false | mkdir/copy/delete/symlink | When true, report plan only |
| Link-other target is derived from selected target | Symlink replacement | Reject impossible target pairing |
| Every selected target skill path and selected opposite-agent link path is preflighted | Any copy, delete, mkdir, or symlink write | Fail before partial success when an unsafe path cannot be replaced |
| Unsafe existing skill/link path is detected | Replacement of that path | Require `--force` or fail before writes |

### 0d) Canonical Contract Matrix

| Contract Element | Classification | Owner | Required Behavior | Mirrored Surfaces |
|---|---|---|---|---|
| Command group | canonical | CLI dispatch | `pairflow skills install` is the only command added here | command surface, T1, T7 |
| Supported skill names | canonical | repo skill source | Only `UsePairflow`, `CreatePairflowSpec`, and `ExecutePairflowPlan` are accepted | L0 anchors, data contract, tests |
| Source root | canonical | package/source checkout | Use verified package-local or repo-local `.claude/skills`; never global installed dirs | control model, capability closure, source resolver tests |
| Target root | canonical | CLI option parser | `$HOME/<.claude|.codex>/skills` only | command options, data contract, install tests |
| Dry run | guard | CLI execution | Plan operations without creating, copying, deleting, or linking | safety defaults, T2 |
| Link-other | canonical with guard | CLI execution | Create per-skill symlinks in the opposite agent dir only for selected skills; never replace the whole opposite `skills` root | INSTALL.md parity, T5 |
| Force replacement | guard | CLI execution | Existing selected target directories may be refreshed; replacing non-directory selected target paths or non-symlink selected opposite-agent link paths requires `--force`; force is scoped to selected per-skill target/link paths only | branch inventory, precondition table, T8/T9 |
| Package skill files | canonical package boundary | package manifest | Package contents include required skill source files when command is shipped | package file allowlist, T6, release pilot |
| Installed-package execution proof | deferred activation | `7-release-pilot` | This task proves package contents; pilot proves npm/tarball installed execution | capability closure, acceptance checks |
| Output contract | canonical | CLI renderer | Text summary and JSON fields identify source, target, skills, dry-run, link, status, operations | output contract, tests |

### 0e) Ownership And Deferred Semantics

1. This task owns command behavior, package content inclusion, local source
   checkout execution, dry-run behavior, isolated real install behavior, and
   package-content inspection.
2. `7-release-pilot` owns last-mile proof that an npm-installed or packed CLI
   can run `pairflow skills install` from package-local skill files.
3. This task may add package files needed for that proof, but it must not claim
   public npm publish or installed-package runtime proof as complete.
4. The manual `.claude/skills/INSTALL.md` workflow remains a source policy
   anchor. The CLI may intentionally narrow unsafe replacement by requiring
   `--force` before replacing existing non-symlink paths.
5. Package-content inspection in this task is necessary but not sufficient for
   installed-package runtime proof. A passing `npm pack --dry-run --json`
   package file check only proves that source files are included; the successor
   release pilot must still execute the command from the installed or packed
   package layout before claiming last-mile npm-install readiness.

### 0f) Mirrored Surface Checklist

| Surface | Must Mirror | Review Trigger |
|---|---|---|
| L0 command surface | options, defaults, source/target authority | option added or removed |
| Branch inventory | every command branch and unsafe replacement branch | parser or filesystem behavior changes |
| Precondition boundary | write gates and dry-run/force ordering | side-effect ordering changes |
| Data contract | option/result shape | structured output changes |
| CLI output contract | text/JSON fields | renderer changes |
| Safety defaults | dry-run, force, global-source ban | replacement/source behavior changes |
| Test matrix | every required branch and package proof | acceptance check changes |
| Acceptance checks | task-owned vs pilot-owned proof | capability boundary changes |

### 0g) Data Contract

```ts
type SkillInstallTargetDir = ".claude" | ".codex";
type PairflowSkillName =
  | "UsePairflow"
  | "CreatePairflowSpec"
  | "ExecutePairflowPlan";

interface SkillsInstallPlan {
  sourceRoot: string;
  targetRoot: string;
  targetDir: SkillInstallTargetDir;
  selectedSkills: PairflowSkillName[];
  dryRun: boolean;
  force: boolean;
  linkOther: boolean;
  otherRoot?: string;
  status: SkillsInstallStatus;
  operations: SkillsInstallOperation[];
}

type SkillsInstallOperation =
  | { kind: "sync_skill"; skill: PairflowSkillName; source: string; destination: string }
  | { kind: "link_other"; skill: PairflowSkillName; linkPath: string; target: string };

type SkillsInstallStatus =
  | "planned"
  | "fresh_install"
  | "updated_existing"
  | "replaced_existing";
```

### 0h) CLI Output Contract

Text success output must include:

1. source root
2. target root
3. installed or planned skills
4. dry-run true/false
5. force true/false
6. link-other true/false
7. other root or `n/a`
8. status: planned, fresh install, updated existing, or replaced existing

JSON success output must include the same values as fields, plus operation
records. The JSON `status` field must use the `SkillsInstallStatus` enum tokens
exactly: `planned`, `fresh_install`, `updated_existing`, or
`replaced_existing`. Text output may render those statuses as human-readable
labels, but JSON must not use spaced labels. On error, JSON mode may return a
structured error object if consistent with existing CLI conventions; otherwise
stderr plus non-zero is acceptable if tests pin the behavior.

Status semantics:

1. `planned`: dry-run only; no target directories, copies, deletions, or links
   were written.
2. `fresh_install`: every selected destination skill path was absent before the
   real install, no opposite-agent symlink path was updated, and the selected
   paths were created by the command.
3. `updated_existing`: at least one selected destination skill directory already
   existed and was refreshed by the command, or at least one opposite-agent
   symlink path already existed and was updated by `--link-other`. Existing
   directories at selected skill paths and existing symlinks at opposite-agent
   paths are normal derived install targets, not automatically unsafe
   replacement branches.
4. `replaced_existing`: the command used `--force` to replace at least one
   unsafe selected managed path or unsafe opposite-agent path. This status takes
   precedence over `fresh_install` and `updated_existing` whenever any forced
   replacement operation occurred.

### 0i) Closure-Budget Gate

| Closure Bucket | Status | Evidence / Boundary |
|---|---|---|
| authority_producer | present | package/source-checkout skill source root produces installed content |
| persisted_authority | present | `.claude/skills/**` and packaged skill files are stored authority |
| shared_contract | present | command/result/source-root and force semantics are shared CLI/package contracts |
| internal_execution_consumer | present | CLI parser, installer, filesystem adapter, and renderer consume the contract |
| workflow_orchestration_consumer | absent | no Pairflow lifecycle behavior changes |
| external_integration_consumer | present | global agent skill dirs are external filesystem targets |
| read_model_consumer | present | README/docs/site skills page consume the command contract |
| successor_task_consumer | present | `7-release-pilot` consumes package-content and install proof expectations |
| unknown | absent | no unknown consumer bucket remains after target-file scan |

Intentionally collapsed closures: CLI dispatch, option parsing, source
discovery, filesystem sync/link, package file allowlist, output rendering, docs
update, and focused tests remain one task because they close one operator
capability and are validated by the same command-level proof surface.

Explicitly deferred closures: public npm publish and installed-package runtime
execution proof are deferred to `7-release-pilot`; UI service lifecycle is
deferred to `6-ui-service-lifecycle`.

Split decision: `split_required=false`; `single_task_allowed=yes`.
Implementation-closure proof: all required behavior is reachable through
`pairflow skills install` and package-content inspection, the same isolated
HOME tests exercise filesystem side effects, and no separate reviewer feedback
loop is expected for package allowlist, docs, or CLI dispatch once command
contract tests pass.

### 0j) Bounded-Task-Shape Gate

| Field | Decision |
|---|---|
| Primary shape | activation_or_read_model |
| Secondary shape | consumer_family_alignment |
| Decomposed closures | command dispatch, parser, source resolver, filesystem sync/link, renderer, package allowlist, docs update, tests |
| Adjacent consumer scan | CLI dispatch in `src/cli/index.ts`, package files in `package.json`, docs/read consumers in README/docs/site, release pilot in parent plan |
| Unknown consumers | none |
| Shape mix safety | all touched consumers consume the same command/source/output contract |
| Split trigger | not triggered after force boundary is explicit |
| Final decision | one implementation task |

### 0k) Complexity-Risk Gate

| Field | Value |
|---|---|
| risk_score | medium |
| authority_risk | medium: source root and package content authority must not drift |
| surface_spread | medium: CLI, app/infrastructure helpers, package allowlist, tests, docs |
| identity_join_risk | low: skill names and target dirs are fixed allowlists |
| activation_coupling | medium: package-installed proof is successor-owned |
| prerequisite_risk | low: source skills already exist |
| acceptance_multiplicity | medium: parser, dry-run, real install, link, package proof |
| authority_fanout | present but bounded to command consumers |
| split_decision | no split |
| single_task_allowed | yes |
| implementation_closure_proof | one command contract and isolated HOME/package-content tests close all required-now surfaces |

### 0l) Test Matrix

| ID | Scenario | Required Proof |
|---|---|---|
| T1 | `--help` | help includes command options and defaults |
| T2 | `--dry-run --json --skills all --target-dir .claude` | JSON parses and target root remains absent |
| T3 | `--skills UsePairflow,ExecutePairflowPlan` | only selected skill dirs copied |
| T4 | invalid skill/target | non-zero before writes |
| T5 | `--link-other` | symlink points to selected target skill dir; updating an existing opposite-agent symlink reports `updated_existing` |
| T6 | package file allowlist | `npm pack --dry-run --json` or equivalent proves skill source files included |
| T7 | CLI dispatch | `pairflow skills install --help` routes through `src/cli/index.ts` |
| T8 | unsafe existing managed path without `--force` | non-zero before any copy, delete, mkdir, or symlink write |
| T9 | unsafe existing managed path with `--force` | replacement is scoped to selected per-skill target/link path, preflight completes before writes, and status reports `replaced_existing` |
| T10 | existing selected target skill directory | command refreshes the selected skill directory and reports `updated_existing` |

## L2 - Implementation Notes

1. Prefer a small command module under `src/cli/commands/skills/install.ts`
   plus application/infrastructure helpers under `src/v11/.../skills` if the
   filesystem logic would otherwise make the CLI module too broad.
2. Use Node filesystem APIs for copy/symlink behavior; do not shell out to
   `rsync` unless the implementation proves portability and failure reporting
   remain acceptable.
3. Resolve `$HOME` through an injectable environment/current-user boundary in
   tests so isolated temp directories can be used.
4. Consider adding `.claude/skills/**` and `.claude/skills/INSTALL.md` to
   `package.json.files`; exclude unrelated repo-local `.claude` data.
5. Keep installed-package and source-checkout source-root resolution covered by
   tests or package dry-run evidence.
6. Update `docs/site/pages/skills.md` so it no longer says the CLI command is
   future work after implementation lands. Do not change the page to claim the
   command exists before the implementation bubble actually adds the command.
7. Run `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, focused skills
   install tests, `pnpm test`, `pnpm build`, and package dry-run/package content
   inspection before closing the implementation bubble.

## Acceptance Checks

1. `pairflow skills install --help` documents the command and options.
2. `pairflow skills install --dry-run --json` returns parseable structured
   output and performs no writes.
3. Real install into an isolated temp HOME copies the selected skill directories
   from the verified source root.
4. `--link-other` creates or updates per-skill symlinks in the opposite target
   directory according to policy; updating an existing opposite-agent symlink is
   reflected in the single text/JSON `status` field as `updated_existing`.
5. Invalid skills and target dirs fail before filesystem writes.
6. Unsafe existing skill/link paths fail without `--force` and are replaced
   only at selected per-skill managed paths with `--force`: selected target
   skill paths and, when `--link-other` is set, selected opposite-agent link
   paths. Any forced replacement is reflected in the single text/JSON `status`
   field as `replaced_existing`. The implementation must preflight all selected
   target skill paths and selected opposite-agent link paths before any copy,
   delete, mkdir, or symlink write, so an unsafe later `--link-other` path cannot
   leave a partial primary-target install.
7. The package content boundary includes every skill source file required by an
   installed npm package to run the command, with the package-content proof
   clearly separated from successor-owned installed-package execution proof.
8. Documentation reflects the supported command without treating global copies
   as source.
9. Refreshing an existing selected target skill directory reports
   `updated_existing` and remains part of acceptance, matching the T10 test
   matrix branch.
