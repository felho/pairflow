# Task: Docs-Only Operational Decision Matrix + Rollout (Phase 1)

## Context

A technikai változtatások mellett operatív oldalon is kell egy egyszerű, determinisztikus szabályrendszer, hogy a csapat ugyanúgy kezelje a docs-only és code-heavy bubble-öket.

## Goal

Készítsünk rövid, végrehajtható decision matrixot és rollout tervet a docs-only validation policy átállásához.

## Scope

In scope:
1. Decision matrix definiálása.
2. Standard summary sablonok docs-only körre.
3. Bevezetési lépések és rollback terv.

Out of scope:
1. Teljes governance framework újraírás.
2. UI teljes policy designer.

## Decision Matrix (Target)

1. Docs-only + no runtime claim:
   - runtime check nem kötelező,
   - summary explicit jelzi: docs-only, runtime check not required.
2. Docs-only + explicit runtime claim:
   - claimet alátámasztó célzott evidence kötelező, különben claim tiltott.
3. Code change bubble:
   - meglévő test/typecheck policy változatlan.

## Rollout Plan

1. Step 1: ideiglenes docs-only runtime check requirement disable.
2. Step 2: summary/verifier consistency gate aktiválása.
3. Step 3: evidence source whitelist élesítése.
4. Step 4: claim-based validation design review (Phase 2 kickoff).
5. Step 5: utókövetés (incidensszám, átlagos approval körszám, false-blocker ráta).

## Metrics

1. Docs-only bubble-ök átlagos körszáma approval előtt.
2. Summary-vs-verifier mismatch események száma.
3. Evidence-related rework arány docs-only bubble-ökben.

## Acceptance Criteria

1. Van dokumentált, rövid decision matrix.
2. Van dokumentált rollout + rollback lépéssor.
3. Van legalább 3 mérőszám az utókövetéshez.
4. A policy explicit külön kezeli a docs-only és code bubble eseteket.

