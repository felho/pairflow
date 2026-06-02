---
title: Web UI
description: Current foreground Pairflow UI usage and helper-script boundary.
order: 5
---

# Web UI

The current Pairflow UI is started in the foreground with:

```bash
pairflow ui
```

By default it serves at `http://127.0.0.1:4173`. You can pass repositories and host settings:

```bash
pairflow ui --repo /path/to/repo
pairflow ui --host 0.0.0.0 --port 8080
```

## Current local helper scripts

The repository also has pnpm helper scripts for local development and daily operation:

```bash
pnpm ui:start
pnpm ui:status
pnpm ui:restart
pnpm ui:stop
```

These are repository helper scripts, not the future Pairflow-owned UI lifecycle CLI. Do not treat `pairflow ui start`, `pairflow ui stop`, `pairflow ui status`, or `pairflow ui restart` as available commands in the current CLI.

## What the UI is for

Use the UI to monitor active bubbles across repositories, inspect state, and handle human decision points. The CLI remains the protocol and lifecycle authority.
