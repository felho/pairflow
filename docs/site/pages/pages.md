---
title: GitHub Pages
description: Local docs build and externally activated GitHub Pages publication boundary.
order: 8
---

# GitHub Pages publication

The repository provides a deterministic local docs build and a GitHub Pages workflow. GitHub repository settings, permissions, domain configuration, and the final public URL are external activation surfaces.

## Local build

```bash
pnpm docs:build
```

The command reads `docs/site/pages/**`, package metadata, and repo documentation authority, then writes generated files to `docs/site-dist`.

`docs/site-dist` is generated output and is ignored by git.

## Workflow path

The Pages workflow runs the same local build command, uploads `docs/site-dist` as a Pages artifact, and deploys through GitHub's Pages action path.

It is triggered by pushes to `main`, GitHub release `published` events, and manual dispatch for verification.

## Activation boundary

A passing local build or committed workflow proves only repository-side configuration and artifact shape. It does not prove that repository Pages settings are enabled or that a public URL is live.
