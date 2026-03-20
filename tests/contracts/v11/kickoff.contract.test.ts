import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { runKickoffContractCase } from "./kickoff.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const kickoffCaseSources = [
  "tests/contracts/v11/cases/kickoff/kickoff-basic.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-basic-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-basic-parity.case.json"
] as const;

const kickoffExpectedSourcesSorted = [...kickoffCaseSources].sort();

function parseKickoffSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "kickoff")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 kickoff contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), kickoffCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("kickoff");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("executes legacy and parity assertions via shared runner", async () => {
    const casePaths = kickoffCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runKickoffContractCase(caseDef);
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
  });

  it("includes kickoff seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const kickoffSources = parseKickoffSourcesFromManifest(manifestRaw);

    expect(kickoffSources).toEqual(kickoffExpectedSourcesSorted);
  });

  it("builds corpus output manifest with kickoff seed entries", async () => {
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
    const kickoffSources = parseKickoffSourcesFromManifest(outputRaw);

    expect(kickoffSources).toEqual(kickoffExpectedSourcesSorted);
  });
});
