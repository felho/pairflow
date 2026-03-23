---
artifact_type: task
artifact_id: task_reviewer_prompt_command_gate_clarification_phase1_v2
title: "Reviewer Prompt Command-Gate Clarification (Docs-Only, Phase 1)"
status: implementable
phase: phase1
target_files:
  - plans/tasks/reviewer-prompt-command-gate-clarification.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/reviewer-severity-ontology.md
owners:
  - "felho"
---

# Task: Reviewer Prompt Command-Gate Clarification (Docs-Only)

## L0 - Policy

### Goal

Rogzitsen egy egyertelmu, deterministic reviewer command decision gate-et, amely megszunteti azt a prompt-level felreertest, hogy non-blocker-only vagy clean helyzetben is ujabb `pairflow pass` kor induljon `pairflow converged` helyett.

### Background (Captured Symptom)

1. Ismetlodott olyan kor, ahol a reviewer output `findings=[]` vagy csak non-blocker (`P2/P3`) maradt, de ujabb `pairflow pass` ment `pairflow converged` helyett.
2. A forras promptokban egyszerre szerepelt PASS-centrikus wording es tobb, reszben ellentmondo command-dontesi mondat.
3. A jelen task celja ennek a dokumentacios szintu feloldasa explicit command gate szerzodessel.

### In Scope

1. A ket ismert reviewer prompt varians (startup + transition/handoff) kozos command-gate szerzodesenek explicit, audit-kesz dokumentalasa.
2. Top-priority `Command Decision Gate` blokk definialasa pontos pass vs converged feltetelekkel.
3. PASS-centrikus terminologia semlegesitese output-contract szinten.
4. Ambiguitasok formalis feloldasa (pl. `If findings remain` vs `Only P2/P3`) explicit szaballyal.
5. Machine-checkable required/forbidden token keszlet rogzitese.
6. Follow-up implementacios task acceptance kriteriumainak tisztazasa docs-szinten.

### Out of Scope

1. Barmilyen `src/**` vagy `tests/**` implementacios valtoztatas.
2. Runtime command vegrehajto vagy state/protocol logika modositasa.
3. Severity ontology teljes policy-ujratervezese.
4. Uj feature flag, uj CLI parameter vagy transcript migration.

### Safety Defaults

1. Konfliktus eseten a `Command Decision Gate (Highest Priority)` blokk felulir minden alacsonyabb prioritasu prompt-szoveget.
2. `P0/P1` blocker allitas csak evidence-backed lehet; ha ez nem bizonyithato, default downgrade `P2`.
3. Never use `pairflow pass --no-findings`.
4. `findings=[]` mellett `PASS` kuldese tiltott.
5. Ez a task docs-only, viselkedesvaltozas csak kulon implementacios taskban tortenhet.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: reviewer prompt policy contract (docs).
3. Nem erintett boundary: DB/API/event/auth/config/runtime contracts.

### Ontology Scope Note

1. A `docs/reviewer-severity-ontology.md` ebben a taskban csak blocker-evidence kvalifikacio forraskent hasznalt.
2. Ez a task nem modositja a severity ontology canonical tartalmat; csak command-gate dontesi ambiguitast szuntet meg.

### Policy Source-of-Truth Precedence

1. Ebben a taskban a pass vs converged command-dontes egyetlen source-of-truth-ja a `### 7) Command Decision Gate`.
2. A `docs/reviewer-severity-ontology.md` hivatkozas ebben a taskban csak blocker-evidence kvalifikaciora es severity-stabilitasra ervenyes.
3. Ha ontology Decision Mapping szoveg es a canonical gate kozott elteres van (pl. legacy `policy rollout dependent`), a canonical gate az iranyado.
4. Teljes ontology harmonizacio kulon follow-up docs hardening scope, nem gate blocker ennel a tasknal.

### Runtime Compatibility Note (Follow-up Implementation)

1. A follow-up implementacio celkornyezete: reviewer round policy, ahol a canonical gate szerint non-blocker-only/clean esetben `converged` a celkimenet.
2. Ha a futo runtime guardrail ettol eltero atmenetet kenyszerit (pl. ideiglenes loop-guard), a runtime biztonsagi guardrail nem torheto meg.
3. Eltero runtime viselkedes eseten kotelezo a drift explicit jelzese reason code-dal (`RUNTIME_GUARDRAIL_PRECEDENCE`) es kulon alignment follow-up.
4. Determinisztikus carve-out: ha a canonical target `converged` (no blocker findings), de a runtime guardrail ezt elutasitja, reviewer runtime-precedence fallback commandot hasznalhat ugyanabban a korben, kotelezo `RUNTIME_GUARDRAIL_PRECEDENCE` reason code mellett.
5. Ez ideiglenes runtime-exception path, nem canonical target policy valtozas.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Section/Entry | Doc Contract Signature (input -> output) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | `Command Decision Gate (Highest Priority)` blokk | `(legacy_prompt_signals) -> canonical_command_decision_contract` | L1 command-gate szekcio | Determinisztikus `pass` vs `converged` dontesi feltetelek explicit | P1 | required-now | AC1, T1 |
| CS2 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | Ambiguity-to-Canonical mapping | `(legacy_prompt_phrases) -> neutral_output_contract_phrases` | Mapping + rationale blokk | PASS-bias kifejezesek lecserelve command-semleges wordingre | P1 | required-now | AC2, AC5, T3, T4 |
| CS3 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | startup vs transition parity matrix | `(prompt_variant_A, prompt_variant_B) -> parity_assertions` | Prompt Variant Parity Matrix | Mindket varians ugyanazt a gate-dontest hordozza | P1 | required-now | AC3, T2 |
| CS4 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | implementation follow-up contract | `(docs_contract) -> implementation_acceptance_inputs` | Acceptance + Spec Lock | Nincs scope bovites; implementacios task determinisztikusan atveheto | P1 | required-now | AC4, T4, T5 |
| CS5 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | policy precedence + runtime compatibility note | `(policy_inputs) -> deterministic_decision_precedence` | L0 policy szekcio | Canonical gate vs ontology szerepek explicit elvalasztasa, runtime eltetes kezelesi szaballyal | P1 | required-now | AC6, AC8, T6, T8 |
| CS6 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | `must-fix` marker contract | `(finding_payload) -> blocker_override_decision` | L1 gate contract extension | `must_fix` source/shape/precedence explicit, deterministic blocker override szaballyal | P1 | required-now | AC7, T7 |
| CS7 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | transcript consistency note | `(round6_review, round7_review) -> auditable_delta_note` | L1 parity kornyezet note | Round6 clean vs round7 new notes kulonbsege audit-keszen magyarazva | P2 | required-now | AC8, T9 |
| CS8 | `plans/tasks/reviewer-prompt-command-gate-clarification.md` | `Runtime Guardrail Exception Carve-Out (Deterministic)` | `(canonical_target, runtime_guardrail_result) -> runtime_exception_decision` | `### 7b` runtime carve-out szekcio | Edge-caseben determinisztikus fallback es kotelezo reason code mellett, canonical target policy valtozas nelkul | P1 | required-now | AC5, AC9, T10 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer command decision gate | tobb, reszben ellentmondo szabaly | egyetlen top-priority gate | `blocker_present`, `non_blocker_only_or_clean`, `pass_forbidden_no_findings`, `pass_forbidden_empty_findings` | `must_fix_marker` | docs-only additive | P1 | required-now |
| Output contract terminology | `final reviewer PASS package` bias | command-semleges output contract | `Scout Coverage`, `Deduplicated Findings`, `Issue-Class Expansions`, `Residual Risk / Notes` | explanatory note | docs-only wording fix | P1 | required-now |
| Prompt variant consistency | startup es transition implicit parity | explicit parity matrix | `same_gate_logic`, `same_forbidden_rules`, `same_scope_boundary` | trace note | docs-only additive | P1 | required-now |
| Policy certainty marker | `policy rollout dependent` homalyos formula | explicit runtime-safe policy sentence | `remove_rollout_dependent_formula` | rationale note | docs-only wording fix | P1 | required-now |
| Decision-policy precedence | canonical gate es ontology hivatkozas kozotti potencialis drift | explicit source-of-truth precedence | `command_gate_source_of_truth`, `ontology_evidence_only_scope`, `conflict_resolution_rule` | harmonization follow-up note | docs-only additive | P1 | required-now |
| `must-fix` marker contract | prose-level implicit marker | strukturalt finding-level contract | `source`, `required_shape`, `precedence`, `invalid_marker_behavior` | marker_reason | docs-only additive | P1 | required-now |
| Runtime compatibility note | implementacios target-kornyezet implicit | explicit guardrail-kompatibilitas note | `target_policy_context`, `guardrail_mismatch_behavior`, `reason_code` | alignment note | docs-only additive | P2 | required-now |
| Runtime exception carve-out | absolute tiltasi szoveg vs runtime guardrail precedence potencialis ellentmondas | explicit deterministic edge-case szabaly | `edge_trigger`, `allowed_runtime_fallback`, `mandatory_reason_code`, `temporary_exception_marker` | exit_condition note | docs-only additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Task documentation | policy szoveg strukturalt atiras L0/L1/L2 formatra | kod, teszt, runtime viselkedes modositas | docs-only bubble, egyetlen cel fajl | P1 | required-now |
| Prompt contract wording | command-gate es terminology pontositas | blocker policy kiterjesztes scope-on tul | policy drift stop docs-szinten | P1 | required-now |

Constraint: nincs engedelyezett runtime side effect, ezert output tisztan dokumentacios.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Prompt utasitasok kozott ellentmondas marad | task szoveg | fallback | `Command Decision Gate (Highest Priority)` az iranyado | COMMAND_GATE_PRIORITY_OVERRIDE | warn | P1 | required-now |
| Blocker minosites evidence nelkul | severity ontology baseline | fallback | downgrade `P2`, non-blocker pathway | BLOCKER_EVIDENCE_MISSING | warn | P1 | required-now |
| Startup es transition gate nem paritasos | captured prompt variants | fallback | `Prompt Variant Parity Matrix` `Target Contract Verdict` mezoben `TODO_BLOCKER:VARIANT_PARITY_BROKEN` | VARIANT_PARITY_BROKEN | error | P1 | required-now |
| Scope expansion jele (`src/**`,`tests/**`) | docs-only policy | throw | task refinement megszakitasa, kulon implementacios task szukseges | DOCS_SCOPE_VIOLATION | error | P1 | required-now |

### 4a) `TODO_BLOCKER` Marker Format

1. `TODO_BLOCKER` jeloles csak strukturalt forman megengedett: `TODO_BLOCKER:<REASON_CODE>`.
2. A marker megjelenesi helye ebben a taskban: `### 10) Prompt Variant Parity Matrix` `Target Contract Verdict` oszlop.
3. Minimum payload: rovid ok mondat a parity-hianyrol es legalabb egy hianyzo source reference azonosito.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | ket captured prompt varians kozos decision blokkjai (Decision Mapping, Final Consolidation, output contract, command execution instruction) | P1 | required-now |
| must-use | `docs/reviewer-severity-ontology.md` runtime reminder policy (`P0/P1` evidence gate) | P1 | required-now |
| must-not-use | `policy rollout dependent` runtime dontesi formula | P1 | required-now |
| must-not-use | PASS-default nyelv, ha a dontesi allapot non-blocker-only vagy clean | P1 | required-now |
| must-not-use | product/runtime implementacio ebben a docs-only taskban | P1 | required-now |
| must-use | canonical gate precedence: command dontesben canonical gate nyer, ontology csak evidence kvalifikacio | P1 | required-now |
| must-use | `must_fix` marker csak strukturalt finding payloadbol fogadhato el (`finding.must_fix=true`) | P1 | required-now |

### 6) Test Matrix (Docs Review Checks)

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Deterministic command-gate jelenlet | task draft | command-gate blokk review | mind a 4 required token `normalized_match` szerint teljesul, forbidden tokenek nem szerepelnek | P1 | required-now | doc checklist |
| T2 | Startup/transition parity | captured Prompt A + Prompt B | parity matrix review | decision logika egyezik, nincs variant drift | P1 | required-now | doc checklist |
| T3 | PASS-bias semlegesites | task draft | terminology review | output contract command-semleges, nincs `final reviewer PASS package` kovetelmeny | P1 | required-now | doc diff |
| T4 | Homalyos rollout formula eltavolitas | task draft | policy review | `policy rollout dependent` nem marad runtime dontesi szabalyknt | P1 | required-now | doc diff |
| T5 | Scope boundary non-regression | task draft | boundary review | explicit docs-only, implementacio Out of Scope | P1 | required-now | doc checklist |
| T6 | Policy source-of-truth precedence explicit | task draft | precedence review | canonical gate mint command source-of-truth explicit; ontology only evidence-kvalifikacio explicit; konfliktusfeloldas rogzitett | P1 | required-now | doc checklist |
| T7 | `must-fix` marker determinisztikus contract | task draft | marker contract review | source, shape, precedence, invalid marker behavior explicit | P1 | required-now | doc checklist |
| T8 | Runtime compatibility note explicit | task draft | compatibility review | target policy context + guardrail mismatch behavior + reason code explicit | P2 | required-now | doc checklist |
| T9 | Transcript consistency note | round6 es round7 transcript osszegzes | consistency review | kulonbseg oka audit-keszen leirva (uj evidence/scout drift, nem belso policy ellentmondas) | P2 | required-now | transcript note |
| T10 | Runtime guardrail edge-case deterministic behavior | no blocker findings, canonical target `converged`, runtime guardrail rejects converged | edge-case rule review | reviewer runtime-precedence fallback commandot hasznalhat, kotelezo `RUNTIME_GUARDRAIL_PRECEDENCE` reason code-dal; explicit, hogy ez ideiglenes runtime-exception path | P1 | required-now | doc checklist |

### 7) Command Decision Gate (Highest Priority, Canonical Text)

Az alabbi szoveg a canonical gate, startup es transition variansra egyarant:

1. If any blocker finding remains (`P0/P1` with evidence, or explicitly `must-fix`), run `pairflow pass --summary ... --finding ...`.
2. If no blocker findings remain (only `P2/P3` notes or clean), run `pairflow converged --summary ...`.
3. Never use `pairflow pass --no-findings`.
4. Do not send `PASS` with `findings=[]`.

### 7b) Runtime Guardrail Exception Carve-Out (Deterministic)

1. Trigger: `### 7) Command Decision Gate` szerint a canonical target `converged` (no blocker findings).
2. Guardrail condition: runtime validator elutasitja a `converged` parancsot.
3. Allowed fallback: reviewer runtime-precedence fallback commandot hasznalhat (beleertve `pairflow pass --no-findings`), csak erre az edge-case korre.
4. Mandatory annotation: kotelezo reason code `RUNTIME_GUARDRAIL_PRECEDENCE`.
5. Policy relation: ez ideiglenes runtime-exception path; a canonical target policy valtozatlanul `converged` marad a clean/non-blocker esetre.
6. Exit rule: ha a runtime guardrail mar nem tiltja a `converged` utat, vissza kell terni a canonical gate normal kimenetere.

### 7a) `must-fix` Marker Contract

1. Source: reviewer finding payload (`findings[]`) strukturalt mezoje.
2. Required shape: `finding.must_fix=true` es nem ures `finding.must_fix_reason` string.
3. Precedence: evidence-backed `P0/P1` automatikus blocker; valid `must_fix=true` marker blocker-intent override-kent kezelt command gate szinten.
4. Valid marker nelkul (pl. csak prose summaryban emlitett `must-fix`) nincs blocker override hatas.
5. `must_fix` marker nem irja felul a severity-evidence szabalyokat; ha `P0/P1` evidence hianyzik, severity downgrade tovabbra is ervenyes, de command gate szinten a valid marker PASS fix cycle iranyt tarthat.

### 8) Machine-Checkable Token Contract (`normalized_match`)

| Token | Match String | Match Mode | Type | Scope |
|---|---|---|---|---|
| `REQ_A` | If any blocker finding remains (P0/P1 with evidence, or explicitly must-fix), run `pairflow pass --summary ... --finding ...`. | `normalized_match` | required | canonical |
| `REQ_B` | If no blocker findings remain (only P2/P3 notes or clean), run `pairflow converged --summary ...`. | `normalized_match` | required | canonical |
| `REQ_C` | Never use `pairflow pass --no-findings`. | `normalized_match` | required | canonical |
| `REQ_D` | Do not send `PASS` with `findings=[]`. | `normalized_match` | required | canonical |
| `FORBID_A` | If findings remain, run pairflow pass | `normalized_match` | forbidden | canonical |
| `FORBID_B` | policy rollout dependent | `normalized_match` | forbidden | canonical |
| `FORBID_C` | Required reviewer PASS output contract | `normalized_match` | forbidden | canonical |
| `FORBID_D` | emit one final reviewer PASS package | `normalized_match` | forbidden | canonical |

### 8a) `normalized_match` Rules (Deterministic)

1. Trim leading/trailing whitespace.
2. Collapse internal repeated whitespace (space/tab/newline runs) to a single space.
3. Remove Markdown inline-code delimiters (backticks) before comparison.
4. Keep punctuation and token order unchanged (no word reorder, no punctuation drop).
5. A `normalized_match` akkor igaz, ha a normalizalt canonical mondat tartalmazza a normalizalt token `Match String`-et.
6. `REQ_C` canonical target-policy tiltas, amelyet runtime edge-case-ben csak a `### 7b) Runtime Guardrail Exception Carve-Out` szabaly korlatozottan felulirhat.

### 9) Ambiguity-to-Canonical Mapping

| Legacy Phrase (Observed) | Risk | Canonical Replacement | Token |
|---|---|---|---|
| `Only P2/P3: reviewer should prefer convergence with notes (policy rollout dependent).` | runtime ambiguity | `If no blocker findings remain (only P2/P3 notes or clean), run pairflow converged --summary ... .` | `REQ_B`, `FORBID_B` |
| `If findings remain, run pairflow pass ...` | non-blocker pass loop | `If any blocker finding remains ... run pairflow pass ...` | `REQ_A`, `FORBID_A` |
| `Required reviewer PASS output contract` | PASS-default framing | `Required reviewer output contract (applies to PASS and CONVERGED)` | `FORBID_C` |
| `emit one final reviewer PASS package` | command bias | `emit one final reviewer output package` | `FORBID_D` |

### 9a) Conditional-to-Deterministic Rationale

1. A `prefer convergence ... (policy rollout dependent)` mondat runtime dontesi ponton nem eleg egyertelmu, ezert loop-driftet engedhet.
2. A canonical csere nem policy-bovites: a dontesi tengely valtozatlanul blocker-evidence alapu (`P0/P1` -> pass fix cycle, egyebkent converged).
3. A csere celja kizarlag az, hogy a nem blocker (`P2/P3`) es clean esetekben ne maradjon implicit PASS default.
4. A blocker policy tartalma es a severity ontology definiciok ebben a taskban valtozatlanok maradnak.

### 10) Prompt Variant Parity Matrix

| Variant | Source Snapshot | Source Snapshot Reference (Reproducible) | Snapshot Observed State (current) | Required Gate Tokens (target) | Forbidden Tokens (target) | Target Contract Verdict |
|---|---|---|---|---|---|---|
| Prompt A (Transition Message Variant) | implementer -> reviewer handoff snapshot | `snapshot_id=msg_20260303_016`; `git_blob=f5e7cd0cbb6c4eed2bf2444c40d64007de8e3e2f`; `blob_line_hint=24` | `captured_legacy_snapshot` (input evidence, not pass/fail verdict) | `REQ_A`,`REQ_B`,`REQ_C`,`REQ_D` | `FORBID_A`,`FORBID_B`,`FORBID_C`,`FORBID_D` | must-pass |
| Prompt B (Reviewer Startup Variant) | reviewer startup snapshot | `snapshot_id=msg_20260303_016`; `git_blob=f5e7cd0cbb6c4eed2bf2444c40d64007de8e3e2f`; `blob_line_hint=38` | `captured_legacy_snapshot` (input evidence, not pass/fail verdict) | `REQ_A`,`REQ_B`,`REQ_C`,`REQ_D` | `FORBID_A`,`FORBID_B`,`FORBID_C`,`FORBID_D` | must-pass |

### 10a) Source Reproduction Note

1. Prompt snapshot audit visszakereseshez hasznalhato referencia parancs:
   `git show f5e7cd0cbb6c4eed2bf2444c40d64007de8e3e2f | nl -ba | rg -n 'msg_20260303_016|Run a fresh review now'`
2. Ez a hivatkozas kulso reviewer szamara is determinisztikusan jelzi, mely konkret snapshot-forras alapjan keszult a parity allitas.
3. `blob_line_hint=24` az elso talalatot (Prompt A), `blob_line_hint=38` a masodik talalatot (Prompt B) jeloli ugyanebben a blobban.

### 10b) Result Semantics (Current vs Target)

1. `Snapshot Observed State (current)` csak a forras snapshot-jelleget jeloli (`captured_legacy_snapshot`), nem compliance verdict.
2. `Target Contract Verdict` normativ kovetelmeny a finomitott prompt-contractra; itt a cel allapot `must-pass`.
3. Compliance ellenorzes mindig a target oszlop + token contract (`### 8`, `### 8a`) ellen tortenik.

### 10c) Transcript Consistency Note (Round6 vs Round7)

1. Round6 reviewer korben `findings=[]` clean allapot szuletett; round7-ben uj P2/P3 jellegu notes jelent meg uj scout deduplikacio alapjan.
2. Ez a kulonbseg nem canonical gate belso ellentmondas, hanem review drift / uj evidence-kibontas kulonbsege.
3. Approval audit szempontbol ez dokumentalt non-blocker delta; source-of-truth tovabbra is a canonical gate + explicit token contract.

## Acceptance Criteria

1. `AC1`: A task explicit canonical `Command Decision Gate (Highest Priority)` blokkot tartalmaz, deterministic pass vs converged dontessel.
2. `AC2`: A task explicit required/forbidden token contractot tartalmaz `normalized_match` moddal es explicit normalizacios szabalyokkal, audit-kesz mappinggel.
3. `AC3`: Startup es transition variansra explicit parity matrix rogzitett, drift nelkul.
4. `AC4`: A dokumentum egyertelmuen docs-only scope-ban marad, implementacios scope bovites nelkul.
5. `AC5`: A `policy rollout dependent` formula es PASS-default wording kivezetese explicit.
6. `AC6`: Canonical gate vs ontology precedence explicit es ketertelmusegmentes.
7. `AC7`: `must-fix` marker source/shape/precedence explicit es deterministic.
8. `AC8`: Runtime compatibility note explicit implementacios follow-up kontextussal es guardrail mismatch kezelessel.
9. `AC9`: Runtime guardrail edge-case dontes deterministic: canonical target `converged` + runtime reject -> runtime-precedence fallback + kotelezo `RUNTIME_GUARDRAIL_PRECEDENCE`, temporary exception markerrel.

### AC-Test-SpecLock Traceability

| AC | Covered by Tests | Covered by Spec Lock |
|---|---|---|
| AC1 | T1 | SL1 |
| AC2 | T1, T3 | SL1, SL2, SL5 |
| AC3 | T2 | SL3 |
| AC4 | T5 | SL4 |
| AC5 | T3, T4 | SL2, SL5 |
| AC6 | T6 | SL6 |
| AC7 | T7 | SL7 |
| AC8 | T8, T9 | SL8 |
| AC9 | T10 | SL9 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Keszulhet kulon implementation task, amely a canonical gate-et prompt-builder helperen keresztul centralizalja.
2. [later-hardening] Keszulhet golden snapshot tesztcsomag startup/handoff parity drift ellen.

## Assumptions

1. A ket captured prompt varians tartalmilag kozel azonos, ezert egyetlen canonical gate-tel szinkronizalhato.
2. A jelen bubble celja kizarlag a task-spec pontositas, nem runtime enforcement.

## Open Questions

No open non-blocking questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Prompt-level canonical gate string centralizalasa kodban | L2 | P2 | later-hardening | this task | nyitni kulon implementacios taskot |
| H2 | Startup/transition parity automata check | L2 | P2 | later-hardening | this task | nyitni kulon teszt-hardening taskot |
| H3 | Ontology Decision Mapping harmonizacio a canonical gate-tel | L2 | P2 | later-hardening | round7 approval feedback | nyitni kulon docs harmonization taskot, ontology text synckel |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Docs-only refinementben blocker csak akkor indokolt, ha belso ellentmondas vagy scope-szabalysertes bizonyithato.
3. `P2/P3` jellegu tovabbi wording-javaslat default `later-hardening`.
4. Ebben a taskban runtime/product implementacios koveteles nem emelheto `required-now` statuszra.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. `SL1`: canonical command-gate blokk szerepel es `REQ_A..REQ_D` teljesul.
2. `SL2`: `FORBID_A..FORBID_D` tiltott tokenek nem szerepelnek canonical kovetelmenykent.
3. `SL3`: startup + transition parity matrix explicit es ellentmondasmentes.
4. `SL4`: docs-only boundary explicit (`src/**`, `tests/**` implementacio out of scope).
5. `SL5`: ambiguitasok canonical mappinggel audit-keszen feloldva, es a token-egyezes `normalized_match` szerint egyertelmuen definialt.
6. `SL6`: canonical gate decision precedence explicit (source-of-truth: section 7), ontology scope evidence-kvalifikaciora szukitve.
7. `SL7`: `must-fix` marker contract explicit source/shape/precedence definicioval.
8. `SL8`: runtime compatibility note + round6/round7 transcript consistency note audit-keszen rogzitve.
9. `SL9`: runtime guardrail edge-case carve-out explicit, deterministic es canonical policyhoz viszonyitottan ideiglenes exceptionkent rogzitett.
