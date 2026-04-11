---
artifact_type: task
artifact_id: task_remote_bubble_execution_create_and_start_provisioning_phase2a_v1
title: "Remote Bubble Execution Create and Start Provisioning (Phase 2A)"
status: draft
phase: phase2a-create-start-provisioning
target_files:
  - src/types/bubble.ts
  - src/config/pairflowConfig.ts
  - src/v11/application/create/createCommandRuntime.ts
  - src/v11/application/create/createBubblePersistence.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandDefaults.ts
  - src/v11/application/start/startCommandRemoteSync.ts
  - tests/config/pairflowConfig.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/core/bubble/startBubble.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Create and Start Provisioning (Phase 2A)

## Current Codebase Check (2026-04-11)

1. A jelenlegi create/start flow csak local bubble lifecycle-ra van felkeszitve; nincs remote clone provisioning vagy SSH-alapu start orchestration.
2. A global config ma nem hordoz explicit target-specifikus Pairflow sync hookot, igy a remote host install/update mechanizmusa nem absztrahalt start-time seam.
3. A lokalisan futó Pairflow ma sem enforce-ol exact build egyezest mar futo bubble-okkal, ezert a remote designnak sem szabad bubble-szintu runtime pinninggel vagy hard version gate-tel indulnia.
4. A remote design docban mar szerepel a `pairflow --version` ellenorzes, de az onmagaban nem eleg erdekes ahhoz, hogy onallo compatibility frameworkot indokoljon.

## Implementation Target Decision

1. `implementable_now`: `no`
2. Phase 2A ownership:
   - `bubble create --remote` es remote `start` provisioning flow,
   - optional target-level `pairflow_sync_command` start-time seam,
   - per-bubble remote clone letrehozas,
   - local `remote.json` / `state-cache.json` kezdeti feltoltese.
3. Nem cel:
   - bubble-szintu runtime pinning,
   - kotelezo exact-match vagy protocol compatibility gate,
   - futo remote bubble automatikus Pairflow update-je,
   - `status/list` feluleten tartos sync diagnostics authority bevezetese.
4. A `pairflow_sync_command` V1-ben best-effort operacios hook: start elott futhat, de nem valhat a remote lifecycle minden parancsara kiterjedo core protocol gate-te.

## L0 - Policy

### Goal

Lezarni a remote create/start provisioning Phase 2A szeletet ugy, hogy:
1. a remote bubble deterministicusan letrehozhato es indithato legyen,
2. a target-specifikus Pairflow update/sync igény egy optional start-time hookban oldodjon meg,
3. a solution ne vezessen be felesleges version-pinning vagy compatibility frameworkot.

### In Scope

1. `pairflow bubble create --remote <host>` input/flow bevezetese.
2. Remote clone provisioning es remote `pairflow bubble start` orchestration.
3. Global remote config optional `pairflow_sync_command` mezoje.
4. Start-time best-effort sync hook execute/skip/fail-soft viselkedese.
5. Initial local `remote.json` es `state-cache.json` initialization a sikeres remote start utan.

### Out of Scope

1. `status`, `list`, `attach` remote consume feluletek.
2. Remote lifecycle mutation routing (`approve/rework/commit/merge/clean/delete`).
3. Kotelezo remote/local version egyezes vagy handshake matrix.
4. Running bubble kozbeni auto-update.
5. Remote Pairflow install strategy standardizalasa; a sync hook target-owned opaque command marad.

### Safety Defaults

1. Ha nincs `pairflow_sync_command`, a start flow sync hook nelkul megy tovabb.
2. Ha a sync hook hibaval ter vissza, a default viselkedes warning + tovabblepes; ez nem blokkolja a startot.
3. A sync hook csak uj remote `start` elott futhat; nem fut laptop startupkor es nem fut minden remote command elott.
4. A sync hook outputja diagnosztikai; nem hoz letre uj persisted authority artifactot.
5. A remote Pairflow verzioelteres onmagaban nem blokkolja a startot ebben a fazisban.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - global config contract (`~/.pairflow/config.toml`)
   - create/start CLI/runtime contract
   - remote provisioning side-effect contract
3. Phase-guard:
   - a sync hook target-level opaque command marad; Pairflow csak execute/observe responsibilityt vallal, install/update logikat nem.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `8`
8. `single-task allowed`: `no`
9. Required split:
   - `foundation`: Phase 1A + Phase 1B
   - `delivery`: ez a Phase 2A task
   - `activation/rollout`: Phase 2B-3B
10. Identity/join note:
   - canonical identity path: `remote name -> remote host config -> remote clone path -> remote bubble runtime`
   - competing identifiers or fallback identities: local Pairflow build SHA, stale PATH-resolved remote binary, laptop startup event; ezek nem lehetnek canonical lifecycle identity-k
11. Authority/source-of-truth note:
   - canonical source: remote host config + start orchestration eredmenye + remote operational state
   - forbidden secondary sources: implicit local Pairflow version equality, bubble-szintu runtime pinning, hidden sync side effects laptop startupkor

## Sandbox Compatibility Gate

Reference: `docs/architecture/sandbox-compatibility-gate.md`

1. `SG1 Runtime Boundary Preservation`
   - megfeleles: a sync hook csak pre-start provisioning seam; nem mossa ossze a start/attach/relay/cleanup fogalmakat.
2. `SG2 Host Path Non-Authority`
   - megfeleles: a sync hook target-level command, de nem teszi a host pathot vagy install lokaciot bubble identityve.
3. `SG3 Host-Tool Decoupling`
   - megfeleles: a hook lehet shell script vagy package-manager parancs, de Pairflow ezt opaque commandkent kezeli, nem teszi canonical tool-boundaryve.
4. `SG4 Wrapper-Ready Execution`
   - megfeleles: a sync hook egyetlen explicit orchestration ponton fut; nem szorodik szet kontrollalatlan raw SSH command-epiteskent.
5. `SG5 Explicit Non-Goals for Isolation`
   - explicit non-goalok:
     - runtime compatibility handshake framework
     - running bubble hot-update
     - remote package manager policy standardizalasa
     - attach/list/status sync diagnostics persistence

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | remote host sync config types | type/interface layer | canonical type layer | optional `pairflow_sync_command?: string` remote-host config mezokent jelenik meg; bubble runtime pinning tipus nem jelenik meg | P1 | required-now | T1, T2 |
| CS2 | `src/config/pairflowConfig.ts` | remote sync config parser/validator | `parsePairflowGlobalConfigToml(input: string) -> PairflowGlobalConfig`, `validatePairflowGlobalConfig(input: unknown) -> ValidationResult<PairflowGlobalConfig>` | global config boundary | `pairflow_sync_command` optional non-empty string; hianya valid; invalid tipus fail-fast | P1 | required-now | T1, T2 |
| CS3 | `src/v11/application/create/createCommandRuntime.ts` | remote create input normalization | existing create command runtime seam | create command boundary | `--remote` bubble create explicit remote ref-fel keszul; sync hook meg nem fut create-kor | P1 | required-now | T3 |
| CS4 | `src/v11/application/create/createBubblePersistence.ts` | remote create persistence | existing create persistence seam | bubble artifact write path | create siker eseten persisted remote pointer created-shape keszul; remote runtime meg nincs inditva | P1 | required-now | T3 |
| CS5 | `src/v11/application/start/startCommandRemoteSync.ts` | remote sync helper | `runRemotePairflowSync(input) -> Promise<{ attempted: boolean; status: "skipped" | "ok" | "failed"; detail?: string }>` | new pre-start orchestration seam | ha van `pairflow_sync_command`, egyszer fut start elott; hiba eseten fail-soft warningot ad vissza, nem dob hard blockot | P1 | required-now | T4, T5 |
| CS6 | `src/v11/application/start/startCommandOrchestration.ts` | remote provisioning order | existing orchestration seam | remote fresh-start branch | remote clone/provisioning flow a sync hookot a remote start invoke elott futtatja; futó bubble-re nem vonatkozik | P1 | required-now | T4, T6 |
| CS7 | `src/v11/application/start/startCommandApi.ts` | start command summary/result | existing start command API | start command result assembly | a start eredmeny operator-szintu warningban jelezheti a sync fail-soft allapotot, de nem persistalja authority artifactkent | P2 | required-now | T5, T6 |
| CS8 | `tests/config/pairflowConfig.test.ts` | remote sync config tests | unit tests | existing config test surface | valid/invalid `pairflow_sync_command` parse coverage | P1 | required-now | T1, T2 |
| CS9 | `tests/core/bubble/createBubble.test.ts` | remote create provisioning tests | unit/integration tests | create flow test surface | remote create nem futtat sync hookot es created pointert ir | P1 | required-now | T3 |
| CS10 | `tests/core/bubble/startBubble.test.ts` | remote start + sync tests | unit/integration tests | start flow test surface | sync invoke order, skip, fail-soft warning, success path coverage | P1 | required-now | T4, T5, T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Global remote host config | remote host transport fields only | remote host transport + optional start-time sync hook | `host`, `repo_base` | `user`, `pairflow_command`, `default_port_forwards`, `pairflow_sync_command` | additive; missing sync hook remains valid | P1 | required-now |
| Remote create input | nincs remote create delivery contract | explicit remote ref + local pointer created-shape | `remote` ref | existing create flags | additive new command path | P1 | required-now |
| Remote start sync result | nincs | ephemeral start-time diagnostic object | `attempted`, `status` | `detail` | non-persisted runtime-only payload | P2 | required-now |

Implementation notes:

1. A `pairflow_sync_command` target-level opaque command; Pairflow nem parse-olja vagy strukturalt update policyva formalizalja.
2. A hook only-on-start seam: nem fut bubble create utan automatikusan, nem fut laptop startupkor, es nem fut remote `status`/`attach`/mutation commandok elott.
3. A hook fail-soft viselkedesu; V1-ben a version drift nem blocker, csak operatori warning.
4. A hook nem hoz letre uj `remote.json` vagy `state-cache.json` mezot; ezek tovabbra is pointer/cache authority artifactok maradnak.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| global config parse | optional sync command mezo parse/validate | hidden default update policy | parser-only additive contract | P1 | required-now |
| remote provisioning | SSH clone/sync/start invoke | running bubble kozbeni auto-update | a sync hook csak pre-start orchestration pont | P1 | required-now |
| sync hook execute | single remote opaque command invoke | laptop startup trigger, per-command global hook, persisted authority write | fail-soft operational helper | P1 | required-now |
| diagnostics | start-time warning/success summary | durable status/list authority artifact Phase 2A-ban | tartos diagnostics consume Phase 2B ownership | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `pairflow_sync_command` config type | global config parser | throw | actionable config validation error | `PAIRFLOW_REMOTE_SYNC_CONFIG_INVALID` | error | P1 | required-now |
| sync hook absent | remote host config | result | skip sync and continue start | `N/A` | info | P1 | required-now |
| sync hook command returns non-zero | remote sync helper | fallback | warning + continue start | `PAIRFLOW_REMOTE_SYNC_FAILED` | warn | P1 | required-now |
| remote clone provisioning fails | ssh/git dependency | throw | start fails cleanly; no partial success claim | `PAIRFLOW_REMOTE_PROVISION_FAILED` | error | P1 | required-now |
| remote bubble start fails after successful sync | remote pairflow command | throw | fail start, cleanup follows existing start failure rules | `PAIRFLOW_REMOTE_START_FAILED` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v1.md` phase authority | P1 | required-now |
| must-use | `docs/remote-bubble-execution.md` original design source | P1 | required-now |
| must-use | `plans/tasks/remote-bubble-execution-config-and-pointer-authority-phase1a.md` foundation contract source | P1 | required-now |
| must-not-use | exact-match Pairflow version gate | P1 | required-now |
| must-not-use | bubble-szintu runtime pinning artifact | P1 | required-now |
| must-not-use | sync hook invoke laptop startupkor vagy mar futó bubble mellett | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | valid remote sync config parse | `[remotes.<name>]` with `pairflow_sync_command` | parse/validate global config | config valid es optional marad | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T2 | invalid remote sync config reject | non-string vagy empty `pairflow_sync_command` | parse/validate global config | explicit fail-fast validation error | P1 | required-now | `tests/config/pairflowConfig.test.ts` |
| T3 | remote create persists created pointer without sync | remote create input | create flow fut | sync hook nem fut; created remote pointer persisted | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T4 | remote start invokes sync once before remote start | sync command configured | remote start flow fut | hook egyszer fut a remote start invoke elott | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T5 | sync failure is fail-soft | sync command configured but non-zero exit | remote start flow fut | warning keletkezik, de a start tovabbmehet | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T6 | no sync hook means clean skip | sync command missing | remote start flow fut | skip allapot, remote provisioning/start tovabbra is mukodik | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Később külön `pairflow_sync_policy` mező nyitható, ha a best-effort mellett valódi hard-block policy is kell.
2. [later-hardening] A sync hook később kaphat strukturált stdout contractot, ha a `status` vagy `list` felület ezt ténylegesen fogyasztja.
3. [later-hardening] Ha a remote start orchestration túl sok SSH command-assembly logikát hordoz, a sync/provision/start lépések külön remote adapter helperbe emelhetők.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Hard-block sync policy | L2 | P2 | later-hardening | operator flexibility | csak valos use-case es diagnostics consume mellett nyitni |
| H2 | Structured sync diagnostics artifact | L2 | P3 | later-hardening | Phase 2B status/list ideas | kulon consume taskban kezelni, ne Phase 2A-ban |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha a sync hook hard compatibility gate-te valik V1-ben.
3. P1 regresszio, ha a sync hook laptop startuphoz vagy mar futó bubble-höz kotodik.
4. P1 regresszio, ha a sync hook uj persisted authority artifactot vezet be.
5. A task csak akkor lehet `IMPLEMENTABLE`, ha a Phase 1A/1B prerequisite contractok mar explicitten le vannak zarva.

## Spec Lock

Ez a task akkor jelolheto `IMPLEMENTABLE`-nek, ha:

1. a remote create/start provisioning boundary explicit,
2. a `pairflow_sync_command` best-effort start-time seamkent van lezarva,
3. nincs bubble-szintu runtime pinning vagy exact-match gate,
4. a sync hook fail-soft es no-persist viselkedese tesztelhetoen rogzitett.
