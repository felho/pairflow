# Task: Deterministic Rework Intent from WAITING_HUMAN (Phase 1)

## Goal

Allow users to start rework deterministically even when bubble state is `WAITING_HUMAN`, without relying on reviewer cooperation or intent forwarding.

Primary outcome:
1. Rework request can be captured as explicit control-plane intent outside `READY_FOR_APPROVAL`.
2. Orchestrator applies that intent predictably and routes work to implementer.
3. Full audit trail exists for who requested rework, when, and how it was consumed.

## Context

In the current lifecycle, `pairflow bubble request-rework` is valid only in `READY_FOR_APPROVAL`.

Real session issue observed:
1. Bubble was in `WAITING_HUMAN` (likely due to watchdog or runtime pause).
2. User intent was clear: start rework.
3. Direct rework command was blocked by state rule.
4. Only available path was `bubble reply` to reviewer, hoping reviewer forwards intent.
5. That path is non-deterministic and can create loop churn or deadlock-like behavior.

This limitation should be removed with an explicit and safe state-machine extension.

## Scope Boundaries

### In Scope (Required)

1. **New pending rework intent model**
   - Add bubble-level pending rework intent (control-plane data), including:
     - message
     - requester identity/source
     - timestamp
     - unique intent id
     - status (`pending` / `applied` / `superseded`)

2. **CLI surface for deferred rework**
   - Extend `pairflow bubble request-rework` (or add sibling command) to support deferred intent from `WAITING_HUMAN`.
   - Command must return explicit confirmation that intent is queued (not immediately executed as approval-state transition).

3. **Orchestrator intent consumption**
   - On scheduler/loop tick, if pending rework intent exists:
     - next actionable handoff must route to implementer
     - reviewer should not be required to relay intent
   - Mark intent as `applied` only when delivery to implementer is confirmed.

4. **State-machine and protocol updates**
   - Update state/transition documentation and runtime invariants.
   - Ensure this does not break existing `READY_FOR_APPROVAL -> request-rework` path.

5. **Observability and audit trail**
   - Emit event(s) for:
     - intent queued
     - intent applied
     - intent superseded (if replaced)
   - Include enough metadata for postmortem and metrics.

6. **UI/UX behavior**
   - In `WAITING_HUMAN`, expose clear action wording for deterministic rework path.
   - Avoid implying that plain `reply` is equivalent to guaranteed rework.

7. **Tests**
   - Add tests for queue/apply/supersede flow and actor routing behavior.

### In Scope (Optional, if low risk)

1. Support deferred rework capture from `RUNNING` as well, with identical semantics.

### Out of Scope (Do Not Implement in This Task)

1. General intent queue for arbitrary command types (only rework intent now).
2. Multi-intent prioritization across different categories.
3. UI redesign beyond minimal control exposure.
4. Reviewer prompt-level workaround policies as primary solution.

## Design Requirements

1. **Deterministic routing**
   - Rework initiation must not depend on reviewer initiative.

2. **Backward compatibility**
   - Existing `request-rework` behavior in `READY_FOR_APPROVAL` remains valid and unchanged.

3. **Idempotency and conflict handling**
   - Duplicate rework submissions should be deterministic (`replace latest` or explicit conflict policy).

4. **Safe failure semantics**
   - If intent cannot be applied, system must preserve pending status and surface actionable error.

5. **Traceability**
   - Every queued/applied/superseded intent must be visible in logs/events.

## Suggested Implementation Touchpoints

1. Runtime/orchestrator:
   - `src/core/bubble/*`
   - `src/core/runtime/*`
   - scheduler/loop actor-selection logic

2. CLI command handling:
   - `src/cli/commands/bubble/*`
   - rework command validators and state gates

3. Protocol/state schema:
   - bubble state model + serialized runtime state

4. UI layer:
   - action availability + label in `WAITING_HUMAN`

5. Docs:
   - `docs/review-loop-optimization.md`
   - relevant protocol/state docs

## Acceptance Criteria (Binary, Testable)

1. When bubble is `WAITING_HUMAN`, user can issue deterministic rework request via supported CLI path.
2. CLI confirms queued deferred intent with explicit status and intent id.
3. Orchestrator consumes pending rework intent and routes next actionable step to implementer.
4. Rework is applied without requiring reviewer to manually forward intent.
5. Existing `READY_FOR_APPROVAL` rework flow still works unchanged.
6. Duplicate deferred rework requests follow documented deterministic policy.
7. Audit events are emitted for queued/applied/superseded lifecycle with metadata.
8. UI clearly differentiates deterministic rework action from plain `reply` in `WAITING_HUMAN`.
9. Documentation is updated to reflect new state-machine behavior.

## Test Mapping

1. AC1/AC2 -> CLI integration test for deferred request in `WAITING_HUMAN`.
2. AC3/AC4 -> orchestrator test for next-actor override to implementer.
3. AC5 -> regression test for current approval-state rework path.
4. AC6 -> duplicate request behavior test.
5. AC7 -> event emission/assertion tests.
6. AC8 -> UI behavior/unit test (or integration snapshot).
7. AC9 -> docs update verification.

## Deliverables

1. Deferred rework intent capability from `WAITING_HUMAN`.
2. Deterministic orchestrator handling and actor routing.
3. Audit/event instrumentation for intent lifecycle.
4. Regression and new tests for lifecycle correctness.
5. Documentation updates and rollout notes.
