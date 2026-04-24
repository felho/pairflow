---
artifact_type: task
artifact_id: task_runtime_review_policy_reviewer_bypass_activation_core_phase3b_v1
title: "Runtime Review Policy Reviewer Bypass Activation Core (Phase 3B)"
status: draft
phase: phase3b
target_files:
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/application/pass/emitPassContextBuilder.ts
  - src/v11/application/pass/passWorkspaceContextPreparation.ts
  - src/v11/domain/pass/handoff.ts
  - src/v11/domain/pass/passEnvelopeDraft.ts
  - src/v11/domain/pass/lifecycleMetricMetadata.ts
  - src/v11/application/pass/passFlowDependencyWiring.ts
  - src/v11/application/pass/normalPassDeliveryExecution.ts
  - src/v11/application/pass/reviewerDelivery.ts
  - src/v11/application/pass/normalPassFlowInvocationBuilders.ts
  - src/v11/application/pass/postAppendStateWriter.ts
  - src/v11/shared/state/executionContext.ts
  - tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts
  - tests/v11/application/pass/emitPassContextBuilder.test.ts
  - tests/v11/application/pass/passWorkspaceContextPreparation.test.ts
  - tests/v11/application/pass/normalPassDeliveryExecution.test.ts
  - tests/v11/application/pass/reviewerDelivery.test.ts
  - tests/v11/application/pass/passFlowDispatch.test.ts
  - tests/v11/application/pass/passFlowDependencyWiring.test.ts
  - tests/v11/application/pass/postAppendStateWriter.test.ts
  - tests/core/state/executionContext.test.ts
  - tests/v11/domain/pass/handoff.test.ts
prd_ref: null
plan_ref: plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/archive/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md
  - plans/archive/tasks/runtime-review-policy-auto-rework-threshold-phase2.md
  - plans/archive/tasks/runtime-review-policy-reviewer-bypass-contract-phase3a.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
  - plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-reviewer-cutover-phaseE.md
  - plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-meta-reviewer-cutover-phaseE.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Reviewer Bypass Activation Core (Phase 3B)

## Current Codebase Check (2026-04-22)

1. A Phase 3A contract mar merged es archivalt baseline:
   - `plans/archive/tasks/runtime-review-policy-reviewer-bypass-contract-phase3a.md`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - a canonical requested/effective/support vocabulary mar explicit, es `meta_only` jelenleg fail-closed `effective_loop_mode = "full"` allapotban marad.
2. A pass-path current tree tovabbra is reviewer-topologyra epul:
   - `src/v11/domain/pass/handoff.ts`
   - implementer `PASS` -> reviewer
   - reviewer `PASS` -> implementer
   - `recipientRole` ma csak `implementer | reviewer`.
3. A protocol-level delivery metadata mar hordoz role-target projectiont:
   - `src/v11/domain/pass/passEnvelopeDraft.ts`
   - `src/v11/domain/pass/lifecycleMetricMetadata.ts`
   - `src/types/protocol.ts`
   - a protocol mar ismeri a `delivery_target_role = "meta_reviewer"` erteket, de a current handoff/domain oldali resolution meg nem.
4. A pass command ingress current tree-ben explicit builder + workspace-context preparation seam-en megy at:
   - `src/v11/application/pass/emitPassContextBuilder.ts`
   - `src/v11/application/pass/passWorkspaceContextPreparation.ts`
   - a resolved handoff truth ide fut be eloszor a pass command orchestration felol.
5. A pass-flow wiring es a delivery current tree ma reviewer-owned branchre ul:
   - `src/v11/application/pass/passFlowDependencyWiring.ts`
   - `src/v11/application/pass/normalPassDeliveryExecution.ts`
   - `src/v11/application/pass/reviewerDelivery.ts`
   - `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`
6. A post-pass RUNNING state mutation kozvetlenul a resolved handoff recipient role-jabol epul:
   - `src/v11/application/pass/postAppendStateWriter.ts`
   - a `recipientRole` nem csak projection, hanem `active_role` es `execution_context.active_role` source input is.
7. A `BubbleExecutionContext` mar kepes `meta_reviewer` active role-t canonical output parityval tarolni:
   - `src/v11/shared/state/executionContext.ts`
8. Emiatt a current 3B gap mar nem contract- vagy UI-surface hiany, hanem a live pass-path activation core hianya:
   a bypass policy kerheto es operator-facingen latszik, de a tenyleges implementer -> meta-review direct handoff core meg nincs bezarva ugyanazon authority menten.
9. A `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` current tree-ben shared multi-consumer helper:
   - kozvetlenul fogyasztja a `status`, `list`, `UI update conflict` es `meta-review finalize` consume csalad is,
   - emiatt a Phase 3B nem irhatja at hallgatolagosan ennek a broad consume familynek a semanticsat,
   - ha activation-proof logika kell, azt pass-path-only helperrel vagy explicit compatibility-preserving extracttel kell bevezetni.

## L0 - Policy

### Goal

Lezarni a reviewer bypass Phase 3B activation core-t ugy, hogy:
1. a `review_policy.review_loop_mode = "meta_only"` csak explicit activation-proof mellett valhasson `effective_loop_mode = "meta_only"` allapotta a pass-path-owned runtime helperben es a kozvetlen pass-path consume pontokban,
2. a live pass-path activation authority ugyanazon canonical chainen doljon el, amelyre a Phase 3A requested/effective/support contract mar epul,
3. a handoff, pass delivery, post-pass state write es execution-context truth ugyanazt az aktiv topology dontest kovesse,
4. a rendszer fail-closed maradjon, ha activation eligibility nem bizonyithato,
5. a broad status/list/UI/remote read-model fail-closed parity ne legyen implicit closure-kriterium ebben a slice-ban,
6. es a residual convergence, meta-review finalize, approval/rework es resume/start fallout se keveredjen bele ebbe a bounded slice-ba.

### Domain / Control Model Summary

1. Business invariant:
   a `meta_only` Phase 3B-ben sem puszta operatori intent; csak akkor valhat effective runtime modda, ha a live pass-path activation explicitten bizonyithato.
2. Canonical control model:
   a bypass truth source tovabbra is a workflow-owned `review_policy`, de az `effective_loop_mode` Phase 3B-ben mar egy explicit activation helper altal feloldott same-authority runtime view-bol jon a pass-path-owned consume csaladban.
3. Activation rule:
   `requested_loop_mode = "meta_only"` onmagaban nem eleg; kell explicit activation eligibility/provenance, amely egyszerre vezerli a pass-path runtime helper effective mode-jat es a live handoff/state-write topologyt.
4. Read-path rule:
   a Phase 3B csak azokat a read-path consume pontokat ownershipolja, amelyek kozvetlenul a live pass-path activation helperhez es a pass command/runtime topologyhoz tartoznak; invalid/drifted status/list/UI/remote parity successor-owned.
5. Forbidden fallback:
   `sticky_human_gate`, `human_gate_sticky_bypass`, stale delivery metadata, UI/store local state vagy transcript parser nem valhat bypass activation truth-va.
6. Allowed resolution path:
   `review_policy` + explicit activation helper + pass-path topology resolution ugyanazon named authority seam alatt.
7. Missing-data rule:
   ha activation proof nem all fenn, a rendszer fail-closed `effective_loop_mode = "full"` baseline-on marad, es a reviewer path marad canonical.
8. Phase boundary:
   - contract closure: predecessor-owned by Phase 3A
   - activation core closure: owned here
   - live pass-path internal execution closure: owned here
   - workflow-orchestration consume closure a pass-pathon: owned here
   - residual convergence/recovery/start-resume closure: successor-owned Phase 3C
9. Shared-helper rule:
   a shared `reviewPolicyRuntime` helper family Phase 3B-ben csak ugy modosithato, ha a broad `status/list/UI/meta-review-finalize` consume family Phase 3C-ownershipa nem valik implicitte; ehhez pass-path-only activation helper vagy compatibility-preserving extract kell.

### Plan Linkage

1. Parent plan gap closed:
   a Phase 3A utan bent maradt activation core ownership a live pass-pathon.
2. Depends on:
   [runtime-review-policy-foundation-and-authority-refactor-phase1.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md),
   [runtime-review-policy-auto-rework-threshold-phase2.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-auto-rework-threshold-phase2.md),
   [runtime-review-policy-reviewer-bypass-contract-phase3a.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-reviewer-bypass-contract-phase3a.md)
3. Unlocks / impacts successors:
   a residual convergence, meta-review finalize, rework/resume es startup fallout, valamint a broad status/list/UI/remote read-model fail-closed parity kulon bounded Phase 3C taskkent zarhato ugyanarra az activation truth-ra epulve.
4. Task-list impact:
   ez mar nem full bypass rollout task, hanem activation core slice; a residual runtime alignment successor-owned.
5. Inherited validation / exit expectation:
   a task akkor zarult, ha a live pass-path runtime behavior, valamint a pass-path-owned runtime helper consume csalad ugyanarra a canonical activation truth-ra ul.
6. Remaining-task viability rule:
   a tasknak eletkepes successor seamet kell hagynia a residual runtime alignmentnak anelkul, hogy a Phase 3A contractot vagy a 3B activation core truth-ot ujra kellene tervezni.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [reviewPolicyRuntime.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts)
   - [emitPassContextBuilder.ts](/Users/felho/dev/pairflow/src/v11/application/pass/emitPassContextBuilder.ts)
   - [passWorkspaceContextPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passWorkspaceContextPreparation.ts)
   - [handoff.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/handoff.ts)
   - [passEnvelopeDraft.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/passEnvelopeDraft.ts)
   - [lifecycleMetricMetadata.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/lifecycleMetricMetadata.ts)
   - [passFlowDependencyWiring.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passFlowDependencyWiring.ts)
   - [normalPassDeliveryExecution.ts](/Users/felho/dev/pairflow/src/v11/application/pass/normalPassDeliveryExecution.ts)
   - [reviewerDelivery.ts](/Users/felho/dev/pairflow/src/v11/application/pass/reviewerDelivery.ts)
   - [normalPassFlowInvocationBuilders.ts](/Users/felho/dev/pairflow/src/v11/application/pass/normalPassFlowInvocationBuilders.ts)
   - [postAppendStateWriter.ts](/Users/felho/dev/pairflow/src/v11/application/pass/postAppendStateWriter.ts)
   - [executionContext.ts](/Users/felho/dev/pairflow/src/v11/shared/state/executionContext.ts)
2. Canonical elements:
   - `review_policy.review_loop_mode`
   - `requested_loop_mode`
   - `effective_loop_mode`
   - `support_status`
   - activation eligibility / provenance helper
   - runtime handoff recipient role
   - post-pass `active_role` / `execution_context`
3. Compat-only elements:
   - protocol-level `delivery_target_role = "meta_reviewer"` support
   - lifecycle metric projection
   - operator copy
4. Closed terms inherited from Phase 3A:
   - `meta_only` requested policy != activation proof
   - `sticky_human_gate` != reviewer-bypass signal
   - `human_gate_sticky_bypass` != workflow bypass topology
   - `support_status` enum nem nyithato ujra ebben a taskban
5. Forbidden reinterpretations:
   - a protocol metadata `delivery_target_role` nem lehet authority-forras a workflow topology felol, csak projection
   - a runtime view `effective_loop_mode` nem valhat optimistic UI truth-ta live handoff parity nelkul
   - a shared `buildBubbleReviewPolicyRuntimeView(...)` helper nem reinterpretalhato ugy, mintha mar kizarlag pass-path-owned consume lenne
6. Drift status:
   `no_drift_if_phase3b_preserves_phase3a_contract_and_closes_live_pass_path_activation_only`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`,
   `src/v11/application/pass/emitPassContextBuilder.ts`,
   `src/v11/application/pass/passWorkspaceContextPreparation.ts`,
   `src/v11/domain/pass/handoff.ts`,
   `src/v11/domain/pass/passEnvelopeDraft.ts`,
   `src/v11/domain/pass/lifecycleMetricMetadata.ts`,
   `src/v11/application/pass/passFlowDependencyWiring.ts`,
   `src/v11/application/pass/normalPassDeliveryExecution.ts`,
   `src/v11/application/pass/reviewerDelivery.ts`,
   `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`,
   `src/v11/application/pass/postAppendStateWriter.ts`,
   `src/v11/shared/state/executionContext.ts`.
2. Actual touched scope:
   `internal_execution_consumers` primary, `workflow_orchestration_consumers` secondary; bounded `read_model_consumers` csak ott fer bele, ahol a live pass-path helper parityjahoz szukseges.
3. Why this bounded slice is now narrower:
   a residual convergence, meta-review finalize, approval/rework es start/resume consume csaladok, valamint a broad status/list/UI/remote invalid-state parity nem ownershipoltak itt; azok kulon successor taskba mennek.
4. Ingress/wrapper note:
   a live activation-core truth nem csak a handoff/domain es a delivery leaf-ekben jelenik meg, hanem a pass command builder -> workspace-context preparation -> normal delivery wrapper chainen is atmegy; ezeket a task explicit ownershipolja.
5. Hidden scope ruled out:
   meta-review gate finalization, convergence routing, approval/rework recovery, start/resume kickoff topology, broad status/list/UI/remote invalid-state parity, compare-and-swap conflict hardening, UI mutation contract, uj review-policy field, threshold semantics redesign.
6. Shared helper compatibility note:
   mivel a `reviewPolicyRuntime.ts` current tree-ben shared multi-consumer anchor, a task csak olyan extractet vagy helper-szetvalasztast ownershipolhat, amely a non-pass-path consume family Phase 3C-s semanticsat nem irja at hallgatolagosan.
7. Branch inventory note:
   `requested=full`,
   `requested=meta_only + activation proven`,
   `requested=meta_only + activation unresolved`,
   `post-pass state write after activated handoff`,
   `command ingress / workspace context handoff parity`,
   `delivery target metadata parity`
   kotelezoen reprezentalt.
8. Why the declared task shape matches reality:
   a current tree-ben a live bypass activation core a runtime view + handoff + delivery + post-pass state write + execution context consume csaladban zarhato; a tobbi residual branch nem kell ehhez ugyanebben a taskban.

### Authority Boundary Map

1. Authority producer:
   a workflow-owned review-policy + activation helper altal feloldott runtime topology.
2. Persisted authority:
   `bubble.toml review_policy` marad a canonical requested policy source.
3. Internal execution consumers:
   pass command ingress/workspace context, pass handoff, pass delivery, post-pass state write, execution context.
4. Workflow orchestration consumers:
   pass command builder, workspace-context preparation, pass-flow wiring es normal-pass invocation compose.
5. Read model consumers:
   bounded `reviewPolicyRuntime` helper consume ott, ahol a pass-path activation proofjat ugyanabban a slice-ban kell atvinni; broad status/list/UI/remote read-model hardening successor-owned.
6. Cleanup/recovery consumers:
   out of scope ebben a taskban; successor-owned Phase 3C.

### Closure-Budget Gate

1. Touched closure buckets:
   - `shared_contract`
   - `workflow_orchestration_consumers`
   - `internal_execution_consumers`
   - `read_model_consumers` (bounded pass-path helper consume only)
2. Explicitly not touched:
   - `authority_producer`
   - `persisted_authority_or_schema`
   - `cleanup_recovery_consumers`
   - `ui_mutation_contract`
   - `requested/effective/support vocabulary`
3. Intentionally collapsed closures:
   `shared_contract` + bounded `read_model_consumers`,
   `workflow_orchestration_consumers` + `internal_execution_consumers`
4. Why collapse is safe:
   ugyanaz az activation helper zarja a pass-path runtime view effective mode-jat es a live pass-path topology consume csaladot; broad operator/read-model parityt itt nem ownershipolunk.
5. Explicitly deferred closures:
   - convergence residual alignment
   - meta-review finalize / auto-rework alignment
   - approval/rework recovery alignment
   - start/resume fallout
   - broad status/list/UI/remote read-model fail-closed parity
   - UX polish

### Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `BubbleReviewPolicyRuntimeView` | shared runtime helper; direct consumers today include pass-path-adjacent consume family plus status/list/UI conflict es meta-review finalize surfaces | behavior closure on existing fields | a Phase 3B activation truth vagy uj pass-path-only helperen, vagy explicit compatibility-preserving extracten zaruljon; broad shared-consumer semantics hallgatolagos atirasa nem megengedett | invalid/drifted status/list/UI/remote parity, meta-review-finalize alignment es broader diagnostics hardening Phase 3C-ben |
| Pass command ingress contract | pass command builder, workspace-context preparation | behavior closure | a live activation truth a builder -> workspace-context preparation chainen is ugyanaz maradjon, mint a handoff leaf-ekben | none |
| Pass handoff contract | pass domain, pass delivery, lifecycle metrics | additive or widening | a recipient-role topology tudjon reviewer helyett `meta_reviewer` targetet feloldani, fail-closed branch-ekkel | residual runtime branches in Phase 3C |
| Post-pass running state | post-append state mutation, active execution authority | behavior closure | a resolved handoff target ugyanazt az `active_role` / `execution_context` truth-ot irja, amit a runtime view es delivery path hasznal | restart/rework fallout in Phase 3C |
| Delivery metadata | protocol payloads, lifecycle metrics | additive | projection csak resolved handoffbol jojjon | none |

### Baseline Preservation

1. Must-preserve behaviors:
   - a Phase 3A requested/effective/support mezonevek es jelentesek valtozatlanok maradnak
   - `meta_review_auto_rework_min_severity` semantics valtozatlan marad
   - activation hianyaban reviewer path a canonical fallback
   - a transcript utani state write fail-closed discipline valtozatlanul megmarad
2. Allowed resolution paths:
   - `review_policy` -> activation helper -> runtime view + pass command ingress/workspace-context topology resolution
   - activated runtime topology -> handoff -> normal delivery wrapper -> delivery leaf -> post-pass state write -> execution-context parity
3. Forbidden regression interpretations:
   - a meta-reviewer runtime target nem jelentheti, hogy a residual convergence vagy recovery branch-ek mar ownershipoltak itt
   - `meta_only` aktivacio nem olvashato vissza protocol metadata projectionbol
4. Replacement proof required if removed:
   ha reviewer-specific handoff baseline kikerul, explicit equivalence proof kell arra, hogy `requested=full` baseline parity nem romlik.

### Success / Completion Proof Boundary

1. Current canonical success proof source:
   a review-policy runtime view ma explicitten guarded marad, mikozben a live pass-path reviewer-centered.
2. Target canonical success proof source:
   ugyanaz a canonical activation authority egyszerre bizonyitja:
   - `effective_loop_mode = "meta_only"`
   - command ingress / workspace-context handoff parityt
   - `meta_reviewer` live handoff targetet
   - post-pass `active_role` / `execution_context` parityt
3. Current canonical completion proof source:
   nincs; a current tree csak requested policy + guarded projectiont tud.
4. Target canonical completion proof source:
   automated tests bizonyitjak, hogy activation mellett a live pass-path tenylegesen nem reviewer loopra megy vissza.
5. Proof-parity rule:
   `effective_mode_must_match_live_pass_path_route`
6. Final truth surfaces affected:
   `BubbleReviewPolicyRuntimeView`, pass command ingress/workspace context, pass handoff resolution, post-pass RUNNING state, delivery target metadata, execution context role/output.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape:
   `activation_or_read_model`
2. Secondary shape:
   `consumer_family_alignment`
3. Preconditions that must pass before side effects:
   - requested policy `meta_only`
   - activation eligibility/provenance helper explicit successre jusson
   - live pass-path topology resolution coherent legyen a command ingress -> workspace-context -> delivery wrapper chainen is
4. Side effects forbidden before preconditions pass:
   - `effective_loop_mode = "meta_only"`
   - implementer -> meta-review direct handoff
   - post-pass `active_role = meta_reviewer`
5. Invalid/precondition-failure behavior:
   zero activation side effect; current full-review topology marad explicit fail-closed diagnostics mellett.
6. Coordination primitives in scope:
   a meglevo state conflict es write discipline reuse-ja kotelezo; uj lock/idempotency boundary nem ownershipolt.
7. Why this shape mix is safe:
   ugyanaz az activation truth zarja a runtime view effective mode-jat es a live pass-path consume csaladot; cleanup/recovery closure nincs belekeverve.

### In Scope

1. Explicit activation helper vagy ezzel ekvivalens same-authority runtime resolution bevezetese a Phase 3A contract tetejere.
2. A `meta_only` effective runtime mode feloldasa csak explicit activation-proof mellett.
3. Pass command ingress es workspace-context handoff parity lezárasa activated meta-only topology alatt.
4. Implementer oldali handoff target es delivery parity lezárasa activated meta-only topology alatt.
5. A resolved handoff utani RUNNING state write alignment activated meta-only topology alatt.
6. Lifecycle metrics es protocol metadata parity, hogy a projection ne csusszon el a tenyleges live route-tol.
7. A fenti activation-core branch-ek regresszios es parity tesztjei.

### Out of Scope

1. Meta-review gate finalization vagy auto-rework topology alignment.
2. Converged / auto-converge residual branch alignment.
3. Approval / deferred rework recovery alignment.
4. Start / resume kickoff topology alignment.
5. Phase 3A UI mutation contract vagy frontend affordance ujranyitasa.
6. Uj review-policy field vagy schema valtoztatas.
7. Threshold semantics redesign.
8. Uj actor primitive vagy uj protocol output family.

### Safety Defaults

1. Ha activation authority nincs explicitten bizonyitva, a rendszer `effective_loop_mode = "full"` es reviewer route baseline-on marad.
2. A runtime view es a live pass-path topology nem terhet el egymastol; partial activation tilos.
3. A protocol metadata projection nem elozheti meg a workflow truth resolutiont.
4. A residual runtime branches ownershipe tovabbra is successor taskban marad; 3B nem sugallhat teljes Phase 3 closure-t.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - review-policy runtime behavior contract
   - pass command ingress / workspace-context contract
   - pass handoff contract
   - post-pass running state contract
   - execution context awaited-output contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Required split:
   - Phase 3A contract closure: predecessor-owned, already done
   - activation core and live pass-path parity: this task
   - residual runtime alignment: successor-owned Phase 3C

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing |
|---|---|---|---|---|---|
| CS1 | `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` | runtime view builder | A Phase 3A `meta_only -> guarded/full` hard-stop helyett explicit activation helper dontson az effective mode-rol, de csak fail-closed same-authority pathon | P1 | required-now |
| CS2 | `src/v11/application/pass/emitPassContextBuilder.ts`, `src/v11/application/pass/passWorkspaceContextPreparation.ts` | pass command ingress / workspace-context preparation | A live activation truth a pass command builder es a workspace-context handoff preparation chainen is ugyanaz legyen, mint a downstream handoff leaf-ekben | P1 | required-now |
| CS3 | `src/v11/domain/pass/handoff.ts`, `src/v11/domain/pass/passEnvelopeDraft.ts`, `src/v11/domain/pass/lifecycleMetricMetadata.ts` | handoff + envelope + metrics | A pass handoff tudjon explicit `meta_reviewer` recipientet feloldani, a projection es metric parity megtartasaval | P1 | required-now |
| CS4 | `src/v11/application/pass/passFlowDependencyWiring.ts`, `src/v11/application/pass/normalPassDeliveryExecution.ts`, `src/v11/application/pass/reviewerDelivery.ts`, `src/v11/application/pass/normalPassFlowInvocationBuilders.ts` | pass delivery wiring | Delivery path ugyanazt a resolved runtime targetet kovesse, ne reviewer-only branchinget; wiring es wrapper szinten se maradjon hidden reviewer baseline | P1 | required-now |
| CS5 | `src/v11/application/pass/postAppendStateWriter.ts`, `src/v11/shared/state/executionContext.ts` | post-pass state mutation / execution context | A resolved handoff target ugyanarra a canonical activation truth-ra allitsa az `active_role`-t es az `execution_context`-ot, mint a runtime view es delivery path | P1 | required-now |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Review policy runtime view | `meta_only` mindig guarded/full | activation-proof mellett `effective_loop_mode = meta_only`; kulonben fail-closed full | `requested_loop_mode`, `effective_loop_mode`, `support_status` | `blocked_reason_code`, `blocked_prerequisites`, `provenance_note` | behavior closure on existing contract | P1 | required-now |
| Pass workspace context | builderbol eloallitott pass context | a resolved activation truth a builder -> workspace-context preparation chainen is kovetkezetes marad | `handoff`, `implementer`, `reviewer`, `loadedState` | activation provenance | behavior closure | P1 | required-now |
| Pass handoff resolution | recipient `implementer | reviewer` | recipient tudjon `meta_reviewer` targetet is feloldani explicit activation mellett | sender/recipient role truth, next-round truth | diagnostics | widening | P1 | required-now |
| Post-pass running state | handoff-targetbol irt RUNNING state | `active_role`, `active_agent`, `execution_context` ugyanarra a resolved topologyra ul | `active_role`, `active_agent`, `execution_context`, `round` | diagnostics | behavior closure | P1 | required-now |
| Delivery metadata | protocol type mar ismeri `meta_reviewer` role-t | projection csak resolved handoffbol jon | `delivery_target_role` | parity metadata | additive | P1 | required-now |

Normative rules:

1. Phase 3B nem nevezheti at vagy nem interpretalhatja ujra a Phase 3A `requested_loop_mode`, `effective_loop_mode`, `support_status` mezoit.
2. Az activation helper eredmenye egyszerre kell, hogy meghatarozza:
   - runtime view effective mode-jat,
   - pass command ingress/workspace-context handoff truth-jat,
   - handoff targetet,
   - post-pass state write active role/output truth-jat.
3. Ha barmelyik live pass-path consume family nem tud ugyanarra az activation truth-ra ulni, a fallback a `full` reviewer path.
4. A protocol-level `delivery_target_role = meta_reviewer` csak projection; nem lehet a route dontes bemenete.
5. Ha a megvalositas a shared `reviewPolicyRuntime` helper familyhez nyul, kotelezo a compatibility-preserving extract vagy pass-path-only helper boundary; a broad status/list/UI/meta-review-finalize consume family semanticsa nem valtozhat implicit 3B scope-ban.
6. A residual convergence/recovery/start-resume topology Phase 3B-ben nem ownershipolt.

### 3) Shared Contract / Consumer Inventory

| Consumer Bucket | Consumers | This Task Responsibility | Deferred |
|---|---|---|---|
| persisted_authority | `bubble.toml review_policy` | reuse existing canonical store | no schema expansion |
| workflow_orchestration_consumers | pass command builder, workspace-context preparation, pass-flow builders, delivery wiring | close live activation topology | residual runtime branches in Phase 3C |
| read_model_consumers | runtime view family | effective mode truth align actual live route-tal | copy polish |
| internal_execution_consumers | handoff, post-pass state write, execution context | activate and harden bypass core path | none |
| cleanup_recovery_consumers | none in this task | `N/A` | successor-owned Phase 3C |

### 4) Branch / Inventory Matrix

| Branch | Expected Outcome | Priority |
|---|---|---|
| `requested=full` | current reviewer topology es effective full baseline valtozatlan | P1 |
| `requested=meta_only + activation proven` | effective mode `meta_only`, implementer pass reviewer megkerulessel a canonical activation truth szerint folytatodik | P1 |
| `requested=meta_only + activation unresolved` | fail-closed `effective=full`, reviewer topology marad | P1 |
| `pass command ingress / workspace-context parity` | builder es workspace preparation ugyanazt a bypass truth-ot viszi tovabb a handoff resolution fele | P1 |
| `post-pass state write after activated handoff` | `active_role` es `execution_context` a resolved bypass targetet koveti | P1 |
| `delivery target metadata parity` | `delivery_target_role` projection egyezik a resolved runtime topologyval | P1 |

### 5) Test Matrix

| ID | Scenario | Assertions | Priority |
|---|---|---|---|
| T1 | review-policy runtime view activated meta_only | `effective_loop_mode = meta_only` csak explicit activation-proof mellett jelenik meg | P1 |
| T2 | review-policy runtime view unresolved activation | `effective_loop_mode = full`, explicit fail-closed diagnostics maradnak | P1 |
| T3 | pass command ingress / workspace-context activated meta_only mellett | builder es workspace-context preparation ugyanazt a bypass truth-ot viszi tovabb a handoff resolution fele | P1 |
| T4 | handoff resolution implementer under activated meta_only | recipient `meta_reviewer` vagy ezzel ekvivalens bypass target, reviewer loop nelkul | P1 |
| T5 | post-pass state write activated meta_only mellett | `active_role`, `active_agent`, `execution_context` a resolved bypass targetet koveti | P1 |
| T6 | pass envelope / lifecycle metadata projection activated meta_only mellett | `delivery_target_role` projection egyezik a resolved runtime topologyval | P1 |
| T7 | pass delivery wiring/wrapper does not assume reviewer-only target | delivery branch a resolved recipient-role-bol jon, nem old reviewer heuristicbol | P1 |
| T8 | full-path regression | `requested=full` baseline reviewer topology valtozatlan | P1 |
| T9 | protocol metadata cannot self-activate bypass | projection-only metadata authority-forraskent elutasitott | P1 |

## L2 - Acceptance Criteria

1. A `meta_only` review policy Phase 3B utan csak akkor jelenik meg `effective_loop_mode = "meta_only"` allapotban, ha ugyanazon canonical authority seam explicitten aktivnak minositi.
2. Az activated bypass core nem csak a runtime view-ban latszik, hanem a pass command ingress, workspace-context preparation, pass handoff, delivery, post-pass RUNNING state es execution context tenylegesen ugyanarra a truth-ra ul.
3. Activation hianyaban a rendszer fail-closed reviewer pathon marad, es a Phase 3A guarded semantics nem torik.
4. A protocol metadata projection nem tudja megkerulni az activation authorityt.
5. A full review path regressziovedelemmel valtozatlan marad.
6. A Phase 3A requested/effective/support vocabulary es policy-mutation contract erintetlenul megmarad; Phase 3B csak az activation core-t zarja le.

## Acceptance Evidence

1. Runtime-view tesztek bizonyitjak, hogy az effective mode mar a valos activation authorityt tukrozi, nem constant guarded fallbackot.
2. Ingress/handoff/delivery/post-pass-state tesztek bizonyitjak, hogy activated meta-only alatt a live pass-path tenylegesen nem reviewer-topologyra megy vissza.
3. Regression tesztek bizonyitjak, hogy `requested=full` baseline es a Phase 2 threshold lane nem serul.
4. A task artifact maga dokumentalja, hogy a residual runtime alignment kulon successor taskba kerult, nem maradt hidden closure.
5. A task artifact explicitten dokumentalja, hogy a shared `reviewPolicyRuntime` helper current-tree multi-consumer anchor, es a 3B csak compatibility-preserving extracttel vagy pass-path-only helperrel zarhat activation truthot.

## Hardening Backlog

1. `later-hardening`: ha a bypass activation helper kulon typelt helper familyve no, kulon naming cleanup task lehet indokolt.
2. `later-hardening`: ha a delivery/metrics projectionben retained reviewer terminus marad, azt Phase 3C utani cleanup task vigye el.
3. `later-hardening`: operator UX magyarazat az activation eligibilityrol kulon presentational follow-up legyen.
