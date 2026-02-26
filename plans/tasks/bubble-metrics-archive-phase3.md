# Task: Phase 3 Metrics Reporting (Bubble Metrics/Archive Strategy)

## Goal

Implement only Phase 3 from `docs/bubble-metrics-archive-strategy.md`: add reliable reporting over Phase 1 metrics events and Phase 2 archive index data, with deterministic table/json outputs suitable for experiment analysis.

## Hard Prerequisite Gate (Must Pass Before Any Phase 3 Code Starts)

1. Phase 1 (`plans/tasks/bubble-metrics-archive-phase1.md`) implementation must be merged to `main`.
2. Phase 2 (`plans/tasks/bubble-metrics-archive-phase2.md`) implementation must be merged to `main`.
3. Both merges must be verified by commit reference before opening any Phase 3 implementation PR.
4. If either prerequisite is not merged, Phase 3 is blocked and must not start.

## Scope Boundaries

### In Scope (Required)

1. `pairflow metrics report` CLI command:
   - supports `--from <date>` and `--to <date>`
   - supports optional `--repo <path>`
   - supports `--format table|json`
2. Date-range shard selection for `~/.pairflow/metrics/events/YYYY/MM/events-YYYY-MM.ndjson`.
3. Stream parsing of events (line-by-line), no full-history in-memory load.
4. Baseline metrics required by strategy:
   - `rounds_to_converge` (median, p90)
   - `review_cycle_time_minutes`
   - `% rounds with only P2/P3`
   - `human_intervention_rate`
   - `false_convergence_count`
   - `escaped_p1_after_converged`
5. Report transparency fields:
   - input range, scanned shard count, parsed event count
   - skipped unknown schema count
   - data-quality warnings summary
6. Report behavior must be read-only (no mutation of events/archive/index files).

### In Scope (Optional, if low risk)

1. Baseline experiment template output presets (for recurring analysis windows).
2. Lightweight archive-index enrichment for report context (for example deleted/purged status counts).

### Out of Scope (Do Not Implement in This Task)

1. New event production in lifecycle commands (Phase 1 responsibility).
2. Archive snapshot/index write-path behavior changes (Phase 2 responsibility).
3. UI dashboards/tabs for metrics or archives.
4. Automated retention/pruning/compression.
5. Runtime-plane storage migration away from `.pairflow/bubbles/...`.
6. Optional grouping flags from strategy (`by repo`, `by bubble`, `by cohort`) beyond the required baseline command shape in this task.

## Assumed Data Contracts (Reporting Input Contracts)

These contracts are assumed by Phase 3 and must be re-validated before implementation.

### Event Stream Contract (`~/.pairflow/metrics/events/YYYY/MM/events-YYYY-MM.ndjson`)

1. Storage model:
   - NDJSON lines, one envelope per line.
   - monthly sharding by event timestamp month.
2. Envelope minimum fields (`schema_version=1`):
   - `ts` (ISO timestamp)
   - `repo_path` (normalized absolute path)
   - `schema_version`
   - `bubble_instance_id`
   - `bubble_id`
   - `event_type`
   - `round` (nullable when not applicable)
   - `actor_role`
   - `metadata` (object)
3. Reviewer-pass metadata expectations:
   - `pass_intent`
   - flat `metadata.p0|p1|p2|p3` (not nested under `finding_counts`)
   - `has_findings`
   - `no_findings`
4. Schema-forward compatibility:
   - unknown `schema_version` lines are skipped and counted.
5. Spec-vs-implementation reconciliation (explicit):
   - Strategy/earlier task docs describe nested `finding_counts.{p0..p3}`.
   - Implemented Phase 1 emitter behavior is flat `metadata.p0|p1|p2|p3`.
   - Phase 3 reporting MUST treat implemented code behavior as authoritative input contract.

### Archive Index Contract (`~/.pairflow/archive/index.json`)

1. Top-level shape:
   - `schema_version=1`
   - `entries[]`
2. Entry minimum fields used by reporting context:
   - `bubble_instance_id`
   - `bubble_id`
   - `repo_path`
   - `repo_key`
   - `archive_path`
   - `status` (`active|deleted|purged`)
   - `created_at`
   - `deleted_at`
   - `purged_at`
   - `updated_at`
3. Identity rule:
   - `bubble_instance_id` is the unique archival correlation key.
4. Compatibility/fallback rule:
   - if an archive entry is missing `updated_at`, reporting must not fail.
   - treat missing `updated_at` as `null`/unknown and continue with warning counter (data-quality signal), not hard error.

## Pre-Implementation Contract Re-Validation Checklist (Required)

Do not begin implementation until all checks pass and are documented in the implementation PR notes.

1. Prereq merge gate re-check:
   - confirm merged commit SHAs for both Phase 1 and Phase 2 on `main`.
2. Events contract sample validation:
   - inspect at least 3 recent event shards from different months.
   - parse representative lines and confirm required envelope fields.
   - confirm reviewer-pass flat metadata keys (`p0..p3`, `has_findings`, `no_findings`) are present when `event_type` is reviewer pass.
   - explicitly record reconciliation result: implemented flat metadata schema is the source of truth for Phase 3 parsing, even if earlier docs mention nested `finding_counts`.
3. Archive index contract validation:
   - parse `~/.pairflow/archive/index.json`.
   - confirm `schema_version=1`, `entries[]` array shape, and required entry fields.
   - confirm `bubble_instance_id` uniqueness across entries.
4. Timestamp sanity checks:
   - verify event `ts` values parse as valid dates.
   - verify `created_at/deleted_at/purged_at` semantics are consistent for at least 10 sampled entries.
5. Repo path normalization check:
   - verify report `--repo` filter values match stored normalized `repo_path` format.
   - filter semantics are exact normalized-path equality (not prefix/substring/fuzzy match).
6. Failure policy check:
   - if any contract check fails, stop implementation and raise blocker before writing report logic.

## CLI and Output Requirements

1. Command shape:
   - `pairflow metrics report --from <date> --to <date> [--repo <path>] [--format table|json]`
   - `--repo` match is exact against normalized absolute `repo_path`.
2. Table output:
   - human-readable summary first, followed by key metrics.
3. JSON output:
   - deterministic key order and stable schema for automation.
4. Exit code policy:
   - invalid args/invalid date range -> non-zero.
   - partial parse with skipped unknown schemas -> zero with warning counters in output.

## Suggested Module Boundaries (Implementation Guidance)

1. `src/core/metrics/report/selectShards.ts` (new)
   - shard discovery by date range
2. `src/core/metrics/report/readEvents.ts` (new)
   - streaming parser + contract-aware validation/skips
3. `src/core/metrics/report/aggregate.ts` (new)
   - metric computations and cohort counters
4. `src/core/metrics/report/format.ts` (new)
   - table/json serializer
5. `src/cli/commands/metricsReport.ts` (new or existing CLI wiring extension)
   - argument parsing + orchestration

## Suggested Implementation Sequence

1. Implement contract check helpers reused by both runtime report parser and test fixtures.
2. Implement shard selection and streaming event reader.
3. Implement deterministic aggregators for required baseline metrics.
4. Implement output formatters (table + json).
5. Wire CLI command and error handling.
6. Add test coverage mapped to acceptance criteria.

## Acceptance Criteria (Binary, Testable)

1. Command supports required args and rejects invalid date ranges with non-zero exit.
2. Date filtering scans only relevant monthly shards for the requested range.
3. Parser handles NDJSON streams without loading full history into memory.
4. Unknown event `schema_version` lines are skipped and counted in report output.
5. Repo filter includes only matching normalized `repo_path` events.
6. Required metrics are present in both table and json formats.
7. JSON output schema is deterministic and machine-consumable.
8. Report run does not mutate events files or archive index.
9. Data-quality warnings are surfaced when required fields are missing on individual lines.
10. Archive index context integration (if enabled) does not fail report when archive index is missing; it degrades with explicit warning.
11. Metrics derived from reviewer-pass metadata use explicit flat `metadata.p0..p3` semantics, aligned with Phase 1 emitter behavior.
12. Known fixture dataset yields expected metric values (golden assertions).
13. Missing archive-entry `updated_at` does not fail report; parser treats it as unknown (`null`) and surfaces data-quality warning count.

## Test Mapping (Acceptance -> Concrete Assertions)

1. AC1 -> CLI integration test for valid/invalid arg combinations and exit codes.
2. AC2 -> shard-selection unit tests across month boundaries.
3. AC3 -> reader test with large fixture ensures streaming path (no full-array parse API usage).
4. AC4 -> mixed-schema fixture test asserts skip counter increments for unknown versions.
5. AC5 -> repo-filter integration test with two repo paths and exact match assertions.
6. AC6 -> formatter tests assert required metric keys appear in both outputs.
7. AC7 -> snapshot/unit test asserts stable JSON schema and key ordering.
8. AC8 -> integration test checks file mtimes/hashes unchanged after report run.
9. AC9 -> malformed-line fixture test asserts warning counters and continued processing.
10. AC10 -> missing archive index fixture test asserts successful report + explicit warning.
11. AC11 -> reviewer-pass aggregation test validates flat metadata `p0/p1/p2/p3` and `has_findings/no_findings` semantics.
12. AC12 -> golden fixture test validates exact median/p90 and rate outputs.
13. AC13 -> archive-index fixture with missing `updated_at` asserts successful report, `updated_at` treated as `null`, warning counter incremented.

## Deliverables

1. New task file: `plans/tasks/bubble-metrics-archive-phase3.md`.
2. Implementation-ready Phase 3 scope with hard merge gate for Phase 1+2.
3. Explicit reporting input contracts and pre-implementation re-validation checklist.

## Changelog (Task-File Creation)

1. Added strict prerequisite gate: no Phase 3 implementation before Phase 1 and Phase 2 are both merged.
2. Defined assumed input contracts for events and archive index to reduce reporter ambiguity.
3. Added mandatory pre-implementation contract re-validation checklist.
4. Added binary acceptance criteria and direct test mapping for implementation/review consistency.
