---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_foundation_hardening_phaseE3a_v1
title: "Actor Runtime Interface Implementer Pilot Foundation Hardening (Phase E3a)"
status: implementable
updated_at: 2026-04-16
phase: phaseE3a
target_files:
  - docs/actor-runtime-interface/execution-authority-contract-note-v1.md
  - src/cli/commands/agent/emit.ts
  - src/v11/shared/actorProtocol/actorEmitContext.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/pass/passWorkspaceContextPreparation.ts
  - src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts
  - src/v11/shared/askHuman/askHumanRunningStateValidationChecks.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/v11/application/pass/passWorkspaceContextPreparation.test.ts
  - tests/v11/application/askHuman/askHumanWorkspaceContextPreparation.test.ts
  - tests/v11/application/askHuman/askHumanRoutingPreparation.test.ts
  - tests/v11/application/askHuman/askHumanRunningStateValidation.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Foundation Hardening (Phase E3a)

## Current Tree Position (2026-04-16)

1. `E1`, `E2a`, `E2b` es `E2c` lezart predecessor baseline.
2. Ez a task mar csak implementer-lane foundation hardening; nem activation proof.
3. Az `E3b` es `E3c` mar nem nyithat ujra authority-shape dontest.
4. Az `askHuman` command-to-flow mainline activation ownership es a flow-result -> finalization -> public-result projection chain tovabbra is `E3b`.

## L0 - Policy

### Goal

1. Zarja le az implementer wrapper/prep/dispatcher foundationt a lezart canonical execution authority vocabularyn.
2. Tegye explicitte, hogy a minimum canonical execution identity `handoff_id` + explicit `execution_id`.
3. Orizze meg a reviewer/non-implementer `human_question` baseline-t.

### Canonical Contract Anchors

1. `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`
2. `docs/pairflow-initial-design.md`
3. `src/types/protocol.ts`
4. `src/cli/commands/agent/emit.ts`
5. `src/v11/shared/actorProtocol/actorEmitContext.ts`

### Closed Terms

1. Canonical authority source: top-level `execution_context`.
2. Canonical execution identity: `handoff_id` + `execution_id`.
3. Guard fields: `expected_role`, `expected_round`, `expected_state_fingerprint`.
4. Guard rule: a guard mezok fail-closed verification mezok, nem authority replacementek.
5. Compat rule: a workspace/CWD lookup csak teljes canonical context exact rehydration bridge lehet.
6. Successor-owned activation chain: a `command-to-flow mainline` -> `delivery outcome normalization` -> `flow-result -> finalization -> public-result` lanc `E3b` ownership, nem `E3a`.

### Domain / Control Model Summary

1. Az implementer lane sem kaphat role-local authority shortcutot.
2. A public `agent emit` surface nem nyithat explicit target-authority API-t.
3. `E3a` ownership a wrapper/prep/dispatcher same-authority foundationre korlatozodik; nem owns-olja az activation-owned flow-result -> finalization -> public-result chain closurejat.
4. `authoritativeContext` primary route marad; a compat lookup csak secondary rehydration bridge.
5. A dispatcher fallback csak preserved-baseline compatibility route lehet ugyanazon canonical execution identity menten.
6. Hianyzo vagy mismatched `execution_id` fail-closed; guard mismatch szinten fail-closed.

### In Scope

1. Implementer wrapper route hardening `pass` es implementer-origin `human_question` esetekre.
2. `authoritativeContext` primary route es workspace-prep same-authority lock.
3. CLI emit authority surface target-authority reopen nelkuli megorzese.
4. Dispatcher fallback explicit preserved-baseline policyja.
5. Non-implementer `human_question` baseline preservation.

### Out of Scope

1. Fresh activation proof vagy projection redesign.
2. Duplicate/restart/stale parity.
3. Reviewer/meta-reviewer rollout.
4. Az activation-owned `askHuman` `command-to-flow mainline`, `delivery outcome normalization`, es `flow-result -> finalization -> public-result` chain ownership; ez `E3b`, nem a baseline-preserving running-state guard.
5. Tmux topology vagy adapter redesign.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical identity | `handoff_id` + explicit `execution_id` a minimum canonical execution identity. | Az `execution_id` nem tolhato guard vagy compat szerepbe. | P1 | required-now |
| Guard rule | `expected_role`, `expected_round`, `expected_state_fingerprint` csak fail-closed guard. | Guard-preservation megengedett, authority substitution nem. | P1 | required-now |
| Compat rule | CWD/workspace lookup csak exact rehydration bridge lehet. | Nincs `handoff_id`-only compat authority. | P1 | required-now |
| Non-implementer baseline | Reviewer/non-implementer `human_question` baseline preserved marad. | `E3a` nem csinalhat implementer-only emit surface-t. | P1 | required-now |
| Activation boundary | Az `askHuman` `command-to-flow mainline`, `delivery outcome normalization`, es `flow-result -> finalization -> public-result` chain ownership `E3b`-ben marad. | `E3a` csak wrapper/prep/dispatcher same-authority foundationt zarhat; a successor-owned activation chainhez csak a canonical authority foundationt orokiti, maga a chain nem `E3a` call-site/test ownership. | P1 | required-now |
| Phase boundary | `E3a` csak foundation hardeninget owns-ol. | `E3b`/`E3c` nem hozhat uj authority-shape dontest. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/emit.ts` | parse/run bridge | `--execution-id` kotelezo, nem lehet derived, es nem lehet azonos a `handoff_id`-val | P1 | required-now | T1 |
| CS2 | `src/v11/shared/actorProtocol/actorEmitContext.ts` | authority materialization | a snapshot explicit `handoff_id` + `execution_id` canonical identityt materializal; a guardok kulon fail-closed mezok maradnak | P1 | required-now | T1, T2 |
| CS3 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | wrapper routing + dispatcher | implementer `pass` es implementer-origin `human_question` ugyanarra a canonical authority route-ra all; dispatcher fallback csak preserved baseline compatibility route | P1 | required-now | T2, T4 |
| CS4 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | pass/human forwarders | a canonical execution identity es a guardok pontosan tovabbmennek; nincs field loss vagy reinterpretation | P1 | required-now | T2 |
| CS5 | prep files | workspace prep | `authoritativeContext` primary; compat lookup csak exact rehydration bridge | P1 | required-now | T3 |
| CS6 | `src/v11/shared/askHuman/askHumanRunningStateValidationChecks.ts` | running-state guard | reviewer allowed / `meta_reviewer` forbidden baseline preserved marad; ez baseline guard seam, nem activation-owned finalization/public-result chain | P1 | required-now | T4 |

### 2) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | CLI es context parser explicit execution authorityt ker | missing, empty vagy derived `execution_id` fail-closed | P1 | required-now | automated test |
| T2 | wrapper route canonical authority parity | `pass` es implementer-origin `human_question` ugyanazt a canonical execution identityt viszi tovabb | P1 | required-now | automated test |
| T3 | compat bridge only exact rehydration | a compat lookup teljes snapshotot rehidrat, de nem hoz letre kulon authority route-ot | P1 | required-now | automated test |
| T4 | non-implementer `human_question` baseline preserved | reviewer allowed marad, `meta_reviewer` tiltott marad, implementer-only szukites nincs | P1 | required-now | automated test |

## L2 - Implementation Notes

1. Ha a dispatcher fallback szukitese felmerul, az kulon successor decision; ez a task ezt nem vezetheti be csendesen.
2. Ha activation vagy parity csak uj authority-vocabularyval tunik implementalhatonak, akkor a higher-level docs reconciliation hianyzik.
3. Ha az `askHuman` `command-to-flow mainline`, `delivery outcome normalization`, vagy a `flow-result -> finalization -> public-result` chain ownership latszik szuksegesnek, az `E3b` scope, nem `E3a` correction.
