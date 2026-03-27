import { describe, expect, it, vi } from "vitest";

import {
  getBubbleReconcileHelpText,
  parseBubbleReconcileCommandOptions,
  renderBubbleReconcileText,
  runBubbleReconcileCommand
} from "../../src/cli/commands/bubble/reconcile.js";

describe("parseBubbleReconcileCommandOptions", () => {
  it("parses optional flags", () => {
    const parsed = parseBubbleReconcileCommandOptions([
      "--repo",
      "/tmp/repo",
      "--dry-run",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble reconcile options");
    }

    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleReconcileCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleReconcileHelpText()).toContain("pairflow bubble reconcile");
  });
});

describe("runBubbleReconcileCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleReconcileCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("delegates execution to reconcile dependency with parsed options", async () => {
    const reconcileRuntimeSessions = vi.fn(() =>
      Promise.resolve({
        repoPath: "/tmp/repo",
        dryRun: true,
        sessionsBefore: 1,
        sessionsAfter: 1,
        staleCandidates: 0,
        reasonCounts: {},
        actions: []
      })
    );

    const result = await runBubbleReconcileCommand(
      ["--repo", "/tmp/repo", "--dry-run"],
      "/tmp/cwd",
      {
        reconcileRuntimeSessions
      }
    );

    expect(reconcileRuntimeSessions).toHaveBeenCalledWith({
      repoPath: "/tmp/repo",
      cwd: "/tmp/cwd",
      dryRun: true
    });
    expect(result?.dryRun).toBe(true);
  });

  it("renders structured reason counts in reconcile text output", () => {
    const rendered = renderBubbleReconcileText({
      repoPath: "/tmp/repo",
      dryRun: true,
      sessionsBefore: 3,
      sessionsAfter: 3,
      staleCandidates: 2,
      reasonCounts: {
        missing_bubble: 1,
        final_state: 1
      },
      actions: [
        {
          bubbleId: "b_missing",
          reason: "missing_bubble",
          removed: false
        },
        {
          bubbleId: "b_final",
          reason: "final_state",
          removed: false
        }
      ]
    });

    expect(rendered).toContain(
      "Reasons: final_state=1, missing_bubble=1"
    );
  });
});
