import { describe, expect, it } from "vitest";

import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "../../src/cli/commands/bubble/status.js";
import type { BubbleStatusView } from "../../src/core/bubble/statusBubble.js";

describe("parseBubbleStatusCommandOptions", () => {
  it("parses required and optional flags", () => {
    const parsed = parseBubbleStatusCommandOptions([
      "--id",
      "b_status_01",
      "--repo",
      "/tmp/repo",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble status options");
    }

    expect(parsed.id).toBe("b_status_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleStatusCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleStatusHelpText()).toContain("pairflow bubble status");
  });

  it("requires --id", () => {
    expect(() => parseBubbleStatusCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleStatusCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleStatusCommand(["--help"]);
    expect(result).toBeNull();
  });
});

describe("renderBubbleStatusText", () => {
  function createStatusView(
    partial: Partial<BubbleStatusView>
  ): BubbleStatusView {
    return {
      bubbleId: "b_status_render_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      state: "RUNNING",
      round: 2,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-22T12:00:00.000Z",
      lastCommandAt: "2026-02-22T12:05:00.000Z",
      watchdog: {
        monitored: true,
        monitoredAgent: "codex",
        timeoutMinutes: 5,
        referenceTimestamp: "2026-02-22T12:05:00.000Z",
        deadlineTimestamp: "2026-02-22T12:10:00.000Z",
        remainingSeconds: 90,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 3,
        lastMessageType: "PASS",
        lastMessageTs: "2026-02-22T12:05:00.000Z",
        lastMessageId: "msg_20260222_003"
      },
      ...partial
    };
  }

  it("includes escalation line when watchdog is expired", () => {
    const rendered = renderBubbleStatusText(
      createStatusView({
        watchdog: {
          monitored: true,
          monitoredAgent: "codex",
          timeoutMinutes: 5,
          referenceTimestamp: "2026-02-22T12:05:00.000Z",
          deadlineTimestamp: "2026-02-22T12:10:00.000Z",
          remainingSeconds: 0,
          expired: true
        }
      })
    );

    expect(rendered).toContain("Escalation: watchdog timeout exceeded");
    expect(rendered).toContain("active agent codex");
  });

  it("omits escalation line when watchdog has not expired", () => {
    const rendered = renderBubbleStatusText(createStatusView({}));
    expect(rendered).not.toContain("Escalation:");
  });
});
