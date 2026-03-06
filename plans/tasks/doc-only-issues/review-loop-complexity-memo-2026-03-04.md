# Programterv: Review Loop Stabilization es LLM-Ready Doc Workflow

Datum: 2026-03-04  
Statusz: in-progress (WS-A/WS-B/WS-C delivered, WS-D pending)  
Tulajdonos: Pairflow docs+runtime

Referenciak:
- kapcsolodo context: `docs/pairflow-evidence-governance-context-2026-03-03.md`
- aktualis doc-only task: `plans/tasks/doc-only-issues/doc-only-temporary-disable-runtime-checks-phase1.md`
- severity policy: `docs/reviewer-severity-ontology.md`
- convergence policy baseline: `docs/pairflow-initial-design.md`

## Active Scope Snapshot (quick view)

Fut most (in scope):
1. Doc workflow es task contract (`L0/L1/L2`, frontmatter policy).
2. Pairflow doc-contract gate-ek advisory modban.
3. Skill alapu PRD/Plan/Task authoring workflow.
4. Rollout/pilot es meres (Phase 1 -> Phase 2 elokeszites).

Parkolva (out of current initiative scope):
1. Pairflow Architecture v2 redesign (`docs/pairflow-architecture-v2-note.md`).

## 1) Cel (mi valtozik)

A cel egy olyan szabvanyositott dokumentacios + review rendszer bevezetese, amely:
1. magas biztonsaggal implementalhato specifikaciot ad LLM-nek,
2. megallitja a vegtelen finomitasi loopokat,
3. rugalmas marad kulonbozo projektstilusok mellett,
4. Pairflow oldalon gate-ekkel kikentheto.

## 2) Kivant vegallapot (target operating model)

1. Artefakt-lanc nagyobb munkanal: `PRD -> Plan -> Task(ok)`.
2. Kisebb munka (bugfix/small task): egyetlen task file is eleg (`prd_ref: null`, `plan_ref: null`).
3. Minden implementacios task file kozos belso szerkezete: `L0 Policy`, `L1 Change Contract`, `L2 Implementation Notes`.
4. Csak `L1` blocker talalat blokkolhat implementaciot.
5. Review komment csak cimezve ervenyes: `priority (P0..P3)`, `timing (required-now|later-hardening)`, `layer (L1|L2)`, `evidence`.
6. `Round cap`: max 2 L1 hardening kor.
7. 2. kor utan uj `required-now` csak evidence-backed `P0/P1` lehet.
8. `Spec Lock`: ha minden `P0/P1 + required-now` zart, task allapot `IMPLEMENTABLE`.

## 3) Scope

### In scope
1. Doc workflow szabvanyok (`PRD/Plan/Task` struktura, hivatkozasok, L0/L1/L2 szabalyok).
2. Review governance (`required-now/later-hardening`, P0/P1 evidence policy illesztes).
3. Pairflow runtime gate-ek terve (advisory -> required-docs -> required-all rollout).
4. Skill oldali dokumentum-letrehozasi es triage workflow.

### Out of scope
1. Teljes uj severity ontology redesign.
2. Projekt-specifikus stilusok teljes homogenizalasa.
3. Azonnali hard-fail enforcement minden bubble-re pilot nelkul.
4. Pairflow Architecture v2 redesign (kulon initiative, nem resze ennek a programnak).

## 4) Megvalositas: 4 workstream

### WS-A: Doc Contract es sablonok (docs layer)

Feladatok:
1. Egységes workflow leiras: szerepkorok, sorrend, parancsok, szcenariok.
2. Uj sablonok: `PRD`, `Plan`, `Task`, reviewer snippet.
3. Task template kotelezo blokkokkal (`L0/L1/L2`, review control, spec lock).
4. Hivatkozasi modell formalizalasa:
   - Plan -> PRD
   - Task -> Plan + PRD (ha van)
   - small tasknel `null` referencia engedelyezett.

Kimenet:
1. `docs/llm-doc-workflow-v1.md`
2. `.claude/skills/CreatePairflowSpec/Templates/prd-template.md`
3. `.claude/skills/CreatePairflowSpec/Templates/plan-template.md`
4. `.claude/skills/CreatePairflowSpec/Templates/task-template.md`
5. Inline reviewer guideline snippet ebben a dokumentumban (`## 10`).

### WS-B: Pairflow core gate-ek (runtime layer)

Feladatok:
1. Task contract parser/validator (minimal machine-readable frontmatter mezok).
2. Review finding validator:
   - kotelezo fieldek (`priority`, `timing`, `layer`, `evidence`),
   - evidence policy illesztes `P0/P1` esetben.
3. Round gate implementacio:
   - `round <= 2`: normal flow,
   - `round > 2`: uj `required-now` csak evidence-backed `P0/P1`.
4. Spec lock allapot szamitas:
   - open finding set alapjan `IMPLEMENTABLE` jelzes.
5. `pairflow bubble status --json` bovites:
   - `failing_gates`,
   - `spec_lock_state`,
   - `round_gate_state`.

Kimenet:
1. Runtime gate logika + status JSON mezok.
2. Tesztek gate decision branch-ekre.
3. Dokumentalt gate hiba-uzenetek.

### WS-C: Skill workflow (authoring layer)

Statusz: delivered (2026-03-06)

Feladatok:
1. Uj skill a dokumentumirasi folyamathoz (repo-stilus kompatibilisen).
2. Kotelezo kerdesfa:
   - bugfix vs small feature vs large feature vs new app,
   - artefakt-szukseglet meghatarozasa.
3. L1 checklist-vezetes (contract boundaries kitoltes).
4. Review feedback triage:
   - `L1 blocker` vs `L2 later-hardening`.
5. Hardening backlog automatikus kigyujtes.

Kimenet:
1. Skill utmutato + promptflow.
2. Standard output format task-file updatehez.
3. Contract-boundary override policy (`contract_boundary_override`) bekotve.
4. L1 explicitites hardening bekotve:
   - required vs optional fields,
   - exact entry signature,
   - pure-by-default side-effect szabaly,
   - dependency-failure fallback szabaly.

### WS-D: Rollout es meres (adoption layer)

Feladatok:
1. Rollout modok:
   - Phase 1: `advisory`,
   - Phase 2: `required-docs`,
   - Phase 3: `required-all`.
2. Pilot bubble sorozat:
   - 1 bugfix,
   - 1 small feature,
   - 1 docs-only hardening task.
3. Metrikak gyujtese es baseline osszehasonlitas.

Kimenet:
1. Pilot report.
2. Gate tuning javaslat.

## 5) Fazos utemterv

### Phase 0 (azonnal)
1. Doc workflow + templatek bevezetese.
2. Reviewer snippet publikalsa.

### Phase 1
1. Runtime advisory validator bekotese (warning only).
2. Skill prototipus doksi-generalashoz.
3. 2-3 pilot task futtatasa.

### Phase 2
1. Required-docs mode bekapcsolasa doc-only/task bubblekre.
2. Status JSON gate mezok aktivalasa.
3. Regresszio + usability feedback kor.

### Phase 3
1. Required-all mode (fokozatosan, repo-szintu kapcsoloval).
2. Stabilizalas, false-blocker csokkentes.

## 6) Elfogadasi kriteriumok (Done)

1. Uj taskok >=90%-a megfelel a task contractnak (`L0/L1/L2` + frontmatter ref policy).
2. Review findingek >=95%-a tartalmaz kotelezo cimkezest.
3. Atlagos review korok szama csokken legalabb 25%-kal docs-heavy taskoknal.
4. Nincs novekedes az escaped blocker aranyban (`P0/P1`).
5. 2. kor utani uj `required-now` pontok 100%-a evidence-backed `P0/P1`.

## 7) Kockazatok es mitigacio

1. Kockazat: tul merev gate, lassul a munka.
   - Mitigacio: advisory rollout, fokozatos hard gate.
2. Kockazat: projekt-specifikus formatum utkozik a templatekkel.
   - Mitigacio: minimal machine-readable contract, szoveges stilus szabad.
3. Kockazat: severity inflation (`P2` -> `P1`) a gate megkerulesere.
   - Mitigacio: evidence kotelezettseg + ontology enforcement.
4. Kockazat: skill es runtime szabaly elcsuszik.
   - Mitigacio: egy kozos canonical policy source es verziozas.

## 8) Dontesek (rogzites)

1. 2. kor utani kivetel nem csak `P0`, hanem `P0/P1` lehet, de csak bizonyitekkal.
2. Task hivatkozzon direktben Planra es PRD-re (ha letezik mindketto).
3. Kis, onallo valtozasnal 1 task-file eleg.
4. `L2` nem blokkol implementaciot; backlogba megy.
5. Kulon `escape hatch` (split/revert mechanika) most nem kerul bevezetese.
   Kiveteles helyzetben a meglevo human intervention folyamat hasznalhato.
6. Az `architecture v2` tema kikerult ennek a projektnek a scope-jabol.
   Ez kulon, kesobbi tervezesi initiative-kent kezelendo.

## 9) Kovetkezo konkret lepesek

1. A sablonokat kiserleti modban alkalmazzuk 2 uj taskon.
2. 1 het pilot utan meres + policy finomitas (WS-D).
3. Keszuljon kulon implementacios task a Phase 2 `required-docs` enforce-ra.
4. A memo statusz/done kriteriumok frissitese pilot eredmenyek alapjan.

## 10) Inline reviewer guidelines (temporary)

```md
## Reviewer Guidelines (L0/L1/L2)

Purpose: keep review high-signal and stop infinite refinement loops.

1. Tag each finding with:
   - `priority`: `P0|P1|P2|P3`
   - `timing`: `required-now|later-hardening`
   - `layer`: `L1|L2`
   - `evidence`: repro/failing-output/code-path proof
2. Blockers are only `P0/P1 + required-now + L1`.
3. `P2/P3` and `L2` items default to `later-hardening`.
4. Max 2 L1 hardening rounds.
5. After round 2, new `required-now` only for evidence-backed `P0/P1`.
6. Spec lock when all `P0/P1 + required-now` are closed (`IMPLEMENTABLE`).
```

---

## Reference: Eredeti memo (valtozatlan tartalom)

# Memo: Review Korok, Komplexitas, es Kontrollalt Spec Irasi Mod

Datum: 2026-03-04  
Referenciak:
- aktualis spec: `plans/tasks/doc-only-issues/doc-only-temporary-disable-runtime-checks-phase1.md`
- kapcsolodo context: `docs/pairflow-evidence-governance-context-2026-03-03.md`

## 1) Mi tortent most (meta szint)

Az utobbi tobb review korben nem a fo termekelv volt vitas, hanem az implementacios specifikacio "lezarasfoka":
- hianyzo call site,
- guard beszurasi pont,
- fallback path es reason code/detail,
- input/output type szerzodes,
- teszt matrix es negativ esetek,
- import forrasok es sorrendi tisztazas.

Ez tipikus "spec hardening" minta: a minoseg javul, de minden uj pontositas ujabb ellenorizheto feluletet nyit meg.

## 2) A jelenseg gyoker oka

A jelenlegi irasi dinamika:
1. irunk egy hasznos, de magas szintu specet,
2. review konkretizal,
3. a konkretizalas novelni kezdi a dokumentum allapotteret,
4. uj allapottal uj edge case-ek jonnek,
5. tovabbi konkretizalas megint novel,
6. loop.

Tehat a problema nem a review, hanem hogy nincs explicit "komplexitas budget" es "retegzett lezarasi protokoll".

## 3) Mennyire hasznosak ezek a feedbackek

Magas jelertk:
- blocker/bug-prevencio feedback (kimaradt call site, rossz fallback, hibas guard pozicio).

Kozepes jelertk:
- implementacios komfort (line range, import source, helper chain, test file status).

Alacsony jelertk:
- szerkezeti/sorrendi finomitas, ha mar minden technikai kockazat fedett.

Kovetkeztetes: a korok nagy resze hasznos volt, de a vegere egyre tobb "polish loop" jellegu pont jott.

## 4) Javasolt megoldas: Oszd meg es uralkodj (3 retegu spec model)

A) `L0 - Policy Spec` (rovid, stabil, max 1-2 oldal)
- cel, in/out scope, artifact-level policy,
- mit NEM oldunk meg ebben a fazisban,
- acceptance criteria roviden.

B) `L1 - Change Contract` (implementacios szerzodes)
- file/fuggveny/call-site matrix,
- input/output delta,
- primary path vs fallback path,
- test matrix (pozitiv + negativ).

C) `L2 - Implementation Notes` (opcionalis)
- line hint, import hint, helper chain, tactical snippets.

Szabaly:
- review korok eloszor csak L0+L1-en zarjanak.
- L2 csak utana bovulhet, ha tenyleg kell.
- ne keverjuk a retegeket egy blokkba.

## 5) Stop szabalyok (hogy ne legyen vegtelen)

1. `Hard-stop gate`: ha minden P0/P1 implementacios kockazat fedett, a spec "implementalhato"-nak minosul.
2. `Polish backlog`: P2/P3 jellegu pontositasok kulon listara mennek, nem blokkoljak az indulast.
3. `Round cap`: max 2 hardening kor ugyanarra a retegre (L1), utana dontes:
   - implement now, vagy
   - split task.
4. `No silent scope growth`: minden uj pontot cimkezni kell:
   - `required-now` vagy `later-hardening`.

## 6) Konkrett jatek szabaly docs-only taskokra

Kotelezo minimum blokk (template):
1. Policy (document vs code vs auto)
2. Call-site matrix (wrapper vs direct)
3. Primary/fallback flow
4. Type delta
5. Teszt matrix (incl. missing/invalid)
6. Rollback/fail-safe

Ami nincs ebben, az default "later-hardening", nem launch blocker.

## 7) Alkalmazas a mostani esetre

A referenciadoc (`doc-only-temporary-disable-runtime-checks-phase1.md`) jelenleg mar eros L1/L2 tartalommal bir.  
Javaslat innen:
1. Fagyasszuk le a "Phase1 minimum implementation set"-et.
2. Minden tovabbi pontositast kulon "hardening follow-up" taskba tegyunk.
3. A mostani docban jeloljuk explicit:
   - `required-now`,
   - `optional-hardening`.

Ezzel a minoseg megmarad, de megszunik a vege-nelkul specifikacios bovules.

## 8) Gyors bevezetes (operativ)

Kovetkezo hasonlo tasknal:
1. indulaskor hozzunk letre kulon `L0` es `L1` blokkot,
2. review feedbacket kotelezoen taggeljunk (`required-now` / `later-hardening`),
3. ket kor utan hard-stop dontes: implement vagy split,
4. minor pontositasok menjenek kulon memo/changelog blokkba.

## 9) Otletbank (ne vesszen el)

1. `Blocker vs Polish` kotelezo cimkezes minden feedbackre:
   - `required-now`
   - `later-hardening`

2. `2-koros plafon` az L1 hardeningre:
   - max 2 review kor ugyanarra a retegre,
   - utana kotelezo dontes: `implement now` vagy `split task`.

3. `Minimum Implementable Spec` sablon kotelezo blokkja:
   - policy,
   - call-site matrix,
   - primary/fallback flow,
   - type delta,
   - teszt matrix,
   - rollback/fail-safe.

4. `Spec budget` phase-enkent:
   - max touchpoint szam,
   - max kotelezo szekciohossz,
   - ami ezen tul van, megy hardening follow-upba.

5. `Change Contract` es `Implementation Notes` kulon fajlban:
   - contract = blocker szintu szerzodes,
   - notes = opcionlis tactical detail.

6. `Open Issues` szekcio kotelezo:
   - explicit lista a nem-blokkolo, kesobbre tolt pontokrol,
   - ne keveredjen a launch scope-ba.

7. `Single deep pass` review mod:
   - 1 korben gyujtse ossze az osszes P0/P1 issue-t,
   - ne incremental csepegtetes menjen.

8. `Completeness gate` implementacio inditas elott:
   - teljes call-site lista,
   - fallback-ek fedese,
   - negativ tesztek jelenlete.

9. `Spec lint` automata ellenorzes:
   - hianyzo wrapper/direct call-site lista,
   - hianyzo missing/invalid teszt eset,
   - hianyzo primary/fallback elvalasztas.

10. `Auto split rule`:
   - ha uj feedback uj reteg/fajlcsaladot nyit, automatikusan kulon follow-up task.

11. `ADR-lite` dontesnaplo:
   - rovid "miert" rekord a kulcsdontesekrol (guard, fallback, policy),
   - elkeruli ugyanazon vita ujranyitasat.

12. `Process metric` meres:
   - review korok szama,
   - blocker/polish arany,
   - hany kor utan stabil a spec.

### Javasolt elso pilot (3 lepes)

1. Kotelezo `required-now` cimkezes feedbackenkent.
2. `2-koros` L1 hardening cap.
3. `Minimum Implementable Spec` checklist gate implementacio elott.

---

Lenyeg: nem a sok review a gond, hanem a review celjanak (blocker vs polish) explicit szetvalasztasanak hianya. Ezt kell rendszeresiteni.
