---
artifact_type: task
artifact_id: task_artifact_type_ownership_enforcement_phase1_v2
title: "Artifact Type Ownership Enforcement (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/cli/commands/bubble/create.ts
  - src/core/bubble/createBubble.ts
  - src/config/defaults.ts
  - src/config/bubbleConfig.ts
  - src/types/bubble.ts
  - tests/cli/createCommand.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/config/bubbleConfig.test.ts
  - docs/llm-doc-workflow-v1.md
  - plans/tasks/doc-only-issues/artifact-type-ownership-enforcement-phase1.md
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/doc-only-priority-and-rollout-plan-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/tasks/doc-only-issues/doc-only-operational-decision-matrix-and-rollout-phase1.md
  - docs/llm-doc-workflow-v1.md
owners:
  - "felho"
---

# Task: Artifact Type Ownership Enforcement (Phase 1)

## L0 - Policy

### Goal

Tegyuk explicit ownership ala a `review_artifact_type` dontest bubble inditaskor, hogy a docs-only es code policy ne keveredjen implicit `auto` default miatt.

### In Scope

1. `pairflow bubble create` tamogatja az explicit `--review-artifact-type` opciot (`document|code|auto`).
2. `createBubble` fogad explicit artifact type inputot, es ezt irja ki a bubble configba.
3. Atmeneti (nem-breaking) deprecacios policy:
   - explicit `auto` megengedett, de warningos,
   - hianyzo explicit tipus legacy fallbackon marad, de warningot kap.
4. Workflow dokumentacio frissites: "bubble starter owns artifact type".
5. Tesztek frissitese CLI + core + config kompatibilitasra.

### Out of Scope

1. Azonnali hard error, ha nincs explicit `--review-artifact-type`.
2. Mar letrehozott bubble configok tomeges migracioja.
3. `review_artifact_type` enumbol az `auto` azonnali kivezetese.
4. Docs-only/runtime gate policy ujratervezese.

### Safety Defaults

1. Backward compatibility marad: ha nincs explicit tipus, a jelenlegi infer/fallback mukodes marad.
2. Legacy `auto` config parse valtozatlanul tamogatott.
3. Invalid explicit ertek azonnali input-hiba (nem silent fallback).

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary:
   - Public CLI interface contract (`pairflow bubble create` option surface).
   - Config contract runtime viselkedeshez (`review_artifact_type` forrasa es ownership policy).
3. `plan_ref` kotelezo, ezert nem `null`.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/create.ts` | option parse | `parseBubbleCreateCommandOptions(args: string[]) -> BubbleCreateCommandOptions` | option schema + validation blokk | uj `--review-artifact-type` opcio parse/validate (`document|code|auto`) | P1 | required-now | `parseArgs` strict path + CLI tests |
| CS2 | `src/cli/commands/bubble/create.ts` | command run wiring | `runBubbleCreateCommand(args: string[], cwd?: string, dependencies?: BubbleCreateCommandDependencies) -> Promise<BubbleCreateResult \| null>` | create input assembly | explicit option tovabbitasa `createBubble` fele; deprecacio warning kezeles | P1 | required-now | command integration tests |
| CS3 | `src/core/bubble/createBubble.ts` | create entry contract | `createBubble(input: BubbleCreateInput) -> Promise<BubbleCreateResult>` | input resolve + config build path | explicit tipus prioritas: explicit > infer > default; source ownership auditolhato warninggal | P1 | required-now | core createBubble tests |
| CS4 | `src/config/bubbleConfig.ts` | config contract persistence | `assertValidBubbleConfig(input: unknown) -> BubbleConfig` + `renderBubbleConfigToml(config: BubbleConfig) -> string` | validation/render path | expliciten beallitott `review_artifact_type` serializalhato es parse-olhato marad | P1 | required-now | config roundtrip tests |
| CS5 | `src/types/bubble.ts` | type contract | `ReviewArtifactType = "auto" \| "code" \| "document"` | type definition | Phase 1-ben enum nem torik; policy-level deprecacio docs + warning szinten | P2 | required-now | type-level compile checks |
| CS6 | `docs/llm-doc-workflow-v1.md` | policy wording | `updateArtifactTypeOwnershipPolicy(...) -> docs_delta` | workflow usage guidance | explicit starter ownership szabaly dokumentalva + atmeneti policy | P2 | later-hardening | doc diff review |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| CLI create options | nincs explicit artifact-type flag | uj `--review-artifact-type` opcio | `--id`, `--repo`, `--base`, `--task|--task-file` | `--review-artifact-type`, `--reviewer-brief*`, `--accuracy-critical` | additive, non-breaking | P1 | required-now |
| BubbleCreate input contract | artifact type implicit infer/default | explicit input mezo tamogatott | `id`, `repoPath`, `baseBranch`, task input | `reviewArtifactType`, `reviewerBrief*`, `accuracyCritical` | additive, non-breaking | P1 | required-now |
| BubbleConfig contract | `review_artifact_type` mar letezik, gyakran implicit forrassal | explicit starter ownership preferalt, field unchanged | `review_artifact_type` persisted ertek | ownership source warning metadata csak runtime/CLI uzenetben | backward-compatible | P1 | required-now |
| Compatibility contract | legacy `auto` config hasznalat el | legacy path marad warninggal | parse/render tamogatja `auto`-t | strict mode kesobbi fazisban | backward-compatible migration path | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI output | deprecacio/ownership warning stderr-re | csendes policy-valtas | user lassa, hogy explicit tipus ajanlott | P1 | required-now |
| Bubble config files | uj bubble `bubble.toml` `review_artifact_type` beallitasa | letezo bubble config utolagos atirasa ebben a taskban | scope csak create flow | P1 | required-now |
| Runtime policy | docs-only/kod policy routing marad | gate logika atirasa ezen taskon belul | ez ownership task, nem gate redesign | P1 | required-now |

Constraint: ahol nincs explicit side effect engedelyezve, a valtozas pure-by-default maradjon.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `--review-artifact-type` ertek | CLI arg parser | throw | command hibaval alljon meg | INVALID_REVIEW_ARTIFACT_TYPE_OPTION | warn | P1 | required-now |
| explicit `--review-artifact-type=auto` | policy resolver | result | create folytatodik, de deprecacio warning | REVIEW_ARTIFACT_TYPE_AUTO_DEPRECATED | info | P1 | required-now |
| explicit flag hianyzik | policy resolver | fallback | jelenlegi infer/default viselkedes + ownership warning | REVIEW_ARTIFACT_TYPE_IMPLICIT_FALLBACK | info | P1 | required-now |
| config parse legacy `auto` | config parser | result | parse sikeres, compatibility megtartva | REVIEW_ARTIFACT_TYPE_LEGACY_COMPAT | info | P1 | required-now |
| dependency failure (`registerRepoInRegistry`) | repo registry | fallback | bubble create sikeres maradhat, warning stderr | DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `src/types/bubble.ts` `ReviewArtifactType` canonical tipus | P1 | required-now |
| must-use | `src/config/bubbleConfig.ts` parse/render validation contract | P1 | required-now |
| must-use | meglvo create fallback logika (`inferReviewArtifactType` + default) Phase 1 kompatibilitas miatt | P1 | required-now |
| must-not-use | existing bubble state/config tomeges visszamenoleges atirasa | P1 | required-now |
| must-not-use | azonnali breaking strict mode (hard error missing flagre) | P2 | later-hardening |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Explicit `document` create | valid create args + `--review-artifact-type=document` | bubble create fut | configban `review_artifact_type=document` | P1 | required-now | `tests/cli/createCommand.test.ts`, `tests/core/bubble/createBubble.test.ts` |
| T2 | Explicit `code` create | valid create args + `--review-artifact-type=code` | bubble create fut | configban `review_artifact_type=code` | P1 | required-now | same as T1 |
| T3 | Explicit `auto` transitional path | valid args + `--review-artifact-type=auto` | create fut | create sikeres + deprecacio warning | P1 | required-now | CLI warning assertion |
| T4 | Missing explicit flag compatibility | valid args, flag nelkul | create fut | infer/default path marad + ownership warning | P1 | required-now | compatibility test |
| T5 | Invalid flag value | `--review-artifact-type=slides` | parse fut | command error, nincs bubble create side effect | P1 | required-now | parser negative test |
| T6 | Legacy config compatibility | bubble config `review_artifact_type=\"auto\"` | parse/render roundtrip | parse+render sikeres, nincs sema toren | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T7 | Migration safety scenario | mixed old/new create hasznalat | regression test pass | regi workflow nem torik, uj explicit workflow mukodik | P2 | later-hardening | integration smoke |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Phase 2-ben a missing explicit flag lehet hard error rollout flag mogott.
2. [later-hardening] Kesobbi fazisban `auto` enum-ertek formal deprecacio es eventualis kivezetes.
3. [later-hardening] CLI help-ben kulon migration recipe blokk.

## Assumptions

1. A task `small feature`, de contract-boundary override aktiv a CLI + config runtime contract miatt.
2. A jelenlegi priority-plan (doc-only rollout) alkalmas umbrella `plan_ref`-nek ehhez a backlog hardening tetelhez.

## Open Questions

1. Phase 1 warning uzenetek pontos szovege es csatornaja (`stderr` only vs transcript artifact) implementaciokor dontendo.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Missing flag hard-enforce mode | L2 | P2 | later-hardening | open decision | follow-up task with rollout communication |
| H2 | `auto` enum formal deprecation lifecycle | L2 | P2 | later-hardening | migration concern | add phased deprecation plan doc |
| H3 | Ownership telemetry metric | L2 | P3 | later-hardening | observability request | add metric only if warning volume high |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Blocker csak `P0/P1 + required-now + L1`.
3. `P2/P3` vagy `L2` finding default `later-hardening`.
4. Max 2 L1 hardening kor.
5. 2. kor utan uj `required-now` csak evidence-backed `P0/P1` lehet.
6. Mivel `contract_boundary_override=yes`, `plan_ref` kotelezo es L1 interface sorok nem lehetnek hianyosak.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha minden `P0/P1 + required-now` teljesul:
1. CLI option contract expliciten definialt es tesztelt (`document|code|auto`).
2. `createBubble` ownership contract explicit inputra korrekten persistal.
3. Legacy kompatibilitas (`auto`, missing flag) regresszio nelkul dokumentalt.
4. Invalid input fail-fast, dependency failure fallback explicit.
5. Workflow dokumentacio konzisztensen jelzi: starter owns artifact type.
