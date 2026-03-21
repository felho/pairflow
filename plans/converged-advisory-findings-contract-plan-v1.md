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

## Design Decision

Canonikus irany:
1. Uj CLI opcio: `--advisory-finding <P2|P3:Title[|ref1,ref2]>` (repeatable) a `converged` commandban.
2. `converged` alatt `P0/P1` explicit tiltott (hard fail).
3. Advisory finding payload strukturaltan bekerul a convergence envelope-be, de nem blokkolo claimkent:
   - blocker claim semantics nem valtozik,
   - kulon advisory metadata mezokkel kovetheto.
4. Summary-claim konzisztencia guard:
   - ha summary pozitiv finding-allitast tesz es advisory finding payload nincs, command reject.

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
| Phase 1A | CLI + command contract bovitese | Jelenlegi `pass` finding parser minta, `converged` command | `--advisory-finding` parser, P2/P3-only guard, konzisztens hibauezenetek | `converged` elfogad advisory findingot, `P0/P1` reject, backward compatibility megmarad |
| Phase 1B | Envelope + metadata transport | 1A output | convergence payload advisory finding adatok + lifecycle metadata countok | advisory finding count audit-keszen visszaolvashato transcriptbol es event metadata-bol |
| Phase 1C | Approval/meta-review lathatosag | 1B output | approval request metadata advisory count + summary normalization guard update | approval oldalon nincs hamis "clean" jelzes advisory finding mellett |
| Phase 1D | Prompt/docs/ops alignment | 1A-1C output | reviewer guidance + help text + docs frissites | reviewer first-try command hibarata csokken, policy egyertelmu |
| Phase 1E | Release + monitor | Minden fazis outputja | feature flag nelkuli, kompatibilis rollout + metrika monitor | 2 heten belul kontradikcio rate cel elerese |

## Work Packages

### WP1 - CLI and Parsing (Phase 1A)

Target files:
1. `src/cli/commands/agent/converged.ts`
2. `src/v11/shared/converged/convergedCommandTypes.ts`
3. `src/v11/application/converged/runConvergedFlowContract.ts`
4. `src/v11/application/converged/runConvergedFlow.ts`

Deliverables:
1. Uj `--advisory-finding` option a helpben es parserben.
2. Uj input mezok a converged flow contractban.
3. Parser-szintu validacio:
   - csak `P2/P3`,
   - ures title/ref formatum tiltva.
4. Hibauezenet reason code-ok:
   - `CONVERGED_ADVISORY_FINDINGS_INVALID`
   - `CONVERGED_BLOCKER_FINDINGS_FORBIDDEN`

### WP2 - Convergence Payload and Metrics (Phase 1B)

Target files:
1. `src/v11/application/converged/convergedExecution.ts`
2. `src/v11/application/converged/convergedFinalizationMetadata.ts`
3. `src/v11/application/converged/convergedFinalizationEvents.ts`

Deliverables:
1. Advisory finding lista atadasa convergence payloadban (metadata-backed, schema-safe).
2. Uj convergence lifecycle metadata:
   - `advisory_findings_open_total`
   - `advisory_findings_p2_total`
   - `advisory_findings_p3_total`
3. Explicit jelzes:
   - `blocking_findings_open_total = 0` converged pathon.

### WP3 - Approval Path Consistency (Phase 1C)

Target files:
1. `src/core/bubble/approvalRequestEnvelope.ts`
2. `src/types/protocol.ts` (metadata tipizalas, ha szukseges)
3. `src/core/protocol/resumeSummary.ts` (ha operator UI osszegzeshez kell)

Deliverables:
1. Approval metadata atveszi az advisory finding countokat.
2. Summary normalization logika ne tekintse "clean"-nek azt az esetet, ahol advisory finding count > 0.
3. Human approval kontextusban kulon mezok:
   - `open_blocking_findings_total`
   - `open_advisory_findings_total`

### WP4 - Reviewer Guidance Alignment (Phase 1D)

Target files:
1. `src/core/runtime/reviewerCommandGateGuidance.ts`
2. `src/core/runtime/tmuxDelivery.ts`
3. `docs/reviewer-severity-ontology.md`
4. `docs/reviewer-pass-converged-issue-assessment-2026-03-21.md`

Deliverables:
1. Egyertelmu reviewer utmutato:
   - blocker -> `pass --finding`
   - non-blocking -> `converged --advisory-finding`
   - clean -> `converged` finding nelkul
2. Konvergens command peldak copy-paste formaban.
3. Tiltott minta explicite:
   - summaryban finding allitas, strukturalt advisory payload nelkul.

### WP5 - Validation and Regression (Phase 1E)

Target files:
1. `tests/cli/...` (converged option parsing tesztek)
2. `tests/core/...` (approval metadata consistency tesztek)
3. `tests/v11/...` (runConvergedFlow integration)

Deliverables:
1. Parser tesztek:
   - `--advisory-finding` accepted (`P2/P3`)
   - `P0/P1` rejected converged alatt
2. Convergence envelope tesztek:
   - advisory metadata persisted
3. Approval metadata tesztek:
   - advisory count helyesen atadva
   - summary normalization nem ad hamis clean-t

## Compatibility Strategy

1. Backward compatible default:
   - `pairflow converged --summary ...` tovabbra is mukodik.
2. Uj mezo optionalis:
   - advisory finding nelkuli clean converged teljesen valtozatlan.
3. Legacy transcript olvasas:
   - advisory metadata hianya esetben fallback `0`.

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

1. Week 1: WP1 + WP2 + unit tesztek.
2. Week 2: WP3 + WP4 + integration tesztek.
3. Week 3: monitor, fine-tuning, docs freeze.

Rollback policy:
1. Ha regresszio van, `--advisory-finding` parser elfogadast ideiglenesen kikapcsoljuk, de a meglevo converged command marad.
2. A metadata mezok additive-ek, nem torik a regi olvasot.

## Task List

1. `plans/tasks/converged-advisory-findings-cli-and-flow-contract-phase1.md`
2. `plans/tasks/converged-advisory-findings-approval-consistency-phase1.md`
3. `plans/tasks/converged-advisory-findings-reviewer-guidance-and-rollout-phase1.md`

## Assumptions

1. A `converged` tovabbra is nem-blokkolasi allapotot jelent.
2. Advisory finding atadas business celja a lathatosag, nem uj blokkolo kapu.
3. A jelenlegi meta-review folyamat recommendation semantics valtozatlan marad Phase 1-ben.
