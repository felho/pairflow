---
description: Install or update Pairflow skills into global ~/.claude/skills or ~/.codex/skills, with optional cross-agent symlinks
argument-hint: [--skills all|UsePairflow|CreatePairflowSpec|ExecutePairflowPlan[,<name>...]] [--target-dir .claude|.codex] [--link-other] [--force] [--dry-run] [--json]
allowed-tools: Bash
---

# Install Pairflow Skills

Install selected Pairflow skills from this repository or installed Pairflow package into a global agent skills directory.

Preferred CLI:

```bash
pairflow skills install --skills all --target-dir .claude
```

Use this workflow document as the source-policy reference and fallback manual procedure. Global skill directories are derived targets only; never copy from `~/.claude/skills` or `~/.codex/skills` as source.

## Variables

SKILLS_ARG: extracted from `--skills`, default `all`
TARGET_DIR_NAME: extracted from `--target-dir`, default `.claude`
LINK_OTHER: extracted from `--link-other`, default `false`
FORCE: extracted from `--force`, default `false`
DRY_RUN: extracted from `--dry-run`, default `false`
JSON: extracted from `--json`, default `false`
SUPPORTED_SKILLS:
1. `UsePairflow`
2. `CreatePairflowSpec`
3. `ExecutePairflowPlan`

## Instructions

- Resolve `SOURCE_ROOT` as the package-local or repo-local `.claude/skills/` directory containing the supported skill source directories.
- Allowed target directory values:
  1. `.claude`
  2. `.codex`
- Install destination format:
  - `TARGET_ROOT="$HOME/<TARGET_DIR_NAME>/skills"`
- If `LINK_OTHER=true`, create/update per-skill symlinks in the other agent directory:
  - if target is `.claude`, symlink to `$HOME/.codex/skills/<skill>`
  - if target is `.codex`, symlink to `$HOME/.claude/skills/<skill>`
- Never modify source files in the repo; copy one-way from `SOURCE_ROOT` to global target.
- Use deletion-preserving sync semantics so deleted source files are removed from destination too.
- Existing selected target skill directories and existing opposite-agent symlinks may be refreshed.
- Existing non-directory selected target paths or non-symlink opposite-agent paths require `--force`.

## Workflow

1. Resolve defaults:
   ```bash
   SKILLS_ARG="${SKILLS_ARG:-all}"
   TARGET_DIR_NAME="${TARGET_DIR_NAME:-.claude}"
   LINK_OTHER="${LINK_OTHER:-false}"
   ```
2. Validate `TARGET_DIR_NAME` is either `.claude` or `.codex`.
3. Resolve `INSTALL_SKILLS`:
   - if `SKILLS_ARG=all`, use all supported skills
   - otherwise parse comma-separated values and validate each against `SUPPORTED_SKILLS`
4. If `DRY_RUN=true`, report the plan and stop without creating, copying, deleting, or linking.
5. Prepare target:
   ```bash
   mkdir -p "$TARGET_ROOT"
   ```
6. Before writes, preflight every selected target skill path and every selected opposite-agent link path:
   - allow absent paths
   - allow existing selected target directories
   - allow existing opposite-agent symlinks
   - require `--force` for existing selected target paths that are not directories
   - require `--force` for existing opposite-agent paths that are not symlinks
7. For each selected skill:
   - verify source exists: `"$SOURCE_ROOT/<skill>/"`
   - sync:
     ```bash
     rsync -a --delete "$SOURCE_ROOT/<skill>/" "$TARGET_ROOT/<skill>/"
     ```
8. If `LINK_OTHER=true`:
   - resolve `OTHER_DIR_NAME` (`.codex` when target is `.claude`, otherwise `.claude`)
   - ensure `OTHER_ROOT="$HOME/$OTHER_DIR_NAME/skills"` exists
   - for each selected skill, replace the selected path at `"$OTHER_ROOT/<skill>"` with a symlink:
     ```bash
     rm -rf "$OTHER_ROOT/<skill>"
     ln -s "$TARGET_ROOT/<skill>" "$OTHER_ROOT/<skill>"
     ```
9. Verify by listing installed folders and symlink targets (if any).

## Usage Examples

1. Install all skills into `~/.claude/skills` (default):
   - `pairflow skills install --skills all --target-dir .claude`
2. Install only `CreatePairflowSpec` into `~/.codex/skills` and symlink to `.claude`:
   - `pairflow skills install --skills CreatePairflowSpec --target-dir .codex --link-other`
3. Install `UsePairflow` and `CreatePairflowSpec` into `~/.claude/skills` and symlink to `.codex`:
   - `pairflow skills install --skills UsePairflow,CreatePairflowSpec --target-dir .claude --link-other`
4. Install only `ExecutePairflowPlan` into `~/.claude/skills`:
   - `pairflow skills install --skills ExecutePairflowPlan --target-dir .claude`
5. Install only `ExecutePairflowPlan` into `~/.claude/skills` and symlink to `.codex`:
   - `pairflow skills install --skills ExecutePairflowPlan --target-dir .claude --link-other`
6. Preview all default operations without writes:
   - `pairflow skills install --dry-run --json`

## Report

```
Pairflow skills install summary:

- Source root: <SOURCE_ROOT>
- Target root: <TARGET_ROOT>
- Installed skills: <list>
- Dry run: <true/false>
- Force: <true/false>
- Link to other agent dir: <true/false>
- Other root: <path or n/a>
- Status: <planned | fresh install | updated existing | replaced existing>
```

If any step fails, report the exact error and stop.
