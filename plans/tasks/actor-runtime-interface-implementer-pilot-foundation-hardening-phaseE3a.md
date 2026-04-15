---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_foundation_hardening_phaseE3a_v1
title: "Actor Runtime Interface Implementer Pilot Foundation Hardening (Phase E3a)"
status: implementable
updated_at: 2026-04-15
phase: phaseE3a
target_files:
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

## Current Tree Position (2026-04-15)

1. A current tree-ben az `E1`, `E2a`, `E2b` es `E2c` predecessor closurek mar merged/allapotban lezartak; ez a task a kovetkezo elo implementation target az implementer lane-en.
2. Emiatt az `E3a` ownershipje szandekosan szuk: wrapper routing, authoritative-context-first bridge, workspace-prep same-authority lock, outer dispatcher fallback policy explicit rogzitese, es a non-implementer `human_question` baseline preserved lockja.
3. Az `E3b` es `E3c` csak erre a lezart foundationre epithet ra; ott mar nem nyithato ujra sem az authority-shape, sem a wrapper-model dontes.
4. Local phase-boundary mirror:
   - `authority_contract_foundation_closure`: historical predecessor `E1`
   - `delivery_launch_producer_closure`: historical predecessor `E2a`
   - `internal_execution_closure`: historical predecessor `E2b`
   - `read_model_diagnostics_fallout_closure`: historical predecessor `E2c`
   - `workflow_orchestration_closure`: current open task (`E3a` implementer wrapper/authority foundation hardening); owned slice = wrapper routing + authoritative-context-first bridge + workspace-prep same-authority lock + outer dispatcher fallback policy explicit rogzitese + non-implementer `human_question` baseline preserved lockja
   - `activation_closure`: successor task (`E3b` implementer pilot activation); fresh-path activation only, authority- vagy wrapper-shape reopen tiltott
   - `cleanup_recovery_closure`: successor tasks (`E3c` implementer pilot parity + fail-closed hardening, majd `E4` reviewer + meta-reviewer rollout / retained adapter cleanup)
5. Review source-of-truth:
   - a jelenlegi bubble worktree docs-allapota a candidate authority,
   - korabbi approval-ready snapshot csak historical context, nem aktiv review baseline.

## L0 - Policy

### Goal

1. Szukitse bounded foundation slice-ra az implementer pilotot ugy, hogy az implementer `pass` es `human_question` canonical wrapper/authority route-ja review-stabil legyen meg az aktiv pilot claim elott.
2. Tegye explicitte, hogy az implementer emit bridge authoritative-context-first modellen all, es a compat workspace lookup legfeljebb bridge marad, nem alternativ canonical authority.
3. Keszitse elo az `E3b` activation taskot es az `E3c` parity hardening taskot ugy, hogy egyikben se kelljen ujra authority- vagy wrapper-shape dontest hozni.
4. Rogzitse explicitten, hogy ez a hardening az implementer pilot path ownershipje; nem teheti implementer-only surface-sze a jelenlegi `human_question` / human-gate baseline-t mas role-ok szamara.

### Domain / Control Model Summary

1. Business invariant: az implementer pilot path sem kaphat role-local authority shortcutot; ugyanarra az explicit execution-scoped authority modellre kell allnia, mint a kesobbi role-oknak.
2. Control model: a canonical implementer emit route explicit authoritative contexten fut, nem cwd/pane/prompt jeleken.
3. Read-path rule: a wrapper authority truth csak `ActorEmitContextSnapshot`-bol es ugyanennek tovabbitott guardjaibol johet.
4. Forbidden fallback:
   - nincs implicit target-authority override API,
   - nincs cwd-only canonical authority,
   - nincs implementer-lane kulon `human_question` shortcut authority modell.
5. Allowed resolution path:
   - canonical `agent emit` surface marad,
   - authoritative context materialization megengedett ugyanazon bubble/execution authority chainen,
   - a compat workspace lookup csak bridge lehet,
   - a jelenlegi non-implementer `human_question` / human-gate baseline preserved marad, amig egy kulon successor task explicit nem rendelkezik rola.
6. Missing-data rule: hianyzo vagy mismatched authority fail-closed.
7. Phase boundary:
   - authority foundation predecessorbol orokolt, de implementer-route hardening itt owned,
   - outer dispatcher fallback routing explicit policy-surface; preserved-baselinekent vagy explicit tightening targetkent kell nevezni, nem maradhat hallgatozo implicit dontes,
   - runtime activation deferred `E3b`,
   - parity/fail-closed proof deferred `E3c`,
   - reviewer/meta-reviewer rollout deferred `E4`.

### Authority Boundary Map

1. `authority_producer`
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - CLI bridge via `src/cli/commands/agent/emit.ts`
2. `workflow_orchestration_consumers`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/pass/passWorkspaceContextPreparation.ts`
   - `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts`
   - `src/v11/shared/askHuman/askHumanRunningStateValidationChecks.ts`
   - outer dispatcher fallback routing policy az `emitActorProtocolV11` dispatcher seam-en
3. `cleanup_recovery_consumers`
   - none owned here; restart parity deferred

### In Scope

1. Implementer wrapper route hardening az implementer pilot `pass` es implementer-origin `human_question` path eseten.
2. Authoritative-context-first bridge es workspace-prep same-authority lock.
3. CLI emit surface target-authority reopen nelkuli megorzese.
4. Outer dispatcher fallback routing policy explicit rogzitese az implementer foundation ownership mellett.
5. A kapcsolodo wrapper/bridge/prep/running-state baseline-preservation tesztek alignmentje.

### Out of Scope

1. Duplicate delivery enforcement parity.
2. Restart recovery parity closure.
3. Tmux ack/provenance containment beyond baseline preservation.
4. Barmilyen implementer pilot activation claim.
5. Reviewer/meta-reviewer rollout.
6. Reviewer vagy mas non-implementer `human_question` / human-gate baseline atirasa vagy implementer-only szukitese.

### Safety Defaults

1. Ha a foundation hardening es a current compat bridge kozott feszules van, a canonical same-authority path maradjon, es a compat path szukuljon.
2. Ha az implementer `pass` es implementer-origin `human_question` kulon authority shape-et igenyelne, a task nem ready; ilyen shortcut nem engedelyezett.
3. Ha a hardening csak ugy lenne elerheto, hogy a jelenlegi non-implementer `human_question` baseline implementer-only surface-sze szukul, a task nem ready; ez kulon successor dontes nelkul regresszio.
4. Ha valamely activation vagy runtime parity bizonyitas uj authority-shape dontest kenyszeritene, az mar `E3b`/`E3c` blocker, es az `E3a` ownershipje nem bovitheto activation, duplicate-delivery vagy restart-recovery closure iranyaba.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - actor emit authority contract
   - implementer wrapper routing contract
   - pass / ask-human workspace preparation authority handoff contract
   - ask-human running-state role-eligibility baseline contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split note:
   - a runtime activation closure explicitten deferred `E3b`,
   - a parity/fail-closed hardening closure explicitten deferred `E3c`,
   - ez a task csak a wrapper/authority foundation hardeninget owns-olja: wrapper routing + authoritative-context-first bridge + workspace-prep same-authority lock + explicit dispatcher policy + non-implementer baseline preservation.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Implementer route nem lehet authority shortcut. | Az implementer `pass` es implementer-origin `human_question` ugyanarra a wrapper modellre all. | P1 | required-now |
| Control model | Explicit authoritative context az egyetlen canonical route. | A compat bridge csak bridge maradhat. | P1 | required-now |
| Forbidden fallback | Nincs cwd-only, pane-only vagy target-override authority. | Fail-closed mismatch eseten. | P1 | required-now |
| Missing-data rule | Authority hiany explicit hiba. | Nincs heuristic reroute. | P1 | required-now |
| Non-implementer baseline | A jelenlegi reviewer/non-implementer `human_question` baseline nem szukulhet neman. | `E3a` nem teheti implementer-only surface-sze a `HUMAN_QUESTION` emitet. | P1 | required-now |
| Dispatcher policy | Az outer dispatcher fallback routing explicit policy-surface. | Retained vagy tightened statuszat a tasknak ki kell mondania. | P1 | required-now |
| Phase boundary | `E3a` csak foundation hardeninget owns-ol. | `E3b`/`E3c` nem nyithat ujra authority- vagy wrapper-shape dontest. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/emit.ts` | parse/run bridge | A public emit surface ne nyisson explicit target-authority API-t. | P1 | required-now | T1, T4 |
| CS2 | `src/v11/shared/actorProtocol/actorEmitContext.ts` | authority materialization | Same-authority context explicit es fail-closed maradjon. | P1 | required-now | T1, T3 |
| CS3 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | implementer wrapper routing + outer dispatcher fallback policy | Az implementer `pass` es implementer-origin `human_question` ugyanazon wrapperen menjen; a non-implementer `human_question` baseline retained/tightened statusza explicit maradjon. | P1 | required-now | T1, T2, T5 |
| CS4 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | pass/human forwarders | Mindket emit ugyanazt az authoritative contextet vigye tovabb. | P1 | required-now | T2 |
| CS5 | `src/v11/application/pass/passWorkspaceContextPreparation.ts` | prep path | Authoritative-context branch first-class canonical route legyen. | P1 | required-now | T2, T3 |
| CS6 | `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts` | prep path | Ugyanaz a same-authority branch ervenyes, mint `pass` eseten. | P1 | required-now | T2, T3 |
| CS7 | `src/v11/shared/askHuman/askHumanRunningStateValidationChecks.ts` | running-state role eligibility guard | A reviewer/non-implementer `human_question` baseline explicit guardon maradjon: reviewer megengedett, csak `meta_reviewer` tiltott. | P1 | required-now | T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Implementer authority input | explicit mezok leteznek | same-authority route explicit primary | public surface preserved | P1 | required-now |
| Wrapper invocation | wrapper letezik | wrapper route bounded foundation lock marad | compatible hardening | P1 | required-now |
| Workspace prep authority handoff | authoritativeContext opcionális | authoritativeContext canonical branch, cwd bridge secondary | compatible hardening | P1 | required-now |

Normative rules:

1. A task nem vezethet be uj public CLI opciot explicit target authority megadasara.
2. Az implementer lane-en a `human_question` nem kaphat kulon authority modellt a `pass`-tol elteroen.
3. A task nem teheti implementer-only surface-sze a `human_question` emitet; reviewer vagy mas non-implementer same-authority human-gate baseline csak explicit kulon successor taskban modosithato.
4. Az outer dispatcher fallback routing policyjat explicitten preserved-baselinekent vagy explicit tightening targetkent kell nevezni; nem maradhat neman `E3b`-re vagy `E3c`-re tolva.
5. A task nem claimelhet runtime activation closure-t.

Static successor-lock criteria:

1. Az `E3a` artifactnek explicitten rogzitenie kell, hogy az `E1`-`E2c` predecessor closurek lezart baseline-kent oroklodnek.
2. Az `E3a` artifactnek explicitten rogzitenie kell, hogy sajat ownershipje wrapper routingra, authoritative-context-first bridge-re, workspace-prep same-authority hardeningre, outer dispatcher fallback policy explicit rogzitesere es a non-implementer `human_question` baseline preserved lockjara szukul.
3. Az `E3a` artifactnek explicitten rogzitenie kell, hogy az `E3b` mar nem nyithat ujra authority- vagy wrapper-shape dontest, csak activation closuret owns-olhat, az `E3c` pedig csak parity/fail-closed hardening closuret.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| authority hianyzik vagy mismatched | throw | nincs fallback | P1 | required-now |
| compat path authority shortcutot igenyelne | throw | route marad explicit bridge | P1 | required-now |
| non-implementer `human_question` baseline csak implicit szukitessel tarthato fenn | result: a task/spec ebben a formaban nem implementation-ready | nincs local shortcut; preserve-baseline vagy explicit successor-task decision kell | P1 | required-now |
| dispatcher fallback policy implicit maradna | result: a task/spec ebben a pontban hianyos | a retained vagy tightened statuszt explicitten rogziteni kell | P1 | required-now |
| activation/parity igeny uj foundation dontest nyitna | result: scope blocker, amelyet nem az `E3a` owns-ol | explicit blocker handoff `E3b`/`E3c`-re vagy uj sequencing dontesre | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | implementer `pass` wrapper same-authority contexttel fut | a `pass` emit/wrapper route ugyanazt az explicit execution-context authorityt viszi tovabb az implementer pathon, masodik implementer authority anyagositasi ut nelkul | P1 | required-now | targeted automated test (`pass` wrapper same-authority route) |
| T2 | implementer `human_question` ugyanazon modellen fut | a `human_question` emit/wrapper route ugyanahhoz a same-authority contexthez kotott, mint a `pass`, kulon role-local authority shortcut vagy alternate prep branch nelkul | P1 | required-now | targeted automated test (`human_question` same-authority route) |
| T3 | stale vagy conflicting authority fail-closed | stale vagy conflicting authority mellett az emit explicit authority/context mismatch hibaval rejectelodik, es a wrapper/prep seam nem reroute-ol alternativ implementer authorityra | P1 | required-now | targeted automated test (mismatch fail-closed) |
| T4 | CLI emit surface nem reopeneli a target-authority API-t | a public `agent emit` surface tovabbra sem parse-ol vagy fogad uj target-authority override bemenetet, es csak explicit canonical execution-context authorityval ervenyes | P1 | required-now | targeted automated test (CLI surface lock) |
| T5 | non-implementer `human_question` baseline preserved | az `E3a` hardening nem szukiti implementer-only surface-sze a jelenlegi reviewer/non-implementer same-authority `human_question` baseline-t: a dispatcher retained/tightened policy explicitten vedett, es a running-state role guard reviewer allowed / `meta_reviewer` forbidden baseline-en marad | P1 | required-now | targeted automated tests (`human_question` non-implementer baseline preservation, `ask-human` running-state role guard) |

### 5) Spec Lock

Task allapot tovabbra is `implementable`, ha a dokumentum szovege es a bounded implementation seam-ek ugyanarra a foundation slice-ra zarodnak:

1. a `Current Tree Position` blokk explicitten `E1`-`E2c` lezart predecessor closurekent hivatkozza a current-tree alapot;
2. az `In Scope` blokk pontosan ezt az ot ownershipelemet tartalmazza: implementer wrapper route hardening `pass` es `human_question` eseten; authoritative-context-first bridge es workspace-prep same-authority lock; CLI emit surface target-authority reopen nelkuli megorzese; outer dispatcher fallback routing policy explicit rogzitese; kapcsolodo wrapper/bridge/prep/running-state baseline-preservation teszt alignment;
3. a `Call-site Matrix` es a `target_files` ugyanazt a bounded seam-setet tukrozi: `src/cli/commands/agent/emit.ts`, `src/v11/shared/actorProtocol/actorEmitContext.ts`, `src/v11/application/actorProtocol/emitActorProtocolV11.ts`, `src/v11/application/actorProtocol/actorProtocolEmitters.ts`, `src/v11/application/pass/passWorkspaceContextPreparation.ts`, `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts`, `src/v11/shared/askHuman/askHumanRunningStateValidationChecks.ts`;
4. az `In Scope` es `Call-site Matrix` explicitten kimondja, hogy az implementer wrapper hardening nem szukitheti neman a non-implementer `human_question` baseline-t, es ezt nemcsak dispatcher-policy, hanem a reviewer/non-implementer `ask-human` running-state role guard explicit baselinejekent is nevesiti;
5. az `Out of Scope` blokk explicitten felsorolja legalabb ezeket a kizart closureket: duplicate delivery parity; restart recovery parity; tmux ack/provenance containment beyond baseline preservation; implementer pilot activation claim; reviewer/meta-reviewer rollout; reviewer vagy mas non-implementer `human_question` baseline rewrite;
6. a `Static successor-lock criteria` 3. pontja explicitten kimondja, hogy az `E3b` ownershipje activation closure-re, az `E3c` ownershipje pedig parity/fail-closed hardening closure-re szukul, es egyik sem nyithat ujra authority- vagy wrapper-shape dontest; ezt a `Current Tree Position` local successor sorai is ugyanigy tukrozik.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a bridge egyszerusitesehez tovabbi role-shared helper kell, azt mar `E4` alatt erdemes altalanositani.
