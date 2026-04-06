---
artifact_type: task
artifact_id: task_m6_01_v11_closure_phase4_infrastructure_inventory_topology_lock_v1
title: "M6-01 v11 closure: Phase 4 infrastructure inventory and topology lock"
status: implementable
phase: phase4
target_files:
  - "src/core/runtime/**"
  - "src/core/state/**"
  - "src/core/archive/**"
  - "src/core/protocol/**"
  - "src/core/bubble/actorEmitContext.ts"
  - "src/core/bubble/approvalRequestEnvelope.ts"
  - "src/core/bubble/bubbleInstanceId.ts"
  - "src/core/bubble/bubbleLookup.ts"
  - "src/core/bubble/metaReviewExecutionContext.ts"
  - "src/core/bubble/paths.ts"
  - "src/core/bubble/repoResolution.ts"
  - "src/core/bubble/workspaceResolution.ts"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "architecture"
  - "runtime"
---

# Task: M6-01 v11 closure: Phase 4 infrastructure inventory and topology lock

## L0 - Policy

### Goal

Fajlszintu inventory rogzitese a meg elo `src/core/**` low-level technikai ownershiprol, egyertelmu `v11` home-besorolassal es Phase 5 execution batch-javaslattal. Ez a kor docs-only topology lock; nem indit el ownership-cutover implementaciot.

### In Scope

1. `src/core/runtime/**`, `src/core/state/**`, `src/core/archive/**`, `src/core/protocol/**` teljes inventoryja.
2. A kapcsolodo `src/core/bubble/**` helper-ek besorolasa, ha valojaban infra vagy mas megmarado alacsony szintu ownershipet hordoznak.
3. `v11/infrastructure` capability-lock rogzitese a negy top-level alatt: `state`, `channel`, `executor`, `artifact`.
4. Nem-infra targetek explicitalasa, ahol a helyes home `v11/shared` vagy mas nem-infra `v11` boundary.
5. Phase 5 execution batch-ek, fuggosegek es parhuzamosithato agent-lane-ek rogzitese.

### Out of Scope

1. Nagy kodmozgas vagy ownership-cutover implementacio.
2. Command lane-ek ujranyitasa vagy redesignja.
3. Uj `v11/infrastructure/**` kod letrehozasa csak a topology lock kedveert.
4. Meta-review vagy list lane ujratervezese.

### Safety Defaults

1. A `src/core/**` end-state tovabbra is shim-only vagy explicit temporary bridge.
2. Protocol szemantika es canonical contract nem megy automatikusan infrastruktura ala.
3. A megmaradt open kerdesek csak mini-design szintu finomitasok lehetnek; blocker-szintu topology bizonytalansag nem maradhat.
4. Delete-jelolt csak akkor kaphat `delete` besorolast, ha nincs elore lathato aktiv `v11` consumer vagy bridge-szukseglet. Ebben a korben ilyen jelolt nem maradt.
5. Vegyes legacy file-oknal a topology lock ownership-slice szinten ertendo; nem kotelezo, hogy minden mai `core` file egyetlen Phase 5 capability ala essen, ha a jelenlegi file shape mar most tobb capability concernjet hordozza.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Docs-only topology lock. Nincs DB/API/event/auth/config szerzodesvaltozas.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: ez a task rogziti a Phase 4 topology lockot a megmaradt low-level core ownershipre
   - forbidden secondary sources: ad hoc file-by-file placement dontes Phase 5 kozben dokumentalt inventory nelkul

## L1 - Change Contract

### 1) File-Level Inventory Matrix

#### 1.1 `src/core/state/**`

| File | Target classification | Phase 5 batch | Notes |
|---|---|---|---|
| `src/core/state/stateStore.ts` | `v11/infrastructure/state` | S1 | Canonical persisted state I/O, lock es optimistic conflict ownership. Magas fan-in (`stateStore`: 66 `v11` import/test touchpoint). |
| `src/core/state/stateSchema.ts` | `v11/shared` | S1 | Canonical state snapshot validation/compat schema, nem infra default. Javasolt concrete home: `src/v11/shared/state/**`. |
| `src/core/state/machine.ts` | mas nem-infra `v11` home | S1 | Determinisztikus transition application; helyes home `src/v11/domain/state/**`. |
| `src/core/state/transitions.ts` | mas nem-infra `v11` home | S1 | Pure transition allowlist/predicate; `src/v11/domain/state/**`. |
| `src/core/state/executionContext.ts` | `v11/shared` | S1 | Canonical execution-context builder es adapter, tobb lane hasznalja; `src/v11/shared/state/**` vagy `shared/executionContext/**`. |
| `src/core/state/initialState.ts` | mas nem-infra `v11` home | S1 | Determinisztikus initial snapshot constructor; `src/v11/domain/state/**` vagy `shared/state/**`, de nem infra. |

#### 1.2 `src/core/runtime/**`

| File | Target classification | Phase 5 batch | Notes |
|---|---|---|---|
| `src/core/runtime/tmuxManager.ts` | `v11/infrastructure/channel` | C1 | Tmux session lifecycle primitive. Javasolt concrete home: `src/v11/infrastructure/channel/tmux/**`. |
| `src/core/runtime/tmuxInput.ts` | `v11/infrastructure/channel` | C1 | Tmux pane input/send-confirm primitive, ugyanabban a tmux capabilityben. |
| `src/core/runtime/tmuxDelivery.ts` | `v11/infrastructure/channel` | C1 | Runtime delivery adapter tmux iranyba; magas fan-in (`tmuxDelivery`: 38). |
| `src/core/runtime/sessionsRegistry.ts` | `v11/infrastructure/channel` + `v11/infrastructure/executor` | E1 + C1 | Vegyes ownership. Default felbontas: `metaReviewerPane` es egyeb tmux pane binding concern `channel/tmux`, mig `bubbleId/repoPath/worktreePath/tmuxSessionName` runtime session lifecycle ownership `executor/session-runtime`. Ne lockoljuk egyben `channel` ala. |
| `src/core/runtime/notifications.ts` | `v11/infrastructure/channel` | C1 | Operator notification adapter (hang/signal). |
| `src/core/runtime/reviewerContext.ts` | `v11/infrastructure/channel` | C1 | Reviewer pane respawn/context refresh a tmux runtimehoz kotve. |
| `src/core/runtime/pairflowCommand.ts` | `v11/infrastructure/executor` | E1 | CLI entrypoint pinning/bootstrap es active-path assessment. |
| `src/core/runtime/agentCommand.ts` | `v11/infrastructure/executor` | E1 | Agent launch command assembly, worktree pinning es bootstrap chaining. |
| `src/core/runtime/passValidationRunner.ts` | `v11/infrastructure/executor` | E2 | Validation command execution primitive. |
| `src/core/runtime/passValidationEvidence.ts` | `v11/infrastructure/artifact` | A3 | Evidence/recovery marker artifact persistence a fo ownership; mini-design szerint kesobb szetszedheto policy + I/O szeletekre. |
| `src/core/runtime/watchdog.ts` | mas nem-infra `v11` home | S2 | Pure watchdog status derivation; helyes home `src/v11/domain/watchdog/**` vagy `shared/watchdog/**`. |
| `src/core/runtime/metaReviewSubmitGuidance.ts` | `v11/shared` | X1 | Canonical meta-review submit text contract, nem infra. Javasolt home: `src/v11/shared/metaReview/**`. |
| `src/core/runtime/reviewerCommandGateGuidance.ts` | `v11/shared` | X1 | Reviewer command gate canonical text/policy helper, nem infra. Javasolt home: `src/v11/shared/reviewer/**`. |
| `src/core/runtime/reviewerGuidance.ts` | `v11/shared` | X1 | Reviewer selection guidance helper, nem infra. |
| `src/core/runtime/reviewerScoutExpansionGuidance.ts` | `v11/shared` | X1 | Reviewer workflow guidance text, nem infra. |
| `src/core/runtime/reviewerSeverityOntology.generated.ts` | `v11/shared` | X1 | Embedded canonical reviewer ontology, nem infra. |
| `src/core/runtime/reviewerSeverityOntology.ts` | `v11/shared` | X1 | Ontology reminder builder, nem infra. |
| `src/core/runtime/startupReconciler.ts` | `shim/temporary bridge` | none | Mar tiszta re-export shim a `v11/application/reconcile` fele. Phase 5-ben nem ownership extract, hanem kesobbi shim-retire target. |

#### 1.3 `src/core/protocol/**`

| File | Target classification | Phase 5 batch | Notes |
|---|---|---|---|
| `src/core/protocol/transcriptStore.ts` | `v11/infrastructure/artifact` | A1 | Transcript persistence mechanic, lock, append es mirror write ownership. |
| `src/core/protocol/envelope.ts` | `v11/shared` | A1 | Protocol line codec/canonical envelope serialization contract. Nem default infra. |
| `src/core/protocol/validators.ts` | `v11/shared` | A1 | Canonical protocol envelope validation contract. |
| `src/core/protocol/sequenceAllocator.ts` | `v11/shared` | A1 | Default besorolas `shared`, mert az ID-format canonical contract; mini-design pont, hogy az allocator resz maradhat-e transcript-adjacent helper. |
| `src/core/protocol/resumeSummary.ts` | `v11/shared` | X2 | Shared transcript summary rendering helper, nem persistence primitive. |

#### 1.4 `src/core/archive/**`

| File | Target classification | Phase 5 batch | Notes |
|---|---|---|---|
| `src/core/archive/archivePaths.ts` | `v11/infrastructure/artifact` | A2 | Archive path/layout resolution. |
| `src/core/archive/archiveSnapshot.ts` | `v11/infrastructure/artifact` | A2 | Archive snapshot persistence es manifest ownership. |
| `src/core/archive/archiveIndex.ts` | `v11/infrastructure/artifact` | A2 | Archive index persistence/update ownership. |

#### 1.5 `src/core/bubble/**` low-level helpers

| File | Target classification | Phase 5 batch | Notes |
|---|---|---|---|
| `src/core/bubble/paths.ts` | `v11/infrastructure/artifact` | A2 | Bubble filesystem topology/layout authority. Javasolt concrete home: `src/v11/infrastructure/artifact/bubble/**`. |
| `src/core/bubble/bubbleInstanceId.ts` | `v11/infrastructure/artifact` | A2 | Bubble metadata persistence/backfill a `bubble.toml` felett; artifact-default. |
| `src/core/bubble/repoResolution.ts` | `v11/infrastructure/executor` | E1 | Git/worktree repo root resolution primitive. |
| `src/core/bubble/workspaceResolution.ts` | `v11/infrastructure/executor` | E1 | Bubble workspace resolution Git + bubble config alapjan. |
| `src/core/bubble/bubbleLookup.ts` | `v11/infrastructure/executor` | E1 | Bubble-by-id lookup repo/workspace contexttal; magas fan-in (`bubbleLookup`: 42). |
| `src/core/bubble/actorEmitContext.ts` | `v11/shared` | X2 | Canonical actor-emit context assembly, tobb lane fogyasztja; javasolt home `src/v11/shared/actorProtocol/**`. |
| `src/core/bubble/metaReviewExecutionContext.ts` | `v11/shared` | S2 | Meta-review authority contract/validation helper, nem infra. |
| `src/core/bubble/approvalRequestEnvelope.ts` | `v11/shared` | X2 | Approval request canonical envelope/payload normalizacio, nem infra. Javasolt home `src/v11/shared/metaReviewGate/**` vagy `shared/approval/**`. |

#### 1.6 Already shim-only core surfaces

Ezek a Phase 4 inventory szempontjabol mar megfelelnek a "shim-only vagy explicit bridge" celallapotnak, ezert nem Phase 5 infra-batch celpontok:

1. `src/core/bubble/attachBubble.ts`
2. `src/core/bubble/commitBubble.ts`
3. `src/core/bubble/createBubble.ts`
4. `src/core/bubble/deleteBubble.ts`
5. `src/core/bubble/ideation.ts`
6. `src/core/bubble/inboxBubble.ts`
7. `src/core/bubble/kickoffBubble.ts`
8. `src/core/bubble/listBubbles.ts`
9. `src/core/bubble/mergeBubble.ts`
10. `src/core/bubble/metaReviewGate.ts`
11. `src/core/bubble/openBubble.ts`
12. `src/core/bubble/pendingApprovalSignal.ts`
13. `src/core/bubble/restartBubble.ts`
14. `src/core/bubble/resumeBubble.ts`
15. `src/core/bubble/startBubble.ts`
16. `src/core/bubble/statusBubble.ts`
17. `src/core/bubble/stopBubble.ts`
18. `src/core/bubble/watchdogBubble.ts`

`delete` besorolasu blocker-jelolt ebben a korben nincs; a megmaradt core entryk vagy aktiv ownershipet hordoznak, vagy mar shim/temporary bridge szerepben vannak.

### 2) Capability-Level Execution Batches

| Batch | Scope | Files move together | Depends on | Parallelization note |
|---|---|---|---|---|
| S1 - State kernel lock | state contract + persistence boundary | `stateStore.ts`, `stateSchema.ts`, `machine.ts`, `transitions.ts`, `executionContext.ts`, `initialState.ts` | none | Ez legyen az elso, mert a legnagyobb fan-in innen jon. Egy agentbatchkent ajanlott. |
| A1 - Transcript contract split | protocol contract + transcript persistence | `transcriptStore.ts`, `envelope.ts`, `validators.ts`, `sequenceAllocator.ts` | S1 only for naming alignment, not for runtime behavior | S1 utan kulon agentnek adhato. |
| A2 - Archive + bubble artifact layout | archive persistence + bubble filesystem topology | `archivePaths.ts`, `archiveSnapshot.ts`, `archiveIndex.ts`, `paths.ts`, `bubbleInstanceId.ts` | A1 path/layout naming lock ajanlott | Parhuzamosan mehet E1-gyel, ha a `bubble/**` artifact path-nevek rogzitettek. |
| E1 - Workspace/executor topology | repo/worktree/bubble lookup + command bootstrap + runtime session lifecycle slice | `repoResolution.ts`, `workspaceResolution.ts`, `bubbleLookup.ts`, `pairflowCommand.ts`, `agentCommand.ts`, `sessionsRegistry.ts` (session lifecycle slice) | `paths.ts` target-nevek ismertsege | Kulon agent lane, magas ertek/fan-in. `sessionsRegistry.ts` itt a `bubbleId/repoPath/worktreePath/tmuxSessionName` ownership miatt erintett. |
| C1 - Channel/tmux runtime | tmux es channel-facing pane binding/runtime delivery | `tmuxManager.ts`, `tmuxInput.ts`, `tmuxDelivery.ts`, `sessionsRegistry.ts` (tmux pane binding slice), `notifications.ts`, `reviewerContext.ts` | E1 command bootstrap contract, A2 runtime path lock | Kulon agent lane. `reviewerContext.ts` miatt E1 contract freeze utan inditsd. `sessionsRegistry.ts` channel-oldala csak a pane binding concern. |
| E2 - Validation execution | validation command runtime | `passValidationRunner.ts` | E1 | Kicsi, jo kulon agentnek. |
| A3 - Validation artifacts | validation evidence + recovery markers | `passValidationEvidence.ts` | E2 optional, de nem blocker | Kulon agent lane vagy A2 melle rakhato. |
| S2/X2 - Shared closure helpers | nem-infra shared/domain helper-ek | `watchdog.ts`, `metaReviewExecutionContext.ts`, `actorEmitContext.ts`, `approvalRequestEnvelope.ts`, `resumeSummary.ts` | S1 + A1 + E1 | Parhuzamos utobatch; a topology mar lockolt, de a helper-ek valodi home-ja ekkor tisztul. |
| X1 - Reviewer guidance pack | nem-infra reviewer/meta-review text contractok | `metaReviewSubmitGuidance.ts`, `reviewerCommandGateGuidance.ts`, `reviewerGuidance.ts`, `reviewerScoutExpansionGuidance.ts`, `reviewerSeverityOntology.generated.ts`, `reviewerSeverityOntology.ts` | none | Nagyon tiszta kulon agent lane, minimalis overlap. |

### 3) Recommended Phase 5 Order

1. `S1` - eloszor zarjuk le a state kernel es state persistence hatart.
2. `A1` + `E1` - ezutan ket kulon lane-ben mehet a transcript/protocol split es a workspace/executor topology.
3. `A2` + `C1` - ha a fenti contractok stabilak, indithato az artifact layout es a tmux/channel lane.
4. `E2` + `A3` + `X1` - kicsi, jol izolalhato follow-up lane-ek.
5. `S2/X2` - a megmaradt nem-infra helper-ek vegso hazba mozgatasa.

### 4) Clean Future Agent Lanes

| Agent lane | Write set | Why clean |
|---|---|---|
| Agent A - `state/` | `src/v11/infrastructure/state/**`, `src/v11/shared/state/**`, `src/v11/domain/state/**`, related import sites | Magas fan-in, de jol korulhatarolhato. |
| Agent B - `artifact/transcript` | `src/v11/infrastructure/artifact/transcript/**`, `src/v11/shared/protocol/**` | Protocol semantics es transcript persistence szetszedese utan tiszta write set. |
| Agent C - `artifact/archive` | `src/v11/infrastructure/artifact/archive/**`, `src/v11/infrastructure/artifact/bubble/**` | Archive + bubble layout kozos artifact capability. |
| Agent D - `executor/workspace` | `src/v11/infrastructure/executor/**` + `sessionsRegistry` executor/session-runtime slice | Git/worktree/command bootstrap ownership egyseges; ide kerul a runtime session lifecycle adat ownership is. |
| Agent E - `channel/tmux` | `src/v11/infrastructure/channel/**` + `sessionsRegistry` channel/tmux slice | Tmux + pane binding ownership jol izolalhato; a sessions registry tmux-oldala itt marad. |
| Agent F - `shared/reviewer-meta-review` | `src/v11/shared/reviewer/**`, `src/v11/shared/metaReview/**`, `src/v11/shared/actorProtocol/**` | Nem-infra helper/text contract lane, minimalis runtime overlap. |

### 5) Mini-Design Decisions Still Needed

Ezek mar nem blocker-szintu nyitott kerdesek; a Phase 5 elindithato. A donteseket batch-inditas elott az adott lane-ben kell rogzitani.

| Topic | Default decision in this doc | Why not blocker |
|---|---|---|
| `sequenceAllocator.ts` shared vs artifact split | Default home `v11/shared/protocol`, de az allocator-resz maradhat transcript-adjacent helper, ha a concrete ID-allocation algorithm nem emelkedik canonical contractte. | A top-level capability mar lockolt: protocol semantics nem infra, transcript persistence artifact. |
| `bubbleInstanceId.ts` artifact vs state | Default `artifact/bubble/**`. | Mindket opcio low-level tech capability; a top-level infra capability nem kerdeses. |
| `sessionsRegistry.ts` channel vs executor split | Default split: tmux/pane binding `channel/tmux`, runtime session lifecycle record `executor/session-runtime`. | A top-level capability mar lockolt; itt mar csak a file belso szeletelese a kerdes, nem a topology. |
| `passValidationEvidence.ts` egyben maradjon-e | Default egyben `artifact` alatt induljon. | Keso-bbi belso split (policy vs persistence) nem erinti a top-level topologyt. |
| `approvalRequestEnvelope.ts` pontos nem-infra home-ja | Default `shared/metaReviewGate/**`, alternativ `shared/approval/**`. | Mindketto nem-infra, a capability lock nem serul. |
| Reviewer guidance cluster vegso csomagolasa | Default `shared/reviewer/**`, prompt registry redesign nelkul. | A Phase 5 non-goal explicit modon tiltja a nagyobb redesign-t. |

### 6) Acceptance Lock For Phase 5 Start

1. A `v11/infrastructure` top-level capability-lock most mar eleg explicit: `state`, `channel`, `executor`, `artifact`.
2. A protocol semantics es canonical contracts nem mennek default infra ala.
3. Vegyes legacy file Phase 5-ben szetvaghato ket capability koze, ha a jelenlegi file shape mar most is kevert ownershipet hordoz; a topology lock ezt nem tiltja.
4. A `src/core/**` Phase 5 utani maradek allapota minden erintett file-nal vagy `shim/temporary bridge`, vagy kiuritett legacy facade kell legyen.
5. Blocker-szintu nyitott architekturalis kerdes nem maradt az infra execution elott.

## Residual Sweep Delta (2026-04-06)

1. `src/core/bubble/commandWorkspaceFallback.ts` torolve lett, mert mar nem volt elo runtime, CLI, public vagy teszten kivuli fogyasztoja; a canonical workspace fallback mar kozvetlenul a `src/v11/infrastructure/executor/workspace/commandWorkspaceFallback.ts`.
2. A `src/v11/**` oldalon megszunt a shim-only `core` facadek kozvetlen hasznalata a kovetkezo maradvanyokra:
   - `src/core/bubble/createBubble.ts`
   - `src/core/bubble/startBubble.ts`
   - `src/core/agent/converged.ts`
   - `src/core/human/reply.ts`
3. Ezekre guard kerult a `tests/contracts/v11/core-shim-boundary-coverage.test.ts` alatt, hogy a `v11 -> core` ownership visszacsuszas ne jojjon vissza ugyanebben a formaban.
4. Megmarado, kulon batch-et igenylo residual cluster-ek:
   - `core/metaReview` es a hozza kapcsolodo approval/list/status shared seam: meg elo `v11` fogyasztok vannak, ezert csak kulon meta-review closure batchben szukitheto tovabb.
   - `core/{validation,util,workspace/git,reviewer,metrics/gates,convergence}` helper cluster-ek: ezek tovabbi szukitese mar ownership-extract vagy facade-retire dontest igenyel, nem residual sweep mikrokort.

## Final Explicit Bridge Inventory (2026-04-07)

| Category | Relation | Why it remains now | Active consumer(s) | Delete trigger |
|---|---|---|---|---|
| remove-now | `src/cli/index.ts -> src/core/bubble/metaReview.ts` | Nem kellett mar kozvetlen `core` import: a CLI error mapping ugyanazon v11 facade-n at elerheto. | `src/cli/index.ts` meta-review stderr handling | Elvegezve ebben a batchben; a CLI most mar `src/v11/application/metaReview/emitMetaReviewV11.ts`-re mutat. |
| needs-separate-follow-up | `src/v11/shared/metaReview/metaReviewCommandApi.ts -> src/core/bubble/metaReview.ts` | A meta-review command/status/last-report runtime tovabbra is a `core` implementacioban el, a `v11` oldalrol ez mar explicit bridge-kent latszik. | `src/v11/application/metaReview/**`, ezen keresztul a CLI meta-review parancs es a public meta-review exportok | Kulon meta-review closure/extract batch utan torolheto, amikor a command API canonical `v11` ownerre koltozik vagy a facade teljesen kiurul. |
| documented-legacy-bridge | `src/v11/infrastructure/ui/server.ts -> src/core/ui/server.ts` | A UI server public/CLI edge mar `v11` feluleten keresztul latszik, de a futtathato implementacio meg a `core/ui/server.ts` alatt lakik. | `src/cli/commands/ui/server.ts`, `src/index.ts` | Kulon UI server ownership/extract batch utan torolheto, amikor a runtime implementacio is `v11/infrastructure` canonical ownerre kerul vagy a legacy facade megszunik. |
| test-only-compat | `tests/** -> src/core/**` meta-review es mas parity/contract shim importok | Ezek szandekos parity/compat coverage-t adnak a meg letezo legacy seam-ekre; nem runtime/public fogyasztok. | pl. `tests/v11/application/metaReview/metaReviewFacadeParity.test.ts`, `tests/cli/bubbleMetaReviewCommand.test.ts`, `tests/contracts/v11/*.runner.ts` | Akkor torolhetok vagy irhatoak at, amikor az adott legacy bridge/facade mar megszunt es a parity coverage elveszti a celjat. |

Closure guard note:
1. A `tests/contracts/v11/core-shim-boundary-coverage.test.ts` innentol explicit allowlistre zarja a `src/v11/**` es `src/cli/**` oldali kozvetlen `core` importokat.
2. Az allowlist jelenlegi, tudatos vegallapota pontosan ket nem-teszt oldali relation:
   - `src/v11/shared/metaReview/metaReviewCommandApi.ts -> src/core/bubble/metaReview.ts`
   - `src/v11/infrastructure/ui/server.ts -> src/core/ui/server.ts`
3. `src/index.ts` tovabbra is tiltott kozvetlen `core` re-export felulet marad.

## L2 - Implementation Notes (Optional)

1. A legnagyobb ertek/fan-in celpontok: `stateStore.ts`, `transcriptStore.ts`, `bubbleLookup.ts`, `tmuxDelivery.ts`, `tmuxManager.ts`, `sessionsRegistry.ts`.
2. A `src/v11/infrastructure/**` jelenleg meg nem letezik; a Phase 5 lane-eknek nem kell megvarniuk teljes directory scaffolding elokesziteset, eleg a fenti capability-lock.
3. A shim-only core facade-ket ne nyissuk ujra ugyanabban a batchben, amelyik az ownership extractet vegzi; elobb a `v11` owner legyen stabil, utana lehet shim-retire kort nyitni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `sequenceAllocator` contract split formalizalasa | L2 | P2 | later-hardening | Phase 4 topology review | Rogzits kulon file-level design note-ot az A1 batch elejen, ha a shared/artifact hatar kodszinten is kettevalik. |
| H2 | `passValidationEvidence` policy/persistence szetvalasztas | L2 | P2 | later-hardening | Phase 4 topology review | Eloszor egyben mozgasd `artifact` ala, csak utana bontsd, ha valodi reuse nyereseg latszik. |
| H3 | Reviewer guidance pack naming cleanup | L2 | P3 | later-hardening | Phase 4 topology review | Egyseges `shared/reviewer/**` naming pass kulon docs-only follow-upban. |

## Review Control

1. Phase 5 implementacios task mar nem vitathatja ujra a negy top-level infrastructure capabilityt.
2. Uj `infrastructure/protocol/**` letrehozasa csak explicit ADR-vel engedheto; ez a doc alapertelmezetten tiltja.
3. Ha egy implementacios batch a fenti topology locktol elter, kulon mini-design note kotelezo meg a kodmozgas elott.
4. A shim-only core facade-k es a valodi ownership extractek ne keveredjenek ugyanabba a mikrokorbe.

## Spec Lock

Mark the task as `IMPLEMENTABLE`, ha:
1. minden relevans megmaradt low-level core file kapott besorolast,
2. a Phase 5 batch-ek sorrendje es parhuzamosithato lane-jei explicitak,
3. a maradek nyitott pontok mini-design mereture szukultek,
4. es nincs blocker-szintu architekturalis kerdes az infra execution elott.
