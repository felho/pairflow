---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task12_launch_contract_foundation_neutralization_v1
title: "Actor Runtime Interface Opportunity 2 Task 12: Launch Contract Foundation Neutralization"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/ports/tmuxSessions.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/defaults/start/startBubbleDefaults.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/index.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/runtime/tmuxManager.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 12: Launch Contract Foundation Neutralization

## Current Codebase Check (2026-04-22)

1. A start lane canonical launch truth current-tree szinten mar `LaunchBubbleSessionAck.status = running | failed_to_start`, de a canonical contract meg mindig `tmux`-specifikus closed termeket hordoz:
   - `LaunchBubbleSessionInput.runner?: TmuxRunner`
   - `LAUNCH_ACK_TMUX_COMMAND_FAILED`
   - `tmux_command_failed`
2. A producer family ugyanebben a closed contractban ownershipolja a launch failure canonicalizationt:
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
3. A start consume-family mar primary modon neutral `launchBubbleSessionAck` consume-ra ul, de a shared contract terminology driftet orokli:
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
4. A repo-root/public canonical tipusjelentes current-tree szinten mar most is ugyanebbol a shared contractbol jon:
   - `src/index.ts` a `LaunchBubbleSessionInput`-ot es a retained compat launch tipusokat egyarant re-exportalja
   - `src/v11/defaults/start/startBubbleDefaults.ts` current-tree reality szerint retained compat/default binding surface-et is tartalmaz
5. A retained `LaunchBubbleTmuxSession*` alias family es `launchBubbleTmuxSession*` wrapper current-tree szinten meg letezik, de ez a task meg nem a vegso zero-hit closeout:
   - az csak a successor `O2-T13` ownershipja.

## Closed-Contract Drift Anchors

1. Source anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/defaults/start/startBubbleDefaults.ts`
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - `src/index.ts`
2. Current canonical elements:
   - `LaunchBubbleSessionInput`
   - `LaunchBubbleSessionAck`
   - `LaunchBubbleSessionAckPort`
   - `launchBubbleSessionAck(...)`
   - `running | failed_to_start`
3. Current compat elements:
   - `LaunchBubbleTmuxSession*` alias/result/port family
   - `launchBubbleTmuxSessionAck(...)`
   - `launchBubbleTmuxSession(...)`
4. Closed terms to revise explicitly in this task:
   - `LAUNCH_ACK_TMUX_COMMAND_FAILED`
   - `tmux_command_failed`
   - `runner?: TmuxRunner` mint canonical launch input mező
5. Explicit authorized reinterpretation in this task:
   - a canonical failure taxonomy exact neutral replacementje:
     - `LAUNCH_ACK_COMMAND_FAILED`
     - `command_failed`
   - a `TmuxRunner` tovabbra is retained infra primitive maradhat, de nem shared launch boundary mezokent
   - a `LaunchBubbleTmuxSessionInput` nem maradhat kozvetlen aliasa a canonical `LaunchBubbleSessionInput`-nak:
     - explicit compat-only launch input shape-pé kell valnia,
     - a current launch command mezok retained compile-preserving megtartasaval,
     - es a temporary `runner?: TmuxRunner` mező csak ezen a compat-only inputon maradhat az `O2-T13`-ig
6. Drift status:
   - `explicit_authorized_reinterpretation`

## L0 - Policy

### Goal

1. A canonical launch shared contract topology-neutral closed termsre szukitese.
2. A canonical producer exact neutral failure taxonomyra atallitasa.
3. A `TmuxRunner` shared launch input ownershipjanak megszuntetese.
4. A retained launch compat family izolalasa explicit temporary compat statuszba, hogy a vegso torles az `O2-T13`-ban mar bounded consumer/export cleanup legyen.
5. A public surface-en explicitte tenni, hogy ebben a taskban a canonical type-jelentes cutover tortenik meg, nem a retained compat exportok vegso torlese.

### Non-Compatibility Policy (Task-Local)

1. Ez a task nem ownershipolja a vegso backward-compatibility-surface removal closeoutot.
2. Nem elfogadhato:
   - uj `tmux`-specifikus canonical launch term bevezetese,
   - a `runner?: TmuxRunner` retained shared launch input mezokent valo meghagyasa,
   - a neutral canonical failure taxonomy melle parallel `tmux` canonical taxonomy fenntartasa.
3. Temporary retained compat megengedett csak ott, ahol az `O2-T13` elotti compile-preserving izolaciohoz szukseges, es csak explicit compat statuszban:
   - `LaunchBubbleTmuxSession*`
   - `launchBubbleTmuxSessionAck(...)`
   - `launchBubbleTmuxSession(...)`
4. A temporary retained compat pathnak exact interim contracttal kell maradnia:
   - `LaunchBubbleTmuxSessionInput` explicit compat-only input type,
   - nem alias,
   - retained `runner?: TmuxRunner` mezővel csak ezen a compat inputon,
   - retained wrapper/projection consumers csak ezt a compat inputot fogyaszthatjak az `O2-T13`-ig.

### Business Invariant

1. A canonical launch truth tovabbra is `running | failed_to_start`.
2. A canonical launch failure taxonomy topology-neutral kell legyen.
3. A tmux retained runtime adapter letezhet, de a canonical launch input/failure contract nem beszelhet `tmux`-ot.
4. A public canonical tipusjelentes cutover megengedett ebben a taskban, de a retained compat exportok vegso removalja nem.

### Allowed Resolution Path

1. `LaunchBubbleSessionInput` canonical launch input runner mező nelkul.
2. `LaunchBubbleSessionAck.reason_code = LAUNCH_ACK_COMMAND_FAILED` es `failure_kind = command_failed` a command-level launch failure canonical replacementjekent.
3. Infra-local tmux runner wiring a producer familyben.
4. Temporary compat projection ugyanebbol a canonical authoritybol, successor torlesre elokeszitve.
5. Temporary compat wrapper csak explicit compat-only `LaunchBubbleTmuxSessionInput` shape-et fogyaszthat.

### Forbidden Fallback

1. `LAUNCH_ACK_TMUX_COMMAND_FAILED` canonical term retained statuszban.
2. `tmux_command_failed` canonical term retained statuszban.
3. `runner?: TmuxRunner` retained canonical launch inputkent.
4. A neutral contract mellé uj second-source failure taxonomy vagy runner fallback path.
5. A temporary compat input shape elhallgatasa vagy implicit aliasban hagyasa.

### Shared/Public Contract Decision

1. Ez a task shared-contract es producer foundation slice, nem final export-removal slice.
2. Current public/read-model inventory:
   - canonical type re-export surface: `src/index.ts`
   - retained compat/default binding surface: `src/v11/defaults/start/startBubbleDefaults.ts`
3. Additive-vs-breaking decision:
   - `canonical_type_meaning_cutover_now`
   - `retained_compat_export_removal_later`
4. Ebben a taskban elvart public hatas:
   - a `LaunchBubbleSessionInput` canonical jelentese megvaltozik,
   - a neutral failure taxonomy canonical public type-kent jelenik meg.
5. Kifejezetten nem ebben a taskban ownershipolt:
   - retained compat type exportok torlese,
   - retained compat value exportok torlese,
   - retained defaults exportok vegso felszamolasa.

## Scope Reality / Shape Proof

1. Primary bounded-task shape:
   - `contract_or_persisted_authority_foundation`
2. Secondary shape:
   - `authority_producer`
3. Why this mix is safe:
   - ugyanaz a bounded code path ownershipolja a launch shared contractot es a producer canonicalizationt;
   - a public surface-en csak canonical type-jelentes cutover tortenik, retained export cleanup nelkul;
   - nincs ebben a taskban final zero-hit compat removal.
4. Explicitly deferred:
   - retained launch compat alias/wrapper family teljes torlese
   - repo-root/public retained compat export torles
   - core start/restart smoke harness vegso string/override cleanup

## Authority Boundary Map

1. `authority_producer`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `launchBubbleSessionAck(...)`
2. `persisted_authority`
   - `N/A`
3. `internal_execution_consumers`
   - `N/A`
4. `workflow_orchestration_consumers`
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - `tests/contracts/v11/start.contract.runner.ts`
5. `read_model_consumers`
   - `src/index.ts` canonical type-jelentes cutover only
   - retained compat export removal explicit deferred to `O2-T13`
6. `cleanup_recovery_consumers`
   - explicit deferred to `O2-T13`
7. Export surfaces closed in this phase:
   - no

## Closure-Budget Gate

1. Closure buckets touched:
   - `shared_contract`
   - `authority_producer`
   - `workflow_orchestration_consumers`
2. Intentionally collapsed closures:
   - `shared_contract` + `authority_producer`
3. Why this collapse is safe:
   - a canonical launch contract exact termjeit es producer canonicalizationjat ugyanaz a tmux launch family ownershipolja;
   - a downstream public/read-model fallout explicit successor taskba van kulonitve.
4. Explicitly deferred closures:
   - `read_model_consumers` retained compat export removal resze
   - `cleanup_recovery_consumers`

## Baseline Preservation

1. `must_preserve_behaviors`
   - canonical launch truth: `running | failed_to_start`
   - start lane fail-closed behavior
   - producer ugyanugy tud bubble sessiont inditani retained tmux adapteren keresztul
2. `allowed_resolution_paths`
   - direct canonical `launchBubbleSessionAck(...)`
   - start consume-family neutral ack consume
   - isolated compat projection ugyanebbol a canonical producerbol
   - explicit compat-only `LaunchBubbleTmuxSessionInput` retained wrapper path az `O2-T13`-ig
3. `forbidden_regression_interpretations`
   - a neutral failure taxonomy nem lazithatja a fail-closed launch behavior-t
   - a `TmuxRunner` shared inputbol valo kivetele nem jelentheti a runtime primitive elveszteset
   - a temporary compat projection nem promotalhato vissza canonical authorityve
   - a public canonical tipusjelentes cutover nem allithato be retained compat export cleanupkent
4. `replacement_proof_required_if_removed`
   - `LAUNCH_ACK_TMUX_COMMAND_FAILED` -> `LAUNCH_ACK_COMMAND_FAILED`
   - `tmux_command_failed` -> `command_failed`
   - shared `runner?: TmuxRunner` -> infra-local producer input/wiring
   - `LaunchBubbleTmuxSessionInput = LaunchBubbleSessionInput` alias -> explicit compat-only `LaunchBubbleTmuxSessionInput`

## Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `split_decision`: `already_split`
9. Why no further split:
   - a producer es shared-contract exact term closure ugyanannak a bounded familynek a munkaja;
   - a public/export es final compat-removal fallout kulon successor taskba kerult.

## Kill List

Az alabbi elemeknek el kell tunniuk a canonical launch contractbol es canonical producer taxonomybol:

1. `LAUNCH_ACK_TMUX_COMMAND_FAILED`
2. `tmux_command_failed`
3. `runner?: TmuxRunner` a `LaunchBubbleSessionInput` shape-ben
4. `LaunchBubbleTmuxSessionInput = LaunchBubbleSessionInput` direct alias

## Required Edits

1. A shared launch tipusokban explicit neutral canonical reason/failure kind replacementet kell bevezetni.
2. A canonical launch inputbol ki kell venni a shared `runner` mezot.
3. A producer familyben a runtime runner ownershipot infra-localan kell tartani.
4. A start consume-familyt es a contract runner scenarioit az uj neutral canonical termekre kell atirni.
5. A retained `LaunchBubbleTmuxSessionInput`-ot explicit compat-only structural type-kent kell levalasztani a canonical inputrol.
6. A retained `LaunchBubbleTmuxSession*` family tovabbra is csak isolated compat projectionkent maradhat, successor torlessel.
7. Ha `src/index.ts` vagy `startBubbleDefaults.ts` touched marad a compile-preserving alignment miatt, ott csak a canonical type-jelentes cutovert szabad ownershipolni; retained compat export torleset nem.

## Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - a canonical launch producer tovabbra is tudjon `running` ackot adni
   - a canonical launch producer tovabbra is tudjon fail-closed `failed_to_start` ackot adni az uj neutral taxonomyval
2. Side effects forbidden before validations pass:
   - nem maradhat parallel old+new canonical failure taxonomy
   - nem maradhat shared runner mező a canonical launch inputon
   - nem maradhat implicit compat input alias, ha a temporary compat path tovabb el
3. Invalid/precondition-failure behavior:
   - a launch command failure tovabbra is `failed_to_start` marad
   - nincs synthetic success vagy degraded compat truth
4. Coordination primitives in scope:
   - none

## Acceptance Criteria

### Functional

1. A canonical launch shared contract topology-neutral exact termekre szukult.
2. A canonical launch input nem hordoz shared `runner` primitive-et.
3. A start consume-family es a contract runner az uj neutral failure taxonomy-t hasznalja.
4. A retained compat path, ha megmarad, explicit compat-only input shape-pel marad meg, nem canonical input aliaskent.

### Zero-Hit Audit

```bash
rg -n "LAUNCH_ACK_TMUX_COMMAND_FAILED|tmux_command_failed|runner\\?\\s*:\\s*TmuxRunner" src/v11/shared/ports/tmuxSessions.ts src/v11/infrastructure/channel/tmux/tmuxManager.ts src/v11/application/start src/v11/defaults/start tests/contracts/v11/start.contract.runner.ts tests/v11/application/start tests/core/runtime/tmuxManager.test.ts -S
```

```bash
rg -n "LaunchBubbleTmuxSessionInput\\s*=\\s*LaunchBubbleSessionInput" src/v11/shared/ports/tmuxSessions.ts src/v11/infrastructure/channel/tmux/tmuxManager.ts -S
```

### Validation

1. `pnpm typecheck`
2. `pnpm build`
3. `pnpm vitest tests/v11/application/start/startCommandOrchestration.test.ts tests/contracts/v11/start.contract.runner.ts tests/core/runtime/tmuxManager.test.ts`

## Hardening Backlog

1. `N/A` - a retained compat family vegso torlese explicit successor ownership az `O2-T13`-ban.
