# Task: Configurable Bubble Attach Launcher (macOS, Phase 1)

## Goal

Make bubble attach behavior configurable across commonly used macOS terminals instead of Warp-only behavior.

Primary outcomes:
1. `attach` launcher is user-configurable.
2. `attach` works when Warp is not installed.
3. `auto` resolution and fallback behavior are deterministic.
4. Acceptance criteria are binary and directly testable.

## Hard Constraints

1. Keep this work macOS-only for Phase 1.
2. Keep bubble lifecycle/state-machine behavior unchanged.
3. Do not add Linux/Windows launcher support in this phase.
4. Do not add arbitrary user-defined launcher scripts/templates in this phase.

## Scope

### In Scope (Required)

1. Add bubble config field:
   - `attach_launcher = "auto" | "warp" | "iterm2" | "terminal" | "ghostty" | "copy"`
2. Add launcher resolver behavior to `attachBubble`.
3. Keep existing Warp attach path supported.
4. Add profiles for `iterm2`, `terminal`, `ghostty` (best-effort), and `copy`.
5. Define deterministic `auto` behavior with explicit fallback semantics.
6. Keep attach API route compatibility while returning launcher metadata.
7. Add tests for config validation, resolver behavior, and launcher failure paths.
8. Update docs to remove Warp-only assumption.

### In Scope (Optional)

1. `attach_mode = "tab" | "window"` for launchers that support it.

### Out of Scope

1. Linux/Windows launcher support.
2. Per-user launcher command templates.
3. Per-pane tmux attach behavior.
4. UI redesign beyond launcher result metadata.

## Config Contract

1. Add optional bubble config field `attach_launcher`.
2. Default: `attach_launcher = auto`.
3. Supported values (exact): `auto`, `warp`, `iterm2`, `terminal`, `ghostty`, `copy`.
4. Unknown values must fail validation (no silent coercion).
5. Optional: `attach_mode` with launcher-specific applicability.

## Supported Launcher Matrix (Phase 1)

| Launcher | Phase 1 status | Availability check | Launch method | Eligible in `auto` | Behavior when explicitly requested but unavailable |
| --- | --- | --- | --- | --- | --- |
| `warp` | Required | Warp app/URI launch capability detectable on host | Write Warp launch YAML + open `warp://launch/<config>` | Yes | Return explicit `launcher_unavailable` error (no switch to other GUI launcher) |
| `iterm2` | Required | iTerm2 app/scriptability detectable on host | `osascript` opening window/tab with attach command | Yes | Return explicit `launcher_unavailable` error |
| `terminal` | Required | Terminal.app/scriptability detectable on host | `osascript` + `do script` attach command | Yes | Return explicit `launcher_unavailable` error |
| `ghostty` | Required (best-effort) | Ghostty app presence/invocation detectable on host | Launch Ghostty app with attach command args | Yes | Return explicit `launcher_unavailable` or launcher-specific failure |
| `copy` | Required | Always available | Do not launch GUI; return/copy attach command | Auto terminal fallback target | N/A (always available) |

## Common Attach Command Contract

All launcher profiles must target this command:
`tmux attach -t <session_name>`

When the launcher supports working directory control, use bubble repo path before attach.

## Resolver Semantics (Normative)

### Explicit Launcher (`warp`/`iterm2`/`terminal`/`ghostty`/`copy`)

1. If launcher is `copy`, do not launch any app; return attach command metadata.
2. For non-`copy` launchers:
   - If availability check fails: return `launcher_unavailable` error naming requested launcher.
   - If launch attempt fails after availability passed: return `launcher_launch_failed` error naming requested launcher.
3. Explicit launcher mode must not silently switch to a different GUI launcher.

### `auto` Launcher

Deterministic candidate order:
1. `iterm2`
2. `ghostty`
3. `warp`
4. `terminal`
5. `copy` (terminal fallback target)

Failure-class intent (for resolver behavior):
1. `launcher_unavailable`: launcher is not present/not scriptable on host (or availability probe was stale and launch immediately confirms unavailable).
2. `launcher_launch_failed`: launcher is available, launch was attempted, but attach launch command failed.

Resolution rules:
1. Evaluate candidates in listed order.
2. If candidate availability check fails, continue to next candidate.
3. For first available GUI candidate, attempt launch.
4. If launch succeeds, return success with that launcher.
5. If launch returns `launcher_unavailable`, treat candidate as unavailable and continue to next candidate.
6. If launch fails with `launcher_launch_failed`, stop and return failure (no silent fallback).
7. If no GUI candidate succeeds, return `copy` result with attach command.

## Response and Error Contract

Attach success payload must include:
1. `bubbleId`
2. `tmuxSessionName`
3. `launcherRequested`
4. `launcherUsed`

Additional payload rules:
1. If `launcherUsed = copy`, include `attachCommand`.
2. No additional auto-resolution marker is required beyond `launcherRequested=auto` plus concrete `launcherUsed`.

Error payload rules:
1. Must include failing launcher id.
2. Must include failure class (`launcher_unavailable` or `launcher_launch_failed`).
3. Include stderr/stdout excerpt when available.

## Suggested Implementation Touchpoints

1. `src/types/bubble.ts`
   - Add attach launcher config types.
2. `src/config/bubbleConfig.ts`
   - Parse/validate new config fields and defaults.
3. `src/core/bubble/createBubble.ts`
   - Persist default attach config in new bubbles.
4. `src/core/bubble/attachBubble.ts`
   - Add resolver + launcher profile executors.
5. `src/core/ui/router.ts`
   - Preserve route compatibility and expose launcher metadata.
6. Tests:
   - `tests/core/bubble/attachBubble.test.ts`
   - config tests under `tests/config/*`
7. Docs:
   - `README.md` attach behavior/prerequisites.

## Acceptance Criteria (Binary)

1. Config validation accepts exactly: `auto|warp|iterm2|terminal|ghostty|copy` for `attach_launcher`.
2. Unknown `attach_launcher` values fail config validation.
3. `attach_launcher=warp` uses Warp profile path and never calls other launcher profiles.
4. `attach_launcher=iterm2` uses iTerm2 profile path and never calls other launcher profiles.
5. `attach_launcher=terminal` uses Terminal profile path and never calls other launcher profiles.
6. `attach_launcher=ghostty` uses Ghostty profile path and returns explicit failure class when unavailable/fails.
7. `attach_launcher=copy` returns `attachCommand` and does not invoke GUI launch commands.
8. `attach_launcher=auto` evaluates candidates in order: `iterm2 -> ghostty -> warp -> terminal -> copy`.
9. In `auto`, unavailable candidates are skipped; the first successful candidate becomes `launcherUsed`.
10. In `auto`, `launcher_launch_failed` for an available GUI candidate stops resolution and returns failure.
11. Success payload includes `bubbleId`, `tmuxSessionName`, `launcherRequested`, `launcherUsed`.
12. If `launcherUsed=copy`, success payload includes `attachCommand`.
13. Error payload includes failing launcher id and failure class.
14. README no longer describes attach as Warp-only.

## Test Mapping (Acceptance -> Test)

1. AC1-AC2 -> config parse/validation tests for accepted and rejected enum values.
2. AC3-AC7 -> explicit launcher unit tests (one profile per test) with negative assertions for cross-profile fallback.
3. AC8-AC10 -> table-driven auto resolver tests across availability/failure matrices.
4. AC11-AC13 -> response/error shape assertions in attach unit/API tests.
5. AC14 -> docs assertion or explicit docs review checklist item in PR.

## Validation Plan

1. Unit tests for launcher resolver and profile executors.
2. Manual macOS smoke checks:
   - one successful GUI attach path,
   - one `launcher_unavailable` failure path,
   - one `copy` fallback path.
3. Regression check: no bubble state/protocol behavior changes.

## Deliverables

1. Configurable attach launcher in bubble config.
2. Launcher profiles for Warp, iTerm2, Terminal, Ghostty(best-effort), and Copy.
3. Deterministic `auto` selection/fallback behavior.
4. Updated tests and docs.

## References

1. Warp Launch Configurations:
   - https://docs.warp.dev/features/sessions/launch-configurations
2. Warp URI scheme (`warp://launch/...`):
   - https://docs.warp.dev/terminal/more-features/uri-scheme
3. iTerm2 scripting:
   - https://iterm2.com/3.0/documentation-scripting.html
   - https://iterm2.com/documentation-one-page.html
4. Apple Terminal scripting:
   - https://support.apple.com/guide/terminal/trml1003/mac
5. Ghostty macOS helper CLI context:
   - https://github.com/ghostty-org/ghostty/discussions/5462
