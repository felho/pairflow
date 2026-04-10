---
artifact_type: migration_plan
artifact_id: plan_actor_runtime_interface_migration_spine_phaseD_v1
title: "Actor Runtime Interface Migration Spine (Phase D Plan)"
status: completed
phase: phaseD
source_task_ref: plans/tasks/actor-runtime-interface-migration-spine-phaseD.md
source_contract_ref: plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md
source_matrix_ref: plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md
source_inventory_ref: plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
normative_refs:
  - plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
  - plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md
  - plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md
informational_refs:
  - docs/pairflow-initial-design.md
  - docs/v2/pairflow-v2-architecture-plan-joint.md
baseline_note: "Phase D migration spine prepared on 2026-04-04 from the checked-in Phase A inventory, Phase B capability contract draft, Phase C scenario matrix, and the parent discovery-and-migration plan. This is a docs-only rollout artifact, not an implementation task list."
---

# Actor Runtime Interface Migration Spine (Phase D Plan)

## Executive Summary

1. A migration spine wrapper-first, parity-gated atallast rogzit: elobb a belso actor runtime boundary jelenik meg a mar stabil canonical emit surface folott, es csak utana jon az explicit delivery/ack boundary, a core freeze es a pilot cutover.
2. A Phase B boundary lean marad. A Phase D terv nem vezet be uj actor primitive-t, uj output family-t vagy uj authority-forrast; a cel a meglevo explicit execution-context + handoff + protocol snapshot + `result` / `human_input_request` mag fokozatos bevezetese.
3. A retained tmux es operator surface-ek a migration alatt is csak executor- vagy operator-owned observability/adaptor retegek maradnak. Nem valhatnak canonical authority-, delivery- vagy ack-forrassa.
4. A bounded nyitott pontok kozul a duplicate delivery suppression, a duplicate successful emit replay es az operator-visible vs kernel-visible ack shape ownershipa itt rogzul. Ezek Phase E-ben implementacios policyva fordithatok, de Phase D-ben nem nyitjak ujra a target contractot.
5. Az ajanlott pilot actor az `implementer`, utana `reviewer`, es csak ezutan `meta_reviewer`. Ez adja a legjobb parity/megfigyelhetoseg aranyt a legkisebb policy-kockazattal.

## Migration Principles

1. Rewrite avoidance: minden lepes strangler-jellegu, parity evidence-szel vedett atmenet legyen.
2. Lean boundary discipline: a Phase B minimalis core marad a target; nincs uj gate primitive, artifact publish primitive vagy topologyba egetett actor API.
3. Explicit authority discipline: az actor write authority tovabbra is explicit execution contexthez kotott, nem `cwd`, tmux, prompt, shell allapot vagy operatori megfigyeles alapjan szarmazik.
4. Topology-neutrality: a canonical actor boundary nem valik tmux-specifikussa; a retained topology legfeljebb observability-only reteg.
5. Cleanup-by-trigger: retained adapter csak akkor tarthato meg, ha a cleanup trigger olvashatoan rogzitett, es ha a retained reteg nem vallik vissza canonical control path-ta.
6. Extension-point discipline: a bounded extension pontok kijelolese nem elozheti meg a core freeze-t; csak akkor szabad explicit extension boundaryt rogzitni, amikor mar latszik, hogy egy viselkedes nem core capability es nem retained adapter-only runtime reteg.

## Ordered Migration Spine

| Step | Goal | Prerequisites | Owner Domains | Parity Evidence | Next Step Dependency | Retained Adapter / Owner | Observability-Only Topology | Cleanup Trigger |
|---|---|---|---|---|---|---|---|---|
| `S0_BASELINE` | Rogziteni a Phase 4/5 utani retained baseline-t, amelyre a migration epulhet. | Phase 4 es Phase 5 canonical actor emit, explicit authority es legacy cleanup allapota stabil. | `kernel`, `executor`, `operator` | Cross-document verification method explicit source-lockkal: (a) a parent plan `Phase Breakdown` + `Validation Strategy` tovabbra is wrapper-first spine-t es explicit trigger/ack validationt ker, (b) a Phase B draft `Minimal Core Capability Set` + `Actor Input Authority Contract` tovabbra is `receiveExecutionContext` + `readHandoff` + `readRelevantProtocolState` + `emitResult` + `requestHumanInput` magot rogzit, (c) a Phase C `SC1_IMPLEMENTER_RESULT`-tol `SC7_CONFLICTING_CONTEXT`-ig nem jelez uj actor primitive-igenyt, csak duplicate/ack policy pontositasokat `SC8_DUPLICATE_DELIVERY`-tol `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK`-ig, (d) a Phase A inventory retained runtime sorai (`ACT-RUNTIME-DELIVERY-TARGET`, `ACT-LIFECYCLE-WATCHDOG`, `ACT-ENTRY-METAREVIEW-OPS`) nem allitanak vissza legacy actor write authorityt. | `S1_WRAPPER_BOUNDARY` csak akkor indithato, ha a baseline mar nem compatibility-ellenorzes, hanem kovetkezo belso boundary input. | Retained tmux launch/pane delivery `executor`; restart/recovery operator commandok `executor`/`operator`; meta-review status/recover diagnostics `operator`; watchdog/liveness monitor `executor`. | A pane activity, watchdog es operator status tovabbra is csak runtime diagnosztika. | Akkor lephet tovabb a spine, ha egyertelmu, hogy a pilot nem Phase 4/5 compatibility-t validal, hanem a kovetkezo belso boundaryt. |
| `S1_WRAPPER_BOUNDARY` | Belso actor runtime wrapper boundary bevezetese a mar letezo canonical actor surface folott. | `S0_BASELINE`; Phase B minimalis capability set elfogadott targetkent szolgaltathato. | `kernel`, `executor` | A Phase B `Minimal Core Capability Set` + `Actor Input Authority Contract` ugyanazzal az explicit authority + handoff + protocol snapshot bemenettel leirja az `implementer`, `reviewer` es `meta_reviewer` szerepet is uj output family nelkul; ezt a Phase C `SC1_IMPLEMENTER_RESULT`, `SC2_REVIEWER_FIX_REQUEST_RESULT`, `SC3_REVIEWER_CONVERGENCE_RESULT`, `SC4_META_REVIEW_RESULT` es `SC5_HUMAN_INPUT_REQUEST` covered sorai tamasztjak ala. | `S2_DELIVERY_ACK_BOUNDARY` csak akkor vedheto, ha a wrapper mar a canonical surface folott ul, nem mellekes parhuzamos API-kent. | `pairflow agent emit` marad a canonical kulso actor surface; a belso wrapper kezdetben adapterkent ul rajta. Owner: `kernel` + `executor` integration. | A runtime launch es pane delivery erintetlen marad ebben a lepesben. | A wrapper cleanup/simplification Phase E-ben akkor lehetseges, ha legalabb egy pilot actor mar direkt ezt a boundaryt hasznalja parity drift nelkul. |
| `S2_DELIVERY_ACK_BOUNDARY` | Explicit delivery trigger es ack boundary bevezetese a retained tmux launch fole. | `S1_WRAPPER_BOUNDARY`; a durable handoff es explicit execution context mar a belso wrapper inputja. | `executor`, `kernel`, `operator` | A Phase B typed ack vocabulary (`accepted` / `rejected`, `running` / `failed_to_start`) es a Phase C `SC8_DUPLICATE_DELIVERY`, `SC10_RESTART_RECOVERY`, `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` sorai alapjan mar expliciten leirhato az ack-source szemantika, mikozben a pane-lathatosag nem authority es nem acceptance-bizonyitek. Ebben a lepesben az ack-vocabulary es a boundary-forras rogzul, es interim invariantkent mar itt is all, hogy duplicate masodik delivery nem hozhat letre masodik `accepted` / `running` executiont: addig, amig a vegso suppression-policy owner-domain lock `S4`-ben zarul le, a masodik signal csak explicit `rejected` vagy suppresszalt no-op lehet. | `S3_CORE_FREEZE` csak akkor vedheto, ha delivery- es launch-visszajelzes mar explicit boundaryn all, nem pane-derived jelbol van visszakovetkeztetve. | tmux launch/pane transport retained adapterkent marad `executor` ownership alatt; operator restart/rebind retained `executor`/`operator` path marad. | tmux es watchdog tovabbra is csak liveness/diagnostics surface. | Akkor lehet cleanupot kezdeni, ha az elso pilot actor mar explicit ack boundaryval kap delivery-visszajelzest, es a pane-visible activity nem szukseges acceptance bizonyitek. |
| `S3_CORE_FREEZE` | A minimalis core capability-k befagyasztasa az elso implementacios fazis alapjanak. | `S2_DELIVERY_ACK_BOUNDARY`; a Phase B core elegsegesnek bizonyul a pilot elokesziteshez. | `kernel`, `actor`, `executor` | A Phase B `Minimal Core Capability Set`, `Actor Input Authority Contract` es az `Execution Context` kotelezo mezoi (`started_at`, `deadline_at`, `attempt`) tovabbra is a Phase C covered core-use-case-ekkel egyutt bizonyitjak a targetet: `SC1_IMPLEMENTER_RESULT`, `SC2_REVIEWER_FIX_REQUEST_RESULT`, `SC3_REVIEWER_CONVERGENCE_RESULT`, `SC5_HUMAN_INPUT_REQUEST`, `SC6_STALE_AUTHORITY_EMIT`, `SC7_CONFLICTING_CONTEXT`. Ezek egyutt mutatjak, hogy uj primitive vagy implicit runtime authority nem kell a core freeze-hez. | `S4_BOUNDARY_SPLIT_AND_POLICY` csak akkor zarhato vedhetoen, ha a befagyasztott core melle mar csak nem-core policy/guidance/diagnostics marad. | Reviewer gate guidance retained policy layer; meta-review operator status retained operator layer. Ezek nem lepnek be a core-ba. | A retained runtime/operator topology megmaradhat, de nem modositja a core capability listat. | A core freeze akkor tekintheto stabilnak, ha az elso pilot nem igenyel uj output family-t vagy uj authority mezot. |
| `S4_BOUNDARY_SPLIT_AND_POLICY` | Actor-boundary, executor-boundary es bounded open policy ownership explicit szetvalasztasa, beleertve a bounded extension pontok kijeloleset. | `S3_CORE_FREEZE`; az explicit ack boundary es a minimalis core mar letezo decision baseline. | `kernel`, `executor`, `operator`, `actor` | A Phase C `Bounded Open Questions For Phase D` itt zarulnak le konkret owner-domainre, explicit row-szintu nyomvonallal: `SC8_DUPLICATE_DELIVERY` vegso suppression-policyja `executor`+`kernel`, `SC9_MISMATCHED_OR_DUPLICATE_EMIT` duplicate successful emit replay-je `kernel`, `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` operator-visible ack shape-je pedig a Phase B canonical typed ack vocabularyra (`accepted` / `rejected`, `running` / `failed_to_start`) epulo `kernel`-owned szemantika + `executor`/`operator` projection. A stale/mismatched authority tovabbra is `SC6` + `SC7` szerint fail-closed marad. | `S5_PILOT_IMPLEMENTER_FIRST` csak akkor alacsony kockazatu, ha a duplicate/ack/policy ownership mar nem "kesobb kitalalando" allapot. | Delivery trigger, launch, rebind, retry retained `executor`; workflow state acceptance es current-execution write validation `kernel`; actor csak a target core-t hasznalja; operator csak olvas/projektal. | Operator-visible ack lehet gazdagabb debug vagy provenance-projekcio, de nem vezethet be uj acceptance-, rejection- vagy state-transition szemantikat; a canonical ack-source a kernel/executor boundary marad. | A retained ownership egyszerusitheto, ha a policy owner domain-ek mar kodosithatok Phase E-ben explicit interface menten. |
| `S5_PILOT_IMPLEMENTER_FIRST` | Egy alacsony kockazatu, magas parity-megfigyelhetosegu pilot actor migracioja. | `S4_BOUNDARY_SPLIT_AND_POLICY`; a duplicate/ack ownership mar dontesi szinten rogzitett. | `actor`, `kernel`, `executor` | A Phase C `SC1_IMPLEMENTER_RESULT`, `SC5_HUMAN_INPUT_REQUEST`, `SC6_STALE_AUTHORITY_EMIT`, `SC7_CONFLICTING_CONTEXT`, valamint a pilot exithez szukseges `SC8_DUPLICATE_DELIVERY` es `SC10_RESTART_RECOVERY` egyutt adjak azt a parity-csomagot, amely implementerre mar reviewer-only gate vagy meta-review retained kulonut nelkul vedheto. A `SC7` bevonasa kulon bizonyitja, hogy retained tmux/prompt/pane jel nem valhat authority-forrassa a pilot alatt sem. | `S6_REVIEWER_META_AND_CLEANUP` csak akkor indithato, ha az implementer pilot mar bizonyitja a friss deliveryt, human-input keresest, stale authority rejectet, conflicting-context fail-closed viselkedest, restart utani uj executiont es duplicate delivery suppressziot. | Retained reviewer policy gatek `kernel`/policy layerben maradnak; retained meta-review diagnostics `operator`; implementerhez csak a szukseges runtime adapter marad. | tmux launch retained maradhat, de csak observability es fallback recovery surface-kent. | A pilot utan akkor lehet tovabblepni, ha az implementer parity evidence lefedi: friss delivery, human-input kereses, stale authority reject, conflicting-context fail-closed, restart utan uj execution, duplicate delivery suppresszio. |
| `S6_REVIEWER_META_AND_CLEANUP` | Reviewer, majd meta-reviewer migracio, utana adapter-cleanup es rollout a tobbi actorra. | `S5_PILOT_IMPLEMENTER_FIRST`; implementer pilot stabil es parity-gated. | `actor`, `kernel`, `executor`, `operator` | Reviewer oldalon a Phase C `SC2` es `SC3` igazolja, hogy fix-request/convergence tovabbra is `result` family marad policy gate contexttel; meta-review oldalon `SC4` igazolja, hogy a retained operator status csak diagnostics/projection marad, nem actor submit path. | Nincs tovabbi migration step ugyanebben a spine-ban; ez a sor a Phase E cleanup es rollout backlogba nyit at, miutan a retained adapterek mar csak summary/projection vagy diagnostics szerepet tartanak meg. | Retained tmux es operator status csak addig marad, amig legalabb egy actor meg ezeken a mixed recovery pathokon fugg. | A topology tovabbra is megmaradhat observability-only retegkent, de mar nem feltetele a canonical workflow tovabblepesnek. | Akkor torolheto vagy erosen egyszerusitheto a retained adapterhalmaz, ha (a) az `implementer`, `reviewer` es `meta_reviewer` ugyanazt az explicit wrapper + delivery/ack + core freeze boundaryt hasznalja, (b) a retained operator surface-ek csak summary/projection vagy diagnostics szerepet tartanak meg, es (c) nincs actor-specifikus recovery vagy special-case submit path a canonical approval/submit flow mellett. |

## Policy Ownership Matrix

| Decision Area | Canonical Owner | Supporting Owner | Why this owner is bounded correctly | Earliest Step That Must Lock It |
|---|---|---|---|---|
| Duplicate delivery suppression ugyanarra a handoffra/executionre | `executor` a delivery trigger retegben | `kernel` a canonical accept/reject/no-op semanticsra | A duplicate signal eloszor delivery/runtime problema, de workflow allapotot csak a kernel ertelmezhet. Igy nincs uj actor primitive, es nincs pane-derived authority. Az ack boundary-forras mar `S2`-ben stabil, de a suppression-policy vegso owner-domain lockja itt valik teljesen explicitte. | `S4_BOUNDARY_SPLIT_AND_POLICY` |
| Duplicate successful emit replay ugyanarra a current executionre | `kernel` | `executor` csak transport/provenance seged | A successful emit elfogadasa es idempotency-je workflow/domain kerdes; az actor es az executor nem donthet uj transitionrol. | `S4_BOUNDARY_SPLIT_AND_POLICY` |
| Operator-visible vs kernel-visible ack shape | `kernel` a canonical typed ack vocabularyra | `executor`/`operator` a projekcio es debug megjelenitesre | Az operator surface lehet reszletesebb, de nem hozhat uj szemantikat. Az `accepted` / `running` / `rejected` / `failed_to_start` marad a canonical alap. | `S2_DELIVERY_ACK_BOUNDARY` |
| Reviewer gate policy a canonical `result` family folott | `kernel` + policy layer | `actor` csak tartalmat ad | A Phase C matrix szerint nem kell uj reviewer primitive; a gate szabaly policy-kontextus marad. | `S3_CORE_FREEZE` |
| Meta-review retained diagnostics surface | `operator` | `kernel` a canonical result acceptance-re | A meta-reviewer ugyanazon role-neutral boundary egyik projectionje; az operator status csak diagnosis. | `S6_REVIEWER_META_AND_CLEANUP`, meg mielott a meta-review retained operator status egyeduli recovery summary surface-bol opcionális projectionne valik |

## Extension-Point Rationale

1. A parent plan Workstream 4 kulon emliti a bounded extension pontok kijeloleset, de ezt Phase D-ben csak a `S4_BOUNDARY_SPLIT_AND_POLICY` lepeshez kotozzuk.
2. Ennek oka, hogy extension boundaryt csak a `S3_CORE_FREEZE` utan lehet vedhetoen kijelolni: addig nem latszik eleg tisztan, hogy egy viselkedes valoban nem core capability, hanem policy/guidance vagy operatori kiegeszites.
3. Ezert a retained guidance, diagnostics es operator-facing surface-ek Phase D elejen meg nem extension pontkent, hanem retained adapter- vagy policy-projekciokent szerepelnek.
4. Az extension-point kijeloles itt nem uj primitive-t vagy plugin-layert jelent, hanem azt a migration-dontest, hogy mely nem-core viselkedesek maradhatnak bounded kiterjeszteskent Phase E implementacioban is a canonical core sertese nelkul.

## Retained Adapter Ownership and Cleanup

| Retained Adapter | Owner | Why It Stays During Migration | Cleanup Trigger | Non-Negotiable Guardrail |
|---|---|---|---|---|
| tmux launch + pane delivery | `executor` | A Phase D docs-only terv nem csereli le a runtime launch topologyt; a retained transport lehetoseget ad wrapper-first atallasra. | Az explicit delivery/ack boundary legalabb egy pilot actoron canonical bizonyitekforrassa valik. | A pane capture nem lehet acceptance, authority vagy ack-forras. |
| restart / rebind / recovery operator commandok | `executor` + `operator` | Mixed runtime idoszakban kell operatori helyreallitas. | Az uj execution-context alapu recovery ugyanazon canonical boundaryn zajlik, es nem igenyel kulon actor-specifikus helyreallitast. | `resume` / `restart` nem irhat at authority mezo-ket. |
| meta-review status / recover diagnostics | `operator` | A meta-reviewer migration a sor vegen jon; addig kell operatori lathatosag. | A meta-reviewer is ugyanazon role-neutral runtime pathot hasznalja, es a retained operator status mar csak summary/projection; cleanup akkor vedheto, ha a canonical meta-review submit path mar nem igenyel kulon retained operator recovery route-ot. | Nincs retained actor submit vagy kulon lifecycle authority. |
| reviewer gate guidance | `kernel` policy | A Phase A inventory ezt `adapt` jellegu retekkent mutatja: a gate-szabaly policy marad, de nem actor primitive. | Az `S6_REVIEWER_META_AND_CLEANUP` reviewer-reszenek exit kriteriuma, hogy a fix-request es convergence ugyanazon canonical `result` boundaryn fusson retained command-selection guidance nelkul; ettol a ponttol a reviewer guidance mar kulon is levalaszthato a canonical pathrol, akkor is, ha a meta-reviewer retained diagnostics meg atmenetileg megmarad. A meta-reviewer migration nem elofeltetele a reviewer guidance cleanupnak; csak a kozos retained-adapter cleanup ugyanabban az `S6` lepesben folytatodik tovabb. | A guidance nem lehet authority-forras vagy kulon output family. |
| startup / resume guidance | `actor` extension surface | A Phase A inventory a startup promptokat es a resume guidanceot actor-facing extension/guidance surface-kent mutatja: canonical emit usage-t es friss authority lookupot tanitanak, de nem runtime ownershipet. Az operator csak kivaltja ezeket start/resume soran, nem o birtokolja a surface-et. | Amikor minden actor ugyanazt a wrapper + explicit ack boundaryt hasznalja, a guidance csak a canonical utat tanitja, es mar nem hordoz retained topology-specifikus tanacsot vagy command-selection driftet. | A prompt/guidance nem helyettesitheti az explicit execution contextet. |
| watchdog / liveness monitor | `executor` | A Phase A inventory szerint a watchdog runtime-liveness reteg, nem actor capability es nem workflow authority. | Akkor egyszerusitheto, ha az explicit delivery/ack boundary es az uj execution-context recovery elegendo a timeout/liveness diagnosisra. | `started_at` / `deadline_at` authority nem mozgathato runtime activity timestamp alapjan. |

## Pilot Recommendation

### Primary Pilot: `implementer`

1. A Phase C matrix szerint az `implementer` use case a legtisztabban fedett a lean boundaryval: `result` es `human_input_request` eleg, reviewer-only gate vagy meta-review retained operator kivetel nelkul.
2. Az `implementer` adja a legjobb parity evidence mintat az explicit delivery/ack boundaryhoz, mert egyszerre validalhato a friss atadas, a stale authority reject, a duplicate delivery suppresszio es a recovery utani uj execution.
3. Az `implementer` pilot nem igenyel uj output family-t vagy uj policy surface-t, igy jo helyen teszteli, hogy a Phase B mag tenyleg eleg-e.

### Secondary Pilot: `reviewer`

1. A `reviewer` kovetkezzen az `implementer` utan, mert a Phase C szerint a fix-request es convergence tovabbra is a canonical `result` familyvel leirhato, de mar hozzaadott policy gate kontextussal.
2. Ez a lepes validalja, hogy a policy-gate megkulonboztetes nem csuszik vissza actor-specifikus primitive iranyaba.

### Final Pilot In The Sequence: `meta_reviewer`

1. A `meta_reviewer` legyen a harmadik, mert nala a retained operator status/recover diagnostics meg mindig valos transitional reteg.
2. Ezzel biztositott, hogy a migration vegere a meta-review sem marad kulon lifecycle-szubrendszer vagy kulon actor API.

## Phase E Entry Boundary

### Phase E In Scope

1. A belso actor runtime wrapper tenyleges implementacios bevezetese.
2. Az explicit delivery trigger es typed ack boundary runtime-level kodositasa.
3. A duplicate delivery suppression es duplicate successful emit replay policy implementacios rogzitesre forditasa a kijelolt owner domainekben.
4. Az `implementer` pilot cutover parity evidence-szel, majd a `reviewer`, vegul a `meta_reviewer` kovetkezo migracioja.
5. A retained adapterek cleanupja ott, ahol a Phase D cleanup trigger mar teljesult.

### Phase E Out Of Scope For This Document

1. Forraskod, CLI, runtime vagy state machine modositas ebben a Phase D artifactban.
2. Uj actor primitive, uj output family vagy uj authority-shape bevezetese.
3. Teljes topology-csere vagy tmux azonnali eltavolitasa.
4. Engineering ticket-level taskbontas; ez a dokumentum rollout spine, nem backlog.

## Decision Summary

1. A migration spine sorrendje: retained baseline -> wrapper boundary -> explicit delivery/ack -> core freeze -> boundary/policy ownership split -> implementer pilot -> reviewer/meta-reviewer rollout -> cleanup.
2. A bounded nyitott pontok ownershipa most mar eleg szuk ahhoz, hogy a Phase E implementacios pilot meginduljon a Phase B boundary ujranyitasa nelkul.
3. A retained tmux/operator topology a migration alatt megmaradhat, de csak observability-only adapterkent.
4. A docs-only deliverable akkor tekintheto sikeresnek, ha a Phase E mar konkret implementacios pilot taskkent indithato rewrite vagy uj core primitive nelkul.
