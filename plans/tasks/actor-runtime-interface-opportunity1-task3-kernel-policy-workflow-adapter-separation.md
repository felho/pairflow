---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity1_task3_kernel_policy_workflow_adapter_separation_v1
title: "Actor Runtime Interface Opportunity 1 Task 3: Kernel Policy Workflow-Adapter Separation"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts
  - src/v11/application/actorProtocol/actorRuntimeKernel.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 1 Task 3: Kernel Policy Workflow-Adapter Separation

## Current Codebase Check (2026-04-17)

1. Az `O1-T2` mar lezarta a current-tree exact authority x input route/policy matrixat:
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - a matrix mar explicitten nevesiti:
     - `ActorRuntimeRoute`
     - `ActorRuntimePolicyCheck`
     - `ActorRuntimeDispatchPlan`
     - retained reviewer `human_question` fallback
     - meta-reviewer `active_agent === codex` when present guard
2. A generic runtime kernel sprawl azonban current tree-ben tovabbra is az `emitActorProtocolV11.ts`-ben el:
   - az outer dispatcher resolve-olja a plan-t,
   - a wrapper exportok ujra-canonicalizaljak a plan-t route-id alapjan,
   - a wrapper-ek kulon branch-ekben valasztanak workflow adaptert,
   - a retained reviewer fallback kulon switch-agon marad.
3. Emiatt a current tree meg mindig osszemossa ugyanabban a bounded file-ban:
   - a generic runtime kernel execute seamet,
   - a route/policy matrix consume-ot,
   - a workflow-specific output adapter wiringet.
4. A `actorProtocolEmitters.ts` mar kulon workflow-adapter surface:
   - pass
   - human_question
   - convergence
   - meta_review_result
   de a route -> adapter binding current tree-ben meg mindig implicit a dispatcher/wrapper branch-ekben el.
5. A bounded target family a current tree-ben szuk:
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`
6. Read-only downstream public/state surfaces tovabbra is zart baseline:
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`

## Parent Plan Fit / Stable Sequencing

1. A parent successor plan szerint az `Opportunity 1` jelenlegi decomposition-je:
   - `O1-T1`: docs-only boundary clarification
   - `O1-T2`: typed authority / route / policy matrix
   - `O1-T3`: kernel + policy + workflow-adapter separation
   - optionalis `O1-T4`: retained fallback / parity / cleanup hardening
2. Ez a task mar nem foundational matrix-closure:
   - a matrix current-tree source-of-truth statusza preserved baseline,
   - a task erre a lezart matrixra ul ra mint consumer-family alignment.
3. Ez a task nem nyithatja ujra:
   - a canonical execution authority note closed jelenteset,
   - a `src/types/protocol.ts` public output-kind vocabularyjat,
   - a bubble state/policy baseline-t,
   - delivery/topology/onboarding scope-ot.
4. Az optionalis `O1-T4` csak akkor maradhat nyitva, ha az `O1-T3` utan kulon bounded hardening-fallout marad:
   - retained fallback parity,
   - diagnostics / cleanup,
   - vagy kulon consumer-fallout a teszt/compat surface-en.

## Source-Anchor Consistency

1. Primary sequencing authority:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Closed-contract source anchors:
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
   - `plans/actor-runtime-interface-execution-authority-contract-note-v1.md`
3. Current-tree source anchors:
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`
4. Canonical elements that must stay fixed:
   - `actorRuntimeDispatchMatrix.ts` az exact route/policy current-tree source-of-truth
   - preserved reviewer `human_question` fallback explicit route marad
   - meta-reviewer `active_agent === codex` when present guard explicit preserved baseline marad
   - unsupported role x input kombinaciok fail-closed maradnak
   - workflow adapter surface tovabbra is a `actorProtocolEmitters.ts` family-ben marad
5. Guard elements:
   - wrapper export nevek es a jelenlegi thin compat route-ok valtozhatnak, ha a behavior es az export surface preserved marad
   - a new internal kernel file pontos filename-je valtozhat, ha ugyanebben a bounded actorProtocol family-ben marad
6. Compat elements:
   - `emitActorProtocolFromWorkspaceV11(...)` export surface preserved marad
   - a direct wrapper exportok (`implementerPilotActorProtocolV11`, `reviewerActorProtocolV11`, `metaReviewerActorProtocolV11`) preserved vagy strict-thin-compat formaban maradnak, hogy a current internal callers/testek ne torjenek
7. Forbidden reinterpretations:
   - a matrix nem downgrade-olhato advisory inventoryva vagy lazy guard-listava
   - a workflow adapter reteg nem veheti vissza a generic runtime kernel ownershipot
   - a task nem nevezheti at a retained reviewer fallbackot "just another adapter row" cimszo alatt ugy, hogy a preserved-baseline policy jelentese elvesszen
   - a task nem ownershipolja a bubble state/policy generalizalasat
8. `drift_status`: `closed_contract_preserved`

## L0 - Policy

### Goal

Lezarni az `O1-T3` current-tree wrapper-sprawl szeletet ugy, hogy:
1. a generic runtime kernel execute seam explicit kulon reteggé valjon,
2. a route/policy matrix consume tovabbra is a matrix file current-tree source-of-truth-jara uljon,
3. a workflow-specific output adapter binding kulon, explicit adapter retegkent maradjon,
4. a runtime behavior preserved maradjon public vocabulary rewrite nelkul.

### Domain / Control Model Summary

1. Business invariant:
   - a canonical actor authority context jelentese nem valtozik;
   - az `O1-T3` csak a current-tree internal execution consume family strukturajat tisztitja.
2. Control model:
   - canonical authority context -> resolve dispatch plan -> assert preserved policies -> execute workflow adapter
   - a kernel ownershipja a generic execute path,
   - a matrix ownershipja a route/policy truth,
   - az adapter ownershipja a workflow-specific output emission.
3. Read / execute rule:
   - a runtime route igazsaga a matrixban el,
   - a workflow adapter igazsaga az emitter family-ben el,
   - az outer dispatcher es a direct wrapper exportok ugyanarra a shared kernel execute seamre ulnek.
4. Allowed resolution path:
   - `emitActorProtocolFromWorkspaceV11(...)` -> plan resolve -> kernel execute
   - direct wrapper export -> canonical route-id / plan -> ugyanaz a kernel execute
5. Forbidden fallback:
   - ugyanazon branch logic tobbszori ujraepitese kulon wrapper-ekben,
   - workflow adapter valasztas implicit `if/switch` sprawlkent tobb helyen,
   - public protocol / CLI vocabulary rewrite,
   - bubble state/policy baseline vagy delivery topology scope nyitasa.
6. Missing-data rule:
   - unknown route / handler / adapter tovabbra is explicit fail-closed hiba,
   - a retained reviewer fallback nem valhat default catch-all route-ta,
   - nincs permissive "best effort" adapter valasztas.

### In Scope

1. A current wrapper-sprawl raulitese explicit internal kernel seamre.
2. A generic kernel execute responsibility kivetele a `emitActorProtocolV11.ts` current mixed branch-sprawljabol.
3. A route -> workflow-adapter binding explicitte tetele a bounded actorProtocol family-n belul.
4. A direct wrapper exportok thin compat retained surface-sze szukitese, ha szukseges.
5. Regression proof arra, hogy:
   - outer dispatcher es direct wrapper exportok ugyanarra a kernel semanticsra ulnek,
   - retained fallback / guard baseline valtozatlan marad.

### Out of Scope

1. `src/types/protocol.ts` modositas.
2. `src/cli/commands/agent/emit.ts` modositas.
3. `src/v11/shared/actorProtocol/actorEmitContext.ts` semanticsanak modositas.
4. `src/v11/shared/state/executionContext.ts` vagy `src/v11/shared/metaReview/metaReviewExecutionContext.ts` modositas.
5. Bubble state/policy topology vagy delivery ownership nyitasa.
6. Uj role, uj output kind, onboarding simplification, topology-neutral delivery.
7. Generic multi-lane runtime framework rewrite a bounded actorProtocol family-n tul.

### Safety Defaults

1. A matrix current-tree exact rows preserved baseline-ek; ezek nem irhatoak at "close enough" adapter inventoryra.
2. A retained reviewer `human_question` fallback explicit route marad.
3. A meta-reviewer `active_agent === codex` when present guard explicit preserved policy-check marad.
4. A direct wrapper exportok viselkedese preserved marad vagy explicit thin-compat retained surface-kent zoldben bizonyitott.
5. A task nem teheti a generic kernel execute seamet public API-va vagy new CLI fogalomma.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Blast radius:
   - bounded actorProtocol internal execution family
   - direct wrapper exports
   - actorProtocol regression tests
3. Read-only downstream constraints:
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Why still single-task:
   - a producer es a matrix contract mar upstream lezart baseline,
   - a touched scope ugyanazon bounded actorProtocol consumer family-ben marad,
   - nincs public contract migration, read-model fallout vagy cleanup/recovery closure.

## L1 - Implementation Contract

### Scope Reality / Shape Proof

1. A declared `target_files` current-tree reality szerint ugyanazon bounded familyhez tartoznak:
   - `emitActorProtocolV11.ts`
   - `actorProtocolEmitters.ts`
   - `actorRuntimeDispatchMatrix.ts`
   - `emitActorProtocolV11.test.ts`
2. A valos mutation entrypoint itt belso runtime/orchestration surface:
   - `emitActorProtocolFromWorkspaceV11(...)`
   - a direct wrapper exportok ugyanennek a family-nek retained thin surface-ei.
3. A valos bounded task-shape:
   - primary: `consumer_family_alignment`
   - secondary: `fail_closed_hardening` csak annyiban, amennyiben az unknown handler/adapter branch explicit fail-closed retained marad
4. Nincs producer munka:
   - a canonical authority producer es a matrix contract mar upstream lezart baseline.
5. Nincs public shared-contract migration:
   - az `ActorEmitInput`, `ActorOutputKind`, CLI emit grammar es downstream execution-context vocabulary read-only marad.

### Authority Fan-out Scan

1. `authority_producer`
   - read-only upstream baseline:
     - `actorEmitContext.ts`
     - execution authority notes
2. `persisted_authority`
   - n/a ebben a taskban; nincs schema vagy persisted state cutover
3. `internal_execution_consumers`
   - `emitActorProtocolV11.ts`
   - potential new `actorRuntimeKernel.ts`
   - `actorProtocolEmitters.ts`
4. `workflow_orchestration_consumers`
   - direct wrapper exportok
   - outer dispatcher branch
5. `read_model_consumers`
   - none
6. `cleanup_recovery_consumers`
   - none
7. Closure ownership:
   - owned now: `internal_execution_consumers` + `workflow_orchestration_consumers`
   - deferred: read-model / cleanup / onboarding / topology

### Closure Budget Gate

1. Materially touched closures:
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
2. Not touched:
   - `authority_producer`
   - `shared_contract`
   - `read_model_consumers`
   - `persisted_authority_or_schema`
   - `cleanup_recovery_consumers`
3. Why the collapse is safe:
   - ugyanaz a bounded actorProtocol call path ownershipolja a falloutot,
   - nincs kulon public compatibility migration,
   - nincs kulon diagnostics/read-model closure.

### Shared Contract Compatibility

1. Shared public contract valtozas nincs.
2. Preserved current consumers:
   - `emitActorProtocolFromWorkspaceV11(...)` internal callers
   - direct wrapper exportokra ulo testek
3. Compatibility rule:
   - az export surface preserved marad,
   - a result union shape preserved marad,
   - additive metadata vagy new public enum nem vezetheto be.

### Call-Site Matrix

| ID | File | Function / Entry | Expected Change | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | `emitActorProtocolFromWorkspaceV11(...)` | az outer dispatcher a shared kernel execute seamre uljon, ne sajat wrapper-sprawl branch-eket ownershipoljon | P1 | required-now | T1, T4 |
| CS2 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | `emitImplementerPilotActorProtocolV11(...)`, `emitReviewerActorProtocolV11(...)`, `emitMetaReviewerActorProtocolV11(...)` | direct wrapper exportok thin compat retained surface-e legyenek, ugyanarra a kernel execute seamre ultetve | P1 | required-now | T2, T3 |
| CS3 | `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts` | matrix source-of-truth | a route/policy truth preserved marad; legfeljebb kernel-friendly metadata / binding seged szuk additive formaban jelenhet meg | P1 | required-now | T1, T3 |
| CS4 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | workflow adapter exports | az adapter family explicit workflow-surface marad; dispatch semantics nem maradhat rejtett kulon wrapper branch-ekben | P1 | required-now | T1, T2 |
| CS5 | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` | actorProtocol regression matrix | outer dispatcher es direct wrapper retained parity explicit bizonyitasa | P1 | required-now | T1-T6 |

### Baseline Preservation

| Current Behavior | Preserve / Replace / Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| exact current-tree dispatch matrix rows | preserve | current route ids / handler semantics testsben tovabbra is explicit bizonyitottak | P1 | required-now |
| reviewer-origin `human_question` retained fallback | preserve | retained explicit route + no catch-all regression | P1 | required-now |
| meta-reviewer codex-when-present guard | preserve | preserved policy-check proof | P1 | required-now |
| unsupported role x input fail-closed | preserve | explicit negative tests | P1 | required-now |
| duplicated wrapper-local branch logic | replace | shared kernel execute seamre ultetett wrappers | P1 | required-now |

### Target File Precision

1. A current bounded family a fenti target fileokra szukul.
2. Uj helper/file csak az actorProtocol bounded family-n belul hozhato letre:
   - `src/v11/application/actorProtocol/actorRuntimeKernel.ts`
   - vagy equivalent narrow placement ugyanebben a family-ben
3. Equivalent narrow placement elfogadhato, ha:
   - a generic kernel execute responsibilityt viszi ki az `emitActorProtocolV11.ts` branch-sprawljabol,
   - nem nyit public contract vagy bubble-state scope-ot,
   - es nem terjeszti ki a touched family-t delivery/topology/onboarding iranyba.
4. Ha a bounded closure `src/types/protocol.ts`, `src/cli/commands/agent/emit.ts`, vagy state/meta-review execution-context fileokat erdemben modositania kellene, az scope blocker es plan/task pontositasi trigger.

### Test Matrix

| ID | Scenario | Setup | Assert | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| T1 | outer dispatcher shared kernel path | current-tree actor inputs per exact matrix rows | a dispatcher shared kernel execute seamre ul, nem kulon duplicated branch-sprawlra | P1 | required-now |
| T2 | direct wrapper thin-compat parity | implementer / reviewer / meta-reviewer direct wrapper hivasok | ugyanarra a kernel semanticsra ulnek, mint az outer dispatcher | P1 | required-now |
| T3 | matrix-owned policy preservation | retained fallback + meta-review guard + handler mismatch | explicit preserved/fail-closed behavior marad | P1 | required-now |
| T4 | unsupported role x input fail-closed | forbidden matrix combinations | nincs permissive adapter default vagy silent fallback | P1 | required-now |
| T5 | injected route canonicalization remains safe | direct wrapper route-id/plan reuse | partial / mismatched plan nem tud policy-checket lenyelni | P1 | required-now |
| T6 | export/result surface compatibility | existing test callers | result union es direct export usage nem torik | P1 | required-now |

## L2 - Implementation Notes

1. A preferred shape egy explicit shared kernel execute seam:
   - input:
     - authoritative context
     - actor input
     - resolved canonical dispatch plan
     - adapter binding / dependencies
   - output:
     - retained `ActorEmitResultV11`
2. A wrapper exportok retained thin-compat surface-kent maradhatnak:
   - a wrapper nevek nem correctness celok,
   - a duplicated branch logic eltuntetese igen.
3. A route -> adapter binding explicit lehet:
   - kernel-owned adapter dispatch map,
   - vagy matrixhoz kozel ulo bounded binding helper,
   - de a workflow adapter semantics nem maradhat tobb kulon switch/ag implicit tulajdona.
4. A task nem alakitja at a matrixot uj public taxonomyra:
   - `ActorRuntimeRoute`
   - `ActorRuntimePolicyCheck`
   - `ActorRuntimeDispatchPlan`
   preserved internal vocabulary marad.
5. Az unknown handler / adapter branch explicit fail-closed maradjon:
   - nincs permissive fallback,
   - nincs "best matching" adapter select.
6. A task review focus-a nem az, hogy a kernel helper neve mennyire szep, hanem az, hogy:
   - a generic kernel execute ownership expliciten kulonvalik-e,
   - a matrix marad-e a route/policy truth,
   - az adapter reteg marad-e workflow-specific,
   - es a preserved baseline-ek valoban zoldben bizonyitottak-e.

## Successor Notes

1. `O1-T4` csak akkor nyithato kulon successor taskkent, ha az `O1-T3` utan kulon bounded hardening marad:
   - retained fallback parity cleanup,
   - diagnostics / cleanup hardening,
   - vagy kulon compat fallout.
2. `O2-T1` es `O3-T1` tovabbra sem ownershipolja ezt a current wrapper-sprawl closure-t.
