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
   - vegul a clone-success path mar sikeres lett volna ugy, hogy a tmux/runtime consume meg mindig a statikus worktree pathra ult,
   - es amikor a clone-topology tenylegesen aktivodni kezdett, kiderult, hogy a local lifecycle cleanup family (`commit` / `merge` / `delete`) meg nincs ugyanarra a topology-modelre zarva.
3. Ez pontosan az a hard-stop minta, amit a skill Complexity Risk Gate tilt:
   - uj canonical authority,
   - tobb consume-surface,
   - runtime activation ugyanabban a taskban.
4. A reset lenyege: a "clone-topology can succeed" allapot kulon activation fazisba kerul, de csak azutan, hogy a local lifecycle cleanup consume is lezart.
5. Addig minden clone-start explicit fail-closed marad.

## Control-Model Readiness Result

`READY`

Az explicit control-model dontesek most visszanyerhetok a designbol es a review-loop tapasztalatbol:
1. `business_invariant`: egy futó bubble-hoz egyszerre pontosan egy runtime-authoritative workspace tartozhat.
2. `control_model`: az autoritativ workspace letezeset es runtime hasznalatat nem a statikus bubble path, hanem a fase szerint kijelolt canonical authority donti el.
3. `read_path_rule`: activation elott a rendszer nem olvashat vagy engedelyezhet clone-root runtimeot csak attol, hogy egy producer seam mar kepes lenne ilyet eloallitani.
4. `forbidden_fallback`: custom bootstrap success, statikus `bubblePaths.worktreePath`, illetve operator-facing output nem hasznalhato rejtett runtime truthkent a korai fazisokban.
5. `missing_data_rule`: ha az adott fazisban a canonical authority vagy a consume-alignment nincs kesz, a viselkedes fail-closed marad.
6. `phase_boundary`: contract -> producer -> runtime consume -> bubble-loop consume -> local lifecycle cleanup -> activation -> operator write -> remote pre-start contract -> remote start -> read-model -> mutation routing -> remote cleanup -> recovery.

## Guiding Principles

1. Business invariant: egy futó bubble runtime viselkedese nem osztható meg ket workspace-azonossag kozott.
2. Control model: a clone-topology csak akkor valhat sikeres start kimenette, ha a canonical workspace authorityt minden critical runtime consumer ugyanonnan olvassa.
3. Read-path rule:
   - contract-foundation fazisban az uj mezok csak type/schema/persistence contractkent jelenhetnek meg,
   - producer fazisban a canonical authority eloreallithato es tarolhato, de activation meg tilos,
   - runtime consume fazisban a start/tmux/runtime reteg mar csak canonical authorityt olvashat,
   - bubble-loop consume fazisban az actor-protocol oldali muveletek is erre allnak at,
   - local lifecycle cleanup fazisban a local `commit` / `merge` / `delete` family is ugyanarra a topology-truthra zarul,
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
   - `local_cleanup_alignment`: a local lifecycle cleanup family ugyanarra a topology-modelre zarul a runtime activation elott,
   - `runtime_activation`: csak ezutan engedheto a clone-success path,
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
| `local_cleanup_alignment` | local lifecycle cleanup consume alignment | local `commit` / `merge` / `delete` topology closure a clone activation elott | remote routing, operator read-model, activation ugyanebben a taskban |
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
   - `local_cleanup_alignment`
   - `operator_write_enablement`
   - `runtime_activation`
   - `operator_read_model`
   - `mutation_routing`
   - `cleanup_routing`
   - `recovery_rollout`
5. Milestone-gated behavior to defer:
   - barmilyen successful clone-topology start a local cleanup alignment elott,
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
| Phase 1E | `local_cleanup_alignment` | Local clone lifecycle cleanup alignment | Phase 1D | local `commit` / `merge` / `delete` topology consume-ja es source-branch ownership closure clone-mode alatt | a local lifecycle family nem feltetelez worktree-topologyt, es clone bubble nem hagy inkonzisztens local branch/workspace cleanupot maga utan |
| Phase 2A | `runtime_activation` | Local clone-topology activation gate | Phase 1E | clone-success local start injected/remote-capable bootstrap mellett, end-to-end canonical runtime consume-val | clone-start mar nem tud ket workspace-azonossag kozt szetszakadni, es a bubble vegigviheto a local lifecycle familyben is |
| Phase 2B | `operator_write_enablement` | Remote create write-path exposure | Phase 2A | `bubble create --remote`, local executor persistence, `remote.json` created-pointer init | remote bubble local configkent letrehozhato, de runtime start meg nincs aktivalva |
| Phase 2C | `contract_foundation` | Remote pre-start sync hook contract closure | Phase 2B | `pairflow_sync_command` global remote config contract, parser/validator/tests | a remote start activation mar explicit config-contractrol olvashatja a hookot, de meg nem futtatja |
| Phase 2D | `runtime_activation` | Remote SSH start activation | Phase 2C | SSH clone/start orchestration, optional best-effort sync-hook consume, deterministic same-authority inner-start repo binding a remote clone es a syncelt bubble control-plane kozott, explicit remote workspace-authority consume a clone rooton, local control-plane state reconciliation, created->started pointer transition, state-cache init | remote bubble start tenylegesen megy stabil local modelre epitve; nincs `repo_path` / bubble-lookup authority mismatch, nincs implicit worktree fallback, es a local control-plane state sem marad stale `CREATED`; a sync hook pedig fail-soft operational seam marad |
| Phase 2E | `operator_read_model` | Remote status/list projection | Phase 2D | status/list read-model, cache freshness, remote runtime wording | user-facing read-model mar a remote runtimeot irja le, attach nelkul is konzisztensen |
| Phase 2F | `operator_read_model` | Remote attach consume | Phase 2E | attach wording, launcher consume, port-forward projection | az attach surface is a remote runtime modelre ul |
| Phase 3A | `mutation_routing` | Remote approval/rework routing | Phase 2F | approval/rework command routing stabil remote runtimeon | operator mutation routing mar nem local-only runtimeot feltetelez |
| Phase 3B | `cleanup_routing` | Remote commit/merge/delete cleanup routing | Phase 3A | remote command routing a mar lezart local lifecycle cleanup familyre | a remote cleanup/routing ugyanarra a topology-modelre ul, de nem nyit uj local cleanup semantics-et |
| Phase 3C | `recovery_rollout` | Recovery, docs, rollout closure | Phase 3B | diagnostics, reboot recovery guidance, docs, manual smoke evidence | failure semantics es rollout evidence lezarhato |

## Progress Update (2026-04-16)

1. `Phase 2D` implementacioja leszallt es merge-elve lett a `main` branchre.
2. A lezart bounded scope:
   - remote SSH first-start orchestration,
   - optional `pairflow_sync_command` best-effort consume,
   - deterministic same-authority inner-start repo binding a remote clone es a syncelt bubble control-plane kozott,
   - explicit remote workspace-authority consume a clone rooton,
   - local `state.json` control-plane reconciliation,
   - `remote.json(kind="created") -> remote.json(kind="started")` pointer-atmenet,
   - explicit `state-cache.json` init remote confirmation alapjan,
   - remote `--attach` explicit reject.
3. A Phase 2D task dokumentum archiválható, mert a bounded activation closure mar nem nyitott implementacios feladat.
4. A kovetkezo aktiv, meg nem leszallitott fazis a terv szerint a `Phase 2E`:
   - remote `status/list` read-model consume,
   - cache freshness/read-model wording,
   - remote runtime operator projection attach nelkul is konzisztens feluleten.
5. A tovabbi successor-owned scope valtozatlan:
   - `Phase 2F`: remote attach consume,
   - `Phase 3A`: remote approval/rework routing,
   - `Phase 3B`: remote commit/merge/delete cleanup routing,
   - `Phase 3C`: recovery/docs/rollout closure.

### Phase 2D Approval Boundary Note

1. A `Phase 2D` taskot csak akkor kell approvable bounded remote first-start activation closure-kent megitelni, ha ezt a `T1-T10` activation-focused test/contract matrix a sajat szeletan belul le tudja fedni:
   - first-start only `remote.json(kind="created")` retained pointerrol,
   - optional `pairflow_sync_command` best-effort consume-kent,
   - deterministic same-authority inner-start repo identity closure a remote clone es a syncelt `bubble.toml` kozott; nincs unresolved `repo_path` / bubble-lookup mismatch,
   - explicit remote workspace-authority consume a clone rooton, amely nem nyit uj implicit `work_mode`/worktree fallback truth-ot,
   - explicit remote runtime confirmation utan irt local `state.json` control-plane reconciliation + `remote.json(kind="started")` + `state-cache.json`,
   - canonical bubble control-artifact sync a remote clone-ba legacy `config.json` authority nelkul,
   - explicit non-recursive inner-start discriminator a remote clone-on beluli branchhez,
   - remote `--attach` explicit reject, local runtime-session/tmux surrogate authority nelkul, remote-safe public start surface-szel.
2. Ezek hianya vagy kesobbi ownershipje nem lehet `Phase 2D` blocker, mert successor-owned scope:
   - `status/list` read-model wording, cache-freshness/refresh policy vagy cache-reconciliation consume az initial cache-initen tul,
   - attach launcher, port-forward vagy UX consume,
   - explicit started-pointer consume-ra epulo remote restart/reboot recovery semantics a `Phase 2D` first-start fail-closed guardon tul,
   - approval/rework remote routing (`Phase 3A`) es commit/merge/delete remote routing (`Phase 3B`),
   - strukturalt warning/read-model surfacing a hook/version diagnostics korul.
3. Review-loop guardrail:
   - ha egy eszrevetel nem a fenti bounded remote first-start activation closure correctnesset serti, azt legfeljebb `later-hardening` vagy successor-task note szinten szabad kezelni, nem required-now `Phase 2D` blocker-kent.
   - ez a guardrail nem irja felul a canonical reviewer severity ontology evidence- es severity-policyjat.
4. Design-doc conflict marker ehhez a szelethez:
   - a `docs/remote-bubble-execution.md` itt csak retained baselinekent hasznalhato,
   - ha a design doc start/cache/recovery wordingje ellentmond a task `must-not-use`, `Required Implementation Notes`, vagy `T1-T10` contractjanak, akkor a `Phase 2D` task contractja az authority.
5. Phase ownership clarification:
   - a remote clone-beli inner start `repo_path` / bubble-lookup same-authority closure nem `Phase 2E` read-model vagy `Phase 3C` recovery problema, hanem `Phase 2D` activation prerequisite,
   - a remote clone-root workspace-authority consume nem nyithat vissza mar lezart `Phase 1B1-1E` authority alignmentet,
   - a sikeres remote first-start utani local `state.json` control-plane reconciliation nem halaszthato kesobbi read-model taskra, mert a local `bubble start` lifecycle sajat start-mode truthja mar most ebbol el.

## Re-Simulation Check

1. `Phase 1B1 -> Phase 1B2 -> Phase 1C1 -> Phase 1C2 -> Phase 1D -> Phase 1E -> Phase 2A` sorrendben a local clone-topology activation correctness szempontbol stabil:
   - a contract kulon zarul,
   - a producer kulon zarul,
   - a critical runtime consume kulon all at,
   - a local lifecycle cleanup consume kulon zarul,
   - es csak ezutan nyilik meg a clone-success path.
2. A mostani bubble review azt is bizonyitotta, hogy a cleanup consumer family nem halaszthato teljesen a remote routing vegeig:
   - a local clone activation mar onmagaban erinti a branch-ownership, commit-sync es workspace-cleanup semantics-et,
   - vagyis a `cleanup` bucketnek van egy local prerequisite closure-ja is, nem csak egy kesoi remote routing closure-ja.
3. A korabbi `Phase 2B` tul nagy volt, mert ugyanabban a szeletben akarta kitenni a remote create write-pathot es a tenyleges SSH start activationt.
4. A write-model exposure (`bubble create --remote`) nem ugyanaz a kockazati osztaly, mint a remote runtime activation:
   - az elobbi local config/persistence surface,
   - az utobbi SSH/runtime/orchestration surface.
5. A remote write-model exposure es a remote start activation tovabbra is kulon marad; ez csokkenti a review-loop kockazatot.
6. A `pairflow_sync_command` nem marad scope-on kivul, de nem tekintheto retained prerequisite-nek sem:
   - a design doc mar emliti,
   - de a Phase 1A-ban leszallitott global config contractban ez a mező jelenleg nincs jelen.
7. Emiatt a hook egy kulon, kicsi `contract_foundation` fazist kap a remote start activation elott.
8. Kovetkezmeny:
   - `Phase 1A` elegendo retained baseline a `Phase 1B1`-tol `Phase 2B`-ig vezeto lanchoz,
   - a sync hook closure explicit `Phase 2C`,
   - es csak ezutan johet a `Phase 2D` remote start activation.

## Task Deliverability Simulation (Round 2)

1. `Phase 1B1`, `1B2`, `1E`, `2B`, `2C` tovabbra is elegge szukek ahhoz, hogy kulon taskkent vallalhatok legyenek.
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
5. A korabbi `Phase 2A` tul optimista volt, mert valojaban ket consume family closurejat akarta implicit egy bubble-ben lezartnak tekinteni:
   - a start/runtime activation familyt,
   - es a local lifecycle cleanup familyt.
   Emiatt a sorrend most ugy valtozik, hogy a `Phase 1E` kulon lezarja a local cleanup consume-ot, a `Phase 2A` pedig ezutan mar tenyleg csak activation task marad.
6. A jelenlegi plan mellett a megmaradt taskok egyike sem latszik olyan meretu bundle-nek, amely nyilvanvaloan ujra egy bubble-ben akarna foundationt, operator consume-ot es activationt egyszerre leszallitani.

## Task Issuance Policy

1. Egyszerre csak az aktualis kovetkezo implementacios task letezhet aktiv file-kent `plans/tasks/**` alatt.
2. A tovabbi fazisok a planben maradnak, de taskfajlkent csak akkor materializalodnak, ha az elozo fazis exit criteria-ja teljesult.
3. Superseded, le nem szallitott taskokat nem "patchelunk tovabb", hanem torlunk es uj specet adunk ki.
4. Ez a policy itt kotelezo, mert a review-loop kockazat a tulelore specifikalt downstream taskoknal magasabb, mint a kesobbi kulon taskkiadas koltsege.

## Current Tree Progress Update (2026-04-16)

1. A `Phase 2B` retained baseline tovabbra is lezart es `main`-re merge-olve:
   - a `bubble create --remote` local write-path expose implementalt,
   - a bubble config `[executor]` metadata es a `remote.json(kind="created")` create-time pointer persistence baseline,
   - a remote runtime start tovabbra sem aktiv.
2. A `Phase 2C` is leszallt es `main`-re merge-olve:
   - a global `[remotes.<name>]` config contract mar hordozza az optional `pairflow_sync_command` mezot,
   - parser/validator/load/type closure mar baseline,
   - a hook consume/invoke ownership tovabbra is successor-only `Phase 2D`.
3. A lezart taskok archivalt allapotban mar itt vannak:
   - `plans/archive/tasks/remote-bubble-execution/phase2b-remote-create-write-path-enablement.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2c-remote-sync-hook-contract-foundation.md`
4. A `Phase 2D` is leszallt es `main`-re merge-olve:
   - remote SSH start orchestration implementalt,
   - optional `pairflow_sync_command` best-effort consume implementalt,
   - deterministic same-authority inner-start repo identity closure lezart,
   - explicit remote workspace-authority consume a clone rooton lezart,
   - local `state.json` control-plane reconciliation + `remote.json` created -> started pointer transition baseline,
   - local `state-cache.json` init baseline.
5. A `Phase 2E` is leszallt es `main`-re merge-olve:
   - remote `status/list` read-model consume implementalt,
   - explicit remote cache/source/freshness projection baseline lezart,
   - remote runtime operator wording attach nelkul is konzisztens lett,
   - UI/list/status consumer boundary alignment es fail-closed cache provenance baseline lezart.
6. A lezart taskok archivalt allapotban mar itt vannak:
   - `plans/archive/tasks/remote-bubble-execution/phase2b-remote-create-write-path-enablement.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2c-remote-sync-hook-contract-foundation.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2d-remote-ssh-start-activation.md`
   - `plans/archive/tasks/remote-bubble-execution/phase2e-remote-status-and-list-read-model.md`
7. A `Phase 2F` task dokumentacios/Feynman-refinement review-ja 2026-04-17-en lezart docs-only bubble-ben megtortent:
   - a bounded attach-consume control model egyszerubb es explicit lett,
   - a `target_files` / shared UI surface reality pontosabb lett, kulonosen az `ActionBar` CTA/hint consume miatt,
   - az approval boundary es a review-loop resistance guardrail szovege szukebb es implementacio-biztosabb lett,
   - a task kesobbi implementacios bubble-jehez szukitett, implementacio-biztos baseline keszult.
8. A `Phase 2F` implementacios bubble 2026-04-17-en lezarult es merge-re kerult:
   - remote `attach` consume mar a `Phase 2E` read-model authorityra ul,
   - launcher/forwarding projection leszallitva,
   - remote attach UX es fail-closed operator surface leszallitva,
   - a task archivalt allapotban mar itt van:
     `plans/archive/tasks/remote-bubble-execution/phase2f-remote-attach-consume.md`
9. A kovetkezo explicit implementacios fazis most mar a `Phase 3A`:
   - remote approval/rework routing,
   - operator mutation routing ugyanarra a remote runtime topology-modelre ultetve,
   - local-only runtime-feltetelezesek eltavolitasa az approval/rework consume surface-ekrol.

## Active Task

1. A `Phase 2F` mar archived baseline:
   - `plans/archive/tasks/remote-bubble-execution/phase2f-remote-attach-consume.md`
2. A kovetkezo tenyleges implementacios munka a mar materializalt `Phase 3A` taskhoz tartozik:
   - `plans/tasks/remote-bubble-execution/phase3a-remote-approval-and-rework-routing.md`
3. A `Phase 2B`, `Phase 2C`, `Phase 2D`, `Phase 2E`, es `Phase 2F` archived baseline lett.
4. Az approval/rework, cleanup, es recovery scope tovabbra is kulon successor fazisban marad, ebbol a kovetkezo aktivalasra varo szelet a `Phase 3A`.

## Successor Tasks (Do Not Materialize Yet)

1. `plans/tasks/remote-bubble-execution/phase3b-remote-commit-merge-delete-cleanup.md`
2. `plans/tasks/remote-bubble-execution/phase3c-recovery-diagnostics-and-rollout.md`

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
   - local lifecycle cleanup consume: `src/v11/application/commit/**`, `src/v11/application/merge/**`, `src/v11/application/delete/**`, `src/v11/infrastructure/workspace/**`
   - operator read-model: `src/v11/shared/status/**`, `src/v11/application/status/**`, `src/cli/index.ts`
   - remote cleanup/routing consumers: `src/v11/application/delete/**`, `src/v11/application/merge/**`

## Risks and Mitigations

1. Risk: a foundation task ujra activationbe csuszik.
   Mitigation: Phase 1B1 es 1B2 explicit policyja, hogy clone-success tilos; ezt testben is rogziteni kell.
2. Risk: a producer fazis utan valaki "mar majdnem mukodik" alapon megnyitna a clone startot.
   Mitigation: Activation csak Phase 2A-ban, es a plan explicit forbidden fallbackkent nevezi meg a custom-bootstrap success utvonalat.
3. Risk: a local lifecycle cleanup consume rejtetten megint kimaradna az activation prerequisite-jei kozul.
   Mitigation: kulon `Phase 1E local_cleanup_alignment`; activation nelkul nincs remote feature, de cleanup-closure nelkul sincs local clone success.
4. Risk: a tmux/runtime alignmentet tech debtnek tekintik es kihagyjak.
   Mitigation: Phase 2A prerequisite-je Phase 1C1-1E; activation nelkul nincs remote feature.
5. Risk: az operator read-model ujra tul koran mozog.
   Mitigation: kulon `operator_read_model` kind, Phase 2D utan.
6. Risk: tul sok jovo-task keletkezik egyszerre.
   Mitigation: csak egy aktiv task lehet a repo-ban.
7. Risk: a design doc-ban szereplo `pairflow_sync_command` implicit Phase 1A prerequisite-kent visszaszivarog a remote activation scope-ba.
   Mitigation: a plan ezt nem retained baseline-kent kezeli; kulon `Phase 2C contract_foundation` zarja le a hook config-contractot a remote start activation elott.
8. Risk: a sync hook consume/execute ugyanabba a taskba csuszik vissza a config-contracttal.
   Mitigation: `Phase 2C` csak schema/parser/test closure; a hook tenyleges best-effort futtatasa csak `Phase 2D` ownership.
9. Risk: a consume- vagy lifecycle-fazisok ujra tul szeles bubble-kent materializalodnak.
   Mitigation: a plan explicit tovabbi splitet rögzit `1C1/1C2`, `1E/2A`, `2E/2F`, `3A/3B/3C` szinten.

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
6. Phase 1E:
   - local clone lifecycle cleanup contract tests,
   - clone-mode commit / merge / delete topology and branch-ownership proofok.
7. Phase 2A:
   - end-to-end local clone-topology activation tests custom/remote-capable bootstrap mellett.
   - retained runtime-session worktree fallback kivezetese, mert az aktiv approval-gate bubble-ok mar explicit workspace authorityval futnak.
8. Phase 2B:
   - `bubble create --remote` local persistence/write-path tests.
9. Phase 2C:
   - `pairflow_sync_command` global config parser/validator tests.
10. Phase 2D:
   - remote SSH start orchestration tests injected dependencies mellett,
   - optional sync-hook invoke/skip/fail-soft tests.
11. Phase 2E:
   - `status`, `list` projection tests.
12. Phase 2F:
   - remote attach command/launcher/forwarding projection tests.
13. Phase 3A:
   - remote approval/rework routing tests.
14. Phase 3B:
   - remote commit/merge/delete cleanup routing tests a lezart local lifecycle baseline-en.
15. Phase 3C:
   - recovery diagnostics tests,
   - legalabb egy manual remote smoke.

## Assumptions

1. Phase 1A retained baseline eleg a jelen plan foundation lancahoz, de nem szabad tobbet allitani rola, mint ami tenylegesen le lett szallitva.
2. A remote V1 tovabbra is CLI-over-SSH adapter marad.
3. A review-loop koltsege jelenleg nagyobb, mint a szigorubb, egy-taskos sequencing lassitasa.
4. A `pairflow_sync_command` jelenleg design-doc szinten letezik, de nem tekintheto leszallitott Phase 1A config-contractnak; ezt a plan kulon `Phase 2C`-ben zarja le.
5. A local clone lifecycle cleanup consume nincs meg lezárva a jelenlegi Phase 1D utani baseline-ban; ezt nem szabad a kesoi remote cleanup routinggal osszemosni.
