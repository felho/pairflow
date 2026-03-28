---
artifact_type: task
artifact_id: task_workflow_quality_gates_phase1b_pass_validation_reuse_recovery_v1
title: "Workflow Quality Gates Phase 1B - PASS Validation Reuse and Recovery Hardening"
status: implementable
phase: phase1b
target_files:
  - "src/core/runtime/passValidationEvidence.ts"
  - "src/v11/application/restart/runRestartFlow.ts"
  - "src/v11/application/reconcile/runReconcileFlow.ts"
  - "src/v11/application/restart/restartCommandContract.ts"
  - "src/v11/application/reconcile/reconcileCommandContract.ts"
  - "src/v11/shared/restart/restartCommandDependencyResolution.ts"
  - "src/v11/shared/reconcile/reconcileCommandDependencyResolution.ts"
  - "tests/core/runtime/passValidationEvidence.test.ts"
  - "tests/v11/application/pass/passValidationGate.test.ts"
  - "tests/v11/application/restart/runRestartFlow.test.ts"
  - "tests/v11/application/reconcile/runReconcileFlow.test.ts"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Workflow Quality Gates Phase 1B - PASS Validation Reuse and Recovery Hardening

## L0 - Policy

### Goal

A PASS validation trusted reuse modell fail-closed hardeningje ugyanarra az authority-re epitve: reuse csak akkor engedelyezett, ha a canonical artifact tenyleges command coverage-e, fingerprintje, freshness-e es recovery-allapota megbizhato. A restart/reconcile recovery marker logika ezt a dontest tamogatja, de nem hozhat letre uj inkonzisztens allapotot.

### In Scope

1. Reuse eligibility fail-closed validalasa a canonical artifact `commands[]` tartalmabol, nem csak a tarolt marker-mezo alapjan.
2. Artifact command coverage, exit status es log-path trust ellenorzese reuse elott.
3. Malformed vagy szemantikailag serult PASS validation artifact deny-olja a reuse-t.
4. Recovery marker olvasas: korrupcio, truncation, invalid schema, invalid timestamp kezelese recovery uncertainty-kent.
5. Restart flow marker persistence semantics finomitasa.
6. Reconcile flow marker persistence finomitasa ugy, hogy ne hozzon letre fantom worktree pathokat.
7. Reuse denial reason code-ok es metadata mezok pontos, auditálhato kitoltese.

### Out of Scope

1. PASS gate core policy resolution vagy runner contract ujratervezese.
2. Meta-review / approval same-round reviewer convergence parity.
3. Uj artifact schema version vagy publikus CLI/API surface.

### Safety Defaults

1. Barmilyen korrupt vagy nem teljes reuse input `reusable=false` eredmenyt adjon, ne trusted reuse-t.
2. Recovery marker olvasasi bizonytalansag reuse deny legyen, ne silent skip.
3. Reconcile nem teremthet uj worktree konyvtarat csak recovery marker miatt.
4. Restart/reconcile warning oke, de recovery uncertainty ne vesszen el.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Belso artifact/recovery semantics hardening; nincs uj publikus config vagy API contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/passValidationEvidence.ts` | `evaluatePassValidationEvidenceReuse` | `(input) -> Promise<PassValidationReuseDecision>` | reuse evaluator | Trusted reuse csak teljes coverage + valid success command set mellett mehessen at | P1 | required-now | A review egy coverage fail-open rest mutatott |
| CS2 | `src/core/runtime/passValidationEvidence.ts` | `readPassValidationRecoveryMarker` | `(repoPath, bubbleId, worktreePath?) -> Promise<marker | undefined>` | recovery marker reader | Korrupt marker allapot ne vesszen el silently | P1 | required-now | Recovery uncertainty fail-closed cel |
| CS3 | `src/v11/application/restart/runRestartFlow.ts` | `runRestartFlow` | `(input, deps) -> Promise<RestartBubbleResult>` | restart flow | Recovery marker figyelmeztetes/siker semantics maradjon egyertelmu es auditalhato | P1 | required-now | Restart marker a reuse modell authority-ja |
| CS4 | `src/v11/application/reconcile/runReconcileFlow.ts` | `runReconcileFlow` | `(repoPath, input, deps) -> Promise<ReconcileRuntimeSessionsReport>` | reconcile flow | Marker persistence ne hozzon letre uj arva worktree pathokat | P1 | required-now | Review finding: phantom worktree risk |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reuse coverage validation | marker-field trust only | artifact command coverage revalidation | `commands[].kind`, `commands[].command`, `commands[].exit_code`, `commands[].log_path`, `required_command_set_id` | none | non-breaking internal | P1 | required-now |
| Recovery marker read semantics | parse/schema hibak gyakran silently ignored | malformed marker => recovery uncertainty signal | `bubble_id`, `occurred_at`, `source` | none | non-breaking internal | P1 | required-now |
| Reconcile persistence | worktree path always derived and passed | worktree marker write csak letezo worktree-re | `repoPath`, `bubbleId`, `source`, `now` | `worktreePath` only when safe | non-breaking internal | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| FS | existing runtime marker path, bubble fallback artifact, optional existing worktree artifact | nem letezo worktree fa letrehozasa cleanup kozben | Reconcile-nel kulon tiltott | P1 | required-now |
| Reuse decision | deny + fallback trigger | trusted skip korrupt/partial artifact alapjan | fail-closed az elvart default | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| artifact `commands[]` coverage mismatch | artifact reader | result | `reusable=false`, fallback runner | `pass_validation_evidence_mismatch` | warn | P1 | required-now |
| artifact command non-zero / missing log / invalid path | artifact reader | result | `reusable=false`, fallback runner | `pass_validation_evidence_mismatch` | warn | P1 | required-now |
| corrupt recovery marker JSON/schema/timestamp | marker reader | result | `reusable=false`, fallback runner | `pass_validation_evidence_recovery_uncertain` | warn | P1 | required-now |
| reconcile marker write blocked | FS | fallback | keep removal success, surface warning, preserve repo-level marker if possible | `pass_validation_recovery_marker_persist_failed` | warn | P2 | required-now |
| restart marker write blocked but restart succeeds | FS | fallback | restart success warninggal, reuse deny repo/fallback marker szerint | `pass_validation_recovery_marker_persist_failed` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing `createRequiredCommandSetId`, canonical artifact helpers, restart/reconcile dependency seams | P2 | required-now |
| must-not-use | trust by stored marker only, worktree path blind recreation, silent recovery-marker corruption ignore | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | semantically corrupted artifact | matching `required_command_set_id` but partial/empty `commands[]` | reuse evaluate | deny as mismatch | P1 | required-now | current review finding |
| T2 | reused command failed previously | artifact trusted flag but a command has non-zero exit | reuse evaluate | deny as mismatch | P1 | required-now | fail-closed coverage |
| T3 | log path escapes or missing | artifact log path invalid | reuse evaluate | deny as mismatch | P1 | required-now | trust boundary |
| T4 | corrupt recovery marker JSON | marker file truncated / invalid JSON | reuse evaluate | deny as recovery uncertain | P1 | required-now | current review finding |
| T5 | invalid recovery timestamp | parsed marker but invalid `occurred_at` | reuse evaluate | deny as recovery uncertain | P1 | required-now | recovery trust |
| T6 | reconcile removes missing bubble | removed runtime session with no worktree present | reconcile flow | warning maybe, but no new worktree subtree created | P1 | required-now | phantom path regression |
| T7 | restart success + marker write failure | restart otherwise succeeds | restart flow | success result with warning, no misleading terminal failure | P1 | required-now | restart contract |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kesoibb lehet kulon artifact checksum vagy signed metadata, ha a local tamper-resistance kesobb fontos lesz.
2. [later-hardening] Marker multi-write durabilityrol lehet kulon follow-up observability.

## Assumptions

1. A Phase 1A core gate mar letezik vagy e taskkal parhuzamosan keszul, de itt a focus a reuse/recovery fail-closed hardening.
2. A reuse deny tovabbra is fallback-trigger, nem onallo terminal hiba, ha a fallback run sikeres.

## Open Questions

1. No blocking open questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Stronger artifact tamper resistance | L2 | P2 | later-hardening | review discussion 2026-03-28 | Kulon task, ha local corruption modellnel erosebb vedelmet akarunk |

## Review Control

1. A task nem vihet be meta-review vagy approval parity javitasokat.
2. Uj `required-now` csak reuse/recovery fail-closed semantikahoz kapcsolodo bizonyitott resekbol johet.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
