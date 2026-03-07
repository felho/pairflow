---
artifact_type: task
artifact_id: task_doc_only_operational_decision_matrix_rollout_phase1_v2
title: "Docs-Only Operational Decision Matrix and Rollout (Phase 1)"
status: draft
phase: phase1
target_files:
  - plans/tasks/doc-only-issues/doc-only-operational-decision-matrix-and-rollout-phase1.md
  - docs/llm-doc-workflow-v1.md
  - plans/tasks/doc-only-issues/doc-only-priority-and-rollout-plan-2026-03-04.md
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/doc-only-priority-and-rollout-plan-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/tasks/doc-only-issues/doc-only-temporary-disable-runtime-checks-phase1.md
  - plans/tasks/doc-only-issues/doc-only-summary-verifier-consistency-gate-phase1.md
  - plans/tasks/doc-only-issues/doc-only-evidence-source-whitelist-phase1.md
owners:
  - "felho"
---

# Task: Docs-Only Operational Decision Matrix and Rollout (Phase 1)

## L0 - Policy

### Goal

Definialjunk rovid, vegrehajthato es audit-kesz operational decision matrixot a docs-only validacios policyhoz, plusz egy Phase 1 rollout/rollback futasi rendet.

### In Scope

1. Determinisztikus decision matrix docs-only es code bubble utakra.
2. Docs-only summary standard formulak es claim szabalyok rogzitese.
3. Rollout lepessor preconditionnel, exit criteriaval es rollback triggerrel.
4. Minimum 3 operativ metric definialasa a koveteshez.
5. Priority-plan dokumentum frissitese P1/2 allapotkoveteshez.

### Out of Scope

1. Uj runtime verifier implementacio.
2. Claim parser vagy evidence pipeline ujratervezese.
3. UI policy designer vagy workflow engine valtoztatas.
4. Nem-docs-only policy szigoritasa/lazitasa.

### Safety Defaults

1. Ha a matrix sorai ellentmondanak mas docs-only dokumentumnak, ez a task dokumentum legyen a P1/2 canonical source.
2. Ha rollout lepes evidence nelkul allit sikeres allapotot, a statusz automatikusan `hold`.
3. Code bubble policy alapertelmezesen valtozatlan marad.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: dokumentacios es operacios policy boundary.
3. Nem erintett boundary: DB/API/event/auth/config runtime szerzodes.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/tasks/doc-only-issues/doc-only-operational-decision-matrix-and-rollout-phase1.md` | matrix + rollout spec authoring | `defineDecisionMatrixAndRollout(context) -> markdown_contract` | teljes dokumentum | tartalmazza a 3-agas matrixot, rollout/rollback lepessorat es metric keszletet | P1 | required-now | T1, T3, T4 |
| CS2 | `docs/llm-doc-workflow-v1.md` | docs-only summary policy wording sync | `syncDocsOnlySummaryPolicy(matrix) -> workflow_doc_delta` | docs-only workflow/guidance blokk | summary formula es claim policy a matrixszal konzisztens | P1 | required-now | T2 |
| CS3 | `plans/tasks/doc-only-issues/doc-only-priority-and-rollout-plan-2026-03-04.md` | P1/2 state + sequence sync | `syncRolloutProgress(matrix_rollout) -> updated_plan_status` | Step 4/P1 szekciok | statusz, sorrend es ownership nyomkovetes frissul | P2 | later-hardening | T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Decision matrix row | rovid prose lista | auditalhato matrix schema | `scenario`, `runtime_check_requirement`, `claim_rule`, `evidence_rule`, `summary_rule` | `notes` | additive | P1 | required-now |
| Rollout step contract | linearis lepeslista | gate-elt rollout schema | `step_id`, `preconditions`, `action`, `exit_criteria`, `rollback_trigger` | `owner`, `eta` | additive | P1 | required-now |
| Metrics contract | 3 pont jellegu lista | merheto metric registry | `metric_id`, `definition`, `source`, `cadence`, `direction` | `target_range` | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Docs/task artifacts | matrix/rollout dokumentacio frissites | `src/**` runtime kodmodositas | docs-only feladat, nincs implementation scope | P1 | required-now |
| Team operating routine | summary wording standardizalas | bizonyitatlan runtime claim kommunikacio | kommunikacios konzisztencia gate-elvekkel | P1 | required-now |

Constraint: mivel nincs engedelyezett DB/Event/FS/Network side effect, a task output tisztan dokumentacios marad.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| matrix sor hianyos vagy nem determinisztikus | policy docs | fallback | hianyzo sor jelolese `TODO_BLOCKER`, rollout `hold` | MATRIX_INCOMPLETE | warn | P1 | required-now |
| summary sablon nem konzisztens a gate policyval | workflow docs | fallback | matrix szabaly az elsoseges, summary text korrigaland | SUMMARY_POLICY_MISMATCH | warn | P1 | required-now |
| metric adatforras atmenetileg nem elerheto | bubble status/artifacts | fallback | metric `N/A`, rollout folytathato de incident-kovetes flaggel | METRIC_SOURCE_UNAVAILABLE | info | P2 | required-now |
| dependency failure | N/A (docs-only flow) | fallback | `N/A` | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `doc-only-temporary-disable-runtime-checks-phase1.md` mint docs-only runtime requirement baseline | P2 | required-now |
| must-use | `doc-only-summary-verifier-consistency-gate-phase1.md` mint claim-vs-verifier consistency baseline | P2 | required-now |
| must-use | `doc-only-evidence-source-whitelist-phase1.md` mint evidence trust baseline | P2 | required-now |
| must-not-use | uj runtime execute policy code szabalyozas ebben a taskban | P1 | required-now |
| must-not-use | code bubble policy valtoztatas a docs-only rollout taskban | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Decision matrix completeness | P1/2 task draft | matrix review | matrix legalabb 3 determinisztikus scenariot tartalmaz (docs-only claim-free, docs-only claimes, code bubble) | P1 | required-now | document checklist |
| T2 | Summary rule consistency | frissitett workflow docs | policy cross-check | docs-only summary formula konzisztens a matrix claim szabalyokkal | P1 | required-now | doc diff |
| T3 | Rollout + rollback determinism | rollout szekcio | control review | minden rollout stephez van precondition + exit + rollback trigger | P1 | required-now | section review |
| T4 | Metric baseline validity | metric szekcio | metric audit | minimum 3 metric definialt source + cadence mezovel | P1 | required-now | checklist |
| T5 | Non-doc policy non-regression | code bubble policy refs | impact review | dokumentum explicit kimondja, hogy code bubble policy valtozatlan | P2 | later-hardening | doc diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Keszulhet kulon, rovid operational cheat-sheet a matrixbol (`one-page playbook`).
2. [later-hardening] A metrikakhoz kesobb automatikus export script kotheto bubble status artifactokra.

## Assumptions

1. P0/1, P0/2 es P1/1 policy iranyok mar elerhetok referenciakent a rollout kommunikaciohoz.
2. Ez a task docs-only policy konkretizacio, nem runtime implementacios feladat.

## Open Questions

No open non-blocking questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Operational matrix one-page kivonat | L2 | P2 | later-hardening | post-rollout feedback | open follow-up docs task, ha onboarding ido nem csokken |
| H2 | Metrics auto-collect pipeline | L2 | P2 | later-hardening | metrics review | csak akkor nyitando, ha manualis kovetes >2 hetig magas overhead |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Blocker csak `P0/P1 + required-now + L1`.
3. `P2/P3` vagy `L2` finding default `later-hardening`.
4. Max 2 L1 hardening kor.
5. 2. kor utan uj `required-now` csak evidence-backed `P0/P1` lehet.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha minden `P0/P1 + required-now` teljesul:
1. matrix sorok determinisztikusak es audit-keszek,
2. rollout + rollback lepesek explicit gate-ekkel definialtak,
3. legalabb 3 metric source/cadence mezovel rogzitett,
4. docs-only vs code bubble policy elvalasztas egyertelmu es ellentmondasmentes.
