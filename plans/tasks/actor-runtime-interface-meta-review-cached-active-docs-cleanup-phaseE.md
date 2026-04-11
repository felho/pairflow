---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_active_docs_cleanup_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Active Docs Cleanup (Phase E)"
status: implementable
phase: phaseE
target_files:
  - README.md
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
  - plans/tasks/actor-runtime-interface-meta-review-cached-surface-removal-phaseE.md
  - plans/tasks/actor-runtime-interface-meta-review-operator-read-surface-closure-phaseE.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Active Docs Cleanup (Phase E)

## Current Codebase Check (2026-04-11)

1. A delivery/removal umbrella mar superseded parent artifactkent van jelolve, es a plan mar explicit replacement splitet mutat.
2. Ettol fuggetlenul az aktiv docs contractban meg maradhatnak olyan hivatkozasok vagy wordingek, amelyek a cached surface korabbi availabilityjet sugalljak.
3. Ennek a tasknak az a celja, hogy az aktiv docs contract kovetkezetesen a replacement splitet es a removed-surface policyt tukrozze, mig a historical artifactok legfeljebb traceability celra maradjanak.

## L0 - Policy

### Goal

Tisztitsa ki az aktiv repo-local docs contractot ugy, hogy az mar ne egy vegrehajthato umbrella cached-surface removal taskot reklamozzon, hanem a replacement splitet es a retained historical/superseded artifact statuszt.

### In Scope

1. A plan active task-listajanak frissitese a harom replacement delivery taskra.
2. A superseded parent task explicit historical traceability artifactta teese.
3. Az aktiv README/plan/task docs cleanupja ugy, hogy ne maradjon elerheto cached surface-re mutato aktiv allitas.

### Out of Scope

1. CLI/runtime kodtorles.
2. Repo-local workflow/skill docs cleanup.
3. UI copied prompt cleanup.
4. Archive-only historical docs teljes sweepje.

### Safety Defaults

1. Historical context maradhat historical artifactokban, de aktiv docs nem reklamozhatja a feature-t.
2. A parent umbrella task nem maradhat `implementable`, ha replacement child taskokra lett bontva.
3. Nincs removal-guidance compatibility text; csak aktualis active contract vagy historical/superseded traceability maradhat.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - active docs command surface contract,
   - plan/task traceability contract.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `0`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `2`
8. `single-task allowed`: `yes`
9. Split note:
   - Ez a superseded umbrella task active-docs replacement szelete; tovabbi split nem kotelezo.
10. Identity/join note:
   - canonical identity path: active plan/task docs -> replacement split
   - competing identifiers or fallback identities: historical umbrella task mint aktualis implementation target
11. Authority/source-of-truth note:
   - canonical source: aktualis active plan/task docs
   - forbidden secondary sources: stale active references egy mar superseded umbrella taskra vagy removed cached surface-re

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | Phase E active task list | docs/plan section | Direction Update + Full Cached-Surface Removal Checkpoint | A plan a harom replacement delivery taskot mutassa, ne az umbrella taskot mint aktiv targetet. | P1 | required-now | docs diff |
| CS2 | `plans/tasks/actor-runtime-interface-meta-review-cached-surface-removal-phaseE.md` | historical parent artifact | task docs | frontmatter + superseded decision | Az umbrella task explicit `superseded` historical artifact legyen replacement child task refs-szel. | P1 | required-now | docs diff |
| CS3 | `README.md`, `plans/tasks/actor-runtime-interface-meta-review-operator-read-surface-closure-phaseE.md` | active docs references | docs | active docs cleanup | Aktiv doc ne kezelje elerheto feature-kent a cached meta-review surface-t. | P1 | required-now | grep + docs diff |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Active plan/task mapping | umbrella removal task az aktiv delivery target | replacement split explicit child taskokkal | canonical task paths | historical traceability refs | docs contract cleanup | P1 | required-now |
| Active docs command surface | cached surface historical/active wording keveredhet | only retained active surfaces or explicit historical status marad | current active commands only | historical context | docs cleanup | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Active docs | update plan/task status and references | archive-only residue teljes kiirtasa required-now scope-kent | archive sweep kulon follow-up lehet | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Active doc meg mindig cached feature-t reklamoz | grep/doc review | throw | update or demote the doc to historical status before merge | N/A | warn | P1 | required-now |
| Archive-only historical residue marad | docs grep | result | allowed if clearly historical and not active contract | N/A | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | replacement child task paths from this split | P1 | required-now |
| must-not-use | umbrella task mint aktiv implementation target | P1 | required-now |
| must-not-use | cached meta-review vagy `status` / `last-report` available feature wording aktiv docsban | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Plan points to replacement delivery tasks | active plan doc | plan review runs | delivery/removal lane explicit child taskokra van bontva | P1 | required-now | docs diff |
| T2 | Parent task is superseded historical artifact | parent task doc | task review runs | frontmatter `status: superseded` es replacement refs jelen vannak | P1 | required-now | docs diff |
| T3 | Active docs no longer advertise cached surface | README + active plan/task docs | grep/doc review runs | nincs aktiv doc, amely a cached surface-t elerheto feature-kent kezeli | P1 | required-now | grep + docs diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Archive-only textual residue sweep kulon docs-hygiene follow-up lehet, ha a historical zaj kesobb zavarova valik.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | archive-only textual residue sweep | L2 | P2 | later-hardening | task authoring | csak active docs cleanup utan merlegelni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
