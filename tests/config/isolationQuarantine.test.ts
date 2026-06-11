import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

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
