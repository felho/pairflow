---
artifact_type: task
artifact_id: task_meta_review_approval_package_route_aware_ui_phase1_v1
title: "Meta-Review Approval Package Route-Aware UI Context (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/v11/shared/approval/pendingApprovalSignal.ts
  - src/v11/shared/inbox/inboxCommandApi.ts
  - src/types/ui.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - tests/core/bubble/inboxBubble.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/server.integration.test.ts
  - ui/src/lib/types.ts
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/test/fixtures.ts
  - docs/pairflow-ui-prd.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-ui-prd.md
owners:
  - "felho"
---

# Task: Meta-Review Approval Package Route-Aware UI Context (Phase 1)

## Current Codebase Check (2026-04-26)

1. A canonical `APPROVAL_REQUEST` mar most is tartalmazza a meta-review human-gate route metadata-t:
   - `latest_recommendation`
   - `meta_review_gate_route`
   - opcionisan parity es reason-code mezok.
2. A pending approval projection ma ezt az authority-t levagja, es csak `summary` + `refs` + envelope alapszintu mezok maradnak.
3. Az expanded bubble card ma nem renderel kulon `READY_FOR_HUMAN_APPROVAL` approval-package szekciot; specializalt inbox-contentet csak `WAITING_HUMAN` alatt mutat.
4. A frontend tesztbaseline ezt explicit rogziti: jelenleg nincs kulon approval package card az expanded cardon `READY_FOR_HUMAN_APPROVAL` esetben.
5. Emiatt a UI nem tudja megkulonboztetni a sima human gate-et attol az esettol, amikor a meta-review `rework` ajanlast adott, de az auto-rework budget kimerult.

## L0 - Policy

### Goal

Vezessunk be egy bounded `READY_FOR_HUMAN_APPROVAL` expanded approval package surface-t, es tegyuk route-aware-va ugy, hogy:
1. a human gate oka a canonical current-round approval request metadata-bol jojjon,
2. az expanded card dedikalt approval package szekciot kapjon ehhez a state-hez,
3. a `human_gate_budget_exhausted` eset explicit operator copyval jelenjen meg,
4. metadata hianya vagy ismeretlen route eseten a mai generikus approval package fallback maradjon,
5. ne valtozzon lifecycle, action availability vagy approval/rework backend szemantika,
6. a valtozas bounded maradjon az approval-request consume/read-model lane-en,
7. ebben a fazisban csak a `human_gate_budget_exhausted` + `rework` kombinacio kapjon explicit specializalt copyt; minden mas route/recommendation kombinacio generic fallback marad.

### Domain / Control Model Summary

1. Business invariant:
   a human approval gate oka a current-round canonical `APPROVAL_REQUEST` authoritybol jon, nem a lifecycle state-bol vagy UI-heurisztikabol.
2. Control model:
   a backend a canonical pending approval requestbol additive, opcionális route/recommendation contextet projektal a UI detail contractba; a frontend csak ezt a projected authority-t rendereli.
3. Read-path rule:
   approval package route-aware copy csak a current-round canonical pending approval request metadata-jat olvashatja.
4. Helper reuse rule:
   a metadata interpretation a meglevo approval-request helper authorityra tamaszkodik; nem nyithat uj, parhuzamos transcript- vagy UI-helyi metadata-parse utat.
5. Forbidden fallback:
   - `READY_FOR_HUMAN_APPROVAL` state onmagaban nem eleg a gate okanak megallapitasara,
   - `meta_review.auto_rework_count/limit` statebol vagy egyeb runtime statebol nem szabad ujra levezetni a route-ot,
   - summary string parse vagy fix text-match nem lehet canonical source.
6. Allowed resolution path:
   transcript canonical approval request -> approval transcript helpers -> `PendingApprovalSignal` -> `BubbleInboxView` -> `UiBubbleDetail.inbox.items[]` -> expanded card approval package section/copy.
7. Missing-data rule:
   ha a current-round approval request metadata-ja nem tartalmaz route/recommendation contextet, a UI a mai generikus approval package szoveget tartja meg.
8. Phase boundary:
   - contract closure: owned here, additive first-party UI payload mezokkel
   - producer closure: none, a canonical approval request metadata mar letezik
   - internal execution closure: owned here, pending approval projection / presenter threading / helper reuse
   - workflow/orchestration closure: none, state machine es action eligibility valtozatlan
   - read-model closure: owned here, expanded approval package section/rendering
   - reviewer-threshold/parity closure: none, findings threshold/parity policy es reviewer-facing parity UX nem resze ennek a tasknak
   - activation closure: none
   - cleanup/recovery closure: none

### Explicit Non-Goals

1. Nem resze ennek a tasknak a `metaReviewGate` producer vagy routing policy modositasa.
2. Nem resze ennek a tasknak a `BubbleTimeline` vagy barmely mas timeline/read-history surface bovitese.
3. Nem resze ennek a tasknak reviewer-facing threshold/parity UI, findings count badge, vagy numeric auto-rework budget kijelzes.
4. Nem resze ennek a tasknak list-view, compact card, inbox summary row, vagy action footer copy/behavior modositas.
5. Nem resze ennek a tasknak uj route taxonomy vagy route precedence szabaly bevezetese a canonical approval request authorityn tul.

### Plan Linkage

1. Work type:
   small feature.
2. Plan override decision:
   nem szukseges kulon plan, mert nincs DB/API/auth/config boundary valtozas, es a shared first-party UI contract additive, ugyanebben a bounded taskban alignalhato.
3. Unlocks / impacts successors:
   kesobbi route-specific UX polish taskok erre az additive contractra epulhetnek.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/v11/shared/approval/approvalTranscriptContext.ts](/Users/felho/dev/pairflow/src/v11/shared/approval/approvalTranscriptContext.ts)
   - [src/v11/shared/approval/pendingApprovalSignal.ts](/Users/felho/dev/pairflow/src/v11/shared/approval/pendingApprovalSignal.ts)
   - [src/v11/shared/inbox/inboxCommandApi.ts](/Users/felho/dev/pairflow/src/v11/shared/inbox/inboxCommandApi.ts)
   - [src/types/ui.ts](/Users/felho/dev/pairflow/src/types/ui.ts)
   - [src/v11/infrastructure/ui/presenters/bubblePresenter.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/ui/presenters/bubblePresenter.ts)
   - [ui/src/components/canvas/BubbleExpandedCard.tsx](/Users/felho/dev/pairflow/ui/src/components/canvas/BubbleExpandedCard.tsx)
   - [docs/pairflow-ui-prd.md](/Users/felho/dev/pairflow/docs/pairflow-ui-prd.md)
2. Canonical elements:
   - current-round pending approval signal tovabbra is a canonical approval request projectionja
   - approval-request metadata interpretation tovabbra is az approval transcript helper authorityhoz kotott
   - `READY_FOR_HUMAN_APPROVAL` action matrix valtozatlan
   - az uj approval package surface csak expanded-card read-model surface lehet ebben a taskban
3. Guard elements:
   - projected approval route mezok opcionálisak
   - a Phase 1 specializalt copy kivalasztasa kizarolag a `human_gate_budget_exhausted` + `rework` kombinaciohoz kotott
   - unknown/missing route eseten generic copy fallback kotelezo
   - jelen vagy jovobeni, de ebben a fazisban nem specializalt route/recommendation kombinacio generic fallbackra esik vissza
   - nincs uj transcript-walking vagy UI-helyi metadata interpretation
4. Compat elements:
   - `summary`, `refs`, `envelopeId`, `round`, `sender` mezok preserved
   - list view es non-expanded surfaces jelen taskban nem kapnak uj UI behavior-t
5. Forbidden reinterpretations:
   - a UI nem nevezheti `budget_exhausted`-nek azt az esetet, amit a canonical approval request nem mond ki
   - elozo round approval metadata nem szivaroghat at a jelenlegi approval package-be
   - az implementation nem hozhat letre uj, helper-kerulo metadata olvasasi utat ugyanarra a canonical requestre
   - az approval package route-aware szovege nem valthat ki lifecycle vagy action gating logikat
6. Drift status:
   no_drift, mert a task a meglevo canonical metadata-t viszi tovabb, nem irja at a gate szemantikat.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `resolveLatestPendingApprovalRequest`, approval transcript helper functions, `getBubbleInbox`, `mapPendingInboxItems`, `presentBubbleDetail`, `BubbleExpandedCard`, router/detail consumers, inbox proof tests.
2. Actual touched scope:
   approval-request consume-family + expanded-card approval-package surface bevezetese + UI read-model alignment.
3. Mutation entrypoints in scope:
   nincs lifecycle mutation vagy approval decision mutation.
4. Shared contract in scope:
   igen, de additive es first-party:
   - backend UI payload
   - frontend mirrored UI types
   - expanded card consume path
   - router/detail serialization proof surfaces
   - inbox read-model proof surfaces
5. Hidden scope ruled out:
   - meta-review gate producer
   - approval action dispatch
   - list-view badge rendszer
   - timeline protocol contract
   - runtime state persistence
6. Why the declared task shape matches reality:
   a canonical metadata mar letezik; ez a task ugyanannak az authority-nak a projection hianyat zarja le, es bounded modon itt vezeti be a hianyzo expanded-card approval-package surface-t anelkul, hogy producer vagy mutation lane-eket ujranyitna.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Entry | Contract Delta | Required Behavior | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/approval/pendingApprovalSignal.ts` | `resolveLatestPendingApprovalRequest(...)` | approval signal additive metadata threading | current-round canonical approval requestbol optional `latestRecommendation` es `gateRoute` projected legyen, a meglevo approval helper authority reuse-val | P1 | T1,T2,T10,T12 |
| CS2 | `src/v11/shared/inbox/inboxCommandApi.ts` | `BubbleInboxView.items[]` | backend inbox view shape additive bovitese | approval inbox item vigye a projected route-aware contextet | P1 | T1,T3,T9 |
| CS3 | `src/types/ui.ts`, `ui/src/lib/types.ts` | `UiBubbleInboxItem` | shared first-party UI contract additive update | optional approval context mezok mirrorozva legyenek backend es frontend oldalon is | P1 | T3,T9 |
| CS4 | `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` | `presentBubbleDetail(...)` | detail presenter preserves approval context | inbox itemek projected approval mezoi elvesztes nelkul jussanak el a frontendhez | P1 | T3 |
| CS5 | `ui/src/components/canvas/BubbleExpandedCard.tsx` | `READY_FOR_HUMAN_APPROVAL` approval package section | uj expanded-card read-model section + route-aware copy selection | a card kapjon dedikalt approval package szekciot; `human_gate_budget_exhausted` + `rework` eseten explicit budget-exhausted copy; egyebkent generic fallback | P1 | T4,T5,T6,T7,T8,T13 |
| CS6 | `ui/src/components/canvas/BubbleExpandedCard.test.tsx`, `ui/src/test/fixtures.ts` | expanded-card frontend proof surfaces | frontend expanded approval-package coverage | expanded-card fixture/test consume path prove-olja a specializalt copyt es a fallback viselkedeseket a bounded UI slice-on belul | P1 | T4,T5,T6,T7,T8,T13 |
| CS7 | `tests/core/bubble/inboxBubble.test.ts` | pending approval inbox proofs | proof-surface alignment | inbox read-model proof fedje az additive approval context fennmaradasat es current-round-only behavior-t | P1 | T1,T2,T9,T10 |
| CS8 | `tests/core/ui/bubblePresenter.test.ts`, `tests/core/ui/router.test.ts`, `tests/core/ui/server.integration.test.ts` | presenter/router/detail serialization proofs | proof-surface alignment | backend detail payload serialization preserve-olja az approval contextet a UI consume pathig | P1 | T3,T10 |
| CS9 | `docs/pairflow-ui-prd.md` | expanded card / pending item highlight wording | UX contract parity | optional, de ha implementation kozben szukseges, a PRD jelezze hogy approval package oka canonical approval metadata-bol jon | P2 | T11 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Pending approval signal | envelope alapszintu adatok | envelope adatok + route-aware approval context | `latestRecommendation?`, `gateRoute?` | `gateReasonCode?` csak ha tenyleg kell a copyhoz | additive |
| UI inbox item | generic item shape | generic item shape + approval-only optional fields | approval route/recommendation only | future parity counts nem kotelezok ebben a taskban | additive |
| Approval package surface | nincs kulon `READY_FOR_HUMAN_APPROVAL` expanded section | uj expanded approval-package section + route-aware text + generic fallback | dedicated section only on expanded card | later extra route copy map | backward-compatible fallback |

Normative rules:
1. A projected approval context csak `APPROVAL_REQUEST` itemeken jelenhet meg.
2. A route-aware approval package copy csak a current-round canonical pending approval requestre epulhet.
3. A metadata interpretationnak a meglevo approval transcript helper authorityt kell reuse-olnia; ugyanarra a requestre nem johet letre kulon parse ut.
4. `human_gate_budget_exhausted` es `latestRecommendation=rework` esetben a UI-nek explicit ki kell mondania, hogy:
   - meta-review rework ajanlast adott,
   - az auto-rework budget kimerult,
   - emiatt most emberi dontes szukseges.
5. Phase 1-ben csak a `human_gate_budget_exhausted` + `rework` kombinacio kap explicit specializalt copyt; minden mas route vagy recommendation kombinacio generic fallback marad.
6. A task nem vezeti be kotelezoen az `auto_rework_count/limit` numerikus kiirasat, findings threshold/parity szamlalot, vagy reviewer-facing parity magyarazatot; a bounded scope egyelore csak a route-ok explicit copy parityja.
7. Hianyzo metadata, ismeretlen route, vagy jelen fazisban nem specializalt route/recommendation kombinacio eseten a jelenlegi generikus approval package szoveg preserved fallback.
8. A dedikalt approval package surface csak az expanded cardon jelenik meg; list view, timeline es mas feluletek nem valtoznak ebben a taskban.
9. A `READY_FOR_HUMAN_APPROVAL` action matrix, modal behavior, es approval/request-rework API surface valtozatlan.

### 3) Shared Contract Compatibility Gate

1. Current consumers inventory:
   - backend UI presenter
   - backend UI/server tests
   - backend inbox read-model proofs
   - frontend mirrored UI types
   - expanded bubble card
   - frontend fixtures/tests
   - router/detail serialization proofs
2. Additive vs breaking:
   additive only; existing consumers optional mezok nelkul tovabbra is validak.
3. Alignment strategy:
   backend projection + inbox proof alignment + frontend type mirror + presenter/router serialization proof + expanded-card consume ugyanebben a taskban tortenik.
4. Forbidden compatibility shortcut:
   ne legyen backend-only mezobovites frontend type alignment es proof-surface refresh nelkul.

### 4) Error / Fallback Contract

| Trigger | Behavior | Reason Code / Surface | Priority |
|---|---|---|---|
| current-round `APPROVAL_REQUEST` item jelen van, de route/recommendation metadata hianyzik vagy partial | generic approval package copy | no error, compat fallback | P1 |
| current-round `APPROVAL_REQUEST` item route=`human_gate_budget_exhausted`, de recommendation nem `rework` | generic approval package copy | recommendation-axis bounded fallback | P1 |
| current-round `APPROVAL_REQUEST` item route metadataja jelen van, de a route nem `human_gate_budget_exhausted` | generic approval package copy | future-route-safe compat fallback | P1 |
| `READY_FOR_HUMAN_APPROVAL` detailhez nincs current-round pending `APPROVAL_REQUEST` inbox item | route-aware approval context nincs; a UI nem inferal metadata-t, es legfeljebb a state-level generic approval package copy maradhat | canonical pending approval resolution preserved | P1 |

### 5) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | pending approval signal projects budget-exhausted route | current round canonical approval request metadata includes `latest_recommendation=rework` and `meta_review_gate_route=human_gate_budget_exhausted` | pending approval signal resolve fut | projected signal tartalmazza a route-aware approval contextet |
| T2 | missing approval metadata falls back cleanly | approval request summary van, metadata nincs vagy partial | projection fut | optional route mezok `undefined`, summary preserved |
| T3 | UI detail contract preserves additive fields | backend detail view built from inbox item with approval context | presenter/detail serialization fut | frontend detail payloadban ugyanaz az approval context jelenik meg |
| T4 | expanded card introduces approval package section | detail bubble `READY_FOR_HUMAN_APPROVAL` with pending approval item | expanded card render | dedikalt approval package section jelenik meg ezen a surface-en |
| T5 | expanded card shows budget exhausted copy | detail bubble `READY_FOR_HUMAN_APPROVAL`, approval item route=`human_gate_budget_exhausted`, recommendation=`rework` | expanded card render | approval package explicit budget-exhausted + human-decision-required szoveget mutat |
| T6 | expanded card preserves generic fallback copy on missing or unsupported route metadata | detail bubble approval item route hianyzik vagy a route nem `human_gate_budget_exhausted` | expanded card render | jelenlegi generic approval package copy marad |
| T7 | expanded card preserves generic fallback copy on recommendation mismatch | detail bubble approval item route=`human_gate_budget_exhausted`, de recommendation nem `rework` | expanded card render | nincs budget-exhausted special copy; a generic approval package copy marad |
| T8 | expanded card does not invent route-aware context without approval item | detail bubble `READY_FOR_HUMAN_APPROVAL`, de nincs current-round pending `APPROVAL_REQUEST` inbox item | expanded card render | nincs synthetic route-aware copy; legfeljebb a generikus approval package surface marad |
| T9 | inbox read-model proof keeps current-round-only approval context | previous round approval request exists, current round request is still pending | inbox view build fut | csak a current-round unresolved approval item viszi a projected route-aware contextet |
| T10 | stale previous-round approval context does not leak | previous round approval request exists, current round decision/resolution mar megtortent | pending approval resolution fut | current detailben nincs stale approval route context |
| T11 | PRD parity optional update | implementation explicit canonical approval metadata read-pathot bevezet | docs review | UI PRD szoveg nem mond ellent a canonical read-pathnak |
| T12 | pending approval projection reuses canonical helper authority | current round approval request metadata elerheto a meglevo approval transcript helper pathon | pending approval signal projection update tortenik | nincs uj transcript-walking vagy UI-helyi metadata parse ut; a projected route-aware context a meglevo approval helper authoritybol szarmazik |
| T13 | route-aware approval package does not alter READY_FOR_HUMAN_APPROVAL action matrix | detail bubble `READY_FOR_HUMAN_APPROVAL` route-aware approval contexttel | expanded card render es detail consume path lefut | approval/request-rework action availability, modal behavior, es API semantics valtozatlan maradnak |

### 6) Review Control

Reviewer csak akkor adhat `IMPLEMENTABLE` allapotot, ha:
1. a task egyertelmuen kimondja, hogy a gate oka a canonical approval request metadata-bol jon,
2. a bounded scope nem nyitja ujra a meta-review gate producer vagy approval mutation lane-eket,
3. a shared UI contract additive marad es minden first-party consumer ugyanebben a taskban alignalodik, beleertve az inbox es router/detail proof surface-eket,
4. a missing metadata fallback explicit es preserved,
5. a task explicit kimondja, hogy itt uj expanded-card approval package surface jon letre, nem csak copy-csere egy mar meglevo blokkon,
6. a `human_gate_budget_exhausted` operator copy mar nem osszekeverheto egy generic human gate-tel,
7. a task explicit kizarta a reviewer-facing threshold/parity consume scope-ot es a nem-expanded surface scope creep-et.

## L2 - Implementation Notes (Optional)

1. A minimal bounded slicehoz eleg:
   - `latestRecommendation`
   - `gateRoute`
   optional field threading.
2. `gateReasonCode` csak akkor erdemes most felvenni, ha a copyhoz tenylegesen kell; kulonben felesleges contract-noise.
3. A pending approval projection metadata olvasasa reuse-olja a meglevo `approvalTranscriptContext` helper authorityt, ne vezessen be uj parhuzamos parse logikat.
4. A frontend copyban jobb explicit route-aware mondatot hasznalni, mint numerikus state-internals-t kiirni, mert az utobbi uj consume-family terhelest nyitna.
5. Ha a cardban helper keszul a copyhoz, az csak a mar projected approval context mezoket fogyassza, egy helyen tartsa a generic fallbacket es a `human_gate_budget_exhausted` override-ot, es ne nyisson uj metadata-parse utat.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a route-aware approval package oka a canonical pending approval request authorityhoz kotott,
2. a task egyertelmuen bounded modon uj expanded-card approval-package surface-kent kezeli ezt a UI-t,
3. csak a `human_gate_budget_exhausted` + `rework` kombinacio kap explicit specializalt copyt, minden mas route/recommendation kombinacio generic fallback marad,
4. a budget-exhausted UX explicit, de bounded marad,
5. a shared UI contract additive es tesztekkel vedett, beleertve a recommendation-axis fallback proofot,
6. reviewer-facing threshold/parity consume scope es non-expanded surfaces explicit out-of-scope maradnak,
7. a valtozas bounded marad az approval-request consume/read-model lane-en, producer vagy mutation lane nyitasa nelkul,
8. lifecycle/action semantics valtozatlanul maradnak.

## Assumptions

1. A jelenlegi operator fajas pont elsodlegesen a `human_gate_budget_exhausted` + `rework` kombinacio; a tobbi route vagy recommendation kombinacio dedikalt copyja kesobbi follow-upban is jo lehet.
2. A generic approval package szoveg ma elfogadhato fallback azokban az esetekben, ahol a route metadata nincs jelen.
3. A numerikus budget szamlalo (`5/10`) explicit megjelenitese nem kovetelmeny ebben a bounded taskban.
4. Reviewer-facing threshold/parity UX vagy findings split copy kulon follow-up taskban kezelendo, nem ebben a Phase 1 route-aware UI slice-ban.
