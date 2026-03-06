---
artifact_type: task
artifact_id: task_doc_only_evidence_source_whitelist_phase1_v1
title: "Docs-Only Evidence Source Whitelist (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/reviewer/testEvidence.ts
  - tests/core/reviewer/testEvidence.test.ts
  - docs/llm-doc-workflow-v1.md
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/doc-only-priority-and-rollout-plan-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/reviewer-severity-ontology.md
  - plans/tasks/doc-only-issues/doc-only-summary-verifier-consistency-gate-phase1.md
owners:
  - "felho"
---

# Task: Docs-Only Evidence Source Whitelist (Phase 1)

## L0 - Policy

### Goal

A command verification csak explicit, megbizhato evidence-forrasokbol dolgozhasson, hogy prose/artifact refek ne adhassanak hamis `verified` allapotot.

### In Scope

1. Evidence source whitelist policy bevezetese command verification pathra.
2. Nem-whitelisted refek kizárása a command verification inputból.
3. Diagnosztikai okjelzes (`reason`) rogzites, amikor ref kizáras tortenik.
4. Regresszios tesztek a `done-package.md`/artifact-json tipusokra.

### Out of Scope

1. Uj log formatum vagy uj evidence pipeline tervezese.
2. Altalanos trust scoring rendszer.
3. Runtime policy redesign a docs-only scope-on kivul.

### Safety Defaults

1. Ha egy ref forraspolicy szerint nem elfogadott, az default `untrusted` (fail-safe).
2. Whitelist parse/validation hiba eseten konzervativ fallback: csak canonical evidence path fogadhato el.
3. Ismeretlen artifact tipus nem adhat `verified` statuszt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: verifier input-source contract (`--ref` acceptance policy) es reviewer auditability.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/reviewer/testEvidence.ts` | command evidence source filter | `filterAllowedEvidenceRefs(refs: string[]) -> {allowed: string[], rejected: string[]}` | command evidence resolution eleje | csak whitelistelt refek mennek verifier pathra | P1 | required-now | T1, T2, T3 |
| CS2 | `src/core/reviewer/testEvidence.ts` | verifier decision assembly | `buildVerificationDecision(input) -> decision` | source filter utan | rejected refek nem allithatnak elo `verified` allapotot; reason tartalmazza a kizárást | P1 | required-now | T1, T2, T4 |
| CS3 | `tests/core/reviewer/testEvidence.test.ts` | regression suite | `runEvidenceSourcePolicyTests() -> pass/fail` | uj test esetek | a korabbi false-positive mintak stabilan blokkoltak | P1 | required-now | T1-T5 |
| CS4 | `docs/llm-doc-workflow-v1.md` | policy note update | `documentAcceptedEvidencePatterns() -> markdown_delta` | docs policy szakasz | roviden dokumentalt accepted source pattern | P2 | later-hardening | T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Verifier input refs | heterogen, tul tag | whitelist-alapu | `refs[]`, `source_path` | `source_hint` | behavior-tightening | P1 | required-now |
| Source policy result | implicit | explicit filter result | `allowed_refs[]`, `rejected_refs[]`, `policy_reason` | `debug_notes` | additive internal contract | P1 | required-now |
| Verification output reason | nem mindig explicit source-level | explicit source-policy reason | `status`, `reason_code` | `reason_detail` | backward-compatible output, richer diagnostics | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Verifier decision path | verification reason/status modositas source-policy alapjan | bubble lifecycle/state machine modositas | csak reviewer evidence policy reteg valtozik | P1 | required-now |
| Diagnostics | source rejection reason rogzites | uj kulso I/O vagy network hivas | local-only diagnostics | P2 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| non-whitelisted evidence ref | local source policy | result | ref reject + `untrusted` verification | EVIDENCE_SOURCE_NOT_ALLOWED | warn | P1 | required-now |
| whitelist policy parse hiba | local config/pattern set | fallback | strict canonical-only acceptance | EVIDENCE_SOURCE_POLICY_FALLBACK | warn | P1 | required-now |
| mixed refs (allowed + rejected) | local source policy | result | csak allowed refs szamitanak, rejected list diagnosticsba megy | EVIDENCE_SOURCE_PARTIAL_REJECT | info | P2 | required-now |
| dependency failure | N/A | fallback | `N/A` | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | meglévo verifier/evidence pipeline (`src/core/reviewer/testEvidence.ts`) | P2 | required-now |
| must-use | determinisztikus local pattern matching (no heuristic guess) | P2 | required-now |
| must-not-use | uj external dependency bevezetese ehhez a policyhoz | P2 | required-now |
| must-not-use | prose/artifact ref elfogadasa command evidence-kent (`done-package.md`, `reviewer-test-verification.json`) | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Non-log markdown artifact rejected | `--ref done-package.md` | verifier fut | nincs `verified` command status, reason source-policy rejectet mutat | P1 | required-now | automated test |
| T2 | Non-log artifact JSON rejected | `--ref reviewer-test-verification.json` | verifier fut | nincs `verified` command status, reason source-policy rejectet mutat | P1 | required-now | automated test |
| T3 | Canonical evidence log accepted | `.pairflow/evidence/*.log` | verifier fut | trusted path valtozatlanul mukodik | P1 | required-now | automated test |
| T4 | Mixed ref set behavior | allowed + rejected refs egyutt | verifier fut | csak allowed refs szamitanak, rejected refs diagnosticsban listazva | P1 | required-now | automated test |
| T5 | Policy fallback determinism | whitelist parse hiba szimulacio | verifier fut | strict fallback lep eletbe, false-positive verified nem keletkezik | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Evidence source policy patternek kulon config blokkba emelese.
2. [later-hardening] CLI help szoveg frissites a javasolt `--ref` forrasokra.
3. [later-hardening] Kibovitett diagnostics payload (pl. rejected ref count by type).

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Source-policy config kulon dokumentumba szervezese | L2 | P2 | later-hardening | post-phase1 | csak ha Phase 1 stabil |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Blocker definicio: `P0/P1 + required-now + L1`.
3. `P0/P1` allitas finding-level evidence nelkul nem elfogadhato.
4. Max 2 L1 hardening kor.
5. 2. kor utan uj `required-now` csak evidence-backed `P0/P1`.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha minden `P0/P1 + required-now` pont zart:
1. whitelist policy deterministic viselkedese teszttel igazolt,
2. non-whitelisted source nem adhat `verified` allapotot,
3. canonical log source path nem regresszal,
4. diagnostics reason code-ok audit-keszek.
