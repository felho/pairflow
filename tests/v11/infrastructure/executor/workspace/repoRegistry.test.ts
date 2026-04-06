import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readRepoRegistry,
  registerRepoInRegistry,
  removeRepoFromRegistry,
  RepoRegistryError
} from "../../../../../src/v11/infrastructure/executor/workspace/repoRegistry.js";
import { normalizeRepoPath } from "../../../../../src/v11/infrastructure/executor/workspace/repoResolution.js";
import { initGitRepository } from "../../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("v11 repoRegistry", () => {
  it("reads as empty when registry file is missing", async () => {
    const root = await createTempDir("pairflow-v11-repo-registry-empty-");
    const registryPath = join(root, "repos.json");

    const loaded = await readRepoRegistry({
      registryPath,
      allowMissing: true
    });

    expect(loaded.registryPath).toBe(registryPath);
    expect(loaded.entries).toEqual([]);
  });

  it("registers repositories once with normalized paths", async () => {
    const root = await createTempDir("pairflow-v11-repo-registry-register-");
    const repoPath = await createTempDir("pairflow-v11-repo-registry-repo-");
    await initGitRepository(repoPath);
    const registryPath = join(root, "repos.json");

    const first = await registerRepoInRegistry({
      repoPath,
      registryPath,
      now: new Date("2026-02-25T18:00:00.000Z")
    });
    const second = await registerRepoInRegistry({
      repoPath,
      registryPath,
      now: new Date("2026-02-25T18:01:00.000Z")
    });
    const loaded = await readRepoRegistry({
      registryPath,
      allowMissing: true
    });

    const normalizedRepoPath = await normalizeRepoPath(repoPath);
    expect(first.added).toBe(true);
    expect(second.added).toBe(false);
    expect(loaded.entries).toEqual([
      {
        repoPath: normalizedRepoPath,
        addedAt: "2026-02-25T18:00:00.000Z"
      }
    ]);
  });

  it("removes by symlink path aliases", async () => {
    const root = await createTempDir("pairflow-v11-repo-registry-symlink-");
    const repoPath = await createTempDir("pairflow-v11-repo-registry-symlink-repo-");
    await initGitRepository(repoPath);
    const symlinkPath = join(root, "repo-link");
    await symlink(repoPath, symlinkPath);
    const registryPath = join(root, "repos.json");

    await registerRepoInRegistry({
      repoPath,
      registryPath,
      now: new Date("2026-02-25T18:40:00.000Z")
    });

    const removed = await removeRepoFromRegistry({
      repoPath: symlinkPath,
      registryPath
    });
    const loaded = await readRepoRegistry({
      registryPath,
      allowMissing: true
    });

    expect(removed.removed).toBe(true);
    expect(loaded.entries).toEqual([]);
  });

  it("rejects malformed registry json", async () => {
    const root = await createTempDir("pairflow-v11-repo-registry-invalid-");
    const registryPath = join(root, "repos.json");
    await writeFile(registryPath, "{this-is-not-json", "utf8");

    await expect(
      readRepoRegistry({
        registryPath
      })
    ).rejects.toBeInstanceOf(RepoRegistryError);
  });
});
