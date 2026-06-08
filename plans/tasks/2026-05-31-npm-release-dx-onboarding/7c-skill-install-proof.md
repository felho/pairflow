---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_skill_install_proof_v1
task_family_id: skill-install-proof
sequence_key: "7c"
task_id: 7c-skill-install-proof
title: "Skill Install Proof"
status: done
phase: phase7
target_files:
  - "plans/tasks/2026-05-31-npm-release-dx-onboarding/7c-skill-install-proof.md"
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

# Task: Skill Install Proof

## L0 - Policy

### Goal

Prove that `pairflow skills install` works from the packed/isolated installed
`@pairflow/cli` package layout, including dry-run JSON planning, isolated real
install into explicit agent target directories, optional cross-agent symlinks,
and no reliance on global installed skill copies as source.

### Domain / Control Model Summary

1. Business invariant: skill installation readiness must be proven from the
   package users install, not from a source checkout or existing global skill
   directories.
2. Control model: the installed package-local `.claude/skills/**` directory
   owns source skill content for the installed CLI; `pairflow skills install`
   owns parsing, planning, filesystem side effects, and text/JSON reporting;
   the isolated operator `HOME` owns target directories and cleanup.
3. Read-path rule: proof must inspect command output and filesystem results to
   show that `sourceRoot` resolves under the isolated installed package tree,
   while `targetRoot` and optional `otherRoot` resolve under the isolated
   `HOME`.
4. Forbidden fallback: do not use repo-local `.claude/skills/**`, current
   working directory skill files, `~/.claude/skills`, or `~/.codex/skills` as
   source proof for installed-package readiness. Do not mutate the operator's
   real global skill directories. Do not treat build-generated package
   artifacts in the checkout as task-owned edits.
5. Allowed resolution path: a local tarball produced by `npm pack` and installed
   into a temporary npm prefix may stand in for public npm registry
   distribution before `7f-registry-install-smoke`.
6. Missing-data rule: if the installed package cannot resolve package-local
   skill sources, dry-run JSON is malformed, isolated target writes fail, or
   target/source boundaries cannot be proven, record the task as blocked and
   route to a follow-up implementation task. Do not repair runtime/source
   defects inside this proof task.
7. Phase boundary: this task owns installed-package skill-install proof only. It
   must not edit skill source files, CLI/runtime source, package metadata,
   docs, workflows, GitHub/npm settings, or real global skill directories.

### Plan Linkage

1. Parent plan gap closed: missing installed-package proof for
   `pairflow skills install`.
2. Depends on: `5-skills-install` and `7a-package-release-proof`.
3. Unlocks / impacts successors:
   - `7e-release-go-no-go` consumes installed-package skill-install evidence.
   - `7f-registry-install-smoke` remains separate and must not be implied by
     local tarball install proof.
4. Task-list impact: after this task is proven and archived, the parent plan
   can proceed to installed-package UI lifecycle proof before the final release
   GO/NO-GO aggregation.
5. Exit expectation: record exact commands, tool versions, tarball identity or
   path, isolated install prefix, isolated `HOME`, observed dry-run JSON,
   observed real install output, source/target boundary audit, installed
   skill-file checks, symlink checks, cleanup status, and successor handoff
   notes in this task or the parent plan.

### Canonical Contract Anchors

1. Skill install command/runtime surfaces:
   - `src/cli/commands/skills/install.ts`
   - `src/v11/application/skills/skillsInstall.ts`
   - `src/v11/application/skills/skillsInstallContract.ts`
   - `src/v11/infrastructure/skills/nodeSkillsInstallFileSystem.ts`
2. Skill source and policy surfaces:
   - `.claude/skills/INSTALL.md`
   - `.claude/skills/UsePairflow/**`
   - `.claude/skills/CreatePairflowSpec/**`
   - `.claude/skills/ExecutePairflowPlan/**`
3. Package/install surfaces:
   - `package.json`
   - `dist/**`
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7a-package-release-proof.md`
4. Successor proof surfaces:
   - `7e-release-go-no-go` release readiness evidence
   - `7f-registry-install-smoke` public registry install smoke

### Scope Reality / Shape Proof

1. Prior tasks already implemented `pairflow skills install`, package skill
   source inclusion, dry-run/json output, selected target handling, and
   isolated source-checkout tests.
2. `7a-package-release-proof` already proved that a packed tarball can be
   created and installed in isolation, and that skill source files are present
   in the tarball.
3. This task converts those claims into installed-package command execution
   evidence. It must run the command through the isolated installed
   `$prefix/node_modules/.bin/pairflow`, not through repo-local `pnpm` scripts
   or source-checkout `dist`.
4. This task is proof-only. It may inspect package/runtime/source anchors and
   isolated temp outputs, but it may edit only task/plan evidence surfaces.
5. If installed-package command execution fails because of source discovery,
   packaging, filesystem, parser, output, or symlink behavior, stop and route to
   a follow-up implementation task.

### Refactor Classification

1. Classification: release proof / operational validation.
2. Classification triggers: no planned architecture refactor and no
   implementation source edits in this task.
3. Architecture checks: N/A for the proof-only task.
4. Public helper surface action: no helper API surface is expected or allowed.

### Complexity Risk and Split Decision

1. `risk_score`: 4 after proof-only narrowing.
2. Axis scores:
   - `authority_risk`: 0. The task does not change skill, package, or runtime
     authority; it verifies existing authorities.
   - `surface_spread`: 1. The proof reads package, CLI output, skill source,
     and temp filesystem surfaces, but editable surfaces are limited to
     task/plan evidence.
   - `identity_join_risk`: 1. Installed `pairflow` must resolve package-local
     skill source files rather than source-checkout or global copies.
   - `activation_coupling`: 0. Public npm registry activation remains deferred
     to `7e`/`7f`.
   - `prerequisite_risk`: 1. Local temp filesystem permissions and symlink
     behavior may fail and must be recorded without mutating real globals.
   - `acceptance_multiplicity`: 1. The task proves dry-run JSON, real install,
     link-other behavior, source/target boundaries, and cleanup as one
     installed-package skill proof.
3. `split_decision`: `single_task_allowed: yes` because every closure is
   proof-only and source/runtime fixes are forbidden.
4. `split_required_if`: any package/runtime/source defect, docs update,
   workflow update, global skill source mutation, or public registry publish
   proof is required.

### Authority Fan-out Scan

| Bucket | Status | Boundary | Evidence |
|---|---|---|---|
| producer | present | read-only | Installed package-local `.claude/skills/**` produces skill source authority; this task does not edit it. |
| validator/gate | present | read-only | Dry-run JSON parsing, real install output, filesystem checks, and symlink checks validate installed-package behavior. |
| persistence/replay | present | evidence-only | Evidence block stores commands, paths, outputs, and cleanup status for later review. |
| execution consumers | present | current-task proof | Installed `pairflow skills install` is the direct consumer under proof. |
| workflow/orchestration | absent | N/A | No GitHub workflow or Pairflow lifecycle command is executed. |
| read/presentation | present | evidence-only | Task/plan evidence presents readiness and blockers for `7e`. |
| recovery/cleanup | present | bounded | Temp prefix, temp HOME, and temp npm cache cleanup are required after proof. |
| external/integration | present | deferred | Public npm registry install is deferred to `7f`; this task uses a local tarball stand-in. |

### Closure-Budget Gate

| Closure Bucket | Status | Boundary | Evidence / Decision |
|---|---|---|---|
| authority_producer | absent | N/A | No skill source, package, runtime, or docs authority is changed. |
| shared_contract | present | current-task evidence contract | Command output fields and boundary-audit status are current-task proof contracts. |
| internal_execution_consumers | present | current-task proof | Installed `pairflow skills install` is executed from the package install prefix. |
| workflow_orchestration_consumers | absent | N/A | No workflow activation or publish guard state changes. |
| read_model_consumers | present | evidence-only | `7e` consumes recorded skill-install readiness evidence. |
| persisted_authority_or_schema | absent | N/A | No runtime schema or source authority changes. |
| cleanup_recovery_consumers | present | bounded | Temporary prefix/HOME/cache cleanup is part of proof closure. |

1. `split_required`: no after proof-only narrowing.
2. Intentionally collapsed closures: dry-run planning, real isolated install,
   optional link-other symlink validation, and source/target boundary audits
   are collapsed because they are all facets of the same installed-package
   skill-install readiness proof.
3. Explicitly deferred closures: runtime/source fixes, docs/source updates,
   real global skill sync, real npm publish, and public registry install smoke.
4. Unknown buckets: none. Any newly discovered repo-owned mutation need
   converts this task to blocked and requires a follow-up task.

### Bounded-Task-Shape Gate

1. Primary shape: `activation_or_read_model`, limited to installed-package
   skill-install evidence production.
2. Secondary shape: none. Package, CLI, and skill source authorities are
   inspected, not changed.
3. Decomposed closures:
   - local package build/pack/install setup,
   - dry-run JSON proof,
   - real isolated install proof,
   - optional link-other symlink proof,
   - package-local source boundary proof,
   - real global target non-mutation proof,
   - cleanup proof,
   - successor handoff evidence.
4. Adjacent call-site / consumer-family scan result:
   - package metadata and bin entry consumers: consumed through installed
     package command execution; no source mutation owned here.
   - skill source consumers: current task proves installed-package skill
     source resolution for `pairflow skills install`; actual skill behavior is
     not executed.
   - docs consumer: known and already proven by `7b`; this task must not claim
     docs or public Pages readiness.
   - UI lifecycle consumer: known and deferred to `7d-ui-lifecycle-proof`.
   - release-pilot decision consumer: known and deferred to
     `7e-release-go-no-go`; current task only records evidence.
   - public npm registry consumer: known and deferred to
     `7f-registry-install-smoke`.
5. Adjacent scan unknowns: none for this proof-only scope.
6. Shape mix safety: all closures are validation/evidence production, share the
   same isolated package install context, and do not mutate source contracts.
7. Split trigger: any repo-owned source/runtime/package fix, public registry
   activation, or real global skill directory mutation.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger | Entrypoint | Configuration Owner | Operator/User Path | Repo-Provided Parts | External Prerequisites | Success Output Contract | Failure Output Contract | Last-Mile Proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Run skill install dry-run from installed package | end_to_end | invoke installed `pairflow skills install --dry-run --json` | `$prefix/node_modules/.bin/pairflow` | package-local CLI/runtime and temp `HOME` | isolated dry-run command | package bin, command runtime, package-local skill source | local temp prefix/HOME/cache permissions | JSON parses; `dryRun=true`; `status=planned`; `sourceRoot` is package-local; targets are isolated | non-zero command failure or malformed/misbounded JSON | saved command output and JSON field audit |
| Install selected skills into isolated `.claude` target | end_to_end | invoke installed `pairflow skills install --skills all --target-dir .claude` | `$prefix/node_modules/.bin/pairflow` | package-local CLI/runtime and temp `HOME` | isolated real install command | package-local supported skills and filesystem sync implementation | writable isolated `HOME` | text output exits 0; target contains supported skills with `SKILL.md`; source/target paths are separated | non-zero command failure, missing installed skill files, or source/target overlap | command output plus filesystem audit |
| Link selected skills into opposite agent dir | end_to_end | invoke installed command with `--target-dir .claude --link-other` or selected equivalent | `$prefix/node_modules/.bin/pairflow` | CLI link-other planner and temp `HOME` | isolated link-other proof command | symlink operation implementation | local symlink support | opposite agent per-skill paths are symlinks to selected target paths | non-zero command failure or missing/wrong symlink target | symlink audit in isolated `HOME` |
| Preserve global skill source boundary | end_to_end | compare installed command output and real global dirs | command output plus filesystem/status checks | task proof operator | evidence audit | sourceRoot and targetRoot reporting; isolated HOME setup | readable operator real HOME status | no writes occur under real `~/.claude/skills` or `~/.codex/skills`; source is not global | any observed global mutation or global sourceRoot | pre/post status evidence and output path audit |

### In Scope

1. Run preflight repository cleanliness and tool-version checks.
2. Use the retained `7a` tarball when it is still available. If it is not
   available, build and pack a fresh tarball from a clean checkout, then verify
   that any build-generated files are either unchanged or outside the
   task-owned edit set.
3. Install the tarball into an isolated npm prefix with isolated `HOME` and
   npm cache.
4. Run installed `pairflow --version` as a sanity check for the package command
   path.
5. Run installed `pairflow skills install --dry-run --json` and parse/audit
   the returned JSON fields.
6. Run installed `pairflow skills install` into an isolated `.claude` target and
   verify supported skill directories and `SKILL.md` files.
7. Run or verify `--link-other` behavior in the isolated `HOME` and inspect
   symlink targets.
8. Verify reported `sourceRoot` points under the installed package tree and not
   under repo-local or global skill directories.
9. Verify reported target roots and installed files are under the isolated
   `HOME`, not real global skill directories.
10. Clean up temporary proof directories and record cleanup status.
11. Record blocker/follow-up requirements when installed-package skill-install
    proof fails. Do not fix those defects in this task.

### Out of Scope

1. Editing CLI/runtime/source files, package metadata, skill content, docs, or
   workflows.
2. Installing or refreshing real `~/.claude/skills` or `~/.codex/skills`.
3. Treating global installed skill directories as source.
4. Executing the installed skills themselves inside Codex/Claude.
5. Proving `pairflow ui start|status|restart|stop`; owned by
   `7d-ui-lifecycle-proof`.
6. Opening npm publish guards or publishing to npm.
7. Proving public registry install; owned by `7f-registry-install-smoke`.
8. Using source-checkout command execution as installed-package proof.

### Safety Defaults

1. Use temporary prefix, temporary `HOME`, and temporary npm cache for all
   install commands.
2. Pass `HOME="$isolated_home"` and npm cache/prefix variables explicitly for
   commands that may read or write user directories.
3. Prefer `--dry-run --json` before any real isolated install.
4. Record exact paths before cleanup; do not paste large tar listings or copied
   file trees.
5. If a fresh pack is needed, run it from a clean checkout and keep generated
   package artifacts out of staged task/plan edits.
6. If any command unexpectedly references the real global skill directories,
   stop and record the finding.
7. Keep publish guards and external GitHub/npm settings untouched.

## L1 - Contract

### 0a) Canonical Contract Preservation

| Surface | Preserved Contract | Required Behavior | Priority | Status |
|---|---|---|---|---|
| Skill source-of-truth | Repo/package `.claude/skills/**` is source; globals are derived | Installed command output must report package-local source root | P1 | required-now |
| Supported skills | `UsePairflow`, `CreatePairflowSpec`, `ExecutePairflowPlan` | Dry-run and real install must select/install supported skills only | P1 | required-now |
| Target dirs | `.claude` and `.codex` only | Proof uses isolated `$HOME/.claude/skills` and optional `$HOME/.codex/skills` | P1 | required-now |
| Dry run | No filesystem writes | JSON proof must show planned operations without creating target files | P1 | required-now |
| Real install | Managed selected target paths only | Installed skill directories contain `SKILL.md` under isolated target root | P1 | required-now |
| Link-other | Per-skill symlink only | Opposite agent selected skill path symlinks to selected target skill path | P1 | required-now |
| Public registry proof | Deferred | Local tarball install must not be described as public npm readiness | P1 | required-now |

### 0b) Branch Inventory

| Branch | Expected Behavior | Risk If Wrong | Test / Proof |
|---|---|---|---|
| Installed command path | `$prefix/node_modules/.bin/pairflow` executes | Source checkout proof masquerades as package proof | installed binary path and version sanity check |
| Dry-run JSON | Parses as JSON and reports `status=planned` | Automation cannot consume output | JSON parse/audit command |
| Package-local source root | `sourceRoot` is under installed package tree | Global/source checkout used as source | path boundary audit |
| Isolated target root | `targetRoot` is under temp `HOME` | Real globals mutated | path boundary audit |
| Dry-run no writes | target roots absent or unchanged after dry-run | Preview creates state | pre/post temp target check |
| Real install all skills | all supported skill dirs and `SKILL.md` files exist | Missing installed skill content | filesystem audit |
| Link-other selected skills | opposite selected paths are symlinks to selected target paths | Broken derived-copy policy | symlink audit |
| Global dirs not source | command never reports `~/.claude/skills` or `~/.codex/skills` as source | derived global copied back into source | output path audit |
| Cleanup | temporary proof directory removed | state leaks between proof runs | cleanup command/result |
| Failure/blocker | non-zero or malformed output stops proof | false readiness claim | evidence note and follow-up routing |

### 0c) Evidence Contract

| Field | Required Value / Shape |
|---|---|
| `git_status_before` | `empty` before proof commands |
| `tool_versions` | Node, pnpm, npm, and package name/version |
| `tarball_identity` | tarball path or filename plus package name/version |
| `isolated_paths` | temp root, prefix, HOME, and npm cache |
| `installed_binary` | exact `$prefix/node_modules/.bin/pairflow` path |
| `installed_version_output` | matches `package.json.version` |
| `dry_run_json_status` | JSON parse ok, `dryRun=true`, `status=planned` |
| `dry_run_boundary` | `sourceRoot` package-local, `targetRoot` isolated, no writes |
| `real_install_status` | exit 0 and `fresh install` text status or `fresh_install` JSON status for a fresh isolated install |
| `installed_skill_files` | all supported skill `SKILL.md` files present under isolated target |
| `link_other_status` | symlink paths and targets verified or explicitly not run with reason |
| `global_boundary_status` | real global skill dirs not used as source and not mutated |
| `cleanup_status` | temp proof root removed or retained with reason |
| `decision` | `skill_install_proof_passed` or `skill_install_proof_blocked` |

### 0d) ReviewSpec Gate Coverage

| Gate | Required Review Question |
|---|---|
| Metadata | Does frontmatter match `7c-skill-install-proof`, parent tracker, task order, archive group, and `draft`/review status? |
| Scope | Is the task proof-only, with edits limited to task/plan evidence and no runtime/source/docs/workflow mutation? |
| Contract | Are installed-package source/target/dry-run/real-install/link-other evidence contracts concrete and auditable? |
| Capability | Does the task avoid claiming public npm registry install, real global skill sync, docs readiness, or UI lifecycle proof? |
| Split policy | Is the task safe as one proof-only slice, and does it route any source fix to a follow-up task? |

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
3. Create a temporary proof root and choose the tarball source. Prefer a
   retained `7a` tarball when it still exists; otherwise build and pack a fresh
   tarball from the clean checkout:
   ```bash
   tmp_root="$(mktemp -d)"
   retained_tarball_path="<paste retained 7a tarball path here if it still exists, otherwise leave empty>"
   if [ -n "$retained_tarball_path" ] && [ -f "$retained_tarball_path" ]; then
     tarball_path="$retained_tarball_path"
     tarball_filename="$(basename "$tarball_path")"
     printf '[{"filename":"%s"}]\n' "$tarball_filename" > "$tmp_root/npm-pack.json"
     cp "$tarball_path" "$tmp_root/$tarball_filename"
     tarball_path="$tmp_root/$tarball_filename"
   else
     pnpm build
     npm pack --json --pack-destination "$tmp_root" > "$tmp_root/npm-pack.json"
     tarball_path="$tmp_root/$(node -e "const pack=require(process.argv[1]); console.log(pack[0].filename)" "$tmp_root/npm-pack.json")"
     git status --short -- dist ui/dist package.json package-lock.json pnpm-lock.yaml
   fi
   ```
4. Export isolated paths:
   ```bash
   prefix="$tmp_root/prefix"
   isolated_home="$tmp_root/home"
   isolated_npm_cache="$tmp_root/npm-cache"
   mkdir -p "$prefix" "$isolated_home" "$isolated_npm_cache"
   echo "tmp_root=$tmp_root"
   echo "tarball_path=$tarball_path"
   echo "prefix=$prefix"
   echo "isolated_home=$isolated_home"
   echo "isolated_npm_cache=$isolated_npm_cache"
   ```
5. Record real global skill directory pre-status without reading them as source:
   ```bash
   node - <<'NODE' "$HOME" > "$tmp_root/real-global-pre.json"
   const fs = require("node:fs");
   const path = require("node:path");
   const [realHome] = process.argv.slice(2);
   const roots = [".claude", ".codex"].map((dir) => path.join(realHome, dir, "skills"));
   const status = Object.fromEntries(roots.map((root) => [
     root,
     fs.existsSync(root)
       ? { exists: true, mtimeMs: fs.statSync(root).mtimeMs }
       : { exists: false }
   ]));
   console.log(JSON.stringify({ real_global_pre_status: status }, null, 2));
   NODE
   cat "$tmp_root/real-global-pre.json"
   ```
6. Install the tarball into the isolated prefix:
   ```bash
   HOME="$isolated_home" npm_config_cache="$isolated_npm_cache" npm install --prefix "$prefix" "$tarball_path"
   ```
7. Sanity-check installed binary/version:
   ```bash
   installed_pairflow="$prefix/node_modules/.bin/pairflow"
   "$installed_pairflow" --version
   ```
8. Run dry-run JSON and save it:
   ```bash
   HOME="$isolated_home" "$installed_pairflow" skills install --skills all --target-dir .claude --dry-run --json > "$tmp_root/skills-dry-run.json"
   ```
9. Audit dry-run JSON:
   ```bash
   node - <<'NODE' "$tmp_root/skills-dry-run.json" "$prefix" "$isolated_home"
   const fs = require("node:fs");
   const path = require("node:path");
   const [jsonPath, prefix, home] = process.argv.slice(2);
   const plan = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
   const sourceRoot = fs.realpathSync(plan.sourceRoot);
   const targetRoot = path.resolve(plan.targetRoot);
   const packageRoot = fs.realpathSync(path.resolve(prefix, "node_modules", "@pairflow", "cli"));
   const isolatedHome = path.resolve(home);
   const targetExistsAfterDryRun = fs.existsSync(targetRoot);
   const requiredSkills = ["UsePairflow", "CreatePairflowSpec", "ExecutePairflowPlan"];
   const missingOps = requiredSkills.filter((skill) =>
     !plan.operations.some((op) => op.kind === "sync_skill" && op.skill === skill)
   );
   console.log(JSON.stringify({
     dry_run: plan.dryRun === true,
     status: plan.status,
     source_under_package: sourceRoot === path.join(packageRoot, ".claude", "skills"),
     target_under_isolated_home: targetRoot.startsWith(isolatedHome + path.sep),
     target_exists_after_dry_run: targetExistsAfterDryRun,
     missing_sync_operations: missingOps
   }, null, 2));
   NODE
   ```
10. Run real isolated install with link-other and capture the text status:
    ```bash
   HOME="$isolated_home" "$installed_pairflow" skills install --skills all --target-dir .claude --link-other > "$tmp_root/skills-install.txt"
   cat "$tmp_root/skills-install.txt"
   rg -n "Status: fresh install" "$tmp_root/skills-install.txt"
    ```
11. Audit installed skill files and symlinks:
    ```bash
    node - <<'NODE' "$isolated_home"
    const fs = require("node:fs");
    const path = require("node:path");
    const [home] = process.argv.slice(2);
    const requiredSkills = ["UsePairflow", "CreatePairflowSpec", "ExecutePairflowPlan"];
    const claudeRoot = path.join(home, ".claude", "skills");
    const codexRoot = path.join(home, ".codex", "skills");
    const missingSkillMd = requiredSkills.filter((skill) =>
      !fs.existsSync(path.join(claudeRoot, skill, "SKILL.md"))
    );
    const badLinks = requiredSkills.filter((skill) => {
      const linkPath = path.join(codexRoot, skill);
      if (!fs.existsSync(linkPath) || !fs.lstatSync(linkPath).isSymbolicLink()) {
        return true;
      }
      return fs.readlinkSync(linkPath) !== path.join(claudeRoot, skill);
    });
    console.log(JSON.stringify({
      missing_skill_md: missingSkillMd,
      bad_links: badLinks
    }, null, 2));
    NODE
    ```
12. Record real global skill directory post-status and compare with pre-status
    evidence:
    ```bash
    node - <<'NODE' "$HOME" > "$tmp_root/real-global-post.json"
    const fs = require("node:fs");
    const path = require("node:path");
    const [realHome] = process.argv.slice(2);
    const roots = [".claude", ".codex"].map((dir) => path.join(realHome, dir, "skills"));
    const status = Object.fromEntries(roots.map((root) => [
      root,
      fs.existsSync(root)
        ? { exists: true, mtimeMs: fs.statSync(root).mtimeMs }
        : { exists: false }
    ]));
    console.log(JSON.stringify({ real_global_post_status: status }, null, 2));
    NODE
    cat "$tmp_root/real-global-post.json"
    node - <<'NODE' "$tmp_root/real-global-pre.json" "$tmp_root/real-global-post.json"
    const fs = require("node:fs");
    const [prePath, postPath] = process.argv.slice(2);
    const pre = JSON.parse(fs.readFileSync(prePath, "utf8")).real_global_pre_status;
    const post = JSON.parse(fs.readFileSync(postPath, "utf8")).real_global_post_status;
    console.log(JSON.stringify({
      real_global_unchanged: JSON.stringify(pre) === JSON.stringify(post)
    }, null, 2));
    NODE
    ```
13. Record cleanup:
    ```bash
    echo "cleanup_target=$tmp_root"
    rm -rf "$tmp_root"
    test ! -e "$tmp_root" && echo "cleanup_result=removed"
    ```
14. Confirm checkout remains limited to evidence edits after proof:
    ```bash
    git status --short
    ```

### Acceptance Checks

1. Task artifact exists at
   `plans/tasks/2026-05-31-npm-release-dx-onboarding/7c-skill-install-proof.md`
   with `status: approved` only after ReviewSpec task-mode approves it.
2. Parent plan tracker points `7c-skill-install-proof` at the live task path
   before execution and later archives it only after proof evidence is
   recorded.
3. Installed package command path is proven by exact binary path and version
   output.
4. Dry-run JSON parses and proves package-local source root, isolated target
   root, `status=planned`, and no target creation.
5. Real install reports `Status: fresh install` in text output, or
   `fresh_install` if JSON is used, and creates all supported skills under
   isolated `.claude/skills`.
6. `--link-other` creates per-skill `.codex/skills/<skill>` symlinks to the
   isolated `.claude` target.
7. Real global `~/.claude/skills` and `~/.codex/skills` are not used as source
   and are not mutated.
8. Temporary proof directories are removed or retained with explicit reason.
9. Evidence decision is recorded as `skill_install_proof_passed` or
   `skill_install_proof_blocked`.

### Evidence To Record

Use this section after execution.

```yaml
evidence_status: completed
executed_at: "2026-06-07T23:52:13+02:00"
commands:
  - "git status --short"
  - "node --version"
  - "pnpm --version"
  - "npm --version"
  - "node -p \"require('./package.json').name + ' ' + require('./package.json').version\""
  - "pnpm build"
  - "npm pack --json --pack-destination \"$tmp_root\""
  - "npm install --prefix \"$prefix\" \"$tarball_path\" with isolated HOME/cache"
  - "\"$installed_pairflow\" --version"
  - "\"$installed_pairflow\" skills install --skills all --target-dir .claude --dry-run --json"
  - "\"$installed_pairflow\" skills install --skills all --target-dir .claude --link-other"
  - "installed skill file and symlink audit"
  - "real global skill directory pre/post audit"
  - "cleanup"
tool_versions:
  node_version: "v26.0.0"
  pnpm_version: "10.8.1"
  npm_version: "11.12.1"
  package_name: "@pairflow/cli"
  package_version: "0.1.0"
tarball_identity:
  package_name: "@pairflow/cli"
  package_version: "0.1.0"
  tarball_filename: "pairflow-cli-0.1.0.tgz"
  primary_temp_tarball_path: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/pairflow-cli-0.1.0.tgz"
  rerun_temp_tarball_path: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.wgPCheiQ8h/pairflow-cli-0.1.0.tgz"
  tarball_path_note: "temporary proof paths removed during cleanup; successors should regenerate"
build_and_pack:
  retained_7a_tarball_used: false
  fresh_build_result: "passed"
  fresh_pack_result: "passed"
  build_artifact_status_audit: "clean"
isolated_paths:
  primary_tmp_root: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX"
  primary_prefix: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/prefix"
  primary_home: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/home"
  primary_npm_cache: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/npm-cache"
installed_binary:
  path: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/prefix/node_modules/.bin/pairflow"
  command_path_source: "isolated npm prefix"
installed_version_output: "0.1.0"
dry_run_json:
  sourceRoot: "/private/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/prefix/node_modules/@pairflow/cli/.claude/skills"
  targetRoot: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/home/.claude/skills"
  targetDir: ".claude"
  selectedSkills:
    - "UsePairflow"
    - "CreatePairflowSpec"
    - "ExecutePairflowPlan"
  dryRun: true
  force: false
  linkOther: false
  status: "planned"
  operation_count: 3
dry_run_json_audit:
  dry_run: true
  status: "planned"
  target_under_isolated_home: true
  target_exists_after_dry_run: false
  missing_sync_operations: []
  original_source_under_package_audit: false
  original_source_under_package_audit_note: "The first audit compared /var and /private/var spellings on macOS and produced a false negative."
  realpath_source_under_package_rerun: true
  realpath_rerun_sourceRoot: "/private/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.wgPCheiQ8h/prefix/node_modules/@pairflow/cli/.claude/skills"
  realpath_rerun_packageRoot: "/private/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.wgPCheiQ8h/prefix/node_modules/@pairflow/cli"
  realpath_rerun_target_under_isolated_home: true
real_install_output:
  text_summary_present: true
  source_root: "/private/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/prefix/node_modules/@pairflow/cli/.claude/skills"
  target_root: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/home/.claude/skills"
  installed_skills: "UsePairflow, CreatePairflowSpec, ExecutePairflowPlan"
  dry_run: false
  force: false
  link_other: true
  other_root: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX/home/.codex/skills"
  status: "fresh install"
installed_skill_file_audit:
  missing_skill_md: []
link_other_audit:
  bad_links: []
global_boundary_status:
  pre_status:
    "/Users/felho/.claude/skills":
      exists: true
      mtimeMs: 1780389468227.4424
    "/Users/felho/.codex/skills":
      exists: true
      mtimeMs: 1780776353045.9912
  post_status:
    "/Users/felho/.claude/skills":
      exists: true
      mtimeMs: 1780389468227.4424
    "/Users/felho/.codex/skills":
      exists: true
      mtimeMs: 1780776353045.9912
  real_global_unchanged: true
  global_source_used: false
cleanup_status:
  primary_cleanup_target: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.UISNW7WHPX"
  primary_cleanup_result: "removed"
  rerun_cleanup_target: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.wgPCheiQ8h"
  rerun_cleanup_result: "removed"
git_status_after: "clean"
decision: "skill_install_proof_passed"
notes:
  - "npm emitted a non-blocking notice that npm 11.16.0 is available."
  - "pnpm build emitted the existing non-blocking esbuild ignored-build-scripts warning."
  - "The approved task audit snippet was refined to use realpath for package-local source-root comparison on macOS /var versus /private/var aliases."
```
