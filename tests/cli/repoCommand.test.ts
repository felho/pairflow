import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { normalizeRepoPath } from "../../src/core/bubble/repoResolution.js";
import { registerRepoInRegistry } from "../../src/core/repo/registry.js";
import {
  getRepoAddHelpText,
  parseRepoAddCommandOptions,
  runRepoAddCommand
} from "../../src/cli/commands/repo/add.js";
import {
  getRepoListHelpText,
  parseRepoListCommandOptions,
  runRepoListCommand
} from "../../src/cli/commands/repo/list.js";
import {
  getRepoRemoveHelpText,
  parseRepoRemoveCommandOptions,
  runRepoRemoveCommand
} from "../../src/cli/commands/repo/remove.js";
import { initGitRepository } from "../helpers/git.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

function withRegistryEnv(path: string, run: () => Promise<void>): Promise<void> {
  const previous = process.env.PAIRFLOW_REPO_REGISTRY_PATH;
  process.env.PAIRFLOW_REPO_REGISTRY_PATH = path;
  return run().finally(() => {
    if (previous === undefined) {
      delete process.env.PAIRFLOW_REPO_REGISTRY_PATH;
    } else {
      process.env.PAIRFLOW_REPO_REGISTRY_PATH = previous;
    }
  });
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

describe("repo add command", () => {
  it("parses repo add path positional", () => {
    const parsed = parseRepoAddCommandOptions(["/tmp/repo"]);
    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected non-help parsed options.");
    }
    expect(parsed.repoPath).toBe("/tmp/repo");
  });

  it("parses optional --label metadata", () => {
    const parsed = parseRepoAddCommandOptions(["/tmp/repo", "--label", "My Repo"]);
    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected non-help parsed options.");
    }
    expect(parsed.label).toBe("My Repo");
  });

  it("supports help", () => {
    const parsed = parseRepoAddCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getRepoAddHelpText()).toContain("pairflow repo add");
    expect(getRepoAddHelpText()).toContain("--label <text>");
  });
});

describe("repo list command", () => {
  it("parses --json", () => {
    const parsed = parseRepoListCommandOptions(["--json"]);
    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected non-help parsed options.");
    }
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseRepoListCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getRepoListHelpText()).toContain("pairflow repo list");
  });
});

describe("repo remove command", () => {
  it("parses repo remove path positional", () => {
    const parsed = parseRepoRemoveCommandOptions(["/tmp/repo"]);
    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected non-help parsed options.");
    }
    expect(parsed.repoPath).toBe("/tmp/repo");
  });

  it("supports help", () => {
    const parsed = parseRepoRemoveCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getRepoRemoveHelpText()).toContain("pairflow repo remove");
  });
});

describe("repo command run flows", () => {
  it("adds, lists, and removes registered repositories", async () => {
    const registryRoot = await createTempDir("pairflow-cli-repo-registry-");
    const registryPath = join(registryRoot, "repos.json");
    const repoPath = await createTempDir("pairflow-cli-repo-target-");
    await initGitRepository(repoPath);

    await withRegistryEnv(registryPath, async () => {
      const added = await runRepoAddCommand([repoPath, "--label", "Primary"]);
      expect(added?.added).toBe(true);
      expect(added?.entry.label).toBe("Primary");

      const listedAfterAdd = await runRepoListCommand([]);
      expect(listedAfterAdd).not.toBeNull();
      expect(listedAfterAdd?.repos).toHaveLength(1);
      expect(listedAfterAdd?.repos[0]?.status).toBe("exists");
      expect(listedAfterAdd?.repos[0]?.label).toBe("Primary");

      const removed = await runRepoRemoveCommand([repoPath]);
      expect(removed?.removed).toBe(true);

      const listedAfterRemove = await runRepoListCommand([]);
      expect(listedAfterRemove).not.toBeNull();
      expect(listedAfterRemove?.repos).toEqual([]);
    });
  });

  it("reports canonical removed path when command receives a symlink alias", async () => {
    const registryRoot = await createTempDir("pairflow-cli-repo-registry-canonical-");
    const registryPath = join(registryRoot, "repos.json");
    const repoRoot = await createTempDir("pairflow-cli-repo-root-");
    const realRepoPath = join(repoRoot, "repo-real");
    const symlinkRepoPath = join(repoRoot, "repo-link");
    await mkdir(realRepoPath);
    await initGitRepository(realRepoPath);
    await symlink(realRepoPath, symlinkRepoPath);
    const normalizedRepoPath = await normalizeRepoPath(realRepoPath);

    await withRegistryEnv(registryPath, async () => {
      await runRepoAddCommand([realRepoPath]);
      const removed = await runRepoRemoveCommand([symlinkRepoPath]);
      expect(removed).not.toBeNull();
      expect(removed?.removed).toBe(true);
      expect(removed?.repoPath).toBe(normalizedRepoPath);
    });
  });

  it("supports explicit registry path injection for repo list", async () => {
    const registryRoot = await createTempDir("pairflow-cli-repo-registry-injected-");
    const registryPath = join(registryRoot, "repos.json");
    const repoPath = await createTempDir("pairflow-cli-repo-injected-target-");
    await initGitRepository(repoPath);
    const normalizedRepoPath = await normalizeRepoPath(repoPath);
    await registerRepoInRegistry({
      repoPath,
      registryPath
    });

    const listed = await runRepoListCommand([], {
      registryPath
    });
    expect(listed).not.toBeNull();
    expect(listed).toMatchObject({
      registryPath,
      total: 1
    });
    expect(listed?.repos[0]?.repoPath).toBe(normalizedRepoPath);
  });

  it("rejects adding a non-git directory", async () => {
    const registryRoot = await createTempDir("pairflow-cli-repo-registry-invalid-");
    const registryPath = join(registryRoot, "repos.json");
    const nonGitPath = await createTempDir("pairflow-cli-repo-non-git-");

    await withRegistryEnv(registryPath, async () => {
      await expect(runRepoAddCommand([nonGitPath])).rejects.toThrow(
        `Repository path is not a git repository: ${nonGitPath}`
      );
    });
  });
});
