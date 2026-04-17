import { describe, expect, it, vi } from "vitest";

import {
  type BubbleAttachCommandDependencies,
  getBubbleAttachHelpText,
  parseBubbleAttachCommandOptions,
  runBubbleAttachCommand
} from "../../src/cli/commands/bubble/attach.js";

describe("parseBubbleAttachCommandOptions", () => {
  it("parses required and optional options including repeatable port-forward", () => {
    const parsed = parseBubbleAttachCommandOptions([
      "--id",
      "b_attach_01",
      "--repo",
      "/tmp/repo",
      "--port-forward",
      "5173",
      "--port-forward",
      "3000",
      "--port-forward",
      "3000"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble attach options");
    }

    expect(parsed.id).toBe("b_attach_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.portForward).toEqual([3000, 5173]);
  });

  it("supports help", () => {
    const parsed = parseBubbleAttachCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleAttachHelpText()).toContain("pairflow bubble attach");
    expect(getBubbleAttachHelpText()).toContain("--port-forward");
  });

  it("requires --id", () => {
    expect(() => parseBubbleAttachCommandOptions([])).toThrow(/--id/u);
  });

  it("rejects invalid port-forward values", () => {
    expect(() =>
      parseBubbleAttachCommandOptions([
        "--id",
        "b_attach_02",
        "--port-forward",
        "70000"
      ])
    ).toThrow(/ATTACH_PORT_FORWARD_INVALID/u);
  });
});

describe("runBubbleAttachCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleAttachCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("passes normalized CLI port forwards to attachBubble", async () => {
    const attachBubble = vi.fn<
      NonNullable<BubbleAttachCommandDependencies["attachBubble"]>
    >(async () => ({
      bubbleId: "b_attach_03",
      tmuxSessionName: "pf-b_attach_03",
      launcherRequested: "copy",
      launcherUsed: "copy",
      attachCommand:
        "ssh -L 127.0.0.1:3000:127.0.0.1:3000 -L 127.0.0.1:5173:127.0.0.1:5173"
    }));

    const result = await runBubbleAttachCommand(
      [
        "--id",
        "b_attach_03",
        "--repo",
        "/tmp/repo",
        "--port-forward",
        "5173",
        "--port-forward",
        "3000",
        "--port-forward",
        "3000"
      ],
      "/tmp/cwd",
      {
        attachBubble
      }
    );

    expect(result?.bubbleId).toBe("b_attach_03");
    const attachDependencies = attachBubble.mock.calls[0]?.[1];
    expect(attachDependencies).toBeDefined();
    if (attachDependencies === undefined) {
      throw new Error("Expected attachBubble dependencies call.");
    }
    expect(attachBubble).toHaveBeenCalledWith(
      {
        bubbleId: "b_attach_03",
        repoPath: "/tmp/repo",
        cwd: "/tmp/cwd",
        portForwards: [3000, 5173]
      },
      attachDependencies
    );
    expect(typeof attachDependencies.resolveBubbleById).toBe("function");
  });

  it("omits repoPath from attachBubble input when --repo is not provided", async () => {
    const attachBubble = vi.fn<
      NonNullable<BubbleAttachCommandDependencies["attachBubble"]>
    >(async () => ({
      bubbleId: "b_attach_04",
      tmuxSessionName: "pf-b_attach_04",
      launcherRequested: "copy",
      launcherUsed: "copy",
      attachCommand: "tmux attach -t pf-b_attach_04"
    }));

    await runBubbleAttachCommand(
      ["--id", "b_attach_04"],
      "/tmp/cwd",
      {
        attachBubble
      }
    );

    expect(attachBubble).toHaveBeenCalledWith(
      {
        bubbleId: "b_attach_04",
        cwd: "/tmp/cwd"
      },
      expect.any(Object)
    );
  });
});
