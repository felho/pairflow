---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_activation_phaseE3b_v1
title: "Actor Runtime Interface Implementer Pilot Activation (Phase E3b)"
status: implementable
updated_at: 2026-04-15
phase: phaseE3b
target_files:
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/pass/passResultDelivery.ts
  - src/v11/shared/askHuman/askHumanFlowContract.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/askHuman.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Activation (Phase E3b)

## L0 - Policy

### Goal

1. Aktiválja az implementer pilot fresh-pathjat a lezart `E3a` same-authority foundation felett.
2. Bizonyitsa explicit activation evidence-szel az implementer-first minimum csomagot:
   - fresh `pass`,
   - fresh `human_question`,
   - ack-hiany melletti no-success inference.
3. Hagyja kulon successor closureben a stale/duplicate/restart parity es fail-closed hardening munkat (`E3c`).

### Domain / Control Model Summary

1. Business invariant: a pilot activation nem gyengitheti az `E3a` same-authority foundationt.
2. Control model: explicit authority + explicit runtime ack-source marad a truth; pane activity tovabbra sem acceptance/running forras.
3. Read-path rule: implementer pilot success csak explicit runtime ack/provenance boundaryrol vagy ennek same-authority projectionjabol olvashato.
4. Forbidden fallback:
   - nincs pane-visible activitybol szarmaztatott pilot success claim,
   - nincs role-local authority shortcut a fresh activation kedveert,
   - nincs stale/duplicate/restart parity closure ebben a taskban eldugva.
5. Allowed resolution path:
   - retained tmux adapter maradhat transport/provenance/debug surface,
   - a fresh implementer `pass` es `human_question` a lezart `E3a` wrapper/authority route-on aktivodhat,
   - same-authority compatibility projection megengedett, ha az explicit ack mar a decision source.
6. Missing-data rule: explicit ack hianyaban nincs success inference; a pilot fresh-path nem claimelhet successful activationt.
7. Phase boundary:
   - wrapper/authority foundation predecessor (`E3a`)
   - implementer fresh-path activation owned here
   - stale/duplicate/restart parity es fail-closed hardening successor (`E3c`)
   - reviewer/meta-reviewer rollout deferred `E4`

### Authority Boundary Map

1. Authority producer: inherited explicit `state.execution_context` + `ActorEmitContextSnapshot` chain from `E1`/`E3a`.
2. Stored authority: bubble state snapshot fingerprint + execution-context mezok; uj persisted authority nincs ebben a taskban.
3. In-scope consumers:
   - implementer `pass` fresh-path consume
   - implementer `human_question` fresh-path consume
   - a kapcsolodo direct flow result/projection seam-ek
4. Explicit out-of-scope consumers:
   - stale authority reject
   - duplicate delivery suppresszio
   - restart recovery parity
   - reviewer/meta-reviewer actor pathok
5. Export surfaces closed in this phase: `yes`, de csak az implementer fresh-path activation szintjen; broad parity vagy multi-role export closure nem.

### Baseline Preservation

1. Must-preserve behaviors:
   - az `E3a` same-authority wrapper route es fail-closed authority baseline valtozatlan marad;
   - a tmux/runtime retained surface observability-only adapter marad;
   - ack-hiany vagy failed launch/delivery nem valhat implicit success-sze.
2. Allowed resolution paths:
   - explicit implementer authority -> canonical actor emit -> runtime ack/projection -> fresh-path activation result
   - same-authority compatibility projection, ha az explicit ack mar a decision source
3. Forbidden regression interpretations:
   - a fresh-path activation nem ertelmezheto ugy, hogy stale/duplicate/restart parity is mar itt le van zarva;
   - a pane activity tovabbra sem valhat success proof-fava.
4. Replacement proof required if removed:
   - ha a retained runtime projection barmely activation resze lecserelodik, explicit evidence kell arra, hogy az uj path ugyanazt a same-authority activation truthot hordozza.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`
2. Secondary shape (if any): `consumer_family_alignment`
   Bounded proof: ugyanaz a szuk implementer fresh-path consume surface zarja le mindket reszt, kulon restart/duplicate recovery vagy coordination szemantika nelkul.
3. Preconditions that must pass before side effects:
   - az `E3a` same-authority foundation ervenyes,
   - az implementer authoritative context explicit es coherent,
   - a runtime ack/provenance path elerheto.
4. Side effects forbidden before preconditions pass:
   - nincs implementer pilot success claim,
   - nincs workflow advance pane-derived jelre,
   - nincs fresh activation fallback legacy shortcut authorityra.
5. Invalid/precondition-failure behavior: zero successful activation side effect; explicit failure vagy unavailable marad.
6. Coordination primitives in scope: `N/A`

### In Scope

1. Implementer `pass` fresh-path activation proof.
2. Implementer `human_question` fresh-path activation proof.
3. Ack-hiany melletti no-success inference explicit vedese a fresh activation pathon.

### Out of Scope

1. Stale authority reject.
2. Conflicting-context fail-closed parity.
3. Duplicate delivery suppresszio.
4. Restart recovery parity.
5. Reviewer/meta-reviewer rollout.
6. Full tmux cleanup vagy topology csere.

### Safety Defaults

1. Ha a fresh activation csak pane-derived success inferenciaval lenne zold, a task fail-closed.
2. Ha a parityhoz stale/duplicate/restart hardening kellene, azt az `E3c` successor owns-olja.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - implementer pilot activation contract
   - runtime ack/provenance consume contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: `state.execution_context` -> `ActorEmitContextSnapshot` -> implementer actor emit -> runtime ack/projection
   - competing identifiers or fallback identities: pane activity, legacy shortcut authority, prompt-visible runtime text
10. Authority/source-of-truth note:
   - canonical source: explicit implementer authority + explicit runtime ack/provenance
   - forbidden secondary sources: pane activity, transport-only tmux visibility
11. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: implementer fresh-path internal execution + workflow activation, mert ugyanaz a bounded path zarja le oket kulon fail-closed/recovery closure nelkul
   - explicitly deferred closures: `cleanup_recovery_consumers`, broad parity hardening, multi-role rollout
12. Bounded-task-shape decision:
   - primary shape: `activation_or_read_model`
   - secondary shape: `consumer_family_alignment`
   - why this bounded mix is safe: csak az implementer fresh-path aktivaciojara szukul, es nem visz be kulon duplicate/restart/stale recovery closuret

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Control model | Explicit ack/provenance az egyetlen implementer pilot success source. | Tmux activity nem acceptance proof. | P1 | required-now |
| Fresh-path scope | Ez a task csak fresh `pass` es fresh `human_question` activationt owns-ol. | Stale/duplicate/restart parity nem huzhato ide. | P1 | required-now |
| Missing-data rule | Ack hianyaban nincs success inference. | A pilot fresh-path explicit failure vagy unavailable marad. | P1 | required-now |
| Phase boundary | Foundation dontesek nem nyithatok ujra. | `E3a` baseline adottsag, `E3c` parity successor marad. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Implementer runtime activation result/projection | implementer `pass`, implementer `human_question` | additive | explicit activation proof a lezart same-authority pathon | stale/duplicate/restart parity -> `E3c` |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `E3a` same-authority wrapper/emit route | preserve | activation tests bizonyitjak, hogy ugyanazon path aktivodik | P1 | required-now |
| ack hianya nem jelent success-t | preserve | explicit no-success evidence delayed/missing ack eseten | P1 | required-now |

### 0c) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| fresh activation precondition hiany | explicit implementer authority + ack/provenance availability | workflow advance, success claim, pane-derived activation | zero successful activation side effect | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | implementer actor emit runtime path | a fresh implementer output ugyanazon canonical route-on aktivodik | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/pass/passResultDelivery.ts` | implementer `pass` activation surface | fresh implementer `pass` explicit activation truthra epul | P1 | required-now | T1 |
| CS3 | `src/v11/shared/askHuman/askHumanFlowContract.ts` | implementer `human_question` activation surface | fresh implementer `human_question` explicit activation truthra epul | P1 | required-now | T2 |
| CS4 | listed tests | activation proof surfaces | fresh-path activation bizonyitott, ack-hiany melletti no-success evidence megvan | P1 | required-now | T1-T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Implementer activation result | fresh-path implicit/parity-vegyes task scope | explicit fresh activation closure | preserved baseline + activation proof | P1 | required-now |
| Ack consume rule | explicit ack baseline mar van | activation explicitten erre epul | preserved baseline | P1 | required-now |

Normative rules:

1. A task nem nevezheti at a tmux adaptert canonical authority vagy ack-source komponensse.
2. A task nem claimelhet stale/duplicate/restart parity closure-t.
3. A task nem foglalhat magaba reviewer vagy meta-reviewer rolloutot.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| ack hianyzik, de pane activity latszik | result | diagnostics lehet, success inference nem | P1 | required-now |
| implementer fresh activation authority nelkul vagy incoherent contexttel futna | throw/result | fail-closed, nincs activation claim | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | fresh implementer `pass` activation | a pilot canonical route-on fut ugyanazon explicit authority + ack truth felett | P1 | required-now | automated test |
| T2 | fresh implementer `human_question` activation | a `human_question` pilot szinten vedett es explicit activation truthra epul | P1 | required-now | automated test |
| T3 | delayed/missing ack a fresh pathon | nincs pane-derived success truth vagy silent activation claim | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a fresh activation proof utan a result shape egyszerusitheto, azt csak az `E3c` es `E4` utani cleanupban szabad tenni.
