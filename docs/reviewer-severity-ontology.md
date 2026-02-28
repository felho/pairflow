# Reviewer Severity Ontology (v1)

**Date:** 2026-02-28  
**Status:** Canonical policy (active)

## Purpose

This document is the canonical severity policy for reviewer findings.

Goals:
1. Keep `P1/P2/P3` stable across rounds.
2. Prevent severity inflation and deflation.
3. Make reviewer decisions predictable and auditable.

## Scope

This ontology applies to reviewer findings in Pairflow loops.
It does not replace task acceptance criteria; it complements them.

## Severity Definitions

| Severity | Meaning | Typical examples |
|---|---|---|
| `P1` | Blocker-level correctness/safety/runtime risk | data loss, crash, security issue, race condition, incorrect state transition, deterministic wrong behavior |
| `P2` | Real functional/quality gap, but not a blocker | missing edge-case handling, meaningful test gap, misleading logic with plausible future defect risk |
| `P3` | Non-blocking improvement | naming, comments, minor consistency/refactor/documentation cleanup |

## Evidence Requirement by Severity

### `P1` evidence (required)
At least one of:
1. Deterministic reproduction steps.
2. Concrete failing test or failing check output.
3. Precise code-path proof showing incorrect runtime behavior.

Without `P1` evidence, downgrade to `P2` by default.

### `P2` evidence (required)
1. Concrete functional or quality risk statement.
2. Traceable location/path.
3. Clear expected-vs-actual explanation.

### `P3` evidence (lightweight)
1. Localized suggestion and rationale.

## Stability Rules (Anti-Drift)

1. Cosmetic/comment-only findings cannot be `P2+`.
2. Severity cannot escalate across rounds without new evidence.
3. "Might be risky" claims are not `P1` by default.
4. Out-of-scope observations default to note-level (`P3`/informational), not mandatory fix findings.
5. Reviewer should avoid contradictory follow-up direction unless new evidence justifies the change.

## Reviewer Output Contract

Each finding should include:
1. `severity`
2. `title`
3. `why_this_severity` (short)
4. `evidence` (repro/test/code-path)
5. `scope_link` (acceptance criterion or explicit risk category)

## Decision Mapping

1. Any `P1` present: reviewer should request a fix cycle.
2. Only `P2/P3`: reviewer should prefer convergence with notes (policy rollout dependent).
3. Clean: reviewer converges.

## Operational Use

This file is intended to be:
1. Referenced by optimization/tracker docs.
2. Reflected in reviewer prompt templates and handoff guidance.
3. Used as review calibration baseline in loop metrics analysis.

