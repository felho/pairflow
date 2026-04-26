---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity3_task4_config_bound_role_resolution_alignment_v1
title: "Actor Runtime Interface Opportunity 3 Task 4: Config-Bound Role Resolution Alignment"
status: draft
phase: post-phaseE
target_files:
  - src/types/bubble.ts
  - src/config/bubbleConfig.ts
  - src/v11/application/create/createBubblePreparation.ts
  - src/v11/application/create/createCommandRuntime.ts
  - src/v11/application/actorProtocol/roleDescriptorRegistry.ts
  - src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts
  - src/v11/domain/pass/handoff.ts
  - src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts
  - src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/application/start/startCommandResumeKickoffMessages.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/shared/state/stateSchemaAuthorityChecks.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/state/executionContext.test.ts
  - tests/core/runtime/tmuxManager.test.ts
  - tests/core/state/stateSchema.test.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts
  - tests/v11/application/start/startCommandResumeKickoffMessageBuilders.test.ts
  - tests/v11/domain/pass/handoff.test.ts
  - tests/v11/shared/metaReview/metaReviewCommandSubmitValidation.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateApplyObservation.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 3 Task 4: Config-Bound Role Resolution Alignment

## Current Codebase Check (2026-04-26)

1. Az `O3-T1` note, az `O3-T2` internal registry foundation, es az `O3-T3` topology slot consume-family alignment mar current-tree baseline:
   - `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task2-internal-role-capability-foundation.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task3-topology-slot-catalog-and-tmux-consumer-alignment.md`
2. A `RoleDescriptor` registry ma mar explicitten hordozza az `agent_resolution` mezot mindharom role-ra, de a `meta_reviewer` meg mindig special-case:
   - `implementer -> { kind: "config_bound", config_key: "implementer" }`
   - `reviewer -> { kind: "config_bound", config_key: "reviewer" }`
   - `meta_reviewer -> { kind: "hardcoded_runtime", current_agent: "codex" }`
   - source: `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
3. A bubble config canonical shape ma csak ket explicit role-agent bindinget tartalmaz:
   - `src/types/bubble.ts::BubbleAgentsConfig`
   - `src/config/bubbleConfig.ts::validateBubbleConfig`
   - parser/render reality: az `[agents]` szekcio ma csak `implementer` es `reviewer` kulcsot parse-ol es renderel.
4. A create-path authority producer is meg ketkulcsos bubble-config truthot allit elo:
   - `src/v11/application/create/createBubblePreparation.ts` csak `implementer` es `reviewer` mezot tesz a `CreateBubbleConfigInput` alakba;
   - `src/v11/application/create/createCommandRuntime.ts::buildBubbleConfig` csak ezt a ket agent bindinget irja ki a canonical in-memory configba.
5. A `meta_reviewer = codex` truth ma tobb kulon consume ponton el:
   - actor emit policy guard: `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts::assertMetaReviewerActiveAgentCodexWhenPresent`
   - meta-review submit authority guard: `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts::assertMetaReviewSubmitterAuthority`
   - state schema guard: `src/v11/shared/state/stateSchemaAuthorityChecks.ts`
   - meta-review gate kickoff/staging + runtime materialization: `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`, `metaReviewGateApplyHelpers.ts`, `metaReviewGateStateStaging.ts`, `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`, `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - meta-only PASS handoff: `src/v11/domain/pass/handoff.ts`
   - bubble start / resume meta-review materialization: `src/v11/application/start/startCommandTmuxLaunch.ts`, `src/v11/application/start/startCommandResumeKickoffMessages.ts`
6. A start-launch consume familyben van meg egy retained tmux runtime compat default is:
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts` ma meg tart `"[codex/meta-reviewer]"` label-defaultot;
   - ez nem maradhat canonical authority, legfeljebb dokumentalt compat fallback lehet, vagy ugyanebben a taskban explicit alignmentet kap.
7. A current tree-ben ezek a producer/consume pontok nem ugyanazon authority shape-bol olvasnak:
   - van, ahol bubble config elerheto (`ResolvedBubbleById`, gate apply/staging route),
   - van, ahol a bubble config eloallitasa meg eleve ketkulcsos producer pathon tortenik,
   - van, ahol csak state snapshot all rendelkezesre (`stateSchemaAuthorityChecks.ts`),
   - van, ahol actor emit authority snapshot mellett a resolved bubble context is elerheto (`ActorEmitContextSnapshot.resolved`),
   - es van, ahol runtime command/pane-binding type boundary meg ma is explicit `agentName: "codex"` shape-et var.
8. Az `O3-T1` note explicitten lockolja, hogy az `agent_resolution` mai `hardcoded_runtime -> codex` allapota csak atmeneti baseline, es az `O3-T4`-ben mind a 3 role `config_bound`-ra konvergal replacement proof-fal:
   - source anchor: `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
9. Emiatt az `O3-T4` valos scope-ja nem pusztan config parser modositas, hanem producer-first S3 shared contract + workflow/internal consumer alignment:
   - additive config shape alignment
   - create-path authority producer alignment
   - runtime special-case truth felszamolasa
   - explicit replacement proof a meta-reviewer codex-only guardra
   - public protocol/CLI nyitas nelkul.

## L0 - Policy

### Goal

1. Formalizaljuk, hogy a bubble-local agent binding current-tree szinten mindharom role-ra config-bound truth legyen.
2. Bovitjuk a `BubbleAgentsConfig` shape-et ugy, hogy a `meta_reviewer` bubble-config szinten first-class bindinget kapjon.
3. Kivezetjuk a canonical `metaReviewerAgent = "codex"` special-case truthot az in-scope workflow es runtime consume csaladbol.
4. Bizonyitjuk, hogy a korabbi `codex-when-present` guard fail-closed szandeka nem veszik el, csak config-bound replacementet kap.
5. Nem nyitjuk ujra az `O3-T3` topology slot closure-t vagy az `O3-T5` public role/output surface-t.

### Domain / Control Model Summary

1. Business invariant:
   - az `AgentRole` vocabulary tovabbra is zart: `implementer | reviewer | meta_reviewer`;
   - a `meta_review_result` canonical authority tovabbra is csak `meta_reviewer` role-hoz kotheto;
   - a bubble runtime nem tarthat meg kulon hardcoded agent truthot ott, ahol mar bubble-config authority all rendelkezésre.
2. Control model:
   - az `O3-T4` utan a canonical role -> agent truth bubble-local szinten a `BubbleAgentsConfig` lesz mindharom role-ra;
   - a `RoleDescriptor.agent_resolution` mindharom role-nal `config_bound` alakra konvergal;
   - a workflow/runtime consumerek csak config-derived helperen vagy ugyanazon resolved bubble config authorityn keresztul olvashatnak;
   - a `meta_reviewer` tovabbra sem uj topology slot, uj output kind vagy uj public role surface.
3. Read-path rule:
   - a canonical source a parsed/validated `bubbleConfig.agents.meta_reviewer`;
   - ha a raw config meg nem tartalmaz explicit `meta_reviewer` kulcsot, azt csak a config parse/validation boundary normalizalhatja determinisztikusan; downstream runtime pont nem adhat sajat `"codex"` fallbacket;
   - actor emit policy path config-aware replacement proofja a `resolved.bubbleConfig` authorityn ulhet, mert ez az actor emit context snapshotban elerheto.
4. Forbidden fallback:
   - tilos barmely in-scope file-ban canonical truthkent megtartani a `metaReviewerAgent = "codex"` literal mapet;
   - tilos a `meta_reviewer` agentet `active_agent`, transcript recipient, review-loop mode, topology slot vagy tmux pane alapjan "kitalalni";
   - tilos a meta-review submit authority, gate pane-binding, launch label vagy resume kickoff csak azert `codex`-re szukitese, mert a mai type/command helper azt varja;
   - tilos az `O3-T4` cimke alatt `AgentRole`, `ActorOutputKind`, CLI parser vagy protocol union bovites;
   - tilos olyan allapotot hagyni, ahol a parser mar tud `agents.meta_reviewer`-rol, de a consume csalad egy resze tovabbra is hardcoded codexet olvas.
5. Allowed resolution path:
   - additive `BubbleAgentsConfig` shape alignment `meta_reviewer` mezo hozzaadasaval;
   - deterministic compat normalization a config parse/validation boundaryn, ha legacy bubble.toml meg ketkulcsos agents szekciot tartalmaz;
   - helper/projection surface bevezetese a role -> configured agent feloldashoz, ha ez kell a consume csalad closure-hoz;
   - a state-only validation path config-bound replacement proofja ketfele lehet:
     - explicit config atadas ugyanazon validation boundaryra, vagy
     - a `codex`-specifikus schema-ellenorzes lebontasa config-agnosztikus invariansra ugy, hogy a config-bound egyezes mas, bubbleConfig-ot is lato mutation/emit boundaryn explicitten bizonyitott.
6. Missing-data rule:
   - a parsed `BubbleConfig` in-memory alakjaban `agents.meta_reviewer` nem maradhat hianyzo;
   - ha a raw config legacy shape miatt hianyzik, azt a parser/validator vagy determinisztikusan kitolti, vagy fail-closed elutasitja;
   - tilos a hianyzo mezot kesobbi runtime/path-specifikus `?? "codex"` branchgel potolni.
7. Phase boundary:
   - this task owns: S3 shared contract + workflow/internal consumer alignment a role -> config-bound agent truthon;
   - explicit predecessor: `O3-T3` lezart topology-slot consume family;
   - explicit successor: `O3-T5` csak triggerelt public-surface nyitas eseten.

### Plan Linkage

1. Parent plan source:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Normative predecessor:
   - `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task2-internal-role-capability-foundation.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task3-topology-slot-catalog-and-tmux-consumer-alignment.md`
3. This task closes:
   - `Opportunity 3 / O3-T4`
4. Depends on:
   - `O3-T3` merged es archived
   - `O2-T13` topology-neutral delivery/executor closure preserved
   - `O1-T1` canonical authority baseline preserved
5. Unlocks:
   - `O3-T5` only if a konkret uj output kind igeny vagy uj role sajat kimenettel triggereli a public-surface nyitast
6. Contract-boundary override:
   - `yes`
   - ok: `BubbleAgentsConfig` shared config shape valtozik, es ez tobb workflow/runtime consume pontra sugarzik ki.

### Canonical Contract Anchors

1. Docs/source anchors:
   - `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task2-internal-role-capability-foundation.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task3-topology-slot-catalog-and-tmux-consumer-alignment.md`
2. Current code anchors:
   - `src/types/bubble.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/application/create/createBubblePreparation.ts`
   - `src/v11/application/create/createCommandRuntime.ts`
   - `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts`
   - `src/v11/shared/actorProtocol/actorEmitContextSupport.ts`
   - `src/v11/shared/state/stateSchemaAuthorityChecks.ts`
   - `src/v11/domain/pass/handoff.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/application/start/startCommandResumeKickoffMessages.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
3. Canonical elements consumed here:
   - `BubbleAgentsConfig`
   - `RoleDescriptor.agent_resolution`
   - `meta_reviewer_active_agent_codex_when_present` policy check id / `assertMetaReviewerActiveAgentCodexWhenPresent` current-tree baseline replacement target
   - `meta_review_result` authority-only route baseline
   - implementer/reviewer config-bound role ownership baseline.

### Scope Reality / Shape Proof

1. Declared task shape:
   - primary: `consumer_family_alignment`
   - required companion closure: `authority_producer_alignment`
2. Miert ez a helyes shape:
   - a registry/foundation closure mar `O3-T2`-ben megtortent;
   - a topology-slot consume family mar `O3-T3`-ban lezart;
   - az `O3-T4` fo munkaja a meglevo `agent_resolution` registry fact, a bubble-config authority producer, es a shared runtime consumers alignmentja;
   - a config shape valtozas es a create-path producer update ugyanennek a bounded closure-nak az authority-producer elofeltetele, nem kulon public API lane.
   - a "state" erintettseg ebben a taskban nem kulon state-generalization lane, hanem csak a config-bound replacement proofhoz es a `workflow_orchestration_consumers` + `internal_execution_consumers` closurehoz szukseges kovetkezmeny.
3. Mutation entrypoints / consume points:
   - `src/config/bubbleConfig.ts` parse/validate/render path
   - `src/v11/application/create/createBubblePreparation.ts` create-input -> config-input producer path
   - `src/v11/application/create/createCommandRuntime.ts` canonical in-memory bubble-config producer path
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts` meta-review active-agent guard
   - `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts` meta-review submitter authority guard
   - `src/v11/shared/state/stateSchemaAuthorityChecks.ts` RUNNING meta-review ownership validation
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts` meta-review kickoff envelope recipient
   - `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts` persisted RUNNING meta-review active_agent
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts` meta-review pane respawn command materialization
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` pane-binding runtime type boundary
   - `src/v11/application/start/startCommandTmuxLaunch.ts` meta-review launch label + command materialization
   - `src/v11/application/start/startCommandResumeKickoffMessages.ts` resume meta-review kickoff consistency gate
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts` retained launch/runtime fallback defaults, ha azok a meta-reviewer agent truthot vagy labelt erintik
   - `src/v11/domain/pass/handoff.ts` implementer -> meta-reviewer bypass recipient resolution
4. Hidden scope ruled out:
   - `src/types/protocol.ts` es `src/cli/commands/agent/emit.ts` public role/output surface nem `O3-T4`
   - `topologySlotCatalog`, pane index, tmux pane binding es dedicated-panel baseline nem `O3-T4`
   - prompt concern compose es awaited-output projection nem `O3-T4`
   - altalanos state-schema vagy inspection-surface bovites nem cel; csak a config-bound meta-review ownership replacement proofhoz szukseges validation/invariant boundary pontok erinthetok
   - `round_role_history` shape bovitese nem cel; csak akkor erintheto, ha explicit proof mutatja, hogy kulonben a config-bound replacement nem zarhato fail-closed modon
5. Reality note:
   - a current-tree codex-only truth negy kulon authority-kornyezetben el:
     - create-path producer alakban,
     - config-aware workflow/runtime fogyasztoknal,
     - configot nem lato schema/policy guardokban,
     - es retained launch/runtime defaultokban;
   - emiatt a tasknak explicit replacement-strategiat kell adnia erre a haromfele helyzetre; nem eleg egyetlen helper bevezetese, ha az nem zarja le a producer pathot, a state-only guard branch-et vagy a start-launch defaultokat.

### Complexity-Risk Triage

1. `authority_risk`: `2`
   - a meta-review active-agent truth canonical forrasa valtozik meg ugyanazon bubble-local authority lancban.
2. `surface_spread`: `2`
   - config parser/render + create producer, actor emit policy, state schema, pass handoff es meta-review gate/start consume csalad egyszerre erintett.
3. `identity_join_risk`: `2`
   - a role -> configured agent -> active_agent join eddig reszben hardcoded volt; most bubbleConfig-hoz kotodik.
4. `activation_coupling`: `1`
   - a meta-only bypass es a meta-review gate RUNNING stage ugyanarra az uj config-bound truthra all at.
5. `prerequisite_risk`: `1`
   - `O3-T2` es `O3-T3` current-tree baseline elo-feltetel.
6. `acceptance_multiplicity`: `2`
   - create-path producer,
   - config parse/render,
   - actor emit guard,
   - pass handoff,
   - meta-review gate apply/staging,
   - state schema replacement proof.
7. `risk_score`: `8`
8. Split decision:
   - a touched producer es consumers ugyanannak az S3 role->agent resolution closure-nak a reszei;
   - kulon task csak akkor kellene, ha public protocol/CLI vagy topology closure is ujranyilna;
   - emiatt az `O3-T4` egy taskkent megtarthato, de explicit replacement proof kotelezo a state-only guardokra.

### Closure-Budget Triage

1. Materially touched closure bucketek:
   - `authority_producer`
   - `shared_contract`
   - `workflow_orchestration_consumers`
   - `internal_execution_consumers`
2. `authority_producer`
   - create command input preparation
   - canonical in-memory bubble-config construction
3. `shared_contract`
   - `BubbleAgentsConfig`
   - `RoleDescriptor.agent_resolution`
4. `workflow_orchestration_consumers`
   - meta-review gate kickoff envelope routing
   - meta-review gate RUNNING state staging
   - meta-review pane respawn / launch command materialization
   - resume meta-review kickoff gating
   - meta-only PASS handoff recipient resolution
5. `internal_execution_consumers`
   - actor emit meta-review policy guard
   - meta-review submit authority guard
   - state snapshot authority validation
   - configot nem lato RUNNING/meta-review ownership replacement proof
6. Miert safe ez a collapse:
   - ugyanaz a role -> configured agent truth zarja oket;
   - a create producer es a runtime consume family ugyanannak a bubble-local config authoritynak ket oldala;
   - nincs uj public protocol/output kind surface;
   - a config shape valtozas egy bubble-local shared contract, nem kulon external API.
7. Explicitly deferred closures:
   - `read_model_consumers`
   - `cleanup_recovery_consumers`
   - `persisted_authority_or_schema` adatbazis jellegu munka nincs
   - `public protocol/output kind extension` (`O3-T5`)
   - topology slot/pane ownership (`O3-T3`)

### Authority Boundary Map

1. `shared_contract`
   - `BubbleAgentsConfig`
   - role -> configured agent helper/projection
   - `RoleDescriptor.agent_resolution`
2. `authority_producer`
   - create command input preparation
   - canonical in-memory bubble-config construction
3. `workflow_orchestration_consumers`
   - PASS bypass recipient resolution
   - meta-review kickoff envelope recipient
   - meta-review RUNNING state staging
   - start/resume meta-review command + label materialization
   - meta-review pane binding runtime command materialization
4. `internal_execution_consumers`
   - actor emit policy check for meta-review authority
   - meta-review submit authority check
   - state snapshot validation around active meta-review ownership
5. `read_model_consumers`
   - explicit out of scope
6. `cleanup_recovery_consumers`
   - explicit out of scope

### Baseline Preservation

1. Must-preserve viselkedesek:
   - `implementer` es `reviewer` tovabbra is config-bound marad;
   - `implementer !== reviewer` validation preserved marad;
   - a `meta_reviewer` tovabbra is csak `meta_review_result` authorityt hordozhat;
   - a create-path tovabbra is bubble-local canonical configot allit elo, csak mar explicit haromrole-os agents shape-pel;
   - a meta-only pass route tovabbra is `implementer -> meta_reviewer` marad, csak a recipient agent lesz config-derived;
   - a meta-review gate kickoff/staging tovabbra is a meta-review role-t celozza, csak a concrete agent feloldasa valik config-boundda.
2. Preserved guards:
   - tilos a meta-review authorityt `reviewer` vagy `implementer` role-ra visszacsusztatni;
   - tilos a fail-closed active-agent mismatch guard teljes eltuntetese replacement proof nelkul.
3. Forbidden regressziok:
   - a config parser utan sem maradhat masodik canonical truth a `meta_reviewer` agentre;
   - a create-path sem maradhat ketkulcsos producer truth ugy, hogy a downstream runtime mar haromkulcsos canonical configra epit;
   - a bubble-local config shape nem maradhat felmigraltlanul ugy, hogy az egyik consume csalad explicit `meta_reviewer` mezojon, a masik pedig codex-literalt hasznal;
   - a start/launch family retained fallback defaultja nem maradhat canonical authority; ha marad, explicit compat-only viselkedeskent kell dokumentalni es a canonical path nem tamaszkodhat ra;
   - nem nyithato ujra az `O3-T3` dedicated-panel baseline;
   - nem valhat a review-loop mode vagy a topology slot a meta-reviewer agent authority source-ava.

### In Scope

1. Uj task artifact ezen a path-on: `plans/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task4-config-bound-role-resolution-alignment.md`.
2. A parent plan `Opportunity 3` blokkjanak frissitese az `O3-T4` task artifact path-javal.
3. `BubbleAgentsConfig` additive shape alignment `meta_reviewer` mezovel.
4. `bubbleConfig` parse/validate/render alignment a bovitett agents shape-re.
5. Create-path authority producer alignment:
   - `src/v11/application/create/createBubblePreparation.ts`
   - `src/v11/application/create/createCommandRuntime.ts`
6. `RoleDescriptor.meta_reviewer.agent_resolution` `config_bound` alakra konvergalasa.
7. A meta-reviewer codex-only runtime truthok alignmentje a canonical config-bound source-ra az in-scope consumer familyben:
   - actor emit policy guard
   - meta-review submit authority guard
   - state schema replacement proof
   - meta-review gate kickoff/staging/pane-binding
   - start/resume meta-review command/label/kickoff consistency consume
   - retained tmux launch/runtime default, ha az tovabbra is meta-reviewer agent/label fallbacket ad
   - meta-only pass handoff
8. Celozott parity/regression tesztek a fenti producer + consume pontokra.

### Out of Scope

1. `AgentRole` vagy `ActorOutputKind` public vocabulary bovites (`O3-T5`).
2. `topologySlotCatalog`, pane index, tmux pane targeting vagy delivery ack semantics modositas (`O3-T3` mar lezart).
   - megengedett viszont az agent-nevvel kapcsolatos meta-review pane command/label/runtime materialization alignment, beleertve a retained tmux fallback defaultok lezarasat is, mert ez nem topology truth, hanem role -> configured agent consume.
3. Prompt concern registry vagy prompt compose tovabbi refaktorja (`O3-T2` mar lezart).
4. Global workflow schema, plugin loader, bubble-external config source, vagy non-bubble workflow-config ownership.
5. `round_role_history` shape altalanositas harom role-ra, hacsak a target consume family explicit closeoutja ezt nem teszi elkerulhetetlenne.
6. Uj distinctness policy, peldaul `meta_reviewer !== reviewer` vagy `meta_reviewer !== implementer`, ha erre nincs explicit current-tree baseline.

## L1 - Implementation Contract

### Target File Contract

1. `src/types/bubble.ts`
   - ownership: `BubbleAgentsConfig` canonical shared config shape
   - required:
     - a bubble-local agents shape explicit `meta_reviewer` bindinget hordozzon;
     - a type-surface zart maradjon az ismert `AgentName` unionon;
     - a bovites ne nyissa ujra az `AgentRole` public vocabularyt.
   - forbidden:
     - `Record<string, AgentName>` vagy mas laza shape bevezetese bizonyitas nelkul
2. `src/config/bubbleConfig.ts`
   - ownership: parse/validate/render boundary
   - required:
     - a parser/validator canonical in-memory configban mindig explicit `agents.meta_reviewer` erteket adjon;
     - a render path ezt az explicit mezot kiirja;
     - legacy ketkulcsos agents shape kezelese, ha tamogatott, csak itt tortenhet determinisztikus compat normalizationkent.
   - forbidden:
     - downstream consumerre hagyni a hianyzo `meta_reviewer` mezot
     - uj runtime-level `"codex"` fallbackot dokumentalatlanul ide vagy mashova csempeszni
3. `src/v11/application/create/createBubblePreparation.ts`
   - ownership: create-command input -> config-input producer alignment
   - required:
     - a create-path ne csak ket role-agent mezot vigyen tovabb, ha a canonical config mar haromrole-os agents shape-et var;
     - a `CreateBubbleConfigInput` eloallitas ugyanarra a canonical `meta_reviewer` config authorityra alljon, mint amit a parser/validator es runtime consume csalad hasznal.
   - forbidden:
     - olyan partial config-input shape megtartasa, amely a downstream producerre vagy runtime consumerre hagyja a harmadik role-agent authority kipotlasat
4. `src/v11/application/create/createCommandRuntime.ts`
   - ownership: canonical in-memory bubble-config producer
   - required:
     - `buildBubbleConfig(...)` explicit `agents.meta_reviewer` bindinget irjon a canonical in-memory configba;
     - ha compat normalization marad, az ugyanitt vagy a canonical parse/validate boundaryn legyen egyertelmu, ne kesobbi runtime consume ponton.
   - forbidden:
     - ketkulcsos canonical config eloallitasa
     - a `meta_reviewer` authority kesobbi consume familyre tolasa
5. `src/v11/application/actorProtocol/roleDescriptorRegistry.ts`
   - ownership: role-level config binding registry fact
   - required:
     - `meta_reviewer.agent_resolution` `config_bound` alakra konvergaljon;
     - a `config_key` explicitten ugyanarra a canonical bubble-config kulcsra mutasson, amelyet a parser/validator kezel.
   - forbidden:
     - topology slot, awaited-output vagy prompt concern closure ujranyitasa
6. `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - ownership: config-aware meta-review active-agent guard replacement
   - required:
     - a meta-review active-agent parity tobbe ne universal `codex` literalra epuljon;
     - a replacement proof ugyanazon bubble-local authority lancot hasznalja (`resolved.bubbleConfig`, ha szukseges);
     - mismatch tovabbra is fail-closed legyen.
   - forbidden:
     - a guard teljes torlese explicit replacement proof nelkul
7. `src/v11/shared/state/stateSchemaAuthorityChecks.ts`
   - ownership: state-only validation replacement proof
   - required:
     - a file ne tartson meg configot nem lato `active_agent === "codex"` canonical truthot;
     - ha a state-only path nem lat bubble configot, akkor a schema csak olyan invariansig mehet el, amit tenylegesen bizonyitani tud;
     - a config-bound active-agent parityt mast is lato boundary proofnak kell vedeni.
   - forbidden:
     - universal codex-only ownership kovetelmeny
     - silent weakening olyan modon, hogy a meta-review active-agent mismatch mar ne legyen sehol fail-closed
8. `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts`
   - ownership: config-aware meta-review submitter authority replacement
   - required:
     - a submit authority path ne universal `codex` literalra epuljon;
     - a replacement proof itt is fail-closed mismatchet tartson fenn;
     - a partial/missing active ownership es stale execution guard behavior preserved maradjon.
   - forbidden:
     - submit authority csendes lazitasa
     - kulon, a bubble configtol fuggetlen masodik meta-reviewer truth bevezetese
9. `src/v11/domain/pass/handoff.ts`
   - ownership: meta-only bypass recipient resolution
   - required:
     - a meta-review recipient agent config-derived legyen;
     - a route role-ja tovabbra is `meta_reviewer` maradjon;
     - implementer/reviewer handoff semantics ne valtozzon.
10. `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - ownership: runtime pane respawn command materialization
   - required:
     - a pane-binding command buildje a configured meta-reviewer agentet hasznalja;
     - a pane index / topology ownership tovabbra is `O3-T3` baseline maradjon;
     - a task nem topology-taskkent, hanem command/agent materialization taskkent ownershipolja ezt a file-t.
11. `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - ownership: pane-binding runtime type boundary
   - required:
     - a pane-binding runtime capability ne legyen hardcoded `agentName: "codex"` shape-re szukitve;
     - az uj type boundary csak a bubble-local `AgentName` unionig nyisson, ne public role/output surface fele.
12. `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`
   - ownership: hardcoded meta-review agent truth closeout
   - required:
     - a file nem maradhat canonical `metaReviewerAgent = "codex"` truth source;
     - ha helper marad, az csak config-derived/projection szerepet tolthet be.
13. `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts`
   - ownership: kickoff envelope recipient alignment
   - required:
     - a kickoff envelope recipientje a configured meta-reviewer agent legyen;
     - a `delivery_target_role = meta_reviewer` metadata preserved maradjon.
14. `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`
   - ownership: persisted RUNNING meta-review active_agent alignment
   - required:
     - a staged RUNNING state `active_agent` a configured meta-reviewerre alljon;
     - a meta-review execution_context shape preserved maradjon.
15. `src/v11/application/start/startCommandTmuxLaunch.ts`
   - ownership: launch-time meta-review agent command es label materialization
   - required:
     - a meta-review pane label es command recipient a configured meta-reviewer agentet tukrozze;
     - a `metaReviewerSubmitStartupPrompt` workflow baseline preserved maradjon;
     - pane index/topology ordering nem valtozhat ebben a taskban.
16. `src/v11/application/start/startCommandResumeKickoffMessages.ts`
   - ownership: resume meta-review kickoff consistency consume
   - required:
     - a RUNNING meta-review state consistency mar ne hardcoded `active_agent === "codex"` alapon doljon el;
     - a meta-review kickoff gate a configured meta-reviewer agentet tekintse canonical active ownershipnek.
17. `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - ownership: retained launch/runtime compat default closeout
   - required:
     - ha a tmux runtime default tovabbra is tart meta-reviewer label/command fallbacket, az ne legyen canonical authority;
     - a canonical start path ne tamaszkodjon `"[codex/meta-reviewer]"` retained defaultra.
   - forbidden:
     - olyan hidden fallback megtartasa, amely mellett a launch path latszolag config-bound, de a runtime default visszahuzza `codex`-re

### Validation Contract

1. Mandatory checks:
   - `pnpm build`
   - `pnpm typecheck`
2. Mandatory targeted tests:
   - `tests/config/bubbleConfig.test.ts`
   - `tests/core/bubble/startBubble.test.ts`
   - `tests/core/state/executionContext.test.ts`
   - `tests/core/runtime/tmuxManager.test.ts`
   - `tests/core/state/stateSchema.test.ts`
   - `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`
   - `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts`
   - `tests/v11/application/start/startCommandResumeKickoffMessageBuilders.test.ts`
   - `tests/v11/domain/pass/handoff.test.ts`
   - `tests/v11/shared/metaReview/metaReviewCommandSubmitValidation.test.ts` plusz szukseg eseten uj submit-authority coverage ugyanebben a csaladban
   - `tests/v11/shared/metaReviewGate/metaReviewGateApplyObservation.test.ts`
   - `tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts`
3. Per-consumer assertion strategy kotelezo:
   - `bubbleConfig.test.ts` bizonyitsa a bovitett agents shape parse/validate/render closure-t, beleertve a legacy compat branch-et is, ha marad;
   - `startBubble.test.ts` bizonyitsa a create-path producer es a launch/resume meta-review consume closure-t ugyanazon config authorityn;
   - `executionContext.test.ts` bizonyitsa, hogy a `meta_reviewer` registry entry `agent_resolution` mar config-bound;
   - `stateSchema.test.ts` bizonyitsa a codex-only schema-guard replacementet;
   - `emitActorProtocolV11.test.ts` bizonyitsa, hogy a meta-review active-agent guard mar configured meta-reviewer parityn ul es mismatchnel fail-closed;
   - `metaReviewCommandSubmitValidation.test.ts` vagy uj, szuk submit-authority suite bizonyitsa, hogy a submitter-authority path is configured meta-reviewer parityn ul es mismatchnel fail-closed;
   - `handoff.test.ts` bizonyitsa a meta-only bypass recipient config-derived feloldasat;
   - `metaReviewGateApplyObservation.test.ts`, `metaReviewGateStateStaging.test.ts` es `metaReviewGatePaneBinding.test.ts` bizonyitsa a kickoff/staging/pane-binding config-derived meta-reviewer consume-ot;
   - `startBubble.test.ts`, `tmuxManager.test.ts` es a resume kickoff message coverage bizonyitsa, hogy a launch/resume meta-review command/label/consistency path es a retained tmux default sem tart meg canonical hardcoded `codex` truthot.
4. If an adjacent regression appears:
   - add or refresh the narrowest parity test that proves the same bubble-local config authority path;
   - do not widen the task into topology/public protocol work.

## L2 - Acceptance / Test Matrix

### Positive Proof

1. A canonical in-memory `BubbleAgentsConfig` mindharom role-ra explicit agent bindinget tartalmaz.
2. A create-path producer ugyanilyen explicit haromrole-os agents shape-et allit elo.
3. A `meta_reviewer` registry entry `agent_resolution` mar `{ kind: "config_bound", config_key: "meta_reviewer" }`.
4. A meta-only implementer PASS tovabbra is `meta_reviewer` role-ra megy, de a recipient agent a configured `bubbleConfig.agents.meta_reviewer`.
5. A meta-review gate kickoff envelope recipientje a configured meta-reviewer agent.
6. A meta-review RUNNING state staging `active_agent` mezobe a configured meta-reviewer agentet irja.
7. A meta-review submit authority path is elfogadja a configured meta-reviewer agentet, es fail-closed elutasitja a mismatch-et.
8. A meta-review pane-binding / start / resume path a configured meta-reviewer agenttel materializalja a commandot, labelt es kickoff consistencyt.
9. A retained tmux runtime default, ha megmarad, nem canonical authoritykent viselkedik, es a canonical start path nem tamaszkodik ra.
10. A config-aware actor emit meta-review guard elfogadja a configured meta-reviewer agentet, es fail-closed elutasitja a mismatch-et.
11. A state validation path nem universal codex-literalt enforce-ol, de a meta-review authority shape (`active_role`, awaited output, execution context mirror) preserved marad.
12. Ha a configured meta-reviewer tovabbra is `codex`, a current-tree behavior kulsoleg valtozatlan marad.

### Negative Proof

1. Hianyzo vagy invalid `agents.meta_reviewer` a canonical config boundaryn fail-closed legyen; ne jusson tovabb runtime fallbackre.
2. Nincs in-scope create/launch/consume pathon canonical `?? "codex"` vagy ezzel ekvivalens hardcoded replacement branch.
3. Mismatch a configured meta-reviewer es az active runtime ownership kozott tovabbra is legalabb egy explicit in-scope boundaryn fail-closed legyen:
   - actor emit
   - meta-review submit
   - gate/staging/launch/resume consume csalad kozul a relevans ponton
4. A retained tmux default nem huzhatja vissza a canonical launch pathot `codex`-re, ha a configured meta-reviewer mas agent.
5. A meta-review role nem csuszhat vissza reviewer/implementer parity branchre csak azert, mert az agent binding mar config-bound.

### Baseline / Non-Regression Proof

1. `implementer` es `reviewer` config-bound semantics valtozatlan marad.
2. Az `implementer !== reviewer` validation preserved marad.
3. Az `O3-T3` topology slot baseline untouched:
   - nincs pane-index drift
   - nincs topology ownership regresszio
4. Az `O3-T5` public surface untouched:
   - nincs uj role az `AgentRole` public unionban
   - nincs uj output kind
   - nincs CLI `--expected-role` bovites
5. A meta-review authority tovabbra is csak `meta_review_result` route-on ervenyes.

### Completion Signal

1. A task kesznek akkor tekintheto, ha:
   - a bubble config canonical shape explicit `meta_reviewer` bindinget hordoz,
   - a create-path producer ugyanezt a haromrole-os authorityt allitja elo,
   - a registry `agent_resolution` mindharom role-ra `config_bound`,
   - az in-scope hardcoded codex-only producer + consume csalad closure-t kap, beleertve a submit authority, a start/resume/pane-binding materialization pathokat es a retained tmux default closeoutjat is,
   - es a replacement proof bizonyitja, hogy a fail-closed active-agent parity nem tunik el.
2. A config-compat branch explicit legyen:
   - normalize branch:
     - legacy raw configot a parser deterministic canonical shape-re hoz
     - a rendered config mar explicit `meta_reviewer` mezot ir
   - fail-closed branch:
     - legacy raw config parse/validate elutasitasra kerul
     - nincs downstream runtime fallback
3. A task nem tekintheto kesznek, ha:
   - a parser vagy create-path producer mar tud `meta_reviewer` mezorol, de a gate/handoff/dispatch/submit/start/resume/tmux default consume csalad egy resze tovabbra is `codex`-et hasznal canonical truthkent;
   - a schema-level codex truth elbomlik, de helyette nincs config-bound fail-closed replacement proof;
   - a task public role/output surface-t vagy topology closure-t is megmozdit.
