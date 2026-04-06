import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const forbiddenCoreShimTargets = new Set([
  "src/core/agent/converged.ts",
  "src/core/bubble/createBubble.ts",
  "src/core/bubble/startBubble.ts",
  "src/core/human/reply.ts"
]);

async function listTypeScriptFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, {
    withFileTypes: true,
    recursive: true
  });

  return entries
    .filter((entry) => entry.isFile() && extname(entry.name) === ".ts")
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort();
}

async function resolveImportTarget(
  fromFile: string,
  specifier: string
): Promise<string | null> {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const base = resolve(dirname(fromFile), specifier);
  const candidates = [`${base}.ts`, resolve(base, "index.ts")];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

describe("v11 residual core shim boundary coverage", () => {
  it("keeps retired shim-only core facades out of src/v11 imports", async () => {
    const repoRoot = process.cwd();
    const v11Root = resolve(repoRoot, "src/v11");
    const files = await listTypeScriptFiles(v11Root);
    const importPattern =
      /(?:^|\n)\s*(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']+)["']/gu;
    const violations: string[] = [];

    for (const filePath of files) {
      const content = await readFile(filePath, "utf8");
      for (const match of content.matchAll(importPattern)) {
        const specifier = match[1];
        if (specifier === undefined) {
          continue;
        }

        const target = await resolveImportTarget(filePath, specifier);
        if (target === null) {
          continue;
        }

        const relativeTarget = relative(repoRoot, target).replaceAll("\\", "/");
        if (forbiddenCoreShimTargets.has(relativeTarget)) {
          violations.push(
            `${relative(repoRoot, filePath).replaceAll("\\", "/")} -> ${relativeTarget}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
