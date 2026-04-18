import { describe, expect, it } from "vitest";

import {
  getBubbleListHelpText,
  parseBubbleListCommandOptions,
  renderBubbleListText,
  runBubbleListCommand
} from "../../src/cli/commands/bubble/list.js";

describe("parseBubbleListCommandOptions", () => {
  it("parses optional flags", () => {
    const parsed = parseBubbleListCommandOptions(["--repo", "/tmp/repo", "--json"]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble list options");
    }

    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.json).toBe(true);
    expect(parsed.refresh).toBe(false);
  });

  it("parses explicit refresh flag", () => {
    const parsed = parseBubbleListCommandOptions(["--refresh"]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble list options");
    }

    expect(parsed.refresh).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleListCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleListHelpText()).toContain("pairflow bubble list");
    expect(getBubbleListHelpText()).toContain("--refresh");
  });
});

describe("runBubbleListCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleListCommand(["--help"]);
    expect(result).toBeNull();
  });
});

describe("renderBubbleListText", () => {
  it("includes remote summary and per-bubble remote source details", () => {
    const rendered = renderBubbleListText({
      repoPath: "/tmp/repo",
      total: 1,
      byState: {
        CREATED: 0,
        PREPARING_WORKSPACE: 0,
        RUNNING: 0,
        WAITING_HUMAN: 0,
        READY_FOR_HUMAN_APPROVAL: 0,
        APPROVED_FOR_COMMIT: 0,
        COMMITTED: 0,
        DONE: 0,
        FAILED: 0,
        CANCELLED: 0
      },
      runtimeSessions: {
        registered: 0,
        stale: 0
      },
      remoteExecutionSummary: {
        createdNotStarted: 0,
        unavailableStarted: 1,
        refreshedThisRun: true
      },
      bubbles: [
        {
          bubbleId: "b_list_render_remote_01",
          repoPath: "/tmp/repo",
          worktreePath: "/tmp/repo/.pairflow-worktrees/b_list_render_remote_01",
          state: "RUNNING",
          round: 2,
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: null,
          stateValidation: null,
          runtimeSession: null,
          attention: null,
          metaReview: {
            actor: "meta-reviewer",
            authorityActive: false,
            runtimeDelivery: null
          },
          remoteExecution: {
            alias: "lab",
            host: "ssh.example.com",
            pointerKind: "started",
            viewKind: "list",
            stateSource: "unavailable_started",
            cacheStatus: "missing",
            refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
            reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE",
            remoteClonePath: "/srv/pairflow/repo--b_list_render_remote_01",
            compatLifecyclePlaceholder: {
              state: "RUNNING",
              round: 2,
              source: "local_control_plane_compat"
            }
          }
        }
      ]
    });

    expect(rendered).toContain("Remote summary: created_not_started=0, unavailable_started=1, refreshed_this_run=yes");
    expect(rendered).toContain("state=unavailable, round=- compat_state=RUNNING compat_round=2");
    expect(rendered).toContain("remote=started@ssh.example.com source=unavailable_started cache=missing");
    expect(rendered).toContain("refresh_attempted=2026-04-16T10:02:00.000Z");
    expect(rendered).toContain("reason=LIST_REMOTE_REFRESH_UNAVAILABLE");
    expect(rendered).not.toContain("state=RUNNING, round=2");
    expect(rendered).not.toContain("runtime_note=preserved_state_no_live_runtime_fail_closed");
  });

  it("renders refreshed runtime-loss diagnostics without degrading to unavailable state", () => {
    const rendered = renderBubbleListText({
      repoPath: "/tmp/repo",
      total: 1,
      byState: {
        CREATED: 0,
        PREPARING_WORKSPACE: 0,
        RUNNING: 1,
        WAITING_HUMAN: 0,
        READY_FOR_HUMAN_APPROVAL: 0,
        APPROVED_FOR_COMMIT: 0,
        COMMITTED: 0,
        DONE: 0,
        FAILED: 0,
        CANCELLED: 0
      },
      runtimeSessions: {
        registered: 0,
        stale: 0
      },
      remoteExecutionSummary: {
        createdNotStarted: 0,
        unavailableStarted: 0,
        refreshedThisRun: true
      },
      bubbles: [
        {
          bubbleId: "b_list_render_remote_missing_01",
          repoPath: "/tmp/repo",
          worktreePath: "/tmp/repo/.pairflow-worktrees/b_list_render_remote_missing_01",
          state: "RUNNING",
          round: 3,
          activeAgent: "claude",
          activeRole: "reviewer",
          activeSince: "2026-04-16T09:50:00.000Z",
          lastCommandAt: "2026-04-16T09:58:00.000Z",
          stateValidation: null,
          runtimeSession: null,
          attention: null,
          metaReview: {
            actor: "meta-reviewer",
            authorityActive: false,
            runtimeDelivery: null
          },
          remoteExecution: {
            alias: "lab",
            host: "ssh.example.com",
            pointerKind: "started",
            viewKind: "list",
            stateSource: "refresh",
            cacheStatus: "present",
            runtimeAvailability: "missing",
            runtimeReasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
            lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
            lastCacheCheckAt: "2026-04-16T10:00:00.000Z",
            remoteClonePath: "/srv/pairflow/repo--b_list_render_remote_missing_01"
          }
        }
      ]
    });

    expect(rendered).toContain("state=RUNNING, round=3");
    expect(rendered).toContain("source=refresh runtime=missing");
    expect(rendered).toContain("live_checked=2026-04-16T10:00:00.000Z");
    expect(rendered).toContain("checked=2026-04-16T10:00:00.000Z");
    expect(rendered).toContain("runtime_reason=STATUS_REMOTE_RUNTIME_MISSING");
    expect(rendered).toContain("runtime_note=preserved_state_no_live_runtime_fail_closed");
    expect(rendered).not.toContain("state=unavailable");
  });

  it("renders refreshed active and inactive runtime availability tokens", () => {
    const rendered = renderBubbleListText({
      repoPath: "/tmp/repo",
      total: 2,
      byState: {
        CREATED: 0,
        PREPARING_WORKSPACE: 0,
        RUNNING: 1,
        WAITING_HUMAN: 1,
        READY_FOR_HUMAN_APPROVAL: 0,
        APPROVED_FOR_COMMIT: 0,
        COMMITTED: 0,
        DONE: 0,
        FAILED: 0,
        CANCELLED: 0
      },
      runtimeSessions: {
        registered: 0,
        stale: 0
      },
      remoteExecutionSummary: {
        createdNotStarted: 0,
        unavailableStarted: 0,
        refreshedThisRun: true
      },
      bubbles: [
        {
          bubbleId: "b_list_render_remote_active_01",
          repoPath: "/tmp/repo",
          worktreePath: "/tmp/repo/.pairflow-worktrees/b_list_render_remote_active_01",
          state: "RUNNING",
          round: 4,
          activeAgent: "codex",
          activeRole: "implementer",
          activeSince: "2026-04-16T10:00:00.000Z",
          lastCommandAt: "2026-04-16T10:01:00.000Z",
          stateValidation: null,
          runtimeSession: null,
          attention: null,
          metaReview: {
            actor: "meta-reviewer",
            authorityActive: false,
            runtimeDelivery: null
          },
          remoteExecution: {
            alias: "lab",
            host: "ssh.example.com",
            pointerKind: "started",
            viewKind: "list",
            stateSource: "refresh",
            cacheStatus: "present",
            runtimeAvailability: "active",
            lastLiveCheckAt: "2026-04-16T10:01:00.000Z",
            lastCacheCheckAt: "2026-04-16T10:01:00.000Z",
            remoteClonePath: "/srv/pairflow/repo--b_list_render_remote_active_01"
          }
        },
        {
          bubbleId: "b_list_render_remote_inactive_01",
          repoPath: "/tmp/repo",
          worktreePath: "/tmp/repo/.pairflow-worktrees/b_list_render_remote_inactive_01",
          state: "WAITING_HUMAN",
          round: 2,
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: "2026-04-16T10:01:30.000Z",
          stateValidation: null,
          runtimeSession: null,
          attention: null,
          metaReview: {
            actor: "meta-reviewer",
            authorityActive: false,
            runtimeDelivery: null
          },
          remoteExecution: {
            alias: "lab",
            host: "ssh.example.com",
            pointerKind: "started",
            viewKind: "list",
            stateSource: "refresh",
            cacheStatus: "present",
            runtimeAvailability: "inactive",
            lastLiveCheckAt: "2026-04-16T10:01:30.000Z",
            lastCacheCheckAt: "2026-04-16T10:01:30.000Z",
            remoteClonePath: "/srv/pairflow/repo--b_list_render_remote_inactive_01"
          }
        }
      ]
    });

    expect(rendered).toContain("b_list_render_remote_active_01: state=RUNNING, round=4");
    expect(rendered).toContain("source=refresh runtime=active");
    expect(rendered).toContain("b_list_render_remote_inactive_01: state=WAITING_HUMAN, round=2");
    expect(rendered).toContain("source=refresh runtime=inactive");
    expect(rendered).not.toContain("runtime_note=preserved_state_no_live_runtime_fail_closed");
  });

  it("does not render runtime-loss note for cache-backed entries", () => {
    const rendered = renderBubbleListText({
      repoPath: "/tmp/repo",
      total: 1,
      byState: {
        CREATED: 0,
        PREPARING_WORKSPACE: 0,
        RUNNING: 0,
        WAITING_HUMAN: 1,
        READY_FOR_HUMAN_APPROVAL: 0,
        APPROVED_FOR_COMMIT: 0,
        COMMITTED: 0,
        DONE: 0,
        FAILED: 0,
        CANCELLED: 0
      },
      runtimeSessions: {
        registered: 0,
        stale: 0
      },
      remoteExecutionSummary: {
        createdNotStarted: 0,
        unavailableStarted: 0,
        refreshedThisRun: true
      },
      bubbles: [
        {
          bubbleId: "b_list_render_remote_cache_01",
          repoPath: "/tmp/repo",
          worktreePath: "/tmp/repo/.pairflow-worktrees/b_list_render_remote_cache_01",
          state: "WAITING_HUMAN",
          round: 2,
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: null,
          stateValidation: null,
          runtimeSession: null,
          attention: null,
          metaReview: {
            actor: "meta-reviewer",
            authorityActive: false,
            runtimeDelivery: null
          },
          remoteExecution: {
            alias: "lab",
            host: "ssh.example.com",
            pointerKind: "started",
            viewKind: "list",
            stateSource: "cache",
            cacheStatus: "present",
            refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
            reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE",
            lastCacheCheckAt: "2026-04-16T09:55:00.000Z",
            remoteClonePath: "/srv/pairflow/repo--b_list_render_remote_cache_01"
          }
        }
      ]
    });

    expect(rendered).toContain("source=cache cache=present");
    expect(rendered).toContain("reason=LIST_REMOTE_REFRESH_UNAVAILABLE");
    expect(rendered).not.toContain("runtime_note=preserved_state_no_live_runtime_fail_closed");
  });

  it("renders combined cache-write-fail and runtime-missing diagnostics for refreshed entries", () => {
    const rendered = renderBubbleListText({
      repoPath: "/tmp/repo",
      total: 1,
      byState: {
        CREATED: 0,
        PREPARING_WORKSPACE: 0,
        RUNNING: 1,
        WAITING_HUMAN: 0,
        READY_FOR_HUMAN_APPROVAL: 0,
        APPROVED_FOR_COMMIT: 0,
        COMMITTED: 0,
        DONE: 0,
        FAILED: 0,
        CANCELLED: 0
      },
      runtimeSessions: {
        registered: 0,
        stale: 0
      },
      remoteExecutionSummary: {
        createdNotStarted: 0,
        unavailableStarted: 0,
        refreshedThisRun: true
      },
      bubbles: [
        {
          bubbleId: "b_list_render_remote_missing_cache_write_fail_01",
          repoPath: "/tmp/repo",
          worktreePath: "/tmp/repo/.pairflow-worktrees/b_list_render_remote_missing_cache_write_fail_01",
          state: "RUNNING",
          round: 3,
          activeAgent: "claude",
          activeRole: "reviewer",
          activeSince: "2026-04-16T09:50:00.000Z",
          lastCommandAt: "2026-04-16T09:58:00.000Z",
          stateValidation: null,
          runtimeSession: null,
          attention: null,
          metaReview: {
            actor: "meta-reviewer",
            authorityActive: false,
            runtimeDelivery: null
          },
          remoteExecution: {
            alias: "lab",
            host: "ssh.example.com",
            pointerKind: "started",
            viewKind: "list",
            stateSource: "refresh",
            cacheStatus: "present",
            runtimeAvailability: "missing",
            runtimeReasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
            reasonCode: "LIST_REMOTE_CACHE_WRITE_FAILED",
            refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
            lastLiveCheckAt: "2026-04-16T10:01:00.000Z",
            remoteClonePath: "/srv/pairflow/repo--b_list_render_remote_missing_cache_write_fail_01"
          }
        }
      ]
    });

    expect(rendered).toContain("source=refresh runtime=missing");
    expect(rendered).toContain("live_checked=2026-04-16T10:01:00.000Z");
    expect(rendered).toContain("runtime_reason=STATUS_REMOTE_RUNTIME_MISSING");
    expect(rendered).toContain("reason=LIST_REMOTE_CACHE_WRITE_FAILED");
    expect(rendered).toContain("runtime_note=preserved_state_no_live_runtime_fail_closed");
  });
});
