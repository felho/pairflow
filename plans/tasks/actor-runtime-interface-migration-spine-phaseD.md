---
artifact_type: task
artifact_id: task_actor_runtime_interface_migration_spine_phaseD_v1
title: "Actor Runtime Interface Migration Spine (Phase D)"
status: draft
phase: phaseD
target_files:
  - plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Migration Spine (Phase D)

## L0 - Policy

### Goal

Checked-in, docs-only migration spine keszitese a Phase B capability contract es a Phase C scenario matrix alapjan ugy, hogy a Phase 5 utani elso implementacios fazis kis lepesekben, parity evidence mellett, rewrite nelkul elkezdheto legyen.
Phase D akkor sikeres, ha letrejon egy jol olvashato migration-plan artifact, amely:
1. explicit lepessorra bontja a target actor runtime boundary bevezeteset,
2. minden lepeshez elofeltetelt, parity evidence-et, retained adapter/allapot ownershipet es cleanup-kovetkezmenyt rendel,
3. kulon kezeli a core boundary freeze pontjat, a retained tmux/adapter statuszt, az executor-vs-actor boundary donteseket es a duplicate-suppression policy ownershipet,
4. megnevez egy pilot migration sorrendet vagy pilot actor jeloltet,
5. nem valik implementation tasklistava, hanem rollout- es migration-szintu döntési gerinc marad.

### Context

1. A parent plan szerint a Phase D mar nem current-state inventory es nem capability-derivation, hanem migration spine es rollout strategy.
2. A Phase B draft mar rogzitette a lean target contractot: explicit authority, current-execution emit, `result` / `human_input_request`, explicit delivery es launch ack, actor-vs-executor separation.
3. A Phase C matrix azt mutatta, hogy a fo use case-ek tobbsege lefedett, a retained adapter-pathok valosak, es a legerosebb bounded nyitott pont a duplicate delivery / duplicate emit suppression pontos policy-shape-je.
4. A Phase D feladata nem az, hogy uj actor primitive-t talaljon, hanem hogy meghatarozza:
   - milyen sorrendben lehet bevezetni a target boundaryt,
   - mi marad transitional adapter,
   - mely parity gate-ek szuksegesek,
   - hol kell explicit cleanup dontes,
   - mely topology/ack/operator-shape kerdes marad rollout-szintu dontes.
5. Ez tovabbra is docs-only fazis. Nem cel Phase D-ben runtime implementacio vagy pilot cutover tenyleges vegrehajtasa.

### In Scope

1. Checked-in migration spine artifact letrehozasa.
2. A migration lepessor explicit meghatarozasa:
   - Phase 4/5 retained baseline,
   - belso actor runtime wrapper / adapter boundary bevezetese,
   - explicit delivery-trigger es ack boundary retained tmux launch feletti bevezetese,
   - minimalis core capability freeze,
   - actor-boundary es executor-boundary ownership szetvalasztasa,
   - pilot actor migration sorrend,
   - adapter cleanup es rollout tovabbi sorrendje.
3. Minden migration lepeshez explicit rogzites:
   - elofeltetel,
   - parity evidence,
   - mi marad retained adapter,
   - mi marad observability-only retained topology,
   - mi torolheto a kovetkezo fazisban.
4. A Phase C bounded nyitott pontok migration-szintu leforditasa:
   - duplicate delivery suppression policy ownership,
   - duplicate successful emit replay policy ownership,
   - operator-visible vs kernel-visible ack shape.
5. Pilot actor javaslat vagy sorrend megnevezese parity indoklassal.
6. A core freeze pont es a Phase E-be tovabbi tenyleges cutover scope explicit lehatárolasa.

### Out of Scope

1. Barmilyen runtime, CLI, state machine, UI vagy protocol implementation modositas.
2. Tenyleges pilot actor cutover vagy code-level wrapper bevezetes.
3. Uj target contract vagy uj actor primitive tervezese.
4. Full implementation backlog vagy engineering ticket-bontas; Phase D migration spine maradjon, ne project board.
5. Teljes topology-dontes implementacios reszletekkel; csak migration-szintu ownership es sorrend dontes kell.

### Safety Defaults

1. Ez docs-only migration-prep task; product- vagy runtime-kod nem modosithato.
2. A Phase B contract a target boundary, a Phase C matrix pedig a migration-kockazati input. Phase D nem nyithatja ujra hallgatozolag a Phase B core contractot.
3. A migration spine rewrite avoidance policy szerint keszuljon: strangler-jellegu, parity-gated, kis lepeses atallas.
4. A retained tmux/operator/runtime shape maradhat observability-only retained felulet, de nem valhat vissza canonical control bus-sza.
5. Ha egy migration-lepes csak ugy lenne leirhato, hogy uj actor primitive-t vagy uj core output family-t vezet be, azt explicit blocker/gap note-tal kell jelolni, nem lehet csendes feltetelezes.
6. A pilot actor valasztas legyen pragmatikus: a legkisebb migration-kockazat / legjobb parity-megfigyelhetoseg elve alapjan tortenjen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Blast radius:
   - uj checked-in Phase D migration-plan artifact,
   - nincs source/runtime/state/UI contract modositas ebben a fazisban,
   - nincs parent plan edit ebben a fazisban.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Workstream 4 migration spine sorrendhez es a Phase D elvart kimenetehez.
2. Binding target contract input:
   - `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - A migration a mar elfogadott target boundaryra epul.
3. Binding scenario/gap input:
   - `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - A retained adapterek, explicit gapek es bounded open questionok innen jonnek.
4. Binding current-state grounding:
   - `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez mutatja, mely mai runtime/operator surface-ek maradnak retained adapternek vagy cleanup-jeloltnek.
5. Binding normative companion set:
   - `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md`
   - `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md`
6. Informational comparison input:
   - `docs/pairflow-initial-design.md`
   - `docs/v2/pairflow-v2-architecture-plan-joint.md`
7. Precedence rule:
   - migration-sorrendhez a parent plan es a Phase C gap synthesis az elsodleges;
   - target boundary-ertelemzeshez a Phase B draft az authoritative;
   - current-state retained feluletekhez a Phase A inventory az authoritative;
   - informational docs explanatory note-kent hasznalhatok.

### Terminology Lock

1. `migration step` = a rollout sorrend egy explicit, sorrendhelyes eleme, amelyhez elofeltetel, parity evidence es cleanup kovetkezmeny tartozik.
2. `parity evidence` = az a bizonyitekfajta, amely igazolja, hogy a migration lepes nem seriti a canonical actor/protocol viselkedest.
3. `retained adapter` = olyan current-state wrapper, compatibility reteg vagy operator/runtime surface, amely ideiglenesen megmarad a migration idejen.
4. `cleanup trigger` = annak explicit megnevezese, hogy milyen feltetel eseten torolheto vagy egyszerusitheto egy retained adapter.
5. `core freeze point` = az a migration-pillanat, ahol a minimalis actor runtime core szerzodeset implementacios alapnak tekintjuk, es tovabbi bovites helyett rollout fokusz jon.
6. `pilot actor` = az a konkret migration-jelolt actor vagy role projection, amelyen a target boundary eloszor parity mellett kiprobalhato.
7. `observability-only retained topology` = olyan retained runtime surface, amely operatori lathatosagkent megmaradhat, de nem canonical authority- vagy ack-forras.
8. `policy ownership` = annak rogzitese, hogy egy migration soran egy nyitott pont actor, executor, kernel vagy operator domainbe tartozik-e.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` | checked-in Phase D migration artifact | markdown migration spine -> checked-in artifact | uj Phase D plan artifact | Egyetlen artifact keszul, amely migration lepesekre bontja a target boundary bevezeteset, parity gate-ekkel es retained adapter ownershippel | P1 | required-now | Phase D deliverable definicio |
| CS2 | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` | target boundary lock | Phase B contract -> migration invariants | Phase D invariants section | A migration spine explicitten Phase B core contract invariansaihoz kotodik, es nem nyitja ujra a target boundaryt | P1 | required-now | Phase B -> Phase D lock |
| CS3 | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` | migration risk inputs | Phase C coverage/gaps -> migration ordering | Phase D retained adapter / open question sections | A Phase C covered-with-adapter es gap megfigyelesei explicit migration-step inputokka valnak | P1 | required-now | Phase C -> Phase D grounding |
| CS4 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | Workstream 4 realization | migration workstream -> migration steps | Phase D step list | A lepesek az elvi sorrendet kovetik: wrapper, delivery/ack boundary, core freeze, boundary split, pilot, rollout | P1 | required-now | plan alignment |
| CS5 | protocol-first companion refs | protocol-first compatibility | retained surfaces -> cleanup ownership | Phase D cleanup section | A migration spine nem hozhat vissza legacy alias, implicit authority vagy special-case meta-review modellt | P1 | required-now | protocol-first compatibility |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Migration step schema | jelenleg nincs checked-in Phase D spine | egységes step-schema kell | `step_id`, `goal`, `preconditions`, `parity_evidence`, `retained_adapters`, `owner_domains`, `cleanup_trigger`, `next_step_dependency` | `risks`, `notes`, `pilot_relevance` | docs-only schema | P1 | required-now |
| Pilot actor selection | jelenleg nincs explicit pilot sorrend | Phase D nevezzen meg pilot javaslatot vagy sorrendet | pilot actor / role projection, indoklas, parity ok | alternatív sorrend note | rollout input only | P1 | required-now |
| Adapter lifecycle | Phase C retained adapterek mar latszanak | explicit retained-vs-removable dontes kell | adapter lista, ownership, cleanup trigger | observability-only note | migration-only decision | P1 | required-now |
| Open question ownership | duplicate/ack/operator-shape nyitott | explicit owner-domain es migration-fazis kell | question, owner domain, required decision point | topology note | bounded Phase D input | P1 | required-now |
| Core freeze | a lean boundary kesz, de rollout meg nincs | freeze pontot kell megnevezni | freeze condition, evidence, downstream implication | later-hardening note | Phase E elofeltetel | P1 | required-now |

Normative rules:

1. A Phase D artifact migration-sorrendet ad, nem implementation tasklistat.
2. Minden migration stephez explicit parity evidence kell.
3. Minden retained adapterhez explicit cleanup trigger vagy retained indoklas kell.
4. A duplicate suppression es operator-visible ack shape nyitott pontjai owner-domain szinten felosztandok; nem maradhatnak “valaki majd kesobb kitalalja” allapotban.
5. A Phase D nem vezethet be uj actor primitive-t vagy uj output family-t a migration egyszerusitese erdekeben.
6. A pilot actor kiválasztasa legyen parity- es kockazatvezerelet, ne szimbolikus vagy scope-inflalo.
7. Az observability-only retained topology nem lehet canonical control path a Phase D celmodellben sem.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Docs artifacts | uj checked-in Phase D plan markdown | runtime, CLI, state vagy UI code modositas | docs-only deliverable | P1 | required-now |
| Migration synthesis | rollout sorrend, parity gate, adapter ownership levezetese | implementation ticket-level feladatlista gyartasa | strategy, nem execution | P1 | required-now |
| Pilot recommendation | konkret pilot actor vagy sorrend javaslat | tenyleges cutover vagy branch/PR terv | Phase E bemenet | P1 | required-now |

Constraint:

1. Ha a Phase D dokumentum barmely lepesnel implementation-level commandokat vagy code-touch listat kezd kotelezoen eloirni, az mar nem migration spine, hanem kulon implementation plan.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| a migration sorrendhez nincs eleg parity evidence egy lepeshez | Phase B/C inputs | result | a lepes explicit blocker vagy deferred step note-tal marad a dokumentumban | `PHASED_PARITY_EVIDENCE_MISSING` | warn | P1 | required-now |
| retained adapterrol nem dontheto el, torolheto-e vagy observability-only retained marad | Phase A/C inputs | result | explicit owner + cleanup trigger hiany note; Phase E elofeltetelnek jelolendo | `PHASED_ADAPTER_CLEANUP_UNDECIDED` | warn | P1 | required-now |
| a duplicate suppression policy tobb owner-domain kozott szetcuszik | Phase C gaps | result | a dokumentum explicit kernel/executor/operator ownershipot rendel, vagy open blockernek jeloli | `PHASED_POLICY_OWNERSHIP_UNCLEAR` | warn | P1 | required-now |
| topology tradeoff nincs veglegesen eldontve | Phase B/C inputs | fallback | topology-semleges migration spine marad; csak retained/default ownership note kerul be | `PHASED_TOPOLOGY_STILL_OPEN` | info | P2 | required-now |
| pilot actor kiválasztasara tobb vedheto opcio marad | migration reasoning | result | primary pilot + secondary fallback pilot note | `PHASED_PILOT_ALTERNATIVES` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md` | P1 | required-now |
| must-use | `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md` | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md` | P1 | required-now |
| must-use | `docs/v2/pairflow-v2-architecture-plan-joint.md` mint informational comparison input | P2 | required-now |
| must-not-use | implementation ticket backlog Phase D deliverable helyett | P1 | required-now |
| must-not-use | uj actor primitive vagy output family migration convenience miatt | P1 | required-now |
| must-not-use | retained tmux/operator surfaces canonical authority- vagy ack-source-sza emelese | P1 | required-now |
| must-not-use | rewrite-jellegu egyszeri nagy atallas strategia | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Phase D plan artifact exists | a task docs-only modban fut | a deliverable elkeszul | letezik a checked-in `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` artifact | P1 | required-now | doc review |
| T2 | migration steps explicit and ordered | parent plan Workstream 4 sorrendet ker | a dokumentum elkeszul | a migration spine explicit, rendezett lepeslistat ad a wrapper -> delivery/ack -> core freeze -> boundary split -> pilot -> rollout sorrendhez | P1 | required-now | doc review |
| T3 | every step has parity evidence | a Phase D migration spine parity-gated kell legyen | a dokumentum review-ja megtortenik | minden migration step rendelkezik parity evidence mezovel vagy ekvivalens explicit bizonyitekkal | P1 | required-now | doc review |
| T4 | retained adapters have ownership | Phase C retained adapter-pathokat mutatott | a dokumentum elkeszul | minden retained adapterhez explicit owner domain es cleanup trigger tartozik, vagy retained indoklas marad | P1 | required-now | doc review |
| T5 | duplicate suppression ownership handled | Phase C bounded open question duplicate suppressionrol szol | a dokumentum elkeszul | a duplicate delivery es duplicate emit suppression owner-domain es decision point szinten szerepel | P1 | required-now | doc review |
| T6 | operator-visible vs kernel-visible ack issue is placed | Phase B/C ack-shape open question fennall | a dokumentum elkeszul | a migration spine explicitten megmondja, hogy ez mely lepesben es mely ownership alatt dol el | P1 | required-now | doc review |
| T7 | pilot actor recommendation present | Phase D pilot actor javaslatot var | a dokumentum elkeszul | van explicit pilot actor vagy migration sorrend, parity/kockazati indoklassal | P1 | required-now | doc review |
| T8 | scope discipline preserved | Phase D nem implementation plan | a dokumentum review-ja megtortenik | a deliverable nem valik code-task bontassa, es nem tartalmaz implementation commandlistat | P1 | required-now | doc review |
| T9 | retained tmux stays observability-only | current runtime retained tmux shape letezik | a dokumentum elkeszul | a migration spine kulon kimondja, hogy a retained tmux/operator surface observability-only marad | P1 | required-now | doc review |
| T10 | Phase E boundary explicit | Phase D utan kovetkezik a tenyleges pilot cutover | a dokumentum elkeszul | a spine explicitten lehatárolja, mi Phase D docs-dontes, es mi marad a Phase E implementacios pilotra | P1 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a migration spine tul sok retained adaptert tartalmaz, kesobb erdemes kulon adapter-cleanup appendixet kesziteni.
2. [later-hardening] Ha a parity evidence oszlop tul absztrakt maradna, kulon companion memo keszulhet parity-evidence mintakkal.
3. [later-hardening] Ha a pilot actor kiválasztas ket jelolt kozott szoros marad, kulon comparison note keszulhet a ket pilot-opciorol.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Adapter cleanup appendix | L2 | P3 | later-hardening | retained adapter density | Kulon appendixben tarthatok a retained adapterek cleanup triggerjei |
| HB2 | Parity evidence examples | L2 | P3 | later-hardening | migration review need | Kulon note keszulhet jo parity evidence mintakkal |
| HB3 | Pilot comparison memo | L2 | P3 | later-hardening | multiple viable pilots | Ha kell, kulon memo hasonlitsa ossze a primary es fallback pilotot |

## Review Control

1. Minden finding tartalmazzon `priority`, `timing`, `layer`, `evidence` mezot.
2. Ne fogadjunk el olyan Phase D artifactot, amely nem tartalmaz explicit migration lepessor-rendet.
3. Ne fogadjunk el olyan migration spine-t, amely retained adaptereket ownership es cleanup trigger nelkul hagy.
4. Ne fogadjunk el olyan dokumentumot, amely a duplicate suppression vagy ack-shape nyitott pontokat owner-domain nelkul hagyja.
5. Ne fogadjunk el olyan deliverable-t, amely implementation backlogga vagy rewrite tervve dagad.
6. Ne fogadjunk el olyan migration spine-t, amely a retained tmux/operator surface-et canonical control pathkent tartja meg.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. letezik a checked-in `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` artifact;
2. a dokumentum explicit migration lepessor-rendet ad a target boundary bevezetesere;
3. minden lepeshez rogziti az elofeltetelt, a parity evidence-et, a retained adapter ownershipet es a cleanup trigger vagy retained indoklast;
4. a Phase C bounded nyitott pontjai owner-domain es decision-point szinten le vannak fordítva migration-inputra;
5. a dokumentum megnevez egy pilot actor javaslatot vagy sorrendet;
6. a retained tmux/operator shape observability-only retained feluletkent van kezelve;
7. a deliverable nem irja at a Phase B contractot es nem tartalmaz source/runtime/CLI kodmodositast;
8. a Phase E implementacios pilot hatara kulon es olvashatoan le van valasztva.
