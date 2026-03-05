---
artifact_type: task
artifact_id: task_pairflow_doc_contract_gates_phase1_v12
title: "Pairflow Doc Contract Gates (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/cli/commands/bubble/create.ts
  - src/core/bubble/createBubble.ts
  - src/core/agent/pass.ts
  - src/core/agent/converged.ts
  - src/core/bubble/statusBubble.ts
  - src/cli/commands/bubble/status.ts
  - src/config/bubbleConfig.ts
  - src/config/defaults.ts
  - src/types/bubble.ts
  - src/types/findings.ts
  - tests/**
prd_ref: null
plan_ref: plans/tasks/doc-only-issues/review-loop-complexity-memo-2026-03-04.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/llm-doc-workflow-v1.md
  - docs/reviewer-severity-ontology.md
owners:
  - "felho"
---

# Task: Pairflow Doc Contract Gates (Phase 1)

## L0 - Policy

### Goal

Vezessunk be Phase 1 szintu dokumentacios contract gate-eket advisory modban, hogy a task-spec minosege determinisztikusan ellenorizheto legyen anelkul, hogy jelenleg hard-stop blokkolna a bubble flow-t.

### In Scope (Phase 1, required-now)

1. Task contract minimum gate:
   - workflow-v1 Required Frontmatter Contract mezok ellenorzese: `artifact_type`, `artifact_id`, `status`, `prd_ref`, `plan_ref`, `system_context_ref`, `phase`.
   - Phase 1 task-spec extension mezok advisory ellenorzese: `title`, `target_files`, `normative_refs`, `owners`.
   - L0/L1 jelenlet ellenorzese.
   - operational definition: `presence` akkor teljesul, ha az adott szinthez tartozik szekciocim (`## L0` / `## L1`) es legalabb 1 nem-ures tartalmi blokk.
   - hiany eseten advisory warning reason code: `DOC_CONTRACT_PARSE_WARNING`; hard-stop tilos Phase 1-ben.
   - producer: CS1/CS2 task contract gate path.
   - scope note: ez Phase 1 minimum-presence gate; nem helyettesiti a workflow-v1 teljesebb task contract elvarasait.
2. Review finding schema gate advisory validacioval:
   - kotelezo mezok: `priority`, `timing`, `layer`, `evidence`.
3. Round gate policy enforcement advisory jelzessel:
   - 2. kor utan uj `required-now` csak evidence-backed `P0/P1` lehet.
4. `pairflow bubble status --json` additiv gate mezok:
   - `failing_gates`, `spec_lock_state`, `round_gate_state`.
5. Celozott tesztek az uj gate branch-ekre (normal + hiba + fallback).

### Required-Now vs Later-Hardening Boundary

1. Phase 1 blocker boundary:
   - csak `P0/P1 + required-now + L1` tekintheto blockernek.
2. `P2/P3` finding default:
   - alapertelmezett kezeles `later-hardening`.
   - kivetel csak expliciten jelolt `required-now` policy/compatibility contractnal engedett, konkret evidenciaval.
3. 2. kor utani szigoritas:
   - uj `required-now` csak akkor engedheto, ha `P0/P1` es finding-level evidence adott.
4. Advisory mode invarians:
   - gate hiba eseten status/diagnosztika frissul, de lifecycle allapotgep nem torik.
5. `timing` enum invarians:
   - formalis ertekek csak `required-now|later-hardening`.
   - a `required-now exception` csak jeloles/rationale tag, nem uj enum ertek.
6. `round > 2` non-blocker szabaly (deterministic):
   - ha finding `priority=P2|P3` es `timing=required-now`, akkor a gate ertekelo determinisztikusan `later-hardening`-ra auto-demotalja,
   - reason code: `ROUND_GATE_AUTODEMOTE`,
   - ez Phase 1-ben nem manualis dontes, hanem kotelezo policy-alkalmazas.
   - reconciliation: az auto-demote kizarolag a `timing` dimenziot modosítja (`required-now -> later-hardening`), a canonical `priority` valtozatlan.
   - kivetel kizárólag blocker-evidence downgrade path (`BLOCKER_EVIDENCE_WARNING`), ahol `effective_priority` jelzi az elterest input finding-mezo mutacio nelkul.
   - idempotencia: ha finding timing mar `later-hardening`, ujraertekeles no-op; ugyanarra a findingre `ROUND_GATE_AUTODEMOTE` warning nem duplikalhato.
7. Spec Lock policy decision (explicit):
   - Phase 1 visszaigazit workflow-v1-re: lock-dontes csak blocker closure alapjan tortenik,
   - azaz `IMPLEMENTABLE` dontesben a non-blocker `required-now` elemek nem kulon lock-kriteriumok.
8. `required-now exception` governance:
   - CS6-CS10 `required-now exception` sorok task-authoring governance kivetelt jelolnek (nem reviewer finding payloadot),
   - ezert rajuk `ROUND_GATE_AUTODEMOTE` nem alkalmazhato; auto-demote kizárólag round>2 reviewer finding gate ertekelesben ervenyes.

### Severity Ontology Alignment (mandatory)

1. A `P0/P1` allitas blocker-grade evidence-hez kotott:
   - repro,
   - failing check/test output,
   - vagy pontos code-path bizonyitas.
2. Ha `P0/P1` allitashoz nincs blocker-grade evidence, azt advisory gate `P2`-szintu hianykent kell jelezni (downgrade semantics).
3. `P0/P1` finding evidence kotelezoen finding-level referenciaval auditálhato; envelope-only evidencia nem eleg blocker minositeshez.
4. `priority` es `severity` ugyanarra a 4-szintu skálara mapelt kompatibilitasi kulcs:
   - pairflow workflow/protocol canonical envelope mezonev: `priority`,
   - reviewer severity ontology canonical naming: `severity`.
   - canonical forrasok nem valtoznak; a gate csak kompatibilitasi normalizaciot vegez.
   - boundary mapping: ingest oldalon `severity -> priority`; output/status oldalon `priority` canonical marad, `severity` mirror csak kompatibilitasi opcionakent engedett.

### Out of Scope (Phase 1)

1. Global hard-fail gate (`required-all`) bevezetese.
2. Teljes UI gate vizualizacio/UX redesign.
3. Uj severity ontology vagy finding taxonomy kialakitasa.
4. Docs-only es code bubble policy teljes ujrairasa.

### Safety Defaults

1. Default gate mode: `advisory`.
2. Parse/serialization hiba eseten fail-open + diagnosztika (`warning`), nincs automatikus hard stop.
3. Backward compatibility: status JSON csak additiv mezokkel bovulhet.
4. Compatibility scope (explicit): `status JSON additive fields + tolerant input alias mapping` (nem global compatibility claim).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/create.ts` | bubble create command path | task input feldolgozas utan, bubble persist elott | task contract advisory check lefut, eredmeny runtime-nak tovabbitva | P1 | required-now | T1, T2 command-path trace |
| CS2 | `src/core/bubble/createBubble.ts` | createBubble runtime | task artifact resolution utan | gate eredmeny bubble metadata/status komponensbe persistalhato | P1 | required-now | T1, T2 runtime-state trace |
| CS3 | `src/core/agent/pass.ts` | reviewer pass feldolgozas | finding parse/validacio utan | schema gate + round gate advisory kiertekeles, reason code-okkal | P1 | required-now | T3, T4, T5, T10, T13, T16, T18 pass-path test |
| CS4 | `src/core/agent/converged.ts` | converged policy path | convergence decision elott | `spec_lock_state` szamitas osszehangolva nyitott blocker finding halmazzal; round gate jelzes shared policy inputbol fogyasztva (nem kulon gate producer) | P1 | required-now | T5, T9, T11, T13 convergence integration test |
| CS5 | `src/core/bubble/statusBubble.ts` | status presenter core | status JSON osszeallitas | uj gate mezok stabil, deterministic shape-ben jelennek meg | P1 | required-now | T1, T6, T7 status contract test |
| CS6 | `src/cli/commands/bubble/status.ts` | status CLI json output | output mappingnal | additiv gate mezok serializalasa regresszio nelkul | P2 | required-now | [required-now exception] T6, T14; rationale: status shape stabilitas rollout elott kotelezo |
| CS7 | `src/config/defaults.ts` | default gate config | default config definicio pontja | gate defaultok (`advisory`, round policy default) expliciten beallitva | P2 | required-now | [required-now exception] T12 config default assertion; rationale: deterministic policy bootstrap szukseges |
| CS8 | `src/config/bubbleConfig.ts` | config parse/validation | bubble config parse path | gate config parse + validation deterministic, fallback explicit | P2 | required-now | [required-now exception] T12 config parse/fallback test; rationale: hibas config ne torje a gate ertekelest |
| CS9 | `src/types/bubble.ts` | bubble status types | status tipusdefinicio | `failing_gates`, `spec_lock_state`, `round_gate_state` tipusszinten formalizalva | P2 | required-now | [required-now exception] T1, T6, T9 type/shape assertion; rationale: status contract drift megelozese |
| CS10 | `src/types/findings.ts` | finding payload types | finding schema tipusdefinicio | canonical belso mezonev `priority`; alias mapping `severity -> priority` parse-time, minimum mezok (`timing`, `layer`, `evidence`) tipusszinten formalizalva | P2 | required-now | [required-now exception] T8 type/schema canonicalization test; rationale: ontology bridge drift megelozese |

Round-gate exception note:
1. CS6-CS10 `required-now exception` sorok governance-kivetel policy-t jelolnek, nem runtime reviewer finding payloadot.
2. `ROUND_GATE_AUTODEMOTE` csak round>2 reviewer finding gate ertekelesre ervenyes; CS6-CS10 sorokra nem.

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| Bubble status JSON | gate mezok reszlegesek | additiv mezok: `failing_gates[]`, `spec_lock_state`, `round_gate_state` | non-breaking additive | P1 | required-now | T1, T6 |
| `failing_gates[]` item contract | implicit/heterogen | minimum: `gate_id`, `reason_code`, `message`, canonical `priority`, `timing`, `layer?: L0\\|L1\\|L2`, `evidence_refs[]?`, `signal_level?: warning\\|info`, `effective_priority?: P0|P1|P2|P3`; ahol `priority` ertek: `P0|P1|P2|P3`; compatibility input alias: `severity -> priority`; `signal_level` kotelezo advisory reason code-oknal (`DOC_CONTRACT_PARSE_WARNING`, `REVIEW_SCHEMA_WARNING`, `BLOCKER_EVIDENCE_WARNING`, `ROUND_GATE_WARNING`, `ROUND_GATE_AUTODEMOTE`, `STATUS_GATE_SERIALIZATION_WARNING`, `GATE_CONFIG_PARSE_WARNING`), egyebkent opcionális; downgrade szabaly: `BLOCKER_EVIDENCE_WARNING` eseten `effective_priority=P2` kotelezoen jelen van, egyebkent opcionális | additive, tolerant parser | P1 | required-now | T1, T4, T7, T8, T10 |
| `spec_lock_state` contract | implicit | minimum: `state: LOCKED\\|IMPLEMENTABLE`, `open_blocker_count: number`, `open_required_now_count: number`; ahol `open_required_now_count := nyitott required-now timingu gate elemek szama a round-gate policy alkalmazasa utan`, diagnosztikai mezokent (nem kulon lock-kriterium); consumer guidance: UI/CLI csak riportalasra hasznalhatja, lifecycle gate dontesre nem | non-breaking additive | P1 | required-now | T1, T9, T11 |
| Spec lock derivacios formula (normative) | reszben L2 note-ban | `spec_lock_state=IMPLEMENTABLE` iff `open_blocker_count == 0`; egyebkent `LOCKED`; ahol `open_blocker_count := nyitott (P0|P1 + required-now + L1)`; `open_required_now_count` csak diagnosztikai riport | non-breaking, workflow-v1 aligned | P1 | required-now | T9, T11 |
| `round_gate_state` contract | implicit | minimum: `applies: boolean`, `violated: boolean`, `round: number`, `reason_code?: string` | non-breaking additive | P1 | required-now | T5 |
| Finding payload minimum | nem teljesen kotott | kotelezo: canonical `priority`, plus compatibility alias input `severity`, `timing`, `layer`, `evidence` | non-breaking advisory validation | P1 | required-now | T3, T8 |
| Finding ontology kiegészito mezok | reszben dokumentalt | strongly-recommended (Phase 1-ben nem kotelezo compatibility okbol): `title`, `refs`, `why_this_severity`, `scope_link`; normative reconciliation: workflow-v1 kotelezo finding contractja csak `priority|timing|layer|evidence`, ez a sor audit-quality extension | advisory, backward-compatible | P2 | required-now | [required-now exception] T15 advisory compatibility test; rationale: audit-quality egységesites + runtime compatibility |
| Blocker evidence semantics | részben implicit | `P0/P1` csak blocker-grade evidence-del ervenyes; enelkul downgrade signal `effective_priority=P2` (input finding field nem mutalodik) | policy alignment, advisory in Phase 1 | P1 | required-now | T4, T10 |
| Task contract input | ad-hoc markdown | machine-readable minimum parse + advisory report | non-breaking | P1 | required-now | T2 |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| Bubble metadata/status | gate allapotok persistalasa | lifecycle state machine semantika modositas | advisory-only viselkedes | P1 | required-now | T1, T5, T9 |
| Diagnostics artifacts | lokalis gate warning/adatpont rogzitese | kulso network/service hivas | local evidence eleg | P2 | required-now | [required-now exception] T2, T3, T4, T5, T7; rationale: diagnosztika traceability Phase 1-ben kotelezo |

### 4) Error and Fallback Contract

| Trigger | Behavior (`throw|result|fallback`) | Reason Code | Log Level | Priority | Timing | Producer (CS) | Evidence |
|---|---|---|---|---|---|---|---|
| Task contract parse hiba | advisory result + continue | `DOC_CONTRACT_PARSE_WARNING` | warn | P1 | required-now | CS1/CS2 | T2 warning assertion |
| Finding schema hiany | advisory result + continue | `REVIEW_SCHEMA_WARNING` | warn | P1 | required-now | CS3 | T3 warning assertion |
| `P0/P1` evidence hiany | advisory gate warning + downgraded blocker signal (`effective_priority=P2`) input mutacio nelkul | `BLOCKER_EVIDENCE_WARNING` | warn | P1 | required-now | CS3 | T4, T10, T18 |
| Gate config parse/validation hiba | advisory continue + deterministic defaultok alkalmazasa (fail-open, no hard-stop) | `GATE_CONFIG_PARSE_WARNING` | warn | P2 | required-now | CS8 | T12 |
| Round gate serules (`round > 2`) | advisory warning statusban | `ROUND_GATE_WARNING` | warn | P1 | required-now | CS3 (producer), CS4 (read-only consumer) | T5 pass-path warning emission assertion |
| Round>2 non-blocker `required-now` finding | determinisztikus auto-demote `later-hardening`-ra + advisory warning | `ROUND_GATE_AUTODEMOTE` | warn | P1 | required-now | CS3 (producer), CS4 (read-only consumer) | T5, T16, T18 |
| Status gate serialization hiba | fallback minimal status + diagnostic note | `STATUS_GATE_SERIALIZATION_WARNING` | warn | P2 | required-now | CS5 (producer), CS6 (serialization surface) | [required-now exception] rationale: status endpoint robust fallback kotelezo; evidence hook: T7 fallback assertion |

### 5) Dependency Constraints

| Type | Items | Priority | Timing | Evidence |
|---|---|---|---|---|
| must-use | jelenlegi policy/config csatornak (`src/config/*`, convergence policy helper-ek), plus canonical ontology refs | P2 | required-now | [required-now exception] T8, T9; rationale: policy drift megelozese |
| must-not-use | uj kulso dependency Phase 1-ben | P2 | required-now | [required-now exception] T19 dependency guard (`package.json` + `pnpm-lock.yaml` diff assertion); rationale: dependency drift explicit tiltasa |

### 6) Round Gate Ownership and Flow

1. Ownership:
   - `src/core/agent/pass.ts` vegzi az elso gate-ertekelest es gate warning kibocsatast.
   - `src/core/agent/converged.ts` ugyanarra a policy-szintu gate inputra tamaszkodik (nem kulon szabalykeszlet).
   - `spec_lock_state` ownership: CS4 az egyetlen producer; CS3 normalized gate inputot ad (`priority`, `timing`, `layer`, `round_gate_state`) es nem publikál eltero `spec_lock_state` erteket.
   - CS4 scope: `converged.ts` csak `spec_lock_state` es shared round-gate eredmeny fogyaszto; onallo `ROUND_GATE_WARNING` producer nem lehet.
   - auto-demote (`ROUND_GATE_AUTODEMOTE`) producer is kizarolag CS3.
2. Normal flow (`round_gate_state.violated = false`):
   - reviewer pass/converged alapviselkedes valtozatlan,
   - nincs uj round-gate warning bejegyzes.
3. Violation flow (`round_gate_state.violated = true`):
   - `ROUND_GATE_WARNING` bekerul `failing_gates` listaba,
   - Phase 1 advisory modban runtime tovabbhalad (nincs hard-stop).

### 7) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Golden advisory flow | valid task contract + valid finding schema | create + pass + status fut | `failing_gates` ures/informational, status mezok stabilak | P1 | required-now | automated test |
| T2 | Invalid task contract | hianyos frontmatter vagy L0/L1 hiany | create/status fut | `DOC_CONTRACT_PARSE_WARNING` keletkezik, flow nem torik | P1 | required-now | automated test |
| T3 | Invalid finding schema | hianyzik `timing` vagy `layer` | reviewer pass fut | `REVIEW_SCHEMA_WARNING` keletkezik, pass feldolgozas nem omlik ossze; warning observable channel: `failing_gates[].reason_code` + warn log | P1 | required-now | automated test |
| T4 | Missing blocker evidence | `P0/P1` finding evidence nelkul | reviewer pass/status fut | `BLOCKER_EVIDENCE_WARNING`, blocker downgrade semantics ervenyesul (`effective_priority=P2`) | P1 | required-now | automated test |
| T5 | Round gate after round 2 (non-blocker required-now exception, P2 path) | `round > 2`, uj `required-now` finding `priority=P2` (nem `P0/P1`) | reviewer pass gate evaluation fut, finding timing deterministicen `later-hardening`-ra auto-demotalodik; converged ugyanazt a persisted round-gate state-et fogyasztja; ismetelt gate evaluation fut | `ROUND_GATE_WARNING` + `ROUND_GATE_AUTODEMOTE` kizárólag pass-path producer altal keletkezik; converged oldalon nincs uj warning producer; `priority` valtozatlan es auto-demote idempotens (nincs duplikalt warning ugyanarra a findingre) | P1 | required-now | automated test |
| T6 | Backward-compatible status shape | legacy status consumer | `pairflow bubble status --json` | additiv mezok mellett regi parse nem torik | P2 | required-now | [required-now exception] compatibility test; rationale: downstream parser break megelozese |
| T7 | Status serialization fallback | gate status serialization exception | status osszeallitas fut | `STATUS_GATE_SERIALIZATION_WARNING`, minimal status output visszaadva | P2 | required-now | [required-now exception] automated fallback test; rationale: CLI status command availability |
| T8 | priority/severity canonicalization | finding payload `severity` mezovel erkezik | schema/type normalization fut | canonical belso mező `priority`; alias mapping `severity -> priority`, output contract determinisztikus | P1 | required-now | automated test |
| T9 | Spec lock workflow-v1 alignment | nyitott non-blocker `required-now` van, de nyitott blocker nincs | spec lock szamitas fut | `state=IMPLEMENTABLE`, `open_required_now_count` csak diagnosztikai | P1 | required-now | automated test |
| T10 | Downgrade semantics no-mutation | input finding `P1` de blocker-grade evidence nelkul | downgrade path fut | input finding mezok nem mutalodnak; gate output `effective_priority=P2` jelzest hordoz | P1 | required-now | automated test |
| T11 | Spec lock LOCKED branch | van legalabb egy nyitott blocker (`P0|P1 + required-now + L1`) | spec lock szamitas fut | `state=LOCKED`, `open_blocker_count > 0`, advisory mode mellett lifecycle tovabbhalad | P1 | required-now | automated test |
| T12 | Gate config defaults + parse fallback | hianyos/hibas gate config input | defaults+parse pipeline fut | deterministic defaultok alkalmazodnak es fallback mellett nincs hard-stop | P2 | required-now | [required-now exception] automated test; rationale: policy bootstrap es robust parse kotelezo |
| T13 | Round gate after round 2 (blocker pass-through + CS4 trace) | `round > 2`, uj `required-now` finding `priority=P1`, finding-level blocker-grade evidence adott | reviewer pass gate evaluation utan converged spec-lock szamitas is fut | nincs `ROUND_GATE_WARNING`/`ROUND_GATE_AUTODEMOTE`/`BLOCKER_EVIDENCE_WARNING`; finding `required-now` marad, blocker-kent szamolodik (`open_blocker_count`), es CS4 ugyanazt a persisted eredmenyt fogyasztja | P1 | required-now | automated test |
| T14 | Status CLI mapping dedicated check (non-circular) | status core fixture (CS5) mar tartalmaz additiv gate mezoket | `src/cli/commands/bubble/status.ts` JSON mapping fut | CLI output valtozatlanul tovabbitja az additiv mezoket, legacy parser snapshot kompatibilitas mellett | P2 | required-now | [required-now exception] automated test; rationale: CS6 mapping regresszio vedese |
| T15 | Strongly-recommended fields advisory reconciliation | finding payloadbol hianyoznak `title|refs|why_this_severity|scope_link`, de kotelezo workflow-v1 mezok megvannak | schema gate fut | nincs blocker vagy hard-stop; workflow-v1 kotelezo contract ervenyes marad, optional mezok hianya csak advisory quality jelzes lehet | P2 | required-now | [required-now exception] automated test; rationale: extension-vs-normative boundary verifikalasa |
| T16 | Round gate after round 2 (P3 boundary) | `round > 2`, uj `required-now` finding `priority=P3` | reviewer pass gate evaluation fut | `ROUND_GATE_AUTODEMOTE` kotelezoen megjelenik, timing `later-hardening`, idempotens ujraertekelessel | P1 | required-now | automated test |
| T17 | Advisory invariant negative path | gate warning reason code jelen van (`REVIEW_SCHEMA_WARNING` vagy `ROUND_GATE_WARNING`) | lifecycle transition parancsok futnak | bubble lifecycle state machine nem torik; warning csak diagnosztikai csatornan jelenik meg | P1 | required-now | automated test |
| T18 | Compound downgrade + auto-demote scenario | `round > 2`, finding `priority=P1`, `timing=required-now`, blocker-grade evidence hianyzik | gate evaluation fut | eloszor `BLOCKER_EVIDENCE_WARNING` downgrade signal (`effective_priority=P2`), majd `ROUND_GATE_AUTODEMOTE`; input finding field nem mutalodik, timing gate outputban `later-hardening` | P1 | required-now | automated test |
| T19 | Dependency must-not-use guard | valtozas tartalmazhatna uj dependency-t | validation/dependency guard fut | `package.json` es `pnpm-lock.yaml` diff assertion bizonyitja, hogy nincs uj kulso dependency | P2 | required-now | [required-now exception] automated test; rationale: dependency policy auditability |

### 8) Acceptance Gates (implementation readiness)

1. L1-ben minden `P0/P1 + required-now` elemhez van konkret viselkedesi contract es teszt-hivatkozas.
2. `required-now` es `later-hardening` hatar explicit, auditor-szinten ellenorizheto.
3. `P0/P1` evidence policy szovegezese kompatibilis a `docs/reviewer-severity-ontology.md` szabalyokkal.
4. `spec_lock_state` es `round_gate_state` minimum shape expliciten dokumentalt.
5. Round gate ownership egyertelmu (`pass` producer + `converged` shared-policy consumer).
6. Spec lock derivacios formula normative modon L1-ben rogzitett (nem L2-ben).
7. Canonical belso finding mezonev explicit: `priority`; `severity` alias mapping iranya deklaralt.
8. Advisory invarians auditálható: gate warning/advisory eseten sem torik a lifecycle allapotgep; warning observable channel minimum `failing_gates[].reason_code` + warn log.
9. Round>2 gate policy ketoldali coverage-e tesztelt: non-blocker auto-demote (T5) es evidence-backed blocker pass-through (T13).
10. Frontmatter gate workflow-v1 Required Frontmatter Contract mezokre explicitten illesztett; project-spec extension mezok kulon jelolve.
11. `open_required_now_count` consumer guidance explicit: diagnosztika-only, lifecycle gate dontesre nem hasznalhato.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Gate reason code-ok centralis enum/catalog kialakitasa.
2. [later-hardening] `failing_gates` UI-szintu csoportositas es priorizalt rendereles.
3. [later-hardening] `required-docs` strict mode feature flag hard-stop viselkedessel.
4. [later-hardening] Implementacios helper dokumentacio hivatkozzon az L1-ben rogzitett spec lock formulára; ne vezessen be alternativ lock szemantikat.
5. [later-hardening] Version lineage megorzes:
   - v1 baseline, v2 interim refinement, v3 reviewer-hardening, v4 clarity/polish, v5 auditability hardening, v6 reviewer-finding closure, v7 policy-alignment hardening, v8 contract-canonicalization closure, v9 traceability + round-gate pass-through coverage, v10 P3 clarity cleanup, v11 implementer-awareness closure, v12 reviewer-closure polish.
   - lineage append-only: korabbi policy donteseket nem szabad stale allapotra visszavinni.

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
   - `severity` elfogadott compatibility alias; ingest mapping `severity -> priority`, es opcionális output mirror engedett compatibility celra, canonical protocol mezonev tovabbra is `priority`.
2. Blocker definicio: `P0/P1 + required-now + L1`.
3. `P0/P1` findinghez finding-level evidence kotelezo; enelkul downgrade to `P2`.
4. Max 2 L1 hardening kor.
5. 2. kor utan uj `required-now` csak evidence-backed `P0/P1` lehet.
6. L2 elemek alapertelmezetten `later-hardening`.
7. `required-now exception` jeloles task-authoring governance kivetelre vonatkozik; round>2 auto-demote csak reviewer finding payloadra ervenyes.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha `open_blocker_count == 0` (workflow-v1 aligned L1 derivacios formula szerint).
`open_required_now_count` csak diagnosztikai/riport mezo; consumer oldalon nem gate-elofeltetel.
