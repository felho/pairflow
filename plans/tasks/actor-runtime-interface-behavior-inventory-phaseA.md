---
artifact_type: task
artifact_id: task_actor_runtime_interface_behavior_inventory_phaseA_v1
title: "Actor Runtime Interface Behavior Inventory (Phase A)"
status: draft
phase: phaseA
target_files:
  - plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Behavior Inventory (Phase A)

## L0 - Policy

### Goal

Checked-in, docs-only current-state behavior inventory keszitese a mai actor surface-rol ugy, hogy a jovobeli actor runtime interface Phase B mar ne intuitiv otletelesre, hanem auditálható behavior-terkepre epuljon.
Phase A sikeres, ha letrejon egy canonical inventory artifact, amely kulon kezeli a `Role` es `Actor` fogalmat, explicitten rogzíti, hogy a mai codebase-ben hol van bizonyitott `AgentConfig`-jellegu current-state evidencia, szetvalasztja az actor es executor boundaryt, es minden relevans mai behaviorrol rogzit egy target-minositest: `core`, `extension`, `adapt`, `remove`, vagy evidenciagap eseten explicit `undecided`.

### Context

1. A kulon plan mar rogzitette, hogy a jovobeli actor runtime interface nem a jelenlegi command-union mechanikus absztrakcioja lesz, hanem capability-alapu, protocol-first boundary.
2. Phase 4 es Phase 5 tovabbra is elsobbseget elvez a canonical actor-emission surface es a legacy cleanup leszallitasaban; emiatt a Phase A discovery-only munka.
3. A discovery fazisnak a jelenlegi actor entrypointokat, parser-eket, runtime/context helper-eket, prompt/guidance retegeket, artifact pathokat es executor-fuggosegeket is fel kell terkepeznie.
4. A v2 architecture anyagbol atveendo fo tanulsagok: a workflow/kernel a state tulajdonosa, a capability enforcement boundaryn tortenik, es az actor boundary nem keverheto ossze az executor boundaryval.
5. Ha Pi-style extension inspiracio is felhasznalasra kerul, annak tanulsaga legfeljebb az lehet, hogy a jovobeli actor runtime interface magja maradjon kicsi, es a ritkabb vagy experimentalis behaviorok bounded extension pontkent jelenjenek meg; authority-, routing- vagy state-ownership funkciok nem szervezhetok ki plugin-szeru retegekbe.
6. A Phase A tisztan current-state inventory: a rogzitett baseline-hoz tartozo checkoutolt codepathok az authoritative current-state evidence forrasok. In-flight vagy Phase 4/5 target-pathok csak kulon note-kent emlithetoek, current-state sourcekent nem.

### In Scope

1. Checked-in inventory artifact letrehozasa a jelenlegi actor behaviorokrol.
2. A jelenlegi actor entrypointok, parser-ek, runtime/context helper-ek, emit pathok es prompt/guidance surface-ek feltarasa.
3. Az inventory artifact explicit current-state baseline-jának rogzitese, hogy minden behavior-allitás reprodukalható legyen.
4. `Role` es `Actor` fogalmi szetvalasztasanak rogzitese, valamint annak explicit dokumentalasa, hogy a mai codepathokban van-e bizonyitott `AgentConfig`-jellegu current-state evidencia.
5. Actor-boundary es executor-boundary erintkezesi pontok explicit felsorolasa.
6. Minden inventoryzott behavior `behavior_scope` minositese: `common` vagy `role-specific`.
7. Minden inventoryzott behavior `current_status` minositese: `canonical`, `transitional` vagy `accidental`.
8. Minden inventoryzott behavior `surface_entry_kind`, `alias_status` es `behavior_layers` minositese.
9. Minden inventoryzott behavior `target_disposition` minositese: `core`, `extension`, `adapt`, `remove`, vagy evidenciagap eseten explicit `undecided`.
10. Informational comparison note a kotelezo v2 boundary-tanulsagokrol, valamint opcionálisan a Pi-style extension gondolkodas relevans tanulsagairol.

### Out of Scope

1. Barmilyen forraskod-modositas az actor runtime, executor, CLI vagy state machine retegekben.
2. Uj actor runtime interface vagy wrapper implementalasa.
3. Phase 4 vagy Phase 5 acceptance contract ujranyitasa vagy atirasa.
4. Teljes plugin-platform vagy extension API tervezese.
5. Uj workflow template, capability engine vagy kernel extraction implementalasa.

### Safety Defaults

1. Ez a task docs-only discovery task; product- vagy runtime-kod nem modosithato.
2. Az inventory leiro artifact, nem normativ architecture replace. A jelenlegi behavior dokumentalasa nem egyenlo annak jovobeli legitimalasaval.
3. Ha egy behavior besorolasa bizonytalan, explicit ambiguity vagy evidence-gap jeloles kell; hallgatozos feltetelezes nem elfogadhato.
4. A v2 architecture kotelezo informational input, a Pi extensions anyag opcionális informational input; egyik sem irhatja felul a jelenlegi protocol-first plan vagy a Phase 4/5 taskok normativ contractjat.
5. A target `core` vs `extension` dontes nem alapulhat pusztan jelenlegi command-neveken vagy torteneti beragodasokon; a canonical protocol modell az elsodleges.
6. A current-state inventory canonical current-state evidence forrasa a checkoutolt codebase; a `README.md` current user-facing behavior-summary es CLI/API context, a `docs/pairflow-initial-design.md` pedig historical baseline es architectural context.
7. Minden inventory artifact explicit baseline-hoz kotott: current-state allitas csak egy rogzitett git baseline ellen teheto, nem lebego "mostani branch" allapotra.
8. A default current-state baseline az `analysis_head`: a task inditasakor ervenyes `HEAD` commit. Ettol eltero baseline (`main_head`, `merge_base_with_main`) csak explicit indoklassal engedett.
9. A current-state evidence csak a rogzitett baseline commiton levo tracked source tartalomra epulhet; az inventorozott source pathok nem lehetnek helyi, uncommitted elteresben a baseline-hoz kepest. Az inventory artifact sajat docs-fajlja ettol meg lehet munka alatt.
10. Ha az inspected source scope nem a teljes inventoryhoz potencialisan relevans current-state source keszlet, akkor az artifact headernek explicitten rogzitenie kell az inspected es excluded scope-ot; rejtett vagy implicit baseline-kizaras nem megengedett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Blast radius:
   - checked-in docs artifact az inventoryhoz,
   - nincs source/runtime/state/UI contract modositas ebben a fazisban,
   - nincs parent plan edit ebben a fazisban.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Phase A-D discovery sorrendhez es a core-vs-extension policyhoz.
2. Binding normative companion set:
   - `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md`
   - `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md`
   - Ezek nem puszta inspirational note-ok: a Phase A boundary- es surface-ertelemzes kotelezo, binding inputjai.
3. `system_context_ref`: `README.md`
   - A bubble rendszer current user-facing behavior-summary es CLI/API context innen jon, de a current-state inventory authoritative evidence-forrasa a rogzitett baseline commiton visszaolvashato checkoutolt codebase.
4. Informational reference set:
   - `docs/pairflow-initial-design.md` historical baseline es architectural contextkent
   - `docs/v2/pairflow-v2-architecture-plan-joint.md`
   - `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md` mint optional extension-inspiracio
5. Precedence rule:
   - az inventory artifact kotelezo header-mezokkel rogzit egy explicit `baseline_commit_sha` + `baseline_ref_kind` + `baseline_source_tree_state` + `source_universe_ref` + `source_universe_seed_scope` + `source_universe_delegate_paths` + `inspected_source_scope` + `excluded_source_paths` evidenciabazist;
   - current-state behavior megallapitasakor a rogzitett baseline commiton visszaolvashato checkoutolt codepathok az elsodleges evidence-forrasok;
   - minden current-state megallapitas ennek a rogzitett baseline-nak a scope-jaban ertelmezendo;
   - a target-minositesek, boundary-ertelemzes es Phase A scopeertelmezes binding normativ forrasai a `plan_ref` es a fenti binding normative companion set;
   - a `README.md` current UX/CLI contextkent es supporting API-surface summarykent hasznalhato, de nem irhatja felul a codebase-bol kinyerheto tenyleges behavior-kepet;
   - a `README.md` es a `docs/pairflow-initial-design.md` supporting docs surface, nem reszei a baseline current-state `source_universe`-nek, es nem valhatnak clean-full-scope approval blockerre csak azert, mert supporting kontextust adnak;
   - ha `baseline_ref_kind` nem `analysis_head`, az artifactnak explicit `baseline_note`-ban kell indokolnia az elterest;
   - ha az artifact nem full-scope baseline-ra epul, az `inspected_source_scope` es `excluded_source_paths` mezoknek teljesen auditálhatóan fel kell sorolniuk, mely current-state source pathok voltak tenylegesen inventorizalva es melyek maradtak ki;
   - ha barmely inventorozott source path dirty a baseline-hoz kepest, az inventory nem tekintheto reprodukalhato current-state artifactnak;
   - ha informational inspiracio es a binding normativ forrasok kozott feszultseg van, a binding normativ forrasok az elsodlegesek, az inspirational source pedig csak note-kent szerepelhet.

### Terminology Lock

1. `behavior inventory row` = egy konkret jelenlegi actor-viselkedes dokumentalt egysege, amely triggerrel, inputtal, outputtal, side effecttel es source referenciaval rendelkezik.
2. `behavior_scope` = azt rogzitő tengely, hogy egy behavior kozos (`common`) vagy szerepkorhoz kotott (`role-specific`).
3. `current_status` = azt rogzitő tengely, hogy egy behavior a mai rendszerben canonical, transitional vagy accidental.
4. `surface_entry_kind` = azt rogzitő tengely, hogy a behavior mely belepesi vagy megjelenesi surface-fajtaban el: `actor-facing`, `operator`, `runtime-helper`, `executor-touchpoint`, `prompt-guidance`, `docs-surface`.
5. `alias_status` = azt rogzitő tengely, hogy a behavior primary current surface, retained alias vagy alias-nelkul letezo viselkedes-e.
6. `behavior_layers` = egy vagy tobb retegcimke, amely azt mutatja, hogy az adott behavior mely current-state retegekben jelenik meg: `entrypoint-parser`, `validation-policy`, `artifact-side-effect`, `emit-path`, `context-resolution`, `event-relay`, `launch-resume`, `docs-guidance`.
7. `agent_config_evidence` = annak row- vagy section-szintu rogzitese, hogy a mai codebase-ben van-e `first-class`, `implicit`, `absent` vagy `not-applicable` `AgentConfig`-jellegu current-state evidencia; v2 nomenklatura nem vetitheto vissza forras nelkul.
8. `current_state_source_universe` = a Phase A current-state audit auditálható source-manifestje: a `CS2`, `CS2a`, `CS2b`, `CS3`, `CS4` es a `CS5`-ben nevesitett `src/**` runtime/reviewer guidance pathok unioja, plusz az inspection kozben feltart, behavior-defining delegate pathok explicit, checked-in manifest-listaja az inventory artifactben. Nincs implicit closure, de a manifest az inventory artifactban bovithetö, ha egy seed vagy mar rogzitett delegate file tovabbi behavior-defining delegate-re mutat.
9. `supporting_docs_surface` = olyan supporting dokumentacios vagy guidance-surface, amely current UX/API summaryt, historical baselinet vagy review guidance-et ad, de nem resze a baseline current-state `source_universe`-nek.
10. `surface` = a row primary ownership-azonositoja, repo-relativ `path`, `path[#symbol]` vagy `path[#Lline]` formatumban; docs- es guidance-surface soroknal a line-anchor vagy a puszta path is legalis, ha nincs ertelmes symbol-anchor.
11. `trigger` = kotott `family:detail` formaju mező, ahol `family` egyike: `cli`, `runtime`, `prompt`, `artifact`, `docs`, `plan`.
12. `role_scope` = egy vagy tobb ertek a kovetkezo zart halmazbol: `implementer`, `reviewer`, `meta_reviewer`, `operator`, `shared`.
13. `actor_scope` = egy vagy tobb ertek a kovetkezo zart halmazbol: `generic-agent`, `role-bound-agent`, `meta-review-agent`, `human-operator`, `mixed`, `none`.
14. `input_authority` = kotott enumolt provenance-mezo: `explicit-cli-input`, `workspace-derived-context`, `runtime-derived-context`, `artifact-derived-context`, `docs-derived-context`, `mixed`.
15. `input_shape_or_contract` = kotott `family:detail` formaju mező, ahol `family` egyike: `flags`, `json`, `workspace-context`, `artifact`, `prompt-text`, `none`.
16. `output_kind_or_effect` = kotott `family:detail` formaju mező, ahol `family` egyike: `protocol`, `artifact`, `guidance`, `validation`, `state-projection`, `none`.
17. `side_effects_or_artifacts` = kotott `family:detail` formaju mező, ahol `family` egyike: `artifact-write`, `state-write`, `prompt-emission`, `validation-log`, `none`.
18. `source_refs` = nem ures, repo-relativ hivatkozaslista `path[#Lline]` vagy `path[#symbol]` elemekkel; minden row current-state allitasait ez tamasztja ala.
19. `core` = olyan jovobeli actor runtime capability vagy boundary-viselkedes, amely minden vagy majdnem minden actor-use-case-hez canonicalan szukseges.
20. `extension` = olyan bounded bovitopont, amely opcionális, ritkabb vagy actor-specifikus behaviorhoz kellhet, de nem hordozhat authority- vagy state-ownership felelosseget.
21. `adapt` = olyan jelenlegi behavior, amely hasznos, de a jovobeli boundaryban atformalva vagy mas retegre mozgatva maradhat meg.
22. `remove` = olyan jelenlegi behavior, amely historical vagy accidental, es a jovobeli modellben nem kell megtartani.
23. `undecided` = olyan target-minosites, amely csak akkor engedett, ha a row `evidence_status=gap` vagy `ambiguity_status=ambiguous`, es explicit open question/next-evidence note rogzitve van.
24. `actor boundary` = amit egy actor workflow-step vegrehajtasa kozben lat es hasznal.
25. `executor boundary` = process/workspace/sync/relay/liveness reteg, amely nem egyenlo az actor runtime interface-szel.
26. `behavior-defining delegate` = olyan konkret current-state file, amely egy mar scope-ba emelt seed vagy delegate surface megfigyelheto actor/runtime viselkedeset kozvetlenul meghatarozza, peldaul command-osszeallitas, pane-launch, prompt-osszeallitas, input-normalizalas, dispatch, gate-flow, recovery vagy pane-binding logika altal; puszta altalanos utility vagy passziv tipusdefinicio nem eleg ehhez a minositeshez.
27. `actor_surface_candidate_set` = approval-ready teljességi backstopkent kezelt explicit current-state codepath-halmazon, amely legalabb a kovetkezo rootokat fedi: `src/index.ts`, `src/cli/commands/agent/**`, `src/cli/commands/bubble/**`, `src/core/agent/**`, `src/core/bubble/**`, `src/core/runtime/**`, `src/core/reviewer/**`, `src/v11/application/**`, `src/v11/shared/**`, `src/v11/domain/**`; az ebben a halmazban talalt behavior-defining current-state file vagy inventorálandó, vagy explicit excluded note-tal indoklandó.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` | checked-in inventory artifact | markdown inventory schema -> checked-in artifact | uj inventory artifact | Egyetlen canonical inventory artifact keszul, amely kotelezo headerben rogzitett `baseline_commit_sha` + `baseline_ref_kind` + `baseline_source_tree_state` + `source_universe_ref` + explicit `source_universe_seed_scope` path-lista + explicit `source_universe_delegate_paths` lista + explicit `inspected_source_scope` path-lista + explicit `excluded_source_paths` path-lista mezokkel es tablazatos behavior row-kkal dokumentalja a relevans actor surface-t; a delegate manifest minden eleme parent seed/delegate kapcsolattal auditálható | P1 | required-now | Phase A deliverable definicio |
| CS2 | `src/index.ts` + `src/cli/index.ts` + `src/cli/orchestra.ts` + `src/cli/commands/agent/emit.ts` + `src/cli/commands/agent/pass.ts` + `src/cli/commands/agent/askHuman.ts` + `src/cli/commands/agent/converged.ts` + `src/cli/commands/bubble/metaReview.ts` + `src/v11/application/pass/emitPassV11.ts` + `src/v11/application/askHuman/emitAskHumanV11.ts` + `src/v11/application/converged/emitConvergedV11.ts` + `src/v11/shared/pass/passCommandOrchestration.ts` + `src/v11/shared/pass/emitPassContextBuilder.ts` + `src/v11/shared/pass/passFlowDispatch.ts` + `src/v11/shared/askHuman/askHumanCommandApi.ts` + `src/v11/shared/askHuman/askHumanCommandDispatchInputBuilder.ts` + `src/v11/shared/askHuman/askHumanCommandOrchestrationDispatch.ts` + `src/v11/shared/converged/convergedCommandOrchestration.ts` + `src/v11/shared/converged/convergedFlowInvocationBuilders.ts` + `src/v11/shared/converged/convergedCommandInputNormalization.ts` + `src/core/protocol/envelope.ts` + `src/core/protocol/validators.ts` | current-state actor-facing es retained entrypoint inventory | source inspection -> inventory rows | actor entrypoint es public package export surface a jelenlegi checkouton | Az inventory kulon azonositsa a jelenlegi canonical, retained, operatori es accidental CLI/protocol surface-eket, beleertve a command-level role-specifikus semantics-et, aliasokat, a nevesitett shared/orchestration API-kat, a ma tenylegesen letezo emit/protocol pathokat, az explicit actor-emission CLI surface-t, valamint a jelenlegi public package export surface relevans actor/bubble entrypointjait. Future vagy in-flight path csak kulon note lehet, nem current-state source. | P1 | required-now | Phase A current-state inventory purity |
| CS2a | `src/v11/application/pass/reviewerPassPreparation.ts` + `src/v11/application/pass/passValidationGate.ts` + `src/core/reviewer/reviewVerification.ts` + `src/core/runtime/passValidationEvidence.ts` + `src/v11/domain/pass/reviewerDecision.ts` | reviewer-only validation es artifact inventory | source inspection -> inventory rows | reviewer policy, artifact generation es verification behavior | Az inventory explicitten fedje le a reviewer-only validation/policy gate-eket, a review verification artifact szerzodest, az artifact-side-effect pathokat, valamint a reviewer decision/domain-level current-state policy logikat; ezek current-state source nelkul nem maradhatnak implicit summary-szinten. | P1 | required-now | validation/policy + artifact coverage |
| CS2b | `src/v11/application/metaReview/metaReviewCliCommand.ts` + `src/v11/application/metaReview/metaReviewCliDispatcher.ts` + `src/v11/application/metaReview/metaReviewCliOptions.ts` + `src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts` + `src/v11/application/metaReview/emitMetaReviewV11.ts` + `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` + `src/v11/shared/metaReview/metaReviewCommandApi.ts` + `src/v11/shared/metaReviewGate/metaReviewGatePaneBinding.ts` + `src/core/runtime/metaReviewSubmitGuidance.ts` + `src/cli/commands/agent/shared/findingParser.ts` | meta-review parser/dispatcher es shared guidance inventory | source inspection -> inventory rows | meta-review current-state parser, dispatcher, submit guidance, recover/gate es shared parser surface | Az inventory explicitten fedje le a meta-review parser/dispatcher stack current-state behaviorat, a meta-review emit shimet, a shared meta-review command API-t, a meta-review submit guidance reteget, a recover/gate flow-t es pane-rebind/relaunch boundaryt, a parser helper current-state logikat, valamint a shared finding parser actor-surface szerepet; ezek a current actor surface reszei, nem maradhatnak csak parent-plan utalas szintjen. | P1 | required-now | parser/guidance surface completeness |
| CS3 | `src/core/agent/pass.ts` + `src/core/agent/askHuman.ts` + `src/core/agent/converged.ts` + `src/core/bubble/metaReview.ts` + `src/core/bubble/workspaceResolution.ts` + `src/core/bubble/bubbleLookup.ts` + `src/core/bubble/repoResolution.ts` + `src/core/runtime/pairflowCommand.ts` + `src/core/runtime/tmuxDelivery.ts` + `src/core/runtime/agentCommand.ts` | runtime, context es executor-touchpoint inventory | source inspection -> inventory rows | actor/executor/runtime touchpoints | Az inventory kulon rogzitse, hogy mely behavior actor-boundary, melyik executor/runtime concern, es hol van ma implicit context vagy transport-coupling; ide tartozik az agent CLI parancs-osszeallitas es worktree-pinning current-state viselkedese is. Ha in-flight Phase 4 pathokkal van elteres, azt divergence note-kent kell kezelni, nem current-state replacementkent. | P1 | required-now | actor-vs-executor szetvalasztas Phase A outputja |
| CS4 | `src/cli/index.ts` + `src/cli/commands/bubble/start.ts` + `src/cli/commands/bubble/resume.ts` + `src/cli/commands/bubble/restart.ts` + `src/v11/application/start/startCliCommand.ts` + `src/v11/application/start/startCliRunner.ts` + `src/v11/application/start/emitStartV11.ts` + `src/v11/shared/start/startCommandApi.ts` + `src/v11/shared/start/startCommandTmuxLaunch.ts` + `src/v11/application/resume/emitResumeV11.ts` + `src/v11/application/restart/restartCliCommand.ts` + `src/v11/application/restart/emitRestartV11.ts` + `src/v11/shared/start/startCommandPrompts.ts` + `src/v11/shared/start/startCommandImplementerPrompts.ts` + `src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts` + `src/v11/shared/start/startCommandResumeImplementerPrompt.ts` + `src/core/runtime/agentCommand.ts` | start/resume/restart actor-runtime boundary inventory | source inspection -> inventory rows | actor launch, kickoff-injection, resume es restart surface | Az inventory explicitten fedje le, hogyan lep be az actor a bubble runtime-ba startkor, resume-kor es restartkor, beleertve a CLI entrypointokat, v11 application boundaryket, a nevesitett start/restart runner- es emit/API-shimeket, a tmux launch/session-osszeallitas current-state reteget, az agent CLI flag- es command-osszeallitas current-state pontjat, valamint a prompt/runtime guidance reteg szerepet is. | P1 | required-now | actor runtime current-state surface completeness |
| CS5 | `README.md` + `docs/pairflow-initial-design.md` + `src/core/runtime/reviewerCommandGateGuidance.ts` + `src/core/runtime/reviewerGuidance.ts` + `src/core/runtime/reviewerSeverityOntology.ts` + `src/core/runtime/reviewerScoutExpansionGuidance.ts` + `src/core/reviewer/testEvidence.ts` + `src/core/reviewer/reviewerBrief.ts` | prompt/guidance/docs inventory | source inspection -> inventory rows | user-facing, runtime guidance es historical docs surface | Az inventory kulon dokumentalja, hol jelennek meg actor-specifikus command ajanlasok, reviewer command-gate routing szabalyok, document-scope review routing guidance, severity/scout guidance, reviewer brief/test-evidence reminder es current UX-leirasok vagy historical baseline allitasok. A `README.md` es a `docs/pairflow-initial-design.md` supporting docs surface marad: coverage-kotelezoek, de nem reszei a baseline current-state `source_universe` clean-full-scope gate-jenek; a CS5-ben felsorolt `src/**` runtime/reviewer guidance file-ok viszont a current-state code `source_universe` minimum seed scope-jaba tartoznak. | P1 | required-now | behavioral completeness |
| CS6 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` + `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` + `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md` + `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md` + `docs/v2/pairflow-v2-architecture-plan-joint.md` | normative es informational synthesis | plan/docs synthesis -> inventory framing notes | inventory preface vagy methodology section | Az artifact explicitten kulonitse el a normativ forrasokat es az inspirational inputokat, es rogzitse, hogy a target-minositeseket melyik boundary-logika vezeti | P1 | required-now | precedence es auditability |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Inventory artifact header baseline | nincs explicit reproducibility baseline | minden inventory artifact egyetlen rogzitett current-state baseline-hoz kotott | `baseline_commit_sha`, `baseline_ref_kind` (`analysis_head`, `main_head`, `merge_base_with_main`), `baseline_source_tree_state` (`clean-full-scope`, `clean-inspected-scope`), `source_universe_ref` (`phaseA_current_state_source_universe_manifest_v1`), `source_universe_seed_scope` (explicit repo-relativ markdown lista a seed pathokrol), `source_universe_delegate_paths` (explicit repo-relativ markdown lista `path | parent | rationale_ref` shape-pel), `inspected_source_scope` (explicit repo-relativ markdown lista), `excluded_source_paths` (explicit repo-relativ markdown lista vagy `[]`) | `baseline_ref_label`, `captured_at`, `main_head_sha_at_capture`, `baseline_note`, `excluded_source_notes` (explicit markdown lista `path | reason | source_ref` shape-pel) | additive docs-only | P1 | required-now |
| Behavior inventory row schema | nincs canonical current-state actor behavior inventory | egyetlen checked-in inventory row schema | `behavior_id`, `surface`, `surface_entry_kind`, `alias_status`, `behavior_layers`, `trigger`, `behavior_scope`, `role_scope`, `actor_scope`, `agent_config_evidence`, `boundary_owner`, `input_authority`, `input_shape_or_contract`, `output_kind_or_effect`, `side_effects_or_artifacts`, `source_refs`, `current_status`, `target_disposition`, `target_justification`, `ambiguity_status`, `evidence_status` | `notes`, `open_question`, `mixed_reason`, `migration_note`, `related_artifacts` | additive docs-only | P1 | required-now |
| Role/Actor separation and AgentConfig evidence | ma tobb codepath implicitten keveri a role- es actorfogalmat, mikozben `AgentConfig` nem biztos, hogy first-class current-state entitas | explicit role/actor columns + kotelezo AgentConfig evidence tracking | `role_scope`, `actor_scope`, `agent_config_evidence` (`first-class`, `implicit`, `absent`, `not-applicable`) | `notes` | docs-only clarification | P1 | required-now |
| Row identity and source-ref shape | a row primary azonositasa es source-ref formatuma nincs lezart contracttal rogzitve | kotott row-level identifier es source-ref shape | `behavior_id` (`B###` forma), `surface` (`path` vagy `path[#symbol]` vagy `path[#Lline]`), `source_refs` (nem ures lista `path[#Lline]` vagy `path[#symbol]` elemekkel) | `related_artifacts` | docs-only auditability | P1 | required-now |
| Row trigger, input es output shape | trigger, input es output hatar nincs formai contracttal rogzítve | kotott family:detail shape | `trigger` (`cli|runtime|prompt|artifact|docs|plan:detail`), `input_shape_or_contract` (`flags|json|workspace-context|artifact|prompt-text|none:detail`), `output_kind_or_effect` (`protocol|artifact|guidance|validation|state-projection|none:detail`) | `notes` | docs-only auditability | P1 | required-now |
| Row side-effect shape | side-effect audit jelenleg csak retegcimkevel kozelitheto meg | explicit side-effect contract | `side_effects_or_artifacts` (`artifact-write|state-write|prompt-emission|validation-log|none:detail`) | `related_artifacts`, `notes` | docs-only auditability | P1 | required-now |
| Row scope and authority enums | role/actor/authority mezok jelentese jelenleg reszben prose-bol jon | explicit enumolt row-level shape | `role_scope` (`implementer|reviewer|meta_reviewer|operator|shared`, 1+), `actor_scope` (`generic-agent|role-bound-agent|meta-review-agent|human-operator|mixed|none`, 1+), `input_authority` (`explicit-cli-input|workspace-derived-context|runtime-derived-context|artifact-derived-context|docs-derived-context|mixed`) | `notes` | docs-only auditability | P1 | required-now |
| Actor vs executor boundary classification | ma tobb helyen osszecsuszik a runtime/process concern es az actor behavior | kulon boundary classification minden relevans row-nal | `boundary_owner` (`actor` vagy `executor` vagy `mixed`) | `mixed_reason`, `migration_note` | docs-only clarification | P1 | required-now |
| Behavior scope classification | a kozos vs szerepkorhoz kotott dimenzio nincs kulon schema-szinten rogzitve | explicit enumolt behavior-scope classification | `behavior_scope` (`common`, `role-specific`) | `notes` | docs-only auditability | P1 | required-now |
| Current-state status classification | a canonical/transitional/accidental dimenzio nincs kulon schema-szinten rogzitve | explicit enumolt current-state status | `current_status` (`canonical`, `transitional`, `accidental`) | `notes` | docs-only auditability | P1 | required-now |
| Surface entry classification | retained/operator/runtime/docs jelleg prose-ban keveredik | explicit enumolt surface-entry classification | `surface_entry_kind` (`actor-facing`, `operator`, `runtime-helper`, `executor-touchpoint`, `prompt-guidance`, `docs-surface`) | `notes` | docs-only auditability | P1 | required-now |
| Alias status classification | retained alias informacio ma prose-ban keveredik mas tengelyekkel | explicit alias-status classification | `alias_status` (`primary`, `retained-alias`, `none`) | `notes` | docs-only auditability | P1 | required-now |
| Behavior layer classification | validation/policy, artifact, emit, context es launch retegek ma osszemosodnak | explicit enumolt, tobb erteket is engedo layer classification | `behavior_layers` (egy vagy tobb ertek: `entrypoint-parser`, `validation-policy`, `artifact-side-effect`, `emit-path`, `context-resolution`, `event-relay`, `launch-resume`, `docs-guidance`) | `notes` | docs-only auditability | P1 | required-now |
| Core vs extension target classification | nincs explicit policy-vezérelt current-state mapping | minden row kap target dispositiont | `target_disposition` (`core`, `extension`, `adapt`, `remove`, `undecided`), `target_justification` | `migration_note`, `open_question` | docs-only forward design aid | P1 | required-now |
| Ambiguity and evidence tracking | ambiguity/evidence-gap csak narrativ elvaraskent jelenik meg | dedikalt row-level tracking mezok | `ambiguity_status` (`clear` vagy `ambiguous`), `evidence_status` (`sufficient` vagy `gap`) | `open_question`, `notes` | docs-only auditability | P1 | required-now |
| Informational comparison note | ad hoc inspiracios megjegyzesek | explicit methodology note a kotelezo v2 es opcionális Pi tanulsagairol | `source`, `relevance`, `non_normative_status` | `adopt_now`, `defer_reason` | docs-only | P2 | required-now |

Normative rules:

1. Minden inventory row-hoz kotelezo konkret source reference kell.
2. Minden inventory artifact headerben kotelezo a `baseline_commit_sha`, `baseline_ref_kind`, `baseline_source_tree_state`, `source_universe_ref`, `source_universe_seed_scope`, `source_universe_delegate_paths`, `inspected_source_scope` es `excluded_source_paths`, es minden current-state allitas erre a baseline-ra vonatkozik.
3. Default baseline a `analysis_head`; ettol eltero baseline csak explicit `baseline_note`-tal fogadhato el.
4. Az inventorozott source pathoknak a rogzitett baseline-hoz kepest clean tracked allapotban kell lenniuk; ha dirty elteres van, az inventory blokkolo reproducibility hiba.
5. `excluded_source_paths` akkor is kotelezo, ha ures; ebben az esetben explicit ures listakent vagy `[]`-kent kell szerepelnie.
6. A `source_universe_ref=phaseA_current_state_source_universe_manifest_v1` fixen a `current_state_source_universe` fogalmat jelenti; ez az inventory artifactben explicitten rogzitett manifest, amely a task `CS2`, `CS2a`, `CS2b`, `CS3`, `CS4` es a `CS5`-ben nevesitett `src/**` guidance/reviewer sorok altal kijelolt minimum current-state code seed scope-bol indul ki.
7. A `source_universe_seed_scope` kotelezoen explicit repo-relativ path-listakent rogzitendo az inventory artifact headerben, es legalabb a task `CS2`, `CS2a`, `CS2b`, `CS3`, `CS4` es a `CS5`-ben nevesitett `src/**` current-state code seed pathokat kell tartalmaznia, koztuk a jelenlegi ismert canonical actor-emission surface elemeit is, peldaul `src/cli/commands/agent/emit.ts`.
8. A `source_universe_delegate_paths` csak olyan extra repo-relativ pathokat tartalmazhat, amelyek behavior-defining delegate modulok egy mar nevesitett seed vagy mar rogzitett delegate file-hoz kepest; minden ilyen pathhoz source-ref vagy rovid indoklas kell, valamint rogzitni kell a parent seed/delegate kapcsolatot.
9. Ha `baseline_source_tree_state=clean-inspected-scope`, akkor az `inspected_source_scope` es az `excluded_source_paths` egyutt teljesen le kell fedje a `current_state_source_universe` halmazt, es az `excluded_source_notes`-nak indokolnia kell a kizarast. Ez a szabaly nem vonatkozik a supporting docs surface elemeire.
10. A Call-site Matrix normativ minimum inspection scope: a seed file-lista kotelezo, es ehhez az inventory artifact manifestjeben rogzitett delegate pathok adhatok hozza; nincs ennel tagabb implicit source-closure, de a manifest recursive bovitese kotelezo, ha egy mar inventorozott file uj behavior-defining delegate-re mutat.
11. Ha inspection kozben egy uj, behavior-defining delegate file derul ki, azt az inventory artifact `source_universe_delegate_paths` listajaba kell felvenni source-refes indoklassal es parent kapcsolattal; ez inventory-level korrekcio, nem task-refine blocker, es nem utesben a task docs-only edit boundaryjaval.
12. `clean-inspected-scope` csak in-progress vagy draft inventoryhoz legalis. Approval-ready, checked-in Phase A deliverable csak `clean-full-scope` `baseline_source_tree_state` mellett fogadhato el.
13. A delegate manifest akkor tekintheto elegsegesnek, ha az inspection vegere fixpontot er el: minden behavior-defining seed/delegate file vagy benne van a `source_universe_seed_scope`/`source_universe_delegate_paths` halmazban, vagy explicitten `excluded_source_paths` alatt, source-refes indoklassal van rogzitve, es nincs tovabbi fel nem vett behavior-defining delegate hivatkozas az inventorozott current-state source-universe halmazon belul.
14. Approval-ready deliverable-nel a `source_universe_seed_scope` es a delegate manifest mellett kotelezo egy fuggetlen candidate-set reconciliation is az `actor_surface_candidate_set` halmazon: minden onnan azonosithato behavior-defining current-state file vagy inventorálandó, vagy explicit excluded note-tal indoklandó; a seed/delegate halmaz onmagaban nem elegseges teljességi bizonyíték.
15. A `surface`, `trigger`, `role_scope`, `actor_scope`, `input_authority`, `input_shape_or_contract`, `output_kind_or_effect`, `side_effects_or_artifacts` es `source_refs` mezok csak a Terminology Lockban es a Data Contractban rogzitett formatumot/es ertekkeszletet hasznalhatjak.
16. Egy row nem maradhat `target_disposition` nelkul.
17. Ha egy behavior egyszerre actor es executor concernnek tunik, azt `mixed` boundary-ownerrel es explicit `mixed_reason` mezovel kell rogziteni.
18. A `target_justification` minden row-nal kotelezo; kulonosen a `core` target-minositeshez first-principle indoklas kell, nem eleg a jelenlegi gyakorisag vagy torteneti kenyelmi ok.
19. Az `extension` target-minosites nem adhat authority-, routing-, lifecycle-transition vagy hard-validation felelosseget.
20. A Pi-style extension inspiracio csak bounded extension policy note lehet; nem valhat jelen taskban implementacios vagy normativ kotelezettseggé, es a Pi-note hianya onmagaban nem approval-blocker.
21. Az `ambiguity_status` es `evidence_status` minden row-nal kotelezo, meg akkor is, ha ertekuk `clear` es `sufficient`.
22. `target_disposition=undecided` csak akkor legalis, ha `evidence_status=gap` vagy `ambiguity_status=ambiguous`, es a row `open_question` vagy `notes` mezoben rogzitett kovetkezo bizonyitekigenyt tartalmaz.
23. `AgentConfig` current-state fogalom csak akkor rogzitheto first-classkent, ha azt konkret source ref tamasztja ala; ellenkezo esetben `agent_config_evidence=implicit`, `absent` vagy `not-applicable` jeloles kell, es v2-s terminologia nem vetitheto vissza.
24. `agent_config_evidence` es a methodology/inspirational comparison note section-szinten is megjelenhet, de ettol fuggetlenul minden konkret current-state behavior-allitast tovabbra is row-szinten kell rogzitni.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Docs artifacts | uj checked-in inventory markdown | runtime vagy product code modositas | docs-only deliverable | P1 | required-now |
| Source inspection | `src/**`, `docs/**`, `plans/**`, `README.md` olvasasa es behavior kinyerese | a source logicahoz valo hozzanyulas | discovery task, nem refaktor | P1 | required-now |
| External inspiration | opcionálisan Pi tanulsag rovid synthesis note | external mintak normativ contractta emelese | Pi-source exact URL-lel hivatkozando, de optional inspiration marad | P2 | optional-now |

Constraint:

1. Ha a task barmely implementacioja forraskodot vagy runtime behavior-t akar modositani, az mar nem Phase A discovery, hanem kulon follow-up task.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| egy behavior source alapjan nem besorolhato egyertelmuen | source inspection | result | inventory row explicit ambiguity vagy `open_question` jelolessel kerul be | `INVENTORY_CLASSIFICATION_AMBIGUOUS` | warn | P1 | required-now |
| egy feltetelezett behaviorhez nincs eleg evidencia vagy source ref | source inspection | result | a row `evidence_status=gap` jelolest kap, `target_disposition=undecided` marad, es nyitott kerdes note-tal dokumentaljuk a kovetkezo bizonyitekigenyt; nincs ad hoc provisional target | `INVENTORY_EVIDENCE_GAP` | warn | P1 | required-now |
| inventorozott source path dirty a rogzitett baseline-hoz kepest | source inspection | throw | a baseline-t tisztazni kell; dirty inventorozott source path mellett az inventory nem approval-ready | `INVENTORY_DIRTY_BASELINE` | error | P1 | required-now |
| baseline scope reszleges, de az inspected/excluded source scope nincs teljesen rogzitve | source inspection | throw | az artifact headerbol potolni kell az `inspected_source_scope`, `excluded_source_paths` es szukseg eseten `excluded_source_notes` mezoket; enelkul a baseline nem auditálható | `INVENTORY_BASELINE_SCOPE_UNSPECIFIED` | error | P1 | required-now |
| inspection kozben uj behavior-defining delegate file derul ki | source inspection | result | az inventory artifact `source_universe_delegate_paths` listajaba fel kell venni a file-t source-refes indoklassal, es a kapcsolodo row-knak erre kell hivatkozniuk | `INVENTORY_SOURCE_UNIVERSE_EXPAND` | warn | P1 | required-now |
| informational source ellentmond a protocol-first normative refs-nek | external docs | fallback | protocol-first refs maradnak authoritative-ek, az external tanulsag note-kent rogzul | `INSPIRATION_NON_NORMATIVE` | info | P2 | required-now |
| kulonbozo source file-ok ugyanarra a behaviorre eltero current-state kepet adnak | source inspection | result | egy row, explicit divergence note-tal es source refekkel | `INVENTORY_SOURCE_DIVERGENCE` | warn | P1 | required-now |
| external inspirational page nem erheto el vagy nem eleg reszletes | external docs | fallback | a task tovabbra is elvegezheto local codebase + helyi planok alapjan; a Pi-note optional marad, es az inspiracios note ezt explicitten rogzitse | `INSPIRATION_SOURCE_UNAVAILABLE` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md` | P1 | required-now |
| must-use | `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md` | P1 | required-now |
| must-use | `docs/v2/pairflow-v2-architecture-plan-joint.md` mint informational comparison input | P2 | required-now |
| may-use | `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md` mint optional extension inspiration | P2 | optional-now |
| must-not-use | jelenlegi command-union mint vegleges actor interface | P1 | required-now |
| must-not-use | code changes, runtime refactor vagy wrapper bevezetes | P1 | required-now |
| must-not-use | external inspiration mint normativ override | P1 | required-now |
| must-not-use | olyan `extension` minosites, amely kernel-felelosseget vagy authorityt kiszervezne | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | canonical inventory artifact exists | a task implementacioja docs-only modban fut | a deliverable elkészül | letezik a checked-in `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` artifact | P1 | required-now | doc review |
| T1a | baseline reproducibility captured | az inventory artifact current-state allitasokat tesz | az artifact keszul | a header explicit `baseline_commit_sha` + `baseline_ref_kind` + `baseline_source_tree_state` + `source_universe_ref` + explicit `source_universe_seed_scope` path-lista + explicit `source_universe_delegate_paths` lista + explicit `inspected_source_scope` path-lista + explicit `excluded_source_paths` path-lista mezokkel rogziti, melyik git baseline-rol es mely current-state source universe/scope-rol keszult az inventory, es a delegate manifest parent kapcsolatai auditálhatok | P1 | required-now | doc review |
| T1b | baseline policy deterministic | a Phase A inventory branchen vagy bubble worktree-ben keszulhet | a baseline rogzitese megtortenik | defaultkent `analysis_head` szerepel, az ettol eltero baseline explicit `baseline_note`-tal indokolt, es nincs dirty inventorozott source path a baseline-hoz kepest | P1 | required-now | doc review |
| T1c | partial baseline scope remains auditable | az inventory nem full-scope source seten keszul | az artifact keszul | az `inspected_source_scope`, `excluded_source_paths` es szukseg eseten `excluded_source_notes` teljesen auditálhatóan megmutatja, mi volt inventorizalva es mi maradt ki, de ez csak draft/in-progress allapotra elegendo | P1 | required-now | doc review |
| T1d | approval-ready baseline is full-scope | a Phase A deliverable approval-ready allapotba kerul | review megtortenik | az artifact `baseline_source_tree_state=clean-full-scope` ertekkel rogzitett a current-state code `source_universe` halmazra, es nem marad olyan relevans seed/delegate source, amely csak excluded scope-ban szerepelne; supporting docs surface ettol kulon coverage-kent jelenik meg | P1 | required-now | doc review |
| T2 | minimum inventory layers covered | a jelenlegi actor surface tobb retegben el | inventory keszul | az artifact explicit coverage-et ad legalabb az entrypoint/parser, a relevans public package export surface, a nevesitett shared/orchestration command API-k, meta-review parser/dispatcher + recover/gate stack, actor-specifikus validation/policy, reviewer-only validation gate-ek, runtime/context helper, durable protocol emit, event/relay normalizalas vagy annak hianya, executor-fuggosegek, start/resume/restart actor-runtime boundary, tmux launch + agent command assembly, prompt/guidance, reviewer command-gate/document-review routing guidance, artifact/side-effect es legacy alias/compatibility retegekrol | P1 | required-now | doc review |
| T2a | candidate-set reconciliation completed | a seed/delegate manifest onmagaban nem ad fuggetlen teljességi bizonyítékot | approval review megtortenik | az artifact explicitten elszamol az `actor_surface_candidate_set` halmazon talalt behavior-defining current-state file-okkal: inventorálja vagy indokoltan kizarja oket, es a jelenlegi ismert canonical actor-emission surface, peldaul `src/cli/commands/agent/emit.ts`, nem marad ki | P1 | required-now | doc review |
| T3 | Role/Actor separation and AgentConfig evidence captured | a codebase-ben ezek tobb retegen keverednek, de `AgentConfig` nem biztos, hogy first-class current-state fogalom | inventory keszul | az artifact explicitten kulon kezeli a `Role` es `Actor` fogalmat, es minden row-ban kitolti az `agent_config_evidence` mezot `first-class`, `implicit`, `absent` vagy `not-applicable` ertekkel | P1 | required-now | doc review |
| T4 | actor vs executor boundary captured | vannak runtime/process/sync/relay concerns es actor concerns is | inventory keszul | minden relevans row kap boundary-owner minositest, es a mixed esetek explicit indoklassal szerepelnek | P1 | required-now | doc review |
| T5 | core vs extension mapping complete | a behavior inventory rows keszek | target-minosites keszul | minden row kap `core`, `extension`, `adapt`, `remove` vagy evidenciagap eseten explicit `undecided` target-dontest | P1 | required-now | doc review |
| T5a | row schema and review gates stay aligned | a behavior inventory row schema definialva van | az inventory artifact review-ja megtortenik | a kotelezo row-level mezok lefedik a `behavior_scope`, `current_status`, `surface_entry_kind`, `alias_status`, `behavior_layers`, `surface`, `trigger`, `role_scope`, `actor_scope`, `input_authority`, `input_shape_or_contract`, `output_kind_or_effect`, `side_effects_or_artifacts`, `source_refs`, a boundary-owner, target justification, ambiguity es evidence-gap tracking igenyeit is | P1 | required-now | doc review |
| T5b | docs and guidance surfaces use legal anchors | docs- es guidance-surface row-k is szuksegesek | inventory keszul | a `surface` mezoben docs/guidance soroknal elfogadott a puszta `path` vagy `path[#Lline]`, es nincs kitalalt symbol-anchor | P1 | required-now | doc review |
| T6 | required inspirational inputs stay non-normative | v2 tanulsagok szerepelnek | synthesis note keszul | a task explicitten kimondja, hogy a v2 informational input, es nem írja felul a protocol-first normative forrasokat | P2 | required-now | doc review |
| T6a | optional Pi inspiration remains optional | a Pi page elerheto vagy nem elerheto | synthesis note keszul vagy elmarad | ha Pi-note szerepel, az explicit non-normative; ha nem szerepel, az onmagaban nem approval-blocker | P2 | optional-now | doc review |
| T7 | uncertainty is recorded, not hidden | legalabb egy behavior besorolasa ketertelmu vagy evidenciagapos | inventory keszul | az artifact explicit ambiguity/evidence-gap note-tal jeloli az adott row-t, nem tesz hamis biztos allitast | P1 | required-now | doc review |
| T7a | current-state purity preserved | in-flight vagy future pathok letezhetnek kapcsolodo planokban | inventory keszul | a current-state inventory csak a rogzitett baseline-hoz tartozo source pathokat kezeli canonical current forraskent; future path csak kulon note lehet | P1 | required-now | doc review |
| T7b | delegate manifest reaches fixpoint | a seed scope feltarasa kozben uj delegate pathok bukkanhatnak fel | az inventory keszul | a `source_universe_delegate_paths` manifest addig bovul, amig az inventorozott seed/delegate halmazon belul nincs tovabbi fel nem vett behavior-defining delegate hivatkozas, vagy az ilyen path explicit excluded note-tal nem lett rogzitve | P1 | required-now | doc review |
| T8 | Phase 4/5 scope remains protected | aktiv protocol-first Phase 4/5 implementacios munka is fut | Phase A artifact keszul | a deliverable nem ker uj code valtoztatast, nem modositja a Phase 4/5 task acceptance contractjat, es nem irja a parent plant | P1 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a Phase A inventory tul hosszu lenne egyetlen artifactban, kesobb erdemes lehet kulon appendixbe tenni a teljes row-listat es fent tartani egy rovid executive summary-t.
2. [later-hardening] Ha a Pi-style extension inspirationt kulon is fel akarjuk dolgozni, kesobb kulon note keszulhet arrol, hogy milyen bounded extension API-formak johetnek szoba Pairflow-ban.
3. [later-hardening] Ha a `mixed` actor/executor sorok szama magas, kesobb kulon refactor-prep memo is erdemes lehet rola.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Inventory appendix split | L2 | P3 | later-hardening | author note | Ha az artifact tul nagyra no, bontsuk summary + appendix formara |
| HB2 | Extension API follow-up note | L2 | P3 | later-hardening | optional Pi inspiration | Keszitsunk kulon memo-t a bounded extension surface-ekrol, ha a Pi note hasznosnak bizonyul |

## Review Control

1. Minden finding tartalmazzon `priority`, `timing`, `layer`, `evidence` mezot.
2. Ne fogadjunk el olyan inventory artifactot, amely source ref nelkul allit current-state behaviort.
3. Ne fogadjunk el olyan target-minositest, amely `core` vagy `extension` besorolast indoklas nelkul ad, vagy `undecided` besorolast evidence-gap/ambiguity note nelkul hagy.
4. Ne fogadjunk el olyan Phase A deliverable-t, amely normativ interface-et vagy runtime refaktort probal csempeszni discovery helyett.
5. Ne fogadjunk el olyan `extension` besorolast, amely authority-, routing-, lifecycle-transition vagy hard-validation felelosseget kiszervezne a kernelbol.
6. Ne fogadjunk el current-state inventory artifactot future vagy in-flight path current canonical forraskent valo hivatkozasaval.
7. Ne fogadjunk el olyan inventory artifactot, amely explicit baseline-header nelkul tesz current-state allitasokat.
8. Ne fogadjunk el olyan inventory artifactot, amely `AgentConfig` current-state kategoriat konkret source evidence nelkul first-classkent allit.
9. Ne fogadjunk el olyan inventory artifactot, amely a reviewer-only validation/policy vagy artifact viselkedeseket explicit current-state source coverage nelkul hagyja.
10. Ne fogadjunk el olyan inventory artifactot, amely reszleges baseline scope mellett nem rogziti explicitten az `inspected_source_scope` es `excluded_source_paths` mezoket.
11. Ne fogadjunk el olyan inventory artifactot, amely a `source_universe_ref`, az explicit `source_universe_seed_scope` path-lista vagy a `source_universe_delegate_paths` nelkul keszul, vagy a seed/delegate manifestje nincs source-refes indoklassal es parent kapcsolattal rogzitve.
12. Ne fogadjunk el olyan inventory artifactot, amely a CLI wrapper pathokat inventorozza, de a tenyleges shared/orchestration command API-kat vagy reviewer guidance modulokat nem veszi fel current-state sourcekent.
13. Ne fogadjunk el olyan inventory artifactot, amely a row-schema kotelezo mezoihez nem a taskban rogzitett zart enumokat vagy field-shape-eket hasznalja.
14. Ne fogadjunk el olyan inventory artifactot, amely explicit input-shape vagy side-effect contract nelkul allit artifact/validation/guidance behaviort.
15. Ne fogadjunk el olyan inventory artifactot, amely uj behavior-defining delegate file-ra tamaszkodik anelkul, hogy azt az artifact `source_universe_delegate_paths` listaja rogzitene.
16. Ne fogadjunk el olyan inventory artifactot, amely section-szintu AgentConfig vagy methodology note-ba rejti a konkret current-state behavior-allitast a row-szintu rogzitest helyettesitve.
17. Ne fogadjunk el approval-ready Phase A deliverable-t `baseline_source_tree_state=clean-inspected-scope` ertekkel.
18. Ne fogadjunk el olyan inventory artifactot, amelynek delegate manifestje nem erte el a rogzitett fixpontot, vagy a tovabbi behavior-defining delegate hivatkozasokat nem inventoryzta vagy nem zarta ki explicit note-tal.
19. Ne fogadjunk el olyan inventory artifactot, amely supporting docs surface elemeket a baseline current-state `source_universe` reszekent kezeli, vagy ezeket clean-full-scope blockerre emeli.
20. Ne fogadjunk el olyan inventory artifactot, amely a seed/delegate manifestre onigazolaskent tamaszkodik, de nem szamol el explicitten az `actor_surface_candidate_set` halmazon azonositott behavior-defining current-state file-okkal.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. letezik a checked-in inventory artifact, es a teljes relevans actor surface legalabb a Phase 4/5 taskokban szereplo actor/runtime boundaryk, a relevans public package export surface, a meta-review parser/dispatcher + recover/gate stackek, a nevesitett shared/orchestration command API-k, a start/resume tmux launch + agent command assembly pontok, a current guidance/helper retegek, valamint az `actor_surface_candidate_set` fuggetlen reconciliation-je menten inventorozva van;
2. minden inventoryzott behavior rendelkezik `behavior_scope` minositessel (`common`, `role-specific`), `current_status` minositessel (`canonical`, `transitional`, `accidental`), `surface_entry_kind`, `alias_status` es `behavior_layers` minositessel, valamint target-minositessel (`core`, `extension`, `adapt`, `remove`, vagy evidenciagap eseten `undecided`);
3. a deliverable explicitten szetvalasztja a `Role` es `Actor` fogalmat, valamint evidencialisan rogziti az `AgentConfig` current-state jelenletet (`first-class`, `implicit`, `absent`, `not-applicable`), tovabba kulon kezeli az actor boundaryt es az executor boundaryt;
4. a v2 tanulsagok informational, non-normative note-kent kotelezoen szerepelnek; a Pi tanulsagok, ha szerepelnek, szinten non-normative note-kent jelennek meg, de hianyuk onmagaban nem blocker;
5. a row-level schema es a review gate-ek konzisztensen lefedik a `behavior_scope`, `current_status`, `surface_entry_kind`, `alias_status`, `behavior_layers`, `surface`, `trigger`, `role_scope`, `actor_scope`, `input_authority`, `input_shape_or_contract`, `output_kind_or_effect`, `side_effects_or_artifacts`, `source_refs`, `boundary_owner`, `target_justification`, `ambiguity_status` es `evidence_status` kovetelmenyeket;
6. az inventory artifact explicit baseline-headerrel rogzitett git allapothoz kotott, defaultkent `analysis_head` baseline-t hasznal, `source_universe_ref=phaseA_current_state_source_universe_manifest_v1` hivatkozassal dolgozik, a current-state source-universe-t explicit seed path-listabol es az artifactben rogzitett delegate manifestbol vezeti le, az inventorozott source pathok clean tracked allapotat is rogziti, a delegate manifest fixpontjat eleri, approval-ready allapotban `baseline_source_tree_state=clean-full-scope` erteket hasznal a current-state code universe-re, es draft reszleges scope eseten auditálhatóan felsorolja az `inspected_source_scope` es `excluded_source_paths` mezoket is;
7. a current-state inventory nem nyitja ujra a Phase 4/5 implementacios acceptance contractot;
8. a Phase A task csak a checked-in inventory artifactot modositja;
9. a section-szintu AgentConfig vagy methodology note nem valthatja ki a row-szintu behavior inventoryt.
