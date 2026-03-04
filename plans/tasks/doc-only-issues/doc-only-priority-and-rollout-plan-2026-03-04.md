# Docs-Only Issues Priority + Rollout Plan (2026-03-04)

## Status
- Date: 2026-03-04
- Owner: felho
- State: Planned

## Objective

A docs-only bubble körökben megszüntetni a nem értelmes check-futtatásból és evidence-gate inkonzisztenciából eredő újrafutási ciklusokat, miközben a valós minőségjelzők megmaradnak.

## Priority Order

### P0 (Immediate containment)

1. [doc-only-temporary-disable-runtime-checks-phase1.md](./doc-only-temporary-disable-runtime-checks-phase1.md)
2. [doc-only-summary-verifier-consistency-gate-phase1.md](./doc-only-summary-verifier-consistency-gate-phase1.md)

Rationale:
1. Azonnal csökkenti a docs-only zajt és a felesleges köröket.
2. Megszünteti a legfájóbb ellentmondást: "summary PASS" vs "verifier untrusted".

### P1 (Stabilization)

1. [doc-only-evidence-source-whitelist-phase1.md](./doc-only-evidence-source-whitelist-phase1.md)
2. [doc-only-operational-decision-matrix-and-rollout-phase1.md](./doc-only-operational-decision-matrix-and-rollout-phase1.md)

Rationale:
1. Megakadályozza a hamis/prose-alapú evidence találatokat.
2. Operatív szinten egységes viselkedést kényszerít ki.

### P2 (Target architecture)

1. [doc-only-claim-based-validation-architecture-phase2.md](./doc-only-claim-based-validation-architecture-phase2.md)

Rationale:
1. Hosszabb távú, nagyobb scope; nem kell blokkolnia a gyors stabilizálást.

## Recommended Execution Sequence

### Step 1 (Now)

1. Implement P0/1: docs-only runtime check requirement temporary disable.
2. Add explicit docs-only summary wording standard.

Exit criteria:
1. Docs-only bubble check hiány miatt nem áll meg.
2. Nincs kötelező test/typecheck expectation docs-only módban.

### Step 2 (Immediately after Step 1)

1. Implement P0/2: summary-verifier consistency hard gate.
2. Add regression tests for prior mismatch pattern.

Exit criteria:
1. Nem mehet ki clean validation claim, ha verifier státusz nem kompatibilis.
2. Approval ping-pong mismatch incidensek megszűnnek.

### Step 3 (Same sprint, can run partly parallel with Step 2)

1. Implement P1/1: evidence source whitelist.
2. Update docs about accepted evidence ref patterns.

Exit criteria:
1. `done-package.md`/artifact JSON nem szolgálhat command evidence forrásként.
2. Command verification csak dedikált evidence logokra épül.

### Step 4 (After code changes are merged)

1. Execute P1/2: operational decision matrix rollout and comms.
2. Apply matrix in reviewer/orchestrator guidance and team routine.

Exit criteria:
1. Dokumentált és alkalmazott docs-only decision matrix.
2. 3 core metric mérése elindul.

### Step 5 (Phase 2 planning/implementation)

1. Execute P2/1: claim-based validation architecture design + phased implementation.

Exit criteria:
1. Elfogadott technical design.
2. Prioritized implementation backlog with milestones.

## Dependency Map

1. P0/1 -> prerequisite for meaningful immediate relief.
2. P0/2 depends on explicit docs-only mode behavior from P0/1.
3. P1/1 independent, but strongest value after P0 baseline is in place.
4. P1/2 should reflect final P0/P1 code behavior.
5. P2/1 starts after P0/P1 stabilization to avoid moving target.

## Rollback Plan (if needed)

1. If P0/1 causes unacceptable false-green risk, re-enable docs-only runtime requirement behind temporary feature flag.
2. Keep P0/2 consistency gate enabled even during rollback to prevent summary-verifier contradiction.

## Success Metrics

1. Docs-only approval előtti átlag round szám csökkenése.
2. Summary-vs-verifier mismatch count -> near zero.
3. Evidence-related rework ratio csökkenése docs-only bubble-ökben.

