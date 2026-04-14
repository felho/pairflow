---
artifact_type: plan
artifact_id: plan_review_boundary_matrix_evidence_and_gating_v1
title: "Review Boundary Matrix Evidence and Gating Plan"
status: draft
prd_ref: null
owners:
  - "felho"
baseline_note: "High-level capture prepared on 2026-04-14 from review-loop learnings around incremental P1 discovery in authority/fail-closed work. This is not an implementation-ready task contract."
---

# Plan: Review Boundary Matrix Evidence and Gating

## Objective

Pairflow review loopba olyan strukturalt boundary-matrix contract bevezetese, amely:
1. korabban felfedi a tiltott fallback, missing-data es baseline-regression hibakat,
2. csokkenti a kesoi review-korben felbukkano uj `P1` issue-k szamat,
3. a task-level acceptance matrixot osszekoti a tenyleges evidence artifactokkal es a meta-review gate dontessel,
4. nem altalanos "tobb tesztet" ker, hanem explicit bizonyitast a valtoztatott boundary-kra.

## Intent And Scope

1. Ez a plan jelenleg szandekosan high-level.
2. Nem rogzit teljes L1 implementation contractot.
3. A cel most az, hogy legyen egy checked-in, kesobb eloveheto iranydocumentum:
   - mi a problema,
   - milyen rendszer-szintu csatlakozasi pontokon lehet kezelni,
   - milyen minimum rollout szeletek tunnek eletszerunek.
4. A plan a Pairflow sajat spec/evidence/gate rendszerere fokuszal:
   - task/plan artifactok,
   - implementer/reviewer evidence,
   - convergence/meta-review gate,
   - rollout/operational feedback.

## Problem Statement

Az authority- es fail-closed-jellegu taskoknal a mai review loopban rendszeresen ez a minta latszik:
1. a task tartalmaz explicit boundary-szabalyokat,
2. a happy path gyorsan zoldre kerul,
3. egy vagy tobb tiltott fallback csak kesobbi korokben derul ki,
4. emiatt uj `P1` findingek jonnek elo tobb review round alatt, egyenkent.

Ennek tipikus okai:
1. a task `Test Matrix` nincs machine-readable modon osztalyozva boundary-szempontbol,
2. az evidence rendszer log-szintu command proofot tud, de nem tudja, hogy melyik konkret boundary-eset lett bizonyitva,
3. a meta-review gate nem ellenorzi, hogy a taskban megjelolt required-now negative/baseline proofok valoban le vannak-e fedve,
4. a reviewer sokszor csak a diffbol es a transcriptbol rekonstruálja a hianyzo negativ matrixot,
5. a rendszer nem kulonbozteti meg eleg elesen azt az esetet, amikor a reviewer ugyan megtalal egy explicit contract-sertest, de azt nem blocker szintre minositi,
6. shared authority-chain valtozasnal a review tul konnyen elfogad entrypoint-local closure-t akkor is, ha ugyanaz a tiltott fallback mas consumeren vagy shared helperen keresztul tovabbra is elerheto.

## Current-System Baseline

1. A task template mar tartalmaz `Test Matrix` es `Review Control` szekciot.
2. A CreatePairflowSpec skill mar eros kontrollmodellt, authority fan-out scan-t es closure-budget gondolkodast hasznal.
3. A reviewer evidence rendszer mar tud strukturalt verification artifactot generalni a command-level validationrol.
4. A converged/meta-review gate oldalon mar van artifact-alapu consistency gate minta.
5. A TestBubble workflow mar tud fixture matrixban es input/boundary matrixban gondolkodni, de ez ma inkabb operator runbook output, nem approval gate input.

Kovetkezmeny:
1. a rendszer jo alapokkal rendelkezik,
2. de a boundary-bizonyitas meg nincs elso osztalyu workflow artifactta emelve.

## Decision Baseline

1. A "boundary matrix" ebben a planban nem altalanos tesztlista, hanem a valtoztatott control-model / authority / fallback boundary explicit bizonyitasi matrixa.
2. A matrix minimum harom osztalyban gondolkodjon:
   - `positive`
   - `negative`
   - `baseline`
3. A negative matrix explicit celja a tiltott resolution pathok es fallbackok fail-closed bizonyitasa.
4. A baseline matrix explicit celja a retained jelenlegi viselkedes regresszio elleni vedelme.
5. A command-log evidence onmagaban nem eleg: kell egy kulon, strukturalt artifact, amely azt mondja meg, hogy melyik task-szintu boundary proof keszult el.
6. Approval-hoz nem minden teszt legyen kotelezo, csak az, amit a task `required-now` es boundary-suly szerint blokkolo bizonyiteknak jelol.
7. A rollout legyen incremental:
   - eloszor docs/spec contract,
   - utana evidence artifact,
   - utana gate enforcement,
   - vegul optional telemetry es workflow tuning.
8. Ha a task explicit `forbidden_fallback` vagy explicit authority-contractot mond ki, akkor az ezzel ellentetes retained shared-path nem minositheto egyszeru hardeningnek csak azert, mert a szukebb happy path zold.
9. Boundary closure-t nem entrypointonkent, hanem a row altal megkovetelt closure scope szerint kell megitelni:
   - `entrypoint_local`
   - `consumer_family`
   - `shared_authority_chain`

## Guiding Principles

1. A problema nem "keves a teszt", hanem "nincs explicit boundary-proof contract".
2. A reviewer ne diff-olvasasbol talalja ki ujra a missing negative matrixot minden bubble-ben.
3. A task-spec legyen a source of truth arra, hogy mi a kotelezo boundary proof.
4. A gate csak olyan bizonyitekot koveteljen, amit a task mar explicitten megnevezett.
5. A gate ne kenyszeritse ugyanazt a bizonyitekot tobb helyen szovegesen ujrafogalmazni.
6. A retained baseline-eket ugyanugy explicit proofkent kell kezelni, mint az uj happy pathokat.
7. Az elso rollout ne koveteljen teljes framework-rewrite-ot vagy uj altalanos policy engine-t.
8. Ha egy review mar feltart egy explicit task-contracttal ellentetes shared-pathot, az alapertelmezetten blocker-jellegu finding, nem "kesobbi szigoritas", kiveve ha a task maga kifejezetten engedi azt az utat.
9. Shared authority/fallback taskoknal a review kerdese nem csak az, hogy "van-e proof a rowra", hanem az is, hogy "a row teljes closure scope-ja zarva van-e".

## Conceptual Clarification: Boundary Assertions

### Why this needs explicit naming

1. A review loopban sok task nem azert csuszik szet, mert a happy path nincs implementalva, hanem azert, mert egy implicit mellekag vagy fallback kesobb derul ki.
2. Emiatt fontos kulon megnevezni, hogy mit ertunk `boundary assertion` alatt, kulonben a rendszer ujra visszacsuszik az altalanos "feature works" gondolkodasba.

### Working definition

`Boundary assertion` = olyan task-szabaly, amely nem csak azt mondja meg, hogy minek kell mukodnie, hanem azt is, hogy hol van a helyes es a helytelen viselkedes hatara.

Tipikus alakja:
1. mi a megengedett / canonical ut,
2. mi a tiltott fallback vagy tiltott resolution path,
3. mi a missing-data viselkedes,
4. mi az a retained baseline, ami kozben nem torhet el.

Maskepp:
1. a sima acceptance criterion azt mondja: `mi legyen kesz`,
2. a boundary assertion azt mondja: `mi csak milyen feltetelekkel lehet helyes`.

### Why this is different from a generic acceptance criterion

Pelda:
1. gyenge allitas: `clone resume mukodjon`
2. eros boundary allitas: `clone resume csak explicit persisted authoritybol mukodhet; tiltott fallback nincs; authority-hiany eseten fail-closed; worktree baseline valtozatlan`

Az elso allitas mellett a rendszer meg mindig "veletlenul helyes" lehet egy tiltott fallbackon keresztul.
A masodik allitas mar explicitten ved a rossz, de latszolag mukodo megoldasok ellen.

### Typical boundary-assertion classes

1. `source_of_truth`
   - melyik forras donthet canonical modon.
2. `forbidden_fallback`
   - melyik retained vagy implicit forras nem hasznalhato masodlagos truthkent.
3. `missing_data`
   - mi tortenik, ha a canonical pathon vart adat hianyzik.
4. `activation`
   - mely uj viselkedes nyilhat meg most, es melyik export/remote/operator surface marad zarva.
5. `baseline_preservation`
   - mely jelenlegi deterministic viselkedesnek kell tulenie a valtozast.

### Closure scope

Nem minden boundary assertion ugyanakkora closure-teret fed le. Ezt erdemes explicitten nevezni, kulonben a review konnyen tul koran kimondja, hogy a row "lezarult".

Javasolt minimum vocabulary:
1. `entrypoint_local`
   - a row egy konkret belepesi pont vagy flow lokalis viselkedeset zarja.
2. `consumer_family`
   - a row egy azonos tipusu consume csaladra ervenyes.
3. `shared_authority_chain`
   - a row ugyanannak az authority- vagy fallback-szabalynak minden relevans shared producer/helper/consumer utjat le akarja zarni.

Review consequence:
1. ha a row closure scope-ja `shared_authority_chain`, akkor nem eleg egyetlen start-path vagy flow zoldre hozasa,
2. ilyenkor a retained shared helper, mas consume csalad vagy mas resume/recovery ut tovabbi engedekenysege ugyanannak a rownak a nyitva maradasat jelenti,
3. vagyis a row nem "uj findinggal" nyilik meg kesobb, hanem valojaban sosem zarult le.

### Practical review consequence

Ennek a plannek a lenyege nem az, hogy "tobb tesztet" kerjen, hanem az, hogy a review fo kerdese ez legyen:
1. mely boundary assertionre van explicit proof,
2. melyikre nincs,
3. melyik nyitott assertion blokkolo,
4. es a kovetkezo kor egyetlen nyitott assertiont zarjon le, ne egy diffuz "review-old meg ami meg rossz" csomagot.

### Manual use before system enforcement

Ez a megkozelites mar a rendszerformalizalas elott is hasznalhato kezzel.

Kezifegyelem szinten a workflow:
1. a taskbol kiemeljuk a kritikus boundary assertionoket,
2. ezeket kis matrixszá alakitjuk (`positive`, `negative`, `baseline`),
3. megjeloljuk, melyik `required-now` es melyik `blocking`,
4. a review nem altalanos diff-olvasas lesz, hanem azt kerdezi:
   - van-e proof erre a sorra,
   - ha nincs, akkor a kovetkezo rework kizárólag ezt a sort zarja le.

### Worked example from the 2026-04-14 review discussion

Az authority/fail-closed jellegu remote-bubble-execution start/resume tasknal a beszelgetes soran a kovetkezo kezileg hasznosithato matrix rajzolodott ki:
1. `positive`
   - clone fresh start mukodik explicit bootstrap authorityval
2. `positive`
   - clone resume mukodik explicit persisted runtime authorityval
3. `negative`
   - clone resume fail-closed, ha a runtime session shape hianyos
4. `negative`
   - clone resume fail-closed, ha nincs persisted runtime session authority egyaltalan
5. `baseline`
   - worktree mode retained baseline nem regresszal

A review loopban a tenyleges nyitott blokkolo sor vegul ez volt:
1. `T-clone-resume-missing-runtime-session`
2. class: `negative`
3. boundary: `authority`
4. required-now: `yes`
5. failure-weight: `blocking`

Ennek a konkret haszna:
1. a kovetkezo kor nem altalanos "meg egy review" lett,
2. hanem egy szuk rework:
   - tilos legyen clone `resume` authorityt visszaepiteni hianyzo runtime session eseten,
   - keruljon ra explicit teszt,
   - es csak ezutan menjen tovabb az approval.

### Concrete lesson from the follow-up review

A kesobbi review-korben viszont kiderult egy fontos hiany a fenti manualis hasznalatban.

A konkret eset roviden:
1. a task explicit szabaly volt, hogy clone `resume` csak explicit persisted runtime authoritybol mehet,
2. tiltott volt a clone authority path-alapu visszakovetkeztetese, ha a persisted `workspaceKind` hianyzik,
3. a start-path szukitese es egy lokalis negative teszt utan ugy tunhetett, hogy a blokkolo sor lezarult,
4. de a shared resolver tovabbra is kepes maradt `workspacePath != worktreePath` alapjan `clone` authorityt visszaepiteni,
5. es ezt a viselkedest a tesztek reszben meg jo viselkedeskent is rogzitettek.

Mi volt ebben a review-loop tanulsag:
1. a problema mar nem "rejtett" volt, mert a shared resolver mint potencialis regresszios hely lathato volt,
2. a hiba inkabb az volt, hogy a megtalalt shared-contract sertest nem eleg eros severityvel kezeltuk,
3. vagyis a review implicit modon entrypoint-local closure-t fogadott el ott, ahol valojaban `shared_authority_chain` closure kellett volna.

Mit kellett volna a matrixnak kimondania:
1. a `clone resume fail-closed, ha a runtime session shape hianyos` sor closure scope-ja nem `entrypoint_local`, hanem `shared_authority_chain`,
2. a row addig nyitott, amig barmely shared helper vagy consume csalad ugyanazt a tiltott clone fallbackot megengedi,
3. ha a diffben marad olyan kodut, amely a task explicit `forbidden_fallback` szabalyat tovabbra is lehetove teszi, az blocker marad akkor is, ha a szukebb start-flow zold.

Ennek a tervre forditott kovetkezmenye:
1. a boundary-matrix rendszernek nem csak a hianyzo proofot kell kezelnie,
2. hanem a "found but underweighted contract violation" mintazatot is,
3. kulonosen authority/fail-closed worknel, ahol ugyanaz a szabaly shared helperen es tobb consume csaladon keresztul sugarzik szet.

### Design implication for the future system

Ha a Pairflow ezt formalizalja:
1. a task nem csak acceptance criteria halmaz lesz, hanem boundary-proof source-of-truth is,
2. a reviewer nem a diffbol fogja ujra es ujra kitalalni a hianyzo negative matrixot,
3. a meta-review gate explicit parity-checket tud futtatni a task-rows es az evidence artifact kozt,
4. es a review loop diffuz hibavadászat helyett egyre inkabb bizonyitasi discipline-ne valik.

## High-Level Architecture Direction

### 1. Spec Contract Layer

Cel:
1. a task `Test Matrix` gazdagitasa boundary-aware mezokkel.

Varhato uj mezok vagy ekvivalens jelolesek:
1. `class`: `positive | negative | baseline`
2. `boundary`: pl. `authority | forbidden_fallback | missing_data | compatibility`
3. `required_for`: pl. `implementer | reviewer | meta_review_gate`
4. `proof_kind`: pl. `unit | contract | integration`
5. `failure_weight`: `blocking | advisory`
6. `closure_scope`: `entrypoint_local | consumer_family | shared_authority_chain`

Elvart eredmeny:
1. a task mar machine-auditable modon ki tudja mondani, melyik bizonyitek approval-blocker.
2. a task ki tudja mondani azt is, hogy az adott row milyen closure scope-on belul tekintheto zartnak.

### 2. Evidence Artifact Layer

Cel:
1. a command-log proof melle strukturalt boundary-proof artifact bevezetese.

Munkanev:
1. `artifacts/boundary-matrix-verification.json`

Minimum tartalom:
1. `test_id`
2. `status`
3. `proof_kind`
4. `refs`
5. `required_now`
6. `covers_changed_boundary`
7. `closure_scope`

Elvart eredmeny:
1. a rendszer ne csak azt tudja, hogy "futott a test", hanem azt is, hogy a task melyik boundary-allitasara van bizonyitek.

### 3. Review And Gate Layer

Cel:
1. a reviewer/meta-review ne csak szovegesen hivatkozzon a matrixra, hanem strukturalt parity check alapjan.

Elvart gate viselkedes:
1. a taskbol kigyujtjuk a kotelezo boundary row-kat,
2. az artifactbol ellenorizzuk a proof statuszt,
3. ellenorizzuk, hogy a bizonyitek a row elvart closure scope-jara vonatkozik-e, nem csak egy szukebb lokalis utra,
4. ha barmelyik blokkolo boundary-proof hianyzik, nincs pass allapotban, vagy nem zarja le a row teljes closure scope-jat, approval nem mehet tovabb.

### 4. Workflow And Rollout Layer

Cel:
1. a bubble kickoff, reviewer guidance es operator workflow fokozatos igazítása az uj contracthoz.

Elvart eredmeny:
1. a "mit kell bizonyitani" korabban megjelenik,
2. kevesebb ad hoc review-ujrafelfedezes kell,
3. az approval package strukturaltabban indokolhato.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Spec contract enrichment | jelenlegi task template, review-loop learnings, authority/fail-closed taskok | task-template javasolt mezobovitese, skill guidance, nevezett boundary-matrix vocabulary | letezik egy egységes, checked-in mod annak jelolesere, hogy melyik test boundary-proof es melyik blokkolo |
| Phase 2 | Boundary evidence artifact MVP | Phase 1 contract, jelenlegi reviewer/pass evidence pattern | minimalis strukturalt boundary verification artifact shape es generation strategy | legalabb egy szuk workflow igazolja, hogy task-row -> artifact-row megfeleltetes vedheto |
| Phase 3 | Meta-review gate parity integration | Phase 1-2 artifactok, jelenlegi convergence/meta-review gate mintak | high-level gate parity design es blocker policy | explicit dontes szuletik, mikor blokkol approvalt a hianyzo boundary proof |
| Phase 4 | Rollout and feedback | korai implementation tapasztalatok, review-loop metrics | rollout strategy, minimal telemetry/learning loop, optional tuning iranyok | a rendszer hasznalhato anelkul, hogy minden bubble-re teljes kezi special-case review kellene |

## Phase Ownership Grid

| Phase | Dominant Boundary | Produced Authority | Consuming Surfaces | Forbidden Co-mingling |
|---|---|---|---|---|
| Phase 1 | spec contract boundary | boundary-aware test matrix semantics | CreatePairflowSpec outputs, task review discipline | evidence persistence vagy meta-review hard gate korai osszekeverese |
| Phase 2 | evidence artifact boundary | canonical boundary-proof artifact | implementer/reviewer evidence flow, refs, artifact readers | teljes gate policy es rollout egyben |
| Phase 3 | approval gate boundary | task-to-artifact parity rule | converged/meta-review approval path | altalanos reviewer policy redesign vagy unrelated loop heuristics |
| Phase 4 | rollout/operations boundary | usage guidance + feedback loop | bubble kickoff guidance, reviewer prompts, future telemetry | foundation contract ujranyitasa rollout kozben |

## Baseline Preservation Notes

1. A jelenlegi command-level evidence logika megmarad; a boundary artifact ezt kiegesziti, nem helyettesiti.
2. A reviewer szabadsaga megmarad uj findingek felfedezesere; a matrix gate nem tilthatja le a valos diff-driven reviewt.
3. A task-spec tovabbra is ember-altal olvashato marad; a machine-auditable mezok nem valthatjak ki a plain-language kovetelmenyeket.
4. Az elso rolloutban a rendszer nem akar minden bubble-re teljes exhaustive matrixot kenyszeriteni; csak a boundary-erzekeny work tipusokra kell fokuszalni.

## Risks And Open Questions

1. Risk: a matrix tul bove valik, es uj adminisztracios terhet rak a taskirasra.
   Mitigation: csak boundary-erzekeny taskokra legyen erositett kovetelmeny.
2. Risk: a gate formalista lesz, es "papiron passzolo" artifactot fog jutalmazni valodi review helyett.
   Mitigation: a matrix parity csak egy plusz blocker-szuro legyen, ne teljes approval-helyettesito.
3. Risk: nehez lesz automatikusan megmondani, hogy egy test valoban a megfelelo boundary-t bizonyitja.
   Mitigation: MVP-ben explicit task-row -> artifact-row mapping, nem automatikus kovetkeztetes.
4. Risk: a rendszer ugyan jobban latja a boundary-row proofokat, de tovabbra is alulsulyozhatja a mar megtalalt shared-contract sertest.
   Mitigation: explicit policy kell arra, hogy a task `forbidden_fallback` vagy explicit authority-contract megsértese retained shared-pathon blocker maradjon, ne valjon advisory jellegu "kesobbi tighteningge".
5. Open question: melyik workflow pont generalja a boundary artifactot:
   - implementer pass,
   - reviewer verification,
   - vagy kulon gate-preparation lepés?
6. Open question: mennyire kell ezt a docs-only es code bubble-k kozott differencialni.
7. Open question: mely boundary work tipusokra legyen Phase 1 rolloutban kotelezo:
   - authority,
   - fallback,
   - missing-data,
   - baseline-preservation,
   - vagy ezek szukebb reszhalmaza.

## Candidate Follow-Up Tasks

1. Task-template boundary-matrix schema hardening.
2. CreatePairflowSpec skill update a boundary-aware `Test Matrix` generationhez.
3. Boundary verification artifact schema es write/read MVP.
4. Meta-review gate parity-check design task.
5. Pilot rollout egy valasztott authority/fail-closed task kategoriara.

## Validation Strategy

Ezen a szinten meg nem implementation validationrol van szo, hanem plan-quality validationrol:
1. A plan kulon kezeli a spec, evidence, gate es rollout reteget.
2. Nem mossa ossze a "tobb teszt" otletet a "strukturalt boundary proof" irannyal.
3. Producer-first iranyu sequencinget tart:
   - elobb contract,
   - utana artifact,
   - utana gate.
4. Nyitva hagyja a rollout kerdeseit, nem csinal korai tulvallalast.

## Assumptions

1. A jelenlegi Pairflow architecture eleg eros alapot ad egy uj artifact + gate parity patternhez.
2. A legnagyobb nyereseg authority/fail-closed/baseline-preservation taskoknal varhato, nem minden bubble tipusnal.
3. A kesobbi konkret implementacio valoszinuleg Plan -> Task lancot igenyel majd, nem egyetlen taskot.
