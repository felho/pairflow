---
artifact_type: task
artifact_id: task_runtime_review_policy_reviewer_bypass_residual_runtime_alignment_phase3c_v1
title: "Runtime Review Policy Reviewer Bypass Residual Runtime Alignment (Phase 3C)"
status: draft
phase: phase3c
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts
  - src/v11/application/converged/convergedRoutingPreparation.ts
  - src/v11/domain/convergence/policyValidation.ts
  - src/v11/application/approval/approvalResultMapping.ts
  - src/v11/shared/approval/reworkIntent.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/application/start/startCommandResumeKickoffMessages.ts
  - src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts
  - src/v11/shared/status/statusCommandApi.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/list/listCommandEntryBuilder.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
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
prd_ref: null
plan_ref: plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/archive/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md
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

## Current Codebase Check (2026-04-23)

1. Phase 3A bezarta a bypass contract vocabularyt:
   - `requested_loop_mode`
   - `effective_loop_mode`
   - `support_status`
2. A Phase 3B activation core mar merge-elt es archivalt baseline, amely bezarta a live pass-path activation truth-ot:
   [runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md)
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
5. A broad read-model consume pontok kozul a current-tree Phase 3C proof-surface a status/list familyben latszik:
   - `src/v11/shared/status/statusCommandApi.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   - `src/v11/shared/list/listCommandEntryBuilder.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   Ezeknel a feluleteknel az invalid/drifted local state, valamint a remote runtime-availability fail-closed parity Phase 3B utan is successor-owned.
6. A shared `buildBubbleReviewPolicyRuntimeView(...)` helper current tree consume familyje ebben a slice-ban ket downstream projection feluleten latszik:
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   Emiatt a Phase 3C ownership nem a shared helper contract ujranyitasa, hanem a downstream status/list consume/read-path fail-closed alignmentja.
7. A start/resume current tree-ben a topologiai dontest nem egy uj authority producer, hanem a kickoff/projection routing consume csalad hordozza:
   - `startCommandTmuxLaunch.ts` launch-wiring szinten atad kickoff uzeneteket,
   - `startCommandResumeKickoffMessages.ts` a persisted active context alapjan valaszt branch-et,
   - `startCommandResumeKickoffMessageBuilders.ts` a projection copyt formalja.
   Emiatt itt is consume-alignmentrol van szo, nem startup/runtime ownership redesignrol.
8. A current-tree UI mutation entrypoint `src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts` nem tekintheto ennek a tasknak read-model anchorjanak:
   existing mutation/conflict surface, nem status/list snapshot projection.
9. Emiatt a bypass Phase 3 teljes runtime closure-je csak akkor lesz vedheto, ha ezek a residual branches es a broad status/list read-model parity consume pontok is ugyanarra a mar lezart activation truth-ra allnak ra.

## L0 - Policy

### Goal

Lezarni a reviewer bypass residual runtime alignmentot ugy, hogy:
1. a Phase 3B activation core altal bezart live truth ugyanugy ervenyesuljon a convergence, meta-review finalize, approval/rework es start/resume branch-ekben is,
2. a rendszer ne essen vissza reviewer-only vagy implementer/reviewer alternacios hard-coded residual topologiara,
3. a status/list read-model consume family, valamint a status/list remote runtime-unavailable parity invalid/drifted vagy unavailable esetben se mutasson optimista bypass truthot,
4. cleanup/recovery, startup/resume es read-model parity fail-closed maradjon activation hianyaban,
5. a broad `status/list` consume parity es a status/list remote runtime-unavailable parity csak existing consume surfacesen zaruljon le, remote executor/lifecycle redesign nelkul,
6. de a Phase 3A contractot es a Phase 3B activation-core authorityt ez a task mar ne nyissa ujra.

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
   Phase 3B activation truth -> convergence/meta-review/rework/start-resume/status/list consume alignment.
6. Missing-data rule:
   ha activation proof hianyzik vagy residual branch nem tud ugyanarra a truth-ra ulni, fail-closed full/reviewer baseline marad.

### Plan Linkage

1. Parent plan gap closed:
   a Phase 3B utan bent marado residual runtime alignment es broad read-model fail-closed parity.
2. Depends on:
   [runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md)
3. Unlocks / impacts successors:
   Phase 3C utan a bypass runtime Phase 3 closure mar nem hagy reviewer-owned residual branch-et maga utan; kesobbi munka mar inkabb cleanup, UX-polish vagy kulon UI follow-up lehet.
4. Task-list impact:
   ez a Phase 3 residual closeout slice; nem activation-core es nem contract-authoring task, de ide tartozik a broad read-model consume hardening is.
5. Primary artifact rule:
   a Phase 3C implementacio elsodleges artefaktuma a task file marad; a parent plan csak sequencinget es successor-kapcsolatot szinkronizalhat, es nem vihet be kulon plusz acceptance vagy target-file scope-ot a taskon kivul.
6. Archive rule:
   a merged es archivalt Phase 3B predecessor baseline preserved marad; az archivalt predecessor dokumentum csak broken link vagy egyertelmu archival wording hiba javitasara erintheto, es ebben a Phase 3C plan-task syncben ez a carve-out kizarolag a Phase 3B archivalt predecessorra vonatkozik.

### Successor Inheritance Lock

1. A parent plan explicit hatara mar rogzitett:
   - Phase 3B: live pass-path activation core
   - Phase 3C: residual runtime branches + broad `status/list` fail-closed parity + remote runtime-unavailable parity
2. Emiatt a Phase 3C csak downstream consumer ownershipot vihet:
   residual route-ok, next-round state continuity, kickoff/projection parity, es broad read-model fail-closed parity.
3. Ha a megvalositas uj activation-proof producerre, shared helper contract-atirasra vagy pass-path authority reinterpretaciora szorulna, az mar nem local Phase 3C refinement, hanem visszaroutes-olando 3B/plan kerdes.
4. Parent-plan sync rule:
   ha a parent plan wordingje es a task kozott feszules maradna, a task bounded contractja az elsodleges; a plan csak ezt kovetheti, nem forditva.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md)
   - [reviewPolicyRuntime.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts)
   - [metaReviewGateCurrentRunFinalization.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts)
   - [metaReviewGateCurrentRunRoutePersistence.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts)
   - [metaReviewGateAutoRework.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts)
   - [convergedRoutingPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/converged/convergedRoutingPreparation.ts)
   - [policyValidation.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyValidation.ts)
   - [approvalResultMapping.ts](/Users/felho/dev/pairflow/src/v11/application/approval/approvalResultMapping.ts)
   - [reworkIntent.ts](/Users/felho/dev/pairflow/src/v11/shared/approval/reworkIntent.ts)
   - [startCommandTmuxLaunch.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandTmuxLaunch.ts)
   - [startCommandResumeKickoffMessages.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandResumeKickoffMessages.ts)
   - [startCommandResumeKickoffMessageBuilders.ts](/Users/felho/dev/pairflow/src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts)
   - [statusCommandApi.ts](/Users/felho/dev/pairflow/src/v11/shared/status/statusCommandApi.ts)
   - [statusCommandViewBuilder.ts](/Users/felho/dev/pairflow/src/v11/shared/status/statusCommandViewBuilder.ts)
   - [listCommandEntryBuilder.ts](/Users/felho/dev/pairflow/src/v11/shared/list/listCommandEntryBuilder.ts)
   - [listCommandEntryProjection.ts](/Users/felho/dev/pairflow/src/v11/shared/list/listCommandEntryProjection.ts)
2. Closed terms inherited:
   - Phase 3A requested/effective/support vocabulary
   - Phase 3B activation-core truth
   - shared `buildBubbleReviewPolicyRuntimeView(...)` (`reviewPolicyRuntime.ts`) read-model contract only compatibility-preserving consume-pathon erintheto
   - helper-touch rule: consume-path hardening megengedett, de helper-side authority production vagy reinterpretation nem
3. Forbidden reinterpretations:
   - `buildBubbleReviewPolicyRuntimeView(...)` nem valhat Phase 3C-ben uj activation authority helperre vagy optimistic bypass projectorra
   - remote runtime-unavailable parity nem legitimal remote executor/restart/attach ownership-bovitest
4. Drift status:
   `no_drift_if_phase3c_consumes_phase3b_activation_truth_without_reopening_it`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`,
   `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts`,
   `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts`,
   `src/v11/application/converged/convergedRoutingPreparation.ts`,
   `src/v11/domain/convergence/policyValidation.ts`,
   `src/v11/application/approval/approvalResultMapping.ts`,
   `src/v11/shared/approval/reworkIntent.ts`,
   `src/v11/application/start/startCommandTmuxLaunch.ts`,
   `src/v11/application/start/startCommandResumeKickoffMessages.ts`,
   `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts`,
   `src/v11/shared/status/statusCommandApi.ts`,
   `src/v11/shared/status/statusCommandViewBuilder.ts`,
   `src/v11/shared/list/listCommandEntryBuilder.ts`,
   `src/v11/shared/list/listCommandEntryProjection.ts`.
2. Actual touched scope:
   `consumer_family_alignment` primary, `fail_closed_hardening` secondary, bounded `workflow_orchestration_consume` + `read_model_consumer_parity` tertiary.
3. Why this is separate from Phase 3B:
   ezek mar nem a live pass-path activation corehoz tartoznak, hanem residual runtime consume es recovery branches.
4. Start/resume boundedness note:
   a task a kickoff/runtime projection parityt ownershipolja, nem a tmux pane roster, agent inventory vagy startup UX redesign teljes ujratervezeset.
5. Why no further split is required:
   a touched surfaces negy consumer bucketbe esnek, de mind ugyanannak az orokolt Phase 3B activation truth-nak downstream consume/parity closure-i; nincs producer, schema vagy shared-contract reopen, es a remote unavailable parity valos entrypointjai is ebbe a consume familybe esnek, igy a split tovabbi dokumentum-fragmentaciot okozna ugyanazon successor seam menten.

### Authority Boundary Map

1. Authority producer:
   out of scope; inherited from Phase 3B activation core.
2. Persisted authority:
   reuse existing `bubble.toml review_policy`.
3. Internal execution consumers:
   meta-review finalize, auto-rework, convergence policy, approval/rework.
4. Workflow orchestration consumers:
   converged routing, startup/resume kickoff consume routing; lasd Current Codebase Check #7.
5. Read model consumers:
   status/list review-policy consume family local invalid-state projectionje, valamint a remote runtime-unavailable snapshotok fail-closed projectionje a meglevo status/list surface-eken; lasd Current Codebase Check #5-6.
6. Cleanup/recovery consumers:
   approval rework, deferred rework, restart/resume topology continuity.

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
   `internal_execution_consumers` + `workflow_orchestration_consumers` + `cleanup_recovery_consumers` + `read_model_consumers`
4. Why collapse is safe:
   ugyanannak a residual topology consume familynek a folytatasai, uj contract drift, producer-write vagy schema-risk nelkul; a broad status/list read-model parity is ugyanennek az orokolt truth-nak fail-closed consume kovetkezmenye.
5. Explicitly deferred closures:
   - UX polish
   - non-essential naming cleanup
   - remote lifecycle recovery / attach / restart redesign

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
