import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runKickoffContractCase } from "./kickoff.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const kickoffCaseSources = [
  "tests/contracts/v11/cases/kickoff/kickoff-basic.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-basic-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-basic-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-not-allowed.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-not-allowed-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-not-allowed-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-requires-running.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-requires-running-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-requires-running-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-invalid.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-invalid-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-invalid-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-already-active.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-already-active-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-already-active-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-not-eligible.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-not-eligible-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-not-eligible-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-state-conflict.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-state-conflict-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-state-conflict-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-persistence-failed.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-persistence-failed-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-persistence-failed-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-missing.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-missing-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-missing-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-placeholder.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-placeholder-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-placeholder-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-empty.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-empty-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-empty-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-input-conflict.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-input-conflict-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-input-conflict-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-not-regular.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-not-regular-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-file-not-regular-parity.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-input-missing.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-input-missing-v11.case.json",
  "tests/contracts/v11/cases/kickoff/kickoff-task-input-missing-parity.case.json"
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

  it(
    "executes legacy and parity assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityLargeCorpusMs },
    async () => {
      const casePaths = kickoffCaseSources.map((source) =>
        resolve(process.cwd(), source)
      );

      for (const casePath of casePaths) {
        const caseDef = await readContractCase(casePath);
        const run = await runKickoffContractCase(caseDef);
        if (caseDef.mode === "legacy") {
          expect(run.legacy?.status).toBe(caseDef.expected.status);
          expect(run.v11).toBeUndefined();
          continue;
        }
        if (caseDef.mode === "v11") {
          expect(run.v11?.status).toBe(caseDef.expected.status);
          expect(run.legacy).toBeUndefined();
          continue;
        }

        expect(run.legacy).toBeDefined();
        expect(run.v11).toBeDefined();
        expect(run.legacy).toEqual(run.v11);
      }
    }
  );

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
