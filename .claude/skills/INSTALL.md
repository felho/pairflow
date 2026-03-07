---
description: Install or update Pairflow skills into global ~/.claude/skills or ~/.codex/skills, with optional cross-agent symlinks
argument-hint: [--skills all|UsePairflow|CreatePairflowSpec[,<name>...]] [--target-dir .claude|.codex] [--link-other true|false]
allowed-tools: Bash
---

# Install Pairflow Skills

Install selected Pairflow skills from this repository into a global agent skills directory.

## Variables

SKILLS_ARG: extracted from `--skills`, default `all`
TARGET_DIR_NAME: extracted from `--target-dir`, default `.claude`
LINK_OTHER: extracted from `--link-other`, default `false`
SUPPORTED_SKILLS:
1. `UsePairflow`
2. `CreatePairflowSpec`

## Instructions

- Resolve `SOURCE_ROOT` as the directory containing this file (repo path: `.claude/skills/`).
- Allowed target directory values:
  1. `.claude`
  2. `.codex`
- Install destination format:
  - `TARGET_ROOT="$HOME/<TARGET_DIR_NAME>/skills"`
- If `LINK_OTHER=true`, create/update symlinks in the other agent directory:
  - if target is `.claude`, symlink to `$HOME/.codex/skills/<skill>`
  - if target is `.codex`, symlink to `$HOME/.claude/skills/<skill>`
- Never modify source files in the repo; copy one-way from `SOURCE_ROOT` to global target.
- Use `rsync -a --delete` so deleted source files are removed from destination too.

## Workflow

1. Resolve defaults:
   ```bash
   SKILLS_ARG="${SKILLS_ARG:-all}"
   TARGET_DIR_NAME="${TARGET_DIR_NAME:-.claude}"
   LINK_OTHER="${LINK_OTHER:-false}"
   ```
2. Validate `TARGET_DIR_NAME` is either `.claude` or `.codex`.
3. Resolve `INSTALL_SKILLS`:
   - if `SKILLS_ARG=all`, use both supported skills
   - otherwise parse comma-separated values and validate each against `SUPPORTED_SKILLS`
4. Prepare target:
   ```bash
   mkdir -p "$TARGET_ROOT"
   ```
5. For each selected skill:
   - verify source exists: `"$SOURCE_ROOT/<skill>/"`
   - sync:
     ```bash
     rsync -a --delete "$SOURCE_ROOT/<skill>/" "$TARGET_ROOT/<skill>/"
     ```
6. If `LINK_OTHER=true`:
   - resolve `OTHER_DIR_NAME` (`.codex` when target is `.claude`, otherwise `.claude`)
   - ensure `OTHER_ROOT="$HOME/$OTHER_DIR_NAME/skills"` exists
   - for each selected skill, replace existing path at `"$OTHER_ROOT/<skill>"` with symlink:
     ```bash
     rm -rf "$OTHER_ROOT/<skill>"
     ln -s "$TARGET_ROOT/<skill>" "$OTHER_ROOT/<skill>"
     ```
7. Verify by listing installed folders and symlink targets (if any).

## Usage Examples

1. Install both skills into `~/.claude/skills` (default):
   - `--skills all --target-dir .claude --link-other false`
2. Install only `CreatePairflowSpec` into `~/.codex/skills` and symlink to `.claude`:
   - `--skills CreatePairflowSpec --target-dir .codex --link-other true`
3. Install both skills into `~/.claude/skills` and symlink to `.codex`:
   - `--skills UsePairflow,CreatePairflowSpec --target-dir .claude --link-other true`

## Report

```
Pairflow skills install summary:

- Source root: <SOURCE_ROOT>
- Target root: <TARGET_ROOT>
- Installed skills: <list>
- Link to other agent dir: <true/false>
- Other root: <path or n/a>
- Status: <fresh install | updated existing>
```

If any step fails, report the exact error and stop.
