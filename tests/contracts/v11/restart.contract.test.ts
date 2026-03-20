import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { runRestartContractCase } from "./restart.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const restartCaseSources = [
  "tests/contracts/v11/cases/restart/restart-basic.case.json",
  "tests/contracts/v11/cases/restart/restart-basic-v11.case.json",
  "tests/contracts/v11/cases/restart/restart-basic-parity.case.json",
  "tests/contracts/v11/cases/restart/restart-start-state-not-startable.case.json",
  "tests/contracts/v11/cases/restart/restart-start-state-not-startable-v11.case.json",
  "tests/contracts/v11/cases/restart/restart-start-state-not-startable-parity.case.json"
] as const;

const restartExpectedSourcesSorted = [...restartCaseSources].sort();

function parseRestartSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "restart")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 restart contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), restartCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("restart");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("executes legacy and parity assertions via shared runner", async () => {
    const casePaths = restartCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runRestartContractCase(caseDef);
      if (caseDef.mode === "legacy") {
        expect(run.legacy?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.legacy?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.v11).toBeUndefined();
        continue;
      }
      if (caseDef.mode === "v11") {
        expect(run.v11?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.legacy).toBeUndefined();
        continue;
      }

      expect(run.legacy).toBeDefined();
      expect(run.v11).toBeDefined();
      expect(run.legacy).toEqual(run.v11);
    }
  });

  it("includes restart seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const restartSources = parseRestartSourcesFromManifest(manifestRaw);

    expect(restartSources).toEqual(restartExpectedSourcesSorted);
  });

  it("builds corpus output manifest with restart seed entries", async () => {
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
    const restartSources = parseRestartSourcesFromManifest(outputRaw);

    expect(restartSources).toEqual(restartExpectedSourcesSorted);
  });
});
