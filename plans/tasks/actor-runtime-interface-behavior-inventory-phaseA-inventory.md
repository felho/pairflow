---
artifact_type: inventory
artifact_id: inventory_actor_runtime_interface_behavior_phaseA_v1
title: "Actor Runtime Interface Behavior Inventory (Phase A Inventory)"
status: completed
phase: phaseA
source_task_ref: plans/tasks/actor-runtime-interface-behavior-inventory-phaseA.md
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
normative_refs:
  - plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
  - plans/archive/tasks/protocol-first/protocol-first-cli-and-protocol-surface-unification-phase4.md
  - plans/archive/tasks/protocol-first/protocol-first-legacy-meta-review-model-removal-phase5.md
baseline_note: "Current-state inventory generated from HEAD 276caed84f4ec7083094c639aeddb35e918e84e9 on 2026-04-03. Current-state evidence source priority: checked-out codebase first, README/docs second."
inspected_source_scope:
  - src/cli/index.ts
  - src/cli/orchestra.ts
  - src/cli/commands/agent/emit.ts
  - src/cli/commands/agent/pass.ts
  - src/cli/commands/agent/askHuman.ts
  - src/cli/commands/agent/converged.ts
  - src/cli/commands/agent/legacyActorCommandRemoval.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/types/bubble.ts
  - src/types/protocol.ts
  - src/core/protocol/envelope.ts
  - src/core/protocol/validators.ts
  - src/core/bubble/actorEmitContext.ts
  - src/core/bubble/metaReview.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/core/runtime/watchdog.ts
  - src/core/runtime/reviewerCommandGateGuidance.ts
  - src/core/runtime/metaReviewSubmitGuidance.ts
  - src/core/state/executionContext.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/converged/convergedRoutingPreparation.ts
  - src/v11/application/kickoff/kickoffCliOptions.ts
  - src/v11/application/kickoff/kickoffCliRunner.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/restart/restartCliCommand.ts
  - src/v11/shared/pass/emitPassContextBuilder.ts
  - src/v11/shared/pass/passFlowDispatch.ts
  - src/v11/shared/askHuman/askHumanCommandApi.ts
  - src/v11/shared/converged/convergedCommandInputNormalization.ts
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts
  - src/cli/commands/bubble/resume.ts
supporting_docs_surface:
  - README.md
  - docs/pairflow-initial-design.md
  - docs/v2/pairflow-v2-architecture-plan-joint.md
coverage_note: "Representative, decision-focused current-state inventory. The artifact covers the required actor entrypoint/parser, reviewer-only validation/policy, meta-review surface, runtime/context helper, emit/protocol path, lifecycle touchpoint, prompt/guidance, artifact/side-effect, and actor-vs-executor boundary layers. It does not claim exhaustive call-graph completeness for every downstream helper/test/UI path."
---

# Actor Runtime Interface Behavior Inventory (Phase A)

## Executive Summary

1. A jelenlegi current-state actor surface mar nem a regi `pass` / `ask-human` / `converged` / `orchestra` aliasokra epul, hanem a canonical `pairflow agent emit --kind ...` family-re, amely negy output kindot fed le: `pass`, `human_question`, `convergence`, `meta_review_result`.
2. A removed legacy alias surface fail-closed marad: a regi actor commandok help-szinten meg emlitettek, de futaskor explicit `LEGACY_COMMAND_REMOVED` hibara allnak.
3. A `Role` es `Actor` current-state szinten first-class fogalmak, de `AgentConfig` current-state first-class entitas nem latszik. Helyette bubble-config es prompt/guidance-level, implicit konfiguracios mezok vannak.
4. Az actor-boundary es az executor-boundary ma reszben mar szet vannak huzva, de tobb fontos current-state path meg mindig mixed: az actor emit authority state-snapshotbol jon, a runtime delivery tmux pane routingot hasznal, es nehany command-flow meg mindig a worktree/state/runtime helper retegekkel szorosan ossze van kotve.
5. A Phase B szempontjabol a legerosebb current-state tanulsag az, hogy a canonical actor output shape es az explicit authority-trio (`repo`, `bubble_id`, `handoff_id`) mar jo discovery seed, viszont a command-specific orchestration, state write, delivery routing es pane-oriented recovery viselkedesek nem emelhetok at mechanikusan jovobeli actor runtime core-kent.

## Role / Actor / AgentConfig Separation

| Term | Current-state evidence | Current-state reading | Confidence |
|---|---|---|---|
| `Role` | `src/types/bubble.ts#L26`, `src/core/state/executionContext.ts#L8`, `docs/pairflow-initial-design.md#L97` | First-class runtime/domain axis: `implementer`, `reviewer`, `meta_reviewer`; az execution context awaited outputot is a role-bol vezeti le. | high |
| `Actor` | `src/types/bubble.ts#L7`, `src/types/bubble.ts#L124`, `docs/v2/pairflow-v2-architecture-plan-joint.md` | Concrete current runner identity: `codex` vagy `claude`; bubble-config rendeli role-hoz, state pedig `active_agent`-kent tartja nyilvan. | high |
| `AgentConfig`-jellegu current evidence | `src/types/bubble.ts#L188`, `src/v11/shared/start/startCommandPrompts.ts#L133`, `README.md#L84` | First-class `AgentConfig` object nem latszik a current runtimeban. Helyette implicit config knobs vannak (`review_artifact_type`, `reviewer_context_mode`, `pairflow_command_profile`, bubble-config agent assignment, reviewer brief/focus guidance). | medium |

Current-state conclusion:

1. `Role` es `Actor` kulon current-state fogalom.
2. `AgentConfig` current-state evidence szinten `implicit`, nem `first-class`.
3. Emiatt a jovobeli actor runtime interface-ben kulon kell maradnia:
   - workflow role projectionnak,
   - concrete actor runnernek,
   - es a policy/prompt/config decorator retegnek.

## Actor vs Executor Boundary Notes

| Boundary area | Current-state owner | Why it matters for Phase B | Evidence |
|---|---|---|---|
| Canonical actor output schema | actor | Ez mar most jo seed a jovobeli minimalis actor core-hoz. | `src/types/protocol.ts#L166`, `src/cli/commands/agent/emit.ts#L250` |
| Explicit actor authority snapshot | mixed | Actor-facing CLI explicit authorityt ker, de azt bubble/state lookup materializalja. | `src/cli/commands/agent/emit.ts#L379`, `src/core/bubble/actorEmitContext.ts#L24` |
| Protocol envelope parse/validate | actor-facing protocol boundary | Canonical envelope normalization mar kulon retegben van. | `src/core/protocol/envelope.ts#L4`, `src/core/protocol/validators.ts#L1` |
| tmux pane routing / short delivery messages | executor | Ez mar nem canonical actor contract, hanem runtime delivery adapter. | `src/core/runtime/tmuxDelivery.ts#L149` |
| watchdog timeout / liveness escalation | executor | Timeout es liveness policy nem actor capability, hanem runtime observation + lifecycle escalation. | `src/core/runtime/watchdog.ts#L15`, `docs/pairflow-initial-design.md#L103` |
| meta-review submit state mutation + routing | mixed | A current path az actor output validationt es a state/gate mutationt egy command-flowban tartja. | `src/core/bubble/metaReview.ts#L1839` |

## Representative Use-Case Map

| Use case | Current path | Current-state note | Evidence |
|---|---|---|---|
| Implementer -> reviewer handoff | `pairflow agent emit --kind pass` -> shared pass orchestration -> normal pass vagy auto-converge | A `pass` ma canonical actor emit kind, de a downstream flow mar routing/state side effectet vegez. | `src/cli/commands/agent/emit.ts#L285`, `src/v11/shared/pass/emitPassContextBuilder.ts#L51`, `src/v11/shared/pass/passFlowDispatch.ts#L38` |
| Reviewer blocker findings | `pairflow agent emit --kind pass ... --finding ...` | Round 1-ben pass-only reviewer policy; blocker route pass-on megy tovabb. | `src/core/runtime/reviewerCommandGateGuidance.ts#L5`, `src/cli/commands/agent/pass.ts#L64` |
| Reviewer clean / advisory-only outcome | `pairflow agent emit --kind convergence` | Convergence P0/P1-et fail-closed tilt, es round/policy szerint csak reviewer-contextbol elfogadott. | `src/cli/commands/agent/converged.ts#L123`, `src/v11/shared/converged/convergedCommandInputNormalization.ts#L33`, `src/v11/application/converged/convergedRoutingPreparation.ts#L34` |
| Human escalation | `pairflow agent emit --kind human_question` | Kulon canonical actor output kind, sajat orchestration path. | `src/cli/commands/agent/emit.ts#L316`, `src/v11/shared/askHuman/askHumanCommandApi.ts#L10` |
| Autonomous meta-review result | operator: `bubble meta-review run|status|last-report|recover`; actor: `agent emit --kind meta_review_result` | Operator surface es actor submit surface mar szet vannak huzva, de a submit path meg mixed state mutation. | `src/v11/application/metaReview/metaReviewCliOptions.ts#L13`, `src/core/runtime/metaReviewSubmitGuidance.ts#L7`, `src/core/bubble/metaReview.ts#L1761` |
| Removed legacy alias surface | `pass`, `ask-human`, `converged`, `orchestra` | Help-szinten migration guidance, futaskor fail-closed removal. | `src/cli/commands/agent/pass.ts#L161`, `src/cli/commands/agent/askHuman.ts#L84`, `src/cli/commands/agent/converged.ts#L196`, `src/cli/orchestra.ts#L17` |
| Ideation kickoff special case | `bubble kickoff` | Round 0 ideation bubble explicit kickoffot igenyel; task input pontosan egy darab lehet. | `src/v11/application/kickoff/kickoffCliOptions.ts#L25`, `src/v11/application/kickoff/kickoffCliRunner.ts#L41` |
| Resume / restart / watchdog | `bubble resume`, `bubble restart`, `bubble watchdog` | Ezek operator/runtime touchpointok, nem actor core. Resume `HUMAN_REPLY`-t emitel, restart runtimeot ujraindit, watchdog execution-context deadline alapjan monitoroz. | `src/cli/commands/bubble/resume.ts#L23`, `src/v11/application/restart/restartCliCommand.ts#L32`, `src/core/runtime/watchdog.ts#L27` |

## Behavior Inventory Rows

### A. Canonical actor-facing and removed-legacy entry surfaces

| behavior_id | surface_entry_kind | surface | trigger | behavior_scope | role_scope | actor_scope | agent_config_evidence | boundary_owner | alias_status | current_status | target_disposition | summary | source_refs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ACT-ENTRY-CANONICAL-EMIT | actor-facing | `src/cli/commands/agent/emit.ts#L45` | explicit actor CLI invoke | actor-output-entrypoint | role-neutral | configured active actor (`codex` or `claude`) | implicit | actor | none | canonical | core | A canonical actor surface negy kindot fogad, kozos authority-trioval es opcionális guardokkal. | `src/cli/commands/agent/emit.ts#L45`; `src/cli/commands/agent/emit.ts#L250`; `src/cli/commands/agent/emit.ts#L379`; `src/types/protocol.ts#L166` |
| ACT-ENTRY-CLI-ROOT | actor-facing | `src/cli/index.ts#L3` | top-level `pairflow` dispatch | cli-routing | role-neutral + operator mixed | not-applicable | implicit | mixed | none | canonical-but-mixed | adapt | A top-level CLI mar szetvalasztja az actor es bubble/operator command familyket, de ugyanabban az entrypointban elnek. | `src/cli/index.ts#L3`; `src/cli/index.ts#L140`; `src/cli/index.ts#L244` |
| ACT-ENTRY-METAREVIEW-OPS | operator | `src/v11/application/metaReview/metaReviewCliOptions.ts#L13` | human/operator meta-review command invoke | operator-surface | human-operator-only | not-applicable | not-applicable | executor | none | operator-only | adapt | A `bubble meta-review` current canonical operator surface a `run|status|last-report|recover`; az actor submit kulon canonical emit parancs. | `src/v11/application/metaReview/metaReviewCliOptions.ts#L13`; `src/core/runtime/metaReviewSubmitGuidance.ts#L7` |
| ACT-ENTRY-LEGACY-ALIASES | actor-facing | `src/cli/commands/agent/pass.ts#L161` | legacy alias invoke | compatibility-removed | implementer + reviewer | configured active actor | absent | actor | removed-legacy | removed_fail_closed | remove | A regi `pass`, `ask-human`, `converged`, `orchestra` surface-ek mar explicit migration-guided removal errorra allnak. | `src/cli/commands/agent/pass.ts#L161`; `src/cli/commands/agent/askHuman.ts#L84`; `src/cli/commands/agent/converged.ts#L196`; `src/cli/orchestra.ts#L17`; `src/cli/commands/agent/legacyActorCommandRemoval.ts#L1` |

### B. Authority, protocol, and runtime-contact rows

| behavior_id | surface_entry_kind | surface | trigger | behavior_scope | role_scope | actor_scope | agent_config_evidence | boundary_owner | alias_status | current_status | target_disposition | summary | source_refs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ACT-AUTH-EXPLICIT-CONTEXT | runtime-helper | `src/core/bubble/actorEmitContext.ts#L24` | direct canonical emit | authority-materialization | role-neutral | active actor only | implicit | mixed | none | canonical | core | A canonical emit explicit `repo` + `bubble_id` + `handoff_id` authorityt hasznal, majd state fingerprint/role/round guardokkal ellenoriz. | `src/cli/commands/agent/emit.ts#L206`; `src/cli/commands/agent/emit.ts#L386`; `src/core/bubble/actorEmitContext.ts#L24`; `src/core/bubble/actorEmitContext.ts#L132` |
| ACT-AUTH-COMPAT-CWD-LOOKUP | runtime-helper | `src/core/bubble/actorEmitContext.ts#L101` | compatibility adapter needs workspace inference | compat-authority-lookup | role-neutral | configured active actor | absent | mixed | none | compat_adapter_only | remove | Van meg cwd/worktree ancestry alapu compat context lookup helper, de ez mar nem canonical actor path. | `src/core/bubble/actorEmitContext.ts#L101` |
| ACT-PROTOCOL-SCHEMA | actor-facing | `src/types/protocol.ts#L146` | envelope creation / actor emit input parse | protocol-schema | role-neutral | role-neutral actor family | absent | actor | none | canonical | core | A protocol envelope es az `ActorEmitInput` union mar explicit, typed current-state source of truth. | `src/types/protocol.ts#L146`; `src/types/protocol.ts#L166`; `src/core/protocol/envelope.ts#L4`; `src/core/protocol/validators.ts#L1` |
| ACT-RUNTIME-DELIVERY-TARGET | executor-touchpoint | `src/core/runtime/tmuxDelivery.ts#L149` | envelope delivery to pane | runtime-delivery | role-neutral | not-applicable | not-applicable | executor | none | canonical runtime adapter | adapt | A runtime a `payload.metadata.delivery_target_role` alapjan route-ol tmux pane-ra, absent/invalid eseten fallbackkal. | `src/core/runtime/tmuxDelivery.ts#L149`; `docs/pairflow-initial-design.md#L240` |
| ACT-EXECUTION-CONTEXT | runtime-helper | `src/core/state/executionContext.ts#L8` | running actor ownership opens | lifecycle-authority | role-neutral | active actor only | absent | mixed | none | canonical | core | A current running authority `active_role`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` mezokbol all; meta-review kulon awaited outputot kap ugyanebben a modellben. | `src/core/state/executionContext.ts#L8`; `src/core/state/executionContext.ts#L27`; `docs/pairflow-initial-design.md#L97` |

### C. Pass / ask-human / convergence / meta-review behavioral rows

| behavior_id | surface_entry_kind | surface | trigger | behavior_scope | role_scope | actor_scope | agent_config_evidence | boundary_owner | alias_status | current_status | target_disposition | summary | source_refs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ACT-BEH-PASS-FLOW | actor-facing | `src/v11/shared/pass/emitPassContextBuilder.ts#L51` | `agent emit --kind pass` | actor-output-orchestration | implementer + reviewer | active implementer or reviewer | implicit | mixed | none | canonical-but-coupled | adapt | A pass current-state flow normalizal, workspace contextet epit, intentet inferal, majd normal pass vagy auto-converge branchinget vegez. | `src/v11/shared/pass/emitPassContextBuilder.ts#L51`; `src/v11/shared/pass/passFlowDispatch.ts#L38`; `src/v11/application/actorProtocol/emitActorProtocolV11.ts#L82` |
| ACT-BEH-HUMAN-QUESTION | actor-facing | `src/v11/shared/askHuman/askHumanCommandApi.ts#L10` | `agent emit --kind human_question` | actor-output-orchestration | implementer + reviewer | active implementer or reviewer | implicit | actor | none | canonical | core | A human escalation kulon canonical output kind, sajat API/orchestration pathon keresztul. | `src/v11/shared/askHuman/askHumanCommandApi.ts#L10`; `src/v11/application/actorProtocol/emitActorProtocolV11.ts#L97` |
| ACT-BEH-CONVERGENCE-VALIDATION | actor-facing | `src/v11/shared/converged/convergedCommandInputNormalization.ts#L33` | `agent emit --kind convergence` | policy-gated-actor-output | reviewer-only | active reviewer only | implicit | mixed | none | canonical-but-policy-heavy | adapt | A convergence current-state policy P0/P1-et tilt, summary/findings consistencyt ellenoriz, es reviewer-only running contextet kovetel. | `src/v11/shared/converged/convergedCommandInputNormalization.ts#L33`; `src/v11/application/converged/convergedRoutingPreparation.ts#L34`; `src/v11/application/actorProtocol/emitActorProtocolV11.ts#L109` |
| ACT-BEH-METAREVIEW-SUBMIT | actor-facing | `src/core/bubble/metaReview.ts#L1761` | `agent emit --kind meta_review_result` | meta-review-result-submit | meta-reviewer-only | active meta-reviewer authority | implicit | mixed | none | canonical-but-stateful | adapt | A meta-review submit current-state flow egyszerre validalja a structured payloadot, a canonical authority ablakot, a duplicate submitot, es irja a meta-review snapshot/state route-ot. | `src/core/bubble/metaReview.ts#L1761`; `src/core/bubble/metaReview.ts#L1839`; `src/v11/application/actorProtocol/emitActorProtocolV11.ts#L128` |

### D. Guidance, docs, and lifecycle touchpoint rows

| behavior_id | surface_entry_kind | surface | trigger | behavior_scope | role_scope | actor_scope | agent_config_evidence | boundary_owner | alias_status | current_status | target_disposition | summary | source_refs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ACT-GUIDE-STARTUP-PROMPTS | prompt-guidance | `src/v11/shared/start/startCommandPrompts.ts#L97` | bubble start / pane bootstrap | startup-guidance | reviewer + meta-reviewer + implementer | configured pane actor | implicit | actor | none | active guidance | extension | Startup promptok explicit canonical emit usage-t, authority lookupot, docs-only review guardrailokat es meta-review submit parity note-okat tanitanak. | `src/v11/shared/start/startCommandPrompts.ts#L97`; `src/v11/shared/start/startCommandPrompts.ts#L104`; `src/v11/shared/start/startCommandPrompts.ts#L133` |
| ACT-GUIDE-RESUME-KICKOFF | prompt-guidance | `src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts#L17` | bubble resume / resume-kickoff | resume-guidance | implementer + reviewer + meta-reviewer | configured pane actor | implicit | actor | none | active guidance | extension | Resume guidance minden emit elott friss authority lookupot ker, es kulon kezeli az ideation-pending round 0 allapotot. | `src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts#L17`; `src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts#L46`; `src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts#L113` |
| ACT-GUIDE-REVIEWER-GATE | prompt-guidance | `src/core/runtime/reviewerCommandGateGuidance.ts#L5` | reviewer command selection | reviewer-policy-guidance | reviewer-only | active reviewer | implicit | actor | none | active guidance | adapt | A reviewer current-state guidance round-sensitive pass vs convergence routingot tanit, docs-only qualifier note-tal. | `src/core/runtime/reviewerCommandGateGuidance.ts#L5`; `src/core/runtime/reviewerCommandGateGuidance.ts#L41`; `src/core/runtime/reviewerCommandGateGuidance.ts#L71` |
| ACT-LIFECYCLE-KICKOFF | operator | `src/v11/application/kickoff/kickoffCliOptions.ts#L25` | explicit ideation activation | lifecycle-touchpoint | human-operator-only | not-applicable | not-applicable | executor | none | operator-only | adapt | A kickoff current-state special case: round 0 ideation bubble csak explicit task/task-file inputtal aktivolhato; review artifact type nem override-olhato. | `src/v11/application/kickoff/kickoffCliOptions.ts#L25`; `src/v11/application/kickoff/kickoffCliRunner.ts#L41`; `docs/pairflow-initial-design.md#L343` |
| ACT-LIFECYCLE-RESUME | operator | `src/cli/commands/bubble/resume.ts#L23` | operator resumes after `WAITING_HUMAN` | lifecycle-touchpoint | human-operator-only | not-applicable | not-applicable | executor | none | operator-only | adapt | A resume current-stateben default `HUMAN_REPLY` emission + `WAITING_HUMAN -> RUNNING` operator command, nem actor output capability. | `src/cli/commands/bubble/resume.ts#L23`; `docs/pairflow-initial-design.md#L336` |
| ACT-LIFECYCLE-RESTART | operator | `src/v11/application/restart/restartCliCommand.ts#L32` | runtime/session recovery request | runtime-recovery | human-operator-only | not-applicable | not-applicable | executor | none | operator-only | adapt | A restart current-state runtime/session cleanup + ujrainditas surface, nem actor boundary. | `src/v11/application/restart/restartCliCommand.ts#L32`; `README.md#L806` |
| ACT-LIFECYCLE-WATCHDOG | executor-touchpoint | `src/core/runtime/watchdog.ts#L27` | timeout/liveness sampling | runtime-liveness | role-neutral | not-applicable | not-applicable | executor | none | canonical runtime adapter | adapt | A watchdog execution-context `started_at` / `deadline_at` alapjan monitoroz, ideation round 0-t kihagyja, meta-review authorityt is figyeli, es escalation trigger inputot ad. | `src/core/runtime/watchdog.ts#L27`; `docs/pairflow-initial-design.md#L103`; `README.md#L770` |
| ACT-DOCS-SURFACE-CANONICAL | docs-surface | `README.md#L82` | human/operator reading docs | docs-summary-surface | human-operator-only | not-applicable | not-applicable | actor | none | supporting | extension | A README es a historical spec current UX/API summaryt ad a canonical actor emit familyrol, bubble pane topologyrol es kickoff/watchdog special case-ekrol, de nem primary current-state code evidence. | `README.md#L82`; `README.md#L399`; `docs/pairflow-initial-design.md#L38`; `docs/pairflow-initial-design.md#L339` |

## Initial Synthesis: Core vs Extension vs Adapt vs Remove

### Strong `core` candidates

1. Canonical actor emit family mint egyetlen actor-facing entry surface.
2. Explicit authority snapshot (`repo`, `bubble_id`, `handoff_id`, optional guard fields).
3. Typed actor output family (`pass`, `human_question`, `convergence`, `meta_review_result`) mint canonical current-state output-keszlet.
4. Execution-context based authority instead of pane-marker vagy raw shell context.

### Strong `extension` candidates

1. Startup/resume prompt and guidance projection.
2. Docs-only reviewer guardrail es reviewer brief/focus shaping.
3. Human-readable docs surface, amennyiben nem lesz belole authority vagy routing source.

### Strong `adapt` candidates

1. PASS command current-state orchestration, ahol input normalization mar jo, de a routing/state branching tul kozel van az actor command pathhoz.
2. Convergence current policy/gate viselkedes, ahol a reviewer-only validation megmaradhat, de a command-specific flow nem viheto at mechanikusan.
3. Meta-review submit current mixed path, ahol actor output validation es workflow mutation jelenleg egyben van.
4. tmux delivery, watchdog, kickoff/resume/restart operator/runtime touchpointok.

### Strong `remove` candidates

1. Removed legacy alias family (`pass`, `ask-human`, `converged`, `orchestra`) mint runtime entry surface.
2. Compat cwd/worktree authority inference mint canonical actor write path.

## Unknowns and Evidence Gaps

1. `AgentConfig` current-state hatara tovabbra is reszben nyitott. A bubble configben van tobb implicit actor-dekorator (`reviewer_context_mode`, `review_artifact_type`, `pairflow_command_profile`, reviewer brief/focus), de ezek nem egyseges first-class runtime entitasban jelennek meg.
2. A current `pass` es `meta_review_result` flow erosen mixed: az actor-facing command mar most explicit boundary, de a command-flow mogotti routing/state write responsibilities meg nem tisztan actor-kernel split szerint szervezettek.
3. A `delivery_target_role` fallback behavior current-stateben meg runtime-internal compatibility path. A discovery nem bizonyitotta teljes koruen, hogy van-e meg elopersistalt envelope-surface, amely erre tenylegesen tamaszkodik.
4. A docs-only reviewer blocker-policy current-stateben reszben prompt/guidance szinten van kodolva (`CLI --finding` nem tud `timing` / `layer` qualifier-t hordozni). Ez a jovobeli actor core vs policy-extension hatart nyitva hagyja.
5. A `bubble meta-review` operator subtree jelenlegi shape-je current-stateben tiszta operator surface, de a jovobeli generic operator API-ba valo eventualis atvezetes nem current-state, hanem kovetkezo fazisos dontes.

## Informational Comparison Note

1. A v2 architecture tanulsaga, hogy a workflow/kernel tulajdonolja a state transitiont es a capability enforcement a boundaryn tortenik, current-state inventory szerint reszben mar latszik az explicit execution-context authorityban es az alias surface-ek kivezeteseben.
2. Ugyanakkor a current current-state meg nem teljesen v2-szeru: a canonical actor emit path mogott tobb command-flow ma is domain routingot, runtime lookupot vagy state mutationt hordoz.
3. Optional Pi-style extension inspirationt ehhez az inventoryhoz nem hasznaltam kulon sourcekent; a local codebase + binding normativ planok eleg bizonyitekot adtak a current-state row-khoz.

## Phase B Preparation Notes

1. A Phase B capability draft jo kiindulasa lehet:
   - explicit execution context fogadasa,
   - typed actor output emit,
   - human escalation emit,
   - canonical authority guardok,
   - optional findings/policy decorators.
2. Nem jo mechanikus kiindulas:
   - a jelenlegi `pass` / `convergence` command-flow teljes shared orchestration unionja,
   - tmux pane routing,
   - watchdog,
   - operator lifecycle commandok,
   - prompt szovegek mint authorityforras.
3. A legszenzitievebb drift-terulet jelenleg a mixed resz:
   - actor emit current explicit boundary jo,
   - de a downstream routing/state mutation ownership Phase B-ben mar tisztabban kernel/executor/actor felelossegekre kell bontani.
