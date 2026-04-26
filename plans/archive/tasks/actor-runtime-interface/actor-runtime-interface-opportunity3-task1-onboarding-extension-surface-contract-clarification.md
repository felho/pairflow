---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity3_task1_onboarding_extension_surface_v1
title: "Actor Runtime Interface Opportunity 3 Task 1: Onboarding/Extension Surface Contract Clarification"
status: completed
phase: post-phaseE
target_files:
  - plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task1-onboarding-extension-surface-contract-clarification.md
  - docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 3 Task 1: Onboarding/Extension Surface Contract Clarification

## Current Codebase Check (2026-04-25)

1. Az `Opportunity 1 / O1-T3` lezarasa utan a runtime kernel + dispatch matrix + policy catalog + adapter map mintazat mar in-place van:
   - `src/v11/application/actorProtocol/actorRuntimeKernel.ts`
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
2. Az `AgentRole` zart vocabulary azonban a kerneltol fuggetlenul tovabbra is negy kulon kontaktponton (seam) szivargasszik tul a kodbazison:
   - S1: role -> primary awaited output mapping in `src/v11/shared/state/executionContext.ts::resolveAwaitedOutputTypeForRole`
   - S2: role -> topology slot mapping in `src/v11/infrastructure/channel/tmux/tmuxManager.ts::runtimePaneIndices` + `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - S3: role -> bubble config binding in `src/config/bubbleConfig.ts` + `src/types/bubble.ts::BubbleAgentsConfig`
   - S4: role -> startup/resume prompt composition in `src/v11/application/start/startCommandPrompts.ts` + `src/v11/application/start/startCommandImplementerPrompts.ts` + `src/v11/application/start/startCommandResumePrompts.ts` + `src/v11/application/start/startCommandResumeImplementerPrompt.ts`
3. A 4 seamen az `AgentRole` enum konkret ertekei egyetlen kozos lookup-pont nelkul jelennek meg: uj role bevezetese mind a negy helyen kulon-kulon valtoztatast kerne, es nincs olyan compile-time error, ami egyutt felsorolna a hianyzo bejegyzeseket.
4. A lezart `Opportunity 3` discovery/ideation kor utan a working olvasat az, hogy ez nem a runtime kernel ujraepiteset igenyli, hanem egy belso `RoleDescriptor` registry mintazat felvezeteset, amely a meglevo catalog-pattern (`actorRuntimePolicyCheckCatalog`, `actorRuntimeAdapterExecutors`) mintajara mukodne, csak role szinten.
5. Emiatt az `Opportunity 3` first bounded slice-a docs-only contract clarification: a registry mintazat normativ rogzitese + a 4 seam source-anchored inventory + a phasing (T2..T5) explicit gatinge.

## L0 - Policy

### Goal

Docs-only `O3-T1` szelet, amely:
1. explicit normativ szerzodest fogalmaz meg arrol, hogy az `Opportunity 3` belso extension-surface foundation lane-je egy `RoleDescriptor` registry mintara epul, a meglevo catalog-pattern vegighuzasaval, NEM polimorfizmus-alapu interface-szel,
2. a 4 seam (S1..S4) source-anchored inventoryjat zart formaban rogzíti,
3. a 3 jelenlegi role (`implementer`, `reviewer`, `meta_reviewer`) closed-mapping matrixat adja az uj descriptor-mezok ertekeivel,
4. a `O3-T2..T5` phasinget gatinggel rogzíti.

### Context

1. A parent successor plan (`plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`) szerint `Opportunity 3` a post-Phase-E onboarding-foundation lane.
2. Az `O1-T1` (kernel boundary) es `O2-T1` (topology-neutral delivery/executor boundary) note-ok zart preserved baseline-ek; az `Opportunity 1` es `Opportunity 2` implementation lane-ek lezartak.
3. A discovery summary mar zart, source-anchored felderitest adott; az `O3-T1` annak normativ kontraktualis konszolidacioja.
4. Ez a task nem tortenelmi compat klisszura es nem sorbarendezesi felulvizsgalat; uj first bounded slice az `O3` lane indulasahoz.

### In Scope

1. Az uj task artifact ezen a path-on: `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task1-onboarding-extension-surface-contract-clarification.md`.
2. Az uj contract note ezen a path-on: `docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md`.
3. A parent plan `Opportunity Disposition`, `Recommended Sequencing` es `Traceability` szekcioinak frissitese az `O3-T1` task path-aval, a contract note path-aval es az `O3-T2..T5` phasing iranyaval.
4. A 4 seam (S1..S4) source-anchored inventoryjanak formalizalasa a contract note-ban, legalabb erre a tengelyre:
   - seam id (`S1`..`S4`),
   - implicit szerzodes a current tree-ben,
   - source anchor file + szimbolum.
5. A `RoleDescriptor` proposed mezohalmazanak rogzitese a contract note-ban, beleertve:
   - `id`,
   - `primary_awaited_output_type`,
   - `topology_slot_id`,
   - `authority_policy_check_id` (existing catalog reference),
   - `agent_resolution` (`config_bound | hardcoded_runtime`),
   - `startup_prompt_concern_ids`,
   - `resume_prompt_concern_ids`,
   - opcionalis `handoff_id_format_id` es `active_agent_constraint_id` mezok azokra a role-okra, amelyek extra invariansot hordoznak.
6. A 3 mai role closed-mapping matrixanak rogzitese a contract note-ban, mind a 9 mezovel a current-tree alapjan, beleertve az exact `startup_prompt_concern_ids` es `resume_prompt_concern_ids` ordered listakat.
7. A companion catalog naming proposal a contract note-ban: `promptConcernCatalog` es `topologySlotCatalog` source-anchor mintaval, **kod nelkul** (a tenyleges katalogus felepitese `O3-T2`), ugy hogy a prompt concern ID-k explicitten lefedhetnek:
   - kozvetlen reusable helper buildert,
   - grouped builder-local fixed blockot, ha a current tree-ben meg nincs kisebb helperre bontva.
8. A `O3-T2..T5` phasing rogzitese a contract note-ban tabular formaban (slice id, shape, goal, closure bucket, gating felteteleivel).

### Out of Scope

1. Barmilyen `src/` koval valtoztatas. Ez docs-only task.
2. Uj `AgentRole` ertek vagy uj `ActorOutputKind` ertek bevezetese.
3. A public CLI (`src/cli/commands/agent/emit.ts`) vagy public protocol surface (`src/types/protocol.ts`) modositasa.
4. A `BubbleAgentsConfig` shape modositasa (uj `agents.meta_reviewer` mezo, vagy `Record<AgentRole, AgentName>`-typusu config). Ez `O3-T4` munka.
5. Plugin loader, yaml workflow schema, runtime composition.
6. Topology slot reuse, conditional visibility, multiplexing. Az `O3-T1` working assumptionje "egy active role = sajat dedikalt pane".
7. "Agent persona/mode/approach" jellegu config-shape bevezetese vagy a prompt-compose ownership ide huzasa. A `O3-T2` foundation slice formalizalja a `promptConcernCatalog`-ot kod szinten.
8. A `assertMetaReviewerActiveAgentCodexWhenPresent` runtime guard tenyleges atalakitasa. Ez a guard preserved-baseline marad ebben a slice-ban; az `agent_resolution` fix `hardcoded_runtime` -> `config_bound` migracio `O3-T4`-ben tortenik explicit replacement proof-fal.

### Safety Defaults

1. Docs-only task; product- vagy runtime-kod nem modosithato.
2. A canonical execution authority baseline (`O1-T1` kernel boundary note + `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`) preserved marad; az uj note nem reinterpretalhatja lazabb compat language-gge.
3. A topology-neutral delivery/executor closure (`O2-T1..T13`) preserved marad; az `O3` nem nyitja ujra a delivery vagy launch contract zart truthjat.
4. A `assertReviewerHumanQuestionRetainedFallback` retained fallback explicit preserved-baseline.
5. A `assertMetaReviewerActiveAgentCodexWhenPresent` guard explicit preserved-baseline-with-explicit-replacement-path-in-O3-T4.
6. A reviewer/implementer "must be different agents" konvencio (`bubbleConfig.ts`-ben enforce-olt) preserved-baseline-with-explicit-replacement-path-if-needed; nem domain-invariant es nem "tightening" cimsko alatt eltavolithato.
7. Az `AgentRole` es `ActorOutputKind` zart unionok ebben a slice-ban; uj enum-ertek nem kerul fel.
8. A "configurability compass" vezérelv: ha egy architektura-dontesnek ket utja van es az egyik nyitva tartja az utat a jovobeli workflow-konfigurabilitas fele, azt az utat valasztjuk. Ez nem onallo dontesi pont, hanem iranymutato.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - belso `RoleDescriptor` registry boundary dokumentalt szerzodese
   - companion catalog naming proposal (`promptConcernCatalog`, `topologySlotCatalog`)
3. Blast radius:
   - uj task artifact a `plans/tasks/actor-runtime-interface/` alatt
   - uj contract note a `plans/` alatt
   - parent plan sequencing/disposition/traceability frissites
   - `src/` code surfaces csak source-anchor es read-only constraint szerepben

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` (owns `Opportunity 3` sequencing)
2. Preserved baselines:
   - `docs/actor-runtime-interface/generic-runtime-kernel-contract-note-v1.md` (`O1-T1` kernel boundary)
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md` (`O2-T1` topology-neutral boundary)
   - `docs/actor-runtime-interface/execution-authority-contract-note-v1.md` (canonical authority baseline)
3. Historical predecessor:
   - lezart `Opportunity 3` discovery/ideation kor

## L1 - Implementation Contract

### Plan Linkage

1. Closes `Opportunity 3 / O3-T1` slot a parent planban.
2. Depends on:
   - `O1-T1` kernel boundary note (lezart),
   - `O2-T1` topology-neutral delivery/executor boundary note (lezart),
   - `Opportunity 1` es `Opportunity 2` implementation lane-ek lezarasa (current-tree szinten lezart).
3. Unlocks:
   - `O3-T2`: belso registry + companion catalog kod-szintu bevezetese (S1 + S4 atkotese a registry-re),
   - `O3-T3`: S2 (topology slot) atkotese a registry-re,
   - `O3-T4`: S3 (config binding) atkotese, `BubbleAgentsConfig` shape alignment, `agent_resolution` migracio mind a 3 role-on `config_bound` alakra,
   - `O3-T5`: public CLI/protocol surface kontrollalt nyitasa, **csak akkor** ha konkret uj output kind igeny vagy uj role saját kimenettel felmerul.
4. Refines a parent plan `Opportunity 3` disposition entry-jet `deferred successor lane` -> `active first slice with task path + contract note path + T2..T5 gating`.
5. Inherited validation/exit expectation: a parent plan `Done Definition`-je megkivanja, hogy "minden opportunity explicit successor lane-hez vagy explicit deferred/parkolt dispositionhoz van kotve, es legalabb az elso bounded successor task letrejon". Ez a task ezt teljesiti `Opportunity 3`-ra.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - 4 seam source anchorai (S1: `executionContext.ts::resolveAwaitedOutputTypeForRole`; S2: `tmuxManager.ts::runtimePaneIndices` + `tmuxDeliveryTargeting.ts`; S3: `bubbleConfig.ts` + `BubbleAgentsConfig`; S4: a 4 startCommand prompt builder file)
   - kernel + dispatch matrix + adapter map (`actorRuntimeKernel.ts`, `actorRuntimeDispatchMatrix.ts`, `actorProtocolEmitters.ts`, `emitActorProtocolV11.ts`)
   - public surface (`src/types/protocol.ts`, `src/types/bubble.ts`, `src/cli/commands/agent/emit.ts`)
2. Actual touched scope: docs-only contract foundation; nincs mutation entrypoint; nincs producer munka; nincs consumer-family code alignment.
3. Mutation entrypoints in scope: nincs.
4. Hidden scope ruled out: nem tortenik public CLI/protocol enum modositas; nem tortenik `BubbleAgentsConfig` shape modositas; nem tortenik runtime guard atalakitas; nem tortenik tmux pane index modositas.
5. Branch inventory note: nincs runtime branch-inventory ebben a slice-ban; a contract note csak source-anchored mappingot ad.
6. Why the declared task shape matches reality: a tenyleges scope kizarolag markdown artifact iras + parent plan szovegfrissites; ez `contract_or_persisted_authority_foundation` shape, secondary shape nincs.

### Control Model Clauses

#### Business Invariant

1. A `RoleDescriptor` registry sem szerez workflow-state, bubble-authority vagy lifecycle ownershipot.
2. A canonical execution authority baseline (`O1-T1`) erintetlen marad.
3. A topology-neutral delivery/executor closure (`O2-T1..T13`) erintetlen marad.

#### Control Model

1. A jelen task csak elvalasztja:
   - zart baseline vocabulary (preserved),
   - belso `RoleDescriptor` registry shape (uj clarification),
   - per-seam projection-helper minta (proposed naming),
   - kesobbi `O3-T2..T5` lane-ek (deferred).
2. A registry source-of-truth-ja a 4 seam mai source-anchora; a registry **dokumentumkent** tukrozi a meglevo mappingot, nem felulirja.

#### Read Path Rule

1. A 4 seam mai source-anchorai a source-of-truth, nem a registry parafrazisai.
2. Ha egy seamhez closed mapping van a current-tree-ben (pl. S1 `meta_reviewer -> meta_review_result, else -> pass_result`), az a contract note-ban kotelezo explicit mappingkent rogzul.

#### Forbidden Fallback

1. A `RoleDescriptor` nem lep a public `ActorOutputKind` enum helyebe.
2. A `RoleDescriptor` nem hordoz prompt szoveget vagy implementation-t; csak ID-referenciakat (existing/proposed catalog ID-k).
3. Uj umbrella terminologia exact source-anchor mapping nelkul tilos.
4. A `RoleDescriptor` nem tortenelmi `RoleHandler` interface-kent neveztetik at; a registry mintazat **nem polimorfizmus**.

#### Allowed Resolution Path

1. Explicit name-binding a meglevo catalog-elemekre: `actorRuntimePolicyCheckCatalog` ID-k es `actorRuntimeAdapterExecutors` ID-k a current tree-bol.
2. Companion catalog naming proposal (`promptConcernCatalog`, `topologySlotCatalog`) source-anchor mintaval, **kod nelkul**; a tenyleges katalogus felepitese `O3-T2`/`O3-T3` successor ownership.
3. A prompt concern naming proposal lehet helper-szintu vagy grouped builder-local fixed block szintu, de minden ID-nek explicit current-tree source anchorja kell legyen.
4. Az `O3-T1`-ben a 3 mai role exact startup/resume concern-setjeihez szukseges `promptConcernCatalog` concern-vocabulary mar normativan lockolando; az `O3-T2` csak ennek kod-szintu formalizalasat es registry/projection bekoteset ownershipolja.
5. A "configurability compass" vezérelv hasznalhato dontesi tradeoffoknal, ha az egyik ut nyitva tartja az utat a jovobeli workflow-konfigurabilitas fele.

#### Missing Data Rule

1. Ha egy seamhez current-tree closed mapping van, az a contract note-ban kotelezo explicit mappingkent rogzul (nem `deferred`).
2. `deferred mapping` csak olyan terminologyra engedett, amelyhez nincs current-tree closed source anchor (peldaul a `topologySlotCatalog` tenyleges entry-listaja, ami `O3-T3`-ban kerul lockolasra).
3. A 3 mai role exact startup/resume concern-setjeiben hasznalt `promptConcernCatalog` concern-ID-k nem maradhatnak `deferred` helykitoltok: ezeket az `O3-T1`-ben source-anchoroltan le kell zarni; az `O3-T2` csak a kod-szintu formalizalasukat ownershipolja.

### Task Shape

1. Primary: `contract_or_persisted_authority_foundation`.
2. Secondary: nincs.
3. Ez a task nem producer, nem consumer-alignment, nem activation, es nem cleanup task.

### Closed-Contract Drift Check

#### Source Anchors

1. `src/v11/application/actorProtocol/actorRuntimeKernel.ts`
2. `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
3. `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
4. `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
5. `src/v11/shared/actorProtocol/actorEmitContext.ts`
6. `src/v11/shared/actorProtocol/actorEmitContextSupport.ts`
7. `src/v11/shared/state/executionContext.ts`
8. `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
9. `src/types/protocol.ts`
10. `src/types/bubble.ts`
11. `src/cli/commands/agent/emit.ts`
12. `src/config/bubbleConfig.ts`
13. `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
14. `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
15. `src/v11/application/start/startCommandPrompts.ts`
16. `src/v11/application/start/startCommandImplementerPrompts.ts`
17. `src/v11/application/start/startCommandResumePrompts.ts`
18. `src/v11/application/start/startCommandResumeImplementerPrompt.ts`
19. `src/v11/shared/command/agentCommand.ts`
20. `docs/actor-runtime-interface/generic-runtime-kernel-contract-note-v1.md`
21. `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
22. `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`

#### Canonical Elements

1. `AgentRole` zart union baseline (`implementer | reviewer | meta_reviewer`).
2. `ActorOutputKind` zart union baseline (`pass | human_question | convergence | meta_review_result`).
3. `BubbleExecutionContextAwaitedOutputType = pass_result | meta_review_result` mapping.
4. `MetaReviewExecutionContextAwaitedOutputType = meta_review_result` subset.
5. Role-to-awaited-output mapping: `meta_reviewer -> meta_review_result`, otherwise `pass_result`.
6. Runtime kernel + dispatch matrix + adapter map mintazat (`O1-T3`).
7. Topology-neutral delivery/launch ack contract (`O2-T13` closeout).
8. Canonical execution authority context (`execution_context`, `execution_id`, `expected_role`, `expected_round`, `expected_state_fingerprint`).

#### Guard Elements

1. Reviewer active-agent guard (`assertReviewerAuthority`).
2. Reviewer convergence expected-reviewer derivation guard.
3. Meta-reviewer codex-when-present guard (`assertMetaReviewerActiveAgentCodexWhenPresent`).
4. Reviewer-origin `human_question` retained fallback (`assertReviewerHumanQuestionRetainedFallback`).
5. Implementer authority guard (`assertImplementerAuthority`).

#### Compat Elements

1. Nincs uj compat path ebben a slice-ban.
2. A public CLI/output vocabulary read-only downstream compatibility surface marad.

#### Closed Terms

1. `seam` (lookup-pont, ahol az `AgentRole` enum konkret ertekei a current tree-ben szetszivargak)
2. `RoleDescriptor` (belso registry-bejegyzes, **nem** polimorfikus interface)
3. `prompt concern` (reusable vagy grouped instruction-surface projection blokk; mai source lehet kozvetlen helper builder (`build*Guidance`, `build*Line`, `build*Reminder`) vagy grouped builder-local fixed block)
4. `topology slot` (dedikalt pane mapping, mai source: `runtimePaneIndices`)
5. `agent resolution` (`config_bound | hardcoded_runtime`; a role agentje hogyan kerul kiszamitasra)
6. `dedicated panel baseline` (working assumption: egy active role = sajat dedikalt pane; multiplexing deferred post-O3)
7. `configurability compass` (vezérelv: dontesi tradeoff-nal a workflow-konfigurabilitas fele nyitott utat valasztjuk)
8. `preserved-baseline-with-explicit-replacement-path-in-<task>` (mai invariant rogzitett replacement-target task-id-vel)

#### Forbidden Reinterpretations

1. Nem szabad a `RoleDescriptor`-t `RoleHandler` interface-kent atnevezni vagy polimorfikus konstrukciokent leirni.
2. Nem szabad a `promptConcernCatalog`-ot "agent persona/mode/approach" config-ta lapitani.
3. Nem szabad a `topology slot` fogalmat retroaktivan multi-slot vagy reuse-able taxonomiakent prezentalni az `O3-T1`-ben.
4. Nem szabad a public `ActorOutputKind` enumot belso registry-mezokent ujranyitni.
5. Nem szabad a meta-reviewer `assertMetaReviewerActiveAgentCodexWhenPresent` guardot `retained_special` vagy hasonlo "orok kulonlegesseg" cimsko alatt eltuntetni; explicit `agent_resolution: hardcoded_runtime today, replacement-path-in-O3-T4` formaban kell rogziteni.
6. Nem szabad az `agent_resolution` mai `hardcoded_runtime` allapotat `config_bound` alakra mosni a contract note-ban anelkul, hogy a tenyleges runtime guard `O3-T4`-ben replacement proof-ot kapna.
7. Nem szabad a `O1-T1` kernel boundary note vagy az `O2-T1` topology-neutral note zart termjeit reinterpretalni az `O3-T1` szovegen keresztul.
8. Nem szabad az exact awaited-output mappingot (`meta_reviewer -> meta_review_result, else -> pass_result`) optional examplekent kezelni; ez closed baseline.

#### Drift Status

1. `drift_status: closed_contract_preserved_if_exact_role_descriptor_mapping_recorded`

### Authority Fan-out Scan

1. `authority_producer`: nincs ebben a taskban.
2. `persisted_authority`: read-only baseline (`execution_context`).
3. `internal_execution_consumers`: read-only inventory (`actorRuntimeKernel.ts`, `actorRuntimeDispatchMatrix.ts`, `actorProtocolEmitters.ts`).
4. `workflow_orchestration_consumers`: read-only downstream constraint (start/resume prompt composition, execution context derivation, bubble config role binding).
5. `read_model_consumers`: nincs.
6. `cleanup_recovery_consumers`: nincs.

Conclusion: a task bounded marad, mert nincs producer vagy shared-contract code alignment; csak a belso registry-mintazat es a 4 seam dokumentacios lezarasa tortenik.

### Closure-Budget Triage

1. Touched closures:
   - `shared_contract`: igen, docs-only boundary clarification szinten
   - `internal_execution_consumers`: read-only source-anchor inventorykent igen
   - `workflow_orchestration_consumers`: read-only downstream dependencykent igen
2. Intentionally collapsed closure:
   - csak a docs-only `shared_contract` foundation clarification
3. Explicitly deferred closures:
   - `O3-T2`: belso registry + companion catalog kod
   - `O3-T3`: S2 topology slot atkoteses
   - `O3-T4`: S3 config binding + `agent_resolution` migracio
   - `O3-T5`: public CLI/protocol surface (csak konkret igeny eseten)
4. Safe-collapse proof:
   - nincs code mutation,
   - nincs producer vagy public contract migration,
   - a consumer-familyk csak evidence/dependency szerepben jelennek meg.

### Complexity-Risk Gate

1. `authority_risk: 1`
2. `surface_spread: 2`
3. `identity_join_risk: 1`
4. `activation_coupling: 0`
5. `prerequisite_risk: 1`
6. `acceptance_multiplicity: 0`
7. `risk_score: 5`
8. Single-task allowed: igen, docs-only foundation clarification.
9. Authority/source-of-truth note:
   - canonical source: `O1-T1` kernel boundary note + `O2-T1` topology-neutral note + a 4 seam current-tree source anchorai
   - forbidden secondary sources: a public `ActorOutputKind` vagy a CLI parser mint canonical kernel taxonomy
10. Identity/join note:
    - canonical identity path: `AgentRole` zart enum + `ActorOutputKind` zart enum
    - competing identifiers or fallback identities: nincsenek; a registry expliciten ezekre az enumokra epul

### Baseline Preservation

#### must_preserve_behaviors

1. `O1-T1` kernel boundary baseline: canonical execution authority context, generic runtime route/policy matrix, workflow-specific output adapter reteg.
2. `O1-T3` kernel + dispatch matrix + adapter map mintazat.
3. `O2-T1..T13` topology-neutral delivery/executor closure.
4. `assertReviewerHumanQuestionRetainedFallback` retained fallback.
5. `assertMetaReviewerActiveAgentCodexWhenPresent` runtime guard (preserved-baseline-with-explicit-replacement-path-in-O3-T4).
6. `bubbleConfig.ts` "implementer !== reviewer" enforce-olt konvencio (preserved-baseline-with-explicit-replacement-path-if-needed).
7. Dedicated-panel-per-active-role baseline (preserved as working assumption ebben a korben; topology variation post-O3).

#### allowed_resolution_paths

1. Explicit terminology mapping a zart source anchorok es az uj `RoleDescriptor` regisztre fogalmai kozott.
2. Explicit name-binding a meglevo catalog-elemekre (`actorRuntimePolicyCheckCatalog` ID-k, `actorRuntimeAdapterExecutors` ID-k).
3. Companion catalog naming proposal (`promptConcernCatalog`, `topologySlotCatalog`) **kod nelkul**.
4. `agent_resolution` mezo a descriptoron: `config_bound | hardcoded_runtime`, mai allapot rogzitett, replacement-target `O3-T4`.

#### forbidden_regression_interpretations

1. A reviewer fallback nem tunhet el "generic cleanup" cimsko alatt.
2. A meta-reviewer codex guard nem lazulhat "role-neutrality" vagy "uniform configurability" cimsko alatt; explicit `O3-T4`-ben replacement proof.
3. A `O1-T1` kernel boundary zart termjei nem reinterpretalhatok az `O3-T1` szovegen keresztul.
4. A `O2-T13` topology-neutral closure nem nyithato ujra `O3` hatara alatt.
5. A `RoleDescriptor` nem lehet polimorfikus interface vagy implementation-bundle.

#### replacement_proof_required_if_removed

1. Barmely preserved baseline branch removed/renamed csak kulon successor task explicit replacement proofjaval engedheto meg.
2. A `assertMetaReviewerActiveAgentCodexWhenPresent` runtime guard atalakitasahoz `O3-T4` task explicit replacement proof + uniform `agent_resolution: config_bound` mappingot kell tartalmazzon mind a 3 role-on.

### Deliverables

1. `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task1-onboarding-extension-surface-contract-clarification.md`
   - primary task artifact
2. `docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md`
   - kotelezo szekciok:
     - Purpose
     - Normative References
     - Working Terminology (role/agent/runner/output kind/prompt concern/topology slot/agent resolution/seam)
     - Configurability Compass (vezérelv)
     - Current-Tree Coupling Inventory
     - The Four Seams Source-Anchored Inventory (table)
     - Closed Baseline Vocabulary Matrix (table)
     - Proposed Internal RoleDescriptor Registry Boundary (mezok + szemantika + source-anchor)
     - Proposed Companion Catalogs (`promptConcernCatalog`, `topologySlotCatalog`) - naming proposal kod nelkul
     - Per-Role Descriptor Closed Mapping (3 role x 9 mezo)
     - Preserved Baselines
     - Explicit Downstream Constraints
     - Sequencing Consequences (`O3-T2..T5` gating table)
3. `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - frissitett `Opportunity Disposition` szekcio `Opportunity 3` entry-vel (task path, contract note path, T2..T5 gating)
   - frissitett `Recommended Sequencing` szekcio
   - frissitett `Traceability` `Current source anchors` lista (uj note path)

### Completion Checks

1. A task artifact docs-only contract clarification slice-kent zarul, nem runtime/CLI/protocol modositassal.
2. A note explicit `RoleDescriptor` mezohalmaz table-t ad legalabb 9 mezovel, source-anchor referenciakkal.
3. A note explicit closed-mapping table-t ad mindharom mai role-ra (`implementer`, `reviewer`, `meta_reviewer`) mind a 9 mezovel, es a `startup_prompt_concern_ids` / `resume_prompt_concern_ids` mezok exact ordered concern-setkent szerepelnek.
4. A note explicit phasing table-t ad `O3-T2..T5`-hoz, slice id + shape + goal + closure bucket + gating felteteleivel.
5. A note explicit Source-Anchored 4-seam inventoryt ad table-formaban.
6. A note explicit Configurability Compass vezérelvet rogzít.
7. A note explicit `promptConcernCatalog` naming proposal table-t ad, amely minden hasznalt concern ID-hoz current-tree source anchort rendel, akkor is, ha a concern jelenleg grouped builder-local fixed block.
8. A note explicit `agent_resolution` `hardcoded_runtime` -> `config_bound` migracios pathot rogzít `O3-T4`-re.
9. A parent plan `Opportunity Disposition` `Opportunity 3` entry-je az uj task path-ara es a uj note path-ara mutat, plusz a T2..T5 gating-et explicit nevesiti.
10. A parent plan `Recommended Sequencing` szekcioja az `O3-T1`-et a kovetkezo bounded successor-kent jeloli, az `O3-T2..T5` lane-eket explicit gatinggel.
11. A parent plan `Traceability` `Current closeout anchors` vagy `Current source anchors` listaja az uj task path-at es az uj note path-at tartalmazza.

## L2 - Evidence and Review

### Must-Use Evidence

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` | P1 | required-now |
| must-use | `docs/actor-runtime-interface/generic-runtime-kernel-contract-note-v1.md` | P1 | required-now |
| must-use | `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md` | P1 | required-now |
| must-use | `docs/actor-runtime-interface/execution-authority-contract-note-v1.md` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/actorRuntimeKernel.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/executionContext.ts` | P1 | required-now |
| must-use | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | P1 | required-now |
| must-use | `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts` | P1 | required-now |
| must-use | `src/config/bubbleConfig.ts` | P1 | required-now |
| must-use | `src/types/bubble.ts` | P1 | required-now |
| must-use | `src/types/protocol.ts` | P1 | required-now |
| must-use | `src/cli/commands/agent/emit.ts` | P1 | required-now |
| must-use | `src/v11/application/start/startCommandPrompts.ts` | P1 | required-now |
| must-use | `src/v11/application/start/startCommandImplementerPrompts.ts` | P1 | required-now |
| must-use | `src/v11/application/start/startCommandResumePrompts.ts` | P1 | required-now |
| must-use | `src/v11/application/start/startCommandResumeImplementerPrompt.ts` | P1 | required-now |
| must-use | `src/v11/shared/command/agentCommand.ts` | P1 | required-now |

### Must-Not-Use

1. Barmilyen jovobeli plugin/runtime composition feltetelezes code evidence nelkul.
2. `O3-T2..T5` scope elorehozasa.
3. Public CLI rewrite vagy protocol taxonomy rewrite.
4. Topology slot reuse vagy multiplexing minta bevezetese.
5. "Agent persona/mode/approach" tipusu config-shape.

### Review Focus

1. A task maradjon bounded docs-only contract clarification.
2. A 4 seam (S1..S4) source-anchored inventoryja maradjon explicit es teljes.
3. A `RoleDescriptor` mezohalmaza maradjon zart (9 mezo) es source-anchored.
4. A `startup_prompt_concern_ids` es `resume_prompt_concern_ids` ne maradjanak `deferred` helykitoltok: exact ordered concern-set kell, explicit `(conditional)` jelolessel ott, ahol a current tree input-gated overlayt hasznal.
5. A `agent_resolution` mezo `hardcoded_runtime` -> `config_bound` migracios pathja explicit `O3-T4`-re mutasson, ne tunjon el "configurability compass" cimsko alatt.
6. A meta-reviewer `assertMetaReviewerActiveAgentCodexWhenPresent` guard explicit preserved-baseline-with-explicit-replacement-path-in-O3-T4 maradjon.
7. A reviewer/implementer "must be different" konvencio explicit preserved-baseline-with-explicit-replacement-path-if-needed maradjon (nem domain-invariant cimsko alatt eltuntetheto).
8. A companion catalog (`promptConcernCatalog`, `topologySlotCatalog`) naming proposalkent zarjon, **kod nelkul** ebben a slice-ban.
9. A phasing table (`O3-T2..T5`) gating-feltetelei explicit es testable formaban szerepeljenek.
10. Az `O3-T5` trigger-feltetel ("konkret uj output kind igeny vagy uj role saját kimenettel") explicit szerepeljen, automatikus indulas nelkul.

### Hardening Backlog

No open later-hardening items.
