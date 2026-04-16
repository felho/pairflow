---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_parity_and_fail_closed_hardening_phaseE3c_v1
title: "Actor Runtime Interface Implementer Pilot Parity and Fail-Closed Hardening (Phase E3c)"
status: implementable
updated_at: 2026-04-15
phase: phaseE3c
target_files:
  - src/v11/shared/state/executionContext.ts
  - src/v11/shared/delivery/tmuxDeliveryContract.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/askHuman.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Parity and Fail-Closed Hardening (Phase E3c)

## L0 - Policy

### Goal

1. Zarja le az implementer pilot activation utan fennmarado runtime parity es fail-closed minimum contractot.
2. Bizonyitsa explicit evidence-szel az implementer pilot minimum vedelmi csomagjat:
   - stale authority reject,
   - conflicting-context fail-closed,
   - duplicate delivery suppresszio vagy explicit reject,
   - restart utani uj execution authority,
   - delayed/missing ack melletti no-success inference.
3. Tartsa meg a retained tmux/runtime surfacet observability-only adapterkent, canonical truth szerep nelkul.

### Domain / Control Model Summary

1. Business invariant: az aktiv implementer pilot nem reuse-olhat stale authorityt es nem claimelhet masodik successful launch/delivery-t ugyanarra a same-authority chainre.
2. Control model: explicit authority + explicit runtime ack-source marad a truth; pane activity tovabbra sem acceptance/running forras.
3. Read-path rule: runtime delivery truth csak explicit ack/provenance boundaryrol johet; restart utani ervenyesseg csak uj authorityval all helyre.
4. Forbidden fallback:
   - nincs second successful launch duplicate signalra,
   - nincs restart utani stale authority reuse,
   - nincs pane-visible activitybol szarmaztatott pilot success claim.
5. Allowed resolution path:
   - retained tmux adapter maradhat transport/provenance/debug surface,
   - duplicate masodik signal explicit reject vagy suppresszalt no-op lehet,
   - restart utan csak friss authority mellett mehet tovabb a pilot.
6. Missing-data rule: explicit ack hianyaban nincs success inference; invalid vagy stale authority mellett nincs successful side effect.
7. Phase boundary:
   - wrapper/authority foundation predecessor (`E3a`)
   - fresh-path activation predecessor (`E3b`)
   - implementer pilot parity + fail-closed hardening owned here
   - reviewer/meta-reviewer rollout deferred `E4`

### Authority Boundary Map

1. Authority producer: inherited explicit `state.execution_context` + typed runtime ack boundary from `E1`/`E2a`.
2. Stored authority: bubble state snapshot fingerprint + execution-context mezok; uj persisted schema nincs ebben a taskban.
3. In-scope consumers:
   - implementer pilot duplicate/restart/stale authority parity surfacek
   - runtime ack/provenance fail-closed consume
   - restart recovery explicit authority refresh
4. Explicit out-of-scope consumers:
   - reviewer `pass` / `convergence`
   - meta-review submit path
   - retained adapter broad cleanup
   - new authority vagy wrapper-shape redesign
5. Export surfaces closed in this phase: `yes`, de csak az implementer pilot parity/fail-closed minimum contract szintjen.

### Baseline Preservation

1. Must-preserve behaviors:
   - az `E3a` same-authority foundation valtozatlan marad;
   - az `E3b` fresh-path activation valtozatlanul explicit ack/provenance truthra epul;
   - a tmux retained surface observability-only adapter marad.
2. Allowed resolution paths:
   - stale authority -> explicit reject/fail-closed
   - duplicate masodik signal -> explicit reject vagy suppresszalt no-op
   - restart -> uj authority materialization -> uj valid pilot path
3. Forbidden regression interpretations:
   - a duplicate suppresszio nem jelenthet masodik successful `accepted` vagy `running` eredmenyt;
   - a restart recovery nem reuse-olhat regi execution authorityt;
   - delayed/missing ack nem nevezheto at operator-visible successnek.
4. Replacement proof required if removed:
   - ha a duplicate/restart parity barmelyik minimum vedelme lecserelodik, explicit evidence kell arra, hogy ugyanazt a no-second-success es no-stale-authority invariansat tartja.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `fail_closed_hardening`
2. Secondary shape (if any): `N/A`
3. Preconditions that must pass before side effects:
   - a current authority friss es coherent legyen,
   - restart utan uj authority legyen materializalva,
   - ne legyen mar successful duplicate ugyanarra a same-authority delivery chainre.
4. Side effects forbidden before preconditions pass:
   - nincs masodik successful `accepted`/`running`,
   - nincs stale authorityval uj launch/delivery success claim,
   - nincs restart utani regi execution-context reuse.
5. Invalid/precondition-failure behavior: zero successful side effect; explicit reject vagy suppresszalt no-op.
6. Coordination primitives in scope: `N/A`

### In Scope

1. Stale authority reject.
2. Conflicting-context fail-closed parity.
3. Duplicate delivery minimum policy bizonyitasa.
4. Restart recovery uj authority parity.
5. Delayed/missing ack melletti no-success inference vedelme.

### Out of Scope

1. Fresh-path implementer activation redesign.
2. Wrapper/authority shape redesign.
3. Public emit surface redesign.
4. Reviewer/meta-reviewer rollout.
5. Full tmux cleanup vagy topology csere.

### Safety Defaults

1. Ha a parity csak pane-derived success inferenciaval lenne zold, a task fail-closed.
2. Ha duplicate signal shape bizonytalan, explicit reject vagy suppresszalt no-op az elfogadhato minimum; masodik successful launch nem.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - runtime delivery ack provenance contract
   - restart recovery authority continuity contract
   - duplicate delivery suppression minimum contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: explicit execution authority + runtime ack/provenance
   - competing identifiers or fallback identities: stale execution_context, pane activity, duplicate signal visibility
10. Authority/source-of-truth note:
   - canonical source: explicit authority + explicit runtime ack
   - forbidden secondary sources: pane activity, retained transport visibility, legacy duplicate heuristics
11. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`, `workflow_orchestration_consumers`, `cleanup_recovery_consumers`
   - intentionally collapsed closures: parity fail-closed + restart recovery minimum contract, mert ugyanazt a no-second-success / no-stale-authority invariansat zarjak le ugyanazon implementer pilot pathon
   - explicitly deferred closures: multi-role rollout, broad adapter cleanup, authority/wrapper redesign
12. Bounded-task-shape decision:
   - primary shape: `fail_closed_hardening`
   - secondary shape: `N/A`
   - why this bounded mix is safe: minden in-scope eset ugyanarra a parity/recovery minimum contractra szukul az aktiv implementer pilot felett

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Duplicate rule | Masodik signal nem hozhat masodik successful launchot/deliveryt. | Reject vagy suppresszalt no-op kell. | P1 | required-now |
| Restart rule | Uj execution authority kotelezo restart utan. | Regi emit stale marad. | P1 | required-now |
| Missing-data rule | Ack hianyaban nincs success inference. | Pane activity csak diagnostics lehet. | P1 | required-now |
| Phase boundary | Foundation es fresh activation dontesek nem nyithatok ujra. | `E3a` es `E3b` baseline adottsagok. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| implementer pilot parity contract | implementer runtime parity surfaces | additive hardening | explicit fail-closed minimum behavior bizonyitasa | reviewer/meta-reviewer parity -> `E4` |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| stale authority fail-closed baseline | preserve es teljes parity proof-fava emel | tests explicit stale/conflicting reject esettel | P1 | required-now |
| restart csak uj authorityval ervenyes | preserve | restart recovery tests explicit uj authority pathot bizonyitanak | P1 | required-now |
| duplicate masodik success tilalma | preserve/tighten | nincs masodik successful `accepted`/`running` evidence | P1 | required-now |

### 0c) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| stale/conflicting/duplicate authority path | authority freshness + duplicate state | masodik successful launch/delivery, restart utani regi authority reuse | zero successful side effect; explicit reject vagy suppresszalt no-op | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/state/executionContext.ts` | restart/running helpers | restart utan uj authority kelljen | P1 | required-now | T4 |
| CS2 | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | delivery ack contract | explicit ack/provenance marad a pilot truth-source | P1 | required-now | T5 |
| CS3 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | retained adapter runtime | tmux maradjon observability-only adapter | P1 | required-now | T3, T5 |
| CS4 | listed tests | parity proof surfaces | stale/conflicting/duplicate/restart parity bizonyitott legyen | P1 | required-now | T1-T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Delivery ack provenance | typed ack baseline mar van | explicit parity minimum contract erre epul | preserved baseline + hardening proof | P1 | required-now |
| Duplicate handling | minimum policy explicit bizonyitast ker | nincs masodik successful launch vagy delivery | compatible tightening | P1 | required-now |
| Restart continuity | retained recovery path letezik | csak uj authority valid restart utan | preserved baseline + parity proof | P1 | required-now |

Normative rules:

1. A task nem nevezheti at a tmux adaptert canonical authority vagy ack-source komponensse.
2. A task nem relaxalhatja a stale-authority fail-closed modellt.
3. A task nem foglalhat magaba reviewer vagy meta-reviewer rolloutot.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| duplicate masodik delivery | result | explicit reject vagy suppresszalt no-op | P1 | required-now |
| restart utan regi authority | throw/result | uj authority rematerializalas szukseges | P1 | required-now |
| ack hianyzik, de pane activity latszik | result | diagnostics lehet, success inference nem | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | stale authority reject | a regi authority explicit rejectet vagy fail-closed eredmenyt kap | P1 | required-now | automated test |
| T2 | conflicting-context fail-closed | conflicting context mellett nincs successful side effect | P1 | required-now | automated test |
| T3 | duplicate delivery suppresszio | nincs masodik successful `accepted`/`running` | P1 | required-now | automated test |
| T4 | restart recovery uj authorityt igenyel | regi stale, uj valid | P1 | required-now | automated test |
| T5 | delayed/missing ack parity | nincs pane-derived success truth | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az implementer pilot utan a duplicate policy altalanosithato a tobbi role-ra, az mar `E4` alatt kapjon shared helper format.
