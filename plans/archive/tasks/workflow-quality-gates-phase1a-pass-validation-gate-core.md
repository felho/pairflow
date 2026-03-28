---
artifact_type: task
artifact_id: task_workflow_quality_gates_phase1a_pass_validation_gate_core_v1
title: "Workflow Quality Gates Phase 1A - PASS Validation Gate Core"
status: implementable
phase: phase1a
target_files:
  - "src/v11/application/pass/passValidationGate.ts"
  - "src/core/runtime/passValidationRunner.ts"
  - "src/core/runtime/passValidationEvidence.ts"
  - "src/v11/application/pass/runNormalPassFlow.ts"
  - "src/v11/application/pass/normalPassDeliveryExecution.ts"
  - "src/v11/application/pass/normalPassFinalization.ts"
  - "src/v11/shared/pass/passFlowDependencyWiring.ts"
  - "tests/v11/application/pass/passValidationGate.test.ts"
  - "tests/core/runtime/passValidationRunner.test.ts"
  - "tests/core/runtime/passValidationRunner.preHeaderError.test.ts"
  - "tests/core/runtime/passValidationRunner.spawnError.test.ts"
  - "tests/v11/application/pass/runNormalPassFlow.test.ts"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Workflow Quality Gates Phase 1A - PASS Validation Gate Core

## L0 - Policy

### Goal

Szetszedni a korabbi Phase 1 taskot egyetlen, lezarhato Phase 1A vertikalis slice-ra: implementer `pairflow pass` eseten, `review_artifact_type=code` bubble-ben az orchestrator-owned PASS validation gate egyeduli authority legyen a required commandok futtatasara, a canonical PASS validation artifactok letrehozasara, es a reviewer direktiva feloldasara a reviewer delivery elott.

### Terminology Alignment

1. "PASS validation gate core" = kizárólag az implementer normal `pairflow pass` flow code-bubble aga a reviewer delivery elott.
2. "Canonical command source" = a mar feloldott bubble `[commands]` surface; a gate ebben a taskban nem vezet be uj command-forrast, es nem olvas reviewer summary-claimet vagy transcript-szoveget command authoritykent.
3. "Policy state" = a gate-re relevans PASS validation allapot a bubble config alapjan: `policy_missing`, `policy_configured`, `policy_explicit_null`.
4. "Canonical PASS validation artifact" = az aktualis PASS probalkozashoz tartozo `.pairflow/artifacts/pass-validation-evidence.json`; Phase 1A-ben ez a current-pass authority, nem a reuse/recovery hardening teljes modellje.
5. "Reviewer directive" = a gate altal elokeszitett delivery input (`skip_full_rerun` vagy `run_checks`), nem meta-review vagy human approval policy.
6. "Reviewer compatibility artifact" = az a meglovo reviewer-oldali input/artifact, amelyet a gate a canonical PASS validation eredmenybol kiszolgal, de nem ad neki masodik directive-authority szerepet.
7. "Canonical artifact fields" = current-pass trust es command-coverage authority mezok; ide tartozik a policy-, command-, trust- es identity-metadata, de nem tartozik ide a reviewer-facing delivery projection.
8. "Reviewer-facing derived fields" = a reviewer directive es a reviewer compatibility artifact mezoi; ezek a canonical artifact + gate decision eredmenyebol szarmaznak, de nem reszei a canonical current-pass artifact minimum szerzodesenek.

### In Scope

1. `review_artifact_type=code` implementer PASS applicability gate.
2. PASS-boundary policy-allapot feloldasa a jelenlegi bubble config `[commands]` surface-bol: `policy_missing`, `policy_configured`, `policy_explicit_null`.
3. Required command set feloldasa determinisztikus sorrendben, kizarolag a mar feloldott bubble command surface alapjan.
4. Thin internal validation runner, amely commandonkent canonical logot ir `.pairflow/evidence/` ala, extra parser/proxy logika nelkul.
5. Canonical PASS validation metadata artifact irasa `.pairflow/artifacts/pass-validation-evidence.json` ala az aktualis PASS attempt authority-jakent.
6. Reviewer directive eloallitasa a gate eredmenyebol (`skip_full_rerun` vagy `run_checks`) a reviewer delivery inputhoz.
7. PASS flow wiring: a gate pontosan egyszer fusson az implementer normal pass flow-ban a reviewer delivery elott.
8. Determinisztikus fail-fast terminal error output `pass_validation_command_missing|pass_validation_command_failed|pass_validation_execution_error|pass_validation_artifact_persist_failed` reason code-okkal.

### Out of Scope

1. Restart/reconcile recovery marker semantics.
2. Trusted reuse hardening recovery-uncertainty, artifact-korrupcio vagy reuse-eligibility deny reszleteire.
3. Meta-review / approval same-round convergence parity guard.
4. Reviewer truth-source parity a meta-review vagy approval pathokon.
5. Uj publikus CLI surface a runnerhez.
6. Uj command source, repo-level command derivacio vagy framework-specifikus parser/proxy logika.

### Safety Defaults

1. `policy_configured` mellett barmilyen invalid vagy hianyos command-feloldas fail-closed legyen.
2. A gate ne tagitsa ki a command source-ot repo-hardcode, summary-claim, transcript-text vagy masodlagos heuristic iranyba.
3. A docs-only bubble tovabbra se aktiválja a code PASS gate-et.
4. A reviewer PASS vagy mas sender-role semantics se valtozzon; ez a task csak az implementer code PASS gate authority-jat rendezi.
5. A runner/gate csak evidence/log, canonical artifact es reviewer compatibility artifact side effectet okozhat; bubble state, transcript, recovery marker vagy meta-review mutaciot itt ne vegezzen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. A task a meglovo PASS flow belso orchestrationjet hardeneli; nem vezet be uj publikus config vagy CLI contractot.
3. Phase 1A authority boundary: current-pass policy/runner/artifact/directive igen; reuse/recovery es approval/meta-review parity nem.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/pass/passValidationGate.ts` | `resolvePassValidationForPass` | `(ResolvePassValidationForPassInput, deps?) -> Promise<ResolvePassValidationForPassResult>` | uj application seam | Policy + command resolution + runner + directive authority egy helyen | P1 | required-now | Az elozo taskban a fenti concernok szetcsusztak tobb path kozott |
| CS2 | `src/core/runtime/passValidationRunner.ts` | `runPassValidationCommand` | `({ kind, command, worktreePath }) -> Promise<{ command, exitCode, logPath, durationMs }>` | uj core runtime helper | Thin shell runner canonical logirassal es fail-fast kompatibilis eredmennyel | P1 | required-now | A PASS gate csak stabil runner contractra epulhet |
| CS3 | `src/core/runtime/passValidationEvidence.ts` | policy/artifact helpers | `bubbleTomlPath/worktreePath based helpers -> policy + metadata artifact` | uj core runtime helper | Policy state separation es canonical artifact iras | P1 | required-now | A gate megbizhato reuse/reviewer donteshez canonical artifact kell |
| CS4 | `src/v11/application/pass/runNormalPassFlow.ts` | `runNormalPassFlow` | `(RunNormalPassFlowInput, deps) -> Promise<TResult>` | normal pass flow eleje | A gate eredmenye adja az effective refeket es a reviewer direktivat | P1 | required-now | A valtozas autoritativ boundary-ja itt van |
| CS5 | `src/v11/application/pass/normalPassDeliveryExecution.ts` | `executeNormalPassDelivery` | `(ExecuteNormalPassDeliveryInput, deps) -> Promise<ExecuteNormalPassDeliveryResult>` | reviewer delivery input | A delivery mar csak a gate altal elkeszitett direktivat viszi tovabb | P1 | required-now | Ne legyen masodik, parallel reviewer-directive authority |
| CS6 | `src/v11/application/pass/normalPassFinalization.ts` | final pass result assembly | `normal pass finalization helpers -> final result/envelope` | pass normal flow vege | A gate terminal failurejei es artifact refjei valtozatlanul, egyetlen authoritative outcome-kent menjenek tovabb a vegso pass eredmenybe | P2 | required-now | A target file szerepe igy kotodik a fail-fast es artifact handoff kontrakthoz |
| CS7 | `src/v11/shared/pass/passFlowDependencyWiring.ts` | pass dependency wiring | `pass flow dependency composition -> wired gate/evidence helpers` | shared pass wiring seam | A gate, artifact writer es delivery ugyanarra a single-source wiringra epuljon, ne legyen parallel directive resolver vagy alternativ artifact writer | P2 | required-now | A target file csak igy marad explicit kontraktus-resz |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| PASS validation policy resolution | implicit / szetszorva | explicit policy state + ordered command set | `policy_state`, `commands[]`, `required_command_set_id` | `invalidReason` | non-breaking internal | P1 | required-now |
| PASS validation artifact | nem canonical Phase 1 authority | canonical JSON artifact az aktualis PASS attempthez | `schema_version`, `bubble_id`, `round`, `generated_at`, `head_sha`, `git_status_hash`, `policy_state`, `commands[]`, `required_command_set_id`, `trust_level`, `trust_reason_code` | none | additive internal; reuse/recovery deny semantics nem required-now, de artifact write failure fail-closed required-now | P1 | required-now |
| Reviewer directive handoff | delivery kozben reszben feloldott | gate altal teljesen feloldott | `skip_full_rerun`, `reason_code`, `reason_detail` | none | non-breaking; approval/meta-review truth source nincs ide huzva | P1 | required-now |
| Reviewer compatibility artifact | ad-hoc reviewer-facing projection | canonical gate-derived reviewer artifact | `verification_status`, `skip_full_rerun`, `reason_code`, `reason_detail` | none | additive internal; a canonical PASS validation artifactbol es a gate decisionbol szarmazik | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| FS | `.pairflow/evidence/*.log`, `.pairflow/artifacts/pass-validation-evidence.json`, reviewer compatibility artifact | transcript/state/runtime session mutacio, recovery marker iras | A gate csak current-pass evidence/artifact writer legyen | P1 | required-now |
| Process | shell validation command futtatas worktree cwd-vel | framework-specifikus parse/proxy, side-channel CLI, alternative command discovery | Runner thin wrapper marad | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `policy_missing` | bubble config | result | untrusted `run_checks` + canonical metadata | `pass_validation_policy_missing` | warn | P1 | required-now |
| explicit null-set | bubble config | result | trusted `skip_full_rerun` + `commands=[]` metadata | `no_trigger` | info | P1 | required-now |
| configured policy invalid / missing command | bubble config | throw | PASS stop reviewer delivery nelkul | `pass_validation_command_missing` | error | P1 | required-now |
| runner spawn/runtime hiba | runner | throw | PASS stop reviewer delivery nelkul | `pass_validation_execution_error` | error | P1 | required-now |
| command non-zero exit | runner | throw | PASS stop reviewer delivery nelkul | `pass_validation_command_failed` | error | P1 | required-now |
| reviewer compatibility artifact write fail, canonical metadata write sikeres | artifact writer | fallback | PASS folytatodik warninggal | `pass_validation_reviewer_compat_artifact_persist_failed` | warn | P2 | required-now |
| canonical metadata write fail success/non-terminal pathon | artifact writer | throw | PASS stop fail-closed | `pass_validation_artifact_persist_failed` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `src/core/runtime/passValidationRunner.ts`, `src/core/runtime/passValidationEvidence.ts`, existing PASS flow seams | P2 | required-now |
| must-not-use | repo-specifikus command hardcode, summary-only trust, transcript-derived command authority, uj public CLI surface | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | configured policy + all commands pass | valid ordered required set | implementer PASS | logs + canonical artifact + trusted skip directive | P1 | required-now | `tests/v11/application/pass/passValidationGate.test.ts`, `tests/core/runtime/passValidationRunner.test.ts` |
| T2 | configured policy invalid command set | missing/invalid required command id | implementer PASS | PASS fail before reviewer delivery with `pass_validation_command_missing` | P1 | required-now | `tests/v11/application/pass/passValidationGate.test.ts`, `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T3 | command exits non-zero | first required command fails | implementer PASS | fail-fast stop with `pass_validation_command_failed`, failed log path in terminal output | P1 | required-now | `tests/core/runtime/passValidationRunner.test.ts` |
| T4 | runner execution error | spawn/init error | implementer PASS | terminal `pass_validation_execution_error` | P1 | required-now | `tests/core/runtime/passValidationRunner.spawnError.test.ts` |
| T5 | explicit null policy | `validation_required=[]` + explicit flag | implementer PASS | no runner call, `commands=[]`, trusted skip | P1 | required-now | `tests/v11/application/pass/passValidationGate.test.ts` |
| T6 | policy missing | no explicit PASS policy | implementer PASS | untrusted `run_checks` without hard fail | P1 | required-now | `tests/v11/application/pass/passValidationGate.test.ts`, `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T7 | docs-only bubble | `review_artifact_type=document` | implementer PASS | no code gate, no terminal validation path | P1 | required-now | `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T8 | reviewer PASS regression | sender role reviewer | PASS flow | gate does not alter reviewer semantics | P1 | required-now | `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T9 | canonical artifact persist fail | command execution egyebkent sikeres, de canonical metadata write fail | implementer PASS | fail-fast stop with `pass_validation_artifact_persist_failed`, reviewer delivery nelkul | P1 | required-now | `tests/v11/application/pass/passValidationGate.test.ts`, `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T10 | exactly-once gate execution | implementer code PASS normal flow | implementer PASS | gate pontosan egyszer fut, nincs masodik invocation finalization vagy delivery pathon | P1 | required-now | `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T11 | no-second-directive authority | gate mar eloallitott reviewer direktivat | normal delivery/finalization | delivery/finalization ugyanazt a direktivat viszi tovabb, nem old fel ujat es nem irja felul | P1 | required-now | `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T12 | reviewer compatibility artifact write fail | canonical metadata write sikeres, de reviewer compatibility artifact persist fail | implementer PASS | PASS warninggal folytatodik, a gate directive megmarad, nincs fail-closed terminal stop | P2 | required-now | `tests/v11/application/pass/passValidationGate.test.ts`, `tests/v11/application/pass/runNormalPassFlow.test.ts` |
| T13 | runner pre-header write/bootstrap error | runner log/header bootstrap hiba a command output header elott | implementer PASS | terminal `pass_validation_execution_error`, nincs partial success trust | P1 | required-now | `tests/core/runtime/passValidationRunner.preHeaderError.test.ts` |

## Acceptance Criteria

1. AC1: A PASS validation gate core csak implementer `review_artifact_type=code` normal pass flow-ban aktiv, es pontosan egyszer fut a reviewer delivery elott.
2. AC2: A gate a bubble `[commands]` surface-bol determinisztikusan feloldja a `policy_missing|policy_configured|policy_explicit_null` allapotot es a required command sorrendet, uj command source bevezetese nelkul.
3. AC3: `policy_configured` esetben invalid vagy hianyos command-feloldas fail-closed `pass_validation_command_missing` reason code-dal megallitja a PASS reviewer deliveryt.
4. AC4: Sikeres command-futas canonical `.pairflow/evidence/*.log` outputot es `.pairflow/artifacts/pass-validation-evidence.json` artifactot hoz letre az aktualis PASS attempt authority-jakent.
5. AC5: A reviewer directive (`skip_full_rerun` vagy `run_checks`) teljes authority-ja a gate-ben van; a delivery reteg nem vezethet be masodik, parallel directive-feloldast.
6. AC6: A task nem huz be reuse/recovery hardeninget vagy meta-review/approval parity logikat; ezek explicit out-of-scope maradnak.
7. AC7: Docs-only bubble es reviewer sender role regresszio nelkul kimarad a code PASS gate-bol.
8. AC8: A fail-fast terminal hibautak required-now szinten lefedik a `pass_validation_command_missing`, `pass_validation_command_failed`, `pass_validation_execution_error` es `pass_validation_artifact_persist_failed` reason code-okat.
9. AC9: Reviewer compatibility artifact write-failure eseten, ha a canonical PASS validation artifact sikeresen perszisztalodott, a PASS warninggal folytatodik; ez degrade-path, nem fail-closed terminal hiba.

### 7) Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS4, CS5, CS6 | T1, T7, T8, T10 |
| AC2 | CS1, CS3, CS7 | T1, T2, T5, T6 |
| AC3 | CS1, CS2, CS3, CS4 | T2 |
| AC4 | CS1, CS2, CS3, CS6 | T1 |
| AC5 | CS1, CS4, CS5, CS6, CS7 | T1, T5, T6, T11 |
| AC6 | CS1, CS3, CS4 | T5, T6, T7, T8 |
| AC7 | CS1, CS4 | T7, T8 |
| AC8 | CS1, CS2, CS3, CS4, CS6 | T2, T3, T4, T9, T13 |
| AC9 | CS3, CS4, CS5, CS6 | T12 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kesoibb lehet kulon atomikus artifact writer, ha a canonical JSON write durability kulon feladatkent fontossa valik.
2. [later-hardening] Kesoibb lehet command timeout telemetry reszletesebb bontasa.

## Assumptions

1. A task a meglovo `[commands]` surface-bol dolgozik; uj schema migracio nem resze.
2. A trusted reuse full hardening itt meg nem cel, csak a core gate authority kialakitasa.

## Open Questions

1. No blocking open questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Artifact write durability / atomicity | L2 | P2 | later-hardening | review discussion 2026-03-28 | Kulon follow-up, ha a core gate mar stabil |

## Review Control

1. A task csak a PASS gate core-ra ervenyes; restart/reconcile, reuse hardening es meta-review/approval parity findingok nem hozhatok vissza `required-now` scope-ba.
2. P1 regresszio, ha a gate uj command source-ot olvas a bubble `[commands]` surface-on kivulrol.
3. P1 regresszio, ha a reviewer directive authority visszacsuszik a delivery retegbe vagy tobb helyen oldodik fel.
4. P1 regresszio, ha docs-only bubble vagy reviewer sender role bekerul a code PASS gate hatokorebe.
5. Max 2 L1 hardening round.
6. Uj `required-now` csak akkor engedheto be, ha kozvetlenul a PASS gate core authority-jat, fail-closed semantikajat vagy current-pass artifact integrityjet totri meg.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
