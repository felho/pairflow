import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { normalizeRepoPath } from "../../../src/core/bubble/repoResolution.js";
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
    const normalizedA = await normalizeRepoPath(repoA);
    const normalizedB = await normalizeRepoPath(repoB);

    const scope = await resolveUiRepoScope({
      repoPaths: [repoA, repoB, repoA]
    });

    expect(scope.repos).toEqual(
      [normalizedA, normalizedB].sort((a, b) => a.localeCompare(b))
    );
    await expect(scope.has(repoA)).resolves.toBe(true);
    await expect(scope.has("/tmp/unknown")).resolves.toBe(false);
  });

  it("falls back to git top-level from cwd when no --repo is provided", async () => {
    const repo = await createTempRepo("pairflow-ui-scope-fallback-");
    const normalizedRepo = await normalizeRepoPath(repo);

    const scope = await resolveUiRepoScope({
      cwd: repo
    });

    expect(scope.repos).toEqual([normalizedRepo]);
  });
});

describe("resolveScopedRepoPath", () => {
  it("uses the only scoped repo when repo param is omitted", async () => {
    const repo = await createTempRepo("pairflow-ui-scope-single-");
    const normalizedRepo = await normalizeRepoPath(repo);
    const scope = await resolveUiRepoScope({
      repoPaths: [repo]
    });

    const resolved = await resolveScopedRepoPath({
      scope
    });

    expect(resolved).toBe(normalizedRepo);
  });

  it("requires explicit repo parameter for multi-repo scope", async () => {
    const repoA = await createTempRepo("pairflow-ui-scope-multi-a-");
    const repoB = await createTempRepo("pairflow-ui-scope-multi-b-");
    const scope = await resolveUiRepoScope({
      repoPaths: [repoA, repoB]
    });

    await expect(
      resolveScopedRepoPath({
        scope
      })
    ).rejects.toBeInstanceOf(UiRepoScopeError);
  });
});
