---
artifact_type: task
artifact_id: task_m0_04_gate_pipeline_phase1_converged_poc_v1
title: "M0-04 Gate Pipeline Engine: Converged POC"
status: draft
phase: phase1
target_files:
  - "src/v11/application/gates/runGatePipeline.ts"
  - "src/v11/application/gates/gatePipelineContract.ts"
  - "src/v11/application/converged/runConvergedFlow.ts"
  - "src/v11/application/converged/convergedValidationPreparation.ts"
  - "tests/v11/application/gates/runGatePipeline.test.ts"
  - "tests/v11/application/converged/runConvergedFlow.test.ts"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "architecture"
  - "runtime"
---

# Task: M0-04 Gate Pipeline Engine: Converged POC

## L0 - Policy

### Goal

Vezessunk be egy minimalis, kozos gate-pipeline kernelt a `converged` commandhoz, hogy az egymas utan futtatott gate-ek sorrendje, short-circuit viselkedese es diagnosztika-aggregalasa egy helyre keruljon, viselkedesi regresszio nelkul.

### In Scope

1. Minimalis shared gate kernel bevezetese async evaluator tamogatassal.
2. A `converged` command jelenlegi gate-sorrendjenek atkotese a kozos pipeline-ra.
3. Gate-order, `block` short-circuit es `skip_list` explicit unit teszt.
4. Meglevo `converged` parity/contract viselkedes megtartasa.

### Out of Scope

1. `meta-review gate` lane teljes refaktorja vagy kulon command rollout.
2. Transcript append, delivery, notification vagy recovery flow kozositese.
3. Uj policy-szabaly bevezetese a pilot kedveert.
4. Altalanos, tobb commandot egyszerre erinto gate orchestration API.

### Safety Defaults

1. A pilot csak a gate-orchestration reteg viselkedeset centralizalhatja; command-specifikus domain-dontes nem veszhet el.
2. A kernel legyen pure-by-default: maga a pipeline ne vegezzen I/O muveletet.
3. Barmely evaluator hiba eseten a hiba strukturaltan, gate-azonositoval terjedjen tovabb.
4. Ha a POC nem ad merheto egyszerusitest a `converged` flowban, nem szabad tovabb rolloutolni mas commandokra ebben a taskban.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: belso application orchestration; nincs DB/API/event/auth/config szerzodesvaltozas.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/gates/gatePipelineContract.ts` | `GatePipelineInput`, `GatePipelineResult`, `GateEvaluator` | type-level contract | new file | Formalizalja a pipeline bemenetet, evaluator shape-et, outcome szerzodest es diagnosztika formatumot. | P1 | required-now | `m0-04` roadmap Step 1 + DoD |
| CS2 | `src/v11/application/gates/runGatePipeline.ts` | `runGatePipeline(input: GatePipelineInput) -> Promise<GatePipelineResult>` | new entrypoint | new file | Fix sorrendben futtatja az evaluatorokat, `block` utan short-circuitol, tamogatja az opcionis `skip_list`-et, es visszaadja a teljes gate-outcome listat. | P1 | required-now | Gate one-pager responsibilities/invariants |
| CS3 | `src/v11/application/converged/runConvergedFlow.ts` | `runConvergedFlow(input, dependencies) -> Promise<RunConvergedFlowResult>` | existing | routing utan, execution elott | A `converged` gate-jellegu dontesi lepeseket a kozos pipeline-on keresztul futtatja, mikozben a jelenlegi command kimenet valtozatlan marad. | P1 | required-now | `converged` POC jelolt, roadmap priority #1 |
| CS4 | `src/v11/application/converged/convergedValidationPreparation.ts` | `prepareConvergedValidation(input, dependencies) -> Promise<PrepareConvergedValidationResult>` | existing | current validation gate assembly | A command-specifikus gate inputokat/evaluatorokat eloallitja, de a sorrendkezeles es aggregalas mar nem lokalis kezi orchestration. | P1 | required-now | shared kernel celja: kevesebb tobbhelyes gate-modositas |
| CS5 | `tests/v11/application/gates/runGatePipeline.test.ts` | test suite | test entry | new file | Bizonyitja az ordering, `block` short-circuit, `skip_list`, es evaluator-failure szerzodest. | P1 | required-now | Gate one-pager test contract |
| CS6 | `tests/v11/application/converged/runConvergedFlow.test.ts` | test suite | existing | current orchestration assertions | Bizonyitja, hogy a `converged` flow viselkedese nem regresszal a shared gate-pipeline bevezetese utan. | P1 | required-now | roadmap DoD: no parity/contract regression |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Gate pipeline input | Nincs kozos, explicit pipeline input szerzodes. | Kozos `GatePipelineInput` evaluator listaval es command/profile azonositasra alkalmas contexttel. | `gates[]`, `context`, `profile` | `skip_list`, `diagnostics_seed` | non-breaking internal | P1 | required-now |
| Gate evaluator output | Commandonkent implicit vagy lokalis shape-ek. | Kozos evaluator kimenet legalabb `outcome`, `gate_id`, `diagnostics` mezokkel. | `gate_id`, `outcome` (`pass|warn|block`) | `diagnostics`, `metadata` | non-breaking internal | P1 | required-now |
| Gate pipeline result | Nincs kozponti eredmenyobjektum. | `GatePipelineResult` aggregalt `final_outcome`, `gate_outcomes[]`, `diagnostics` mezokkel. | `final_outcome`, `gate_outcomes[]`, `diagnostics` | `stopped_at_gate_id`, `skipped_gate_ids[]` | non-breaking internal | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Application gate kernel | Memoriabeli evaluator-hivasok es eredmenyaggregalas | Kozvetlen transcript/state write, tmux delivery, notification, fs/network I/O a kernelben | A side effectes muveletek maradjanak a command-specifikus execution/finalization retegekben. | P1 | required-now |

Constraint: a shared gate kernel implementacioja legyen pure-by-default; az evaluatorok adhatnak vissza dontest, de a kernel nem vegezhet mutaciot.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Invalid pipeline input (`gates` hianyzik/ures, hibas gate id) | N/A | throw | N/A | `GATE_CONTEXT_INVALID` | error | P1 | required-now |
| Gate evaluator kivetelt dob | gate evaluator | throw | Preserve original cause + annotate `gate_id` | `GATE_EVALUATOR_FAILED` | error | P1 | required-now |
| Gate `block` outcome-ot ad | gate evaluator | result | Stop further evaluator execution, return aggregated result | N/A | info | P1 | required-now |
| Ismeretlen `skip_list` elem | N/A | result | Ignore unknown skip token; do not fail the command | N/A | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `runConvergedFlow` current public contract, existing `converged` tests, existing policy/validation helpers as evaluator inputs | P1 | required-now |
| must-not-use | Direct transcript/state mutation inside shared gate kernel; meta-review apply/recovery logic migration in same task | P1 | required-now |
| must-not-use | Behavioral change hidden behind weakened tests or removed contract assertions | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | ordering | 3 evaluator fix sorrenddel | `runGatePipeline` fut | evaluatorok deklaralt sorrendben futnak | P1 | required-now | Gate one-pager `ordering` |
| T2 | short-circuit | elso `warn`, masodik `block`, harmadik `pass` | `runGatePipeline` fut | harmadik evaluator nem fut le, `final_outcome=block` | P1 | required-now | Gate one-pager `block` invariant |
| T3 | skip-list | 1 gate szerepel a `skip_list`-ben | `runGatePipeline` fut | a kihagyott gate nem fut, a result ezt explicit mutatja | P1 | required-now | Gate one-pager `skip-list` |
| T4 | evaluator failure | evaluator exceptiont dob | `runGatePipeline` fut | strukturalt `GATE_EVALUATOR_FAILED` hiba terjed tovabb `gate_id` contexttel | P1 | required-now | Error model in one-pager |
| T5 | converged parity | jelenlegi `converged` fixture/test setup | `runConvergedFlow` fut shared pipeline-nal | a command-kimenet es orchestration sorrend szemantikailag valtozatlan | P1 | required-now | roadmap DoD: no parity regression |
| T6 | contract safety | meglvo `converged` contract suite | contract tesztek futnak | nincs regresszio a `converged` command viselkedeseben | P1 | required-now | roadmap DoD: no contract regression |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a POC sikeres, a kovetkezo jelolt command a `meta-review gate` lane lehet, de kulon taskban.
2. [later-hardening] A pipeline profile-konfiguracio csak akkor legyen altalanositva tobb commandra, ha a `converged` POC utan tenylegesen csokken a tobbhelyes gate-modositas.
3. [later-hardening] A gate diagnosztika formatumot erdemes kesobb metrics/observability fogyasztasra is konzisztensiteni, de ez nem blokkolja a pilotot.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `skip_list` tokenek centralis validacioja es lint-szeru guard | L2 | P2 | later-hardening | implementation follow-up | Kulon follow-up task, ha tobb command is atall a shared pipeline-ra |
| H2 | Shared gate profile registry tobb commandra | L2 | P2 | later-hardening | roadmap Step 3 | Csak POC merheto haszna utan nyisson kulon taskot |

## Review Control

1. Minden finding kotelezo mezoje: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening kor.
3. Round 2 utan uj `required-now` csak bizonyitott `P0/P1` eseten nyithato.
4. Ami nem serti ezt a task-szerzodest, `later-hardening` cimket kapjon.
5. Mivel `contract_boundary_override=no`, `plan_ref` maradhat `null`.

## Spec Lock

Mark the task as `IMPLEMENTABLE`, ha a shared gate-kernel `converged`-re be van kotve, az ordering/short-circuit/skip-list unit tesztek zoldek, es a meglvo `converged` parity/contract vedelmek nem regresszalnak.
