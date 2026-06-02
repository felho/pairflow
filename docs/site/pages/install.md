---
title: Install
description: Pairflow package install path and source checkout fallback for contributors.
order: 2
---

# Install Pairflow

The public package identity is `{{PACKAGE_NAME}}`, and the installed command is `{{CLI_BIN}}`.

## User-facing npm path

After the package has been released to npm, install it with:

```bash
npm install -g {{PACKAGE_NAME}}
pairflow --help
```

The first public npm publish is guarded and remains a release-pilot proof item. Until that pilot proves the package is available from the registry, treat npm install commands as the intended user path, not as proof that a version has already been published.

## Contributor source checkout path

Contributors can still install from a local checkout:

```bash
git clone https://github.com/felho/pairflow.git
cd pairflow
./scripts/install.sh
```

That script checks prerequisites, installs dependencies, builds the project, links the CLI, and runs a smoke test. Use the repository README and `INSTALL.md` for full source-checkout details.

## Prerequisites

- Node.js 22 or newer
- pnpm 10.8.1 as declared by `package.json`
- git and tmux for normal bubble operation
- Codex or Claude Code if you want Pairflow to drive those agent panes
