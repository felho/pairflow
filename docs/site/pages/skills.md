---
title: Skills
description: Current Pairflow skill installation workflow and source-of-truth boundary.
order: 6
---

# Pairflow skills

Pairflow ships agent skills for lifecycle operation and specification work. The repo-local source of truth is `.claude/skills/**`.

## Current supported install path

Open `.claude/skills/INSTALL.md` in your coding-agent chat and ask the agent to run that repo-local install workflow.

Supported parameters include:

- `--skills all`
- `--skills UsePairflow,CreatePairflowSpec,ExecutePairflowPlan`
- `--target-dir .claude`
- `--target-dir .codex`
- `--link-other true`

The workflow copies from the repo-local skill source into global `~/.claude/skills` or `~/.codex/skills`. Global copies are derived artifacts, not editable source.

## Future CLI boundary

A future successor task owns any `pairflow skills install` command. This docs surface does not claim that command exists today.
