import { readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

export function normalizePathToPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
  let regex = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === undefined) {
      continue;
    }
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        regex += ".*";
        index += 1;
      } else {
        regex += "[^/]*";
      }
      continue;
    }
    regex += escapeRegExp(char);
  }
  regex += "$";
  return new RegExp(regex);
}

async function walkFilesRecursive(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }
    const fullPath = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFilesRecursive(fullPath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function scopeRootsFromPatterns(patterns: readonly string[]): string[] {
  const roots = new Set<string>();
  for (const pattern of patterns) {
    const normalized = normalizePathToPosix(pattern).replace(/^\/+/u, "");
    const root = normalized.split("/")[0];
    if (root !== undefined && root.length > 0) {
      roots.add(root);
    }
  }
  return [...roots];
}

export async function resolveFilesForScopePatterns(
  repoRoot: string,
  scopePatterns: readonly string[]
): Promise<string[]> {
  const scopeRegexes = scopePatterns.map((pattern) =>
    globToRegExp(normalizePathToPosix(pattern))
  );
  const roots = scopeRootsFromPatterns(scopePatterns);
  const matched = new Set<string>();
  for (const root of roots) {
    const rootPath = resolve(repoRoot, root);
    let filesUnderRoot: string[] = [];
    try {
      filesUnderRoot = await walkFilesRecursive(rootPath);
    } catch {
      filesUnderRoot = [];
    }
    for (const absolutePath of filesUnderRoot) {
      const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
      if (scopeRegexes.some((regex) => regex.test(relativePath))) {
        matched.add(absolutePath);
      }
    }
  }
  return [...matched].sort((left, right) => left.localeCompare(right));
}
