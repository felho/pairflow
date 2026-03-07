---
artifact_type: task
artifact_id: task_docs_only_pass_evidence_ref_provenance_guard_bugfix_phase1_v1
title: "Docs-Only PASS Evidence Ref Provenance Guard (Bugfix, Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/agent/pass.ts
  - src/core/bubble/startBubble.ts
  - tests/core/agent/pass.test.ts
  - tests/core/bubble/startBubble.test.ts
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Docs-Only PASS Evidence Ref Provenance Guard (Bugfix, Phase 1)

## Incident Context (Frozen Forensics)

1. Incident bubble id: `doc-refine-pass-boundary-validation-hardening-phase1`
2. Bubble instance id: `bi_00mmgxrhz5_231a63e8cdb3c68d9a05`
3. Bubble branch: `bubble/doc-refine-pass-boundary-validation-hardening-phase1`
4. Bubble worktree:
   - `/Users/felho/dev/.pairflow-worktrees/pairflow/doc-refine-pass-boundary-validation-hardening-phase1`
5. Transcript path:
   - `/Users/felho/dev/pairflow/.pairflow/bubbles/doc-refine-pass-boundary-validation-hardening-phase1/transcript.ndjson`
6. Relevant transcript messages:
   - `msg_20260307_002` (codex PASS): docs-only summary says runtime checks intentionally not executed.
   - `msg_20260307_004` (codex PASS): docs-only summary still says checks intentionally not executed, but refs include shared evidence logs.
   - `msg_20260307_005` (reviewer convergence): no actionable findings, but this mismatch remained only as process-level P3 signal.
7. Specific ref mismatch observed in `msg_20260307_004`:
   - `.pairflow/evidence/lint.log`
   - `.pairflow/evidence/typecheck.log`
   - `.pairflow/evidence/test.log`
8. Runtime session metadata snapshot (ephemeral):
   - `tmuxSessionName`: `pf-doc-refine-pass-boun-01b816d3`
   - source: `.pairflow/runtime/sessions.json`
9. Codex session identity note:
   - Pairflow does not persist a stable "Codex chat session id" in repo artifacts.
   - Canonical trace keys for this incident are: `bubble_id`, `bubble_instance_id`, transcript `msg_*` ids, and git SHA at incident time.

## L0 - Policy

### Goal

Szuntesse meg azt a docs-only handoff inkonzisztenciat, amikor az implementer PASS summary expliciten azt allitja, hogy runtime checks nem futottak, megis runtime evidence log refek (`.pairflow/evidence/*.log`) csatolasra kerulnek ugyanabban a PASS-ben.

### Problem Statement

A jelenlegi flow nem ved determinisztikusan a docs-only PASS summary-claim es a csatolt evidence refek kozotti ellentmondas ellen. Emiatt audit-zajos, potencialisan felrevezeto handoff allhat elo.

### In Scope

1. Implementer PASS boundary guard docs-only bubblekre:
   - ha a PASS summary docs-only skip deklaraciot tartalmaz (runtime checks intentionally not executed), runtime evidence log ref csatolasa tiltott.
2. Determinisztikus hard-fail viselkedes ilyen konfliktus esetere:
   - PASS command non-zero exit.
   - PASS envelope nem appendelodik.
3. Stabil reason code es diagnosztika bevezetese erre a konfliktusra.
4. Implementer docs-only prompt guidance pontositasa, hogy konfliktusos ref-csatolast ne sugalmazzon.
5. Regresszios tesztek: boundary guard + docs-only prompt wording.

### Out of Scope

1. Altalanos evidence provenance redesign.
2. Nem-docs bubblek evidence policy-ja.
3. Utolagos transcript migration vagy mar rogzitett PASS uzenetek javitasa.
4. Reviewer summary parser/runtime gate altalanos ujratervezese.

### Safety Defaults

1. Docs-only skip-deklaracio + runtime log ref egyuttallas eseten fail-closed.
2. Konfliktusos PASS nem kerulhet handoff allapotba.
3. Non-doc bubble viselkedes valtozatlan marad.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: implementer PASS command validation + docs-only implementer guidance.
3. Nem erintett boundary: convergence policy, reviewer gate ontology, DB/API/auth/state machine core semantics.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract Delta | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/core/agent/pass.ts` | implementer PASS path before envelope append | docs-only summary/ref consistency hard guard | skip-deklaracio + runtime log ref -> hard fail + no append | P1 | required-now | T1, T2 |
| CS2 | `src/core/agent/pass.ts` | PASS error surface | stable reason code + clear diagnostics | command, reason code, conflicting ref class surfaced | P1 | required-now | T1 |
| CS3 | `src/core/bubble/startBubble.ts` | `buildImplementerEvidenceHandoffGuidance` docs-only branch | docs-only guidance explicit conflict-prevention wording | avoid stale/runtime log attachment when checks skipped | P1 | required-now | T3 |
| CS4 | `tests/core/agent/pass.test.ts` | implementer PASS tests | new guard regression scenarios | conflict path blocked, clean docs-only path preserved | P1 | required-now | T1, T2 |
| CS5 | `tests/core/bubble/startBubble.test.ts` | docs-only implementer prompt assertions | guidance wording lock | docs-only prompt no longer implies unsafe log attachment in skip case | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Docs-only skip declaration | prose-only statement | parseable claim class (`runtime_checks_skipped`) | summary text marker detection | localized wording variants | additive validation | P1 | required-now |
| Docs-only runtime log refs | currently allowed even on skip declaration | forbidden on skip declaration | conflicting ref class detection (`.pairflow/evidence/*.log`) | conflict list details | tightening for docs-only | P1 | required-now |
| Error diagnostics | generic pass failure text | stable reason code + actionable message | `reason_code`, `conflicting_ref_count` | ref examples | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Implementer PASS validation | docs-only summary/ref conflict hard fail | reviewer or converged path behavior change | pass-boundary only | P1 | required-now |
| Docs-only prompt guidance | explicit safe wording | broad wording churn unrelated to evidence conflict | minimal prompt delta | P1 | required-now |
| Tests | targeted regressions for conflict/non-conflict | unrelated test rewrites | focused surface | P1 | required-now |

Constraint: implementation must stay within the listed allowed side effects.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Audit Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| docs-only summary says runtime checks skipped, but runtime log refs provided | summary + refs payload | throw | block PASS, no envelope append | `DOCS_ONLY_SKIP_LOG_REF_CONFLICT` | error | P1 | required-now |
| docs-only summary says checks skipped, no runtime log refs | summary + refs payload | result | allow PASS normal path | `DOCS_ONLY_SKIP_NO_LOG_REFS` | info | P2 | required-now |
| non-doc artifact type | bubble config | result | no new guard action | `NOT_APPLICABLE_NON_DOCS` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing PASS boundary validation location in `src/core/agent/pass.ts` | P1 | required-now |
| must-use | existing docs-only implementer guidance builder in `startBubble.ts` | P1 | required-now |
| must-use | incident forensics block in this task (bubble/msg/context anchors) | P1 | required-now |
| must-not-use | generic behavior change for reviewer PASS path | P1 | required-now |
| must-not-use | migration/edit of historical transcripts | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Conflict hard-fail | docs-only implementer PASS summary declares skipped checks + refs include `.pairflow/evidence/*.log` | `pairflow pass` executes | command fails non-zero, reason code `DOCS_ONLY_SKIP_LOG_REF_CONFLICT`, no PASS envelope append | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T2 | Non-conflict docs-only pass | docs-only implementer PASS summary declares skipped checks + no runtime log refs | `pairflow pass` executes | PASS continues normally | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T3 | Guidance lock | docs-only implementer startup/resume prompt build | prompt rendered | wording clearly prevents skip+runtime-log-ref conflict | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | Non-doc no-regression | code bubble implementer PASS | `pairflow pass` executes | no false block from docs-only guard | P2 | required-now | `tests/core/agent/pass.test.ts` |

## Acceptance Criteria

1. AC1: Docs-only skip declaration + runtime log ref konfliktus determinisztikusan blokkolja az implementer PASS-t.
2. AC2: Konfliktusban PASS envelope nem appendelodik.
3. AC3: Konfliktus hiba uzenete stabil reason code-dal (`DOCS_ONLY_SKIP_LOG_REF_CONFLICT`) kerul felszinre.
4. AC4: Non-conflict docs-only path (skip declaration + no runtime log refs) valtozatlanul mukodik.
5. AC5: Docs-only implementer guidance explicit konfliktus-megelozo wordinget tartalmaz.
6. AC6: Non-doc implementer PASS path nem regresszal.
7. AC7: A task tartalmazza az incident visszakereseshez szukseges forenzikus anchorokat (`bubble_id`, `bubble_instance_id`, `msg_*`, tmux session snapshot, transcript path).

## L2 - Implementation Notes (Optional)

1. [later-hardening] Structured PASS summary field (pl. `runtime_checks_executed=true|false`) bevezetese, hogy a skip-claim parse ne pusztan szovegre epuljon.
2. [later-hardening] Ref provenance timestamp/hash ellenorzes (same-round generation proof).
3. [later-hardening] Auto-remediation opcio: konfliktus eseten log refek automatikus eldobasa hard-fail helyett (explicit policy dontessel).

## Assumptions

1. A reprodukalt esetben a fo problema nem a dokumentum tartalma, hanem a PASS packaging policy gap.
2. Phase 1-ben fail-closed guard jobb, mint implicit LLM-onfegyelem.
3. A docs-only bubble celrendszerben runtime log ref csatolas nem kritikus kovetelmeny.

## Open Questions (Non-Blocking)

1. Hosszu tavon maradjon-e hard-fail, vagy legyen explicit opt-in auto-strip policy?

## Review Control

1. Ez bugfix task, nem behavior redesign.
2. Runtime/path szelesites csak `later-hardening` follow-upban engedelyezett.
3. Forenzikus anchorok torlese nem engedett refinement soran.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. docs-only skip/ref konfliktus determinisztikus PASS-boundary hard failkent formalizalt,
2. reason code contract stabil es teszttel vedett,
3. docs-only guidance wording explicit a konfliktus megelozesere,
4. incident-context forensic blokk teljes (bubble/msg/session/path anchors),
5. non-doc path regresszio explicit teszttel fedett.
