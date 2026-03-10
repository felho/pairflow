---
artifact_type: task
artifact_id: task_pairflow_convergence_summary_evidence_hardening_phase1_v1
title: "Pairflow Convergence Summary + Evidence Trust Hardening (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/agent/pass.ts
  - src/core/convergence/policy.ts
  - src/core/reviewer/testEvidence.ts
  - tests/core/agent/pass.test.ts
  - tests/core/convergence/policy.test.ts
  - tests/core/reviewer/testEvidence.test.ts
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Pairflow Convergence Summary + Evidence Trust Hardening (Phase 1)

## L0 - Policy

### Goal

Eliminate two deterministic safety gaps in reviewer PASS and convergence flow:
1. Summary wording must not bypass finding consistency when `payload.findings=[]`.
2. `trusted` test-evidence classification must require canonical, non-bypassable provenance.

### Context

Observed failure patterns:
1. Previous reviewer PASS summary claims findings/severity, while payload declares clean (`findings=[]`), creating non-deterministic convergence outcomes.
2. Verification can become `trusted` from non-canonical refs (for example prose artifacts), weakening evidence trust.

### In Scope

1. Deterministic summary-vs-payload consistency rules for reviewer clean PASS and convergence gate.
2. Strict `trusted` evidence provenance policy that accepts only canonical execution logs.
3. Explicit fail-closed behavior when provenance cannot be verified.
4. Tests that directly prove rule enforcement and non-regression.

### Out of Scope

1. Task/spec markdown rewrites outside this task file.
2. Historical transcript migration.
3. Any change to blocker semantics (`P0/P1`, `timing`, `layer`) outside summary/payload consistency and evidence provenance hardening.

### Backward Compatibility Assumptions (Required)

1. Structured findings remain canonical (`payload.findings` is source of truth for finding content).
2. Existing docs-only runtime-check skip policy remains unchanged.
3. Existing `untrusted` classification path (`decision=run_checks`, `reason_code=evidence_unverifiable`) remains valid for unverifiable provenance.

### Normative Rule Set (Deterministic)

| Rule ID | Rule | Applies To | Required Outcome |
|---|---|---|---|
| R1 | Reviewer clean PASS (`--no-findings`) summary MUST NOT assert positive findings or severity-bearing findings. | reviewer PASS validation | Fail-fast reject with actionable message. |
| R2 | Convergence MUST block if previous reviewer PASS has `findings=[]` but summary still asserts findings/severity. | convergence policy | Deterministic block (no style-based bypass). |
| R3 | `trusted` evidence requires canonical log-backed refs only (`.pairflow/evidence/*.log`, canonicalized within repo/worktree scope). | evidence classifier | Non-canonical refs cannot produce `trusted`. |
| R4 | `trusted` evidence additionally requires verifiable command completion marker (explicit exit/success marker). | evidence classifier | Missing marker -> `untrusted/run_checks`. |
| R5 | Any provenance ambiguity or source-policy failure is fail-closed. | evidence source policy | `untrusted/run_checks`, `reason_code=evidence_unverifiable`. |

### Summary Finding-Assertion Detection Contract (Deterministic)

R1/R2 assertion detection MUST use deterministic normalized-text matching:
1. Normalize summary with lowercase + whitespace collapse before scanning.
2. Split normalized summary into deterministic clause units using separators: `.`, `;`, newline, and contrast conjunction boundaries (`but`, `however`, `yet`).
3. Apply exclusion guards per clause before positive marker classification:
   - E1 negation guard: phrases indicating explicit absence of findings (for example `no findings`, `no findings present`, `without findings`, `findings: 0`).
   - E2 zero-count guard: severity count forms with zero (for example `0xP2`, `0 P2 findings`, `P2 count 0`, `P2 count: 0`).
   - Guard catalog policy: E1/E2 list is closed in Phase 1. Any guard-list extension requires explicit task-contract update plus dedicated tests on both reviewer-path (R1) and convergence-path (R2).
4. Marker classes are closed for Phase 1 (implementation may extend only with explicit tests):
   - M1 numeric severity count claim with positive count only (`count > 0`),
   - M2 severity+finding co-mention claim with positive finding implication (for example `P2 findings remain`, `P3 findings require follow-up`, `P1 findings still open`),
   - M3 explicit finding-presence claim (`findings present`, `has findings`, `contains findings`, `open findings`) only when not negated by E1.
5. Guard interaction semantics (deterministic):
   - within the same clause, E1/E2 suppresses M1/M2/M3 matches for that clause,
   - suppression is clause-local only; it does not suppress markers in other clauses.
6. Classification outcome:
   - `summary_asserts_findings=true` if at least one unsuppressed M1/M2/M3 match exists in any clause,
   - otherwise `summary_asserts_findings=false`.
7. Mixed negation+positive summary semantics:
   - if one clause is negated (`no findings`) but another clause has unsuppressed positive marker (`P2 findings remain`), final classification is `true`.
8. Clean PASS (`--no-findings`) + `summary_asserts_findings=true` is a hard reject (R1).
9. Previous reviewer clean payload (`findings=[]`) + `summary_asserts_findings=true` is a hard convergence block (R2).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract Delta | Rules | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/core/agent/pass.ts` | reviewer PASS input validation | In `--no-findings` path, reject summary-level finding/severity claims using deterministic clause-scoped marker logic (M1-M3) with E1/E2 exclusion guards. | R1 | P1 | T1, T2, T9, T10, T13 |
| CS2 | `src/core/convergence/policy.ts` | summary/payload consistency gate | Block convergence whenever previous reviewer summary implies findings but payload is clean, using the same clause-scoped marker/guard semantics as reviewer PASS validation. | R2 | P1 | T3, T4, T11, T12, T14 |
| CS3 | `src/core/reviewer/testEvidence.ts` | source policy + classify | `trusted` allowed only for canonical `.pairflow/evidence/*.log` refs with verifiable completion marker; success output must be `status=trusted`, `decision=skip_full_rerun`; fail-closed on ambiguity/IO-policy uncertainty. | R3, R4, R5 | P1 | T5, T6, T7, T8 |
| CS4 | `tests/core/agent/pass.test.ts` | reviewer PASS tests | Add marker-level tests for summary-only finding claims under `--no-findings` (M1 positive count, M2 co-mention, E1/E2 exclusion, mixed clause behavior). | R1 | P1 | T1, T2, T9, T10, T13 |
| CS5 | `tests/core/convergence/policy.test.ts` | convergence consistency tests | Add style-variant summary claims and E1/E2 exclusion coverage on convergence path to ensure R2 parity with reviewer PASS path, including mixed-clause parity case. | R2 | P1 | T3, T4, T11, T12, T14 |
| CS6 | `tests/core/reviewer/testEvidence.test.ts` | evidence trust tests | Prove non-log/prose refs and marker-missing refs cannot become `trusted`; canonical log + explicit exit marker can become `trusted`; ambiguity/IO path is fail-closed. | R3, R4, R5 | P1 | T5, T6, T7, T8 |

### 2) Data/Behavior Contract

1. `payload.findings` remains canonical finding source; summary is supporting text and cannot introduce new finding truth.
2. For reviewer clean PASS (`--no-findings`), summary must be claim-free regarding findings/severity.
3. Convergence decision for previous reviewer clean PASS is invariant to summary writing style.
4. `trusted` evidence is allowed only when all required verified command evidence is ref-backed by canonical execution logs.
5. Summary text, done-package files, JSON artifacts, and other non-log refs cannot satisfy trusted command provenance.
6. If provenance is missing, non-canonical, unreadable, or marker-unverifiable, classification must be `untrusted` with `run_checks`.
7. Trusted success-path contract is explicit and required: when all trust requirements pass, output must be `status=trusted` and `decision=skip_full_rerun`.

### 3) Error/Fallback Contract

| Trigger | Behavior | Fallback | Expected Code/Decision |
|---|---|---|---|
| Reviewer clean PASS summary asserts findings/severity | Reject PASS immediately with correction guidance. | None (hard reject). | PASS validation failure (existing invalid-findings code path allowed). |
| Previous reviewer clean PASS summary conflicts with payload | Block convergence deterministically. | None (hard block). | Convergence policy error message for summary/payload inconsistency. |
| Ref provenance non-canonical or unverifiable | Do not classify as trusted. | Fail-closed to untrusted. | `status=untrusted`, `decision=run_checks`, `reason_code=evidence_unverifiable`. |
| Source policy/IO ambiguity | Never optimistic-pass trust. | Fail-closed to untrusted. | Same as above. |
| Canonical log-backed evidence + verifiable completion marker | Classify as trusted success path. | None. | `status=trusted`, `decision=skip_full_rerun`. |

## L2 - Verification Plan

### Test Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | Clean PASS contradiction (numeric claim) | reviewer `--no-findings` | summary: `2xP2 findings` | PASS rejected (R1) |
| T2 | Clean PASS contradiction (M2 severity+finding co-mention) | reviewer `--no-findings` | summary: `P3 findings require follow-up` | PASS rejected (R1) |
| T3 | Convergence consistency, severity wording variant | previous reviewer PASS has `findings=[]` | summary includes severity-style finding claim | convergence blocked (R2) |
| T4 | Convergence consistency, generic finding-presence wording | previous reviewer PASS has `findings=[]` | summary says `findings present`/equivalent | convergence blocked (R2) |
| T5 | Strict provenance reject: non-log ref | ref points to markdown/json artifact | evidence classification | `untrusted/run_checks` (R3,R5) |
| T6 | Strict provenance reject: canonical log path but unverifiable marker | ref under `.pairflow/evidence/*.log` but no verifiable exit marker | evidence classification | `untrusted/run_checks` (R4,R5) |
| T7 | Strict provenance accept: canonical log + verifiable marker | ref under `.pairflow/evidence/*.log` with explicit exit marker | evidence classification | `trusted/skip_full_rerun` (R3,R4) |
| T8 | Fail-closed on source-policy/IO ambiguity | ref candidate cannot be canonicalized/read deterministically | evidence classification | `untrusted/run_checks` (R5) |
| T9 | Reviewer-path negation guard prevents false positive | reviewer `--no-findings` | summary: `no findings present` | `summary_asserts_findings=false`; no R1 reject from marker path |
| T10 | Reviewer-path zero-count guard prevents false positive | reviewer `--no-findings` | summary: `0xP2 findings` | `summary_asserts_findings=false`; no R1 reject from marker path |
| T11 | Convergence-path negation guard parity | previous reviewer PASS has `findings=[]` and all other convergence preconditions satisfied | summary: `no findings present` | R2 consistency gate does not block on summary contradiction path |
| T12 | Convergence-path zero-count guard parity | previous reviewer PASS has `findings=[]` and all other convergence preconditions satisfied | summary: `0xP2 findings` | R2 consistency gate does not block on summary contradiction path |
| T13 | Mixed clause semantics (negation + positive) | reviewer `--no-findings` | summary: `no findings in area A, but P2 findings remain in area B` | `summary_asserts_findings=true`; PASS rejected (R1) |
| T14 | Convergence-path mixed clause parity | previous reviewer PASS has `findings=[]` and all other convergence preconditions satisfied | summary: `no findings in area A, but P2 findings remain in area B` | `summary_asserts_findings=true`; R2 consistency gate blocks convergence |

### Acceptance Criteria

1. AC1: Reviewer clean PASS rejects summary-level finding/severity claims (fail-fast).
2. AC2: Convergence clean-pass consistency cannot be bypassed by summary wording style.
3. AC3: `trusted` evidence classification is possible only when canonical log-backed provenance and verifiable completion marker are both satisfied; required success output is `status=trusted`, `decision=skip_full_rerun`; otherwise trust is denied.
4. AC4: Any provenance ambiguity/failure is fail-closed to `untrusted/run_checks`.
5. AC5: Test coverage maps directly to every normative rule (R1-R5) without gaps.

### Traceability Matrix (Required)

| Acceptance Criterion | Rules | Tests | Call-sites |
|---|---|---|---|
| AC1 | R1 | T1, T2, T9, T10, T13 | CS1, CS4 |
| AC2 | R2 | T3, T4, T11, T12, T14 | CS2, CS5 |
| AC3 | R3, R4 | T5, T6, T7 | CS3, CS6 |
| AC4 | R5 | T5, T6, T8 | CS3, CS6 |
| AC5 | R1-R5 | T1-T14 | CS1-CS6 |
