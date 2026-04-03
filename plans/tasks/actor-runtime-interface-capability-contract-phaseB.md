---
artifact_type: task
artifact_id: task_actor_runtime_interface_capability_contract_phaseB_v1
title: "Actor Runtime Interface Capability Contract (Phase B)"
status: draft
phase: phaseB
target_files:
  - plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Capability Contract (Phase B)

## L0 - Policy

### Goal

Checked-in, docs-only normativ contract draft keszitese a jovobeli actor runtime interface-hez ugy, hogy a Phase A inventorybol mar ne csak current-state leiras, hanem kis core-ra epulo, capability-alapu boundary kovetkezzen.
Phase B akkor sikeres, ha letrejon egy jol olvashato contract draft, amely:
1. explicitten rogziti a minimalis core capability-ket,
2. kulon kezeli a bounded extension pontokat es a tiltott domain-eket,
3. elvalasztja az actor boundaryt az executor boundarytol,
4. role-neutral modellt ad az `implementer`, `reviewer`, `meta_reviewer` es kesobbi role-ok szamara,
5. kimondja az explicit authority, delivery trigger es ack boundary minimum szerzodeset.

### Context

1. A Phase A inventory mar elkeszult, es rogziti, mely mai behaviorok latszanak `core`, `adapt`, `remove` vagy tovabbi bounded dontest igenylo teruletnek.
2. A parent plan szerint a kovetkezo lepes nem implementacio es nem scenario simulation, hanem capability-alapu contract draft levezetese az inventorybol.
3. A canonical source of truth tovabbra sem a jelenlegi command-union, hanem a protocol-first target modell, az explicit authority boundary es a role-neutral actor model.
4. A Phase 4 es Phase 5 taskok mar rogzitettek a canonical actor-emission surface es a legacy cleanup fo iranyait; ez a task ezekkel kompatibilis contract draftot keszit, nem nyit ujra runtime acceptance scope-ot.
5. A `meta_reviewer` szerep nem special-case subsystem, hanem ugyanazon actor runtime modell egyik role projectionje; a contract ezt koteles expliciten ervenyesiteni.

### In Scope

1. Checked-in capability contract draft letrehozasa a target actor runtime interface-rol.
2. A minimalis core capability-k, input authority es canonical output boundary rogzitese.
3. A canonical delivery trigger es canonical ack boundary minimum szemantikajanak leirasa.
4. A `Role`, `Actor` es `AgentConfig` szetvalasztasanak normativ rogzitese.
5. Az actor-boundary vs executor-boundary explicit szetvalasztasa.
6. Bounded extension policy rogzitese: mi maradhat extension, es mi tiltott extension domain.
7. A Phase A inventory `core` / `adapt` / `remove` megfigyeleseibol levezetett contract-dontesek rogzitese.
8. A nyitott, de bounded dontesek explicit felsorolasa, ha azok Phase C vagy Phase D inputjai maradnak.

### Out of Scope

1. Barmilyen runtime, CLI, state machine, UI vagy protocol implementation modositas.
2. Scenario simulation matrix vagy gap analysis kidolgozasa; ez Phase C feladata.
3. Migration spine, rollout sorrend vagy pilot cutover konkretizalasa; ez Phase D/E feladata.
4. Vegleges topology valasztas egy konkret runner/IPC/exec modell mellett.
5. Uj role, uj output kind vagy uj delivery infrastructure implementalasa.

### Safety Defaults

1. Ez docs-only, contract-draft task; product- vagy runtime-kod nem modosithato.
2. A target contract kis core-ra epuljon; ami nem majdnem minden actor-use-case-hez canonicalan szukseges, az default szerint nem core.
3. Az extension policy nem szervezhet ki authority-resolutiont, lifecycle routingot, state ownershipot, hard capability enforcementet vagy canonical output validationt.
4. A contract role-neutral legyen; a `meta_reviewer` nem kaphat kulon privilegizalt actor API-t vagy kulon lifecycle-t pusztan a role neve miatt.
5. A canonical actor boundary explicit authorityt koveteljen; implicit `cwd`, worktree, shell vagy env alapju actor-write authority nem teheto vissza a target contractba.
6. A topology-dontes nem eghet bele a core actor interface-be; a draft legfeljebb topology-semleges boundaryt es explicit tradeoff note-ot adhat.
7. Ha egy pontban a Phase A inventory es a binding protocol-first refek feszultsegben vannak, a Phase A csak current-state evidence, a normativ targetet a binding refs iranyabol kell levezetni.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - jovobeli actor runtime interface contract,
   - actor input authority es canonical output contract,
   - delivery trigger es ack boundary,
   - actor-vs-executor separation contract,
   - bounded extension policy.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Phase B capability contract scope-jahoz, a role-neutrality policyhoz, a core-vs-extension policyhoz es a delivery/ack boundaryhoz.
2. Binding current-state input:
   - `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez a current-state evidence-forras, amely a mai behaviorokat es target-disposition mintakat rogzitette.
3. Binding normative companion set:
   - `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md`
   - `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md`
4. Informational comparison input:
   - `docs/pairflow-initial-design.md`
   - `docs/v2/pairflow-v2-architecture-plan-joint.md`
5. Precedence rule:
   - current-state megfigyelesekhez a Phase A inventory az authoritative input;
   - normativ target-donteshez a `plan_ref` es a binding protocol-first companion set az elsodleges;
   - informational docs iranyt adhatnak, de nem irhatjak felul a binding target-modellt.

### Terminology Lock

1. `core capability` = olyan capability vagy boundary-viselkedes, amely minden vagy majdnem minden actor-use-case-hez canonicalan szukseges, es nem kotodik egyetlen szerep torteneti surface-ehez.
2. `bounded extension` = olyan opcionalis vagy ritkabb behavior, amely ugyanazon actor runtime interface koreben maradhat, de nem hordozhat authority-, routing-, state-ownership vagy hard-validation felelosseget.
3. `forbidden extension domain` = olyan terulet, amelyet nem szabad extension pontba kiszervezni: authority resolution, lifecycle routing, workflow state ownership, canonical output validation, hard capability enforcement.
4. `actor input authority` = a minimum explicit context, amellyel az actor futasa jogszeruen vegrehajthato.
5. `canonical output boundary` = a typed actor outputok minimum szerzodese, nem legacy command-spelling vagy role-specifikus CLI surface.
6. `delivery trigger` = az a gepi boundary, amely explicitten kezdemenyezi az actor-step feldolgozasat.
7. `ack boundary` = az a typed allapot-visszajelzes, amely kimondja, hogy a runtime a munkat `accepted`, `running`, `rejected` vagy `failed_to_start` szemantikaval kezelte.
8. `actor boundary` = amit egy actor a workflow-step vegrehajtasa kozben lat es hasznal.
9. `executor boundary` = process/workspace/sync/relay/liveness es egyeb delivery/topology reteg, amely nem azonos az actor runtime interface-szel.
10. `role-neutral contract` = olyan contract, amelyben az `implementer`, `reviewer`, `meta_reviewer` es kesobbi role-ok ugyanazt a boundaryt hasznaljak, es a kulonbsegek policyban, handoffban, `AgentConfig`-ban vagy supported output-shape-ben jelennek meg.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` | checked-in contract draft artifact | markdown contract schema -> checked-in artifact | uj Phase B draft artifact | Egyetlen normativ contract draft keszul, amely capability modellel, authority boundaryval, output contracttal, delivery/ack modellel, actor-vs-executor separationnel es extension policyval irja le a target actor runtime interface-et | P1 | required-now | Phase B deliverable definicio |
| CS2 | `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` | Phase A evidence synthesis | inventory rows + synthesis -> contract decisions | Phase B draft current-state grounding section | A draft explicitten levezeti, hogy a Phase A `core` / `adapt` / `remove` megfigyeleseibol mi lesz target core capability, mi kerul executorba, mi marad bounded extension, es mi marad transitional adapter/removal tema | P1 | required-now | Phase A -> Phase B traceability |
| CS3 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | capability + authority + role model derivation | plan workstream requirements -> contract sections | Phase B draft normative sections | A draft explicitten rogziti az input authorityt, a role-neutral modellt, a canonical outputokat, a delivery trigger es ack boundaryt, valamint a tiltott actor-muveleteket | P1 | required-now | Workstream 2 alignment |
| CS4 | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` + `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md` + `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md` | protocol-first companion synthesis | binding protocol-first refs -> contract constraints | Phase B draft compatibility section | A draft nem epulhet retained aliasokra, legacy lifecycle-re vagy special-case meta-review actor API-ra; a canonical actor boundary Phase 4/5 kompatibilis marad | P1 | required-now | protocol-first compatibility |
| CS5 | `docs/v2/pairflow-v2-architecture-plan-joint.md` | informational architecture comparison | informational input -> non-normative synthesis | Phase B draft comparison note | A draft roviden jelzi, hogyan illeszkedik a role/kernel/capability thinking a v2 iranyhoz, de nem teszi a v2-t normativ override-da | P2 | required-now | informational consistency |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Actor execution context | ma retained wrapperek es helper-ek reszben implicit workspace/context inference-re epitenek | explicit actor input authority kell a canonical boundaryhoz | `repo`, `bubble_id`, `handoff_id`, `role`, `actor_id` vagy ezzel ekvivalens actor-azonositas | `expected_state_fingerprint`, `expected_round`, `agent_config_ref`, `protocol_snapshot_ref` | normativ draft only, implementation kesobb | P1 | required-now |
| Actor input payload | ma command- es path-specifikus inputok keverednek | normalizalt handoff + relevans protocol snapshot + policy/config references | `handoff_ref` vagy durable handoff payload, `execution_context` | extension-specific context enrichment | normativ draft only | P1 | required-now |
| Canonical actor outputs | ma retained commandok, role-specifikus wrapperek es guidance-bound behaviorok is latszanak | typed canonical output boundary | legalabb canonical output family-k: actor output emit, human input request, artifact publish vagy ezzel ekvivalens minimalis halmaz | role/policy-specifikus output metadata, advisory artifact refs | normativ draft only | P1 | required-now |
| Delivery trigger | ma implicit pane/prompt/runtime launch jelek is szerepet kapnak | explicit gepi `deliver`-szeru boundary vagy ezzel ekvivalens trigger contract | trigger invocation semantics, authority preconditions | topology-specific transport note | topology-semleges contract | P1 | required-now |
| Ack boundary | ma nincs stabil, minden topologyra ervenyes typed ack szerzodes | explicit typed ack boundary | `accepted`, `running`, `rejected`, `failed_to_start` vagy ezzel ekvivalens minimum statuszok | diagnostics metadata, duplicate-delivery note | topology-semleges contract | P1 | required-now |
| Role model | ma tobb role-specifikus surface es historical special-case is latszik | role-neutral actor runtime contract | `Role`, `Actor`, `AgentConfig` kulon definicioja; `meta_reviewer` is ugyanazon boundary resze | role-specific policy/config note | legacy special-case model removed from target | P1 | required-now |
| Extension surface | ma policy/guidance/artifact/helper retegek reszben osszecsusznak a core-ral | bounded extension policy | extension eligibility criteria, forbidden extension domains | examples, advisory notes | normativ draft only | P1 | required-now |
| Executor boundary | ma lifecycle/tmux/worktree/runtime concerns gyakran kozel vannak az actor surface-hez | explicit actor-vs-executor separation | executor-owned domains listaja | retained observability-only topology notes | normativ draft only | P1 | required-now |

Normative rules:

1. A Phase B draft nem command-union listat, hanem capability-alapu boundaryt ir le.
2. A canonical actor contract nem adhat implicit actor-write authorityt.
3. A `meta_reviewer` ugyanazon actor runtime contract role projectionje, nem kulon actor API.
4. A draftnek explicitten ki kell mondania, mi `core`, mi `bounded extension`, mi `executor-owned`, es mi `forbidden`.
5. A topology valasztas nem valtoztathatja meg a canonical actor input/output contractot.
6. A retained aliasok, legacy lifecycle allapotok es historical meta-review special-case surface-ek nem lehetnek a Phase B target contract reszei.
7. A draftnek minimum egy rovid traceability reszt kell tartalmaznia, amely a Phase A fo `core` / `adapt` / `remove` mintakat visszakoti a contract-dontesekhez.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Docs artifacts | uj checked-in Phase B draft markdown | runtime, CLI, state vagy UI code modositas | docs-only deliverable | P1 | required-now |
| Normative synthesis | core/extension/forbidden contract-dontesek levezetese a binding refekbol | ad hoc implementacios shortcut vagy kept command-union target | ez contract draft, nem code plan | P1 | required-now |
| Informational comparison | rovid v2 alignment note | informational source normativ override-dava emelese | comparison note only | P2 | required-now |

Constraint:

1. Ha a task barmely implementacioja runtime- vagy source-kodba nyulna, az mar nem Phase B docs-only contract draft.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| a Phase A inventory egy areaja nem ad eleg bizonyitekot a vegleges core-vs-extension donteshez | Phase A inventory | result | explicit `open_question` vagy `bounded decision` note a draftban; nincs csendes command-union fallback | `PHASEB_INVENTORY_DECISION_GAP` | warn | P1 | required-now |
| a topology kerdesben nincs eleg bizonyitek az egyetlen vegleges modell kivalasztasahoz | topology hypothesis | result | a draft topology-semleges contractot rogzit, es a topology valasztast Phase C/D inputkent hagyja nyitva | `PHASEB_TOPOLOGY_UNDECIDED` | info | P1 | required-now |
| informational source feszultsegben van a binding protocol-first refekkel | informational docs | fallback | a binding protocol-first refs maradnak authoritative-ek; az informational elterest note rogziti | `PHASEB_INFORMATIONAL_NON_NORMATIVE` | info | P2 | required-now |
| egy javasolt extension authority-, lifecycle- vagy hard-validation felelosseget vinne magaval | contract synthesis | result | a draft ezt explicit `forbidden` vagy `executor-owned` minositessel utasitja el | `PHASEB_EXTENSION_FORBIDDEN` | warn | P1 | required-now |
| a current-state retained alias vagy wrapper kenyelme visszahuzna a target contractot command-spelling alapra | Phase A inventory | result | a draft visszavezeti a fogalmat capability- vagy boundary-szintre, es a retained surface-et adapter/removal note-kent kezeli | `PHASEB_COMMAND_UNION_REGRESSION` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` | P1 | required-now |
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md` | P1 | required-now |
| must-use | `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md` | P1 | required-now |
| must-use | `docs/v2/pairflow-v2-architecture-plan-joint.md` mint informational comparison input | P2 | required-now |
| must-not-use | retained alias commandok mint target core contract | P1 | required-now |
| must-not-use | implicit authority fallback mint target actor contract | P1 | required-now |
| must-not-use | `meta_reviewer` special-case subsystemkent valo kezelese | P1 | required-now |
| must-not-use | extension policyba kiszervezett authority/routing/state ownership/hard validation | P1 | required-now |
| must-not-use | implementation, simulation vagy migration workstream scope becsempeszese ugyanebbe a taskba | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | contract draft artifact exists | a task docs-only modban fut | a deliverable elkeszul | letezik a checked-in `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` artifact | P1 | required-now | doc review |
| T2 | Phase A traceability explicit | a Phase A inventory mar target-minositeseket adott | a draft elkeszul | a draft roviden visszakoti a Phase A fo `core` / `adapt` / `remove` megfigyeleseit a target contract-dontesekhez | P1 | required-now | doc review |
| T3 | role-neutral model explicit | a Phase A es parent plan role-neutral iranyt rogzitettek | a draft elkeszul | a draft explicitten kimondja, hogy az `implementer`, `reviewer`, `meta_reviewer` es kesobbi role-ok ugyanazon actor runtime boundaryt hasznaljak | P1 | required-now | doc review |
| T4 | explicit authority contract present | a current-stateben implicit context surfaces is latszanak | a draft elkeszul | a target actor contract minimum explicit authoritymezoket kovetel, es tiltja az implicit actor-write contextet | P1 | required-now | doc review |
| T5 | delivery trigger and ack boundary explicit | a plan kulon trigger/ack boundaryt var el | a draft elkeszul | a draft tartalmaz topology-semleges delivery trigger szerzodest es minimum typed ack szemantikat | P1 | required-now | doc review |
| T6 | core vs extension vs forbidden split explicit | a Phase A inventory mar kirajzolt ilyen mintakat | a draft elkeszul | a draft explicit listat vagy matrixot ad a core capability-krol, bounded extension pontokrol es forbidden domain-ekrol | P1 | required-now | doc review |
| T7 | actor vs executor separation explicit | a current-stateben keverednek runtime es actor concerns | a draft elkeszul | a draft kulon megnevezi az executor-owned retegeket, es nem hagy authority/lifecycle ownershipot az actor boundaryban | P1 | required-now | doc review |
| T8 | contract not command-union shaped | retained CLI surface-ek meg latszanak a current-stateben | a draft elkeszul | a target modell nem `pass`/`ask-human`/`converged` command-listat masol, hanem capability- es output-boundary nyelven fogalmaz | P1 | required-now | doc review |
| T9 | meta-review not special-cased | a current-stateben historical special-case topology maradvanyai latszanak | a draft elkeszul | a `meta_review_result` csak role/output szintu kovetelmenykent jelenik meg, nem kulon privilegizalt actor API-kent vagy kulon lifecycle-kent | P1 | required-now | doc review |
| T10 | unresolved questions stay bounded | vannak topology- vagy operator-surface jellegu nyitott pontok | a draft elkeszul | a nyitott kerdesek explicitten vannak jelolve, de nem torik szet a minimalis core contractot es nem blokkoljak a Phase C bemenetet | P1 | required-now | doc review |
| T11 | scope discipline preserved | a Phase C es D kulon workstream | a draft elkeszul | a deliverable nem csinal scenario matrixot vagy migration tervet, csak megnevezi, mi marad ezek inputja | P1 | required-now | doc review |
| T12 | informational refs stay non-normative | v2 comparison szerepel | a draft elkeszul | a v2 alignment note informational marad, es nem irja felul a binding protocol-first contractot | P2 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a Phase B draft tul hosszura no, kesobb erdemes lehet kulon appendixbe tenni a Phase A traceability tablazatot.
2. [later-hardening] Ha a topology tradeoffok tul nagy hangsulyt kapnak, kulon note-ba lehet kiszervezni oket Phase C/D inputkent.
3. [later-hardening] Ha a bounded extension policy kesobb tul absztrakt maradna, kulon example memo keszulhet rola mintakkal es anti-patternokkel.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Phase A traceability appendix | L2 | P3 | later-hardening | author note | Kulon appendixbe viheto a reszletes row-level Phase A -> Phase B mapping |
| HB2 | Topology tradeoff memo | L2 | P3 | later-hardening | topology-open-question | Kulon Phase C/D input note-ba bonthato a topology tradeoff resz |
| HB3 | Extension examples note | L2 | P3 | later-hardening | extension policy clarity | Kulon memo keszulhet jo es tiltott extension mintakrol |

## Review Control

1. Minden finding tartalmazzon `priority`, `timing`, `layer`, `evidence` mezot.
2. Ne fogadjunk el olyan Phase B draftot, amely a Phase A inventory nelkul vagy attol eloldva nevez meg core capability-ket.
3. Ne fogadjunk el olyan contractot, amely implicit actor authorityt vagy retained command-union szemantikakat huz vissza a target boundaryba.
4. Ne fogadjunk el olyan draftot, amely a `meta_reviewer` szerepet kulon actor API-val vagy kulon lifecycle-lal special-case-eli.
5. Ne fogadjunk el olyan extension policyt, amely authority-, routing-, lifecycle- vagy hard-validation ownershipot enged extensionbe kiszervezni.
6. Ne fogadjunk el olyan Phase B deliverable-t, amely Phase C scenario simulationt vagy Phase D migration tervet probal ugyanebbe a dokumentumba becsomagolni.
7. Ne fogadjunk el olyan draftot, amely nem tartalmaz explicit delivery trigger es ack boundary minimum szerzodest.
8. Ne fogadjunk el olyan draftot, amely a topology valasztast a core input/output contract reszeve teszi.
9. Ne fogadjunk el olyan draftot, amely informational forrasokat binding override-kent kezel.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. letezik a checked-in `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` artifact;
2. a draft explicitten rogziti a minimalis core capability-ket, a bounded extension policyt es a forbidden domain-eket;
3. a draft role-neutral modellt ad az `implementer`, `reviewer`, `meta_reviewer` es kesobbi role-ok szamara;
4. a draft explicit authority, delivery trigger es ack boundary minimum szerzodest ad;
5. a draft kulon kezeli az actor boundaryt es az executor boundaryt;
6. a Phase A inventory fo `core` / `adapt` / `remove` megfigyelesei traceability modon visszakotodnek a target contracthoz;
7. a deliverable nem nyitja ujra a Phase 4/5 implementacios acceptance contractot, es nem tartalmaz runtime vagy CLI kodvaltoztatast;
8. a nyitott kerdesek bounded, Phase C vagy Phase D inputkent jelennek meg, nem szetfolyo design-vita formaban.
