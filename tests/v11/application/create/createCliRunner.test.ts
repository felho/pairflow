import { describe, expect, it, vi } from "vitest";

import type { BubbleCreateResult } from "../../../../src/v11/application/create/createCommandContract.js";

const { registerRepoInRegistry } = vi.hoisted(() => ({
  registerRepoInRegistry: vi.fn(async () => ({
    added: true,
    entry: {
      repoPath: "/tmp/repo",
      addedAt: "2026-02-25T20:00:00.000Z"
    },
    registryPath: "/tmp/registry.json"
  }))
}));

vi.mock("../../../../src/core/repo/createCliDefaults.js", () => ({
  createCliDependencyDefaults: {
    registerRepoInRegistry
  }
}));

import { runBubbleCreateCommand } from "../../../../src/v11/application/create/createCliRunner.js";

describe("create CLI runner", () => {
  it("uses the caller-boundary repo registry default when no override is provided", async () => {
    const createBubble = vi.fn(async () => ({
      bubbleId: "b_create_runner_01"
    }) as Promise<BubbleCreateResult>);

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
        createBubble
      }
    );

    expect(result?.bubbleId).toBe("b_create_runner_01");
    expect(createBubble).toHaveBeenCalledTimes(1);
    expect(registerRepoInRegistry).toHaveBeenCalledWith({
      repoPath: "/tmp/repo"
    });
  });
});
