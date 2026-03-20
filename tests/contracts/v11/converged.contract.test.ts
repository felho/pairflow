import { readFile, readdir } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runConvergedContractCase } from "./converged.contract.runner.js";
import { readContractCase } from "./runner.js";

async function listConvergedCasePaths(): Promise<string[]> {
  const casesDir = resolve(process.cwd(), "tests/contracts/v11/cases/converged");
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

async function listConvergedManifestEntries(): Promise<Array<{
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
        entry.command === "converged" &&
        typeof entry.source === "string" &&
        typeof entry.id === "string"
    )
    .map((entry) => ({
      id: entry.id as string,
      source: entry.source as string
    }));
}

async function listConvergedCaseSourcesFromManifest(): Promise<string[]> {
  const entries = await listConvergedManifestEntries();
  return entries
    .map((entry) => entry.source)
    .sort((left, right) => left.localeCompare(right));
}

function toRepoRelativePath(path: string): string {
  return relative(process.cwd(), path).replaceAll("\\", "/");
}

describe("v11 converged contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(
      process.cwd(),
      "tests/contracts/v11/cases/converged/converged-basic.case.json"
    );
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("converged");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("keeps corpus manifest converged entries aligned with case directory", async () => {
    const casePaths = await listConvergedCasePaths();
    const caseSources = casePaths.map(toRepoRelativePath).sort((left, right) =>
      left.localeCompare(right)
    );
    const manifestSources = await listConvergedCaseSourcesFromManifest();
    expect(manifestSources).toEqual(caseSources);
  });

  it("keeps converged manifest entry ids unique", async () => {
    const entries = await listConvergedManifestEntries();
    const ids = entries.map((entry) => entry.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("keeps converged manifest sources sorted", async () => {
    const sources = await listConvergedCaseSourcesFromManifest();
    const sorted = [...sources].sort((left, right) => left.localeCompare(right));
    expect(sources).toEqual(sorted);
  });

  it("keeps converged manifest sources in converged case directory", async () => {
    const sources = await listConvergedCaseSourcesFromManifest();
    for (const source of sources) {
      expect(source.startsWith("tests/contracts/v11/cases/converged/")).toBe(true);
      expect(source.endsWith(".case.json")).toBe(true);
    }
  });

  it("keeps converged manifest ids aligned with case ids", async () => {
    const entries = await listConvergedManifestEntries();
    const manifestIdsBySource = new Map(
      entries.map((entry) => [entry.source, entry.id] as const)
    );
    const casePaths = await listConvergedCasePaths();

    for (const casePath of casePaths) {
      const source = toRepoRelativePath(casePath);
      const caseDef = await readContractCase(casePath);
      expect(manifestIdsBySource.get(source)).toBe(caseDef.id);
    }
  });

  it("keeps converged case filename aligned with case id", async () => {
    const casePaths = await listConvergedCasePaths();
    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      expect(basename(casePath)).toBe(`${caseDef.id}.case.json`);
    }
  });

  it(
    "executes legacy, v11 and parity assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityExhaustiveMs },
    async () => {
      const casePaths = await listConvergedCasePaths();
      expect(casePaths.length).toBeGreaterThan(0);
      const seenModes = new Set<string>();

      for (const casePath of casePaths) {
        const caseDef = await readContractCase(casePath);
        seenModes.add(caseDef.mode);
        const run = await runConvergedContractCase(caseDef);
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
    }
  );

  it("rejects invalid converged contract input.reviewArtifactType", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-invalid-review-artifact-type",
        command: "converged",
        mode: "legacy",
        description: "Invalid converged contract input shape",
        input: {
          summary: "Invalid case",
          reviewArtifactType: "auto"
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/reviewArtifactType must be one of: code, document/u);
  });

  it("rejects converged contract input.summary when empty", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-invalid-empty-summary",
        command: "converged",
        mode: "legacy",
        description: "Invalid converged contract summary",
        input: {
          summary: "   "
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/input\.summary must be a non-empty string/u);
  });

  it("rejects converged contract input.refs when non-string array", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-invalid-refs",
        command: "converged",
        mode: "legacy",
        description: "Invalid converged contract refs input",
        input: {
          summary: "Valid summary",
          refs: ["ok-ref", 42]
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/input\.refs must be a string array/u);
  });

  it("rejects unsupported command for converged contract runner", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-unsupported-command",
        command: "pass",
        mode: "legacy",
        description: "Wrong command routed to converged runner",
        input: {
          summary: "Should not execute"
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/Unsupported command for converged contract runner/u);
  });
});
