---
artifact_type: task
artifact_id: task_reviewer_summary_diff_scope_prompt_hardening_phase1_v1
title: "Reviewer Summary Diff-Scope Prompt Hardening (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/runtime/reviewerScoutExpansionGuidance.ts
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - tests/core/agent/converged.test.ts # existing regression coverage (no new file)
  - tests/core/agent/pass.test.ts # existing regression coverage (no new file)
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/reviewerScoutExpansionGuidance.test.ts # new file intent: create in implementation phase
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Summary Diff-Scope Prompt Hardening (Phase 1)

## L0 - Policy

### Goal

Szuntesse meg azt a hibat, amikor a reviewer a summary `scope_covered` reszt branch-history diffbol vezeti le az aktualis bubble worktree valtozasok helyett.
Phase 1 celja: csak prompt-contract hardening, nulla runtime/state viselkedesvaltozassal.

### In Scope

1. Reviewer promptokban explicit tiltas: summary scope allitasokhoz tilos barmely branch-range diff (`git diff <revA>..<revB>`, peldaul `main..HEAD`) ES git history/log source (`git log --name-status`, stb.) hasznalata.
2. Reviewer promptokban explicit pozitiv iranymutatas: summary scope allitasokhoz az aktualis worktree diffet kell hasznalni (`git diff --name-status`, opcionalisan `git diff --cached --name-status`).
3. Reviewer PASS output contractban a `scope_covered` mezore kotelezo szemantika: csak aktualis worktree valtozasok, branch-history allitas nelkul.
4. Startup, scout guidance es handoff promptok kozti deterministic rule-pack konzisztencia.
5. Erintett prompt-szoveg tesztek frissitese pozitiv + negativ assertionokkal.
6. Acceptance traceability matrix biztositas (L0 kovetelmeny -> L1 contract -> test evidence).

### Out of Scope

1. Runtime gate a `pairflow converged` parancsban (summary-vs-diff automatikus blokkolas).
2. Summary verifier gate logika bovitese.
3. Transcriptben mar rogzitett hibas summary-k automatikus javitasa.
4. Uj bubble config mezo bevezetese.

### Safety Defaults

1. Ha a reviewer nem tudja megbizhatoan meghatarozni az aktualis worktree diffet, ne tegyen szamszeru allitast (`N files changed`, stb.) a summaryban.
2. Prompt hardening nem valtoztathat protocol/state transition viselkedest, csak reviewer utasitasokat.
3. Prompt driftet tesztek vedik startup + scout + handoff feluleteken.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett terulet: reviewer operational prompt contract (utasitas-szintu, nem API/DB/event/auth/config boundary).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerScoutExpansionWorkflowGuidance` | `() -> string` | Phase-1 workflow guidance text | Kotelezoen tartalmazza: (a) branch-range diff tiltas, (b) git history/log source tiltas (`git log --name-status`), (c) worktree diff command csalad mint required source, (d) uncertain/unavailable fallback viselkedes EN phrasinggel (`cannot be resolved reliably` + `avoid numeric file-operation claims`) | P1 | required-now | incident transcript `msg_20260307_023`, tmux capture |
| CS2 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerPassOutputContractGuidance` | `() -> string` | `Scout Coverage.scope_covered` contract text | `scope_covered` explicit "current worktree changes only" szemantikat rogzit, branch-history es history/log source allitas tiltassal | P1 | required-now | incident transcript `msg_20260307_023` |
| CS3 | `src/core/bubble/startBubble.ts` | `buildReviewerStartupPrompt` | `(input: { bubbleId: string; repoPath: string; worktreePath: string; taskArtifactPath: string; reviewArtifactType: ReviewArtifactType; reviewerBriefText?: string; }) -> string` | existing non-exported startup helperben, a reviewer `startupPrompt` assignment altal hasznalt instruction chain | Reviewer startup prompt deterministic rule-packot tartalmaz: tiltott source-ok (branch-range + history/log) + kotelezo source (worktree diff command family) + fallback (no-numeric-claim). Fallback guidance ugyanazon meglevo prompt-chainben injektalodik (`buildReviewerScoutExpansionWorkflowGuidance` + `buildReviewerPassOutputContractGuidance`), net-new helper/export nelkul. | P1 | required-now | prompt consistency requirement |
| CS4 | `src/core/runtime/tmuxDelivery.ts` | `buildDeliveryMessage` reviewer PASS branch | `(envelope: ProtocolEnvelope, messageRef: string, bubbleConfig: BubbleConfig, worktreePath?: string, reviewerTestDirective?: ReviewerTestExecutionDirective, reviewerBrief?: string) -> string` | existing non-exported delivery helper reviewer PASS action text agaban | Handoff prompt ugyanazt a deterministic rule-packot tartalmazza, mint a startup/scout guidance; kifejezetten a mar meglevo builder-integration path megorzese + wording hardening (nincs net-new runtime path), explicit history/log source tilassal es no-numeric fallback semantics megerositesvel | P1 | required-now | prompt consistency requirement |
| CS5 | `tests/core/bubble/startBubble.test.ts` | reviewer startup prompt expectations | `test assertions` | existing reviewer prompt assertions mellett | Pozitiv + negativ assertion: branch-range tiltott, worktree diff required, uncertain fallback jelen van | P1 | required-now | test coverage |
| CS6 | `tests/core/runtime/tmuxDelivery.test.ts` | reviewer delivery message expectations | `test assertions` | existing reviewer delivery assertions mellett | Pozitiv + negativ assertion: handoffban is ugyanaz a rule-pack es nincs branch-history source-jovahagyas | P1 | required-now | test coverage |
| CS7 | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` | reviewer scout guidance expectations | `test assertions` | direct guidance builder assertions | Kozvetlenul ellenorzi a `buildReviewerScoutExpansionWorkflowGuidance` + `buildReviewerPassOutputContractGuidance` kimenetet (tiltott source + required source + fallback + `scope_covered` narrowing); uj tesztfajl letrehozasa is in-scope | P1 | required-now | test coverage |
| CS8 | `tests/core/agent/converged.test.ts` | docs/code convergence no-regression expectations | `test assertions` | existing converged regression assertions mellett | Ellenorzi, hogy a prompt hardening nem vezet protocol/state regressziohoz a converged pathban | P2 | required-now | regression coverage |
| CS9 | `tests/core/agent/pass.test.ts` | pass handoff no-regression expectations | `test assertions` | existing pass regression assertions mellett | Ellenorzi, hogy a prompt hardening nem modositja a PASS transition/intent semanticsot | P2 | required-now | regression coverage |
| CS10 | `src/core/bubble/startBubble.ts` | `buildResumeReviewerStartupPrompt` | `(input: { bubbleId: string; repoPath: string; worktreePath: string; taskArtifactPath: string; state: BubbleStateSnapshot; transcriptSummary: string; kickoffDiagnostic?: string; reviewArtifactType: ReviewArtifactType; reviewerTestDirectiveLine?: string; reviewerBriefText?: string; }) -> string` | existing non-exported resume helperben, a reviewer `startupPrompt` assignment altal hasznalt resume instruction chain | Reviewer resume startup prompt deterministic rule-packot tartalmaz: tiltott source-ok (branch-range + history/log) + kotelezo source (worktree diff command family) + fallback (no-numeric-claim). Fallback guidance ugyanazon meglevo prompt-chainben injektalodik (`buildReviewerScoutExpansionWorkflowGuidance` + `buildReviewerPassOutputContractGuidance`), net-new helper/export nelkul. | P1 | required-now | prompt consistency requirement |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer prompt diff-scope rule | implicit/ambiguous "same local diff scope" | explicit deterministic rule-pack | (1) branch-range diff forbidden, (2) current worktree diff command family required, (3) uncertain scope -> no numeric claim | optional explanatory examples | prompt-only, backward-compatible | P1 | required-now |
| PASS output `scope_covered` semantics | nincs egyertelmu tiltasa a branch-history scope allitasnak | explicit semantic restriction | "scope_covered must describe current worktree changes only" + branch-history source tiltas | optional phrase examples | prompt contract tightening | P1 | required-now |
| Startup/handoff/scout wording alignment | hasonlo, de nem expliciten lockolt | same normative rules mindharom feluleten | (1) branch-range diff explicit forbidden summary scope-hoz, (2) history/log source explicit forbidden summary scope-hoz, (3) current worktree diff command family explicit required source, (4) uncertain scope eseten no-numeric-claim fallback explicit szabaly | csak pelda-szoveg, sorrend, kotoszavak valtozhatnak; a 4 normativ szabaly jelentese, tiltas/required jellege es fallback-semantika nem valtozhat. T6 regex-anchor mintak kotelezoek; ezeken kivuli wording valtozhat. | non-breaking wording hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime behavior | none | protocol/state transition valtoztatasa | Phase 1 csak prompt-level bugfix | P1 | required-now |
| Reviewer summaries | pontos scope allitas javitasa | branch-history scope allitas (`<revA>..<revB>`) | behavior prompton keresztul terelt | P1 | required-now |
| Tests | prompt assertion update | unrelated domain tests modositasa | csak erintett reviewer prompt tesztek | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`test-fail|result|fallback`) | Fallback Value/Action | Reason Code | Audit Level (non-runtime) | Priority | Timing |
|---|---|---|---|---|---|---|---|
| reviewer diff scope bizonytalan (prompt-level scenario) | git working tree visibility | fallback | ne adjon szamszeru file-count claimet; irjon semleges scope-leirast | `DIFF_SCOPE_UNRESOLVED` | audit-info | P2 | required-now |
| reviewer branch-range diffet hasznalna summary claimhez | reviewer prompt compliance | fallback | prompt explicit tiltas + explicit worktree command hint | `BRANCH_RANGE_SCOPE_FORBIDDEN` | audit-info | P1 | required-now |
| startup/handoff/scout prompt drift | test suite | test-fail | CI/test fail jelzi a driftet | `PROMPT_SCOPE_GUARDRAIL_DRIFT` | audit-error | P1 | required-now |
| git output nem olvashato vagy command unavailable | local git command execution | fallback | summary scope claim csak bizonytalan, nem-szamszeru formaban | `WORKTREE_DIFF_UNAVAILABLE` | audit-warn | P2 | required-now |

Note: a fenti reason code-ok prompt-contract audit/traceability azonosito-k (spec + teszt szint), nem runtime exception/error class nevek.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | meglevo reviewer prompt injection pontok (`startBubble`, `tmuxDelivery`, scout guidance) | P1 | required-now |
| must-use | existing reviewer prompt test files (`startBubble.test.ts`, `tmuxDelivery.test.ts`) | P1 | required-now |
| must-use | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` dedikalt guidance assertionokhoz | P1 | required-now |
| must-not-use | runtime/state/protocol command path modositas ebben a phase-ban | P1 | required-now |
| must-not-use | branch-range diff (`<revA>..<revB>`, peldaul `main..HEAD`) mint canonical summary scope source | P1 | required-now |
| must-not-use | summary scope claims from git history/log listing (`git log --name-status`, stb.) | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Startup prompt deterministic guardrail | reviewer startup prompt build | prompt rendered | tartalmazza: branch-range + history/log source tiltas, worktree diff command family, es uncertain fallback no-numeric-claim szabaly | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | Handoff prompt deterministic guardrail | reviewer PASS delivery message build | message rendered | startup/scout-tal konzisztens rule-packot tartalmaz, explicit history/log source tiltassal es fallback no-numeric-claim szaballyal | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T3 | PASS contract `scope_covered` narrowing | reviewer contract guidance build | text assertion fut | explicit "current worktree changes only" szemantika es branch-history tiltas | P1 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T4 | Negative assertion: branch-range and history/log source not accepted | prompt texts rendered | tiltott mintak ellenorzese fut | nincs olyan instrukcio, ami summary scope-ra branch-range vagy git history/log source-t (`git log --name-status`) javasol | P1 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts`, `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts` |
| T5 | No runtime behavior regression | existing converged/pass tests | tests run | nincs valtozas protocol/state semanticaban | P2 | required-now | `tests/core/agent/converged.test.ts`, `tests/core/agent/pass.test.ts` |
| T6 | Cross-surface rule-pack consistency assertion | startup/resume/scout/handoff prompt texts rendered | comparative assertion fut | HOW (explicit regex anchors, EN-source aligned): minden surface-en kotelezo match legalabb 1-1 mintara ezekbol: branch-range anchor `/(<revA>\\.\\.<revB>|main\\.\\.HEAD)/`, history/log anchor `/git\\s+(log|show)(?:\\s+--name-status)?/`, worktree anchor `/git diff --name-status/`, fallback anchor `/(cannot be resolved reliably|avoid numeric file-operation claims)/i`. A Data Contract row 3 szerinti wording-variacio csak az anchorokon kivuli szovegre vonatkozik. | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T7 | Unavailable worktree diff fallback assertion | statikus guidance builder output rendered (nincs runtime parameter) | fallback assertion fut | semantic drift-guard threshold (EN-source aligned): guidance-ben kotelezo fallback-phrase family `cannot be resolved reliably` ES `avoid numeric file-operation claims`; distinct assertion: fallback trace a `WORKTREE_DIFF_UNAVAILABLE` trigger-classhez kotott. Literal reason-code token string megjelenese nem kovetelmeny. Cross-surface fallback presence ellenorzese T1/T2/T6/T9-ban tortenik. | P2 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T8 | Unresolved diff-scope fallback assertion | statikus guidance builder output rendered (nincs runtime parameter) | fallback assertion fut | semantic drift-guard threshold (EN-source aligned): guidance-ben kotelezo fallback-phrase family `cannot be resolved reliably` ES `avoid numeric file-operation claims`; distinct assertion: fallback trace a `DIFF_SCOPE_UNRESOLVED` trigger-classhez kotott. Literal reason-code token string megjelenese nem kovetelmeny. Cross-surface fallback presence ellenorzese T1/T2/T6/T9-ban tortenik. | P2 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T9 | Resume startup prompt deterministic guardrail | reviewer resume startup prompt build | prompt rendered | startup/scout/handoff-tal konzisztens rule-packot tartalmaz: branch-range + history/log tiltast, required worktree source-t, es no-numeric fallback szabalyt | P2 | required-now | `tests/core/bubble/startBubble.test.ts` |

### 7) Acceptance Traceability Matrix

| Req ID | Requirement (L0/L1) | L1 Coverage | Test Coverage | Acceptance Evidence |
|---|---|---|---|---|
| R1 | Branch-range diff tiltas summary scope allitashoz (In Scope #1, branch-range clause) | CS1, CS2, CS3, CS4, CS10 (runtime prompt surfaces); CS5, CS6, CS7 (test call-site assertions); Data Contract row 1-3; Error/Fallback `BRANCH_RANGE_SCOPE_FORBIDDEN` | T1, T2, T3, T4, T6, T9 | Prompt assertionok + reviewer guidance assertionok |
| R2 | Worktree diff command family kotelezo source (In Scope #2) | CS1, CS2, CS3, CS4, CS10 (runtime prompt surfaces); CS5, CS6, CS7 (test call-site assertions); Data Contract row 1-3 | T1, T2, T3, T4, T6, T9 | Startup/handoff + guidance assertionok, negativ source-kizaras ellenorzessel es cross-surface consistency validacioval |
| R3 | Uncertain scope fallback (no numeric claims) (Primary: Safety Defaults #1; Secondary: L1 Error and Fallback Contract) | Primary policy anchor: L0 Safety Defaults #1; secondary anchor: L1 Error and Fallback Contract (`DIFF_SCOPE_UNRESOLVED`, `WORKTREE_DIFF_UNAVAILABLE`); CS1, CS2, CS3, CS4, CS10 (runtime prompt surfaces); CS5, CS6, CS7 (test call-site assertions) | T1, T2, T6, T7, T8, T9 | Prompt assertionok fallback szabalyra + unavailable/unresolved fallback assertionok |
| R4 | Runtime/state behavior unchanged while prompt hardening remains bounded (Primary: Safety Defaults #2; Secondary: Out of Scope #1-#4) | Side Effects Contract; Dependency `must-not-use` runtime path changes; L0 Safety Defaults #2; L0 Out of Scope #1-#4; CS8, CS9 (regression call-sites) | T5 | Existing converged/pass regression test futas |
| R5 | Cross-surface wording consistency (In Scope #4) | CS1, CS2, CS3, CS4, CS10 (runtime prompt surfaces); CS5, CS6, CS7 (test call-site assertions); Data Contract row 3; Error/Fallback `PROMPT_SCOPE_GUARDRAIL_DRIFT` | T6, T9 | Konszisztens rule-pack a startup/resume/scout/handoff feluleteken, dedikalt consistency assertionnel |
| R6 | Summary scope claimshez git history/log source tiltasa (Primary: In Scope #1, history/log clause; Secondary: In Scope #3) | Primary policy anchor: L0 In Scope #1 (history/log clause); secondary anchors: L0 In Scope #3 + Dependency `must-not-use` git history/log source + Data Contract row 1-2; CS1, CS2, CS3, CS4, CS10 (runtime prompt surfaces); CS5, CS6, CS7 (test call-site assertions) | T1, T2, T3, T4, T6, T9 | Prompt szoveg explicit tiltja a `git log --name-status` jellegu source-okat summary scope allitasokhoz |
| R7 | Erintett prompt-szoveg tesztek frissitese pozitiv + negativ assertionokkal (In Scope #5) | L0 In Scope #5 explicit policy anchor; CS5, CS6, CS7 (test call-site assertions); Side Effects Contract `Tests` row; Dependency `must-use` existing prompt test files + dedicated guidance test file | T1, T2, T3, T4, T6, T7, T8, T9 | Pozitiv (`required source`, `fallback`) es negativ (`branch-range`, `history/log tiltasa`) assertion update explicit audit traillel |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Runtime-level summary-vs-diff consistency gate bevezetese docs-only bubblekre.
2. [later-hardening] Structured `scope_evidence` artifact bevezetese, hogy reviewer summary allitasok geppel ellenorizhetok legyenek.
3. [later-hardening] Dedicated shared constant a deterministic rule-pack string elemekhez, hogy drift-kockazat tovabb csokkenjen.

## Assumptions

1. A reprodukalt incident referencia: `reviewer-convergence-p3-round4-refine` bubble, ahol a reviewer `main..HEAD` diffet hasznalt summary scope allitashoz.
2. Phase 1 celja a reviewer viselkedes gyors stabilizalasa prompt hardeninggel, minimal blast radius mellett.
3. A branch-range tiltas altalanos (`<revA>..<revB>`), nem csak `main..HEAD`-re szukitett.

## Open Questions (Non-Blocking)

No open non-blocking questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Docs-only runtime summary-vs-diff consistency gate | L2 | P1 | later-hardening | incident follow-up | Kulon phase taskban implementalni a converged pathban |
| H2 | Structured `scope_evidence` artifact contract and schema | L2 | P2 | later-hardening | L2 note 2 | Definialni formalis schema-t es minimalis kotelezo mezoket a gepi ellenorizhetoseghez |
| H3 | Shared canonical prompt fragment hardening | L2 | P2 | later-hardening | L2 note 3 | Kozos reusable helper bevezetese kulon taskban |
| H4 | Generic summary scope validator code scope-ra is | L2 | P2 | later-hardening | scalability | Prompt phase utan kiterjeszteni cross-artifact validaciora |

## Review Control

1. Ez a task kizarolag prompt/test szintu bugfix; runtime policy marad valtozatlan.
2. Barmely uj, runtime guard jellegu javaslat automatikusan `later-hardening`, kulon taskba kerul.
3. `scope_covered` mezoben branch-history allitas nem elfogadhato.
4. A deterministic rule-pack barmely elemenek elhagyasa P1 regresszio.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. reviewer startup, handoff es scout/contract guidance explicit, konzisztens diff-scope guardrail-t tartalmaz,
2. a kapcsolodo prompt tesztek lefedik a tiltas + required guidance + fallback szabaly jelenletet es negativ mintakat,
3. acceptance traceability matrix minden relevans L0/L1 kovetelmenyre mutat legalabb 1 L1 es 1 test coverage sort, es a mapping sorok szemantikailag konzisztensen (nem ellentmondoan) kotik ossze a kovetelmenyeket a tesztekkel,
4. nincs protokoll/state viselkedes-valtozas ebben a phase-ban.
