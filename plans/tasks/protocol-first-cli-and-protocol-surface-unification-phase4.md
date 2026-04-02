---
artifact_type: task
artifact_id: task_protocol_first_cli_and_protocol_surface_unification_phase4_v1
title: "Protocol-First CLI and Protocol Surface Unification (Phase 4)"
status: draft
phase: phase4
target_files:
  - src/cli/index.ts
  - src/cli/orchestra.ts
  - src/cli/commands/agent/emit.ts
  - src/cli/commands/agent/pass.ts
  - src/cli/commands/agent/askHuman.ts
  - src/cli/commands/agent/converged.ts
  - src/cli/commands/agent/shared/findingParser.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/types/protocol.ts
  - src/core/protocol/envelope.ts
  - src/core/protocol/validators.ts
  - src/core/agent/pass.ts
  - src/core/agent/askHuman.ts
  - src/core/agent/converged.ts
  - src/core/bubble/metaReview.ts
  - src/core/runtime/metaReviewSubmitGuidance.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/start/startCommandImplementerPrompts.ts
  - src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts
  - src/v11/shared/start/startCommandResumeImplementerPrompt.ts
  - docs/pairflow-initial-design.md
  - README.md
  - tests/cli/passCommand.test.ts
  - tests/cli/askHumanCommand.test.ts
  - tests/cli/convergedCommand.test.ts
  - tests/cli/orchestra.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts
  - tests/contracts/v11/pass.contract.runner.ts
  - tests/contracts/v11/askHuman.contract.runner.ts
  - tests/contracts/v11/converged.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Protocol-First CLI and Protocol Surface Unification (Phase 4)

## L0 - Policy

### Goal

Egyssegesiteni az actor-facing CLI es protocol emission surface-t ugy, hogy az implementer, reviewer es meta_reviewer ugyanazon canonical actor-output boundaryn kuldjon durable protocol outputot, mikozben a `bubble ...` namespace operatori lifecycle felulet marad.
Phase 4 sikeres, ha a `pass`, `ask-human`, `converged`, `bubble meta-review submit` es `orchestra` command family mar nem sajat domain semantics hordozok, hanem legfeljebb compatibility adapterek a kozos canonical actor-emission surface folott.

### Context

1. Phase 3 utan a bubble domain mar kozos running authority modellre epulhet, de a CLI surface tovabbra is tobb, kulon fejlodott actor entrypointbol all.
2. `src/cli/index.ts` ma kulon top-level actor commandokat, `agent ...` aliasokat, `bubble meta-review submit` actor-submit utat, valamint kulon `orchestra` alias surface-t tart fenn.
3. `pass`, `ask-human` es `converged` kulon parser/help/dispatch formaban elnek, mikozben a meta-review submit tovabbra is operatori `bubble` namespace alatt maradt, noha actor output.
4. Runtime promptok, help text-ek es README peldak meg mindig actor-specifikus commandokat ajanlanak primer surface-kent.
5. Ez parser driftet, docs driftet es meta-review special-case gondolkodast tart eletben, ami Phase 5 cleanup elott felesleges compatibility feluleteket hagy a rendszerben.

### In Scope

1. Egyetlen canonical actor-facing CLI emission surface bevezetese minden actor output-kindra.
2. A legacy actor commandok atallitasa compatibility adapter szerepre, sajat domain logic nelkul.
3. A `bubble meta-review` operatori es actor-facing hataranak explicit rendezese.
4. Kozos actor-output normalization, validation es dispatch boundary bevezetese a durable protocol emissionhoz.
5. Runtime guidance, startup prompt, resume prompt, help text es docs atallitasa a canonical actor surface-re.
6. CLI-, contract- es regression testek frissitese a Phase 4 boundary szerint.

### Out of Scope

1. A legacy actor commandok teljes torlese a codebase-bol.
2. A human-facing `bubble meta-review run|status|last-report|recover` operatori surface megszuntetese vagy teljes UX-redesignja.
3. A Phase 3 domain/state unification ujranyitasa.
4. A Phase 5 teljes legacy-cleanupja (`META_REVIEW_*`, UI/state cleanup, aliasok vegleges torlese).
5. A kesobbi zero-CLI actor adapter runtime future-improvement implementalasa.
6. Approval, commit, merge vagy egyeb human lifecycle command semantics ujratervezese.

### Safety Defaults

1. Egyetlen canonical actor-emission boundary legyen; a command nev vagy aliasa nem valtoztathatja meg a domain validationt vagy routingot.
2. A `bubble` namespace canonical jelentese operatori lifecycle surface; actor output ott legfeljebb compatibility adapterkent maradhat.
3. Minden state-, role-, round- es policy-validacio ugyanazon shared boundaryn fusson, fuggetlenul attol, hogy a hivas legacy vagy canonical entrypointrol erkezett.
4. Runtime guidance, startup prompt, resume prompt es help text nem ajanlhatja a legacy actor command family-t primer utnak.
5. Az `orchestra` surface nem tarthat fenn sajat parser/dispatch/domain logikat; vagy explicit compatibility alias marad, vagy kivezetheto.
6. Ha a canonical actor surface nem tudja veszteseg nelkul lekepezni valamely jelenlegi actor output contractot, a task nincs keszen; silent downgrade nem engedett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - public CLI/interface contract actor-facing es operatori feluleteken,
   - actor-output normalization es durable protocol emission contract,
   - meta-review actor submission contract,
   - runtime prompt/help/guidance contract,
   - README es architecture-doc command model contract.

### Normative Reference Policy

1. `plan_ref`: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - Ez a canonical forras a Phase 4 actor-facing vs human-facing CLI boundaryhoz es az actor-command retirement celhoz.
2. `system_context_ref`: `docs/pairflow-initial-design.md`
   - A bubble lifecycle policy tovabbra is innen jon, ameddig a Phase 4 task explicitten csak a command boundaryt es protocol emission shape-et rendezi at.
3. Precedence rule:
   - ha a jelenlegi command topology ellentmond a Phase 4 actor/operator szetvalasztasnak,
   - ebben a korben a plan Phase 4 target modellje az elsodleges, a mostani command family csak compatibility kiindulasi allapot.

### Terminology Lock

1. `canonical actor emission surface` = az egyetlen actor-facing CLI family, amely minden actor outputot ugyanarra a shared emission boundaryra visz.
2. `compatibility adapter command` = olyan legacy entrypoint, amely csak argument-normalizalast vegez, majd valtoztatlan domain semantics mellett a canonical actor emission surface-re tovabbit.
3. `operator surface` = emberi lifecycle vagy inspection commandok (`bubble ...`), amelyek nem actor-originated protocol outputot formalizalnak.
4. `actor output kind` = a canonical actor-emission input kozos `kind` mezoye, amely explicitten megkulonbozteti a handoffot, human kerdest, convergence-t es meta-review resultot.
5. `shared emission boundary` = kozos normalization + validation + dispatch reteg, amelyen minden actor-facing output atmegy, es amelynek eredmenye a durable protocol append vagy azzal ekvivalens canonical actor-result persistence.

### Phase 4 Surface Decision

1. A Phase 4 canonical actor-facing CLI-je `pairflow agent emit` legyen.
2. `pairflow pass`, `pairflow ask-human`, `pairflow converged`, `pairflow agent pass|ask-human|converged`, `pairflow bubble meta-review submit`, valamint `orchestra pass|ask-human|converged` Phase 4-ben legfeljebb compatibility adapterkent maradhatnak.
3. `pairflow bubble meta-review run|status|last-report|recover` operatori `bubble` surface marad; ezek nem actor-emission entrypointok.
4. A canonical emit input legalabb egy role-neutral `kind` mezot, kozos `refs[]` surface-t es explicit kind-specific payload contractot hordozzon.
5. A `meta_review_result` ugyanazon shared emission boundaryn menjen at, mint a tobbi actor output; nem maradhat kulon bubble-submit special case.
6. Runtime guidance, promptok, help text-ek es docs primary peldai a canonical actor surface-re mutassanak; legacy formak legfeljebb compatibility megjegyzesben szerepelhetnek.
7. A top-level vagy alias actor commandok nem tarthatnak meg sajat policy-validaciot, sajat dispatch-agat vagy sajat domain error-szemantikat.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/index.ts` + `src/cli/commands/agent/emit.ts` | canonical actor CLI routing | `runCli(argv: string[]) -> Promise<number>`, `runAgentEmitCommand(args: string[], cwd?: string) -> Promise<ActorEmitResult | null>` | top-level CLI dispatch + uj `agent emit` entrypoint | Bevezeti a canonical actor-facing `agent emit` entrypointot; a legacy actor command family innentol ugyanarra a shared emission boundaryra route-ol, es nem tarthat fenn kulon domain dispatch pathot | P1 | required-now | Phase 4 coverage checklist explicit actor entrypoint unificationt kovetel |
| CS2 | `src/cli/commands/agent/pass.ts` + `src/cli/commands/agent/askHuman.ts` + `src/cli/commands/agent/converged.ts` + `src/cli/orchestra.ts` | legacy actor adapters | legacy `parse...CommandOptions(...)`, `run...Command(...)` helpers -> parsed input / result | legacy top-level, `agent ...`, valamint `orchestra ...` surfaces | A legacy actor commandok csak compatibility adapterkent maradnak: sajat UX-parse megtarthato, de a vegso normalized input ugyanarra a canonical emit boundaryra menjen, es sem parseren tulmutato validation, sem sajat domain dispatch ne maradjon bennuk | P1 | required-now | Phase 4 retirement cel: actor-specifikus command semantics megszuntetese |
| CS3 | `src/cli/commands/bubble/metaReview.ts` + `src/v11/application/metaReview/metaReviewCliCommand.ts` + `src/v11/application/metaReview/metaReviewCliOptions.ts` + `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | meta-review operator vs actor split | `runBubbleMetaReviewCommand(args, cwd?) -> Promise<BubbleMetaReviewCommandResult | null>` | `bubble meta-review` subcommand family | A `run|status|last-report|recover` operatori surface maradjon a `bubble` namespace alatt; a `submit` nem lehet tovabb primer actor-facing path, legfeljebb compatibility adapter, amely 1:1 a canonical `agent emit --kind meta_review_result` inputra mappel | P1 | required-now | Phase 4 explicitten rendezi a human-facing vs actor-facing CLI boundaryt |
| CS4 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` + `src/types/protocol.ts` + `src/core/protocol/envelope.ts` + `src/core/protocol/validators.ts` | shared actor-output normalization and protocol emission | `emitActorProtocolFromWorkspace(input, deps?) -> Promise<ActorEmitResult>` | uj kozos actor-emission application boundary + protocol validation | Egyetlen shared input-union normalizalja es validalja a `pass`, `human_question`, `convergence` es `meta_review_result` output kindokat, majd durable protocol appendet vagy azzal ekvivalens canonical result persistence-t vegez; nincs kulon meta-review submit parser/domain shortcut | P1 | required-now | Phase 4 target: same generic surface fedje a result es human-escalation emissiont |
| CS5 | `src/core/agent/pass.ts` + `src/core/agent/askHuman.ts` + `src/core/agent/converged.ts` + `src/core/bubble/metaReview.ts` | shared execution backend ownership | actor-output writers / submit executors -> typed results | durable protocol emit es meta-review result persistence backend | A jelenlegi actor-specific core pathok kozos kind-handler vagy adapter szerepre szukoljenek; a meta-review submit authority ugyanazon shared actor-emission policyhoz igazodjon, mint a tobbi actor output | P1 | required-now | meta-review submit Phase 4-ben nem maradhat kulon submit/gate special case |
| CS6 | `src/core/runtime/metaReviewSubmitGuidance.ts` + `src/core/runtime/tmuxDelivery.ts` + `src/v11/shared/start/startCommandPrompts.ts` + `src/v11/shared/start/startCommandImplementerPrompts.ts` + `src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts` + `src/v11/shared/start/startCommandResumeImplementerPrompt.ts` | runtime guidance and prompt text | prompt/help text builders -> `string` | startup promptok, resume promptok, tmux delivery guidance, meta-review submit usage text | Minden runtime guidance a canonical actor surface-t ajanlja primer utnak; legacy command family legfeljebb compatibility note-kent jelenhet meg, actor-specifikus primer command-ajnalas nem maradhat | P1 | required-now | Phase 4 coverage checklist explicitten emliti a guidance/prompt/help text cleanupot |
| CS7 | `README.md` + `docs/pairflow-initial-design.md` | docs and help boundary sync | markdown | user-facing usage es architecture leiras | A docs rogzitsek, hogy a human-facing bubble lifecycle surface kulon all az actor-emission surface-tol, es hogy a canonical actor output immar egyetlen generic emit boundaryn megy at | P2 | required-now | docs drift itt mar contract-level kockazat |
| CS8 | `tests/cli/passCommand.test.ts` + `tests/cli/askHumanCommand.test.ts` + `tests/cli/convergedCommand.test.ts` + `tests/cli/orchestra.test.ts` + `tests/cli/bubbleMetaReviewCommand.test.ts` + `tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts` + `tests/contracts/v11/pass.contract.runner.ts` + `tests/contracts/v11/askHuman.contract.runner.ts` + `tests/contracts/v11/converged.contract.runner.ts` + `tests/contracts/v11/metaReviewSubmitCoverage.test.ts` | regression and contract coverage | vitest / contract runners | CLI parity, adapter parity, canonical emit contract | A tesztek igazoljak, hogy a canonical emit boundary az egyetlen domain path, a legacy parancsok csak adapterek, es a meta-review submit ugyanarra a contractra all at, mint a tobbi actor output | P1 | required-now | Phase 4 exit criteria csak explicit CLI/contract coverage mellett ellenorizheto |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Canonical actor-facing CLI entrypoint | tobb kulon actor command family (`pass`, `ask-human`, `converged`, `bubble meta-review submit`) | egyetlen canonical `pairflow agent emit` entrypoint | `kind` | `refs`, `json` vagy mas output-mode kapcsolo, ha szukseges | additive in Phase 4, legacy commands adapter-only | P1 | required-now |
| Handoff output kind | `pairflow pass` command-specific payload | `agent emit --kind pass` vagy ezzel ekvivalens canonical input | `summary` | `intent`, `findings`, `no_findings`, `refs` | legacy `pass` adapter only | P1 | required-now |
| Human escalation output kind | `pairflow ask-human` command-specific payload | `agent emit --kind human_question` vagy ezzel ekvivalens canonical input | `question` | `refs` | legacy `ask-human` adapter only | P1 | required-now |
| Convergence output kind | `pairflow converged` command-specific payload | `agent emit --kind convergence` vagy ezzel ekvivalens canonical input | `summary` | `findings(P2/P3 only)`, `refs` | legacy `converged` adapter only | P1 | required-now |
| Meta-review result output kind | `pairflow bubble meta-review submit` kulon parser es kulon namespace alatt | `agent emit --kind meta_review_result` vagy ezzel ekvivalens canonical input | `round`, `recommendation`, `summary`, `report_json` | `rework_target_message`, `refs` | legacy `bubble meta-review submit` adapter only | P1 | required-now |
| Operator meta-review surface | `bubble meta-review` alatt actor es operator subcommandok keverednek | `bubble meta-review` csak operatori `run|status|last-report|recover` canonical surface | operator command-specific mezok | `verbose`, `json`, `repo` | behavior tightening; submit actor surface kikerul vagy adapterre zsugorodik | P1 | required-now |
| Legacy alias surface | top-level actor commandok es `orchestra` kvazi primer surface-kent is szerepelnek | compatibility-only adapter surface | legacy command spellings | optional deprecation diagnostics | transitional compatibility only | P1 | required-now |

Normative rules:

1. Phase 4 utan a canonical actor write surface egyetlen shared emission boundary legyen; a command spelling nem valtoztathatja meg a domain policyt.
2. A legacy actor commandok csak argument-normalizalo compatibility adapterek lehetnek; sajat validation/diszpatch/orchestrator logika nem maradhat bennuk.
3. A `bubble meta-review submit` nem maradhat primer actor-facing contract; ha ideiglenesen retained, annak pontosan a `meta_review_result` canonical inputra kell mapelnie.
4. A state-, role-, round- es findings-policy validacio minden actor output kind eseteben a shared emission boundaryn fusson.
5. Az `orchestra` nem vezethet be uj actor command semantics-et; Phase 4-ben csak compatibility alias vagy kivezetes lehet.
6. A runtime promptok, help text-ek es docs primary peldai a canonical actor surface-t hasznaljak.
7. A canonical actor-output input-unionnak explicitten le kell fednie mind a result emissiont, mind a human escalation/request emissiont.
8. A meta-review result Phase 4-ben ugyanazon canonical actor-output csalad resze; kulon bubble-submit authority branch nem maradhat.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI routing | `agent emit` bevezetese es legacy actor commandok adapterre szukitese | tobb primer actor-facing dispatch path eletben tartasa | a routing topology egyszerusitese a cel | P1 | required-now |
| Legacy command adapters | UX-parse es explicit mapping a canonical inputra | sajat domain validation, sajat dispatch, sajat error-policy | compatibility csak parser-level lehet | P1 | required-now |
| Meta-review command family | operatori `run|status|last-report|recover` megtartasa | `submit` mint primer actor-facing bubble command | operator vs actor boundary itt kritikus | P1 | required-now |
| Protocol persistence | shared actor-output boundary altali append/persistence | command-spellingtol fuggo eltero durable write path | identical domain effect kell canonical es legacy entrypointrol | P1 | required-now |
| Runtime guidance | canonical actor emit surface ajanlasa | legacy actor commandok primer ajanlasa | prompt/help drift megszuntetese kotelezo | P1 | required-now |
| Docs/README | canonical actor/operator boundary dokumentalasa | regi mixed command model active-flow leiraskent | docs Phase 4-ben contract resz | P2 | required-now |
| Alias surface | `orchestra` compatibility alias megtarthato atmenetileg | kulon `orchestra` business logic, kulon parser policy | lehetoleg minimalis alias-layer maradjon | P2 | required-now |

Constraint:

1. Ha a legacy `pass`, `ask-human`, `converged` vagy `bubble meta-review submit` path tovabbra is kulon domain code pathon megy at, a Phase 4 feladat nincs teljesitve.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| canonical `agent emit` hivasbol hianyzik vagy ervenytelen a `kind` | CLI parser | throw | explicit schema/option error; nincs legacy commandra valo visszaeses | `ACTOR_EMIT_OPTIONS_INVALID` | error | P1 | required-now |
| kind-specific kotelezo mezo hianyzik (`summary`, `question`, `report_json`, stb.) | shared emission validator | throw | explicit typed validation error; nincs command-specific fallback | `ACTOR_EMIT_SCHEMA_INVALID` | error | P1 | required-now |
| legacy adapter nem tud 1:1 canonical inputot generalni | compatibility adapter | throw | explicit adapter error; tilos a regi kozvetlen domain pathot meghivni | `ACTOR_EMIT_COMPAT_ADAPTER_INVALID` | error | P1 | required-now |
| actor-originated output operatori-only bubble commandon keresztul erne a domain pathot | CLI boundary | throw | reject; actor output csak canonical actor surface-en vagy annak compatibility adapteren mehet | `ACTOR_EMIT_OPERATOR_SURFACE_FORBIDDEN` | error | P1 | required-now |
| `bubble meta-review submit` retained compatibility path hivodik | compatibility adapter | result | ugyanaz a canonical shared emit result terjen vissza, nincs kulon bubble-submit domain branch | N/A | info | P1 | required-now |
| `orchestra` nem tamogatott commanddal hivodik | alias CLI | throw | explicit unsupported-command error; nincs uj alias-semantika | `ORCHESTRA_COMMAND_UNSUPPORTED` | error | P2 | required-now |
| state/role/round/policy invalid egy actor output kindhoz | shared emission validator + domain policy | throw | ugyanaz a typed validation error minden entrypointon | existing shared reason code vagy normalized actor-emission error | error | P1 | required-now |
| docs/prompt/help update elmarad a canonical boundary bevezetese mellett | docs/runtime guidance | fallback | task nem tekintheto kesznek docs es prompt sync nelkul | N/A | warn | P2 | required-now |

Path-specific failure semantics:

1. `throw` itt typed CLI/validation/domain hibat jelent; nem engedett csendes regi-path fallback.
2. `result` compatibility adapter eseten ugyanazt a canonical domain kimenetet jelenti, mint amit a `pairflow agent emit` visszaadna.
3. Error-policy parity kotelezo: ugyanaz a policysertes ugyanarra a shared reason-code csaladra fusson vissza, fuggetlenul a command spellingtol.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` Phase 4 target architecture es coverage checklist | P1 | required-now |
| must-use | Phase 3 generic running authority modell, mint mar meglevo domain kiindulasi pont | P1 | required-now |
| must-use | egyetlen shared actor-emission normalization/validation/dispatch boundary | P1 | required-now |
| must-use | explicit actor-facing vs operatori CLI boundary | P1 | required-now |
| must-use | runtime prompt/help/docs canonical surface-re allitasa | P1 | required-now |
| must-not-use | kulon domain path `pass`, `ask-human`, `converged`, `bubble meta-review submit`, vagy `orchestra` szerint | P1 | required-now |
| must-not-use | `bubble meta-review submit` mint primer actor-facing command Phase 4 utan | P1 | required-now |
| must-not-use | olyan compatibility adapter, amely sajat policy-validaciot vagy sajat routingot tart meg | P1 | required-now |
| must-not-use | Phase 5 vegleges command/alias torlesenek elorehozatala, ha az megneheziti a biztonsagos atallast | P2 | required-now |
| must-not-use | docs/prompt text, amely tovabbra is a legacy actor command family-t nevezi canonical utnak | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | canonical handoff emit path | aktiv implementer vagy reviewer context | `pairflow agent emit --kind pass ...` fut | ugyanaz a PASS durable output es routing jon letre, mint a jelenlegi handoff semantics szerint | P1 | required-now | automated test |
| T2 | canonical human escalation emit path | aktiv actor context | `pairflow agent emit --kind human_question ...` fut | HUMAN_QUESTION durable output jon letre a shared boundaryn at | P1 | required-now | automated test |
| T3 | canonical convergence emit path | aktiv reviewer context | `pairflow agent emit --kind convergence ...` fut | a convergence ugyanazt a policy-validaciot es routingot kapja, mint a legacy converged, beleertve a finding-severity guardokat | P1 | required-now | automated test |
| T4 | canonical meta-review result emit path | aktiv `meta_reviewer` context Phase 3 authorityval | `pairflow agent emit --kind meta_review_result ...` fut | a meta-review result ugyanazon canonical actor-emission boundaryn at persistalodik, es nincs kulon bubble-submit special case | P1 | required-now | automated test |
| T5 | legacy pass adapter parity | aktiv actor context | `pairflow pass ...` vagy `pairflow agent pass ...` fut | a legacy entrypoint ugyanarra a canonical emit pathra mapel, es domain-level parity fennmarad | P1 | required-now | automated test |
| T6 | legacy meta-review submit adapter parity | aktiv meta-review context | `pairflow bubble meta-review submit ...` fut | a legacy bubble-submit csak adapter, a canonical `meta_review_result` path kimenetevel byte-levelen vagy szemantikailag egyezo eredmenyt ad | P1 | required-now | automated test |
| T7 | orchestra alias compatibility | aktiv actor context | `orchestra pass|ask-human|converged ...` fut | az alias surface nem tart fenn kulon domain logikat, es a canonical emit pathra megy at | P2 | required-now | automated test |
| T8 | shared validation parity across entrypoints | policysertes vagy invalid payload | canonical es legacy entrypointok meghivodnak | mindegyik ugyanarra a shared validation/error policyra fut ki, nincs legacy-only fallback | P1 | required-now | automated test |
| T9 | operator meta-review surface remains operator-only | bubble operator commandok hasznalatban vannak | `bubble meta-review run|status|last-report|recover` fut | az operatori commandok stabilak maradnak, es actor-emission semantics nem keveredik belejuk | P1 | required-now | automated test |
| T10 | runtime prompt and help text canonicalization | frissitett prompt/help builder-ek | startup/resume/meta-review guidance renderelodik | a primary ajanlas a canonical actor emit surface, legacy formak legfeljebb compatibility note-kent latszanak | P1 | required-now | automated test or snapshot test |
| T11 | docs and README command model sync | implementation es docs valtozasok egyutt jelen vannak | docs review fut | a README es az architecture doc explicitten szetvalasztja az actor-facing emit surface-t es az operatori bubble surface-t | P2 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a Phase 4 utan maradnak retained legacy adapterek, Phase 5-ben explicit inventory alapjan egyenkent torolhetoek.
2. [later-hardening] Ha a canonical actor emit CLI tul sok kind-specific mezot kap, kesobb erdemes lehet file-based vagy structured stdin inputot is formalizalni.

## Assumptions

1. A Phase 4-ben elfogadhato egy uj canonical actor-facing CLI entrypoint bevezetese, mikozben a legacy command family ideiglenesen adapterkent megmarad.
2. A meta-review result Phase 3 utan mar eleg domain-authority alapot kapott ahhoz, hogy ugyanabba az actor-output csaladba keruljon, mint a tobbi actor output.
3. A `pairflow agent emit` elnevezes elfogadhato canonical surface a jelenlegi `agent` namespace mellett.

## Open Questions

1. A retained legacy adapterek adjanak-e explicit deprecation warningot minden sikeres hivasnal, vagy eleg a docs/help szintu de-emphasis?

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Legacy adapter deprecation UX policy | L2 | P2 | later-hardening | Phase 4 open question | Phase 5 elott dontsuk el, kell-e runtime warning vagy eleg a docs-level kivezetes |
| HB2 | Structured actor emit input ergonomia | L2 | P3 | later-hardening | implementation simplification follow-up | Vizsgaljuk meg, kell-e file-based vagy JSON-alapu input a hosszabb payloadokhoz |

## Review Control

1. Ne fogadjunk el olyan megoldast, ahol a canonical `agent emit` csak uj parancs, de a legacy actor command family tovabbra is kulon domain logikaval el.
2. Ne fogadjunk el olyan Phase 4 implementaciot, amelyben a `bubble meta-review submit` tovabbra is primer actor-facing surface marad.
3. Prompt/help/docs sync hianya Phase 4-ben blocker, mert a runtime es a dokumentacio kulon command-modellt tanitana.
4. `orchestra` Phase 4-ben nem kaphat uj funkcionalis scope-ot; vagy alias, vagy removal-path elokeszites.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. az actor-facing protocol emission egyetlen canonical CLI boundaryn megy at,
2. a legacy `pass` / `ask-human` / `converged` / `bubble meta-review submit` / `orchestra` surfaces legfeljebb compatibility adapterek,
3. a meta-review actor output mar nem bubble-submit special case,
4. a runtime prompt/help/docs primary peldai a canonical actor surface-re mutatnak,
5. a CLI- es contract-testek explicitten bizonyitjak a parityt es a shared validation policyt.
