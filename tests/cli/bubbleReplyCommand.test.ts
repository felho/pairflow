import { describe, expect, it } from "vitest";

import {
  getBubbleReplyHelpText,
  parseBubbleReplyCommandOptions,
  runBubbleReplyCommand
} from "../../src/cli/commands/bubble/reply.js";

describe("parseBubbleReplyCommandOptions", () => {
  it("parses required fields with optional repo/refs", () => {
    const parsed = parseBubbleReplyCommandOptions([
      "--id",
      "b_reply_01",
      "--message",
      "Approved",
      "--repo",
      "/tmp/repo",
      "--ref",
      "artifact://decision.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble reply options");
    }

    expect(parsed.id).toBe("b_reply_01");
    expect(parsed.message).toBe("Approved");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.refs).toEqual(["artifact://decision.md"]);
  });

  it("supports help", () => {
    const parsed = parseBubbleReplyCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleReplyHelpText()).toContain("pairflow bubble reply");
  });

  it("requires --id and --message", () => {
    expect(() => parseBubbleReplyCommandOptions([])).toThrow(/--id, --message/u);
    expect(() =>
      parseBubbleReplyCommandOptions(["--id", "b_reply_01"])
    ).toThrow(/--message/u);
  });
});

describe("runBubbleReplyCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleReplyCommand(["--help"]);
    expect(result).toBeNull();
  });
});
