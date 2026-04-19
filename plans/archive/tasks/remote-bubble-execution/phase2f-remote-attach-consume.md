---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase2f_remote_attach_consume_v1
title: "Remote Bubble Execution Remote Attach Consume (Phase 2F)"
status: implementable
phase: phase2f-remote-attach-consume
target_files:
  - src/cli/index.ts
  - src/cli/commands/bubble/attach.ts
  - src/v11/application/attach/attachBubbleContract.ts
  - src/v11/application/attach/attachBubbleGuiLaunchers.ts
  - src/v11/application/attach/attachBubbleLauncherAvailability.ts
  - src/v11/application/attach/attachBubbleLauncherRuntime.ts
  - src/v11/application/attach/emitAttachV11.ts
  - src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts
  - src/v11/infrastructure/executor/command/pairflowCommandAttachContract.ts
  - src/v11/infrastructure/executor/command/pairflowCommandAttach.ts
  - src/v11/infrastructure/executor/command/pairflowCommandAttachLauncher.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerHttpErrors.ts
  - ui/src/lib/api.ts
  - ui/src/lib/types.ts
  - ui/src/lib/attachAvailability.ts
  - ui/src/components/actions/ActionBar.tsx
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/state/useBubbleStore.ts
  - tests/core/bubble/attachBubble.test.ts
  - tests/v11/application/attach/attachBubbleV11.test.ts
  - tests/core/ui/router.test.ts
  - tests/cli/bubbleAttachCommand.test.ts
  - tests/cli/bubbleStartCommand.test.ts
  - ui/src/components/actions/ActionBar.test.tsx
  - ui/src/lib/attachAvailability.test.ts
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/state/useBubbleStore.test.ts
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Attach Consume (Phase 2F)

## Feynman Summary / One-Screen Model

1. A `Phase 2E` mar megmondja, hogy a bubble remote-e, es ha remote, milyen attach-relevans allapotban van; ebbol jon a UI attach gating truth, de ez onmagaban meg nem attach-command authority.
2. A `Phase 2F` ezt nem irja felul, hanem explicit attach consume surface-sze forditja:
   - local bubble -> retained local attach,
   - remote `created` pointer -> explicit "start first",
   - remote `started` pointer -> SSH attach command ugyanabbal a launcher familyvel.
3. A read-model gating es az attach authority kulon szerep:
   - remote bubble eseten a visibility/enabled/hint contract a `Phase 2E` read-modelrol jon, nem local tmux/session heurisztikarol,
   - a remote attach command authorityja viszont a persisted started pointer.
4. A port-forward authority egyszeru es egyiranyu:
   - CLI `--port-forward` a legerosebb opt-in,
   - ennek hianyaban a persisted started pointer `portForwards` ervenyes,
   - UI/API attach Phase 2F-ben nem vezet be kulon operator override-ot.
5. A task lenyege nem "remote start", hanem "remotehoz attach consume":
   - nincs implicit start,
   - nincs implicit restart,
   - nincs approve/rework/cleanup routing.
6. A successor-owned temak blocker-minositeset az Approval Scope 4-5 pontja szerint kell megitelni: csak akkor johetnek vissza `Phase 2F` blockernek, ha bizonyithato, hogy nelkuluk a `Phase 2F` sajat attach authorityja, UI gatingje, vagy retry boundaryja nem zarhato le helyesen.

## Current Codebase Check (2026-04-17)

1. A `Phase 2E` retained baseline mar leszallitotta a remote read-model consume-ot:
   - a `status` es `list` surfaces explicit `remoteExecution` / freshness / source projectiont hordoznak,
   - a plain `list` cache-first marad,
   - a remote attach surface viszont tovabbra sincs megnyitva.
2. A jelenlegi attach implementation mar rendelkezik launcher/command foundationnel, de local-only runtime modellre ul:
   - a `tmux attach -t <session>` command local attachot epit,
   - a GUI launcherek es a copy/auto fallback mar implementalt,
   - a tmux session existence check ma local gepen tortenik.
3. A jelenlegi first-party UI kifejezetten elrejti az attach affordance-et, ha `remoteExecution` jelen van.
4. A jelenlegi UI router attach action local-recovery szemantikaval el:
   - tmux session hianynal `startBubble()` -> retry attach,
   - ez remote bubble-nel tul korai recovery/mutation routing lenne.
5. A jelenlegi CLI-ben nincs kulon `pairflow bubble attach` public command surface bekotve a `src/cli/index.ts` alatt.
6. A `Phase 2D` retained baseline szerint a remote `pairflow bubble start --attach` tovabbra is explicit reject; ezt a `Phase 2F` nem irja felul automatikusan.

## Parent Plan Fit / Stable Sequencing

1. A task a parent plan `Phase 2E -> Phase 2F -> Phase 3A` sorrendjet valtozatlanul orokli:
   - `Phase 2E` ownershipa a remote status/list read-model authority,
   - `Phase 2F` ownershipa a remote attach consume,
   - `Phase 3A` ownershipa a remote approval/rework mutation routing.
2. Ez a task nem nyit vissza start/activation scope-ot:
   - nem valtoztat remote first-start producer logikan,
   - nem modosithatja a started pointer producer authorityt,
   - nem nyithat implicit restart/recovery semantics-et.
3. Remaining-task viability explicit:
   - `Phase 3A` tovabbra is kulon mutation routing task marad,
   - `Phase 3B` tovabbra is kulon cleanup task marad,
   - `Phase 3C` tovabbra is kulon recovery/docs/rollout task marad.

## Target-File Reality / Touch Envelope

1. A `target_files` lista ebben a taskban implementation envelope, nem "minden elem kotelezoen modosul" promise.
2. Review-szempontbol a kotelezo bounded surface-ek:
   - CLI attach entrypoint + parse/help wiring,
   - remote pointer read/validation + attach command build,
   - launcher consume ugyanazzal a generated commanddal,
   - UI attach visibility/action/store consume a `Phase 2E` read-modelrol.
3. A lista vegyesen tartalmaz:
   - jelenleg hianyzo, uj-file jelolt pathokat: `src/cli/commands/bubble/attach.ts`, `tests/cli/bubbleAttachCommand.test.ts`,
   - mar letezo shared surface-eket: `ui/src/components/actions/ActionBar.tsx`, `ui/src/components/actions/ActionBar.test.tsx`.
4. A meglevo shared UI surface-ek azert szerepelnek itt, mert az attach availability es copy/CTA UX tenylegesen ezen a komponens-lancon megy at.
5. Nem minden felsorolt file kotelezoen modosul ugyanabban a patchben, de a Call-site Matrix es a Test Matrix `required-now` sorai teljes kovetelmenyek maradnak; a touch-set csak azt tisztazza, hogy ezek mely bounded file-reszletekben zarhatok le.

## Source-Anchor Consistency

1. A `Phase 2F` primary authorityja ez a taskfajl; a `docs/remote-bubble-execution.md` csak ott retained baseline, ahol nem mond ellent ennek a bounded attach contractnak.
2. A design doc attach surface-e retained intent:
   - explicit `pairflow bubble attach --id <bubbleId> [--port-forward <port>...]`,
   - SSH interactive consume,
   - optional port-forward projection,
   - launcher consume a lokal operator gepen.
3. Ha a design doc szelesebben fogalmazna a remote restart vagy mutation routingrol, ez a task szukebb authority:
   - a remote attach itt consume-only surface,
   - remote runtime-loss es SSH hiba fail-closed attach-unavailable eredmenyt ad,
   - nincs auto-start, auto-restart, approve/rework/cleanup routing.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis kizarolag a remote attach consume-ot zarja le:
   - explicit CLI attach surface,
   - remote-aware attach command builder,
   - launcher consume remote SSH commanddal,
   - UI/router attach consume a Phase 2E read-model authorityra ultetve,
   - persisted-pointer/default-forward consume + CLI-only `--port-forward` projection.
3. A task retained baseline-kent kezeli:
   - `Phase 2D` remote started pointer authorityt,
   - `Phase 2E` remote read-model freshness/source contractjat,
   - a jelenlegi local attach launcher/runtime foundationt.
4. A task kifejezetten nem vallalja:
   - remote `start --attach` enablementet,
   - remote restart/recovery szemantikat,
   - remote approval/rework routingot,
   - remote commit/merge/delete cleanup routingot.

## Approval Scope / Review Boundary

1. Gyors screening-kerdes approval elott:
   - a remote attach most mar a `Phase 2E` read-modelt es a persisted started pointert consume-olja ugy, hogy nem nyit vissza start/restart/mutation/cleanup semantics-et?
2. Ez a screening-kerdes nem helyettesiti az alatta levo teljes acceptance checklistet; csak rovid operatori osszefoglalas.
3. Ez a task akkor tekintheto tisztan approvable `Phase 2F` szeletnek, ha a bounded remote attach consume egyertelmuen bizonyitott:
   - explicit `pairflow bubble attach` public surface letezik,
   - local bubble attach retained valtozatlan marad,
   - `remote.json(kind="created")` pointer eseten az attach fail-closed actionable "start first" hibat ad,
   - `remote.json(kind="started")` pointer eseten a command SSH attach commandot epit a persisted host/tmux/port-forward authoritybol,
   - a pointer read/validation seam explicit task-scope-ban van; a remote attach authority nem implicit bubble-lookup vagy global-config fallback,
   - a launcher consume ugyanazt a generated attach commandot futtatja/copy-zza, mint amit a CLI/UI surface visszaad,
   - a UI attach availability mar a remote read-modelre ul, nem local tmux/session feltetelezesre,
   - az `ActionBar` CTA/hint render ugyanazt a gated `visible/enabled/hint` modelltruthot viszi tovabb, mint a `BubbleExpandedCard`,
   - remote tmux/runtime hiba eseten nincs implicit local `startBubble()` recovery retry,
   - a UI/API attach consume a persisted pointer/default forward authorityra ul; Phase 2F-ben ott nincs kulon operator-szintu ad hoc port-forward input vagy override,
   - a CLI attach surface ettol kulon explicit `--port-forward` opt-int adhat,
   - a result/error contract additive marad a CLI/UI/API consume feluleteken.
4. Ezek hianya vagy kesobbi ownershipje nem lehet `Phase 2F` blocker, mert successor-owned scope:
   - remote restart vagy reboot recovery semantics,
   - remote approval/rework routing,
   - remote cleanup/delete/merge routing,
   - remote status/list producer rework vagy pointer producer modositas.
5. Az 1. screening-kerdes es a 4. successor lista egyutt ertelmezendo: a rovid screening nem irhatja felul sem a 3. acceptance checklistet, sem a 4. pontban zarva hagyott successor scope-ot.

## L0 - Policy

### Goal

Lezarni a remote bubble attach consume-ot ugy, hogy a user explicit attach surface-en keresztul tudjon a started remote runtimehoz kapcsolodni, mikozben:
1. a remote runtime authority tovabbra sem csuszik vissza local surrogate truthra,
2. az attach UX a `Phase 2E` read-modelre es a persisted remote pointerre ul,
3. a launcher es a CLI ugyanazt a remote attach commandot consume-olja,
4. restart/recovery/mutation semantics nem nyilik meg.

### Domain / Control Model Summary

1. Business invariant: remote bubble attach csak akkor claimelheti, hogy operator attachra kesz surface-et ad, ha explicit started remote pointerrel es valid remote target adatokkal rendelkezik; local tmux session vagy local runtime registry nem lehet surrogate remote truth.
2. Control model:
   - local bubble attach source-of-truth-ja retained local bubble lookup + local tmux runtime,
   - remote bubble attach source-of-truth-ja: local `remote.json(kind="started")`,
   - remote attach UX gating consume-forrasa: `Phase 2E` status/list `remoteExecution` projection,
   - port-forward baseline authority: persisted remote pointer `portForwards`,
   - attach launcher execution authority: a lokal operator gep,
   - explicit ad hoc port-forward override authorityja ebben a fazisban csak a CLI `--port-forward` input.
3. Read-path rule:
   - ha nincs remote pointer: retained local attach path,
   - ha `remote.json(kind="created")`: explicit "remote bubble is not started yet" hiba, SSH side effect nelkul,
   - ha `remote.json(kind="started")`: resolve remote target -> build SSH attach command -> launcher consume vagy command return,
   - a UI attach availability remote bubble eseten a remote execution state alapjan dont a visibility/enabled/hint contractrol.
4. Port-forward precedence:
   - explicit `--port-forward` CLI input a legerosebb opt-in,
   - ennek hianyaban a persisted pointer `portForwards` consume-olhato,
   - ha egyik sincs, nincs `-L` projection,
   - a current global remote config ujraolvasasa nem lehet erossebb authority, mint a persisted pointer,
   - a UI/API attach action Phase 2F-ben nem vezet be kulon operator-szintu ad hoc port-forward inputot; ott a persisted pointer/default forward authority marad ervenyes.
5. Forbidden fallback:
   - remote bubble attach local `tmux attach -t ...` fallbackkel,
   - remote attach hianynal implicit `startBubble()` recovery a routerben,
   - remote attach lehetoseg pusztan local runtimeSession vagy local `runtime.present` alapjan,
   - attach surface-rol approve/rework/restart/cleanup guidance megnyitasa,
   - remote `start --attach` csendes enablementje ebben a fazisban.
6. Missing-data rule:
   - missing remote pointer => retained local attach,
   - `created` pointer => fail-closed "start first",
   - `started` pointer, de missing `host` / `tmuxSession` / `remoteClonePath` => explicit invalid remote attach error,
   - SSH transport hiba vagy remote tmux hiany => explicit attach unavailable; nincs auto-restart es nincs pointer/cache rewrite.
7. Phase boundary:
   - owned here: explicit attach consume CLI/UI/API surface,
   - retained baseline: start producer, status/list producer,
   - successor: mutation routing, cleanup routing, recovery semantics.

### Authority Boundary Map

1. Authority producer:
   - `remote.json(kind="started")` a remote target/tmux identityhez,
   - `Phase 2E` read-model a remote attach UX gatinghez.
2. Stored authority:
   - local `remote.json`,
   - local `bubble.toml` attach launcher override,
   - local/global config retained attach launcher defaults.
3. In-scope consumers:
   - new CLI attach command,
   - existing attach command builder/launcher runtime,
   - UI router attach action,
   - first-party UI attach affordance,
   - UI attach result/error consume a store-ben.
4. Explicit out-of-scope consumers:
   - start command attach policy,
   - restart/recovery flows,
   - approval/rework/cleanup remote routing.

### Baseline Preservation

1. Must-preserve behaviors:
   - local attach behavior valtozatlan marad,
   - existing launcher precedence (`bubble attach_launcher` -> global attach launcher -> default) megmarad,
   - `Phase 2D` remote `start --attach` reject baseline nem torolheto csendben,
   - `Phase 2E` remote status/list read-model contract nem gyengulhet attach miatt,
   - a meglevo UI attach copy-mode consume retained marad; remote attach csak a command payload authorityjat valtoztatja,
   - a shared `ActionBar`/attach CTA-hint surface ugyanarra a gated availability truthra marad ultetve, nem vezet be kulon local-only readiness logikat.
2. Allowed resolution paths:
   - local bubble -> retained local attach command,
   - started remote pointer -> remote SSH attach command builder -> launcher consume.
3. Forbidden regression interpretations:
   - remote attach nem eshet vissza local tmux attachra,
   - remote attach router nem vezethet be local-style auto-start retryt,
   - UI remote attach nem local runtimeSession presence-bol kovetkeztet,
   - attach result nem erositheti tul a runtime truthot a read-modelen tul.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `operator_read_model_consume`
2. Secondary shape: `launcher_orchestration`, mert a remote attach ugyanazt a launcher familyt consume-olja mas command payload mellett.
3. Preconditions that must pass before side effects:
   - bubble lookup ervenyes,
   - remote bubble eseten a pointer valid,
   - started remote pointer eseten a remote attach command buildelheto,
   - port-forward input ervenyes es normalizalhato.
4. Side effects forbidden before preconditions pass:
   - SSH attach command launch,
   - GUI launcher invoke,
   - copy-mode attach command publish.
5. Invalid/precondition-failure behavior:
   - explicit attach error,
   - nincs silent local fallback,
   - nincs implicit start/restart action.

### In Scope

1. `pairflow bubble attach` public CLI surface materializalasa.
2. Remote-aware attach command building started pointerrol.
3. Explicit pointer-read consume a remote artifact seamrol.
4. Port-forward CLI projection remote attachhoz.
5. Existing launcher family remote command consume-ja.
6. UI/API attach action remote-aware consume-ja.
7. UI attach visibility/enabled/hint contract remote read-model consume-ja.
8. UI store attach result/error consume-ja ott, ahol a remote attach command copy-mode payloadja tovabbhalad.

### Out of Scope

1. Remote `pairflow bubble start --attach` enablement.
2. Remote restart/recovery semantics.
3. Remote approval/rework routing.
4. Remote commit/merge/delete cleanup routing.
5. Remote status/list producer vagy cache contract ujranyitasa.
6. UI attach actionhoz kulon ad hoc port-forward input bevezetese.

### Safety Defaults

1. Remote bubble attach SSH transport vagy tmux hiba eseten fail-closed marad.
2. Remote attach nem triggerel implicit start/restart side effectet.
3. A generated attach command egyetlen authorityje a validated target + launcher resolution legyen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - public CLI surface: `pairflow bubble attach`,
   - attach result/error contract a CLI/UI/API kozott,
   - UI attach availability contract remote bubblekre,
   - launcher consume contract remote SSH command payloaddal.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `operator_surface_risk`: `2`
5. `risk_score`: `6`
6. `single-task allowed`: `yes`
7. Split decision note:
   - a producer/read-model/mutation routing mar korabban kulon lett szedve,
   - itt egy bounded consume-only attach surface zarul le,
   - a restart/recovery tovabbra is tudatosan deferalt.

## L1 - Change Contract

### 0a Shared Contract Compatibility

| Surface | Current consumer family | Change type | Required outcome | Explicitly deferred |
| --- | --- | --- | --- | --- |
| `pairflow bubble attach` CLI | `src/cli/index.ts`, new bubble command surface | additive | explicit public attach entrypoint, help text, option parsing | `start --attach` remote policy |
| Attach command/result contract | attach builder, pointer artifact seam, router, UI API/store client | additive | remote attach input/output mezok legfeljebb additivek; existing local callers nem tornek | mutation routing |
| UI attach availability | `BubbleExpandedCard`, `ActionBar`, UI state/api consumers | behavioral consume change | remote attach mar nem hidden-by-default; read-model gated enablement/hint | recovery guidance |
| Router attach action | UI router + HTTP error discriminator | behavioral tighten | local auto-retry retained; remote auto-retry tiltott | remote restart flow |

### 0b Baseline Preservation

1. Local bubbles attach pathja, launcher precedence-e es copy/auto semantics-e retained marad.
2. A `Phase 2E` remote bubble summary/detail surfaces tovabbra sem claimelhetnek attach readinesset frissebb truth nelkul.
3. A `Phase 2D` remote `start --attach` reject policy retained marad, hacsak kulon successor task nem irja felul.

### 0c Precondition and Side-Effect Boundary

1. Remote attach side effect csak explicit attach actionbol indulhat.
2. Read-model consume es command build validation megelzi a launcher futtatast.
3. Remote attach nem irhat `remote.json`-t, `state-cache.json`-t vagy `state.json`-t.

## 1) Call-site Matrix

| Call-site | Input | Required behavior | Must not do |
| --- | --- | --- | --- |
| CLI `pairflow bubble attach --id <id>` | local bubble | retained local attach command | remote pathot eroltetni |
| CLI `pairflow bubble attach --id <id>` | remote `created` pointer | actionable "start first" hiba | SSH launch vagy implicit start |
| CLI `pairflow bubble attach --id <id> --port-forward <port>...` | remote `started` pointer | SSH attach command `-L` projectionnel | global configot a pointer fole helyezni |
| UI router `POST /api/bubbles/:id/attach` | local attach | retained local retry-on-missing | remote-only policyval torni local UX-et |
| UI router `POST /api/bubbles/:id/attach` | remote attach | egyszeri attach invoke persisted pointer/default forward authorityval, explicit remote hiba mapping | `startBubble()` retry |
| `BubbleExpandedCard` attach affordance | remote summary/detail | read-model gated visible/enabled/hint | local runtime sessionbol attach readinesset feltetelezni |
| `ActionBar` attach CTA + hint render | attach availability model | a read-model gated `visible/enabled/hint` contractot torzitas nelkul jelenitse meg | local tmux-only readinesset visszacsempeszni a gomb/hint UX-be |
| `useBubbleStore` attach action | remote attach result | retained copy-mode UX, de remote SSH command payload consume-ja | local tmux-only command formatot feltetelezni |

## 2) Data and Interface Contract

1. Public CLI contract:
   - uj `pairflow bubble attach` help/parse/run surface szukseges,
   - minimalis input: `--id`, optional `--repo`, optional repeatable `--port-forward`.
2. Attach input contract:
   - remote-aware attach input additive mezoket kaphat, peldaul `portForwards?: number[]`,
   - UI/API attach input Phase 2F-ben nem kap kulon operator-szintu port-forward mezot,
   - local callers szamara minden uj mezo optional marad.
3. Attach result contract:
   - retained mezok: `bubbleId`, `tmuxSessionName`, `launcherRequested`, `launcherUsed`, optional `attachCommand`,
   - remote attach eseten az `attachCommand` SSH commandot jelenthet.
4. UI/API contract:
   - a router/API attach result additive marad,
   - a UI availability contract remote bubblekre expliciten kulonuljon el a local runtime healthtol,
   - a store/copy-mode consume additive maradjon; remote attachCommand csak formatumaban valtozhat.

## 3) Side Effects Contract

1. Allowed side effects:
   - SSH attach command launch/copy/open a lokal operator gepen,
   - GUI launcher config file write, ha a launcher ezt igenyli.
2. Forbidden side effects:
   - remote start/restart invoke,
   - pointer/cache/state file write,
   - status/list refresh mint attach prerequisite.
3. Command-building discipline:
   - host/user/tmux/port-forward serialization determinisztikus es shell-safe legyen,
   - a launcher ugyanazt a command stringet consume-olja, amit a copy/CLI result visszaad.

## 4) Error and Fallback Contract

1. `created` remote pointer:
   - explicit not-started error,
   - guidance: run `pairflow bubble start --id <id>` first.
2. Invalid started pointer:
   - explicit invalid remote attach error,
   - nincs fallback local attachra.
3. Remote SSH/tmux failure:
   - explicit attach unavailable error/result,
   - UI router nem retry-zik `startBubble()`-val.
4. Local tmux missing:
   - retained local retry behavior maradhat,
   - ezt remote bubblekre nem szabad kiterjeszteni.
5. Pointer read/validation failure:
   - explicit invalid remote attach error,
   - nincs bubble-lookup-only vagy global-config-only fallback.

## 5) Dependency Constraints

1. A task a meglevo launcher/runtime foundationre epuljon; ne hozzon letre parhuzamos masodik launcher familyt.
2. A remote attach target authority a persisted pointerbol jojjon; ne legyen implicit global-config-only attach target inference.
3. A UI gatinghez a `Phase 2E` remoteExecution/read-model contract legyen az authority; ne uj local heuristic.
4. Az attach command serializationnek ugyanazokat a shell-escaping guardokat kell megtartania, mint a local attach pathnak.
5. A UI attach result/error consume pathjat is ugyanebben a taskban kell szinkronban tartani ott, ahol a remote attach command a store-ig eljut.

## 6) Test Matrix

| ID | Scenario | Preconditions | Action | Expected result | Severity | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | local attach retained | non-remote bubble | CLI/UI attach | meglevo local attach behavior valtozatlan | P1 | required-now |
| T2 | CLI attach help and parse | none | `bubble attach --id x --port-forward 3000 --port-forward 5173` | explicit command surface es repeatable port-forward parse | P1 | required-now |
| T3 | remote created pointer fail-closed | `remote.json(kind="created")` | attach | actionable start-first hiba, nincs SSH invoke | P1 | required-now |
| T4 | remote started attach command build | valid started pointer | attach | SSH command + remote tmux target + launcher consume | P1 | required-now |
| T5 | port-forward precedence | started pointer + CLI overrides | attach | CLI ports elsobbsege, shell-safe `-L` projection | P1 | required-now |
| T6 | UI remote attach visibility | remote detail/summary shapes | render + action availability | started remote attach nem hidden-by-default es attach-szempontbol ertelmes; created remote nem claimel attach-ready; a remote visibility/enabled allapot a `Phase 2E` read-modelre ul | P1 | required-now |
| T7 | router local retry retained | local tmux missing | UI attach action | `startBubble()` retry retained | P1 | required-now |
| T8 | router remote retry forbidden | remote tmux/SSH missing | UI attach action | nincs `startBubble()` retry, explicit remote hiba | P1 | required-now |
| T9 | start --attach baseline preserved | remote bubble | `bubble start --attach` | tovabbra is explicit reject | P1 | required-now |
| T10 | store copy-mode retained | UI attach result `launcherUsed=copy` | attach | clipboard consume retained, remote SSH command is masolhato | P1 | required-now |
| T11 | UI/API no ad-hoc port-forward override | remote attach via UI/API surface | attach | a UI/API consume a persisted pointer/default forward authorityra ul; kulon operator port-forward input vagy override nincs | P1 | required-now |
| T12 | pointer read failure fail-closed | invalid/malformed remote pointer | attach | explicit invalid remote attach error, nincs fallback | P1 | required-now |
| T13 | ActionBar CTA/hint parity | attach availability model allapotai (`created`, `started`, unavailable) | render CTA + hint | az `ActionBar` a gated `visible/enabled/hint` allapotot torzitas nelkul viszi tovabb minden attach-relevans allapotban, copy-mode alatt is | P2 | required-now |
| T14 | result contract additive | CLI/API/UI attach result | attach | local callers nem tornek, remote attachCommand SSH alapu lehet | P2 | required-now |

## L2 - Implementation Notes

1. A `Phase 2F` attach surface legyen explicit kulon command, ne a `start --attach` policy csendes atirasa.
2. Erdemes a command builder logikat ugy szetvalasztani, hogy:
   - a local builder retained maradjon,
   - a remote builder valid started pointerbol epitsen SSH attach payloadot,
   - a launcher resolution mindketto felett kozos maradhasson.
3. A remote attach availability UI oldalon ne `remoteExecution !== undefined -> hidden` szabaly legyen, hanem explicit state-aware consume:
   - `created_not_started` -> disabled/hidden actionable hinttel,
   - valid started remote -> attach affordance,
   - explicit unavailable runtime -> fail-closed hint, restart nelkul.
4. A router attach actionnak bubble-tipus tudatosnak kell lennie:
   - local bubble: retained missing-session retry,
   - remote bubble: no retry, no implicit mutation.
5. A port-forward parse/normalize contract maradjon szuk:
   - csak ervenyes TCP portokat fogadjon,
   - deterministic dedupe/order hasznos, ha a builder egyszeru marad tole.
6. A UI attach action Phase 2F-ben szandekosan nem kap sajat operator-szintu port-forward inputot; ha ez kesobb kell, az kulon additive successor task legyen, ne csendes scope-novekmeny.

## Review-Loop Resistance

1. File-shape review helyett behavior-slice review kell:
   - nem az a kerdes, hogy pontosan melyik komponensben landol az attach gating,
   - hanem az, hogy a remote attach authority es a retry boundary jo helyre kerult-e.
2. Successor-owned temat csak akkor szabad ide visszahozni blockernek, ha bizonyithato, hogy nelkule a `Phase 2F` sajat attach authorityja, UI gatingje, vagy retry boundaryja nem zarhato le helyesen.
   - ugyanennek a szabalynek a roviditett operatori verzioja olvashato a Feynman Summary 6. pontjaban.
3. A `Phase 2F`-et nem kell ujranyitni attol, hogy egy jobb status refresh, deeplink, recovery CTA vagy attach utani richer operator guidance kesobb hasznos lenne.
4. Ha a megoldas a `Phase 2F` contracton belul mar attach-consume-only marad, akkor a touch-set kisebb atszervezese vagy shared UI komponensbe mozgo logika nem review blocker.

## Hardening Backlog

1. Kesobbi taskban kulon elfer, ha a remote attach remote-runtime probe-ja strukturaltabb error kodokat ad.
2. Ha a UX kesobb igenyli, a remote `start --attach` policy csak kulon successor taskban es kifejezett policyvaltoztatassal vizsgalhato ujra; a `Phase 2F` task nem keszitheti elo csendes enablementtel.
3. Kesobbi taskban elfer browser/deeplink richer UX a port-forward consume fole, de ez most nem required-now.

## Review Control

1. Review focus:
   - remote attach command authority,
   - router retry boundary local vs remote,
   - UI attach gating correctness,
   - port-forward precedence/escaping.
2. Non-blocking observations:
   - launcher UX polish,
   - future recovery ergonomics,
   - richer status-to-attach messaging.

## Spec Lock

1. Ez a task a `Phase 2F` authorityja a remote attach consume bounded scope-jara.
2. Ha implementacio kozben kiderul, hogy a remote attach csak restart/recovery vagy mutation routing ujranyitasaval mukodne, azt nem szabad ebben a taskban csendben beemelni; kulon successor task vagy explicit plan update kell.
