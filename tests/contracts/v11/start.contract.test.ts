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
  "tests/contracts/v11/cases/start/start-basic-v11.case.json",
  "tests/contracts/v11/cases/start/start-state-not-startable-v11.case.json",
  "tests/contracts/v11/cases/start/start-clone-state-not-startable-v11.case.json",
  "tests/contracts/v11/cases/start/start-bootstrap-fails-cleanup-v11.case.json",
  "tests/contracts/v11/cases/start/start-clone-not-activated-v11.case.json",
  "tests/contracts/v11/cases/start/start-clone-not-activated-resume-v11.case.json",
  "tests/contracts/v11/cases/start/start-clone-not-activated-resume-waiting-human-v11.case.json",
  "tests/contracts/v11/cases/start/start-clone-not-activated-resume-ready-for-human-approval-v11.case.json",
  "tests/contracts/v11/cases/start/start-clone-not-activated-resume-approved-for-commit-v11.case.json",
  "tests/contracts/v11/cases/start/start-clone-not-activated-resume-committed-v11.case.json",
  "tests/contracts/v11/cases/start/start-launch-ack-failed-v11.case.json",
  "tests/contracts/v11/cases/start/start-stale-session-reclaim-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-created-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-execution-failed-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-confirmation-invalid-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-reconciliation-failed-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-sync-hook-warning-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-preflight-missing-origin-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-config-invalid-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-attach-rejected-v11.case.json",
  "tests/contracts/v11/cases/start/start-remote-control-files-unavailable-v11.case.json"
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
    expect(caseDef.mode).toBe("v11");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes v11 assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityStandardMs },
    async () => {
    const casePaths = startCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runStartContractCase(caseDef);
      expect(run.mode).toBe("v11");
      expect(run.v11?.status).toBe(caseDef.expected.status);
      if (caseDef.expected.reasonCode !== undefined) {
        expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
      }
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
