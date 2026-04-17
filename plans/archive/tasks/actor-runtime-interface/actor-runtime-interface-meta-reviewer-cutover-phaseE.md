---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_reviewer_cutover_phaseE_v1
title: "Actor Runtime Interface Meta-Reviewer Cutover (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/state/executionContext.ts
  - src/core/runtime/metaReviewSubmitGuidance.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Reviewer Cutover (Phase E)

## L0 - Policy

### Goal

A Phase E kovetkezo szelete a `meta_reviewer` cutover legyen ugy, hogy a canonical `meta_review_result` emit ugyanazon explicit actor runtime wrapper boundaryn menjen at, mint a tobbi actor role projection, mikozben a retained `bubble meta-review` operator surface tovabbra is diagnostics/projection reteg maradjon, ne masodik canonical submit vagy authority path.

Ez a task akkor sikeres, ha:
1. a `meta_reviewer` canonical emit pathja explicit authorityval es wrapper seam-mel fut,
2. a meta-review submit current-state mixed pathja role-neutral actor-runtime boundaryra szukül,
3. a retained operator `bubble meta-review run|status|last-report|recover` subtree nem marad special-case control path,
4. a stale authority, duplicate successful submit es restart recovery meta-reviewer oldalon is fail-closed marad,
5. a scope nem dagad altalanos meta-review gate redesignna vagy teljes operator API cleanuppa.

### Context

1. A Phase D migration spine az `implementer`, majd a `reviewer` utan a `meta_reviewer` migraciot jeloli a Phase E kovetkezo actor slice-ának.
2. A Phase B contract szerint a `meta_reviewer` ugyanazon role-neutral actor runtime interface egyik projectionje; nem kulon alrendszer es nem kulon actor API.
3. A Phase C matrix szerint a meta-review result leirhato a minimalis core capability keszlettel, de a current-state operator `bubble meta-review` subtree retained adapter marad a migrationig.
4. A korabbi meta-review structured-channel task mar megerositette az explicit active ownership es structured submit iranyt, de a current actor-runtime cutover szempontjabol a canonical wrapper boundary es a role-neutral actor path most a lenyeg.
5. A current-state inventory szerint a meta-review submit meg mindig mixed path: actor output validation es state/gate mutation egy command flowban talalkozik, mikozben az operator surface kulon retained subtree-kent el.

### In Scope

1. A `meta_reviewer` canonical `meta_review_result` path explicit wrapper/cutover contractja.
2. Az explicit current-execution authority kodszintu megerositese a meta-review submit route korul.
3. A canonical actor submit path es a retained operator diagnostics surface tiszta boundaryja.
4. A stale authority, duplicate successful submit replay es restart recovery parity megorzese.
5. A touched meta-review pathokhoz kotelezo regresszios tesztek es parity evidence.
6. Minimalis dokumentacios frissites csak akkor, ha a canonical authority vagy operator-vs-actor boundary user-visible modon pontosodik.

### Out of Scope

1. Altalanos meta-review recommendation semantics redesign (`approve|rework|inconclusive` ujraertelmezese).
2. Teljes `bubble meta-review` operator command family redesign vagy generic operator API cleanup.
3. Uj actor primitive vagy uj output family bevezetese.
4. Topology-csere vagy tmux/operator observability surface eltavolitasa.
5. Reviewer vagy implementer pathok ujranyitasa a meta-reviewer convenience miatt.
6. Olyan refaktor, amely nem a `meta_reviewer` cutover parity-csomagjat szolgalja.

### Safety Defaults

1. A Phase B minimalis core contract a target; ezt a task nem nyithatja ujra.
2. A `meta_reviewer` authority explicit current-execution authority marad; implicit `cwd`, tmux pane, operator command vagy prompt allapot nem lehet canonical authority-forras.
3. A retained `bubble meta-review` operator subtree csak diagnostics/projection reteg maradhat; nem lehet canonical actor submit path vagy authority source.
4. Restart utan a regi meta-reviewer authority stale marad; csak uj execution authorityval folytathato a canonical submit.
5. Duplicate successful meta-review submit ugyanarra a current executionre bounded reject vagy no-op lehet, de nem hozhat letre masodik canonical state/gate mutationt.
6. A task implementacios contract, de nem teljes meta-review lifecycle rewrite: a meglevo gate semantics megtartasa mellett kell role-neutral actor boundaryra szukiteni a canonical submit pathot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - actor emit CLI/input contract,
   - meta-review submit invocation contract,
   - current-execution authority contract,
   - canonical submit vs retained operator diagnostics boundary,
   - duplicate submit / restart recovery parity contract.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a `meta_reviewer` Phase E helyere a teljes migration programban.
2. Binding migration input:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogzitette, hogy a `meta_reviewer` az implementer es reviewer utan kovetkezik, es hogy a retained operator status csak diagnostics/projection maradhat.
3. Binding target contract:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - Ez az authoritative role-neutral boundary.
4. Binding scenario/parity input:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - A meta-reviewer cutover kotelezo parity inputjai innen jonnek.
5. Binding current-state grounding:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez mutatja, mely meta-review path marad retained operator/runtime adapter reteg.
6. Precedence rule:
   - target boundaryhoz a Phase B authoritative,
   - rollout sorrendhez es retained operator ownershiphoz a Phase D authoritative,
   - parity coverage-hez a Phase C authoritative,
   - current code csak grounding evidence.

### Terminology Lock

1. `meta-reviewer cutover` = a Phase E azon szelete, amely a `meta_reviewer` role projectiont viszi at ugyanarra a wrapper + explicit authority boundaryra.
2. `canonical meta-review submit path` = a `pairflow agent emit --kind meta_review_result` role-neutral actor route-ja explicit current-execution authorityval.
3. `retained operator diagnostics surface` = a `bubble meta-review run|status|last-report|recover` operator subtree, amely projection/diagnostics marad, de nem actor submit path.
4. `meta-review result path` = a `meta_reviewer` actor `result` output projectionje, amely a gate route es snapshot persistence fele megy tovabb.
5. `duplicate successful submit replay` = ugyanarra a current meta-reviewer executionre ugyanazon success transition ujrajatszasa; ez bounded reject/no-op policy kell maradjon.
6. `mixed submit path` = az a current-state flow, ahol actor output validation es workflow mutation egyben tortenik retained special-case-ekkel.

### Deliverable Shape Lock

1. A kotelezo deliverable a `meta_review_result` canonical emit ut explicit wrapper + explicit authority + explicit operator-vs-actor boundary melletti kodszintu megerositese.
2. A kotelezo bizonyitas az automated parity evidence a `T1`-`T8` matrix szerint; a task nem zarhato le puszta wrapper-atnevezessel vagy docs-only rationale-lal.
3. `README.md` es `docs/pairflow-initial-design.md` csak akkor kotelezoen touched, ha a meta-reviewer canonical authority vagy az operator-vs-actor submit boundary user-visible modon pontosodik.
4. Nem kotelezo minden `target_files` elemet modositani; a lista implementation surface-budget.
5. Ha a meta-reviewer cutover user-visible semantics valtozas nelkul valosul meg, a docs diff elhagyhato, de ezt a completion summarynek explicitten allitania kell.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | meta-review runtime wrapper entry | A `meta_review_result` ugyanazon explicit wrapper seam meta-reviewer projectionje legyen, role-guarddal es explicit authority-checkkel; ne maradjon outer-dispatch special-case write path | P1 | required-now | T1, T2, T4 |
| CS2 | `src/core/bubble/metaReview.ts` | canonical submit ingestion | A canonical submit path explicit current-execution authorityval fusson, es a current-state mixed validation + mutation path szuküljön role-neutral actor boundaryra retained operator shortcut nelkul | P1 | required-now | T1, T3, T5 |
| CS3 | `src/core/bubble/metaReviewGate.ts` | gate consumption boundary | A gate a canonical meta-review snapshot/result alapjan route-oljon; a retained operator `status/last-report/recover` subtree ne lehessen masodik actor-submit authority | P1 | required-now | T2, T5, T8 |
| CS4 | `src/core/state/executionContext.ts` | meta-review execution authority | A meta-reviewer running authority-window, handoff identity es restart utani uj execution kovetelmenye explicit maradjon; a task nem lazithat a stale authority modellen | P1 | required-now | T3, T6 |
| CS5 | `src/core/runtime/metaReviewSubmitGuidance.ts` | startup/resume guidance | A meta-reviewer guidance csak a canonical actor submit utat tanitsa; retained operator commands ne legyenek actor-submit fallbackkent sugallva | P2 | required-now | T2, T8 |
| CS6 | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/cli/agentEmitCommand.test.ts` | meta-reviewer regression surface | Kotelezo tesztfedezet kell a wrapper routing, stale authority, duplicate successful submit replay, restart recovery es retained operator diagnostics boundary korul | P1 | required-now | T1-T8 |
| CS7 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing semantics | Csak akkor frissitendo, ha a canonical meta-review submit authority vagy az operator-vs-actor boundary user-visible modon pontosodik | P2 | required-now | T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review canonical execution input / authority materialization | explicit authority shape mar letezik, de a current submit path mixed retained state mutationnel egyutt el | a `meta_review_result` explicit current-execution authorityval vagy equivalent execution-scoped capabilityvel fut; ez nem operator-facing target-override API | `repo`, `bubble_id`, `handoff_id` + explicit current-execution authority (`execution_id`, `role=meta_reviewer`, `actor_id`) vagy equivalent authoritative context | `expected_role`, `expected_round`, `expected_state_fingerprint`, `emit_capability_ref`, `protocol_snapshot_ref`, `refs` | compatible szukites a canonical route javara | P1 | required-now |
| Meta-review result emit | ma actor emit + submit mutation current-stateben mixed | a `meta_review_result` tovabbra is canonical `result` projection meta-reviewer role alatt | authoritative context + meta-review payload + current protocol snapshot | `rework_target_message`, structured findings/report metadata, refs | compatible internal hardening; nincs uj output family | P1 | required-now |
| Operator diagnostics subtree | current-state operator `bubble meta-review` surface retained | retained diagnostics/projection marad, de nem actor submit path es nem authority source | read-only status/report/recovery metadata | verbose/debug projection | compatibility-preserving retained operator layer | P1 | required-now |
| Duplicate successful submit replay | bounded policy tema, current-state submit path mixed gate mutationnel | ugyanarra a meta-reviewer executionre masodik successful canonical mutation nem johet letre | execution identity, handoff identity, result scope | reject/no-op diagnostics | new enforcement/hardening a meta-reviewer slice-ban | P1 | required-now |
| Restart recovery authority | restart/recovery retained operator/executor concern | restart utan uj meta-reviewer execution authority kell; regi submit stale marad | `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | none | existing contract preservation | P1 | required-now |

Normative rules:

1. A task nem vezetheti be azt, hogy a canonical meta-review authority `bubble meta-review status`, pane output, `cwd` vagy prompt allapot alapjan legyen visszafejtve.
2. A `meta_review_result` ugyanazon role-neutral actor boundary projectionje marad; a `meta_reviewer` special-case historiaja nem emelheto vissza kulon actor API-va.
3. A retained operator diagnostics subtree nem valhat actor submit fallbackga vagy canonical gate route authority-forrassa.
4. A stale authority vagy wrong-round submit fail-closed marad.
5. A duplicate successful meta-review submit replay legfeljebb explicit reject vagy suppresszalt no-op lehet; nincs masodik canonical state/gate transition ugyanarra a current executionre.
6. A task nem nyithat ujra kulon meta-review lifecycle-special-case alrendszert a cutover convenience miatt.
7. Az actor-facing canonical `emit` surface meta-reviewer oldalon sem kovetelhet es nem fogadhat explicit operator-origin target-authority override mezoket a mai `repo`/`bubble_id`/`handoff_id`/`expected_*` feluleten tul.

### 2.5) Traceability Lock

| Source | This task must realize | Why this is binding here | Evidence |
|---|---|---|---|
| Phase D `S6_REVIEWER_META_AND_CLEANUP` meta-reviewer-resz | a `meta_reviewer` migracio kulon, bounded szeletkent valosuljon meg retained operator diagnostics mellett | a spine szerint ez a kovetkezo actor slice, es a retained operator status csak diagnostics maradhat | T1, T2, T5 |
| Phase D `Meta-review retained diagnostics surface` row | az operator status/recover subtree projection maradjon, ne actor submit authority | ez akadalyozza meg, hogy a meta-review special-case submit path visszajojjon canonical route-kent | T2, T5, T8 |
| Phase C `SC4_META_REVIEW_RESULT` | a meta-review result a minimalis actor core-val leirhato maradjon | ez a canonical `meta_review_result` projection alapja | T1, T2, T4 |
| Phase C `SC9_MISMATCHED_OR_DUPLICATE_EMIT` | a wrong role/scope es duplicate success replay bounded reject/no-op policy maradjon | ettol lesz a meta-reviewer cutover parity-gated, nem csak wrapper-atnevezes | T3, T4, T6 |
| Phase C `SC10_RESTART_RECOVERY`, `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` | restart recovery es operator observability-only semantics maradjon retained adapter | ettol marad explicit authority a canonical boundary, es a pane/operator surface nem lep be authority-forraskent | T6, T8 |
| Phase A `ACT-BEH-METAREVIEW-SUBMIT`, `ACT-ENTRY-METAREVIEW-OPS`, `ACT-RUNTIME-DELIVERY-TARGET`, `ACT-LIFECYCLE-WATCHDOG` | a current mixed submit path szukítese explicit boundaryra retained operator/runtime adapterek mellett | a grounding inventory mutatja, hol van ma mixed ownership es hol kell bounded cleanup | T1, T5, T6, T8 |

Normative rules:

1. Ha tobb implementacios ut is vedheto, azt a valtozatot kell valasztani, amelyik a `meta_review_result` actor route-jat kozelebb viszi a mar meglevo implementer/reviewer wrapper mintahoz uj abstraction layer nelkul.
2. A retained operator diagnostics subtree Phase E-ben csak akkor erinthető, ha ez kozvetlenul a canonical actor submit boundary tisztitasat szolgalja; operator UX-redesign nem kerheto.
3. A meta-reviewer cutover review csak akkor tekintheto lezartnak, ha van explicit bizonyitek arra, hogy a `bubble meta-review` operator subtree nem tud state/gate authorityt szerezni a canonical actor submit mellett.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Canonical meta-review submit path | explicit wrapper-seam es explicit authority megerositese | retained operator shortcut visszaemelese canonical actor path-va | meta-reviewer cutover hardening | P1 | required-now |
| Gate consumption | canonical snapshot/result route tisztitasa | operator `status/last-report/recover` projection authoritykent kezelese | gate semantics maradnak, ownership tisztul | P1 | required-now |
| Recovery behavior | restart recovery authority es duplicate replay szigoritas | regi authority ujrahasznalata vagy masodik successful mutation | fail-closed alapertelmezett | P1 | required-now |
| Docs | operator-facing szemantika pontositasa, ha kell | teljes meta-review operator family redesign leirasa | csak cutover-szintu doc delta | P2 | required-now |

Pure-by-default rule:

1. Ha egy helper vagy retained operator reteg csak historical special-case submit miatt maradna a canonical actor pathban, a default az egyszerusites vagy leszukites, nem uj retained elagazas hozzaadasa.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| meta-review submit explicit authority snapshot nelkul probal futni | actor emit input + state | throw | nincs implicit operator/cwd/pane authority fallback a canonical pathon | existing `ACTOR_EMIT_CONTEXT_INVALID` family | error | P1 | required-now |
| handoff/round/fingerprint nem egyezik az aktiv meta-review executionnel | execution context | throw | fail-closed submit reject | existing canonical mismatch path | error | P1 | required-now |
| operator diagnostics subtree megprobalna actor submit authorityt helyettesiteni | retained operator path + gate/read flow | throw or hard reject path | projection-only viselkedes; nincs state mutation | implementation-equivalent operator-surface-forbidden family | warn | P1 | required-now |
| duplicate successful meta-review submit ugyanarra a current executionre jon | execution identity + current route state | none | explicit reject vagy suppresszalt no-op; nincs masodik canonical mutation | existing duplicate/mismatch family vagy equivalent bounded policy code | warn | P1 | required-now |
| restart recovery utan regi authorityval jon submit | recovery + execution context | throw | friss authority snapshot szukseges | stale authority existing fail-closed path | error | P1 | required-now |
| operator status/report projection artifact hianyzik vagy stale | retained diagnostics path | fallback | diagnostics lehet hiányos, de canonical actor authority nem serul | existing meta-review diagnostics warning family | info/warn | P2 | required-now |

Normative rules:

1. A duplicate successful submit fallback csak explicit reject vagy suppresszalt no-op lehet; ez nem vezethet be uj typed actor outputot vagy uj workflow-state szemantikat.
2. A retained operator diagnostics fallback csak projection/provenance surface lehet; canonical acceptance, authority vagy route dontest nem adhat.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md` meta-reviewer sorrendje es retained diagnostics ownershipa | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB-draft.md` role-neutral core boundaryja | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` meta-review parity inputjai (`SC4`, `SC9`, `SC10`, `SC11`) | P1 | required-now |
| must-use | meglovo `actorEmitContext` + `executionContext` fail-closed authority modell | P1 | required-now |
| must-not-use | implicit operator status/pane/cwd authority fallback a canonical meta-review pathban | P1 | required-now |
| must-not-use | kulon meta-reviewer actor primitive vagy uj output family | P1 | required-now |
| must-not-use | teljes `bubble meta-review` operator command family redesign ebben a slice-ban | P1 | required-now |
| must-not-use | reviewer/implementer pathok opportunistic ujranyitasa a meta-reviewer cutover miatt | P2 | required-now |
| must-not-use | tmux/operator observability-only retained reteg authority-forrassa emelese | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | meta-review canonical emit explicit authorityval fut | aktiv `meta_reviewer` execution context letezik | `pairflow agent emit --kind meta_review_result` canonical route-on fut | a wrapper path explicit authority-snapshotot hasznal, es nem retained operator pathra epul | P1 | required-now | automated test |
| T2 | canonical actor submit es retained operator diagnostics boundary szetvalik | aktiv meta-review execution es elerheto `bubble meta-review` operator surface van | actor submit es operator `status/last-report/recover` pathok kulon futnak | az actor submit mutalja a canonical snapshotot, az operator path projection marad; nincs masodik submit authority | P1 | required-now | automated test |
| T3 | stale authority es mismatched submit fail-closed marad | execution valtott vagy wrong round/fingerprint/handoff van | regi authorityval vagy mismatched contexttel meta-review submit tortenik | a rendszer rejectel; nincs silent accept es nincs operator/projection fallback | P1 | required-now | automated test |
| T4 | meta-review result tovabbra is canonical `result` projection | aktiv meta-review step valid payload-dal | canonical submit lefut | nincs uj output family vagy meta-reviewer-specifikus actor API; a route canonical `result` projection marad | P1 | required-now | automated test |
| T5 | retained operator subtree nem route-olhat actor submit authorityval | operator `bubble meta-review status/last-report/recover` pathok elerhetok | olvasasi/projection flow vagy recovery diagnostics fut | nincs state/gate mutation actor authority nelkul; projection-only semantics marad | P1 | required-now | automated test |
| T6 | duplicate successful submit replay nem csinal masodik canonical mutationt | ugyanarra a current meta-review executionre masodik success submit jon | a masodik feldolgozas megtortenik | bounded reject vagy suppresszalt no-op jon; nincs masodik canonical success transition | P1 | required-now | automated test |
| T7 | restart recovery uj meta-review authorityt igenyel | runtime/session restart tortent | regi authorityval, majd uj authorityval meta-review submit fut | regi stale, uj authority valid | P1 | required-now | automated test |
| T8 | operator observability-only semantics delayed/missing diagnostics mellett is marad | operator status/report path stale vagy hianyos, mikozben canonical actor submit elerheto vagy mar lefutott | diagnostics es canonical path ertelmezese megtortenik | a canonical authority csak explicit actor submit/execution contextbol jon; projection hiba nem ad authorityt | P1 | required-now | automated test |
| T9 | docs csak meta-reviewer cutover-szintu szemantikat pontositanak | a canonical authority vagy operator-vs-actor boundary user-visible modon pontosodik | docs diff keszul | a dokumentacio csak a `meta_reviewer` cutover es retained diagnostics szerepet irja le, operator family redesign nelkul | P2 | required-now | doc diff |

### 6.5) Review Stability Gates

1. A review nem kerhet opportunistic operator-subtree vagy gate cleanupot olyan file-okban, amelyekre a `T1`-`T8` parity csomag nem mutat kozvetlen bizonyitas-igenyt.
2. Ha a duplicate successful submit enforcement pontos shape-je `explicit reject` vagy `suppressed no-op`, barmelyik elfogadhato, ha:
   - ugyanarra a current meta-review executionre nincs masodik successful canonical mutation,
   - a valasztott shape teszttel vedett,
   - a valasztott shape nem vezet be uj actor outputot vagy workflow-state szemantikat.
3. Ha a docs nem valtoznak, a completion summarynek explicitten allitania kell, hogy a meta-reviewer cutover nem modositott user-visible canonical authority- vagy operator-vs-actor szemantikat olyan mertekben, amely README/design diffet igenyelne.
4. A meta-reviewer cutover review csak akkor tekintheto lezartnak, ha van explicit bizonyitek arra, hogy a retained operator subtree mar csak diagnostics/projection, es nem canonical submit authority.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a duplicate successful emit enforcement implementer/reviewer/meta-reviewer kozt ugyanarra a helperre konvergal, kulon follow-up task nyithato.
2. [later-hardening] Ha a retained operator diagnostics subtree-ben tovabbi projection cleanup latszik, azt kulon operator-surface hardening taskban erdemes kezelni.
3. [later-hardening] Ha a meta-review submit guidance tovabbi historical command-shape driftet hordoz, kesobb kulon guidance-cleanup task nyithato.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Shared duplicate-success enforcement helper konvergencia | L2 | P2 | later-hardening | meta-reviewer cutover | kulon follow-up task, ha tenyleges shared helper-igeny latszik |
| H2 | Operator diagnostics subtree tovabbi projection cleanupja | L2 | P2 | later-hardening | retained operator layer | csak kulon bounded taskban, a canonical cutover utan |
| H3 | Meta-review submit guidance historical drift tovabbi tisztitasa | L2 | P2 | later-hardening | meta-reviewer cutover | kulon guidance-hardening task |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Because `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with the L1 contract rows.

## Assumptions

1. A canonical meta-review submit surface tovabbra is `pairflow agent emit --kind meta_review_result`.
2. A retained `bubble meta-review run|status|last-report|recover` subtree current-stateben megmarad operator diagnostics/projection feluletnek a cutover alatt is.
3. A reviewer cutover utan a meta-reviewer a kovetkezo bounded Phase E slice, nem egy nagyobb cleanup-csomag resze.

## Open Questions (Non-Blocking)

1. Nincs.

## Spec Lock

Task akkor `IMPLEMENTABLE`, ha a `meta_review_result` canonical actor route explicit wrapper + explicit authority boundaryn fut, a retained operator subtree projection-only marad, a `T1`-`T8` parity evidence teljesul, es nincs masodik canonical submit authority a `meta_reviewer` path mellett.
