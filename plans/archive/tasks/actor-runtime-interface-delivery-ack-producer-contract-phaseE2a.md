---
artifact_type: task
artifact_id: task_actor_runtime_interface_phaseE2a_delivery_ack_producer_contract_v1
title: "Actor Runtime Interface Delivery Ack Producer and Contract Closure (Phase E2a)"
status: completed
phase: phaseE2a
target_files:
  - "src/v11/shared/delivery/tmuxDeliveryContract.ts"
  - "src/v11/shared/ports/tmuxDelivery.ts"
  - "src/v11/shared/ports/tmuxSessions.ts"
  - "src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts"
  - "src/v11/infrastructure/channel/tmux/tmuxDelivery.ts"
  - "src/v11/infrastructure/channel/tmux/tmuxManager.ts"
  - "tests/core/runtime/tmuxDelivery.test.ts"
  - "tests/core/runtime/tmuxManager.test.ts"
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
prd_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Delivery Ack Producer and Contract Closure (Phase E2a)

## L0 - Policy

### Goal

1. Vezessunk be producer-owned, typed delivery es launch ack truthot a tmux runtime seam-en.
2. A canonical ack truth itt zaruljon le, de a jelenlegi downstream consume helyek meg compatibility projectiont kapjanak, ne migrationt.
3. Ne csusszon be workflow/read-model/status fallout; az `E2b` es `E2c` owns-olja ezeket.

### Domain / Control Model Summary

1. Business invariant: a runtime delivery es launch acceptance truth explicit producer boundaryrol jon, nem pane-lathatosagbol, watchdogbol vagy status projectionbol.
2. Control model: a tmux delivery/launch producer code path owns-olja az `accepted|rejected` es `running|failed_to_start` canonical truthot; minden legacy surface csak ebbol derivalt compatibility projection lehet.
3. Read-path rule: a producer code csak explicit tmux command eredmenybol, runtime session registry feloldasbol, workspace authority feloldasbol es marker-confirmationbol allithat elo ack truthot.
4. Forbidden fallback: nincs pane-visible activity, watchdog mintavetel, status/list CLI vagy operatori megfigyeles mint ack truth.
5. Allowed resolution path: a legacy `delivered` boolean, illetve a launch wrapper jelenlegi success/throw surface-e megmaradhat, ha kozvetlenul ugyanabbol a canonical typed ack eredmenybol van derivalt ugyanabban a producer modulban.
6. Missing-data rule: hianyzo runtime session, unsupported recipient, registry read failure, tmux send hiba vagy launch failure explicit typed `rejected` / `failed_to_start` outcome-ot eredmenyez; compatibility surface nem talalhat ki sikeres allapotot.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: producer-local compatibility adapterekig owned here; broader consume alignment successor
   - workflow/orchestration closure: successor (`E2b`)
   - read-model closure: successor (`E2c`)
   - activation closure: successor (`E3`)
   - cleanup/recovery closure: successor (`E4`)

### Authority Boundary Map

1. Authority producer: `tmuxDeliveryRuntime` + `tmuxDelivery` delivery path es `tmuxManager` launch path allitja elo a canonical ack truthot.
2. Stored authority: nincs uj persisted authority ebben a taskban; a runtime sessions registry es a bubble state csak read-only input.
3. In-scope consumers: shared port exportok es producer-local compatibility mapperek, amelyek a jelenlegi `delivered` / `sessionName` surface-eket ugyanebbol a truthbol vezetik le.
4. Explicit out-of-scope consumers: kickoff, pass/converged, approval/reply, ask-human, watchdog orchestration, meta-review projection, status/list/CLI surfaces.
5. Export surfaces closed in this phase: igen, producer-facing typed ack contract es compatibility mapper boundary; downstream workflow/read-model export nem.

### Baseline Preservation

1. Must-preserve behaviors:
   - a jelenlegi delivery call-site-ok a migration ideje alatt tovabbra is kaphatnak `delivered: boolean` kompatibilis eredmenyt;
   - a start flow jelenlegi `launchBubbleTmuxSession` success-pathja tovabbra is adjon `sessionName`-et;
   - a start flow jelenlegi failure-pathja tovabbra is fail-closed maradjon, ne valjon pane-derived success fallbackke.
2. Allowed resolution paths:
   - a legacy `delivered` boolean kozvetlenul a canonical delivery statusbol legyen szarmaztatva;
   - a launch wrapper jelenlegi success/throw surface-e kozvetlenul a canonical launch ackbol legyen derivalt.
3. Forbidden regression interpretations:
   - tilos a downstream consume helyeket ebben a taskban atallitani uj status-tokenekre;
   - tilos a status/CLI/meta-review falloutot ide behuzni;
   - tilos a pane marker vagy pane capture alapjan implicit `accepted` / `running` allapotot allitani.
4. Replacement proof required if removed:
   - a legacy `delivered` surface vagy a launch throw-compat path csak akkor torolheto, ha az `E2b` consume helyei mar explicit typed ackra alltak, es erre teszt/evidence van.

### In Scope

1. Producer-owned typed delivery ack contract bevezetese a tmux delivery seam-en.
2. Producer-owned typed launch ack truth + shared `tmuxSessions` launch contract bevezetese a tmux session launch seam-en.
3. Shared contractok es portok additive/compatibility-preserving kiegeszitese, hogy a jelenlegi consume helyek ne torjenek azonnal.
4. Producer-local mapper/helper bevezetese, amely ugyanabbrol a canonical truthrol kepezi a legacy surface-eket.
5. A direct producer tesztek frissitese a canonical typed ack + compatibility parity bizonyitasara.

### Out of Scope

1. Kickoff/pass/converged/approval/reply/watchdog consume helyek typed ackra allitasa.
2. Ask-human, meta-review projection, state snapshot inspection, status/list/CLI fallout.
3. Persisted state/schema valtoztatas.
4. Implementer pilot activation vagy barmilyen role rollout.

### Safety Defaults

1. Ha a producer typed ack es a legacy compatibility surface kozott elteres jelenne meg, a typed ack legyen a canonical truth, es a legacy surface fail-closed derivacioval kovesse.
2. Ha a launch oldalon a typed ack nem kepezheto egyertelmuen, a wrapper maradjon fail-closed es ne allitson elo synthetic success-t.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - shared runtime delivery result contract (`tmuxDeliveryContract` / `tmuxDelivery` port),
   - shared tmux session launch result contract (`tmuxSessions` port) mint explicit launch-side closure target,
   - producer-local compatibility adapterek a jelenlegi workflow consume helyek vedelmere.

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
   - a producer + shared contract closure ebben a taskban maradhat egyben, mert a downstream consumer rollout explicit deferred;
   - `E2b` owns-olja a direct runtime/orchestration consume alignmentet;
   - `E2c` owns-olja a persisted/meta-review/read-model falloutot.
10. Identity/join note:
   - canonical identity path: deliverynel `bubbleId + envelope.id + target pane/session context`, launchnal `bubbleId + sessionName + tmux command result`
   - competing identifiers or fallback identities: pane-visible activity, watchdog state, status projection, downstream boolean summary
11. Authority/source-of-truth note:
   - canonical source: producer-local tmux execution result + registry/workspace resolution + explicit marker confirmation
   - forbidden secondary sources: pane capture mint success-bizonyitek, watchdog liveness, CLI/status diagnostics
12. Closure-budget triage:
   - closure buckets touched: `producer`, `shared_contract`, `producer_local_compatibility`
   - intentionally collapsed closures: `producer` + `shared_contract` + `producer_local_compatibility`, mert ugyanaz a tmux producer slice owns-olja a canonical truthot, a shared port formalizalast es a legacy projectiont, es nincs kulon consumer/read-model closure ebben a taskban
   - explicitly deferred closures: `workflow_orchestration_consumers`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers`
   - success-claim boundary: az `E2a` evidence csak canonical producer truth + shared launch-port closure + producer-local compatibility parity closure-t claimelhet; downstream consume-family vagy persisted/read-model closure-t nem

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Ack truth explicit producer seamrol jon. | A tmux producer file-oknak canonical typed resultet kell eloallitaniuk. | P1 | required-now |
| Control model | Legacy surface csak a canonical typed result projectionje lehet. | Nincs kulon boolean-only vagy throw-only sikerag, amely nem a canonical ackbol jon. | P1 | required-now |
| Read-path rule | A producer csak explicit runtime/registry/marker/command eredmenyeket olvashat. | Pane/status/watchdog jelbol nem szabad `accepted` / `running` allapotot kovetkeztetni. | P1 | required-now |
| Forbidden fallback | Nincs pane-derived vagy diagnostics-derived success fallback. | Barmilyen ketertelmu esetben explicit `rejected` / `failed_to_start` canonical outcome kell. | P1 | required-now |
| Allowed resolution path | Compatibility shim maradhat ugyanabban a producer modulban. | `delivered` es launch success/throw csak a typed ack derivalt felulete lehet. | P1 | required-now |
| Missing-data rule | Hianyzo session / marker / launch truth fail-closed. | A producer typed failure-t ad, es a compatibility surface ezt koveti. | P1 | required-now |
| Phase boundary | Ez a task csak producer + contract closure. | Workflow consume helyek, read-model es rollout successor taskokban maradnak. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `EmitTmuxDeliveryNotificationResult` (`src/v11/shared/delivery/tmuxDeliveryContract.ts`) | kickoff, pass/reviewer delivery, approval/reply, converged gate, watchdog, direct runtime tests | additive | canonical typed delivery ack shape bevezetese plus producer-local compatibility mapper; a legacy `delivered` surface megmarad derivalt projectionkent | `E2b`, `E2c` |
| `LaunchBubbleTmuxSessionResult` (`src/v11/shared/ports/tmuxSessions.ts`) | start orchestration, start tests, tmuxManager direct tests | additive | canonical typed launch ack shape explicit bevezetese a shared porton; a jelenlegi `sessionName` success surface adapterkent megmarad | `E2b` |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| delivery consumers ma `delivered: boolean` alapjan mukodnek | preserve (temporary compatibility) | direct runtime tests bizonyitsak, hogy a legacy boolean a typed delivery ack projectionje | P1 | required-now |
| tmux launch ma success esetben `sessionName`-et ad, hiba eseten throw-ol | preserve (temporary compatibility) | direct runtime tests bizonyitsak, hogy a wrapper a canonical launch ackbol vezeti le a success/throw surface-et | P1 | required-now |
| pane marker / pane activity ma best-effort runtime signal | preserve csak observabilitykent | producer code review + tests bizonyitsak, hogy ez nem valik canonical success truth-ta | P1 | required-now |

### 0c) Successor Handoff Boundary

| Boundary Slice | Closed Here | Must Stay Deferred | Exit Rule |
|---|---|---|---|
| canonical delivery producer truth | yes | downstream runtime/orchestration consume rewrite | PASS vagy done-package summary csak a producer-owned delivery typed ack truth closure-t claimelheti |
| canonical launch producer truth + shared `tmuxSessions` port closure | yes | downstream launch/runtime consume alignment | az `E2a` launch closure csak akkor szamit teljesnek, ha a shared porton is explicit a canonical typed launch ack; producer-local helper onmagaban nem eleg |
| producer-local legacy compatibility mapping | yes | legacy field removal, downstream consumer migration, wider projection cleanup | `delivered` / `sessionName` compatibility megmarad, removal trigger tovabbra is successor-owned |
| direct runtime/orchestration consume-family alignment | no | `E2b` | ha a diff consumer oldali truth-atallast igenyelne, a scope mar nem `E2a` |
| persisted diagnostics, meta-review, status/list/read-model fallout | no | `E2c` | sem spec, sem handoff summary nem allithat ilyen closure-t ebben a taskban |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | delivery contract exports | type/interface exports -> shared contract | delivery result exportok | Vezessen be canonical typed delivery ack vocabularyt es compatibility map alapot. | P1 | required-now | code diff |
| CS2 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | `attemptTmuxDelivery` | `(input) -> Promise<typed delivery ack>` vagy equivalent canonical helper | confirmation/failure return path | A marker confirm es tmux send eredmeny canonical typed ackka alakuljon. | P1 | required-now | tests/core/runtime/tmuxDelivery.test.ts |
| CS3 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | `emitTmuxDeliveryNotification` | `(input: EmitTmuxDeliveryNotificationInput) -> Promise<EmitTmuxDeliveryNotificationResult>` | final success/failure mapping | A public legacy result a canonical typed ackbol legyen derivalt ugyanitt. | P1 | required-now | tests/core/runtime/tmuxDelivery.test.ts |
| CS4 | `src/v11/shared/ports/tmuxSessions.ts` | launch port exports | type/interface exports -> shared port | launch result exportok | A canonical typed launch ack shape-je itt legyen formalizalva additive modon mint explicit shared launch-side closure target. | P1 | required-now | code diff |
| CS5 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | `launchBubbleTmuxSession` | `(input: LaunchBubbleTmuxSessionInput) -> Promise<LaunchBubbleTmuxSessionResult>` | tmux new-session / layout / seed path | A producer oldalon letezo canonical launch ack a CS4-ben formalizalt shared port shape-re alljon ra, es ebbol menjen a legacy wrapper surface. | P1 | required-now | tests/core/runtime/tmuxManager.test.ts |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Delivery ack canonical contract | flat legacy result: `delivered`, `message`, optional `reason`, `sessionName`, `targetPaneIndex` | uj canonical typed delivery ack result vagy equivalent shared shape | `status` (`accepted|rejected`), `message` | `reason`, `sessionName`, `targetPaneIndex`, `deliveryTargetReasonCode` | additive via producer-local compatibility mapping | P1 | required-now |
| Delivery legacy compatibility surface | `EmitTmuxDeliveryNotificationResult` current consumers hasznaljak | tovabbra is elerheto, de canonical typed result projectionje | `delivered`, `message` | `reason`, `sessionName`, `targetPaneIndex`, `deliveryTargetReasonCode` | backward-compatible in this task | P1 | required-now |
| Launch ack canonical contract | success-only shared result `sessionName`; failure throw path | uj canonical typed launch ack contract a shared `tmuxSessions` porton | `status` (`running|failed_to_start`) | `sessionName`, `reason_code`, `error_message` | additive via wrapper compatibility | P1 | required-now |
| Launch legacy compatibility surface | `LaunchBubbleTmuxSessionResult` csak `sessionName` successen, failure throw | valtozatlan public wrapper surface az `E2b` consume alignmentig | `sessionName` successen | `N/A` | backward-compatible in this task | P1 | required-now |
| Compatibility ownership boundary | downstream consumers ma legacy surface-eket hasznalnak | typed ack producer-local mapper owns-olja a parityt az `E2b` consume alignmentig | producer-owned canonical ack -> legacy projection | nincs uj downstream field/token kovetelmeny ebben a taskban | backward-compatible in this task | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| tmux runtime calls | a meglvo tmux commandok es marker confirmation hasznalata | uj operator/status/read-model side effect | a task producer seamre korlatozodik | P1 | required-now |
| shared contract exports | uj typed ack type/helper exportok | downstream consumer rewrite ugyanebben a taskban | additive/compatibility-preserving valtozasok | P1 | required-now |
| tests | direct runtime tmux delivery/launch tesztek frissitese | workflow/read-model contract tesztek atallitasa | az utobbi successor scope | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| runtime session vagy workspace authority nem oldhato fel deliverynel | runtime sessions registry | result | canonical typed `rejected`; legacy `delivered=false` | `DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE` | warn | P1 | required-now |
| marker confirmation vagy send failed | tmux delivery path | result | canonical typed `rejected`; legacy `delivered=false` | `DELIVERY_ACK_REJECTED` | warn | P1 | required-now |
| unsupported recipient target | delivery targeting | result | canonical typed `rejected`; legacy `delivered=false` | `DELIVERY_ACK_TARGET_UNSUPPORTED` | warn | P1 | required-now |
| launch workspace invalid vagy session exists vagy tmux launch command fails | tmux new-session/layout | result at canonical helper level; throw only on legacy wrapper boundary if preserved | canonical typed `failed_to_start`; legacy wrapper marad fail-closed | `LAUNCH_ACK_FAILED_TO_START` | error | P1 | required-now |
| canonical typed ack nem kepezheto egyertelmuen | internal producer mapping | throw | fail closed, ne kepezzen synthetic success-t | `ACK_CANONICALIZATION_FAILED` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` | P1 | required-now |
| must-use | current-tree code evidence: `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/shared/ports/tmuxDelivery.ts`, `src/v11/shared/ports/tmuxSessions.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | P1 | required-now |
| must-not-use | downstream workflow consume rewrite (`kickoff`, `pass`, `converged`, `watchdog`, `approval`, `reply`) | P1 | required-now |
| must-not-use | status/list/CLI/meta-review projection cleanup | P1 | required-now |
| must-not-use | persisted state/schema valtoztatas | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | canonical delivery success | runtime session, workspace es marker confirm rendelkezesre all | `emitTmuxDeliveryNotification` fut | letezik canonical typed `accepted` truth, es a legacy `delivered=true` pontosan ezt projekciozza | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T2 | canonical delivery failure | nincs runtime session vagy marker confirm megbukik | `emitTmuxDeliveryNotification` fut | canonical typed `rejected` outcome jon, es a legacy `delivered=false` ezt koveti | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T3 | launch success compatibility | tmux session launch sikerul | `launchBubbleTmuxSession` fut | canonical typed `running` truth kepzodik, es a legacy wrapper tovabbra is `sessionName` success surface-et ad | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T4 | launch failure fail-closed | session exists vagy tmux launch command fail | `launchBubbleTmuxSession` fut | canonical typed `failed_to_start` outcome kepezheto, es a legacy wrapper nem gyart synthetic success-t | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T5 | compatibility derived from canonical truth | delivery vagy launch producer ugyanazon hibaara fut | legacy es typed surface egyszerre ellenorzott | nincs olyan ag, ahol a compatibility surface sikeresebb allapotot allit, mint a canonical typed ack | P1 | required-now | direct runtime tests |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a delivery es launch canonical ack shape tul hasonlo, erdemes lehet kozos ack utility type-ot bevezetni, de csak ha nem keveri a ket producer seam ownershipjat.
2. [later-hardening] Ha az `E2b` consume alignment elhuzodik, kulon appendixben erdemes lehet rogzitni a legacy projection remove triggerjeit.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | delivery es launch canonical ack naming konszolidacio | L2 | P2 | later-hardening | Phase E2a drafting | Csak akkor vond kozos utilba, ha a producer ownership es test coverage ettol nem mosodik ossze |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan follow-upot, amely az `E2a` taskba workflow consume alignmentet vagy status/read-model falloutot huzna be.
3. A compatibility-preserving producer mapper kotelezo; downstream consumer torest nem szabad az `E2a`-ban "majd a call-site-ok kovetik" jelleggel bent hagyni.
4. Ha a typed ack shape csak breaking modon lenne bevezetheto, a task nem implementalhato ebben a scope-ban, es vissza kell menni plan refinementre.
5. PASS/done-package summary nem claimelhet `E2b` vagy `E2c` closure-t; ha a valtozas ehhez consumer-, status-, meta-review- vagy persisted-fallout alignmentet igenyelne, a scope hibasan lett osszevonva.
6. Launch-oldalon nem maradhat `shared port contract` vs `producer-local helper` alternative closure-nyelv; az `E2a` closure targetje a shared `tmuxSessions` port explicitalasa.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a canonical typed delivery ack producer-shape explicit es code-levelen bevezetett;
2. a canonical typed launch ack shape explicit es code-levelen bevezetett a shared `tmuxSessions` porton;
3. a legacy `delivered` es launch success/throw surface ugyanebbol a canonical truthbol van derivalt;
4. direct runtime tesztek bizonyitjak a typed ack + compatibility parityt;
5. nincs workflow/read-model/persisted fallout behuzva ebbe a taskba;
6. a handoff summary explicitten producer + shared launch-port + producer-local compatibility closure-kent irja le az eredmenyt, es nem sugallja az `E2b`/`E2c` successor closure-t.
