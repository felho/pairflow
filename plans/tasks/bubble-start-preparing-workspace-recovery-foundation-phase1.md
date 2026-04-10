---
artifact_type: task
artifact_id: task_bubble_start_preparing_workspace_recovery_foundation_phase1_v1
title: "Bubble Start PREPARING_WORKSPACE Recovery Foundation (Phase 1)"
status: superseded
phase: phase1
superseded_reason: "Bubble review and implementation evidence showed that the original Phase 1 foundation scope still mixed four separate contract axes: canonical schema/invariants, PREPARING admission routing, failure-policy persistence, and RUNNING commit-gate reason propagation. Continuing as one task produced repeated high-severity review findings after multiple rounds, so the scope is superseded by a smaller Phase 1A-1D task chain."
superseded_by:
  - plans/tasks/bubble-start-startup-recovery-schema-and-invariants-phase1a.md
  - plans/tasks/bubble-start-preparing-routing-and-admission-phase1b.md
  - plans/tasks/bubble-start-startup-failure-policy-persistence-phase1c.md
  - plans/tasks/bubble-start-running-commit-gate-and-reason-propagation-phase1d.md
target_files:
  - src/types/bubble.ts
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/application/start/startCommandCleanup.ts
  - src/v11/shared/start/startStateMutation.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start PREPARING_WORKSPACE Recovery Foundation (Phase 1)

## Current Codebase Check (2026-04-10)

1. A checked-out tree-ben a `start` flow jelenleg lokalis kiserleti valtozasokat tartalmaz a `src/v11/application/start/**` es a kapcsolodo tesztek alatt.
2. A beszelgetes review-koreiben a scope mar nem egyszeru bugfixnek bizonyult, hanem implicit distributed transaction recovery-protokollnak:
   - `state.json`
   - runtime session registry
   - tmux session
   - worktree/branch lifecycle
3. Ez a task a kovetkezo implementacios kor foundation specje. A mostani lokalis patch learning baseline, nem delivery target.
4. A 2026-04-10-i bubble review alapjan ez a task mar nem tarthato egyben: a review loop ujra es ujra kulon contract-problemakat talalt a retry-safe descriptor shape, a rollback vegallapot, a cleanup persistence es a commit-gate reason propagation korul.

## Superseded Status

Ez a task mar nem aktiv implementation slice.

Miert lett superseded:
1. a canonical `startup_recovery` schema/invariant scope kulon lezarast igenyel;
2. a `PREPARING_WORKSPACE` start routing es admission gate kulon reviewable boundary;
3. a `rollback|retry|preserve_for_recovery` persistence semantics kulon failure-policy task;
4. a `RUNNING` commit gate es canonical reason-code propagation kulon acceptance class.

Az aktiv utod-taskok:
1. `plans/tasks/bubble-start-startup-recovery-schema-and-invariants-phase1a.md`
2. `plans/tasks/bubble-start-preparing-routing-and-admission-phase1b.md`
3. `plans/tasks/bubble-start-startup-failure-policy-persistence-phase1c.md`
4. `plans/tasks/bubble-start-running-commit-gate-and-reason-propagation-phase1d.md`

## L0 - Policy

### Goal

Lezarni a `PREPARING_WORKSPACE` startup/recovery szerzodest ugy, hogy a kovetkezo implementacios kor mar explicit resource-invariant es failure-policy mellett dolgozzon.

Ez a task akkor sikeres, ha:
1. a `CREATED`, `PREPARING_WORKSPACE` es `RUNNING` allapotokra explicit resource-ownership tabla letezik,
2. a canonical `state.json` snapshot explicit `startup_recovery` blokkal mondja ki, melyik resource-rol mit tudunk es mit nem,
3. a startup commit pont egyertelmuen megnevezi, mikor irhato ki legitim modon a `RUNNING`,
4. minden startup failure osztalyhoz ki van mondva, hogy `rollback`, `retry`, vagy `preserve-for-recovery`,
5. a teardown es recovery policy explicit descriptor- es ownership-szabalyokra epul, nem inferred side effectekre,
6. a `PREPARING_WORKSPACE` nem generic `resume`, hanem kulon recovery contract alapu path, Phase 2A/2B/3 delivery elfedes nelkul.

### In Scope

1. A bubble-start startup eroforras-szerzodes formalizalasa:
   - state snapshot
   - runtime session registry
   - tmux session
   - worktree/branch
2. A `PREPARING_WORKSPACE` canonical invariansainak rogzítese.
3. Annak kimondata, hogy a `startup_recovery` descriptor a canonical `state.json` resze, nem kulso optional artifact.
4. Az explicit startup commit pont, valamint a `rollback|retry|preserve-for-recovery` policy-vocabulary meghatarozasa.
5. A `resolveStartBubbleMode(...)`, ownership-vocabulary, cleanup decision es state-mutation seam-ek Phase 1 contractja.
6. Foundation-only acceptance matrix a routing- es state-boundarykhoz.

### Out of Scope

1. Uj operator command surface.
2. Uj top-level lifecycle state, ha a szerzodes `PREPARING_WORKSPACE` alatt is zarhato.
3. UI/TUI surface redesign.
4. Tmux launch attribution delivery, signal interruption cleanup es blind-teardown elleni runtime hardening implementacioja (Phase 2A).
5. Live tmux reuse / stale reclaim / reconcile alignment deliveryje (Phase 2B).
6. Operator/status wording es incident diagnostics hardening (Phase 3).
7. Meta-review vagy watchdog altalanos recovery scope tovabbi bovítese a startup contracton tul.

### Safety Defaults

1. Fresh start nem irhat tartos `RUNNING` allapotot addig, amig a startup commit pont nincs expliciten definialva es sikeresen teljesitve.
2. A `startup_recovery` blokk a canonical authority; nyers side effect (`tmux exists`, `registry exists`, `worktree exists`) onmagaban nem truth source.
3. Teardown nem alapulhat pusztan inferred resource-allapoton.
4. Ha ownership elveszett vagy nem bizonyithato, a flow fail-closed / preserve-for-recovery maradjon.
5. `PREPARING_WORKSPACE` alatt sem generic resume, sem vak cleanup nem megengedett explicit recovery contract nelkul.
6. A task nem merge-li implicitten a mostani lokalis patch szemantikat; uj contractot rogzit.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - lifecycle/status semantics (`PREPARING_WORKSPACE` jelentese)
   - internal start API contract
   - runtime session ownership contract
   - startup failure policy contract
   - lifecycle mutation / startup commit contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `activation_coupling`: `2`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `2`
6. `risk_score`: `9`
7. `single-task allowed`: `no`
8. Required split:
   - `foundation/refactor`
   - `startup interruption safety delivery`
   - `preparing-state recovery delivery`
   - `operator/recovery-surface hardening`
9. Authority/source-of-truth note:
   - canonical source: persisted `startup_recovery` contract a `state.json` lifecycle snapshotban
   - forbidden secondary sources: tmux existence alone, registry entry alone, worktree existence alone, test-stub-only semantics

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | startup recovery state shape | `BubbleStateSnapshot -> typed startup_recovery block or explicit N/A decision` | lifecycle state schema | A `PREPARING_WORKSPACE` resource contract explicitten tipizalt: melyik resource milyen authority-statusszal ismert, es mi a recovery policy | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/start/startCommandApi.ts` | start contract surface | `startBubble(input, dependencies) -> StartBubbleResult` | start API boundary | A start API explicit vocabularyt hasznal a commit pont, failure policy es recovery routing tovabbitasara | P1 | required-now | T3 |
| CS3 | `src/v11/application/start/startCommandOrchestration.ts` | start mode resolution | `resolveStartBubbleMode(input) -> StartBubbleMode` | state routing boundary | `PREPARING_WORKSPACE` csak explicit descriptor alapjan routolhato `recover_preparing` modba; descriptor hianyaban vagy stale allapotban fail-closed marad, generic resume nelkul | P1 | required-now | T3, T4 |
| CS4 | `src/v11/application/start/startCommandSession.ts` | runtime ownership vocabulary | `claimRuntimeSessionOwnership(input) -> RuntimeSessionOwnership` | start ownership boundary | A claim eredmenye explicitten megkulonbozteti a local ownershipot, az observed live runtimeot es a nem-bizonyithato ownershipet, Phase 2B reuse/reclaim delivery allitas nelkul | P1 | required-now | T4, T7 |
| CS5 | `src/v11/application/start/startCommandFlows.ts` | startup commit protocol | `runFreshStartFlow(...) -> StartFlowResolution`, `runRecoverPreparingStartFlow(...) -> StartFlowResolution` | start orchestration | A fresh es preparing-recovery flow ugyanarra az explicit startup commit modellre epul; a kozos return contract kimondja, mikor commit-ready a `RUNNING`, es mikor kell `retry` vagy `preserve-for-recovery` | P1 | required-now | T5, T6 |
| CS6 | `src/v11/application/start/startCommandCleanup.ts` | startup failure policy selection | `cleanupFailedStart(input) -> Promise<void>` | cleanup boundary | A cleanup boundary explicit policy-bol (`rollback|retry|preserve_for_recovery`) dolgozik; Phase 2A rollback deliveryje kulon marad | P1 | required-now | T7 |
| CS7 | `src/v11/shared/start/startStateMutation.ts` | lifecycle mutation seam | `executeStartPreparingMutation`, `executeStartRunningMutation`, `executeStartFailedCleanupMutation` | lifecycle persistence seam | A mutation layer tukrozi, hogy mi committed `PREPARING_WORKSPACE` alatt, mikor clear-elheto a `startup_recovery`, es mi a fail-closed vegallapot | P1 | required-now | T2, T5, T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Startup resource contract | implicit, code-pathokbol kovetkeztetett | explicit `startup_recovery` descriptor a canonical state-ben | lifecycle state, attempt identity, descriptor stage, runtime ownership status, worktree bootstrap status, tmux status, next-start policy | diagnostic timestamps, reason codes, provenance notes | internal contract change, explicit migration note required | P1 | required-now |
| Start mode resolution input | current state stringbol dont | full loaded state / recovery descriptor alapjan dont | lifecycle state, `startup_recovery` presence/status, commit-point readiness | diagnostic metadata | internal contract hardening | P1 | required-now |
| Startup failure policy | implicit catch-path viselkedes | explicit policy enum es selector | `rollback`, `retry`, `preserve_for_recovery`, ownership confidence, failing stage, `retryReasonCode` | optional diagnostics | internal contract hardening | P1 | required-now |
| Runtime session ownership result | claimed vs not-claimed | attributed ownership vocabulary | `claimed`, `observedLiveRuntime`, `ownershipAmbiguous`, `tmuxSessionName` | provenance/attempt metadata | internal contract hardening | P1 | required-now |
| Archival-only `startup_recovery` shape | nincs minimum forma kimondva | cleared-by-default, optional minimal archival marker | ha retained: `archived=true`, `archivedFromAttemptId` | `archivedAt`, terminal `reasonCode` | internal contract hardening | P1 | required-now |

Migration note for legacy snapshots without `startup_recovery`:

1. Legacy `CREATED` snapshot `startup_recovery` blokk nelkul ugy kezelendo, mint explicit "no active startup recovery contract"; a start routing `fresh` marad.
2. Legacy `RUNNING` snapshot `startup_recovery` blokk nelkul kompatibilis a cleared-by-default modellel; a resume routing nem szintetizalhat vissza recovery contractot pusztan side effectekbol.
3. Legacy `PREPARING_WORKSPACE` snapshot `startup_recovery` blokk nelkul nem migralhato automatikusan retry-safe contractta; a start/restart routing fail-closed modon `START_PREPARING_CONTRACT_MISSING` / `preserve-for-recovery` eredmenyre kell fusson.
4. Az elso olyan state-mutation, amely legacy snapshotot ujrair, mar a Phase 1 canonical shape-et kell perzisztalja: vagy explicit active descriptor, vagy cleared/archival-only alak.
5. A migration soran tilos inferred registry/tmux/worktree allapotbol uj `startup_recovery` blokkot visszatolteni.

Normative startup invariant table:

| State | `startup_recovery` block | Registry | Tmux | Worktree/Branch | Resume Eligibility | Notes |
|---|---|---|---|---|---|---|
| `CREATED` | forbidden | owned entry forbidden; stale residue may exist but is non-authoritative | owned session forbidden; stale residue may exist but is non-authoritative | absent vagy meg nem claimed | `fresh` only | nincs committed startup ownership; nyers residue nem valtoztat allapotjelentest |
| `PREPARING_WORKSPACE` | required | csak descriptorban rogzitett authority-statusszal jelenhet meg; descriptoron kivuli stale residue lehet, de nem authoritative | csak descriptorban rogzitett authority-statusszal jelenhet meg; descriptoron kivuli stale residue lehet, de nem authoritative | bootstrap stage szerint lehet absent, partial vagy ready | `recover_preparing` only | partial startup resource csak explicit descriptorral ervenyes |
| `RUNNING` | cleared by default; archival-only csak minimal marker shape-ben | required authoritative live ownership | required authoritative live session | required ready ownership | `resume` | `RUNNING` snapshot alatt nincs aktiv startup recovery boundary |

Explicit startup commit point:

1. `PREPARING_WORKSPACE`-ba lepni azt commitolja, hogy a current attempt recovery descriptorral dolgozik; ez nem jelent legitim `RUNNING` ownershipot.
2. A `RUNNING` commit pont egyetlen logical transition, amely csak akkor hajthato vegre, ha a `RUNNING`-hoz required resource-ok leteznek es authority-szinten bizonyitottak.
3. Ugyanez a transition clear-eli a `startup_recovery` blokkot, vagy legfeljebb minimal archival-only marker shape-et hagyhat meg; `RUNNING` nem maradhat aktiv startup recovery descriptor mellett.
4. Ha a rendszer nem tudja egyszerre bizonyitani a resource-readiness-t es az authority-t, `RUNNING` nem perzisztalhato: a bubble `PREPARING_WORKSPACE`-ban marad vagy fail-closed modon preserve-for-recovery allapotot tart.

Required-now contract rules:

1. `PREPARING_WORKSPACE` jelentese nem kovetkeztetheto pusztan side effectekbol; explicit contract kotelezo.
2. A startup commit pontot egyertelmuen meg kell nevezni:
   - mi van committed allapotban `PREPARING_WORKSPACE` alatt,
   - mi kell ahhoz, hogy `RUNNING` legitimen perzisztalhato legyen,
   - hogyan clear-elodik a `startup_recovery` blokk.
3. A runtime ownership vocabulary es a failure-policy selector kozos terminologyt kell hasznaljon.
4. `RUNNING`-ra atlepett bubble nem maradhat explicit startup recovery alatt.
5. `retry` csak akkor engedheto meg, ha a descriptor explicit `nextStartPolicy=retry` allapotot, `descriptorStage`-et, `ownershipConfidence`-et es `retryReasonCode`-ot rogzit, es nincs authority-conflict vagy stale descriptor jelzes; ellenkezo esetben `preserve-for-recovery` a default.
6. `stale descriptor` alatt azt kell erteni, hogy a persisted `startup_recovery` blokk olyan stage-et, ownership-bizonyossagot vagy attempt-azonositot hordoz, amely mar nem feleltetheto meg a jelenlegi start invocationnak; ez kulon fail-closed trigger.
7. Az archival-only alak nem tartalmazhat aktiv routing-mezot (`nextStartPolicy`, live ownership claim vagy bootstrap stage authority) es nem befolyasolhatja a kovetkezo start mode resolutiont.
8. Phase 1 csak contractot, seam-eket es acceptance boundaryket szallit; a tmux attribution delivery, signal handling, live reuse/stale reclaim es reconcile/operator semantics kesobbi fazisokhoz tartoznak.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| `state.json` | explicit `startup_recovery` descriptor persist es clear | inferred resource truth | state a canonical source, de csak explicit descriptorral | P1 | required-now |
| runtime registry | authority vocabulary es start-policy input surface meghatarozasa | registry-only ownership inference vagy Phase 2B reuse/reclaim delivery-vallalas | Phase 1 nem specifikal konkret reclaim/remove side effectet | P1 | required-now |
| tmux | contract-level authority status mezok es policy input | blind kill by expected name vagy Phase 2A delivery elorehozatala | a launch attribution delivery kulon task | P1 | required-now |
| worktree/branch | bootstrap stage explicit descriptorban | teardown state-commit nelkul | worktree nem tunhet el hamis `RUNNING` alatt | P1 | required-now |

Constraint: ha egy resource rollbackja nem bizonyithatoan lokal ownership alatt tortenne, a rendszer preserve-for-recovery modban marad.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| worktree bootstrap fail barmely shared ownership elott | workspace bootstrap | throw | `rollback` csak a current attempt altal bizonyitottan letrehozott local prep-lepesekre | `START_BOOTSTRAP_FAILED` | error | P1 | required-now |
| fresh start commit pointon authority/readiness proof megbukik | start orchestration + mutation seam | fallback | `RUNNING` nem irhato ki; active descriptor marad vagy commit-blocked preserve-for-recovery alakku lesz | `START_RUNNING_COMMIT_BLOCKED` | error | P1 | required-now |
| startup failure descriptorral, de ambigous ownership mellett | state + runtime observation | result | `preserve-for-recovery`; nincs blind teardown | `START_OWNERSHIP_AMBIGUOUS` | warn | P1 | required-now |
| restart `PREPARING_WORKSPACE` alatt stale descriptorral | start routing + persisted state | throw | `preserve-for-recovery`; explicit operator/reviewer attention szukseges, generic retry tilos | `START_PREPARING_DESCRIPTOR_STALE` | warn | P1 | required-now |
| startup failure utan lifecycle write konfliktus | state store | fallback | `preserve-for-recovery`; `RUNNING` nem perzisztalhato | `START_RECOVERY_STATE_CONFLICT` | warn | P1 | required-now |
| startup failure utan lifecycle write I/O/lock hiba | state store | fallback | `preserve-for-recovery`; recovery descriptor marad canonical truth source | `START_RECOVERY_STATE_WRITE_FAILED` | warn | P1 | required-now |
| restart `PREPARING_WORKSPACE` alatt retry-safe descriptorral | start routing | result | `retry` ut csak explicit retry metadata mellett engedelyezett inferred ownership nelkul | `START_PREPARING_RETRYABLE` | info | P1 | required-now |
| restart `PREPARING_WORKSPACE` alatt missing/unsafe descriptorral | start routing | throw | `preserve-for-recovery`; generic resume tilos | `START_PREPARING_CONTRACT_MISSING` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `docs/pairflow-initial-design.md`, explicit startup invariant table, canonical `startup_recovery` block, contract-level routing/state tests | P1 | required-now |
| must-not-use | generic `RUNNING before tmux` shortcut, blind expected-name tmux cleanup, stub-only recovery proof, registry-only or tmux-only ownership truth, Phase 2/3 delivery acceptance Phase 1-be huzasa | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | startup recovery contract typed | `PREPARING_WORKSPACE` state | schema/type layer loads | explicit `startup_recovery` shape letezik es kimondja a stage-et, ownership confidence-t es policy-t | P1 | required-now | `src/types/bubble.ts` |
| T2 | invariant table enforced in state transitions | `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` snapshots | transition helpers run | a tiltott resource/state kombinaciok rejectelhetok vagy explicit diagnosticsot adnak | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | `PREPARING_WORKSPACE` separate mode | persisted preparing snapshot | `startBubble` lefut | `recover_preparing` agra megy, nem generic resume-ra, es a start API a policy-vocabularyt tovabbitja | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T4 | ownership vocabulary split | `PREPARING_WORKSPACE` contract kulonbozo runtime megfigyelesekkel | ownership claim boundary fut | elvalik a local ownership, az observed live runtime es az ambiguous ownership, Phase 2B delivery nelkul | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T5 | fresh start commit point | fresh start sikeres | start flow lefut | `RUNNING` csak explicit startup commit utan perzisztalodik, a `startup_recovery` pedig clear-elodik | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T6 | preparing recovery commit point | retry-safe preparing state | recovery flow lefut | a preparing route ugyanazt a commit pontot hasznalja; a teszt nem kovetel live reuse/reclaim deliveryt | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T7 | failure policy selection | partial startup eroforrasok + kulonbozo ownership confidence | cleanup decision lefut | a contract explicitten `rollback`, `retry` vagy `preserve-for-recovery` kimenetet ad; blind cleanup nincs | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T8 | mutation seam mirrors commit contract | `PREPARING_WORKSPACE` es `RUNNING` transition inputok | mutation seam fut | a `startup_recovery` persist/clear semantics es a fail-closed vegallapot explicitten ervenyesul | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a descriptor nagyon zajosnak bizonyul, kulon archival/diagnostic mirror szoba johet, de a canonical authority Phase 1 dontes szerint tovabbra is a `state.json` marad.
2. [later-hardening] A Phase 2 utan erdemes lehet kulon operator runbookot irni a `PREPARING_WORKSPACE` incidentekhez.

## Phase Boundary Guardrails

1. Phase 1 kotelezo kimenete a canonical `startup_recovery` descriptor, a commit-point semantics es a policy vocabulary.
2. Phase 1 nem szallit signal handlinget, tmux partial-launch attribution deliveryt vagy konkret blind-cleanup vedelmet; ezek Phase 2A deliverable-ek.
3. Phase 1 nem szallit live session reuse-t, stale reclaimet vagy reconcile alignmentet; ezek Phase 2B deliverable-ek.
4. Phase 1 nem szallit operator/status wordinget vagy incident runbook surface-t; ez Phase 3.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Külon operator status wording `PREPARING_WORKSPACE` recoveryhez | L2 | P2 | later-hardening | current review loop | Phase 3-ban kezelni |
| H2 | Additional metrics eventek startup recovery branchinghez | L2 | P3 | later-hardening | implementation planning | csak Phase 2 utan |
| H3 | Incident runbook es manual recovery docs | L2 | P2 | later-hardening | current feedback | Phase 3 task |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. Uj `required-now` csak evidence-backed `P0/P1` lehet a masodik round utan.
4. A review fo kerdese nem az, hogy "mukodik-e mar a fix?", hanem hogy "lezartuk-e az explicit startup resource contractot?".
5. Ha a doc nem mondja ki minden failure pontra a `rollback|retry|preserve-for-recovery` dontest, nem implementalhato.
6. Ha a review Phase 2A/2B/3 delivery acceptance-et ker szamon a foundation taskon, azt scope-driftkent kell jelezni.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:
1. a `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` resource-invariant tabla explicit es ellentmondasmentes,
2. a canonical `startup_recovery` blokk helye es minimum mezokeszlete egyertelmu,
3. a startup commit pont egyertelmuen meg van nevezve,
4. a teardown es recovery policy nem inferred side effectekre epul,
5. a stale descriptor es retry-gate fail-closed contractja explicit,
6. a Phase 1 acceptance nem huzza be a Phase 2A, Phase 2B vagy Phase 3 delivery scope-jat.

Machine-readable close rule:

1. Ha a bubble kimenete teljesiti a fenti Spec Lock felteteleket, a task frontmatter `status` mezot `implementable` ertekre kell allitani.
2. `draft` status ilyen esetben mar nem megengedett, mert ellentmondana a foundation spec lezartsagi allitasanak.

## Assumptions

1. A kovetkezo implementacios kor elott a jelenlegi lokalis start/recovery patchet el fogjuk dobni.
2. A Phase 1 task megoldasa nem kovetel uj operator commandot.
3. A `PREPARING_WORKSPACE` tovabbra is megtarthato lifecycle state, ha a contract explicitte valik.
4. A `startup_recovery` blokk canonical state-mezo lehet migration note mellett; nincs kulso artifact-fuggoseg.

## Open Questions

1. Az `observedLiveRuntime` eleg egyertelmu-e Phase 1 foundation vocabularynek, vagy jobb lenne egy meg szukebb, transport-semlegesebb nev?
