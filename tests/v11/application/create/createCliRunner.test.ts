import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { BubbleCreateResult } from "../../../../src/v11/application/create/createCommandContract.js";
import { CREATE_REMOTE_ALIAS_INVALID } from "../../../../src/v11/application/create/createCliOptionValidation.js";
import { runBubbleCreateCommand } from "../../../../src/v11/application/create/createCliRunner.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-create-cli-runner-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

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

  it("forwards remote alias through the runner create input", async () => {
    const createBubble = vi.fn(async () => ({
      bubbleId: "b_create_runner_remote_01"
    }) as unknown as BubbleCreateResult);

    const result = await runBubbleCreateCommand(
      [
        "--id",
        "b_create_runner_remote_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--remote",
        "homelab"
      ],
      "/tmp",
      {
        createBubble
      }
    );

    expect(result?.bubbleId).toBe("b_create_runner_remote_01");
    expect(createBubble).toHaveBeenCalledWith(
      expect.objectContaining({
        remote: "homelab"
      })
    );
  });

  it("rejects whitespace-only remote alias before calling createBubble", async () => {
    const createBubble = vi.fn();

    await expect(
      runBubbleCreateCommand(
        [
          "--id",
          "b_create_runner_remote_invalid_01",
          "--repo",
          "/tmp/repo",
          "--base",
          "main",
          "--review-artifact-type",
          "code",
          "--task",
          "Implement X",
          "--remote",
          "   "
        ],
        "/tmp",
        {
          createBubble
        }
      )
    ).rejects.toThrow(new RegExp(`^${CREATE_REMOTE_ALIAS_INVALID}:`, "u"));

    expect(createBubble).not.toHaveBeenCalled();
  });

  it("fails through CLI/createBubble integration when explicit validation target has no configured targets", async () => {
    const repoPath = await createTempRepo();

    await expect(
      runBubbleCreateCommand(
        [
          "--id",
          "b_create_runner_target_missing_01",
          "--repo",
          repoPath,
          "--base",
          "main",
          "--review-artifact-type",
          "code",
          "--task",
          "Implement X",
          "--validation-target",
          "web"
        ],
        "/tmp",
        {
          registerRepoInRegistry: async () => ({
            added: true,
            entry: {
              repoPath,
              addedAt: "2026-04-30T14:47:10.000Z"
            },
            registryPath: join(repoPath, ".pairflow", "repo-registry.json")
          })
        }
      )
    ).rejects.toThrow(/VALIDATION_TARGETS_NOT_CONFIGURED/u);

    await expect(
      stat(
        join(
          repoPath,
          ".pairflow",
          "bubbles",
          "b_create_runner_target_missing_01",
          "bubble.toml"
        )
      )
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
