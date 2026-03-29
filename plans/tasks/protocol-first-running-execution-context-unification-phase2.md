---
artifact_type: task
artifact_id: task_set_m2_protocol_first_running_execution_context_unification_phase2_v1
title: "SET-M2: Protocol-First Running Execution Context Unification (Phase 2)"
status: implementable
phase: phase2
target_files:
  - "src/types/bubble.ts"
  - "src/core/state/stateSchema.ts"
  - "src/core/state/transitions.ts"
  - "src/core/runtime/watchdog.ts"
  - "src/core/runtime/startupReconciler.ts"
  - "src/core/bubble/startBubble.ts"
  - "src/core/human/reply.ts"
  - "src/v11/application/askHuman/askHumanExecution.ts"
  - "src/v11/shared/reply/replyCommandApi.ts"
  - "src/v11/application/restart/runRestartFlow.ts"
  - "src/v11/shared/start/startCommandOrchestration.ts"
  - "src/v11/shared/start/startCommandResumeKickoffMessages.ts"
  - "src/v11/application/reconcile/runReconcileFlow.ts"
  - "src/v11/domain/reply/waitingHumanStateGuard.ts"
  - "src/v11/shared/watchdog/watchdogMetaReviewRouting.ts"
  - "src/v11/shared/watchdog/watchdogCommandFlow.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateRecoveryContextHelpers.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts"
  - "src/core/bubble/listBubbles.ts"
  - "src/types/ui.ts"
  - "src/core/ui/presenters/bubblePresenter.ts"
  - "src/core/ui/router.ts"
  - "src/v11/application/list/listCliCommand.ts"
  - "src/v11/application/status/statusCliValueFormatters.ts"
  - "src/v11/shared/approval/approvalRoutingEligibility.ts"
  - "src/core/bubble/pendingApprovalSignal.ts"
  - "src/core/bubble/metaReview.ts"
  - "tests/core/runtime/watchdog.test.ts"
  - "tests/core/runtime/restartRecovery.test.ts"
  - "tests/core/runtime/startupReconciler.test.ts"
  - "tests/core/bubble/startBubble.test.ts"
  - "tests/core/bubble/listBubbles.test.ts"
  - "tests/core/bubble/metaReview.test.ts"
  - "tests/core/human/approval.test.ts"
  - "tests/core/human/reply.test.ts"
  - "tests/core/bubble/metaReviewGate.test.ts"
  - "tests/core/bubble/watchdogBubble.test.ts"
  - "tests/core/ui/bubblePresenter.test.ts"
  - "tests/cli/bubbleMetaReviewCommand.test.ts"
  - "tests/cli/bubbleListCommand.test.ts"
  - "tests/cli/bubbleStatusCommand.test.ts"
  - "tests/v11/domain/reply/waitingHumanStateGuard.test.ts"
  - "tests/v11/application/approval/approvalRoutingEligibility.test.ts"
  - "tests/v11/application/askHuman/askHumanExecution.test.ts"
  - "tests/v11/application/reconcile/runReconcileFlow.test.ts"
  - "tests/v11/application/restart/runRestartFlow.test.ts"
  - "tests/v11/application/watchdog/watchdogCommandApi.test.ts"
  - "tests/contracts/v11/askHuman.contract.runner.ts"
  - "tests/contracts/v11/metaReviewGate.contract.runner.ts"
  - "tests/contracts/v11/reply.contract.runner.ts"
  - "tests/contracts/v11/reconcile.contract.runner.ts"
  - "tests/contracts/v11/restart.contract.runner.ts"
  - "tests/contracts/v11/watchdog.contract.runner.ts"
  - "tests/contracts/v11/approval.contract.runner.ts"
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
  - plans/tasks/protocol-first-meta-review-runtime-decoupling-phase1.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: SET-M2 - Protocol-First Running Execution Context Unification (Phase 2)

## L0 - Policy

### Goal

A bubble aktív futási szemantikáját a plan Phase 2 célállapotára kell húzni: a canonical domain authority minden aktív actor-futásra `RUNNING` + explicit `execution_context`, és a meta-review sem maradhat külön lifecycle-univerzum. Ezzel párhuzamosan a human inputra várás canonical business state-je továbbra is külön `WAITING_HUMAN` marad.

Ez a kör kizárólag a futási state-shape, annak compatibility normalizációja és a közös watchdog/restart/reconcile/listing/status/approval felületek rendezése. Nem CLI/protocol-unification kör.

### Preconditions

1. A Phase 1 task (`plans/tasks/protocol-first-meta-review-runtime-decoupling-phase1.md`) a runtime-vs-domain authority baseline-je. Phase 2 ezt nem írhatja felül.
2. Ennek a docs tasknak `implementable` állapotba kell kerülnie most, de a Phase 2 kódimplementáció csak azután indulhat, hogy a Phase 1 kód ténylegesen `main`-re merge-elt.
3. Ha a jelenlegi kódbázis inventory-ja eltér a plan target modelljétől, a `plan_ref` és a Phase 1 contract az authority; a mostani kódbázis csak blast-radius inventory forrás.

### Context / Prior-Work Alignment

1. Phase 1 megszünteti azt a couplingot, ahol a meta-review notify/runtime bizonytalanság hamis domain fail-route-ot okozhat.
2. Phase 2 erre építve a canonical futási modellt egységesíti: a meta-review, reviewer és implementer ugyanabba a `RUNNING` execution-context modellbe kerül.
3. A plan szerint az actor-facing CLI/protocol surface általánosítása továbbra is külön Phase 3 feladat.
4. A plan szerint a legacy lifecycle surface teljes eltávolítása továbbra is külön Phase 4 feladat.

### In Scope

1. A lifecycle state union, validation és transition contract olyan átalakítása, hogy minden aktív actor-futás canonicalan `RUNNING` legyen explicit `execution_context` authorityval, miközben a human inputra várás canonicalan továbbra is `WAITING_HUMAN` marad.
2. A `RUNNING.execution_context` minimál, kötelező shape-jének rögzítése:
   - `active_role`
   - `awaited_output_type`
   - `handoff_id`
   - `round`
   - `started_at`
   - `deadline_at`
   - `attempt`
3. Determinisztikus compatibility normalizáció a legacy futási/approval állapotokra az érintett load/restart/reconcile/status/approval/meta-review belépési pontokon.
4. A watchdog, restart/recovery és runtime-session reconcile közös authorityra húzása ugyanabból a canonical futási contextből.
5. A listing/status/UI/operatori surface frissítése úgy, hogy canonicalan a `RUNNING` + execution context modellt tükrözze, miközben az átmeneti compatibility nézet olvasható marad.
6. A human-wait boundary explicit rögzítése:
   - `WAITING_HUMAN` marad a canonical business state, amikor a rendszer emberi inputra vár
   - a `RUNNING.execution_context` csak aktív actor-run authority lehet
   - a `human_reply` taxonomy Phase 2-ben is megmaradhat plan-aligned awaited-output kategóriaként, de ez nem teheti a human-wait helyzetet canonical `RUNNING` steady-state-té
   - a Phase 2 nem hagyhatja nyitva, hogy ugyanaz a helyzet egyszerre legyen canonical `WAITING_HUMAN` és canonical `RUNNING`
   - a boundary coverage nem állhat meg a reply/resume oldalon; az ask-human és watchdog által végzett `RUNNING -> WAITING_HUMAN` write pathok is explicit Phase 2 scope-elemek
7. A canonical approval boundary rögzítése: `READY_FOR_HUMAN_APPROVAL` marad az egyetlen canonical approval state.
8. A human-gate write boundary explicit rögzítése: azok a helper pathok, amelyek approval/meta-review eredményből emberi döntési state-et perzisztálnak, Phase 2-ben is explicit scope-elemek, mert itt dől el, hogy a legacy approval label csak compatibility input/projection marad-e.
9. A fenti behaviorokra célzott core/CLI/contract teszthorgonyok pontosítása.

### Out of Scope

1. Generic actor-facing CLI/protocol emission surface vagy role-specifikus command retirement (`pass`, `converged`, `ask-human`, `bubble meta-review submit`) tervezése vagy implementációja.
2. Új human-facing lifecycle commandok bevezetése vagy a meglévő CLI általános újraszervezése.
3. A legacy compatibility ágak teljes kiszedése a codebase-ből.
4. Phase 3/4 scope előrehozása bármilyen "már úgyis itt vagyunk" alapon.
5. A Phase 1 authority baseline újranyitása vagy lazítása.

### Safety Defaults

1. A canonical domain truth nem vezethető vissza tmux, pane, marker vagy scrollback jelből.
2. Ha a Phase 2 ideiglenesen megtart lapos legacy mezőket (`active_*`, `last_command_at`), azok csak egyirányú, write-time-ban az `execution_context`-ból származtatott mirrorok lehetnek; nincs bidirectional sync és nincs két authority-forrás. `WAITING_HUMAN` alatt megőrzött resume mező csak a `RUNNING` -> `WAITING_HUMAN` transitionkor utoljára érvényes canonical `execution_context`-ból származhat, és nem hozhat létre külön, önálló wait-state authority-blokkot.
3. A compatibility path elfogadhat legacy inputot, de nem írhat új canonical steady-state-et `META_REVIEW_RUNNING`, `META_REVIEW_FAILED` vagy `READY_FOR_APPROVAL` néven.
4. A `WAITING_HUMAN` nem válhat a `RUNNING` alternatív canonical reprezentációjává; ha a rendszer emberi inputra vár, a business-state authority `WAITING_HUMAN`.
5. Az operatori használhatóság nem romolhat: mixed docs/code bubble környezetben a list/status/UI továbbra is követhető és megbízható maradjon.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Érintett contractok:
   - lifecycle state union + validation + transitions,
   - canonical futási authority és compatibility normalizáció,
   - watchdog/restart/reconcile runtime-state authority,
   - listing/status/UI projection contract,
   - approval/meta-review compatibility boundary.
3. Inventory correction: a korábbi Phase 2 draft hibásan hivatkozott nem létező `src/core/runtime/restartRecovery.ts` fájlra. A restart/recovery blast radius jelenleg a `src/core/bubble/startBubble.ts`, `src/core/runtime/startupReconciler.ts` és `src/v11/application/restart/runRestartFlow.ts` útvonalakon keresztül valós.
4. Shared runtime-path correction: a Phase 2 state-shape változás ténylegesen érinti a restart/resume és meta-review compatibility shared moduljait is, különösen:
   - `src/v11/shared/start/startCommandOrchestration.ts`
   - `src/v11/shared/start/startCommandResumeKickoffMessages.ts`
   - `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts`
   - `src/v11/shared/watchdog/watchdogCommandFlow.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateRecoveryContextHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts`
   - `src/v11/shared/reply/replyCommandApi.ts`
5. Human-wait write-path note: a `WAITING_HUMAN` boundary nem csak reply/resume kérdés. A Phase 2 blast radiusnak explicit tartalmaznia kell a `RUNNING -> WAITING_HUMAN` perzisztáló pathokat is:
   - `src/v11/application/askHuman/askHumanExecution.ts`
   - `src/v11/shared/watchdog/watchdogCommandFlow.ts`
6. Facade note: `src/core/human/reply.ts` csak facade/re-export surface; a Phase 2 human-reply boundary valódi state mutationje a `src/v11/shared/reply/replyCommandApi.ts` útvonalon történik, ezért a blast radiusnak ezt explicit tartalmaznia kell.
7. Human-gate persistence note: a canonical approval-vs-compatibility boundary nem csak eligibility/read path kérdés. Azok a helper pathok is explicit blast-radius elemek, amelyek a meta-review/approval kimenetet emberi döntési state-be írják:
   - `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts`

### Normative Reference Policy

1. `normative_refs[0]`: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - Ez rögzíti a Phase 2 target architecture-t: `RUNNING(active_role, awaited_output_type, ...)` + adapter-only compatibility.
2. `normative_refs[1]`: `plans/tasks/protocol-first-meta-review-runtime-decoupling-phase1.md`
   - Ez rögzíti a Phase 1 authority baseline-t; Phase 2 ezt nem írhatja vissza notify-, marker- vagy transport-based authorityra.
3. `normative_refs[2]`: `docs/pairflow-initial-design.md`
   - Ez marad a bubble workflow és lifecycle baseline ott, ahol a Phase 2 task nem ír elő explicit eltérést.
4. Precedence rule: ha a jelenlegi implementation vagy test-corpus ellentmond a target modellnek, a plan + Phase 1 contract az elsődleges.

### Terminology Lock

1. `execution_context` = a canonical `RUNNING` state-hez tartozó structured authority blokk.
2. `canonical running model` = minden actor-futás `RUNNING` állapotként van reprezentálva explicit `execution_context` mezővel.
3. `compatibility adapter` = legacy state/input elfogadása vagy vetítése úgy, hogy a canonical domain truth ettől független marad.
4. `legacy running state` = `META_REVIEW_RUNNING` vagy bármely olyan actor-specifikus steady-state, amelyet a target modell Phase 2-ben kivált.
5. `approval compatibility surface` = olyan átmeneti input branch, ahol `READY_FOR_APPROVAL` vagy `META_REVIEW_FAILED` még elfogadható, de nem canonical write target.
6. `human-wait boundary` = az a szabály, hogy emberi inputra váráskor a canonical business state `WAITING_HUMAN`, nem egy alternatív `RUNNING.execution_context` reprezentáció.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File(s) | Function / Entry | Expected Behavior | Priority | Timing |
|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/core/state/stateSchema.ts`, `src/core/state/transitions.ts` | lifecycle union, `BubbleStateSnapshot`, validation, transition rules | a canonical active-run domain shape `RUNNING` + explicit `execution_context`, de a human-wait canonical business state továbbra is `WAITING_HUMAN`; a validation és transition réteg nem hagyhat kettős authority-olvasatot | P1 | required-now |
| CS2 | `src/core/runtime/watchdog.ts`, `src/core/runtime/startupReconciler.ts`, `src/v11/application/reconcile/runReconcileFlow.ts`, `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts`, `src/v11/shared/watchdog/watchdogCommandFlow.ts` | watchdog eligibility, runtime-session expected-state logic, reconcile orchestration, meta-review timeout/recovery routing, watchdog escalation write path | watchdog és reconcile ugyanabból a canonical futási modellből dolgozik; a meta-review futás nem külön state-kivétel, a `WAITING_HUMAN` nem válik running-aliasszá, és a watchdog `RUNNING -> WAITING_HUMAN` write pathja ugyanennek a boundarynak az explicit része | P1 | required-now |
| CS3 | `src/core/bubble/startBubble.ts`, `src/v11/application/restart/runRestartFlow.ts`, `src/v11/shared/start/startCommandOrchestration.ts`, `src/v11/shared/start/startCommandResumeKickoffMessages.ts` | restart resume path, resumable-state classification, resume kickoff routing | restart/restart-flow a canonical futási contextet állítja helyre; a meta-review resume sem külön lifecycle állapotnévtől függjön, és a `WAITING_HUMAN` boundary külön maradjon | P1 | required-now |
| CS4 | `src/core/bubble/listBubbles.ts`, `src/types/ui.ts`, `src/core/ui/presenters/bubblePresenter.ts`, `src/core/ui/router.ts`, `src/v11/application/list/listCliCommand.ts`, `src/v11/application/status/statusCliValueFormatters.ts` | repo summary, state counts, UI projection, status/list rendering | a list/status/UI canonicalan `RUNNING` + execution context alapú az aktív actor-runokra, miközben a `WAITING_HUMAN` külön elsődleges business-state-ként jelenik meg; a compatibility label csak projection, nem elsődleges state authority | P1 | required-now |
| CS5 | `src/core/human/reply.ts`, `src/v11/shared/reply/replyCommandApi.ts`, `src/v11/domain/reply/waitingHumanStateGuard.ts`, `src/v11/application/askHuman/askHumanExecution.ts` | WAITING_HUMAN enter/reply/resume boundary, human-reply state mutation | a human-wait boundary kétoldalú és explicit: ask-human útvonalon `RUNNING -> WAITING_HUMAN`, reply útvonalon `WAITING_HUMAN -> RUNNING`; a canonical business state emberi input-váráskor minden entrypointon `WAITING_HUMAN`, és a valódi state mutation pathok explicit részei a blast radiusnak | P1 | required-now |
| CS6 | `src/v11/shared/approval/approvalRoutingEligibility.ts`, `src/core/bubble/pendingApprovalSignal.ts` | approval eligibility, pending approval summary | a canonical approval boundary `READY_FOR_HUMAN_APPROVAL`; a legacy approval state csak acceptance branch | P1 | required-now |
| CS7 | `src/core/bubble/metaReview.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`, `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryContextHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | meta-review submit/recover/compatibility boundary, staged-ready/meta-review-running compatibility path, human-gate persistence write path | a meta-review submit és recovery path Phase 2 után is a canonical futási modellből induljon; `META_REVIEW_RUNNING`/`META_REVIEW_FAILED` csak compatibility acceptance maradjon, és a human-gate write helper pathok explicit módon a `READY_FOR_HUMAN_APPROVAL` canonical boundaryt védjék | P1 | required-now |
| CS8 | `tests/core/runtime/watchdog.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/core/runtime/startupReconciler.test.ts`, `tests/core/bubble/startBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/core/bubble/watchdogBubble.test.ts`, `tests/core/human/approval.test.ts`, `tests/core/human/reply.test.ts`, `tests/core/ui/bubblePresenter.test.ts`, `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/cli/bubbleListCommand.test.ts`, `tests/cli/bubbleStatusCommand.test.ts`, `tests/v11/domain/reply/waitingHumanStateGuard.test.ts`, `tests/v11/application/approval/approvalRoutingEligibility.test.ts`, `tests/v11/application/askHuman/askHumanExecution.test.ts`, `tests/v11/application/reconcile/runReconcileFlow.test.ts`, `tests/v11/application/restart/runRestartFlow.test.ts`, `tests/v11/application/watchdog/watchdogCommandApi.test.ts`, `tests/contracts/v11/askHuman.contract.runner.ts`, `tests/contracts/v11/metaReviewGate.contract.runner.ts`, `tests/contracts/v11/reply.contract.runner.ts`, `tests/contracts/v11/reconcile.contract.runner.ts`, `tests/contracts/v11/restart.contract.runner.ts`, `tests/contracts/v11/watchdog.contract.runner.ts`, `tests/contracts/v11/approval.contract.runner.ts` | explicit verification anchors | a Phase 2 task explicit, auditálható verification horgonyokat tartalmazzon a shared futási modellre, beleértve a `WAITING_HUMAN` vs `RUNNING` boundary belépő és kilépő write pathjait, valamint a human-gate write helper pathokat | P1 | required-now |

### 2) Data and Interface Contract

#### Canonical state contract

1. A lifecycle state union target shape-je aktív futásra:
   - `CREATED`
   - `PREPARING_WORKSPACE`
   - `RUNNING`
   - `WAITING_HUMAN`
   - `READY_FOR_HUMAN_APPROVAL`
   - `APPROVED_FOR_COMMIT`
   - `COMMITTED`
   - `DONE`
   - `FAILED`
   - `CANCELLED`
2. `WAITING_HUMAN` továbbra is külön canonical business state marad minden olyan helyzetre, ahol a rendszer emberi inputra vár.
3. Phase 2-ben új canonical write target nem lehet:
   - `READY_FOR_APPROVAL`
   - `META_REVIEW_RUNNING`
   - `META_REVIEW_FAILED`
4. Ha Phase 2 átmenetileg megtartja ezeket a neveket type-level vagy input-acceptance kompatibilitás miatt, azt külön compatibility adapterként kell jelölni.

#### Canonical running contract

1. `state=RUNNING` esetén a `execution_context` kötelező authority-blokk.
2. A `execution_context` required mezői:
   - `active_role: implementer | reviewer | meta_reviewer`
   - `awaited_output_type: pass_result | human_reply | meta_review_result`
   - `handoff_id: string`
   - `round: number`
   - `started_at: string`
   - `deadline_at: string`
   - `attempt: number`
3. Ha a kód bármely Phase 2 felületen megtartja a jelenlegi lapos mezőket (`active_agent`, `active_role`, `active_since`, `last_command_at`), az csak kompatibilitási/projection célú, egyirányú mirror lehet; a write authority az `execution_context`, és a mirror értékeket abból kell származtatni.
4. A meta-review canonical futása nem külön lifecycle state, hanem:
   - `state=RUNNING`
   - `execution_context.active_role=meta_reviewer`
   - `execution_context.awaited_output_type=meta_review_result`
5. Plan-alignment rule: a `human_reply` taxonomy nem esik ki a Phase 2 target modellből, mert a `plan_ref` explicit része. Ugyanakkor ez csak akkor használható, ha a dokumentum ugyanabban a pontban explicit kizárja, hogy a human-wait helyzet canonical `RUNNING` steady-state-ként legyen modellezve.
6. Bináris boundary rule: perzisztált canonical wait-state reprezentációként `RUNNING.execution_context.awaited_output_type=human_reply` nem megengedett. Ha a bubble emberi inputra vár, a perzisztált canonical business state `WAITING_HUMAN`; a `human_reply` legfeljebb transition-, resume- vagy helper-taxonomy maradhat, nem steady-state authority.

#### Human-wait boundary contract

1. Ha a rendszer emberi inputra vár, a canonical business state `WAITING_HUMAN`.
2. A `WAITING_HUMAN` nem egy alternatív `RUNNING.execution_context` reprezentáció, és nem a canonical `RUNNING` egyik speciális esete.
3. A `WAITING_HUMAN` megőrizheti az utolsó aktív actor contexthez szükséges resume adatokat (`active_*`), de ezek kizárólag a `RUNNING` -> `WAITING_HUMAN` transitionkor utoljára érvényes canonical `execution_context`-ból származtatott resume mirrorok lehetnek; ez resume-authority, nem azt jelenti, hogy a bubble továbbra is canonicalan `RUNNING`, és nem enged meg külön wait-state execution-context authorityt.
4. A human reply boundary explicit alakja:
   - `RUNNING` -> `WAITING_HUMAN` amikor emberi input szükséges
   - `WAITING_HUMAN` -> `RUNNING` amikor érvényes human reply beérkezik és az actor-run folytatódik
5. Restart, reconcile, watchdog és list/status projection nem értelmezheti a `WAITING_HUMAN` állapotot úgy, mintha az canonical `RUNNING` actor-run volna.
6. Ha a rendszer taxonomy vagy resume metadata szinten megtartja a `human_reply` awaited-output kategóriát, annak szűk jelentése van:
   - transition/resume intentet jelölhet,
   - operatori vagy runtime helper surface-en megjelenhet,
   - de nem használható arra, hogy a human inputra váró steady-state canonicalan `RUNNING` maradjon,
   - és nem lehet a perzisztált canonical state-store olvasatában a `WAITING_HUMAN` alternatív reprezentációja.

#### Compatibility normalization contract

| Legacy Input | Required Canonical Meaning | Allowed in Phase 2 | Forbidden in Phase 2 |
|---|---|---|---|
| `META_REVIEW_RUNNING` | meta-review actor-run | load/restart/reconcile/submit boundary compatibility input | új steady-state write targetként használni |
| `READY_FOR_APPROVAL` | human approval compatibility input | approval/list/status acceptance adapter | canonical approval state-ként fenntartani |
| `META_REVIEW_FAILED` | approval/recovery compatibility lane | approval eligibility vagy explicit recovery compatibility | új fail-steady-state write targetként fenntartani |

Deterministic decision:
1. A nyitott shape-kérdés Phase 2-ben lezártnak tekintendő: ha átmeneti mezőegyüttélés kell, az `execution_context` az authority, a lapos mezők pedig mirrorként maradnak.
2. A nyitott UI-kérdés Phase 2-ben lezártnak tekintendő: a canonical state projection legyen az elsődleges, a megszokott legacy label legfeljebb compatibility nézetként jelenhet meg.
3. Compatibility adapter boundary symmetry: legacy lifecycle label elfogadható inputként és megjeleníthető projectionként, de sem domain write targetként, sem döntési authorityként nem maradhat elsődleges.
4. Human-wait boundary decision: a `WAITING_HUMAN` marad a canonical business state; a Phase 2 `RUNNING.execution_context` contract plan-aligned módon megtarthatja a `human_reply` taxonomy-t, de csak explicit, szűk boundary-szabállyal, és nem adhat alternatív canonical `RUNNING` reprezentációt a human-wait helyzetre.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Priority | Timing |
|---|---|---|---|---|
| State store / validation | `execution_context` authority bevezetése, legacy input normalizálása | párhuzamos authority-forrás fenntartása | P1 | required-now |
| Transitions | active-run canonicalizálása `RUNNING`-ra, miközben human-wait külön `WAITING_HUMAN` marad | `WAITING_HUMAN` canonical business state összemosása `RUNNING`-gal | P1 | required-now |
| Runtime monitoring | watchdog/reconcile/restart közös authority az aktív futásokra, plusz `WAITING_HUMAN` külön business-state kezelése | meta-review-specifikus state-kivétel visszahozása vagy `WAITING_HUMAN` running-aliasként kezelése | P1 | required-now |
| Status / list / UI | canonical projection + compatibility label projection, `WAITING_HUMAN` külön elsődleges business-state labellel | operatori olvashatóság vagy mixed-bubble kezelhetőség lerontása, illetve `WAITING_HUMAN` elkenése `RUNNING` alá | P1 | required-now |
| Approval / meta-review | `READY_FOR_HUMAN_APPROVAL` canonical boundary, legacy acceptance adapter | `READY_FOR_APPROVAL` vagy `META_REVIEW_FAILED` canonical writability | P1 | required-now |

Constraint: Phase 2 nem hozhat létre új actor-facing CLI special case-et vagy role-command retirement félmegoldást a state-shape rendezéséhez.

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback / Result | Reason Code | Priority | Timing |
|---|---|---|---|---|---|
| `RUNNING` state authorityhoz hiányos `execution_context` tartozik | throw | state unchanged, explicit validation error | `RUNNING_EXECUTION_CONTEXT_INVALID` | P1 | required-now |
| legacy running-state input érkezik load/restart/reconcile/submit boundaryn | fallback | deterministic normalize to canonical running meaning | `LEGACY_RUNNING_STATE_COMPATIBILITY` | P2 | required-now |
| `WAITING_HUMAN` boundaryt a kód canonical `RUNNING`-ként próbálja értelmezni | throw | explicit boundary validation/contract error; nincs canonical aliasing | `WAITING_HUMAN_RUNNING_BOUNDARY_INVALID` | P1 | required-now |
| `human_reply` taxonomy-t a kód steady-state `RUNNING` authorityként próbálja használni emberi input-várás közben | throw | explicit boundary validation/contract error; `human_reply` nem írhatja felül a `WAITING_HUMAN` business-state authorityt | `HUMAN_REPLY_RUNNING_BOUNDARY_INVALID` | P1 | required-now |
| legacy `READY_FOR_APPROVAL` approval input érkezik | fallback | acceptance megmarad, canonical output `READY_FOR_HUMAN_APPROVAL` | `LEGACY_APPROVAL_STATE_ACCEPTED` | P2 | required-now |
| legacy `META_REVIEW_FAILED` approval/recovery input érkezik | fallback | compatibility-only acceptance, no new canonical write | `LEGACY_META_REVIEW_FAILED_COMPATIBILITY` | P2 | required-now |
| mirror mezők eltérnek az `execution_context` authoritytól | throw | explicit validation error; nincs csendes normalizálás ezen a boundaryn | `EXECUTION_CONTEXT_MIRROR_DRIFT` | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 runtime/domain authority baseline | P1 | required-now |
| must-use | `RUNNING` + explicit `execution_context` canonical futási modell | P1 | required-now |
| must-use | plan-aligned `awaited_output_type` taxonomy (`pass_result | human_reply | meta_review_result`) explicit human-wait boundary szabállyal | P1 | required-now |
| must-use | `WAITING_HUMAN` mint külön canonical business state emberi input-váráskor | P1 | required-now |
| must-use | `READY_FOR_HUMAN_APPROVAL` canonical approval boundary | P1 | required-now |
| must-not-use | új actor-facing generic CLI surface Phase 2-ben | P1 | required-now |
| must-not-use | `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_APPROVAL` új canonical steady-state-ként való visszaerősítése | P1 | required-now |
| must-not-use | `WAITING_HUMAN` canonical `RUNNING` aliasként való értelmezése | P1 | required-now |
| must-not-use | a `human_reply` taxonomy hallgatólagos kivétele a Phase 2 modellből plan update nélkül | P1 | required-now |
| must-not-use | nem létező vagy stale call-site-ok a blast-radius inventoryban | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Mandatory Anchors | Then | Priority | Timing |
|---|---|---|---|---|---|
| T1 | lifecycle validation/transitions canonicalize active actor runs to `RUNNING`, while keeping human-wait separate | `src/core/state/stateSchema.ts`, `src/core/state/transitions.ts`, related tests under `tests/core/bubble/startBubble.test.ts` | nincs meta-review-only canonical steady-state authority, és nincs `WAITING_HUMAN`/`RUNNING` kettős authority-olvasat | P1 | required-now |
| T2 | explicit WAITING_HUMAN vs RUNNING boundary | `tests/v11/domain/reply/waitingHumanStateGuard.test.ts`, `tests/core/human/reply.test.ts`, `tests/v11/application/askHuman/askHumanExecution.test.ts`, `tests/contracts/v11/reply.contract.runner.ts`, `tests/contracts/v11/askHuman.contract.runner.ts` | a human-wait boundary egyértelmű mindkét irányban: ask-human útvonalon canonical wait state `WAITING_HUMAN` jön létre, reply/resume után tér vissza `RUNNING`-ba, és a `human_reply` taxonomy nem nyit alternatív steady-state authorityt | P1 | required-now |
| T3 | watchdog shared running authority with separate WAITING_HUMAN handling | `tests/core/runtime/watchdog.test.ts`, `tests/core/bubble/watchdogBubble.test.ts`, `tests/v11/application/watchdog/watchdogCommandApi.test.ts`, `tests/contracts/v11/watchdog.contract.runner.ts` | a watchdog nem függ külön `META_REVIEW_RUNNING` state-től, nem kezeli a `WAITING_HUMAN`-t running-aliasként, és a timeout-escalation write path canonicalan `WAITING_HUMAN` business state-et eredményez | P1 | required-now |
| T4 | restart preserves canonical running meaning across meta-review and does not erase WAITING_HUMAN boundary | `tests/core/runtime/restartRecovery.test.ts`, `tests/v11/application/restart/runRestartFlow.test.ts`, `tests/contracts/v11/restart.contract.runner.ts` | restart után a meta-review futás ugyanannak a running modellnek a része marad, a human-wait boundary pedig nem mosódik össze `RUNNING`-gal | P1 | required-now |
| T5 | reconcile/runtime-session expected-state logic aligns to canonical running model plus separate WAITING_HUMAN business state | `tests/core/runtime/startupReconciler.test.ts`, `tests/v11/application/reconcile/runReconcileFlow.test.ts`, `tests/contracts/v11/reconcile.contract.runner.ts` | runtime expected-state inventory nem keveri össze a running authorityt a human-wait business-state-tel | P1 | required-now |
| T6 | list/status/UI surface stays operator-usable under canonical running model | `tests/core/bubble/listBubbles.test.ts`, `tests/core/ui/bubblePresenter.test.ts`, `tests/cli/bubbleListCommand.test.ts`, `tests/cli/bubbleStatusCommand.test.ts` | mixed bubble inventoryban is olvasható és helyes marad a projection, külön látható `WAITING_HUMAN` boundaryval | P1 | required-now |
| T7 | approval canonical state remains `READY_FOR_HUMAN_APPROVAL` | `tests/core/human/approval.test.ts`, `tests/contracts/v11/approval.contract.runner.ts` | legacy approval input elfogadható, de canonical output nem regresszál | P1 | required-now |
| T8 | meta-review compatibility paths remain deterministic without canonicalizing legacy labels back in | `tests/core/bubble/metaReview.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/contracts/v11/metaReviewGate.contract.runner.ts` | submit/recover és human-gate persistence path működik compatibility inputtal, de nem ír vissza legacy steady-state-et; a shared staging/recovery/persistence pathok részei a verification surface-nek | P1 | required-now |
| T9 | status/list projection uses compatibility labels only as secondary view | `tests/cli/bubbleListCommand.test.ts`, `tests/cli/bubbleStatusCommand.test.ts` | a canonical projection az elsődleges authority | P2 | required-now |
| T10 | scope guard excludes Phase 3 CLI/protocol unification work | task diff + `target_files` + `plan_ref` review | nincs új actor-facing generic emission surface vagy command retirement | P1 | required-now |
| T11 | blast-radius inventory references existing, current code paths only | task diff + repository inventory | nincs nem létező restart/recovery placeholder, facade-only félrejelölés vagy hiányzó shared helper coverage-anchor | P1 | required-now |
| T12 | Phase 1 merge-gate remains explicit implementation precondition | task diff + preconditions review | a dokumentum egyértelműen rögzíti, hogy Phase 2 kódmunka csak a Phase 1 `main` merge után indulhat | P3 | required-now |
| T13 | plan-aligned `human_reply` taxonomy remains explicit without reopening human-wait ambiguity | task diff + `plan_ref` + reply/waiting-human anchors review | a task nem driftel a plan `awaited_output_type` taxonómiájától, miközben a `WAITING_HUMAN` canonical boundary egyértelmű marad | P1 | required-now |

## Acceptance Criteria (Binary)

1. AC1: A Phase 2 canonical active-run domain shape `RUNNING` + explicit `execution_context`, és ez a meta-review futásra is igaz.
2. AC2: A human inputra várás canonical business state-je továbbra is `WAITING_HUMAN`; Phase 2 nem hagyhat alternatív canonical `RUNNING` reprezentációt ugyanarra a helyzetre.
3. AC3: A watchdog, restart és reconcile ugyanarra a canonical futási authorityra támaszkodik az aktív actor-runokra, miközben a `WAITING_HUMAN` boundary külön és konzisztens marad.
4. AC4: `READY_FOR_HUMAN_APPROVAL` marad az egyetlen canonical approval state; `READY_FOR_APPROVAL` és `META_REVIEW_FAILED` csak compatibility acceptance surface maradhat.
5. AC5: A status/list/UI surface canonical projectionje a `RUNNING` execution-context modellre épül az aktív actor-runokra, és külön látható business-state-ként tartja a `WAITING_HUMAN` állapotot.
6. AC6: Ha Phase 2 megtart átmeneti lapos mezőket, azok egyirányú mirrorok az `execution_context` authorityból; nincs csendes drift vagy kétforrású state-authority.
7. AC7: A task blast-radius inventoryja valós, létező code pathokra és teszthorgonyokra mutat; nincs stale restart/recovery placeholder.
8. AC8: A task nem csúszik át a Phase 3 actor-facing CLI/protocol unification vagy a Phase 4 cleanup scope-jába.
9. AC9: A Phase 2 code implementation indulási előfeltétele továbbra is a Phase 1 kód `main`-re merge-elt állapota.
10. AC10: A task plan-aligned marad az `awaited_output_type` taxonómiában, vagyis nem ejti ki hallgatólagosan a `human_reply` kategóriát; ehelyett explicit, szűk boundary-szabállyal rögzíti, hogy ez nem teheti a human-wait helyzetet canonical `RUNNING` steady-state-té.

### Acceptance Traceability

| AC | Primary Call Sites | Mandatory Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3, CS7 | T1, T3, T4, T8 |
| AC2 | CS1, CS5 | T1, T2 |
| AC3 | CS2, CS3, CS5 | T2, T3, T4, T5 |
| AC4 | CS6, CS7 | T7, T8 |
| AC5 | CS4, CS5 | T2, T6, T9 |
| AC6 | CS1 | T1 |
| AC7 | CS2, CS3, CS8 | T11 |
| AC8 | CS1, CS2, CS3, CS4, CS5, CS6, CS7 | T10 |
| AC9 | L0 Preconditions | T12 |
| AC10 | CS1, CS5 | T2, T13 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Phase 2-ben csak akkor elfogadható az átmeneti mirror mezőegyüttélés, ha az explicit egyirányú deriváció marad az `execution_context` authorityból, és drift esetén a validation hibát dob; a `WAITING_HUMAN` boundary ehhez nem adhat alternatív canonical `RUNNING` olvasatot.
2. [later-hardening] A legacy label inventory-t érdemes külön Phase 4 cleanup listává emelni, miután a Phase 2 projection stabil.
3. [later-hardening] Ha a status/list surface compatibility labelt tart meg, érdemes azt a CLI/UI rétegben tartani, nem a core lifecycle authorityban.
4. [later-hardening] Ha a kódbázis a `human_reply` taxonomy-t végül nem akarja megtartani a `RUNNING.execution_context` target modellben, azt nem Phase 2 task driftként, hanem explicit plan/task precedence döntésként kell dokumentálni.

## Assumptions

1. A jelenlegi kódbázisban már léteznek `RUNNING`, `active_role` és approval compatibility elemek, ezért a Phase 2 nem greenfield, hanem canonicalizáció és normalizáció.
2. A restart/reconcile flow jelenlegi v11 facadeken keresztül érhető el; a task ezeket tekinti a Phase 2 runtime inventory részének.

## Open Questions

1. No blocking open questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Generic actor-facing CLI/protocol surface | L2 | P2 | later-hardening | plan Phase 3 | külön Phase 3 taskban kezeljük |
| H2 | Legacy lifecycle label-ek teljes eltávolítása | L2 | P2 | later-hardening | plan Phase 4 | külön Phase 4 taskban távolítsuk el |
| H3 | Projection-vs-authority compatibility inventory automatizált ellenőrzése | L2 | P2 | later-hardening | Phase 2 follow-up | külön audit/check körben vezessük be |

## Review Control

1. P1 regresszió, ha a task bármely új canonical write pathot hagy `META_REVIEW_RUNNING`, `META_REVIEW_FAILED` vagy `READY_FOR_APPROVAL` néven.
2. P1 regresszió, ha a watchdog/restart/reconcile továbbra is eltérő futási authorityt használ actoronként.
3. P1 regresszió, ha a task nem kezeli explicit módon a lapos mezők és az `execution_context` authority viszonyát.
4. P1 regresszió, ha a docs task nem létező file/path inventoryt hagy a Phase 2 restart/recovery coverage-ben.
5. P1 regresszió, ha a task hallgatólagosan kiejti a `plan_ref` által előírt `human_reply` taxonomy-t explicit precedence-döntés nélkül.
6. P1 regresszió, ha a task a `WAITING_HUMAN` boundaryt csak reply/resume olvasati oldalon horgonyozza, de nem emeli be az ask-human vagy watchdog write pathokat.
7. Új `required-now` csak akkor vehető fel, ha közvetlenül a canonical state authority, compatibility normalizáció vagy operatori használhatóság bizonyításához kell.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, AC1-AC10 egyértelműen teljesíthető, és a dokumentum nem hagy nyitva state-authority, restart/reconcile coverage, plan-drift vagy Phase 3 scope-drift kérdést.
