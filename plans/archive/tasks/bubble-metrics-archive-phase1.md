# Task: Phase 1 Metrics Capture Foundation (Bubble Metrics/Archive Strategy)

## Goal

Implement only the Phase 1 capture infrastructure from `docs/bubble-metrics-archive-strategy.md` so Pairflow emits durable, structured analytics events with stable identity.

## Scope Boundaries

### In Scope (Required)

1. Identity model:
   - generate immutable `bubble_instance_id` at bubble creation
   - required format: UUIDv7, canonical lowercase hyphenated string (`xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx`)
   - generation guidance: use a UUIDv7-capable generator (preferred: `uuid` package `v7()`), avoid custom ad-hoc generators
   - persist in `bubble.toml` (authoritative source)
   - `state.json` mirror is allowed but optional; if present, it must equal `bubble.toml` and is never authoritative
2. Legacy compatibility:
   - on first mutating command, if missing `bubble_instance_id`, backfill it under bubble lock
   - emit one migration event for that bubble instance
3. Analytics writer:
   - append-only NDJSON events under monthly shards:
     - `~/.pairflow/metrics/events/YYYY/MM/events-YYYY-MM.ndjson`
   - create shard directory with recursive mkdir before lock acquisition
   - lock-guarded append for each write
4. Event emission coverage (minimum command set):
   - create, start, pass, converged, ask-human, reply, approve, request-rework, commit, merge, delete
   - `start` must distinguish fresh vs resume path using explicit event types: `bubble_started_fresh` and `bubble_started_resume`
   - `approve` and `request-rework` must emit distinct `event_type` values
   - `converged` command emits exactly one analytics event, using the shared `now` timestamp passed to the `CONVERGENCE` envelope
5. Event schema:
   - require envelope fields listed below
   - require explicit `schema_version = 1`
6. Failure semantics:
   - analytics write failures must not corrupt or roll back core protocol/state transitions
   - write failure is warning-level, not silent

### In Scope (Optional, if low risk)

1. Shared helper utilities to reduce duplicate event construction.
2. Additional narrow unit tests beyond required acceptance mapping.

### Out of Scope (Do Not Implement in This Task)

1. Archive snapshot/index on delete (`~/.pairflow/archive/...`) (Phase 2).
2. `pairflow metrics report` command, aggregations, dashboards (Phase 3).
3. `~/.pairflow/metrics/events-manifest.json` generation/maintenance.
4. Archived-bubble UI tabs/filters/actions.
5. Retention/purge/compression policy execution.
6. Broad refactors unrelated to Phase 1 capture.

## Required Event Envelope

Each emitted event must contain:

1. `ts` (ISO timestamp)
2. `schema_version` (`1`)
3. `repo_path` (normalized absolute path)
4. `bubble_instance_id` (primary immutable identity)
5. `bubble_id` (human-readable logical id)
6. `event_type`
7. `round` (nullable/omitted when not applicable)
8. `actor_role` (`implementer|reviewer|orchestrator|human`)
9. `metadata` (structured event payload)

PASS event metadata rules:

1. All PASS events include `pass_intent`.
2. All PASS events include `finding_counts` object with explicit lowercase keys `p0`, `p1`, `p2`, `p3`.
   - derive keys by lowercasing severity labels (`P0..P3` -> `p0..p3`)
   - absent severities are zero-filled
3. Reviewer PASS may include optional `has_blocking` boolean.
4. Implementer PASS must emit zero-filled `finding_counts` (`p0=p1=p2=p3=0`) and should omit `has_blocking`.

## Actor Role Mapping (Required)

| Command/Event | `actor_role` |
| --- | --- |
| `bubble create`, `bubble start`, `bubble commit`, `bubble merge`, `bubble delete`, `bubble approve`, `bubble request-rework`, `bubble reply` | `human` |
| `pass` | `implementer` or `reviewer` (from active bubble role) |
| `ask-human` | `implementer` or `reviewer` (from active bubble role) |
| `converged` | `reviewer` |
| migration event `bubble_instance_backfilled` | `orchestrator` |

## Command Classification (Required for AC2/AC3)

| Class | Commands |
| --- | --- |
| Mutating (must ensure/backfill `bubble_instance_id`) | `bubble create`, `bubble start`, `pass`, `converged`, `ask-human`, `bubble reply`, `bubble approve`, `bubble request-rework`, `bubble commit`, `bubble merge`, `bubble delete` |
| Read-only (must never backfill/mutate bubble files) | `bubble list`, `bubble status`, `bubble inbox` |

Command-specific ordering notes:

1. `bubble delete` must resolve/ensure `bubble_instance_id` and emit analytics before `removeBubbleDirectory` deletes `bubble.toml`.
2. `bubble start` has two paths:
   - fresh-created bubble path: no backfill expected (id already present from create)
   - resume path on legacy bubble: mutating path must complete backfill before any state-mutation write and before analytics emission
3. `bubble delete` failure policy after analytics emission:
   - delete analytics event is non-retractable; if directory removal fails after event append, do not delete/rewrite the appended event
   - command reports failure with stderr context; no compensating analytics delete event in Phase 1

## Module Boundaries (Expected)

1. Bubble config/types:
   - extend existing `BubbleConfig` type with `bubble_instance_id`
   - extend `BubbleStateSnapshot` with optional `bubble_instance_id` for typed `state.json` mirror checks
   - update config validator and TOML renderer for `bubble_instance_id`
   - enforce UUIDv7 format validation
   - enforce `bubble.toml` as identity source of truth
2. Identity/backfill helper:
   - ensure id exists for mutating flows only
   - lock-aware backfill path
3. Analytics storage module:
   - shard path resolution
   - validation/serialization
   - lock-guarded append
4. Command integration points:
   - mutating command flows call identity helper then emit validated event

## Locking and Error Handling Requirements

1. Backfill lock:
   - use bubble lock (`.pairflow/locks/<bubble-id>.lock`) to avoid duplicate generation races
   - `bubble create` does not use bubble lock; creation is already serialized by filesystem exclusivity (`wx`) on creation path
2. Metrics file lock:
   - lock per target shard file before append
3. Lock timeout and retry policy:
   - timeout: `5s`
   - poll interval: `25ms`
   - on analytics-append lock timeout: retry unit is one full append attempt (re-acquire shard lock + append line); retry exactly once in Phase 1, then warn and continue without failing core state transition
   - on bubble backfill lock timeout: do not retry; fail the mutating command with explicit lock-timeout error before state mutation
4. Failure behavior:
   - if metrics append fails, command state transition remains authoritative
   - emit warning to stderr with diagnostic context including `bubble_id` and `event_type`

## Round Semantics (Required)

1. Emit current round value for: `pass`, `converged`, `ask-human`, `bubble reply`, `bubble approve`, `bubble request-rework`.
2. Emit `null` or omit `round` for: `bubble create`, `bubble start`, `bubble commit`, `bubble merge`, `bubble delete`, `bubble_instance_backfilled`.

## Suggested Implementation Sequence (Low Migration Risk)

1. Add `bubble_instance_id` type + config read/write + UUIDv7 validation.
2. Add creation-time generation/persistence (`bubble.toml` authoritative; optional `state.json` mirror rule).
3. Add mutating-only backfill helper with lock and migration event hook.
4. Implement analytics writer (shard resolver + validation + lock-append + timeout/retry policy).
5. Integrate events one command family at a time (bubble lifecycle first, then review/merge).
6. Add/adjust tests for each increment before next integration block.

## Acceptance Criteria (Binary, Testable)

1. New bubble creation writes `bubble_instance_id` to `bubble.toml`, and value matches UUIDv7 canonical format.
2. During mutating command flows only, `bubble.toml` is authoritative for `bubble_instance_id`; if `state.json` mirror field is missing, fill it from `bubble.toml` without warning; if value diverges, overwrite from `bubble.toml` and emit warning.
3. Read-only commands (`bubble list/status/inbox`) do not add `bubble_instance_id` to legacy bubbles.
4. First mutating command on a legacy bubble backfills exactly one `bubble_instance_id` under lock and keeps it stable on subsequent mutating commands (including resume-mode `bubble start`).
5. Events are appended to `~/.pairflow/metrics/events/YYYY/MM/events-YYYY-MM.ndjson` based on event timestamp month.
6. Every emitted event in scope contains all required envelope fields with `schema_version = 1`.
7. PASS event metadata includes `pass_intent` and `finding_counts.p0/p1/p2/p3`; reviewer PASS may include `has_blocking`, implementer PASS uses zero-filled counts.
8. Concurrent append attempts from at least 10 parallel writers (`Promise.all`) do not produce interleaved/corrupt NDJSON lines.
9. Lock acquisition uses `5s` timeout and `25ms` poll interval; analytics append retries exactly one full append attempt on timeout (re-acquire shard lock + append), while backfill lock timeout does not retry and fails the mutating command.
10. Simulated analytics-write failure does not break core state/protocol transition for the triggering command and emits stderr warning containing `bubble_id` + `event_type`.
11. Legacy backfill path emits exactly one migration analytics event (`bubble_instance_backfilled`) for the bubble instance when id is first generated.
12. Every emitted event uses `actor_role` from the allowed set (`implementer|reviewer|orchestrator|human`) and command mapping table above.
13. `converged` command emits exactly one analytics event and uses the shared `now` value passed to the `CONVERGENCE` envelope timestamp field.
14. Pass/review `finding_counts` is always lowercase `p0..p3` with zero-fill for missing severities.
15. Implementation extends `BubbleConfig` and `BubbleStateSnapshot` for `bubble_instance_id`; config validator + TOML renderer are updated, and no parallel identity config format is introduced.
16. Analytics writer creates shard directories recursively before lock acquisition.
17. `start` analytics event type is path-specific: fresh path uses `bubble_started_fresh`, resume path uses `bubble_started_resume`.
18. If `bubble delete` analytics append succeeds but directory removal fails, the appended delete analytics event remains as-is (non-retractable), and command reports failure.

## Test Mapping (Acceptance -> Concrete Assertions)

1. AC1 -> create bubble test asserts `bubble.toml.bubble_instance_id` exists and matches UUIDv7 regex.
2. AC2 -> mutating-command config test asserts `bubble.toml` wins as source; if `state.json` mirror field is missing, fill from `bubble.toml` without warning; if mismatched, overwrite from `bubble.toml` and emit warning; paired read-only command test asserts no overwrite occurs.
3. AC3 -> read-only command tests (`bubble status`, `bubble list`, `bubble inbox`) on legacy bubble assert no file mutation/no new id field.
4. AC4 -> mutating command test on legacy bubble uses resume-mode `bubble start`, asserts id added once; repeated mutating command asserts unchanged id.
5. AC5 -> storage test asserts resolved output path equals `.../YYYY/MM/events-YYYY-MM.ndjson` for fixed timestamps.
6. AC6 -> event validation/integration test asserts required keys present and schema version exactly `1`.
7. AC7 -> pass event test asserts metadata contains `pass_intent` and `finding_counts` with `p0/p1/p2/p3`; reviewer PASS may include `has_blocking`, implementer PASS asserts zero-filled counts and omitted `has_blocking`.
8. AC8 -> concurrency test runs at least 10 parallel appends via `Promise.all`, then asserts line count equals writes and every line parses as complete JSON object.
9. AC9 -> lock policy test asserts append path invokes lock with `timeoutMs=5000`, `pollMs=25`, and exactly one retry of the full append operation (re-acquire lock + write); backfill lock timeout path asserts no retry, non-zero CLI exit code, and stderr includes `lock timeout` + `bubble_id`.
10. AC10 -> failure-path integration test stubs analytics append to throw during a canonical mutating command (`pairflow pass --summary "..."`), then asserts command success/state transition plus stderr warning that includes `bubble_id` and `event_type`.
11. AC11 -> backfill integration test on legacy bubble asserts one `bubble_instance_backfilled` event is emitted on first mutating command and not re-emitted on subsequent mutating commands.
12. AC12 -> actor-role mapping tests assert only allowed values are emitted and command-specific expectations hold (including `orchestrator` for backfill migration event).
13. AC13 -> converged integration test asserts exactly one analytics event is written for one `converged` command and its `ts` matches the shared `now` passed to the `CONVERGENCE` envelope.
14. AC14 -> pass metadata test asserts `finding_counts` keys are exactly `p0/p1/p2/p3` (lowercase) and missing severities serialize as `0`.
15. AC15 -> config/state tests assert `BubbleConfig` + `BubbleStateSnapshot` accept/persist optional `bubble_instance_id`; validator + renderer round-trip remains stable.
16. AC16 -> writer test asserts shard parent directories are created via recursive mkdir before lock acquisition/append.
17. AC17 -> start integration tests assert fresh path emits `bubble_started_fresh`, resume path emits `bubble_started_resume`, and resume path completes backfill before any state-mutation write and before analytics emission (assert `bubble.toml` contains backfilled id before start analytics event is appended).
18. AC18 -> delete failure test stubs `removeBubbleDirectory` failure after successful analytics append; asserts delete event remains in shard, command exits non-zero, and stderr includes deletion failure context.

## Deliverables

1. Updated task file: `plans/tasks/bubble-metrics-archive-phase1.md`.
2. Changelog section below documenting ambiguity reductions.

## Changelog (Task-File Iteration)

1. Clarified strict Phase 1 boundary (capture only) and explicitly excluded Phase 2/3 features.
2. Added explicit `bubble_instance_id` format requirement (UUIDv7 canonical) and authoritative storage policy (`bubble.toml` vs optional `state.json` mirror).
3. Added explicit read-only vs mutating command partition required for AC2/AC3.
4. Added `pass_intent` to pass/review metadata requirements and related acceptance/tests.
5. Added concrete lock timing semantics (`5s` timeout, `25ms` poll, one retry) and stderr warning expectations.
6. Added explicit out-of-scope exclusion for `events-manifest.json`.
7. Tightened concurrency acceptance to minimum 10 parallel writers and made failure-path test mapping concrete.
8. Documented explicit identity-format decision: Phase 1 standardizes on UUIDv7 (not ULID) for deterministic implementation guidance.
9. Standardized reviewer metadata shape to `finding_counts` object and added optional `has_blocking`.
10. Made `bubble.toml` vs `state.json` mismatch behavior explicit (overwrite mirror from authoritative source + warning).
11. Added explicit acceptance/test coverage for one-time `bubble_instance_backfilled` migration event emission.
12. Clarified retry semantics by separating analytics append timeout handling from backfill-lock timeout handling.
13. Disambiguated command/event handling: `bubble approve` and `bubble request-rework` are listed separately and require distinct `event_type` values.
14. Constrained `state.json` mismatch normalization to mutating flows only, preventing read-only side effects.
15. Specified retry unit in AC9 as full append attempt and made backfill lock-timeout test assertions concrete (exit code + stderr content).
16. Added explicit `actor_role` enum and per-command mapping table to prevent schema drift.
17. Specified converged analytics cardinality: one event only, timestamp sourced from `CONVERGENCE`.
18. Fixed pass metadata normalization rules: `finding_counts` uses lowercase keys with zero-fill.
19. Locked implementation path for identity persistence: extend `BubbleConfig` + validator + renderer.
20. Clarified creation-time locking scope (`bubble create` uses creation-path exclusivity, no bubble lock) and shard mkdir responsibility.
21. Added required round semantics for round-bearing vs non-round commands.
22. Added explicit delete ordering rule: resolve identity and emit analytics before directory removal.
23. Clarified PASS metadata for implementer vs reviewer flows, including zero-filled implementer `finding_counts`.
24. Required typed `state.json` mirror handling by extending `BubbleStateSnapshot` with optional `bubble_instance_id`.
25. Clarified resume-mode `bubble start` as required legacy-backfill coverage path.
26. Added UUIDv7 generation guidance (prefer `uuid` `v7()`), avoiding custom generator drift.
27. Required explicit `start` event type split (`bubble_started_fresh` vs `bubble_started_resume`).
28. Made `finding_counts` derivation explicit: `P0..P3` lowercased to `p0..p3` with zero-fill.
29. Added non-retractable delete-event policy when analytics append succeeds but directory removal fails.
30. Clarified AC2 normalization/warning policy: in mutating flows, missing `state.json` mirror field is filled from `bubble.toml` without warning; value mismatch is overwritten and warned.
