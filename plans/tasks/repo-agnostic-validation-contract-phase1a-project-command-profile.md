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

Bevezetni a projekt-szintű command profile alapot úgy, hogy a bubble command defaultok repo-szintű configból öröklődjenek, explicit precedence szabállyal és backward-compatible fallbackkel.

### In Scope

1. `pairflow.toml` `[validation]` szekció beolvasás + validáció (Phase 1A: single-target támogatás).
2. Canonical command forrás bekötése a bubble command defaultokhoz (`bootstrap`, `typecheck`, `test`).
3. Precedence rögzítése és érvényesítése: bubble override > repo profile > legacy default.
4. Gate-policy mezők parser szintű bevezetése (`required_for`, `if_missing`, `block_on_fail`).
5. Reviewer evidence required command deriváció Phase 1A policy szerint (`typecheck`, `test`), profile-fallback integrációval.
6. Tesztlefedés parser + precedence + fallback + no-regression ágakon.

### Out of Scope

1. Multi-target `path_selectors` alapú target feloldás (Phase 1B).
2. Lifecycle start/resume target resolve és target-aware prepare cache (Phase 1B).
3. UI/CLI target override flag bevezetése.
4. Teljes lint verifier enforcement áttervezése (lint command profile-ban first-class marad, de verifier-hard-enforce kiterjesztés later-hardening).

### Safety Defaults

1. Ha profile hiányzik vagy nem olvasható, a legacy bubble command defaultok maradnak aktívak.
2. Ha profile invalid, actionable hibaüzenet kell (nem silent downgrade).
3. Phase 1A-ben multi-target profile explicit reject (`unsupported in Phase 1A`).

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
| CS2 | `src/config/repoConfig.ts` | repo config parser extension | `validatePairflowRepoConfig(input: unknown): ValidationResult<PairflowRepoConfig>` + `loadPairflowRepoConfig(repoPath: string): Promise<PairflowRepoConfig>` | meglévő parser/loader bővítés | `pairflow.toml` `[validation]` szekció parse+validate, hibák tipizálva | P1 | required-now | T1, T2 |
| CS3 | `src/core/runtime/validationPolicy.ts` | command source resolver | `resolveValidationCommandPolicy(input: { bubbleCreateInput: { bootstrapCommand?: string; testCommand?: string; typecheckCommand?: string; reviewArtifactType: "code"\|"document" }, validationConfig?: PairflowRepoConfig["validation"] }): { bootstrapCommand?: string; testCommand: string; typecheckCommand: string; source: "bubble_override"\|"profile"\|"legacy" }` | új fájl | explicit precedence alkalmazása és auditálható source döntés | P1 | required-now | T3, T4 |
| CS4 | `src/core/bubble/createBubble.ts` | bubble config input assembly | `createBubble(...) -> Promise<BubbleCreateResult>` | `bubbleConfigInput` építése előtt | profile load + policy resolve alapján command defaultok kitöltése | P1 | required-now | T4, T5 |
| CS5 | `src/core/reviewer/testEvidence.ts` | required command deriváció | `resolveRequiredCommandsForEvidence(input: { bubbleConfigCommands: { test: string; typecheck: string }; profileTarget?: ValidationTarget; reviewArtifactType: "code"\|"document"\|"auto" }): string[]` | meglévő required command normalize ág | required command lista Phase 1A policy szerint (fallback: bubble config) | P1 | required-now | T6, T7 |
| CS6 | `tests/config/repoConfig.test.ts` | parser extension tesztek | `unit tests` | meglévő tesztfájl bővítés | `[validation]` schema + invalid + single-target boundary lefedés | P1 | required-now | T1, T2 |
| CS7 | `tests/core/runtime/validationPolicy.test.ts` | új policy tesztek | `unit tests` | új fájl | precedence + fallback + reviewArtifactType policy ágazatok lefedése | P1 | required-now | T3 |
| CS8 | `tests/core/bubble/createBubble.test.ts` | create regresszió/új ág | `integration tests` | meglévő tesztfájl | profile-driven defaultok + bubble override branch + legacy branch | P1 | required-now | T4, T5 |
| CS9 | `tests/core/reviewer/testEvidence.test.ts` | reviewer evidence regresszió/új ág | `integration tests` | meglévő tesztfájl | required command deriváció profile+fallback kompatibilitással | P1 | required-now | T6, T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Repo validation profile | nincs canonical repo-level validation profile | `pairflow.toml` `[validation]` | `validation.targets` (Phase 1A: exactly one), `targets.id`, `targets.cwd`, `targets.gates.typecheck.command`, `targets.gates.test.command` | `targets.prepare.commands`, `targets.gates.lint.*`, gate policy mezők | additive + validation section hiány fallback | P1 | required-now |
| Command source precedence | implicit/vegyes | explicit döntési sorrend | bubble override > profile > legacy default | source metadata | non-breaking viselkedés profile hiányban | P1 | required-now |
| Evidence required command deriváció | bubble config `typecheck`+`test` implicit | profile-aware fallback deriváció | `typecheck`, `test` required command resolution | `required_for` scope filter | backward-compatible fallback | P1 | required-now |
| Missing command policy | ad-hoc | gate-szintű policy contract | `if_missing = fail|warn|skip` parser-level validáció | runtime enforcement mélyítés (Phase 1B+) | additive | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo config read | `pairflow.toml` `[validation]` beolvasás | külön dedikált validation config fájl bevezetése | repo-root canonical source | P1 | required-now |
| Bubble config defaulting | profile-alapú command default | existing explicit bubble CLI override felülírása | precedence invariáns kötelező | P1 | required-now |
| Reviewer evidence policy | required command deriváció bővítése | reviewer protocol/state transition változtatás | evidence policy only | P1 | required-now |

Constraint: ha itt nincs explicit engedélyezett protocol/state side effect, implementáció nem változtathat lifecycle state machine viselkedést.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `pairflow.toml` parse hiba | repo config read | throw | actionable parse hiba path-al | `VALIDATION_PROFILE_PARSE_ERROR` | error | P1 | required-now |
| `[validation]` schema invalid | validator | throw | schema hiba részletes field listával | `VALIDATION_PROFILE_SCHEMA_INVALID` | error | P1 | required-now |
| `[validation].targets` count != 1 (Phase 1A) | validator | throw | explicit Phase 1B-re mutató actionable hiba | `VALIDATION_PROFILE_PHASE1A_MULTI_TARGET_UNSUPPORTED` | error | P1 | required-now |
| `[validation]` szekció hiányzik | repo config | fallback | legacy command default policy | `VALIDATION_PROFILE_NOT_FOUND` | info | P1 | required-now |
| gate command hiányzik és policy `if_missing=warn|skip` | policy resolver | fallback | warning/skip policy szerint command kihagyás | `VALIDATION_GATE_COMMAND_MISSING` | warn | P2 | required-now |

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
| T1 | Valid single-target validation parse | valid `pairflow.toml` + `[validation]` | parse/load | valid typed validation config jön vissza | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T2 | Invalid/multi-target validation reject | invalid `[validation]` schema vagy 2+ target | parse/load | explicit schema/phase1A hiba | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T3 | Precedence matrix | bubble override + profile + legacy kombók | policy resolve | precedence mindig `override > profile > legacy` | P1 | required-now | `tests/core/runtime/validationPolicy.test.ts` |
| T4 | createBubble profile default branch | profile van, bubble command override nincs | createBubble | bubble config commandok profile-ból öröklődnek | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T5 | createBubble explicit override branch | profile van, bubble command override van | createBubble | explicit bubble value felülírja profile-t | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| T6 | Evidence required command profile-aware branch | profile target command policy adott | reviewer evidence resolve | required command lista policy szerint áll elő | P1 | required-now | `tests/core/reviewer/testEvidence.test.ts` |
| T7 | Evidence legacy fallback branch | profile hiányzik | reviewer evidence resolve | meglévő behavior regresszió nélkül marad | P1 | required-now | `tests/core/reviewer/testEvidence.test.ts` |

## Acceptance Criteria

1. AC1: Repo-szintű command profile beolvasható és validálható single-target módban.
2. AC2: Command precedence determinisztikus (`bubble override > profile > legacy`).
3. AC3: createBubble command defaultok profile-ból örökölhetők regresszió nélkül.
4. AC4: Reviewer evidence required command deriváció profile-aware fallbackkel működik.
5. AC5: Multi-target profile Phase 1A-ben explicit, actionable módon rejectelt.

## L2 - Implementation Notes (Optional)

1. [later-hardening] `lint` verifier hard-enforce kiterjesztése command-evidence bindinggel.
2. [later-hardening] profile decision trace artifact (`source=override|profile|legacy`) persistálása bubble artifacts alá.
3. [later-hardening] gate-level `if_missing` runtime enforcement teljes körű kiterjesztése converged/pass útvonalakon.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Multi-target target resolver (`path_selectors`) | L2 | P1 | later-hardening | Plan Phase 1B | külön task (Phase 1B) |
| H2 | Target-aware prepare cache | L2 | P2 | later-hardening | Plan Phase 1B | külön task (Phase 1B) |
| H3 | Lint verifier full enforcement | L2 | P2 | later-hardening | reminder open-question closure | follow-up hardening task |

## Review Control

1. Bármely runtime/state machine változtatás ezen taskban out-of-scope.
2. P1 regressziónak számít, ha explicit bubble command override elveszti elsőbbségét.
3. P1 regressziónak számít, ha profile-hiány esetén nem marad meg a legacy fallback.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. parser + policy + createBubble + evidence deriváció contract row-ok mind fedettek,
2. precedence és fallback ágak teszttel bizonyítottak,
3. multi-target explicit Phase 1A reject viselkedés rögzített és tesztelt.
