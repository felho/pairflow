---
artifact_type: plan
artifact_id: plan_review_policy_reviewer_blocking_threshold_shared_ui_v1
title: "Review Policy Reviewer Blocking Threshold + Shared UI Severity Plan"
status: active
prd_ref: null
owners:
  - "felho"
---

# Plan: Review Policy Reviewer Blocking Threshold + Shared UI Severity

## Objective

Szetszalazni a review severity policy-t ugy, hogy:
1. a reviewer kulon persisted thresholdot kapjon `review_policy.reviewer_blocking_min_severity` neven,
2. a meta-review megtartsa a sajat `review_policy.meta_review_auto_rework_min_severity` mezot,
3. a UI/operator egyetlen shared severity kontrollal mindket mezot ugyanarra az ertekre tudja allitani,
4. a reviewer post-gate routing ne fix `P0/P1` routing-szabalyra, hanem az uj reviewer thresholdra epuljon ugy, hogy a severity ontology `P0/P1/P2/P3` jelentese es a document-scope qualifier normalizalas explicit maradjon,
5. az uj reviewer default tudatosan `P3` legyen, nem kompatibilitasi `P1`.

## Done Definition

1. A canonical `review_policy` persisted shape explicit ket thresholdot hordoz:
   - `reviewer_blocking_min_severity`
   - `meta_review_auto_rework_min_severity`
2. A create/parse/render/update/runtime-view/list/status/UI mutate surfaces ugyanazt a ketmezos policy contractot hasznaljak.
3. Az operatori UI update path egyetlen shared severity inputtal irja mindket persisted mezot ugyanarra az ertekre.
4. A reviewer post-gate decision path ugyanebbol a canonical policy-bol olvassa a routing thresholdot; fix `P0/P1` literal policy nem marad reviewer routing authoritykent, de a severity ontology closed jelentese nem lehet implicit collateral drift.
5. A spec-ek es a tesztmatrix explicit rogziti, hogy az uj reviewer default `P3`, es ez post-gate routing viselkedesvaltozas, nem accidental ontology-drift.

## Guiding Principles

1. Business invariant:
   a reviewer blocking threshold es a meta-review auto-rework threshold kulon canonical policy mezok, akkor is, ha az operatori UI alapertelmezetten ugyanazzal az ertekkel irja oket.
2. Control model:
   a persisted `bubble.toml` `review_policy` blokk a canonical source-of-truth; a UI shared severity control csak write-time convenience surface, nem harmadik authority.
3. Read-path rule:
   reviewer routing csak normalized review-policy helperen keresztul olvashat thresholdot; a threshold compare a structured findings aggregate mar fennallo scope-policy normalizalasa utan futhat; prompt/guidance szoveg, status projection vagy UI local state nem lehet canonical truth.
4. Forbidden fallback:
   fix `P0/P1` reviewer blocker szabaly, promptba egetett `P2/P3 advisory-only` matrix, embedded ontology reminderbol kozvetlenul visszafejtett routing truth, vagy barmilyen summary-derived severity allitas nem maradhat canonical reviewer threshold authority.
5. Allowed resolution path:
   UI shared severity input -> mutation seam -> mindket persisted mezore ugyanaz az ertek -> normalized runtime view -> reviewer oldalon normalized findings aggregate + threshold compare, meta-review oldalon role-specifikus consume.
6. Missing-data rule:
   ha a reviewer threshold nincs persisteden jelen, a normalized review-policy default `P3`; nincs legacy `P1` fallback preserve kotelezettseg.
7. Sequencing note:
   producer-first bontas kell:
   - eloszor a persisted contract + mutation/read-model surface
   - utana a reviewer workflow consume authority atkotese
   - es csak ezutan a reviewer-facing ontology/runtime-guidance/doc parity alignment
   cleanup/recovery kulon fazist most nem igenyel; a remote UI mutation path az elso task resze.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/config/bubbleConfig.ts](/Users/felho/dev/pairflow/src/config/bubbleConfig.ts)
   - [src/types/bubble.ts](/Users/felho/dev/pairflow/src/types/bubble.ts)
   - [src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts)
   - [src/v11/domain/pass/reviewerDecision.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/reviewerDecision.ts)
   - [src/v11/domain/convergence/policyReviewerAggregate.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyReviewerAggregate.ts)
   - [src/v11/shared/reviewer/reviewerCommandGateGuidance.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerCommandGateGuidance.ts)
   - [src/v11/shared/reviewer/reviewerSeverityOntology.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerSeverityOntology.ts)
   - [docs/reviewer-severity-ontology.md](/Users/felho/dev/pairflow/docs/reviewer-severity-ontology.md)
2. Closed canonical elements that must stay explicit:
   - `review_policy.meta_review_auto_rework_min_severity` megmarad kulon persisted mezokent
   - `severity_gate_round` tovabbra is kulon round gate, nem severity replacement
   - reviewer post-gate clean path tovabbra is canonical convergence
   - a reviewer severity ontologyban `P3` tovabbra is severity-szintu non-blocking improvement kategoria, hacsak ez a lane explicit at nem irja
   - document scope blocker qualifier tovabbra is explicit scope-policy normalizalas (`timing=required-now` + `layer=L1`)
3. Explicit reinterpretation in this plan:
   - a reviewer post-gate implementer-fele routing authority mar nem fix `P0/P1`, hanem configurable threshold
   - ez a reinterpretation alaphelyzetben a routing gate-re vonatkozik, nem az ontology severity definiciok hallgatolagos atirasara
4. Downstream task impact:
   - az elso task nem viheti at a reviewer consume logikat feluton
   - a masodik task nem nyithat ujra config/mutation/read-model foundation kerdeseket; csak a canonical reviewer threshold consume authorityt es a routing seam-eket zarhatja le
   - a harmadik task nem irhat ujra routing truth-ot; csak a mar atkotott reviewer authority reviewer-facing projection/parity feluleteit zarhatja le

## Current Codebase Check (2026-04-26)

1. A canonical `review_policy` current tree-ben mar explicit ket severity mezot hordoz:
   - `reviewer_blocking_min_severity`
   - `meta_review_auto_rework_min_severity`
2. A UI mutate surface mar a shared severity inputon keresztul mindket persisted mezot irja local + remote update seamen.
3. A reviewer post-gate decision mar a canonical `review_policy.reviewer_blocking_min_severity` thresholdra van kotve, explicit threshold-threadinggel a routing inputtol a reviewer validacioig.
4. A document-scope qualifier-normalized aggregate marad a threshold compare canonical inputja; a strict qualifier nelkuli `P0/P1` document finding tovabbra is non-blocking effective severityre downgrade-olodik.
5. A meg nyitott blast radius mar a reviewer-facing projection familyre szukult:
   - reviewer guidance / prompt / delivery surfaces
   - canonical reviewer ontology + generated runtime reminder + docs parity

## Current Status

### Completed Work

1. A jelenlegi baseline feltarasa megtortent:
   - meta-review threshold kulon canonical contractkent mar letezik
   - reviewer threshold meg nincs explicit policy mezohoz kotve
2. Elvi dontes megszuletett:
   - reviewer mezonev: `reviewer_blocking_min_severity`
   - reviewer default: `P3`
   - UI single-control update: mindket persisted mezot ugyanarra az ertekre irja
3. A `review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1` slice merged es archivalt:
   - a persisted `review_policy` shape mar explicit dual-threshold contract
   - a create/parse/render/update/runtime-view/list/status/UI mutate surfaces mar ugyanazt a ketmezos authorityt hasznaljak
   - a shared UI write path a canonical `reviewBlockingMinSeverity` mezon keresztul mindket persisted thresholdot ugyanarra az ertekre irja
   - a Phase 1 task archivalva lett:
     `plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md`
4. A `review-policy-reviewer-blocking-threshold-routing-consume-phase2a` slice implementalva, validalva es archivalva lett:
   - a reviewer post-gate routing authority mar a canonical `review_policy.reviewer_blocking_min_severity` thresholdot fogyasztja
   - a threshold explicit routing inputkent threadelodik a normalized review-policy helperbol a reviewer validacioig
   - a document-scope qualifier-normalized aggregate marad a threshold compare canonical inputja
   - a Phase 2A task archivalva lett:
     `plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md`

### Open Work

1. A reviewer-facing prompt/delivery/docs feluleteket kulon parity lane-ben at kell vezetni az uj threshold authorityra, beleertve a canonical reviewer severity ontologyt es az embedded runtime reminder parityjat.

### Deferred / Future Work

1. Kulon UI, amellyel a reviewer es a meta-review threshold kulon allithato, most nincs scope-ban.
2. Barmilyen tovabbi meta-review policy cleanup vagy rename lane kulon successor lehet.

## Open Task List

1. `review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1`
   - status: completed and archived
   - cel: uj reviewer policy mezo bevezetese, create/parse/render/update/runtime-view/list/status/UI mutate alignment
2. `review-policy-reviewer-blocking-threshold-routing-consume-phase2a`
   - status: completed and archived
   - cel: reviewer post-gate routing authority, threshold threading seam-ek es scope-policy aggregate consume atkotese az uj reviewer thresholdra
3. `review-policy-reviewer-blocking-threshold-reviewer-facing-parity-phase2b`
   - status: next
   - cel: reviewer-facing guidance/prompt/delivery, canonical reviewer ontology/runtime reminder, docs es parity-tesztek atkotese a mar lezart Phase 2A authorityra

## Coverage Map

| Plan Gap | Owned By | Notes |
|---|---|---|
| persisted config contract dual-threshold shape | Task 1 | producer closure |
| UI/shared mutate semantics | Task 1 | ugyanaz a shared severity irja mindket mezot |
| runtime view + read-model transparency | Task 1 | status/list/detail projections |
| reviewer threshold consume semantics | Task 2A | workflow/orchestration + internal execution consume closure |
| routing input/threading seam completeness | Task 2A | explicit threshold-atadas, side-channel nelkul |
| reviewer prompt/guidance/doc parity | Task 2B | reviewer-facing projection alignment a mar lezart authorityhoz |
| reviewer severity ontology + embedded runtime reminder parity | Task 2B | canonical docs/codegen/runtime prompt alignment |

## Dependencies / Order

1. Task 1 -> Task 2A -> Task 2B kotelezo.
2. Task 2A csak a merged dual-threshold policy surface-re epulhet; nem tarthat fent sajat interim reviewer threshold fallbackot.
3. Ha Task 1 a UI input namingot is csereli, Task 2A es Task 2B mar csak az uj mutate/runtime contractot hivatkozhatjak.
4. Task 2A zarja le a canonical reviewer threshold consume authorityt; Task 2B ezt mar nem irhatja felul, csak reviewer-facing projection/parity feluleteken viheti at.
5. Task 2B csak akkor tekintheto lezartnak, ha a routing semantics es a reviewer severity ontology/runtime reminder feluletek ugyanazt a closed jelentest hordozzak, vagy az explicit uj jelentest ugyanazzal a source-anchor authorizacioval vezetik at.
6. A reviewer-facing parity lane nem kezdodhet el addig, amig a routing consume authority es a threshold-threading seam-ek Phase 2A-ban le nem zartak.

## Risks / Assumptions

1. Szandekos viselkedesvaltozas:
   reviewer default `P3`, tehat post-gate routing szinten barmely nyitott finding implementer-fele fix-requestet tarthat fenn; ezt nem szabad hallgatolagos severity-ontology atiraskent dokumentalni.
2. Feltetelezes:
   nincs olyan kulso/public consumer, amelyhez kotelezo lenne a regi UI request mezot hosszu ideig kompatibilitasi alias formaban megtartani.
3. Kockazat:
   ha a runtime view csak az egyik mezot mutatja ki, az operatori debugging felig vak marad; ezert a read-model alignmentet nem szabad elhalasztani.
4. Kockazat:
   ha a reviewer routing atall, de a canonical ontology / embedded reminder `P2/P3 advisory-only` nyelven marad, a reviewer lane mixed-truth allapotba kerul.
5. Kockazat:
   ha a routing consume authority es a reviewer-facing parity ugyanabba a bounded taskba marad osszehuzva, konnyen kiesik egy threshold-threading seam vagy egy reviewer-facing projection surface a deklaralt ownershipbol.

## Validation Strategy

1. Task 1 utan:
   - config parse/render tests
   - runtime view tests
   - UI router/update local+remote tests
   - list/status projection tests
2. Task 2A utan:
   - reviewer pass gating tests
   - scope-policy aggregate + threshold threading tests
   - routing seam completeness review
3. Task 2B utan:
   - reviewer guidance/prompt tests
   - reviewer severity ontology + embedded runtime reminder parity tests / codegen refresh
   - docs/spec parity review
