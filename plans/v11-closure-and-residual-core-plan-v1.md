---
artifact_type: plan
artifact_id: plan_v11_closure_and_residual_core_v1
title: "v11 Closure And Residual Core Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: v11 Closure And Residual Core

## Objective

Lezarni a `v11` migraciot ugy, hogy:
1. a megtartott kod hosszu tavon a `src/v11/**` alatt eljen,
2. a `src/core/**` vegallapotban csak vekony shim vagy explicit, lejaro ideiglenes bridge legyen,
3. a maradek refaktorok ne command-by-command illuziok menten, hanem ownership szerint helyesitett sorrendben haladjanak,
4. a parity/contract/fitness vedelmek tovabbra is garantaljak, hogy a strangler atalakitas kozben a viselkedes ne valtozzon.

Ez a plan closure-es governance-jellegu. Nem uj feature roadmap, hanem a maradek `core`-eredetu ownershipek rendezesi terve.

## Background

Az eredeti `v11` motivacio nem pusztan annyi volt, hogy bizonyos command entrypointok uj mappaba keruljenek, hanem az, hogy az uj, minosegileg vedett boundary a `src/v11/**` legyen.

Ebbol ket kovetkezmeny adodik:

1. a migratednek tekintett lane-eknel nem eleg, hogy a CLI vagy facade `v11` alatt van, ha a tenyleges source of truth meg a `core`-ban maradt,
2. a maradek `core` kodot explicit kategoriak szerint kell kezelni, kulonben a projekt egy tartosan vegyes, nehezen olvashato allapotban ragad.

## Canonical Baseline

### 1. v11 mint target boundary

1. A megtartott alkalmazasi, domain-, shared- es infrastruktura-logika hosszu tavon `src/v11/**` alatt eljen.
2. A `src/core/**` nem a jovobeli feature-home.
3. A `src/core/**` vegallapotban csak:
   - vekony shim,
   - vagy explicit, lejaro ideiglenes bridge lehet.
4. Nincs implicit “retained core kernel” kategoriank.
5. Ha barmely `core` szeletet valaki tartosan meg akarna tartani, az kulon, explicit architekturadontest igenyel.
6. Ami a migracio soran feleslegesnek bizonyul, azt torolni kell, nem retained maradvanykent bent hagyni.

### 2. Placement governance

1. A `v11`-en beluli elhelyezest a kulon policy dokumentum szabalyozza:
   - [v11-placement-and-extraction-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-placement-and-extraction-governance.md)
2. Ez a plan arra epit, hogy:
   - `application` = orchestration/use-case boundary
   - `domain` = pure policy/derivation
   - `shared` = valoban tobb lane altal kozos boundary
   - `infrastructure` = retained technikai adapterek/primitivek

### 3. Minosegvedelmi baseline

1. A meglvo parity/contract/facade tesztek tovabbra is kotelezok a strangler-szeleteknel.
2. A jelenlegi fitness checkek a `v11` migrated scope minosegi guardrailjei maradnak.
3. Uj migrated szelet csak ugy tekintheto kesznek, ha:
   - parity bizonyitott,
   - a sajat uj boundaryjan is tesztelt,
   - es a canonical ownership tenylegesen `v11` alatt van.

## Residual Core Categories

A megmarado `src/core/**` szeleteket a kovetkezo kategoriak szerint kell kezelni.

### Category A: Thin shim

Definicio:

- a `core` fajl csak tovabbexportal `v11` source-of-truth implementaciot,
- sajat domain/orchestration ownershipe mar nincs.

Pelda:

- `restart`
- `reconcile`
- `open`
- `inbox`
- `create`
- `delete`

Kezeles:

- altalaban nem elsoseges refaktorcel,
- legfeljebb cleanup vagy naming-konvencio szinten erintendo.

### Category B: Explicit temporary bridge

Definicio:

- mar van `v11` ownership, de egy kis strangler-szelet meg ideiglenes adapteren vagy retained helperen keresztul fut.

Kezeles:

- megengedett, de cimkezett allapot,
- kulon removal triggerrel.

### Category C: Residual ownership still in core

Definicio:

- a `v11` lane mar reszben vagy teljesen letezik,
- de a canonical contract, result model vagy domain logic meg a `core`-ban lakik,
- emiatt a `v11` meg mindig a `core` ownershipre tamaszkodik.

Ez a legfontosabb closure-target.

### Category D: Retained low-level kernel/infrastructure

Definicio:

- alacsony szintu runtime/store/fs/git/tmux/archive/protocol jellegu modulok,
- amelyek nem command-entrypointok, hanem technikai primitivek.

Ez nem retained `core` vegallapot-kategoria. Ezek olyan infrastruktura-szeletek, amelyek meg nincsenek atmozgatva, de a target home-juk `src/v11/infrastructure/**`.

## Current Residual Core Assessment

### 1. Mostly closed / facade-level lanes

Jelenlegi allapot szerint ezek mar nagyrészt facade-jelleguek:

- `create`
- `delete`
- `open`
- `inbox`
- `restart`
- `reconcile`
- tobb korabbi human/runtime command

Ezeknel a hangsuly mar nem az “atvinni vagy sem”, hanem a placement governance betartasa az uj tovabbi extracteknel.

### 2. Residual ownership lane: meta-review

Ez a legfontosabb nyitott closure-lane.

Jelenlegi problemak:

1. a `metaReview` publikus command surface es a gate oldal mar nagyreszt `v11`-es,
2. de a canonical result/snapshot/recovery modell ownershipje meg a `core`-ban lakik,
3. a `v11` shared meta-review gate retege tobb helyen kozvetlenul `core` tipust fogyaszt,
4. emiatt a lane migratednek latszik, de ownership szinten nem teljes.

Kovetkezmeny:

- ez nem tisztan mechanikai command migration,
- hanem ownership refaktor.

### 3. Residual read-model lane: list

Jelenlegi problema:

1. a `list` olvaso modell a meta-review/runtime allapotmodell egy reszere tamaszkodik,
2. emiatt a `metaReview` ownership tisztazasa elott a `list` vegallapota nem teljesen stabil.

Kovetkezmeny:

- a `list` lane reszben mechanikai, de a helyes sorrend miatt a `metaReview` utan kovetkezzen.

### 4. Residual infrastructure/kernel lane

Ide tartoznak peldaul:

- runtime session/tmux/delivery/input primitivek,
- state/protocol/store primitivek,
- archive primitivek,
- egyeb retained technical helpers.

Nyitott kerdes mar nem az, hogy maradhatnak-e a `core`-ban, hanem az, hogy:

1. milyen konkret `src/v11/infrastructure/**` strukturaba keruljenek,
2. milyen sorrendben erdemes oket mozgatni,
3. melyik command/lane legyen az egyes primitivek migration triggerje.

## Open Questions

Az alabbi kerdesek meg mindig nyitottak, es ezeket a plan explicit kezeli.

### OQ1. Meta-review canonical contract shape

Meg kell mondani:

1. mi a meta-review canonical result/snapshot contract vegleges neve es ownershipje,
2. mely mezoek retainedek,
3. mely mezoek legacy maradvanyok,
4. ugyanazt a contractot hasznalja-e a submit es a recovery, vagy kettébontjuk.

Status:

- strategiai irany tiszta,
- a pontos vegleges contract shape meg nincs lockolva.

### OQ2. Meta-review live-run seam deletion order

Meg kell mondani:

1. elobb a contractot mozgatjuk ki a `core`-bol, es csak utana toroljuk a live-run seamet,
2. vagy a `runMetaReview` mar az elso closure-korben torolheto.

Status:

- valodi nyitott vegrehajtasi kerdes.

### OQ3. v11 infrastructure concrete topology

Meg kell mondani:

1. milyen csomagolasban jelenjen meg a `src/v11/infrastructure/**`,
2. commandonkent huzunk-e be retained primitiveket,
3. vagy capability-csoportonkent (tmux/state/protocol/archive/runtime-session).

Status:

- az architekturairany tiszta (`v11/infrastructure` kell),
- a vegrehajtasi topology meg nincs konkretizalva.

### OQ4. Migration map/closure semantics

Meg kell mondani:

1. mikor tekintunk egy lane-t tenylegesen “migrated”-nek,
2. eleg-e a facade-cutover,
3. vagy ownership-cutover kell.

Status:

- a plan ezt ownership-cutover alapu olvasat szerint ertelmezi,
- de ezt erdemes kulon is megerositeni a vegrehajtas soran.

## Non-Open Questions

Az alabbi pontokat ez a plan mar lezart baseline-kent kezeli.

1. A retained code target home-ja `src/v11/**`.
2. A `core` nem feature-home.
3. A `shared` nem helper-dump.
4. A `v11`-en beluli placementet a kulon governance dokumentum szabalyzza.
5. Ha a retained low-level kodot is atvisszuk, akkor annak home-ja `src/v11/infrastructure/**`.
6. A `src/core/**` hosszu tavu default vegallapota shim-only; a nem-shim retained `core` nem alapertelmezett cel.

## Recommended Work Order

### Phase 1: Closure baseline and low-risk residuals

Cel:

- a megmaradt residual lane-ek kozul a kisebb, keves ownership-drifttel jaro szeletek tisztazasa.

Jeloltek:

1. `attach` lane
2. egyeb kisebb, onallo read/projection/helper szeletek, ha vannak

Jelleg:

- tobbnyire mechanikai strangler munka

### Phase 2: Meta-review ownership closure

Cel:

- a `metaReview` canonical contract ownershipjenek kivetele a `core`-bol,
- a `v11`-nek a `core` meta-review contracttol valo fuggesenek megszuntetese.

Jelleg:

- ownership refaktor,
- nem pusztan mechanikai command migration.

### Phase 3: List/read-model closure

Cel:

- a `list` lane veglegesitese mar a megtisztitott meta-review/runtime projection mellett.

Jelleg:

- reszben mechanikai,
- de a helyes sorrend miatt a Phase 2 utan.

### Phase 4: Infrastructure migration planning and execution

Cel:

- retained low-level kernel/infrastructure primitivek athelyezese `src/v11/infrastructure/**` ala.

Jelleg:

- vegyes: reszben mechanikai, reszben package/topology dontes.

Ezt nem erdemes command-by-command improvizalni. Elobb capability-csoportok szerint kell konkretizalni.

## Proposed Task Split

1. `plans/tasks/v11-closure-attach-lane-phase1.md`
   - low-risk residual lane cleanup

2. `plans/tasks/v11-closure-meta-review-contract-phase2.md`
   - canonical meta-review contract ownership closure

3. `plans/tasks/v11-closure-meta-review-live-run-seam-phase2b.md`
   - `runMetaReview` deletion order/cleanup

4. `plans/tasks/v11-closure-list-read-model-phase3.md`
   - read-model closure after meta-review ownership resolution

5. `plans/tasks/v11-infrastructure-topology-and-migration-plan-phase4.md`
   - concrete `v11/infrastructure` topology

6. `plans/tasks/v11-infrastructure-runtime-primitives-phase4a.md`
7. `plans/tasks/v11-infrastructure-state-protocol-phase4b.md`
8. `plans/tasks/v11-infrastructure-archive-phase4c.md`

## Validation Strategy

1. Minden closure-szeletre kotelezo:
   - parity evidence,
   - sajat uj boundary teszt,
   - `pnpm typecheck`,
   - relevans fitness evidence a `v11` target scope-ra.

2. Ownership jellegu lane-eknel kulon ellenorzes kell arra, hogy:
   - a canonical contract valoban a `v11` ala kerult,
   - a `v11` mar nem a korabbi `core` ownershiptol fugg.

3. Infrastructure jellegu lane-eknel kulon ellenorzes kell arra, hogy:
   - a technikai adapter valoban `infrastructure` boundary lett,
   - nem keveredett vissza `application` vagy `shared` ownershipbe.

## Recommendation

1. A maradek munka nem kezelheto teljesen mechanikai command-migraciok sorozatakent.
2. Ketto kulon problemat kell szetvalasztani:
   - residual ownership closure (`metaReview`, `list`),
   - retained infrastructure migration (`runtime/state/protocol/archive/...`).
3. A kovetkezo konkret implementation target ne egy “meg egy command migration” legyen, hanem:
   - elobb `attach` mint low-risk closure-lane,
   - utana `metaReview` ownership closure,
   - es csak ezutan a `list` read-model closure.
