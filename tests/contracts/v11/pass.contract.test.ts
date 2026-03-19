import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import { readContractCase } from "./runner.js";
import { runPassContractCase } from "./pass.contract.runner.js";
import type { ContractCase } from "./schema.js";

const execFileAsync = promisify(execFile);

async function listPassCasePaths(): Promise<string[]> {
  const casesDir = resolve(process.cwd(), "tests/contracts/v11/cases/pass");
  const entries = await readdir(casesDir);
  return entries
    .filter((entry) => entry.endsWith(".case.json"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => resolve(casesDir, entry));
}

interface CorpusManifestEntry {
  id?: unknown;
  command?: unknown;
  source?: unknown;
}

interface CorpusManifest {
  entries?: Array<{
    id?: unknown;
    command?: unknown;
    source?: unknown;
  }>;
}

async function listPassManifestEntries(): Promise<Array<{
  id: string;
  source: string;
}>> {
  const manifestPath = resolve(process.cwd(), "tests/contracts/v11/corpus/manifest.json");
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as CorpusManifest;
  if (!Array.isArray(manifest.entries)) {
    return [];
  }
  return (manifest.entries as CorpusManifestEntry[])
    .filter(
      (entry) =>
        entry.command === "pass" &&
        typeof entry.source === "string" &&
        typeof entry.id === "string"
    )
    .map((entry) => ({
      id: entry.id as string,
      source: entry.source as string
    }));
}

async function listPassCaseSourcesFromManifest(): Promise<string[]> {
  const entries = await listPassManifestEntries();
  return entries
    .map((entry) => entry.source)
    .sort((left, right) => left.localeCompare(right));
}

function parsePassSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "pass")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort((left, right) => left.localeCompare(right));
}

function toRepoRelativePath(path: string): string {
  return relative(process.cwd(), path).replaceAll("\\", "/");
}

const passInvalidInputCases: Array<{
  name: string;
  caseDef: ContractCase;
  expectedErrorMessage: string;
}> = [
  {
    name: "rejects invalid pass contract input when summary is empty",
    caseDef: {
      id: "pass-invalid-empty-summary",
      command: "pass",
      mode: "legacy",
      description: "invalid empty summary validation",
      input: {
        summary: "   ",
        refs: [],
        intent: "task"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "PASS contract input.summary must be a non-empty string."
  },
  {
    name: "rejects invalid pass contract input when refs is not string array",
    caseDef: {
      id: "pass-invalid-refs",
      command: "pass",
      mode: "legacy",
      description: "invalid refs validation",
      input: {
        summary: "Valid summary",
        refs: ["ok-ref", 42],
        intent: "task"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "PASS contract input.refs must be a string array."
  },
  {
    name: "rejects invalid pass contract input in v11 mode when intent is invalid",
    caseDef: {
      id: "pass-invalid-intent-v11",
      command: "pass",
      mode: "v11",
      description: "invalid intent validation for v11 mode",
      input: {
        summary: "Valid summary",
        refs: [],
        intent: "handoff"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage:
      "PASS contract input.intent must be one of: task, review, fix_request."
  },
  {
    name: "rejects invalid pass contract input when noFindings is not boolean",
    caseDef: {
      id: "pass-invalid-no-findings",
      command: "pass",
      mode: "legacy",
      description: "invalid noFindings validation",
      input: {
        summary: "Valid summary",
        noFindings: "yes",
        intent: "review"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "PASS contract input.noFindings must be a boolean."
  },
  {
    name: "rejects invalid pass contract input when seedRoundTwoCleanHistory is not boolean",
    caseDef: {
      id: "pass-invalid-seed-round-two-clean-history",
      command: "pass",
      mode: "parity",
      description: "invalid seedRoundTwoCleanHistory validation",
      input: {
        summary: "Valid summary",
        noFindings: true,
        seedRoundTwoCleanHistory: "true"
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage:
      "PASS contract input.seedRoundTwoCleanHistory must be a boolean."
  }
];

describe("v11 pass contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(
      process.cwd(),
      "tests/contracts/v11/cases/pass/pass-basic-handoff.case.json"
    );
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("pass");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("keeps corpus manifest pass entries aligned with case directory", async () => {
    const casePaths = await listPassCasePaths();
    const caseSources = casePaths.map(toRepoRelativePath).sort((left, right) =>
      left.localeCompare(right)
    );
    const manifestSources = await listPassCaseSourcesFromManifest();
    expect(manifestSources).toEqual(caseSources);
  });

  it("keeps pass manifest entry ids unique", async () => {
    const entries = await listPassManifestEntries();
    const ids = entries.map((entry) => entry.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("keeps pass manifest ids aligned with case ids", async () => {
    const entries = await listPassManifestEntries();
    const manifestIdsBySource = new Map(
      entries.map((entry) => [entry.source, entry.id] as const)
    );
    const casePaths = await listPassCasePaths();

    for (const casePath of casePaths) {
      const source = toRepoRelativePath(casePath);
      const caseDef = await readContractCase(casePath);
      expect(manifestIdsBySource.get(source)).toBe(caseDef.id);
    }
  });

  it("keeps pass case filename aligned with case id", async () => {
    const casePaths = await listPassCasePaths();
    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      expect(basename(casePath)).toBe(`${caseDef.id}.case.json`);
    }
  });

  it("builds corpus output manifest with pass seed entries", async () => {
    await execFileAsync("pnpm", [
      "exec",
      "tsx",
      "./tests/contracts/v11/corpus/build-corpus.ts"
    ]);

    const casePaths = await listPassCasePaths();
    const expectedSources = casePaths.map(toRepoRelativePath).sort((left, right) =>
      left.localeCompare(right)
    );
    const outputManifestPath = resolve(
      process.cwd(),
      ".pairflow/evidence/contracts-v11-corpus-manifest.json"
    );
    const outputRaw = await readFile(outputManifestPath, "utf8");
    const passSources = parsePassSourcesFromManifest(outputRaw);

    expect(passSources).toEqual(expectedSources);
  });

  it("executes legacy, v11 and parity assertions via shared runner", async () => {
    const casePaths = await listPassCasePaths();
    expect(casePaths.length).toBeGreaterThan(0);
    const seenModes = new Set<string>();

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      seenModes.add(caseDef.mode);
      const run = await runPassContractCase(caseDef);
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
    expect(seenModes.has("legacy")).toBe(true);
    expect(seenModes.has("v11")).toBe(true);
    expect(seenModes.has("parity")).toBe(true);
  }, 30_000);

  for (const testCase of passInvalidInputCases) {
    it(testCase.name, async () => {
      await expect(runPassContractCase(testCase.caseDef)).rejects.toThrow(
        testCase.expectedErrorMessage
      );
    });
  }

  it("rejects unsupported command for pass contract runner", async () => {
    await expect(
      runPassContractCase({
        id: "pass-unsupported-command",
        command: "converged",
        mode: "legacy",
        description: "Wrong command routed to pass runner",
        input: {
          summary: "Should not execute",
          refs: []
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/Unsupported command for PASS contract runner/u);
  });
});
