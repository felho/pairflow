import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  CreateBubbleImplementation,
  BubbleCreateInput,
  BubbleCreateResult
} from "../../src/v11/application/create/createCommandContract.js";
import { CREATE_REMOTE_ALIAS_INVALID } from "../../src/cli/commands/bubble/createCliOptionValidation.js";
import { runBubbleCreateCommand } from "../../src/cli/commands/bubble/createCliRunner.js";
import { initGitRepository } from "../helpers/git.js";

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

  it("allows --base to be omitted so repo defaults can resolve it later", async () => {
    const createBubble = vi.fn<CreateBubbleImplementation>(
      async () => ({
        bubbleId: "b_create_runner_default_base"
      }) as unknown as BubbleCreateResult
    );

    const result = await runBubbleCreateCommand(
      [
        "--id",
        "b_create_runner_default_base",
        "--repo",
        "/tmp/repo",
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

    expect(result?.bubbleId).toBe("b_create_runner_default_base");
    const createInput: BubbleCreateInput | undefined =
      createBubble.mock.calls[0]?.[0];
    expect(createInput).toBeDefined();
    expect(createInput).not.toHaveProperty("baseBranch");
  });

  it("fails through CLI/createBubble integration when --base and repo default base are missing", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_create_runner_missing_base";

    await expect(
      runBubbleCreateCommand(
        [
          "--id",
          bubbleId,
          "--repo",
          repoPath,
          "--review-artifact-type",
          "code",
          "--task",
          "Implement X"
        ],
        "/tmp"
      )
    ).rejects.toThrow(/--base <branch>.*\[defaults\]\.base_branch/u);

    await expect(
      stat(join(repoPath, ".pairflow", "bubbles", bubbleId))
    ).rejects.toMatchObject({ code: "ENOENT" });
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
