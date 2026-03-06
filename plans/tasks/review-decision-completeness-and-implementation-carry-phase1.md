---
artifact_type: task
artifact_id: task_review_decision_completeness_and_implementation_carry_phase1_v1
title: "Review Decision-Completeness + Implementation-Carry Gates (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/findings.ts
  - src/cli/commands/agent/pass.ts
  - src/core/gates/docContractGates.ts
  - src/core/convergence/policy.ts
  - src/core/agent/pass.ts
  - src/types/bubble.ts
  - src/core/bubble/statusBubble.ts
  - src/cli/commands/bubble/status.ts
  - tests/core/gates/docContractGates.test.ts
  - tests/core/convergence/policy.test.ts
  - tests/core/agent/pass.test.ts
  - tests/cli/agentPassCommand.test.ts
  - docs/llm-doc-workflow-v1.md
  - .claude/skills/CreatePairflowSpec/Workflows/CreateTask.md
  - .claude/skills/CreatePairflowSpec/references/Reviewer-Guidelines.md
  - .claude/skills/CreatePairflowSpec/Templates/task-template.md
  - .claude/skills/UsePairflow/Workflows/ReviewBubble.md
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/review-loop-complexity-memo-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/llm-doc-workflow-v1.md
  - docs/reviewer-severity-ontology.md
owners:
  - "felho"
---

# Task: Review Decision-Completeness + Implementation-Carry Gates (Phase 1)

## L0 - Policy

### Goal

A review-loop optimalizalas kovetkezo lepese: ne minden P2/P3 menjen kulon hardening taskba.
A rendszer kulonitse el determinisztikusan:
1. mi igenyel emberi dontest meg a spec fazisban,
2. mi javitando ugyanabban az implementacios bubble-ben,
3. mi mehet tenyleg kesobbi hardening backlogba.

### In Scope

1. Canonical finding-level feloldasi osztaly bevezetese (`resolution_path`) a protocol payloadban.
2. Decision-completeness gate bevezetese docs/spec scope-ra.
3. Implementation-carry gate bevezetese code/implementation scope-ra.
4. CLI finding parser bovitese, hogy a reviewer explicit tudja cimkezni a findingokat.
5. Bubble status JSON additiv allapotmezok a ket uj gate allapothoz.
6. Workflow + skill frissites, hogy a reviewer/spec-iro egyforman ezt a modellt hasznalja.

### Out of Scope

1. Teljes reviewer prompt rendszer ujratervezese.
2. UI redesign a gate mezok vizualizaciojahoz.
3. Teljesen automata finding class inferencia LLM nelkul.
4. Historical transcript utolagos migracioja.

### Safety Defaults

1. Backward compatibility: ha `resolution_path` hianyzik, deterministic fallback mapping fut.
2. Parse/normalization hiba eseten advisory warning + fail-open, nincs lifecycle crash.
3. A jelenlegi blocker boundary (`P0/P1 + required-now + L1`) valtozatlan marad.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary-k:
   - protocol finding schema contract,
   - convergence/blocking policy contract,
   - status API/CLI contract,
   - reviewer/authoring skill contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/types/findings.ts` | finding type + guards | uj optional finding mezo: `resolution_path` (`decision-required|impl-now|later-hardening`) + validator | P1 | required-now | T1, T5 |
| CS2 | `src/cli/commands/agent/pass.ts` | `--finding` parser | finding syntax bovites explicit resolution cimkezesre, backward-compatible formaval | P1 | required-now | T2, T6 |
| CS3 | `src/core/gates/docContractGates.ts` | reviewer finding evaluation | docs scope-ban `decision-required` elemek kulon szamlalasa; `spec_lock_state` kiegeszitese decision-completeness allapottal | P1 | required-now | T1, T3, T7 |
| CS4 | `src/core/convergence/policy.ts` | convergence blocker policy | code scope-ban nyitott `impl-now` findingek blokkoljak a convergence-et, `later-hardening` nem | P1 | required-now | T3, T4, T8 |
| CS5 | `src/core/agent/pass.ts` | pass metadata emission | reviewer finding osztalyok aggregalt metrikai jelzese metadata-ban (`decision_required_open`, `impl_now_open`) | P2 | required-now | T9 |
| CS6 | `src/types/bubble.ts`, `src/core/bubble/statusBubble.ts`, `src/cli/commands/bubble/status.ts` | status contract + rendering | additiv mezok: `decision_completeness_state`, `implementation_carry_state` | P1 | required-now | T7, T10 |
| CS7 | `docs/llm-doc-workflow-v1.md` | workflow policy | explicit szabaly: `decision-required` specben zarando, `impl-now` implementacios bubble-ben zarando, `later-hardening` backlog | P1 | required-now | T11 |
| CS8 | `.claude/skills/CreatePairflowSpec/Workflows/CreateTask.md` + references/templates | spec authoring workflow | kotelezo finding-disposition mental model: editorial vs executable vs decision-required, es megfelelo jeloles | P1 | required-now | T12 |
| CS9 | `.claude/skills/UsePairflow/Workflows/ReviewBubble.md` | review workflow | deep review outputban kotelezoen kulon bontva: `decision-required`, `impl-now`, `later-hardening` javaslat | P2 | required-now | T12 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Finding payload | `priority/timing/layer/evidence` | ugyanez + `resolution_path` | `priority`, `timing`, `layer`, `evidence` | `resolution_path` | additive, non-breaking | P1 | required-now |
| `resolution_path` domain | N/A | `decision-required|impl-now|later-hardening` | valid enum if present | absent => fallback inference | additive | P1 | required-now |
| Status gate state | blocker/spec-lock/round gate only | + decision/impl-carry allapot | `state`, `open_count` | `reason_code` | additive | P1 | required-now |

Fallback inference (required, deterministic):
1. Ha `resolution_path` hianyzik es finding blocker-eligible (`P0/P1 + required-now + L1`), kezelese `decision-required`.
2. Ha `resolution_path` hianyzik es nem blocker-eligible:
   - docs scope-ban default `later-hardening`,
   - code scope-ban `required-now + L1` eseten default `impl-now`, kulonben `later-hardening`.
3. Explicit `resolution_path` mindig felulirja a fallback inferenciat, ha valid.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Gate evaluation path | finding class alapjan uj gate allapotok szamitasa | lifecycle/state machine torese | advisory/validation first | P1 | required-now |
| Convergence policy | impl-now gate alapjan extra block szabaly | P2/P3 global blockerre emelese cimkezes nelkul | celzott, class-alapu blokk | P1 | required-now |
| Skill behavior | reviewer/spec iro workflow explicit osztalyozast ker | formatumtol fuggo ad-hoc dontes | determinisztikus review output | P2 | required-now |

Constraint: ha nincs explicit external side-effect, implementacio pure policy/logical transformation legyen.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `resolution_path` token | finding parser | advisory warning | fallback inference mapping | FINDING_RESOLUTION_PARSE_WARNING | warn | P1 | required-now |
| contradictory pair (`timing=later-hardening`, `resolution_path=impl-now`) | gate normalization | normalize + warn | canonicalize to `later-hardening` | FINDING_RESOLUTION_CONFLICT_WARNING | warn | P2 | required-now |
| docs scope open decision-required | decision gate | block spec implementable | state=`OPEN` | DECISION_COMPLETENESS_WARNING | info | P1 | required-now |
| code scope open impl-now | convergence policy | block convergence | explicit policy error message | IMPLEMENTATION_CARRY_OPEN_WARNING | info | P1 | required-now |
| dependency failure | N/A | fallback | existing gate behavior kept | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing finding schema + docContractGates + convergence policy integration | P2 | required-now |
| must-use | `docs/llm-doc-workflow-v1.md` mint canonical policy source | P2 | required-now |
| must-not-use | uj kulso dependency csak parser/gate miatt | P2 | required-now |
| must-not-use | summary-only magic parsing structured finding helyett | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Docs scope decision-required gate | docs scope finding: `resolution_path=decision-required` | spec lock calc fut | `decision_completeness_state.open_count > 0`, nem implementable | P1 | required-now | automated test |
| T2 | CLI finding parse extended | `--finding "P2:Title|ref|resolution=impl-now"` | parse fut | finding payload tartalmaz valid `resolution_path`-ot | P1 | required-now | automated test |
| T3 | Code scope impl-now blocks converge | reviewer PASS open `impl-now` findinggel | convergence policy fut | convergence blocked explicit errorrel | P1 | required-now | automated test |
| T4 | Later-hardening does not block | reviewer PASS only `later-hardening` findingekkel | convergence policy fut | convergence nem blokkolodik ezen az alapon | P1 | required-now | automated test |
| T5 | Backward compatibility without resolution | finding payloadban nincs `resolution_path` | normalization fut | deterministic fallback mapping alkalmazodik | P1 | required-now | automated test |
| T6 | Legacy finding syntax still valid | `--finding "P1:Title|ref"` | parse fut | nincs parser regresszio | P1 | required-now | automated test |
| T7 | Status JSON additive contract | gate allapotok nyitottak | bubble status JSON | uj mezok megjelennek additivan, regi shape nem torik | P1 | required-now | automated test |
| T8 | Scope-sensitive default mapping | azonos P2 required-now finding docs es code scope-ban | gate/convergence fut | docs->later-hardening, code->impl-now default | P1 | required-now | automated test |
| T9 | Metrics metadata enrichment | reviewer pass classed findingsgel | pass event emit | metadata tartalmazza class szerinti open countokat | P2 | required-now | automated test |
| T10 | Status CLI rendering | status mezok JSON/text mode-ban | CLI render fut | emberileg olvashato decision/impl-carry allapot | P2 | required-now | automated test |
| T11 | Workflow doc alignment | docs update | review | v1 workflow expliciten irja a 3 kategoria szerepet | P1 | required-now | doc diff |
| T12 | Skill alignment | skill workflow update | review | CreateTask + ReviewBubble ugyanazt a 3-kategoria modellt enforce-olja | P1 | required-now | skill diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] `resolution_path` export telemetry/report dashboard bontasban.
2. [later-hardening] Template lint check, hogy taskokban legyen explicit "Decision vs Impl vs Backlog" blokk.
3. [later-hardening] UI badge-ek a ket uj gate allapothoz.

## Hardening Backlog (Optional)

No open later-hardening items at task definition time.

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. A reviewer minden findingra adjon `resolution_path` cimket, ahol ez ertelmezheto.
3. Blocker tovabbra is csak: `P0/P1 + required-now + L1`.
4. `decision-required` nem egyenlo blockerrel: kulon decision-completeness gate kezeli.
5. `impl-now` nem backlog: implementacios bubble-ben zarando, kulonben convergence blokk.
6. `later-hardening` nem blokkolhatja sem a spec lockot, sem a convergence-et.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:
1. minden klasszikus blocker (`P0/P1 + required-now + L1`) zart, es
2. `decision_completeness_state.open_count == 0`.

Megjegyzes:
1. Az `impl-now` elemeket nem kulon docs hardening taskba toljuk automatikusan.
2. Azok az aktualis implementacios bubble-ben zarando elemek.
