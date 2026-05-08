---
artifact_type: note
artifact_id: note_actor_runtime_interface_topology_neutral_delivery_executor_contract_v1
title: "Actor Runtime Interface Topology-Neutral Delivery and Executor Contract Note"
status: active
updated_at: 2026-04-22
owners:
  - "felho"
---

# Note: Actor Runtime Interface Topology-Neutral Delivery and Executor Contract

## Purpose

1. Ez a note az `Opportunity 2 / O2-T1` docs-only outputja a topology-semleges delivery/executor boundary explicitte tetelehez.
2. Nem nyitja ujra a `Phase E2a`-ban lezart typed delivery/launch ack baseline-t, es nem irja felul az `O1` generic runtime kernel boundaryt.
3. A note addig normativ a jovobeli delivery/executor implementation szeletek szamara, amig explicit successor artifact maskepp nem rendelkezik.

## Normative References

1. Sequencing owner:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Preserved upstream kernel boundary:
   - `docs/actor-runtime-interface/generic-runtime-kernel-contract-note-v1.md`
3. Preserved delivery/launch ack closure:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
4. Current-tree source anchors:
   - canonical delivery contract exports: `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - shared delivery port surface: `src/v11/ports/tmuxDelivery.ts`
   - shared launch port exports: `src/v11/ports/tmuxSessions.ts`
   - retained delivery runtime helpers: `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - retained delivery adapter entrypoint: `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - retained launch/session producer: `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - retained launch ack consumer: `src/v11/application/start/startCommandTmuxLaunch.ts`
   - retained meta-review gate defaults: `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - retained workspace authority resolver: `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`
   - retained UI/router consume surface: `src/v11/ports/uiRouter.ts`

## Boundary Summary

| Layer | Source anchors | What it owns now | What it does not own | Disposition |
|---|---|---|---|---|
| Canonical topology-neutral contract | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`, `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/ports/tmuxDelivery.ts`, `src/v11/ports/tmuxSessions.ts` | topologytol fuggetlen delivery ack (`accepted | rejected`) es launch ack (`running | failed_to_start`) jelentese; a delivery/executor seam csak handoff trigger + typed ack consume boundary lehet | `tmux` pane/session naming, prompt acceptance, marker confirmation, workflow state ownership, UI/read-model projection | active, normativ |
| Retained `tmux` adapter | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | pane targeting, session launch, command building, trust-prompt acceptance, marker confirmation, direct `tmux` primitivek | canonical ack truth ujradefiniasa, topology-neutral executor API deklaralasa, bubble lifecycle ownership | retained adapter |
| Retained current consumers | `src/v11/application/start/startCommandTmuxLaunch.ts`, `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`, `src/v11/ports/uiRouter.ts` | fail-closed launch ack consume, retained `tmux` dependency graph, legacy/result-shape consume surface | canonical contract ownership, generic executor taxonomy | retained consumer coupling |
| Runtime session workspace authority | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | runtime session recordbol feloldott read-only adapter input | standalone topology-neutral contractelem vagy jovo executor API kotelezo canonical mezorendszere | preserved adapter input |
| Future executor generalization | nincs current-tree closure proof | majdani non-`tmux` launch/delivery topology, generic executor handshake, consumer migration | barmilyen current-tree canonical allitas evidence nelkul | deferred / successor-owned |

## Closed Baseline Matrix

| Element | Source anchor | Current meaning | Boundary disposition |
|---|---|---|---|
| `TmuxDeliveryAck` + `TmuxDeliveryAckStatus` | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | canonical delivery ack truth: `accepted | rejected` | preserved canonical baseline |
| `LaunchBubbleTmuxSessionAck` + `LaunchBubbleTmuxSessionAckStatus` | `src/v11/ports/tmuxSessions.ts` | canonical launch ack truth: `running | failed_to_start` | preserved canonical baseline |
| `EmitTmuxDeliveryNotificationResult` + `projectTmuxDeliveryAckToLegacyResult(...)` | `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts#projectTmuxDeliveryAckToLegacyResult` | legacy compatibility projection a canonical delivery ackbol | compat-only, retained consumer bridge |
| `assertRunningLaunchAck(...)` | `src/v11/application/start/startCommandTmuxLaunch.ts#assertRunningLaunchAck` | retained downstream consume a shared launch ackra | preserved consumer, nem contract owner |
| marker confirmation / trust prompt / pane targeting | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | `tmux` adapter guard es observability detail | guard-only, nem canonical truth |
| runtime-session-derived workspace authority | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts#resolveRuntimeSessionWorkspaceAuthority`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts#readDeliverySessionContext` | retained adapter input a session recordbol | preserved adapter input, nem generic executor minimum |
| meta-review gate `tmux` primitivek | `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts` | current retained topology dependency | retained consumer coupling, nem canonical contract |

## Current-Tree Coupling Inventory

1. `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - egy helyen hordozza a canonical delivery ack shape-et es a legacy `delivered` projection tipusait;
   - ebbol csak a `status: accepted | rejected` baseline canonical.
2. `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - a runtime session registrybol es a workspace authoritybol olvas adapter inputot;
   - `attemptTmuxDelivery(...)` `tmux` specifikus submit + marker-confirmation guardot futtat;
   - `projectTmuxDeliveryAckToLegacyResult(...)` explicit compatibility bridge a current consume surface fele.
3. `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - a current retained `tmux` delivery adapter entrypointja;
   - pane/session resolutiont es message-buildingt vegez, majd legacy delivery resultot ad vissza.
4. `src/v11/ports/tmuxSessions.ts` es `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - a shared launch ack contract es a retained `tmux` session producer itt talalkozik;
   - a canonical launch truth a shared porton zarult, de a producer tovabbra is `tmux` topology-specifikus.
5. `src/v11/application/start/startCommandTmuxLaunch.ts`
   - retained downstream consumer a shared launch ackra;
   - fail-closed modon csak `running` ackot fogad el, utana a pane-label/session surface tovabbra is `tmux` shape-ben marad.
6. `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - a meta-review gate dependency graph ma kozvetlen `tmux` primitivekre es pane-muveletekre ul;
   - ez retained adapter/consumer coupling, nem topology-neutral executor API.
7. `src/v11/ports/uiRouter.ts`
   - a UI/router felulet tovabbra is az `EmitTmuxDeliveryNotificationResult` compat shape-et fogyasztja;
   - ez explicit bizonyiteka annak, hogy a current-tree consumer csalad meg nem valt le a retained `tmux` vocabularyrol.

## Canonical Contract Clauses

1. A topology-neutral delivery/executor contract current-tree szinten csak azt ownershipolja, ami topologytol fuggetlenul mar bizonyitott:
   - a delivery ack truth `accepted | rejected`,
   - a launch ack truth `running | failed_to_start`,
   - es hogy ezek a statuszok nem nevezhetok at puszta `tmux` implementation detaille.
2. A delivery/executor boundary nem birtokol bubble lifecycle, workflow state, approval policy vagy read-model ownershipot.
3. A `tmux` pane/session/prompt/marker vocabulary retained adapter- es observability-surface marad:
   - hasznalhato implementacios bizonyitekkent a current adapterben,
   - de nem emelheto topology-neutral canonical truth-va.
4. A shared/public delivery rejection taxonomy, ha megjelenik a canonical boundaryn, topology-neutral marad:
   - `command_failed` jellegu token megengedett,
   - topology-specifikus elnevezes (peldaul `tmux_*`) nem lehet canonical failure-reason truth.
5. A runtime session workspace authority megengedett retained adapter input:
   - a current `tmux` adapter innen olvashatja a workspace authorityt,
   - de ettol ez meg nem lesz a jovobeli topology-neutral executor contract kotelezo canonical mezoje.
6. A current consumer coupling explicit marad:
   - legacy `delivered` projection,
   - start launch ack consume,
   - meta-review gate `tmux` dependency graph,
   - UI/router retained result shape.

## Explicit Deferred / Successor-Owned Elements

1. Nincs current-tree proof generic executor capability registryre vagy topology-neutral command/launch handshake-re.
2. Nincs current-tree proof arra, hogy a runtime session workspace authority a jovobeli non-`tmux` topology kotelezo inputja lenne.
3. Nincs current-tree proof arra, hogy a meta-review gate `tmux` primitivejei kozos executor contractta altalanosithatok.
4. Nincs current-tree proof arra, hogy a UI/router consume surface levalthato a legacy `EmitTmuxDeliveryNotificationResult` shape-rol ebben a lane-ben.
5. Ezeket a pontokat future implementation tasknak kell ownershipolnia explicit parity- es replacement-proof mellett.

## Replacement-Proof Rules

1. Barmely jovobeli task, amely a legacy `delivered` projectiont lecsereli, explicit parity evidence-t kell adjon a canonical typed ack mellett.
2. Barmely jovobeli task, amely a start launch ack consumer pathot vagy `assertRunningLaunchAck(...)` retained szerepet megvaltoztatja, explicit shared-launch-ack parity proofot kell adjon.
3. Barmely jovobeli task, amely a meta-review gate `tmux` dependency graphjat topology-neutral executor surface-re cserelne, kulon consumer migration closure-t kell allitson, nem csak contract rename-et.
4. Barmely jovobeli task, amely a runtime session workspace authorityt canonical generic executor fieldde akarja tenni, source-anchored replacement proof nelkul nem claimelhet closure-t.

## Sequencing Consequences

1. Az `O2-T1` ezzel lezarta a contract-nevesitest, de nem ownershipolja:
   - a delivery producer rewrite-ot,
   - a launch producer rewrite-ot,
   - a consumer migrationt,
   - vagy a workflow/read-model topology semlegesitest.
2. A kesobbi implementation lane-ek szetvalaszthatok legalabb ket iranyra:
   - message-delivery adapter generalizacio,
   - launch/executor boundary generalizacio.
3. Az `O3-T1` onboarding simplification csak az `O1` kernel note-ra es erre az `O2-T1` note-ra epulhet:
   - nem moshatja ossze az onboarding vocabularyt a retained `tmux` adapter vocabularyval.
