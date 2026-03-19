#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface CorpusEntry {
  id: string;
  command: string;
  source: string;
}

interface CorpusManifest {
  version: number;
  generated_at: string;
  entries: CorpusEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateManifest(manifest: unknown): CorpusManifest {
  if (!isRecord(manifest)) {
    throw new Error("Manifest must be an object.");
  }
  if (manifest.version !== 1) {
    throw new Error("Manifest version must be 1.");
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error("Manifest entries must be an array.");
  }
  const entries: CorpusEntry[] = [];
  for (const [index, entry] of manifest.entries.entries()) {
    if (!isRecord(entry)) {
      throw new Error(`Manifest entry at index ${index} must be an object.`);
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      throw new Error(`Manifest entry at index ${index} must include non-empty id.`);
    }
    if (typeof entry.command !== "string" || entry.command.length === 0) {
      throw new Error(
        `Manifest entry at index ${index} must include non-empty command.`
      );
    }
    if (typeof entry.source !== "string" || entry.source.length === 0) {
      throw new Error(
        `Manifest entry at index ${index} must include non-empty source.`
      );
    }
    entries.push({
      id: entry.id,
      command: entry.command,
      source: entry.source
    });
  }
  return {
    version: manifest.version,
    generated_at:
      typeof manifest.generated_at === "string"
        ? manifest.generated_at
        : new Date().toISOString(),
    entries
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const corpusDir = resolve(dirname(fileURLToPath(import.meta.url)));
  const repoRoot = resolve(corpusDir, "../../../../");
  const manifestPath = resolve(corpusDir, "manifest.json");
  const outputPath = resolve(
    repoRoot,
    ".pairflow/evidence/contracts-v11-corpus-manifest.json"
  );

  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = validateManifest(JSON.parse(manifestRaw) as unknown);

  for (const entry of manifest.entries) {
    const sourcePath = resolve(repoRoot, entry.source);
    if (!(await pathExists(sourcePath))) {
      throw new Error(`Corpus source does not exist: ${entry.source}`);
    }
  }

  const normalized = {
    ...manifest,
    generated_at: new Date().toISOString()
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(normalized, null, 2) + "\n", "utf8");
  process.stdout.write(`v11 corpus manifest written: ${outputPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to build v11 corpus manifest: ${message}\n`);
  process.exitCode = 1;
});
