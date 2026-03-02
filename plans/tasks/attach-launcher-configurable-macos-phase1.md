# Task: Configurable Bubble Attach Launcher (macOS, Phase 1)

## Goal

Make bubble attach behavior configurable and robust across commonly used macOS terminals, instead of being Warp-only.

Primary outcomes:
1. Users can choose a supported terminal launcher for `attach` behavior.
2. `attach` works even when Warp is not installed.
3. A deterministic fallback path exists when preferred launchers are unavailable.
4. Behavior is explicit and testable (no hidden launcher assumptions).

## Problem Context

Current `attach` implementation is Warp-specific (`warp://launch/...` + Warp launch YAML).
This creates friction for teams using iTerm2, Ghostty, or Terminal.app.

Observed issues:
1. Warp is not universally installed.
2. Different teams use different terminal defaults.
3. A hard-coded launcher does not scale for broader adoption.

## Research Summary (Feasibility)

### 1. Warp
- Supports launch configurations via YAML under `~/.warp/launch_configurations/`.
- Supports URI launch `warp://launch/<config>`.
- Feasible and already used by current implementation.

### 2. iTerm2
- Supports AppleScript automation for opening windows/tabs with explicit command.
- Example capability: `create window with default profile command "..."`.
- Feasible via `osascript`.

### 3. Terminal.app
- Supports AppleScript `do script "..."`.
- Feasible via `osascript`.

### 4. Ghostty
- On macOS, the `ghostty` binary commonly acts as helper CLI; app launch should use app bundle launch semantics.
- Feasible path is launching Ghostty.app with command args (best-effort; treat as experimental in Phase 1).

## Scope Boundaries

### In Scope (Required)

1. Add attach launcher configuration to bubble config schema:
   - `attach_launcher = "auto" | "warp" | "iterm2" | "terminal" | "ghostty" | "copy"`
2. Implement launcher profile resolution in `attachBubble` with deterministic rules.
3. Implement support profiles for:
   - `warp` (existing behavior, retained),
   - `iterm2`,
   - `terminal`,
   - `ghostty` (best-effort, explicit status),
   - `copy` (no app launch; return/copy `tmux attach` command).
4. Implement `auto` mode with explicit detection/fallback order.
5. Keep current attach API route behavior working; no runtime state machine change.
6. Update docs to remove Warp-only assumption and describe launcher selection.
7. Add tests for config validation + launcher resolution + failure modes.

### In Scope (Optional, low risk)

1. Add `attach_mode = "tab" | "window"` for launchers that support mode distinctions.

### Out of Scope

1. Linux/Windows launcher support.
2. Arbitrary user-defined launcher scripts/templates in Phase 1.
3. Per-pane tmux attach (still session-level attach).
4. UI redesign beyond exposing launcher result metadata.

## Proposed Config Model

Add optional top-level bubble config fields:
1. `attach_launcher` (default: `auto`)
2. (optional) `attach_mode` (default: launcher-specific)

If fields are omitted, behavior remains backward-compatible via `auto` resolution.

## Launcher Semantics

### Common command objective
All launchers must execute:
`tmux attach -t <session_name>`

with repo path as working directory where applicable.

### Launcher profiles
1. `warp`
   - Write launch YAML under `~/.warp/launch_configurations/<session>.yaml`.
   - Open with `warp://launch/<session>`.

2. `iterm2`
   - Use AppleScript to open window/tab and run:
     `cd <repo> && tmux attach -t <session>`

3. `terminal`
   - Use AppleScript `do script` with:
     `cd <repo>; tmux attach -t <session>`

4. `ghostty` (Phase 1 best-effort)
   - Launch Ghostty.app with args to execute shell command that attaches tmux.
   - If Ghostty launch invocation fails, surface explicit launcher-specific error.

5. `copy`
   - Do not open terminal app.
   - Return and/or copy to clipboard:
     `tmux attach -t <session>`

## Auto Resolution Rules (Required)

When `attach_launcher = auto`:
1. Detect available launchers from supported set.
2. Apply deterministic order:
   - `iterm2` -> `ghostty` -> `warp` -> `terminal` -> `copy`
3. First available launcher is selected.
4. If no GUI launcher is available, fallback to `copy`.

For explicit launcher (`warp`, `iterm2`, `terminal`, `ghostty`, `copy`):
1. Do not silently switch to another GUI launcher.
2. If unavailable/fails, return clear actionable error.

## Error/UX Contract

1. Attach success response must include:
   - `bubbleId`,
   - `tmuxSessionName`,
   - `launcherUsed`.
2. For `copy` mode, response must include the generated attach command.
3. Failure messages must name failing launcher and include raw stderr/stdout excerpt when available.

## Suggested Implementation Touchpoints

1. `src/types/bubble.ts`
   - Add attach launcher/mode config types.
2. `src/config/bubbleConfig.ts`
   - Parse/validate/render new config fields.
3. `src/core/bubble/createBubble.ts`
   - Set default attach config values for newly created bubbles.
4. `src/core/bubble/attachBubble.ts`
   - Replace Warp-only logic with launcher resolver + profile executors.
5. `src/core/ui/router.ts`
   - Keep API compatibility; include launcher metadata in response.
6. Tests:
   - `tests/core/bubble/attachBubble.test.ts`
   - config tests under `tests/config/*`
7. Docs:
   - `README.md` attach usage/prerequisites.

## Acceptance Criteria (Binary, Testable)

1. Bubble config accepts and round-trips `attach_launcher` values: `auto|warp|iterm2|terminal|ghostty|copy`.
2. `attach_launcher=warp` preserves existing Warp launch behavior.
3. `attach_launcher=iterm2` launches iTerm2 command path (mock-verified).
4. `attach_launcher=terminal` launches Terminal.app command path (mock-verified).
5. `attach_launcher=ghostty` executes Ghostty launch path and returns explicit error when unavailable.
6. `attach_launcher=copy` returns/copies `tmux attach -t <session>` without GUI launch.
7. `attach_launcher=auto` follows documented deterministic order and chooses first available profile.
8. Explicit launcher mode does not silently fallback to another GUI launcher.
9. Response payload includes `launcherUsed`; in copy mode includes attach command.
10. README no longer states Warp-only attach behavior.

## Test Mapping (Acceptance -> Test)

1. AC1 -> config parse/render validation tests.
2. AC2 -> attach unit test for Warp profile.
3. AC3 -> attach unit test for iTerm2 profile.
4. AC4 -> attach unit test for Terminal profile.
5. AC5 -> attach unit test for Ghostty unavailable/failure behavior.
6. AC6 -> attach unit test for copy mode response.
7. AC7 -> auto resolver table-driven tests (availability matrix).
8. AC8 -> explicit mode failure test (no implicit profile switch).
9. AC9 -> API/unit assertion on result shape.
10. AC10 -> docs snapshot/text assertion or manual docs review checklist.

## Validation Plan

1. Unit tests for launcher resolver/profile builders.
2. macOS smoke checks (manual):
   - at least one successful attach path (`Terminal` or installed preferred terminal),
   - one unavailable-launcher failure path,
   - copy fallback path.
3. Regression checks:
   - no state/protocol behavior changes,
   - existing bubble lifecycle unchanged.

## Deliverables

1. Configurable attach launcher in bubble config.
2. Supported launcher profiles: Warp, iTerm2, Terminal, Ghostty(best-effort), Copy.
3. Deterministic `auto` fallback behavior.
4. Updated tests and docs.

## References (Research)

1. Warp Launch Configurations:
   - https://docs.warp.dev/features/sessions/launch-configurations
2. Warp URI scheme (`warp://launch/...`):
   - https://docs.warp.dev/terminal/more-features/uri-scheme
3. iTerm2 scripting / AppleScript command launch:
   - https://iterm2.com/3.0/documentation-scripting.html
   - https://iterm2.com/documentation-one-page.html
4. Apple Terminal scripting basics:
   - https://support.apple.com/guide/terminal/trml1003/mac
5. Ghostty macOS helper CLI context:
   - https://github.com/ghostty-org/ghostty/discussions/5462
