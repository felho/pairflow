---
artifact_type: task
artifact_id: task_pairflow_summary_claim_canonicalization_foundation_phase1_v1
title: "Pairflow Summary-Claim Canonicalization Foundation (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/protocol.ts
  - src/core/agent/pass.ts
  - src/core/convergence/policy.ts
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/protocol/resumeSummary.ts
  - tests/core/agent/pass.test.ts
  - tests/core/convergence/policy.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - docs/meta-review-gate-rollout-runbook.md
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Pairflow Summary-Claim Canonicalization Foundation (Phase 1)

## L0 - Policy

### Goal

Introduce a canonical, structured findings-claim contract so gate-critical behavior does not depend on free-form summary parsing.

### Problem Statement

1. Current contradiction/parity checks still consume natural-language summaries in multiple paths.
2. Regex-based guard expansion creates open-ended edge-case growth and review-loop churn.
3. We need deterministic claim semantics that scale to Phase 3 parity/audit logic.

### In Scope

1. Define structured findings-claim fields on protocol payloads and meta-review artifacts.
2. Drive gate decisions from structured claim fields first.
3. Keep free-form summary parsing only as compatibility diagnostics during transition.
4. Add deterministic tests for claim-state routing and fail-closed behavior.

### Out of Scope

1. Full removal of existing summary evaluator in one step.
2. Historical transcript migration/rewrite.
3. UI redesign unrelated to claim semantics.

### Canonical Claim Contract

1. `findings_claim_state` enum:
   - `clean`
   - `open_findings`
   - `unknown`
2. `findings_claim_source` enum:
   - `payload_flags`
   - `payload_findings_count`
   - `legacy_summary_parser`
   - `meta_review_artifact`
3. Gate-critical paths must treat `unknown` as fail-closed where positive-claim parity is required.

## L1 - Change Contract

### Rules

| Rule ID | Rule | Required Outcome |
|---|---|---|
| C1 | Claim-state must be computable deterministically from structured payload signals. | Same input yields same state/source across runs. |
| C2 | Phase 2 contradiction gates must prefer structured claim-state over prose parsing. | No new parser-only bypass in gate-critical decision. |
| C3 | Phase 3 parity checks must require structured positive claim linkage to findings artifact/run-id. | Missing/mismatch remains fail-closed with explicit reason codes. |
| C4 | Legacy summary parser remains compatibility-only and cannot be sole source for final approval gates. | Parser false positives/negatives cannot directly decide approval routes alone. |

### Call-site Matrix

| ID | File | Contract Delta | Priority |
|---|---|---|---|
| CC1 | `src/types/protocol.ts` | Add structured claim fields and typing contracts. | P1 |
| CC2 | `src/core/agent/pass.ts` | Emit claim-state/source from reviewer PASS payload contract. | P1 |
| CC3 | `src/core/convergence/policy.ts` | Consume claim-state/source first; keep parser as diagnostic fallback only. | P1 |
| CC4 | `src/core/bubble/metaReview.ts` | Persist claim-state/source in report/artifact metadata. | P1 |
| CC5 | `src/core/bubble/metaReviewGate.ts` | Route parity checks from structured claim contract. | P1 |
| CC6 | `src/core/protocol/resumeSummary.ts` | Render concise structured-claim diagnostics. | P2 |
| CC7 | tests listed in frontmatter | Add deterministic claim-state, fallback, and fail-closed tests. | P1 |

### Error and Fallback Contract

| Trigger | Behavior | Reason Code |
|---|---|---|
| claim-state missing in required path | fail-closed | `CLAIM_STATE_REQUIRED` |
| claim-source invalid/unknown in required path | fail-closed | `CLAIM_SOURCE_INVALID` |
| structured positive claim but findings artifact missing | fail-closed | `META_REVIEW_FINDINGS_ARTIFACT_REQUIRED` |
| structured positive claim parity mismatch | fail-closed | `META_REVIEW_FINDINGS_COUNT_MISMATCH` |
| compatibility parser disagrees with structured claim | keep structured decision, emit diagnostic | `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC` |

## L2 - Execution and Validation

### Delivery Order

1. Add protocol/type contract first (`CC1`).
2. Wire PASS + convergence claim-state emission/consumption (`CC2`, `CC3`).
3. Wire meta-review/parity flow to structured claim (`CC4`, `CC5`).
4. Update resume/diagnostics and runbook (`CC6`).
5. Land full deterministic tests (`CC7`).

### Required Validation

1. `pnpm typecheck`
2. `pnpm exec vitest run tests/core/agent/pass.test.ts tests/core/convergence/policy.test.ts`
3. `pnpm exec vitest run tests/core/bubble/metaReview.test.ts tests/core/bubble/metaReviewGate.test.ts`
4. `pnpm build`

### Acceptance Criteria

1. AC1: Structured claim fields exist end-to-end in payload/report/gate diagnostics.
2. AC2: Convergence/approval-critical routes do not depend on prose parsing as primary decision input.
3. AC3: Positive claim parity and run-linkage remain deterministic and fail-closed.
4. AC4: Compatibility parser divergences are observable diagnostics, not silent behavior changes.
