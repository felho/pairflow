---
artifact_type: task
artifact_id: task_local_plan_watch_runner_observability_v1
task_family_id: watch-runner-observability
sequence_key: "6"
task_id: 6-watch-runner-observability
title: "Plan Watch Codex Runner Observability"
status: approved
phase: phase6-retrofit
target_files:
  - "src/v11/application/planWatch/codexAgentRunnerBridge.ts"
  - "src/v11/application/planWatch/codexAgentRunnerArtifacts.ts"
  - "src/v11/application/planWatch/codexAgentRunnerStream.ts"
  - "src/v11/application/planWatch/codexAgentRunnerTimeline.ts"
  - "src/v11/application/planWatch/agentRunnerBridge.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeContract.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeResult.ts"
  - "src/v11/application/planWatch/planWatchLedger.ts"
  - "src/v11/application/planWatch/planWatchLedgerContract.ts"
  - "src/v11/application/planWatch/planWatchLoopExecution.ts"
  - "src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts"
  - "tests/v11/application/planWatch/agentRunnerBridge.test.ts"
  - "tests/v11/application/planWatch/codexAgentRunnerArtifacts.test.ts"
  - "tests/v11/application/planWatch/codexAgentRunnerStream.test.ts"
  - "tests/v11/application/planWatch/codexAgentRunnerTimeline.test.ts"
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
doc_bubble_id: plan-watch-observability
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
3. Read-path rule: final runner status must be read only from the last valid
   structured `agent_message` event in the Codex JSONL stream, not from
   `last-message.json`, prose stdout parsing, stderr text, process exit text, or
   external Codex session history.
4. Forbidden fallback: do not keep `--output-last-message` as a primary,
   secondary, diagnostic, or emergency source of runner truth in JSON mode; do
   not require users to parse raw Codex JSONL to understand a completed watch
   invocation; do not make the watcher compute routes from timeline events.
5. Allowed resolution path: Pairflow may invoke `codex exec --json
   --output-schema <schema> ...`, persist each JSONL event as `events.ndjson`,
   normalize selected events into `timeline.ndjson`, write `metadata.json`, and
   classify the run from the stream-derived structured final object.
6. Missing-data rule: if the stream is empty, contains any malformed JSON line,
   contains no valid structured final `agent_message`, or the final structured
   object does not match the runner output schema, return `blocked` with
   `AGENT_RUNNER_OUTPUT_INVALID` or the narrower existing failure code. Do not
   reinterpret later filesystem artifacts, Codex session history, or timeline
   summaries as a substitute final result.
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
   - required artifact files: `metadata.json`, `events.ndjson`,
     `timeline.ndjson`
3. Guard elements:
   - raw event parseability
   - final structured event schema validity
   - stable normalized timeline event taxonomy
   - human-discoverable artifact directory naming
4. Compatibility elements:
   - existing ledger records without `artifactDir`
   - existing invocation directories with hash-only path segments
5. Forbidden reinterpretations:
   - timeline events are observability/read-model only, not orchestration,
     dedupe, trigger, or lifecycle authority
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
2. Actual touched scope: Codex subprocess adapter plus narrow helper modules for
   artifact naming/writing, JSONL stream parsing, timeline normalization, final
   result extraction, ledger record shape, docs, and focused tests.
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
   structured `agent_message`; no file outside the stream may provide a fallback
   final object.
3. Current canonical completion proof source: ledger completed run record with
   runner status/reason code.
4. Target canonical completion proof source: ledger completed run record plus
   `artifactDir` pointing to an artifact directory that contains
   `metadata.json`, `events.ndjson`, and `timeline.ndjson`.
5. Reused proof contract: `StructuredAgentRunnerOutput`.
6. Proof-parity rule: `upgrade_required`.
7. Final truth surfaces affected: runner process output parsing, ledger record
   schema, artifact directory layout, README/pilot docs.
8. Mixed-truth surfaces allowed: raw Codex event stream and normalized Pairflow
   timeline may coexist, but the final result source is the stream-derived
   structured agent message only; the timeline never upgrades, repairs, or
   overrides final-result truth.

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
   path, plan slug, mode, schema version, trigger kind when available, and PID
   when available.
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
4. Artifact directory creation must be concurrency-safe and collision-resistant:
   create the target directory with exclusive-create semantics; if
   `<local-date>_<local-time>_<plan-slug>_<invocation-id>` already exists,
   append `-2`, then `-3`, and so on until the first available path is claimed.
   The numeric suffix is a collision resolver only, not canonical identity.
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
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
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
      final extraction because they are one IO contract change, with multiple
      tests covering branches of that single acceptance contract.
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
| Raw stream | spawned Codex stdout | one raw line per Codex JSONL event, persisted unchanged to `events.ndjson` | debug/audit/final extractor | malformed line is retained and the run fails closed; empty stream blocks | P1 |
| Timeline stream | Pairflow normalizer | Pairflow-owned NDJSON events with schema version, timestamp, type, summary fields | operator/future UI | normalizer or write failure blocks observability completion; large outputs summarized | P1 |
| Final runner result | stream extractor | last valid structured `agent_message.text` matching runner schema; no fallback file or session lookup | bridge classifier/ledger | no valid object -> `AGENT_RUNNER_OUTPUT_INVALID` | P1 |
| Artifact metadata | runner bridge | `metadata.json` with invocation, plan, repo, startedAt, planSlug, mode, optional trigger, optional pid | discovery/future CLI | metadata write failure -> file IO blocked before success claim | P1 |
| Artifact directory | runner bridge | `<YYYY-MM-DD>_<HH-mm-ss>_<plan-slug>_<invocation-id>` under `.pairflow/runtime/plan-watch/agent-runner` | humans/ledger | exclusive-create collision uses first available numeric suffix `-2`, `-3`, ... | P1 |
| Ledger linkage | ledger record | optional `artifactDir` for new run records; legacy records still parse | watch loop/future CLI | missing legacy field is accepted; malformed new field blocks schema only if present and invalid | P1 |

### Ownership and Deferred Semantics

| Boundary | This Task Owns Now | This Task Records But Does Not Interpret | Deferred / Out of Scope | Forbidden Inference |
|---|---|---|---|---|
| Raw Codex events | Capture and persist exact JSONL lines to `events.ndjson`. | Raw Codex event type, item, command, usage, and other unknown fields. | Treating raw Codex schema as a Pairflow public API. | Lifecycle or route authority from raw events. |
| Pairflow timeline | Normalize selected raw events to Pairflow-owned timeline rows. Timeline persistence is P1 because it is the operator-visible read model promised by this task. | Command summaries, counts, previews, statuses, usage summaries, and final status evidence copied only from stream-derived runner truth. | CLI/UI display and filtering of timeline rows. | Timeline rows affecting dedupe, routing, lifecycle state, or final-result classification. |
| Final runner result | Extract and validate the final result from the last valid structured `agent_message`. | Intermediate structured messages as timeline evidence. | Multi-run replay or external session reconstruction. | Fallback to `last-message.json`, Codex sessions, or prose stdout. |
| Artifact discovery | Create human-discoverable directories and metadata. | PID, local timestamp, plan slug, trigger kind, and invocation id. | Retention cleanup and artifact pruning policy. | PID or timestamp as canonical identity. |
| Ledger linkage | Persist `artifactDir` while preserving legacy read compatibility. | Artifact path for future reader commands. | Timeline display command and UI readers. | Dedupe key derived from artifact directory. |

### Structured Contract Rules

| Surface | Required Fields | Optional Fields | Unknown / Malformed Behavior | Retention Rule | Priority |
|---|---|---|---|---|---|
| `metadata.json` | `schemaVersion`, `invocationId`, `startedAt`, `repoPath`, `planPath`, `planSlug`, `mode` | `triggerKind`, `pid`, `artifactDir`, `schemaFilePath` | Runtime write failure blocks success with `PLAN_WATCH_RUNNER_FILE_IO_FAILED`. | Persist for every prepared run once the artifact directory exists. | P1 |
| Raw event line | Valid JSON object line emitted by Codex. | Any Codex-owned fields. | Malformed line is retained raw and the invocation blocks with `AGENT_RUNNER_OUTPUT_INVALID`; the parser must not skip malformed lines to find a later success. | Preserve exact line in `events.ndjson`. | P1 |
| Structured agent message | `item.type = "agent_message"` and text JSON matching runner output schema. | Schema-allowed runner output fields. | Invalid candidate is ignored as a valid final output and may become timeline diagnostic; no valid final blocks with `AGENT_RUNNER_OUTPUT_INVALID`. | Keep original raw event. | P1 |
| Timeline row | `schemaVersion`, `type`, `at` | Row-specific summary fields. | Unknown raw events map to hidden `runner_event_unrecognized` or raw-only retention; unsupported future timeline schema versions are rejected by current readers until explicitly upgraded. | Persist normalized rows to `timeline.ndjson`. | P1 |
| Ledger `artifactDir` | String path when present. | N/A | Absent legacy field is accepted; non-string new value is invalid. | Retain in new run records. | P1 |

### Mirrored Surface Checklist

| Contract Row | L0 Surface | L1 Surface | L2 Surface | Docs / Future Surface |
|---|---|---|---|---|
| Codex invocation | In Scope, Baseline Preservation | Fallback / Error Contract | T1,T13 | README and pilot docs |
| Raw stream | Goal, Safety Defaults | Structured Contract Rules | T3,T5,T12,T15 | README artifact list and pilot evidence |
| Timeline stream | Goal, Safety Defaults | Timeline Event Contract | T4,T7,T11,T15 | README artifact list and pilot evidence |
| Final runner result | Read-path rule, Forbidden fallback | Fallback / Error Contract | T2,T5,T6,T12,T16 | README source-of-truth wording |
| Artifact metadata / directory | In Scope, Safety Defaults | Data and Interface Contract | T9,T13,T14,T15 | README discovery examples |
| Ledger linkage | Success proof boundary | Data and Interface Contract | T8 | Future CLI timeline notes |

### Timeline Event Contract

| Timeline Type | Raw Source | Required Fields | Display Rule | Priority |
|---|---|---|---|---|
| `runner_status` | structured `agent_message` | `schemaVersion=1`, `at`, `reasonCode`, `summary`, optional `changedArtifacts`, optional `routeLedgerSummary` | show in main timeline | P1 |
| `command_started` | command execution start | `schemaVersion=1`, `at`, `command`, optional `itemId` | show command shortened | P1 |
| `command_completed` | command execution complete | `schemaVersion=1`, `at`, `command`, `exitCode`, `outputLineCount`, optional `outputPreview` | summarize output, do not dump full file reads | P1 |
| `patch_applied` | apply-patch event when present | `schemaVersion=1`, `at`, optional `changedFiles` | show changed file list | P2 |
| `delegation_started` | spawn/wait agent raw events when present | `schemaVersion=1`, `at`, target summary when recoverable | show review/delegation progress | P2 |
| `runner_completed` | final schema-valid structured `agent_message` only | `schemaVersion=1`, `at`, `status`, `reasonCode`, optional usage summary copied from `turn.completed` only after a valid final agent message exists | show final checkpoint | P1 |
| `runner_event_unrecognized` | unknown raw event | `schemaVersion=1`, `at`, raw type | hide by default, retain for compatibility diagnostics | P3 |

### Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Evidence |
|---|---|---|---|---|---|
| CS1 | `codexAgentRunnerBridge.ts` | Codex arg/file preparation | Builds JSONL-mode args, writes schema/metadata paths, no last-message file. | P1 | T1,T13,T14 |
| CS2 | `agentRunnerBridge.ts` | subprocess execution/classification | Streams stdout lines to raw/timeline artifacts and classifies from stream final result. | P1 | T3,T4,T5,T6,T7,T11,T12,T15 |
| CS3 | `agentRunnerBridgeResult.ts` | structured output parser | Accepts only schema-valid final object from agent message text. | P1 | T2,T5,T6,T12 |
| CS4 | `planWatchLedger.ts` | record read/write | Persists `artifactDir` for new records and reads old records without it. | P1 | T8 |
| CS5 | `planWatchLoopExecution.ts` | completion record | Includes artifact linkage in completed runner evidence. | P1 | T8,T15 |
| CS6 | README/docs | operator guidance | Documents `events.ndjson`, `timeline.ndjson`, `metadata.json`, directory naming, and final source. | P2 | T10 |

### Data and Interface Contract

1. `metadata.json` schema version starts at `1`.
2. `events.ndjson` is raw Codex-owned JSONL and is not normalized by Pairflow.
3. `timeline.ndjson` is Pairflow-owned and may be consumed by future CLI/UI.
   Timeline rows use `schemaVersion=1` in this task. A future reader must ignore
   unknown row `type` values it does not display, but must reject unsupported
   row `schemaVersion` values until a compatibility rule is added.
4. `artifactDir` in ledger is repo-relative when inside the repo and absolute
   only if the artifact root is outside the repo.
5. `artifactDir` is an artifact pointer only: legacy records without it remain
   readable, and trigger dedupe must continue to use trigger evidence rather
   than artifact path or directory name.
6. `planSlug` is derived from the watched plan filename stem by removing one
   leading `YYYY-MM-DD-` prefix when present, lowercasing ASCII letters,
   replacing every run of characters outside `[a-z0-9-]` with `-`, trimming
   leading/trailing `-`, collapsing repeated `-`, and truncating to 80
   characters without leaving a trailing `-`. If no safe slug remains, use
   `plan`. Slug collisions are acceptable because `invocationId` plus exclusive
   directory creation owns uniqueness.
7. Directory timestamp uses local time for operator discoverability and
   `metadata.json.startedAt` stores ISO UTC for canonical ordering.
8. PID may be recorded in metadata but must not be used as canonical identity.
9. The artifact directory name is intended for human discovery and must not be
   parsed as lifecycle state or used as canonical ordering authority.
10. Concurrent watcher invocations may share the same artifact root only through
    independent artifact directories claimed by exclusive creation; they must
    not share open artifact files. Existing ledger reservation/completion
    remains the only dedupe/trigger coordination primitive in scope.
11. Timeline persistence is hard-blocking for this task because the task's
    acceptance claim is operator observability, not because timeline rows carry
    orchestration authority. A failed timeline write must block the runner
    result even though timeline content must never influence route, dedupe,
    lifecycle, or final-result truth.
12. README and `docs/local-plan-watch-v1-pilot.md` updates must include a
    minimum operator-facing artifact example with the directory pattern,
    `metadata.json`, `events.ndjson`, `timeline.ndjson`, the ledger
    `artifactDir` pointer, and explicit wording that final runner truth comes
    from the stream-derived structured `agent_message`, not `last-message.json`
    or any Codex session file.

### Fallback / Error Contract

| Case | Required Result | Reason Code | Notes |
|---|---|---|---|
| Codex spawn ENOENT | blocked | `PLAN_WATCH_CODEX_UNAVAILABLE` | unchanged |
| artifact directory create failure | blocked | `PLAN_WATCH_RUNNER_FILE_IO_FAILED` | no completed ledger record; metadata may be absent |
| schema file write failure | blocked | `PLAN_WATCH_RUNNER_FILE_IO_FAILED` | precondition failure before spawning Codex |
| metadata write failure | blocked | `PLAN_WATCH_RUNNER_FILE_IO_FAILED` | do not claim artifact contract success |
| events.ndjson write failure | blocked | `PLAN_WATCH_RUNNER_FILE_IO_FAILED` | raw stream persistence is canonical proof and cannot be best effort |
| stdout stream empty | blocked | `AGENT_RUNNER_OUTPUT_INVALID` | raw artifact may be empty |
| malformed JSONL line | blocked | `AGENT_RUNNER_OUTPUT_INVALID` | retain raw line; do not silently tolerate malformed stream in this task |
| no structured agent message | blocked | `AGENT_RUNNER_OUTPUT_INVALID` | do not use last-message fallback, Codex session files, stdout prose, stderr text, or process exit text |
| final object schema invalid | blocked | `AGENT_RUNNER_OUTPUT_INVALID` | include output diagnostic; timeline rows, stderr text, and process exit text cannot repair final truth |
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
| T6 | Invalid final output and no fallback | blocked `AGENT_RUNNER_OUTPUT_INVALID`; `last-message.json`, stdout prose, and Codex session files are not consulted | P1 |
| T7 | Large command output | timeline stores count/preview, not full dump | P2 |
| T8 | Ledger artifact dir | new records include `artifactDir`; old records still read | P1 |
| T9 | Artifact dir naming | name includes local date, local time, plan slug, invocation id and remains path-safe | P1 |
| T10 | Docs | README/pilot docs describe raw/timeline artifacts and stream source of truth | P2 |
| T11 | Timeline authority boundary | timeline rows are persisted/readable but do not alter route choice, trigger dedupe, lifecycle state, or final-result classification | P1 |
| T12 | Malformed stream line before later success-looking event | raw line is retained and the run blocks fail-closed instead of skipping ahead | P1 |
| T13 | Metadata and schema files | `metadata.json` has required fields, optional trigger/PID behavior, `schemaVersion=1`, and schema write failure blocks `PLAN_WATCH_RUNNER_FILE_IO_FAILED` | P1 |
| T14 | Slug/collision naming | slug normalization handles dates, spaces, unsafe characters, empty stems, length cap, and exclusive-create collision suffixes | P1 |
| T15 | Artifact write failures and concurrency | artifact directory, metadata, raw event, timeline, and schema write failures block with `PLAN_WATCH_RUNNER_FILE_IO_FAILED`; parallel invocations claim separate directories and never use artifact path for dedupe | P1 |
| T16 | Fallback text surfaces | stderr text and process exit text are not consulted when the stream has no valid final structured agent message | P1 |

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
