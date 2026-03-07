# Task: Deterministic Rework Intent from `WAITING_HUMAN` (Phase 1)

## Goal

Enable deterministic rework initiation when a bubble is in `WAITING_HUMAN`, without relying on reviewer relay behavior.

Primary outcomes:
1. Human can issue explicit rework intent in `WAITING_HUMAN`.
2. Runtime persists and consumes that intent deterministically.
3. Next actionable handoff routes to implementer without reviewer mediation.
4. Intent lifecycle is fully auditable (`queued`, `applied`, `superseded`).

## First-Round Delivery Expectation (For This Task Execution)

1. Implementer first pass should be fast and task-file focused (no code changes), then hand off to reviewer for critique of task quality.
2. Reviewer feedback must be applied in the same task file before final handoff.
3. Review comments that are out of this task scope should be logged as notes, not expanded into extra implementation scope.

## Problem Statement

Current behavior blocks `pairflow bubble request-rework` outside `READY_FOR_APPROVAL`.
In real sessions, this can dead-end rework when bubble state is `WAITING_HUMAN`, forcing `bubble reply` as an indirect and non-deterministic workaround.

This task introduces a minimal state-machine extension so rework intent can be captured and reliably consumed from `WAITING_HUMAN`.

## Scope Boundaries

### In Scope (Required)

1. **Pending rework intent model (single-slot)**
   - Add a bubble-level `pending_rework_intent` record with:
     - `intent_id` (unique id)
     - `message`
     - `requested_by` (actor identity/source)
     - `requested_at` (timestamp)
     - `status` (`pending` | `applied` | `superseded`)
     - optional `superseded_by_intent_id`

2. **CLI support in `WAITING_HUMAN`**
   - `pairflow bubble request-rework` must accept `WAITING_HUMAN` and queue deferred intent.
   - CLI must explicitly say this was queued (not immediately executed rework transition).

3. **Deterministic duplicate policy (required)**
   - Policy: **latest-write-wins for pending deferred rework**.
   - If a pending deferred intent exists and a new deferred request arrives:
     - old pending intent becomes `superseded`
     - new intent becomes the only `pending` intent
     - emit `intent_superseded` event with old/new ids

4. **Runtime intent consumption + routing**
   - On scheduler tick, if `pending_rework_intent.status == pending`:
     - route next actionable handoff to implementer
     - reviewer relay is not required
   - Mark intent `applied` only after successful implementer-delivery confirmation.
   - If delivery fails, keep intent `pending` and surface actionable error.

5. **State-machine and protocol update**
   - Document allowed `request-rework` semantics by state:
     - `READY_FOR_APPROVAL`: existing immediate flow remains valid
     - `WAITING_HUMAN`: queue deferred rework intent
     - all other states: reject with explicit state error
   - Preserve backward compatibility for existing `READY_FOR_APPROVAL` behavior.

6. **Auditability / observability**
   - Emit events for:
     - `rework_intent_queued`
     - `rework_intent_applied`
     - `rework_intent_superseded`
   - Include at least: `bubble_id`, `intent_id`, `requested_by`, `requested_at`, `state_at_request`.

7. **UI/UX copy requirements**
   - In `WAITING_HUMAN`, deterministic rework action must be clearly distinct from plain `reply`.
   - UI text must not imply `reply` guarantees rework.

8. **Tests**
   - Add tests covering queue/apply/supersede behavior, error retention semantics, and actor routing.

### In Scope (Optional, low risk only)

1. Same deferred-intent semantics for `RUNNING`.

### Out of Scope

1. Multi-command generic intent queue.
2. Priority arbitration across intent categories.
3. Large UI redesign.
4. Reviewer-prompt workaround as primary rework path.

## Required State-Machine Semantics

### Command Semantics Matrix

| Current State | `bubble request-rework` behavior |
| --- | --- |
| `READY_FOR_APPROVAL` | Execute existing immediate rework behavior (no regression). |
| `WAITING_HUMAN` | Persist deferred rework intent as `pending`; do not require reviewer relay. |
| any other state | Reject with explicit invalid-state error (state included in message). |

### Runtime Invariants

1. At most one `pending` deferred rework intent can exist at any time.
2. `superseded` intents are immutable history records.
3. `applied` transition is allowed only after implementer-delivery confirmation.
4. Failed apply attempts never silently drop pending intent.

## CLI UX Contract (Required)

### Successful deferred queue in `WAITING_HUMAN`

`pairflow bubble request-rework --id <bubble-id> --message "<text>"`

CLI output requirements:
1. Explicit `queued` status wording.
2. Returned `intent_id`.
3. Clarification that execution is deferred and will be consumed by orchestrator.

### Duplicate deferred request

1. Must indicate prior pending intent was superseded.
2. Must return both `superseded_intent_id` and new `intent_id`.

### Invalid state

1. Must print state-aware error: command not allowed in `<state>`.
2. Must not mutate pending intent data.

## Suggested Implementation Touchpoints

1. `src/core/bubble/*` (state and command flow)
2. `src/core/runtime/*` (scheduler/actor routing + apply confirmation)
3. `src/cli/commands/bubble/*` (`request-rework` gating + output contract)
4. protocol/state schema definitions and persistence
5. docs:
   - `docs/review-loop-optimization.md`
   - relevant state/protocol docs

## Acceptance Criteria (Binary)

1. In `WAITING_HUMAN`, `pairflow bubble request-rework` succeeds and records deferred intent with `pending` status and unique `intent_id`.
2. CLI success output in `WAITING_HUMAN` explicitly states queued/deferred semantics and includes `intent_id`.
3. In `READY_FOR_APPROVAL`, existing immediate rework behavior remains unchanged (regression coverage required).
4. In unsupported states, command fails with explicit invalid-state message and does not mutate intent store.
5. Scheduler consumes pending deferred intent and routes next actionable handoff to implementer without reviewer relay.
6. Intent is marked `applied` only after implementer-delivery confirmation; failed delivery retains `pending`.
7. Duplicate deferred requests in `WAITING_HUMAN` follow latest-write-wins: prior pending becomes `superseded`, new one becomes sole `pending`.
8. `rework_intent_queued`, `rework_intent_applied`, `rework_intent_superseded` events are emitted with required metadata.
9. `WAITING_HUMAN` UI text/action clearly separates deterministic rework from plain `reply` semantics.
10. State-machine/protocol documentation is updated and matches implemented behavior.

## Test Mapping (Acceptance -> Test)

1. AC1/AC2 -> CLI integration test: deferred queue path in `WAITING_HUMAN` asserts persisted pending intent + output contract.
2. AC3 -> regression test: `READY_FOR_APPROVAL` request-rework path unchanged.
3. AC4 -> state-gate test: unsupported state returns explicit error and no persistence change.
4. AC5 -> orchestrator routing test: pending intent causes next actionable handoff to implementer.
5. AC6 -> apply-confirmation test: applied only after delivery confirmation; delivery failure keeps pending.
6. AC7 -> duplicate-intent test: latest-write-wins supersede metadata and sole pending invariant.
7. AC8 -> event-emission test: queued/applied/superseded events with metadata assertions.
8. AC9 -> UI unit/integration test: `WAITING_HUMAN` action text distinguishes rework vs reply.
9. AC10 -> docs consistency check (or snapshot) ensuring protocol/state docs reflect matrix + invariants.

## Deliverables

1. Updated runtime + CLI behavior for deferred deterministic rework from `WAITING_HUMAN`.
2. Single-slot deferred rework intent persistence with explicit supersede policy.
3. Deterministic runtime consumption and implementer routing.
4. Event instrumentation for queued/applied/superseded lifecycle.
5. Test coverage mapped to all acceptance criteria.
6. Updated protocol/state documentation.

## Changelog (Task-File Refinement)

1. Added explicit first-round workflow expectation (quick reviewer critique then feedback application).
2. Replaced ambiguous duplicate handling with deterministic latest-write-wins policy.
3. Added strict state-semantics matrix for `request-rework` across `READY_FOR_APPROVAL` / `WAITING_HUMAN` / other states.
4. Added runtime invariants for pending/applied/superseded lifecycle.
5. Made CLI UX contract concrete (queued wording, ids, invalid-state behavior).
6. Tightened acceptance criteria into binary assertions with one-to-one test mapping.
7. Added explicit delivery-failure retention semantics (`pending` preserved until confirmed apply).
