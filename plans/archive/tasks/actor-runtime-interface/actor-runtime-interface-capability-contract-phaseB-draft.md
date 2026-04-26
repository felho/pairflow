---
artifact_type: contract_draft
artifact_id: draft_actor_runtime_interface_capability_contract_phaseB_v1
title: "Actor Runtime Interface Capability Contract (Phase B Draft)"
status: completed
phase: phaseB
source_task_ref: plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-capability-contract-phaseB.md
source_inventory_ref: plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-behavior-inventory-phaseA-inventory.md
plan_ref: plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
normative_refs:
  - plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
  - plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md
  - plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md
informational_refs:
  - docs/pairflow-initial-design.md
  - docs/v2/pairflow-v2-architecture-plan-joint.md
baseline_note: "Normative Phase B draft prepared on 2026-04-03 from Phase A inventory artifact plus binding protocol-first references. This is a docs-only target contract draft, not an implementation plan or simulation artifact."
---

# Actor Runtime Interface Capability Contract (Phase B Draft)

## Executive Summary

1. A target actor runtime interface nem a jelenlegi `pass` / `human_question` / `convergence` / `meta_review_result` command-shape mechanikus atnevezese, hanem egy kis core-ra epulo, role-neutral capability boundary.
2. A minimalis core actor contract feladata:
   - explicit execution context fogadasa,
   - durable handoff olvasasa,
   - relevans protocol snapshot olvasasa,
   - canonical actor output kibocsatasa,
   - human input igeny formalizalasa.
3. A workflow state ownership, authority resolution, lifecycle routing, hard capability enforcement, canonical output validation es delivery-ack ownership nem actor capability, hanem kernel/executor domain.
4. A `meta_reviewer` ugyanazon boundary egyik role projectionje. Nem kulon alrendszer, nem kulon actor API, es nem kulon lifecycle-modell.
5. A delivery trigger es ack boundary explicit, topology-semleges contract kell legyen. A `tmux`, a pane-marker, a shell allapot vagy a TUI szoveg csak observability/runtime surface lehet, nem authority.

## Decision Baseline

1. A Phase A inventory current-state evidence, nem normativ target.
2. A target contract canonical forrasa a parent plan capability-first, role-neutral, explicit-authority, protocol-first modellje.
3. A Phase 4/5 outputjaival kompatibilis contract kell:
   - nincs retained alias command a target core-ban,
   - nincs implicit actor-write authority,
   - nincs special-case meta-review actor API,
   - nincs legacy lifecycle-re epulo boundary.
4. A topology valasztas szandekosan nincs befagyasztva ebben a fazisban.

## Scope Guardrails

1. Ez a draft docs-only, normativ capability contract.
2. Nem scenario matrix.
3. Nem migration spine.
4. Nem runtime implementation terv.
5. Nem uj CLI acceptance contract ujranyitasa.

## Phase A Traceability

| Phase A observation | Target contract consequence | Disposition |
|---|---|---|
| Canonical `agent emit` family mar letezo explicit actor entry surface | A target contractnak egyetlen role-neutral actor boundaryt kell adnia, nem command-union listat. | `core` |
| Explicit `repo` + `bubble_id` + `handoff_id` authority trio mar current-state seed | A target actor input authority explicit, typed es fail-closed legyen; nincs implicit `cwd`/worktree/env authority. | `core` |
| `Role` es `Actor` first-class, `AgentConfig` csak implicit current-state decorator | A target contract kulon fogalomkent kezeli a `Role`, `Actor`, `AgentConfig` retegeket. | `core` |
| PASS / convergence / meta-review submit flow current-stateben mixed orchestration + state mutation | A targetben ezek actor output capabilityk maradnak, de a routing/state mutation ownership kikerul az actor boundarybol. | `adapt` |
| tmux delivery, watchdog, kickoff/resume/restart operator/runtime touchpointok current-stateben executor-sideak | Ezek executor-owned vagy operator-owned domainnek minosulnek, nem actor capabilitynek. | `adapt` |
| Removed legacy alias surface mar fail-closed | A target contract nem tart fenn command-spelling alapu compatibility core-t. | `remove` |
| Startup/resume/reviewer guidance current-stateben kulon prompt/guidance surface | Ezek bounded extension vagy supporting guidance surface-ek lehetnek, nem authority core. | `extension` |

## Entity Model

### Role

`Role` workflow-szintu pozicio. A target contractban ez minimum:

- `implementer`
- `reviewer`
- `meta_reviewer`
- future role-ok ugyanazon boundary alatt

Normativ allitas:

1. A role nem kulon transport vagy kulon actor API.
2. A role policyt, vart output-shape-et, handoff-tartalmat es capability-korlatozast befolyasolhat.
3. A role nem hatarozza meg onmagaban a concrete runtime topologyt.

### Actor

`Actor` a concrete runner identity, peldaul `codex`, `claude`, vagy kesobbi runner.

Normativ allitas:

1. Az actor a role-t kitolto vegrehajto.
2. Az actor ugyanazt a target actor runtime interface-et hasznalja mas role projectionben is.
3. Uj actor bevezetesehez nem kell uj role-specifikus command family.

### AgentConfig

`AgentConfig` az actor dekorator-konfiguracioja: persona, skill, mode, policy-profile, rendering preference, hasonlok.

Normativ allitas:

1. Az `AgentConfig` nem egyenlo sem a `Role`-lal, sem az `Actor`-ral.
2. Az `AgentConfig` policy-dekorator, nem authority-forras.
3. Az `AgentConfig` nem irhatja felul a canonical input authorityt vagy a forbidden domain szabalyokat.

## Target Boundary Overview

### Actor Boundary

Az actor boundary az a minimum runtime/domain contract, amit egy actor egy workflow-step vegrehajtasakor lat es hasznal.

Az actor boundary reszei:

1. explicit execution context
2. durable handoff access
3. relevans protocol snapshot access
4. canonical output emit
5. human input request emit
6. optional bounded extension hooks

### Executor Boundary

Az executor boundary a process/workspace/sync/relay/liveness/delivery/topology reteg.

Az executor boundary reszei:

1. workspace provisioning
2. process/session launch
3. delivery trigger transport
4. ack eloallitas
5. retry / restart / rebind
6. liveness / watchdog
7. sync / relay / queue / IPC plumbing
8. observability artifactok

Normativ szeparacio:

1. Az actor boundary nem hozhat letre workflow state transitiont.
2. Az executor boundary nem donthet policyt vagy acceptance-et.
3. A kernel/orchestrator owns:
   - state ownership
   - lifecycle routing
   - hard capability enforcement
   - canonical output acceptance validation

## Core Capability Contract

### Minimal Core Capability Set

| Capability | Purpose | Required Inputs | Required Output / Effect | Why core |
|---|---|---|---|---|
| `receiveExecutionContext` | Az actor megkapja az explicit authority-kontextust | `execution_context` | actor a jelenlegi step authorityjaval dolgozik | minden actor-stephez szukseges |
| `readHandoff` | A durable handoff payload olvasasa | `handoff_ref` vagy inline durable handoff payload | actor rendelkezik a vegrehajtando feladattal | minden actor-stephez szukseges |
| `readRelevantProtocolState` | A relevans workflow/protocol snapshot olvasasa | `protocol_snapshot_ref` vagy equivalent read handle | actor a stephez szukseges minimalis allapotot latja | minden actor-stephez szukseges |
| `emitResult` | Canonical actor eredmeny kibocsatasa | typed result payload + current-execution authority guards | kernel-nek atadhato canonical actor result | minden sikeres actor-stephez szukseges |
| `requestHumanInput` | Emberi input igeny formalizalasa | question / blocking reason / refs | canonical human-input request | minden actor-step potencialisan igenyelhet humant |

### Core Capability Invariants

1. A core capability-k role-neutralok.
2. A core capability-k topology-semlegesek.
3. A core capability-k nem fuggnek command-spellingtol.
4. A core capability-k nem tartalmaznak lifecycle-routing ownershipot.
5. A core capability-k nem dependalhatnak implicit shell-context authorityra.

## Actor Input Authority Contract

### Required Fields

Az actor input authority minimum szerzodese:

| Field | Meaning | Why required |
|---|---|---|
| `repo` | canonical repo authority | actor write/read scope explicit legyen |
| `bubble_id` | workflow instance identity | actor ne implicit workspacebol kovetkeztessen |
| `execution_id` | a konkret aktiv actor-step execution identityja | current execution authority explicit legyen |
| `handoff_id` | az aktiv step/handoff canonical authorityja | stale vagy duplicate emit vedelme |
| `role` | aktiv workflow role projection | role-neutral boundary, explicit role contexttel |
| `actor_id` | concrete actor identity | provenance es role/actor separation miatt |

### Optional Guard Fields

| Field | Meaning | Why optional |
|---|---|---|
| `expected_state_fingerprint` | stale-state guard | concurrency / duplicate suppression |
| `expected_round` | round guard | stale authority vedelem |
| `emit_capability_ref` | execution-scoped emit lease / capability handle | implementation topologytol fugg, de current-stateben hasznos |
| `agent_config_ref` | policy/config decorator reference | hasznos, de nem authority-minimum |
| `protocol_snapshot_ref` | extra read handle | topologytol es steptol fugg |

### Execution-Scoped Emit Capability

Az actor write authority nem pusztan `role` vagy `actor_id`, hanem a current executionhoz kotott emit capability.

Normativ minimum:

1. Minden aktiv actor executionhoz a kernel/orchestrator emit capabilityt vagy equivalent execution-scoped lease-t rendel.
2. A capability legalabb az alabbi fogalmakhoz kotott:
   - `execution_id`
   - `bubble_id`
   - `handoff_id`
   - `role`
   - `actor_id`
   - allowed emit family vagy equivalent output scope
3. Canonical emit capability mismatch vagy capability hiany eseten fail-closed.
4. A capability current-execution write authority, nem altalanos actor-identitas.
5. A capability transport mechanizmusa implementacios reszlet.
6. Phase B target az elso implementacios verziora:
   - environment-variable alapu capability atadas
7. Kesesobbi kompatibilis implementaciok lehetnek:
   - lehet session-local file/socket/proxy
   - lehet kesobbi erosebb session-bound mechanizmus
8. A capability transport nem resze a canonical actor-facing contractnak.

### Authority Rules

1. Az actor-write authority explicit.
2. Az implicit `cwd`, worktree ancestry, shell env, pane binding vagy prompt state nem authority-forras.
3. Az authorityt a kernel/orchestrator allitja elo vagy materializalja.
4. Az actor authorityt nem bovithet ki onhatalmuan.
5. A stale vagy mismatched authorityra adott emit fail-closed.

## Actor Input Payload Contract

Az actor-step canonical inputja ket reszre oszlik:

1. `execution_context`
2. `work_payload`

### Execution Context

Kotelezo minimum:

- `repo`
- `bubble_id`
- `execution_id`
- `handoff_id`
- `role`
- `actor_id`
- `started_at`
- `deadline_at`
- `attempt`

### Work Payload

Kotelezo minimum:

- `handoff_ref` vagy equivalent durable handoff payload
- relevans protocol snapshot vagy reference

Optional:

- policy/profile refs
- advisory diagnostics
- extension-specific enrichment

Normativ szabaly:

1. Az actor a handoffot es a relevans protocol snapshotot olvassa.
2. Az actor nem olvashatja a workflow authorityt passziv runtime jelekbol.
3. A work payload lehet topologytol fuggoen reference-heavy vagy inline-heavy, de a canonical szerzodes nem valtozhat.

## Canonical Output Contract

### Semantic Output Families

A target contract semantic szinten minimum ezeket kulonbozteti meg:

| Output family | Meaning | Required fields |
|---|---|---|
| `result` | actor-step eredmeny vagy handoff-szeru kimenet | `handoff_id`, `role`, typed payload, optional `summary` |
| `human_input_request` | blokkolo emberi kerdes / dontesi igeny | `handoff_id`, `role`, `question`, optional refs |

Normativ megjegyzes:

1. A current Phase 4/5 canonical actor emit kind-ek (`pass`, `human_question`, `convergence`, `meta_review_result`) current transport/API shapes.
2. A Phase B capability contract ezeket magasabb absztrakcios szinten kezeli:
   - `pass`, `convergence`, `meta_review_result` -> `result` semantic family
   - `human_question` -> `human_input_request`
3. Ez nem reopeneli a jelenlegi CLI acceptance contractot; csak a jovobeli actor runtime belso normativ boundaryjat tisztitja.

### Canonical Actor-Facing Emit Surface

Az actor-facing canonical emit surface neve `emit`.

Normativ minimum:

1. Az `emit` mindig a current execution authority neveben bocsat ki outputot.
2. Az `emit` nem fogad explicit target authority parametereket:
   - `bubble_id`
   - `handoff_id`
   - `role`
   - `execution_id`
3. Az `emit` a szukseges write authorityt implicit, executor/runtime altal materializalt capabilitybol vagy equivalent session-bound mechanizmusbol veszi.
4. Az actor-facing `emit` surface ezert nem altalanos route parancs, hanem current-execution emit boundary.
5. A first-version target environment-variable alapu capability atadas.
6. Az environment-variable transport implementacios reszlet, nem a canonical API szemantikaja.

### Output Rules

1. A canonical output typed.
2. A canonical output acceptance validation a kernel/orchestrator oldalon marad.
3. Az actor output nem hajthat vegre kozvetlen lifecycle transitiont.
4. Az actor output nem hordozhat implicit authority-bovitest.
5. A role-specifikus kulonbseg payload-shape-ben vagy policy-ban jelenhet meg, nem kulon actor API-ban.

## Delivery Trigger Contract

### Required Semantics

A delivery trigger explicit gepi boundary.

Minimum szemantika:

1. a durable handoff letezik
2. a runtime explicit `deliver(...)`-t vagy equivalent structured signal-t kap
3. a signal egy konkret authority-hoz kotott actor-stephez tartozik

Elfogadhato topology-semleges formak:

1. inbox watch event
2. local `deliver(envelope_ref)` hivasi boundary
3. IPC/API relay
4. on-demand exec launch, ha ugyanazt a contractot tartja

Nem elfogadhato canonical trigger:

1. pane-beirt prompt lathatosaga
2. tmux `send-keys` mint authority
3. shell marker
4. TUI allapot vagy scrollback

## Ack Boundary Contract

### Delivery Ack Set

| Ack | Meaning |
|---|---|
| `accepted` | a runtime atvette a munkat es vallalja a tovabbi feldolgozast |
| `rejected` | a munka ebben az allapotban vagy ezzel a contexttel nem fogadhato be |

### Launch Ack Set

| Ack | Meaning |
|---|---|
| `running` | a runtime tenylegesen elinditotta az actor-stepet |
| `failed_to_start` | a runtime probalta inditani, de a concrete launch nem sikerult |

### Ack Rules

1. Az ack boundary runtime/executor contract, nem actor capability.
2. A delivery ack es a launch ack kulon boundary-pillanatot reprezental.
3. Domain state progression nem alapulhat pusztan pane-visible activityn.
4. Az ack topology-semleges kell maradjon.
5. Az ack metadata tartalmazhat diagnostics mezoket, de ezek nem valhatnak alternativ authority-forrassa.
6. A duplicate delivery / stale authority suppression Phase C-ben scenario szinten vizsgalando, de a minimum typed ack contract mar most kotelezo.

## Role-Neutral Contract

### Normative Statement

Az `implementer`, `reviewer`, `meta_reviewer` es kesobbi role-ok ugyanazt az actor runtime interface-et hasznaljak.

### What May Differ by Role

| Area | Allowed role-specific variation |
|---|---|
| handoff content | igen |
| expected output subtype | igen |
| policy rules | igen |
| `AgentConfig` | igen |
| prompt/guidance decoration | igen |
| lifecycle ownership | nem |
| kulon actor API | nem |
| kulon delivery trigger | nem |
| kulon authority model | nem |

### Meta-Reviewer Rule

1. A `meta_reviewer` ugyanazon actor boundary egy role projectionje.
2. A `meta_reviewer` current-state special-case historiaja nem emelheto at a target contractba.
3. A `meta_review_result` output role/output-level variation, nem kulon actor subsystem.

## Bounded Extension Policy

### Allowed Bounded Extensions

| Extension area | Why bounded extension |
|---|---|
| step-start context enrichment | nem minden actor-use-casehez kotelezo |
| role/actor-specific prompt decoration | policy-dekorator, nem authority |
| findings/rendering/summary helpers | presentation/helper reteg |
| diagnostics hooks | observability, nem lifecycle ownership |
| kulso integracios adapterek | topology/integration-level extension |

### Extension Rules

1. Az extension nem torheti meg a core authority contractot.
2. Az extension nem valtoztathatja meg a canonical input/output szerzodest.
3. Az extension nem birtokolhat lifecycle routingot.
4. Az extension nem validalhatja felul hard modon a canonical output acceptance-et.
5. Az extension fallback nelkul lekapcsolhato kell maradjon a core contract serulese nelkul.

## Forbidden Extension Domains

Az alabbiak nem extension pontok, hanem tiltott kiszervezesi domain-ek:

1. authority resolution
2. workflow state ownership
3. lifecycle transition
4. lifecycle routing
5. hard capability enforcement
6. canonical output validation
7. implicit actor-write authority visszacsempeszese

## Executor-Owned Domains

Az alabbiak explicit executor-owned vagy operator-owned domain-ek:

1. process/session launch
2. workspace provisioning
3. sync / relay / queue / IPC transport
4. delivery trigger transport implementation
5. typed ack eloallitas
6. retry / restart / rebind
7. watchdog / liveness
8. tmux pane binding
9. observability and diagnostics artifacts
10. operator lifecycle commandok (`kickoff`, `resume`, `restart`, `watchdog`, stb.)

## Compatibility Note with Current Canonical Surface

1. A current repo Phase 4/5 utan a canonical actor-facing CLI surface a `pairflow agent emit --kind ...`.
2. A target contractban az actor-facing surface neve tovabbra is `emit`, de ennek szemantikaja current-execution-scoped.
3. Ennek megfeleloen a jovobeli canonical actor-facing `emit` nem fogad explicit target authority override-okat.
4. A jelenlegi vagy jovobeli capability transport lehet env-alapu vagy mas session-bound mechanizmus; ez adapter-level implementation detail.
5. A removed aliasok nem reszei a target contractnak.

## Informational v2 Alignment Note

1. A draft illeszkedik a v2 iranyhoz abban, hogy a kernel owns state transition, policy es capability enforcement.
2. A channel/CLI/runtime reteg itt is enforcement adapterkent vagy transport/adapterszintkent jelenik meg.
3. Ez informational alignment, nem normativ override. A jelen draft authorityjat tovabbra is a parent plan es a binding protocol-first companion set adja.

## Open Questions Kept Bounded for Phase C / D

| Question | Why still open | Deferred to |
|---|---|---|
| A `result` semantic family egyetlen union maradjon-e, vagy tobb typed output-csaladra bomoljon | implementation es scenario evidence kell hozza | Phase C |
| Az ack boundary operator-visible es kernel-visible shape-je mennyire essen egybe | runtime topology tradeoff kerdes | Phase C / D |
| Melyik topology legyen az alapertelmezett: long-lived runner, on-demand exec, IPC | topology-dontes nem resze a Phase B core contractnak | Phase D |

## Approval Checklist

1. A draft capability-alapu, nem command-union alapu.
2. A draft explicit actor input authorityt kovetel.
3. A draft explicit delivery trigger es ack boundary minimumot ad.
4. A draft role-neutral, beleertve a `meta_reviewer` szerepet.
5. A draft kulon kezeli a core capabilityket, bounded extensiont, forbidden domaineket es executor-owned retegket.
6. A draft a Phase A inventory megfigyeleseit visszakoti a normativ contracthoz.
7. A draft nem csinal scenario matrixot vagy migration tervet.
