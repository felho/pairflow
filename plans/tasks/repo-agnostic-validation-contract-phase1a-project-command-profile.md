---
artifact_type: task
artifact_id: task_repo_agnostic_validation_contract_phase1a_project_command_profile_v1
title: "Repo-Agnostic Validation Contract - Phase 1A Project-Level Command Profile"
status: implementable
phase: phase1
target_files:
  - src/types/validation.ts
  - src/config/repoConfig.ts
  - src/core/runtime/validationPolicy.ts
  - src/core/bubble/createBubble.ts
  - src/core/reviewer/testEvidence.ts
  - tests/config/repoConfig.test.ts
  - tests/core/runtime/validationPolicy.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/core/reviewer/testEvidence.test.ts
prd_ref: null
plan_ref: plans/repo-agnostic-validation-contract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Repo-Agnostic Validation Contract - Phase 1A Project-Level Command Profile

## L0 - Policy

### Goal

Bevezetni a projekt-szintű command profile alapot úgy, hogy a bubble command defaultok a repo-level validation profile-ból öröklődjenek, explicit precedence szabállyal és világos fallback szemantikával.

### Terminology Alignment

1. "Repo-level validation profile" = a meglévő repo-root `pairflow.toml` `[validation]` szekciója.
2. "Bubble override" = explicit bubble create input vagy CLI mező (`bootstrapCommand`, `typecheckCommand`, `testCommand`).
3. "Legacy built-in defaults" = a mostani beépített bubble command defaultok.
4. "`if_missing` policy" = config-time szabály arra, mi történjen, ha a kiválasztott profile/gate definícióból hiányzik a command mező; omitted esetben `fail` a default; nem jelenti egy már kiválasztott command futásidejű hibáját.
5. "`required_for` policy" = gate-szintű scope-szűrő arra, hogy egy adott command mely derivációs kontextusokban kötelező (Phase 1A-ben különösen a reviewer evidence required-command listában).
6. "`block_on_fail` policy" = gate-szintű failure-handling flag; parser/contract szinten Phase 1A része, de authoritative runtime enforcementje továbbra is a meglévő execution layerben marad.

### In Scope

1. A meglévő `pairflow.toml` `[validation]` szekció beolvasása + validációja (Phase 1A: single-target támogatás); külön `pairflow.validation.toml` vagy más párhuzamos validation config nem része a scope-nak.
2. Canonical command forrás bekötése a bubble command defaultokhoz (`bootstrap`, `typecheck`, `test`) a repo-level validation profile-ból.
3. Precedence rögzítése és érvényesítése plain language szerint: bubble override nyer, ennek hiányában a repo-level validation profile adja a commandot, ennek hiányában a legacy built-in defaults maradnak.
4. Gate-policy mezők parser szintű bevezetése (`required_for`, `if_missing`, `block_on_fail`) azzal a boundary-val, hogy az `if_missing` csak hiányzó config-commandra vonatkozik, és omitted esetben `fail`-re defaultol.
5. Reviewer evidence required command deriváció Phase 1A policy szerint (`typecheck`, `test`), profile-fallback integrációval.
6. Tesztlefedés parser + precedence + fallback + no-regression ágakon.

### Out of Scope

1. Multi-target `path_selectors` alapú target feloldás (Phase 1B).
2. Lifecycle start/resume target resolve és target-aware prepare cache (Phase 1B).
3. UI/CLI target override flag bevezetése.
4. Teljes lint verifier enforcement áttervezése (lint command profile-ban first-class marad, de verifier-hard-enforce kiterjesztés later-hardening).
5. Külön lint-specifikus acceptance-driving verifier kötelezettség Phase 1A-ben.

### Safety Defaults

1. Ha a `pairflow.toml`-ból hiányzik a `[validation]` szekció, a legacy built-in defaults maradnak aktívak.
2. Ha a `pairflow.toml` nem parse-olható vagy a `[validation]` invalid, actionable hibaüzenet kell; nincs silent downgrade legacy defaultra.
3. Phase 1A-ben multi-target profile explicit reject (`unsupported in Phase 1A`).
4. Ha `if_missing` nincs megadva, a default viselkedés `fail`.
5. Ha egy command már kiválasztásra került és a futtatása hibával tér vissza, az nem `if_missing` eset, és nem vált ki implicit fallbacket másik commandforrásra.
6. Phase 1A-ben a futásidejű command failure csak boundary clarification: ez a task nem vezet be új required-now runtime-execution call-site vagy tesztkötelezettséget a `createBubble` / `validationPolicy` rétegben.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Érintett contractok:
   - repo config contract (`pairflow.toml` `[validation]` séma),
   - bubble command default deriváció,
   - reviewer evidence required-command policy input.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/validation.ts` | new validation types | `types/interfaces` | új fájl | canonical profile/gate típusok (`ValidationProfile`, `ValidationTarget`, `ValidationGatePolicy`, `ValidationIfMissingPolicy`) | P1 | required-now | T1 |
| CS2 | `src/config/repoConfig.ts` | repo config parser extension | `validatePairflowRepoConfig(input: unknown): ValidationResult<PairflowRepoConfig>` + `loadPairflowRepoConfig(repoPath: string): Promise<PairflowRepoConfig>` | meglévő parser/loader bővítés | `pairflow.toml` `[validation]` szekció parse+validate, hibák tipizálva; canonical forrás csak ez a fájl; parse error és gate-policy field validáció külön látható | P1 | required-now | T0, T1, T2, T9, T10 |
| CS3 | `src/core/runtime/validationPolicy.ts` | command source resolver | `resolveValidationCommandPolicy(input: { bubbleCreateInput: { bootstrapCommand?: string; testCommand?: string; typecheckCommand?: string; reviewArtifactType: "code"\|"document" }, validationConfig?: PairflowRepoConfig["validation"] }): { bootstrapCommand?: string; testCommand: string; typecheckCommand: string; source: "bubble_override"\|"profile"\|"legacy"; ifMissingDefault: "fail" }` | új fájl | explicit precedence alkalmazása, auditálható source döntés, és hiányzó `if_missing` esetén determinisztikus `fail` default | P1 | required-now | T3, T4, T5, T8 |
| CS4 | `src/core/bubble/createBubble.ts` | bubble config input assembly | `createBubble(...) -> Promise<BubbleCreateResult>` | `bubbleConfigInput` építése előtt | profile load + policy resolve alapján command defaultok kitöltése; runtime command execution semantics továbbra sem ide tartoznak | P1 | required-now | T4, T5 |
| CS5 | `src/core/reviewer/testEvidence.ts` | required command deriváció | `resolveRequiredCommandsForEvidence(input: { bubbleConfigCommands: { test: string; typecheck: string }; profileTarget?: ValidationTarget; reviewArtifactType: "code"\|"document"\|"auto" }): string[]` | meglévő required command normalize ág | required command lista Phase 1A policy szerint, `required_for` scope filterrel és fallbackkel | P1 | required-now | T6, T7, T10 |
| CS6 | `tests/config/repoConfig.test.ts` | parser extension tesztek | `unit tests` | meglévő tesztfájl bővítés | parse error + `[validation]` schema + invalid gate-policy fields + single-target boundary + canonical-source-only boundary lefedés | P1 | required-now | T0, T1, T2, T9, T10 |
| CS7 | `tests/core/runtime/validationPolicy.test.ts` | új policy tesztek | `unit tests` | új fájl | precedence + fallback + omitted `if_missing => fail` policy ágak lefedése | P1 | required-now | T3, T8 |
| CS8 | `tests/core/bubble/createBubble.test.ts` | create regresszió/új ág | `integration tests` | meglévő tesztfájl | profile-driven defaultok + bubble override branch + legacy branch; runtime execution boundary nincs ide húzva | P1 | required-now | T4, T5 |
| CS9 | `tests/core/reviewer/testEvidence.test.ts` | reviewer evidence regresszió/új ág | `integration tests` | meglévő tesztfájl | required command deriváció profile+fallback kompatibilitással, `required_for` scope-filter ágakkal | P1 | required-now | T6, T7, T10 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Repo-level validation profile | nincs canonical repo-level validation profile | meglévő `pairflow.toml` `[validation]` | `validation.targets` (Phase 1A: exactly one), `targets.id`, `targets.cwd`, `targets.gates.typecheck.command`, `targets.gates.test.command` | `targets.prepare.commands`, `targets.gates.lint.*`, gate policy mezők | additive + `[validation]` hiány fallback, külön validation fájl nélkül | P1 | required-now |
| Command source precedence | implicit/vegyes | explicit döntési sorrend | bubble override > repo-level validation profile > legacy built-in defaults | source metadata | non-breaking viselkedés `[validation]` hiányban | P1 | required-now |
| Evidence required command deriváció | bubble config `typecheck`+`test` implicit | profile-aware fallback deriváció | `typecheck`, `test` required command resolution | `required_for` scope filter | backward-compatible fallback | P1 | required-now |
| Gate policy fields | ad-hoc | parser-level canonical gate policy contract | `if_missing`, `required_for`, `block_on_fail` | további gate-spec mezők | additive; `required_for` downstream evidence scope-ra hat, `block_on_fail` Phase 1A-ben parser+boundary contract | P1 | required-now |
| Missing command policy | ad-hoc | gate-szintű policy contract | `if_missing = fail|warn|skip` parser-level validáció | omitted esetben `fail` default; runtime enforcement mélyítés későbbi follow-up | additive; csak config hiányzó commandra vonatkozik, nem runtime failure-re | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo config read | meglévő `pairflow.toml` `[validation]` beolvasás | külön dedikált validation config fájl bevezetése | repo-root canonical source | P1 | required-now |
| Bubble config defaulting | profile-alapú command default | existing explicit bubble CLI override felülírása | precedence invariáns kötelező | P1 | required-now |
| Reviewer evidence policy | required command deriváció bővítése | reviewer protocol/state transition változtatás | evidence policy only | P1 | required-now |
| Runtime command failure handling | boundary clarification only: meglévő execute/exit kezelés marad authoritative | a futásidejű hibák áthúzása a `createBubble` / `validationPolicy` resolve rétegbe | nincs új required-now call-site vagy teszt ebben a taskban; a no-fallback szemantika execution-layer concern marad | P1 | required-now |

Constraint: ha itt nincs explicit engedélyezett protocol/state side effect, implementáció nem változtathat lifecycle state machine viselkedést.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `pairflow.toml` parse hiba | repo config read | throw | actionable parse hiba path-al | `VALIDATION_PROFILE_PARSE_ERROR` | error | P1 | required-now |
| `[validation]` schema invalid | validator | throw | schema hiba részletes field listával | `VALIDATION_PROFILE_SCHEMA_INVALID` | error | P1 | required-now |
| `[validation].targets` count != 1 (Phase 1A) | validator | throw | explicit Phase 1B-re mutató actionable hiba | `VALIDATION_PROFILE_PHASE1A_MULTI_TARGET_UNSUPPORTED` | error | P1 | required-now |
| `[validation]` szekció hiányzik | repo config | fallback | legacy built-in defaults maradnak | `VALIDATION_PROFILE_NOT_FOUND` | info | P1 | required-now |
| gate-policy field invalid (`if_missing`, `required_for`, `block_on_fail`) | validator | throw | schema hiba field-path részletekkel | `VALIDATION_PROFILE_SCHEMA_INVALID` | error | P1 | required-now |
| gate command hiányzik és `if_missing` effektív értéke `fail` (explicit vagy defaultolt) | policy resolver | throw | actionable hiba a hiányzó gate path-jával | `VALIDATION_GATE_COMMAND_REQUIRED` | error | P1 | required-now |
| gate command hiányzik és policy `if_missing=warn|skip` | policy resolver | fallback | warning/skip policy szerint command kihagyás | `VALIDATION_GATE_COMMAND_MISSING` | warn | P2 | required-now |
| kiválasztott gate command futása hibával tér vissza | command runner | boundary-only | meglévő runtime failure policy authoritative marad; ez a task nem kér új createBubble/validationPolicy implementációt vagy tesztet erre | `VALIDATION_GATE_COMMAND_FAILED` | error | P2 | later-hardening |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/repo-agnostic-validation-contract-plan-v1.md` baseline döntések | P1 | required-now |
| must-use | existing `createBubble` command wiring + `testEvidence` path | P1 | required-now |
| must-not-use | multi-target path selector runtime resolve ebben a taskban | P1 | required-now |
| must-not-use | bubble explicit override precedence gyengítése | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T0 | `pairflow.toml` parse error path | invalid TOML a repo-root `pairflow.toml`-ban | load | actionable `VALIDATION_PROFILE_PARSE_ERROR` hiba jön vissza | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T1 | Valid single-target validation parse | valid `pairflow.toml` + `[validation]` | parse/load | valid typed validation config jön vissza | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T2 | Invalid/multi-target validation reject | invalid `[validation]` schema, invalid gate-policy field, vagy 2+ target | parse/load | explicit schema/phase1A hiba | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T3 | Precedence matrix | bubble override + repo-level validation profile + legacy kombók | policy resolve | precedence mindig `override > profile > legacy` | P1 | required-now | `tests/core/runtime/validationPolicy.test.ts` |
| T4 | createBubble profile default branch | profile van, bubble command override nincs | createBubble | bubble config commandok profile-ból öröklődnek | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T5 | createBubble explicit override branch | profile van, bubble command override van | createBubble | explicit bubble value felülírja profile-t | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T6 | Evidence required command `required_for` branch | profile target command policy adott `required_for` scope mezőkkel | reviewer evidence resolve | required command lista csak az adott derivációs kontextusra kötelező gate-eket tartalmazza | P1 | required-now | `tests/core/reviewer/testEvidence.test.ts` |
| T7 | Evidence legacy fallback branch | `[validation]` hiányzik | reviewer evidence resolve | meglévő behavior regresszió nélkül marad | P1 | required-now | `tests/core/reviewer/testEvidence.test.ts` |
| T8 | Missing-command boundary with omitted `if_missing` | gate command hiányzik és `if_missing` nincs megadva | policy resolve | implicit default `fail`; nincs warn/skip downgrade | P1 | required-now | `tests/core/runtime/validationPolicy.test.ts` |
| T9 | Canonical repo config source only | repo tartalmaz `pairflow.toml`-ot és nincs támogatott külön validation config fájl | parse/load | a parser kizárólag a meglévő `pairflow.toml` `[validation]` szekcióját tekinti canonical forrásnak | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T10 | Gate policy field coverage | valid `required_for` + `block_on_fail` mezők a profile-ban | parse/load + evidence resolve | parser megőrzi a mezőket; `required_for` downstream hatása tesztelt; invalid `block_on_fail`/`required_for` schema rejectelt | P1 | required-now | `tests/config/repoConfig.test.ts`, `tests/core/reviewer/testEvidence.test.ts` |

## Acceptance Criteria

1. AC1: A repo-level validation profile beolvasható és validálható single-target módban.
2. AC2: Command precedence determinisztikus (`bubble override > repo-level validation profile > legacy built-in defaults`).
3. AC3: createBubble command defaultok profile-ból örökölhetők regresszió nélkül.
4. AC4: Reviewer evidence required command deriváció profile-aware fallbackkel működik.
5. AC5: Multi-target profile Phase 1A-ben explicit, actionable módon rejectelt.
6. AC6: Nem jön létre külön validation config fájl; a canonical forrás a meglévő `pairflow.toml` `[validation]`.
7. AC7: Az `if_missing` kizárólag hiányzó config-commandot kezel; a futásidejű command failure Phase 1A-ben boundary clarification only, és nem hoz új required-now `createBubble` / `validationPolicy` kötelezettséget.
8. AC8: A parser-szinten bevezetett gate-policy mezők (`if_missing`, `required_for`, `block_on_fail`) downstream coverage-et kapnak: validáció, evidence-deriváció vagy boundary contract formájában.

### 7) Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS6 | T1, T2 |
| AC2 | CS3, CS4, CS7, CS8 | T3, T4, T5 |
| AC3 | CS3, CS4, CS8 | T4, T5 |
| AC4 | CS5, CS9 | T6, T7, T10 |
| AC5 | CS2, CS6 | T2 |
| AC6 | CS2, CS6 | T9 |
| AC7 | CS2, CS3 | T8 |
| AC8 | CS2, CS5, CS6, CS9 | T2, T6, T10 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] `lint` verifier hard-enforce kiterjesztése command-evidence bindinggel.
2. [later-hardening] profile decision trace artifact (`source=override|profile|legacy`) persistálása bubble artifacts alá.
3. [later-hardening] runtime failure no-fallback semantics explicit execution-layer contracttá emelése a valódi command runner útvonalon (`startBubble` vagy shared runner), külön taskban.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Multi-target target resolver (`path_selectors`) | L2 | P1 | later-hardening | Plan Phase 1B | külön task (Phase 1B) |
| H2 | Target-aware prepare cache | L2 | P2 | later-hardening | Plan Phase 1B | külön task (Phase 1B) |
| H3 | Lint verifier full enforcement | L2 | P2 | later-hardening | reminder open-question closure | follow-up hardening task |
| H4 | Runtime failure execution-layer contract | L2 | P1 | later-hardening | meta-review rework | külön follow-up task a valódi command runner rétegre |

## Review Control

1. Bármely runtime/state machine változtatás ezen taskban out-of-scope.
2. P1 regressziónak számít, ha explicit bubble command override elveszti elsőbbségét.
3. P1 regressziónak számít, ha `[validation]` hiány esetén nem marad meg a legacy fallback.
4. P1 regressziónak számít, ha invalid config esetén a rendszer csendben legacy defaultra esik vissza.
5. P1 regressziónak számít, ha a Task a futásidejű command failure enforcementöt tévesen a `createBubble` / `validationPolicy` resolve réteghez köti a valódi execution layer helyett.
6. P2 regressziónak számít, ha új parser-szintű gate-policy mező (`required_for`, `block_on_fail`) downstream coverage nélkül marad a contractban vagy a tesztmátrixban.
7. P2 regressziónak számít, ha a spec újra megnyitja külön validation config fájl lehetőségét a meglévő `pairflow.toml` `[validation]` canonical source mellett.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. parser + policy + createBubble + evidence deriváció contract row-ok mind fedettek,
2. precedence és fallback ágak teszttel bizonyítottak,
3. multi-target explicit Phase 1A reject viselkedés rögzített és tesztelt.
