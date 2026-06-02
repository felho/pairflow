---
title: Start Here
description: Public onboarding entrypoint for Pairflow install, CLI, UI, skills, and release semantics.
order: 1
---

# Pairflow public docs

Pairflow is a CLI-first orchestrator for local repository work. A bubble gives a task its own worktree, tmux session, lifecycle state, and protocol transcript while implementer and reviewer agents iterate behind explicit human gates.

This site is a compact public onboarding surface. The detailed operator and architecture authorities remain in the repository README and `docs/**`.

## Current package identity

- Package name: `{{PACKAGE_NAME}}`
- CLI binary: `{{CLI_BIN}}`
- Repository version: `{{PACKAGE_VERSION}}`

## Read these pages

1. Install Pairflow from the npm package path once a public release is available.
2. Learn how upgrades and version pinning should be handled.
3. Run the basic CLI and bubble workflow.
4. Start the current foreground UI.
5. Install Pairflow skills through the current repo-local install workflow.
6. Understand guarded release and GitHub Pages activation boundaries.

## Boundaries

The docs site is generated from source files under `docs/site/pages`. GitHub Pages publication requires repository Pages settings and permissions outside this repository. A local docs build proves the artifact shape; it does not prove a public URL.
