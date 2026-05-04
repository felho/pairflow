import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runStopContractCase } from "./stop.contract.runner.js";
import { readContractCase } from "./runner.js";
import type { ContractCase } from "./schema.js";

const execFileAsync = promisify(execFile);
const stopCaseSources = [
  "tests/contracts/v11/cases/stop/stop-basic-v11.case.json",
  "tests/contracts/v11/cases/stop/stop-no-runtime-session-v11.case.json",
  "tests/contracts/v11/cases/stop/stop-final-state-v11.case.json",
  "tests/contracts/v11/cases/stop/stop-cleanup-invariant-v11.case.json"
] as const;
const stopExpectedSourcesSorted = [...stopCaseSources].sort();

function parseStopSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "stop")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

const stopInvalidInputCases: Array<{
  name: string;
  caseDef: ContractCase;
  expectedErrorMessage: string;
}> = [
  {
    name: "rejects invalid stop contract input when tmuxSessionExisted is not boolean",
    caseDef: {
      id: "stop-invalid-tmux-session-existed",
      command: "stop",
      mode: "v11",
      description: "invalid tmuxSessionExisted validation",
      input: {
        tmuxSessionExisted: "yes"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "stop contract input.tmuxSessionExisted must be a boolean."
  },
  {
    name: "rejects invalid stop contract input when runtimeSessionRemoved is not boolean",
    caseDef: {
      id: "stop-invalid-runtime-session-removed",
      command: "stop",
      mode: "v11",
      description: "invalid runtimeSessionRemoved validation",
      input: {
        runtimeSessionRemoved: "no"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage:
      "stop contract input.runtimeSessionRemoved must be a boolean."
  },
  {
    name: "rejects invalid stop contract input in v11 mode when runtimeSessionRemoved is not boolean",
    caseDef: {
      id: "stop-invalid-runtime-session-removed-v11",
      command: "stop",
      mode: "v11",
      description: "invalid runtimeSessionRemoved validation for v11 mode",
      input: {
        runtimeSessionRemoved: "no"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage:
      "stop contract input.runtimeSessionRemoved must be a boolean."
  }
];

describe("v11 stop contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), stopCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("stop");
    expect(caseDef.mode).toBe("v11");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes stop v11 cases via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityHeavyMs },
    async () => {
      const casePaths = stopCaseSources.map((source) =>
        resolve(process.cwd(), source)
      );

      for (const casePath of casePaths) {
        const caseDef = await readContractCase(casePath);
        const run = await runStopContractCase(caseDef);
        expect(caseDef.mode).toBe("v11");
        expect(run.v11?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
      }
    }
  );

  it("includes stop seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const stopSources = parseStopSourcesFromManifest(manifestRaw);

    expect(stopSources).toEqual(stopExpectedSourcesSorted);
  });

  it(
    "builds corpus output manifest with stop seed entries",
    { timeout: CONTRACT_TEST_TIMEOUT.parityHeavyMs },
    async () => {
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
    const stopSources = parseStopSourcesFromManifest(outputRaw);

    expect(stopSources).toEqual(stopExpectedSourcesSorted);
    }
  );

  for (const testCase of stopInvalidInputCases) {
    it(testCase.name, async () => {
      await expect(runStopContractCase(testCase.caseDef)).rejects.toThrow(
        testCase.expectedErrorMessage
      );
    });
  }
});
