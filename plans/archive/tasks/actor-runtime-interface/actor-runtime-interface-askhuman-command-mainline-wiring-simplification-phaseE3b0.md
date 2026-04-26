---
artifact_type: task
artifact_id: task_actor_runtime_interface_askhuman_command_mainline_wiring_simplification_phaseE3b0_v1
title: "Actor Runtime Interface AskHuman Command Mainline Wiring Simplification (Phase E3b0)"
status: superseded
updated_at: 2026-04-16
phase: phaseE3b0
target_files:
  - src/v11/application/askHuman/askHumanCommandApi.ts
  - src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts
  - src/v11/application/askHuman/askHumanCommandOrchestration.ts
  - src/v11/application/askHuman/askHumanCommandOrchestrationInvocationBuilder.ts
  - src/v11/application/askHuman/askHumanCommandOrchestrationDependencyBuilder.ts
  - src/v11/application/askHuman/askHumanFlowDependencyWiring.ts
  - src/v11/application/askHuman/askHumanFlowStepDependencyWiring.ts
  - src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts
  - src/v11/shared/askHuman/askHumanCommandFlowRuntimeDependencies.ts
  - src/v11/shared/askHuman/askHumanFlowInvocationBuilders.ts
  - src/v11/shared/askHuman/askHumanCommandFlowDependencyInputBuilder.ts
  - src/v11/shared/askHuman/askHumanCommandFlowDependencyWiringInputBuilder.ts
  - tests/v11/application/askHuman/emitAskHumanV11.test.ts
  - tests/v11/application/askHuman/askHumanCommandOrchestration.test.ts
  - tests/v11/application/askHuman/askHumanCommandOrchestrationInvocationBuilder.test.ts
  - tests/v11/application/askHuman/askHumanCommandOrchestrationDependencyBuilder.test.ts
  - tests/v11/application/askHuman/askHumanFlowDependencyWiring.test.ts
  - tests/v11/application/askHuman/askHumanFlowStepDependencyWiring.test.ts
  - tests/v11/application/askHuman/runAskHumanFlow.test.ts
  - tests/core/agent/askHuman.test.ts
prd_ref: null
plan_ref: plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface AskHuman Command Mainline Wiring Simplification (Phase E3b0)

## Superseded Review Note (2026-04-16)

1. A task kulon predecessor-szeletkent lett megnyitva azzal a celdal, hogy a public `askHuman` command-to-flow wiring explicittebb es rovidebb ownership-seamre zarhato legyen meg az activation elott.
2. A current-tree code-read es a sikertelen refine-korok alapjan ez a vagas nem bizonyult stabil, onallo implementalhato closure-nek:
   - a legtobb erintett command/orchestration/builder file thin forwarding vagy dependency-plumbing reteg,
   - a valos ownership-hatar nem ezek strukturai roviditesenel, hanem az implementer `human_question` activation-result bounded mainline-janal zarul,
   - standalone refaktorkent a task vagy no-op cleanupba csuszik, vagy belelog az `E3b` activation/projection contractjaiba.
3. Emiatt ez az artifact `superseded`: az esetlegesen szukseges minimalis command-to-flow mainline explicitte tel az `E3b` activation-owned bounded closure resze.
4. A task historical traceabilitykent marad meg:
   - broad builder/plumbing cleanup tovabbra sem nyithato `E3b` cimen,
   - authority-, wrapper-, result-shape vagy parity/recovery dontes tovabbra sem csuszhat ide vissza.

## L0 - Policy

### Goal

1. Egyszerusitse az `askHuman` implementer command-to-flow mainline wiringjat a jelenlegi behavior valtozatlan megtartasa mellett.
2. Tegye egyertelmuve, hogy a public command entrytol a `runAskHumanFlow`-ig vezeto bounded mainline hol all ossze, hogy az `E3b` activation task mar ne implicit builder/plumbing retegekrol vitatkozzon.
3. Tartsa valtozatlanul a jelenlegi authority-, delivery- es result-contract baseline-t; ez a task refactor/foundation, nem activation vagy parity hardening.

### Domain / Control Model Summary

1. Business invariant: a `human_question` implementer path ugyanazt az explicit same-authority + explicit delivery/provenance igazsagot tartsa meg a refaktor utan is.
2. Control model: a truth tovabbra is a jelenlegi `askHuman` execution/finalization/delivery chainbol jon; a wiring egyszerusites nem vezethet be uj authority- vagy delivery-forrast.
3. Read-path rule: a refaktor csak a public command entry -> orchestration -> flow dependency osszeallitas seamjeit egyszerusitheti; a `delivery` projection tovabbra is a meglvo producer/finalization pathrol olvashato.
4. Forbidden fallback:
   - nincs uj shortcut, amely megkeruli a canonical command -> orchestration -> `runAskHumanFlow` utat,
   - nincs uj implicit default vagy route-local heurisztika a runtime notification dependencies feloldasara,
   - nincs uj authority vagy delivery truth pane activitybol, CLI contextbol vagy builder-local bool shortcutbol.
5. Allowed resolution path:
   - a jelenlegi public command input ugyanarra a canonical orchestration pathra mehet,
   - a runtime notification override-ok explicitten tovabbra is optionalak maradhatnak,
   - a wiring retegek osszevonasa megengedett, ha a public command contract, a `RunAskHumanFlow` dependency shape es a `delivery` projection szemantikaja valtozatlan marad.
6. Missing-data rule: ha optional runtime notification dependency nincs megadva, a refaktor utan sem keletkezhet uj success-shaped vagy forced-default shape; az omitted override tovabbra is omitted marad.
7. Phase boundary:
   - contract closure: preserved baseline itt
   - producer closure: predecessor baseline (`E2a`/`E2b`)
   - internal execution closure: bounded refactor itt
   - workflow/orchestration closure: bounded refactor itt
   - read-model closure: successor `E3b`
   - activation closure: successor `E3b`
   - cleanup/recovery closure: successor `E3c`

### Authority Boundary Map

1. Authority producer: inherited explicit `state.execution_context` + `ActorEmitContextSnapshot` chain from `E1`/`E3a`.
2. Stored authority: bubble state snapshot fingerprint + execution-context mezok; uj persisted authority nincs ebben a taskban.
3. In-scope consumers:
   - `workflow_orchestration_consumers`: public `askHuman` command entrytol a `runAskHumanFlow`-ig tarto orchestration/wiring seam
   - `internal_execution_consumers`: a `runAskHumanFlow` dependency-osszeallitasi entry seam
4. Explicit out-of-scope consumers:
   - `read_model_consumers`: activation/result consume semantics tovabbi szukitese
   - `cleanup_recovery_consumers`: stale/duplicate/restart parity, retry, fail-closed recovery
   - reviewer/meta-reviewer actor pathok
5. Export surfaces closed in this phase: `no`; a task csak foundation/refactor closure, nem uj activation export.

### Baseline Preservation

1. Must-preserve behaviors:
   - a public `emitAskHumanFromWorkspace` entry viselkedese valtozatlan marad;
   - a `runAskHumanFlow` tovabbra is ugyanabban a sorrendben hajtja vegre az execution -> finalization lepeseket;
   - az optional runtime notification override-ok tovabbra is optionalak maradnak;
   - a `delivery` projection shape es a `tmux_send_failed` normalizalas valtozatlan marad.
2. Allowed resolution paths:
   - a thin builder/wiring retegek osszevonhatok vagy athelyezhetok, ha ugyanaz a deterministic same-authority path marad ervenyben;
   - a command runtime notification dependency forwarding tovabbra is explicit optional override-path maradhat.
3. Forbidden regression interpretations:
   - a refaktor nem nevezheti at a wiring egyszerusitest activation closure-ra;
   - a refaktor nem dobhatja el a meglevo optional override omission-semantikat csak azert, mert kevesebb builder marad;
   - a refaktor nem rejtheti el implicit helperbe a canonical mainline ownershipet ugy, hogy a valos command-to-flow seam ujra bizonytalanna valjon.
4. Replacement proof required if removed:
   - ha egy named builder/wiring seam kikerul, explicit proof kell arra, hogy a replacement path ugyanazt a command input, dependency forwarding es finalization call-order baseline-t tartja.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `consumer_family_alignment`
2. Secondary shape (if any): `contract_or_persisted_authority_foundation`
   Bounded proof: a task nem valtoztat producer vagy activation behavioron; ugyanazon command/orchestration consumer csalad wiringjat egyszerusiti es a meglevo internal contractokat preserved baselinekent rogziti.
3. Preconditions that must pass before side effects:
   - a public `EmitAskHumanInput` / `EmitAskHumanResult` shape valtozatlan maradjon,
   - a `RunAskHumanFlowDependencies` optional notification override semantics valtozatlan maradjon,
   - az execution -> finalization sorrend ne valtozzon.
4. Side effects forbidden before preconditions pass:
   - nincs uj runtime behavior activation,
   - nincs uj delivery emit vagy bubble notification default,
   - nincs uj error/fallback reason code.
5. Invalid/precondition-failure behavior: zero behaviorvaltozas; a refaktor vagy bizonyitottan parity-tarto, vagy nem implementalhato ebben a taskban.
6. Coordination primitives in scope: `N/A`

### In Scope

1. A public `askHuman` command-to-flow mainline wiring explicit, rovidebb ownership-seamme alakitasa.
2. A thin passthrough builder/dependency-wiring retegek osszevonasa vagy athelyezese, ha a behavior valtozatlan marad.
3. A command-level optional runtime notification override plumbing retained, de egyszerubb traceabilityvel.
4. A kapcsolodo unit/integration proof frissitese ugy, hogy a canonical mainline kevesebb indirekt builderen keresztul legyen bizonyitva.

### Out of Scope

1. `delivery` result contract redesign.
2. `RunAskHumanFlowResult` vagy `EmitAskHumanResult` payload-shape valtoztatasa.
3. Implementer activation szabalyok tovabbi szukitese vagy bovitese (`E3b`).
4. Stale/duplicate/restart parity, retry vagy fail-closed hardening (`E3c`).
5. Reviewer/meta-reviewer rollout (`E4`).

### Safety Defaults

1. Ha a wiring egyszerusites csak ugy erheto el, hogy public vagy shared contract shape valtozik, a task fail-closed es kulon follow-up kell.
2. Ha a named mainline a refaktor utan sem nevezheto meg rovidebben es pontosabban, a task nem tekintheto kesznek.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: public `EmitAskHumanInput` -> command/orchestration wiring -> `RunAskHumanFlowInput` / `RunAskHumanFlowDependencies`
   - competing identifiers or fallback identities: builder-local passthrough seams, implicit helper ownership, route-local defaulting
10. Authority/source-of-truth note:
   - canonical source: a meglevo `askHuman` execution/finalization/delivery chain
   - forbidden secondary sources: pane activity, ad-hoc wiring shortcuts, helper-local inferred runtime truth
11. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: internal execution + workflow/orchestration wiring, mert ugyanaz a command-to-flow bounded seam zarja le oket uj behavior nelkul
   - explicitly deferred closures: activation/read-model consume (`E3b`), cleanup/recovery hardening (`E3c`)
12. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `contract_or_persisted_authority_foundation`
   - why this bounded mix is safe: a task preserved-baseline contractok mellett ugyanazon consumer-family wiringot egyszerusiti, es nem nyit uj activation vagy recovery closuret

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | A refaktor utan is ugyanaz az explicit same-authority + explicit delivery/provenance chain marad a `human_question` implementer path truth-forrasa. | Nincs uj authority vagy delivery source. | P1 | required-now |
| Control model | A wiring egyszerusites csak a command/orchestration consumer-family seamet erintheti. | Producer, finalization es public result semantics preserved baseline marad. | P1 | required-now |
| Read-path rule | A `delivery` projection tovabbra is csak a meglvo producer/finalization pathrol johet. | Nincs builder-local projection vagy shortcut result shape. | P1 | required-now |
| Forbidden fallback | Omitted override vagy thin builder removal nem alhat at implicit forced defaultingra. | Az optional runtime notification deps tovabbra is optionalak. | P1 | required-now |
| Allowed resolution path | Thin passthrough retegek osszevonhatok, ha a public command contract, a `runAskHumanFlow` call-order es a dependency forwarding valtozatlan marad. | A refaktor lehet strukturai, de nem szemantikai. | P1 | required-now |
| Missing-data rule | Missing optional runtime notifier utan sincs forced delivery/default path. | Omitted override omitted marad. | P1 | required-now |
| Phase boundary | Ez foundation/refactor predecessor `E3b` elott. | Activation vagy parity claim nem csuszhat ide. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `EmitAskHumanInput` / `EmitAskHumanResult` | public `emitAskHumanFromWorkspace`, v11 wrapper, core ask-human path | `N/A` | exact public contract preservation | activation/result-tightening `E3b` |
| `RunAskHumanFlowDependencies` optional runtime notifier shape | command/orchestration wiring -> `runAskHumanFlow` | `N/A` | optional forwarding preserved while the wiring seam is simplified | broader delivery/compat alignment `E3b` |
| command-to-flow wiring ownership seam | `askHuman` workflow/orchestration consumer family | additive refactor | canonical mainline explicit and shorter | parity/fail-closed hardening `E3c` |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `emitAskHumanFromWorkspace` ugyanarra a command/orchestration pathra route-ol | preserve | wrapper/integration tesztek ugyanazt a result shape-et es message-ref forwardingot bizonyitjak | P1 | required-now |
| `runAskHumanFlow` execution -> finalization sorrend | preserve | direct `runAskHumanFlow` teszt es orchestration teszt unchanged call-order/parity evidence | P1 | required-now |
| optional runtime notification override omission-semantika | preserve | wiring/builder tesztek bizonyitjak, hogy omitted override tovabbra is omitted marad | P1 | required-now |
| `delivery` projection es `tmux_send_failed` normalizalas | preserve | `emitAskHumanV11`, `askHumanFinalization`, `core/agent/askHuman` parity evidence valtozatlan | P1 | required-now |

### 0c) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| wiring simplification a command pathon | public contract, call-order, optional override semantics explicit parity proofja | uj default runtime behavior, uj result shape, uj reason code | zero viselkedesvaltozas; csak parity-preserving refaktor engedelyezett | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/askHuman/askHumanCommandApi.ts` | `emitAskHumanFromWorkspace` | a public command entry ugyanarra a canonical command/orchestration mainline-ra lepjen, kevesebb indirekt wiring seam mellett | P1 | required-now | T1, T5 |
| CS2 | `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts` | `dispatchAskHumanCommandOrchestration` | a dispatch boundary ne tartson fenn kulon implicit runtime-wiring ownershipet | P1 | required-now | T1, T2 |
| CS3 | `src/v11/application/askHuman/askHumanCommandOrchestration.ts` | `orchestrateAskHumanCommand` | a routing-prep utan a flow inditasa explicit, rovidebb named seam-en tortenjen | P1 | required-now | T1, T2 |
| CS4 | `src/v11/application/askHuman/askHumanCommandOrchestrationInvocationBuilder.ts` + `src/v11/application/askHuman/askHumanCommandOrchestrationDependencyBuilder.ts` | invocation/dependency builder seam | thin passthrough ownership vagy megszunik, vagy egyertelmuen canonical wiring pontba olvad | P1 | required-now | T2, T3 |
| CS5 | `src/v11/application/askHuman/askHumanFlowDependencyWiring.ts` + `src/v11/application/askHuman/askHumanFlowStepDependencyWiring.ts` | flow step dependency wiring | a current mainline step-binding explicit maradjon, de ne ket extra indirekt layerben legyen indokolatlanul szetszorva | P1 | required-now | T2, T3 |
| CS6 | `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts` + `src/v11/shared/askHuman/askHumanCommandFlowRuntimeDependencies.ts` | command-flow orchestration/runtime wiring | a `runAskHumanFlow` dependency shape-re vezeto seam rovidebb es auditolhato legyen | P1 | required-now | T2, T3 |
| CS7 | `src/v11/shared/askHuman/askHumanFlowInvocationBuilders.ts` + command-flow dependency input/wiring builderek | flow input + optional override forwarding | optional runtime notifier omission-semantika preserved baseline maradjon | P1 | required-now | T3, T4 |
| CS8 | `src/v11/application/askHuman/runAskHumanFlow.ts` | `runAskHumanFlow` | a refaktor utan is ugyanaz az execution -> finalization sorrend es dependency forwarding marad | P1 | required-now | T2, T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| `EmitAskHumanInput` | public ask-human command input | valtozatlan | non-breaking preserved baseline | P1 | required-now |
| `EmitAskHumanResult` | public ask-human command result with optional `delivery` | valtozatlan | non-breaking preserved baseline | P1 | required-now |
| `RunAskHumanFlowDependencies` optional notifier fields | optional `emitTmuxDeliveryNotification` / `emitBubbleNotification` forwarding | valtozatlan optional semantics, egyszerubb canonical wiringgal | non-breaking preserved baseline | P1 | required-now |
| command-to-flow ownership seam | jelenleg tobb thin builder/wiring layerben implicit | rovidebb, explicit canonical seam | additive refactor only | P1 | required-now |

Normative rules:

1. A task nem valtoztathatja meg a public `askHuman` input/result contractot.
2. A task nem vezetheti be, hogy omitted optional notifier helyett forced default runtime notifier jelenjen meg.
3. A task nem csusztathat activation vagy parity hardening closure-t ebbe a refaktor-taskba.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| optional runtime notifier nincs megadva | result | omitted override marad omitted, nincs forced defaulting | P1 | required-now |
| thin builder seam megszunik | result | replacement pathnak explicit parity-proof kell | P1 | required-now |
| refaktor kozben public contract delta jelenne meg | result | fail-closed; kulon task vagy visszavagas szukseges | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | public `askHuman` command mainline parity | a wrapper/public entry tovabbra is ugyanarra a canonical orchestration pathra megy, valtozatlan result shape-pel | P1 | required-now | targeted automated tests (`emitAskHumanV11`, `askHumanCommandOrchestration`) |
| T2 | command-to-flow wiring simplification parity | a rovidebb wiring seam utan is ugyanaz a routing-prep -> flow -> execution/finalization sorrend marad | P1 | required-now | targeted automated tests (`askHumanCommandOrchestration`, `askHumanCommandOrchestrationInvocationBuilder`, `askHumanCommandOrchestrationDependencyBuilder`, `runAskHumanFlow`) |
| T3 | optional runtime notification override omission/forwarding parity | explicit override tovabbra is atmegy, omitted override tovabbra sem jelenik meg forced defaultkent a wiring seamben | P1 | required-now | targeted automated tests (`askHumanFlowDependencyWiring`, `askHumanFlowStepDependencyWiring`, `askHumanCommandOrchestrationDependencyBuilder`) |
| T4 | builder-level compatibility edge traceability | a megmarado flow invocation/dependency input builderek csak azt a wiring shape-et hordozzak, amit a canonical mainline tenylegesen hasznal | P1 | required-now | targeted automated tests (`askHumanCommandOrchestrationInvocationBuilder`, `askHumanFlowDependencyWiring`) |
| T5 | delivery/result parity retained | a `delivery` projection, message-ref forwarding es `tmux_send_failed` normalizalas valtozatlan marad | P1 | required-now | targeted automated tests (`emitAskHumanV11`, `runAskHumanFlow`, `core/agent/askHuman`) |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a command-to-flow wiring egyszerusites utan marad tovabbi thin helper, azt csak akkor erdemes tovabb bontani, ha explicit ownership-zavart okoz egy koveto taskban.
2. [later-hardening] Ha a refaktor utan a canonical mainline mar egyetlen named seamre zarhato, az `E3b` task call-site matrixa visszaszukitheto a valoban activation-owned pathokra.
