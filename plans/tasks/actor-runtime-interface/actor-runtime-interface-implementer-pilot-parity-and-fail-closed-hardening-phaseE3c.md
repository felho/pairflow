---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_parity_and_fail_closed_hardening_phaseE3c_v1
title: "Actor Runtime Interface Implementer Pilot Parity and Fail-Closed Hardening (Phase E3c)"
status: implementable
updated_at: 2026-04-16
phase: phaseE3c
target_files:
  - plans/actor-runtime-interface-execution-authority-contract-note-v1.md
  - src/v11/shared/state/executionContext.ts
  - src/v11/shared/delivery/tmuxDeliveryContract.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/askHuman.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Parity and Fail-Closed Hardening (Phase E3c)

## Current Tree Position (2026-04-16)

1. `E3a` lezarta a canonical execution authority vocabularyt.
2. `E3b` lezarta a fresh activation ownershipet.
3. Itt mar csak parity es fail-closed hardening marad nyitva ugyanazon canonical execution identity felett.

## L0 - Policy

### Goal

1. Zarja le az implementer pilot utan fennmarado parity minimumot.
2. Bizonyitsa explicit evidence-szel:
   - stale authority reject,
   - conflicting-context fail-closed,
   - duplicate masodik success tilalma,
   - restart utani uj execution authority,
   - delayed/missing ack melletti no-success.
3. Tartsa meg a retained tmux/runtime surfacet observability-only adapterkent.

### Canonical Contract Anchors

1. `plans/actor-runtime-interface-execution-authority-contract-note-v1.md`
2. `docs/pairflow-initial-design.md`
3. `src/types/protocol.ts`
4. `src/v11/shared/state/executionContext.ts`
5. `src/v11/shared/delivery/tmuxDeliveryContract.ts`

### Closed Terms

1. Canonical execution identity: `handoff_id` + explicit `execution_id`.
2. Guard fields: `expected_role`, `expected_round`, `expected_state_fingerprint`.
3. Ugyanarra a canonical execution identityre nincs masodik successful launch/delivery.
4. Restart utan uj `execution_id` kotelezo.
5. Pane activity es tmux visibility tovabbra sem authority vagy success truth.

### Domain / Control Model Summary

1. Aktiv implementer pilot nem reuse-olhat stale authorityt es nem kaphat duplicate success-t ugyanarra az execution identityre.
2. Explicit authority + explicit runtime outcome marad a truth.
3. Restart utan csak uj execution authority mellett ervenyes az emit.
4. Missing explicit runtime outcome mellett nincs success inference.

### In Scope

1. Stale/conflicting authority handling.
2. Duplicate delivery minimum policy.
3. Restart recovery authority refresh.
4. Delayed/missing ack melletti no-success behavior.

### Out of Scope

1. Fresh activation redesign.
2. Wrapper/authority vocabulary rewrite.
3. Reviewer/meta-reviewer rollout.
4. Broad topology cleanup.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical identity | `handoff_id` + explicit `execution_id` a parity proof alapja. | Stale vagy conflicting execution identity fail-closed. | P1 | required-now |
| Duplicate rule | Ugyanarra az execution identityre nincs masodik successful launch/delivery. | Reject vagy suppresszalt no-op kell. | P1 | required-now |
| Restart rule | Restart utan uj `execution_id` kotelezo. | Regi emit stale marad. | P1 | required-now |
| Missing-data rule | Explicit runtime outcome hianyaban nincs success inference. | Pane activity csak diagnostics lehet. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/state/executionContext.ts` | restart/running helpers | restart utan uj canonical execution identity keletkezik | P1 | required-now | T3 |
| CS2 | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | delivery ack contract | explicit runtime outcome marad a parity truth-source | P1 | required-now | T4 |
| CS3 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | retained adapter runtime | tmux nem valik authority vagy success source-sza | P1 | required-now | T4 |
| CS4 | actor emit + agent tests | duplicate/stale/conflicting paths | nincs second success es nincs stale-authority acceptance | P1 | required-now | T1, T2 |

### 2) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | stale authority reject | a regi `execution_id` explicit rejectet vagy fail-closed eredmenyt kap | P1 | required-now | automated test |
| T2 | conflicting-context fail-closed | conflicting context mellett nincs successful side effect | P1 | required-now | automated test |
| T3 | restart remint | restart utan uj `execution_id` kell; a regi path stale marad | P1 | required-now | automated test |
| T4 | duplicate vagy missing-ack parity | nincs second success, es pane activity nem ad success truthot | P1 | required-now | automated test |

## L2 - Implementation Notes

1. Ha a duplicate policy bizonytalan, explicit reject vagy suppresszalt no-op az elfogadhato minimum; masodik successful outcome nem.
2. Ha a parity bizonyitas csak ugy tunik lehetsegesnek, hogy a tmux adapter uj authority-szerepet kap, az regresszio.
