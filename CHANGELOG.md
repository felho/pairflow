# Changelog

All notable changes to `@pairflow/cli` are recorded here.

This file is maintained by Release Please from accepted conventional commits.
Manual edits are limited to the initial baseline or release-tool recovery.

## [0.2.0](https://github.com/felho/pairflow/compare/v0.1.0...v0.2.0) (2026-06-08)

### Features

- **skills:** add skills install command ([e112082](https://github.com/felho/pairflow/commit/e11208243155a4fd08bbd6421ec64ca4eaaadbde))
- **ui:** add service lifecycle commands ([7fd1a30](https://github.com/felho/pairflow/commit/7fd1a300fa1ed150aa6c47f72cdd71051d891b1b))

### Bug Fixes

- **release:** align release validator with skill packaging ([3d6b58b](https://github.com/felho/pairflow/commit/3d6b58b70790cce994829c5bfc7e8044d4aa9ced))
- **start:** inject codex mcp resolver ([a460eb3](https://github.com/felho/pairflow/commit/a460eb31e9b827003d13338f96ee5e6565ae7851))

### Release Process

- Stabilized the release validation path by isolating CI-sensitive UI retry
  tests and aligning local checks with GitHub Actions behavior.

## 0.1.0

Initial local package baseline for Pairflow release automation.
