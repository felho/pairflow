---
artifact_type: task
artifact_id: task_role_neutral_implementer_handoff_delivery_unification_phase1_v1
title: "Role-Neutral Implementer Handoff Delivery Unification (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/v11/application/pass/reviewerDelivery.ts
  - src/v11/application/pass/reviewerDeliveryHelpers.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoRework.ts
  - src/core/runtime/tmuxDelivery.ts
  - tests/v11/application/pass/normalPassDeliveryExecution.test.ts
  - tests/v11/application/converged/convergedExecution.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/converged.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Role-Neutral Implementer Handoff Delivery Unification (Phase 1)

## L0 - Policy

### Goal

Javitsuk ki a most latott meta-reviewer -> implementer handoff instabilityt ugy, hogy az implementer felé menő tmux-delivery es retry semantics egyetlen kozos, role-neutral helperen keresztul menjen, es a meta-review auto-rework ág ne tartson fenn kulon delivery special-case viselkedest.

Phase 1 akkor sikeres, ha:
1. a reviewer -> implementer es a meta-reviewer -> implementer handoff ugyanazt a delivery primitive-et hasznalja,
2. a reviewer-ág jelenlegi stabil behaviora regresszio nelkul megmarad,
3. a meta-reviewer ág delivery es retry behaviora ehhez felzarkozik,
4. az implementernek kuldott action text nem csuszik vissza legacy "human requested rework" jelentésre pusztan az envelope tipus miatt.

### Context

Observed issue:
1. a normal reviewer -> implementer handoff a jelenlegi repo-ban jellemzoen stabil,
2. a meta-reviewer auto-rework -> implementer handoff ezzel szemben gyakrabban fut `delivery_unconfirmed` vagy "next agent did not start" jellegu operativ helyzetbe,
3. a low-level tmux write/confirm reteg kozos, ezert a valos differencia a wrapper es orchestration retegekben keresendo,
4. ma a ket ág nem ugyanazon handoff pipeline-ra fordul le:
   - a normal PASS a `reviewerDelivery.ts` utvonalon megy,
   - a meta auto-rework a `convergedGateDelivery.ts` special-case utvonalon megy,
5. a meta ág ma persisted gate route + auto-rework special-case + implementer delivery kombinalt logikabol all, ez pedig driftet okozott a normal implementer-handoff referenciahoz kepest.

Why this matters:
1. first-principle alapon az implementernek kuldott handoff delivery-je nem fugghet attol, hogy reviewer PASS vagy meta-review auto-rework volt a forras,
2. a rendszerben a `reviewer` es a `meta_reviewer` kulonbozo origin lehet, de az implementer target-delivery primitive nem lehet kulonbozo,
3. a mostani bug nem topology-csere vagy uj actor runtime initiative, hanem konkret internal delivery drift,
4. ezt a driftet ugy kell megszuntetni, hogy a reviewer-ág ne romoljon el.

### In Scope

1. Közös implementer-handoff delivery helper bevezetese a reviewer PASS es a meta auto-rework kozos vegpontjakent.
2. A reviewer -> implementer referencia-behavior explicit befagyasztasa es annak megtartasa.
3. A meta-review auto-rework delivery utvonal ráültetese ugyanerre a helperre.
4. Az implementer oldali delivery action text origin-aware javitasa.
5. Retry policy, confirm policy es delivery result shape parity biztositasa a ket origin kozt.
6. Relevans tesztek bovítese reviewer-reference + meta-parity coverage-re.

### Out of Scope

1. Uj actor runtime interface initiative vagy topology csere.
2. Uj durable ack protocol vagy tmux leváltása.
3. Transcript envelope schema vagy public CLI surface attervezese, ha ez nem kotelezo.
4. Meta-review gate teljes domain ujratervezese.
5. Barmely olyan valtoztatas, amely a normal reviewer handoff viselkedeset “opcionalisan atirja” parity bizonyitek nelkul.

### Safety Defaults

1. A reviewer -> implementer jelenlegi delivery viselkedes referencia-implementacio; ehhez kell a meta agat felhuzni, nem forditva.
2. Default policy: nincs public CLI contract valtozas, nincs envelope schema-bovites, nincs uj lifecycle allapot.
3. Ha az implementer-handoff origin metadataja eleg az action text helyesiteshez, ne vezessunk be uj protocol tipust.
4. A kozos helper csak az implementer-target delivery/retry/confirm logikat egyesitse; ne vigye at a meta ág egyeb special-case domain viselkedeseit a reviewer-ágra.
5. Ha a normal reviewer golden-path es `delivery_unconfirmed` regressziot mutat, a valtozas nem fogadhato el.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett contractok:
   - internal implementer handoff delivery helper contract,
   - implementer-target retry/confirm semantics,
   - implementer-target action text rendering contract,
   - reviewer-reference parity regression contract.

Rationale:
1. Ez a task alapertelmezetten belso bugfix scope.
2. A public protocol schema, envelope family es canonical actor CLI surface nem valtozik required-now modon.
3. Ha implementacio kozben megis elkerulhetetlennek latszik public event/payload contract modositas, azt kulon blockerscope-kent kell jelezni, es ezt a taskot nem szabad csendben contract-change taskka novelni.

### Terminology Lock

1. `implementer handoff delivery` = barmely persisted workflow-esemeny utani implementer-target tmux/pane delivery, amely a kovetkezo implementer kor elinditasat triggereli.
2. `reviewer reference path` = a normal reviewer -> implementer PASS handoff jelenlegi, mukodo delivery utvonala.
3. `meta auto-rework path` = a meta-review gate `auto_rework` route utan megvalosulo implementer-target delivery ut.
4. `origin` = a handoff domain-forrasa (`reviewer_pass`, `meta_review_auto_rework` vagy ezzel ekvivalens belso jeloles), nem a target-delivery primitive maga.
5. `shared helper` = egyetlen implementer-target delivery/retry/confirm primitive, amelyet tobb origin is hasznalhat.
6. `reviewer parity` = a reviewer reference path viselkedese implementacio utan byte-identical nem kotelezo, de behavior-levelben egyezzen a korabbi, elfogadott semantics-szal.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/pass/reviewerDelivery.ts` | reviewer implementer delivery wrapper | existing `executePassDelivery(...) -> Promise<{ result, retried }>` | internal reviewer delivery orchestration | A reviewer -> implementer reference path delivery/retry behaviora valtozatlan maradjon, de a target-delivery primitive mar a kozos helper legyen | P1 | required-now | reviewer regression tests |
| CS2 | `src/v11/application/pass/reviewerDeliveryHelpers.ts` | reviewer-only preparation helpers | existing helper surface | reviewer preparation layer | Reviewer-specifikus context refresh / brief / focus preparation maradhat, de az implementer-target delivery retry/confirm primitive ne itt legyen egyedi logikakent | P1 | required-now | helper extraction diff |
| CS3 | `src/v11/application/converged/convergedGateDelivery.ts` | meta gate delivery orchestration | existing `executeGateDelivery(...) -> Promise<ConvergedDeliveryResult>` | auto-rework delivery branch | Az `auto_rework` implementer-target branch ugyanazt a shared implementer delivery helper-t hasznalja, mint a reviewer reference path; route-specifikus retry special-case ne maradjon itt | P1 | required-now | meta parity tests |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateRecoveryAutoRework.ts` | auto-rework route persistence | existing `handleRecoveryAutoReworkRoute(...) -> Promise<MetaReviewGateResult>` | recovery route output boundary | A route tovabbra is persisted gate resultet adjon, de ne hordozzon sajat, kulon implementer-target delivery szemantikat; delivery oldalon a kozos helper legyen authoritative | P1 | required-now | route/delivery separation |
| CS5 | `src/core/runtime/tmuxDelivery.ts` | implementer-target action text rendering | existing `buildDeliveryMessage(...) -> string` | implementer `APPROVAL_DECISION` / origin-aware branch | Implementer felé meta origin eseten ne "Human requested rework" uzenet jelenjen meg csak az envelope tipusa miatt; a szoveg origin-aware legyen, reviewer-path regresszio nelkul | P1 | required-now | delivery text tests |
| CS6 | `tests/v11/application/pass/normalPassDeliveryExecution.test.ts` + `tests/core/agent/pass.test.ts` | reviewer reference characterization | existing test surfaces | reviewer regression coverage | A jelenlegi reviewer implementer handoff retry/confirm/result semantics karakterizalva es befagyasztva marad | P1 | required-now | automated tests |
| CS7 | `tests/v11/application/converged/convergedExecution.test.ts` + `tests/core/agent/converged.test.ts` | meta auto-rework parity coverage | existing meta convergence surfaces | meta handoff coverage | A meta auto-rework ugyanazt a target-delivery semantics-ot adja, mint a reviewer implementer handoff, origin-specifikus message kulonbseggel | P1 | required-now | automated tests |
| CS8 | `tests/core/runtime/tmuxDelivery.test.ts` | runtime delivery message assertions | existing tmux delivery tests | implementer-target text + confirm parity | A shared implementer handoff helper es az origin-aware message rendering explicit coverage-t kapjon | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Implementer-target delivery primitive | reviewer es meta ág kulon wrapper/path semantics | egyetlen kozos implementer-target delivery primitive | `bubbleId`, `bubbleConfig`, `sessionsPath`, `envelope`, `recipientRole=implementer` vagy ezzel ekvivalens target input | `initialDelayMs`, `deliveryAttempts`, origin metadata, message context | belso refactor only | P1 | required-now |
| Reviewer reference semantics | reviewer wrapperben lokalisan definialt retry policy | befagyasztott referencia semantics | current retry trigger semantics, current result shape | reviewer-only prep inputs | behavior-preserving | P1 | required-now |
| Meta auto-rework implementer delivery | converged gate special-case retry branch | reviewer-reference parity szerint mukodo shared helper usage | same delivery result shape as reviewer path | origin label / route metadata | behavior fix | P1 | required-now |
| Implementer action text | `APPROVAL_DECISION` tipus eseten ma human-biased wording is elofordul | origin-aware implementer action text | target role, decision kind, origin metadata | docs-only variant, worktree hint, evidence hint | behavior fix | P1 | required-now |
| Delivery result mapping | reviewer vs meta ágban reszben kulon orchestration | unified result contract | `delivered`, `retried` | `reason` | behavior parity | P1 | required-now |

Normative rules:

1. A kozos helper API-jat a reviewer reference path jelenlegi viselkedese korul kell kialakitani.
2. A meta auto-rework origin ugyanarra a helper input shape-re adapterezendo.
3. A helper nem valtoztathatja meg a persisted transcript envelope append sorrendjet required-now modon.
4. A helper nem tehet uj public protocol mezot kotelezove required-now modon.
5. Implementer-target retry policy origin-fuggetlen kell legyen, kiveve ha explicit reviewer characterization test bizonyitja, hogy a reviewer reference path mast csinal.
6. Az implementer action text forrasa nem lehet kizarolag az envelope tipusa; az origin metadata first-class input.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Internal delivery orchestration | helper extraction, wrapper unification, retry path consolidation | reviewer behavior silent megvaltoztatasa | reviewer parity first | P1 | required-now |
| Message rendering | origin-aware implementer wording javitas | envelope family public atnevezese csak wording miatt | metadata-driven rendering preferred | P1 | required-now |
| Meta route handling | route-delivery separation tisztazasa | meta domain behavior atcsusztatasa a reviewer wrapperbe | keep boundaries narrow | P1 | required-now |
| Test coverage | characterization + parity tests bovítese | laza, csak high-level smoke tesztekre szukites | parity evidence mandatory | P1 | required-now |

Constraints:

1. Ha a shared helper bevezetesehez reviewer-only prep (`refreshReviewerContext`, brief/focus load) is kell, az ne keruljon át az implementer-target common layerbe.
2. A kozos helper csak azt egyesitse, ami tenylegesen kozos: target pane delivery, retry, confirm, result mapping.
3. A meta-review gate route logicat nem szabad teljesen a PASS domainbe huzni.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| reviewer characterization test elter az extraction utan | reviewer regression tests | throw | stop; helper API or extraction incorrect | `IMPLEMENTER_HANDOFF_REVIEWER_REGRESSION` | error | P1 | required-now |
| meta auto-rework tovabbra is `delivery_unconfirmed` parity driftet mutat reviewerhez kepest | meta parity tests | result | fail task until explicit parity or explained divergence | `IMPLEMENTER_HANDOFF_META_PARITY_UNRESOLVED` | error | P1 | required-now |
| action text origin nelkul legacy human wordingre esik vissza | tmux delivery message rendering | fallback | render explicit meta-origin implementer wording | `IMPLEMENTER_HANDOFF_ORIGIN_TEXT_FALLBACK` | warn | P1 | required-now |
| shared helper bevezetese public protocol vagy CLI contract modositas nelkul nem oldhato meg | implementation discovery | result | stop and escalate separate contract-change taskra | `IMPLEMENTER_HANDOFF_CONTRACT_CHANGE_REQUIRED` | warn/error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | reviewer implementer handoff current behavior mint referencia | P1 | required-now |
| must-use | shared implementer-target delivery primitive | P1 | required-now |
| must-use | origin-aware implementer message rendering | P1 | required-now |
| must-not-use | meta auto-rework kulon retry/delivery semantics veglegesitett allapotkent | P1 | required-now |
| must-not-use | reviewer reference path behavior csendes atirasa parity proof nelkul | P1 | required-now |
| must-not-use | required-now public protocol schema modositas | P1 | required-now |
| must-not-use | topology/IPC initiative scope becsempeszese ebbe a bugfix taskba | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | reviewer reference delivery unchanged | current reviewer -> implementer PASS path | helper extraction + wrapper migration lefut | delivery result shape, retry trigger, retry parameters es target-delivery semantics valtozatlan | P1 | required-now | automated test |
| T2 | reviewer unconfirmed retry unchanged | reviewer implementer handoff elso delivery `delivery_unconfirmed` | flow fut | ugyanazzal a retry policyval ujraprobal, mint elotte | P1 | required-now | automated test |
| T3 | meta auto-rework uses shared helper | meta gate route `auto_rework` | convergence flow fut | implementer-target delivery a shared helperen keresztul megy, nem kulon special-case branchben | P1 | required-now | automated test |
| T4 | meta auto-rework retry parity | meta auto-rework elso delivery `delivery_unconfirmed` | flow fut | ugyanaz a retry semantics ervenyesul, mint reviewer implementer handoffnal | P1 | required-now | automated test |
| T5 | implementer meta-origin text is correct | meta-origin implementer-target delivery | message render fut | az action text nem allitja, hogy human kert reworkot; meta-origin explicit vagy semleges wording jelenik meg | P1 | required-now | automated test |
| T6 | reviewer text not regressed | reviewer-origin implementer-target delivery | message render fut | a reviewer implementer handoff wording tovabbra is megfelel a jelenlegi reviewer policynek | P1 | required-now | automated test |
| T7 | delivery result mapping parity | reviewer-origin es meta-origin implementer-target handoff ugyanazzal a low-level delivery kimenettel | result mapping fut | mindket ág azonos `delivered`/`reason`/`retried` semantics-ot ad | P1 | required-now | automated test |
| T8 | no required-now protocol contract change | implementation diff ellenorizve | code review fut | nincs uj kotelezo envelope field, nincs uj public CLI parameter, nincs lifecycle schema modositas | P1 | required-now | diff review |

## Acceptance Criteria

1. AC1: Reviewer -> implementer es meta-reviewer -> implementer handoff ugyanazt a kozos implementer delivery primitive-et hasznalja.
2. AC2: A reviewer reference behavior explicit regresszio nelkul megmarad.
3. AC3: A meta auto-rework delivery semantics reviewer parityre zarul.
4. AC4: Az implementer oldali meta-origin handoff message nem legacy human-rework wordinggel renderelodik.
5. AC5: A task required-now scope-jaban nincs public protocol vagy CLI contract change.

## L2 - Implementation Notes (Optional)

1. [required-now] A shared helper API-jat a reviewer reference pathbol kell kinyerni, nem nullarol ujratervezni.
2. [required-now] A meta ág adapter jellegu atalakitas legyen: a shared helper inputjara forditson, ne sajat retry politikat tartson meg.
3. [later-hardening] Ha kesobb explicit origin-aware handoff envelope family indokolt, azt kulon contract-change taskban kell kezelni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | explicit implementer handoff origin taxonomy | L2 | P2 | later-hardening | current metadata drift risk | kesobbi cleanup taskban normalize origin vocabulary |
| HB2 | shared helper tovabbi reviewer/human branchesre valo kiterjesztesenek felmerese | L2 | P3 | later-hardening | commonality follow-up | csak a Phase 1 stabilizalas utan ertekelendo |

## Review Control

1. A reviewer-ág a referencia; a meta-ágat kell ehhez igazítani.
2. Nem fogadhato el olyan implementacio, amely parity helyett “mindket ág most mar egyforman bizonytalan” allapotot hoz.
3. Nem fogadhato el olyan helper, amely reviewer-specific prep vagy meta domain special-case logikat vegyesen felhizlal a kozos retegre.
4. Nem fogadhato el required-now public contract change kulon blockerscope nelkul.
5. Nem fogadhato el olyan message-rendering fix, amely csak string patch, de a shared delivery driftet nem zarja le.

## Assumptions

1. A low-level tmux delivery reteg kozossege miatt a most latott drift fo oka a wrapper/orchestration aszimmetria.
2. A reviewer implementer handoff jelenlegi viselkedese eleg stabil ahhoz, hogy referencia-oracle-kent szolgaljon.
3. A meta auto-rework bugfix required-now scope-ban megoldhato belso helper- es wrapper-unificationnel public contract modositas nelkul.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a reviewer reference path explicit characterization testekkel be van fagyasztva;
2. a shared implementer handoff helper reviewer parityvel bevezethető;
3. a meta auto-rework ág ugyanarra a helperre adapterezhető public contract modositas nelkul;
4. a tmux delivery action text origin-aware javitasa metadata-alapon elvegezhető;
5. a valtozas szuk bugfix scope-ban marad, es nem nyit uj actor-runtime/topology initiative-t.
