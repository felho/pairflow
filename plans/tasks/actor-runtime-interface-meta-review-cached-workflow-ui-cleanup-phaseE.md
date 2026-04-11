---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_workflow_ui_cleanup_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Workflow and UI Cleanup (Phase E)"
status: implementable
phase: phaseE
target_files:
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/ReviewBubble.md
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/components/canvas/BubbleCanvas.tsx
  - ui/src/components/canvas/BubbleCanvas.test.tsx
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Workflow and UI Cleanup (Phase E)

## Current Codebase Check (2026-04-11)

1. A repo-local `UsePairflow` workflow leiras ma meg explicit `fresh|cached` source modellt mutat.
2. A UI copied review prompt jelenleg `--meta-review-source=cached` kapcsolot masol tobb komponensben es tesztben.
3. A removal policy szerint ezeknek a consume feluleteknek ugy kell eltunniuk, mintha a cached mode soha nem lett volna aktiv feature.

## L0 - Policy

### Goal

Tisztitsa ki a repo-local workflow leirast es a UI altal masolt review promptot ugy, hogy a `ReviewBubble` workflow megmaradjon, de a cached source mod es annak minden operatori/UI nyoma eltunjon.

### In Scope

1. A `ReviewBubble` workflow docs cleanupja a repo-local `.claude/skills/UsePairflow/**` source-of-truth alatt.
2. A UI copied review prompt cleanupja a Bubble canvas komponensekben.
3. A kapcsolodo UI es docs tesztek atirasa a megtartott fresh/direct review contractra.

### Out of Scope

1. Public CLI subtree removal.
2. Cached read-stack runtime removal.
3. README/plan/task docs cleanup.
4. Global skill sync a repo-local source update utan.

### Safety Defaults

1. Maga a `ReviewBubble` workflow megmarad; csak a `cached` opcio es a cached review path tunik el.
2. A repo-local skill az egyetlen source of truth; global installed copy manual editje tilos.
3. A UI promptban nem maradhat se `--meta-review-source=cached`, se mas cached meta-review wording.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - repo-local workflow interface contract,
   - UI-generated prompt contract.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `3`
8. `single-task allowed`: `yes`
9. Split note:
   - Ez a superseded umbrella task workflow/UI consume replacement szelete; tovabbi split nem kotelezo.
10. Identity/join note:
   - canonical identity path: `ReviewBubble -> fresh direct review`, `UI copied prompt -> plain review prompt`
   - competing identifiers or fallback identities: `--meta-review-source=cached`, `fresh|cached` mode matrix
11. Authority/source-of-truth note:
   - canonical source: repo-local workflow docs es aktualis UI prompt copy
   - forbidden secondary sources: cached-mode wording vagy removal-guidance messaging

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/UsePairflow/SKILL.md`, `.claude/skills/UsePairflow/Workflows/ReviewBubble.md` | ReviewBubble workflow contract | docs/workflow interface | skill docs | A workflowbol tunjon el a `--meta-review-source` flag, a `fresh|cached` mode matrix, es minden cached review callout. | P1 | required-now | docs diff |
| CS2 | `ui/src/components/canvas/BubbleExpandedCard.tsx`, `ui/src/components/canvas/BubbleCanvas.tsx` | copied review prompt builder | existing prompt copy helpers -> existing return types | UI prompt copy | A masolt review prompt ne tartalmazzon cached flaget vagy cached wordingot. | P1 | required-now | UI test |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| ReviewBubble workflow args | `--meta-review-source fresh|cached` | no source selector; direct review only | `--id`, existing remaining args | existing non-cached args | breaking workflow interface cleanup | P1 | required-now |
| UI copied prompt | cached source flag embedded | plain review prompt without cached flag | bubble id | mode wording if retained | breaking UX copy simplification | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Skill docs and UI copy | remove cached-mode wording and update tests | "workflow removed" wording vagy compatibility redirect | a retained workflow explicit maradjon | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Repo-local and installed skill copy driftel | operational sync workflow | result | repo-local task closes explicit sync follow-up note-tal | N/A | info | P2 | required-now |
| UI test meg mindig cached promptot var | UI tests | throw | update expectation to retained plain review prompt | N/A | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | repo-local skill source files under `.claude/skills/UsePairflow/**` | P1 | required-now |
| must-not-use | `--meta-review-source=cached` a workflow docsban vagy UI copyban | P1 | required-now |
| must-not-use | olyan wording, ami azt sugallja, hogy maga a `ReviewBubble` workflow lett eltavolitva | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | ReviewBubble workflow no longer exposes cached mode | repo-local skill docs | workflow docs are rendered/read | no `--meta-review-source`, no `fresh|cached` matrix, no cached review callout | P1 | required-now | docs diff |
| T2 | BubbleExpandedCard copied prompt is fresh-only | expanded card fixture | copy prompt action runs | copied text contains no cached flag or cached wording | P1 | required-now | automated test |
| T3 | BubbleCanvas copied prompt is fresh-only | canvas fixture | copy prompt action runs | copied text contains no cached flag or cached wording | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A global skill sync kulon operational follow-up commit lehet a repo-local source update utan.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | global installed skill sync validation | L2 | P2 | later-hardening | AGENTS policy | koveto operational lepeskent futtatni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
