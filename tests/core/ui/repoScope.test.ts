import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { normalizeRepoPath } from "../../../src/core/bubble/repoResolution.js";
import {
  readRepoRegistry,
  registerRepoInRegistry,
  removeRepoFromRegistry
} from "../../../src/core/repo/registry.js";
import {
  resolveScopedRepoPath,
  resolveUiRepoScope,
  UiRepoScopeError
} from "../../../src/core/ui/repoScope.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix: string): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(repoPath);
  await initGitRepository(repoPath);
  return repoPath;
}

async function createRegistryPath(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-ui-scope-registry-"));
  tempDirs.push(root);
  return join(root, "repos.json");
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

describe("resolveUiRepoScope", () => {
  it("resolves explicit repo paths and supports membership checks", async () => {
    const repoA = await createTempRepo("pairflow-ui-scope-a-");
    const repoB = await createTempRepo("pairflow-ui-scope-b-");
    const registryPath = await createRegistryPath();
    await registerRepoInRegistry({
      repoPath: repoA,
      registryPath
    });
    await registerRepoInRegistry({
      repoPath: repoB,
      registryPath
    });
    const normalizedA = await normalizeRepoPath(repoA);
    const normalizedB = await normalizeRepoPath(repoB);

    const scope = await resolveUiRepoScope({
      repoPaths: [repoA, repoB, repoA],
      registryPath
    });

    expect(scope.repos).toEqual(
      [normalizedA, normalizedB].sort((a, b) => a.localeCompare(b))
    );
    await expect(scope.has(repoA)).resolves.toBe(true);
    await expect(scope.has("/tmp/unknown")).resolves.toBe(false);
  });

  it("auto-registers explicit repo filter paths before scope resolution", async () => {
    const repo = await createTempRepo("pairflow-ui-scope-auto-register-");
    const registryPath = await createRegistryPath();
    const normalizedRepo = await normalizeRepoPath(repo);

    const scope = await resolveUiRepoScope({
      repoPaths: [repo],
      registryPath
    });
    const loaded = await readRepoRegistry({
      registryPath,
      allowMissing: true
    });

    expect(scope.repos).toEqual([normalizedRepo]);
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0]?.repoPath).toBe(normalizedRepo);
    expect(loaded.entries[0]?.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
  });

  it("warns and continues when explicit repo auto-registration fails", async () => {
    const repo = await createTempRepo("pairflow-ui-scope-auto-register-fail-");
    const registryPath = await createRegistryPath();
    const normalizedRepo = await normalizeRepoPath(repo);
    const warnings: string[] = [];

    const scope = await resolveUiRepoScope({
      repoPaths: [repo],
      registryPath,
      registerRepoInRegistry: () => Promise.reject(new Error("registry lock timeout")),
      reportRegistryRegistrationWarning: (message) => {
        warnings.push(message);
      }
    });
    const loaded = await readRepoRegistry({
      registryPath,
      allowMissing: true
    });

    expect(scope.repos).toEqual([normalizedRepo]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(
      "failed to auto-register repository for ui scope"
    );
    expect(loaded.entries).toEqual([]);
  });

  it("resolves relative scope paths and has() checks against provided cwd", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-ui-scope-relative-"));
    tempDirs.push(root);
    const repoDirName = "repo";
    const repoPath = join(root, repoDirName);
    await mkdir(repoPath, {
      recursive: true
    });
    await initGitRepository(repoPath);
    const registryPath = join(root, "repos.json");
    const normalizedRepo = await normalizeRepoPath(repoPath);

    const scope = await resolveUiRepoScope({
      repoPaths: [repoDirName],
      cwd: root,
      registryPath
    });

    expect(scope.repos).toEqual([normalizedRepo]);
    await expect(scope.has(repoDirName)).resolves.toBe(true);
  });

  it("uses all registered repos when no --repo filter is provided", async () => {
    const repo = await createTempRepo("pairflow-ui-scope-fallback-");
    const registryPath = await createRegistryPath();
    await registerRepoInRegistry({
      repoPath: repo,
      registryPath
    });
    const normalizedRepo = await normalizeRepoPath(repo);

    const scope = await resolveUiRepoScope({
      cwd: repo,
      registryPath
    });

    expect(scope.repos).toEqual([normalizedRepo]);
  });

  it("returns empty scope when registry has no repos", async () => {
    const registryPath = await createRegistryPath();

    const scope = await resolveUiRepoScope({
      registryPath
    });

    expect(scope.repos).toEqual([]);
  });

  it("warns when explicit scoped repos are removed from registry during refresh", async () => {
    const repoA = await createTempRepo("pairflow-ui-scope-refresh-a-");
    const repoB = await createTempRepo("pairflow-ui-scope-refresh-b-");
    const registryPath = await createRegistryPath();
    const warnings: string[] = [];
    await registerRepoInRegistry({
      repoPath: repoA,
      registryPath
    });
    await registerRepoInRegistry({
      repoPath: repoB,
      registryPath
    });
    const normalizedRepoA = await normalizeRepoPath(repoA);
    const normalizedRepoB = await normalizeRepoPath(repoB);

    const scope = await resolveUiRepoScope({
      repoPaths: [repoA, repoB],
      registryPath,
      reportRegistryRegistrationWarning: (message) => {
        warnings.push(message);
      }
    });

    await removeRepoFromRegistry({
      repoPath: repoB,
      registryPath
    });

    const refreshed = await scope.refreshFromRegistry?.();
    expect(refreshed).toEqual({
      changed: true,
      added: [],
      removed: [normalizedRepoB],
      repos: [normalizedRepoA]
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("UI repo scope refresh warning:");
    expect(warnings[0]).toContain(normalizedRepoB);
  });

  it("normalizes refreshed registry entries to avoid spurious symlink add/remove diffs", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-ui-scope-symlink-refresh-"));
    tempDirs.push(root);
    const repoPath = await createTempRepo("pairflow-ui-scope-symlink-repo-");
    const symlinkPath = join(root, "repo-link");
    await symlink(repoPath, symlinkPath);
    const registryPath = join(root, "repos.json");

    const firstRegistration = await registerRepoInRegistry({
      repoPath,
      registryPath,
      now: new Date("2026-02-25T20:00:00.000Z")
    });
    const normalizedRepo = await normalizeRepoPath(repoPath);

    const scope = await resolveUiRepoScope({
      registryPath
    });

    await writeFile(
      registryPath,
      `${JSON.stringify(
        {
          version: 1,
          repos: [
            {
              repoPath: symlinkPath,
              addedAt: firstRegistration.entry.addedAt
            }
          ]
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const refreshed = await scope.refreshFromRegistry?.();
    expect(refreshed).toEqual({
      changed: false,
      added: [],
      removed: [],
      repos: [normalizedRepo]
    });
  });

  it("serializes concurrent refreshFromRegistry calls", async () => {
    const repoA = await createTempRepo("pairflow-ui-scope-serialize-a-");
    const repoB = await createTempRepo("pairflow-ui-scope-serialize-b-");
    const registryPath = await createRegistryPath();
    await registerRepoInRegistry({
      repoPath: repoA,
      registryPath
    });
    const normalizedRepoA = await normalizeRepoPath(repoA);
    const normalizedRepoB = await normalizeRepoPath(repoB);

    let readCalls = 0;
    let concurrentRefreshReads = 0;
    let maxConcurrentRefreshReads = 0;
    let releaseFirstRefreshRead!: () => void;
    const firstRefreshReadGate = new Promise<void>((resolve) => {
      releaseFirstRefreshRead = resolve;
    });
    const readRegistryHook: typeof readRepoRegistry = async (readInput = {}) => {
      readCalls += 1;
      if (readCalls >= 2) {
        concurrentRefreshReads += 1;
        maxConcurrentRefreshReads = Math.max(
          maxConcurrentRefreshReads,
          concurrentRefreshReads
        );
        if (readCalls === 2) {
          await firstRefreshReadGate;
        }
        try {
          return await readRepoRegistry(readInput);
        } finally {
          concurrentRefreshReads -= 1;
        }
      }
      return readRepoRegistry(readInput);
    };

    const scope = await resolveUiRepoScope({
      registryPath,
      readRepoRegistry: readRegistryHook
    });

    await registerRepoInRegistry({
      repoPath: repoB,
      registryPath
    });

    const firstRefresh = scope.refreshFromRegistry?.();
    if (firstRefresh === undefined) {
      throw new Error("Expected refreshFromRegistry to be available.");
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });

    const secondRefresh = scope.refreshFromRegistry?.();
    if (secondRefresh === undefined) {
      throw new Error("Expected refreshFromRegistry to be available.");
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });

    expect(readCalls).toBe(2);
    expect(maxConcurrentRefreshReads).toBe(1);

    releaseFirstRefreshRead();
    const [firstResult, secondResult] = await Promise.all([
      firstRefresh,
      secondRefresh
    ]);
    expect(readCalls).toBe(3);
    expect(firstResult).toEqual({
      changed: true,
      added: [normalizedRepoB],
      removed: [],
      repos: [normalizedRepoA, normalizedRepoB].sort((a, b) =>
        a.localeCompare(b)
      )
    });
    expect(secondResult).toEqual({
      changed: false,
      added: [],
      removed: [],
      repos: [normalizedRepoA, normalizedRepoB].sort((a, b) =>
        a.localeCompare(b)
      )
    });
  });
});

describe("resolveScopedRepoPath", () => {
  it("uses the only scoped repo when repo param is omitted", async () => {
    const repo = await createTempRepo("pairflow-ui-scope-single-");
    const registryPath = await createRegistryPath();
    await registerRepoInRegistry({
      repoPath: repo,
      registryPath
    });
    const normalizedRepo = await normalizeRepoPath(repo);
    const scope = await resolveUiRepoScope({
      repoPaths: [repo],
      registryPath
    });

    const resolved = await resolveScopedRepoPath({
      scope
    });

    expect(resolved).toBe(normalizedRepo);
  });

  it("requires explicit repo parameter for multi-repo scope", async () => {
    const repoA = await createTempRepo("pairflow-ui-scope-multi-a-");
    const repoB = await createTempRepo("pairflow-ui-scope-multi-b-");
    const registryPath = await createRegistryPath();
    await registerRepoInRegistry({
      repoPath: repoA,
      registryPath
    });
    await registerRepoInRegistry({
      repoPath: repoB,
      registryPath
    });
    const scope = await resolveUiRepoScope({
      repoPaths: [repoA, repoB],
      registryPath
    });

    await expect(
      resolveScopedRepoPath({
        scope
      })
    ).rejects.toBeInstanceOf(UiRepoScopeError);
  });

  it("normalizes explicit repo parameter using provided cwd", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-ui-scope-repo-param-"));
    tempDirs.push(root);
    const repoDirName = "repo";
    const repoPath = join(root, repoDirName);
    await mkdir(repoPath, {
      recursive: true
    });
    await initGitRepository(repoPath);
    const normalizedRepo = await normalizeRepoPath(repoPath);
    const registryPath = join(root, "repos.json");
    await registerRepoInRegistry({
      repoPath,
      registryPath
    });

    const scope = await resolveUiRepoScope({
      repoPaths: [repoDirName],
      cwd: root,
      registryPath
    });

    const unrelatedCwd = await mkdtemp(join(tmpdir(), "pairflow-ui-scope-unrelated-"));
    tempDirs.push(unrelatedCwd);
    const originalCwd = process.cwd();
    process.chdir(unrelatedCwd);
    try {
      const resolved = await resolveScopedRepoPath({
        scope,
        repoParam: repoDirName,
        cwd: root
      });
      expect(resolved).toBe(normalizedRepo);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
