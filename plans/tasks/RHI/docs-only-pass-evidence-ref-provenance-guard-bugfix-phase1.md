---
artifact_type: task
artifact_id: task_docs_only_pass_evidence_ref_provenance_guard_bugfix_phase1_v1
title: "Docs-Only PASS Evidence Ref Provenance Guard (Bugfix, Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/agent/pass.ts
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - tests/core/agent/pass.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
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

### Determinisztikus Definiciok (Phase 1)

1. `docs_only_context` igaz, ha a bubble `review_artifact_type=document`.
2. `runtime_checks_skipped_claim` igaz, ha a summary normalizalt (kisbetusitett + whitespace-collapsed) szovege tartalmazza valamelyik canonical markert:
   - `runtime checks intentionally not executed`
   - `runtime checks were intentionally not executed`
   - Phase 1 marker scope: csak a fenti canonical angol markerlista (lokalizalt markerbovites out-of-scope, lasd L2#4).
3. `runtime_log_ref` minden olyan ref, ami illeszkedik a mintara: `^\\.pairflow/evidence/[^\\s]+\\.log$`.
   - Jelentes: runtime-check evidence log osztaly; nem minden `--ref`, csak a fenti regex-szel matchelo log ref.
4. `docs_only_skip_log_ref_conflict` akkor igaz, ha:
   - `docs_only_context=true`
   - `runtime_checks_skipped_claim=true`
   - legalabb 1 db `runtime_log_ref` jelen van
5. A konfliktus-ellenorzes futasi sorrendje kotott:
   - PASS envelope append elott
   - barmilyen transcript append vagy handoff side-effect elott

### In Scope

1. Implementer PASS boundary guard docs-only bubblekre:
   - ha a PASS summary docs-only skip deklaraciot tartalmaz (`runtime_checks_skipped_claim=true`), runtime evidence log ref csatolasa tiltott.
2. Determinisztikus hard-fail viselkedes ilyen konfliktus esetere:
   - PASS command non-zero exit.
   - PASS envelope nem appendelodik.
3. Stabil reason code es diagnosztika bevezetese erre a konfliktusra.
4. Implementer docs-only prompt guidance pontositasa, hogy konfliktusos ref-csatolast ne sugalmazzon.
   - startup/resume + runtime delivery guidance utvonalakon is.
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
| CS1 | `src/core/agent/pass.ts` | implementer PASS path before envelope append | docs-only summary/ref consistency hard guard | csak akkor hard-fail + no-append, ha `docs_only_context=true` + `runtime_checks_skipped_claim=true` + `runtime_log_ref_count>=1`; minden reszfeltetel-hiany eseten nincs konfliktusblokk | P1 | required-now | T1, T2, T3, T4, T6 |
| CS2 | `src/core/agent/pass.ts` | PASS error surface | stable reason code + clear diagnostics | command, reason code, conflicting ref class surfaced | P1 | required-now | T1, T7 |
| CS3 | `src/core/bubble/startBubble.ts` | `buildImplementerEvidenceHandoffGuidance` docs-only branch | docs-only guidance explicit conflict-prevention wording | avoid stale/runtime log attachment when checks skipped | P1 | required-now | T9 |
| CS4 | `tests/core/agent/pass.test.ts` | implementer PASS tests | new guard regression scenarios | conflict path blocked, clean docs-only path preserved + partial-condition negatives + ordering + reason code lock | P1 | required-now | T1, T2, T3, T4, T6, T7, T8 |
| CS5 | `tests/core/bubble/startBubble.test.ts` | docs-only implementer prompt assertions | guidance wording lock | docs-only prompt no longer implies unsafe log attachment in skip case | P1 | required-now | T9 |
| CS6 | `src/core/runtime/tmuxDelivery.ts` | implementer-directed delivery action text for PASS/HUMAN_REPLY/APPROVAL_DECISION(revise) | docs-only safe guidance alignment | avoid generic "always attach .pairflow/evidence logs" wording in docs-only scope | P1 | required-now | T5 |
| CS7 | `tests/core/runtime/tmuxDelivery.test.ts` | delivery wording assertions | docs-only delivery guard wording lock | implementer delivery text does not encourage skip+runtime-log-ref contradiction | P1 | required-now | T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Docs-only skip declaration | prose-only statement | parseable claim class (`runtime_checks_skipped_claim`) | normalized summary + canonical marker detection | future localized marker set | additive validation | P1 | required-now |
| Docs-only runtime log refs | currently allowed even on skip declaration | forbidden on skip declaration | conflicting ref class detection (`^\\.pairflow/evidence/[^\\s]+\\.log$`) | conflict list details | tightening for docs-only | P1 | required-now |
| Error diagnostics | generic pass failure text | stable reason code + actionable message | `reason_code`, `conflicting_ref_count` | ref examples | additive | P1 | required-now |
| PASS append ordering | append-first flow | guard-first flow | pre-append conflict check before any transcript/handoff side-effect | diagnostic details | tightening for docs-only | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Implementer PASS validation | docs-only summary/ref conflict hard fail | reviewer or converged path behavior change | pass-boundary only | P1 | required-now |
| Docs-only prompt guidance | explicit safe wording | broad wording churn unrelated to evidence conflict | minimal prompt delta | P1 | required-now |
| Docs-only runtime delivery guidance | docs-only-aware text in implementer delivery messages | generic "attach logs if exist" in docs-only skip context | keep role/state semantics unchanged | P1 | required-now |
| Tests | targeted regressions for conflict/non-conflict | unrelated test rewrites | focused surface | P1 | required-now |

Constraint: implementation must stay within the listed allowed side effects.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Audit Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| docs-only summary says runtime checks skipped, but runtime log refs provided | summary + refs payload | throw | block PASS, no envelope append | `DOCS_ONLY_SKIP_LOG_REF_CONFLICT` | error | P1 | required-now |
| docs-only conflict guard evaluated after append | PASS emit pipeline ordering | forbidden | guard must run pre-append | `DOCS_ONLY_SKIP_LOG_REF_CONFLICT` | error | P1 | required-now |
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
| T1 | Conflict hard-fail | `review_artifact_type=document` + `runtime_checks_skipped_claim=true` + legalabb 1 db `runtime_log_ref` | `pairflow pass` executes | command fails non-zero, reason code `DOCS_ONLY_SKIP_LOG_REF_CONFLICT`, no PASS envelope append | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T2 | Non-conflict docs-only pass (missing runtime_log_ref) | `review_artifact_type=document` + `runtime_checks_skipped_claim=true` + nincs `runtime_log_ref` | `pairflow pass` executes | PASS continues normally (no conflict throw) | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T3 | Partial-condition negative A (missing skip claim) | `review_artifact_type=document` + `runtime_checks_skipped_claim=false` + van `runtime_log_ref` | `pairflow pass` executes | nincs docs-only skip/ref konfliktusblokk | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T4 | Partial-condition negative B (missing docs-only context) | `review_artifact_type=code` + `runtime_checks_skipped_claim=true` + van `runtime_log_ref` | `pairflow pass` executes | nincs docs-only skip/ref konfliktusblokk | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T5 | Docs-only delivery guidance lock | implementer-targeted delivery text render (PASS/HUMAN_REPLY/APPROVAL_DECISION revise) in docs-only context | delivery message built | text does not instruct runtime log attachment as default when skip declaration applies | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T6 | Guard ordering lock (pre-append) | T1 konfliktus allapot | `pairflow pass` executes | conflict guard az append elott fut; transcript/PASS envelope append side-effect nem tortenik meg | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T7 | Reason code stability lock | T1 konfliktus allapot | `pairflow pass` executes | surfaced reason code pontosan `DOCS_ONLY_SKIP_LOG_REF_CONFLICT` | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T8 | AC10 deterministic marker+regex lock | docs-only summary marker normalizacios variansok + vegyes ref lista (matchelo/nem matchelo) | `pairflow pass` executes | `runtime_checks_skipped_claim` es `runtime_log_ref` osztalyozas explicit marker + explicit regex alapjan determinisztikus | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T9 | Guidance lock (startup/resume prompt) | docs-only implementer startup/resume prompt build | prompt rendered | wording clearly prevents skip+runtime-log-ref conflict | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |

## Acceptance Criteria

1. AC1: Docs-only skip declaration + runtime log ref konfliktus determinisztikusan blokkolja az implementer PASS-t.
2. AC2: Konfliktusban PASS envelope nem appendelodik.
3. AC3: Konfliktus hiba uzenete stabil reason code-dal (`DOCS_ONLY_SKIP_LOG_REF_CONFLICT`) kerul felszinre.
4. AC4: Non-conflict docs-only path (skip declaration + no runtime log refs) valtozatlanul mukodik.
5. AC5: Docs-only implementer guidance explicit konfliktus-megelozo wordinget tartalmaz.
6. AC6: Non-doc implementer PASS path nem regresszal.
7. AC7: A task tartalmazza az incident visszakereseshez szukseges forenzikus anchorokat (`bubble_id`, `bubble_instance_id`, `msg_*`, tmux session snapshot, transcript path).
8. AC8: A docs-only conflict guard append elott fut; konfliktus eseten transcriptbe nem kerul uj PASS envelope.
9. AC9: Implementer-targeted docs-only delivery guidance konzisztens a skip+no-runtime-log-ref policyval.
10. AC10: A skip-claim detektalas es runtime-log-ref klasszifikacio deterministicusan, explicit marker + explicit regex alapjan tortenik.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Structured PASS summary field (pl. `runtime_checks_executed=true|false`) bevezetese, hogy a skip-claim parse ne pusztan szovegre epuljon.
2. [later-hardening] Ref provenance timestamp/hash ellenorzes (same-round generation proof).
3. [later-hardening] Auto-remediation opcio: konfliktus eseten log refek automatikus eldobasa hard-fail helyett (explicit policy dontessel).
4. [later-hardening] Canonical markerlista lokalizacios bovitese (pl. hu/en marker set) explicit versionelessel.

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
