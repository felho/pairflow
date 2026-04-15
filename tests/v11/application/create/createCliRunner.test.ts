import { describe, expect, it, vi } from "vitest";

import type { BubbleCreateResult } from "../../../../src/v11/application/create/createCommandContract.js";

import { runBubbleCreateCommand } from "../../../../src/v11/application/create/createCliRunner.js";

describe("create CLI runner", () => {
  it("uses an injected repo registry dependency when provided", async () => {
    const registerRepoInRegistry = vi.fn(async () => ({
      added: true,
      entry: {
        repoPath: "/tmp/repo",
        addedAt: "2026-02-25T20:00:00.000Z"
      },
      registryPath: "/tmp/registry.json"
    }));
    const createBubble = vi.fn(async () => ({
      bubbleId: "b_create_runner_01"
    }) as unknown as BubbleCreateResult);

    const result = await runBubbleCreateCommand(
      [
        "--id",
        "b_create_runner_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X"
      ],
      "/tmp",
      {
        createBubble,
        registerRepoInRegistry
      }
    );

    expect(result?.bubbleId).toBe("b_create_runner_01");
    expect(createBubble).toHaveBeenCalledTimes(1);
    expect(registerRepoInRegistry).toHaveBeenCalledWith({
      repoPath: "/tmp/repo"
    });
  });
});
