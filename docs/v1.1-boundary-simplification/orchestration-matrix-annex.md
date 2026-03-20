# Command-level Orchestration Matrix (Annex)

Status: draft  
Owner: TBD  
Scope: M0 baseline  
Last Updated: 2026-03-19

## 1) Purpose

Ez az annex a W3 command-level orchestration matrix konkret, review-olhato helye.
M0-ban kotelezo minimum: a `pass` command baseline sora kitoltve es review-zva.

## 2) Column Definitions

- `command`: a command neve.
- `ownership`: ki validal, ki ir state-et/transcriptet, ki csak koordinal.
- `required_call_order`: kotelezo sorrend a baseline flow-ban.
- `budget`: baseline budget (`max_components`, `max_state_write`, `max_external_io`, `max_side_effect`).
- `review_evidence`: review bizonyitek (kod referencia + megjegyzes), kritikus side-effect commandnal kotelezo semantic invariant hivatkozassal.
- `status`: `incomplete | baseline_filled | reviewed`.

## 3) Matrix

| command | ownership | required_call_order | budget | review_evidence | status |
| --- | --- | --- | --- | --- | --- |
| `pass` | `validator`: inline policy/gate/verification validaciok a command pathban; `state_writer`: legacy pathon kozvetlen `writeStateSnapshot`; `transcript_writer`: legacy pathon kozvetlen `appendProtocolEnvelope`; `coordinator`: `emitPassFromWorkspace` route-ol normal vs auto-converge agat, majd side effecteket futtat | `normalize+resolve` -> `state load + handoff` -> `reviewer gate/policy validation` -> `transcript read + repeat-clean policy` -> (`auto-converge` ag: `emitConvergedFromWorkspace`) OR (`normal` ag: `append PASS envelope -> review verification artifact -> next_state build -> state persist`) -> `doc gate artifact update` -> `reviewer context refresh` -> `delivery + retry` -> `lifecycle metric` | `max_components=12`; `max_state_write=1`; `max_external_io=14`; `max_side_effect=5` | kod nyomkovetes: `src/core/agent/pass.ts` (normal path append/state write), valamint orchestrator ownership cel: `component-one-pagers/m0-11-use-case-orchestrator.md` | `reviewed` |

## 4) PASS Baseline Review Evidence

1. Legacy normal mutation pathban kozvetlen transcript append + state write tortenik:
   - `appendProtocolEnvelope`: `src/core/agent/pass.ts:1233`
   - `writeStateSnapshot`: `src/core/agent/pass.ts:1325`
2. Call-order bizonyitek:
   - input/ownership precondition + reviewer gate validacio: `src/core/agent/pass.ts:892`, `src/core/agent/pass.ts:919`
   - repeat-clean policy + auto-converge branch: `src/core/agent/pass.ts:1011`, `src/core/agent/pass.ts:1084`
   - normal flow side effectek (reviewer context + delivery + metric): `src/core/agent/pass.ts:1428`, `src/core/agent/pass.ts:1464`, `src/core/agent/pass.ts:1484`
3. Target ownership contract referencia (baselinehez mért celallapot):
   - orchestrator nem irhat kozvetlen state/transcriptet: `docs/v1.1-boundary-simplification/component-one-pagers/m0-11-use-case-orchestrator.md:32`
   - kotelezo normal order: `normalize -> policy -> gate -> transition -> mutation -> side effects`: `docs/v1.1-boundary-simplification/component-one-pagers/m0-11-use-case-orchestrator.md:60`
   - STS/BMR ownership split: `docs/v1.1-boundary-simplification/component-one-pagers/m0-02-state-transition-service.md:34`, `docs/v1.1-boundary-simplification/component-one-pagers/m0-01-bubble-mutation-runner.md:38`

## 5) Notes

1. A fenti budget baseline-keret, nem vegleges hard threshold.
2. W2 fitness tooling feladata a budget muszeresitett merese, majd a kuszobok pontositasa.
3. Kritikus side-effect commandoknal (`kickoff`, `pass`, `converged`) a `reviewed` status csak akkor adható, ha a review evidence tartalmaz legalabb 1 explicit side-effect invariant teszt hivatkozast.
