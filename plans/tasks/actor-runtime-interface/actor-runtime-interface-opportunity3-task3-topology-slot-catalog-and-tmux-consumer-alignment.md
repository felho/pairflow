---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity3_task3_topology_slot_catalog_and_tmux_consumer_alignment_v1
title: "Actor Runtime Interface Opportunity 3 Task 3: Topology Slot Catalog and Tmux Consumer Alignment"
status: draft
phase: post-phaseE
target_files:
  - src/v11/application/actorProtocol/roleDescriptorRegistry.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/infrastructure/channel/tmux/tmuxManagerSessionLayout.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts
  - src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts
  - src/v11/shared/ports/tmuxSessions.ts
  - src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.ts
  - src/v11/infrastructure/channel/tmux/reviewerContext.ts
  - tests/core/runtime/tmuxManager.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/core/runtime/reviewerContext.test.ts
  - tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 3 Task 3: Topology Slot Catalog and Tmux Consumer Alignment

## Current Codebase Check (2026-04-26)

1. Az `O3-T2` implementation bubble lezart es `main`-re merge-olt:
   - archived task artifact: `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task2-internal-role-capability-foundation.md`
   - a current tree mar tartalmazza a belso `RoleDescriptor` registry seamet a `src/v11/application/actorProtocol/roleDescriptorRegistry.ts` alatt.
2. Az `O3-T2` current tree mar lockolja role-szinten a `topology_slot_id` mezot:
   - `implementer -> "implementer"`
   - `reviewer -> "reviewer"`
   - `meta_reviewer -> "meta_reviewer"`
   - de ehhez ma meg nincs kulon kod-szintu `topologySlotCatalog` projection/helper family.
3. Az `O3-T1` note es a parent plan szerint az `O3-T3` pontos closure-ja:
   - `consumer_family_alignment`
   - S2 (`topology slot`) atkotese a registry-re
   - `topologySlotCatalog` kod-szintu bevezetese
   - `tmuxManager.ts::runtimePaneIndices` es `tmuxDeliveryTargeting.ts` registry-olvasasra allitasa
   - topology-neutral delivery/executor closure (`O2-T13`) ujranyitasa nelkul.
4. A current tree-ben a pane-slot truth ma szetszorva jelenik meg:
   - canonical-looking runtime literal: `src/v11/infrastructure/channel/tmux/tmuxManager.ts::runtimePaneIndices`
   - launch layout topology truth: `src/v11/infrastructure/channel/tmux/tmuxManagerSessionLayout.ts`
   - duplicate compat literal: `src/v11/shared/ports/tmuxSessions.ts::runtimePaneIndices`
   - direct tmux consume: `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - direct application gate consume: `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts::bindStart.record.metaReviewerPane?.paneIndex ?? 3`
   - direct tmux consume: `src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.ts`
   - direct tmux consume: `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
5. A must-preserve baseline ma explicit:
   - `status=0`
   - `implementer=1`
   - `reviewer=2`
   - `meta_reviewer=3`
   - dedikalt pane per active role baseline retained marad; a meta-reviewer nem oszthatja a status vagy implementer pane-t.

## L0 - Policy

### Goal

1. Formalizaljuk kod szinten a `topologySlotCatalog` internal registry-catalogot az `O3-T1` note naming proposalja szerint.
2. Kossuk at az S2 topology-slot consumereket registry/projection helper olvasasra ugy, hogy a jelenlegi pane-index baseline valtozatlan maradjon.
3. Tuntessuk el a canonicalnak tuno, de duplikalt literal truthot a tmux runtime consume csaladbol ugy, hogy retained compat projection csak olvassa a kanonikus catalogot, ne authorolja ujra.
4. Ne nyissuk ujra a topology-neutral delivery, launch ack, config binding vagy public protocol closure-t.

### Domain / Control Model Summary

1. Business invariant:
   - a runtime core tovabbra sem birtokol workflow-state vagy bubble-authority progressiont;
   - a topology slot belso tmux runtime concern, nem uj public contract;
   - a dedicated-panel-per-active-role baseline preserved marad.
2. Control model:
   - role -> `topology_slot_id` truth mar a `RoleDescriptor` registryben van;
   - `topology_slot_id` -> `pane_index` truth az `O3-T3` utan egy zart `topologySlotCatalog` lesz;
   - a tmux consumer family projection helperen keresztul olvas, nem sajat literal mapet authorol.
3. Read-path rule:
   - az `O3-T1` note exact naming proposalja es a current-tree baseline pane-index mapping a normativ input;
   - az `O3-T3` ezt kod-szinten formalizalja, nem uj topology-shape brainstormingkent kezeli.
4. Forbidden fallback:
   - tilos uj pane-indexet bubble configbol, recipient string-osszehasonlitasbol vagy opportunista tmux metadata-bol "kitalalni";
   - tilos a `meta_reviewer` slotot shared pane fallbackre visszacsusztatni;
   - tilos a topology-neutral `delivery`/`launch` contract terminologiajat vagy ack semantics-et ujranyitni;
   - tilos az `O3-T3` cimke alatt `BubbleAgentsConfig`, `ActorOutputKind`, CLI vagy protocol shape modositast behuzni.
5. Allowed resolution path:
   - internal typed `TopologySlotDescriptor`/`topologySlotCatalog` bevezetese;
   - projection helper(ek) bevezetese a registry seam kornyeken;
   - retained `runtimePaneIndices` export megtartasa csak akkor, ha mar registry/catalogbol szarmaztatott compat projection lesz, nem duplikalt truth.
6. Missing-data rule:
   - ha barmely current-tree tmux consumer nem rendelheto a 4 zart slot egyikere (`status`, `implementer`, `reviewer`, `meta_reviewer`), a task nincs keszen;
   - ilyenkor docs/plan clarification kell, nem ad-hoc otodik slot vagy implicit fallback.
7. Phase boundary:
   - this task owns: S2 topology-slot consume family alignment;
   - explicit predecessor: `O3-T2` belso role registry foundation;
   - explicit successor: `O3-T4` config binding alignment;
   - explicit successor: `O3-T5` public protocol/output-kind nyitas trigger-feltetellel.

### Plan Linkage

1. Parent plan source:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Normative predecessor:
   - `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task2-internal-role-capability-foundation.md`
3. This task closes:
   - `Opportunity 3 / O3-T3`
4. Depends on:
   - `O3-T2` merged es archived
   - `O1-T1` kernel boundary baseline preserved
   - `O2-T13` topology-neutral delivery/launch closure preserved
5. Unlocks:
   - `O3-T4` config-bound role resolution alignment
   - optional `O3-T5` public onboarding/output-kind extension, csak trigger eseten

### Canonical Contract Anchors

1. Docs/source anchors:
   - `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task2-internal-role-capability-foundation.md`
2. Current code anchors:
   - `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.ts`
   - `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
3. Canonical elements consumed here:
   - `RoleDescriptor.topology_slot_id`
   - `TopologySlotId`
   - dedicated-panel-per-active-role baseline
   - `status=0`, `implementer=1`, `reviewer=2`, `meta_reviewer=3`

### Scope Reality / Shape Proof

1. Declared task shape:
   - primary: `consumer_family_alignment`
2. Miert ez a helyes shape:
   - a producer/foundation closure mar `O3-T2`-ben megtortent;
   - az `O3-T3` fo munkaja a meglevo registry truth consume-family alignmentja a retained tmux runtime/orchestration oldalon;
   - nincs uj config schema, public protocol vagy read-model cutover.
3. Mutation entrypoints / consume points:
   - `tmuxManager.ts::runtimePaneIndices`
   - `tmuxManagerSessionLayout.ts` pane split ordering es ancestry
   - `tmuxDeliveryTargeting.ts::resolveTargetPaneIndex`
   - `tmuxDeliveryTargeting.ts::resolveEnvelopeTargetPane`
   - `metaReviewGatePaneBinding.ts` meta-reviewer pane respawn target selection
   - `metaReviewerPaneBinding.ts`
   - `reviewerContext.ts`
   - retained compat export: `shared/ports/tmuxSessions.ts::runtimePaneIndices`
4. Hidden scope ruled out:
   - `src/config/bubbleConfig.ts` es `src/types/bubble.ts` config shape nem `O3-T3`
   - `src/types/protocol.ts` es `src/cli/commands/agent/emit.ts` public surface nem `O3-T3`
   - prompt concern compose, awaited output lookup es role authority policy matrix nem `O3-T3`
   - launch/delivery ack status semantics nem `O3-T3`
5. Reality note:
   - a plan csak `tmuxManager.ts` es `tmuxDeliveryTargeting.ts` consume-atkotest nevez meg expliciten, de a current tree-ben a launch topology truth a `tmuxManagerSessionLayout.ts` split ancestryjeben is el, es a pane-index truthet tovabbi retained tmux consumerek is olvassak;
   - az application-level meta-review gate pane binding path is egy ilyen adjacent consumer, mert sajat hardcoded fallback pane truthot tart fenn a respawn target kepzesnel;
   - emiatt a tasknak ezeket legalabb inventory szinten le kell fednie, kulonben a bounded slice hamis lenne.

### Complexity-Risk Triage

1. `authority_risk`: `1`
   - internal runtime slot truth canonicalizalodik, de public authority contract nem valtozik.
2. `surface_spread`: `2`
   - a bounded slice tobb, egymashoz kozeli tmux/runtime consume file-csaladot erint.
3. `identity_join_risk`: `1`
   - recipient/role -> slot -> pane index join explicitte valik, de nincs uj public identity vocabulary.
4. `activation_coupling`: `0`
   - nincs uj activation vagy read-model surface.
5. `prerequisite_risk`: `1`
   - az `O3-T2` role registry es a `topology_slot_id` exact mapping elo-feltetel.
6. `acceptance_multiplicity`: `1`
   - tobb preserved baseline proof kell:
     - tmux launch pane ordering
     - delivery pane targeting
     - meta-reviewer pane binding
     - reviewer context respawn
7. `risk_score`: `5`
8. Split decision:
   - a current tree alapjan a consume family ugyanazon internal tmux/runtime authority-lanc resze;
   - kulon task csak akkor kellene, ha public/shared contract alignment vagy config schema valtozas is bejonne;
   - emiatt az `O3-T3` egy taskkent megtarthato.

### Closure-Budget Triage

1. Materially touched closure bucketek:
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - szukitett `shared_contract` compat projection
2. `internal_execution_consumers`
   - `tmuxManager.ts`
   - `metaReviewerPaneBinding.ts`
   - `reviewerContext.ts`
3. `workflow_orchestration_consumers`
   - `tmuxDeliveryTargeting.ts`
4. Szukitett `shared_contract` compat projection:
   - `shared/ports/tmuxSessions.ts::runtimePaneIndices` retained export, ha marad
5. Miert safe ez a collapse:
   - ugyanaz a topology slot truth zarja oket;
   - ugyanazt a 4-slot baseline-t vedik;
   - nincs public contract drift vagy schema migration.
6. Explicitly deferred closures:
   - `shared_contract` config schema override (`O3-T4`)
   - `read_model_consumers`
   - `persisted_authority_or_schema`
   - `cleanup_recovery_consumers`
   - public protocol/output-kind extension (`O3-T5`)

### Authority Boundary Map

1. `shared_contract`
   - `TopologySlotId`
   - `TopologySlotDescriptor`
   - `topologySlotCatalog`
   - topology projection helper API
2. `internal_execution_consumers`
   - tmux launch layout split topology
   - tmux launch/session runtime pane assignment
   - reviewer respawn pane targeting
   - meta-reviewer pane binding collision guard
3. `workflow_orchestration_consumers`
   - envelope delivery target -> target pane resolution
   - meta-review gate pane respawn/submit orchestration target resolution
4. `read_model_consumers`
   - explicit out of scope
5. `cleanup_recovery_consumers`
   - explicit out of scope

### Baseline Preservation

1. Must-preserve viselkedesek:
   - `status -> 0`
   - `implementer -> 1`
   - `reviewer -> 2`
   - `meta_reviewer -> 3`
   - launch layout split ancestry retained marad:
     - implementer split target = status pane
     - reviewer split target = implementer pane
     - meta-reviewer split target = reviewer pane
   - `human` es `orchestrator` tovabbra is a `status` pane-re mennek
   - `bubbleConfig.agents.implementer` recipient tovabbra is az implementer pane-re megy
   - `bubbleConfig.agents.reviewer` recipient tovabbra is a reviewer pane-re megy
   - explicit `meta_reviewer` delivery target tovabbra is a meta-reviewer pane-re megy
2. Preserved guards:
   - shared runtime pane collision tovabbra is fail-closed marad `metaReviewerPaneBinding.ts` alatt
   - undefined/unmapped pane tovabbra sem valhat "best effort" fallbackpane-ne
3. Forbidden regressziok:
   - uj, duplikalt `runtimePaneIndices` literal truth nem maradhat bent kanonikus forraskent;
   - a `tmuxManagerSessionLayout.ts` path nem tarthat meg olyan implicit launch topology truthot, amelyet az `O3-T3` task nem inventory-z es nem ved parity proof-fal;
   - a `metaReviewGatePaneBinding.ts` path nem tarthat meg sajat `metaReviewerPane?.paneIndex ?? 3` fallback truthot, ha az `O3-T3` claim szerint a canonical pane mapping mar registry/catalog-derived;
   - a registry-driven consume miatt nem lazulhat a dedicated-panel baseline;
   - a retained compat export nem valhat masodik truth source-sza.

### In Scope

1. `topologySlotCatalog` kod-szintu bevezetese a belso role/slot registry seam mellett vagy annak kozvetlen kozeleben.
2. Projection helper(ek) bevezetese a slot/pane index olvasashoz.
3. `tmuxManager.ts` atallitasa registry/catalogbol szarmaztatott pane-index truthra.
4. `tmuxDeliveryTargeting.ts` atallitasa ugyanarra a projection helperre.
5. `metaReviewerPaneBinding.ts` es `reviewerContext.ts` alignmentje ugyanarra a projection truthra.
6. `shared/ports/tmuxSessions.ts` retained compat export alignmentje, ha a current tree-ben tovabbra is szukseges.
7. Celozott parity/regression tesztek a tmux consume csaladban.

### Out of Scope

1. `BubbleAgentsConfig` shape vagy `agent_resolution` migration (`O3-T4`).
2. `ActorOutputKind`, `ActorEmitInput`, CLI parser vagy protocol union bovitese (`O3-T5`).
3. Prompt concern registry/prompt compose tovabbi refaktorja (`O3-T2` mar lezart).
4. Uj topology slot, shared pane mode, conditional pane visibility vagy pane multiplexing.
5. Delivery ack/launch ack status semantics modositas.
6. Meta-reviewer agent hardcoded/config-bound resolution valtoztatasa.

## L1 - Implementation Contract

### Target File Contract

1. `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
   - ownership: S2 internal topology-slot registry/projection helper surface
   - required:
     - `TopologySlotDescriptor` exact typed shape
     - `topologySlotCatalog` zart 4-entry mapping
     - helper a role -> slot projectionhoz
     - helper a slot -> pane index projectionhoz
   - forbidden:
     - role registry mezohalmaz ujranyitasa az `O3-T1` note-on tul
     - config-bound agent resolution vagy prompt concern ownership modositas
2. `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - ownership: retained launch/session pane index consume
   - required:
     - a canonical pane-index truth ne local literal legyen
     - ha `runtimePaneIndices` export megmarad, az derived/compat projection legyen
   - forbidden:
     - status/implementer/reviewer/meta-reviewer ordering megvaltoztatasa
3. `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - ownership: workflow-orchestration pane targeting consume
   - required:
     - recipient role -> pane index feloldas projection helperen menjen
     - jelenlegi absent/invalid/unmapped reason-code behavior preserved maradjon
   - forbidden:
     - fallback role guesses uj branchjei
4. `src/v11/infrastructure/channel/tmux/tmuxManagerSessionLayout.ts`
   - ownership: launch layout topology consume
   - required:
     - a split ordering es pane ancestry explicitten a canonical topology-slot truthhoz kotodjon
     - a launch layout tovabbra is ugyanazt a 4-pane baseline-t eredmenyezze
   - forbidden:
     - uj implicit topology truth megtartasa parity proof nelkul
5. `src/v11/shared/ports/tmuxSessions.ts`
   - ownership: retained shared-port compat projection
   - required:
     - ha a `runtimePaneIndices` export marad, ne authoroljon sajat duplikalt literal truthot
   - forbidden:
     - uj public contract terminology vagy status semantics
6. `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - ownership: application-level meta-review gate pane target consume
   - required:
     - a meta-reviewer respawn target pane index ugyanabbrol a canonical topology projectionrol jojjon
     - a current `metaReviewerPane?.paneIndex ?? 3` fallback vagy megszunik, vagy explicitten compat-only projectionre cserelodik ugy, hogy nem marad masodik truth source
   - forbidden:
     - sajat hardcoded pane default megtartasa canonical truthkent
7. `src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.ts`
   - ownership: collision guard es runtime pane binding parity
   - required:
     - tovabbra is explicit collision check a canonical pane-index projection alapjan
8. `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
   - ownership: reviewer pane respawn consume
   - required:
     - reviewer pane index ugyanabbrol a topology projectionrol jojjon

### Validation Contract

1. Mandatory checks:
   - `pnpm build`
   - `pnpm typecheck`
2. Mandatory targeted tests:
   - `tests/core/runtime/tmuxManager.test.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/runtime/sessionsRegistry.test.ts`
   - `tests/core/runtime/reviewerContext.test.ts`
   - `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts`
3. If an adjacent regression appears:
   - add or refresh the narrowest parity test that proves the preserved slot baseline
   - do not widen the task into config/protocol alignment to "make the suite green"

## L2 - Acceptance / Test Matrix

### Positive Proof

1. `role -> topology_slot_id -> pane_index` exact mapping exists for all 3 current roles plus `status`.
2. Tmux launch/runtime layout still binds panes as:
   - status `0`
   - implementer `1`
   - reviewer `2`
   - meta-reviewer `3`
3. Tmux launch layout split ancestry still proves the same topology:
   - implementer split target = status pane
   - reviewer split target = implementer pane
   - meta-reviewer split target = reviewer pane
4. Envelope delivery targeting still resolves:
   - implementer recipient -> implementer pane
   - reviewer recipient -> reviewer pane
   - explicit `meta_reviewer` target -> meta-reviewer pane
   - human/orchestrator -> status pane
5. Reviewer context respawn still targets the reviewer pane from the same canonical projection.
6. Meta-reviewer pane binding still records the meta-reviewer pane with the preserved index.
7. Meta-review gate pane respawn still targets the preserved meta-reviewer pane index from the same canonical projection, without a separate hardcoded fallback branch.

### Negative Proof

1. Undefined/unmapped slot projection remains fail-closed; no silent pane guess.
2. Meta-reviewer pane collision with status or implementer still returns `shared_runtime_pane`.
3. Invalid or absent delivery target metadata still preserves the existing reason-code behavior instead of inventing a new fallback ladder.

### Baseline / Non-Regression Proof

1. `O2-T13` topology-neutral delivery/launch closure remains untouched:
   - no ack/status semantic drift
   - no new public delivery contract fields
2. `O3-T2` role registry closure remains untouched:
   - no awaited-output mapping drift
   - no prompt concern drift
3. The only canonical pane mapping after the task is the registry/catalogbol szarmaztatott projection; any retained `runtimePaneIndices` export is compat-only.

### Completion Signal

1. A task kesznek akkor tekintheto, ha:
   - a `topologySlotCatalog` code path be van vezetve,
   - a target consume family ugyanarra a projection truthra all at,
   - a 4-slot baseline explicit tesztekkel vedett,
   - es nincs nyitva maradt duplikalt canonical pane-index literal a target familyben.
