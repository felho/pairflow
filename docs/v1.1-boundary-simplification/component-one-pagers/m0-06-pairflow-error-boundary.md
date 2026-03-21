# PairflowError + ErrorMappingBoundary

Status: active (ratified baseline)
Owner: architecture/observability
Scope: M0

Current State (2026-03-21): implemented baseline contract; maintained under active v11 hard-gate rollout.

## 1) Purpose

- Strukturalt hibamodel a megbizhato retry/recovery es diagnosztika miatt.

## 2) Responsibilities

- `PairflowError` base contract: `code`, `message`, `context`, `cause`.
- Boundary wrapnal strukturalt adat megorzese.

## 3) Non-Responsibilities (Anti-goals)

- Nem teljes enterprise exception hierarchy.
- Nem policy engine.

## 4) Boundary and Dependencies

- Minden orchestrator/application boundary hasznalja.

## 5) Input Contract

- `unknown` hibak + optional domain context.

## 6) Output Contract

- Stabil error object, code-alapu branch-elheto formaban.

## 7) Invariants

- Message-only wrap tiltott.
- Kritikus context mezok nem veszhetnek el.

## 8) Error Model

- Kategoria prefixek (pl. `STATE_*`, `MUTATION_*`, `GATE_*`, `DELIVERY_*`).

## 9) Observability

- Error code aggregacio metrics/log oldalon.

## 10) Tests

- Unit: wrap preserve.
- Integration: egy kritikus flowban code+context latszik a felso szinten.

## 11) Migration Notes

- Elso korben kritikus commandokra.

## 12) Done Criteria

- Kritikus flow-kban nincs message-only error ujracsomagolas.
