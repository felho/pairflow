---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_repo_surface_cleanup_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Repo Surface Cleanup (Phase E)"
status: implementable
phase: phaseE
target_files:
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/ReviewBubble.md
  - README.md
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
  - plans/tasks/actor-runtime-interface-meta-review-cached-surface-removal-phaseE.md
  - plans/tasks/actor-runtime-interface-meta-review-cached-state-decoupling-phaseE.md
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

# Task: Actor Runtime Interface Meta-Review Cached Repo Surface Cleanup (Phase E)

## L0 - Policy

### Goal

Tisztitsa ki a repo-local workflow, active docs es copied prompt surfaces wordingjet ugy, hogy a cached meta-review mode es a torolt Phase E task chain ne maradjon aktiv operatori valasztaskent vagy active traceability targetkent.

### Domain / Control Model Summary

1. Business invariant: az aktiv repo-local guidance csak a surviving review contractot es az uj Phase E sequencinget mutathatja.
2. Control model: operatori/docs/prompt surfaces csak a jelenleg aktiv runtime contractot es aktiv tasklancot referencialhatjak.
3. Read-path rule: active docs es copied prompts csak a surviving direct review pathot es az uj replacement tasklancot nevezhetik meg; historical context csak explicit superseded note-kent maradhat.
4. Forbidden fallback: nincs `--meta-review-source=cached`, nincs `fresh|cached` modmatrix, nincs deleted task pathra mutato aktiv docs hivatkozas.
5. Missing-data rule: ha historical kontextus kell, azt csak superseded/historical megjegyzesben lehet megtartani; aktiv docs inkabb hagyja el a removed capabilityt.
6. Phase boundary:
   - contract closure: N/A
   - producer closure: archived prereq
   - internal execution closure: predecessor tasks
   - workflow/orchestration closure: docs/prompt surface wording only
   - read_model_closure: predecessor tasks
   - activation closure: N/A
   - cleanup/recovery closure: owned here a repo-surface szinten

### Authority Boundary Map

1. Authority producer: N/A; a runtime authority closure mar korabbi taskokban megtortent.
2. Stored authority: N/A.
3. In-scope consumers: repo-local workflow docs, active plan/docs traceability, copied UI prompt surfaces.
4. Explicit out-of-scope consumers: runtime code, persisted state shape, public read-model code removal.
5. Export surfaces closed in this phase: yes; a cached docs/prompt surfacek es stale task hivatkozasok bezarandoak.

### In Scope

1. Repo-local `UsePairflow` source-of-truth cleanup a cached mode es annak wordingje nelkul.
2. UI copied review prompt cleanup a cached source-mode kapcsolo es stale wording nelkul.
3. Active README/plan/historical traceability docs atallitasa az uj replacement tasklancra.

### Out of Scope

1. Runtime code removal vagy state shape cleanup.
2. Global skill sync vagy kulon global repo commit.
3. Barmilyen uj meta-review feature vagy operatori compatibility guidance bevezetese.

### Safety Defaults

1. Historical context maradhat explicit superseded note-kent, de aktiv docs/prompt nem reklamozhat removed surface-et.
2. A repo-local `.claude/skills/**` az egyetlen source of truth; global copy manual editje tilos.
3. UI copy ne vezessen be uj semi-legacy wordinget a removed cached mod helyett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. If `yes`, list impacted contracts (DB/API/event/auth/config) and keep `plan_ref` non-null.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `3`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - N/A
10. Identity/join note:
   - canonical identity path: active repo-local docs/prompt surfaces -> new replacement task chain
   - competing identifiers or fallback identities: deleted cached-mode wording es deleted task pathok
11. Authority/source-of-truth note:
   - canonical source: repo-local skill/docs/prompt source files
   - forbidden secondary sources: stale wording, deleted task refs, cached mode matrix

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Aktiv docs/prompt nem reklamozhat removed cached capabilityt. | Cached wording es deleted task refs torlendoek. | P1 | required-now |
| Control model | Active docs a surviving runtime contractot es replacement sequencinget mutatja. | Plan/README/skill docs ugyanarra az uj tasklancra alljanak. | P1 | required-now |
| Read-path rule | Active repo-local guidance csak direct review / surviving pathokra hivatkozhat. | No `--meta-review-source=cached` or mode matrix. | P1 | required-now |
| Forbidden fallback | Nincs "legacy cached option" vagy deleted task trace. | Historical context csak superseded note lehet. | P1 | required-now |
| Missing-data rule | Ha nincs helye aktiv guidance-ben, a removed capability egyszeruen elhagyando. | No compatibility filler text. | P2 | required-now |
| Phase boundary | Ez a repo-surface cleanup task. | Runtime code es state shape maradjon kulon taskokban. | P1 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Repo-local review workflow wording | `UsePairflow` skill docs, UI copied prompt, active plan/docs | breaking wording cleanup | align all active repo surfaces to surviving contract | N/A |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/UsePairflow/SKILL.md`, `.claude/skills/UsePairflow/Workflows/ReviewBubble.md` | repo-local review workflow docs | markdown -> markdown | repo-local skill source | Cached source-mode es stale mode matrix eltunik; surviving review flow marad. | P1 | required-now | docs diff |
| CS2 | `ui/src/components/canvas/BubbleExpandedCard.tsx`, `BubbleCanvas.tsx` es tesztjeik | copied review prompt wording | UI copy -> UI copy | browser copied prompt | Nincs `--meta-review-source=cached` vagy stale cached wording. | P1 | required-now | UI tests |
| CS3 | `README.md`, `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`, historical task docs | active docs traceability | markdown -> markdown | active repo docs | Az active docs az uj replacement tasklancot nevezik meg; deleted task pathra nincs aktiv hivatkozas. | P1 | required-now | docs diff |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Review workflow wording | `fresh|cached` source model vagy cached references | direct/surviving review wording only | surviving review path | historical note in superseded docs | breaking docs cleanup | P1 | required-now |
| Active task traceability | deleted old remaining tasks | new replacement task chain | current task paths | historical superseded note | breaking docs cleanup | P1 | required-now |
| Copied UI prompt | cached mode flagot vagy stale cached wordinget masol | surviving review prompt only | current review command wording | none | breaking prompt cleanup | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo-local docs/prompt surfaces | wording, references, superseded notes frissitese | runtime behavior explanation of removed legacy alternatives | docs-only cleanup | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Historical context kell active docsban | docs wording | fallback | explicit superseded note only | N/A | info | P2 | required-now |
| Deleted task ref marad active docsban | docs validation | throw | ref cserelendo az uj taskra | N/A | warn | P1 | required-now |
| Dependency failure | UI/docs test tooling | fallback | task nem zarhato passing docs/UI evidence nelkul | DEPENDENCY_FAIL | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | repo-local skill source of truth under `.claude/skills/UsePairflow/**` | P1 | required-now |
| must-use | active docs traceability az uj replacement tasklancra | P1 | required-now |
| must-not-use | `--meta-review-source=cached` wording | P1 | required-now |
| must-not-use | deleted old remaining task pathok active docsban | P1 | required-now |
| must-not-use | global skill copy manual editje | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Repo-local review workflow no longer mentions cached mode | current repo-local skill docs still mention cached references | docs content read | cached mode wording eltunt | P1 | required-now | docs diff |
| T2 | Copied review prompt no longer emits cached flag | UI copied prompt current treeben cached mode wordinget tartalmaz | component/test fut | copied prompt surviving wordinget ad | P1 | required-now | UI tests |
| T3 | Active docs point to new replacement chain | plan/README/historical traceability current treeben old deleted taskokra mutat | docs diff review | active refs az uj taskokra mutatnak | P1 | required-now | docs diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Global skill sync a repo-local source update utan kulon workflow szerint mehet.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | global skill sync follow-up commit a `~/.claude` repo-ban | L2 | P2 | later-hardening | AGENTS policy | kulon follow-up commit, nem ebben a taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.
6. If a shared contract changes, current-consumer inventory and additive-vs-breaking classification are mandatory.
7. If an authority fan-out exists, the authority boundary map must stay consistent with the bounded task scope.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, aktiv repo-local docs/prompt surface mar nem emlit cached mode-ot, es deleted old remaining task pathokra nincs aktiv hivatkozas.
