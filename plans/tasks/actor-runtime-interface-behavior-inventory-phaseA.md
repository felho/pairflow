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

Checked-in, docs-only current-state inventory keszitese a mai actor surface-rol ugy, hogy a Phase B mar tiszta use-case, boundary es drift-kepre epuljon, ne intuiciora.
Phase A akkor sikeres, ha letrejon egy jol olvashato inventory artifact, amely:
1. kulon kezeli a `Role`, `Actor` es ahol ertelmes, az `AgentConfig` fogalmat,
2. szetvalasztja az actor- es executor-boundaryt,
3. bemutatja a jelenlegi fo use case-eket, special case-eket es retained aliasokat,
4. minden inventorozott behaviorrol rogzit egy kezdeti target-minositest: `core`, `extension`, `adapt`, `remove`, vagy bizonytalansag eseten `undecided`,
5. explicitten jeloli a nyitott kerdeseket es evidenciagapokat.

### Context

1. A kulon plan mar rogzitette, hogy a jovobeli actor runtime interface nem a jelenlegi command-union mechanikus absztrakcioja lesz, hanem capability-alapu, protocol-first boundary.
2. Phase 4 es Phase 5 tovabbra is elsobbseget elvez a canonical actor-emission surface es a legacy cleanup leszallitasaban; emiatt a Phase A discovery-only munka.
3. A discovery fazisnak a jelenlegi actor entrypointokat, parser-eket, runtime/context helper-eket, prompt/guidance retegeket, artifact pathokat es executor-fuggosegeket kell attekintheto modon feltarkepelnie.
4. A v2 architecture anyagbol atveendo fo tanulsagok: a workflow/kernel a state tulajdonosa, a capability enforcement boundaryn tortenik, es az actor boundary nem keverheto ossze az executor boundaryval.
5. Ha Pi-style extension inspiracio is felhasznalasra kerul, annak tanulsaga legfeljebb az lehet, hogy a jovobeli actor runtime interface magja maradjon kicsi, es a ritkabb vagy experimentalis behaviorok bounded extension pontkent jelenjenek meg; authority-, routing- vagy state-ownership funkciok nem szervezhetok ki plugin-szeru retegekbe.
6. A Phase A tisztan current-state inventory: a checkoutolt codepathok az authoritative current-state evidence forrasok. In-flight vagy Phase 4/5 target-pathok csak kulon note-kent emlithetoek, current-state sourcekent nem.

### In Scope

1. Checked-in inventory artifact letrehozasa a jelenlegi actor behaviorokrol.
2. A jelenlegi actor entrypointok, parser-ek, runtime/context helper-ek, emit pathok, prompt/guidance surface-ek es fontos lifecycle touchpointok feltarasa.
3. Egy rovid baseline-note rogzitese arrol, hogy mely branch/HEAD es mely scope alapjan keszult az inventory.
4. `Role` es `Actor` fogalmi szetvalasztasanak rogzitese, valamint annak explicit dokumentalasa, hogy a mai codepathokban van-e bizonyitott `AgentConfig`-jellegu current-state evidencia.
5. Actor-boundary es executor-boundary erintkezesi pontok explicit felsorolasa.
6. Minden inventorozott behavior rovid row-szintu leirasa source-refekkel es kezdeti target-minositessel.
7. A fo use case-ek, retained aliasok, reviewer-only kulonutak, meta-review sajatossagok es fontos unknownok osszegyujtese.
8. Informational comparison note a kotelezo v2 boundary-tanulsagokrol, valamint opcionalisan a Pi-style extension gondolkodas relevans tanulsagairol.

### Out of Scope

1. Barmilyen forraskod-modositas az actor runtime, executor, CLI vagy state machine retegekben.
2. Uj actor runtime interface vagy wrapper implementalasa.
3. Phase 4 vagy Phase 5 acceptance contract ujranyitasa vagy atirasa.
4. Teljes plugin-platform vagy extension API tervezese.
5. Full-scope, gepileg bizonyithato completeness vagy audit-trail rendszer kiuritese.
6. Uj workflow template, capability engine vagy kernel extraction implementalasa.

### Safety Defaults

1. Ez a task docs-only discovery task; product- vagy runtime-kod nem modosithato.
2. Az inventory leiro artifact, nem normativ architecture replace. A jelenlegi behavior dokumentalasa nem egyenlo annak jovobeli legitimalasaval.
3. Ha egy behavior besorolasa bizonytalan, explicit ambiguity vagy evidence-gap jeloles kell; hallgatozos feltetelezes nem elfogadhato.
4. A v2 architecture kotelezo informational input, a Pi extensions anyag opcionális informational input; egyik sem irhatja felul a jelenlegi protocol-first plan vagy a Phase 4/5 taskok normativ contractjat.
5. A target `core` vs `extension` dontes nem alapulhat pusztan jelenlegi command-neveken vagy torteneti beragodasokon; a canonical protocol modell az elsodleges.
6. A current-state inventory canonical evidence forrasa a checkoutolt codebase; a `README.md` current user-facing behavior-summary es CLI/API context, a `docs/pairflow-initial-design.md` pedig historical baseline es architectural context.
7. A baseline rogzitese legyen eleg egyszeru: legalabb egy rovid `baseline_note` header-mezo jelezze, hogy mely current-state checkout alapjan keszult a dokumentum.
8. A cel a jo dontestamogatas, nem a teljes auditability. Ha egy area csak reszben van atnezve, azt explicit coverage note-tal kell jelezni, de ez nem automatikus blocker.

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
   - A bubble rendszer current user-facing behavior-summary es CLI/API context innen jon, de a current-state inventory authoritative evidence-forrasa tovabbra is a checkoutolt codebase.
4. Informational reference set:
   - `docs/pairflow-initial-design.md` historical baseline es architectural contextkent
   - `docs/v2/pairflow-v2-architecture-plan-joint.md`
   - `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md` mint optional extension-inspiracio
5. Precedence rule:
   - current-state behavior megallapitasakor a checkoutolt current-state codepathok az elsodleges evidence-forrasok;
   - a target-minositesek, boundary-ertelemzes es Phase A scopeertelmezes binding normativ forrasai a `plan_ref` es a fenti binding normative companion set;
   - a `README.md` current UX/CLI contextkent es supporting API-surface summarykent hasznalhato, de nem irhatja felul a codebase-bol kinyerheto tenyleges behavior-kepet;
   - a `README.md` es a `docs/pairflow-initial-design.md` supporting docs surface, nem egyenloek a current-state source code evidence-szel;
   - a baseline-note es coverage-note celja az olvashatosag, nem egy formalizalt bizonyitasi protokoll;
   - ha informational inspiracio es a binding normativ forrasok kozott feszultseg van, a binding normativ forrasok az elsodlegesek, az inspirational source pedig csak note-kent szerepelhet.

### Terminology Lock

1. `behavior inventory row` = egy konkret jelenlegi actor-viselkedes dokumentalt egysege, amely triggerrel, inputtal, outputtal, side effecttel es source referenciaval rendelkezik.
2. `behavior_scope` = azt rogzitő tengely, hogy egy behavior kozos (`common`) vagy szerepkorhoz kotott (`role-specific`).
3. `current_status` = azt rogzitő tengely, hogy egy behavior a mai rendszerben canonical, transitional vagy accidental.
4. `surface_entry_kind` = azt rogzitő tengely, hogy a behavior mely belepesi vagy megjelenesi surface-fajtaban el: `actor-facing`, `operator`, `runtime-helper`, `executor-touchpoint`, `prompt-guidance`, `docs-surface`.
5. `alias_status` = azt rogzitő tengely, hogy a behavior primary current surface, retained alias vagy alias-nelkul letezo viselkedes-e.
6. `behavior_layers` = egy vagy tobb retegcimke, amely azt mutatja, hogy az adott behavior mely current-state retegekben jelenik meg: `entrypoint-parser`, `validation-policy`, `artifact-side-effect`, `emit-path`, `context-resolution`, `event-relay`, `launch-resume`, `docs-guidance`.
7. `agent_config_evidence` = annak row-szintu rogzitese, hogy a mai codebase-ben van-e `first-class`, `implicit`, `absent` vagy `not-applicable` `AgentConfig`-jellegu current-state evidencia; v2 nomenklatura nem vetitheto vissza forras nelkul.
8. `inspected_source_scope` = annak rovid, olvashato rogzítese, hogy mely current-state source csaladokat neztuk at a dokumentumhoz.
9. `supporting_docs_surface` = olyan supporting dokumentacios surface, amely current UX/API summaryt vagy historical baselinet ad, de nem egyenlo a current-state source code evidence-szel.
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
23. `undecided` = olyan target-minosites, amely akkor hasznalhato, ha a row meg nem tiszta vagy a kovetkezo fazisra marad nyitott.
24. `actor boundary` = amit egy actor workflow-step vegrehajtasa kozben lat es hasznal.
25. `executor boundary` = process/workspace/sync/relay/liveness reteg, amely nem egyenlo az actor runtime interface-szel.
26. `behavior-defining delegate` = olyan konkret current-state file, amely egy mar scope-ba emelt seed vagy delegate surface megfigyelheto actor/runtime viselkedeset kozvetlenul meghatarozza, peldaul command-osszeallitas, pane-launch, prompt-osszeallitas, input-normalizalas, dispatch, gate-flow, recovery vagy pane-binding logika altal; puszta altalanos utility vagy passziv tipusdefinicio nem eleg ehhez a minositeshez.
27. `baseline_note` = rovid szoveges rogzites arrol, hogy mely checkout/HEAD es milyen coverage-szint alapjan keszult az inventory.
28. `coverage_note` = rovid, olvashato megjegyzes arrol, hogy mi volt teljesebben atnezve, mi maradt reszleges, es hol vannak explicit unknownok.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` | checked-in inventory artifact | markdown inventory schema -> checked-in artifact | uj inventory artifact | Egyetlen jol olvashato inventory artifact keszul, amely baseline-note-tal, rovid coverage-note-tal, tablazatos behavior row-kkal es osszegzo use-case / unknown sectionokkal dokumentalja a relevans actor surface-t | P1 | required-now | Phase A deliverable definicio |
| CS2 | `src/index.ts` + `src/cli/index.ts` + `src/cli/orchestra.ts` + `src/cli/commands/agent/emit.ts` + `src/cli/commands/agent/pass.ts` + `src/cli/commands/agent/askHuman.ts` + `src/cli/commands/agent/converged.ts` + `src/cli/commands/bubble/metaReview.ts` + `src/v11/application/pass/emitPassV11.ts` + `src/v11/application/askHuman/emitAskHumanV11.ts` + `src/v11/application/converged/emitConvergedV11.ts` + `src/v11/shared/pass/passCommandOrchestration.ts` + `src/v11/shared/pass/emitPassContextBuilder.ts` + `src/v11/shared/pass/passFlowDispatch.ts` + `src/v11/shared/askHuman/askHumanCommandApi.ts` + `src/v11/shared/askHuman/askHumanCommandDispatchInputBuilder.ts` + `src/v11/shared/askHuman/askHumanCommandOrchestrationDispatch.ts` + `src/v11/shared/converged/convergedCommandOrchestration.ts` + `src/v11/shared/converged/convergedFlowInvocationBuilders.ts` + `src/v11/shared/converged/convergedCommandInputNormalization.ts` + `src/core/protocol/envelope.ts` + `src/core/protocol/validators.ts` | current-state actor-facing es retained entrypoint inventory | source inspection -> inventory rows | actor entrypoint es public package export surface a jelenlegi checkouton | Az inventory kulon azonositsa a jelenlegi canonical, retained, operatori es accidental CLI/protocol surface-eket, beleertve a command-level role-specifikus semantics-et, aliasokat, a nevesitett shared/orchestration API-kat, a ma tenylegesen letezo emit/protocol pathokat, az explicit actor-emission CLI surface-t, valamint a jelenlegi public package export surface relevans actor/bubble entrypointjait. Future vagy in-flight path csak kulon note lehet, nem current-state source. | P1 | required-now | Phase A current-state inventory purity |
| CS2a | `src/v11/application/pass/reviewerPassPreparation.ts` + `src/v11/application/pass/passValidationGate.ts` + `src/core/reviewer/reviewVerification.ts` + `src/core/runtime/passValidationEvidence.ts` + `src/v11/domain/pass/reviewerDecision.ts` | reviewer-only validation es artifact inventory | source inspection -> inventory rows | reviewer policy, artifact generation es verification behavior | Az inventory explicitten fedje le a reviewer-only validation/policy gate-eket, a review verification artifact szerzodest, az artifact-side-effect pathokat, valamint a reviewer decision/domain-level current-state policy logikat; ezek current-state source nelkul nem maradhatnak implicit summary-szinten. | P1 | required-now | validation/policy + artifact coverage |
| CS2b | `src/v11/application/metaReview/metaReviewCliCommand.ts` + `src/v11/application/metaReview/metaReviewCliDispatcher.ts` + `src/v11/application/metaReview/metaReviewCliOptions.ts` + `src/v11/application/metaReview/metaReviewCliOptionParser.ts` + `src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts` + `src/v11/application/metaReview/emitMetaReviewV11.ts` + `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` + `src/v11/shared/metaReview/metaReviewCommandApi.ts` + `src/v11/shared/metaReviewGate/metaReviewGatePaneBinding.ts` + `src/core/runtime/metaReviewSubmitGuidance.ts` + `src/cli/commands/agent/shared/findingParser.ts` | meta-review parser/dispatcher es shared guidance inventory | source inspection -> inventory rows | meta-review current-state parser, dispatcher, submit guidance, recover/gate es shared parser surface | Az inventory explicitten fedje le a meta-review parser/dispatcher stack current-state behaviorat, beleertve a tenyleges option parser modult, a meta-review emit shimet, a shared meta-review command API-t, a meta-review submit guidance reteget, a recover/gate flow-t es pane-rebind/relaunch boundaryt, a parser helper current-state logikat, valamint a shared finding parser actor-surface szerepet; ezek a current actor surface reszei, nem maradhatnak csak parent-plan utalas szintjen. | P1 | required-now | parser/guidance surface completeness |
| CS3 | `src/core/agent/pass.ts` + `src/core/agent/askHuman.ts` + `src/core/agent/converged.ts` + `src/core/bubble/metaReview.ts` + `src/core/bubble/metaReviewGate.ts` + `src/core/bubble/workspaceResolution.ts` + `src/core/bubble/bubbleLookup.ts` + `src/core/bubble/repoResolution.ts` + `src/core/runtime/pairflowCommand.ts` + `src/core/runtime/tmuxDelivery.ts` + `src/core/runtime/agentCommand.ts` | runtime, context es executor-touchpoint inventory | source inspection -> inventory rows | actor/executor/runtime touchpoints | Az inventory kulon rogzitse, hogy mely behavior actor-boundary, melyik executor/runtime concern, es hol van ma implicit context vagy transport-coupling; ide tartozik az agent CLI parancs-osszeallitas es worktree-pinning current-state viselkedese is. Ha in-flight Phase 4 pathokkal van elteres, azt divergence note-kent kell kezelni, nem current-state replacementkent. | P1 | required-now | actor-vs-executor szetvalasztas Phase A outputja |
| CS4 | `src/cli/index.ts` + `src/cli/commands/bubble/start.ts` + `src/cli/commands/bubble/kickoff.ts` + `src/cli/commands/bubble/resume.ts` + `src/cli/commands/bubble/restart.ts` + `src/cli/commands/bubble/watchdog.ts` + `src/v11/application/start/startCliCommand.ts` + `src/v11/application/start/startCliRunner.ts` + `src/v11/application/start/emitStartV11.ts` + `src/v11/application/kickoff/kickoffCliCommand.ts` + `src/v11/application/resume/emitResumeV11.ts` + `src/v11/application/restart/restartCliCommand.ts` + `src/v11/application/watchdog/emitWatchdogV11.ts` + `src/core/runtime/watchdog.ts` | lifecycle es actor-runtime boundary inventory | source inspection -> inventory rows | actor launch, kickoff-injection, resume, restart es watchdog surface | Az inventory mutassa be a fontos lifecycle touchpointokat es azt, hogy ezek hol kapcsolodnak actor boundaryhoz, runtime helperhez vagy executor concernhoz. Nem teljes call graph kell, hanem olvashato use-case map. | P1 | required-now | actor runtime current-state surface completeness |
| CS5 | `README.md` + `docs/pairflow-initial-design.md` + `src/core/runtime/reviewerCommandGateGuidance.ts` + `src/core/runtime/reviewerGuidance.ts` + `src/core/runtime/reviewerSeverityOntology.ts` + `src/core/runtime/reviewerScoutExpansionGuidance.ts` + `src/core/reviewer/testEvidence.ts` + `src/core/reviewer/reviewerBrief.ts` | prompt/guidance/docs inventory | source inspection -> inventory rows | user-facing, runtime guidance es historical docs surface | Az inventory kulon dokumentalja, hol jelennek meg actor-specifikus command ajanlasok, reviewer command-gate routing szabalyok, document-scope review routing guidance, severity/scout guidance, reviewer brief/test-evidence reminder es current UX-leirasok vagy historical baseline allitasok. Supporting docs surface maradjon kontextus, ne formalis blocker. | P1 | required-now | behavioral completeness |
| CS6 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` + `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` + `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md` + `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md` + `docs/v2/pairflow-v2-architecture-plan-joint.md` | normative es informational synthesis | plan/docs synthesis -> inventory framing notes | inventory preface vagy methodology section | Az artifact explicitten kulonitse el a normativ forrasokat es az inspirational inputokat, es rogzitse, hogy a target-minositeseket melyik boundary-logika vezeti | P1 | required-now | precedence es auditability |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Inventory artifact header baseline | nincs explicit baseline-note | minden inventory artifact jelezze, hogy nagyjabol milyen current-state checkout es coverage alapjan keszult | `baseline_note`, `inspected_source_scope`, `coverage_note` | `excluded_or_deferred_paths`, `captured_at` | additive docs-only | P1 | required-now |
| Behavior inventory row schema | nincs canonical current-state actor behavior inventory | egyetlen checked-in inventory row schema | `behavior_id`, `surface`, `trigger`, `behavior_scope`, `role_scope`, `actor_scope`, `agent_config_evidence`, `boundary_owner`, `current_status`, `target_disposition`, `source_refs` | `surface_entry_kind`, `alias_status`, `behavior_layers`, `input_authority`, `input_shape_or_contract`, `output_kind_or_effect`, `side_effects_or_artifacts`, `target_justification`, `notes`, `open_question` | additive docs-only | P1 | required-now |
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
| Unknowns and ambiguity tracking | ambiguity/evidence-gap csak narrativ elvaraskent jelenik meg | explicit row-level vagy section-level unknown/ambiguity note | `notes` vagy `open_question` ahol kell | `target_justification` | docs-only auditability | P1 | required-now |
| Informational comparison note | ad hoc inspiracios megjegyzesek | explicit methodology note a kotelezo v2 es opcionális Pi tanulsagairol | `source`, `relevance`, `non_normative_status` | `adopt_now`, `defer_reason` | docs-only | P2 | required-now |

Normative rules:

1. Minden inventory row-hoz kotelezo konkret source reference kell.
2. Az inventory artifact headerben legalabb a `baseline_note`, az `inspected_source_scope` es a `coverage_note` szerepeljen, hogy az olvaso ertse, milyen current-state nezetet lat.
3. Default baseline az `analysis_head`, de ettol eltero baseline is elfogadhato, ha a dokumentum roviden jelzi.
4. Nem kovetelmeny a teljes, gepileg bizonyithato source-universe manifest vagy baseline-proof. Ha a coverage reszleges, azt olvashatoan kell jelezni.
5. A Call-site Matrix minimum reprezentativ coverage-ot adjon a fo actor entrypointokrol, reviewer/meta-review policyrol, runtime/executor touchpointokrol, lifecycle surface-ekrol es guidance surface-ekrol.
6. A `behavior_id`, `surface`, `trigger`, `role_scope`, `actor_scope`, `agent_config_evidence`, `boundary_owner`, `current_status`, `target_disposition` es `source_refs` mezok ne maradjanak ki a tenyleges behavior row-kbol.
7. Egy row nem maradhat `target_disposition` nelkul.
8. Ha egy behavior egyszerre actor es executor concernnek tunik, azt `mixed` boundary-ownerrel es rovid note-tal kell rogziteni.
9. Az `extension` target-minosites nem adhat authority-, routing-, lifecycle-transition vagy hard-validation felelosseget.
10. A Pi-style extension inspiracio csak bounded extension policy note lehet; nem valhat jelen taskban implementacios vagy normativ kotelezettseggé, es a Pi-note hianya onmagaban nem approval-blocker.
11. `undecided` target-minosites legalis, ha a row vagy a kapcsolodo section explicitten jelzi, miert maradt nyitott.
12. `AgentConfig` current-state fogalom csak akkor rogzitheto first-classkent, ha azt konkret source ref tamasztja ala; ellenkezo esetben `implicit`, `absent` vagy `not-applicable` jeloles kell.

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
| egy feltetelezett behaviorhez nincs eleg evidencia vagy source ref | source inspection | result | a row `target_disposition=undecided` marad, es nyitott kerdes vagy ambiguity note-tal dokumentaljuk a kovetkezo bizonyitekigenyt; nincs ad hoc provisional target | `INVENTORY_EVIDENCE_GAP` | warn | P1 | required-now |
| baseline vagy coverage nincs roviden rogzitve | source inspection | result | az artifact headerbe keruljon be `baseline_note`, `inspected_source_scope` es `coverage_note`; ettol meg a task nem full-stop blocker, ha a discovery egyebkent ertelmezheto | `INVENTORY_BASELINE_NOTE_MISSING` | warn | P2 | required-now |
| inspection kozben uj, fontos behavior-defining path derul ki | source inspection | result | az inventory bovul uj row-val vagy coverage-note-tal; nem kell formalizalt manifest-rendszer | `INVENTORY_SCOPE_EXPAND` | info | P2 | required-now |
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
| T1a | baseline es coverage ertheto | az inventory artifact current-state allitasokat tesz | az artifact keszul | a header roviden rogziti, hogy mely current-state checkout es milyen coverage-szint alapjan keszult az inventory, es explicit `inspected_source_scope`-ot ad | P1 | required-now | doc review |
| T2 | minimum inventory layers covered | a jelenlegi actor surface tobb retegben el | inventory keszul | az artifact explicit coverage-et ad legalabb az entrypoint/parser, reviewer-only validation/policy, meta-review surface, runtime/context helper, emit/protocol path, lifecycle touchpointok, prompt/guidance, artifact/side-effect es actor-vs-executor boundary retegekrol | P1 | required-now | doc review |
| T2a | representative use-case mapping exists | nem cel a teljes call graph formalizalasa | inventory keszul | az artifact olvashatoan bemutatja a fo use case-eket es retained kulonutakat, peldaul implementer pass, reviewer fix-request vagy validation, convergence, human escalation, meta-review, es legalabb roviden jelzi a kickoff/resume/restart/watchdog sajatossagokat | P1 | required-now | doc review |
| T3 | Role/Actor separation and AgentConfig evidence captured | a codebase-ben ezek tobb retegen keverednek, de `AgentConfig` nem biztos, hogy first-class current-state fogalom | inventory keszul | az artifact explicitten kulon kezeli a `Role` es `Actor` fogalmat, es minden row-ban kitolti az `agent_config_evidence` mezot `first-class`, `implicit`, `absent` vagy `not-applicable` ertekkel | P1 | required-now | doc review |
| T4 | actor vs executor boundary captured | vannak runtime/process/sync/relay concerns es actor concerns is | inventory keszul | minden relevans row kap boundary-owner minositest, es a mixed esetek explicit indoklassal szerepelnek | P1 | required-now | doc review |
| T5 | core vs extension mapping complete | a behavior inventory rows keszek | target-minosites keszul | minden row kap `core`, `extension`, `adapt`, `remove` vagy evidenciagap eseten explicit `undecided` target-dontest | P1 | required-now | doc review |
| T5a | row schema stays decision-focused | a behavior inventory row schema definialva van | az inventory artifact review-ja megtortenik | a kotelezo row-level mezok elegendoek a use-case, boundary es target-disposition megerteshez, de nem kovetelnek tulzott audit-protokollt | P1 | required-now | doc review |
| T5b | docs and guidance surfaces use legal anchors | docs- es guidance-surface row-k is szuksegesek | inventory keszul | a `surface` mezoben docs/guidance soroknal elfogadott a puszta `path` vagy `path[#Lline]`, es nincs kitalalt symbol-anchor | P1 | required-now | doc review |
| T6 | required inspirational inputs stay non-normative | v2 tanulsagok szerepelnek | synthesis note keszul | a task explicitten kimondja, hogy a v2 informational input, es nem írja felul a protocol-first normative forrasokat | P2 | required-now | doc review |
| T6a | optional Pi inspiration remains optional | a Pi page elerheto vagy nem elerheto | synthesis note keszul vagy elmarad | ha Pi-note szerepel, az explicit non-normative; ha nem szerepel, az onmagaban nem approval-blocker | P2 | optional-now | doc review |
| T7 | uncertainty is recorded, not hidden | legalabb egy behavior besorolasa ketertelmu vagy evidenciagapos | inventory keszul | az artifact explicit ambiguity/evidence-gap note-tal jeloli az adott row-t, nem tesz hamis biztos allitast | P1 | required-now | doc review |
| T7a | current-state purity preserved | in-flight vagy future pathok letezhetnek kapcsolodo planokban | inventory keszul | a current-state inventory csak a rogzitett baseline-hoz tartozo source pathokat kezeli canonical current forraskent; future path csak kulon note lehet | P1 | required-now | doc review |
| T7b | coverage gaps stay explicit | a discovery nem feltetlen full-scope | az inventory keszul | az artifact explicit coverage vagy unknown note-tal jelzi a reszleges atnezeseket, nem ad hamis teljesség-erzetet | P1 | required-now | doc review |
| T8 | Phase 4/5 scope remains protected | aktiv protocol-first Phase 4/5 implementacios munka is fut | Phase A artifact keszul | a deliverable nem ker uj code valtoztatast, nem modositja a Phase 4/5 task acceptance contractjat, es nem irja a parent plant | P1 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a Phase A inventory tul hosszu lenne egyetlen artifactban, kesobb erdemes lehet kulon appendixbe tenni a teljes row-listat es fent tartani egy rovid executive summary-t.
2. [later-hardening] Ha a Pi-style extension inspirationt kulon is fel akarjuk dolgozni, kesobb kulon note keszulhet arrol, hogy milyen bounded extension API-formak johetnek szoba Pairflow-ban.
3. [later-hardening] Ha a `mixed` actor/executor sorok szama magas, kesobb kulon refactor-prep memo is erdemes lehet rola.
4. [later-hardening] Ha kesobb tenyleg fontos lesz a szigorubb auditability, kulon methodology note vagy companion artifact keszulhet baseline/coverage/completeness szabalyokkal Phase A task helyett.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Inventory appendix split | L2 | P3 | later-hardening | author note | Ha az artifact tul nagyra no, bontsuk summary + appendix formara |
| HB2 | Extension API follow-up note | L2 | P3 | later-hardening | optional Pi inspiration | Keszitsunk kulon memo-t a bounded extension surface-ekrol, ha a Pi note hasznosnak bizonyul |
| HB3 | Audit methodology companion | L2 | P3 | later-hardening | current review loop learnings | Ha kesobb kell, kulon docs artifactba vigyuk a baseline/completeness proof szabalyrendszert a task helyett |

## Review Control

1. Minden finding tartalmazzon `priority`, `timing`, `layer`, `evidence` mezot.
2. Ne fogadjunk el olyan inventory artifactot, amely source ref nelkul allit current-state behaviort.
3. Ne fogadjunk el olyan target-minositest, amely `core` vagy `extension` besorolast indoklas nelkul ad, vagy `undecided` besorolast evidence-gap/ambiguity note nelkul hagy.
4. Ne fogadjunk el olyan Phase A deliverable-t, amely normativ interface-et vagy runtime refaktort probal csempeszni discovery helyett.
5. Ne fogadjunk el olyan `extension` besorolast, amely authority-, routing-, lifecycle-transition vagy hard-validation felelosseget kiszervezne a kernelbol.
6. Ne fogadjunk el current-state inventory artifactot future vagy in-flight path current canonical forraskent valo hivatkozasaval.
7. Ne fogadjunk el olyan inventory artifactot, amely a kotelezo `baseline_note`/`inspected_source_scope`/`coverage_note` header-mezok nelkul tesz current-state allitasokat.
8. Ne fogadjunk el olyan inventory artifactot, amely `AgentConfig` current-state kategoriat konkret source evidence nelkul first-classkent allit.
9. Ne fogadjunk el olyan inventory artifactot, amely a reviewer-only validation/policy vagy artifact viselkedeseket explicit current-state source coverage nelkul hagyja.
10. Ne fogadjunk el olyan inventory artifactot, amely anelkul allit teljességet, hogy explicit coverage note-tal jelezne a reszleges vagy bizonytalan teruleteket.
11. Ne fogadjunk el olyan inventory artifactot, amely a CLI wrapper pathokat inventorozza, de a tenyleges shared/orchestration command API-kat vagy reviewer guidance modulokat nem veszi fel current-state sourcekent.
12. Ne fogadjunk el olyan inventory artifactot, amely a row-schema kotelezo mezoit kihagyja.
13. Ne fogadjunk el olyan inventory artifactot, amely explicit unknown vagy ambiguity note helyett hamis bizonyossagot sugall.
14. Ne fogadjunk el olyan inventory artifactot, amely supporting docs surface elemeket current-state source code evidence-kent kezel.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. letezik a checked-in inventory artifact, amely olvashatoan bemutatja a relevans actor surface fo use case-eit, retained aliasait, reviewer/meta-review kulonutjait, lifecycle touchpointjait es a fontos actor-vs-executor boundarykat;
2. minden inventoryzott behavior rendelkezik legalabb `behavior_id`, `surface`, `trigger`, `behavior_scope`, `role_scope`, `actor_scope`, `agent_config_evidence`, `boundary_owner`, `current_status`, `target_disposition` es `source_refs` mezoivel;
3. a deliverable explicitten szetvalasztja a `Role` es `Actor` fogalmat, valamint minden row-ban rogziti az `AgentConfig` current-state jelenletet (`first-class`, `implicit`, `absent`, `not-applicable`);
4. a v2 tanulsagok informational, non-normative note-kent kotelezoen szerepelnek; a Pi tanulsagok, ha szerepelnek, szinten non-normative note-kent jelennek meg, de hianyuk onmagaban nem blocker;
5. a dokumentum rovid `baseline_note`-tal, explicit `inspected_source_scope`-pal es `coverage_note`-tal jelzi, milyen current-state nezettel dolgozik, es hol maradtak explicit unknownok;
6. a current-state inventory nem nyitja ujra a Phase 4/5 implementacios acceptance contractot;
7. a Phase A task csak a checked-in inventory artifactot modositja;
8. a section-szintu osszegzes nem valthatja ki a tenyleges row-szintu behavior inventoryt a fontos current-state allitasoknal.
