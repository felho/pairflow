# Task: Docs-Only Runtime Check Requirement Temporary Disable (Phase 1)

## Context

A közelmúltbeli docs-only bubble körökben a `pnpm test` / `pnpm typecheck` futtatások többsége nem a dokumentumban állított konkrét futtatható claimet validálta, hanem általános repo/subproject check volt. Ez alacsony jelérték mellett magas operatív zajt és gate-inkonzisztenciát okozott.

## Goal

Ideiglenesen kapcsoljuk ki a docs-only bubble-kben a kötelező runtime check követelményt, hogy megszűnjenek a nem értelmes újrafuttatási körök.

## Scope

In scope:
1. Docs-only (`review_artifact_type=document`) esetben a kötelező test/typecheck expectation kikapcsolása.
2. Reviewer irányelvek és runtime kickoff üzenetek frissítése docs-only módra.
3. Dokumentáció frissítés a temp policy-ról.

Out of scope:
1. Claim-alapú célzott check pipeline teljes implementációja.
2. Markdown code snippet automatikus futtatás.

## Proposed Behavior

1. Ha bubble `review_artifact_type=document`, az orchestrator ne várjon kötelezően `pnpm test`/`pnpm typecheck` evidence-t.
2. Docs-only handoff summary alapértelmezett formulája:
   - "docs-only scope, runtime checks not required in this round".
3. Ha mégis futott check, az opcionális evidence-ként kezelendő.

## Suggested Touchpoints

1. `src/core/reviewer/testEvidence.ts`
2. `src/core/runtime/tmuxDelivery.ts`
3. `src/core/bubble/startBubble.ts`
4. `README.md` vagy releváns docs

## Acceptance Criteria

1. Docs-only bubble esetén check hiány miatt nem keletkezik automatikus blocker.
2. Reviewer kickoff message docs-only módban nem követel kötelező runtime checket.
3. Nem docs-only bubble-ök jelenlegi működése változatlan.
4. Van célzott teszt docs-only és code artifact típusra is.

## Test Plan

1. Unit teszt: docs-only bubble check nélkül sem forcing `run_checks`.
2. Unit teszt: code bubble esetén megmarad a check expectation.
3. Prompt/delivery teszt: reviewer directive docs-only módban "runtime checks optional/not required".

