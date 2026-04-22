---
artifact_type: task
artifact_id: task_runtime_review_policy_reviewer_bypass_residual_runtime_alignment_phase3c_v1
title: "Runtime Review Policy Reviewer Bypass Residual Runtime Alignment (Phase 3C)"
status: draft
phase: phase3c
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts
  - src/v11/application/converged/convergedRoutingPreparation.ts
  - src/v11/domain/convergence/policyValidation.ts
  - src/v11/application/approval/approvalResultMapping.ts
  - src/v11/shared/approval/reworkIntent.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/application/start/startCommandResumeKickoffMessages.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts
  - tests/v11/application/converged/convergedRoutingPreparation.test.ts
  - tests/v11/domain/convergence/policy.test.ts
  - tests/v11/domain/convergence/repeatCleanAutoconverge.test.ts
  - tests/v11/application/approval/approvalResultMapping.test.ts
  - tests/v11/shared/approval/reworkIntent.test.ts
  - tests/v11/application/start/startCommandResumeKickoffMessageBuilders.test.ts
prd_ref: null
plan_ref: plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md
  - plans/archive/tasks/runtime-review-policy-reviewer-bypass-contract-phase3a.md
  - plans/archive/tasks/runtime-review-policy-auto-rework-threshold-phase2.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Reviewer Bypass Residual Runtime Alignment (Phase 3C)

## Current Codebase Check (2026-04-22)

1. Phase 3A bezarta a bypass contract vocabularyt:
   - `requested_loop_mode`
   - `effective_loop_mode`
   - `support_status`
2. Phase 3B activation core feladata a live pass-path activation truth bezarasa:
   [runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md](/Users/felho/dev/pairflow/plans/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md)
3. A current residual runtime branches viszont ma meg reviewer-owned vagy implementer/reviewer alternaciora epulnek:
   - `src/v11/application/converged/convergedRoutingPreparation.ts`
   - `src/v11/domain/convergence/policyValidation.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts`
   - `src/v11/application/approval/approvalResultMapping.ts`
   - `src/v11/shared/approval/reworkIntent.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/application/start/startCommandResumeKickoffMessages.ts`
4. Emiatt a bypass Phase 3 teljes runtime closure-je csak akkor lesz vedheto, ha ezek a residual branches is ugyanarra a mar lezart activation truth-ra allnak ra.

## L0 - Policy

### Goal

Lezarni a reviewer bypass residual runtime alignmentot ugy, hogy:
1. a Phase 3B activation core altal bezart live truth ugyanugy ervenyesuljon a convergence, meta-review finalize, approval/rework es start/resume branch-ekben is,
2. a rendszer ne essen vissza reviewer-only vagy implementer/reviewer alternacios hard-coded residual topologiara,
3. cleanup/recovery es startup/resume parity fail-closed maradjon activation hianyaban,
4. de a Phase 3A contractot es a Phase 3B activation-core authorityt ez a task mar ne nyissa ujra.

### Domain / Control Model Summary

1. Business invariant:
   a bypass truth nem lehet eltero a live pass-path es a residual runtime branches kozott.
2. Control model:
   a residual runtime branches csak a Phase 3B-ben bezart activation truth consume csaladjai; nem sajat authority producer-ek.
3. Read-path rule:
   ha a residual branchnek route dontes kell, azt ugyanabbol az activation helper truth-bol kell consume-olnia.
4. Forbidden fallback:
   reviewer-only convergence guard, implementer/reviewer round alternation, stale startup projection vagy historical gate-local marker nem valhat residual topology truth-va.
5. Allowed resolution path:
   Phase 3B activation truth -> convergence/meta-review/rework/start-resume consume alignment.
6. Missing-data rule:
   ha activation proof hianyzik vagy residual branch nem tud ugyanarra a truth-ra ulni, fail-closed full/reviewer baseline marad.

### Plan Linkage

1. Parent plan gap closed:
   a Phase 3B utan bent marado residual runtime alignment.
2. Depends on:
   [runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md](/Users/felho/dev/pairflow/plans/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md)
3. Unlocks / impacts successors:
   Phase 3C utan a bypass runtime Phase 3 closure mar nem hagy reviewer-owned residual branch-et maga utan; kesobbi munka mar inkabb cleanup vagy UX-polish lehet.
4. Task-list impact:
   ez a Phase 3 residual closeout slice; nem activation-core es nem contract-authoring task.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md](/Users/felho/dev/pairflow/plans/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md)
   - [metaReviewGateCurrentRunFinalization.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts)
   - [metaReviewGateAutoRework.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts)
   - [convergedRoutingPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/converged/convergedRoutingPreparation.ts)
   - [policyValidation.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyValidation.ts)
   - [approvalResultMapping.ts](/Users/felho/dev/pairflow/src/v11/application/approval/approvalResultMapping.ts)
   - [reworkIntent.ts](/Users/felho/dev/pairflow/src/v11/shared/approval/reworkIntent.ts)
   - [startCommandTmuxLaunch.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandTmuxLaunch.ts)
   - [startCommandResumeKickoffMessages.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandResumeKickoffMessages.ts)
2. Closed terms inherited:
   - Phase 3A requested/effective/support vocabulary
   - Phase 3B activation-core truth
3. Drift status:
   `no_drift_if_phase3c_consumes_phase3b_activation_truth_without_reopening_it`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`,
   `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts`,
   `src/v11/application/converged/convergedRoutingPreparation.ts`,
   `src/v11/domain/convergence/policyValidation.ts`,
   `src/v11/application/approval/approvalResultMapping.ts`,
   `src/v11/shared/approval/reworkIntent.ts`,
   `src/v11/application/start/startCommandTmuxLaunch.ts`,
   `src/v11/application/start/startCommandResumeKickoffMessages.ts`.
2. Actual touched scope:
   `consumer_family_alignment` primary, `fail_closed_hardening` secondary.
3. Why this is separate from Phase 3B:
   ezek mar nem a live pass-path activation corehoz tartoznak, hanem residual runtime consume es recovery branches.

### Authority Boundary Map

1. Authority producer:
   out of scope; inherited from Phase 3B activation core.
2. Persisted authority:
   reuse existing `bubble.toml review_policy`.
3. Internal execution consumers:
   meta-review finalize, auto-rework, convergence policy, approval/rework.
4. Workflow orchestration consumers:
   converged routing, startup/resume kickoff.
5. Read model consumers:
   `N/A` ebben a taskban.
6. Cleanup/recovery consumers:
   approval rework, deferred rework, restart/resume.

### Closure-Budget Gate

1. Touched closure buckets:
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
2. Explicitly not touched:
   - `authority_producer`
   - `shared_contract`
   - `read_model_consumers`
   - `persisted_authority_or_schema`
3. Intentionally collapsed closures:
   `internal_execution_consumers` + `cleanup_recovery_consumers`
4. Why collapse is safe:
   ugyanannak a residual topology consume familynek a folytatasai, uj contract drift nelkul.
5. Explicitly deferred closures:
   - UX polish
   - non-essential naming cleanup

### Baseline Preservation

1. Must-preserve behaviors:
   - Phase 3A vocabulary valtozatlan
   - Phase 3B activation-core truth valtozatlan
   - activation hianyaban reviewer/full fallback baseline megmarad
2. Allowed resolution paths:
   - Phase 3B activation truth -> residual branch alignment
3. Forbidden regression interpretations:
   - residual branch alignment nem gyarthat sajat bypass authorityt

### Precondition and Side-Effect Boundary

1. Primary bounded task shape:
   `consumer_family_alignment`
2. Secondary shape:
   `fail_closed_hardening`
3. Preconditions that must pass before side effects:
   - Phase 3B activation truth explicit consume-ja elerheto legyen
   - residual branch route decision ugyanarra a truth-ra tudjon ulni
4. Side effects forbidden before preconditions pass:
   - bypass-specific residual route
   - startup/resume messaging drift
   - recovery branch topology drift
5. Invalid/precondition-failure behavior:
   fail-closed reviewer/full baseline marad.

### In Scope

1. Converged / auto-converge residual branch alignment.
2. Meta-review finalize / auto-rework residual topology alignment.
3. Approval / deferred rework residual topology alignment.
4. Start / resume kickoff residual topology alignment.
5. A fenti residual branch-ek regresszios es fail-closed tesztjei.

### Out of Scope

1. Phase 3A contract vocabulary ujranyitasa.
2. Phase 3B activation-core authority ujranyitasa.
3. Uj review-policy field vagy schema valtoztatas.
4. UI mutation vagy presentational redesign.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing |
|---|---|---|---|---|---|
| CS1 | `src/v11/application/converged/convergedRoutingPreparation.ts`, `src/v11/domain/convergence/policyValidation.ts` | convergence routing / policy | reviewer-owned residual baseline ugyanarra a Phase 3B activation truth-ra alljon ra, vagy fail-closed full/reviewer fallbackra | P1 | required-now |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts` | meta-review residual route | auto-rework es finalize residual route-ja ne drifteljen reviewer-only baseline-re aktiv bypass mellett | P1 | required-now |
| CS3 | `src/v11/application/approval/approvalResultMapping.ts`, `src/v11/shared/approval/reworkIntent.ts` | rework / recovery | approval es deferred rework ne terjen vissza hard-coded implementer/reviewer residual topologyra | P1 | required-now |
| CS4 | `src/v11/application/start/startCommandTmuxLaunch.ts`, `src/v11/application/start/startCommandResumeKickoffMessages.ts` | start / resume residual topology | startup es resume kickoff ugyanazt a residual activation truth-ot consume-olja | P1 | required-now |

### 2) Test Matrix

| ID | Scenario | Assertions | Priority |
|---|---|---|---|
| T1 | converged residual branch activated bypass mellett | nincs hidden reviewer-only drift | P1 |
| T2 | meta-review finalize / auto-rework activated bypass mellett | residual route ugyanarra a truth-ra ul | P1 |
| T3 | approval / deferred rework activated bypass mellett | recovery topology koherens marad | P1 |
| T4 | start / resume residual branch activated bypass mellett | kickoff topology nem driftel vissza reviewer-centered baseline-re | P1 |
| T5 | activation-unresolved residual fallback | fail-closed full/reviewer baseline marad | P1 |

## L2 - Acceptance Criteria

1. A residual runtime branches Phase 3C utan ugyanazt a Phase 3B activation truth-ot consume-oljak.
2. Activation hianyaban a residual branches fail-closed reviewer/full baseline-on maradnak.
3. A Phase 3A contract es a Phase 3B activation core nem nyilik ujra.

## Hardening Backlog

1. `later-hardening`: retained naming cleanup kulon polish taskban menjen.
