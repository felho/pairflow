# Structural Enforcement Ideas

## Context

Pairflow currently covers implementer evidence handoff expectations well at prompt level (startup/resume/delivery guidance), and reviewer-side evidence verification already influences test execution directives.

However, several expectations are still soft-convention rather than hard protocol guarantees:

1. Implementer `pairflow pass` can be sent without evidence refs.
2. Partial validation ("subset ran") is mostly free-text in summary.
3. Missing evidence usually degrades trust, but does not always create deterministic command-level rejection.

This document captures structural enforcement ideas to make these behaviors deterministic and auditable.

## Goals

1. Reduce ambiguity in implementer handoff quality.
2. Make evidence completeness machine-verifiable.
3. Keep rollout safe via gradual policy modes.

## Ideas

### 1) Implementer PASS preflight validator

Add a preflight check in implementer-side `pairflow pass`:

1. Detect expected evidence logs under `.pairflow/evidence/` for declared checks.
2. Validate referenced files exist and are readable.
3. Return deterministic outcome:
   - `warn` mode: allow pass, attach warning metadata.
   - `strict` mode: reject pass with actionable error.

Why:
Moves from "prompt reminder" to protocol-level guardrail.

### 2) Structured validation payload in PASS

Extend PASS payload with machine-readable validation metadata, for example:

1. `validation_run`: per-check status (`pass|fail|skipped|not_run`)
2. `validation_refs`: per-check artifact refs
3. `validation_scope`: full vs partial run marker

Why:
Reviewer/orchestrator no longer needs to infer evidence status from free-text summary.

### 3) Explicit partial-run contract

When not all baseline checks ran, require explicit structured fields:

1. `skipped_checks`: list of skipped checks
2. `skip_reason`: concise reason per check (or shared reason)

Why:
Prevents silent under-validation and makes tradeoffs visible in transcript/reporting.

### 4) Reviewer convergence gate integration

Integrate evidence trust status into convergence policy:

1. If evidence is missing/unverifiable/stale, convergence can require extra conditions.
2. Optionally enforce minimum review rounds before convergence in low-trust evidence scenarios.

Why:
Aligns convergence confidence with validation confidence.

### 5) Configurable policy modes

Introduce global/repo policy mode:

1. `off`: no enforcement
2. `warn`: soft enforcement + warnings
3. `strict`: hard enforcement (reject invalid handoff)

Possible config surfaces:

1. `~/.pairflow/config.toml` (global default)
2. Bubble config override (per-bubble tuning)

Why:
Allows gradual adoption without breaking current workflows.

## Suggested rollout (high-level)

### Phase 1 (low risk)

1. Add structured validation payload (non-breaking, optional).
2. Add `warn` preflight validator.
3. Surface warnings in UI and transcript summary.

### Phase 2 (policy hardening)

1. Add `strict` mode with deterministic `pairflow pass` rejection rules.
2. Add convergence-policy coupling for low-trust evidence states.
3. Update metrics report to track enforcement outcomes.

## Open questions

1. Should strict mode require all baseline checks, or allow scoped baseline by task type?
2. Should implementer be able to override strict rejection with explicit human-approved bypass?
3. Where should schema versioning for new PASS payload fields live?
4. How much backward compatibility is needed for existing transcript readers?

