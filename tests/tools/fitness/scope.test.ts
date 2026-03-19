import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  normalizePathToPosix,
  resolveFilesForScopePatterns
} from "../../../tools/fitness/scope.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-scope-"));
  tempDirs.push(root);
  return root;
}

async function writeRepoFile(
  repoRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  const absolutePath = join(repoRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("fitness scope resolver", () => {
  it("returns files that match provided scope patterns", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(repoRoot, "src/v11/application/a.ts", "export const a = 1;\n");
    await writeRepoFile(repoRoot, "src/v11/domain/b.ts", "export const b = 2;\n");
    await writeRepoFile(repoRoot, "src/core/c.ts", "export const c = 3;\n");

    const files = await resolveFilesForScopePatterns(repoRoot, [
      "src/v11/application/**",
      "src/v11/domain/**"
    ]);

    const relativePaths = files.map((path) =>
      normalizePathToPosix(relative(repoRoot, path))
    );
    expect(relativePaths).toEqual([
      "src/v11/application/a.ts",
      "src/v11/domain/b.ts"
    ]);
  });

  it("returns empty list for missing scope roots", async () => {
    const repoRoot = await createTempRoot();
    const files = await resolveFilesForScopePatterns(repoRoot, [
      "src/v11/application/**"
    ]);
    expect(files).toEqual([]);
  });
});
