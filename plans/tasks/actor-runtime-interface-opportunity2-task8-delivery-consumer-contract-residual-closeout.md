---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task8_delivery_consumer_contract_residual_closeout_v1
title: "Actor Runtime Interface Opportunity 2 Task 8: Delivery Consumer Contract Residual Closeout"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/application/approval/approvalCommandContract.ts
  - src/v11/application/approval/approvalCommandApi.ts
  - src/v11/application/approval/approvalCommandDependencyResolution.ts
  - src/v11/application/approval/runApprovalDecisionEffects.ts
  - src/v11/application/reply/replyCommandContract.ts
  - src/v11/application/reply/replyCommandApi.ts
  - src/v11/application/reply/replyCommandDependencyResolution.ts
  - src/v11/shared/kickoff/kickoffDependencyContract.ts
  - src/v11/application/kickoff/kickoffDependencyResolution.ts
  - src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts
  - src/v11/shared/kickoff/kickoffResultBuilders.ts
  - src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts
  - src/v11/shared/askHuman/askHumanCommandContract.ts
  - src/v11/shared/askHuman/askHumanFlowContract.ts
  - src/v11/shared/askHuman/askHumanFlowInvocationContract.ts
  - src/v11/shared/askHuman/askHumanFlowDependencyOptionalOverrides.ts
  - src/v11/shared/askHuman/askHumanRuntimeDependencyForwardingContract.ts
  - src/v11/shared/askHuman/askHumanRuntimeDependencyForwarding.ts
  - src/v11/shared/askHuman/askHumanNotificationEmissionContract.ts
  - src/v11/shared/askHuman/askHumanCommandOrchestrationContract.ts
  - src/v11/shared/askHuman/askHumanFinalizationArtifactsContract.ts
  - src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts
  - src/v11/shared/askHuman/askHumanFinalizationDependencyBuilderContract.ts
  - src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionContract.ts
  - src/v11/application/askHuman/askHumanNotificationEmission.ts
  - src/v11/application/askHuman/askHumanFinalization.ts
  - src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.ts
  - src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts
  - src/v11/application/askHuman/askHumanFinalizationDependencyResolution.ts
  - src/v11/shared/converged/convergedCommandTypes.ts
  - src/v11/application/converged/convergedFlowInvocationBuilders.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/application/converged/convergedFinalizationTypes.ts
  - src/v11/application/pass/passCommandContract.ts
  - src/v11/application/pass/reviewerDelivery.ts
  - src/v11/application/pass/reviewerDeliveryDefaults.ts
  - src/v11/application/pass/autoConvergeConvergedExecution.ts
  - src/v11/application/pass/autoConvergeFlowInvocationBuilders.ts
  - src/v11/application/pass/normalPassDeliveryExecution.ts
  - src/v11/application/pass/normalPassFlowInvocationBuilders.ts
  - src/v11/application/pass/passFlowDependencyWiring.ts
  - src/v11/application/pass/normalPassFinalization.ts
  - src/v11/application/pass/passResultDelivery.ts
  - src/v11/application/pass/passResultBuilder.ts
  - tests/core/human/approval.test.ts
  - tests/core/human/reply.test.ts
  - tests/core/bubble/kickoffBubble.test.ts
  - tests/core/agent/askHuman.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/agent/pass.test.ts
  - tests/contracts/v11/approval.contract.test.ts
  - tests/contracts/v11/reply.contract.test.ts
  - tests/contracts/v11/askHuman.contract.test.ts
  - tests/contracts/v11/kickoff.contract.test.ts
  - tests/contracts/v11/converged.contract.test.ts
  - tests/contracts/v11/pass.contract.test.ts
  - tests/v11/application/askHuman/askHumanNotificationEmission.test.ts
  - tests/v11/application/askHuman/askHumanFinalization.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationDependencyBuilder.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationDependencyResolution.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationArtifacts.test.ts
  - tests/v11/application/askHuman/askHumanRuntimeDependencyForwarding.test.ts
  - tests/v11/application/kickoff/kickoffValidatedExecution.test.ts
  - tests/v11/application/kickoff/kickoffResultBuilders.test.ts
  - tests/v11/application/converged/convergedFlowInvocationBuilders.test.ts
  - tests/v11/application/converged/convergedFinalization.test.ts
  - tests/v11/application/converged/runConvergedFlow.test.ts
  - tests/v11/application/pass/autoConvergeConvergedExecution.test.ts
  - tests/v11/application/pass/autoConvergeFlowInvocationBuilders.test.ts
  - tests/v11/application/pass/normalPassDeliveryExecution.test.ts
  - tests/v11/application/pass/normalPassFlowInvocationBuilders.test.ts
  - tests/v11/application/pass/passFlowDependencyWiring.test.ts
  - tests/v11/application/pass/reviewerDelivery.test.ts
  - tests/v11/application/pass/normalPassFinalization.test.ts
  - tests/v11/application/pass/passResultDelivery.test.ts
  - tests/v11/application/pass/passResultBuilder.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 8: Delivery Consumer Contract Residual Closeout

## Current Codebase Check (2026-04-19)

1. A canonical delivery producer baseline current-tree szinten topology-neutral:
   - `DeliveryAck`
   - `EmitDeliveryAckLikePort`
   - `accepted | rejected`
2. A public/read-model closure current-tree szinten mar kulon, lezart predecessor slice:
   - archived `O2-T7`
3. Ennek ellenere a belso workflow/internal consume family tobb helyen meg mindig retained `tmux` ownershipot hordoz:
   - `src/v11/application/approval/approvalCommandContract.ts`
   - `src/v11/application/approval/runApprovalDecisionEffects.ts`
   - `src/v11/application/reply/replyCommandContract.ts`
   - `src/v11/application/reply/replyCommandApi.ts`
   - `src/v11/shared/kickoff/kickoffDependencyContract.ts`
   - `src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts`
   - `src/v11/shared/kickoff/kickoffResultBuilders.ts`
   - `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`
   - `src/v11/shared/askHuman/askHumanCommandContract.ts`
   - `src/v11/shared/askHuman/askHumanFlowContract.ts`
   - `src/v11/shared/askHuman/askHumanFlowInvocationContract.ts`
   - `src/v11/shared/askHuman/askHumanFlowDependencyOptionalOverrides.ts`
   - `src/v11/shared/askHuman/askHumanRuntimeDependencyForwardingContract.ts`
   - `src/v11/shared/askHuman/askHumanRuntimeDependencyForwarding.ts`
   - `src/v11/shared/askHuman/askHumanNotificationEmissionContract.ts`
   - `src/v11/shared/askHuman/askHumanCommandOrchestrationContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationArtifactsContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationDependencyBuilderContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionContract.ts`
   - `src/v11/application/askHuman/askHumanNotificationEmission.ts`
   - `src/v11/application/askHuman/askHumanFinalization.ts`
   - `src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.ts`
   - `src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts`
   - `src/v11/application/askHuman/askHumanFinalizationDependencyResolution.ts`
   - `src/v11/shared/converged/convergedCommandTypes.ts`
   - `src/v11/application/converged/convergedFlowInvocationBuilders.ts`
   - `src/v11/application/converged/runConvergedFlowContract.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
   - `src/v11/application/converged/convergedFinalizationTypes.ts`
   - `src/v11/application/pass/passCommandContract.ts`
   - `src/v11/application/pass/reviewerDelivery.ts`
   - `src/v11/application/pass/reviewerDeliveryDefaults.ts`
   - `src/v11/application/pass/autoConvergeConvergedExecution.ts`
   - `src/v11/application/pass/autoConvergeFlowInvocationBuilders.ts`
   - `src/v11/application/pass/normalPassDeliveryExecution.ts`
   - `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`
   - `src/v11/application/pass/passFlowDependencyWiring.ts`
   - `src/v11/application/pass/normalPassFinalization.ts`
   - `src/v11/application/pass/passResultDelivery.ts`
   - `src/v11/application/pass/passResultBuilder.ts`
4. A residual pattern current-tree szinten ket forma:
   - neutral port tipussal leirt dependency tovabbra is `emitTmuxDeliveryNotification` neven jon be
   - a helper/result/finalization surface tovabbra is `delivered: boolean` projectiont ownershipol elso osztalyu workflow/internal shape-kent
5. A retained infrastructure adapter current-tree szinten kulon, lezart baseline:
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - ezt a taskot nem szabad producer vagy adapter rewrite-ta szelesiteni
6. Emiatt a mostani residual gap nem producer closure es nem read-model/public fallout:
   - ez szuk consumer-family alignment closeout

## L0 - Policy

### Goal

1. A delivery consume familyben megmaradt retained `tmux` dependency/result naming es boolean compat ownership leszukitese explicit neutral ack consume-ra.
2. A retained adapter vocabulary maradhat explicit compatibility alias vagy projection statuszban, de nem maradhat workflow/internal contract owner.
3. A canonical delivery truth tovabbra is a neutral `DeliveryAck.status`.
4. Ne csusszon ebbe a taskba:
   - producer rewrite,
   - infrastructure `tmux` adapter rewrite,
   - UI/router vagy repo-root/public export cleanup,
   - launch/executor scope.

### Domain / Control Model Summary

1. Business invariant:
   - a workflow/internal delivery consume semantikaja ugyanarra az authorityra uljon, mint a producer-oldali neutral ack;
   - a boolean `delivered` projection nem lehet kulon canonical truth.
2. Control model:
   - a retained `emitTmuxDeliveryNotification` vocabulary legfeljebb compat alias vagy same-authority bridge;
   - a final decision source `DeliveryAck.status` vagy ennek explicit, azonos authorityju projectionje.
3. Read-path rule:
   - a belso workflow/internal consume contractok nem re-derivalhatnak canonical truthot a compat boolean mezobol;
   - ahol a boolean megmarad, az explicit projection legyen.
4. Forbidden fallback:
   - retained alias vagy boolean mezok visszaemelese canonical workflow truthra;
   - public/read-model cleanup visszahuzasa ebbe a taskba;
   - infrastructure-level `emitTmuxDeliveryNotification(...)` eltavolitasa inventory nelkul.
5. Allowed resolution path:
   - in-scope contractok neutral port/input/result vocabularyra allnak;
   - retained aliasok megmaradhatnak additiv vagy explicit compat szerepben, ha a consumer contract mar neutral.
6. Missing-data rule:
   - rejected delivery explicit rejected marad;
   - nincs synthetic accepted outcome pusztan boolean projectionbol.
7. Phase boundary:
   - shared contract closure: narrow internal/workflow delivery consumer contracts
   - internal_execution_closure: owned here
   - workflow_orchestration_closure: owned here
   - read_model_closure: predecessor-owned
   - producer closure: predecessor-owned

### Plan Linkage

1. Parent plan gap:
   - `O2-T3` es `O2-T7` utan maradt retained delivery consume contract ownership a workflow/internal familyben.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task3-topology-neutral-delivery-consume-family-alignment.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task7-ui-router-and-public-delivery-read-model-export-alignment.md`
3. Unlocks / impacts successors:
   - `Opportunity 2` closeout claim megerositese
   - `O3-T1` csak ezutan allithato ugy, hogy a delivery lane mar nem hordoz residual retained workflow ownershipot
4. Task-list impact:
   - ez uj residual closeout task, nem producer vagy public lane replacement
   - a korabban lezart `O2-T3` consume-family task aktualis current-tree residualjat ownershipolja

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task3-topology-neutral-delivery-consume-family-alignment.md`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/application/approval/approvalCommandContract.ts`
   - `src/v11/application/approval/runApprovalDecisionEffects.ts`
   - `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`
   - `src/v11/shared/askHuman/askHumanFlowContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationDependencyBuilderContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts`
   - `src/v11/shared/converged/convergedCommandTypes.ts`
   - `src/v11/application/converged/runConvergedFlowContract.ts`
   - `src/v11/application/converged/convergedFinalizationTypes.ts`
   - `src/v11/application/pass/reviewerDelivery.ts`
   - `src/v11/application/pass/normalPassDeliveryExecution.ts`
   - `src/v11/application/pass/passFlowDependencyWiring.ts`
   - `src/v11/application/pass/normalPassFinalization.ts`
2. Canonical elements:
   - `DeliveryAck`
   - `EmitDeliveryAckLikePort`
   - `DeliveryAck.status`
   - `accepted | rejected`
3. Compat elements:
   - `emitTmuxDeliveryNotification`
   - `EmitAskHumanTmuxDeliveryNotificationPort`
   - `delivered: boolean`
4. Forbidden reinterpretations:
   - retained alias nem nevezheto ki workflow authority contractnak;
   - `delivered` nem promotalhato vissza canonical consume mezove;
   - a residual cleanup nem nevezheto at public/read-model tasknak.
5. `drift_status`: `residual_gap_discovered_after_consume_family_closure`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/approval/approvalCommandContract.ts`
   - `src/v11/application/approval/runApprovalDecisionEffects.ts`
   - `src/v11/application/reply/replyCommandContract.ts`
   - `src/v11/application/reply/replyCommandApi.ts`
   - `src/v11/shared/kickoff/kickoffDependencyContract.ts`
   - `src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts`
   - `src/v11/shared/kickoff/kickoffResultBuilders.ts`
   - `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`
   - `src/v11/shared/askHuman/askHumanCommandContract.ts`
   - `src/v11/shared/askHuman/askHumanFlowContract.ts`
   - `src/v11/shared/askHuman/askHumanFlowInvocationContract.ts`
   - `src/v11/shared/askHuman/askHumanFlowDependencyOptionalOverrides.ts`
   - `src/v11/shared/askHuman/askHumanRuntimeDependencyForwardingContract.ts`
   - `src/v11/shared/askHuman/askHumanRuntimeDependencyForwarding.ts`
   - `src/v11/shared/askHuman/askHumanNotificationEmissionContract.ts`
   - `src/v11/shared/askHuman/askHumanCommandOrchestrationContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationArtifactsContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationDependencyBuilderContract.ts`
   - `src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionContract.ts`
   - `src/v11/application/askHuman/askHumanNotificationEmission.ts`
   - `src/v11/application/askHuman/askHumanFinalization.ts`
   - `src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.ts`
   - `src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts`
   - `src/v11/application/askHuman/askHumanFinalizationDependencyResolution.ts`
   - `src/v11/shared/converged/convergedCommandTypes.ts`
   - `src/v11/application/converged/convergedFlowInvocationBuilders.ts`
   - `src/v11/application/converged/runConvergedFlowContract.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
   - `src/v11/application/converged/convergedFinalizationTypes.ts`
   - `src/v11/application/pass/passCommandContract.ts`
   - `src/v11/application/pass/reviewerDelivery.ts`
   - `src/v11/application/pass/reviewerDeliveryDefaults.ts`
   - `src/v11/application/pass/autoConvergeConvergedExecution.ts`
   - `src/v11/application/pass/autoConvergeFlowInvocationBuilders.ts`
   - `src/v11/application/pass/normalPassDeliveryExecution.ts`
   - `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`
   - `src/v11/application/pass/passFlowDependencyWiring.ts`
   - `src/v11/application/pass/normalPassFinalization.ts`
   - `src/v11/application/pass/passResultDelivery.ts`
   - `src/v11/application/pass/passResultBuilder.ts`
2. Actual touched scope:
   - primary bounded-task shape: `consumer_family_alignment`
   - justified secondary shape: `contract_or_persisted_authority_foundation`
3. Producer behavior touched:
   - `no`
4. Why the declared shape matches reality:
   - a current residual ugyanazon delivery consumer familyben maradt bent;
   - a shared/internal contractszukites ugyanabban a filecsaladban zarul, mint a workflow/internal caller alignment es az adjacent forwarding/finalization wiring;
   - nincs UI/public vagy infrastructure fallout ugyanebben a slice-ban.

### Authority Boundary Map

1. `authority_producer`
   - `emitDeliveryNotificationAck(...)`
   - closed predecessor baseline
2. `persisted_authority`
   - `N/A`
3. `internal_execution_consumers`
   - `src/v11/application/askHuman/askHumanNotificationEmission.ts`
   - `src/v11/application/askHuman/askHumanFinalization.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
   - `src/v11/application/converged/convergedFinalizationTypes.ts`
   - `src/v11/application/pass/reviewerDelivery.ts`
   - `src/v11/application/pass/normalPassDeliveryExecution.ts`
   - `src/v11/application/pass/normalPassFinalization.ts`
4. `workflow_orchestration_consumers`
   - `src/v11/application/approval/**`
   - `src/v11/application/reply/**`
   - `src/v11/shared/kickoff/**`
   - `src/v11/shared/askHuman/**`
   - `src/v11/shared/converged/convergedCommandTypes.ts`
   - `src/v11/application/converged/convergedFlowInvocationBuilders.ts`
   - `src/v11/application/converged/runConvergedFlowContract.ts`
5. `read_model_consumers`
   - explicit out of scope
6. `cleanup_recovery_consumers`
   - deferred
7. Export surfaces closed in this phase:
   - none

### In Scope

1. In-scope delivery dependency contracts neutral namingre es explicit compat alias policyra allitasa.
2. In-scope helper/result surfaces `status`-first, ack-driven ownershipra allitasa.
3. Ask-human retained aliasok es result projectionk szukitese, ahol ezek mar csak same-authority bridge-kent indokolhatok.
4. Ask-human finalization es runtime-forwarding seam-ek alignmentje, hogy a retained dependency nev csak explicit compat bridge-kent maradjon.
5. Approval delivery projection seam explicit neutral-owner cleanupja, ahol a legacy projection current-tree szinten meg mindig elso osztalyu command-owned contract.
6. Kickoff/pass/converged result, forwarding, invocation es finalization seam-ek alignmentje, hogy a boolean mezok explicit projection statuszban maradjanak.
7. A kapcsolodo tests frissitese, ahol a contract ownership valtozas bizonyitasa szukseges.

### Out of Scope

1. `src/v11/infrastructure/channel/tmux/**` retained adapter rewrite.
2. `src/v11/shared/ports/uiRouter.ts` es `src/index.ts` public/read-model/export cleanup.
3. Launch/executor contractok es session runner vocabulary.
4. Watchdog pane sampling vagy egyeb runtime observability lane.

### Safety Defaults

1. A neutral delivery ack semantics valtozatlan marad.
2. A retained aliasok csak compatibility statusszal maradhatnak.
3. Ha barmely callernek boolean mezore tovabbra is szuksege van, az explicit projection legyen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - internal/workflow delivery dependency contractok
   - internal helper/result delivery consume contractok

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Split note:
   - UI/public scope mar lezart
   - meta-review gate runtime residual kulon task
10. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: narrow contract cleanup + in-family consumer alignment
   - explicitly deferred closures: `authority_producer`, `read_model_consumers`, `cleanup_recovery_consumers`

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Delivery consume ugyanarra a neutral truthra uljon, mint a producer. | `status` first, boolean projection csak compat. | P1 | required-now |
| Control model | Neutral ack a canonical source. | In-scope dependency es result contractok ezt ownershipoljak. | P1 | required-now |
| Forbidden fallback | Retained alias/boolean nem maradhat workflow owner. | Call-site contractokat at kell rendezni. | P1 | required-now |
| Missing-data rule | Rejected explicit rejected marad. | No synthetic success. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `DeliveryAck.status` | canonical delivery truth | canonical delivery truth | semantika nem valtozik | P1 | required-now |
| retained adapter exportok | infrastructure compatibility | infrastructure compatibility | removal nincs ebben a taskban | P1 | required-now |
| boolean `delivered` mezok | compat projection | compat projection | csak explicit ack-derived projectionkent maradhatnak | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| delivery consumer dependency names | approval, reply, kickoff, ask-human, converged, pass | additive/narrowing | neutral port naming, retained alias max compat | external/public surfaces |
| delivery helper/result/finalization surfaces | approval projection seam, kickoff, ask-human, converged, pass | additive/narrowing | `status`-first ownership + explicit compat boolean projection | later removal only with inventory |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | retained delivery consumer contract ownership | P1 | required-now |
| Successor unlocked | stronger `Opportunity 2` closeout claim | P1 | required-now |
| Explicitly not closed here | public/export cleanup, producer rewrite, meta-review runtime lane | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/approval/approvalCommandContract.ts` + `approvalCommandApi.ts` + `approvalCommandDependencyResolution.ts` + `runApprovalDecisionEffects.ts` | approval dependency + projection ownership | neutral port type but retained dependency name plus explicit legacy projection seam | neutral dependency owner, legacy projection explicit compat-only seam | approval lane current-tree residualja nem csak a contractban, hanem a runtime projection ownerben is latszik | P1 | required-now | code diff + approval tests |
| CS2 | `src/v11/application/reply/replyCommandContract.ts` + `replyCommandApi.ts` + `replyCommandDependencyResolution.ts` | reply dependency surface | retained delivery dependency name current orchestrator callig | neutral delivery dependency owner through API/orchestration surface | workflow contract residual itt a direct fire-and-forget callerig tart | P1 | required-now | code diff + reply tests |
| CS3 | `src/v11/shared/kickoff/kickoffDependencyContract.ts` + `src/v11/application/kickoff/kickoffDependencyResolution.ts` + `src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts` + `src/v11/shared/kickoff/kickoffResultBuilders.ts` | kickoff override + validation/result ownership | dual neutral + retained override, retained boolean result shape | explicit neutral override owner, retained boolean explicit compat projection | kickoffnal a dependency, validated delivery es result ownership egyutt zarja a residualt | P1 | required-now | code diff + kickoff tests |
| CS4 | `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts` + `askHumanCommandContract.ts` + `askHumanFlowContract.ts` + `askHumanFlowInvocationContract.ts` + `askHumanFlowDependencyOptionalOverrides.ts` + `askHumanRuntimeDependencyForwardingContract.ts` + `askHumanRuntimeDependencyForwarding.ts` + `askHumanNotificationEmissionContract.ts` + `askHumanCommandOrchestrationContract.ts` + `askHumanFinalizationArtifactsContract.ts` + `askHumanFinalizationArtifacts.ts` + `askHumanFinalizationDependencyBuilderContract.ts` + `askHumanFinalizationDependencyResolutionContract.ts` + `src/v11/application/askHuman/askHumanNotificationEmission.ts` + `askHumanFinalization.ts` + `askHumanFinalizationDependencyBuilder.ts` + `askHumanFinalizationDependencyDefaults.ts` + `askHumanFinalizationDependencyResolution.ts` | ask-human shared/application delivery contract family | retained alias types, retained dependency names, boolean result ownership tobb flow/finalization/forwarding seam-en | neutral naming + explicit compat projection across the central flow es finalization owners | ask-human residual ownership nem csak a command contractban, hanem a flow/finalization/forwarding/defaults contractokban is latszik | P1 | required-now | code diff + ask-human tests/contracts |
| CS5 | `src/v11/shared/converged/convergedCommandTypes.ts` + `src/v11/application/converged/convergedFlowInvocationBuilders.ts` + `runConvergedFlowContract.ts` + `convergedFinalizationTypes.ts` | converged flow dependency + result/finalization ownership | retained dependency alias and boolean delivery result shape | neutral dependency owner with explicit compat-only outward projection | converged workflow familyben a residual alias es boolean result a finalization shape-ben is first-class | P1 | required-now | code diff + converged tests/contracts |
| CS6 | `src/v11/application/converged/convergedGateDelivery.ts` | aggregate delivery result | `delivered` first-class aggregate field | `status`-first aggregate with explicit compat projection only if still needed | aggregate ownership itt dol el | P1 | required-now | code/test diff |
| CS7 | `src/v11/application/pass/passCommandContract.ts` + `reviewerDelivery.ts` + `reviewerDeliveryDefaults.ts` + `autoConvergeConvergedExecution.ts` + `autoConvergeFlowInvocationBuilders.ts` + `normalPassDeliveryExecution.ts` + `normalPassFlowInvocationBuilders.ts` + `passFlowDependencyWiring.ts` + `normalPassFinalization.ts` + `passResultDelivery.ts` + `passResultBuilder.ts` | pass dependency + wiring/finalization/result ownership | retained alias + boolean result field tobb invocation es delivery seam-en | neutral dependency owner + explicit compat projection | pass internal execution lane residualja a forwarding/invocation/finalization ownerig sugarzik | P1 | required-now | code/test diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| consumer dependency contract | `emitTmuxDeliveryNotification` or dual-name override | `emitDeliveryNotificationAck` owner | neutral port field | retained alias fallback only where required | additive/narrowing | P1 | required-now |
| helper/result/finalization contract | `status` + `delivered` as peer ownership | `status` owner, `delivered` projection only | `status` | `delivered`, `reason`, `reason_code`, `retried` | compat projection allowed | P1 | required-now |
| ask-human delivery alias types | `*Tmux*` alias as primary shared name | neutral delivery alias as primary, retained alias optional | neutral alias names | retained alias names | additive/narrowing | P1 | required-now |

### 4) Implementation Shape

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary shape | `consumer_family_alignment` | P1 | required-now |
| Secondary shape | `contract_or_persisted_authority_foundation` | P1 | required-now |
| Producer touched | `no` | P1 | required-now |
| Coordination hardening | `no` | P2 | later |
| Fail-closed hardening | inherited, not primary | P1 | required-now |

### 5) Validation Matrix

| ID | Scenario | Setup | Expected Result | Priority | Evidence |
|---|---|---|---|---|---|
| T1 | approval/reply dependency alignment | approval or reply flow compiles and runs with neutral dependency ownership | no retained dependency name remains canonical in these contracts, and approval legacy projection seam is explicit compat-only | P1 | `tests/core/human/approval.test.ts`, `tests/core/human/reply.test.ts`, `tests/contracts/v11/approval.contract.test.ts`, `tests/contracts/v11/reply.contract.test.ts`, typecheck |
| T2 | kickoff override precedence and result ownership | neutral override + optional compat alias | neutral owner remains canonical, compat alias only fallback, kickoff validated delivery/result remains explicit projection | P1 | `tests/core/bubble/kickoffBubble.test.ts`, `tests/contracts/v11/kickoff.contract.test.ts`, `tests/v11/application/kickoff/kickoffValidatedExecution.test.ts`, `tests/v11/application/kickoff/kickoffResultBuilders.test.ts`, typecheck |
| T3 | ask-human contract alignment | ask-human delivery types/results/finalization wiring inspected | shared/application flow es finalization contract neutralized, boolean explicit compat-only projection | P1 | `tests/core/agent/askHuman.test.ts`, `tests/contracts/v11/askHuman.contract.test.ts`, `tests/v11/application/askHuman/askHumanNotificationEmission.test.ts`, `tests/v11/application/askHuman/askHumanFinalization.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationDependencyBuilder.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationDependencyResolution.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationArtifacts.test.ts`, `tests/v11/application/askHuman/askHumanRuntimeDependencyForwarding.test.ts`, typecheck |
| T4 | converged aggregate alignment | mixed delivery results | aggregate reasoning derives from ack status, not boolean ownership, es a finalization shape compat-only projection marad | P1 | `tests/core/agent/converged.test.ts`, `tests/contracts/v11/converged.contract.test.ts`, `tests/v11/application/converged/convergedFlowInvocationBuilders.test.ts`, `tests/v11/application/converged/convergedFinalization.test.ts`, `tests/v11/application/converged/runConvergedFlow.test.ts`, typecheck |
| T5 | pass delivery alignment | pass flow delivers accepted/rejected results | pass contract remains ack-driven with preserved compat projection across wiring, delivery execution, auto-converge es result seams | P1 | `tests/core/agent/pass.test.ts`, `tests/contracts/v11/pass.contract.test.ts`, `tests/v11/application/pass/reviewerDelivery.test.ts`, `tests/v11/application/pass/autoConvergeConvergedExecution.test.ts`, `tests/v11/application/pass/autoConvergeFlowInvocationBuilders.test.ts`, `tests/v11/application/pass/normalPassDeliveryExecution.test.ts`, `tests/v11/application/pass/normalPassFlowInvocationBuilders.test.ts`, `tests/v11/application/pass/passFlowDependencyWiring.test.ts`, `tests/v11/application/pass/normalPassFinalization.test.ts`, `tests/v11/application/pass/passResultDelivery.test.ts`, `tests/v11/application/pass/passResultBuilder.test.ts`, typecheck |
| T6 | public/read-model non-scope proof | diff reviewed | no UI/router or root export fallout pulled in | P1 | diff review |

### 6) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| neutral delivery semantics | `accepted | rejected` truth | contract cleanup | producer rewrite | P1 | required-now |
| retained infrastructure adapter | current implementation | remain as compat adapter | removal or rename cascade | P1 | required-now |
| public/read-model closure | current neutral UI/public state | untouched | regress to boolean primary truth | P1 | required-now |

### 7) Closure-Budget Summary

| Item | Value | Priority | Timing |
|---|---|---|---|
| Closure buckets touched | `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers` | P1 | required-now |
| Intentionally collapsed | narrow contract cleanup + in-family consumer alignment | P1 | required-now |
| Why safe | ugyanazt a delivery consume-family residualt zarja le producer/public fallout nelkul | P1 | required-now |
| Deferred closures | public cleanup, producer cleanup, cleanup/recovery | P1 | required-now |

### 8) Precondition and Side-Effect Boundary

| Boundary | Rule | Priority | Timing |
|---|---|---|---|
| Validations before side effects | contract ownership es projection rule legyen explicit, mielott barmely helper/result atall | P1 | required-now |
| Forbidden early side effects | no adapter rewrite or producer behavior change | P1 | required-now |
| Invalid/precondition-failure behavior | explicit rejected consume marad | P1 | required-now |
| Existing side-effect boundary preserved | delivery execution retained adapterben marad | P1 | required-now |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az in-scope contracts teljesen neutralizaltak, kesobb kulon taskban lehet inventory alapjan a retained aliasok tovabbi szukitese.

## Review Control

1. Ne fogadjunk el producer vagy infrastructure rewrite-ot ebben a taskban.
2. Ne fogadjunk el UI/public export cleanupot ebben a taskban.
3. A retained boolean mezok nem maradhatnak canonical ownership pozicioban.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a delivery consumer contractok in-scope filecsaladban mar neutral owner vocabularyt hasznalnak;
2. a `delivered` boolean csak explicit compat projectionkent marad meg, ahol tenyleg szukseges;
3. a retained `tmux` aliasok nem canonical workflow/internal owners tobbe;
4. a kapcsolodo tests bizonyitjak, hogy a semantika valtozatlanul ack-driven marad;
5. nincs UI/public vagy adapter-lane scope-behuzas.

## Assumptions

1. Az in-scope callers external inventory nelkul is atallithatok neutral owner contractra, mert ezek belso workflow/internal surfaces.
2. A retained adapter export removal tovabbra sem required-now.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current code- es plan-context alapjan.
