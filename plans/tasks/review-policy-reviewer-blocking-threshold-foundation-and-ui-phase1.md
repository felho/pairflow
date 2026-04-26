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
  - src/v11/infrastructure/ui/routerHttp.ts
  - src/v11/infrastructure/ui/routerHttpBody.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleReviewPolicyCommand.ts
  - src/v11/shared/status/statusCommandApi.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/list/listCommandEntryBuilder.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/bubble/bubbleInstanceId.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/ui/updateBubbleReviewPolicyForUi.test.ts
  - tests/core/ui/router.test.ts
  - tests/v11/application/kickoff/kickoffPersistencePreparation.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
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
6. A UI request/router surface ma meg explicit meta-only namingot hasznal:
   - `UiUpdateBubbleReviewPolicyInput.metaReviewAutoReworkMinSeverity`
   - `parseReviewPolicyBody()`
   - `dispatchBubbleAction()`
   - local/remote update seam
7. A jelenlegi one-field persisted contract snapshot/serialization assertionok nem csak config tesztekben, hanem bubble create/kickoff es list/status wrapper tesztekben is megjelennek.

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

### Successor Boundary Proof

Ez a task csak akkor marad implementalhato es bounded, ha az alabbi consume-anchorok explicit Phase 2 ownershipben maradnak:
1. `src/v11/domain/pass/reviewerDecision.ts`
2. `src/v11/domain/convergence/policyReviewerAggregate.ts`
3. `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts`
4. `src/v11/shared/reviewer/reviewerSeverityOntology.ts`
5. `docs/reviewer-severity-ontology.md`
6. Barmely reviewer-routing vagy reviewer-guidance teszt, amely a blocker jelentest vagy a `P0/P1` vs `P2/P3` consume szemantikat modositana

Normative boundary rule:
1. Phase 1 nem irhatja at a reviewer blocker fogalmat, csak elokesziti a persisted dual-threshold authorityt es a shared UI/read-model paritast.
2. Ha a tervezett implementacio a fenti anchorok barmelyiket erinti, az scope-creep, es vissza kell terelni a Phase 2 successor taskba.

### Complexity Risk Triage

1. `risk_score`: `6`
2. Axis breakdown:
   - `authority_risk = 1`
   - `surface_spread = 2`
   - `identity_join_risk = 0`
   - `activation_coupling = 1`
   - `prerequisite_risk = 0`
   - `acceptance_multiplicity = 2`
3. Split decision:
   marad kulon Phase 1 task az existing `Plan -> Task` bontason belul; nem huzhato ossze a reviewer workflow consume closure-rel.
4. Authority/source-of-truth note:
   ez a szelet uj canonical persisted fieldet vezet be es ugyanebben a bounded valtozasban zarja le a producer + mutation/read-model foundationt, de nem aktival reviewer routing authorityt.

### Closure-Budget Triage

1. Touched closures:
   - `authority_producer`
   - `shared_contract`
   - `internal_execution_consumers`
   - `read_model_consumers`
   - `persisted_authority_or_schema`
2. Intentionally collapsed closures:
   - `authority_producer` + `persisted_authority_or_schema`
   - `internal_execution_consumers` + `read_model_consumers`
3. Why this collapse is safe:
   ugyanaz a bounded codepath-csalad ownershipolja a parse/render/default/update/runtime-view/projection valtozasokat, es ezek nem nyitnak kulon workflow-orchestration vagy cleanup contractot.
4. Explicitly deferred closures:
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
5. No-split proof:
   a shared contract valtozas ebben a taskban nem lep at reviewer routing vagy ontology/guidance consume surface-re, ezert a plan-szintu ketfazisu split eleg.

### Bounded-Task-Shape Classification

1. Primary shape:
   `authority_producer`
2. Secondary shape:
   `activation_or_read_model`
3. Why the mix is safe:
   a secondary shape csak a producer altal ugyanebben a phase-ben ownershipolt status/list/detail/UI projection transzparenciara terjed ki; nincs kulon activation gate, workflow consume vagy uj side-effect ordering branch.

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
| CS7 | `src/v11/shared/ports/uiRouter.ts`, `routerHttpBody.ts`, `routerActionDispatch.ts` | UI mutate API | shared request field | exact public request shape: `reviewLoopMode` + optional `reviewBlockingMinSeverity` + optional `expectedBubbleToml`; ha a shared field jelen van, canonical mutation requestkent mindket thresholdot beallitja | P1 | T6 |
| CS8 | `src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts`, `sshBubbleReviewPolicyCommand.ts` | local+remote mutation orchestration | local es remote parity | ugyanaz a shared field -> dual-persisted-field mapping megy local es remote bubble-re is; threshold-omission preserve semantics explicit | P1 | T6,T7 |
| CS9 | `status/list/presenter` files | read-model output | projection alignment | status/list/detail response-ben reviewer es meta threshold is lathato | P1 | T4,T8 |
| CS10 | `tests/core/bubble/bubbleInstanceId.test.ts`, `tests/v11/application/kickoff/kickoffPersistencePreparation.test.ts` | persisted serialization snapshots | one-field review_policy block mar nem eleg | a persisted review-policy regex/snapshot assertionoknak explicit dual-threshold blockra kell valtaniuk | P1 | T12 |
| CS11 | `tests/v11/application/list/listCommandApi.test.ts`, `src/v11/shared/status/statusCommandApi.ts`, `src/v11/shared/list/listCommandEntryBuilder.ts` | wrapper/API passthrough | read-model wrapper parity | ne csak a projection builder, hanem az API/wrapper szint is ket thresholdos payloadot adjon tovabb | P1 | T8,T13 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Persisted review policy | `review_loop_mode`, `meta_review_auto_rework_min_severity` | `review_loop_mode`, `reviewer_blocking_min_severity`, `meta_review_auto_rework_min_severity` | both thresholds | none | additive persisted contract |
| Runtime view | meta-only threshold visible | dual threshold visible | reviewer + meta fields | guarded diagnostics unchanged | additive read-model contract |
| UI mutate body | `metaReviewAutoReworkMinSeverity?` | `reviewBlockingMinSeverity?` | one shared severity input | `expectedBubbleToml` | intentional API rename/tightening within same repo |
| UI router port | `UiUpdateBubbleReviewPolicyInput { reviewLoopMode, metaReviewAutoReworkMinSeverity?, expectedBubbleToml? }` | `UiUpdateBubbleReviewPolicyInput { reviewLoopMode, reviewBlockingMinSeverity?, expectedBubbleToml? }` | exact shared input shape | none | intentional port rename/tightening within same repo |
| Internal patch shape | `patch.review_loop_mode`, optional `patch.meta_review_auto_rework_min_severity` | `patch.review_loop_mode`, optional `patch.reviewer_blocking_min_severity`, optional `patch.meta_review_auto_rework_min_severity` | dual-field internal patch | none | additive internal contract |

Normative rules:
1. Reviewer canonical field neve:
   `reviewer_blocking_min_severity`
2. Reviewer default:
   `P3`
3. Meta-review field neve valtozatlan:
   `meta_review_auto_rework_min_severity`
4. A public UI/operator mutate request pontos threshold field neve:
   `reviewBlockingMinSeverity`
5. A Phase 1 public UI port exact shape-je:
   `UiUpdateBubbleReviewPolicyInput { bubbleId, repoPath|cwd, reviewLoopMode, reviewBlockingMinSeverity?, expectedBubbleToml? }`
6. A HTTP `update-review-policy` request body exact threshold shape-je:
   `reviewLoopMode` kotelezo, `reviewBlockingMinSeverity` optional, `expectedBubbleToml` optional.
7. Ha `reviewBlockingMinSeverity` jelen van, a mutation seam kotelezoen erre a ket internal persisted patch keyre fordit:
   - `review_policy.reviewer_blocking_min_severity = reviewBlockingMinSeverity`
   - `review_policy.meta_review_auto_rework_min_severity = reviewBlockingMinSeverity`
8. Ha `reviewBlockingMinSeverity` nincs jelen, a mutation seam nem irhat threshold change-et egyik persisted mezo fele sem; a meglévő reviewer/meta threshold ertekek preserved maradnak.
9. A local es remote update path ugyanazt a shared-input -> dual-persisted-field mappingot kell hasznalja; nem maradhat meta-only remote vagy local special-case.
10. A runtime viewben a ket persisted threshold kulon mezokent jelenik meg; shared UI input nem lesz persisted/runtime alias.
11. A status/list API wrapper es presenter payload ugyanazt a dual-threshold runtime viewt adja tovabb; nem maradhat olyan wrapper, amely csak a meta-review fieldet serializalja.
12. A create/kickoff altal elallitott vagy snapshotolt `review_policy` blokk explicit ket severity sort tartalmaz, nem eleg az egymezos legacy regex megtartasa.

### 3) Error Contract

| Trigger | Behavior | Reason Code / Surface | Priority |
|---|---|---|---|
| invalid reviewer threshold in TOML/API | reject | existing review-policy threshold invalid surface | P1 |
| unknown extra `review_policy` key | reject | existing `REVIEW_POLICY_INVALID` path | P1 |
| remote/local write conflict | conflict result | existing review-policy write conflict/state conflict | P1 |

### 4) Baseline Preservation

1. `must_preserve_behaviors`:
   - `review_loop_mode` parse/render/update semantics valtozatlan marad
   - `meta_review_auto_rework_min_severity` kulon persisted canonical mezokent megmarad
   - local/remote update path conflict es lock behavior preserved marad
   - status/list/detail surfaces tovabbra is normalized review-policy helperbol olvasnak
2. `allowed_resolution_paths`:
   - hianyzo reviewer threshold -> normalized default `P3`
   - shared UI severity input -> deterministic dual-field patch -> parse/render/normalize -> projection
3. `forbidden_regression_interpretations`:
   - a shared UI input nem downgrade-olhatja a dual-threshold persisted contractot UI-only aliasra
   - a reviewer threshold hianya nem oldodhat legacy meta-only mezobol visszafejtett truth-ra
4. `replacement_proof_required_if_removed`:
   ha barmely existing local/remote conflict vagy normalized projection path kikerulne, explicit parity proof kell arra, hogy az uj path ugyanazt a fail-closed/transparent viselkedest adja.

### 5) Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - UI/request body severity input valid domainba essen
   - current review-policy object parse/normalize sikeres legyen
   - remote update es local expected-content preconditions teljesuljenek
2. Side effects forbidden before those validations pass:
   - nincs bubble.toml rewrite invalid reviewer severity eseten
   - nincs local persisted patch conflict eseten
   - nincs remote write, ha az input shape vagy expected current state invalid
3. Invalid/precondition-failure behavior:
   - invalid input -> reject, side effect nelkul
   - unknown key / invalid TOML field -> reject, side effect nelkul
   - write conflict / state conflict -> explicit conflict result, reszleges dual-threshold atiras nelkul
4. Coordination primitives in scope:
   - local update lock authority `in scope`, preserved baseline behavior
   - remote update parity `in scope`, de nem uj concurrency modelkent, hanem existing conflict semantics parityjakent
5. Pure-by-default side-effect rule:
   parse/normalize/projection helpers purek maradnak; csak a designated local/remote mutation seam vegezhet persisted irast.
6. Dependency-failure fallback:
   dependency vagy transport failure eseten a task nem engedhet csendes single-field fallbackot; fail-closed reject/conflict path kell, partial persisted success nelkul.

### 6) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | config parse/render dual threshold | TOML with reviewer=`P2`, meta=`P3` | parse + render | roundtrip megtartja mindket mezot |
| T2 | invalid reviewer threshold reject | reviewer field = `P0` | parse/validation fut | explicit invalid threshold error jon |
| T3 | create default reviewer threshold | uj bubble create | config materializalodik | reviewer threshold default `P3` |
| T4 | runtime view dual threshold | config hianyos vagy explicit | normalize/runtime view fut | reviewer defaultol vagy explicit latszik, meta kulon latszik |
| T5 | local update writes both persisted fields | shared UI severity input = `P2` | local update-review-policy fut | reviewer=`P2`, meta=`P2` kerul bubble.toml-ba |
| T6 | router accepts exact shared field and forwards | HTTP body `reviewBlockingMinSeverity=P2` | router dispatch fut | canonical UI input a dual-field patchre mapelodik local+remote parityval |
| T7 | remote update parity | remote bubble update same inputtal | ssh script fut | remote bubble.toml-ban is reviewer=`X`, meta=`X` |
| T8 | status/list/detail projection transparency | updated bubble config | list/status/detail build fut | reviewPolicy projection reviewer + meta thresholdot is tartalmaz |
| T9 | invalid UI severity causes zero side effect | invalid shared severity input | local/remote update indulna | reject vagy conflict jon, bubble.toml nem iródik at reszlegesen |
| T10 | expected-content conflict preserves zero partial write | stale current review policy / competing update | local dual-threshold patch fut | explicit conflict result jon, reviewer/meta threshold nem valik szet |
| T11 | threshold omission preserves both persisted values | HTTP body contains only `reviewLoopMode` change | update-review-policy fut | reviewer/meta threshold unchanged marad local es remote pathon is |
| T12 | create/kickoff serialization reflects dual-threshold block | uj bubble config vagy kickoff persistence snapshot | TOML/assertion fut | `reviewer_blocking_min_severity` es `meta_review_auto_rework_min_severity` is explicit szerepel |
| T13 | status/list API wrappers preserve dual-threshold payload | projection builder mar dual-threshold viewt ad | list/status API wrapper fut | a kifele adott payload nem vesziti el a reviewer threshold mezot |

### 7) Review Control

Reviewer akkor adhat `IMPLEMENTABLE` allapotot, ha:
1. a dual-threshold contract minden producer/mutation/read-model surface-en konzisztens,
2. a reviewer default `P3` explicit es tudatos behavior-valtozaskent szerepel,
3. a shared UI control nem mossa ossze a persisted canonical dual-threshold shape-et,
4. a reviewer workflow consume nincs felig idehuzva ebbe a taskba,
5. a mutation boundary explicit bizonyitja a zero-partial-write / fail-closed elvart viselkedest.
6. a successor boundary proof egyertelmu: reviewer routing/guidance/ontology anchorok erintetlenek maradnak ebben a phase-ben.

## L2 - Implementation Notes (Optional)

1. A `reviewBlockingMinSeverity` operator convenience input, nem canonical persisted field.
2. Ha a backend/API rename blast radius indokolja, legacy alias csak atmeneti guardkent johet szoba, de nem kotelezo baseline.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a dual-threshold contract es a single-control mutate semantics ellentmondasmentes,
2. T1-T11 teljesen fedik a producer/mutation/read-model blast radiust, az exact UI/port/patch contractot es a zero-partial-write mutation boundaryt,
3. nincs reviewer routing logika scope-creep ebben a phase1 szeletben.

## Assumptions

1. A UI request field rename ugyanabban a repo-surface-ben kontrollalhato.
2. A current operatori transparency miatt a runtime view bovitese required-now, nem optional polish.
3. A create/kickoff/list/status snapshot- es wrapper-tesztek a producer/read-model closure reszei, nem kulon follow-up polish.

## Hardening Backlog

1. `later-hardening`: kulon compatibility alias policy csak akkor kell, ha kesobb kulso consumer jelenik meg a shared UI request fieldre.
2. `later-hardening`: kulon operator UI a reviewer es meta-review threshold szetvalasztott allitasara successor task lehet.
3. `later-hardening`: additional recovery/rollback instrumentation csak akkor kell, ha a local/remote update parity rollout kozben uj diagnostics gap jelenik meg.
