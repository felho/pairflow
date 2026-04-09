import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const coreShimBoundaryCoverageMode: "warn" | "fail" = "fail";
const maxWarningSampleSize = 20;

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
  "src/core/reviewer/testEvidence.ts",
  "src/core/validation.ts",
  "src/core/util/fileLock.ts",
  "src/core/util/normalize.ts",
  "src/core/util/pathExists.ts",
  "src/core/util/shellQuote.ts",
  "src/core/util/structuredRef.ts"
]);

const allowedResidualCoreBridgeImports: string[] = [];

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

function toTypeScriptSourceCandidate(resolvedImportPath: string): string {
  const extension = extname(resolvedImportPath);
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    return `${resolvedImportPath.slice(0, -extension.length)}.ts`;
  }
  return `${resolvedImportPath}.ts`;
}

async function resolveImportTarget(
  fromFile: string,
  specifier: string
): Promise<string | null> {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    toTypeScriptSourceCandidate(base),
    `${base}.ts`,
    resolve(base, "index.ts")
  ];
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

async function collectDirectCoreImports(
  files: string[],
  repoRoot: string
): Promise<string[]> {
  const importPattern =
    /(?:^|\n)\s*(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']+)["']/gu;
  const directCoreImports = new Set<string>();

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

      const relativeFilePath = relative(repoRoot, filePath).replaceAll("\\", "/");
      const relativeTarget = relative(repoRoot, target).replaceAll("\\", "/");
      if (relativeTarget.startsWith("src/core/")) {
        directCoreImports.add(`${relativeFilePath} -> ${relativeTarget}`);
      }
    }
  }

  return [...directCoreImports].sort();
}

function expectOrWarn(input: {
  label: string;
  violations: string[];
}): void {
  if (coreShimBoundaryCoverageMode === "warn" && input.violations.length > 0) {
    const sample = input.violations.slice(0, maxWarningSampleSize);
    const remainingCount = input.violations.length - sample.length;
    console.warn(
      [
        `[core-shim-boundary-coverage:warn] ${input.label}`,
        `count=${input.violations.length}`,
        ...sample.map((entry) => `  - ${entry}`),
        ...(remainingCount > 0
          ? [`  ... ${remainingCount} additional violation(s) omitted`]
          : [])
      ].join("\n")
    );
    return;
  }

  expect(input.violations).toEqual([]);
}

describe("v11 residual core shim boundary coverage", () => {
  it("keeps retired core shims and temporary foundation bridges out of src/v11 imports", async () => {
    const repoRoot = process.cwd();
    const v11Root = resolve(repoRoot, "src/v11");
    const files = await listTypeScriptFiles(v11Root);
    const violations: string[] = [];
    const directCoreImports = await collectDirectCoreImports(files, repoRoot);

    for (const relation of directCoreImports) {
      const [, relativeTarget] = relation.split(" -> ");
      if (relativeTarget !== undefined && forbiddenCoreShimTargets.has(relativeTarget)) {
        violations.push(relation);
      }
    }

    expectOrWarn({
      label: "retired core shim imports detected under src/v11",
      violations
    });
  });

  it("locks src/v11 and src/cli direct core imports to the final explicit bridge inventory", async () => {
    const repoRoot = process.cwd();
    const v11Files = await listTypeScriptFiles(resolve(repoRoot, "src/v11"));
    const cliFiles = await listTypeScriptFiles(resolve(repoRoot, "src/cli"));
    const directCoreImports = await collectDirectCoreImports(
      [...v11Files, ...cliFiles],
      repoRoot
    );

    const unexpectedImports = directCoreImports.filter(
      (relation) => !allowedResidualCoreBridgeImports.includes(relation)
    );
    expectOrWarn({
      label: "unexpected direct src/v11/src/cli -> src/core imports detected",
      violations: unexpectedImports
    });
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

    expectOrWarn({
      label: "public src/index.ts still re-exports core surface",
      violations: coreSpecifiers
    });
  });
});
