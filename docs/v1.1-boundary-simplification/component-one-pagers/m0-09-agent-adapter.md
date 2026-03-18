# AgentAdapter (TmuxAgentAdapter impl.)

Status: draft
Owner: TBD
Scope: M0

## 1) Purpose

- Agent runtime interakcio elvalasztasa a use-case orchestrationtol.

## 2) Responsibilities

- Session start/restart.
- Instruction delivery.
- Health check interface.

## 3) Non-Responsibilities (Anti-goals)

- Nem policy engine.
- Nem state transition manager.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator.
- Implementacio: tmux alapu adapter (M0).

## 5) Input Contract

- Role, session config, message payload.

## 6) Output Contract

- Delivery/health/restart result object reason code-dal.

## 7) Invariants

- Role/session mapping konzisztens.
- Restart nem valtoztat bubble state-et onmagaban.

## 8) Error Model

- `AGENT_SESSION_START_FAILED`
- `AGENT_DELIVERY_FAILED`
- `AGENT_RESTART_FAILED`
- `AGENT_HEALTH_CHECK_FAILED`

Kotelezo context:
- `bubble_id`, `role`, `agent_name`, `session_id` (ha van).

## 9) Observability

- Agent-level lifecycle eventek es reason code.

## 10) Tests

- Integration: reviewer restart path.
- Regression: delivery retry reason mapping.

## 11) Migration Notes

- Elso korben TmuxAgentAdapter only.

## 12) Done Criteria

- Start/restart/delivery pathok orchestrator oldalon adapteren at mennek.
