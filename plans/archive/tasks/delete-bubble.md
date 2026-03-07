# Task: Delete Bubble

## Goal

Add a trash icon on collapsed bubble cards and a `pairflow bubble delete` CLI command to fully remove bubbles. Safety: if only the definition folder exists, delete immediately. If external artifacts (worktree, tmux session, git branch) still exist, show a confirmation dialog listing them before deleting.

## Implementation Steps

### Step 1: Create `deleteBubble` core function

**New file:** `src/core/bubble/deleteBubble.ts`

Two-phase approach:

**`deleteBubble({ bubbleId, repoPath?, cwd?, force? })`:**
1. Resolve bubble via `resolveBubbleById`
2. Check which artifacts exist:
   - Worktree directory on disk (`access()`)
   - Tmux session (`tmux has-session`)
   - Runtime session entry (read `sessions.json`)
   - Local git branch (`branchExists()`)
3. If artifacts exist AND `force !== true` → return `{ deleted: false, requiresConfirmation: true, artifacts: {...} }`
4. If no artifacts OR `force === true`:
   - `terminateBubbleTmuxSession()` (if tmux exists)
   - `removeRuntimeSession()` (if runtime entry exists)
   - `cleanupWorktreeWorkspace()` (if worktree/branch exists)
   - `rm(bubbleDir, { recursive: true, force: true })` — removes the bubble definition
5. Return `{ deleted: true, ... }`

**Reuse:** `resolveBubbleById`, `terminateBubbleTmuxSession`, `removeRuntimeSession`, `cleanupWorktreeWorkspace`, `branchExists` — all existing functions.

### Step 2: Add CLI command `pairflow bubble delete`

**New file:** `src/cli/commands/bubble/delete.ts` (follow `stop.ts` pattern)
- `--id <bubbleId>` required, `--repo <path>` optional, `--force` flag
- Without `--force`: print artifacts and exit if any found
- With `--force`: delete everything

**Wire in** `src/cli/index.ts`: add `delete: handleBubbleDeleteCommand`

### Step 3: Wire server route

**File:** `src/core/ui/router.ts`
- Add `deleteBubble` to dependencies + `case "delete":` parsing optional `{ force?: boolean }`

### Step 4: API client + types

**File:** `ui/src/lib/api.ts` — `deleteBubble(repoPath, bubbleId, input?: { force?: boolean })`
**File:** `ui/src/lib/types.ts` — add `"delete"` to `bubbleActionKinds`

### Step 5: Store — dedicated delete action

**File:** `ui/src/state/useBubbleStore.ts`

Add `deleteBubble(bubbleId: string, force?: boolean)` as a **separate store method** (not through `runBubbleAction`) because of the two-phase confirm flow:
1. Call API without force
2. If `requiresConfirmation` → return artifacts to UI
3. If `deleted` → call `refreshRepos` to remove card from canvas

Also add `case "delete":` stub to `performBubbleAction` for type exhaustiveness.

### Step 6: Trash icon on collapsed card

**File:** `ui/src/components/canvas/BubbleCanvas.tsx`

In the `BubbleCard` component, add a small trash icon bottom-right:
- Absolute positioned, subtle color (#555, hover → rose-400)
- `onClick` calls `event.stopPropagation()` then `onDelete(bubbleId)`
- Add `onDelete` prop to `BubbleCardProps` and `BubbleCanvasProps`

### Step 7: Confirmation dialog + wiring

**New file:** `ui/src/components/canvas/DeleteConfirmDialog.tsx`

Simple dialog listing artifacts (worktree path, tmux session name, branch name). Confirm → calls delete with force. Cancel → dismiss.

**File:** `ui/src/components/canvas/BubbleCanvas.tsx`
- State: `deleteTarget: { bubbleId, artifacts } | null`
- Trash click → call store `deleteBubble(id)` → if needs confirm, set `deleteTarget`
- Dialog confirm → call store `deleteBubble(id, true)` → clear `deleteTarget`

### Step 8: Tests

- **`tests/core/bubble/deleteBubble.test.ts`**: no artifacts → immediate delete; artifacts + no force → requiresConfirmation; artifacts + force → full cleanup + dir removed
- **Update `ActionBar.test.tsx`**: add "delete" to action labels record
- **Update `useBubbleStore.test.ts`**: add `deleteBubble` to API stub

## Key files

| File | Role |
|------|------|
| `src/core/bubble/deleteBubble.ts` | **NEW** — core logic |
| `src/cli/commands/bubble/delete.ts` | **NEW** — CLI command |
| `src/cli/index.ts` | Wire CLI |
| `src/core/ui/router.ts` | Route handler |
| `ui/src/lib/api.ts` | API client |
| `ui/src/lib/types.ts` | Action kind |
| `ui/src/state/useBubbleStore.ts` | Store method |
| `ui/src/components/canvas/BubbleCanvas.tsx` | Trash icon |
| `ui/src/components/canvas/DeleteConfirmDialog.tsx` | **NEW** — confirm dialog |

## Verification

1. `npx tsc --noEmit` in root + `ui/`
2. `npx vitest run` — all tests pass
3. Manual: trash icon on bubble with no artifacts → card disappears instantly
4. Manual: trash icon on bubble with worktree → confirmation dialog → confirm → deleted
5. CLI: `pairflow bubble delete --id <id>` and `--force`
