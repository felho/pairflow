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
- teszt matrix es negatv esetek,
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

---

Lenyeg: nem a sok review a gond, hanem a review celjanak (blocker vs polish) explicit szetvalasztasanak hianya. Ezt kell rendszeresiteni.

