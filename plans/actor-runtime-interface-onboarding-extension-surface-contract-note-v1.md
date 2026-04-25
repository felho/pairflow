---
artifact_type: note
artifact_id: note_actor_runtime_interface_onboarding_extension_surface_contract_v1
title: "Actor Runtime Interface Onboarding/Extension Surface Contract Note"
status: active
updated_at: 2026-04-25
owners:
  - "felho"
---

# Note: Actor Runtime Interface Onboarding/Extension Surface Contract

## Purpose

1. Ez a note az `Opportunity 3 / O3-T1` docs-only outputja a belso onboarding/extension-surface boundary explicitte tetelehez.
2. Nem replacement artifact a `O1-T1` kernel boundary note vagy a `O2-T1` topology-neutral delivery/executor note helyett, hanem rajuk epulo **belso registry-mintazat normativ szerzodese**:
   - a 4 seam, ahol az `AgentRole` enum konkret ertekei a current tree-ben szetszivargak, source-anchored inventoryt kap,
   - egy belso `RoleDescriptor` registry mezohalmaz lockolasra kerul, amely a meglevo catalog-pattern (`actorRuntimePolicyCheckCatalog`, `actorRuntimeAdapterExecutors`) mintajara mukodik,
   - a 3 mai role (`implementer`, `reviewer`, `meta_reviewer`) closed-mapping matrixot kap az uj descriptor mezokkel,
   - a `O3-T2..T5` phasing gating-felteteleivel rogziti.
3. A note addig normativ az `O3-T2..T5` elokesziteseben, amig explicit successor artifact maskepp nem rendelkezik.

## Normative References

1. Sequencing owner:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Preserved baselines:
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md` (`O1-T1` kernel boundary)
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md` (`O2-T1` topology-neutral delivery/executor boundary)
   - `plans/actor-runtime-interface-execution-authority-contract-note-v1.md` (canonical execution authority baseline)
3. Historical predecessor:
   - `plans/actor-runtime-interface-opportunity3-onboarding-discovery-summary-v1.md`
4. Current-tree source anchors (kernel + dispatch + adapter):
   - `src/v11/application/actorProtocol/actorRuntimeKernel.ts`
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
5. Current-tree source anchors (4 seam):
   - S1: `src/v11/shared/state/executionContext.ts`
   - S2: `src/v11/infrastructure/channel/tmux/tmuxManager.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - S3: `src/config/bubbleConfig.ts`, `src/types/bubble.ts`
   - S4: `src/v11/application/start/startCommandPrompts.ts`, `src/v11/application/start/startCommandImplementerPrompts.ts`, `src/v11/application/start/startCommandResumePrompts.ts`, `src/v11/application/start/startCommandResumeImplementerPrompt.ts`, `src/v11/shared/command/agentCommand.ts`
6. Current-tree source anchors (prompt concern helper families):
   - `src/v11/application/start/startCommandWorkspacePromptLines.ts`
   - `src/v11/application/start/startCommandPromptRuntime.ts`
   - `src/v11/application/start/startCommandResumePromptShared.ts`
   - `src/v11/shared/reviewer/reviewerSeverityOntology.ts`
   - `src/v11/shared/reviewer/reviewerGuidance.ts`
   - `src/v11/shared/reviewer/reviewerScoutExpansionGuidance.ts`
   - `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts`
   - `src/v11/shared/reviewer/testEvidence.ts`
   - `src/v11/shared/reviewer/reviewerBrief.ts`
   - `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts`
7. Current-tree source anchors (public surface, read-only):
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`

## Working Terminology

| Term | Definition | Boundary disposition |
|---|---|---|
| `role` | workflow-position kategoria; explicit funkcionalis felelosseg es authority kerete a workflowban (current tree-ben: `implementer`, `reviewer`, `meta_reviewer`) | belso registry-kulcs; `AgentRole` zart union ebben a slice-ban |
| `agent` | a role workflow-beli konkretizaciojanak vegrehajtoi profilja; a current tree-ben az `AgentName` (`codex`, `claude`) hordozza, plusz a hozza kotodo prompt/instruction surface | nem first-class persisted entity ebben a slice-ban; az `agent_resolution` mezo a `RoleDescriptor`-on rogzíti, hogyan szarmazik le ma |
| `runner` | underlying execution substrate (peldaul `codex` CLI, `claude-code` CLI, jovobeli engine/harness); meghatarozza a tool capability boundary-t es a delivery/attach utvonalat | nem first-class entity ebben a slice-ban; jovobeli kulon concern, `agent != runner` distinction explicit |
| `output kind` | canonical actor emit kind (`pass`, `human_question`, `convergence`, `meta_review_result`); `ActorOutputKind` zart union | public surface, read-only downstream constraint ebben a slice-ban; uj kind csak `O3-T5`-ben nyithato |
| `prompt concern` | reusable vagy grouped instruction-surface projection blokk; mai source lehet kozvetlen helper builder (`build*Guidance`, `build*Line`, `build*Reminder`) vagy grouped builder-local fixed block, ha a current tree-ben az adott instrukcio meg csak a top-level prompt builderben letezik | proposed companion catalog (`promptConcernCatalog`); naming proposal itt, kod-szintu felepites `O3-T2`-ben |
| `topology slot` | dedikalt pane mapping a tmux runtime-ban; mai source: `runtimePaneIndices` (`status`, `implementer`, `reviewer`, `metaReviewer`) | proposed companion catalog (`topologySlotCatalog`); naming proposal itt, kod-szintu felepites `O3-T3`-ban |
| `agent resolution` | hogyan szarmazik le egy role agentje a current tree-ben: `config_bound` (a `BubbleAgentsConfig` mezojebol) vagy `hardcoded_runtime` (runtime guardbol) | `RoleDescriptor` mezo; mai allapot rogzitett, mind a 3 role `config_bound`-ra konvergal `O3-T4`-ben |
| `seam` | lookup-pont a kodban, ahol az `AgentRole` enum konkret ertekei a current tree-ben szetszivargak; mai inventory: S1..S4 | belso strukturalis fogalom; a `RoleDescriptor` registry-bevezetese egyegyertelmu lookup-pontta vonja ossze |
| `dedicated panel baseline` | working assumption: ha egy role aktiv a workflowban, sajat dedikalt pane-t kap; nincs slot reuse, nincs multiplexing | preserved working assumption ebben a korben; topology variation post-`O3` |
| `configurability compass` | vezérelv: ha egy architektura-dontesnek ket utja van es az egyik nyitva tartja az utat a jovobeli workflow-konfigurabilitas fele, azt valasztjuk | nem onallo dontesi pont; iranymutato a tradeoff-szituaciokra |
| `preserved-baseline-with-explicit-replacement-path-in-<task>` | mai invariant rogzitett replacement-target task-id-vel; nem orok igazsag, hanem szandekosan zart current state, kulon successor task ownership-jevel | a `assertMetaReviewerActiveAgentCodexWhenPresent` guardra es a "implementer !== reviewer" konvenciora alkalmazott formula |

## Configurability Compass

1. Az `Opportunity 3` jovobeli iranya (`O3` utan, kulon opportunity) workflow-konfigurabilitas: a workflow-truth nem bubble-local, hanem workflow-config / workflow-schema-owned, amit a bubble runtime instance-kent referal es peldanyosit.
2. Ez a **nem** `O3` munka; `O3` kifejezetten **bubble-config szinten** marad.
3. A configurability compass vezérelv akkor lep be, amikor egy konkret architektura-dontesnek ket utja van:
   - egyik ut zarja a jovobeli configurabilitast (peldaul `retained_special` cimkevel forever-special-kent kezelni a meta-reviewert),
   - masik ut nyitva tartja (peldaul `agent_resolution: hardcoded_runtime today, replacement-path-in-O3-T4` formaval).
4. Ilyenkor a nyitott utat valasztjuk.
5. A vezérelv **nem** azt mondja, hogy most kell konfigurabilitast bevezetni; csak azt, hogy ne csinaljunk olyan dontest, ami **megakadalyozna** a kesobbi bevezetest.

## Current-Tree Coupling Inventory

1. A canonical actor authority current-tree source-of-truth-ja a top-level `execution_context`, explicit `execution_id`-val es fail-closed guard semanticszel (`O1-T1` baseline).
2. Az `O1-T3` lezarasa utan a runtime kernel + dispatch matrix + policy catalog + adapter map mintazat in-place van:
   - `actorRuntimeKernel.ts::executeActorRuntimeDispatchPlan` az explicit kernel execute seam,
   - `actorRuntimeDispatchMatrix.ts::actorRuntimeRouteMatrix` a `Role x OutputKind -> adapter + policy` route source-of-truth-a,
   - `actorRuntimeDispatchMatrix.ts::actorRuntimePolicyCheckCatalog` az ID-zott policy registry,
   - `actorRuntimeKernel.ts::actorRuntimeAdapterExecutors` az ID-zott adapter Map.
3. Az `O2-T13` closeout utan a topology-neutral delivery/executor closure preserved baseline; a tmux retained adapter szerepe csak operatori/observability.
4. A 4 seam azonban a kerneltol fuggetlenul tovabbra is szetszorja az `AgentRole` enum konkret ertekeit:
   - S1: `executionContext.ts::resolveAwaitedOutputTypeForRole`-ban `if (role === "meta_reviewer") return "meta_review_result"; return "pass_result";` mintazat.
   - S2: `tmuxManager.ts::runtimePaneIndices`-ben hardcoded `{ status: 0, implementer: 1, reviewer: 2, metaReviewer: 3 }` literal; a `tmuxDeliveryTargeting.ts` ezt a literalt es a `bubbleConfig.agents.{implementer,reviewer}` mezoket egyutt kerdezi le.
   - S3: `BubbleAgentsConfig`-ban csak `implementer` es `reviewer` mezok; a `meta_reviewer` config-szinten special-case (nincs binding mezo, runtime guard hordozza).
   - S4: a 4 startCommand prompt builder file role-specifikus top-level builderekkel (`buildImplementerStartupPrompt`, `buildReviewerStartupPrompt`, `buildMetaReviewerStartupPrompt`, `buildResumeImplementerStartupPrompt`, `buildResumeReviewerStartupPrompt`, `buildResumeMetaReviewerStartupPrompt`); a tenyleges prompt concern blokkok ma reszben kozvetlen reusable helper builderek (`build*Guidance`, `build*Line`, `build*Reminder`), reszben grouped builder-local fixed blockok, mikozben a top-level compose tovabbra is role-szerint elagazo.
5. A bubble config/state/policy reteg ezen kívül zart baseline marad:
   - `RoundRoleHistoryEntry`,
   - implementer/reviewer pass handoff loop,
   - convergence policy,
   - start/resume topology slots.

## The Four Seams Source-Anchored Inventory

| Seam | Implicit szerzodes a current tree-ben | Source anchor (file + szimbolum) |
|---|---|---|
| `S1` (role -> primary awaited output) | `if (role === "meta_reviewer") return "meta_review_result"; return "pass_result";` | `src/v11/shared/state/executionContext.ts::resolveAwaitedOutputTypeForRole` |
| `S2` (role -> topology slot) | hardcoded `runtimePaneIndices` literal + delivery targeting role-elagazas; `meta_reviewer` mappingje `metaReviewer` slotra mehet, a `bubbleConfig.agents.implementer/reviewer` mezok az `implementer`/`reviewer` slotokra | `src/v11/infrastructure/channel/tmux/tmuxManager.ts::runtimePaneIndices`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts::resolveTargetPaneIndex` |
| `S3` (role -> bubble config binding) | `BubbleAgentsConfig` csak `implementer` es `reviewer` mezovel; "implementer !== reviewer" enforce-olt konvencio; `meta_reviewer` nincs config mezoben | `src/config/bubbleConfig.ts::validateBubbleConfig` (agents szekcio), `src/types/bubble.ts::BubbleAgentsConfig` |
| `S4` (role -> startup/resume prompt composition) | role-specifikus top-level builderek (`buildImplementerStartupPrompt`, `buildReviewerStartupPrompt`, `buildMetaReviewerStartupPrompt`, plusz a 3 resume parja) compose-oljak a source-anchorolt prompt concern blokkokat, amelyek ma lehetnek kozvetlen reusable helper builderek (`build*Guidance`, `build*Line`, `build*Reminder`) vagy grouped builder-local fixed blockok | `src/v11/application/start/startCommandPrompts.ts::buildReviewerStartupPrompt`, `buildMetaReviewerStartupPrompt`; `src/v11/application/start/startCommandImplementerPrompts.ts::buildImplementerStartupPrompt`; `src/v11/application/start/startCommandResumePrompts.ts::buildResumeReviewerStartupPrompt`, `buildResumeMetaReviewerStartupPrompt`; `src/v11/application/start/startCommandResumeImplementerPrompt.ts::buildResumeImplementerStartupPrompt` |

## Closed Baseline Vocabulary Matrix

| Term | Source anchor | Current meaning | Boundary disposition |
|---|---|---|---|
| `AgentName` | `src/types/bubble.ts` | concrete agent identity (`codex`, `claude`) | workflow state/config baseline; nem registry-kulcs |
| `AgentRole` | `src/types/bubble.ts` | active role es authority guard vocabulary (`implementer`, `reviewer`, `meta_reviewer`) | preserved zart enum; a `RoleDescriptor` registry kulcsa; uj ertek csak public-protocol nyitas (`O3-T5`) reszekent |
| `ActorOutputKind` | `src/types/protocol.ts` | public actor emit kind union (`pass`, `human_question`, `convergence`, `meta_review_result`) | preserved zart enum; uj ertek csak `O3-T5`-ben |
| `BubbleExecutionContextAwaitedOutputType` | `src/types/bubble.ts` | top-level canonical awaited output vocabulary (`pass_result | meta_review_result`) | preserved state baseline; a `RoleDescriptor.primary_awaited_output_type` mezoje ezt veszi fel |
| `MetaReviewExecutionContextAwaitedOutputType` | `src/types/bubble.ts` | meta-review mirror/subset awaited output vocabulary (`meta_review_result`) | preserved meta-review state baseline |
| `ActorRuntimePolicyCheckId` | `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts` | ID-zott policy check katalogus kulcsa (`context_snapshot_integrity`, `input_context_match`, `implementer_authority`, `reviewer_authority`, `reviewer_human_question_retained_fallback`, `meta_reviewer_authority`, `meta_reviewer_active_agent_codex_when_present`) | preserved katalogus; a `RoleDescriptor.authority_policy_check_id` mezoje ide hivatkozik |
| `ActorRuntimeAdapterId` | `src/v11/application/actorProtocol/actorRuntimeKernel.ts` | ID-zott adapter Map kulcsa (`pass_adapter`, `human_question_adapter`, `convergence_adapter`, `meta_review_result_adapter`) | preserved katalogus; a route-matrix mezoje ide hivatkozik (`O3-T1` ezt nem modositja) |
| `runtimePaneIndices` | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | hardcoded `{ status: 0, implementer: 1, reviewer: 2, metaReviewer: 3 }` literal | preserved working assumption baseline; `O3-T3`-ban kerul `topologySlotCatalog`-ra atkotesre |
| `BubbleAgentsConfig` | `src/types/bubble.ts` | bubble config role binding shape (`implementer: AgentName, reviewer: AgentName`) | preserved zart shape ebben a slice-ban; `O3-T4`-ben kerul ujragondolasra (`agents.meta_reviewer` vagy uniform shape) |

## Proposed Internal RoleDescriptor Registry Boundary

1. A `RoleDescriptor` egy belso, **adat-rekord** tipus (NEM polimorfikus interface, NEM implementation-bundle), amely egyetlen registry-bejegyzeskent leirja egy role-hoz tartozo zart vocabulary-tenyeket es lookup-utvonalakat.
2. A registry tipusa: `Readonly<Record<AgentRole, RoleDescriptor>>`.
3. A registry helye az `O3-T2`-ben: `src/v11/application/actorProtocol/roleDescriptorRegistry.ts` (proposed; a tenyleges path/file naming `O3-T2`-ben rogzul).
4. A registry-bevezetese **NEM** valtoztatja meg az `AgentRole` enumot, az `ActorOutputKind` enumot vagy a public CLI/protocol surface-et.
5. A registry mezohalmaza:

| Mezo | Tipus | Szemantika | Source anchor (current tree) | Seam |
|---|---|---|---|---|
| `id` | `AgentRole` | role identifier; a registry-bejegyzes kulcsa | `src/types/bubble.ts::agentRoles` | - |
| `primary_awaited_output_type` | `BubbleExecutionContextAwaitedOutputType` | a role workflow-beli primer elvart kimenete (single value); cross-cutting outcome (`human_question`) NEM ide tartozik, hanem a route-matrix dimenzioja | `src/v11/shared/state/executionContext.ts::resolveAwaitedOutputTypeForRole` | S1 |
| `topology_slot_id` | `TopologySlotId` (proposed catalog) | a role dedikalt pane slot ID-ja a `topologySlotCatalog`-ban | `src/v11/infrastructure/channel/tmux/tmuxManager.ts::runtimePaneIndices` | S2 |
| `authority_policy_check_id` | `ActorRuntimePolicyCheckId` | a role authority guardja a meglevo `actorRuntimePolicyCheckCatalog`-ban | `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts::actorRuntimePolicyCheckCatalog` | - |
| `agent_resolution` | `{ kind: "config_bound"; config_key: keyof BubbleAgentsConfig } \| { kind: "hardcoded_runtime"; current_agent: AgentName }` | hogyan szarmazik le a role agentje a current tree-ben; mai allapot rogzitett, `O3-T4`-ben mind a 3 role `config_bound`-ra konvergal | `src/config/bubbleConfig.ts`, `assertMetaReviewerActiveAgentCodexWhenPresent` | S3 |
| `startup_prompt_concern_ids` | `readonly PromptConcernId[]` (proposed catalog) | a role startup prompt-jat alkoto concern-modulok ID-listaja a `promptConcernCatalog`-bol | `src/v11/application/start/startCommandPrompts.ts`, `startCommandImplementerPrompts.ts` | S4 |
| `resume_prompt_concern_ids` | `readonly PromptConcernId[]` (proposed catalog) | a role resume prompt-jat alkoto concern-modulok ID-listaja | `src/v11/application/start/startCommandResumePrompts.ts`, `startCommandResumeImplementerPrompt.ts` | S4 |
| `handoff_id_format_id?` | `HandoffIdFormatId?` (proposed catalog) | opcionalis; a role-specifikus handoff_id formatter ID-ja, amennyiben a default formattol elter (`meta_reviewer` ma kulon prefixet hasznal) | `src/v11/shared/state/executionContext.ts::buildExecutionContextHandoffId` | - |
| `active_agent_constraint_id?` | `ActiveAgentConstraintId?` (proposed catalog) | opcionalis; a role extra active-agent invariansa, ha van (`meta_reviewer` ma `codex` only when present) | `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts::assertMetaReviewerActiveAgentCodexWhenPresent` | - |

6. A registry-olvaso projection helperek (proposed naming, `O3-T2`-ben kerulnek bevezetesre):
   - `getAwaitedOutputForRole(role: AgentRole): BubbleExecutionContextAwaitedOutputType` (S1)
   - `getTopologySlotForRole(role: AgentRole): TopologySlotId` (S2)
   - `getAuthorityPolicyCheckForRole(role: AgentRole): ActorRuntimePolicyCheckId`
   - `getAgentResolutionForRole(role: AgentRole): RoleAgentResolution` (S3)
   - `getStartupPromptConcernsForRole(role: AgentRole): readonly PromptConcernId[]` (S4)
   - `getResumePromptConcernsForRole(role: AgentRole): readonly PromptConcernId[]` (S4)
7. A projection-pattern szerepe: a hivok **nem** importaljak a `RoleDescriptor` tipusat, csak a sajat seamjuk projection helperjet; a closure-bucket szeparacio ezzel megmarad a hivoi oldalon, mikozben a registry source-of-truth-a egyetlen helyen el.

## Proposed Companion Catalogs

1. `promptConcernCatalog` (proposed):
   - tipus: `Readonly<Record<PromptConcernId, PromptConcernBuilder>>`
   - kulcs: `PromptConcernId` zart literal union
   - az ID-k ket source-anchor mintat fedhetnek le:
     - kozvetlen reusable helper buildert (`build*Guidance`, `build*Line`, `build*Reminder`)
     - grouped builder-local fixed blockot, ha a current tree-ben az adott szerepkori instrukcio meg csak a top-level prompt builderben letezik
   - ez **nem** "agent persona/mode/approach" konfiguracio: a concern ID-k explicit, source-anchorolt instruction/prompt projection blokkok
   - source-anchor minta a jelenlegi concern-jeloltekre:

| PromptConcernId (proposed) | Current-tree source anchor | Notes |
|---|---|---|
| `pairflow_command_guidance` | `src/v11/application/start/startCommandPromptRuntime.ts::buildPairflowCommandGuidance` | reusable runtime guidance |
| `canonical_actor_emit_lookup_guidance` | `src/v11/application/start/startCommandPrompts.ts::buildCanonicalActorEmitLookupGuidance`, `src/v11/application/start/startCommandImplementerPrompts.ts::buildCanonicalActorEmitLookupGuidance` | same rule, ket builderben jelenik meg ma |
| `launch_workspace_command_scope_line` | `src/v11/application/start/startCommandWorkspacePromptLines.ts::buildLaunchWorkspaceCommandScopeLine` | reusable workspace scope line |
| `repository_launch_workspace_line` | `src/v11/application/start/startCommandWorkspacePromptLines.ts::buildRepositoryLaunchWorkspaceLine` | reusable repo/worktree line |
| `repo_launch_workspace_task_line` | `src/v11/application/start/startCommandWorkspacePromptLines.ts::buildRepoLaunchWorkspaceTaskLine` | reviewer startup task-context line |
| `resume_state_context_line` | `src/v11/application/start/startCommandResumePromptShared.ts::buildResumeContextLine` | parameterized resume-state overlay |
| `transcript_context_line` | `src/v11/application/start/startCommandResumePrompts.ts::buildResumeReviewerStartupPrompt`, `src/v11/application/start/startCommandResumeImplementerPrompt.ts::buildResumeImplementerStartupPrompt`, `src/v11/application/start/startCommandResumePrompts.ts::buildResumeMetaReviewerStartupPrompt` | grouped literal line today |
| `kickoff_diagnostic_line` | `src/v11/application/start/startCommandResumePromptShared.ts::appendKickoffDiagnosticLine` | optional input-gated overlay |
| `implementer_start_activation_contract` | `src/v11/application/start/startCommandImplementerPrompts.ts::buildImplementerStartupPrompt` | grouped fixed block: start/task/implement-now framing |
| `implementer_resume_artifact_context` | `src/v11/application/start/startCommandResumeImplementerPrompt.ts::buildResumeImplementerStartupPrompt` | grouped fixed block: task + done package context |
| `implementer_evidence_handoff_guidance` | `src/v11/application/start/startCommandImplementerPrompts.ts::buildImplementerEvidenceHandoffGuidance` | reusable docs/code handoff guidance |
| `done_package_update_contract` | `src/v11/application/start/startCommandImplementerPrompts.ts::buildImplementerStartupPrompt` | grouped fixed block: done package upkeep semantics |
| `implementer_emit_handoff_contract` | `src/v11/application/start/startCommandImplementerPrompts.ts::buildImplementerStartupPrompt` | grouped fixed block: PASS / human_question emit instructions |
| `implementer_resume_role_instruction` | `src/v11/application/start/startCommandResumeImplementerPrompt.ts::resolveImplementerRoleInstruction` | resume-only role-state instruction |
| `reviewer_start_activation_contract` | `src/v11/application/start/startCommandPrompts.ts::buildReviewerStartupPrompt` | grouped fixed block: standby / wait-for-PASS / fresh review |
| `reviewer_resume_artifact_context` | `src/v11/application/start/startCommandResumePrompts.ts::buildResumeReviewerStartupPrompt` | grouped fixed block: resume header + task line |
| `reviewer_test_execution_directive` | `src/v11/application/start/startCommandPrompts.ts::buildReviewerStartupPrompt`, `src/v11/application/start/startCommandResumePrompts.ts::buildResumeReviewerStartupPrompt` | fixed test-evidence directive + optional current directive overlay |
| `reviewer_policy_snapshot_contract` | `src/v11/application/start/startCommandPrompts.ts::buildReviewerStartupPrompt`, `src/v11/application/start/startCommandResumePrompts.ts::buildResumeReviewerStartupPrompt` | grouped fixed block: policy file path + read-before-review |
| `reviewer_resume_role_instruction` | `src/v11/application/start/startCommandResumePrompts.ts::buildResumeReviewerStartupPrompt` | resume-only activation/standby instruction |
| `reviewer_severity_ontology_reminder` | `src/v11/shared/reviewer/reviewerSeverityOntology.ts::buildReviewerSeverityOntologyReminder` | reusable reviewer guidance |
| `reviewer_decision_matrix_reminder` | `src/v11/shared/reviewer/testEvidence.ts::buildReviewerDecisionMatrixReminder` | reusable reviewer guidance |
| `reviewer_agent_selection_guidance` | `src/v11/shared/reviewer/reviewerGuidance.ts::buildReviewerAgentSelectionGuidance` | reusable reviewer guidance |
| `reviewer_scout_expansion_workflow_guidance` | `src/v11/shared/reviewer/reviewerScoutExpansionGuidance.ts::buildReviewerScoutExpansionWorkflowGuidance` | reusable reviewer guidance |
| `reviewer_pass_output_contract_guidance` | `src/v11/shared/reviewer/reviewerScoutExpansionGuidance.ts::buildReviewerPassOutputContractGuidance` | reusable reviewer guidance |
| `reviewer_findings_pass_instruction` | `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts::buildReviewerFindingsPassInstruction` | reusable reviewer guidance |
| `reviewer_canonical_command_gate_lines` | `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts::buildReviewerCanonicalCommandGateLines` | reusable reviewer guidance |
| `reviewer_no_manual_state_edits` | `src/v11/application/start/startCommandPrompts.ts::buildReviewerStartupPrompt` | grouped fixed block: transcript/inbox/state edit tilalom |
| `document_primary_artifact_reviewer_guardrail` | `src/v11/application/start/startCommandPrompts.ts::buildDocumentPrimaryArtifactReviewerGuardrail` | document-only guardrail |
| `reviewer_brief_overlay` | `src/v11/shared/reviewer/reviewerBrief.ts::formatReviewerBriefPrompt` | optional input-gated overlay |
| `reviewer_focus_bridge_overlay` | `src/v11/shared/reviewer/reviewerBrief.ts::formatReviewerFocusBridgeBlock` | optional input-gated overlay |
| `meta_reviewer_idle_contract` | `src/v11/application/start/startCommandPrompts.ts::buildMetaReviewerStartupPrompt` | grouped fixed block: static worker / wait-for-signal |
| `meta_reviewer_task_artifact_context` | `src/v11/application/start/startCommandPrompts.ts::buildMetaReviewerStartupPrompt`, `src/v11/application/start/startCommandResumePrompts.ts::buildResumeMetaReviewerStartupPrompt` | grouped fixed block: task line |
| `meta_review_submit_command_template` | `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts::buildMetaReviewSubmitCommandTemplate` | reusable meta-review guidance |
| `meta_review_submit_approve_parity_note` | `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts::buildMetaReviewSubmitApproveParityNote` | reusable meta-review guidance |
| `meta_review_finding_severity_contract` | `src/v11/application/start/startCommandPrompts.ts::buildMetaReviewerStartupPrompt` | grouped fixed block: severity vocabulary restriction |
| `meta_review_no_manual_state_edits` | `src/v11/application/start/startCommandPrompts.ts::buildMetaReviewerStartupPrompt` | grouped fixed block: manual artifact/state edit tilalom |
| `meta_reviewer_resume_activation_contract` | `src/v11/application/start/startCommandResumePrompts.ts::buildResumeMetaReviewerStartupPrompt` | grouped fixed block: static pane + wait-for-signal resume contract |

   - az `O3-T1` ebben a note-ban normativan lockolja a current-tree source-anchorolt concern-vocabularyt es a 3 mai role exact ordered concern-setjeit; az `O3-T2` ennek kod-szintu formalizalasat, file ownershipjat es registry/projection bekoteset ownershipolja, ujraertelmezes nelkul
2. `topologySlotCatalog` (proposed):
   - tipus: `Readonly<Record<TopologySlotId, TopologySlotDescriptor>>`
   - kulcs: `TopologySlotId` zart literal union
   - example mai slot jeloltek (kod-szintu lockolas `O3-T3`-ban):
     - `status` (pane index 0)
     - `implementer` (pane index 1)
     - `reviewer` (pane index 2)
     - `meta_reviewer` (pane index 3)
   - a tenyleges entry-lista lockolasra kerul `O3-T3`-ban; az `O3-T1`-ben ez naming proposal **kod nelkul**.
3. Mindket companion catalog **registry mintazatu**, ugyanugy mint a meglevo `actorRuntimePolicyCheckCatalog` es `actorRuntimeAdapterExecutors`. A regisztrek **nem polimorfikusak**.

## Per-Role Descriptor Closed Mapping

A 3 mai role descriptor-mezo ertekei a current tree alapjan:

Megjegyzes: a `promptConcernId` listak source-anchorolt, ordered concern-szettek. Azok az elemek, amelyeknel a current tree input-gated overlayt hasznal (`kickoff_diagnostic_line`, `reviewer_brief_overlay`, `reviewer_focus_bridge_overlay`, document-only guardrail), explicit `(conditional)` jelolest kapnak, de a concern-keszlet zart marad.

### `implementer`

| Mezo | Ertek | Source anchor |
|---|---|---|
| `id` | `"implementer"` | `src/types/bubble.ts::agentRoles` |
| `primary_awaited_output_type` | `"pass_result"` | `executionContext.ts::resolveAwaitedOutputTypeForRole` (else branch) |
| `topology_slot_id` | `"implementer"` | `tmuxManager.ts::runtimePaneIndices.implementer` |
| `authority_policy_check_id` | `"implementer_authority"` | `actorRuntimeDispatchMatrix.ts::actorRuntimePolicyCheckCatalog` |
| `agent_resolution` | `{ kind: "config_bound", config_key: "implementer" }` | `bubbleConfig.ts::validateBubbleConfig` (agents.implementer) |
| `startup_prompt_concern_ids` | `["implementer_start_activation_contract", "launch_workspace_command_scope_line", "pairflow_command_guidance", "implementer_evidence_handoff_guidance", "done_package_update_contract", "repository_launch_workspace_line", "canonical_actor_emit_lookup_guidance", "implementer_emit_handoff_contract"]` | `src/v11/application/start/startCommandImplementerPrompts.ts::buildImplementerStartupPrompt` |
| `resume_prompt_concern_ids` | `["implementer_resume_artifact_context", "launch_workspace_command_scope_line", "pairflow_command_guidance", "repository_launch_workspace_line", "resume_state_context_line", "transcript_context_line", "implementer_evidence_handoff_guidance", "implementer_resume_role_instruction", "kickoff_diagnostic_line (conditional)"]` | `src/v11/application/start/startCommandResumeImplementerPrompt.ts::buildResumeImplementerStartupPrompt` |
| `handoff_id_format_id` | `null` (default format) | `executionContext.ts::buildExecutionContextHandoffId` (else branch) |
| `active_agent_constraint_id` | `null` | - |

### `reviewer`

| Mezo | Ertek | Source anchor |
|---|---|---|
| `id` | `"reviewer"` | `src/types/bubble.ts::agentRoles` |
| `primary_awaited_output_type` | `"pass_result"` | `executionContext.ts::resolveAwaitedOutputTypeForRole` (else branch) |
| `topology_slot_id` | `"reviewer"` | `tmuxManager.ts::runtimePaneIndices.reviewer` |
| `authority_policy_check_id` | `"reviewer_authority"` | `actorRuntimeDispatchMatrix.ts::actorRuntimePolicyCheckCatalog` |
| `agent_resolution` | `{ kind: "config_bound", config_key: "reviewer" }` | `bubbleConfig.ts::validateBubbleConfig` (agents.reviewer) |
| `startup_prompt_concern_ids` | `["reviewer_start_activation_contract", "reviewer_test_execution_directive", "reviewer_severity_ontology_reminder", "reviewer_policy_snapshot_contract", "reviewer_decision_matrix_reminder", "reviewer_agent_selection_guidance", "document_primary_artifact_reviewer_guardrail (conditional)", "reviewer_scout_expansion_workflow_guidance", "reviewer_pass_output_contract_guidance", "reviewer_brief_overlay (conditional)", "reviewer_focus_bridge_overlay (conditional)", "canonical_actor_emit_lookup_guidance", "reviewer_findings_pass_instruction", "reviewer_canonical_command_gate_lines", "launch_workspace_command_scope_line", "pairflow_command_guidance", "reviewer_no_manual_state_edits", "repo_launch_workspace_task_line"]` | `src/v11/application/start/startCommandPrompts.ts::buildReviewerStartupPrompt` |
| `resume_prompt_concern_ids` | `["reviewer_resume_artifact_context", "repository_launch_workspace_line", "launch_workspace_command_scope_line", "pairflow_command_guidance", "resume_state_context_line", "transcript_context_line", "reviewer_test_execution_directive", "reviewer_severity_ontology_reminder", "reviewer_policy_snapshot_contract", "reviewer_decision_matrix_reminder", "reviewer_agent_selection_guidance", "document_primary_artifact_reviewer_guardrail (conditional)", "reviewer_scout_expansion_workflow_guidance", "reviewer_pass_output_contract_guidance", "reviewer_brief_overlay (conditional)", "reviewer_focus_bridge_overlay (conditional)", "reviewer_canonical_command_gate_lines", "reviewer_resume_role_instruction", "kickoff_diagnostic_line (conditional)"]` | `src/v11/application/start/startCommandResumePrompts.ts::buildResumeReviewerStartupPrompt` |
| `handoff_id_format_id` | `null` (default format) | `executionContext.ts::buildExecutionContextHandoffId` (else branch) |
| `active_agent_constraint_id` | `null` | - |

### `meta_reviewer`

| Mezo | Ertek | Source anchor |
|---|---|---|
| `id` | `"meta_reviewer"` | `src/types/bubble.ts::agentRoles` |
| `primary_awaited_output_type` | `"meta_review_result"` | `executionContext.ts::resolveAwaitedOutputTypeForRole` (meta_reviewer branch) |
| `topology_slot_id` | `"meta_reviewer"` | `tmuxManager.ts::runtimePaneIndices.metaReviewer` |
| `authority_policy_check_id` | `"meta_reviewer_authority"` | `actorRuntimeDispatchMatrix.ts::actorRuntimePolicyCheckCatalog` |
| `agent_resolution` | `{ kind: "hardcoded_runtime", current_agent: "codex" }` (preserved-baseline-with-explicit-replacement-path-in-O3-T4) | `actorRuntimeDispatchMatrix.ts::assertMetaReviewerActiveAgentCodexWhenPresent` |
| `startup_prompt_concern_ids` | `["meta_reviewer_idle_contract", "meta_review_submit_command_template", "meta_review_submit_approve_parity_note", "meta_review_finding_severity_contract", "meta_review_no_manual_state_edits", "canonical_actor_emit_lookup_guidance", "pairflow_command_guidance", "meta_reviewer_task_artifact_context", "repository_launch_workspace_line"]` | `src/v11/application/start/startCommandPrompts.ts::buildMetaReviewerStartupPrompt` |
| `resume_prompt_concern_ids` | `["meta_reviewer_resume_activation_contract", "pairflow_command_guidance", "meta_reviewer_task_artifact_context", "repository_launch_workspace_line", "resume_state_context_line", "transcript_context_line", "kickoff_diagnostic_line (conditional)"]` | `src/v11/application/start/startCommandResumePrompts.ts::buildResumeMetaReviewerStartupPrompt` |
| `handoff_id_format_id` | `"meta_review"` (proposed catalog id; mai source: `meta_review:${bubbleId}:round:${round}:attempt:${attempt}` format) | `executionContext.ts::buildExecutionContextHandoffId` (meta_reviewer branch) |
| `active_agent_constraint_id` | `"codex_when_present"` (proposed catalog id; mai source: `assertMetaReviewerActiveAgentCodexWhenPresent`) | `actorRuntimeDispatchMatrix.ts` |

## Preserved Baselines

1. `O1-T1` kernel boundary baseline (canonical execution authority context, generic runtime route/policy matrix, workflow-specific output adapter reteg) preserved.
2. `O1-T3` kernel + dispatch matrix + adapter map mintazat preserved.
3. `O2-T1..T13` topology-neutral delivery/executor closure preserved.
4. `assertReviewerHumanQuestionRetainedFallback` retained fallback preserved.
5. `assertMetaReviewerActiveAgentCodexWhenPresent` runtime guard preserved-baseline-with-explicit-replacement-path-in-`O3-T4`.
6. `bubbleConfig.ts` "implementer !== reviewer" enforce-olt konvencio preserved-baseline-with-explicit-replacement-path-if-needed (nem domain-invariant; nem "tightening" cimsko alatt eltavolithato).
7. Dedicated-panel-per-active-role baseline preserved as working assumption ebben a korben; topology variation post-`O3`.
8. `AgentRole` zart enum preserved baseline ebben a slice-ban.
9. `ActorOutputKind` zart enum preserved baseline ebben a slice-ban.
10. A canonical execution authority (`execution_context`, `execution_id`, `expected_role`, `expected_round`, `expected_state_fingerprint`) preserved baseline.

## Explicit Downstream Constraints

1. Read-only downstream public surfaces:
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`
2. Read-only downstream state surfaces:
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
3. Read-only downstream config surface:
   - `src/config/bubbleConfig.ts` (shape change `O3-T4` ownership)
4. Read-only downstream topology surface:
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts` (`runtimePaneIndices` atkotes `O3-T3`-ban)
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
5. Read-only downstream prompt-compose surface:
   - `src/v11/application/start/startCommandPrompts.ts`
   - `src/v11/application/start/startCommandImplementerPrompts.ts`
   - `src/v11/application/start/startCommandResumePrompts.ts`
   - `src/v11/application/start/startCommandResumeImplementerPrompt.ts`
   - `src/v11/shared/command/agentCommand.ts`
6. Ez a note nem ownershipolja:
   - public protocol rewrite,
   - kod-szintu registry/companion catalog implementacio,
   - bubble config shape change,
   - tmux pane mapping refactor,
   - prompt-compose top-level builder atalakitas,
   - runtime guard atalakitas.

## Sequencing Consequences

| Slice | Shape | Goal | Closure bucket | Gating |
|---|---|---|---|---|
| `O3-T1` | `contract_or_persisted_authority_foundation` (docs-only) | this note + task artifact + parent plan frissites | `shared_contract` | no predecessor; this slice is the entry to `Opportunity 3` |
| `O3-T2` | `shared_contract` + `authority_producer` | belso `RoleDescriptor` registry + `promptConcernCatalog` + projection helperek kod-szintu bevezetese; S1 (awaited output) + S4 (prompt composition) atkotese a registry-re | `shared_contract` + `authority_producer` (foundation) | predecessor: `O3-T1` lezart; `O3-T2` ownershipolja a `RoleDescriptor` source-file path-at, es kod szinten formalizalja az `O3-T1`-ben lockolt `promptConcernCatalog` concern-vocabularyt valamint a 3 role descriptor zart mappingjat, ujraertelmezes nelkul |
| `O3-T3` | `consumer_family_alignment` | S2 (topology slot) atkotese a registry-re; `topologySlotCatalog` kod-szintu bevezetese; `tmuxManager.ts::runtimePaneIndices` es `tmuxDeliveryTargeting.ts` atallitasa registry-olvasasra | `internal_execution_consumers` + `workflow_orchestration_consumers` | predecessor: `O3-T2` lezart; nem nyitja ujra a `O2-T13` topology-neutral delivery contract zart truthjat |
| `O3-T4` | `shared_contract` + `workflow_orchestration_consumers` | S3 (config binding) atkotese; `BubbleAgentsConfig` shape kiterjesztese (`agents.meta_reviewer` mezo vagy uniform `Record<AgentRole, AgentName>` shape - a pontos design `O3-T4`-ben rogzul); `agent_resolution` mind a 3 role-on `config_bound`-ra konvergal; `assertMetaReviewerActiveAgentCodexWhenPresent` runtime guard explicit replacement proof-fal lebontasra vagy lazitasra kerul | `shared_contract` + `workflow_orchestration_consumers` | predecessor: `O3-T3` lezart; contract-boundary override (config schema change); kotelezo replacement proof a meta-reviewer guardra |
| `O3-T5` | `read_model_consumers` | public CLI/protocol surface kontrollalt nyitasa uj output kindokra; az `ActorOutputKind` enum bovitese, `actorRuntimeRouteMatrix` uj sor(ok), uj adapter, uj CLI parser ag, uj typed `ActorEmitInput` variant | `read_model_consumers` | predecessor: `O3-T4` lezart; **trigger feltetel**: konkret uj output kind igeny VAGY uj role saját kimenettel; **automatikus indulas tilos**, ha trigger nem teljesul, az `O3` lane `O3-T4`-gyel lezarhato es `O3-T5` `deferred` disposition-ben marad a parent planban |

## Onboarding Walkthrough (uj role hozzaadasa post-O3-T4)

1. Felveszed az uj role-t az `agentRoles` tuple-be (`src/types/bubble.ts`).
2. A `Record<AgentRole, RoleDescriptor>` registry tipus compile-time hibat ad: "Property '<new_role>' is missing".
3. Felveszel egy uj entry-t a registry-be. A TypeScript felsorolja a kotelezo mezoket:
   - `id`,
   - `primary_awaited_output_type` (csak meglevo `BubbleExecutionContextAwaitedOutputType` ertek; uj output kinds csak `O3-T5` reszekent),
   - `topology_slot_id` (csak meglevo `TopologySlotId` a `topologySlotCatalog`-ban; uj slothoz uj catalog-entry),
   - `authority_policy_check_id` (csak meglevo `ActorRuntimePolicyCheckId`; uj guardhoz uj catalog-entry),
   - `agent_resolution` (default: `config_bound` `O3-T4` utan),
   - `startup_prompt_concern_ids` es `resume_prompt_concern_ids` (csak meglevo `PromptConcernId`-k; uj concern-hez uj `promptConcernCatalog` entry),
   - opcionalis `handoff_id_format_id`, `active_agent_constraint_id`.
4. Felveszel egy uj sort az `actorRuntimeRouteMatrix`-ba (`Role x OutputKind -> adapter + policy_check_ids`).
5. Ha az uj role `config_bound`, felveszed a `BubbleAgentsConfig`-ba.
6. Frissited a teszteket.

## Sequencing Consequences for Successor Lane

1. `O3-T2` csak ezen note exact `RoleDescriptor` mezohalmazat, az itt mar lockolt prompt concern-vocabularyt, es a per-role closed mappingot formalizalhatja kod szinten.
2. `O3-T3` csak ezen note `topologySlotCatalog` naming proposaljat formalizalhatja kod szinten; nem nyithatja ujra a `O2-T13` topology-neutral closure-t.
3. `O3-T4` csak ezen note `agent_resolution` `hardcoded_runtime` -> `config_bound` migracios pathjat ervenyesitheti; explicit replacement proof a `assertMetaReviewerActiveAgentCodexWhenPresent` guardra kotelezo.
4. `O3-T5` csak akkor nyithato, ha a trigger feltetel (konkret uj output kind igeny vagy uj role saját kimenettel) teljesul; addig `deferred` disposition-ben marad.
5. Az `Opportunity 4` ("Core vs Extension Surface Rationalization") ebbe a lane-be van beolvasztva mint core-vs-extension rationalization (parent plan disposition); kulon `O4-T1` csak akkor nyithato, ha a fenti `O3-T2..T5` lane explicit gating-feltetelei mar nem fedik le a maradek scope-ot.
