import { describe, expect, it, vi } from "vitest";

import {
  type BubbleStartCommandDependencies,
  getBubbleStartHelpText,
  parseBubbleStartCommandOptions,
  runBubbleStartCommand
} from "../../src/cli/commands/bubble/start.js";
import type { ResolvedBubbleById } from "../../src/core/bubble/bubbleLookup.js";
import type { StartBubbleResult } from "../../src/core/bubble/startBubble.js";

describe("parseBubbleStartCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleStartCommandOptions([
      "--id",
      "b_start_01",
      "--repo",
      "/tmp/repo"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble start options");
    }

    expect(parsed.id).toBe("b_start_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.attach).toBe(false);
  });

  it("parses --attach flag", () => {
    const parsed = parseBubbleStartCommandOptions([
      "--id",
      "b_start_02",
      "--attach"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble start options");
    }

    expect(parsed.id).toBe("b_start_02");
    expect(parsed.attach).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleStartCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleStartHelpText()).toContain("pairflow bubble start");
    expect(getBubbleStartHelpText()).toContain("--attach");
  });

  it("requires --id", () => {
    expect(() => parseBubbleStartCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleStartCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleStartCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("auto-registers resolved repo before starting bubble", async () => {
    const callOrder: string[] = [];
    const resolvedBubble = {
      bubbleId: "b_start_03",
      repoPath: "/",
      bubbleConfig: {
        id: "b_start_03"
      },
      bubblePaths: {
        bubbleDir: "/.pairflow/bubbles/b_start_03"
      }
    } as unknown as ResolvedBubbleById;
    const resolveBubbleByIdMock: NonNullable<
      BubbleStartCommandDependencies["resolveBubbleById"]
    > = vi.fn(() => {
      callOrder.push("resolve");
      return Promise.resolve(resolvedBubble);
    });
    const registerRepoInRegistry = vi.fn(() =>
      {
        callOrder.push("register");
        return Promise.resolve({
          added: true,
          entry: {
            repoPath: "/",
            addedAt: "2026-02-25T20:30:00.000Z"
          },
          registryPath: "/tmp/registry.json"
        });
      }
    );
    const startBubbleResult = {
      bubbleId: "b_start_03",
      state: {
        state: "RUNNING"
      },
      tmuxSessionName: "pf-b_start_03",
      worktreePath: "/tmp/worktree"
    } as unknown as StartBubbleResult;
    const startBubbleMock: NonNullable<
      BubbleStartCommandDependencies["startBubble"]
    > = vi.fn(() => {
      callOrder.push("start");
      return Promise.resolve(startBubbleResult);
    });

    const result = await runBubbleStartCommand(
      [
        "--id",
        "b_start_03"
      ],
      "/tmp",
      {
        resolveBubbleById: resolveBubbleByIdMock,
        registerRepoInRegistry,
        startBubble: startBubbleMock
      }
    );

    expect(resolveBubbleByIdMock).toHaveBeenCalledWith({
      bubbleId: "b_start_03",
      cwd: "/tmp"
    });
    expect(registerRepoInRegistry).toHaveBeenCalledWith({
      repoPath: "/"
    });
    expect(startBubbleMock).toHaveBeenCalledTimes(1);
    expect(result?.bubbleId).toBe("b_start_03");
    expect(callOrder).toEqual(["resolve", "register", "start"]);
  });

  it("uses resolved bubble repo path for startBubble input", async () => {
    const resolvedBubble = {
      bubbleId: "b_start_04",
      repoPath: "/",
      bubbleConfig: {
        id: "b_start_04"
      },
      bubblePaths: {
        bubbleDir: "/.pairflow/bubbles/b_start_04"
      }
    } as unknown as ResolvedBubbleById;
    const resolveBubbleByIdMock: NonNullable<
      BubbleStartCommandDependencies["resolveBubbleById"]
    > = vi.fn(() => Promise.resolve(resolvedBubble));
    const startBubbleResult = {
      bubbleId: "b_start_04",
      state: {
        state: "RUNNING"
      },
      tmuxSessionName: "pf-b_start_04",
      worktreePath: "/tmp/worktree"
    } as unknown as StartBubbleResult;
    const startBubbleMock: NonNullable<
      BubbleStartCommandDependencies["startBubble"]
    > = vi.fn(() => Promise.resolve(startBubbleResult));

    await runBubbleStartCommand(
      [
        "--id",
        "b_start_04",
        "--repo",
        "/tmp/symlink-repo"
      ],
      "/tmp",
      {
        resolveBubbleById: resolveBubbleByIdMock,
        registerRepoInRegistry: vi.fn(() =>
          Promise.resolve({
            added: true,
            entry: {
              repoPath: "/",
              addedAt: "2026-02-25T20:40:00.000Z"
            },
            registryPath: "/tmp/registry.json"
          })
        ),
        startBubble: startBubbleMock
      }
    );

    expect(startBubbleMock).toHaveBeenCalledWith({
      bubbleId: "b_start_04",
      repoPath: "/",
      cwd: "/tmp"
    });
  });

  it("skips auto-registration when canonicalization fails for missing relative repo path", async () => {
    const resolvedBubble = {
      bubbleId: "b_start_04b",
      repoPath: "missing-relative-repo",
      bubbleConfig: {
        id: "b_start_04b"
      },
      bubblePaths: {
        bubbleDir: "/tmp/cwd/missing-relative-repo/.pairflow/bubbles/b_start_04b"
      }
    } as unknown as ResolvedBubbleById;
    const resolveBubbleByIdMock: NonNullable<
      BubbleStartCommandDependencies["resolveBubbleById"]
    > = vi.fn(() => Promise.resolve(resolvedBubble));
    const registerRepoInRegistry = vi.fn(() => Promise.resolve({
      added: true,
      entry: {
        repoPath: "/tmp/cwd/missing-relative-repo",
        addedAt: "2026-02-25T20:40:30.000Z"
      },
      registryPath: "/tmp/registry.json"
    }));
    const warnings: string[] = [];
    const startBubbleResult = {
      bubbleId: "b_start_04b",
      state: {
        state: "RUNNING"
      },
      tmuxSessionName: "pf-b_start_04b",
      worktreePath: "/tmp/worktree"
    } as unknown as StartBubbleResult;
    const startBubbleMock: NonNullable<
      BubbleStartCommandDependencies["startBubble"]
    > = vi.fn(() => Promise.resolve(startBubbleResult));

    await runBubbleStartCommand(
      [
        "--id",
        "b_start_04b"
      ],
      "/tmp/cwd",
      {
        resolveBubbleById: resolveBubbleByIdMock,
        registerRepoInRegistry,
        reportRegistryRegistrationWarning: (message) => {
          warnings.push(message);
        },
        startBubble: startBubbleMock
      }
    );

    expect(registerRepoInRegistry).not.toHaveBeenCalled();
    expect(startBubbleMock).toHaveBeenCalledWith({
      bubbleId: "b_start_04b",
      repoPath: "/tmp/cwd/missing-relative-repo",
      cwd: "/tmp/cwd"
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(
      "skipping repository auto-registration for bubble start"
    );
  });

  it("continues start when auto-registration fails", async () => {
    const warnings: string[] = [];
    const resolvedBubble = {
      bubbleId: "b_start_05",
      repoPath: "/",
      bubbleConfig: {
        id: "b_start_05"
      },
      bubblePaths: {
        bubbleDir: "/.pairflow/bubbles/b_start_05"
      }
    } as unknown as ResolvedBubbleById;
    const resolveBubbleByIdMock: NonNullable<
      BubbleStartCommandDependencies["resolveBubbleById"]
    > = vi.fn(() => Promise.resolve(resolvedBubble));
    const startBubbleResult = {
      bubbleId: "b_start_05",
      state: {
        state: "RUNNING"
      },
      tmuxSessionName: "pf-b_start_05",
      worktreePath: "/tmp/worktree"
    } as unknown as StartBubbleResult;
    const startBubbleMock: NonNullable<
      BubbleStartCommandDependencies["startBubble"]
    > = vi.fn(() => Promise.resolve(startBubbleResult));

    const result = await runBubbleStartCommand(
      [
        "--id",
        "b_start_05"
      ],
      "/tmp",
      {
        resolveBubbleById: resolveBubbleByIdMock,
        registerRepoInRegistry: vi.fn(() =>
          Promise.reject(new Error("registry unavailable"))
        ),
        reportRegistryRegistrationWarning: (message) => {
          warnings.push(message);
        },
        startBubble: startBubbleMock
      }
    );

    expect(result?.bubbleId).toBe("b_start_05");
    expect(startBubbleMock).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("failed to auto-register repository");
  });

  it("writes warning to stderr when auto-registration fails without override reporter", async () => {
    const resolvedBubble = {
      bubbleId: "b_start_06",
      repoPath: "/",
      bubbleConfig: {
        id: "b_start_06"
      },
      bubblePaths: {
        bubbleDir: "/.pairflow/bubbles/b_start_06"
      }
    } as unknown as ResolvedBubbleById;
    const resolveBubbleByIdMock: NonNullable<
      BubbleStartCommandDependencies["resolveBubbleById"]
    > = vi.fn(() => Promise.resolve(resolvedBubble));
    const startBubbleResult = {
      bubbleId: "b_start_06",
      state: {
        state: "RUNNING"
      },
      tmuxSessionName: "pf-b_start_06",
      worktreePath: "/tmp/worktree"
    } as unknown as StartBubbleResult;
    const startBubbleMock: NonNullable<
      BubbleStartCommandDependencies["startBubble"]
    > = vi.fn(() => Promise.resolve(startBubbleResult));

    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      const result = await runBubbleStartCommand(
        [
          "--id",
          "b_start_06"
        ],
        "/tmp",
        {
          resolveBubbleById: resolveBubbleByIdMock,
          registerRepoInRegistry: vi.fn(() =>
            Promise.reject(new Error("registry unavailable"))
          ),
          startBubble: startBubbleMock
        }
      );

      expect(result?.bubbleId).toBe("b_start_06");
      expect(startBubbleMock).toHaveBeenCalledTimes(1);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "failed to auto-register repository for bubble start"
        )
      );
    } finally {
      stderrSpy.mockRestore();
    }
  });
});
