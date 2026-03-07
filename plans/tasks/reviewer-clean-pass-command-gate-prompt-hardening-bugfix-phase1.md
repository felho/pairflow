---
artifact_type: task
artifact_id: task_reviewer_clean_pass_command_gate_prompt_hardening_bugfix_phase1_v1
title: "Reviewer Clean-PASS Command Gate Prompt Hardening (Bugfix, Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/core/runtime/reviewerScoutExpansionGuidance.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/reviewerScoutExpansionGuidance.test.ts
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Clean-PASS Command Gate Prompt Hardening (Bugfix)

## L0 - Policy

### Goal

Szuntesse meg azt a prompt-level iranyitasi driftet, ahol reviewer round>=2 clean allapotban is `pairflow pass --no-findings` utat valaszt `pairflow converged` helyett.

### Scope Boundary (explicit)

1. Ez a bugfix csak a clean-path command decision driftet kezeli.
2. Ez a task nem vezeti be a blocker/non-blocker konvergencia policy teljes ujradefinialasat.
3. Ha blocker policy viselkedes valtoztatasa szukseges, az kulon task referenciaval scope-olando.

### Canonical Command Gate (single source text)

Az alabbi canonical gate-szoveg a single source text. Delivery-modell ket retegu:
1. full canonical text (startup + resume-startup),
2. round-conditional projection (handoff + resume-kickoff),
ugyanazzal a command-dontesi kimenettel.

Projection rule: `augment, not replace`. A round-conditional projection nem torolheti/irhatja felul a mar letezo round>=2+findings -> `pairflow pass` iranyitast; a clean-path gate szoveget ehhez hozzaadja.
Note: a canonical gate tokenek (`REQ_A..REQ_D`) kulon kezelendok a projection-only invariant tokenektol (`REQ_E`).

1. If review round is 1: do not use `pairflow converged`; use `pairflow pass`.
2. If review round is 2 or higher and you have no findings: use `pairflow converged`.
3. Do not use `pairflow pass --no-findings` for the clean path in round 2 or higher.
4. Blocker-handling policy remains unchanged in this bugfix scope.

### In Scope

1. Startup promptban explicit command gate blokk jelenik meg a Canonical Command Gate szerint.
2. Resume startup promptban explicit command gate blokk jelenik meg a Canonical Command Gate szerint.
3. Handoff/reviewer delivery promptban ugyanaz a command gate jelenik meg.
4. Resume kickoff promptban ugyanaz a command gate jelenik meg.
5. Scout/summary contract szovegben a PASS-centrikus kifejezesek semlegesitese (pl. "final reviewer output package", nem "final reviewer PASS package").
6. Prompt driftet vedo tesztassert frissites startup + resume + handoff + resume-kickoff feluleten.
7. T1/T2a/T2b/T2c/T2d tesztassertok machine-checkable required/forbidden substring szerzodessel.

### Out of Scope

1. Runtime/state/protocol enforcement a `pass` vagy `converged` parancsban.
2. Convergence policy vagy gate logika modositas.
3. Blocker/non-blocker policy teljes kiterjesztese vagy atalakitasa.
4. Uj bubble config flag bevezetese.
5. Transcript-helyreallitas mar lefutott bubble-okra.

### Safety Defaults

1. Ez bugfix, de prompt-only: allapotgep viselkedes nem valtozhat.
2. Ha prompt komponens driftel, teszt hibazzon determinisztikusan.
3. Round 1 guardrail prioritasa maradjon a command gate felett.
4. Startup/resume/handoff/resume-kickoff kozotti command-gate drift regresszionak minosul.
5. Clean-path scope boundary megszegese regresszionak minosul.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: reviewer prompt contract (utasitas-szintu), tesztassert contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/startBubble.ts` | `buildReviewerStartupPrompt` | `(input) -> string` | reviewer startup instruction chain | Command gate blokk jelenik meg a Canonical Command Gate szerint | P1 | required-now | AC1, AC2, T1 |
| CS2 | `src/core/bubble/startBubble.ts` | `buildResumeReviewerStartupPrompt` | `(input) -> string` | reviewer resume startup instruction chain | Startup-pal semantic parity-ben ugyanaz a clean-path gate-szoveg jelenik meg | P1 | required-now | AC1, AC2, T1 |
| CS3 | `src/core/runtime/tmuxDelivery.ts` | `buildDeliveryMessage` reviewer branch | `(envelope, messageRef, bubbleConfig, ...) -> string` | implementer->reviewer handoff action text | Round-conditional gate projection jelenik meg: clean-path gate + meglevő round>=2 findings->pass guidance megorzese (augment, not replace) | P1 | required-now | AC1, AC2, T2a, T2b, T2c |
| CS4 | `src/core/bubble/startBubble.ts` | `buildResumeReviewerKickoffMessage` | `(input) -> string` | reviewer resume kickoff text | Round-conditional gate projection jelenik meg: clean-path gate + meglevő round>=2 findings->pass guidance megorzese (augment, not replace) | P1 | required-now | AC1, AC2, T2a, T2b, T2c |
| CS5 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerScoutExpansionWorkflowGuidance` | `() -> string` | scout workflow guidance wording | PASS-centrikus wording semlegesitve; workflow guidance command-semleges | P1 | required-now | AC4, T3 |
| CS6 | `tests/core/bubble/startBubble.test.ts` | startup/resume startup prompt assertions | test assertions | startup + resume startup prompt checks | Required/forbidden substringek explicit ellenorzese | P1 | required-now | AC5, T1 |
| CS7 | `tests/core/runtime/tmuxDelivery.test.ts` | handoff prompt assertions | test assertions | handoff prompt checks | Round-conditional required/forbidden substringek explicit ellenorzese (T2a/T2b/T2c handoff resz) | P1 | required-now | AC5, T2a, T2b, T2c |
| CS8 | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` | scout guidance wording assertions | test assertions | reviewer scout guidance checks | PASS-bias kifejezesek explicit tiltasa + command-semleges wording ellenorzes a `reviewerScoutExpansionGuidance.ts` exportjain | P2 | required-now | AC4, T3 |
| CS9 | `tests/core/bubble/startBubble.test.ts` | resume kickoff prompt assertions | test assertions | resume kickoff prompt checks | Round-conditional required/forbidden substringek explicit ellenorzese (T2a/T2b/T2c resume-kickoff resz) | P1 | required-now | AC5, T2a, T2b, T2c |
| CS10 | `tests/core/agent/pass.test.ts` | pass regression guard | existing test coverage | verification-only baseline for pass command semantics | Runtime behavior unchanged guard; file edit nem kotelezo ebben a docs-only taskban | P2 | required-now | AC6, T4 |
| CS11 | `tests/core/agent/converged.test.ts` | converged regression guard | existing test coverage | verification-only baseline for converged command semantics | Runtime behavior unchanged guard; file edit nem kotelezo ebben a docs-only taskban | P2 | required-now | AC6, T4 |
| CS12 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `buildReviewerPassOutputContractGuidance` | `() -> string` | pass output contract wording | function nev legacy PASS-biased lehet, de kibocsatott guidance szoveg command-semleges marad | P1 | required-now | AC4, T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer command decision guidance | reszben implicit, PASS-centrikus | explicit clean-path command gate | round 1 rule + round>=2 clean->converged + no `pass --no-findings` clean path + blocker policy unchanged marker | rovid operational pelda | prompt-only, backward-compatible | P1 | required-now |
| Command gate delivery model | implicit surface-level varians | explicit ket-retegu modell | full canonical text startup/resume-startup-on + round-conditional projection handoff/resume-kickoff-on + semantic equivalence requirement + augment-not-replace rule | explanatory note | prompt-only, backward-compatible | P1 | required-now |
| Reviewer output contract wording | "final reviewer PASS package" hangsulyos | command-semleges output contract | PASS es CONVERGENCE kompatibilis wording | explanatory note | prompt-level terminology fix | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime behavior | none | state/protocol transition valtozas | bugfix phase csak prompt hardening | P1 | required-now |
| Prompt text | clean-path command gate explicit, PASS-bias csokkentes | policy-expansion a blocker flow teljes viselkedesere | startup + resume + handoff + resume-kickoff + scout align | P1 | required-now |
| Tests | prompt assertion update | unrelated test refactor | csak erintett prompt tesztek | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Startup/resume/handoff/resume-kickoff command gate szoveg drift | unit tests | throw (test fail) | CI fail, prompt szerzodes vedelme | `REVIEWER_COMMAND_GATE_PROMPT_DRIFT` | error | P1 | required-now |
| Clean-path scope boundary megszegese | unit tests / review check | throw (test fail) | regression jelzes | `REVIEWER_CLEAN_PATH_SCOPE_EXPANSION` | error | P1 | required-now |
| PASS-centrikus wording visszakerul | unit tests / review check | throw (test fail) | regression jelzes | `REVIEWER_PASS_BIAS_REGRESSION` | error | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing reviewer prompt injection points (`startBubble`, `tmuxDelivery`) | P1 | required-now |
| must-use | resume reviewer prompt surfaces (`buildResumeReviewerStartupPrompt`, `buildResumeReviewerKickoffMessage`) | P1 | required-now |
| must-use | existing reviewer guidance helper file (`reviewerScoutExpansionGuidance.ts`) | P1 | required-now |
| must-use | startup/resume/handoff prompt tests + `reviewerScoutExpansionGuidance.test.ts` | P1 | required-now |
| must-not-use | runtime protocol/state path modositas ebben a bugfixben | P1 | required-now |
| must-not-use | blocker policy expansion kulon task referencia nelkul | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Startup + resume startup command gate explicit | reviewer startup + reviewer resume startup prompt render | string generated | mindket prompt tartalmazza `REQ_A/REQ_B/REQ_C/REQ_D`; nem tartalmazza `FORBID_A/FORBID_B1/FORBID_B2/FORBID_B3/FORBID_C` | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2a | Handoff + resume kickoff command gate explicit (round 1 variant) | reviewer handoff + reviewer resume kickoff prompt render round=1 | string generated | mindket prompt tartalmazza `REQ_A/REQ_D`; nem tartalmazza `REQ_B`; nem tartalmazza `FORBID_A/FORBID_B1/FORBID_B2/FORBID_B3/FORBID_C` | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T2b | Handoff + resume kickoff command gate explicit (round>=2 clean variant) | reviewer handoff + reviewer resume kickoff prompt render round>=2 clean | string generated | mindket prompt tartalmazza `REQ_B/REQ_C/REQ_D`; nem tartalmazza `REQ_A`; nem tartalmazza `FORBID_A/FORBID_B1/FORBID_B2/FORBID_B3/FORBID_C` | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T2c | Handoff + resume kickoff non-clean regression guard (round>=2 + findings) | reviewer handoff + reviewer resume kickoff prompt render round>=2 with findings | string generated | megorzi a findings->`pairflow pass` iranyitast (`REQ_E`) es nem jelenik meg konvergenciara terelo tiltott varians (`FORBID_C`); `FORBID_A/FORBID_B1/FORBID_B2/FORBID_B3` sem jelenik meg | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T2d | Augment-not-replace integrity guard | round>=2 clean + round>=2 with findings prompt variants | compare/assert | mindket variantban megmaradnak kozos gate elemek (`REQ_C/REQ_D`), es branch-specifikus utvonalak nem torlik egymast (`REQ_B` clean, `REQ_E` findings) | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T3 | PASS-bias wording removed in scout guidance surfaces | reviewer scout guidance render | string generated | `buildReviewerScoutExpansionWorkflowGuidance` es `buildReviewerPassOutputContractGuidance` exportokban nincs PASS-package bias; output contract command-semleges | P2 | required-now | `tests/core/runtime/reviewerScoutExpansionGuidance.test.ts` |
| T4 | No runtime behavior regression | existing pass/converged tests | tests run | nincs viselkedes-valtozas a parancsokban (verification-only baseline; file edit nem elvart) | P2 | required-now | `tests/core/agent/pass.test.ts`, `tests/core/agent/converged.test.ts` |

### 7) Machine-Checkable Assertion Contract

| Token | Exact Substring | Type | Scope |
|---|---|---|---|
| `REQ_A` | `If review round is 1: do not use \`pairflow converged\`; use \`pairflow pass\`.` | required | canonical |
| `REQ_B` | `If review round is 2 or higher and you have no findings: use \`pairflow converged\`.` | required | canonical |
| `REQ_C` | `Do not use \`pairflow pass --no-findings\` for the clean path in round 2 or higher.` | required | canonical |
| `REQ_D` | `Blocker-handling policy remains unchanged in this bugfix scope.` | required | canonical |
| `REQ_E` | `If review round is 2 or higher and you have findings, keep using \`pairflow pass\`.` | required | projection-only invariant |
| `FORBID_A` | `If review round is 2 or higher and you have blocker findings: use \`pairflow converged\`.` | forbidden | universal |
| `FORBID_B1` | `Use \`pairflow pass --no-findings\` for clean path in round 2 or higher.` | forbidden | universal |
| `FORBID_B2` | `Use \`pairflow pass --no-findings\` for the clean path in round 2 or higher.` | forbidden | universal |
| `FORBID_B3` | `Use \`pairflow pass --no-findings\` in round 2 or higher for the clean path.` | forbidden | universal |
| `FORBID_C` | `If review round is 2 or higher and you have findings: use \`pairflow converged\`.` | forbidden | universal |

### 7a) Forbidden Coverage Matrix

| Forbidden Token | Covered by Tests |
|---|---|
| `FORBID_A` | T1, T2a, T2b, T2c |
| `FORBID_B1` | T1, T2a, T2b, T2c |
| `FORBID_B2` | T1, T2a, T2b, T2c |
| `FORBID_B3` | T1, T2a, T2b, T2c |
| `FORBID_C` | T1, T2a, T2b, T2c |

### 8) Review-Check Matrix (meta AC coverage)

| ID | Scope | Check Type | Assertion | Evidence |
|---|---|---|---|---|
| RC1 | scope boundary / policy | manual doc review-check | AC3 akkor teljesul, ha a dokumentum explicit kimondja: blocker policy nem bovul ebben a taskban, es ez Out of Scope-ban is konzisztens | `plans/tasks/reviewer-clean-pass-command-gate-prompt-hardening-bugfix-phase1.md` |
| RC2 | metadata consistency | manual doc review-check | AC7 akkor teljesul, ha frontmatter `status: implementable` es Spec Lock `IMPLEMENTABLE` gate ugyanarra az allapotra utal | `plans/tasks/reviewer-clean-pass-command-gate-prompt-hardening-bugfix-phase1.md` |

### 9) AC <-> Check <-> Spec Lock Mapping

| AC | Covered by Checks | Spec Lock Clause |
|---|---|---|
| AC1 | T1, T2a, T2b, T2c, T2d | SL1 |
| AC2 | T1, T2a, T2b, T2c, T2d | SL1, SL2 |
| AC3 | RC1 | SL7 |
| AC4 | T3 | SL3 |
| AC5 | T1, T2a, T2b, T2c, T2d, T3 | SL4 |
| AC6 | T4 | SL5 |
| AC7 | RC2 | SL6 |

## Acceptance Criteria

1. `AC1`: Startup, resume-startup, handoff es resume-kickoff promptban explicit command decision gate van.
2. `AC2`: A gate deterministicen tartalmazza: round 1 `converged` tilos; round>=2 no-findings clean path `converged`; clean pathon `pass --no-findings` tilos (natural wording variansokra is); round>=2 findings eseten `pass` irany megorzott.
3. `AC3`: A dokumentum explicit kijelenti, hogy blocker policy viselkedes ebben a taskban nem bovul.
4. `AC4`: Prompt contract wording nem PASS-centrikus.
5. `AC5`: Prompt drift ellen startup/resume/handoff/resume-kickoff + guidance tesztek vedik a kritikus mondatokat.
6. `AC6`: Runtime/state/protocol viselkedes valtozatlan marad ebben a bugfixben.
7. `AC7`: Frontmatter status explicit `implementable`, es osszhangban van a Spec Lock kimenettel.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Runtime command guard, ami clean reviewer PASS-t automatikusan converged-re terel.
2. [later-hardening] Prompt contract golden snapshot teszt, hogy wording drift ne csusszon vissza.
3. [later-hardening] Kulon task a blocker policy formalizalasra, ha valodi policy-bovites kell.

## Assumptions

1. A drift tipus: reviewer clean PASS round>=2 utan ujabb implementer kort nyit.
2. Phase 1 cel: prompt-level drift csokkentese minimal blast radiussal.

## Open Questions (Non-Blocking)

1. A command gate blokk kulon helperbe keruljon-e, hogy startup/resume/handoff/resume-kickoff 100% szovegegyezes geppel garantalt legyen?

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `SL1`: command gate ket-retegu delivery modellje explicit: full canonical text startup/resume-startup feluleten + round-conditional projection handoff/resume-kickoff feluleten (`T2a`, `T2b`, `T2c`, `T2d`), es projection szabaly `augment, not replace`.
2. `SL2`: `FORBID_A/FORBID_B1/B2/B3/FORBID_C` substringek egyik prompt feluleten sem szerepelnek.
3. `SL3`: PASS-bias wording javitva es output-contract command-semleges.
4. `SL4`: erintett prompt tesztek lefedik a kritikus gate mondatokat (startup + resume + handoff + resume-kickoff + guidance).
5. `SL5`: runtime/state/protocol path nem valtozik.
6. `SL6`: frontmatter status `implementable` es konzisztens az IMPLEMENTABLE gate megfogalmazassal.
7. `SL7`: scope-boundary invariance explicit: blocker policy unchanged marker jelen van, es blocker policy expansion Out of Scope-ban tiltott.
