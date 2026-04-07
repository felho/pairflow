---
artifact_type: plan
artifact_id: plan_fitness_check_hardening_v1
title: "Fitness Check Hardening Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Fitness Check Hardening

## Objective

Megerositeni az architecture fitness checkeket ugy, hogy:
1. a checker-rendszer ne csak tiltott import-eleket es egyszeru syntax mintakat figyeljen,
2. a dependency fitness ne legyen kijatszhato vekony wrapperrel, re-exporttal vagy rossz placementtel,
3. az explicit `ports` modell valos architekturalis boundarykent megjelenjen a checkerben is,
4. a `critical_side_effect` checker ne csak gyenge presence-check legyen, hanem erosebb szemantikai guardrail,
5. a dokumentacio, a policy es a tenyleges implementacio ujra osszhangba keruljon.

Ez a plan nem Pairflow-spec jellegu delivery task. Kifejezetten checker/policy hardening roadmap, bounded implementacios batch-ekkel.

## Current Baseline

### 1. Canonical docs

Az aktualis policy baseline most ezekben a dokumentumokban van rogzitve:

1. [architecture-fitness-checks.md](/Users/felho/dev/pairflow/docs/architecture/architecture-fitness-checks.md)
2. [v11-ports-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-ports-governance.md)
3. [v11-placement-and-extraction-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-placement-and-extraction-governance.md)

### 2. Effective implementation posture

Jelenleg minden policyban szereplo checkhez van futtathato runner a `tools/fitness/checks/**` alatt, de az erettseguk nem egyforma.

Kulonosen fontos:

1. a `dependency` check jelenleg AST-alapu importgrafot epit, de a layer modellt meg nem a dokumentalt `shared/ports/**` szemantikaval kezeli,
2. nincs anti-circumvention rule,
3. nincs ownership-type checking,
4. a `critical_side_effect` check jelenleg szuk command-matrixra es evidenciakeresesre epit, ezert hasznos, de meg konnyen kijatszhato.

### 3. Why this work matters

Ha a checker csak a felszint ellenorzi, akkor a csapat nagyon konnyen a szabaly kijatszasara optimalizal:

1. tiltott importel eltunik,
2. a kod atkerul `shared` ala,
3. de a szemantikai ownership ugyanugy infrastruktura vagy egyeb rossz helyen marad.

Ez pont az a viselkedes, amit a hardeningnak meg kell eloznie.

## Design Baseline

### 1. Keep the current layer rule

Ez marad:

1. `application -> infrastructure` tiltott,
2. `application -> application/domain/shared` megengedett,
3. a dependency checker tovabbra is elso vedovonal marad.

### 2. Explicit ports model

A `ports` nem checker-trukk, hanem valos architekturalis boundary.

Working default:

1. a kanonikus helye `src/v11/shared/ports/**`,
2. az `application` capability contractot importalhat innen,
3. az `infrastructure` implementalja,
4. a `ports` modul nem lehet infra-wrapper.

### 3. Anti-circumvention rule

Kulon finding kell arra, ha valaki:

1. `shared/**` ala re-exportal egy infra adaptert,
2. `shared/ports/**` ala tesz egy 1:1 forwardert,
3. egy szemantikailag infrastrukturat egyszeruen atparkol `shared` ala.

### 4. Ownership-type signals

Bizonyos kodmintak eros infrastruktura-jelolesnek szamitanak:

1. `node:fs` vagy egyeb file persistence,
2. child process / git / tmux / process execution,
3. lockok,
4. runtime session access,
5. state vagy transcript persistence,
6. storage-backed registry.

Ezeket a checkernek legalabb report-only szinten eszre kell vennie.

### 5. Critical side-effect semantics

A side-effect checkernek hosszu tavon nem eleg azt nezni, hogy:

1. volt-e adapterhivas,
2. vagy volt-e egy `delivery` result field.

Szukseges:

1. commandonkenti explicit invariant matrix,
2. success/failure shape ellenorzes,
3. silent no-op jellegu regressziok kiszurese.

## Phase Breakdown

| Phase | Goal | Deliverable | Initial Rollout |
|---|---|---|---|
| P1 | Dependency checker ports-aware layer model | `dependency.ts` path-aware layer classification | hard-fail parity with existing rule set |
| P2 | Dependency anti-circumvention | uj findingok wrapper/re-export camouflage-ra | report-only / soft-fail |
| P3 | Dependency ownership-signal detection | report-only infra-signal findingok `shared/**` alatt | report-only |
| P4 | Critical side-effect command matrix | explicit command->invariant konfiguracio | hardening, de eloszor current scope parity |
| P5 | Critical side-effect semantic strengthening | success/failure/no-silent-drop ellenorzesek | soft-fail, majd hard-fail |
| P6 | Policy + CI alignment | `policy.json`, docs, rollout modes, checker tests | final alignment |

## Execution Backlog

## Batch 1: Dependency Ports-Aware Layer Model

### Goal

A checker ertse a dokumentalt `src/v11/shared/ports/**` modellt.

### Changes

1. A jelenlegi first-segment layer logikat ki kell valtani explicit path-kategorizalassal.
2. Kulon kategoriak:
   - `application`
   - `domain`
   - `shared`
   - `shared-ports`
   - `infrastructure`
   - `legacy-compat`
3. Ennek megfelelo allowed-edge matrix kell.

### Acceptance

1. `application -> shared-ports` megengedett.
2. `shared-ports -> infrastructure` tiltott.
3. `infrastructure -> shared-ports` megengedett.
4. A checker mar nem top-level `ports` layerre epit.

### Tests

1. [dependency.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/dependency.test.ts)
2. szukseg szerint [checksIndex.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/checksIndex.test.ts)

## Batch 2: Dependency Anti-Circumvention v1

### Goal

Kapja el a nyilvanvalo architektura-camouflage mintakat.

### Changes

1. `shared/**` direct infra re-export finding
2. `shared/ports/**` direct infra import + tovabbitas finding
3. egyszeru 1:1 forwarding wrapper finding

### Acceptance

1. A nyilvanvalo megkerulesek kulon violationkent latszanak.
2. Nem keverednek ossze a sima forbidden-layer findingokkal.

### Tests

1. uj anti-circumvention blokkok a [dependency.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/dependency.test.ts)-ben

## Batch 3: Dependency Ownership-Signal Report

### Goal

Legyen lathato, ha valami szemantikailag infra-gyanus `shared/**` ala kerult.

### Changes

1. Heurisztikus capability-signal scanner
2. uj finding tipus `shared` alatti infra-signals esetere
3. kezdetben csak report-only rollout

### Acceptance

1. A findingok kulon, nem blokkolo kategoriakent jelennek meg.
2. Nem hamisitjuk vele a klasszikus layer checket.

### Tests

1. uj ownership-signal blokkok a [dependency.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/dependency.test.ts)-ben

## Batch 4: Critical Side-Effect Command Matrix

### Goal

A checker explicit command-matrixbol dolgozzon, ne csak implicit mintakeresesbol.

### Changes

1. command -> relevant adapter mapping
2. command -> elfogadott explicit failure/result mapping
3. a jelenlegi seed command set formalizalasa:
   - `kickoff`
   - `pass`
   - `converged`
   - `approval`
   - `reply`
   - `askHuman`

### Acceptance

1. A command coverage explicit konfiguraciobol kovetheto.
2. A checker mar nem "varazslatos" regexp/evidence halmaz.

### Tests

1. [criticalSideEffect.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/criticalSideEffect.test.ts)

## Batch 5: Critical Side-Effect Semantic Hardening

### Goal

Ne csak evidence-jelenletet, hanem konzisztens side-effect szemantikat ellenorizzen.

### Changes

1. success-path side-effect expectation
2. explicit failure-path result expectation
3. silent no-op detection
4. adapter/result shape konzisztencia

### Acceptance

1. Nem eleg egy tetszoleges mezonev a checker "atveresehez".
2. A szabaly command-szinten ertelmes regressziokat fog.

### Tests

1. [criticalSideEffect.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/criticalSideEffect.test.ts)
2. ha kell, kapcsolodo CI/policy tesztek

## Batch 6: Policy And CI Alignment

### Goal

Az uj findingok, rollout modok es checker-status viselkedes osszhangban legyenek.

### Changes

1. `tools/fitness/policy.json` finomitas
2. `fitnessCheckCi` behavior alignment
3. doksi update, ha a tenyleges implementacio pontositja a policyt

### Acceptance

1. A rollout modok tudatosak es teszteltek.
2. A doksi nem allit mast, mint amit a checker tenyleg tud.

### Tests

1. [policy.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/policy.test.ts)
2. [fitnessCheckCi.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/fitnessCheckCi.test.ts)
3. [checksIndex.test.ts](/Users/felho/dev/pairflow/tests/tools/fitness/checksIndex.test.ts)

## Suggested Implementation Order

1. Batch 1
2. Batch 2
3. Batch 3
4. Batch 4
5. Batch 5
6. Batch 6

Miért ez a sorrend:

1. eloszor a dependency checkernek kell erteni a celarchitekturat,
2. utana lehet vedeni a megkerulesek ellen,
3. csak azutan erdemes ownership-signalt bevezetni,
4. a side-effect hardening ettol fuggetlen, de architekturailag masik csalad,
5. a rollout tuning csak a konkret implementacio utan legyen vegleges.

## Progress Tracking

### Current status

- Docs baseline frissitve:
  - [architecture-fitness-checks.md](/Users/felho/dev/pairflow/docs/architecture/architecture-fitness-checks.md)
  - [v11-ports-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-ports-governance.md)
  - [v11-placement-and-extraction-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-placement-and-extraction-governance.md)
- Implementacios audit megtortent.
- Batch 1 kesz:
  - a dependency checker mar kulon kezeli a `shared/ports/**` reteget mint `shared-ports`
  - `application -> shared-ports` engedett
  - `shared-ports -> infrastructure` tiltott
  - `infrastructure -> shared-ports` engedett
- Batch 2 kesz:
  - a dependency checker kulon anti-circumvention findingot ad a nyilvanvalo
    `shared/**` infra re-exportokra
  - kulon findingot ad a nyilvanvalo `shared/ports/**` thin forwarding
    wrapper mintakra
- Batch 3 kesz:
  - report-only ownership-signal warningot ad `shared/**` es
    `shared/ports/**` alatti eros infra-jelekre
  - a findingok nem blokkoloak, de a rossz placementet lathatova teszik
- Batch 4 kesz:
  - a `critical_side_effect` checker mar explicit command-invariant
    definiciokbol dolgozik
  - a seed command set mar nem szetszort konstansokra, hanem
    formalizalt matrix-szeru definiciora epul
- Kovetkezo vegrehajtasi kor: Batch 5.

### Progress checklist

- [x] Canonical docs baseline letrehozva
- [x] Docs vs implementation audit megtortent
- [x] Batch 1 complete
- [x] Batch 2 complete
- [x] Batch 3 complete
- [x] Batch 4 complete
- [ ] Batch 5 complete
- [ ] Batch 6 complete

## Risks And Guardrails

1. Risk: a dependency checker tul agressziv lesz es sok false positive-ot gyart.
   Mitigation: anti-circumvention es ownership signal elso korben ne egybol hard-fail legyen.

2. Risk: a `ports` modell koran tulbonyolodik.
   Mitigation: eloszor csak a dependency checker path-aware modelljet es alapszabalyait vezessuk be.

3. Risk: a side-effect checker tul sok command-specifikus kivetelet hord be.
   Mitigation: explicit command matrix + bounded seed command set.

4. Risk: a doksi ujra elore szalad az implementaciohoz kepest.
   Mitigation: minden batch utan vissza kell nezni a docs/policy/checker harmast.

## Definition Of Done

Ez a terv akkor tekintheto lezarhatonak, ha:

1. a dependency checker tenylegesen erti a `shared/ports/**` modellt,
2. van legalabb egy mukodo anti-circumvention finding tipus,
3. van legalabb report-only ownership-signal finding tipus,
4. a `critical_side_effect` checker command-matrixra es erosebb szemantikaira tamaszkodik,
5. a checker-tesztek lefedik az uj szabalyokat,
6. a doksi, a policy es az implementacio ugyanazt a mentalis modellt kepviseli.
