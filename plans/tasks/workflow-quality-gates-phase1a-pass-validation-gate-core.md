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

Szetszedni a korabbi Phase 1 taskot egyetlen, lezarhato vertikalis slice-ra: implementer `pairflow pass` eseten code bubble-ben az orchestrator-owned PASS validation gate dont a required commandok futtatasarol, a canonical PASS validation artifactok letrehozasarol, es a reviewer direktivarol a reviewer delivery elott.

### In Scope

1. `review_artifact_type=code` implementer PASS applicability gate.
2. PASS-boundary policy-allapot feloldasa a jelenlegi bubble config `[commands]` surface-bol: `policy_missing`, `policy_configured`, `policy_explicit_null`.
3. Required command set feloldasa determinisztikus sorrendben a meglovo config surface alapjan.
4. Thin internal validation runner, amely commandonkent canonical logot ir `.pairflow/evidence/` ala.
5. Canonical PASS validation metadata artifact irasa `.pairflow/artifacts/pass-validation-evidence.json` ala.
6. Reviewer directive eloallitasa a gate eredmenyebol (`skip_full_rerun` vagy `run_checks`).
7. PASS flow wiring: gate fusson az implementer PASS normal flow-ban a reviewer delivery elott.
8. Determinisztikus fail-fast terminal error output `pass_validation_command_missing|pass_validation_command_failed|pass_validation_execution_error` reason code-okkal.

### Out of Scope

1. Restart/reconcile recovery marker semantics.
2. Trusted reuse hardening recovery-uncertainty es korrupcio eseteire.
3. Meta-review / approval same-round convergence parity guard.
4. Uj publikus CLI surface a runnerhez.
5. Framework-specifikus parser/proxy logika.

### Safety Defaults

1. `policy_configured` mellett barmilyen invalid vagy hianyos command-feloldas fail-closed legyen.
2. A gate ne tagitsa ki a command source-ot repo-hardcode vagy summary-claim iranyba.
3. A docs-only bubble tovabbra se aktiválja a code PASS gate-et.
4. A runner csak evidence/log es artifact side effectet okozhat; bubble state vagy transcript mutaciot itt ne vegezzen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. A task a meglovo PASS flow belso orchestrationjet hardeneli; nem vezet be uj publikus config vagy CLI contractot.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/pass/passValidationGate.ts` | `resolvePassValidationForPass` | `(ResolvePassValidationForPassInput, deps?) -> Promise<ResolvePassValidationForPassResult>` | uj application seam | Policy + command resolution + runner + directive authority egy helyen | P1 | required-now | Az elozo taskban a fenti concernok szetcsusztak tobb path kozott |
| CS2 | `src/core/runtime/passValidationRunner.ts` | `runPassValidationCommand` | `({ kind, command, worktreePath }) -> Promise<{ command, exitCode, logPath, durationMs }>` | uj core runtime helper | Thin shell runner canonical logirassal es fail-fast kompatibilis eredmennyel | P1 | required-now | A PASS gate csak stabil runner contractra epulhet |
| CS3 | `src/core/runtime/passValidationEvidence.ts` | policy/artifact helpers | `bubbleTomlPath/worktreePath based helpers -> policy + metadata artifact` | uj core runtime helper | Policy state separation es canonical artifact iras | P1 | required-now | A gate megbizhato reuse/reviewer donteshez canonical artifact kell |
| CS4 | `src/v11/application/pass/runNormalPassFlow.ts` | `runNormalPassFlow` | `(RunNormalPassFlowInput, deps) -> Promise<TResult>` | normal pass flow eleje | A gate eredmenye adja az effective refeket es a reviewer direktivat | P1 | required-now | A valtozas autoritativ boundary-ja itt van |
| CS5 | `src/v11/application/pass/normalPassDeliveryExecution.ts` | `executeNormalPassDelivery` | `(ExecuteNormalPassDeliveryInput, deps) -> Promise<ExecuteNormalPassDeliveryResult>` | reviewer delivery input | A delivery mar csak a gate altal elkeszitett direktivat viszi tovabb | P1 | required-now | Ne legyen masodik, parallel reviewer-directive authority |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| PASS validation policy resolution | implicit / szetszorva | explicit policy state + ordered command set | `policy_state`, `commands[]`, `required_command_set_id` | `invalidReason` | non-breaking internal | P1 | required-now |
| PASS validation artifact | nem canonical Phase 1 authority | canonical JSON artifact | `schema_version`, `bubble_id`, `round`, `generated_at`, `head_sha`, `git_status_hash`, `trust_level`, `trust_reason_code`, `policy_state`, `commands[]`, `required_command_set_id`, `reuse_denied_reason_code` | none | additive internal | P1 | required-now |
| Reviewer directive handoff | delivery kozben reszben feloldott | gate altal teljesen feloldott | `skip_full_rerun`, `reason_code`, `reason_detail`, `verification_status` | none | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| FS | `.pairflow/evidence/*.log`, `.pairflow/artifacts/pass-validation-evidence.json`, reviewer compatibility artifact | transcript/state/runtime session mutacio | A gate csak evidence/artifact writers legyen | P1 | required-now |
| Process | shell validation command futtatas worktree cwd-vel | framework-specifikus parse/proxy vagy side-channel CLI | Runner thin wrapper marad | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `policy_missing` | bubble config | result | untrusted `run_checks` + canonical metadata | `pass_validation_policy_missing` | warn | P1 | required-now |
| explicit null-set | bubble config | result | trusted `skip_full_rerun` + `commands=[]` metadata | `no_trigger` | info | P1 | required-now |
| configured policy invalid / missing command | bubble config | throw | PASS stop reviewer delivery nelkul | `pass_validation_command_missing` | error | P1 | required-now |
| runner spawn/runtime hiba | runner | throw | PASS stop reviewer delivery nelkul | `pass_validation_execution_error` | error | P1 | required-now |
| command non-zero exit | runner | throw | PASS stop reviewer delivery nelkul | `pass_validation_command_failed` | error | P1 | required-now |
| reviewer compatibility artifact write fail, canonical metadata write sikeres | artifact writer | fallback | PASS folytatodik warninggal | artifact warning only | warn | P2 | required-now |
| canonical metadata write fail success/non-terminal pathon | artifact writer | throw | PASS stop fail-closed | `pass_validation_artifact_persist_failed` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `src/core/runtime/passValidationRunner.ts`, `src/core/runtime/passValidationEvidence.ts`, existing PASS flow seams | P2 | required-now |
| must-not-use | repo-specifikus command hardcode, summary-only trust, uj public CLI surface | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | configured policy + all commands pass | valid ordered required set | implementer PASS | logs + metadata artifact + trusted skip directive | P1 | required-now | gate success coverage |
| T2 | configured policy invalid command set | missing/invalid required command id | implementer PASS | PASS fail before reviewer delivery with `pass_validation_command_missing` | P1 | required-now | current review identified fail-closed requirement |
| T3 | command exits non-zero | first required command fails | implementer PASS | fail-fast stop, failed log path in terminal output | P1 | required-now | BC5/BC6 behavior |
| T4 | runner execution error | spawn/init error | implementer PASS | terminal `pass_validation_execution_error` | P1 | required-now | runner contract |
| T5 | explicit null policy | `validation_required=[]` + explicit flag | implementer PASS | no runner call, `commands=[]`, trusted skip | P1 | required-now | policy state split |
| T6 | policy missing | no explicit PASS policy | implementer PASS | untrusted `run_checks` without hard fail | P1 | required-now | onboarding path |
| T7 | docs-only bubble | `review_artifact_type=document` | implementer PASS | no code gate, no terminal validation path | P1 | required-now | non-code safety |
| T8 | reviewer PASS regression | sender role reviewer | PASS flow | gate does not alter reviewer semantics | P1 | required-now | reviewer isolation |

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

1. A task csak a PASS gate core-ra ervenyes; restart/reconcile es meta-review parity findingok nem hozhatok vissza `required-now` scope-ba.
2. Max 2 L1 hardening round.
3. Uj `required-now` csak akkor engedheto be, ha kozvetlenul a PASS gate core authority-jat totri meg.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
