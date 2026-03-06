---
artifact_type: task
artifact_id: task_reviewer_focus_task_bridge_phase1_v1
title: "Reviewer Focus Task-to-Protocol Bridge (Idea Task, Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/bubble/createBubble.ts
  - src/core/bubble/startBubble.ts
  - src/core/reviewer/reviewerBrief.ts
  - docs/llm-doc-workflow-v1.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Focus Task-to-Protocol Bridge (Idea Task, Phase 1)

## L0 - Policy

### Goal

Biztositsuk, hogy a task file opcionális `Reviewer Focus` blokkja ne csak implicit olvasasi elvaras legyen, hanem determinisztikusan bekeruljon a reviewer protocol-contextbe.

### In Scope

1. Koncepcio rogzitese: task-level `Reviewer Focus` -> runtime `reviewer-brief` bridge.
2. Minimal megvalositasi iranyok osszegyujtese.
3. Nyitott kerdesek es dontesi pontok dokumentalasa.

### Out of Scope

1. Azonnali implementacio ebben a taskban.
2. Reviewer prompt teljes ujratervezese.
3. Workflow enforcement policy teljes redesign.

### Safety Defaults

1. Ha `Reviewer Focus` nincs vagy parse-hiba van, marad a jelenlegi viselkedes.
2. A bridge csak additiv legyen; ne torje a meglévo bubble lifecycle-t.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary: task artifact contract + reviewer protocol prompt contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/createBubble.ts` | task parsing layer | `extractReviewerFocus(taskContent) -> reviewerFocus?` | task artifact read utan | `Reviewer Focus` blokk deterministicen kinyerheto | P1 | required-now | design note |
| CS2 | `src/core/bubble/startBubble.ts` | reviewer startup prompt assembly | `buildReviewerStartupPrompt(...) -> prompt` | reviewer prompt building | reviewer focus bekerul reviewer contextbe a brief csatornan | P1 | required-now | design note |
| CS3 | `src/core/reviewer/reviewerBrief.ts` | brief formatting | `formatReviewerBriefPrompt(brief) -> promptFragment` | brief composition | taskbol szarmazo focus ugyanazon canonical formaban jelenjen meg | P2 | later-hardening | design note |
| CS4 | `docs/llm-doc-workflow-v1.md` | workflow policy | `documentReviewerFocusPolicy() -> markdown_delta` | task authoring + review policy szekcio | egyertelmu legyen: mi implicit, mi deterministic bridge | P1 | required-now | doc update |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Task doc structure | nincs canonical `Reviewer Focus` blokk | opcionális canonical blokk | `reviewer_focus` szoveg vagy strukturalt lista | `rationale` | additive | P1 | required-now |
| Runtime reviewer context | task-level focus nincs deterministicen becsatornazva | reviewer-briefbe becsatornazva | `focus_text` | `focus_tags` | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Reviewer prompt context | additiv reviewer guidance injekcio | default reviewer policy felulirasa focus nelkul | fallback maradjon valtozatlan | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `Reviewer Focus` blokk hianyzik | N/A | fallback | nincs bridge, default reviewer flow | REVIEWER_FOCUS_ABSENT | info | P2 | required-now |
| parse ambiguity | task markdown parse | fallback | treat as absent + optional warning | REVIEWER_FOCUS_PARSE_WARNING | warn | P1 | required-now |
| dependency failure | N/A | fallback | `N/A` | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | meglévo `reviewer-brief` mechanizmus | P2 | required-now |
| must-not-use | uj kulso dependency csak parser miatt | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Focus present | taskban van `Reviewer Focus` blokk | bubble start | reviewer contextbe deterministicen bekerul | P1 | required-now | future test |
| T2 | Focus absent | taskban nincs blokk | bubble start | valtozatlan default reviewer context | P1 | required-now | future test |
| T3 | Parse warning path | malformed blokk | bubble start | fallback default + warning | P1 | required-now | future test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] `Reviewer Focus` mezot YAML frontmatterben is engedelyezni.
2. [later-hardening] Structured focus tags (`risk`, `scope`, `priority`) bevezetese.
3. [later-hardening] Bubble status JSON-ben reviewer focus source jelzes.

## Review Control

1. Ez idea task: elsodleges cel a jo problem-frame es implementacios irany rogzites.
2. Minden blocker findinghez konkret code-path vagy prompt-path evidence kell.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. egyertelmu a source-of-truth (`task section` -> `reviewer-brief` bridge),
2. fallback viselkedes explicit es biztonsagos,
3. dokumentalt a minimal implementacios lepeslista.
