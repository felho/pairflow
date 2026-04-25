import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runCommitContractCase } from "./commit.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const commitCaseSources = [
  "tests/contracts/v11/cases/commit/commit-basic-v11.case.json",
  "tests/contracts/v11/cases/commit/commit-staged-files-empty-v11.case.json",
  "tests/contracts/v11/cases/commit/commit-state-not-approved-v11.case.json",
  "tests/contracts/v11/cases/commit/commit-result-invariant-v11.case.json",
  "tests/contracts/v11/cases/commit/commit-auto-compat-v11.case.json"
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
    expect(caseDef.mode).toBe("v11");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes commit v11 cases via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityGitHeavyMs },
    async () => {
      const casePaths = commitCaseSources.map((source) =>
        resolve(process.cwd(), source)
      );

      for (const casePath of casePaths) {
        const caseDef = await readContractCase(casePath);
        const run = await runCommitContractCase(caseDef);
        expect(caseDef.mode).toBe("v11");
        expect(run.v11?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
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
