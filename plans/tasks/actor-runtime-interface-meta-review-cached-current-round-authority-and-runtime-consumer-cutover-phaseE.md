---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_reviewer_parity_authority_and_runtime_consumer_cutover_phaseE_v1
title: "Actor Runtime Interface Meta-Review Reviewer-Parity Authority and Runtime Consumer Cutover (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/v11/shared/actorProtocol/actorEmitContext.ts
  - src/v11/shared/metaReview/metaReviewCommandContract.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPreparation.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReviewGate/metaReviewGateShared.ts
  - src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRunResultArtifacts.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/state/stateSchemaAuthorityChecks.ts
  - src/v11/application/converged/convergedFinalizationMetadata.ts
  - src/v11/application/converged/convergedFinalizationEvents.ts
  - tests/core/state/stateSchema.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/v11/application/converged/convergedFinalization.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Reviewer-Parity Authority and Runtime Consumer Cutover (Phase E)

## Current Codebase Check (2026-04-11)

1. A canonical meta-review submit duplicate guard ma meg a torlendo cached `last_autonomous_report_ref` + `last_autonomous_updated_at` snapshot-ablakra tamaszkodik.
2. A meta-review submit authority mar hasznal aktiv `execution_context` fogalmat, de nem ugyanazt az end-to-end stale-guard modellt koveti, mint a reviewer emit path.
3. A gate/finalization helper-ek egy resze ma meg cached state-hidratalassal allit elo human-gate fallback vagy recovered run-result payloadot.
4. A RUNNING meta-review authority validator ma meg a cached last-run snapshot jelenletevel enged at bizonyos partial recovery/allapot-visszaolvasasi eseteket.
5. A converged finalization telemetry ma meg fallbackkent kozvetlenul `state.meta_review.last_autonomous_*` mezokbol olvas recommendation/status adatot.
6. Emiatt az elso foundation lepes nem uj live state mezot kell bevezessen, hanem reviewer-parity authority/stale-guard contractra kell atallitsa a meta-review submit es hidden runtime seams-et.

## Executive Summary

1. Ez a Phase E elso foundation taskja.
2. A cel, hogy a meta-review canonical submit ugyanarra a mintara mukodjon, mint a reviewer oldal:
   - aktiv `execution_context` az authority,
   - explicit `expectedHandoffId` / `expectedRole` / `expectedRound` / `expectedStateFingerprint` a stale guard,
   - fail-closed latest-state reread a conflict/retry vedelmenel.
3. A task nem vezet be `submit_receipt`-et vagy barmilyen uj atmeneti state mezot.
4. A hidden runtime consumeroknak explicit `MetaReviewResult`, canonical artifact vagy route-derived fallback inputra kell atallniuk a cached state helyett.
5. A fizikai `last_autonomous_*` field-removal kulon, kesobbi task marad; ez a task annak reviewer-parity eloeltetele.

## L0 - Policy

### Goal

Valtsa ki a cached `last_autonomous_*` allapotfuggosegeket reviewer-parity meta-review authority/runtime contracttal ugy, hogy a control-path tobbe ne a cached last-run snapshotbol kovetkeztessen.

### In Scope

1. A meta-review submit authority atallitasa reviewer-parity stale-guard modellre.
2. A cached snapshot-window duplicate guard lecserelese fail-closed stale-state/reread modellre.
3. A gate/finalization/recovered run-result synthesis cached snapshot-fuggosegenek megszuntetese.
4. A RUNNING meta-review authority validator atallitasa cached snapshot nelkuli live authority contractra.
5. A converged finalization telemetry fallback atallitasa explicit current-run inputokra vagy route-semantikara.
6. A fenti valtozasok regresszios tesztjei.

### Out of Scope

1. A cached `last_autonomous_*` mezok fizikai torlese a type/schema/write shape-bol.
2. Approval source-of-truth transcriptre allitasa.
3. Status/list projection cleanupja.
4. Public CLI/read-stack removal.
5. Workflow, UI vagy docs cleanup.

### Safety Defaults

1. Nincs uj live meta-review state mezobevezetes ebben a taskban.
2. A canonical authority az aktiv `meta_review.execution_context`; nincs masodlagos state-receipt vagy retained replacement source.
3. Ha a stale guard mismatch miatt a submit mar nem az aktiv authorityhoz tartozik, a rendszer fail-closed dobjon hibata.
4. A gate vagy telemetry fallback inkabb legyen explicit `inconclusive` vagy route-derived, mint cached state-olvasas.
5. A task nem hozhat vissza retained state snapshotot mas nev alatt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble state live authority/runtime contract,
   - meta-review submit stale-guard contract,
   - meta-review gate/current-run synthesis contract,
   - converged lifecycle event metadata contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: active `meta_review.execution_context` -> `expectedHandoffId` / `expectedRound` / `expectedStateFingerprint`
   - competing identifiers or fallback identities: cached `last_autonomous_*` snapshot window
10. Authority/source-of-truth note:
   - canonical source: active execution context + stale guard inputs + explicit `MetaReviewResult`
   - forbidden secondary sources: persisted cached recommendation/status/report snapshot

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReview/metaReviewCommandContract.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitPreparation.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.ts`, `src/v11/shared/actorProtocol/actorEmitContext.ts` | `MetaReviewSubmitInput`, `prepareMetaReviewSubmitContext(...)`, `assertMetaReviewSubmitterAuthority(...)`, `assertActorEmitContextMatches(...)` | existing command contract/helpers -> updated helpers | canonical submit authority seam | A meta-review submit a reviewerrel paritasos stale guard szerint validaljon: az aktiv authority csak akkor ervenyes, ha az aktiv `execution_context` koherens az elvart `handoff_id` / role / round / fingerprint adatokkal. A command ne kovetkeztessen sikerre cached state snapshotbol vagy runtime-session jelenletbol. | P1 | required-now | contract + tests |
| CS2 | `src/v11/shared/metaReview/metaReviewSnapshot.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts` | `hasCanonicalSubmitForActiveMetaReviewRound(...)`, `writeCanonicalSubmitState(...)` | existing helpers -> updated helpers | canonical submit seam | A same-round retry/duplicate vedelmet ne a cached `last_autonomous_*` snapshot-window adja. State conflict vagy reread utan a submit fail-closed stale-state logikaval doljon el, es ne legyen uj receipt vagy replacement state marker. | P1 | required-now | core tests |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateShared.ts`, `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRunResultArtifacts.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts` | gate/finalization helpers | existing helpers -> updated helpers | current-run gate seam | Human-gate fallback, recovered run-result synthesis es current-run finalization explicit `MetaReviewResult`, canonical artifact vagy explicit fallback input alapjan dolgozzon; ne olvassa vissza a cached last-run snapshotot a state-bol. | P1 | required-now | core tests |
| CS4 | `src/v11/shared/state/stateSchemaAuthorityChecks.ts` | meta-review RUNNING authority validation helpers | existing helpers -> updated helpers | state authority validation | A RUNNING meta-review authority validator ne a cached run snapshotra tamaszkodjon. A partial recovery/allapot-visszaolvasasi eset csak aktiv `execution_context`-tel koherens live authority alapjan mehessen at. | P1 | required-now | schema tests |
| CS5 | `src/v11/application/converged/convergedFinalizationMetadata.ts`, `src/v11/application/converged/convergedFinalizationEvents.ts` | `buildMetaReviewRoutedMetadata(...)`, human-gate lifecycle event metadata builders | existing builders -> updated builders | converged telemetry seam | Recommendation/status fallback ne olvasson `state.meta_review.last_autonomous_*` mezokbol. Forras csak explicit `metaReviewRun`, canonical artifact metadata, gate route semantics vagy fail-closed/default `inconclusive` lehet. | P1 | required-now | converged tests |
| CS6 | `tests/core/state/stateSchema.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`, `tests/v11/application/converged/convergedFinalization.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts` | regression coverage | tests -> tests | authority/runtime regression matrix | A coverage explicitten fogja a reviewer-parity stale guardot, a duplicate-submit snapshotmentes fail-closed viselkedest, a gate fallback snapshotmentes mukodeset, a RUNNING validator uj guardjat es a converged telemetry cached-state mentes fallbackjat. | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review submit authority | mixed live authority + legacy snapshot-driven dedupe | reviewer-parity stale guard | `round`; active `execution_context`; `expectedHandoffId`; `expectedRole`; `expectedRound`; `expectedStateFingerprint` when authoritative actor context is available | `refs` | breaking internal source-of-truth correction | P1 | required-now |
| Same-round canonical submit dedupe | cached `report_ref` + `updated_at` active-window inference | stale-state guard + latest-state reread fail-closed | active `execution_context` identity + stale guard fields above | runtime diagnostics | breaking internal source-of-truth correction | P1 | required-now |
| Gate/recovery run-result synthesis | cached snapshot state-hydration | explicit `MetaReviewResult` / artifact / fallback-input synthesis | `metaReviewRun` or `fallbackRecommendation`; `fallbackSummary`; `nowIso` | artifact warnings | breaking internal helper contract | P1 | required-now |
| Converged routed metadata | `metaReviewRun` or cached state fallback | `metaReviewRun`, artifact metadata, or route/default fallback | route; explicit `metaReviewRun` if present | warning reason codes | breaking internal telemetry contract | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Live meta-review state | no new fields; existing cached fields may remain inert until later removal | uj receipt, replacement snapshot vagy retained bridge mezok | physical cleanup kulon taskban jon | P1 | required-now |
| Submit authority | reviewer-parity stale guard bevezetese | cached snapshot-window dedupe tovabbelesztese | explicit live identity kell | P1 | required-now |
| Gate/runtime synthesis | explicit input contract | cached state-hydration recommendation/status/summary/report miatt | ez a kesobbi field-removal elofeltetele | P1 | required-now |
| Converged telemetry | route-/runResult-/artifact-alapu fallback | state `last_autonomous_*` fallback | nincs silent state leak | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Submit stale guard mismatch (`handoff_id`, role, round vagy fingerprint) | active execution context + command input | throw | fail closed; nincs retry-as-success inference | `META_REVIEW_STATE_INVALID` vagy megl evo round/state mismatch | warn | P1 | required-now |
| State conflict utan a latest state mar nem hordoz ervenyes active meta-review authorityt | state reread | throw | no retry-as-success inference | `META_REVIEW_STATE_INVALID` vagy existing round/state mismatch | warn | P1 | required-now |
| Gate fallbacknak nincs explicit runResultje | current-run gate helper input | fallback | route/default `inconclusive` + explicit fallback summary; nincs cached state read | N/A | info | P1 | required-now |
| Converged metadata buildernek nincs explicit runResultje | gate route or artifact metadata only | fallback | route-derived or default `inconclusive`; nincs cached state read | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | active `meta_review.execution_context` mint canonical current authority | P1 | required-now |
| must-use | `expectedHandoffId` / `expectedRole` / `expectedRound` / `expectedStateFingerprint` when canonical actor context is available | P1 | required-now |
| must-use | explicit `MetaReviewResult` / canonical artifact / fallback helper input a gate synthesishez | P1 | required-now |
| must-not-use | cached `last_autonomous_report_ref` + `last_autonomous_updated_at` submit guard | P1 | required-now |
| must-not-use | `state.meta_review.last_autonomous_*` telemetry fallback | P1 | required-now |
| must-not-use | uj live receipt vagy replacement snapshot mezobevezetes | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Submit with stale authority fails closed | active meta-review execution context es command expected handoff/fingerprintje mar stale | canonical submit erkezik | `META_REVIEW_STATE_INVALID` vagy stale-state hiba jon, cached snapshot-inference nelkul | P1 | required-now | automated test |
| T2 | Same-round resubmit no longer depends on cached snapshot window | egy sikeres canonical submit utan a state fingerprint megvaltozott | ugyanaz a stale command meg egyszer fut | a submit stale-state alapon bukik meg, nem `last_autonomous_*` ablakbol kovetkeztet | P1 | required-now | automated test |
| T3 | Gate fallback no longer hydrates from cached snapshot | helper explicit fallback inputtal fut, cached fields lehetnek barmik vagy hianyozhatnak | human-gate vagy recovered result synthesis fut | a payload explicit inputbol epul, nem state snapshotbol | P1 | required-now | automated test |
| T4 | RUNNING validator no longer needs cached last-run snapshot | RUNNING meta-review recovery/allapot-visszaolvasasi fixture | state validation fut | csak az aktiv live authority szerint megy at vagy bukik meg | P1 | required-now | automated test |
| T5 | Converged telemetry no longer reads cached state fallback | gate resultben nincs cached state recommendation/status | finalization event metadata epul | recommendation/status explicit runResultbol, artifact metadata-bol vagy route/default fallbackbol jon | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a reviewer-parity stale guard kesobb mas actorokkal is teljesen kozos alakot kap, kulon shared helper extract nyithato.

## Assumptions

1. A meta-review canonical emit path tud reviewer-parity stale guardot ervenyesiteni uj state field nelkul.

## Open Questions

1. Nincs blocker open question.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | kozos stale-guard helper extract a reviewer es meta-review kozt | L2 | P2 | later-hardening | task authoring | csak a parity cutover utan erdemes megnyitni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, es a runtime mar nem hasznalja a cached `last_autonomous_*` snapshotot duplicate-submit, gate fallback, state validation vagy converged telemetry source-kent.
