---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3a_remote_approval_and_rework_routing_v1
title: "Remote Bubble Execution Remote Approval And Rework Routing (Phase 3A)"
status: implementable
phase: phase3a-remote-approval-and-rework-routing
target_files:
  - src/cli/commands/bubble/approve.ts
  - src/cli/commands/bubble/requestRework.ts
  - src/v11/application/approval/approvalCommandApi.ts
  - src/v11/application/approval/approvalCommandContract.ts
  - src/v11/application/approval/approvalCommandDependencyResolution.ts
  - src/v11/application/approval/approvalCommandOrchestration.ts
  - src/v11/application/approval/emitApprovalV11.ts
  - src/v11/application/approval/runApprovalFlow.ts
  - src/v11/application/approval/runApprovalFlowContext.ts
  - src/v11/application/approval/runApprovalFlowHandlers.ts
  - src/v11/application/approval/runApprovalDecisionFlowHandler.ts
  - src/v11/application/approval/runApprovalDeferredRework.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerHttpErrors.ts
  - tests/cli/bubbleApproveCommand.test.ts
  - tests/cli/bubbleRequestReworkCommand.test.ts
  - tests/v11/application/approval/runApprovalFlow.test.ts
  - tests/core/ui/router.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Approval And Rework Routing (Phase 3A)

## Feynman Summary / One-Screen Model

1. A `Phase 2D-2F` mar lezarta a remote bubble runtime authority baseline-t:
   - started remote pointer letezik,
   - a remote status/list read-model mar a remote runtimeot irja le,
   - a remote attach consume mar a started pointerrol dolgozik.
2. A `Phase 3A` ezt nem irja felul, hanem a human mutation surface-re forditja:
   - local bubble -> retained local approve/request-rework flow,
   - remote `created` vagy missing pointer -> explicit "start first" fail-closed,
   - remote `started` pointer -> approve/request-rework remote command route ugyanarra a runtime authorityra.
3. A mutation authority es a read-model authority itt is kulon szerep:
   - remote bubble allapotvaltozasa nem a laptop local `state.json` / transcript / inbox irasabol jon,
   - a laptop csak a routed remote mutation eredmenyet consume-olja; status/list/cache projection rewrite nem ebben a fazisban zarul.
4. A task lenyege nem remote cleanup vagy recovery:
   - nincs commit/merge/delete routing,
   - nincs reply routing,
   - nincs restart/reboot recovery semantics.
5. A request-rework ket retained local semantic branch-et tart meg:
   - `READY_FOR_HUMAN_APPROVAL` -> immediate rework,
   - `WAITING_HUMAN` -> deferred deterministic rework intent;
   remote bubble eseten mindketto a remote authorityn hajtodik vegre, nem local surrogate truthon.

## Current Codebase Check / Current-Tree Reality Check (2026-04-17)

1. A remote runtime activation/read-model/attach consume mar lezart:
   - `Phase 2D` adja a started pointer authorityt,
   - `Phase 2E` adja a remote status/list projection truthot,
   - `Phase 2F` adja a remote attach consume-ot.
2. A jelenlegi approval/rework implementation tovabbra is local mutation boundaryra epul:
   - `runApprovalDecisionFlowWithContext(...)` local transcript appendet es local `state.json` write-ot csinal,
   - `runRequestReworkFlowWithContext(...)` local deferred rework intent queue-t es local state write-ot csinal,
   - a bubble identity es a tmux delivery is local mutation-flowbol indul.
3. A CLI es a UI ugyanarra a local approval API-ra ul:
   - `src/cli/commands/bubble/approve.ts`
   - `src/cli/commands/bubble/requestRework.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/routerActionDispatch.ts`
4. A jelenlegi kodbase-ben nincs remote approval/rework command router:
   - nincs kulon typed helper/port, amely a started remote pointerrol remote mutationt futtatna,
   - es nincs bounded machine-readable remote result consume seam a CLI/UI/application callersnek.
5. Target-file reality pontositas:
   - a front matterben jelolt SSH approval helper jelenleg meg nem letezo uj file/surface,
   - a mai repo-ban az SSH executor oldalon a megfelelo analog belso surface a `sshBubbleStart.ts` es a `sshBubbleStatus.ts`,
   - ezert a task nem review-olhato ugy, mintha kotelezoen egy mar letezo approval SSH modul patch-elese lenne az egyetlen jo megoldas,
   - mikozben a front matter `target_files` tovabbra is tiszta file-path inventory marad, es a placement-flex szabaly csak a body-level contractban rogzithet.
6. A design doc mar kimondja az altalanos remote command routing intentet:
   - `pairflow bubble <command>` remote bubble eseten SSH-n a remote clone-ban fut,
   - de a jelenlegi implementationnek meg nincs ehhez bounded approval/rework consumer seama.
7. A sandbox compatibility gate kifejezetten tiltja, hogy ez a task szetszorja az egyedi raw SSH command string epitest a kodbase-ben.

## Parent Plan Fit / Stable Sequencing

1. A task a parent plan `Phase 2F -> Phase 3A -> Phase 3B` sorrendjet valtozatlanul orokli:
   - `Phase 2F` ownershipa a remote attach consume,
   - `Phase 3A` ownershipa a remote approval/rework mutation routing,
   - `Phase 3B` ownershipa a remote commit/merge/delete cleanup routing.
2. Ez a task nem nyitja ujra a megelizo fazisokat:
   - nem modosithatja a started pointer producer authorityt,
   - nem modosithatja a status/list/attach read-model baseline-t,
   - nem nyithat implicit restart/recovery semantics-et.
3. Remaining-task viability explicit:
   - `Phase 3B` tovabbra is kulon cleanup routing task marad,
   - `Phase 3C` tovabbra is kulon recovery/docs/rollout task marad,
   - plain remote `reply` routing nem emelheto be csendben ebbe a taskba.

## Target Surface / Touch Envelope

1. A touched reality itt nem egyszeru CLI polish:
   - a primer scope valojaban workflow-orchestration + mutation entrypoint alignment,
   - mert az approval/rework flow ma local transcript/state mutation boundary.
2. A kotelezo bounded surface-ek:
   - approve/request-rework CLI entrypoint retained parse/help + remote-safe application consume,
   - approval flow context/orchestration, ahol a local-vs-remote mutation authority elvalik,
   - kulon bounded remote approval command helper vagy port,
   - UI router/default consume, hogy a first-party UI se local-only mutation truthot feltetelezzen,
   - explicit regression tests a local retained es a remote routed branchre.
3. Placement precision:
   - a helper lehet uj SSH executor file vagy a meglevo approval/application seam melletti szuk extract,
   - de a placementnek ugyanazon bounded remote approval/rework consume csaladon belul kell maradnia,
   - es nem nyithat altalanos multi-command vagy cleanup routing foundationt.
4. A task nem olvashato at ugy, mintha generikus "remote command router" foundation lenne:
   - ez a task csak az approval/request-rework family consume-ja,
   - a commit/merge/delete family kulon `Phase 3B`.
5. A task nem olvashato at ugy sem, mintha minden human mutation ide tartozna:
   - `reply` szandekosan nincs a target_files kozt,
   - mert ez a task approval/rework ownershipu, nem altalanos WAITING_HUMAN mutation cutover.

## Source-Anchor Consistency

1. A `Phase 3A` primary authorityja a parent plan es ez a taskfilel:
   - `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md`
   - ez a task szukebb authority, mint a design doc altalanos "other commands" wordingje.
2. Closed-contract source anchors:
   - `Phase 2D`: started pointer remote runtime authority,
   - `Phase 2E`: remote status/list read-model es cache projection,
   - `Phase 2F`: remote attach command authority + fail-closed operator surface.
3. Canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - `remote.json(kind="started")` a remote runtime mutation target authorityja,
   - `state-cache.json` read-model/cache artifact, nem mutation authority,
   - local `state.json`, transcript, inbox remote bubble eseten nem lehet canonical runtime truth.
4. Forbidden reinterpretations:
   - remote bubble approval/rework nem jelentheti azt, hogy a laptop local mutation flow "eleg jo" fallback,
   - a `started` pointer nem downgrade-olhato puszta hintte vagy compat branch selectorra,
   - a `Phase 3A` nem nevezheti at a deferred rework intentet "reply equivalent" vagy egyeb lazitott fogalomra.
5. `drift_status`: `closed_contract_preserved`

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis kizarolag a remote approval/rework routingot zarja le:
   - remote approve mutation route,
   - remote request-rework immediate route,
   - remote request-rework deferred queue route,
   - bounded typed helper/port a remote command futtatasra.
3. A task retained baseline-kent kezeli:
   - local approve/request-rework behavior,
   - override semantics,
   - immediate vs queued rework policy,
   - UI modal/message semantics.
4. A task kifejezetten nem vallalja:
   - remote `reply` routingot,
   - remote commit/merge/delete routingot,
   - remote reboot/restart recoveryt,
   - altalanos shared remote command router teljes command-family cutovert.

## Sandbox Compatibility Gate

Reference: `docs/architecture/sandbox-compatibility-gate.md`

1. `SG1 Runtime Boundary Preservation`
   - megfeleles: igen, ha a `Phase 3A` remote approve/request-rework routing tovabbra is kulon mutation relay seamkent marad meg, es nem redukalodik puszta host-shell shortcutra.
   - konkret Phase 3A ertekeles:
     - ez a task csak az approval/rework command relay szeletet formalizalja,
     - nem mossa ossze a runtime start, interactive attach, vagy cleanup/teardown retegeket a remote approval helperrel,
     - a `Phase 2D-2F` retained baseline marad a start/status/list/attach boundarykon.
2. `SG2 Host Path Non-Authority`
   - megfeleles: igen, ha a remote mutation authority tovabbra is a started remote pointer + canonical remote Pairflow state, nem pusztan a `remoteClonePath`.
   - konkret Phase 3A ertekeles:
     - a `remoteClonePath` implementation detail marad a target resolutionhoz,
     - a canonical mutation targetet a `remote.json(kind="started")` pointer authority es a remote runtime state jeloli,
     - host path nem valhat egyeduli persisted identityve vagy local caller shortcut authorityva.
3. `SG3 Host-Tool Decoupling`
   - megfeleles: igen, ha a task nem nevezi at az approval/rework mutationt `ssh`- vagy `tmux`-specifikus product-fogalomma.
   - konkret Phase 3A ertekeles:
     - a raw `ssh` execution transport detail marad,
     - a `tmux` nem lehet approval runtime identity vagy approval success contract,
     - a routed approve/request-rework semantics nem kotheto veglegesen host-tool nevhez vagy session-formahoz.
4. `SG4 Wrapper-Ready Execution`
   - megfeleles: igen, ha a remote approval/rework execution bounded helper/port seamre epul, es nem szorodik szet kontrollalatlan raw SSH command string epitessze.
   - konkret Phase 3A ertekeles:
     - a mai `ssh host -> ... -> pairflow ...` forma moge kesobb wrapper/runtime entry reteg behelyezheto maradjon,
     - a helper egy helyen tartsa a command build/exec responsibilityt,
     - a CLI/UI/application consume family ne kozvetlen host-shell stringekre epuljon.
5. `SG5 Explicit Non-Goals for Isolation`
   - megfeleles: igen, ha a task explicit kimondja, hogy a sandboxing es izolacios policy nem ebben a fazisban zarul.
   - explicit Phase 3A non-goalok:
     - runtime wrapper implementacio,
     - workspace root mapping vagy sandbox root/bind-mount mapping,
     - attach implementacio,
     - cleanup implementacio,
     - network/process/filesystem policy layer,
     - altalanos sandbox/container/cloud runtime activation.
   - gate note:
     - ez a fazis csak azt koveteli meg, hogy a fenti retegek kesobb cserelhetok maradjanak,
     - nem koveteli meg, hogy a `Phase 3A` mar most izolalt runtimeot vezessen be.

## Approval Scope / Review Boundary (Reviewer Approval Boundary)

1. Gyors screening-kerdes reviewer approval elott:
   - a remote approve/request-rework most mar a started remote pointer authorityjara ul ugy, hogy remote bubble eseten nincs local transcript/state write fallback, es nem nyilik meg commit/cleanup/recovery scope?
2. Ez a task akkor tekintheto tisztan approvable `Phase 3A` szeletnek, ha a bounded remote mutation routing egyertelmuen bizonyitott:
   - local bubble approve/request-rework retained valtozatlan marad,
   - remote `created` vagy missing pointer eseten explicit actionable "start first" fail-closed hiba jon,
   - remote `started` pointer eseten approve/request-rework remote command route megy a persisted pointer authorityjara ulve,
   - a helper/port machine-readable eredmenyt ad a CLI/UI/application callersnek; nem emberi stdout parse az egyetlen contract,
   - remote bubble eseten nincs local transcript append vagy local `state.json` write fallback,
   - immediate rework (`READY_FOR_HUMAN_APPROVAL`) es deferred rework intent (`WAITING_HUMAN`) semantic branchje retained marad, de remote authorityn hajtodik vegre,
   - a UI router/default consume remote bubble eseten ugyanarra a routed authorityra ul, mint a CLI/application surface,
   - a routed success nem fugg uj local cache/state reconciliation lepestol a siker kimondasahoz,
   - a task nem nyitja meg a remote `reply`, `commit`, `merge`, `delete`, `restart`, vagy recovery routingot.
3. Ezek hianya vagy kesobbi ownershipje nem lehet `Phase 3A` blocker, mert successor-owned scope:
   - remote cleanup routing (`Phase 3B`),
   - reboot/restart recovery es rollout (`Phase 3C`),
   - generic multi-command remote router abstraction a sajat approval/rework consume-on tul,
   - remote reply routing.

## L0 - Policy

### Goal

Lezarni a remote bubble approval/rework mutation routingot ugy, hogy a human decision surface explicit remote runtime authorityra tudjon mutatni, mikozben:
1. remote bubble eseten a mutation nem a laptop local control-plane artifactjait tekinti canonical truthnak,
2. a request-rework immediate es deferred semanticaja retained marad,
3. a CLI es a UI ugyanazt a routed remote mutation contractot consume-olja,
4. cleanup/recovery/reply scope nem nyilik meg.

### Domain / Control Model Summary

1. Business invariant: ha egy bubble remote started pointerrel fut, akkor az approve/request-rework state transition authorityja a remote bubble clone-ban elo canonical Pairflow state; a laptop local `state.json` / transcript / inbox legfeljebb projection/cache, nem kulon mutation truth.
2. Control model:
   - local bubble approve/request-rework source-of-truth-ja retained local mutation flow,
   - remote bubble approve/request-rework source-of-truth-ja: `remote.json(kind="started")` + a remote clone-ban futtatott canonical Pairflow command,
   - a local operator gep csak route-ol es consume-ol; a read-model/cache reconciliation tovabbra is kulon status/list concern.
3. Read-path / mutation-path rule:
   - ha nincs remote pointer: retained local mutation path,
   - ha `remote.json(kind="created")` vagy remote SSH bubble pointer hianyzik: explicit "start first" hiba, local mutation side effect nelkul,
   - ha `remote.json(kind="started")`: resolve remote target -> futtasd a bounded remote approve/request-rework commandot -> consume-old a structured eredmenyt,
   - a remote mutation output nem emberi stdout parse-bol all egyeduli contractkent.
4. Allowed resolution path:
   - local bubble -> retained `runApprovalDecisionFlow*` / `runRequestReworkFlow*`,
   - started remote pointer -> remote approval helper -> canonical remote pairflow command -> typed result -> local caller consume.
5. Forbidden fallback:
   - remote bubble approve/request-rework local transcript appenddel vagy local state write-tal,
   - started remote pointer mellett local-only mutation retry,
   - request-rework remote bubble eseten plain `reply` semanticara valo visszaeses,
   - a taskon beluli szetszort raw SSH string epitgetes minden call-siteon kulon,
   - commit/merge/delete routing csendes beemelese ugyanerre a helperre.
6. Missing-data rule:
   - missing/created remote pointer -> fail-closed start-first,
   - started pointer, de missing host/remoteClonePath -> explicit invalid remote mutation target hiba,
   - SSH transport vagy remote command hiba -> nincs local mutation fallback; operator actionable hiba + status-alapu ujraellenorzes marad,
   - routed success utan a caller legfeljebb kulon status/list reread-del kerhet frissebb projectiont; ez nem a mutation success contract resze.
7. Phase boundary:
   - owned here: approval/rework mutation routing consume family,
   - retained baseline: pointer/start/status/list/attach authority,
   - successor: cleanup routing, recovery rollout, reply routing.

### Authority Boundary Map

1. `authority_producer`
   - remote clone-beli canonical Pairflow mutation execution started remote bubble eseten,
   - local mutation flow retained local bubble eseten.
2. `persisted_authority`
   - `remote.json(kind="started")`
   - `state-cache.json` only as read-model/cache artifact
   - bubble config executor alias
3. `workflow_orchestration_consumers` in scope
   - `src/v11/application/approval/**`
   - `src/cli/commands/bubble/approve.ts`
   - `src/cli/commands/bubble/requestRework.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/routerActionDispatch.ts`
4. `internal_execution_consumers` in scope
   - `src/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.ts` vagy equivalent narrow placement ugyanebben a remote approval/rework consume familyben
5. Explicit out-of-scope consumers
   - `reply`
   - `commit` / `merge` / `delete`
   - attach/status/list/cache behavior rewrite
   - reboot/restart recovery

### Baseline Preservation

1. Must-preserve behaviors:
   - local approve/request-rework retained marad,
   - override requirement / override reason policy retained marad,
   - immediate rework `READY_FOR_HUMAN_APPROVAL` es queued rework `WAITING_HUMAN` split retained marad,
   - UI modal es CLI parse/help surface additive marad.
2. Allowed resolution paths:
   - local bubble -> retained local flow,
   - remote started bubble -> routed remote command -> typed result -> local caller consume.
3. Forbidden regression interpretations:
   - `Phase 3A` nem jelent generic remote reply routingot,
   - `Phase 3A` nem jelent cleanup routingot,
   - `Phase 3A` nem teheti a remote mutation success-t uj local cache/state write lepestol fuggove.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `mutation_routing`
2. Generic gate mapping:
   - primary generic shape: `consumer_family_alignment`
   - secondary generic shape: `fail_closed_hardening`
3. Preconditions that must pass before mutation side effects:
   - bubble lookup ervenyes,
   - remote bubble eseten a pointer started + valid,
   - remote target deterministicen resolve-olhato,
   - routed command input (message, refs, override params) valid.
4. Side effects forbidden before preconditions pass:
   - local transcript append remote bubble eseten,
   - local state write remote bubble eseten,
   - remote mutation invoke invalid pointer vagy invalid target mellett.
5. Invalid/precondition-failure behavior:
   - explicit remote mutation error,
   - nincs silent local fallback,
   - nincs implicit start/restart/recovery.

### In Scope

1. Remote approve routing.
2. Remote request-rework immediate routing.
3. Remote request-rework deferred queue routing.
4. Bounded typed remote command helper/port.
5. CLI/UI regression proof ugyanarra a mutation authorityra.

### Out of Scope

1. Remote `reply` routing.
2. Remote commit/merge/delete routing.
3. Generic all-command remote router foundation a sajat approval/rework consume-on tul.
4. Remote restart/reboot recovery.
5. Attach/status/list/cache producer/read-model rewrite vagy uj cache reconciliation ownership.

### Target File Precision

1. A front matter `target_files` listaja tiszta file-path inventory a bounded surface anchorjaihoz, nem kommenthely es nem literal filename-lock:
   - a meglevo entrypointok es contract-seamek kotelezo anchorok,
   - a placement-flex szabaly a body-level contractban rogzitendo, nem a front matter sorokban,
   - a jelenleg nem letezo helper-entry tovabbra is teljesitheto uj file vagy equivalent narrow extract formaban, ha a body-level contract ezt kulon megengedi.
2. Uj helper/file csak a remote approval/rework command consume-hoz hozhato letre; nincs altalanos multi-command router escape hatch.
3. Equivalent narrow placement elfogadhato, ha:
   - ugyanaz a mutation authority branch zarul le,
   - nem szelesiti a touched consumer family-t,
   - es tovabbra sincs commit/merge/delete/reply/recovery ownership drift.
4. A front matterben szereplo production helper-path es a hozza tartozo direkt regression-test anchor ugyanazon body-level placement-flex szabaly szerint ertelmezendo:
   - a front matter mindket esetben csak bounded path inventory,
   - ha a helper equivalent narrow extractkent zarul le ugyanebben az approval/rework consume familyben, a direkt helper-regression test anchor is ugyanebben a szuk familyben igazithato,
   - de ezt a rugalmassagot tovabbra sem a front matter sorai, hanem a body-level contract hordozza.
5. Ha a bounded closure status/list/attach/cleanup fileokat is erdemben modositania kellene, az scope blocker es plan/task pontositasi trigger.

### Safety Defaults

1. Started remote pointer nelkul nincs remote approve/request-rework.
2. Remote transport hiba utan nincs local mutation fallback.
3. Queued rework intent retained semanticaja nem lazulhat plain reply-jellegu mutationna.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - approval command result contract retained/additive consume-ja,
   - request-rework immediate vs queued contract retained/additive consume-ja,
   - UI router/API error/result contract remote-safe extensionje, ha szukseges.
3. Fan-out note:
   - ugyanaz a mutation authority workflow/orchestration es internal execution consume-familyben jelenik meg,
   - de read-model/cache, cleanup, es recovery csaladok tovabbra is kulon phase maradnak.

### Closure Budget Triage

1. Touched closure buckets:
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
2. Explicitly not touched in this task:
   - `authority_producer`
   - `persisted_authority_or_schema`
   - `read_model_consumers`
   - `cleanup_recovery_consumers`
3. Intentionally collapsed closures:
   - `shared_contract` + `workflow_orchestration_consumers`, mert ugyanazon approval/rework call pathnak kell retained eredmeny-shape-pel local-vs-remote branchre valnia,
   - `workflow_orchestration_consumers` + `internal_execution_consumers`, mert a remote helper csak az approval/rework family egyik bounded consume seama.
4. Why the collapse is safe:
   - a started-pointer authority producer mar upstream lezart baseline,
   - nincs `remote.json` vagy `state-cache.json` schema/persistence cutover,
   - nincs kulon read-model/cache rewrite ugyanebben a taskban,
   - cleanup/recovery ownership teljesen successor phase-ben marad.
5. Deferred closures:
   - `read_model_consumers` status/list/cache projection ownershipa retained `Phase 2E` baseline marad,
   - `cleanup_recovery_consumers` ownership `Phase 3B` / `Phase 3C`.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. Why still single-task:
   - a producer es a persisted authority mar upstream lezart baseline,
   - a task nem vallal read-model/cache rewrite closure-t,
   - nincs cleanup/recovery vagy generic multi-command routing ugyanebben a szeletben,
   - a touched shared-contract + workflow + internal-execution alignement ugyanazon bounded approval/rework consume pathon zarhato.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | Started remote bubble approve/request-rework authorityja a remote clone canonical Pairflow state-je. | Remote bubble eseten a local mutation boundary nem irhat local canonical state/tranzcript truthot. | P1 | required-now |
| Control model | Local bubble retained local flow; remote started bubble routed remote flow. | A flow context/orchestration explicit branchre valik local vs remote mutation authority szerint. | P1 | required-now |
| Read/mutation path rule | Remote mutation structured remote resultot consume-ol, nem emberi stdout parse-t mint egyeduli contractot. | Kulon helper/port kell a remote approval command familyhez. | P1 | required-now |
| Forbidden fallback | Remote bubble eseten nincs local transcript/state write fallback. | Transport vagy target error explicit fail-closed hibat ad. | P1 | required-now |
| Missing-data rule | Created/missing/invalid pointer -> explicit start-first vagy invalid-target hiba. | Nincs routed side effect es nincs local mutation side effect. | P1 | required-now |
| Phase boundary | Ez approval/rework mutation routing task. | Reply, cleanup, recovery nem nyithato meg. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `EmitApprovalDecisionResult` | CLI approve output, UI router, tests | additive | remote branch ugyanazt a retained result shape-et adja vissza vagy szigoruan additive metadata-val boviti | generic remote multi-command router nem ebben a taskban |
| `EmitRequestReworkResult` | CLI request-rework output, UI router, tests | additive | remote immediate/queued branch retained `mode` contracttal ter vissza | reply/cleanup routing kesobb |
| UI action surface approve/request-rework | ActionBar -> store -> router -> defaults | additive | a backend/defaults consume remote bubble eseten sem torheti a first-party UI flowt | cleanup/recovery UX kesobb |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| local approve local transcript/state mutation | preserve | existing local approval tests valtozatlanul zoldben maradnak | P1 | required-now |
| local request-rework immediate vs queued split | preserve | READY_FOR_HUMAN_APPROVAL immediate es WAITING_HUMAN queued branch retained proof | P1 | required-now |
| remote bubble local mutation fallback | forbid | remote branch alatt explicit no-local-append/no-local-write test | P1 | required-now |
| remote mutation human-readable stdout parse mint egyeduli contract | forbid | typed helper/result seam proof | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/cli/commands/bubble/approve.ts` | `runBubbleApproveCommand(...)` | existing export | CLI approve entry | retained parse/help surface; remote bubble eseten is ugyanazt az additive structured result contractot consume-olja | P1 | required-now | T1, T4, T8 |
| CS2 | `src/cli/commands/bubble/requestRework.ts` | `runBubbleRequestReworkCommand(...)` | existing export | CLI request-rework entry | retained parse/help surface; remote bubble eseten retained immediate/queued result contract | P1 | required-now | T2, T3, T5, T6 |
| CS3 | `src/v11/application/approval/emitApprovalV11.ts` | `emitApproveV11(...)`, `emitRequestReworkV11(...)` | existing exports | shared wrapper surface for CLI + UI defaults | wrapper export surface retained marad, de remote branch ugyanazt a bounded approval API-t expose-olja | P1 | required-now | T8 |
| CS4 | `src/v11/application/approval/runApprovalFlowContext.ts`, `runApprovalFlow.ts` | approval flow context init | existing exports | application mutation branch selection | local vs remote mutation authority explicit branchre valik a flow elejen | P1 | required-now | T4, T5, T6 |
| CS5 | `src/v11/application/approval/runApprovalDecisionFlowHandler.ts` | `runApprovalDecisionFlowWithContext(...)` | existing export | approve/immediate rework mutation seam | remote bubble eseten nem appendel local transcriptot es nem ir local state-et; routed remote resultot consume-ol | P1 | required-now | T4, T5 |
| CS6 | `src/v11/application/approval/runApprovalFlowHandlers.ts`, `runApprovalDeferredRework.ts` | queued request-rework branch | existing exports | WAITING_HUMAN rework seam | remote WAITING_HUMAN bubble eseten a deferred intent queue a remote authorityn keletkezik; local surrogate queue tilos | P1 | required-now | T6 |
| CS7 | `src/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.ts` | new bounded helper | new typed helper | remote mutation execution seam | started remote pointerrol target resolve + remote approve/request-rework execute + typed result consume | P1 | required-now | T4, T5, T6, T7 |
| CS8 | `src/v11/defaults/ui/routerDefaults.ts`, `src/v11/infrastructure/ui/routerActionDispatch.ts` | UI approve/request-rework route | existing exports | first-party UI mutation consume | UI remote bubble eseten is ugyanarra a routed authorityra ul; nincs local-only mutation truth | P1 | required-now | T8, T9 |
| CS9 | `src/v11/infrastructure/ui/routerActions.ts`, `routerHttpErrors.ts` | router error mapping | existing exports | remote mutation error surface | remote start-required / invalid-target / transport fail closed hiba nem esik vissza generikus internal-only mappingre, ha a contract itt bad-request shaped | P2 | required-now | T9 |

### 2) Remote Mutation Helper Contract

1. A helper neve lehet project-localan mas, de bounded szerepe kotelezo:
   - input: bubble id, repo path, decision/request-rework mode, message/refs/override params, resolved bubble context
   - authority input: started remote pointer + ssh executor alias
   - output: retained `EmitApprovalDecisionResult` vagy `EmitRequestReworkResult` shape-hez illesztheto typed result
2. Placement note:
   - a CS7 file-path sor anchor inventory marad,
   - equivalent narrow placement tovabbra is elfogadhato a `Target File Precision` es az `Authority Boundary Map` szabalyai szerint,
   - es ugyanez a body-level placement-flex vonatkozik a kozvetlen helper-regression test anchorra is.
3. A helper nem lehet:
   - CLI stdout parse wrapper,
   - generic commit/merge/delete router ebben a taskban,
   - local state write fallback mechanizmus.
4. A helper remote command buildjenel:
   - egy helyen osszpontosuljon a raw SSH command build/exec,
   - ne teritse szet ezt a call-siteokon.
5. A helper success contractja:
   - remote mutation success nem teheto fuggove uj local cache/state reconciliation lepestol,
   - ha frissebb operator projection kell, az kulon status/list reread-del kerendo.

### 3) Test Matrix

| ID | Scenario | Setup | Assert | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| T1 | local approve retained | local READY_FOR_HUMAN_APPROVAL bubble | same local append/state write + same result shape | P1 | required-now |
| T2 | local request-rework immediate retained | local READY_FOR_HUMAN_APPROVAL bubble | same immediate rework result + implementer delivery semantics | P1 | required-now |
| T3 | local request-rework queued retained | local WAITING_HUMAN bubble | same queued intent result + no semantic drift | P1 | required-now |
| T4 | remote approve routed from started pointer | remote started pointer + READY_FOR_HUMAN_APPROVAL | remote helper invoked, no local append/write, retained approve result contract | P1 | required-now |
| T5 | remote immediate rework routed | remote started pointer + READY_FOR_HUMAN_APPROVAL | remote helper invoked, no local append/write, retained immediate rework contract | P1 | required-now |
| T6 | remote queued rework routed | remote started pointer + WAITING_HUMAN | remote helper invoked, no local deferred-intent local write, retained queued result contract | P1 | required-now |
| T7 | remote created/missing pointer fail-closed | remote executor + created/null/invalid pointer | explicit start-first or invalid-target error, no local mutation side effect | P1 | required-now |
| T8 | CLI/UI consume parity | CLI approve/request-rework + UI router/default path | callers nem tornek remote routed branchnel sem | P1 | required-now |
| T9 | router error mapping | remote mutation target/transport failure | first-party UI actionable error kap; nincs csendes internal-only regresszio, ha a contract bad-request jellegu | P2 | required-now |

## L2 - Implementation Notes

1. A task nem vezethet be olyan megoldast, ahol a remote bubble approve/request-rework elobb local append/state write-ot csinal, es csak utana probal "szinkronizalni" remote-ra.
2. Ha a retained local result shape remote branchen csak ugy allithato elo, hogy az internal remote helper structured payloadot adjon vissza, akkor ez a helyes irany; emberi CLI text parse nem eleg eros contract.
3. A local `state-cache.json` / status projection refresh nem a `Phase 3A` success contract resze:
   - ha egy callernek frissebb operator projection kell, azt kulon reread/status pathon kell kernie,
   - a remote mutation success nem teheto uj local cache mutation lepestol fuggove.
4. A taskban szukitett remote helper/port elfogadott:
   - approval/rework familyre bounded,
   - `Phase 3B` cleanup routing majd kulon dont arrol, hogy ugyanazt a seamet generalizalja-e.
5. A `reply` action remote bubble eseten e task utan is kulon elbiralas alatt marad; a `Phase 3A` nem claimelheti ugy a WAITING_HUMAN closure-t, mintha minden human mutation mar remote-safe lenne.

## Review Focus (Reviewer Focus)

1. Nem az a kerdes, hogy a remote helper "szep" vagy eleg altalanos-e.
2. Hanem az, hogy:
   - a remote mutation authority jo helyre kerult-e,
   - a local surrogate mutation path tenyleg ki van-e zarva,
   - az immediate vs queued rework retained semanticaja remote bubble eseten is valos maradt-e,
   - es a task nem nyitotta-e meg csendben a `Phase 3B` vagy `reply` scope-ot.

## Reviewer Guardrails

1. Required-now blocker csak akkor, ha az implementation:
   - elveszti a started remote pointer authorityt mint canonical mutation targetet,
   - remote bubble eseten local transcript/state fallbackot hagy bent,
   - elmossa az immediate vs queued request-rework retained semantic splitet,
   - vagy csendben megnyitja a `reply`, `commit`, `merge`, `delete`, `restart`, illetve recovery scope-ot.
2. Nem blocker onmagaban:
   - a remote helper vegso filename-je, a hozza tartozo kozvetlen helper-regression test anchor vegso pathja, vagy a pontos internal placement, ha a bounded consume family, a narrow placement, es az egyhelyes raw SSH command build/exec invariant megmarad,
   - az, hogy a machine-readable remote result seam belso structured payloadra vagy mas, ugyanazon retained `EmitApprovalDecisionResult` / `EmitRequestReworkResult` shape-ek egyikere egyertelmuen lekepzett typed internal adapterre epul, ameddig nem emberi stdout/text parse az egyeduli caller contract,
   - az, hogy a UI error surfacing melyik mar letezo router/default/approval adapter fileban, ugyanazon approval/rework consume family-n belul, az egyhelyes raw SSH command build/exec invariant megtartasa mellett zarul le, ha a first-party UI actionable fail-closed hibat kap.
3. Later-hardening vagy successor-owned tema, nem `Phase 3A` rework trigger:
   - a canonical successor-owned lista a fenti `Reviewer Approval Boundary` 3. pontja; itt azt nem ismeteljuk meg, mert a drift-kockazat onmagaban nem `Phase 3A` blocker.

## Successor Notes

1. `Phase 3B` ownership:
   - remote commit/merge/delete cleanup routing,
   - shared cleanup consume ugyanarra a topology-modelre ultetve.
2. `Phase 3C` ownership:
   - reboot/restart recovery guidance,
   - diagnostics/runbook/rollout evidence.
3. Kulon successor-only tema:
   - remote `reply` routing, ha ezt a product/workflow policy tenyleg megkoveteli.
