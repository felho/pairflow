import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runAskHumanContractCase } from "./askHuman.contract.runner.js";
import { readContractCase } from "./runner.js";
import type { ContractCase } from "./schema.js";

const execFileAsync = promisify(execFile);
const askHumanCaseSources = [
  "tests/contracts/v11/cases/ask-human/ask-human-basic.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-basic-v11.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-basic-parity.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-no-refs.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-no-refs-v11.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-no-refs-parity.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-state-not-running.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-state-not-running-v11.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-state-not-running-parity.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-running-round-invalid.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-running-round-invalid-v11.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-running-round-invalid-parity.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-running-role-unsupported.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-running-role-unsupported-v11.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-running-role-unsupported-parity.case.json"
] as const;

const askHumanExpectedSourcesSorted = [...askHumanCaseSources].sort();
const askHumanNoRefsCaseSources = [
  "tests/contracts/v11/cases/ask-human/ask-human-no-refs.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-no-refs-v11.case.json",
  "tests/contracts/v11/cases/ask-human/ask-human-no-refs-parity.case.json"
] as const;
const askHumanNoRefsExpectedSourcesSorted = [...askHumanNoRefsCaseSources].sort();

const askHumanInvalidInputCases: Array<{
  name: string;
  caseDef: ContractCase;
  expectedErrorMessage: string;
}> = [
  {
    name: "rejects invalid ask-human contract input when question is empty",
    caseDef: {
      id: "ask-human-invalid-empty-question",
      command: "askHuman",
      mode: "legacy",
      description: "invalid question validation",
      input: {
        question: "   ",
        refs: []
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage:
      "askHuman contract input.question must be a non-empty string."
  },
  {
    name: "rejects invalid ask-human contract input when refs is not string array",
    caseDef: {
      id: "ask-human-invalid-refs",
      command: "askHuman",
      mode: "legacy",
      description: "invalid refs validation",
      input: {
        question: "Need clarification",
        refs: ["ok-ref", 42]
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "askHuman contract input.refs must be a string array."
  },
  {
    name: "rejects invalid ask-human contract input in v11 mode when refs is not string array",
    caseDef: {
      id: "ask-human-invalid-refs-v11",
      command: "askHuman",
      mode: "v11",
      description: "invalid refs validation for v11 mode",
      input: {
        question: "Need clarification",
        refs: ["ok-ref", 42]
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "askHuman contract input.refs must be a string array."
  },
  {
    name: "rejects invalid ask-human contract input in v11 mode when question is empty",
    caseDef: {
      id: "ask-human-invalid-empty-question-v11",
      command: "askHuman",
      mode: "v11",
      description: "invalid empty question validation for v11 mode",
      input: {
        question: "   ",
        refs: []
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage:
      "askHuman contract input.question must be a non-empty string."
  }
];

function parseAskHumanSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "askHuman")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

function expectManifestContainsSources(input: {
  actualSources: string[];
  expectedSources: readonly string[];
}): void {
  for (const expectedSource of input.expectedSources) {
    expect(input.actualSources).toContain(expectedSource);
  }
}

describe("v11 askHuman contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), askHumanCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("askHuman");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("executes legacy and parity assertions via shared runner", async () => {
    const casePaths = askHumanCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runAskHumanContractCase(caseDef);
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

  it("includes ask-human seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const askHumanSources = parseAskHumanSourcesFromManifest(manifestRaw);

    expect(askHumanSources).toEqual(askHumanExpectedSourcesSorted);
  });

  it("includes ask-human no-refs seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const askHumanSources = parseAskHumanSourcesFromManifest(manifestRaw);

    expectManifestContainsSources({
      actualSources: askHumanSources,
      expectedSources: askHumanNoRefsExpectedSourcesSorted
    });
  });

  it("builds corpus output manifest with ask-human seed entries", async () => {
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
    const askHumanSources = parseAskHumanSourcesFromManifest(outputRaw);

    expect(askHumanSources).toEqual(askHumanExpectedSourcesSorted);
  });

  it("builds corpus output manifest with ask-human no-refs seed entries", async () => {
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
    const askHumanSources = parseAskHumanSourcesFromManifest(outputRaw);

    expectManifestContainsSources({
      actualSources: askHumanSources,
      expectedSources: askHumanNoRefsExpectedSourcesSorted
    });
  });

  for (const testCase of askHumanInvalidInputCases) {
    it(testCase.name, async () => {
      await expect(runAskHumanContractCase(testCase.caseDef)).rejects.toThrow(
        testCase.expectedErrorMessage
      );
    });
  }
});
