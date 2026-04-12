---
artifact_type: plan
artifact_id: plan_remote_bubble_execution_contract_and_phasing_v2
title: "Remote Bubble Execution Contract and Phasing Plan (V2 Reset)"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Remote Bubble Execution Contract and Phasing (V2 Reset)

## Objective

Ujraszekvenalni a remote bubble execution munkat ugy, hogy a review-loop churn ne tudjon ujra eloallni ugyanazon authority-tema korul.

Sikernek most nem az szamit, hogy minel hamarabb legyen egy "majdnem remote" start path, hanem az, hogy:
1. a canonical workspace authority contract elobb zaruljon, mint barmilyen uj runtime activation,
2. a critical runtime consume-retegek elobb alljanak at, mint hogy clone-topology sikeres indulaskent engedelyezve legyen,
3. az operator read-model es cleanup csak akkor mozogjon, amikor az alatta levo runtime mar stabil,
4. egyszerre csak egy aktiv, implementalhato task legyen a repo-ban.

## Sequencing Reset Diagnosis

1. A korabbi Phase 1B azonos taskban probalta zarni a contract-foundation, producer-foundation es activation jellegu munkat.
2. Emiatt a bubble review koronkent mindig egy uj seamet tette correctness-critical-le:
   - eloszor a clone guard tul eros volt,
   - utana az operator-facing output tul koran mozdult,
   - vegul a clone-success path mar sikeres lett volna ugy, hogy a tmux/runtime consume meg mindig a statikus worktree pathra ult.
3. Ez pontosan az a hard-stop minta, amit a skill Complexity Risk Gate tilt:
   - uj canonical authority,
   - tobb consume-surface,
   - runtime activation ugyanabban a taskban.
4. A reset lenyege: a "clone-topology can succeed" allapot kulon activation fazisba kerul. Addig minden clone-start explicit fail-closed marad.

## Control-Model Readiness Result

`READY`

Az explicit control-model dontesek most visszanyerhetok a designbol es a review-loop tapasztalatbol:
1. `business_invariant`: egy futó bubble-hoz egyszerre pontosan egy runtime-authoritative workspace tartozhat.
2. `control_model`: az autoritativ workspace letezeset es runtime hasznalatat nem a statikus bubble path, hanem a fase szerint kijelolt canonical authority donti el.
3. `read_path_rule`: activation elott a rendszer nem olvashat vagy engedelyezhet clone-root runtimeot csak attol, hogy egy producer seam mar kepes lenne ilyet eloallitani.
4. `forbidden_fallback`: custom bootstrap success, statikus `bubblePaths.worktreePath`, illetve operator-facing output nem hasznalhato rejtett runtime truthkent a korai fazisokban.
5. `missing_data_rule`: ha az adott fazisban a canonical authority vagy a consume-alignment nincs kesz, a viselkedes fail-closed marad.
6. `phase_boundary`: contract -> producer -> runtime consume -> bubble-loop consume -> activation -> read-model -> cleanup -> recovery.

## Guiding Principles

1. Business invariant: egy futó bubble runtime viselkedese nem osztható meg ket workspace-azonossag kozott.
2. Control model: a clone-topology csak akkor valhat sikeres start kimenette, ha a canonical workspace authorityt minden critical runtime consumer ugyanonnan olvassa.
3. Read-path rule:
   - contract-foundation fazisban az uj mezok csak type/schema/persistence contractkent jelenhetnek meg,
   - producer fazisban a canonical authority eloreallithato es tarolhato, de activation meg tilos,
   - runtime consume fazisban a start/tmux/runtime reteg mar csak canonical authorityt olvashat,
   - bubble-loop consume fazisban az actor-protocol oldali muveletek is erre allnak at,
   - operator read-model csak a runtime activation utan valthat.
4. Forbidden fallback:
   - activation elott tilos custom bootstrap injectionnel clone-success pathot nyitni,
   - tilos a statikus `bubblePaths.worktreePath`-ot rejtett runtime authoritykent bent hagyni azokon a consume-surfaceken, amelyek mar cutoveren estek at,
   - tilos a CLI/start result vagy status wording alapjan runtime truthot feltetelezni.
5. Missing-data rule:
   - activation elott `work_mode=clone` explicit start reject,
   - activation utan hianyzo canonical workspace authority hard error / fail-closed,
   - remote pointer/cache hianyaban explicit `created/not-started` vagy `unavailable` allapot, nincs mas forrasra fallback.
6. Phase boundary note:
   - `contract_foundation`: additive contract closure, zero uj runtime behavior,
   - `producer_foundation`: canonical authority eloallitasa es tarolasa, de tovabbra sincs clone activation,
   - `internal_consume_alignment`: runtime es bubble-loop consume atallitas a canonical authorityra,
   - `runtime_activation`: csak ez utan engedheto a clone-success path,
   - `operator_write_enablement`: local create/write exposure runtime activation nelkul,
   - target-level pre-start hook contract szinten kulon zarul a remote start activation elott,
   - `operator_read_model`: user-facing consume kesobb,
   - `mutation_routing`: operator-triggered mutation commands kulon zarulnak a shared cleanup consume elott,
   - `cleanup_routing`: shared cleanup consume legkesobb,
   - `recovery_rollout`: diagnosztika es rollout legvegen.

## Execution Kind Model

| Kind | Meaning | Allowed In The Kind | Forbidden In The Kind |
|---|---|---|---|
| `contract_foundation` | type/schema/persistence contract closure | additive fieldek, parser/serializer, explicit fail-closed guards | uj successful runtime topology |
| `producer_foundation` | canonical authority producer seam | bootstrap/finalize/rollback producer wiring | tmux, actor loop, operator consume cutover |
| `internal_consume_alignment` | non-operator runtime consume alignment | tmux/runtime/bubble-loop canonical consume | SSH remote activation, operator wording |
| `operator_write_enablement` | local config/create path exposure without runtime start | `bubble create --remote`, local persistence, pointer init | remote start/status/list/attach activation ugyanebben a taskban |
| `runtime_activation` | previously blocked behavior bekapcsolasa | clone-success engedelyezese stabil consume-ekre epitve | uj authority contract vagy user-facing read-model cutover ugyanebben a taskban |
| `operator_read_model` | status/list/attach projection | read-model, diagnostics, wording | underlying runtime authority mozgatasa |
| `mutation_routing` | operator-triggered lifecycle mutation routing over stable runtime | approval/rework es mas command routing cutover | shared cleanup consume vagy rollout ugyanebben a taskban |
| `cleanup_routing` | commit/merge/delete/cleanup alignment | shared cleanup consume es lifecycle routing | authority contract ujranyitasa |
| `recovery_rollout` | diagnostics, reboot, docs, manual validation | recovery guidance, rollout evidence | foundational behavior valtozas |

## Complexity / Split Rationale

1. `risk_score`: `12`
2. Axis breakdown:
   - `authority_risk`: `2`
   - `surface_spread`: `2`
   - `identity_join_risk`: `2`
   - `activation_coupling`: `2`
   - `prerequisite_risk`: `2`
   - `acceptance_multiplicity`: `2`
3. Why a plan is required:
   - uj canonical authority jelenik meg,
   - a helyes runtime viselkedes tobb consume-surface pontos sorrendjetol fugg,
   - a remote feature valodi aktivacioja unfinished local consume alignmentre epul,
   - a korabbi single-task jelleg mar bizonyitottan review-loopot termelt.
4. Split decision:
   - `contract_foundation`
   - `producer_foundation`
   - `internal_consume_alignment`
   - `operator_write_enablement`
   - `runtime_activation`
   - `operator_read_model`
   - `mutation_routing`
   - `cleanup_routing`
   - `recovery_rollout`
5. Milestone-gated behavior to defer:
   - barmilyen successful clone-topology start Phase 2A elott,
   - remote SSH start/status/list/read-model consume a local runtime alignment elott,
   - `bubble create --remote` local write-path exposure es a tenyleges remote start activation ugyanabban a taskban,
   - a `pairflow_sync_command` config-contract es a hook tenyleges consume/execute ugyanabban a taskban,
   - `status/list` projection es `attach` launcher/forwarding consume ugyanabban a taskban,
   - approval/rework routing es commit/merge/delete cleanup consume ugyanabban a taskban,
   - cleanup shared consumer interpretation az operator read-model elott.

## Phase Breakdown

| Phase | Kind | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|---|
| Phase 1A | `contract_foundation` | Persisted remote authority baseline | current config/bubble persistence | remote host config, executor metadata, `remote.json`, `state-cache.json` | completed baseline retained |
| Phase 1B1 | `contract_foundation` | Workspace authority contract closure | Phase 1A, current start/runtime registry contracts | additive workspace authority fields, parser/serializer compatibility, explicit clone fail-closed guard | a contract letezik, de nincs uj clone-success runtime |
| Phase 1B2 | `producer_foundation` | Canonical workspace producer closure | Phase 1B1 | bootstrap/finalize/rollback producer seam worktree-mode evidence-del, clone tovabbra is blocked | producer seam stabil, activation meg tiltott |
| Phase 1C1 | `internal_consume_alignment` | Start/tmux launch authority alignment | Phase 1B2 | fresh/resume tmux launch canonical workspace consume-ja | a tmux session/pane inditas mar nem statikus worktree fallbackra ul |
| Phase 1C2 | `internal_consume_alignment` | Runtime delivery and reviewer-context alignment | Phase 1C1 | delivery targeting, reviewer refresh/context, runtime readers canonical consume-ja | nincs critical runtime delivery/reviewer consumer statikus worktree fallbackon |
| Phase 1D | `internal_consume_alignment` | Bubble-loop consume alignment | Phase 1C2 | `pass`, `converged`, `ask-human`, `meta_review_result` canonical workspace consume-ja | bubble loop sem hasznal statikus workspace fallbackot |
| Phase 2A | `runtime_activation` | Local clone-topology activation gate | Phase 1C2-1D | clone-success local start injected/remote-capable bootstrap mellett, end-to-end canonical runtime consume-val | clone-start mar nem tud ket workspace-azonossag kozt szetszakadni |
| Phase 2B | `operator_write_enablement` | Remote create write-path exposure | Phase 2A | `bubble create --remote`, local executor persistence, `remote.json` created-pointer init | remote bubble local configkent letrehozhato, de runtime start meg nincs aktivalva |
| Phase 2C | `contract_foundation` | Remote pre-start sync hook contract closure | Phase 2B | `pairflow_sync_command` global remote config contract, parser/validator/tests | a remote start activation mar explicit config-contractrol olvashatja a hookot, de meg nem futtatja |
| Phase 2D | `runtime_activation` | Remote SSH start activation | Phase 2C | SSH clone/start orchestration, optional best-effort sync-hook consume, created->started pointer transition, state-cache init | remote bubble start tenylegesen megy stabil local modelre epitve, a sync hook pedig fail-soft operational seam marad |
| Phase 2E | `operator_read_model` | Remote status/list projection | Phase 2D | status/list read-model, cache freshness, remote runtime wording | user-facing read-model mar a remote runtimeot irja le, attach nelkul is konzisztensen |
| Phase 2F | `operator_read_model` | Remote attach consume | Phase 2E | attach wording, launcher consume, port-forward projection | az attach surface is a remote runtime modelre ul |
| Phase 3A | `mutation_routing` | Remote approval/rework routing | Phase 2F | approval/rework command routing stabil remote runtimeon | operator mutation routing mar nem local-only runtimeot feltetelez |
| Phase 3B | `cleanup_routing` | Remote commit/merge/delete cleanup alignment | Phase 3A | remote commit/merge/delete cleanup consume | cleanup is ugyanarra az authority modelre ul |
| Phase 3C | `recovery_rollout` | Recovery, docs, rollout closure | Phase 3B | diagnostics, reboot recovery guidance, docs, manual smoke evidence | failure semantics es rollout evidence lezarhato |

## Re-Simulation Check

1. `Phase 1B1 -> Phase 1B2 -> Phase 1C1 -> Phase 1C2 -> Phase 1D -> Phase 2A` sorrendben a local clone-topology activation correctness szempontbol stabil:
   - a contract kulon zarul,
   - a producer kulon zarul,
   - a critical runtime consume kulon all at,
   - es csak ezutan nyilik meg a clone-success path.
2. A korabbi `Phase 2B` tul nagy volt, mert ugyanabban a szeletben akarta kitenni a remote create write-pathot es a tenyleges SSH start activationt.
3. A write-model exposure (`bubble create --remote`) nem ugyanaz a kockazati osztaly, mint a remote runtime activation:
   - az elobbi local config/persistence surface,
   - az utobbi SSH/runtime/orchestration surface.
4. A remote write-model exposure es a remote start activation tovabbra is kulon marad; ez csokkenti a review-loop kockazatot.
5. A `pairflow_sync_command` nem marad scope-on kivul, de nem tekintheto retained prerequisite-nek sem:
   - a design doc mar emliti,
   - de a Phase 1A-ban leszallitott global config contractban ez a mező jelenleg nincs jelen.
6. Emiatt a hook egy kulon, kicsi `contract_foundation` fazist kap a remote start activation elott.
7. Kovetkezmeny:
   - `Phase 1A` elegendo retained baseline a `Phase 1B1`-tol `Phase 2B`-ig vezeto lanchoz,
   - a sync hook closure explicit `Phase 2C`,
   - es csak ezutan johet a `Phase 2D` remote start activation.

## Task Deliverability Simulation (Round 2)

1. `Phase 1B1`, `1B2`, `2B`, `2C` tovabbra is elegge szukek ahhoz, hogy kulon taskkent vallalhatok legyenek.
2. A korabbi egyben kezelt `Phase 1C` tul szeles volt:
   - egy taskba esett volna a tmux launch authority cutover,
   - a runtime delivery targeting,
   - es a reviewer-context consume.
   Ez legalabb 3 kulon success class, ezert ket taskra lett bontva: `1C1` + `1C2`.
3. A korabbi egyben kezelt `Phase 2E` tul szeles volt:
   - a `status/list` projection alapvetoen read-model problema,
   - az `attach` kulon launcher/forwarding/UX surface.
   Emiatt a read-model ket taskra bomlik: `2E` status/list es `2F` attach.
4. A korabbi egyben kezelt `Phase 3A` tul szeles volt:
   - az approval/rework routing kulon operator-mutation problema,
   - a commit/merge/delete mar shared cleanup consume es git/lifecycle mutation problema.
   Emiatt a lifecycle vegfazis `3A mutation_routing` + `3B cleanup_routing` + `3C recovery_rollout` alakra valt.
5. A jelenlegi plan mellett a megmaradt taskok egyike sem latszik olyan meretu bundle-nek, amely nyilvanvaloan ujra egy bubble-ben akarna foundationt, operator consume-ot es activationt egyszerre leszallitani.

## Task Issuance Policy

1. Egyszerre csak az aktualis kovetkezo implementacios task letezhet aktiv file-kent `plans/tasks/**` alatt.
2. A tovabbi fazisok a planben maradnak, de taskfajlkent csak akkor materializalodnak, ha az elozo fazis exit criteria-ja teljesult.
3. Superseded, le nem szallitott taskokat nem "patchelunk tovabb", hanem torlunk es uj specet adunk ki.
4. Ez a policy itt kotelezo, mert a review-loop kockazat a tulelore specifikalt downstream taskoknal magasabb, mint a kesobbi kulon taskkiadas koltsege.

## Active Task

1. `plans/tasks/remote-bubble-execution/phase1c1-start-tmux-launch-authority-alignment.md`

## Planned Next Tasks (Do Not Materialize Yet)

1. `plans/tasks/remote-bubble-execution/phase1c2-runtime-delivery-and-reviewer-context-alignment.md`
2. `plans/tasks/remote-bubble-execution/phase1d-bubble-loop-consume-alignment.md`
3. `plans/tasks/remote-bubble-execution/phase2a-local-clone-topology-activation.md`
4. `plans/tasks/remote-bubble-execution/phase2b-remote-create-write-path-enablement.md`
5. `plans/tasks/remote-bubble-execution/phase2c-remote-sync-hook-contract-foundation.md`
6. `plans/tasks/remote-bubble-execution/phase2d-remote-ssh-start-activation.md`
7. `plans/tasks/remote-bubble-execution/phase2e-remote-status-and-list-read-model.md`
8. `plans/tasks/remote-bubble-execution/phase2f-remote-attach-consume.md`
9. `plans/tasks/remote-bubble-execution/phase3a-remote-approval-and-rework-routing.md`
10. `plans/tasks/remote-bubble-execution/phase3b-remote-commit-merge-delete-cleanup.md`
11. `plans/tasks/remote-bubble-execution/phase3c-recovery-diagnostics-and-rollout.md`

## Dependencies

1. `docs/pairflow-initial-design.md`
2. `docs/remote-bubble-execution.md`
3. `docs/architecture/sandbox-compatibility-gate.md`
4. `plans/archive/tasks/remote-bubble-execution-config-and-pointer-authority-phase1a.md`
5. Current code surfaces:
   - start/runtime producer: `src/v11/application/start/**`
   - runtime session registry: `src/v11/shared/ports/runtimeSessions.ts`, `src/v11/infrastructure/executor/sessionRuntime/**`
   - tmux/runtime consume: `src/v11/infrastructure/channel/tmux/**`
   - bubble-loop consume: `src/v11/application/pass/**`, `src/v11/application/converged/**`, `src/v11/application/askHuman/**`
   - operator read-model: `src/v11/shared/status/**`, `src/v11/application/status/**`, `src/cli/index.ts`
   - cleanup consumers: `src/v11/application/delete/**`, `src/v11/application/merge/**`

## Risks and Mitigations

1. Risk: a foundation task ujra activationbe csuszik.
   Mitigation: Phase 1B1 es 1B2 explicit policyja, hogy clone-success tilos; ezt testben is rogziteni kell.
2. Risk: a producer fazis utan valaki "mar majdnem mukodik" alapon megnyitna a clone startot.
   Mitigation: Activation csak Phase 2A-ban; a plan explicit forbidden fallbackkent nevezi meg a custom-bootstrap success utvonalat.
3. Risk: a tmux/runtime alignmentet tech debtnek tekintik es kihagyjak.
   Mitigation: Phase 2A prerequisite-je Phase 1C1-1D; activation nelkul nincs remote feature.
4. Risk: az operator read-model ujra tul koran mozog.
   Mitigation: kulon `operator_read_model` kind, Phase 2D utan.
5. Risk: tul sok jovo-task keletkezik egyszerre.
   Mitigation: csak egy aktiv task lehet a repo-ban.
6. Risk: a design doc-ban szereplo `pairflow_sync_command` implicit Phase 1A prerequisite-kent visszaszivarog a remote activation scope-ba.
   Mitigation: a plan ezt nem retained baseline-kent kezeli; kulon `Phase 2C contract_foundation` zarja le a hook config-contractot a remote start activation elott.
7. Risk: a sync hook consume/execute ugyanabba a taskba csuszik vissza a config-contracttal.
   Mitigation: `Phase 2C` csak schema/parser/test closure; a hook tenyleges best-effort futtatasa csak `Phase 2D` ownership.
8. Risk: a consume- vagy lifecycle-fazisok ujra tul szeles bubble-kent materializalodnak.
   Mitigation: a plan explicit tovabbi splitet rögzit `1C1/1C2`, `2E/2F`, `3A/3B/3C` szinten.

## Validation Strategy

1. Phase 1B1:
   - shared contract tests,
   - runtime registry roundtrip/invalid parse tests,
   - clone fail-closed start guard PREPARING elotti assertionnel.
2. Phase 1B2:
   - producer seam tests worktree-mode canonical authorityval,
   - rollback identity tests,
   - runtime session finalize/update tests,
   - de clone activation meg mindig tiltott.
3. Phase 1C1:
   - tmux launch fresh/resume canonical workspace consume tests.
4. Phase 1C2:
   - runtime delivery targeting es reviewer-context canonical consume tests.
5. Phase 1D:
   - bubble-loop authority consume tests.
6. Phase 2A:
   - end-to-end local clone-topology activation tests custom/remote-capable bootstrap mellett.
7. Phase 2B:
   - `bubble create --remote` local persistence/write-path tests.
8. Phase 2C:
   - `pairflow_sync_command` global config parser/validator tests.
9. Phase 2D:
   - remote SSH start orchestration tests injected dependencies mellett,
   - optional sync-hook invoke/skip/fail-soft tests.
10. Phase 2E:
   - `status`, `list` projection tests.
11. Phase 2F:
   - remote attach command/launcher/forwarding projection tests.
12. Phase 3A:
   - remote approval/rework routing tests.
13. Phase 3B:
   - remote commit/merge/delete cleanup contract tests.
14. Phase 3C:
   - recovery diagnostics tests,
   - legalabb egy manual remote smoke.

## Assumptions

1. Phase 1A retained baseline eleg a jelen plan foundation lancahoz, de nem szabad tobbet allitani rola, mint ami tenylegesen le lett szallitva.
2. A remote V1 tovabbra is CLI-over-SSH adapter marad.
3. A review-loop koltsege jelenleg nagyobb, mint a szigorubb, egy-taskos sequencing lassitasa.
4. A `pairflow_sync_command` jelenleg design-doc szinten letezik, de nem tekintheto leszallitott Phase 1A config-contractnak; ezt a plan kulon `Phase 2C`-ben zarja le.
