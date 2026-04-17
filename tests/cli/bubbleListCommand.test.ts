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
  });
});
