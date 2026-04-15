---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_foundation_hardening_phaseE3a_v1
title: "Actor Runtime Interface Implementer Pilot Foundation Hardening (Phase E3a)"
status: implementable
phase: phaseE3a
target_files:
  - src/cli/commands/agent/emit.ts
  - src/v11/shared/actorProtocol/actorEmitContext.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/pass/passWorkspaceContextPreparation.ts
  - src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/v11/application/pass/passWorkspaceContextPreparation.test.ts
  - tests/v11/application/askHuman/askHumanWorkspaceContextPreparation.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Foundation Hardening (Phase E3a)

## L0 - Policy

### Goal

1. Szukitse bounded foundation slice-ra az implementer pilotot ugy, hogy az implementer `pass` es `human_question` canonical wrapper/authority route-ja review-stabil legyen meg az aktiv pilot claim elott.
2. Tegye explicitte, hogy az implementer emit bridge authoritative-context-first modellen all, es a compat workspace lookup legfeljebb bridge marad, nem alternativ canonical authority.
3. Keszitse elo az `E3b` activation taskot ugy, hogy ott mar ne kelljen ujra authority- vagy wrapper-shape dontest hozni.

### Domain / Control Model Summary

1. Business invariant: az implementer sem kaphat role-local authority shortcutot; ugyanarra az explicit execution-scoped authority modellre kell allnia, mint a kesobbi role-oknak.
2. Control model: a canonical implementer emit route explicit authoritative contexten fut, nem cwd/pane/prompt jeleken.
3. Read-path rule: a wrapper authority truth csak `ActorEmitContextSnapshot`-bol es ugyanennek tovabbitott guardjaibol johet.
4. Forbidden fallback:
   - nincs implicit target-authority override API,
   - nincs cwd-only canonical authority,
   - nincs kulon `human_question` shortcut authority modell.
5. Allowed resolution path:
   - canonical `agent emit` surface marad,
   - authoritative context materialization megengedett ugyanazon bubble/execution authority chainen,
   - a compat workspace lookup csak bridge lehet.
6. Missing-data rule: hianyzo vagy mismatched authority fail-closed.
7. Phase boundary:
   - authority foundation predecessorbol orokolt, de implementer-route hardening itt owned,
   - runtime activation/parity proof deferred `E3b`,
   - reviewer/meta-reviewer rollout deferred `E4`.

### Authority Boundary Map

1. `authority_producer`
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - CLI bridge via `src/cli/commands/agent/emit.ts`
2. `workflow_orchestration_consumers`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/pass/passWorkspaceContextPreparation.ts`
   - `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts`
3. `cleanup_recovery_consumers`
   - none owned here; restart parity deferred

### In Scope

1. Implementer wrapper route hardening `pass` es `human_question` eseten.
2. Authoritative-context-first bridge es workspace-prep same-authority lock.
3. CLI emit surface target-authority reopen nelkuli megorzese.
4. A kapcsolodo wrapper/bridge/prep tesztek alignmentje.

### Out of Scope

1. Duplicate delivery enforcement parity.
2. Restart recovery parity closure.
3. Tmux ack/provenance containment beyond baseline preservation.
4. Barmilyen implementer pilot activation claim.
5. Reviewer/meta-reviewer rollout.

### Safety Defaults

1. Ha a foundation hardening es a current compat bridge kozott feszules van, a canonical same-authority path maradjon, es a compat path szukuljon.
2. Ha a `pass` es `human_question` kulon authority shape-et igenyelne, a task nem ready; ilyen shortcut nem engedelyezett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - actor emit authority contract
   - implementer wrapper routing contract
   - pass / ask-human workspace preparation authority handoff contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split note:
   - a runtime activation es parity closure explicitten deferred `E3b`,
   - ez a task csak a wrapper/authority foundation hardeninget owns-olja.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Implementer route nem lehet authority shortcut. | `pass` es `human_question` ugyanarra a wrapper modellre all. | P1 | required-now |
| Control model | Explicit authoritative context az egyetlen canonical route. | A compat bridge csak bridge maradhat. | P1 | required-now |
| Forbidden fallback | Nincs cwd-only, pane-only vagy target-override authority. | Fail-closed mismatch eseten. | P1 | required-now |
| Missing-data rule | Authority hiany explicit hiba. | Nincs heuristic reroute. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/emit.ts` | parse/run bridge | A public emit surface ne nyisson explicit target-authority API-t. | P1 | required-now | T1, T4 |
| CS2 | `src/v11/shared/actorProtocol/actorEmitContext.ts` | authority materialization | Same-authority context explicit es fail-closed maradjon. | P1 | required-now | T1, T3 |
| CS3 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | implementer wrapper routing | `pass` es `human_question` ugyanazon wrapperen menjen. | P1 | required-now | T1, T2 |
| CS4 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | pass/human forwarders | Mindket emit ugyanazt az authoritative contextet vigye tovabb. | P1 | required-now | T2 |
| CS5 | `src/v11/application/pass/passWorkspaceContextPreparation.ts` | prep path | Authoritative-context branch first-class canonical route legyen. | P1 | required-now | T2, T3 |
| CS6 | `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts` | prep path | Ugyanaz a same-authority branch ervenyes, mint `pass` eseten. | P1 | required-now | T2, T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Implementer authority input | explicit mezok leteznek | same-authority route explicit primary | public surface preserved | P1 | required-now |
| Wrapper invocation | wrapper letezik | wrapper review-stable foundation route lesz | compatible hardening | P1 | required-now |
| Workspace prep authority handoff | authoritativeContext opcionális | authoritativeContext canonical branch, cwd bridge secondary | compatible hardening | P1 | required-now |

Normative rules:

1. A task nem vezethet be uj public CLI opciot explicit target authority megadasara.
2. A `human_question` nem kaphat kulon authority modellt a `pass`-tol elteroen.
3. A task nem claimelhet runtime activation closure-t.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| authority hianyzik vagy mismatched | throw | nincs fallback | P1 | required-now |
| compat path authority shortcutot igenyelne | throw | route marad explicit bridge | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | implementer `pass` wrapper same-authority contexttel fut | explicit wrapper route hasznalodik | P1 | required-now | automated test |
| T2 | implementer `human_question` ugyanazon modellen fut | nincs kulon authority shortcut | P1 | required-now | automated test |
| T3 | stale vagy conflicting authority fail-closed | nincs reroute | P1 | required-now | automated test |
| T4 | CLI emit surface nem reopeneli a target-authority API-t | public surface stabil marad | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a bridge egyszerusitesehez tovabbi role-shared helper kell, azt mar `E4` alatt erdemes altalanositani.
