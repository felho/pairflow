---
artifact_type: task
artifact_id: task_reviewer_repeat_clean_pass_deterministic_autoconverge_feature_phase1_v10
title: "Reviewer Repeat-Clean PASS Deterministic Auto-Converge Override (Phase 1, Docs Contract)"
status: draft
phase: phase1
target_files:
  - plans/tasks/reviewer-repeat-clean-pass-deterministic-autoconverge-feature-phase1.md
optional_alignment_files:
  - progress/*
  - docs/*
prd_ref: null
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Repeat-Clean PASS Deterministic Auto-Converge Override (Phase 1)

## Revision Log

1. `v1->v4`: deterministic trigger/transition contract formalizalasa, fail-closed reject, AC/Test traceability alapozas.
2. `v5`: note-level consistency tuning (`T9` wording, precedence scope wording, T2/T5 reason assertion).
3. `v6`: human rework P2 closure (E0/E1 reason assertions, overlap tests, most-recent ordering key, T7 intermediate assertions).
4. `v7`: lifecycle symmetry hardening (E3+E4 overlap, E1 throw semantics, E2-E5 reason coverage AC13, empty-transcript E4).
5. `v8`:
   - legacy reason-code lineage note: `DEPENDENCY_FAIL` intentionalan nem hasznalt Phase 1-ben,
   - scope integrity note: `target_files` docs-only marad (`src/config/defaults.ts` nem scope),
   - explicit rationale note: defense-in-depth core rows intentionally not modeled ebben a docs-only Phase 1 taskban,
   - Open Question status note: summary-suffix kerdes tovabbra is deferred, nem ujranyitott blocker.
6. `v9`:
   - E3 incomplete-transcript kriteriumok normativ, explicit esethalmazzal leszurkitve,
   - E4 plain-absence besorolas explicititese es T2 case split (`absent` vs `exists-but-not-clean`),
   - T4 fail-closed assert kiegeszitese explicit non-zero command exittel,
   - opcionals P3 cleanup: `transition_decision` vs `error_decision` mezonevek egyertelmusitese, E0 priority hangolasa AC10 tonalitashoz.
7. `v10` (current):
   - T13-T17 Given precondition-gate explicititese (`active_role=reviewer`, `pass_intent=review`, `findings=[]`),
   - T8/T16 fixture-clarity pontositas normativ E3 esethalmazra hivatkozva,
   - traceability kozmetika: AC6 hozzarendeles kiegeszitese `T1`-gyel, CS1 evidence tuning (`T18`),
   - nevezektani clarifier: E1 row explicit `error_decision=reject` cross-ref, E4 reason-code naming note (clean-PASS hiany szemantika, explicit non-clean esetet is lefedi).

## L0 - Policy

### Goal

Rogzitse a repeat-clean reviewer `PASS` drift helyzet deterministic, implementalhato runtime szerzodeset ugy, hogy a sikeres transition utak (`PASS` vs `CONVERGENCE`) egyertelmuek, kolcsonosen kizaroak es tesztelhetok legyenek, a reject kimenet pedig kulon hibaagkent legyen kezelve.

### In Scope

1. Repeat-clean trigger formalis, zart definicioja (5 atomikus kriterium):
   - `active_role=reviewer`
   - aktualis command `pass_intent=review`
   - aktualis command `findings=[]`
   - `round>=2`
   - transcriptben a legutobbi (most recent) korabbi reviewer `PASS` envelope clean reviewer `PASS`-nek minosul
   Megjegyzes: a `most recent` kivalasztas determinisztikus ordering kulccsal tortenik (ld. L1 Terminology #4).
2. Sikeres transition decision matrix explicit szerzodese:
   - trigger=true es policy-pass -> auto-converge override ut
   - trigger=false -> normal reviewer `PASS` handoff ut
3. Error outcome matrix:
   - trigger=true es policy-reject -> explicit reject kimenet (nem transition ut)
4. Auto-converge override output contract:
   - envelope sorrend kotelezoen `CONVERGENCE` majd `APPROVAL_REQUEST`
   - bubble state kotelezoen `READY_FOR_APPROVAL`
5. Fail-closed contract:
   - trigger=true, de convergence policy reject -> command reject explicit reason code-dal
   - silent fallback `PASS` handoffra tiltott
6. AC es Test Matrix traceability explicit, egy-az-egyben kovetheto mappinggel.
7. Scope guard: ez a dokumentum csak szerzodesi szintet rogzit; implementacios reszleteket nem vezet be.

### Out of Scope

1. `src/*` vagy `tests/*` implementacio.
2. Altalanos auto-converge minden clean `PASS` esetre (single-clean scenario).
3. Uj UI workflow, human confirmation modal, vagy policy redesign.
4. Reviewer ontology/finding modell modositas.

### Safety Defaults

1. Trigger nelkul nincs override.
2. Round 1-ben nincs override.
3. Sikeres command pontosan egy transition utat futhat: `PASS` vagy `CONVERGENCE`, kevert mellekhatas tiltott.
4. Policy reject esetben state/transcript valtozatlan maradjon.
5. A reject kimenet nem harmadik transition ut, hanem kulon fail-closed hibaag.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary-k:
   - reviewer `PASS` transition contract
   - convergence trigger contract
   - transcript/state mutation invariansok
3. Docs-only guard:
   - Allowed edit: ez a task dokumentum
   - Optional alignment: `progress/*`, `docs/*`
   - Forbidden: runtime/product kod valtoztatas
4. Scope integrity note:
   - `target_files` szandekosan docs-only; `src/config/defaults.ts` Phase 1-ben out-of-scope.

## L1 - Change Contract

### 0) Terminology and Input Semantics

1. `clean reviewer PASS` ebben a specifikacioban csak azt jelenti, hogy:
   - `pass_intent=review`
   - `findings=[]`
2. `previous reviewer clean PASS` mindig a legutobbi (most recent) korabbi reviewer `PASS` envelope-re ertendo, es ennek payloadja megfelel az 1. pont szerinti clean reviewer PASS definicionak.
3. `incomplete transcript` azt jelenti, hogy a legutobbi korabbi reviewer PASS allapota nem dontheto el determinisztikusan.
   - az ures transcript NEM incomplete eset, hanem determinisztikusan `previous reviewer clean PASS missing` klasszifikacio.
   - normativ E3 esethalmaz (kizarolagos, nem pelda-jellegu):
     - van korabbi reviewer `PASS` candidate envelope, de a clean minositeshez szukseges payload mezo (`pass_intent` vagy `findings`) hianyzik;
     - van korabbi reviewer `PASS` candidate envelope, de a payload strukturaja parse-hibasan/torzultan olvashato, ezert a clean minosites nem reprodukalhato;
     - ordering szempontbol a legutobbi reviewer `PASS` candidate nem valaszthato ki determinisztikusan (append-sequence serules vagy holtverseny miatt).
   - plain absence szabaly: ha nincs korabbi reviewer `PASS` envelope candidate, az mindig E4 (`PREVIOUS_REVIEWER_CLEAN_PASS_MISSING`), soha nem E3.
4. `most recent` ordering key:
   - canonical kulcs: transcript append sorrend (legnagyobb transcript index/sequence a nyero),
   - timestamp nem hasznalhato ordering forraskent, csak informacios mezokent.

### 1) Call-site Matrix

| ID | File | Section/Anchor | Contract Delta | Expected Result | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `plans/tasks/reviewer-repeat-clean-pass-deterministic-autoconverge-feature-phase1.md` | `L0/In Scope` | trigger kriteriumok zart, formalis listaja | trigger dontes determinisztikus | P1 | required-now | AC1, T1, T2, T18 |
| CS2 | ugyanaz | `L1/Data and Interface Contract` | `PASS` vs `CONVERGENCE` ut kolcsonosen kizaro | nincs kevert state/transcript mellekhatas | P1 | required-now | AC2, AC3, T3 |
| CS3 | ugyanaz | `L1/Error and Fallback Contract` | fail-closed policy reject path explicit | nincs silent fallback | P1 | required-now | AC4, T4 |
| CS4 | ugyanaz | `L1/Test Matrix` | pozitv/negativ trigger esetek teljes matrixa | tesztelheto acceptance coverage | P1 | required-now | matrix completeness checklist |
| CS5 | ugyanaz | `L1/AC-Test Traceability` | ketiranyu AC<->T mapping | audit-kovetheto implementacios cel | P1 | required-now | traceability checklist |
| CS6 | ugyanaz | `Spec Lock` | implementalhatosagi feltetelek zarasa | egyertelmu handoff implementaciora | P1 | required-now | review checklist |

### 2) Data and Interface Contract

| Contract | Current Ambiguity | Target Contract | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Trigger evaluation | "ismetelt clean PASS" nincs formalisan zarva | `trigger=true` csak ha mind az 5 kriterium teljesul | `active_role=reviewer`, `pass_intent=review`, `findings=[]`, `round>=2`, `most_recent_previous_reviewer_clean_pass_envelope=true` | previous reviewer pass id | behavior clarification | P1 | required-now |
| Transition selection | `PASS` es auto-converge utak keveredhetnek | command-szinten XOR: vagy normal `PASS` ut, vagy override `CONVERGENCE` ut | `transition_decision=normal_pass|auto_converge` | audit reason | behavior clarification | P1 | required-now |
| Override output | envelope/state sorrend implicit | `CONVERGENCE` -> `APPROVAL_REQUEST`, final state `READY_FOR_APPROVAL` | canonical envelope order | summary suffix `[auto-converged:repeat-clean-pass]` | behavior clarification | P1 | required-now |
| Normal PASS output | trigger false path nincs formalisan rogzitve | normal `PASS` handoff valtozatlan | `PASS` envelope, implementer handoff | n/a | no behavior change | P1 | required-now |
| Policy gate | reject eset bizonytalan fallbackkel | reject -> fail-closed, no fallback | explicit reject reason code | error detail | behavior clarification | P1 | required-now |
| Reject classification | reject konnyen harmadik transitionkent ertelmezheto | reject kulon error outcome, nem transition ut | `error_decision=reject` | reject diagnostics | behavior clarification | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Task spec document | trigger, transition, fail-closed, traceability explicit | ketertelmu vagy onellentmondo megfogalmazas | docs-only refinement | P1 | required-now |
| Runtime behavior statement | PASS vs CONVERGENCE XOR contract | mixed/dupla transition allitas | implementation-neutral wording | P1 | required-now |
| Validation traceability | AC-Test mapping explicit | AC assertion trace nelkul | reviewer/implementer handoff clarity | P1 | required-now |
| Product code | nincs | barmilyen `src/*`, `tests/*` valtoztatas | bubble constraint | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

Precedence rule a `trigger=false` agban (magasabbrol alacsonyabbra):
1. `AUTOCONVERGE_ROUND1_DISABLED`
2. `REPEAT_CLEAN_TRIGGER_INPUT_INCOMPLETE`
3. `PREVIOUS_REVIEWER_CLEAN_PASS_MISSING`
4. `REPEAT_CLEAN_TRIGGER_NOT_MET` (generic fallback, csak akkor hasznalhato, ha a fenti specifikus okok nem alkalmazhatok)

Scope clarification:
- E2/E3/E4 specifikus non-match okok, amelyek megelozik az E5 generic fallback-ot.
- E5 csak akkor ervenyes, ha trigger=false es egyik specifikus non-match ok sem illeszkedik.
- E2/E3/E4 precedence kizarolag akkor ertelmezett, ha az alap trigger-precondition gate mar teljesul (`active_role=reviewer`, `pass_intent=review`, `findings=[]`).
- Ha az alap trigger-precondition gate nem teljesul (pl. active role/pass_intent/findings mismatch), a besorolas kozvetlenul E5 (generic fallback), E2/E3/E4 overlap nem alkalmazando.
- E3 csak a L1/0#3 pontban felsorolt normativ incomplete esetekben alkalmazhato; "sima hiany" (plain absence) onmagaban nem E3.
- Overlap isolation szabaly: ha az alap precondition gate teljesul es egyszerre igaz E2+E3 vagy E2+E4, akkor E2 nyer (predecencia szerint).
- Ha az alap precondition gate teljesul es egyszerre igaz E3+E4 (round>=2 mellett), akkor E3 nyer (predecencia szerint).
- Ures transcript explicit kimenete: E4 (`PREVIOUS_REVIEWER_CLEAN_PASS_MISSING`), nem E3.
- E4 naming note: a `..._MISSING` reason-code a clean previous reviewer `PASS` hianyat jeloli; ez plain absence es explicit non-clean previous reviewer `PASS` esetet is lefed.
- Legacy reason-code note: `DEPENDENCY_FAIL` nem resze ennek a Phase 1 contractnak; dependency/provenance hibak a kapcsolodo runtime verifier taskokban kezeltek.
- Defense-in-depth scope note: core-layer technical guard rows szandekosan nincsenek itt modellezve, mert ez a task docs-only transition contract szintu.

| ID | Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| E0 | Trigger=true + policy pass | convergence policy validation | result | auto-converge transition (`CONVERGENCE` -> `APPROVAL_REQUEST`) | `REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED` | info | P1 | required-now |
| E1 | Trigger=true + policy reject | convergence policy validation | throw | `error_decision=reject`; no fallback, no state/transcript mutation, no transition envelope append, command exits non-zero with surfaced reason code | `REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED` | error | P1 | required-now |
| E2 | Round=1 guardrail | round check | result | normal `PASS` path | `AUTOCONVERGE_ROUND1_DISABLED` | info | P1 | required-now |
| E3 | Normativ incomplete-transcript eset (L1/0#3), ahol previous reviewer clean PASS allapot nem dontheto el | transcript integrity | result | normal `PASS` path, explicit non-match reason | `REPEAT_CLEAN_TRIGGER_INPUT_INCOMPLETE` | warn | P2 | required-now |
| E4 | Previous reviewer clean PASS determinisztikusan missing (plain absence vagy explicit non-clean previous reviewer `PASS`) | transcript lookup | result | normal `PASS` path | `PREVIOUS_REVIEWER_CLEAN_PASS_MISSING` | info | P1 | required-now |
| E5 | Trigger=false (generic fallback) | deterministic trigger evaluator | result | normal `PASS` path | `REPEAT_CLEAN_TRIGGER_NOT_MET` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | transcript mint source-of-truth previous reviewer clean PASS detektalashoz | P1 | required-now |
| must-use | convergence policy validation az override agban | P1 | required-now |
| must-use | canonical envelope sorrend (`CONVERGENCE` -> `APPROVAL_REQUEST`) | P1 | required-now |
| must-not-use | summary text mint egyetlen trigger source | P1 | required-now |
| must-not-use | trigger=true es policy reject mellett silent fallback `PASS` handoffra | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Repeat-clean override happy path | reviewer active, round>=2, current clean PASS, most recent previous reviewer PASS is clean | `pairflow pass --no-findings` | `CONVERGENCE` + `APPROVAL_REQUEST`, state `READY_FOR_APPROVAL`, no `PASS` handoff, explicit reason `REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED` | P1 | required-now | test spec |
| T2 | Trigger negative: previous reviewer `PASS` absent | reviewer active, round>=2, current clean PASS, transcriptben nincs korabbi reviewer `PASS` envelope | `pairflow pass --no-findings` | normal `PASS` path + explicit reason `PREVIOUS_REVIEWER_CLEAN_PASS_MISSING` | P1 | required-now | test spec |
| T3 | Transition XOR invariant | trigger true/false fixtures | transition executes | observable assertion: pontosan egy transition-branch envelope sorozat appendelodik (vagy egy darab `PASS`, vagy `CONVERGENCE`->`APPROVAL_REQUEST` par), es a masik branch envelope-jei nem jelennek meg | P1 | required-now | test spec |
| T4 | Policy reject fail-closed | trigger true + policy reject | `pairflow pass --no-findings` | explicit reject with reason `REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED`; command exit non-zero; no state/transcript mutation | P1 | required-now | test spec |
| T5 | Round1 guardrail | reviewer clean PASS, round=1 | `pairflow pass --no-findings` | no override, normal `PASS` + explicit reason `AUTOCONVERGE_ROUND1_DISABLED` | P1 | required-now | test spec |
| T6 | Envelope order determinism | trigger true fixture | transition executes | envelope order exactly `CONVERGENCE` -> `APPROVAL_REQUEST` | P1 | required-now | test spec |
| T7 | Drift-stop smoke | round>=2 kontextusban az elso kvalifikalt clean reviewer `PASS` meg trigger=false (nincs elozo clean reviewer PASS), a kovetkezo reviewer kor is clean `PASS`, es policy-pass fennall | reviewer ket egymast koveto kvalifikalt korben `pairflow pass --no-findings` commandot ad | intermediate assert: elso kor normal `PASS` + reason `PREVIOUS_REVIEWER_CLEAN_PASS_MISSING`; vegso assert: masodik kor `CONVERGENCE` + `APPROVAL_REQUEST` + reason `REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED`, loop approval szakaszba lep | P1 | required-now | test spec |
| T8 | Incomplete transcript non-match | alap trigger-precondition gate teljesul, es az E3 normativ esethalmazbol legalabb egy eset fennall (pl. legutobbi previous reviewer `PASS` candidate payloadjabol hianyzik a `findings` mezo) | `pairflow pass --no-findings` | normal `PASS` path + explicit `REPEAT_CLEAN_TRIGGER_INPUT_INCOMPLETE` reason | P2 | required-now | test spec |
| T9 | Trigger criterion negative: active role mismatch | round>=2, transcript complete, current active role nem reviewer | trigger evaluator fut | trigger=false, generic fallback reason `REPEAT_CLEAN_TRIGGER_NOT_MET` (E2/E3/E4 nem alkalmazando) | P2 | required-now | test spec |
| T10 | Trigger criterion negative: `pass_intent` mismatch | round>=2, transcript complete, `pass_intent!=review` | trigger evaluator fut | trigger=false, generic fallback reason `REPEAT_CLEAN_TRIGGER_NOT_MET` (E2/E3/E4 nem alkalmazando) | P2 | required-now | test spec |
| T11 | Trigger criterion negative: findings not empty | round>=2, transcript complete, `findings` nem ures | trigger evaluator fut | trigger=false, generic fallback reason `REPEAT_CLEAN_TRIGGER_NOT_MET` (E2/E3/E4 nem alkalmazando) | P2 | required-now | test spec |
| T12 | Trigger=false generic fallback reason explicit | trigger=false, de nem E2/E3/E4 ok miatt | `pairflow pass --no-findings` vagy evaluator fixture | explicit `REPEAT_CLEAN_TRIGGER_NOT_MET` reason code kerul kimenetre | P2 | required-now | test spec |
| T13 | Precedence overlap: E2 + E3 | alap trigger-precondition gate teljesul (`active_role=reviewer`, `pass_intent=review`, `findings=[]`), round=1, es az E3 normativ incomplete feltetel is fennall | evaluator fut | E2 nyer, reason `AUTOCONVERGE_ROUND1_DISABLED` | P1 | required-now | test spec |
| T14 | Precedence overlap: E2 + E4 | alap trigger-precondition gate teljesul (`active_role=reviewer`, `pass_intent=review`, `findings=[]`), round=1, es previous reviewer clean PASS missing is | evaluator fut | E2 nyer, reason `AUTOCONVERGE_ROUND1_DISABLED` | P1 | required-now | test spec |
| T15 | Most-recent ordering determinism | alap trigger-precondition gate teljesul (`active_role=reviewer`, `pass_intent=review`, `findings=[]`), es tobb korabbi reviewer `PASS` envelope van, ahol idobelyeg-sorrend elter append sorrendtol | trigger evaluator fut | `most recent` kivalasztas transcript append sorrenddel tortenik (legnagyobb index), nem timestamp alapjan | P1 | required-now | test spec |
| T16 | Precedence overlap: E3 + E4 | alap trigger-precondition gate teljesul (`active_role=reviewer`, `pass_intent=review`, `findings=[]`), round>=2, es egyszerre fennall egy E3 normativ incomplete eset (malformed candidate) + clean previous reviewer `PASS` deterministicen nem igazolhato | evaluator fut | E3 nyer, reason `REPEAT_CLEAN_TRIGGER_INPUT_INCOMPLETE` | P1 | required-now | test spec |
| T17 | Empty transcript classification | alap trigger-precondition gate teljesul (`active_role=reviewer`, `pass_intent=review`, `findings=[]`), round>=2, defensive fixtureben transcript ures (nincs reviewer `PASS` candidate) | evaluator fut | reason `PREVIOUS_REVIEWER_CLEAN_PASS_MISSING` (E4), explicit NEM `REPEAT_CLEAN_TRIGGER_INPUT_INCOMPLETE` | P1 | required-now | test spec |
| T18 | Trigger negative: previous reviewer `PASS` exists but not clean | reviewer active, round>=2, current clean PASS, legutobbi korabbi reviewer `PASS` envelope payloadja explicit nem-clean (`pass_intent!=review` vagy `findings` nem ures) | `pairflow pass --no-findings` | normal `PASS` path + explicit reason `PREVIOUS_REVIEWER_CLEAN_PASS_MISSING` | P1 | required-now | test spec |

### 7) AC-Test Traceability

| Acceptance Criterion | Covered By Tests |
|---|---|
| AC1 | T1, T2, T5, T9, T10, T11, T18 |
| AC2 | T1, T3 |
| AC3 | T1, T6 |
| AC4 | T4 |
| AC5 | T7 |
| AC6 | T1, T3, T4, T6 |
| AC7 | T5 |
| AC8 | T8 |
| AC9 | T12 |
| AC10 | T1, T4 |
| AC11 | T13, T14, T16 |
| AC12 | T15 |
| AC13 | T2, T5, T8, T12, T16, T17, T18 |

### 8) Test-AC Traceability

| Test | Covers Acceptance Criteria |
|---|---|
| T1 | AC1, AC2, AC3, AC6, AC10 |
| T2 | AC1, AC13 |
| T3 | AC2, AC6 |
| T4 | AC4, AC6, AC10 |
| T5 | AC1, AC7, AC13 |
| T6 | AC3, AC6 |
| T7 | AC5 |
| T8 | AC8, AC13 |
| T9 | AC1 |
| T10 | AC1 |
| T11 | AC1 |
| T12 | AC9, AC13 |
| T13 | AC11 |
| T14 | AC11 |
| T15 | AC12 |
| T16 | AC11, AC13 |
| T17 | AC13 |
| T18 | AC1, AC13 |

## Acceptance Criteria

1. `AC1`: A repeat-clean trigger definicio zart es determinisztikus.
2. `AC2`: Trigger=true esetben nincs implementer handoff `PASS` path.
3. `AC3`: Trigger=true esetben canonical `CONVERGENCE` -> `APPROVAL_REQUEST` sequence fut.
4. `AC4`: Policy reject mellett fail-closed viselkedes van, silent fallback nelkul.
5. `AC5`: Drift scenario nem marad RUNNING ping-pongban, approvalig lep.
6. `AC6`: `PASS` vs `CONVERGENCE` transition contract kolcsonosen kizaro es tesztelheto.
7. `AC7`: Round1 guardrail explicit: round=1 esetben nincs auto-converge override.
8. `AC8`: Incomplete transcript trigger-input esetben determinisztikus non-match es explicit reason code jelenik meg.
9. `AC9`: Trigger=false generic fallback ag explicit `REPEAT_CLEAN_TRIGGER_NOT_MET` reason code-dal ellenorizheto.
10. `AC10`: E0 es E1 agak explicit reason code assertionnel teszteltek (`REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED`, `REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED`).
11. `AC11`: Precedence overlap esetekben (E2+E3, E2+E4, E3+E4) a definialt sorrend szerinti ag nyer determinisztikusan.
12. `AC12`: `most recent` ordering determinisztikusan transcript append sorrend alapjan dol el, nem timestamp alapjan.
13. `AC13`: E2-E5 reason codeok explicit es tesztelt kimenetekkel fedettek, beleertve az ures transcript es az explicit non-clean previous reviewer `PASS` E4 klasszifikaciojat.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Optional runtime flag az auto-override ideiglenes ki/bekapcsolasara.
2. [later-hardening] Audit metadata field: `repeat_clean_autoconverge_triggered=true|false`.
3. [later-hardening] Human-readable suffix policy kotelezove teheto.

## Assumptions

1. A celzott drift minta: round>=2-ben egymas utani clean reviewer `PASS` mellett bubble feleslegesen RUNNING-ben marad.
2. Phase 1 szuk triggerrel indul, nem terjeszti ki minden clean `PASS` esetre.

## Open Questions (Non-Blocking)

Status note:
- Ez a kerdes korabbi reviziokban is deferred volt; itt nem ujranyitas tortenik, hanem valtozatlan Phase 2 backlogban tartas.

1. A summary suffix kotelezo legyen-e Phase 2-tol?

## Spec Lock

Rationale note:
- A gate-keszlet korabbi reviziokban bovebb es reszben redundans volt; a jelenlegi 7 gate szandekosan konszolidalt, hogy a determinisztikus contract-zarasra fokuszaljon.

Task `IMPLEMENTABLE`, ha:
1. trigger definicio zart, determinisztikus, tesztelt;
2. sikeres transition XOR contract explicit (`PASS` xor `CONVERGENCE`), reject kulon hibaag;
3. mind trigger=true, mind trigger=false path canonical szerzodessel rogzitett;
4. policy reject fail-closed, silent fallback tiltott;
5. AC-Test es Test-AC traceability teljes, ketiranyu es egyertelmu (minden AC legalabb 1 testtel, minden test legalabb 1 AC-vel kotott);
6. precedence overlap isolation (E2+E3, E2+E4, E3+E4) es `most recent` ordering kulcs expliciten rogzitett es tesztelt;
7. E2-E5 reason code lefedes explicit AC/test szerzodesben rogzitett, ures transcript edge-casekel egyutt.
