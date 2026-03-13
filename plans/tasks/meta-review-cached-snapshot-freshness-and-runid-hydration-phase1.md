---
artifact_type: task
artifact_id: task_meta_review_cached_snapshot_freshness_runid_hydration_phase1_v1
title: "Meta-Review Cached Snapshot Freshness + Run-ID Hydration Consistency (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/bubble/metaReviewGate.ts
  - src/core/bubble/metaReview.ts
  - src/cli/commands/bubble/metaReview.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - docs/meta-review-gate-rollout-runbook.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Cached Snapshot Freshness + Run-ID Hydration Consistency (Phase 1)

## L0 - Policy

### Goal

Remove operator-facing inconsistency where cached meta-review surfaces can report stale "latest" data and null run identity in approval-ready state, especially on sticky human-gate bypass routes.

### Context (Observed Evidence)

1. Bubble evidence from `pairflow-four-issue-hardening-phase-3`:
   - state was `round=6`, `READY_FOR_HUMAN_APPROVAL`,
   - cached `meta-review last report` remained `round=3` with old timestamp.
2. Same context showed `meta_review.last_autonomous_run_id = null` while autonomous status/recommendation fields were populated.
3. Sticky bypass route (`human_gate_sticky_bypass`) can advance gate flow without new autonomous run submission, which makes cached "last autonomous" semantics ambiguous unless freshness is explicit.

### In Scope

1. Add deterministic freshness classification for cached meta-review snapshot/report surfaces.
2. Ensure run-id hydration is consistent when run identity can be recovered from canonical artifact metadata.
3. Prevent "latest" status output from silently presenting stale autonomous data as current.
4. Add tests for stale detection, run-id hydration, and CLI diagnostics.
5. Update runbook with operator interpretation rules.

### Out of Scope

1. Meta-review scoring/recommendation policy redesign.
2. Re-running autonomous meta-review on every sticky bypass.
3. Rewriting historical transcript/state artifacts.
4. Changing severity ontology or reviewer convergence policy.

### Safety Defaults

1. If freshness cannot be proven, status is treated as stale and surfaced explicitly.
2. If run-id cannot be proven, do not synthesize opaque IDs; surface deterministic diagnostic.
3. No silent downgrade from stale to fresh based on summary text heuristics.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Behavior changes are limited to meta-review state hydration + status/diagnostic rendering and tests.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReviewGate.ts` | sticky bypass gate route | `(input) -> MetaReviewGateResult` | `applyMetaReviewGateOnConvergence` sticky branch | On sticky bypass, read canonical report JSON artifact and pass enough metadata for freshness/run-id hydration path. | P1 | required-now | bubble evidence + T1,T2 |
| CS2 | `src/core/bubble/metaReviewGate.ts` | fallback snapshot hydration | `(current, nowIso, ...) -> BubbleStateSnapshot` | `transitionToGateState` fallback branch | Avoid persisting avoidable `last_autonomous_run_id=null` when canonical run identity exists in artifact snapshot path. | P1 | required-now | bubble evidence + T3 |
| CS3 | `src/core/bubble/metaReview.ts` | status view creation | `(bubbleId, snapshot, [optional freshness ctx]) -> MetaReviewStatusView` | `createMetaReviewStatusView` + status read path | Classify and expose stale-vs-fresh cached autonomous snapshot deterministically. | P2 | required-now | T1,T4 |
| CS4 | `src/cli/commands/bubble/metaReview.ts` | status/last-report text rendering | `(view, verbose) -> string` | `renderMetaReviewStatusText`, `renderMetaReviewLastReportText` | Print explicit freshness diagnostic in verbose mode (and concise stale marker in non-verbose mode). | P2 | required-now | T4,T5 |
| CS5 | `tests/*` | regression tests | `vitest` | listed test files | Lock stale detection, run-id hydration, and rendering behavior. | P1 | required-now | T1-T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Cached freshness semantics | implicit, operator inferred | explicit stale/fresh classification | `meta_review.last_autonomous_updated_at`, state round/context | diagnostic reason text/code | additive, non-breaking | P1 | required-now |
| Run-id hydration semantics | may remain null in fallback route | hydrate from canonical report metadata when available | canonical report run-link field(s) | snapshot run_id fallback marker | behavior-tightening | P1 | required-now |
| CLI status/last-report output | no stale indicator | deterministic stale indicator | status lines | verbose details | additive | P2 | required-now |

Normative rules:
1. Cached autonomous view must not be treated as fresh when evidence indicates older round context.
2. If canonical report metadata contains a valid run-link ID and snapshot run ID is null, hydrate run ID from canonical metadata.
3. If freshness/run-id proof fails, surface deterministic diagnostics; do not crash commands.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State hydration | update cached meta-review fields deterministically | synthetic/random run-id generation for missing data | hydration must be auditable | P1 | required-now |
| CLI diagnostics | additive stale markers and reasons | hiding stale state behind "latest" wording | operator clarity first | P2 | required-now |
| Artifact reads | bounded, fail-safe reads of canonical JSON report | throwing uncaught parse/read exceptions in status path | diagnostics over crash | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Cached report context older than active round context | state + report artifact | result | mark stale, include stale reason | `META_REVIEW_CACHED_STALE` | warn | P1 | required-now |
| Snapshot run ID null but canonical report has valid run-link ID | canonical report artifact | fallback | hydrate run ID from canonical metadata | `META_REVIEW_RUN_ID_HYDRATED` | info | P1 | required-now |
| Snapshot run ID null and canonical report has no valid run-link ID | canonical report artifact | result | keep null, mark diagnostic | `META_REVIEW_RUN_ID_UNAVAILABLE` | warn | P2 | required-now |
| Canonical report read/parse failure | filesystem/json parse | fallback | keep command output with stale/unavailable diagnostic | `META_REVIEW_REPORT_JSON_UNREADABLE` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing canonical artifact paths (`artifacts/meta-review-last.json`) | P1 | required-now |
| must-use | deterministic reason-coded diagnostics for stale/unavailable state | P1 | required-now |
| must-not-use | summary-text inference to infer freshness or run-id | P1 | required-now |
| must-not-use | best-effort silent coercion without exposed diagnostic | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Stale cached snapshot detection | state round context newer than cached report context | `meta-review status --verbose` view built | stale marker + deterministic reason present | P1 | required-now | automated test |
| T2 | Sticky bypass path keeps deterministic freshness context | sticky human gate bypass route | convergence gate persists approval route | no silent "fresh latest" misclassification | P1 | required-now | automated test |
| T3 | Run-id hydration from canonical report metadata | snapshot run_id null, report metadata has valid run-link id | hydration path executes | status view contains hydrated run id | P1 | required-now | automated test |
| T4 | Non-verbose status output still signals staleness | stale context | render status text | concise stale marker shown | P2 | required-now | automated test |
| T5 | Verbose status/last-report diagnostics | stale or unreadable context | render verbose output | includes explicit diagnostic reason code/text | P2 | required-now | automated test |
| T6 | Unreadable/malformed report JSON | invalid JSON artifact | status/last-report command executes | command does not crash; deterministic diagnostic emitted | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add a single shared helper to evaluate freshness across `status`, `last-report`, and future UI timeline cards.
2. [later-hardening] Add telemetry counters for stale snapshot frequency by route (`human_gate_sticky_bypass`, `human_gate_run_failed`, etc.).

## Assumptions

1. The P2 stale snapshot and P3 null run-id are likely related symptoms of sticky bypass + fallback hydration behavior, but task should remain valid even if root causes split later.
2. Additive diagnostics in CLI output are acceptable as non-breaking behavior change.

## Open Questions

1. Should stale cached autonomous status ever block `approve`, or remain operator-visible advisory only?
2. For run-id hydration, should `meta_review_run_id` and `findings_run_id` be treated as strictly identical canonical sources, or should precedence be codified?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Cross-surface stale semantics parity (CLI + UI timeline) | L2 | P2 | later-hardening | operator UX consistency | add shared presenter-level stale contract + UI test coverage |

## Review Control

1. Every finding in review must include `priority`, `timing`, `layer`, and test/reference evidence.
2. No new required-now items after round 2 without concrete failing test or deterministic runtime proof.
3. Stale/fresh classification rules must remain deterministic and free from prose heuristics.

## Spec Lock

Task is `IMPLEMENTABLE` when:
1. Cached stale state is always explicitly visible in status surfaces.
2. Run-id is hydrated when provable from canonical report metadata.
3. Missing/unreadable metadata paths remain fail-safe and diagnostic, not silent or crashing.
