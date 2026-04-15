---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase2b_remote_create_write_path_enablement_v1
title: "Remote Bubble Execution Remote Create Write-Path Enablement (Phase 2B)"
status: implementable
phase: phase2b-remote-create-write-path-enablement
target_files:
  - src/v11/application/create/createCommandContract.ts
  - src/v11/application/create/createCliOptionTypes.ts
  - src/v11/application/create/createCliOptionParser.ts
  - src/v11/application/create/createCliOptionValidation.ts
  - src/v11/application/create/createCliOptions.ts
  - src/v11/application/create/createCliRunHelpers.ts
  - src/v11/application/create/createCliRunner.ts
  - src/v11/application/create/createBubblePreparation.ts
  - src/v11/application/create/createBubbleFlowContext.ts
  - src/v11/application/create/runCreateBubbleFlow.ts
  - src/v11/application/create/createBubblePersistence.ts
  - src/v11/application/create/createCommandRuntime.ts
  - tests/cli/createCommand.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/v11/application/create/createCliRunHelpers.test.ts
  - tests/v11/application/create/createCliRunner.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Create Write-Path Enablement (Phase 2B)

## Current Codebase Check (2026-04-15)

1. A Phase 1A baseline mar lezarja a global `[remotes.<name>]` config contractot, az optional `[executor]` bubble config sectiont, valamint a `remote.json` created/started pointer es a `state-cache.json` cache authority schemajat.
2. A `bubble create` write-path jelenleg nem tud remote bubble-t letrehozni:
   - a CLI parserben nincs `--remote`,
   - a `BubbleCreateInput` nem hordoz remote alias-t,
   - a `buildBubbleConfig(...)` nem persistal `executor` metadata-t,
   - a create persistence nem ir `remote.json` created pointert.
3. A `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts` utility layer mar letezik es tud typed `remote.json` / `state-cache.json` read-write seamet adni; ezt a tasknak uj schema feltalalasa nelkul kell consume-olnia.
4. A Phase 2A local clone-topology activation mar lezart baseline, tehat a remote create write-path most mar ugyanarra az explicit workspace/runtime modellre ulhet, de runtime startot tovabbra sem aktiválhat.
5. A terv Phase 2B-je explicit operator write-path task:
   - `bubble create --remote`,
   - local executor persistence,
   - `remote.json` created-pointer init,
   - remote runtime start nelkul.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis csak a local operator write-pathot zarja le:
   - `pairflow bubble create --remote <alias>` CLI surface,
   - global remote alias lookup create idoben,
   - bubble config `executor` persistence,
   - `remote.json` created-shape irasa.
3. A task retained baseline-kent kezeli a Phase 1A schema authorityt; nem nyit uj remote artifact vagy config format valtozast.
4. A task kifejezetten nem aktivál remote runtimeot:
   - nincs SSH kapcsolat,
   - nincs remote clone path,
   - nincs `state-cache.json` init,
   - nincs started-pointer shape,
   - nincs `pairflow_sync_command` consume.
5. A 2B kimenete egy local bubble, amely remote bubble-kent van konfigurálva, de operativ allapota tovabbra is `CREATED`.

## Target File Discipline

1. A frontmatter `target_files` lista a Phase 2B maximalis elvart edit-surface-e; ettol valo eltereshez a review-ban explicit indoklas kell.
2. Preferred ownership:
   - CLI surface: `createCliOptionTypes.ts`, `createCliOptionParser.ts`, `createCliOptionValidation.ts`, `createCliOptions.ts`
   - input propagation: `createCliRunHelpers.ts`, `createCommandContract.ts`, `createCliRunner.ts`
   - create-flow orchestration: `createBubblePreparation.ts`, `createBubbleFlowContext.ts`, `runCreateBubbleFlow.ts`
   - persistence: `createBubblePersistence.ts`
3. `createCommandRuntime.ts` csak akkor nyithato meg, ha a remote alias validation vagy create-config build maskepp nem zarhato le a fenti seams-en.
4. Nem elvart edit-surface ebben a fazisban:
   - `src/config/pairflowConfig.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts`
   - barmely `start/**`, `status/**`, `list/**`, `attach/**`, `commit/**`, `merge/**`, `delete/**` consumer
5. Ha a megoldas uj shared/defaults wiringot nyitna csak azert, hogy a create write-path mukodjon, azt review-ban scope-driftkent kell kezelni, hacsak nincs ra evidence-backed compile-only kenyszer.

## L0 - Policy

### Goal

Lezarni a remote bubble local create write-pathjat ugy, hogy a felhasznalo `pairflow bubble create --remote <alias>` paranccsal explicit remote bubble-t tudjon letrehozni, mikozben:
1. a bubble local artifact scaffoldja valtozatlanul feljon,
2. a bubble config explicit executor metadata-t kap,
3. a `remote.json` created pointer letrejon,
4. de semmilyen remote runtime vagy started-state authority ne jojjon letre.

### Domain / Control Model Summary

1. Business invariant: a remote create csak remote-capable bubble konfiguraciot hozhat letre; nem allithatja azt, hogy a remote bubble mar fut vagy el is indult.
2. Control model: create idoben a remote bubble statuszat az explicit `--remote` alias, a global `[remotes.<name>]` config lookup, a persisted `bubble.toml[executor]`, es a `remote.json` created-shape egyutt hatarozza meg.
3. Read-path rule: a create flow csak a CLI `--remote` inputbol, a global Pairflow config `[remotes]` mapjabol, es a local bubble artifact pathokbol olvashat; runtime sessionbol, `state-cache.json`-bol vagy tmux/allapot projectionbol nem.
4. Forbidden fallback: tilos remote bubble authorityt visszainferalni `state-cache.json`-bol, runtime session registrybol, tmux sessionbol, worktree pathbol vagy implicit host/path pairingbol.
5. Allowed resolution path: `--remote <alias>` -> global `[remotes.<alias>]` lookup -> persistalt `[executor]` a `bubble.toml`-ba -> `remote.json` created pointer `{ kind:\"created\", host, portForwards? }`.
6. Missing-data rule: ha a remote alias hianyzik vagy nincs definialva a global configban, a create fail-closed; nincs local bubble fallback, nincs partial success read-model, es nincs olyan consume-surface, amely a reszben kiirt artifactokbol remote-ready allapotot inferalhat.
7. Phase boundary:
   - owned here: `bubble create --remote` CLI exposure, alias propagation, global config lookup, `bubble.toml[executor]` persistence, `remote.json(kind=\"created\")` write
   - explicit Phase 2C successor: `pairflow_sync_command` config contract
   - explicit Phase 2D successor: SSH start orchestration, created->started pointer transition, `state-cache.json` init
   - explicit Phase 2E/2F successor: `status` / `list` / `attach` read-model consume
   - explicit Phase 3A+ successor: approval, cleanup, merge/delete routing, recovery semantics

### Authority Boundary Map

1. Authority producer: a `bubble create` CLI + create flow, amikor explicit remote alias alapjan executor metadata-t es created pointert persistal.
2. Stored authority: `bubble.toml[executor]` es `remote.json` created-shape.
3. In-scope consumers: create CLI parser/validation, create input build path, create persistence.
4. Explicit out-of-scope consumers: `start`, `status`, `list`, `attach`, runtime session/tmux consumers, approval/cleanup routing.
5. Export surfaces closed in this phase: `no`; csak a local create write-path zarul le.

### Baseline Preservation

1. Must-preserve behaviors:
   - `bubble create` local mode tovabbra is valtozatlan marad, ha nincs `--remote`
   - a create scaffold tovabbra is megirja a `bubble.toml`, `state.json`, `transcript.ndjson`, `inbox.ndjson`, task artifact es reviewer artifact fileokat
   - a letrehozott bubble state tovabbra is `CREATED`
2. Allowed resolution paths:
   - local bubble: nincs `[executor]`, nincs `remote.json`
   - remote bubble: explicit `[executor]` + explicit `remote.json(kind=\"created\")`
3. Forbidden regression interpretations:
   - a `--remote` nem jelent automatikus `start`
   - a create task nem inicializalhat started-pointer mezoket
   - a create task nem irhat `state-cache.json`-t pusztan azert, mert remote bubble keszul
4. Replacement proof required if removed:
   - ha a created-pointer write-path kikerulne, successor tasknak explicit alternativ persisted create-time remote authorityt kell bizonyitania ugyanilyen fail-closed semantics-szal

### In Scope

1. `--remote <alias>` CLI flag parse/help/validation.
2. Remote alias tovabbitasa a `BubbleCreateInput`-ig.
3. Global Pairflow config beolvasasa remote create idoben.
4. Remote alias lookup a global `[remotes.<name>]` mapban.
5. `[executor]` persistence a `bubble.toml`-ba remote create idoben.
6. `remote.json` created-shape letrehozasa `host` + optional `portForwards` mezokkel.
7. Fail-closed create behavior invalid/missing remote alias es pointer write failure eseten.
8. Existing local create path regresszio-mentes megorzese.

### Out of Scope

1. Remote `start` wiring vagy SSH orchestration.
2. `state-cache.json` create-time init.
3. `remote.json` started-shape letrehozasa.
4. `pairflow_sync_command` parser/validator/consume.
5. `status`, `list`, `attach` remote read-model.
6. Remote lifecycle routing (`approve`, `merge`, `delete`).
7. Remote cleanup/recovery semantics.

### Safety Defaults

1. `--remote` nelkul a create retained local bubble create pathon marad.
2. Invalid vagy unknown remote alias eseten a create fail-closed hibaval all meg.
3. Remote create sikeres kimeneteben csak created-pointer johet letre; started authority nem.
4. `state-cache.json` create idoben nem johet letre.
5. A create command nem probalhat SSH reachability checket vagy host-side probe-ot.

### Success / Failure Envelope

1. Phase 2B success csak akkor allithato, ha a create result egyutt bizonyitja:
   - explicit `bubble.toml[executor]`
   - explicit `remote.json(kind=\"created\")`
   - retained local `CREATED` state
2. Ha a create scaffold egy resze mar kiirodott, de a `remote.json` created-pointer write elbukik, a command teljes kimenete tovabbra is failure; a bubble nem tekintheto ervenyes remote-created bubble-nek pusztan a megmaradt `bubble.toml` vagy mas scaffold artifact miatt.
3. Phase 2B-ben a `remote.json` write failure utan nincs uj, required-now rollback vagy partial-scaffold cleanup kovetelmeny; a fail-closed contract ebben a fazisban a terminalis command failure es a success-claim tiltasa, nem pedig a mar kiirt scaffold artifactok visszabontasa.
4. A `remote.json(kind=\"created\")` onmagaban sem jelent runtime readiness-t; start/read-model/attach semantics tovabbra is successor phase ownership.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI command contract (`bubble create --remote`)
   - `BubbleCreateInput` / create flow internal command contract
   - persisted `bubble.toml[executor]` write-path consume
   - persisted `remote.json` created-pointer write-path consume

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Split decision note:
   - a contract/schema closure mar a Phase 1A-ban megvolt, igy ez a task mar csak producer + create orchestration write-path
10. Identity/join note:
   - canonical identity path: `CLI --remote alias -> global [remotes.<alias>] -> bubble.toml[executor.remote] -> remote.json.host`
   - competing identifiers or fallback identities: `state-cache.json`, `runtime session`, `tmux session`, `remoteClonePath`; ezek ebben a fazisban nem authorityk
11. Authority/source-of-truth note:
   - canonical source: global `[remotes]` map + persisted `bubble.toml[executor]` + `remote.json(kind=\"created\")`
   - forbidden secondary sources: read-model cache, runtime session, path inference, host probing
12. Closure-budget triage:
   - closure buckets touched: `authority_producer`, `workflow_orchestration_consumers`, `persisted_authority_or_schema`
   - intentionally collapsed closures: producer + create orchestration, mert ugyanaz a bounded create code path ownershipe es nincs kulon runtime/read-model fallout
   - explicitly deferred closures: `internal_execution_consumers`, `read_model_consumers`, `cleanup_recovery_consumers`

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | remote create csak remote-configured bubble-t hozhat letre, remote-start nelkul | create success utan a bubble `CREATED` marad, es nincs started-pointer/cache side effect | P1 | required-now |
| Control model | a remote bubble create authorityjat az explicit alias lookup + persisted executor + created pointer adja | nincs implicit remote inference vagy local fallback | P1 | required-now |
| Read-path rule | create idoben csak CLI input + global config + local artifact paths olvashatok | runtime session/state-cache/tmux olvasas tilos | P1 | required-now |
| Forbidden fallback | tilos runtime vagy cache alapu remote authority | invalid remote create nem eshet vissza local bubble create-ra | P1 | required-now |
| Allowed resolution path | alias lookup utan executor + created pointer persistalhato | create path determinisztikus, probe-mentes marad | P1 | required-now |
| Missing-data rule | unknown alias vagy global config load/validate hiba eseten fail-closed | nincs partial success es nincs remote.json/state-cache maradvanyra epitett success claim | P1 | required-now |
| Phase boundary | ez a task csak create write-path; runtime/read-model tovabbra is successor | ne nyisson Phase 2C/2D/2E scope-ot | P2 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `bubble create` CLI option surface | `parseBubbleCreateCommandOptions`, `runBubbleCreateCommand`, `tests/cli/createCommand.test.ts` | additive | optional `--remote <alias>` bevezetese | downstream remote runtime commands Phase 2D+ |
| `BubbleCreateInput` / create flow input contract | `buildCreateBubbleInput`, `prepareCreateBubbleInput`, `buildBubbleConfig`, create tests | additive | optional remote alias tovabbitasa a create flowban | downstream read-model/runtime consumers successor |
| persisted remote pointer create-shape consume | `createBubblePersistence`, future status/attach/start consumers | additive | write-path enablement `remote.json(kind=\"created\")`-re | `status/list/attach/start` consume alignment successor |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| local create path executor nelkul mukodik | preserve | T3 bizonyitja, hogy `--remote` nelkul nincs `executor` es nincs `remote.json` | P1 | required-now |
| create bubble scaffold es state initialization | preserve | T3/T4 bizonyitja, hogy a standard scaffold marad | P1 | required-now |
| remote create nem ir started pointert vagy cache-t | preserve-forbid hybrid | T4/T5/T7 bizonyitja a created-only pointert es `state-cache.json` hianyat | P1 | required-now |

### 0c) Target File Discipline

| Class | Files | Rule | Reason |
|---|---|---|---|
| primary | `createCliOptionTypes.ts`, `createCliOptionParser.ts`, `createCliOptionValidation.ts`, `createCliOptions.ts`, `createCliRunHelpers.ts`, `createCommandContract.ts`, `createBubblePreparation.ts`, `createBubbleFlowContext.ts`, `runCreateBubbleFlow.ts`, `createBubblePersistence.ts` | expected edit set | itt zarhato le a CLI -> create-flow -> persistence write-path |
| conditional | `createCliRunner.ts`, `createCommandRuntime.ts` | csak akkor nyithato, ha a primer seams nem elegendoek | keep the patch narrow es reviewable |
| frozen-by-default | `src/config/pairflowConfig.ts`, `src/config/bubbleConfig.ts`, `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts`, `src/v11/application/start/**`, `src/v11/application/status/**`, `src/v11/application/list/**`, `src/v11/application/attach/**` | semantic edit nem vart ebben a taskban | retained contract vagy successor-owned surface |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/create/createCliOptionTypes.ts` | `BubbleCreateCommandOptions` | type shape | option contract | optional `remote?: string` mezot hordoz | P1 | required-now | T1 |
| CS2 | `src/v11/application/create/createCliOptionParser.ts` | `parseBubbleCreateCommandOptions(args: string[]) -> BubbleCreateCommandOptions` | CLI parse boundary | parse args options map | parse-olja a `--remote` flaget es tovabbadja a build/validation retegeknek | P1 | required-now | T1, T2 |
| CS3 | `src/v11/application/create/createCliOptions.ts` / `createCliOptionValidation.ts` | help + validation | help text / validation layer | create CLI UX boundary | a help explicit remote create opciot mutat; invalid/empty remote input fail-closed | P1 | required-now | T1, T2 |
| CS4 | `src/v11/application/create/createCommandContract.ts` / `createCliRunHelpers.ts` | create input shaping | `buildCreateBubbleInput(options, cwd) -> { repoPath, input }` | CLI-to-command seam | optional remote alias bekerul a `BubbleCreateInput` shape-be | P1 | required-now | T1, T2 |
| CS5 | `src/v11/application/create/createBubblePreparation.ts` / `createCommandRuntime.ts` | bubble config build path | `prepareCreateBubbleInput(...) -> PreparedCreateBubbleInput`, `buildBubbleConfig(input) -> BubbleConfig` | create producer seam | remote create eseten a config explicit `executor: { type:\"ssh\", remote:<alias> }` metadata-t kap | P1 | required-now | T4, T5 |
| CS6 | `src/v11/application/create/createBubbleFlowContext.ts` / `src/v11/application/create/runCreateBubbleFlow.ts` | remote config lookup | flow context dependency seam | create orchestration | remote create eseten betolti a global Pairflow configot es fail-closed validalja az alias lookupot | P1 | required-now | T2, T5 |
| CS7 | `src/v11/application/create/createBubblePersistence.ts` | `persistCreatedBubbleArtifacts(input) -> Promise<ReviewerFocusArtifactPersistResult>` | create persistence seam | after standard artifact writes | remote create eseten `writeRemotePointer(...)`-rel created-shape `remote.json` jon letre; `state-cache.json` tovabbra sem irodik | P1 | required-now | T4, T7 |
| CS8 | `tests/cli/createCommand.test.ts` / `tests/core/bubble/createBubble.test.ts` / `tests/v11/application/create/*.test.ts` | test surfaces | unit/integration-style tests | existing create verification surfaces | remote create parse, propagation, persistence, es local compatibility explicit coverage | P1 | required-now | T1-T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| create CLI options | nincs remote create flag | optional `--remote <alias>` | remote alias when flag present | absence keeps local create | additive | P1 | required-now |
| `BubbleCreateInput` | nincs remote alias | optional `remote` field | non-empty alias if present | field absent for local create | additive | P1 | required-now |
| persisted bubble config | local create nem ir `executor` metadata-t | remote create optional `[executor]` sectiont persistal | `type=\"ssh\"`, `remote=<alias>` when remote create | section absent for local create | additive, retained Phase 1A contract consume | P1 | required-now |
| `remote.json` create-time shape | create path nem irja | created pointer letrejon | `kind=\"created\"`, `host` | `portForwards` from `default_port_forwards` if configured | additive, existing Phase 1A schema consume | P1 | required-now |
| `state-cache.json` create-time behavior | nincs create-time write | nincs write tovabbra sem | N/A | N/A | retained | P1 | required-now |

Implementation notes:

1. A persisted `executor.remote` a global config aliasat hordozza, nem a raw host/user/path detailt.
2. A `remote.json` created-pointer `host` mezoje a global remote host config `host` erteket kapja, nem az alias stringet.
3. Ha a global remote configban `default_port_forwards` van, a created pointer opcionlisan `portForwards` alatt persistalhatja; ennek hianya valid.
4. `remote.json` create idoben mindig `kind: "created"` shape marad; `instanceId`, `remoteClonePath`, `tmuxSession`, `startedAt` tiltottak.
5. `state-cache.json` tovabbra is csak read-model cache artifact; Phase 2B-ben create-time nem johet letre.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI parse/help | `--remote` parse + help text | implicit remote mode inference mas flagbol | a remote mode csak explicit operator input lehet | P1 | required-now |
| global config read | Pairflow global config betoltese remote create idoben | SSH probe vagy host connectivity check | config lookup, nem runtime health-check | P1 | required-now |
| bubble config persistence | `bubble.toml` remote executor metadata-val irasa | inline host/user/path duplikacio | retained Phase 1A executor contract consume | P1 | required-now |
| local artifact persistence | created-shape `remote.json` irasa | `state-cache.json` init, started-pointer write | create only, no runtime activation | P1 | required-now |
| lifecycle state | local `CREATED` state scaffold retained | remote runtime state transition | remote create nem valthat `PREPARING_WORKSPACE` vagy `RUNNING` allapotba | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `--remote` without usable alias | CLI validation | throw | fail-fast create validation error | `CREATE_REMOTE_ALIAS_INVALID` | error | P1 | required-now |
| global config load fails during remote create | global config loader | throw | create fails; no local fallback | `PAIRFLOW_REMOTE_CONFIG_INVALID` or parse/load surface error | error | P1 | required-now |
| alias missing from global `[remotes]` map | remote alias lookup | throw | create fails closed | `BUBBLE_EXECUTOR_INVALID` | error | P1 | required-now |
| local create without `--remote` | N/A | fallback | existing local create path | `N/A` | info | P1 | required-now |
| `remote.json` write fails | `writeRemotePointer` | throw | command fails; no success result | `REMOTE_ARTIFACT_PARENT_DIR_MISSING` or write error surface | error | P1 | required-now |
| `state-cache.json` would be initialized at create time | N/A | forbid | do not write it | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | retained Phase 1A remote config/pointer schema contract | P1 | required-now |
| must-use | `loadPairflowGlobalConfig(...)`-style explicit global config loader seam, injectable create dependencykent vagy vele egyenerteku explicit reader | P1 | required-now |
| must-use | existing `writeRemotePointer(...)` utility a created pointer writehoz | P1 | required-now |
| must-not-use | SSH connect/probe, remote clone/start orchestration | P1 | required-now |
| must-not-use | `writeRemoteStateCache(...)` create pathban | P1 | required-now |
| must-not-use | started-pointer fields create pathban | P1 | required-now |
| must-not-use | runtime session, tmux, worktree vagy state-cache alapjan remote create inference | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | CLI remote flag parse/help | `bubble create` args with `--remote homelab` | parse + help text read | `remote` beolvasodik, help explicitten mutatja a `--remote <alias>` opciot | P1 | required-now | `tests/cli/createCommand.test.ts` |
| T2 | invalid remote alias syntax rejects at CLI boundary | remote flag ures vagy create alias format szinten ervenytelen | parse/runner/create flow | fail-fast validation error `CREATE_REMOTE_ALIAS_INVALID`, nincs create success | P1 | required-now | `tests/cli/createCommand.test.ts`, `tests/v11/application/create/createCliRunner.test.ts` |
| T3 | local create compatibility retained | standard local create input `--remote` nelkul | create bubble | nincs `executor`, nincs `remote.json`, a jelenlegi local scaffold retained | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T4 | remote create persists executor and created pointer | valid global config alias + remote create input | create bubble | `bubble.toml` explicit `[executor]` sectiont kap, `remote.json` letrejon `kind=\"created\"`, `host`, optional `portForwards` mezokkel, state `CREATED` marad | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T5 | remote alias lookup is exact and fail-closed | global config contains/does-not-contain named alias | create flow build/persist | csak definialt alias fogadhato el; unknown alias eseten `BUBBLE_EXECUTOR_INVALID`, nincs host/path inference es nincs local fallback | P1 | required-now | `tests/v11/application/create/createCliRunHelpers.test.ts`, `tests/core/bubble/createBubble.test.ts` |
| T6 | global config load failure is fail-closed | remote create input mellett a global Pairflow config load/parse/validate hibaval all meg | create flow build/persist | explicit `PAIRFLOW_REMOTE_CONFIG_INVALID` vagy azzal egyenerteku parse/load failure surface, nincs local fallback es nincs create success | P1 | required-now | `tests/v11/application/create/createCliRunHelpers.test.ts`, `tests/v11/application/create/createCliRunner.test.ts` |
| T7 | remote create does not initialize started runtime artifacts | valid remote create input | create bubble | nincs `state-cache.json`, nincs started-pointer field, nincs runtime activation side effect | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T8 | created pointer payload alias-resolved and created-only | valid alias with `host` and optional `default_port_forwards` | create bubble | `remote.json.host` a global config `host` erteket kapja, `portForwards` csak a configbol johet, alias string vagy path nem szivarog pointer mezobe | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T9 | remote pointer write failure is terminal | valid remote create input, de `writeRemotePointer(...)` hibat dob | create bubble | a command failure-rel zarul, nincs success result, nincs `state-cache.json`, es a review nem fogadhat el `executor`-only partial success interpretationt | P1 | required-now | `tests/core/bubble/createBubble.test.ts`, `tests/v11/application/create/createCliRunner.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a create flow global config lookupja tul sok create-specifikus wiringet hoz be, kesobb erdemes kulon `createRemoteExecutionPreparation` helperbe kiszervezni a local vs remote create branch-et.
2. [later-hardening] A Phase 2D remote start taskban erdemes explicit proofot adni arra, hogy a 2B-ben kiirt created pointer determinisztikusan valt started pointerre, cache fallback nelkul.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | A create-time remote pointer write pathra kesobb lehet kulon rollback-hardeninget adni, ha a partial artifact failurek review-ban visszajonnek | L2 | P2 | later-hardening | task authoring | csak akkor nyisd ujra, ha tenyleges partial-write recovery problema jelenik meg |

## Review Control

1. Minden findingnak tartalmaznia kell: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening kor.
3. 2. kor utan uj `required-now` csak evidence-backed `P0/P1` lehet.
4. A task nem bovithet Phase 2C/2D/2E scope-ra review kozben.
5. A `--remote` write-path nem csuszhat at runtime activationbe vagy read-model cache inicializalasba.
6. Ha a review runtime probe-ot vagy started-pointer write-ot kovetelne ebben a taskban, azt out-of-scope-kent kell visszautasitani es successor taskra iranyitani.
7. Ha a review a `frozen-by-default` surface-ek megnyitasat kerne, azt csak explicit evidence-backed compile-only kenyszer eseten szabad elfogadni.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
