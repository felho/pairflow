---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity3_task2_internal_role_capability_foundation_v1
title: "Actor Runtime Interface Opportunity 3 Task 2: Internal Role/Capability Foundation"
status: draft
phase: post-phaseE
target_files:
  - src/v11/application/actorProtocol/roleDescriptorRegistry.ts
  - src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts
  - src/v11/shared/state/executionContext.ts
  - src/v11/application/start/startCommandPrompts.ts
  - src/v11/application/start/startCommandImplementerPrompts.ts
  - src/v11/application/start/startCommandResumePrompts.ts
  - src/v11/application/start/startCommandResumeImplementerPrompt.ts
  - tests/core/state/executionContext.test.ts
  - tests/core/runtime/metaReviewSubmitGuidance.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/application/start/startCommandImplementerPrompts.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 3 Task 2: Internal Role/Capability Foundation

## Current Codebase Check (2026-04-25)

1. Az `O3-T1` docs-only clarification lezart es `main`-re merge-olt:
   - task artifact: `plans/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task1-onboarding-extension-surface-contract-clarification.md`
   - normative note: `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
2. Az `O3-T1` note mar normativan lockolja:
   - a `RoleDescriptor` exact 9 mezos mezohalmazat,
   - a `promptConcernCatalog` concern-vocabularyt,
   - a 3 mai role exact ordered `startup_prompt_concern_ids` es `resume_prompt_concern_ids` concern-setjeit,
   - valamint az `O3-T2..T5` sequencing/gating szabalyait.
3. A current tree-ben az `AgentRole` role-derived lookupok tovabbra sincsenek egyetlen internal registry-seam ala huzva:
   - S1: `src/v11/shared/state/executionContext.ts::resolveAwaitedOutputTypeForRole`
   - S4: `src/v11/application/start/startCommandPrompts.ts`
   - S4: `src/v11/application/start/startCommandImplementerPrompts.ts`
   - S4: `src/v11/application/start/startCommandResumePrompts.ts`
   - S4: `src/v11/application/start/startCommandResumeImplementerPrompt.ts`
4. A `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts` current-tree szinten mar tartalmaz explicit policy catalogot es route matrixot, de nincs mellette olyan belso role registry, amely a role-level vocabulary-t es prompt concern ownershipot compile-time zarja egy helyre.
5. Az `Opportunity 3` parent plan es a `O3-T1` note szerint az `O3-T2` closure-ja szandekosan szuk:
   - `shared_contract` + `authority_producer` foundation,
   - S1 (`awaited output`) + S4 (`prompt composition`) registry-re kotese,
   - a lockolt concern-vocabulary kod-szintu formalizalasa,
   - **nem** topology slot (`O3-T3`),
   - **nem** config binding / `BubbleAgentsConfig` shape (`O3-T4`),
   - **nem** public CLI/protocol/output-kind nyitas (`O3-T5`).

## L0 - Policy

### Goal

1. Vezessunk be egy belso `RoleDescriptor` registry-seamet, amely kod szinten formalizalja az `O3-T1` note-ban mar lockolt role/capability truthot.
2. Vezessunk be egy belso `promptConcernCatalog`-ot es a hozza tartozo `PromptConcernId` vocabulary-t pontosan az `O3-T1` note source-anchorolt concern-listaja alapjan, ujraertelmezes nelkul.
3. Kossuk at az S1 awaited-output lookupot es az S4 startup/resume prompt compositiont registry/projection helper olvasasra ugy, hogy a current-tree viselkedes byte-for-byte vagy szemantikusan ekvivalens maradjon.
4. Ne nyissuk ujra a topology, config vagy public protocol closure-t; az `O3-T2` foundation task, nem onboarding vegallapot.

### Domain / Control Model Summary

1. Business invariant:
   - a runtime boundary tovabbra sem birtokol workflow state progressiont, bubble authority resolutiont vagy lifecycle ownershipot;
   - a `RoleDescriptor` registry belso definicios seam, nem uj public contract.
2. Control model:
   - a role-level truth source-of-truth-ja kod szinten egy belso readonly registry lesz;
   - a hivok projection helperen keresztul olvasnak, nem kozvetlenul a registry shape-et importalva szetszorva a kodbazisban.
3. Read-path rule:
   - az `O3-T1` note exact mezohalmaza, concern-vocabularyja es per-role ordered concern-setje a normativ input;
   - az `O3-T2` ezt kodba emeli at, nem tervezesi brainstormingkent kezeli ujra.
4. Forbidden fallback:
   - tilos az `O3-T1`-ben lockolt `PromptConcernId` vocabulary bovitese vagy atnevezese explicit docs update nelkul;
   - tilos a prompt composition refaktorja kozben szerepkori instrukciokat "atlagos" kozos helperbe olvasztani, ha ezzel a role-specific exact ordered concern-set lazul;
   - tilos az `AgentRole`, `ActorOutputKind`, `BubbleAgentsConfig` vagy CLI parser public surface-et erinteni;
   - tilos az `O3-T2` cimke alatt topology slot vagy tmux-delivery routing refaktort behuzni.
5. Allowed resolution path:
   - uj internal source file bevezetese a registry es a prompt concern catalog szamara;
   - S1 es S4 call-site-ok atallitasa projection helper olvasasra;
   - a meglevo builder funkciok retained megtartasa, ha a registry-driven compose igy tisztabban es kisebb blast radiusszal megvalosithato.
6. Missing-data rule:
   - ha egy role-hoz, concern-ID-hez vagy helper projectionhoz nincs pontos `O3-T1` note-beli source-anchorolt mapping, a task nincs keszen;
   - ilyenkor docs clarification kell, nem opportunista kodbeli talalgatas.
7. Phase boundary:
   - this task owns: internal role/capability foundation, prompt concern catalog formalization, S1 + S4 rewiring;
   - explicit successor: `O3-T3` owns S2 topology slot binding;
   - explicit successor: `O3-T4` owns S3 config binding es `agent_resolution` teljes `config_bound` konvergenciaja;
   - explicit successor: `O3-T5` owns public CLI/protocol/output-kind nyitas trigger-feltetellel.

### Plan Linkage

1. Parent plan source:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Normative predecessor:
   - `plans/tasks/actor-runtime-interface/actor-runtime-interface-opportunity3-task1-onboarding-extension-surface-contract-clarification.md`
   - `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
3. This task closes:
   - `Opportunity 3 / O3-T2`
4. Depends on:
   - `O3-T1` merged and closed
   - `O1-T1` kernel boundary baseline preserved
   - `O2-T1` topology-neutral delivery/executor baseline preserved
5. Unlocks:
   - `O3-T3` minimal topology slot alignment
   - `O3-T4` config/state onboarding alignment
   - optional `O3-T5` public onboarding surface, only if trigger later exists

### Canonical Contract Anchors

1. Docs/source anchors:
   - `plans/actor-runtime-interface-onboarding-extension-surface-contract-note-v1.md`
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-opportunity3-onboarding-discovery-summary-v1.md`
2. Current code anchors:
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - `src/v11/application/start/startCommandPrompts.ts`
   - `src/v11/application/start/startCommandImplementerPrompts.ts`
   - `src/v11/application/start/startCommandResumePrompts.ts`
   - `src/v11/application/start/startCommandResumeImplementerPrompt.ts`
   - `src/v11/application/start/startCommandPromptRuntime.ts`
   - `src/v11/application/start/startCommandWorkspacePromptLines.ts`
   - `src/v11/application/start/startCommandResumePromptShared.ts`
   - `src/v11/shared/reviewer/reviewerSeverityOntology.ts`
   - `src/v11/shared/reviewer/testEvidence.ts`
   - `src/v11/shared/reviewer/reviewerGuidance.ts`
   - `src/v11/shared/reviewer/reviewerScoutExpansionGuidance.ts`
   - `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts`
   - `src/v11/shared/reviewer/reviewerBrief.ts`
   - `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts`
3. Canonical elements locked by `O3-T1` and consumed here:
   - `RoleDescriptor` exact field set
   - `PromptConcernId` exact vocabulary
   - per-role exact ordered startup/resume concern-setek
   - preserved baselines:
     - `assertReviewerHumanQuestionRetainedFallback`
     - `assertMetaReviewerActiveAgentCodexWhenPresent`
     - dedicated-panel-per-active-role baseline
     - `meta_reviewer -> meta_review_result`, otherwise `pass_result`

### Scope Reality / Shape Proof

1. Declared task shape:
   - primary: `contract_or_persisted_authority_foundation`
   - secondary: `authority_producer`
2. Miert ez a helyes shape:
   - a registry es a prompt concern catalog egy uj belso foundation seamet vezet be, downstream public activation nelkul;
   - az S1 awaited-output consume registry-owned projectionre kerul, ami indokolt adjacent `authority_producer` shape;
   - az S4 prompt compose atkotese ugyanennek a foundation cutovernek a resze, nem kulon consumer-family rollout;
   - nincs workflow state schema, delivery topology vagy public read-model migration.
3. Mutation entrypoints:
   - `resolveAwaitedOutputTypeForRole(...)`
   - a startup/resume prompt builderek role-specific concern compose pontjai
4. Hidden scope ruled out:
   - `src/v11/infrastructure/channel/tmux/**` nem `O3-T2`
   - `src/config/bubbleConfig.ts` es `src/types/bubble.ts` config-shape nem `O3-T2`
   - `src/types/protocol.ts` es `src/cli/commands/agent/emit.ts` nem `O3-T2`
5. Drift control:
   - a task csak olyan role/capability truthot vihet uj registrybe, amelyet az `O3-T1` note mar explicitten lockolt.

### Complexity-Risk Triage

1. `authority_risk`: `2`
   - az `O3-T2` uj internal source-of-truth seamet vezet be role/capability projectionhoz, de public authority contractot nem nyit ujra.
2. `surface_spread`: `2`
   - a bounded slice tobb kozeli, de kulon file-csaladot erint:
     - `actorProtocol`
     - `executionContext`
     - startup/resume prompt builderek
     - kapcsolodo drift/parity tesztek
3. `identity_join_risk`: `1`
   - role -> awaited-output es role -> prompt-concern join explicitte valik, de nincs uj public identity-vocabulary vagy cross-system join.
4. `activation_coupling`: `0`
   - nincs uj activation/read-model/public surface; a startup/resume prompt parity retained marad.
5. `prerequisite_risk`: `1`
   - az `O3-T1` exact note lockja elo-feltetel; ha ott nincs eleg pontossag, az `O3-T2` blockerre fut.
6. `acceptance_multiplicity`: `1`
   - tobb parity-feluletet kell egyszerre vedeni:
     - S1 awaited-output
     - implementer/reviewer/meta-reviewer prompt compose
     - actor protocol retained guards
7. `risk_score`: `7`
8. Split decision:
   - a score alapjan tovabbi split csak akkor kellene, ha a prompt compose consume kulon consumer-family rolloutta valna;
   - a current tree-ben azonban a registry formalization + S1 lookup + S4 prompt compose ugyanazon bounded internal source-of-truth cutover resze, kulon read-model vagy config fallout nelkul;
   - emiatt az `O3-T2` egy taskkent megtarthato, de csak a closure-budget explicit korlataival.

### Closure-Budget Triage

1. Materially touched closure bucketek:
   - `shared_contract`
   - `authority_producer`
   - szukitett `internal_execution_consumers`
2. `shared_contract`
   - a `RoleDescriptor`, `PromptConcernId`, `promptConcernCatalog` es projection helper boundary itt formalizalodik.
3. `authority_producer`
   - az S1 awaited-output truth registry projectionre kerul.
4. Szukitett `internal_execution_consumers`
   - a startup/resume prompt builder family a registry/concern projection consume-jara all at, de ez ugyanazon internal prompt-producer csaladban marad.
5. Intentionally collapsed closures:
   - `shared_contract` + `authority_producer` + a fenti szukitett internal prompt consume
6. Miért safe ez a collapse:
   - ugyanaz a bounded source-of-truth cutover zarja oket;
   - ugyanazokat a preserved baseline-okat vedik;
   - nincs kulon public compat vagy read-model truth-felulet;
   - nincs persisted schema/config contract vagy topology consume ugyanebben a fazisban.
7. Explicitly deferred closures:
   - `workflow_orchestration_consumers`
   - `read_model_consumers`
   - `persisted_authority_or_schema`
   - `cleanup_recovery_consumers`
   - topology consume (`O3-T3`)
   - config contract consume (`O3-T4`)
   - public onboarding/read-model consume (`O3-T5`)

### Authority Boundary Map

1. `shared_contract`
   - `RoleDescriptor` tipus
   - `roleDescriptorRegistry`
   - `PromptConcernId` union
   - `promptConcernCatalog`
   - projection helper API-k
2. `authority_producer`
   - `executionContext.ts` S1 lookup consume
   - startup/resume prompt compose consume
   - szukseges es indokolt esetben `actorRuntimeDispatchMatrix.ts` role-policy projection consume
3. `internal_execution_consumers`
   - explicit out of scope ebben a taskban, kiveve amennyiben valamely consumer csak a registry projection helper importjara all at S1/S4-hez kapcsolodoan
4. `workflow_orchestration_consumers`
   - explicit out of scope
5. `read_model_consumers`
   - explicit out of scope
6. Export surfaces closed in this phase:
   - nincs public export closure ebben a taskban;
   - a registry/catalog boundary internal marad.

### Baseline Preservation

1. Must-preserve viselkedesek:
   - `resolveAwaitedOutputTypeForRole(meta_reviewer) -> meta_review_result`
   - `resolveAwaitedOutputTypeForRole(implementer|reviewer) -> pass_result`
   - a reviewer startup/resume es implementer startup/resume promptok exact concern-sorrendje az `O3-T1` note szerint
   - a meta-reviewer startup/resume static wait-for-signal contractja
   - a reviewer document-only guardrail conditional overlay-ja
   - a reviewer brief / focus bridge / kickoff diagnostic conditional overlay-k jelenlegi gatingje
2. Preserved guards:
   - `assertReviewerHumanQuestionRetainedFallback`
   - `assertMetaReviewerActiveAgentCodexWhenPresent`
3. Forbidden regressziok:
   - a prompt compose registry-drivenne tetelevel nem tunhetnek el ma letezo role-specific blokkok;
   - a concern-ID catalog nem rejthet el olyan builder-local fixed blockot, amely elvesziti a current-tree exact orderinget;
   - a registry bevezetese nem vezethet "best effort" fallback concern rendereleshez.

### In Scope

1. `roleDescriptorRegistry.ts` (vagy ezzel ekvivalens, a taskon belul rogzitett path) bevezetese.
2. A `RoleDescriptor` es kapcsolodo belso tipusok kod-szintu formalizalasa pontosan az `O3-T1` note alapjan.
3. A `promptConcernCatalog` es `PromptConcernId` zart literal vocabulary bevezetese pontosan az `O3-T1` note concern-listaja alapjan.
4. Projection helper-ek bevezetese legalabb ezekre:
   - awaited output
   - authority policy check
   - startup prompt concerns
   - resume prompt concerns
   - opcionisan handoff-id format es active-agent constraint, ha ez tisztan a registryben tarthato blast radius noveles nelkul
5. Az S1 lookup atallitasa helper-based registry olvasasra.
6. Az S4 startup/resume prompt compose atallitasa helper-based concern renderelesre.
7. A relevans tesztek frissitese es/vagy uj tesztek hozzaadasa a registry/catalog drift ellen.

### Out of Scope

1. S2 topology slot consume:
   - `tmuxManager.ts::runtimePaneIndices`
   - `tmuxDeliveryTargeting.ts`
2. S3 config binding / `BubbleAgentsConfig` shape migration.
3. Public CLI/protocol/output-kind vocabulary bovitese.
4. Uj `AgentRole` vagy uj `ActorOutputKind` ertek.
5. `Agent persona/mode/approach` vagy schema-driven workflow config rendszer.
6. A prompt concern vocabulary docs-beli bovitesenek ownershipja.
7. Nagy dispatch-matrix rewrite, ha az nem szukseges a registry-owned policy lookup koherenciajahoz.

### Safety Defaults

1. Additive internal foundation elv:
   - a task uj internal seamet vezet be, de a current tree kulso viselkedeset nem torheti el.
2. Fail-closed drift policy:
   - ismeretlen role vagy concern ID esetere explicit error legyen, ne silent skip.
3. Small-blast-radius rule:
   - a prompt builder retained helperjei maradhatnak, ha ez csokkenti a regresszio-kockazatot;
   - a cel nem a teljes prompt-generation framework ujraepitese.
4. Docs precedence:
   - ha a kod refaktor es az `O3-T1` note kozott ellentmondas latszik, a task megall es docs clarification kell.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - internal `RoleDescriptor` registry boundary
   - internal `promptConcernCatalog` boundary
   - S1 awaited-output lookup consume
   - S4 prompt composition consume
3. Blast radius:
   - `src/v11/application/actorProtocol/**`
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/application/start/**`
   - kapcsolodo state/actor/start tesztek

### Verification Expectations

1. Minimum verification before closure:
   - `pnpm build`
   - `pnpm test -- --runInBand tests/core/state/executionContext.test.ts`
   - `pnpm test -- --runInBand tests/core/runtime/metaReviewSubmitGuidance.test.ts`
   - `pnpm test -- --runInBand tests/core/bubble/startBubble.test.ts`
   - `pnpm test -- --runInBand tests/v11/application/start/startCommandImplementerPrompts.test.ts`
   - `pnpm test -- --runInBand tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`
2. A reviewer/meta-reviewer prompt parity nem tekintheto lefedettnek csak implementer-level tesztekkel:
   - reviewer startup/resume concern-order vagy conditional overlay valtozas eseten existing reviewer prompt-consumer coverage-et frissiteni kell;
   - meta-reviewer startup prompt concern-order valtozas eseten a shared submit-guidance parity coverage kotelezo;
   - meta-reviewer resume concern-order vagy gating valtozas eseten existing resume consumer coverage-et kell frissiteni, legalabb `tests/core/bubble/startBubble.test.ts` RUNNING-resume utvonalon, vagy ezzel ekvivalens dedikalt proof testtel.
3. Ha a prompt compose drift mas start teszteket is erint, a relevans `tests/v11/application/start/**` celzott futtatas kotelezo.
4. Snapshot/szoveges parity evidence kotelezo ott, ahol a registry-driven prompt compose exact line orderinget valthat ki.

## L1 - Change Contract

### Required Deliverables

1. Belso registry source file, amely legalabb ezt tartalmazza:
   - `RoleDescriptor`
   - `RoleAgentResolution`
   - `PromptConcernId`
   - `PromptConcernBuilder` vagy ezzel ekvivalens concern-renderer tipus
   - `roleDescriptorRegistry`
   - `promptConcernCatalog`
   - projection helper-ek
2. A registry exact per-role entry-i az `O3-T1` note `Per-Role Descriptor Closed Mapping` szekcioja alapjan.
3. Az exact `PromptConcernId` set az `O3-T1` note `Proposed Companion Catalogs / promptConcernCatalog` tablaja alapjan.
4. Az S1 helper consume az `executionContext.ts`-ben.
5. Az S4 helper consume a startup/resume prompt builder family-ben.

### Registry Contract

1. A registry tipusa `Readonly<Record<AgentRole, RoleDescriptor>>` vagy ezzel compile-time ekvivalens shape legyen.
2. A registry-bejegyzesek nem tarthatnak nyers prompt szoveget; csak ID-ket, lookup metadata-t es zart vocabulary-tenyeket.
3. A registry nem lehet class-hierarchia, strategy object graph vagy polymorphic role handler interface.
4. A projection helper API legyen a hivoi consume surface; a legtobb hivo ne importalja kozvetlenul a teljes registry rekordot.

### Prompt Concern Contract

1. A `PromptConcernId` vocabulary pontosan az `O3-T1` note-ban lockolt ID-kre epul.
2. Egy concern entry lehet:
   - kozvetlen reusable helper builder referencia;
   - grouped builder-local fixed block renderer;
   - parameterized overlay builder, ha a current tree-ben is input-gated concernkent letezik.
3. A concern catalog formalizalasa nem moshatja ossze:
   - always-on fixed block,
   - conditional overlay,
   - role-specific instruction,
   - reusable shared reminder
   kategoriakat oly modon, hogy a renderelesi sorrend vagy gating implicitte valjon.
4. A role startup/resume concern-listak exact sorrendje a descriptorben legyen kod szinten olvashato es tesztelheto.

### Awaited Output Contract

1. Az S1 projection helpernek a current-tree awaited-output truthot kell visszaadnia:
   - `meta_reviewer -> meta_review_result`
   - minden mas jelenlegi role -> `pass_result`
2. Az `executionContext.ts` nem tarthat fenn kulon hardcoded role switch-et ugyanarra a truthra, ha mar a registry ezt owns-olja.
3. A cross-cutting `human_question` nem valhat `primary_awaited_output_type` reszeve.

### Prompt Compose Contract

1. A startup/resume prompt builderek role-specific promptjait a concern catalog es a descriptor concern-listai alapjan kell osszerakni.
2. A current helper-ek retained megtarthatok, ha:
   - a concern catalog ezekre explicitten hivatkozik,
   - a per-role ordering a descriptorben zarva marad,
   - a rendereles blast radiusa kisebb, mint egy teljes helper-szetszedesnel.
3. A conditional concern-ek gatingje explicit marad:
   - kickoff diagnostic
   - reviewer brief overlay
   - reviewer focus bridge overlay
   - document-only reviewer guardrail
   - barmely egyeb, az `O3-T1` note-ban conditionalnak jelolt concern
4. A task nem akkor kesz, ha "nagyjabol ugyanaz a prompt", hanem akkor, ha a registry/catalog alapu compose a lockolt concern-setet es orderinget tenylegesen lekepzi.

### Dispatch Matrix Interaction Rule

1. Az `actorRuntimeDispatchMatrix.ts` ebben a taskban csak annyiban erintheto, amennyiben:
   - a registry-owned `authority_policy_check_id` vagy `active_agent_constraint_id` consume koherenciaja ezt indokolja,
   - es a public input/output route truth nem valtozik.
2. Tilos az outer dispatch route matrix teljes szerkezeti ujranyitasa vagy output-kind generalizalasa.
3. A reviewer human-question retained fallback es a meta-reviewer active-agent guard preserved baseline marad.

### Test Contract

1. Legyen legalabb egy olyan drift test, amely bizonyitja, hogy a role -> awaited output projection helper teljesen lefedi a jelenlegi role vocabularyt.
2. Legyen prompt-level drift evidence legalabb az implementer, reviewer es meta-reviewer oldalon arra, hogy az ordered concern compose nem lazult.
3. Reviewer oldalon a proof nem lehet pusztan implementer prompt teszt:
   - vagy dedikalt reviewer prompt-level coverage kell,
   - vagy egy ezzel ekvivalens existing prompt-consumer tesztet kell frissiteni, amely a reviewer startup/resume injection parityt tenylegesen bizonyitja.
4. Meta-reviewer oldalon a proof nem lehet hallgato lag:
   - a `buildMetaReviewerStartupPrompt` shared submit-guidance parity coverage retained maradjon;
   - ha a startup concern-order compose valtozik, ehhez parity assertion vagy explicit uj teszt kotelezo;
   - ha a `buildResumeMetaReviewerStartupPrompt` concern-order vagy conditional compose valtozik, existing RUNNING-resume consumer coverage-et kell bovitni vagy dedikalt resume parity tesztet kell adni.
5. Az actor protocol runtime tesztjei maradjanak zoldben; ez bizonyitja, hogy a belso registry seam nem tor el retained authority/runtime routingot.

## L2 - Implementation Notes (Optional)

1. Javasolt minimalis file ownership:
   - `roleDescriptorRegistry.ts`: tipusok, registry, concern catalog, projection helper-ek
   - `executionContext.ts`: S1 projection consume
   - `startCommand*Prompts*.ts`: S4 projection consume
2. A concern renderer nem kell, hogy "univerzalis prompt DSL" legyen.
3. A legegyszerubb elfogadhato forma:
   - descriptor -> ordered concern ID array
   - concern ID -> line/block renderer
   - startup/resume builder -> concern render pipeline + conditional overlays
4. Ha a registry file tul nagyra no, kis belso helper file-ok nyithatok, de az ownership tovabbra is ugyanebben a bounded taskban maradjon, `src/v11/application/start/**` vagy `src/v11/application/actorProtocol/**` csaladon belul.

## Hardening Backlog (Optional)

1. Kulon registry-focused unit test file nyithato, ha a meglvo state/start/actor protocol tesztek nem adnak eleg olvashato drift coverage-et.
2. Ha a prompt concern compose miatt snapshot-szeru string parity ellenorzes tunik a legrobosztusabbnak, az elfogadhato, de csak akkor, ha a snapshot a concern-order driftet tenylegesen vedheti.

## Review Control

1. Reviewernek kotelezo osszevetni:
   - a bevezetett `PromptConcernId` vocabulary-t az `O3-T1` note tablajaval,
   - a per-role concern-listakat az `O3-T1` note `Per-Role Descriptor Closed Mapping` szekciojaval.
2. Review reject, ha:
   - uj concern ID jelent meg docs update nelkul;
   - barmely concern sorrendje valtozott explicit normativ indok nelkul;
   - `src/config/bubbleConfig.ts`, `src/types/protocol.ts`, `src/cli/commands/agent/emit.ts` vagy `src/v11/infrastructure/channel/tmux/**` scope-ba csuszott a diff;
   - a prompt refaktor miatt retained role-specific instruction blokk eltunt vagy osszemosodott.
3. Approval only if:
   - az S1 es S4 consume mar registry/projection helperen ul;
   - a preserved guards megvannak;
   - a build + targeted tests futottak.

## Spec Lock

1. `RoleDescriptor` mezohalmaz: az `O3-T1` note `Proposed Internal RoleDescriptor Registry Boundary` szekcioja a lock.
2. `PromptConcernId` vocabulary: az `O3-T1` note `Proposed Companion Catalogs / promptConcernCatalog` tablaja a lock.
3. Per-role ordered concern-setek: az `O3-T1` note `Per-Role Descriptor Closed Mapping` szekcioja a lock.
4. Sequencing boundary: az `O3-T1` note `Sequencing Consequences` szekcioja a lock.

## Assumptions

1. Az `O3-T1` docs clarification elegendoen pontos ahhoz, hogy az `O3-T2` ne igenyeljen ujabb docs-only eloszeletet.
2. A current prompt builder family retained helper-szerkezete eleg ahhoz, hogy a concern catalog bevezetese incremental refaktorral megtortenjen.
3. A topology slot es config binding explicit kulon ownershipe miatt az `O3-T2` biztonsagosan lezarhato S2/S3 consume nelkul.

## Open Questions

1. Nincs nyitott strategiai kerdes ebben a taskban; ha a kodba emeles soran az `O3-T1` note es a current tree kozott ellentmondas latszik, az blocker es vissza kell menni docs clarificationra.
