---
artifact_type: task
artifact_id: task_architecture_boundary_simplification_discovery_phase1_v1
title: "Architecture Boundary Simplification Discovery (Phase 1)"
status: draft
phase: phase1
target_files:
  - plans/tasks/doc-only-issues/architecture-boundary-simplification-discovery-phase1.md
  - docs/pairflow-initial-design.md
  - docs/review-loop-optimization.md
  - docs/llm-doc-workflow-v1.md
  - docs/v2/architecture-simplification-notes.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Architecture Boundary Simplification Discovery (Phase 1)

## L0 - Policy

### Goal

Keszitsunk egy minimal, de vegrehajthato alapdokumentumot arrol, hogyan lehet a jelenlegi belso logikat egyszerubb, tisztabb felelossegi hatarokra szetvalasztani.

### In Scope

1. Jelenlegi komplexitas-terkep rovid osszefoglalasa (state, policy, I/O, legacy keveredesi pontok).
2. Celfelallas definialasa: pure domain core, orchestrator/I-O adapter, policy modulok, legacy adapter.
3. Modulhatar-javaslat es ownership matrix (mi hova tartozik, mi tilos adott retegen).
4. Fokozatos migracios szeleteles (no big-bang), max 3-5 implementalhato milestone.
5. Kovetkezo implementacios taskokhoz minimum acceptance checklist.

### Out of Scope

1. Runtime kodmodositas ebben a fazisban.
2. Protocol/schema valtoztatas veglegesitese ebben a fazisban.
3. Tesztinfrastruktura atirasa.
4. UI/CLI feature bovitese.

### Safety Defaults

1. Docs-only task: nincs direkt viselkedesvaltozas.
2. Minden javaslatnal explicit kompatibilitasi kockazat es rollback megjegyzes kotelezo.
3. Ha egy donteshez nincs eleg bizonyitek, jeloles: `TODO_BLOCKER` (nem vegleges allitas).

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no` (discovery/docs-only fazis).
2. Megjegyzes: kovetkezo implementacios fazis varhatoan `yes`, mert state/protocol es policy boundary-ket fog erinteni.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | docs/v2/architecture-simplification-notes.md | N/A (docs section) | N/A | uj dokumentum | canonical cel-architektura es boundary elvek rogzitese | P1 | required-now | review diff |
| CS2 | docs/pairflow-initial-design.md | N/A (architecture appendix update) | N/A | architecture/boundary resz | jelenlegi vs cel felelossegi hatar tisztazasa | P1 | required-now | review diff |
| CS3 | docs/review-loop-optimization.md | N/A (program linkage) | N/A | stabilization/program fejezet | discovery outputok bekotese roadmap szintre | P2 | required-now | review diff |
| CS4 | plans/tasks/doc-only-issues/architecture-boundary-simplification-discovery-phase1.md | N/A (task spec) | N/A | jelen task | vegrehajthato L0/L1/L2 contract fenntartasa | P1 | required-now | reviewer check |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Boundary taxonomy | nincs egyseges taxonomy | standard retegek: `domain-core`, `policy`, `orchestrator-io`, `legacy-adapter` | layer_name, responsibility, allowed_inputs, allowed_outputs, forbidden_items | notes, examples | non-breaking (docs-only) | P1 | required-now |
| Migration slice contract | ad-hoc refaktor dontesek | milestone alapu szeleteles | milestone_id, scope, invariants_kept, validation_minimum | rollback_hint, risk_note | non-breaking (docs-only) | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Documentation | uj/frasitett docs tartalom | runtime kod modositas | discovery fazisban csak dokumentacios valtozas | P1 | required-now |
| Task planning | kovetkezo fazis taskok elokeszitese | lifecycle command policy valtoztatas | csak javaslati szint | P2 | required-now |

Constraint: ha nincs explicit allowed side effect kodra, implementacio tisztan docs marad.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Ellentmondo boundary allitas kulonbozo doksikban | docs consistency | fallback | jeloles `TODO_BLOCKER` + nyitott kerdes | DOC_BOUNDARY_INCONSISTENT | warn | P1 | required-now |
| Hianyzik bizonyitek egy eros allitashoz | evidence refs | fallback | allitas gyengitese + explicit feltetelezes | DOC_EVIDENCE_MISSING | warn | P1 | required-now |
| Nincs konszenzus migration sorrendrol | reviewer/human dontes | result | tobb alternativa listazasa tradeoff-fal | DOC_MIGRATION_ORDER_UNSET | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | docs/pairflow-initial-design.md mint baseline | P1 | required-now |
| must-use | docs/review-loop-optimization.md es aktualis task/pilot tanulsagok | P1 | required-now |
| must-not-use | implicit "big-bang rewrite" terv | P1 | required-now |
| must-not-use | bizonyitatlan P0/P1 allitasok discovery fazisban | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Boundary completeness | current architecture docs | discovery doc elkeszul | minden tervezett layerhez van responsibility + forbidden lista | P1 | required-now | reviewer checklist |
| T2 | Migration minimality | cel boundary modell | milestone bontas keszul | max 3-5 milestone, mindegyikhez validacios minimum | P1 | required-now | reviewer checklist |
| T3 | Compatibility clarity | jelenlegi lifecycle invariants | risk/resolution tabla keszul | minden milestone tartalmaz "mit nem torhetunk el" listat | P1 | required-now | reviewer checklist |
| T4 | Non-goal guard | discovery draft | scope review fut | nincs runtime implementacios commitment ebben a fazisban | P1 | required-now | reviewer checklist |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Keszulhet kulon ADR-sorozat milestone-onkent.
2. [later-hardening] Boundary lint/check script opcio a docs konzisztenciara.
3. [later-hardening] Modul ownership matrix UI-nezet.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | ADR template formalizalasa a boundary dontesekhez | L2 | P2 | later-hardening | discovery note | kulon docs task nyitasa |
| H2 | Docs consistency semiauto ellenorzes | L2 | P3 | later-hardening | reviewer observation | opcionlis script-prototipus |

## Review Control

1. Minden finding tartalmazzon: `priority`, `timing`, `layer`, `evidence`.
2. Discovery fazisban P0/P1 csak konkret, hivatkozott bizonyitekkal ervenyes.
3. Ha allitas nem bizonyithato, automatikusan `TODO_BLOCKER` vagy `later-hardening`.
4. Ebben a taskban runtime kodmodositas nem engedelyezett.

## Spec Lock

Task `IMPLEMENTABLE` erre a docs-only fazisra, ha:
1. boundary taxonomy teljes (layer + responsibility + forbidden),
2. migration milestone lista kesz (3-5 szelet),
3. minden szelethez van minimum validacios kovetelmeny.

## Assumptions

1. Eloszor discovery/docs fazist szeretnenk, nem azonnali kod-atirast.
2. A kovetkezo korben kulon implementacios taskokra lesz bontva a refaktor.
3. Legacy kompatibilitast a migracio teljes ideje alatt tartani kell.

## Open Questions

1. Melyik terulet legyen az elso pilot-szelet: approval flow, meta-review gate, vagy pass/converged orchestration?
2. Milyen hataron huzunk "policy modul" vs "domain-core" kozott a jelenlegi kodban?
3. Kell-e kulon ADR minden milestone-hoz, vagy eleg egyetlen architecture note + milestone appendix?
