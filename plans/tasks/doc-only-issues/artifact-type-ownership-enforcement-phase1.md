# Task: Artifact Type Ownership Enforcement (Phase 1)

## Context

A jelenlegi `review_artifact_type` modellben az `auto` default érték. Ez kényelmes, de ownership szempontból bizonytalan: docs-only és code-heavy bubble-k keveredhetnek, és a gate policy nem mindig a valós bubble szándékkal fut.

## Goal

Tegyük explicit felelőssé a bubble indítóját a típus kijelöléséért (`code` vagy `document`), és fokozatosan szorítsuk vissza az `auto` használatát.

## Scope

In scope:
1. `bubble create` folyamat explicit artifact type ownership policy-ja.
2. CLI/config viselkedés módosítása `auto` deprecálás irányba.
3. Backward-compatible átmeneti szabályok.
4. Dokumentáció és migrációs irányelvek.

Out of scope:
1. Meglévő bubble state-ek tömeges átírása.
2. Komplex ML/NLP alapú típusdetektáló rendszer.

## Proposed Policy

1. Új bubble létrehozáskor elvárt explicit típus: `--review-artifact-type code|document`.
2. `auto`:
   - Phase 1-ben még támogatott legacy érték, de warningot kap.
   - új policy szövegben nem ajánlott.
3. Docs-only felmentések kizárólag explicit `document` típushoz kötöttek.
4. `auto` bubble-k konzervatív (szigorúbb) policy-n maradnak.

## Implementation Notes / Approach

1. CLI:
   - `pairflow bubble create` opciók bővítése explicit `--review-artifact-type`.
   - ha hiányzik:
     - Phase 1 opció A: warning + jelenlegi infer/auto fallback,
     - Phase 1 opció B (szigorúbb): hard error.
2. Core create flow:
   - `createBubble` fogadja és validálja explicit artifact type inputot.
3. Config/default:
   - `DEFAULT_REVIEW_ARTIFACT_TYPE` hosszabb távon ne legyen `auto`.
4. Dokumentáció:
   - "bubble starter owns artifact type" szabály beemelése.

## Suggested Touchpoints

1. `src/cli/commands/bubble/create.ts`
2. `src/core/bubble/createBubble.ts`
3. `src/config/defaults.ts`
4. `src/config/bubbleConfig.ts`
5. `src/types/bubble.ts` (ha enum/policy text változik)
6. `tests/core/bubble/createBubble.test.ts`
7. `tests/config/bubbleConfig.test.ts`
8. `README.md` és/vagy kapcsolódó docs

## Acceptance Criteria

1. Bubble indításnál egyértelműen látszik, hogy az artifact type a starter döntése.
2. Explicit `document` és `code` típusok támogatottak és teszteltek.
3. `auto` használatára van egyértelmű transitional policy (warning vagy tiltás).
4. Docs-only felmentés explicit `document` típushoz kötött.
5. Legacy működésre van dokumentált átmeneti út.

## Test Plan

1. `createBubble`:
   - explicit `document` -> configban `document`.
   - explicit `code` -> configban `code`.
2. CLI:
   - `--review-artifact-type=document|code` helyes működés.
   - `auto` eset warning/legacy path a választott policy szerint.
   - hiányzó paraméter eset a választott policy szerint error vagy warning+fallback.
3. Backward compatibility:
   - meglévő `auto` config parse továbbra is működik Phase 1-ben.

## Migration / Breaking Change Note

1. Phase 1 cél szerint nem kötelező breaking change.
2. Ha strict módot választunk (explicit típus kötelező), azt külön rollout kommunikációval kell bevezetni.

## Open Decision

1. Phase 1-ben az explicit típus legyen-e azonnal kötelező (`hard error`) vagy először warningos átmenet?

