# Workflow Quality Gates Hardening (Phase 1)

## Status
- Date: 2026-03-04
- Owner: felho
- State: Planned

## Context
A közelmúltban nagy mennyiségű lint hiba egyszerre jelent meg, ami arra utal, hogy a repository jelenlegi munkafolyamata nem kényszeríti ki konzisztensen a "lint/typecheck/test zöld" állapotot commit/push/merge előtt.

## Goal
Megbízható, hosszú távon fenntartható quality gate lánc bevezetése, amely:
1. korán jelzi a hibát (lokálisan),
2. merge előtt kötelezően blokkol,
3. csökkenti az új lint debt visszakerülésének esélyét.

## Non-Goals (Phase 1)
1. Nem cél az összes meglévő flaky teszt teljes megszüntetése ebben a fázisban.
2. Nem cél az összes workflow teljes újratervezése.

## Proposed Workflow

### 1) Pre-commit gate (gyors)
- Eszköz: `husky` + `lint-staged`.
- Hatókör: csak staged fájlok.
- Cél: gyors, alacsony latency visszajelzés commit előtt.
- Elvárt viselkedés: lint hiba esetén commit blokkol.

### 2) Pre-push gate (erősebb lokális gate)
- Eszköz: `husky` pre-push hook.
- Kötelező parancsok:
  - `pnpm lint`
  - `pnpm typecheck`
- Opcionális (repo döntés): `pnpm test`.
- Elvárt viselkedés: push blokkol, ha bármelyik check bukik.

### 3) CI gate (forrásigazság)
- Platform: GitHub Actions.
- Trigger: minden push és PR.
- Kötelező parancs: `pnpm check`.
- Elvárt viselkedés: CI bukás esetén merge tiltva.

### 4) Branch protection policy
- `main` branchen required checks kötelezőek.
- Merge csak zöld CI esetén.
- Közvetlen push policy a csapat döntése szerint (ajánlott: korlátozott).

### 5) Flaky test policy
- Kötelező gate-ben csak stabil tesztek maradjanak.
- Ismert flaky tesztek:
  - külön quarantine/non-blocking job,
  - vagy timeout/tesztkód stabilizálás,
  - majd visszaemelés kötelező gate-be.

## Rollout Plan

### Step 1
- Husky + lint-staged bevezetése.
- Pre-commit hook aktiválása.

### Step 2
- Pre-push hook bevezetése (`lint` + `typecheck`).

### Step 3
- CI workflow létrehozása `pnpm check` futtatással.

### Step 4
- Branch protection bekapcsolása required CI checkkel.

### Step 5
- Flaky tesztek listázása, quarantine stratégia dokumentálása.

## Acceptance Criteria
1. Commit előtt staged lint hibák blokkolják a commitot.
2. Push előtt lint/typecheck hibák blokkolják a push-t.
3. PR merge nem lehetséges bukó `pnpm check` CI mellett.
4. Dokumentált flaky policy létezik és alkalmazható.

## Open Decisions
1. Pre-push-ba bekerüljön-e kötelezően a teljes `pnpm test`.
2. Branch protection közvetlen push tiltásának szintje.
3. Flaky tesztek quarantine mappája és naming szabálya.

## Notes
- A fázis célja a folyamat megbízhatóságának növelése minimális operatív súrlódással.
- Ahol lehet, gyors lokális feedback + szigorú CI kombinációt érdemes preferálni.
