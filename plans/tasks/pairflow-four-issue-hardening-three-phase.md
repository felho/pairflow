---
artifact_type: task
artifact_id: task_pairflow_four_issue_hardening_three_phase_v1
title: "Pairflow Reviewer/Convergence/Meta-Review Hardening (Four Issues, Three Phases)"
status: draft
phase: phase1-phase3
target_files:
  - src/core/reviewer/testEvidence.ts
  - src/core/agent/pass.ts
  - src/core/convergence/policy.ts
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/human/approval.ts
  - src/core/protocol/resumeSummary.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/types/protocol.ts
  - tests/core/reviewer/testEvidence.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/convergence/policy.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/human/approval.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - docs/meta-review-gate-rollout-runbook.md
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Pairflow Reviewer/Convergence/Meta-Review Hardening (Four Issues, Three Phases)

## L0 - Policy

### Goal

Close four distinct but related reliability/safety gaps in reviewer evidence trust, summary consistency, and meta-review round continuity with a phased delivery model that keeps blast radius controlled and testable.

### Superseded Task Intents (Consolidated)

This task consolidates the intent previously split across:
1. `pairflow-convergence-summary-evidence-hardening-phase1.md` (renamed into this file)
2. `reviewer-untrusted-command-alias-normalization-phase1.md`
3. `meta-review-findings-artifactization-and-round-continuity-phase1.md`

### Four Issue Registry (Canonical)

| Issue ID | Name | Symptom | Risk |
|---|---|---|---|
| I1 | Summary/Payload Finding-Consistency Bypass | Summary can imply findings while payload has `findings=[]`. | Non-deterministic convergence and ambiguous PASS correctness. |
| I2 | Trusted Provenance False Positive | `trusted` may be inferred from non-canonical/non-log refs. | Safety downgrade in evidence trust model. |
| I3 | Command Alias False Negative | Canonical checks executed, but alias text (`tsc --noEmit`, `vitest run`, `pnpm run test`) causes `evidence_missing`. | Unnecessary reruns and incorrect `untrusted` outcomes. |
| I4 | Meta-Review Findings Artifact Gap | Summary claims positive findings but no canonical structured findings artifact for that run. | Round-to-round continuity loss; no auditable mapping of open findings. |

### In Scope

1. Resolve I2 and I3 together in reviewer evidence classification.
2. Resolve I1 in reviewer PASS and convergence consistency gates.
3. Resolve I4 via structured artifactization/parity enforcement and approval diagnostics.
4. Define and enforce deterministic fail-closed rules per phase.
5. Provide phase-gated tests and explicit completion criteria.

### Out of Scope

1. Severity ontology redesign (`P0..P3` semantics unchanged).
2. Historical transcript rewriting/migration.
3. Docs-only policy changes unrelated to these four gaps.
4. Bubble lifecycle redesign outside parity/trust guardrails listed here.

### Safety Defaults (All Phases)

1. Any ambiguity in trust/parity classification fails closed.
2. Summary prose is never canonical evidence/finding source by itself.
3. No phase may relax canonical provenance requirements.

### Deterministic Vocabulary (Normative)

1. `canonical_evidence_ref`: only `.pairflow/evidence/*.log` refs are trust-eligible evidence sources.
2. `completion_marker`: explicit command completion markers from the referenced log (for example command echo + exit marker) required for trust decisions.
3. `positive_summary_assertion`: any summary clause claiming non-zero/open findings or severity presence, unless that exact clause is negated by explicit zero/no-findings language.
4. `same_run_findings_artifact`: findings artifact produced by the same meta-review execution snapshot as the summary claim; linkage must be machine-verifiable via persisted run identity metadata.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted boundaries:
   - reviewer evidence classification contract
   - reviewer PASS/convergence consistency contract
   - meta-review output + artifact schema contract
   - approval metadata + diagnostics contract

## Phase Plan (Required)

### Phase 1 - Evidence Trust Baseline + Alias Normalization (I2 + I3)

Objective:
1. Ensure `trusted` requires canonical log provenance and verifiable completion markers.
2. Eliminate alias-driven false `evidence_missing` for equivalent required commands.

Primary files:
1. `src/core/reviewer/testEvidence.ts`
2. `tests/core/reviewer/testEvidence.test.ts`
3. `docs/meta-review-gate-rollout-runbook.md`

Exit criteria:
1. Non-log/prose refs cannot produce `trusted`.
2. Canonical log + marker can produce `trusted/skip_full_rerun`.
3. Alias-equivalent command forms are accepted when provenance+marker are valid.
4. Ambiguous/missing marker remains `untrusted/run_checks`.

### Phase 2 - Summary/Payload Deterministic Consistency (I1)

Objective:
1. Block style-based bypass where summary asserts findings but payload is clean.
2. Keep reviewer PASS and convergence behavior deterministic and parity-aligned.

Primary files:
1. `src/core/agent/pass.ts`
2. `src/core/convergence/policy.ts`
3. `tests/core/agent/pass.test.ts`
4. `tests/core/convergence/policy.test.ts`

Exit criteria:
1. Reviewer `--no-findings` rejects positive finding/severity summary assertions.
2. Convergence blocks when prior clean payload conflicts with positive summary assertions.
3. Negation/zero-count guards avoid false positives.
4. Mixed-clause summaries (`no findings ..., but P2 findings remain ...`) are classified deterministically as positive assertion.

### Phase 3 - Meta-Review Findings Artifactization + Round Continuity (I4)

Objective:
1. Require auditable structured findings artifact when summary claims positive findings.
2. Persist continuity metadata (counts/digest/status) and surface it in gate/approval/CLI diagnostics.

Primary files:
1. `src/core/bubble/metaReview.ts`
2. `src/core/bubble/metaReviewGate.ts`
3. `src/core/human/approval.ts`
4. `src/core/protocol/resumeSummary.ts`
5. `src/cli/commands/bubble/metaReview.ts`
6. `src/types/protocol.ts`
7. `tests/core/bubble/metaReview.test.ts`
8. `tests/core/bubble/metaReviewGate.test.ts`
9. `tests/core/human/approval.test.ts`
10. `tests/cli/bubbleMetaReviewCommand.test.ts`

Exit criteria:
1. Positive findings claim without artifactized findings is rejected/fail-closed.
2. Claimed count vs artifact count mismatch is rejected/fail-closed.
3. Approval/gate metadata carries deterministic parity fields.
4. Resume/CLI diagnostics show claimed/artifactized counts and parity status.
5. Positive claim with missing/unlinkable same-run metadata (`meta_review_run_id`) is rejected/fail-closed with deterministic reason code.
6. Artifact digest/parity metadata unavailable path is rejected/fail-closed with deterministic reason code (`META_REVIEW_FINDINGS_PARITY_GUARD`).

## L1 - Change Contract

### 1) Unified Rule Set

| Rule ID | Rule | Issue(s) | Phase | Required Outcome |
|---|---|---|---|---|
| R1 | `trusted` evidence requires canonical `.pairflow/evidence/*.log` refs and verifiable completion marker. | I2 | Phase 1 | Non-canonical or marker-missing evidence cannot be `trusted`. |
| R2 | Alias-equivalent command forms must map to canonical required command families without broad false-positive regex. | I3 | Phase 1 | Valid alias evidence no longer yields false `evidence_missing`. |
| R3 | Reviewer clean PASS (`--no-findings`) summary must not assert positive findings/severity. | I1 | Phase 2 | Hard reject on contradiction. |
| R4 | Convergence must block when previous clean payload (`findings=[]`) conflicts with positive summary assertions. | I1 | Phase 2 | Deterministic block (no wording bypass). |
| R5 | Meta-review positive findings claims require same-run structured findings artifact with auditable count parity and run identity linkage (`meta_review_run_id`). | I4 | Phase 3 | Missing/mismatch/unlinkable run identity triggers fail-closed route/error. |
| R6 | Any trust/parity ambiguity is fail-closed with explicit reason code and deterministic diagnostics. | I1-I4 | Phase 1-3 | No optimistic pass in uncertain states. |

### 1.1) Rule Clarifications (Ambiguity Removal)

1. Phase 1 alias handling is closed-set, not fuzzy:
   - `typecheck` family accepted forms: `pnpm typecheck`, `pnpm run typecheck`, `tsc --noEmit`
   - `test` family accepted forms: `pnpm test`, `pnpm run test`, `vitest`, `vitest run`
   - `lint` family accepted forms: `pnpm lint`, `pnpm run lint`, `eslint`
2. Any command text outside the closed-set alias families cannot satisfy required command evidence.
3. Phase 2 summary classifier precedence is deterministic:
   - evaluate clause-level negation/zero-count guards first,
   - then evaluate positive finding/severity assertions,
   - mixed summaries are positive if any unguarded positive clause remains.
4. Phase 3 parity checks are strict for positive-claim runs:
   - missing `same_run_findings_artifact` => fail-closed,
   - missing run identity linkage metadata => fail-closed,
   - count mismatch => fail-closed.

### 2) Call-site Matrix (Phase-Mapped)

| ID | File | Function/Entry | Contract Delta | Issue(s) | Phase | Priority |
|---|---|---|---|---|---|---|
| CS1 | `src/core/reviewer/testEvidence.ts` | command matching + classification path | Add command-family alias normalization; enforce canonical log + marker trust gate. | I2, I3 | 1 | P1 |
| CS2 | `tests/core/reviewer/testEvidence.test.ts` | evidence tests | Add false-positive/false-negative trust scenarios including alias variants and marker failures. | I2, I3 | 1 | P1 |
| CS3 | `docs/meta-review-gate-rollout-runbook.md` | operator guidance | Document accepted alias equivalence and fail-closed boundaries. | I3 | 1 | P2 |
| CS4 | `src/core/agent/pass.ts` | reviewer pass validation | Deterministic summary assertion detection for clean pass path. | I1 | 2 | P1 |
| CS5 | `src/core/convergence/policy.ts` | convergence gate | Apply same detection semantics for previous-review consistency gate. | I1 | 2 | P1 |
| CS6 | `tests/core/agent/pass.test.ts` | pass tests | Add contradiction, guard, mixed-clause cases. | I1 | 2 | P1 |
| CS7 | `tests/core/convergence/policy.test.ts` | convergence tests | Add wording-variant and guard parity cases. | I1 | 2 | P1 |
| CS8 | `src/core/bubble/metaReview.ts` | schema/parse/submit/write path | Add optional findings envelope, enforce claim-artifact parity, persist digest/status metadata. | I4 | 3 | P1 |
| CS9 | `src/core/bubble/metaReviewGate.ts` | gate routing | Include findings parity metadata and fail-closed inconclusive routing on mismatch. | I4 | 3 | P1 |
| CS10 | `src/core/human/approval.ts` | approval guard | Block approve without override when parity inconsistency metadata exists. | I4 | 3 | P2 |
| CS11 | `src/core/protocol/resumeSummary.ts` | summary rendering | Surface concise parity diagnostics for round forensics. | I4 | 3 | P2 |
| CS12 | `src/cli/commands/bubble/metaReview.ts` | status/last-report rendering | Display artifact availability, counts, and parity status. | I4 | 3 | P2 |
| CS13 | `src/types/protocol.ts` | metadata typing | Add additive findings audit fields for protocol payloads. | I4 | 3 | P2 |
| CS14 | meta-review related tests | test files listed in frontmatter | Cover artifact-required, mismatch, routing, approval, diagnostics, typing compatibility. | I4 | 3 | P1/P2 |

### 3) Data and Interface Contract

1. `payload.findings` remains canonical finding source for reviewer PASS/convergence.
2. `trusted` evidence remains log-ref + marker gated; summary text cannot satisfy trust provenance.
3. Meta-review `report_json` becomes additive with optional fields:
   - `findings`
   - `findings_summary`
   - `findings_digest_sha256`
   - `artifact_status`
   - `meta_review_run_id`
4. `APPROVAL_REQUEST.payload.metadata` becomes additive with findings parity fields:
   - `findings_claimed_open_total`
   - `findings_artifact_open_total`
   - `findings_artifact_status`
   - `findings_digest_sha256`
   - `meta_review_run_id`
5. Any mismatch/missing required parity data under positive claim must fail closed.

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback | Reason Code / Decision |
|---|---|---|---|
| Non-canonical or marker-unverifiable trust evidence | deny trust | `untrusted/run_checks` | `evidence_unverifiable` |
| No literal match but alias-equivalent command present with valid marker | accept as canonical-equivalent | verify command evidence | existing success path (`trusted/skip_full_rerun` when all required pass) |
| Clean PASS summary asserts findings/severity | hard reject | none | `REVIEWER_SUMMARY_FINDINGS_CONTRADICTION` |
| Previous clean payload conflicts with positive summary assertion | hard block | none | `CONVERGENCE_SUMMARY_PAYLOAD_CONTRADICTION` |
| Meta-review positive claim but findings artifact missing | reject/fail-closed | none | `META_REVIEW_FINDINGS_ARTIFACT_REQUIRED` |
| Meta-review claimed count != artifact open_total | reject/fail-closed | none | `META_REVIEW_FINDINGS_COUNT_MISMATCH` |
| Artifact digest/parity metadata unavailable | fail-closed route | `human_gate_inconclusive` | `META_REVIEW_FINDINGS_PARITY_GUARD` |
| Positive claim present but run identity metadata missing/unlinkable | fail-closed route | `human_gate_inconclusive` | `META_REVIEW_FINDINGS_RUN_LINK_MISSING` |

### 5) Dependency Constraints

| Type | Items | Priority |
|---|---|---|
| must-use | canonical artifact/log path policies and current reason code namespaces | P1 |
| must-use | deterministic clause-scoped summary marker detection and guard semantics | P1 |
| must-not-use | summary-only trust or summary-only auditable findings truth | P1 |
| must-not-use | broad alias regex that may classify unrelated commands as required checks | P1 |
| must-not-use | manual transcript rewriting as continuity recovery mechanism | P1 |

### 6) Unified Test Matrix (Issue/Phase Traceable)

| Test ID | Scenario | Issue(s) | Phase | Expected Outcome |
|---|---|---|---|---|
| T1 | Non-log/prose ref cannot be trusted | I2 | 1 | `untrusted/run_checks` |
| T2 | Canonical log but missing marker cannot be trusted | I2 | 1 | `untrusted/run_checks` |
| T3 | Canonical log + marker trusted success path | I2 | 1 | `trusted/skip_full_rerun` |
| T4 | Alias-equivalent commands (`tsc --noEmit`, `vitest run`, `pnpm run test/typecheck`, `pnpm run lint`/`eslint`) verify correctly | I3 | 1 | no false `evidence_missing` |
| T5 | Alias present but ambiguous/missing completion stays fail-closed | I3 | 1 | `untrusted` with explicit reason |
| T6 | `--no-findings` + positive summary assertion is rejected | I1 | 2 | hard reject |
| T7 | Convergence blocks for clean payload + positive summary assertion | I1 | 2 | deterministic block |
| T8 | Negation/zero-count guards prevent false positives | I1 | 2 | no contradiction trigger |
| T9 | Mixed negation+positive clauses classify as positive assertion | I1 | 2 | contradiction/block triggered |
| T10 | Meta-review positive claim without findings artifact rejected | I4 | 3 | artifact-required error |
| T11 | Meta-review claim/artifact count mismatch rejected | I4 | 3 | mismatch error |
| T12 | Meta-review parity metadata persisted and routed to approval/gate/CLI/resume | I4 | 3 | deterministic diagnostics visible |
| T13 | Meta-review positive claim with missing/unlinkable `meta_review_run_id` rejected | I4 | 3 | fail-closed with `META_REVIEW_FINDINGS_RUN_LINK_MISSING` |
| T14 | Meta-review positive claim with unavailable digest/parity metadata rejected | I4 | 3 | fail-closed with `META_REVIEW_FINDINGS_PARITY_GUARD` |

## L2 - Execution Order and Governance

### Delivery Order (Mandatory)

1. Complete Phase 1 before starting Phase 2.
2. Complete Phase 2 before starting Phase 3.
3. Do not merge partial phase work without passing that phase's exit criteria + tests.

### Phase Interlock Gates (No Cross-Phase Drift)

1. Phase 2 implementation cannot begin until Phase 1 alias closed-set and trust fail-closed tests (T1-T5) are green in the same branch.
2. Phase 3 implementation cannot begin until Phase 2 summary classifier precedence tests (T6-T9) are green in the same branch.
3. Any regression in an already-closed phase re-opens that phase and blocks forward merge.

### Acceptance Criteria (Task-Level)

1. AC1: All Phase 1 exit criteria and tests (T1-T5) pass.
2. AC2: All Phase 2 exit criteria and tests (T6-T9) pass.
3. AC3: All Phase 3 exit criteria and tests (T10-T14) pass.
4. AC4: All four issues (I1-I4) have direct rule + call-site + test traceability.
5. AC5: Final behavior remains fail-closed for ambiguity across all phases.
6. AC6: Contradiction/parity fail-closed paths emit deterministic reason codes (no generic fallback wording) for I1 and I4.
7. AC7: Positive-claim meta-review rounds persist run-linkage metadata (`meta_review_run_id`) through report, gate, and approval metadata.
8. AC8: Negative controls exist for alias over-match, mixed negation/positive summary clauses, and Phase 3 parity/linkage guard failures to prevent optimistic false passes.

### Acceptance Traceability Matrix

| AC | Rules | Call-sites | Tests |
|---|---|---|---|
| AC1 | R1, R2, R6 | CS1, CS2, CS3 | T1, T2, T3, T4, T5 |
| AC2 | R3, R4, R6 | CS4, CS5, CS6, CS7 | T6, T7, T8, T9 |
| AC3 | R5, R6 | CS8, CS9, CS10, CS11, CS12, CS13, CS14 | T10, T11, T12, T13, T14 |
| AC4 | R1-R6 | CS1-CS14 | T1-T14 |
| AC5 | R1-R6 | CS1-CS14 | T1-T14 |
| AC6 | R3, R4, R5, R6 | CS4, CS5, CS6, CS7, CS8, CS9, CS10 | T6, T7, T10, T11, T12, T13, T14 |
| AC7 | R5, R6 | CS8, CS9, CS10, CS11, CS12, CS13, CS14 | T10, T11, T12, T13, T14 |
| AC8 | R2, R3, R4, R5, R6 | CS1, CS2, CS4, CS5, CS6, CS7, CS8, CS9, CS14 | T4, T5, T8, T9, T13, T14 |

### Hardening Backlog (Optional)

| ID | Item | Related Issue(s) | Timing |
|---|---|---|---|
| H1 | Structured evidence footer parsing (`CMD`, `EXIT_CODE`) to reduce textual heuristics | I2, I3 | later-hardening |
| H2 | Separate dedicated meta-review findings artifact file if report JSON size grows | I4 | later-hardening |
| H3 | Telemetry counters for parity-guard triggers and alias-normalization hit-rate | I2, I3, I4 | later-hardening |

### Spec Lock

Mark this task `IMPLEMENTABLE` only when:
1. Rule-to-test traceability for I1-I4 is complete.
2. All `P1 required-now` call-sites are implemented and verified by phase.
3. Operator-facing diagnostics are deterministic for both trust and parity failures.
4. Phase 1 alias families remain closed-set and explicitly tested for over-match rejection.
5. Phase 2 summary classifier precedence is documented and test-locked (guard-first, then positives).
6. Phase 3 positive-claim parity path has machine-verifiable same-run linkage (`meta_review_run_id`) end-to-end.
