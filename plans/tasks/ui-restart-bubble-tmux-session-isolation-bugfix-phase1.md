---
artifact_type: task
artifact_id: task_ui_restart_bubble_tmux_session_isolation_bugfix_phase1_v1
title: "UI Restart Bubble Tmux Session Isolation Bugfix (Phase 1)"
status: implementable
phase: phase1
target_files:
  - scripts/ui-server.sh
  - src/v11/infrastructure/channel/tmux/tmuxRunner.ts
  - tests/core/runtime/tmuxManager.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: UI Restart Bubble Tmux Session Isolation Bugfix (Phase 1)

## Current Codebase Check (2026-04-24)

1. A `ui:restart` ma a `scripts/ui-server.sh restart` wrapperen keresztul fut, amely leallitja a `pf-ui-server` tmux sessiont, majd ujrainditja azt.
2. A bubble tmux runtime sessionok es a UI tmux session ugyanazon a tmux socketen futnak:
   - current observed socket: `/private/tmp/tmux-501/default`
3. A tmux runner a tmux parancsokat az aktualis process env oroklesevel futtatja, es nem torli a `TMUX` kornyezeti valtozot.
4. Reprodukalt operativ jelenseg:
   - nyitott bubble tmux session lathato a monitoron,
   - `ui:restart` utan a bubble tmux session eltunik,
   - bubble transcript nem tartalmaz bubble lifecycle stop/merge/delete esemenyt,
   - a runtime registry utolag stale marad.
5. A current-tree UI shutdown path nem fut bubble lifecycle cleanupot:
   - UI server close: registry watcher + HTTP server + events broker cleanup
   - nincs bubble `stop`, `delete`, `merge`, `reconcile` vagy watchdog cleanup ezen az uton
6. A bounded problema ebben a fazisban nem altalanos stale-session self-healing, hanem az, hogy a UI restart ne tudjon bubble tmux sessionokat megolni vagy ugyanabba a tmux failure domainbe tartozni.

## L0 - Policy

### Goal

1. A `ui:restart` nem olheti meg a futo local bubble tmux sessionokat.
2. A UI tmux runtime authority legyen izolalt a bubble tmux runtime authoritytol.
3. A bubble tmux parancsok ne fuggjenek az aktualis hivo process `TMUX` kontextusatol.
4. A javitas ne valtoztassa meg a bubble sessionneveket, a bubble lifecycle allapotgepet vagy az attach workflow publikus viselkedeset.

### In Scope

1. UI restart path izolacio ugy, hogy a restart ne erinthesse a bubble tmux runtime authorityt.
2. A canonical tmux runner kornyezeti izolacioja ugy, hogy a bubble tmux muveletek ne orokoljek a `TMUX` kornyezetet.
3. Celzott regresszios teszt a tmux runner env izolaciora, a meglvo `tests/core/runtime/tmuxManager.test.ts` baseline-ra epitve.
4. Minimalis shell/runtime wiring, ha a UI restart izolaciojahoz szukseges.

### Out Of Scope

1. Bubble stale runtime registry auto-healing vagy reconcile redesign.
2. Start/restart utani post-launch liveness recheck safety net.
3. Attach/status UX ujratervezes.
4. Watchdog, marker-confirmation vagy delivery hardening.
5. Remote bubble tmux izolacio vagy remote execution topology atalakitas.

### Safety Defaults

1. A UI session kill csak a UI sajat tmux runtimejat erintheti; a bubble tmux sessionok fail-closed modon erintetlenek maradnak.
2. A bubble tmux runnernek tmux muveletek futtatasakor fail-closed modon semlegesitett `TMUX` kornyezettel kell indulnia.
3. Tiltott fallback:
   - nem eleg a stale runtime registry driftet kezelni, ha a tmux session-kill tovabbra is reprodukalhato marad.
4. Tiltott regresszio:
   - a bubble attach/session resolution tovabbra is a bubble sessionnev-alapu modell marad.
5. Uj publikus config/env contract ebben a fazisban ne nyiljon; az izolacio maradjon belso implementation detail.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary-k:
   - UI tmux lifecycle wrapper boundary
   - canonical tmux command execution boundary
   - tmux env isolation regression boundary

## L1 - Change Contract

### Target-File Reality Check

1. A `scripts/ui-server.sh` a kozvetlen UI restart side-effect producer.
2. A `src/v11/infrastructure/channel/tmux/tmuxRunner.ts` a kozos tmux command authority boundary, amelyet bubble start, restart, attach health-check, watchdog es delivery kapcsolt flow-k hasznalnak.
3. A real bounded slice ezert nem pusztan UI shell script tweak, hanem `side-effect producer + shared command boundary` bugfix.
4. A UI current-tree shutdown pathja nem bubble cleanup producer, ezert a task root-cause ownershipje a tmux runtime authority izolacio korul zarhato.
5. Mivel nincs szukseg public bubble config schema, protocol envelope vagy state machine valtozasra, a scope task-only artifactkent zarhato.

### Control Model

1. `business_invariant`
   - a UI restart csak a UI sajat tmux runtimejat erintheti; bubble runtime sessionok megmaradnak.
2. `control_model`
   - UI restart authority es bubble tmux runtime authority izolalt.
   - a bubble tmux runner nem hasznalhatja implicit authority-forraskent a hivo process `TMUX` kornyezetet.
3. `read_path_rule`
   - bubble session liveness a tenyleges tmux authority alapjan ertelmezett, nem a stale process env implicit tmux kontextusa alapjan.
4. `forbidden_fallback`
   - tilos olyan fix, amely csak a stale registry kovetkezmenyeit rejti el, mikozben a UI restart tovabbra is meg tudja olni a bubble sessiont.
5. `allowed_resolution_path`
   - UI restart isolation + canonical runner env isolation.
6. `missing_data_rule`
   - ha egy izolalt UI tmux authority nem erheto el, az a UI restart hibaja; ez nem legitimalhatja a bubble tmux authorityhoz valo visszaeseset ugyanazon a pathon.

### Baseline Preservation

1. `must_preserve_behaviors`
   - `pnpm ui:start|stop|restart|status` tovabbra is mukodik
   - bubble sessionnev resolution valtozatlan marad
   - bubble start/restart/attach/watchdog tovabbra is a canonical tmux runneren keresztul megy
2. `forbidden_regression_interpretations`
   - a `TMUX` env torlese a canonical runnerben nem torheti el az altalanos tmux parancsfutast
   - a UI restart izolacio nem valhat uj publikus bubble config kotottseggel
3. `replacement_proof_required_if_removed`
   - ha a bubble tmux muveletek mar nem oroklik a `TMUX` envet, ezt regresszios tesztnek kell bizonyitania

### Authority Fan-out Scan

1. `authority_producer`
   - `scripts/ui-server.sh`
2. `internal_execution_consumers`
   - `src/v11/infrastructure/channel/tmux/tmuxRunner.ts`
3. `workflow_orchestration_consumers`
   - bubble start/restart/watchdog/attach mind ezen a tmux runneren keresztul kulon consume familykent fuggnek a runner authoritytol
4. `read_model_consumers`
   - nincs required-now ownership
5. `cleanup_recovery_consumers`
   - nincs required-now ownership

Verdict:

1. A bounded task shape itt `producer + shared internal execution boundary hardening`.
2. A stale runtime read-model cleanup kovetkezo task lehet, de nem ennek a slice-nak a kotelezo resze.

### Call-Site Matrix

| ID | File | Contract delta | Priority |
|---|---|---|---|
| CS1 | `scripts/ui-server.sh` | a UI restart runtimeja izolalt marad a bubble tmux runtime authoritytol; a restart nem erintheti a bubble tmux sessionok livenesset | P1 |
| CS2 | `src/v11/infrastructure/channel/tmux/tmuxRunner.ts` | a canonical tmux runner nem orokolheti a `TMUX` kornyezetet | P1 |
| CS3 | `tests/core/runtime/tmuxManager.test.ts` | regresszios bizonyitas kell arra, hogy a tmux runtime boundary semlegesitett envvel spawnol; a task a meglvo tmux runtime baseline-ban varja ezt a bizonyitast | P1 |

Implementation notes:

1. A UI restart izolacio megvalosithato belso shell/runtime authority szeparacioval; a task nem kotelezi el magat egyetlen mechanizmus mellett, amig az izolacios kimenet bizonyitott.
2. Ha a canonical tmux runner env izolaciohoz szukseges, engedett kis helper-ek bevezetese a runner file-on belul.
3. A tmux runner regresszios teszt required-now a meglvo `tests/core/runtime/tmuxManager.test.ts` baseline ownershipe; uj dedikalt runner tesztfile nem resze ennek a tasknak.
4. A stale registry/read-model drift csak megfigyelt kovetkezmeny, nem required-now ownership ebben a taskban.

### Data / Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| UI restart runtime isolation | UI session observed current-tree ugyanazon a default tmux socketen fut, mint a bubble sessionok | a UI restart nem oszthat bubble-kill failure domaint a bubble tmux runtime path-tal | isolated restart authority boundary vagy egyenerteku bizonyitott izolacio a shell/runtime pathon | none | internal-only runtime hardening | P1 | required-now |
| Canonical tmux runner env | `TMUX` implicit oroklodik | `TMUX` explicit torolve | clean tmux process env, `CLAUDECODE` tovabbra is torolve | other neutral env preserved | internal execution hardening | P1 | required-now |

Normative rules:

1. `ui:restart` utan egy mar futo local bubble tmux session nem tunhet el csak amiatt, hogy a UI restart megtortent.
2. A canonical tmux runner spawn envje nem tartalmazhat `TMUX` kulcsot.
3. A UI restart path nem oszthat bubble-kill authorityt a bubble default tmux runtime path-tal.
4. A bubble sessionnevek es attach command shape nem valtozhatnak meg.
5. A task nem oldhatja meg a problemat pusztan stale registry reconcile-lal.

### Shared Contract Compatibility

1. `current_consumers`
   - bubble start/restart/watchdog/attach tmux command paths
   - UI script lifecycle wrapper
2. `additive_vs_breaking`
   - belso runtime authority fix; publikus bubble UX shape nem valtozik
3. `alignment_now_or_later`
   - most a kill-path izolacio tortenik
   - kesobb johet stale-state self-healing follow-up, ha kell

### Closure Budget

1. `touched_closures`
   - `authority_producer`
   - `internal_execution_consumers`
2. `intentionally_collapsed`
   - a UI wrapper es a canonical tmux runner ugyanannak a kill-pathnak a ket vege, ezert egy taskban tarthato
3. `explicitly_deferred`
   - stale runtime registry auto-healing
   - post-start/restart liveness recheck
   - attach/status UX pontositas

### Bounded Task Shape

1. `primary_shape`
   - `producer_shared_boundary_bugfix`
2. `secondary_shape`
   - `none`

### Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | tmux runner env isolation | process envben van `TMUX=/tmp/fake,123,0` | `runTmux()` spawnol | a child env nem tartalmaz `TMUX` kulcsot | P1 | required-now | automated test |
| T2 | neutral env preservation | process envben van nem tmux kapcsolodo egyedi env | `runTmux()` spawnol | a nem tiltott env elemek megmaradnak | P2 | required-now | automated test |
| T3 | UI restart isolation smoke | fut egy local bubble tmux session es fut a UI session | `ui:restart` lefut | a bubble tmux session tovabbra is el | P1 | required-now | manual or scripted smoke evidence |

### Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | belso UI restart izolacio a shell/runtime pathon | P1 | required-now |
| must-use | canonical tmux runner env sanitation | P1 | required-now |
| must-not-use | stale registry-only workaround | P1 | required-now |
| must-not-change | bubble sessionnev shape, attach UX public contract | P1 | required-now |

## Review Control

1. A review ne huzza be ebbe a taskba a stale registry auto-healinget.
2. A review ne kerjen bubble state machine vagy protocol valtoztatast ebben a fazisban.
3. A review ne nyisson uj publikus env/config contractot, ha az izolacio belsoleg megoldhato.
4. A task csak akkor zarhato, ha a kill-path izolacio tenylegesen a session eltunes okara lo, nem csak a kovetkezmenyre.
5. A review ne kezelje teljesen bizonyitott root cause-kent a kulon tmux socket mechanizmust; eleg a bizonyitott izolacios outcome.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. a UI restart runtime authorityja izolalt a bubble tmux runtime authoritytol,
2. a canonical tmux runner nem orokli a `TMUX` envet,
3. a publikus bubble sessionnev/attach contract valtozatlan marad,
4. a stale registry self-healing tovabbra is explicit follow-up scope marad, nem rejtett resze ennek a tasknak.
