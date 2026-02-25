import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readRepoRegistry,
  registerRepoInRegistry,
  removeRepoFromRegistry,
  RepoRegistryError,
  resolveRepoRegistryPath
} from "../../../src/core/repo/registry.js";
import { normalizeRepoPath } from "../../../src/core/bubble/repoResolution.js";
import { initGitRepository } from "../../helpers/git.js";

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

describe("repo registry", () => {
  it("reads as empty when registry file is missing", async () => {
    const root = await createTempDir("pairflow-repo-registry-empty-");
    const registryPath = join(root, "repos.json");

    const loaded = await readRepoRegistry({
      registryPath,
      allowMissing: true
    });

    expect(loaded.registryPath).toBe(registryPath);
    expect(loaded.entries).toEqual([]);
  });

  it("registers repositories once with normalized paths", async () => {
    const root = await createTempDir("pairflow-repo-registry-register-");
    const repoPath = await createTempDir("pairflow-repo-registry-repo-");
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

  it("removes existing repo entries", async () => {
    const root = await createTempDir("pairflow-repo-registry-remove-");
    const repoPath = await createTempDir("pairflow-repo-registry-remove-repo-");
    await initGitRepository(repoPath);
    const registryPath = join(root, "repos.json");

    await registerRepoInRegistry({
      repoPath,
      registryPath,
      now: new Date("2026-02-25T18:30:00.000Z")
    });

    const removed = await removeRepoFromRegistry({
      repoPath,
      registryPath
    });
    const loaded = await readRepoRegistry({
      registryPath,
      allowMissing: true
    });

    expect(removed.removed).toBe(true);
    expect(loaded.entries).toEqual([]);
  });

  it("throws RepoRegistryError for malformed JSON", async () => {
    const root = await createTempDir("pairflow-repo-registry-invalid-");
    const registryPath = join(root, "repos.json");
    await writeFile(registryPath, "{this-is-not-json", "utf8");

    await expect(
      readRepoRegistry({
        registryPath
      })
    ).rejects.toBeInstanceOf(RepoRegistryError);
  });

  it("fails by default when registry file is missing", async () => {
    const root = await createTempDir("pairflow-repo-registry-missing-");
    const registryPath = join(root, "repos.json");

    await expect(
      readRepoRegistry({
        registryPath
      })
    ).rejects.toBeInstanceOf(RepoRegistryError);
  });

  it("rejects registry entries with non-ISO addedAt values", async () => {
    const root = await createTempDir("pairflow-repo-registry-bad-added-at-");
    const registryPath = join(root, "repos.json");
    await writeFile(
      registryPath,
      JSON.stringify(
        {
          version: 1,
          repos: [
            {
              repoPath: "/tmp/repo",
              addedAt: "not-an-iso-timestamp"
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(
      readRepoRegistry({
        registryPath
      })
    ).rejects.toBeInstanceOf(RepoRegistryError);
  });

  it("removes by symlink path aliases", async () => {
    const root = await createTempDir("pairflow-repo-registry-symlink-");
    const repoPath = await createTempDir("pairflow-repo-registry-symlink-repo-");
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

  it("uses PAIRFLOW_REPO_REGISTRY_PATH when explicit path is not provided", () => {
    const original = process.env.PAIRFLOW_REPO_REGISTRY_PATH;
    process.env.PAIRFLOW_REPO_REGISTRY_PATH = "/tmp/pairflow-repo-registry-env.json";
    try {
      expect(resolveRepoRegistryPath()).toBe(
        "/tmp/pairflow-repo-registry-env.json"
      );
    } finally {
      if (original === undefined) {
        delete process.env.PAIRFLOW_REPO_REGISTRY_PATH;
      } else {
        process.env.PAIRFLOW_REPO_REGISTRY_PATH = original;
      }
    }
  });

  it("warns when normalizePaths deduplicates aliases with conflicting labels", async () => {
    const root = await createTempDir("pairflow-repo-registry-label-conflict-");
    const repoPath = await createTempDir("pairflow-repo-registry-label-repo-");
    await initGitRepository(repoPath);
    const aliasPath = join(root, "repo-alias");
    await symlink(repoPath, aliasPath);
    const registryPath = join(root, "repos.json");

    await writeFile(
      registryPath,
      `${JSON.stringify(
        {
          version: 1,
          repos: [
            {
              repoPath,
              addedAt: "2026-02-25T21:20:00.000Z",
              label: "primary"
            },
            {
              repoPath: aliasPath,
              addedAt: "2026-02-25T21:21:00.000Z",
              label: "alias"
            }
          ]
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const warnings: string[] = [];
    const loaded = await readRepoRegistry({
      registryPath,
      normalizePaths: true,
      reportNormalizationWarning: (message) => {
        warnings.push(message);
      }
    });
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0]?.label).toBe("primary");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(
      "Pairflow warning: deduplicating repo registry aliases with conflicting labels"
    );
  });
});
