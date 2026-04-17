---
artifact_type: task
artifact_id: task_actor_runtime_interface_scenario_simulation_phaseC_v1
title: "Actor Runtime Interface Scenario Simulation (Phase C)"
status: completed
phase: phaseC
target_files:
  - plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-scenario-simulation-phaseC-matrix.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Scenario Simulation (Phase C)

## L0 - Policy

### Goal

Checked-in, docs-only scenario matrix es gap analysis keszitese a Phase B actor runtime contractrol ugy, hogy kideruljon: a javasolt boundary a fo use case-eket, a fontos edge-case-eket es a retained adapter-pathokat is elegendoen lefedi-e.
Phase C akkor sikeres, ha letrejon egy jol olvashato matrix artifact, amely:
1. reprezentativ actor-use-case sorokon vegigjatsza a Phase B contractot,
2. minden szcenarional explicitten rogziti az inputot, a szukseges capability-ket, a vart outputot, a delivery/launch ack szemantikat es a provenance/idempotency kovetelmenyt,
3. kulon jeloli, hogy a szcenario core boundaryval lefedheto-e, bounded extensiont igenyel-e, retained adapter-pathot igenyel-e, vagy valos interface-gapet mutat,
4. nem nyit ujra normativ core contractot csendben, hanem a hianyokat bounded gap-note-kent vezeti fel,
5. Phase D szamara tiszta migration-inputot ad a topology-, operator-shape- es rollout-jellegu nyitott pontokrol.

### Context

1. A parent plan szerint a Phase C feladata nem uj capability contract irasa, hanem a mar meglevo Phase B boundary use-case alapu vegigjatszasa.
2. A Phase A inventory mar current-state evidence-t adott; a Phase B draft mar kis core-ra huzta a target contractot. Phase C azt vizsgalja, hogy ez a contract valoban eleg-e a mai fo esetekhez es a kritikus edge-case-ekhez.
3. A Phase B draft jelenlegi core actor output boundaryja szandekosan lean: `result` es `human_input_request`; nincs kulon `artifact_publish` primitive, es az emit current-execution authorityhoz kotott.
4. A delivery trigger es ack boundary mar explicit separationt kapott; Phase C egyik fo feladata annak megmutatasa, hogy a delivery ack, launch ack, stale-context es duplicate-helyzetek use-case-szinten is tisztan leirhatok-e.
5. A scenario simulation tovabbra is docs-only. Nem cel runtime implementacio, CLI modositas vagy topology-dontes befagyasztasa.

### In Scope

1. Checked-in scenario matrix artifact letrehozasa a Phase B contractrol.
2. Reprezentativ core use case-ek vegigjatszasa:
   - implementer result,
   - reviewer fix-request jellegu result,
   - reviewer convergence jellegu result,
   - meta-review result,
   - human input request.
3. Fontos edge-case-ek es failure-shape-ek vegigjatszasa:
   - stale authority,
   - conflicting context,
   - duplicate delivery,
   - duplicate vagy mismatched emit,
   - restart/recovery kornyezet,
   - retained tmux observability mellett hianyzo vagy kesleltetett ack.
4. Minden szcenarional a kovetkezok explicit rogzitese:
   - input authority,
   - work payload shape,
   - szukseges core capability-k,
   - vart canonical output family,
   - delivery ack es launch ack,
   - provenance/idempotency megfontolas,
   - core vs extension vs retained adapter vs gap minosites.
5. Coverage/gap report ugyanabban az artifactban:
   - mely use case-ek fedettek tisztan,
   - mely pontok maradnak bounded open questionkent,
   - mely pontok csusznak at topology- vagy migration-temaba.
6. A gates/gate-like policyk Phase C-ben csak protocol-policy kontextuskent vizsgalhatok, nem uj actor primitive-kent.

### Out of Scope

1. Barmilyen runtime, CLI, state machine, UI vagy protocol implementation modositas.
2. Uj actor capability vagy uj output primitive csendes bevezetese.
3. Vegleges topology valasztas vagy runner-dontes.
4. Migration spine, parity gate vagy rollout sorrend konkretizalasa; ez Phase D feladata.
5. Uj taskok vegrehajtasa a matrix alapjan; Phase C csak dokumental, nem implemental.

### Safety Defaults

1. Ez docs-only scenario-simulation task; product- vagy runtime-kod nem modosithato.
2. A Phase B draft a normativ kiindulopont. Phase C nem irhatja at hallgatozolag a core contractot.
3. Ha egy szcenario Phase B gapet mutat, azt explicit `gap` vagy `open_question` note-tal kell rogziteni; nincs csendes contract-bovites.
4. A topology-specifikus megfigyelesek megtortenhetnek, de ezek nem valhatnak a canonical actor boundary reszeve.
5. A retained tmux, pane-visibility vagy shell-state legfeljebb observability note-kent szerepelhet; nem lehet canonical authority vagy ack-bizonyitek.
6. A scenario matrixnak a lean first-version iranyt kell vedeni: ami nem szukseges a mostani contract vedheto lefedeshez, azt nem kell a matrix kedveert visszahozni.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Blast radius:
   - uj checked-in Phase C matrix artifact,
   - nincs source/runtime/state/UI contract modositas ebben a fazisban,
   - nincs parent plan edit ebben a fazisban.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Phase C scope-jahoz, a minimum szcenariokhoz es a gap-analysis szerepehez.
2. Binding target contract input:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - Ez a normativ boundary, amelyet a szcenariok ellenoriznek; a matrix alaphelyzetben ezt teszteli, nem ujratervezi.
3. Binding current-state comparison input:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez mutatja, mely mai use case-ek es retained adapter-szalas sajatossagok igenyelnek szimulaciot.
4. Binding normative companion set:
   - `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md`
   - `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md`
5. Informational comparison input:
   - `docs/pairflow-initial-design.md`
   - `docs/v2/pairflow-v2-architecture-plan-joint.md`
6. Precedence rule:
   - scenario current-state referenciahoz a Phase A inventory az authoritative input;
   - target megfelelteteshez a Phase B draft es a binding protocol-first companion set az elsodleges;
   - informational docs csak explanatory note-kent hasznalhatok.

### Terminology Lock

1. `scenario row` = egy konkret use-case vagy edge-case dokumentalt egysege, amely explicit inputtal, capability-keszlettel, outputtal, ack szemantikaval es minositessel rendelkezik.
2. `coverage verdict` = egy szcenario osszegzo minositese a kovetkezo zart halmazbol: `covered`, `covered_with_extension`, `covered_with_adapter`, `gap`, `undecided`.
3. `gap` = olyan hiany vagy bizonytalansag, ahol a Phase B contract jelen formaban nem elegendo, vagy nem eleg pontos a szcenario tiszta leirasahoz.
4. `retained adapter path` = olyan szcenarioelem, amely a target contract mellett is adapter- vagy compatibility-reteget feltetelez, de nem valik a core boundary reszeve.
5. `provenance requirement` = annak rogzítese, hogy a szcenario milyen explicit contextet vagy execution-kotest igenyel a helyes elfogadashoz.
6. `idempotency requirement` = annak rogzítese, hogy duplicate delivery, duplicate emit vagy retry eseten mi maradjon elfogadhato, mi utasitando el, es mi marad nyitott kerdes.
7. `delivery ack` = a munka befogadasi boundaryjan adott typed jelzes (`accepted` vagy `rejected` vagy ezzel ekvivalens).
8. `launch ack` = a tenyleges actor-start boundaryjan adott typed jelzes (`running` vagy `failed_to_start` vagy ezzel ekvivalens).
9. `policy gate context` = olyan protocol- vagy workflow-szabaly, amely befolyasolja a tovabblepest, de nem actor primitive; a szcenarioban legfeljebb input- vagy evaluation-kontextuskent jelenik meg.
10. `matrix artifact` = a checked-in Phase C deliverable, amely egyszerre hordozza a scenario matrixot es a coverage/gap synthesis-t.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` | checked-in Phase C matrix artifact | markdown scenario matrix -> checked-in artifact | uj Phase C matrix artifact | Egyetlen artifact keszul, amely szcenariorow-kon vegigjatsza a Phase B contractot, es a vegere explicit coverage/gap synthesis-t ad | P1 | required-now | Phase C deliverable definicio |
| CS2 | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB-draft.md` | target contract simulation input | Phase B boundary sections -> scenario rows | Phase C matrix contract-mapping resz | Minden fo scenario explicitten Phase B capability-, authority-, output- es ack boundarykhoz kotodik | P1 | required-now | Phase B -> Phase C traceability |
| CS3 | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` | current-state use-case seed | inventory synthesis -> representative scenarios | Phase C matrix scenario seed resz | A matrix nem elvont peldakon alapul, hanem a mai fo actor-use-case-eket, retained adapter-szalasakat es edge-case-eit szimulalja | P1 | required-now | Phase A -> Phase C grounding |
| CS4 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | workstream 3 realization | workstream requirements -> scenario categories | Phase C matrix scope sections | A matrix lefedi a parent plan altal minimumkent kert fo szcenariokat es gap-analysis kerdeseket | P1 | required-now | plan alignment |
| CS5 | `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` + protocol-first Phase 4/5 taskok | protocol-first compatibility check | binding refs -> scenario guardrails | Phase C synthesis note | A matrix nem huz vissza legacy alias, implicit authority vagy special-case meta-review modelleket a target boundaryba | P1 | required-now | protocol-first compatibility |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Scenario row schema | jelenleg nincs checked-in Phase C matrix | egységes scenario-row schema kell | `scenario_id`, `scenario_kind`, `preconditions`, `execution_context`, `work_payload`, `required_capabilities`, `expected_output_family`, `delivery_ack`, `launch_ack`, `provenance_requirement`, `idempotency_requirement`, `coverage_verdict`, `source_refs` | `extension_notes`, `adapter_notes`, `open_questions` | docs-only schema | P1 | required-now |
| Core use-case coverage | a fo use case-ek szetszorva latszanak Phase A/README/current behavior feluleteken | reprezentativ, role-neutral scenario matrix | implementer/reviewer/meta-reviewer/human-input scenariok | role-specifikus policy note-ok | Phase B contract against use cases | P1 | required-now |
| Edge-case coverage | stale, duplicate, restart, conflicting context shape-ek nem egy helyen vannak | bounded edge-case matrix kell | stale authority, conflicting context, duplicate delivery, duplicate emit, restart/recovery, retained observability-only tmux note | topology-specific diagnostics | explicit edge coverage | P1 | required-now |
| Ack semantics mapping | Phase B mar kulon delivery es launch ack setet rogzít | scenario-szinten bizonyitott mapping kell | `delivery_ack`, `launch_ack` mezok minden relevans szcenarioban | diagnostics note | topology-semleges marad | P1 | required-now |
| Provenance/idempotency notes | Phase B-ben csak contract-szinten jelent meg | scenario-level kovetelmeny kell | explicit provenance es duplicate/retry megfontolas szcenario-szinten | `undecided` note, ha tovabbi D-fazisu dontest igenyel | docs-only analysis | P1 | required-now |
| Coverage synthesis | ma nincs osszegzo gap report | matrix vegen coverage/gap report kell | covered vs gap vs adapter vs extension synthesis | topology/migration follow-up note | Phase D input only | P1 | required-now |

Normative rules:

1. A Phase C matrix a Phase B contractot teszteli, nem irja at.
2. Minden scenario row-nak explicit `coverage_verdict`-tel kell zarnia.
3. Ha a szcenariohoz Phase B-n kivuli uj primitive kellene, azt `gap`-kent kell jelolni, nem szabad csendben bevezetni.
4. A `policy gate context` csak input- vagy evaluation-kontextuskent jelenhet meg; nem hozhato vissza kulon actor primitive-kent.
5. A matrixnak kulon kell kezelnie a `delivery_ack` es `launch_ack` pillanatot ott, ahol mindketto relevans.
6. A retained adapter path legalis verdict, de csak akkor, ha a row egyertelmuen kimondja, hogy ez nem a core contract resze.
7. A scenario matrix nem terjesztheti ki a first-version capability modellt olyan mezokkel vagy primitívekkel, amelyeket a Phase B draft szandekosan elhagyott.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Docs artifacts | uj checked-in Phase C matrix markdown | runtime, CLI, state vagy UI code modositas | docs-only deliverable | P1 | required-now |
| Scenario simulation | use-case es edge-case row-k levezetese a Phase B draftbol | uj normativ contract kitalalasa a matrix kedveert | simulation, nem redesign | P1 | required-now |
| Gap analysis | explicit coverage/gap synthesis es follow-up note-ok | hallgatozo contract-bovites vagy Phase D migrationterv becsomagolasa | bounded design feedback only | P1 | required-now |

Constraint:

1. Ha a Phase C implementacioja uj runtime primitive-t vagy CLI shape-et vezetne be a dokumentumban anelkul, hogy azt gapkent megjelolne, az ervenytelen deliverable-nek minosul.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| egy szcenariohoz nem eleg egyertelmu a Phase B draft jelenlegi nyelve | Phase B draft | result | a row `coverage_verdict=undecided` vagy `gap`, explicit open question note-tal | `PHASEC_CONTRACT_INTERPRETATION_GAP` | warn | P1 | required-now |
| egy current-state use case csak retained adapterrel irhato le a target contract mellett | Phase A inventory + Phase B draft | result | a row `covered_with_adapter` verdictet kap, explicit adapter note-tal | `PHASEC_RETAINED_ADAPTER_REQUIRED` | info | P1 | required-now |
| egy szcenario bounded extensionnel tisztan lefedheto | Phase B draft extension policy | result | a row `covered_with_extension` verdictet kap, es pontosan megnevezi az extension-jellegu reszt | `PHASEC_EXTENSION_PATH` | info | P2 | required-now |
| duplicate/stale/retry helyzetnel nincs eleg bizonyitek a pontos idempotency szabalyra | scenario reasoning | result | explicit bounded open question marad Phase D vagy kesobbi implementation policy inputkent | `PHASEC_IDEMPOTENCY_OPEN` | warn | P1 | required-now |
| topology-specifikus kulonbseg felmerul, de a core scenario szemantika ettol fuggetlen | topology reasoning | fallback | topology note marad explanatory note, a canonical row-szemantika topology-semleges marad | `PHASEC_TOPOLOGY_NOTE_ONLY` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB-draft.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` | P1 | required-now |
| must-use | `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md` | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md` | P1 | required-now |
| must-use | `docs/v2/pairflow-v2-architecture-plan-joint.md` mint informational comparison input | P2 | required-now |
| must-not-use | uj runtime primitive vagy output family csendes bevezetese | P1 | required-now |
| must-not-use | topology-specifikus tmux/process/IPC jelek canonical ackkent vagy authoritykent valo kezelese | P1 | required-now |
| must-not-use | Phase D migration spine vagy rollout terv Phase C matrixba olvasztasa | P1 | required-now |
| must-not-use | `policy gate` fogalmat actor capabilityve emelni | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Phase C matrix artifact exists | a task docs-only modban fut | a deliverable elkeszul | letezik a checked-in `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` artifact | P1 | required-now | doc review |
| T2 | core actor result scenarios covered | Phase B contract `result` familyt hasznal | a matrix elkeszul | kulon row-k fedik le legalabb az implementer result, reviewer fix-request jellegu result, reviewer convergence es meta-review result esetet | P1 | required-now | doc review |
| T3 | human input scenario covered | Phase B contract `human_input_request` familyt ad | a matrix elkeszul | kulon row fedi le a blokkolo human input request szcenariot | P1 | required-now | doc review |
| T4 | stale es conflicting context scenarios covered | explicit authority es current-execution emit a target modell | a matrix elkeszul | kulon row-k irjak le a stale authority es conflicting context esetet explicit fail-closed vagy bounded open-question kovetkezmennyel | P1 | required-now | doc review |
| T5 | duplicate es retry concern explicit | duplicate delivery/emit kockazat fennall | a matrix elkeszul | legalabb duplicate delivery es duplicate vagy mismatched emit szcenariok kulon row-kent szerepelnek provenance/idempotency note-tal | P1 | required-now | doc review |
| T6 | delivery es launch ack separation represented | Phase B ack boundary ketreszes | a matrix elkeszul | a relevans row-k kulon kezelik a `delivery_ack` es `launch_ack` mezot | P1 | required-now | doc review |
| T7 | restart/recovery es observability-only tmux note covered | retained runtime observability megmaradhat | a matrix elkeszul | van kulon restart/recovery row es legalabb egy olyan row, amelyben a tmux/pane csak observability note, nem canonical authority vagy ack | P1 | required-now | doc review |
| T8 | coverage verdict every row on | a row schema definialt | a matrix review-ja megtortenik | minden scenario row kap `covered`, `covered_with_extension`, `covered_with_adapter`, `gap` vagy `undecided` verdictet | P1 | required-now | doc review |
| T9 | coverage/gap synthesis exists | a row-level matrix kesz | a dokumentum zarul | az artifact kulon synthesis reszben osszegzi a coverage-et, a valodi gapeket es a Phase D-be tovabbvivo bounded nyitott pontokat | P1 | required-now | doc review |
| T10 | no silent contract expansion | a matrix edge-case-eket is targyal | a dokumentum review-ja megtortenik | nincs olyan scenario-kovetkeztetes, amely uj core primitive-t vagy uj output family-t vezet be explicit gap-jeloles nelkul | P1 | required-now | doc review |
| T11 | gate semantics stay in protocol-policy layer | reviewer/minosegi gate jellegu szabalyok felmerulnek | a matrix elkeszul | a gate-ek input- vagy policy-contextkent jelennek meg, nem kulon actor capabilitykent | P1 | required-now | doc review |
| T12 | topology notes stay bounded | tobble topology opcio letezik | a matrix elkeszul | a topology-kulonbsegek explanatory note-k maradnak, es nem irjak at a canonical scenario szemantikat | P2 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a scenario matrix tul nagyra no, kesobb kulon appendixbe tehetoek az edge-case row-k, mikozben fent marad egy rovid core-scenario summary.
2. [later-hardening] Ha a provenance/idempotency sorok tul sok kulon note-ot termelnek, kesobb erdemes lehet kulon companion memo-t csinalni csak ezekrol.
3. [later-hardening] Ha a retained adapter path-ok szama meglepoen magas, Phase D-ben kulon migration-risk summary keszulhet beloluk.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Appendix split for edge cases | L2 | P3 | later-hardening | author note | Kulon appendixbe viheto a duplicate/restart/recovery resz, ha a fo matrix tul hosszu |
| HB2 | Provenance/idempotency memo | L2 | P3 | later-hardening | Phase C findings | Kulon memo-ban formalizalhato, ha a matrix sok bounded nyitott pontot termel |
| HB3 | Adapter-risk summary | L2 | P3 | later-hardening | retained adapter verdicts | Phase D elott kulon summary keszulhet a retained adapterek migration-koltsegerol |

## Review Control

1. Minden finding tartalmazzon `priority`, `timing`, `layer`, `evidence` mezot.
2. Ne fogadjunk el olyan Phase C artifactot, amely a Phase B contracttol fuggetlen, szabadon improvizalt interface-elemekkel dolgozik.
3. Ne fogadjunk el olyan matrixot, amely nem kuloniti el a `delivery_ack` es `launch_ack` pillanatot ott, ahol ez relevans.
4. Ne fogadjunk el olyan scenario row-t, amelynek nincs explicit `coverage_verdict`-je.
5. Ne fogadjunk el olyan gap analysis-t, amely migration tervet vagy implementation feladatlistat probal a matrix helyett megoldani.
6. Ne fogadjunk el olyan dokumentumot, amely a `policy gate` fogalmat kulon actor primitive-ve emeli.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. letezik a checked-in `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` artifact;
2. a matrix explicit row-kon vegigjatsza a minimum core es edge-case szcenariokat;
3. minden row rogziti az input authorityt, a szukseges capability-ket, a vart output familyt, a delivery/launch ackot es a provenance/idempotency megfontolast;
4. minden row rendelkezik `coverage_verdict`-tel;
5. a dokumentum kulon synthesis reszben osszegzi a covered / adapter / extension / gap mintazatokat;
6. a deliverable nem irja at hallgatozolag a Phase B core contractot, es nem vezet be uj actor primitive-t vagy output family-t explicit gap-jeloles nelkul;
7. a topology- es migration-jellegu nyitott pontok bounded inputkent jelennek meg, nem szetfolyo redesignkent;
8. a deliverable docs-only marad, source/runtime/CLI kodmodositas nelkul.
