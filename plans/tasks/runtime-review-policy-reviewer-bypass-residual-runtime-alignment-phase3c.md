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
  - src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts
  - tests/v11/application/converged/convergedRoutingPreparation.test.ts
  - tests/v11/domain/convergence/policy.test.ts
  - tests/v11/domain/convergence/repeatCleanAutoconverge.test.ts
  - tests/v11/application/approval/approvalResultMapping.test.ts
  - tests/v11/shared/approval/reworkIntent.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/v11/application/start/startCommandResumeKickoffMessageBuilders.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/ui/updateBubbleReviewPolicyForUi.test.ts
  - tests/v11/shared/list/listCommandEntryProjection.test.ts
  - tests/v11/shared/status/statusCommandViewBuilder.test.ts
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
   - `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts`
4. A konkret residual guardok a current tree-ben mar lathatoak:
   - `convergedRoutingPreparation.ts` explicit `active_role === "reviewer"` es configured-reviewer guardot kovetel,
   - `policyValidation.ts` legalabb ket round reviewer/implementer alternaciot kovetel,
   - `metaReviewGateCurrentRunFinalization.ts` megtartott threshold- es `sticky_human_gate` guardokat hordoz, mikozben `metaReviewGateAutoRework.ts`, `approvalResultMapping.ts` es `reworkIntent.ts` a kovetkezo roundot ma meg hard-coded implementer active role-lal es reviewer-history appenddel irjak,
   - `startCommandTmuxLaunch.ts` a startup/resume launch wiringet es kickoff message atadast ownershipolja, mig `startCommandResumeKickoffMessages.ts` a persisted `active_role` alapjan valaszt resume branch-et, a `startCommandResumeKickoffMessageBuilders.ts` pedig az igy feloldott kickoff/projection copyt formalja.
5. A broad read-model consume pontok egy resze is residual hardeningnek szamit:
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts`
   Ezeknel a feluleteknel az invalid/drifted local state, valamint a remote runtime-availability fail-closed parity Phase 3B utan is successor-owned.
6. Emiatt a bypass Phase 3 teljes runtime closure-je csak akkor lesz vedheto, ha ezek a residual branches es a broad read-model parity consume pontok is ugyanarra a mar lezart activation truth-ra allnak ra.

## L0 - Policy

### Goal

Lezarni a reviewer bypass residual runtime alignmentot ugy, hogy:
1. a Phase 3B activation core altal bezart live truth ugyanugy ervenyesuljon a convergence, meta-review finalize, approval/rework es start/resume branch-ekben is,
2. a rendszer ne essen vissza reviewer-only vagy implementer/reviewer alternacios hard-coded residual topologiara,
3. a status/list/UI/remote read-model consume family invalid/drifted vagy runtime-unavailable esetben se mutasson optimista bypass truthot,
4. cleanup/recovery, startup/resume es read-model parity fail-closed maradjon activation hianyaban,
5. de a Phase 3A contractot es a Phase 3B activation-core authorityt ez a task mar ne nyissa ujra.

### Domain / Control Model Summary

1. Business invariant:
   a bypass truth nem lehet eltero a live pass-path es a residual runtime branches kozott.
2. Control model:
   a residual runtime branches csak a Phase 3B-ben bezart activation truth consume csaladjai; nem sajat authority producer-ek.
3. Read-path rule:
   ha a residual branchnek vagy broad read-model consume pontnak route/allapot dontes kell, azt ugyanabbol az activation helper truth-bol kell consume-olnia.
4. Forbidden fallback:
   reviewer-only convergence guard, implementer/reviewer round alternation, stale startup projection vagy historical gate-local marker nem valhat residual topology truth-va.
5. Allowed resolution path:
   Phase 3B activation truth -> convergence/meta-review/rework/start-resume/status-list-ui consume alignment.
6. Missing-data rule:
   ha activation proof hianyzik vagy residual branch nem tud ugyanarra a truth-ra ulni, fail-closed full/reviewer baseline marad.

### Plan Linkage

1. Parent plan gap closed:
   a Phase 3B utan bent marado residual runtime alignment es broad read-model fail-closed parity.
2. Depends on:
   [runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md](/Users/felho/dev/pairflow/plans/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md)
3. Unlocks / impacts successors:
   Phase 3C utan a bypass runtime Phase 3 closure mar nem hagy reviewer-owned residual branch-et maga utan; kesobbi munka mar inkabb cleanup vagy UX-polish lehet.
4. Task-list impact:
   ez a Phase 3 residual closeout slice; nem activation-core es nem contract-authoring task, de ide tartozik a broad read-model consume hardening is.

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
   - [startCommandResumeKickoffMessageBuilders.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts)
   - [statusCommandViewBuilder.ts](/Users/felho/dev/pairflow/src/v11/shared/status/statusCommandViewBuilder.ts)
   - [listCommandEntryProjection.ts](/Users/felho/dev/pairflow/src/v11/shared/list/listCommandEntryProjection.ts)
   - [updateBubbleReviewPolicyForUi.ts](/Users/felho/dev/pairflow/src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts)
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
   `src/v11/application/start/startCommandResumeKickoffMessages.ts`,
   `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts`,
   `src/v11/shared/status/statusCommandViewBuilder.ts`,
   `src/v11/shared/list/listCommandEntryProjection.ts`,
   `src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts`.
2. Actual touched scope:
   `consumer_family_alignment` primary, `fail_closed_hardening` secondary, `read_model_consumers` bounded tertiary.
3. Why this is separate from Phase 3B:
   ezek mar nem a live pass-path activation corehoz tartoznak, hanem residual runtime consume es recovery branches.
4. Start/resume boundedness note:
   a task a kickoff/runtime projection parityt ownershipolja, nem a tmux pane roster, agent inventory vagy startup UX redesign teljes ujratervezeset.

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
   status/list/UI review-policy consume family, valamint bounded start/resume kickoff projection es diagnostics a `resolveResumeKickoffMessages(...)` / kickoff-builder familyben.
6. Cleanup/recovery consumers:
   approval rework, deferred rework, restart/resume.

### Closure-Budget Gate

1. Touched closure buckets:
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
   - `read_model_consumers`
2. Explicitly not touched:
   - `authority_producer`
   - `shared_contract`
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
   - Phase 3B activation truth -> residual branch es broad read-model alignment
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

### Residual Branch Inventory

1. `converged` / auto-converge:
   a Phase 3C-nek explicitten le kell cserelnie a reviewer-only active-role es round-alternation feltetelezest ugyanarra az activation truth-ra, amelyet a Phase 3B mar bezart, vagy fail-closed reviewer/full baseline-ra kell visszaesnie.
2. Meta-review finalize / auto-rework:
   `sticky_human_gate`, threshold fallback es auto-rework state hydration maradhat retained guard, de egyik sem lephet elo bypass-topology authorityva; a dispatchalt route, next-round state es transcript metadata ugyanarra a resolved truth-ra kell uljon.
3. Approval / deferred rework:
   az approval-alapu rework es a deferred rework intent nem irhatja ujra vakon az implementer/reviewer alternaciot; a resumed `active_role`, `execution_context` es `round_role_history` a resolved topology folytatasa legyen vagy fail-closed baseline.
4. Start / resume:
   a resume kickoff copy, meta-reviewer diagnostic branch es fresh-start kickoff guidance nem sugallhat reviewer-first runtime topologiat, ha a persisted activation mar bypass-aktiv, de activation hianyaban tovabbra is a reviewer/full baseline-t kell kommunikalniuk.
5. Status / list / UI conflict view:
   invalid vagy driftelt local RUNNING state, valamint remote runtime-unavailable snapshot nem mutathat optimista `effective_loop_mode = "meta_only"` truthot ott, ahol a live activation authority mar nem bizonyitott; fail-closed guarded/full baseline vagy explicit diagnostics kell.

### In Scope

1. Converged / auto-converge residual branch alignment.
2. Meta-review finalize / auto-rework residual topology alignment.
3. Approval / deferred rework residual topology alignment.
4. Start / resume kickoff residual topology alignment.
5. Status / list / UI read-model fail-closed parity alignment.
6. A fenti residual branch-ek es broad read-model consume pontok regresszios es fail-closed tesztjei.

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
| CS1 | `src/v11/application/converged/convergedRoutingPreparation.ts`, `src/v11/domain/convergence/policyValidation.ts` | convergence routing / policy | a hard-coded `active_role === "reviewer"` es reviewer/implementer alternation guard Phase 3B activation truth consume-jara cserelodik, kulonben explicit fail-closed reviewer/full fallback marad | P1 | required-now |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts` | meta-review finalize retained guards | `sticky_human_gate`, threshold fallback es finalize diagnostics retained guard marad; nem lephetnek elo bypass-topology authorityva aktiv bypass mellett sem | P1 | required-now |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts` | meta-review auto-rework resumed topology | a residual route, delivery metadata es resumed state ugyanarra a resolved truth-ra ul, reviewer-owned topology drift nelkul | P1 | required-now |
| CS4 | `src/v11/application/approval/approvalResultMapping.ts`, `src/v11/shared/approval/reworkIntent.ts` | rework / recovery | approval es deferred rework a next-round `active_role` / `execution_context` / `round_role_history` shape-et ugyanabbal a resolved topologyval epiti fel, nem vak implementer/reviewer alternacioval | P1 | required-now |
| CS5 | `src/v11/application/start/startCommandTmuxLaunch.ts`, `src/v11/application/start/startCommandResumeKickoffMessages.ts`, `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts` | start / resume residual topology | a launch wiring, resume branch-valasztas es kickoff guidance ugyanazt a residual activation truth-ot consume-olja; scope-ban a kickoff/projection parity van, nem a pane-layout redesign | P1 | required-now |
| CS6 | `src/v11/shared/status/statusCommandViewBuilder.ts`, `src/v11/shared/list/listCommandEntryProjection.ts`, `src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts` | broad read-model fail-closed parity | invalid/drifted local state es remote runtime-unavailable esetben a projected `effective_loop_mode`/diagnostics nem sugallhat bizonyitott bypass truthot, ha a live activation authority nem eleg | P1 | required-now |

### 2) Branch / Fixture Inventory

| ID | Branch | Must prove |
|---|---|---|
| B1 | `requested=meta_only` + Phase 3B activation proven + `converged` path | a convergence guard es policy nem kovetel reviewer-only residual topologyt aktiv bypass mellett |
| B2 | `requested=meta_only` + Phase 3B activation proven + meta-review rework path | auto-rework es human fallback route retained guardokkal mukodik, de a resumed topology nem ir vissza hard-coded reviewer historyre |
| B3 | `requested=meta_only` + Phase 3B activation proven + approval/deferred rework path | a kovetkezo round state-write es `execution_context` a resolved topologyval marad koherens |
| B4 | `requested=meta_only` + Phase 3B activation proven + start/resume path | resume/fresh-start kickoff projection ugyanazt a topology truth-ot tukrozi, mint a persisted active context |
| B5 | `requested=meta_only` + activation unresolved vagy `requested=full` baseline | minden residual branch fail-closed reviewer/full baseline-on marad, explicit diagnostics vagy baseline copy mellett |
| B6 | `requested=meta_only` + invalid/drifted local RUNNING vagy remote runtime-unavailable snapshot | a broad read-model consume family guarded/full baseline-t vagy explicit diagnosticsot mutat, optimista bypass truth nelkul |

### 3) Test Matrix

| ID | Scenario | Assertions | Priority |
|---|---|---|---|
| T1 | converged residual branch activated bypass mellett | `converged` guard es policy ugyanazt a Phase 3B activation truth-ot consume-olja, reviewer-only drift nelkul | P1 |
| T2 | meta-review finalize / auto-rework activated bypass mellett | residual route, transcript metadata es resumed state ugyanarra a truth-ra ul | P1 |
| T3 | approval / deferred rework activated bypass mellett | next-round `active_role`, `execution_context` es `round_role_history` koherens marad | P1 |
| T4 | start / resume residual branch activated bypass mellett | kickoff topology es diagnostics nem driftel vissza reviewer-centered baseline-re | P1 |
| T5 | activation-unresolved residual fallback | fail-closed full/reviewer baseline marad, uj authority termeles nelkul | P1 |
| T6 | invalid/drifted broad read-model parity | status/list/UI consume family optimista bypass nelkul fail-closed vagy expliciten diagnosticos | P1 |
| T7 | residual alignment scope gate | nincs uj `review_policy` field/schema, UI mutation vagy presentational scope; a start/resume resz kickoff/projection parityre korlatozodik | P1 |

### 4) Target File Coverage Map

| Coverage | Source / Test anchors | Expected proof |
|---|---|---|
| C1 | `convergedRoutingPreparation.ts`, `policyValidation.ts`, `tests/v11/application/converged/convergedRoutingPreparation.test.ts`, `tests/v11/domain/convergence/policy.test.ts`, `tests/v11/domain/convergence/repeatCleanAutoconverge.test.ts` | B1 + T1 + T5 fail-closed convergence parity |
| C2 | `metaReviewGateCurrentRunFinalization.ts`, `metaReviewGateAutoRework.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts` | B2 + T2 + retained human-gate/threshold fallback nem valik bypass authorityva |
| C3 | `approvalResultMapping.ts`, `reworkIntent.ts`, `tests/v11/application/approval/approvalResultMapping.test.ts`, `tests/v11/shared/approval/reworkIntent.test.ts` | B3 + T3 next-round state-write es recovery topology parity |
| C4 | `startCommandTmuxLaunch.ts`, `startCommandResumeKickoffMessages.ts`, `startCommandResumeKickoffMessageBuilders.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts`, `tests/v11/application/start/startCommandResumeKickoffMessageBuilders.test.ts` | B4 + T4 launch/resume kickoff projection parity, explicit start/resume scope-boundedness |
| C5 | `statusCommandViewBuilder.ts`, `listCommandEntryProjection.ts`, `updateBubbleReviewPolicyForUi.ts`, `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts`, `tests/core/ui/updateBubbleReviewPolicyForUi.test.ts`, `tests/v11/shared/list/listCommandEntryProjection.test.ts`, `tests/v11/shared/status/statusCommandViewBuilder.test.ts` | B6 + T6 invalid/drifted local es remote read-model fail-closed parity |
| C6 | full target diff scope + acceptance review | B5 + T5 + T7 fail-closed baseline es no-schema/no-UI-mutation scope gate |

## L2 - Acceptance Criteria

1. A residual runtime branches Phase 3C utan ugyanazt a named Phase 3B activation truth-ot consume-oljak; egyik consumer sem vezet be sajat bypass authority seamet.
2. A convergence, meta-review finalize/auto-rework, approval/deferred rework, start/resume es broad status/list/UI consume csaladban a next-route, next-round state, kickoff projection es projected review-policy diagnostics ugyanazzal a resolved topologyval maradnak koherensek.
3. `sticky_human_gate`, reviewer-only active-role guard, round alternation evidence vagy stale startup projection Phase 3C utan csak retained fallback/diagnostics lehet, canonical bypass truth nem.
4. Activation hianyaban a residual branches fail-closed reviewer/full baseline-on maradnak.
5. A Phase 3A contract vocabulary es a Phase 3B activation-core authority nem nyilik ujra, es a task nem vezet be uj `review_policy` fieldet vagy schema-mutatast.
6. Invalid/drifted local state vagy remote runtime-unavailable snapshot mellett a broad read-model consume family nem mutathat optimista bypass truthot.
7. A task nem huz be UI mutation vagy presentational redesign scope-ot; a start/resume resz kickoff/projection parityre korlatozodik.

## Hardening Backlog

1. `later-hardening`: retained naming cleanup kulon polish taskban menjen.
