import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { runCommitContractCase } from "./commit.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const commitCaseSources = [
  "tests/contracts/v11/cases/commit/commit-basic.case.json",
  "tests/contracts/v11/cases/commit/commit-basic-v11.case.json",
  "tests/contracts/v11/cases/commit/commit-basic-parity.case.json"
] as const;

const commitExpectedSourcesSorted = [...commitCaseSources].sort();

function parseCommitSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "commit")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 commit contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), commitCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("commit");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes legacy and parity assertions via shared runner",
    { timeout: 20_000 },
    async () => {
    const casePaths = commitCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runCommitContractCase(caseDef);
      if (caseDef.mode === "legacy") {
        expect(run.legacy?.status).toBe("ok");
        expect(run.v11).toBeUndefined();
        continue;
      }
      if (caseDef.mode === "v11") {
        expect(run.v11?.status).toBe("ok");
        expect(run.legacy).toBeUndefined();
        continue;
      }

      expect(run.legacy).toBeDefined();
      expect(run.v11).toBeDefined();
      expect(run.legacy).toEqual(run.v11);
    }
    }
  );

  it("includes commit seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const commitSources = parseCommitSourcesFromManifest(manifestRaw);

    expect(commitSources).toEqual(commitExpectedSourcesSorted);
  });

  it("builds corpus output manifest with commit seed entries", async () => {
    await execFileAsync("pnpm", [
      "exec",
      "tsx",
      "./tests/contracts/v11/corpus/build-corpus.ts"
    ]);

    const outputManifestPath = resolve(
      process.cwd(),
      ".pairflow/evidence/contracts-v11-corpus-manifest.json"
    );
    const outputRaw = await readFile(outputManifestPath, "utf8");
    const commitSources = parseCommitSourcesFromManifest(outputRaw);

    expect(commitSources).toEqual(commitExpectedSourcesSorted);
  });
});
