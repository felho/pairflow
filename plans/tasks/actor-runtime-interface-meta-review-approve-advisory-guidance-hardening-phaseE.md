---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_approve_advisory_guidance_hardening_phaseE_v1
title: "Actor Runtime Interface Meta-Review Approve Advisory Guidance Hardening (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/core/runtime/metaReviewSubmitGuidance.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/metaReviewGate/metaReviewGateNotify.ts
  - src/core/bubble/metaReview.ts
  - src/core/bubble/approvalRequestEnvelope.ts
  - docs/meta-review-gate-rollout-runbook.md
  - tests/core/runtime/metaReviewSubmitGuidance.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/approvalRequestEnvelope.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Approve Advisory Guidance Hardening (Phase E)

## Current Codebase Check (2026-04-10)

1. A mai canonical file-ok itt elnek: `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts`, `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`, `src/v11/application/start/startCommandPrompts.ts`, `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`.
2. A task `target_files` listajanak `src/core/**` resze es egyes korabbi `shared` pathjai mar stale-ek.
3. A task jelenleg nem implementalhato valtoztatas nelkul; elobb a target file listat kell a mai ownersegekhez igazitani.

## Executive Summary

1. Ez a task nem approve-policy atiras, hanem bounded guidance/diagnostics hardening arra a visszatero hibara, amikor a meta-reviewer egy elutasitott `clean approve` utan hibas masodik lepeskent `inconclusive`-ra valt.
2. A canonical desired shape valtozatlan: advisory-only open findings mellett a helyes corrective action a `recommendation=approve` megtartasa es az advisory-only approve split alak explicit kuldese.
3. A task csak akkor tekintheto lezartnak, ha ugyanaz a corrective decision tree megjelenik a runtime guidance-ben, a fail-closed error surface-ben es a rollout runbook operator wordingjaban is.
4. Phase E pozicionalas: ez a retained actor-runtime guidance/diagnostics cleanup egyik bounded szelete, ahol az alap approve split policy mar letezik, es csak a surface-ek kozos pontositasat kell lezárni.

## L0 - Policy

### Goal

Tegye explicitte a meta-reviewer guidance-ben es a fail-closed error surface-ben a kulonbseget a ket approve alak kozott:
1. `clean approve`
2. `advisory-only approve`

Az elvart eredmeny:
1. ha a latest same-round reviewer snapshot advisory-only open findingsot claimel, a meta-reviewer ne valtson reflexbol `inconclusive`-ra,
2. hanem tartsa meg a `recommendation=approve` decisiont,
3. es advisory-only approve split claimet kuldjon (`open_findings`, `blocking=0`, `advisory>0`).

Ez a task nem semantic policy-change, hanem runtime guidance + corrective diagnostics hardening arra a visszatero helyzetre, amikor az agent eloszor `clean approve`-ot probal, azt fail-closed guard elutasitja, majd rossz masodik lepeskent `inconclusive`-ra valt.

### Context

1. A rollout runbook mar explicit split-aware approve semanticsot rogzit: `recommendation=approve` mellett advisory-only open findings megengedett, ha `findings_blocking_open_total=0`.
2. A visszatero hiba nem a validator policy hianya, hanem a prompt/error wording hianyossaga: a fail-closed konfliktus utan a kovetkezo helyes lepest ma nem mondja ki eleg direkt modon a rendszer.
3. A same-round reviewer snapshot marad a canonical konfliktusforras; a corrective textnek ehhez kell igazodnia, nem az agent elozo, elutasitott clean-claim kiserletehez.
4. Ezert a task celja a prompt, diagnostics es runbook surfaces kozos szokincsenek es dontesi fajanak osszezarasa policy-delta nelkul.
5. A task helye a Phase E tervben: retained meta-review guidance/diagnostics hardening a mar letezo validator-policy korul, nem uj lane, nem route-semantics change, es nem recovery redesign.

### Terminology Lock

1. `clean approve` = `recommendation=approve` olyan summary/claim alakkal, amely 0 open findingsot allit.
2. `advisory-only approve` = `recommendation=approve` + `findings_claim_state=open_findings` + `findings_blocking_open_total=0` + pozitiv advisory open total.
3. `corrective hint` = rovid operativ szoveg, amely kimondja, hogy approve parity conflict utan a helyes kovetkezo lepés az advisory-only approve shape megtartott `recommendation=approve` mellett, nem az `inconclusive`-ra valtas.
4. `canonical guidance surfaces` = `metaReviewSubmitGuidance`, tmux delivery prompt, start/meta-review notify prompt, valamint a rollout runbook operator wording.

### In Scope

1. A meta-review runtime submit guidance pontositasaba beirni a `clean approve` vs `advisory-only approve` kulonbseget.
2. A tmux/start/meta-review notify promptokban explicit corrective operator szoveg adasa arra az esetre, amikor approve mellett advisory split kell.
3. A reviewer same-round snapshot parity conflict es clean-approve conflict hiba-uzeneteinek javito jellegu pontositasa.
4. A rollout runbook frissitese operativ nyelven, hogy az agent es az operator ugyanazt a dontesi fát lassa.
5. Regresszios tesztek a guidance stringekre es a kulcs fail-closed error message-ekre.

### Out of Scope

1. Az approve/inconclusive/rework route policy szemantikai atirasa.
2. A korabbi `inconclusive` submit bug javitasa.
3. Uj recommendation tipus vagy uj gate route bevezetese.
4. Altalanos watchdog vagy recovery redesign.
5. Uj structured report mezok bevezetese.

### Safety Defaults

1. A guidance nem irhatja felul a fail-closed parity guardokat; csak segitse az agentet a helyes kovetkeztetesben.
2. A rendszer tovabbra is utasitsa el a valodi `clean approve` claimet, ha a same-round reviewer snapshot nyitott advisory findingokat reportol.
3. A corrective error surface ne sugallja, hogy advisory-only approve minden open-findings helyzetben megengedett; csak akkor, ha `blocking_open_total=0`.
4. A guidance ne terelje az agentet watchdogra vagy recoveryre olyan helyzetben, ahol az approve advisory-only alak elegendo.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - meta-reviewer runtime prompt/guidance contract,
   - operator-visible fail-closed diagnostics contract,
   - docs/runbook operational guidance contract.

### Normative Reference Policy

1. Canonical plan:
   - `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
2. Canonical operational semantics:
   - `docs/meta-review-gate-rollout-runbook.md`
   - Kotelezo grounding kulonosen a `Structured Findings-Claim Gate Baseline` es az advisory-only approve diagnostic terminology.
3. System context:
   - `docs/pairflow-initial-design.md`
4. Runtime source-of-truth seams:
   - `metaReviewGateApproveClaimValidation`
   - same-round reviewer snapshot consistency checks `src/core/bubble/metaReview.ts` es `src/core/bubble/approvalRequestEnvelope.ts` alatt
5. Precedence rule:
   - validator semantics es existing reason codes authoritativebbek, mint barmely prompt/runbook wording; a wording csak pontosithat, nem terjesztheti ki az ervenyes approve alakokat.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Split note:
   - a scope bounded guidance/diagnostics hardening; nem mozgat authority boundaryt es nem vezet be uj runtime behavior policyt.
9. Authority/source-of-truth note:
   - canonical source: a mar letezo approve parity policy es same-round reviewer snapshot consistency guard
   - forbidden secondary sources: agent sajat summary-heuristikaja, implicit “approve failed therefore inconclusive” kovetkeztetes, operatori folklore

### Review-Stability Gates

1. Review fail, ha barmely diff route-policy vagy validator-semantics valtozast csempesz be guidance-hardening cim alatt.
2. Review fail, ha barmely prompt surface azt sugallja, hogy approve parity conflict utan a default kovetkezo lepes az `inconclusive`.
3. Review fail, ha blocking findings eseten a corrective text advisory-only approve-ot ajanl.
4. Review fail, ha a runtime wording es a runbook wording ugyanarra a helyzetre eltero corrective vocabularyt hasznal.
5. Review fail, ha a diff uj reason code-ot vagy uj recommendation/gate route tipust kovetel a jelenlegi hibaosztaly kezelesere.

## L1 - Change Contract

### Timing Vocabulary

1. `required-now` = ebben a taskban kotelezo leszallitando.
2. `conditional-now` = csak bizonyitott user-visible semantics delta eseten kotelezo.
3. `later-hardening` = kulon follow-up; ebben a taskban nem nyithato ujra.

### Target File Alignment

1. Required-now implementation surface:
   - `src/core/runtime/metaReviewSubmitGuidance.ts`
   - `src/core/runtime/tmuxDelivery.ts`
   - `src/v11/shared/start/startCommandPrompts.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts`
   - `src/core/bubble/metaReview.ts`
   - `src/core/bubble/approvalRequestEnvelope.ts`
2. Required-now docs surface:
   - `docs/meta-review-gate-rollout-runbook.md`
3. Required-now regression surface:
   - `tests/core/runtime/metaReviewSubmitGuidance.test.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/bubble/metaReview.test.ts`
   - `tests/core/bubble/approvalRequestEnvelope.test.ts`
   - `tests/core/bubble/metaReviewGate.test.ts`
4. A `target_files` implementation-budget lista; nem kotelezo minden filet touched-olni, de minden acceptance criterionnak vissza kell kothetoen fedettnek maradnia call-site vagy test szinten.

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/metaReviewSubmitGuidance.ts` | `buildMetaReviewSubmitApproveParityNote` | `() -> string` | approve parity note | a guidance mondja ki, hogy advisory-only open findings mellett `recommendation=approve` maradhat, de nem szabad clean claimet kuldeni; ilyenkor split-consistent `open_findings` claim kell | P1 | required-now | jelenlegi note csak a split mezoket mondja ki, a corrective decisiont nem |
| CS2 | `src/core/runtime/tmuxDelivery.ts` | meta-review task prompt assembly | existing string path | meta-reviewer pane task receive message | a pane prompt tartalmazzon explicit “if same-round reviewer snapshot has advisory-only findings, do not switch to inconclusive; send advisory-only approve shape” utmutatast | P1 | required-now | visszatero agent tevedes |
| CS3 | `src/v11/shared/start/startCommandPrompts.ts` + `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts` | startup / notify prompt helpers | existing | meta-review handoff guidance | ugyanaz a corrective instruction szerepeljen minden canonical meta-review submit guidance feluleten | P1 | required-now | prompt-surface consistency |
| CS4 | `src/core/bubble/metaReview.ts` | approve submit same-round reviewer conflict errors | existing validation/error throw sites | `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT` uzenetek | a hiba ne csak contradictiont mondjon, hanem javito iranyt is: “use advisory-only approve shape” amikor a conflict tipusa ez | P1 | required-now | jelenlegi hiba alapjan az agentnek maganak kell kitalalnia a helyes masodik lepest |
| CS5 | `src/core/bubble/approvalRequestEnvelope.ts` | approval parity conflict diagnostics | existing validation/error throw sites | approval request consistency failures | a human-gate/approval oldali parity conflict uzenetek is ugyanazt a corrective vocabularyt hasznaljak | P2 | required-now | operator+agent consistency |
| CS6 | `docs/meta-review-gate-rollout-runbook.md` | rollout guidance | markdown | approve split-aware semantics section | a runbook operational phrasingben kulonitse el a `clean approve` es `advisory-only approve` esetet, es irja le a helyes corrective actiont | P2 | required-now | docs parity |
| CS7 | tests | runtime guidance + conflict message tests | vitest | guidance/error regressziók | biztositsa, hogy a corrected language megmarad | P1 | required-now | regression guard |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Runtime submit guidance | split mezok kotelezoseget mondja ki | explicit corrective decision tree-t ad: `clean approve` csak 0 open findings mellett; advisory-only open findings mellett `approve` marad, de `open_findings` split kell | `findings_claimed_open_total`, `findings_blocking_open_total`, `findings_advisory_open_total` | example phrasing | non-breaking guidance tightening | P1 | required-now |
| Meta-review prompt contract | parity fields required | parity fields + same-round reviewer snapshot reconciliation explicit kovetelmeny | recommendation, split triplet, summary consistency | suggested wording | non-breaking | P1 | required-now |
| Conflict error messages | contradiction/error only | contradiction + corrective route hint when advisory-only approve remains valid | reason code, snapshot mismatch details | recommended corrective action | additive | P1 | required-now |
| Runbook operator guidance | semantic rule leirva, corrective workflow implicit | semantic rule + corrective workflow explicit | clean vs advisory-only distinction | examples | additive | P2 | required-now |

Normative rules:
1. `recommendation=approve` nem egyenlo a `findings_claim_state=clean` allitassal.
2. Advisory-only open findings mellett a helyes alak: `recommendation=approve` + `findings_claim_state=open_findings` + `findings_blocking_open_total=0`.
3. Ha a same-round reviewer snapshot advisory-only open findingsot reportol, akkor a corrective guidance ne `inconclusive`-ra tereljen, hanem advisory-only approve-ra.
4. A corrective uzenet csak akkor ajanlhat advisory-only approve-ot, ha a konfliktus tipusabol ez tenylegesen kovetkezik.
5. A corrective wording minimum-tartalma minden canonical prompt surface-en: `keep recommendation=approve`, `do not switch to inconclusive`, `use advisory-only approve shape` vagy ezekkel egyenerteku rovid operativ szoveg.
6. A guidance/error hardening nem igenyelhet uj reason code-ot; az existing reason-code taxonomy marad az authority-stable keret.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Prompt text | explicit decision-tree guidance, short example wording | policy-ellentmondo vagy tul tág guidance | maradjon tomor, de operativ | P1 | required-now |
| Error text | corrective hint advisory-only approve-ra | altalanos “use inconclusive” vagy homalyos “try again” uzenet | hiba-uzenet maradjon fail-closed, de javito jellegu | P1 | required-now |
| Docs | runbook pontositasa | policy drift a runtime guidance-hoz kepest | docs/runtime wording legyen osszhangban | P2 | required-now |

Constraint: a guidance hardening nem valtoztathatja meg a tenyleges validator policyt; csak explicitebb kovetkeztetesi tamaszt adhat.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|validation_diagnostic|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| agent clean approve-ot probal advisory-only reviewer snapshot mellett | same-round reviewer snapshot parity | throw | fail-closed marad, de a message mondja ki, hogy advisory-only approve shape kell | `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT` | warn/error | P1 | required-now |
| approve split fields hianyoznak vagy hibasak | approve parity validation | throw vagy validation_diagnostic a helper seamnel; a kulso boundary fail-closed reject | guidance/reference mutassa, milyen split mezok kellenek | existing approve split reason codes | warn/error | P1 | required-now |
| blocking findings jelen vannak approve mellett | approve parity validation | throw vagy validation_diagnostic a helper seamnel; a kulso boundary fail-closed reject | corrective action ne ajanljon advisory-only approve-ot, mert itt tenylegesen nem valid | `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT` | warn/error | P1 | required-now |
| docs/runtime wording drift | N/A | fallback | docs update or explicit omission decision | N/A | info | P2 | required-now |

Observable-semantics note:
1. A tasknak a kulso, megfigyelheto fail-closed viselkedest kell rogzitenie.
2. Helper-szinten megengedett, hogy a validation elobb mismatch stringet vagy mas diagnostics erteket adjon vissza, ha a owning caller boundary vegul ugyanazt a fail-closed reason-code surface-t ervenyesiti.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing approve split semantics from `metaReviewGateApproveClaimValidation` | P1 | required-now |
| must-use | existing same-round reviewer snapshot conflict logic in `metaReview.ts` and `approvalRequestEnvelope.ts` | P1 | required-now |
| must-use | existing runtime guidance/test seams (`metaReviewSubmitGuidance`, `tmuxDelivery`, start/meta-review notify`) | P1 | required-now |
| must-not-use | uj policy shortcut, ami advisory-only approve-ot enged ott is, ahol blocking findings vannak | P1 | required-now |
| must-not-use | olyan wording, ami azt sugallja, hogy approve hiba utan defaultan `inconclusive` a kovetkezo lepés | P1 | required-now |
| must-not-use | hosszu, narrativ promptszoveg; a guidance maradjon operator-szintu, konkret | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Approve guidance mentions advisory-only path | runtime guidance helper | note/render build fut | szoveg explicit kimondja, hogy advisory-only open findings mellett `approve` marad, de clean claim nem mehet | P1 | required-now | automated test |
| T2 | Tmux meta-review task prompt includes corrective instruction | meta-review pane task delivery | prompt build fut | prompt tartalmazza a “do not switch to inconclusive; use advisory-only approve shape” jellegu utasitast | P1 | required-now | automated test |
| T3 | Start/meta-review notify prompt parity | startup/notify guidance helper | prompt build fut | ugyanaz a corrective instruction jelenik meg minden canonical meta-review guidance feluleten | P1 | required-now | automated test |
| T4 | Same-round conflict error hints advisory-only approve | reviewer snapshot advisory-only open findingsot reportol, submit clean approve-ot probal | validation fut | hiba reason code valtozatlan, de a message corrective hintet ad advisory-only approve alakra | P1 | required-now | automated test |
| T5 | Blocking-findings error does not mislead | reviewer snapshot blocking findingsot reportol approve mellett | validation fut | hiba nem ajanl advisory-only approve-ot ott, ahol az invalid | P1 | required-now | automated test |
| T6 | Runbook wording explicit | docs review | docs diff kesz | `clean approve` vs `advisory-only approve` kulon szakaszkent vagy egyertelmu bulletkent szerepel | P2 | required-now | doc review |
| T7 | Existing advisory-only approve acceptance stays unchanged | valid advisory-only approve fixture | submit/recovery tests futnak | nincs policy regresszio, csak guidance/error wording hardening | P1 | required-now | automated test |

## Acceptance Criteria

1. AC1: A meta-reviewer runtime guidance explicitten leirja, hogy advisory-only open findings mellett a helyes corrective action az advisory-only approve, nem az `inconclusive`.
2. AC2: A fail-closed conflict uzenetek ebben a helyzetben javito jelleggel utalnak a helyes claim alakura.
3. AC3: A blocking-findings esetek tovabbra sem kapnak felrevezeto advisory-only approve hintet.
4. AC4: A docs/runbook es a runtime prompt wording ugyanazt a dontesi fat kozvetiti.
5. AC5: A guidance hardening nem valtoztatja meg a tenyleges approve/recovery validator szemantikajat.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3 | T1, T2, T3 |
| AC2 | CS4, CS5 | T4 |
| AC3 | CS4, CS5 | T5 |
| AC4 | CS1, CS2, CS3, CS6 | T1, T2, T3, T6 |
| AC5 | CS4, CS5 | T7 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Hosszabb tavon erdemes lehet a conflict diagnosticsba strukturalt “corrective_action” metadata mezot is adni, hogy ne csak a szovegben legyen benne a hint.
2. [later-hardening] Ha tobbszor visszater ez a hibaosztaly, erdemes kulon metrics-szamlalot vezetni a “clean approve contradicted by advisory-only snapshot” esetekre.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Structured corrective-action diagnostics | L2 | P2 | later-hardening | current analysis | vezessen be machine-readable corrective hintet a parity conflict hibakhoz |
| H2 | Metrics on approve-shape correction failures | L2 | P2 | later-hardening | operational follow-up | gyujtse kulon azokat az eseteket, amikor az agent clean approve-rol kellett advisory-only approve-ra terelni |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha a runtime guidance tovabbra sem mondja ki explicitten a `clean approve` vs `advisory-only approve` kulonbseget.
3. P1 regresszio, ha a corrective hint blocking-findings esetre is advisory-only approve-ot sugall.
4. P1 regresszio, ha a docs/runtime wording driftbe kerul ugyanarra a dontesi helyzetre.
5. `contract_boundary_override=yes`, ezert a `plan_ref` kotelezo es a runtime guidance sorokkal osszhangban kell maradjon.

## Assumptions

1. A jelenlegi approve parity policy helyes; a problema elsodlegesen guidance-es diagnostics clarity.
2. A meta-reviewer agent a fail-closed hiba utan gyakran a promptban es error textben szereplo kovetkezo lepest koveti, ezert a wording valodi runtime hatasu.

## Open Questions (Non-Blocking)

1. A corrective hintet eleg a hiba-uzenetben tartani, vagy erdemes a reason code melle kulon structured diagnostics fieldet is adni kesobbi follow-upban?

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a runtime guidance explicit advisory-only approve corrective utmutatast ad,
2. a conflict error surface ezt kovetkezetesen visszhangozza,
3. a blocking vs advisory-only kulonbseg nem mosodik ossze,
4. es a validator policy valtozatlan marad.
