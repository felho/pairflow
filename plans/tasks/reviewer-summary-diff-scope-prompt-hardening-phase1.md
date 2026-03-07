---
artifact_type: task
artifact_id: task_reviewer_summary_diff_scope_prompt_hardening_phase1_v1
title: "Reviewer Summary Diff-Scope Prompt Hardening (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/runtime/reviewerScoutExpansionGuidance.ts
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Summary Diff-Scope Prompt Hardening (Phase 1)

## L0 - Policy

### Goal

Szuntesse meg azt a hibat, amikor reviewer a konvergencia summary scope-jat branch-history diffbol (`main..HEAD`) irja le az aktualis bubble worktree change-set helyett.

### In Scope

1. Reviewer promptokban explicit tiltas: summary scope allitasokhoz tilos `git diff main..HEAD` (vagy barmely branch range) hasznalata.
2. Reviewer promptokban explicit pozitiv iranymutatas: summary scope allitasokhoz az aktualis worktree diffet kell hasznalni (`git diff --name-status`, opcionisan `git diff --cached --name-status`).
3. Reviewer PASS output contractban `scope_covered` mezore konkret szabaly: only current worktree changes, ne branch-history allitas.
4. Startup + handoff promptok kozti szovegkonzisztencia biztositas.
5. Erintett prompt-szoveg tesztek frissitese.

### Out of Scope

1. Runtime gate a `pairflow converged` parancsban (summary-vs-diff automatikus blokkolas).
2. Summary verifier gate logika bovitese.
3. Transcriptben mar rogzitett hibas summary-k automatikus javitasa.
4. Uj bubble config mezo bevezetese.

### Safety Defaults

1. Ha reviewer nem tudja megbizhatoan meghatarozni az aktualis diffet, ne tegyen szamszeru file-muvelet allitast a summaryban.
2. Prompt hardening nem valtoztathat protocol/state transition viselkedest, csak reviewer utasitasokat.
3. Prompt szoveg driftet tesztek fogjak vedeni startup + handoff feluleteken.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett terulet: reviewer operational prompt contract (utasitas-szintu, nem API/DB/event/auth/config boundary).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerScoutExpansionWorkflowGuidance` | `() -> string` | Phase-1 flow guidance text | Expliciten tiltja a `main..HEAD` alapju scope-allitast, es expliciten worktree diff parancsokat ad summary scope-hoz | P1 | required-now | incident transcript `msg_20260307_023`, tmux capture |
| CS2 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerPassOutputContractGuidance` | `() -> string` | `Scout Coverage.scope_covered` contract text | `scope_covered` csak aktualis local worktree valtozasokra hivatkozhat; branch history allitas tiltott | P1 | required-now | incident transcript `msg_20260307_023` |
| CS3 | `src/core/bubble/startBubble.ts` | `buildReviewerStartupPrompt` | `(input) -> string` | reviewer startup instruction chain | Startup promptben is szerepeljen a diff-scope guardrail (forbidden + required command family) | P1 | required-now | prompt consistency requirement |
| CS4 | `src/core/runtime/tmuxDelivery.ts` | `buildDeliveryMessage` reviewer PASS branch | `(envelope, messageRef, bubbleConfig, ...) -> string` | reviewer action text PASS handoffban | Handoff prompt ugyanezt az explicit diff-scope guardrail-t tartalmazza | P1 | required-now | prompt consistency requirement |
| CS5 | `tests/core/bubble/startBubble.test.ts` | reviewer startup prompt expectations | `test assertions` | existing reviewer prompt assertions mellett | Ellenorzi, hogy a tiltott (`main..HEAD`) es kotelezo (worktree diff) guidance megjelenik | P1 | required-now | test coverage |
| CS6 | `tests/core/runtime/tmuxDelivery.test.ts` | reviewer delivery message expectations | `test assertions` | existing reviewer delivery assertions mellett | Ellenorzi, hogy a handoff message-ben is ugyanaz a diff-scope guardrail van | P1 | required-now | test coverage |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer prompt diff-scope rule | implicit/ambiguous "same local diff scope" | explicit forbidden+required command guidance | forbid branch-range diff for summary scope claims; require current worktree diff commands | optional explanatory wording | prompt-only, backward-compatible | P1 | required-now |
| PASS output `scope_covered` semantics | nincs egyertelmu tiltasa a branch-history scope allitasnak | csak aktualis worktree diff alapju scope allitas engedett | "current worktree changes only" semantic | optional formatted examples | prompt contract tightening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime behavior | none | protocol/state transition valtoztatasa | Phase 1 csak prompt-level bugfix | P1 | required-now |
| Reviewer summaries | pontos scope allitas javitasa | branch-history scope allitas (`main..HEAD`) | behavior prompton keresztul terelt | P1 | required-now |
| Tests | prompt assertion update | unrelated domain tests modositasa | csak erintett reviewer prompt tesztek | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| reviewer diff scope bizonytalan (prompt-level scenario) | git working tree visibility | fallback | ne adjon szamszeru file-count claimet; irjon semleges scope-leirast | `DIFF_SCOPE_UNRESOLVED` | info | P2 | required-now |
| reviewer branch-range diffet hasznalna summary claimhez | reviewer prompt compliance | fallback | prompt explicit tiltas + explicit worktree command hint | `BRANCH_RANGE_SCOPE_FORBIDDEN` | info | P1 | required-now |
| startup/handoff prompt drift | test suite | throw (test fail) | CI/test fail jelzi a driftet | `PROMPT_SCOPE_GUARDRAIL_DRIFT` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | meglvo reviewer prompt injection pontok (`startBubble`, `tmuxDelivery`, scout guidance) | P1 | required-now |
| must-use | existing reviewer prompt test files (`startBubble.test.ts`, `tmuxDelivery.test.ts`) | P1 | required-now |
| must-not-use | runtime/state/protocol command path modositas ebben a phase-ban | P1 | required-now |
| must-not-use | `main..HEAD` vagy mas branch-range diff mint canonical summary scope source | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Reviewer startup prompt includes explicit diff-scope guardrail | reviewer startup prompt build | prompt rendered | tartalmazza a branch-range tiltast es worktree diff parancs iranymutatast | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | Reviewer handoff message includes explicit diff-scope guardrail | reviewer PASS delivery message build | message rendered | startup-pal konzisztens tiltast+required guidance-t ad | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T3 | PASS output contract guidance narrows `scope_covered` semantics | reviewer contract guidance build | text reviewed in tests/assertions | `scope_covered` explicitly current worktree scope-ra korlatozott | P1 | required-now | guidance assertion update |
| T4 | No runtime behavior regression | existing converged/pass tests | tests run | nincs valtozas protocol/state semanticaban | P2 | required-now | relevant test subset |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Runtime-level summary-vs-diff consistency gate bevezetese docs-only bubblekre.
2. [later-hardening] Structured `scope_evidence` artifact bevezetese, hogy reviewer summary allitasok geppel ellenorizhetok legyenek.

## Assumptions

1. A reprodukalt incident referencia: `reviewer-convergence-p3-round4-refine` bubble, ahol a reviewer `main..HEAD` diffet hasznalt summary scope allitashoz.
2. Phase 1 celja a reviewer viselkedes gyors stabilizalasa prompt hardeninggel, minimal blast radius mellett.

## Open Questions (Non-Blocking)

1. A tiltast csak `main..HEAD`-re irjuk ki explicit, vagy altalanosabban minden branch-range diffre (`<revA>..<revB>`)?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Docs-only runtime summary-vs-diff consistency gate | L2 | P1 | later-hardening | incident follow-up | Kulon phase taskban implementalni a converged pathban |
| H2 | Generic summary scope validator code scope-ra is | L2 | P2 | later-hardening | scalability | Prompt phase utan kiterjeszteni cross-artifact validaciora |

## Review Control

1. Ez a task kizarolag prompt/test szintu bugfix; runtime policy marad valtozatlan.
2. Barmely uj, runtime guard jellegu javaslat automatikusan `later-hardening`, kulon taskba kerul.
3. `scope_covered` mezoben branch-history allitas nem elfogadhato.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. reviewer startup, handoff es scout/contract guidance explicit diff-scope guardrail-t tartalmaz,
2. a kapcsolodo prompt tesztek lefedik a tiltas + required guidance jelenletet,
3. nincs protokoll/state viselkedes-valtozas ebben a phase-ban.
