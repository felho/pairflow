# Bubble Metrics and Archive Strategy

**Date:** 2026-02-26  
**Status:** Draft (implementation planning)  
**Scope:** Pairflow bubble lifecycle, metrics durability, archive retention, and reporting foundations

## Why This Document Exists

We want to run controlled experiments to improve the review loop (fewer rounds, faster convergence, fewer low-value cycles) and make decisions based on evidence. To do that, we need reliable historical data.

Today, that is fragile:

1. Runtime state and historical analytics are stored in the same place.
2. Bubble deletion physically removes the bubble directory.
3. Once deleted, transcript/state/artifacts are gone from the main system view.

This document proposes a practical architecture that preserves the current runtime model while adding durable analytics and historical retention.

## Current Behavior and Constraints

### Active bubble storage

Bubble state is repository-local. Each repo stores bubble data under:

- `.pairflow/bubbles/<bubble-id>/` (`state.json`, `transcript.ndjson`, `inbox.ndjson`, artifacts)

This is good for local-first workflow and repository isolation.

### Deletion behavior

`pairflow bubble delete` currently performs physical deletion of the bubble directory after cleanup. This means protocol history and metrics-relevant evidence disappear unless reconstructed from external agent session logs.

### UI listing behavior

UI bubble lists are directory-scan based. If the directory is gone, the bubble is gone from API/UI lists.

### Existing global data precedent

Pairflow already stores global repository metadata in `~/.pairflow/repos.json`. That gives us a proven place for cross-repo analytics and archived records.

## Problem Statement

The system cannot currently answer experiment questions in a robust way because:

1. Historical data disappears on delete.
2. Metrics require ad hoc forensics from multiple sources.
3. There is no single durable source for cross-bubble analysis across repositories.

If we optimize the loop without durable measurement infrastructure, we risk overfitting to anecdotal examples.

## Design Goals

1. **Durable metrics:** deleting a bubble must not delete experiment evidence.
2. **Minimal disruption:** avoid large runtime architecture migration first.
3. **Cross-repo visibility:** collect comparable metrics across all bubbles.
4. **Operational clarity:** separate “hide from active UI” from “permanent destruction.”
5. **Incremental rollout:** start capturing data immediately, then improve tooling.

## Non-Goals (Initial Phase)

1. Rebuilding all bubble runtime storage around a global database.
2. Building a polished analytics dashboard before basic data quality exists.
3. Full historical replay engine in v1.

## Recommended Architecture: Two Planes

### Plane A: Active Runtime Plane (unchanged for now)

Continue using repo-local bubble directories for runtime operations:

- fast local reads/writes
- existing command compatibility
- no immediate migration risk

### Plane B: Historical Analytics Plane (new, global)

Add durable global analytics and archive storage under `~/.pairflow`:

1. `~/.pairflow/metrics/events/YYYY/MM/events-YYYY-MM.ndjson`  
   Append-only normalized event stream for reporting (time-sharded monthly files).
2. `~/.pairflow/archive/<repo-key>/<bubble-instance-id>/`  
   Archived copy of deleted bubble metadata/transcript/artifacts.
3. `~/.pairflow/archive/index.json`  
   Catalog of archived bubbles and lifecycle metadata.

This gives immediate durability without breaking current workflows.

### Event storage layout and rotation

A single unbounded global event stream in one file is simple but does not scale well for long-running usage.  
Use time-partitioned event files from day one:

1. `~/.pairflow/metrics/events/YYYY/MM/events-YYYY-MM.ndjson` (monthly shard)
2. Optional manifest: `~/.pairflow/metrics/events-manifest.json` with shard min/max timestamps and counts

Report performance model:

1. `metrics report` first narrows candidate shards by date range.
2. It then streams only matching files (line-by-line parse), never loading all history into memory.
3. Optional later optimization: pre-aggregated rollups per month.

### Bubble instance identity and collision handling

`bubble_id` is not globally unique over long time ranges. It is unique only among active bubbles in a repo at creation time, so reused IDs are possible later.  
To prevent collisions and ensure consistent analytics correlation, we should introduce a creation-time immutable identifier.

Recommended:

1. Generate `bubble_instance_id` at bubble creation time (ULID or UUIDv7).
2. Persist `bubble_instance_id` in active bubble storage (`bubble.toml`; optionally mirrored in `state.json` for operational convenience).
3. Keep original `bubble_id` as metadata for human readability.
4. Use `bubble_instance_id` as:
   - primary analytics correlation key
   - archive directory key
   - primary lookup key in archive index
5. In index/events, store both:
   - `bubble_instance_id` (immutable technical identifier)
   - `bubble_id` (human/logical identifier)

This supports multiple historical instances of the same logical bubble name with zero overwrite risk.

## Why Not Move All Active Bubbles to Global Storage Immediately?

A full migration is possible, but high-risk as a first step because it touches lookup, UI scanning, CLI assumptions, and path semantics simultaneously. We can get 80% of the value now by adding a global analytics/archive plane first.

After we collect real data and understand operational behavior, we can revisit active-plane migration with clearer requirements.

## Event Logging Requirements (Data Quality)

To compute loop metrics accurately, we must log structured fields at action time instead of parsing free text later.

### Required envelope for each analytics event

`schema_version` should be explicit in every event envelope for forward-compatible parsing.

1. `ts` (ISO timestamp)
2. `repo_path` (normalized absolute path)
3. `schema_version` (e.g. `1`)
4. `bubble_instance_id` (primary immutable key)
5. `bubble_id` (human-readable logical name)
6. `event_type` (created, started, reviewer_pass, converged, deleted, etc.)
7. `round` (if applicable)
8. `actor_role` (implementer/reviewer/orchestrator/human)
9. `metadata` (event-specific structured payload)

Report parser compatibility rule:

1. Parse only known `schema_version` values.
2. Unknown versions are skipped with explicit warning + counter in report output.
3. Reports include a `skipped_unknown_schema_events` metric so data loss is visible.

Rationale:

- `bubble_instance_id` guarantees cross-lifecycle uniqueness.
- `bubble_id` keeps reports readable for operators.
- both are needed for robust analytics and practical debugging.

### Reviewer-pass-specific metadata

1. `pass_intent`
2. `finding_counts` with explicit keys (`p0`, `p1`, `p2`, `p3`)
3. optional `has_blocking` boolean for easier aggregation

Note on `p0`: protocol types already allow `P0` findings. Even if current reviewer guidance emphasizes `P1-P3`, keeping `p0` in analytics avoids schema churn and preserves compatibility with stricter future policies.

### Lifecycle metadata

At minimum, we need enough information to derive:

1. start time
2. convergence time
3. delete time
4. whether human intervention occurred
5. whether convergence was followed by re-open/rework

## Archive Semantics and Lifecycle

We should separate two concepts that are currently conflated:

1. **Delete:** remove from active runtime/UI scope, but preserve archived data.
2. **Purge:** permanent destruction of archived data.

This preserves operator ergonomics (“delete from UI”) while keeping experiment history intact.

### Practical state handling

We do not need to add a new runtime state immediately. Archive status can initially live in the archive index:

- `active`
- `deleted` (archived)
- `purged`

Later, if needed, this can be reflected in UI filters or lifecycle state extensions.

Archive index entries should therefore include at least:

1. `bubble_instance_id`
2. `bubble_id`
3. `repo_path`
4. `status` (`active|deleted|purged`)
5. `created_at`, `deleted_at`, `purged_at` (as applicable)

### Archive size policy (default stance)

To control storage growth, archive in two tiers:

1. **Core archive (default):**
   - `bubble.toml`
   - `state.json`
   - `transcript.ndjson`
   - `inbox.ndjson`
   - `artifacts/task.md`
2. **Extended archive (optional flag):**
   - full `artifacts/` directory

Rationale: transcript/state/inbox are usually enough for metrics and forensic reconstruction, while full artifacts can grow significantly.

### Rough storage expectations

Typical expected footprint (order-of-magnitude planning):

1. Core archive per bubble: ~50 KB to ~300 KB
2. Extended archive per bubble: can vary from hundreds of KB to many MB depending on generated artifacts

This supports a pragmatic default of core-only retention with optional escalation.

## Concurrency and Locking Model

Metrics and archive writes must be safe under concurrent agent/orchestrator activity.

Recommended implementation:

1. Reuse existing `withFileLock` lockfile strategy (`open(..., "wx")` + poll/retry + timeout).
2. Use dedicated lock paths:
   - metrics shard append lock (per shard file)
   - archive index lock
   - per-bubble migration lock for `bubble_instance_id` backfill
3. Default timeout/retry:
   - timeout: 5s
   - poll: 25ms
4. On lock timeout:
   - fail the non-critical write with warning and retry once where safe
   - never corrupt primary runtime state transitions

This keeps behavior consistent with existing Pairflow lock semantics.

## Reporting Capability (Ad Hoc but Reliable)

We need a report mechanism early, even if basic:

1. `pairflow metrics report --from <date> --to <date> [--repo <path>] [--format table|json]`
2. Optional grouping flags:
   - by repo
   - by bubble
   - by task type / experiment cohort (if tagged)

### Priority metrics

1. `rounds_to_converge` (median, p90)
2. `review_cycle_time_minutes`
3. `% rounds with only P2/P3`
4. `human_intervention_rate`
5. `false_convergence_count`
6. `escaped_p1_after_converged` (if post-convergence findings are logged)

These directly map to the review-loop optimization hypotheses.

## UI and Product Behavior

Default UI should remain focused on active work:

1. Active list: current behavior (non-deleted bubbles).
2. Optional filter/tab: “Archived / Deleted” history view.
3. Delete action should still feel like deletion from the working board.
4. Purge should be explicit and harder to trigger.

This keeps daily workflow clean while preserving observability.

## Rollout Plan

### Phase 1: Capture now

1. Introduce global metrics event logger (`events.ndjson`).
2. Introduce `bubble_instance_id` generation at bubble creation and persist it in active bubble metadata.
3. Emit events from key commands (create/start/pass/converged/ask-human/reply/delete/approve/commit/merge), always including `bubble_instance_id`.
4. Add basic lock-guarded append and schema validation.
5. Add compatibility handling for legacy bubbles:
   - if missing `bubble_instance_id`, generate and persist it on first **mutating** command touching that bubble
   - guard generation with the bubble lock (`.pairflow/locks/<bubble-id>.lock`) to avoid double-generation races
   - emit a one-time migration event for auditability

Read-only commands should not mutate bubble files.

### Phase 2: Preserve on delete

1. Archive bubble directory snapshot before physical deletion.
2. Maintain archive index with key metadata (`bubble_instance_id`, `bubble_id`, repo, timestamps, status).
3. Keep delete UX unchanged for operators.

### Phase 3: Report

1. Add metrics report CLI with table/json output.
2. Provide baseline experiment report templates.
3. Validate metric correctness against known historical bubbles.

### Phase 0 (one-time backfill for baseline validation)

Before Phase 1 has enough live data, add an importer for historical comparison:

1. `pairflow metrics import-history --repo <path>...` to parse existing `transcript.ndjson` files.
2. Optional enrichment from preserved reviewer/implementer session logs where transcript is missing.
3. Mark imported events with `metadata.imported = true` and source provenance.

This makes "known historical bubbles" validation concrete instead of ad hoc.

### Phase 4: Optional runtime migration decision

After real usage data:

1. Evaluate pain points of dual-plane storage.
2. Decide whether active bubbles should move to global storage.
3. If yes, execute via migration plan with compatibility adapters.

## Risks and Mitigations

1. **Risk:** logging overhead or write contention  
   **Mitigation:** append-only NDJSON + file lock + bounded payload size

2. **Risk:** schema drift breaks reports  
   **Mitigation:** explicit schema versioning and strict validators

3. **Risk:** archive growth over time  
   **Mitigation:** retention policy and explicit purge command

4. **Risk:** confusion between delete and purge  
   **Mitigation:** clear CLI wording and confirmation messages

## Open Design Questions

1. Should we compress archives automatically after delete?
2. Do we need per-repo archive retention controls?
3. Should report cohorts (experiment variants) be tagged in bubble metadata?

## Proposed Immediate Next Step

Implement Phase 1 + Phase 2 first:

1. global metrics event log
2. archive-before-delete

That gives us durable experiment data with minimal runtime disruption, so loop optimization experiments can begin with confidence.
