# Pairflow PASS Boundary Validation Hardening (Phase 1)

## Status
- Date: 2026-03-08
- Owner: felho
- State: Planned

## Context
A jelenlegi feedback loop túl későn jelezhet: implementer oldalon több fájlmódosítás után, hosszabb bubble kör végén derül ki, hogy a változás validation hibát okoz. A commit hook vagy CI erre csak másodlagos védelmi vonal, nem a legrövidebb ciklus.

## Problem Statement
A Pairflow flow-ban hiányzik egy determinisztikus, rendszer-szintű hard gate azon a ponton, ahol az implementer átadja a munkát (`pairflow pass`). Emiatt az átadás megtörténhet úgy is, hogy a projekt által elvárt checkek nem zöldek.

## Goal
Deterministic hard gate bevezetése az implementer `pairflow pass` boundary-n, ahol:
1. a futtatandó parancsot a projekt adja meg bubble configon keresztül,
2. sikertelen check esetén az átadás tiltott,
3. a hibaüzenet és az artifact egyértelműen mutatja a bukás okát.

## Non-Goals (Phase 1)
1. Nem cél pre-commit/pre-push git hookok bevezetése.
2. Nem cél GitHub Actions vagy branch protection policy módosítása.
3. Nem cél másodlagos, külön `converged` hard gate bevezetése.
4. Nem cél új agent hook API-ra építeni a működést.

## Scope
1. Csak `review_artifact_type=code` bubble-ökre vonatkozik.
2. Gate pont: implementer oldali `pairflow pass`.
3. Parancsforrás: bubble config `[commands]`.

## Proposed Solution

### 1) PASS előtti hard validation
`emitPassFromWorkspace` implementer ágban a rendszer futtatja a kötelező validation parancsokat még azelőtt, hogy PASS envelope transcriptbe kerülne.

### 2) Projekt által definiált command contract
A kötelező parancsokat a bubble config adja meg:
1. `commands.typecheck`
2. `commands.test`

Megjegyzés: ha a projekt lintet is kötelezővé akar tenni, composite scriptet adhat meg (például `pnpm pairflow:verify`, ami lint+typecheck+test).

### 3) Gate behavior
1. Ha bármelyik required command nem sikeres, a `pairflow pass` parancs hibával leáll.
2. Sikertelen gate esetén PASS envelope nem appendelődik.
3. Sikeres gate esetén a PASS normálisan folytatódik.

### 4) Determinisztikus diagnosztika
Gate bukáskor:
1. jól olvasható CLI hibaüzenet legyen a hibás commanddal és exit kóddal,
2. a meglévő evidence/log vonal használható maradjon (`.pairflow/evidence/*.log`),
3. reason code legyen stabilan géppel feldolgozható.

### 5) Docs és prompt guidance igazítás
Implementer guidance explicit mondja ki:
1. PASS előtt a gate automatikusan fut,
2. bukásnál előbb javítás, utána új PASS próbálkozás,
3. projekt-specifikus verify script használata támogatott.

## Change Surface
1. `src/core/agent/pass.ts` - implementer PASS előtti hard gate.
2. `src/core/reviewer/testEvidence.ts` - command decision/diagnosztika összehangolás.
3. `src/core/runtime/tmuxDelivery.ts` és kapcsolódó guidance - rövid, egyértelmű üzenetek.
4. `tests/core/agent/pass.test.ts` - gate success/fail flow.
5. `tests/core/reviewer/testEvidence.test.ts` - command/evidence contract regresszió.
6. releváns docs a gate viselkedésről.

## Acceptance Criteria
1. Code bubble-ben implementer `pairflow pass` futáskor a required commandok determinisztikusan lefutnak.
2. Bukó command esetén `pairflow pass` non-zero exitet ad és PASS envelope nem kerül transcriptbe.
3. Zöld commandok esetén `pairflow pass` normál handoffot végez.
4. A required commandok bubble configból jönnek, hardcode-olt repo-specifikus érték nélkül.
5. Composite verify script használat dokumentált és működik.
6. Új/érintett tesztek lefedik a pass/fail és command-forrás eseteket.

## Open Decisions
1. Több required command futtatása fail-fast vagy teljes lista futtatás legyen-e.
2. Gate parancsfuttatás timeout policy (default és override) pontos értéke.
3. A gate failure reason code készlet végleges nevei.

## Notes
Ez a task szándékosan a Pairflow boundary enforcementre fókuszál, nem repo-level git workflow hardeningre. A commit hook/CI továbbra is opcionális, másodlagos defense-in-depth réteg maradhat külön taskban.
