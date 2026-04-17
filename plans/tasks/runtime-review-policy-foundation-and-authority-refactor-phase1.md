---
artifact_type: task
artifact_id: task_runtime_review_policy_foundation_and_authority_refactor_phase1_v1
title: "Runtime Review Policy Foundation and Authority Refactor (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/config/bubbleConfig.ts
  - src/core/bubble/reviewPolicy.ts
  - src/core/bubble/updateBubbleReviewPolicy.ts
  - src/core/bubble/bubbleLookup.ts
  - src/core/bubble/listBubbles.ts
  - src/core/bubble/statusBubble.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsArtifactJson.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/bubble/reviewPolicy.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/updateBubbleReviewPolicy.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts
prd_ref: null
plan_ref: plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
  - plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Foundation and Authority Refactor (Phase 1)

## Current Codebase Check (2026-04-10)

1. A checked-out kodban nincs `review_policy` runtime surface vagy `metaReviewGateThresholdAuthority` implementation.
2. A task `target_files` listajanak `src/core/**` resze mar nem letezik.
3. A task jelenleg nem implementalhato as-is; a scope-ot elobb a mai `src/v11/**` topologyra kell retargetelni.

## L0 - Policy

### Goal

Bevezetni a shared runtime review policy foundation reteget ugy, hogy:
1. a canonical `review_policy` schema, projection es mutation ownership egy helyre keruljon,
2. a thresholdhez szukseges authority/source-of-truth feloldas egyetlen explicit boundaryn tortenjen,
3. a jelenlegi runtime behavior meg ne valtozzon sem auto-rework threshold, sem reviewer bypass iranyba.

Ez a task akkor sikeres, ha a kovetkezo feature-kor mar nem kenyszerul ugyanabban a bubble-ben egyszerre mozgatni configot, read surface-eket, human-gate payloadot, gate routingot es UI/store retegeket.

### Context

1. A `review-policy-runtime-surface-phase1` bubble tanulsaga az volt, hogy a jelenlegi rendszerben a `review_policy`, a threshold authority, a runtime projection es a human-facing payload tobb kulon helper-halmazban el.
2. Emiatt ugyanaz a fogalmi dontes kulon shape-ben jelent meg:
   - gate routingban,
   - approval refresh pathban,
   - status/list/detail projectionben,
   - human-facing payloadban.
3. Ez a task szandekosan nem feature-delivery task, hanem bounded refaktor.
4. A shared umbrella tovabbra is helyes:
   - `review_loop_mode = full | meta_only`
   - `meta_review_auto_rework_min_severity = P1 | P2 | P3`
5. Ebben a fazisban azonban a fenti mezok meg nem valtoztatnak tenyleges runtime routingot vagy bypass topologyt.

### In Scope

1. Workflow/orchestrator-owned canonical `review_policy` type es config normalization.
2. Egyetlen canonical review-policy runtime view builder:
   - `requested_loop_mode`
   - `effective_loop_mode`
   - `support_status`
   - `blocked_reason_code`
3. Egyetlen canonical mutation seam a review-policy requested mezok read-modify-write ownershipara.
4. Egyetlen canonical threshold-authority resolver boundary, amely ugyanazon API-bol oldja fel:
   - `report_json`
   - findings artifact coordinates
   - parity metadata
   - same-round freshness/allapot
   - diagnostic output
5. Status/list/detail read pathok atkotese ugyanarra a review-policy projection builderre.
6. Teszt coverage a fenti seam-ekre es authority boundaryra.

### Out of Scope

1. Auto-rework threshold route vagy recommendation behavior tenyleges bevezetese.
2. Approval refresh vagy human-gate envelope semantics modositas.
3. Meta-review prompt/guidance policy injection.
4. Web UI controls, UI store, vagy API surface rollout.
5. Reviewer bypass behavior vagy scheduler/router topology valtas.
6. Reviewer vagy meta-reviewer cutover scope elohozatala.

### Safety Defaults

1. A task nem valtoztathatja meg a jelenlegi gate routing effective viselkedeset.
2. A task nem teheti a `meta_only` modot effective runtime topologyva.
3. Actor tovabbra sem olvashatja a canonical `review_policy` surface-et authority-forraskent.
4. Ha a threshold authority resolver nem tud teljes canonical inputot feloldani, expliciten unresolved/incomplete eredmenyt ad, es nem gyart secondary source-bol "igazsagot".
5. Ha a policy projection nem allithato elo megbizhatoan, a runtime surface fail-closed marad, de nem aktiv feature-pathot valtoztat.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble config contract
   - internal runtime projection contract
   - internal mutation/persistence contract
   - internal threshold authority resolution contract

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | review policy types | `BubbleConfig -> types`, `BubbleStatusView -> types` | bubble config and read-surface types | Canonical workflow-owned `review_policy` shape es a runtime view type explicitten tipizalt, kulon requested/effective/support mezokkel | P1 | required-now | T1, T3 |
| CS2 | `src/config/bubbleConfig.ts` | parse/render normalization | `parseBubbleConfigToml(input) -> BubbleConfig`, `renderBubbleConfigToml(config) -> string` | config parse/render path | A `review_policy` normalized defaults-szal parse/renderelheto, invalid ertekek fail-fast rejectelnek | P1 | required-now | T1, T2 |
| CS3 | `src/core/bubble/reviewPolicy.ts` | canonical policy helpers | `normalizeBubbleReviewPolicy(config) -> NormalizedReviewPolicy`, `buildBubbleReviewPolicyRuntimeView(input) -> BubbleReviewPolicyRuntimeView` | uj shared-core module | Egyetlen helper ownedolja a review-policy normalizationt es a requested/effective/support projectiont | P1 | required-now | T3, T4 |
| CS4 | `src/core/bubble/updateBubbleReviewPolicy.ts` | mutation seam | `updateBubbleReviewPolicy(input) -> result` | uj vagy explicit shared-core write seam | Egyetlen seam ownedolja a bubble TOML review-policy read-modify-write + freshness/conflict viselkedest; meg nincs UI/API rollout kotelezettseg | P1 | required-now | T5, T6 |
| CS5 | `src/core/bubble/bubbleLookup.ts`, `src/core/bubble/listBubbles.ts`, `src/core/bubble/statusBubble.ts`, `src/v11/shared/status/statusCommandViewBuilder.ts` | read projection usage | `lookup/list/status -> runtime view` | current read surfaces | A kulon read pathok ugyanazt a canonical policy runtime view builder-t hasznaljak | P1 | required-now | T3, T7 |
| CS6 | `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts` | threshold authority resolver | `resolveThresholdAuthority(input) -> ThresholdAuthorityResolution` | uj canonical authority module | Egyetlen API feloldja a thresholdhez tartozo authority inputot artifact/parity/report/freshness alapjan, routing nelkul | P1 | required-now | T8, T9, T10 |
| CS7 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsArtifactJson.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts` | authority support helpers | existing helpers -> support-only | existing helper modules | Ezek tamogato helperkent maradnak; nem kulon authority dontesi feluletek | P1 | required-now | T8, T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble config review policy | implicit/szetszort policy semantics | canonical `review_policy` object a bubble configban | `review_loop_mode`, `meta_review_auto_rework_min_severity` | future extension note | additive config contract, fail-fast invalid valuesnel | P1 | required-now |
| Runtime policy view | read surface-enkent implicit projection | egyetlen runtime view shape | `requested_loop_mode`, `effective_loop_mode`, `support_status` | `blocked_reason_code` | internal projection hardening | P1 | required-now |
| Review policy mutation seam | write ownership implicit vagy entrypoint-fuggo | explicit shared-core write seam | requested policy fields, freshness/conflict guard | diagnostic metadata | internal contract formalization | P1 | required-now |
| Threshold authority resolution | report/artifact/parity kulon helper-utakon all ossze | explicit `ThresholdAuthorityResolution` result | authority status, diagnostics, same-round status, source coordinates presence | resolved highest severity / open totals when available | internal refactor, behavior-change nelkul | P1 | required-now |

Normative rules:

1. A canonical `review_policy` workflow/orchestrator-owned marad.
2. A runtime view es a mutation seam nem lehet entrypointonkent kulon implementalva.
3. A threshold authority resolver nem route-ol es nem mutal state-et; csak canonical inputot old fel.
4. A threshold authority resolver nem hasznalhat reviewer snapshotot vagy summary-t canonical severity truthkent.
5. A policy projection builder nem olvashat implicitten UI-state-et vagy router-local state-et.
6. `effective_loop_mode` ebben a fazisban nem valhat `meta_only`-va.
7. A field naming mar a shared umbrellahez igazodjon:
   - `review_loop_mode`
   - `meta_review_auto_rework_min_severity`
8. Ha backward compatibility miatt alias szukseges, az parse-time normalization lehet, de a canonical internal shape egyetlen nevkeszletet hasznaljon.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble config | canonical `review_policy` schema parse/render es explicit write seam | entrypoint-specifikus inline TOML write pathok | a write ownership egy helyre keruljon | P1 | required-now |
| Runtime read surfaces | shared projection builder hasznalata | list/status/detail kulon projection drift | read path consolidation a cel | P1 | required-now |
| Threshold authority | canonical authority resolution artifact/parity/report inputbol | route shaping, state mutation, human-gate payload shaping | ez a fazis csak resolution boundary | P1 | required-now |
| UI/API | N/A | uj operatori controls vagy rollout semantics | kulon fazisba kerul | P1 | required-now |

Constraint: ebben a fazisban semmilyen uj feature-viselkedes nem lehet csak azert, mert a refaktor mar letrehozott egy uj seamet.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `review_policy.review_loop_mode` | config parse | throw | config reject | `REVIEW_POLICY_LOOP_MODE_INVALID` | error | P1 | required-now |
| invalid `review_policy.meta_review_auto_rework_min_severity` | config parse | throw | config reject | `REVIEW_POLICY_SEVERITY_INVALID` | error | P1 | required-now |
| threshold authority report/artifact path unsafe | authority resolver | result | unresolved authority result + diagnostic | `REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED` | warn | P1 | required-now |
| threshold authority freshness incomplete | authority resolver | result | incomplete authority result + diagnostic | `REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE` | warn | P1 | required-now |
| write seam freshness conflict | bubble config write | result | retryable conflict result; no silent overwrite | `REVIEW_POLICY_WRITE_CONFLICT` | warn | P1 | required-now |
| optional authority metadata missing | authority resolver | result | partial/unresolved result; no synthesized severity truth | `REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/runtime-review-policy-reset-and-phasing-plan-v1.md`, `src/core/bubble/reviewPolicy.ts`, explicit canonical threshold authority module | P1 | required-now |
| must-not-use | reviewer snapshot as canonical threshold authority, prompt-only threshold semantics, router-local inline TOML writes, UI/store rollout in this phase | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | config round-trip | valid bubble TOML explicit `review_policy` blockkal | parse + render lefut | a canonical internal shape round-tripol a shared field nevekkel | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T2 | invalid policy fields rejectelnek | invalid loop mode vagy severity | parse lefut | actionable config error jon vissza | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T3 | read surfaces shared projectionre epulnek | bubble review policyval letezik | list/status projection keszul | ugyanaz a runtime view shape jelenik meg drift nelkul | P1 | required-now | `tests/core/bubble/listBubbles.test.ts`, `tests/core/bubble/statusBubble.test.ts` |
| T4 | projection builder fail-closed effective modeot ad | `requested_loop_mode=meta_only` | runtime view builder lefut | `effective_loop_mode` nem lesz `meta_only`, blocked reason explicit marad | P1 | required-now | `tests/core/bubble/reviewPolicy.test.ts` |
| T5 | mutation seam ownership explicit | requested policy update erkezik | canonical seam lefut | a bubble TOML explicit read-modify-write utvon frissul | P1 | required-now | `tests/core/bubble/updateBubbleReviewPolicy.test.ts` |
| T6 | mutation conflict nem overwrite-ol | stale fingerprint vagy equivalent freshness guard | update lefut | explicit conflict eredmeny jon vissza | P1 | required-now | `tests/core/bubble/updateBubbleReviewPolicy.test.ts` |
| T7 | status builder nem sajat projectiont epit | status CLI/detail read path review policyt olvas | render lefut | a shared runtime view builder outputjat hasznalja | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| T8 | threshold authority feloldas canonical inputokbol | report json + artifact coordinates + parity metadata rendelkezesre all | authority resolver lefut | explicit resolution result keletkezik route shaping nelkul | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts` |
| T9 | threshold authority unresolved marad secondary source nelkul | artifact hianyzik vagy unsafe | authority resolver lefut | unresolved/incomplete result + diagnostic jon, nem reviewer snapshot truth | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts` |
| T10 | stale same-round context nem ad authority truthot | prior-round vagy round-nelkul artifact | authority resolver lefut | a result conservative marad, explicit freshness diagnostic mellett | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a canonical threshold authority result shape kesobb mas gate-eknek is kelleni fog, erdemes lehet kulon shared diagnostic enumot bevezetni.
2. [later-hardening] Ha a policy mutation seam kesobb CLI/API entrypointot is kap, a provenance metadata formatjat kulon taskban erdemes rogzitni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Router/UI wiring kulon taskba keruljon | L2 | P2 | later-hardening | reset plan | ne ebben a fazisban legyen bekotve |
| H2 | Approval refresh es human-gate payload authority alignment | L2 | P2 | later-hardening | bubble learning | Phase 2 threshold taskban oldjuk meg |
| H3 | Actor prompt/guidance policy injection | L2 | P3 | later-hardening | original umbrella scope | kulon follow-up task |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. Uj `required-now` csak evidence-backed `P0/P1` lehet a masodik round utan.
4. Ami feature rollout vagy UI rollout, de nem foundation blocker, azt `later-hardening` vagy follow-up taskkent kell kezelni.
5. A task reviewjenel a fo kerdes nem az, hogy "kesz a threshold feature?", hanem az, hogy "egy helyre kerult-e a policy es authority ownership?".

## Spec Lock

Mark task as `IMPLEMENTABLE` when:
1. a canonical `review_policy` schema, runtime view es mutation seam explicit,
2. a threshold authority resolution egyetlen boundaryre kerult,
3. a read surface-ek ugyanazt a projection builder-t hasznaljak,
4. es a task explicitten nem csuszik at threshold feature deliverybe vagy bypass behavior rolloutba.
