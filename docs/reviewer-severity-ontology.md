# Reviewer Severity Ontology (v1)

**Date:** 2026-02-28  
**Status:** Canonical policy (active)

## Purpose

This document is the canonical severity policy for reviewer findings.

Goals:
1. Keep `P0/P1/P2/P3` stable across rounds.
2. Prevent severity inflation and deflation.
3. Make reviewer decisions predictable and auditable.

## Scope

This ontology applies to reviewer findings in Pairflow loops.
It does not replace task acceptance criteria; it complements them.

## Runtime Reminder Block (Build Source)

The block below is the canonical source for runtime reviewer reminder text.
It is consumed by a build/codegen step and embedded into TypeScript so runtime
prompts do not depend on reading this markdown file from disk.

<!-- pairflow:runtime-reminder:start -->
- Blocker severities (`P0/P1`) require concrete evidence (repro, failing check output, or precise code-path proof).
- Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default.
- Cosmetic/comment-only findings are `P3`.
- Out-of-scope observations should be notes (`P3`), not mandatory fix findings.
<!-- pairflow:runtime-reminder:end -->

## Severity Definitions

| Severity | Meaning | Typical examples |
|---|---|---|
| `P0` | Critical blocker-level correctness/safety/runtime risk (highest urgency) | confirmed data loss path, critical security exposure, deterministic corruption/destructive behavior |
| `P1` | Blocker-level correctness/safety/runtime risk | data loss, crash, security issue, race condition, incorrect state transition, deterministic wrong behavior |
| `P2` | Real functional/quality gap, but not a blocker | missing edge-case handling, meaningful test gap, misleading logic with plausible future defect risk |
| `P3` | Non-blocking improvement | naming, comments, minor consistency/refactor/documentation cleanup |

## Evidence Requirement by Severity

### `P0` evidence (required)
At least one of:
1. Deterministic reproduction steps.
2. Concrete failing test or failing check output.
3. Precise code-path proof showing incorrect runtime behavior.

Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default.

### `P1` evidence (required)
At least one of:
1. Deterministic reproduction steps.
2. Concrete failing test or failing check output.
3. Precise code-path proof showing incorrect runtime behavior.

Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default.

### `P2` evidence (required)
1. Concrete functional or quality risk statement.
2. Traceable location/path.
3. Clear expected-vs-actual explanation.

### `P3` evidence (lightweight)
1. Localized suggestion and rationale.

## Stability Rules (Anti-Drift)

1. Cosmetic/comment-only findings cannot be `P2+`.
2. Severity cannot escalate across rounds without new evidence.
3. "Might be risky" claims are not `P0/P1` by default.
4. Out-of-scope observations default to note-level (`P3`/informational), not mandatory fix findings.
5. Reviewer should avoid contradictory follow-up direction unless new evidence justifies the change.

## Reviewer Output Contract

Each finding should include:
1. `severity`
2. `title`
3. `why_this_severity` (short)
4. `evidence` (repro/test/code-path)
5. `scope_link` (acceptance criterion or explicit risk category)

### Runtime PASS Evidence Binding

Reviewer PASS with any `P0/P1` finding must have evidence bound at finding level:
1. Preferred CLI form: `--finding "P1:Title|ref1,ref2"` (maps to `finding.refs`).
2. If a single ref contains a comma, escape it as `\,` inside the `--finding` value.
3. Envelope-level `--ref` values are optional generic artifacts only; they do not satisfy blocker finding evidence binding.
4. If a `P0/P1` finding has no finding-level refs, PASS is rejected.

## Decision Mapping

1. Any `P0/P1` present: reviewer should request a fix cycle.
2. Only `P2/P3`: reviewer should prefer convergence with notes (policy rollout dependent).
3. Clean: reviewer converges.

## Operational Use

This file is intended to be:
1. Referenced by optimization/tracker docs.
2. Reflected in reviewer prompt templates and handoff guidance.
3. Used as review calibration baseline in loop metrics analysis.
