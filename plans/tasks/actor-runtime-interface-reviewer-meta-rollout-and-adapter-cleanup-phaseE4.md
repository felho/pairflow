---
artifact_type: task
artifact_id: task_actor_runtime_interface_reviewer_meta_rollout_and_adapter_cleanup_phaseE4_v1
title: "Actor Runtime Interface Reviewer and Meta-Reviewer Rollout and Retained Adapter Cleanup (Phase E4)"
status: implementable
updated_at: 2026-04-15
phase: phaseE4
target_files:
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Reviewer and Meta-Reviewer Rollout and Retained Adapter Cleanup (Phase E4)

## L0 - Policy

### Goal

1. Terjessze ki a lezart implementer pilot boundaryt a reviewer es meta-reviewer role-okra.
2. Zarja le a reviewer `pass` / `convergence` es a meta-review submit runtime parity minimum contractjat ugyanazon role-neutral authority + ack modellen.
3. Tisztitsa ki azokat a retained adapter feltetelezeseket, amelyek a lezart implementer pilot utan mar csak compatibility-terhet jelentenek.

### Domain / Control Model Summary

1. Business invariant: az `implementer`, `reviewer` es `meta_reviewer` ugyanazon actor-runtime boundaryn fusson; role-nev alapjan ne maradjon kulon runtime truth vagy special-case subsystem.
2. Control model: explicit authority + explicit runtime ack-source marad a truth; role rollout nem vezethet be uj authorityforrast.
3. Read-path rule: reviewer es meta-reviewer runtime success csak explicit ack/provenance boundaryrol vagy ennek same-authority projectionjabol johet.
4. Forbidden fallback:
   - nincs reviewer vagy meta-reviewer pane-derived success claim,
   - nincs role-specifikus retained adapter mint canonical truth-source,
   - nincs implementer-only shortcut retained helper broad role-neutral truthkent.
5. Allowed resolution path:
   - a lezart implementer pilot boundary role-neutralen kiterjesztheto reviewer es meta-reviewer consume pathokra,
   - retained tmux adapter maradhat transport/provenance/debug surface, ameddig a cleanup ugyanazon role-neutral boundaryt nem gyengiti,
   - compatibility cleanup csak a mar bizonyitott parity utan mehet.
6. Missing-data rule: explicit ack hianyaban nincs success inference; reviewer/meta-reviewer pathok explicit failure vagy unavailable allapotot adnak.
7. Phase boundary:
   - wrapper/authority foundation predecessor (`E3a`)
   - implementer activation predecessor (`E3b`)
   - implementer parity predecessor (`E3c`)
   - reviewer/meta-reviewer rollout + retained adapter cleanup owned here

### Authority Boundary Map

1. Authority producer: inherited explicit `state.execution_context` + typed runtime ack boundary.
2. Stored authority: bubble state snapshot fingerprint + execution-context mezok; uj persisted authority nincs ebben a taskban.
3. In-scope consumers:
   - reviewer `pass` / `convergence`
   - meta-review submit runtime path
   - retained tmux/operator adapter cleanup ugyanazon role-neutral boundary menten
4. Explicit out-of-scope consumers:
   - uj authority shape vagy uj ack contract
   - broad topology csere
   - implementer fresh-path vagy parity redesign
5. Export surfaces closed in this phase: `yes`, a multi-role runtime boundary active all role-ra; broad doc/UI cleanup ezen tul mar kulon follow-up.

### Baseline Preservation

1. Must-preserve behaviors:
   - a lezart implementer pilot boundary valtozatlan marad;
   - reviewer es meta-reviewer rollout sem vezethet be uj authority shortcutot;
   - a tmux retained surface tovabbra sem valhat canonical control source-sza.
2. Allowed resolution paths:
   - reviewer ugyanazon role-neutral actor boundaryn fut, mint az implementer, a reviewer-specifikus input/output shape megtartasaval
   - meta-review submit ugyanazon explicit authority + ack modellen fut
   - retained adapter cleanup csak a parityval mar bizonyitott projectionok utan mehet
3. Forbidden regression interpretations:
   - a multi-role rollout nem ertelmezheto uj authority- vagy wrapper-shape redesignkent;
   - retained adapter cleanup nem nevezheto at broad topology-csere feladatta.
4. Replacement proof required if removed:
   - barmely retained adapter projection torlesehez explicit bizonyitek kell, hogy a reviewer/meta-reviewer runtime parity mar ugyanazon role-neutral boundaryn zart.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `consumer_family_alignment`
2. Secondary shape (if any): `fail_closed_hardening`
   Bounded proof: a retained adapter cleanup csak a mar bizonyitott reviewer/meta-reviewer parity menten mehet, es nem hoz be kulon authority producer vagy read-model closuret.
3. Preconditions that must pass before side effects:
   - az `E3a`, `E3b`, `E3c` predecessor closurek lezartak,
   - reviewer/meta-reviewer same-authority parity bizonyithato,
   - cleanupra kijelolt retained adapter projection mar nem canonical source.
4. Side effects forbidden before preconditions pass:
   - nincs retained adapter removal parity-proof nelkul,
   - nincs reviewer/meta-reviewer success claim pane-derived jelre,
   - nincs implementer-only helper role-neutral truthkent megtartva.
5. Invalid/precondition-failure behavior: zero cleanup side effect; explicit parity failure es retained compatibility marad.
6. Coordination primitives in scope: `N/A`

### In Scope

1. Reviewer `pass` / `convergence` runtime parity.
2. Meta-review submit runtime parity.
3. Retained adapter cleanup ugyanazon role-neutral boundary menten.

### Out of Scope

1. Uj authority shape vagy uj ack contract.
2. Implementer pilot redesign.
3. Broad topology csere.
4. UI/docs full cleanup a runtime boundaryn tul.

### Safety Defaults

1. Ha a reviewer vagy meta-reviewer rollout csak pane-derived success inferenciaval lenne zold, a task fail-closed.
2. Cleanup csak parity bizonyitas utan mehet; ha ez nem all, a retained adapter marad compatibility surface.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - reviewer runtime parity contract
   - meta-review runtime parity contract
   - retained adapter cleanup contract

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: explicit execution authority + runtime ack role-neutral actor boundaryn
   - competing identifiers or fallback identities: role-specific retained adapter assumptions, pane activity, legacy helper shortcutok
10. Authority/source-of-truth note:
   - canonical source: explicit authority + explicit runtime ack/provenance
   - forbidden secondary sources: pane activity, retained adapter-only visibility, role-local shortcutok
11. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`, `workflow_orchestration_consumers`, `cleanup_recovery_consumers`
   - intentionally collapsed closures: reviewer/meta-reviewer rollout + retained adapter cleanup, mert ugyanazon role-neutral boundary parity-proofja utan ugyanazt a compatibility-terhet zarjak le
   - explicitly deferred closures: uj authority contract, uj ack contract, broad topology/read-model cleanup
12. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `fail_closed_hardening`
   - why this bounded mix is safe: a cleanup itt csak a rollout altal mar lezarhato retained compatibility surface-re szukul

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Role-neutrality | Reviewer es meta-reviewer ugyanazon runtime boundaryre all. | Nincs role-specifikus special-case truth-source. | P1 | required-now |
| Control model | Explicit ack/provenance az egyetlen success source. | Pane activity nem acceptance proof. | P1 | required-now |
| Cleanup rule | Retained adapter csak parity utan tisztithato. | Cleanup parity-proof nelkul nem mehet. | P1 | required-now |
| Phase boundary | Foundation, implementer activation es parity nem nyithato ujra. | `E3a`/`E3b`/`E3c` baseline adottsagok. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| reviewer runtime parity contract | reviewer `pass` / `convergence` flows | additive alignment | role-neutral runtime consume parity | `N/A` |
| meta-review runtime parity contract | meta-review submit flow | additive alignment | role-neutral runtime consume parity | `N/A` |
| retained adapter cleanup surface | tmux/operator adapter projectionok | compatible tightening | csak mar nem canonical compatibility feluletek cleanupja | broad doc/UI cleanup `N/A` |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| implementer pilot role-neutral foundation | preserve | reviewer/meta-reviewer parity tests nem nyitjak ujra | P1 | required-now |
| tmux observability-only adapter szerep | preserve | cleanup utan sem valik control source-sza | P1 | required-now |
| retained adapter compatibility path parity proof nelkul | preserve | cleanup csak parity utan tortenhet | P1 | required-now |

### 0c) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| reviewer/meta-reviewer rollout vagy cleanup parity-proof nelkul futna | predecessor closures + parity evidence | retained adapter removal, role-neutral success claim | zero cleanup side effect; retained compatibility marad | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | reviewer/meta wrapper route | reviewer es meta-reviewer ugyanazon role-neutral boundaryn fut | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/converged/convergedGateDelivery.ts` | reviewer `convergence` consume | reviewer parity explicit runtime truthra epul | P1 | required-now | T1 |
| CS3 | `src/v11/application/metaReview/emitMetaReviewV11.ts` | meta-review submit path | meta-review parity explicit runtime truthra epul | P1 | required-now | T2 |
| CS4 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | retained adapter cleanup seam | cleanup utan is observability-only adapter marad | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Reviewer runtime consume | implementer pilot utan kulon rollout | role-neutral parity azonos control modellen | preserved baseline + alignment | P1 | required-now |
| Meta-review runtime consume | implementer pilot utan kulon rollout | role-neutral parity azonos control modellen | preserved baseline + alignment | P1 | required-now |
| Retained adapter cleanup | compatibility-teher megmaradt | csak mar nem canonical retained elemek cleanupja | compatible tightening | P1 | required-now |

Normative rules:

1. A task nem vezethet be uj authority vagy ack contractot.
2. A task nem tarthat meg retained role-local shortcutot canonical truthkent.
3. A cleanup nem mehet parity bizonyitas nelkul.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| reviewer/meta-reviewer parity hianyzik | result | retained compatibility marad, cleanup nem megy | P1 | required-now |
| pane activity latszik ack nelkul | result | diagnostics lehet, success inference nem | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | reviewer runtime parity | reviewer `pass` / `convergence` explicit runtime truthra epul | P1 | required-now | automated test |
| T2 | meta-review runtime parity | meta-review submit explicit runtime truthra epul | P1 | required-now | automated test |
| T3 | retained adapter cleanup parity utan | cleanup utan sincs role-local canonical truth vagy pane-derived success | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a retained adapter cleanup utan meg marad operatori wording debt, azt kulon docs/runbook cleanupban erdemes lezarni.
