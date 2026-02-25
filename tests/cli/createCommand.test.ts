import { describe, expect, it, vi } from "vitest";

import {
  type BubbleCreateCommandDependencies,
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions,
  runBubbleCreateCommand
} from "../../src/cli/commands/bubble/create.js";
import type { BubbleCreateResult } from "../../src/core/bubble/createBubble.js";

describe("parseBubbleCreateCommandOptions", () => {
  it("parses required flags", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--task",
      "Implement X"
    ]);

    expect(parsed.id).toBe("b_create_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.base).toBe("main");
    expect(parsed.task).toBe("Implement X");
    expect(parsed.help).toBe(false);
  });

  it("parses --flag=value form", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id=b_create_01",
      "--repo=/tmp/repo",
      "--base=main",
      "--task=Implement X"
    ]);

    expect(parsed.id).toBe("b_create_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.base).toBe("main");
    expect(parsed.task).toBe("Implement X");
  });

  it("parses explicit task file input", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--task-file",
      "/tmp/task.md"
    ]);

    expect(parsed.taskFile).toBe("/tmp/task.md");
  });

  it("supports help flag", () => {
    const parsed = parseBubbleCreateCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleCreateHelpText()).toContain("pairflow bubble create");
  });

  it("throws when a required flag is missing", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--task",
        "Implement X"
      ])
    ).toThrow(/--base/u);
  });

  it("throws when task input is missing", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main"
      ])
    ).toThrow(/--task or --task-file/u);
  });

  it("throws when both task input forms are provided", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--task",
        "Implement X",
        "--task-file",
        "/tmp/task.md"
      ])
    ).toThrow(/Use only one task input/u);
  });

  it("auto-registers repo after creating bubble", async () => {
    const callOrder: string[] = [];
    const registerRepoInRegistry = vi.fn(() =>
      {
        callOrder.push("register");
        return Promise.resolve({
          added: true,
          entry: {
            repoPath: "/tmp/repo",
            addedAt: "2026-02-25T20:00:00.000Z"
          },
          registryPath: "/tmp/registry.json"
        });
      }
    );
    const createBubbleResult = {
      bubbleId: "b_create_01"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => {
      callOrder.push("create");
      return Promise.resolve({
        ...createBubbleResult
      });
    });

    await runBubbleCreateCommand(
      [
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--task",
        "Implement X"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock,
        registerRepoInRegistry
      }
    );

    expect(registerRepoInRegistry).toHaveBeenCalledWith({
      repoPath: "/tmp/repo"
    });
    expect(createBubbleMock).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["create", "register"]);
  });

  it("continues create when auto-registration fails", async () => {
    const warnings: string[] = [];
    const registerRepoInRegistry = vi.fn(() =>
      Promise.reject(new Error("registry lock timeout"))
    );
    const createBubbleResult = {
      bubbleId: "b_create_09"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    const result = await runBubbleCreateCommand(
      [
        "--id",
        "b_create_09",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--task",
        "Implement resilient registration"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock,
        registerRepoInRegistry,
        reportRegistryRegistrationWarning: (message) => {
          warnings.push(message);
        }
      }
    );

    expect(result?.bubbleId).toBe("b_create_09");
    expect(createBubbleMock).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("failed to auto-register repository");
  });

  it("does not auto-register repo when bubble creation fails", async () => {
    const registerRepoInRegistry = vi.fn(() =>
      Promise.resolve({
        added: true,
        entry: {
          repoPath: "/tmp/repo",
          addedAt: "2026-02-25T21:00:00.000Z"
        },
        registryPath: "/tmp/registry.json"
      })
    );
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.reject(new Error("create failed")));

    await expect(
      runBubbleCreateCommand(
        [
          "--id",
          "b_create_11",
          "--repo",
          "/tmp/repo",
          "--base",
          "main",
          "--task",
          "Fail before registry write"
        ],
        "/tmp",
        {
          createBubble: createBubbleMock,
          registerRepoInRegistry
        }
      )
    ).rejects.toThrow("create failed");
    expect(registerRepoInRegistry).not.toHaveBeenCalled();
  });

  it("writes warning to stderr when auto-registration fails without override reporter", async () => {
    const registerRepoInRegistry = vi.fn(() =>
      Promise.reject(new Error("registry lock timeout"))
    );
    const createBubbleResult = {
      bubbleId: "b_create_10"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      const result = await runBubbleCreateCommand(
        [
          "--id",
          "b_create_10",
          "--repo",
          "/tmp/repo",
          "--base",
          "main",
          "--task",
          "Validate stderr warning path"
        ],
        "/tmp",
        {
          createBubble: createBubbleMock,
          registerRepoInRegistry
        }
      );

      expect(result?.bubbleId).toBe("b_create_10");
      expect(createBubbleMock).toHaveBeenCalledTimes(1);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "failed to auto-register repository for bubble create"
        )
      );
    } finally {
      stderrSpy.mockRestore();
    }
  });
});
