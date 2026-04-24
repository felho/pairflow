---
artifact_type: task
artifact_id: task_commit_snapshot_foundation_and_local_done_package_input_decoupling_phase1a_v1
title: "Commit Snapshot Foundation And Local Done-Package Input Decoupling (Phase 1A)"
status: implementable
phase: phase1a
target_files:
  - src/types/protocol.ts
  - src/v11/shared/protocol/validators.ts
  - src/v11/application/commit/commitCliCommand.ts
  - src/v11/application/commit/commitCommandApi.ts
  - src/v11/application/commit/commitCommandFinalization.ts
  - src/v11/application/commit/commitDonePackage.ts
  - src/v11/shared/commit/commitCommandFinalizationMutation.ts
  - src/cli/index.ts
  - tests/core/bubble/commitBubble.test.ts
  - tests/v11/application/commit/commitCliEntrypointParity.test.ts
  - tests/v11/application/commit/commitCommandApi.test.ts
  - tests/cli/bubbleCommitCommand.test.ts
  - tests/contracts/v11/commit.contract.runner.ts
  - tests/contracts/v11/commit.contract.test.ts
  - docs/pairflow-initial-design.md
  - docs/llm-doc-workflow-v1.md
  - README.md
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
prd_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - README.md
  - plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
owners:
  - "felho"
---

# Task: Commit Snapshot Foundation And Local Done-Package Input Decoupling (Phase 1A)

## Current Codebase Check (2026-04-24)

1. A current treeben a commit transcript tail ma `DONE_PACKAGE`, es a local commit path summary-derivationre ul.
2. Ugyanakkor a `done-package` mar nem tisztan local commit input:
   - remote continuity
   - retained result contracts
   - start/resume completion guidance
3. A retained remote consume family ma explicit `DONE_PACKAGE` transcript tailt var, ezert a hard active envelope cutover nem Phase 1A ownership.
4. Ezert a Phase 1A nem retirement task, hanem foundation-only slice: commit snapshot foundation + local input-decoupling, preserved compat surface mellett.

## Closed-Contract Source Anchors

1. `source_anchors`
   - `src/types/protocol.ts`: az active protocol type family jelenleg explicit `DONE_PACKAGE` tipust tartalmaz.
   - `src/v11/shared/commit/commitCommandFinalizationMutation.ts`: a local commit append path ma `DONE_PACKAGE` envelope-ot ir transcriptbe, `done_package_path`, `commit_message`, `commit_sha` metadata mellett.
   - `src/v11/application/commit/commitDonePackage.ts`: a retained compat artifact materialization/local done-package handling authority itt el, ezert a missing/empty input tolerancia es a successful commit utani compat artifact guarantee closurejahoz ez is explicit Phase 1A anchor.
   - `src/v11/application/commit/commitCommandApi.ts`: a local route ma `done-package.md` artifactot olvas/auto-general commit elott, a remote route pedig explicit `done-package` continuity sync-backot ownershipol.
   - `src/cli/index.ts`, `tests/core/bubble/commitBubble.test.ts`, `tests/v11/application/commit/commitCommandApi.test.ts`, `tests/contracts/v11/commit.contract.runner.ts`: a current CLI/test baseline explicit `DONE_PACKAGE` es `done-package.md` continuity invariantokra ul.
2. `canonical_elements_introduced_in_phase`
   - `COMMIT_SNAPSHOT` additive foundation contract a local commit first-party tenyeinek leirasara.
   - canonical snapshot fieldset minimuma: `commit_sha`; optionalis git fact: `commit_message`.
3. `compat_elements_preserved_in_phase`
   - active emitted `DONE_PACKAGE` transcript tail
   - retained `donePackagePath`
   - retained `artifacts/done-package.md`
4. `closed_terms`
   - `COMMIT_SNAPSHOT`
   - `DONE_PACKAGE`
   - `donePackagePath`
   - `done-package.md`
5. `forbidden_reinterpretations`
   - a `COMMIT_SNAPSHOT` nem irhatja felul wordinggel azt a current baseline-t, hogy a sikeres local commit aktiv transcript tailja ma meg `DONE_PACKAGE`
   - a `COMMIT_SNAPSHOT` closed additive vocabulary ebben a fazisban; nem vezetheto be melle uj implicit alias vagy felig-atallt replacement terminology
   - a retained compat artifact nem minositheto Phase 1A-ban torolheto vagy opcionis successor-consumer surface-nek

## L0 - Policy

### Goal

1. A fazis vezesse be a `COMMIT_SNAPSHOT` foundation contractot es a canonical commit snapshot fieldsetet.
2. A canonical commit snapshot payload csak first-party commit tenyeket hordozzon.
3. A local commit path ne koveteljen non-empty `done-package.md` artifactot mint commit inputot.
4. A successful local commit utan a retained `done-package` artifact es `donePackagePath` consume surface ebben a fazisban preserved compat contract maradjon.
5. A retained remote/UI/start consume familyk active envelope cutoverja ne csuszhasson be csendben ebbe a fazisba.

### In Scope

1. Protocol/message foundation:
   - `COMMIT_SNAPSHOT` type es validator support bevezetese
2. Local commit snapshot payload simplification:
   - `commit_sha`
   - opcionisan `commit_message`, ha kozvetlen git fact
3. Local commit flow input-decoupling:
   - commit ne bukjon meg csak azert, mert a `done-package.md` hianyzik vagy ures
4. Preserved compat artifact guarantee:
   - successful commit utan a retained `done-package.md` tovabbra is materializalodik / megmarad
5. CLI/docs/tests frissitese a commit snapshot foundation vocabularyra

### Out Of Scope

1. `donePackagePath` result contract torlese
2. remote commit continuity rewrite vagy active remote envelope cutover
3. UI result contract rewrite
4. start/resume completion-artifact rewrite
5. nem-commit workflow `artifact://done-package.md` ref cleanup
6. `done-package` compat artifact teljes retirementje
7. global hard rename, amely minden retained consumerre azonnal `COMMIT_SNAPSHOT` tailt kenyszerit

### Safety Defaults

1. Phase 1A utan a `done-package` csak retained compat artifact lehet, nem canonical commit summary source.
2. A retained consumer familykhez nem nyulhatunk ebben a taskban.
3. Ha barmely retained consumer meg explicit `DONE_PACKAGE` transcript tailra ul, Phase 1A nem kenyszeritheti ki a hard active envelope cutovert.
4. A `COMMIT_SNAPSHOT` ebben a fazisban foundation contract; az active emitted envelope cutover csak explicit successor ownership mellett tortenhet meg.
5. Addig, amig a successor taskok nem erkeznek meg, a retained `donePackagePath` es a kapcsolodo artifact megmaradhat continuity/compat szerepben.
6. A successful local commit utan a compat artifact presence tovabbra is garantalt.
7. A shared commit result contract surface (`commitCommandContract.ts`, `commitCommandApiContract.ts`, UI result shape) ebben a fazisban no-touch baseline.
8. A remote continuity consume branch ebben a fazisban no-touch baseline, akkor is, ha mixed entrypoint fajlban lokalisan mellette letezik touched local ag.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett boundary-k:
   - protocol envelope type contract
   - local commit runtime canonicalization
   - CLI/docs commit semantics

### Authority Boundary Map

1. `authority_producer`
   - local commit transcript append + local commit state finalization
2. `stored_authority`
   - protocol envelope type family
   - local transcript tail
   - local state transition proof
3. `in_scope_consumers`
   - local commit producer path
   - local CLI wording/tests/docs
4. `explicit_out_of_scope_consumers`
   - shared commit result contract surface
   - remote continuity consume
   - UI commit result consume
   - start/resume completion consume
   - non-commit retained done-package refs
5. `export_surfaces_closed_in_phase`
   - no
   - Phase 1A nem ownershipolja a shared/exported result contract replacementet

## L1 - Change Contract

### Call-Site Matrix

| ID | File | Contract delta | Priority |
|---|---|---|---|
| CS1 | `src/types/protocol.ts` | `COMMIT_SNAPSHOT` protocol foundation bejon az active type familybe anelkul, hogy retained consumereket csendben torjon | P1 |
| CS2 | `src/v11/shared/protocol/validators.ts` | validator support az uj type-ra, compat preserved envelope reality mellett | P1 |
| CS3 | `src/v11/application/commit/commitCommandFinalization.ts`, `src/v11/shared/commit/commitCommandFinalizationMutation.ts` | csak a local producer slice touched: a local commit snapshot facts mar nem a `done-package` summarybol szarmaznak, mikozben az active appended envelope type Phase 1A-ban tovabbra is `DONE_PACKAGE`; remote sync/continuity consume branch no-touch marad | P1 |
| CS4 | `src/v11/application/commit/commitDonePackage.ts`, `src/v11/application/commit/commitCommandApi.ts` | csak a local pre-commit / local finalization path touched: a local commit flow nem koveteli a non-empty `done-package.md` inputot, de successful commit utan a compat artifact megmarad/materializalodik; a remote commit route es sync-back semantics no-touch maradnak | P1 |
| CS5 | `src/v11/application/commit/commitCliCommand.ts`, `src/cli/index.ts` | CLI wording a snapshot-foundation szemantikahoz igazodik, hard global cutover claim nelkul | P2 |
| CS6 | tests + docs | a commit snapshot foundation es a preserved compat boundary egyszerre latszik | P1 |

### Closure Budget

1. `touched_closures`
   - `authority_producer`
   - `shared_contract` (protocol type family foundation szinten)
2. `intentionally_collapsed`
   - `authority_producer` + protocol foundation
   - ez safe, mert ugyanaz a local commit producer path ownershipolja, es nincs kulon retained consumer activation ebben a fazisban
3. `explicitly_deferred`
   - shared exported result contract alignment
   - remote continuity consume alignment
   - UI/start/non-commit retained consumer alignment
   - compat retirement

### Bounded Task Shape

1. `primary_shape`
   - `contract_or_persisted_authority_foundation`
2. `secondary_shape`
   - `authority_producer`
3. `why_safe`
   - ugyanaz a local commit producer path zarja a protocol foundation bevezetesi pontjat es a local input-decouplinget
   - nincs kulon consumer-family activation vagy read-model alignment ebben a fazisban

### Precondition And Side-Effect Boundary

1. `validations_before_irreversible_side_effects`
   - staged/local commit preconditions tovabbra is a git commit elott ervenyesulnek
   - a missing/empty `done-package` Phase 1A-tol nem blocker validation
2. `required_side_effect_ordering`
   - ha a commit flow compat artifactot materializal, annak a local commit success proofhoz rendezettnek kell maradnia
   - Phase 1A nem tolhatja at a compat artifact guarantee-t egy kesobbi remote/export consumerre
3. `forbidden_early_side_effects`
   - invalid local commit preconditions nem okozhatnak uj transcript/state success proofot
   - remote continuity branch nem valhat touched recovery felulette ebben a fazisban
4. `coordination_primitives`
   - N/A
   - uj coordination/serialization szabaly nincs scope-ban

### Normative Rules

1. `COMMIT_SNAPSHOT` payload nem tartalmazhat generated summary/prose adatot.
2. A canonical payload kotelezo minimuma `commit_sha`.
3. `commit_message` csak kozvetlen git factkent maradhat.
4. Phase 1A nem torolheti a retained `donePackagePath` consume contractot.
5. Phase 1A nem nyithat uj replacement contractot a retained consumer familyknek; azt a successor task ownershipolja.
6. Ha a current consumer baseline explicit `DONE_PACKAGE` tailt var, akkor a Phase 1A active emitted envelope cutoverja tilos.
7. A local commit input-decoupling nem gyengitheti a successful commit utani compat artifact guarantee-t.
8. A shared commit result contract shape nem valtozhat ebben a fazisban.
9. Mixed entrypoint fajlban csak a local producer slice touched; a remote continuity consume branch explicit no-touch.
10. A `src/v11/shared/commit/commitCommandFinalizationMutation.ts` appended envelope type-ja Phase 1A-ban retained `DONE_PACKAGE` baseline marad; a `COMMIT_SNAPSHOT` additive foundation, nem active tail replacement.
11. A CLI/human-readable wording Phase 1A-ban nem allithat teljes envelope/result cutovert, amig a transcript/result baseline retained `DONE_PACKAGE`-on ul.

### Test Matrix

| ID | Scenario | Then | Priority |
|---|---|---|---|
| T1 | protocol foundation added | `COMMIT_SNAPSHOT` elfogadott protocol/validator type, retained `DONE_PACKAGE` baseline nem torik ettol meg | P1 |
| T2 | local commit no longer requires done-package input | local commit sikeres missing/empty `done-package.md` mellett is | P1 |
| T3 | compat artifact preserved on successful commit | successful commit utan a retained `done-package.md` tovabbra is letezik/materializalodik | P1 |
| T4 | snapshot payload excludes generated summary | a snapshot foundation payloadban nincs summary bundle / derived prose | P1 |
| T5 | CLI/docs wording update | a szoveg snapshot-foundation vocabularyra all at hard global cutover claim nelkul | P2 |
| T6 | retained compat untouched | a retained `donePackagePath` consume contract es explicit `DONE_PACKAGE`-ra ulo consumerek ebben a taskban nem tornek | P1 |
| T7 | shared contract untouched | a shared commit result contract shape ebben a fazisban nem valtozik | P1 |
| T8 | remote branch no-touch | mixed entrypoint fajlok local valtozasai mellett a remote continuity baseline regresszio nelkul marad | P1 |
| T9 | active local transcript tail preserved | successful local commit utan az appended envelope/tail baseline tovabbra is `DONE_PACKAGE`, akkor is ha a `COMMIT_SNAPSHOT` foundation mar jelen van | P1 |

## L2 - Implementation Notes (Optional)

### Preferred Edit Order

1. Eloszor az additive protocol/validator foundation zarjon: `COMMIT_SNAPSHOT` type + validator support explicit fieldsettel.
2. Ezutan a local commit producer truth valjon le a `done-package` summary-rol ugy, hogy a commit fact sourcing csak first-party git/state/transcript tenyekre uljon.
3. Csak ezutan lazulhat a local missing/empty `done-package` precondition, mikozben a successful commit utani compat artifact materialization/presence guarantee megmarad.
4. A CLI/docs/tests wording legyen az utolso lepes, es explicit jelezze az additive foundation + retained `DONE_PACKAGE` baseline kombinaciot.

### Explicit No-Touch Guidance

1. A `commitCommandApi.ts` remote route-ja es a remote sync-back continuity ownership Phase 1C feladata; ne legyen opportunista mellekvaltozas Phase 1A-ban.
2. A `commitCommandFinalizationMutation.ts` active emitted envelope replacementje nem Phase 1A scope; itt csak a local truth-forras es input gate valhat kesobbi cutoverre alkalmassa.
3. A shared completion-artifact/result contract foundation (`commitCommandContract.ts`, `commitCommandApiContract.ts` es minden additive shared/exported replacement field) Phase 1B ownership; nem Phase 1A local task-resolve.
4. A retained UI/start/non-commit consumer alignment (`UI result shape`, start/resume completion consume, nem-commit retained done-package refs) Phase 1D ownership; ne legyen Phase 1A opportunista cleanup vagy wording-cutover.

### Successor Boundary Reminder

1. Ha a megvalositas uj shared completion-artifact/result fieldet igenyel, az Phase 1B route-back trigger, nem Phase 1A belso reszlete.
2. Ha a megvalositas remote consume vagy sync-back formatumot akar megmozditani, az Phase 1C trigger.
3. Ha a megvalositas retained UI/start/non-commit consumer alignmentet vagy wording-cutovert igenyel, az Phase 1D trigger.

## Review Control

1. A review ne probalja ebbe a taskba behuzni a remote/UI/start consume alignmentet.
2. Ha a megoldas a retained `done-package` compat surface torleset igenyli, az scope violation.
3. A task csak akkor zarhato, ha a local commit truth mar levallt a prose summaryrol, mikozben a retained consumerek nem tornek.
4. Ha a javasolt megoldas hard active envelope cutovert igenyel a retained consumer baseline elleneben, az refine/split trigger.
5. Ha a megoldas shared result contract delta-t igenyel, az Phase 1B ownership es scope violation.
6. Ha a megoldas remote continuity branch valtoztatast igenyel, az Phase 1C ownership es scope violation.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:
1. a `COMMIT_SNAPSHOT` foundation contract es snapshot fieldset expliciten be van vezetve,
2. a local commit path mar nem fugg a non-empty `done-package` inputtol,
3. a snapshot payload nem hordoz generated summary/prose adatot,
4. a successful local commit utani retained `done-package` / `donePackagePath` compat surface meg nem torik el ebben a fazisban,
5. az active emitted envelope cutover nincs csendben ebbe a fazisba huzva, ha retained consumer meg explicit `DONE_PACKAGE` baseline-on ul,
6. a `src/v11/shared/commit/commitCommandFinalizationMutation.ts` appended envelope type-ja tovabbra is retained `DONE_PACKAGE` baseline marad, vagyis a `COMMIT_SNAPSHOT` additive foundationkent jelenik meg, nem active tail replacementkent,
7. a CLI/human-readable wording nem allit teljes envelope/result cutovert, amig a transcript/result baseline retained `DONE_PACKAGE`-on ul,
8. a shared commit result contract shape, a remote continuity branch, valamint a retained UI/start/non-commit consumer family no-touch baseline marad Phase 1A-ban.
