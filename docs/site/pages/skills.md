---
title: Skills
description: Current Pairflow skill installation workflow and source-of-truth boundary.
order: 6
---

# Pairflow skills

Pairflow ships agent skills for lifecycle operation and specification work. The repo-local source of truth is `.claude/skills/**`.

## Supported install path

Run the CLI installer from a Pairflow checkout or installed package:

```bash
pairflow skills install --skills all --target-dir .claude
```

Supported parameters include:

- `--skills all`
- `--skills UsePairflow,CreatePairflowSpec,ExecutePairflowPlan`
- `--target-dir .claude`
- `--target-dir .codex`
- `--link-other`
- `--dry-run --json`
- `--force`

The command copies from package-local or repo-local `.claude/skills/**` into global `~/.claude/skills` or `~/.codex/skills`. Global copies are derived artifacts, not editable source.

## Policy reference

`.claude/skills/INSTALL.md` documents the same source-of-truth boundary and the fallback manual install workflow.
