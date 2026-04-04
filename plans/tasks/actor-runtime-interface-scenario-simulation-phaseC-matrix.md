---
artifact_type: scenario_matrix
artifact_id: matrix_actor_runtime_interface_scenario_simulation_phaseC_v1
title: "Actor Runtime Interface Scenario Simulation (Phase C Matrix)"
status: draft
phase: phaseC
source_task_ref: plans/tasks/actor-runtime-interface-scenario-simulation-phaseC.md
source_contract_ref: plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md
source_inventory_ref: plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
normative_refs:
  - plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
  - plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md
  - plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md
informational_refs:
  - docs/pairflow-initial-design.md
  - docs/v2/pairflow-v2-architecture-plan-joint.md
baseline_note: "Phase C scenario matrix prepared on 2026-04-04 from the checked-in Phase B capability contract draft plus the checked-in Phase A behavior inventory. This is a docs-only simulation and gap-analysis artifact, not an implementation or migration-plan artifact."
coverage_note: "Representative, decision-focused scenario coverage. The matrix covers the required core actor result paths, human-input path, stale/conflicting authority, duplicate delivery and emit concerns, restart/recovery, and retained tmux observability notes. It does not claim exhaustive simulation of every downstream helper or topology-specific runtime branch."
---

# Actor Runtime Interface Scenario Simulation (Phase C Matrix)

## Executive Summary

1. A Phase B contract a fo actor use case-ek tobbseget lefedi egyetlen role-neutral boundaryval: explicit execution context, durable handoff, protocol snapshot, `result` vagy `human_input_request`, explicit delivery ack, explicit launch ack.
2. A reviewer gate-szeru szabalyok nem igenyelnek uj actor primitive-t. Ezek a szcenariokban policy gate contextkent jelennek meg, mikozben az actor output tovabbra is `result`.
3. A retained tmux, restart es operator-touchpoint teruletek nem teszik torotte a Phase B modellt, de retained adapter vagy executor-owned note-kent maradnak jelen.
4. A legerosebb bounded nyitott pont a duplicate delivery es a duplicate retry pontos idempotency-shape-je. A minimum typed ack contract eleg a boundary leirasahoz, de a suppression reszletszabalyai nem teljesen lefagyasztottak.

## Row Schema

Minden scenario row a kovetkezo mezo-keszlettel dolgozik:

| Field | Meaning |
|---|---|
| `scenario_id` | stabil scenario-azonosito |
| `scenario_kind` | core use case vagy edge case osztaly |
| `preconditions` | minimum szukseges elofeltetel |
| `execution_context` | explicit authority-shape |
| `work_payload` | handoff + protocol snapshot shape |
| `required_capabilities` | szukseges Phase B core capability-k |
| `expected_output_family` | `result` vagy `human_input_request` vagy `none` |
| `delivery_ack` | befogadasi ack elvaras |
| `launch_ack` | actor-start ack elvaras |
| `provenance_requirement` | explicit execution-kotes / ownership / role-korlatozas |
| `idempotency_requirement` | duplicate/retry/stale kovetelmeny |
| `coverage_verdict` | `covered`, `covered_with_extension`, `covered_with_adapter`, `gap`, `undecided` |
| `notes` | extension / adapter / open question / policy gate context |
| `source_refs` | nem ures source-hivatkozaslista |

## Scenario Matrix

| scenario_id | scenario_kind | preconditions | execution_context | work_payload | required_capabilities | expected_output_family | delivery_ack | launch_ack | provenance_requirement | idempotency_requirement | coverage_verdict | notes | source_refs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SC1_IMPLEMENTER_RESULT` | core-use-case | aktiv implementer step; durable handoff letezik; explicit delivery megtortent | `repo`, `bubble_id`, `execution_id`, `handoff_id`, `role=implementer`, `actor_id`, current emit capability | implementer task handoff + relevans protocol snapshot | `receiveExecutionContext`, `readHandoff`, `readRelevantProtocolState`, `emitResult` | `result` | `accepted` | `running` | csak current implementer execution emitelhet; explicit role es handoff kotottseg | stale vagy mismatched emit fail-closed; duplicate emit ne route-oljon mas current stephez | `covered` | A Phase B `result` family eleg az implementer handoff-jellegu outputhoz; nincs szukseg role-specifikus API-ra. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L146`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L168`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L265`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L97`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L131` |
| `SC2_REVIEWER_FIX_REQUEST_RESULT` | core-use-case | aktiv reviewer step; blocker findings vagy fix-request tartalom; explicit review round context | `repo`, `bubble_id`, `execution_id`, `handoff_id`, `role=reviewer`, `actor_id` | reviewer handoff + protocol snapshot + reviewer policy gate context | `receiveExecutionContext`, `readHandoff`, `readRelevantProtocolState`, `emitResult` | `result` | `accepted` | `running` | csak current reviewer execution adhat reviewer `result` outputot | mismatched reviewer/implementer authority fail-closed; retry ugyanazon executionnel ugyanarra a kimenetre maradjon bounded no-op vagy explicit reject | `covered` | A fix-request nem kulon output family. A gate-szeru “van-e blocker / nyitott P1” logika policy context, nem uj actor primitive. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L269`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L299`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L360`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L98`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L142` |
| `SC3_REVIEWER_CONVERGENCE_RESULT` | core-use-case | aktiv reviewer step; convergence policy feltetelek teljesulnek; nincs tiltott blocker allapot | `repo`, `bubble_id`, `execution_id`, `handoff_id`, `role=reviewer`, `actor_id` | reviewer handoff + protocol snapshot + convergence policy gate context | `receiveExecutionContext`, `readHandoff`, `readRelevantProtocolState`, `emitResult` | `result` | `accepted` | `running` | csak current reviewer execution es reviewer rolehoz kotott output fogadhato el | stale authority es role mismatch reject; same execution convergence retry reject/no-op bounded policy kerdes lehet | `covered` | A reviewer-only policy maradhat role/policy resz, mikozben maga az output tovabbra is `result`. A “no open P1” gate protocol-policy context marad. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L269`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L303`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L360`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L99`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L133`; `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L268` |
| `SC4_META_REVIEW_RESULT` | core-use-case | aktiv meta-reviewer step; explicit meta-review authority nyitva; durable meta-review work item letezik | `repo`, `bubble_id`, `execution_id`, `handoff_id`, `role=meta_reviewer`, `actor_id` | meta-review handoff + protocol snapshot + optional policy refs | `receiveExecutionContext`, `readHandoff`, `readRelevantProtocolState`, `emitResult` | `result` | `accepted` | `running` | csak current meta-reviewer execution adhat meta-review resultot; operator surface nem helyettesiti ezt | duplicate submit suppressziohoz executor/kernel oldali bounded policy kell; stale authority reject | `covered_with_adapter` | A Phase B actor boundary eleg a role-level output leirasahoz, de a current-state operator `bubble meta-review` subtree retained adapter-szalas marad a migrationig. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L274`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L360`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L379`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L101`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L114`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L134` |
| `SC5_HUMAN_INPUT_REQUEST` | core-use-case | actor blokkolo hiannyal vagy emberi dontesigenynyel talalkozik | `repo`, `bubble_id`, `execution_id`, `handoff_id`, active `role`, `actor_id` | handoff + relevans protocol snapshot + blocking reason | `receiveExecutionContext`, `readHandoff`, `readRelevantProtocolState`, `requestHumanInput` | `human_input_request` | `accepted` | `running` | current executionhoz kotott human kerdes; nem operator manual route-olas | stale authority reject; duplicate kerdes suppression bounded policy marad, de output-family szinten tiszta | `covered` | A Phase B-ben a human kerdes kulon canonical output family; ehhez nem kell kulon retained actor API. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L150`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L269`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L100`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L132` |
| `SC6_STALE_AUTHORITY_EMIT` | edge-case | egy korabbi vagy mar lecserelt execution emitelni probal | stale `execution_id` vagy stale `handoff_id`; current execution mar mas | stale actor a regi handoffra vagy regi role-contextre hivatkozik | `receiveExecutionContext`, `emitResult` vagy `requestHumanInput` | `none` | `rejected` | `none` | a current execution-kotes explicit; stale authority nem olvashato ki passziv runtime jelbol | stale emit fail-closed; nincs automatikus reroute a friss executionre | `covered` | Ez a Phase B explicit authority-contractbol kovetkezik; nem kell kulon stale token expiry a first versionhoz. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L172`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L191`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L215`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L286`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L121`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L125` |
| `SC7_CONFLICTING_CONTEXT` | edge-case | a hivo runtime jelei es az explicit authority ellentmondanak egymasnak | explicit context egy role/handoff parra mutat, de cwd/pane/prompt masra utal | handoff + protocol snapshot csak explicit refs alapjan ervenyes | `receiveExecutionContext`, `readHandoff`, `readRelevantProtocolState`, `emitResult` | `none` vagy explicit reject/no-op | `rejected` | `none` | csak explicit execution context authority ervenyes; passziv runtime jel nem authority-forras | mismatch eseten fail-closed; nincs implicit context inference fallback | `covered` | A Phase B direkt tiltja, hogy a workflow authority passziv runtime jelekbol legyen kiolvasva. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L215`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L257`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L122`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L140`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L141` |
| `SC8_DUPLICATE_DELIVERY` | edge-case | ugyanaz a durable handoff vagy delivery signal ketszer erkezik ugyanarra a stepre | azonos `bubble_id` + `handoff_id`; launch mar lehet fut vagy megtortent | ugyanaz a handoff ref vagy equivalent envelope | `receiveExecutionContext`, `readHandoff` plus executor delivery boundary | `none` a masodik duplicate szignalnal | `accepted` az elsore; masodikra `rejected` vagy explicit suppresszio | `running` vagy `failed_to_start` csak az elso launch-kiserletnel ertelmes | duplicate suppressionnak a handoff- es execution-szintu provenance-re kell tamaszkodnia | a pontos duplicate-suppression shape nincs teljesen lefagyasztva; tovabbi explicit rule kell a retry/no-op/reject alakrol | `gap` | A minimum typed ack contract megvan, de a duplicate delivery suppression reszletszabalyai nincsenek elegge konkretizalva a Phase B-ben. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L313`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L333`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L347`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L354`; `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L242`; `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L274` |
| `SC9_MISMATCHED_OR_DUPLICATE_EMIT` | edge-case | actor olyan emitet probal kuldeni, amely nem a sajat current role/output scope-ja vagy ugyanarra a stepre duplan jon | explicit context adott, de emit output scope mismatched vagy mar egyszer leadott | handoff + current protocol snapshot + emit payload | `receiveExecutionContext`, `readRelevantProtocolState`, `emitResult` | `none` a mismatched emitnel | `rejected` | `none` | role/output scope a current execution capability resze; mismatched output reject | mismatched emit covered; exact duplicate successful emit utokezelese bounded kernel policy marad | `covered` | A current-execution emit capability jo guard a “reviewer implementernek tetteti magat” jellegu hibak ellen; a pure duplicate success replay pontos shape-je tovabbra is bounded policy tema. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L189`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L286`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L299`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L121`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L134` |
| `SC10_RESTART_RECOVERY` | edge-case | runtime/session elakad vagy elveszik; operator restartot vagy resume-t indit | actor execution lehet megszakadt; uj runtime session indulhat | retained state + durable handoff + protocol snapshot recovery path | executor-owned restart/rebind + actor core read path uj executionnel | `result`, `human_input_request` vagy `none`, a recovery utani aktualis step szerint | `accepted` a recovery utani uj deliveryre | `running` vagy `failed_to_start` az uj launchra | uj executionhoz uj authority kell; a regi authority nem viheto at implicit modon | regi emit stale-nak minosul; recovery utan csak uj executionnel mehet tovabb a flow | `covered_with_adapter` | A restart/recovery nem actor primitive, hanem executor/operator path. A Phase B modell ezt elbirja, de retained operator adapter marad. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L121`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L331`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L104`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L144`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L145` |
| `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` | edge-case | tmux pane mutat valamit vagy nem mutat semmit, de az explicit ack shape hianyzik vagy kesik | explicit execution context fennallhat, de pane-visible activity onmagaban nem ervenyes boundary | handoff delivery es runtime observability artifactok szetcsuszhatnak | executor delivery boundary + ack boundary; actor core capability itt onmagaban nem eleg | `none` vagy a kesobbi explicit output family | `accepted` / `rejected` csak explicit runtime ackbol; pane-visible activitybol nem | `running` / `failed_to_start` csak explicit launch ackbol; pane-capturebol nem | a provenance az explicit ack + execution context parosabol jon, nem tmux-bol | nincs implicit “ha latszik a pane-ben akkor fut” szabaly; observability-only retained surface marad | `covered_with_adapter` | A Phase B topology-semleges ack contract tiszta, de a current-state retained tmux operator-nezet tovabbra is adapter/observability reteg. | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L324`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L331`; `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md#L349`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L124`; `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md#L146`; `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L223`; `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L275` |

## Coverage and Gap Synthesis

### Covered

1. Az implementer `result`, reviewer fix-request `result`, reviewer convergence `result`, es a `human_input_request` use case-ek tisztan leirhatok a Phase B core boundaryval.
2. A stale authority es conflicting context esetek fail-closed szemantikaja eleg tisztan kovetkezik az explicit execution-context + current-execution emit capability modellbol.
3. A reviewer gate-jellegu szabalyok Phase C-ben is vedhetoen policy-contextkent maradnak; nem latszik szukseg uj actor primitive-re.

### Covered With Adapter

1. A meta-review result actor-oldali leirasa lefedett, de a current operator `bubble meta-review` subtree retained adapter-path marad a migrationig.
2. A restart/recovery use case a target actor boundary alatt kezelheto, de executor/operator ownershipu retained adapterreteg marad.
3. A tmux observability tovabbra is megmaradhat local/operator nezetnek, de csak adapter- vagy observability-szinten; nem canonical authority vagy ack source.

### Gaps

1. A duplicate delivery pontos suppression-shape-je nincs elegge konkretizalva a Phase B-ben.
2. A matrix alapjan ehhez nem feltetlen kell uj actor primitive, de kell legalabb explicit kernel/executor policy a kovetkezo fazisban arrol, hogy a duplicate delivery:
   - `rejected`,
   - suppresszalt no-op,
   - vagy mas typed outcome legyen-e.

### No New Core Primitive Needed

1. A matrix nem talalt olyan fo use case-et, amelyhez az eddigi lean first-version modell mellett uj actor output family kellene.
2. A matrix nem tamasztja ala, hogy kulon gate primitive, kulon artifact publish primitive vagy eros expiry-alapu lease legyen szukseges a Phase B current scope-jahoz.

## Bounded Open Questions For Phase D

| Question | Why still open | Deferred to |
|---|---|---|
| Duplicate delivery suppression pontos shape-je mi legyen: explicit `rejected`, suppresszalt no-op, vagy mas typed runtime outcome | executor/kernel policy es retry UX tradeoff kerdes | Phase D |
| A duplicate successful emit replay pontos kezelese mennyire legyen kulon typed outcome vs kernel-internal suppresszio | idempotency policy es operator diagnosztika kerdes | Phase D |
| Az operator-visible ack shape mennyire essen egybe a kernel-visible ack shape-pel retained tmux observability mellett | retained adapter UX es rollout tradeoff | Phase D |

## Decision Summary

1. A Phase B contract a fo actor-use-case-ekhez eleg stabil bemenet a migration-spine fazishoz.
2. A retained adapter-pathok valosak, de nem utalnak arra, hogy a core actor boundary rosszul lenne megrajzolva.
3. A Phase D-ben a fokusz a duplicate suppression policy, az adapter cleanup sorrend es az operator-visible runtime shape legyen, nem uj actor primitive-k keresese.
