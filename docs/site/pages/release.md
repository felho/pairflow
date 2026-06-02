---
title: Release Semantics
description: Guarded Pairflow release, changelog, tag, and npm publish semantics.
order: 7
---

# Release semantics

Pairflow release authority comes from conventional content commits, package metadata, Release Please configuration, and guarded publish workflows.

## Version and tag authority

- Package: `{{PACKAGE_NAME}}`
- Repository version: `{{PACKAGE_VERSION}}`
- Release tag shape: `v<semver>`
- Changelog surface: `CHANGELOG.md`

Release Please owns version and changelog updates after the configured automation boundary.

## Commit authority

Release-relevant commits should use conventional first-line messages such as:

```text
feat(cli): add an operator command
fix(runtime): fail closed on invalid state
docs(site): update onboarding docs
```

Pairflow lifecycle finalization messages are not semver or changelog authority.

## npm publish guard

The npm publish workflow is guarded. A real publish requires the GitHub-controlled publish enablement variable, the protected environment, `NPM_TOKEN`, tag/version agreement, release validation, and duplicate-publish preflight checks.

Until the release pilot opens and proves that path, docs should describe npm install as the intended user path, not as completed public publish proof.
