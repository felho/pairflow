import { describe, expect, it, vi } from "vitest";

import { claimRuntimeSessionOwnership } from "../../../../src/v11/application/start/startCommandSession.js";
import type { StartExecutionContext } from "../../../../src/v11/application/start/startCommandContext.js";
import type { ResolvedStartBubbleDependencies } from "../../../../src/v11/application/start/startCommandOrchestration.js";
import type { ClaimRuntimeSessionInput } from "../../../../src/v11/shared/ports/runtimeSessions.js";

function buildContext(overrides: Partial<StartExecutionContext> = {}): StartExecutionContext {
  return {
    resolved: {
      bubbleId: "b_start_remote_resume_authority_01",
      repoPath: "/remote/repos/pairflow--bubble",
      bubbleConfig: {
        work_mode: "worktree"
      },
      bubblePaths: {
        sessionsPath: "/remote/repos/pairflow--bubble/.pairflow/runtime/sessions.json",
        worktreePath:
          "/remote/repos/.pairflow-worktrees/pairflow--bubble/b_start_remote_resume_authority_01"
      }
    },
    startMode: "resume",
    expectedTmuxSessionName: "pf-b_start_remote_resume_authority_01",
    now: new Date("2026-04-20T19:00:00.000Z"),
    remoteStartContext: {
      kind: "remote_clone",
      workspaceRoot: "/remote/repos/pairflow--bubble"
    },
    ...overrides
  } as unknown as StartExecutionContext;
}

describe("startCommandSession", () => {
  it("uses verified remote clone authority when claiming a resume session", async () => {
    const claimSession = vi.fn(async (input: ClaimRuntimeSessionInput) => ({
      claimed: true as const,
      record: {
        bubbleId: input.bubbleId,
        repoPath: input.repoPath,
        worktreePath: input.worktreePath,
        workspacePath: input.workspacePath,
        workspaceKind: input.workspaceKind,
        tmuxSessionName: input.tmuxSessionName,
        updatedAt: "2026-04-20T19:00:00.000Z"
      }
    }));

    await claimRuntimeSessionOwnership({
      context: buildContext(),
      deps: {
        claimSession,
        isTmuxSessionAlive: vi.fn(),
        removeSession: vi.fn(),
        readSessions: vi.fn()
      } as unknown as ResolvedStartBubbleDependencies
    });

    expect(claimSession).toHaveBeenCalledTimes(1);
    expect(claimSession).toHaveBeenCalledWith(
      expect.objectContaining({
        workspacePath: "/remote/repos/pairflow--bubble",
        workspaceKind: "worktree"
      })
    );
  });

  it("repairs stale resume reclaim from verified remote clone authority instead of stale runtime state", async () => {
    const claimSession = vi
      .fn()
      .mockResolvedValueOnce({
        claimed: false as const,
        record: {
          bubbleId: "b_start_remote_resume_authority_01",
          repoPath: "/remote/repos/pairflow--bubble",
          worktreePath:
            "/remote/repos/.pairflow-worktrees/pairflow--bubble/b_start_remote_resume_authority_01",
          workspacePath:
            "/remote/repos/.pairflow-worktrees/pairflow--bubble/b_start_remote_resume_authority_01",
          workspaceKind: "worktree" as const,
          tmuxSessionName: "pf-b_start_remote_resume_authority_01-stale",
          updatedAt: "2026-04-20T18:59:00.000Z"
        }
      })
      .mockResolvedValueOnce({
        claimed: true as const,
        record: {
          bubbleId: "b_start_remote_resume_authority_01",
          repoPath: "/remote/repos/pairflow--bubble",
          worktreePath:
            "/remote/repos/.pairflow-worktrees/pairflow--bubble/b_start_remote_resume_authority_01",
          workspacePath: "/remote/repos/pairflow--bubble",
          workspaceKind: "worktree" as const,
          tmuxSessionName: "pf-b_start_remote_resume_authority_01",
          updatedAt: "2026-04-20T19:00:00.000Z"
        }
      });

    await claimRuntimeSessionOwnership({
      context: buildContext(),
      deps: {
        claimSession,
        isTmuxSessionAlive: vi.fn(async () => false),
        removeSession: vi.fn(async () => true),
        readSessions: vi.fn()
      } as unknown as ResolvedStartBubbleDependencies
    });

    expect(claimSession).toHaveBeenCalledTimes(2);
    expect(claimSession.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        workspacePath: "/remote/repos/pairflow--bubble",
        workspaceKind: "worktree"
      })
    );
  });
});
