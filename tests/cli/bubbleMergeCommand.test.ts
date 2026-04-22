import { describe, expect, it } from "vitest";

import {
  getBubbleMergeHelpText,
  parseBubbleMergeCommandOptions,
  renderBubbleMergeResultText,
  runBubbleMergeCommand
} from "../../src/cli/commands/bubble/merge.js";

describe("parseBubbleMergeCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleMergeCommandOptions([
      "--id",
      "b_merge_01",
      "--repo",
      "/tmp/repo",
      "--push",
      "--delete-remote",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble merge options");
    }

    expect(parsed.id).toBe("b_merge_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.push).toBe(true);
    expect(parsed["delete-remote"]).toBe(true);
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleMergeCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleMergeHelpText()).toContain("pairflow bubble merge");
    expect(getBubbleMergeHelpText()).toContain("Local-route only");
    expect(getBubbleMergeHelpText()).toContain("Started-remote route");
  });

  it("requires --id", () => {
    expect(() => parseBubbleMergeCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleMergeCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleMergeCommand(["--help"]);
    expect(result).toBeNull();
  });
});

describe("renderBubbleMergeResultText", () => {
  const baseResult = {
    bubbleId: "b_merge_01",
    bubbleBranch: "bubble/b_merge_01",
    baseBranch: "main",
    mergeCommitSha: "abc1234",
    presentationRoute: "local" as const,
    pushedBaseBranch: true,
    deletedRemoteBranch: true,
    tmuxSessionName: "pf-b_merge_01",
    tmuxSessionExisted: true,
    runtimeSessionRemoved: true,
    removedWorktree: true,
    removedBubbleBranch: true
  } as const;

  it("renders local merge summaries with retained local flags", () => {
    const text = renderBubbleMergeResultText(baseResult);

    expect(text).toContain("pushed=yes");
    expect(text).toContain("remoteDeleted=yes");
    expect(text).not.toContain("durableMerge=localRepoFromStartedRemoteHandoff");
  });

  it("renders started-remote summaries without remote push-closeout wording", () => {
    const text = renderBubbleMergeResultText({
      ...baseResult,
      presentationRoute: "started_remote"
    });

    expect(text).toContain("durableMerge=localRepoFromStartedRemoteHandoff");
    expect(text).not.toContain("pushed=");
    expect(text).not.toContain("remoteDeleted=");
  });
});
