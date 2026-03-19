import { readFile, readdir } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { readContractCase } from "./runner.js";
import { runPassContractCase } from "./pass.contract.runner.js";

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

function toRepoRelativePath(path: string): string {
  return relative(process.cwd(), path).replaceAll("\\", "/");
}

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
});
