---
artifact_type: task
artifact_id: task_actor_runtime_interface_reviewer_cutover_phaseE_v1
title: "Actor Runtime Interface Reviewer Cutover (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/core/bubble/actorEmitContext.ts
  - src/cli/commands/agent/emit.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/pass/emitPassV11.ts
  - src/v11/shared/pass/passWorkspaceContextPreparation.ts
  - src/v11/shared/converged/convergedCommandTypes.ts
  - src/v11/shared/converged/convergedCommandOrchestration.ts
  - src/v11/application/converged/emitConvergedV11.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/cli/convergedCommand.test.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/application/pass/passWorkspaceContextPreparation.test.ts
  - tests/v11/application/converged/emitConvergedV11.test.ts
  - tests/contracts/v11/pass.contract.test.ts
  - tests/contracts/v11/converged.contract.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Reviewer Cutover (Phase E)

## L0 - Policy

### Goal

A Phase E kovetkezo szelete a `reviewer` cutover legyen ugy, hogy a reviewer `fix_request`-szeru `pass` es a reviewer `convergence` is explicit actor runtime wrapper boundaryn menjen at, mikozben a reviewer gate logika tovabbra is policy-context maradjon, ne uj actor primitive vagy kulon actor API.

Ez a task akkor sikeres, ha:
1. a reviewer canonical emit pathja explicit authorityval es wrapper seam-mel fut,
2. a reviewer `pass` es `convergence` ugyanazon role-neutral boundary reviewer projectionje marad,
3. a reviewer-only gate szabalyok nem csusznak vissza actor-specifikus command vagy output primitive-be,
4. a stale authority, role mismatch, duplicate successful emit es restart recovery reviewer oldalon is fail-closed marad,
5. a scope nem nyulik bele meg a `meta_reviewer` retained diagnostics vagy altalanos adapter-cleanup szeletbe.

### Context

1. A Phase D migration spine az `implementer` utan a `reviewer` migrationt jeloli kovetkezo cutovernek.
2. A Phase B contract szerint a reviewer nem kulon actor subsystem, hanem ugyanazon actor runtime interface egy role projectionje.
3. A Phase C matrix szerint a reviewer fix-request es convergence tovabbra is `result` csaladdal leirhato; a reviewer gate policy context marad.
4. Az implementer-first pilot mar bizonyitotta a wrapper-seam, explicit authority, restart recovery es delivery-boundary alapokat, de ez nem viszi at automatikusan a reviewer policy-gate surface-t.
5. A current-state reviewer pathban a `pass` route fix-request jellegu reviewer outputot, a `converged` route pedig a convergence submit + meta-review gate inditast hordozza; ezek jelenleg reszben kulon retained seam-eket hasznalnak.

### In Scope

1. A reviewer `pass` mint canonical reviewer `result` path explicit wrapper/cutover contractja.
2. A reviewer `convergence` mint canonical reviewer `result` path explicit wrapper/cutover contractja.
3. A reviewer gate policy es role-guard explicit kodszintu megerositese ugy, hogy az tovabbra is policy layer maradjon.
4. A reviewer stale authority, role mismatch, duplicate successful emit replay es restart recovery parity megorzese.
5. A touched reviewer pathokhoz kotelezo regresszios tesztek es contract/parity evidence.
6. Minimalis docs frissites csak akkor, ha a reviewer canonical authority vagy convergence semantics user-visible modon pontosodik.

### Out of Scope

1. `meta_reviewer` cutover vagy retained meta-review diagnostics cleanup.
2. Altalanos retained adapter cleanup a revieweren tul.
3. Uj actor primitive vagy uj output family bevezetese.
4. A reviewer gate teljes policy-redesignja.
5. Topology-csere vagy tmux eltavolitasa.
6. Olyan refaktor, amely nem a reviewer cutover parity-csomagjat szolgalja.

### Safety Defaults

1. A Phase B minimalis core contract a target; ezt a task nem nyithatja ujra.
2. A reviewer outputok canonical csaladja tovabbra is `result`; sem a fix-request, sem a convergence nem valhat uj output family-va.
3. A reviewer gate policy `kernel`/policy layer marad; az actor tartalmat ad, de nem o owns a gate szemantikat.
4. A reviewer authority explicit current-execution authority marad; implicit `cwd`, pane, shell vagy prompt allapot nem lehet authority-forras.
5. Restart utan a regi reviewer authority stale marad; csak uj execution authorityval folytathato a reviewer emit.
6. Duplicate successful reviewer emit ugyanarra a current executionre bounded reject vagy no-op lehet, de nem eredmenyezhet masodik canonical success transitiont.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - actor emit CLI/input contract,
   - reviewer wrapper invocation contract,
   - reviewer convergence/policy-gate contract,
   - current-execution authority contract,
   - duplicate successful emit / restart recovery parity contract.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a reviewer Phase E helyere a teljes migration programban.
2. Binding migration input:
   - `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogzitette, hogy az implementer utan a reviewer kovetkezik, es hogy a reviewer gate policy tovabbra is policy layer marad.
3. Binding target contract:
   - `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - Ez az authoritative role-neutral boundary.
4. Binding scenario/parity input:
   - `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - A reviewer cutover kotelezo parity inputjai innen jonnek.
5. Binding current-state grounding:
   - `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez mutatja, mely reviewer guidance es retained surface marad policy/adaptor reteg.
6. Precedence rule:
   - target boundaryhoz a Phase B authoritative,
   - rollout sorrendhez es reviewer-policy ownershiphoz a Phase D authoritative,
   - parity coverage-hez a Phase C authoritative,
   - current code csak grounding evidence.

### Terminology Lock

1. `reviewer cutover` = a Phase E azon szelete, amely a reviewer role projectiont viszi at ugyanarra a wrapper + explicit authority boundaryra.
2. `reviewer result path` = a reviewer `pass` fix-request-szeru es `convergence` kimeneteinek kozos canonical boundaryja.
3. `reviewer gate policy` = a blocker/no-open-P1/no-forbidden-state szabalyok policy-kontextusa; ez nem uj actor primitive.
4. `reviewer wrapper boundary` = az a kodszintu reteg, amely reviewer `pass` es `convergence` emitet explicit authorityval a canonical boundaryra tereli.
5. `duplicate successful emit replay` = ugyanarra a current reviewer executionre ugyanazon success transition ujrajatszasa; ez bounded reject/no-op policy kell maradjon.
6. `retained reviewer guidance` = prompt/guidance surface, amely segitheti a reviewert, de nem authority-forras.

### Deliverable Shape Lock

1. A kotelezo deliverable a reviewer `pass` es reviewer `convergence` canonical emit ut explicit wrapper + explicit authority + explicit role/policy guard melletti kodszintu megerositese.
2. A kotelezo bizonyitas az automated parity evidence a `T1`-`T8` matrix szerint; a task nem zarhato le puszta wrapper-atnevezessel vagy docs-only rationale-lal.
3. `README.md` es `docs/pairflow-initial-design.md` csak akkor kotelezoen touched, ha a reviewer authority, convergence vagy retained guidance szerepe user-visible modon pontosodik.
4. Nem kotelezo minden `target_files` elemet modositani; a lista implementation surface-budget.
5. Ha a reviewer cutover user-visible semantics valtozas nelkul valosul meg, a docs diff elhagyhato, de ezt a completion summarynek explicitten allitania kell.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/actorEmitContext.ts` | canonical actor authority materialization | A reviewer emit path canonical authority-snapshotja explicit es fail-closed maradjon; a reviewer cutover ne fogadjon el implicit workspace/pane authorityt canonical route-kent | P1 | required-now | T1, T3, T6 |
| CS2 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | reviewer runtime wrapper entry | A reviewer `pass` es `convergence` ugyanazon explicit wrapper seam reviewer projectionje legyen, role-guarddal es explicit authority-checkkel | P1 | required-now | T1, T2, T4 |
| CS3 | `src/cli/commands/agent/emit.ts` | CLI / runtime authority bridge | Az actor-facing `emit` surface reviewer oldalon is current-execution-scoped maradjon; a bridge ne reopeneljen kulon reviewer target-authority override API-t | P1 | required-now | T1, T8 |
| CS4 | `src/v11/application/pass/emitPassV11.ts`, `src/v11/shared/pass/passWorkspaceContextPreparation.ts` | reviewer fix-request path | A reviewer `pass` path explicit reviewer authorityval is canonical route legyen, ne retained workspace-guess shortcut | P1 | required-now | T2, T3 |
| CS5 | `src/v11/shared/converged/convergedCommandTypes.ts`, `src/v11/shared/converged/convergedCommandOrchestration.ts`, `src/v11/application/converged/emitConvergedV11.ts` | reviewer convergence path | A reviewer `convergence` explicit reviewer authorityval es role-guarddal fusson; a policy-gate context ne valjon kulon actor primitive-ve | P1 | required-now | T2, T4, T5 |
| CS6 | `tests/cli/agentEmitCommand.test.ts`, `tests/cli/convergedCommand.test.ts`, `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/v11/application/pass/passWorkspaceContextPreparation.test.ts`, `tests/v11/application/converged/emitConvergedV11.test.ts`, `tests/contracts/v11/pass.contract.test.ts`, `tests/contracts/v11/converged.contract.test.ts`, `tests/core/runtime/restartRecovery.test.ts` | reviewer regression surface | Kotelezo tesztfedezet kell a reviewer wrapper routing, stale authority, convergence role-guard, duplicate success replay bounded behavior es restart recovery reviewer parity korul | P1 | required-now | T1-T8 |
| CS7 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing semantics | Csak akkor frissitendo, ha a reviewer authority-, convergence- vagy retained-guidance szemantika user-visible modon pontosodik | P2 | required-now | T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer canonical execution input / authority materialization | explicit authority mezok mar leteznek, de reviewer pathon retained seam-ek meg latszanak | a reviewer cutover explicit current-execution authorityval vagy equivalent execution-scoped capabilityvel fut; ez nem actor-facing target-override API | `repo`, `bubble_id`, `handoff_id` + explicit current-execution authority (`execution_id`, `role=reviewer`, `actor_id`) vagy equivalent authoritative context | `expected_role`, `expected_round`, `expected_state_fingerprint`, `emit_capability_ref`, `protocol_snapshot_ref`, `refs` | compatible szukites a canonical route javara | P1 | required-now |
| Reviewer fix-request emit | ma reviewer `pass` route mixed policy/context seam-ekkel fut | a reviewer `pass` tovabbra is canonical `result` projection reviewer role alatt | authoritative context + reviewer actor emit input + reviewer handoff/policy context | intent metadata, refs, findings | compatible internal hardening; nincs uj output family | P1 | required-now |
| Reviewer convergence emit | ma kulon `convergence` transport kind fut meta-review gate elokeszitessel | a reviewer `convergence` explicit reviewer wrapper boundaryn megy at; a convergence tovabbra is reviewer `result` projection policy gate contexttel | authoritative context, summary, reviewer state/round guard | structured P2/P3 findings, refs, rollout metadata | compatible internal hardening; nincs uj reviewer primitive | P1 | required-now |
| Reviewer gate policy ownership | blocker/no-open-P1 szabaly current-stateben reszben command-kozeli | a gate policy tovabbra is kernel/policy layer; az actor csak a reviewer output payloadot adja | reviewer authority, protocol snapshot, policy state | guidance metadata | ownership clarification, nem behavior rewrite | P1 | required-now |
| Duplicate successful reviewer emit replay | bounded policy tema, current-stateben nem mindenhol explicit reviewer-cutover contract | ugyanarra a reviewer executionre masodik successful canonical success transition nem johet letre | execution identity, handoff identity, role/output scope | reject/no-op diagnostics | new enforcement/hardening a reviewer slice-ban | P1 | required-now |

Normative rules:

1. A reviewer cutover nem vezetheti be azt, hogy a reviewer authority `cwd`-bol, tmux pane-bol vagy retained guidancebol legyen visszafejtve.
2. A reviewer `pass` fix-request es a reviewer `convergence` ugyanazon role-neutral actor boundary reviewer projectionje marad.
3. A reviewer gate policy nem valhat kulon actor primitive-ve, kulon CLI family-va vagy kulon output family-va.
4. A reviewer `convergence` path role-mismatch es stale authority eseten fail-closed marad.
5. A duplicate successful reviewer emit replay legfeljebb explicit reject vagy suppresszalt no-op lehet; nincs masodik canonical success transition ugyanarra a current reviewer executionre.
6. A task nem nyithat ujra `meta_reviewer` retained operator diagnosztikai scope-ot reviewer convenience miatt.
7. Az actor-facing canonical `emit` surface reviewer oldalon sem kovetelhet es nem fogadhat explicit reviewer target-authority override mezoket a mai `repo`/`bubble_id`/`handoff_id`/`expected_*` feluleten tul.

### 2.5) Traceability Lock

| Source | This task must realize | Why this is binding here | Evidence |
|---|---|---|---|
| Phase D `S6_REVIEWER_META_AND_CLEANUP` reviewer-resz | a reviewer migration kulon, bounded szeletkent valosuljon meg a meta-review retained diagnostics ujranyitasa nelkul | a spine szerint most a reviewer a kovetkezo szerep, de a meta-review meg kulon transitional reteg marad | T1, T2, T4 |
| Phase D `Policy Ownership Matrix` reviewer gate row | a reviewer gate policy a canonical `result` family folott `kernel` + policy layer ownership maradjon | ez akadalyozza meg, hogy a reviewer cutover actor primitive-be csusszon vissza | T4, T5 |
| Phase C `SC2_REVIEWER_FIX_REQUEST_RESULT` | a reviewer fix-request ne kulon output family legyen | ez a reviewer `pass` canonical `result` projection alapja | T2, T4 |
| Phase C `SC3_REVIEWER_CONVERGENCE_RESULT` | a reviewer convergence policy gate contexttel tovabbra is `result` family maradjon | ez a reviewer convergence wrapper/cutover alapja | T2, T5 |
| Phase C `SC6_STALE_AUTHORITY_EMIT`, `SC7_CONFLICTING_CONTEXT`, `SC9_MISMATCHED_OR_DUPLICATE_EMIT`, `SC10_RESTART_RECOVERY` | a reviewer oldalon is fail-closed stale authority, role mismatch, duplicate success replay es restart parity maradjon | ettol lesz a reviewer cutover parity-gated, nem csak wrapper-atnevezes | T3, T6, T7, T8 |

Normative rules:

1. Ha tobb implementacios ut is vedheto, azt a valtozatot kell valasztani, amelyik a reviewer `pass` + `convergence` kozos wrapper seamjet erositi uj abstraction layer vagy reviewer-specifikus side API nelkul.
2. A reviewer gate traceability minimuma explicitten bizonyitsa, hogy a blocker/no-open-P1 policy actor-tol kulon ownership marad.
3. A duplicate successful reviewer emit traceability minimuma explicitten le kell fedje a Phase C `SC9` bounded reject/no-op szemantikajat.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Canonical reviewer emit path | explicit reviewer wrapper-seam megerositese `pass` es `convergence` korul | retained command-shape drift vagy role-specifikus shortcut visszaemelese canonical route-va | reviewer cutover hardening | P1 | required-now |
| Reviewer policy/gate surface | explicit role/policy guard megerositese | policy ownership atcsusztatasa actor primitive-be | a gate policy marad policy layer | P1 | required-now |
| Recovery / duplicate handling | stale authority, role mismatch es duplicate success replay bounded hardening | implicit replay vagy regi reviewer authority ujrahasznalata | fail-closed default | P1 | required-now |
| Docs | reviewer szemantika pontositasa, ha kell | teljes Phase E rollout docs update vagy meta-review scope elorehozatala | csak reviewer-szintu doc delta | P2 | required-now |

Pure-by-default rule:

1. Ha reviewer helper vagy retained guidance csak historical shortcutkent maradna a canonical reviewer pathban, a default az egyszerusites vagy leszukites, nem uj retained reteg hozzaadasa.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| reviewer emit explicit authority snapshot nelkul probal futni | actor emit input + state | throw | nincs implicit workspace/pane authority fallback a canonical reviewer pathon | existing `ACTOR_EMIT_CONTEXT_INVALID` family | error | P1 | required-now |
| reviewer role vagy handoff/round/fingerprint mismatch van | execution context | throw | fail-closed emit reject | existing canonical mismatch path | error | P1 | required-now |
| reviewer convergence wrong role alatt indulna | reviewer authority + convergence path | throw | explicit reject; nincs implementer/meta-reviewer convergence shortcut | existing canonical mismatch path vagy equivalent role-guard code | error | P1 | required-now |
| duplicate successful reviewer emit ugyanarra a current executionre jon | execution identity + policy state | none | explicit reject vagy suppresszalt no-op; nincs masodik successful canonical transition | existing duplicate/mismatch family vagy equivalent bounded policy code | warn | P1 | required-now |
| restart recovery utan regi reviewer authorityval jon emit | recovery + execution context | throw | friss authority snapshot szukseges | stale authority existing fail-closed path | error | P1 | required-now |

Normative rules:

1. A reviewer duplicate-success fallback csak explicit reject vagy suppresszalt no-op lehet; ez nem vezethet be uj typed actor outputot vagy uj workflow-state szemantikat.
2. A retained guidance fallback csak explanatory/provenance surface lehet; nem adhat authorityt, acceptance-t vagy reviewer gate felulbiralati jogot.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` reviewer sorrendje es reviewer gate ownershipa | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` role-neutral core boundaryja | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` reviewer parity inputjai (`SC2`, `SC3`, `SC6`, `SC7`, `SC9`, `SC10`) | P1 | required-now |
| must-use | meglovo `actorEmitContext` fail-closed authority modell | P1 | required-now |
| must-not-use | uj reviewer actor primitive vagy uj output family | P1 | required-now |
| must-not-use | reviewer gate policy actor-owned command-specifikus API-vá emelese | P1 | required-now |
| must-not-use | implicit workspace/pane/guidance authority fallback | P1 | required-now |
| must-not-use | `meta_reviewer` retained diagnostics vagy special-case submit path scope becsempeszese | P1 | required-now |
| must-not-use | teljes adapter-cleanup ebben a sliceban | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | reviewer canonical emit explicit authorityval fut | aktiv reviewer execution context letezik | `pairflow agent emit --kind pass` vagy `--kind convergence` canonical route-on fut | a reviewer wrapper path explicit authority-snapshotot hasznal, es nem implicit workspace/pane authorityra epul | P1 | required-now | automated test |
| T2 | reviewer pass es convergence ugyanazon wrapper modellen marad | aktiv reviewer handoff es reviewer role | reviewer fix-request path es reviewer convergence path is lefut | a ket path ugyanazon explicit reviewer wrapper/authority boundaryra epul | P1 | required-now | automated test |
| T3 | stale authority es conflicting context fail-closed marad reviewer oldalon | execution valtott vagy passive runtime jelek ellentmondanak az explicit reviewer authoritynak | regi authorityval vagy conflicting passive contexttel emit tortenik | a rendszer rejectel; nincs silent accept es nincs passziv runtime authority-fallback | P1 | required-now | automated test |
| T4 | reviewer fix-request tovabbra is canonical `result` projection | aktiv reviewer step blocker/fix-request tartalommal | reviewer `pass` emit fut | nincs uj output family vagy reviewer-specifikus command primitive; a route canonical reviewer `result` projectionkent marad | P1 | required-now | automated test |
| T5 | reviewer convergence tovabbra is canonical `result` projection policy gate contexttel | aktiv reviewer step convergence feltetelekkel | reviewer `convergence` emit fut | a route explicit reviewer authorityval megy, es a gate policy nem valik kulon actor primitive-ve | P1 | required-now | automated test |
| T6 | role mismatch rejectel reviewer cutovernel | nem-reviewer authority vagy rossz active agent van | reviewer wrapper path futna | explicit reject/throw tortenik; nincs cross-role shortcut | P1 | required-now | automated test |
| T7 | duplicate successful reviewer emit replay nem csinal masodik success transitiont | ugyanarra a current reviewer executionre masodik success emit jon | a masodik feldolgozas megtortenik | bounded reject vagy suppresszalt no-op jon; nincs masodik canonical success transition | P1 | required-now | automated test |
| T8 | restart recovery uj reviewer authorityt igenyel | runtime/session restart tortent | regi authorityval, majd uj authorityval reviewer emit fut | regi stale, uj authority valid | P1 | required-now | automated test |
| T9 | docs csak reviewer-szintu semantics valtozast irnak le | reviewer canonical authority vagy convergence semantics user-visible modon pontosodik | docs diff keszul | a dokumentacio csak reviewer-szintu valtozast ir le, meta-review scope elorehozatala nelkul | P2 | required-now | doc diff |

### 6.5) Review Stability Gates

1. A review nem kerhet opportunistic cleanupot olyan retained reviewer vagy convergence file-okban, amelyekre a `T1`-`T8` parity csomag nem mutat kozvetlen bizonyitas-igenyt.
2. Ha a duplicate successful reviewer emit enforcement pontos shape-je `explicit reject` vagy `suppressed no-op`, barmelyik elfogadhato, ha:
   - ugyanarra a current reviewer executionre nincs masodik successful canonical transition,
   - a valasztott shape teszttel vedett,
   - a valasztott shape nem vezet be uj actor outputot vagy workflow-state szemantikat.
3. Ha a docs nem valtoznak, a completion summarynek explicitten allitania kell, hogy a reviewer cutover nem modositott user-visible reviewer authority- vagy convergence szemantikat olyan mertekben, amely README/design diffet igenyelne.
4. A reviewer gate review csak akkor tekintheto lezartnak, ha van explicit bizonyitek arra, hogy a gate policy ownership nem csuszott at az actor boundaryba.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a reviewer wrapper stabilizalasa kozben kozos pass/convergence helper-ek latszanak, azok kulon follow-upban konszolidalhatok a `meta_reviewer` szelet elott vagy utan.
2. [later-hardening] Ha a duplicate successful emit replay shape reviewer es implementer kozt ugyanarra a helperre konvergal, kesobb kulon dedikalt hardening task nyithato.
3. [later-hardening] Ha a retained reviewer guidance tul sok historical command-shape nyomot hordoz, kesobb kulon guidance-cleanup task nyithato.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Reviewer guidance historical command-selection drift tovabbi tisztitasa | L2 | P2 | later-hardening | reviewer cutover | kulon follow-up task, ha a canonical wrapper path mar stabil |
| H2 | Reviewer es implementer duplicate-success enforcement helper konvergencia | L2 | P2 | later-hardening | reviewer cutover | csak akkor nyitando, ha tenyleges shared helper-igeny latszik |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Because `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with the L1 contract rows.
