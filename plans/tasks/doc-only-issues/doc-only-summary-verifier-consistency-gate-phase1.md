# Task: Docs-Only Summary/Verifier Consistency Hard Gate (Phase 1)

## Context

Visszatérő hiba volt, hogy human summary "tests pass / typecheck clean" állítást tartalmazott, miközben a machine verifier `untrusted` állapotot jelzett. Ez approval ping-pongot és bizalomvesztést okozott.

## Goal

Vezessünk be hard konzisztencia szabályt: docs-only körben sem kerülhessen approval summary-ba olyan validation claim, amelynek machine státusza nem konzisztens.

## Scope

In scope:
1. Validation claim detektálás summary szövegben.
2. Claim-vs-status gate az approval előtti ponton.
3. Egységes hibaüzenet/diagnosztika, ha ellentmondás van.

Out of scope:
1. Teljes NLP-alapú claim parsing.
2. Teljes UI redesign.

## Proposed Behavior

1. Ha summary test/typecheck sikert állít, de verifier státusz nem kompatibilis, az approval path blokkol.
2. Docs-only summary ajánlott standard mező:
   - `validation_mode=docs_only`
   - `runtime_checks_not_required=true`
3. Ha nincs runtime claim, docs-only módban ne legyen verifier-claim mismatch blocker.

## Suggested Touchpoints

1. `src/core/agent/converged.ts`
2. `src/core/agent/pass.ts`
3. `src/core/reviewer/testEvidence.ts`
4. `src/core/ui/presenters/bubblePresenter.ts` (ha status surface szükséges)

## Acceptance Criteria

1. Nem lehetséges olyan approval summary, amely "tests/typecheck clean" claimet tesz, miközben verifier állapot ezt nem támasztja alá.
2. Docs-only, claim nélküli handoff nem esik fake mismatch blockerbe.
3. A gate reason code auditálható.
4. Van regressziós teszt a korábbi ellentmondás mintára.

## Test Plan

1. Positive: claim + trusted verifier => átmegy.
2. Negative: claim + untrusted/missing verifier => blokkol.
3. Docs-only claim nélküli summary => átmegy.

