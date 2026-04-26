---
artifact_type: task
artifact_id: task_actor_runtime_interface_reviewer_meta_rollout_and_adapter_cleanup_phaseE4_v1
title: "Actor Runtime Interface Reviewer and Meta-Reviewer Rollout and Retained Adapter Cleanup (Phase E4)"
status: implementable
updated_at: 2026-04-17
phase: phaseE4
target_files:
  - docs/actor-runtime-interface/execution-authority-contract-note-v1.md
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/converged/emitConvergedV11.ts
  - src/v11/application/converged/convergedCommandOrchestration.ts
  - src/v11/application/converged/runConvergedFlow.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPreparation.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/application/converged/emitConvergedV11.test.ts
  - tests/v11/application/converged/runConvergedFlow.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/v11/shared/metaReview/metaReviewCommandSubmitValidation.test.ts
  - tests/v11/shared/metaReview/metaReviewCommandSubmitLink.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
prd_ref: null
plan_ref: plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Reviewer and Meta-Reviewer Rollout and Retained Adapter Cleanup (Phase E4)

## Current Tree Position (2026-04-17)

1. A current-tree sequencing authority a `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-pilot-cutover-phaseE.md` es a `plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`; mindketto azt rogzíti, hogy az egyetlen megmaradt aktiv implementation closure mar `E4`.
2. `E2c` persisted diagnostics / meta-review / read-model fallout archival traceability pathja: `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-persisted-diagnostics-meta-review-read-model-fallout-phaseE2c.md`.
3. `E3a` canonical execution authority vocabulary closure archival traceability pathja: `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-implementer-pilot-foundation-hardening-phaseE3a.md`.
4. `E3b` implementer activation archival traceability pathja: `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-implementer-pilot-activation-phaseE3b.md`.
5. `E3c` implementer parity baseline archival traceability pathja: `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-implementer-pilot-parity-and-fail-closed-hardening-phaseE3c.md`.
6. Ez a task consume-family rollout es retained adapter cleanup, nem authority-foundation, activation redesign vagy implementer parity reopen.

## L0 - Policy

### Goal

1. Terjessze ki a lezart canonical execution authority modellt a reviewer es `meta_reviewer` consume pathokra.
2. Zarja le a reviewer `pass` / `convergence` es a meta-review submit parity minimum contractjat ugyanazon authority + runtime outcome modellen.
3. Tisztitsa ki a retained adapter feltetelezeseket ott, ahol a role-neutral boundary utan mar csak message/targeting/facade compatibility-terhet jelentenek.

### Canonical Contract Anchors

1. `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`
2. `docs/pairflow-initial-design.md`
3. `src/types/protocol.ts`
4. `src/v11/shared/actorProtocol/actorEmitContext.ts`
5. `src/v11/application/converged/emitConvergedV11.ts`
6. `src/v11/application/converged/convergedCommandOrchestration.ts`
7. `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts`
8. `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts`

### Closed Terms

1. Canonical execution identity: `handoff_id` + explicit `execution_id`.
2. Guard fields: `expected_role`, `expected_round`, `expected_state_fingerprint`.
3. Reviewer es `meta_reviewer` ugyanazt a canonical execution authority vocabularyt orokli.
4. Reviewer convergence rollout: a reviewer-origin `pass` / `convergence` route canonical wrapper -> command orchestration -> flow -> gate delivery consume lanca, nem pusztan leaf delivery seam.
5. Meta-review submit rollout: a meta-review wrapper -> submit preparation/authority -> submit runtime/routing canonical submit lanca, nem pusztan wrapper-facade.
6. Retained adapter cleanup itt csak parity-preserving message/targeting/delivery facade cleanup lehet; nem broad topology csere.
7. E4 nem nyithat ujra authority-producer, implementer activation vagy implementer parity dontest.
8. A canonical execution authority vocabulary closed marad: `handoff_id`, explicit `execution_id` es az optional guard mezok mellett nincs uj alias vagy legacy authority terminology.

### Domain / Control Model Summary

1. `implementer`, `reviewer` es `meta_reviewer` ugyanazon actor-runtime boundaryn fut.
2. Explicit authority + explicit runtime outcome marad a truth; role rollout nem vezethet be uj authorityforrast.
3. Reviewer es meta-reviewer success sem johet pane activitybol vagy retained adapter visibilitybol.
4. Reviewer convergence ownership a canonical wrapper/orchestration/flow pathon zarul; a gate delivery csak a leaf consume seam.
5. Meta-review submit ownership a canonical submit authority + runtime/routing pathon zarul; a wrapper csak entry facade.
6. Nincs role-local authority shortcut, meta-review special-case authority vagy implementer-only retained helper role-neutral truthkent.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/converged/emitConvergedV11.ts`
   - `src/v11/application/converged/convergedCommandOrchestration.ts`
   - `src/v11/application/converged/runConvergedFlow.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
   - `src/v11/application/metaReview/emitMetaReviewV11.ts`
   - `src/v11/shared/metaReview/metaReviewCommandSubmitPreparation.ts`
   - `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts`
   - `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts`
   - `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
2. Actual touched scope: primary `consumer_family_alignment`; secondary `fail_closed_hardening`.
3. Why this mix is safe:
   - reviewer rollout ugyanazon lezart canonical authority consume-family alignmentja a wrapper -> orchestration -> flow -> delivery lanc menten,
   - meta-review submit rollout ugyanazon lezart canonical authority consume-family alignmentja a wrapper -> submit authority/runtime lanc menten,
   - retained adapter cleanup itt csak a role-neutral message/targeting/delivery facade feltetelezesek szukiteset jelenti, nem uj topology vagy authority producer closuret.
4. Mutation/decision entrypoints in scope:
   - reviewer-origin actor emit wrapper es converged command orchestration,
   - meta-review submit wrapper es submit preparation/authority/runtime/routing path,
   - retained tmux delivery targeting/message facade.
5. Hidden scope ruled out:
   - authority producer nincs scope-ban; canonical `execution_context` + `execution_id` baseline historical predecessor,
   - implementer activation nincs scope-ban; historical predecessor `E3b`,
   - implementer parity/restart/no-success baseline nincs scope-ban; historical predecessor `E3c`,
   - broad topology rewrite vagy tmux runtime replacement nincs scope-ban.

### Authority Boundary Map

1. Authority producer:
   - historical predecessor closurek; top-level `execution_context` marad a canonical source-of-truth.
2. Stored authority:
   - persisted bubble state / `execution_context` + fingerprint.
3. In-scope consumers:
   - reviewer actor wrapper + converged orchestration/flow consume path,
   - meta-review submit wrapper + submit authority/runtime/routing consume path,
   - retained tmux delivery message/targeting facade.
4. Explicit out-of-scope consumers:
   - implementer fresh-path activation,
   - implementer stale/duplicate/restart parity,
   - broad read-model redesign,
   - topology migration vagy transport replacement.
5. Export surfaces closed in this phase:
   - yes, a reviewer es `meta_reviewer` role-neutral consume boundary ugyanazon canonical execution identity modellen.

### Baseline Preservation

1. Must-preserve behaviors:
   - canonical authority = top-level `execution_context` + explicit `execution_id`,
   - explicit runtime outcome marad a success/no-success truth,
   - pane activity vagy retained adapter visibility nem valik canonical truth source-sza,
   - retained tmux adapter cleanup nem torhet broad topology cserere.
2. Allowed resolution paths:
   - reviewer path: actor wrapper -> `emitConvergedFromWorkspaceV11` -> `convergedCommandOrchestration` -> `runConvergedFlow` -> `convergedGateDelivery`,
   - meta-review path: actor wrapper -> `submitMetaReviewResultV11` -> submit preparation/authority -> submit runtime/routing,
   - retained adapter path: `tmuxDelivery` + message/targeting facade alignment ugyanazon role-neutral truth mellett.
3. Forbidden regression interpretations:
   - reviewer rollout nem szukitheto le csak leaf delivery seamre,
   - meta-review submit parity nem irhato le puszta wrapper-facadekent,
   - retained adapter cleanup nem jelenthet authority vagy runtime truth reinterpretaciot,
   - implementer closurek historical predecessor statusza nem nyithato ujra convenience alapon.
4. Replacement proof required if removed:
   - ha barmely retained adapter branch megszunik, explicit replacement path vagy intentional-scope-narrowing proof kell.

### In Scope

1. Reviewer `pass` / `convergence` parity.
2. Meta-review submit parity.
3. Reviewer rollout explicit owner pathja a wrapper -> orchestration -> flow -> gate delivery lanc menten.
4. Meta-review submit explicit owner pathja a wrapper -> submit authority/runtime/routing lanc menten.
5. Retained adapter cleanup ugyanazon role-neutral consume boundary menten, de csak message/targeting/delivery facade szinten.

### Out of Scope

1. Uj authority shape.
2. Uj ack contract.
3. Implementer fresh-path redesign.
4. Implementer stale/duplicate/restart parity ujranyitasa.
5. Broad topology csere.
6. Transport replacement vagy tmux teljes eltavolitasa.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split decision:
   - kulon plan-level split nem kell; az implementer predecessor closurek mar historical baselinek, a maradek scope egyetlen role-neutral consume-family rollout + bounded retained-cleanup taskban vedheto.
10. Closure-budget triage:
   - touched buckets: `internal_execution_consumers`, `workflow_orchestration_consumers`, `cleanup_recovery_consumers`
   - intentionally collapsed closures: reviewer rollout + meta-review submit rollout + retained facade cleanup
   - why collapse is safe: ugyanazon lezart canonical authority consume-family alignmentjat ownershipoljak, producer vagy schema valtozas nelkul
   - explicitly deferred closures: `authority_producer`, `persisted_authority_or_schema`, broad `read_model_consumers`
11. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `fail_closed_hardening`
   - why this mix is safe: a fail-closed oldalak itt a retained adapter es submit/convergence stale/no-success consume viselkedesen belul maradnak, producer reopen nelkul.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Role-neutrality | Reviewer es `meta_reviewer` ugyanazt a canonical execution authority modellt hasznalja. | Nincs role-specifikus authority source vagy shortcut. | P1 | required-now |
| Canonical identity | `handoff_id` + explicit `execution_id` a minimum execution identity minden role-nal. | `execution_id` nem downgrade-olhato diagnostics vagy guard szerepbe. | P1 | required-now |
| Reviewer convergence route | A reviewer parity a canonical wrapper -> orchestration -> flow -> gate delivery lanc menten zarul. | Leaf delivery seam onmagaban nem eleg a rollout ownership leirasara. | P1 | required-now |
| Meta-review submit route | A meta-review parity a canonical submit authority + runtime/routing lanc menten zarul. | Wrapper-only leiras alulbizonyitott scope-nak szamit. | P1 | required-now |
| Runtime truth | Success csak explicit runtime outcome-bol johet. | Pane activity nem acceptance proof. | P1 | required-now |
| Cleanup rule | Cleanup csak parity bizonyitas utan mehet, es itt csak bounded facade cleanup engedett. | Parity hianyaban retained compatibility marad; broad topology csere out-of-scope. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts`, `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | reviewer/meta wrapper route | reviewer es `meta_reviewer` ugyanazon canonical execution authority wrapper route-ra all, implementer-specific baseline reopen nelkul | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/converged/emitConvergedV11.ts`, `src/v11/application/converged/convergedCommandOrchestration.ts` | reviewer convergence entry/orchestration | reviewer convergence ownership az explicit wrapper/orchestration seamen marad, nem pusztan gate-delivery leafen | P1 | required-now | T1 |
| CS3 | `src/v11/application/converged/runConvergedFlow.ts`, `src/v11/application/converged/convergedGateDelivery.ts` | reviewer convergence flow/delivery | reviewer parity explicit runtime outcome-ra epul ugyanazon canonical reviewer authority menten | P1 | required-now | T1 |
| CS4 | `src/v11/application/metaReview/emitMetaReviewV11.ts` | meta-review submit wrapper | a public meta-review submit ugyanarra a canonical submit authority/runtime pathra fordul ra | P1 | required-now | T2 |
| CS5 | `src/v11/shared/metaReview/metaReviewCommandSubmitPreparation.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts` | meta-review submit authority guard | stale handoff/execution/role/round/fingerprint es invalid ownership fail-closed marad | P1 | required-now | T2 |
| CS6 | `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts` | meta-review submit runtime/routing | canonical submit state/routing ugyanazon role-neutral authority + runtime outcome modellen zarul | P1 | required-now | T2 |
| CS7 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts` | retained adapter facade/message/targeting seam | cleanup utan sem valik authority vagy success source-sza, es csak bounded role-neutral facade alignment marad | P1 | required-now | T3 |

### 2) Shared Contract Compatibility

| Item | Decision | In-Scope Consumers | Out-of-Scope Consumers |
|---|---|---|---|
| canonical actor emit authority vocabulary | preserved shared contract | reviewer wrapper route, meta-review submit wrapper route | implementer predecessor closures |
| reviewer convergence runtime outcome contract | additive consume-family alignment | converged wrapper/orchestration/flow/gate-delivery | producer or schema changes |
| meta-review submit authority/runtime contract | additive consume-family alignment | submit preparation/authority/runtime/routing | new authority producer semantics |
| retained tmux delivery facade | parity-preserving cleanup only | delivery facade, message builder, targeting | topology replacement, transport rewrite |

### 3) Precondition and Side-Effect Boundary

1. Ezeknek kell atmenniuk barmilyen success-shaped side effect vagy retained cleanup elott:
   - canonical authority snapshot match,
   - reviewer vagy meta-review role-route helyes feloldasa,
   - explicit runtime outcome / routed submit path megorzese,
   - retained delivery target/message path role-neutral invariansainak megtartasa.
2. Tiltott side effect precondition-failure eseten:
   - reviewer success projection authority mismatch mellett,
   - meta-review submit state/routing stale guard mismatch mellett,
   - retained adapter branch authority-truthkent valo ujraertelmezese.
3. Invalid/precondition-failure behavior:
   - fail-closed vagy explicit rejected/unavailable path; nincs heuristic acceptance.

### 4) Dependency Constraints

| Dependency | Constraint | Failure / Deviation Policy |
|---|---|---|
| archived `E2c` fallout closure | preserved baseline | E4 nem ownershipolja ujra a persisted diagnostics / read-model / public meta-review falloutot |
| `E3a` canonical vocabulary | nem nyithato ujra | ha reviewer/meta rollout uj authority shape-et igenyelne, route back to plan |
| archived `E3b` activation closure | preserved baseline | E4 nem ownershipolja ujra az implementer activationt |
| archived `E3c` parity closure | preserved baseline | E4 nem ownershipolja ujra az implementer stale/duplicate/restart parityt |
| sequencing authority docs | current-tree source-of-truth | ha a Phase E sequencing anchor mas open closure-t allitana, ezt a taskot elobb doc-szinten kell ujraigazitani |
| retained tmux runtime | observability/debug retained | ha cleanup broad topology csereve valna, kulon successor task kell |

### 5) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | reviewer runtime parity | reviewer `pass` / `convergence` ugyanazon canonical execution identityre es explicit runtime outcome-ra epul a wrapper -> orchestration -> flow -> gate delivery lanc menten | P1 | required-now | `tests/v11/application/converged/emitConvergedV11.test.ts`, `tests/v11/application/converged/runConvergedFlow.test.ts`, `tests/core/agent/converged.test.ts` |
| T2 | meta-review runtime parity | meta-review submit ugyanazon canonical execution identityre, stale guardra es explicit runtime outcome-ra epul a wrapper -> submit authority/runtime/routing lanc menten | P1 | required-now | `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`, `tests/v11/shared/metaReview/metaReviewCommandSubmitValidation.test.ts`, `tests/v11/shared/metaReview/metaReviewCommandSubmitLink.test.ts` |
| T3 | retained adapter cleanup parity utan | cleanup utan sincs role-local canonical truth vagy pane-derived success; message/targeting/delivery facade role-neutral marad | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |

## L2 - Implementation Notes

1. Ha a rollout csak kulon reviewer vagy meta-review authority-szotarral tunik kivitelezhetonek, az regresszio.
2. Ha a cleanup broad topology-csereve novekedne, azt kulon successor taskra kell bontani.
3. Ha a retained adapter cleanup valojaban csak facade/message/targeting parity-preserving alignment, ezt implementation kozben is szuken kell tartani, es nem szabad broad tmux-runtime rewrite-ba csuszni.
4. Ha a current-tree docs read nem mutat uj sequencing driftet, preferald a no-op vagy traceability-only refinementet a spekulativ boundary-bovites helyett.

## Review / Approval Context

1. A current bubble worktree docs-allapota a review/approval source-of-truth.
2. Korabbi approval snapshot csak historical traceability.
