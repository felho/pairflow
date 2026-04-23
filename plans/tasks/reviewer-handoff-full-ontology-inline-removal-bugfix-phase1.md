---
artifact_type: task
artifact_id: task_reviewer_handoff_full_ontology_inline_removal_bugfix_phase1_v1
title: "Reviewer Handoff Full Ontology Inline Removal Bugfix (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - src/v11/shared/reviewer/reviewerSeverityOntology.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/reviewerSeverityOntology.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/reviewer-severity-ontology.md
  - plans/archive/tasks/reviewer-gating/reviewer-startup-prompt-compaction-and-policy-reinjection-phase1.md
owners:
  - "felho"
---

# Task: Reviewer Handoff Full Ontology Inline Removal Bugfix (Phase 1)

## Current Codebase Check (2026-04-24)

1. A reviewer startup/resume promptokra mar letezik policy snapshot pointer modell:
   - `reviewer-policy-snapshot.md`
   - `Reviewer policy file: ...`
2. A reviewer tmux handoff viszont fresh contextben ma is inline betolti a `Full canonical ontology` teljes szoveget.
3. Emiatt a reviewer handoff uzenet nyers hossza nagysagrendileg tobbszorose a rovid reminder + operativ guidance csomagnak.
4. A jelen bugfix celja nem altalanos reviewer prompt redesign, hanem a handoff inline payload biztonsagos kompaktalasa.

## L0 - Policy

### Goal

1. A reviewer tmux handoff ne tartalmazza a `Full canonical ontology` teljes inline dumpjat.
2. A reviewer tovabbra is kapja meg:
   - a rovid severity runtime reminder blokkot,
   - a document/code scope selection guidance-ot,
   - a round-local emit / workflow operativ utmutatast.
3. A canonical teljes policy tovabbra is a policy snapshot file-on keresztul legyen elerheto.
4. A javitas ne valtoztassa meg a reviewer decision policy tartalmat, csak a handoff delivery formatumat.

### In Scope

1. Reviewer tmux handoff message builder kompaktalasa.
2. `buildReviewerSeverityOntologyReminder(...)` hasznalati szerzodesenek szukitese a handoff pathon.
3. Tesztek frissitese, hogy a handoff:
   - tartalmazza a rovid reminder blokkot,
   - ne tartalmazza a `Full canonical ontology` szoveget.

### Out Of Scope

1. Startup/resume reviewer prompt redesign.
2. Reviewer policy snapshot tartalmanak atirasa.
3. Reviewer scout/decision-matrix/output-contract guidance kiszervezese pointer moge.
4. Tmux marker-confirmation vagy stuck-input detection javitasa.
5. Claude pane restart/watchdog policy modositas.

### Safety Defaults

1. A teljes ontology policy nem veszhet el:
   - a snapshot pointer modell maradjon ervenyben.
2. A rovid runtime severity reminder maradjon inline a handoffban.
3. A handoffbol csak a redundans full ontology dump tavolithato el ebben a fazisban.
4. A reviewer operativ utmutatasok (scope, emit, workflow) nem gyengulhetnek.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary-k:
   - reviewer handoff prompt text contract
   - reviewer severity reminder render contract
   - handoff prompt tesztassert contract

## L1 - Change Contract

### Target-File Reality Check

1. A bounded slice a reviewer tmux handoff text assembly.
2. Nincs API payload, state machine, protocol envelope vagy config schema delta.
3. A touched scope a prompt/render boundaryre korlatozhato; nem kell hozza downstream runtime consumer alignment.

### Control Model

1. `business_invariant`
   - a reviewer handoffnak eleg informaciot kell adnia a helyes review inditasahoz, de nem szabad foloslegesen tulmeretezett inline policy dumpot kuldenie.
2. `control_model`
   - a canonical teljes reviewer policy a snapshot artifactban van; a handoff inline resze csak rovid operativ reminder.
3. `read_path_rule`
   - full policy olvasasa a snapshot file-bol tortenik; handoff inline text csak trigger + reminder + operativ guidance.
4. `forbidden_fallback`
   - a `Full canonical ontology` nem maradhat implicit kotelezo handoff inline payload.
5. `allowed_resolution_path`
   - rovid runtime reminder inline + policy file pointer + valtozatlan operativ handoff guidance.
6. `missing_data_rule`
   - ez a task nem modosithatja a snapshot lifecycle/fail-fast szabalyokat; ha snapshot nincs, az nem handoff-level fallback scope.

### Baseline Preservation

1. `must_preserve_behaviors`
   - reviewer handoff tovabbra is explicitten jelzi: friss review induljon
   - reviewer handoff tovabbra is tartalmazza a rovid severity reminder blokkot
   - reviewer handoff tovabbra is tartalmazza a doc-only/code-review fokusz guidance-ot
2. `forbidden_regression_interpretations`
   - a compact handoff nem jelenthet policy-gyengitest
   - a full ontology kivetele nem jelentheti azt, hogy a reviewernek nincs canonical policy forrasa
3. `replacement_proof_required_if_removed`
   - ha a full ontology inline dump kikerul, a snapshot pointer jelenlete/elerhetosege maradjon bizonyithato baseline

### Call-Site Matrix

| ID | File | Contract delta | Priority |
|---|---|---|---|
| CS1 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | reviewer PASS handoff message nem tartalmazhatja a teljes inline ontology dumpot | P1 |
| CS2 | `src/v11/shared/reviewer/reviewerSeverityOntology.ts` | reminder helper tovabbra is kepes rovid reminder renderelesre; handoff path nem kerhet full ontologyt | P1 |
| CS3 | `tests/core/runtime/tmuxDelivery.test.ts` | handoff tesztek explicit assertelik: rovid reminder van, full ontology nincs | P1 |
| CS4 | `tests/core/runtime/reviewerSeverityOntology.test.ts` | helper-level contract tovabbra is kulon valasztja a rovid reminder es a full ontology shape-et | P2 |

### Shared Contract Compatibility

1. `current_consumers`
   - reviewer tmux handoff runtime
   - reviewer startup/resume promptok
2. `additive_vs_breaking`
   - bounded breaking a reviewer handoff text shape-re, de nem policy-semantic valtozas
3. `alignment_now_or_later`
   - csak a handoff alignment tortenik most
   - startup/resume marad valtozatlan

### Closure Budget

1. `touched_closures`
   - `internal_execution_consumers`
2. `intentionally_collapsed`
   - nincs
3. `explicitly_deferred`
   - startup/resume compact parity
   - marker-confirmation hardening
   - broader reviewer guidance compaction

### Bounded Task Shape

1. `primary_shape`
   - `consumer_family_alignment`
2. `secondary_shape`
   - none

### Test Matrix

| ID | Scenario | Then | Priority |
|---|---|---|---|
| T1 | reviewer handoff compact policy mode | reviewer PASS delivery render | tartalmazza a `Severity Ontology v1 reminder` blokkot | P1 |
| T2 | reviewer handoff compact policy mode | reviewer PASS delivery render | nem tartalmazza a `Full canonical ontology (embedded from` szoveget | P1 |
| T3 | document-scope handoff preservation | reviewer PASS delivery render document bubble-nel | a doc-only guidance tovabbra is bent marad | P1 |
| T4 | round/workflow guidance preservation | reviewer PASS delivery render | az operativ emit/workflow guidance tovabbra is bent marad | P1 |
| T5 | helper contract separation | ontology reminder helper test | a rovid reminder es a full ontology render tovabbra is kulon ellenorizheto | P2 |

## Review Control

1. A review ne huzza be ebbe a taskba a startup/resume prompt compact parityt.
2. A review ne kerjen marker-confirmation vagy watchdog javitast ebben a fazisban.
3. A task csak akkor zarhato, ha a handoffbol tenyleg csak a full ontology dump tunik el, mikozben a rovid reminder es az operativ guidance megmarad.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:
1. a reviewer handoff nem tartalmazza a `Full canonical ontology` inline dumpot,
2. a reviewer handoff tovabbra is tartalmazza a rovid severity reminder blokkot,
3. a reviewer handoff tovabbra is tartalmazza a doc/code scope es round-local operativ guidance-ot,
4. a task nem nyitja ujra a startup/resume vagy tmux delivery confirm scope-ot.
