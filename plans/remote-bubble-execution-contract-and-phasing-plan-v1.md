---
artifact_type: plan
artifact_id: plan_remote_bubble_execution_contract_and_phasing_v1
title: "Remote Bubble Execution Contract and Phasing Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Remote Bubble Execution Contract and Phasing

## Objective

V1 kereteken belul bevezetni a remote bubble execution kepesseget ugy, hogy:
1. a bubble futasa tulelje a laptop bezarasat,
2. a remote bubble contract explicit legyen (`CREATED` vs `STARTED`, pointer vs cache, clone-per-bubble topology),
3. a remote lifecycle commandok deterministicusan route-oljanak SSH-n keresztul,
4. a local checkout boundary tiszta maradjon, es a remote adapter ne irjon bele implicit modon a user laptop checkoutjaba,
5. a megoldas V2-fele kinyithato legyen, de ne kenyszeritsen most Executor- vagy kernel-extraction munkat.

Sikernek az szamit, ha a remote bubble a create -> start -> status/list/attach -> approve/rework/commit/merge/clean alap lifecycle-t vegigviszi, mikozben a state/cache/routing contract es a failure semantics explicit, tesztelheto es taskokra bonthato marad.

## Current Codebase Check (2026-04-11)

1. A global `~/.pairflow/config.toml` parser jelenleg top-level key/value only; TOML sectionoket nem fogad el, igy `[remotes.<name>]` support ma nincs.
2. A bubble config es a start flow local/worktree alapfeltezesekre epul; a live start/runtime surface ma `worktreePath` + local `tmux` session topologiat var.
3. A jelenlegi bubble lifecycle commandok (`create`, `start`, `status`, `list`, `attach`, `merge`, `delete`) nem ismernek remote pointer/cache authorityt vagy SSH transport seamet.
4. A workspace/runtime infrastrukura ma worktree-centrikus; a remote design ezzel szemben flat clone-per-bubble topologiat ker.
5. Jelenleg nincs targetenkenti Pairflow sync/update hook; ha a remote hoston mas install/update mechanizmus kell, azt a kodbase nem tudja explicit start-time seamkent kezelni.
6. Emiatt ez a scope nem kezelheto egyetlen delivery taskkent: elobb contract/foundation szeletek kellenek, aztan a remote activation.

## Decision Baseline

1. A remote execution V1-ben CLI-over-SSH adapter marad; nem vezetunk be most formalis Executor interface-et.
2. A remote a feature futasa alatt operational source of truth; a laptop pointert es cache-t tart.
3. A remote topology clone-per-bubble: nincs shared remote repo, nincs remote worktree linking.
4. A `remote.json` pointer-only artifact; a `state-cache.json` az egyetlen local cache authority.
5. A remote bubble lifecycle explicit ket alakkal dolgozik:
   - `CREATED remote bubble`: pointer letezik, de remote start meg nem tortent meg
   - `STARTED remote bubble`: remote clone/session/cache contract aktiv
6. A remote merge flow nem modositja automatikusan a laptop lokal checkoutjat; legfeljebb explicit `git pull origin <baseBranch>` hintet ad.
7. A failure/recovery szemantika ebben a milestone-ban manual recoveryre epul; nincs op_id, nincs resume token.
8. A V2 extraction seam-eket mar most tisztan kell tartani, hogy a mostani adapter ne egjen bele vegleges boundarykent.
9. A remote Pairflow verzioelteres V1-ben best-effort operacios kerdes, nem hard compatibility gate: uj remote `start` elott lehet target-specifikus sync hookot futtatni, de a mar futó bubble runtime-jat nem kell a laptop aktualis buildjehez kotni.
10. A remote feature minden fazisa kotelezoen megfelel a [sandbox compatibility gate](/Users/felho/dev/pairflow/docs/architecture/sandbox-compatibility-gate.md) policy-nak; a cel nem a mostani sandboxing, hanem a kesobbi sandbox/runtime wrapper irany nyitva tartasa.

## Complexity / Split Rationale

1. `risk_score`: `11`
2. Axis breakdown:
   - `authority_risk`: `2`
   - `surface_spread`: `2`
   - `identity_join_risk`: `2`
   - `activation_coupling`: `2`
   - `prerequisite_risk`: `1`
   - `acceptance_multiplicity`: `2`
3. Miert kell Plan:
   - uj operational authority boundary jelenik meg (`remote` vs local cache),
   - ugyanaz a fogalom egyszerre erinti a global configot, bubble configot, artifact file-okat, start routingot, read projectiont es operatori CLI surface-eket,
   - a correctness tobb identifier osszezarasan mulik (`bubbleId`, remote host alias, `instanceId`, `remoteClonePath`, `tmuxSession`),
   - a foundation es a runtime activation egyetlen taskban tul nagy blast radius lenne.
4. Split decision:
   - `foundation / authority`
   - `delivery`
   - `activation / rollout`
5. Milestone-gated vagy kifejezetten halasztott behavior:
   - V2 Executor abstraction
   - kernel extraction / service-hosted kernel
   - command-level idempotency (`op_id`, resume token)
   - background status sync / push notifications
   - multi-tenant vagy cloud executor surface

## Task Shaping Policy

1. Phase 1 task nem kapcsolhat be uj remote runtime behaviort addig, amig a parser/schema, pointer/cache contract es workspace seam nincs lezarva.
2. Egy downstream task se vigyen egyszerre uj authority seamet es tobb operatori consume cutovert.
3. A kesobbi implementation taskokat ugy kell vagtani, hogy a legtobb task `S` vagy `M` bandben maradjon; `L` meretu task csak akkor elfogadhato, ha foundation-only vagy activation-only, es nincs benne uj authority mozgas.
4. A jelen initiative-bol keszulo taskoknal a javasolt band:
   - `S`: parser/schema/pointer/read-model szelet
   - `M`: egy runtime flow vagy egy operatori surface csalad
   - `M-L`: csak a generic lifecycle router + cleanup/recovery closure tasknal elfogadhato
5. Ha egy task kozben kiderul, hogy egyszerre kell:
   - config/schema,
   - write seam,
   - routing,
   - read projection,
   - operatori payload
   szintet is mozgatni, akkor azt ujra kell bontani.
6. Minden ebbol a planbol nyilo task kotelezoen tartalmazzon kulon `Sandbox Compatibility Gate` vagy `Sandbox Compatibility Check` szekciot a [sandbox compatibility gate](/Users/felho/dev/pairflow/docs/architecture/sandbox-compatibility-gate.md) alapjan.
7. Egy ilyen task nem lehet `implementable` vagy `completed`, ha:
   - a gate szekcio hianyzik,
   - az `SG1`-`SG5` pontok nincsenek konkretan kiertékelve a task scope-jara,
   - az explicit izolacios non-goalok nincsenek kimondva, amikor sandboxing meg nincs implementalva.
8. Review soran a sandbox gate megsértese nem opcionális note: ha a task uj host-level couplingot betonoz be vagy a runtime seamet elmossa, azt findingkent kell kezelni.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Suggested Task Band | Exit Criteria |
|---|---|---|---|---|---|
| Phase 1A | Remote config + pointer/cache authority foundation | latest remote execution design decisions, existing `pairflowConfig` / `bubbleConfig` contract | `[remotes]` config schema, bubble executor metadata contract, `remote.json` / `state-cache.json` schema + `CREATED` vs `STARTED` gating | S-M | remote config es local artifact contract explicit, parser/validator szinten zart, runtime activation nelkul |
| Phase 1B | Remote workspace/start seam foundation | Phase 1A contract, current start/worktree/tmux topology | remote-aware start seam, clone-root workspace mode, bubble branch creation contract, local-vs-remote start dependency boundary | M | a start/runtime code tud clone-root workspace-ben futni ugy, hogy a local worktree behavior nem regresszal |
| Phase 2A | Remote create/start provisioning delivery | Phase 1A-1B | `bubble create --remote`, SSH/SCP transport helpers, per-bubble clone provisioning, remote start orchestration, optional target-specific Pairflow sync hook, local pointer/cache init | M | remote bubble create+start end-to-end vegigmegy deterministic local artifact update-tel es a remote Pairflow update best-effort start-time seamkent kezelheto |
| Phase 2B | Remote read/operator surfaces | Phase 2A | remote `status`, `list`, `attach`, cache refresh, pre-start gating, port-forward attach orchestration | M | a user tud remote bubble-t statusolni, listazni es attach-olni ambiguity nelkul |
| Phase 3A | Remote lifecycle command routing | Phase 2B | generic remote router `approve/rework/commit/merge/clean/delete`, merge push semantics, remote cleanup boundary | M | a mandatory close order remote bubble-re is vegigviheto, local checkout implicit modositasa nelkul |
| Phase 3B | Recovery, diagnostics, docs and rollout closure | Phase 3A | SSH/error normalization, recovery guidance, operator help/docs, regression/validation closure | S-M | failure semantics explicit, diagnostics actionable, rollout-ready acceptance matrix lezarva |

## Recommended Task Split

| Order | Artifact | Phase | Band | Why this is a separate task |
|---|---|---|---|---|
| 1 | `plans/tasks/remote-bubble-execution-config-and-pointer-authority-phase1a.md` | Phase 1A | S | Lezarja a global remotes configot, bubble executor metadata-t, `remote.json` es `state-cache.json` authorityt, valamint a `CREATED` vs `STARTED` gate-et |
| 2 | `plans/tasks/remote-bubble-execution-clone-workspace-start-foundation-phase1b.md` | Phase 1B | M | Kulon kezeli a worktree-centric start/runtime surface remote-aware atalakitasat, beleertve a clone-root workspace modot es a bubble branch authoring seamet |
| 3 | `plans/tasks/remote-bubble-execution-create-and-start-provisioning-phase2a.md` | Phase 2A | M | A config/seam foundationre epiti a tenyleges SSH clone/sync/start orchestrationt, beleertve az optional target-specifikus Pairflow sync hookot es a local pointer/cache initializationt |
| 4 | `plans/tasks/remote-bubble-execution-status-list-attach-phase2b.md` | Phase 2B | M | Kulon read-model es operatori consume task: `status`, `list`, `attach`, cache freshness, pre-start error semantics |
| 5 | `plans/tasks/remote-bubble-execution-lifecycle-routing-and-cleanup-phase3a.md` | Phase 3A | M-L | A generic remote command routingot, merge boundaryt es cleanup semantics-et egyutt zarja le, de mar stabil foundationre epit |
| 6 | `plans/tasks/remote-bubble-execution-recovery-docs-and-rollout-validation-phase3b.md` | Phase 3B | S-M | A manual recovery matrixet, SSH/error normalizationt, help/docs parityt es rollout validationt kulon, activation utani closure taskkent viszi |

## Proposed Ownership Boundaries Per Task

1. Phase 1A ownership:
   - global config parser/validator
   - bubble remote metadata schema
   - local pointer/cache artifact readers/writers
   - no SSH orchestration, no runtime activation
2. Phase 1B ownership:
   - start/runtime dependency seam
   - workspace mode / clone-root support
   - bubble branch creation contract
   - no remote transport, no list/status surface
3. Phase 2A ownership:
   - SSH/SCP helper layer
   - remote create/start orchestration
   - optional target-level Pairflow sync hook pre-start seam
   - initial local pointer/cache write
   - no hard compatibility gate es no running-bubble auto-update
   - no read projection consume beyond start result
4. Phase 2B ownership:
   - `status`, `list`, `attach`
   - cache refresh and created/not-started projection
   - no approve/merge/cleanup mutation routing
5. Phase 3A ownership:
   - generic remote command router
   - merge/push/hint semantics
   - remote cleanup/delete boundary
6. Phase 3B ownership:
   - failure/error classification
   - recovery guidance
   - operator help/docs + validation closure

## Mandatory Cross-Task Gate

1. Reference policy: [docs/architecture/sandbox-compatibility-gate.md](/Users/felho/dev/pairflow/docs/architecture/sandbox-compatibility-gate.md)
2. Ez a gate minden remote execution taskra kotelezo ebben a planben, beleertve a docs-only vagy foundation taskokat is, ha azok runtime boundaryt vagy persisted remote contractot formalizalnak.
3. A gate minimum oroklendo pontjai:
   - `SG1 Runtime Boundary Preservation`
   - `SG2 Host Path Non-Authority`
   - `SG3 Host-Tool Decoupling`
   - `SG4 Wrapper-Ready Execution`
   - `SG5 Explicit Non-Goals for Isolation`
4. Task authoring szabaly:
   - a task frontmatter/status nem eleg;
   - kulon gate szekcio kell;
   - a gate-ertekelesnek task-scope specifikusnak kell lennie, nem eleg egy altalanos “future compatible” allitas.
5. Phase exit feltetel:
   - phase artifact akkor tekintheto lezartnak, ha az adott fazis taskjai a sandbox gate-et explicitten atviszik es nem vezetnek be visszafordithatatlan host-path / host-tool couplingot.

## Dependencies

1. `docs/pairflow-initial-design.md` lifecycle/state invariansok miatt.
2. `docs/v2/pairflow-v2-architecture-plan-joint.md` csak north-star referenciakent; nem immediate implementation scope.
3. `docs/architecture/sandbox-compatibility-gate.md` mint kotelezo cross-task gate policy.
4. A remote execution design artifact jelenlegi, review-olt valtozata (ideation bubble design source).
5. Jelenlegi `src/config/pairflowConfig.ts` es `src/config/bubbleConfig.ts` parser/schema contract.
6. Jelenlegi `start/status/list/attach/merge/delete` CLI es v11 application surface.

## Risks and Mitigations

1. Risk: a global config parser section-support nelkul marad, es a remote host config ad-hoc special case-kent csuszik be.
   Mitigation: Phase 1A explicit schema + parser task, nincs Phase 2 delivery elotte.

2. Risk: a remote design worktree-centric start surface-re foltozodik ra, es a clone-root workspace csak implicit hack marad.
   Mitigation: Phase 1B kulon foundation task; a remote-aware start seamet kulon acceptance kriteriumok zarjak le.

3. Risk: pointer/cache drift ujra megjelenik `status` / `list` / `attach` consume kozott.
   Mitigation: egyetlen cache authority (`state-cache.json`), pointer-only `remote.json`, explicit created-vs-started gating.

4. Risk: a remote Pairflow update tul eros compatibility policyva no, es folosleges operatori blokkot vagy runtime churnt okoz.
   Mitigation: V1-ben a sync hook start-time, target-specifikus, best-effort seam marad; nincs bubble-szintu runtime pinning es nincs kotelezo exact-match gate.

5. Risk: a lifecycle remote router tul koran belekeveri a merge/local checkout policyt.
   Mitigation: Phase 3A explicit non-goal, hogy local checkoutot automatikusan modositson.

6. Risk: SSH drop es partial side effect review-loopot okoz.
   Mitigation: ebben a scope-ban manual recovery + explicit diagnostics; nincs premature op_id/idempotency vallalas.

7. Risk: a taskok tul nagyra nonek es osszefolynak.
   Mitigation: band-policy (`S/M/M-L`) es fazis-hatarok; authority-moving es activation feladat nem mehet ugyanabba a taskba.

## Validation Strategy

1. Phase 1A:
   - config parse/validate tests `[remotes]` es bubble executor metadata teren
   - `remote.json` / `state-cache.json` schema + read/write tests
   - `CREATED` vs `STARTED` state gating contract tests
   - sandbox gate check: parser/schema contract nem egethet be host-path-only authorityt
2. Phase 1B:
   - start/runtime seam tests clone-root workspace modra
   - bubble branch creation contract tests
   - local worktree regresszio tesztek valtozatlan local behaviorra
   - sandbox gate check: start/attach/cleanup fogalmak runtime seamkent maradnak
3. Phase 2A:
   - orchestration tests SSH/SCP helper invocationsra
   - optional `pairflow_sync_command` hook invoke/skip/fail-soft coverage
   - create/start local artifact update tests
   - dependency-injected remote command tests a full network E2E helyett
   - sandbox gate check: a remote start orchestration wrapper-ready marad
4. Phase 2B:
   - `status --json`, `list`, `attach` parity tests
   - cache freshness es pre-start error path tests
   - sandbox gate check: attach semantics nem szukul canonical `tmux attach` jelentesevre
5. Phase 3A:
   - remote `approve/rework/commit/merge/clean/delete` routing tests
   - merge boundary tests: remote push igen, local auto-pull nem
   - sandbox gate check: generic router nem szorja szet a raw host couplingot
6. Phase 3B:
   - error normalization/recovery message tests
   - docs/help parity verification
   - legalabb egy manual smoke run valos remote hosttal a CI-s injected coverage mellett
   - sandbox gate check: docs es diagnostics explicitten jelzik a jelenlegi non-goal izolacios hatart

## Assumptions

1. Ehhez a milestone-hoz nem kell kulon PRD; a Plan -> Task lanc eleg.
2. A design szandekosan V1-compatible es V2-directed; nem cel a V2 Executor abstraction elore implementalasa.
3. A remote prereq setup (ssh, tmux, auth, git access) tovabbra is operator responsibility.
4. A kesobbi implementation taskoknal a transport layer dependency-injected lesz, hogy tesztelheto maradjon valos remote host nelkul is.
