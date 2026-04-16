---
artifact_type: task
artifact_id: task_actor_runtime_interface_reviewer_meta_rollout_and_adapter_cleanup_phaseE4_v1
title: "Actor Runtime Interface Reviewer and Meta-Reviewer Rollout and Retained Adapter Cleanup (Phase E4)"
status: implementable
updated_at: 2026-04-16
phase: phaseE4
target_files:
  - plans/actor-runtime-interface-execution-authority-contract-note-v1.md
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Reviewer and Meta-Reviewer Rollout and Retained Adapter Cleanup (Phase E4)

## Current Tree Position (2026-04-16)

1. `E3a` lezarta a canonical execution authority vocabularyt.
2. `E3b` implementer activation, `E3c` implementer parity baseline.
3. Ez a task consume-family rollout es retained adapter cleanup, nem authority-foundation vagy activation redesign.

## L0 - Policy

### Goal

1. Terjessze ki a lezart canonical execution authority modellt a reviewer es `meta_reviewer` consume pathokra.
2. Zarja le a reviewer `pass` / `convergence` es a meta-review submit parity minimum contractjat ugyanazon authority + runtime outcome modellen.
3. Tisztitsa ki a retained adapter feltetelezeseket, amelyek a lezart role-neutral boundary utan mar csak compatibility-terhet jelentenek.

### Canonical Contract Anchors

1. `plans/actor-runtime-interface-execution-authority-contract-note-v1.md`
2. `docs/pairflow-initial-design.md`
3. `src/types/protocol.ts`
4. `src/v11/shared/actorProtocol/actorEmitContext.ts`
5. `src/v11/application/metaReview/emitMetaReviewV11.ts`

### Closed Terms

1. Canonical execution identity: `handoff_id` + explicit `execution_id`.
2. Guard fields: `expected_role`, `expected_round`, `expected_state_fingerprint`.
3. Reviewer es `meta_reviewer` ugyanazt a canonical execution authority vocabularyt orokli.
4. Retained adapter cleanup csak parity-proof utan mehet.

### Domain / Control Model Summary

1. `implementer`, `reviewer` es `meta_reviewer` ugyanazon actor-runtime boundaryn fut.
2. Explicit authority + explicit runtime outcome marad a truth; role rollout nem vezethet be uj authorityforrast.
3. Reviewer es meta-reviewer success sem johet pane activitybol vagy retained adapter visibilitybol.
4. Nincs role-local authority shortcut, meta-review special-case authority vagy implementer-only retained helper role-neutral truthkent.

### In Scope

1. Reviewer `pass` / `convergence` parity.
2. Meta-review submit parity.
3. Retained adapter cleanup ugyanazon role-neutral consume boundary menten.

### Out of Scope

1. Uj authority shape.
2. Uj ack contract.
3. Implementer fresh-path redesign.
4. Broad topology csere.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Role-neutrality | Reviewer es `meta_reviewer` ugyanazt a canonical execution authority modellt hasznalja. | Nincs role-specifikus authority source vagy shortcut. | P1 | required-now |
| Canonical identity | `handoff_id` + explicit `execution_id` a minimum execution identity minden role-nal. | `execution_id` nem downgrade-olhato diagnostics vagy guard szerepbe. | P1 | required-now |
| Runtime truth | Success csak explicit runtime outcome-bol johet. | Pane activity nem acceptance proof. | P1 | required-now |
| Cleanup rule | Cleanup csak parity bizonyitas utan mehet. | Parity hianyaban retained compatibility marad. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | reviewer/meta wrapper route | reviewer es `meta_reviewer` ugyanazon canonical execution authority route-ra all | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/converged/convergedGateDelivery.ts` | reviewer convergence consume | reviewer parity explicit runtime outcome-ra epul | P1 | required-now | T1 |
| CS3 | `src/v11/application/metaReview/emitMetaReviewV11.ts` | meta-review submit path | meta-review parity explicit runtime outcome-ra epul ugyanazon canonical vocabularyval | P1 | required-now | T2 |
| CS4 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | retained adapter seam | cleanup utan sem valik authority vagy success source-sza | P1 | required-now | T3 |

### 2) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | reviewer runtime parity | reviewer `pass` / `convergence` ugyanazon canonical execution identityre es explicit runtime outcome-ra epul | P1 | required-now | automated test |
| T2 | meta-review runtime parity | meta-review submit ugyanazon canonical execution identityre es explicit runtime outcome-ra epul | P1 | required-now | automated test |
| T3 | retained adapter cleanup parity utan | cleanup utan sincs role-local canonical truth vagy pane-derived success | P1 | required-now | automated test |

## L2 - Implementation Notes

1. Ha a rollout csak kulon reviewer vagy meta-review authority-szotarral tunik kivitelezhetonek, az regresszio.
2. Ha a cleanup broad topology-csereve novekedne, azt kulon successor taskra kell bontani.
