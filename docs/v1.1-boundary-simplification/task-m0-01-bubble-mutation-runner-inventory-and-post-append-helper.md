---
artifact_type: task
artifact_id: task_m0_01_bubble_mutation_runner_inventory_post_append_helper_v1
title: "M0-01 BubbleMutationRunner: Inventory + Post-Append Helper POC"
status: implementable
phase: phase1
target_files:
  - "src/v11/shared/mutation/mutationBoundaryIO.ts"
  - "src/v11/application/approval/runApprovalDecisionFlowHandler.ts"
  - "src/v11/shared/reply/replyCommandApi.ts"
  - "src/v11/shared/watchdog/watchdogCommandFlow.ts"
  - "tests/v11/application/approval/"
  - "tests/v11/application/reply/"
  - "tests/v11/application/watchdog/"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "runtime"
  - "architecture"
---

# Task: M0-01 BubbleMutationRunner: Inventory + Post-Append Helper POC

## L0 - Policy

### Goal

Az `m0-01 BubbleMutationRunner` Step 1 roadmap-celjat teljesitjuk: rovid inventory keszul a jelenlegi duplikalt mutation mintakrol, es kivonunk 1 alacsony kockazatu, transcript-append utani state-persist hibaaghoz kotott shared helpert. A required-now blast radius szuk marad: `approval` + 1 masodik alacsony kockazatu command-path a minimum, minden tovabbi call-site csak inventory-szintu jelolt ebben a korben.

### In Scope

1. Rogzitett inventory a legfontosabb state-changing call-site mintakrol.
2. 1 konkret helper-jelolt kivalasztasa a `post-append state write failed` hibaosztalyra.
3. A kivalasztott helper bevezetese ugy, hogy ne szamoljon `next_state`-et, csak a mutation boundary hibauzenet/context osszeallitasat kozositse.
4. A helper bekotese pontosan 2 `required-now` command-pathba: `approval` kotelezo, a masodik path alapertelmezetten `reply`.
5. Harmadik command-path (`watchdog`) csak akkor huzhato be ugyanebben a taskban, ha a helper szerzodese tovabbi wrapper-szaporitas nelkul megtarthato.
6. `askHuman`, `pass` es `deferred rework` csak inventory/reference input ebben a korben; nem kotelezo implementacios celpontok.
7. Regresszios teszt vagy targeted coverage csak az erintett `required-now` pathokra kotelezo; opcionális harmadik pathhoz csak akkor kell plusz teszt, ha tenylegesen belekerul a scope-ba.

### Out of Scope

1. Teljes `BubbleMutationRunner` bevezetes vagy feature-flag rollout.
2. `next_state` szamitas kozpontositasa.
3. Altalanos transcript + state transaction runner bevezetese ebben a taskban.
4. Delivery, metrics vagy notification kozosites.
5. Olyan helper, ami ownershipot vesz el a `StateTransitionService`-tol.
6. Az inventoryban megfigyelt osszes hasonlo call-site egyideju atkotese.

### Safety Defaults

1. A helper csak append-utan/state-persist-failure osztalyt fedhet le.
2. A helper nem vegezhet transcript appendet vagy state persistet magaban; csak boundary-level kozosites engedett.
3. A `validated_next_state` ownership a jelenlegi call-site-oknal marad.
4. Ha kiderul, hogy a call-site-ok strukturalt contextje nem hozhato kozos nevezore regresszio nelkul, a task maradjon inventory-only.
5. Ha a `watchdog` path csak uj error-wrapperrel vagy strukturalt context-atalakitassal lenne bekotheto, maradjon inventory-jelolt es ne blokkolja az `approval + reply` low-risk kivonatot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: belso application/shared mutation helper reteg; nincs DB/API/auth/config szerzodesvaltozas.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/mutation/mutationBoundaryIO.ts` | shared helper(ek) | helper-level internal API | existing shared mutation helper file | Kozositi a `transcript mar canonical, state write failed` hibaosztaly uzenet/context builderjet alacsony kockazattal. | P1 | required-now | `m0-01` Step 1 low-risk extract |
| CS2 | `src/v11/application/approval/runApprovalDecisionFlowHandler.ts` | `runApprovalDecisionFlowWithContext(...) -> Promise<EmitApprovalDecisionResult>` | existing | post-append state write catch branch | A lokalis string-epites helyett a kozos helper altal epitett hiba terjed tovabb. | P1 | required-now | duplikalt mutation error pattern |
| CS3 | `src/v11/shared/reply/replyCommandApi.ts` | `emitHumanReply(...) -> Promise<EmitHumanReplyResult>` | existing | post-append state write catch branch | A reply path azonos helper-kimenetet hasznal a jelenlegi `reason_code` es `context.command_name/context.envelope_id` szerzodes megtartasa mellett. | P1 | required-now | mar letezo formatter + command error boundary, alacsony kockazatu masodik path |
| CS4 | `src/v11/shared/watchdog/watchdogCommandFlow.ts` | `escalateRunningWatchdog(...) -> Promise<BubbleWatchdogResult>` | existing | post-append state write catch branch, de Step 1-ben csak felteteles transition-rule szerint | Ugyanabba az inventory-klaszterbe tartozik, de csak opcionális harmadik path: akkor lephet `optional-now`-rol aktiv bekotesre, ha a helper kimenete a jelenlegi `BubbleWatchdogError` surface-en uj wrapper vagy context-schema bovites nelkul atvezetheto; kulonben marad `inventory-only`. | P2 | optional-now | inventory-validated third candidate |
| CS5 | `src/v11/shared/askHuman/askHumanExecutionFailureMessageBuilder.ts` es kapcsolodo `askHuman` path | existing helper/builder | existing | reference-only inventory source | Megerositi, hogy a minta nem csak 2 helyen latszik, de ebben a taskban nem kotelezo atkotni. | P2 | inventory-only | mar letezo message builder parity source |
| CS6 | `src/v11/domain/pass/postAppendStateWriteFailure.ts` es `src/v11/application/approval/runApprovalDeferredRework.ts` | existing helpers | existing | reference-only inventory source | Rogziti, hogy a klaszter szelesebb, de ezek kulon follow-upba mennek, nehogy a Step 1 scope elcsusszon. | P2 | inventory-only | kovetkezo helper-jeloltek/backlog input |
| CS7 | `tests/...` relevans targeted suite-ok | test suites | test entry | changed command-path tests | Bizonyitja, hogy a kozositett helper nem valtoztatja meg a publikus reason/message/context szerzodest az erintett `required-now` pathokon. | P1 | required-now | roadmap DoD: no mutation-order regression / no contract regression |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Post-append failure helper input | Commandonkent lokalis string-epites / helper-hivas. | Kozos helper altal fogadott minimalis input, amelybol a message + minimum context visszaepitheto. | `command_label`, `command_name`, `envelope_id`, `reason` | `extra_context` | non-breaking internal | P1 | required-now |
| Post-append failure helper output | Vegyes lokalis error payload-ok. | `message` + minimum `context` shape, ahol a `reason_code` es a vegso error class tovabbra is call-site ownership. | `message`, `context.command_name`, `context.envelope_id` | `context.*` command-specifikus extra mezok | non-breaking internal | P1 | required-now |
| Inventory output | Informalis kodolvasasi kovetkeztetes. | Rogzitett inventory ugyanebben a taskban a duplikalt mutation mintakrol, kulon jelolve a `required-now`, `optional-now` es `inventory-only` call-site-okat. | call-site lista, pattern tipus, scope status | kovetkezo helper-jelolt | docs/internal | P2 | required-now |

### 2.1) Per-Call-Site Field Contract Mapping

| Call-site | Helper Input Mapping | Call-site Owned Fields | Notes | Priority | Timing |
|---|---|---|---|---|---|
| `approval` | `command_label=APPROVAL_DECISION`, `command_name=approval`, `envelope_id=appended.envelope.id`, `reason=error.message` | `reason_code=APPROVAL_DECISION_STATE_PERSIST_FAILED`, final `createError(...)` shape | Required baseline path. | P1 | required-now |
| `reply` | `command_label=HUMAN_REPLY`, `command_name=reply`, `envelope_id=appended.envelope.id`, `reason=error.message` | `reason_code=REPLY_STATE_WRITE_FAILED_POST_APPEND`, existing command error helper | Required second low-risk path. | P1 | required-now |
| `watchdog` | `command_label` maradhat watchdog-specifikus text label, `command_name=watchdog`, `envelope_id=appended.envelope.id`, `reason=error.message` | existing `BubbleWatchdogError` surface, nincs kotelezo `reason_code` bevezetes Step 1-ben | Csak akkor aktiv target, ha nincs extra wrapper/schema drift. | P2 | optional-now |
| `askHuman` / `pass` / `deferred rework` | inventory-only mapping reference | sajat error boundary / intent shape ownership | Step 1-ben csak inventory baseline. | P2 | inventory-only |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Shared mutation helper | Uzenet/context normalizalas, typed helper export | transcript append, state persist, transition szamitas | Pure-by-default helper maradjon. | P1 | required-now |
| Call-site refactor | Meglevo append->persist flow megtartasa | ordering csere, state-machine ownership atirasa | Transcript-first ordering valtozatlan kell maradjon. | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Append utan state persist hiba | `writeStateSnapshot` | throw | Transcript marad canonical source, state recovery transcript tail alapjan | command-specific existing reason code marad | error | P1 | required-now |
| Helper nem tud command-specifikus contractot reprezentalni | N/A | fallback | Ne vezesd be a helpert az adott call-site-on; maradjon lokalis implementacio, es a call-site inventory-only jelolest kapjon | N/A | warn | P2 | required-now |
| Inventory kozben uj, nagyobb duplikacios klaszter latszik | N/A | result | `later-hardening` backlogba kerul kulon tasknak | N/A | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `docs/v1.1-boundary-simplification/component-one-pagers/m0-01-bubble-mutation-runner.md` ownership split, jelenlegi command-specifikus reason code-ok, meglovo append-first ordering | P1 | required-now |
| must-use | mar meglevo `askHuman` / `reply` / `pass` formatter-ek inventory baseline-kent, hogy a helper szerzodese a tenyleges klaszterhez igazodjon | P1 | required-now |
| must-not-use | Olyan shared helper, ami `applyStateTransition` vagy `writeStateSnapshot` orchestrationt sajat ownershipbe huz | P1 | required-now |
| must-not-use | Hidden behavior valtozas weakened test coverage mellett | P1 | required-now |
| must-not-use | olyan Step 1 scope-bovites, ami `pass`, `askHuman`, `deferred rework` vagy mas inventory-jelolt path kotelezo atkoteseve valik | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | approval post-append failure parity | append sikerul, state write fail | approval flow fut | a publikus hiba message/context/reason code valtozatlan | P1 | required-now | approval mutation regression |
| T2 | reply post-append failure parity | append sikerul, state write fail | reply flow fut | a publikus hiba message/context/reason code valtozatlan | P1 | required-now | reply mutation regression |
| T3 | watchdog parity only if touched | append sikerul, state write fail | watchdog escalation fut | a canonical transcript + recover-state uzenet szerzodes megmarad | P2 | optional-now | watchdog mutation regression |
| T4 | no ordering regression | append + persist happy path fixture | erintett `required-now` flow fut | transcript-first ordering nem valtozik | P1 | required-now | BMR invariant |
| T5 | inventory completeness and gate precision | ismert state-changing pathok mintaja | task review | a rogzitett inventory explicit modon tartalmazza a `required-now` part (`approval`, `reply`), a `watchdog` felteteles optional rule-jat, valamint az `askHuman` / `pass` / `deferred rework` inventory-only statuszat | P2 | required-now | Step 1 inventory requirement |
| T6 | helper purity guard | shared helper unit contract | helper teszt vagy code review matrix fut | bizonyitja, hogy a helper nem appendel transcriptet, nem persistel state-et, es csak message/context assembly ownershipet vallal | P2 | required-now | helper purity / no side-effect guard |

## L2 - Implementation Notes (Optional)

1. Elso helper-jeloltnek a `post-append state write failed` minta ajanlott, mert ez ownership-semantikailag alacsony kockazatu es mar most tobb pathon latszik (`approval`, `reply`, `watchdog`, `askHuman`, `pass`).
2. Low-risk alapparnak `approval + reply` ajanlott, mert mindketto Pairflow command-error boundaryvel es `command_name/envelope_id` contexttel dolgozik; a `watchdog` csak akkor jo harmadik path, ha a jelenlegi `BubbleWatchdogError` surface erintetlenul marad.
3. Ha a helper bevezetese tiszta, a kovetkezo inventory-jelolt lehet a `append -> writeState -> partial recovery` outcome shape normalizalasa kulon taskban.
4. Ha a helper tul sok command-specifikus kulonbseget fed fel, alljunk meg inventory-only outputtal ahelyett, hogy Step 1-ben uj wrapperreteget epitunk.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Shared append+persist mutation runner | L2 | P2 | later-hardening | `m0-01` Step 2/3 | Csak akkor nyisd, ha 2+ command mar ugyanazt a mutation pipeline-t igenyli. |
| H2 | Recovery outcome schema standardizalas | L2 | P2 | later-hardening | inventory follow-up | Kulon taskban vizsgald, ne ebben a low-risk extractben. |

## Review Control

1. Inventory finding csak akkor `required-now`, ha konkret, 2+ call-site duplikacioval bizonyithato.
2. Max 2 hardening kor.
3. Uj shared helper csak akkor fogadhato el, ha nem serti a `STS -> BMR` ownership lancot.
4. Ami mar teljes runner vagy orchestration szintu altalanositas lenne, `later-hardening`.
5. Reviewer nem kerhet Step 1-ben egyszerre 3+ command-path atkotest, ha a task explicit `approval + 1 masodik path` blast radiusa mar teljesult es az inventory a tobbi jeloltet kulon rogzitette.

## Spec Lock

Mark the task as `IMPLEMENTABLE`, ha a duplikalt mutation pattern inventory explicit, az `approval + reply` required-now par egyertelmu, a `watchdog` optional transition rule dokumentalt, a helper csak message/context assembly ownershipet vallal, es az `askHuman` / `pass` / `deferred rework` statusza `inventory-only`-kent rogzitett.
