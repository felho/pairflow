---
artifact_type: task
artifact_id: task_pairflow_review_loop_ws_d_pilot_phase1_v1
title: "Review Loop WS-D Pilot and Metrics (Phase 1)"
status: draft
phase: phase1
target_files:
  - docs/review-loop-ws-d-pilot-report-2026-03.md
  - plans/tasks/doc-only-issues/review-loop-complexity-memo-2026-03-04.md
  - docs/llm-doc-workflow-v1.md
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/review-loop-complexity-memo-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/llm-doc-workflow-v1.md
  - docs/reviewer-severity-ontology.md
  - plans/tasks/pairflow-doc-contract-gates-phase1.md
owners:
  - "felho"
---

# Task: Review Loop WS-D Pilot and Metrics (Phase 1)

## L0 - Policy

### Goal

Futtassunk 1 hetes WS-D pilotot a mar bevezetett doc workflow + gate policy mellett, es keszitsunk meresi riportot/go-no-go javaslatot a Phase 2 `required-docs` enforce donteshez.

### In Scope

1. Pontosan 3 pilot bubble futtatasa:
   - 1 bugfix,
   - 1 small feature,
   - 1 docs-only hardening task.
2. Baseline vs pilot metrikak osszegyujtese es osszehasonlitasa.
3. Egy osszefoglalo pilot report dokumentum keszitese evidence hivatkozasokkal.
4. A master memo kovetkezo lepes es status frissitese pilot eredmeny alapjan.
5. `go|hold` javaslat Phase 2 `required-docs` enforce-ra.

### Out of Scope

1. Runtime gate logika/code tovabbi modositasai.
2. Azonnali policy hard-enforce bekapcsolasa.
3. Architecture v2 vagy fogalmi ujratervezes.
4. Uj severity ontology definialasa.

### Safety Defaults

1. Ha pilot evidence hianyos, alapertelmezett dontes: `hold`.
2. Ha metric szamitas nem reprodukalhato, az eredmeny csak informal, policy-dontest nem triggerel.
3. Fennmarad az aktualis Phase 1 advisory policy, enforce valtas kulon taskban tortenik.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: dokumentacios/governance boundary (reporting + policy decision trail), runtime contract boundary nem valtozik ebben a taskban.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `docs/review-loop-ws-d-pilot-report-2026-03.md` | pilot report authoring | `buildPilotReport(evidence_set) -> report_markdown` | uj report dokumentum | tartalmazza a 3 pilot bubble evidence-et, baseline/pilot tablazatot, es `go|hold` dontest | P1 | required-now | T1 |
| CS2 | `plans/tasks/doc-only-issues/review-loop-complexity-memo-2026-03-04.md` | program status update | `applyPilotOutcome(report) -> updated_program_state` | status + kovetkezo lepesek szekcio | a memo aktualis allapota pilot eredmenyhez igazodik, WS-D allapot explicit | P1 | required-now | T2 |
| CS3 | `docs/llm-doc-workflow-v1.md` | policy wording adjustment (if needed) | `applyPhase2Decision(decision) -> workflow_delta` | Adoption Strategy / scenario recipe blokk | csak akkor frissul, ha pilot alapjan konkret policy tuning szukseges | P2 | later-hardening | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Pilot evidence input | ad-hoc, szetszort | standard evidence set | `bubble_id`, `work_type`, `round_count`, `open_blocker_count_end`, `required_now_after_round2`, `evidence_refs` | `notes`, `warnings` | additive | P1 | required-now |
| Pilot report output | nincs standard forma | egyseges report schema | `summary`, `pilot_set`, `metrics_table`, `decision`, `decision_rationale`, `risks`, `next_actions` | `appendix` | non-breaking new doc | P1 | required-now |
| Decision output | implicit | explicit `go|hold` | `decision`, `criteria_checklist`, `owner`, `date` | `follow_up_items` | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Docs and task artifacts | report/memo/workflow doc update | runtime code valtoztatas `src/**` alatt | docs-only execution | P1 | required-now |
| Pilot evidence references | bubble status/log refs beemelese | evidence nelkuli allitas | minden erdemi allitasnak forrast kell kapnia | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| hianyzik legalabb 1 pilot bubble evidence | bubble artifacts/status output | fallback | report `PARTIAL`, dontes `hold`, potlasi lista | PILOT_EVIDENCE_MISSING | warn | P1 | required-now |
| metric nem reprodukalhato | local calculation/checklist | fallback | metric `N/A`, dontesnel konservativ ertekeles | PILOT_METRIC_UNCERTAIN | warn | P1 | required-now |
| kovetkeztetes tul gyenge evidence-re epulne | report synthesis | fallback | explicit `insufficient evidence` jeloles, enforce dontes tiltva | PILOT_DECISION_EVIDENCE_GAP | warn | P1 | required-now |
| dependency failure | N/A (docs-only flow) | fallback | `N/A` | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `pairflow bubble status --json` evidence, mar meglevo pilot bubble transcript/status artifactok | P2 | required-now |
| must-use | `docs/llm-doc-workflow-v1.md` es `review-loop-complexity-memo-2026-03-04.md` canonical policy sourcekent | P2 | required-now |
| must-not-use | runtime gate policy/code modositas a pilot report taskon belul | P2 | required-now |
| must-not-use | evidence nelkuli "go" javaslat | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Pilot report complete | 3 pilot bubble evidence teljes | report generalas | report tartalmazza a kotelezo mezoket + baseline/pilot tablazatot + `go|hold` dontest | P1 | required-now | document review checklist |
| T2 | Memo sync | kesz pilot report | memo frissites | WS-D status es kovetkezo lepesek konzisztensen frissulnek | P1 | required-now | diff review |
| T3 | Workflow doc conservative update | pilot dontes `hold` | workflow update decision | nincs korai enforce claim; policy nyelvezet konzervativ marad | P2 | later-hardening | doc diff |
| T4 | Missing evidence fallback | 1 pilot bubble evidence hianyzik | report synthesis | `PARTIAL` + `hold` + potlasi lista keletkezik | P1 | required-now | report section check |
| T5 | Evidence quality gate | legalabb egy kovetkezteteshez nincs konkret evidence ref | quality check | kovetkeztetes "insufficient evidence" jelolest kap; enforce dontes nem adható | P1 | required-now | checklist review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Automatizalt metrics extract script, ha a manualis riport kesobb tul koltseges.
2. [later-hardening] Standard report template kivonat beemelese a skill references ala.
3. [later-hardening] Pilot report naming konvencio (`YYYY-MM`) formalizalasa.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Pilot metric extraction reszleges automatizalasa | L2 | P2 | later-hardening | WS-D post-pilot | open follow-up task only if manual overhead magas |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Blocker definicio: `P0/P1 + required-now + L1`.
3. `P0/P1` finding evidence nelkul downgradolando policy szerint.
4. Max 2 L1 hardening kor.
5. 2. kor utan uj `required-now` csak evidence-backed `P0/P1`.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha minden `P0/P1 + required-now` pont zarhato:
1. pilot report schema teljes,
2. pilot evidence hivatkozasok audit-keszek,
3. memo statusz szinkronban van a pilot eredmennyel,
4. Phase 2 dontes `go|hold` explicit es indokolt.
