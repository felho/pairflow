---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity1_task1_generic_runtime_kernel_boundary_v1
title: "Actor Runtime Interface Opportunity 1 Task 1: Generic Runtime Kernel Boundary Clarification"
status: implementable
phase: post-phaseE
target_files:
  - plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 1 Task 1: Generic Runtime Kernel Boundary Clarification

## Current Codebase Check (2026-04-17)

1. A current tree-ben a generic actor runtime kernel hianya harom kulon coupling retegre esik szet:
   - fix role vocabulary a state/context boundaryn:
     - `src/types/bubble.ts`
     - `src/v11/shared/actorProtocol/actorEmitContext.ts`
     - `src/v11/shared/state/executionContext.ts`
   - hardcoded `expected_role x input.kind` routing matrix az actor protocol dispatcherben:
     - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - fix workflow output/CLI vocabulary a public surface-en:
     - `src/types/protocol.ts`
     - `src/cli/commands/agent/emit.ts`
2. A current runtime authority baseline mar letezik es preserved marad:
   - explicit `execution_context`
   - explicit `execution_id`
   - explicit role/round/fingerprint guardok
3. A szerepspecifikus wrapper-sprawl azonban meg mindig implicit kernelkent mukodik:
   - implementer: `pass | human_question`
   - reviewer: `pass | convergence`
   - meta-reviewer: `meta_review_result`
   - retained reviewer-origin `human_question` fallback
4. A current tree onboarding vocabularyja maga is tobb kulon fogalom:
   - `AgentName`
   - `ProtocolParticipant`
   - `AgentRole`
   - `DeliveryTargetRole`
   - `ActorOutputKind`
   - awaited-output vocabulary exact source anchors:
     - `BubbleExecutionContextAwaitedOutputType`
     - `MetaReviewExecutionContextAwaitedOutputType`
5. A bubble config/state/policy reteg tovabbra is zart baseline:
   - `BubbleAgentsConfig`
   - `RoundRoleHistoryEntry`
   - implementer/reviewer handoff loop
   - convergence policy
   - start/resume/topology slots
6. Emiatt az elso bounded follow-up nem uj role bevezetese es nem CLI/public protocol rewrite, hanem annak explicitte tetele, hogy mi a:
   - canonical actor authority context,
   - generic runtime route/policy matrix,
   - workflow-specific output adapter reteg,
   - es mely vocabularyk maradnak jelenleg zart baseline-kent.

## L0 - Policy

### Goal

Docs-only, implementalhato `O1-T1` sequencing szelet keszitese az `Opportunity 1` ala ugy, hogy:
1. kulon megnevezett belso actor runtime kernel boundary szuressen ki a wrapper-sprawl implicit logikajabol,
2. explicit legyen, mely elemek canonical authority baseline-ek, melyek policy guardok, es melyek workflow adapterek,
3. a kesobbi code-level genericizalas mar bounded contracttal induljon, ne rejtett role/output matrix kibogozassal.

### Context

1. A parent successor plan szerint az Opportunity 1 celja nem a lezart Phase E ujranyitasa, hanem egy role-neutralabb actor runtime kernel fele nyito kulon follow-up.
2. A current tree mar stabil, de a generic runtime kernel hianya miatt az uj actor/onboarding rugalmassag tovabbra sem ervenyesul.
3. A dispatcherben levo wrapper-matrix jelenleg egyszerre hordoz:
   - canonical authority ellenorzeseket,
   - role-specifikus policy guardokat,
   - workflow-specific emitter routingot.
4. Ezeket az elso korben nem implementacioval, hanem explicit boundary note-tal kell szetvalasztani.

### In Scope

1. Egy uj docs-only contract note letrehozasa itt:
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
2. A current tree wrapper/policy matrix explicit inventorozasa legalabb erre a tengelyre:
   - `expected_role`
   - `input.kind`
   - routed emitter path
   - extra policy guard
   - fail-closed vagy retained-fallback kimenet
3. A kovetkezo harom boundary kulon nevesitese:
   - canonical actor authority context
   - generic runtime route/policy matrix
   - workflow-specific output/result adapters
4. Egy kulon vocabulary matrix rogzítese legalabb ezek szetvalasztasaval:
   - `AgentName`
   - `ProtocolParticipant`
   - `AgentRole`
   - `DeliveryTargetRole`
   - `ActorOutputKind`
   - exact awaited-output source vocabularies:
     - `BubbleExecutionContextAwaitedOutputType`
     - `MetaReviewExecutionContextAwaitedOutputType`
   - exact awaited-output value and subset mapping:
     - `BubbleExecutionContextAwaitedOutputType = pass_result | meta_review_result`
     - `MetaReviewExecutionContextAwaitedOutputType = meta_review_result`
     - role-to-awaited-output baseline:
       - `meta_reviewer -> meta_review_result`
       - otherwise `pass_result`
5. Egy belso, meg nem implementalt typed boundary megnevezese minimum ilyen fogalmakkal vagy veluk ekvivalens local terminologyval:
   - `ActorRuntimeRoute`
   - `ActorRuntimePolicyCheck`
   - `ActorRuntimeDispatchPlan`
6. Annak explicit rogzítese, hogy a first slice utan mely code surfaces maradnak read-only downstream constraints:
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
7. A successor plan sequencing szekciojanak frissitese az `O1-T1` task pathjaval.

### Out of Scope

1. Barmilyen source-code modositas a runtime, CLI, state vagy tmux retegekben.
2. Uj role, uj `AgentRole`, uj actor output kind vagy uj public CLI acceptance contract bevezetese.
3. `src/types/protocol.ts` public/workflow vocabulary atirasa.
4. `src/cli/commands/agent/emit.ts` parser/help surface atirasa.
5. `src/v11/shared/state/executionContext.ts` vagy `src/v11/shared/metaReview/metaReviewExecutionContext.ts` semanticsanak modosítása.
6. `BubbleAgentsConfig`, `RoundRoleHistoryEntry`, pass handoff, convergence policy, start/resume es tmux topology generalizalasa.
7. Delivery/topology/tmux cleanup vagy barmilyen `Opportunity 2 / O2-T1` scope.

### Safety Defaults

1. Ez docs-only task; product- vagy runtime-kod nem modosithato.
2. A canonical execution authority baseline preserved marad; az uj note nem reinterpretalhatja lazabb compat language-gge.
3. A reviewer-origin `human_question` retained fallback explicit preserved-baseline vagy explicit successor-owned replaceable policy legyen; nem tuntetheto el hallgatozolag.
4. A meta-reviewer `active_agent === codex` when present guard explicit policy-branch marad addig, amig kulon successor task maskepp nem rendelkezik rola.
5. A task nem allithatja, hogy az uj actor onboarding mar megoldott; csak azt, hogy az implicit matrix explicit contractta valik.
6. A ketlane-es bubble config/state/policy modell explicit zart baseline marad ebben a first slice-ban.
7. A task nem vezethet be uj umbrella terminologyt zart source-anchor mapping nelkul.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - belso actor runtime kernel boundary dokumentalt szerzodese
3. Blast radius:
   - uj contract note a `plans/` alatt
   - successor plan sequencing frissites
   - code surfaces csak source anchor es read-only constraint szerepben

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - Ez owns-olja az Opportunity 1 sequencinget.
2. Preserved authority baseline:
   - `plans/actor-runtime-interface-execution-authority-contract-note-v1.md`
3. Historical predecessor context:
   - `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`

## L1 - Implementation Contract

### Plan Linkage

1. Ez a task az `Opportunity 1` elso bounded successor slice-a (`O1-T1`) a `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` alatt.
2. A task feladata csak a kernel-boundary clarification; nem ownershipolja az `O2-T1` topology/executor lane-t es nem ownershipolja az `O3-T1` onboarding/extension simplification lane-t.
3. A task outputja kotelezo predecessor `O2-T1` es `O3-T1` szamara:
   - `O2-T1` csak az itt lezart kernel-vs-delivery hatar mellett nyithato,
   - `O3-T1` csak az itt lezart vocabulary/boundary matrix utan nyithato.

### Scope Reality / Shape Proof

1. A declared `target_files` docs-only artifactok:
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Nincs mutation entrypoint a target scope-ban.
3. A repo-local source anchorok sok runtime surface-t erintenek, de azok ebben a taskban csak evidence es closed-contract source szerepet kapnak.
4. Emiatt a valos bounded slice docs-only contract foundation:
   - nincs authority producer munka,
   - nincs public shared-contract migration,
   - nincs consumer-family code alignment,
   - nincs cleanup vagy activation delivery.
5. A task label es a valos scope egyezik: ez `contract_or_persisted_authority_foundation` alaku docs-only closure, nem runtime implementation slice.

### Control Model Clauses

#### Business Invariant

1. A generic actor runtime kernel tovabbra sem szerezhet workflow-state, bubble-authority vagy lifecycle ownershipot.

#### Control Model

1. A current canonical authority baseline preserved marad:
   - explicit `execution_context`
   - explicit `execution_id`
   - role/round/fingerprint guardok
2. A jelen task csak azt tisztazza, hogyan kell elvalasztani:
   - canonical authority baseline-t,
   - role/policy matrixot,
   - workflow adapter vocabularyt.

#### Read Path Rule

1. A zart baseline vocabulary es guard semantics source-of-truth-ja a repo-local source anchorokban van, nem az uj note szabad parafrázisaiban.

#### Forbidden Fallback

1. Nem szabad a public protocol unionokat a generic kernel vegleges belso taxonomyjakent kezelni.
2. Nem szabad a wrapper/policy matrixot convenience routingga lazitani.
3. Nem szabad uj umbrella terminologyt exact source-anchor mapping nelkul bevezetni.

#### Allowed Resolution Path

1. A note explicit mappinggel dolgozhat a zart source-anchor vocabulary es a javasolt kernel terminology kozott.
2. A preserved baseline policy branchek:
   - reviewer-origin `human_question` retained fallback
   - meta-reviewer `active_agent === codex` when present guard
   explicit preserved-baseline elemkent nevezhetoek meg.

#### Missing Data Rule

1. Ha valamely zart vocabulary vagy policy branch exact source-anchor mappingja bizonyithato a current tree-ben, azt a note kotelezo explicit mappingkent rogzitse.
2. Ennél a tasknal az awaited-output mapping nem maradhat `deferred mapping` vagy `open dependency`, mert a current-tree source anchorok mar lezart contractot adnak.
3. `deferred mapping` csak olyan terminologyra engedett, amelyhez nincs current-tree closed source anchor.

### Task Shape

1. Primary shape: `contract_or_persisted_authority_foundation`
2. Secondary shape nincs.
3. Ez a task nem producer, nem consumer-alignment, nem activation, es nem cleanup task.

### Closed-Contract Drift Check

#### Source Anchors

1. `src/v11/shared/actorProtocol/actorEmitContext.ts`
2. `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
3. `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
4. `src/types/protocol.ts`
5. `src/types/bubble.ts`
6. `src/cli/commands/agent/emit.ts`
7. `src/v11/shared/state/executionContext.ts`
8. `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
9. `src/config/bubbleConfig.ts`
10. `src/v11/domain/pass/handoff.ts`
11. `src/v11/domain/convergence/policyValidation.ts`
12. `src/v11/shared/start/startStateMutation.ts`

#### Canonical Elements

1. Explicit `execution_context`-alapu actor authority baseline.
2. Explicit `execution_id` jelenlete a canonical runtime authority reszekent.
3. `expected_role`, `expected_round`, `expected_state_fingerprint` guard-jellegu current authority context.
4. Fail-closed dispatcher behavior wrapper mismatch es role/output mismatch eseten.

#### Guard Elements

1. Reviewer active-agent required guard.
2. Reviewer convergence expected-reviewer derivation guard.
3. Meta-reviewer `active_agent === codex` when present guard.
4. Reviewer-origin `human_question` retained fallback baseline.

#### Compat Elements

1. Jelen taskban nincs uj compat path.
2. A public CLI/output vocabulary read-only downstream compatibility surface-kent marad.

#### Closed Terms

1. `canonical actor authority context`
2. `generic runtime route/policy matrix`
3. `workflow-specific output adapter`
4. `preserved baseline`
5. `read-only downstream constraint`
6. `closed baseline vocabulary matrix`

#### Forbidden Reinterpretations

1. Nem szabad a public `ActorEmitInput` uniont a generic kernel vegleges belso contractjanak nevezni.
2. Nem szabad a role-specific wrapper matrixot puszta convenience routingnak nevezni, ha policy guardokat is hordoz.
3. Nem szabad a CLI `--expected-role` vocabularyt a jovobeli generic kernel hatarakent kezelni.
4. Nem szabad a state-level `meta_reviewer -> meta_review_result` couplingot hallgatozolag kivenni a dependency listabol.
5. Nem szabad az exact awaited-output source anchorokat egy nem-definialt `AwaitedOutputType` umbrella terminussal helyettesiteni explicit mapping nelkul.
6. Nem szabad az exact awaited-output type- es role-mappingot optional examplekent kezelni; ez required-now closed baseline output.

#### Drift Status

1. `drift_status: closed_contract_preserved_if_exact_mapping_recorded`

### Authority Fan-out Scan

1. `authority_producer`
   - nincs ebben a taskban
2. `persisted_authority`
   - read-only baseline: `execution_context`
3. `internal_execution_consumers`
   - `emitActorProtocolV11.ts`
   - `actorProtocolEmitters.ts`
4. `workflow_orchestration_consumers`
   - downstream constraint only: pass/ask-human/convergence/meta-review command paths
5. `read_model_consumers`
   - nincs ebben a taskban
6. `cleanup_recovery_consumers`
   - downstream constraint only: meta-review execution-context validation/recovery semantics
7. `workflow topology and policy baseline`
   - downstream constraint only: bubble config, role history, handoff loop, convergence policy, start/resume topology

Conclusion:
1. A task bounded marad, mert nincs producer vagy shared-contract code alignment; csak a belso route/policy kernel explicit dokumentacios closure-je tortenik meg.

### Closure-Budget Triage

1. touched closures:
   - `shared_contract`: igen, docs-only boundary clarification szinten
   - `internal_execution_consumers`: read-only source-anchor inventorykent igen
   - `workflow_orchestration_consumers`: read-only downstream dependencykent igen
   - `cleanup_recovery_consumers`: read-only downstream dependencykent igen
2. intentionally collapsed closure:
   - csak a docs-only shared-contract foundation clarification
3. explicitly deferred closures:
   - runtime consumer alignment
   - topology/executor clarification (`O2-T1`)
   - onboarding/extension simplification (`O3-T1`)
   - barmilyen state/config/policy generalization
4. safe-collapse proof:
   - nincs code mutation,
   - nincs producer vagy public contract migration,
   - a consumer-familyk csak evidence/dependency szerepben jelennek meg.

### Complexity-Risk Gate

1. `authority_risk: 1`
2. `surface_spread: 2`
3. `identity_join_risk: 1`
4. `activation_coupling: 0`
5. `prerequisite_risk: 1`
6. `acceptance_multiplicity: 0`
7. `risk_score: 5`
8. split decision:
   - igen, split mar ervenyben van
   - ez a task csak docs-only foundation clarification
   - az implementacios utodlane-ek deferalva maradnak

### Baseline Preservation

#### must_preserve_behaviors

1. explicit `execution_context` + `execution_id` baseline
2. fail-closed wrapper mismatch baseline
3. reviewer-origin `human_question` retained fallback baseline
4. meta-reviewer `active_agent === codex` when present guard baseline

#### allowed_resolution_paths

1. explicit terminology mapping a zart source anchorok es az uj kernel note fogalmai kozott
2. exact source-vocabulary felsorolasa ott, ahol umbrella terminology driftet okozna

#### forbidden_regression_interpretations

1. a reviewer fallback nem tunhet el “generic cleanup” cimszo alatt
2. a meta-reviewer guard nem lazulhat “role-neutrality” cimszo alatt
3. az exact awaited-output vocabulary nem mosodhat ossze egy uj, nem-anchored umbrella terminussal

#### replacement_proof_required_if_removed

1. Barmely preserved baseline branch removed/renamed csak kulon successor task explicit replacement proofjaval engedheto meg.

### Deliverables

1. `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
   - kotelezo szekciok:
     - current-tree coupling inventory
     - closed baseline vocabulary matrix
     - exact awaited-output type and role mapping
     - role x input route/policy matrix
     - canonical vs policy vs workflow-adapter boundary split
     - proposed typed internal boundary vocabulary
     - preserved baselines
     - explicit downstream constraints
2. `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - az `O1-T1` task explicit sequencing hivatkozasa

### Completion Checks

1. A note explicitten kimondja, hogy az Opportunity 1 elso szelete docs-only boundary clarification, nem runtime rewrite.
2. A note tablazatos vagy ezzel ekvivalens formaban inventoryzza a current wrapper matrixot.
3. A note tablazatos vagy ezzel ekvivalens formaban kulon nevezi a zart vocabulary fogalmakat.
4. A note explicit rogzíti:
   - `BubbleExecutionContextAwaitedOutputType = pass_result | meta_review_result`
   - `MetaReviewExecutionContextAwaitedOutputType = meta_review_result`
   - role-to-awaited-output baseline:
     - `meta_reviewer -> meta_review_result`
     - otherwise `pass_result`
5. A note kulon nevesiti a canonical authority, policy guard es workflow adapter retegeket.
6. A note explicit read-only downstream constraintkent nevezi meg a public protocol/CLI/state couplingokat.
7. A note explicit zart baseline-kent nevezi meg a bubble config/state/policy reteget.
8. A successor plan mar konkret task pathra mutat az `O1-T1` elso szelethez.

## L2 - Evidence and Review

### Must-Use Evidence

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` | P1 | required-now |
| must-use | `plans/actor-runtime-interface-execution-authority-contract-note-v1.md` | P1 | required-now |
| must-use | `src/v11/shared/actorProtocol/actorEmitContext.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | P1 | required-now |
| must-use | `src/types/protocol.ts` | P1 | required-now |
| must-use | `src/types/bubble.ts` | P1 | required-now |
| must-use | `src/cli/commands/agent/emit.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/executionContext.ts` | P1 | required-now |
| must-use | `src/v11/shared/metaReview/metaReviewExecutionContext.ts` | P1 | required-now |
| must-use | `src/config/bubbleConfig.ts` | P1 | required-now |
| must-use | `src/v11/domain/pass/handoff.ts` | P1 | required-now |
| must-use | `src/v11/domain/convergence/policyValidation.ts` | P1 | required-now |
| must-use | `src/v11/shared/start/startStateMutation.ts` | P1 | required-now |

### Must-Not-Use

1. Barmilyen implicit jovobeli role/plugin/topology feltetelezes code evidence nelkul.
2. `Opportunity 2 / O2-T1` vagy `Opportunity 3 / O3-T1` scope beemelese.
3. Public CLI rewrite vagy protocol taxonomy rewrite.

### Review Focus

1. A task maradjon bounded docs-only kernel clarification.
2. Ne csusztassa at a public protocol surface-et belso kernel contractta.
3. Ne veszitse el a retained reviewer/meta-review policy branch-eket.
4. Az exact awaited-output type- es role-mapping required-now outputkent maradjon explicit.
