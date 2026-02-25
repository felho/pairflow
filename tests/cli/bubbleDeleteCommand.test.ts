import { describe, expect, it, vi } from "vitest";

import {
  getBubbleDeleteHelpText,
  parseBubbleDeleteCommandOptions,
  runBubbleDeleteCommand
} from "../../src/cli/commands/bubble/delete.js";

describe("parseBubbleDeleteCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleDeleteCommandOptions([
      "--id",
      "b_delete_01",
      "--repo",
      "/tmp/repo",
      "--force"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble delete options");
    }

    expect(parsed.id).toBe("b_delete_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.force).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleDeleteCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    const helpText = getBubbleDeleteHelpText();
    expect(helpText).toContain("pairflow bubble delete");
    expect(helpText).toContain("Exit code is 2 when confirmation is required");
  });

  it("requires --id", () => {
    expect(() => parseBubbleDeleteCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleDeleteCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleDeleteCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("converts unexpected delete failures into DeleteBubbleError", async () => {
    vi.resetModules();
    vi.doMock("../../src/core/bubble/deleteBubble.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../src/core/bubble/deleteBubble.js")
      >("../../src/core/bubble/deleteBubble.js");
      return {
        ...actual,
        deleteBubble: vi.fn(async () => {
          throw new Error("boom");
        })
      };
    });

    try {
      const module = await import("../../src/cli/commands/bubble/delete.js");
      await expect(
        module.runBubbleDeleteCommand(["--id", "b_delete_error_01"], "/tmp")
      ).rejects.toMatchObject({
        name: "DeleteBubbleError",
        message: "boom"
      });
    } finally {
      vi.doUnmock("../../src/core/bubble/deleteBubble.js");
      vi.resetModules();
    }
  });
});
