import { resolve } from "node:path";

import { normalizeRepoPath } from "./repoResolution.js";
import type { RepoRegistryEntry } from "../../../ports/repoRegistry.js";

export async function normalizeRegistryEntries(
  entries: RepoRegistryEntry[],
  reportNormalizationWarning: (message: string) => void
): Promise<RepoRegistryEntry[]> {
  const normalizedByPath = new Map<string, RepoRegistryEntry>();
  const warnedPaths = new Set<string>();
  for (const entry of entries) {
    const normalizedPath = await normalizeRepoPath(resolve(entry.repoPath));
    const existing = normalizedByPath.get(normalizedPath);
    if (existing !== undefined) {
      if (existing.label !== entry.label && !warnedPaths.has(normalizedPath)) {
        reportNormalizationWarning(
          `Pairflow warning: deduplicating repo registry aliases with conflicting labels for ${normalizedPath} (${existing.label ?? "<none>"} vs ${entry.label ?? "<none>"}).\n`
        );
        warnedPaths.add(normalizedPath);
      }
      continue;
    }

    normalizedByPath.set(normalizedPath, {
      repoPath: normalizedPath,
      addedAt: entry.addedAt,
      ...(entry.label !== undefined ? { label: entry.label } : {})
    });
  }
  return [...normalizedByPath.values()].sort((left, right) =>
    left.repoPath.localeCompare(right.repoPath)
  );
}

export function uniqueSortedRegistryEntries(
  entries: RepoRegistryEntry[]
): RepoRegistryEntry[] {
  const seen = new Set<string>();
  const deduped: RepoRegistryEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.repoPath)) {
      continue;
    }
    seen.add(entry.repoPath);
    deduped.push(entry);
  }
  return deduped.sort((left, right) => left.repoPath.localeCompare(right.repoPath));
}
