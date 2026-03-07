## Priorities

1. Output quality and robustness first.
2. Reduce coordination mistakes and state inconsistencies.
3. Optimize speed only if it does not harm 1 or 2.

## Workflow

1. Plan before implementation.
2. Implement in small, verifiable increments.
3. Validate each increment before moving on.

## Safety

- Do not run destructive git/history commands (`reset --hard`, rebase, force push, etc.) without explicit user approval.
- Do not change files outside this repo unless explicitly requested.

## Tech Conventions

- Language: TypeScript-first.
- Keep architecture aligned with `docs/pairflow-initial-design.md`.
- If protocol or state machine behavior changes, update the spec in the same work.

## Verification Before Commit

- Run lint, typecheck, and tests relevant to changed code.
- If any check is skipped, state it explicitly in the summary.

## Skill Source-of-Truth & Sync Policy

When modifying `UsePairflow` or `CreatePairflowSpec` skills:

1. **Always edit the repo-local skill files first** (source of truth):
   - `.claude/skills/UsePairflow/**`
   - `.claude/skills/CreatePairflowSpec/**`
2. **Do not treat `$HOME/.claude/skills` as editable source** for Pairflow changes.
3. **Do not treat `$HOME/.codex/skills` as editable source** either.
   - In this setup, Codex may read these skills via symlink/installed copy from `~/.claude/skills`.
   - Therefore both global locations are treated as derived artifacts, not source.
4. **Commit the repo-local skill changes** in this repository first.
5. **Run the local skill install/sync workflow** documented in:
   - `.claude/skills/INSTALL.md`
   - In this local setup, installer target must be `~/.claude/skills` (i.e. `--target-dir .claude`).
   - Use `--target-dir .codex` only if explicitly requested for a different environment.
6. This step updates the global `~/.claude/skills` copy from repo-local source.
7. **Commit the synced global-skill changes** in the `~/.claude` repository as a separate follow-up commit.
8. If both agent directories are used, manage `~/.codex/skills` via installer link/sync mode from the same repo-local source (never by direct manual edits).

## Session Close

- Add a short progress update to the repository progress note (if present) or commit message context.

---

## Bubble Workflow Guardrails

These are mandatory operating rules for bubble lifecycle handling to avoid rebase/merge instability.

1. **Pre-flight before bubble start**
   - Start from the `main` branch with a clean worktree (`git status` clean).
   - No merge/rebase/cherry-pick operation may be in progress.
   - If the bubble input is a task file, commit it to `main` before starting, or create it only on the bubble branch. Do not leave the same path untracked on `main`.

2. **No parallel conflicting edits**
   - While a bubble is running, do not modify on `main` the same files that are touched by the bubble branch.
   - If this is unavoidable, align first and use an explicit merge strategy.

3. **Mandatory close order**
   - `bubble approve` -> `bubble commit` -> `bubble merge` -> push.
   - Mandatory post-merge check: clean branch and no rebase/merge state.

4. **Pull/Push safety policy (repo-local)**
   - Defaults: `pull.rebase=false`, `branch.main.rebase=false`, `pull.ff=only`.
   - Avoid automatic pull-rebase flow because it can cause repeated conflicts with bubble merge commits.

5. **Incident recovery protocol**
   - If `git status` shows an active rebase: stop and do not resolve reflexively.
   - First run state diagnostics (`git status`, `git reflog`, `git ls-files -u`), then decide with the user.
   - Default recommendation: for unjustified/orphaned rebase, run `git rebase --abort`, then continue from a clean state.

---

## Blocker & Escalation Policy

1. **Escalation-first on critical commands**
   - If a required command fails because of sandbox/permission constraints, the first step is to request escalation.
   - Do not silently switch to an alternative without user decision.

2. **No silent downgrade**
   - If fallback implies stack or quality change (for example JavaScript instead of TypeScript tests, different toolchain), stop and request approval.
   - Automatic fallback is allowed only when quality and behavior are equivalent.

3. **Git history safety gate**
   - `git reset`, `rebase`, `cherry-pick`, `revert` only with explicit user approval.
   - Before history rewrite, include a mandatory safety checkpoint (for example reflog reference / short backup plan), then verify state afterward.

4. **Pre-commit scope check**
   - Before commit, always verify the staged file list.
   - If staged files include anything outside requested scope, align before committing.

5. **Blocker decision checkpoint**
   - When blocked, briefly offer the decision:
     - A) escalation and continue the original approach (recommended)
     - B) fallback with explicit tradeoff description
