---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3f_remote_aware_open_command_and_ui_open_consume_v1
title: "Remote Bubble Execution Remote-Aware Open Command and UI Open Consume (Phase 3F)"
status: implementable
phase: phase3f-remote-aware-open-command-and-ui-open-consume
target_files:
  - src/v11/application/open/openBubbleRuntime.ts
  - src/v11/application/open/openCliCommand.ts
  - src/v11/application/open/openBubble.ts
  - src/v11/application/open/openBubbleDefaults.ts
  - src/config/pairflowConfig.ts
  - src/config/bubbleConfig.ts
  - src/types/bubble.ts
  - src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleStatus.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/cli/index.ts
  - tests/core/bubble/openBubble.test.ts
  - tests/cli/bubbleOpenCommand.test.ts
  - tests/config/pairflowConfig.test.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/ui/server.integration.test.ts
  - tests/core/ui/router.test.ts
  - README.md
  - docs/remote-bubble-execution.md
  - docs/pairflow-ui-prd.md
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
  - plans/archive/tasks/remote-bubble-execution/phase3e-verified-remote-clone-local-request-rework.md
  - docs/remote-bubble-execution.md
  - docs/pairflow-ui-prd.md
  - README.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote-Aware Open Command and UI Open Consume (Phase 3F)

## Feynman Summary / One-Screen Model

1. A Pairflow `Open` surface ma egyetlen lokalis modellel dolgozik:
   - bubble feloldasa,
   - `open_command`,
   - `{{worktree_path}}`,
   - lokalis editor launch.
2. Ez remote bubble eseten nem eleg:
   - a canonical workspace nem a laptop worktree-je,
   - hanem a started remote pointer altal jelolt remote clone.
3. A task lenyege:
   - a `pairflow bubble open` es a UI `Open` action remote-aware consume-utjat letrehozni,
   - hogy started remote bubble eseten a launch parancs a remote clone authorityra parametrizalodjon,
   - peldaul VS Code Remote SSH felulettel.
4. Ez nem attach-task es nem altalanos IDE-integration rewrite:
   - az attach surface retained kulon consume marad,
   - nincs plugin-detection,
   - nincs remote runtime activation,
   - nincs altalanos operator parity ujranyitasa.

## Current Codebase Check / Current-Tree Reality Check (2026-04-20)

1. A `bubble open` jelenlegi runtime-ja csak lokalis worktree-path alapjan dolgozik:
   - [src/v11/application/open/openBubbleRuntime.ts](/Users/felho/dev/pairflow/src/v11/application/open/openBubbleRuntime.ts)
2. A jelenlegi open flow:
   - bubble feloldas,
   - worktree existence check,
   - `open_command` precedence,
   - `{{worktree_path}}` interpolation,
   - shell launch.
3. A jelenlegi precedence retained baseline:
   - bubble `open_command`
   - global `open_command`
   - built-in default `cursor {{worktree_path}}`
   - [README.md](/Users/felho/dev/pairflow/README.md:1030)
4. A UI `Open` explicit contractja azt mondja, hogy ugyanazt a viselkedest kell hivnia, mint a `pairflow bubble open`:
   - [docs/pairflow-ui-prd.md](/Users/felho/dev/pairflow/docs/pairflow-ui-prd.md:71)
5. A UI ma mar tenyleg csak egy thin routing layer:
   - `POST /api/bubbles/:id/open`
   - router dependency `openBubble`
   - [src/v11/infrastructure/ui/routerActionDispatch.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/ui/routerActionDispatch.ts:202)
6. A remote bubble consume mas surface-eken mar letezik:
   - attach started pointert olvas,
   - remote alias/host/user supplementet old fel,
   - created/missing/invalid eseteket fail-closed kezeli,
   - [src/v11/shared/attach/resolveAttachBubbleExecution.ts](/Users/felho/dev/pairflow/src/v11/shared/attach/resolveAttachBubbleExecution.ts)
7. A remote host/user/expected-host resolution retained precedentje mar megvan:
   - [src/v11/infrastructure/executor/ssh/sshBubbleStatus.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleStatus.ts)
8. A remote pointer canonical source-ja mar letezik:
   - started pointerben `host`, optional `user`, `remoteClonePath`, `tmuxSession`
   - [src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts)
9. A jelenlegi open runtime remote bubble eseten implicit lokalis-worktree feltetelezesbe fut bele:
   - a worktree existence check nem a remote clone authorityra epul,
   - nincs remote placeholder vocabulary,
   - nincs remote-aware built-in default.
10. A CLI output is lokalis worktree wordingre van kotve:
   - [src/cli/index.ts](/Users/felho/dev/pairflow/src/cli/index.ts:490)

## Parent Plan Fit / Stable Sequencing

1. Ez a task a remote execution lane-ben `Phase 3E` utani residual successor.
2. A task besorolasa:
   - `operator_read_model`
   - pontosabban operator-facing workspace-launch consume,
   - nem `mutation_routing`, mert nem mutal bubble state-et.
3. A task a kovetkezo lezart baseline-okra epul:
   - `Phase 2D` remote SSH start activation,
   - `Phase 2E` remote status/list read-model,
   - `Phase 2F` remote attach consume,
   - `Phase 3D` remote runtime availability/read-model semantics refinement.
4. A task sequencing-fegyelme:
   - nem irhatja felul a `Phase 3E` jelenlegi active-successor statuszt,
   - successor-owned, materializalt, de nem current-active slice.
5. A task nem nyithatja ujra:
   - remote attach launcher consume teljes scope-jat,
   - `approve` / `reply` / cleanup family remote parityt,
   - runtime activation vagy pointer/state-cache authority kerdeseket.

## Source-Anchor Consistency

1. Canonical source anchors:
   - [plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md)
   - [plans/archive/tasks/remote-bubble-execution/phase3e-verified-remote-clone-local-request-rework.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase3e-verified-remote-clone-local-request-rework.md)
   - [docs/remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md)
   - [README.md](/Users/felho/dev/pairflow/README.md)
2. Closed canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - started remote bubble canonical workspace authorityja a remote clone,
   - `remote.json(kind="started")` retained pointer source marad,
   - `state-cache.json` tovabbra sem launch authority,
   - a UI `Open` tovabbra is ugyanazt a semanticat kell hivja, mint a CLI `bubble open`.
3. Uj explicit clarification, amelyet ez a task zar le:
   - a remote bubble `open` consume nem lokalis worktree launch,
   - hanem remote-aware editor launch consume a started remote pointer authorityjara ulve.
4. Forbidden reinterpretations:
   - a task nem kezelheti a remote bubble `open`-t attachkent,
   - nem szabad a lokalis `open_command`-ot csendben atdefinialni remote-only placeholder semanticsra,
   - nem szabad `created` remote bubble eseten implicit startot vagy attach fallbackot csinalni,
   - nem szabad a host alias vagy `--repo` alapjan onmagaban remote authorityt feltetelezni.
5. `drift_status`: `closed_contract_preserved`

## Implementation Target Decision

1. `implementable_now`: `yes`
2. A task implementalhato, mert a remote command contract itt explicit task-level formaban rogzitett:
   - built-in remote default,
   - `remote_authority` canonical forma,
   - URI-encoding ownership,
   - returned open-result semantics.
3. A bounded task-shape:
   - operator-facing consume alignment egyetlen command familyben: `open`.
4. A preferalt implementation shape:
   - kulon remote-aware open-command resolution helper vagy equivalent named seam,
   - kulon local es remote template rendering vocabulary,
   - explicit started-pointer consume es expected-host validation,
   - retained UI/CLI routing ugyanarra a shared open runtime-ra.
5. Nem preferalt megoldas:
   - a jelenlegi `open_command` semantics csendes tulterhelese,
   - attach logic copy-paste,
   - UI oldali special-casing backend contract nelkul.

## Authority Boundary Map

1. `authority_producer`
   - nincs uj authority producer.
2. `persisted_authority`
   - retained baseline:
   - remote pointer marad a launch-target authority forrasa remote bubble eseten.
3. `internal_execution_consumers`
   - in scope:
   - open-command resolution,
   - local-vs-remote workspace target selection,
   - placeholder/rendering/launch boundary.
4. `workflow_orchestration_consumers`
   - szuk scope-ban in scope:
   - local-vs-remote open route selection,
   - created/missing/invalid pointer fail-closed branching.
5. `read_model_consumers`
   - szuk, de explicit in scope:
   - CLI returned open summary wording,
   - backend/UI shared open-result contract, amennyiben a launch target tipusa explicitte valik.
6. `cleanup_recovery_consumers`
   - explicit out of scope:
   - attach/start/restart/merge/delete/commit flows,
   - cache refresh policy,
   - recovery diagnostics family.

## Closure Budget / Task-Shape Triage

1. `closure_buckets_touched`
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `read_model_consumers`
   - `persisted_authority_or_schema`
2. `closure_buckets_not_touched`
   - `authority_producer`
   - `cleanup_recovery_consumers`
3. `collapsed_closures`
   - narrow open-result contract bridge
   - additive config-surface extension ugyanazon `open` command familyben
   - internal open-route selection
   - remote launch-template resolution
   - thin CLI/UI surface alignment
4. `why_collapse_is_safe`
   - ugyanazt az operator-facing correctness boundaryt zarjak:
   - a canonical workspace launch target helyes meghatarozasat;
   - az uj config mezok es az explicit open-result contract nem nyitnak kulon producer vagy cleanup lane-t, csak ugyanennek az `open` familynek a bounded consume-hidjat zarjak le.
5. `explicitly_deferred_closures`
   - attach/open command-profile unification,
   - IDE-specific plugin detection,
   - generic remote editor abstraction tobb IDE-re,
   - UI success toast / richer launch diagnostics.
6. `primary_task_shape`
   - `consumer_family_alignment`
7. `secondary_task_shape`
   - `shared_contract` (narrow open-config + open-result bridge only)
8. `why_secondary_shape_is_safe`
   - a task additive config-contractot es explicit result-shape-et vezet be, de ezek ownershipa ugyanabban a bounded `open` consume familyben marad;
   - nincs uj authority producer, nincs kulon activation lane, es nincs altalanos remote operator API ujranyitasa.

## Complexity-Risk Triage

1. `risk_score`
   - `5`
2. `split_decision`
   - `single_task_acceptable`
3. `authority_risk`
   - `1`
   - retained started pointer authority consume-ja correctness-critical.
4. `surface_spread`
   - `2`
   - open runtime + config parsers + shared open-result contract + CLI/UI wording + tests.
5. `identity_join_risk`
   - `1`
   - remote alias / host / user / started pointer join pontos kell legyen.
6. `activation_coupling`
   - `0`
   - nincs uj remote activation.
7. `prerequisite_risk`
   - `1`
   - remote pointer es global remote config supplement retained correctness.
8. `acceptance_multiplicity`
   - `1`
   - local open retained baseline + remote open uj consume.

## Baseline Preservation

1. `must_preserve_behaviors`
   - local bubble `open` retained precedence:
     - bubble `open_command`
     - global `open_command`
     - built-in local default
   - UI `Open` tovabbra is a shared backend `open` actiont hivja,
   - a returned local `open` target tovabbra is worktree-alapu,
   - created/missing/invalid remote pointer fail-closed marad,
   - attach semantikaja valtozatlan.
2. `allowed_resolution_paths`
   - local bubble -> local open template render + local launch,
   - remote bubble + started pointer -> remote-aware open template render + local editor launch remote target authorityval.
3. `forbidden_regression_interpretations`
   - remote bubble -> lokalis worktree existence mint authority proof,
   - remote bubble -> implicit attach fallback,
   - remote bubble -> state-cache-derived launch target,
   - local `open_command` remote placeholder expansionja.

## Task-Local Contract Proposal

1. Kulon remote open config surface kell:
   - bubble: `open_remote_command`
   - global: `open_remote_command`
2. A retained local `open_command` semantics valtozatlan marad.
3. Remote precedence:
   - bubble `open_remote_command`
   - global `open_remote_command`
   - built-in remote default
4. A built-in remote default canonical formaja:
   - `code --folder-uri "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}"`
5. A `remote_authority` canonical formaja:
   - `[user@]host`
   - a `user@` prefix csak akkor jelenik meg, ha a resolved remote user elerheto.
6. Authority assembly es supplement boundary:
   - a `remoteClonePath` canonical source-a kizarolag a started pointer `remoteClonePath` mezoje;
   - a `host` canonical source-a a started pointer `host` mezoje;
   - a remote config supplement legfeljebb a hianyzo `user` erteket adhatja hozza, illetve expected-host drift guardkent hasznalhato;
   - a config supplement nem irhatja felul sem a persisted `host`-ot, sem a `remoteClonePath`-ot.
7. A remote URI rendering ownershipa:
   - dedikalt URI-encoding helper ownership,
   - nem megengedett a `remote_clone_path` vagy a `remote_authority` egyszeru `shellQuote`-os URI-resz renderje,
   - a shell quoting csak a vegso command argument boundaryra alkalmazhato.
8. Minimum remote placeholder vocabulary:
   - `{{remote_clone_path}}`
   - `{{remote_host}}`
   - `{{remote_user}}`
   - `{{remote_authority}}`
   - optional: `{{remote_alias}}`
9. Rendering contract explicit fail-closed szabalyokkal:
   - a local `open_command` tovabbra is csak local placeholder semanticsra epithet;
   - a remote `open_remote_command` csak a remote placeholder vocabularyt kapja guaranteed inputkent;
   - `{{worktree_path}}` nem kap hallgatolagos remote clone jelentest;
   - unresolved vagy nem tamogatott placeholder eseten az `open` explicit konfiguracios hibaval alljon meg, nyers tokenes launch nelkul.
10. A shared `OpenBubbleResult` / `UiOpenBubbleResult` contract explicit target-modelre valt:
   - `workspaceKind`: `local_worktree` | `remote_clone`
   - `workspacePath`: a tenyleges launch-target path
   - `remoteAuthority?`: csak remote launch eseten
   - `command`
   - `worktreePath` retained compatibility fieldkent csak local-worktree jelentessel maradhat; nem terhelheto tul remote clone path jelentessel.
11. Result-consume branch explicit marad:
   - a CLI es a UI human wording a `workspaceKind` alapjan valasszon local-vs-remote sikeruzenetet;
   - nem megengedett a target-tipus visszakovetkeztetese pusztan a `worktreePath` jelenletebol.
12. Remote open akkor engedett, ha:
   - bubble executor ssh,
   - remote pointer `kind="started"`,
   - remote clone path jelen van,
   - host drift nincs a config supplement es a pointer kozott.
13. Local-vs-remote validation branch elvalik:
   - local bubble eseten retained worktree existence check marad;
   - remote bubble eseten a laptop oldali worktree existence nem lehet authority proof vagy launch precondition.
14. Remote open forbidden when:
   - pointer missing,
   - pointer `created`,
   - invalid pointer,
   - ambiguous host/authority supplement.

## Implementation Sequence

1. Additiv config-shape eloszor:
   - bubble/global `open_remote_command` parser + typing + defaults ugy, hogy a local `open_command` contract erintetlen maradjon.
2. Shared open route-selection masodikkent:
   - local-vs-remote branch explicit seamre keruljon,
   - remote branch started pointert, config supplementet, es host drift guardot fogyasszon,
   - attach consume-bol csak a szukseges authority-resolution mintat vegye at, ne logika-copyval.
3. Remote rendering/helper reteg harmadikkent:
   - kulon remote template rendering + URI encoding helper,
   - explicit fail-closed placeholder validation,
   - built-in remote default ugyanebben a seam-ben.
4. Result-surface es operator wording negyedikkent:
   - `OpenBubbleResult` / `UiOpenBubbleResult` target-model explicitte valik,
   - CLI output, README, es UI contract wording ugyanarra a shape-re all ra.
5. Tesztmatrix vegul:
   - local retained baseline,
   - remote happy path,
   - pointer/config drift guard,
   - placeholder/encoding fail-closed esetek,
   - CLI/UI result wording alignment.

## Acceptance Criteria

1. Local bubble `open` retained baseline-ja teljesen valtozatlan marad.
2. Started remote bubble `open` nem a lokalis worktree pathra renderelodik.
3. Started remote bubble `open` a remote clone authoritybol epit launch targetet.
4. A remote launch template kulon config surface-en lakik; a local `open_command` nem kap uj implicit remote jelentest.
5. A CLI help es a README explicitte rogziti a local-vs-remote open precedence-t.
6. A CLI output nem allitja remote bubble eseten, hogy lokalis worktree nyilt meg.
7. A shared open-result contract explicitte kulonbseget tesz `local_worktree` es `remote_clone` launch target kozott, es a `worktreePath` mezo nem kap remote clone jelentest.
8. A UI `Open` tovabbra is ugyanazt a backend open behavior-t hivja, es remote bubble eseten a remote-aware launch valosul meg.
9. `created` remote bubble eseten az `open` explicit fail-closed hibat ad:
   - start required,
   - nincs implicit remote start vagy attach.
10. A remote branch nem igenyel es nem is hasznal laptop oldali worktree existence proofot a launch authorityhoz.
11. A started pointer `host` es `remoteClonePath` canonical authority marad; config supplement ezeket nem irhatja felul, csak hianyzo usert potolhat es drift guardot adhat.
12. Unresolved vagy nem tamogatott remote placeholder eseten az `open` explicit konfiguracios hibaval all meg; nincs reszlegesen renderelt parancs.
13. A remote built-in default URI-ja dedikalt URI-encodinggal all elo; nincs shell-quoted URI-reszlet mint encoding surrogate.
14. A remote authority nem vezetheto le implicit modon sem local source repo-bol, sem `--repo` ertekbol; remote consume eseten a launch target authorityja kizarolag a started pointerbol es a szuk config supplementbol epulhet fel.
15. A tesztek fedik:
   - local precedence,
   - remote precedence,
   - built-in remote default render,
   - `[user@]host` authority render ugy, hogy a `user@` prefix csak akkor jelenjen meg, ha resolved remote user tenylegesen elerheto,
   - explicit open-result shape local-vs-remote target semanticsa,
   - result-consumer wording local-vs-remote branch alapjan,
   - remote placeholder rendering,
   - unresolved placeholder fail-closed,
   - started-vs-created pointer gating,
   - remote branch nem igenyel laptop oldali worktree existence proofot, es nem a local worktree preconditionokbol kovetkeztet launch authorityra,
   - expected-host drift fail-closed,
   - ambiguous host/authority supplement fail-closed,
   - config supplement only-fills-missing-user semantics anelkul, hogy felulirna a persisted `host` vagy `remoteClonePath` authorityt,
   - dedikalt URI-encoding helper ownership, ahol a shell quoting nem URI-encoding surrogate,
   - nincs implicit remote authority levezetes local source repo vagy `--repo` alapjan,
   - CLI wording alignment.

## Out of Scope

1. Generic multi-IDE abstraction beyond bounded config placeholders.
2. Attach es open consume kozos command-profile-ja.
3. Remote editor session health verification.
4. Background detection arrol, hogy a VS Code Remote SSH extension telepitve van-e.
5. Success toast, post-launch polling, vagy richer UI telemetry.
6. Persisted remote pointer schema ujranyitasa a szukseges consume-felteteleken tul.
7. Barmilyen local-source-repo vagy `--repo` alapjan torteno implicit remote authority levezetes.

## Non-Blocking Notes

1. Optional port support tovabbra sem scope:
   - a canonical remote authority ebben a taskban `[user@]host` marad.
2. Ha a VS Code CLI kesobb alternative remote-open formara valtozik, az kulon docs/compat refinement lehet:
   - ez a task a jelenlegi canonical built-in defaultot rogzitettnek kezeli.
