# Contract Case Good Enough Checklist

Status: draft  
Owner: architecture/runtime  
Date: 2026-03-20

## Purpose

Operational checklist for ADR-005 baseline gate:

1. `1` happy-path triad per command.
2. `>=2` high-value guard/error triads per command.
3. `>=1` invariant triad per command (critical side effect, cleanup semantics, or mutation/no-op semantics).

## Scope

Release-relevant migrated command set:
`pass`, `kickoff`, `converged`, `approval`, `merge`, `commit`, `reply`, `askHuman`, `start`, `resume`, `stop`, `reconcile`.

## Current Baseline Status (2026-03-20)

| Command | Happy triad | Guard/error triads | Invariant triad | Baseline status | Main gap |
|---|---:|---:|---:|---|---|
| `pass` | yes | 0 | 0 | not-ready | Missing state/eligibility error triads and explicit side-effect invariant triad |
| `kickoff` | yes | 7+ | 1+ | ready | Keep stable; extend only incident-driven |
| `converged` | yes | 0 | 1+ | not-ready | Add at least 2 guard/error triads |
| `approval` | yes | 0 | 1+ | not-ready | Add override/eligibility error triads |
| `merge` | yes | 4 | 0 | near-ready | Add explicit cleanup invariant triad (`removedWorktree`/`removedBubbleBranch`) |
| `commit` | yes | 2 | 0 | near-ready | Add one invariant triad (done-package/staged-path safety) |
| `reply` | yes | 3 | 1+ | ready | Keep stable; extend only incident-driven |
| `askHuman` | yes | 3 | 1+ | ready | Keep stable; extend only incident-driven |
| `start` | yes | 2 | 2 | ready | Keep stable; extend only incident-driven |
| `resume` | yes | 1 | 0 | not-ready | Add one more guard/error triad + one invariant triad |
| `stop` | yes | 2 | 0 | near-ready | Add explicit cleanup invariant triad assertion |
| `reconcile` | yes | 0 | 2 | not-ready | Add at least 2 guard/error stale-reason triads |

## Priority Order To Reach Baseline

1. `approval` (high business-risk decision point).
2. `commit` (release safety path).
3. `merge` (repo lifecycle safety path).
4. `resume` and `reconcile`.
5. `converged` and `pass`.

## Suggested Minimal Next Batch

1. `approval`: add triads for `APPROVAL_OVERRIDE_REQUIRED` and `APPROVAL_OVERRIDE_REASON_REQUIRED`.
2. `commit`: add one invariant triad for done-package safety (`COMMIT_DONE_PACKAGE_*`).
3. `merge`: add one invariant triad asserting cleanup semantics on successful merge.

## Admission Rule After Baseline

After command set reaches baseline-ready, new case is added only if one is true:

1. new uncovered reason code,
2. new risk class,
3. real regression reproduction (`1 bug = 1 regression case`).
