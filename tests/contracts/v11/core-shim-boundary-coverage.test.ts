import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const forbiddenCoreShimTargets = new Set([
  "src/core/agent/converged.ts",
  "src/core/bubble/createBubble.ts",
  "src/core/bubble/startBubble.ts",
  "src/core/convergence/policy.ts",
  "src/core/convergence/repeatCleanAutoconverge.ts",
  "src/core/gates/docContractGates.ts",
  "src/core/human/reply.ts",
  "src/core/metrics/bubbleEvents.ts",
  "src/core/metrics/events.ts",
  "src/core/metrics/report/aggregate.ts",
  "src/core/metrics/report/archiveContext.ts",
  "src/core/metrics/report/format.ts",
  "src/core/metrics/report/readEvents.ts",
  "src/core/metrics/report/report.ts",
  "src/core/metrics/report/selectShards.ts",
  "src/core/metrics/report/types.ts",
  "src/core/metrics/report/warnings.ts",
  "src/core/reviewer/reviewVerification.ts",
  "src/core/reviewer/reviewerBrief.ts",
  "src/core/reviewer/summaryVerifierConsistencyGate.ts",
  "src/core/reviewer/testEvidence.ts",
  "src/core/validation.ts",
  "src/core/util/fileLock.ts",
  "src/core/util/normalize.ts",
  "src/core/util/pathExists.ts",
  "src/core/util/shellQuote.ts",
  "src/core/util/structuredRef.ts"
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
  it("keeps retired core shims and temporary foundation bridges out of src/v11 imports", async () => {
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

  it("keeps the public src/index.ts surface off core shim re-exports", async () => {
    const repoRoot = process.cwd();
    const indexPath = resolve(repoRoot, "src/index.ts");
    const content = await readFile(indexPath, "utf8");
    const importPattern =
      /(?:^|\n)\s*(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']+)["']/gu;
    const coreSpecifiers = [...content.matchAll(importPattern)]
      .map((match) => match[1])
      .filter((specifier): specifier is string => specifier !== undefined)
      .filter((specifier) => specifier.startsWith("./core/"));

    expect(coreSpecifiers).toEqual([]);
  });
});
