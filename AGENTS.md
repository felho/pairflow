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
- When moving retained code into `src/v11/**`, follow `docs/architecture/v11-placement-and-extraction-governance.md`.
- Default new `v11` extracts to the narrowest correct scope; do not promote code into `shared` without explicit multi-lane justification.
- Important `v11` extracts must have explicit typed boundaries; do not rely on implicit meaning reconstructed from call sites.
- If protocol or state machine behavior changes, update the spec in the same work.

## Refactoring Guidance

For refactors, first classify the change.

Fast-path mechanical/local cleanup is allowed only when the change does not
touch:
- `internal/**` paths,
- public exports or new module entrypoints,
- cross-layer placement (shared/domain/application/infrastructure/contracts),
- command orchestration or state/persistence ordering,
- authority, validation, or canonicalization flow.

If any of those apply, consult `docs/architecture/refactoring-guidance.md` and
run the Boundary/Architecture checks.

## Architecture Fitness Drift Policy

When changing lifecycle, transcript/state ordering, execution-context ownership,
state transition derivation, or command orchestration boundaries, update or
explicitly re-evaluate the related fitness checks in `tools/fitness/**`.

Changes that introduce or move any of the following must check whether a fitness
rule should be added or updated:

- lifecycle state transition policy
- transcript append before/after state write ordering
- execution-context minting, clearing, or continuation
- command-local persistence workflows
- shared-layer helpers that import domain policy
- shared-layer helpers that combine multiple I/O ports into one workflow

If no fitness change is needed, mention why in the commit message or task/progress
note.

## Local Change Verification

During implementation, use the narrowest relevant tests for fast feedback as needed.
Before declaring direct non-docs code changes in the current checkout complete, use this default verification order:

1. Run `pnpm typecheck`.
2. Run `pnpm lint`.
3. Run `pnpm fitness:check:ci`.
4. Run the narrowest relevant tests for the changed behavior.
5. Run the broader affected test suite when one exists.
   - UI changes: `pnpm --dir ui test`
   - Core/runtime changes: relevant root Vitest files or suites.
6. Run `pnpm test`.
7. Rebuild affected runtime artifacts:
   - Pairflow CLI/runtime source changes (`src/**`, `scripts/**`, CLI/runtime config): `pnpm build`
   - UI source changes (`ui/src/**`): `pnpm --dir ui build`
8. If UI source changes affect the running local UI, restart it with `pnpm ui:restart`.

If any step is skipped, explain why in the final summary.
If `pnpm test` fails, do not describe the repository as fully validated. Either fix the failure or report the exact failing command, failing suites/count, and why it is believed unrelated to the current change.

### Bubble Close Verification Exception

When closing or merging a Pairflow bubble, do not rerun the full local verification suite on `main` merely because the bubble merged code changes. The bubble workflow owns validation for its own implementation changes.

After a successful bubble close, run only the checks needed to verify local aftermath work performed outside the bubble, such as progress/task/plan metadata edits, archive moves, documentation touch-ups, or cleanup state checks.

Run the full local verification order on `main` only when Codex makes direct non-bubble product/source edits in the current checkout, or when the close workflow reports missing or insufficient bubble validation evidence.

## Build Freshness Policy

- If Pairflow source code changes (`src/**`, `scripts/**`, or CLI/runtime-affecting config) are made directly in the current checkout, run `pnpm build` before any bubble lifecycle command (`bubble start`, `pass`, `converged`, `meta-review`, `approve`, `commit`, `merge`).
- If additional direct source edits are made later in the same session, run `pnpm build` again before continuing with lifecycle commands.
- A new `main` build is not required solely because a bubble branch already built, validated, and then merged during `bubble close`; use the bubble's validation evidence unless it is missing or insufficient.
- Treat stale/missing worktree entrypoint (`dist/cli/index.js`) as a blocker; rebuild before proceeding.
- Document in the final summary that build was executed (or explicitly state if skipped and why).

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
   - `bubble approve` -> `bubble commit` -> `bubble merge`.
   - Mandatory post-merge check: clean branch and no rebase/merge state.

4. **Pull/Push safety policy (repo-local)**
   - Defaults: `pull.rebase=false`, `branch.main.rebase=false`, `pull.ff=only`.
   - Avoid automatic pull-rebase flow because it can cause repeated conflicts with bubble merge commits.

5. **Incident recovery protocol**
   - If `git status` shows an active rebase: stop and do not resolve reflexively.
   - First run state diagnostics (`git status`, `git reflog`, `git ls-files -u`), then decide with the user.
   - Default recommendation: for unjustified/orphaned rebase, run `git rebase --abort`, then continue from a clean state.

6. **Temporary bootstrap requirement (until repo-level config exists)**
   - When creating a Pairflow bubble in this repository, always pass:
     - `--bootstrap-command "pnpm install --frozen-lockfile && pnpm --dir ui install --frozen-lockfile && pnpm build"`
   - Apply this to bubble creation flows by default so worktree-local CLI/runtime is initialized reliably.
   - Remove this requirement once bootstrap is supported as repository-level configuration.

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
