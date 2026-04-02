---
artifact_type: task
artifact_id: task_protocol_first_legacy_meta_review_model_removal_phase5_v1
title: "Protocol-First Legacy Meta-Review Model Removal (Phase 5)"
status: draft
phase: phase5
target_files:
  - src/types/bubble.ts
  - src/types/protocol.ts
  - src/cli/commands/agent/emit.ts
  - src/core/state/initialState.ts
  - src/core/state/stateSchema.ts
  - src/core/state/stateStore.ts
  - src/core/state/machine.ts
  - src/core/state/transitions.ts
  - src/core/state/executionContext.ts
  - src/core/runtime/watchdog.ts
  - src/core/runtime/pairflowCommand.ts
  - src/core/bubble/workspaceResolution.ts
  - src/core/bubble/bubbleLookup.ts
  - src/core/bubble/repoResolution.ts
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewExecutionContext.ts
  - src/core/bubble/statusBubble.ts
  - src/core/ui/presenters/bubblePresenter.ts
  - src/cli/index.ts
  - src/cli/orchestra.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/cli/commands/bubble/approve.ts
  - src/cli/commands/bubble/requestRework.ts
  - src/cli/commands/bubble/status.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/pass/passCommandContract.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/status/statusCliRenderers.ts
  - src/v11/shared/askHuman/askHumanCommandContract.ts
  - src/v11/shared/converged/convergedCommandTypes.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/status/statusCommandGateState.ts
  - src/v11/shared/metaReview/metaReviewCommandApi.ts
  - src/v11/shared/metaReview/metaReviewCommandContract.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryContext.ts
  - src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts
  - ui/src/lib/types.ts
  - ui/src/lib/actionAvailability.ts
  - ui/src/lib/attachAvailability.ts
  - ui/src/state/useBubbleStore.ts
  - ui/src/components/actions/ActionBar.tsx
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/components/canvas/ConnectedBubbleExpandedCard.tsx
  - ui/src/components/canvas/stateVisuals.ts
  - docs/pairflow-initial-design.md
  - docs/pairflow-ui-prd.md
  - docs/meta-review-gate-prd.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/meta-review-gate-e2e-validation.md
  - README.md
  - tests/core/state/stateSchema.test.ts
  - tests/core/state/machine.test.ts
  - tests/core/state/transitions.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/runtime/pairflowCommand.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewExecutionContext.test.ts
  - tests/core/bubble/workspaceResolution.test.ts
  - tests/core/bubble/bubbleLookup.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/cli/orchestra.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
  - ui/src/lib/actionAvailability.test.ts
  - ui/src/lib/attachAvailability.test.ts
  - ui/src/components/actions/ActionBar.test.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/components/canvas/ConnectedBubbleExpandedCard.test.tsx
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Protocol-First Legacy Meta-Review Model Removal (Phase 5)

## L0 - Policy

### Goal

Eltavolitani az osszes megmaradt meta-review special-case lifecycle, CLI, UI es docs compatibility reteget ugy, hogy a vegso codebase mar csak a protocol-first, role-neutral bubble modellre epuljon.
Phase 5 sikeres, ha a `meta_reviewer` mar sem domain allapotkent, sem kulon CLI subtree-kent, sem UI/status special case-kent nincs kiemelve, hanem ugyanannak az altalanos actor/runtime modellnek a szereploje, mint az implementer es a reviewer.

### Context

1. Phase 1-4 celja kifejezetten az volt, hogy a meta-review ne maradjon kulon lifecycle-kivetel vagy kulon actor-command semantics.
2. A Phase 3-ban a generic running authority modell mar kivaltja a kulon meta-review execution home-ot.
3. A Phase 4-ben a meta-review result mar nem maradhat kulon actor-submit special case; a legacy actor commandok adapterre szukulnek.
4. Emiatt ami ezutan megmarad, az mar nem architecturally indokolt, hanem compatibility vagy rollout-maradvany.
5. A plan explicit vegallapota az, hogy ne legyen tartos backward-compatibility code path, es a codebase a lean protocol-first modellre redukalodjon.

### In Scope

1. `META_REVIEW_*` lifecycle special case-ek teljes eltavolitasa a canonical state machine-bol, status projectionbol es UI surface-ekrol.
2. `READY_FOR_APPROVAL` approval-compatibility branch-ek es transcript-context legacy guardok cleanupja.
3. A megmaradt meta-review-dedikalt operatori subtree (`bubble meta-review ...`) vegso rendezese:
   - vagy generic operator surface-re olvad,
   - vagy megszunik,
   - de kulon meta-review subtree mint tartos modellelem nem maradhat.
4. Actor-command aliasok es retained compatibility adapterek (`pass`, `ask-human`, `converged`, `orchestra`, retained submit aliases) eltavolitasa, ha a Phase 4 canonical surface stabil.
5. A Phase 4-ben meg retained implicit actor-context inference (`cwd`, worktree ancestry, env fallback) kivezetese a canonical actor-write pathbol, hogy a vegso actor surface csak explicit `repo`/`bubble_id`/`handoff_id` authorityval mukodjon.
6. UI, status, action availability es attach availability feluletek atallitasa az uj canonical allapot- es actor-modellre.
7. Docs, runbookok, PRD-k, help text-ek es test fixtures cleanupja a regi modellekrol.

### Out of Scope

1. Uj protocol output kind vagy uj actor-szereplo bevezetese.
2. Uj operatori UX vagy uj dashboard feature tervezese a cleanupon tul.
3. A future-improvement actor adapter runtime megvalositasa.
4. A Phase 1-4 contractok ujranyitasa, hacsak cleanup kozben tenyleges ellentmondas nem derul ki.
5. Barmilyen hosszu tavu dual-path vagy deprecation period meghosszabbitasa.

### Safety Defaults

1. Phase 5 vegallapota no-backcompat cleanup: ha egy legacy path mar csak compatibility celbol el, torolheto.
2. Nincs tartos `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_APPROVAL` canonical lifecycle.
3. Nincs tartos meta-review-dedikalt CLI/domain/UI branch csak azert, mert tortenetileg igy alakult.
4. Ha egy retained command vagy state csak rollout-biztonsag miatt maradt Phase 4-ben, itt explicit inventory alapjan kivezetendo.
5. A cleanup nem hozhat vissza role-specific authorityt, CLI-semantikat vagy runtime couplingot.
6. Ha egy megmaradt special case valoban szuksegesnek tunik, azt explicit first-principle indoklassal kell bizonyitani; torteneti ok nem eleg.
7. A vegso canonical actor-write path nem epulhet implicit shell-context inference-re; `cwd`, worktree ancestry vagy env helper legfeljebb operatori convenience vagy archival tooling maradhat, actor write authority nem.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - bubble lifecycle enum es state-transition contract,
   - approval es human-gate contract,
   - status/UI rendering contract,
   - public CLI/help/docs contract,
   - regression, contract es parity fixture contract.

### Normative Reference Policy

1. `plan_ref`: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - Ez a canonical forras a Phase 5 cleanup scope-hoz es a no-backcompat vegallapothoz.
2. `system_context_ref`: `docs/pairflow-initial-design.md`
   - A dokumentacio ebben a korben mar koveto artifact: ha a Phase 5 cleanup a korabbi design szoveggel ellentmond, a docs-ot kell frissiteni a vegso modellre.
3. Precedence rule:
   - ha Phase 4 utan barmely state, CLI, UI vagy docs special case csak historical compatibilitybol maradt eletben,
   - Phase 5-ben az eltavolitas az alapertelmezett, nem a megtartas.

### Terminology Lock

1. `legacy meta-review model` = a kulon `META_REVIEW_*` lifecycle, kulon meta-review subtree, kulon UI/status branch vagy kulon command-semantics retegek osszessege.
2. `legacy approval compatibility` = minden olyan `READY_FOR_APPROVAL` vagy hasonlo branch, amely mar nem resze a canonical flow-nak, de atmeneti kompatibilitaskent megmaradt.
3. `final canonical model` = generic running authority + generic actor emission + role-neutral approval/human-gate semantics.
4. `cleanup-ready compatibility path` = olyan retained branch, amelynek Phase 4 utan mar nincs sajat first-principle indoklasa.
5. `meta-review operator subtree` = a `bubble meta-review run|status|last-report|recover` surface es a mogotte allo kulon command topology.
6. `implicit actor-context inference` = barmely olyan actor-write path, amely a `repo`, `bubble_id` vagy `handoff_id` authorityt `cwd`, worktree ancestry, tmux-pane worktree vagy env helper alapjan kovetkezteti ki, ahelyett hogy explicit canonical inputkent kapna meg.

### Phase 5 Removal Decision

1. A Phase 5 vegallapotban a canonical bubble lifecycle ne tartalmazzon `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, sem `READY_FOR_APPROVAL` allapotot.
2. A meta-reviewer actor Phase 5-ben mar csak `RUNNING(active_role=meta_reviewer)` vagy azzal kompatibilis role-neutral projectionban jelenhet meg.
3. A `bubble meta-review` kulon operatori subtree csak akkor maradhat fenn, ha a Phase 5 implementacio explicitten bizonyitja, hogy generic operator surface-re nem oldhato at veszteseg nelkul; alapertelmezett policy a megszuntetes vagy genericre olvasztas.
4. A Phase 4-ben retained actor-command adapterek Phase 5-ben torlendok, ha a canonical actor surface lefedi oket.
5. A Phase 5 vegallapotban a canonical actor-write path csak explicit actor-context contracttal (`repo`, `bubble_id`, `handoff_id` es a szukseges fail-closed guard mezokkel) mukodhet; nincs implicit actor-context inference a canonical actor surface-ben.
6. UI, docs es tests nem tartalmazhatnak mar active-flow leirast vagy golden-path fixture-t a legacy meta-review modellrol.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` + `src/core/state/initialState.ts` + `src/core/state/stateSchema.ts` + `src/core/state/machine.ts` + `src/core/state/transitions.ts` + `src/core/state/executionContext.ts` | final lifecycle/state cleanup | lifecycle enums, schema validation/defaulting, transition guards -> types / validators / transitions | canonical bubble state contract | Eltavolitja a `META_REVIEW_*` es `READY_FOR_APPROVAL` canonical lifecycle shape-et; a state machine mar csak a final generic modellel mukodik, legacy compatibility guardok nelkul | P1 | required-now | plan Phase 5 coverage checklist explicit cleanupot kovetel |
| CS2 | `src/core/runtime/watchdog.ts` + `src/core/bubble/statusBubble.ts` + `src/v11/shared/status/statusCommandViewBuilder.ts` + `src/v11/shared/status/statusCommandGateState.ts` + `src/v11/application/status/statusCliRenderers.ts` | runtime/status projections | watchdog/status builders -> typed results/views | status, watchdog, gate-state projection | A runtime es status projection mar nem ismeri a legacy meta-review lifecycle state-eket vagy approval-compat branch-eket; minden projection a final canonical modelrol dolgozik | P1 | required-now | a legacy lifecycle-ek status/UI special case-jeit is ki kell vezetni |
| CS3 | `src/core/bubble/metaReview.ts` + `src/core/bubble/metaReviewExecutionContext.ts` + `src/v11/shared/metaReviewGate/*` | meta-review core cleanup | meta-review helpers, gate apply/recovery/human-gate persistence -> typed results | megmaradt meta-review legacy internals | A megmaradt kulon meta-review lifecycle/home/compatibility pathok torlodnek vagy generic helperre olvadnak; meta-review actor mar nem kulon domain-branchkent jelenik meg | P1 | required-now | Phase 5 vegallapot no-special-case policy |
| CS4 | `src/cli/index.ts` + `src/cli/orchestra.ts` + `src/cli/commands/agent/emit.ts` + `src/cli/commands/bubble/metaReview.ts` + `src/cli/commands/bubble/approve.ts` + `src/cli/commands/bubble/requestRework.ts` + `src/v11/application/metaReview/metaReviewCliCommand.ts` + `src/v11/application/metaReview/metaReviewCliOptions.ts` + `src/v11/application/metaReview/metaReviewCliDispatcher.ts` + `src/v11/application/pass/passCommandContract.ts` + `src/v11/shared/askHuman/askHumanCommandContract.ts` + `src/v11/shared/converged/convergedCommandTypes.ts` + `src/v11/application/converged/runConvergedFlowContract.ts` | CLI topology cleanup | CLI routing + help/renderers -> `Promise<number>` / parsed option types | public CLI surface | A Phase 4 utan retained legacy actor adapters es meta-review-specific subtree torlodik vagy generic bubble/operator illetve canonical actor surface-re olvad; nincs kulon meta-review command topology pusztan historical okbol, es a canonical actor surface explicit context contractot kovetel, nem implicit shell-context authorityt | P1 | required-now | user-facing cleanup Phase 5 kotelezo resze |
| CS4b | `src/core/bubble/workspaceResolution.ts` + `src/core/bubble/bubbleLookup.ts` + `src/core/bubble/repoResolution.ts` + `src/core/runtime/pairflowCommand.ts` | implicit actor-context cleanup | context resolution helpers -> typed results / helper functions | canonical actor-write authority boundary | A Phase 4-ben retained `cwd`/worktree/env bubble-context inference kikerul a canonical actor-write pathbol; ha ilyen helper megmarad, az nem actor write authorityra, hanem operatori convenience-re vagy archival toolingra korlatozodik | P1 | required-now | no-backcompat cleanup explicit resze |
| CS5 | `src/core/ui/presenters/bubblePresenter.ts` + `ui/src/lib/types.ts` + `ui/src/lib/actionAvailability.ts` + `ui/src/lib/attachAvailability.ts` + `ui/src/state/useBubbleStore.ts` + `ui/src/components/actions/ActionBar.tsx` + `ui/src/components/canvas/BubbleExpandedCard.tsx` + `ui/src/components/canvas/ConnectedBubbleExpandedCard.tsx` + `ui/src/components/canvas/stateVisuals.ts` | UI final-state cleanup | presenters/view models/components -> UI models/rendered state | web UI lifecycle rendering es action matrix | A UI mar nem renderel legacy `META_REVIEW_*` vagy `READY_FOR_APPROVAL` allapotokat, es nem tart fenn action special-case-et rajuk | P1 | required-now | plan explicitten emliti state/UI legacy surface-ek eltavolitasat |
| CS6 | `docs/pairflow-initial-design.md` + `docs/pairflow-ui-prd.md` + `docs/meta-review-gate-prd.md` + `docs/meta-review-gate-rollout-runbook.md` + `docs/meta-review-gate-e2e-validation.md` + `README.md` | docs/runbook cleanup | markdown | architecture, runbook, UI PRD, README | Minden active-flow dokumentacio a vegso protocol-first modellre all at; historical meta-review special case legfeljebb archive-ban maradhat | P2 | required-now | docs cleanup Phase 5 checklist resze |
| CS7 | `tests/core/state/*` + `tests/core/runtime/watchdog.test.ts` + `tests/core/bubble/*` + `tests/cli/bubbleMetaReviewCommand.test.ts` + `tests/cli/orchestra.test.ts` + `tests/contracts/v11/metaReviewGate.contract.runner.ts` + `tests/contracts/v11/metaReviewSubmitCoverage.test.ts` + `tests/contracts/v11/watchdog.contract.runner.ts` + UI tests | regression and fixture cleanup | vitest / contract runners / UI tests | final canonical model regression set | A contract fixtures, parity tests es UI/state regressionek mar nem tarthatnak fenn legacy state-et, retained alias-t vagy meta-review special-case arany mintat | P1 | required-now | plan explicitten emliti fixtures/parity/test cleanupot |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble lifecycle enum | tartalmazza `READY_FOR_APPROVAL`, `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_HUMAN_APPROVAL` | csak final canonical states maradnak; nincs meta-review-specific lifecycle | canonical final lifecycle enum | UI-only derived labels, ha szukseges | breaking cleanup by design | P1 | required-now |
| Meta-review running representation | kulon lifecycle-label + compatibility mirrors | generic running context role-neutral projectionja | `execution_context.active_role=meta_reviewer` amikor aktiv | operator diagnostics | compatibility removed | P1 | required-now |
| Approval/human-gate routing | legacy `READY_FOR_APPROVAL` branch-ek es compatibility accept pathok | csak final canonical approval/human-gate semantics | final approval state contract | none | breaking cleanup by design | P1 | required-now |
| Meta-review operator commands | kulon `bubble meta-review ...` subtree | generic operator surface vagy command removal | only retained generic operator inputs, ha indokolt | none | compatibility removed unless explicitly justified | P1 | required-now |
| Legacy actor aliases | retained `pass`, `ask-human`, `converged`, `orchestra`, retained submit aliases | canonical actor surface only | canonical actor emit inputs | none | compatibility removed | P1 | required-now |
| Actor context resolution | Phase 4-ben a retained adapterek meg hasznalhatnak implicit `cwd`/worktree/env bubble-context inference-t | a final canonical actor surface csak explicit actor-context contracttal mukodik | `repo`, `bubble_id`, `handoff_id` | `expected_role`, `expected_round`, `expected_state_fingerprint` | compatibility removed a canonical actor pathbol | P1 | required-now |
| UI state vocabulary | legacy lifecycle labels es color/action matrices | final canonical state vocabulary | final state ids | optional derived badges | compatibility removed | P1 | required-now |

Normative rules:

1. Phase 5 utan nincs canonical `META_REVIEW_*` lifecycle allapot.
2. Phase 5 utan nincs canonical `READY_FOR_APPROVAL` state vagy approval-compatibility branch.
3. A meta-review actor nem jelenhet meg kulon lifecycle-kategoriakent; csak role-level projection lehet.
4. A kulon `bubble meta-review` subtree Phase 5-ben alapertelmezetten eltunendo historical compatibility.
5. Ha barmely meta-review operator command megmarad, azt generic operator commandkent kell ujrakeretezni, nem meta-review special case-kent.
6. Historical references active docsban nem maradhatnak; ha szuksegesek, archive/reference contextbe kell mozgatni oket.
7. Legacy aliases es fixtures megtartasa csak akkor megengedett, ha van explicit first-party runtime consumer; enelkul torlendo.
8. A canonical actor surface Phase 5 utan nem kovetkeztetheti ki a `repo`, `bubble_id` vagy `handoff_id` authorityt `cwd`, worktree ancestry vagy env helper alapjan.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State machine | legacy states torlese, final enum szukitese | dual-state support fenntartasa | Phase 5 vegallapot no-backcompat | P1 | required-now |
| CLI surface | legacy aliases/subtrees torlese vagy genericre olvasztasa | retained historical command topology | kulon meta-review subtree ne maradjon ok nelkul | P1 | required-now |
| Actor context resolution | explicit actor-context contract megtartasa a canonical actor pathon | implicit `cwd`/worktree/env authority inference retained canonical actor write pathkent | a canonical actor API ne fuggjon shell allapottol | P1 | required-now |
| UI/status | final canonical labels es action matrix | legacy state render vagy hidden fallback branch | UI sem lehet migration museum | P1 | required-now |
| Docs/runbooks | active-flow rewrite a final modellre | historical wording active docsban hagyasa | archival content kulon mehet | P2 | required-now |
| Tests/fixtures | legacy contract cases torlese/atirasa | parity tests, amelyek mar csak compatibilityt vedik | test corpus is canonical-only legyen | P1 | required-now |

Constraint:

1. Ha egy Phase 5 implementacio utan barmely active path meg mindig `META_REVIEW_*` vagy `READY_FOR_APPROVAL` state-et hasznal canonical domain donteshez, a cleanup sikertelen.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| legacy persisted snapshot vagy test fixture `META_REVIEW_*` allapotot adna be a final runtime-nak | state loader / test harness | throw | explicit invalid-state/fixture error; nincs runtime backcompat normalizacio | `LEGACY_META_REVIEW_STATE_UNSUPPORTED` | error | P1 | required-now |
| CLI user legacy actor aliasra vagy kulon meta-review subtree commandra hivna, amelyet Phase 5 torolt | CLI router | throw | explicit unsupported-command error, canonical replacement hinttel | `LEGACY_COMMAND_REMOVED` | error | P1 | required-now |
| canonical actor command explicit `repo`/`bubble_id`/`handoff_id` authority nelkul hivodik, vagy a runtime implicit shell-context fallbackot probalna hasznalni actor write pathon | actor CLI boundary | throw | explicit unsupported implicit-context error; nincs `cwd`/env actor-write fallback | `LEGACY_IMPLICIT_ACTOR_CONTEXT_UNSUPPORTED` | error | P1 | required-now |
| docs/runbook active utmutato meg legacy lifecycle-re vagy commandra hivatkozik | docs review | fallback | task nem kesz docs cleanup nelkul | N/A | warn | P2 | required-now |
| UI/store legacy state-et kap | UI model/parser | throw | explicit unsupported-state error; nincs silent fallback badge | `LEGACY_UI_STATE_UNSUPPORTED` | error | P1 | required-now |
| historical archive compatibility igeny merul fel cleanup kozben | user/archive tooling | fallback | nem runtime backcompat, hanem kulon archival adapter vagy kulon follow-up task | N/A | info | P2 | required-now |

Path-specific failure semantics:

1. `throw` itt azt jelenti, hogy Phase 5-ben a runtime mar nem rejt el legacy allapotot compatibility normalizacioval.
2. `fallback` archival igenynel nem jelent silent supportot; kulon adapter vagy kulon task kell hozza.
3. Phase 5-ben nincs soft deprecation a canonical runtime-ban: a torolt path torolt path.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` Phase 5 exit criteria | P1 | required-now |
| must-use | Phase 3 generic running authority modell | P1 | required-now |
| must-use | Phase 4 canonical actor-facing surface mint egyetlen actor write path | P1 | required-now |
| must-use | explicit actor-context contract a canonical actor surface-en (`repo`, `bubble_id`, `handoff_id`; fail-closed guard mezkent `expected_role`, `expected_round`, `expected_state_fingerprint` vagy ekvivalens canonical mezok) | P1 | required-now |
| must-use | explicit inventory minden megmaradt legacy state/CLI/UI/docs/test pathrol a torles elott | P1 | required-now |
| must-not-use | dual-write vagy dual-state compatibility Phase 5 utan | P1 | required-now |
| must-not-use | meta-review special case retained "just in case" alapon | P1 | required-now |
| must-not-use | implicit `cwd`/worktree/env actor-context inference a canonical actor write pathban | P1 | required-now |
| must-not-use | active docsban archived command/state semantics | P1 | required-now |
| must-not-use | historical reason alapjan retained CLI alias vagy subtree | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | final lifecycle enum excludes legacy states | final state types/schema betoltodik | type/schema tests futnak | `META_REVIEW_*` es `READY_FOR_APPROVAL` nincs canonical state-kent jelen | P1 | required-now | automated test |
| T2 | state machine no longer routes through legacy meta-review states | bubble final canonical flow fut | transition tests futnak | nincs meta-review-specific lifecycle branch vagy approval-compat branch | P1 | required-now | automated test |
| T3 | meta-review actor appears only as generic running role | aktiv meta-review actor scenario | status/state projection epul | a projection role-neutral running modellt mutat, nem kulon lifecycle state-et | P1 | required-now | automated test |
| T4 | legacy operator subtree removed or genericized | CLI invocation tortenik a Phase 5 szerint torolt/reworked `bubble meta-review` utra | command fut | explicit unsupported-command vagy generic replacement behavior jelenik meg, nincs historical subtree semantics | P1 | required-now | automated test |
| T5 | legacy actor aliases removed | `pass` / `ask-human` / `converged` / `orchestra` retained alias hivas tortenne | CLI fut | explicit removal vagy canonical-only behavior a task dontese szerint, de nincs retained compatibility adapter | P1 | required-now | automated test |
| T6 | approval actions no longer rely on `READY_FOR_APPROVAL` compatibility | approval/request-rework flow fut final state-ekkel | CLI es state tests futnak | approval branch csak final canonical state-ekrol dolgozik | P1 | required-now | automated test |
| T7 | UI renders only final canonical state vocabulary | UI store es presenter final state-eket kap | component/presenter tests futnak | nincs legacy badge, action matrix vagy fallback render `META_REVIEW_*`/`READY_FOR_APPROVAL` allapotra | P1 | required-now | automated test |
| T8 | docs and runbooks no longer teach legacy model | README/design/runbook review | docs diff ellenorzes | active docs nem tanitjak a regi meta-review lifecycle-et, subtree-t vagy alias commandokat | P2 | required-now | doc review |
| T9 | contract fixtures no longer encode compatibility model | contract runners es fixtures frissitettek | contract suite fut | nincs parity case vagy golden fixture csak compatibility vedelmere | P1 | required-now | automated test |
| T10 | canonical actor surface requires explicit context only | Phase 5 utani actor command invocation | canonical actor path `repo`/`bubble_id`/`handoff_id` nelkul vagy implicit shell-contextre tamaszkodva futna | explicit `LEGACY_IMPLICIT_ACTOR_CONTEXT_UNSUPPORTED` vagy ekvivalens hiba jelenik meg, es nincs actor-write fallback `cwd`/env alapjan | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha archival olvasashoz megis kell legacy snapshot parser, azt kulon offline migration/inspection utilkent erdemes tartani, nem runtime canonical pathkent.
2. [later-hardening] A docs historical anyagait erdemes archive prefix ala mozgatni, hogy ne keveredjenek az active canonical leirassal.

## Assumptions

1. A Phase 4-re a canonical actor-facing surface mar eleg stabil ahhoz, hogy a retained aliases Phase 5-ben tenyleg torolhetoek legyenek.
2. A meta-review operatori subtree nem hordoz olyan first-principle kulonbseget, ami miatt kulon topologiakent meg kellene maradnia.
3. Historical compatibility runtime-szinten nem kovetelmeny; ha archival tamogatas kell, az kulon utility scope.

## Open Questions

1. A `bubble meta-review run|status|last-report|recover` teljesen megszunjon, vagy generic `bubble review-*` / `bubble gate-*` operatori surface-re erdemes atemelni? Phase 5-ben kulon meta-review subtree egyik esetben sem maradhat.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Historical archive tooling for old snapshots | L2 | P3 | later-hardening | archival concern | Keszitsunk kulon offline inspector/migrator utilityt, ha tenyleges archive-igeny merul fel |
| HB2 | Doc archive reorganization | L2 | P3 | later-hardening | docs cleanup follow-up | A legacy meta-review gate doksikat archive ala mozgatni az active docs tisztitasa utan |

## Review Control

1. Ne fogadjunk el olyan Phase 5 implementaciot, amely a `META_REVIEW_*` lifecycle-et csak atnevezi, de special-case branchkent megtartja.
2. Ne fogadjunk el retained `bubble meta-review` subtree-t pusztan torteneti vagy kenyelmi okbol.
3. Ne fogadjunk el docs/test cleanup nelkuli code cleanupot; Phase 5 csak teljes vegallapottal tekintheto kesznek.
4. Ha barmely legacy path megtartasa mellett ervel valaki, explicit first-principle indoklas kell; "eddig is igy volt" nem erv.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. a canonical runtime mar nem tartalmaz `META_REVIEW_*` vagy `READY_FOR_APPROVAL` lifecycle state-et,
2. a meta-review actor mar nem kulon lifecycle vagy CLI special case,
3. a retained actor aliases es historical subtree-k el vannak tavolitva vagy generic operator surface-re olvasztva,
4. a UI, docs es contract fixtures csak a final protocol-first modellt tukrozik,
5. nincs tartos backward-compatibility code path a legacy meta-review modellhez,
6. a canonical actor surface nem hasznal implicit `cwd`/worktree/env actor-context inference-t; az actor write authority kizarolag explicit context contractbol szarmazik.
