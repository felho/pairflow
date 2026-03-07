# Docs-Only Issues Priority + Rollout Plan (2026-03-04)

## Status
- Date: 2026-03-07
- Owner: felho
- State: In Progress

## Progress Snapshot (2026-03-07)

1. Completed: P0/1 (`doc-only-temporary-disable-runtime-checks-phase1.md`) merged on 2026-03-04 via `c24c20f` (`bubble/doc-only-runtime-checks-phase1-impl`) and `7eaf70e` (merge to `main`).
2. Completed: P0/2 (`doc-only-summary-verifier-consistency-gate-phase1.md`) merged via `f631ecd` + `3b7f68d`.
3. Completed: P1/1 (`doc-only-evidence-source-whitelist-phase1.md`) merged via `80c0c58` (bubble finalize) and `b71d3e3` (merge to `main`).
4. Active item: P1/2 operational decision matrix rollout. Task spec migrated to L0/L1/L2 in `25b609a`; workflow/rollout source-of-truth synchronization in progress.
5. Not started: P2/1 claim-based validation architecture.

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

### Step 1 (Completed on 2026-03-04)

1. Implement P0/1: docs-only runtime check requirement temporary disable.
2. Add explicit docs-only summary wording standard.

Exit criteria:
1. Docs-only bubble check hiány miatt nem áll meg.
2. Nincs kötelező test/typecheck expectation docs-only módban.

### Step 2 (Completed)

1. Implement P0/2: summary-verifier consistency hard gate.
2. Add regression tests for prior mismatch pattern.

Exit criteria:
1. Nem mehet ki clean validation claim, ha verifier státusz nem kompatibilis.
2. Approval ping-pong mismatch incidensek megszűnnek.

### Step 3 (Completed on 2026-03-07)

1. Implement P1/1: evidence source whitelist.
2. Update docs about accepted evidence ref patterns.

Exit criteria:
1. `done-package.md`/artifact JSON nem szolgálhat command evidence forrásként.
2. Command verification csak dedikált evidence logokra épül.

### Step 4 (Operational rollout for P1/2, Active)

Reference task:
1. [doc-only-operational-decision-matrix-and-rollout-phase1.md](./doc-only-operational-decision-matrix-and-rollout-phase1.md)

Actions:
1. Publish the operational decision matrix into workflow guidance and communicate one standard docs-only summary wording.
2. Apply deterministic routing in team routine:
   - docs-only + no runtime claim -> runtime checks not required wording,
   - docs-only + explicit runtime claim -> claim allowed only with trusted verifier + whitelisted evidence,
   - code/auto bubble -> existing policy unchanged.
3. Ensure workflow + rollout docs both reference the same P1/2 matrix source-of-truth task file.
4. Start metrics collection with explicit source and weekly cadence for required set (`docs_only_round_count_avg`, `summary_verifier_mismatch_count`, `docs_only_evidence_rework_ratio`, `false_blocker_ratio`).
5. Freeze baseline contract inputs before rollout go-live (`baseline_window`, `baseline_source`, `baseline_snapshot_ts`, `baseline_owner`).

Exit criteria:
1. Workflow doc and rollout plan both reference the same P1/2 matrix source-of-truth.
2. Metrics registry is active (minimum one weekly measured window recorded).
3. No policy ambiguity remains between docs-only and code/auto paths in team guidance text.

Baseline contract (required before rollout-on):
| Field | Definition |
|---|---|
| `baseline_window` | `2` completed, consecutive weekly observation windows immediately before rollout activation. |
| `baseline_source` | `pairflow bubble status --json` history snapshot, reviewer artifacts + summary audit, rework decision logs + bubble decision trail. |
| `baseline_snapshot_ts` | ISO-8601 UTC timestamp when the baseline snapshot is frozen. |
| `baseline_owner` | Named owner accountable for baseline capture and approval (must be populated before rollout go-live). |

Baseline aggregation and metric identity rule (must match workflow wording):
1. `baseline(metric_id, baseline_window, baseline_source, baseline_snapshot_ts, baseline_owner)` = arithmetic mean of weekly metric values across the `baseline_window` completed consecutive observation windows from `baseline_source`, frozen at `baseline_snapshot_ts`, approved by `baseline_owner`.
2. `false_blocker_ratio(window) := docs_only_evidence_rework_ratio(window)` (pure alias; no independent computation stream).

Rollback triggers:
1. In two consecutive weekly observation windows:
   `summary_verifier_mismatch_count(current_week) >= baseline(summary_verifier_mismatch_count, baseline_window, baseline_source, baseline_snapshot_ts, baseline_owner) + 1`.
2. In one weekly observation window:
   `false_blocker_ratio(current_week) >= baseline(false_blocker_ratio, baseline_window, baseline_source, baseline_snapshot_ts, baseline_owner) + 0.10`.

Threshold semantics (must match workflow wording):
1. `+1` means absolute event-count delta.
2. `+0.10` means absolute ratio delta (`+10` percentage points), not relative percentage growth.

Rollback action:
1. Keep P0/2 consistency gate enabled.
2. Revert only P1/2 communication wording/routine changes.
3. Keep evidence whitelist behavior unchanged while investigating.

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
3. If P1/2 operational rollout introduces confusion/noise, roll back only the communication layer (matrix wording/routine), not the P0/P1 technical safety controls.

## Success Metrics

| metric_id | Definition | Source | Cadence | Target direction |
|---|---|---|---|---|
| docs_only_round_count_avg | Docs-only bubble-ök átlagos approval round száma | `pairflow bubble status --json` history snapshot | weekly | down |
| summary_verifier_mismatch_count | Summary-vs-verifier mismatch események száma | reviewer artifacts + summary audit | weekly | near zero |
| docs_only_evidence_rework_ratio | Evidence-related rework arány docs-only bubble-ökben | rework decision logs + bubble decision trail | weekly | down |
| false_blocker_ratio | Phase 1 rollback control metric (operational alias of `docs_only_evidence_rework_ratio`) | rework decision logs + bubble decision trail | weekly | down |

Note:
1. This metrics table is intentionally an operational extract view (`metric_id`, `definition`, `source`, `cadence`, `target direction`) and does not duplicate the full L1 contract field schema.
