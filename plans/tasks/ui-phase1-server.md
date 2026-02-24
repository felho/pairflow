# Task: UI Phase 1 - Server + API

## Goal

Implement the backend foundation for Pairflow Web UI: `pairflow ui` command, HTTP server, REST API, SSE event stream, and static asset serving. This phase must remain a thin wrapper over existing core modules.

## PRD References (Source of Truth)

- `docs/pairflow-ui-prd.md` -> `API/Backend Contract (thin layer over existing core)`
- `docs/pairflow-ui-prd.md` -> `Real-time model`
- `docs/pairflow-ui-prd.md` -> `Edge cases to explicitly handle`
- `docs/pairflow-ui-prd.md` -> `Current Core Constraints (must be reflected in UI)`

## Scope Boundary

### In Scope

1. Add `pairflow ui` CLI command and argument parsing for `--repo` (multi-value).
2. Resolve repo scope rules:
   - explicit repos from flags
   - fallback to git top-level from current cwd when no `--repo` is provided.
3. Start localhost HTTP server for UI.
4. Serve pre-built static assets (frontend bundle output) from server.
5. Implement read endpoints:
   - `GET /api/repos`
   - `GET /api/bubbles?repo=<path>`
   - `GET /api/bubbles/:id?repo=<path>`
   - `GET /api/bubbles/:id/timeline?repo=<path>`
6. Implement action endpoints:
   - `POST /api/bubbles/:id/start`
   - `POST /api/bubbles/:id/approve`
   - `POST /api/bubbles/:id/request-rework`
   - `POST /api/bubbles/:id/reply`
   - `POST /api/bubbles/:id/resume`
   - `POST /api/bubbles/:id/commit`
   - `POST /api/bubbles/:id/merge`
   - `POST /api/bubbles/:id/open`
   - `POST /api/bubbles/:id/stop`
7. Enforce API error mapping from PRD contract:
   - `400` validation errors
   - `404` missing repo/bubble
   - `409` invalid state transition/precondition
   - `500` unexpected runtime errors
8. Implement `GET /api/events` SSE with repo/bubble-scoped events and watcher/coalescing strategy.
9. Handle PRD edge cases on backend responses/events (stale runtime indicators, partial transcript tolerance, merge/open failure propagation, concurrent action races).
10. Include runtime session presence in bubble payloads (`runtimeSession` or equivalent boolean) so frontend can state-gate Attach behavior.

### Out of Scope

1. Frontend app scaffolding and canvas UI.
2. Drag/drop, localStorage layout persistence, and card rendering.
3. Expanded bubble UX, action modals, and clipboard attach UX.
4. New orchestration/state-machine logic beyond existing core.

## Dependencies

1. No prior UI phase dependency.
2. Must reuse existing core modules directly (no shelling out to CLI text output).
3. Must stay aligned with `docs/pairflow-initial-design.md`.

## Acceptance Criteria

1. `pairflow ui` starts server successfully and prints listening address.
2. `pairflow ui --repo <pathA> --repo <pathB>` scopes reads/actions strictly to the provided repos.
3. Running `pairflow ui` without `--repo` resolves repo to git top-level of current cwd.
4. All PRD-specified read endpoints return structured JSON and are covered by integration tests.
5. All PRD-specified action endpoints invoke shared core logic and are covered by integration tests.
   - `approve` / `request-rework` must delegate to `src/core/human/approval.ts`.
   - `reply` must delegate to `src/core/human/reply.ts`.
   - `resume` must delegate to `src/core/bubble/resumeBubble.ts`.
6. Validation errors for missing required message fields (`request-rework`, `reply`) return `400`.
   - Commit endpoint returns `400` when request body is structurally invalid for `{ auto, message?, refs? }` (for example missing/invalid `auto` type or non-array `refs`).
7. Invalid action-state combinations return `409` and include current bubble state in payload.
8. Missing repo/bubble returns `404`.
9. Runtime/core failures return `500` with safe error payload (no stack leakage by default).
10. `/api/events` streams updates for state/inbox/transcript/session changes; reconnect paths are tested.
11. Transcript timeline endpoint tolerates partial trailing NDJSON line and does not crash.
12. Backend surfaces merge/open failures (dirty repo, missing branch/conflict, missing worktree) as actionable errors.
13. Concurrent action conflict behavior is deterministic: after `409`, subsequent read reflects fresh state.
14. Bubble read payloads include runtime session presence needed for Attach gating and stale-runtime badges in UI.

## Key Files To Create/Modify

1. `src/cli/index.ts` (register `ui` command)
2. `src/cli/commands/ui/server.ts` (new)
3. `src/core/ui/server.ts` (new)
4. `src/core/ui/router.ts` (new)
5. `src/core/ui/events.ts` (new)
6. `src/core/ui/repoScope.ts` (new)
7. `src/core/ui/presenters/bubblePresenter.ts` (new; owns bubble payload shaping including runtime session enrichment)
8. `src/core/ui/presenters/timelinePresenter.ts` (new)
9. `src/types/ui.ts` (new)
10. `src/core/human/approval.ts` (reuse from API adapter for approve/request-rework)
11. `src/core/human/reply.ts` (reuse from API adapter for reply)
12. `src/core/bubble/resumeBubble.ts` (reuse from API adapter for resume behavior parity)
13. `tests/cli/uiServerCommand.test.ts` (new)
14. `tests/core/ui/server.integration.test.ts` (new)
15. `tests/core/ui/events.integration.test.ts` (new)

## Quality Requirements

1. TypeScript strict mode must pass; no `any` in new code.
2. Every new unit/module must include unit tests.
3. Every API endpoint introduced in this phase must have integration test coverage.
4. Error handling must explicitly cover all relevant PRD edge cases in this phase.
5. Keep UI server as a thin integration layer; no duplicated orchestration logic.
