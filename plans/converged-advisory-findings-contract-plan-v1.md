---
artifact_type: plan
artifact_id: plan_converged_advisory_findings_contract_phase1_v1
title: "Converged Advisory Findings Contract Plan (Phase 1)"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Converged Advisory Findings Contract (Phase 1)

## Objective

Egy egyertelmu, audit-kesz contract bevezetese arra, hogy reviewer `converged` utvonalon is strukturaltan atadhato legyen a nem blokkolo finding halmaz (advisory findingok), ugy hogy:
1. a blocker semantics (`P0/P1`) valtozatlan marad,
2. ne legyen summary vs structured metadata inkonzisztencia,
3. approval/meta-review/human oldalon is latszodjon a valos maradek kockazati kep.

## Problem Baseline

1. Jelenleg a `converged` CLI csak `--summary` + `--ref` opciot kezel.
2. Emiatt a reviewer vagy csak szovegben irja le a marado findingokat, vagy elveszti a strukturalt atadast.
3. Ez inkonzisztens allapotot eredmenyezhet:
   - summary: maradt advisory finding,
   - metadata/parity: `findings_claimed_open_total = 0` vagy `unknown`.
4. Mar most is van pre-existing UX inkonzisztencia:
   - a `converged` help/guidance szovegben megjelenik `--finding` referencia, mikozben az option jelenleg nincs tenylegesen bekotve.

## Design Decision

Canonikus irany:
1. Uj CLI opcio a `converged` commandban: `--finding <P0|P1|P2|P3:Title[|ref1,ref2]>` (repeatable), a `pass` commanddal azonos flag-nevvel.
2. A finding parser kozositett/ujrahasznositott (`pass` es `converged` kozos parse logika), nem kulon format.
3. `converged` kontextusban `P0/P1` explicit tiltott (hard fail), tehat runtime-ban csak `P2/P3` mehet tovabb.
4. Advisory finding payload strukturaltan bekerul a convergence envelope-be, de nem blokkolo claimkent:
   - blocker claim semantics nem valtozik,
   - kulon advisory metadata mezokkel kovetheto.
5. Ketziranyu summary-claim konzisztencia guard:
   - ha summary pozitiv finding-allitast tesz es structured finding payload nincs, command reject,
   - ha structured finding payload van, de summary "clean/no findings" allitast tesz, command reject.
6. SummaryVerifierConsistencyGate interakcio Phase 1-ben valtozatlan:
   - uj claim_class nem kerul bevezetesre,
   - a jelenlegi gate-dontes modell marad, advisory konzisztencia az input/approval parity guardokon ervenyesul.
7. Guard ownership explicit:
   - hard reject csak command-szinten (`converged` input validacio, WP1),
   - approval path (WP3) csak normalization + diagnosztika, uj command-level reject nelkul.

## Contract Scope

In scope:
1. Reviewer `converged` command input contract bovitese.
2. Convergence envelope advisory finding transport.
3. Approval-request metadata bovitese advisory mezokkel.
4. Prompt/runtime guidance frissites.
5. Metrika es diagnosztika update.

Out of scope:
1. Uj severity taxonomy.
2. Meta-review recommendation model ujratervezes.
3. Teljes protocol schema redesign.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1A | CLI + command contract bovitese | Jelenlegi `pass` finding parser, `converged` command | `converged --finding` parser reuse, P2/P3-only guard, konzisztens hibauezenetek | `converged` elfogad `--finding`-ot, `P0/P1` reject, backward compatibility megmarad |
| Phase 1B | Envelope + metadata transport | 1A output | convergence payload advisory finding adatok + minimal lifecycle metadata | advisory finding count audit-keszen visszaolvashato transcriptbol es event metadata-bol |
| Phase 1C | Approval/meta-review lathatosag | 1B output | FindingsParityMetadata bovitese + approval request metadata advisory count + ketiranyu summary guard | approval oldalon nincs hamis "clean" jelzes advisory finding mellett |
| Phase 1D | Prompt/docs/ops alignment | 1A-1C output | reviewer guidance + help text + docs frissites | reviewer first-try command hibarata csokken, policy egyertelmu |
| Phase 1E | Release + monitor | Minden fazis outputja | feature flag nelkuli, kompatibilis rollout + metrika monitor | 2 heten belul kontradikcio rate cel elerese |

## Work Packages

### WP1 - CLI and Parsing (Phase 1A)

Target files:
1. `src/cli/commands/agent/converged.ts`
2. `src/cli/commands/agent/pass.ts` (parser extraction/reuse)
3. `src/v11/shared/converged/convergedCommandTypes.ts`
4. `src/v11/application/converged/runConvergedFlowContract.ts`
5. `src/v11/application/converged/runConvergedFlow.ts`

Deliverables:
1. Uj `--finding` option a `converged` helpben es parserben, `pass` formatummal azonos szintaxissal.
2. Parser reuse explicit:
   - `parseFinding()` logika ujrahasznositasa vagy kozos utility-be kiemelese.
3. Uj input mezok a converged flow contractban.
4. Parser-szintu/command-szintu validacio:
   - csak `P2/P3`,
   - ures title/ref formatum tiltva.
5. Hibauezenet reason code-ok:
   - `CONVERGED_FINDINGS_INVALID`
   - `CONVERGED_BLOCKER_FINDINGS_FORBIDDEN`
   - `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION`
6. Kontradikcio-gard vegrehajtasi helye:
   - a ketiranyu summary-vs-structured hard reject kizarolag itt, command-szinten tortenik.
7. Summary finding-detection heurisztika explicit:
   - a jelenlegi `evaluatePositiveSummaryFindingsAssertion` (regex/keyword alapu) logika az elsodleges detektor,
   - nincs kulon NLP modell Phase 1-ben,
   - a detektor viselkedeset regresszios tesztek vedik (`tests/core/convergence/policy.test.ts`).

### WP2 - Convergence Payload and Metrics (Phase 1B)

Target files:
1. `src/v11/application/converged/convergedExecution.ts`
2. `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts`
3. `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts`
4. `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts` (csak route-level parity atadas wiring, ha szukseges)
5. `src/v11/application/converged/convergedFinalizationMetadata.ts`
6. `src/v11/application/converged/convergedFinalizationEvents.ts`

Deliverables:
1. Advisory finding lista atadasa convergence payloadban (metadata-backed, schema-safe):
   - finding-szintu `priority/severity`, `title`, `refs` megorzes.
2. Minimal Phase 1 convergence lifecycle metadata:
   - `advisory_findings_open_total`
3. Explicit jelzes:
   - `blocking_findings_open_total = 0` converged pathon.
4. Per-severity advisory bontas (`P2/P3`) nem Phase 1, hanem opcionis Phase 2 scope.
5. Meta-review parity mapping explicit:
   - a finding listabol szarmaztatott advisory open count atvezetesre kerul a parity metadata pipeline-ba.
6. Downstream consumer audit (kotelozo):
   - az uj parity mezok fogyasztoinak teljes listaja es update-je: `metaReviewGateFindingsParityHelpers`, `metaReviewGateFindingsMetadata`, `approvalRequestEnvelope`, `resumeSummary`, `protocol validators`.

### WP3 - Approval Path Consistency (Phase 1C)

Target files:
1. `src/core/bubble/approvalRequestEnvelope.ts`
2. `src/types/protocol.ts`
3. `src/core/protocol/resumeSummary.ts` (ha operator UI osszegzeshez kell)
4. `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts`

Deliverables:
1. FindingsParityMetadata explicit bovitese:
   - `findings_blocking_open_total`
   - `findings_advisory_open_total`
2. Approval metadata atveszi az advisory finding countokat a parity pipeline-on keresztul.
3. Summary normalization logika ketiranyu:
   - ne tekintse "clean"-nek azt az esetet, ahol advisory finding count > 0,
   - summary="clean/no findings" + structured open finding esetben explicit normalization + reason_code (hard reject nelkul, mert az WP1 felelossege).
4. SummaryVerifierConsistencyGateDecisionRecord valtozatlan marad Phase 1-ben (nincs uj claim_class), ezt explicit dokumentalja a terv.
5. Defense-in-depth assertion:
   - ha WP1 command-level guard valamilyen integracios utvonalon nem futott le, WP3 allitsa:
     - `findings_parity_status = "mismatch"`,
     - `approval_summary_normalization_reason_code = "CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH"`,
   - approval request mehet tovabb (hard reject nelkul), de "clean" jelzes nem adható.
6. Approval kontextusban advisory lista lathatosag:
   - az aggregalt szam mellett a finding-lista (severity/title) transcript/payload oldalon visszakeresheto marad, hogy P2 vs P3 kulonbseg emberileg megitelheto legyen.

### WP4 - Reviewer Guidance Alignment (Phase 1D)

Target files:
1. `src/core/runtime/reviewerCommandGateGuidance.ts`
2. `src/core/runtime/tmuxDelivery.ts`
3. `docs/reviewer-severity-ontology.md`
4. `docs/reviewer-pass-converged-issue-assessment-2026-03-21.md`

Deliverables:
1. Egyertelmu reviewer utmutato:
   - blocker -> `pass --finding`
   - non-blocking -> `converged --finding` (`P2/P3`)
   - clean -> `converged` finding nelkul
2. Konvergens command peldak copy-paste formaban.
3. Tiltott minta explicite:
   - summaryban finding allitas, strukturalt payload nelkul.
   - strukturalt payload mellett "clean/no findings" summary allitas.

### WP5 - Validation and Regression (Phase 1E)

Target files:
1. `tests/cli/convergedCommand.test.ts`
2. `tests/v11/application/converged/convergedCommandInputNormalization.test.ts`
3. `tests/v11/application/converged/convergedExecution.test.ts`
4. `tests/v11/application/converged/runConvergedFlow.test.ts`
5. `tests/core/bubble/approvalRequestEnvelope.test.ts`
6. `tests/core/protocol/resumeSummary.test.ts`
7. `tests/core/protocol/validators.test.ts`
8. `tests/contracts/v11/converged.contract.test.ts`
9. `tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts` (uj tesztfile)
10. `tests/v11/shared/metaReviewGate/` directory letrehozasa (ha meg nem letezik)
11. `tests/core/reviewer/summaryVerifierConsistencyGate.test.ts`
12. `tests/core/convergence/policy.test.ts`

Deliverables:
1. Parser tesztek:
   - `--finding` accepted converged alatt (`P2/P3`)
   - `P0/P1` rejected converged alatt
2. Convergence envelope tesztek:
   - advisory metadata persisted
3. Approval metadata tesztek:
   - advisory count helyesen atadva
   - ketiranyu summary consistency guard nem ad hamis clean/open jelzest
4. Guard + detektor stabilitas tesztek:
   - summary verifier gate viselkedese valtozatlan marad advisory bovitessel,
   - summary finding detektor regex/keyword alapu triggerjei regresszioban fedettek.

## Forward Contract Strategy

1. CLI backward compatibility:
   - `pairflow converged --summary ...` tovabbra is mukodik.
2. Forward-only transcript contract:
   - a bevezetes utan keletkezo converged/approval esemenyekben advisory metadata kotelezoen jelen van.
3. Determinisztikus advisory semantics:
   - `advisory_*_total = 0` csak valos "nincs advisory finding" esetben irhato.
   - hianyzo advisory metadata nem "0"-ra esik vissza, hanem contract hiba (fail-closed).
4. Legacy transcript kompatibilitas nem cel Phase 1-ben:
   - nincs fallback/normalizalo logika regi transcript formakra.
5. In-flight bubble atmeneti strategia:
   - a bubble kickoff idejen rogzitett contract-verzio dont (`legacy_inflight` vagy `advisory_v1`).
   - rollout elott indult bubble a rogzitett korabbi contract szerint zarhato le, uj bubble mar `advisory_v1` modban indul.
6. Grace period policy:
   - az in-flight atmenet idoben korlatozott (operaciosan kihirdetett idoablak), utana minden aktiv bubble `advisory_v1` contractra terelendo.

## Risk and Mitigation

1. Risk: advisory es blocker semantics osszemosodik.
   - Mitigation: hard validator `P0/P1` tiltva converged alatt.
2. Risk: meta-review parity pipeline felreertelmezi az uj adatot.
   - Mitigation: advisory kulon metadata csatornan megy, nem claim-state replacement.
3. Risk: reviewer tovabbra is csak summaryban kommunikal.
   - Mitigation: summary/advisory konzisztencia guard + runtime command peldak.
4. Risk: tul nagy schema-mozgas.
   - Mitigation: Phase 1 metadata-first approach, payload schema valtozas csak ha indokolt.

## Success Metrics

1. `summary_finding_contradiction_rate`: legalabb 80% csokkenes 2 heten belul.
2. `first_try_converged_success_rate`: legalabb +25% javulas.
3. `approval_false_clean_signal_count`: 0 cel a pilot idoszakban.
4. `manual_rework_due_to_transfer_error`: csokkeno trend 2 sprinten belul.

## Rollout Plan

1. Week 1: WP1 complete + WP2 kickoff (payload wiring, initial metadata path).
2. Week 2: WP2 finish + WP3 (approval/parity metadata) + celzott integration tesztek.
3. Week 3: WP4 + WP5 teljesites, monitor, fine-tuning, docs freeze.

Rollback policy:
1. Ha regresszio van, `converged --finding` parser elfogadast ideiglenesen kikapcsoljuk, de a meglevo converged command marad.
2. Advisory metadata hianya az uj contract alatt nem normalizalhato `0`-ra; a rendszer fail-closed viselkedest tart fenn.

## Task List

1. `plans/tasks/01-converged-advisory-findings-cli-and-flow-contract-phase1.md`
2. `plans/tasks/02-converged-advisory-findings-approval-consistency-phase1.md`
3. `plans/tasks/03-converged-advisory-findings-reviewer-guidance-and-rollout-phase1.md`

Task dependency order:
1. Task 1 (`cli-and-flow-contract`) onallo kezdofeladat.
2. Task 2 (`approval-consistency`) Task 1 outputjara epul.
3. Task 3 (`reviewer-guidance-and-rollout`) Task 1 + Task 2 lezarasara epul.

Readiness gate:
1. A plan status marad `draft`, amig a fenti 3 task file nem jon letre es nincs egyeztetett owner + acceptance criteria.
2. A jelen review plan-szinten ervenyes; task-level granularitas a 3 task file letrehozasaval valik teljesse.

## Assumptions

1. A `converged` tovabbra is nem-blokkolasi allapotot jelent.
2. Advisory finding atadas business celja a lathatosag, nem uj blokkolo kapu.
3. A jelenlegi meta-review folyamat recommendation semantics valtozatlan marad Phase 1-ben.
4. Legacy transcript visszafele kompatibilitas nem kovetelmeny; a fokusz a bevezetes utani helyes contract-mukodes.
