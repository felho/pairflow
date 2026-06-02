---
title: Web UI
description: Pairflow UI foreground and background service lifecycle usage.
order: 5
---

# Web UI

Start the Pairflow UI in the foreground with:

```bash
pairflow ui
```

By default it serves at `http://127.0.0.1:4173`. You can pass repositories and host settings:

```bash
pairflow ui --repo /path/to/repo
pairflow ui --host 0.0.0.0 --port 8080
```

## Background service lifecycle

For daily operation, use the supported CLI lifecycle commands:

```bash
pairflow ui start
pairflow ui status
pairflow ui restart
pairflow ui stop
```

Startup options work with `start`. `restart` preserves the verified running
service endpoint; to change host or port, run `stop` and then `start` with the
new endpoint.

```bash
pairflow ui start --repo /path/to/repo --host 0.0.0.0 --port 8080
pairflow ui status --port 8080 --json
```

Background lifecycle commands use Pairflow-owned state under the local repo to record PID, URL, command, and process identity. `stop` and `restart` verify that identity before sending a signal. They do not kill unrelated processes just because a port is occupied; such cases are reported as `unmanaged`.

## Local helper scripts

The repository also has pnpm helper scripts for local development:

```bash
pnpm ui:start
pnpm ui:status
pnpm ui:restart
pnpm ui:stop
```

These remain contributor conveniences. The canonical local service lifecycle is `pairflow ui start|status|restart|stop`.

## What the UI is for

Use the UI to monitor active bubbles across repositories, inspect state, and handle human decision points. The CLI remains the protocol and lifecycle authority.
