# ConvergencePolicyEngine

Status: active (ratified baseline)
Owner: architecture
Scope: M0

Current State (2026-03-21): implemented baseline contract; maintained under active v11 hard-gate rollout.

## 1) Purpose

- Konvergencia dontesek centralizalasa egy pure policy engine-be.

## 2) Responsibilities

- Converged/pass jogosultsag dontes.
- Findings/severity/policy feltetelek kiertelese.
- Policy-level reason code visszaadas.

## 3) Non-Responsibilities (Anti-goals)

- Nem olvas transcript fajlt kozvetlenul.
- Nem kuld delivery/metrics mellekhatast.
- Nem ir state-et.

## 4) Boundary and Dependencies

- Hivhatja: pass/converged orchestrator.
- Dependencia: domain policy modellek.
- Tiltott: fs/tmux/git/network.

## 5) Input Contract

- `round_context`
- `findings_summary`
- `scope_policy`
- `evidence_status`
- `task_activation_state` (`ideation_pending | active_task`)

## 6) Output Contract

- `ConvergenceDecision`:
  - `decision`: `allow_pass | allow_converged | require_rework | reject`
  - `reason_code`
  - `diagnostics`

## 7) Invariants

- Ugyanarra inputra determinisztikus output.
- Policy sorrend fix es dokumentalt.
- `task_activation_state=ideation_pending` eseten `pass|converged` nem engedelyezett, kotelezo `reject`.

## 8) Error Model

- `CONVERGENCE_POLICY_INPUT_INVALID`
- `CONVERGENCE_POLICY_UNDECIDABLE`
- `CONVERGENCE_POLICY_TASK_NOT_ACTIVATED`

Context:
- `bubble_id`, `round`, `policy_profile`, `task_activation_state`.

## 9) Observability

- Policy decision diagnostics logolasa.

## 10) Tests

- Unit: policy matrix + edge case.
- Unit: pre-kickoff (`ideation_pending`) elutasitasi eset.
- Regression: korabbi summary/parity drift bug osztalyok.

## 11) Migration Notes

- Eloszor adapteren keresztuli delegalas a regi call-site-okrol.

## 12) Done Criteria

- `pass` es `converged` path policy dontese ezt hasznalja, es pre-kickoff allapotban determinisztikusan `reject`-el.
