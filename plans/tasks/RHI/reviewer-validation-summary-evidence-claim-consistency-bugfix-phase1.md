---
artifact_type: task
artifact_id: task_reviewer_validation_summary_evidence_claim_consistency_bugfix_phase1_v1
title: "Reviewer Validation Summary Evidence-Claim Consistency Bugfix (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/runtime/reviewerScoutExpansionGuidance.ts
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - tests/core/runtime/reviewerScoutExpansionGuidance.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Validation Summary Evidence-Claim Consistency Bugfix (Phase 1)

## Incident Context (Frozen Reference)

1. Incident bubble: `impl-reviewer-prompt-command-gate-clarification-v1`
2. Incident date window (UTC): 2026-03-07 22:56:07 -> 23:05:34
3. Transcript path:
   - `.pairflow/bubbles/impl-reviewer-prompt-command-gate-clarification-v1/transcript.ndjson`
4. Key message ids:
   - `msg_20260307_002`: implementer summary says lint failed baseline + typecheck/test pass
   - `msg_20260307_003`: reviewer summary contains `typecheck/lint pass` wording
   - `msg_20260307_005`: reviewer convergence summary corrects lint as baseline failure
5. Evidence paths used in this incident:
   - `/Users/felho/dev/.pairflow-worktrees/pairflow/impl-reviewer-prompt-command-gate-clarification-v1/.pairflow/evidence/lint.log`
   - `/Users/felho/dev/.pairflow-worktrees/pairflow/impl-reviewer-prompt-command-gate-clarification-v1/.pairflow/evidence/typecheck.log`
   - `/Users/felho/dev/.pairflow-worktrees/pairflow/impl-reviewer-prompt-command-gate-clarification-v1/.pairflow/evidence/test.log`
6. Evidence markers:
   - `lint.log`: `PAIRFLOW_EVIDENCE_COMMAND_RESULT ... status=failed exit=1`
   - `typecheck.log`: `... status=pass exit=0`
   - `test.log`: `... status=pass exit=0`
7. Commit anchors:
   - Incident-time `main`/bubble head: `a2f0399c60253a4356f71be61723016e124d91b7`
   - Prior related implementation anchor: `c90eeff`
8. Codex session id:
   - Not persisted as a stable repo artifact today.
   - Canonical forensic identifiers for this incident are bubble id + transcript `msg_*` ids + git SHA.

## L0 - Policy

### Goal

Szuntesse meg azt a riport-konzisztencia hibat, amikor reviewer summary explicit validation claimet tesz (`lint pass`, `typecheck pass`, `tests pass`), de ez nincs osszhangban a valos evidence marker allapottal.

### In Scope

1. Reviewer prompt contract hardening startup + resume + handoff feluleteken:
   - Validation allitasokhoz kotelezo evidence-first szabaly.
2. Determinisztikus summary wording szabaly:
   - commandonkent status kell (`lint`, `typecheck`, `test`) ahelyett, hogy osszefoglalo "X/Y pass" claim menjen.
3. Explicit tiltott wording lista:
   - pl. `typecheck/lint pass` aggregate allitas command-level source nelkul.
4. Fallback contract, ha evidence nem egyertelmu vagy nincs:
   - `unknown` vagy `not-run` allapotot kell jelenteni, nem `pass`-t.
5. Prompt parity biztositas startup/resume/handoff kozott.
6. Prompt assertion tesztek frissitese a fenti guardrailokra.

### Out of Scope

1. Existing lint baseline hibak javitasa (pl. `ui/*` lint debt).
2. Full runtime gate bevezetese, amely minden reviewer PASS summaryt hard-blockol mismatch eseten.
3. Historical transcript-ek automatikus javitasa.
4. Evidence pipeline attervezese vagy uj evidence formatum.

### Safety Defaults

1. Ha command status nem igazolhato determinisztikusan, summary allitas default: `unknown`.
2. Reviewer ne allitson osszesitett `all checks pass` claimet, ha barmelyik command status nem `pass`.
3. Prompt hardening nem valtoztathat protocol/state transition logikat ebben a phase-ban.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: reviewer prompt contract es reviewer summary wording policy.
3. Nem erintett boundary: DB/API/event/auth/state-machine transition policy.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract Delta | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | reviewer guidance builders | Uj validation-claim guardrail sorok: evidence-first, command-level status, forbidden aggregate wording | Reviewer guidance expliciten tiltja a "lint/typecheck pass" shorthand claimet source nelkul | P1 | required-now | T1, T3 |
| CS2 | `src/core/bubble/startBubble.ts` | `buildReviewerStartupPrompt` | CS1 guardrail explicit injektalasa startup promptba | Startup review kezdeten deterministic summary claim policy jelen van | P1 | required-now | T2 |
| CS3 | `src/core/bubble/startBubble.ts` | `buildResumeReviewerStartupPrompt` | CS1 guardrail explicit injektalasa resume promptba | Resume flowban sem veszhet el a summary claim policy | P1 | required-now | T2 |
| CS4 | `src/core/runtime/tmuxDelivery.ts` | reviewer PASS handoff action text | CS1 guardrail explicit injektalasa handoff promptba | Implementer->reviewer handoffkor is ugyanaz a policy ervenyes | P1 | required-now | T4 |
| CS5 | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` | guidance assertions | Required + forbidden token assert bovitese | Guardrail driftet teszt jelzi | P1 | required-now | T1, T3 |
| CS6 | `tests/core/bubble/startBubble.test.ts` | startup/resume reviewer prompt assertions | Cross-surface guardrail presence assertion | Startup+resume parity fenntartott | P1 | required-now | T2 |
| CS7 | `tests/core/runtime/tmuxDelivery.test.ts` | handoff reviewer prompt assertions | Handoffban ugyanaz a guardrail kulcsuzenet jelen | Startup/resume/handoff policy parity megvan | P1 | required-now | T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer validation claim source | implicit, driftre hajlamos | explicit evidence-first policy | `command_name`, `status`, `evidence_source` | `reason_if_unknown` | prompt-only hardening | P1 | required-now |
| Reviewer validation summary wording | aggregate shorthand allitasok elofordulhatnak | command-level normalized status wording | `lint=<pass|failed|not-run|unknown>`, `typecheck=<...>`, `test=<...>` | extra explanatory sentence | prompt contract tightening | P1 | required-now |
| Missing/ambiguous evidence handling | gyakran implicit | fail-safe wording policy | `unknown` vagy `not-run` explicit jeloles | optional reason detail | prompt contract tightening | P1 | required-now |
| Cross-surface consistency | startup/handoff drift kockazat | same rule-pack everywhere | same required/forbidden token families | wording variacio allowed anchorokon kivul | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Reviewer prompt text | validation-claim hardening | command/state transition valtoztatas | prompt-only phase | P1 | required-now |
| Reviewer summary behavior | pontosabb status wording | evidence nelkuli pass allitas | behavior prompton keresztul terelt | P1 | required-now |
| Tests | prompt assertion update | unrelated domain test valtozas | csak erintett reviewer prompt testek | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`result|fallback|test-fail`) | Fallback Value/Action | Reason Code | Audit Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer explicit pass claim evidence nelkul | reviewer prompt compliance | fallback | use `unknown` or `not-run` wording, no pass claim | `VALIDATION_CLAIM_UNVERIFIED` | audit-warn | P1 | required-now |
| Reviewer aggregate shorthand claim (`typecheck/lint pass`) | reviewer prompt compliance | fallback | command-level split status wording required | `VALIDATION_CLAIM_AGGREGATE_FORBIDDEN` | audit-info | P1 | required-now |
| Startup/resume/handoff prompt drift | tests | test-fail | fail on missing required anchors | `VALIDATION_CLAIM_PROMPT_DRIFT` | audit-error | P1 | required-now |

Note: reason code-ok ebben a phase-ban traceability azonosito-k, nem runtime exception class-ok.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing reviewer prompt build surfaces (`startBubble`, `tmuxDelivery`, scout guidance) | P1 | required-now |
| must-use | existing reviewer prompt test surfaces | P1 | required-now |
| must-use | incident context references listed above (bubble id + msg ids + evidence logs) | P1 | required-now |
| must-not-use | runtime/state-machine behavior valtoztatas ebben a phase-ban | P1 | required-now |
| must-not-use | blanket `all checks pass` allitas bizonytalan status mellett | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Guidance-level validation claim guardrail | reviewer guidance text | render + assert | tartalmazza: evidence-first, command-level status, unknown/not-run fallback | P1 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T2 | Startup/resume parity | reviewer startup + reviewer resume prompt | render + assert | mindket prompt tartalmazza ugyanazt a validation claim guardrail core anchor-t | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | Forbidden shorthand wording | reviewer guidance text | render + assert | nincs olyan policy-jovahagyas, ami aggregate `typecheck/lint pass` shorthandot enged | P1 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T4 | Handoff parity | reviewer PASS handoff message | render + assert | handoff is ugyanazt a validation claim guardrail policyt adja, mint startup/resume | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |

## Acceptance Criteria

1. AC1: Reviewer startup/resume/handoff promptok explicit evidence-first validation claim policyt tartalmaznak.
2. AC2: Prompt contract explicit command-level status wordinget kovetel (`lint/typecheck/test`) es tiltja az evidence-nelkuli aggregate shorthand claimet.
3. AC3: Ambiguous vagy hianyzo evidence eseten explicit `unknown`/`not-run` fallback policy szerepel.
4. AC4: Prompt tesztek lefedik a required + forbidden anchorokat mindharom surface-en.
5. AC5: Incident references (bubble id, msg ids, evidence paths, SHA anchors) rogzitve vannak audit celra ebben a taskban.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Runtime-level reviewer PASS summary/evidence consistency gate bevezetese (`warning` vagy `block` policy mod) kulon phase taskban.
2. [later-hardening] Structured summary status block (`validation_status: {lint,typecheck,test}`) bevezetese a reviewer output contractban.
3. [later-hardening] Approval summary normalizer, amely machine-readable evidence markerbol epit final human summaryt.

## Assumptions

1. A reprodukalt hiba fo oka prompt-level drift, nem state-machine transition hiba.
2. Prompt hardening Phase 1-ben mar erdemben csokkenti a riport-konzisztencia hibak gyakorisagat.
3. Full runtime block gate kulon, dedikalt taskban kezelendo, hogy blast radius kontrollalhato maradjon.

## Open Questions (Non-Blocking)

1. Kivanatos-e Phase 2-ben a mismatch automatikus block, vagy eleg warning + metric?

## Review Control

1. Ez a task prompt/test szintu bugfix; runtime transition logika valtozatlan marad.
2. Barmely runtime block-gate javaslat automatikusan `later-hardening`, kulon taskba kerul.
3. Incident-context anchorok (bubble/msg/evidence/SHA) nem torolhetok a taskbol, audit reprodukcio miatt.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. reviewer startup/resume/handoff promptokban a validation claim guardrail explicit es konzisztens,
2. prompt testek required+forbidden anchor alapon lefedik a guardrail driftet,
3. task dokumentumban a reprodukcios incident-context teljes (bubble id, msg ids, evidence paths, SHA-k),
4. phase scope megorzi a prompt-only blast radiust (nincs state-machine/protocol valtozas).
