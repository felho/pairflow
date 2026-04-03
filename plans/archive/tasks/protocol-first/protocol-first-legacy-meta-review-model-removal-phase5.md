---
artifact_type: task
artifact_id: task_protocol_first_legacy_meta_review_model_removal_phase5_v3
title: "Protocol-First Legacy Meta-Review Model Removal (Phase 5)"
status: completed
phase: phase5
target_files:
  - src/types/bubble.ts
  - src/types/ui.ts
  - src/core/state/**
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewExecutionContext.ts
  - src/core/bubble/statusBubble.ts
  - src/core/bubble/listBubbles.ts
  - src/core/bubble/pendingApprovalSignal.ts
  - src/core/bubble/deleteBubble.ts
  - src/core/bubble/workspaceResolution.ts
  - src/core/bubble/bubbleLookup.ts
  - src/core/bubble/repoResolution.ts
  - src/core/runtime/watchdog.ts
  - src/core/runtime/pairflowCommand.ts
  - src/core/runtime/reviewerCommandGateGuidance.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/core/ui/presenters/bubblePresenter.ts
  - src/core/ui/router.ts
  - src/cli/index.ts
  - src/index.ts
  - src/cli/orchestra.ts
  - src/cli/commands/agent/emit.ts
  - src/cli/commands/agent/pass.ts
  - src/cli/commands/agent/askHuman.ts
  - src/cli/commands/agent/converged.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/cli/commands/bubble/approve.ts
  - src/cli/commands/bubble/requestRework.ts
  - src/v11/application/metaReview/**
  - src/v11/application/list/**
  - src/v11/application/pass/**
  - src/v11/application/reconcile/**
  - src/v11/application/status/**
  - src/v11/application/askHuman/**
  - src/v11/application/converged/**
  - src/v11/domain/pass/**
  - src/v11/shared/metaReview/**
  - src/v11/shared/metaReviewGate/**
  - src/v11/shared/approval/**
  - src/v11/shared/askHuman/**
  - src/v11/shared/converged/**
  - src/v11/shared/status/**
  - src/v11/shared/start/**
  - src/v11/shared/watchdog/**
  - ui/src/**
  - README.md
  - docs/pairflow-initial-design.md
  - docs/pairflow-ui-prd.md
  - docs/meta-review-gate-prd.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/meta-review-gate-e2e-validation.md
  - tests/core/state/**
  - tests/core/bubble/**
  - tests/core/human/**
  - tests/core/runtime/**
  - tests/core/ui/**
  - tests/cli/**
  - tests/contracts/v11/**
  - tests/v11/application/approval/**
  - tests/v11/application/askHuman/**
  - tests/v11/application/converged/**
prd_ref: null
plan_ref: plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md
  - plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md
owners:
  - "felho"
---

# Task: Protocol-First Legacy Meta-Review Model Removal (Phase 5)

## L0 - Policy

### Goal

Eltavolitani a Phase 4 utan is aktiv legacy meta-review lifecycle, approval-compatibility, CLI alias, UI/status es docs maradvanyokat ugy, hogy a runtime, a UI es az active docs mar csak a protocol-first, role-neutral bubble modellrol beszeljenek.

Phase 5 akkor sikeres, ha:

1. nincs canonical `META_REVIEW_RUNNING`, `META_REVIEW_FAILED` vagy `READY_FOR_APPROVAL` domain allapot,
2. nincs actor-facing retained `pass`, `ask-human`, `converged` vagy `orchestra` compatibility path,
3. a canonical actor write path csak explicit `repo` + `bubble_id` + `handoff_id` authorityval mukodik,
4. active docs, help, UI es fixtures nem tanitjak vagy renderelik a legacy modellt.

### Context

1. A plan Phase 5 exit criteria-je a legacy lifecycle es compatibility branch-ek teljes kivezeteset irja elo.
2. A checked-in Phase 4 inventory mar rogzitette, hogy a retained `bubble meta-review submit` write path nem maradt vedheto, ezert azt Phase 5-ben nem szabad ujranyitni vagy implicit opciokent kezelni.
3. A jelenlegi repo gyors inventory-ja szerint a legacy `META_REVIEW_*` es `READY_FOR_APPROVAL` modell tovabbra is aktiv surface-eken latszik:
   - domain/state/runtime code,
   - core UI presenter/router/list/detail es UI state vocabulary/action matrix,
   - approval eligibility/pending signal projection,
   - status/list/reconcile/delete projection surface-ek,
   - retained agent command/export/help/prompt es reviewer runtime guidance surface-ek,
   - README es active docs,
   - CLI/status/help szovegek es contract fixtures.
4. Emiatt a Phase 5 feladat mar nem architectura-tervezes, hanem inventory-first cleanup es contract tightening.

### In Scope

1. A canonical lifecycle enum, schema, transition es status projection Phase 5 vegallapotra szukitese:
   - nincs `META_REVIEW_*`,
   - nincs `READY_FOR_APPROVAL`,
   - a meta-review actor legfeljebb generic running context/projection.
2. Approval es request-rework cleanup:
   - nincs legacy approval-compatibility branch,
   - nincs transcript- vagy status-level fallback a regi allapotokra.
3. Actor-facing CLI cleanup:
   - removed marad a `bubble meta-review submit`,
   - a retained `pass`, `ask-human`, `converged`, `orchestra` aliases kivezetese vagy explicit removal errorra allitasa.
4. Canonical actor-context cleanup:
   - a `pairflow agent emit` es minden canonical actor write path explicit contextet kovetel,
   - nincs actor-write fallback `cwd`, worktree ancestry vagy env alapjan.
5. UI/store/presenter/action matrix cleanup a final canonical state vocabulary-ra.
6. Active docs/help/runbook cleanup:
   - a README es active docs mar nem tanitjak a Phase 4 compatibility surface-t,
   - historical hivatkozas legfeljebb archive/reference kontextusban maradhat.
7. Test, fixture es parity cleanup:
   - nincs olyan golden path vagy contract case, amely mar csak legacy compatibilityt ved.
8. Active runtime guidance es retained export surface cleanup:
   - a startup/resume/tmux guidance nem tanithat retained alias commandot canonical vagy co-canonical utnak,
   - a retained top-level export/help surface-ek explicit removal policyval vagy fail-closed coverage-del zarulnak.

### Explicit Phase 5 Decision

1. A `bubble meta-review submit` write path nem Phase 5 decision point; Phase 4-ben mar removednek tekintendo, es erre Phase 5-ben regresszio-orzo coverage kell, nem uj design vita.
2. A `bubble meta-review run|status|last-report|recover` operator surface Phase 5-ben csak akkor maradhat a jelenlegi spellinggel, ha:
   - operator-only marad,
   - nem kovetel legacy lifecycle allapotot,
   - nem tanit actor-facing vagy state-special-case semantics-et,
   - status/recovery outputja a final canonical state vocabularyt projekciozza.
3. Ha a fenti feltetelek nem tarthatok, ugyanebben a taskban generic operator surface-re kell atvezetni vagy el kell tavolitani a subtree-t.
4. A task nem kovetel uj operator UX kitalalasat a cleanupon tul; a default elvaras a meglvo surface minimalis, fail-closed, role-neutral letisztitasa.

### Out of Scope

1. Uj actor role, uj output kind vagy uj lifecycle state bevezetese.
2. Uj dashboard vagy UI feature tervezese.
3. Kulon archival migration utility implementalasa.
4. Olyan historical docs takaritasa, amelyek archive/reference scope-ban maradnak es nem active operator guidance.
5. A Phase 1-4 contractok ujranyitasa, kiveve ha Phase 5 cleanup kozben explicit ellentmondas derul ki.

### Safety Defaults

1. Phase 5 no-backcompat cleanup fazis: ha egy path mar csak compatibility celbol el, alapertelmezetten torlendo.
2. A canonical runtime nem normalizalhatja csendben a legacy state-et final state-re.
3. A canonical actor path nem hasznalhat implicit shell-context authorityt.
4. Active docs nem mutathatnak retained alias commandot primary vagy co-canonical peldakent.
5. Ha valamely legacy branch megtartasa mellett ervel valaki, explicit first-principle indoklas kell; torteneti kenyelem nem eleg.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble lifecycle enum es transition contract,
   - approval/human-gate contract,
   - actor CLI/public contract,
   - status/UI rendering contract,
   - active docs/help contract,
   - regression/parity/fixture contract.

### Terminology Lock

1. `legacy meta-review model` = a `META_REVIEW_*` lifecycle, a `READY_FOR_APPROVAL` compatibility branch-ek, a retained actor aliases, es minden olyan UI/docs projection, amely ezeket canonicalnak mutatja.
2. `final canonical model` = generic running authority + explicit actor emit context + role-neutral approval/human-gate semantics.
3. `active docs` = `README.md`, `docs/pairflow-initial-design.md`, `docs/pairflow-ui-prd.md`, `docs/meta-review-gate-*.md`; nem tartozik ide `plans/archive/**` vagy mas historical memo.
4. `inventory-first cleanup` = az implementacio elejen explicit, checked diff- vagy grep-alapu inventory keszul arrol, mely aktiv file-ok hivatkoznak meg legacy state-et, alias-t vagy docs wordingot; csak ezutan torolhetoek a pathok.
5. `residual inventory clean rerun surface` = pontosan `src/**`, `ui/src/**`, `tests/**`, `README.md`, valamint az `active docs` definicioban felsorolt file-ok; minden ezen kivuli historical/reference tree explicit out-of-scope az E1/T11 cleanliness claimhez.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File(s) | Contract Area | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/core/state/**` | canonical lifecycle cleanup | A canonical bubble state contractbol kikerul a `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_APPROVAL`; validator, initial state, transition es execution-context projection csak a final modellel mukodik | P1 | required-now | T1, T2 |
| CS2 | `src/core/bubble/statusBubble.ts`, `src/core/bubble/listBubbles.ts`, `src/core/bubble/pendingApprovalSignal.ts`, `src/core/bubble/deleteBubble.ts`, `src/v11/application/list/**`, `src/v11/application/status/**`, `src/v11/application/reconcile/**`, `src/v11/shared/status/**`, `src/v11/shared/approval/**`, `src/core/runtime/watchdog.ts`, `src/v11/shared/watchdog/**` | status/watchdog/approval projection cleanup | Status, list, reconcile, delete-stop policy, watchdog, pending-approval projection es approval-eligibility routing nem targyal legacy lifecycle state-eket canonical branchkent; a meta-review actor generic running/gate diagnosticskent jelenik meg, es nincs `READY_FOR_APPROVAL` fallback acceptance a canonical approval surface-en | P1 | required-now | T2, T3, T5, T6 |
| CS3 | `src/core/bubble/metaReview.ts`, `src/core/bubble/metaReviewExecutionContext.ts`, `src/v11/shared/metaReview/**`, `src/v11/shared/metaReviewGate/**`, `src/v11/application/metaReview/**` | meta-review domain cleanup | A megmaradt meta-review gate/recovery logika nem kovetel legacy lifecycle shape-et; `bubble meta-review submit` removed marad; operator surface csak state-neutral projekcioval maradhat | P1 | required-now | T3, T4, T6 |
| CS4 | `src/cli/index.ts`, `src/index.ts`, `src/cli/orchestra.ts`, `src/cli/commands/agent/emit.ts`, `src/cli/commands/agent/pass.ts`, `src/cli/commands/agent/askHuman.ts`, `src/cli/commands/agent/converged.ts`, `src/cli/commands/bubble/metaReview.ts`, `src/cli/commands/bubble/approve.ts`, `src/cli/commands/bubble/requestRework.ts`, `src/v11/application/pass/**`, `src/v11/application/askHuman/**`, `src/v11/application/converged/**`, `src/v11/shared/askHuman/**`, `src/v11/shared/converged/**` | CLI/public contract cleanup | A legacy actor aliases explicit removalra vagy fail-closed migration errorra allnak; approval/request-rework csak final canonical allapotokrol dolgozik; actor-facing write path mar csak canonical `agent emit`; a retained top-level/namespace/export surface-ek nem maradhatnak implicit compatibility teachinggel | P1 | required-now | T4, T5, T6, T10 |
| CS4b | `src/core/bubble/workspaceResolution.ts`, `src/core/bubble/bubbleLookup.ts`, `src/core/bubble/repoResolution.ts`, `src/core/runtime/pairflowCommand.ts`, `src/cli/commands/agent/emit.ts` | explicit actor-context authority cleanup | A canonical actor emit path nem materializalhat authorityt `cwd`, worktree ancestry vagy env fallback alapjan; ha retained operator vagy diagnostics helper megmarad, az nem valhat actor-write authority forrassa | P1 | required-now | T10 |
| CS5 | `src/types/ui.ts`, `src/core/ui/presenters/bubblePresenter.ts`, `src/core/ui/router.ts`, `ui/src/**` | UI state vocabulary cleanup | Core UI tipusok, presenter/router modellek, attach/action availability es komponensek nem tartalmaznak `META_REVIEW_*` vagy `READY_FOR_APPROVAL` render/availability branch-et, es a list/detail surface-ek ugyanazt a final canonical vocabularyt hasznaljak | P1 | required-now | T7 |
| CS6 | `src/core/runtime/reviewerCommandGateGuidance.ts`, `src/core/runtime/tmuxDelivery.ts`, `src/v11/domain/pass/**`, `src/v11/shared/start/**`, `README.md`, `docs/pairflow-initial-design.md`, `docs/pairflow-ui-prd.md`, `docs/meta-review-gate-prd.md`, `docs/meta-review-gate-rollout-runbook.md`, `docs/meta-review-gate-e2e-validation.md` | docs/help/runtime-guidance cleanup | Active docs, reviewer runtime guidance, startup/resume/tmux guidance es help text canonical-only wordingre allnak at; a removed aliases vagy legacy states legfeljebb explicit migration/archive contextben maradnak | P1 | required-now | T8, T11 |
| CS7 | `tests/core/state/**`, `tests/core/bubble/**`, `tests/core/human/**`, `tests/core/runtime/**`, `tests/core/ui/**`, `tests/cli/**`, `tests/contracts/v11/**`, `tests/v11/application/approval/**`, `tests/v11/application/askHuman/**`, `tests/v11/application/converged/**` | regression and fixture cleanup | Tesztek es fixtures nem fednek vagy vednek mar legacy state-et, alias-t vagy approval compatibility branch-et; kulon regression marad arra, hogy a removed path fail-closed maradjon, beleertve a retained agent namespace/export/help/prompt es reviewer-command guidance surface-eket is | P1 | required-now | T1-T7, T9-T10 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble lifecycle enum | tartalmaz legacy meta-review es approval compatibility state-eket | csak final canonical lifecycle marad | final canonical states | role-level diagnostics | breaking cleanup by design | P1 | required-now |
| Meta-review projection | kulon lifecycle state + kulon status wording | generic running/gate projection | `execution_context.active_role=meta_reviewer` vagy ezzel ekvivalens role projection | operator diagnostics | legacy lifecycle removed | P1 | required-now |
| Approval/request-rework gating | legacy `READY_FOR_APPROVAL` compatible branch-ek | csak final canonical gate states | final state contract | explicit override fields, ha mar resze a final contractnak | legacy branch removed | P1 | required-now |
| Actor-facing CLI surface | canonical `agent emit` mellett legacy aliases meg szerepelnek | canonical `agent emit` az egyetlen actor write surface | `repo`, `bubble_id`, `handoff_id` | fail-closed guard mezok (`expected_role`, `expected_round`, `expected_state_fingerprint`) | legacy aliases removed | P1 | required-now |
| Actor-context authority | retained pathok reszben implicit shell/worktree/env contextet hasznalnak | canonical actor write path csak explicit authorityval mukodik | `repo`, `bubble_id`, `handoff_id` | guard fields | implicit fallback removed a canonical pathbol | P1 | required-now |
| Operator meta-review surface | historical naming es legacy lifecycle wording mix | operator-only, state-neutral surface vagy removal | operator command inputs | cached diagnostics | naming retained only if semantics already neutralized | P1 | required-now |
| Active docs/help contract | kevert Phase 4 compatibility + final canonical wording | canonical-only guidance | final command examples, final state names | migration note | legacy teaching removed | P1 | required-now |

Normative rules:

1. Phase 5 utan nincs canonical `META_REVIEW_*` lifecycle state.
2. Phase 5 utan nincs canonical `READY_FOR_APPROVAL` branch.
3. A `bubble meta-review submit` removed path marad.
4. A canonical actor write path explicit context nelkul fail-closed hibaval megall.
5. Retained operator naming csak akkor elfogadhato, ha nem hordoz legacy state semantics-et.
6. Active docsban Phase 4 compatibility adapters nem szerepelhetnek primer hasznalatkent.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State machine | legacy state torles, transition simplify | dual-state support vagy silent normalization | no-backcompat cleanup | P1 | required-now |
| CLI/public surface | removed aliases fail-closed behavior, help cleanup | retained alias adapter fenntartasa historical okbol | canonical actor surface marad az egyetlen write path | P1 | required-now |
| Actor context resolution | explicit authority contract enforce | implicit `cwd`/worktree/env actor write fallback | adapter-only helper sem maradhat canonical pathban | P1 | required-now |
| Operator meta-review surface | state-neutral operator semantics vagy removal | actor submit semantics vagy legacy lifecycle wording megtartasa | naming only if semantics clean | P1 | required-now |
| UI/status | final canonical labels, action matrix, badges | hidden legacy render branch vagy compat fallback | UI sem lehet migration museum | P1 | required-now |
| Docs/runbooks | active docs rewrite, migration notes where needed | historical wording primary guidancekent | archive kulon maradhat | P1 | required-now |
| Tests/fixtures | canonical-only fixtures + removal-regression tests | compatibility-only parity corpus eletben tartasa | removed pathokra csak fail-closed guard maradhat | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback / Action | Reason Code | Priority | Timing |
|---|---|---|---|---|---|---|
| Persisted state vagy fixture legacy `META_REVIEW_*` allapotot ad a final runtime-nak | state loader / parser | throw | explicit unsupported-state hiba; nincs auto-normalization | `LEGACY_META_REVIEW_STATE_UNSUPPORTED` | P1 | required-now |
| Persisted state vagy fixture `READY_FOR_APPROVAL` allapotot hasznal canonical branchkent | state loader / parser | throw | explicit unsupported-state hiba | `LEGACY_APPROVAL_STATE_UNSUPPORTED` | P1 | required-now |
| User removed alias vagy removed `bubble meta-review submit` pathot hiv | CLI router | throw | explicit migration-guided hiba a canonical pathra mutatva | `LEGACY_COMMAND_REMOVED` | P1 | required-now |
| Canonical actor emit explicit authority nelkul fut | actor CLI boundary | throw | explicit unsupported implicit-context hiba | `LEGACY_IMPLICIT_ACTOR_CONTEXT_UNSUPPORTED` | P1 | required-now |
| UI/store legacy state-et kap | UI parser/store | throw | explicit unsupported-state hiba; nincs fallback badge | `LEGACY_UI_STATE_UNSUPPORTED` | P1 | required-now |
| Active doc cleanup utan historical anyag megis kell | docs/archive workflow | fallback | archive/reference documentumba mozgas, nem runtime/docs backcompat | N/A | P2 | later-hardening |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` Phase 5 exit criteria | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md` Phase 4 actor/operator boundary | P1 | required-now |
| must-use | `plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` zero-caller decision a removed submit pathra | P1 | required-now |
| must-use | inventory-first grep/diff evidence a cleanup elejen, hogy az aktualis residual surface explicit legyen, kulon a core UI/router/list/detail, approval eligibility/pending signal, status/list/reconcile/delete projection, retained alias/export/help/prompt, reviewer runtime guidance es active docs surface-ekre | P1 | required-now |
| must-not-use | Phase 4-ben mar removed `bubble meta-review submit` ujranyitasa | P1 | required-now |
| must-not-use | retained actor aliases historical convenience alapjan | P1 | required-now |
| must-not-use | implicit actor-context authority a canonical pathon | P1 | required-now |
| must-not-use | active docsban Phase 4 compatibility adapters primer peldakent | P1 | required-now |

### 6) Evidence Expectations

| Evidence ID | What must be shown | Minimum acceptable proof | Priority | Timing |
|---|---|---|---|---|
| E1 | residual inventory baseline | grep vagy equivalent inventory a legacy state/alias/docs hit-ekrol a `residual inventory clean rerun surface` teljes scope-jaban a cleanup elott | P1 | required-now |
| E2 | lifecycle/state cleanup | state/schema/transition/status/watchdog test output vagy diff-anchored proof | P1 | required-now |
| E3 | CLI removal enforcement | CLI tests vagy targeted failure-path evidence arra, hogy removed aliases fail-closed maradnak | P1 | required-now |
| E4 | UI/docs cleanup | UI tests + doc diff review, amely igazolja hogy active docsbol es runtime guidance szovegekbol eltuntek a legacy state-ek es alias primary references | P1 | required-now |
| E5 | canonical explicit context enforcement | actor emit boundary test vagy equivalent regression proof | P1 | required-now |

### 7) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | final lifecycle enum excludes legacy states | final state types/schema load | state tests run | `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_APPROVAL` nincs canonical state-kent jelen | P1 | required-now | E2 |
| T2 | state machine and status/reconcile/watchdog projections do not route through legacy states | canonical flow and recovery path run | transition/status/list/reconcile/watchdog tests run | nincs legacy lifecycle branch vagy approval compatibility route a runtime vagy operator projectionokban | P1 | required-now | E2 |
| T3 | meta-review actor appears only as role projection | active meta-review scenario | status/projection builds | a projection role-neutral running/gate modellt mutat, nem kulon lifecycle state-et | P1 | required-now | E2 |
| T4 | removed actor aliases and removed submit path fail closed | user legacy commandot probal | CLI runs | explicit migration-guided `LEGACY_COMMAND_REMOVED` vagy ekvivalens hiba jon vissza | P1 | required-now | E3 |
| T5 | approval actions rely only on final canonical states | approve/request-rework flow runs | CLI and state tests run | nincs `READY_FOR_APPROVAL` compatibility acceptance | P1 | required-now | E2, E3 |
| T6 | operator meta-review surface is state-neutral | `bubble meta-review run|status|last-report|recover` retained vagy genericized path aktiv | command/test runs | a surface nem kovetel legacy lifecycle state-et, es final canonical vocabularyt projekcioz | P1 | required-now | E2, E3 |
| T7 | UI renders only final canonical vocabulary | UI store/presenter/list/detail surfaces receive final states | UI tests run | nincs legacy badge, action matrix, attach availability, list-count vagy router branch | P1 | required-now | E4 |
| T8 | active docs and runtime guidance no longer teach the legacy model | README/design/runbook/startup-resume/reviewer guidance review | doc diff review + targeted guidance checks | active docs, reviewer command guidance, startup/resume promptok es tmux guidance nem tanitjak a legacy lifecycle-et vagy Phase 4 compatibility adaptereket primer feluletkent | P1 | required-now | E4 |
| T9 | fixtures no longer preserve compatibility model | contract fixtures and parity tests update | contract suite runs | nincs compatibility-only fixture vagy golden path a legacy modelhez | P1 | required-now | E2, E3 |
| T10 | canonical actor surface requires explicit context | canonical actor emit path invoked explicit authority nelkul | CLI/boundary tests run | explicit `LEGACY_IMPLICIT_ACTOR_CONTEXT_UNSUPPORTED` vagy ekvivalens hiba jelenik meg; nincs shell-context fallback | P1 | required-now | E5 |
| T11 | residual inventory clean rerun surface is clean | Phase 5 cleanup kesz | residual inventory rerun a `residual inventory clean rerun surface` scope-jaban | a rerun scope-ban nincs mar legacy state/alias/docs hit; historical/reference tree-k nem keverednek bele a cleanliness claimbe | P1 | required-now | E1, E4 |

## Acceptance Criteria

1. AC1: A canonical lifecycle/state contractbol teljesen kikerulnek a legacy meta-review es approval compatibility state-ek.
2. AC2: A canonical actor write path explicit authority nelkul nem futtathato.
3. AC3: A removed actor aliases es a removed `bubble meta-review submit` path fail-closed maradnak.
4. AC4: Az operator meta-review surface vagy state-neutralra tisztul, vagy ugyanebben a taskban genericizalva/removolve lesz.
5. AC5: UI, status, active docs es runtime guidance csak a final canonical modellt mutatjak.
6. AC6: A teszt- es fixture corpus nem tart fenn legacy compatibility-only coverage-et.
7. AC7: A Phase 4 archived decisions, kulonosen a removed submit path, nem nyilnak ujra.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests | Evidence |
|---|---|---|---|
| AC1 | CS1, CS2, CS3, CS4 | T1, T2, T3, T5 | E2, E3 |
| AC2 | CS4, CS4b | T10 | E5 |
| AC3 | CS3, CS4, CS7 | T4 | E3 |
| AC4 | CS3, CS4 | T6 | E2, E3 |
| AC5 | CS2, CS5, CS6 | T7, T8, T11 | E1, E4 |
| AC6 | CS7 | T9, T11 | E1, E2, E4 |
| AC7 | CS3, CS4, CS6 | T4, T8 | E3, E4 |

## L2 - Implementation Notes (Optional)

1. [required-now] A megvalositas elso commit-szelete inventory-only lehet, de a task csak akkor teljes, ha a cleanup es a coverage ugyanabban a vegso korben lezarul.
2. [required-now] A grep-based residual inventory nem "minden aktiv tree minusz nehany kivetel" alapon fusson, hanem pontosan a `residual inventory clean rerun surface` scope-jara legyen kotve; minden historical/reference subtree ezen kivul marad.
3. [later-hardening] Ha historical archive snapshot olvasasra megis kell legacy parser, az kulon offline utility/task scope legyen, nem runtime backcompat.

## Review Control

1. Ne fogadjunk el olyan implementaciot, amely csak atnevezi a legacy state-et, de special-case branchkent megtartja.
2. Ne fogadjunk el olyan docs cleanupot, amely a README-bol kiveszi a legacy wordingot, de az active runbookokban bent hagyja.
3. Ne fogadjunk el retained actor alias pathot explicit removal policy nelkul.
4. Ne fogadjunk el olyan operator meta-review surface-et, amely meg mindig `META_REVIEW_*` state vocabularyra epit.
5. Ne fogadjunk el olyan explicit-context cleanupot, amely a canonical pathrol levagja a fallbackot, de egy masik hidden resolveren keresztul visszahozza.
6. Ne fogadjunk el olyan Phase 5 megoldast, amely a Phase 4 archived submit decisiont ujranyitja.

## Spec Lock

Task `IMPLEMENTABLE`, ha:

1. a Phase 4 archived decisions es a Phase 5 plan exit criteria nem mondanak egymasnak ellent a task szovegeben,
2. a required-now cleanup scope inventory-first, fail-closed es tesztelheto,
3. az operator meta-review surface-re van explicit Phase 5 decision,
4. az evidence elvarasok kulon kezelik az inventory, a runtime/CLI, a UI es a docs cleanup proofot,
5. a task mar nem hagy nyitva olyan kerdest, amely nelkul az implementernek architectura-dontest kellene improvizalnia.
