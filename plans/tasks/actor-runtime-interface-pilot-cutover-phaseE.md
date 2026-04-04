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

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/actorEmitContext.ts` | canonical actor authority materialization | Az implementer emit path canonical authority-snapshotja maradjon explicit es fail-closed; Phase E-ben az implementer pilot ne dependaljon workspace-derived compat authorityra mint canonical route-ra | P1 | required-now | T1, T3 |
| CS2 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | actor runtime wrapper entry | Az implementer `pass` es `human_question` emit a wrapper boundary canonical route-ja legyen; a task itt megerositi a wrapper seamet, nem uj output familyt vezet be | P1 | required-now | T1, T2 |
| CS3 | `src/cli/commands/agent/emit.ts` | CLI -> canonical actor input bridge | A CLI emit contract az explicit authority/input mezokre epuljon; az implementer pilot ne nyisson vissza implicit convenience authorityt | P1 | required-now | T1, T7 |
| CS4 | `src/v11/shared/pass/passWorkspaceContextPreparation.ts` | implementer pass workspace prep | Az implementer pass path authoritative contexttel is teljes ertekubb canonical route legyen; ne fallback workspace-guess pathkent maradjon a pilot alatt | P1 | required-now | T2, T3 |
| CS5 | `src/v11/shared/askHuman/askHumanWorkspaceContextPreparation.ts` | implementer human-input workspace prep | Az implementer human-input path ugyanazon explicit wrapper/authority modellen menjen at, mint a pass path | P1 | required-now | T2, T4 |
| CS6 | `src/core/runtime/tmuxDelivery.ts` | retained delivery adapter | A retained tmux delivery tovabbra is transport/observability reteg marad; explicit metadata/ack semantics ne pane-derived health shortcutra epuljenek | P1 | required-now | T5, T6 |
| CS7 | `src/core/state/executionContext.ts` | running execution authority | Az implementer pilot authority-windowja, handoff-azonossaga es restart utani uj execution kovetelmenye explicit maradjon; a task nem lazithat a stale authority fail-closed modellen | P1 | required-now | T3, T6 |
| CS8 | `tests/cli/agentEmitCommand.test.ts`, `tests/cli/askHumanCommand.test.ts`, `tests/core/agent/pass.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/core/state/executionContext.test.ts` | pilot regression surface | Az implementer pilothoz kotelezo tesztfedezet kell a canonical emit, stale authority, duplicate delivery, restart recovery es retained tmux observability-only invariansok korul | P1 | required-now | T1-T7 |
| CS9 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing behavior docs | Csak akkor frissitendo, ha a pilot utan a canonical authority/ack boundary leirasa pontosodik vagy a retained adapter szerepe user-visible modon valtozik | P2 | required-now | T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Implementer canonical emit input | explicit mezok mar leteznek, de retained compat/workspace seam-ek latszanak | implementer pilot explicit authority-snapshoton fut | `repo`, `bubble_id`, `handoff_id` | `expected_role`, `expected_round`, `expected_state_fingerprint`, `refs` | compatible szukites a canonical route javara | P1 | required-now |
| Implementer wrapper invocation | wrapper mar dispatchol pass/human_question iranyba | implementer pass es human-input ugyanazon explicit wrapper seamet hasznalja | authoritative context + actor emit input | role/policy metadata | compatible internal hardening | P1 | required-now |
| Delivery target metadata | tmux delivery mar olvassa a `delivery_target_role` metadata-t, fallbackkal | explicit delivery target metadata retained adapter marad, nem authority-forras | valid delivery target role, envelope recipient | diagnostics metadata | compatible retained adapter | P1 | required-now |
| Ack semantics | typed ack nyelv a Phase B/C-ben rogzitett, runtime retained topology mellett | implementer pilot legalabb acceptance/rejection es running/failed_to_start semanticat explicit boundarykent kezeli, nem pane-lathatosagbol kovetkeztet | `accepted` / `rejected`, `running` / `failed_to_start` szemantika | debug/provenance projection | compatibility-tightening | P1 | required-now |
| Execution authority window | current execution context explicit, restart recovery kulon runtime concern | restart utan uj execution authority kell; regi emit stale marad | `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | none | existing contract preservation | P1 | required-now |
| Duplicate delivery handling | bounded Phase D owner-domain dontes mar van, exact kodositas meg nincs | implementer pilot alatt ugyanarra a handoffra masodik accepted/running execution nem johet letre | handoff/execution identity, ack outcome | no-op projection metadata | new enforcement within pilot slice | P1 | required-now |

Normative rules:

1. A task nem vezetheti be azt, hogy a canonical implementer authority `cwd`-bol vagy tmux pane-bol legyen visszafejtve.
2. Az implementer pilotnak ugyanazon wrapper boundaryn kell kezelnie a `pass` es `human_question` outputokat.
3. A retained tmux pane activity nem valhat acceptance- vagy running-bizonyitekkent canonical actor boundaryn.
4. Restart recovery utan regi execution authorityval erkezo emit fail-closed marad.
5. Duplicate masodik delivery ugyanarra a handoffra legfeljebb explicit `rejected` vagy suppresszalt no-op lehet; masodik sikeres `accepted`/`running` nem megengedett.
6. A task nem nyithat ujra reviewer-only vagy meta-review special-case output familyt az implementer pilot convenience miatt.

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
| duplicate masodik delivery ugyanarra a handoffra erkezik | delivery identity + runtime state | result | explicit reject vagy suppresszalt no-op; nincs masodik running execution | `PHASEE_IMPLEMENTER_DUPLICATE_DELIVERY` | warn | P1 | required-now |
| restart recovery utan regi authorityval jon emit | recovery + execution context | throw | friss authority snapshot szukseges | stale authority existing fail-closed path | error | P1 | required-now |
| delivery target metadata hianyzik vagy invalid | retained tmux adapter | fallback | retained route fallback lehet, de ez nem acceptance-bizonyitek es nem authority-forras | existing `DELIVERY_TARGET_ROLE_*` codes | info/warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` implementer-first pilot sorrendje es retained adapter policyja | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` minimalis core capability es explicit authority contractja | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` implementer parity inputjai (`SC1`, `SC5`, `SC6`, `SC7`, `SC8`, `SC10`) | P1 | required-now |
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
| T3 | stale authority fail-closed marad | aktiv execution valtott vagy fingerprint/handoff mismatch van | regi authorityval emit tortenik | a rendszer rejectel, es nincs silent accept | P1 | required-now | automated test |
| T4 | duplicate delivery nem indit masodik sikeres executiont | ugyanarra a handoffra ket delivery signal jon | a masodik feldolgozas megtortenik | nincs masodik `accepted`/`running`; explicit reject vagy suppresszalt no-op jon | P1 | required-now | automated test |
| T5 | retained tmux observability-only marad | delivery target metadata hianyzik, invalid vagy pane activity latszik | delivery/ack allapot ertelmezese megtortenik | a pane activity nem acceptance-bizonyitek, es nem canonical authority-forras | P1 | required-now | automated test |
| T6 | restart recovery uj authorityt igenyel | runtime/session restart tortent | regi authorityval, majd uj authorityval emit fut | regi stale, uj authority route valid | P1 | required-now | automated test |
| T7 | CLI emit contract nem nyit vissza convenience authorityt | felhasznalo hianyos canonical inputtal probal emitelni | CLI parse + run megtortenik | a hiany explicit hiba, nem implicit fallback | P1 | required-now | automated test |
| T8 | docs csak pilot-szintu szemantikat pontositanak | a canonical authority vagy ack boundary user-visible modon pontosodik | docs diff keszul | a dokumentacio az implementer-first pilotot es a retained tmux observability-only szerepet kovetkezetesen irja le | P2 | required-now | doc diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a wrapper boundary tisztitasa soran tovabbi shared helper-ek latszanak, kulon Phase E follow-up task keszulhet a reviewer/meta-reviewer pathokra.
2. [later-hardening] Ha a duplicate suppression enforcementhez kulon helper absztrakcio kell, azt csak akkor erdemes kivezetni, ha a reviewer path is ugyanarra konvergal.
3. [later-hardening] Ha a retained tmux ack/provenance projection tul zajos, kesobb kulon debug-vs-canonical view note johet.

## Assumptions

1. Ez a task szandekosan csak az implementer pilot slice-a, nem a teljes Phase E.
2. A generic `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` path eleg arra, hogy ezen belul az elso implementer-first szeletet rogzitse; a kesobbi reviewer/meta-reviewer koveto taskok kulon is johetnek.
3. A meglovo `authoritativeContext`-et fogadni tudo shared pathok a wrapper boundary fokozatos megszigoritasat teszik lehetove, nem teljes ujrakezdest igenyelnek.

## Open Questions

1. A duplicate delivery explicit runtime-level reject shape-je mar ebben a slice-ban veglegesen kodolhato, vagy csak a masodik successful execution tilalma kotelezo most?
2. A docs frissites eleg README/design szinten, vagy a Phase E szelethez kulon runtime note is kell majd?

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
5. a deliverable nem nyitja ujra a Phase B core contractot es nem dagad teljes Phase E rolloutta.
