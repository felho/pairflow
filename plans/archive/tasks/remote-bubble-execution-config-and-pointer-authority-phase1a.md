---
artifact_type: task
artifact_id: task_remote_bubble_execution_config_and_pointer_authority_phase1a_v1
title: "Remote Bubble Execution Config and Pointer Authority (Phase 1A)"
status: implementable
phase: phase1a-config-pointer-authority
target_files:
  - src/types/bubble.ts
  - src/config/pairflowConfig.ts
  - src/config/bubbleConfig.ts
  - src/v11/shared/bubble/bubblePaths.ts
  - src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts
  - tests/config/pairflowConfig.test.ts
  - tests/config/bubbleConfig.test.ts
  - tests/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Config and Pointer Authority (Phase 1A)

## Current Codebase Check (2026-04-11)

1. `src/config/pairflowConfig.ts` jelenleg csak top-level global key/value parse-ot tamogat; TOML sectionok, igy `[remotes.<name>]` sincsenek tamogatva.
2. `src/config/bubbleConfig.ts` es `src/types/bubble.ts` ma nem hordoznak explicit executor metadata contractot; a canonical bubble config local/worktree-defaultokra epul.
3. `src/v11/shared/bubble/bubblePaths.ts` ma nem ismer remote pointer vagy remote cache artifact pathokat.
4. A kodbase jelenleg nem tartalmaz canonical read/write/validate utilityt `remote.json` vagy `state-cache.json` artifactokra.
5. A repo jelenlegi canonical bubble config persistence-e `bubble.toml`; a `docs/remote-bubble-execution.md` `config.json` peldai design-szintu szemantikai illusztraciok, nem Phase 1A file-format atnevezesi mandate.
6. A jelenlegi parser/validator retegek nem adnak explicit remote-shape active-reject closure-t sem partial started-pointer kombinaciokra, sem cache/pointer szerepkonfliktusokra.
7. Emiatt a remote execution elso bounded foundation szelete a config/schema/pointer/cache authority lezarasa; sem SSH transport, sem remote lifecycle routing nem tartozik meg ide.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis csak a canonical config es local artifact authorityt zarja le:
   - global remotes config schema,
   - bubble executor metadata contract,
   - `remote.json` pointer-only schema,
   - `state-cache.json` cache-only schema,
   - remote artifact path helpers es validation utilities.
3. A canonical bubble config file ebben a fazisban tovabbra is `bubble.toml`; a feladat nem rename-olja `config.json`-ra, es nem nyit migracios scope-ot.
4. A `remote.json` es `state-cache.json` additive artifactok; nem valtjak ki a `bubble.toml` vagy `state.json` jelenlegi authorityjat.
5. A `--remote` CLI flag, a remote create/start wiring, az SSH transport, a status/list/attach consume, es barmilyen lifecycle routing kulon downstream task ownership.

## L0 - Policy

### Goal

Lezarni a remote execution minimal foundation authorityjat ugy, hogy a kodbase explicit es tesztelt contractot kapjon:
1. hol vannak a remote host definiciok,
2. hogyan jelenik meg a bubble executor metadata a canonical bubble configban,
3. mi a pointer-only `remote.json`,
4. mi a cache-only `state-cache.json`,
5. es milyen artifact/path seamre epulhet majd a kesobbi remote delivery.

### In Scope

1. `~/.pairflow/config.toml` `[remotes.<name>]` global schema + validator.
2. Bubble config optional `[executor]` section canonical contractja.
3. `remote.json` created-shape es started-shape schema authority.
4. `state-cache.json` schema authority.
5. Remote artifact path helper-ek es read/write/validate utilityk.
6. Partial started-pointer field kombinaciok explicit rejectalasa (`instanceId`, `remoteClonePath`, `tmuxSession` identity trio + `startedAt` timestamp csak egyutt engedett).
7. `state-cache.json` pointer mezoktol valo tisztan tartasa (`host`, `instanceId`, `remoteClonePath`, `tmuxSession`, `startedAt`, `portForwards` nem cache mezok).
8. Backward-compatible local bubble behavior megorzese, ha nincs executor metadata.

### Out of Scope

1. `pairflow bubble create --remote ...` CLI flag vagy create-time persistence wiring.
2. SSH / SCP / rsync helper layer.
3. Remote clone provisioning, remote start orchestration, version-check, origin-check.
4. `status`, `list`, `attach`, `approve`, `merge`, `clean` remote routing consume.
5. Remote reboot recovery behavior implementation.
6. `bubble.toml` -> `config.json` storage rename vagy barmilyen config file migration.
7. Sandboxing, container runtime vagy cloud executor implementation.

### Safety Defaults

1. Ha a global configban nincs `[remotes]`, a jelenlegi local behavior valtozatlan marad.
2. Ha a global config `[remotes]` szekcioja invalid, a parser fail-fast hibaval all meg; nincs silent ignore.
3. Ha a bubble configban nincs `[executor]`, a bubble local bubble-nek minosul; nincs implicit remote inference.
4. `remote.json` pointer-only marad; nem tarolhat canonical runtime state-et.
5. `state-cache.json` cache-only marad; hianya vagy stale allapota nem authoralhat runtime truthot.
6. Runtime/tmux/worktree/repo-registry adatbol nem szabad remote bubble authorityt visszainferalni ebben a fazisban.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - global config contract (`~/.pairflow/config.toml`)
   - bubble config contract (`bubble.toml`)
   - local persisted remote artifact contract (`remote.json`, `state-cache.json`)
3. Phase-guard:
   - a task explicitten nem authorizal config-format vagy bubble persistence file rename-t; csak a meglevo `bubble.toml` contract boviteset.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Split decision note:
   - ez mar a plan altal kikanyaritott foundation task; delivery es activation tudatosan ki vannak huzva
10. Identity/join note:
   - canonical identity path: `bubbleId -> bubbleDir -> bubble.toml[executor] -> remote.json(pointer) -> state-cache.json(cache)`
   - competing identifiers or fallback identities: `worktreePath`, repo registry path, runtime session record, `tmuxSession`; ezek nem lehetnek remote authority fallbackek
11. Authority/source-of-truth note:
   - canonical source: `[remotes]` a global configban, optional `[executor]` a bubble configban, pointer-only `remote.json`, cache-only `state-cache.json`
   - forbidden secondary sources: tmux/session registry, worktree lookup, inferred host/path pairing explicit persisted contract nelkul

## Sandbox Compatibility Gate

Reference: `docs/architecture/sandbox-compatibility-gate.md`

1. `SG1 Runtime Boundary Preservation`
   - megfeleles: a task csak config es artifact authorityt vezet be; nem huzza ossze a workspace/start/relay/attach/cleanup fogalmakat egyetlen host command shape-re
2. `SG2 Host Path Non-Authority`
   - megfeleles: `remoteClonePath` csak a started pointer optional implementation fieldje; a canonical identity nem redukalodik puszta host pathra
3. `SG3 Host-Tool Decoupling`
   - megfeleles: `tmuxSession` nem lehet egyeduli runtime identity, es a task nem vezet be `tmux attach`-hoz kotott szemantikat
4. `SG4 Wrapper-Ready Execution`
   - megfeleles: a task nem vezet be raw SSH command string epitest; csak schema/path utility seamet zar le
5. `SG5 Explicit Non-Goals for Isolation`
   - explicit non-goalok:
     - sandbox runtime wrapper
     - container executor
     - filesystem/network policy injection
     - attach implementation
     - cleanup implementation

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | remote config + artifact types | type/interface layer | canonical type layer | explicit `PairflowRemoteHostConfig`, optional `BubbleExecutorConfig`, `BubbleRemotePointer`, `BubbleRemoteStateCache` types | P1 | required-now | T1, T3, T6, T7 |
| CS2 | `src/config/pairflowConfig.ts` | global config parser/validator | `parsePairflowGlobalConfigToml(input: string) -> PairflowGlobalConfig`, `validatePairflowGlobalConfig(input: unknown) -> ValidationResult<PairflowGlobalConfig>` | global config boundary | existing top-level keys retained, plus `[remotes.<name>]` schema parse + validate | P1 | required-now | T1, T2 |
| CS3 | `src/config/bubbleConfig.ts` | bubble config parser/render/validator | `parseBubbleConfigToml(input: string) -> BubbleConfig`, `renderBubbleConfigToml(config: BubbleConfig) -> string`, `validateBubbleConfig(input: unknown) -> ValidationResult<BubbleConfig>` | bubble config boundary | optional `[executor]` section roundtrip + validation a meglevo `bubble.toml` persistence contracton belul; missing section = local bubble compatibility | P1 | required-now | T3, T4, T5 |
| CS4 | `src/v11/shared/bubble/bubblePaths.ts` | bubble artifact path expansion | `getBubblePaths(repoPathInput: string, bubbleId: string) -> BubblePaths` | bubble artifact path helper | explicit `remotePointerPath` es `remoteStateCachePath` pathok jelennek meg a canonical bubble path contractban | P1 | required-now | T6 |
| CS5 | `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts` | remote artifact utility layer | `readRemotePointer(path) -> Promise<BubbleRemotePointer | null>`, `writeRemotePointer(path, value) -> Promise<void>`, `readRemoteStateCache(path) -> Promise<BubbleRemoteStateCache | null>`, `writeRemoteStateCache(path, value) -> Promise<void>` | new artifact utility seam | missing file tolerated as `null`; invalid content fail-closed; no inference from other artifacts; write helpers require pre-existing bubble dir, do not create parent dirs, es post-validation persistence seamkent viselkednek (typed input semantic validation ownership nem itt van, write-time nincs masodik validation/coercion pass) | P1 | required-now | T6, T7 |
| CS6 | `tests/config/pairflowConfig.test.ts` | global config tests | unit tests | existing test surface | `[remotes]` valid/invalid parse paths explicit coverage | P1 | required-now | T1, T2 |
| CS7 | `tests/config/bubbleConfig.test.ts` | bubble config tests | unit tests | existing test surface | optional `[executor]` parse/render/validate + local compatibility retained | P1 | required-now | T3, T4, T5 |
| CS8 | `tests/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.test.ts` | remote artifact tests | unit tests | new test surface (new file under `tests/v11/infrastructure/artifact/bubble/`) | created vs started pointer, cache validity, missing file fallback, invalid JSON fail-closed, partial started-shape reject | P1 | required-now | T6, T7 |

### 1.1) Target File Responsibility Lock

| File | Owns in Phase 1A | Explicitly not owned in Phase 1A | Why this lock matters |
|---|---|---|---|
| `src/types/bubble.ts` | remote host config, executor metadata, pointer/cache type authority | runtime transport/result payload types | type-level closure ne nyisson Phase 2A runtime shape-et |
| `src/config/pairflowConfig.ts` | `[remotes.<name>]` parse + validate | SSH resolution, remote host probing, command execution | global config boundary maradjon parser-only |
| `src/config/bubbleConfig.ts` | optional `[executor]` parse/render/validate `bubble.toml`-ban | create/start consume wiring, remote lookup side effects | bubble config task ne csusszon at activationbe |
| `src/v11/shared/bubble/bubblePaths.ts` | additive `remotePointerPath`, `remoteStateCachePath` | workspace policy vagy remote clone path derivation | path contract legyen deterministic, de ne inventaljon remote topologyt |
| `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts` | pointer/cache read-write-validate seam | SSH fetch, live remote refresh, implicit fallback inference | artifact utility maradjon local persistence seam |
| listed `tests/**` | parser/validator/path/artifact coverage | end-to-end remote lifecycle tests | Phase 1A ne vallaljon meg remote orchestration evidence-t |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Global remote host config | no `[remotes]` support | explicit `[remotes.<name>]` object map | `host`, `repo_base` | `user`, `pairflow_command`, `default_port_forwards` | additive; missing `[remotes]` remains valid | P1 | required-now |
| Bubble executor config | no executor metadata | optional `[executor]` section | `type="ssh"`, `remote` when section present | future executor-specific fields are out-of-scope, not parser-accepted yet | additive; missing section = local | P1 | required-now |
| `remote.json` created shape | absent | pointer-only minimal shape | `host` | `portForwards` | additive new artifact | P1 | required-now |
| `remote.json` started shape | absent | pointer-only started shape | `host`, `instanceId`, `remoteClonePath`, `tmuxSession`, `startedAt` | `portForwards` | additive new artifact | P1 | required-now |
| `state-cache.json` | absent | cache-only shape | `lastCheckedAt`, `state`, `round`, `maxRounds` | `implementerStatus`, `reviewerStatus` | additive new artifact | P1 | required-now |

Implementation notes:

1. A global configban a remote map key-je (`myserver`) a canonical bubble executor `remote` ref-je; a bubble config nem duplikalja a host/socket details-t.
2. A bubble config `executor` section optional; local bubblesnel hianya canonical, nem legacy debt.
3. A `remote.json` ket shape-je explicit union; created-shape es started-shape kozotti kulonbseget nem path presence heuristika, hanem schema-level contract rogzitse.
4. A `state-cache.json` nem tarthat persisted authority mezot, sem host-level runtime control fieldet.
5. A phase1a task nem vezeti be a future `docker` vagy mas executor shape parser-level acceptancejet; csak az extensibility iranyat tartja nyitva az optional `[executor]` seam miatt.
6. A task a bubble executor persistence-et a meglevo `bubble.toml` formatumban zarja le; a design doc `config.json` szemantikai peldai nem irhatjak felul ezt a repo-szintu authorityt.
7. A pointer/cache type authority `src/types/bubble.ts`-ben parser-levelen indul, de a konkret artifact-shape bizonyitek review-szinten elsosorban a `T6`/`T7` utility tesztfeluleten jelenik meg.
8. A `[executor].remote` referential integrityje ebben a fazisban semantic-only contract: a `bubbleConfig` parser/validator csak azt zarja le, hogy nem ures string remote ref van jelen, a tenyleges `[remotes.<name>]` lookup/letezes-ellenorzes Phase 2A create/start consume ownership.
9. A write helper-ek negative runtime contractja ebben a fazisban filesystem-boundaryra korlatozodik (peldaul hianyzo parent dir); semantic invalid-input reject nem utility-responsibility, hanem a parser/type boundary feladata.

### 2.1) Bubble Executor Contract

| Field | Phase 1A Closure | Forbidden Alternative | Downstream Consumer |
|---|---|---|---|
| `[executor].type` | exact supported literal: `ssh` amikor a section jelen van | `docker`, `cloud`, `local`, free-form string | Phase 2A create/start wiring |
| `[executor].remote` | non-empty string remote ref; a global `[remotes.<name>]` letetezes-ellenorzese semantic-only, kesobbi consumer felelosseg | host/user/path inline duplikalasa a bubble configban, create-time cross-config validation ebben a fazisban | Phase 2A create/start wiring |
| missing `[executor]` | canonical local bubble | implicit synthetic local executor object | existing local lifecycle |

### 2.2) Remote Pointer / Cache Authority Matrix

| Artifact | Allowed Role | Forbidden Role | Canonical Meaning | Downstream Consumer |
|---|---|---|---|---|
| `bubble.toml[executor]` | bubble execution mode + remote ref | remote runtime state cache | bubble remote-capable-e egyaltalan | Phase 2A create/start, Phase 2B consume routing |
| `remote.json` | pointer-only remote location/instance contract | runtime state authority | hol van a remote bubble es milyen pointer-shape aktiv | Phase 2A create/start, Phase 2B status/list/attach |
| `state-cache.json` | local cached remote state | remote pointer or authority | utolso lokalisan ismert remote state snapshot | Phase 2B status/list |

### 2.3) Shape Closure Rules

| Shape | Must Include | May Include | Must Reject | Reason |
|---|---|---|---|---|
| `remote.json` created-shape | `host` | `portForwards` | `instanceId`, `remoteClonePath`, `tmuxSession`, `startedAt` barmely reszhalmaza | created vs started allapot ne heuristikabol deruljon ki |
| `remote.json` started-shape | `host`, `instanceId`, `remoteClonePath`, `tmuxSession`, `startedAt` | `portForwards` | az identity trio + `startedAt` barmely hianyos kombinacioja | explicit schema-level closure kell a pointer authorityhoz |
| `state-cache.json` | `lastCheckedAt`, `state`, `round`, `maxRounds` | `implementerStatus`, `reviewerStatus` | `host`, `instanceId`, `remoteClonePath`, `tmuxSession`, `startedAt`, `portForwards` | cache-only role ne mosodjon pointer authorityval |
| `[executor]` section | `type="ssh"`, `remote` | nincs Phase 1A optional extra field | unsupported executor literal (`docker`, `cloud`, `local`, free-form string), barmilyen unknown extra field, inline host/user/path duplikalas | bubble config csak remote refet hordozhat, host detaileket nem; local bubble-t a missing section reprezentalja, nem explicit `type=\"local\"` |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| config parse/render | global es bubble TOML schema bovites | CLI flag wiring, runtime activation | contract-only foundation | P1 | required-now |
| local file utilities | remote pointer/cache artifact read/write helpers | create/start/status/attach command invocation | no SSH, no tmux, no git side effect; existing bubble dir required, write helper nem csinal `mkdir`-t | P1 | required-now |
| path helper | uj artifact pathok bevezetese | runtime/worktree path policy atirasa | `worktreePath` retained, uj remote paths additivek | P1 | required-now |
| bubble persistence format | `bubble.toml` contract bovites | `config.json` rename, migration, dual-write mode | design/doc pelda nem valhat implementation mandate-te | P1 | required-now |

Constraint: ha itt nincs explicit engedelyezett network/process side effect, az implementacio nem vezethet be SSH/tmux/git runtime behaviort.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `[remotes.<name>]` schema | global config parser | throw | actionable config validation error | `PAIRFLOW_REMOTE_CONFIG_INVALID` | error | P1 | required-now |
| unsupported global config TOML section shape | global config parser | throw | fail-fast parse error | `PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR` | error | P1 | required-now |
| invalid `[executor]` section | bubble config validator | throw | actionable bubble config validation error | `BUBBLE_EXECUTOR_INVALID` | error | P1 | required-now |
| missing `[executor]` section | bubble config read | fallback | treat as local bubble | `N/A` | info | P1 | required-now |
| unknown extra field az `[executor]` sectionben | bubble config validator | throw | strict reject; Phase 1A nem fogad el future executor-specific mezoket | `BUBBLE_EXECUTOR_INVALID` | error | P1 | required-now |
| `remote.json` file missing | artifact utility | result | return `null`; no remote inference | `N/A` | info | P1 | required-now |
| `state-cache.json` file missing | artifact utility | result | return `null`; caller decides stale/missing cache behavior later | `N/A` | info | P1 | required-now |
| invalid `remote.json` content | artifact utility | throw | fail-closed invalid pointer error | `REMOTE_POINTER_INVALID` | warn | P1 | required-now |
| invalid `state-cache.json` content | artifact utility | throw | fail-closed invalid cache error | `REMOTE_STATE_CACHE_INVALID` | warn | P1 | required-now |
| write target parent dir missing | artifact utility write path | throw | caller must provision the bubble dir first; no implicit mkdir side effect | `REMOTE_ARTIFACT_PARENT_DIR_MISSING` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v1.md` mint bounded phase authority | P1 | required-now |
| must-use | `docs/architecture/sandbox-compatibility-gate.md` task-level gate sourcekent | P1 | required-now |
| must-not-use | SSH helper, tmux helper, git clone/start wiring ebben a taskban | P1 | required-now |
| must-not-use | worktree/runtime session/tmux session alapjan remote authority inference | P1 | required-now |
| must-not-use | `remote.json`-ba runtime state cache mezok irasa | P1 | required-now |
| must-not-use | `state-cache.json`-ba host-level pointer vagy control mezok irasa | P1 | required-now |
| must-not-use | `docs/remote-bubble-execution.md` `config.json` peldainak file-rename mandate-kent ertelmezese | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | valid `[remotes]` parse | global config with one and multiple named remotes | parse/validate global config | remotes map typed formaban beolvasodik; existing top-level `attach_launcher` / `open_command` behavior retained | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T2 | invalid remote config reject | malformed section, missing required field, invalid port list | parse/validate global config | explicit fail-fast validation error; nincs silent ignore | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T3 | bubble executor type authority | type/interface compile-time + runtime validate input, beleertve inline host/user/path duplikalast es unknown extra fieldet probalo `[executor]` payloadot | validate bubble config | csak optional ssh executor elfogadott; absence = local; unsupported executor literal, unknown extra field es inline host/user/path duplikalas explicit rejectalodik; a remote ref global lookupja nem itt, hanem kesobbi consumerben zarodik le | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T4 | bubble config parse/render roundtrip with executor | bubble TOML containing `[executor]` | parse -> render -> parse | executor section roundtrip stabil, es a rendered forma tovabbra is TOML `[executor]` section marad a meglevo `bubble.toml` contracton belul | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T5 | local compatibility without executor | existing bubble TOML samples without `[executor]` | parse/validate bubble config | current local bubbles regresszio nelkul validak maradnak, es a canonical bubble persistence surface tovabbra is `bubble.toml` marad (nincs `config.json` alias/dual-write expectation ebben a fazisban) | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T6 | remote pointer/cache artifact utility golden paths | created pointer, started pointer, cache snapshot JSON | read/write utilityk futnak | created es started shape-ek validak; path helpers az uj artifact pathokat adjak vissza | P1 | required-now | `tests/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.test.ts` |
| T7 | remote artifact invalid/missing paths | missing file, invalid JSON, wrong field combination, partial started-shape, cacheben pointer mezok, hianyzo parent dir write-pathnal | read/write utility fut | missing file `null`, invalid content fail-closed reasonnel dobodik; nincs fallback inference, partial started-shape rejectalodik, cache pointer mezokkel invalid, beleertve `startedAt` tiltast is; write helper parent dir hianyaban fail-closed marad; semantic invalid write-input coverage nem itt, hanem a parser/type boundary ownershipben jelenik meg | P1 | required-now | `tests/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.test.ts` |

## Acceptance Criteria

1. AC1: A global config explicit `[remotes.<name>]` schema authorityt kap, backward-compatible top-level config megtartassal.
2. AC2: A bubble config optional executor seamet kap, de local bubble compatibility valtozatlan marad.
3. AC3: A remote pointer es cache artifactok canonical schema authorityt kapnak, es szerepuk explicitten el van valasztva.
4. AC4: A bubble path contract uj remote artifact pathokkal bovul, anelkul hogy runtime activation logika belecsuszik.
5. AC5: Invalid remote config, invalid executor config, invalid pointer/cache file fail-fast vagy fail-closed modon kezelodik.
6. AC6: A foundation task nem vezet be raw SSH/tmux/git runtime behavior-t, es megfelel a sandbox compatibility gate-nek.
7. AC7: A Phase 1A task a meglevo `bubble.toml` persistence authorityt boviti, es nem nyit `config.json` rename vagy migration scope-ot.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests / Evidence |
|---|---|---|
| AC1 | CS1, CS2, CS6 | T1, T2 |
| AC2 | CS1, CS3, CS7 | T3, T4, T5 |
| AC3 | CS1, CS5, CS8 | T6, T7 |
| AC4 | CS4, CS5, CS8 | T6 |
| AC5 | CS1, CS2, CS3, CS5 | T2, T3, T7 |
| AC6 | CS2, CS3, CS4, CS5 | first-class evidence: `Sandbox Compatibility Gate` review; supporting bounded-seam evidence only: T6/T7 |
| AC7 | CS3, `bubble persistence format` side-effects row | T4, T5, plus supporting document evidence: `Current Codebase Check`, `Implementation Target Decision`, `Side Effects Contract` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kesobb kulon `HealthSnapshot` vagy `lastKnownReasonCode` mezofamily johet a `state-cache.json`-ba, ha a Phase 2B consume ezt tenylegesen igenyli.
2. [later-hardening] Future executor type union (`docker`, `cloud`) kulon taskban nyithato meg, amikor mar valos downstream runtime contract is tartozik hozza.
3. [later-hardening] Ha a remote artifact utility layer tul sok validation/logging policyt kezdene hordozni, erdemes kulon `shared/remoteExecution` schema helper retegbe emelni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Future executor union bovitese `ssh`-n tul | L2 | P2 | later-hardening | plan Phase 3+/future executor work | kulon task, csak valos downstream runtime contracttal |
| H2 | Cache health snapshot vocabulary | L2 | P3 | later-hardening | Phase 2B consume foresight | csak akkor nyitni, ha a list/status UI konkretan igenyli |
| H3 | JSON schema export / tooling support | L2 | P3 | later-hardening | implementation polish | kulon tooling taskban kezelni |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha a task local bubble compatibilityt megtori.
3. P1 regresszio, ha a task `remote.json` es `state-cache.json` szerepet osszekeveri.
4. P1 regresszio, ha a task elkezd remote runtime behaviort vagy raw SSH couplingot bevezetni.
5. P2 regresszio, ha a bubble config executor seam nem marad jovoallovon bovithetonek, de kozben meg nem vallalt future type-okat is parser-level contractta tesz.

## Spec Lock

Ez a task artifact `IMPLEMENTABLE`, mert:

1. bounded foundation scope-ra van vagva,
2. a config/schema/path/artifact authority explicit es tesztelheto,
3. a remote delivery es activation tudatosan kulon downstream ownership marad,
4. a sandbox compatibility gate explicitten kiertekelt es nem csak advisory note.
