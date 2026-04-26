---
artifact_type: plan
artifact_id: plan_review_policy_reviewer_blocking_threshold_shared_ui_v1
title: "Review Policy Reviewer Blocking Threshold + Shared UI Severity Plan"
status: draft
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
4. a reviewer post-gate routing ne fix `P0/P1` szabalyra, hanem az uj reviewer thresholdra epuljon,
5. az uj reviewer default tudatosan `P3` legyen, nem kompatibilitasi `P1`.

## Done Definition

1. A canonical `review_policy` persisted shape explicit ket thresholdot hordoz:
   - `reviewer_blocking_min_severity`
   - `meta_review_auto_rework_min_severity`
2. A create/parse/render/update/runtime-view/list/status/UI mutate surfaces ugyanazt a ketmezos policy contractot hasznaljak.
3. Az operatori UI update path egyetlen shared severity inputtal irja mindket persisted mezot ugyanarra az ertekre.
4. A reviewer post-gate decision path ugyanebbol a canonical policy-bol olvassa a blocking thresholdot; fix `P0/P1` literal policy nem marad reviewer routing authoritykent.
5. A spec-ek es a tesztmatrix explicit rogziti, hogy az uj reviewer default `P3`, es ez viselkedesvaltozas, nem accidental drift.

## Guiding Principles

1. Business invariant:
   a reviewer blocking threshold es a meta-review auto-rework threshold kulon canonical policy mezok, akkor is, ha az operatori UI alapertelmezetten ugyanazzal az ertekkel irja oket.
2. Control model:
   a persisted `bubble.toml` `review_policy` blokk a canonical source-of-truth; a UI shared severity control csak write-time convenience surface, nem harmadik authority.
3. Read-path rule:
   reviewer routing csak normalized review-policy helperen keresztul olvashat thresholdot; prompt/guidance szoveg, status projection vagy UI local state nem lehet canonical truth.
4. Forbidden fallback:
   fix `P0/P1` reviewer blocker szabaly, promptba egetett `P2/P3 advisory-only` matrix, vagy barmilyen summary-derived severity allitas nem maradhat canonical reviewer threshold authority.
5. Allowed resolution path:
   UI shared severity input -> mutation seam -> mindket persisted mezore ugyanaz az ertek -> normalized runtime view -> role-specifikus consume (reviewer vagy meta-review).
6. Missing-data rule:
   ha a reviewer threshold nincs persisteden jelen, a normalized review-policy default `P3`; nincs legacy `P1` fallback preserve kotelezettseg.
7. Sequencing note:
   producer-first bontas kell:
   - eloszor a persisted contract + mutation/read-model surface
   - utana a reviewer workflow consume alignment
   cleanup/recovery kulon fazist most nem igenyel; a remote UI mutation path az elso task resze.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/config/bubbleConfig.ts](/Users/felho/dev/pairflow/src/config/bubbleConfig.ts)
   - [src/types/bubble.ts](/Users/felho/dev/pairflow/src/types/bubble.ts)
   - [src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts)
   - [src/v11/domain/pass/reviewerDecision.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/reviewerDecision.ts)
   - [src/v11/shared/reviewer/reviewerCommandGateGuidance.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerCommandGateGuidance.ts)
2. Closed canonical elements that must stay explicit:
   - `review_policy.meta_review_auto_rework_min_severity` megmarad kulon persisted mezokent
   - `severity_gate_round` tovabbra is kulon round gate, nem severity replacement
   - reviewer post-gate clean path tovabbra is canonical convergence
3. Explicit reinterpretation in this plan:
   - a reviewer post-gate blocker authority mar nem fix `P0/P1`, hanem configurable threshold
4. Downstream task impact:
   - az elso task nem viheti at a reviewer consume logikat feluton
   - a masodik task nem nyithat ujra config/mutation/read-model foundation kerdeseket

## Current Codebase Check (2026-04-26)

1. A canonical `review_policy` current tree-ben csak egy severity mezot hordoz:
   `meta_review_auto_rework_min_severity`.
2. A UI mutate surface ugyanazt az egy mezot irja local + remote update seamen keresztul.
3. A reviewer post-gate decision ma fixen ugy kezeli a blocker fogalmat, hogy ha nincs blocker, akkor convergence kotelezo; ez nincs a policy mezore kotve.
4. A reviewer prompt/guidance tobb helyen szoveg szerint `P2/P3 advisory-only` logikat tanit.
5. Emiatt a jelenlegi blast radius ket valos consume familyre bomlik:
   - policy producer / mutation / read-model surfaces
   - reviewer workflow-orchestration consume surface

## Current Status

### Completed Work

1. A jelenlegi baseline feltarasa megtortent:
   - meta-review threshold kulon canonical contractkent mar letezik
   - reviewer threshold meg nincs explicit policy mezohoz kotve
2. Elvi dontes megszuletett:
   - reviewer mezonev: `reviewer_blocking_min_severity`
   - reviewer default: `P3`
   - UI single-control update: mindket persisted mezot ugyanarra az ertekre irja

### Open Work

1. A persisted review-policy shape ketszereplosse teve explicitte kell tenni a reviewer thresholdot.
2. A runtime/read-model/mutate surfaceset at kell vezetni az uj ketmezos policyre.
3. A reviewer post-gate routingot es guidance-ot at kell kotni az uj reviewer threshold authorityra.
4. A docs/test contractokat frissiteni kell a tudatos default-valtozas miatt.

### Deferred / Future Work

1. Kulon UI, amellyel a reviewer es a meta-review threshold kulon allithato, most nincs scope-ban.
2. Barmilyen tovabbi meta-review policy cleanup vagy rename lane kulon successor lehet.

## Open Task List

1. `review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1`
   - cel: uj reviewer policy mezo bevezetese, create/parse/render/update/runtime-view/list/status/UI mutate alignment
2. `review-policy-reviewer-blocking-threshold-reviewer-routing-phase2`
   - cel: reviewer post-gate routing, guidance, docs es teszt contract atkotese az uj reviewer thresholdra

## Coverage Map

| Plan Gap | Owned By | Notes |
|---|---|---|
| persisted config contract dual-threshold shape | Task 1 | producer closure |
| UI/shared mutate semantics | Task 1 | ugyanaz a shared severity irja mindket mezot |
| runtime view + read-model transparency | Task 1 | status/list/detail projections |
| reviewer threshold consume semantics | Task 2 | workflow/orchestration closure |
| reviewer prompt/guidance/doc parity | Task 2 | read-model/documentation alignment a reviewer lane-ben |

## Dependencies / Order

1. Task 1 -> Task 2 kotelezo.
2. Task 2 csak a merged dual-threshold policy surface-re epulhet; nem tarthat fent sajat interim reviewer threshold fallbackot.
3. Ha Task 1 a UI input namingot is csereli, Task 2 mar csak az uj mutate contractot hivatkozhatja.

## Risks / Assumptions

1. Szandekos viselkedesvaltozas:
   reviewer default `P3`, tehat post-gate korben mar a `P3` finding is blocking lehet.
2. Feltetelezes:
   nincs olyan kulso/public consumer, amelyhez kotelezo lenne a regi UI request mezot hosszu ideig kompatibilitasi alias formaban megtartani.
3. Kockazat:
   ha a runtime view csak az egyik mezot mutatja ki, az operatori debugging felig vak marad; ezert a read-model alignmentet nem szabad elhalasztani.

## Validation Strategy

1. Task 1 utan:
   - config parse/render tests
   - runtime view tests
   - UI router/update local+remote tests
   - list/status projection tests
2. Task 2 utan:
   - reviewer pass gating tests
   - reviewer guidance/prompt tests
   - docs/spec parity review
