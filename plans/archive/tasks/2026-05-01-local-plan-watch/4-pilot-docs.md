---
artifact_type: task
artifact_id: task_local_plan_watch_pilot_docs_v1
task_family_id: pilot-docs
sequence_key: "4"
task_id: 4-pilot-docs
title: "Local Plan Watch Pilot Docs"
status: archived
phase: phase4
target_files:
  - "README.md"
  - "docs/remote-bubble-execution.md"
  - "docs/local-plan-watch-v1-pilot.md"
prd_ref: null
plan_ref: plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 4-pilot-docs-doc
impl_bubble_id: 4-pilot-docs-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Local Plan Watch Pilot Docs

## L0 - Policy

### Goal

Validate the local `plan watch` workflow on a representative plan and document the V1 boundary so operators can distinguish supported local-control-plane automation from deferred remote-only supervision.

### Domain / Control Model Summary

1. Business invariant: watch automation may reduce operator polling, but it must not weaken Pairflow lifecycle authority, `ExecutePairflowPlan` route authority, or human approval boundaries.
2. Control model: `plan watch` detects linked-bubble trigger evidence and invokes the configured local runner; `ExecutePairflowPlan` owns route selection and delegated workflow progression; Pairflow owns bubble lifecycle state.
3. Read-path rule: pilot evidence may read typed CLI output, watch ledger records, Pairflow bubble status/list output, and runner results; documentation must not cite chat memory or raw transcript impressions as route authority.
4. Forbidden fallback: do not document remote-only watch progression, remote-only bubble creation/start, route computation inside the watcher, or notification-only output as successful automation.
5. Allowed resolution path: deterministic same-authority evidence from CLI result fields, ledger records, and Pairflow lifecycle status may be summarized for operator guidance.
6. Missing-data rule: if a pilot run cannot produce trustworthy ledger/runner/status evidence, document the blocker and stop rather than claiming the plan watch path is validated.
7. Phase boundary:
   - contract closure: preserve predecessor contracts; do not redefine them here.
   - producer closure: successor-owned by existing runner/trigger/watch code.
   - internal execution closure: pilot only exercises the existing local path.
   - workflow/orchestration closure: remains owned by `ExecutePairflowPlan`.
   - read-model closure: owned here for README/docs/operator wording.
   - activation closure: owned here only as operator-facing usage documentation.
   - cleanup/recovery closure: document deferred remote-only and recovery limitations; do not implement them.

### Plan Linkage

1. Parent plan gap closed: missing pilot evidence and operator-facing guidance.
2. Depends on: `3-watch-loop`.
3. Unlocks / impacts successors: future remote supervisor/event-hook/UI work can consume the recorded V1 boundary and pilot evidence.
4. Task-list impact: refines planned task `4-pilot-docs`; no task is replaced or obsoleted.
5. Inherited validation / exit expectation: contributes to Done Definition 8 and Validation Strategy 8-9 from the parent plan, plus pilot evidence for trigger ledger behavior, interval behavior, runner invocation/result capture, and deferred remote-control-plane limitation.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `plans/local-plan-watch-plan-v1.md`
   - `src/cli/commands/plan/watch.ts`
   - `src/v11/application/planWatch/planWatchLoopContract.ts`
   - `src/v11/application/planWatch/planWatchLedgerContract.ts`
   - `docs/remote-bubble-execution.md`
2. Canonical elements: `ExecutePairflowPlan` remains route authority; Pairflow remains bubble lifecycle authority; `plan watch` remains trigger/dedupe/runner invocation only.
3. Guard elements: runner command availability, ledger write safety, duplicate trigger suppression, status freshness, and `--dry-run`.
4. Compat-only elements: human-readable CLI summaries and prose examples; typed result/ledger fields remain authoritative.
5. Forbidden reinterpretations: do not turn `plan watch` into a full route resolver, lifecycle mutator, remote-only control plane, or approval substitute.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `src/cli/commands/plan/watch.ts`, `src/v11/application/planWatch/planWatchLoopContract.ts`, `README.md`, and `docs/remote-bubble-execution.md`.
2. Actual touched scope: docs-only read-model and pilot evidence recording.
3. Mutation entrypoints in scope: documentation files only; no command handler, ledger writer, runner bridge, status port, or lifecycle command implementation changes.
4. Hidden scope ruled out: the code path already exists from predecessor tasks; this task documents and exercises it rather than extending trigger, runner, route, or remote authority.
5. Branch inventory note: pilot evidence should cover no-trigger or dry-run sanity, approval-ready trigger invocation, duplicate suppression, interval configuration, human/checkpoint/blocker result wording, and remote-only boundary wording.
6. Why the declared task shape matches reality: remaining plan gap is operator-facing confidence and boundary documentation, not new runtime behavior.

### Authority Boundary Map

1. Authority producer: existing `plan watch` CLI/application code and Pairflow lifecycle status.
2. Stored authority: watch ledger records under `.pairflow` and committed pilot documentation.
3. In-scope consumers: README users, operator docs, and successor planning.
4. Explicit out-of-scope consumers: `ExecutePairflowPlan` route selection, Pairflow lifecycle mutation, remote supervisors, event hooks, UI checkpoint inboxes, and code-level API consumers.
5. Export surfaces closed in this phase: yes, operator-facing documentation and pilot evidence only.

### Baseline Preservation

1. Must-preserve behaviors: `plan watch` invokes a configured local runner by default, `--dry-run` does not invoke it, duplicate evidence is skipped, and stale/missing status fails closed.
2. Allowed resolution paths: summarize typed CLI/ledger/status evidence without deriving new route meaning.
3. Forbidden regression interpretations: do not imply `READY_FOR_HUMAN_APPROVAL` is approval, do not imply watcher output can approve/close bubbles, and do not imply remote-only progression is supported.
4. Replacement proof required if removed: any removed README/docs boundary wording needs equivalent operator-visible guidance.

### Success / Completion Proof Boundary

1. Current canonical success proof source: predecessor code tests and merged implementation.
2. Target canonical success proof source: pilot document with exact command/evidence references and README/docs guidance aligned to the tested behavior.
3. Current canonical completion proof source: task `3-watch-loop` implementation close.
4. Target canonical completion proof source: docs committed with pilot evidence and explicit V1 boundary.
5. Reused proof contract: `PlanWatchIterationResult`, watch ledger records, and `AgentRunnerBridgeResult.status`.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: README usage text, remote-boundary docs, and `docs/local-plan-watch-v1-pilot.md`.
8. Mixed-truth surfaces allowed: CLI prose summaries may be quoted as operator evidence, but typed result/ledger/status fields remain the cited authority.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`.
2. Secondary shape: `N/A`.
3. Preconditions that must pass before side effects: local build is fresh enough to run `pairflow plan watch`; pilot commands use a disposable or representative plan state and do not mutate unrelated bubbles.
4. Side effects forbidden before preconditions pass: no lifecycle mutation, no runner invocation against ambiguous trigger evidence, and no documentation claim of validation without evidence.
5. Invalid/precondition-failure behavior: record blocker/limitation in the pilot doc instead of broadening behavior.
6. Coordination primitives in scope: `N/A`.

### In Scope

1. Add a pilot evidence document for local `plan watch` V1.
2. Document the command, runner configuration shape, default interval, `--once`, and `--dry-run` behavior.
3. Record evidence for trigger detection, dedupe, interval behavior, runner result capture, and checkpoint/blocker wording.
4. Clarify local-control-plane V1 boundaries in README and remote execution docs.
5. Preserve that `plan watch` launches `ExecutePairflowPlan` instead of replacing it.

### Out of Scope

1. Product/runtime code changes.
2. Remote-only supervisor, remote-only plan progression, or remote-only bubble creation/start.
3. Event-driven hooks, service/daemon mode, manual nudge/continue commands, and UI checkpoint inboxes.
4. Changes to `ExecutePairflowPlan`, `UsePairflow`, runner bridge, trigger index, watch ledger schema, or lifecycle commands.

### Safety Defaults

1. Prefer `--dry-run` for documentation examples that demonstrate detection without runner mutation.
2. Treat missing ledger/runner/status proof as a documented blocker, not as successful validation.
3. Keep remote guidance fail-closed: observe through local routed status only; do not mutate from remote clones.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. If `no`, required split: `N/A`.
10. Identity/join note:
   - canonical identity path: plan path -> task tracker row -> linked bubble id -> trigger evidence -> watch ledger record -> runner result.
   - competing identifiers or fallback identities: bubble list order, transcript prose, chat history, and remote clone state are forbidden.
11. Authority/source-of-truth note:
   - canonical source: typed watch result/ledger plus Pairflow status.
   - forbidden secondary sources: operator memory, raw transcript impressions, and prose-only route claims.
12. Closure-budget triage:
   - closure buckets touched: read_model_consumers, activation documentation.
   - intentionally collapsed closures: README, remote-boundary docs, and pilot evidence are collapsed because they are all operator-facing documentation for the same V1 surface.
   - explicitly deferred closures: UI, event hooks, remote-only supervisor, and runtime recovery automation.
13. Bounded-task-shape decision:
   - primary shape: docs-only activation/read-model.
   - secondary shape: `N/A`.
   - why this bounded mix is safe: the task records and explains existing behavior without changing producers or lifecycle state.
14. Contract-dense decision:
   - gate triggered: `no`
   - trigger reasons: `N/A`
   - canonical matrix source: `N/A`
   - mirrored surfaces: README, remote docs, pilot evidence.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Watch docs must preserve review gates and route authority. | Never describe watcher output as approval or route truth. | P1 | required-now |
| Control model | Watcher triggers runner; `ExecutePairflowPlan` routes; Pairflow owns lifecycle. | Docs must name the owner split directly. | P1 | required-now |
| Read-path rule | Evidence comes from typed watch output, ledger, Pairflow status/list, and runner result. | Pilot doc must include concrete commands or artifacts. | P1 | required-now |
| Forbidden fallback | No chat-memory, route guessing, stale remote state, or remote-only progression claims. | Wording must fail closed on unsupported cases. | P1 | required-now |
| Allowed resolution path | Summarize same-authority evidence only. | Examples may show CLI/ledger fields but not invent route decisions. | P1 | required-now |
| Missing-data rule | Missing evidence becomes a blocker/limitation. | Pilot doc must say when validation is incomplete. | P1 | required-now |
| Phase boundary | This task owns docs and pilot evidence only. | No product code or lifecycle changes. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `ExecutePairflowPlan` route authority | skill route contract | Only the runner/skill chooses next workflow routes. | preserve | P1 | required-now |
| Pairflow lifecycle state | `UsePairflow` and bubble status | Bubble status is lifecycle authority, not plan sequencing authority. | preserve | P1 | required-now |
| `plan watch` trigger role | watch loop contract | Trigger, dedupe, invoke local runner. | preserve | P1 | required-now |
| Local control plane | remote execution docs | V1 routing/mutation stays laptop/local controlled. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Use existing CLI/contract files only as documentation anchors. | Do not modify runtime code. | P1 | required-now |
| Actual touched scope | Docs-only read model. | Keep changes in README/docs/pilot artifact. | P1 | required-now |
| Mutation entrypoints in scope | Documentation files only. | No command or ledger mutations. | P1 | required-now |
| Hidden scope ruled out | Predecessor code already merged. | Pilot validates, it does not add behavior. | P1 | required-now |
| Branch inventory note | Include trigger, dedupe, interval, runner result, checkpoint/blocker, remote boundary. | Pilot evidence must cover or explicitly mark gaps. | P1 | required-now |
| Shape proof | Remaining plan gap is confidence and guidance. | Docs-only task is sufficient. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Pilot evidence and operator guidance. | Add docs, not code. | P1 | required-now |
| Depends on | `3-watch-loop` archived. | Use the merged command surface as baseline. | P1 | required-now |
| Unlocks / impacts successors | Future remote/event/UI work. | Explicitly list deferred limitations. | P2 | required-now |
| Task-list impact | Refines `4-pilot-docs`. | Preserve task identity. | P1 | required-now |
| Inherited validation / exit expectation | Done Definition 8 and Validation Strategy 8-9. | Record command evidence and boundary statement. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| README/operator docs | users/operators | additive | add `plan watch` guidance | N/A |
| remote execution docs | users/operators | additive | clarify V1 local-control-plane boundary | remote supervisor successor |
| pilot evidence doc | plan successor evidence | additive | create new doc | N/A |

### 0e) Baseline Preservation

| Behavior | Preserve / Change | Evidence Required | Priority |
|---|---|---|---|
| Runner invocation by default | preserve | command/evidence wording says runner is invoked unless dry-run/checkpoint/blocker applies | P1 |
| Dry-run does not invoke runner | preserve | dry-run example or evidence | P1 |
| Duplicate suppression | preserve | ledger/evidence summary | P1 |
| Remote-only progression unsupported | preserve | remote docs wording | P1 |

### 0f) Success / Completion Proof

| Proof Surface | Required Evidence | Priority |
|---|---|---|
| Pilot command transcript | exact command(s), output summary, and date | P1 |
| Watch ledger | record key/invocation/result or explicit blocker if unavailable | P1 |
| Runner result | settled/human/blocker status and reason | P1 |
| Remote boundary | explicit docs statement that local control plane is required in V1 | P1 |

## L2 - Acceptance Tests / Evidence

1. `README.md` documents `pairflow plan watch <plan-path>` with `--once`, `--dry-run`, interval, and runner command configuration.
2. `docs/remote-bubble-execution.md` states that V1 `plan watch` can observe/routably act only through the local control plane and does not provide remote-only plan progression.
3. `docs/local-plan-watch-v1-pilot.md` records a representative pilot with command(s), observed result, ledger or runner evidence, and any blockers.
4. The pilot doc distinguishes dry-run/notification output from successful automation.
5. The pilot doc records duplicate suppression evidence or states the exact blocker that prevented verifying it.
6. The pilot doc records interval behavior evidence with the 60-second default and a configured shorter interval or single-iteration mode.
7. The docs do not claim the watcher computes `ResolvePlanState` routes or mutates bubble lifecycle.
8. The docs do not claim remote-only bubble creation/start/progression is supported.
9. Run `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant docs/CLI tests if changed by docs references, and `pnpm test` unless skipped with reason.
10. Run `pnpm build` before any subsequent Pairflow lifecycle command after source changes.
