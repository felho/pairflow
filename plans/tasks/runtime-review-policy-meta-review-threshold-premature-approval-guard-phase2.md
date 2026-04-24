---
artifact_type: task
artifact_id: task_runtime_review_policy_meta_review_threshold_premature_approval_guard_phase2_v1
title: "Runtime Review Policy Meta-Review Threshold Premature-Approval Guard (Phase 2)"
status: implementable
phase: phase2
target_files:
  - src/v11/shared/metaReview/metaReviewCommandSubmitPreparation.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitValidation.ts
  - src/v11/shared/metaReview/metaReviewSubmitGuidance.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts
  - src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/core/runtime/metaReviewSubmitGuidance.test.ts
  - tests/core/bubble/approvalRequestEnvelope.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts
prd_ref: null
plan_ref: plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/archive/tasks/runtime-review-policy-auto-rework-threshold-phase2.md
  - plans/tasks/review-policy-runtime-surface-and-rollout-phase1.md
  - plans/archive/tasks/meta-review-gate/meta-review-approve-advisory-open-findings-semantic-support-phase2.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Meta-Review Threshold Premature-Approval Guard (Phase 2)

## Current Codebase Check (2026-04-24)

1. A current bubble config/runtime surface valoban hordozza a threshold beallitast:
   - `review_policy.meta_review_auto_rework_min_severity`
   - a reprodukalt bubbleben ez `P3`
2. A reprodukalt current artifact szerint a meta-review recommendation lehet `approve` ugy is, hogy ugyanabban a runban nyitott `P2` es `P3` findingok maradnak.
3. A current finalization wiring a threshold authorityt csak ezen az agon consultalja:
   - `recommendation === "rework" && budgetAvailable === true`
   Emiatt `approve` eseten a threshold nem blockolja a human approval route-ot.
4. A current approve semantic path mar explicitten tamogatja az `approve + advisory_open_findings` kombinaciot, amennyiben `blocking_open_total == 0`.
5. A current rendszerkovetkezmeny ezert hibas lehet:
   - threshold met
   - recommendation `approve`
   - human gate megis `READY_FOR_HUMAN_APPROVAL`
6. A user-side policy decision ehhez a follow-uphoz explicit:
   - a configured threshold elsodlegesen premature-approval guard,
   - nem az a feladata, hogy a mar kimondott `rework` utat visszafogja.

## L0 - Policy

### Goal

1. A `meta_review_auto_rework_min_severity` current follow-up szemantikaja legyen explicit: premature-approval guard.
2. Ha a same-run highest open severity eleri vagy meghaladja a configured minimumot, a meta-reviewer nem emitelhet ervenyes `approve` recommendationt.
3. A `rework` recommendation utjan a threshold ne legyen tovabbi gate; ha a meta-review mar `rework`, a rendszer ne ezen a thresholdon vitatkozzon vissza.
4. Az existing `approve + advisory-only` semantics maradjon meg, de csak akkor, ha a same-run authority bizonyitja, hogy a highest open severity a configured threshold alatt marad.
5. A rendszer deterministic resze ne csak utolag emberre tolja a problemat, hanem mar submit-time vagy gate-time fail-closed jelezze a meta-reviewernek, hogy az `approve` ervenytelen.

### Context

1. A Phase 1/2 review-policy lane bevezette a canonical same-run threshold authority gondolatot.
2. A kesobbi approve+advisory semantics legitim use-case-kent formalizalta a nem-blokkolo nyitott findingok melletti `approve`-ot.
3. A current bug e ket contract kozti precedence-hianyt mutatja meg:
   - threshold met eseten a rendszer ma semmit nem kezd az `approve` recommendationnel,
   - csak a `rework` agban consultalja a thresholdot.
4. A follow-up explicit policy-dontese:
   - threshold precedence > advisory-only approve compatibility
   - ugyanakkor threshold precedence nem jelentheti azt, hogy a `rework` utat tovabbra is ugyanazzal a gate-tel kell lassitani.

### In Scope

1. Submit-time vagy submit-preparation-time guard, amely threshold-met vagy threshold-unresolved approve eseten rejectalja az invalid `approve` emitet meg a canonical state write elott.
2. Current-run finalization backstop, amely akkor sem enged `human_gate_approve` route-ot, ha valamilyen invalid `approve` payload megis atjutna a submit guardon.
3. A threshold-vs-advisory precedence explicit szerzodeses rogzitse.
4. Meta-review submit guidance pontositasa ugy, hogy a meta-reviewer tudja:
   - threshold-met eseten ne `approve`-ot emiteljen,
   - hanem `rework`-ot adjon.
5. Celzott regresszios tesztek a submit reject pathra, finalization backstopra, es guidance alignmentra.

### Out Of Scope

1. A config key atnevezese.
   - `meta_review_auto_rework_min_severity` ebben a follow-upban kompatibilitasi okbol megmarad.
2. Bubble UI/config mutation surface redesign vagy copy rewrite.
3. A teljes runtime review policy lane ujratervezese.
4. Approve/advisory split schema altalanos ujranyitasa a threshold precedence-en tul.
5. Uj workflow topology vagy reviewer-bypass semantics.

### Safety Defaults

1. Threshold-met approve eseten a rendszer fail-closed rejecteljen; ne jusson el `human_gate_approve` allapotig.
2. Ha approve eseten a same-run severity authority nem oldhato fel megbizhatoan, az approve szinten fail-closed reject legyen.
3. A rework-path current baseline ne gyenguljon:
   - `recommendation=rework` eseten a rendszer ne vardjon meg egy kulon threshold-passzust ahhoz, hogy a rework ut ervenyes legyen.
4. Summary, reviewer snapshot vagy human-approval metadata tovabbra sem valhat canonical threshold truth-ta.
5. Az existing approve+advisory semantics csak threshold-alatti advisory esetben maradhat ervenyes.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - meta-review submit validation/reject contract
   - same-run threshold authority consume contract
   - meta-review gate finalization approval-route contract
   - approve+advisory compatibility precedence contract
   - operator/meta-reviewer submit guidance contract

## L1 - Change Contract

### Target-File Reality Check

1. A current submit pipeline mar a canonical bubble configot, az active state-et es az artifact-read capabilityt is feloldja a `prepareMetaReviewSubmitContext(...)` boundaryben.
2. Emiatt a threshold guard current-tree szerint nem kenyszerul kizlag a gate finalizationra; megvalosithato meg state-write elott.
3. A current gate finalization ugyanakkor tovabbra is kotelezo backstop, mert a route truth ma ott dol el.
4. A `metaReviewGateThresholdAuthority.ts` current baseline producer-anchor; ebben a follow-upban consume-orientalt reuse a cel, nem uj authority producer kitalalasa.
5. A `metaReviewSubmitGuidance.ts` mar ma is explicit approve/advisory guidance source; threshold guard copy ugyanitt tarthato aligned formaban.

### Control Model

1. `business_invariant`
   - configured threshold mellett nem johet letre ervenyes `approve`, ha a same-run highest open severity eleri vagy meghaladja a minimumot.
2. `control_model`
   - a threshold truth source tovabbra is a same-run findings artifact/parity authority chain.
   - a submitter nem irhatja felul ezt summaryval vagy recommendationnel.
3. `read_path_rule`
   - threshold config: normalized `review_policy`
   - threshold authority: `metaReviewGateThresholdAuthority` same-run resolver
   - approve advisory split: existing structured approve claim metadata
4. `forbidden_fallback`
   - recommendation `approve` onmagaban nem bizonyitek arra, hogy a threshold nem met.
   - `blocking_open_total == 0` onmagaban nem eleg az approve-hoz, ha a configured threshold alacsonyabb, mint a highest advisory severity.
5. `allowed_resolution_path`
   - same-run structured claim + artifact/parity authority feloldasa
   - threshold compare
   - approve allow vagy reject deterministic outcome
6. `missing_data_rule`
   - approve eseten unresolved/incomplete threshold authority fail-closed reject.
   - rework eseten unresolved/incomplete threshold authority nem blokkolhatja a rework route-ot.

### Precedence Lock

1. `threshold precedence`
   - ha `highestOpenSeverity >= meta_review_auto_rework_min_severity`, akkor `recommendation=approve` invalid.
2. `advisory compat precedence`
   - `approve + advisory-only` csak akkor valid, ha `blocking_open_total == 0` ES `highestOpenSeverity < meta_review_auto_rework_min_severity`.
3. `rework precedence`
   - `recommendation=rework` eseten a threshold nem kulon approval-like gate; a rework ut current routing/budget semantics szerint halad tovabb.
4. `clean approve`
   - ha a structured claim szerint nincs nyitott finding, a threshold csak annyiban relevans, hogy ezt summary/claim/artifact ne mondja ellent.
5. `threshold authority missing`
   - clean approvehoz nem kotelezo nyitott-finding authority feloldas,
   - open-findings approvehoz kotelezo.

### Baseline Preservation

1. `must_preserve_behaviors`
   - `recommendation=approve` + zero open finding tovabbra is ervenyes clean approve marad
   - `recommendation=approve` + advisory-only threshold-alatti finding tovabbra is ervenyes marad
   - `recommendation=rework` + budget/current routing baseline nem torhet el pusztan attol, hogy threshold config be van allitva
   - `recommendation=inconclusive` valtozatlanul kulon route marad
2. `forbidden_regression_interpretations`
   - a follow-up nem valhat altalanos approve-ban tiltott advisory-open rollbackka
   - a follow-up nem tarthatja eletben a current `rework`-path threshold-gate-et ugy, mintha az tovabbra is a primary policy lenne
3. `replacement_proof_required_if_removed`
   - ha a current rework-branch threshold consult megszunik vagy atformalodik, teszttel kell bizonyitani, hogy a bounded replacement policy:
     - premature-approval guardot ad,
     - de nem tor vissza legitim rework routingot.

### Call-Site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReview/metaReviewCommandSubmitPreparation.ts` | `prepareMetaReviewSubmitContext(...)` | submit-preparation szinten explicit threshold-guard consult current bubble policy + same-run authority alapjan, es threshold-sertett approve eseten fail-closed reject meg canonical state write elott | P1 | required-now | T1, T2, T3 |
| CS2 | `src/v11/shared/metaReview/metaReviewCommandSubmitValidation.ts` | submit validation helpers | a submit oldali payload invariant family explicit threshold-guard reason-code contracttal egeszul ki; a validation ne csak schema/split parityt, hanem premature-approval guardot is tudjon representalni | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts` | shared guidance text | explicit guidance: threshold-met nyitott finding mellett ne `approve`, hanem `rework`; advisory-only approve csak threshold alatt valid | P1 | required-now | T6 |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts` | `finalizeCurrentRunMetaReviewGate(...)` | finalization backstop: invalid threshold-met approve nem mehet `human_gate_approve`-ra, akkor sem, ha submit guard valamiert kihagyodott | P1 | required-now | T4, T5 |
| CS5 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts` | positive-claim validation orchestration | approve-path validation es current-run threshold consume kapcsolata explicit legyen; ne csak a `rework` path legyen threshold-aware | P1 | required-now | T4, T5 |
| CS6 | `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts` | same-run threshold authority reuse seam | consume-side helper/export shape csak annyiban modosithato, amennyiben a submit guard es finalization backstop ugyanazt a canonical authority resultot tudja uj producer nelkul reuse-olni | P2 | required-now | T1, T4 |
| CS7 | `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts`, `tests/core/runtime/metaReviewSubmitGuidance.test.ts`, `tests/core/bubble/approvalRequestEnvelope.test.ts` | regression coverage | a submit reject, finalization block, guidance alignment es human approval fail-closed proof explicit coverage-t kap | P1 | required-now | T1-T7 |

### Data / Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Threshold semantic meaning | current mixed reading: rework-path gate | premature-approval guard | `meta_review_auto_rework_min_severity`, same-run highest open severity | diagnostics | semantic tightening under same config key | P1 | required-now |
| Approve + advisory validity | `blocking_open_total == 0` eleg lehet | threshold-aware advisory approve | split metadata + threshold-authority result | diagnostics | compatibility narrowing | P1 | required-now |
| Submit reject contract | schema/parity oriented | policy reject is explicit | reason code, actionable message | threshold diagnostics | additive error contract | P1 | required-now |
| Finalization safety net | approve path threshold-unaware | fail-closed approval backstop | non-approve outcome when threshold violated | fallback diagnostics | hardening | P1 | required-now |

#### Normative rules

1. `meta_review_auto_rework_min_severity` current follow-up szemantikaja:
   - minimum open severity, amelytol kezdve `approve` mar nem ervenyes.
2. `recommendation=approve` + open findings csak akkor valid, ha mindketto igaz:
   - `blocking_open_total == 0`
   - `highestOpenSeverity < configured threshold`
3. `recommendation=approve` + open findings + threshold-met eseten a submit fail-closed reject legyen.
4. `recommendation=approve` + open findings + threshold authority unresolved/incomplete eseten a submit fail-closed reject legyen.
5. `recommendation=rework` utjan a threshold nem extra routing gate ebben a follow-upban.
6. `recommendation=inconclusive` semantics ebben a follow-upban valtozatlan.
7. A threshold authority canonical source-a tovabbra is same-run findings artifact/parity; summary-level open-finding claims nem elegsegesek.
8. A reviewer snapshot tovabbra is approve-consistency guard lehet, de nem threshold authority source.
9. A config key neve ebben a follow-upban valtozatlan marad, noha a consume semantics szukebben van definialva.

### Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback / Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| approve + open findings + highest severity meets threshold | same-run threshold authority resolved | throw / reject | submit rejected; meta-reviewer must resubmit as `rework` or lower-severity-consistent outcome | `META_REVIEW_APPROVE_THRESHOLD_BLOCKED` | warn | P1 | required-now |
| approve + open findings + threshold authority unresolved/incomplete | same-run threshold authority | throw / reject | submit rejected; canonical severity context must be restored before approve | `META_REVIEW_APPROVE_THRESHOLD_CONTEXT_UNRESOLVED` | warn | P1 | required-now |
| invalid approve slips past submit guard | finalization backstop | fail-closed result | no `human_gate_approve`; explicit fallback reason persisted for diagnostics | `META_REVIEW_APPROVE_THRESHOLD_BACKSTOP` | error | P1 | required-now |
| rework submit with valid payload | existing submit/runtime context | result | current rework routing continues without threshold block | existing routes | info | P1 | required-now |

Reason-code precedence:

1. Existing schema / split-required / split-format errors megelzik a threshold semantic guardot.
2. Existing summary-vs-structured parity guard tovabbra is a threshold semantic guard elott fut.
3. Ezutan jon az approve threshold guard:
   - authority unresolved/incomplete -> `META_REVIEW_APPROVE_THRESHOLD_CONTEXT_UNRESOLVED`
   - authority resolved + threshold met -> `META_REVIEW_APPROVE_THRESHOLD_BLOCKED`
4. Finalization backstop csak vedelmi ut; normal esetben submit-time reject miatt nem ez a primary signal.

### Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `review_policy` normalized current config surface | P1 | required-now |
| must-use | `metaReviewGateThresholdAuthority` same-run authority chain | P1 | required-now |
| must-use | existing approve split/parity validation as precondition | P1 | required-now |
| must-not-use | summary-only severity inference threshold gatehez | P1 | required-now |
| must-not-use | reviewer snapshot mint threshold truth | P1 | required-now |
| must-not-use | silent approve->rework mutation explicit reject nelkul a submit boundaryn | P1 | required-now |

### Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Threshold-met advisory approve reject | configured threshold `P3`, approve payload nyitott `P2` findinggal, split metadata valid | meta-review submit fut | submit reject `META_REVIEW_APPROVE_THRESHOLD_BLOCKED`; canonical state write nem tortenik meg | P1 | required-now | automated test |
| T2 | Threshold authority unresolved reject | configured threshold jelen van, approve payload open findingset allit, de same-run severity authority unresolved/incomplete | meta-review submit fut | submit reject `META_REVIEW_APPROVE_THRESHOLD_CONTEXT_UNRESOLVED` | P1 | required-now | automated test |
| T3 | Threshold-alatti advisory approve marad valid | configured threshold `P2`, approve payload csak `P3` advisory open findinggal, split metadata valid | meta-review submit fut | submit sikeres; approve/advisory semantics megmarad | P1 | required-now | automated test |
| T4 | Finalization backstop blocks invalid approve | invalid approve canonical run result valamiert megis finalizationra jut | gate finalization fut | nem keletkezik `human_gate_approve`; explicit fail-closed outcome szuletik | P1 | required-now | automated test |
| T5 | Rework path no longer threshold-gated | configured threshold jelen van, recommendation `rework`, budget elerheto, threshold consult nincs mint extra gate | gate finalization fut | current rework route tovabbmegy threshold-triggeru block nelkul | P1 | required-now | automated test |
| T6 | Shared guidance states threshold guard | startup/shared submit guidance renderelodik | guidance build fut | explicit szoveg mondja: threshold-met nyitott finding mellett ne emitelj `approve`-ot | P1 | required-now | automated test |
| T7 | Human approval envelope stays fail-closed | approve route envelope path invalid threshold-met approve metadata mellett | approval request append fut | human approval envelope nem epul fel csendben | P2 | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: Threshold-met open-findings approve submit-time rejectre fut, es nem ir canonical success state-et.
2. AC2: Threshold-authority unresolved/incomplete open-findings approve submit-time rejectre fut.
3. AC3: Threshold-alatti advisory-only approve tovabbra is ervenyes.
4. AC4: Rework route current baseline nem marad threshold-gated ugyanazzal a policyval.
5. AC5: Finalization backstop akkor sem enged `human_gate_approve` route-ot, ha invalid approve atjutna a submit guardon.
6. AC6: A shared meta-review guidance explicitten kimondja a threshold-premature-approval guardot.

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1 |
| AC2 | T2 |
| AC3 | T3 |
| AC4 | T5 |
| AC5 | T4, T7 |
| AC6 | T6 |

## Review Control

1. A review ne tolja vissza ezt a taskot altalanos review-policy redesignba.
2. A review ne koveteljen config key rename-t ebben a korben.
3. A review ne fogadjon el olyan fixet, amely csak UI-status szinten rejti el a hibas `approve`-ot.
4. A review ne fogadjon el olyan fixet, amely a rework utat tovabbra is ugyanazzal a threshold gate-tel blokkolo modon tartja eletben, ha a submit approve-guard mar be van vezetve.

## Spec Lock

Task `IMPLEMENTABLE`, ha:

1. a threshold current follow-up szemantikaja explicitten premature-approval guardkent van rogzitve,
2. a submit pipeline current tree-ben fail-closed rejectalja a threshold-met vagy threshold-unresolved open-findings approve-ot,
3. a finalization backstop nem engedi `human_gate_approve`-ra az invalid approve-ot,
4. a threshold-alatti advisory-only approve kompatibilitas megmarad,
5. a `rework` ut nincs tovabbra is ugyanennek a thresholdnak rendelve mint extra approval-szeru gate,
6. a guidance explicitten a helyes meta-reviewer emit viselkedest mondja ki.
