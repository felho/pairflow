# Task: Project-Level Command Profile vs Bubble Config (Reminder Draft)

## Status
- Date: 2026-03-09
- Owner: felho
- State: Draft reminder

## Context
Most a bubble creation során (vagy bubble configban) adjuk meg az olyan parancsokat, mint bootstrap/test/typecheck. Ez működik, de DX szempontból nem ideális, mert ezek tipikusan projekt-szintű policy-k, nem bubble-specifikus döntések.

Kapcsolódó task:
- `plans/tasks/repo-agnostic-validation-contract-phase1.md`

## Why this reminder exists
1. Csökkentsük a bubble create input terhét.
2. Kerüljük az ismétlődő/parciális config driftet bubble-önként.
3. Tegyük világossá a felelősségi szintet: projekt default vs bubble override.

## Draft Goal (later)
Vezessünk be elsődleges projekt-szintű command profile-t (bootstrap/lint/typecheck/test), amelyet a bubble örököl, és csak indokolt esetben ír felül bubble-szinten.

## Non-Goal (for now)
1. Ebben a taskban nincs implementáció.
2. Ebben a taskban nincs schema migration.
3. Ebben a taskban nincs UX/UI véglegesítés.

## Open Questions to resolve later
1. Mi legyen a canonical forrás: külön repo-szintű profile fájl vagy meglévő config kiterjesztése?
2. Mi legyen a precedence sorrend: bubble override > repo profile > fallback default?
3. Hogyan kezeljük a hiányzó commandot: fail/warn/skip policy milyen rétegen legyen deklarálva?
4. Hol legyen a `lint` végleges helye (külön commandként a contractban vagy composite verify scriptben)?

## Minimal Acceptance for this reminder
1. Legyen nyoma a backlogban, hogy ez külön kezelendő DX/projekt-szintű probléma.
2. Legyen explicit link a kapcsolódó repo-agnosztikus validation contract taskhoz.

## Suggested next step when prioritized
Készítsünk egy külön implementálható taskot a projekt-szintű command profile bevezetésére, kompatibilitási tervvel és explicit migration/fallback szabályokkal.
