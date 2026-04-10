---
artifact_type: task
artifact_id: task_actor_runtime_interface_pilot_cutover_phaseE_v1
title: "Actor Runtime Interface Pilot Cutover (Phase E, Implementer-First)"
status: draft
phase: phaseE
target_files:
  - src/core/bubble/actorEmitContext.ts
  - src/core/state/executionContext.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/cli/commands/agent/emit.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - src/v11/shared/pass/passWorkspaceContextPreparation.ts
  - src/v11/shared/askHuman/askHumanWorkspaceContextPreparation.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/cli/askHumanCommand.test.ts
  - tests/core/state/executionContext.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/agent/pass.test.ts
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Pilot Cutover (Phase E, Implementer-First)

## L0 - Policy

### Goal

Induljon el a Phase E implementacios fazisa egy szuk, implementer-first pilot slice-szal ugy, hogy a Phase D migration spine-bol az elso tenyleges cutover mar kodszinten is lathato legyen, de ne nyissa ujra a core boundaryt es ne probalja egy korben atvinni a reviewer/meta-reviewer pathokat.

Ez a task akkor sikeres, ha:
1. az `implementer` canonical emit pathja explicit actor runtime wrapper boundaryn megy at,
2. a pilothoz szukseges delivery/ack boundary explicittebb, mint a mai pane-derived retained topology,
3. a retained tmux/runtime surface observability-only adapter marad,
4. a stale authority, duplicate delivery es restart recovery invariansok az implementer piloton bizonyitottan megmaradnak,
5. a scope nem dagad teljes Phase E rolloutta vagy altalanos runtime-rewrite-ta.

### Context

1. A parent plan Phase E-kent mar a tenyleges pilot cutovert varja el a Phase D docs-only migration spine utan.
2. A merged Phase D terv implementer-first sorrendet rogzitett: elobb az `implementer`, utana a `reviewer`, vegul a `meta_reviewer`.
3. A Phase B contract mar rogziti a minimalis actor core-t: explicit execution context, handoff, protocol snapshot, `result` es `human_input_request`.
4. A Phase C matrix szerint az `implementer` a legkisebb policy-kockazatu pilot, mert nincs reviewer-only convergence gate vagy retained meta-review operator special-case a canonical outputhoz kotve.
5. A jelenlegi kodban a canonical emit path mar reszben explicit: `actorEmitContext`, `emitActorProtocolFromWorkspaceV11`, `executionContext` es az implementer pass/ask-human workspace-prep mar tud authoritative contexttel dolgozni, de retained compat/runtime seam-ek tovabbra is latszanak.

### In Scope

1. Az `implementer` pilot slice implementacios contractja.
2. Az explicit actor runtime wrapper boundary kodszintu megerositese a canonical emit path korul.
3. Az implementerhez szukseges explicit delivery/ack boundary megerositese a retained tmux launch felett.
4. A stale authority, duplicate delivery es restart recovery implementer-szintu parity megorzese.
5. A touched codepathokhoz kotelezo regresszios tesztek es evidence.
6. Minimalis operator-facing dokumentacios frissites, ha a canonical emit/delivery szemantika lathatoan pontosodik.

### Out of Scope

1. Reviewer vagy meta-reviewer teljes Phase E cutover.
2. Teljes retained adapter cleanup.
3. Uj actor primitive vagy uj output family bevezetese.
4. Teljes topology-csere vagy tmux eltavolitasa.
5. Altalanos runtime-seam rewrite a pilothoz szukseges hataron tul.
6. Olyan refaktor, amelynek csak vegallapot-leirasa van, de nincs implementer-pilothoz kotott bizonyiteka.

### Safety Defaults

1. A Phase B core contract a target; ezt a task nem irhatja at.
2. Az actor-write authority explicit marad; implicit `cwd`, pane, shell vagy prompt allapot nem lehet canonical authority-forras.
3. A retained tmux/runtime surface csak observability- es transport-adapter maradhat, nem acceptance- vagy ack-forras.
4. Duplicate masodik delivery nem hozhat letre masodik sikeres elfogadott/running executiont ugyanarra a handoffra.
5. Restart recovery utan csak uj execution authorityval mehet tovabb a flow; a regi authority stale marad.
6. A task implementacios contract, de nem micromanaged refaktor script: kotelezo boundary-ket, invariansokat, evidence-et es tilalmakat rogzit, mikozben a lokalis kodalakitas az implementalora marad.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - actor emit CLI/input contract,
   - actor runtime wrapper invocation contract,
   - implementer delivery/ack boundary semantics,
   - execution-context authority contract,
   - restart/duplicate delivery parity contract.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Phase E pilot-cutover helyenek es a Phase D utani kovetkezo lepesnek.
2. Binding migration input:
   - `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogzitette az implementer-first sorrendet, a wrapper -> delivery/ack -> core freeze -> policy split -> implementer pilot lepessorat, es a bounded policy ownershipot.
3. Binding target contract:
   - `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - Ez az authoritative core boundary.
4. Binding scenario/parity input:
   - `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - Az implementer pilot kotelezo parity inputjai innen jonnek.
5. Binding current-state grounding:
   - `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez mutatja, mely runtime/operator surface-ek maradnak retained adapterek.
6. Precedence rule:
   - target boundaryhoz a Phase B authoritative,
   - pilot sorrendhez es retained ownershiphoz a Phase D authoritative,
   - parity coverage-hez a Phase C authoritative,
   - a kodbeli jelen allapot csak grounding evidence.

### Terminology Lock

1. `implementer pilot` = a Phase E elso, szandekosan szuk actor-cutover slice-a.
2. `wrapper boundary` = az a kodszintu reteg, amely a canonical actor emit inputbol explicit runtime invocation boundaryt kepez.
3. `delivery/ack boundary` = az a gepi boundary, amely explicitten kulon kezeli a trigger, acceptance/rejection es launch-allapot visszajelzest.
4. `retained adapter` = olyan runtime/operator surface, amely Phase E pilot alatt megmaradhat, de nem canonical authority.
5. `parity evidence` = olyan teszt vagy runtime bizonyitek, amely igazolja, hogy az implementer pilot nem serti a canonical viselkedest.
6. `implementer-first slice` = olyan Phase E feladat, amely csak az `implementer` pathot viszi at, es tudatosan nem terjeszkedik a tobbi actorra.
7. `human_question` = current transport/CLI emit kind a human-input kerdeshez; ennek canonical targetje a Phase B szerinti `human_input_request` output family.

### Deliverable Shape Lock

1. A kotelezo deliverable az implementer `pass` es human-input (`human_question` transport shape -> `human_input_request` canonical family) canonical emit ut explicit wrapper + explicit authority + explicit delivery/ack boundary melletti kodszintu megerositese.
2. A kotelezo bizonyitas az automated parity evidence a `T1`-`T7` matrix szerint; a task nem zarhato le puszta codepath-atnevezessel vagy doc-only rationale-lal.
3. `README.md` es `docs/pairflow-initial-design.md` csak akkor kotelezoen touched, ha az implementacio user-visible canonical authority-, ack- vagy retained-adapter szemantikaja tenylegesen valtozik vagy pontosodik.
4. Nem kotelezo minden frontmatter `target_files` elemet modositani; a lista implementation surface-budget, nem "minden felsorolt file-hoz nyulni kell" checklista.
5. Ha a pilot sikeres es nincs user-visible operatori szemantika-valtozas, a docs diff elhagyhato; ezt az implementacio summarynek explicitten ki kell mondania.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/actorEmitContext.ts` | canonical actor authority materialization | Az implementer emit path canonical authority-snapshotja maradjon explicit es fail-closed; Phase E-ben az implementer pilot ne dependaljon workspace-derived compat authorityra mint canonical route-ra | P1 | required-now | T1, T3 |
| CS2 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | actor runtime wrapper entry | Az implementer `pass` es human-input emit a wrapper boundary canonical route-ja legyen; a current `human_question` transport shape a Phase B target szerinti `human_input_request` family-re mapeljen, uj output family nelkul | P1 | required-now | T1, T2 |
| CS3 | `src/cli/commands/agent/emit.ts` | CLI / runtime authority bridge | A CLI/runtime entry materializalja vagy tovabbitja a Phase B-vel kompatibilis explicit execution-contextet illetve emit capabilityt, mikozben az actor-facing canonical `emit` surface current-execution-scoped marad, es nem nyit explicit target-authority override parametereket | P1 | required-now | T1, T7 |
| CS4 | `src/v11/shared/pass/passWorkspaceContextPreparation.ts` | implementer pass workspace prep | Az implementer pass path authoritative contexttel is teljes ertekubb canonical route legyen; ne fallback workspace-guess pathkent maradjon a pilot alatt | P1 | required-now | T2, T3 |
| CS5 | `src/v11/shared/askHuman/askHumanWorkspaceContextPreparation.ts` | implementer human-input workspace prep | Az implementer human-input path ugyanazon explicit wrapper/authority modellen menjen at, mint a pass path | P1 | required-now | T2, T4 |
| CS6 | `src/core/runtime/tmuxDelivery.ts` | retained delivery adapter | A retained tmux delivery tovabbra is transport/observability reteg marad; explicit metadata/ack semantics ne pane-derived health shortcutra epuljenek | P1 | required-now | T5, T6 |
| CS7 | `src/core/state/executionContext.ts` | running execution authority | Az implementer pilot authority-windowja, handoff-azonossaga es restart utani uj execution kovetelmenye explicit maradjon; a task nem lazithat a stale authority fail-closed modellen | P1 | required-now | T3, T6 |
| CS8 | `tests/cli/agentEmitCommand.test.ts`, `tests/cli/askHumanCommand.test.ts`, `tests/core/agent/pass.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/core/state/executionContext.test.ts` | pilot regression surface | Az implementer pilothoz kotelezo tesztfedezet kell a canonical emit, stale authority, duplicate delivery, restart recovery es retained tmux observability-only invariansok korul | P1 | required-now | T1-T7 |
| CS9 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing behavior docs | Csak akkor frissitendo, ha a pilot utan a canonical authority/ack boundary leirasa pontosodik vagy a retained adapter szerepe user-visible modon valtozik | P2 | required-now | T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Implementer canonical execution input / authority materialization | explicit mezok mar leteznek, de retained compat/workspace seam-ek latszanak | az implementer pilot explicit execution-contexten vagy equivalent execution-scoped emit capabilityn fut; ez a canonical authority minimumot a runtime/bridge retegben materializalja, nem actor-facing target-override API-kent | `repo`, `bubble_id`, `handoff_id` + explicit current-execution authority (`execution_id`, `role`, `actor_id`) vagy olyan equivalent authoritative context / emit capability, amely legalabb ugyanennek a Phase B minimum-halmaznak a current-execution kotezettseget bizonyitja | `expected_role`, `expected_round`, `expected_state_fingerprint`, `emit_capability_ref`, `protocol_snapshot_ref`, `refs` | compatible szukites a canonical route javara, a Phase B authority-minimum gyengitese nelkul es az actor-facing `emit` surface explicit target-authority override nelkul | P1 | required-now |
| Implementer wrapper invocation | wrapper mar dispatchol pass/human_question iranyba | implementer pass es human-input ugyanazon explicit wrapper seamet hasznalja | authoritative context + actor emit input | role/policy metadata | compatible internal hardening | P1 | required-now |
| Delivery target metadata | tmux delivery mar olvassa a `delivery_target_role` metadata-t, fallbackkal | explicit delivery target metadata retained adapter marad, nem authority-forras | valid delivery target role, envelope recipient | diagnostics metadata | compatible retained adapter | P1 | required-now |
| Ack semantics | typed ack nyelv a Phase B/C-ben rogzitett, runtime retained topology mellett | implementer pilot legalabb acceptance/rejection es running/failed_to_start semanticat explicit boundarykent kezeli, nem pane-lathatosagbol kovetkeztet | `accepted` / `rejected`, `running` / `failed_to_start` szemantika | debug/provenance projection | compatibility-tightening | P1 | required-now |
| Execution authority window | current execution context explicit, restart recovery kulon runtime concern | restart utan uj execution authority kell; regi emit stale marad | `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | none | existing contract preservation | P1 | required-now |
| Duplicate delivery handling | bounded Phase D owner-domain dontes mar van, exact kodositas meg nincs | implementer pilot alatt ugyanarra a handoffra masodik accepted/running execution nem johet letre | handoff/execution identity, ack outcome | no-op projection metadata | new enforcement within pilot slice | P1 | required-now |

Normative rules:

1. A task nem vezetheti be azt, hogy a canonical implementer authority `cwd`-bol vagy tmux pane-bol legyen visszafejtve.
2. Az implementer pilotnak ugyanazon wrapper boundaryn kell kezelnie a `pass` es human-input emitet; a current `human_question` transport shape nem torheti meg a canonical `human_input_request` familyhez tartozo kozos boundaryt.
3. A retained tmux pane activity nem valhat acceptance- vagy running-bizonyitekkent canonical actor boundaryn.
4. Restart recovery utan regi execution authorityval erkezo emit fail-closed marad.
5. Duplicate masodik delivery ugyanarra a handoffra legfeljebb explicit `rejected` vagy suppresszalt no-op lehet; masodik sikeres `accepted`/`running` nem megengedett.
6. A task nem nyithat ujra reviewer-only vagy meta-review special-case output familyt az implementer pilot convenience miatt.
7. Az implementer canonical emit contract nem szukitheti a Phase B authority-minimumot puszta `repo` + `bubble_id` + `handoff_id` triova; a current-execution identity explicit vagy equivalent execution-scoped capability formajaban kotelezoen megmarad.
8. `Equivalent authoritative context / emit capability` csak akkor elfogadhato, ha legalabb `execution_id`, `role`, `actor_id`, `handoff_id`, `bubble_id` kotest hordoz, es mismatch/hiany eseten fail-closed modon viselkedik; puszta worktree-, pane-, cwd- vagy session-helyzet nem minosul ekvivalensnek.
9. Az actor-facing canonical `emit` surface Phase B-kompatibilisen current-execution-scoped marad: a bridge/runtime reteg materializalhat explicit authorityt vagy capabilityt, de a pilot nem kovetelhet es nem reopenelhet actor-facing explicit `bubble_id`/`handoff_id`/`execution_id`/`role` target-override API-t.

### 2.5) Traceability Lock

| Source | This task must realize | Why this is binding here | Evidence |
|---|---|---|---|
| Phase D `S1_WRAPPER_BOUNDARY` | implementer `pass` + `human_question` ugyanazon explicit wrapper boundaryn menjen at | a pilot csak akkor bounded, ha nem kulon-kulon, actor-specifikus shortcutokkal valosul meg | T1, T2 |
| Phase D `S2_DELIVERY_ACK_BOUNDARY` | acceptance/rejection es running/failed_to_start explicit boundary maradjon, pane-derived shortcut nelkul | a pilot nem lehet "tmux activity == success" atnevezett retained flow; az auditlanc explicitten visszamutat a Phase C `SC8_DUPLICATE_DELIVERY`, `SC10_RESTART_RECOVERY` es `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` sorokra | T4, T5, T6 |
| Phase D `S3_CORE_FREEZE` | a pilot ne nyisson uj actor primitive-t, uj output familyt vagy implicit authority-forrast; a Phase B minimum core maradjon elegendo | a wrapper + ack boundary hardening csak akkor bounded, ha a core capability lista es authority-minimum nem lazul vagy dagad a pilot convenience miatt | T1, T2, T3, T7 |
| Phase D `S4_BOUNDARY_SPLIT_AND_POLICY` | duplicate delivery policy minimuma itt mar kodszintu enforcement legyen: nincs masodik successful execution ugyanarra a handoffra | Phase C `SC8` gapet ez a task bounded modon zarja le az implementer slice-ban | T4 |
| Phase D `S5_PILOT_IMPLEMENTER_FIRST` | stale authority, conflicting context es restart recovery parity megmaradjon | ettol marad a pilot implementer-first es nem rewrite-szeru | T1, T3, T6, T7 |
| Phase C `SC1_IMPLEMENTER_RESULT`, `SC5_HUMAN_INPUT_REQUEST`, `SC6_STALE_AUTHORITY_EMIT`, `SC7_CONFLICTING_CONTEXT`, `SC8_DUPLICATE_DELIVERY`, `SC10_RESTART_RECOVERY`, `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` | a pilot acceptance matrixanak kotelezo scenario-inputjai | review soran ezek adjak a minimum parity-csomagot, beleertve hogy a pane-lathatosag tovabbra sem lehet acceptance- vagy ack-forras | T1, T2, T3, T4, T5, T6, T7 |

Normative rules:

1. Ha implementacios dontes tobbfelekepp is vedheto, azt a valtozatot kell valasztani, amelyik kozvetlenebbul teljesiti a Phase D `S1` -> `S5` spine sorrendet uj abstraction layer nelkul.
2. A task review-stabil csak akkor, ha a vegso implementer delivery artefakt egyetlen kanonikus helyen vissza tud mutatni a fenti traceability sorokra; ennek alapertelmezett helye a Pairflow done-package / completion summary artefakt, de ezzel ekvivalens completion artefakt is elfogadhato, ha ugyanilyen egyertelmuen es auditálhatóan hordozza a hivatkozast.
3. Az `S2_DELIVERY_ACK_BOUNDARY` traceability minimuma explicitten le kell fedje: `SC8` duplicate suppression, `SC10` restart utani uj authority/launch, `SC11` tmux-observability-only ack-source tilalom.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Canonical emit path | explicit wrapper-seam megerositese az implementer pilothoz | workspace-guess compat path visszaemelese canonical route-va | pilot hardening, nem UX shortcut | P1 | required-now |
| Runtime delivery | explicit delivery/ack szemantika erositese retained adapter mellett | pane-visibilitybol vagy shell-statebol levezetett acceptance | retained tmux marad, de nem canonical source | P1 | required-now |
| Recovery behavior | restart recovery authority es duplicate handling szigoritas | implicit replay vagy old authority ujrahasznalata | fail-closed alapertelmezett | P1 | required-now |
| Docs | operator-facing szemantika pontositasa, ha kell | migration spine ujranyitasa vagy teljes rollout docs update | csak pilot-szintu doc delta | P2 | required-now |

Pure-by-default rule:

1. Ha egy helper vagy bridge csak implicit compat authority miatt maradna eletben a pilot canonical pathjaban, a default az egyszerusites vagy leszukites, nem uj retained reteg hozzaadasa.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| implementer emit explicit authority snapshot nelkul probal futni | actor emit input + state | throw | nincs implicit cwd/worktree authority fallback a canonical pathon | existing `ACTOR_EMIT_CONTEXT_INVALID` family | error | P1 | required-now |
| expected handoff/round/fingerprint nem egyezik az aktiv executionnel | execution context | throw | fail-closed emit reject | existing canonical mismatch path | error | P1 | required-now |
| duplicate masodik delivery ugyanarra a handoffra erkezik | delivery identity + runtime state | none | explicit delivery-boundary `rejected` vagy suppresszalt no-op; nincs masodik canonical actor output es nincs masodik running execution | existing duplicate-delivery reason-code family (pelda: `PHASEE_IMPLEMENTER_DUPLICATE_DELIVERY`) | warn | P1 | required-now |
| restart recovery utan regi authorityval jon emit | recovery + execution context | throw | friss authority snapshot szukseges | stale authority existing fail-closed path | error | P1 | required-now |
| delivery target metadata hianyzik vagy invalid | retained tmux adapter | fallback | retained route fallback lehet, de ez nem acceptance-bizonyitek es nem authority-forras | existing `DELIVERY_TARGET_ROLE_*` codes | info/warn | P2 | required-now |

Normative rules:

1. A duplicate delivery fallback csak explicit delivery-boundary `rejected` vagy suppresszalt no-op lehet; ez nem vezethet be uj typed actor outputot, uj ack familyt vagy uj workflow-state szemantikat.
2. A retained adapter fallback csak route/provenance szintu compat viselkedes lehet; canonical acceptance, authority vagy state-transition kovetkeztetest nem adhat.
3. A duplicate-delivery reason code konkret literal alakja implementation detail maradhat, de szemantikailag duplicate-delivery suppresszio/reject osztalyba kell essen; a task nem kovetel uj, Phase B/C/D-ben nem rogzitett taxonomiat pusztan naming okbol.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` implementer-first pilot sorrendje es retained adapter policyja | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` minimalis core capability es explicit authority contractja | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` implementer parity inputjai (`SC1`, `SC5`, `SC6`, `SC7`, `SC8`, `SC10`, `SC11`) | P1 | required-now |
| must-use | meglovo `actorEmitContext` + `executionContext` fail-closed authority modell | P1 | required-now |
| must-not-use | implicit workspace/pane/shell authority fallback a canonical implementer pathban | P1 | required-now |
| must-not-use | reviewer vagy meta-reviewer cutover scope becsempeszese ugyanebbe a taskba | P1 | required-now |
| must-not-use | uj actor primitive vagy uj output family a pilot egyszerusitese erdekeben | P1 | required-now |
| must-not-use | pane-visibility == acceptance/running shortcut | P1 | required-now |
| must-not-use | teljes tmux/runtime adapter cleanup ebben a slice-ban | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | implementer canonical emit explicit authorityval fut | aktiv implementer execution context letezik | `pairflow agent emit --kind pass` vagy `--kind human_question` canonical route-on fut | a wrapper path explicit authority-snapshotot hasznal, es nem implicit workspace-guessre epul | P1 | required-now | automated test |
| T2 | implementer pass es human-input ugyanazon wrapper modellben marad | aktiv implementer handoff | pass es human-input emit is lefut | a ket path ugyanazon explicit wrapper/authority boundaryra epul | P1 | required-now | automated test |
| T3 | stale authority es conflicting context fail-closed marad | aktiv execution valtott, fingerprint/handoff mismatch van, vagy az explicit authority es a cwd/pane/prompt runtime jelek ellentmondanak egymasnak | regi authorityval vagy conflicting passive runtime context mellett emit tortenik | a rendszer rejectel; nincs silent accept, nincs implicit reroute, es nincs passziv runtime jelbol levezetett authority-fallback | P1 | required-now | automated test |
| T4 | duplicate delivery nem indit masodik sikeres executiont | ugyanarra a handoffra ket delivery signal jon | a masodik feldolgozas megtortenik | nincs masodik `accepted`/`running`; explicit reject vagy suppresszalt no-op jon | P1 | required-now | automated test |
| T5 | retained tmux observability-only marad delayed/missing ack mellett is | delivery target metadata hianyzik, invalid, vagy explicit ack hianyzik/kesik mikozben pane activity latszik vagy nem latszik | delivery/ack allapot ertelmezese megtortenik | `accepted` / `rejected` es `running` / `failed_to_start` csak explicit ack boundarybol szarmazhat; sem pane activity, sem pane-csend nem acceptance-bizonyitek, es nem canonical authority-forras | P1 | required-now | automated test |
| T6 | restart recovery uj authorityt igenyel | runtime/session restart tortent | regi authorityval, majd uj authorityval emit fut | regi stale, uj authority route valid | P1 | required-now | automated test |
| T7 | CLI/runtime bridge nem reopeneli az actor-facing target authority API-t | authority materializalas hianyos vagy mismatched, illetve a hivasi felulet explicit target-authority override iranyba csuszna | CLI parse + run vagy runtime bridge feldolgozas megtortenik | a hiany/capability mismatch explicit hiba; nincs implicit fallback, es az actor-facing `emit` surface tovabbra sem igenyel vagy fogad explicit `bubble_id` / `handoff_id` / `execution_id` / `role` target-override mezoket | P1 | required-now | automated test |
| T8 | docs csak pilot-szintu szemantikat pontositanak | a canonical authority vagy ack boundary user-visible modon pontosodik | docs diff keszul | a dokumentacio az implementer-first pilotot es a retained tmux observability-only szerepet kovetkezetesen irja le | P2 | required-now | doc diff |

### 6.5) Review Stability Gates

1. A review nem kerhet "opportunistic" wrapper/runtime cleanupot olyan file-okban, amelyekre a `T1`-`T7` parity csomag nem mutat kozvetlen bizonyitas-igenyt.
2. Ha a duplicate delivery enforcement pontos shape-je `explicit rejected` vagy `suppressed no-op` kozott valaszt, barmelyik elfogadhato, ha:
   - ugyanarra a handoffra nincs masodik successful `accepted`/`running`,
   - a valasztott shape teszttel vedett,
   - a valasztott shape explicitten delivery-boundary reject/no-op marad, nem canonical actor output vagy workflow-state transition.
3. Ha a docs nem valtoznak, a Pairflow done-package / completion summary artefaktnak explicitten allitania kell, hogy az implementacio nem valtoztatta vagy pontositotta user-visible modon a canonical authority-, ack- vagy retained-adapter szemantikat olyan mertekben, amely README/design diffet igenyelne.
4. Ha a docs valtoznak, azoknak csak a pilot altal tenylegesen modositott canonical szemantikat szabad leirniuk; Phase E rollout-jovoideju vagy reviewer/meta-reviewer tartalmat nem szabad elorehozni.
5. A `SC7_CONFLICTING_CONTEXT` review csak akkor tekintheto lezartnak, ha van explicit bizonyitek arra, hogy ellentmondo cwd/pane/prompt jel nem tudja felulirni az execution-context authorityt, es nem csak stale-id jellegu mismatch teszt ved a pathot.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a wrapper boundary tisztitasa soran tovabbi shared helper-ek latszanak, kulon Phase E follow-up task keszulhet a reviewer/meta-reviewer pathokra.
2. [later-hardening] Ha a duplicate suppression enforcementhez kulon helper absztrakcio kell, azt csak akkor erdemes kivezetni, ha a reviewer path is ugyanarra konvergal.
3. [later-hardening] Ha a retained tmux ack/provenance projection tul zajos, kesobb kulon debug-vs-canonical view note johet.

## Assumptions

1. Ez a task szandekosan csak az implementer pilot slice-a, nem a teljes Phase E.
2. A generic `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` path eleg arra, hogy ezen belul az elso implementer-first szeletet rogzitse; a kesobbi reviewer/meta-reviewer koveto taskok kulon is johetnek.
3. A meglovo `authoritativeContext`-et fogadni tudo shared pathok a wrapper boundary fokozatos megszigoritasat teszik lehetove, nem teljes ujrakezdest igenyelnek.

## Locked Decisions

1. Ebben a slice-ban a duplicate delivery minimum enforce-olt szerzodese a "nincs masodik successful `accepted`/`running` ugyanarra a handoffra" szabaly; a masodik signal explicit `rejected` vagy suppresszalt no-op alakja implementacios dontes lehet, de uj typed outcome nem kotelezo.
2. A docs kotelezo frissitesi felulete legfeljebb `README.md` es `docs/pairflow-initial-design.md`; kulon runtime note csak akkor indokolt, ha az implementacio user-visible canonical authority-, ack- vagy retained-adapter szemantikajat tenylegesen valtoztatna vagy pontositana, illetve emiatt uj operatori akciot vagy recovery leirast tenne kotelezove.
3. A frontmatter `target_files` lista maximalis erintesi felulet, nem kotelezo touched-file checklista; a review a szerzodes teljesuleset ne parity-irrelevans file-counttal merje.
4. A pilot elfogadhato akkor is, ha a retained tmux adapter jelen marad, felteteve hogy a canonical authority- es ack-szemantika mar nem belole szarmazik.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Reviewer pilot follow-up task | L2 | P3 | later-hardening | Phase D `S6` | kulon task a reviewer policy-gate retained surface Phase E cutoverjahoz |
| HB2 | Meta-reviewer pilot follow-up task | L2 | P3 | later-hardening | Phase D `S6` | kulon task a retained meta-review diagnostics es submit path konvergenciajahoz |
| HB3 | Shared duplicate suppression helper | L2 | P3 | later-hardening | possible code reuse | csak akkor emeljuk ki, ha tobb actor path tenylegesen ugyanazt a mintat kezdi hasznalni |

## Review Control

1. Ne fogadjunk el olyan implementaciot, amely az implementer pilot neve alatt reviewer vagy meta-reviewer scope-ot is athoz.
2. Ne fogadjunk el olyan “sikeres” pilotot, amely csak target-allapotot allit, de nincs stale/duplicate/restart parity evidence-je.
3. Ne fogadjunk el olyan megoldast, amely pane-lathatosagbol vagy shell-contextbol visszafejti a canonical actor authorityt.
4. Ne fogadjunk el olyan refaktort, amely uj actor primitive-t vagy uj output family-t vezet be a pilot egyszerusiteseert.
5. Ne fogadjunk el olyan megoldast, amely a retained tmux surface-et acceptance vagy ack source-sza emeli.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:
1. a task scope-ja explicit implementer-first pilot slice;
2. a touched canonical emit/delivery/execution-context boundary-k egyertelmuen meg vannak nevezve;
3. a task kotelezoen elovarja a stale authority, duplicate delivery es restart recovery parity bizonyitasat;
4. a retained tmux/runtime surface observability-only adapterkent van kezelve;
5. a deliverable nem nyitja ujra a Phase B core contractot es nem dagad teljes Phase E rolloutta;
6. a duplicate delivery minimum enforce-olt szerzodese explicitten a "nincs masodik successful `accepted`/`running` ugyanarra a handoffra" garanciara van szukitve, es a masodik signal `explicit rejected` vs `suppresszalt no-op` alakja tudatosan implementacios szabadsagkent van rogzitve;
7. a docs delta conditionalis es explicit user-visible szemantikahoz kotott;
8. a review traceability visszamutathato a Phase D `S1`-`S5` spine-re es a Phase C `SC1_IMPLEMENTER_RESULT`, `SC5_HUMAN_INPUT_REQUEST`, `SC6_STALE_AUTHORITY_EMIT`, `SC7_CONFLICTING_CONTEXT`, `SC8_DUPLICATE_DELIVERY`, `SC10_RESTART_RECOVERY`, `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` scenario-bemeneteire.
