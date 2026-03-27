import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runWatchdogContractCase } from "./watchdog.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const watchdogCaseSources = [
  "tests/contracts/v11/cases/watchdog/watchdog-waiting-human.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-waiting-human-v11.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-final-state.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-final-state-v11.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-recent-change-noop.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-recent-change-noop-v11.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-quiet-window-escalates.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-quiet-window-escalates-v11.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-missing-session-escalates.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-missing-session-escalates-v11.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-unreadable-pane-escalates.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-expired-unreadable-pane-escalates-v11.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-meta-review-running-expired.case.json",
  "tests/contracts/v11/cases/watchdog/watchdog-meta-review-running-expired-v11.case.json"
] as const;

const watchdogExpectedSourcesSorted = [...watchdogCaseSources].sort();

function parseWatchdogSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "watchdog")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 watchdog contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), watchdogCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("watchdog");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes legacy and v11 assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityHeavyMs },
    async () => {
    const casePaths = watchdogCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runWatchdogContractCase(caseDef);
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
    }
  );

  it("includes watchdog seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const watchdogSources = parseWatchdogSourcesFromManifest(manifestRaw);

    expect(watchdogSources).toEqual(watchdogExpectedSourcesSorted);
  });

  it("builds corpus output manifest with watchdog seed entries", async () => {
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
    const watchdogSources = parseWatchdogSourcesFromManifest(outputRaw);

    expect(watchdogSources).toEqual(watchdogExpectedSourcesSorted);
  });
});
