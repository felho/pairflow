---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_parity_and_fail_closed_hardening_phaseE3c_v1
title: "Actor Runtime Interface Implementer Pilot Parity and Fail-Closed Hardening (Phase E3c)"
status: implementable
updated_at: 2026-04-17
phase: phaseE3c
target_files:
  - plans/actor-runtime-interface-execution-authority-contract-note-v1.md
  - src/v11/shared/state/executionContext.ts
  - src/v11/shared/start/startStateMutation.ts
  - src/v11/shared/actorProtocol/actorEmitContext.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/cli/commands/agent/emit.ts
  - src/v11/shared/delivery/tmuxDeliveryContract.ts
  - src/v11/shared/delivery/implementerHandoffDelivery.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/shared/delivery/implementerHandoffDelivery.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Parity and Fail-Closed Hardening (Phase E3c)

## Current Tree Position (2026-04-17)

1. `E3a` lezarta a canonical execution authority vocabularyt es az implementer same-authority foundationt.
2. `E3b` lezarta a fresh activation ownershipet az aktiv implementer pathon.
3. Ez a task mar nem authority-foundation vagy activation munka, hanem az aktiv implementer path fail-closed parity es restart/no-success closure-je.

## L0 - Policy

### Goal

1. Zarja le az implementer pilot utani parity minimumot ugyanazon canonical execution identity felett.
2. Bizonyitsa explicit source-entrypoint es automated evidence szinten:
   - stale authority reject,
   - conflicting-context fail-closed,
   - duplicate masodik success tilalma,
   - restart utani uj execution authority,
   - delayed vagy missing ack melletti no-success.
3. Tartsa meg a retained tmux/runtime surfacet observability-only adapterkent; a parity bizonyitas nem adhat neki authority vagy success truth szerepet.

### Complexity / Split Decision

1. `risk_score: 7`
2. Primary bounded-task shape: `fail_closed_hardening`
3. Secondary bounded-task shape: `consumer_family_alignment`
4. Split decision: egy taskban maradhat, mert nem nyitja ujra az `authority_producer` closure-t; ugyanazon lezart implementer authority seam folott zarja le az internal execution, workflow orchestration es cleanup/recovery parity minimumot.

### Canonical Contract Anchors

1. `plans/actor-runtime-interface-execution-authority-contract-note-v1.md`
2. `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
3. `docs/pairflow-initial-design.md`
4. `src/v11/shared/state/executionContext.ts`
5. `src/v11/shared/actorProtocol/actorEmitContext.ts`
6. `src/v11/shared/delivery/tmuxDeliveryContract.ts`

### Closed Terms

1. Canonical execution identity: `handoff_id` + explicit `execution_id`.
2. Canonical authority source-of-truth: top-level `execution_context`.
3. Guard fields: `expected_role`, `expected_round`, `expected_state_fingerprint`.
4. Ugyanarra a canonical execution identityre nincs masodik successful launch vagy delivery.
5. Restart utan uj `execution_id` kotelezo; a regi authority stale marad.
6. Pane activity, tmux visibility, marker latas vagy operatori megfigyeles nem authority es nem success truth.

### Scope Reality / Shape Proof

1. Inspected mutation es consume seam-ek:
   - `src/v11/shared/start/startStateMutation.ts`
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/cli/commands/agent/emit.ts`
   - `src/v11/shared/delivery/implementerHandoffDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
2. A valos scope nem csak `executionContext.ts` + `tmuxDeliveryContract.ts`; a stale/conflicting/duplicate/restart/no-success closure tobb konkret entrypointon keresztul ervenyesul.
3. A task shape azert `fail_closed_hardening`, mert a kozeppont a precondition reject, stale authority invalidalas, duplicate success tiltas es missing-ack melletti no-success.
4. A secondary `consumer_family_alignment` csak annyiban engedett, amennyiben ugyanazon implementer canonical seam consumerei kozt kell parityt tartani.
5. A task nem ownershipolja a reviewer/meta-reviewer rolloutot, a broad retained adapter cleanupot vagy uj authority producer shape-et.

### Authority Boundary Map

1. Preserved predecessor closure:
   - `E3a`: canonical authority vocabulary + same-authority bridge
   - `E3b`: fresh implementer activation
2. In scope now:
   - `internal_execution_consumers`: actor emit validation, public emit parse/runtime fail-closed
   - `workflow_orchestration_consumers`: implementer emit route parity, duplicate/stale reject a lezart authority felett
   - `cleanup_recovery_consumers`: restart utani uj authority es regi authority stale-reject
   - `shared_contract`: explicit runtime ack semantics megorzese ugyanazon no-success rule mellett
3. Explicitly not closed here:
   - `read_model_consumers`
   - reviewer vagy `meta_reviewer` rollout
   - broad retained adapter cleanup
   - uj producer semantics vagy authority vocabulary reinterpretation

### Baseline Preservation

1. Preserved baseline behavior:
   - top-level `execution_context` marad a canonical authority source,
   - `execution_id` explicit es a `handoff_id`-tol kulonallo marad,
   - restart explicit uj execution contexttel megy,
   - tmux runtime outcome marad explicit acceptance vagy rejection forma.
2. Intentionally tightened behavior:
   - stale vagy conflicting authority fail-closed,
   - duplicate masodik success tiltott,
   - missing ack mellett nincs success inference.
3. Forbidden regression interpretations:
   - `execution_id` nem lehet optional diagnostics mezove downgrade-olva,
   - `handoff_id` nem lehet `execution_id` substitute,
   - pane activity vagy marker latas nem emelheto acceptance proofra,
   - restart utan regi emit authority nem fogadhato el convenience alapon.

### Precondition and Side-Effect Boundary

1. Ezeknek kell atmenniuk barmilyen state advance vagy delivery side effect elott:
   - explicit `execution_id` jelenlet,
   - `handoff_id` es `execution_id` distinctness,
   - snapshot integrity,
   - expected role/round/fingerprint egyezes, ahol a route igenyli.
2. Invalid vagy stale authority eseten tiltott side effect:
   - nincs state transition,
   - nincs masodik success projection,
   - nincs inferred runtime acceptance,
   - nincs retry altali success upgrade authority mismatch utan.
3. Delivery retry csak a runtime-level `delivery_unconfirmed` / `tmux_send_failed` esetekre engedett, es ott sem keletkezhet success explicit accepted ack nelkul.

### Plan Linkage

1. Parent gap closed: az `E3b` utan nyitva maradt implementer parity + fail-closed + restart/no-success closure.
2. Depends on:
   - `E3a` authority foundation
   - `E3b` activation closure
3. Unlocks:
   - `E4` reviewer + meta-reviewer rollout
   - retained adapter cleanup csak a lezart implementer parity utan
4. Refines prior open task semantics: ez a refinement kiboviti a bounded slice bizonyitasat; nem valtoztatja meg a plan phase orderinget.
5. Inherited plan-level validation expectation:
   - stale authority reject,
   - conflicting-context fail-closed,
   - duplicate suppresszio vagy reject success nelkul,
   - restart utani uj authority,
   - ack-hiany melletti no-success.

### In Scope

1. Implementer stale/conflicting authority handling.
2. Duplicate delivery vagy second-success minimum policy ugyanazon canonical execution identityre.
3. Restart recovery authority refresh az implementer pilot parity proof reszekent.
4. Delayed vagy missing ack melletti no-success behavior.

### Out of Scope

1. Uj authority shape vagy wrapper vocabulary.
2. Fresh activation redesign.
3. Reviewer/meta-reviewer rollout.
4. Broad retained adapter cleanup vagy topology rewrite.
5. Read-model vagy public diagnostics redesign.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical identity | `handoff_id` + explicit `execution_id` a parity proof alapja. | Missing, stale vagy conflicting execution identity fail-closed. | P1 | required-now |
| Guard semantics | `expected_role`, `expected_round`, `expected_state_fingerprint` guard mezok; nem canonical authority source-ok. | Guard mismatch nem gyengitheto warningsza vagy diagnostics-only kimenetre. | P1 | required-now |
| Restart rule | Restart utan uj `execution_id` kotelezo ugyanazon bubble/round/role mellett. | A restart elotti emit authority stale marad. | P1 | required-now |
| Missing-data rule | Explicit runtime outcome hianyaban nincs success inference. | Pane activity es tmux lathatosag csak diagnostics maradhat. | P1 | required-now |
| Duplicate-success rule | Ugyanarra a canonical execution identityre nincs masodik success. | Reject vagy bounded no-op elfogadhato, masodik successful outcome nem. | P1 | required-now |

### 1) Canonical Contract Preservation

| Item | Classification | Source Anchor | Preserved Meaning | Forbidden Reinterpretation |
|---|---|---|---|---|
| `execution_context` | canonical | `plans/actor-runtime-interface-execution-authority-contract-note-v1.md` | top-level authority source-of-truth | tmux/pane/runtime session metadata authorityforrassa emelese |
| `handoff_id` + `execution_id` | canonical | `src/v11/shared/state/executionContext.ts` | minimum execution identity | `execution_id` optional vagy `handoff_id`-bol derivalt |
| `expected_role`, `expected_round`, `expected_state_fingerprint` | guard | `src/v11/shared/actorProtocol/actorEmitContext.ts` | fail-closed verification mezok | canonical identity replace-ese vagy diagnostics-only downgrade |
| tmux ack status/reason | shared contract | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | explicit runtime outcome accepted/rejected shape-ben | pane activitybol vagy trust-prompt visibilitybol inferred success |
| workspace/session resolution | compat | `plans/actor-runtime-interface-execution-authority-contract-note-v1.md` | deterministic same-authority bridge lehet | kulon authority source vagy success truth |

`drift_status: no_drift`

### 2) Scope Reality and Shape Proof

| Item | Evidence | Task Consequence |
|---|---|---|
| Restart remint a resume mutationben tortenik | `src/v11/shared/start/startStateMutation.ts` | A restart parity nem irhato le pusztan `executionContext.ts` helper-szinten. |
| Stale/conflicting reject az actor emit validation route-ban ervenyesul | `src/v11/shared/actorProtocol/actorEmitContext.ts` | A fail-closed ownershipot explicit erre a seamre kell kotni. |
| Public emit surface execution-id fail-closed parse-time is elvaras | `src/cli/commands/agent/emit.ts` | A tasknak nevesitenie kell a CLI boundaryt, nem eleg "actor emit tests". |
| No-success retry parity kulon delivery helper + runtime ack seam-ben el | `src/v11/shared/delivery/implementerHandoffDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | A tasknak explicit no-success seam ownershipot kell vallalnia. |
| Az actual scope tobb consumer bucketet erint, de nem nyit uj producer semanticsot | parent plan fan-out scan | Egy bounded E3c task maradhat, ha csak parity/hardening closure-t ownershipol. |

### 3) Plan Linkage and Successor Impact

| Item | Value |
|---|---|
| Parent gap closed | implementer pilot parity + fail-closed hardening a lezart activation utan |
| Predecessor dependency | `E3a`, `E3b` |
| Successor unlocked | `E4` reviewer/meta-reviewer rollout + retained adapter cleanup |
| Obsoleted task | none |
| Refined artifact | current `phaseE3c` task ugyanezen azonositoval, szelesebb target-file reality proof-fel |

### 4) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/state/executionContext.ts` | `buildRestartedExecutionContext` | restart ugyanazon bubble/round/role mellett uj `execution_id`-t ad | P1 | required-now | T4 |
| CS2 | `src/v11/shared/start/startStateMutation.ts` | `buildResumedState` | resume/restart az implementer authorityt explicit uj contextre allitja, nem implicit pane allapotra | P1 | required-now | T4 |
| CS3 | `src/v11/shared/actorProtocol/actorEmitContext.ts` | `assertActorEmitContextMatches`, `assertActorEmitContextSnapshotIntegrity` | stale, conflicting, derived vagy duplicate authority fail-closed | P1 | required-now | T1, T2, T3 |
| CS4 | `src/cli/commands/agent/emit.ts` | `parseAgentEmitCommandOptions`, `runAgentEmitCommand` | public emit surface megkoveteli az explicit distinct `execution_id`-t es nem enged target-authority shortcutot | P1 | required-now | T1, T2 |
| CS5 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | implementer emit route | a public emit ugyanarra a canonical validation es runtime route-ra megy | P2 | required-now | T2, T3 |
| CS6 | `src/v11/shared/delivery/implementerHandoffDelivery.ts` | `shouldRetryImplementerHandoffDelivery`, `executeImplementerHandoffDelivery` | retry csak bounded runtime failure-re engedett, missing ack mellett nincs success | P1 | required-now | T5 |
| CS7 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | `attemptTmuxDelivery`, ack projection helpers | accepted/rejected ack marad a runtime truth; pane visibility nem acceptance proof | P1 | required-now | T5, T6 |
| CS8 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | retained adapter facade | adapter megmarad observability-only transport seamnek | P2 | required-now | T6 |

### 5) Data and Interface Contract

| Item | Shape / Contract | Required Now | Notes |
|---|---|---|---|
| Actor emit input | `handoff_id`, `execution_id`, `kind`, `repo`, `bubble_id` | yes | `execution_id` kotelezo es distinct a `handoff_id`-tol |
| Actor emit guard input | `expected_role`, `expected_round`, `expected_state_fingerprint` | conditional | Guard only; mismatch fail-closed |
| Persisted runtime authority | top-level `execution_context` | yes | canonical state authority marad |
| Restarted authority | uj `execution_id`, uj attempt lineage | yes | regi authority stale marad |
| Runtime ack | explicit accepted/rejected tmux ack reasonnel | yes | success csak accepted ackkal vagy arra epulo expliciten tipizalt outcome-mal |

### 6) Side Effects Contract

| Scenario | Allowed Side Effects | Forbidden Side Effects |
|---|---|---|
| Missing vagy derived `execution_id` | none | delivery, state advance, implicit authority repair |
| Stale vagy conflicting authority | none | state transition, duplicate success, retry altali success |
| Restart utani valid uj authority | bounded restart/resume state refresh, normal runtime route | regi authority elfogadasa |
| Delivery unconfirmed / tmux send failed | legfeljebb egy bounded retry az implementer handoff helper szerint | success projection explicit accepted ack nelkul |

### 7) Error and Fallback Contract

| Scenario | Expected Outcome | Fallback Policy |
|---|---|---|
| Missing `execution_id` | `ACTOR_EMIT_INPUT_EXECUTION_ID_MISSING` | nincs fallback `handoff_id`-ra |
| `execution_id == handoff_id` | `ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION` | nincs inferred authority |
| Snapshot vagy guard mismatch | `ACTOR_EMIT_CONTEXT_INVALID` / canonical mismatch reject | fail-closed, side effect nelkul |
| Duplicate emit authority advance utan | stale authority reject | nincs second success |
| Missing/unconfirmed runtime ack | explicit rejected/unavailable runtime-level outcome | nincs pane-derived success |

### 8) Dependency Constraints

| Dependency | Constraint | Failure / Deviation Policy |
|---|---|---|
| `E3a` canonical vocabulary | nem nyithato ujra | ha uj authority shape kellene, route back to plan |
| `E3b` activation ownership | preserved baseline | ha a parity proof activation redesignot igenyelne, kulon successor task kell |
| tmux runtime contract | explicit accepted/rejected outcome preserved | ha success csak pane visibilitybol latszana, fail-closed maradjon |
| reviewer/meta successor work | out of scope | ne csusszon at `E4` consume-family rollout `E3c`-be |

### 9) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | explicit `execution_id` fail-closed | missing vagy derived `execution_id` reject; nincs side effect | P1 | required-now | `tests/cli/agentEmitCommand.test.ts` |
| T2 | duplicate/stale implementer authority reject | authority advance utan a regi emit rejectet kap es nincs masodik success | P1 | required-now | `tests/cli/agentEmitCommand.test.ts`, `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |
| T3 | conflicting-context fail-closed | role/round/fingerprint/snapshot mismatch mellett nincs successful side effect | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/cli/agentEmitCommand.test.ts` |
| T4 | restart remint | restart utan uj `execution_id`; a restart elotti authority stale marad | P1 | required-now | `tests/core/runtime/restartRecovery.test.ts` |
| T5 | missing-ack no-success | `delivery_unconfirmed` vagy `tmux_send_failed` utan nincs success inference | P1 | required-now | `tests/v11/shared/delivery/implementerHandoffDelivery.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts` |
| T6 | retained adapter observability-only baseline | adapter cleanup elott is explicit ack marad a truth-source | P2 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |

### 10) Shared Contract Compatibility

| Item | Decision | In-Scope Consumers | Out-of-Scope Consumers |
|---|---|---|---|
| `tmuxDeliveryContract` runtime ack shape | additive/preserved, nem breaking rewrite | implementer delivery helper, tmux runtime adapter, implementer emit path | reviewer, `meta_reviewer`, read-model fallout |
| actor emit authority vocabulary | preserved shared contract | public emit CLI, actor emit validation, implementer runtime route | `E4` reviewer/meta-reviewer rollout |

### 11) Baseline Preservation

| Baseline | Must Preserve | Replacement Proof Required If Removed |
|---|---|---|
| top-level `execution_context` authority | yes | yes |
| explicit distinct `execution_id` | yes | yes |
| explicit accepted/rejected runtime outcome | yes | yes |
| observability-only tmux pane visibility | yes | yes |

### 12) Closure-Budget Summary

| Bucket | Status | Note |
|---|---|---|
| `authority_producer` | preserved baseline only | no new producer semantics allowed |
| `shared_contract` | in scope | explicit runtime ack semantics preserved and consumed fail-closed |
| `internal_execution_consumers` | in scope | actor emit validation + CLI boundary |
| `workflow_orchestration_consumers` | in scope | implementer emit route parity |
| `read_model_consumers` | deferred | nem `E3c` scope |
| `persisted_authority_or_schema` | preserved baseline only | no schema reinterpretation |
| `cleanup_recovery_consumers` | in scope | restart stale-authority invalidation |

Collapsed closures:
1. implementer fail-closed hardening
2. restart/no-success recovery parity

Deferred closures:
1. reviewer/meta-reviewer rollout
2. broad retained adapter cleanup
3. read-model fallout

Why bounded task still safe:
1. ugyanazon lezart implementer authority seam consumereit zarja le,
2. nem vezet be uj canonical field-role ertelmezest,
3. nem ownershipol downstream read-model vagy cross-role compatibility rolloutot.

### 13) Precondition and Side-Effect Boundary

| Step | Required Before Side Effect | Forbidden Early Side Effect |
|---|---|---|
| P1 | `execution_id` present es distinct | inferred authority repair |
| P2 | snapshot integrity es canonical context match | delivery trigger, state advance |
| P3 | guard validation ahol route koveteli | duplicate success, partial state mutation |
| P4 | explicit runtime ack accepted | success projection |

## L2 - Implementation Notes

1. Ha a duplicate policy implementation-szinten suppresszalt no-opkent egyszerubb, az elfogadhato, de explicit second-success nem jelenhet meg.
2. Ha a retained adapter cleanup implementation kozben broad topology cseret kovetelne, azt `E4` vagy kulon successor task ownershipolja.

## Assumptions

1. A parent plan `E3c` -> `E4` sorrendje tovabbra is ervenyes.
2. A reviewer/meta-reviewer parity tovabbra is successor-scope, nem kell visszahozni `E3c`-be.

## Open Questions

1. No blocking open questions.

## Hardening Backlog

No open later-hardening items.
