---
artifact_type: task
artifact_id: task_actor_runtime_interface_execution_authority_foundation_phaseE1_v1
title: "Actor Runtime Interface Execution Authority Foundation (Phase E1)"
status: draft
phase: phaseE1
target_files:
  - src/types/bubble.ts
  - src/types/protocol.ts
  - src/v11/shared/state/executionContext.ts
  - src/v11/shared/actorProtocol/actorEmitContext.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
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
   - actor emit context snapshot materialization
3. In-scope consumers:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/types/protocol.ts`
   - tests that assert canonical actor authority matching
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
   - meglévő `handoff_id` + `expected_role` + `expected_round` + `expected_state_fingerprint` guardlánc a foundation alatt explicit compatibility baseline maradhat,
   - új execution-scoped mezők hozzáadhatók úgy, hogy a deterministic same-authority resolution nem sérül.
3. Forbidden regression interpretations:
   - az `execution_id` bevezetése nem törheti el a jelenlegi canonical emit pathot azonos current execution mellett,
   - az authority foundation nem oldhatja fel a role-specifikus guardokat “majd az ack boundary megoldja” alapon,
   - a foundation nem csúszhat át delivery/ack vagy pilot activation feladatba.
4. Replacement proof required if removed:
   - ha a jelenlegi `handoff_id`-alapú matching bármely része kivételre kerül, az új execution-scoped shape-nek bizonyítania kell az ekvivalens vagy szigorúbb fail-closed védelmet.

### In Scope

1. `BubbleExecutionContext` és kapcsolódó helper shape felülvizsgálata execution-scoped authority szemszögből.
2. Az actor emit input authority contract kiegészítése a szükséges új execution-scoped mezőkkel.
3. `ActorEmitContextSnapshot` materializálásának frissítése a bővített authority shape-re.
4. A canonical actor emit matcher/validator frissítése az új authority shape-re.
5. A current-tree test surface kijelölése és explicit coverage elvárás az authority foundationre.

### Out of Scope

1. Typed delivery / launch ack boundary.
2. Runtime topology csere vagy tmux behavior módosítás.
3. Implementer pilot activation.
4. Reviewer/meta-reviewer rollout és retained adapter cleanup.
5. Public read-model vagy operator surface redesign.

### Safety Defaults

1. Additív foundation az alapértelmezett; activation nincs ebben a taskban.
2. A foundation nem vezethet be implicit downgrade pathot a hiányzó új authority mezőkre.
3. Ha compatibility átmenet kell, annak explicitnek, boundednek és fail-closednak kell lennie.

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
| `BubbleExecutionContext` | state persistence, restart, watchdog, actor emit context | additive or tightly bounded breaking | authority shape explicit bővítése | `E2-E4` only for downstream fallout |
| `ActorEmitContextSnapshot` | actor protocol wrappers, pass/converged/ask-human/meta-review emit | breaking internal foundation | snapshot materialization alignment | `E2` for typed ack consumers |
| `ActorEmitBaseInput` | CLI actor emit parse + tests | breaking public/internal contract | authority mezők explicit bővítése | `E3` activation remains separate |
| authority matcher helpers | actor protocol emitters, meta-review submit checks | breaking internal foundation | new execution-scoped validation | `E2-E4` for follow-on consumers |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `handoff_id` mismatch fail-closed | preserve | tests prove same reject semantics after foundation | P1 | required-now |
| role + round + fingerprint guardok | preserve | tests prove no regression | P1 | required-now |
| restart attempt új handoffot mint current execution identity részt képez | preserve, then strengthen | tests prove restarted execution remints authority deterministically | P1 | required-now |
| role-specific wrapper use of shared context | preserve as consumer, not source | tests prove wrappers still route through same authority source | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | `BubbleExecutionContext` | type shape | execution context interface | Az execution authority explicit execution-scoped identity mezőt kap, a role-neutral modellel kompatibilisen. | P1 | required-now | code diff + tests |
| CS2 | `src/v11/shared/state/executionContext.ts` | `buildRunningExecutionContext`, `buildRestartedExecutionContext` | input -> `BubbleExecutionContext` | execution context builders | A foundation deterministicen mintel új execution-scoped authorityt fresh és restarted pathon is. | P1 | required-now | tests |
| CS3 | `src/v11/shared/actorProtocol/actorEmitContext.ts` | `ActorEmitContextSnapshot`, `buildActorEmitContextSnapshot`, matcher helpers | resolved state -> context snapshot | actor authority materialization | A snapshot a bővített execution authorityt materializálja és validálja. | P1 | required-now | tests |
| CS4 | `src/types/protocol.ts` | `ActorEmitBaseInput` | type shape | canonical actor input | A canonical actor emit input explicit authority mezőkkel bővül. | P1 | required-now | code diff + tests |
| CS5 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | `assertActorEmitInputMatchesContext` | actor input + context -> void | authority validation seam | Az emit validation az új execution-scoped authorityt is ellenőrzi. | P1 | required-now | tests |
| CS6 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | wrapper entrypoints | resolved input -> actor emit result | wrapper authority use | A wrapper layer továbbra is a shared canonical authorityt fogyasztja, nem saját shortcutból dolgozik. | P1 | required-now | tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Persisted execution authority | `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | explicit execution-scoped authority shape | existing fields + new execution identity minimum | bounded compatibility helper only if explicitly specified | potentially breaking | P1 | required-now |
| Actor emit input authority | `repo`, `bubble_id`, `handoff_id`, optional guards | execution-scoped authority input | existing fields + new execution authority minimum | existing optional refs remain | potentially breaking | P1 | required-now |
| Actor emit context snapshot | state-derived handoff/role/round/fingerprint snapshot | execution-scoped context snapshot | repo, bubble_id, execution-scoped identity, role, round, fingerprint | worktree/resolved state handles | internal breaking | P1 | required-now |

Normative rules:

1. A tasknak explicitten meg kell neveznie a minimum új authority mezőt vagy mezőket; “future execution id” jellegű homályos placeholder nem elég.
2. Az új authority mező nem lehet csak debug/observability adat; canonical matchingben részt kell vennie.
3. Ha compatibility miatt valamely régi call site átmenetileg nem tud minden új mezőt adni, ezt explicit, bounded, fail-closed szabályként kell rögzíteni.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State / type / actor authority code | authority-shape, validator, builder, tests | delivery/ack logic, tmux logic, pilot rollout | foundation-only | P1 | required-now |
| Tests | authority and compatibility regression tests | broad unrelated runtime rewrites | only authority-focused fallout | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| state execution context hiányzik | state read | throw | fail-closed authority error | existing `ACTOR_EMIT_CONTEXT_INVALID` family or explicit successor code | error | P1 | required-now |
| execution-scoped authority részlegesen hiányzik | state/materialization | throw | no downgrade | explicit authority-invalid family | error | P1 | required-now |
| actor input nem adja a kötelező új authority mezőt | parser/validator | throw | typed validation error | explicit actor-input-invalid family | error | P1 | required-now |
| régi compatibility path átmenetileg engedett | explicit task rule needed | fallback | only bounded fail-closed compatibility, never heuristic infer | explicit compatibility reason code | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` | P1 | required-now |
| must-use | `src/types/bubble.ts` | P1 | required-now |
| must-use | `src/types/protocol.ts` | P1 | required-now |
| must-use | `src/v11/shared/state/executionContext.ts` | P1 | required-now |
| must-use | `src/v11/shared/actorProtocol/actorEmitContext.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | P1 | required-now |
| must-use | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | P1 | required-now |
| must-use | current authority tests under `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/cli/agentEmitCommand.test.ts`, `tests/core/state/executionContext.test.ts`, `tests/core/runtime/restartRecovery.test.ts` | P1 | required-now |
| must-not-use | typed delivery/launch ack semantics | P1 | required-now |
| must-not-use | tmux delivery confirmation changes | P1 | required-now |
| must-not-use | pilot actor activation logic | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | fresh execution context mints explicit execution-scoped authority | running state builder path | fresh execution context built | new authority fields are present and deterministic | P1 | required-now | automated test |
| T2 | restart remints authority without changing role/round semantics | existing execution context | restart builder runs | execution-scoped authority changes as required, while role/round invariants stay intact | P1 | required-now | automated test |
| T3 | actor emit rejects missing or mismatched execution-scoped authority | canonical actor input + context mismatch | validation runs | fail-closed reject | P1 | required-now | automated test |
| T4 | existing role/round/fingerprint guardrails survive | current canonical emit flows | authority foundation lands | previous mismatch classes still reject | P1 | required-now | automated test |
| T5 | wrapper layer still consumes shared authority source | implementer/reviewer/meta-reviewer wrapper tests | wrappers run | no role-specific shortcut authority path appears | P1 | required-now | automated test |
| T6 | compatibility path is explicit if retained | any temporary compatibility branch exists | tests run | compatibility is bounded, named, and fail-closed | P2 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az execution authority shape több mezőt kap, érdemes külön named helperbe tenni a builder-side identity mintelést.
2. [later-hardening] Ha a read-model fallout több helyen jelenik meg, külön diagnostics follow-up nyitható `E1` merge után.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | diagnostics/read-model fallout audit az authority foundation utan | L2 | P2 | later-hardening | current-tree fan-out | külön hygiene follow-up `E1` után |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan `E1` implementációt, amely implicit compatibility downgrade-ot hagy bent named rule nélkül.
3. Ne fogadjunk el olyan `E1` taskot, amely még mindig csak `handoff_id`-szintű authorityt formalizál, explicit execution-scoped identity nélkül.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. az authority foundation current-tree code seam-jei explicit target_files és call-site matrix szinten le vannak fedve;
2. a control model kimondja, hogy az authority foundation producer-first closure, nem rollout;
3. az új execution-scoped authority irány explicit és testelhető, nem homályos future note;
4. a task explicit tiltja a delivery/ack és activation scope visszakeverését;
5. a test matrix bizonyítja a preserved baseline guardokat és az új authority foundationt.
