---
artifact_type: task
artifact_id: task_review_policy_reviewer_blocking_threshold_foundation_ui_phase1_v1
title: "Review Policy Reviewer Blocking Threshold Foundation + Shared UI Update (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/config/defaults.ts
  - src/config/bubbleConfig.ts
  - src/types/bubble.ts
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/application/create/createCommandRuntime.ts
  - src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts
  - src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerHttpBody.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleReviewPolicyCommand.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/bubble/bubbleInstanceId.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/ui/updateBubbleReviewPolicyForUi.test.ts
  - tests/core/ui/router.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleReviewPolicyCommand.test.ts
  - tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts
  - tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts
prd_ref: null
plan_ref: plans/review-policy-reviewer-blocking-threshold-and-shared-ui-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Review Policy Reviewer Blocking Threshold Foundation + Shared UI Update (Phase 1)

## Current Codebase Check (2026-04-26)

1. A persisted `review_policy` shape ma csak:
   - `review_loop_mode`
   - `meta_review_auto_rework_min_severity`
2. A create path mar defaultbol materializalja ezt az egy severity mezot.
3. A UI update path local es remote oldalon ugyanazt az egy mezot patch-eli.
4. A status/list/detail runtime view szinten szinten csak a meta-review threshold latszik.
5. Emiatt az uj reviewer threshold producer + mutation + read-model closure itt egyben bounded.

## L0 - Policy

### Goal

Vezessuk be a reviewer kulon persisted thresholdjat ugy, hogy:
1. a canonical `review_policy` shape bovitese explicit legyen:
   - `reviewer_blocking_min_severity`
   - `meta_review_auto_rework_min_severity`
2. a reviewer uj defaultja `P3` legyen,
3. a meta-review threshold mezo neve es kulon szerepe megmaradjon,
4. az operatori UI single-control input ugyanazt az erteket irja mindket persisted mezore,
5. a runtime view/read-model surfaces mindket thresholdot transzparensen mutassak.

### Domain / Control Model Summary

1. Business invariant:
   a reviewer blocking threshold es a meta-review auto-rework threshold kulon canonical policy mezok, nem egy atnevezett kozos mezo.
2. Control model:
   a canonical authority a `bubble.toml` `review_policy` blokk; a UI shared severity input csak mutation convenience.
3. Read-path rule:
   barmely projection vagy UI response thresholdot csak normalized review-policy helperbol olvashat.
4. Forbidden fallback:
   a UI request alias, presenter-local mapping vagy legacy meta-only field nem rejtetheti el, hogy ket canonical persisted mezo letezik.
5. Allowed resolution path:
   shared UI severity input -> updateBubbleReviewPolicy patch -> mindket persisted mezo -> parse/render/normalize -> runtime view.
6. Missing-data rule:
   hianyzo `reviewer_blocking_min_severity` esetben a normalized default `P3`.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: owned here a mutation/runtime-view helpers szintjen
   - workflow/orchestration closure: not owned here
   - read-model closure: owned here
   - activation closure: none
   - cleanup/recovery closure: none

### Plan Linkage

1. Parent plan gap closed:
   explicit dual-threshold policy producer + mutation + read-model foundation.
2. Depends on:
   `N/A`, current merged review-policy baseline-re epul.
3. Unlocks / impacts successors:
   a reviewer routing task mar stable explicit reviewer thresholdot consume-olhat interim fallback nelkul.
4. Task-list impact:
   nem oldja meg a reviewer workflow consume semantics-et; azt successor task ownershipolja.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/config/bubbleConfig.ts](/Users/felho/dev/pairflow/src/config/bubbleConfig.ts)
   - [src/types/bubble.ts](/Users/felho/dev/pairflow/src/types/bubble.ts)
   - [src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts)
   - [src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts)
   - [src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts](/Users/felho/dev/pairflow/src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts)
2. Canonical elements:
   - `review_policy.reviewer_blocking_min_severity`
   - `review_policy.meta_review_auto_rework_min_severity`
   - normalized defaults: reviewer=`P3`, meta-review=`P3`
3. Guard elements:
   - UI state conflict / write conflict locks
   - remote review-policy update conflict contract
4. Compat elements:
   - `review_loop_mode` shape valtozatlan
   - meta-review threshold persisted mezonev valtozatlan
5. Forbidden reinterpretations:
   - az uj reviewer field nem nevezheto at implicit UI-only conceptte
   - a shared UI input nem valthatja ki a persisted dual-threshold contractot

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `parseBubbleConfigToml`, `renderBubbleConfigToml`, `normalizeBubbleReviewPolicy`, `buildBubbleReviewPolicyRuntimeView`, `updateBubbleReviewPolicyForUi`, `parseReviewPolicyBody`, remote SSH update script, status/list projections, bubble presenter.
2. Actual touched scope:
   `producer + mutation/read-model alignment`.
3. Mutation entrypoints in scope:
   local bubble.toml rewrite, remote bubble.toml rewrite, UI HTTP update-review-policy action.
4. Hidden scope ruled out:
   reviewer pass/convergence routing, prompt/guidance, meta-review gate semantics.
5. Why the declared task shape matches reality:
   ugyanaz a codepath csalad ownershipolja a persisted contractot, a mutation seamet es az operatori projectiont; reviewer workflow consume kulon successor.

### Authority Boundary Map

1. Authority producer:
   `bubbleConfig` parse/render + create defaults + reviewPolicy runtime normalization.
2. Persisted authority:
   `.pairflow/bubbles/<id>/bubble.toml` `review_policy` blokk.
3. In-scope consumers:
   update-review-policy local/remote mutation seam, list/status/detail projections, UI presenter/runtime view.
4. Explicit out-of-scope consumers:
   reviewer routing, reviewer prompt guidance, meta-review gate threshold consume.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Entry | Contract Delta | Required Behavior | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | `BubbleReviewPolicyConfig`, `BubbleReviewPolicyRuntimeView` | uj reviewer threshold mezok | explicit dual-threshold type shape, runtime view mindket thresholdot expose-olja | P1 | T1,T4 |
| CS2 | `src/config/defaults.ts` | defaults | uj reviewer default | `DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY = "P3"` | P1 | T1 |
| CS3 | `src/config/bubbleConfig.ts` | parse/render/validation | dual-threshold TOML contract | parse/render/update `reviewer_blocking_min_severity`, unknown-key es invalid-value guards | P1 | T1,T2 |
| CS4 | `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` | normalization/runtime view | normalized reviewer threshold + runtime projection | missing field -> `P3`, runtime view transzparensen mutatja reviewer/meta thresholdot | P1 | T4 |
| CS5 | `src/v11/application/create/createCommandRuntime.ts` | create default config | create-time persisted baseline | uj bubbles defaultbol reviewer=`P3`, meta=`P3` | P1 | T3 |
| CS6 | `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts` | patch contract | shared UI patch mindket persisted mezot irhatja | update helper deterministic dual-field patchinget tamogat | P1 | T5 |
| CS7 | `src/v11/shared/ports/uiRouter.ts`, `routerHttpBody.ts`, `routerActionDispatch.ts` | UI mutate API | shared request field | single input mezo canonical mutation requestkent mindket thresholdot beallitja | P1 | T6 |
| CS8 | `src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts`, `sshBubbleReviewPolicyCommand.ts` | local+remote mutation orchestration | local es remote parity | ugyanaz a single-control write semantics local es remote bubble-re | P1 | T6,T7 |
| CS9 | `status/list/presenter` files | read-model output | projection alignment | status/list/detail response-ben reviewer es meta threshold is lathato | P1 | T4,T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Persisted review policy | `review_loop_mode`, `meta_review_auto_rework_min_severity` | `review_loop_mode`, `reviewer_blocking_min_severity`, `meta_review_auto_rework_min_severity` | both thresholds | none | additive persisted contract |
| Runtime view | meta-only threshold visible | dual threshold visible | reviewer + meta fields | guarded diagnostics unchanged | additive read-model contract |
| UI mutate body | meta-only severity field | shared single severity field | one shared severity input | expectedBubbleToml | intentional API rename/tightening within same repo |

Normative rules:
1. Reviewer canonical field neve:
   `reviewer_blocking_min_severity`
2. Reviewer default:
   `P3`
3. Meta-review field neve valtozatlan:
   `meta_review_auto_rework_min_severity`
4. Shared UI/operator mutate input egyetlen severity field; ennek hatasara mindket persisted threshold ugyanarra az ertekre all.
5. A runtime viewben a ket persisted threshold kulon mezokent jelenik meg; shared UI input nem lesz persisted/runtime alias.

### 3) Error Contract

| Trigger | Behavior | Reason Code / Surface | Priority |
|---|---|---|---|
| invalid reviewer threshold in TOML/API | reject | existing review-policy threshold invalid surface | P1 |
| unknown extra `review_policy` key | reject | existing `REVIEW_POLICY_INVALID` path | P1 |
| remote/local write conflict | conflict result | existing review-policy write conflict/state conflict | P1 |

### 4) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | config parse/render dual threshold | TOML with reviewer=`P2`, meta=`P3` | parse + render | roundtrip megtartja mindket mezot |
| T2 | invalid reviewer threshold reject | reviewer field = `P0` | parse/validation fut | explicit invalid threshold error jon |
| T3 | create default reviewer threshold | uj bubble create | config materializalodik | reviewer threshold default `P3` |
| T4 | runtime view dual threshold | config hianyos vagy explicit | normalize/runtime view fut | reviewer defaultol vagy explicit latszik, meta kulon latszik |
| T5 | local update writes both persisted fields | shared UI severity input = `P2` | local update-review-policy fut | reviewer=`P2`, meta=`P2` kerul bubble.toml-ba |
| T6 | router accepts shared field and forwards | HTTP update-review-policy body | router dispatch fut | canonical UI input a dual-field patchre mapelodik |
| T7 | remote update parity | remote bubble update same inputtal | ssh script fut | remote bubble.toml-ban is reviewer=`X`, meta=`X` |
| T8 | status/list/detail projection transparency | updated bubble config | list/status/detail build fut | reviewPolicy projection reviewer + meta thresholdot is tartalmaz |

### 5) Review Control

Reviewer akkor adhat `IMPLEMENTABLE` allapotot, ha:
1. a dual-threshold contract minden producer/mutation/read-model surface-en konzisztens,
2. a reviewer default `P3` explicit es tudatos behavior-valtozaskent szerepel,
3. a shared UI control nem mossa ossze a persisted canonical dual-threshold shape-et,
4. a reviewer workflow consume nincs felig idehuzva ebbe a taskba.

## L2 - Implementation Notes (Optional)

1. A shared UI request field neve lehet `reviewBlockingMinSeverity`; ennek szerepe operator convenience input, nem canonical persisted field.
2. Ha a backend/API rename blast radius indokolja, legacy alias csak atmeneti guardkent johet szoba, de nem kotelezo baseline.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a dual-threshold contract es a single-control mutate semantics ellentmondasmentes,
2. T1-T8 teljesen fedik a producer/mutation/read-model blast radiust,
3. nincs reviewer routing logika scope-creep ebben a phase1 szeletben.

## Assumptions

1. A UI request field rename ugyanabban a repo-surface-ben kontrollalhato.
2. A current operatori transparency miatt a runtime view bovitese required-now, nem optional polish.
