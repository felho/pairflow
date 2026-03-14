# StateTransitionService

Status: draft
Owner: TBD
Scope: M0

## 1) Purpose

- Kotelezo kapu minden normal state transition elott.
- Megakadalyozza a kezi spread alapu invalid next-state epiteseket.

## 2) Responsibilities

- `applyStateTransition` centralis hasznalata.
- Transition-validacio (allowed from->to).
- Transition metadata konzisztencia ellenorzese.

## 3) Non-Responsibilities (Anti-goals)

- Nem ir state fajlt.
- Nem appendel transcriptet.
- Nem route-ol gate policyt.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator + mutation runner.
- Hivhatja: state machine/transitions modul.
- Tiltott: I/O dependency.

## 5) Input Contract

- `current_state`
- `transition_request` (`to`, optional metadata)

## 6) Output Contract

- `next_state` (immutable uj objektum)
- opcionis `transition_info`

## 7) Invariants

- Normal flow-ban kotelezo.
- Operator force path kulon bypass, audit eventtel.
- Minden active/round mezok konzisztensek maradnak.

## 8) Error Model

- `STATE_TRANSITION_INVALID`
- `STATE_TRANSITION_PRECONDITION_FAILED`

Context:
- `bubble_id`, `from_state`, `to_state`, `operation_id`.

## 9) Observability

- `transition_applied` event.
- invalid transitionnal explicit reason code.

## 10) Tests

- Unit: valid/invalid transition matrix.
- Integration: legalabb `start`, `pass`, `approval`.
- Lint/arch check: tiltott kezi next-state pattern.

## 11) Migration Notes

- Commandonkent replace a kezi spread logikat.
- Arch teszt gate bekotes CI-be.

## 12) Done Criteria

- Kritikus pathokon nincs manual next-state build.
- Arch check stabilan zold.
