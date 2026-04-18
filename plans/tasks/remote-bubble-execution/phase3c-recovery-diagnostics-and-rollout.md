---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3c_recovery_diagnostics_and_rollout_v1
title: "Remote Bubble Execution Recovery Diagnostics and Rollout Closure (Phase 3C)"
status: implementable
updated_at: 2026-04-18
phase: phase3c-recovery-diagnostics-and-rollout
target_files:
  - README.md
  - docs/remote-bubble-execution.md
  - src/shared/contracts/uiRemoteExecution.ts
  - src/v11/shared/list/listCommandApi.ts
  - src/v11/application/list/listCliCommand.ts
  - tests/core/bubble/listBubbles.test.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - tests/core/ui/router.test.ts
  - tests/core/bubble/statusBubble.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Recovery Diagnostics and Rollout Closure (Phase 3C)

## Current Tree Position (2026-04-18)

1. A `Phase 2B-2F`, `Phase 3A`, `Phase 3B1`, `Phase 3B2`, es `Phase 3B3` mar merged es archivalt baseline:
   - `plans/archive/tasks/remote-bubble-execution/phase2b-remote-create-write-path-enablement.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2c-remote-sync-hook-contract-foundation.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2d-remote-ssh-start-activation.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2e-remote-status-and-list-read-model.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2f-remote-attach-consume.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3a-remote-approval-and-rework-routing.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3b1-remote-commit-routing-and-continuity.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3b2-remote-merge-routing-and-publication.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3b3-remote-delete-cleanup-and-archive-closure.md`
2. A cleanup-routing split lezart; a parent plan szerint az egyetlen nyitott successor a `Phase 3C`.
3. A current-tree status source anchor mar letezik:
   - `src/v11/shared/status/statusCommandApi.ts`
   - `src/v11/application/status/statusCliTextRenderer.ts`
   - `src/v11/application/status/statusCliTableRenderer.ts`
   Ezek mar explicit fail-closed surfacinget adnak a `STATUS_REMOTE_RUNTIME_MISSING` allapotra.
   Ezek ebben a taskban source anchorok es retained parity guardok; nem default mutacios ownership.
4. A current-tree list/read-model surface viszont meg nem zarja le ugyanezt a runtime-loss semantics-et:
   - `src/v11/shared/list/listCommandApi.ts`
   - `src/v11/application/list/listCliCommand.ts`
   A live refresh ma nem ad ugyanolyan explicit preserved-state/runtime-loss diagnosztikat, mint a status surface.
5. A design doc mar kimondja a reboot/runtime-loss baseline-t, de ez meg nincs teljesen rolloutolva operator-facing status/list/docs wordingben:
   - `docs/remote-bubble-execution.md`

## L0 - Policy

### Goal

1. Zarja le a remote reboot/runtime-loss recovery diagnostics surface-t ugy, hogy a started remote pointerre ulo live status truth fail-closed semantics-e konzisztensen megjelenjen `bubble status`, `bubble list --refresh`, es a user-facing docs surface-eken.
2. Rogzitse a reboot/repair guidance-et ugy, hogy ne sugalljon nem tamogatott started-pointer restart contractot.
3. Kerjen minimal manual smoke evidence-et a rollout closure-hoz.

### Domain / Control Model Summary

1. Business invariant:
   - remote reboot vagy tmux/runtime elvesztese eseten a persisted bubble state megmaradhat, mikozben a live runtime mar nem aktiv; ezt fail-closed modon kell surfacelni, nem successkent vagy tamogatott restartkent.
2. Control model:
   - a live runtime-loss truth source-a a started remote pointerre ulo remote status read;
   - a local `state-cache.json` tovabbra is cache authority, nem runtime truth;
   - a docs ugyanennek a lezart control modelnek a wordingjat oroklik.
3. Read-path rule:
   - `bubble status` es `bubble list --refresh` olvashat live remote status payloadot;
   - default `bubble list` tovabbra is cache-only read-model marad;
   - docs/readme csak a fenti explicit runtime-loss semantics-et irhatja le.
4. Forbidden fallback:
   - stale cache vagy local control-plane placeholder nem nevezheto live runtime truthnak;
   - `pairflow bubble start --id <bubbleId>` nem irhato le started-pointer restart contractkent;
   - runtime-loss nem moshato ossze generikus `inactive` vagy `refresh unavailable` jelentessel, ha a live status kifejezetten `missing` runtime-ot adott.
5. Allowed resolution path:
   - started pointer -> live remote status read -> explicit runtime-loss projection -> retained cache update only where mar baseline -> CLI/JSON/docs surfacing;
   - operator guidance: inspect -> confirm preserved state -> fail closed -> manual next step a dokumentalt boundaryn belul.
6. Missing-data rule:
   - ha live status nem erheto el, marad az eddigi unavailable/cache fallback surface;
   - ha cache-only list fut, nincs synthetic runtime-loss diagnosis;
   - ha docs nem tudnak lezart recovery contractot allitani, explicit "not supported in this phase" wording kell.
7. Phase boundary:
   - contract closure: owned here a remote runtime-loss diagnostics wording es additive shared projection mezok szintjen
   - producer closure: not owned here
   - internal execution closure: not owned here
   - workflow/orchestration closure: owned here csak read-only status/list surfacingig
   - read-model closure: owned here
   - activation closure: not owned here
   - cleanup/recovery closure: owned here csak diagnostics/runbook/rollout szinten, nem runtime recreate implementaciokent

### Plan Linkage

1. Parent plan gap closed:
   - `Phase 3C` recovery/docs/rollout closure.
2. Depends on:
   - `plans/archive/tasks/remote-bubble-execution/phase2e-remote-status-and-list-read-model.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2f-remote-attach-consume.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3b3-remote-delete-cleanup-and-archive-closure.md`
3. Unlocks / impacts successors:
   - `N/A`; ez a parent plan utolso nyitott successor taskja.
4. Task-list impact:
   - materializalja a parent plan `Phase 3C` placeholderjat.
5. Inherited validation / exit expectation:
   - recovery diagnostics tests,
   - docs wording closure,
   - legalabb egy manual remote smoke evidence.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md`
   - `docs/remote-bubble-execution.md`
   - `src/shared/contracts/uiRemoteExecution.ts`
   - `src/v11/shared/status/statusCommandApi.ts`
   - `src/v11/application/status/statusCliTextRenderer.ts`
   - `src/v11/application/status/statusCliTableRenderer.ts`
2. Canonical elements:
   - started remote pointer a live remote status read authority entrypointja;
   - `STATUS_REMOTE_RUNTIME_MISSING` a current-tree explicit status-level runtime-loss signal;
   - cache tovabbra is cache-only authority;
   - a reboot/runtime-loss scenario preserved-state + live-runtime-missing fail-closed semantics.
3. Guard elements:
   - cache freshness timestamps,
   - `compatLifecyclePlaceholder`,
   - `refreshAttemptedAt`,
   - host/alias supplement data.
   Ezek nem promovalhatok canonical runtime truthra.
4. Compat-only elements:
   - `compatLifecyclePlaceholder`,
   - existing list cache/unavailable fallback projection,
   - retained JSON shapes ott, ahol a new diagnostics csak additive lehet.
5. Forbidden reinterpretations:
   - runtime-loss nem irhato le ugy, mintha a bubble "siman megallt" es `start` ujraindithatna;
   - list refresh diagnostics nem veszitheti el a `missing` es `unavailable` kulonbseget, ha a live status mar tudja a kulonbseget;
   - docs nem nyithatnak uj lifecycle commandot vagy restart contractot.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/list/listCommandApi.ts`
   - `src/v11/application/list/listCliCommand.ts`
   - `src/shared/contracts/uiRemoteExecution.ts`
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   - `tests/core/ui/router.test.ts`
   - `src/v11/shared/status/statusCommandApi.ts`
   - `src/v11/application/status/statusCliTextRenderer.ts`
   - `src/v11/application/status/statusCliTableRenderer.ts`
   - `docs/remote-bubble-execution.md`
   - `README.md`
2. Actual touched scope:
   - primary `activation_or_read_model`;
   - secondary `fail_closed_hardening`.
3. Mutation entrypoints in scope:
   - existing remote status cache write path refresh utan,
   - list refresh projection builder,
   - docs/readme text updates.
4. Hidden scope ruled out:
   - nincs scope-ban remote restart implementation,
   - nincs scope-ban attach launcher vagy port-forward redesign,
   - nincs scope-ban approve/commit/merge/delete routing,
   - nincs scope-ban auto-recovery vagy janitor cleanup.
5. Branch inventory note:
   - started pointer + live runtime active,
   - started pointer + live runtime missing,
   - started pointer + refresh unavailable,
   - started pointer + cache-only list,
   - created pointer,
   - docs/runbook wording,
   - manual smoke evidence.
6. Why the declared task shape matches reality:
   - a current tree mar tudja a runtime-loss status authorityt; ez a task ezt a lezart truthot terjeszti ki a retained list/docs/operator rollout surfacesre, runtime recreate vagy lifecycle mutation ownership nelkul;
   - a status-layer file-ok itt canonical anchor/parity guard szerepben maradnak, mig a tenyleges edit ownership a list/shared-contract/docs consume familyre szukul.

### Authority Boundary Map

1. Authority producer:
   - existing remote `bubble status --json` live read a started pointer authorityjan.
2. Stored authority:
   - remote persisted bubble control-plane (`state.json`, transcript, artifacts) a remote clone-ban;
   - local `state-cache.json` mint cache-only projection.
3. In-scope consumers:
   - list CLI/JSON refresh projection,
   - passive UI passthrough consumers (`bubblePresenter`, router payload shape) additive shared-contract alignment szintjen,
   - status CLI render csak source-anchor/parity guardkent,
   - README/design-doc operator guidance.
4. Explicit out-of-scope consumers:
   - start/restart activation,
   - attach runtime recreation,
   - cleanup/delete repair,
   - generic remote health daemon vagy background sync,
   - status command authority redesign.
5. Export surfaces closed in this phase:
   - yes, a remote runtime-loss diagnostics wording a status/list/docs operator surfacesen.

### Baseline Preservation

1. Must-preserve behaviors:
   - `bubble status` live runtime-missing note retained marad,
   - default `bubble list` cache-only marad,
   - unavailable refresh fallback retained marad,
   - started-pointer restart tovabbra sem tamogatott contract.
2. Allowed resolution paths:
   - live status read started pointerrol,
   - list refresh same live status authorityrol,
   - cache update ugyanazon baseline szerint,
   - docs ugyanezt a fail-closed semantics-et irjak le.
3. Forbidden regression interpretations:
   - `LIST_REMOTE_REFRESH_UNAVAILABLE` nem helyettesitheti a runtime-loss kulon allapotot, ha a live status mar explicit `missing`;
   - docs nem nevezhetik workaroundnak a `bubble start` restartot;
   - status/list wording nem sugallhat "resume" vagy "reattach to dead tmux" semantics-et.
4. Replacement proof required if removed:
   - ha a current `STATUS_REMOTE_RUNTIME_MISSING` wording vagy note valtozik, explicit equivalent list/status/docs evidence kell arra, hogy a preserved-state fail-closed semantics tovabbra is olvashato.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape:
   - `activation_or_read_model`
2. Secondary shape (if any):
   - `fail_closed_hardening`, mert a list/docs rollout nem veszithet el mar lezart fail-closed semantics-et.
3. Preconditions that must pass before side effects:
   - valid started remote pointer,
   - successful live remote status read a runtime-loss diagnostics branchhez,
   - docs wording explicit source-anchorral osszhangban.
4. Side effects forbidden before preconditions pass:
   - synthetic runtime-loss projection cache-only vagy unavailable branchbol,
   - cache write locally inferred runtime statebol,
   - docsban restart-support allitas.
5. Invalid/precondition-failure behavior:
   - retained unavailable/cache-only branch, zero uj lifecycle side effect.
6. Coordination primitives in scope:
   - `N/A`

### In Scope

1. Runtime-loss diagnostics additive surfacing a `bubble list --refresh` read-modelben.
2. Status/list/docs wording alignment a preserved-state fail-closed semantics korul.
3. User-facing reboot/repair guidance ugyanazon bounded authority kereten belul.
4. Manual smoke evidence elvaras a rollout closure-hoz.

### Out of Scope

1. Started-pointer restart implementation.
2. Uj public recovery command.
3. Auto-restart, auto-cleanup, vagy background state sync.
4. Attach launcher/runtime recreate semantics.
5. Remote cache-authority redesign.

### Safety Defaults

1. Ha nincs live proof, nincs runtime-loss diagnosis.
2. Ha runtime-loss bizonyitott, nincs "just run start again" guidance.
3. Ha refresh unavailable, az nem nevezheto runtime-lossnak.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - `UiBubbleListRemoteExecution`
   - list/status operator-facing CLI text
   - remote execution docs wording

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: started pointer -> remote status live read -> runtime-loss projection -> status/list/docs surfacing
   - competing identifiers or fallback identities: stale cache, compat lifecycle placeholder, local control-plane heuristics
10. Authority/source-of-truth note:
   - canonical source: live remote status for runtime-loss, cache for cache-only list fallback
   - forbidden secondary sources: local-only lifecycle placeholder as live runtime truth, restart heuristics
11. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `read_model_consumers`, `cleanup_recovery_consumers`
   - intentionally collapsed closures: list diagnostics + docs/runbook + rollout evidence, mert ugyanazon lezart runtime-loss semantics operator consume-family rolloutja
   - explicitly deferred closures: `authority_producer`, `internal_execution_consumers`, actual restart/recovery implementation
12. Bounded-task-shape decision:
   - primary shape: `activation_or_read_model`
   - secondary shape: `fail_closed_hardening`
   - why this bounded mix is safe: a task nem valtoztat runtime truthot vagy lifecycle mutationt, csak a mar lezart truth surfacinget es operator guidance-et zarja le.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Reboot/runtime-loss = persisted state may exist, live runtime may be missing. | Ezt explicit fail-closed modon kell surfacelni. | P1 | required-now |
| Control model | Live runtime-loss authority csak started pointer + live remote status read lehet. | Cache-only vagy local compat nem eleg. | P1 | required-now |
| Read-path rule | `status` es `list --refresh` olvashat live remote status payloadot; default `list` tovabbra is cache-only. | Nincs implicit SSH refresh vagy synthetic runtime-loss note cache branchen. | P1 | required-now |
| Forbidden fallback | `bubble start` nem restart contract, `inactive` nem helyettesitheti `missing` runtime-loss allapotot, ha live status mar bizonyitotta a hianyt. | Additive diagnostics kell a list surface-en. | P1 | required-now |
| Allowed resolution path | started pointer -> live status -> additive projection -> docs/runbook wording ugyanebbol a semantics-bol. | Nincs uj command vagy runtime recreate flow. | P1 | required-now |
| Missing-data rule | Refresh unavailable/cache-only branch retained marad; runtime-loss csak live proofbol johet. | A fallback taxonomy tovabbra is fail-closed. | P1 | required-now |
| Phase boundary | Ez diagnostics/docs/rollout closure, nem recovery execution. | Uj restart/recovery mechanika out-of-scope. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `STATUS_REMOTE_RUNTIME_MISSING` | `src/v11/shared/status/statusCommandApi.ts` + status renderers | preserved state on disk, live runtime unavailable, fail-closed | preserve | P1 | required-now |
| `state-cache.json` | `docs/remote-bubble-execution.md` + list/status APIs | cache-only projection, not live runtime truth | preserve | P1 | required-now |
| started pointer | remote execution docs + command APIs | authority entrypoint for live remote status read | preserve | P1 | required-now |
| `compatLifecyclePlaceholder` | `src/shared/contracts/uiRemoteExecution.ts` | compat-only list fallback, not live truth | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | status/list command APIs, renderers, shared projection types, docs/readme | Valos scope = read-model diagnostics rollout | P1 | required-now |
| Actual touched scope | read-model + docs + fail-closed wording | Nem csuszhat restart implementationba | P1 | required-now |
| Mutation entrypoints in scope | existing cache write refresh utan, docs text files | No new runtime mutation seam | P1 | required-now |
| Hidden scope ruled out | start/attach/delete family nem target file | Uj lifecycle work ilyen taskban blocker | P1 | required-now |
| Branch inventory note | live missing vs refresh unavailable vs cache-only | Mindharom allapot kulon tesztelendo | P1 | required-now |
| Shape proof | a mar lezart status authority rolloutja list/docs felszinen | bounded task shape ervenyes | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | `Phase 3C` recovery/docs/rollout closure | a plan utolso nyitott gapja lezarul | P1 | required-now |
| Depends on | `Phase 2E`, `Phase 2F`, `Phase 3B3` archived baseline | read-model es cleanup predecessor semantics mar lezart | P1 | required-now |
| Unlocks / impacts successors | `N/A` | nincs tovabbi plan successor | P1 | required-now |
| Task-list impact | materializalja a nyitott taskot | plan active-task section ehhez igazodik | P1 | required-now |
| Inherited validation / exit expectation | diagnostics tests + docs + manual smoke | implementation bubble nem zárhat smoke evidence nelkul | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `UiBubbleListRemoteExecution` | list CLI text, UI presenter passthrough, router JSON payload consumers, list tests | additive | optional runtime-loss diagnostics fields hozzaadasa a live refresh branchhez; passive passthrough consumers explicit inventoryja megtortenik | broad web UI copy polish `N/A` |
| status remote execution wording | status CLI text/table, UI detail payload, status tests | preserve + wording alignment | retained runtime-loss semantics megorzese source-anchor/parity guardkent; target-scope default edit nelkul | `N/A` |
| remote execution docs wording | README, design doc, operator usage | additive/preserve | explicit reboot/runtime-loss guidance | `N/A` |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| status runtime-missing note | preserve | status tests es renderer asserts zoldben maradnak vagy equivalentre frissulnek | P1 | required-now |
| default list cache-only projection | preserve | cache-only list tesztben nincs synthetic runtime-loss field | P1 | required-now |
| refresh unavailable fallback | preserve | existing unavailable tests retained | P1 | required-now |
| docs that imply started-pointer restart support | forbid | README/design doc explicit "not supported in this phase" wording | P1 | required-now |

### 0f) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| live runtime-loss projection | successful live remote status read returning runtime missing | cache/local placeholderbol gyartott runtime-loss branch | retain explicit unavailable/cache fallback | P1 | required-now |
| docs recovery guidance | source-anchor wording checked against design doc and current status contract | restart support vagy unsupported command allitas | explicit fail-closed guidance only | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/shared/contracts/uiRemoteExecution.ts` | `UiBubbleListRemoteExecution` | type export | shared list remote execution contract | additive mezokkel lehessen kulon runtime-loss diagnostics-et surfacelni a refresh branchen | P1 | required-now | T2, T3 |
| CS2 | `src/v11/shared/list/listCommandApi.ts` | refreshed remote list builder | existing internal helper + exported `listBubbles(...)` path | list refresh projection | live runtime-loss kulon diagnosztikakent jelenik meg, nem unavailable/cache branchkent | P1 | required-now | T2, T3, T4 |
| CS3 | `src/v11/application/list/listCliCommand.ts` | `renderBubbleListText(...)` | existing export | list CLI summary | text output lassa a runtime-loss kulon allapotot es ne sugalljon restartot | P1 | required-now | T2, T4, T5 |
| CS4 | `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`, `tests/core/ui/router.test.ts` | presenter passthrough + router payload contract | existing exports/tests | passive consumer alignment guard | additive list-contract bovites mellett a passthrough consumers vagy valtozatlanok maradnak, vagy explicitten igazodnak kulon redesign nelkul | P1 | required-now | T2, T5 |
| CS5 | `src/v11/shared/status/statusCommandApi.ts`, `src/v11/application/status/statusCliTextRenderer.ts`, `src/v11/application/status/statusCliTableRenderer.ts` | status source anchor + renderers | existing exports | parity/source-anchor guard | a retained `STATUS_REMOTE_RUNTIME_MISSING` semantics marad source anchor; itt csak parity-preservation engedett | P1 | required-now | T1, T5 |
| CS6 | `README.md`, `docs/remote-bubble-execution.md` | user-facing docs sections | markdown docs | recovery/runbook/rollout wording | explicit reboot/runtime-loss guidance + manual smoke checklist | P1 | required-now | T5, T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `UiBubbleListRemoteExecution` | `viewKind`, `stateSource`, cache metadata, refresh failure reasons | additive live runtime diagnostics a refresh branchhez | existing required fields retained | optional runtime diagnostics fields only when live refresh proves them | non-breaking additive | P1 | required-now |
| status remote execution projection | explicit runtimeAvailability + `STATUS_REMOTE_RUNTIME_MISSING` | retained | existing status fields retained | wording-only alignment | non-breaking | P1 | required-now |
| docs/runbook guidance | design doc has recovery matrix; README currently thinner | explicit operator guidance aligned to design doc + current status contract | command examples + unsupported restart wording | manual smoke checklist | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Remote status cache | existing cache write after successful live refresh | cache mutation from local inference or unavailable branch | current baseline only | P1 | required-now |
| CLI/read-model projection | additive remote diagnostics fields/text | lifecycle mutation, remote restart, attach side effects | read-only surface task | P1 | required-now |
| Docs | README/design doc wording updates | promising unsupported restart/recovery behavior | manual smoke evidence may live in done package / evidence note | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| live status says runtime missing | remote status read | result | explicit runtime-loss projection, fail-closed note | `STATUS_REMOTE_RUNTIME_MISSING` and additive list equivalent if introduced | info | P1 | required-now |
| list refresh unavailable | remote status read | fallback | existing unavailable/cache branch | `LIST_REMOTE_REFRESH_UNAVAILABLE` | warn | P1 | required-now |
| cache-only list | `N/A` | result | cache projection only, no runtime-loss inference | `N/A` | info | P1 | required-now |
| docs cannot prove supported recovery step | source anchors | result | explicit "not supported in this phase" wording | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `docs/remote-bubble-execution.md`, current status runtime-missing behavior, parent plan `Phase 3C` wording | P2 | required-now |
| must-not-use | `bubble start` as restart contract, attach-as-recovery wording, new background sync/autorestart semantics | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | status runtime-loss baseline retained | started remote pointer, live status says runtime missing | `getBubbleStatus` + CLI render | explicit fail-closed runtime-loss note retained | P1 | required-now | automated test |
| T2 | list refresh surfaces runtime-loss explicitly | started remote pointer, `--refresh`, live status says runtime missing | `listBubbles` + text render | refresh branch carries explicit runtime-loss diagnostics; not downgraded to generic inactive/unavailable | P1 | required-now | automated test |
| T3 | cache-only list does not invent runtime-loss | started remote pointer, no refresh, cache present | `listBubbles` | cache projection marad, no synthetic runtime-loss diagnostics | P1 | required-now | automated test |
| T4 | refresh unavailable remains distinct from runtime-loss | started remote pointer, refresh transport/payload failure | `listBubbles --refresh` | retained unavailable/cache fallback reason branch marad | P1 | required-now | automated test |
| T5 | docs wording matches fail-closed contract | updated README + design doc | doc review / text assertions as applicable | no started-pointer restart guidance; explicit runtime-loss guidance present | P1 | required-now | doc diff checklist |
| T6 | manual remote smoke | remote bubble started on real/simulated remote, runtime then removed (for example tmux/session gone while persisted state remains) | operator runs `bubble status`, `bubble list --refresh`, follows docs wording | observed output and docs guidance agree on preserved-state fail-closed semantics | P1 | required-now | manual smoke note in done package or task evidence |

## L2 - Implementation Notes

1. A legszukebb biztonsagos additive contract az, ha a list refresh branch kap optional runtime diagnostics mezot ahelyett, hogy a cache/unavailable taxonomiat ujrairnank.
2. Ha a UI JSON consumer mar most transzparensen passthrough-olja a remoteExecution objectet, a task ne nyisson kulon web-UI redesignot; csak a shared projection contract es a retained CLI/docs consume legyen ownership, a presenter/router pedig passive consumer guard maradjon.
3. A manual smoke evidence legyen rovid, de konkret:
   - pontos parancsok,
   - pontos observed status/list output vagy JSON fieldek,
   - egy mondat arrol, hogy a docs wording ezzel megegyezett.

## Review Focus

1. A runtime-loss diagnostics tovabbra is ugyanazon started-pointer live status authorityra ul-e.
2. A list refresh nem mossa-e ossze a `missing` es `unavailable` allapotokat.
3. A default cache-only list nem talal-e ki uj live truthot.
4. A docs nem sugallnak-e nem tamogatott restart/recovery contractot.
5. A manual smoke elvaras eleg konkret-e a rollout closure-hoz.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Ha a list runtime-loss diagnostics kesobb tobb UI copy/visual state valtozast igenyel, azt kulon UI-polish follow-up taskba kell rakni | L2 | P2 | later-hardening | ReviewSpec refine round | a jelen task maradjon list/shared-contract/docs rollout, ne web-UI redesign |
