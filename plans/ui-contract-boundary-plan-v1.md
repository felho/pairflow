---
artifact_type: plan
artifact_id: plan_ui_contract_boundary_v1
plan_id: ui-contract-boundary-plan-v1
created_on: "2026-05-02"
plan_status: approved
status: approved
title: "UI Contract Boundary Plan"
prd_ref: null
task_order:
  - 1-ui-contract-foundation
  - 2-core-ui-contracts
  - 3-ui-readmodel-contracts
task_tracker:
  - task_id: 1-ui-contract-foundation
    task_path: plans/archive/tasks/2026-05-02-ui-contract-boundary-plan-v1/1-ui-contract-foundation.md
    status: archived
    notes: "Completed via implementation bubble 1-ui-contract-foundation-impl; merged at 24a5b11c and archived."
  - task_id: 2-core-ui-contracts
    task_path: plans/archive/tasks/2026-05-02-ui-contract-boundary-plan-v1/2-core-ui-contracts.md
    status: archived
    notes: "Completed via implementation bubble 2-core-ui-contracts-impl; merged at 5cb79919 and archived."
  - task_id: 3-ui-readmodel-contracts
    task_path: plans/tasks/3-ui-readmodel-contracts.md
    status: in_progress
    notes: "Implementation bubble running: 3-ui-readmodel-contracts-impl. Document bubble 3-ui-readmodel-contracts-doc merged at 0e71380c."
active_task_id: 3-ui-readmodel-contracts
archive_group: 2026-05-02-ui-contract-boundary-plan-v1
owners:
  - "felho"
---

# Plan: UI Contract Boundary

## Objective

Megszuntetni a UI es backend kozotti kezzel tukrozott contractokat ugy, hogy a
UI egyetlen backend-owned, browser-safe contract surface-bol olvassa a kozos
DTO-kat, action request/result payloadokat, event payloadokat, error bodykat es
literal state-eket.

## Done Definition

1. Letrejott a kanonikus `src/contracts/ui/**` contract surface.
2. A UI nem tart fenn kezzel masolt delete-bubble, lifecycle,
   state-validation, remote-execution vagy UI API/action/read-model/event/error
   contractot.
3. `src/types/bubble.ts` marad az egyetlen lifecycle runtime literal source; a
   kanonikus lifecycle contract ezt re-exportalja, es nem vezet be masodik
   lifecycle tuple-t.
4. A UI nem importal `src/v11/**` modult.
5. A `src/contracts/ui/**` contract surface nem importal `src/v11/**`,
   `node:*`, `application/**`, `defaults/**` vagy `infrastructure/**` modult.
6. Fitness szabaly akadalyazza meg a boundary visszacsuszasat.

## Control Model

Business invariant: a UI altal megjelenitett lifecycle, delete-bubble,
meta-review-gate, state-validation, remote-execution es UI
API/action/read-model/event/error contract mindig ugyanabbol a backend-owned
forrasbol szarmazik, mint amit a backend API es router seam ertelmez.

Control model:
1. `src/contracts/ui/**` a UI/backend contract read-model canonical authority.
2. `ui/src/**` csak ezt a surface-t hasznalhatja backend contract importkent.
   `ui/src/lib/types.ts` maradhat UI-local convenience barrel, ha canonical
   contractokat re-exportal vagy importal ujradefinialas nelkul.
3. `src/v11/**` tovabbra is runtime/application/internal ownership marad, nem UI
   contract authority.

Read path rule: UI kozos contract authority csak `src/contracts/ui/**` lehet.
Kozvetlen fogyasztok importalhatnak `ui/src/lib/types.ts`-bol, ha az adott nev
canonical `src/contracts/ui/**` contractbol szarmazik, nem UI-local mirrorbol.

Forbidden fallback: tilos UI-ban ujra deklaralni ugyanazt a backend contractot
komment-alapu "keep in sync" alapon, es tilos direkt `src/v11/**` importtal
megkerulni a contract surface-t.

Allowed resolution path: ha egy UI contract mezot vagy state-et boviteni kell,
eloszor a `src/contracts/ui/**` canonical contractot kell frissiteni, majd a
backend/UI fogyasztoknak abbol kell tipust importalniuk.

Missing data rule: ha a backend runtime nem tud egy optional mezot eloallitani,
a contractban explicit `null` vagy opcionnalitas szerepeljen; a UI ne vezessen
be sajat heurisztikus fallback contractot.

## Current Status

Open. A modularity review szerint jelenleg tobb contract surface kezzel van
tukrozve vagy vegyes strategiaval kezelve:

1. `src/contracts/deleteBubble.ts` es `ui/src/lib/types.ts` kozott delete-bubble
   mirror van.
2. `src/types/bubble.ts` es `ui/src/lib/contracts/bubbleLifecycle.ts` kozott
   lifecycle state mirror van; ennek canonical lifecycle-authority igazitasat a
   `2-core-ui-contracts` task kezeli ugy, hogy `src/types/bubble.ts` nem maradhat
   masodik lifecycle literal authority a canonical lifecycle contract mellett.
3. `ui/src/lib/types.ts` direkt importal
   `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` alol.
4. `src/types/ui.ts` szinten `src/v11/shared/metaReviewGate/**` tipusra
   tamaszkodik.
5. `src/shared/contracts/**` mar letezo backend-owned UI contract surface, de
   nem a vegleges canonical hely. Ezt a plan kompatibilitasi surface-kent kezeli,
   amelyet az uj `src/contracts/ui/**` surface moge kell igazítani vagy onnan
   kell re-exportalni.
6. `src/types/uiRemoteExecution.ts` es
   `src/v11/shared/ports/stateSnapshots.ts` transit import/export utjai az
   in-scope remote-execution es state-validation contractokhoz kapcsolodnak.
   Ezek jelenleg nem canonical contract surface-ek; task-2 donti el a szuk
   compatibility/type-only utvonaligazitast, snapshot port vagy runtime
   szemantika valtoztatasa nelkul.
7. `src/types/ui.ts` es `ui/src/lib/types.ts` kozott tovabbi UI
   API/read-model/event/error DTO mirror van (`UiBubbleSummary`, `UiEvent`,
   `UiApiErrorBody` es kapcsolodo summary/detail/timeline DTO-k).
8. `ui/src/lib/types.ts`, `src/v11/shared/ports/uiRouter.ts` es
   `src/v11/infrastructure/ui/routerHttpBody.ts` kozott action
   request/result contractok is tukrozodnek (`CommitActionInput`,
   `MergeActionInput`, review-policy update es attach/delete action payloadok).

## Open Tasks

| Task ID | Path | Purpose | Status |
|---|---|---|---|
| `1-ui-contract-foundation` | `plans/archive/tasks/2026-05-02-ui-contract-boundary-plan-v1/1-ui-contract-foundation.md` | Create the browser-safe `src/contracts/ui/**` foundation and hard-fail fitness guards for forbidden UI/runtime imports. | archived |
| `2-core-ui-contracts` | `plans/archive/tasks/2026-05-02-ui-contract-boundary-plan-v1/2-core-ui-contracts.md` | Move the smaller established mirrors behind the canonical surface: delete-bubble, lifecycle, state-validation, and remote-execution, including `src/types/bubble.ts` lifecycle authority plus type-only transit alignment for `src/types/uiRemoteExecution.ts` and `src/v11/shared/ports/stateSnapshots.ts`. | archived |
| `3-ui-readmodel-contracts` | `plans/tasks/3-ui-readmodel-contracts.md` | Consolidate the wider UI API/read-model/action/event/error DTO surface and nested runtime-session/inbox/watchdog/review-policy/protocol views. | approved |

## Dependencies and Ordering

1. `1-ui-contract-foundation` fut eloszor, mert a canonical directory es a
   fitness guard nelkul a kesobbi contract migration visszacsuszhat direkt
   `src/v11/**` vagy compat-surface importokra.
2. `2-core-ui-contracts` csak a kisebb, jol korulhatarolhato contract mirrorokat
   mozgatja at. Ez ad egy ellenorizheto seed mintat a canonical surface
   hasznalatara.
3. `3-ui-readmodel-contracts` kulon task, mert a read-model/action/event/error
   DTO-k tobb producer es consumer csaladot erintenek (`src/types/ui.ts`,
   `ui/src/lib/types.ts`, action parser/port, SSE events, runtime session,
   inbox, watchdog, review-policy, protocol/timeline).
4. Kulon workspace package nem resze ennek a plannek, mert jelenleg a UI-nak
   nincs kulso fogyasztoja.

## Resequence Decision

Korabban a plan egyetlen `1-ui-contract-boundary` taskban probalta lezárni a
teljes UI/backend contract driftet. A ReviewSpec ciklusok sorra uj target-file
reality lyukakat talaltak, ami azt mutatta, hogy a task scope discovery-t vegzett
implementalhato szelet helyett. Ezert a task torolve lett, es a plan most
foundation -> core contracts -> broad read-model contracts sorrendben folytatja.

Split rationale:
1. A fitness/import boundary onalloan is ertekes es kisebb blast radiusu.
2. A core literal/simple contractok koherens consumer-family alignment szeletet
   alkotnak.
3. A read-model/action/event DTO-k eleg szelesek ahhoz, hogy sajat target-file
   reality checket es mezoszintu source-anchor donteseket igenyeljenek.

## Validation Strategy

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm exec vitest run tests/contracts/deleteBubbleContractTypes.test.ts tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts`
   - For `2-core-ui-contracts`, `tests/contracts/uiContractParity.types.ts`
     must carry T7 transit type parity for the in-scope transit surfaces, and
     `tests/contracts/uiContractTransitSource.test.ts` must carry T8
     source-text guard coverage for CS9a `src/types/uiRemoteExecution.ts` and
     CS9b `src/v11/shared/ports/stateSnapshots.ts` so structural mirrors and
     overlong compatibility chains fail required validation. The same T8 file
     must also read CS10 `src/types/bubble.ts` and
     `src/contracts/ui/bubbleLifecycle.ts` so the canonical lifecycle file
     re-exports the runtime tuple instead of defining a second lifecycle tuple.
5. `pnpm exec vitest run tests/tools/fitness/*.test.ts` vagy az uj/celzott
   fitness tesztfile
6. `pnpm --dir ui test`
