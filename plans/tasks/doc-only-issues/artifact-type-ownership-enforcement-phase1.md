---
artifact_type: task
artifact_id: task_artifact_type_ownership_enforcement_phase1_v21
title: "Artifact Type Ownership Enforcement (Strict Explicit Mode)"
status: implementable
phase: phase1
target_files:
  - src/cli/commands/bubble/create.ts
  - src/core/bubble/createBubble.ts
  - src/config/bubbleConfig.ts
  - src/types/bubble.ts
  - tests/cli/createCommand.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/config/bubbleConfig.test.ts
  - docs/llm-doc-workflow-v1.md
  - plans/tasks/doc-only-issues/artifact-type-ownership-enforcement-phase1.md # meta/self-doc target only (non-runtime scope)
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/doc-only-priority-and-rollout-plan-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/tasks/doc-only-issues/doc-only-operational-decision-matrix-and-rollout-phase1.md
  - docs/llm-doc-workflow-v1.md
owners:
  - "felho"
---

# Task: Artifact Type Ownership Enforcement (Strict Explicit Mode)

## L0 - Policy

### Goal

A bubble create flowban a `review_artifact_type` ne lehessen implicit vagy `auto`.
Minden uj bubble inditasakor kotelezo legyen explicit, keterteku dontes:
`document` vagy `code`.

### In Scope

1. `pairflow bubble create` csak explicit `--review-artifact-type` mellett fusson.
2. Elfogadott explicit ertekek: `document|code`.
3. `auto` remove a create surface-rol (CLI parse + help + tests + docs).
4. Hianyzo flag hard error (nincs infer/default fallback).
5. `createBubble` ownership contract strict: explicit input required, infer logika nem hasznalhato.
6. Workflow docs frissites: "starter must choose document or code".
7. Tesztmatrix frissites strict policyra.

### Out of Scope

1. Meglevo bubble artifactok tomeges migracioja.
2. Gate policy redesign (docs-only runtime policy kulon task marad).
3. Historical transcript/inbox rewrite.
4. Uj artifact tipusok (pl. `mixed`) bevezetese.

### Safety Defaults

1. Nincs silent fallback. A create vagy explicit siker, vagy deterministic error.
2. Invalid vagy hianyzo opcio fail-fast, side effect nelkul.
3. Error uzenet tartalmazza a kotelezo explicit opciot es accepted set-et.
4. Historical config read-path viselkedes nem adhat create-time fallbackot; uj create pathon az `auto` minden esetben tiltott es hard error.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary:
   - Public CLI contract (`pairflow bubble create` required option policy).
   - Core create contract (`reviewArtifactType` required ownership input).
   - Config/schema contract (`review_artifact_type` canonical set runtimeban).
3. `plan_ref` kotelezo, ezert nem `null`.
4. `target_files` self-doc entry (`plans/tasks/doc-only-issues/artifact-type-ownership-enforcement-phase1.md`) meta celu artifact scope, nem runtime implementacios target.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/create.ts` | option parse | `parseBubbleCreateCommandOptions(args: string[]) -> BubbleCreateCommandOptions` | option schema + validation | `--review-artifact-type` required; only `document|code`; missing -> `MISSING_REVIEW_ARTIFACT_TYPE_OPTION`, explicit `auto` -> `REVIEW_ARTIFACT_TYPE_AUTO_REMOVED`, other invalid -> `INVALID_REVIEW_ARTIFACT_TYPE_OPTION`; fail-fast | P1 | required-now | CLI unit tests |
| CS2 | `src/cli/commands/bubble/create.ts` | command run wiring | `runBubbleCreateCommand(args: string[], cwd?: string, dependencies?: BubbleCreateCommandDependencies) -> Promise<BubbleCreateResult \| null>` | create input assembly | explicit type mandatory pass-through core fele + `registerRepoInRegistry` dependency-failure fallback non-blocking kezelese (current create flowban); ownership strictness nem lazithato warning-only modra | P1 | required-now | command integration tests |
| CS3 | `src/core/bubble/createBubble.ts` | create entry contract | `createBubble(input: BubbleCreateInput) -> Promise<BubbleCreateResult>` | input resolve + config build | ownership source strict explicit input; infer/default create path remove | P1 | required-now | core tests |
| CS4 | `src/config/bubbleConfig.ts` | config contract persistence | `assertValidBubbleConfig(input: unknown) -> BubbleConfig` + `renderBubbleConfigToml(config: BubbleConfig) -> string` | validation/render | canonical runtime set enforce (`document|code`) uj bubble configokra; create-flow `auto` bemenet deterministicen elutasitott (`REVIEW_ARTIFACT_TYPE_AUTO_REMOVED`) | P1 | required-now | config tests |
| CS5 | `src/types/bubble.ts` | type contract | `ReviewArtifactType` / related guards | type defs | TypeScript contract explicititas: `BubbleCreateInput.reviewArtifactType` es create option tipusok create-time explicit kotelezosege; create-time strict domain (`document|code`) elkulonitett boundary a shared/historical domaintol | P1 | required-now | typecheck + tests |
| CS6 | `docs/llm-doc-workflow-v1.md` | docs pseudo-entry | `N/A` | workflow guidance | explicit ownership rule: starter must choose `document` or `code`; `auto` removed | P1 | required-now | doc review |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| CLI create options | jelenlegi create help/parse path nem teszi elerhetove a `--review-artifact-type` explicit create flaget, ownership nem explicit user inputbol jon | required artifact type, accepted: `document|code` | `--id`, `--repo`, `--base`, `--task|--task-file`, `--review-artifact-type` | reviewer brief/accuracy fields | breaking on purpose | P1 | required-now |
| BubbleCreate input | `reviewArtifactType` jelenlegi create pathon nincs expliciten atadva, ownership infer alapu | `reviewArtifactType` required (`document|code`) | `id`, `repoPath`, `baseBranch`, task input, `reviewArtifactType` | reviewer brief/accuracy fields | breaking on purpose | P1 | required-now |
| BubbleConfig runtime domain | `review_artifact_type` may be `auto|code|document` | create-generated config csak `document|code` | persisted `review_artifact_type` | parse metadata optional | breaking create-time, read-time compatibility explicit boundary szerint | P1 | required-now |

### 2.a) Create-Time vs Historical Read Boundary (Deterministic)

1. `pairflow bubble create` ownership input domain zart: csak `document|code`.
2. Create-time `auto` sem CLI optionkent, sem core inputkent, sem config render pathon nem elfogadott.
3. Historical config read-path kompatibilitas (mar letezo `review_artifact_type="auto"` artifactok olvasasa) kulon policy boundary, ebben a taskban nem tervezett valtoztatas.
4. Tiltott viselkedes: historical read-path kompatibilitasra hivatkozva create-time infer/default/fallback bevezetese.

### 2.1) Reason Code and Messaging Contract

1. `MISSING_REVIEW_ARTIFACT_TYPE_OPTION`:
   - channel: command error (`throw`),
   - level: `error`,
   - message: expliciten kerje a `--review-artifact-type=<document|code>` opciot.
2. `INVALID_REVIEW_ARTIFACT_TYPE_OPTION`:
   - channel: command error (`throw`),
   - level: `error`,
   - message includes accepted set: `document|code`.
3. `REVIEW_ARTIFACT_TYPE_AUTO_REMOVED`:
   - channel: command error (`throw`),
   - level: `error` (create path),
   - behavior: `auto` create input elutasitva deterministicen.
4. `DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER`:
   - channel: diagnostic/non-blocking dependency outcome (nem ownership parser hiba),
   - level: `warn`,
   - behavior: bubble create folytatodik deterministic fallback mellett; registry register hiba nem blokkolhatja a create flow-t.
5. Formatting rule:
   - egy sor/uzenet, reason code prefixszel, deterministic output (tesztelheto).

### 2.2) Reason Code Precedence (Deterministic)

1. Ha a bemenet explicit `--review-artifact-type=auto`, akkor kotelezoen `REVIEW_ARTIFACT_TYPE_AUTO_REMOVED` reason code keletkezik.
2. `INVALID_REVIEW_ARTIFACT_TYPE_OPTION` csak a `document|code|auto` halmazon kivuli explicit ertekekre alkalmazhato (pl. `slides`).
3. Tiltott viselkedes: az explicit `auto` eset `INVALID_REVIEW_ARTIFACT_TYPE_OPTION` reason code-dal kezelese.
4. Missing-case precedence: ha a flag hianyzik, kotelezoen `MISSING_REVIEW_ARTIFACT_TYPE_OPTION` reason code keletkezik; a missing eset nem kezelheto `INVALID_*` vagy `AUTO_REMOVED` reason code-dal.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI output | deterministic explicit error missing/invalid esetre | warning-only fallback hianyzo explicit tipusra | strict ownership enforce | P1 | required-now |
| Bubble config files | uj bubble only explicit `document|code` | `auto` create-time beirasa | strict create contract | P1 | required-now |
| Runtime policy | docs-only/code routing explicit starter decisionre epul | infer/default ownership hasznalata uj create flowban | gate redesign nem ide tartozik | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| hianyzo `--review-artifact-type` | CLI arg parser | throw | nincs fallback | MISSING_REVIEW_ARTIFACT_TYPE_OPTION | error | P1 | required-now |
| invalid explicit value (`slides`) | CLI arg parser | throw | nincs fallback | INVALID_REVIEW_ARTIFACT_TYPE_OPTION | error | P1 | required-now |
| explicit `--review-artifact-type=auto` | CLI arg parser/policy | throw | nincs fallback | REVIEW_ARTIFACT_TYPE_AUTO_REMOVED | error | P1 | required-now |
| missing core input | createBubble contract | throw | nincs infer/default fallback | MISSING_REVIEW_ARTIFACT_TYPE_OPTION | error | P1 | required-now |
| invalid core input (`slides`) | createBubble contract | throw | nincs fallback | INVALID_REVIEW_ARTIFACT_TYPE_OPTION | error | P1 | required-now |
| core input receives `reviewArtifactType=auto` (defense-in-depth) | createBubble input contract | throw | nincs fallback | REVIEW_ARTIFACT_TYPE_AUTO_REMOVED | error | P1 | required-now |
| config render path receives `review_artifact_type=auto` on create flow | config render/validation contract | throw | nincs fallback | REVIEW_ARTIFACT_TYPE_AUTO_REMOVED | error | P1 | required-now |
| dependency failure (`registerRepoInRegistry`) | repo registry | fallback | create tovabbra is non-blocking marad | DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `src/types/bubble.ts` canonical review artifact type domain | P1 | required-now |
| must-use | `src/config/bubbleConfig.ts` parse/render validation contract | P1 | required-now |
| must-use | `registerRepoInRegistry` dependency-fallback contract a create flowban (`DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER` non-blocking) | P1 | required-now |
| must-use | create-time strict ownership tipusmechanizmus: explicit `document|code` domain + atalakitasi boundary a shared/historical (`auto|document|code`) domain fele | P1 | required-now |
| must-not-use | `inferReviewArtifactType` create-time ownership donteskent | P1 | required-now |
| must-not-use | missing explicit flag warning-only fallback policy | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Explicit `document` create | valid args + `--review-artifact-type=document` | create fut | config `review_artifact_type=document` | P1 | required-now | CLI+core tests |
| T2 | Explicit `code` create | valid args + `--review-artifact-type=code` | create fut | config `review_artifact_type=code` | P1 | required-now | CLI+core tests |
| T3 | Missing explicit flag | valid args, flag nelkul | parse/run | deterministic hard error | P1 | required-now | CLI tests |
| T4 | Invalid explicit value | `--review-artifact-type=slides` | parse/run | deterministic hard error | P1 | required-now | CLI tests |
| T5 | Explicit `auto` removed | `--review-artifact-type=auto` | parse/run | deterministic hard error `REVIEW_ARTIFACT_TYPE_AUTO_REMOVED` | P1 | required-now | CLI tests |
| T6 | Core strict input contract: missing input | direct `createBubble` call missing type | createBubble fut | throw `MISSING_REVIEW_ARTIFACT_TYPE_OPTION` (no infer/default) | P1 | required-now | core tests |
| T7 | Config render/parse for strict values | config `document`/`code` | roundtrip | parse/render stabil | P1 | required-now | config tests |
| T8 | Dependency failure fallback | registry dependency fail | create fut | bubble create sikeres + registry warning | P1 | required-now | CLI/core tests |
| T9 | Create-time/read-time boundary runtime guard | legacy `auto` read-path fixture jelen van + create args | create parse/run fut | create-time ownership contract nem lazul: csak explicit `document|code`; nincs infer/default fallback historical read-path miatt | P1 | required-now | CLI/core tests |
| T10 | AC7 coverage: create surface docs/help strictness | CLI help + workflow docs | help/docs verification fut | `auto` create opciora nincs hivatkozas; explicit `document|code` ownership rule lathato | P1 | required-now | CLI tests + doc review |
| T11 | Config render strict auto rejection | create-config render input `review_artifact_type=auto` | config validate/render fut | deterministic hard error `REVIEW_ARTIFACT_TYPE_AUTO_REMOVED` | P1 | required-now | config tests |
| T12 | Core defense-in-depth auto path | direct `createBubble` call `reviewArtifactType=auto` | createBubble fut | throw `REVIEW_ARTIFACT_TYPE_AUTO_REMOVED` deterministicen | P1 | required-now | core tests |
| T13 | Core invalid explicit path | direct `createBubble` call invalid type (`slides`) | createBubble fut | throw `INVALID_REVIEW_ARTIFACT_TYPE_OPTION` deterministicen | P1 | required-now | core tests |

## Acceptance Criteria

1. AC1: `pairflow bubble create` kotelezoen varja a `--review-artifact-type` flaget.
2. AC2: Accepted set csak `document|code`.
3. AC3: `auto` create input expliciten elutasitott.
4. AC4: Missing explicit flag hard error; nincs infer/default fallback.
5. AC5: `createBubble` ownership contract explicit inputot kovetel.
6. AC6: Uj bubble configban `review_artifact_type` csak `document|code` lehet.
7. AC7: CLI help es workflow docs explicit ownership valasztast jelez (`document|code`), es nem hivatkozik `auto` create opciora.
8. AC8: Determinisztikus reason code coverage a strict hibautakra.
9. AC9: Dependency failure fallback (`registerRepoInRegistry`) tovabbra is non-blocking.
10. AC10: Tesztek lefedik a strict parse/run/core/config viselkedest.
11. AC11: Historical read-path kompatibilitas nem lazithatja a create-time strict explicit ownership szerzodest.

## Acceptance Traceability Snapshot

1. `CS1` -> `AC1`, `AC2`, `AC3`, `AC4`, `AC8`
2. `CS2` -> `AC1`, `AC2`, `AC5`, `AC9`
3. `CS3` -> `AC3`, `AC4`, `AC5`, `AC6`, `AC8`, `AC10`, `AC11`
4. `CS4` -> `AC3`, `AC6`, `AC8`, `AC10`
5. `CS5` -> `AC2`, `AC5`
6. `CS6` -> `AC7`
7. `T1` -> `AC2`, `AC6`
8. `T2` -> `AC2`, `AC6`
9. `T3` -> `AC1`, `AC4`, `AC8`
10. `T4` -> `AC2`, `AC8`
11. `T5` -> `AC3`, `AC8`
12. `T6` -> `AC4`, `AC5`, `AC8`, `AC10`
13. `T7` -> `AC6`, `AC10`
14. `T8` -> `AC9`
15. `T9` -> `AC11`
16. `T10` -> `AC7`
17. `T11` -> `AC3`, `AC8`, `AC10`
18. `T12` -> `AC3`, `AC5`, `AC8`, `AC10`
19. `T13` -> `AC2`, `AC5`, `AC8`, `AC10`
20. `Section 2.a` -> `AC11`
21. `Section 2.2` -> `AC3`, `AC8`
22. `AC9` CS-binding note: current Pairflow create flowban a `registerRepoInRegistry` dependency-failure fallback a CLI `runBubbleCreateCommand` (CS2) layerben kezelt, ezert AC9 explicit CS2-kotesu.
23. `AC11` CS-binding note: AC11 cross-cutting policy, de create-time strictness kotelezo enforcement pontja a core `createBubble` contract (CS3); historical read-path kompatibilitas nem engedheti lazitani a CS3 explicit ownership kovetelmenyet.
24. Core defense-in-depth traceability note: Section 4 `reviewArtifactType=auto` core error row auditabilityja explicit `T12` scenarioban rogzitett, mig a missing/invalid core path audit a `T6`/`T13` sorokban kulon ellenorzott; ezert a core-layer auto rejection path kozvetlenul kotott `AC3` + `AC8` kovetelmenyekhez.

## L2 - Implementation Notes (Optional)

1. Historical `auto` artifactok migracioja kulon hardening taskban kezelendo; ez a task csak create-time strict ownership enforce.
2. A read-path kompatibilitas esetleges szukitese kulon, explicit contract-change taskot igenyel.

## Assumptions

1. A csapat vallalja a strict create policy bevezetesebol adodo breaking CLI valtozast.
2. A fo cel az uj bubble-ek ownership egyertelmusege, nem a historical artifactok atalakitasanak automatizalasa.

## Revision Log

1. `v11` (R1): strict create-time boundary (`Section 2.a`) + `AC11` bevezetese, open question eltavolitasa.
2. `v12` (R1 fix): `AC11` explicit coverage-kotese kiegeszitve.
3. `v13` (R2 fix): traceability es contract teljesseg javitas (reason-code precedence, config render auto-rejection error/test coverage, `AC7` matrix coverage, call-site mapping korrekciok).
4. `v14` (Human approval rework): Section 2.1 reason-code contract teljessege (`DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER`), `target_files` es CS matrix alignment, Spec Lock AC7 explicititas erosites.
5. `v15` (Human clarity rework): AC9/CS-binding explicititas, T10 priority/timing kalibracio (`P1 + required-now`), `target_files` self-doc ambiguity feloldasa explicit meta annotacioval.
6. `v16` (Human accuracy rework): AC9 call-site binding korrekcio a current flow szerint (`CS2`), traceability snapshot es binding note technikai pontositasaval.
7. `v17` (R10 phrasing polish): AC7 megfogalmazas pozitiv+negativ kovetelmenyre pontositva (explicit `document|code` ownership jelzes + `auto` tiltasa).
8. `v18` (R11 final clarity rework): Spec Lock explicit gate-ek kiegeszitve `AC6/AC9/AC11` kriteriumokkal, `AC11` explicit CS-binding (CS3) + rationale rogzitve, valamint CS1 reason-code path es Section 2.2 missing-case precedence pontositva.
9. `v19` (R14 required clarifications): Section 4 kiegeszitve core-layer `auto` defense-in-depth error sorral (`createBubble` input-contract throw + `REVIEW_ARTIFACT_TYPE_AUTO_REMOVED`), Data/Interface `BubbleCreate input` Current oszlop technikai realitasra igaztva (jelenlegi infer alapu path), Spec Lock explicit `AC8` gate sorral bovitve; frontmatter status `implementable`-ra allitva.
10. `v20` (R16 verification rework): Data/Interface `CLI create options` Current oszlop valos jelenlegi create help/parse allapotra pontositva (explicit flag jelenleg nem exposed), es a core-layer `auto` defense-in-depth hibaut explicit teszt/traceability kotese megerositve `T6` + `AC3/AC8` mappinggel.
11. `v21` (R17 reviewer fix pack): Section 5 dependency/type mechanism explicititas bovitve (`registerRepoInRegistry` fallback + create-time strict type boundary), T6 core scenario szetvalasztva kulon `missing`/`auto`/`invalid` auditalhato tesztsorokra (`T6`,`T12`,`T13`) es traceability mapping pontositva.
12. `v22` (close-packaging): technikai docs-only no-op kor a bubble lifecycle commit precondition teljesitesehez; policy/contract valtozas nincs.

## Resolution Record

1. Korabbi open question feloldasa:
   - historical `review_artifact_type="auto"` read-path kompatibilitas kulon policy boundary marad,
   - create-time ownership contract ettol fuggetlenul strict explicit es fallback-mentes (`document|code` only; `auto` hard error).

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Historical `auto` config migration helper | L2 | P2 | later-hardening | compatibility debt | one-shot migration script + playbook |
| H2 | Ownership telemetry (`missing/invalid` error rates) | L2 | P3 | later-hardening | observability | metrics report extension |
| H3 | Workflow label hygiene (`code|document` wording audit) | L2 | P3 | post-implementation-doc-hygiene | reviewer note r5 | docs/llm-doc-workflow-v1.md terminology cleanup pass az implementacio merge utan |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Blocker csak `P0/P1 + required-now + L1`.
3. `P2/P3` vagy `L2` finding default `later-hardening`.
4. Max 2 L1 hardening kor.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha minden `P0/P1 + required-now` teljesul:
1. CLI strict explicit artifact type policy implementalva (`document|code` only).
2. Missing/invalid/auto create input deterministic hard error.
3. Core ownership pathban nincs infer/default fallback.
4. Workflow docs konzisztensen jelzi: starter must choose `document` or `code`.
   Create help/docs explicit tiltas: `auto` create opciora nincs hivatkozas.
5. Tesztmatrix strict policyra frissitve es zold.
6. `AC6` gate: uj bubble configban `review_artifact_type` csak `document|code` lehet (create-flow `auto` tiltott/hard-error).
7. `AC9` gate: `registerRepoInRegistry` dependency-failure fallback determinisztikusan non-blocking marad a current create flowban (CS2 bind).
8. `AC11` gate: historical read-path kompatibilitas nem lazithatja a create-time strict explicit ownership szerzodest (`document|code` only, nincs infer/default fallback).
9. `AC8` gate: strict hibautak reason code mappingja determinisztikus es egyertelmu (MISSING/INVALID/AUTO_REMOVED precedence contract szerint).
