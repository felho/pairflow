---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase2d_remote_ssh_start_activation_v1
title: "Remote Bubble Execution Remote SSH Start Activation (Phase 2D)"
status: implementable
phase: phase2d-remote-ssh-start-activation
target_files:
  - src/v11/application/start/startCliRunner.ts
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandContext.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandDefaults.ts
  - src/v11/application/start/startCommandDependencyDefaults.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandRuntime.ts
  - src/v11/application/start/startCommandRemoteExecution.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleStart.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/v11/application/start/startCliEntrypointParity.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/start.contract.test.ts
  - tests/contracts/v11/cases/start/start-remote-created-v11.case.json
  - tests/contracts/v11/cases/start/start-remote-sync-hook-warning-v11.case.json
  - tests/contracts/v11/cases/start/start-remote-preflight-missing-origin-v11.case.json
  - tests/contracts/v11/cases/start/start-remote-attach-rejected-v11.case.json
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote SSH Start Activation (Phase 2D)

## Current Codebase Check (2026-04-16)

1. A `Phase 2B` retained baseline mar lezarta a remote create write-pathot:
   - a bubble `bubble.toml[executor]` metadataja persistalodik,
   - a `remote.json(kind="created")` create-time pointer letrejon,
   - de a remote runtime tovabbra sem indul el.
2. A `Phase 2C` retained baseline mar lezarta a `pairflow_sync_command` global config contractot:
   - a `PairflowRemoteHostConfig` mar hordozza az optional `pairflow_sync_command` mezot,
   - a parser/validator/load boundary ezt mar fail-closed modon kezeli,
   - a hook consume/invoke ownership viszont tovabbra sincs implementalva.
3. A `Phase 1A` retained baseline mar lezarja a local remote artifact authorityt:
   - a `remote.json` created es started shape-je typed/validated,
   - a `state-cache.json` cache-only schemaja typed/validated,
   - a pointer es cache szerepe explicitten el van valasztva.
4. A jelenlegi `start` flow tovabbra is local runtime topologyra epul:
   - local workspace bootstrap,
   - local runtime session ownership claim,
   - local tmux launch,
   - local `commands.bootstrap` futtatas a launch workspace-en.
   Remote executor branch jelenleg nincs.
5. A jelenlegi CLI `pairflow bubble start` surface csak opt-in `--attach` flaget ismer; defaultban nem attach-ol. Nincs public `--no-attach` flag, es ennek Phase 2D-ben sem kell uj surface-kent megjelennie.
6. A remote `status/list/attach` read-model consume, valamint a remote approval/cleanup routing tovabbra is successor-only marad.

## Parent Plan Fit / Stable Sequencing

1. A task a parent plan `Phase 2C -> Phase 2D -> Phase 2E` sorrendjet valtozatlanul orokli:
   - `Phase 2C` ownershipa a sync-hook config-contract closure,
   - `Phase 2D` ownershipa a remote SSH start activation,
   - `Phase 2E` ownershipa tovabbra is a `status/list` read-model consume.
2. Ez a task nem mozditja elore a successor surfaces-t:
   - nem nyit `status/list` read-model consume-ot,
   - nem nyit `attach` launcher consume-ot,
   - nem nyit approval/rework vagy commit/merge/delete remote routingot.
3. Remaining-task viability explicit:
   - `Phase 2E` tovabbra is kulon read-model task marad,
   - `Phase 2F` tovabbra is kulon attach task marad,
   - a recovery/restart-grade remote runtime ujraelesztes tovabbra sem csuszik bele ebbe a szeletbe.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis kizarlag a remote bubble elso SSH-start activationjat zarja le:
   - remote preflight,
   - optional sync-hook best-effort consume,
   - remote clone/start orchestration,
   - deterministic same-authority inner-start repo identity closure a remote clone es a syncelt bubble control-plane kozott,
   - explicit remote workspace-authority consume a clone rooton,
   - local control-plane state reconciliation + local started-pointer es cache init.
3. A task retained baseline-kent kezeli:
   - a `Phase 2B` create-time executor + created-pointer authorityt,
   - a `Phase 2C` sync-hook config contractot,
   - a `Phase 1A` pointer/cache role-szetvalasztast.
4. A task kifejezetten nem vallalja:
   - a remote `status/list/attach` operator read-modelt,
   - a remote runtime ujrainditas/recovery full semanticset mar started pointerrol,
   - a remote mutation routingot,
   - uj public CLI flag bevezeteset a remote no-attach semanticshez.
5. A remote inner startnak a meglevo default non-attach semanticsre kell epulnie:
   - az outer local command nem talalhat ki kulon `--no-attach` public surface-t,
   - a remote attach consume tovabbra is successor-only.

## Approval Scope / Review Boundary

1. Ez a task akkor tekintheto tisztan approvable `Phase 2D` szeletnek, ha a bounded remote first-start activation closure egyertelmuen bizonyitott, es ezt a `T1-T10` activation-focused test/contract matrix a sajat szeletan belul le tudja fedni:
   - first-start only `remote.json(kind="created")` retained pointerrol,
   - optional `pairflow_sync_command` best-effort consume-kent,
   - deterministic same-authority inner-start repo identity closure a remote clone es a syncelt `bubble.toml` kozott; nincs unresolved `repo_path` / bubble-lookup mismatch,
   - explicit remote workspace-authority consume a clone rooton, amely nem nyit uj implicit `work_mode`/worktree fallback truth-ot,
   - explicit remote runtime confirmation utan irt local `state.json` control-plane reconciliation + `remote.json(kind="started")` + `state-cache.json`,
   - canonical bubble control-artifact sync a remote clone-ba legacy `config.json` authority nelkul,
   - explicit non-recursive inner-start discriminator a remote clone-on beluli branchhez,
   - remote `--attach` explicit reject, local runtime-session/tmux surrogate authority nelkul, remote-safe public start surface-szel.
2. Ezek hianya vagy kesobbi ownershipje nem lehet `Phase 2D` blocker, mert successor-owned scope:
   - `status/list` read-model wording, cache-freshness/refresh policy vagy cache-reconciliation consume az initial cache-initen tul,
   - attach launcher, port-forward vagy UX consume,
   - explicit started-pointer consume-ra epulo remote restart/reboot recovery semantics a `Phase 2D` first-start fail-closed guardon tul,
   - approval/rework remote routing (`Phase 3A`) es commit/merge/delete remote routing (`Phase 3B`),
   - strukturalt warning/read-model surfacing a hook/version diagnostics korul.
3. Review-loop guardrail:
   - ha egy eszrevetel nem a fenti bounded remote first-start activation closure correctnesset serti, azt legfeljebb `later-hardening` vagy successor-task note szinten szabad kezelni, nem required-now `Phase 2D` blocker-kent.
   - ez a guardrail nem irja felul a canonical reviewer severity ontology evidence- es severity-policyjat.
4. Phase ownership clarification:
   - a remote clone-beli inner start `repo_path` / bubble-lookup same-authority closure nem `Phase 2E` read-model vagy `Phase 3C` recovery problema, hanem `Phase 2D` activation prerequisite,
   - a remote clone-root workspace-authority consume nem nyithat vissza mar lezart `Phase 1B1-1E` authority alignmentet,
   - a sikeres remote first-start utani local `state.json` control-plane reconciliation nem halaszthato kesobbi read-model taskra, mert a local `bubble start` lifecycle sajat start-mode truthja mar most ebbol el.

## L0 - Policy

### Goal

Aktivalni a remote bubble elso SSH-start pathjat ugy, hogy a local repo explicit, fail-closed remote execution orchestrationt kapjon, mikozben:
1. a remote runtime tenylegesen a hoston indul el,
2. a local persisted authority `remote.json(kind="started")` + `state-cache.json` formajara valt,
3. a `pairflow_sync_command` tovabbra is optional best-effort seam marad,
4. a pointer/cache/read-model/attach/mutation routing szerepek nem mosodnak ossze.

### Domain / Control Model Summary

1. Business invariant: remote bubble csak akkor allithato `started`-nak local authority szinten, ha a remote runtime tenylegesen elindult, es a local pointer/cache ezt explicit persisted formaban le tudja kovetni; local tmux/runtime session nem lehet surrogate authority.
2. Control model:
   - operational remote settings source-of-truth-ja: `bubble.toml[executor.remote]` -> global `[remotes.<alias>]`,
   - local bubble control-plane source-of-truth-ja: retained `bubble.toml` + retained local `state.json`,
   - local pointer source-of-truth-ja: `remote.json`,
   - local cache source-of-truth-ja: `state-cache.json`,
   - remote runtime state authority-ja tovabbra is a remote bubble sajat persisted/allapot felulete.
3. Read-path rule:
   - outer remote start csak az executor refet, a global remote configot, a create-time `remote.json(kind="created")` pointert, valamint a local git preflight authorityt olvashatja,
   - az inner remote start bubble feloldasa csak deterministic same-authority repo identity closure mellett tortenhet; a remote clone path es a syncelt bubble control-plane kozt nincs megengedett `repo_path` mismatch,
   - initial local cache csak explicit remote runtime confirmation responsebol allhat elo; immediate remote status refresh Phase 2D-ben nem megengedett, heuristic hardcoded `RUNNING` cache nem engedelyezett.
4. Forbidden fallback:
   - `pairflow_command` vagy `repo_base` alapjan implicit sync-hook generalas,
   - unresolved `repo_path` / bubble-lookup mismatch vagy implicit path-normalization elfedese,
   - local runtime session/tmux session/worktree alapjan remote runtime truth inferalas,
   - a remote attach readiness vagy remote read-model claim korai kinyitasa a start taskban,
   - a local outer start altali `commands.bootstrap` futtatas remote bubble-nel.
5. Allowed resolution path:
   - `bubble.toml[executor.remote]` -> global remote config lookup -> `remote.json(kind="created")` consume -> local git preflight -> optional `pairflow_sync_command` best-effort consume -> remote clone/materialization -> canonical bubble control-artifact sync (`bubble.toml`, local `state.json`, transcript/inbox, task + reviewer artifacts) -> deterministic same-authority inner-start repo identity closure -> explicit remote workspace-authority consume a clone rooton -> explicit remote inner-start context -> remote `pairflow bubble start` -> explicit remote runtime confirmation -> local `state.json` control-plane reconciliation + `remote.json(kind="started")` + `state-cache.json` write.
6. Missing-data rule:
   - ha az executor metadata, a global remote alias, a create-time `remote.json(kind="created")`, a same-authority repo identity closure, vagy az explicit remote workspace authority hianyzik/invalid, a remote start fail-closed,
   - nincs fallback local start success path,
   - nincs partial success claim pusztan attol, hogy egy remote clone vagy egy resz-step mar lefutott.
7. Phase boundary:
   - owned here: first-start remote activation a `bubble start` surface-en,
   - explicit successor `Phase 2E`: remote `status/list` consume,
   - explicit successor `Phase 2F`: remote attach consume,
   - explicit successor `Phase 3A+`: remote routing / cleanup / recovery rollout.

### Authority Fan-out Scan

1. `authority_producer`
   - remote SSH start orchestration, amikor a local repo explicit started-pointert es initial cache-t allit elo egy sikeres remote start utan
2. `persisted_authority`
   - `bubble.toml[executor]`
   - `remote.json`
   - `state-cache.json`
3. `internal_execution_consumers`
   - `src/v11/application/start/**`
   - remote SSH execution seam
   - local remote artifact persistence
4. `workflow_orchestration_consumers`
   - `startCliRunner.ts` az `--attach` remote-policy enforcement miatt
   - start command error/reporting surface
5. Explicit out-of-scope `read_model_consumers`
   - `status`, `list`, `attach`, UI/API projection
6. Explicit out-of-scope `cleanup_recovery_consumers`
   - remote restart/reboot recovery
   - remote merge/delete cleanup routing

### Closure Budget

1. Touched closures ebben a taskban:
   - `authority_producer`
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `persisted_authority_or_schema`
2. Tudatosan osszevont closures:
   - `authority_producer` + `persisted_authority_or_schema`
   - `internal_execution_consumers` + `workflow_orchestration_consumers`
   - a remote `bubble start` behavioral activation miatti minimalis `shared_contract` valtozas
3. Safe-collapse indok:
   - ugyanaz a bounded `pairflow bubble start` remote first-start path zarja le a remote orchestrationt, a deterministic same-authority inner-start repo identity closure-t, az explicit remote workspace-authority consume-ot, az explicit remote runtime confirmationt, valamint a local `state.json` + `remote.json(kind="started")` + `state-cache.json` persistence-t,
   - ugyanebben a bounded pathban dől el a remote/non-remote branching, az `--attach` fail-closed policy, es a local runtime-session seam bypassa is, anelkul hogy a korabban lezart workspace-alignment consume familyt ujranyitna,
   - nincs kulon read-model projection, cleanup routing vagy recovery consumer, amely ettol fuggetlen compatibility vagy ordering kockazatot vezetne be.
4. Explicit deferred closures:
   - `read_model_consumers` -> `Phase 2E/2F`
   - `cleanup_recovery_consumers` -> `Phase 3B/3C`
   - `mutation_routing` -> `Phase 3A`
5. Closure-budget decision:
   - ez a task nem nyit uj producer-foundation vagy read-model closure-t,
   - a jelenlegi collapse azert elfogadhato, mert a remote first-start activation egyetlen bounded start-flow ownership alatt zarhato le, es a successor consume families tovabbra is explicit tiltas alatt maradnak.

### Bounded Task Shape

1. `primary_task_shape`: `activation_or_read_model`
2. `secondary_adjacent_shape`: `fail_closed_hardening`
3. Shape rationale:
   - ez a fazis remote runtime activationot nyit,
   - de ugyanebben a bounded code pathban elkerulhetetlen a precondition-before-side-effect, a same-authority repo/workspace activation prerequisite-ek, es a partial-success fail-closed boundary explicit lezarasa,
   - read-model consume es cleanup/recovery tovabbra is kulon marad.

### Shared Contract Compatibility

1. Current consumers inventory:
   - `pairflow bubble start` public CLI / API surface,
   - retained `bubble.toml.repo_path` + bubble lookup consume,
   - retained local `state.json` start-mode/control-plane consume,
   - local `remote.json` pointer es `state-cache.json` artifact utility seam,
   - global remote config consume (`pairflow_command`, `pairflow_sync_command`, `repo_base`, `host`, `user`),
   - successor read-model consumers, amelyek meg nem aktivak.
2. Change type:
   - `pairflow bubble start` remote bubblekre: `behavioral_activation`
   - retained `bubble.toml.repo_path` + bubble lookup: consume-aligned same-authority closure required-now
   - retained local `state.json`: control-plane reconciliation required-now
   - `remote.json` / `state-cache.json`: consume-only, additive persisted output usage
   - `pairflow_sync_command`: consume-only, additive use of retained contract
3. Compatibility rule:
   - local non-remote start/resume retained baseline marad,
   - remote bubble-knel a korabbi "configured but not startable" allapot helyett explicit remote activation nyilik meg,
   - attach/read-model routing tovabbra sem lesz implikalt ettol a tasktol,
   - a public start result/help/success-summary remote bubble-nel sem claimelhet local attach vagy local worktree authorityt.

### Baseline Preservation

1. Must-preserve behaviors:
   - local `worktree`/`clone` start retained baseline nem regresszalodhat,
   - a retained `bubble.toml`/bubble lookup authority nem maradhat unresolved `repo_path` mismatch allapotban remote inner-start eseten,
   - a retained local `state.json` tovabbra is a local start-mode/control-plane truth resze marad,
   - a `remote.json` pointer-only marad; nem kap cache/state mezoket,
   - a `state-cache.json` cache-only marad; nem kap pointer/control mezoket,
   - a `pairflow_sync_command` absence tovabbra is explicit no-hook allapot.
2. Allowed new behavior:
   - remote bubble elso `bubble start` pathja sikeres lehet SSH orchestrationon keresztul.
3. Forbidden regression interpretations:
   - a remote start nem nyithat status/list/attach read-modelt ugyanebben a taskban,
   - a remote start nem hagyhat maga utan local `state.json` oldalon stale `CREATED` vagy egyeb nem reconciled control-plane allapotot sikeres remote first-start utan,
   - a remote start nem hozhat letre local runtime session authorityt a remote bubble helyett,
   - a remote start nem jelent automatikus local attach supportot.
4. Replacement proof required if removed:
   - ha a create-time `remote.json(kind="created")` consume path helyett mas authority jelenne meg, explicit bizonyitani kell az egyenerteku deterministic same-authority resolutiont.

### Precondition and Side-Effect Boundary

1. Remote-specific preconditions, amelyeknek teljesulniuk kell minden remote side effect elott:
   - a bubble `executor.type` pontosan `ssh`,
   - a `executor.remote` alias exact match-kent letezik a global `[remotes]` mapban,
   - a local `remote.json` pointer `kind="created"` shape-ben letezik,
   - a local repo rendelkezik `origin` URL-lel,
   - a local base branch dirty allapotban nincs.
2. Forbidden early side effects a fenti preconditionok elott:
   - SSH sync hook futtatasa,
   - remote clone/materialization,
   - artifact sync,
   - remote start command,
   - local `state.json` control-plane success write,
   - local `remote.json(kind="started")` vagy `state-cache.json` write.
3. Post-precondition bounded failure semantics:
   - sync-hook hiba warn-and-continue lehet,
   - barmely kesobbi remote step hiba terminal failure,
   - local persisted control-plane / started / cache authority csak sikeres remote runtime confirmation utan irhato ki.
4. Success-claim rule:
   - ha a remote runtime elindult, de a local `state.json` control-plane reconciliation vagy a local started/cache artifact persistence elbukik, a command teljes kimenete tovabbra is failure; a local operator surface nem claimelhet sikeres started allapotot.

### In Scope

1. Remote bubble first-start activation a `pairflow bubble start` surface-en.
2. Remote preflight:
   - global remote config consume,
   - create-time pointer consume,
   - local git origin + base branch cleanliness gate.
3. Optional `pairflow_sync_command` best-effort consume.
4. Remote repo materialization / start orchestration injected SSH seam-en keresztul.
5. Canonical bubble control-artifact set remote clone-ba syncelese az inner start elott.
6. Deterministic same-authority inner-start repo identity closure a remote clone es a syncelt bubble control-plane kozott.
7. Explicit remote workspace-authority consume a clone rooton.
8. Local `state.json` control-plane reconciliation + local `remote.json(kind="started")` write es local initial `state-cache.json` init.
9. Remote bubble eseten az `--attach` explicit fail-closed policyja.
10. Public start API/help/success-summary remote-safe szerzodese.
11. Activation-focused tests es contract fixtures.
12. Remote session-ownership seam explicit local-only bypass discipline-je.

### Out of Scope

1. Remote `status`, `list`, `attach` surfaces.
2. Remote attach launcher / port-forward UX.
3. Remote restart/reboot recovery full semantics mar started pointerrol.
4. Remote approval/rework routing.
5. Remote commit/merge/delete cleanup routing.
6. Uj public `--no-attach` CLI flag.
7. `pairflow_sync_command` config contract modositasa.
8. Immediate remote `status` refresh alapjan torteno cache-init.

### Safety Defaults

1. Remote bubble `--attach` esetben a command fail-closed actionable hibaval all meg; remote attach consume Phase 2F ownership.
2. `pairflow_sync_command` hianya nem hiba, csak explicit no-hook.
3. `pairflow_sync_command` hibaja warn-only; nem blokkolja a startot.
4. Remote Pairflow version drift legfeljebb diagnostic signal; nem compatibility gate.
5. Local outer start remote bubble-nel nem futtathat local `commands.bootstrap` parancsot.
6. Remote bubble start nem claimelhet local tmux/runtime session authorityt.
7. Remote bubble start sikeres kimenete nem claimelhet implicit local attachot vagy local worktree authorityt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - `pairflow bubble start` public behavior remote bubblekre,
   - retained `bubble.toml.repo_path` / bubble lookup same-authority consume contractja,
   - local `state.json` start-mode/control-plane reconciliation contractja,
   - local `remote.json` started pointer consume/write contract,
   - local `state-cache.json` initial cache write contract,
   - `pairflow_sync_command` retained config contract consume semantics,
   - remote inner-start context es a public start result/help/success-summary fail-closed surface-e.
3. Deferred alignment:
   - operator read-model es attach consume tovabbra is `Phase 2E/2F`,
   - remote recovery/restart semantics tovabbra is `Phase 3C`.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `9`
8. `single-task allowed`: `yes`
9. Split decision note:
   - a producer/config/read-model scopes mar korabban kulon lettek valasztva,
   - ez a task mar egy bounded activation closure,
   - a read-model, attach es recovery tovabbra is tudatosan kulon marad.
   - a `single-task allowed` itt csak a mar explicit splitelt `Phase 2D` bounded `runtime_activation` closure-n belul ertendo.
10. Identity/join note:
   - canonical identity path: `bubble.toml[executor.remote]` -> global `[remotes.<alias>]` -> local `remote.json(kind="created")` -> successful remote start -> local `remote.json(kind="started")`
   - competing identifiers or fallback identities: local tmux session, local runtime session registry, heuristic remote clone path inference, hardcoded `RUNNING` cache
11. Authority/source-of-truth note:
   - canonical source: retained executor ref + retained remote config + retained pointer/cache contracts
   - forbidden secondary sources: local runtime registry, attach surface, read-model cache as start truth

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Remote activation truth | Remote bubble csak explicit remote runtime confirmation utan claimelheto started-nek | nincs heuristic success vagy local surrogate authority | P1 | required-now |
| Config control model | Operational remote settingset csak `executor.remote` -> global `[remotes]` lookup adhat | `host/user/repo_base/pairflow_command/pairflow_sync_command` nem inferalhato mas mezobol | P1 | required-now |
| Pointer/cache role split | `remote.json` pointer-only, `state-cache.json` cache-only marad | start nem keverheti ossze a ket artifact szerepet | P1 | required-now |
| Sync-hook policy | `pairflow_sync_command` optional best-effort seam | hianya skip, hibaja warning, nincs hard block | P1 | required-now |
| Attach policy | Remote bubble start nem nyithat attach consume-ot | `--attach` remote bubble-re explicit reject | P1 | required-now |
| Inner bootstrap ownership | Remote bubble sajat bootstrapja a remote inner start ownershipe | outer local start nem futtathat local `commands.bootstrap` parancsot | P1 | required-now |
| Missing-data rule | Missing/invalid executor alias vagy created pointer eseten nincs remote start | nincs fallback local start vagy partial remote success claim | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `pairflow bubble start` remote bubble behavior | CLI runner, start API, start tests | behavioral_activation | remote bubble elso-start success path nyilik meg, local baseline retained mellett | remote restart/recovery Phase 3C |
| `PairflowRemoteHostConfig` retained sync-hook contract | start executor consume | additive consume | retained `pairflow_sync_command` consume-ja megjelenik, contract mod nelkul | config contract mar Phase 2C-ben lezart |
| `remote.json` / `state-cache.json` | local artifact utility, future read-model | consume_only | started pointer/cache write a start activation utan | `status/list/attach` consume Phase 2E/2F |
| local runtime session registry | local start/resume ownership path | scoped_bypass | remote first-start nem claimelheti ezt authority-forraskent; local retained baseline marad | remote attach/recovery tovabbi session semantics kesobb tisztazhato |

### 0b) Target File Discipline

| Class | Files | Rule | Reason |
|---|---|---|---|
| primary | `src/v11/application/start/**`, `src/v11/infrastructure/executor/ssh/sshBubbleStart.ts`, `tests/**/start*` | expected edit set | itt zarhato le a remote activation bounded pathja |
| seam-critical | `src/v11/application/start/startCommandSession.ts` | explicit ownership review kotelezo akkor is, ha a remote branch vegul bypassolja | a local runtime-session claim jelenlegi top-level seam, ezert a remote start boundary csak ezzel egyutt bizonyithato |
| shared-consume allowed | `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts` | consume-only edit elfogadhato | local pointer/cache write seam itt mar letezik |
| frozen-by-default | `src/config/pairflowConfig.ts`, `src/config/bubbleConfig.ts`, `src/v11/application/status/**`, `src/v11/application/attach/**`, `src/v11/application/merge/**`, `src/v11/application/delete/**` | semantic edit nem vart | contract/read-model/routing scopes successor-owned |
| must-not-open | UI/read-model/attach/cleanup surfaces | tiltott | Phase 2D activation ne csusszon successor consume-ba |

### 1) Call-site Matrix

| ID | File | Function / Entry | Exact Signature | Insertion Point | Expected Behavior | Priority | Timing | Evidence Target |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/start/startCommandContext.ts` | start context loading | `loadStartExecutionContext(input, deps, options?) -> Promise<StartExecutionContext>` | start preflight context | remote bubble-nel retained executor/global-config/pointer consume-hoz elegendo contextet epit, es a local `state.json` start-mode/control-plane truth tovabbra is explicit authority marad | P1 | required-now | T1, T2, T3 |
| CS1a | `src/v11/infrastructure/executor/workspace/bubbleLookup.ts` | remote clone lookup retained contract | `resolveBubbleById(...) -> Promise<ResolvedBubbleById>` | remote inner-start precondition | a remote clone-ba syncelt bubble control-artifact set csak deterministic same-authority repo identity closure mellett eleg a retained lookup contracthoz; nincs legacy `config.json` fallback es nincs unresolved `repo_path` mismatch | P1 | required-now | T1, T7 |
| CS2 | `src/v11/application/start/startCommandApi.ts` | start orchestration root | `startBubble(input, dependencies?) -> Promise<StartBubbleResult>` | top-level start flow | remote bubble-nel nem claimel local runtime session ownershipot es nem megy local tmux/bootstrap happy pathra | P1 | required-now | T1, T7, T10 |
| CS2a | `src/v11/application/start/startCommandSession.ts` | runtime session ownership seam | `claimRuntimeSessionOwnership(input: { context: StartExecutionContext; deps: ResolvedStartBubbleDependencies; }) -> Promise<RuntimeSessionRecord>` | local session-claim boundary | remote first-start branch ezt a seamet nem hasznalhatja runtime truthkent; local start/resume retained baseline tovabb el | P1 | required-now | T1, T9, T10 |
| CS3 | `src/v11/application/start/startCommandFlows.ts` | flow dispatch | `runFreshStartFlow(...)` remote-aware branchingje | fresh start branch | remote executor eseten explicit remote activation flow fut, explicit clone-root workspace-authority consume-val; nem local bootstrap/tmux launch es nem implicit worktree fallback | P1 | required-now | T1, T4, T5, T6 |
| CS4 | `src/v11/application/start/startCliRunner.ts` | CLI attach policy | `runBubbleStartCommand(args, cwd?, dependencies?) -> Promise<StartBubbleResult | null>` | CLI command path | remote bubble + `--attach` eseten explicit actionable reject, local attach retained baseline mellett | P1 | required-now | T8, T9 |
| CS4a | `src/v11/application/start/startCommandContract.ts` | public start result contract | `StartBubbleResult` | API/result surface | remote bubble success resultje explicit remote-safe session/workspace summaryra alkalmas, de nem implikal local attach authorityt | P1 | required-now | T1, T10 |
| CS4b | `src/v11/application/start/startCliOptions.ts`, `src/cli/index.ts` | start help es success summary | CLI help text + stdout summary | user-visible command surface | a retained `--attach` help mellett a remote reject fail-closed marad, a success summary pedig nem teveszti ossze a remote clone pathot local attach/worktree authorityval | P1 | required-now | T8, T10 |
| CS5 | `src/v11/application/start/startCommandRemoteExecution.ts` | new remote activation seam | `runRemoteStartExecution(input) -> Promise<RemoteStartExecutionResult>` | new start-only execution seam | local preflight, optional sync-hook, remote materialization/start, deterministic same-authority inner-start repo/workspace closure, remote confirmation, local control-plane/pointer/cache persistence egy bounded flowban zarul | P1 | required-now | T1-T7, T10 |
| CS6 | `src/v11/infrastructure/executor/ssh/sshBubbleStart.ts` | SSH/SCP adapter seam | injected command helpers | infrastructure execution seam | remote shell/copy steps explicit adapteren mennek, nincs start-level inline shell string sprawl | P1 | required-now | T1, T4, T5, T6 |
| CS7 | `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts` | pointer/cache write consume | `writeRemotePointer`, `writeRemoteStateCache` | local persistence boundary | successful remote start utan explicit started pointer es initial cache write tortenik, a local `state.json` control-plane reconciliationnel osszhangban | P1 | required-now | T1, T7 |
| CS8 | `tests/core/bubble/startBubble.test.ts` es `tests/contracts/v11/start.contract.runner.ts` | remote start coverage | vitest/contract runner | start regression surface | remote start happy path, fail-closed preflight, hook warning, attach reject, local baseline retention | P1 | required-now | T1-T10 |

### 2) Test Matrix

| ID | Scenario | Input | Action | Expected Result | Priority | Timing | Surface |
|---|---|---|---|---|---|---|---|
| T1 | remote first-start happy path | remote bubble with valid executor alias, created pointer, clean base branch, origin URL | `pairflow bubble start --id <id>` | SSH orchestration lefut; a remote clone megkapja a canonical bubble control-artifact setet; az inner remote start explicit remote kontextussal fut es nem re-entereli az outer orchestrationt; a retained bubble lookup same-authority closureja nem bukik `repo_path` mismatchre; a remote activation explicit clone-root workspace-authority consume-val fut; local `state.json` control-plane reconciliálodik; local `remote.json` started shape-re valt; local `state-cache.json` inicializalodik explicit remote authorityrol; a public success surface remote-safe marad | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/cases/start/start-remote-created-v11.case.json` |
| T2 | missing or unknown remote alias | remote bubble with invalid `executor.remote` vagy missing global remote entry | start | fail-closed preflight; nincs SSH side effect; nincs local pointer/cache write | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | missing or non-created remote pointer | remote bubble with missing `remote.json` vagy mar started/invalid shape, amikor Phase 2D first-start pathot kerunk | start | fail-closed; nincs remote start claim; nincs fallback inference | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | sync hook absent | valid remote bubble without `pairflow_sync_command` | start | hook skip explicit valid path; start ettol meg mehet tovabb | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T5 | sync hook fails warning-only | valid remote bubble with failing `pairflow_sync_command` | start | warning keletkezik, de a remote start tovabb folytatodik es sikeres lehet | P1 | required-now | `tests/contracts/v11/cases/start/start-remote-sync-hook-warning-v11.case.json` |
| T6 | local git preflight fail-closed | missing origin vagy dirty base branch | start | fail remote side effects elott; nincs remote clone/start; nincs local pointer/cache write | P1 | required-now | `tests/contracts/v11/cases/start/start-remote-preflight-missing-origin-v11.case.json`, `tests/core/bubble/startBubble.test.ts` |
| T7 | remote start step fails | remote clone/artifact sync/remote inner start hiba | start | terminal failure; local started pointer/cache nem claimel success allapotot; remote artifact-set vagy inner-start mode hianya, unresolved same-authority repo identity, vagy explicit workspace-authority hianya is fail-closed error | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T8 | remote attach reject | valid remote bubble + `--attach` | CLI start command | explicit actionable reject; nincs remote side effect; a retained help surface nem nyit Phase 2D-ben implicit attach supportot | P1 | required-now | `tests/contracts/v11/cases/start/start-remote-attach-rejected-v11.case.json`, `tests/v11/application/start/startCliEntrypointParity.test.ts` |
| T9 | local start regresszio nincs | non-remote bubble retained baseline | start / start --attach | meglevo local worktree/clone retained behavior valtozatlan | P1 | required-now | existing start tests + new regression assertions |
| T10 | remote bubble nem claimel local runtime authorityt | valid remote bubble success path | start | nincs local tmux attach path, nincs local runtime session ownership mint remote runtime truth, nincs immediate remote status refreshbol kepzett cache-init, a success summary sem allit local attach/worktree authorityt, es a local `state.json` sem marad stale `CREATED` control-plane allapotban | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |

### 3) Required Implementation Notes

1. A remote inner start a meglevo default non-attach CLI semanticsre epuljon; Phase 2D nem vezethet be uj public `--no-attach` flaget.
2. A remote bubble outer local startja nem futtathat local `commands.bootstrap` parancsot; az csak a remote inner start ownershipe lehet.
3. A `pairflow_sync_command` tovabbra is opaque string; Pairflow nem bonthatja package manager / install layout / repo policy alkotoelemekre.
4. Az initial local cachet kizarolag az explicit remote inner start runtime-confirmation authorityja alapjan szabad kepezni; a task nem rely-olhat hardcoded optimistic `RUNNING` cache-re, es nem nyithat immediate remote status refresh consume-ot ugyanennek a dontesnek a helyettesitesere.
5. A local started pointer/cache persistence csak sikeres remote runtime confirmation utan tortenhet.
6. Phase 2D-ben a remote restart/recovery mar started pointerrol nem required-now; ha a retained pointer mar `kind="started"`, es recovery semantics nem egyertelmuek, a task fail-closed maradjon ahelyett, hogy heurisztikus ujrainditast talal ki.
7. A `claimRuntimeSessionOwnership` seam local start/resume retained authority marad; remote first-start path csak explicit bypass vagy branch-level kizaras mellett mehet tovabb, de nem teheti ezt remote runtime truth forrassa.
8. A remote inner start elott a canonical bubble control-artifact setet kell a remote clone-ba syncelni: retained `bubble.toml`, retained local `state.json`, retained `transcript.ndjson`, retained `inbox.ndjson`, `artifacts/task.md`, valamint a reviewer brief/focus artifactok, ha jelen vannak. Legacy `config.json` authority nem talalhato ki.
9. Az inner remote start elott deterministic same-authority repo identity closure kell a remote clone es a syncelt `bubble.toml` kozott; unresolved `repo_path` / bubble-lookup mismatch nem maradhat Phase 2D-bol nyitva, es nem tolhato at read-model vagy recovery ownershipre.
10. Az inner remote start branch kivalasztasa explicit adapter-provided execution context vagy ezzel egyenerteku tipizalt discriminator alapjan tortenjen; puszta path-shape, local runtime-session jelenlet, vagy mas heurisztikus jel nem eleg.
11. A remote activation explicit clone-root workspace-authority consume-val menjen tovabb; ez nem nyithat vissza mar lezart `Phase 1B1-1E` worktree/workspace alignment kerdest es nem relies-olhat implicit worktree fallback truthra.
12. A sikeres remote first-start utan a local `state.json` control-plane reconciliation required-now ownership; ez nem halaszthato `Phase 2E` read-model consume-ra.
13. A public `pairflow bubble start` result/help/success-summary remote bubble-nel fail-closed maradjon: `--attach` tovabbra is explicit reject, a sikeres kimenet pedig legfeljebb remote tmux sessiont es remote clone pathot nevezhet meg, de nem allithat implicit local attachot vagy local worktree authorityt.

### 4) Must-Use / Must-Not-Use

| Type | Reference / Surface | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | `docs/remote-bubble-execution.md` csak a retained-section map 1. pontjaban rogzitett nem konfliktusos baseline-szakaszokra: remote host config, independent clone topology, pointer/cache role split | P1 | required-now |
| must-use | retained `bubble.toml.repo_path` + retained local `state.json` control-plane truth, a Phase 2D plan ownership pontositasaval egyutt | P1 | required-now |
| must-use | retained `remote.json` / `state-cache.json` authority split | P1 | required-now |
| must-not-use | public `--no-attach` CLI flag bevezetese | P1 | required-now |
| must-not-use | local runtime session / local tmux remote runtime truthkent | P1 | required-now |
| must-not-use | `status/list/attach` read-model consume | P1 | required-now |
| must-not-use | unresolved `repo_path` / bubble-lookup mismatch vagy implicit worktree fallback truth elfedese | P1 | required-now |
| must-not-use | `docs/remote-bubble-execution.md` retained-section map 2-3. pontjaban jelolt konfliktusos start/cache/recovery wordingje mint feluliro authority | P1 | required-now |
| must-not-use | sync hook fallback `pairflow_command` vagy `repo_base` alapjan | P1 | required-now |

Retained-section map a `docs/remote-bubble-execution.md` authority-szukitesehez
(`must-use` + `must-not-use` parban olvasando, nem kulonallo szabalykentes):
1. Retained baselinekent hasznalhato:
   - remote host config es opaque sync-hook contract (`5.1`),
   - independent clone topology (`3`, `6.2` clone-step framing),
   - pointer/cache role split (`5.3`, `5.4`).
2. Nem hasznalhato Phase 2D feluliro authoritykent:
   - barmely start/cache/recovery wording, ha ellentmond a task `Approval Scope / Review Boundary`, `Required Implementation Notes`, `Safety Defaults`, `Out of Scope`, `T1-T10`, vagy a `must-not-use` szabalyoknak.
3. Explicit conflict-marker lista a docs baseline olvasasahoz:
   - `6.2` start sequencing nem ertelmezheto ugy, mintha Phase 2D uj public `--no-attach` surface-t nyitna,
   - `6.2` cache-init wording nem ertelmezheto optimistic `RUNNING` cache-kent vagy immediate `status`-refresh helyettesiteskent,
   - `6.3` runtime-loss wording es `12` recovery wording nem ertelmezheto ugy, mintha a preserved started-pointer folotti restart/recovery semantics mar Phase 2D ownership lenne,
   - ilyen konfliktusnal a task current-slice contractja a feluliro authority, nem a design doc retained wordingje.

## L2 - Hardening Backlog

1. [later-hardening] Remote restart / reboot recovery explicit started-pointer consume-val kulon Phase 3C recovery taskban zarhato le.
2. [later-hardening] Ha a remote start warning surface strukturalt warning artifactot igenyel a hook/version drift/push diagnostics miatt, azt ne ebben az activation taskban nyissuk meg operator read-modelkent.
3. [later-hardening] Ha a remote start telemetry kulon metric mezot igenyel a sync-hook warning vagy remote preflight subtype-okhoz, azt kulon follow-upban erdemes megnyitni, nem a Phase 2D bounded activation szeletben.
