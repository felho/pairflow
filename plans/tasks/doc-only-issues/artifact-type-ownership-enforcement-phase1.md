---
artifact_type: task
artifact_id: task_artifact_type_ownership_enforcement_phase1_v10
title: "Artifact Type Ownership Enforcement (Strict Explicit Mode)"
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
4. Legacy `auto` parse (regebbi bubble config olvasas) kulon compatibility policy szerint kezelendo, de uj create pathon tilos.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary:
   - Public CLI contract (`pairflow bubble create` required option policy).
   - Core create contract (`reviewArtifactType` required ownership input).
   - Config/schema contract (`review_artifact_type` canonical set runtimeban).
3. `plan_ref` kotelezo, ezert nem `null`.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/create.ts` | option parse | `parseBubbleCreateCommandOptions(args: string[]) -> BubbleCreateCommandOptions` | option schema + validation | `--review-artifact-type` required; only `document|code`; missing/invalid -> fail-fast | P1 | required-now | CLI unit tests |
| CS2 | `src/cli/commands/bubble/create.ts` | command run wiring | `runBubbleCreateCommand(args: string[], cwd?: string, dependencies?: BubbleCreateCommandDependencies) -> Promise<BubbleCreateResult \| null>` | create input assembly | explicit type mandatory tovabbitasa core fele | P1 | required-now | command integration tests |
| CS3 | `src/core/bubble/createBubble.ts` | create entry contract | `createBubble(input: BubbleCreateInput) -> Promise<BubbleCreateResult>` | input resolve + config build | ownership source strict explicit input; infer/default create path remove | P1 | required-now | core tests |
| CS4 | `src/config/bubbleConfig.ts` | config contract persistence | `assertValidBubbleConfig(input: unknown) -> BubbleConfig` + `renderBubbleConfigToml(config: BubbleConfig) -> string` | validation/render | canonical runtime set enforce (`document|code`) uj bubble configokra | P1 | required-now | config tests |
| CS5 | `src/types/bubble.ts` | type contract | `ReviewArtifactType` / related guards | type defs | canonical strict domain: `document|code` az uj create contractban | P1 | required-now | typecheck + tests |
| CS6 | `docs/llm-doc-workflow-v1.md` | docs pseudo-entry | `N/A` | workflow guidance | explicit ownership rule: starter must choose `document` or `code`; `auto` removed | P1 | required-now | doc review |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| CLI create options | optional artifact type, accepted: `document|code|auto` | required artifact type, accepted: `document|code` | `--id`, `--repo`, `--base`, `--task|--task-file`, `--review-artifact-type` | reviewer brief/accuracy fields | breaking on purpose | P1 | required-now |
| BubbleCreate input | `reviewArtifactType` optional | `reviewArtifactType` required (`document|code`) | `id`, `repoPath`, `baseBranch`, task input, `reviewArtifactType` | reviewer brief/accuracy fields | breaking on purpose | P1 | required-now |
| BubbleConfig runtime domain | `review_artifact_type` may be `auto|code|document` | create-generated config csak `document|code` | persisted `review_artifact_type` | parse metadata optional | controlled compatibility | P1 | required-now |

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
   - channel: command error (`throw`) + optional config parse diagnostic,
   - level: `error` (create path),
   - behavior: `auto` create input elutasitva deterministicen.
4. Formatting rule:
   - egy sor/uzenet, reason code prefixszel, deterministic output (tesztelheto).

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
| dependency failure (`registerRepoInRegistry`) | repo registry | fallback | create tovabbra is non-blocking marad | DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `src/types/bubble.ts` canonical review artifact type domain | P1 | required-now |
| must-use | `src/config/bubbleConfig.ts` parse/render validation contract | P1 | required-now |
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
| T6 | Core strict input contract | direct `createBubble` call missing/invalid type | createBubble fut | throw (no infer/default) | P1 | required-now | core tests |
| T7 | Config render/parse for strict values | config `document`/`code` | roundtrip | parse/render stabil | P1 | required-now | config tests |
| T8 | Dependency failure fallback | registry dependency fail | create fut | bubble create sikeres + registry warning | P1 | required-now | CLI/core tests |

## Acceptance Criteria

1. AC1: `pairflow bubble create` kotelezoen varja a `--review-artifact-type` flaget.
2. AC2: Accepted set csak `document|code`.
3. AC3: `auto` create input expliciten elutasitott.
4. AC4: Missing explicit flag hard error; nincs infer/default fallback.
5. AC5: `createBubble` ownership contract explicit inputot kovetel.
6. AC6: Uj bubble configban `review_artifact_type` csak `document|code` lehet.
7. AC7: CLI help es workflow docs nem hivatkozik `auto` create opciora.
8. AC8: Determinisztikus reason code coverage a strict hibautakra.
9. AC9: Dependency failure fallback (`registerRepoInRegistry`) tovabbra is non-blocking.
10. AC10: Tesztek lefedik a strict parse/run/core/config viselkedest.

## Acceptance Traceability Snapshot

1. `CS1` -> `AC1`, `AC2`, `AC3`, `AC4`, `AC8`
2. `CS2` -> `AC1`, `AC2`, `AC9`
3. `CS3` -> `AC4`, `AC5`, `AC6`, `AC10`
4. `CS4` -> `AC6`, `AC10`
5. `CS5` -> `AC2`, `AC5`
6. `CS6` -> `AC7`
7. `T1` -> `AC2`, `AC6`
8. `T2` -> `AC2`, `AC6`
9. `T3` -> `AC1`, `AC4`, `AC8`
10. `T4` -> `AC2`, `AC8`
11. `T5` -> `AC3`, `AC8`
12. `T6` -> `AC5`, `AC10`
13. `T7` -> `AC6`, `AC10`
14. `T8` -> `AC9`

## L2 - Implementation Notes (Optional)

1. Ha historical compatibility fontos, kulon migration task szukseges a mar meglevo `auto` bubble configokra.
2. Ha nem kell compatibility, `ReviewArtifactType` enum teljes domain-szukitese is elvegezheto ugyanebben a valtozasban.

## Assumptions

1. A csapat vallalja a strict create policy bevezetesebol adodo breaking CLI valtozast.
2. A fo cel az uj bubble-ek ownership egyertelmusege, nem a historical artifactok atalakitasanak automatizalasa.

## Open Questions

1. A parser oldalon a historical `review_artifact_type = "auto"` olvasas maradjon compatibilityben, vagy legyen az is hard error?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Historical `auto` config migration helper | L2 | P2 | later-hardening | compatibility debt | one-shot migration script + playbook |
| H2 | Ownership telemetry (`missing/invalid` error rates) | L2 | P3 | later-hardening | observability | metrics report extension |

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
5. Tesztmatrix strict policyra frissitve es zold.
