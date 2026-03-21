# StateTransitionService

Status: active (ratified baseline)
Owner: architecture/runtime
Scope: M0

Current State (2026-03-21): implemented baseline contract; maintained under active v11 hard-gate rollout.

## 1) Purpose

- Kotelezo kapu minden normal state transition elott.
- Megakadalyozza a kezi spread alapu invalid next-state epiteseket.

## 2) Responsibilities

- `applyStateTransition` centralis hasznalata.
- Transition-validacio (allowed from->to).
- Transition metadata konzisztencia ellenorzese.
- `validated_next_state` eloallitasa immutable modon.

## 3) Non-Responsibilities (Anti-goals)

- Nem ir state fajlt.
- Nem appendel transcriptet.
- Nem route-ol gate policyt.
- Nem hiv repository/adaptor I/O-t.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator/application use-case-ek.
- Hivhatja: state machine/transitions modul.
- Tiltott: I/O dependency.

## 4.1 Ownership Split

- `StateTransitionService` ownership:
  - transition validacio,
  - `next_state` eloallitasa.
- `BubbleMutationRunner` ownership:
  - transcript append + state persist.
- Ownership handoff:
  - STS outputja a `validated_next_state`,
  - orchestrator ezt adja tovabb a runnernek.

## 5) Input Contract

- `current_state`
- `transition_request` (`to`, optional metadata)
- opcionis `task_activation_state` (`ideation_pending | active_task`) domain precondition validaciohoz.

## 6) Output Contract

- `next_state` (immutable uj objektum)
- opcionis `transition_info`
- `transition_provenance` (optional) a debug/audit trace-hez.

## 7) Invariants

- Normal flow-ban kotelezo.
- Operator force path kulon bypass, audit eventtel.
- Minden active/round mezok konzisztensek maradnak.
- `RUNNING` + `round=0` csak `ideation_pending` aktivacios fazisban megengedett.
- `pass`/`converged` jellegu tovabblepes `round < 1` eseten kotelezoen precondition-hiba.
- Sikeres validacio nelkul nem adhat ki persistelheto `next_state`-et.

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
- Integration: legalabb `start`, `kickoff`, `pass`, `approval`.
- Lint/arch check: tiltott kezi next-state pattern.
- Integration ownership test: `STS` hiba eseten `BubbleMutationRunner` nem hivodik.

## 11) Migration Notes

- Commandonkent replace a kezi spread logikat.
- Arch teszt gate bekotes CI-be.

## 12) Done Criteria

- Kritikus pathokon nincs manual next-state build.
- Aktivacios precondition (`RUNNING round=0` only ideation pending) teszttel vedett.
- Arch check stabilan zold.

## 12.1 Green Criteria (ownership fitness)

- Nincs state-changing command, amely transition validacio nelkul hoz letre `next_state`-et.
- Nincs STS modulban I/O import.
- `kickoff`, `pass` es `approval` flow bizonyitja, hogy a persist csak STS-validacio utan tortenik.
