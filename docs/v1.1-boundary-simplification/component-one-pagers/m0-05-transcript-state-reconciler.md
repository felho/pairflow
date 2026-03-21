# TranscriptStateReconciler (light)

Status: active (ratified baseline)
Owner: runtime
Scope: M0

Current State (2026-03-21): implemented baseline contract; maintained under active v11 hard-gate rollout.

## 1) Purpose

- Canonical transcript alapjan state reconcile/rebuild minimalis operacionalis parancs.

## 2) Responsibilities

- Transcript tail alapjan state korrekcio.
- `applied | no_change | rejected` outcome.

## 3) Non-Responsibilities (Anti-goals)

- Nem teljes recovery framework.
- Nem quarantine/dead-letter rendszer.

## 4) Boundary and Dependencies

- Hivhatja: operator command orchestrator.
- Dependencia: transcript read + state persist + mutation policy.

## 5) Input Contract

- `bubble_id`
- `operation_id`
- `reason`

## 6) Output Contract

- `ReconcileResult`:
  - `status`
  - `reason_code`
  - `before_after_snapshot_refs`

## 7) Invariants

- Transcript source-of-truth.
- Reconcile audit event kotelezo.

## 8) Error Model

- `RECONCILE_INPUT_INVALID`
- `RECONCILE_STATE_WRITE_FAILED`
- `RECONCILE_REJECTED`

Kotelezo context:
- `bubble_id`, `operation_id`, `reason`, `before_state_hash`, `reconciled_state_hash`, `state_diff_summary` (ha van).
- Opcionis debug context: `before_state_ref`, `reconciled_state_ref` (teljes snapshot csak artifact refkent).

## 9) Observability

- `reconcile_started`, `reconcile_applied`, `reconcile_rejected` event.

## 10) Tests

- Integration: stale snapshot tipusu recovery.

## 11) Migration Notes

- M0-ban light valtozat.

## 12) Done Criteria

- Egy paranccsal reprodukalhato minimal reconcile flow.
