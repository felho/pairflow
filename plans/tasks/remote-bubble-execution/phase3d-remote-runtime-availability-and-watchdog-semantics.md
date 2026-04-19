---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3d_remote_runtime_availability_and_watchdog_semantics_v1
title: "Remote Bubble Execution Remote Runtime Availability and Watchdog Semantics (Phase 3D)"
status: implementable
updated_at: 2026-04-19
phase: phase3d-remote-runtime-availability-and-watchdog-semantics
target_files:
  - src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts
  - src/v11/shared/status/remoteBubbleStatusContract.ts
  - src/v11/shared/status/statusCommandApi.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - src/v11/application/status/statusCliTextRenderer.ts
  - src/v11/application/status/statusCliTableRenderer.ts
  - ui/src/lib/attachAvailability.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - tests/cli/bubbleListCommand.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - ui/src/lib/attachAvailability.test.ts
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Runtime Availability and Watchdog Semantics (Phase 3D)

## Current Codebase Check (2026-04-19)

1. A remote status inferalo current-tree szinten osszemossa a runtime-liveness proofot es a protocol-activity stallt:
   - `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts`
   - `inferRuntimeAvailability(...)` jelenleg `missing`-re allitja a remote runtime-ot akkor is, ha a pane sampling tovabbra is olvashato, de a watchdog expired.
2. Ez nem csak implementacios reszlet, hanem explicit current-tree baseline:
   - `tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts`
   - jelenleg kulon teszt assertalja, hogy a watchdog-expired, de olvashato pane snapshot `missing`.
3. A status lane ezt fail-closed remote runtime hiany kent projektalja:
   - `src/v11/shared/status/statusCommandApi.ts`
   - `STATUS_REMOTE_RUNTIME_MISSING`
   - `tests/core/bubble/statusBubble.test.ts`
4. A refreshelt list lane ugyanezt a szemantikat orokiti:
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `tests/core/bubble/listBubbles.test.ts`
5. A UI detail mar most is kulon kepzi az attentiont es a remote runtime diagnozist:
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   - `src/v11/shared/status/bubbleAttention.ts`
   - vagyis a `watchdog_expired` mar ma is onallo attention channel.
6. Az operatori attach policy ugyanakkor a remote runtime `active` proofra ul:
   - `ui/src/lib/attachAvailability.ts`
   - ha a remote runtime nem `active`, attach fail-closed.
7. Emiatt a current tree-ben az alabbi ket eset ugyanabba a kovetkezmenybe omlik:
   - a remote runtime tenyleg elveszett,
   - a remote runtime tovabbra is el, csak nincs observed protocol activity.
8. Ez kulonosen remote bubble-nel problematikus:
   - utazas / lezart laptop / humanra varakozas / approvalra varakozas / huzamosabb idle window mellett a watchdog expiry operatorilag valid lehet,
   - de current-tree szinten ettol meg a bubble `remote runtime unavailable` fail-closed attach allapotba csuszik.

## L0 - Policy

### Goal

1. A remote runtime liveness-proof es a watchdog/activity diagnostics szemantikajanak szetvalasztasa.
2. A `watchdog_expired` maradjon operatori attention, de ne degradalja automatikusan a remote runtime-ot `missing`-re, ha a live session/pane proof tovabbra is rendben van.
3. Az attach fail-closed policy maradjon meg valodi runtime-proof hiany eseten.
4. Ne csusszon ebbe a taskba:
   - watchdog timeout policy atirasa,
   - auto-restart policy,
   - generic local bubble semantics atirasa,
   - remote tmux launcher/transport rewrite.

### Domain / Control Model Summary

1. Business invariant:
   - remote bubble eseten a `runtimeAvailability` csak azt jelentheti, hogy a live remote runtime bizonyithato-e;
   - a protocol inactivity vagy watchdog expiry onmagaban nem runtime-loss.
2. Control model:
   - `active` = van eleg live proof a session/pane olvashatosagara;
   - `missing` = a live proof tenylegesen serult vagy hianyzik;
   - `inactive` = a lifecycle state eleve nem runtime-kepes;
   - `watchdog_expired` = kulon operatori attention channel.
3. Read-path rule:
   - a remote attach es a status/list/UI fail-closed viselkedes kizarolag a live-proof hianyra ulhet;
   - a watchdog only stall nem masqueradelhet runtime-losskent.
4. Forbidden fallback:
   - `watchdog.expired => runtimeAvailability = missing` automatikus egyenertekusites;
   - tmux session egyszeru megletenek kanonikus runtime proofkent kezelese tovabbi pane/session metadata nelkul;
   - synthetic `active` projection ott, ahol a pane/session proof valojaban hianyzik.
5. Allowed resolution path:
   - a remote status inferalast ugy kell szukiteni, hogy a watchdog expiry kikeruljon a `missing` predicatebol;
   - a fail-closed attach tovabbra is a session/pane read proof hianyara uljon;
   - a CLI/UI copy explicitten kulonboztesse meg a stalled vs missing runtime esetet, ahol erre szukseg van.
6. Missing-data rule:
   - ha `sessionName`, `targetPane`, `sampledAt`, `lastChangedAt`, `readStatus`, `lastSampleStatus` kozul a live-proofhoz szukseges mezok barmelyike hianyzik vagy rossz, a runtime marad `missing`;
   - ha ezek rendben vannak, de a watchdog expired, a runtime marad `active`, mellette `watchdog_expired` attentionnel.
7. Phase boundary:
   - shared contract closure: narrow remote runtime-availability semantics clarification
   - workflow_orchestration_closure: owned here
   - read_model_closure: owned here
   - activation_closure: owned here
   - producer_closure: out of scope
   - cleanup_recovery_closure: out of scope

### Plan Linkage

1. Parent plan gap:
   - a lezart `Phase 3C` utan maradt egy residual remote operatori semantics gap:
     a watchdog-expired, de tovabbra is bizonyithatoan elo remote runtime jelenleg ugyanabba a `runtime unavailable` fail-closed bucketbe esik, mint a tenyleges runtime-loss.
2. Depends on:
   - `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2e-remote-status-and-list-read-model.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2f-remote-attach-consume.md`
   - `plans/archive/tasks/remote-bubble-execution/phase3c-recovery-diagnostics-and-rollout.md`
3. Unlocks / impacts successors:
   - pontosabb remote operatori attach semantics
   - tisztabb future remote recovery/restart policy kulon taskba bontasa, ha kesobb szukseges
4. Task-list impact:
   - ez ujonnan felfedezett post-`Phase 3C` residual remote semantics slice;
   - a task explicit nyomot hagy a remote-bubble initiative alatt, meg akkor is, ha a parent plan kesobb kulon progress-update-et igenyel.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md`
   - `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts`
   - `src/v11/shared/status/remoteBubbleStatusContract.ts`
   - `src/v11/shared/status/statusCommandApi.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/shared/status/bubbleAttention.ts`
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   - `ui/src/lib/attachAvailability.ts`
2. Canonical elements:
   - `RemoteBubbleStatusSnapshot.runtimeAvailability`
   - `active | inactive | missing`
   - `STATUS_REMOTE_RUNTIME_MISSING`
   - `watchdog_expired`
3. Guard elements:
   - pane sampling read proof:
     - `readStatus`
     - `lastSampleStatus`
     - `sessionName`
     - `targetPane`
     - `sampledAt`
     - `lastChangedAt`
4. Compat elements:
   - current CLI text/table rendering copy
   - current UI attach fail-closed hint copy
5. Closed terms:
   - `runtimeAvailability`
   - `watchdog_expired`
   - `remote runtime unavailable`
   - `fail-closed`
6. Forbidden reinterpretations:
   - `watchdog_expired` nem nevezheto at runtime-lossra;
   - `runtimeAvailability = active` nem jelentheti azt, hogy a bubble protocol szempontbol healthy vagy progressing;
   - `runtimeAvailability = missing` nem hasznalhato altalanos stall/idle bucketkent.
7. `drift_status`: `newly_discovered_residual_slice`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts`
   - `src/v11/shared/status/statusCommandApi.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   - `src/v11/application/status/statusCliTextRenderer.ts`
   - `src/v11/application/status/statusCliTableRenderer.ts`
   - `ui/src/lib/attachAvailability.ts`
   - kapcsolodo status/list/UI tesztek
2. Actual touched scope:
   - primary bounded-task shape: `activation_or_read_model`
   - justified secondary shape: `consumer_family_alignment`
3. Producer behavior touched:
   - `no`
4. Why the declared shape matches reality:
   - a task nem launch/delivery producer runtime rewrite;
   - a valtozas a mar letezo remote status truth inferalas es annak downstream consume/projection semantics ertelemkorere korlatozodik;
   - a workflow/read-model/UI attach lane ugyanarra az egy szuk runtime-availability contractra ul, ezert bounded closurekent zarhato;
   - restart/recovery automation vagy transport rewrite kulon closure marad.

### Authority Boundary Map

1. `authority_producer`
   - none in scope
2. `persisted_authority`
   - remote state cache csak projection cache, nem canonical source; nem ownershipoljuk
3. `internal_execution_consumers`
   - none in scope
4. `workflow_orchestration_consumers`
   - `src/v11/shared/status/statusCommandApi.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts`
5. `read_model_consumers`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   - `src/v11/application/status/statusCliTextRenderer.ts`
   - `src/v11/application/status/statusCliTableRenderer.ts`
   - `ui/src/lib/attachAvailability.ts`
6. `cleanup_recovery_consumers`
   - explicit out of scope
7. Export surfaces closed in this phase:
   - `none`

### In Scope

1. A remote `runtimeAvailability` inferalo predicate szukitese ugy, hogy a watchdog expiry kulon attention maradjon, ne automatikus runtime-loss.
2. A status lane `STATUS_REMOTE_RUNTIME_MISSING` projectionjenek igazitsa az uj semanticshez.
3. A refresh list projection es a `runtimeReasonCode` semantics igazitsa az uj status truthhoz.
4. A CLI remote status/list copy igazitsa a stalled vs missing runtime kulonbseget.
5. A UI attach fail-closed policy igazitsa ugy, hogy watchdog-only expiry mellett attach tovabbra is engedett maradjon, ha a remote runtime proof egyebkent `active`.
6. A kapcsolodo regresszios tesztek frissitese.

### Out of Scope

1. Watchdog timeout hossz vagy lejart watchdog policy.
2. Auto-restart vagy auto-resume attach policy.
3. Generic local bubble attach semantics.
4. Remote tmux launch / delivery / trust prompt / pane spawn javitasok.
5. Human reply/resume/restart UX redesign.

### Safety Defaults

1. A runtime-loss fail-closed policy csak ott lazulhat, ahol explicit live-proof megvan.
2. A watchdog-expired bubble tovabbra is kaphat critical attentiont.
3. Ha a remote summary csak cache-only shape-et tud, a UI tovabbra is konzervativ maradjon; ez a task nem szuntetheti meg a cache-only fail-closed guardot live proof nelkul.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - remote status semantics
   - remote list refresh read-model semantics
   - UI attach fail-closed policy
   - operatori CLI copy

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Split note:
   - ez a slice meg bounded, mert ugyanazt a remote runtime-availability contractot igazitja a status -> list -> CLI/UI attach olvasasi lancban;
   - restart/recovery policy vagy producer/runtime transport rewrite mar kulon task lenne.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Runtime availability csak live-proofot jelenthet. | Watchdog-only expiry nem lehet runtime-loss. | P1 | required-now |
| Control model | `watchdog_expired` kulon attention. | Attention es runtimeAvailability kulon predikatra ul. | P1 | required-now |
| Forbidden fallback | Stall == missing tilos. | `watchdog.expired` kikerul a `missing` predicatebol. | P1 | required-now |
| Fail-closed preservation | Live-proof hiany tovabbra is fail-closed. | Missing session/pane/sampling proof mellett attach tiltott marad. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `runtimeAvailability = missing` | remote runtime unavailable proof | remote runtime unavailable proof | csak live-proof hiany esetere maradjon | P1 | required-now |
| `watchdog_expired` | attention + current hidden runtime-loss trigger | attention only | operatori jelzes maradjon, de ne implikaljon runtime-loss-t | P1 | required-now |
| `STATUS_REMOTE_RUNTIME_MISSING` | fail-closed reason code | fail-closed reason code | csak tenyleges missing proofnel maradhat | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| remote status runtime semantics | status API, list projection, CLI render, UI presenter, attach availability | breaking semantic refinement in bounded family | same-task alignment kotelezo | no external deferred consumer a target_fileson kivul |
| UI attach fail-closed semantics | expanded card action state | additive operatori unlock in watchdog-only case | same-task alignment kotelezo | auto-restart policy deferred |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | remote runtime proof vs inactivity semantics keveredese | P1 | required-now |
| Successor unlocked | remote recovery/restart policy tisztabb kulon taskba emelheto | P2 | later |
| Explicitly not closed here | auto-restart / remote recovery UX | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts` | `inferRuntimeAvailability(...)` | watchdog expiry => `missing` | watchdog expiry nem triggerel `missing`-et | canonical remote truth itt keletkezik | P1 | required-now | unit test |
| CS2 | `src/v11/shared/status/statusCommandApi.ts` | remote status projection | watchdog-only expiry => `reasonCode=STATUS_REMOTE_RUNTIME_MISSING` | reason code csak valodi missing proofnel | status truth alignment | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| CS3 | `src/v11/shared/list/listCommandEntryProjection.ts` | refreshed remote list entry | watchdog-only expiry => `runtimeAvailability=missing` | active + watchdog attention separation | list read-model parity | P1 | required-now | `tests/core/bubble/listBubbles.test.ts` |
| CS4 | `src/v11/application/status/statusCliTextRenderer.ts`, `statusCliTableRenderer.ts` | operatori copy | watchdog-only expiry runtime unavailable copy | stalled-vs-missing kulonbseg | operatori truth alignment | P1 | required-now | CLI tests |
| CS5 | `ui/src/lib/attachAvailability.ts` | attach enablement | non-active => fail-closed | watchdog-only active proofnel attach enabled | user-visible policy itt dol el | P1 | required-now | UI tests |
| CS6 | `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` | detail merge of attention + remote diag | attention es remote diag egyutt jelenik meg | ez maradjon stabil az uj semantics alatt is | UI correctness proof | P1 | required-now | presenter/UI tests |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `RemoteBubbleStatusSnapshot.runtimeAvailability` | `active | inactive | missing`; watchdog expiry `missing` | same enum; watchdog expiry mellett `active` lehet | `state`, `paneActivity.readStatus`, `lastSampleStatus`, `sessionName`, `targetPane`, `sampledAt`, `lastChangedAt` | `watchdog` marad kulon diagnostics input | semantic refinement, no enum expansion | P1 | required-now |
| remote reason code | `STATUS_REMOTE_RUNTIME_MISSING` watchdog-only expiryre is johet | csak tenyleges missing proofnel johet | `runtimeAvailability=missing` | `cacheReasonCode` parity | bounded consumer realignment | P1 | required-now |

### 4) Implementation Shape

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary shape | `activation_or_read_model` | P1 | required-now |
| Secondary shape | `consumer_family_alignment` | P1 | required-now |
| Producer touched | `no` | P1 | required-now |
| Coordination hardening | `no` | P2 | later |
| Fail-closed hardening | `yes`, preserved baseline | P1 | required-now |

### 5) Validation Matrix

| ID | Scenario | Setup | Expected Result | Priority | Evidence |
|---|---|---|---|---|---|
| V1 | watchdog expired, pane sampling rendben | runtime-capable state + `readStatus=ok` + `lastSampleStatus=sampled` + session/pane IDs present + `expired=true` | `runtimeAvailability=active`; `watchdog_expired` attention marad | P1 | `tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts` |
| V2 | session proof hianyzik | pl. `sessionName=null` vagy `targetPane=null` | `runtimeAvailability=missing`; fail-closed marad | P1 | status + list tests |
| V3 | pane unreadable/no_session | sampler nem tud olvasni | `runtimeAvailability=missing`; reason code marad | P1 | status/list tests |
| V4 | non-runtime lifecycle state | pl. `DONE` | `runtimeAvailability=inactive` | P1 | unit test |
| V5 | status CLI watchdog-only expiry | live proof ok + expired watchdog | ne irja ki a `live runtime unavailable` fail-closed note-ot | P1 | CLI tests |
| V6 | UI attach watchdog-only expiry | expanded card detail active runtime proof + watchdog attention | Attach enabled maradjon; warning kulon jelenjen meg | P1 | `attachAvailability` + card tests |
| V7 | list refresh parity | remote refresh payload watchdog-only expiry | list remoteExecution `runtimeAvailability=active`; nincs `runtimeReasonCode` | P1 | `tests/core/bubble/listBubbles.test.ts` |

### 6) Acceptance Criteria

| ID | Requirement | Evidence |
|---|---|---|
| AC1 | A remote status inferalo nem tekinti a watchdog expiry-t onmagaban runtime-lossnak. | V1 |
| AC2 | A valodi live-proof hiany tovabbra is `missing` marad. | V2, V3 |
| AC3 | A status es a refreshelt list ugyanazt az uj semantics-t projektalja. | V1, V7 |
| AC4 | A CLI nem allitja watchdog-only expiry eseten, hogy a live runtime unavailable. | V5 |
| AC5 | A UI attach watchdog-only expiry eseten nem marad fail-closed. | V6 |

### 7) Test and Verification Plan

1. Update:
   - `tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts`
   - `tests/core/bubble/statusBubble.test.ts`
   - `tests/core/bubble/listBubbles.test.ts`
   - `tests/cli/bubbleStatusCommand.test.ts`
   - `tests/cli/bubbleListCommand.test.ts`
   - `tests/core/ui/bubblePresenter.test.ts`
   - `ui/src/lib/attachAvailability.test.ts`
   - `ui/src/components/canvas/BubbleExpandedCard.test.tsx`
2. Required verification:
   - targeted vitest suites for the files above
   - `pnpm exec tsc -p tsconfig.json --noEmit`
   - `pnpm build`
   - `pnpm --dir ui exec tsc --noEmit`
3. Manual smoke after code change:
   - remote bubble with live tmux session + forced watchdog expiry
   - verify:
     - status JSON says `runtimeAvailability=active`
     - UI still shows `watchdog_expired` attention
     - Attach stays enabled

## L2 - Execution Notes

### Suggested Implementation Order

1. Narrow the remote status runtime predicate in `sshBubbleStatusPayload.ts`.
2. Align status/list reason-code projection to the new predicate.
3. Align CLI rendering so watchdog-only expiry no longer claims runtime-loss.
4. Align UI attach availability to the new runtime proof.
5. Refresh tests in the same order: status -> list -> CLI -> UI.

### Boundedness Guard

1. Do not widen this task into restart/recovery policy.
2. Do not change watchdog timeout math or timer ownership.
3. Do not relax fail-closed behavior for cache-only remote summaries without explicit live proof.
4. If implementation reveals that the current enum needs a new fourth state beyond `active | inactive | missing`, stop and route back to plan refinement instead of silently stretching this task.

### Operator-Facing Outcome

1. Remote bubble lehet:
   - `watchdog_expired`
   - es ettol fuggetlenul attacholhato
   - ha a remote live proof tovabbra is jo.
2. A `remote runtime unavailable` uzenet csak akkor marad, ha a remote runtime proof tenylegesen serult.
