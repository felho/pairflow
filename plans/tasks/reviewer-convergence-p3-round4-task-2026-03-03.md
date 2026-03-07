---
artifact_type: task
artifact_id: task_reviewer_convergence_p3_round4_phase1_v2
title: "Reviewer Convergence Decision Gate for Round 4+ Non-Blockers (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/config/defaults.ts
  - src/config/bubbleConfig.ts
  - src/core/convergence/policy.ts
  - src/core/agent/pass.ts
  - src/core/agent/converged.ts
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/cli/commands/agent/pass.ts
  - src/cli/commands/agent/converged.ts
  - src/core/bubble/createBubble.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/convergence/policy.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/bubble/startBubble.test.ts
  - docs/review-loop-optimization.md
  - docs/reviewer-severity-ontology.md
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Convergence Decision Gate for Round 4+ Non-Blockers

## L0 - Policy

### Goal

Szuntesse meg azt a review loop mintat, amikor `round >= severity_gate_round` es csak non-blocker (`P2/P3`) finding marad, de a reviewer tovabbra is `pairflow pass`-t kuld es uj implementer fix kort nyit.

### In Scope

1. Bevezeti a `severity_gate_round` configot (default: `4`, minimum: `2`).
2. Reviewer `PASS` runtime guard:
   - `round >= severity_gate_round` + csak `P2/P3` finding -> reject.
   - `round >= severity_gate_round` + `--no-findings` -> reject (converged required).
3. Prompt/runtime command decision gate osszehangolasa startup/resume/handoff feluleteken.
4. Convergence policy helper bovitese expliciten `P0/P1/P2/P3` non-blocker kompozicioval (`P3`-only is).
5. `pass.ts` es `converged` policy ugyanazt a gate-input szerzodest hasznalja.
6. Tesztek frissitese reject-path observability + transcript/state invariansokra.
7. Docs terminology/default sync (`review-loop-optimization`, `reviewer-severity-ontology`).

### Out of Scope

1. Uj severity ontology vagy severity model redesign.
2. UI-level interactive guidance.
3. Teljes reviewer output contract attervezes.
4. Automatikus "forced convergence" minden non-blocker findingra.

### Safety Defaults

1. `round < severity_gate_round` alatt marad a kompatibilis PASS viselkedes.
2. Rejectelt reviewer PASS eseten nincs transcript append, nincs role/round transition.
3. Blocker (`P0/P1`) finding post-gate is PASS-olhato marad.
4. Konvergencia dontesek tovabbra is strukturalt finding payloadra epulnek; summary parsing csak fallback diagnosztika.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary-k:
   - bubble config contract (`severity_gate_round`),
   - convergence policy input contract,
   - reviewer PASS runtime gate contract,
   - user-facing prompt/CLI command contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | `BubbleConfig` | `interface BubbleConfig -> add severity_gate_round?: number` | config type block | configban elerheto explicit gate threshold | P1 | required-now | AC1, T1 |
| CS2 | `src/config/defaults.ts` | default export | `DEFAULT_SEVERITY_GATE_ROUND: number` | defaults block | canonical default `4` | P1 | required-now | AC1, T1 |
| CS3 | `src/config/bubbleConfig.ts` | parse/validate/serialize | `parseBubbleConfigToml(string) -> BubbleConfig` | config validator + TOML roundtrip | `severity_gate_round >= 2` enforce + stable render/parse | P1 | required-now | AC1, AC13, T1 |
| CS4 | `src/core/convergence/policy.ts` | policy input/evaluator | `validateConvergencePolicy(input: ConvergencePolicyInput) -> ConvergencePolicyResult` | findings evaluation helper + gating messages | `P0/P1/P2/P3` explicit counts + `hasNonBlocking`; messaging derived from `severity_gate_round` | P1 | required-now | AC7, AC12, AC14, T2 |
| CS5 | `src/core/agent/pass.ts` | reviewer PASS guard | `emitPassFromWorkspace(input, deps?) -> Promise<EmitPassResult>` | reviewer intent/validation after findings parse, before append | post-gate non-blocker-only PASS es `--no-findings` reject explicit converged next-step uzenettel | P1 | required-now | AC3, AC4, AC8, AC9, T3 |
| CS6 | `src/core/agent/converged.ts` | convergence gate wiring | `emitConvergedFromWorkspace(input, deps?) -> Promise<EmitConvergedResult>` | policy invocation input assembly | shared policy input (`severity_gate_round`) explicit atadasa | P1 | required-now | AC14, T4 |
| CS7 | `src/core/bubble/startBubble.ts` | reviewer startup/resume prompt | `buildReviewerStartupPrompt(...) -> string` + resume variants | reviewer prompt sections | top-priority command decision gate text align runtime policyval | P1 | required-now | AC2, T5 |
| CS8 | `src/core/runtime/tmuxDelivery.ts` | reviewer handoff action text | `buildTmuxDeliveryMessage(...) -> string` | reviewer PASS delivery action branch | handoff prompt ugyanazt a pass vs converged gate-et kozli | P1 | required-now | AC2, T5 |
| CS9 | `src/cli/commands/agent/pass.ts` + `src/cli/commands/agent/converged.ts` | help/error alignment | `getPassHelpText() -> string`, `getConvergedHelpText() -> string` | CLI help text | post-gate command choice irany explicit es konzisztens | P2 | required-now | AC4, T6 |
| CS10 | `src/core/bubble/createBubble.ts` | config threading | `createBubble(...) -> Promise<CreateBubbleResult>` | bubble config write path | `severity_gate_round` persist bubble config artifactba | P1 | required-now | AC1, T7 |
| CS11 | docs + tests | docs/tests sync | `N/A` | listed test/docs files | default `4` consistency es reject observability | P1 | required-now | AC11, T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble config schema | nincs `severity_gate_round` | van `severity_gate_round` | `severity_gate_round` integer `>=2` (if present) | omitted -> default `4` | additive, backward-compatible default | P1 | required-now |
| Convergence policy input | nincs gate round | `ConvergencePolicyInput.severity_gate_round` | `currentRound`, `reviewer`, `implementer`, `reviewArtifactType`, `roundRoleHistory`, `transcript`, `severity_gate_round` | `N/A` | contract-extension (internal) | P1 | required-now |
| Findings gate signal | ad-hoc blocking check | severity-aware aggregate | `p0`, `p1`, `p2`, `p3`, `hasBlocking`, `hasNonBlocking` | summary-derived diagnostics | internal behavior change | P1 | required-now |
| PASS reject reason | generic pass validation messages | explicit post-gate non-blocker reject + converged next step | reason text incl. `round >= severity_gate_round` + "use `pairflow converged --summary ...`" | additional context suffix | behavior tightening (reviewer-only path) | P1 | required-now |
| Converged metadata for redirected non-blockers | summary-only tendency | structured non-blocking notes preserved | findings/refs-derived structured payload path | summary text | non-breaking additive metadata | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript mutation | PASS append only when gate passes | append on rejected post-gate reviewer PASS | reject branch must be side-effect safe | P1 | required-now |
| State mutation | role/round switch only after accepted PASS | role/round switch on rejected PASS | reject must keep state invariant | P1 | required-now |
| Prompt surfaces | command gate clarifying text update | conflicting pass-biased guidance | startup/resume/handoff text must match runtime gate | P1 | required-now |
| Docs | default and rule sync | docs/runtime drift (`3` vs `4`) | docs are normative reference for operator expectation | P2 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `severity_gate_round < 2` in config | bubble config parser | throw | reject config parse/validation | `SEVERITY_GATE_ROUND_INVALID` | error | P1 | required-now |
| reviewer PASS, post-gate, non-blocking-only findings | PASS runtime validation | throw | no append, no state transition, actionable converged guidance | `REVIEWER_PASS_NON_BLOCKING_POST_GATE` | info | P1 | required-now |
| reviewer PASS, post-gate, `--no-findings` | PASS runtime validation | throw | no append, no state transition, actionable converged guidance | `REVIEWER_PASS_NO_FINDINGS_POST_GATE` | info | P1 | required-now |
| missing/invalid finding payload for policy helper | convergence policy parser | result (invalid) | reject convergence with explicit payload error | `FINDINGS_PAYLOAD_INVALID` | warn | P1 | required-now |
| docs not yet updated | docs sync step | fallback | keep runtime behavior canonical; track docs delta in same change | `DOC_SYNC_PENDING` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing finding priority model (`P0..P3`) and structured findings payload | P1 | required-now |
| must-use | existing convergence policy entrypoint (`validateConvergencePolicy`) for shared gate ownership | P1 | required-now |
| must-use | existing prompt injection surfaces (`startBubble`, `tmuxDelivery`) | P1 | required-now |
| must-not-use | summary-only regex as primary decision source when structured findings exist | P1 | required-now |
| must-not-use | new CLI flags in Phase 1 for this gate | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Config default + validation | config with/without `severity_gate_round` | parse + serialize + parse | default `4`; explicit `<2` rejected; roundtrip stable | P1 | required-now | tests/config/bubbleConfig.test.ts |
| T2 | Policy helper non-blocker coverage | previous reviewer findings are `P3`-only and post-gate | convergence policy evaluated | helper exposes non-blocker composition explicitly; decision text parameterized | P1 | required-now | tests/core/convergence/policy.test.ts |
| T3 | PASS reject post-gate (P2/P3 only) | reviewer active, `round >= severity_gate_round`, only `P2/P3` findings | `pairflow pass` | command fails; transcript unchanged; round/role unchanged; explicit converged next-step | P1 | required-now | tests/core/agent/pass.test.ts |
| T4 | PASS allow post-gate with blocker | reviewer active, `round >= severity_gate_round`, includes `P0/P1` | `pairflow pass` | accepted; normal handoff behavior | P1 | required-now | tests/core/agent/pass.test.ts |
| T5 | Prompt decision gate alignment | startup/resume/handoff reviewer prompts | prompt build | all surfaces include same command decision gate semantics | P1 | required-now | tests/core/bubble/startBubble.test.ts + tests/core/runtime/tmuxDelivery.test.ts |
| T6 | CLI guidance symmetry | agent help texts | render help | pass/converged help indicates post-gate command expectation consistently | P2 | required-now | tests/cli (if present) |
| T7 | Config threading into bubble artifact | create bubble with explicit gate round | read persisted bubble config | `severity_gate_round` persisted and used by runtime | P1 | required-now | tests/core/bubble/createBubble.test.ts |
| T8 | Docs default consistency | docs update included | inspect docs references | default value `4` and decision rule wording align everywhere | P2 | required-now | docs diff review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Structured converged notes artifact for redirected `P2/P3` findings (dedicated schema instead of summary enrichment).
2. [later-hardening] Metrics hook: count "post-gate pass rejected" events by bubble for loop-efficiency dashboards.
3. [later-hardening] UI badge for "converged-required gate active" in reviewer pane/status view.

## Assumptions

1. A tervhivatkozas erre a taskra: `plans/archive/pairflow-initial-plan.md`.
2. A gate csak reviewer-origin PASS-re vonatkozik; implementer PASS semantics valtozatlan.
3. A non-blocking finding preserving minimum szintjen metadata/structured notes elegendo Phase 1-ben.

## Open Questions (Non-Blocking)

1. A structured non-blocking notes persistence Phase 1-ben kulon artifact legyen-e, vagy eleg metadata a converged payloadban?
2. CLI help-ben mennyire legyen explicit a post-gate szabaly (rovid vs hosszabb operational note)?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Dedicated non-blocking convergence notes artifact schema | L2 | P2 | later-hardening | AC15 follow-up | Open a focused follow-up task after Phase 1 landing |
| H2 | Gate rejection telemetry and report integration | L2 | P2 | later-hardening | Metrics evolution | Add event fields + report row in metrics phase |
| H3 | UI-level reviewer gate indicator | L2 | P3 | later-hardening | Operator UX | Add additive status badge in web UI |

## Review Control

1. A post-gate reviewer command dontes determinisztikus: blocker -> `pass`, non-blocking/clean -> `converged`.
2. Minden gate-dontes explicit reason stringgel legyen auditálható.
3. Structured finding payload elsodleges; summary parsing legfeljebb diagnostics.
4. Round-1 guardrail precedence maradjon explicit.
5. `contract_boundary_override=yes` miatt `plan_ref` kotelezo es L1-ben a config + policy contract sorok kotelezoek.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `severity_gate_round` schema/default/validation es TOML roundtrip kesz,
2. reviewer PASS post-gate reject-path invariansok tesztelve (no append, no state transition),
3. policy helper explicit `P0..P3` non-blocking kompoziciot ad es shared ownership aktiv,
4. startup/resume/handoff prompt gate szoveg runtime logikaval konzisztens,
5. docs default/rule wording drift megszunt (`4` canonical default).
