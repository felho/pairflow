---
artifact_type: task
artifact_id: task_workflow_quality_gates_phase1c_meta_review_approval_parity_v1
title: "Workflow Quality Gates Phase 1C - Meta-Review and Approval Parity"
status: implementable
phase: phase1c
target_files:
  - "src/core/bubble/metaReview.ts"
  - "src/core/bubble/approvalRequestEnvelope.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts"
  - "tests/core/bubble/metaReview.test.ts"
  - "tests/core/bubble/approvalRequestEnvelope.test.ts"
  - "tests/cli/bubbleMetaReviewCommand.test.ts"
  - "tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Workflow Quality Gates Phase 1C - Meta-Review and Approval Parity

## L0 - Policy

### Goal

Egysagesiteni a latest same-round snapshot truth source-ot a meta-review submit/run es az approval request build path kozott, hogy clean approve claim csak akkor mehessen at, ha ugyanaz a latest same-round snapshot tenylegesen clean.

### In Scope

1. Ugyanannak a latest same-round snapshotnak a hasznalata a meta-review submit/refresh es approval request build pathokon.
2. Metadata-fallback szemantika egysagesitese akkor is, ha a latest same-round snapshot `findings` listaja ures, explicit `[]`, vagy teljesen hianyzik.
3. Approval clean claim blockolasa, ha a latest same-round snapshot blocking vagy advisory open findingot reportol.
4. Advisory finding fallback csak a megfelelo latest same-round snapshotbol tortenjen; regebbi vagy cross-round snapshot ne adhasson fallback authority-t.
5. Paritas tesztek a metadata-only open findings, latest-snapshot wins, empty-list-vs-metadata, es clean/open mismatch esetekre.

### Out of Scope

1. PASS validation gate core.
2. Restart/reconcile recovery marker logika.
3. Reviewer directive vagy PASS artifact semantics.

### Safety Defaults

1. Approve pathon a clean claim fail-closed legyen, ha a latest same-round snapshot blocking vagy advisory open findingra utal.
2. Ha a metadata es a `findings` lista kozt bizonytalansag van, ne legyen silent clean normalization a latest same-round snapshot ellen.
3. A latest same-round snapshot legyen az authority; regebbi same-round vagy barmely cross-round snapshot nem irhatja felul.
4. A task nem vezet be uj clean defaultot arra az esetre, amikor same-round snapshot egyaltalan nincs; ez a boundary a jelenlegi viselkedest orzi meg.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Belso human-gate/meta-review consistency hardening, publikus API vagy config modositas nelkul.

### Terminology Lock

1. `same-round snapshot` = a bubble aktualis roundjahoz tartozo persisted reviewer snapshot envelope.
2. `latest same-round snapshot` = az adott roundban legutoljara persisted same-round snapshot; clean/open donteshez ez az egyetlen authority.
3. `metadata-only open findings` = a parity metadata open totalja `> 0`, mikozben a strukturalt `findings` lista ures, explicit `[]`, vagy hianyzik.
4. `approval path` = az approval request envelope build/refresh ut, nem az altalanos transcript render.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReview.ts` | submit path parity gate | `submitMetaReviewResult(input: MetaReviewSubmitInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewSubmitResult>` | canonical report_json -> gate routing boundary | Approve submit ne mehessen at, ha a latest same-round snapshot nem clean, akkor sem, ha a submit payload sajat `findings` listaja ures vagy hianyzik | P1 | required-now | Existing review finding pattern |
| CS2 | `src/core/bubble/metaReview.ts` | run/refresh path parity gate | `runMetaReview(input: MetaReviewRunInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewRunResult>` | approval refresh path `appendHumanApprovalRequestEnvelope(...)` elott | A refreshelt approval envelope ugyanazt a latest same-round snapshot authority-t kovesse, mint a submit path | P1 | required-now | Current refresh path can drift from submit path |
| CS3 | `src/core/bubble/approvalRequestEnvelope.ts` | approval summary + advisory guard | `appendHumanApprovalRequestEnvelope(input: {...}) -> Promise<AppendProtocolEnvelopeResult>` | approval request build | Clean approve summary ne maradhasson ervenyben, ha a bound latest same-round snapshot open findingot jelez metadata-only vagy advisory fallback formaban | P1 | required-now | Jelenleg a ket path el tud csuszni |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts` | shared metadata extraction helpers | `resolveFindingsOpenSplitFromReportJson(reportJson) -> { findings_blocking_open_total: number | null; findings_advisory_open_total: number | null; }` and `resolveAdvisoryFindingsFromReportJson(reportJson) -> MetaReviewGateAdvisoryFinding[] | undefined` | helper layer | Metadata-only/open advisory snapshotok kompatibilis kezelese ugy, hogy `undefined`/`[]` ne irhassa felul az open metadata authority-t | P2 | required-now | Helper-level konzisztencia |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Same-round snapshot resolution | meta-review es approval kulon logikaval olvas | kozositett vagy szemantikailag azonos feloldas ugyanarra a latest persisted same-round snapshotra | `round`, `envelopeId` vagy ennek megfelelo ordering proof, `openFindingsTotal` | `advisoryFindings` | non-breaking internal | P1 | required-now |
| Clean approve claim guard | reszben findings-lista kozpontu | metadata-aware latest same-round snapshot guard | `summary`, `recommendation`, snapshot open total | `advisoryFindings` fallback | non-breaking internal | P1 | required-now |
| Advisory fallback semantics | `findings` omitted/empty es metadata-open eset implicit | `undefined`, explicit `[]`, es hianyzo advisory payload nem normalizalhat clean-re, ha a bound latest same-round snapshot metadata open | snapshot open totals | `advisoryFindings` list payload | non-breaking internal | P1 | required-now |
| Missing same-round snapshot boundary | implicit | jelenlegi viselkedes megorzese, uj cross-round fallback vagy synthetic clean default nelkul | n/a | n/a | non-breaking internal | P2 | required-now |

### 2a) Findings Input State Contract

| State ID | Input Shape | Meaning | Required Behavior | Forbidden Behavior |
|---|---|---|---|---|
| FS1 | `findings` property missing (`undefined`) | a routing input nem hordoz advisory listat | ha a latest same-round snapshot metadata open, a clean claim nem engedheto at; advisory fallback a latest same-round snapshotbol olvashato | missing list clean evidence-kent kezelese |
| FS2 | `findings: []` | explicit ures lista | explicit empty list nem irhatja felul a latest same-round snapshot metadata-open authority-t | explicit empty list alapjan clean-re normalizalni metadata-open snapshot mellett |
| FS3 | `findings: [ ... ]` | explicit advisory payload erkezett | a lista csak akkor hasznalhato clean/open routinghoz, ha nem mond ellent a latest same-round snapshot metadatajanak | stale vagy ellentmondo lista authoritykent kezelese a snapshot metadata felett |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript read | latest same-round snapshot read | cross-round vagy stale snapshot preferalasa ujabb same-round snapshot felett | Authority a legfrissebb same-round snapshot, transcript-order alapon | P1 | required-now |
| Approval/meta-review routing | fail-closed block or proceed ugyanazzal a truth-source logikaval | clean approve atengedese metadata-only open findings mellett | Ez a task fo safety policyja | P1 | required-now |
| Advisory fallback | latest same-round advisory payload reuse, ha a routing input nem hordozza | regebbi same-round snapshot vagy explicit empty list clean overridekent kezelese | `undefined` es `[]` kozt ne vesszen el az open signal | P1 | required-now |
| Missing snapshot handling | existing caller behavior megtartasa | uj cross-round scavenging vagy synthetic clean claim | Ez scope-boundary, nem uj feature | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| latest same-round snapshot open findingset reportol | transcript snapshot | throw | clean approve block | `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT` vagy meglevo fail-closed parity code | error | P1 | required-now |
| metadata-only open findings (`findings` missing/empty/[] + metadata open) | transcript snapshot | throw | clean approve block | same as above | error | P1 | required-now |
| explicit empty advisory list conflicts with metadata-open snapshot | transcript snapshot | throw | clean approve block vagy summary normalization; fail-open nem megengedett | same parity conflict family | error | P1 | required-now |
| older snapshot open, latest clean | transcript snapshot | result | latest clean snapshot wins | none | info | P1 | required-now |
| advisory findings omitted from routing input | transcript snapshot | fallback | latest same-round snapshot advisory findings reuse; ha advisory list nem nyerheto ki, open metadata attol meg marad authority | none | info | P2 | required-now |
| same-round snapshot hianyzik | transcript snapshot | result | jelenlegi behavior megorzese, uj cross-round fallback nelkul | none | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | latest same-round transcript scan, current parity metadata helpers, azonos snapshot-resolution semantics a submit/refresh/approval pathokon | P1 | required-now |
| must-not-use | approval-path es meta-review-path kulon open-count szemantika | P1 | required-now |
| must-not-use | cross-round fallback clean authoritykent, vagy explicit empty `findings` payload metadata-open total felulirasara | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | metadata-only open findings on approval path | latest same-round snapshot `findings=[]`, metadata open total > 0 | approval request build | clean approve blocked | P1 | required-now | review identified fail-open risk |
| T2 | metadata-only open findings on meta-review submit path | latest same-round snapshot metadata open total > 0 and report payload `findings` missing (`undefined`) or explicit `[]` | submit approve report | submit blocked | P1 | required-now | path parity |
| T3 | latest snapshot clean, older open | ket same-round snapshot, az idoben kesobbi clean | approval/meta-review | latest clean wins | P1 | required-now | stale snapshot regression |
| T4 | omitted advisory list in routing input | approval route input `findings` missing (`undefined`), latest same-round snapshot advisory metadata open | approval request build | ha az advisory findings lista visszanyerheto a latest same-round snapshotbol, azt kotelezo reuse-olni; ha a lista nem nyerheto vissza, a clean normalization fail-closed blokkolva marad | P2 | required-now | summary parity |
| T5 | contradictory clean summary vs latest same-round snapshot | clean approve claim, latest same-round snapshot open | approval/meta-review | fail-closed parity error | P1 | required-now | authority consistency |
| T6 | explicit empty advisory list with metadata-open snapshot | approval/meta-review path explicit `findings=[]`, metadata advisory/blocking total > 0 | guard evaluation | empty list nem irja felul az open snapshot authority-t | P1 | required-now | empty-list parity |
| T7 | no same-round snapshot | active roundban nincs same-round snapshot | approval/meta-review parity evaluation | nincs uj cross-round fallback; a jelenlegi missing-snapshot behavior marad | P2 | required-now | scope-boundary regression |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kesoibb lehet egy kozos helper a snapshot resolutionre, ha a ket path kodszinten is ugyanazt a primitive-et hasznalhatja.

## Assumptions

1. A same-round snapshot metadataja source-of-truth lehet akkor is, ha a `findings` lista hianyzik (`undefined`), explicit `[]`, vagy nem teljes.
2. A latest same-round snapshot authority-ja magasabb, mint barmely korabbi same-round advisory allapot.
3. A task csak azokra az esetekre szigorit parity contractot, ahol same-round snapshot tenylegesen letezik.

## Open Questions

1. No blocking open questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Snapshot-resolution helper deduplikacio | L2 | P2 | later-hardening | code review 2026-03-28 | Kulon refactor, ha a parity semantics mar stabil |

## Review Control

1. A task nem enged be PASS gate vagy recovery-marker scope creep-et.
2. Uj `required-now` csak same-round snapshot truth source inkonzisztenciabol johet.
3. A task nem ir elo uj publikus API-t, configot, vagy cross-round fallback policy-t.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
