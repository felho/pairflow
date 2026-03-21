# UseCaseOrchestrator

Status: active (ratified baseline)
Owner: architecture/runtime
Scope: M0

Current State (2026-03-21): implemented baseline contract; maintained under active v11 hard-gate rollout.

## 1) Purpose

- Explicit contract a use-case szintu orchestrator retegre (`pass`, `converged`, `approval`, `kickoff`, `gate`, `reconcile`).
- Elvalasztja a command koordinaciot a policy/transition/mutation implementaciotol.

## 2) Responsibilities

- Command input + runtime context normalizalasa.
- Domain decision hivasok sorrendi koordinacioja (`ConvergencePolicyEngine`, `GatePipelineEngine`).
- State transition validacio triggerelese (`StateTransitionService`) normal flow-ban.
- Mutation vegrehajtas delegalasa (`BubbleMutationRunner`) vagy operator recovery pathon (`TranscriptStateReconciler`).
- Side effect orchestration (AgentAdapter, MetricsDispatcher) a mutation utan.
- Error boundary: `PairflowError` code + context megtartas.

## 3) Non-Responsibilities (Anti-goals)

- Nem implementalhat policy dontest inline.
- Nem vegezhet kozvetlen state/transcript write-ot.
- Nem hivatkozhat kozvetlenul tmux/git/fs/network API-kra; csak adaptereken keresztul.
- Nem vegezhet “manual next state spread” logikat olyan pathon, ahol transition-validacio kotelezo.

## 4) Boundary and Dependencies

- Hivhatja: CLI command handler, UI router use-case entry.
- Hivhatja o: `ConfigLoader`, `LegacyCompatAdapter`, `ConvergencePolicyEngine`, `GatePipelineEngine`, `StateTransitionService`, `BubbleMutationRunner`, `TranscriptStateReconciler` (operator path), `AgentAdapter`, `MetricsDispatcher`.
- Tiltott: kozvetlen `writeStateSnapshot` / `appendProtocolEnvelope` hivas a command orchestratorbol.

## 4.1 Ownership Split (ha tobb komponenssel oszt felelosseget)

- UseCaseOrchestrator kizarolagos felelossege: call order + branch routing + boundary-level error mapping.
- CPE kizarolagos felelossege: policy decision.
- GPE kizarolagos felelossege: gate sorrend + `pass|warn|block` aggregate.
- STS kizarolagos felelossege: transition-validalt next state normal flow-ban.
- BMR kizarolagos felelossege: transcript-first mutation append+state persist.
- Reconciler kizarolagos felelossege: transcriptbol visszaepitett operator recovery write.

## 5) Input Contract

- `UseCaseCommandInput`: command-specifikus payload (summary/findings/decision/reason/refs).
- `UseCaseRuntimeContext`: `bubble_id`, `repo_path`, `state_snapshot`, `transcript_tail`, `operation_id` (ha operator path).
- Kotelezo validacio: non-empty required mezok, command-state precondition, ownership precondition.

## 6) Output Contract

- `UseCaseOutcome`:
  - `status`: `applied | blocked | rejected | recovery_needed`
  - `route`: opcionis command route (`auto_rework`, `human_gate_approve`, stb.)
  - `reason_code`: stabil, parse-olhato code
  - `state_ref`: kovetkezo state snapshot referencia
  - `envelope_refs`: appendelt envelope azonositok (ha volt append)

## 7) Invariants

- Kotelezo order normal flow-ban: `normalize -> policy -> gate -> transition -> mutation -> side effects`.
- `block` gate utan nincs transition/mutation.
- Normal flow state write csak STS-validalt allapottal mehet BMR-en keresztul.
- Operator recovery flow state write csak Reconcileren keresztul mehet.

## 8) Error Model

- `ORCHESTRATOR_INPUT_INVALID`
- `ORCHESTRATOR_POLICY_REJECTED`
- `ORCHESTRATOR_GATE_BLOCKED`
- `ORCHESTRATOR_TRANSITION_INVALID`
- `ORCHESTRATOR_MUTATION_FAILED`
- `ORCHESTRATOR_SIDE_EFFECT_FAILED`

Kotelezo context:
- `bubble_id`, `command_name`, `route` (ha van), `operation_id` (ha van), `round`, `reason_code`.

## 9) Observability

- Kotelezo eventek: `orchestrator_started`, `orchestrator_policy_decided`, `orchestrator_gate_result`, `orchestrator_mutation_result`, `orchestrator_completed`.
- Kotelezo incident adat: command neve, route, policy+gate reason code, mutation outcome.

## 10) Tests

- Unit: ordering es short-circuit (block gate eseten nincs transition/mutation).
- Unit: boundary guard (nincs direct write path).
- Integration: `pass`, `converged`, `approval`, `meta-review gate`, `reconcile` flow orchestracio.
- Regression: state/transcript drift es route-felrevezetes bug osztalyok.

## 11) Migration Notes

- Elso fazis: kozos orchestrator contract, commandonkent adapterelt bevezetes.
- Masodik fazis: `pass` + `converged` teljes orchestrator contractra migralasa.
- Harmadik fazis: approval/meta-review/reconcile pathok harmonizalasa.

## 12) Done Criteria

- Van kozos orchestrator contract, es legalabb ket kritikus flow (`pass`, `converged`) ennek megfeleloen fut.
- Az orchestrator command entry-k nem vegeznek kozvetlen mutation write-ot.
- Policy/gate/transition/mutation ownership explicit es teszttel vedett.

## 12.1 Green Criteria (architecture fitness)

- Van explicit orchestrator budget policy (file meret + function complexity) a fitness check specben.
- Van CI check, ami tiltja a kozvetlen state/transcript write-ot orchestrator command pathokban.
- Van legalabb 1 integration teszt, ami bizonyitja a kotelezo call ordert.
