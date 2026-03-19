import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildComplexityCheckReport } from "../../../tools/fitness/checks/complexity.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-complexity-"));
  tempDirs.push(root);
  return root;
}

async function writeRepoFile(
  repoRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  const absolutePath = join(repoRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("complexity fitness check", () => {
  it("fails when file line budget is exceeded", async () => {
    const repoRoot = await createTempRoot();
    const lines = Array.from({ length: 520 }, (_, index) => `export const v${String(index)} = ${String(index)};`);
    await writeRepoFile(repoRoot, "src/v11/application/too-large.ts", lines.join("\n"));

    const report = await buildComplexityCheckReport({
      check: {
        id: "complexity",
        metric: "file-size and function complexity budget",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("file line budget exceeded"))
    ).toBe(true);
  });

  it("fails when function complexity budget is exceeded", async () => {
    const repoRoot = await createTempRoot();
    const branches = Array.from(
      { length: 25 },
      (_, index) => `  if (x > ${String(index)}) { return ${String(index)}; }`
    ).join("\n");
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/high-complexity.ts",
      [
        "export function score(x: number): number {",
        branches,
        "  return 0;",
        "}"
      ].join("\n")
    );

    const report = await buildComplexityCheckReport({
      check: {
        id: "complexity",
        metric: "file-size and function complexity budget",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/domain/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("function complexity budget exceeded"))
    ).toBe(true);
  });

  it("passes and reports top offenders when files are within budget", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/clean.ts",
      [
        "export function ok(input: number): number {",
        "  if (input > 0) {",
        "    return input;",
        "  }",
        "  return 0;",
        "}"
      ].join("\n")
    );

    const report = await buildComplexityCheckReport({
      check: {
        id: "complexity",
        metric: "file-size and function complexity budget",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/domain/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail.startsWith("top_file"))).toBe(true);
    expect(report.details?.some((detail) => detail.startsWith("top_function"))).toBe(
      true
    );
  });
});
