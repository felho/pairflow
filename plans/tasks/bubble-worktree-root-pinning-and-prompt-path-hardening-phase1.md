---
artifact_type: task
artifact_id: task_bubble_worktree_root_pinning_and_prompt_path_hardening_phase1_v1
title: "Bubble Worktree Root Pinning + Prompt Path Hardening (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/runtime/agentCommand.ts
  - src/core/bubble/startBubble.ts
  - src/core/runtime/reviewerContext.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/reviewerContext.test.ts
  - tests/core/runtime/agentCommand.test.ts
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Worktree Root Pinning + Prompt Path Hardening (Phase 1)

## L0 - Policy

### Goal

Csokkentse a bubble/worktree drift kockazatat ket celzott hardeninggel:
1. Agent launch root determinisztikus pinning a bubble worktree-re.
2. Startup/resume prompt path-hierarchia tisztazasa ugy, hogy a worktree legyen az egyetlen autoritativ futasi hely.

### In Scope

1. Agent launch command hardening:
   - Codex launch determinisztikusan a bubble worktree-bol induljon (preferalt: explicit `--cd <worktree>` pinning).
   - Reviewer context refresh/respawn ut is ugyanilyen root-pinninget hasznaljon.
2. Prompt hardening:
   - Startup/resume promptokban a "run commands from this worktree path" utasitas legyen explicit es egyertelmu.
   - Keruljuk a ketertelmu "Repository + Worktree" framinget ott, ahol ez CWD driftet okozhat.
3. Tesztek:
   - Agent command construction tesztelje a root-pinning viselkedest.
   - Startup/resume prompt tesztek vedjek a worktree-authoritative wordinget.

### Out of Scope

1. Watchdog/core guard bevezetes a "main dirty + bubble clean" mintara.
2. Runtime state machine vagy protocol viselkedes modositas.
3. Bubble lifecycle policy atalakitasa.
4. Uj automatikus stop/escalation mechanizmus.

### Safety Defaults

1. Root-pinning fail-closed szemlelet: ha a worktree target nem adható at, ne maradjon "implicit cwd" launch.
2. Prompt-level utasitas mindig worktree-centric legyen.
3. Nincs behavioral policy-bovites; csak launch/root es prompt clarity hardening.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary:
   - agent launch command assembly
   - reviewer resume respawn command assembly
   - implementer/reviewer startup-resume prompt wording

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Section | Contract Delta | Expected Result | Priority | Timing |
|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/agentCommand.ts` | `buildAgentCommand` | explicit worktree root pinning input + command assembly | launch command nem implicit cwd-re hagyatkozik | P1 | required-now |
| CS2 | `src/core/bubble/startBubble.ts` | fresh start `buildAgentCommand(...)` hivasok | worktree path atadasa mind implementer/reviewer launchhoz | bubble start agent pane-ek determinisztikus rooton indulnak | P1 | required-now |
| CS3 | `src/core/bubble/startBubble.ts` | resume start `buildAgentCommand(...)` hivasok | worktree path atadasa mind implementer/reviewer launchhoz | resume utan sem csuszik vissza implicit rootra | P1 | required-now |
| CS4 | `src/core/runtime/reviewerContext.ts` | `refreshReviewerContext` | respawn reviewer command is worktree-pinned | context refresh nem tud main-rootra driftelni | P1 | required-now |
| CS5 | `src/core/bubble/startBubble.ts` | startup/resume prompt text | worktree-authoritative wording, minimal ketertelmuseg | promptban egyertelmu futasi hely | P1 | required-now |
| CS6 | `tests/core/runtime/agentCommand.test.ts` | uj/updated tests | root-pinning presence + shell-parseable quoting | regresszio ellen vedett command assembly | P1 | required-now |
| CS7 | `tests/core/bubble/startBubble.test.ts` | startup/resume prompt assertions | explicit worktree-authoritative wording checks | prompt drift hamar lebukik | P1 | required-now |
| CS8 | `tests/core/runtime/reviewerContext.test.ts` | respawn command assertions | reviewer respawn is worktree-pinned | refresh path drift regresszio fogasa | P1 | required-now |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|
| Agent command launch root | implicit shell cwd | explicit worktree pinning | `agentName`, `bubbleId`, `worktreePath` (+optional prompt) | backward-compatible viselkedes, erosebb determinisztika | P1 | required-now |
| Startup prompt path guidance | repository+worktree kevert framing | worktree-authoritative action text | explicit "run from this worktree path" | wording-only, no runtime policy change | P1 | required-now |
| Resume prompt path guidance | reszben kevert framing | worktree-authoritative action text | explicit worktree execution guidance | wording-only, no runtime policy change | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Priority | Timing |
|---|---|---|---|---|
| Agent launch command assembly | explicit root pinning + argument plumbing | tmux/session state flow modositas | P1 | required-now |
| Prompt wording | worktree-authoritative clarity tuning | policy-level command gate redesign | P1 | required-now |
| Tests | targeted assertion updates/new tests | unrelated broad refactor | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| ID | Trigger | Behavior | Fallback | Reason Code | Priority | Timing |
|---|---|---|---|---|---|---|
| E1 | launch commandbol hianyzik explicit worktree pinning | test fail | none | `WORKTREE_ROOT_PINNING_MISSING` | P1 | required-now |
| E2 | startup/resume prompt elveszti worktree-authoritative wordinget | test fail | none | `WORKTREE_PROMPT_AUTHORITY_DRIFT` | P1 | required-now |
| E3 | reviewer context refresh parancs implicit rootra esik vissza | test fail | none | `REVIEWER_REFRESH_WORKTREE_PINNING_MISSING` | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing `buildAgentCommand` launch pipeline | P1 | required-now |
| must-use | existing `startBubble` fresh/resume launch pathok | P1 | required-now |
| must-use | existing `refreshReviewerContext` respawn path | P1 | required-now |
| must-not-use | watchdog/state-machine/core escalation bevezetes ebben a taskban | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | Codex launch root pinned | worktree path adott | `buildAgentCommand(codex, worktree)` | command explicit worktree-pinninget tartalmaz | P1 | required-now |
| T2 | Claude launch root pinned | worktree path adott | `buildAgentCommand(claude, worktree)` | command explicit worktree-pinninget tartalmaz | P1 | required-now |
| T3 | Fresh start path plumbing | bubble start fresh | launch commandok generalodnak | implementer+reviewer launch mind worktree-pinned | P1 | required-now |
| T4 | Resume path plumbing | bubble start resume | launch commandok generalodnak | implementer+reviewer launch mind worktree-pinned | P1 | required-now |
| T5 | Reviewer refresh path plumbing | reviewer context refresh | respawn command generalodik | reviewer respawn worktree-pinned | P1 | required-now |
| T6 | Prompt authority startup | startup prompt render | text assert | action wording worktree-authoritative, nem ketertelmu | P1 | required-now |
| T7 | Prompt authority resume | resume prompt render | text assert | action wording worktree-authoritative, nem ketertelmu | P1 | required-now |

### 7) AC-Traceability

| Acceptance Criterion | Covered By |
|---|---|
| AC1: agent launch explicit worktree-pinned | T1, T2, T3, T4, T5 |
| AC2: startup/resume prompt worktree-authoritative | T6, T7 |
| AC3: no extra core complexity introduced | code review check + scope boundary + target_files |

## Acceptance Criteria

1. `AC1`: Agent launch command assembly explicit worktree-root pinninget hasznal fresh, resume es reviewer refresh pathokon.
2. `AC2`: Startup es resume promptban a futasi helyet egyertelmuen a bubble worktree hatarozza meg.
3. `AC3`: A task nem vezet be uj watchdog/core guard vagy state-machine komplexitast.

## L2 - Implementation Notes (Optional)

1. Agentenkent lehet eltero CLI opcio; a contract lenyege az explicit root pinning, nem egyetlen konkret flag neve.
2. Quoting legyen shell-safe olyan worktree pathokra is, ahol specialis karakter van.
3. Prompt wording legyen rovid es cselekvesre optimalizalt: "pairflow parancsokat ebbol a worktree pathbol futtasd".

## Assumptions

1. Az eseti drift root oka nagy valoszinuseggel launch/prompt ambiguity volt.
2. Ket celzott hardeninggel varhatoan elegendoen csokken a kockazat anelkul, hogy a core bonyolodna.

## Open Questions (Non-Blocking)

1. Szigoru standard: kodban kotelezo-e ugyanaz a pinning-mechanizmus minden agentre, vagy eleg az "explicit and deterministic" kovetelmeny?

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `SL1`: `buildAgentCommand` es minden relevans call-site explicit worktree pinninget ad.
2. `SL2`: startup/resume promptok worktree-authoritativek.
3. `SL3`: reviewer refresh respawn utvonalon sincs implicit cwd fallback.
4. `SL4`: a tesztek lefedik a T1-T7 matrixot.
5. `SL5`: nincs uj watchdog/core escalation logika ebben a patchben.
