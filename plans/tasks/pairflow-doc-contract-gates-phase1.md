---
artifact_type: task
artifact_id: task_pairflow_doc_contract_gates_phase1_v1
title: "Pairflow Doc Contract Gates (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/cli/commands/bubble/create.ts
  - src/core/bubble/createBubble.ts
  - src/core/agent/pass.ts
  - src/core/agent/converged.ts
  - src/core/bubble/statusBubble.ts
  - src/cli/commands/bubble/status.ts
  - src/config/bubbleConfig.ts
  - src/config/defaults.ts
  - src/types/bubble.ts
  - src/types/findings.ts
  - tests/**
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/review-loop-complexity-memo-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Pairflow Doc Contract Gates (Phase 1)

## L0 - Policy

### Goal

Vezessunk be Phase 1 szintu, advisory modban futtatott dokumentacios contract gate-eket a Pairflow runtime-ba, hogy az LLM-ready task specifikaciok minosege determinisztikusan ellenorizheto legyen, de kezdetben ne okozzon agressziv flow-blokkolast.

### In Scope

1. Task contract minimum ellenorzes (frontmatter + L0/L1 jelenlet) advisory gate-kent.
2. Review finding schema gate (`priority`, `timing`, `layer`, `evidence`) advisory ellenorzese.
3. Round gate policy: 2. kor utan uj `required-now` csak evidence-backed `P0/P1`.
4. `pairflow bubble status --json` bovites gate allapot mezokkel (`failing_gates`, `spec_lock_state`, `round_gate_state`).
5. Celozott tesztek az uj gate decision branch-ekre.

### Out of Scope

1. Teljes hard-fail enforcement minden bubble-re (`required-all`).
2. UI teljeskoru gate megjelenites es UX redesign.
3. Uj severity ontology vagy finding taxonomy bevezetese.
4. Docs-only es code bubble policy teljes ujrairasa.

### Safety Defaults

1. Phase 1-ben a gate default modja `advisory`: hianyossag eseten warning/failing_gates report, de nincs automatikus hard stop.
2. Ha gate feldolgozas hibas/inkonzisztens, a jelenlegi bubble allapotgep viselkedes nem torhet (fail-open advisory jelleggel, diagnostikaval).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/create.ts` | bubble create command path | task input feldolgozas utan, bubble persist elott | task contract advisory check fut, gate eredmeny persistalhato formaban atadva | P1 | required-now | command path deterministic | 
| CS2 | `src/core/bubble/createBubble.ts` | createBubble runtime | task artifact resolution utan | contract check eredmeny bubble metadata/status komponensekbe irhato | P1 | required-now | runtime path proof |
| CS3 | `src/core/agent/pass.ts` | reviewer pass feldolgozas | finding payload parse/validacio utan | finding schema advisory check + round gate check eredmeny | P1 | required-now | existing pass validation path |
| CS4 | `src/core/agent/converged.ts` | converged policy path | convergence decision elott | `spec_lock_state` szamitas frissitese a nyitott finding halmaz alapjan | P1 | required-now | convergence policy integration |
| CS5 | `src/core/bubble/statusBubble.ts` | status presenter core | status json osszeallitas | uj gate mezok konzisztens, stabil json shape-ben jelennek meg | P1 | required-now | status contract |
| CS6 | `src/cli/commands/bubble/status.ts` | status CLI json output | output mappingnal | uj mezok serializalasa torzs nelkul (backward compatible additive) | P2 | required-now | additive response delta |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Bubble status JSON | gate-specifikus mezok korlatozottak | additiv mezok: `failing_gates`, `spec_lock_state`, `round_gate_state` | non-breaking additive | P1 | required-now |
| Finding payload minimal fields | severity-focused ellenorzes | kotelezo: `priority`, `timing`, `layer`, `evidence` advisory validacio | non-breaking with advisory warnings | P1 | required-now |
| Task contract input | ad-hoc task markdown | minimal machine-readable contract parse + advisory report | non-breaking (advisory) | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state/metadata | gate status mezok persistalasa | lifecycle allapotgep semantika modositas Phase 1-ben | advisory-only allapotban ne blokkoljon | P1 | required-now |
| Filesystem artifacts | gate diagnostika log/artifact frissites | kulso rendszer/network hivas | lokalis runtime diagnostika eleg | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior (`throw|result|fallback`) | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|
| Task contract parse hiba | advisory result + fallback continue | `DOC_CONTRACT_PARSE_WARNING` | warn | P1 | required-now |
| Finding schema hiany | advisory result + pass path tovabb mehet | `REVIEW_SCHEMA_WARNING` | warn | P1 | required-now |
| Round gate serules | advisory jelzes statusban | `ROUND_GATE_WARNING` | warn | P1 | required-now |
| Status gate serialization hiba | fallback: minimal status output + diagnostic note | `STATUS_GATE_SERIALIZATION_WARNING` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | jelenlegi config/policy csatornak (`src/config/*`, convergence policy helper-ek) | P2 | required-now |
| must-not-use | uj kulso dependency bevezetese Phase 1-ben | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Golden: valid contract advisory | valid task contract + valid finding schema | bubble create/status + reviewer pass fut | `failing_gates` ures vagy informational, status mezok stabilan jelennek meg | P1 | required-now | automated test |
| T2 | Invalid task contract | taskbol hianyzik kotelezo frontmatter mezok egy resze | bubble create/status fut | advisory warning jelenik meg, flow nem torik | P1 | required-now | automated test |
| T3 | Invalid finding schema | reviewer findingbol hianyzik `timing` vagy `layer` | reviewer pass fut | advisory gate jelzes, parse nem omlik ossze | P1 | required-now | automated test |
| T4 | Round gate after round 2 | round > 2, uj `required-now` P2 finding | review/convergence check fut | round gate warning megjelenik, policy eltérés diagnosztizalhato | P1 | required-now | automated test |
| T5 | Backward compatibility status | korabbi status fogyaszto | `pairflow bubble status --json` | additiv mezok mellett regi fogyasztas nem torik | P2 | required-now | compatibility test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Gate reason code-okhoz kesobbi enum normalizacio es centralis katalogus.
2. [later-hardening] `failing_gates` UI-szintu rendezett csoportositas (stateful severity grouping).
3. [later-hardening] Strict mode feature flag elokeszitese (`required-docs` -> hard fail).

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening kor.
3. 2. kor utan uj `required-now` csak evidence-backed `P0/P1`.
4. L2 elemek default `later-hardening`.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha minden `P0/P1 + required-now` zart es a fenti T1-T5 matrixhoz tartozik konkrét implementacios bizonyitek.
