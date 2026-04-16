---
artifact_type: task
artifact_id: task_actor_runtime_interface_execution_authority_foundation_phaseE1_v1
title: "Actor Runtime Interface Execution Authority Foundation (Phase E1)"
status: completed
phase: phaseE1
target_files:
  - src/cli/commands/agent/emit.ts
  - src/types/bubble.ts
  - src/types/protocol.ts
  - src/v11/shared/state/executionContext.ts
  - src/v11/shared/state/stateSchemaExecution.ts
  - src/v11/shared/state/stateSchema.ts
  - src/v11/shared/state/stateSchemaMetaReview.ts
  - src/v11/shared/state/stateSchemaMetaReviewRuntime.ts
  - src/v11/shared/actorProtocol/actorEmitContext.ts
  - src/v11/shared/metaReview/metaReviewExecutionContext.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - tests/core/state/executionContext.test.ts
  - tests/core/state/stateSchema.test.ts
  - tests/core/bubble/metaReviewExecutionContext.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/v11/shared/state/stateSchema.test.ts
  - tests/v11/shared/metaReview/metaReviewSnapshot.test.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - plans/tasks/actor-runtime-interface-execution-authority-foundation-phaseE1.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Execution Authority Foundation (Phase E1)

## L0 - Policy

### Goal

Execution-scoped authority foundation specifikálása a current actor-runtime boundaryhez úgy, hogy:
1. a canonical actor input authority többé ne csak `handoff_id` + optional guards köré szerveződjön,
2. a state-derived execution authority explicit, typed, execution-scoped alapszerződéssé váljon,
3. a későbbi typed delivery/launch ack boundary és pilot activation már ezen a foundationön épüljön.

### Domain / Control Model Summary

1. Business invariant: actor write authorityt csak a jelenlegi aktív execution kaphat; ugyanazon role vagy actor identitás önmagában nem elég.
2. Control model: a canonical authority forrása a persisted `state.execution_context`, illetve az ebből materializált actor emit context; a foundation feladata ennek explicit execution-scoped kiterjesztése.
   Current-tree grounding:
   - ma a persisted authority explicit mezői: `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt`,
   - E1-ben az új canonical execution-scoped mező minimuma az explicit `execution_id`,
   - `actor_id` és `emit_capability_ref` ezen a fázison még nem required-now mező, mert live-agent illetve delivery-transport couplingot húzna be a foundationbe.
3. Read-path rule: authorityt csak state/execution-context + canonical actor context materialization olvashat. CLI input, prompt text, tmux pane vagy actor név nem authority source.
4. Forbidden fallback:
   - nincs implicit authority `cwd`/worktree alapján,
   - nincs `active_agent` vagy role-only authority shortcut,
   - nincs `handoff_id`-only shortcut ott, ahol execution-scoped proof szükséges,
   - nincs tmux/prompt-derived replacement authority.
5. Allowed resolution path:
   - a jelenlegi deterministic same-authority path (`execution_context.handoff_id`, round, state fingerprint) preserved baseline marad, amíg az explicit execution-scoped mezők be nem kerülnek,
   - restart új attemptje ugyanazon role/round mellett új execution identityt kap,
   - meta-review authority továbbra is ugyanazon shared execution authority modell role-projectionje.
6. Missing-data rule:
   - ha nincs valid execution context -> fail-closed,
   - ha részben hiányzik az execution-scoped authority -> fail-closed typed hiba,
   - nincs “best effort” authority downgrade a régi mezőkre anélkül, hogy a task ezt explicit compatibility szabályként kimondaná.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal_execution_closure: successor (`E2`)
   - workflow_orchestration_closure: successor (`E3`)
   - read_model_closure: only minimal fallout if authority projection shape changes
   - activation_closure: successor (`E3`)
   - cleanup_recovery_closure: successor (`E4`)

### Authority Boundary Map

1. Authority producer:
   - `src/v11/shared/state/executionContext.ts`
   - state transitions that mint or remint `execution_context`
2. Stored authority:
   - `BubbleExecutionContext` in persisted state
   - `BubbleMetaReviewExecutionContext` in nested meta-review state
   - actor emit context snapshot materialization
3. In-scope consumers:
   - `src/cli/commands/agent/emit.ts`
   - `src/v11/shared/state/stateSchemaExecution.ts`
   - `src/v11/shared/state/stateSchema.ts`
   - `src/v11/shared/state/stateSchemaMetaReview.ts`
   - `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts`
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/types/protocol.ts`
   - tests that assert canonical actor authority matching, persisted-state fail-closed enforcement, and meta-review role-projection parity
4. Explicit out-of-scope consumers:
   - tmux delivery confirmation / typed ack semantics
   - implementer pilot rollout behavior
   - reviewer/meta-reviewer retained adapter cleanup
   - status/list/read-model redesign beyond unavoidable fallout
5. Export surfaces closed in this phase: `no`; this is foundation, not broad cleanup.

### Baseline Preservation

1. Must-preserve behaviors:
   - actor emit továbbra is explicit state-derived authorityhoz kötött,
   - `handoff_id` mismatch, role mismatch, round mismatch, fingerprint mismatch fail-closed marad,
   - restart új attemptje új authority instance-t eredményez,
   - `meta_reviewer` authority nem külön subsystem, hanem ugyanazon modell role projectionje.
2. Allowed resolution paths:
   - meglévő `handoff_id` + `expected_role` + `expected_round` + `expected_state_fingerprint` guardlánc preserved baseline marad a current executionon belüli same-authority proof részeként, nem külön compatibility rule-ként,
   - új execution-scoped mezők hozzáadhatók úgy, hogy a deterministic same-authority resolution nem sérül.
3. Forbidden regression interpretations:
   - az `execution_id` bevezetése nem törheti el a jelenlegi canonical emit pathot azonos current execution mellett,
   - az authority foundation nem oldhatja fel a role-specifikus guardokat “majd az ack boundary megoldja” alapon,
   - a foundation nem csúszhat át delivery/ack vagy pilot activation feladatba.
4. Replacement proof required if removed:
   - ha a jelenlegi `handoff_id`-alapú matching bármely része kivételre kerül, az új execution-scoped shape-nek bizonyítania kell az ekvivalens vagy szigorúbb fail-closed védelmet.

### In Scope

1. `BubbleExecutionContext` és kapcsolódó helper shape felülvizsgálata execution-scoped authority szemszögből.
2. `BubbleMetaReviewExecutionContext` és a `meta_review.execution_context` role-projection explicit execution-scoped parityjának bevonása.
3. A persisted-state schema validation seam explicit bevonása, hogy a historical `execution_context` shape fail-closed enforced legyen.
4. A meta-review nested snapshot validation/normalization seam explicit bevonása, hogy a `meta_review.execution_context` ugyanazt az `execution_id` contractot vigye.
5. A canonical `agent emit` parser seam explicit bevonása, hogy a CLI input required `execution_id`-t fogadjon es threadeljen.
6. Az actor emit input authority contract kiegészítése a szükséges új execution-scoped mezőkkel.
7. `ActorEmitContextSnapshot` materializálásának frissítése a bővített authority shape-re.
8. A canonical actor emit matcher/validator frissítése az új authority shape-re.
9. A current-tree test surface kijelölése és explicit coverage elvárás az authority foundationre.

### Out of Scope

1. Typed delivery / launch ack boundary.
2. Runtime topology csere vagy tmux behavior módosítás.
3. Implementer pilot activation.
4. Reviewer/meta-reviewer rollout és retained adapter cleanup.
5. Public read-model vagy operator surface redesign.

### Safety Defaults

1. Additív foundation az alapértelmezett; activation nincs ebben a taskban.
2. A foundation nem vezethet be implicit downgrade pathot a hiányzó új authority mezőkre.
3. Default elvárás, hogy a current-tree owned emit call site-ok és tesztek ugyanebben a change-ben átálljanak az új authority shape-re; parser-level vagy wrapper-level long-lived compatibility adapter nem cél.
4. `execution_id` nem inferálható `handoff_id`-ból, `cwd`-ből vagy bármely prompt/runtime mellékjelből; a tiltott levezetés explicit fail-closed reject path.
5. Historical pre-E1 persisted state kompatibilitás nem tekintendő automatikusan additívnak; ennek a tasknak a választott szabálya: fail-closed reject, majd fresh authority remint required.

### Execution Identity Decision

1. `E1` minimum új canonical authority mezője: `execution_id`.
2. Az `execution_id` producer-oldalon a `buildRunningExecutionContext` és `buildRestartedExecutionContext` által mintelt, persisted mező.
3. Az `execution_id`-t a `ActorEmitContextSnapshot` és a `ActorEmitBaseInput` is kötelezően hordozza, és a canonical matchernek ezt a `handoff_id`-val együtt kell ellenőriznie.
4. `actor_id` és `emit_capability_ref` current-tree szinten továbbra is deferred; ezek nem required-now acceptance feltételei ennek a tasknak.
5. A foundation acceptance nem támaszkodhat arra, hogy a `handoff_id` stringben ma szerepel az `attempt`; az explicit mezőnek saját typed contractként kell megjelennie.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Érintett contractok:
   - event/message payload contract (`ActorEmitBaseInput`)
   - persisted execution authority contract (`BubbleExecutionContext`)

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: persisted `execution_context` -> `ActorEmitContextSnapshot` -> canonical actor emit validation
   - competing identifiers or fallback identities: role-only identity, actor-only identity, `handoff_id`-only shortcut, tmux/prompt/runtime heuristics
10. Authority/source-of-truth note:
   - canonical source: persisted execution context and its canonical materialization
   - forbidden secondary sources: prompt text, pane state, actor name alone, runtime delivery hints

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Csak current execution emitelhet canonical actor outputot. | A foundation explicit execution-scoped mezőket vezet be. | P1 | required-now |
| Control model | Authority truth persisted execution contextből jön. | Az új authority shape-et itt kell előállítani és materializálni. | P1 | required-now |
| Read-path rule | Authority matching csak state/context + actor emit boundaryn mehet. | A validatorok ne olvassanak tmux/prompt/routing mellékinfóból. | P1 | required-now |
| Forbidden fallback | Nincs role-only, actor-only vagy pane-derived authority. | A foundation explicit tiltja ezeket a shortcutokat. | P1 | required-now |
| Allowed resolution path | A jelenlegi deterministic same-authority guardlánc preserved baseline. | Az új shape csak explicit, azonos authority chainen bővíthet. | P1 | required-now |
| Missing-data rule | Részleges vagy hiányzó execution authority fail-closed. | Nincs best-effort downgrade. | P1 | required-now |
| Phase boundary | Ez foundation task; ack/activation/cleanup successor marad. | Nem csúszhat bele rollout vagy delivery task. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| canonical `agent emit` parser seam | CLI option parsing, actor emit input assembly | breaking current-tree CLI contract | `execution_id` required parse + threading alignment | `E2-E4` only for downstream fallout |
| `BubbleExecutionContext` | state persistence, restart, watchdog, actor emit context | breaking | explicit `execution_id` hozzáadása, equality/builder alignment, és fail-closed historical state handling rule kimondása | `E2-E4` only for downstream fallout |
| `BubbleMetaReviewExecutionContext` | nested meta-review snapshot, meta-review builder/schema, normalization | breaking internal shared-authority contract | explicit `execution_id` parity a meta-review role-projectionben is | `E2-E4` only for downstream fallout |
| persisted state schema validation | snapshot load/store validation, authority gate, diagnostics | breaking internal enforcement | `execution_id` required shape enforced a schema seam-en, nem csak type-levelen | `E2-E4` only for downstream fallout |
| nested meta-review schema validation/normalization | `meta_review.execution_context`, snapshot normalization, meta-review diagnostics | breaking internal enforcement | nested meta-review execution context ugyanazt az explicit authority shape-et enforce-olja | `E2-E4` only for downstream fallout |
| `ActorEmitContextSnapshot` | actor protocol wrappers, pass/converged/ask-human/meta-review emit | breaking internal foundation | snapshot `execution_id` materialization + validation alignment | `E2` for typed ack consumers |
| `ActorEmitBaseInput` | CLI actor emit parse + tests | breaking current-tree actor input contract | `execution_id` required mezővé tétele minden canonical emit inputnál | `E3` activation remains separate |
| authority matcher helpers | actor protocol emitters, meta-review submit checks | breaking internal foundation | `handoff_id` + `execution_id` same-authority validation | `E2-E4` for follow-on consumers |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `handoff_id` mismatch fail-closed | preserve | tests prove same reject semantics after foundation | P1 | required-now |
| role + round + fingerprint guardok | preserve | tests prove no regression | P1 | required-now |
| restart attempt új handoffot mint current execution identity részt képez | preserve, then strengthen | tests prove restarted execution remints both `handoff_id` and `execution_id` according to Rule `R1_RESTART_REMINT` while role/round stay stable | P1 | required-now |
| meta-review authority mint shared role-projection | preserve, then strengthen | tests prove meta-review builder/schema/normalization carry the same explicit `execution_id` contract as the top-level authority | P1 | required-now |
| role-specific wrapper use of shared context | preserve as consumer, not source | tests prove wrappers still route through same authority source | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/emit.ts` | `agentEmitParseOptions`, `buildCommonInput` | argv/options -> common actor emit input | canonical CLI parser seam | A parser required `execution_id` CLI optiont fogad, es a built actor inputba explicitten tovabbadja. | P1 | required-now | tests |
| CS2 | `src/types/bubble.ts` | `BubbleExecutionContext`, `BubbleMetaReviewExecutionContext` | type shape | execution context interfaces | A top-level es meta-review execution authority is explicit `execution_id` mezőt kap a meglévő `handoff_id` mellett. | P1 | required-now | code diff + tests |
| CS3 | `src/v11/shared/state/executionContext.ts` | `buildRunningExecutionContext`, `buildRestartedExecutionContext`, `toMetaReviewExecutionContext`, `metaReviewExecutionContextToRunningContext`, `executionContextsEqual` | input -> execution context shapes | execution context builders/projections | Fresh, restarted es meta-review projection pathon is explicit `execution_id` parity marad fenn; equality helper az új mezőt is figyeli. | P1 | required-now | tests |
| CS4 | `src/v11/shared/metaReview/metaReviewExecutionContext.ts` | `buildMetaReviewExecutionContext`, `validateActiveMetaReviewExecutionContext` | input/state -> meta-review authority result | meta-review shared-authority builder seam | A meta-review role-projection builder és active validator ugyanazt az explicit `execution_id` contractot hordozza és ellenőrzi. | P1 | required-now | tests |
| CS5 | `src/v11/shared/state/stateSchemaExecution.ts` | `validateExecutionContext` | unknown + path + errors -> `BubbleExecutionContext | null` | persisted top-level authority schema seam | A persisted `execution_context` schema explicit `execution_id`-t kovetel, es pre-E1 shape-et fail-closed modon utasit el Rule `R3_PRE_E1_FAIL_CLOSED` szerint. | P1 | required-now | tests |
| CS6 | `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts`, `src/v11/shared/state/stateSchemaMetaReview.ts` | `validateMetaReviewExecutionContext`, `validateMetaReviewSnapshot` | unknown + path + errors -> nested meta-review execution context/snapshot | nested meta-review schema seam | A `meta_review.execution_context` explicit `execution_id`-t kovetel, es a nested snapshot normalization/validation ugyanazt a fail-closed contractot viszi. | P1 | required-now | tests |
| CS7 | `src/v11/shared/state/stateSchema.ts` | `validateBubbleStateSnapshot` | unknown -> `ValidationResult<BubbleStateSnapshot>` | top-level snapshot validation seam | A snapshot validation a top-level es nested meta-review execution context enforce-olt shape-jara tamaszkodik; nincs permissziv historical acceptance. | P1 | required-now | tests |
| CS8 | `src/v11/shared/actorProtocol/actorEmitContext.ts` | `ActorEmitContextSnapshot`, `buildActorEmitContextSnapshot`, `assertActorEmitContextMatches` | resolved state -> context snapshot | actor authority materialization | A snapshot explicit `execution_id`-t hordoz, és a matcher ezt a `handoff_id` + guardlánc mellett ellenőrzi. | P1 | required-now | tests |
| CS9 | `src/types/protocol.ts` | `ActorEmitBaseInput` | type shape | canonical actor input | A canonical actor emit input required `execution_id` mezőt kap; optional guardok megmaradnak. | P1 | required-now | code diff + tests |
| CS10 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | `assertActorEmitInputMatchesContext` | actor input + context -> void | authority validation seam | Az emit validation a `execution_id` mismatch-et is fail-closed módon elutasítja. | P1 | required-now | tests |
| CS11 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | `emitImplementerPilotActorProtocolV11`, `emitReviewerActorProtocolV11`, `emitMetaReviewerActorProtocolV11`, `emitActorProtocolFromWorkspaceV11` | resolved input -> actor emit result | wrapper entrypoints | A wrapper layer továbbra is a shared canonical authorityt fogyasztja, nem saját shortcutból dolgozik; meta-review is ugyanebben a shared authority modellben marad. | P1 | required-now | tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Persisted execution authority | `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | explicit execution-scoped authority shape | existing fields + required `execution_id` | none required-now beyond existing shape | breaking with fail-closed historical-state rule | P1 | required-now |
| Actor emit input authority | `repo`, `bubble_id`, `handoff_id`, optional guards | execution-scoped authority input | `repo`, `bubble_id`, `handoff_id`, required `execution_id` | `refs`, `expected_role`, `expected_round`, `expected_state_fingerprint` | breaking current-tree actor input contract, no heuristic adapter | P1 | required-now |
| Actor emit context snapshot | state-derived handoff/role/round/fingerprint snapshot | execution-scoped context snapshot | `repo`, `bubble_id`, `handoff_id`, `execution_id`, `expected_role`, `expected_round`, `expected_state_fingerprint` | worktree/resolved state handles | internal breaking | P1 | required-now |

Normative rules:

1. A minimum új authority mező neve ebben a taskban explicitten `execution_id`; ennél homályosabb placeholder nem elfogadható.
2. Az `execution_id` nem lehet csak debug/observability adat; canonical matchingben kötelezően részt kell vennie.
3. `actor_id` és `emit_capability_ref` nem required-now acceptance mező ebben a taskban; ezek későbbi phase-ekre maradnak.
4. A current-tree owned emit call site-oknak és teszteknek ugyanebben a change-ben át kell állniuk; `execution_id` hiányára nem maradhat csendes compatibility downgrade.
5. `execution_id` nem vezethető le parser- vagy validator-oldalon a `handoff_id` stringből.
6. Historical, pre-E1 persisted `execution_context` shape-re a választott szabály ebben a taskban: fail-closed reject / fresh authority remint required.
7. Named compatibility rule nem része ennek az `E1` tasknak.

### 2a) L1 Normative Authority Rules

1. `R1_RESTART_REMINT`: `buildRestartedExecutionContext`-nek minden restart eseten uj `handoff_id`-t es uj `execution_id`-t kell mintelnie, mikozben az aktiv role es a round valtozatlan marad.
2. `R2_NO_DERIVATION`: `execution_id` nem vezetheto le a `handoff_id` stringbol vagy barmely implicit runtime/prompt/worktree jelbol; hianya fail-closed input/context hiba.
3. `R3_PRE_E1_FAIL_CLOSED`: historical, pre-E1 persisted `execution_context` shape `execution_id` nelkul nem kompatibilis atmeneti modell; reject + fresh authority remint required.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State / type / actor authority code | authority-shape, validator, builder, tests | delivery/ack logic, tmux logic, pilot rollout | foundation-only | P1 | required-now |
| Tests | authority and compatibility regression tests | broad unrelated runtime rewrites | only authority-focused fallout | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| state execution context hiányzik | state read | throw | fail-closed authority error | `ACTOR_EMIT_CONTEXT_MISSING_EXECUTION_CONTEXT` | error | P1 | required-now |
| persisted `execution_context` pre-E1 shape-ben erkezik `execution_id` nelkul | state/materialization | throw | reject es fresh authority remint required | `ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING` | error | P1 | required-now |
| execution-scoped authority részlegesen hiányzik current-shape mellett | state/materialization | throw | no downgrade | `ACTOR_EMIT_CONTEXT_EXECUTION_ID_MISSING` | error | P1 | required-now |
| actor input nem adja a kötelező `execution_id` mezőt | parser/validator | throw | typed input validation error | `ACTOR_EMIT_INPUT_EXECUTION_ID_MISSING` | error | P1 | required-now |
| caller a `handoff_id` stringből próbálja pótolni az `execution_id`-t | parser/validator or compatibility seam | throw | reject; no inferred authority allowed | `ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION` | error | P1 | required-now |

### 5) Dependency Constraints

Dependency type semantics:

1. `must-use`: current-tree source vagy tesztfelulet, amelyet a tasknak kotelezo beolvasnia es a change contractban explicitten lefednie kell.
2. `reference-only`: kotelezoen olvasando, de nem owned edit surface; sequencing-, boundary- vagy rationale-kontekstust ad.
3. `must-not-use`: olyan surface vagy megoldasi irany, amelyet ez a task nem modosithet es nem emelhet be az acceptance scope-ba.

| Type | Items | Priority | Timing |
|---|---|---|---|
| reference-only | `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` | P1 | required-now |
| must-use | `src/types/bubble.ts` | P1 | required-now |
| must-use | `src/types/protocol.ts` | P1 | required-now |
| must-use | `src/cli/commands/agent/emit.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/executionContext.ts` | P1 | required-now |
| must-use | `src/v11/shared/metaReview/metaReviewExecutionContext.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/stateSchemaExecution.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/stateSchema.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/stateSchemaMetaReview.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts` | P1 | required-now |
| must-use | `src/v11/shared/actorProtocol/actorEmitContext.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | P1 | required-now |
| must-use | current authority tests under `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/cli/agentEmitCommand.test.ts`, `tests/core/state/executionContext.test.ts`, `tests/core/state/stateSchema.test.ts`, `tests/v11/shared/state/stateSchema.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/core/bubble/metaReviewExecutionContext.test.ts`, `tests/v11/shared/metaReview/metaReviewSnapshot.test.ts` | P1 | required-now |
| must-not-use | typed delivery/launch ack semantics | P1 | required-now |
| must-not-use | tmux delivery confirmation changes | P1 | required-now |
| must-not-use | pilot actor activation logic | P1 | required-now |
| must-not-use | `execution_id` parser-side levezetése a `handoff_id` stringből | P1 | required-now |
| must-not-use | `actor_id` vagy `emit_capability_ref` required-now mezővé emelése | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | fresh execution context mints explicit execution-scoped authority | running state builder path | fresh execution context built | `execution_id` jelen van a typed contractban, es a builder sajat explicit mezokent adja vissza | P1 | required-now | `tests/core/state/executionContext.test.ts` |
| T2 | restart remints authority without changing role/round semantics | existing execution context | restart builder runs | restarted context új `handoff_id`-t és új `execution_id`-t kap Rule `R1_RESTART_REMINT` szerint, miközben role/round invariants intact maradnak | P1 | required-now | `tests/core/state/executionContext.test.ts`, `tests/core/runtime/restartRecovery.test.ts` |
| T3 | execution context equality is sensitive to `execution_id` | ket execution context csak `execution_id`-ban kulonbozik | `executionContextsEqual` fut | equality `false`, vagyis az uj authority mezo resze a canonical same-authority proofnak | P1 | required-now | `tests/core/state/executionContext.test.ts` |
| T4 | meta-review builder carries explicit execution authority parity | meta-review authority builder path | `buildMetaReviewExecutionContext` fut | a returned `BubbleMetaReviewExecutionContext` ugyanugy explicit `execution_id`-t hordoz, mint a top-level authority | P1 | required-now | `tests/core/bubble/metaReviewExecutionContext.test.ts` |
| T5 | meta-review normalization/validation preserves explicit execution authority parity | nested `meta_review.execution_context` snapshot active vagy drifted allapotban | meta-review snapshot validation/normalization fut | nested meta-review execution context ugyanazt az explicit `execution_id` contractot enforce-olja es normalizalja | P1 | required-now | `tests/core/state/stateSchema.test.ts`, `tests/v11/shared/metaReview/metaReviewSnapshot.test.ts`, `tests/v11/shared/state/stateSchema.test.ts` |
| T6 | persisted schema rejects pre-E1 execution authority shape | persisted `execution_context` `execution_id` nelkul | `validateExecutionContext` vagy `validateBubbleStateSnapshot` fut | Rule `R3_PRE_E1_FAIL_CLOSED` ervenyesul: reject / fresh authority remint required; nincs silent migration | P1 | required-now | `tests/core/state/stateSchema.test.ts`, `tests/v11/shared/state/stateSchema.test.ts` |
| T7 | canonical agent emit parser accepts and threads `execution_id` | CLI actor emit invocation | parse path fut | `buildCommonInput` required mezokent olvassa es tovabbadja az `execution_id`-t | P1 | required-now | `tests/cli/agentEmitCommand.test.ts` |
| T8 | forbidden `handoff_id` -> `execution_id` derivation rejects | actor input vagy compatibility seam csak `handoff_id`-val probal authorityt adni | parse/emit validation fut | Rule `R2_NO_DERIVATION` ervenyesul: explicit reject, nincs inferred authority | P1 | required-now | `tests/cli/agentEmitCommand.test.ts`, `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |
| T9 | actor emit rejects missing or mismatched execution-scoped authority | canonical actor input + context mismatch | validation runs | missing vagy mismatched `execution_id` fail-closed rejectet okoz | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/cli/agentEmitCommand.test.ts` |
| T10 | existing role/round/fingerprint guardrails survive | current canonical emit flows | authority foundation lands | previous mismatch classes still reject a new `execution_id` match mellett is | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/cli/agentEmitCommand.test.ts` |
| T11 | wrapper layer still consumes shared authority source | implementer/reviewer/meta-reviewer wrapper tests | wrappers run | no role-specific shortcut authority path appears, es a wrappers a shared snapshot `execution_id`-jat fogyasztjak; meta-review is role-projection marad | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/core/bubble/metaReviewExecutionContext.test.ts` |
| T12 | restart/recovery path is schema-aligned after remint | restart vagy resume workflow persisted state-t hoz vissza | state validation es recovery flow fut | a remintelt authority mar schema-valid `execution_id`-s shape-kent terjed tovabb top-level es meta-review projectionon is | P1 | required-now | `tests/core/runtime/restartRecovery.test.ts`, `tests/core/state/stateSchema.test.ts`, `tests/core/bubble/metaReviewExecutionContext.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az execution authority shape több mezőt kap, érdemes külön named helperbe tenni a builder-side identity mintelést.
2. [later-hardening] Ha a read-model fallout több helyen jelenik meg, külön diagnostics follow-up nyitható `E1` merge után.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | diagnostics/read-model fallout audit az authority foundation utan | L2 | P2 | later-hardening | current-tree fan-out | külön hygiene follow-up `E1` után |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan `E1` implementációt, amely barmilyen compatibility downgrade-ot hagy bent; ebben a taskban a historical-state szabaly fail-closed reject + remint.
3. Ne fogadjunk el olyan `E1` taskot, amely még mindig csak `handoff_id`-szintű authorityt formalizál, explicit `execution_id` nélkül.
4. Ne fogadjunk el olyan `E1` taskot, amely `actor_id` vagy `emit_capability_ref` bevezetésével keverné vissza a live-runner vagy delivery-scope döntéseket.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. az authority foundation current-tree code seam-jei explicit target_files és call-site matrix szinten le vannak fedve;
2. a control model kimondja, hogy az authority foundation producer-first closure, nem rollout;
3. az új execution-scoped authority irány explicit és testelhető, nem homályos future note;
4. a task explicit tiltja a delivery/ack és activation scope visszakeverését;
5. a test matrix külön bizonyítja a preserved baseline guardokat, a fail-closed pre-E1 state kezelést, a persisted schema enforcement seamet, a meta-review role-projection parityt és a tiltott authority-derivation rejectet.
