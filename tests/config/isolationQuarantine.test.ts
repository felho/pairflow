import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import vitestConfig from "../../vitest.config.js";
import { isolatedTestFiles } from "../../vitest.isolation.js";

const repoRoot = process.cwd();
const testsRoot = join(repoRoot, "tests");
const moduleMockPattern =
  /\bvi\.(?:mock|doMock|doUnmock|unmock|resetModules)\(/u;

async function collectTestFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(entryPath);
    }
  }
  return files;
}

describe("isolation quarantine list", () => {
  it("quarantines every test file that replaces modules or resets the module registry", async () => {
    const testFiles = await collectTestFiles(testsRoot);
    const moduleMockingFiles: string[] = [];
    for (const filePath of testFiles) {
      const source = await readFile(filePath, "utf8");
      if (moduleMockPattern.test(source)) {
        moduleMockingFiles.push(
          relative(repoRoot, filePath).split(sep).join("/")
        );
      }
    }

    const quarantined = new Set(isolatedTestFiles);
    const unquarantined = moduleMockingFiles.filter(
      (filePath) => !quarantined.has(filePath)
    );

    expect(
      unquarantined,
      "test files using vi.mock/doMock/doUnmock/unmock/resetModules must run with per-file isolation; add them to vitest.isolation.ts"
    ).toEqual([]);
  });

  it("keeps the pool wiring that makes the split isolate correctly", () => {
    // Vitest reads pool isolate flags from the root config only and the
    // projects steer isolation solely through their pool type, so these
    // four facts must hold together; see the comment in vitest.config.ts.
    const projects = vitestConfig.test?.projects ?? [];
    const projectTestConfigs = projects.flatMap((project) =>
      typeof project === "object" &&
      project !== null &&
      "test" in project &&
      project.test !== undefined
        ? [project.test]
        : []
    );
    const mainProject = projectTestConfigs.find(
      (projectTest) => projectTest.name === "main"
    );
    const isolatedProject = projectTestConfigs.find(
      (projectTest) => projectTest.name === "isolated"
    );

    expect(
      vitestConfig.test?.poolOptions?.forks?.isolate,
      "the shared-registry speedup relies on the root forks pool running unisolated"
    ).toBe(false);
    expect(
      vitestConfig.test?.poolOptions?.threads?.isolate ?? true,
      "the quarantine relies on the threads pool keeping per-file isolation"
    ).toBe(true);
    expect(
      mainProject?.pool ?? "forks",
      "the main project must stay on the unisolated forks pool"
    ).toBe("forks");
    expect(
      isolatedProject?.pool,
      "the isolated project must run on the threads pool to keep isolation"
    ).toBe("threads");
    expect(
      isolatedProject?.include,
      "the isolated project must include exactly the quarantined files"
    ).toEqual(isolatedTestFiles);
  });

  it("lists only existing test files", async () => {
    const testFiles = new Set(
      (await collectTestFiles(testsRoot)).map((filePath) =>
        relative(repoRoot, filePath).split(sep).join("/")
      )
    );
    const staleEntries = isolatedTestFiles.filter(
      (filePath) => !testFiles.has(filePath)
    );

    expect(
      staleEntries,
      "remove deleted test files from vitest.isolation.ts"
    ).toEqual([]);
  });
});
