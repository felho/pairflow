import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runStartContractCase } from "./start.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const startCaseSources = [
  "tests/contracts/v11/cases/start/start-basic.case.json",
  "tests/contracts/v11/cases/start/start-basic-v11.case.json",
  "tests/contracts/v11/cases/start/start-basic-parity.case.json",
  "tests/contracts/v11/cases/start/start-state-not-startable.case.json",
  "tests/contracts/v11/cases/start/start-state-not-startable-v11.case.json",
  "tests/contracts/v11/cases/start/start-state-not-startable-parity.case.json",
  "tests/contracts/v11/cases/start/start-bootstrap-fails-cleanup.case.json",
  "tests/contracts/v11/cases/start/start-bootstrap-fails-cleanup-v11.case.json",
  "tests/contracts/v11/cases/start/start-bootstrap-fails-cleanup-parity.case.json",
  "tests/contracts/v11/cases/start/start-stale-session-reclaim.case.json",
  "tests/contracts/v11/cases/start/start-stale-session-reclaim-v11.case.json",
  "tests/contracts/v11/cases/start/start-stale-session-reclaim-parity.case.json"
] as const;

const startExpectedSourcesSorted = [...startCaseSources].sort();

function parseStartSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "start")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 start contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), startCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("start");
    expect(caseDef.mode).toBe("baseline");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes baseline and parity assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityStandardMs },
    async () => {
    const casePaths = startCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runStartContractCase(caseDef);
      if (caseDef.mode === "baseline") {
        expect(run.baseline?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.baseline?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.v11).toBeUndefined();
        continue;
      }
      if (caseDef.mode === "v11") {
        expect(run.v11?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.baseline).toBeUndefined();
        continue;
      }

      expect(run.baseline).toBeDefined();
      expect(run.v11).toBeDefined();
      expect(run.baseline).toEqual(run.v11);
    }
    }
  );

  it("includes start seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const startSources = parseStartSourcesFromManifest(manifestRaw);

    expect(startSources).toEqual(startExpectedSourcesSorted);
  });

  it("builds corpus output manifest with start seed entries", async () => {
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
    const startSources = parseStartSourcesFromManifest(outputRaw);

    expect(startSources).toEqual(startExpectedSourcesSorted);
  });
});
