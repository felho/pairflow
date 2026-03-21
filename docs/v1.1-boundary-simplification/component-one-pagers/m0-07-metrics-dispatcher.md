# MetricsDispatcher

Status: active (ratified baseline)
Owner: runtime/observability
Scope: M0

Current State (2026-03-21): implemented baseline contract; maintained under active v11 hard-gate rollout.

## 1) Purpose

- Metrics mellekhatas leválasztasa az uzleti flowrol.

## 2) Responsibilities

- Event validacio, dedupe, retry/backoff.
- Best-effort/fail-open policy ervenyesitese.

## 3) Non-Responsibilities (Anti-goals)

- Nem hoz uzleti dontest.
- Nem blokkolja a fo command flowt defaultban.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator.
- Dependencia: metrics sink adapter.

## 5) Input Contract

- `DomainEvent` / lifecycle event payload.

## 6) Output Contract

- `dispatch_result` (`sent|dropped|deferred`).

## 7) Invariants

- Metrics hiba defaultban nem command-fail.

## 8) Error Model

- `METRICS_DISPATCH_FAILED`
- `METRICS_EVENT_INVALID`

Kotelezo context:
- `bubble_id`, `event_type`, `dispatch_attempt` (retry sorszam, ha van).

## 9) Observability

- Dispatcher sajat error/warn eventek.

## 10) Tests

- Integration: metrics hiba mellett business flow sikeres.

## 11) Migration Notes

- Kezdetben existing emitter adapterezese.

## 12) Done Criteria

- Kritikus commandok nem hivnak kozvetlen metrics I/O-t.
