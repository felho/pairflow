---
artifact_type: task
artifact_id: task_runtime_review_policy_reviewer_bypass_contract_phase3a_v1
title: "Runtime Review Policy Reviewer Bypass Contract (Phase 3A)"
status: draft
phase: phase3a
target_files:
  - src/types/bubble.ts
  - src/types/ui.ts
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - ui/src/lib/types.ts
  - ui/src/lib/api.ts
  - ui/src/lib/actionAvailability.ts
  - ui/src/state/useBubbleStore.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts
  - tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - ui/src/lib/api.test.ts
  - ui/src/lib/actionAvailability.test.ts
  - ui/src/state/useBubbleStore.test.ts
prd_ref: null
plan_ref: plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/archive/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md
  - plans/archive/tasks/runtime-review-policy-auto-rework-threshold-phase2.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
  - plans/archive/tasks/actor-runtime-interface-reviewer-cutover-phaseE.md
  - plans/archive/tasks/actor-runtime-interface-meta-reviewer-cutover-phaseE.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Reviewer Bypass Contract (Phase 3A)

## Current Codebase Check (2026-04-22)

1. A canonical `review_policy` config/runtime surface mar merged baseline a current `main`-on:
   - `src/types/bubble.ts`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts`
2. A current runtime view mar explicitten kulon valasztja a kert es az effective loop modot:
   - `requested_loop_mode`
   - `effective_loop_mode`
   - `support_status`
   - `blocked_reason_code`
   es `meta_only` eseten tovabbra is `effective_loop_mode = "full"` marad.
3. A backend list/status consume family mar olvassa ezt a runtime view-t:
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
4. A UI-facing summary/detail contract viszont jelenleg nem viszi tovabb a review-policy surface-et:
   - `src/types/ui.ts`
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   - `ui/src/lib/types.ts`
5. Kulon UI/API mutation contract review-policy frissitesre jelenleg nincs:
   - `src/v11/infrastructure/ui/routerActionDispatch.ts` csak lifecycle actionokkal dolgozik
   - `ui/src/lib/api.ts` nem exportal review-policy update route-ot
6. A jelenlegi UI action es consume inventory egy uj operatori review-policy mutationhoz nem all meg a dispatchnel:
   - `src/v11/infrastructure/ui/routerActions.ts`
   - `ui/src/lib/actionAvailability.ts`
7. A `sticky_human_gate` es a `human_gate_sticky_bypass` gate-local baseline tovabbra is letezik, de ez nem reviewer-bypass activation contract:
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `docs/meta-review-gate-rollout-runbook.md`
8. Emiatt a current gap mar nem foundation vagy threshold-delivery hiany, hanem policy/config/UI/state/provenance contract hiany: a `meta_only` kerheto/persistalhato, de operator-facing consume es mutation contractja meg nincs explicit, es a guard/provenance sem eleg eros ahhoz, hogy Phase 3B nelkul biztonsagos activation nelkuli bypass-surface legyen.

## L0 - Policy

### Goal

Lezerni a reviewer bypass Phase 3A contractot ugy, hogy:
1. a `review_policy.review_loop_mode = "meta_only"` operator-facing config/UI/API/state contractja explicit legyen,
2. a rendszer egyertelmuen elvalassza a kert bypass policyt, az effective runtime modot, es a blocked/guarded allapot okat,
3. a bypasshoz kotott prerequisite-ek es provenance szabalyok explicit surfaced contractta valjanak,
4. a policy mutation es a UI/detail/list consume ugyanarra a canonical runtime-view / update seamre tamaszkodjon,
5. de a tenyleges scheduler/router/handoff topology valtas tovabbra se tortenjen meg ebben a fazisban.

### Domain / Control Model Summary

1. Business invariant:
   a `meta_only` kert allapot Phase 3A-ban se jelenthet effective runtime bypass-t; az operatornak mindig latszania kell, hogy a policy kert, guarded, vagy tenylegesen aktiv.
2. Control model:
   a canonical bypass policy source tovabbra is a workflow/orchestrator-owned `review_policy` bubble config surface; a UI/API csak ezt a canonical policyt kerheti vagy jelenitheti meg.
3. Read-path rule:
   operator-facing bypass status csak a canonical `reviewPolicyRuntime` projectionbol, illetve az ahhoz kotott prerequisite/provenance helperbol olvashato; UI local state vagy transcript-derived shorthand nem valhat canonical bypass truth-ta.
4. Forbidden fallback:
   `sticky_human_gate`, `human_gate_sticky_bypass`, approval envelope metadata, reviewer snapshot, vagy barmely gate-local historical allapot nem valhat reviewer-bypass activation vagy support truth-ta.
5. Allowed resolution path:
   `review_policy` config + explicit prerequisite/provenance classification ugyanazon orchestrator-owned runtime-view contract reszekent surfaced lehet; deterministic same-authority guard/provenance merge megengedett, ha named helper alatt tortenik.
6. Missing-data rule:
   ha a bypass prerequisite vagy provenance allapot nem bizonyithato, a rendszer fail-closed `effective_loop_mode = "full"` mellett marad, es canonical szinten `support_status = "guarded"` allapotot ad explicit diagnostics mezokkel. Ha `unsupported` nyelvezet megjelenik, az csak diagnostics/copy vocabulary lehet, nem uj canonical support-status.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: predecessor-owned; a canonical `review_policy` foundation mar adott
   - internal execution closure: not owned here
   - workflow/orchestration closure: owned here csak contract-surfacing es mutation-entry szinten
   - read_model closure: owned here a list/status/detail/UI/API consume familyben
   - activation closure: successor-owned Phase 3B
   - cleanup/recovery closure: successor-owned

### Plan Linkage

1. Parent plan gap closed:
   a Phase 2 utan hianyzo reviewer bypass contract slice, amely explicitte teszi a policy/config/UI/state/provenance shape-et activation nelkul.
2. Depends on:
   [runtime-review-policy-foundation-and-authority-refactor-phase1.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md)
   es
   [runtime-review-policy-auto-rework-threshold-phase2.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-auto-rework-threshold-phase2.md)
3. Unlocks / impacts successors:
   egy kesobbi Phase 3B bypass-activation successor mar explicit contractra es prerequisite/provenance vocabularyra epulhet, nem kell sajat UI/API/state semantics-et kitalalnia. Ennek a successornek a pontos artifact pathja ebben a korben meg nem prerequisite.
4. Task-list impact:
   ez az elso Phase 3 task; nem nyithatja ujra a Phase 1 foundationt vagy a Phase 2 threshold semantics-et.
5. Inherited validation / exit expectation:
   a bypass contract akkor zarult, ha a config mutation, a list/status/detail/UI/API consume, es a blocked/provenance diagnostics ugyanazt a canonical policy allapotot tukrozik, mikozben az effective runtime tovabbra is `full`.
6. Remaining-task viability rule:
   a Phase 3A outputnak additive successor seamet kell hagynia maga utan: a kesobbi activation task ne kenyszeruljon a requested/effective/support vocabulary vagy a policy update contract ujratervezesere, csak az activation ownershipot zarja le.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [reviewPolicyRuntime.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts)
   - [updateBubbleReviewPolicy.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts)
   - [listCommandEntryProjection.ts](/Users/felho/dev/pairflow/src/v11/shared/list/listCommandEntryProjection.ts)
   - [statusCommandViewBuilder.ts](/Users/felho/dev/pairflow/src/v11/shared/status/statusCommandViewBuilder.ts)
   - [bubblePresenter.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/ui/presenters/bubblePresenter.ts)
   - [routerActionDispatch.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/ui/routerActionDispatch.ts)
   - [ui.ts](/Users/felho/dev/pairflow/src/types/ui.ts)
2. Canonical elements:
   - `review_policy.review_loop_mode`
   - `requested_loop_mode`
   - `effective_loop_mode`
   - `support_status` (`enabled | guarded`)
   - `blocked_reason_code`
3. Guard elements:
   - `REVIEW_POLICY_META_ONLY_GUARDED`
   - explicit prerequisite/provenance diagnostics
   - optional `blocked_prerequisites` / `provenance_note`
   - conflict-aware single write seam (`updateBubbleReviewPolicy`)
4. Compat-only elements:
   - UI local optimistic state
   - optional `unsupported` operator copy, ha explicit guarded diagnosticsra van lekepzve
   - operator copy/tooltip wording
   - frontend action affordance state
5. Closed terms:
   - `meta_only` Phase 3A-ban requested/guarded contract, nem activation
   - `sticky_human_gate` gate-local autonomous review marker, nem reviewer-bypass signal
   - `human_gate_sticky_bypass` meta-review gate route, nem workflow bypass topology
6. Forbidden reinterpretations:
   - `sticky_human_gate` nem lephet elo bypass prerequisite proof-va
   - `human_gate_sticky_bypass` nem lephet elo `meta_only` activation truth-ta
   - a Phase 2 threshold route truth nem terhelheto ra bypass support/provenance copyra
   - a UI/API mutation success nem jelenthet activation success-t, csak policy update success-t
   - az `unsupported` kifejezes nem lephet elo uj canonical `support_status` enumkent Phase 3A-ban
7. Drift status:
   `no_drift_if_phase3a_preserves_requested_vs_effective_split_and_sticky_human_gate_non_bypass_meaning`

### Scope Reality / Shape Proof

`target_files` itt a kotelezo contract-anchorokat es a legkozelebbi current-tree consume surface-eket sorolja. Presentational component-level vagy infra-wiring fajlok csak akkor tekintendok Phase 3A implementation targetnek, ha a current tree bizonyithatoan nem tudja nelkuluk felhuzni ugyanazt a canonical contractot; ellenkezo esetben ezek successor vagy UX-polish scope-ban maradnak.

1. Inspected entrypoints / call-sites:
   `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`,
   `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts`,
   `src/v11/shared/list/listCommandEntryProjection.ts`,
   `src/v11/shared/status/statusCommandViewBuilder.ts`,
   `src/types/ui.ts`,
   `src/v11/shared/ports/uiRouter.ts`,
   `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`,
   `src/v11/infrastructure/ui/routerActionDispatch.ts`,
   `src/v11/infrastructure/ui/routerActions.ts`,
   `ui/src/lib/api.ts`,
   `ui/src/lib/actionAvailability.ts`,
   `ui/src/state/useBubbleStore.ts`.
2. Actual touched scope:
   `consumer_family_alignment` primary, `activation_or_read_model` secondary csak contract-surfacing ertelemben; tenyleges activation nincs scope-ban.
3. Mutation entrypoints in scope:
   a bypass-policy update operator-facing contractja; a canonical write seam tovabbra is az `updateBubbleReviewPolicy(...)`, es Phase 3A-ban ehhez bounded UI/API action surface kapcsolodhat.
4. Hidden scope ruled out:
   scheduler/router topology switch, actor handoff-target valtas, meta-review gate autonomous flow semantics, es barmilyen `meta_only` effective runtime aktivacio.
5. Branch inventory note:
   `requested=full`, `requested=meta_only + guarded`, `requested=meta_only + guarded+unavailable-diagnostics`, mutation success/conflict, prerequisite-known/prerequisite-missing, UI read-model present/missing branch kotelezoen reprezentalt.
6. Why the declared task shape matches reality:
   a producer boundary es a threshold authority mar letezik; ebben a fazisban a fo munka az operator-facing consume family es a mutation contract alignment ugyanarra a canonical review-policy truth-ra, activation nelkul.

### Authority Boundary Map

1. Authority producer:
   a workflow-owned `review_policy` config es az arra epulo `buildBubbleReviewPolicyRuntimeView(...)` outputja.
2. Persisted authority:
   `bubble.toml` `review_policy` blokk.
3. Internal execution consumers:
   retained baseline only; a Phase 3A task ezeket nem valtoztatja.
4. Workflow orchestration consumers:
   bounded UI/API mutation route es annak orchestrator-owned validation/provenance outputja.
5. Read model consumers:
   list/status/detail/UI/API summary surfaces.
6. Cleanup/recovery consumers:
   none in this task; conflict/rollback semantics a meglevő write seam baseline-jat reuse-olja.

### Closure-Budget Gate

1. Touched closure buckets:
   - `shared_contract`
   - `workflow_orchestration_consumers`
   - `read_model_consumers`
2. Explicitly not touched:
   - `authority_producer`
   - `internal_execution_consumers`
   - `persisted_authority_or_schema`
   - `cleanup_recovery_consumers`
3. Intentionally collapsed closures:
   `workflow_orchestration_consumers` + `read_model_consumers`
4. Why collapse is safe:
   ugyanarra a meglevo canonical `review_policy` runtime-view / write-seam baseline-re ulnek, es a task nem nyit uj producer vagy activation boundaryt.
5. Explicitly deferred closures:
   - `activation`: Phase 3B
   - barmely runtime topology / actor handoff valtas: Phase 3B

### Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `BubbleReviewPolicyRuntimeView` | list/status backend projection | additive | bypass prerequisite/provenance surface pontositasa ugyanebben a contract familyben | Phase 3B activation consume |
| UI summary/detail payload | UI presenter, UI types, frontend store/components | additive | review-policy surface felhuzasa a summary/detail contractba | future UX polish |
| UI router action contract | router dispatch + router action inventory + frontend api/store/action inventory | additive | bounded review-policy update action a canonical write seamhez, explicit success/conflict semantics-szal | Phase 3B activation command semantics |

### Baseline Preservation

1. Must-preserve behaviors:
   - `meta_only` tovabbra sem valhat `effective_loop_mode = "meta_only"` runtime viselkedesse
   - a Phase 2 threshold delivery semantics valtozatlan marad
   - a canonical `support_status` enum Phase 3A-ban is `enabled | guarded` marad
   - `sticky_human_gate` tovabbra is gate-local marker marad
   - a single write seam conflict behavior nem lazulhat
   - `meta_review_auto_rework_min_severity` Phase 3A-ban read-only marad; nem nyithato ujra ugyanebben a taskban mutation inputkent
2. Allowed resolution paths:
   - existing `review_policy` config -> runtime view
   - runtime view + explicit prerequisite/provenance helper -> UI/API surfaced contract
   - UI/API mutation -> `updateBubbleReviewPolicy(...)`
3. Forbidden regression interpretations:
   - guarded bypass-copy nem sugallhat aktiv runtime scheduler-valtast
   - UI gomb jelenlete nem jelentheti azt, hogy a prerequisite-ek teljesultek
   - `meta_only` request nem kapcsolhat ki meta-review gate vagy reviewer loop baseline-t
4. Replacement proof required if removed:
   ha a requested/effective/support split vagy a `REVIEW_POLICY_META_ONLY_GUARDED` family lecserelodik, explicit equivalence proof kell arra, hogy az uj surface ugyanazt a fail-closed semantics-et adja.

### Success / Completion Proof Boundary

1. Current canonical success proof source:
   operator-facingen csak a list/status backend runtime view latszik; mutation/UI contract nincs teljesen bezarva.
2. Target canonical success proof source:
   ugyanaz a canonical runtime view + explicit prerequisite/provenance diagnostics jelenik meg a UI/API/detail/list/status surfacesen es a mutation result contractban.
3. Current canonical completion proof source:
   successful `updateBubbleReviewPolicy(...)` write result + backend projection refresh.
4. Target canonical completion proof source:
   valtozatlanul a canonical policy write result + refetched runtime view; Phase 3A nem vezethet be activation-side effect proofot.
5. Proof-parity rule:
   `inherit_full_parity`
6. Final truth surfaces affected:
   `BubbleReviewPolicyRuntimeView`, `UiBubbleSummary`, `UiBubbleDetail`, UI router action result payload, frontend store-visible bubble detail/summary state.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape:
   `consumer_family_alignment`
2. Secondary shape (if any):
   `activation_or_read_model`; ez csak operator-facing read-model es mutation contract alignment, nem runtime activation.
3. Preconditions that must pass before side effects:
   - a requested policy patch valid
   - a canonical write seam conflict-free
   - prerequisite/provenance classification elerheto a surfaced contracthoz
4. Side effects forbidden before preconditions pass:
   - UI/API success response aktiv bypass copyval
   - runtime execution topology valtas
   - actor role/handoff target modositas
5. Invalid/precondition-failure behavior:
   zero activation side effect; explicit guarded diagnostics vagy standard conflict response.
6. Coordination primitives in scope:
   `N/A`; a meglevo optimistic write-conflict baseline reuse-ja kotelezo.

### In Scope

1. A `meta_only` requested/effective/support operator-facing contract explicitte tetele.
2. Explicit prerequisite/provenance fields vagy helper bevezetese a bypass support allapothoz.
3. A review-policy surface felhuzasa a UI summary/detail payloadba.
4. Bounded UI/API mutation contract review-policy update-re ugyanarra a canonical write seamre kotve.
5. Guarded operator copy es optional unsupported-style diagnostics wording, activation sugallata nelkul.
6. A necessary-minimum operator affordance ugyanazon current-tree summary/detail/action surface-ben, ha enelkul a canonical contract nem latszana vagy nem mutalhato.
7. A fenti contractok regression- es compatibility-tesztjei.

### Out of Scope

1. A `meta_only` tenyleges scheduler/router/handoff activationja.
2. Reviewer vagy meta-reviewer actor runtime topology atallitasa.
3. Meta-review gate route semantics, threshold semantics, vagy human-gate payload semantics modositasa.
4. Uj workflow engine vagy uj actor/output family.
5. Cleanup/recovery topology vagy cross-round gate-state behavior ujrairasa.
6. Kotelezo uj dedikalt UI panel vagy component-level redesign, ha a current tree mar rendelkezik elegendo operatori surface-szel a canonical contract surfacinghez.

### Safety Defaults

1. `requested_loop_mode = "meta_only"` mellett Phase 3A defaultja tovabbra is `effective_loop_mode = "full"`.
2. Ha a bypass prerequisite-ek vagy provenance nem bizonyithatok, a surfaced canonical allapot minimuma `guarded`; ha `unsupported` wording jelenik meg, az csak diagnostics/copy lehet. Silent activation tilos.
3. A UI/API copy nem hasznalhat "enabled" vagy "active" nyelvezetet, ha csak a policy kerese sikerult.
4. `sticky_human_gate` historical/current-round semantics nem olvashato be bypass support truth-kent.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - UI/API review-policy contract
   - review-policy runtime view contract
   - UI router mutation action contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `2`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Required split:
   - `consumer-family alignment + guarded contract surfacing`: this task
   - `activation`: successor Phase 3B

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing |
|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` | review-policy runtime types/builders | A bypass support/provenance shape additive modon bovuljon a Phase 1 requested/effective/support split megtartasa mellett | P1 | required-now |
| CS2 | `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts` | canonical write seam | A review-policy update contract explicitten tamassza ala a Phase 3A UI/API mutationt conflict-aware write boundaryval | P1 | required-now |
| CS3 | `src/v11/shared/list/listCommandContract.ts`, `src/v11/shared/list/listCommandEntryProjection.ts`, `src/v11/shared/status/statusCommandViewBuilder.ts` | backend read-model projection | A list/status surfaces ugyanazt a bypass support/provenance contractot mutassak, mint a detail/UI family | P1 | required-now |
| CS4 | `src/types/ui.ts`, `src/v11/shared/ports/uiRouter.ts`, `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` | UI detail/summary contract | A review-policy surface bekeruljon a summary/detail payloadba explicit blocked/provenance mezokkel | P1 | required-now |
| CS5 | `src/v11/infrastructure/ui/routerActionDispatch.ts`, `src/v11/infrastructure/ui/routerActions.ts`, `src/v11/shared/ports/uiRouter.ts` | UI router mutation entry | Legyen bounded review-policy update action contract a meglevo bubble-action surface-en, amely policy update-t jelent, nem activationt; tovabbi infra/default wiring csak akkor kotelezo, ha a current tree ezt kozvetlenul megkoveteli | P1 | required-now |
| CS6 | `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, `ui/src/lib/actionAvailability.ts`, `ui/src/state/useBubbleStore.ts` | frontend API/store consume | A frontend tipusok es action flow kulon kezeljek a policy update success-t, a standard conflictet, es a guarded surfaced allapotot | P1 | required-now |
| CS7 | presentational action/detail consume slots a current tree szerint | operator controls/copy | Ha a jelenlegi summary/detail/action compose csak dedikalt affordance-on keresztul tudja lathatova tenni a canonical bypass contractot, ott explicit guarded copy es disabled/action-affordance semantics kell; kulon component-level UI nem kotelezo, ha ugyanaz a contract mar mas current-tree slotban hitelesen surfaced | P2 | conditional-now |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Review policy runtime view | requested/effective/support + optional reason code | bypass prerequisite/provenance explicit additive shape a closed `enabled | guarded` support-status enum megtartasa mellett | `requested_loop_mode`, `effective_loop_mode`, `support_status`, `meta_review_auto_rework_min_severity` | `blocked_reason_code`, `blocked_prerequisites`, `provenance_note` | additive | P1 | required-now |
| UI summary/detail payload | nincs review-policy surface | explicit review-policy projection a UI contractban | `reviewPolicy` object azonos field-role mappinggel | operator copy helpers | additive | P1 | required-now |
| UI mutation action | nincs review-policy action | bounded review-policy update action a meglevo bubble-action routing familyben | `reviewLoopMode` | `expectedBubbleToml` | additive | P1 | required-now |
| Mutation result semantics | implicit/no route | success payload + standard HTTP conflict contract explicit | success: `kind`, `bubble`, `reviewPolicy`; conflict: `reasonCode`, `currentState`, `bubble` | optional warnings | additive | P1 | required-now |

Normative rules:

1. A `meta_only` kert policy es az effective runtime behavior Phase 3A-ban sem lehet azonos jelentesu.
2. A canonical `support_status` enum Phase 3A-ban is `enabled | guarded`; uj enum-ertek bevezetese nem ownershipolt.
3. Phase 3A minimuma ezert:
   - `meta_only` -> `support_status = guarded`
   - `effective_loop_mode = full`
4. Ha `unsupported` wording kell operator copyhoz, azt `blocked_reason_code` / `blocked_prerequisites` / `provenance_note` familyre kell lekepzeni, nem `support_status`-ra.
5. A surfaced `blocked_prerequisites` vagy ezzel ekvivalens helper nem lehet UI-local hand-maintained lista; orchestrator-owned helperbol kell jonnie.
6. A `sticky_human_gate` es a gate route vocabulary nem keverheto a bypass policy vocabularyval.
7. A Phase 3A UI mutation csak `reviewLoopMode` frissitest ownershipol; `metaReviewAutoReworkMinSeverity` write-pathja nem resze ennek a tasknak.
8. A mutation result contractnak ki kell tudnia mondani, hogy:
   - a policy update sikerult,
   - de a runtime activation tovabbra sincs bekapcsolva.
   Konfliktus eseten a UI router a meglevo standard `409 conflict` API semantics-et reuse-olja, current-bubble contexttel.
9. A task nem ownershipolja egy uj dedikalt UI affordance bevezeteset; eleg barmely current-tree action/detail surface, amely ugyanazt a canonical read/write contractot torzitas nelkul mutatja.

### 3) Shared Contract / Consumer Inventory

| Consumer Bucket | Consumers | This Task Responsibility | Deferred |
|---|---|---|---|
| persisted_authority | `bubble.toml review_policy` | reuse existing canonical store | no schema expansion without proof |
| workflow_orchestration_consumers | UI router action boundary | add bounded policy update contract | runtime activation |
| read_model_consumers | list/status/detail/UI/API/store/components | align surfaced bypass contract | later UX polish |
| internal_execution_consumers | runtime scheduler/router/handoff | preserve baseline only | Phase 3B |
| cleanup_recovery_consumers | none | preserve existing conflict semantics | Phase 3B if needed |

### 4) Branch / Inventory Matrix

| Branch | Expected Outcome | Priority |
|---|---|---|
| `requested=full` | surfaced as enabled/full baseline | P1 |
| `requested=meta_only + prerequisites preserved-blocked` | surfaced as guarded with explicit reason/provenance, effective full | P1 |
| `requested=meta_only + prerequisite proof unavailable` | surfaced as guarded fail-closed, explicit unavailable/unsupported diagnostics mellett, effective full | P1 |
| `policy update success` | mutation success + refreshed runtime view, no activation claim | P1 |
| `policy update conflict` | standard HTTP 409 conflict + current bubble context, no partial write | P1 |
| `UI read-model stale/missing reviewPolicy` | fail-closed rendering without fake enabled state | P1 |

### 5) Test Matrix

| ID | Scenario | Assertions | Priority |
|---|---|---|---|
| T1 | review-policy runtime view meta_only contract | `requested=meta_only`, `effective=full`, `support_status=guarded`, diagnostics surfaced | P1 |
| T2 | write seam supports review_loop_mode mutation for UI/API consumer | success vs conflict semantics explicit, no partial write | P1 |
| T3 | list/status projection includes bypass support/provenance fields | backend read-model parity preserved | P1 |
| T4 | UI summary/detail presenter carries reviewPolicy through | `UiBubbleSummary/Detail` contains canonical projection | P1 |
| T5 | UI router validates the bounded review-policy update action payload es write conflictet standard `409`-re mapel | no hidden activation path, no ad hoc success-conflict union | P1 |
| T6 | frontend api/store handles policy update success as policy-only success es `409 conflict` current-bubble contexttel | no activation language or state assumptions | P1 |
| T7 | presentational surface only if dedicated affordance is introduced | guarded copy es diagnostics-driven affordance rules; operator nem keverheti ossze a requestet az activationnel | P2 |
| T8 | sticky_human_gate does not affect bypass contract rendering | gate-local state not reused as bypass truth | P1 |

## L2 - Acceptance Criteria

1. A `meta_only` review-policy operator-facing contract explicit es auditalhato:
   a kert bypass policy, az effective runtime mod, es a blocked/guarded ok kulon mezokben jelenik meg.
2. A UI/API/detail/list/status surfaces ugyanazt a canonical bypass support/provenance truth-ot mutatjak.
3. A review-policy update action ugyanarra a canonical write seamre ul a meglevo bubble-action routing familyben, standard success/HTTP-conflict semantics-szal, explicitten policy update-kent viselkedik activation nelkul.
4. A task explicit regressionvedelmet ad arra, hogy `sticky_human_gate` vagy `human_gate_sticky_bypass` ne legyen felreolvasva reviewer-bypass support truth-kent.
5. A Phase 3A task nem vezet be scheduler/router/handoff activationt; a `meta_only` effective runtime mod tovabbra sem kapcsolodik be, es a canonical `support_status` enum sem nyilik ujra.
6. A task utan marad egy eletkepes successor seam a Phase 3B activationhoz anelkul, hogy a requested/effective/support vocabularyt vagy a policy-mutation contractot ujra kellene tervezni.

## Acceptance Evidence

1. Backend tests bizonyitjak, hogy a bypass contract additive a meglévő review-policy runtime view familyben.
2. UI/router/store es szukseg eseten a konkret presentational surface tesztjei bizonyitjak, hogy a surfaced bypass allapot canonical szinten guarded marad activation nelkul, es barmely unavailable/unsupported wording csak diagnostics-copy.
3. Mutation tests bizonyitjak a `200 success` vs `409 conflict` contractot es a zero-activation side effect szabalyat.
4. The task artifact itself documents and proves, hogy a Phase 3A requested/effective/support vocabulary es a policy-mutation seam additive successor feluletet hagy a kesobbi Phase 3B activationnak, ujratervezesi kenyszer nelkul.

## Hardening Backlog

1. `later-hardening`: ha a Phase 3B activation elokeszitesehez tobb prerequisite jelenik meg, erdemes kulon typelt helperbe emelni a `blocked_prerequisites` vocabularyt.
2. `later-hardening`: ha a UI-ban a bypass policy kulon panelt kap, a current summary/detail consume family utan kulon presentational compose task indokolt lehet.
3. `later-hardening`: ha a CLI operator surface is consume-olni kezdi a bypass support/provenance contractot, kulon CLI/read-model alignment taskot erdemes nyitni, nem ebbe a Phase 3A taskba huzni.
