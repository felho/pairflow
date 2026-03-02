# Task: Global Editor Open Command Config with Bubble Override (Phase 1)

## Goal

Make `pairflow bubble open` editor launching configurable at global user level, while still allowing per-bubble override.

Primary outcomes:
1. Editor open behavior can be configured once globally.
2. Bubble-level `open_command` can override global behavior when explicitly set.
3. Resolution order is deterministic and documented.
4. Behavior is fully test-covered with binary acceptance criteria.

## Hard Constraints

1. Keep this phase focused on open-command configuration only.
2. Do not change lifecycle/state-machine behavior.
3. Do not introduce project-specific editor integrations.
4. **No backward compatibility requirement for old bubble metadata behavior** (old bubbles are typically deleted; migration shims are not required in this phase).

## Scope

### In Scope (Required)

1. Extend global Pairflow config (`~/.pairflow/config.toml`) with optional:
   - `open_command = "..."`
2. Keep bubble config `open_command` as optional override.
3. Implement deterministic open command resolution:
   - bubble `open_command` (if set) -> global `open_command` (if set) -> built-in default.
4. Preserve existing `{{worktree_path}}` interpolation behavior.
5. Keep placeholder-less command behavior (append quoted worktree path).
6. Update docs/README with precedence and examples.
7. Add tests for precedence, validation, and failure paths.

### Out of Scope

1. Multi-platform editor profile matrix (iTerm/VSCode/etc.) similar to attach launcher.
2. UI redesign.
3. Runtime editor auto-detection heuristics beyond default fallback.
4. Migration tooling for legacy bubble configs.

## Config Contract

### Global config (`~/.pairflow/config.toml`)

- Add optional key:
  - `open_command: string`
- Validation:
  - must be a string
  - must not be empty/whitespace-only after trim

Example:

```toml
open_command = "code --reuse-window {{worktree_path}}"
```

### Bubble config (`bubble.toml`)

- `open_command` remains optional.
- If omitted, global config can take effect.
- If present, it must be a non-empty, non-whitespace string.

## Resolution Semantics (Normative)

`pairflow bubble open` resolves `commandTemplate` in this order:

1. `bubble.bubbleConfig.open_command` when explicitly set.
2. `loadPairflowGlobalConfig().open_command` when set.
3. Built-in default: `cursor {{worktree_path}}`.

Rendering semantics:
1. If template contains `{{worktree_path}}`, replace all occurrences with quoted worktree path.
2. If template does not contain placeholder, append quoted worktree path to the end.
3. Empty template is invalid and must raise `OpenBubbleError`.

Quoting semantics:
1. "Quoted worktree path" means shell-safe argument rendering that preserves the full path as one argument.
2. Paths with spaces and shell-significant characters must remain a single path argument after rendering.

## Error Semantics

1. Worktree missing -> existing `OpenBubbleError` behavior unchanged.
2. Open command exit code non-zero -> existing `OpenBubbleError` behavior unchanged.
3. Global config load failure behavior:
   - `ENOENT` (missing global config) -> treat as unset and continue fallback chain.
   - schema/parse invalid global config -> fail with explicit `OpenBubbleError` (do not silently ignore malformed `open_command`).
   - non-schema IO errors (e.g. `EACCES`) -> fail with explicit `OpenBubbleError`.

Rationale: avoid silent editor-launch misconfiguration.

## Risk Notes

1. TOML/parser contract drift:
   - `open_command` validation must remain aligned between parse + type surfaces to avoid silently accepting empty values.
2. `createBubble` default-writing change:
   - Stopping default persistence can affect assumptions in tests/fixtures that currently expect `open_command` always present.
3. Error UX regression risk:
   - New `OpenBubbleError` mapping for global config failures must preserve actionable messages (parse vs IO vs command exit) and avoid ambiguous failures.
4. Built-in default command coupling:
   - `cursor {{worktree_path}}` remains hardcoded in phase 1; centralization/refactor of default source is explicitly out of scope for this phase.

## Implementation Touchpoints

1. `src/config/pairflowConfig.ts`
   - Add `open_command?: string` to `PairflowGlobalConfig`.
   - Add parse/validation rules.
   - Ensure validation rejects empty/whitespace open command.

2. `src/core/bubble/openBubble.ts`
   - Add dependency for global config loader (`loadPairflowGlobalConfig`).
   - Implement precedence resolution and explicit error mapping.

3. `src/core/bubble/createBubble.ts`
   - Stop force-writing default `open_command` into new bubble configs.
   - Only persist `open_command` when explicitly provided in input.

4. `src/config/bubbleConfig.ts`
   - Keep optional `open_command` behavior consistent in parse/render.

5. Docs
   - `README.md` open behavior/config section update.
   - Mention precedence and global config example.

## Recommended Implementation Sequence (TDD)

1. Add/adjust config schema tests first (`pairflowConfig`) for global `open_command` validation and error cases.
2. Implement global config schema changes in `src/config/pairflowConfig.ts`.
3. Add `openBubble` precedence tests (bubble override -> global -> built-in default), then implement precedence/error mapping.
4. Add `createBubble` persistence tests for explicit-vs-default behavior, then implement persistence change.
5. Update/create affected fixtures that previously assumed default `open_command` persistence.
6. Update docs last, after behavior/tests are stable.

## Acceptance Criteria (Binary)

### Validation Criteria

1. Global config validation accepts non-empty string `open_command`.
2. Global config validation rejects empty/whitespace `open_command`.
3. Bubble `open_command` validation rejects empty/whitespace value when explicitly set in `bubble.toml`.

### Precedence Criteria

4. `openBubble` prefers bubble `open_command` over global `open_command` when both are present.
5. `openBubble` uses global `open_command` when bubble override is unset.
6. `openBubble` falls back to built-in default (`cursor {{worktree_path}}`) when neither bubble nor global `open_command` is set.

### Rendering + Error Criteria

7. Placeholder interpolation works for command templates sourced from bubble-level and global-level config.
8. All `{{worktree_path}}` occurrences are replaced when present multiple times in a template.
9. Placeholder-less command appends quoted worktree path.
10. Rendered command preserves path-with-spaces as one argument.
11. Missing global config file (`ENOENT`) does not fail open; fallback chain continues.
12. Invalid global config schema/parse causes explicit `OpenBubbleError`.
13. Non-schema global config load error causes explicit `OpenBubbleError`.

### Persistence + Docs Criteria

14. New bubbles do not persist `open_command` by default unless explicitly supplied.
15. New bubbles persist `open_command` when explicitly supplied in create input.
16. README reflects precedence and global config usage with one concrete config example.

### Optional Edge-Case ACs (Nice-to-have in this phase, required in follow-up if deferred)

17. Non-existent executable in resolved open command returns explicit, actionable `OpenBubbleError`.
18. Empty global config file is handled deterministically (either valid as empty config or explicit parse error, per parser contract), with test coverage.

## Test Mapping (Acceptance -> Test)

1. AC1-AC2 -> `tests/config/pairflowConfig.test.ts`
2. AC3 -> `tests/config/bubbleConfig.test.ts`
3. AC4-AC13 -> `tests/core/bubble/openBubble.test.ts`
4. AC14-AC15 -> `tests/core/bubble/createBubble.test.ts` (explicit asserts: default not persisted; explicitly provided value persisted)
5. AC16 -> README diff checklist item in done package (include exact section/header touched)
6. AC17-AC18 (optional) -> `tests/core/bubble/openBubble.test.ts` and/or `tests/config/pairflowConfig.test.ts`

## Validation Plan

1. `pnpm typecheck`
2. Targeted tests:
   - `tests/config/pairflowConfig.test.ts`
   - `tests/core/bubble/openBubble.test.ts`
   - `tests/core/bubble/createBubble.test.ts` (or nearest create-bubble coverage file) for AC14-AC15
3. Optional manual smoke:
   - set global `open_command` to `open -a "Visual Studio Code" {{worktree_path}}`
   - run `pairflow bubble open` on a bubble without bubble-level override
4. Test harness note:
   - For AC11-AC13, tests should control global config lookup deterministically (mock/stub `loadPairflowGlobalConfig` or inject HOME/config path in test setup) to avoid host-machine coupling.

## Deliverables

1. Global `open_command` support in `~/.pairflow/config.toml`.
2. Deterministic open-command precedence logic.
3. Updated tests proving precedence + error semantics.
4. Updated documentation.
