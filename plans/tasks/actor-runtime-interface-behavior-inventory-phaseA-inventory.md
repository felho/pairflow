# Actor Runtime Interface Behavior Inventory (Phase A)

- `baseline_note`: `analysis_head` a `main` branchen, `HEAD=773275fe6550` alapjan. Az inventory a 2026-04-02T21:56:29Z UTC idoablakban keszult.
- `inspected_source_scope`: actor-facing CLI emit + retained adapters; reviewer PASS policy/verification + validation artifacts; meta-review operator + canonical submit + live runner; lifecycle operator commands (`kickoff`, `start`, `resume`, `restart`, `watchdog`); bubble/worktree lookup; tmux delivery + agent launch; reviewer runtime guidance; public export surface; supporting docs + binding planok.
- `coverage_note`: A Phase A artifact reprezentativ current-state coverage-re optimalizalt. A taskban kijelolt fo surface-csaladok mind kaptak row-szintu vagy use-case-szintu lefedest, de nem minden nested helper es nem minden v11 shared internal kerult kulon row-ba. A `start`/`kickoff`/`meta-review` belso helperhalozatnal a behavior-defining entrypointokra es policy pontokra fokuszaltam.
- `excluded_or_deferred_paths`: Nem keszult teljes helper-by-helper inventory a `src/v11/shared/start/**`, `src/v11/shared/restart/**` es a `src/core/bubble/metaReview.ts` minden belso utility fuggvenyerol; ezekhez csak a jelenlegi use-case-eket kozvetlenul meghatarozo entrypointok es guardok lettek felveve.

## Use-Case Map

1. `implementer pass`
   - Canonical ut: `pairflow agent emit --kind pass ...`
   - Retained adapter: `pairflow pass ...`
   - Code review bubble-ben implementer PASS kozben PASS validation evidence es reviewer compatibility artifact is letrejohet.
2. `reviewer fix-request / validation`
   - Reviewer PASS explicit findings declarationt kovetel.
   - Post-gate nem-blokkolora a canonical PASS mar nem legalis; structured findings vagy canonical convergence kell.
   - Accuracy-critical review `review-verification-input.json` refet is kerhet.
3. `reviewer convergence`
   - Canonical ut: `pairflow agent emit --kind convergence ...`
   - Retained adapter: `pairflow converged ...`
   - P0/P1 finding nem mehet ezen a pathon.
4. `human escalation`
   - Canonical ut: `pairflow agent emit --kind human_question ...`
   - Retained adapter: `pairflow ask-human ...`
5. `meta-review`
   - Operatori surface ma meg kulon `bubble meta-review run|status|last-report|recover`.
   - Canonical actor submit mar `pairflow agent emit --kind meta_review_result ...`.
   - Live run read-only review prompttal es JSON output-contracttal fut.
6. `lifecycle control`
   - `bubble kickoff` aktival ideation bubble-t.
   - `bubble start` worktree + tmux runtimeot indit vagy ujracsatlakozik runtime-state bubble-hoz.
   - `bubble resume` default `HUMAN_REPLY`-t kuld.
   - `bubble restart` runtime ujrainditas.
   - `bubble watchdog` idle timeout alapjan eszkalalhat.

## Behavior Inventory

| behavior_id | surface | trigger | behavior_scope | role_scope | actor_scope | agent_config_evidence | boundary_owner | current_status | target_disposition | source_refs | surface_entry_kind | alias_status | behavior_layers | input_authority | input_shape_or_contract | output_kind_or_effect | side_effects_or_artifacts | target_justification | notes | open_question |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `B001` | `src/cli/commands/agent/emit.ts#L250` | `cli:agent-emit` | `common` | `shared` | `role-bound-agent` | `absent` | `actor` | `canonical` | `core` | `src/cli/commands/agent/emit.ts#L250`<br>`src/cli/commands/agent/emit.ts#L274`<br>`src/cli/commands/agent/emit.ts#L379` | `actor-facing` | `primary` | `entrypoint-parser,emit-path` | `explicit-cli-input` | `flags:kind+repo+bubble-id+handoff-id+kind-specific-fields` | `protocol:canonical-actor-output` | `artifact-write:canonical-emit-path-delegates-to-emitActorProtocolFromWorkspaceV11` | A Phase 4 canonical actor-facing surface mar most is egyetlen `agent emit` multiplexer, explicit authority guardokkal. | A `kind` jelenleg `pass`, `human_question`, `convergence`, `meta_review_result`; opcionális `expected_role`, `expected_round`, `expected_state_fingerprint` guardok is vannak. |  |
| `B002` | `src/cli/commands/agent/pass.ts#L64` | `cli:pass` | `role-specific` | `implementer,reviewer` | `role-bound-agent` | `absent` | `actor` | `transitional` | `remove` | `src/cli/commands/agent/pass.ts#L64`<br>`src/cli/commands/agent/pass.ts#L85`<br>`src/cli/commands/agent/pass.ts#L161`<br>`src/cli/index.ts#L379` | `actor-facing` | `retained-alias` | `entrypoint-parser,emit-path` | `mixed` | `flags:summary+ref+intent+finding/no-findings` | `protocol:pass` | `none:compat-adapter-delegates-to-canonical-pass-emit` | A wrapper explicit compatibility adapter; Phase 4/5 target szerint nem marad primer actor contract. | Repo/bubble/handoff contextet a workspace-bol materializalja, nem explicit CLI authoritybol. |  |
| `B003` | `src/cli/commands/agent/askHuman.ts#L27` | `cli:ask-human` | `common` | `shared` | `role-bound-agent` | `absent` | `actor` | `transitional` | `remove` | `src/cli/commands/agent/askHuman.ts#L27`<br>`src/cli/commands/agent/askHuman.ts#L41`<br>`src/cli/commands/agent/askHuman.ts#L84`<br>`src/cli/index.ts#L866` | `actor-facing` | `retained-alias` | `entrypoint-parser,emit-path` | `mixed` | `flags:question+ref` | `protocol:human_question` | `none:compat-adapter-delegates-to-canonical-human-question-emit` | A canonical human escalation mar `agent emit --kind human_question`; a rovid alias retained transitional path. | A command a compatibility contextet a bubble worktree-bol oldja fel. |  |
| `B004` | `src/cli/commands/agent/converged.ts#L123` | `cli:converged` | `role-specific` | `reviewer` | `role-bound-agent` | `absent` | `actor` | `transitional` | `remove` | `src/cli/commands/agent/converged.ts#L123`<br>`src/cli/commands/agent/converged.ts#L142`<br>`src/cli/commands/agent/converged.ts#L196`<br>`src/v11/domain/pass/reviewerDecision.ts#L36`<br>`src/v11/domain/pass/reviewerDecision.ts#L81` | `actor-facing` | `retained-alias` | `entrypoint-parser,validation-policy,emit-path` | `mixed` | `flags:summary+ref+finding` | `protocol:convergence` | `none:compat-adapter-delegates-to-canonical-convergence-emit` | Post-gate clean vagy advisory-only reviewer outcome canonical surface-e mar a convergence emit; a retained alias elvileg kivezetheto. | A parser fail-closed tiltja a P0/P1 findingeket ezen az uton. |  |
| `B016` | `src/cli/orchestra.ts#L8` | `cli:orchestra-alias` | `common` | `shared` | `role-bound-agent` | `absent` | `actor` | `transitional` | `remove` | `src/cli/orchestra.ts#L6`<br>`src/cli/orchestra.ts#L8`<br>`src/cli/orchestra.ts#L25`<br>`README.md#L409`<br>`README.md#L869` | `actor-facing` | `retained-alias` | `entrypoint-parser,emit-path` | `explicit-cli-input` | `flags:pass-or-ask-human-or-converged-subcommand` | `guidance:top-level-cli-shim-into-agent-subcommands` | `none:shim-delegates-to-runCli-agent-commands` | A `orchestra` top-level shim tiszta compatibility topology; a canonical actor surface-hez kepest nincs sajat domain contractja. | `orchestra pass|ask-human|converged` csak az agent subcommandokat routolja tovabb. |  |
| `B005` | `src/v11/application/pass/reviewerPassPreparation.ts#L43` | `runtime:reviewer-pass-policy` | `role-specific` | `reviewer` | `role-bound-agent` | `absent` | `mixed` | `canonical` | `adapt` | `src/v11/application/pass/reviewerPassPreparation.ts#L43`<br>`src/v11/domain/pass/reviewerDecision.ts#L43`<br>`src/v11/domain/pass/reviewerDecision.ts#L72`<br>`src/core/reviewer/reviewVerification.ts#L333`<br>`src/core/reviewer/reviewVerification.ts#L393` | `runtime-helper` | `none` | `validation-policy,artifact-side-effect` | `mixed` | `artifact:structured-findings-and-review-verification-input` | `validation:reviewer-pass-gate-and-verification-contract` | `artifact-write:review-verification-json` | A policy maga valos, de a jelenlegi CLI finding syntax + post-gate route + artifact binding egy jovo beli capability/policy boundaryba fog atalakulni. | Reviewer PASS explicit findings vagy `--no-findings` deklaraciot kovetel; accuracy-critical reviewben `review-verification-input.json` ref is kotelezo lehet. |  |
| `B006` | `src/v11/application/pass/passValidationGate.ts#L266` | `runtime:implementer-pass-validation` | `role-specific` | `implementer` | `role-bound-agent` | `absent` | `mixed` | `canonical` | `adapt` | `src/v11/application/pass/passValidationGate.ts#L266`<br>`src/core/runtime/passValidationEvidence.ts#L541`<br>`src/core/runtime/passValidationEvidence.ts#L569`<br>`src/core/runtime/passValidationEvidence.ts#L642` | `runtime-helper` | `none` | `validation-policy,artifact-side-effect` | `runtime-derived-context` | `workspace-context:bubbleConfig+worktreePath+artifactsDir` | `artifact:pass-validation-evidence-and-reviewer-compatibility` | `artifact-write:pass-validation-evidence-json+compatibility-json` | A jelenlegi PASS validation evidence valos behavior, de hard validation es trust/policy dontes nem maradhat tisztan actor-oldali helperstrukturakba szorulva. | Csak `implementer` + `review_artifact_type=code` esetben aktiv; policy missing/invalid kulon reasonnel fail-closed. |  |
| `B007` | `src/v11/application/metaReview/metaReviewCliOptions.ts#L13` | `cli:bubble-meta-review` | `role-specific` | `operator` | `human-operator` | `not-applicable` | `executor` | `canonical` | `adapt` | `src/cli/commands/bubble/metaReview.ts#L1`<br>`src/v11/application/metaReview/metaReviewCliOptions.ts#L13`<br>`src/v11/application/metaReview/metaReviewCliDispatcher.ts#L18`<br>`src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts#L23` | `operator` | `primary` | `entrypoint-parser,launch-resume` | `explicit-cli-input` | `flags:id+repo+depth+json+verbose` | `state-projection:run-status-last-report-recover` | `state-write:meta-review-run-or-recover` | A kulon operatori subtree jelenleg aktiv es hasznos, de a binding Phase 5 irany mar rogzitett: csak state-neutral operator surface-kent maradhat, kulonben genericizalni vagy eltavolitani kell. | A `submit` subcommand mar explicitten tiltott; csak `run|status|last-report|recover` elerheto, es ezek sem maradhatnak legacy lifecycle szemantikaval. | A nyitott kerdes mar nem az irany, hanem a vegso operator forma: megtisztitott retained spelling maradjon, generic surface-re olvadjon, vagy teljesen szunjon meg? |
| `B008` | `src/core/bubble/metaReview.ts#L1744` | `cli:agent-emit-meta_review_result` | `role-specific` | `meta_reviewer` | `meta-review-agent` | `implicit` | `mixed` | `canonical` | `core` | `src/core/runtime/metaReviewSubmitGuidance.ts#L7`<br>`src/core/runtime/metaReviewSubmitGuidance.ts#L11`<br>`src/core/bubble/metaReview.ts#L1744`<br>`src/core/bubble/metaReview.ts#L1772`<br>`src/core/bubble/metaReview.ts#L1825`<br>`src/core/bubble/metaReview.ts#L1850` | `actor-facing` | `primary` | `emit-path,validation-policy,artifact-side-effect` | `explicit-cli-input` | `json:round+recommendation+summary+report_json` | `protocol:meta_review_result` | `state-write:gate-route+artifact-write:canonical-meta-review-report` | A protocol-first terv szerint a durable `meta_review_result` canonical actor output, ez jelenleg is konkret current-state behavior. | A submit roundot, recommendationt, summary/report parityt es az aktiv state fingerprintet is guardolja. |  |
| `B009` | `src/core/bubble/metaReview.ts#L1221` | `runtime:meta-review-live-run` | `role-specific` | `meta_reviewer` | `meta-review-agent` | `implicit` | `mixed` | `canonical` | `adapt` | `src/core/bubble/metaReview.ts#L1221`<br>`src/core/bubble/metaReview.ts#L1240`<br>`src/core/bubble/metaReview.ts#L2077`<br>`src/core/bubble/metaReview.ts#L2118` | `prompt-guidance` | `none` | `launch-resume,docs-guidance` | `runtime-derived-context` | `workspace-context:repo+worktree+transcript+state+depth` | `guidance:json-only-meta-review-contract` | `artifact-write:canonical-meta-review-report` | A live runner prompt es JSON contract jelenleg special-case meta-review runtime behavior; targetben inkabb altalanos actor runtime implementation detail lehet. | Read-only reviewot ker, `approve|rework|inconclusive` recommendationnel es schema-kotott JSON kimenettel. |  |
| `B010` | `src/v11/application/start/startCliOptions.ts#L18` | `cli:bubble-lifecycle` | `common` | `operator` | `human-operator` | `not-applicable` | `executor` | `canonical` | `adapt` | `src/v11/application/start/startCliOptions.ts#L18`<br>`src/v11/application/start/startCliRunner.ts#L123`<br>`src/v11/application/kickoff/kickoffCliOptions.ts#L25`<br>`src/cli/commands/bubble/resume.ts#L23`<br>`src/v11/application/restart/restartCliCommand.ts#L22`<br>`src/cli/commands/bubble/watchdog.ts#L24`<br>`src/core/runtime/watchdog.ts#L15` | `operator` | `primary` | `launch-resume,context-resolution` | `explicit-cli-input` | `flags:id+repo+attach+task/task-file+json` | `state-projection:lifecycle-control-and-watchdog` | `state-write:bubble-lifecycle-and-human-escalation` | A lifecycle operator surface maradni fog, de a target modellben nem keveredhet authority-semanticaval vagy actor-runtime boundaryval. | `kickoff` pontosan egy task inputot ker; `resume` default `HUMAN_REPLY`-t kuld; `watchdog` timeout + liveness alapon eszkalal. |  |
| `B011` | `src/core/bubble/workspaceResolution.ts#L176` | `runtime:compat-context-and-bubble-lookup` | `common` | `shared` | `none` | `absent` | `executor` | `canonical` | `adapt` | `src/core/bubble/workspaceResolution.ts#L176`<br>`src/core/bubble/workspaceResolution.ts#L214`<br>`src/core/bubble/bubbleLookup.ts#L84`<br>`src/core/bubble/bubbleLookup.ts#L105` | `executor-touchpoint` | `none` | `context-resolution` | `workspace-derived-context` | `workspace-context:cwd+branch+pairflow-files` | `state-projection:resolved-bubble-config-and-paths` | `none:lookup-only` | A jelenlegi retained adapters es runtime helper-ek implicit workspace feloldasra epitenek; a target actor boundary explicit execution contextet akar. | A branch prefix (`bubble/`, `pf/`) csak hint; tobb match eseten a feloldas fail-closed. |  |
| `B012` | `src/core/runtime/agentCommand.ts#L33` | `runtime:tmux-delivery-and-agent-launch` | `common` | `shared` | `none` | `implicit` | `executor` | `canonical` | `adapt` | `src/core/runtime/agentCommand.ts#L33`<br>`src/core/runtime/pairflowCommand.ts#L56`<br>`src/core/runtime/tmuxDelivery.ts#L202`<br>`src/core/runtime/tmuxDelivery.ts#L247`<br>`src/core/runtime/tmuxDelivery.ts#L305` | `executor-touchpoint` | `none` | `launch-resume,event-relay,docs-guidance` | `runtime-derived-context` | `workspace-context:worktree+session+envelope` | `guidance:tmux-pane-notification-and-launch-command` | `prompt-emission:tmux-delivery-message` | A plan explicitten szet akarja valasztani az actor boundaryt az executor/tmux/process retegtol; ez jelenleg eros current-state coupling. | A delivery message docs-only bubble-knel kulon in-place refinement szabalyokat is beleeget a pane-utasitasba. |  |
| `B013` | `src/core/runtime/reviewerCommandGateGuidance.ts#L5` | `prompt:reviewer-runtime-guidance` | `role-specific` | `reviewer` | `role-bound-agent` | `implicit` | `actor` | `canonical` | `adapt` | `src/core/runtime/reviewerCommandGateGuidance.ts#L5`<br>`src/core/runtime/reviewerGuidance.ts#L3`<br>`src/core/runtime/reviewerSeverityOntology.ts#L11`<br>`src/core/runtime/reviewerScoutExpansionGuidance.ts#L9`<br>`src/core/reviewer/reviewerBrief.ts#L69`<br>`src/core/reviewer/reviewerBrief.ts#L183` | `prompt-guidance` | `none` | `docs-guidance,validation-policy` | `runtime-derived-context` | `prompt-text:reviewer-round-policy-and-briefing` | `guidance:review-routing-severity-and-output-contract` | `prompt-emission:reviewer-brief-and-command-gate-text` | A role-specifikus guidance dekoracio jo bounded extension-jelolt, de a command-gate routing es severity policy nem maradhat pusztan prompt-level authority. | Includes docs-only reviewer selection guidance, embedded severity ontology, scout workflow, reviewer brief/focus reminder. |  |
| `B014` | `src/index.ts#L7` | `docs:package-import` | `common` | `shared` | `none` | `not-applicable` | `mixed` | `canonical` | `adapt` | `src/index.ts#L7`<br>`src/index.ts#L52`<br>`src/index.ts#L97`<br>`src/index.ts#L107`<br>`src/index.ts#L128`<br>`src/index.ts#L169`<br>`src/index.ts#L217`<br>`src/index.ts#L229`<br>`src/index.ts#L360` | `docs-surface` | `primary` | `emit-path,launch-resume,docs-guidance` |  | `none:re-export-surface` | `guidance:programmatic-entrypoints` | `none:module-exports-only` | A public package export surface ma egyszerre tesz lathatova canonical emitet, retained adapterset es bubble runtime helper-eket; Phase B-ben ezt valoszinuleg tisztabban kell retegzni. | Nem actor-facing protocol onmagaban, hanem kevert programmatic/public surface. |  |
| `B015` | `README.md#L399` | `docs:cli-reference` | `common` | `shared` | `none` | `not-applicable` | `mixed` | `transitional` | `adapt` | `README.md#L399`<br>`README.md#L407`<br>`README.md#L808`<br>`README.md#L858`<br>`docs/pairflow-initial-design.md#L44`<br>`docs/pairflow-initial-design.md#L230`<br>`docs/pairflow-initial-design.md#L246` | `docs-surface` | `none` | `docs-guidance` | `docs-derived-context` | `prompt-text:human-readable-cli-and-runtime-summary` | `guidance:current-ux-and-historical-baseline` | `none:reference-surface-only` | Supporting docs surface kell a discoveryhez, de nem kezelheto current-state source-code authoritykent. | A README aktualis UX/CLI osszefoglalo; az initial design historical baseline es retained terminologyforras. |  |

## Target Disposition Synthesis

### `core`

1. `B001` canonical `agent emit` multiplexer.
2. `B008` canonical `meta_review_result` submit.

### `remove`

1. `B002` retained `pass` alias.
2. `B003` retained `ask-human` alias.
3. `B004` retained `converged` alias.
4. `B016` retained `orchestra pass|ask-human|converged` aliascsalad.

### `adapt`

1. `B005` reviewer PASS gate + verification artifact contract.
2. `B006` implementer PASS validation evidence path.
3. `B007` bounded meta-review operator subtree cleanup.
4. `B009` meta-review live runner prompt/runtime behavior.
5. `B010` lifecycle operator commands.
6. `B011` implicit workspace/bubble resolution.
7. `B012` tmux delivery + worktree-pinned agent launch.
8. `B013` reviewer guidance bundle.
9. `B014` public export surface.
10. `B015` supporting docs surface.

## Actor-vs-Executor Boundary Notes

1. A canonical actor output surface (`B001`, `B008`) mar elvalik a retained aliasoktol, de a retained wrappers meg mindig implicit workspace contextre epitenek (`B002`, `B003`, `B004`, `B011`).
2. A lifecycle, tmux delivery, worktree pinning es watchdog logika ma egyertelmuen executor/runtime concern (`B010`, `B011`, `B012`), meg ha user-facing CLI-ben is jelenik meg.
3. A reviewer policy/guidance area jelenleg atmeneti actor/runtime keverek: van benne valodi actor output policy (`B005`), artifact/validation side effect (`B006`) es prompt-level steering (`B013`).
4. A target plan explicitten tiltja, hogy a jovo beli actor interface authority-, lifecycle- vagy executor-felelosseget vegyen at. Ref: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L31`, `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L34`, `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L105`.

## Normative vs Informational Synthesis

### Binding normative takeaway

1. A discovery plan szerint a jovobeli actor runtime interface-et nem a mai command-unionbol, hanem capability-first protocol boundarybol kell levezetni. Ref: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L27`, `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L29`.
2. Az actor boundary es executor boundary kulon absztrakcio. A process/workspace/sync/relay/liveness retegek nem keverhetok az actor runtime interface-szel. Ref: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L34`, `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md#L180`.
3. Phase 4 canonical actor surface-ja az explicit `agent emit`; a retained aliasok legfeljebb adapterek. Ref: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md#L164`, `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md#L166`, `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md#L370`, `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md#L406`.
4. Phase 5 default iranya a retained actor aliasok es meta-review special-case topology eltavolitasa vagy genericizalasa. Ref: `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md#L104`, `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md#L116`, `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md#L172`, `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md#L200`.

### Informational v2 takeaway

1. A v2 anyag expliciten kulon kezeli a `Role`, `Actor` es `AgentConfig` fogalmat, es a kernelt teszi a policy/capability boundary tulajdonosava. Ref: `docs/v2/pairflow-v2-architecture-plan-joint.md#L11`, `docs/v2/pairflow-v2-architecture-plan-joint.md#L13`, `docs/v2/pairflow-v2-architecture-plan-joint.md#L85`, `docs/v2/pairflow-v2-architecture-plan-joint.md#L109`.
2. A channel/executor reteg csak relay/adapter legyen; a kernel ne lasson channel-specifikus struktukat. Ez erositi azt a Phase A megfigyelest, hogy a mai tmux/pane/worktree couplings inkabb executor concernok. Ref: `docs/v2/pairflow-v2-architecture-plan-joint.md#L159`, `docs/v2/pairflow-v2-architecture-plan-joint.md#L173`, `docs/v2/pairflow-v2-architecture-plan-joint.md#L214`.

### Optional Pi inspiration

1. Ebben a Phase A inventory passban nem hasznaltam kulso Pi-style extension forrast. Ez tudatosan `non-blocking` maradt.

## Explicit Unknowns

1. A `bubble meta-review run|status|last-report|recover` operator surface megtisztitott retained spellinggel maradjon-e, generic operator surface-re olvadjon-e, vagy teljesen megszunjon a canonical actor submit mellett.
2. A public package export surface mennyire maradjon szeles a Phase B capability-contract utan, es mennyit kell belole canonical actor boundaryra vs operator/runtime helper modulokra szetvagni.
3. A reviewer command-gate es severity guidance mely resze maradjon prompt-level steering, es mely reszt kell kesobb explicitebb kernel/policy contractta formalizalni.
