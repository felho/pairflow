import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runMergeContractCase } from "./merge.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const mergeCaseSources = [
  "tests/contracts/v11/cases/merge/merge-basic-v11.case.json",
  "tests/contracts/v11/cases/merge/merge-state-not-done-v11.case.json",
  "tests/contracts/v11/cases/merge/merge-repo-dirty-v11.case.json",
  "tests/contracts/v11/cases/merge/merge-branch-missing-v11.case.json",
  "tests/contracts/v11/cases/merge/merge-conflict-manual-resolution-v11.case.json",
  "tests/contracts/v11/cases/merge/merge-cleanup-invariant-v11.case.json",
  "tests/contracts/v11/cases/merge/merge-cleanup-contract-invalid-path-v11.case.json"
] as const;

const mergeExpectedSourcesSorted = [...mergeCaseSources].sort();

function parseMergeSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "merge")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 merge contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), mergeCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("merge");
    expect(caseDef.mode).toBe("v11");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes merge v11 cases via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityGitHeavyMs },
    async () => {
      const casePaths = mergeCaseSources.map((source) =>
        resolve(process.cwd(), source)
      );

      for (const casePath of casePaths) {
        const caseDef = await readContractCase(casePath);
        const run = await runMergeContractCase(caseDef);
        expect(caseDef.mode).toBe("v11");
        expect(run.v11?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
      }
    }
  );

  it("includes merge seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const mergeSources = parseMergeSourcesFromManifest(manifestRaw);

    expect(mergeSources).toEqual(mergeExpectedSourcesSorted);
  });

  it("builds corpus output manifest with merge seed entries", async () => {
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
    const mergeSources = parseMergeSourcesFromManifest(outputRaw);

    expect(mergeSources).toEqual(mergeExpectedSourcesSorted);
  });
});
