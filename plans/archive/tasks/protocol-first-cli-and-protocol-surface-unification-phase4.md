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
  - src/v11/application/pass/passCommandContract.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/shared/askHuman/askHumanCommandContract.ts
  - src/v11/shared/converged/convergedCommandTypes.ts
  - src/types/protocol.ts
  - src/core/protocol/envelope.ts
  - src/core/protocol/validators.ts
  - src/core/agent/pass.ts
  - src/core/agent/askHuman.ts
  - src/core/agent/converged.ts
  - src/core/bubble/workspaceResolution.ts
  - src/core/bubble/bubbleLookup.ts
  - src/core/bubble/repoResolution.ts
  - src/core/bubble/metaReview.ts
  - src/core/runtime/pairflowCommand.ts
  - src/core/runtime/metaReviewSubmitGuidance.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/start/startCommandImplementerPrompts.ts
  - src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts
  - src/v11/shared/start/startCommandResumeImplementerPrompt.ts
  - plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md
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
  - tests/core/bubble/workspaceResolution.test.ts
  - tests/core/bubble/bubbleLookup.test.ts
  - tests/core/runtime/pairflowCommand.test.ts
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Protocol-First CLI and Protocol Surface Unification (Phase 4)

## L0 - Policy

### Goal

Egysegesiteni az actor-facing CLI es protocol emission surface-t ugy, hogy az implementer, reviewer es meta_reviewer ugyanazon canonical actor-output boundaryn kuldjon durable protocol outputot, mikozben a `bubble ...` namespace operatori lifecycle felulet marad.
Phase 4 sikeres, ha a `pass`, `ask-human`, `converged`, `bubble meta-review submit` es `orchestra` command family mar nem sajat domain semantics hordozok, hanem legfeljebb explicit transitional compatibility adapterek a kozos canonical actor-emission surface folott.
Ez a fazis surface-unification fazis: a retained compatibility call-spellingek Phase 4-ben megmaradhatnak, de nem maradhatnak co-canonical vagy first-principle nelkul megorzott meta-review special case-ek. A vegleges alias- es subtree-cleanup Phase 5 scope.

### Context

1. Phase 3 utan a bubble domain mar kozos running authority modellre epulhet, de a CLI surface tovabbra is tobb, kulon fejlodott actor entrypointbol all.
2. `src/cli/index.ts` ma kulon top-level actor commandokat, `agent ...` aliasokat, `bubble meta-review submit` actor-submit utat, valamint kulon `orchestra` alias surface-t tart fenn.
3. `pass`, `ask-human` es `converged` kulon parser/help/dispatch formaban elnek, mikozben a meta-review submit tovabbra is operatori `bubble` namespace alatt maradt, noha actor output.
4. Runtime promptok, help text-ek es README peldak meg mindig actor-specifikus commandokat ajanlanak primer surface-kent.
5. Ez parser driftet, docs driftet es meta-review special-case gondolkodast tart eletben, ami Phase 5 cleanup elott felesleges compatibility feluleteket hagy a rendszerben.
6. A jelenlegi actor-write pathok reszben tovabbra is implicit shell/worktree contextbol (`cwd`, worktree ancestry, env fallback) probaljak feloldani a bubble/repo authorityt, ami runtime-couplingot es lifecycle-beragadasnak latszo hibakat okozhat, ha a subprocess elveszti a vart munkakonyvtarat.

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
7. Minden retained legacy spellingrol explicitten ki kell mondani, hogy transitional compatibility path; Phase 4-ben nem maradhat olyan legacy surface, amelyet a docs/help/prompt primary vagy vele egyenrangu ajanlaskent tanit.
8. A meta-review actor output kulon kezelese csak explicit first-principle indoklassal maradhatna fenn; torteneti namespace vagy rollout-inercia onmagaban nem erv.
9. A canonical actor write contract explicit context contract legyen: a repo/bubble/handoff authority ne a shell `cwd`-jebol vagy env-bol kovetkezzen, hanem explicit canonical input mezokent jelenjen meg.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - public CLI/interface contract actor-facing es operatori feluleteken,
   - backward-compat contract kulso automation, scriptelt caller es runtime-integracio szamara, ameddig retained legacy spellings adapterkent megmaradnak,
   - retained `bubble meta-review submit` caller-compatibility inventory es removal-path contract a checked-in `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` artifacton keresztul,
   - actor-output normalization es durable protocol emission contract,
   - meta-review actor submission contract,
   - runtime prompt/help/guidance contract,
   - README es architecture-doc command model contract.
3. Compatibility risk note:
   - a retained actor command spellings Phase 4-es adapterre szukitese szandekosan megorzi a kulso automation caller-ek es runtime-integraciok atmeneti mukodeset,
   - ugyanakkor explicit inventoryt es de-emphasis-t igenyel, kulonben a docs es a public contract tovabbra is co-canonical surface-kent tanitana ezeket a retained pathokat.

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
2. `compatibility adapter command` = olyan legacy entrypoint, amely a `transitional compatibility command path` konkret command-formaja: csak argument-normalizalast vegez, majd valtoztatlan domain semantics mellett a canonical actor emission surface-re tovabbit.
3. `operator surface` = emberi lifecycle vagy inspection commandok (`bubble ...`), amelyek nem actor-originated protocol outputot formalizalnak.
4. `actor output kind` = a canonical actor-emission input kozos `kind` mezoye, amely explicitten megkulonbozteti a handoffot, human kerdest, convergence-t es meta-review resultot.
5. `shared emission boundary` = kozos normalization + validation + dispatch reteg, amelyen minden actor-facing output atmegy, es amelynek eredmenye a durable protocol append vagy azzal ekvivalens canonical actor-result persistence.
6. `transitional compatibility command path` = retained command spelling vagy alias-hivas, amely Phase 4-ben csak migration-safety vagy UX-bridge okbol marad eletben, de nem canonical es nem tanithato primer surface-kent.
7. `first-principle justification` = olyan explicit erveles, amely bizonyitja, hogy egy retained command path kulon letezese a target modellben is szukseges a payload-shape, operator workflow, kulso integracio vagy biztonsagi boundary miatt; puszta torteneti elozo allapot nem eleg.
8. `retained legacy spelling` = olyan korabbi command-spelling vagy alias, amely futtathato maradhat, de csak adapter-only transitional compatibility command pathkent.
9. `caller-compatibility inventory` = explicit required-now evidence, amely felsorolja a meg letezo runtime/scripted caller-eket, megindokolja, miert nem migralhatok Phase 4-ben, es rogzitett Phase 5 migration/removal pathot ad minden retained kivetelhez; ennek canonical checked-in home-ja ebben a taskban a `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md`.
10. `explicit actor context` = a canonical actor-emission input kozos authority-resze: kotelezo minimumkent `repo`, `bubble_id`, `handoff_id`, valamint opcionális fail-closed guard mezkent `expected_role`, `expected_round`, `expected_state_fingerprint` vagy ezekkel ekvivalens canonical mezok. A `repo` ugyanazt a repository authorityt jeloli, amelyre a lifecycle lookup es append/persistence tortenik; a `bubble_id` ugyanennek a repo-authoritynak a bubble-azonositoja; a `handoff_id` ugyanennek az aktiv handoff/append targetnek az azonositoja. Ezeket a canonical path teljesen materializalt bemenetkent kapja, nem szabad oket a shared emission boundaryban ujra kitalalni.
11. `transitional context helper` = adapter-only helper vagy resolver-reteg, amely legacy `cwd`/worktree/env forrasokbol legfeljebb explicit canonical actor-contextet allit elo a shared emission boundary elott; nem canonical public contract es nem tarthat fenn sajat policy- vagy persistence-agat.

### Phase 4 Surface Decision

1. A Phase 4 canonical actor-facing CLI-je `pairflow agent emit` legyen.
2. `pairflow pass`, `pairflow ask-human`, `pairflow converged`, `pairflow agent pass|ask-human|converged`, `pairflow bubble meta-review submit`, valamint `orchestra pass|ask-human|converged` Phase 4-ben legfeljebb transitional compatibility adapterkent maradhatnak.
3. `pairflow bubble meta-review run|status|last-report|recover` operatori `bubble` surface marad; ezek nem actor-emission entrypointok.
4. A canonical emit input legalabb egy role-neutral `kind` mezot, kozos `refs[]` surface-t, explicit kind-specific payload contractot, valamint explicit actor-context authority mezoket hordozzon.
5. Az explicit actor-context authority Phase 4 canonical minimuma: `repo`, `bubble_id`, `handoff_id`; fail-closed guardkent `expected_role`, `expected_round`, `expected_state_fingerprint` vagy ezekkel ekvivalens canonical mezok is tamogatottak legyenek.
6. A canonical actor surface primer szerzodeskent ne tamaszkodjon `cwd`, worktree ancestry vagy env-feloldasra; az ilyen bubble-context inference legfeljebb transitional compatibility fallback lehet.
7. A `meta_review_result` ugyanazon shared emission boundaryn menjen at, mint a tobbi actor output; nem maradhat kulon bubble-submit special case.
8. Runtime guidance, promptok, help text-ek es docs primary peldai a canonical actor surface-re mutassanak; retained legacy formak legfeljebb explicit transitional compatibility megjegyzesben szerepelhetnek.
9. A top-level vagy alias actor commandok nem tarthatnak meg sajat policy-validaciot, sajat dispatch-agat vagy sajat domain error-szemantikat.
10. Phase 4 nem vezethet be uj meta-review-specifikus actor-facing subtree-t vagy uj bubble-namespace actor write pathot.
11. Az `orchestra` retained alias surface csak a meglevo `pass|ask-human|converged` actor outputokra terjedhet ki; nem nohet generic `emit`, operatori `bubble`, vagy meta-review-specifikus write surface iranyaba.

### Explicit Actor-Context Rules

1. A canonical `pairflow agent emit` CLI mar a parser/application boundaryra erve teljesen materializalt `repo` + `bubble_id` + `handoff_id` authorityt vigyen tovabb; a shared emission boundary nem vegezhet masodik bubble/worktree/context feloldast.
2. A canonical actor-context mezoinek ugyanabbol a logikai authority-snapshotbol kell szarmazniuk: tilos kulon forrasbol osszerakott `repo`/`bubble_id`/`handoff_id` triot a shared boundaryra engedni.
3. Ha a canonical path explicit `repo`/`bubble_id`/`handoff_id` mezoket kap, azok az authoritative inputok akkor is, ha a process `cwd`-je, worktree ancestry-je vagy env-je mast sugall; nincs implicit override vagy "jobb talalat" keresese.
4. A `expected_role`, `expected_round`, `expected_state_fingerprint` guard mezok ugyanahhoz az authority-snapshothhoz kotodjenek, mint a `repo`/`bubble_id`/`handoff_id`; stale vagy reszleges guard eseten fail-closed viselkedes kell.
5. A retained legacy adapterek hasznalhatnak `transitional context helper` reget ahhoz, hogy shell/worktree/env alaprol explicit canonical actor-contextet allitsanak elo, de ezt meg a shared emission boundary elott, egyetlen materializalt context object formaban kell megtenniuk.
6. Ha egy retained adapter csak reszleges vagy egymasnak ellentmondo authorityt tud eloallitani, a hivas explicit adapter-hibaval alljon le; tilos a hianyzo mezoket a canonical pathon implicit lookupkal vagy legacy direct-path fallbackkal potolni.

### Transitional Compatibility Policy

1. `TCP1`: A retained legacy spellings csak addig maradhatnak Phase 4-ben, ameddig ez a migration-biztonsagot vagy a fokozatos atallast szolgalja; a retained status mindenhol explicit transitional jelolest kapjon.
2. `TCP2`: Minden retained legacy actor commandnak veszteseg nelkul a canonical `pairflow agent emit` input-shape-re kell mapelnie meg a domain validation/diszpatch elott.
3. `TCP3`: Help text, runtime prompt, README es architecture docs nem kezelhetik a retained legacy parancsokat co-primary feluletkent; ha szerepelnek, compatibility note vagy migration note formaban szerepeljenek.
4. `TCP4`: A retained aliasok vagy subcommandok teljes torlese nem Phase 4 acceptance criterion, kiveve ha egy adott pathrol kiderul, hogy nem mappelheto first-principle szerint a canonical actor surface-re.
5. `TCP5`: Ha a `bubble meta-review submit` barmilyen Phase 4 retained formaja megmarad, annak indoklasat a lossless adapter-szerep es a Phase 5 removal-path szintjen kell leirni; kulon meta-review domain branch nem maradhat.
6. `TCP6`: Az `orchestra` retained surface Phase 4-ben csak bounded alias-layer lehet: a scope-ja explicit inventoryval rogzitett, es minden ezen kivuli command explicit unsupported marad.
7. `TCP7`: A legacy adapterek ideiglenesen hasznalhatnak `transitional context helper` reteget `cwd`/worktree/env alapjan bubble-context feloldashoz, hogy explicit canonical actor-contextet allitsanak elo, de ez nem valhat a canonical `agent emit` szerzodes reszeve, es Phase 5-re cleanup scope.

### Retained Submit Justification

1. A retained `bubble meta-review submit` Phase 4-ben csak explicit first-principle justification mellett elfogadhato.
2. A retained exception csak akkor vedheto, ha a Phase 4 deliverable resze egy explicit caller-compatibility inventory, amely:
   - kizarolag a jelenlegi scripted caller, automation vagy kulso integracio call-site-okat sorolja fel, amelyek tenylegesen meg `bubble meta-review submit` spellinget hivnak,
   - minden callerhez rogzit egy Phase 4-ben ervenyes first-principle indokot, hogy miert nem migralhato azonnal canonical `agent emit --kind meta_review_result` formara,
   - minden callerhez Phase 5 migration vagy removal pathot rendel,
   - nulla caller eseten explicitten kimondja, hogy a retained exception nem indokolhato tovabb,
   - a runtime guidance, prompt, help text vagy README-emlites onmagaban nem szamithat retained caller-evidence-nek; ezek legfeljebb migration note vagy docs-drift evidence lehetnek.
3. A fenti inventory canonical checked-in artifactja `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md`; a retained exception nem tekintheto bizonyitottnak, ha ez a file hianyzik, nincs frissitve, vagy nem tartalmaz caller-szintu migration/removal pathot.
4. A Phase 4 implementationban, ha az inventory nulla védhető callert mutat, a retained `bubble meta-review submit` write pathot ki kell vezetni ahelyett, hogy docs/help/runtime szövegekkel próbálná meg igazolni a kivételt.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/index.ts` + `src/cli/commands/agent/emit.ts` + `src/v11/application/pass/passCommandContract.ts` + `src/v11/shared/askHuman/askHumanCommandContract.ts` + `src/v11/shared/converged/convergedCommandTypes.ts` + `src/v11/application/converged/runConvergedFlowContract.ts` | canonical actor CLI routing and context contract | `runCli(argv: string[]) -> Promise<number>`, `runAgentEmitCommand(args: string[], cwd?: string) -> Promise<ActorEmitResult | null>` | top-level CLI dispatch + uj `agent emit` entrypoint | Bevezeti a canonical actor-facing `agent emit` entrypointot explicit actor-context contracttal; a legacy actor command family innentol ugyanarra a shared emission boundaryra route-ol, es nem tarthat fenn kulon domain dispatch pathot vagy implicit shell-contextre epulo canonical authority-feloldast | P1 | required-now | Phase 4 coverage checklist explicit actor entrypoint unificationt kovetel |
| CS2 | `src/cli/commands/agent/pass.ts` + `src/cli/commands/agent/askHuman.ts` + `src/cli/commands/agent/converged.ts` + `src/cli/commands/agent/shared/findingParser.ts` + `src/cli/orchestra.ts` | legacy actor adapters | legacy `parse...CommandOptions(...)`, `run...Command(...)` helpers -> parsed input / result | legacy top-level, `agent ...`, valamint `orchestra ...` surfaces | A legacy actor commandok csak compatibility adapterkent maradnak: sajat UX-parse megtarthato, de a vegso normalized input ugyanarra a canonical emit boundaryra menjen, es sem parseren tulmutato validation, sem sajat domain dispatch ne maradjon bennuk; a shared finding parser scope-ja is ide tartozik, mert a `pass`/`converged` adapter parity es fail-closed mapping contractjat kozosen hordozza. A retained adaptereknek a legacy shell/worktree contextbol is explicit canonical `repo`/`bubble_id`/`handoff_id` mezoket kell eloallitaniuk a shared boundary elott. | P1 | required-now | Phase 4 retirement cel: actor-specifikus command semantics megszuntetese |
| CS3 | `src/cli/commands/bubble/metaReview.ts` + `src/v11/application/metaReview/metaReviewCliCommand.ts` + `src/v11/application/metaReview/metaReviewCliOptions.ts` + `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | meta-review operator vs actor split | `runBubbleMetaReviewCommand(args, cwd?) -> Promise<BubbleMetaReviewCommandResult | null>` | `bubble meta-review` subcommand family | A `run|status|last-report|recover` operatori surface maradjon a `bubble` namespace alatt; a `submit` nem maradhat primer actor-facing path. Ha a caller-compatibility inventory nem igazol retained kivételt, a `submit` write pathot ki kell vezetni, es a CLI explicit canonical migration guidance-dal fail-closed hibát adjon a `pairflow agent emit --kind meta_review_result` irányába. | P1 | required-now | Phase 4 explicitten rendezi a human-facing vs actor-facing CLI boundaryt |
| CS4 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` + `src/types/protocol.ts` + `src/core/protocol/envelope.ts` + `src/core/protocol/validators.ts` | canonical actor emit schema anchor | `emitActorProtocolFromWorkspace(input: ActorEmitInput, deps?) -> Promise<ActorEmitResult>` | uj kozos actor-emission application boundary + protocol validation | Az `ActorEmitInput` vagy vele ekvivalens canonical input-union legyen az egyetlen schema-anchor a `pass`, `human_question`, `convergence` es `meta_review_result` output kindokhoz, kozos mezokkel (`kind`, `repo`, `bubble_id`, `handoff_id`, opcionális `refs[]`) es kind-specifikus payloadokkal; fail-closed guard mezkent `expected_role`, `expected_round`, `expected_state_fingerprint` vagy ezekkel ekvivalens canonical mezok is tamogatottak legyenek. Nincs kulon meta-review submit parser/domain shortcut es nincs implicit `cwd`-authority a canonical schema reszekent. | P1 | required-now | Phase 4 target: same generic surface fedje a result es human-escalation emissiont |
| CS5 | `src/core/agent/pass.ts` + `src/core/agent/askHuman.ts` + `src/core/agent/converged.ts` + `src/core/bubble/metaReview.ts` | shared execution backend ownership and adapter consumption | actor-output writers / submit executors -> typed results | durable protocol emit, meta-review result persistence backend | A jelenlegi actor-specific core pathok kozos kind-handler vagy adapter szerepre szukoljenek; a meta-review submit authority ugyanazon shared actor-emission policyhoz igazodjon, mint a tobbi actor output. A CS5 scope a mar materializalt canonical actor-contextet fogyaszto backend ownershipre korlatozodik; a shell/worktree/env authority-feloldas ownershipe kulon a `CS10` helper boundaryhoz tartozik. | P1 | required-now | meta-review submit Phase 4-ben nem maradhat kulon submit/gate special case, es a helper ownershipet el kell valasztani a writer ownershiptol |
| CS6 | `src/core/runtime/metaReviewSubmitGuidance.ts` + `src/core/runtime/tmuxDelivery.ts` + `src/v11/shared/start/startCommandPrompts.ts` + `src/v11/shared/start/startCommandImplementerPrompts.ts` + `src/v11/shared/start/startCommandResumeKickoffMessageBuilders.ts` + `src/v11/shared/start/startCommandResumeImplementerPrompt.ts` | runtime guidance and prompt text | prompt/help text builders -> `string` | startup promptok, resume promptok, tmux delivery guidance, meta-review submit usage text | Minden runtime guidance a canonical actor surface-t ajanlja primer utnak; legacy command family legfeljebb compatibility note-kent jelenhet meg, actor-specifikus primer command-ajnalas nem maradhat | P1 | required-now | Phase 4 coverage checklist explicitten emliti a guidance/prompt/help text cleanupot |
| CS7 | `README.md` + `docs/pairflow-initial-design.md` | docs and help boundary sync | markdown | user-facing usage es architecture leiras | A docs rogzitsek, hogy a human-facing bubble lifecycle surface kulon all az actor-emission surface-tol, es hogy a canonical actor output immar egyetlen generic emit boundaryn megy at | P1 | required-now | docs drift itt mar contract-level blocker |
| CS8 | `tests/cli/passCommand.test.ts` + `tests/cli/askHumanCommand.test.ts` + `tests/cli/convergedCommand.test.ts` + `tests/cli/orchestra.test.ts` + `tests/cli/bubbleMetaReviewCommand.test.ts` + `tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts` + `tests/contracts/v11/pass.contract.runner.ts` + `tests/contracts/v11/askHuman.contract.runner.ts` + `tests/contracts/v11/converged.contract.runner.ts` + `tests/contracts/v11/metaReviewSubmitCoverage.test.ts` | regression and contract coverage | vitest / contract runners | CLI parity, adapter parity, canonical emit contract | A tesztek igazoljak, hogy a canonical emit boundary az egyetlen domain path, a legacy parancsok csak adapterek, es a meta-review submit ugyanarra a contractra all at, mint a tobbi actor output | P1 | required-now | Phase 4 exit criteria csak explicit CLI/contract coverage mellett ellenorizheto |
| CS9 | `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` | retained submit caller inventory artifact | checked-in markdown inventory | task-owned compatibility evidence artifact | A retained `bubble meta-review submit` exceptionhez egyetlen canonical checked-in inventory tartozik, amely caller-szinten felsorolja a jelenlegi runtime/scripted/automation usage-t, a Phase 4-ben ervenyes first-principle okot, az ownert, es a Phase 5 migration/removal pathot; inventory hianyaban a retained exception nem vedheto | P1 | required-now | retained exception csak konkret inventoryval lehet implementable |
| CS10 | `src/core/bubble/workspaceResolution.ts` + `src/core/bubble/bubbleLookup.ts` + `src/core/bubble/repoResolution.ts` + `src/core/runtime/pairflowCommand.ts` | transitional context helper boundary | `resolveActorContextForEmit(...) -> ActorContext | typed failure` vagy ezzel ekvivalens helper boundary | retained adapterek altal hasznalt context materializalas | A shell/worktree/env alapu bubble-context feloldas legfeljebb egy adapter-only helperben tortenhet, amely teljes `repo`/`bubble_id`/`handoff_id` triot ad vissza, es opcionálisan ugyanebbol a resolved authority-snapshotbol szarmazo `expected_role`/`expected_round`/`expected_state_fingerprint` guard mezoket is materializalhat. Ha a helper nem tud teljes authority-triot vagy ugyanebbol a snapshotbol szarmazo guardokat eloallitani, explicit typed hibaat ad vissza. A canonical `agent emit` path ezt a helperteget nem tekintheti implicit authority-forrasnak, csak a retained adapter altal mar materializalt contextet fogadhatja el. | P1 | required-now | az explicit actor-context contract implementalhatosaga ettol a boundarytol fugg |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Canonical actor-facing CLI entrypoint | tobb kulon actor command family (`pass`, `ask-human`, `converged`, `bubble meta-review submit`) | egyetlen canonical `pairflow agent emit` entrypoint | `kind`, `repo`, `bubble_id`, `handoff_id` | `refs`, `json` vagy mas output-mode kapcsolo, `expected_role`, `expected_round`, `expected_state_fingerprint` | additive in Phase 4, legacy commands adapter-only | P1 | required-now |
| Canonical actor emit input schema | kindonkent szetszort CLI/payload elvarasok + implicit shell/worktree contextfeloldas | egyetlen schema-anchor (`ActorEmitInput` vagy ekvivalens canonical input-union) | kozos: `kind`, `repo`, `bubble_id`, `handoff_id`; `pass`: `summary`; `human_question`: `question`; `convergence`: `summary`; `meta_review_result`: `round`, `recommendation`, `summary`, `report_json` | kozos: `refs[]`, `expected_role`, `expected_round`, `expected_state_fingerprint`; `pass`: `intent`, `findings`, `no_findings`; `convergence`: `findings`; `meta_review_result`: `rework_target_message` | legacy spellings ugyanebbe a schema-anchorba mapelnek | P1 | required-now |
| Canonical actor context authority | a repo/bubble authority reszben implicit `cwd`/worktree/env inference-bol szarmazik | explicit actor-context contract az egyetlen canonical actor write authority | `repo`, `bubble_id`, `handoff_id` | `expected_role`, `expected_round`, `expected_state_fingerprint` | implicit inference legfeljebb transitional adapter helper lehet | P1 | required-now |
| Canonical actor-context provenance | a context mezoinek eredete commandonként eltero es reszben osszekevert | egyetlen materializalt authority-trio ugyanabbol a snapshotbol | `repo`, `bubble_id`, `handoff_id` ugyanahhoz a resolved handoff/bubble authorityhoz kotve | opcionális `expected_role`, `expected_round`, `expected_state_fingerprint` ugyanennek a snapshotnak a guardjai | retained adapter helper eloallithatja, canonical path nem szamolhatja ujra | P1 | required-now |
| Handoff output kind | `pairflow pass` command-specific payload | `agent emit --kind pass` vagy ezzel ekvivalens canonical input | `summary` | `intent`, `findings`, `no_findings`, `refs` | legacy `pass` adapter only | P1 | required-now |
| Human escalation output kind | `pairflow ask-human` command-specific payload | `agent emit --kind human_question` vagy ezzel ekvivalens canonical input | `question` | `refs` | legacy `ask-human` adapter only | P1 | required-now |
| Convergence output kind | `pairflow converged` command-specific payload | `agent emit --kind convergence` vagy ezzel ekvivalens canonical input | `summary` | `findings(P2/P3 only)`, `refs` | legacy `converged` adapter only | P1 | required-now |
| Meta-review result output kind | `pairflow bubble meta-review submit` kulon parser es kulon namespace alatt | `agent emit --kind meta_review_result` vagy ezzel ekvivalens canonical input | `round`, `recommendation`, `summary`, `report_json` | `rework_target_message`, `refs` | legacy `bubble meta-review submit` adapter only | P1 | required-now |
| Operator meta-review surface | `bubble meta-review` alatt actor es operator subcommandok keverednek | `bubble meta-review` canonical operator surface-je csak `run|status|last-report|recover`; a retained `submit` explicit transitional adapter-exception | operator command-specific mezok | `verbose`, `json`, `repo` | behavior tightening; retained `submit` nem operator canonical path, hanem adapter-only exception | P1 | required-now |
| Retained submit caller inventory | retained `bubble meta-review submit` kivetel narrativ indoklassal vedett | checked-in `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` inventory gate-eli a retained exceptiont | caller azonosito vagy call-site, current command spelling, Phase 4-ben miert nem migralhato, Phase 5 removal/migration path | owner, artifact ref, migration note | ha inventory hianyzik vagy zero-caller mellett nincs mas first-principle ok, a retained exception nem maradhat | P1 | required-now |
| Legacy alias surface | top-level actor commandok es `orchestra` kvazi primer surface-kent is szerepelnek | compatibility-only adapter surface | legacy command spellings | optional deprecation diagnostics | transitional compatibility only | P1 | required-now |
| Orchestra alias boundary | `orchestra` historical alias surface, implicit scope without explicit cap | bounded retained alias layer | tamogatott retained spellings inventoryja (`pass`, `ask-human`, `converged`) | optional removal/deprecation diagnostics | explicit unsupported minden egyeb surface-re | P1 | required-now |
| Transitional documentation contract | docs/help/prompt kevert primer peldakat mutatnak canonical es legacy surface-ekkel | a canonical actor path az egyetlen primary peldasor; retained legacy emlites csak compatibility note | canonical example commands, actor/operator boundary statement | migration note, deprecation wording | transitional compatibility explicitly labeled | P1 | required-now |
| Compatibility adapter mapping contract | retained legacy spellings eltero CLI-payload shape-eket hordoznak | field-exact canonical mapping a schema-anchorra | minden retained pathnak meg kell adnia a canonical mezok teljes megfelelteteset | CLI-only sugar, ha a canonical mezok erintetlenek maradnak | adapter-only, sajat domain path nelkul | P1 | required-now |
| Transitional context helper contract | tobb legacy entrypoint sajat `cwd`/worktree/env lookup viselkedest hordoz | egyetlen adapter-only helper materializalja a canonical actor-contextet | teljes `repo` + `bubble_id` + `handoff_id` vagy explicit typed hiba | opcionális, ugyanebbol a resolved authority-snapshotbol szarmazo `expected_role`, `expected_round`, `expected_state_fingerprint`, valamint debug/provenance info, ha nem resze a public contractnak | helper csak retained adapterben hasznalhato; canonical path nem fallbackol ra | P1 | required-now |

Normative rules:

1. Phase 4 utan a canonical actor write surface egyetlen shared emission boundary legyen; a command spelling nem valtoztathatja meg a domain policyt.
2. A legacy actor commandok csak argument-normalizalo compatibility adapterek lehetnek; sajat validation/diszpatch/orchestrator logika nem maradhat bennuk.
3. A `bubble meta-review submit` nem maradhat primer actor-facing contract; ha ideiglenesen retained, annak pontosan a `meta_review_result` canonical inputra kell mapelnie.
4. A state-, role-, round- es findings-policy validacio minden actor output kind eseteben a shared emission boundaryn fusson.
5. Az `orchestra` nem vezethet be uj actor command semantics-et; Phase 4-ben csak compatibility alias vagy kivezetes lehet.
6. A runtime promptok, help text-ek es docs primary peldai a canonical actor surface-t hasznaljak.
7. A canonical actor-output input-unionnak explicitten le kell fednie mind a result emissiont, mind a human escalation/request emissiont.
8. A meta-review result Phase 4-ben ugyanazon canonical actor-output csalad resze; kulon bubble-submit authority branch nem maradhat.
9. Retained compatibility path csak akkor engedett, ha explicit transitional jelolest kap es nem jelenik meg co-canonical surface-kent.
10. Ha barmely retained meta-review-specific shape nem irhato le a canonical `agent emit` kind/payload contracttal, azt explicit first-principle gapkent kell dokumentalni; csendes special-case megtartas nem engedett.
11. Minden retained adapterhez field-level mapping tabla vagy azzal ekvivalens explicit contract kell: mely legacy option mely canonical mezore megy, es van-e vesztesegmentes 1:1 megfeleltetes.
12. Az `orchestra` boundary explicitten zart: a task csak a retained `pass|ask-human|converged` aliasokat kezeli, minden mas orchestra-surface Phase 4-ben unsupported vagy out-of-scope.
13. Az operator-only tiltas a canonical `bubble meta-review run|status|last-report|recover` surface-re vonatkozik; a retained `bubble meta-review submit` Phase 4-ben kulon, adapter-only compatibility exception, nem operator canonical path.
14. A retained `bubble meta-review submit` csak akkor megengedett, ha explicit first-principle justification es kulso caller-compatibility erv tamasztja ala; enelkul a retained exception Phase 4-ben sem tarthato fenn.
15. A kulso caller-compatibility erv csak akkor elegseges, ha a checked-in `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` inventory bizonyitja, mely runtime/scripted caller-ek maradnak retained spellingsen, miert nem migralhatok Phase 4-ben, es hogyan szunnek meg legkesobb Phase 5-ben.
16. A canonical `agent emit` primer szerzodeskent nem tamaszkodhat `cwd`, worktree ancestry vagy env-bol kovetkeztetett bubble authorityra; ha retained adapterhez ilyen helper kell, azt explicit transitional compatibility helperkent kell megnevezni.
17. A canonical `repo`, `bubble_id`, `handoff_id` mezoknek ugyanabbol a resolved authority-snapshotbol kell szarmazniuk; mixed-source context nem engedett.
18. Ha retained adapter csak reszleges vagy ellentmondo contextet tud eloallitani, a hivasnak explicit adapter-hibaval kell megallnia; tilos a hianyzo authorityt a shared emission boundaryban csendben kipotolni.
19. Ha a canonical `agent emit` explicit inputja es a shell/worktree/env jelek elternek, az explicit input marad authoritative, az implicit jelek legfeljebb diagnosztikai jelleggel rögzíthetők; nincs post-parse re-resolution.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI routing | `agent emit` bevezetese es legacy actor commandok adapterre szukitese | tobb primer actor-facing dispatch path eletben tartasa | a routing topology egyszerusitese a cel | P1 | required-now |
| Legacy command adapters | UX-parse es explicit mapping a canonical inputra | sajat domain validation, sajat dispatch, sajat error-policy | compatibility csak parser-level lehet | P1 | required-now |
| Meta-review command family | operatori `run|status|last-report|recover` megtartasa | `submit` mint primer actor-facing bubble command | operator vs actor boundary itt kritikus | P1 | required-now |
| Protocol persistence | shared actor-output boundary altali append/persistence | command-spellingtol fuggo eltero durable write path | identical domain effect kell canonical es legacy entrypointrol | P1 | required-now |
| Runtime guidance | canonical actor emit surface ajanlasa | legacy actor commandok primer ajanlasa | prompt/help drift megszuntetese kotelezo | P1 | required-now |
| Docs/README | canonical actor/operator boundary dokumentalasa | regi mixed command model active-flow leiraskent | docs Phase 4-ben contract resz | P1 | required-now |
| Alias surface | `orchestra` compatibility alias megtarthato atmenetileg | kulon `orchestra` business logic, kulon parser policy | lehetoleg minimalis alias-layer maradjon | P2 | required-now |
| Orchestra alias boundary | explicit retained alias inventory es unsupported-scope deklaralas | hallgatolagos scope-bovules vagy implicit future-surface | a historical alias ne nojon vissza secondary CLI-vé | P1 | required-now |
| Retained submit compatibility evidence | checked-in `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` inventory a retained exceptionhez | retained submit kivetel inventory vagy removal-path nelkul | az exception Phase 4-ben csak bizonyitott migration-safety mellett vedheto | P1 | required-now |
| Transitional compatibility | retained spellings callablek maradhatnak, ha adapter-only es explicitten transitionalek | retained spellings primer, co-canonical vagy sajat policy-branchkent fenntartasa | a removal Phase 5 scope, de a de-emphasis Phase 4 kotelezettseg | P1 | required-now |

Constraint:

1. Ha a legacy `pass`, `ask-human`, `converged` vagy `bubble meta-review submit` path tovabbra is kulon domain code pathon megy at, a Phase 4 feladat nincs teljesitve.
2. Ha a docs/help/prompt a retained legacy actor pathokat tovabbra is primer vagy a canonical felulettel egyenrangu surface-kent mutatja, a Phase 4 feladat nincs teljesitve.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| canonical `agent emit` hivasbol hianyzik vagy ervenytelen a `kind` | CLI parser | throw | explicit schema/option error; nincs legacy commandra valo visszaeses | `ACTOR_EMIT_OPTIONS_INVALID` | error | P1 | required-now |
| canonical `agent emit` hivasbol hianyzik a `repo`, `bubble_id` vagy `handoff_id` | CLI parser | throw | explicit authority-contract error; nincs implicit `cwd`/env bubble lookup a canonical pathon | `ACTOR_EMIT_CONTEXT_REQUIRED` | error | P1 | required-now |
| kind-specific kotelezo mezo hianyzik (`summary`, `question`, `report_json`, stb.) | shared emission validator | throw | explicit typed validation error; nincs command-specific fallback | `ACTOR_EMIT_SCHEMA_INVALID` | error | P1 | required-now |
| canonical actor emit guard mezo (`expected_role`, `expected_round`, `expected_state_fingerprint`) stale vagy nem egyezik | shared emission validator + domain policy | throw | explicit stale-authority error; nincs shell-context retry vagy legacy bypass | `ACTOR_EMIT_CONTEXT_STALE` | error | P1 | required-now |
| canonical actor emit context mezoi mixed-source authorityra vagy snapshot-szakadasra utalnak | shared emission validator + domain policy | throw | explicit authority-coherence error; az incoherence-detektalas a `repo`/`bubble_id`/`handoff_id` triot es az opcionális guard mezok snapshot-forrasat vagy fingerprintjet ugyanazon authority-resolution eredmenyhez hasonlitja, es elteres eseten a shared boundary nem fogad el osszerakott contextet | `ACTOR_EMIT_CONTEXT_INCOHERENT` | error | P1 | required-now |
| legacy adapter nem tud 1:1 canonical inputot generalni | compatibility adapter | throw | explicit adapter error; tilos a regi kozvetlen domain pathot meghivni | `ACTOR_EMIT_COMPAT_ADAPTER_INVALID` | error | P1 | required-now |
| transitional context helper reszleges vagy ellentmondo `repo`/`bubble_id`/`handoff_id` authorityt adna vissza | compatibility adapter + transitional context helper | throw | explicit helper/adaptor error; nincs hianyzo mezopótlás a canonical pathon | `ACTOR_EMIT_COMPAT_ADAPTER_INVALID` | error | P1 | required-now |
| actor-originated output operatori-only bubble commandon keresztul erne a domain pathot | CLI boundary | throw | reject; actor output csak canonical actor surface-en vagy annak compatibility adapteren mehet | `ACTOR_EMIT_OPERATOR_SURFACE_FORBIDDEN` | error | P1 | required-now |
| `bubble meta-review submit` retained compatibility path hivodik | compatibility adapter | result | ugyanaz a canonical shared emit result terjen vissza, nincs kulon bubble-submit domain branch | N/A | info | P1 | required-now |
| `orchestra` nem tamogatott commanddal hivodik | alias CLI | throw | explicit unsupported-command error; nincs uj alias-semantika | `ORCHESTRA_COMMAND_UNSUPPORTED` | error | P1 | required-now |
| canonical explicit context es shell/worktree/env jelek elternek | CLI parser + diagnostics | result | az explicit canonical context megy tovabb authoritative inputkent; az implicit jelek legfeljebb diagnosztikai adatkent maradhatnak | N/A | info | P1 | required-now |
| state/role/round/policy invalid egy actor output kindhoz | shared emission validator + domain policy | throw | ugyanaz a typed validation error minden entrypointon | existing shared reason code vagy normalized actor-emission error | error | P1 | required-now |
| docs/prompt/help update elmarad a canonical boundary bevezetese mellett | docs/runtime guidance | fallback | task nem tekintheto kesznek docs es prompt sync nelkul | N/A | warn | P1 | required-now |
| retained meta-review path olyan payloadot vagy policyt igenyel, amely nem fejezheto ki canonical `agent emit` contracttal | compatibility mapping | throw | explicit gap / first-principle justification required; nincs silent meta-review special-case retention | `META_REVIEW_RESULT_CANONICAL_MAPPING_MISSING` | error | P1 | required-now |

Path-specific failure semantics:

1. `throw` itt typed CLI/validation/domain hibat jelent; nem engedett csendes regi-path fallback.
2. `result` compatibility adapter eseten ugyanazt a canonical domain kimenetet jelenti, mint amit a `pairflow agent emit` visszaadna.
3. Error-policy parity kotelezo: ugyanaz a policysertes ugyanarra a shared reason-code csaladra fusson vissza, fuggetlenul a command spellingtol.
4. A transitional compatibility nem jelent masodik canonical surface-t; retained command sikeres futasa sem valtoztathatja meg a canonical boundary vagy a docs-first guidance statuszat.
5. Az `ACTOR_EMIT_OPERATOR_SURFACE_FORBIDDEN` a canonical operator surface-ekre vonatkozik; nem irja felul a Phase 4-ben explicit retained `bubble meta-review submit` adapter-exceptiont.
6. A `ACTOR_EMIT_COMPAT_ADAPTER_INVALID` Phase 4-ben elfogadhato kozos transitional reason-code csalad maradhat mind az altalanos adapter-mapping, mind a helper-materialization hibakra; kulon code-szetszedes legfeljebb later-hardening follow-up.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` Phase 4 target architecture es coverage checklist | P1 | required-now |
| must-use | Phase 3 generic running authority contract, mint Phase 4 normativ elo-feltetel; ha a branchen meg nincs teljesen leszallitva, azt explicit compatibility elofeltetelként kell kezelni, nem csendes tenykent | P1 | required-now |
| must-use | egyetlen shared actor-emission normalization/validation/dispatch boundary | P1 | required-now |
| must-use | explicit actor-context contract a canonical `agent emit` surface-en (`repo`, `bubble_id`, `handoff_id`; fail-closed guard mezokkel vagy azokkal ekvivalens canonical mezokkel) | P1 | required-now |
| must-use | explicit actor-facing vs operatori CLI boundary | P1 | required-now |
| must-use | runtime prompt/help/docs canonical surface-re allitasa | P1 | required-now |
| must-use | explicit transitional compatibility labeling minden retained actor commandhoz es doc/help emliteshez | P1 | required-now |
| must-use | checked-in `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` caller-compatibility inventory minden retained `bubble meta-review submit` kivetelhez, Phase 5 migration/removal pathokkal | P1 | required-now |
| must-not-use | kulon domain path `pass`, `ask-human`, `converged`, `bubble meta-review submit`, vagy `orchestra` szerint | P1 | required-now |
| must-not-use | `bubble meta-review submit` mint primer actor-facing command Phase 4 utan | P1 | required-now |
| must-not-use | olyan compatibility adapter, amely sajat policy-validaciot vagy sajat routingot tart meg | P1 | required-now |
| must-not-use | implicit `cwd`/worktree/env bubble-context inference mint canonical actor-write contract | P1 | required-now |
| must-not-use | Phase 5 vegleges command/alias torlesenek elorehozatala, ha az megneheziti a biztonsagos atallast | P2 | required-now |
| must-not-use | docs/prompt text, amely tovabbra is a legacy actor command family-t nevezi canonical utnak | P1 | required-now |
| must-not-use | meta-review retained special case explicit first-principle justification nelkul | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | canonical handoff emit path | aktiv implementer vagy reviewer context explicit `repo` + `bubble_id` + `handoff_id` authorityval | `pairflow agent emit --kind pass ...` fut | ugyanaz a PASS durable output es routing jon letre, mint a jelenlegi handoff semantics szerint | P1 | required-now | automated test |
| T2 | canonical human escalation emit path | aktiv actor context explicit actor-context authorityval | `pairflow agent emit --kind human_question ...` fut | HUMAN_QUESTION durable output jon letre a shared boundaryn at | P1 | required-now | automated test |
| T3 | canonical convergence emit path | aktiv reviewer context explicit actor-context authorityval | `pairflow agent emit --kind convergence ...` fut | a convergence ugyanazt a policy-validaciot es routingot kapja, mint a legacy converged, beleertve a finding-severity guardokat | P1 | required-now | automated test |
| T4 | canonical meta-review result emit path | aktiv `meta_reviewer` context Phase 3 authorityval es explicit actor-context mezokkel | `pairflow agent emit --kind meta_review_result ...` fut | a meta-review result ugyanazon canonical actor-emission boundaryn at persistalodik, es nincs kulon bubble-submit special case | P1 | required-now | automated test |
| T5 | legacy pass adapter parity | aktiv actor context | `pairflow pass ...` vagy `pairflow agent pass ...` fut | a legacy entrypoint ugyanarra a canonical emit pathra mapel, es domain-level parity fennmarad | P1 | required-now | automated test |
| T6 | removed legacy meta-review submit path fails closed with migration guidance | operator vagy actor caller a kivezetett retained spellinget probalja hasznalni | `pairflow bubble meta-review submit ...` fut | a CLI explicit, migration-aware typed hibat ad, amely a canonical `pairflow agent emit --kind meta_review_result ...` utra iranyit, es nem route-ol sem operatori, sem legacy domain write pathra | P1 | required-now | automated test |
| T7 | orchestra alias compatibility | aktiv actor context | `orchestra pass|ask-human|converged ...` fut | az alias surface nem tart fenn kulon domain logikat, es a canonical emit pathra megy at | P2 | required-now | automated test |
| T8 | shared validation parity across entrypoints | policysertes vagy invalid payload | canonical es legacy entrypointok meghivodnak | mindegyik ugyanarra a shared validation/error policyra fut ki, nincs legacy-only fallback | P1 | required-now | automated test |
| T9 | operator meta-review surface remains operator-only | bubble operator commandok hasznalatban vannak | `bubble meta-review run|status|last-report|recover` fut | az operatori commandok stabilak maradnak, es actor-emission semantics nem keveredik belejuk; actor submit csak a canonical `agent emit --kind meta_review_result` feluleten marad | P1 | required-now | automated test |
| T10 | runtime prompt and help text canonicalization | frissitett prompt/help builder-ek | startup/resume/meta-review guidance renderelodik | a primary ajanlas a canonical actor emit surface, legacy formak legfeljebb compatibility note-kent latszanak | P1 | required-now | automated test or snapshot test |
| T11 | docs and README command model sync | implementation es docs valtozasok egyutt jelen vannak | docs review fut | a README es az architecture doc explicitten szetvalasztja az actor-facing emit surface-t es az operatori bubble surface-t | P1 | required-now | doc review |
| T12 | retained legacy spellings are explicitly transitional | retained `pass`, `ask-human`, `converged` vagy `orchestra` meg jelen vannak, illetve a removed `bubble meta-review submit` megemlitese latszik | help/docs/prompt output renderelodik | a retained formak nem primary peldak, hanem explicit compatibility note-kent szerepelnek; a removed `bubble meta-review submit` legfeljebb migration note-kent jelenhet meg, mint megszunt spelling | P1 | required-now | automated help snapshot or doc review |
| T13 | meta-review canonical mapping is lossless | canonical `agent emit --kind meta_review_result` ut fut | azonos payload shape kerul a shared boundaryra | nincs meta-review-only mezo, validator vagy persistence shortcut, amely csak a bubble namespace-bol erheto el | P1 | required-now | automated test |
| T14 | actor-output rejection via canonical operator surface | actor-originated outputot canonical operatori `bubble` surface-en keresztul probalnak kuldeni | pl. `bubble meta-review run|status|last-report|recover`, removed `bubble meta-review submit`, vagy mas operatori-only path actor payloadot kap | a CLI explicit `ACTOR_EMIT_OPERATOR_SURFACE_FORBIDDEN`, migration-guided schema hibat, vagy azzal ekvivalens typed hibat ad, es nem route-ol actor domain pathra | P1 | required-now | automated test |
| T15 | canonical actor emit schema required fields | kindonkent a minimal canonical payload van elokeszitve | schema/validator test fut | minden kind pontos required mezokkel elfogadott, hianyzo kotelezo mezo eseten `ACTOR_EMIT_SCHEMA_INVALID` vagy ekvivalens shared hiba jon | P1 | required-now | automated test |
| T15a | canonical actor emit rejects invalid or missing kind option | canonical CLI invocationbol hianyzik a `kind`, vagy nem tamogatott actor output kindet kap | CLI parser fut | explicit `ACTOR_EMIT_OPTIONS_INVALID` vagy ekvivalens schema/option hiba keletkezik, es nincs legacy command fallback | P1 | required-now | automated test |
| T16 | legacy adapter field mapping parity | retained legacy pathok canonical mezokre mappelve futnak | adapter parity test fut | a `summary`, `question`, `round`, `recommendation`, `report_json`, `refs` es egyeb relevans canonical mezok veszteseg nelkul jelennek meg a shared boundaryn | P1 | required-now | automated test |
| T17 | orchestra retained scope stays bounded | `orchestra` retained alias surface hasznalatban van | tamogatott es nem tamogatott orchestra commandok is meghivodnak | csak a rogzitett `pass|ask-human|converged` retained aliasok engedettek; minden mas orchestra-surface explicit unsupported | P1 | required-now | automated test |
| T18 | invalid compatibility adapter mapping rejects legacy path | retained legacy path canonical schema-hiany vagy nem 1:1 mappelheto payload mellett futna | adapter validation fut | a CLI explicit `ACTOR_EMIT_COMPAT_ADAPTER_INVALID` vagy azzal ekvivalens shared adapter-hibat ad, es nem hiv legacy domain branch-et | P1 | required-now | automated test |
| T19 | removed meta-review submit spelling fails closed without silent fallback | removed `bubble meta-review submit` spellinget probalnak Phase 4-ben tovabb hasznalni | parser/migration validation fut | a CLI explicit migration-guided hibat ad, es nem tart fenn silent meta-review special-case-et vagy hidden compatibility branch-et | P1 | required-now | automated test |
| T20 | retained meta-review caller inventory gates removal decision | a checked-in inventory a retained exceptionrol dont | docs/artifact review vagy dedicated inventory check lefut | a `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` inventory explicitten kimondja, hogy nulla vedheto caller miatt a retained exception kivezetesre kerult; removal-path nelkuli retained allitas nem elfogadhato | P1 | required-now | doc review or artifact review |
| T21 | canonical actor emit rejects missing explicit context | canonical actor emit invocationbol hianyzik `repo`, `bubble_id` vagy `handoff_id` | CLI/schema validation fut | explicit `ACTOR_EMIT_CONTEXT_REQUIRED` vagy azzal ekvivalens shared hiba keletkezik, es nincs implicit `cwd`/env bubble lookup | P1 | required-now | automated test |
| T22 | transitional context fallback stays non-canonical | retained legacy adapter bubble-pane-ben fut, de a subprocess elveszti a vart `cwd`-t | compatibility helper bubble-contextet old fel es canonical emit inputot allit elo | a legacy adapter meg tudja alkotni az explicit canonical contextet compatibility helperrel, de a canonical `agent emit` szerzodes tovabbra sem fugg implicit shell-contexttol | P1 | required-now | automated test |
| T23 | canonical explicit context beats shell hints | canonical actor emit explicit `repo` + `bubble_id` + `handoff_id` mezokkel fut, mikozben a `cwd` vagy env mas bubble-re utal | `pairflow agent emit --kind ...` fut | a shared boundary az explicit canonical contextet hasznalja, nincs ujra-feloldas vagy implicit override | P1 | required-now | automated test |
| T24 | partial or conflicting adapter context fails closed | retained legacy adapter csak reszleges (`bubble_id` megvan, `handoff_id` hianyzik) vagy ellentmondo authorityt tud feloldani | legacy `pass`/`ask-human`/`converged` fut | explicit `ACTOR_EMIT_COMPAT_ADAPTER_INVALID` vagy ekvivalens typed hiba jon, es nincs legacy direct-path fallback | P1 | required-now | automated test |
| T25 | context materialization parity across entrypoints | ugyanaz a resolved repo + bubble + handoff authority, ugyanaz az originating actor-role expectation, es ha van, ugyanaz az authority-snapshotbol szarmazo guard-snapshot erheto el canonical es retained entrypointrol is | canonical `agent emit` es barmely retained adapter ugyanarra a logical emissionre fut | a shared boundary mindket esetben ugyanazt a `repo`/`bubble_id`/`handoff_id` triot es ugyanazokat a guard mezoket kapja | P1 | required-now | automated test |
| T26 | guard snapshot coherence is enforced | canonical vagy retained entrypoint guard mezoket kuld, de azok nem ugyanahhoz az authority-snapshothoz tartoznak, mint a `repo`/`bubble_id`/`handoff_id` | emit validation lefut | explicit `ACTOR_EMIT_CONTEXT_INCOHERENT` vagy ekvivalens typed hiba keletkezik, es nincs stale-guard vagy mixed-snapshot atcsuszas | P1 | required-now | automated test |
| T27 | transitional context helper typed failure is surfaced | retained adapter a `transitional context helper` boundaryt hivja, de a helper nem tud teljes authority-triot visszaadni | helper + adapter error-path lefut | a helper typed failure-je elvesztes nelkul adapter-hibakent jelenik meg, es nincs masodik helper/probe vagy legacy direct-path fallback | P1 | required-now | automated test |
| T28 | stale guard snapshot rejects otherwise well-formed context | canonical vagy retained entrypoint teljes `repo`/`bubble_id`/`handoff_id` triot es format-valid guard mezoket kuld, de a guard snapshot mar nem egyezik az aktualis authority-allapottal | shared emission validation + domain policy lefut | explicit `ACTOR_EMIT_CONTEXT_STALE` vagy ekvivalens stale-authority hiba keletkezik, es nem minosul incoherent mixed-source esetnek | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. Javasolt implementacios szelet 1 (Spec Lock 1): `CS1` + `CS4` + `CS8` canonical coverage szelete + `Canonical actor context authority` + `Canonical actor-context provenance` + `T1-T4` + `T15` + `T15a` + `T21` + `T23` + `T26` + `T28`. Eloszor a canonical `agent emit` schema-anchor es explicit actor-context boundary alljon ossze egyetlen authority-modellel, options/schema guarddal, guard-snapshot coherence validacioval es stale-context elvalasztassal.
2. Javasolt implementacios szelet 2 (Spec Lock 2, 4, 6): `CS2` + `CS3` + `CS5` + `CS8` adapter/operator coverage szelete + `CS10` + `Transitional context helper contract` + `TCP6` + `Orchestra alias boundary` + `T5-T9` + `T13` + `T14` + `T16` + `T17` + `T18` + `T19` + `T22` + `T24` + `T25` + `T27`. Ezutan a retained `pass`/`ask-human`/`converged`/`bubble meta-review submit`/`orchestra` surfaces adapter-only szerepre lapithato, kozos context materializalassal, operator-boundary parityval, bounded orchestra alias-scope-pal es typed helper-failure tovabbitassal.
3. Javasolt implementacios szelet 3 (Spec Lock 3, 5): `CS6` + `CS7` + `CS9` + `T10-T12` + `T20`. Vegul a prompt/help/docs sync es a retained-submit inventory zarja le a transitional contractot.
4. [later-hardening] Ha a Phase 4 utan maradnak retained legacy adapterek, Phase 5-ben explicit inventory alapjan egyenkent torolhetoek.
5. [later-hardening] Ha a canonical actor emit CLI tul sok kind-specific mezot kap, kesobb erdemes lehet file-based vagy structured stdin inputot is formalizalni.

## Assumptions

1. A Phase 4-ben elfogadhato egy uj canonical actor-facing CLI entrypoint bevezetese, mikozben a legacy command family ideiglenesen adapterkent megmarad, feltetelezve hogy explicit transitional statuszt kap.
2. A meta-review result canonicalizalasa a plan szerinti Phase 3 authority-contracttal kompatibilis, vagy ha ez a branchen meg nincs teljesen leszallitva, azt explicit compatibility elofeltetelként kell dokumentalni.
3. A `pairflow agent emit` elnevezes elfogadhato canonical surface a jelenlegi `agent` namespace mellett.
4. Nincs olyan bizonyitott Phase 4 kovetelmeny, amely onmagaban megkovetelne uj meta-review-specifikus actor-facing namespace vagy kulon bubble-submit authority fenntartasat.

## Open Questions

1. A retained legacy adapterek adjanak-e explicit deprecation warningot minden sikeres hivasnal, vagy eleg a docs/help szintu de-emphasis?

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Legacy adapter deprecation UX policy | L2 | P2 | later-hardening | Phase 4 open question | Phase 5 elott dontsuk el, kell-e runtime warning vagy eleg a docs-level kivezetes |
| HB2 | Structured actor emit input ergonomia | L2 | P3 | later-hardening | implementation simplification follow-up | Vizsgaljuk meg, kell-e file-based vagy JSON-alapu input a hosszabb payloadokhoz |
| HB3 | Split helper vs adapter invalid reason codes | L2 | P3 | later-hardening | reviewer cosmetic follow-up | Dontsuk el, kell-e kulon reason code a helper-materialization es a generic adapter-mapping hibakra Phase 5 vagy utokovetes korben |

## Review Control

1. Ne fogadjunk el olyan megoldast, ahol a canonical `agent emit` csak uj parancs, de a legacy actor command family tovabbra is kulon domain logikaval el.
2. Ne fogadjunk el olyan Phase 4 implementaciot, amelyben a `bubble meta-review submit` tovabbra is primer actor-facing surface marad.
3. Prompt/help/docs sync hianya Phase 4-ben blocker, mert a runtime es a dokumentacio kulon command-modellt tanitana.
4. `orchestra` Phase 4-ben nem kaphat uj funkcionalis scope-ot; vagy alias, vagy removal-path elokeszites.
5. Ne fogadjunk el olyan retained compatibility megoldast, amely nem mondja ki explicitten a transitional statuszt vagy a Phase 5 cleanup ownershipet.
6. Ne fogadjunk el meta-review retained special case-et explicit first-principle justification nelkul.
7. Ne fogadjunk el olyan canonical emit contractot, amelynek nincs egyetlen schema-anchorja es field-level adapter parity coverage-e.
8. Ne fogadjunk el olyan operatori surface-et, amely actor outputot csendben elfogad vagy legacy write pathra route-ol.
9. Ne fogadjunk el olyan szovegezest, amely osszemossa a canonical operator surface tiltast a Phase 4-ben megengedett retained `bubble meta-review submit` adapter-exceptionnel.
10. Ne fogadjunk el retained `bubble meta-review submit` exceptiont explicit first-principle justification es kulso caller-compatibility erv nelkul.
11. Ne fogadjunk el retained `bubble meta-review submit` exceptiont a checked-in `plans/archive/tasks/protocol-first-cli-and-protocol-surface-unification-phase4-retained-submit-callers.md` inventory nelkul, akkor sem, ha a narrativ indoklas egyebkent hiheto.
12. Ne fogadjunk el olyan explicit actor-context szerzodest, amely nem koveteli meg, hogy a `repo`/`bubble_id`/`handoff_id` es az opcionális guard mezok ugyanabbol az authority-snapshotbol szarmazzanak.
13. Ne fogadjunk el olyan helper-szeletelest, ahol a `CS10` context materialization ownershipe es a `CS5` writer/backend ownershipe osszecsuszik vagy file-szinten ko-canonical marad.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. `CS1` + `CS4` + `Canonical actor context authority` + `Canonical actor-context provenance` + `T1-T4` + `T15` + `T15a` + `T21` + `T23` + `T26` + `T28` alapjan az actor-facing protocol emission egyetlen canonical CLI boundaryn megy at, ehhez egyetlen schema-anchor tartozik, es a canonical actor-write contract explicit, coherence-kotott contextet kovetel.
2. `CS2` + `CS5` + `CS8` + `CS10` + `Transitional context helper contract` + `T5-T9` + `T13` + `T16` + `T18` + `T19` + `T22` + `T24` + `T25` + `T27` alapjan a canonical schema, validator es regression coverage bizonyitja, hogy a legacy `pass` / `ask-human` / `converged` / retained `bubble meta-review submit` surfaces legfeljebb explicit transitional compatibility adapterek, vesztesegmentes canonical mappinggel vagy explicit fail-closed hibaval; barmely implicit bubble-context helper csak adapter-level transitional fallback marad.
3. `TCP1` + `TCP2` + `TCP3` + `CS6` + `CS7` + `T10-T12` alapjan a retained legacy spellings explicit transitional statuszt kapnak, canonical mappinghez kotottek, es a runtime prompt/help/docs primary peldai tovabbra is a canonical actor surface-re mutatnak.
4. `CS3` + `T9` + `T14` alapjan a `bubble meta-review run|status|last-report|recover` canonical operator surface marad, es actor outputot nem fogad el; a retained `submit` kulon adapter-exception, nem operatori write path.
5. `CS3` + `CS9` + `TCP4` + `TCP5` + `Retained Submit Justification` + `T13` + `T19` + `T20` alapjan a retained alias/subcommand megtartas csak addig ervenyes, ameddig lossless canonical mappinggel vagy explicit fail-closed gapjelzessel first-principle szerint vedheto; a retained `bubble meta-review submit` exception kulso caller-compatibility inventoryval is bizonyitott.
6. `TCP6` + `Orchestra alias boundary` + `T17` alapjan az `orchestra` retained scope bounded alias-layer marad, es nem noveli vissza a historical secondary CLI surface-t.
