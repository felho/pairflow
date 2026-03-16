---
artifact_type: task
artifact_id: task_ideation_without_explicit_task_bubble_start_phase1_v4
title: "Ideation Bubble Start Explicit Task Nelkul (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/cli/commands/bubble/create.ts
  - src/cli/commands/bubble/start.ts
  - src/cli/commands/bubble/kickoff.ts
  - src/cli/index.ts
  - src/core/bubble/createBubble.ts
  - src/core/bubble/startBubble.ts
  - src/core/bubble/paths.ts
  - src/cli/commands/agent/pass.ts
  - src/cli/commands/agent/converged.ts
  - src/core/agent/pass.ts
  - src/core/agent/converged.ts
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
  - tests/cli/passCommand.test.ts
  - tests/cli/convergedCommand.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/converged.test.ts
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

Primary outcomes:
1. Determinisztikus create/start viselkedes taskless ideation eseten.
2. Determinisztikus es egyszeri kickoff-atmenet ideation pending -> active task korre.
3. Nem-ideation flow regresszio nelkul valtozatlan marad.

### Problem Frame

A jelenlegi flow minden uj bubble-nel azonnali implementacios taskot feltetelez:
1. Task nelkul nem lehet "gondolkodo/ideation" bubble-t tisztan inditani.
2. Start automatikusan implementacios kickoffra optimalizal, ami taskless kezdesnel false-start handoff kockazat.
3. Nincs explicit, auditalhato operator command az ideationrol aktiv task korre valtasra.

Ez review-loop zajt okozhat, es gyengiti az operatori kontrollt a start fazisban.

### In Scope

1. `pairflow bubble create` additive CLI bovitese ideation moddal (task nelkul).
2. Friss bubble start flow, ami ideation esetben nem kuld automatikus implementacios kickoffot.
3. Uj explicit kickoff operator command az ideation bubble aktivalasahoz normal loopra.
4. Determinisztikus state/protocol szabalyok ideation -> active task atmenetre.
5. Dokumentacios frissites a CLI surface es workflow leirasban.
6. Tesztlefedettseg a create/start/kickoff edge case-ekre.
7. Determinisztikus handoff gate (`pass`/`converged`) ideation pending allapotban.

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

### Operational Definitions

1. `ideation bubble`: olyan bubble, ami `create` soran `--ideation` flaggel jon letre task input nelkul.
2. `ideation pending` (classification): `ideation_mode=true` es `ideation_task_pending=true`; ez osztalyozas, nem automatikus command-jogosultsag.
3. `kickoff-eligible` (command gate): `ideation pending` + lifecycle state `RUNNING` + `round=0`.
4. `kickoff`: explicit operatori parancs, ami task inputot ad, TASK envelope-ot appendel, markerallapotot normalizal, es roundot `0 -> 1` valtoztat.
5. `legacy bubble`: minden nem-ideation bubble (task inputtal create-elve), amely a mai create/start viselkedest koveti.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/create.ts` | create option parser | `parseBubbleCreateCommandOptions(args: string[]) -> BubbleCreateCommandOptions` | create CLI parse + validation | uj `--ideation` flag: task/task-file nelkul csak ekkor valid | P1 | required-now | T1,T2,T3,T16,T28 |
| CS2 | `src/core/bubble/createBubble.ts` | bubble create core | `createBubble(input: BubbleCreateInput, deps?) -> Promise<BubbleCreateResult>` | task resolve + artifact write + initial TASK append | ideation modban task placeholder artifact irasa + initial TASK envelope skip | P1 | required-now | T4,T5,T6 |
| CS3 | `src/core/bubble/startBubble.ts` | fresh start path | `startBubble(input, deps?) -> Promise<StartBubbleResult>` | fresh start kickoff message branch | ideation modban implementer kickoff "ideation mode" uzenet, nem "start implementation now" | P1 | required-now | T7,T8,T26 |
| CS4 | `src/cli/index.ts` + `src/cli/commands/bubble/*` | uj kickoff command route | `runBubbleKickoffCommand(args, cwd, deps?) -> Promise<KickoffResult>` | bubble subcommand registry | explicit kickoff command publikus CLI surface-en, `--review-artifact-type` kickoffkor nem override-olhato | P1 | required-now | T9,T10,T25,T27 |
| CS5 | `src/core/bubble/*` (uj kickoff modul) | ideation activation | `kickoffBubble(input, deps?) -> Promise<KickoffResult>` | state/protocol mutation boundary | kickoff-eligible bubble -> active task: task artifact replace, TASK envelope append, marker clear, round=1 aktiv implementer | P1 | required-now | T11,T12,T13,T15,T17,T18,T19,T20,T23,T24 |
| CS6 | `docs/pairflow-initial-design.md`, `docs/llm-doc-workflow-v1.md` | workflow docs | `updateCliAndWorkflowDocs() -> markdown_delta` | CLI surface + scenario recipes | dokumentalt ideation start + kickoff utvonal | P2 | required-now | T14 |
| CS7 | `src/core/agent/pass.ts`, `src/core/agent/converged.ts` | handoff command gating | `runPassCommand(...)` + `runConvergedCommand(...)` | ideation pending handoff block | ideation pending + `RUNNING round=0` esetben handoff invalid, determinisztikus reject | P2 | required-now | T21,T22 |

### 1a) CLI Surface and Validation Grammar

1. Create command grammar:
   - legacy mode: `pairflow bubble create --id <id> --task "<text>"|--task-file <path> ...`
   - ideation mode: `pairflow bubble create --id <id> --ideation ...` (task input nelkul)
2. Parse gate:
   - (`--task` xor `--task-file`) kotelezo, ha `--ideation` nincs.
   - (`--task` vagy `--task-file`) tiltott, ha `--ideation` be van kapcsolva.
   - `--review-artifact-type` create-time kotelezo ideation es legacy modban is.
3. Kickoff command grammar:
   - `pairflow bubble kickoff --id <id> (--task "<text>" xor --task-file <path>) [--repo <path>]`
4. Kickoff parse gate:
   - task input kotelezo es pontosan egy forras engedett (`xor`).
   - command csak kickoff-eligible bubble-re ervenyes.
   - `--review-artifact-type` kickoff parancsban nem elfogadott; artifact type immutable a create-time ertekhez kepest.
5. CLI help/docs consistency:
   - `create --help` es `kickoff --help` leiras explicit tartalmazza a fenti gate-eket.
   - docs example-ek nem keverhetik a legacy es ideation inputmodot.

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `bubble create` task input | kotelezo (`--task` vagy `--task-file`) | ideation flaggel task optional | `id`, `repo`, `base`, `review-artifact-type` | `ideation` (default `false`), `task`, `task-file` | additive | P1 | required-now |
| ideation marker contract | nincs explicit marker | bubble config/state metadata jelzi ideation pendinget | create utan `ideation_mode=true`, `ideation_task_pending=true`; kickoff success utan `ideation_task_pending=false` | `ideation_started_at`, `ideation_kicked_off_at` | additive | P1 | required-now |
| ideation mode normalization | nincs | kickoff utani history-policy explicit | `ideation_mode` kickoff utan is `true` marad provenance/history markerkent | `ideation_origin` | additive | P2 | required-now |
| review artifact type policy | kickoffkor nem tisztazott | create-time immutable policy | create-time `review_artifact_type` kickoff utan is valtozatlan | kickoff parser unknown/forbidden option diagnostika | additive | P2 | required-now |
| kickoff CLI contract | nincs | explicit operator command task beadashoz | `id`, (`task` xor `task-file`) | `repo` | additive | P1 | required-now |
| kickoff state contract | nincs | RUNNING round=0 -> RUNNING round=1 guarded mutation | `expected_state=RUNNING`, `expected_round=0`, `active_agent=implementer`, `active_role=implementer` | `last_command_at` | additive | P1 | required-now |
| protocol contract | create always appendel TASK | ideation create nem appendel TASK; kickoff appendel | kickoffkor pontosan 1 db `TASK` envelope | `metadata.source` | additive | P1 | required-now |

### 2d) KickoffResult Interface Contract

`kickoffBubble(...)` minimalis visszateresi szerzodes:
1. Required fields minden eredmenynel:
   - `ok: boolean`
   - `bubble_id: string`
   - `reason_code: string | null`
2. Success shape (`ok=true`) invariansok:
   - `reason_code = null`
   - `state_before.round = 0`, `state_after.round = 1`
   - `markers_after.ideation_task_pending = false`
   - `protocol.task_envelope_appended = true` (exactly once)
3. Failure shape (`ok=false`) invariansok:
   - `reason_code` kotelezo es nem ures
   - `state_changed = false`
   - `protocol.task_envelope_appended = false`
   - `markers_after` megegyezik `markers_before` (no partial marker write)
4. CLI/core tesztek a negativ pathokon kotelezoen assertaljak a `reason_code` mezo explicit erteket.

### 2b) Ideation Placeholder Artifact Contract

`createBubble` ideation modban determinisztikus placeholder task artifactot ir:
1. `task.md` artifact letezik mar create utan is (file-presence invarians).
2. Placeholder tartalom minimum kovetelmeny:
   - explicit jeloles, hogy ideation mod es kickoffig nincs aktiv implementacios task,
   - kickoff utmutatas (`pairflow bubble kickoff --id <id> ...`) canonical formatban,
   - metadata/source jeloles placeholder eredetre (`ideation_placeholder` vagy azzal egyenerteku fix token).
3. Kickoff siker eseten placeholder artifactot aktiv task tartalomra csereli a rendszer.
4. Kickoff hiba eseten placeholder tartalom valtozatlan marad.
5. Legacy create path nem ir placeholder tartalmat.

### 2c) State and Round Invariants

1. Ideation create utan `CREATED` allapot marad, `round=0` bootstrapolhato startra.
2. Ideation start utan:
   - lifecycle state `RUNNING`,
   - `round=0`,
   - active owner implementer marad, de implementation TASK meg nincs.
3. Kickoff siker utan:
   - lifecycle state `RUNNING`,
   - `round=1`,
   - active owner implementer,
   - marker postcondition: `ideation_task_pending=false`,
   - `ideation_mode=true` retained history markerkent,
   - `round_role_history` tartalmazza a kickoff altal nyitott aktiv kort.
4. Kickoff fail eseten nincs reszleges transition:
   - sem round, sem active owner, sem transcript nem modosulhat.
5. Legacy bubble invarians:
   - create/start viselkedes es round-inditas valtozatlan (`round=1` start path).

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble artifacts | task artifact placeholder/replace, reviewer-focus artifact update | manual transcript/state file edit outside guardolt API | all writes stateStore/protocol API-n menjenek | P1 | required-now |
| Transcript | kickoffkor elso TASK append, exactly-once | ideation create soran synthetic TASK append vagy kickoff duplikalt append | explicit user kickoff a trigger | P1 | required-now |
| Runtime startup prompts | ideation-aware implementer kickoff text | implementacios kickoff kuldese ideation pending alatt | csokkenti false start loopot | P1 | required-now |
| Lifecycle states | meglovo state-ek hasznalata | uj `IDEATING` lifecycle state Phase 1-ben | komplexitas es regresszio kockazat csokkentes | P1 | required-now |

Constraint: uj state nelkul is teljesulnie kell az operatori UX celnak.
Pure-by-default rule: ahol nincs explicit side effect, a logika tisztan parse/validation eredmenyt adjon.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| create task nelkul, de `--ideation` hianyzik | CLI parser | throw | command reject | IDEATION_TASK_REQUIRED | error | P1 | required-now |
| create-ben `--ideation` + (`--task` es/vagy `--task-file`) konfliktus | CLI parser | throw | command reject | IDEATION_TASK_INPUT_CONFLICT | error | P1 | required-now |
| kickoffban `--review-artifact-type` override probalkozas | kickoff CLI parser | throw | command reject; create-time artifact type immutable marad | IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE | error | P2 | required-now |
| kickoff nem ideation bubble-re fut | kickoff core | throw | explicit state/metadata hiba | IDEATION_KICKOFF_NOT_ALLOWED | error | P1 | required-now |
| kickoff ideation bubble-re futna, de state nem `RUNNING` | kickoff core + state reader | throw | command reject; state valtozatlan | IDEATION_KICKOFF_REQUIRES_RUNNING | error | P2 | required-now |
| kickoff ideation bubble-re futna, state `RUNNING` es `round=0`, de pending marker false/inconsistent | kickoff core + state reader | throw | command reject; state valtozatlan | IDEATION_KICKOFF_NOT_ELIGIBLE | error | P2 | required-now |
| kickoff task input ures/invalid | task resolver | throw | command reject | IDEATION_KICKOFF_TASK_INVALID | error | P1 | required-now |
| kickoff mar aktiv task korre futna (`round>=1`) | kickoff core + state reader | throw | command reject (idempotens vedes) | IDEATION_ALREADY_ACTIVE | error | P1 | required-now |
| kickoff kozben state fingerprint mismatch | state store | throw | no partial transition; retry with fresh state | IDEATION_KICKOFF_STATE_CONFLICT | warn | P1 | required-now |
| `pass` ideation pending alatt (`RUNNING`, `round=0`) | `src/core/agent/pass.ts` gate | throw/result reject | handoff elutasitva, state/protocol side-effect nelkul | IDEATION_PASS_BLOCKED | warn | P2 | required-now |
| `converged` ideation pending alatt (`RUNNING`, `round=0`) | `src/core/agent/converged.ts` gate | throw/result reject | handoff elutasitva, state/protocol side-effect nelkul | IDEATION_CONVERGED_BLOCKED | warn | P2 | required-now |
| ideation metadata parse warning | config/state reader | fallback | legacy task-required path ervenyesul | IDEATION_METADATA_PARSE_WARNING | warn | P2 | required-now |

### 4a) Kickoff Error Precedence (Deterministic)

Kickoff validation sorrend (azonos inputon mindig ugyanaz a reason code):
1. `round >= 1` -> canonical `IDEATION_ALREADY_ACTIVE` (elsosege van).
2. `state != RUNNING` -> `IDEATION_KICKOFF_REQUIRES_RUNNING`.
3. `state == RUNNING && round == 0`, de pending marker false/inconsistent -> `IDEATION_KICKOFF_NOT_ELIGIBLE`.
4. Task payload invalid/ures -> `IDEATION_KICKOFF_TASK_INVALID` (CLI parse/core task resolver szinten).

Megjegyzes:
1. A `IDEATION_ALREADY_ACTIVE` code precedence felulirja az altalanos non-eligible osztalyt, ha mindket feltetel latszolag fennallna.
2. `IDEATION_KICKOFF_NOT_ELIGIBLE` kizarolag nem-aktiv, de kickoffra nem alkalmas eseteket fed.

### 4b) Metadata Parse Warning - User-visible CLI Behavior

`IDEATION_METADATA_PARSE_WARNING` fallback eseten a CLI-path viselkedes:
1. `bubble create`:
   - warning uzenet stderr-re (`IDEATION_METADATA_PARSE_WARNING`),
   - legacy task-required gate ervenyesul,
   - exit code a legacy validacios eredmenyt koveti (`0` ha valid, `1` ha nem valid).
2. `bubble start`:
   - warning uzenet stderr-re ugyanazzal a reason code-dal,
   - startup path legacy (nem-ideation) kickoff branchre esik vissza,
   - exit code `0`, ha start sikeres.
3. `bubble kickoff`:
   - warning uzenet stderr-re ugyanazzal a reason code-dal,
   - command deterministic reject (`IDEATION_KICKOFF_NOT_ALLOWED`),
   - exit code `1`.

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

Negativ-path teszt szabaly:
1. Minden negativ tesztesetnel kotelezo explicit `reason_code` assertion.
2. Minden negativ tesztesetnel kotelezo no-partial-write assertion (`state/protocol/marker` valtozatlansag vagy determinisztikus side-effect-mentesseg).

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | create legacy compatibility | nincs `--ideation`, van `--task` | create parse | jelenlegi validacio valtozatlanul mukodik | P1 | required-now | unit test |
| T2 | create ideation happy path | `--ideation`, task input nincs | create parse | parser elfogadja, create core ideation flaget kap | P1 | required-now | unit test |
| T3 | create ideation conflict (`--task`) | `--ideation` + `--task` | create parse | determinisztikus reject `IDEATION_TASK_INPUT_CONFLICT` | P1 | required-now | unit test |
| T4 | ideation create protocol behavior | ideation create input | createBubble | task placeholder iras megtortenik, initial TASK envelope nem irodik | P1 | required-now | core test |
| T5 | normal create protocol non-regression | nem ideation create | createBubble | initial TASK envelope tovabbra is irodik | P1 | required-now | core test |
| T6 | ideation marker persistence | ideation create | createBubble | config/state markerek determinisztikusan perzisztalodnak | P1 | required-now | core test |
| T7 | start fresh ideation messaging | ideation pending bubble, state CREATED | startBubble | RUNNING round=0, ideation kickoff message megy implementer pane-re | P1 | required-now | core test |
| T8 | start fresh non-ideation non-regression | normal bubble, state CREATED | startBubble | RUNNING round=1, jelenlegi implementacios kickoff marad | P1 | required-now | core test |
| T9 | kickoff command parse | kickoff args task texttel | kickoff parse | command elfogadott, task resolver meghivhato | P1 | required-now | unit test |
| T10 | kickoff invalid invocation (task payload) | kickoff task input hianyzik/ures | kickoff execute | determinisztikus reject `IDEATION_KICKOFF_TASK_INVALID`, nincs partial write | P1 | required-now | unit/core test |
| T11 | kickoff state transition + marker normalization | ideation bubble RUNNING round=0 | kickoff execute | round 1-re all, implementer aktiv ownership beallitva, `ideation_task_pending=false`, `ideation_mode=true` retained, round_role_history bejegyzes keszul | P1 | required-now | core test |
| T12 | kickoff protocol append | ideation bubble kickoff | kickoff execute | pontosan egy TASK envelope appendelodik kickoffkor | P1 | required-now | core test |
| T13 | kickoff conflict safety | concurrent state valtozas kickoff alatt | kickoff execute | determinisztikus reject `IDEATION_KICKOFF_STATE_CONFLICT`, nincs felkesz transition | P1 | required-now | core test |
| T14 | docs alignment | docs frissitve | docs review | CLI surface + workflow recipe tartalmazza az uj ideation+kickoff utvonalat | P2 | required-now | doc diff |
| T15 | kickoff idempotency reject | bubble mar aktiv task korben van (`round>=1`) | kickoff execute | determinisztikus reject `IDEATION_ALREADY_ACTIVE`, nincs plusz TASK append | P1 | required-now | core test |
| T16 | create ideation conflict (`--task-file`) | `--ideation` + `--task-file` | create parse | explicit conflict hiba (`IDEATION_TASK_INPUT_CONFLICT`) | P2 | required-now | unit test |
| T17 | kickoff legacy bubble reject | legacy bubble (`ideation_mode=false`) | kickoff execute | determinisztikus reject `IDEATION_KICKOFF_NOT_ALLOWED`, nincs partial write | P2 | required-now | core test |
| T18 | kickoff non-RUNNING reject | ideation marker true, de state `CREATED` vagy mas non-RUNNING | kickoff execute | determinisztikus reject `IDEATION_KICKOFF_REQUIRES_RUNNING`, nincs partial write | P2 | required-now | core test |
| T19 | placeholder replace on kickoff success | ideation placeholder artifact jelen van, kickoff sikeres | kickoff execute | placeholder task artifact aktiv task tartalomra cserelodik | P2 | required-now | core test |
| T20 | placeholder stable on kickoff failure | ideation placeholder artifact jelen van, kickoff hiba (pl. state conflict) | kickoff execute | determinisztikus reject `IDEATION_KICKOFF_STATE_CONFLICT`; placeholder task artifact valtozatlan marad | P2 | required-now | core test |
| T21 | pass blocked in ideation pending | bubble `RUNNING`, `round=0`, `ideation_task_pending=true` | `pairflow pass` path fut | handoff reject `IDEATION_PASS_BLOCKED`, nincs valid handoff | P2 | required-now | core/cli test |
| T22 | converged blocked in ideation pending | bubble `RUNNING`, `round=0`, `ideation_task_pending=true` | `pairflow converged` path fut | handoff reject `IDEATION_CONVERGED_BLOCKED`, nincs valid handoff | P2 | required-now | core/cli test |
| T23 | kickoff precedence on active round | kickoff inputnal `round>=1` es marker/state keverten invalid is lehet | kickoff execute | canonical reason code `IDEATION_ALREADY_ACTIVE` (nem `...NOT_ELIGIBLE`) | P2 | required-now | core test |
| T24 | kickoff non-eligible non-active path | state `RUNNING`, `round=0`, pending marker false/inconsistent | kickoff execute | determinisztikus reject `IDEATION_KICKOFF_NOT_ELIGIBLE`, nincs partial write | P2 | required-now | core test |
| T25 | kickoff review-artifact-type override reject | kickoff command `--review-artifact-type` opcioval | kickoff parse/execute | determinisztikus reject `IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE` | P2 | required-now | cli/unit test |
| T26 | metadata parse warning on start path | ideation metadata parse warning triggerel | `bubble start` | stderr warning reason code `IDEATION_METADATA_PARSE_WARNING`; legacy start path; siker eseten exit `0` | P2 | required-now | cli/core test |
| T27 | metadata parse warning on kickoff path | ideation metadata parse warning triggerel | `bubble kickoff` | stderr warning reason code `IDEATION_METADATA_PARSE_WARNING`; deterministic reject `IDEATION_KICKOFF_NOT_ALLOWED`; exit `1` | P2 | required-now | cli/core test |
| T28 | metadata parse warning on create path | ideation metadata parse warning triggerel create gate-nel | `bubble create` | stderr warning reason code `IDEATION_METADATA_PARSE_WARNING`; legacy create gate outcome (valid=0, invalid=1) | P2 | required-now | cli/unit test |

## Acceptance Criteria (Binary)

1. AC1: `pairflow bubble create --ideation` mukodik task input nelkul es csak ebben az esetben.
2. AC2: Ideation create nem appendel initial TASK envelope-ot.
3. AC3: Ideation bubble start utan state RUNNING marad, de round=0 (active implementer contexttel), implementacios kickoff nelkul.
4. AC4: Uj `pairflow bubble kickoff` command task inputtal aktiv task korra valt (`round=1`) es TASK envelope-ot appendel.
5. AC5: Kickoff csak kickoff-eligible bubble-re engedelyezett (`RUNNING && round=0 && ideation_task_pending=true`), mas esetben determinisztikus reject.
6. AC6: Normal (nem ideation) bubble create/start viselkedes nem regresszal.
7. AC7: Dokumentacio tartalmazza az uj ideation flow-t es explicit kimondja, hogy nincs uj lifecycle state Phase 1-ben.
8. AC8: Kickoff nem idempotens transition; mar aktiv task korben determinisztikusan rejectel es nem okoz duplikalt TASK appendet.
9. AC9: Kickoff sikeres vegrehajtasa utan marker normalizacio determinisztikus (`ideation_task_pending=false`), mikozben `ideation_mode` retained history marker marad.
10. AC10: Placeholder artifact semantikaja determinisztikus: kickoff sikerre cserelodik, kickoff hibara valtozatlan marad.
11. AC11: Ideation pending (`RUNNING`, `round=0`, pending marker) alatt `pairflow pass` es `pairflow converged` nem adhat ervenyes handoffot.
12. AC12: Kickoff error precedence determinisztikus, es `round>=1` eseten canonical reason code mindig `IDEATION_ALREADY_ACTIVE`.
13. AC13: `KickoffResult` success/failure shape explicit es tesztelheto reason-code/state/protocol invariansokkal.
14. AC14: `--review-artifact-type` create-time immutable policy explicit; kickoff override determinisztikusan rejectelt.
15. AC15: Metadata parse fallback CLI viselkedes (warning + exit/outcome) parancsonkent explicit es tesztelt.
16. AC16: Negativ-path tesztek explicit reason-code assertiont kovetelnek.

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T2,T3,T16 |
| AC2 | T4 |
| AC3 | T7 |
| AC4 | T9,T11,T12 |
| AC5 | T17,T18,T24 |
| AC6 | T5,T8 |
| AC7 | T14 |
| AC8 | T15 |
| AC9 | T6,T11 |
| AC10 | T19,T20 |
| AC11 | T21,T22 |
| AC12 | T15,T23,T24 |
| AC13 | T11,T13,T15,T20,T24 |
| AC14 | T25 |
| AC15 | T26,T27,T28 |
| AC16 | T3,T10,T13,T15,T16,T17,T18,T20,T21,T22,T23,T24,T25,T27 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Keszulhet kulon `bubble task set` parancs, amely kickoff utan is enged safe task update-et explicit policyval.
2. [later-hardening] UI oldalon kulon ideation badge/state hint vezethetobb lehet.
3. [later-hardening] Ideation session transcript summarybe kerulhet kulon operator note blokk.

## Assumptions

1. Ideation fazis alatt az operator/coding agent normal fejlesztesi munkat vegez, de Pairflow handoff commandokat nem hasznal addig, amig kickoff nem tortenik.
2. A `RUNNING round=0` allapot technikailag elfogadhato, mert a jelenlegi agent command gate-ek mar most blokkoljak a handoffot `round < 1` esetben.
3. Phase 1 cel az alacsony kockazatu additive bovitese, nem teljes lifecycle-modell ujratervezes.

## Open Questions

1. Nem-blocking: ideation startnal reviewer pane teljesen passziv legyen-e, vagy minimalis stand-by promptot kapjon?

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
3. kickoff state-vedelem (conflict + mar aktiv kor) determinisztikus es side-effect mentes (AC5, AC8),
4. marker normalizacio kickoff utan determinisztikus (`ideation_task_pending=false`, `ideation_mode` retained history marker) (AC9),
5. placeholder replacement/failure invariansok teljesulnek (AC10),
6. ideation pending alatt handoff gate-ek determinisztikusan blokkolnak (`pass`, `converged`) (AC11),
7. kickoff error precedence es reason-code canonicalitas determinisztikus (`IDEATION_ALREADY_ACTIVE` elsoseg aktiv roundnal) (AC12),
8. kickoff return szerzodes implementalhato es tesztelheto invariansokat ad (`KickoffResult`) (AC13),
9. review artifact type policy kickoffban immutable es deterministic reject policyval definialt (AC14),
10. metadata parse fallback user-visible CLI kimenete explicit parancsonkent (AC15),
11. docs canonicalan frissitettek az uj utvonalra (AC7),
12. nincs unresolved `P0/P1 + required-now` finding.
