import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildErrorCheckReport } from "../../../tools/fitness/checks/error.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-error-"));
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

describe("error fitness check", () => {
  it("fails when throw boundary has no stable code marker", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-without-code.ts",
      [
        "export function run(): never {",
        "  const context = { bubble_id: 'b_1', command_name: 'pass', round: 1 };",
        "  throw new Error('something failed');",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("missing stable error code"))
    ).toBe(true);
  });

  it("fails when throw boundary has code marker but no context marker", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-without-context.ts",
      [
        "export function run(): never {",
        "  const reason_code = 'ERR_SAMPLE';",
        "  throw new Error(reason_code);",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("missing required error context"))
    ).toBe(true);
  });

  it("passes when throw boundary has both code and context markers", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-with-code-and-context.ts",
      [
        "export function run(): never {",
        "  const reason_code = 'ERR_SAMPLE';",
        "  const context = { bubble_id: 'b_1', command_name: 'pass', operation_id: 'op_1', round: 1 };",
        "  throw new Error(`${reason_code}: ${JSON.stringify(context)}`);",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });
});
