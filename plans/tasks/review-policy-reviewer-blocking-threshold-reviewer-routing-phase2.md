---
artifact_type: task
artifact_id: task_review_policy_reviewer_blocking_threshold_reviewer_routing_phase2_v1
title: "Review Policy Reviewer Blocking Threshold Reviewer Routing + Guidance (Phase 2)"
status: draft
phase: phase2
target_files:
  - src/v11/domain/pass/reviewerDecision.ts
  - src/v11/application/pass/reviewerPassPreparation.ts
  - src/v11/application/pass/passRoutingPreparation.ts
  - src/v11/application/pass/passRoutingPreparationTypes.ts
  - src/v11/shared/reviewer/reviewerCommandGateGuidance.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - docs/pairflow-initial-design.md
  - README.md
  - tests/core/agent/pass.test.ts
  - tests/core/runtime/reviewerCommandGateGuidance.test.ts
  - tests/v11/application/pass/emitPassContextBuilder.test.ts
  - tests/v11/application/pass/passWorkspaceContextPreparation.test.ts
prd_ref: null
plan_ref: plans/review-policy-reviewer-blocking-threshold-and-shared-ui-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Review Policy Reviewer Blocking Threshold Reviewer Routing + Guidance (Phase 2)

## Current Codebase Check (2026-04-26)

1. A reviewer post-gate decision ma fix matrixbol dolgozik:
   - blocker marad -> `pass`
   - non-blocking-only -> `convergence`
2. A blocker fogalom reviewer oldalon ma nem configurable thresholdbol jon, hanem hard-coded aggregate logicabol.
3. A reviewer guidance/prompt tobb helyen explicit `P2/P3 advisory-only` szabalyokat tanit.
4. A `severity_gate_round` gate megkulonbozteti a pre-gate es post-gate koroket; ezt a task nem torolheti el.

## L0 - Policy

### Goal

Kossuk at a reviewer post-gate blocking dontest az uj canonical reviewer thresholdra ugy, hogy:
1. pre-gate korokben a reviewer findings pass/fix-request baseline valtozatlan maradjon,
2. post-gate korokben a `reviewer_blocking_min_severity` dontse el, hogy egy finding set meg mindig implementer-fele blocking-e,
3. clean post-gate path tovabbra is canonical convergence maradjon,
4. a reviewer guidance/prompt/docs ugyanazt a threshold-driven szemantikat tanitsak,
5. a default reviewer threshold `P3` tudatos viselkedesvaltozaskent legyen dokumentalva.

### Domain / Control Model Summary

1. Business invariant:
   reviewer oldalon post-gate blocking authority nem fix severity lista, hanem a canonical `review_policy.reviewer_blocking_min_severity`.
2. Control model:
   a reviewer decision a normalized review-policy-bol es a structured findings aggregate-bol egyutt jon; prompt csak ennek leirasat tukrozi.
3. Read-path rule:
   reviewer gating thresholdot csak normalized review-policy helper vagy explicit atadott normalized field szolgaltathat.
4. Forbidden fallback:
   hard-coded `P0/P1` reviewer blocker rule, `P2/P3 advisory-only` prompt matrix, vagy summary-only severity kovetkeztetes nem maradhat canonical decision source.
5. Allowed resolution path:
   round >= `severity_gate_round` -> structured findings aggregate -> highest open severity -> compare with normalized `reviewer_blocking_min_severity`.
6. Missing-data rule:
   reviewer threshold hianya a normalized producer miatt `P3`-ra oldodik.
7. Phase boundary:
   - contract closure: inherited from phase1
   - producer closure: predecessor-owned
   - internal execution closure: owned here
   - workflow/orchestration closure: owned here
   - read-model closure: owned here, de csak reviewer guidance/docs szintjen
   - activation closure: none
   - cleanup/recovery closure: none

### Plan Linkage

1. Parent plan gap closed:
   reviewer workflow consume alignment az explicit dual-threshold policyre.
2. Depends on:
   [review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md](/Users/felho/dev/pairflow/plans/tasks/review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md)
3. Unlocks / impacts successors:
   kulon successor nem kotelezo; ez a reviewer lane closure.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [src/v11/domain/pass/reviewerDecision.ts](/Users/felho/dev/pairflow/src/v11/domain/pass/reviewerDecision.ts)
   - [src/v11/application/pass/reviewerPassPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/pass/reviewerPassPreparation.ts)
   - [src/v11/application/pass/passRoutingPreparation.ts](/Users/felho/dev/pairflow/src/v11/application/pass/passRoutingPreparation.ts)
   - [src/v11/shared/reviewer/reviewerCommandGateGuidance.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewer/reviewerCommandGateGuidance.ts)
   - [docs/pairflow-initial-design.md](/Users/felho/dev/pairflow/docs/pairflow-initial-design.md)
2. Canonical elements:
   - `severity_gate_round` tovabbra is post-gate switch
   - `review_policy.reviewer_blocking_min_severity` a post-gate blocker threshold
   - clean reviewer path post-gate tovabbra is convergence
3. Guard elements:
   - document scope qualifier semantics (`timing=required-now`, `layer=L1`) preserved
   - malformed findings payload hard reject preserved
4. Compat elements:
   - round 1 reviewer emit semantics
   - implementer pass semantics
5. Forbidden reinterpretations:
   - az uj reviewer threshold nem jelentheti azt, hogy pre-gate korokben advisory findingot nem lehet fix-requesttel visszakuldeni
   - a clean post-gate path nem valhat ujra reviewer `pass --no-findings` authorityva

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `validateReviewerPassGate`, `prepareReviewerPass`, `preparePassRouting`, reviewer command gate guidance, tmux delivery message builder.
2. Actual touched scope:
   `workflow/orchestration consumer alignment`.
3. Mutation entrypoints in scope:
   nincs uj persisted config mutation; csak command validation/routing authority valtozik.
4. Hidden scope ruled out:
   config parser/render, UI mutate API, remote review-policy write path, meta-review gate routing.
5. Why the declared task shape matches reality:
   a producer closure mar lezarult az elso taskban; itt a reviewer consume-family alignment es docs parity a bounded scope.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Entry | Contract Delta | Required Behavior | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/domain/pass/reviewerDecision.ts` | `validateReviewerPassGate(...)` | post-gate blocker authority configurable | highest open severity meet-or-exceed reviewer threshold eseten reviewer `pass/fix_request` maradjon engedett; threshold alatt convergence kotelezo | P1 | T1,T2,T3 |
| CS2 | `src/v11/application/pass/reviewerPassPreparation.ts` | reviewer gate prep | normalized reviewer threshold receive/use | reviewer validation ne hard-coded blocker definiciot hasznaljon | P1 | T1,T2 |
| CS3 | `src/v11/application/pass/passRoutingPreparation.ts` + types | routing input threading | threshold authority atadasa | review-policy consume explicit legyen, ne implicit import side-channel | P1 | T4 |
| CS4 | `src/v11/shared/reviewer/reviewerCommandGateGuidance.ts` | guidance matrix | threshold-driven reviewer text | `P2/P3 advisory-only` fix szoveg helyett configured threshold semantics | P1 | T5 |
| CS5 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | pane guidance projection | runtime guidance alignment | a reviewer pane-be juto command guidance ugyanazt a threshold policy-t vigye | P1 | T5 |
| CS6 | `docs/pairflow-initial-design.md`, `README.md` | spec/operator docs | protocol parity | a reviewer convergence szabaly explicit threshold-driven legyen | P2 | T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Reviewer post-gate blocker rule | fix `P0/P1` | configurable reviewer threshold | normalized reviewer threshold | none | intentional behavior change |
| Reviewer guidance | `P2/P3 advisory-only` text | threshold-driven text | threshold semantics + clean path | examples by threshold | intentional text update |

Normative rules:
1. Pre-gate (`round < severity_gate_round`) reviewer findings path unchanged:
   findingskel tovabbra is `pass/fix_request`.
2. Post-gate clean path unchanged:
   clean review -> canonical convergence.
3. Post-gate findings path:
   - if highest open severity meets/exceeds `reviewer_blocking_min_severity` -> reviewer `pass/fix_request` engedett
   - if highest open severity threshold alatt marad -> reviewer `pass` tiltott, convergence required
4. Document scope qualifier semantics preserved:
   unqualified document `P0/P1` finding tovabbra sem valik automatikus blockerre.

### 3) Error Contract

| Trigger | Behavior | Reason Code / Surface | Priority |
|---|---|---|---|
| post-gate pass on threshold alatti findings | reject | existing reviewer post-gate invalid path, de threshold-aware message-gel | P1 |
| post-gate `--no-findings` reviewer pass | reject | existing clean-post-gate reject surface preserved | P1 |
| malformed findings payload | reject | existing `FINDINGS_PAYLOAD_INVALID` preserved | P1 |

### 4) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | reviewer threshold `P3` blocks P3-only findings post-gate | round >= gate, reviewer threshold=`P3`, only `P3` findings | reviewer pass validation fut | `pass/fix_request` engedett, convergence nem kotelezo |
| T2 | reviewer threshold `P2` converges P3-only findings | round >= gate, threshold=`P2`, only `P3` findings | reviewer pass validation fut | reviewer `pass` tiltott, convergence required |
| T3 | reviewer threshold `P2` still blocks P2 findings | round >= gate, threshold=`P2`, highest=`P2` | validation fut | reviewer `pass/fix_request` engedett |
| T4 | pre-gate advisory findings unchanged | round < gate, threshold akarmi | reviewer findings pass fut | legacy pre-gate fix-request behavior marad |
| T5 | guidance text threshold-driven | threshold-aware runtime context | guidance builder fut | nincs fix `P2/P3 advisory-only` matrix; threshold authority explicit |
| T6 | docs/spec parity | implementation merged | docs review | initial design es README ugyanazt a threshold-driven reviewer semantics-et irja le |

### 5) Review Control

Reviewer akkor adhat `IMPLEMENTABLE` allapotot, ha:
1. a post-gate reviewer blocker authority egyertelmuen a canonical reviewer thresholdhoz kotott,
2. a task nem nyitja ujra a dual-threshold producer/mutation/read-model foundationt,
3. a pre-gate es clean-path baseline preserved behavior explicit marad,
4. a docs/guidance ugyanazt a semantics-et tukrozik, mint a runtime.

## L2 - Implementation Notes (Optional)

1. A threshold compare helper erdemes a meta-review severity orderinggel konzisztens maradjon, de anelkul, hogy a reviewer runtime a meta-review gate resolverre dependalna.
2. A guidanceben erdemes peldamondattal illusztralni:
   `configured reviewer_blocking_min_severity = P2` eseten `P3` mar advisory-only.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a post-gate reviewer semantics teljesen threshold-driven,
2. T1-T6 teljesen lefedik a viselkedesvaltozast,
3. nincs hard-coded `P2/P3 advisory-only` authority maradek a reviewer lane-ben.

## Assumptions

1. A reviewer threshold compare ugyanazzal a severity orderinggel mukodik, mint a tobbi review-policy threshold logika.
2. A docs update elegendo a `docs/pairflow-initial-design.md` + `README.md` szinten; kulon rollout doc most nem kell.
