---
artifact_type: note
artifact_id: note_actor_runtime_interface_execution_authority_contract_v1
title: "Actor Runtime Interface Execution Authority Contract Note"
status: active
updated_at: 2026-04-16
owners:
  - "felho"
---

# Note: Actor Runtime Interface Execution Authority Contract

## Purpose

1. Ez a note a current-tree Phase E utani docs source-of-truthja az actor-runtime execution authority jelentésére.
2. Addig normatív, amíg egy későbbi, explicit replacement artifact felül nem írja.
3. Ha bármely Phase E vagy successor artifact ettől eltérő authority-vocabularyt használ, ezt a note-ot kell elsődlegesnek tekinteni.

## Canonical Contract Anchors

1. `docs/pairflow-initial-design.md`
2. `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
3. `src/types/protocol.ts`
4. `src/cli/commands/agent/emit.ts`
5. `src/v11/shared/actorProtocol/actorEmitContext.ts`

## Closed Terms

1. Canonical authority block:
   - a top-level active `execution_context`
2. Canonical execution authority fields:
   - `handoff_id`
   - `execution_id`
   - `active_role`
   - `round`
   - `awaited_output_type`
   - `started_at`
   - `deadline_at`
   - `attempt`
3. Canonical actor emit minimum input:
   - `repo`
   - `bubble_id`
   - `handoff_id`
   - `execution_id`
4. First-class authority rule:
   - az `execution_id` first-class canonical authority mező
   - nem optional guard
   - nem derived value
   - nem `handoff_id`-ból levezetett token
5. Guard fields:
   - `expected_role`
   - `expected_round`
   - `expected_state_fingerprint`
6. Guard rule:
   - a guard mezők fail-closed verification mezők
   - nem canonical authority replacementek
   - nem downgrade-olhatják a `handoff_id` + `execution_id` canonical identityt
7. Compat bridge:
   - a workspace/CWD-alapú compat lookup csak arra szolgálhat, hogy a teljes canonical `ActorEmitContextSnapshot`-ot rehidratálja
   - a compat bridge nem hozhat létre `execution_id` nélküli authority pathot
   - a compat bridge nem nevezhető át külön canonical authority route-tá

## Forbidden Reinterpretations

1. Tilos a canonical minimum authorityt úgy leírni, mint `handoff_id + optional guards`.
2. Tilos az `execution_id`-t guard, compat vagy implicit háttérmező szerepbe tolni.
3. Tilos a `handoff_id`-t és az `execution_id`-t felcserélhetőnek vagy deriválhatónak leírni.
4. Tilos a guard mezőket úgy kezelni, mintha ezek együtt canonical execution authorityt adnának explicit `execution_id` nélkül.
5. Tilos a pane, prompt, tmux visibility, marker state vagy puszta CWD alapján authorityt vagy success truthot levezetni.
6. Tilos a reviewer/non-implementer pathok baseline-ját csendben leszűkíteni csak azért, mert az implementer pilot új activation pathot kap.

## Remaining Phase E Inheritance

1. `E3a` csak a wrapper/bridge/dispatcher foundation hardeninget owns-olja ezen a lezárt canonical authority modellen.
2. `E3b` activation closure; itt már nem nyitható újra sem a canonical authority mezőlista, sem az `execution_id` szerepe.
3. `E3c` parity/fail-closed closure; ugyanazon canonical execution identity felett bizonyít.
4. `E4` reviewer és meta-reviewer consume-family rollout; ugyanezt a canonical authority vocabularyt örökli.

