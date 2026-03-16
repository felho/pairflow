---
artifact_type: task
artifact_id: task_ideation_without_explicit_task_bubble_start_phase1_v1
title: "Ideation Bubble Start Explicit Task Nelkul (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/cli/commands/bubble/create.ts
  - src/cli/commands/bubble/start.ts
  - src/cli/index.ts
  - src/core/bubble/createBubble.ts
  - src/core/bubble/startBubble.ts
  - src/core/bubble/paths.ts
  - src/core/reviewer/reviewerBrief.ts
  - src/core/state/transitions.ts
  - src/core/state/stateSchema.ts
  - src/types/bubble.ts
  - docs/pairflow-initial-design.md
  - docs/llm-doc-workflow-v1.md
  - tests/cli/createCommand.test.ts
  - tests/cli/bubbleStartCommand.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/core/bubble/startBubble.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/llm-doc-workflow-v1.md
owners:
  - "felho"
---

# Task: Ideation Bubble Start Explicit Task Nelkul (Phase 1)

## L0 - Policy

### Goal

Lehessen bubble-t inditani explicit task instrukcio nelkul, hogy az operator kulon worktree/branch-ben tudjon ideate-olni.  
Kesoibb ponton explicit kickoff paranccsal lehessen atvaltani a normal implementer-reviewer loopra.

### In Scope

1. `pairflow bubble create` additive CLI bovitese ideation moddal (task nelkul).
2. Friss bubble start flow, ami ideation esetben nem kuld automatikus implementacios kickoffot.
3. Uj explicit kickoff operator command az ideation bubble aktivalasahoz normal loopra.
4. Determinisztikus state/protocol szabalyok ideation -> active task atmenetre.
5. Dokumentacios frissites a CLI surface es workflow leirasban.
6. Tesztlefedettseg a create/start/kickoff edge case-ekre.

### Out of Scope

1. Uj bubble lifecycle allapot bevezetese (pl. `IDEATING`) Phase 1-ben.
2. Meta-review policy vagy reviewer severity policy attervezese.
3. Runtime watchdog policy ujradefinialasa.
4. Bubble merge/commit approval policy valtoztatasa.
5. UI-first workflow attervezes (terminal CLI marad canonical).

### Safety Defaults

1. Ideation bubble default fail-safe: addig nincs aktiv implementacios kor, amig explicit kickoff nem tortenik.
2. Ideation allapotban `pairflow pass`/`pairflow converged` ne tudjon ervenyes handoffot adni.
3. Kickoff utan a flow teljesen a jelenlegi standard RUNNING round=1 viselkedest kovesse.
4. Unknown/missing ideation metadata eseten fallback a jelenlegi task-kotelezo viselkedesre.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. A valtozas additive CLI/runtime workflow bovitest vezet be meglovo bubble modellben.
3. Nincs DB/API/event/auth/config product szerzodes modositas.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/create.ts` | create option parser | `parseBubbleCreateCommandOptions(args: string[]) -> BubbleCreateCommandOptions` | create CLI parse + validation | uj `--ideation` flag: task/task-file nelkul csak ekkor valid | P1 | required-now | T1,T2,T3 |
| CS2 | `src/core/bubble/createBubble.ts` | bubble create core | `createBubble(input: BubbleCreateInput, deps?) -> Promise<BubbleCreateResult>` | task resolve + artifact write + initial TASK append | ideation modban task placeholder artifact irasa + initial TASK envelope skip | P1 | required-now | T4,T5,T6 |
| CS3 | `src/core/bubble/startBubble.ts` | fresh start path | `startBubble(input, deps?) -> Promise<StartBubbleResult>` | fresh start kickoff message branch | ideation modban implementer kickoff "ideation mode" uzenet, nem "start implementation now" | P1 | required-now | T7,T8 |
| CS4 | `src/cli/index.ts` + `src/cli/commands/bubble/*` | uj kickoff command route | `runBubbleKickoffCommand(args, cwd, deps?) -> Promise<KickoffResult>` | bubble subcommand registry | explicit kickoff command publikus CLI surface-en | P1 | required-now | T9,T10 |
| CS5 | `src/core/bubble/*` (uj kickoff modul) | ideation activation | `kickoffBubble(input, deps?) -> Promise<KickoffResult>` | state/protocol mutation boundary | ideation pending -> active task: task artifact replace, TASK envelope append, round=1 aktiv implementer | P1 | required-now | T11,T12,T13 |
| CS6 | `docs/pairflow-initial-design.md`, `docs/llm-doc-workflow-v1.md` | workflow docs | `updateCliAndWorkflowDocs() -> markdown_delta` | CLI surface + scenario recipes | dokumentalt ideation start + kickoff utvonal | P2 | required-now | T14 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `bubble create` task input | kotelezo (`--task` vagy `--task-file`) | ideation flaggel task optional | `id`, `repo`, `base`, `review-artifact-type`, `ideation` | `task`, `task-file` | additive | P1 | required-now |
| ideation marker contract | nincs explicit marker | bubble config/state metadata jelzi ideation pendinget | `ideation_mode=true`, `ideation_task_pending=true` | `ideation_started_at` | additive | P1 | required-now |
| kickoff CLI contract | nincs | explicit operator command task beadashoz | `id`, (`task` xor `task-file`) | `repo` | additive | P1 | required-now |
| kickoff state contract | nincs | RUNNING round=0 -> RUNNING round=1 guarded mutation | `expected_state=RUNNING`, `expected_round=0`, `active_agent=implementer`, `active_role=implementer` | `last_command_at` | additive | P1 | required-now |
| protocol contract | create always appendel TASK | ideation create nem appendel TASK; kickoff appendel | `TASK` envelope kickoffkor | `metadata.source` | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble artifacts | task artifact placeholder/replace, reviewer-focus artifact update | manual transcript/state file edit outside guardolt API | all writes stateStore/protocol API-n menjenek | P1 | required-now |
| Transcript | kickoffkor elso TASK append | ideation create soran synthetic TASK append | explicit user kickoff a trigger | P1 | required-now |
| Runtime startup prompts | ideation-aware implementer kickoff text | implementacios kickoff kuldese ideation pending alatt | csokkenti false start loopot | P1 | required-now |
| Lifecycle states | meglovo state-ek hasznalata | uj `IDEATING` lifecycle state Phase 1-ben | komplexitas es regresszio kockazat csokkentes | P1 | required-now |

Constraint: uj state nelkul is teljesulnie kell az operatori UX celnak.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| create task nelkul, de `--ideation` hianyzik | CLI parser | throw | command reject | IDEATION_TASK_REQUIRED | error | P1 | required-now |
| create-ben `--ideation` + (`--task` es/vagy `--task-file`) konfliktus | CLI parser | throw | command reject | IDEATION_TASK_INPUT_CONFLICT | error | P1 | required-now |
| kickoff nem ideation bubble-re fut | kickoff core | throw | explicit state/metadata hiba | IDEATION_KICKOFF_NOT_ALLOWED | error | P1 | required-now |
| kickoff task input ures/invalid | task resolver | throw | command reject | IDEATION_KICKOFF_TASK_INVALID | error | P1 | required-now |
| kickoff kozben state fingerprint mismatch | state store | throw | no partial transition; retry with fresh state | IDEATION_KICKOFF_STATE_CONFLICT | warn | P1 | required-now |
| ideation metadata parse warning | config/state reader | fallback | legacy task-required path ervenyesul | IDEATION_METADATA_PARSE_WARNING | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | meglovo `writeStateSnapshot` expected fingerprint/state guard | P1 | required-now |
| must-use | meglovo `appendProtocolEnvelope` TASK append mechanizmus | P1 | required-now |
| must-use | meglovo task/reviewer-focus artifact normalizalo utilok | P1 | required-now |
| must-not-use | kozvetlen JSON file mutation `state.json`/`transcript.ndjson` bypass API | P1 | required-now |
| must-not-use | uj lifecycle state bevezetes (`IDEATING`) ebben a fazisban | P1 | required-now |
| must-not-use | destructive git/history command workaround a feature miatt | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | create legacy compatibility | nincs `--ideation`, van `--task` | create parse | jelenlegi validacio valtozatlanul mukodik | P1 | required-now | unit test |
| T2 | create ideation happy path | `--ideation`, task input nincs | create parse | parser elfogadja, create core ideation flaget kap | P1 | required-now | unit test |
| T3 | create ideation conflict | `--ideation` + `--task` | create parse | explicit conflict hiba | P1 | required-now | unit test |
| T4 | ideation create protocol behavior | ideation create input | createBubble | task placeholder iras megtortenik, initial TASK envelope nem irodik | P1 | required-now | core test |
| T5 | normal create protocol non-regression | nem ideation create | createBubble | initial TASK envelope tovabbra is irodik | P1 | required-now | core test |
| T6 | ideation marker persistence | ideation create | createBubble | config/state markerek determinisztikusan perzisztalodnak | P1 | required-now | core test |
| T7 | start fresh ideation messaging | ideation pending bubble, state CREATED | startBubble | RUNNING round=0, ideation kickoff message megy implementer pane-re | P1 | required-now | core test |
| T8 | start fresh non-ideation non-regression | normal bubble, state CREATED | startBubble | RUNNING round=1, jelenlegi implementacios kickoff marad | P1 | required-now | core test |
| T9 | kickoff command parse | kickoff args task texttel | kickoff parse | command elfogadott, task resolver meghivhato | P1 | required-now | unit test |
| T10 | kickoff invalid invocation | kickoff task nelkul vagy rossz state | kickoff execute | explicit hiba, nincs partial write | P1 | required-now | unit/core test |
| T11 | kickoff state transition | ideation bubble RUNNING round=0 | kickoff execute | round 1-re all, implementer aktiv ownership beallitva, round_role_history bejegyzes keszul | P1 | required-now | core test |
| T12 | kickoff protocol append | ideation bubble kickoff | kickoff execute | pontosan egy TASK envelope appendelodik kickoffkor | P1 | required-now | core test |
| T13 | kickoff conflict safety | concurrent state valtozas kickoff alatt | kickoff execute | fingerprint mismatch eseten nincs felkesz transition | P1 | required-now | core test |
| T14 | docs alignment | docs frissitve | docs review | CLI surface + workflow recipe tartalmazza az uj ideation+kickoff utvonalat | P2 | required-now | doc diff |

## Acceptance Criteria (Binary)

1. AC1: `pairflow bubble create --ideation` mukodik task input nelkul es csak ebben az esetben.
2. AC2: Ideation create nem appendel initial TASK envelope-ot.
3. AC3: Ideation bubble start utan state RUNNING marad, de round=0 (active implementer contexttel), implementacios kickoff nelkul.
4. AC4: Uj `pairflow bubble kickoff` command task inputtal aktiv task korra valt (`round=1`) es TASK envelope-ot appendel.
5. AC5: Kickoff csak ideation pending bubble-re engedelyezett, mas esetben determinisztikus reject.
6. AC6: Normal (nem ideation) bubble create/start viselkedes nem regresszal.
7. AC7: Dokumentacio tartalmazza az uj ideation flow-t es explicit kimondja, hogy nincs uj lifecycle state Phase 1-ben.

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T2,T3 |
| AC2 | T4 |
| AC3 | T7 |
| AC4 | T9,T11,T12 |
| AC5 | T10,T13 |
| AC6 | T5,T8 |
| AC7 | T14 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Keszulhet kulon `bubble task set` parancs, amely kickoff utan is enged safe task update-et explicit policyval.
2. [later-hardening] UI oldalon kulon ideation badge/state hint vezethetobb lehet.
3. [later-hardening] Ideation session transcript summarybe kerulhet kulon operator note blokk.

## Assumptions

1. Ideation fazis alatt az operator/coding agent normal fejlesztesi munkat vegez, de Pairflow handoff commandokat nem hasznal addig, amig kickoff nem tortenik.
2. A `RUNNING round=0` allapot technikailag elfogadhato, mert a jelenlegi agent command gate-ek mar most blokkoljak a handoffot `round < 1` esetben.
3. Phase 1 cel az alacsony kockazatu additive bovitese, nem teljes lifecycle-modell ujratervezes.

## Open Questions

1. Nem-blocking: kickoff engedjen-e opcionis `--review-artifact-type` override-ot, vagy maradjon immutable a create-time ertek?
2. Nem-blocking: ideation startnal reviewer pane teljesen passziv legyen-e, vagy minimalis stand-by promptot kapjon?

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Dedicated lifecycle state (`IDEATING`) v1.1-ben formalizalasa | L2 | P2 | later-hardening | architecture follow-up | only if telemetry igazolja, hogy round=0 modell nem eleg atlathato |
| H2 | Kickoff dry-run mode + preview | L2 | P3 | later-hardening | operator UX feedback | add optional `--dry-run` validation path |
| H3 | UI ideation workflow controls | L2 | P3 | later-hardening | UI roadmap | align with UI PRD lifecycle action matrix |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Blocker csak `P0/P1 + required-now + L1` lehet.
3. `P2/P3` vagy L2 jellegu megjegyzes default `later-hardening`.
4. Max 2 L1 hardening kor.
5. Uj `required-now` item 2. kor utan csak evidence-backed `P0/P1` lehet.

## Spec Lock

A task `IMPLEMENTABLE`, ha:
1. create/start/kickoff contract determinisztikus es tesztelt (AC1-AC6),
2. ideation flow nem tor regressziot a normal bubble flow-ban,
3. docs canonicalan frissitettek az uj utvonalra (AC7),
4. nincs unresolved `P0/P1 + required-now` finding.
