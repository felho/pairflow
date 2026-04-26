---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity3_task4a_residual_role_topology_consume_closeout_v1
title: "Actor Runtime Interface Opportunity 3 Task 4a: Residual Role/Topology Consume Closeout"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/application/watchdog/watchdogPaneActivitySampler.ts
  - src/v11/application/watchdog/watchdogPaneActivityMonitoring.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/agent/converged.test.ts
  - tests/v11/application/converged/runConvergedFlow.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts
  - tests/v11/application/watchdog/watchdogCommandApi.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 3 Task 4a: Residual Role/Topology Consume Closeout

## Current Codebase Check (2026-04-26)

1. Az `O3-T3` lezarta a canonical `topology_slot_id -> pane_index` truthot:
   - `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
   - `topologySlotCatalog`
   - `getTopologySlotPaneIndexForRole(...)`
2. Az `O3-T4` lezarta a canonical `role -> configured agent` truthot:
   - `src/types/bubble.ts::resolveConfiguredAgentForRole`
   - `BubbleAgentsConfig.agents.meta_reviewer`
   - az in-scope workflow/internal consume csalad explicit replacement proof mellett erre allt at
3. Ennek ellenere a current tree-ben maradt egy szuk residual seam, ahol a role/topology consume meg mindig kezi, special-case feloldast hasznal.
4. A workflow-orchestration familyben ez a residual a delivery-target consume korul latszik:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - itt a pane index mar projection-driven, de a recipient -> recipientRole feloldas meg mindig kezi `bubbleConfig.agents.implementer` / `bubbleConfig.agents.reviewer` comparison es `meta-reviewer` special-case alapjan tortenik
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` ezt a recipient-role truthot tovabbadja a delivery message compose-nak es a retry pathnak
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` a recipientRole alapjan kulon workflow-action szoveget epit
   - `src/v11/application/converged/convergedGateDelivery.ts` metadata-hiany eseten ugyanugy `recipient -> DeliveryTargetRole` fallback consume-ot ownershipol a converged gate delivery lane-ben
5. Az `internal_execution_consumers` bucketben kulon residual consume maradt:
   - `src/v11/application/watchdog/watchdogPaneActivitySampler.ts` role-switch alapjan valaszt pane-t
6. A `cleanup_recovery_consumers` bucketben kulon residual consume maradt:
   - `src/v11/application/watchdog/watchdogPaneActivityMonitoring.ts` nyers `1 | 2 | 3` pane index literalokra epitett expected-target projectiont hasznal
7. Ez nem csak esztetikai duplikacio:
   - a delivery familyben a normal delivery, a retry path es a converged fallback ugyanannak a canonical role/config + role/topology projection truthnak kulon consume-olvasatai
   - a watchdog sampler ugyanennek a topology truthnak kulon internal-execution consume-ja
   - a watchdog monitoring/resample path ugyanennek a topology truthnak kulon cleanup/recovery consume-ja
   - emiatt a residual gap ugyanazon bounded consume-family closeouttal zarhato le
8. Emiatt a current residual gap nem producer closure, nem public protocol/CLI bovites, es nem config-shape munka:
   - ez egy szuk `Opportunity 3` residual consume-closeout slice a workflow-orchestration, internal-execution es cleanup/recovery consume csaladban

## L0 - Policy

### Goal

1. A megmaradt role/topology consume-seamek lezárása ugyanarra a canonical truthra, amelyet az `O3-T3` es `O3-T4` mar bevezetett.
2. A delivery oldalon a recipient -> recipientRole -> pane target feloldas ne maradjon kezi, kulon consume-truth.
3. Az `internal_execution_consumers` bucketben a watchdog sampling target, a `cleanup_recovery_consumers` bucketben pedig a watchdog expected-target pane ugyanabbol a canonical topology projectionbol jojjon, nyers pane literálok nelkul.
4. Ne csusszon ebbe a taskba:
   - public CLI/protocol surface nyitasa,
   - uj role vagy uj output kind,
   - config parser/render shape modositas,
   - tmux launch/layout vagy meta-review gate topology ujranyitasa.

### Domain / Control Model Summary

1. Business invariant:
   - az `Opportunity 3` celja szerint a role-hoz kotott belso onboarding/extension surface ne szivarogjon szet kulon consume-truthokba;
   - ugyanazon workflow truthhoz ne maradjon kulon kezi recipient-role vagy pane-target visszafejtes.
2. Control model:
   - a canonical role -> configured agent truth az `O3-T4` utan a bubble config projection;
   - a canonical role -> topology slot -> pane truth az `O3-T3` utan a topology projection;
   - a delivery es watchdog consume csak ezek projectionjeit hasznalhatja, nem sajat alternativ truthot;
   - a converged gate delivery fallback consume ugyanebbe a canonical role/config projection-lancba tartozik, nem kulon converged-only role truth;
   - a delivery canonical mutation pathon az explicit `recipientRole` / `DeliveryTargetRole` marad az elsodleges role-truth; az `envelope.recipient` agent-identitas csak compat/projection input lehet, nem meta-reviewer role-guess authority.
3. Read-path rule:
   - explicit delivery target metadata absent/invalid/unmapped viselkedese preserved marad;
   - a watchdog expected target pane projectionja ugyanarra a canonical slot-truthra ul, mint a sampling path.
4. Forbidden fallback:
   - uj, kezi role-guess branch a delivery pathban;
   - nyers `1 | 2 | 3` pane literal visszaemelese watchdog canonical truthra;
   - public role/output vocabulary modositas `residual cleanup` cimszo alatt.
5. Allowed resolution path:
   - a szuk consume-family atall ugyanarra a meglevo canonical projection truthra;
   - a delivery oldalon ahol a call-site mar explicit `recipientRole`-t ad (`EmitDeliveryNotificationInput`), az maradjon a canonical role-truth;
   - retained human-facing label (`meta-reviewer`) vagy protocol-target vocabulary megmaradhat projection/compat szerepben, ha mar nem authorol kulon workflow truthot.
6. Missing-data rule:
   - undefined/unmapped delivery target tovabbra is fail-closed marad;
   - watchdog missing session vagy pane unreadable esetben nincs synthetic success, a mai fail-closed behavior preserved marad.

### Plan Linkage

1. Parent plan gap:
   - az `O3-T3` es `O3-T4` utan a current tree-ben maradt egy kesoi felfedezesu residual consume seam a delivery, converged es watchdog familyben.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task3-topology-slot-catalog-and-tmux-consumer-alignment.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task4-config-bound-role-resolution-alignment.md`
3. Unlocks / impacts successors:
   - az `Opportunity 3` lane current-tree closeout claimja tobbet nem ezen a residual consume seamen mulik
   - a public CLI/protocol triggerelt successor (`O3-T5`) tovabbra is kulon marad
4. Task-list impact:
   - ez uj bounded residual closeout task
   - nem replacementje az archived `O3-T3` vagy `O3-T4` slice-nak
   - nem foglalja el az `O3-T5` triggerelt public-surface slice helyet

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md`
   - `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
   - `src/types/bubble.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
   - `src/v11/application/watchdog/watchdogPaneActivitySampler.ts`
   - `src/v11/application/watchdog/watchdogPaneActivityMonitoring.ts`
2. Canonical elements:
   - `topologySlotCatalog`
   - `getTopologySlotPaneIndexForRole(...)`
   - `resolveConfiguredAgentForRole(...)`
   - `BubbleAgentsConfig`
3. Residual/compat elements:
   - recipient string -> role kezi comparison a delivery pathban
   - `"meta-reviewer"` human-facing label
   - raw `1 | 2 | 3` watchdog pane literals
4. Forbidden reinterpretations:
   - a `ProtocolParticipant` zart vocabulary nem bovitheto ebben a slice-ban;
   - az `ActorOutputKind` vagy `DeliveryTargetRole` public union nem modosithato;
   - a dedicated-panel-per-active-role baseline nem lazithato shared/status fallback iranyba.
5. `drift_status`: `residual_gap_discovered_after_o3_t3_and_o3_t4_closeout`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
   - `src/v11/application/watchdog/watchdogPaneActivitySampler.ts`
   - `src/v11/application/watchdog/watchdogPaneActivityMonitoring.ts`
   - adjacent canonical-delivery call-sites:
     - `src/v11/application/pass/normalPassDeliveryExecution.ts`
     - `src/v11/application/reply/replyCommandApi.ts`
     - `src/v11/application/approval/runApprovalDecisionEffects.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/agent/converged.test.ts`
   - `tests/v11/application/converged/runConvergedFlow.test.ts`
   - `tests/core/runtime/watchdog.test.ts`
   - `tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts`
   - `tests/v11/application/watchdog/watchdogCommandApi.test.ts`
2. Actual touched scope:
   - primary bounded-task shape: `consumer_family_alignment`
   - justified secondary shape: `fail_closed_hardening`
3. Producer behavior touched:
   - `no`
4. Read-model/public surface touched:
   - `no`
5. Why the declared shape matches reality:
   - ugyanaz a mar lezart canonical role/topology truth sugarzik a megmaradt workflow-orchestration, internal-execution es cleanup/recovery consume-familykbe;
   - a residual nem igenyel producer, config, vagy public protocol ujranyitast;
   - a delivery targeting, a `tmuxDelivery.ts::retryStuckAgentInput(...)` retry path es a converged fallback delivery consume ugyanannak a workflow-orchestration residualnak a szetszorodott fogyasztoi;
   - a watchdog sampler kulon `internal_execution_consumers` consume, a watchdog monitoring pedig kulon `cleanup_recovery_consumers` consume, de mindketto ugyanarra a canonical topology truthra kell visszaalljon;
   - a `fail_closed_hardening` secondary shape csak annyiban justified, hogy sem a `workflow_orchestration_consumers` retry/fallback consume-ja, sem az `internal_execution_consumers` sampler consume-ja, sem a `cleanup_recovery_consumers` monitoring/recovery consume-ja nem tarthat fenn synthetic pane guess vagy synthetic success utat; ez nem nyit uj coordination vagy rollout lane-t;
   - az adjacent delivery mutation call-site-ok mar ma is explicit `recipientRole`-t adnak a canonical write pathon, a converged gate pedig metadata-hiany eseten sajat fallback consume-ot ownershipol; emiatt a task local refinementtel lezarhato, de a delivery family normal + retry + converged consume-jat ugyanarra a canonical role/config projection truthra kell visszahuzni public contract vagy producer sequence ujranyitas nelkul.

### Complexity-Risk Triage

1. `authority_risk`: `1`
   - nem uj authority-forras jon be, hanem a mar lezart role/config es role/topology canonical truth sugarzik tovabb residual consume-familybe.
2. `surface_spread`: `2`
   - a `workflow_orchestration_consumers`, `internal_execution_consumers` es `cleanup_recovery_consumers` bucket egyszerre erintett, kulon tesztcsaladokkal.
3. `identity_join_risk`: `2`
   - recipient -> configured agent -> workflow role es active role -> pane target join marad in-scope; a task pont ezek consume-truthjat zarja ossze.
4. `activation_coupling`: `0`
   - nincs uj activation, read-model vagy public surface.
5. `prerequisite_risk`: `1`
   - `O3-T3` topology projection es `O3-T4` config-bound role truth explicit elo-feltetel.
6. `acceptance_multiplicity`: `1`
   - kulon proof kell a delivery targeting/retry es a watchdog sampling/monitoring oldalon.
7. `risk_score`: `6`
8. Split decision:
   - a touched consume pontok ugyanannak a residual role/topology truthnak a workflow-orchestration, internal-execution es cleanup/recovery oldalai;
   - kulon task csak akkor kellene, ha producer/config/public surface is mozogna;
   - emiatt az `O3-T4a` egy taskkent megtarthato.

### Authority Fan-out Scan

1. `authority_producer`
   - predecessor-owned; ebben a slice-ban nem valtozik
2. `shared_contract`
   - csak akkor erintett, ha a narrowest safe fixhez uj projection helper kell; ez nem lehet onallo task-shape driver
3. `internal_execution_consumers`
   - watchdog pane sampling target consume
4. `workflow_orchestration_consumers`
   - delivery recipient-role / pane target consume
   - `tmuxDelivery.ts::retryStuckAgentInput(...)` same-authority retry consume
   - converged fallback recipient -> `DeliveryTargetRole` consume
5. `read_model_consumers`
   - explicit out of scope
6. `cleanup_recovery_consumers`
   - watchdog expected-target / resample decision path

### Authority Boundary Map

1. `authority_producer`
   - explicit out of scope
   - canonical producers maradnak:
     - `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
     - `src/types/bubble.ts::resolveConfiguredAgentForRole`
2. `persisted_authority`
   - nincs uj persisted authority vagy schema
3. `internal_execution_consumers`
   - `src/v11/application/watchdog/watchdogPaneActivitySampler.ts`
4. `workflow_orchestration_consumers`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
     - including `retryStuckAgentInput(...)`
   - same-family projection consume: `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
5. `cleanup_recovery_consumers`
   - `src/v11/application/watchdog/watchdogPaneActivityMonitoring.ts`
6. `read_model_consumers`
   - explicit out of scope
7. Export/public surfaces
   - closed in this phase; `src/types/protocol.ts` es `src/cli/commands/agent/emit.ts` nem nyithato ujra

### Closure-Budget Gate

1. Materially touched closure bucketek:
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
2. Miert tarthato ez egy taskban:
   - ugyanarra a mar letezo role/topology projection truthra allnak at;
   - nincs producer closure;
   - nincs read-model/public fallout;
   - nincs kulon compatibility surface removal vagy diagnostics lane.
3. Explicitly deferred closures:
   - `authority_producer`
   - `read_model_consumers`
   - `public protocol/output kind extension` (`O3-T5`)
   - `BubbleAgentsConfig` shape vagy parse/render munka

### Bounded-Task-Shape Gate

1. Primary shape:
   - `consumer_family_alignment`
2. Secondary shape:
   - `fail_closed_hardening`
3. Why this mix is safe:
   - a delivery targeting, retry, watchdog sampling es watchdog monitoring ugyanannak a mar letezo canonical role/config + role/topology projection truthnak a consume oldalai;
   - a secondary `fail_closed_hardening` nem uj retry policyt, lockot, timeoutot vagy side-effect orderinget vezet be, hanem azt koti ki, hogy a recovery consume se tartson fenn kulon truthot vagy synthetic fallbacket;
   - nincs producer closure, persisted authority, read-model vagy public-surface aktivacio ugyanebben a slice-ban.

### Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - canonical recipient-role / pane-target projection legyen feloldhato a meglevo truthbol;
   - retry pathban session lookup, pane lookup, capture-pane es marker-state ellenorzes sikeruljon;
   - watchdog pathban expected-target projection csak ervenyes role-alapu canonical pane truthra uljon.
2. Side effects forbidden before those validations pass:
   - nincs synthetic pane submit;
   - nincs synthetic watchdog target rewrite;
   - nincs fallback pane guess.
3. Invalid/precondition-failure behavior:
   - delivery retry `no_session | no_pane | pane_read_failed | not_stuck` retained fail-closed marad;
   - watchdog monitoring retained resample/no-session/pane-unreadable logikara ul.
4. Coordination primitives:
   - uj lock/mutex/idempotency szabaly nincs ebben a slice-ban;
   - coordination/concurrency hardening explicit out of scope.

## L1 - Implementation Contract

### In Scope

1. `tmuxDeliveryTargeting.ts` recipient -> recipientRole feloldasanak alignmentje ugyanarra a canonical role/config projection truthra.
2. `tmuxDelivery.ts` workflow-orchestration same-family alignmentje annyiban, amennyiben a targeting helper shape vagy retry path ezt megkivanja.
3. `tmuxDeliveryMessageBuilder.ts` same-family alignmentje annyiban, amennyiben a recipientRole projection tipus vagy semantics explicit proofot igenyel.
4. `convergedGateDelivery.ts` metadata-hiany eseti fallback consume alignmentje ugyanarra a canonical role/config projection truthra, mint a tobbi delivery orchestration path.
5. `watchdogPaneActivitySampler.ts` pane target consume alignmentje a canonical topology projectionra.
6. `watchdogPaneActivityMonitoring.ts` expected-target pane projection alignmentje ugyanarra a canonical topology truthra, nyers `1 | 2 | 3` literálok nelkul.
7. Celozott regresszios tesztek a delivery, converged es watchdog consume-familyben.

### Out of Scope

1. `src/types/protocol.ts` vagy `src/cli/commands/agent/emit.ts` public surface modositas.
2. Uj `AgentRole`, uj `DeliveryTargetRole`, vagy uj `ActorOutputKind`.
3. `src/config/bubbleConfig.ts` parse/validate/render munka.
4. `src/v11/application/metaReviewGate/**`, `src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.ts`, `src/v11/infrastructure/channel/tmux/reviewerContext.ts`, `src/v11/infrastructure/channel/tmux/tmuxManager.ts` ujranyitasa, hacsak egy celzott parity test nem koveti a consume-truthot.
5. Tmux launch layout, pane ordering, split ancestry, vagy dedicated-panel baseline modositas.
6. Watchdog status semantics, timeout policy, vagy delivery ack semantics modositas.

### Safety Defaults

1. A canonical topology mapping preserved marad:
   - `status -> 0`
   - `implementer -> 1`
   - `reviewer -> 2`
   - `meta_reviewer -> 3`
2. Az `O3-T4` config-bound role resolution preserved marad; nem nyithato ujra a `meta_reviewer` agent authority.
3. A human-facing `meta-reviewer` label megmaradhat, de nem authorolhat kulon workflow truthot.
4. A retry vagy watchdog path nem talalhat ki fallback pane-t, ha a canonical projection nem ad targetet.

### Target File Contract

1. `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - ownership: workflow-orchestration targeting residual closeout
   - required:
     - az explicit `DeliveryTargetRole` / `recipientRole` tovabbra is canonical elsoseg maradjon, amikor a call-site ezt maradektalanul atadja
     - a fallback recipient -> recipientRole consume ugyanarra a canonical role/config truthra epuljon, mint a pane-target projection
     - az absent/invalid/unmapped `delivery_target_role` reason-code behavior preserved maradjon
   - forbidden:
     - `meta_reviewer` role visszakovetkeztetese pusztan megosztott `ProtocolParticipant` agent-identitasbol
     - uj best-effort role guess ladder
2. `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - ownership: targeting consume same-family propagation
   - required:
     - a retry path es delivery message compose ugyanazt a canonical targeting truthot fogyassza
     - a canonical mutation pathon az explicit `recipientRole` ne degradalodjon `envelope.recipient`-alapu role-authorityra
   - forbidden:
     - kulon retry-only pane mapping truth
3. `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
   - ownership: delivery recipient-role projection consume
   - required:
     - ha tipus- vagy naming-igazitast kap, az csak projection/compat szintu lehet
   - forbidden:
     - workflow-role truth ujraauthorolasa human-facing label layerben
4. `src/v11/application/converged/convergedGateDelivery.ts`
   - ownership: converged fallback delivery-target consume closeout
   - required:
     - metadata-hiany eseten a fallback recipient -> `DeliveryTargetRole` consume ugyanarra a canonical role/config truthra epuljon, mint a tobbi delivery orchestration path
     - ahol explicit `recipientRole` metadata mar jelen van, az tovabbra is elsobbseget elvezo canonical role-truth maradjon
   - forbidden:
     - converged-only special-case role ladder
     - fallback `status` routing workflow role-ra pusztan shared agent-identitas miatt
5. `src/v11/application/watchdog/watchdogPaneActivitySampler.ts`
   - ownership: sampling target pane consume
   - required:
     - a pane index role-projection alapon jojjon
   - forbidden:
     - role-switchben eltetett masodik canonical mapping
6. `src/v11/application/watchdog/watchdogPaneActivityMonitoring.ts`
   - ownership: expected-target pane projection consume
   - required:
     - ne maradjon nyers `1 | 2 | 3` pane literal truth
     - az expected-target pane ugyanabbrol a canonical topology projectionrol jojjon, mint a sampler targetje
   - forbidden:
     - synthetic fallback pane

### Validation Contract

1. Mandatory checks:
   - `pnpm build`
   - `pnpm typecheck`
2. Mandatory targeted tests:
   - `pnpm test -- --runInBand tests/core/runtime/tmuxDelivery.test.ts`
     - ez ownershipolja a normal delivery targeting + retry/stuck-input same-target-truth parity proofot
   - `pnpm test -- --runInBand tests/core/agent/converged.test.ts`
   - `pnpm test -- --runInBand tests/v11/application/converged/runConvergedFlow.test.ts`
   - `pnpm test -- --runInBand tests/core/runtime/watchdog.test.ts`
   - `pnpm test -- --runInBand tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts`
   - `pnpm test -- --runInBand tests/v11/application/watchdog/watchdogCommandApi.test.ts`
3. If adjacent regression appears:
   - a narrowest same-family parity testet kell frissiteni
   - tilos a taskot public protocol vagy config scope fele szelesiteni csak a suite zolditese miatt

## L2 - Acceptance / Test Matrix

### Positive Proof

1. Delivery fallback targeting tovabbra is ugyanoda mutat:
   - `bubbleConfig.agents.implementer` recipient -> implementer pane
   - `bubbleConfig.agents.reviewer` recipient -> reviewer pane
   - `meta-reviewer` recipient -> meta-reviewer pane
   - `human` es `orchestrator` -> status pane
2. A delivery message recipientRole projection azonos canonical truthra ul:
   - implementer feedback tovabbra is implementer actiont kap
   - reviewer handoff tovabbra is reviewer actiont kap
   - meta-review routing tovabbra is meta-reviewer actiont kap
   - explicit `recipientRole` / `delivery_target_role` tovabbra is elsobbseget elvez akkor is, ha a recipient agent-identitas egy masik role-lal megosztott
3. Explicit `delivery_target_role` metadata absent/invalid/unmapped eseten a mai reason-code viselkedes retained marad.
4. A converged fallback delivery consume ugyanarra a canonical role/config projectionra ul, mint a tobbi delivery targeting path.
5. A delivery retry/stuck-input path ugyanazt a canonical pane-target truthot hasznalja, mint a normal delivery targeting.
6. A watchdog sampler a 3 workflow-role eseten a canonical topology projectionbol kepzi a `target_pane` erteket.
7. A watchdog monitoring expected-target projectionja ugyanazt a canonical pane-target truthot hasznalja, mint a sampler.

### Negative Proof

1. Undefined/unmapped delivery target tovabbra is fail-closed; nincs silent pane guess.
2. Watchdog missing session vagy pane unreadable retained fail-closed marad.
3. A `cleanup_recovery_consumers` monitoring/resample path nem vezethet be `status` vagy mas shared pane fallbacket workflow role-oknak.
4. Public role/output vocabulary nem valtozik.
5. A fallback recipient consume nem kovetkeztethet `meta_reviewer` workflow truthra pusztan `ProtocolParticipant` agentnevbol.

### Baseline / Non-Regression Proof

1. `O3-T3` topology slot baseline erintetlen marad:
   - nincs uj pane ordering drift
   - nincs launch/layout reopen
2. `O3-T4` config-bound role resolution erintetlen marad:
   - nincs config parser/render drift
   - nincs `meta_reviewer` authority reinterpretacio
3. `O3-T5` tovabbra is triggerelt public-surface slice marad:
   - ez a task nem foglalja el a helyet
   - nem nyit public CLI/protocol kovetelmenyt

### Completion Signal

1. A task akkor tekintheto kesznek, ha:
   - a `workflow_orchestration_consumers` bucketben a delivery family (`tmuxDeliveryTargeting`, `tmuxDelivery`, `tmuxDeliveryMessageBuilder`) normal + retry consume-ja, valamint a converged fallback consume mar nem authorol kulon recipient-role / delivery-target / pane-target truthot,
   - az `internal_execution_consumers` bucketben a `watchdogPaneActivitySampler.ts` mar a canonical topology projectionbol kepzi a target pane-t,
   - a `cleanup_recovery_consumers` bucketben a `watchdogPaneActivityMonitoring.ts` mar nem authorol kulon pane-literal truthot,
   - es mindharom materially touched closure bucket ugyanarra a mar letezo canonical role/topology projectionre ul.
2. A task nem tekintheto kesznek, ha:
   - a fix csak a `workflow_orchestration_consumers`, csak az `internal_execution_consumers`, vagy csak a `cleanup_recovery_consumers` bucketet zarja le,
   - vagy a converged fallback consume-ban megmarad egy masodik hardcoded role truth,
   - vagy barmelyik masik familyben megmarad egy masodik hardcoded role/pane truth.

## Hardening Backlog

1. `later-hardening`: ha a canonical projection consume a workflow-orchestration, internal-execution es cleanup/recovery family utan tovabbi retained recovery pathokban is megmarad, kesobbi audit nyithato a teljes cleanup/recovery familyre.
