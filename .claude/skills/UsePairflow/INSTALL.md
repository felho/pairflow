---
description: Install or update UsePairflow skill into global ~/.claude/skills/
allowed-tools: Bash
---

# Install UsePairflow Skill

Install the UsePairflow skill from this repository into the user's global Claude Code skills directory so it is available across all projects.

## Variables

SKILL_NAME: UsePairflow
SOURCE_DIR: The directory containing this prompt file (resolve from the project root: `.claude/skills/UsePairflow/`)

## Instructions

- The global skills directory is `$HOME/.claude/skills/`
- If `$HOME/.claude/skills/` does not exist, create it (this may be the user's first skill)
- If `$HOME/.claude/skills/UsePairflow/` already exists, overwrite it completely with the latest version
- Use `rsync` with `--delete` to ensure removed files are cleaned up, not just new files copied
- Never modify the source files — this is a one-way copy from repo to global

## Workflow

1. Detect the user's home directory and the source skill path:
   ```bash
   echo "HOME=$HOME"
   ```
2. Verify the source skill directory exists by listing its contents
3. Create the global skills directory if it does not exist:
   ```bash
   mkdir -p "$HOME/.claude/skills"
   ```
4. Copy the skill folder, replacing any existing version:
   ```bash
   rsync -a --delete "<SOURCE_DIR>/" "$HOME/.claude/skills/UsePairflow/"
   ```
5. Remove INSTALL.md from the installed copy (it belongs in the repo, not in the global skill):
   ```bash
   rm -f "$HOME/.claude/skills/UsePairflow/INSTALL.md"
   ```
6. Verify the installation by listing the installed files

## Report

```
✅ UsePairflow skill installed to ~/.claude/skills/UsePairflow/

Installed files:
- <list of files>

Status: <fresh install | updated existing>
```

If any step fails, report the error and do not continue.
