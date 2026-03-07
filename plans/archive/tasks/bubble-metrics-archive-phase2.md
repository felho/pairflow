# Task: Phase 2 Archive-on-Delete Foundation (Bubble Metrics/Archive Strategy)

## Goal

Implement only Phase 2 from `docs/bubble-metrics-archive-strategy.md`: preserve bubble history on delete by archiving runtime evidence before physical bubble-directory removal.

## Prerequisites

1. Phase 1 metrics capture foundation (`plans/tasks/bubble-metrics-archive-phase1.md`) must be implemented first.
2. Specifically, delete flows in this task assume authoritative `bubble_instance_id` availability, including the legacy mutating-command backfill path introduced in Phase 1.
3. If Phase 1 is not yet implemented in code, this Phase 2 task is blocked and must not be started.

## Scope Boundaries

### In Scope (Required)

1. Archive-on-delete flow:
   - `pairflow bubble delete` must create an archive snapshot before deleting `.pairflow/bubbles/<bubble-id>/`.
   - If archive snapshot fails, bubble directory removal must not happen.
2. Archive storage layout:
   - root: `~/.pairflow/archive/`
   - per bubble instance: `~/.pairflow/archive/<repo-key>/<bubble_instance_id>/`
   - required metadata file in archive root per instance: `archive-manifest.json`
3. Core archive content set (default):
   - `bubble.toml`
   - `state.json`
   - `transcript.ndjson`
   - `inbox.ndjson`
   - `artifacts/task.md` (if exists)
4. Archive index maintenance:
   - file: `~/.pairflow/archive/index.json`
   - append/update entry keyed by `bubble_instance_id`
   - status transition for delete path: `active -> deleted`
5. Delete semantics split:
   - `delete` in this phase means: remove from active runtime scope while preserving archived history.
   - `purge` command/flow is explicitly out of scope.
6. Identity and correlation:
   - archive path + index key must use immutable `bubble_instance_id`.
   - retain human-readable `bubble_id` in index/manifest metadata.
7. Locking and atomicity:
   - lock archive index writes.
   - lock per-instance archive snapshot write path.
   - create archive snapshot in temp dir then atomic rename into final instance path.
8. Delete integration point:
   - integrate into existing delete pipeline so UX/CLI shape remains stable (`requiresConfirmation` behavior unchanged).
   - preserve existing external artifact cleanup behavior (tmux/runtime session/worktree/branch cleanup) unless explicitly needed for archive correctness.
9. Compatibility behavior:
   - when deleting legacy bubbles missing `bubble_instance_id`, reuse Phase 1 mutating-flow backfill path before archive path resolution.

### In Scope (Optional, if low risk)

1. Archive read helper utilities for future `metrics report` or archived UI list reuse.
2. Additional archive-manifest metadata fields beyond required minimum if they are deterministic and validated.

### Out of Scope (Do Not Implement in This Task)

1. `pairflow metrics report` and any aggregation/report CLI.
2. Purge lifecycle and permanent deletion of archived records.
3. Archive compression, retention windows, automatic pruning.
4. Archived-bubble UI tabs/filters/details pages.
5. Phase 1 metrics schema/event-envelope expansion beyond what archive flow strictly needs.
6. Runtime-plane migration away from repo-local `.pairflow/bubbles/...`.

## Required Archive Data Contracts

### Archive Manifest (`archive-manifest.json`)

Each archive instance directory must include a manifest with at least:

1. `schema_version` (`1`)
2. `archived_at` (ISO timestamp)
3. `repo_path` (normalized absolute path)
4. `repo_key` (derived deterministic key)
5. `bubble_instance_id`
6. `bubble_id`
7. `source_bubble_dir`
8. `archived_files` (relative file list that actually got copied)

### Archive Index (`~/.pairflow/archive/index.json`)

Top-level structure:

1. `schema_version` (`1`)
2. `entries` array

Each entry minimum fields:

1. `bubble_instance_id` (unique key)
2. `bubble_id`
3. `repo_path`
4. `repo_key`
5. `archive_path`
6. `status` (`active|deleted|purged` enum; Phase 2 writes only `deleted`)
7. `created_at` (from bubble metadata when available)
8. `deleted_at` (set on successful delete flow archive)
9. `purged_at` (`null` in Phase 2)
10. `updated_at`

Index update rule:

1. If entry exists by `bubble_instance_id`, update in place.
2. If missing, create new entry with `status=deleted`.
3. Sort entries by `deleted_at` descending, then `bubble_instance_id` ascending (stable deterministic write).

## Repo-Key Derivation (Required)

1. Input: normalized absolute `repo_path` (same normalization strategy used elsewhere in repo handling).
2. Derivation: `sha256(repo_path)` lowercase hex.
3. Output key: first 16 hex chars of digest.
4. Collision handling: if target archive path already exists for different `bubble_instance_id`, fail delete with explicit archive-path-collision error (no destructive fallback).
5. Retry handling for same instance id: if target archive path already exists for the same `bubble_instance_id`, validate existing `archive-manifest.json` (`schema_version=1`, matching `bubble_instance_id`, matching `repo_path`) and reuse it (skip re-archive snapshot/rename) before index upsert + active-dir removal retry.

## Delete Flow Ordering (Required)

For confirmed delete (`force=true` path or no confirmation needed):

1. Resolve bubble + authoritative identity (`bubble_instance_id`).
2. Stop/cleanup runtime artifacts per existing delete behavior.
3. If `~/.pairflow/archive/<repo-key>/<bubble_instance_id>/` does not exist, build archive snapshot into temp directory under `~/.pairflow/archive/<repo-key>/.tmp-<bubble_instance_id>-<uuid>/`.
4. If snapshot temp was created, atomically rename temp directory to `~/.pairflow/archive/<repo-key>/<bubble_instance_id>/`.
5. If `~/.pairflow/archive/<repo-key>/<bubble_instance_id>/` already exists, validate manifest identity and treat as idempotent retry (no overwrite/replacement).
6. Lock + upsert archive index entry (`status=deleted`, `deleted_at` set).
7. Remove active bubble directory.

Failure policy:

1. If steps 3-6 fail, step 7 must not run.
2. If step 7 fails after successful archive+index, keep archive data/index entry (non-retractable) and return delete failure with stderr context.

## Locking and Error Handling Requirements

1. Use existing file-lock primitive (`withFileLock`) with:
   - timeout: `5s`
   - poll interval: `25ms`
2. Lock scope:
   - archive instance path lock: `~/.pairflow/locks/archive-<bubble_instance_id>.lock`
   - archive index lock: `~/.pairflow/locks/archive-index.lock`
3. Timeout behavior:
   - archive instance lock timeout: fail delete command (non-zero), no retry.
   - archive index lock timeout: fail delete command (non-zero), no retry.
4. Error messaging:
   - stderr must include `bubble_id`, `bubble_instance_id`, and failing step (`snapshot|index|remove-active`).

## Module Boundaries (Expected)

1. `src/core/archive/archivePaths.ts` (new)
   - repo-key derivation
   - archive root/index/instance path resolution
2. `src/core/archive/archiveSnapshot.ts` (new)
   - core-file copy rules
   - temp-dir staging and atomic finalize
   - manifest generation/validation
3. `src/core/archive/archiveIndex.ts` (new)
   - read/validate/upsert/write index under lock
4. `src/core/bubble/deleteBubble.ts`
   - integrate archive phase into delete flow with strict ordering/failure semantics
5. `src/types/archive.ts` (new)
   - typed manifest/index contracts

## Suggested Implementation Sequence (Low Migration Risk)

1. Add typed archive contracts + validators (manifest/index) and deterministic repo-key helper.
2. Implement archive snapshot writer with temp staging + atomic rename.
3. Implement archive index read/upsert/write with locking and deterministic ordering.
4. Integrate archive into delete flow with explicit step boundaries and error taxonomy.
5. Add tests per acceptance mapping before broad refactors.

## Acceptance Criteria (Binary, Testable)

1. Deleting a bubble archives core files into `~/.pairflow/archive/<repo-key>/<bubble_instance_id>/` before active bubble directory removal.
2. Archive instance directory always includes valid `archive-manifest.json` with required fields and `schema_version=1`.
3. Delete command never removes active bubble directory when archive snapshot creation or archive index update fails.
4. `~/.pairflow/archive/index.json` is created/updated with deterministic schema (`schema_version=1`, `entries[]`) and includes required fields.
5. Index upsert is keyed by `bubble_instance_id`; repeated delete attempts for same instance do not create duplicate entries.
6. Index entry status is `deleted` and includes non-null `deleted_at` after successful archive-on-delete.
7. Core archive content includes required files when present; missing optional source (`artifacts/task.md`) does not fail delete.
8. Lock acquisition for archive snapshot and archive index uses `timeoutMs=5000` and `pollMs=25`.
9. Archive lock timeout or index lock timeout causes delete failure (non-zero) without removing active bubble directory.
10. If active directory removal fails after successful archive+index update, archive artifacts remain intact and index remains `deleted` (non-retractable).
11. Delete confirmation behavior for external artifacts remains unchanged (`requiresConfirmation` gating still works).
12. Legacy bubble delete path (missing `bubble_instance_id`) performs backfill before archive path resolution and then succeeds without identity drift.
13. Repo-key derivation is deterministic: same normalized `repo_path` always yields identical 16-hex key.
14. Concurrent delete attempts for the same bubble instance do not create partial/corrupted archive directories or duplicate index entries.
15. Retrying delete after a prior `removeBubbleDirectory` failure reuses an existing same-instance archive directory (after manifest identity validation) and does not attempt destructive overwrite or fail with rename-on-existing-dir error.

## Test Mapping (Acceptance -> Concrete Assertions)

1. AC1 -> delete integration test asserts archive instance path exists before asserting bubble dir missing.
2. AC2 -> manifest unit test validates required keys and `schema_version=1`; integration test parses written manifest JSON.
3. AC3 -> failure-path test stubs snapshot/index failure and asserts bubble directory still exists.
4. AC4 -> index store test asserts file creation from empty state and schema shape.
5. AC5 -> repeated delete-path test asserts one entry per `bubble_instance_id` in index.
6. AC6 -> index entry assertion after successful delete verifies `status=deleted` and non-null `deleted_at`.
7. AC7 -> snapshot test with missing `artifacts/task.md` asserts success and manifest file list excludes missing source.
8. AC8 -> lock-wrapper tests assert calls use `timeoutMs=5000` and `pollMs=25`.
9. AC9 -> lock-timeout integration test asserts non-zero CLI exit and active bubble dir not removed.
10. AC10 -> stub `removeBubbleDirectory` failure after successful archive/index and assert archive/index remain persisted.
11. AC11 -> delete behavior regression test ensures first pass returns `requiresConfirmation=true` when external artifacts exist.
12. AC12 -> legacy fixture delete test asserts backfilled `bubble_instance_id` is used in archive path and remains stable.
13. AC13 -> repo-key unit test verifies deterministic 16-hex output for canonicalized path input.
14. AC14 -> concurrency test (`Promise.all` at least 5 parallel delete calls on same fixture with synchronization) asserts one final archive directory and one index entry.
15. AC15 -> idempotent-retry integration test simulates prior successful archive+index with failed active-dir removal, then reruns delete and asserts: existing archive directory reused, manifest identity validated, index upsert succeeds, active dir removed, no temp->final rename conflict.

## Deliverables

1. New task file: `plans/tasks/bubble-metrics-archive-phase2.md`.
2. Implementation-ready acceptance+test mapping that removes delete/archive ambiguity.
3. Clear separation of delete vs purge semantics for future phases.

## Changelog (Task-File Iteration)

1. Fixed Phase 2 scope to archive-on-delete only, excluding report/purge/UI follow-ups.
2. Added explicit archive manifest and archive index schemas (`schema_version=1`).
3. Made delete ordering concrete, including archive/index/non-retractable failure semantics.
4. Added deterministic repo-key derivation rule to prevent path-format ambiguity.
5. Added concrete lock paths, timeout/poll parameters, and timeout failure behavior.
6. Added explicit legacy compatibility requirement for missing `bubble_instance_id` on delete.
7. Added binary acceptance criteria with direct test mapping to reduce reviewer interpretation drift.
8. Clarified same-instance retry behavior after non-retractable delete failure: existing archive is validated and reused (idempotent), avoiding rename conflicts on retry.
