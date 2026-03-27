# M0 Core Components Follow-up Roadmap

Státusz: aktív  
Felelős: architecture + runtime  
Scope: M6 utáni stabilizáció és célzott továbbfejlesztés

Dátum: 2026-03-21

## 1) Dokumentum célja

Ez a dokumentum komponensenként mutatja meg:
1. hol tartunk most (`Current State`),
2. hova akarunk eljutni (`Target State`),
3. milyen lépésekben (`Step roadmap`) érdemes odáig menni,
4. mikor kell megállni (`Stop condition`),
5. és mikor kell továbbmenni (`Continue/Escalation condition`).

Fontos elv:
1. Nem cél a 100%-os központosítás minden áron.
2. Nem állunk meg túl korán sem.
3. Akkor állunk meg, amikor már nincs arányos, érdemi plusz érték a további kivonatban/centralizációban.

## 2) Egységes döntési szabály minden komponensre

### 2.1 Mikor "ready to stop"

1. A fő kockázat lefedett automatizált kontrollal (contract/fitness/integration).
2. A további kivonat várható nyeresége kisebb, mint a koordinációs és regressziós kockázata.
3. Nincs visszatérő hibaosztály, ami ugyanazon probléma ismételt, többhelyes javítását igényli.

### 2.2 Mikor "must continue"

1. Ugyanaz a hiba 2+ commandban külön javítást igényel.
2. Ugyanaz a policy/mutation/gate módosítás rendszeresen több fájlban történik.
3. A változtatási költség vagy incident-terhelés trendben romlik.

## 3) Komponensenkénti roadmap

### 3.1 `m0-01 BubbleMutationRunner`

1. Current State:
   - A mutation logika működőképes, de részben command-specifikus szeletekben él.
   - Vannak hasonló minták, amelyek még nem közösek.
2. Target State:
   - Közös mutation helper-réteg az ismétlődő mintákra.
   - Command-specifikus eltérések explicit hook/extension pontban maradnak.
3. Gap:
   - Duplikált mutation minták több helyen.
   - Egységesítés részben manuális.
4. Step roadmap:
   - Step 1 (kötelező): duplikált minta inventory + 1 alacsony kockázatú kivonat shared helperbe.
   - Step 2 (feltételes): további 1-2 stabil minta kivonata, ha ugyanaz a szabály több commandban jelenik meg.
   - Step 3 (opcionális): kicsi shared mutation kernel, csak ha Step 2 után is marad jelentős duplikáció.
5. DoD (aktuális ciklus):
   - Legalább 1 minta közös helperbe került.
   - Kapcsolódó contract/parity tesztek zöldek.
   - Nincs mutation-order regresszió.
6. Stop condition:
   - A megmaradt különbségek már valódi domain-eltérések, nem technikai duplikáció.
7. Continue/Escalation condition:
   - Ugyanaz a mutation bug 2+ commandban külön javítást kér.
8. Üzleti haszon:
   - Rövidebb javítási ciklusidő és kevesebb drift-javítás.

### 3.2 `m0-02 StateTransitionService`

1. Current State:
   - Központi transition API jelen van és használt.
   - Fitness/contract védelmek aktívak.
2. Target State:
   - Stabil, jól tesztelt transition szerződés minimális további átalakítással.
3. Gap:
   - Nincs kritikus strukturális gap; inkább fenntartási fókusz.
4. Step roadmap:
   - Step 1 (kötelező): transition regressziófigyelés fenntartása.
   - Step 2 (feltételes): célzott edge-case tesztbővítés, ha drift jel jelenik meg.
5. DoD (aktuális ciklus):
   - Nincs új transition-drift jelzés.
6. Stop condition:
   - Nincs ismétlődő policy-konfliktus vagy állapot-inkonzisztencia.
7. Continue/Escalation condition:
   - Párhuzamos transition policy-k eltérővé válnak üzleti indok nélkül.
8. Üzleti haszon:
   - Stabil állapotgép, alacsony regressziós költség.

### 3.3 `m0-03 ConvergencePolicyEngine`

1. Current State:
   - Policy logika domain/application határon izolált.
2. Target State:
   - Konzisztens policy viselkedés minden érintett commandban.
3. Gap:
   - Jelenleg nincs kényszerítő, nagy gap; monitorozási fókusz.
4. Step roadmap:
   - Step 1 (kötelező): policy-konzisztencia ellenőrzés új command eseteknél.
   - Step 2 (feltételes): közös policy validációs helper, ha divergens minták nőnek.
5. DoD (aktuális ciklus):
   - Nincs indokolatlan policy-divergencia.
6. Stop condition:
   - A policy viselkedés stabil és reprodukálható.
7. Continue/Escalation condition:
   - Ugyanarra a szabályra commandonként eltérő eredmény jelenik meg.
8. Üzleti haszon:
   - Kevesebb policy-incidens, kiszámítható döntési kimenet.

### 3.4 `m0-04 GatePipelineEngine`

1. Current State:
   - Gate logika több helyen él, részben hasonló mintákkal.
2. Target State:
   - Közös gate pipeline kernel legalább a stabil, ismétlődő szakaszokra.
3. Gap:
   - Többhelyes módosítási igény új gate/policy bevezetéskor.
4. Step roadmap:
   - Step 1 (kötelező): 1 commandon minimális gate-kernel POC parity/contract védelemmel.
   - Step 2 (feltételes): 1-2 további command átvétele, ha Step 1 mérhető költségcsökkenést ad.
   - Step 3 (opcionális): shared gate orchestration API, ha cross-command rollout rendszeresen drága.
5. DoD (aktuális ciklus):
   - 1 command teljes gate-útja közös kernelre kötött.
   - Nincs parity/contract regresszió.
   - 1 új gate szabály egy helyen konfigurálható.
6. Stop condition:
   - A maradék lokális ágak üzleti/specifikus kivételek, nem általános minták.
7. Continue/Escalation condition:
   - Továbbra is sok a többhelyes gate-módosítás ugyanarra a szabályra.
8. Üzleti haszon:
   - Gyorsabb gate rollout, alacsonyabb változtatási költség.

### 3.5 `m0-05 TranscriptStateReconciler`

1. Current State:
   - Reconcile/recovery logika jelen van, de ritkább operátori útvonal.
   - 2026-03-27: a reconcile report kapott strukturált stale-ok bontást (`reasonCounts`), és a CLI text output is mutatja az ok-összesítést, így az incidensjellegű runtime drift már nem csak nyers action-listaként látszik.
2. Target State:
   - Mért és kontrollált recovery útvonal, incidensfókuszú fejlesztéssel.
3. Gap:
   - Alacsony gyakoriság miatt limitált prioritás.
4. Step roadmap:
   - Step 1 (kötelező): reconcile incidensek strukturált logolása.
   - Step 2 (feltételes): célzott hardening csak növekvő incidensminta esetén.
5. DoD (aktuális ciklus):
   - Van látható metrika a reconcile eseményekről.
6. Stop condition:
   - Nincs emelkedő reconcile hiba- vagy gyakorisági trend.
7. Continue/Escalation condition:
   - Recovery/reconcile útvonal hibaaránya nő.
8. Üzleti haszon:
   - Oda fejlesztünk, ahol tényleg megtérül.

### 3.6 `m0-06 PairflowError boundary`

1. Current State:
   - Erősödött error normalizáció, de context konzisztencia még javítható.
2. Target State:
   - Kötelező minimum context-schema a fő error családokra.
3. Gap:
   - Triage lassulhat hiányzó/inkonzisztens context miatt.
4. Step roadmap:
   - Step 1 (kötelező): top 5 error-család schema audit + kötelező mezők.
   - Step 2 (feltételes): schema enforcement bővítése további családokra trend alapján.
5. DoD (aktuális ciklus):
   - Top 5 error-családnál kötelező mezők deklarálva.
   - Throw-boundary check zöld.
6. Stop condition:
   - "missing context" jellegű triage-esetek nem jelentősek.
7. Continue/Escalation condition:
   - Triage-ben visszatérő context-hiány.
8. Üzleti haszon:
   - Rövidebb MTTR, gyorsabb incident-feloldás.

2026-03-27 progress note:
- A top operációs error-családok (`start`, `restart`, `stop`, `reconcile`, `merge`) minimum context-sémát kaptak: az error objektum `context` mezőjében most kötelezően jelenik meg a `command_name`, akkor is, ha az eredeti hiba csak nyers stringként érkezett.
- Hozzáadva egy schema-audit regresszióteszt, ami ellenőrzi a minimum `command_name` jelenlétét, a parsed text-context megtartását és azt is, hogy a meglévő message-formátum közben változatlan maradjon.
- A `commit` error-család is bekerült ugyanebbe a minimum context-schema körbe, így a top operációs boundary audit ezen a batchen belül konzisztens lett.

### 3.7 `m0-07 MetricsDispatcher`

1. Current State:
   - Alap telemetry működik, edge-case stabilitás erősíthető.
   - 2026-03-27: explicit metrics edge-case tesztek kerültek a contention-feloldódás timeout előtti sikerére és a warning dedupe kulcs reason-szintű viselkedésére, hogy a retry/dedupe contract ne csak a `withFileLock` utility szintjén legyen lefedve.
2. Target State:
   - Megbízható retry/backoff/dedupe viselkedés kritikus útvonalakon.
3. Gap:
   - Dupla küldés vagy adatvesztés kockázata edge-case-ekben.
4. Step roadmap:
   - Step 1 (kötelező): 1 retry/backoff + 1 dedupe edge-case teszt.
   - Step 2 (feltételes): finomítás magas terhelési mintákhoz, ha mérés indokolja.
5. DoD (aktuális ciklus):
   - Új edge-case tesztek zöldek.
   - Nincs dupla-küldés regresszió.
6. Stop condition:
   - Stabil metrika minőség, nincs emelkedő dupla/vesztett esemény trend.
7. Continue/Escalation condition:
   - Metrikaelvesztés/duplázás trendben romlik.
8. Üzleti haszon:
   - Pontosabb döntéstámogatás és jobb prioritáskezelés.

### 3.8 `m0-08 ConfigLoader + TomlNormalizer`

1. Current State:
   - Alap precedence működik, de nehezen reprodukálható edge-case kockázat maradt.
   - 2026-03-27: a repo-level `enforcement_mode` normalizáció igazítva lett a bubble config viselkedéséhez (`all_gate=required` => `docs_gate=required`), és explicit regresszióteszt került a repo parserre, a bubble parserre és a `createBubble` öröklési útra.
   - 2026-03-27: explicit precedence-lock tesztek kerültek az `openBubble` és `attachBubble` utakra is, hogy bubble override esetén hibás globális config se próbálja felülírni vagy blokkolni a lokális döntést.
   - 2026-03-27: a globális és repo config parser korlátaihoz is került explicit regresszióteszt (`sections`, `dotted keys`, `duplicate keys`, `array-of-tables`, scalar-vs-section boundary), hogy a TOML normalizer határai ne legyenek implicit tudásra bízva.
2. Target State:
   - Kritikus config precedence útvonalak explicit regressziótesztekkel lefedve.
3. Gap:
   - Rejtett precedence-hiba esetén nagy üzemeltetési impact lehet.
4. Step roadmap:
   - Step 1 (kötelező): 3-5 célzott precedence edge-case teszt.
   - Step 2 (feltételes): policy/profile-specifikus bővítés, ha új drift látszik.
5. DoD (aktuális ciklus):
   - Új precedence tesztcsomag zöld.
   - Kritikus profilokon nincs drift.
6. Stop condition:
   - Config eredetű hibák alacsony szinten stabilizálódnak.
7. Continue/Escalation condition:
   - Precedence regressziók ismétlődnek.
8. Üzleti haszon:
   - Kevesebb nehezen diagnosztizálható runtime incidens.

### 3.9 `m0-09 AgentAdapter`

1. Current State:
   - Agent futás stabilabb, de restart/recovery és delivery edge-case-ek még erősíthetők.
2. Target State:
   - Magasabb önhelyreállási arány, kevesebb manuális operátori beavatkozás.
3. Gap:
   - Bizonyos hibatípusoknál még manuális recovery szükséges.
4. Step roadmap:
   - Step 1 (kötelező): restart-recovery + delivery-timeout explicit tesztek.
   - Step 2 (feltételes): timeout policy finomhangolás trendalapon.
5. DoD (aktuális ciklus):
   - 1 restart-recovery és 1 delivery-timeout eset tesztelve.
   - Manual intervention arány csökken.
6. Stop condition:
   - Recovery mutatók stabilak, manuális beavatkozás ritka.
7. Continue/Escalation condition:
   - Gyakori tmux/agent manuális recovery.
8. Üzleti haszon:
   - Folyamatosabb delivery flow, alacsonyabb operációs terhelés.

2026-03-27 progress note:
- Lezárva egy tmux delivery reason-mapping rés: explicit teszt és runtime guard biztosítja, hogy a non-zero `send-keys` write/submit hiba `tmux_send_failed` maradjon, ne mosódjon `delivery_unconfirmed` kategóriába.
- Hozzáadva restart cleanup regresszióteszt arra az esetre, amikor a korábbi tmux session és runtime registry ownership már eltűnt; a restart flow ilyenkor is továbblép és visszaadja a `false/false` cleanup állapotot.

### 3.10 `m0-10 LegacyCompatAdapter`

1. Current State:
   - Legacy kompatibilitás megvan, bővítés nem cél.
2. Target State:
   - Legacy footprint fokozatos csökkentése kockázat nélkül.
3. Gap:
   - Nincs sürgős gap; inkább kontrollált leépítés.
4. Step roadmap:
   - Step 1 (kötelező): maintenance + legacy touch csökkentési checklist.
   - Step 2 (feltételes): további leépítés, ha függőség és tesztfedezet engedi.
5. DoD (aktuális ciklus):
   - Nem nő a legacy kódtouch volumene.
6. Stop condition:
   - Legacy footprint stabilan csökken vagy legalább nem nő.
7. Continue/Escalation condition:
   - Legacy útvonal újra növekedni kezd.
8. Üzleti haszon:
   - Alacsonyabb hosszú távú fenntartási költség.

2026-03-27 progress note:
- A legacy CLI shim-felületre coverage guard került: a meglévő bubble CLI entrypoint parity tesztek most már explicit mappinggel ellenőrzik a teljes v11 `*CliCommand` halmazt, így új legacy export shim nem tud csendben parity-guard nélkül bekerülni.
- Hozzáadva a hiányzó `restart` és `reconcile` CLI entrypoint parity tesztek, hogy a jelenlegi shim-halmaz teljes legyen a coverage checkhez.

### 3.11 `m0-11 UseCaseOrchestrator`

1. Current State:
   - Stabil orchestrator contract, nem monolit struktúrában.
2. Target State:
   - Tartós ownership-határok és tiszta felelősségi modell.
3. Gap:
   - Folyamatos guardrail igény, hogy ne csússzon vissza közvetlen state/transcript írásba.
4. Step roadmap:
   - Step 1 (kötelező): ownership gate-ek fenntartása.
   - Step 2 (feltételes): további guardrail, ha határelmosódás jelei megjelennek.
5. DoD (aktuális ciklus):
   - Nincs ownership-sértő regresszió.
6. Stop condition:
   - Ownership-határok tartósan stabilak.
7. Continue/Escalation condition:
   - Visszatér a direkt state/transcript write minta.
8. Üzleti haszon:
   - Kevesebb koordinációs hiba és tisztább változtatási felelősség.

## 4) Prioritási sorrend (következő kör)

1. `m0-04 GatePipelineEngine` (legnagyobb várható költségcsökkentés).
2. `m0-06 PairflowError boundary` (MTTR csökkentés, gyors operációs nyereség).
3. `m0-01 BubbleMutationRunner` (drift és többhelyes javítások csökkentése).
4. Többi komponens trigger-first módban.

## 5) Programszintű "good enough" definíció

1. A komponensek többségénél a fő kockázat automatizáltan kontrollált.
2. A további centralizáció várható haszna nem haladja meg a bevezetési kockázatot.
3. Nincs visszatérő, több commandot érintő azonos hibaosztály, ami újabb shared kivonatot indokolna.

## 6) Review ritmus

1. Kétheti komponens-review: stop vagy continue döntés komponensenként.
2. Policy/migration-map változásnál kötelező roadmap frissítés.
3. Capacity váltásnál rövid decision-log bejegyzés.
