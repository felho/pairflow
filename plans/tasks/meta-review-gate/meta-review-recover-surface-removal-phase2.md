---
artifact_type: task
artifact_id: task_meta_review_recover_surface_removal_phase2_v1
title: "Meta-Review Recover Surface Removal (Phase 2)"
status: implementable
phase: phase2
target_files:
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts
  - src/cli/index.ts
  - docs/meta-review-gate-prd.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/meta-review-gate-e2e-validation.md
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/cli/index.test.ts
  - tests/core/runtime/metaReviewSubmitGuidance.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts
prd_ref: null
plan_ref: plans/meta-review-recover-and-reconcile-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recover Surface Removal (Phase 2)

## Current Codebase Check (2026-04-10)

1. A public/operator `recover` surface jelenleg nem csak a dispatcher/help/CLI entryben jelenik meg, hanem a parser/type layerben es tobb CLI/help parity tesztben is.
2. A live public recover surface a parser/render/helper retegekben is szetszorodik: a `metaReviewCliOptionParserHelpers.ts`, `metaReviewCliRenderersHelpers.ts`, `metaReviewCliRenderers.ts`, es `metaReviewCliCommand.ts` fajlok tovabbra is reszei a tenyleges operator grammar/render pathnak.
3. A jelenlegi public route az `emitMetaReviewGateV11.ts` recover facade-jere tamaszkodik; a Phase 1 utan ez legfeljebb nem-public residualis overlap-allapot lehet, amit itt teljesen el kell tavolitani.
4. A docs meg aktiv supported remediationkent irjak le a snapshot-route replayt, ezert Phase 2-nek a help/parser/render/docs/tests teljes operator surface-et szinkronban kell takaritania.

### Implementation Target Decision

1. `implementable_now`: `yes`
2. A chosen seam ebben a taskban: a public/operator `recover` surface teljes megszuntetese a parser/render/help/docs/tests es a V11/shared export retegen.
3. A removed-command boundary explicit legyen:
   - nincs `recover` parse branch vagy union-tag,
   - nincs dispatcher/help row vagy compatibility alias,
   - a top-level CLI invalid/unsupported subcommandkent kezeli a hivatkozast, ujraroute nelkul.
4. Ha a Phase 1 utan barmely recover-nevkoru overlap fajl technikailag meg letezik, a Phase 2 ownership teljes torlest jelent:
   - nincs retained `recoverMetaReviewGateFromSnapshotV11(...)` export,
   - nincs shared facade surface, amely publikus recover kepesseget sugall,
   - nincs docs/help/example, amely ezt tamogatott remediationkent allitja.
5. A Phase 2 nem valtoztatja meg a Phase 1 fail-closed runtime baseline-t; ezt kesz upstream authoritykent hasznalja, es csak a public/operator contract cleanupot zarja le.

## L0 - Policy

### Goal

Tavolitsa el a public/operator `pairflow bubble meta-review recover` surface-t, es minden docs/help/test helyen tegye explicitte, hogy a tamogatott remediation `restart` vagy uj meta-review futtatas.

### In Scope

1. `recover` CLI parser/dispatcher/render/help surface torlese.
2. A recover-nevkoru lingering export/residual overlap teljes torlese a V11/shared facade surface-rol.
3. PRD/runbook/e2e/docs allitasok frissitese.
4. CLI es contract tesztek igazitasa az uj, recover-mentes public surface-hez.

### Out of Scope

1. Internal runtime finalize logic tovabbi valtoztatasa.
2. Uj operator command bevezetese `recover` helyett.
3. Restart command szemantika ujratervezese.

### Safety Defaults

1. Nem maradhat hidden alias, no-op vagy retained wrapper a `recover` command helyen.
2. A docs nem allithatjak, hogy snapshot-route replay tamogatott remediation.
3. A user-visible guidance explicit legyen: `restart` vagy uj meta-review futtatas.
4. Ha Phase 1 utan recover-nevkoru residualis overlap marad a fajlokban, azt Phase 2-ben teljesen el kell tavolitani; nem maradhat unsupported, de meg letezo public recover surface.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI grammar/help contract,
   - operator documentation contract,
   - contract/e2e expectation surface,
   - residualis overlap/export cleanup a public surface vegleges torlesehez.

### Phase Boundary Ledger

| Decision Surface | Owner Artifact | This Task's Requirement | Forbidden Overreach |
|---|---|---|---|
| belso replay runtime eltavolitasa | Phase 1 | Phase 2 ezt mar kesz baseline-kent feltetelezi | belso runtime redesign visszahuzasa ide |
| public `bubble meta-review recover` parser/render/help/dispatcher/CLI grammar | ez a task | `recover` teljes megszuntetese a public surface-rol | hidden alias vagy unsupported public stub meghagyasa |
| docs/operator remediation wording | ez a task | `restart` vagy uj meta-review futtatas marad egyeduli tamogatott guidance | uj operator workflow tervezese |
| Phase 1 utan megmaradt recover-nevkoru residualis overlap | ez a task | teljes torles a facade/shared export surface-rol | barmilyen public recover maradek megtartasa |

### Phase Entry Gate

Phase 2 nem kezdodhet meg, es a task nem tekintheto nyitottnak, amig az alabbi allitasok mindegyike nem igaz:

1. a Phase 1 mar explicitten kijelolte a public/shared overlap fajlokat es azok Phase 1 runtime-only ownershipet a `Cross-Phase Overlap Ledger` szintjen: `plans/tasks/meta-review-gate/meta-review-recover-runtime-removal-phase1.md`,
2. a Phase 1 mar explicitten kimondja a `Phase 1 -> Phase 2 Transition Gate` szakaszban, hogy nincs accepted retained public/operator recover koztes allapot; legfeljebb nem-public residualis overlap maradhat fajlszinten: `plans/tasks/meta-review-gate/meta-review-recover-runtime-removal-phase1.md`,
3. a Phase 1 validation/evidence contract mar kimondja a `Validation / Evidence Matrix` es a `must-use` dependency rows alatt, hogy a replay-kepes recover runtime, a `recoverMetaReviewGateFromSnapshot` seam es a `finishIncompleteActorResult` reconcile kernel eltunt a belso grafbol: `plans/tasks/meta-review-gate/meta-review-recover-runtime-removal-phase1.md`,
4. a Phase 2 ebbol a baseline-bol indulva kizarolag a parser/render/help/docs/export teljes public/operator torleset vegzi el.

### Cross-Phase Overlap Ledger

| File | Upstream Phase 1 baseline | Phase 2 ownership |
|---|---|---|
| `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` | recover-nevkoru wiring legfeljebb nem-public residualis overlap lehet | lingering public/operator recover facade teljes torlese |
| `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts` | Phase 1 mar nem hagy meaningful runtime recover authorityt | barmely megmaradt recover export/public contract torlese |
| `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts` | Phase 1 utan nincs replay-kepes recover runtime ownership | megmaradt recover runtime/export surface teljes eltavolitasa |
| `src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts`, `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts`, `src/v11/application/metaReview/metaReviewCliRenderers.ts`, `src/v11/application/metaReview/metaReviewCliCommand.ts` | Phase 1 nem birtokolja a public parser/render grammar cleanupot | Phase 2 explicitten torli a megmaradt public recover parser/render/help surface-et |
| `docs/meta-review-gate-prd.md`, `docs/meta-review-gate-rollout-runbook.md`, `docs/meta-review-gate-e2e-validation.md` | Phase 1 nem update-li a public/operator wordingot | Phase 2 restart/new-run-only operator guidance-ra allitja at |

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: public CLI subtree `bubble meta-review`
   - competing identifiers or fallback identities: hidden alias vagy residualis recover export
10. Authority/source-of-truth note:
   - canonical source: actual supported operator commands after Phase 1
   - forbidden secondary sources: stale docs/help/examples claiming `recover`

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts`, `src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts`, `src/v11/application/metaReview/metaReviewCliOptionTypes.ts`, `src/v11/application/metaReview/metaReviewCliTypes.ts` | CLI parser/dispatcher routing | `dispatchMetaReviewCommand(...) -> Promise<...>` + parser helpers + meta-review option/type unions | command branch table + parser/type surface | nincs `recover` dispatch branch, parser helper branch, vagy `command: "recover"` public union | P1 | required-now | T1, T2b |
| CS2 | `src/v11/application/metaReview/metaReviewCliOptions.ts`, `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts`, `src/v11/application/metaReview/metaReviewCliRenderers.ts`, `src/v11/application/metaReview/metaReviewCliCommand.ts`, `src/cli/index.ts` | help text + render path + top-level CLI handling | `getBubbleMetaReviewHelpText() -> string`, renderer/helper projection, existing top-level CLI entry | help/render/operator surface | a helpbol es render pathbol eltunik a `recover`; a top-level CLI unknown/unsupported subcommandkent kezeli | P1 | required-now | T1, T2a, T2b |
| CS3 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts` | lingering recover export cleanup | `recoverMetaReviewGateFromSnapshotV11(...)` es shared export surface | V11/shared facade layer | barmely residualis recover export is megszunik; a public/operator surface mogott sem marad recover export | P1 | required-now | T2c |
| CS4 | `docs/meta-review-gate-prd.md`, `docs/meta-review-gate-rollout-runbook.md`, `docs/meta-review-gate-e2e-validation.md` | docs surface | docs text | operator docs | nincs snapshot-route recovery claim; restart/new-run guidance marad | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Public CLI grammar | `status`, `last-report`, `recover` | `status`, `last-report` | existing status/report flags | none | breaking-by-design | P1 | required-now |
| Public shared/V11 recover export | residualis overlap/export vagy replay-kepes facade | removed | N/A | N/A | breaking-by-design | P1 | required-now |
| Operator remediation docs | recover/replay mentioned | restart/new-run only | concrete command guidance | rationale | user-visible clarification | P1 | required-now |

Normative rules:

1. Phase 2 utan sem a parser/type layer, sem a dispatcher/help, sem a V11/shared facade nem tartalmazhat `recover` subcommandot vagy exportot.
2. A public `recover` eltavolitasa teljes torles legyen, ne unsupported-but-documented vagy hidden alias.
3. A `status` es `last-report` projection surface valtozatlanul megmarad.
4. A removed-command UX explicit invalid/unsupported public boundary legyen; a task nem hagyhat hatra silent reroute-ot vagy implicit `restart` helyettesitest.
5. AC2 akkor teljesul, ha a public boundary megfigyelheto szerzodese is rogzitett:
   - a CLI non-zero exit code-dal ter vissza,
   - a hiba uzenet `stderr`-en vagy a meglvo invalid-command output channelen jelenik meg,
   - a szoveg explicitten jelzi, hogy a `recover` nem tamogatott, es legfeljebb a tamogatott `status` / `last-report` surface-re utalhat, automatikus reroute nelkul.

### 2.1) Ownership and Handoff Matrix

| Surface | Upstream Authority | This Task Locks | Downstream Consumer |
|---|---|---|---|
| public CLI grammar `bubble meta-review` | Phase 1 runtime baseline + aktualis CLI grammar | `recover` megszunik a parse/dispatch/render/help surface-rol | CLI parity es contract tesztek |
| public/shared recover export surface | Phase 1 altal fail-closedre szukitett overlap fajlok | nincs recover export vagy facade a V11/shared retegben | CLI invalid-command boundary es docs/operator surface vegleges szinkronja |
| operator remediation wording | plan Phase 2 objective | csak `restart` vagy uj meta-review futtatas marad tamogatott | PRD, rollout runbook, e2e validation docs |
| public invalid-command behavior | meglevo top-level CLI invalid-command contract | nincs hidden fallback vagy deprecated-but-working branch | `tests/cli/index.test.ts` es operator expectation |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI/help | command removal and explicit unknown/unsupported behavior | hidden alias or compatibility wrapper | includes parse/render/help and observable invalid-command output alignment | P1 | required-now |
| facade/shared exports | residualis recover export torlese | retained `recoverMetaReviewGateFromSnapshotV11(...)` public export | export removal must align with CLI invalid-command fail-closed boundary | P1 | required-now |
| Docs | final-state sync to supported remediation | stale recover examples | all three operator docs must converge on restart/new-run-only wording | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| user invokes removed `recover` command | CLI | result | non-zero invalid-command result; stderr or canonical invalid-command output says `recover` unsupported; no reroute | existing CLI invalid-command surface or explicit replacement | warn | P1 | required-now |
| residualis recover export still exported after Phase 2 | module graph | throw/test failure | remove export; no fallback alias | build/test parity failure | error | P1 | required-now |
| docs/test still reference recover as supported | N/A | review/test failure | update to restart/new-run guidance | docs parity failure | warn/error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 runtime removal baseline | P1 | required-now |
| must-use | docs/help/code search proving `bubble meta-review recover` public removal and V11/shared recover export deletion | P1 | required-now |
| must-use | explicit invalid/unsupported public-boundary coverage a removed `recover` commandra | P1 | required-now |
| must-use | docs diff vagy code search, amely bizonyitja a restart/new-run-only wordinget a harom felsorolt operator dokumentumban | P1 | required-now |
| must-not-use | retained alias, hidden reroute, deprecated-but-still-working recover branch | P1 | required-now |
| must-not-use | Phase 1 runtime baseline visszanyitasa vagy uj public remediation command becsuszasa | P1 | required-now |

### 6) Validation / Evidence Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | CLI help/parser/dispatcher/render path no longer expose recover | meta-review CLI fixture | help/parse/dispatch/render runs | no recover branch, help row, renderer output, or command union remains | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts` |
| T2a | removed command is observably invalid at the public boundary | CLI invocation for `bubble meta-review recover` | command runs | non-zero invalid/unsupported behavior and explicit output-channel/message contract are observed | P1 | required-now | `tests/cli/index.test.ts` |
| T2b | removed command has no hidden parse/dispatch fallback | parser/dispatcher parity fixture | parse/dispatch checks run | no hidden reroute or deprecated-but-working branch remains for `recover` | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts` |
| T2c | no retained recover export remains behind the public boundary | facade/export parity fixture | type graph or contract checks run | no retained `recoverMetaReviewGateFromSnapshotV11(...)` export or equivalent public recover facade remains | P1 | required-now | `tests/contracts/v11/metaReviewGate.contract.runner.ts`, code search |
| T3 | docs describe restart/new-run only across all operator docs | PRD, rollout runbook, and e2e validation docs | diff/search review runs | no supported recover claim remains in any of the three operator docs | P1 | required-now | `docs/meta-review-gate-prd.md`, `docs/meta-review-gate-rollout-runbook.md`, `docs/meta-review-gate-e2e-validation.md`, `tests/core/runtime/metaReviewSubmitGuidance.test.ts`, doc review + code search |

Recommended command evidence bundle:

1. targeted CLI tests for help/parse/entrypoint parity and invalid-command handling,
2. contract/code search proving `recoverMetaReviewGateFromSnapshotV11` es a public `bubble meta-review recover` grammar/export surface eltunt,
3. docs diff vagy targeted search a `docs/meta-review-gate-prd.md`, `docs/meta-review-gate-rollout-runbook.md`, es `docs/meta-review-gate-e2e-validation.md` fajlokon, amely csak `restart` vagy uj meta-review futtatas guidance-ot hagy meg.

## Acceptance Criteria

1. AC1: A public parser/type/dispatcher/render/help surface teljesen eltavolitja a `recover` subcommandot.
2. AC2: A removed `recover` hivatkozas a public hataron explicit invalid/unsupported viselkedest ad, hidden fallback vagy reroute nelkul.
3. AC3: A Phase 1 utan esetleg megmaradt recover-nevkoru residualis overlap/export is torlodik a V11/shared facade surface-rol.
4. AC4: A docs csak `restart` vagy uj meta-review futtatas remediationt allitanak tamogatottnak.
5. AC5: A task nem huzza vissza magahoz a Phase 1 belso runtime redesignjat; csak a public/operator surface cleanupot zarja le.
6. AC6: Az evidence matrix nem csak a help/doc wordinget, hanem a parser/export-invalid-command boundary teljes cleanupjat is bizonyitja.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests / Evidence |
|---|---|---|
| AC1 | CS1, CS2 | T1, T2b |
| AC2 | CS1, CS2, CS3 | T2a, T2b, T2c |
| AC3 | CS3 | T2c |
| AC4 | CS4 | T3 |
| AC5 | `Phase Boundary Ledger`, `Phase Entry Gate`, `Cross-Phase Overlap Ledger` | document review |
| AC6 | CS1, CS2, CS3, CS4 | T1, T2a, T2b, T2c, T3 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az unsupported-command wording szetszorodik, erdemes lehet central CLI helperbe emelni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | unify operator remediation examples | L2 | P2 | later-hardening | doc follow-up | normalize restart/new-run examples across wider docs set |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

This revision is `IMPLEMENTABLE`; keep that status only while all `P0/P1 + required-now` matrix rows remain closed and the `Phase Boundary Ledger`, `Phase Entry Gate`, and `Cross-Phase Overlap Ledger` continue to preserve AC5 ownership semantics.
