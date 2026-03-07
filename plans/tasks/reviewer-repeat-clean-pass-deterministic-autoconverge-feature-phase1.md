---
artifact_type: task
artifact_id: task_reviewer_repeat_clean_pass_deterministic_autoconverge_feature_phase1_v1
title: "Reviewer Repeat-Clean PASS Deterministic Auto-Converge Override (Small Feature, Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/agent/pass.ts
  - src/core/agent/converged.ts
  - src/core/convergence/policy.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/bubble/orchestrationLoopSmoke.test.ts
  - docs/pairflow-initial-design.md
  - README.md
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Repeat-Clean PASS Deterministic Auto-Converge Override (Small Feature)

## L0 - Policy

### Goal

Vezessen be determinisztikus runtime override-ot arra az egyertelmu drift helyzetre, amikor reviewer ismetelten clean `PASS`-t kuld round>=2-ben, es emiatt a bubble feleslegesen RUNNING-ben marad.

### In Scope

1. Repeat-clean drift trigger definicio:
   - aktiv kuldo reviewer,
   - aktualis command `PASS` clean (`pass_intent=review`, `findings=[]`),
   - round>=2,
   - transcriptben a legutobbi korabbi reviewer `PASS` szinten clean.
2. Trigger eseten a rendszer ne implementer handoffot csinaljon, hanem determinisztikusan auto-converge override-ot hajtson vegre.
3. Auto-converge override output contract:
   - `CONVERGENCE` + `APPROVAL_REQUEST` envelope-ek keletkeznek,
   - bubble allapot `READY_FOR_APPROVAL`.
4. A summary szoveg maradjon az aktualis reviewer input summary; optional suffix jelezheti az auto-override okat.
5. Guardrail: round 1-ben soha ne tortenjen auto-converge override.
6. Teszteles transcript/state invariansokra es policy interoperabilitasra.
7. Docs update a determinisztikus override szabalyrol.

### Out of Scope

1. Altalanos auto-converge minden clean PASS esetre (single-clean scenario) Phase 1-ben.
2. Uj UI workflow vagy emberi megerosites popup.
3. Reviewer findings modell vagy severity ontology modositas.
4. Teljes loop policy redesign.

### Safety Defaults

1. Nem repeat-clean esetben marad a jelenlegi PASS viselkedes.
2. Ha auto-converge policy validacio megbukik, command fail legyen explicit hibaokkal; ne legyen silent fallback implementer handoffra.
3. Trigger nelkul ne tortenjen implicit override.
4. Transcript es state konzisztencia: vagy PASS path, vagy CONVERGENCE path fusson, kevert mellekhatas ne lehessen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary-k:
   - reviewer PASS runtime contract,
   - convergence transition contract,
   - transcript/state mutation contract,
   - operator dokumentacios contract (`README`, `pairflow-initial-design`).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/agent/pass.ts` | `emitPassFromWorkspace` | `(input, deps?) -> Promise<EmitPassResult>` | reviewer clean PASS path, transcript append elott | Repeat-clean triggernel PASS handoff helyett auto-converge path indul | P1 | required-now | AC1, AC2, T1 |
| CS2 | `src/core/agent/pass.ts` | repeat-clean detection helper (uj private helper) | `(transcript, reviewer, currentRound) -> { repeatClean: boolean; previousReviewerPassId?: string }` | reviewer branch | Determinisztikusan felismeri a legutobbi korabbi clean reviewer PASS-t | P1 | required-now | AC1, T2 |
| CS3 | `src/core/agent/converged.ts` | convergence emission reuse | existing helpers | pass-bol hivhato kozos path | Auto-override ugyanazt a validacios es append szabalyt hasznalja, mint manual `converged` | P1 | required-now | AC3, AC4, T3 |
| CS4 | `src/core/convergence/policy.ts` | policy invocation contract | `validateConvergencePolicy(input) -> result` | pass-triggered converge path | Policy ellenorzes explicit, hiba eseten nem fallbackel PASS-ra | P1 | required-now | AC4, T4 |
| CS5 | `tests/core/agent/pass.test.ts` | pass command tests | test assertions | uj override scenariok | Repeat-clean clean PASS -> READY_FOR_APPROVAL, nincs implementer handoff PASS | P1 | required-now | AC2, AC5, T1, T2 |
| CS6 | `tests/core/agent/converged.test.ts` | convergence parity tests | test assertions | auto es manual converged parity | Auto-path ugyanazokat a gateeket tartja, mint manual converged | P1 | required-now | AC3, T3 |
| CS7 | `tests/core/bubble/orchestrationLoopSmoke.test.ts` | loop smoke | test assertions | e2e review loop | Repeat-clean drift eseten loop megall approval szakaszban | P1 | required-now | AC5, T5 |
| CS8 | `docs/pairflow-initial-design.md`, `README.md` | protocol docs | `N/A` | command semantics sections | Dokumentalja a repeat-clean auto-override deterministic szabalyat | P2 | required-now | AC6, T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer clean PASS handling | clean PASS implementer handoffot nyit | repeat-clean clean PASS auto-converge override | `pass_intent=review`, `findings=[]`, `round>=2`, previous reviewer clean PASS present | override summary suffix | targeted behavior change | P1 | required-now |
| Transcript mutation mode | reviewer clean PASS -> `PASS` append | trigger eseten `CONVERGENCE` + `APPROVAL_REQUEST` append | canonical envelope order | optional audit ref | behavior change | P1 | required-now |
| State transition | reviewer clean PASS -> RUNNING + implementer active | trigger eseten `READY_FOR_APPROVAL` | valid reviewer context + policy pass | optional audit metadata | behavior change | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript | repeat-clean triggernel convergence envelope pair append | triggeresetben plusz PASS append | ne legyen dupla/kevert append | P1 | required-now |
| State | repeat-clean triggernel READY_FOR_APPROVAL transition | triggernel RUNNING implementer handoff | loop-stopper behavior | P1 | required-now |
| Metrics/notifications | normal converged path szerinti jelzesek | custom ad-hoc side channel Phase 1-ben | reuse existing converge hooks | P2 | required-now |
| Docs | README/design sync | docs/runtime drift | operator expectation fix | P2 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Repeat-clean trigger aktiv, de convergence policy reject | convergence policy validator | throw | command reject explicit policy hibaval, state/transcript valtozatlan | `REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED` | error | P1 | required-now |
| Repeat-clean trigger nem aktiv | transcript history | result | normal PASS path | `REPEAT_CLEAN_TRIGGER_NOT_MET` | info | P2 | required-now |
| Round=1 clean reviewer PASS | round guardrail | result | normal existing round1 path, no override | `AUTOCONVERGE_ROUND1_DISABLED` | info | P1 | required-now |
| Previous reviewer PASS nem clean vagy nincs | transcript history | result | normal PASS path | `PREVIOUS_REVIEWER_CLEAN_PASS_MISSING` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing convergence validation (`validateConvergencePolicy`) | P1 | required-now |
| must-use | existing convergence append/state transition logic | P1 | required-now |
| must-use | transcript mint source-of-truth previous reviewer clean PASS detektalasra | P1 | required-now |
| must-not-use | summary text regex mint egyetlen trigger source | P1 | required-now |
| must-not-use | trigger aktiv eseten silent fallback implementer handoffra policy rejectkor | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Repeat-clean override happy path | reviewer active, round>=2, current clean PASS, previous reviewer PASS clean | `pairflow pass --no-findings` | `CONVERGENCE` + `APPROVAL_REQUEST`, state `READY_FOR_APPROVAL`, nincs implementer handoff PASS | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T2 | Trigger negative: previous reviewer PASS not clean | reviewer active, round>=2, current clean PASS, previous reviewer PASS findingses | `pairflow pass --no-findings` | normal PASS behavior marad | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T3 | Auto-path policy parity manual convergeddel | azonos bubble contextban manual vs auto converge | converge path fut | gateek es append sorrend konzisztens | P1 | required-now | `tests/core/agent/converged.test.ts` |
| T4 | Policy reject no-silent-fallback | trigger aktiv + policy explicit reject fixture | `pairflow pass --no-findings` | command fail explicit reasonnel; transcript/state valtozatlan | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T5 | E2E loop stop smoke | drift minta: ket egymast koveto clean reviewer PASS | orchestration loop smoke | bubble approval szakaszba lep felesleges uj kor helyett | P1 | required-now | `tests/core/bubble/orchestrationLoopSmoke.test.ts` |
| T6 | Docs contract sync | README + design sections | docs review | deterministic repeat-clean override szabaly explicit | P2 | required-now | docs diff |

## Acceptance Criteria

1. `AC1`: Runtime egyertelmuen felismeri a repeat-clean drift trigger mintat.
2. `AC2`: Trigger eseten a reviewer clean PASS nem nyit uj implementer kort.
3. `AC3`: Trigger eseten a transition path manual convergeddel policy-szinten azonos.
4. `AC4`: Policy reject esetben nincs silent fallback PASS handoffra.
5. `AC5`: E2E loop smoke szerint repeat-clean drift scenario approvalig fut, nem RUNNING ping-pong.
6. `AC6`: README + design docs expliciten dokumentalja az override viselkedest.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Optional config flag a repeat-clean auto-override ideiglenes ki/bekapcsolasara.
2. [later-hardening] Metrics field: `repeat_clean_autoconverge_count` bubble reportban.
3. [later-hardening] UI status badge: "auto-converged from repeat-clean PASS".

## Assumptions

1. A celzott drift pattern az, amikor reviewer clean PASS utan a kovetkezo reviewer kor is clean PASS, megis RUNNING marad a bubble.
2. Phase 1 szandekosan szuk triggerrel indul (repeat-clean), nem minden clean PASS-re.

## Open Questions (Non-Blocking)

1. Kene-e explicit audit artifact (`artifacts/repeat-clean-autoconverge.json`) az override esemenyrol, vagy eleg a transcript envelope par?
2. A summary-ra keruljon-e kotelezo auto-suffix (pl. "[auto-converged: repeat-clean-pass]")?

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. repeat-clean trigger deterministicen definialt es tesztelt,
2. trigger eseten auto-converge transition megtortenik implementer handoff helyett,
3. policy reject esetben fail-closed viselkedes van,
4. e2e smoke igazolja a drift loop megszuneset,
5. docs/runtime command contract szinkronban van.
