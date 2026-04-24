---
artifact_type: task
artifact_id: task_reviewer_handoff_full_ontology_inline_removal_bugfix_phase1_v2
title: "Reviewer Handoff Policy Compaction: reminder + snapshot pointer (Phase 1)"
status: completed
phase: phase1
target_files:
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - tests/core/runtime/tmuxDelivery.test.ts
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

# Task: Reviewer Handoff Policy Compaction: reminder + snapshot pointer (Phase 1)

## Current Codebase Check (2026-04-24)

1. A reviewer startup/resume pathon mar letezik deterministic policy snapshot pointer modell:
   - artifact: `reviewer-policy-snapshot.md`
   - prompt token: `Reviewer policy file: <absolute-path>`
2. A reviewer PASS tmux handoff fresh reviewer contextben ma is inline berakja a `Full canonical ontology` teljes szoveget a `tmuxDeliveryMessageBuilder` utjan.
3. A jelenlegi handoff egyebkent mar hordozza a rovid severity remindert, a review scope guidance-ot, a reviewer test directive-et es a round-local workflow utmutatast; a tulmeretezett resz a teljes inline ontology dump.
4. A bounded cel ebben a fazisban nem altalanos reviewer prompt redesign, hanem a reviewer handoff policy-delivery contract szukitese: rovid reminder + explicit snapshot pointer + valtozatlan operativ guidance.

## L0 - Policy

### Goal

1. A reviewer tmux handoff ne tartalmazza a `Full canonical ontology` teljes inline dumpjat.
2. A reviewer handoff tovabbra is tartalmazza:
   - a rovid `Severity Ontology v1 reminder` blokkot,
   - az explicit policy snapshot pointert,
   - a document/code scope selection guidance-ot,
   - a reviewer test directive-et,
   - a round-local scout / findings / emit workflow operativ utmutatast.
3. A canonical teljes policy tovabbra is a snapshot artifacton keresztul legyen elerheto.
4. A javitas ne valtoztassa meg a reviewer severity szemantikat, csak a handoff delivery formatumat.

### In Scope

1. Reviewer PASS tmux handoff message contract szukitese a delivery render pathon.
2. Az explicit `Reviewer policy file: <absolute-path>` pointer renderelesenek rogzitese a current-tree builder boundaryn belul, uj kotelezo plumbing nelkul ahol ez mar a meglevo inputokbol levezetheto.
3. A handoff tesztek frissitese az uj compact contractra.

### Out Of Scope

1. Startup/resume reviewer prompt redesign vagy snapshot lifecycle modositas.
2. `docs/reviewer-severity-ontology.md` tartalmi atirasa.
3. `buildReviewerSeverityOntologyReminder(...)` globalis helper-redesign vagy a full-mode teljes kivezetese mas fogyasztoktol.
4. Reviewer scout / decision matrix / output contract szovegek ujratervezese a megorzesen tul.
5. Tmux delivery confirm, marker-confirmation, watchdog, restart vagy pane-health hardening.

### Safety Defaults

1. A rovid runtime severity reminder maradjon inline a handoffban.
2. A teljes policy elerese ne vesszen el: a handoffban kotelezo az explicit snapshot pointer.
3. A handoffbol ebben a fazisban csak a redundans full inline ontology dump tavolithato el.
4. A reviewer operativ utmutatasok (scope, directive, scout, findings, emit workflow) nem gyengulhetnek.
5. Tiltott fallback: ha a handoff compact lesz, az nem jelentheti azt, hogy a canonical policy forras eltunt vagy implicit lett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary-k:
   - reviewer tmux handoff text contract
   - handoff policy pointer data plumbing
   - handoff prompt tesztassert contract

## L1 - Change Contract

### Target-File Reality Check

1. A current-tree primary touchpoint a `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` reviewer PASS action assemblyje.
2. A builder mar megkapja a `BubbleConfig`-ot, amely current-tree szerint tartalmazza az `id` es `repo_path` mezoket; emiatt a policy snapshot pointer valoszinuleg ugyanebben a boundaryben levezetheto.
3. `tmuxDelivery.ts` kulon touchpoint csak akkor indokolt, ha az implementacio soran kiderul, hogy a builder jelenlegi inputja megsem eleg a deterministic abszolut path rendereleshez.
4. Nincs szukseg public CLI, protocol envelope, state machine vagy bubble config schema modositasra.

### Control Model

1. `business_invariant`
   - a reviewer handoffnak eleg informaciot kell adnia a helyes review inditasahoz, de nem kuldhet foloslegesen tobb ezer karakteres inline policy dumpot.
2. `control_model`
   - a canonical teljes reviewer policy a snapshot artifactban van; a handoff inline resze csak rovid reminder + pointer + operativ guidance.
3. `read_path_rule`
   - a full policy olvasasa a snapshot file-bol tortenik; a handoff inline text nem lehet a canonical policy teljes helyettese.
4. `forbidden_fallback`
   - reviewer handoff pathon tilos a `includeFullOntology: true` jellegu fallback, amely ujra visszahozza a teljes inline dumpot.
5. `allowed_resolution_path`
   - rovid runtime reminder inline + explicit `Reviewer policy file: <absolute-path>` pointer + valtozatlan operativ handoff guidance.
6. `missing_data_rule`
   - ez a task nem nyithatja ujra a startup/resume snapshot lifecycle vagy fail-fast szabalyokat; csak a handoff policy-delivery contractot igazithatja.

### Baseline Preservation

1. `must_preserve_behaviors`
   - reviewer handoff tovabbra is explicitten jelzi: friss review induljon
   - reviewer handoff tovabbra is tartalmazza a rovid severity reminder blokkot
   - reviewer handoff tovabbra is tartalmazza a doc-only/code-review fokusz guidance-ot
   - reviewer handoff tovabbra is tartalmazza a reviewer test execution directive-et
   - reviewer handoff tovabbra is tartalmazza a round-local scout / findings / emit workflow guidance-ot
2. `forbidden_regression_interpretations`
   - a compact handoff nem jelenthet policy-gyengitest
   - a full ontology kivetele nem jelentheti azt, hogy a reviewernek nincs canonical policy forrasa
3. `replacement_proof_required_if_removed`
   - ha a full ontology inline dump kikerul, a snapshot pointer jelenlete es abszolut pathja maradjon bizonyithato baseline

### Call-Site Matrix

| ID | File | Contract delta | Priority |
|---|---|---|---|
| CS1 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | reviewer PASS handoff message csak a rovid ontology remindert rendereli; a `Full canonical ontology` szoveg nem jelenhet meg; a policy pointer explicit sor vagy egyertelmu inline token formaban jelenik meg | P1 |
| CS2 | `tests/core/runtime/tmuxDelivery.test.ts` | a fresh reviewer handoff tesztek explicitten assertelik: rovid reminder van, explicit policy pointer van, full ontology nincs, operativ guidance megmarad | P1 |

Implementation note:

1. `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` nem required-now target file.
2. Ha a builder current-tree inputja a megvalositas kozben megsem eleg a pointer deterministic renderelesehez, a task megenged szuk, lokalis adatplumbinget ezen a pathon, de ez ne legyen elore kotelezo scope-allitas.

### Data / Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer PASS handoff policy delivery | rovid reminder + full inline ontology dump + operativ guidance | rovid reminder + explicit snapshot pointer + operativ guidance | `Severity Ontology v1 reminder`, `Reviewer policy file: <absolute-path>`, doc/code scope guidance, reviewer test directive, scout/output/emit guidance | none | bounded text-shape breaking a reviewer PASS handoffon, de nem semantic policy-valtozas | P1 | required-now |
| Policy pointer path shape | startup/resume-only pointer baseline | reviewer handoffban is explicit pointer | `<repo>/.pairflow/bubbles/<bubbleId>/artifacts/reviewer-policy-snapshot.md` abszolut path, lehetoseg szerint a builder meglevo `BubbleConfig.id + repo_path` inputjabol levezetve | none | additive handoff clarity | P1 | required-now |

Normative rules:

1. Reviewer PASS handoff nem tartalmazhat `Full canonical ontology (embedded from` szoveget.
2. Reviewer PASS handoff kotelezoen tartalmazza a `Severity Ontology v1 reminder` blokkot.
3. Reviewer PASS handoff kotelezoen tartalmazza a `Reviewer policy file:` sort.
4. A `Reviewer policy file:` sor pathja kotelezoen abszolut path legyen.
5. A pointer kotelezoen a bubble policy snapshot artifactra mutasson: `<repo>/.pairflow/bubbles/<bubbleId>/artifacts/reviewer-policy-snapshot.md`.
6. A document/code scope selection guidance megmarad.
7. A reviewer test execution directive megmarad.
8. A scout expansion / findings / round-local emit workflow guidance megmarad.
9. Startup/resume prompt contract es a severity ontology helper full-mode contract nem ennek a tasknak a modositasai.

### Shared Contract Compatibility

1. `current_consumers`
   - reviewer tmux handoff runtime
   - reviewer startup/resume promptok (baseline-only, valtozatlanok maradnak)
2. `additive_vs_breaking`
   - bounded breaking a reviewer handoff text shape-re, de nem policy-semantic valtozas
3. `alignment_now_or_later`
   - most csak a handoff compact parity + snapshot pointer alignment tortenik
   - startup/resume marad valtozatlan

### Closure Budget

1. `touched_closures`
   - `internal_execution_consumers`
2. `intentionally_collapsed`
   - nincs
3. `explicitly_deferred`
   - startup/resume policy delivery redesign
   - ontology helper global simplification
   - reviewer workflow guidance tartalmi rewrite
   - tmux delivery hardening / watchdog follow-up

### Bounded Task Shape

1. `primary_shape`
   - `consumer_family_alignment`
2. `secondary_shape`
   - `none`

### Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Fresh reviewer handoff compact policy mode | `reviewer_context_mode=fresh` implementer `PASS` | reviewer delivery render fut | tartalmazza a `Severity Ontology v1 reminder` blokkot es a `Reviewer policy file:` abszolut pointert | P1 | required-now | automated test |
| T2 | Fresh reviewer handoff no inline ontology | `reviewer_context_mode=fresh` implementer `PASS` | reviewer delivery render fut | nem tartalmazza a `Full canonical ontology (embedded from` szoveget | P1 | required-now | automated test |
| T3 | Document-scope handoff preservation | document bubble reviewer handoff | reviewer delivery render fut | a doc-only scope guidance tovabbra is bent marad | P1 | required-now | automated test |
| T4 | Round-local workflow preservation | reviewer handoff current guidance baseline-nal | reviewer delivery render fut | a reviewer test directive, scout workflow, findings/emit guidance es az `Execute pairflow commands directly` instrukcio tovabbra is bent marad | P1 | required-now | automated test |
| T5 | Delivery message still renders pointer without relying on forced extra plumbing | delivery message creation path | accepted vagy rejected delivery message epul | a pointer megmarad anelkul, hogy a full ontology visszajonne fallbackkent; current-tree builder boundary eleg, vagy a spec csak minimalis optional plumbinget enged | P2 | required-now | automated test |

### Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `buildReviewerSeverityOntologyReminder(...)` concise mode a handoff pathon | P1 | required-now |
| must-use | a mar letezo `reviewer-policy-snapshot.md` artifact naming/path baseline | P1 | required-now |
| must-not-use | inline full ontology fallback a reviewer handoff pathon | P1 | required-now |
| must-not-change | startup/resume prompt contract, snapshot lifecycle, severity ontology canonical doc | P1 | required-now |

## Review Control

1. A review ne huzza be ebbe a taskba a startup/resume compact parityt.
2. A review ne kerjen ontology helper cleanupot vagy full-mode kivezetest ebben a fazisban.
3. A review ne kerjen marker-confirmation, watchdog vagy tmux delivery hardening munkat ebben a fazisban.
4. A task csak akkor zarhato, ha a handoffbol tenyleg csak a full ontology dump tunik el, mikozben a reminder, a snapshot pointer es az operativ guidance megmarad.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. a reviewer handoff nem tartalmazza a `Full canonical ontology` inline dumpot,
2. a reviewer handoff tovabbra is tartalmazza a rovid severity reminder blokkot,
3. a reviewer handoff explicit `Reviewer policy file: <absolute-path>` pointert ad a snapshot artifactra,
4. a reviewer handoff tovabbra is tartalmazza a doc/code scope es round-local operativ guidance-ot,
5. a task nem nyitja ujra a startup/resume, watchdog vagy tmux delivery hardening scope-ot.
