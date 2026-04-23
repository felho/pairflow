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
plan_ref: plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/runtime-review-policy-reset-and-phasing-plan-v1.md
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
5. Status / list local invalid-state view:
   invalid vagy driftelt local RUNNING state nem mutathat optimista `effective_loop_mode = "meta_only"` truthot ott, ahol a live activation authority mar nem bizonyitott; fail-closed guarded/full baseline vagy explicit diagnostics kell a meglevo status/list projectionokban.
6. Status / list remote runtime-unavailable view:
   remote runtime-unavailable snapshot mellett a projected bypass truth fail-closed marad a meglevo status/list surfacesen, remote executor contract-atiras nelkul.

### In Scope

1. Converged / auto-converge residual branch alignment.
2. Meta-review finalize / auto-rework residual topology alignment.
3. Approval / deferred rework residual topology alignment.
4. Start / resume kickoff residual topology alignment.
5. Status / list read-model fail-closed parity alignment.
6. Remote runtime-unavailable snapshot parity a status/list consume familyben.
7. Scope-boundedness es no-hidden-ownership-expansion proof a task artifacton belul.
8. A fenti residual branch-ek es broad read-model consume pontok regresszios es fail-closed tesztjei.

### Out of Scope

1. Phase 3A contract vocabulary ujranyitasa.
2. Phase 3B activation-core authority ujranyitasa.
3. Uj review-policy field vagy schema valtoztatas.
4. UI mutation route ownership-bovites vagy presentational redesign.
5. A shared `buildBubbleReviewPolicyRuntimeView(...)` (`reviewPolicyRuntime.ts`) helper contract authority seamkent valo reinterpretacio, a compatibility-preserving consume-path alignment explicit carve-outjan kivul.
6. Remote executor lifecycle, attach/restart recovery contract vagy command-profile ownership atirasa.
7. Parent-plan altali utolagos scope-bovites vagy acceptance criteria duplikacioja.
8. Archivalt predecessor dokumentumok tartalmi ujranyitasa broken-link/archival sync szuksegen kivul.

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
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts` | meta-review finalize retained guards + route persistence | `sticky_human_gate`, threshold fallback es finalize diagnostics retained guard marad; a human-gate route decision, transcript/state persistence es resumed topology ugyanarra a resolved truth-ra ul, es egyik retained guard sem lephet elo bypass-topology authorityva | P1 | required-now |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts` | meta-review auto-rework resumed topology | a residual route, delivery metadata es resumed state ugyanarra a resolved truth-ra ul, reviewer-owned topology drift nelkul | P1 | required-now |
| CS4 | `src/v11/application/approval/approvalResultMapping.ts`, `src/v11/shared/approval/reworkIntent.ts` | rework / recovery | approval es deferred rework a next-round `active_role` / `execution_context` / `round_role_history` shape-et ugyanabbal a resolved topologyval epiti fel, nem vak implementer/reviewer alternacioval | P1 | required-now |
| CS5 | `src/v11/application/start/startCommandTmuxLaunch.ts`, `src/v11/application/start/startCommandResumeKickoffMessages.ts`, `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts` | start / resume residual topology | a launch wiring csak annyiban erintett, amennyiben kickoff message selection/forwarding parityt tovabbit; a resume branch-valasztas es kickoff guidance ugyanazt a residual activation truth-ot consume-olja, pane-layout, launch-ack vagy broader startup/session redesign nelkul | P1 | required-now |
| CS6 | `src/v11/shared/status/statusCommandApi.ts`, `src/v11/shared/status/statusCommandViewBuilder.ts`, `src/v11/shared/list/listCommandEntryBuilder.ts`, `src/v11/shared/list/listCommandEntryProjection.ts` | broad status/list read-model fail-closed parity | invalid/drifted local state es remote runtime-unavailable esetben a cache/live/fallback route es a projected `effective_loop_mode`/diagnostics nem sugallhat bizonyitott bypass truthot, ha a live activation authority nem eleg; ez a meglevo status/list API->builder->projection consume csaladban zarul, remote pointer/executor contract-atiras nelkul | P1 | required-now |

### 2) Branch / Fixture Inventory

| ID | Branch | Must prove |
|---|---|---|
| B1 | `requested=meta_only` + Phase 3B activation proven + `converged` path | a convergence guard es policy nem kovetel reviewer-only residual topologyt aktiv bypass mellett |
| B2 | `requested=meta_only` + Phase 3B activation proven + meta-review rework path | auto-rework es human fallback route retained guardokkal mukodik, de a resumed topology nem ir vissza hard-coded reviewer historyre |
| B3 | `requested=meta_only` + Phase 3B activation proven + approval/deferred rework path | a kovetkezo round state-write es `execution_context` a resolved topologyval marad koherens |
| B4 | `requested=meta_only` + Phase 3B activation proven + start/resume path | resume/fresh-start kickoff projection ugyanazt a topology truth-ot tukrozi, mint a persisted active context |
| B5 | `requested=meta_only` + activation unresolved vagy `requested=full` baseline | minden residual branch fail-closed reviewer/full baseline-on marad, explicit diagnostics vagy baseline copy mellett |
| B6 | `requested=meta_only` + invalid/drifted local RUNNING | a status/list consume family guarded/full baseline-t vagy explicit diagnosticsot mutat, optimista bypass truth nelkul |
| B7 | `requested=meta_only` + remote runtime-unavailable snapshot | a status/list consume family remote snapshot consume-ja fail-closed marad, a meglevo remote snapshot contracton belul |
| B8 | scope-boundedness / no hidden ownership expansion | nincs uj `review_policy` field/schema, shared-helper authority reopen, UI mutation route ownership-bovites, remote lifecycle redesign vagy broader startup/session ownership-bovites |

### 3) Test Matrix

| ID | Scenario | Assertions | Priority |
|---|---|---|---|
| T1 | converged residual branch activated bypass mellett | `converged` guard es policy ugyanazt a Phase 3B activation truth-ot consume-olja, reviewer-only drift nelkul | P1 |
| T2 | meta-review finalize / auto-rework activated bypass mellett | residual route, transcript metadata es resumed state ugyanarra a truth-ra ul, mikozben `sticky_human_gate` es threshold fallback retained guard marad es nem emelkedik bypass authorityva | P1 |
| T3 | approval / deferred rework activated bypass mellett | next-round `active_role`, `execution_context` es `round_role_history` koherens marad | P1 |
| T4 | start / resume residual branch activated bypass mellett | kickoff topology es diagnostics nem driftel vissza reviewer-centered baseline-re | P1 |
| T5 | activation-unresolved residual fallback | fail-closed full/reviewer baseline marad, uj authority termeles nelkul | P1 |
| T6 | invalid/drifted local broad read-model parity | a `status` es `list` consume surfaces optimista bypass truth nelkul fail-closed vagy expliciten diagnosticos maradnak | P1 |
| T7 | remote runtime-unavailable parity | a `status` es `list` consume surfaces remote snapshot projectionje unavailable runtime mellett sem sugall bizonyitott bypass truthot | P1 |
| T8 | residual alignment scope gate | nincs uj `review_policy` field/schema, shared-helper authority reopen, UI mutation route ownership-bovites vagy presentational scope; a start/resume resz kickoff/projection parityre korlatozodik | P1 |

### 4) Target File Coverage Map

| Coverage | Source / Test anchors | Expected proof |
|---|---|---|
| C1 | `convergedRoutingPreparation.ts`, `policyValidation.ts`, `tests/v11/application/converged/convergedRoutingPreparation.test.ts`, `tests/v11/domain/convergence/policy.test.ts`, `tests/v11/domain/convergence/repeatCleanAutoconverge.test.ts` | B1 + T1 activated convergence parity |
| C2 | `metaReviewGateCurrentRunFinalization.ts`, `metaReviewGateCurrentRunRoutePersistence.ts`, `metaReviewGateAutoRework.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts` | B2 + T2 + retained human-gate/threshold fallback nem valik bypass authorityva, es a human-gate route persistence proof boundary sem marad a taskon kivul |
| C3 | `approvalResultMapping.ts`, `reworkIntent.ts`, `tests/v11/application/approval/approvalResultMapping.test.ts`, `tests/v11/shared/approval/reworkIntent.test.ts` | B3 + T3 next-round state-write es recovery topology parity |
| C4 | `startCommandTmuxLaunch.ts`, `startCommandResumeKickoffMessages.ts`, `startCommandResumeKickoffMessageBuilders.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts`, `tests/v11/application/start/startCommandResumeKickoffMessageBuilders.test.ts` | B4 + T4 launch/resume kickoff projection parity, explicit start/resume scope-boundedness |
| C5 | `statusCommandApi.ts`, `statusCommandViewBuilder.ts`, `listCommandEntryBuilder.ts`, `listCommandEntryProjection.ts`, `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts` | B6 + T6 invalid/drifted local read-model fail-closed parity a meglevo status/list API->builder->projection consume familyben; ebben a slice-ban a proofot a core-layer status/list tesztek adjak, nem kulon UI mutation testek |
| C6 | `statusCommandApi.ts`, `statusCommandViewBuilder.ts`, `listCommandEntryBuilder.ts`, `listCommandEntryProjection.ts`, `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts` | B7 + T7 remote runtime-unavailable snapshot parity a meglevo status/list API->builder->projection surfacesen; ebben a slice-ban a proofot a remote-unavailable core-layer status/list tesztek adjak, nem kulon v11-layer unit testek |
| C7 | full target diff scope + acceptance review | B5 + B8 + T5 + T8 fail-closed baseline, read-model fallback es no-hidden-ownership-expansion scope gate |

## L2 - Acceptance Criteria

1. A residual runtime branches Phase 3C utan ugyanazt a named Phase 3B activation truth-ot consume-oljak; egyik consumer sem vezet be sajat bypass authority seamet.
2. A convergence, meta-review finalize/auto-rework, approval/deferred rework, start/resume es broad status/list consume csaladban a next-route, next-round state, kickoff projection es projected review-policy diagnostics ugyanazzal a resolved topologyval maradnak koherensek.
3. `sticky_human_gate`, reviewer-only active-role guard, round alternation evidence vagy stale startup projection Phase 3C utan csak retained fallback/diagnostics lehet, canonical bypass truth nem.
4. Activation hianyaban a residual branches es a hozzajuk tartozo status/list read-model consume family fail-closed reviewer/full vagy guarded baseline-on marad.
5. A shared `buildBubbleReviewPolicyRuntimeView(...)` (`reviewPolicyRuntime.ts`) helper contractja nem nyilik ujra; ha a task ezt erinti, az csak compatibility-preserving consume-path alignment lehet.
6. A Phase 3A contract vocabulary es a Phase 3B activation-core authority nem nyilik ujra, es a task nem vezet be uj `review_policy` fieldet vagy schema-mutatast.
7. Invalid/drifted local state mellett a status/list read-model consume family nem mutathat optimista bypass truthot.
8. Remote runtime-unavailable snapshot mellett a status/list consume family remote snapshot projectionje nem mutathat bizonyitott bypass truthot.
9. A task nem huz be UI mutation route ownershipot vagy presentational redesign scope-ot; a start/resume resz kickoff/projection parityre korlatozodik, a remote resz pedig status/list read-model fail-closed parityre.

## Hardening Backlog

1. `later-hardening`: ha kesobb valodi UI read-model parity gap marad a status/list surfacesen tul, az kulon UI-focused follow-up taskban menjen.
2. `later-hardening`: retained naming cleanup kulon polish taskban menjen.
