---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_surface_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Surface Removal (Phase E)"
status: implementable
phase: phaseE
target_files:
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/ReviewBubble.md
  - src/cli/index.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionParser.ts
  - src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/shared/metaReview/metaReviewCommandApi.ts
  - src/v11/shared/metaReview/metaReviewCommandReadArtifacts.ts
  - src/v11/shared/metaReview/metaReviewCommandReadFreshness.ts
  - src/v11/shared/metaReview/metaReviewCommandReadProjection.ts
  - src/v11/shared/metaReview/metaReviewCommandReadRuntime.ts
  - src/v11/shared/metaReview/metaReviewTypes.ts
  - README.md
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
  - plans/tasks/actor-runtime-interface-meta-review-operator-read-surface-closure-phaseE.md
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts
  - tests/v11/shared/metaReview/metaReviewCommandReadArtifacts.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Surface Removal (Phase E)

## Current Codebase Check (2026-04-11)

1. A repo-local `UsePairflow` skill ma meg explicit `fresh|cached` source modellt dokumental:
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/ReviewBubble.md`
2. A public CLI ma meg retained operator subtree-kent exportalja a cached read surfaces-t:
   - `pairflow bubble meta-review status`
   - `pairflow bubble meta-review last-report`
3. A kapcsolodo application/shared read-model fajlok ma meg teljes parser/dispatcher/types/read-runtime/projection stackot tartanak fenn a cached operator surface-hez.
4. A README es a UI is reklamozza ezt a route-ot:
   - `README.md`
   - `ui/src/components/canvas/BubbleExpandedCard.tsx`
5. A useri direction explicit: nincs backward compatibility budget, nincs "removed" reminder, nincs operator redirect. A vegeredmeny ugy nezzen ki, mintha ez a feature nem lenne a termekben.

## Executive Summary

1. Ez a task a cached meta-review functionality teljes delivery/removal szelete.
2. A ket foundation task utan ez torli:
   - a `ReviewBubble --meta-review-source=cached` workflowt,
   - a teljes `pairflow bubble meta-review` public operator namespace-t,
   - a `status` / `last-report` read-model/application stackot,
   - az osszes aktiv docs/UI/skill/test hivatkozast, amely ezt ma elerheto surface-kent kezeli.
3. A task szandekosan nem ad removal-guidance compatibility shimet. A torolt surface-ek egyszeruen ne letezzenek tovabb.

## L0 - Policy

### Goal

Torolje a cached meta-review functionality minden public/operator/docs/UI/skill/test surface-et ugy, hogy a kodbazisban es a repo-local dokumentacioban ne maradjon olyan aktiv felulet, amely a `cached` modot vagy a `status` / `last-report` meta-review commandokat elo feature-kent kezeli.

### In Scope

1. A `ReviewBubble` workflow interface simplifikalasa ugy, hogy megszunik a `--meta-review-source` valaszto es csak a friss, direkt review path marad.
2. A teljes `pairflow bubble meta-review` CLI namespace torlese a parser/help/dispatcher/export surface-rol.
3. A cached read-model/application/shared runtime fajlok es tipusok torlese.
4. A README, repo-local skill, UI prompt es relevans plan/task docs cleanupja.
5. A cached surface-hez tartozo tesztek torlese vagy szukitett atirasa.

### Out of Scope

1. A canonical `pairflow agent emit --kind meta_review_result` write surface valtoztatasa.
2. A live meta-review gate routing vagy approval policy atirasa.
3. A foundation taskokban kezelt state/control-path source-of-truth atalakitas megismetelese.
4. Uj operator replacement surface bevezetese a torolt `bubble meta-review` namespace helyere.

### Safety Defaults

1. Nincs backward compatibility:
   - nincs removed-command shim,
   - nincs explicit CLI help reminder,
   - nincs docs guidance arrol, hogy "helyette ezt hasznald", kiveve a mar meglevo canonical `agent emit` surface altalanos dokumentalasat ott, ahol az egyebkent is a termek resze.
2. A torolt surface-ekhez tartozo teszteket torolni kell, nem removal behaviorre atirni.
3. A repo-local skill a task utan nem teheti lehetove a `cached` source modot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI/interface contract,
   - repo-local skill workflow contract,
   - UI-generated user prompt contract,
   - docs command surface contract.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `2`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split note:
   - Ez a task csak a ket kulon specifikalt foundation task utan hajthato vegre.
10. Identity/join note:
   - canonical identity path: `ReviewBubble -> fresh direct review`, `CLI -> no meta-review subtree`
   - competing identifiers or fallback identities: `--meta-review-source=cached`, `bubble meta-review status`, `bubble meta-review last-report`
11. Authority/source-of-truth note:
   - canonical source: a live workflow es a fennmarado product command surface
   - forbidden secondary sources: retained cached operator projection, removed-command guidance text

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/UsePairflow/SKILL.md`, `.claude/skills/UsePairflow/Workflows/ReviewBubble.md` | ReviewBubble workflow contract | docs/workflow interface | skill docs | A workflowbol tunjon el a `--meta-review-source` flag, a `fresh|cached` mode matrix, es minden `pairflow bubble meta-review *` callout. | P1 | required-now | docs diff |
| CS2 | `ui/src/components/canvas/BubbleExpandedCard.tsx` | copied review prompt builder | `copyBubbleId() -> Promise<void>` | UI prompt copy | A masolt review prompt ne tartalmazza a `--meta-review-source=cached` kapcsolot vagy barmilyen cached meta-review utalast. | P1 | required-now | UI test |
| CS3 | `src/cli/index.ts`, `src/cli/commands/bubble/metaReview.ts` | bubble CLI routing/export | top-level CLI dispatch -> no meta-review subtree | CLI entrypoint | A `bubble meta-review` namespace teljesen tunjon el a public CLI-bol. Ne maradjon parser/export/help/placeholder branch. | P1 | required-now | CLI tests |
| CS4 | `src/v11/application/metaReview/*`, `src/v11/shared/metaReview/metaReviewCommandApi.ts`, `src/v11/shared/metaReview/metaReviewCommandReadArtifacts.ts`, `src/v11/shared/metaReview/metaReviewCommandReadFreshness.ts`, `src/v11/shared/metaReview/metaReviewCommandReadProjection.ts`, `src/v11/shared/metaReview/metaReviewCommandReadRuntime.ts`, `src/v11/shared/metaReview/metaReviewTypes.ts` | cached read-model/application stack | parser/dispatcher/read runtime/types -> deleted or detached | meta-review application surface | A cached `status` / `last-report` read stack torlodjon; a marado meta-review code csak a live/canonical submit-gate pathokra vonatkozzon. | P1 | required-now | build + import cleanup |
| CS5 | `README.md`, `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`, `plans/tasks/actor-runtime-interface-meta-review-operator-read-surface-closure-phaseE.md` | repo-local docs / plan references | docs | docs cleanup | Az aktiv docs ne hivatkozzanak elerheto cached meta-review surface-re; a historical task/plan docs legfeljebb historical contextkent maradhatnak, de ne tartsanak fenn aktiv operator feluletet. | P1 | required-now | docs diff + grep |
| CS6 | tests | cached surface regression coverage | `vitest` coverage | regression surface | A cached surface-hez tartozo tesztek torlodjenek vagy az uj surface-hez igazodjanak; removal-specific compatibility assertion nem maradhat. | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| ReviewBubble workflow args | `--meta-review-source fresh\|cached` | no source selector; direct review only | `--id`, existing remaining args | existing non-cached args | breaking interface removal | P1 | required-now |
| Public CLI namespace | `pairflow bubble meta-review status|last-report` | no `bubble meta-review` public subtree | none | none | breaking interface removal | P1 | required-now |
| Meta-review read-model types | `MetaReviewStatusView`, `MetaReviewLastReportView` | removed | none | none | breaking internal API removal | P1 | required-now |
| UI copied prompt | cached source flag embedded | plain review prompt without cached flag | bubble id | mode wording if retained | breaking UX copy simplification | P2 | required-now |
| Docs contract | README/skill/docs advertise cached surface | docs describe only retained live surfaces | canonical active commands only | none | breaking docs cleanup | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI/docs/UI | delete surface and update text/tests accordingly | removal-warning shim or compatibility redirect | "as if it never existed" is the governing rule | P1 | required-now |
| Shared/application code | delete unused read-model/runtime files | keeping dead projection code for historical traceability | history belongs in git, not in retained code | P1 | required-now |
| Skill docs | repo-local source-of-truth update | editing only global installed copy | `.claude/skills/UsePairflow/**` is the source of truth | P1 | required-now |

Constraint: this task must not preserve cached functionality by renaming it, hiding it behind help text, or keeping "removed surface" explanatory branches.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| User invokes removed `bubble meta-review` path after removal | CLI parser | result | generic unknown-command behavior only; no dedicated removal help | N/A | info | P2 | required-now |
| Cached-surface docs/tests still remain after code removal | repo grep/build/tests | throw | update or delete remaining references before merge | N/A | warn | P1 | required-now |
| Build/import fails because deleted read-model files are still referenced | TS build | throw | remove dangling imports; do not re-export deleted surface | N/A | error | P1 | required-now |
| Skill sync not yet run | local repo source update only | result | repo-local task closes with explicit note that global sync is follow-up operational step | N/A | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | foundation task outputs: `plans/tasks/actor-runtime-interface-meta-review-cached-state-shape-and-persistence-decoupling-phaseE.md`, `plans/tasks/actor-runtime-interface-meta-review-cached-approval-and-projection-consumer-cutover-phaseE.md` | P1 | required-now |
| must-use | repo-local skill source files under `.claude/skills/UsePairflow/**` | P1 | required-now |
| must-not-use | `pairflow bubble meta-review` placeholder help text | P1 | required-now |
| must-not-use | `--meta-review-source=cached` in any repo-local workflow, docs, UI copy, or tests | P1 | required-now |
| must-not-use | removal-compatibility assertions in CLI or docs | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | ReviewBubble workflow no longer exposes cached mode | repo-local skill docs | workflow docs are rendered/read | no `--meta-review-source`, no `fresh|cached` matrix, no `pairflow bubble meta-review *` usage | P1 | required-now | docs diff |
| T2 | Public CLI no longer has meta-review subtree | built CLI sources | help/dispatch paths are exercised | no `bubble meta-review` route is present in parser/dispatcher/help | P1 | required-now | automated test |
| T3 | Cached read-model stack is removed cleanly | application/shared meta-review modules | build/test runs | no dangling imports or retained `MetaReviewStatusView` / `MetaReviewLastReportView` read path | P1 | required-now | build + automated test |
| T4 | UI copied review prompt is fresh-only | bubble card UI fixture | copy prompt action runs | copied text contains no cached flag or cached wording | P2 | required-now | automated test |
| T5 | Active docs no longer advertise cached surface | README + active plan/task docs | grep/doc review runs | no active doc treats cached meta-review or `status` / `last-report` as available feature | P1 | required-now | grep + docs diff |
| T6 | Removal is not implemented as compatibility messaging | CLI/docs tests | removed surface is exercised or inspected | no dedicated "removed" guidance text remains | P1 | required-now | automated test / grep |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Historical archive docs teljes sweepje kulon docs-hygiene follow-up lehet, ha a required-now grep mar csak archive-only textual residue-t hagy.
2. [later-hardening] A `src/v11/application/metaReview/**` directory a removal utan tovabbi ownership cleanupot igenyelhet, ha tul keves marado file marad benne.

## Assumptions

1. A ket foundation task mar lezarta a cached state/control-path dependence megszunteteset, igy a public surface most mar torolheto runtime regresszio nelkul.
2. A generic CLI unknown-command behavior elfogadhato default a torolt namespace helyen; nem kell kulon user guidance.

## Open Questions

1. Nincs blocker open question. A task szandekosan removal-first, compatibility-budget nelkuli policyval keszult.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | archive-only textual residue sweep a historical docsban | L2 | P2 | later-hardening | task authoring | kulon docs-hygiene follow-up csak akkor, ha a required-now active docs cleanup utan meg mindig zavar a historical text noise |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
