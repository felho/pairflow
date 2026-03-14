# GatePipelineEngine

Status: draft
Owner: TBD
Scope: M0

## 1) Purpose

- Gate dontesek egységes, sorrend-fuggo pipeline-ban futtatasa.

## 2) Responsibilities

- Gate-ek sorrendi futtatasa.
- `pass|warn|block` kimenet aggregalas.
- Short-circuit `block` esetben.

## 3) Non-Responsibilities (Anti-goals)

- Nem olvas nyers transcriptet.
- Nem vegez I/O muveletet.
- Nem force-olja az operator dontest.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator.
- Dependencia: gate evaluator interface-ek.

## 5) Input Contract

- `GateContext`
- `gate_list`
- opcionis `skip_list`

## 6) Output Contract

- `PipelineResult`:
  - `final_outcome`
  - `gate_outcomes[]`
  - `diagnostics`

## 7) Invariants

- Fix gate sorrend profile szerint.
- `block` utan nincs tovabbi gate execute.

## 8) Error Model

- `GATE_CONTEXT_INVALID`
- `GATE_EVALUATOR_FAILED`

Context:
- `bubble_id`, `gate_id`, `round`.

## 9) Observability

- Gate-level outcome log.
- `warn` halmozott diagnosztika.

## 10) Tests

- Unit: ordering, short-circuit, skip-list.
- Integration: converged/meta-review gate orchestration.

## 11) Migration Notes

- Shadow mode: regi es uj dontes diff log.

## 12) Done Criteria

- Legalabb ket kritikus gate uj pipeline-on fut.
