# Task: Docs-Only Claim-Based Validation Architecture (Phase 2)

## Context

A docs-only minőségbiztosítás akkor hasznos, ha a futtatás célzottan a dokumentumban tett futtatható claimeket validálja. A vak repo-level checkek ezt nem oldják meg.

## Goal

Definiáljunk és implementáljunk claim-alapú docs validation architektúrát, ahol csak a dokumentum konkrét, futtatható állításai kerülnek célzott ellenőrzésre.

## Scope

In scope:
1. Claim típusok formalizálása (`command_claim`, `snippet_claim`, `config_claim`).
2. Claim extraction és canonical representation.
3. Claim -> targeted check routing.
4. Eredmény visszacsatolás machine-readable formában.

Out of scope (Phase 2):
1. Teljes általános kódértelmezés minden nyelvre.
2. Nem determinisztikus, online függő snippet futtatás.

## Proposed Architecture

1. Claim parser:
   - dokumentumból explicit claim blokk/szintaxis alapján gyűjt.
2. Validation planner:
   - claimenként kiválaszt célzott checket.
3. Executor:
   - sandboxolt futtatás, explicit timeout és exit policy.
4. Evidence emitter:
   - claim-ID kötött log/artifact output.
5. Gate integration:
   - summary claim csak corresponding claim result alapján állítható.

## Suggested Touchpoints

1. új modul: `src/core/reviewer/docClaimValidation.ts`
2. `src/core/reviewer/testEvidence.ts` (integration boundary)
3. `src/core/agent/pass.ts`
4. `src/core/agent/converged.ts`
5. docs/spec frissítés

## Acceptance Criteria

1. Docs-only claim nélküli körben nincs felesleges runtime check.
2. Claimes docs-only körben célzott check fut, nem vak teljes repo-check.
3. Claim státuszok machine-readable artifactban elérhetők.
4. Summary claim-ek és claim artifact státuszok konzisztensen enforced.

## Test Plan

1. Claim nélküli docs input -> no targeted check.
2. Egyszerű command claim -> targeted command execution + log.
3. Sikertelen claim check -> summary claim blokkolás.
4. Több claim esetén részleges siker/hiba helyes aggregációja.

