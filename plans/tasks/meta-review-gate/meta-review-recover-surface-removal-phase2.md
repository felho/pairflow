---
artifact_type: task
artifact_id: task_meta_review_recover_surface_removal_phase2_v1
title: "Meta-Review Recover Surface Removal (Phase 2)"
status: draft
phase: phase2
target_files:
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/cli/index.ts
  - docs/meta-review-gate-prd.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/meta-review-gate-e2e-validation.md
  - tests/cli/index.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
prd_ref: null
plan_ref: plans/meta-review-recover-and-reconcile-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recover Surface Removal (Phase 2)

## L0 - Policy

### Goal

Tavolitsa el a public/operator `pairflow bubble meta-review recover` surface-t, es minden docs/help/test helyen tegye explicitte, hogy a tamogatott remediation `restart` vagy uj meta-review futtatas.

### In Scope

1. `recover` CLI parser/dispatcher/help surface torlese.
2. PRD/runbook/e2e/docs allitasok frissitese.
3. CLI es contract tesztek igazítása az uj, recover-mentes public surface-hez.

### Out of Scope

1. Internal runtime finalize logic tovabbi valtoztatasa.
2. Uj operator command bevezetese `recover` helyett.
3. Restart command szemantika ujratervezese.

### Safety Defaults

1. Nem maradhat hidden alias, no-op vagy retained wrapper a `recover` command helyen.
2. A docs nem allithatjak, hogy snapshot-route replay tamogatott remediation.
3. A user-visible guidance explicit legyen: `restart` vagy uj meta-review futtatas.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI grammar/help contract,
   - operator documentation contract,
   - contract/e2e expectation surface.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: public CLI subtree `bubble meta-review`
   - competing identifiers or fallback identities: hidden alias or wrapper command
10. Authority/source-of-truth note:
   - canonical source: actual supported operator commands after Phase 1
   - forbidden secondary sources: stale docs/help/examples claiming `recover`

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` | dispatcher routing | `dispatchMetaReviewCommand(...) -> Promise<...>` | command branch table | nincs `recover` dispatch branch | P1 | required-now | T1 |
| CS2 | `src/v11/application/metaReview/metaReviewCliOptions.ts` | help text | `getBubbleMetaReviewHelpText() -> string` | help surface | a help-bol eltunik a `recover` command | P1 | required-now | T1 |
| CS3 | `src/cli/index.ts` | top-level CLI handling | existing top-level CLI entry | operator surface | a `recover` invocation explicit unsupported/unknown command eredmenyt ad | P1 | required-now | T2 |
| CS4 | `docs/meta-review-gate-prd.md`, `docs/meta-review-gate-rollout-runbook.md`, `docs/meta-review-gate-e2e-validation.md` | docs surface | docs text | operator docs | nincs snapshot-route recovery claim; restart/new-run guidance marad | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Public CLI grammar | `status | last-report | recover` | `status | last-report` | existing status/report flags | none | breaking-by-design | P1 | required-now |
| Operator remediation docs | recover/replay mentioned | restart/new-run only | concrete command guidance | rationale | user-visible clarification | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI/help | command removal and explicit unsupported behavior | hidden alias or compatibility wrapper | required-now | P1 | required-now |
| Docs | final-state sync to supported remediation | stale recover examples | required-now | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| user invokes removed `recover` command | CLI | result | explicit unsupported/unknown command guidance; no reroute | existing CLI invalid-command surface or explicit replacement | warn | P1 | required-now |
| docs/test still reference recover as supported | N/A | review/test failure | update to restart/new-run guidance | docs parity failure | warn/error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 runtime removal baseline | P1 | required-now |
| must-use | docs/help/code search proving `bubble meta-review recover` public removal | P1 | required-now |
| must-not-use | retained alias, hidden reroute, deprecated-but-still-working recover branch | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | CLI help/dispatcher no longer expose recover | meta-review CLI fixture | help/dispatch runs | no recover branch or help row remains | P1 | required-now | automated test |
| T2 | removed command fails closed | CLI invocation for `bubble meta-review recover` | command runs | non-success invalid/unsupported command behavior, no hidden fallback | P1 | required-now | automated test |
| T3 | docs describe restart/new-run only | docs diff/code search | review runs | no supported recover claim remains | P1 | required-now | doc review + code search |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az unsupported-command wording szetszorodik, erdemes lehet central CLI helperbe emelni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | unify operator remediation examples | L2 | P2 | later-hardening | doc follow-up | normalize restart/new-run examples across wider docs set |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
