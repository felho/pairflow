# Reviewer Atadasi Inkonzisztenciak - Uzleti Hatas es Javitasi Terv

**Datum:** 2026-03-21  
**Statusz:** Historical baseline rogzitve + aktualis policy alignment (2026-03-22)  
**Tulajdonos:** Pairflow core

## 1. Vezetoi Osszegzes

Az utolso buborekok review loop adatai alapjan a problema nem egyetlen okra vezetheto vissza.

Ket, egymast erosito hibat latunk:
1. Reviewer oldali parancshivas ingadozas (rossz flag, hianyzo mezo, elso probas command hiba).
2. Contract-szintu korlat a `converged` utvonalon: nyitott finding emlitheto summary-ban, de strukturalt findingkent nem mindig jelenik meg.

Uzleti szinten ez azt eredmenyezi, hogy a rendszer egyes korokben "konvergens" allapotot jelez, mikozben a narrativ allapot es a strukturalt metrika nincs osszhangban.

### Historical baseline vs aktualis policy

1. A fenti inkonzisztencia-leiras historical baseline: a 2026-03-21 elotti allapotot dokumentalja.
2. Aktualis (Phase 1) routing policy:
   - blocker -> `pairflow pass --finding`
   - advisory (`P2/P3`) -> `pairflow converged --finding`
   - clean -> `pairflow converged` (`--finding` nelkul)
3. Aktualis tiltott mintak:
   - summary-only finding allitas structured `--finding` nelkul,
   - `clean/no findings` allitas structured finding payload mellett.
4. Terminology lock: `--finding` az egyetlen elfogadott flag-nev; `--advisory-finding` nem hasznalhato.

## 2. Milyen uzleti problemat okoz

1. **Pontatlan allapotkep a donteshez**  
A review allapotrol kapott kep nem mindig egyertelmu. Egyes esetekben a szoveges osszegzes kockazatot jelez, de a strukturalt adatok mar "0 nyitott finding" allapotot mutatnak.

2. **Bizalomvesztes a review folyamatban**  
Ha a csapat azt latja, hogy a summary es a finding lista ellentmond, akkor a pipeline megbizhatosaga kerdojelesse valik, es no az emberi kontroll igenye.

3. **Rossz priorizalas es kapudontes-kockazat**  
A merge/approve ponton hamis "kesz" erzet allhat elo. Ez release kockazatot okoz, foleg ha advisory vagy P2/P3 jelzesek elvesznek a strukturalt oldalon.

4. **Felesleges ciklusido es koltseg**  
Az elso koros parancshibas mintak miatt extra korok es manualis ujraprobalasok jelennek meg. Ez lassitja az atfutast es novelheti az agent koltseget.

## 3. Mi tortenik valojaban (nem-technikai nyelven)

1. A reviewer szandeka sokszor helyes: jelezni akarja a tenyleges allapotot.
2. Az atadasi "csatorna" viszont ket kulon logikara oszlik (`pass` vs `converged`), es ez nem minden esetben hordozza ugyanazt az informacioszintet.
3. Emiatt ugyanabban a korben a "mit mondunk" (summary) es a "mit merunk" (structured finding metadata) elcsuszhat egymastol.

Kovetkezmeny: nem biztos, hogy rossz a reviewer itelet, de a vegponti allapot megjelenitese ettol meg inkonzisztens lehet.

## 4. Gyokerokok (uzleti nezetbol)

1. **Folyamat-design hianyossag**  
A ket atadasi utvonal nem azonos adatminoseget kenyszerit ki.

2. **Iranyitasi hianyossag a prompt-szinten**  
Nincs eleg eros, rogzitett dontesi szabaly arra, mikor milyen parancsot kell hasznalni, es milyen minimum adatnak kotelezo szerepelnie.

3. **Minosegbiztositasi hianyossag transcript szinten**  
Nincs fail-closed ellenorzes arra, hogy a summary allitasai es a finding metadata konzisztens-e.

4. **Uzemi megbizhatosagi hianyossag**  
External command eleresi ingadozasok (pl. PATH/fallback) novelik a hibalehetoseget es a zajt.

## 5. Javitasi Terv (celzott, rovid, vegrehajthato)

### Phase 1 - Contract Stabilizalas (gyors nyereseg, alacsony kockazat)

1. **Atadasi contract egysegesitese**  
Definialjuk egyertelmuen, hogy melyik utvonal milyen allitast tehet a summary-ban.

2. **Converged guardrail**  
Ha a summary nyitott findingot allit, a rendszer ne engedje csendben konverged allapotba a kort strukturalt egyezes nelkul.

3. **CLI validacio erosites**  
Rovid, direkt hibauezenetekkel blokkoljuk az ellentmondasos bemenetet mar command szinten.

### Phase 2 - Prompt es Operacios Fegyelem

1. **Reviewer prompt hardening**  
Explicit dontesi fa: mikor `pass`, mikor `converged`, es mi a kotelezo minimum tartalom.

2. **Atadasi mintak standardizalasa**  
Adjunk 2-3 "jo pelda" command sablont, hogy csokkenjen a first-try hiba.

3. **Fallback viselkedes tisztazasa**  
Standard self-host command preferencia, hogy a reviewer ne ingadozzon external path es fallback kozott.

### Phase 3 - Transcript Minosegkapu

1. **Summary vs metadata konzisztencia check**  
Automatikus ellenorzes a transcript append vagy approval elott.

2. **Fail-closed policy**  
Ellentmondasnal ne mehessen tovabb a flow csendben; kerjen explicit ujra-atadast.

3. **Metrika tisztitas**  
Kulon jelzes a "narrativ nyitott risk" es a "structured open finding" elteresre, hogy ne legyen hamis zold allapot.

## 6. Meresi Keret (hogyan latjuk, hogy jobb lett)

1. `summary_finding_contradiction_rate`  
Celpont: 2 heten belul legalabb 80% csokkenes.

2. `first_try_pass_converged_success_rate`  
Celpont: legalabb +25% javulas.

3. `manual_rework_due_to_transfer_error`  
Celpont: merhetoen csokkeno trend 2 sprinten belul.

4. `false_clean_signal_count`  
Celpont: 0 tolerancia kritikus lane-en.

## 7. Varhato Uzleti Eredmeny

1. Jobb vezetoi dontesminoseg a merge/approve kapuknal.
2. Nagyobb bizalom a review pipeline jelzeseiben.
3. Kisebb zaj es alacsonyabb review-loop koltseg.
4. Atfutasi ido javulasa extra korok nelkul.

## 8. Dontesi Javaslat

Javasolt dontes: **Phase 1 + Phase 2 azonnali inditasa**, Phase 3 pedig ugyanebben a release ciklusban.

Indok:
1. A problema mar most is merheto uzleti kockazatot okoz.
2. A javitas fokozatosan, visszafele kompatibilisen bevezetheto.
3. A legnagyobb hatas kis-kozepes implementacios raforditassal elerheto.

Megvalositas allapot frissites (2026-03-22):
1. Phase 1 reviewer guidance routing matrix explicititve.
2. Historical mismatch baseline-kent megorizve, aktualis policy kulon megjelolve.

## 9. Scope Clarification

Ez a dokumentum az alabbi kerdesre valaszol:
- Miert latunk summary es structured finding elterest egyes bubble review korokben?
- Hogyan kell ezt folyamat-, contract- es metrika-szinten megszuntetni?

Nem celja:
- Teljes architektura-atiras.
- Uj review modell bevezetese a jelenlegi lane-ek felett.

## 10. Forras es Bizonyitasi Alap

Az ertekeles alapja:
1. Az utolso, relevans bubble korok transcript es state adatai.
2. A reviewer pass/converged session futasok command-szintu attekintese.
3. A session-oldali hibamintak (hianyzo mezo, rossz flag, fallback mintak) osszevetese a vegso metadata allapottal.
