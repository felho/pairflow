---
artifact_type: task
artifact_id: task_reviewer_clean_pass_command_gate_prompt_hardening_bugfix_phase1_v1
title: "Reviewer Clean-PASS Command Gate Prompt Hardening (Bugfix, Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/core/runtime/reviewerScoutExpansionGuidance.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
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

### In Scope

1. Startup promptban explicit, top-priority command gate blokk: blocker -> `pass`, clean -> `converged`.
2. Handoff/reviewer delivery promptban ugyanez a command gate blokk (szovegben deterministicen egyezzen startup-pal).
3. Scout/summary contract szovegben a PASS-centrikus kifejezesek semlegesitese (pl. "final reviewer output package", nem "final reviewer PASS package").
4. Round 1 guardrail explicit megtartasa: round 1-ben `converged` tiltott.
5. Round>=2 clean rule explicititasa: `pairflow pass --no-findings` ne legyen ajanlott clean path.
6. Prompt driftet vedo tesztassert frissites startup + handoff feluleten.

### Out of Scope

1. Runtime/state/protocol enforcement a `pass` vagy `converged` parancsban.
2. Convergence policy vagy gate logika modositas.
3. Uj bubble config flag bevezetese.
4. Transcript-helyreallitas mar lefutott bubble-okra.

### Safety Defaults

1. Ez bugfix, de prompt-only: allapotgep viselkedes nem valtozhat.
2. Ha prompt komponens driftel, teszt hibazzon determinisztikusan.
3. Round 1 guardrail prioritasa maradjon a command gate felett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: reviewer prompt contract (utasitas-szintu), tesztassert contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/startBubble.ts` | `buildReviewerStartupPrompt` | `(input) -> string` | reviewer startup instruction chain | Top-priority command gate blokk megjelenik: round 1 special-case, round>=2 clean->converged | P1 | required-now | AC1, AC2, T1 |
| CS2 | `src/core/runtime/tmuxDelivery.ts` | `buildDeliveryMessage` reviewer branch | `(envelope, messageRef, bubbleConfig, ...) -> string` | implementer->reviewer handoff action text | Ugyanaz a command gate blokk jelenik meg, mint startupban | P1 | required-now | AC1, AC2, T2 |
| CS3 | `src/core/runtime/reviewerScoutExpansionGuidance.ts` | reviewer output guidance helpers | `() -> string` | output contract wording | PASS-centrikus wording semlegesitve; clean path explicit `converged` | P1 | required-now | AC3, T3 |
| CS4 | `tests/core/bubble/startBubble.test.ts` | reviewer prompt assertions | test assertions | reviewer startup prompt checks | Ellenorzi a command gate blokk es round split jelenletet | P1 | required-now | AC4, T1 |
| CS5 | `tests/core/runtime/tmuxDelivery.test.ts` | reviewer handoff prompt assertions | test assertions | PASS handoff message checks | Ellenorzi startup/handoff szovegkonzisztenciat | P1 | required-now | AC4, T2 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer command decision guidance | reszben implicit, PASS-centrikus | explicit command gate | round 1 rule + round>=2 clean/blocker split | rovid operational pelda | prompt-only, backward-compatible | P1 | required-now |
| Reviewer output contract wording | "final reviewer PASS package" hangsulyos | command-semleges output contract | PASS es CONVERGENCE kompatibilis wording | explanatory note | prompt-level terminology fix | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime behavior | none | state/protocol transition valtozas | bugfix phase csak prompt hardening | P1 | required-now |
| Prompt text | command gate explicit, PASS-bias csokkentes | egymasnak ellentmondo gate szoveg | startup + handoff + scout wording align | P1 | required-now |
| Tests | prompt assertion update | unrelated test refactor | csak erintett prompt tesztek | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Startup es handoff prompt command gate szoveg drift | unit tests | throw (test fail) | CI fail, prompt szerzodes vedelme | `REVIEWER_COMMAND_GATE_PROMPT_DRIFT` | error | P1 | required-now |
| PASS-centrikus wording visszakerul | unit tests / review check | throw (test fail) | regression jelzes | `REVIEWER_PASS_BIAS_REGRESSION` | error | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing reviewer prompt injection points (`startBubble`, `tmuxDelivery`) | P1 | required-now |
| must-use | existing reviewer guidance helper file (`reviewerScoutExpansionGuidance.ts`) | P1 | required-now |
| must-use | existing startup/handoff prompt tests | P1 | required-now |
| must-not-use | runtime protocol/state path modositas ebben a bugfixben | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Startup command gate explicit | reviewer startup prompt render | string generated | tartalmazza round 1 guardrail + round>=2 clean->converged szabalyokat | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | Handoff command gate explicit + startup parity | reviewer handoff message render | string generated | command gate tartalma startup-pal egyezik | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T3 | PASS-bias wording removed in guidance | reviewer guidance render | string generated | "PASS package" helyett command-semleges contract szerepel | P2 | required-now | prompt assertion update |
| T4 | No runtime behavior regression | existing pass/converged tests | tests run | nincs viselkedes-valtozas a parancsokban | P2 | required-now | relevant test subset |

## Acceptance Criteria

1. `AC1`: Startup es handoff promptban van explicit command decision gate.
2. `AC2`: A gate deterministicen tartalmazza: round 1 `converged` tilos; round>=2 clean path `converged`.
3. `AC3`: Prompt contract wording nem PASS-centrikus.
4. `AC4`: Prompt drift ellen startup/handoff tesztek vedik a kritikus mondatokat.
5. `AC5`: Runtime/state/protocol viselkedes valtozatlan marad ebben a bugfixben.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Runtime command guard, ami clean reviewer PASS-t automatikusan converged-re terel.
2. [later-hardening] Prompt contract golden snapshot teszt, hogy wording drift ne csusszon vissza.

## Assumptions

1. A drift tipus: reviewer clean PASS round>=2 utan ujabb implementer kort nyit.
2. Phase 1 cel: prompt-level drift csokkentese minimal blast radiussal.

## Open Questions (Non-Blocking)

1. A command gate blokk kulon helperbe keruljon-e, hogy startup/handoff 100% szovegegyezes geppel garantalt legyen?

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. startup + handoff prompt command gate explicit es konzisztens,
2. PASS-bias wording javitva,
3. erintett prompt tesztek lefedik a kritikus gate mondatokat,
4. runtime/state/protocol path nem valtozik.
