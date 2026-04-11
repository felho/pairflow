---
artifact_type: plan
artifact_id: plan_remote_bubble_execution_contract_and_phasing_v2
title: "Remote Bubble Execution Contract and Phasing Plan (V2)"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Remote Bubble Execution Contract and Phasing (V2)

## Objective

V2 sequencinggel bevezetni a remote bubble execution kepesseget ugy, hogy:
1. a remote bubble tulelje a laptop bezarasat,
2. a remote execution authorityja es consume-sorrendje explicit legyen,
3. a remote activation ne keveredjen ossze a foundation authority munkaval,
4. a bubble loop es az operatori consume csak stabil authority-producerre epuljon,
5. a cleanup es lifecycle mutation csak akkor mozogjon, amikor a shared consume-boundary mar stabil.

Ez a plan kifejezetten lecsereli a korabbi sequencing logikat ott, ahol a `start`-kozpontu fazis egyetlen taskban probalta zarni:
- a workspace authority foundationt,
- a bubble loop consume-ot,
- a user-facing/export consume-ot,
- es a kesobbi remote activation elokesziteset.

Sikernek az szamit, ha a remote bubble teljes V1 lifecycle-ja vegigvezethetore van bontva olyan sorrendben, ahol minden fazis egy dominans boundaryt zar le:
- persisted remote authority,
- authoritative workspace producer,
- bubble-loop consume,
- tmux/runtime consume,
- remote activation,
- operator read-model,
- lifecycle cleanup,
- recovery/rollout.

## Current Sequencing Diagnosis

1. A Phase 1A config + pointer/cache authority foundation tovabbra is helyes es megtarthato baseline.
2. A korabbi Phase 1B task tul sok mindent vitt egyszerre: workspace producer contractot, runtime session authorityt, prompt/status consume-ot, es reszben export surface closure-t.
3. A kodbaseben a workspace authority nem egyetlen `start` boundary, hanem fan-out consume-problema:
   - `start` producer,
   - runtime session registry,
   - actor protocol,
   - tmux delivery / pane binding,
   - status/CLI read-model,
   - delete/merge cleanup consumers.
4. Emiatt a producer-before-consumer sequencing explicit fazisokra bontasa kell; kulonben ugyanazok a P1 review findingek ujratermelodnek mas consume-surfaceken.
5. A remote activation csak azutan kapcsolhato be biztonsagosan, hogy a local authority producer es a kritikus local consume-ek mar stabilak.

## Current Status

1. Phase 1A implementation exists es a v2 baseline-lal osszhangban hasznalhato:
   - global remote host config tipusok es validatorok: `src/types/bubble.ts`, `src/config/pairflowConfig.ts`
   - bubble executor metadata validator: `src/config/bubbleConfig.ts`, `tests/config/bubbleConfig.test.ts`
   - persisted pointer/cache artifact pathok: `src/v11/shared/bubble/bubblePaths.ts`
   - `remote.json` / `state-cache.json` read-write-validate utilityk: `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts`
   - artifact/schema coverage: `tests/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.test.ts`
2. A jelenlegi code evidence alapjan a Phase 1A closure eleg eros ahhoz, hogy v2 baseline-kent megtartsuk:
   - explicit remote host config es executor metadata contract letezik,
   - `remote.json` created vs started discriminated unionkent van formalizalva,
   - `state-cache.json` kulon cache-only artifactkent van validalva,
   - pointer/cache szerepkor keverese fail-closed modon tiltott.
3. V2 szempontbol ezt nem kell ujranyitni, de nem is szabad tobbet allitani rola annal, mint amit a fenti persisted-authority evidence tenylegesen bizonyit.

## Guiding Principles

1. Business invariant: egy futó bubble-höz legfeljebb egy autoritativ workspace-azonossag tartozhat, es minden runtime consume ugyanarra az authorityra kell uljon.
2. Control model: a fresh-start bootstrap result zarja le az effective workspace cwd-t; ezt a runtime session registry, a canonical actor context, es a dedikalt status/read-model viszi tovabb a sajat retegeben.
3. Read-path rule:
   - persisted remote mode: `bubble.toml[executor]`, `remote.json`, `state-cache.json`
   - start authority producer: bootstrap result + runtime session finalize/update
   - bubble loop consume: canonical actor context
   - tmux/runtime consume: runtime session registry
   - operator consume: status/read-model projection
   - cleanup consume: explicit cleanup contract
4. Forbidden fallback:
   - bootstrap utan kozvetlen `bubblePaths.worktreePath` authority fallback,
   - remove+reclaim runtime session workaround authoritative cwd atirasara,
   - tmux/session/worktree lookupbol valo heuristikus authority-visszafejtes,
   - clone-root authority mellett hard-coded `worktree` user-facing allitas.
5. Missing-data rule:
   - ha remote bubble csak `CREATED`, akkor explicit created/not-started allapot jelenik meg;
   - ha started runtime authority hianyzik ott, ahol kotelezo, a rendszer fail-closed vagy explicit unavailable allapotot ad;
   - nincs silent fallback mas authority forrasra.
6. Phase boundary note:
   - contract/persistence closure elobb,
   - authority producer utana,
   - bubble-loop consume es runtime consume ezutan,
   - remote activation csak ezekre epitve,
   - operator read-model kesobb,
   - lifecycle cleanup es recovery a legvegen.

## Complexity / Split Rationale

1. `risk_score`: `11`
2. Axis breakdown:
   - `authority_risk`: `2`
   - `surface_spread`: `2`
   - `identity_join_risk`: `2`
   - `activation_coupling`: `2`
   - `prerequisite_risk`: `1`
   - `acceptance_multiplicity`: `2`
3. Why a plan is needed:
   - ugyanaz a workspace authority fogalom tobb consume-surface-en jelenik meg,
   - a remote activation unfinished prerequisite foundationre epul,
   - a cleanup shape shared consumer territory, nem start-local problem,
   - a user-facing consume nem zarhato helyesen a producer contract elott.
4. Split decision:
   - `persisted authority foundation`
   - `workspace authority producer`
   - `bubble-loop consume`
   - `tmux/runtime consume`
   - `remote activation`
   - `operator read-model`
   - `lifecycle cleanup`
   - `recovery/rollout`
5. Milestone-gated behavior to defer:
   - teljes resume/restart workspace parity,
   - downstream actor protocol utan kovetkezo UX polish,
   - remote recovery automation az egyszeru actionable diagnosticsen tul,
   - V2 Executor abstraction.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1A | Persisted remote authority foundation | current config/bubble persistence, reviewed remote design | global remotes config, bubble executor metadata, `remote.json`, `state-cache.json`, created-vs-started gate | remote mode persisted authorityja explicit es tesztelt, runtime activation nelkul |
| Phase 1B | Workspace authority producer | Phase 1A, current start/worktree/runtime session code | effective workspace bootstrap contract, branch authoring ownership, pre-claim + finalize/update session authority, rollback contract, clone fail-closed, self-host fail-closed | a fresh-start autoritativ workspace cwd-t allit elo kompatibilis shared contract mellett, de bubble-loop consume es user-facing read-model meg nem valt at |
| Phase 1C | Bubble-loop authority consume | Phase 1B producer outputs, actor protocol surfaces | canonical actor/workspace consume `pass`, `converged`, `ask-human`, `meta_review_result` teren | a bubble loop canonical emit/consume mar nem a statikus bubble path authorityra ul |
| Phase 1D | Tmux/runtime consume alignment | Phase 1B, runtime registry, tmux delivery code | tmux delivery, reviewer/meta-review pane binding, runtime session consume alignment | a runtime pane-delivery consume ugyanazt az authorityt fogyasztja, mint a producer contract |
| Phase 2A | Remote create/start activation | Phase 1A-1D | `bubble create --remote`, SSH clone/sync/start orchestration, optional target-level `pairflow_sync_command` pre-start hook, remote bubble startup, pointer/cache init | remote bubble create+start end-to-end megy ugy, hogy a remote activation mar stabil local authority modelre epul, es a target-level sync seam best-effort operational hook marad |
| Phase 2B | Operator read-model and attach | Phase 2A | remote `status`, `list`, `attach`, cache freshness, operator wording/diagnostics | a user ambiguity nelkul tudja olvasni es attacholni a remote bubble-t; nincs worktree-centric hazugsag clone-root authority mellett |
| Phase 3A | Lifecycle routing and cleanup | Phase 2B | remote `approve/rework/commit/merge/delete/clean`, cleanup contract consume, delete/merge alignment | a remote bubble mutation flow es cleanup a shared consumer-ekkel egyutt stabil |
| Phase 3B | Recovery, diagnostics, docs and rollout | Phase 3A | reboot/stale runtime diagnostics, recovery guidance, docs/help parity, rollout validation | failure semantics explicit, operator guidance hasznalhato, rollout acceptance lezarhato |

## Recommended Task Split

1. Completed baseline:
   - `plans/archive/tasks/remote-bubble-execution-config-and-pointer-authority-phase1a.md`
2. New sequencing tasks:
   - `plans/tasks/remote-bubble-execution-workspace-authority-producer-phase1b.md`
   - `plans/tasks/remote-bubble-execution-bubble-loop-authority-consume-phase1c.md`
   - `plans/tasks/remote-bubble-execution-tmux-runtime-authority-alignment-phase1d.md`
   - `plans/tasks/remote-bubble-execution-remote-create-start-activation-phase2a.md`
   - `plans/tasks/remote-bubble-execution-operator-read-model-and-attach-phase2b.md`
   - `plans/tasks/remote-bubble-execution-lifecycle-routing-and-cleanup-phase3a.md`
   - `plans/tasks/remote-bubble-execution-recovery-diagnostics-and-rollout-phase3b.md`

## Ownership Boundaries Per Phase

1. Phase 1A owns:
   - persisted remote authority
   - no runtime activation
   - no operator routing
2. Phase 1B owns:
   - workspace authority producer only
   - no actor protocol consume migration
   - no status/CLI consume cutover
   - no shared cleanup breaking contract
3. Phase 1C owns:
   - bubble-loop consume migration only
   - no remote SSH activation
   - no operator read-model
4. Phase 1D owns:
   - tmux/runtime pane delivery consume
   - no operator `status/list/attach`
   - no lifecycle cleanup
5. Phase 2A owns:
   - SSH clone/sync/start activation
   - optional target-level `pairflow_sync_command` pre-start sync seam
   - pointer/cache init
   - no exact-match runtime pinning vagy hard compatibility gate
   - no operator read-model polish
6. Phase 2B owns:
   - `status`, `list`, `attach`
   - cache freshness and user-facing wording
   - no lifecycle mutation routing
7. Phase 3A owns:
   - mutation routing and cleanup
   - delete/merge shared cleanup consume alignment
8. Phase 3B owns:
   - recovery and rollout closure

## Mandatory Cross-Phase Gates

1. Backward-compatible shared contract gate:
   - shared ports (`worktreeWorkspace`, runtime session record, cleanup result shape) nem torhetik el a mar letezo delete/merge/start fogyasztokat ugyanabban a foundation taskban.
2. Producer-before-consumer gate:
   - bubble-loop, tmux/runtime, status/CLI consume csak akkor mozoghat, ha a producer contract mar explicit es tesztelt.
3. Activation-after-local-authority gate:
   - remote SSH activation nem indulhat addig, amig a local authority producer es a kritikus consume-surfacek nincsenek stabilan levagva.
4. Read-model-after-activation gate:
   - operator `status/list/attach` consume csak akkor zarhato, ha a remote activation mar valodi runtimeot tud szolgaltatni.
5. Cleanup-last gate:
   - cleanup shared consumer alignment csak akkor mozoghat, amikor a producer, a consume es az activation retegek mar nem mozognak alatta.
6. Sync-hook containment gate:
   - a `pairflow_sync_command` csak target-level, pre-start, fail-soft operational seam lehet; nem valhat persisted authority artifactta, status/list diagnosztikai authorityva, vagy exact-match compatibility gate-te.

## Dependencies

1. `docs/pairflow-initial-design.md` lifecycle invariansok miatt.
2. `docs/remote-bubble-execution.md` mint bounded design source, nem onallo implementation authority.
3. `docs/architecture/sandbox-compatibility-gate.md` mint kotelezo cross-phase gate.
4. `plans/archive/tasks/remote-bubble-execution-config-and-pointer-authority-phase1a.md` mint Phase 1A baseline.
5. Current code evidence:
   - start producer: `src/v11/application/start/**`
   - runtime session registry: `src/v11/shared/ports/runtimeSessions.ts`, `src/v11/infrastructure/executor/sessionRuntime/**`
   - actor protocol: `src/v11/shared/actorProtocol/**`, `src/v11/application/pass/**`, `src/v11/application/converged/**`, `src/v11/application/askHuman/**`
   - tmux/runtime consume: `src/v11/infrastructure/channel/tmux/**`
   - status/read-model: `src/v11/shared/status/**`, `src/v11/application/status/**`, `src/cli/index.ts`
   - cleanup shared consumers: `src/v11/application/delete/**`, `src/v11/application/merge/**`

## Risks and Mitigations

1. Risk: a Phase 1B ujra mindent magaba huzna.
   Mitigation: a Phase 1B task explicit non-goalja legyen actor protocol consume, status/CLI consume, es cleanup shared consumer alignment.

2. Risk: a bubble loop consume kesobbre tolasa miatt a remote activation ideiglenesen rossz authorityra ulne.
   Mitigation: Phase 1C Phase 2A prerequisite; remote activation nem mehet producer-only allapotra.

3. Risk: a tmux/runtime consume egy kulon taskban “csak tech debtnek” tunik, es kimarad.
   Mitigation: Phase 1D explicit prerequisite Phase 2A-hoz; runtime delivery authority nelkul a remote start nem tekintheto lezartnak.

4. Risk: a cleanup contract megint tul koran torik meg.
   Mitigation: cleanup consume Phase 3A ownership marad, shared result-shape compatibility gate-tel.

5. Risk: a status/CLI wording ujra koran csuszik be foundation taskba.
   Mitigation: operator wording es read-model consume csak Phase 2B-ben zarhato.

6. Risk: a target-level Pairflow sync hook tul nagy compatibility/routing jelentoseget kapna.
   Mitigation: V2-ben ez Phase 2A operational seam only: pre-start, optional, fail-soft, no-persist.

7. Risk: a plan tul sok fazist hoz be es lassit.
   Mitigation: ez intentionalis; a fazisok kisebbek, de a review-loop kockazatot csokkentik, ami osszidoben varhatoan olcsobb.

## Validation Strategy

1. Phase 1A:
   - parser/validator/path/artifact tests
   - created-vs-started authority gating
2. Phase 1B:
   - fresh-start producer tests
   - runtime session finalize/update tests
   - rollback identity tests
   - local clone fail-closed tests
3. Phase 1C:
   - actor protocol authority consume tests
   - handoff/role/fingerprint consistency tests
4. Phase 1D:
   - tmux delivery runtime consume tests
   - pane binding consistency tests
5. Phase 2A:
   - remote create/start orchestration tests injected SSH dependencies mellett
   - optional `pairflow_sync_command` invoke/skip/fail-soft tests
   - pointer/cache init tests
6. Phase 2B:
   - `status --json`, text status, `list`, `attach` tests
   - wording/diagnostics tests clone-root authority mellett
7. Phase 3A:
   - remote mutation router tests
   - delete/merge cleanup contract tests
8. Phase 3B:
   - recovery message tests
   - docs/help parity verification
   - legalabb egy manual smoke run valos remote hosttal

## Assumptions

1. A Phase 1A foundation tovabbra is ervenyes baseline, nem kell ujranyitni.
2. A remote activation tovabbra is V1 CLI-over-SSH adapter marad.
3. A felhasznalo preferalja a kisebb, boundary-tiszta taskokat a kevesebb, de nagyobb task helyett.
