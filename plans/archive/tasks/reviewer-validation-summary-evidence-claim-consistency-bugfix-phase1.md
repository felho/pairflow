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

Szuntesse meg azt a report-konzisztencia hibat, amikor a reviewer summary explicit validation claimet tesz (`lint pass`, `typecheck pass`, `test pass`), de ez nincs osszhangban a valos evidence marker allapottal.
Phase 1 celja: prompt-contract + prompt-test hardening, runtime/state transition logika modositas nelkul.

### In Scope

1. Reviewer prompt contract hardening startup + resume + handoff feluleteken:
   - Validation allitasokhoz kotelezo evidence-first szabaly.
2. Determinisztikus summary wording szabaly:
   - commandonkent status kell (`lint`, `typecheck`, `test`) ahelyett, hogy osszesitett shorthand claim menjen.
3. Explicit tiltott wording lista:
   - pl. `typecheck/lint pass`, `all checks pass` olyan esetben, ahol command-level source nincs egyertelmuen alatamasztva.
4. Fallback contract, ha evidence nem egyertelmu vagy nincs:
   - `unknown` vagy `not-run` allapotot kell jelenteni, nem `pass`-t.
5. Prompt parity biztositas startup/resume/handoff kozott.
6. Prompt assertion tesztek frissitese required + forbidden anchorokra.
7. Acceptance traceability matrix biztositas (L0 kovetelmeny -> L1 contract -> test coverage).

### Out of Scope

1. Existing lint baseline hibak javitasa (pl. `ui/*` lint debt).
2. Full runtime gate bevezetese, amely minden reviewer PASS summaryt hard-blockol mismatch eseten.
3. Historical transcript-ek automatikus javitasa.
4. Evidence pipeline attervezese vagy uj evidence formatum.

### Safety Defaults

1. Ha command status nem igazolhato determinisztikusan, summary allitas default: `unknown` vagy `not-run`.
2. Reviewer ne allitson osszesitett `all checks pass` claimet, ha barmelyik command status nem explicit `pass` evidence-markerral igazolva.
3. Prompt hardening nem valtoztathat protocol/state transition logikat ebben a phase-ban.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: reviewer prompt contract es reviewer summary wording policy.
3. Nem erintett boundary: DB/API/event/auth/state-machine transition policy.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Contract Delta | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerScoutExpansionWorkflowGuidance` | `() -> string` | workflow guidance text | Validation-claim guardrail: evidence-first + command-level status + aggregate tiltasa + fallback | Reviewer guidance expliciten tiltja az evidence-nelkuli aggregate claimet, es command-level reportot ker | P1 | required-now | T1, T4, T6 |
| CS2 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerPassOutputContractGuidance` | `() -> string` | PASS output contract text | `Scout Coverage`/summary contract kiegeszitese command-level validation status policyvel | PASS output contractbol egyertelmu, hogy `lint/typecheck/test` statusonkent kell allitani | P1 | required-now | T1, T4, T6 |
| CS3 | `src/core/bubble/startBubble.ts` | `buildReviewerStartupPrompt` | `(input: { bubbleId: string; repoPath: string; worktreePath: string; taskArtifactPath: string; reviewArtifactType: ReviewArtifactType; reviewerBriefText?: string; }) -> string` | existing reviewer startup instruction chain | CS1-CS2 guardrail explicit injektalasa startup promptba | Startup review kezdeten deterministic summary-claim policy jelen van | P1 | required-now | T2, T4, T5, T6 |
| CS4 | `src/core/bubble/startBubble.ts` | `buildResumeReviewerStartupPrompt` | `(input: { bubbleId: string; repoPath: string; worktreePath: string; taskArtifactPath: string; state: BubbleStateSnapshot; transcriptSummary: string; kickoffDiagnostic?: string; reviewArtifactType: ReviewArtifactType; reviewerTestDirectiveLine?: string; reviewerBriefText?: string; }) -> string` | existing reviewer resume instruction chain | CS1-CS2 guardrail explicit injektalasa resume promptba | Resume flowban sem veszhet el a validation-claim policy | P1 | required-now | T2, T4, T5, T6 |
| CS5 | `src/core/runtime/tmuxDelivery.ts` | `buildDeliveryMessage` reviewer PASS branch | `(envelope: ProtocolEnvelope, messageRef: string, bubbleConfig: BubbleConfig, worktreePath?: string, reviewerTestDirective?: ReviewerTestExecutionDirective, reviewerBrief?: string) -> string` | reviewer PASS action text | CS1-CS2 guardrail explicit injektalasa handoff promptba | Implementer->reviewer handoffkor ugyanaz a policy ervenyes, mint startup/resume feluleten | P1 | required-now | T3, T4, T5, T6 |
| CS6 | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` | guidance assertions | test assertions | direct guidance builder assertions | Required + forbidden token assert bovitese | Guardrail driftet teszt jelzi guidance szinten | P1 | required-now | T1, T4, T5, T6 |
| CS7 | `tests/core/bubble/startBubble.test.ts` | startup/resume prompt assertions | test assertions | existing reviewer prompt assertions mellett | Cross-surface guardrail presence + fallback assertion | Startup + resume parity fenntartott | P1 | required-now | T2, T4, T5, T6 |
| CS8 | `tests/core/runtime/tmuxDelivery.test.ts` | handoff prompt assertions | test assertions | existing reviewer delivery assertions mellett | Handoffban ugyanaz a guardrail + forbidden aggregate claim elleni vedes jelen | Startup/resume/handoff policy parity megvan | P1 | required-now | T3, T4, T5, T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer validation claim source | implicit, driftre hajlamos | explicit evidence-first policy | `command_name`, `status`, `evidence_source` | `reason_if_unknown` | prompt-only hardening | P1 | required-now |
| Reviewer validation summary wording | aggregate shorthand allitasok elofordulhatnak | command-level normalized wording | `lint=<pass|failed|not-run|unknown>`, `typecheck=<...>`, `test=<...>` | extra explanatory sentence | prompt contract tightening | P1 | required-now |
| Forbidden aggregate claim family | nincs explicit tiltva minden feluleten | explicit forbidden wording family | `typecheck/lint pass`, `all checks pass` evidence-source nelkul | equivalent aggregate shorthand variants | non-breaking tightening | P1 | required-now |
| Missing/ambiguous evidence handling | gyakran implicit | fail-safe wording policy | `unknown` vagy `not-run` explicit jeloles | optional reason detail | prompt contract tightening | P1 | required-now |
| Cross-surface consistency | startup/handoff drift kockazat | same rule-pack everywhere | same required/forbidden token families startup/resume/handoff-ban | wording variacio anchorokon kivul | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Reviewer prompt text | validation-claim hardening | command/state transition valtoztatas | prompt-only phase | P1 | required-now |
| Reviewer summary behavior | pontosabb command-level status wording | evidence nelkuli pass allitas | behavior prompton keresztul terelt | P1 | required-now |
| Tests | prompt assertion update | unrelated domain test valtozas | csak erintett reviewer prompt testek | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`result|fallback|test-fail`) | Fallback Value/Action | Reason Code | Audit Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer explicit pass claim evidence nelkul | reviewer prompt compliance | fallback | use `unknown` vagy `not-run`; do not claim `pass` | `VALIDATION_CLAIM_UNVERIFIED` | audit-warn | P1 | required-now |
| Reviewer aggregate shorthand claim (`typecheck/lint pass`, `all checks pass`) | reviewer prompt compliance | fallback | command-level split status wording required | `VALIDATION_CLAIM_AGGREGATE_FORBIDDEN` | audit-info | P1 | required-now |
| Evidence source hianyos vagy ambiguous | evidence marker parseability | fallback | explicit `unknown`/`not-run` + optional reason | `VALIDATION_CLAIM_EVIDENCE_UNRESOLVED` | audit-info | P1 | required-now |
| Startup/resume/handoff prompt drift | tests | test-fail | fail on missing required anchors | `VALIDATION_CLAIM_PROMPT_DRIFT` | audit-error | P1 | required-now |

Note: reason code-ok ebben a phase-ban traceability azonositok, nem runtime exception class-ok.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing reviewer prompt build surfaces (`startBubble`, `tmuxDelivery`, scout guidance) | P1 | required-now |
| must-use | existing reviewer prompt test surfaces (`startBubble.test.ts`, `tmuxDelivery.test.ts`, `reviewerScoutExpansionGuidance.test.ts`) | P1 | required-now |
| must-use | incident context references listed above (bubble id + msg ids + evidence logs) | P1 | required-now |
| must-not-use | runtime/state-machine behavior valtoztatas ebben a phase-ban | P1 | required-now |
| must-not-use | blanket `all checks pass` allitas bizonytalan status mellett | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Guidance-level validation-claim guardrail | reviewer guidance text | render + assert | tartalmazza: evidence-first, command-level status, unknown/not-run fallback | P1 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T2 | Startup/resume parity | reviewer startup + reviewer resume prompt | render + assert | mindketto prompt tartalmazza ugyanazt a validation-claim guardrail core anchor-csaladot | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | Handoff parity | reviewer PASS handoff message | render + assert | handoff is ugyanazt a validation-claim guardrail policyt adja, mint startup/resume | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T4 | Forbidden aggregate wording | guidance + startup/resume + handoff promptok | render + assert | nincs olyan policy-jovahagyas, ami aggregate `typecheck/lint pass` vagy `all checks pass` shorthandot enged evidence nelkul | P1 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts`, `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts` |
| T5 | Missing/ambiguous evidence fallback | prompt texts | render + assert | explicit `unknown`/`not-run` fallback semantics jelen | P1 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts`, `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts` |
| T6 | Cross-surface consistency assertion | startup/resume/scout/handoff prompt texts rendered | comparative assertion fut | minden surface-en kotelezo legalabb 1-1 match: status anchor `/lint=<|typecheck=<|test=</` vagy equivalent wording + forbidden aggregate anchor + fallback anchor | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |

### 7) Acceptance Traceability Matrix

| Req ID | Requirement (L0/L1) | L1 Coverage | Test Coverage | Acceptance Evidence |
|---|---|---|---|---|
| R1 | Evidence-first claim policy (In Scope #1) | CS1, CS2, CS3, CS4, CS5; Data Contract row 1 | T1, T2, T3, T6 | prompt assertions across all surfaces |
| R2 | Command-level status wording (`lint/typecheck/test`) (In Scope #2) | CS1, CS2, CS3, CS4, CS5; Data Contract row 2 | T1, T2, T3, T5, T6 | status wording assertions |
| R3 | Forbidden aggregate claim family (In Scope #3, Safety Defaults #2) | CS1, CS2, CS3, CS4, CS5; Data Contract row 3; Error/Fallback `VALIDATION_CLAIM_AGGREGATE_FORBIDDEN` | T2, T3, T4, T6 | negative assertion coverage |
| R4 | Unknown/not-run fallback on unresolved evidence (In Scope #4, Safety #1) | CS1, CS2, CS3, CS4, CS5; Data Contract row 4; Error/Fallback `VALIDATION_CLAIM_UNVERIFIED`, `VALIDATION_CLAIM_EVIDENCE_UNRESOLVED` | T1, T5, T6 | fallback wording assertions |
| R5 | Startup/resume/handoff parity (In Scope #5) | CS3, CS4, CS5; Data Contract row 5; Error/Fallback `VALIDATION_CLAIM_PROMPT_DRIFT` | T2, T3, T6 | cross-surface consistency assertions |
| R6 | Prompt-only blast radius (Safety #3, Out of Scope #2) | Side Effects Contract; Dependency `must-not-use` runtime/state changes | T1, T2, T3, T4, T5, T6 | no runtime/state behavior change in this phase |
| R7 | Prompt assertion tesztek frissitese required + forbidden anchorokra (In Scope #6) | CS6, CS7, CS8; Side Effects Contract `Tests` row | T1, T2, T3, T4, T5, T6 | explicit positive + negative assertion coverage |
| R8 | Acceptance traceability matrix fenntartasa es konzisztens mapping (In Scope #7) | Section 7 matrix rows R1-R8; AC6; Spec Lock #4 | T1, T2, T3, T4, T5, T6 | requirement->contract->test mapping completeness |

## Acceptance Criteria

1. AC1: Reviewer startup/resume/handoff promptok explicit evidence-first validation claim policyt tartalmaznak.
2. AC2: Prompt contract explicit command-level status wordinget kovetel (`lint/typecheck/test`) es tiltja az evidence-nelkuli aggregate shorthand claimet.
3. AC3: Ambiguous vagy hianyzo evidence eseten explicit `unknown`/`not-run` fallback policy szerepel.
4. AC4: Prompt tesztek lefedik a required + forbidden anchorokat mindharom surface-en.
5. AC5: Incident references (bubble id, msg ids, evidence paths, SHA anchors) rogzitve vannak audit celra ebben a taskban.
6. AC6: Acceptance traceability matrix minden L0/L1 kovetelmenyre ad legalabb 1 L1 contract coverage + 1 test coverage mappinget.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Runtime-level reviewer PASS summary/evidence consistency gate bevezetese (`warning` vagy `block` policy mod) kulon phase taskban.
2. [later-hardening] Structured summary status block (`validation_status: {lint,typecheck,test}`) bevezetese a reviewer output contractban.
3. [later-hardening] Approval summary normalizer, amely machine-readable evidence markerbol epit final human summaryt.

## Assumptions

1. A reprodukalt hiba fo oka prompt-level drift, nem state-machine transition hiba.
2. Prompt hardening Phase 1-ben mar erdemben csokkenti a report-konzisztencia hibak gyakorisagat.
3. Full runtime block gate kulon, dedikalt taskban kezelendo, hogy blast radius kontrollalhato maradjon.

## Open Questions (Non-Blocking)

1. Kivanatos-e Phase 2-ben a mismatch automatikus block, vagy eleg warning + metric?

## Review Control

1. Ez a task prompt/test szintu bugfix; runtime transition logika valtozatlan marad.
2. Barmely runtime block-gate javaslat automatikusan `later-hardening`, kulon taskba kerul.
3. Incident-context anchorok (bubble/msg/evidence/SHA) nem torolhetok a taskbol, audit reprodukcio miatt.
4. Barmely aggregate validation claim jovahagyasa evidence-source nelkul P1 regresszio.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. reviewer startup/resume/handoff promptokban a validation claim guardrail explicit es konzisztens,
2. prompt testek required+forbidden anchor alapon lefedik a guardrail driftet,
3. task dokumentumban a reprodukcios incident-context teljes (bubble id, msg ids, evidence paths, SHA-k),
4. acceptance traceability matrix konzisztensen lekepzi a kovetelmenyeket az L1 contractokra es tesztekre,
5. phase scope megorzi a prompt-only blast radiust (nincs state-machine/protocol valtozas).
