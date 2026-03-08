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

Csokkentse a bubble/worktree drift kockazatat ket celzott, Phase 1-ben minimalis hardeninggel:
1. Agent launch root determinisztikus pinning a bubble worktree-re (nincs implicit cwd fuggoseg).
2. Startup/resume prompt-path utasitasok tisztazasa ugy, hogy a worktree legyen az egyetlen autoritativ futasi hely parancsfutatasra.

### Canonical Terminology

1. `worktree-authoritative`: minden vegrehajtasi utasitas explicit a bubble worktree pathra mutat.
2. `root pinning`: launch command expliciten beallitja a futasi rootot a bubble worktree-re (agent-specifikus mechanizmus megengedett).
3. `implicit cwd`: olyan launch, amely csak aktualis shell cwd-re hagyatkozik explicit root beallitas nelkul.

### In Scope

1. Agent launch command hardening:
   - `buildAgentCommand` input/osszeallitas ugy valtozik, hogy explicit worktree root pinninget epitsen a launch parancsba.
   - Fresh start, resume start, es reviewer refresh/respawn utvonal ugyanazt az explicit root-pinning contractot kovesse.
2. Prompt hardening:
   - Implementer startup/resume promptok tartalmazzak az explicit "pairflow parancsokat ebbol a worktree pathbol futtasd" jellegu utasitast.
   - Repository path megjelenhet informacios celbol, de nem lehet parancsfutatasra vonatkozo alternativ rootkent interpretalhato.
3. Tesztek:
   - Agent command construction tesztelje a root-pinning viselkedest.
   - Startup/resume prompt tesztek vedjek a worktree-authoritative wordinget es a ketertelmuseg-mentesseget.

### Out of Scope

1. Watchdog/core guard bevezetes a "main dirty + bubble clean" mintara.
2. Runtime state machine vagy protocol viselkedes modositas.
3. Bubble lifecycle policy atalakitasa.
4. Uj automatikus stop/escalation mechanizmus.

### Safety Defaults

1. Root-pinning fail-closed szemlelet: ha explicit worktree pinning nem biztositott, a regressziot tesztnek kell blokkolnia.
2. Prompt-level utasitas mindig worktree-centric legyen.
3. Nincs behavioral policy-bovites; csak launch root + prompt clarity hardening.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary:
   - agent launch command assembly
   - reviewer resume respawn command assembly
   - implementer startup-resume prompt wording

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Section | Contract Delta | Expected Result | AC Link | Priority | Timing |
|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/agentCommand.ts` | `buildAgentCommand` | explicit worktree root pinning input + command assembly | launch command nem implicit cwd-re hagyatkozik | AC1 | P1 | required-now |
| CS2 | `src/core/bubble/startBubble.ts` | fresh start `buildAgentCommand(...)` hivasok | worktree path atadasa implementer + reviewer launchhoz | bubble start agent pane-ek determinisztikus rooton indulnak | AC1 | P1 | required-now |
| CS3 | `src/core/bubble/startBubble.ts` | resume start `buildAgentCommand(...)` hivasok | worktree path atadasa implementer + reviewer launchhoz | resume utan sem csuszik vissza implicit rootra | AC1 | P1 | required-now |
| CS4 | `src/core/runtime/reviewerContext.ts` | `refreshReviewerContext` | respawn reviewer command is worktree-pinned | context refresh nem tud main-rootra driftelni | AC1 | P1 | required-now |
| CS5 | `src/core/bubble/startBubble.ts` | implementer startup/resume prompt text | explicit worktree-authoritative imperative wording | promptban egyertelmu futasi hely | AC2 | P1 | required-now |
| CS6 | `tests/core/runtime/agentCommand.test.ts` | uj/updated tests | root-pinning presence + shell-parseable quoting | regresszio ellen vedett command assembly | AC1 | P1 | required-now |
| CS7 | `tests/core/bubble/startBubble.test.ts` | startup/resume prompt assertions | explicit worktree-authoritative wording checks | prompt drift hamar lebukik | AC2 | P1 | required-now |
| CS8 | `tests/core/runtime/reviewerContext.test.ts` | respawn command assertions | reviewer respawn is worktree-pinned | refresh path drift regresszio fogasa | AC1 | P1 | required-now |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|
| Agent command launch root | implicit shell cwd | explicit worktree pinning | `agentName`, `bubbleId`, `worktreePath`, `startupPrompt?` | backward-compatible launch flow, erosebb determinisztika | P1 | required-now |
| Reviewer refresh respawn root plumbing | respawn cwd a runtime session `worktreePath` ertekebol jon, de launch command pinning explicititasa nem garantalt | respawn pathon is explicit worktree-pinned launch command | `bubbleId`, `sessionsPath`, `bubbleConfig.agents.reviewer`, runtime session `worktreePath`, `reviewerStartupPrompt?` | backward-compatible refresh flow, determinisztikus root | P1 | required-now |
| Startup prompt path guidance | repository+worktree kevert framing | worktree-authoritative action text | explicit "pairflow parancsokat ebbol a worktree pathbol futtasd" | wording-only, no runtime policy change | P1 | required-now |
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
| T1 | Codex launch root pinned | codex + worktree path adott | `buildAgentCommand` generalodik | codex launch command explicit worktree pinninget tartalmaz (nincs implicit cwd fuggoseg) | P1 | required-now |
| T2 | Claude launch root pinned | claude + worktree path adott | `buildAgentCommand` generalodik | claude launch command explicit worktree pinninget tartalmaz (nincs implicit cwd fuggoseg) | P1 | required-now |
| T3 | Fresh start path plumbing | bubble start fresh | implementer + reviewer launch command generalodik | mindket launch command explicit worktree-pinned | P1 | required-now |
| T4 | Resume path plumbing | bubble start resume | implementer + reviewer launch command generalodik | mindket launch command explicit worktree-pinned | P1 | required-now |
| T5 | Reviewer refresh path plumbing | reviewer context refresh + runtime session worktreevel | reviewer respawn command generalodik | reviewer respawn worktree-pinned, main-root drift nelkul | P1 | required-now |
| T6 | Prompt authority startup | implementer startup prompt render | text assert | explicit worktree execution imperative jelen van es nem ketertelmu | P1 | required-now |
| T7 | Prompt authority resume | implementer resume prompt render | text assert | explicit worktree execution imperative jelen van es nem ketertelmu | P1 | required-now |

### 7) AC-Traceability

| Acceptance Criterion | Call-site Coverage | Test Coverage | Spec Lock Coverage |
|---|---|---|---|
| AC1: agent launch explicit worktree-pinned | CS1, CS2, CS3, CS4 | T1, T2, T3, T4, T5 | SL1, SL3, SL4 |
| AC2: startup/resume prompt worktree-authoritative | CS5 | T6, T7 | SL2, SL4 |
| AC3: no extra core complexity introduced | scope boundary + dependency constraints + out-of-scope | review-time scope audit | SL5 |

## Acceptance Criteria

1. `AC1`: Agent launch command assembly explicit worktree-root pinninget hasznal fresh, resume es reviewer refresh pathokon.
2. `AC2`: Implementer startup es resume promptban a parancsfutatas helyet egyertelmuen a bubble worktree hatarozza meg.
3. `AC3`: A task nem vezet be uj watchdog/core guard vagy state-machine komplexitast.

## L2 - Implementation Notes (Optional)

1. Agentenkent lehet eltero CLI opcio; a contract lenyege az explicit es determinisztikus root pinning, nem egyetlen konkret flag neve.
2. Quoting legyen shell-safe olyan worktree pathokra is, ahol specialis karakter van.
3. Prompt wording legyen rovid es cselekvesre optimalizalt: "pairflow parancsokat ebbol a worktree pathbol futtasd".
4. A `Repo: ... Worktree: ...` formatumu tajekoztato sor maradhat, de nem helyettesitheti az explicit worktree execution utasitast.

## Assumptions

1. Az eseti drift root oka nagy valoszinuseggel launch/prompt ambiguity volt.
2. Ket celzott hardeninggel varhatoan elegendoen csokken a kockazat anelkul, hogy a core bonyolodna.

## Decision Log (Resolved)

1. Nem kotelezo ugyanaz a pinning-mechanizmus minden agentre; kotelezo az explicit es determinisztikus worktree root pinning minden launch/respawn utvonalon.
2. Ebben a Phase 1 taskban a prompt hardening acceptance scope az implementer startup/resume promptokra kotelezo; reviewer prompt wording itt nem kulon acceptance criterion.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `SL1` (AC1): `buildAgentCommand` es minden relevans call-site explicit worktree pinninget ad (`CS1-CS4`).
2. `SL2` (AC2): implementer startup/resume promptok worktree-authoritativek (`CS5`, `T6`, `T7`).
3. `SL3` (AC1): reviewer refresh respawn utvonalon sincs implicit cwd fallback (`CS4`, `T5`).
4. `SL4` (AC1, AC2): tesztlefedettseg legalabb `T1-T7` matrix szerint.
5. `SL5` (AC3): nincs uj watchdog/core escalation vagy state-machine policy logika ebben a patchben.
