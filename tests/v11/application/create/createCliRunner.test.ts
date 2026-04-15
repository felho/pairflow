import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createBubble } from "../../../../src/v11/application/create/createBubble.js";
import type { BubbleCreateResult } from "../../../../src/v11/application/create/createCommandContract.js";
import { getBubblePaths } from "../../../../src/v11/infrastructure/artifact/bubble/paths.js";
import { readRemotePointer } from "../../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
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
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
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

  it("persists remote executor artifacts when remote alias is provided through the runner", async () => {
    const repoPath = await createTempRepo();
    const registerRepoInRegistry = vi.fn(async () => ({
      added: true,
      entry: {
        repoPath,
        addedAt: "2026-02-25T20:00:00.000Z"
      },
      registryPath: "/tmp/registry.json"
    }));

    const result = await runBubbleCreateCommand(
      [
        "--id",
        "b_create_runner_remote_01",
        "--repo",
        repoPath,
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--remote",
        "homelab",
        "--task",
        "Implement X"
      ],
      "/tmp",
      {
        createBubble: (input) =>
          createBubble(input, {
            loadPairflowGlobalConfig: async () => ({
              remotes: {
                homelab: {
                  host: "remote.example",
                  repo_base: "/srv/repos",
                  default_port_forwards: [3000, 9229]
                }
              }
            })
          }),
        registerRepoInRegistry
      }
    );

    expect(result?.config.executor).toEqual({
      type: "ssh",
      remote: "homelab"
    });
    expect(registerRepoInRegistry).toHaveBeenCalledWith({
      repoPath
    });

    const bubbleToml = await readFile(result!.paths.bubbleTomlPath, "utf8");
    expect(bubbleToml).toContain("[executor]");
    expect(bubbleToml).toContain('remote = "homelab"');

    expect(await readRemotePointer(result!.paths.remotePointerPath)).toEqual({
      kind: "created",
      host: "remote.example",
      portForwards: [3000, 9229]
    });
    await expect(stat(result!.paths.remoteStateCachePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("fails closed at the CLI seam when remote global config loading fails", async () => {
    const repoPath = await createTempRepo();
    const registerRepoInRegistry = vi.fn(async () => ({
      added: true,
      entry: {
        repoPath,
        addedAt: "2026-02-25T20:00:00.000Z"
      },
      registryPath: "/tmp/registry.json"
    }));

    await expect(
      runBubbleCreateCommand(
        [
          "--id",
          "b_create_runner_remote_fail_closed_01",
          "--repo",
          repoPath,
          "--base",
          "main",
          "--review-artifact-type",
          "code",
          "--remote",
          "homelab",
          "--task",
          "Implement X"
        ],
        "/tmp",
        {
          createBubble: (input) =>
            createBubble(input, {
              loadPairflowGlobalConfig: async () => {
                throw new Error("global config unavailable");
              }
            }),
          registerRepoInRegistry
        }
      )
    ).rejects.toThrow(/global config unavailable/u);

    expect(registerRepoInRegistry).not.toHaveBeenCalled();
    const paths = getBubblePaths(repoPath, "b_create_runner_remote_fail_closed_01");
    await expect(stat(paths.bubbleTomlPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(paths.remotePointerPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });
});
