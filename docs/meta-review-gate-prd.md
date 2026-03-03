# Meta Review Gate PRD (External Second-Pass Review)

**Date:** 2026-03-03
**Status:** Proposed
**Owner:** Pairflow Core
**Type:** Product feature request

## Summary

Add a first-class **Meta Review Gate** to Pairflow as an explicit step between internal bubble convergence and final human approval.

Goal:
1. Preserve the speed and quality of the in-bubble implementer/reviewer loop.
2. Add an independent, deterministic second-pass audit layer.
3. Prevent approval decisions from depending on ad-hoc trust in manual external review.

## Problem Statement

Current flow in practice:
1. Bubble converges to `READY_FOR_APPROVAL`.
2. Human can approve or request rework.
3. Some operators run an additional manual "meta review" outside Pairflow (often via another assistant).

Pain points:
1. The external review is valuable but not formalized.
2. Findings from this external pass are not represented as first-class artifacts in bubble state.
3. Approval can proceed even when process-governance gaps exist (for example evidence artifact mismatch, cross-doc drift).
4. The same checks are repeated manually across bubbles, with no standard gate, schema, or metrics.

## Why This Is Not Duplicate of Internal Reviewer

### Internal Bubble Reviewer (existing)
Focus:
1. Task-local correctness and convergence in the bubble's scoped change.
2. Code/document review inside the implementer/reviewer loop.
3. Findings from round-local evidence and scoped diffs.

### Meta Reviewer (new)
Focus:
1. Independent second-pass audit over the bubble package.
2. Governance/process consistency checks across artifacts and summaries.
3. Cross-document and cross-bubble consistency checks when relevant.
4. Approval-readiness validation as a gate, not just advisory text.

Both are needed. They solve different failure modes.

## Goals

1. Make external second-pass review a native Pairflow concept.
2. Produce machine-readable meta-review artifacts.
3. Support policy modes: disabled, advisory, required.
4. Integrate with existing lifecycle without breaking current flows.
5. Improve auditability and reduce subjective approval variance.

## Non-Goals

1. No replacement of the internal reviewer loop.
2. No forced multi-agent redesign in MVP.
3. No requirement for a new model provider in MVP.
4. No mandatory UI in phase 1 (CLI-first acceptable).

## User Stories

1. As an operator, I want Pairflow to run a structured second-pass review so I do not rely on memory and ad-hoc trust.
2. As an approver, I want to see whether approval is blocked by governance findings vs functional findings.
3. As a team lead, I want historical metrics on how often meta-review catches issues missed by internal review.
4. As a compliance-oriented team, I want deterministic evidence-policy checks before approval.

## Proposed Lifecycle Integration

### Option A (recommended): New explicit state

State extension:
1. `READY_FOR_APPROVAL` (internal loop converged)
2. `READY_FOR_META_REVIEW`
3. `META_REVIEW_RUNNING`
4. `READY_FOR_APPROVAL` (final, post-meta-review)

Transition outline:
1. `RUNNING -> READY_FOR_META_REVIEW` when internal convergence is accepted.
2. `READY_FOR_META_REVIEW -> META_REVIEW_RUNNING` when meta review starts.
3. `META_REVIEW_RUNNING -> READY_FOR_APPROVAL` when meta package is complete.
4. `READY_FOR_APPROVAL -> RUNNING` on human `rework`.
5. `READY_FOR_APPROVAL -> APPROVED_FOR_COMMIT` on human `approve`.

### Option B (lower-change): Gate field without state split

Keep state as `READY_FOR_APPROVAL`, add gating fields:
1. `meta_review.required`
2. `meta_review.status = missing|running|pass|fail`
3. `meta_review.findings_count`

Approval command enforcement checks the gate fields.

## Policy Modes

Configuration (`bubble.toml` or repo policy):
1. `meta_review_mode = off`
2. `meta_review_mode = advisory`
3. `meta_review_mode = required`

Behavior:
1. `off`: no meta-review command required.
2. `advisory`: meta-review report visible, but does not block approval.
3. `required`: approval blocked until meta-review status is `pass` or explicit override.

## Meta Review Input Surface

Required inputs:
1. Bubble transcript tail and round summaries.
2. Worktree status and diff (`main...HEAD`).
3. Done package.
4. Reviewer verification artifact(s).
5. Evidence logs referenced by implementer/reviewer.
6. Task and parent-plan refs from bubble artifacts.

Optional inputs:
1. Cross-bubble referenced task files.
2. Repository docs for source-of-truth validation.

## Meta Review Check Classes

The meta-review engine must classify findings by class and severity.

### Class 1: Evidence and Governance Consistency

Checks:
1. Summary claims vs verifier artifact status consistency.
2. Required command evidence present and machine-verifiable.
3. Trusted/untrusted evidence state explicitly surfaced.

### Class 2: Scope and Packaging Integrity

Checks:
1. Scope compliance (docs-only vs code changes, etc.).
2. Worktree cleanliness and commit hygiene.
3. Staged/untracked packaging gaps.

### Class 3: Cross-Document Consistency

Checks:
1. Task doc vs parent plan drift.
2. Contract mismatch across phase files.
3. Terminology/schema mismatch that can mislead implementation.

### Class 4: Handoff Clarity and Ownership

Checks:
1. Read vs write owner path classification.
2. Sequencing dependency clarity.
3. Acceptance criteria completeness and gating symmetry.

### Class 5: Residual Risk/Readiness

Checks:
1. Is the artifact implementation-ready for next phase?
2. Are non-blocking risks clearly isolated as P3 notes?
3. Is there any hidden blocker misclassified as advisory?

## Findings Model

Meta-review findings reuse existing severity levels (`P0`-`P3`) and add class tags.

Example finding shape:

```json
{
  "id": "mr_f_001",
  "severity": "P2",
  "class": "evidence_governance",
  "title": "Verifier status untrusted while summary claims clean validation",
  "refs": [
    "artifact://reviewer-test-verification.json"
  ],
  "blocking": true,
  "action": "Align required command map and attach machine-verifiable logs"
}
```

## Artifacts

Write two artifacts per meta-review run:

1. `artifacts/meta-review.json` (machine-readable)
2. `artifacts/meta-review.md` (human-readable)

`meta-review.json` minimum schema:
1. `schema_version`
2. `bubble_id`
3. `run_id`
4. `policy_mode`
5. `status` (`pass|fail|advisory_pass|advisory_fail`)
6. `findings` (array)
7. `blocking_findings_count`
8. `inputs` (refs and hashes)
9. `generated_at`

## CLI/API Additions (MVP)

### CLI

1. `pairflow bubble meta-review --id <id> [--mode deep|standard]`
   - Generates meta-review artifacts.
2. `pairflow bubble meta-review-status --id <id> --json`
   - Returns status and summary counts.
3. `pairflow bubble approve --id <id>`
   - In `required` mode, fails if meta-review gate not satisfied.

### API (if UI uses backend)

1. `POST /api/bubbles/:id/meta-review`
2. `GET /api/bubbles/:id/meta-review`

## Approval Enforcement Rules

For `meta_review_mode=required`:
1. `approve` allowed only if:
   - meta-review exists,
   - `status=pass`,
   - no blocking findings.
2. If fail:
   - approval rejected with explicit failing classes.
3. Optional override:
   - `approve --override-meta-review --reason "..."`
   - must be audited and visible in status.

## Reviewer vs Meta Reviewer Role Contract

1. Internal reviewer remains task-local and loop-focused.
2. Meta reviewer remains package-level and governance-focused.
3. Meta reviewer should not reopen low-value style-only loops unless policy marks them blocking.
4. Meta reviewer output must clearly separate:
   - reused bubble findings,
   - newly discovered findings.

## UI Implications (Phase 2)

Bubble card additions:
1. `Meta review: missing|running|pass|fail` badge.
2. Blocking class chips (evidence, drift, scope, handoff).
3. "Open meta-review report" action.

Approval panel additions:
1. Required mode gate warning.
2. Override path with mandatory reason.

## Metrics

Track per bubble:
1. `meta_review_triggered` (bool)
2. `meta_review_duration_ms`
3. `meta_review_new_findings_count` (not previously in internal summary)
4. `meta_review_blocking_count`
5. `approval_blocked_by_meta_review` (bool)
6. `override_used` (bool)

Track fleet-level:
1. % bubbles where meta-review found new P1/P2.
2. % bubbles where only governance gaps were found.
3. Rework rate reduction or increase post-introduction.
4. Time-to-approval delta with and without meta-review.

## Rollout Plan

### Phase 1 (CLI + artifact, advisory default)
1. Implement command and artifact schemas.
2. Add status fields.
3. No approval blocking by default.

### Phase 2 (policy gating)
1. Enable `required` mode enforcement.
2. Add override audit path.

### Phase 3 (UI support)
1. Show meta-review state and findings in dashboard.
2. Add quick-actions for rework and report navigation.

## Acceptance Criteria

1. Meta-review can be run on any bubble in `READY_FOR_APPROVAL` (or equivalent final pre-approval state).
2. `meta-review.json` and `meta-review.md` are always generated with deterministic schema.
3. In `required` mode, `approve` is blocked when meta-review fails.
4. Meta-review report separates reused findings vs newly identified findings.
5. Evidence-governance mismatch cases are consistently detected.
6. Cross-doc drift checks can flag task/plan contract mismatches.
7. Metrics are emitted for all meta-review runs.
8. Existing bubbles still function unchanged when `meta_review_mode=off`.

## Risks and Mitigations

1. Risk: extra latency before approval.
   - Mitigation: advisory default, deep mode optional, caching input snapshots.
2. Risk: duplicate findings noise.
   - Mitigation: dedupe by finding signature and mark source (`internal` vs `meta_new`).
3. Risk: too strict gate harms throughput.
   - Mitigation: three policy modes + auditable override.
4. Risk: scope creep into full second reviewer loop.
   - Mitigation: keep meta-review package-level, not round-level.

## Open Questions

1. Should meta-review always run automatically, or only on demand/user request?
2. Should meta-review support provider choice (`codex|claude|auto`) in MVP?
3. Is override allowed only for admins, or any approver with reason?
4. Should required mode be global default for `accuracy_critical=true` bubbles?

## Suggested Initial Defaults

1. `meta_review_mode=advisory`
2. Auto-run on transition to pre-approval state.
3. Blocking only on `P0/P1` in advisory, full policy in required mode.
4. Enable required mode first for high-risk repos/bubbles.
