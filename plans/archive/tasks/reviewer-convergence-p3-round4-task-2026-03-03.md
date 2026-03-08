---
artifact_type: task
artifact_id: task_reviewer_convergence_p3_round4_phase1_v3
title: "Reviewer Convergence Decision Gate for Round 4+ Non-Blockers (Phase 1)"
status: implementable
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
  - tests/core/bubble/createBubble.test.ts
  - tests/cli/passCommand.test.ts
  - tests/cli/convergedCommand.test.ts
  - docs/review-loop-optimization.md
  - docs/reviewer-severity-ontology.md
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/review-loop-optimization.md
  - docs/reviewer-severity-ontology.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Convergence Decision Gate for Round 4+ Non-Blockers

## L0 - Policy

### Goal

Szuntesse meg azt a review-loop mintat, amikor `round >= severity_gate_round` es mar csak non-blocker (`P2/P3`) finding marad, de a reviewer tovabbra is `pairflow pass`-t kuld es uj implementer fix kort indit.

### Background (Captured Failure Pattern)

1. Round 4+ korokben tobb esetben non-blocker-only vagy clean reviewer kimenet utan is uj fix kor nyilt.
2. A runtime/prompt/help feluleteken nem volt eleg explicit a `pass` vs `converged` dontesi gate.
3. A konvergencia policy egyes pontjain summary-fallback es strukturalt finding forras szerepe nem volt eleg determinisztikusan levalasztva.

### Deterministic Decision Rule (Canonical)

1. `round < severity_gate_round`: a jelenlegi PASS viselkedes marad kompatibilis.
2. `round >= severity_gate_round` es blocker (`P0/P1`) finding jelen van: reviewer `pairflow pass` engedelyezett.
3. `round >= severity_gate_round` es a finding set `P3`-only: reviewer `pairflow pass` tiltott, `pairflow converged --summary ...` szukseges.
4. `round >= severity_gate_round` es non-blocker findingek maradnak (`P2` vagy `P2+P3`, blocker nelkul): reviewer `pairflow pass` tiltott, `pairflow converged --summary ...` szukseges.
5. `round >= severity_gate_round` es explicit `--no-findings`: reviewer `pairflow pass` tiltott (`REVIEWER_PASS_NO_FINDINGS_POST_GATE`), `pairflow converged --summary ...` szukseges.
6. Reviewer PASS pathon barmely roundban, ha `findings=[]` erkezik explicit `--no-findings` nelkul (vagy malformed finding shape van): invalid payload branch, explicit reject `FINDINGS_PAYLOAD_INVALID` reasonnel.
7. Precedence: post-gate clean intentnel az explicit `--no-findings` szabaly (5) elsodleges; csak ennek hianyaban ervenyes a `FINDINGS_PAYLOAD_INVALID` fail-safe (6).
8. A post-gate command routing (`pass` vs `converged`) nem jelenti a converged auto-elfogadasat: az initial-design konvergencia elofeltetelek (pl. ket egymast koveto review pass + alternation evidence) valtozatlanul ervenyesek.
9. Valid konfiguracios tartomanyban (`severity_gate_round >= 4`) a post-gate PASS reject szabaly round 2-3-ban nem aktiv, igy nincs round 2-3 `no-valid-command` deadlock az initial-design P2 convergence gate-tel.
10. Rule 3 szandekosan explicit subset Rule 4-hez kepest: ez audit-celbol kiemelt `P3`-only branch (AC12), nem kulon policy-eltérés.

### In Scope

1. `severity_gate_round` config bevezetese (default: `4`, minimum: `4`).
2. Reviewer `PASS` runtime gate bevezetese a canonical szabaly szerint.
3. Startup/resume/handoff reviewer prompt es CLI help szoveg osszehangolasa a runtime gate-tel.
4. Convergence policy helper bovitese explicit `P0/P1/P2/P3` aggregacioval es `hasNonBlocking` jelzessel (`P3`-only explicit utvonal).
5. `pass.ts` es `converged.ts` kozos, azonos `severity_gate_round` gate-input contractot hasznal.
6. Reject-path invariansok lefedese tesztekkel (no transcript append, no role/round transition).
7. Docs terminology/default sync (`review-loop-optimization`, `reviewer-severity-ontology`).

### Out of Scope

1. Uj severity ontology vagy severity model redesign.
2. UI-level interactive guidance.
3. Teljes reviewer output contract ujratervezes.
4. Forced convergence minden non-blocker findingra round-fuggetlenul.

### Safety Defaults

1. `round < severity_gate_round` alatt backward-compatible viselkedes marad.
2. Rejectelt reviewer PASS nem okozhat transcript vagy state side effectet.
3. Blocker (`P0/P1`) finding post-gate is PASS-olhato.
4. Structured finding payload az elsodleges policy forras; summary parse csak fallback diagnosztika.
5. Round-1 convergence guardrail precedence valtozatlan marad (`pairflow-initial-design` szerint).
6. Terminologiai igazitas: round-1 esetben a reviewer alternation evidence guardrail precedence marad ervenyben, ezert a converged ut tovabbra is rejectelt; a `severity_gate_round` szabaly ezt nem irja felul.
7. Initial-design kompatibilitas: a task a reviewer command-dontesi gate-et szukiti, de nem lazitja a konvergencia validator baseline kriteriumait (ket egymast koveto review pass, alternation evidence, transcript/state precondition).
8. `FINDINGS_PAYLOAD_INVALID` fail-safe all-round ervenyes reviewer PASS pathon; nem csak post-gate esetekre vonatkozik.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary-k:
   - bubble config contract (`severity_gate_round`),
   - convergence policy input contract,
   - reviewer PASS runtime gate contract,
   - reviewer command guidance contract (prompt + CLI help).

### Normative Reference Policy

1. `normative_refs` jeloli a canonical policy source-of-truth dokumentumokat.
2. `target_files` + `normative_refs` atfedes engedelyezett, de szerepkor szerint kulon ertelmezendo:
   - `target_files`: explicit szerkesztesi scope,
   - `normative_refs`: normativ dontesi hivatkozas.
3. A round-1 converged guardrail precedence normativ forrasa: `docs/pairflow-initial-design.md` (convergence guardrail szabalyok).
4. Precedence summary (normativ): round-1/alternation guardrail valtozatlan; a `severity_gate_round` gate csak azon korokben alkalmazando, ahol a converged precondition egyebkent teljesitheto.
5. Convergence compatibility note (normativ): a post-gate `converged` command requirement nem irja felul a `docs/pairflow-initial-design.md` konvergencia eligibility baseline-t (ket egymast koveto review pass + alternation evidence).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | `BubbleConfig` | `interface BubbleConfig -> add severity_gate_round?: number` | config type block | explicit gate threshold elerheto configban | P1 | required-now | AC1, T1 |
| CS2 | `src/config/defaults.ts` | default export | `DEFAULT_SEVERITY_GATE_ROUND: number` | defaults block | canonical default `4` | P1 | required-now | AC1, T1 |
| CS3 | `src/config/bubbleConfig.ts` | parse/validate/serialize | `parseBubbleConfigToml(string) -> BubbleConfig` | config validator + TOML roundtrip | `severity_gate_round >= 4` enforce + stable render/parse | P1 | required-now | AC1, AC13, AC21, T1, T20 |
| CS4 | `src/core/convergence/policy.ts` | policy input/evaluator | `validateConvergencePolicy(input: ConvergencePolicyInput) -> ConvergencePolicyResult` | findings evaluation helper + gate messaging | explicit `P0/P1/P2/P3` count + `hasBlocking` + `hasNonBlocking`; structured-first parsing, summary diagnostics fallback; round-1 guardrail policy backref | P1 | required-now | AC7, AC10, AC12, AC14, AC18, AC20, T2, T15, T17 |
| CS5 | `src/core/agent/pass.ts` | reviewer PASS guard | `emitPassFromWorkspace(input, deps?) -> Promise<EmitPassResult>` | reviewer validation after findings parse, before append | post-gate non-blocker-only es `--no-findings` PASS reject explicit converged next-step uzenettel; pre-gate es blocker path kompatibilis marad; invalid findings payload explicit reject (`FINDINGS_PAYLOAD_INVALID`) no-side-effect invarianssal | P1 | required-now | AC3, AC4, AC5, AC6, AC8, AC9, AC14, AC16, AC19, T3, T4, T10, T11, T12, T14, T16, T19 |
| CS6 | `src/core/agent/converged.ts` | convergence gate wiring | `emitConvergedFromWorkspace(input, deps?) -> Promise<EmitConvergedResult>` | policy invocation input assembly | shared `severity_gate_round` input + canonical redirected metadata source: elozo reviewer PASS `payload.findings` (transcript); round-1 guardrail precedence explicit megtartasa; initial-design eligibility baseline nem gyengul | P1 | required-now | AC14, AC15, AC17, AC18, AC20, T9, T13, T14, T15, T17, T21 |
| CS7 | `src/core/bubble/startBubble.ts` | reviewer startup/resume prompt helpers | `buildReviewerStartupPrompt(...) -> string`, `buildResumeReviewerStartupPrompt(...) -> string` | reviewer prompt sections | top-priority command decision gate szoveg runtime policyval egyezo | P1 | required-now | AC2, T5 |
| CS8 | `src/core/runtime/tmuxDelivery.ts` | reviewer handoff action text helper | `buildDeliveryMessage(...) -> string` | reviewer PASS delivery action branch | handoff prompt ugyanazt a `pass` vs `converged` gate-et kozli | P1 | required-now | AC2, T5 |
| CS9 | `src/cli/commands/agent/pass.ts`, `src/cli/commands/agent/converged.ts` | help/error alignment | `getPassHelpText() -> string`, `getConvergedHelpText() -> string` | CLI help text | post-gate command choice explicit es konzisztens mindket oldalon | P2 | required-now | AC2, T6 |
| CS10 | `src/core/bubble/createBubble.ts` | config threading | `createBubble(...) -> Promise<BubbleCreateResult>` | bubble config write path | `severity_gate_round` persist bubble config artifactba | P1 | required-now | AC1, T7 |
| CS11 | docs + tests | docs/tests sync | `N/A` | listed test/docs files | default `4` consistency + reject observability | P2 | required-now | AC11, T8, T18 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble config schema | nincs `severity_gate_round` | van `severity_gate_round` | integer `>=4` (if present) | omitted -> default `4` | additive, backward-compatible default | P1 | required-now |
| Convergence policy input | nincs gate round | `ConvergencePolicyInput.severity_gate_round` | `currentRound`, `reviewer`, `implementer`, `reviewArtifactType`, `roundRoleHistory`, `transcript`, `severity_gate_round` | `N/A` | internal contract extension | P1 | required-now |
| Convergence precondition | implicit previous reviewer PASS expectation | explicit precondition | previous round reviewer `PASS` envelope required for converged validation | `N/A` | behavior clarification | P1 | required-now |
| Findings gate signal | ad-hoc blocking check | severity-aware aggregate | `p0`, `p1`, `p2`, `p3`, `hasBlocking`, `hasNonBlocking` | summary-derived diagnostics | internal behavior change | P1 | required-now |
| PASS reject reason | generic validation messages | explicit post-gate reject + converged guidance | reason includes `round >= severity_gate_round` + "use `pairflow converged --summary ...`" | optional extra context | behavior tightening | P1 | required-now |
| PASS findings payload fail-mode | invalid payload path implicit | explicit PASS gate fail-safe | invalid findings payload -> explicit reject, no append, no role/round transition, reason `FINDINGS_PAYLOAD_INVALID` | summary diagnostics context | behavior tightening | P1 | required-now |
| Redirected metadata source | summary-only tendency in edge paths | canonical transcript source | previous reviewer `PASS` envelope `payload.findings` (`severity`, `title`, optional `refs[]`) | summary parse as diagnostics fallback only | non-breaking clarification | P2 | required-now |
| Round-1 guardrail precedence | generic safety note | explicit normative binding | round-1 converged guardrail precedence preserved from `pairflow-initial-design` | explanatory reason context | behavior preservation | P2 | required-now |
| Convergence eligibility compatibility | post-gate command routing es baseline eligibility kapcsolat implicit | explicit compatibility statement | baseline convergence eligibility (`two consecutive review passes`, alternation evidence, prior reviewer PASS precondition) valtozatlan | implementation note | behavior preservation | P1 | required-now |

PASS fail-safe ownership (single owner):
1. Owner: `CS5` (`src/core/agent/pass.ts`) - reviewer PASS gate input validation.
2. Scope: invalid PASS findings payload (`findings=[]` explicit `--no-findings` nelkul, vagy malformed finding shape) -> `FINDINGS_PAYLOAD_INVALID` minden roundban.
3. Precedence: post-gate explicit clean intent (`--no-findings`) tovabbra is `REVIEWER_PASS_NO_FINDINGS_POST_GATE`; `FINDINGS_PAYLOAD_INVALID` csak explicit `--no-findings` nelkul aktiv.
4. Contract link: Data table `PASS findings payload fail-mode` + Error/Fallback `FINDINGS_PAYLOAD_INVALID` + `AC19/T16/SL10`.

Ontology deviation note (AC15):
1. `docs/reviewer-severity-ontology.md` finding guidance tartalmazza a `why_this_severity` mezo ajanlasat.
2. A redirected metadata minimum persistence contract Phase 1-ben ettol szukebb (csak `severity`, `title`, optional `refs[]`), es ez tudatos, dokumentalt elteres.
3. A teljes ontology-shape persistence kesobbi hardening scope, nem required-now blokkolo.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript mutation | PASS append csak gate-pass eseten | append rejected post-gate PASS eseten | reject branch side-effect safe legyen | P1 | required-now |
| State mutation | role/round switch csak accepted PASS utan | role/round switch rejected PASS eseten | state invarians megorzendo | P1 | required-now |
| Prompt/help surfaces | command gate clarifying text update | runtime gate-tel ellentmondo pass-biased guidance | startup/resume/handoff/help parity kotelezo | P1 | required-now |
| Docs sync | default/rule wording harmonizacio | docs/runtime drift (`3` vs `4`) | konkret wording calloutok: `severity_gate_round = 4 (default)` es `round >= severity_gate_round` + no `P0/P1` -> `converged` | P2 | required-now |

Constraint: ha nincs explicit engedelyezett side effect, az implementacio pure policy evaluation marad.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `severity_gate_round < 4` configban | bubble config parser | throw | config parse reject | `SEVERITY_GATE_ROUND_INVALID` | error | P1 | required-now |
| reviewer PASS, post-gate, non-blocking-only findings | PASS runtime validation | throw | no append, no state transition, explicit converged next-step | `REVIEWER_PASS_NON_BLOCKING_POST_GATE` | info | P1 | required-now |
| reviewer PASS, post-gate, `--no-findings` | PASS runtime validation | throw | no append, no state transition, explicit converged next-step | `REVIEWER_PASS_NO_FINDINGS_POST_GATE` | info | P1 | required-now |
| previous reviewer PASS envelope hianyzik converged pathon | convergence policy validator | throw | converged reject prior PASS requirementtel | `CONVERGENCE_PREVIOUS_REVIEWER_PASS_MISSING` | info | P1 | required-now |
| reviewer PASS findings payload invalid (`findings=[]` explicit `--no-findings` nelkul, vagy malformed shape) | pass findings parser + pass gate validation | throw | explicit reject `FINDINGS_PAYLOAD_INVALID`; no append/no role-round transition; explicit `--no-findings` post-gate clean branch tovabbra is `REVIEWER_PASS_NO_FINDINGS_POST_GATE` | `FINDINGS_PAYLOAD_INVALID` | warn | P1 | required-now |
| round-1 convergence guardrail trigger | convergence policy | throw | initial-design guardrail precedence fennmarad | `ROUND1_CONVERGENCE_GUARDRAIL` | info | P2 | required-now |
| docs sync pending | docs sync step | fallback | runtime behavior canonical marad, docs delta ugyanebben a valtozasban kovetendo | `DOC_SYNC_PENDING` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing finding priority model (`P0..P3`) + structured findings payload | P1 | required-now |
| must-use | existing convergence policy entrypoint (`validateConvergencePolicy`) as shared gate owner | P1 | required-now |
| must-use | existing prompt injection surfaces (`startBubble`, `tmuxDelivery`, CLI help) | P1 | required-now |
| must-not-use | summary-only regex primary decision source, ha structured findings elerhetok | P1 | required-now |
| must-not-use | uj CLI flag bevezetese Phase 1-ben ehhez a gate-hez | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Config default + validation | config with/without `severity_gate_round` | parse + serialize + parse | default `4`; explicit `<4` reject `SEVERITY_GATE_ROUND_INVALID`; roundtrip stable | P1 | required-now | tests/config/bubbleConfig.test.ts |
| T2 | Policy helper aggregate + fallback diagnostics | post-gate reviewer context: structured findings (`P3`-only), plus negativ fixture structured payload nelkul/hibasan, summary jelen | convergence policy evaluated | explicit aggregate (`p0..p3`, `hasBlocking`, `hasNonBlocking`); structured payload primary; summary parse diagnostics fallback only | P1 | required-now | tests/core/convergence/policy.test.ts |
| T3 | PASS reject post-gate (P2/P3 only) | reviewer active, `round >= severity_gate_round`, only `P2/P3` findings | `pairflow pass` | command fails (`REVIEWER_PASS_NON_BLOCKING_POST_GATE`); transcript unchanged; round/role unchanged; explicit converged next-step | P1 | required-now | tests/core/agent/pass.test.ts |
| T4 | PASS allow post-gate with blocker | reviewer active, `round >= severity_gate_round`, includes `P0/P1` | `pairflow pass` | accepted; normal handoff behavior | P1 | required-now | tests/core/agent/pass.test.ts |
| T5 | Prompt decision-gate parity | startup/resume/handoff reviewer prompts | prompt build | minden surface ugyanazt a command gate semantics-et hordozza | P1 | required-now | tests/core/bubble/startBubble.test.ts + tests/core/runtime/tmuxDelivery.test.ts |
| T6 | CLI guidance symmetry | pass/converged help texts | render help | post-gate command expectation konzisztens | P2 | required-now | tests/cli/passCommand.test.ts + tests/cli/convergedCommand.test.ts |
| T7 | Config threading to bubble artifact | create bubble explicit gate rounddal | persisted bubble config read | `severity_gate_round` persisted es runtime altal hasznalt | P1 | required-now | tests/core/bubble/createBubble.test.ts |
| T8 | Docs default consistency + wording callout | docs update included | inspect docs refs | explicit wording egyezik: `severity_gate_round = 4 (default)` es post-gate phrase (`round >= severity_gate_round` + no `P0/P1` -> `converged`) | P2 | required-now | docs diff review |
| T9 | Converged shared gate-input + canonical redirected metadata source | reviewer converged intent post-gate non-blocker contextban, elozo reviewer PASS structured findingsgel | `pairflow converged` policy path invoked | converged path ugyanazt a `severity_gate_round` inputot kapja, metadata source az elozo reviewer PASS `payload.findings` (transcript) | P1 | required-now | tests/core/agent/converged.test.ts |
| T10 | Pre-gate PASS compatibility | reviewer active, `round < severity_gate_round`, non-blocking findings | `pairflow pass` | PASS elfogadott; transcript append + normal role/round transition | P1 | required-now | tests/core/agent/pass.test.ts |
| T11 | Dedicated `--no-findings` post-gate reject | reviewer active, `round >= severity_gate_round`, `--no-findings` | `pairflow pass --no-findings` | command fails (`REVIEWER_PASS_NO_FINDINGS_POST_GATE`); transcript/role/round invariant marad; explicit converged kovetkezo lepes | P1 | required-now | tests/core/agent/pass.test.ts |
| T12 | Mixed severity post-gate PASS allow | reviewer active, `round >= severity_gate_round`, findings include blocker + non-blocker (`P0` + `P3`) | `pairflow pass` | PASS elfogadott; blocker jelenlet dominal | P1 | required-now | tests/core/agent/pass.test.ts |
| T13 | Converged reject without previous reviewer PASS | reviewer converged futna, de prior reviewer PASS envelope hianyzik | convergence policy evaluated | explicit reject `CONVERGENCE_PREVIOUS_REVIEWER_PASS_MISSING` reasonnel | P1 | required-now | tests/core/agent/converged.test.ts |
| T14 | Shared `severity_gate_round` contract pass+converged oldalon | reviewer pass es converged path azonos bubble configgal | mindket command policy-input assembly lefut | audit proof: mindket path ugyanazzal a numerikus `severity_gate_round` ertekkel hivja a policy evaluator inputot (`pass.ts` + `converged.ts`) | P1 | required-now | tests/core/agent/pass.test.ts + tests/core/agent/converged.test.ts |
| T15 | Round-1 convergence guardrail precedence | reviewer converged intent round-1 helyzetben | convergence policy evaluated | explicit `ROUND1_CONVERGENCE_GUARDRAIL` reject, initial-design precedence megtartva | P2 | required-now | tests/core/agent/converged.test.ts + tests/core/convergence/policy.test.ts |
| T16 | `FINDINGS_PAYLOAD_INVALID` PASS fail-safe path | reviewer PASS gate invalid structured findings payloaddal | `pairflow pass` | explicit `FINDINGS_PAYLOAD_INVALID`; transcript/role/round invariansok valtozatlanok | P1 | required-now | tests/core/agent/pass.test.ts |
| T17 | Initial-design convergence eligibility compatibility (two-pass branch) | post-gate non-blocker context, de baseline eligibilitybol a two-consecutive-review-pass feltetel nem teljesul | `pairflow converged` policy path invoked | converged tovabbra is rejectelt baseline eligibility hiany miatt; post-gate gate nem bypassolja ezt a feltetelt | P1 | required-now | tests/core/agent/converged.test.ts + tests/core/convergence/policy.test.ts |
| T18 | DOC_SYNC_PENDING tracking path | docs wording callout eltérés ideiglenesen fennall | docs sync review fut | `DOC_SYNC_PENDING` tracking warning explicit, majd docs wording sync utan torolheto | P2 | required-now | docs diff review |
| T19 | P1-only post-gate PASS allow | reviewer active, `round >= severity_gate_round`, finding set csak `P1` | `pairflow pass` | PASS elfogadott; blocker-only kompozicio expliciten engedelyezett | P2 | required-now | tests/core/agent/pass.test.ts |
| T20 | Round 2-3 deadlock prevention by valid config floor | valid config range (`severity_gate_round >= 4`) + initial-design round 2-3 P2 convergence gate context | decision policy assessed | post-gate PASS reject gate round 2-3-ban nem aktiv, ezert nincs `no-valid-command` deadlock path | P1 | required-now | tests/core/convergence/policy.test.ts + docs diff review |
| T21 | Initial-design convergence eligibility compatibility (alternation branch) | post-gate non-blocker context, de alternation evidence hianyzik (`round_role_history`) | `pairflow converged` policy path invoked | converged rejectelt marad alternation baseline hiany miatt; post-gate gate nem bypassolja ezt a feltetelt | P2 | required-now | tests/core/agent/converged.test.ts + tests/core/convergence/policy.test.ts |

## Acceptance Criteria (Binary, Testable)

1. `AC1`: `severity_gate_round` schema + default (`4`) + bubble artifact persistency egyutt teljesul.
2. `AC2`: startup/resume/handoff prompt + CLI help ugyanazt a command-gate szabalyt kozli.
3. `AC3`: `round >= severity_gate_round` + csak `P2/P3` finding eseten reviewer `pairflow pass` elutasitott.
4. `AC4`: `round >= severity_gate_round` + `--no-findings` eseten reviewer `pairflow pass` elutasitott es converged next-step iranyt ad.
5. `AC5`: `round < severity_gate_round` alatt PASS viselkedes valtozatlan (backward-compatible).
6. `AC6`: post-gate blocker (`P0/P1`) finding eseten reviewer PASS tovabbra is engedelyezett.
7. `AC7`: convergence policy helper explicit `P0/P1/P2/P3` aggregate + `hasBlocking` + `hasNonBlocking` jelzest ad.
8. `AC8`: elutasitott reviewer PASS nem appendeli a transcriptet.
9. `AC9`: elutasitott reviewer PASS nem valt role/round allapotot, es explicit reasonnel auditalhato.
10. `AC10`: structured finding payload elsodleges; summary parsing csak fallback diagnosztika.
11. `AC11`: docs terminology/default osszhangban van a canonical default `4` szaballyal.
12. `AC12`: `P3`-only finding composition explicit non-blocking utvonalon kezelt.
13. `AC13`: config parser `<4` gate roundot elutasit; parse/serialize roundtrip stabil.
14. `AC14`: `pass.ts` es `converged.ts` ugyanazt a `severity_gate_round` policy input contractot hasznalja.
15. `AC15`: redirected non-blocking finding metadata canonical source-a az elozo reviewer `PASS` envelope `payload.findings` (`transcript.ndjson`), minimum shape: `severity`, `title`, optional `refs[]`; az ontology `why_this_severity` mezo ajanlasatol valo szukites explicit dokumentalt deviation.
16. `AC16`: post-gate mixed severity finding set (blocker + non-blocker) eseten blocker dominal, reviewer PASS engedelyezett.
17. `AC17`: `pairflow converged` csak akkor engedelyezett, ha elozo round reviewer PASS envelope jelen van; hiany eseten explicit reject.
18. `AC18`: round-1 converged guardrail precedence explicit megorzott es normativan a `docs/pairflow-initial-design.md`-hez kotott.
19. `AC19`: invalid structured findings payload PASS gate pathon (beleertve explicit `--no-findings` nelkuli `findings=[]` edge-case-et) explicit `FINDINGS_PAYLOAD_INVALID` rejectet ad, transcript/role/round side effect nelkul.
20. `AC20`: post-gate command routing nem bypassolja az initial-design convergence eligibility baseline-t (pl. two consecutive review passes + alternation evidence); eligibility hianyaban `converged` tovabbra is rejectelt.
21. `AC21`: valid konfiguracios tartomanyban (`severity_gate_round >= 4`) round 2-3 alatt a post-gate PASS reject szabaly nem aktiv, ezert nincs initial-design P2 gate-tel kombinacios deadlock path.

### AC -> Test -> Spec Lock Traceability

| AC | Tests | Spec Lock |
|---|---|---|
| AC1 | T1, T7 | SL1 |
| AC2 | T5, T6 | SL2 |
| AC3 | T3 | SL3 |
| AC4 | T11 | SL3 |
| AC5 | T10 | SL4 |
| AC6 | T4, T12, T19 | SL3 |
| AC7 | T2 | SL5 |
| AC8 | T3, T11 | SL6 |
| AC9 | T3, T11 | SL6 |
| AC10 | T2 | SL5 |
| AC11 | T8, T18 | SL7 |
| AC12 | T2 | SL5 |
| AC13 | T1 | SL1 |
| AC14 | T9, T14 | SL8 |
| AC15 | T9 | SL8 |
| AC16 | T12 | SL3 |
| AC17 | T13 | SL8 |
| AC18 | T15 | SL9 |
| AC19 | T16 | SL10 |
| AC20 | T17, T21 | SL11 |
| AC21 | T20 | SL12 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Structured converged-notes artifact schema for redirected `P2/P3` findings.
2. [later-hardening] Metrics hook: count `post-gate pass rejected` events per bubble.
3. [later-hardening] UI badge: `converged-required gate active` reviewer indikacio.

## Assumptions

1. A task referenciaterv: `plans/archive/pairflow-initial-plan.md`.
2. A gate reviewer-origin PASS-re vonatkozik; implementer PASS semantics valtozatlan.
3. Phase 1-ben a minimal redirected metadata contract (`severity`, `title`, optional `refs[]`) elegendo.

## Open Questions

No open non-blocking questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Dedicated non-blocking convergence notes artifact schema | L2 | P2 | later-hardening | AC15 follow-up | Kulon task nyitasa Phase 1 utan |
| H2 | Gate rejection telemetry/report integration | L2 | P2 | later-hardening | metrics evolution | Event fields + report row bovitese |
| H3 | Reviewer gate indicator a UI-ban | L2 | P3 | later-hardening | operator UX | Additive status badge task nyitasa |

## Review Control

1. Post-gate reviewer command dontes determinisztikus: blocker -> `pass`, non-blocking/clean -> `converged`.
2. Minden gate dontes explicit reason code-dal legyen auditalhato.
3. Structured finding payload elsodleges; summary parsing legfeljebb diagnostics fallback.
4. Round-1 guardrail precedence explicit marad.
5. `contract_boundary_override=yes` miatt `plan_ref` kotelezo, es L1 config/policy contract sorok nem hagyhatoak uresen.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha az alabbi lock feltetelek mind teljesulnek:

1. `SL1`: `severity_gate_round` schema/default/validation + TOML roundtrip stabil (`>=4`, default `4`).
2. `SL2`: startup/resume/handoff prompt + CLI help ugyanazt a canonical command gate-et kozli.
3. `SL3`: post-gate reviewer PASS dontes deterministic (`P0/P1` allow, non-blocking-only es `--no-findings` reject).
4. `SL4`: pre-gate (`round < severity_gate_round`) PASS kompatibilitas valtozatlan.
5. `SL5`: policy helper explicit `P0..P3` aggregate + structured-first/fallback-diagnostics parsing.
6. `SL6`: rejected reviewer PASS invariansok teljesulnek (no transcript append, no role/round transition, explicit reason code).
7. `SL7`: docs default/rule wording drift megszunik (canonical default `4`).
8. `SL8`: `pass.ts` es `converged.ts` kozos gate-input contractot hasznal, converged redirected metadata canonical source-a elozo reviewer PASS `payload.findings`, es AC17 szerint previous reviewer PASS hianyaban explicit reject kotelezo.
9. `SL9`: round-1 converged guardrail precedence explicit normativ kotese (`docs/pairflow-initial-design.md`) es teszt-fedezete teljesul.
10. `SL10`: PASS gate invalid findings payload fail-safe explicit (`FINDINGS_PAYLOAD_INVALID`) es no-side-effect invarianssal lefedett.
11. `SL11`: post-gate command routing es initial-design convergence eligibility kapcsolat explicit: gate nem bypassolja a baseline eligibility kriteriumokat, eligibility hianyaban converged reject marad.
12. `SL12`: valid config floor (`severity_gate_round >= 4`) miatt round 2-3-ban a post-gate PASS reject szabaly nem aktiv, igy nincs no-valid-command deadlock path az initial-design P2 convergence gate mellett.
