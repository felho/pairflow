---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_repo_surface_cleanup_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Repo Surface Cleanup (Phase E)"
status: implementable
phase: phaseE
target_files:
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/ReviewBubble.md
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
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

Target file interpretation:
1. A `target_files` lista a primer repo-surface ownership seam-eket rogziti, nem teljes historical traceability inventory.
2. A predecessor es successor task dokumentumok authoritative sorrendje a lenti traceability lockban marad, de ezek nem valnak automatikusan edit ownershipte csak attol, hogy preconditionkent hivatkozunk rajuk.
3. A `README.md` szandekolt Phase E5 follow-on seam, de nem primer target ownership a jelenlegi tree-ben; csak a public `bubble meta-review` read-model surface Phase E3 closure-ja utan lep be konkret edit feluletkent.

## Current Codebase Check (2026-04-12)

1. A repo-local `UsePairflow` source-of-truth ma tenylegesen meg mindig ketforrasu `fresh|cached` review mode-kent irja le a `ReviewBubble` workflowt a `.claude/skills/UsePairflow/SKILL.md` es `.claude/skills/UsePairflow/Workflows/ReviewBubble.md` file-okban.
2. A UI copied review prompt surfaces ma is explicit `--meta-review-source=cached` kapcsolot masolnak a `ui/src/components/canvas/BubbleExpandedCard.tsx` es `ui/src/components/canvas/BubbleCanvas.tsx` seamjeiben, a megfelelo tesztekkel egyutt.
3. A `README.md` jelenlegi tree-ben meg mindig dokumentalja a public `pairflow bubble meta-review status|last-report` operator surface-et; ezert a README cleanup ebben a taskban csak a public read-model removal predecessor utan zarhato le.
4. A jelen task sajat frontmattere meg stale traceability-t hordoz: superseded umbrella/foundation taskokra mutat target ownershipkent ahelyett, hogy a 2026-04-12-es replacement sequencinget kovetne.
5. A `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` mar explicitten E3 -> E4 -> E5 sorrendet ir elo, vagyis ez a task Phase E5 repo-surface successor, de nem irhatja felul a Phase E3 public read-model closure elofeltetelt.
6. A repo-local `.claude/skills/UsePairflow/Workflows/InterveneBubble.md` es `CloseBubble.md` workflowban maradt cached autonomous recommendation hivatkozasok nem `--meta-review-source` operator mode-ot reklamoznak, hanem approval override/allapotkiolvasasi contextet; ezek nem tartoznak ennek a tasknak a primer edit ownershipebe.

## L0 - Policy

### Goal

Tisztitsa ki a repo-local workflow, active docs es copied prompt surfaces wordingjet ugy, hogy a removed `--meta-review-source` mode-surface es a superseded remaining-task framing ne maradjon aktiv operatori valasztaskent vagy active traceability targetkent, mikozben a Phase E3 public read-model closure orderingje sem torik meg.

### Domain / Control Model Summary

1. Business invariant: az aktiv repo-local guidance csak a surviving review contractot es a 2026-04-12 replacement Phase E sequencinget mutathatja.
2. Control model: operatori/docs/prompt surfaces csak a jelenleg aktiv runtime contractot es aktiv tasklancot referencialhatjak; olyan docs cleanup nem futhat elore, amely meg elo public commandot hamisan eltuntetne.
3. Read-path rule: active docs es copied prompts csak a surviving direct review pathot es az uj replacement tasklancot nevezhetik meg; historical context csak explicit superseded note-kent maradhat.
4. Forbidden fallback: nincs `--meta-review-source=cached`, nincs `fresh|cached` modmatrix, nincs superseded umbrella/foundation taskra mutato aktiv docs hivatkozas, es nincs Phase E3 elotti README command-surface rewrite.
5. Missing-data rule: ha historical kontextus kell, azt csak superseded/historical megjegyzesben lehet megtartani; aktiv docs inkabb hagyja el a removed capabilityt, de elo public commandot nem nevez at idokorlat nelkul.
6. Phase boundary:
   - contract closure: N/A
   - producer closure: archived prereq
   - internal execution closure: predecessor tasks
   - workflow/orchestration closure: docs/prompt surface wording only
   - read_model_closure: predecessor tasks
   - activation closure: N/A
   - cleanup/recovery closure: owned here a repo-surface szinten

### Authority Boundary Map

1. Authority producer: N/A; a runtime authority closure archived prereq-ekben megtortent, a public read-model closure pedig kulon predecessor taskban zarando.
2. Stored authority: N/A.
3. In-scope consumers: repo-local review workflow docs, active plan/docs traceability, copied UI prompt surfaces, valamint a Phase E3 utan stale README wording.
4. Explicit out-of-scope consumers: runtime code, persisted state shape, public read-model code removal, `.claude/skills/UsePairflow/Workflows/InterveneBubble.md`, `.claude/skills/UsePairflow/Workflows/CloseBubble.md`, es minden olyan workflow file ahol a cached terminology nem source-mode operator contractot jelent.
5. Export surfaces closed in this phase: yes; a removed mode docs/prompt surfacek es stale task hivatkozasok bezarandoak, de a README command reference csak a predecessor closure utan.

### In Scope

1. Repo-local `UsePairflow` source-of-truth cleanup a cached mode es annak wordingje nelkul.
2. UI copied review prompt cleanup a cached source-mode kapcsolo es stale wording nelkul.
3. Active plan es repo-surface traceability docs atallitasa az uj replacement tasklancra.
4. `README.md` cleanup csak a public read-model removal utan, amikor a command reference mar tenylegesen stale.

### Out of Scope

1. Runtime code removal vagy state shape cleanup.
2. Global skill sync vagy kulon global repo commit.
3. Barmilyen uj meta-review feature vagy operatori compatibility guidance bevezetese.
4. A `bubble meta-review status|last-report` public command docs elorehozott torlese addig, amig a Phase E3 closure nincs merged state-ben.

### Safety Defaults

1. Historical context maradhat explicit superseded note-kent, de aktiv docs/prompt nem reklamozhat removed surface-et.
2. A repo-local `.claude/skills/**` az egyetlen source of truth; global copy manual editje tilos.
3. UI copy ne vezessen be uj semi-legacy wordinget a removed cached mod helyett.
4. A README command reference nem lehet korabban atirva, mint ahogy a public command surface tenylegesen megszunik.

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
   - canonical identity path: active repo-local docs/prompt surfaces -> replacement Phase E sequencing -> surviving review command wording
   - competing identifiers or fallback identities: removed cached-mode wording, superseded umbrella/foundation task pathok, es Phase E3 elotti premature README rewrite
11. Authority/source-of-truth note:
   - canonical source: repo-local skill/docs/prompt source files + 2026-04-12 resequenced plan
   - forbidden secondary sources: stale wording, superseded task refs, cached mode matrix, precondition nelkuli README cleanup

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Aktiv docs/prompt nem reklamozhat removed cached source-mode capabilityt. | Cached mode wording es superseded task refs torlendoek. | P1 | required-now |
| Control model | Active docs a surviving runtime contractot es replacement sequencinget mutatja, de nem elozi meg a Phase E3 command-closuret. | Plan/skill/UI surfaces az uj tasklancra alljanak; README csak a predecessor utan tisztulhat. | P1 | required-now |
| Read-path rule | Active repo-local guidance csak direct review / surviving pathokra hivatkozhat. | No `--meta-review-source=cached` or mode matrix. | P1 | required-now |
| Forbidden fallback | Nincs "legacy cached option", superseded task trace vagy Phase E3 elotti README command rewrite. | Historical context csak superseded note lehet. | P1 | required-now |
| Missing-data rule | Ha nincs helye aktiv guidance-ben, a removed capability egyszeruen elhagyando. | No compatibility filler text. | P2 | required-now |
| Phase boundary | Ez a repo-surface cleanup task. | Runtime code es state shape maradjon kulon taskokban; public read-model docs cleanup predecessor-gated. | P1 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Repo-local review workflow wording | `UsePairflow` skill docs, UI copied prompt, active plan/docs | breaking wording cleanup | align repo-surface guidance to surviving contract and replacement sequencing | README command reference waits for predecessor closure |

### 0b) Sequencing / Closure Order

| Step | Why this order is mandatory | Owned here | Must stay deferred |
|---|---|---|---|
| 1. Repo-local `ReviewBubble` wording cleanup | A removed source-mode contractot eloszor a source-of-truth workflow docsbol kell kivezetni. | `.claude/skills/UsePairflow/SKILL.md`, `.claude/skills/UsePairflow/Workflows/ReviewBubble.md` | public read-model code removal |
| 2. UI copied prompt cleanup | A copied prompt csak a source-of-truth review wording utan tisztithato stabilan. | `ui/src/components/canvas/BubbleExpandedCard.tsx`, `BubbleCanvas.tsx` es tesztjeik | runtime/state seam-ek |
| 3. Active traceability alignment | A plan/task traceability csak akkor stabil, ha a repo-surface wording mar a replacement lane-t koveti. | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`, aktiv traceability docs | superseded historical artifact rewrite beyond note-level |
| 4. README cleanup gate | A command reference csak akkor irhato at, ha a public `bubble meta-review` surface mar predecessorben eltunt. | `README.md` follow-on repo-surface wording cleanup a predecessor merge utan | Phase E3 elotti docs drift vagy public command removal |

Normative sequencing rules:

1. A `README.md` nem lehet az elso edit target, mert a public command reference csak tenyleges code closure utan valik stale-le.
2. A ReviewBubble source-mode cleanup nem huzhat vissza approval override / cached recommendation wordinget olyan workflowkbol, ahol az mar nem operator mode-kent szerepel.
3. Active traceability alignment nem nyithat uj historical cleanup hullamot a superseded taskokon; explicit superseded note eleg.
4. Ha a public read-model predecessor meg nyitott, a pass summarynak ezt explicit blockerkent kell neveznie a README-reszre.

### 0c) Traceability Lock

| Source | Binding requirement for this task | Why it matters |
|---|---|---|
| `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` Remaining Phase E Resequencing Update | Ez a task a replacement lane Phase E5 repo-surface cleanup szelete, es nem override-olja az E3 -> E4 -> E5 sorrendet. | Megakadalyozza, hogy a task "azonnali kovetkezo" cimen atlepje a public read-model predecessort. |
| `plans/tasks/actor-runtime-interface-meta-review-cached-public-read-model-removal-phaseE.md` | Phase E3 predecessor: a public `bubble meta-review` surface es a hozza tartozo retained read stack elobb zarando le. | A README command reference follow-on cleanup ehhez kotott, nem pusztan a Phase E4 archive-hoz. |
| `.claude/skills/UsePairflow/Workflows/InterveneBubble.md`, `.claude/skills/UsePairflow/Workflows/CloseBubble.md` | Ezekben a cached terminology approval/status contextet jelent, nem removed `--meta-review-source` operator mode-ot. | Megakadalyozza, hogy a task tevesen visszahuzza ezeket a workflowkat repo-surface mode-cleanup cim alatt. |
| `plans/archive/tasks/actor-runtime-interface-meta-review-cached-persisted-authority-and-cleanup-recovery-removal-phaseE.md` | Phase E4 archived predecessor: a persisted authority + cleanup/recovery closure mar lezart boundary. | A jelen task nem nyithatja vissza a runtime/state cleanup scope-ot. |
| `plans/tasks/actor-runtime-interface-meta-review-cached-surface-removal-phaseE.md`, `plans/tasks/actor-runtime-interface-meta-review-cached-state-decoupling-phaseE.md` | Historical superseded artifacts only; nem maradhatnak aktiv ownership/next-task hivatkozaskent. | Ez a task explicitten a replacement splitre mutasson, ne a korabbi loop-prone framingre. |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/UsePairflow/SKILL.md`, `.claude/skills/UsePairflow/Workflows/ReviewBubble.md` | repo-local review workflow docs | markdown -> markdown | repo-local skill source | Cached source-mode es stale mode matrix eltunik; surviving review flow marad. | P1 | required-now | docs diff |
| CS2 | `ui/src/components/canvas/BubbleExpandedCard.tsx`, `BubbleCanvas.tsx` es tesztjeik | copied review prompt wording | UI copy -> UI copy | browser copied prompt | Nincs `--meta-review-source=cached` vagy stale cached wording. | P1 | required-now | UI tests |
| CS3 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`, active traceability docs | active docs traceability | markdown -> markdown | active repo docs | Az active docs az uj replacement tasklancot nevezik meg; superseded task pathra nincs aktiv hivatkozas. | P1 | required-now | docs diff |
| CS4 | `README.md` | command/reference wording | markdown -> markdown | repo root command reference | A README follow-on cleanup csak a public read-model predecessor merge utan lep aktiv edit scope-ba, es akkor sem hivatkozik removed cached source-mode-ra vagy stale task framingre. | P1 | required-now | docs diff |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Review workflow wording | `fresh|cached` source model vagy cached references | direct/surviving review wording only | surviving review path | historical note in superseded docs | breaking docs cleanup | P1 | required-now |
| Active task traceability | superseded umbrella/foundation taskok ownership targetkent maradnak | new replacement task chain | current replacement task paths | historical superseded note | breaking docs cleanup | P1 | required-now |
| Copied UI prompt | cached mode flagot vagy stale cached wordinget masol | surviving review prompt only | current review command wording | none | breaking prompt cleanup | P1 | required-now |
| README command wording | current tree-ben meg elo public `bubble meta-review` read surface-t dokumental | predecessor closure utan surviving command surface only | surviving public commands | historical note nem szukseges | sequencing-gated follow-on docs cleanup | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo-local docs/prompt surfaces | wording, references, superseded notes frissitese | runtime behavior explanation of removed legacy alternatives | docs-only cleanup | P1 | required-now |
| README command reference | stale command docs cleanup after predecessor merge | public command docs elorehozott torlese | predecessor-gated follow-on seam | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Historical context kell active docsban | docs wording | fallback | explicit superseded note only | N/A | info | P2 | required-now |
| Superseded task ref marad active docsban | docs validation | throw | ref cserelendo az uj replacement taskra vagy superseded note-ra | N/A | warn | P1 | required-now |
| README cleanup a public read-model predecessor nelkul indulna | sequencing gate | throw | README resz blokkolando a predecessor merge-ig; a task ilyenkor csak a gate-et dokumentalja | PREDECESSOR_NOT_CLOSED | warn | P1 | required-now |
| Dependency failure | UI/docs test tooling | fallback | task nem zarhato passing docs/UI evidence nelkul | DEPENDENCY_FAIL | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | repo-local skill source of truth under `.claude/skills/UsePairflow/**` | P1 | required-now |
| must-use | active docs traceability az uj replacement tasklancra | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-meta-review-cached-public-read-model-removal-phaseE.md` mint explicit predecessor gate a README follow-on cleanuphez | P1 | required-now |
| must-not-use | `--meta-review-source=cached` wording | P1 | required-now |
| must-not-use | superseded old remaining task pathok active docsban | P1 | required-now |
| must-not-use | README command reference cleanup Phase E3 elott | P1 | required-now |
| must-not-use | global skill copy manual editje | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Repo-local review workflow no longer mentions cached mode | current repo-local skill docs still mention cached references | docs content read | cached mode wording eltunt | P1 | required-now | docs diff |
| T2 | Copied review prompt no longer emits cached flag | UI copied prompt current treeben cached mode wordinget tartalmaz | component/test fut | copied prompt surviving wordinget ad | P1 | required-now | UI tests |
| T3 | Active docs point to new replacement chain | plan/active traceability current treeben old superseded taskokra mutat | docs diff review | active refs az uj taskokra mutatnak | P1 | required-now | docs diff |
| T4 | README cleanup gate is encoded as a verifiable follow-on rule | current tree-ben a README meg elo public `bubble meta-review` read surface-t dokumentalhat | task spec content review fut | a task explicitten kimondja, hogy README csak Phase E3 closure utan lep aktiv edit scope-ba, es addig a gate dokumentalasa a kotelezo viselkedes | P1 | required-now | docs diff |

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

This task remains `IMPLEMENTABLE` as the bounded Phase E5 repo-surface artifact when all `P0/P1 + required-now` items are closed, aktiv repo-local docs/prompt surface mar nem emlit removed cached source-mode-ot, a superseded old remaining task pathok nem maradnak aktiv hivatkozasban, es a README cleanup follow-on gate explicitten a Phase E3 predecessorhez van kotve.
