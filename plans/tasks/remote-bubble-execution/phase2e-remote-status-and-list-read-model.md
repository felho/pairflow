---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase2e_remote_status_list_read_model_v1
title: "Remote Bubble Execution Remote Status and List Read Model (Phase 2E)"
status: implementable
phase: phase2e-remote-status-and-list-read-model
target_files:
  - src/v11/shared/status/statusCommandApi.ts
  - src/v11/shared/status/statusCommandDependencyDefaults.ts
  - src/v11/shared/status/statusCommandTypes.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/application/status/statusCliRunner.ts
  - src/v11/application/status/statusCliTextRenderer.ts
  - src/v11/application/status/statusCliTableRenderer.ts
  - src/v11/application/list/listCliCommand.ts
  - src/v11/shared/list/listCommandApi.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/defaults/list/listCommandDefaults.ts
  - src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleStatus.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - tests/cli/bubbleListCommand.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - tests/v11/application/list/listCliEntrypointParity.test.ts
  - tests/v11/application/status/statusCliEntrypointParity.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Status and List Read Model (Phase 2E)

## Current Codebase Check (2026-04-16)

1. A `Phase 2D` retained baseline mar lezarta a remote first-start activationot:
   - a remote bubble first-start SSH orchestration implementalt,
   - a local `remote.json(kind="created") -> remote.json(kind="started")` atmenet baseline,
   - az initial local `state-cache.json` explicit remote confirmationbol inicializalodik.
2. A jelenlegi `status` es `list` surface tovabbra is local-only consume:
   - a `status` a local bubble state/traces/watchdog feluletekbol epit view-t,
   - a `list` a local bubble directories + local runtime session registry alapjan epit projekciot,
   - egyik sem consume-olja meg explicitten a remote pointer/cache authorityt vagy az SSH status refresh seamet.
3. A current `list` CLI surface nem hordoz explicit `--refresh` read-model opciot.
4. A remote `attach` consume tovabbra is kulon successor `Phase 2F`.
5. A remote approval/rework, commit/merge/delete routing, valamint a recovery/reboot semantics tovabbra is `Phase 3A/3B/3C` ownership.

## Parent Plan Fit / Stable Sequencing

1. A task a parent plan `Phase 2D -> Phase 2E -> Phase 2F` sorrendjet valtozatlanul orokli:
   - `Phase 2D` ownershipa a remote first-start activation closure,
   - `Phase 2E` ownershipa a remote `status/list` read-model consume,
   - `Phase 2F` ownershipa kulon marad az attach launcher/forwarding surface-szel.
2. Ez a task nem nyit vissza activation scope-ot:
   - nem indit remote runtimeot,
   - nem javit/ujraepit started pointert,
   - nem talal ki restart/recovery semantics-et preserved started pointer folott.
3. Remaining-task viability explicit:
   - `Phase 2F` tovabbra is kulon attach task marad,
   - `Phase 3A/3B/3C` tovabbra is kulon mutation/cleanup/recovery consumer family marad.

## Source-Anchor Consistency

1. A `Phase 2E` primary artifact authorityja ez a taskfajl; a `docs/remote-bubble-execution.md` csak ott retained baseline, ahol nem mond ellent ennek a read-model contractnak.
2. Ha a design doc korabbi wordingje a remote `list` cache-hianyt altalanosan `CREATED (remote, not started)` allapotkent mutatna, ez a task a szukebb authority:
   - `created/not-started` projection csak explicit `remote.json(kind="created")` pointerre ervenyes,
   - `remote.json(kind="started")` + missing/invalid `state-cache.json` eseten a bubble explicit `unavailable_started` / `cacheStatus=missing|invalid` remote allapotkent marad lathato,
   - local `state.json` vagy mas local control-plane lifecycle nem lephet elo elnevezes nelkuli remote truthkent.
3. Ha a design doc a started remote `status` SSH-hibajat ugy fogalmazna, mintha stale cache alapjan tovabbra is lenne sikeres live truth claim, ez a task felulirja:
   - a `status` fail-closed/unavailable eredmenyt ad,
   - a cache erintetlen marad,
   - restart/attach/mutation guidance nem nyilik meg ebben a fazisban.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis kizarlag a remote operator read-modelt zarja le:
   - remote bubble `status` live consume,
   - remote bubble `list` cache-first consume,
   - explicit `list --refresh` remote refresh path,
   - cache freshness es fail-closed wording,
   - location/source/freshness projection a JSON es text/table surfaces-en.
3. A task retained baseline-kent kezeli:
   - `Phase 2D` started-pointer + initial cache-init authorityt,
   - a local `status/list` local bubble baseline-t,
   - a remote pointer/cache typed artifact contractot.
4. A task kifejezetten nem vallalja:
   - a remote attach surface-t,
   - a remote mutation routingot,
   - a remote restart/recovery flowt,
   - a remote cleanup/delete semantics-et.

## Approval Scope / Review Boundary

1. Ez a task akkor tekintheto tisztan approvable `Phase 2E` szeletnek, ha a bounded remote `status/list` read-model consume egyertelmuen bizonyitott:
   - a remote bubble detektalasa explicit `remote.json` authorityrol tortenik,
   - `created` pointer eseten nincs SSH side effect, csak local remote/not-started projection,
   - `started` pointer eseten a `status` live remote read-model authorityt consume-ol,
   - a `list` default path cache-first marad, mig a live refresh explicit `--refresh` gate alatt tortenik,
   - a local `state-cache.json` csak cache/projection authority marad, nem uj canonical runtime truth,
   - a `remoteExecutionSummary` aggregate mezok additive read-model metadata-k maradnak, es nem irhatjak felul a retained lifecycle bucketek canonical jelenteseit,
   - a `compatLifecyclePlaceholder` csak labeled compat branchkent jelenhet meg `stateSource=unavailable_started` mellett, nem onallo remote lifecycle truthkent,
   - runtime-loss vagy SSH-unavailable esetben a surface fail-closed wordinget ad, nem attach/restart claimet.
2. Ezek hianya vagy kesobbi ownershipje nem lehet `Phase 2E` blocker, mert successor-owned scope:
   - attach launcher/forwarding/interactive consume,
   - commit/merge/delete remote routing,
   - preserved started-pointer recovery vagy reboot restart semantics,
   - remote mutation write-pathok.

## L0 - Policy

### Goal

Lezarni a remote bubble `status` es `list` operator read-model consume-jat ugy, hogy a surface a remote runtime allapotat irja le a megfelelo freshness-forras jelolesevel, mikozben:
1. a local gep nem lesz surrogate runtime authority,
2. a `state-cache.json` cache/projection szerepe explicit marad,
3. a created-vs-started remote pointer elteres fail-closed read-pathkent jelenik meg,
4. az attach/restart/mutation routing scope tovabbra sem nyilik meg.

### Domain / Control Model Summary

1. Business invariant: a user-facing `status`/`list` surface nem allithat frissebb vagy erosebb remote runtime truthot, mint amit az adott read path valojaban igazol.
2. Control model:
   - remote bubble detektalas source-of-truth-ja: local `remote.json`,
   - `created` remote bubble operator truthja: local bubble control-plane + `remote.json(kind="created")`,
   - `started` remote bubble live status truthja: remote `pairflow bubble status --json`,
   - a remote `status --json` nyers payload nem consume-olhato kozvetlen teljes `BubbleStatusView`-kent; eloszor egy szuk, remote-authoritative snapshot shape-re kell normalizalni,
   - local `state-cache.json` szerepe: cache/projection only, kulonosen `list` default pathhoz.
3. Read-path rule:
   - `status`: `created` pointernel local projection, `started` pointernel live remote refresh,
   - `list`: local bubbleknel retained local projection, remote bubbleknel cache-first remote consume; `--refresh` eseten explicit remote refresh,
   - `list` started remote bubble eseten a top-level lifecycle projection (`state`, `round`, `byState`) csak cache-derived remote statebol vagy explicit refreshbol allhat elo; live remote truth helyett nem maradhat csendben local `state.json`,
   - a refresh csak explicit started remote pointerrel es valid remote target resolution mellett futhat.
4. Forbidden fallback:
   - local runtime session, local tmux session, local worktree vagy local pane activity remote truth sourcekent,
   - stale local `state.json` remote runtime truth helyett live `status` substitute-kent,
   - a remote hostrol kapott teljes `BubbleStatusView` nyers atemelese local merge/normalizalas nelkul,
   - attach readiness, restart suggestion, vagy mutation routing korai megnyitasa a read-modelben,
   - silent fallback attach/read-model wordingre pusztan attol, hogy a remote pointer mar `started`.
5. Allowed resolution path:
   - local bubble lookup -> read `remote.json`,
   - ha nincs remote pointer: retained local status/list path,
   - ha `created` pointer: local remote/not-started projection SSH nelkul,
   - ha `started` pointer es `status`: global remote config resolution -> SSH `pairflow bubble status --json` a remote clone rooton -> validated remote snapshot -> local cache refresh -> local/local-host metadata merge -> local rendering,
   - ha `started` pointer es `list --refresh`: bubble-nkent remote refresh -> validated remote snapshot -> cache update -> cache-derived aggregate render,
   - ha `started` pointer es plain `list`: cache-first projection; a top-level lifecycle mezok cache-derivedek, remote SSH nincs implicit.
6. Missing-data rule:
   - missing remote pointer => retained local status/list behavior,
   - `created` pointernel hianyzo `remoteClonePath` nem hiba, hanem explicit "remote, not started" allapot,
   - `started` pointernel live `status` SSH failure eseten nincs stale cache siker-claim; a command fail-closed/unavailable surface-t ad es a cache nem irhato felul invalid adattal,
   - `list` default pathban hianyzo/invalid cache eseten a bubble remote/unavailable allapotkent jelenik meg explicit `cacheStatus=missing|invalid` markerrel; local control-plane lifecycle fallback vagy neven nevezett local `state.json` substitute nem engedelyezett remote truthkent,
   - ha az unchanged consumer signature miatt a top-level `state` / `round` retained mezok kitoltese technikailag szukseges, azok csak explicit compat placeholderkent maradhatnak jelen a local control-plane-bol; ezek nem canonical remote lifecycle mezok, es a render/JSON consume csak a `remoteExecution.stateSource=unavailable_started` + `cacheStatus=missing|invalid` jelolessel egyutt ertelmezheti oket,
   - `--refresh` lehet a recovery read-path.
7. Phase boundary:
   - contract closure: owned here az operator read-model output contracton belul,
   - producer closure: successor, mert a canonical remote runtime state-et tovabbra is a remote bubble termeli,
   - internal execution closure: successor, a remote start/attach/runtime lifecycle nem itt valtozik,
   - workflow/orchestration closure: minimalis consume-only mertekben owned here (`list --refresh`, remote status routing),
   - read-model closure: owned here,
   - activation closure: successor/retained baseline (`Phase 2D`),
   - cleanup/recovery closure: successor.

### Authority Boundary Map

1. Authority producer:
   - remote bubble sajat persisted/allapot felulete started remote bubble eseten,
   - local bubble control-plane + `remote.json(kind="created")` created remote bubble eseten.
2. Stored authority:
   - local `remote.json`,
   - local `state-cache.json`,
   - remote bubble sajat state/transcript/runtime felulete a remote clone-ban.
3. In-scope consumers:
   - `status` command API + JSON/text/table projection,
   - `list` command API + CLI surface,
   - local cache refresh write path, de csak read-model projection celra.
4. Explicit out-of-scope consumers:
   - attach launcher/forwarding,
   - start/approve/rework/commit/merge/delete mutation routing,
   - recovery/restart semantics,
   - remote cleanup artifacts.
5. Export surfaces closed in this phase:
   - `yes`: `pairflow bubble status`, `pairflow bubble list`, ezek JSON/text projections.

### Baseline Preservation

1. Must-preserve behaviors:
   - local bubbles retained status/list behavior valtozatlan marad,
   - `created` remote bubble nem triggerel SSH oldali side effectet,
   - `Phase 2D` initial cache-init nem ertelmezheto visszafele ugy, mintha a start task mar read-model refresh policyt is lezarta volna,
   - attach tovabbra sem nyilik meg a `status/list` taskban.
2. Allowed resolution paths:
   - same-authority local remote pointer consume -> created remote projection,
   - started remote pointer -> explicit remote status JSON consume -> narrow remote snapshot normalizalas -> local cache refresh/projection.
3. Forbidden regression interpretations:
   - a remote `status` nem hasznalhat local runtime session registryt remote runtime truthkent,
   - a remote `status` nem consume-olhat nyers remote `BubbleStatusView` payloadot local merge contract nelkul,
   - a plain `list` nem valhat implicit SSH inventory parancsa,
   - a plain `list` started remote bubble eseten nem hagyhatja a top-level lifecycle projectiont neven nevezes nelkul local `state.json`-on,
   - a runtime-loss wording nem fordulhat at automatikus restart-tanacsba.
4. Replacement proof required if removed:
   - ha barmelyik retained local status/list viselkedes vagy a created remote SSH-mentes projection megszunik, explicit parity proof kell a replacement read-modelre.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`
2. Secondary shape (if any): `fail_closed_hardening`, mert a remote refresh/cache failure semantics ugyanebben a bounded read-model pathban zarul.
3. Preconditions that must pass before side effects:
   - remote pointer shape valid,
   - started remote pointer eseten remote target feloldhato a global configbol,
   - remote SSH status payload valid JSON-t es explicit remote-snapshot contractot ad,
   - cache write csak validalt remote payload utan tortenhet.
4. Side effects forbidden before preconditions pass:
   - cache overwrite invalid vagy partial remote payloadbol,
   - remote SSH invoke `created` pointer vagy local bubble eseten,
   - implicit `list` refresh SSH side effect explicit `--refresh` nelkul.
5. Invalid/precondition-failure behavior:
   - live `status` pathban zero-success-claim fail-closed,
   - `list --refresh` pathban per-bubble bounded failure megengedett, de az erintett bubble fresh remote truthot nem claimelhet.
6. Coordination primitives in scope: `N/A`

### In Scope

1. Remote bubble detektalas explicit `remote.json` consume-val a `status` es `list` surfaces-en.
2. Remote `status` live SSH refresh started pointerrol.
3. Remote `list` cache-first projection started pointerrol.
4. Explicit `list --refresh` CLI surface.
5. Remote status/list JSON + text/table wording location/freshness/source jelzessel.
6. Local `state-cache.json` refresh remote status consume utan.
7. Runtime-loss es SSH-unavailable fail-closed read-model wording.

### Out of Scope

1. Remote attach launcher/port-forward consume.
2. Remote mutation routing.
3. Remote restart/recovery semantics preserved started pointerrol.
4. Remote cleanup/delete/merge orchestration.
5. Remote start authority vagy pointer producer logika.

### Safety Defaults

1. Ha a read-model freshness nem bizonyithato, a surface explicit stale/unavailable wordinget adjon, ne optimistic remote-success claimet.
2. SSH side effect csak explicit started remote pointer eseten engedelyezett.
3. A `list` default path maradjon cache-first; a live refresh legyen kulon opt-in.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - operator CLI surface (`pairflow bubble list --refresh`),
   - status/list JSON projection shapes,
   - remote read-model/cache-freshness wording contract.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
10. Identity/join note:
   - canonical identity path: `bubble.toml[executor.remote]` -> local `remote.json` -> (`created` local projection | `started` remote clone path + remote SSH status)`
   - competing identifiers or fallback identities: local runtime session registry, local tmux pane activity, local worktree path, stale local `state.json`
11. Authority/source-of-truth note:
   - canonical source: created remote bubble-nel local pointer/control-plane; started remote bubble-nel remote status JSON
   - forbidden secondary sources: local runtime/tmux/worktree, optimistic stale cache live truthkent
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `workflow_orchestration_consumers`, `read_model_consumers`
   - intentionally collapsed closures: `workflow_orchestration_consumers` + `read_model_consumers`, mert ugyanaz a bounded status/list route dont a remote/local read pathrol es freshness policyrol
   - explicitly deferred closures: `authority_producer`, `cleanup_recovery_consumers`, `attach consume`
13. Bounded-task-shape decision:
   - primary shape: `activation_or_read_model`
   - secondary shape: `fail_closed_hardening`
   - why this bounded mix is safe: nincs producer- vagy cleanup-ownership, csak consume/projection + freshness failure envelope.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | A remote read-model csak annyit allithat, amennyit a read path igazolni tud. | `status` live refresh nelkul nem claimelhet live remote truthot; `list` cache-first marad. | P1 | required-now |
| Control model | `created` remote bubble truthja local pointer/control-plane; `started` remote bubble live truthja remote status JSON. | A started remote bubble `status` pathjan a remote SSH status a dontes authority. | P1 | required-now |
| Read-path rule | `status` = local created projection vagy live remote read; `list` = cache-first, `--refresh` = live remote refresh. | Kulon freshness policy kell `status` es `list` kozott. | P1 | required-now |
| Forbidden fallback | Local runtime/tmux/worktree es stale local `state.json` nem remote runtime truth. | Ezek maximum diagnostics inputok lehetnek, de nem remote state authority. | P1 | required-now |
| Allowed resolution path | started remote pointer -> valid remote status JSON -> local cache refresh -> render. | SSH adapter + cache write seam explicit es validaciohoz kotott. | P1 | required-now |
| Missing-data rule | `created` pointernel nincs SSH; `started` live status failure eseten fail-closed; `list` default cache hiany eseten stale/unavailable projection kell. | A surface nem allhat at optimistic remote-successre. | P1 | required-now |
| Phase boundary | Ez a task csak status/list read-model consume. | Attach, mutation routing, recovery scope nem nyithato meg. | P2 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| internal `RemoteBubbleStatusSnapshot` adapter result | current consumers `N/A` | additive | szuk remote-authoritative snapshot contract bevezetese a nyers remote status JSON es a local `BubbleStatusView` koze | N/A |
| `BubbleStatusView` JSON/text projection | `statusCliRunner`, `statusCliRenderers`, CLI/tests, `uiRouter`, UI presenter/detail consumers | additive | remote execution/location/freshness view mezok hozzaadasa ugy, hogy a UI/router consume additive maradjon | attach/read-model tovabbi consume `Phase 2F` |
| `BubbleListEntry` / `BubbleListView` projection | `listCliCommand`, core list tests, CLI/tests, `uiRouter`, `bubblePresenter`, UI events scan/fingerprint consumers | additive | remote location/freshness/cache-source mezok hozzaadasa ugy, hogy a list/UI/event consumers additive maradjanak | attach/read-model tovabbi consume `Phase 2F` |
| `BubbleListView` repo summary aggregate | `listCliCommand`, text render, repo-summary/UI consumers | additive | explicit remote unavailable aggregate mezok hozzaadasa, hogy a summary ne csak compat lifecycle countokra tamaszkodjon | attach/read-model tovabbi consume `Phase 2F` |
| `BubbleListCommandOptions` CLI contract | `listCliCommand`, `bubbleListCommand.test.ts` | additive | optional `--refresh` flag | N/A |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Local bubbles current status/list projection | preserve | Existing core + CLI tests unchanged PASS | P1 | required-now |
| Remote `created` bubble status/list SSH nelkul | preserve | Dedicated created-pointer tests | P1 | required-now |
| `list` default nem implicit remote SSH inventory | preserve | `--refresh` nelkul zero SSH-call proof | P1 | required-now |
| Remote attach unopened in status/list phase | preserve | No new attach wording/launcher consume in diff + tests | P1 | required-now |

### 0c) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| started remote live refresh | remote pointer shape + remote target resolution + remote snapshot payload validity | cache overwrite, fresh remote claim, attach/restart wording | fail-closed `status`; per-bubble unavailable `list --refresh` cache-miss branch | P1 | required-now |
| started remote plain `list` cache miss | remote pointer shape + cache readability/validity | implicit SSH, unlabeled local-state substitution, unnamed compat placeholder expose | explicit remote/unavailable projection; compat placeholder csak labeled remote-unavailable branchkent maradhat | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/infrastructure/executor/ssh/sshBubbleStatus.ts` | `executeRemoteBubbleStatus` | `({ bubbleId, remoteClonePath, remoteTarget } -> Promise<RemoteBubbleStatusSnapshot>)` | new SSH adapter seam | Remote `pairflow bubble status --json` futtatasa a remote clone rooton, es csak a remote-authoritative mezoket tartalmazo validalt snapshot visszaadasa | P1 | required-now | `tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts` |
| CS2 | `src/v11/shared/status/statusCommandApi.ts` | `getBubbleStatus` | `(BubbleStatusInput, deps -> Promise<BubbleStatusView>)` | remote-pointer detection a local status build elott | Local bubble retained path; remote `created` local projection; remote `started` live refresh + cache update | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| CS3 | `src/v11/shared/status/statusCommandViewBuilder.ts` | `buildBubbleStatusView` | `(input -> BubbleStatusView)` | status JSON projection | A narrow remote snapshotot local-only metadata mezokkel merge-eli; a remote payload nem irhatja felul a local host-specific view mezoket | P1 | required-now | `tests/cli/bubbleStatusCommand.test.ts` |
| CS4 | `src/v11/shared/list/listCommandApi.ts` | `listBubbles` | `(BubbleListInput -> Promise<BubbleListView>)` | entry build loop / refresh policy | Cache-first remote list projection; started remote bubble top-level lifecycle mezoi csak cache-derived remote statebol johetnek, vagy unavailable branchben explicit compat placeholderkent maradhatnak; cache missnel explicit unavailable remote projection + aggregate marker kell; explicit `refresh` path bubble-nkent | P1 | required-now | `tests/core/bubble/listBubbles.test.ts`, `tests/v11/application/list/listCommandApi.test.ts` |
| CS5 | `src/v11/application/list/listCliCommand.ts` | `parseBubbleListCommandOptions` + `runBubbleListCommand` | `(string[] -> ParsedBubbleListCommandOptions)` and `(args, cwd -> Promise<BubbleListView | null>)` | CLI option parsing/help/run | Optional `--refresh` flag kivezetese es tovabbitasa | P1 | required-now | `tests/cli/bubbleListCommand.test.ts` |
| CS6 | `src/v11/application/status/statusCliTextRenderer.ts` | status text render path | `(BubbleStatusView -> string)` | remote wording blocks | Remote/not-started, remote/live, runtime-loss, freshness wording explicit megjelenitese | P1 | required-now | `tests/cli/bubbleStatusCommand.test.ts` |
| CS7 | `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts` | `readRemotePointer` / `readRemoteStateCache` / `writeRemoteStateCache` consume | existing signatures retained | status/list consume seam | Local typed remote pointer/cache artifact read/write consume read-model celra | P1 | required-now | `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts` |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `BubbleListInput` / CLI list options | `repoPath?`, `cwd?`, `now?`; CLI: `--repo`, `--json` | additive `refresh?: boolean`; CLI: optional `--refresh` | existing fields | `refresh` | non-breaking | P1 | required-now |
| internal `RemoteBubbleStatusSnapshot` | N/A | new normalized remote adapter result | `state`, `round`, `activeAgent`, `activeRole`, `activeSince`, `lastCommandAt`, `runtimeAvailability` | `executionContext`, `maxRounds`, `lastCheckedAt`, remote-runtime diagnostics fields | non-breaking internal | P1 | required-now |
| `BubbleStatusView` | local-only lifecycle/watchdog/meta-review projection | additive remote projection metadata + explicit local/remote merge rule | existing status fields retained; local host-specific mezok retained | `remoteExecution` view: `alias`, `host`, `pointerKind`, `statusSource` (status-only source label for live vs created/not-started vs unavailable status rendering), `cacheStatus`, `runtimeAvailability`, `remoteClonePath?`, `lastCacheCheckAt?` | non-breaking | P1 | required-now |
| `BubbleListEntry` | local state/runtime/attention projection | additive remote projection metadata + explicit source semantics | existing list fields retained; started remote bubble eseten top-level `state`, `round` cache-derived remote lifecyclekent jelenhet meg, cache missnel pedig legfeljebb explicit compat placeholderkent maradhat a retained consumer signature miatt | `remoteExecution` view: `alias`, `host`, `pointerKind`, `stateSource` (list-entry branch selector: `cache` \| `refresh` \| `created_not_started` \| `unavailable_started`), `cacheStatus`, `remoteClonePath?`, `lastCacheCheckAt?`, `compatLifecyclePlaceholder?` (`0..1` object, only when `stateSource=unavailable_started` and a retained consumer still requires top-level lifecycle fill; fields: `state`, optional `round`, `source='local_control_plane_compat'`) | non-breaking | P1 | required-now |
| `BubbleListView` repo summary | fixed lifecycle bucket summary only | additive remote summary metadata | existing `byState` retained | `remoteExecutionSummary` (`0..1` object on list view): `createdNotStarted` (non-negative integer), `unavailableStarted` (non-negative integer), `refreshedThisRun?` (optional boolean emitted only for explicit refresh runs) | non-breaking | P1 | required-now |
| local cache update contract | `state-cache.json` initialized by start only | additive read-model refresh writes after validated remote status | `lastCheckedAt`, `state`, `round`, `maxRounds` | `implementerStatus`, `reviewerStatus` | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| FS | remote pointer/cache read; cache write after valid remote refresh | pointer rewrite; local `state.json` mutation; cache write from invalid payload | read-model task nem producer task | P1 | required-now |
| Network/SSH | remote `status --json` only for started remote bubbles (`status`, `list --refresh`) | SSH on local bubbles, created remote bubbles, or plain `list` path | `list` default maradjon cache-first | P1 | required-now |
| UX wording | explicit remote location/freshness/runtime-loss projection | attach/restart implication vagy mutation guidance | attach kulon successor | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| remote pointer missing | local artifacts | result | retained local status/list path | N/A | info | P1 | required-now |
| remote pointer `created` | local artifacts | result | local remote/not-started projection, no SSH | N/A | info | P1 | required-now |
| started remote `status` refresh success | SSH remote status | result | cache refresh + remote/live render | N/A | info | P1 | required-now |
| started remote `status` SSH failure or invalid payload | SSH remote status | throw | fail-closed unavailable error, cache untouched | `STATUS_REMOTE_STATUS_UNAVAILABLE` | warn | P1 | required-now |
| started remote `status` runtime missing after live refresh | SSH remote status | result | explicit runtime-loss wording; no restart/attach claim | `STATUS_REMOTE_RUNTIME_MISSING` | warn | P1 | required-now |
| started remote plain `list` with valid cache | local cache | result | cache-first projection | N/A | info | P1 | required-now |
| started remote plain `list` with missing/invalid cache | local cache | fallback | remote bubble kept visible as explicit remote/unavailable entry with `stateSource=unavailable_started` + `cacheStatus=missing|invalid`; ha retained top-level lifecycle mezok technikailag kellenek, azok csak compat placeholderkent maradhatnak | `LIST_REMOTE_CACHE_UNAVAILABLE` | warn | P1 | required-now |
| started remote `list --refresh` per-bubble SSH failure | SSH remote status | fallback | keep stale cache if present, else explicit unavailable remote projection (`stateSource=unavailable_started`) for that bubble only | `LIST_REMOTE_REFRESH_UNAVAILABLE` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `remote.json`, `state-cache.json`, global remote config resolution, remote `pairflow bubble status --json` adapter seam | P2 | required-now |
| must-not-use | local runtime session registry remote runtime truthkent; implicit SSH in plain `list`; attach launcher consume; restart/recovery semantics | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | remote created status projection | remote bubble `remote.json(kind="created")`, no remote clone path | `pairflow bubble status --id <id>` | local remote/not-started projection, zero SSH call | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| T2 | remote started live status refresh | remote bubble `remote.json(kind="started")`, valid remote target, valid remote status JSON | `pairflow bubble status --id <id>` | remote/live view render + cache refresh | P1 | required-now | `tests/core/bubble/statusBubble.test.ts`, `tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts` |
| T3 | remote runtime missing wording | started remote bubble, live remote status succeeds but runtime no longer active | `status` | explicit fail-closed runtime-loss wording; nincs restart/attach claim | P1 | required-now | `tests/core/bubble/statusBubble.test.ts`, `tests/cli/bubbleStatusCommand.test.ts` |
| T4 | remote status unavailable fail-closed | started remote bubble, SSH status dependency fails or returns invalid payload | `status` | command fail-closed/unavailable with `STATUS_REMOTE_STATUS_UNAVAILABLE`; cache untouched | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| T5 | list default cache-first | started remote bubble with valid `state-cache.json` | `pairflow bubble list` | zero SSH call; cache-based remote entry | P1 | required-now | `tests/core/bubble/listBubbles.test.ts`, `tests/v11/application/list/listCommandApi.test.ts` |
| T5a | list cache miss unavailable projection | started remote bubble, missing/invalid `state-cache.json`, started pointer present | `pairflow bubble list` | zero SSH call; explicit remote/unavailable projection `stateSource=unavailable_started` + `cacheStatus=missing|invalid`; barmely retained top-level lifecycle mezo csak labeled `compatLifecyclePlaceholder` objektummal maradhat | P1 | required-now | `tests/core/bubble/listBubbles.test.ts` |
| T5b | list summary unavailable aggregate | mixed list view local + remote cache hit + remote unavailable branch | `pairflow bubble list` | a summary explicit `remoteExecutionSummary.unavailableStarted` szamlalot ad; a consume nem kenyszerul pusztan `byState` alapjan remote lifecycle truthot allitani | P1 | required-now | `tests/core/bubble/listBubbles.test.ts`, `tests/cli/bubbleListCommand.test.ts` |
| T6 | list explicit refresh | started remote bubble(s) with valid remote target | `pairflow bubble list --refresh` | per-bubble remote refresh + cache update + rendered fresh projection; a view optionalisan `remoteExecutionSummary.refreshedThisRun=true` mezovel jelezheti az explicit refresh run-t | P1 | required-now | `tests/core/bubble/listBubbles.test.ts`, `tests/cli/bubbleListCommand.test.ts` |
| T7 | list refresh partial failure | mixed remote bubbles, egyik refresh sikertelen | `list --refresh` | csak az erintett bubble degradalodik stale/unavailable projekciora; a command nem omlik ossze | P1 | required-now | `tests/core/bubble/listBubbles.test.ts` |
| T8 | remote created list projection | remote bubble `created` pointerrel | `pairflow bubble list` | remote/not-started entry, zero SSH call | P1 | required-now | `tests/core/bubble/listBubbles.test.ts` |
| T9 | local bubble baseline retention | local bubbles current statesben | `status` es `list` | retained existing projections es tests | P1 | required-now | `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts` |
| T10 | attach remains unopened | remote started bubble Phase 2E read-model utan | `status` / `list` | nincs attach launcher/port-forward instruction vagy opened attach contract | P1 | required-now | `tests/cli/bubbleStatusCommand.test.ts`, diff review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a remote read-modelhez strukturalt freshness age vagy cache-expiry policy kell, azt kulon follow-upban erdemes formalizalni; a 2E-ben eleg az explicit source/freshness marker.
2. [later-hardening] Ha a remote `list --refresh` bubble-szamonkent lassu lesz, a refresh fan-out concurrency kulon hardening taskkent kezelendo, nem required-now.
3. [later-hardening] Ha a remote runtime-loss read-modelhez kulon diagnostics artifact vagy remediation URL kell, az mar `Phase 3C` recovery/docs scope.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Strukturalt freshness age vagy cache-expiry policy formalizalasa a remote read-modelhez | L2 | P2 | later-hardening | Phase 2E task review | Kulon follow-up taskban formalizalni a freshness-policy contractot, ha az explicit source/freshness marker mar nem eleg |
| H2 | `list --refresh` fan-out concurrency/performance hardening | L2 | P2 | later-hardening | Phase 2E task review | Kulon hardening taskban kezelni a bubble-nkenti refresh parhuzamositasi es latency kerdeseket |
| H3 | Runtime-loss read-modelhez kulon diagnostics artifact vagy remediation surface | L2 | P2 | later-hardening | Phase 2E task review | `Phase 3C` recovery/docs scope-ban formalizalni, nem ebben a bounded read-model taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.
6. If a shared contract changes, current-consumer inventory and additive-vs-breaking classification are mandatory.
7. If an authority fan-out exists, the authority boundary map must stay consistent with the bounded task scope.
8. If baseline behavior is removed or replaced, the task must name the exact replacement path and the proof expected from validation.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
