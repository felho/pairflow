---
artifact_type: task
artifact_id: task_local_plan_watch_runner_observability_v1
task_family_id: watch-runner-observability
sequence_key: "6"
task_id: 6-watch-runner-observability
title: "Plan Watch Codex Runner Observability"
status: draft
phase: phase6-retrofit
target_files:
  - "src/v11/application/planWatch/codexAgentRunnerBridge.ts"
  - "src/v11/application/planWatch/agentRunnerBridge.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeContract.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeResult.ts"
  - "src/v11/application/planWatch/planWatchLedger.ts"
  - "src/v11/application/planWatch/planWatchLedgerContract.ts"
  - "src/v11/application/planWatch/planWatchLoopExecution.ts"
  - "src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts"
  - "tests/v11/application/planWatch/agentRunnerBridge.test.ts"
  - "tests/v11/application/planWatch/planWatchLedger.test.ts"
  - "tests/v11/application/planWatch/planWatchLoop.test.ts"
  - "README.md"
  - "docs/local-plan-watch-v1-pilot.md"
prd_ref: null
plan_ref: plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md
  - plans/archive/tasks/2026-05-01-local-plan-watch/5-plan-watch-codex-runner.md
  - src/v11/application/planWatch/codexAgentRunnerBridge.ts
  - src/v11/application/planWatch/agentRunnerBridge.ts
  - src/v11/application/planWatch/planWatchLedger.ts
  - docs/local-plan-watch-v1-pilot.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Plan Watch Codex Runner Observability

## L0 - Policy

### Goal

Retrofit the built-in `plan watch` Codex runner so every non-dry-run invocation
has durable operator visibility: raw Codex JSONL events, a Pairflow-normalized
timeline, human-discoverable artifact paths, and a final runner result derived
from the streamed structured agent message.

### Domain / Control Model Summary

1. Business invariant: `plan watch` automation must be inspectable after the
   fact; an operator must be able to see what `ExecutePairflowPlan` did without
   reverse-engineering Codex session files or relying on the final summary only.
2. Control model: Codex owns raw JSONL event emission; the Pairflow runner bridge
   owns event persistence, timeline normalization, final-result extraction, and
   ledger artifact linkage; `ExecutePairflowPlan` remains the only route
   authority.
3. Read-path rule: final runner status must be read from the last valid
   structured `agent_message` event in the Codex JSONL stream, not from
   `last-message.json`, prose stdout parsing, or external Codex session history.
4. Forbidden fallback: do not keep `--output-last-message` as a second source of
   runner truth in JSON mode; do not require users to parse raw Codex JSONL to
   understand a completed watch invocation; do not make the watcher compute
   routes from timeline events.
5. Allowed resolution path: Pairflow may invoke `codex exec --json
   --output-schema <schema> ...`, persist each JSONL event as `events.ndjson`,
   normalize selected events into `timeline.ndjson`, write `metadata.json`, and
   classify the run from the stream-derived structured final object.
6. Missing-data rule: if the stream is empty, contains malformed JSON, contains
   no valid structured final `agent_message`, or the final structured object
   does not match the runner output schema, return `blocked` with
   `AGENT_RUNNER_OUTPUT_INVALID` or the narrower existing failure code.
7. Phase boundary:
   - contract closure: introduce a Pairflow-owned runner artifact/timeline
     contract
   - producer closure: Codex JSONL stream becomes the source of final output
   - internal execution closure: subprocess streaming and file persistence
   - workflow/orchestration closure: unchanged; `ExecutePairflowPlan` owns
     route decisions
   - read-model closure: durable `timeline.ndjson`, not UI rendering
   - activation closure: non-dry-run plan-watch Codex runner emits artifacts
   - cleanup/recovery closure: ledger links each completed attempt to artifacts

### Plan Linkage

1. Parent plan gap closed: missing operator visibility into the built-in Codex
   runner after task `5-plan-watch-codex-runner`.
2. Depends on: `5-plan-watch-codex-runner`.
3. Unlocks / impacts successors: future `plan watch timeline` CLI or UI can
   consume `timeline.ndjson` without parsing raw Codex JSONL.
4. Task-list impact: adds retrofit task `6-watch-runner-observability`; no
   prior task is superseded.
5. Inherited validation / exit expectation: preserve existing bridge result
   statuses and ledger dedupe while changing the Codex final-output source.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/application/planWatch/codexAgentRunnerBridge.ts`
   - `src/v11/application/planWatch/agentRunnerBridge.ts`
   - `src/v11/application/planWatch/agentRunnerBridgeResult.ts`
   - `src/v11/application/planWatch/planWatchLedger.ts`
   - `plans/archive/tasks/2026-05-01-local-plan-watch/5-plan-watch-codex-runner.md`
   - `docs/local-plan-watch-v1-pilot.md`
2. Canonical elements:
   - runner statuses: `settled_checkpoint`, `human_checkpoint`, `blocked`
   - required final field: non-empty `reason_code`
   - invocation identity: `invocationId`
   - artifact source: `.pairflow/runtime/plan-watch/agent-runner/<artifact-dir>/`
3. Guard elements:
   - raw event parseability
   - final structured event schema validity
   - stable normalized timeline event taxonomy
   - human-discoverable artifact directory naming
4. Compatibility elements:
   - existing ledger records without `artifactDir`
   - existing invocation directories with hash-only path segments
5. Forbidden reinterpretations:
   - timeline events are observability only, not orchestration authority
   - `metadata.json` records provenance only, not lifecycle state
   - `events.ndjson` raw Codex schema is not a Pairflow public API

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `buildCodexRunnerArgs`
   - `prepareCodexRunnerFiles`
   - `appendResultFileOutput`
   - `classifyProcessResult`
   - `buildCompletedPlanWatchLedgerRecord`
   - watch loop runner completion mapping
2. Actual touched scope: Codex subprocess adapter, artifact persistence, final
   result parsing, ledger record shape, docs, and focused tests.
3. Mutation entrypoints in scope: runner artifact writes only; no plan/task or
   bubble lifecycle mutation changes.
4. Hidden scope ruled out: Codex SDK migration, UI timeline page, remote
   supervisor, trigger-index changes, and route-resolution changes.
5. Branch inventory note: valid stream with final object, valid stream with
   intermediate structured messages and final object, empty stream, malformed
   event line, no final structured message, invalid final object, command event
   with large output, legacy ledger record without artifact dir, and path
   naming collisions.
6. Why the declared task shape matches reality: the runner already owns Codex
   invocation and result classification; this task changes its IO contract and
   observability artifacts without widening route authority.

### Authority Boundary Map

1. Authority producer: Codex runner bridge produces artifacts and final result.
2. Stored authority: watch ledger stores the invocation/result and artifact dir;
   runner artifact directory stores raw and normalized evidence.
3. In-scope consumers: future CLI/UI timeline readers, operator debugging, tests,
   and current bridge classification.
4. Explicit out-of-scope consumers: `ExecutePairflowPlan` route logic, bubble
   lifecycle commands, UI rendering, and remote-only control planes.
5. Export surfaces closed in this phase: durable artifact contract for a
   completed/non-completed runner invocation.

### Baseline Preservation

1. Must-preserve behaviors:
   - dry-run still does not invoke Codex
   - Codex unavailable/non-zero/timeout remains fail-closed
   - runner result status taxonomy stays unchanged
   - duplicate suppression still keys from trigger evidence, not artifact path
2. Allowed resolution paths: stream-derived final result replaces
   `last-message.json`; normalized timeline is additive observability.
3. Forbidden regression interpretations: do not treat a missing timeline write as
   successful if the raw event stream or final result could not be persisted.
4. Replacement proof required if removed: removing `--output-last-message`
   requires tests proving the final result is extracted from JSONL stream events.

### Success / Completion Proof Boundary

1. Current canonical success proof source: `last-message.json` appended to
   stdout and parsed as structured output.
2. Target canonical success proof source: `events.ndjson` streamed from
   `codex exec --json`, with final result extracted from the last schema-valid
   structured `agent_message`.
3. Current canonical completion proof source: ledger completed run record with
   runner status/reason code.
4. Target canonical completion proof source: ledger completed run record plus
   `artifactDir` pointing to `metadata.json`, `events.ndjson`, and
   `timeline.ndjson`.
5. Reused proof contract: `StructuredAgentRunnerOutput`.
6. Proof-parity rule: `upgrade_required`.
7. Final truth surfaces affected: runner process output parsing, ledger record
   schema, artifact directory layout, README/pilot docs.
8. Mixed-truth surfaces allowed: raw Codex event stream and normalized Pairflow
   timeline may coexist, but the final result source is the stream-derived
   structured agent message only.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: subprocess_adapter.
2. Secondary shape: read_model_or_observability.
3. Preconditions that must pass before side effects: payload validates, plan/repo
   paths exist, artifact directory can be created, schema can be written, and
   Codex can be spawned.
4. Side effects forbidden before preconditions pass: no completed ledger record
   and no successful timeline claim.
5. Invalid/precondition-failure behavior: return blocked with existing
   precondition reason and write metadata only when the artifact directory was
   created far enough to do so honestly.
6. Coordination primitives in scope: existing ledger reservation/completion only.

### In Scope

1. Add `--json` to the built-in Codex runner invocation.
2. Remove `--output-last-message` from the JSON-mode built-in runner path.
3. Persist raw Codex stream lines to `events.ndjson`.
4. Normalize selected raw events to Pairflow-owned `timeline.ndjson`.
5. Write `metadata.json` with invocation id, started timestamp, repo path, plan
   path, plan slug, trigger kind, mode, PID when available, and schema version.
6. Use artifact directories named
   `<local-date>_<local-time>_<plan-slug>_<invocation-id>`.
7. Extract the final runner output from the last valid structured
   `agent_message` event.
8. Add `artifactDir` to completed/reserved ledger records, with legacy read
   compatibility for records that do not have it.
9. Update README and pilot docs to describe raw/timeline artifact locations and
   stream source-of-truth behavior.
10. Add focused tests for parser, normalizer, final extraction, artifact naming,
    metadata writing, ledger persistence, and invalid stream handling.

### Out of Scope

1. `@openai/codex-sdk` migration.
2. UI rendering of timeline events.
3. New `pairflow plan watch timeline` command.
4. Trigger discovery or dedupe-key changes.
5. Remote-only control-plane work.
6. Changing `ExecutePairflowPlan` prompts or route authority beyond the minimum
   needed to keep the structured final output contract.

### Safety Defaults

1. Raw events are always preserved before normalization decisions are applied.
2. Timeline normalization must redact or summarize large command outputs by
   default; full output remains in raw events.
3. Malformed raw events fail closed for final classification but should still be
   present in `events.ndjson` for debugging.
4. Artifact directory naming must be deterministic and collision-resistant; if a
   directory already exists, append a short stable suffix or use the invocation
   id uniqueness path.
5. Legacy ledger reads must not fail solely because old records lack
   `artifactDir`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - built-in Codex runner process invocation
   - raw event artifact contract
   - normalized timeline event contract
   - final runner output extraction contract
   - watch ledger record contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`
9. If `no`, required split: `N/A`.
10. Identity/join note:
    - canonical identity path: `invocationId` plus artifact-dir metadata.
    - competing identifiers or fallback identities: PID and local timestamp are
      discoverability aids, not canonical identity.
11. Authority/source-of-truth note:
    - canonical source: JSONL stream final structured agent message.
    - forbidden secondary sources: empty `last-message.json`, human transcript
      search, or Codex session files under `~/.codex`.
12. Closure-budget triage:
    - closure buckets touched: subprocess adapter, persisted artifact contract,
      ledger consume, docs.
    - intentionally collapsed closures: raw stream, normalized timeline, and
      final extraction because they are one IO contract change.
    - explicitly deferred closures: UI and timeline display command.
13. Bounded-task-shape decision:
    - primary shape: subprocess_adapter.
    - secondary shape: read_model_or_observability.
    - why this bounded mix is safe: no lifecycle or route authority changes.
14. Contract-dense decision:
    - gate triggered: `yes`.
    - trigger reasons: structured event parsing, status/result taxonomy,
      persisted ledger shape, and downstream timeline consumers.
    - canonical matrix source: L1 `Canonical Runner Observability Matrix`.
    - mirrored surfaces: L0 policy, L1 data contract, L2 tests, README, pilot
      docs.

## L1 - Change Contract

### Canonical Runner Observability Matrix

| Contract Element | Source / Producer | Required Shape | Consumer | Failure Behavior | Priority |
|---|---|---|---|---|---|
| Codex invocation | `buildCodexRunnerArgs` | argv array includes `exec --json --cd <repo> --output-schema <schema> <prompt>` and excludes `--output-last-message` | subprocess runner | spawn/non-zero/timeout maps to existing blocked reasons | P1 |
| Raw stream | spawned Codex stdout | one raw line per Codex JSONL event, persisted unchanged to `events.ndjson` | debug/audit/final extractor | malformed line recorded and final extraction fails if no valid final output | P1 |
| Timeline stream | Pairflow normalizer | Pairflow-owned NDJSON events with schema version, timestamp, type, summary fields | operator/future UI | normalizer failure blocks if raw stream cannot be trusted; large outputs summarized | P1 |
| Final runner result | stream extractor | last valid structured `agent_message.text` matching runner schema | bridge classifier/ledger | no valid object -> `AGENT_RUNNER_OUTPUT_INVALID` | P1 |
| Artifact metadata | runner bridge | `metadata.json` with invocation, plan, repo, trigger, startedAt, planSlug, mode, pid | discovery/future CLI | metadata write failure -> file IO blocked before success claim | P1 |
| Artifact directory | runner bridge | `<YYYY-MM-DD>_<HH-mm-ss>_<plan-slug>_<invocation-id>` under `.pairflow/runtime/plan-watch/agent-runner` | humans/ledger | collision gets deterministic suffix or unique invocation segment | P1 |
| Ledger linkage | ledger record | optional `artifactDir` for new run records; legacy records still parse | watch loop/future CLI | missing legacy field is accepted; malformed new field blocks schema only if present and invalid | P1 |

### Timeline Event Contract

| Timeline Type | Raw Source | Required Fields | Display Rule | Priority |
|---|---|---|---|---|
| `runner_status` | structured `agent_message` | `at`, `reasonCode`, `summary`, optional `changedArtifacts`, optional `routeLedgerSummary` | show in main timeline | P1 |
| `command_started` | command execution start | `at`, `command`, optional `itemId` | show command shortened | P1 |
| `command_completed` | command execution complete | `at`, `command`, `exitCode`, `outputLineCount`, optional `outputPreview` | summarize output, do not dump full file reads | P1 |
| `patch_applied` | apply-patch event when present | `at`, optional `changedFiles` | show changed file list | P2 |
| `delegation_started` | spawn/wait agent raw events when present | `at`, target summary when recoverable | show review/delegation progress | P2 |
| `runner_completed` | final structured result or `turn.completed` | `at`, `status`, `reasonCode`, optional usage summary | show final checkpoint | P1 |
| `runner_event_unrecognized` | unknown raw event | `at`, raw type | hide by default, retain for compatibility diagnostics | P3 |

### Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Evidence |
|---|---|---|---|---|---|
| CS1 | `codexAgentRunnerBridge.ts` | Codex arg/file preparation | Builds JSONL-mode args, writes schema/metadata paths, no last-message file. | P1 | T1-T4 |
| CS2 | `agentRunnerBridge.ts` | subprocess execution/classification | Streams stdout lines to raw/timeline artifacts and classifies from stream final result. | P1 | T1-T7 |
| CS3 | `agentRunnerBridgeResult.ts` | structured output parser | Accepts only schema-valid final object from agent message text. | P1 | T2,T5,T6 |
| CS4 | `planWatchLedger.ts` | record read/write | Persists `artifactDir` for new records and reads old records without it. | P1 | T8 |
| CS5 | `planWatchLoopExecution.ts` | completion record | Includes artifact linkage in completed runner evidence. | P1 | T8,T9 |
| CS6 | README/docs | operator guidance | Documents `events.ndjson`, `timeline.ndjson`, `metadata.json`, directory naming, and final source. | P2 | T10 |

### Data and Interface Contract

1. `metadata.json` schema version starts at `1`.
2. `events.ndjson` is raw Codex-owned JSONL and is not normalized by Pairflow.
3. `timeline.ndjson` is Pairflow-owned and may be consumed by future CLI/UI.
4. `artifactDir` in ledger is repo-relative when inside the repo and absolute
   only if the artifact root is outside the repo.
5. `planSlug` is derived from the watched plan filename stem without leading
   date prefix when possible; if no safe slug exists, use `plan`.
6. Directory timestamp uses local time for operator discoverability and
   `metadata.json.startedAt` stores ISO UTC for canonical ordering.
7. PID may be recorded in metadata but must not be used as canonical identity.

### Fallback / Error Contract

| Case | Required Result | Reason Code | Notes |
|---|---|---|---|
| Codex spawn ENOENT | blocked | `PLAN_WATCH_CODEX_UNAVAILABLE` | unchanged |
| stdout stream empty | blocked | `AGENT_RUNNER_OUTPUT_INVALID` | raw artifact may be empty |
| malformed JSONL line | blocked unless valid final object policy explicitly tolerates it | `AGENT_RUNNER_OUTPUT_INVALID` | prefer fail-closed for V1 |
| no structured agent message | blocked | `AGENT_RUNNER_OUTPUT_INVALID` | do not use last-message fallback |
| final object schema invalid | blocked | `AGENT_RUNNER_OUTPUT_INVALID` | include output diagnostic |
| timeline write failure | blocked | `PLAN_WATCH_RUNNER_FILE_IO_FAILED` | do not claim observability success |
| legacy ledger record lacks artifactDir | accepted | N/A | read compatibility |

## L2 - Verification Contract

### Test Matrix

| ID | Scenario | Expected Proof | Priority |
|---|---|---|---|
| T1 | Codex args in JSONL mode | `--json` present, `--output-last-message` absent, argv remains no-shell array | P1 |
| T2 | Valid stream with three structured agent messages | final result uses last schema-valid message | P1 |
| T3 | Raw event persistence | `events.ndjson` exactly preserves emitted JSONL lines | P1 |
| T4 | Timeline normalization | command starts/completions and runner status messages become `timeline.ndjson` events | P1 |
| T5 | Empty stream | blocked `AGENT_RUNNER_OUTPUT_INVALID` | P1 |
| T6 | Invalid final output | blocked `AGENT_RUNNER_OUTPUT_INVALID` | P1 |
| T7 | Large command output | timeline stores count/preview, not full dump | P2 |
| T8 | Ledger artifact dir | new records include `artifactDir`; old records still read | P1 |
| T9 | Artifact dir naming | name includes local date, local time, plan slug, invocation id and remains path-safe | P1 |
| T10 | Docs | README/pilot docs describe raw/timeline artifacts and stream source of truth | P2 |

### Required Commands

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Focused Vitest tests for plan-watch runner bridge and ledger.
5. `pnpm test` unless the implementation bubble validation plan records a
   narrower accepted substitute with explicit rationale.
6. `pnpm build` because this task changes CLI/runtime source.

### Live / Pilot Evidence

1. Run a read-only or disposable non-dry-run `pairflow plan watch` Codex runner
   path that produces:
   - `metadata.json`
   - `events.ndjson`
   - `timeline.ndjson`
   - ledger `artifactDir`
2. Record a short evidence note in `docs/local-plan-watch-v1-pilot.md`.
3. Verify duplicate suppression remains ledger-backed and does not depend on
   artifact directory names.

### Acceptance Boundary

The task is complete when the built-in Codex runner no longer depends on
`last-message.json`, every successful non-dry-run Codex runner attempt has raw
and normalized artifacts, the final result is stream-derived, and old ledger
records remain readable.
