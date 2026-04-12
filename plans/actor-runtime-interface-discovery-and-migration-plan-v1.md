---
artifact_type: plan
artifact_id: plan_actor_runtime_interface_discovery_and_migration_v1
title: "Actor Runtime Interface Discovery and Migration Preparation"
status: in_progress
prd_ref: null
owners:
  - "felho"
---

# Plan: Actor Runtime Interface Discovery and Migration Preparation

## Current Codebase Check (2026-04-12)

1. `src/core/**` is already gone from the checked-out tree, so the original closure dependency on residual core retirement is historical context rather than a current blocker.
2. The docs-only Phase A-D deliverables referenced by this plan are already checked in.
3. The remaining live scope is the still-open generic actor-runtime implementation follow-up after the A-D planning artifacts, not the production of the A-D planning artifacts themselves.
4. The narrow Phase E meta-review follow-up tasks that were active in the 2026-04-10 checkpoint discussion are now both completed and archived:
   - `plans/archive/tasks/actor-runtime-interface-meta-review-submit-inconclusive-human-gate-phaseE.md`
   - `plans/archive/tasks/actor-runtime-interface-meta-review-approve-advisory-guidance-hardening-phaseE.md`
5. A public `pairflow bubble meta-review status|last-report` read-model surface ebben a tree-ben meg mindig explicit predecessor-owned boundary; a repo-surface cleanup nem irhatja at a README/operator wordingot addig, amig a `plans/tasks/actor-runtime-interface-meta-review-cached-public-read-model-removal-phaseE.md` task le nem zarul.
6. A persisted authority + cleanup/recovery removal szelet a jelenlegi tree-ben mar lezart archivalt predecessor:
   - `plans/archive/tasks/actor-runtime-interface-meta-review-cached-persisted-authority-and-cleanup-recovery-removal-phaseE.md`
7. Az aktiv repo-surface guidance mar csak a surviving direct review contractot es a 2026-04-12-es replacement tasklancot mutathatja; a korabbi `operator-read-surface-closure` es negy-taskos remaining split historical-only artifact.
8. Phase E lane-guard note: a current tree-ben ettol fuggetlenul maradt egy kulon internal meta-review live-run runtime stack; ezt a bounded removal-seam-et a `plans/tasks/actor-runtime-interface-meta-review-live-run-removal-phaseE.md` task kezeli, es ez nem terjeszti ki a scope-ot a kulon kezelt public cached read-model lane-re, a lezart persisted authority + cleanup/recovery lane-re, vagy a repo-surface cleanup lane-re.

## Remaining Phase E Resequencing Update (2026-04-12)

1. A 2026-04-11-es megmaradt aktiv tasklanc (`cached-cli-read-stack-removal`, `cached-state-shape-and-persistence-decoupling`, `cached-workflow-ui-cleanup`, `cached-active-docs-cleanup`) mar historical-only; az aktiv replacement sorrend az alatti uj tasklanc.
2. A torles oka nem ujabb izolalt P1 hiany, hanem rossz szeleteles:
   - a megmaradt munka egyszerre erintette a public read-model closure-t,
   - a persisted authority + cleanup/recovery closure-t,
   - es a repo-surface wording/traceability cleanupot.
3. A ket archived prereq tovabbra is ervenyes lezart closure:
   - `plans/archive/tasks/actor-runtime-interface-meta-review-cached-current-round-authority-and-runtime-consumer-cutover-phaseE.md`
   - `plans/archive/tasks/actor-runtime-interface-meta-review-cached-approval-and-projection-consumer-cutover-phaseE.md`
4. A replacement remaining tasklanc jelenlegi allapota:
   - aktiv: `plans/tasks/actor-runtime-interface-meta-review-cached-public-read-model-removal-phaseE.md`
   - lezart/archivalt predecessor: `plans/archive/tasks/actor-runtime-interface-meta-review-cached-persisted-authority-and-cleanup-recovery-removal-phaseE.md`
   - lezart/archivalt successor: `plans/archive/tasks/actor-runtime-interface-meta-review-cached-repo-surface-cleanup-phaseE.md`
5. A vegrehajtasi sorrend kotelezo:
   - eloszor read-model closure: public cached CLI/read/export surface torlese,
   - utana persisted authority + cleanup/recovery closure: reduced state shape, writer cleanup, inspection/recovery consumer alignment,
   - vegul repo-surface cleanup: workflow/docs/copied prompt wording es traceability cleanup.
6. Ez a resequencing supersedalja a korabbi negy-taskos remaining splitet, de nem irja felul a plan eredeti fo celjat: a canonical actor runtime boundary tovabbi szerepsemleges tisztitasat.

## Remaining Phase E Control Model (2026-04-12)

1. Business invariant: a cached meta-review functionality a Phase E vegen sem runtime decision source-kent, sem publikus/operatori read surface-kent, sem aktiv repo-local guidancekent nem maradhat.
2. Control model: a surviving meta-review allapotot a live current-round authority, a transcript-derived current approval/request context es az explicit current-run artifactok dontik el; a persisted `last_autonomous_*` blokk historical transitional adat, nem source-of-truth.
3. Read-path rule:
   - current runtime/orchestration dontes csak a mar lezart live authority/transcript contractokra epulhet,
   - public operator read pathkent nem maradhat `bubble meta-review status|last-report`,
   - repo-local docs/prompt surfaces csak a surviving review contractot nevezhetik meg.
4. Forbidden fallback:
   - no persisted `last_autonomous_*` fallback truth,
   - no retained `bubble meta-review` compatibility wrapper,
   - no removed cached source-mode wording or stale task-reference fallback az aktiv docs/prompt surface-en.
5. Missing-data rule:
   - runtime/read-model oldalon fail-closed vagy explicit absence/unavailable viselkedes marad,
   - docs/prompt oldalon a removed capability egyszeruen elhagyando, nem legacy alternativaval potlando.
6. Phase boundary note:
   - contract closure: ez a 2026-04-12 plan update
   - producer closure: archived current-round authority task
   - internal execution closure: persisted authority + cleanup/recovery removal task
   - workflow/orchestration closure: archived approval/projection task
   - read_model_closure: public read-model removal task
   - activation closure: N/A
   - cleanup_recovery_closure: persisted authority + cleanup/recovery removal task, majd repo-surface cleanup docs szinten

## Remaining Phase E Authority Fan-out Scan (2026-04-12)

1. Authority producer:
   - archived reviewer-parity authority/runtime producer cutover
2. Persisted authority:
   - `state.meta_review.last_autonomous_*` es a hozza kapcsolt writer/schema/default/inspection shape
3. Internal execution consumers:
   - submit/live-run persistence
   - shared snapshot/default helpers
4. Workflow/orchestration consumers:
   - approval/projection source-of-truth mar archived prereqben le van zarva
   - remaining live workflow munka mar nincs ebben a lane-ben
5. Read-model consumers:
   - public `bubble meta-review` CLI subtree
   - retained read-model exports/types/tests
6. Cleanup/recovery consumers:
   - metaReviewGate recovery/snapshot helper family
   - inspectable state normalization
   - a reduced shared shape-re epulo in-repo fixture/test consumers
7. Collapse notes:
   - a public read-model closure kulon marad, mert kulon breaking public/export boundary
   - a persisted authority es cleanup/recovery closure egy taskba vonhato, mert ugyanazt a reduced shared shape-et zarja le
   - a workflow/UI docs es active docs cleanup egy taskba vonhato, mert mar csak repo-surface wording/traceability risk marad

## Remaining Phase E Complexity / Split Rationale (2026-04-12)

1. `risk_score`: `8`
2. Why a plan is needed:
   - authority/read-model multi-consumer scope
   - archived prereq-ek utan is harom kulon closure-csalad maradt
   - a korabbi remaining tasklanc review-loopot termelt a closurek keverese miatt
3. Split decision:
   - public read-model removal
   - persisted authority + cleanup/recovery removal
   - repo-surface cleanup
4. Milestone-gated behavior to defer:
   - N/A; ez mar cleanup/removal sequencing, nem uj runtime activation

## Remaining Phase E Breakdown (2026-04-12)

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase E3 | Public cached read-model closure | archived authority + approval/projection prereq-ek, current public CLI/read exports | removed public `bubble meta-review` surface, intact canonical actor emit path | nincs public cached subtree, nincs retained read export |
| Phase E4 | Persisted authority es cleanup/recovery closure | Phase E3 output, archived prereq-ek, current reduced control model | reduced `meta_review` shape, writer/schema/helper alignment, legacy-input tolerance reduced outputtal | canonical persisted output mar nem hordoz `last_autonomous_*` mezoket |
| Phase E5 | Repo-surface cleanup | Phase E3-E4 output, current repo-local docs/prompt surfaces | cached-mode es deleted-task wording cleanup, aligned active docs traceability | aktiv docs/prompt surface csak surviving contractot es uj tasklancot mutat |

## Remaining Phase E Ownership Grid (2026-04-12)

| Phase | Dominant Boundary | Produced Authority | Consuming Surfaces | Forbidden Co-mingling |
|---|---|---|---|---|
| Phase E3 | read-model removal | N/A | public CLI, retained read exports, read-model tests | persisted authority shape es docs cleanup ne csusszon ide |
| Phase E4 | persisted authority + cleanup/recovery | reduced canonical `meta_review` shape | writer/schema/defaults, recovery/inspection helpers, in-repo shape consumers | public read-model removal es repo wording cleanup ne keveredjen ide |
| Phase E5 | cleanup/rollout docs surface | N/A | repo-local workflow/docs, copied prompts, historical traceability | runtime/state/read-model kodmunka ne csusszon ide |

## Objective

Elokesziteni egy olyan actor runtime interface-et vagy actor adapter contractot, amely:
1. egyseges, canonical boundaryt ad az `implementer`, `reviewer` es `meta_reviewer` actorok futasahoz,
2. lehetove teszi uj actorok bevezeteset uj actor-specifikus CLI/domain branch-ek nelkul,
3. csokkenti a jelenlegi actor-specifikus behavior, parser es runtime-coupling mennyiseget,
4. Phase 4 es Phase 5 utan biztonsagos, kis lepeses migraciot tamogat egy rewrite helyett.

Ez a plan discovery- es preparation-jellegu. Nem celja a Phase 4 vagy Phase 5 leszallitasi scope-janak felulirasa vagy kiszelesitese.

## Direction Change Note (2026-04-05)

1. A retained meta-review operator cleanup Phase E lane-en a `bubble meta-review run|status|last-report|recover` subtree eredetileg egyben kezelt cleanup-target volt.
2. A 2026-04-05-i review/implementation tapasztalat alapjan ez a framing nem bizonyult eleg stabilnak: a lane tobb, egymast erosito P1 regresszioba futott, es a valos blast radius nagyobbnak latszik egy egyszeru retained operator cleanupnal.
3. Ideiglenes iranyvaltas:
   - a `status` es `last-report` retained olvaso/operator surface most tudatosan befagyasztva marad, es nem nyitunk rajta uj implementacios szeletet addig, amig a `run` removal le nem zarul,
   - a public `meta-review run` kivezetese kulon bounded taskkent kezelendo,
   - a meta-review-specific `recover` irany kesobbi ujraertekelest igenyelt.
4. A jelenlegi munkahipotézis szerint ez jobban illeszkedik a plan eredeti celjahoz is, mert csokkenti a retained role-specifikus operator surface-et, mikozben kozelebb visz egy kozosebb actor emit / reconcile kernelhez.
5. A `run` removal utan explicit decision checkpoint kovetkezik: tudatosan ujra kell nezni, maradt-e barmilyen indokolt tovabbi munka a `status` / `last-report` korul, vagy azok valtozatlanul retained maradhatnak.
6. Ennek megfeleloen a korabbi egyben kezelt Phase E operator cleanup task historical parent artifactkent marad meg, de nem tekintendo a jelenlegi legjobb aktiv implementation targetnek.
7. Ettol fuggetlenul egy szukebb, jelen tree-re ujragroundolt Phase E follow-up legitim marad: az approve-advisory guidance/parity hardening a live `v11` submit/prompt/diagnostics seamsen.

## Checkpoint Status (2026-04-10)

1. A `run` removal precondition mar teljesult a jelenlegi tree-ben: a retained public operator help mar csak `status | last-report` commandokat mutat, es a removed `run` pathra explicit fail-closed guidance van.
2. A ket szuk, current-tree Phase E meta-review follow-up task, amelyet ez a plan a direction change utan legitim bounded targetkent kezelt, le van zárva es archiválva:
   - `actor-runtime-interface-meta-review-submit-inconclusive-human-gate-phaseE`
   - `actor-runtime-interface-meta-review-approve-advisory-guidance-hardening-phaseE`
3. A korabban felmerult meta-review-specific `recover` / `reconcile` irany a jelenlegi tree-ben mar nem aktiv implementacios track: a code path el lett tavolitva, es a plan alatt nem marad hozza kulon follow-up task.
4. Emiatt a direction-change checkpoint eredmenye most az, hogy az `operator-read-surface-closure` task superseded allapotba keruljon, es ne legyen automatikusan aktiv implementation target.
5. A kovetkezo helyes docs/decision lepes:
   - explicitten kimondani, hogy a retained `status` / `last-report` felulet jelen allapotban read-only operator projectionkent maradhat,
   - es rogziteni, hogy nincs tovabbi meta-review recovery-specifikus follow-up ezen a planon belul.
6. A jelen checkpoint alapjan a task superseded allapotba kerul: a retained read-surface closure nem marad aktiv Phase E task, es a tovabbi nyitott iranyok mar nem meta-review recovery lane-kent ertelmezendok.

## Full Cached-Surface Removal Checkpoint (2026-04-11)

1. A 2026-04-10 retained-read-surface dontes historical interim checkpointte valt; mar nem tekintendo aktualis target end-state-nek.
2. A jelenlegi aktiv problemat hat kotott sorrendu szeletre kell bontani:
   - foundation 1: reviewer-parity meta-review authority es hidden runtime consumer cutover,
   - foundation 2: approval es projection consumer cutover,
   - delivery 1: cached CLI/read-stack public surface removal,
   - foundation 3: cached state shape es persistence physical field removal,
   - delivery 2: workflow/UI consume cleanup,
   - delivery 3: active docs cleanup es superseded traceability update.
3. Az elso harom kodszelet addig nem hagyhato ki, amig barmely hidden runtime seam, approval override, status/list projection vagy retained read-stack meg `last_autonomous_*` mezokre epul.
4. A ket cleanup delivery szeletben nincs backward compatibility budget:
   - nincs removed-command shim,
   - nincs CLI help reminder,
   - nincs skill guidance, amely a `cached` modra vagy a `last-report` / `status` commandokra hivatkozik,
   - nincs UI prompt, amely removed cached source-mode kapcsolot masol.
5. Ez a checkpoint mar historical context: a jelenlegi aktiv Phase E sequencinget a 2026-04-12-es replacement lanc rogzitette, amelyben az E3 public read-model closure marad az elo prerequisite, az E4 archived, az E5 pedig repo-surface cleanup.

## Decision Baseline

1. Terminologia: a javasolt uj boundary munkaneve `actor runtime interface`; ezzel ekvivalens elfogadhato terminus az `actor adapter contract` vagy `actor driver contract`. Nem pusztan TypeScript interface-rol van szo, hanem egy teljes runtime/domain boundaryrol.
2. Scope boundary: a Phase 4 es Phase 5 marad a canonical actor-emission surface es a legacy cleanup kotelezo szallitasanak helye. Ez a plan ezekkel parhuzamos discovery-es tervezesi munka, nem uj delivery gate a folyamat kozben.
3. Canonical source of truth: a jovobeli actor runtime interface-et nem a jelenlegi role-specifikus command surface unionjabol kell levezetni, hanem a protocol-first target modellbol, kulonosen a generic actor-facing protocol surface-bol es az explicit authority-contractbol.
4. Inventory policy: a jelenlegi actor-viselkedesek inventoryja leiro artifact, nem normativ target contract. Az inventory celja a jelenlegi behaviorok, side effectek, special-case-ek es drift-ek feltarasa, nem azok legitimacioja.
5. Capability-first policy: a target actor runtime interface capability-alapu legyen. A kerdes nem az, hogy ma milyen commandok vannak, hanem az, hogy egy actor-futasnak milyen minimalis kepessegekre van szuksege a canonical protocol modell kiszolgalasahoz.
6. Role-model policy: kulon kell kezelni a `Role`, az `Actor` es az `AgentConfig` fogalmat. A `reviewer` mint workflow-szerep, a `claude` mint konkret actor es az agent persona/skill/mode konfiguracio nem ugyanaz a boundary, es a jovobeli interface-et nem szabad ezek osszemosasara epiteni.
7. Role-neutrality policy: a `meta_reviewer` nem special-case subsystem, hanem a rendszer egyik lehetseges role projectionje ugyanazon actor runtime modellen belul. A jovobeli boundary nem adhat a `meta_reviewer` szerepnek kulon lifecycle-t, kulon actor API-t vagy kulon rendszerszintu alrendszert pusztan a role neve miatt.
8. Authority policy: az actor runtime interface nem hozhat letre, nem modosithat es nem zarhat bubble lifecycle authorityt kozvetlenul. Az actor kizárólag explicit execution contextet kap, durable handoffbol dolgozik, es canonical actor outputot bocsat ki.
9. Event-boundary policy: a jovobeli actor runtime interface mar a discovery fazisban is normalizalt input/output boundarykent kezelendo. A cel nem command-spelling alapú actor API, hanem olyan boundary, amely EventEnvelope-szeru inputot es canonical actor outputot vagy typed artifactot hasznal.
10. Separation policy: az actor runtime interface ne keverje ossze a workflow/domain logikat, a runtime/transport kerdeseket es a role-specifikus policyt. A routing, state transition es authority tovabbra is orchestrator/domain felelosseg.
11. Executor-boundary policy: az actor runtime interface es az executor interface kulon absztrakcio maradjon. Az executor a process/workspace/sync/relay/liveness reteget kezeli; az actor interface azt, amit az actor egy workflow-step vegrehajtasakor lat es hasznal.
12. Small-core policy: a target actor runtime interface magja maradjon kicsi es canonical. Nem cel a mai actor behaviorok teljes unionjat egyetlen kotelezo alapszerzodessé tenni.
13. Extension policy: a ritkabb, opcionális vagy experimentalis actor-viselkedesek lehetnek bounded extension surface-re teve, ha a core contract valtozatlan marad, es az extension nem lep be authority-, routing- vagy state-ownership domainbe.
14. Forbidden-extension policy: workflow state ownership, authority resolution, lifecycle transition, hard capability enforcement es canonical actor-output validation nem szervezheto ki extension retegbe.
15. Migration policy: a vart atallasi minta strangler jellegu legyen. Eloszor wrapper/adapter boundary jelenjen meg a meglevo canonical surface folott, es csak kesobb migralodjanak ra fokozatosan az egyes actor implementaciok.
16. Rewrite avoidance policy: a cel nem uj actor framework egyszeri nagy atirassal, hanem kis lepeses refaktorok sorozata, amelyek minden lepesnel megtartjak a canonical protocol behavior parityt.
17. Phase dependency: a tenyleges actor runtime cutover Phase 4 es Phase 5 utan kezdodhet. A discovery, simulation es migration-spine tervezes viszont mar most elkezdheto, ha nem valtoztatja meg a Phase 4/5 immediate acceptance contractjat.
17. Trigger policy: az actor-runtime target modellben az uj munka atadasanak triggerje explicit gepi boundary legyen (`deliver`, inbox-event, local IPC vagy ezzel ekvivalens structured signal), ne TUI-input submit, `tmux send-keys`, prompt allapot vagy pane-capture alapjan feltetelezett feldolgozas.
18. Acknowledgement policy: a jovobeli actor runtime interface-nek explicit atveteli/allapot-visszajelzesi szerzodest kell adnia (`accepted`, `running`, `rejected`, `failed_to_start` vagy ezekkel ekvivalens typed statuszok). Domain state progression nem alapulhat pusztan azon, hogy a pane-ben latszik-e valami.
19. Observability-vs-control policy: a `tmux` vagy barmely mas operatori felulet targetben observability/debug surface. Nem lehet a canonical delivery-ack, actor-ownership vagy input-feldolgozasi siker authority forrasa.
20. Topology policy: a discovery fazisnak explicitten vizsgalnia kell legalabb harom delivery topologyt: hosszu eletu actor-runner + inbox trigger, explicit `exec`-szeru on-demand inditas, valamint local IPC/API alapu `deliver` boundary. A contractot ugy kell tervezni, hogy ne egjen bele egyetlen topology a core actor interface-be.

## Target Architecture Hypothesis

### Runtime Boundary

1. Egy actor-futas bemenete egy explicit execution context + handoff payload + relevans protocol snapshot legyen.
2. Az actor ne shell-contextbol, `cwd`-bol vagy legacy helper-ekbol talalja ki a bubble authorityt.
3. Az actor kimenete ne role-specifikus command legyen, hanem canonical actor output, human input request vagy typed artifact write.
4. A boundary tervezesi celja legyen, hogy a mai CLI-parancsok kesobb legfeljebb vekony wrapperkent EventEnvelope-szeru vagy azzal ekvivalens canonical boundaryra forditsanak.

### Delivery Trigger and Acknowledgement Model

1. A target modellben kulon boundary a `durable handoff persistence` es kulon boundary az `actor delivery trigger`.
2. A durable transcript/state append mar onmagaban nem eleg bizonyitek arra, hogy az actor tenylegesen atvette vagy elkezdte a munkat.
3. A delivery trigger explicit muvelet legyen:
   - inbox watch event,
   - local `deliver(envelope_ref)` hivasi boundary,
   - vagy ezzel ekvivalens structured relay.
4. A trigger sikerehez a runtime oldalon explicit ack tartozzon, minimum ilyen szemantikaval:
   - `accepted`: a runtime atvette a munkat es vallalja a feldolgozast,
   - `running`: a runtime mar elinditotta az actor-stepet,
   - `rejected`: a munka nem fogadhato be ebben az allapotban vagy ezzel a contexttel,
   - `failed_to_start`: a runtime megprobalta, de a concrete actor launch nem indult el.
5. A discoverynek kulon ki kell mondania, hogy mely workflow state transitionok varhatnak `accepted` szintu ackra, es melyek maradhatnak durable-but-unacknowledged modban operatori recoveryvel.
6. Az input-submit, prompt-visible text, shell marker vagy pane-capture legfeljebb observability signal lehet; ezek nem egyenertekuek a runtime ackkal.

### Runtime Topology Hypothesis

1. A target actor runtime contractnak topology-semlegesnek kell maradnia.
2. Vizsgalando fo topologyk:
   - hosszu eletu actor-runner, amely inboxot vagy relay queue-t figyel,
   - on-demand actor inditas minden handoffhoz (`exec`-szeru modell),
   - local IPC/API boundary, ahol az orchestrator explicit `deliver` hivast kuld a runnernek.
3. A discovery outputnak rogzitenie kell, hogy:
   - mely topology az alapertelmezett jelolt,
   - milyen parity/tradeoff van a tobbi topologyhoz kepest,
   - melyik reteg felel az ack eloallitasert es a duplicate delivery elkeruleseert.
4. A topology valasztas nem valtoztathatja meg a canonical actor input/output contractot; legfeljebb az executor/delivery adapter reteg implementacios dontese marad.

### Tmux Role in the Target Model

1. A `tmux` megtarthato operatori feluletnek, lokalis debug surface-nek vagy human-observable session nezetnek.
2. A `tmux` targetben nem control bus:
   - nem o a canonical `deliver`,
   - nem o adja az authority-ackot,
   - nem o bizonyitja, hogy az actor elolvasta a handoffot.
3. A pane elvesztese, shell fallbackja vagy TUI driftje runtime diagnosztika maradjon, ne protocol-level success/failure bizonyitek.
4. A migration spine kulon vizsgalja azt a vegetallapotot, ahol a `tmux` retained operatori nezet, mikozben a vezerles mar adapteres runtime boundaryn megy.

### Capability Model

1. A minimalis capability-keszlet varhatoan ilyesmi:
   - `receiveExecutionContext`
   - `readHandoff`
   - `readRelevantProtocolState`
   - `emitOutput`
   - `requestHumanInput`
   - `publishArtifact` vagy ezzel ekvivalens artifact/output helper, ha tenylegesen szukseges
   - opcionálisan `ackIntent` vagy ezzel ekvivalens relay/operation boundary, ha kesobb idempotens executor-relay modellre akarunk kozeliteni
2. A kovetkezo dolgok kifejezetten ne legyenek actor capabilityk:
   - bubble state transition vegrehajtasa,
   - authority mezok implicit feloldasa,
   - lifecycle routing,
   - legacy command semantics fenntartasa,
   - tmux/session/pane statusbol levezetett domain dontes.

### Extension Surface Hypothesis

1. A jövobeli designban erdemes kulon kezelni:
   - kotelezo core actor capability-ket,
   - bounded extension pontokat,
   - tiltott extension domain-eket.
2. A bounded extension surface jo jeloltjei lehetnek:
   - step-start context enrichment,
   - role- vagy actor-specifikus prompt/policy dekoraciok,
   - optional artifact producers,
   - findings/rendering/summary helper-ek,
   - human interaction UI helper-ek,
   - kulso integracios adapterek,
   - diagnostics vagy advisory guardok.
3. A kovetkezo teruletek ne legyenek extensionre bízva:
   - workflow state transition,
   - authority-resolution vagy implicit context inference,
   - lifecycle routing,
   - hard capability enforcement,
   - canonical actor-output schema es acceptance validation.
4. Az extension policy celja nem teljes plugin-platform definialasa a discovery fazisban, hanem annak eldöntese, hogy a jovobeli actor runtime interface-nek mely behaviorok legyenek kotelezo core reszei, es melyek maradhatnak opcionális bovitopontok.

### Role Model

1. Az `implementer`, `reviewer` es `meta_reviewer` ugyanazt az actor runtime interface-et hasznaljak.
2. Ami szerepspecifikus marad, az:
   - a kapott handoff tartalma,
   - a workflow-ban betoltott `Role`,
   - a konkret vegrehajto `Actor`,
   - az `AgentConfig`,
   - az elvart output-kind,
   - az actor sajat policyja vagy promptja,
   - adott esetben a supportalt output-shape-ek szukebb halmaza.
3. A szerepspecifikus kulonbseg ne kulon transport/API/CLI boundary legyen, hanem ugyanazon interface mas konfiguracioja vagy policy-ja.
4. A `meta_reviewer` szerep sem kivetel: ha a rendszer kesobb uj role-okkal bovul, azoknak ugyanebbe a role-neutral actor runtime interface-be kell illeszkedniuk, nem uj role-specifikus alrendszerekbe.

## Workstreams

### Workstream 1: Current-State Behavior Inventory

1. Ossze kell gyujteni a jelenlegi actor behaviorokat a teljes codebase-ben.
2. Az inventory minimum retegei:
   - entrypointok es parser-ek,
   - `Role` / `Actor` / `AgentConfig` szetvalasztasa a jelenlegi codepathokban,
   - actor-specifikus validation/policy,
   - runtime/context lookup es helperek,
   - delivery trigger mechanizmusok es implicit/explicit ack pontok,
   - durable protocol emit pathok,
   - event/relay normalizalas vagy annak hianya,
   - executor-fuggosegek (workspace, sync, process, relay, liveness),
   - olyan behaviorok, amelyek extension ponttá tehetok,
   - artifact- es side-effect pathok,
   - legacy aliasok es compatibility branch-ek.
3. Minden behaviorrol rogzitendo:
   - kozos vagy szerepspecifikus,
   - canonical, transitional vagy accidental,
   - targetben kotelezo core, bounded extension, adapterbe szorithato vagy eltavolitando.

### Workstream 2: Capability Contract Derivation

1. Az inventory utan egy capability-alapu contractot kell levezetni.
2. A contractot a protocol-first target modellhez kell igazitani, nem a jelenlegi command surface-hez.
3. Ki kell mondani:
   - milyen input authority es input artifact kell az actor futasahoz,
   - hogyan valik el a `Role`, `Actor` es `AgentConfig`,
   - milyen canonical outputokat bocsathat ki,
   - mi a canonical delivery trigger es mi a canonical ack boundary,
   - milyen normalizalt event vagy relay boundaryra epit,
   - milyen side effectek engedettek,
   - milyen muveletek tilosak az actor boundaryn,
   - mi tartozik mar az executor interface-hez es nem az actor interface-hez,
   - mely behaviorok kotelezo core capabilityk, es melyek bounded extension pontok.

### Workstream 3: Scenario Simulation

1. Kell egy use-case matrix, amelyen a javasolt interface vegigtesztelheto.
2. Minimum szcenariok:
   - implementer pass,
   - reviewer fix-request,
   - reviewer convergence,
   - meta-review result,
   - human input escalation,
   - stale authority,
   - conflicting context,
   - restart/recovery kornyezet,
   - durable handoff letrejott, de actor trigger vagy ack hianyzik,
   - duplicate `deliver` vagy duplicate ack ugyanarra a handoffra,
   - duplicate relay vagy duplicate intent,
   - stale intent egy mar tovabblepett workflow-stepre,
   - `tmux` pane elveszik, mikozben a runtime mar `accepted` vagy `running` allapotot adott,
   - artifact-heavy output,
   - optional extensionnel kiegeszitett actor behavior,
   - retained compatibility adapter path.
3. Minden szcenarional meg kell vizsgalni:
   - milyen input kell,
   - mely capability-k szuksegesek,
   - milyen output keletkezik,
   - milyen provenance es idempotency kovetelmeny jelenik meg,
   - milyen trigger/ack szemantika kell hozza,
   - core capability vagy extension pont kell-e hozza,
   - van-e megmarado szerepspecifikus policy,
   - eleg-e a javasolt interface,
   - ha nem, mi hianyzik.

### Workstream 4: Migration Spine

1. Meg kell tervezni a kis lepeses migracios utat.
2. Elvi sorrend:
   - canonical actor-emission surface stabilizalasa Phase 4-ben,
   - legacy cleanup Phase 5-ben,
   - belso actor runtime contract bevezetese wrapperkent,
   - explicit delivery-trigger es ack boundary bevezetese a retained tmux launch fole,
   - minimalis core capability-k befagyasztasa,
   - bounded extension pontok kijelolese,
   - actor-boundary es executor-boundary explicit szetvalasztasa,
   - egy pilot actor migracioja parity mellett,
   - fokozatos rollout a tobbi actorra.
3. A migration spine minden lepesere rogzitendo:
   - mi az elozetes feltetel,
   - milyen parity evidence kell,
   - mi marad transitional adapter,
   - mely topology marad retained observability-only felulet,
   - mi torolheto a kovetkezo fazisban.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase A | Current-state actor behavior inventory | jelenlegi actor CLI entrypointok, runtime helper-ek, protocol emit pathok, prompt/runtime guidance | checked-in behavior inventory a kozos, szerepspecifikus, transitional es accidental behaviorokrol, kulon `Role`/`Actor`/`AgentConfig`, actor-vs-executor es core-vs-extension nezetekkel | a teljes actor surface inventorozva van, es minden relevans behavior kapott target-minositest |
| Phase B | Capability-alapu actor runtime interface draft | Phase A inventory, protocol-first Phase 3/4/5 target modellek, v2 boundary irany | actor runtime interface RFC vagy ezzel ekvivalens contract draft capability modellel, tiltott muveletekkel, authority boundaryval, actor-vs-executor szetvalasztassal es bounded extension policyval | letezik egy normativ contract draft, amely mar nem legacy command-union logikabol indul ki, v2-kompatibilis boundary-gondolkodast kovet, es kis core-ra epul |
| Phase C | Scenario simulation es gap analysis | Phase B contract draft, use-case matrix | scenario matrix + coverage/gap report, kulon provenance/idempotency/stale-intent es core-vs-extension megfigyelesekkel | minden jelenlegi fo actor-use-case vegig van jatszva, es az interface-gapek explicitten rogzitettek |
| Phase D | Migration spine es rollout strategy | Phase B-C artifactok, Phase 4/5 aktualis allapota | kis lepeses migracios terv parity gate-ekkel, pilot actor javaslattal, actor-vs-executor boundarydontesekkel, core freeze ponttal es adapter cleanup sorrenddel | a Phase 5 utani elso implementacios fazis rewrite nelkul elkezdheto |

## Task List

1. `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA.md`
2. `plans/tasks/actor-runtime-interface-capability-contract-phaseB.md`
3. `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC.md`
4. `plans/tasks/actor-runtime-interface-migration-spine-phaseD.md`
5. `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` (kesobbi task, csak Phase 5 utan)

## Dependencies

1. [protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md](/Users/felho/dev/pairflow/plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md)
2. [protocol-first-cli-and-protocol-surface-unification-phase4.md](/Users/felho/dev/pairflow/plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md)
3. [protocol-first-legacy-meta-review-model-removal-phase5.md](/Users/felho/dev/pairflow/plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md)
4. `docs/pairflow-initial-design.md`
5. A jelenlegi actor CLI entrypointok, runtime helper-ek, prompt/guidance builder-ek es protocol persistence pathok codebase inventoryja.

## Risks and Mitigations

1. Risk: a discovery az aktualis legacy behaviorokat emeli be target contractta -> Mitigation: az inventory leiro artifact, a normativ interface-et kulon capability-derivation fazis adja.
2. Risk: a Phase 4/5 delivery fokusza szetszalad -> Mitigation: explicit scope boundary; ez a plan discovery/preparation only a tenyleges cutover elott.
3. Risk: a jovobeli interface tul bove lesz, mert a jelenlegi command-uniont masolja -> Mitigation: tilos a command-surface uniont vegleges contractkent kezelni; a targetet a canonical protocol model vezeti.
4. Risk: a jovobeli interface tul szuk lesz, es nem fedi le a valos actor-use-case-eket -> Mitigation: kulon scenario simulation matrix es gap analysis.
5. Risk: a kesobbi migracio nagy rewrite-iranyba csuszik -> Mitigation: migration spine parity gate-ekkel, pilot actorral es strangler mintaval.
6. Risk: szerepspecifikus policy es runtime concern osszemosodik -> Mitigation: capability tiltólista es explicit authority boundary a contract draftban.

## Validation Strategy

1. Docs validation: a planbol kovetkezo taskok kulon artifactokban bizonyitsak a current-state inventory, a capability contract, a scenario matrix es a migration spine teljességet.
2. Traceability validation: minden current-state behavior kapjon minositest (`common`, `role-specific`, `transitional`, `accidental`) es target-dontest (`core`, `extension`, `adapt`, `remove`).
3. Scenario validation: a simulation matrix bizonyitsa, hogy a javasolt interface a mai fo use-case-eket lefedi, vagy explicit gapet jelez; kulon kezelje az idempotency, stale-intent, provenance es core-vs-extension kovetelmenyeket.
4. Trigger/ack validation: a kesobbi artifactok explicitten mondjak ki, hogy mi szamit delivery triggernek, mi szamit actor-acknak, es mely mai `tmux`/TUI jelek maradnak pusztan observability kategoriaban.
5. Migration validation: a kesobbi taskokban minden migration stephez parity evidence es cleanup ownership tartozzon.
6. Architectural validation: a vegleges actor runtime interface ne sertse a protocol-first plan authority- es routing-invariansait, mar a discovery szinten se mossa ossze az actor boundaryt az executor boundaryval, ne szervezzen ki kernel-felelossegeket extension retegbe, es ne tegye a `tmux` pane-t authority- vagy ack-source-sza.

## Assumptions

1. Ehhez a munkahoz egyelore eleg a `Plan -> Task` lanc; kulon PRD nem kotelezo.
2. A Phase 4 es Phase 5 tovabbra is elsobbseget elvez a tenyleges runtime/CLI szerzodes szallitasaban.
3. A discovery fazis mar Phase 4 kozben is elkezdheto, ha nem valtoztatja meg a bubble-ben aktiv implementacios scope-ot.
4. A tenyleges actor runtime cutover csak akkor kezdheto, ha a canonical actor-emission surface es a legacy cleanup mar eleg stabil.
