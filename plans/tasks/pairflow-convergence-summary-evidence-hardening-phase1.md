---
artifact_type: task
artifact_id: task_pairflow_convergence_summary_evidence_hardening_phase1_v1
title: "Pairflow Convergence Summary + Evidence Trust Hardening (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/agent/pass.ts
  - src/core/convergence/policy.ts
  - src/core/reviewer/testEvidence.ts
  - tests/core/agent/pass.test.ts
  - tests/core/convergence/policy.test.ts
  - tests/core/reviewer/testEvidence.test.ts
plan_ref: plans/archive/pairflow-initial-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Pairflow Convergence Summary + Evidence Trust Hardening (Phase 1)

## L0 - Policy

### Goal

Szuntesse meg a ket kritikus workflow-inkonzisztenciat:
1. reviewer PASS summary/payload finding-konzisztencia res, amely szovegezessel megkerulheto;
2. reviewer test evidence `trusted` minosites tul gyenge provenance-feltetelekkel.

### Context

Az alabbi ket minta tobb bubble-ben is elofordulhat:
1. Summary emlit finding severityt, de `payload.findings=[]`; ez hol blokkol, hol nem.
2. `trusted` evidence status olyan ref-forrasbol is kijon, ami nem canonical evidence log.

### In Scope

1. Reviewer PASS es konvergencia gate kozotti finding-konzisztencia szabaly determinisztikus eroszitese.
2. `trusted` evidence provenance feltetel szigoritese canonical evidence logokra.
3. Ehhez tartozo tesztek frissitese.

### Out of Scope

1. Bubble-spec task markdownok tartalmi atirasa.
2. Legacy transcript visszamenoleges migracioja.
3. Runtime policy valtozas a P0/P1 blocker szemantikaban.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority |
|---|---|---|---|---|
| CS1 | `src/core/agent/pass.ts` | reviewer PASS input validation | `--no-findings` agban tiltsa a finding-count / severity allitasokat a summaryban (pl. `3xP2`, `P2 findings`) | P1 |
| CS2 | `src/core/convergence/policy.ts` | summary/payload consistency gate | ne csak szamos mintat, hanem severity-jeloles + findingallitas kombinaciot is blokkoljon, ha `findings=[]` | P1 |
| CS3 | `src/core/reviewer/testEvidence.ts` | evidence source policy + classify | `trusted` csak canonical `.pairflow/evidence/*.log` ref + verifikalhato exit marker eseten | P1 |
| CS4 | `tests/core/agent/pass.test.ts` | reviewer PASS validation tests | uj negativ tesztek summary-only findingallitasra `--no-findings` mellett | P1 |
| CS5 | `tests/core/convergence/policy.test.ts` | convergence consistency tests | uj mintak: `P3-level`, `findings present`, severity tokenek szam nelkul | P1 |
| CS6 | `tests/core/reviewer/testEvidence.test.ts` | evidence trust tests | non-log ref ne lehessen `trusted`; done-package jellegu ref legyen `untrusted/run_checks` | P1 |

### 2) Data/Behavior Contract

1. Reviewer clean PASS (`--no-findings`) summary nem tartalmazhat pozitiv finding allitast.
2. Convergence gate ugyanazt a kovetkeztetest adja summary-fogalmazastol fuggetlenul.
3. `trusted` evidence csak log-backed provenance mellett adható.

### 3) Error/Fallback Contract

1. Ha reviewer clean PASS summary finding-allitast tartalmaz -> parancs fail-fast, javitasi uzenettel.
2. Ha evidence provenance nem canonical log -> `status=untrusted`, `decision=run_checks`, `reason_code=evidence_unverifiable`.

## L2 - Verification Plan

### Test Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | Clean PASS summary contradiction (numeric) | reviewer `--no-findings` | summary: `2xP2 findings` | PASS elutasitva |
| T2 | Clean PASS summary contradiction (non-numeric severity) | reviewer `--no-findings` | summary: `P3-level observations` + findings allitas | PASS elutasitva |
| T3 | Convergence consistency | previous reviewer PASS `findings=[]` | summary severityt allit tobb stilusban | converged block |
| T4 | Trusted evidence strict provenance | ref = non-log markdown | verify evidence | `untrusted/run_checks` |
| T5 | Trusted evidence canonical path | ref = `.pairflow/evidence/*.log` + explicit exit | verify evidence | `trusted/skip_full_rerun` |

### Acceptance Criteria

1. AC1: Reviewer clean PASS summary/payload finding-konzisztencia fail-fast enforced.
2. AC2: Convergence gate nem kerulheto meg summary stilusvalasztassal.
3. AC3: `trusted` evidence minosites csak canonical log provenance mellett adodik.
4. AC4: Uj tesztek lefedik a fenti regressziokat.

